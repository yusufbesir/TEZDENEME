// Bağlam değiştirme maliyeti (madde 71, D8c-3b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// SALT OKUNUR, modelsiz, ağsız, öneri YOK (yalnız ölçüm). DÜRÜSTÇE KISMİ: kullanıcının sohbet/pencere geçişleri kaydedilmez; yalnız denetim kaydına düşen
// görev / iş akışı / koşu olayları ölçülür. Kaynak: audit_events (action task.* / workflow.* / run.*), seçilen gün penceresindeki EN ÇOK 5000 son satır.
// Bağlam = görev kimliği (details.taskId; yoksa details.workflowId, iş akışı kayıtlı görevine çevrilir; çevrilemezse "wf:<kimlik>"). Kimliği olmayan ya da biçimi
// geçersiz olay sayılmaz (withoutContext). Kimlik biçimi: [A-Za-z0-9._-]{1,100}; haritalar Map ile tutulur (__proto__ gibi anahtarlar etkisiz).
// Geçiş: bağlamlı iki ardışık olay farklı bağlamdaysa 1 geçiş (gün ve saat = sonraki olayın UTC zamanı). Oturum: aynı bağlamın ardışık olayları arası boşluk > 30 dk
// oturumu böler; süre = oturumun son - ilk olayı (tek olaylı oturum ölçülemez, ortalamaya girmez).
// Yeniden yükleme göstergesi = geçilen bağlamın son (en çok 5) BİLDİRİLMİŞ koşusunun ortalama girdi token değeri, geçiş başına toplanır; para birimi YOK;
// hiçbir geçiş için veri yoksa null ("bilinmiyor"), bazıları için varsa EN AZ değeri (kapsanmayan geçiş sayısı ayrıca verilir).
// Örnek boyutu (olay sayısı) < 20 ise durum "yetersiz veri" olur ve ortalama / tahmin YAZILMAZ (null).
import type { Db } from "../core/db/db.ts";

export const ROW_LIMIT = 5000;
export const MIN_EVENTS = 20;
export const SESSION_GAP_MS = 30 * 60 * 1000;
export const DEFAULT_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const ID_RE = /^[A-Za-z0-9._-]{1,100}$/;
const RECENT_RUNS = 5;
const CONTEXT_CAP = 200;

export interface CtxEvent {
  tsMs: number;
  ctx: string;
  // Kullanım kaydı aranacak görev kimliği (çevrilemeyen iş akışı bağlamında null).
  taskId: string | null;
}

export interface EventSet {
  events: CtxEvent[];
  withoutContext: number;
  rowsScanned: number;
  truncated: boolean;
}

type Row = Record<string, unknown>;

function toMap(v: unknown): Map<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? new Map(Object.entries(v as Record<string, unknown>)) : new Map();
}

function parse(json: unknown): Map<string, unknown> {
  try {
    return toMap(JSON.parse(String(json)));
  } catch {
    return new Map();
  }
}

const idOf = (v: unknown): string | null => (typeof v === "string" && ID_RE.test(v) ? v : null);

// Yalnız SELECT. Satırlar kronolojik sırayla işlenir; pencere = son `days` gün.
export function collectSwitchingEvents(db: Db, now: Date, days: number, limit = ROW_LIMIT): EventSet {
  const since = new Date(now.getTime() - days * DAY_MS).toISOString();
  const rows = db
    .prepare("SELECT ts, details_json FROM audit_events WHERE ts >= ? AND (action LIKE 'task.%' OR action LIKE 'workflow.%' OR action LIKE 'run.%') ORDER BY ts DESC, rowid DESC LIMIT ?")
    .all(since, limit + 1) as Row[];
  const truncated = rows.length > limit;
  const chrono = rows.slice(0, limit).reverse();
  const parsed = chrono.map((r) => ({ ts: Date.parse(String(r.ts)), d: parse(r.details_json) }));

  // İş akışı -> görev çevirisi (yalnız doğrulanmış kimlikler, parametreli sorgu).
  const wfIds = new Set<string>();
  for (const p of parsed) {
    if (idOf(p.d.get("taskId")) === null) {
      const w = idOf(p.d.get("workflowId"));
      if (w !== null) wfIds.add(w);
    }
  }
  const wfTask = new Map<string, string>();
  const ids = [...wfIds];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const found = db.prepare(`SELECT id, task_id FROM workflows WHERE id IN (${chunk.map(() => "?").join(",")})`).all(...chunk) as Row[];
    for (const f of found) {
      const t = idOf(f.task_id);
      if (t !== null) wfTask.set(String(f.id), t);
    }
  }

  const events: CtxEvent[] = [];
  let withoutContext = 0;
  for (const p of parsed) {
    if (Number.isNaN(p.ts)) {
      withoutContext++;
      continue;
    }
    const task = idOf(p.d.get("taskId"));
    if (task !== null) {
      events.push({ tsMs: p.ts, ctx: task, taskId: task });
      continue;
    }
    const wf = idOf(p.d.get("workflowId"));
    if (wf === null) {
      withoutContext++;
      continue;
    }
    const t = wfTask.get(wf) ?? null;
    events.push({ tsMs: p.ts, ctx: t ?? `wf:${wf}`, taskId: t });
  }
  return { events, withoutContext, rowsScanned: Math.min(rows.length, limit), truncated };
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

// Görev başına son en çok 5 bildirilmiş koşunun ortalama girdi token değeri (kullanım ucuyla aynı kayıt türleri); yoksa null.
export function collectInputTokens(db: Db, taskIds: string[]): Map<string, number | null> {
  const out = new Map<string, number | null>();
  const q = db.prepare("SELECT kind, data_json FROM task_evidence WHERE task_id = ? AND (kind = 'usage' OR kind LIKE 'step:%') ORDER BY created_at DESC, rowid DESC LIMIT 40");
  for (const id of taskIds.slice(0, CONTEXT_CAP)) {
    const vals: number[] = [];
    for (const r of q.all(id) as Row[]) {
      if (vals.length >= RECENT_RUNS) break;
      const d = parse(r.data_json);
      const usage = r.kind === "usage" ? d : toMap(d.get("usage"));
      const input = usage.get("inputTokens");
      if (usage.get("source") === "reported" && isNum(input)) vals.push(input);
    }
    out.set(id, vals.length === 0 ? null : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
  }
  return out;
}

export interface SwitchingReport {
  generatedAt: string;
  days: number;
  timezone: "UTC";
  status: "yeterli" | "yetersiz veri";
  sample: { events: number; withoutContext: number; contexts: number; rowsScanned: number; rowLimit: number; truncated: boolean; minEvents: number };
  switches: { total: number; perDay: Array<{ date: string; events: number; switches: number }>; topHours: Array<{ hourUtc: number; switches: number }> };
  sessions: { gapMinutes: number; count: number; measured: number; avgDurationMs: number | null };
  reload: { estimatedTokens: number | null; label: string; coveredSwitches: number; uncoveredSwitches: number; basis: string };
  limits: string;
  note: string;
}

export const LIMITS_NOTE = "kullanıcının sohbet/pencere geçişleri kaydedilmez; yalnız denetim kayıtlarına düşen görev/iş akışı etkinlikleri ölçülür; bu nedenle KISMİ bir göstergedir";

export function computeSwitching(set: EventSet, tokens: ReadonlyMap<string, number | null>, now: Date, days: number): SwitchingReport {
  const events = [...set.events].sort((a, b) => a.tsMs - b.tsMs);
  const enough = events.length >= MIN_EVENTS;
  const dayKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

  const perDay = new Map<string, { events: number; switches: number }>();
  for (let i = days - 1; i >= 0; i--) perDay.set(dayKey(now.getTime() - i * DAY_MS), { events: 0, switches: 0 });
  const bump = (ms: number, field: "events" | "switches"): void => {
    const e = perDay.get(dayKey(ms));
    if (e) e[field]++;
  };
  const hours = new Array<number>(24).fill(0);
  const intoCount = new Map<string, number>();
  let total = 0;
  for (let i = 0; i < events.length; i++) {
    const e = events[i] as CtxEvent;
    bump(e.tsMs, "events");
    const prev = events[i - 1];
    if (prev && prev.ctx !== e.ctx) {
      total++;
      bump(e.tsMs, "switches");
      const h = new Date(e.tsMs).getUTCHours();
      hours[h] = (hours[h] ?? 0) + 1;
      intoCount.set(e.ctx, (intoCount.get(e.ctx) ?? 0) + 1);
    }
  }

  // Oturumlar: bağlam başına, boşluk > 30 dk böler.
  const byCtx = new Map<string, number[]>();
  const taskOf = new Map<string, string | null>();
  for (const e of events) {
    const list = byCtx.get(e.ctx);
    if (list) list.push(e.tsMs);
    else byCtx.set(e.ctx, [e.tsMs]);
    taskOf.set(e.ctx, e.taskId);
  }
  let sessionCount = 0;
  const durations: number[] = [];
  for (const times of byCtx.values()) {
    let start = times[0] as number;
    let last = start;
    let n = 1;
    for (let i = 1; i < times.length; i++) {
      const t = times[i] as number;
      if (t - last > SESSION_GAP_MS) {
        sessionCount++;
        if (n >= 2) durations.push(last - start);
        start = t;
        n = 0;
      }
      last = t;
      n++;
    }
    sessionCount++;
    if (n >= 2) durations.push(last - start);
  }

  // Yeniden yükleme göstergesi.
  let covered = 0;
  let uncovered = 0;
  let sum = 0;
  for (const [ctx, n] of intoCount) {
    const task = taskOf.get(ctx) ?? null;
    const avg = task ? (tokens.get(task) ?? null) : null;
    if (avg === null) uncovered += n;
    else {
      covered += n;
      sum += n * avg;
    }
  }
  const known = enough && covered > 0;
  const label = !enough
    ? "tahmini yeniden yükleme token'ı: yetersiz veri"
    : !known
      ? "tahmini yeniden yükleme token'ı: bilinmiyor"
      : uncovered > 0
        ? `tahmini yeniden yükleme token'ı: en az ${sum} (${uncovered} geçiş için veri yok)`
        : `tahmini yeniden yükleme token'ı: ${sum}`;
  return {
    generatedAt: now.toISOString(),
    days,
    timezone: "UTC",
    status: enough ? "yeterli" : "yetersiz veri",
    sample: { events: events.length, withoutContext: set.withoutContext, contexts: byCtx.size, rowsScanned: set.rowsScanned, rowLimit: ROW_LIMIT, truncated: set.truncated, minEvents: MIN_EVENTS },
    switches: {
      total,
      perDay: [...perDay.entries()].map(([date, v]) => ({ date, ...v })),
      topHours: hours
        .map((switches, hourUtc) => ({ hourUtc, switches }))
        .filter((h) => h.switches > 0)
        .sort((a, b) => b.switches - a.switches || a.hourUtc - b.hourUtc)
        .slice(0, 5),
    },
    sessions: { gapMinutes: SESSION_GAP_MS / 60000, count: sessionCount, measured: durations.length, avgDurationMs: enough && durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null },
    reload: {
      estimatedTokens: known ? sum : null,
      label,
      coveredSwitches: covered,
      uncoveredSwitches: uncovered,
      basis: "geçilen bağlamın son 5 bildirilmiş koşusunun ortalama girdi token değeri x o bağlama geçiş sayısı; sağlayıcı bildirmediyse hesaplanmaz; para birimi yok",
    },
    limits: LIMITS_NOTE,
    note: `Yalnız ölçüm, öneri yok. Olay sayısı < ${MIN_EVENTS} ise 'yetersiz veri' (ortalama ve tahmin verilmez). Zamanlar UTC. En çok ${ROW_LIMIT} son denetim satırı okunur; aşılırsa en eski olaylar sayılmaz (sample.truncated).`,
  };
}

export function switchingReport(db: Db, now: Date, days: number): SwitchingReport {
  const set = collectSwitchingEvents(db, now, days);
  const tasks = [...new Set(set.events.map((e) => e.taskId).filter((t): t is string => t !== null))];
  return computeSwitching(set, collectInputTokens(db, tasks), now, days);
}
