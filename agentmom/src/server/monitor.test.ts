// Canlı izleme saf hesap testleri (madde 8, D5a). Yazan: Claude [İP:AgentMom D5a]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { TaskStore } from "../core/tasks/tasks.ts";
import { APPROVAL_WAIT_MIN, SLOW_STEP_MIN, STALLED_LONG_MIN, STALLED_MIN, computeMonitor, monitorReport } from "./monitor.ts";
import type { MonitorRows } from "./monitor.ts";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const ago = (min: number) => new Date(NOW.getTime() - min * 60000).toISOString();
const empty = (): MonitorRows => ({ runningWorkflows: [], runningTasks: [], awaitingTasks: [], steps: [], taskAttempts: [], failedTasks: [], failedWorkflows: [] });
const step = (p: Partial<MonitorRows["steps"][number]>): MonitorRows["steps"][number] => ({ workflowId: "w1", taskId: "t1", idx: 0, role: "implement", state: "succeeded", attempts: 1, providerAttempts: 1, providerId: "claude-code", startedAt: null, endedAt: null, ...p });

test("no data: empty lists and bottleneck none (nothing invented)", () => {
  const r = computeMonitor(empty(), NOW, undefined);
  assert.deepEqual(r.running, { workflows: [], tasks: [] });
  assert.deepEqual(r.stalled, []);
  assert.deepEqual(r.awaitingApproval, []);
  assert.deepEqual(r.slowSteps, []);
  assert.deepEqual(r.retries, []);
  assert.deepEqual(r.failedLast24h, { tasks: 0, workflows: 0, items: [] });
  assert.equal(r.bottleneck.kind, "none");
  assert.equal(r.bottleneck.taskId, undefined);
});

test("durations come from stored timestamps; missing timestamps stay null", () => {
  const rows = empty();
  rows.runningWorkflows.push({ id: "w1", taskId: "t1", title: "iş", createdAt: ago(12) });
  rows.runningTasks.push({ id: "t2", title: "koşu", attemptStartedAt: null, updatedAt: ago(3) }, { id: "t3", title: "koşu2", attemptStartedAt: ago(4), updatedAt: ago(4) });
  rows.steps.push(step({ idx: 0, startedAt: null }), step({ idx: 1, startedAt: ago(20), endedAt: ago(15) }), step({ idx: 2, state: "running", startedAt: ago(7), endedAt: null }));
  const r = computeMonitor(rows, NOW, undefined);
  assert.equal(r.running.workflows[0]?.runningMin, 12);
  assert.deepEqual(r.running.tasks.map((t) => t.runningMin), [null, 4]);
  assert.deepEqual(r.slowSteps.map((s) => [s.idx, s.durationMin, s.running]), [[2, 7, true], [1, 5, false]], "a step without start time is not listed with a guessed duration");
});

test("approval wait over the threshold is the bottleneck, with waiting age and risk", () => {
  const rows = empty();
  rows.awaitingTasks.push(
    { id: "a1", title: "kısa", requestedAction: "file.read", request: {}, updatedAt: ago(2) },
    { id: "a2", title: "uzun", requestedAction: "shell.exec", request: { command: "rm -rf x" }, updatedAt: ago(APPROVAL_WAIT_MIN + 5) },
  );
  rows.steps.push(step({ startedAt: ago(SLOW_STEP_MIN + 30), state: "running" }));
  const r = computeMonitor(rows, NOW, undefined);
  assert.equal(r.awaitingApproval[0]?.taskId, "a2", "oldest first");
  assert.equal(r.awaitingApproval[0]?.waitingMin, APPROVAL_WAIT_MIN + 5);
  assert.ok(["high", "critical"].includes(r.awaitingApproval[0]?.risk.level as string));
  assert.equal(r.bottleneck.kind, "approval_wait");
  assert.equal(r.bottleneck.taskId, "a2");
  assert.match(r.bottleneck.text, /onay/);
});

test("slow step, then retries, are picked when no long approval wait exists", () => {
  const rows = empty();
  rows.awaitingTasks.push({ id: "a1", title: "kısa", requestedAction: "file.read", request: {}, updatedAt: ago(1) });
  rows.steps.push(step({ taskId: "t9", idx: 1, role: "review", startedAt: ago(SLOW_STEP_MIN + 1), endedAt: ago(0) }));
  const slow = computeMonitor(rows, NOW, undefined);
  assert.equal(slow.bottleneck.kind, "slow_step");
  assert.equal(slow.bottleneck.taskId, "t9");
  const rows2 = empty();
  rows2.steps.push(step({ taskId: "t7", attempts: 3, startedAt: ago(2), endedAt: ago(1) }));
  rows2.taskAttempts.push({ taskId: "t8", title: "x", attempts: 2 });
  const rr = computeMonitor(rows2, NOW, undefined);
  assert.deepEqual(rr.retries.map((x) => [x.kind, x.taskId, x.attempts]), [["step", "t7", 3], ["task", "t8", 2]]);
  assert.equal(rr.bottleneck.kind, "retries");
  assert.equal(rr.bottleneck.taskId, "t7");
});

test("failures are counted only within the last 24 hours", () => {
  const rows = empty();
  rows.failedTasks.push({ id: "f1", title: "eski", updatedAt: ago(25 * 60) }, { id: "f2", title: "yeni", updatedAt: ago(60) });
  rows.failedWorkflows.push({ id: "fw", taskId: "t", error: "adım başarısız", updatedAt: ago(10) });
  const r = computeMonitor(rows, NOW, undefined);
  assert.equal(r.failedLast24h.tasks, 1);
  assert.equal(r.failedLast24h.workflows, 1);
  assert.deepEqual(r.failedLast24h.items.map((i) => i.id), ["fw", "f2"]);
});

test("monitorReport reads a real database read-only", () => {
  const db = openDb(":memory:");
  migrate(db);
  let clock = new Date(NOW.getTime() - 45 * 60000);
  const tasks = new TaskStore(db, () => clock);
  const t = tasks.create({ title: "onay bekleyen", requestedAction: "file.write", request: { action: "file.write" }, decision: "require_approval" });
  tasks.transition(t.id, "awaiting_approval", { kind: "system", id: "test" });
  clock = NOW;
  const before = db.prepare("SELECT count(*) AS n FROM tasks").get();
  const r = monitorReport(db, NOW, undefined);
  assert.equal(r.awaitingApproval[0]?.waitingMin, 45);
  assert.equal(r.bottleneck.kind, "approval_wait");
  assert.deepEqual(db.prepare("SELECT count(*) AS n FROM tasks").get(), before);
});

// ---- Takılma şüphesi (heartbeat): sabit eşikler 5 / 15 dk, sahte saat; yalnız şüphe, iptal/öldürme YOK ----
test("stalled thresholds: 4.9 min is fine, 5 is stalled, 14.9 is not long, 15 is stalledLong (fake clock)", () => {
  const mk = (min: number) => {
    const rows = empty();
    rows.runningTasks.push({ id: "t1", title: "koşu", attemptStartedAt: ago(min), updatedAt: ago(min) });
    return computeMonitor(rows, NOW, undefined).running.tasks[0];
  };
  const a = mk(4.9);
  assert.deepEqual([a?.lastTraceMin, a?.stalled, a?.stalledLong], [4.9, false, false]);
  const b = mk(STALLED_MIN);
  assert.deepEqual([b?.lastTraceMin, b?.stalled, b?.stalledLong], [5, true, false]);
  const c = mk(14.9);
  assert.deepEqual([c?.stalled, c?.stalledLong], [true, false]);
  const d = mk(STALLED_LONG_MIN);
  assert.deepEqual([d?.lastTraceMin, d?.stalled, d?.stalledLong], [15, true, true]);
  assert.equal(computeMonitor(empty(), NOW, undefined).thresholds.stalledMin, 5);
  assert.equal(computeMonitor(empty(), NOW, undefined).thresholds.stalledLongMin, 15);
});

test("stalled: the newest trace (audit event / evidence / step times) resets the age; workflows use their steps too", () => {
  const rows = empty();
  rows.runningTasks.push({ id: "t1", title: "eski", attemptStartedAt: ago(60), updatedAt: ago(60) }, { id: "t2", title: "iz var", attemptStartedAt: ago(60), updatedAt: ago(60) });
  rows.runningWorkflows.push({ id: "w1", taskId: "t3", title: "akış", createdAt: ago(90) }, { id: "w2", taskId: "t4", title: "akış2", createdAt: ago(90) });
  rows.steps.push(step({ workflowId: "w2", taskId: "t4", state: "running", startedAt: ago(30), endedAt: null }), step({ workflowId: "w2", taskId: "t4", idx: 1, state: "succeeded", startedAt: ago(40), endedAt: ago(2) }));
  rows.traces = [{ taskId: "t2", at: ago(1) }, { taskId: "t2", at: ago(20) }, { taskId: "t1", at: "okunamaz" }];
  const r = computeMonitor(rows, NOW, undefined);
  const byId = (id: string) => [...r.running.tasks, ...r.running.workflows].find((x) => x.id === id);
  assert.equal(byId("t1")?.stalledLong, true, "unreadable trace stamp is ignored; start time is the fallback");
  assert.equal(byId("t2")?.lastTraceMin, 1);
  assert.equal(byId("t2")?.stalled, false);
  assert.equal(byId("w1")?.lastTraceMin, 90);
  assert.equal(byId("w2")?.lastTraceMin, 2, "a step that ended 2 minutes ago is a trace");
  assert.deepEqual(r.stalled.map((x) => [x.id, x.stalledLong]), [["w1", true], ["t1", true]], "sorted by age, only suspects, each task once");
});

test("stalled: no timestamp at all means age unknown (null) and NOT stalled; the list never contains unknowns", () => {
  const rows = empty();
  rows.runningTasks.push({ id: "t1", title: "x", attemptStartedAt: null, updatedAt: "bozuk" });
  rows.runningWorkflows.push({ id: "w1", taskId: "t9", title: null, createdAt: "bozuk" });
  const r = computeMonitor(rows, NOW, undefined);
  assert.deepEqual([r.running.tasks[0]?.lastTraceMin, r.running.tasks[0]?.stalled, r.running.tasks[0]?.stalledLong], [null, false, false]);
  assert.deepEqual([r.running.workflows[0]?.lastTraceMin, r.running.workflows[0]?.stalled], [null, false]);
  assert.deepEqual(r.stalled, []);
});

test("stalled: only RUNNING work is evaluated - finished, failed and waiting items are never stalled", () => {
  const rows = empty();
  rows.awaitingTasks.push({ id: "a", title: "onay", requestedAction: "file.read", request: {}, updatedAt: ago(500) });
  rows.failedTasks.push({ id: "f", title: "bitti", updatedAt: ago(500) });
  rows.steps.push(step({ taskId: "s", state: "succeeded", startedAt: ago(500), endedAt: ago(400) }));
  const r = computeMonitor(rows, NOW, undefined);
  assert.deepEqual(r.stalled, []);
  assert.deepEqual(r.running, { workflows: [], tasks: [] });
});

test("stalled with a real database: the task's own audit/evidence traces count; a succeeded task is not stalled; nothing is written and nothing is cancelled", () => {
  const db = openDb(":memory:");
  migrate(db);
  let clock = new Date(NOW.getTime() - 60 * 60000);
  const tasks = new TaskStore(db, () => clock);
  const quiet = tasks.create({ title: "sessiz", requestedAction: "file.write", request: {}, decision: "allow" });
  const busy = tasks.create({ title: "iz bırakan", requestedAction: "file.write", request: {}, decision: "allow" });
  const done = tasks.create({ title: "biten", requestedAction: "file.write", request: {}, decision: "allow" });
  for (const t of [quiet, busy, done]) tasks.transition(t.id, "approved", { kind: "user", id: "u" });
  for (const t of [quiet, busy, done]) tasks.transition(t.id, "running", { kind: "system", id: "test" });
  tasks.transition(done.id, "succeeded", { kind: "system", id: "test" });
  db.prepare("INSERT INTO audit_events (id, ts, initiator_kind, initiator_id, action, decision, result, details_json) VALUES (?, ?, 'agent', 'claude-code', 'provider.event:message', 'n/a', 'message', ?)").run("e1", new Date(NOW.getTime() - 3 * 60000).toISOString(), JSON.stringify({ taskId: busy.id }));
  db.prepare("INSERT INTO task_evidence (id, task_id, attempt_id, kind, summary, data_json, created_at) VALUES ('ev1', ?, NULL, 'usage', 's', '{}', ?)").run(quiet.id, new Date(NOW.getTime() - 40 * 60000).toISOString());
  clock = NOW;
  const counts = () => ["tasks", "audit_events", "task_evidence", "task_attempts"].map((t) => (db.prepare(`SELECT count(*) AS n FROM ${t}`).get() as { n: number }).n);
  const before = counts();
  const r = monitorReport(db, NOW, undefined);
  const q = r.running.tasks.find((t) => t.id === quiet.id);
  const b = r.running.tasks.find((t) => t.id === busy.id);
  assert.equal(q?.stalledLong, true, "evidence 40 min ago is the newest trace");
  assert.equal(q?.lastTraceMin, 40);
  assert.equal(b?.stalled, false);
  assert.equal(b?.lastTraceMin, 3);
  assert.equal(r.running.tasks.some((t) => t.id === done.id), false);
  assert.deepEqual(r.stalled.map((x) => x.taskId), [quiet.id]);
  assert.deepEqual(counts(), before, "read only");
  assert.equal((db.prepare("SELECT state FROM tasks WHERE id = ?").get(quiet.id) as { state: string }).state, "running", "suspect is never cancelled or changed");
});

import { collectMonitorRows } from "./monitor.ts";
test("iz alt sorgusu ana sorguyla aynı ORDER BY + LIMIT kümesini izler (101 çalışan görev, updated_at ters sırada)", () => {
  const db = openDb(":memory:");
  migrate(db);
  const tasks = new TaskStore(db, () => clock);
  let clock = new Date(NOW.getTime());
  for (let i = 0; i < 101; i++) {
    clock = new Date(NOW.getTime() - i * 1000); // sonra oluşan görevin updated_at'i daha eski: rowid sırası ile updated_at sırası TERS
    const t = tasks.create({ title: `g${i}`, requestedAction: "file.write", request: {}, decision: "allow" });
    tasks.transition(t.id, "approved", { kind: "user", id: "u" });
    tasks.transition(t.id, "running", { kind: "system", id: "test" });
    db.prepare("INSERT INTO task_evidence (id, task_id, attempt_id, kind, summary, data_json, created_at) VALUES (?, ?, NULL, 'usage', 's', '{}', ?)").run(`e${i}`, t.id, NOW.toISOString());
  }
  const rows = collectMonitorRows(db, NOW);
  assert.equal(rows.runningTasks.length, 100);
  const listed = new Set(rows.runningTasks.map((t) => t.id));
  assert.equal(rows.traces?.length, 100);
  assert.ok(rows.traces?.every((t) => listed.has(t.taskId)), "iz satırları raporlanan görevlerle aynı küme");
});
