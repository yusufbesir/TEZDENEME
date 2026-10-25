// Uzmanlık haritalayıcı birim testleri (D8b, madde 86). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Gerçek (bellek içi) SQLite + gerçek denetim kaydı; olaylar elle yazılır. Yetersiz örnekte oran/süre YOK, yeterli örnekte elle hesaplanmış sayılar, satır sınırı.
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryAudit } from "../testing/analysis-fixtures.ts";
import { MIN_SAMPLE, buildExpertise, collectDeliveries, collectObservations, expertiseReport, roleObservations } from "./expertise.ts";

function seed() {
  const m = memoryAudit();
  const ev = (sec: number, action: string, result: string, details: Record<string, unknown>): void => {
    m.setClock(m.at(sec));
    m.audit.record({ initiator: { kind: "system", id: "orchestrator" }, action, decision: "n/a", result, details });
  };
  // P implement: 5 başarılı adım, her biri 4 sn.
  for (let i = 0; i < 5; i++) {
    ev(10 * i, "workflow.step.started", "running", { workflowId: "wf1", step: i, role: "implement", providerId: "p", attempt: 1 });
    ev(10 * i + 4, "workflow.step.succeeded", "ok", { workflowId: "wf1", step: i, role: "implement", providerId: "p" });
  }
  // Q plan: ilk adım yeniden deneme + tükenme (tek başarısız sayılır), ikinci adım başarılı.
  ev(100, "workflow.step.started", "running", { workflowId: "wf2", step: 0, role: "plan", providerId: "q", attempt: 1 });
  ev(101, "workflow.step.retry", "timeout", { workflowId: "wf2", step: 0, providerId: "q", attempt: 1 });
  ev(102, "workflow.step.failed", "timeout", { workflowId: "wf2", step: 0, role: "plan", message: "gizli sk-abcdefghijklmnopqrstuvwxyz0123" });
  ev(110, "workflow.step.started", "running", { workflowId: "wf2", step: 1, role: "plan", providerId: "q", attempt: 1 });
  ev(111, "workflow.step.succeeded", "ok", { workflowId: "wf2", step: 1, role: "plan", providerId: "q" });
  // Sağlayıcısız yerel doğrulama adımı.
  ev(120, "workflow.step.started", "running", { workflowId: "wf3", step: 3, role: "verify" });
  ev(121, "workflow.step.succeeded", "ok", { workflowId: "wf3", step: 3, role: "verify" });
  // Tek koşu: bir başarısız, bir reddedilen.
  ev(130, "run.started", "attempt A1", { taskId: "t1", providerId: "p" });
  ev(137, "run.finished", "failed", { taskId: "t1", attemptId: "A1", errorCode: "timeout" });
  ev(140, "run.refused:capability", "capability_unsupported", { taskId: "t1", providerId: "p", operation: "execute" });
  // Hata türü bir sır gibi görünürse maskelenir / "diğer" olur.
  ev(150, "workflow.step.started", "running", { workflowId: "wf4", step: 0, role: "review", providerId: "q", attempt: 1 });
  ev(151, "workflow.step.failed", "sk-abcdefghijklmnopqrstuvwxyz0123", { workflowId: "wf4", step: 0, role: "review" });
  return m;
}

test("rows per provider x role: counts, hand-computed rate and duration when the sample is enough", () => {
  const m = seed();
  const set = collectObservations(m.db);
  assert.equal(set.truncated, false);
  assert.equal(set.unattributed, 1);
  const r = buildExpertise(set);
  const find = (p: string, role: string) => r.rows.find((x) => x.provider === p && x.role === role);
  const pi = find("p", "implement");
  assert.deepEqual([pi?.attempts, pi?.succeeded, pi?.failed, pi?.status], [5, 5, 0, "yeterli"]);
  assert.equal(pi?.successRate, 1);
  assert.equal(pi?.avgDurationMs, 4000);
  assert.deepEqual(pi?.lastErrorKinds, []);
  assert.equal(r.minSample, MIN_SAMPLE);
  assert.equal(r.unattributedSteps, 1, "the provider-less verify step is not credited to any provider");
});

test("insufficient data: counts shown, rate and duration are null", () => {
  const r = buildExpertise(collectObservations(seed().db));
  const qp = r.rows.find((x) => x.provider === "q" && x.role === "plan");
  assert.deepEqual([qp?.attempts, qp?.succeeded, qp?.failed], [2, 1, 1], "retry then failed counts once");
  assert.equal(qp?.status, "yetersiz veri");
  assert.equal(qp?.successRate, null);
  assert.equal(qp?.avgDurationMs, null);
  assert.deepEqual(qp?.lastErrorKinds, ["timeout"]);
  const pt = r.rows.find((x) => x.provider === "p" && x.role === "tekil");
  assert.deepEqual([pt?.attempts, pt?.failed, pt?.successRate, pt?.lastErrorKinds], [1, 1, null, ["timeout"]]);
  assert.ok(!r.rows.some((x) => x.role === "verify"), "no provider-less rows");
});

test("refusals are counted separately and are not attempts; secret-looking error kinds never leak", () => {
  const r = buildExpertise(collectObservations(seed().db));
  assert.deepEqual(r.refusals, [{ provider: "p", kind: "capability", count: 1 }]);
  const qr = r.rows.find((x) => x.provider === "q" && x.role === "review");
  assert.deepEqual(qr?.lastErrorKinds, ["diğer"]);
  assert.doesNotMatch(JSON.stringify(r), /sk-abcdef/);
});

test("roleObservations feeds the broker; the audit row limit truncates honestly", () => {
  const m = seed();
  const rep = buildExpertise(collectObservations(m.db));
  assert.deepEqual(roleObservations(rep, "implement").get("p"), { attempts: 5, successRate: 1 });
  assert.equal(roleObservations(rep, "plan").get("q")?.successRate, null);
  const cut = collectObservations(m.db, 3);
  assert.equal(cut.truncated, true);
  assert.equal(cut.rowsScanned, 3);
});

test("delivery results are only a status distribution (no provider attribution); empty database is honest", () => {
  const m = seed();
  m.db.prepare("INSERT INTO tasks (id, title, state, requested_action, request_json, decision, created_at, updated_at) VALUES ('t1','x','approved','file.read','{}','allow',?,?)").run(m.at(0), m.at(0));
  const ins = m.db.prepare("INSERT INTO verification_runs (id, task_id, workflow_id, round, provider, status, result_json, created_at) VALUES (?, 't1', NULL, 1, 'api', ?, '{}', ?)");
  ins.run("v1", "passed", m.at(1));
  ins.run("v2", "passed", m.at(2));
  ins.run("v3", "failed", m.at(3));
  const d = collectDeliveries(m.db);
  assert.equal(d.total, 3);
  assert.deepEqual(d.byStatus, [{ status: "passed", count: 2 }, { status: "failed", count: 1 }]);
  assert.equal(d.latestAt, m.at(3));
  const empty = memoryAudit();
  const r = expertiseReport(empty.db);
  assert.deepEqual(r.rows, []);
  assert.equal(r.deliveries?.total, 0);
  assert.equal(r.scan.truncated, false);
});
