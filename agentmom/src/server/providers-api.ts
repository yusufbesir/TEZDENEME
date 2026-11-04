// Sağlayıcı detay ve yerel bağlantı testi (Faz 11, D3). Yazan: Claude [İP:AgentMom Faz 11 D3]; sahip: Yusuf. Yalnız bu dosyayı yazan yapay zeka değiştirir,
// diğerleri öneri sunar. Kurallar: her alan yalnız kayıtlı veriden gelir (denetim kaydı, yetenek tablosu, politika sözleşmesi); bilinmeyen = null, uydurma yok.
// Bağlantı testi YALNIZ adaptörün yerel testConnection'ıdır (sürüm/oturum komutu); model çağrısı ve internet yok. Gerçekte gözlenmeyen hiçbir şey 'verified' yazılmaz.
import type { AuditLog } from "../core/audit/audit.ts";
import { redactString } from "../core/audit/redact.ts";
import type { Db } from "../core/db/db.ts";
import type { Actor, AutonomyContract } from "../core/policy/types.ts";
import type { CapabilityStatus, ConnectionReport } from "../providers/contract.ts";
import type { ProviderRegistry } from "../providers/registry.ts";
import { readProviderLimits } from "../analysis/quota.ts";
import type { ProviderLimits } from "../analysis/quota.ts";

export const PROVIDER_ID_RE = /^[a-z0-9-]{1,40}$/;
export const TEST_TIMEOUT_MS = 10_000;
export const TEST_MIN_INTERVAL_MS = 15_000;
const MODEL_SCAN_LIMIT = 5000;
const MESSAGE_MAX = 200;

// Fixed text per route kind; it describes HOW the provider authenticates, never a credential.
const AUTH_METHOD: Record<string, string> = {
  subscription: "abonelik oturumu (CLI)",
  api_paid: "ücretli API anahtarı (yalnız onaylı ücretli yol)",
  local: "yerel çalışma (kimlik doğrulama yok)",
};
const DOCS = new Set(["claude-code", "codex", "gemini"]);

export interface ProviderDetail {
  id: string;
  displayName: string;
  routeKind: string;
  authMethod: string;
  enabled: boolean;
  available: boolean;
  allowedByPolicy: boolean;
  version: string | null;
  capabilities: Array<{ operation: string; status: string; evidence: string; checkedAt: string; verifiedAt: string | null }>;
  models: Array<{ model: string; runs: number; lastAt: string }>;
  lastSuccess: { at: string; model: string | null } | null;
  lastErrors: Array<{ at: string; kind: string; message: string }>;
  docs: string | null;
  // Yalnız sağlayıcının kendi olayında bildirdiği, doğrulanmış ve taze kota; yoksa null (bilinmiyor, "sınırsız" DEĞİL).
  limits: ProviderLimits | null;
  state: { changedAt: string | null; changedBy: string | null };
}

type Row = Record<string, unknown>;

function parse(json: unknown): Record<string, unknown> {
  try {
    const v = JSON.parse(String(json));
    return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function obj(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function short(text: string): string {
  const t = redactString(text).replace(/\s+/g, " ").trim();
  return t.length > MESSAGE_MAX ? `${t.slice(0, MESSAGE_MAX - 1)}…` : t;
}

function modelName(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 && v.length <= 100 ? v : null;
}

// Attempts this provider took part in: single runs (run.started names the provider) and every attempt with events emitted by its adapter.
function attemptIds(db: Db, id: string): Set<string> {
  const out = new Set<string>();
  const started = db.prepare("SELECT result, details_json FROM audit_events WHERE action = 'run.started' AND json_extract(details_json, '$.providerId') = ?").all(id) as Row[];
  for (const r of started) {
    const m = /^attempt (\S+)$/.exec(String(r.result));
    if (m) out.add(m[1] as string);
  }
  const events = db
    .prepare("SELECT DISTINCT json_extract(details_json, '$.attemptId') AS a FROM audit_events WHERE initiator_kind = 'agent' AND initiator_id = ? AND action LIKE 'provider.event:%'")
    .all(id) as Row[];
  for (const r of events) if (typeof r.a === "string") out.add(r.a);
  return out;
}

// finishedLimit verilirse yalnız en yeni o kadar "run.finished" satırı okunur (varsayılan: sınırsız, eski davranış).
export function providerDetail(db: Db, registry: ProviderRegistry, contract: AutonomyContract, id: string, finishedLimit?: number, now: Date = new Date()): ProviderDetail | null {
  const stored = registry.list().find((p) => p.id === id);
  if (!stored) return null;
  const adapter = registry.registeredAdapter(id);
  const state = registry.stateOf(id);

  // Models: only what the provider itself reported on start (provider.event:started -> data.model). No declared or guessed model.
  const models = new Map<string, { runs: number; lastAt: string }>();
  const startedRows = db
    .prepare("SELECT ts, details_json FROM audit_events WHERE action = 'provider.event:started' AND initiator_kind = 'agent' AND initiator_id = ? ORDER BY ts DESC, rowid DESC LIMIT ?")
    .all(id, MODEL_SCAN_LIMIT) as Row[];
  const modelByAttempt = new Map<string, string>();
  for (const r of startedRows) {
    const d = parse(r.details_json);
    const model = modelName(obj(d.data).model);
    if (!model) continue;
    const m = models.get(model);
    if (m) m.runs++;
    else models.set(model, { runs: 1, lastAt: String(r.ts) });
    if (typeof d.attemptId === "string" && !modelByAttempt.has(d.attemptId)) modelByAttempt.set(d.attemptId, model);
  }

  const attempts = attemptIds(db, id);
  const finished = db.prepare("SELECT ts, result, details_json FROM audit_events WHERE action = 'run.finished' ORDER BY ts DESC, rowid DESC LIMIT ?").all(finishedLimit ?? -1) as Row[];
  const mine = finished.map((r) => ({ ts: String(r.ts), result: String(r.result), d: parse(r.details_json) })).filter((r) => typeof r.d.attemptId === "string" && attempts.has(r.d.attemptId));
  const ok = mine.find((r) => r.result === "succeeded");
  const lastSuccess = ok ? { at: ok.ts, model: modelByAttempt.get(ok.d.attemptId as string) ?? null } : null;

  const errors: Array<{ at: string; kind: string; message: string }> = [];
  const refused = db
    .prepare(
      `SELECT ts, action, result, details_json FROM audit_events
       WHERE (action LIKE 'run.refused:%' AND json_extract(details_json, '$.providerId') = ?)
          OR (action = 'provider.event:error' AND initiator_kind = 'agent' AND initiator_id = ?)
       ORDER BY ts DESC, rowid DESC LIMIT 5`,
    )
    .all(id, id) as Row[];
  for (const r of refused) {
    const d = parse(r.details_json);
    const action = String(r.action);
    const data = obj(d.data);
    const message = action === "provider.event:error" ? String(data.message ?? data.code ?? data.status ?? "error") : `${String(r.result)}${typeof d.reason === "string" ? `: ${d.reason}` : ""}`;
    errors.push({ at: String(r.ts), kind: action, message: short(message) });
  }
  for (const r of mine.filter((x) => x.result !== "succeeded").slice(0, 5)) {
    const code = typeof r.d.errorCode === "string" ? ` (${r.d.errorCode})` : "";
    errors.push({ at: r.ts, kind: "run.finished", message: short(`${r.result}${code}`) });
  }
  errors.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  // Version: only from a local connection test that reported one.
  const test = db
    .prepare("SELECT details_json FROM audit_events WHERE action = 'provider.test' AND json_extract(details_json, '$.providerId') = ? ORDER BY ts DESC, rowid DESC LIMIT 1")
    .get(id) as Row | undefined;
  const tv = test ? parse(test.details_json).version : null;

  return {
    id,
    displayName: stored.displayName,
    routeKind: stored.routeKind,
    authMethod: AUTH_METHOD[stored.routeKind] ?? "bilinmiyor",
    enabled: !state.disabled && adapter !== undefined,
    available: adapter !== undefined,
    allowedByPolicy: contract.allowedProviders.includes(id),
    version: typeof tv === "string" && tv.length <= 40 ? tv : null,
    capabilities: stored.capabilities.map((c) => ({ operation: c.operation, status: c.status, evidence: c.evidenceSource, checkedAt: c.checkedAt, verifiedAt: c.status === "verified" ? c.checkedAt : null })),
    models: [...models.entries()].map(([model, v]) => ({ model, runs: v.runs, lastAt: v.lastAt })).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1)),
    lastSuccess,
    lastErrors: errors.slice(0, 5),
    docs: DOCS.has(id) ? id : null,
    // Only what the provider itself reported in a usage event (validated, fresh); null means "unknown", never "unlimited". No current adapter reports one.
    limits: readProviderLimits(db, id, now),
    state: { changedAt: state.changedAt, changedBy: state.changedBy },
  };
}

// The status written for testConnection follows only what the report actually shows:
// executable ran AND login confirmed -> verified; ran but login not confirmed -> partial; anything else (not reachable, error, timeout) -> unverified.
export function statusFromReport(report: ConnectionReport | null): CapabilityStatus {
  if (!report || report.reachable !== true) return "unverified";
  return report.authenticated === true ? "verified" : "partial";
}

export interface TestOutcome {
  status: CapabilityStatus;
  reachable: boolean | null;
  authenticated: boolean | null;
  version: string | null;
  detail: string;
  timedOut: boolean;
  checkedAt: string;
}

export async function runConnectionTest(deps: { registry: ProviderRegistry; audit: AuditLog; now: () => Date }, id: string, actor: Actor, timeoutMs = TEST_TIMEOUT_MS): Promise<TestOutcome> {
  const adapter = deps.registry.get(id);
  if (!adapter) throw new Error(`provider ${id} is not available`);
  const checkedAt = deps.now().toISOString();
  let report: ConnectionReport | null = null;
  let timedOut = false;
  let failure: string | null = null;
  let timer: NodeJS.Timeout | undefined;
  try {
    report = await Promise.race([
      adapter.testConnection(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          timedOut = true;
          resolve(null);
        }, timeoutMs);
      }),
    ]);
  } catch (err) {
    failure = err instanceof Error ? err.message : String(err);
  } finally {
    if (timer) clearTimeout(timer);
  }
  const status = statusFromReport(report);
  const detail = timedOut ? `timed out after ${Math.round(timeoutMs / 1000)} s` : failure !== null ? `test failed: ${short(failure)}` : short(report?.detail ?? "no report");
  const version = report && typeof report.version === "string" && report.version.length <= 40 ? report.version : null;
  const evidence = short(
    `local testConnection at ${checkedAt} (no model call): reachable=${report?.reachable ?? "unknown"}, authenticated=${report?.authenticated ?? "unknown"}, version=${version ?? "unknown"}; ${detail}`,
  );
  deps.registry.recordConnectionTest(id, status, evidence, checkedAt);
  deps.audit.record({
    initiator: actor,
    action: "provider.test",
    decision: "allow",
    result: status,
    details: { providerId: id, status, reachable: report?.reachable ?? null, authenticated: report?.authenticated ?? null, version, detail, timedOut },
  });
  return { status, reachable: report?.reachable ?? null, authenticated: report?.authenticated ?? null, version, detail, timedOut, checkedAt };
}
