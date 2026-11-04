import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { mkTmp } from "../testing/tmp.ts";
import { auditDelivery } from "./auditor.ts";
import { auditEvidence } from "./completeness.ts";
import { saveEvidence } from "./evidence-files.ts";
import { HARD_MAX_REPAIR_ROUNDS, RepairCoordinator } from "./repair.ts";
import { VERIFY_SCHEMA_VERSION, totalsOf } from "./schema.ts";
import type { Classification, RunResult, TestResult } from "./schema.ts";
import { MAX_CRITERIA_PER_TEST, traceCriteria } from "./trace.ts";

const CRITERIA = [{ id: "c1", text: "greeting exists" }, { id: "c2", text: "nothing else changes" }];
const APPROVE = { approved: true, criteria: [{ id: "c1", met: true }, { id: "c2", met: true }] };
let seq = 0;

function test1(name: string, outcome: TestResult["outcome"], criteria: string[], classification: Classification | null = null, refs: string[] = []): TestResult {
  return {
    id: `${name}-${++seq}`,
    suite: null,
    name,
    outcome,
    durationMs: 1,
    error: outcome === "failed" || outcome === "error" ? { message: `${name} failed` } : null,
    criteria,
    classification,
    evidenceRefs: refs,
    attempts: 1,
  };
}

// Builds a result backed by a real evidence file, as the providers do.
function runOf(tests: (logId: string) => TestResult[], over: Partial<RunResult> = {}): RunResult {
  const dir = mkTmp("agentmom-dv-");
  const log = saveEvidence(dir, `log-${++seq}`, "log", "run log", "some output\n", "log");
  const list = tests(log.id);
  const status = list.some((t) => t.outcome === "error") ? "error" : list.some((t) => t.outcome === "failed") ? "failed" : "passed";
  return {
    schemaVersion: VERIFY_SCHEMA_VERSION,
    runId: `run-${++seq}-0000`,
    provider: "local-tests",
    startedAt: "2026-10-21T00:00:00.000Z",
    endedAt: "2026-10-21T00:00:01.000Z",
    durationMs: 1000,
    status,
    tests: list,
    evidence: [log],
    totals: totalsOf(list),
    environment: { node: "v24", platform: "win32" },
    providerData: {},
    ...over,
  };
}

const greenRun = () => runOf(() => [test1("[ac:c1] greeting", "passed", ["c1"]), test1("[ac:c2] scope", "passed", ["c2"])]);

// ---------- traceability ----------

test("traceability: criteria map to the tests that cover them and reach verified only through passing mapped tests", () => {
  const t = traceCriteria(CRITERIA, [greenRun()]);
  assert.deepEqual(t.criteria.map((c) => [c.id, c.status, c.weak]), [["c1", "verified", false], ["c2", "verified", false]]);
  assert.equal(t.criteria[0]!.tests.length, 1);
});

test("traceability: a green run with NO mapping to a criterion leaves it unverified and weak (weak-test warning)", () => {
  const run = runOf(() => [test1("[ac:c1] greeting", "passed", ["c1"]), test1("some unrelated test", "passed", [])]);
  const t = traceCriteria(CRITERIA, [run]);
  assert.equal(run.status, "passed");
  assert.equal(t.criteria[1]!.status, "unverified");
  assert.equal(t.criteria[1]!.weak, true);
  assert.match(t.criteria[1]!.reason, /passing run proves nothing/);
});

test("traceability: failure kinds map to failed / error / flaky; all-skipped is unverified; typos are reported", () => {
  const mk = (cls: Classification | null, outcome: TestResult["outcome"]) => traceCriteria([CRITERIA[0]!], [runOf(() => [test1("x", outcome, ["c1"], cls)])]).criteria[0]!.status;
  assert.equal(mk("product_defect", "failed"), "failed");
  assert.equal(mk("environment", "error"), "error");
  assert.equal(mk("infra", "error"), "error");
  assert.equal(mk("flaky", "failed"), "flaky");
  assert.equal(mk(null, "skipped"), "unverified");
  const typo = traceCriteria(CRITERIA, [runOf(() => [test1("[ac:c9] typo", "passed", ["c9"])])]);
  assert.deepEqual(typo.unknownReferences.map((u) => u.criterion), ["c9"]);
  assert.equal(typo.criteria[0]!.status, "unverified");
});

// ---------- evidence completeness ----------

test("completeness: intact evidence is complete; tampered, missing, inconsistent and empty runs are not", () => {
  assert.equal(auditEvidence([greenRun()]).complete, true);
  assert.match(auditEvidence([]).problems[0]!, /no verification run/);
  const tampered = greenRun();
  writeFileSync(tampered.evidence[0]!.path!, "something else entirely\n");
  assert.match(auditEvidence([tampered]).problems.join(" "), /size changed|hash mismatch/);
  const noEvidence = runOf((log) => [test1("bad", "failed", ["c1"], "product_defect", [])]);
  assert.match(auditEvidence([noEvidence]).problems.join(" "), /has no evidence/);
  const lying = runOf(() => [test1("bad", "failed", ["c1"], "product_defect", [])], { status: "passed" });
  assert.match(auditEvidence([lying]).problems.join(" "), /status is passed but a test failed/);
  const badTotals = { ...greenRun(), totals: { passed: 9, failed: 0, skipped: 0, error: 0 } };
  assert.match(auditEvidence([badTotals]).problems.join(" "), /totals do not match/);
  const noLog = { ...greenRun(), evidence: [] };
  assert.match(auditEvidence([noLog]).problems.join(" "), /no log evidence/);
  assert.match(auditEvidence([greenRun()], ["browser"]).problems.join(" "), /expected provider browser/);
  assert.match(auditEvidence([{ nonsense: true }]).problems.join(" "), /run 0/);
  const noShots = runOf(() => [test1("shot", "passed", ["c1"])], { provider: "browser" });
  assert.match(auditEvidence([noShots]).problems.join(" "), /without any screenshot/);
});

// ---------- independent delivery auditor ----------

test("auditor: passed only when every criterion is verified, evidence is intact and the reviewer approved", () => {
  const r = auditDelivery({ criteria: CRITERIA, runs: [greenRun()], review: APPROVE });
  assert.equal(r.verdict, "passed", r.reasons.join("; "));
  assert.equal(r.firstFailure, null);
  assert.equal(r.completeness.complete, true);
});

test("auditor: a green run with unmapped criteria is UNVERIFIED, not passed (weak test warning)", () => {
  const run = runOf(() => [test1("[ac:c1] greeting", "passed", ["c1"]), test1("generic smoke", "passed", [])]);
  const r = auditDelivery({ criteria: CRITERIA, runs: [run], review: APPROVE });
  assert.equal(r.verdict, "unverified");
  assert.match(r.reasons.join(" "), /criterion c2 is not verified/);
  assert.equal(r.criteria[1]!.weak, true);
});

test("auditor: a product defect fails the delivery and becomes the first failure", () => {
  const run = runOf((log) => [test1("[ac:c1] greeting", "passed", ["c1"]), test1("[ac:c2] scope", "failed", ["c2"], "product_defect", [log])]);
  const r = auditDelivery({ criteria: CRITERIA, runs: [run], review: APPROVE });
  assert.equal(r.verdict, "failed");
  assert.equal(r.firstFailure?.source, "test");
  assert.deepEqual(r.firstFailure?.criteria, ["c2"]);
});

test("auditor: environment, infra and flaky problems make it unverified, never failed and never repaired", () => {
  for (const cls of ["environment", "infra", "flaky"] as const) {
    const run = runOf((log) => [test1("[ac:c1] greeting", "passed", ["c1"]), test1("[ac:c2] scope", cls === "flaky" ? "failed" : "error", ["c2"], cls, [log])]);
    const r = auditDelivery({ criteria: CRITERIA, runs: [run], review: APPROVE });
    assert.equal(r.verdict, "unverified", cls);
    assert.equal(r.firstFailure, null, cls);
    assert.equal(new RepairCoordinator().decide(r, 0).action, "stop", cls);
  }
});

test("auditor: reviewer rejection fails the delivery; a missing review or missing rating leaves it unverified", () => {
  const rejected = auditDelivery({ criteria: CRITERIA, runs: [greenRun()], review: { approved: false, criteria: [{ id: "c1", met: true }, { id: "c2", met: false, note: "touches b/" }] } });
  assert.equal(rejected.verdict, "failed");
  assert.equal(rejected.firstFailure?.source, "review");
  assert.match(rejected.firstFailure?.message ?? "", /not met/);
  assert.equal(auditDelivery({ criteria: CRITERIA, runs: [greenRun()], review: null }).verdict, "unverified");
  assert.equal(auditDelivery({ criteria: CRITERIA, runs: [greenRun()], review: { approved: true, criteria: [{ id: "c1", met: true }] } }).verdict, "unverified");
  assert.equal(auditDelivery({ criteria: CRITERIA, runs: [greenRun()], review: null, requireReview: false }).verdict, "passed");
});

test("auditor: tampered evidence turns a passing run into unverified; it trusts files, not claims", () => {
  const run = greenRun();
  writeFileSync(run.evidence[0]!.path!, "edited after the fact\n");
  const r = auditDelivery({ criteria: CRITERIA, runs: [run], review: APPROVE });
  assert.equal(r.verdict, "unverified");
  assert.match(r.reasons.join(" "), /evidence:/);
  assert.equal(auditDelivery({ criteria: CRITERIA, runs: [], review: APPROVE }).verdict, "unverified");
});

test("auditor: the report never contains secrets from test messages", () => {
  const fake = "sk-" + "Rr1Ss2Tt3Uu4Vv5Ww6Xx7Yy8";
  const run = runOf((log) => [test1("[ac:c1] greeting", "passed", ["c1"]), { ...test1("[ac:c2] scope", "failed", ["c2"], "product_defect", [log]), error: { message: `leaked ${fake}` } }]);
  const r = auditDelivery({ criteria: CRITERIA, runs: [run], review: APPROVE });
  assert.ok(!JSON.stringify(r).includes(fake));
});

// ---------- the single repair coordinator ----------

test("repair coordinator: sends only the first product defect back, within a bounded number of rounds", () => {
  const run = runOf((log) => [
    test1("[ac:c1] first failure", "failed", ["c1"], "product_defect", [log]),
    test1("[ac:c2] second failure", "failed", ["c2"], "product_defect", [log]),
  ]);
  const report = auditDelivery({ criteria: CRITERIA, runs: [run], review: APPROVE });
  const rc = new RepairCoordinator(2);
  const d1 = rc.decide(report, 0);
  assert.equal(d1.action, "send_back");
  if (d1.action === "send_back") {
    assert.equal(d1.feedback.round, 1);
    assert.deepEqual(d1.feedback.criteria, ["c1"], "only the FIRST failure");
    assert.match(d1.feedback.name, /first failure/);
  }
  assert.equal(rc.decide(report, 1).action, "send_back");
  const last = rc.decide(report, 2);
  assert.equal(last.action, "stop");
  assert.match(last.reason, /budget exhausted/);
});

test("repair coordinator: never repairs a passed or unverified delivery, and the round budget has a hard cap", () => {
  const rc = new RepairCoordinator(99);
  assert.equal(rc.maxRounds, HARD_MAX_REPAIR_ROUNDS);
  assert.equal(rc.decide(auditDelivery({ criteria: CRITERIA, runs: [greenRun()], review: APPROVE }), 0).action, "stop");
  assert.equal(rc.decide(auditDelivery({ criteria: CRITERIA, runs: [], review: null }), 0).action, "stop");
  assert.equal(new RepairCoordinator(0).decide(auditDelivery({ criteria: CRITERIA, runs: [runOf((log) => [test1("[ac:c1] x", "failed", ["c1"], "product_defect", [log])])], review: APPROVE }), 0).action, "stop");
  assert.throws(() => new RepairCoordinator(-1));
});

test("tag-stuffing: one test that claims many criteria verifies none of them and is reported", () => {
  const ids = Array.from({ length: MAX_CRITERIA_PER_TEST + 1 }, (_v, i) => `k${i}`);
  const criteria = ids.map((id) => ({ id, text: id }));
  const run = runOf(() => [test1("assert true", "passed", ids)]);
  const t = traceCriteria(criteria, [run]);
  assert.ok(t.criteria.every((c) => c.status === "unverified" && c.weak));
  assert.equal(t.stuffedTests.length, 1);
  const r = auditDelivery({ criteria, runs: [run], review: { approved: true, criteria: ids.map((id) => ({ id, met: true })) } });
  assert.equal(r.verdict, "unverified");
  assert.match(r.reasons.join(" "), /more than the allowed number of criteria/);
});

test("self-authored tests: warned about by default, and rejected as proof when the plan requires trusted tests", () => {
  const warn = auditDelivery({ criteria: CRITERIA, runs: [greenRun()], review: APPROVE, selfAuthoredTests: ["src/a/x.test.mjs"] });
  assert.equal(warn.verdict, "passed");
  assert.match(warn.warnings.join(" "), /written or changed by the implementer/);
  const strict = auditDelivery({ criteria: CRITERIA, runs: [greenRun()], review: APPROVE, selfAuthoredTests: ["src/a/x.test.mjs"], requireTrustedTests: true });
  assert.equal(strict.verdict, "unverified");
  assert.match(strict.reasons.join(" "), /do not count as proof/);
  assert.equal(auditDelivery({ criteria: CRITERIA, runs: [greenRun()], review: APPROVE }).warnings.length, 0);
});
