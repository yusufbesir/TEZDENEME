// Canlı izleme ve darboğaz analizi (madde 8, D5a). Yazan: Claude [İP:AgentMom D5a]; sahip: Yusuf. Yalnız bu dosyayı yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Kurallar: her değer yalnız kayıtlı veriden (tasks, task_attempts, workflows, workflow_steps) gelir; bilinmeyen = null, UYDURMA YOK. Okuma yalnızdır, hiçbir
// şey yazılmaz. Hesap (computeMonitor) SAF ve ayrı test edilir; collectMonitorRows yalnız SELECT çalıştırır. Model ve ağ yok.
// TAKILMA ŞÜPHESİ (heartbeat): çalışan koşu/iş akışı için "son iz yaşı" = şimdi - en yeni kayıtlı iz (denetim olayı, kanıt, deneme/adım başlangıcı). Sabit eşikler (kullanıcı ayarı YOK):
// >= STALLED_MIN dk iz yoksa stalled (takılmış GÖRÜNÜYOR), >= STALLED_LONG_MIN dk ise stalledLong. Bu yalnız bir ŞÜPHEDİR (uzun süren meşru işler olabilir); hiçbir şey iptal edilmez,
// öldürülmez, yeniden yönlendirilmez. Yalnız state=running olanlar değerlendirilir (biten koşu takılmış sayılmaz). İz bilgisi yoksa yaş null: bilinmeyen = takılmış DEĞİL (uydurma yok).
// Denetim izi son 24 saatten okunur; daha eski iz görülmezse koşunun başlangıç/güncelleme damgası kullanılır (yaş üst sınırdır).
import { redactString } from "../core/audit/redact.ts";
import type { Db } from "../core/db/db.ts";
import { assessTaskRequest } from "../core/policy/risk.ts";
import type { RiskAssessment, RiskInput } from "../core/policy/risk.ts";

export const APPROVAL_WAIT_MIN = 30;
export const SLOW_STEP_MIN = 10;
export const RETRY_ATTEMPTS = 3;
export const STALLED_MIN = 5;
export const STALLED_LONG_MIN = 15;
const LIST_MAX = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface MonitorRows {
  runningWorkflows: Array<{ id: string; taskId: string; title: string | null; createdAt: string }>;
  runningTasks: Array<{ id: string; title: string; attemptStartedAt: string | null; updatedAt: string }>;
  awaitingTasks: Array<{ id: string; title: string; requestedAction: string; request: unknown; updatedAt: string }>;
  steps: Array<{ workflowId: string; taskId: string; idx: number; role: string; state: string; attempts: number; providerAttempts: number; providerId: string | null; startedAt: string | null; endedAt: string | null }>;
  taskAttempts: Array<{ taskId: string; title: string; attempts: number }>;
  failedTasks: Array<{ id: string; title: string; updatedAt: string }>;
  failedWorkflows: Array<{ id: string; taskId: string; error: string | null; updatedAt: string }>;
  // Görev başına en yeni kayıtlı iz (denetim olayı ya da kanıt); isteğe bağlı: yoksa yalnız koşunun kendi damgaları kullanılır.
  traces?: Array<{ taskId: string; at: string }>;
}

export type BottleneckKind = "approval_wait" | "slow_step" | "retries" | "none";

export interface Heartbeat {
  // Son kayıtlı izden bu yana dakika; iz bilgisi yoksa null.
  lastTraceMin: number | null;
  stalled: boolean;
  stalledLong: boolean;
}

export interface StalledItem {
  kind: "workflow" | "task";
  id: string;
  taskId: string;
  title: string | null;
  lastTraceMin: number;
  stalledLong: boolean;
}

export interface MonitorReport {
  generatedAt: string;
  running: {
    workflows: Array<{ id: string; taskId: string; title: string | null; runningMin: number | null } & Heartbeat>;
    tasks: Array<{ id: string; title: string; runningMin: number | null } & Heartbeat>;
  };
  // Takılmış GÖRÜNEN koşular (yalnız şüphe; iptal/öldürme yok). Aynı görev bir kez listelenir.
  stalled: StalledItem[];
  awaitingApproval: Array<{ taskId: string; title: string; action: string; waitingMin: number | null; risk: RiskAssessment }>;
  slowSteps: Array<{ workflowId: string; taskId: string; idx: number; role: string; state: string; providerId: string | null; durationMin: number | null; running: boolean }>;
  retries: Array<{ kind: "step" | "task"; taskId: string; workflowId: string | null; idx: number | null; attempts: number }>;
  failedLast24h: { tasks: number; workflows: number; items: Array<{ kind: "task" | "workflow"; id: string; at: string; text: string | null }> };
  bottleneck: { kind: BottleneckKind; text: string; taskId?: string };
  thresholds: { approvalWaitMin: number; slowStepMin: number; retryAttempts: number; stalledMin: number; stalledLongMin: number };
}

// Dakika; zaman damgası yoksa ya da okunamıyorsa null (tahmin yok).
function minutesBetween(from: string | null, to: number): number | null {
  if (!from) return null;
  const t = Date.parse(from);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round(((to - t) / 60000) * 10) / 10);
}

// En yeni geçerli damga (ISO); hiçbiri okunamıyorsa null.
function newest(stamps: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;
  for (const s of stamps) {
    if (!s) continue;
    const t = Date.parse(s);
    if (!Number.isNaN(t) && t > bestMs) {
      best = s;
      bestMs = t;
    }
  }
  return best;
}

function heartbeat(lastTrace: string | null, nowMs: number): Heartbeat {
  const lastTraceMin = minutesBetween(lastTrace, nowMs);
  return { lastTraceMin, stalled: lastTraceMin !== null && lastTraceMin >= STALLED_MIN, stalledLong: lastTraceMin !== null && lastTraceMin >= STALLED_LONG_MIN };
}

export function computeMonitor(rows: MonitorRows, now: Date, contract: RiskInput["contract"]): MonitorReport {
  const nowMs = now.getTime();
  const traceOf = new Map<string, string>();
  for (const tr of rows.traces ?? []) {
    const cur = traceOf.get(tr.taskId);
    traceOf.set(tr.taskId, newest([cur, tr.at]) as string);
  }
  const workflows = rows.runningWorkflows.map((w) => {
    const stepStamps = rows.steps.filter((s) => s.workflowId === w.id).flatMap((s) => [s.startedAt, s.endedAt]);
    return { id: w.id, taskId: w.taskId, title: w.title, runningMin: minutesBetween(w.createdAt, nowMs), ...heartbeat(newest([w.createdAt, traceOf.get(w.taskId), ...stepStamps]), nowMs) };
  });
  const tasks = rows.runningTasks.map((t) => ({ id: t.id, title: t.title, runningMin: minutesBetween(t.attemptStartedAt, nowMs), ...heartbeat(newest([t.attemptStartedAt, t.updatedAt, traceOf.get(t.id)]), nowMs) }));
  const stalled: StalledItem[] = [];
  const seenTask = new Set<string>();
  for (const w of workflows) {
    if (!w.stalled || w.lastTraceMin === null || seenTask.has(w.taskId)) continue;
    seenTask.add(w.taskId);
    stalled.push({ kind: "workflow", id: w.id, taskId: w.taskId, title: w.title, lastTraceMin: w.lastTraceMin, stalledLong: w.stalledLong });
  }
  for (const t of tasks) {
    if (!t.stalled || t.lastTraceMin === null || seenTask.has(t.id)) continue;
    seenTask.add(t.id);
    stalled.push({ kind: "task", id: t.id, taskId: t.id, title: t.title, lastTraceMin: t.lastTraceMin, stalledLong: t.stalledLong });
  }
  stalled.sort((a, b) => b.lastTraceMin - a.lastTraceMin);
  stalled.splice(LIST_MAX);
  const awaitingApproval = rows.awaitingTasks
    .map((t) => ({ taskId: t.id, title: t.title, action: t.requestedAction, waitingMin: minutesBetween(t.updatedAt, nowMs), risk: assessTaskRequest(t.requestedAction, t.request, contract) }))
    .sort((a, b) => (b.waitingMin ?? -1) - (a.waitingMin ?? -1));

  const slowSteps = rows.steps
    .filter((s) => s.startedAt !== null)
    .map((s) => {
      const running = s.state === "running" && s.endedAt === null;
      const end = running ? nowMs : s.endedAt ? Date.parse(s.endedAt) : Number.NaN;
      const durationMin = Number.isNaN(end) ? null : minutesBetween(s.startedAt, end);
      return { workflowId: s.workflowId, taskId: s.taskId, idx: s.idx, role: s.role, state: s.state, providerId: s.providerId, durationMin, running };
    })
    .filter((s) => s.durationMin !== null)
    .sort((a, b) => (b.durationMin as number) - (a.durationMin as number))
    .slice(0, LIST_MAX);

  const retries = [
    ...rows.steps.filter((s) => s.attempts > 1).map((s) => ({ kind: "step" as const, taskId: s.taskId, workflowId: s.workflowId, idx: s.idx, attempts: s.attempts })),
    ...rows.taskAttempts.filter((t) => t.attempts > 1).map((t) => ({ kind: "task" as const, taskId: t.taskId, workflowId: null, idx: null, attempts: t.attempts })),
  ]
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, LIST_MAX);

  const inDay = (at: string): boolean => {
    const t = Date.parse(at);
    return !Number.isNaN(t) && nowMs - t <= DAY_MS && t <= nowMs;
  };
  const ft = rows.failedTasks.filter((t) => inDay(t.updatedAt));
  const fw = rows.failedWorkflows.filter((w) => inDay(w.updatedAt));
  const items = [
    ...ft.map((t) => ({ kind: "task" as const, id: t.id, at: t.updatedAt, text: t.title })),
    ...fw.map((w) => ({ kind: "workflow" as const, id: w.id, at: w.updatedAt, text: w.error === null ? null : short(w.error) })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, LIST_MAX);

  return {
    generatedAt: now.toISOString(),
    running: { workflows, tasks },
    stalled,
    awaitingApproval,
    slowSteps,
    retries,
    failedLast24h: { tasks: ft.length, workflows: fw.length, items },
    bottleneck: pickBottleneck(awaitingApproval, slowSteps, retries),
    thresholds: { approvalWaitMin: APPROVAL_WAIT_MIN, slowStepMin: SLOW_STEP_MIN, retryAttempts: RETRY_ATTEMPTS, stalledMin: STALLED_MIN, stalledLongMin: STALLED_LONG_MIN },
  };
}

// Sabit öncelik: uzun onay beklemesi > yavaş adım > tekrarlanan denemeler. Eşik altındaysa 'none' (darboğaz uydurulmaz).
export function pickBottleneck(
  awaiting: MonitorReport["awaitingApproval"],
  slow: MonitorReport["slowSteps"],
  retries: MonitorReport["retries"],
): MonitorReport["bottleneck"] {
  const oldest = awaiting.find((a) => a.waitingMin !== null && a.waitingMin >= APPROVAL_WAIT_MIN);
  if (oldest) {
    const more = awaiting.length > 1 ? ` (toplam ${awaiting.length} görev onay bekliyor)` : "";
    return { kind: "approval_wait", text: `"${oldest.title}" görevi ${oldest.waitingMin} dakikadır kullanıcı onayı bekliyor${more}.`, taskId: oldest.taskId };
  }
  const slowest = slow.find((s) => s.durationMin !== null && s.durationMin >= SLOW_STEP_MIN);
  if (slowest) {
    const state = slowest.running ? "sürüyor" : "sürdü";
    return { kind: "slow_step", text: `İş akışı adımı ${slowest.idx + 1} (${slowest.role}) ${slowest.durationMin} dakikadır ${state}.`, taskId: slowest.taskId };
  }
  const worst = retries.find((r) => r.attempts >= RETRY_ATTEMPTS);
  if (worst) {
    const where = worst.kind === "step" ? `iş akışı adımı ${(worst.idx as number) + 1}` : "görev çalıştırması";
    return { kind: "retries", text: `Bir ${where} ${worst.attempts} kez denendi; tekrarlanan denemeler işi yavaşlatıyor.`, taskId: worst.taskId };
  }
  return { kind: "none", text: "Kayıtlı veride eşikleri aşan bir darboğaz görünmüyor." };
}

type Row = Record<string, unknown>;

function short(text: string): string {
  const t = redactString(text).replace(/\s+/g, " ").trim();
  return t.length > 200 ? `${t.slice(0, 199)}…` : t;
}

// Yalnız SELECT; tablolar migrasyonlarla zaten vardır.
export function collectMonitorRows(db: Db, now: Date): MonitorRows {
  const since = new Date(now.getTime() - DAY_MS).toISOString();
  const s = (v: unknown): string | null => (typeof v === "string" ? v : null);
  const parse = (v: unknown): unknown => {
    try {
      return JSON.parse(String(v));
    } catch {
      return {};
    }
  };
  return {
    runningWorkflows: (db.prepare("SELECT w.id, w.task_id, t.title, w.created_at FROM workflows w LEFT JOIN tasks t ON t.id = w.task_id WHERE w.state = 'running' ORDER BY w.created_at LIMIT 100").all() as Row[]).map((r) => ({
      id: r.id as string,
      taskId: r.task_id as string,
      title: s(r.title),
      createdAt: r.created_at as string,
    })),
    runningTasks: (
      db
        .prepare("SELECT t.id, t.title, t.updated_at, (SELECT a.started_at FROM task_attempts a WHERE a.task_id = t.id AND a.state = 'running' ORDER BY a.attempt_no DESC LIMIT 1) AS started FROM tasks t WHERE t.state = 'running' ORDER BY t.updated_at LIMIT 100")
        .all() as Row[]
    ).map((r) => ({ id: r.id as string, title: r.title as string, attemptStartedAt: s(r.started), updatedAt: r.updated_at as string })),
    awaitingTasks: (db.prepare("SELECT id, title, requested_action, request_json, updated_at FROM tasks WHERE state = 'awaiting_approval' ORDER BY updated_at LIMIT 100").all() as Row[]).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      requestedAction: r.requested_action as string,
      request: parse(r.request_json),
      updatedAt: r.updated_at as string,
    })),
    steps: (
      db
        .prepare(
          `SELECT s.workflow_id, w.task_id, s.idx, s.role, s.state, s.attempts, s.provider_attempts, s.provider_id, s.started_at, s.ended_at
           FROM workflow_steps s JOIN workflows w ON w.id = s.workflow_id
           WHERE s.state = 'running' OR s.attempts > 1 OR (s.started_at IS NOT NULL AND COALESCE(s.ended_at, s.started_at) >= ?)
           ORDER BY s.started_at DESC LIMIT 500`,
        )
        .all(since) as Row[]
    ).map((r) => ({
      workflowId: r.workflow_id as string,
      taskId: r.task_id as string,
      idx: Number(r.idx),
      role: r.role as string,
      state: r.state as string,
      attempts: Number(r.attempts ?? 0),
      providerAttempts: Number(r.provider_attempts ?? 0),
      providerId: s(r.provider_id),
      startedAt: s(r.started_at),
      endedAt: s(r.ended_at),
    })),
    taskAttempts: (
      db
        .prepare("SELECT a.task_id, t.title, COUNT(*) AS n FROM task_attempts a JOIN tasks t ON t.id = a.task_id GROUP BY a.task_id HAVING COUNT(*) > 1 ORDER BY n DESC LIMIT 100")
        .all() as Row[]
    ).map((r) => ({ taskId: r.task_id as string, title: r.title as string, attempts: Number(r.n) })),
    failedTasks: (db.prepare("SELECT id, title, updated_at FROM tasks WHERE state = 'failed' AND updated_at >= ? ORDER BY updated_at DESC LIMIT 100").all(since) as Row[]).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      updatedAt: r.updated_at as string,
    })),
    failedWorkflows: (db.prepare("SELECT id, task_id, error, updated_at FROM workflows WHERE state = 'failed' AND updated_at >= ? ORDER BY updated_at DESC LIMIT 100").all(since) as Row[]).map((r) => ({
      id: r.id as string,
      taskId: r.task_id as string,
      error: s(r.error),
      updatedAt: r.updated_at as string,
    })),
    traces: collectTraces(db, since),
  };
}

// Çalışan görevlerin/iş akışlarının görevleri için en yeni iz: denetim olayı (son 24 saat, details.taskId) ve kanıt kaydı. Yalnız SELECT; en çok 200 görev.
function collectTraces(db: Db, since: string): Array<{ taskId: string; at: string }> {
  // Alt sorgular ana sorgularla AYNI ORDER BY + LIMIT'i kullanır (rapordaki satırlarla aynı kümeyi izler).
  const ids = "SELECT id FROM (SELECT id FROM tasks WHERE state = 'running' ORDER BY updated_at LIMIT 100) UNION SELECT task_id FROM (SELECT w.task_id AS task_id FROM workflows w WHERE w.state = 'running' ORDER BY w.created_at LIMIT 100)";
  const audit = db
    .prepare(`SELECT json_extract(details_json, '$.taskId') AS t, MAX(ts) AS m FROM audit_events WHERE ts >= ? AND json_valid(details_json) AND json_extract(details_json, '$.taskId') IN (${ids}) GROUP BY t`)
    .all(since) as Row[];
  const evidence = db.prepare(`SELECT task_id AS t, MAX(created_at) AS m FROM task_evidence WHERE task_id IN (${ids}) GROUP BY task_id`).all() as Row[];
  const out: Array<{ taskId: string; at: string }> = [];
  for (const r of [...audit, ...evidence]) if (typeof r.t === "string" && typeof r.m === "string") out.push({ taskId: r.t, at: r.m });
  return out;
}

export function monitorReport(db: Db, now: Date, contract: RiskInput["contract"]): MonitorReport {
  return computeMonitor(collectMonitorRows(db, now), now, contract);
}
