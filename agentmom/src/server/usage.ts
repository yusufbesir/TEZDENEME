// Kullanım raporu (Faz 11, dilim 2). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız bu dosyayı yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Yalnız kayıtlı veriden GERÇEK toplamlar: görevler (tasks), sağlayıcı çalıştırma kanıtları (task_evidence: "usage" ve "step:<rol>".usage), git
// diff kanıtları (task_evidence "diff".stat) ve çalıştırmanın kendi "started" olayındaki model adı (audit_events). Saklanmayan her şey null:
// tahmin yok, uydurma yok, ücret hesabı yok (costUsd okunmaz). Sayılar ham; biçimlendirme arayüzün işi.
import type { Db } from "../core/db/db.ts";

export const CONTEXT_LIMIT = 150_000;
export const USAGE_NOTE = "costBasis=list; ücret yok";

type Row = Record<string, string | number | null>;

interface RunUsage {
  taskId: string;
  attemptId: string | null;
  provider: string | null;
  input: number | null;
  output: number | null;
  reported: boolean;
  at: string;
}

export interface UsageTokens {
  input: number | null;
  output: number | null;
  // Not stored: the claude adapter folds cache writes/reads into input, the others do not report them.
  cacheWrite: null;
  cacheRead: null;
}

export interface ByModelRow {
  model: string | null;
  provider: string | null;
  runs: number;
  reportedRuns: number;
  input: number | null;
  output: number | null;
}

export interface TopicUsageRow {
  id: string;
  title: string;
  model: string | null;
  lastAt: string;
  tokens: number | null;
  cacheHitPct: null;
  sharePct: number | null;
}

export interface UsageReport {
  updatedAt: string;
  topics: number;
  runs: { total: number; reported: number; unknown: number };
  source: "run" | "unknown";
  tokens: UsageTokens | null;
  cacheHitPct: null;
  codeChanges: { added: number; removed: number } | null;
  byModel: ByModelRow[];
  topicsTable: TopicUsageRow[];
  note: string;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

function parse(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const v: unknown = JSON.parse(json);
    return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function toRun(taskId: string, attemptId: string | null, provider: string | null, at: string, u: unknown): RunUsage {
  const o = u !== null && typeof u === "object" ? (u as Record<string, unknown>) : {};
  const input = isNum(o.inputTokens) ? o.inputTokens : null;
  const output = isNum(o.outputTokens) ? o.outputTokens : null;
  return { taskId, attemptId, provider, input, output, reported: o.source === "reported" && (input !== null || output !== null), at };
}

// Every provider run that left a usage record. Single runs: kind "usage" (provider from the "execution" record of the same attempt);
// workflow steps: kind "step:<role>" with the usage inside.
function runUsages(db: Db, taskId?: string): RunUsage[] {
  const where = taskId ? "AND task_id = ?" : "";
  const args = taskId ? [taskId] : [];
  const rows = db.prepare(`SELECT task_id, attempt_id, kind, data_json, created_at FROM task_evidence WHERE (kind IN ('usage', 'execution') OR kind LIKE 'step:%') ${where} ORDER BY created_at, rowid`).all(...args) as unknown as Row[];
  const execProvider = new Map<string, string>();
  for (const r of rows) {
    if (r.kind !== "execution") continue;
    const d = parse(r.data_json as string);
    if (d && typeof d.provider === "string") execProvider.set(`${r.task_id}|${r.attempt_id}`, d.provider);
  }
  const out: RunUsage[] = [];
  for (const r of rows) {
    const d = parse(r.data_json as string);
    if (!d) continue;
    const t = r.task_id as string;
    const a = (r.attempt_id as string | null) ?? null;
    if (r.kind === "usage") out.push(toRun(t, a, execProvider.get(`${t}|${a}`) ?? null, r.created_at as string, d));
    else if (typeof r.kind === "string" && r.kind.startsWith("step:") && "usage" in d) out.push(toRun(t, a, typeof d.provider === "string" ? d.provider : null, r.created_at as string, d.usage));
  }
  return out;
}

// Model names the providers themselves reported at start ("started" event), keyed by task|attempt|provider; the newest wins.
function runModels(db: Db): Map<string, string> {
  const rows = db
    .prepare(
      `SELECT initiator_id AS provider, json_extract(details_json, '$.taskId') AS task_id, json_extract(details_json, '$.attemptId') AS attempt_id,
              json_extract(details_json, '$.data.model') AS model
       FROM audit_events WHERE action = 'provider.event:started' AND initiator_kind = 'agent' AND json_valid(details_json) ORDER BY ts, rowid`,
    )
    .all() as unknown as Row[];
  const out = new Map<string, string>();
  for (const r of rows) if (typeof r.model === "string" && r.model.length > 0) out.set(`${r.task_id}|${r.attempt_id}|${r.provider}`, r.model.slice(0, 200));
  return out;
}

const sumOrNull = (xs: Array<number | null>): number | null => (xs.some((x) => x !== null) ? xs.reduce<number>((a, b) => a + (b ?? 0), 0) : null);

// "3 files changed, 10 insertions(+), 2 deletions(-)" from git diff --stat. A stat without a summary line counts as no change.
export function parseStat(stat: unknown): { added: number; removed: number } | null {
  if (typeof stat !== "string") return null;
  const line = stat.trim().split("\n").pop() ?? "";
  if (!/files? changed/.test(line)) return stat.trim() === "" ? { added: 0, removed: 0 } : null;
  const ins = /(\d+) insertions?\(\+\)/.exec(line);
  const del = /(\d+) deletions?\(-\)/.exec(line);
  return { added: ins ? Number(ins[1]) : 0, removed: del ? Number(del[1]) : 0 };
}

// Last diff per attempt (a workflow re-records the cumulative diff after repairs; summing all of them would count changes twice).
function codeChanges(db: Db): { added: number; removed: number } | null {
  const rows = db.prepare("SELECT task_id, attempt_id, data_json FROM task_evidence WHERE kind = 'diff' ORDER BY created_at, rowid").all() as unknown as Row[];
  const last = new Map<string, unknown>();
  for (const r of rows) last.set(`${r.task_id}|${r.attempt_id}`, parse(r.data_json as string)?.stat);
  let added = 0;
  let removed = 0;
  let any = false;
  for (const stat of last.values()) {
    const s = parseStat(stat);
    if (!s) continue;
    any = true;
    added += s.added;
    removed += s.removed;
  }
  return any ? { added, removed } : null;
}

export function usageReport(db: Db, now: () => Date = () => new Date()): UsageReport {
  const topics = (db.prepare("SELECT COUNT(*) AS n FROM tasks").get() as { n: number }).n;
  const runs = runUsages(db);
  const models = runModels(db);
  const reported = runs.filter((r) => r.reported);
  const modelOf = (r: RunUsage): string | null => models.get(`${r.taskId}|${r.attemptId}|${r.provider}`) ?? null;

  const tokens: UsageTokens | null = reported.length ? { input: sumOrNull(reported.map((r) => r.input)), output: sumOrNull(reported.map((r) => r.output)), cacheWrite: null, cacheRead: null } : null;

  const groups = new Map<string, ByModelRow>();
  for (const r of runs) {
    const model = modelOf(r);
    const key = `${model ?? ""}|${r.provider ?? ""}`;
    const g = groups.get(key) ?? { model, provider: r.provider, runs: 0, reportedRuns: 0, input: null, output: null };
    g.runs++;
    if (r.reported) {
      g.reportedRuns++;
      if (r.input !== null) g.input = (g.input ?? 0) + r.input;
      if (r.output !== null) g.output = (g.output ?? 0) + r.output;
    }
    groups.set(key, g);
  }

  const total = tokens ? (tokens.input ?? 0) + (tokens.output ?? 0) : 0;
  const byTask = new Map<string, RunUsage[]>();
  for (const r of runs) byTask.set(r.taskId, [...(byTask.get(r.taskId) ?? []), r]);
  const titleQ = db.prepare("SELECT title FROM tasks WHERE id = ?");
  const topicsTable: TopicUsageRow[] = [];
  for (const [id, rs] of byTask) {
    const rep = rs.filter((r) => r.reported);
    const t = rep.length ? sumOrNull(rep.flatMap((r) => [r.input, r.output])) : null;
    const lastWithModel = [...rs].reverse().find((r) => modelOf(r) !== null);
    topicsTable.push({
      id,
      title: ((titleQ.get(id) as Row | undefined)?.title as string | undefined) ?? "",
      model: lastWithModel ? modelOf(lastWithModel) : null,
      lastAt: (rs[rs.length - 1] as RunUsage).at,
      tokens: t,
      cacheHitPct: null,
      sharePct: t !== null && total > 0 ? Math.round((t / total) * 1000) / 10 : null,
    });
  }
  topicsTable.sort((a, b) => (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0));

  return {
    updatedAt: now().toISOString(),
    topics,
    runs: { total: runs.length, reported: reported.length, unknown: runs.length - reported.length },
    source: reported.length ? "run" : "unknown",
    tokens,
    cacheHitPct: null,
    codeChanges: codeChanges(db),
    byModel: [...groups.values()],
    topicsTable,
    note: USAGE_NOTE,
  };
}

export interface ContextReport {
  tokens: number | null;
  limit: number;
  pct: number | null;
  source: "run" | "unknown";
}

// Context fill of a topic = prompt (input) + output tokens of its LATEST run that reported them. No reported run -> null, source "unknown".
// The topic is a task id or a workflow id (resolved to its task). Returns null when no such topic exists.
export function contextFor(db: Db, topicId: string): ContextReport | null {
  let taskId: string | null = null;
  if (db.prepare("SELECT 1 FROM tasks WHERE id = ?").get(topicId)) taskId = topicId;
  else {
    const wf = db.prepare("SELECT task_id FROM workflows WHERE id = ?").get(topicId) as Row | undefined;
    if (wf) taskId = wf.task_id as string;
  }
  if (!taskId) return null;
  const latest = runUsages(db, taskId).filter((r) => r.reported).pop();
  if (!latest) return { tokens: null, limit: CONTEXT_LIMIT, pct: null, source: "unknown" };
  const tokens = (latest.input ?? 0) + (latest.output ?? 0);
  return { tokens, limit: CONTEXT_LIMIT, pct: Math.round((tokens / CONTEXT_LIMIT) * 1000) / 10, source: "run" };
}
