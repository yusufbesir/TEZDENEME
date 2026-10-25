// Uzmanlık haritalayıcı (madde 86, D8b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// SALT OKUNUR, modelsiz, ağsız. YALNIZ GÖZLENEN VERİ: denetim kaydındaki koşu olayları (run.started / run.finished / run.refused:*) ve iş akışı adım olayları
// (workflow.step.started / succeeded / retry / failed). Çıkarım, tahmin, model yok. En çok 5000 son denetim satırı okunur (aşılırsa truncated=true).
// Sağlayıcı x rol (plan / implement / review / verify; rolsüz tek koşu "tekil"): deneme, başarı, başarısızlık, başarı oranı, ortalama süre, son hata türleri.
// Örnek boyutu (başarılı + başarısız deneme) < MIN_SAMPLE ise durum "yetersiz veri" olur ve oran / süre YAZILMAZ (null).
// Reddedilen koşular ("run.refused") deneme sayılmaz (sağlayıcı koşmadı): ayrı sayılır. Yerel doğrulama adımı (sağlayıcısız "verify") sağlayıcıya yazılmaz, 'unattributed' sayılır.
// Teslim sonuçları (verification_runs) sağlayıcıya BAĞLANMAZ (hangi sağlayıcının işi olduğu kayıtta yok; çıkarım yapılmaz): yalnız durum dağılımı verilir.
import { redactString } from "../core/audit/redact.ts";
import type { Db } from "../core/db/db.ts";

export const MIN_SAMPLE = 5;
export const AUDIT_ROW_LIMIT = 5000;
export const ROLES = ["plan", "implement", "review", "verify", "tekil"] as const;
export type ExpertiseRole = (typeof ROLES)[number];

export interface Observation {
  provider: string;
  role: ExpertiseRole;
  ok: boolean;
  durationMs: number | null;
  ts: string;
  errorKind: string | null;
}

export interface Refusal {
  provider: string | null;
  kind: string;
  ts: string;
}

export interface ObservationSet {
  observations: Observation[];
  refusals: Refusal[];
  unattributed: number;
  rowsScanned: number;
  truncated: boolean;
}

type Row = Record<string, unknown>;

function parse(json: unknown): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(String(json));
    return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const str = (v: unknown, max = 100): string | null => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

function errorKindOf(v: unknown): string | null {
  const s = str(v, 60);
  if (s === null) return null;
  const clean = redactString(s);
  return /^[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(clean) ? clean : "diğer";
}

function duration(from: string, to: string): number | null {
  const a = Date.parse(from);
  const b = Date.parse(to);
  return Number.isNaN(a) || Number.isNaN(b) || b < a ? null : b - a;
}

function asRole(v: unknown): ExpertiseRole | null {
  return v === "plan" || v === "implement" || v === "review" || v === "verify" ? v : null;
}

// Yalnız SELECT. Satırlar kronolojik sırayla işlenir.
export function collectObservations(db: Db, limit = AUDIT_ROW_LIMIT): ObservationSet {
  const rows = db
    .prepare(
      `SELECT ts, action, result, details_json FROM audit_events
       WHERE action IN ('run.started','run.finished','workflow.step.started','workflow.step.succeeded','workflow.step.retry','workflow.step.failed') OR action LIKE 'run.refused:%'
       ORDER BY ts DESC, rowid DESC LIMIT ?`,
    )
    .all(limit + 1) as Row[];
  const truncated = rows.length > limit;
  const chrono = rows.slice(0, limit).reverse();

  const observations: Observation[] = [];
  const refusals: Refusal[] = [];
  let unattributed = 0;
  const attempts = new Map<string, { provider: string; ts: string }>();
  const steps = new Map<string, { provider: string | null; role: ExpertiseRole | null; ts: string; recorded: boolean }>();

  for (const r of chrono) {
    const ts = String(r.ts);
    const action = String(r.action);
    const result = String(r.result);
    const d = parse(r.details_json);
    if (action === "run.started") {
      const m = /^attempt (\S{1,100})$/.exec(result);
      const provider = str(d.providerId);
      if (m && provider) attempts.set(m[1] as string, { provider, ts });
    } else if (action === "run.finished") {
      const id = str(d.attemptId);
      const start = id ? attempts.get(id) : undefined;
      if (!start) continue;
      const ok = result === "succeeded";
      observations.push({ provider: start.provider, role: "tekil", ok, durationMs: duration(start.ts, ts), ts, errorKind: ok ? null : (errorKindOf(d.errorCode) ?? errorKindOf(result)) });
    } else if (action.startsWith("run.refused:")) {
      refusals.push({ provider: str(d.providerId), kind: action.slice("run.refused:".length).slice(0, 40), ts });
    } else {
      const wf = str(d.workflowId);
      const step = typeof d.step === "number" ? d.step : null;
      if (!wf || step === null) continue;
      const key = `${wf}|${step}`;
      if (action === "workflow.step.started") {
        steps.set(key, { provider: str(d.providerId), role: asRole(d.role), ts, recorded: false });
        continue;
      }
      const cur = steps.get(key);
      if (!cur) continue;
      const provider = str(d.providerId) ?? cur.provider;
      const role = asRole(d.role) ?? cur.role;
      if (action === "workflow.step.succeeded") {
        if (!provider || !role) unattributed++;
        else observations.push({ provider, role, ok: true, durationMs: duration(cur.ts, ts), ts, errorKind: null });
        cur.recorded = true;
      } else if (action === "workflow.step.retry" || (action === "workflow.step.failed" && !cur.recorded)) {
        if (provider && role) observations.push({ provider, role, ok: false, durationMs: duration(cur.ts, ts), ts, errorKind: errorKindOf(result) });
        else unattributed++;
        cur.recorded = true;
      }
    }
  }
  return { observations, refusals, unattributed, rowsScanned: Math.min(rows.length, limit), truncated };
}

export interface ExpertiseRow {
  provider: string;
  role: ExpertiseRole;
  attempts: number;
  succeeded: number;
  failed: number;
  status: "yeterli" | "yetersiz veri";
  successRate: number | null;
  avgDurationMs: number | null;
  lastErrorKinds: string[];
}

export interface ExpertiseReport {
  minSample: number;
  rows: ExpertiseRow[];
  refusals: Array<{ provider: string | null; kind: string; count: number }>;
  deliveries: { total: number; byStatus: Array<{ status: string; count: number }>; latestAt: string | null } | null;
  unattributedSteps: number;
  scan: { auditRows: number; limit: number; truncated: boolean };
  note: string;
}

export function buildExpertise(set: ObservationSet, deliveries: ExpertiseReport["deliveries"] = null): ExpertiseReport {
  const groups = new Map<string, Observation[]>();
  for (const o of set.observations) {
    const key = `${o.provider}\u0000${o.role}`;
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  const rows: ExpertiseRow[] = [...groups.entries()].map(([key, list]) => {
    const [provider, role] = key.split("\u0000") as [string, ExpertiseRole];
    const succeeded = list.filter((o) => o.ok).length;
    const enough = list.length >= MIN_SAMPLE;
    const durs = list.map((o) => o.durationMs).filter((x): x is number => x !== null);
    const kinds: string[] = [];
    for (const o of [...list].reverse()) if (o.errorKind !== null && !kinds.includes(o.errorKind) && kinds.length < 5) kinds.push(o.errorKind);
    return {
      provider,
      role,
      attempts: list.length,
      succeeded,
      failed: list.length - succeeded,
      status: enough ? "yeterli" : "yetersiz veri",
      successRate: enough ? Math.round((succeeded / list.length) * 1000) / 1000 : null,
      avgDurationMs: enough && durs.length > 0 ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : null,
      lastErrorKinds: kinds,
    };
  });
  rows.sort((a, b) => (a.provider < b.provider ? -1 : a.provider > b.provider ? 1 : ROLES.indexOf(a.role) - ROLES.indexOf(b.role)));
  const ref = new Map<string, { provider: string | null; kind: string; count: number }>();
  for (const r of set.refusals) {
    const k = `${r.provider ?? ""}|${r.kind}`;
    const e = ref.get(k) ?? { provider: r.provider, kind: r.kind, count: 0 };
    e.count++;
    ref.set(k, e);
  }
  return {
    minSample: MIN_SAMPLE,
    rows,
    refusals: [...ref.values()].sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind)),
    deliveries,
    unattributedSteps: set.unattributed,
    scan: { auditRows: set.rowsScanned, limit: AUDIT_ROW_LIMIT, truncated: set.truncated },
    note: `Yalnız gözlenen veri; çıkarım yok. Örnek boyutu ${MIN_SAMPLE}'ten küçükse oran ve süre verilmez ('yetersiz veri'). Reddedilen koşular deneme sayılmaz. Teslim sonuçları sağlayıcıya bağlanmaz.`,
  };
}

// Teslim doğrulama koşuları (verification_runs): yalnız durum dağılımı; en çok 5000 son satır.
export function collectDeliveries(db: Db): NonNullable<ExpertiseReport["deliveries"]> {
  const rows = db
    .prepare("SELECT status, COUNT(*) AS n, MAX(created_at) AS latest FROM (SELECT status, created_at FROM verification_runs ORDER BY created_at DESC LIMIT ?) GROUP BY status")
    .all(AUDIT_ROW_LIMIT) as Row[];
  const byStatus = rows.map((r) => ({ status: String(r.status).slice(0, 40), count: Number(r.n) })).sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
  const latest = rows.map((r) => String(r.latest)).sort().pop() ?? null;
  return { total: byStatus.reduce((a, b) => a + b.count, 0), byStatus, latestAt: latest };
}

export function expertiseReport(db: Db): ExpertiseReport {
  return buildExpertise(collectObservations(db), collectDeliveries(db));
}

// Aracı için: sağlayıcı -> verilen roldaki gözlem (örnek yetersizse successRate null).
export function roleObservations(report: ExpertiseReport, role: string): Map<string, { attempts: number; successRate: number | null }> {
  const out = new Map<string, { attempts: number; successRate: number | null }>();
  for (const r of report.rows) if (r.role === role) out.set(r.provider, { attempts: r.attempts, successRate: r.successRate });
  return out;
}
