// Bağlam değiştirme maliyeti birim testleri (D8c-3b, madde 71). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Bilinen küçük olay dizileriyle elle hesaplanmış geçiş / oturum sayıları, 30 dk bölme, token bilinmiyor, yetersiz veri, kötü niyetli details, 5000 satır sınırı.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { memoryAudit } from "../testing/analysis-fixtures.ts";
import { MIN_EVENTS, ROW_LIMIT, collectInputTokens, collectSwitchingEvents, computeSwitching, switchingReport } from "./switching.ts";

const NOW = new Date("2026-10-23T12:00:00.000Z");

function rec(m: ReturnType<typeof memoryAudit>, iso: string, details: unknown, action = "run.started"): void {
  m.setClock(iso);
  m.audit.record({ initiator: { kind: "system", id: "orchestrator" }, action, decision: "n/a", result: "x", details });
}

// 22 olay; A/B/C bağlamları; elle sayılmış: 6 geçiş.
function seed() {
  const m = memoryAudit();
  const seq: Array<[string, string]> = [
    ["2026-10-22T09:00:00Z", "A"], ["2026-10-22T09:05:00Z", "A"], ["2026-10-22T09:10:00Z", "B"], ["2026-10-22T09:20:00Z", "A"], ["2026-10-22T09:25:00Z", "A"],
    ["2026-10-22T14:00:00Z", "A"], ["2026-10-22T14:10:00Z", "B"], ["2026-10-22T14:20:00Z", "B"],
    ["2026-10-23T08:00:00Z", "B"], ["2026-10-23T08:10:00Z", "C"], ["2026-10-23T08:20:00Z", "B"], ["2026-10-23T08:30:00Z", "C"],
  ];
  for (let i = 0; i < 10; i++) seq.push([new Date(Date.parse("2026-10-23T09:00:00Z") + i * 5 * 60000).toISOString(), "C"]);
  for (const [t, c] of seq) rec(m, t, { taskId: c });
  return m;
}

test("hand-computed switches, per-day counts, top hours and 30-minute session splitting", () => {
  const set = collectSwitchingEvents(seed().db, NOW, 2);
  assert.equal(set.events.length, 22);
  const r = computeSwitching(set, new Map(), NOW, 2);
  assert.equal(r.status, "yeterli");
  assert.equal(r.switches.total, 6);
  assert.deepEqual(r.switches.perDay, [{ date: "2026-10-22", events: 8, switches: 3 }, { date: "2026-10-23", events: 14, switches: 3 }]);
  assert.deepEqual(r.switches.topHours, [{ hourUtc: 8, switches: 3 }, { hourUtc: 9, switches: 2 }, { hourUtc: 14, switches: 1 }]);
  // A: [09:00-09:25] 25 dk + tek olay; B: tek olay, [14:10-14:20] 10 dk, [08:00-08:20] 20 dk; C: tek oturum 08:10..09:45 (boşluk tam 30 dk bölmez) 95 dk
  assert.deepEqual([r.sessions.count, r.sessions.measured], [6, 4]);
  assert.equal(r.sessions.avgDurationMs, ((25 + 10 + 20 + 95) / 4) * 60000);
  assert.equal(r.sample.contexts, 3);
  assert.equal(r.sample.events, 22);
  assert.equal(r.sample.minEvents, MIN_EVENTS);
  assert.match(r.limits, /KISMİ bir göstergedir/);
  assert.match(r.limits, /sohbet\/pencere geçişleri kaydedilmez/);
  assert.equal(r.timezone, "UTC");
});

test("a gap longer than 30 minutes splits a session; too few events -> yetersiz veri without averages", () => {
  const m = memoryAudit();
  rec(m, "2026-10-23T10:00:00Z", { taskId: "A" });
  rec(m, "2026-10-23T10:20:00Z", { taskId: "A" });
  rec(m, "2026-10-23T10:51:00Z", { taskId: "A" });
  rec(m, "2026-10-23T10:55:00Z", { taskId: "B" });
  const r = computeSwitching(collectSwitchingEvents(m.db, NOW, 1), new Map([["B", 500]]), NOW, 1);
  assert.equal(r.status, "yetersiz veri");
  assert.equal(r.sample.events, 4);
  assert.equal(r.switches.total, 1, "counts are still shown");
  assert.deepEqual([r.sessions.count, r.sessions.measured], [3, 1], "A: [10:00-10:20], [10:51] (31 min gap), B: [10:55]");
  assert.equal(r.sessions.avgDurationMs, null);
  assert.equal(r.reload.estimatedTokens, null);
  assert.match(r.reload.label, /yetersiz veri/);
});

test("reload indicator: unknown when no provider reported tokens, a lower bound when only some did", () => {
  const set = collectSwitchingEvents(seed().db, NOW, 2);
  const none = computeSwitching(set, new Map([["A", null], ["B", null], ["C", null]]), NOW, 2);
  assert.equal(none.reload.estimatedTokens, null);
  assert.equal(none.reload.label, "tahmini yeniden yükleme token'ı: bilinmiyor");
  assert.deepEqual([none.reload.coveredSwitches, none.reload.uncoveredSwitches], [0, 6]);
  // geçiş sayıları: B'ye 3, A'ya 1, C'ye 2
  const some = computeSwitching(set, new Map([["A", 1000], ["B", null], ["C", 2000]]), NOW, 2);
  assert.equal(some.reload.estimatedTokens, 1 * 1000 + 2 * 2000);
  assert.deepEqual([some.reload.coveredSwitches, some.reload.uncoveredSwitches], [3, 3]);
  assert.match(some.reload.label, /en az 5000 \(3 geçiş için veri yok\)/);
  assert.doesNotMatch(JSON.stringify(some), /usd|\$|₺|€/i);
});

test("collectInputTokens: only reported input tokens, newest five runs, steps included", () => {
  const m = memoryAudit();
  const ins = m.db.prepare("INSERT INTO tasks (id, title, state, requested_action, request_json, decision, created_at, updated_at) VALUES (?, 'x', 'approved', 'file.read', '{}', 'allow', ?, ?)");
  for (const id of ["A", "B", "C"]) ins.run(id, m.at(0), m.at(0));
  let t = 0;
  const ev = new EvidenceStore(m.db, () => new Date(Date.parse(m.at(0)) + 1000 * t++));
  ev.add("A", "a1", "usage", "r", { inputTokens: 9999, outputTokens: 1, source: "reported" }); // en eski: son 5 dışında kalır
  for (const n of [100, 200, 300, 400, 500]) ev.add("A", "a", "usage", "r", { inputTokens: n, source: "reported" });
  ev.add("B", "b1", "usage", "r", { inputTokens: 700, source: "unknown" });
  ev.add("B", "b2", "usage", "r", { inputTokens: null, source: "reported" });
  ev.add("C", "c1", "step:plan", "r", { provider: "p", usage: { inputTokens: 40, source: "reported" } });
  ev.add("C", "c2", "step:plan", "r", { provider: "p", usage: { inputTokens: 60, source: "reported" } });
  const tok = collectInputTokens(m.db, ["A", "B", "C", "D"]);
  assert.equal(tok.get("A"), 300);
  assert.equal(tok.get("B"), null);
  assert.equal(tok.get("C"), 50);
  assert.equal(tok.get("D"), null);
});

test("workflow ids are resolved to their task; unresolved ones become their own context; read-only report path", () => {
  const m = memoryAudit();
  m.db.prepare("INSERT INTO tasks (id, title, state, requested_action, request_json, decision, created_at, updated_at) VALUES ('A', 'x', 'approved', 'file.read', '{}', 'allow', ?, ?)").run(m.at(0), m.at(0));
  m.db.prepare("INSERT INTO workflows (id, task_id, repo_path, definition_json, state, created_at, updated_at) VALUES ('wf1', 'A', '/r', '{}', 'running', ?, ?)").run(m.at(0), m.at(0));
  rec(m, "2026-10-23T10:00:00Z", { taskId: "A" });
  rec(m, "2026-10-23T10:01:00Z", { workflowId: "wf1" }, "workflow.step.started");
  rec(m, "2026-10-23T10:02:00Z", { workflowId: "wf9" }, "workflow.step.started");
  rec(m, "2026-10-23T10:03:00Z", { taskId: "A" });
  const before = m.db.prepare("SELECT COUNT(*) AS n FROM audit_events").get() as { n: number };
  const r = switchingReport(m.db, NOW, 1);
  assert.equal(r.switches.total, 2, "A -> A (workflow of A) is no switch; A -> wf:wf9 -> A is two");
  assert.equal(r.sample.contexts, 2);
  assert.deepEqual(m.db.prepare("SELECT COUNT(*) AS n FROM audit_events").get(), before, "nothing is written");
});

test("hostile details: bad id shapes, prototype keys, wrong types and invalid JSON never break or inject", () => {
  const m = memoryAudit();
  const bad: unknown[] = [
    { taskId: { __proto__: { x: 1 } } }, { taskId: ["A"] }, { taskId: "../etc/passwd" }, { taskId: "a b" }, { taskId: "x".repeat(101) }, { taskId: 5 }, { taskId: "" },
    { workflowId: "wf'; DROP TABLE tasks;--" }, { workflowId: { toString: "x" } }, {}, [], "metin", null,
  ];
  for (const [i, d] of bad.entries()) rec(m, `2026-10-23T10:${String(i).padStart(2, "0")}:00Z`, d);
  m.db.prepare("INSERT INTO audit_events (id, ts, initiator_kind, initiator_id, action, decision, result, details_json) VALUES ('raw1', ?, 'system', 's', 'run.started', 'n/a', 'x', '{bozuk')").run("2026-10-23T11:00:00.000Z");
  rec(m, "2026-10-23T11:10:00Z", { taskId: "__proto__" });
  rec(m, "2026-10-23T11:11:00Z", { taskId: "constructor" });
  const set = collectSwitchingEvents(m.db, NOW, 1);
  assert.deepEqual(set.events.map((e) => e.ctx), ["__proto__", "constructor"], "only well-formed ids count; prototype-looking names are plain strings");
  assert.equal(set.withoutContext, bad.length + 1);
  const r = computeSwitching(set, new Map(), NOW, 1);
  assert.equal(r.switches.total, 1);
  assert.equal(({} as Record<string, unknown>)["x"], undefined, "no prototype pollution");
  assert.ok(m.db.prepare("SELECT 1 FROM tasks LIMIT 1").all() !== undefined, "tasks table still exists");
});

test("row limit: the newest 5000 rows are read and the report says it was truncated", () => {
  assert.equal(ROW_LIMIT, 5000);
  const m = memoryAudit();
  const ins = m.db.prepare("INSERT INTO audit_events (id, ts, initiator_kind, initiator_id, action, decision, result, details_json) VALUES (?, ?, 's', 's', 'run.started', 'n/a', 'x', ?)");
  m.db.exec("BEGIN");
  for (let i = 0; i < 12; i++) ins.run(`e${i}`, new Date(Date.parse("2026-10-23T09:00:00Z") + i * 60000).toISOString(), JSON.stringify({ taskId: `T${i}` }));
  m.db.exec("COMMIT");
  const set = collectSwitchingEvents(m.db, NOW, 1, 5);
  assert.equal(set.truncated, true);
  assert.equal(set.rowsScanned, 5);
  assert.deepEqual(set.events.map((e) => e.ctx), ["T7", "T8", "T9", "T10", "T11"], "the newest rows are kept, oldest dropped");
  assert.equal(computeSwitching(set, new Map(), NOW, 1).sample.truncated, true);
  assert.equal(collectSwitchingEvents(m.db, NOW, 1).truncated, false);
});

test("only the requested window counts and non-task/workflow/run actions are ignored", () => {
  const m = memoryAudit();
  rec(m, "2026-10-20T10:00:00Z", { taskId: "OLD" });
  rec(m, "2026-10-23T10:00:00Z", { taskId: "A" }, "memory.add");
  rec(m, "2026-10-23T10:01:00Z", { taskId: "A" }, "provider.event:started");
  rec(m, "2026-10-23T10:02:00Z", { taskId: "A" }, "task.approve");
  assert.deepEqual(collectSwitchingEvents(m.db, NOW, 1).events.map((e) => e.ctx), ["A"]);
  assert.equal(collectSwitchingEvents(m.db, NOW, 7).events.length, 2);
});
