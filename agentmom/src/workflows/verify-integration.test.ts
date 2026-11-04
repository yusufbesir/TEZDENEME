import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { ScriptedAdapter } from "../testing/scripted-adapter.ts";
import type { ScriptCall, ScriptStep } from "../testing/scripted-adapter.ts";
import { AuditLog, MemoryAuditSink, SqliteAuditSink } from "../core/audit/audit.ts";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import type { AutonomyContract } from "../core/policy/types.ts";
import { TaskStore } from "../core/tasks/tasks.ts";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { approveBaseline, baselineDirFor } from "../verify/baselines.ts";
import { BrowserProvider } from "../verify/browser.ts";
import { checkEvidenceFile } from "../verify/evidence-files.ts";
import { verifyReplayBundle } from "../verify/labs/replay.ts";
import { LocalTestProvider } from "../verify/local-tests.ts";
import { RepairCoordinator } from "../verify/repair.ts";
import { WorkflowEngine } from "./engine.ts";
import { WorkflowStore } from "./store.ts";
import { ValidationError, validateContract, validateVerification } from "./types.ts";
import type { TaskContract, WorkflowDefinition } from "./types.ts";

const HAVE_EDGE = existsSync("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe");
const APPROVE_BOTH = JSON.stringify({ approved: true, criteria: [{ id: "c1", met: true }, { id: "c2", met: true }] });

const GOOD_IMPL = 'export const greet = (name = "world") => "Hello, " + name + "!";\n';
const BUGGY_IMPL = 'export const greet = (name = "world") => "Helo, " + name + "!";\n';
const HEAD = 'import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { greet } from "./greeting.mjs";\n';
const TESTS_BOTH = `${HEAD}test("[ac:c1] greets by name", () => assert.equal(greet("Ada"), "Hello, Ada!"));\ntest("[ac:c2] greets the world by default", () => assert.equal(greet(), "Hello, world!"));\n`;
const TESTS_ONLY_C1 = `${HEAD}test("[ac:c1] greets by name", () => assert.equal(greet("Ada"), "Hello, Ada!"));\ntest("generic smoke test", () => assert.ok(greet()));\n`;

const CONTRACT: TaskContract = {
  goal: "Add a greeting function",
  acceptance: [{ id: "c1", text: "greet(name) says Hello, name!" }, { id: "c2", text: "greet() greets the world" }],
  writeScopes: ["src/a"],
  constraints: [],
  verification: { localTests: { files: ["src/a/greeting.test.mjs"] }, timeoutMs: 60_000 },
};

const DEF: WorkflowDefinition = {
  steps: [
    { role: "plan", providerId: "planner" },
    { role: "implement", providerId: "coder" },
    { role: "review", providerId: "critic" },
    { role: "verify" },
  ],
};

function files(impl: string, tests: string): ScriptStep {
  return { summary: "implemented", write: { "src/a/greeting.mjs": impl, "src/a/greeting.test.mjs": tests } };
}

function env(coder: (c: ScriptCall) => ScriptStep, opts: { critic?: (c: ScriptCall) => ScriptStep; rounds?: number | null; shell?: boolean } = {}) {
  const planner = new ScriptedAdapter("planner", () => ({ summary: "1. write src/a/greeting.mjs and tests" }));
  const coderAd = new ScriptedAdapter("coder", coder);
  const critic = new ScriptedAdapter("critic", opts.critic ?? (() => ({ summary: APPROVE_BOTH })));
  const base = mkTmp("agentmom-vi-");
  const db = openDb(join(base, "t.db"));
  migrate(db);
  const mem = new MemoryAuditSink();
  const audit = new AuditLog([new SqliteAuditSink(db), mem]);
  const registry = new ProviderRegistry(db);
  for (const a of [planner, coderAd, critic]) registry.register(a);
  const tasks = new TaskStore(db);
  const store = new WorkflowStore(db);
  const evidence = new EvidenceStore(db);
  const worktreeRoot = join(base, "worktrees");
  mkdirSync(worktreeRoot, { recursive: true });
  const contract: AutonomyContract = {
    id: "c",
    allowedActions: ["task.create", "file.read", "file.write", "provider.call", "provider.switch", ...(opts.shell === false ? [] : (["verification.run"] as const))],
    allowedDirs: [base],
    allowedProviders: ["planner", "coder", "critic"],
    trustedRepos: [],
    budget: { maxUsd: 5, spentUsd: 0 },
    expiresAt: "2099-01-01T00:00:00Z",
    maxRuntimeMs: 120_000,
    approvalRequiredActions: [],
    paidRoute: "none",
  };
  const engine = new WorkflowEngine({
    tasks,
    audit,
    registry,
    evidence,
    store,
    contract,
    worktreeRoot,
    retryDelayMs: 0,
    verify: { local: new LocalTestProvider(), browser: new BrowserProvider(), evidenceRoot: join(base, "verification") },
    ...(opts.rounds === null ? {} : { repair: new RepairCoordinator(opts.rounds ?? 2) }),
  });
  return { planner, coder: coderAd, critic, base, db, mem, tasks, store, evidence, engine };
}

function repo(base: string): string {
  const dir = mkdtempSync(join(base, "repo-"));
  const git = (...a: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...a], { cwd: dir, stdio: "pipe" });
  git("init", "-q");
  mkdirSync(join(dir, "src", "a"), { recursive: true });
  writeFileSync(join(dir, "src", "a", "keep.txt"), "x\n");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
  return dir;
}

function start(e: ReturnType<typeof env>, contract: TaskContract = CONTRACT) {
  const task = e.tasks.create({ title: "wf", requestedAction: "file.read", request: { action: "file.read" }, decision: "allow" });
  e.tasks.transition(task.id, "approved", { kind: "user", id: "yusuf" });
  e.store.setContract(task.id, contract);
  const wid = e.store.create(task.id, repo(e.base), DEF);
  return { taskId: task.id, wid };
}

const delivery = (e: ReturnType<typeof env>, taskId: string) => {
  const rows = e.evidence.list(taskId).filter((x) => x.kind === "delivery");
  return rows[rows.length - 1]?.data as { verdict: string; reasons: string[]; criteria: Array<{ id: string; status: string; weak: boolean }>; firstFailure: { name: string } | null } | undefined;
};

test("verification plan validation: files, scenario, timeout and unknown keys", () => {
  const ok = validateVerification({ localTests: { files: ["src/a/x.test.mjs"], retryFailures: true }, timeoutMs: 5000 });
  assert.deepEqual(ok.localTests, { files: ["src/a/x.test.mjs"], retryFailures: true });
  const bad = (v: unknown) => assert.throws(() => validateVerification(v), ValidationError);
  bad({});
  bad({ localTests: { files: [] } });
  bad({ localTests: { files: ["../x.test.mjs"] } });
  bad({ localTests: { files: ["src/not-a-test.mjs"] } });
  bad({ localTests: { files: ["src/a.test.mjs"] }, timeoutMs: 5 });
  bad({ browser: { siteDir: "../site", steps: [{ kind: "goto", path: "/" }] } });
  bad({ browser: { siteDir: "site", steps: [{ kind: "eval", code: "1" }] } });
  bad({ localTests: { files: ["a.test.mjs"] }, extra: 1 });
  assert.equal(validateContract({ goal: "g", acceptance: [{ id: "a", text: "t" }], verification: { localTests: { files: ["a.test.mjs"] } } }).verification?.timeoutMs, 120_000);
});

test("end to end: real tests mapped to criteria, intact evidence, independent audit -> delivery PASSED", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_BOTH));
  const { taskId, wid } = start(e);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  const d = delivery(e, taskId)!;
  assert.equal(d.verdict, "passed", d.reasons.join("; "));
  assert.deepEqual(d.criteria.map((c) => [c.id, c.status]), [["c1", "verified"], ["c2", "verified"]]);
  const runs = e.store.verificationRuns(wid);
  assert.equal(runs.length, 1);
  assert.equal(runs[0]!.provider, "local-tests");
  assert.equal(runs[0]!.status, "passed");
  for (const ev of runs[0]!.evidence) assert.equal(checkEvidenceFile(ev), null);
  assert.ok(e.evidence.list(taskId).some((x) => x.kind === "verification:run"));
  assert.equal(e.tasks.require(taskId).state, "succeeded");
});

test("weak tests: everything is green but criterion c2 has no mapped test -> UNVERIFIED, the workflow does not succeed and is not 'repaired'", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_ONLY_C1));
  const { taskId, wid } = start(e);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /delivery_unverified/);
  assert.equal(e.store.verificationRuns(wid)[0]!.status, "passed", "the run itself was green");
  const d = delivery(e, taskId)!;
  assert.equal(d.verdict, "unverified");
  assert.deepEqual(d.criteria.map((c) => [c.id, c.status, c.weak]), [["c1", "verified", false], ["c2", "unverified", true]]);
  assert.equal(e.coder.calls.length, 1, "an unverified delivery is not sent back for code repair");
  assert.equal(e.store.get(wid)!.workflow.repairRound, 0);
});

test("repair loop: the FIRST product defect goes back to implement, planning is not repeated, and the second round passes", async () => {
  let n = 0;
  const e = env(() => (++n === 1 ? files(BUGGY_IMPL, TESTS_BOTH) : files(GOOD_IMPL, TESTS_BOTH)));
  const { taskId, wid } = start(e);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  assert.equal(e.coder.calls.length, 2);
  assert.equal(e.planner.calls.length, 1, "plan is not redone");
  assert.equal(e.critic.calls.length, 2, "the implementation changed, so it is reviewed again");
  assert.match(e.coder.calls[1]!.prompt, /REPAIR ROUND 1/);
  assert.match(e.coder.calls[1]!.prompt, /"repairFeedback"/);
  assert.match(e.coder.calls[1]!.prompt, /greets by name/, "the failing test is named in the feedback");
  assert.doesNotMatch(e.coder.calls[0]!.prompt, /REPAIR ROUND/);
  assert.equal(e.store.get(wid)!.workflow.repairRound, 1);
  assert.equal(e.evidence.list(taskId).filter((x) => x.kind === "repair").length, 1);
  assert.equal(delivery(e, taskId)!.verdict, "passed", "the latest delivery report is the passing one");
  assert.equal(e.store.verificationRuns(wid).length, 2, "both rounds kept their runs");
  assert.ok(e.mem.events.some((x) => x.action === "workflow.repair"));
});

test("only the first failure is sent back even when several tests fail", async () => {
  const e = env(() => files(BUGGY_IMPL, TESTS_BOTH), { rounds: 1 });
  const { wid } = start(e);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  const second = e.coder.calls[1]!.prompt;
  assert.match(second, /greets by name/);
  assert.doesNotMatch(second, /greets the world by default/, "the second failure is not part of the feedback");
});

test("repair is bounded: the budget runs out and the workflow fails with the real reason", async () => {
  const e = env(() => files(BUGGY_IMPL, TESTS_BOTH), { rounds: 1 });
  const { taskId, wid } = start(e);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /verification_failed/);
  assert.match(out.error ?? "", /budget exhausted/);
  assert.equal(e.coder.calls.length, 2, "one initial attempt + exactly one repair round");
  assert.equal(e.store.get(wid)!.workflow.repairRound, 1);
  assert.equal(delivery(e, taskId)!.verdict, "failed");
});

test("no coordinator configured: failures are reported, never silently re-run", async () => {
  const e = env(() => files(BUGGY_IMPL, TESTS_BOTH), { rounds: null });
  const { wid } = start(e);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.equal(e.coder.calls.length, 1);
});

test("environment problems are not code defects: unverified and never repaired", async () => {
  const envTest = `${HEAD}import { readFileSync } from "node:fs";\ntest("[ac:c1] greets by name", () => assert.equal(greet("Ada"), "Hello, Ada!"));\ntest("[ac:c2] needs a config file", () => { readFileSync("missing-config.json"); });\n`;
  const e = env(() => files(GOOD_IMPL, envTest));
  const { taskId, wid } = start(e);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /delivery_unverified/);
  assert.equal(e.coder.calls.length, 1);
  const run = e.store.verificationRuns(wid)[0]!;
  assert.equal(run.tests.find((t) => t.criteria.includes("c2"))!.classification, "environment");
  assert.equal(delivery(e, taskId)!.criteria.find((c) => c.id === "c2")!.status, "error");
});

test("a reviewer rejection is also repairable (first failure from the review), then the second round passes", async () => {
  let r = 0;
  const e = env(() => files(GOOD_IMPL, TESTS_BOTH), {
    critic: () => ({ summary: ++r === 1 ? JSON.stringify({ approved: false, criteria: [{ id: "c1", met: true }, { id: "c2", met: false, note: "default name untested in prod" }] }) : APPROVE_BOTH }),
  });
  const { wid } = start(e);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  assert.equal(e.coder.calls.length, 2);
  assert.match(e.coder.calls[1]!.prompt, /"source":"review"/);
});

test("a verification plan with no verification providers fails closed instead of falling back to the weak check", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_BOTH));
  const noVerify = new WorkflowEngine({ ...(e.engine as unknown as { d: ConstructorParameters<typeof WorkflowEngine>[0] }).d, verify: undefined as never });
  const { wid } = start(e);
  const out = await noVerify.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /verification_unavailable/);
});

test("requireTrustedTests: tests written by the implementer do not count; the delivery stays unverified (and is not 'repaired')", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_BOTH));
  const strict: TaskContract = { ...CONTRACT, verification: { ...CONTRACT.verification!, requireTrustedTests: true } };
  const { taskId, wid } = start(e, strict);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /delivery_unverified/);
  assert.match(delivery(e, taskId)!.reasons.join(" "), /do not count as proof/);
  assert.equal(e.coder.calls.length, 1);
});

test("the default plan still passes but the report warns that the implementer wrote the tests", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_BOTH));
  const { taskId, wid } = start(e);
  assert.equal((await e.engine.start(wid)).state, "succeeded");
  const rows = e.evidence.list(taskId).filter((x) => x.kind === "delivery");
  const d = rows[rows.length - 1]!.data as { warnings: string[]; selfAuthoredTests: string[] };
  assert.deepEqual(d.selfAuthoredTests, ["src/a/greeting.test.mjs"]);
  assert.match(d.warnings.join(" "), /written or changed by the implementer/);
});

test("running project tests needs the verification.run permission (and a shell for the agent is a different thing): without it nothing is executed", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_BOTH), { shell: false });
  const { wid } = start(e);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /verification_not_authorized/);
  assert.equal(e.store.verificationRuns(wid).length, 0, "no test process was started");
});

test("agent-written tests cannot read outside the workspace; the denial is an environment failure and the secret never reaches the evidence", async () => {
  const outsideDir = mkTmp("agentmom-outside-");
  writeFileSync(join(outsideDir, "secret.txt"), "TOP-SECRET-OUTSIDE");
  const evil = `${HEAD}import { readFileSync } from "node:fs";\ntest("[ac:c1] greets by name", () => assert.equal(greet("Ada"), "Hello, Ada!"));\ntest("[ac:c2] steals a file", () => { throw new Error("stolen: " + readFileSync(${JSON.stringify(join(outsideDir, "secret.txt"))}, "utf8")); });\n`;
  const e = env(() => files(GOOD_IMPL, evil));
  const { taskId, wid } = start(e);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.ok(!JSON.stringify(e.evidence.list(taskId)).includes("TOP-SECRET-OUTSIDE"));
  assert.equal(e.store.verificationRuns(wid)[0]!.tests.find((t) => t.criteria.includes("c2"))!.classification, "environment");
});

test("browser verification inside a workflow: real Edge, criteria-tagged checks, screenshot evidence, delivery passed", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const page = '<!doctype html><meta charset="utf-8"><h1 id="t">Hello, world!</h1><button id="b" onclick="document.getElementById(\'o\').textContent=\'Hello, Ada!\'">go</button><p id="o"></p>';
  const contract: TaskContract = {
    ...CONTRACT,
    verification: {
      browser: {
        siteDir: "src/a/site",
        steps: [
          { kind: "goto", path: "/index.html" },
          { kind: "expectText", selector: "#t", text: "Hello, world!", name: "default greeting", criteria: ["c2"] },
          { kind: "click", selector: "#b" },
          { kind: "expectText", selector: "#o", text: "Hello, Ada!", name: "greets by name", criteria: ["c1"] },
          { kind: "screenshot", name: "after click" },
        ],
      },
      timeoutMs: 60_000,
    },
  };
  const e = env(() => ({ summary: "built the page", write: { "src/a/site/index.html": page } }));
  const { taskId, wid } = start(e, contract);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  const run = e.store.verificationRuns(wid)[0]!;
  assert.equal(run.provider, "browser");
  const shot = run.evidence.find((x) => x.kind === "screenshot")!;
  assert.equal(checkEvidenceFile(shot), null);
  assert.equal(delivery(e, taskId)!.verdict, "passed");
});

test("visual regression inside a workflow: no approved baseline -> criterion unverified (skipped, never passed); after the user approves the new image the same site passes", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const page = '<!doctype html><meta charset="utf-8"><title>VR</title><style>body{margin:0}#hero{width:300px;height:200px;background:#336699}</style><div id="hero"></div><h1 id="t">Hello, world!</h1>';
  const contract: TaskContract = {
    ...CONTRACT,
    verification: {
      browser: {
        siteDir: "src/a/site",
        steps: [
          { kind: "goto", path: "/index.html" },
          { kind: "expectText", selector: "#t", text: "Hello, world!", name: "default greeting", criteria: ["c2"] },
          { kind: "expectScreenshotMatch", name: "home looks as approved", baseline: "home.png", criteria: ["c1"] },
        ],
      },
      timeoutMs: 60_000,
    },
  };
  const e = env(() => ({ summary: "built the page", write: { "src/a/site/index.html": page } }));
  const { taskId, wid } = start(e, contract);
  const first = await e.engine.start(wid);
  assert.notEqual(first.state, "succeeded", "an unapproved baseline must not deliver");
  const d1 = delivery(e, taskId)!;
  assert.equal(d1.verdict, "unverified");
  assert.equal(d1.criteria.find((c) => c.id === "c1")!.status, "unverified");
  const run1 = e.store.verificationRuns(wid)[0]!;
  assert.equal(run1.tests.find((t) => t.name === "home looks as approved")!.outcome, "skipped");
  const rec = e.evidence.list(taskId).filter((x) => x.kind === "verification:run").at(-1)!.data as { baselines: Array<{ file: string; status: string; newEvidenceId: string }>; evidence: Array<{ id: string; path: string; sha256: string }> };
  assert.equal(rec.baselines[0]!.status, "missing");
  const img = rec.evidence.find((x) => x.id === rec.baselines[0]!.newEvidenceId)!;
  // Kullanıcı onayı (uç yerine doğrudan işlev): yeni görüntü onaylı depoya kopyalanır.
  const ap = approveBaseline({ evidenceRoot: join(e.base, "verification"), taskId, name: "home.png", sourcePath: img.path, expectedSha256: img.sha256 });
  // Onay ucunun düştüğü kayıt (motor onaylı özetleri buradan okur).
  e.evidence.add(taskId, null, "baseline.approve", "baseline home.png approved", { name: "home.png", sha256: ap.sha256, evidenceId: img.id });
  assert.ok(existsSync(join(baselineDirFor(join(e.base, "verification"), taskId), "home.png")));
  // Görev yeniden denenir (failed -> pending -> approved), aynı görev kimliğiyle aynı onaylı taban aranır.
  e.tasks.transition(taskId, "pending", { kind: "user", id: "yusuf" });
  e.tasks.transition(taskId, "approved", { kind: "user", id: "yusuf" });
  const wid2 = e.store.create(taskId, repo(e.base), DEF);
  const second = await e.engine.start(wid2);
  assert.equal(second.state, "succeeded", JSON.stringify(second));
  assert.equal(delivery(e, taskId)!.verdict, "passed");
  const run2 = e.store.verificationRuns(wid2)[0]!;
  assert.equal(run2.tests.find((t) => t.name === "home looks as approved")!.outcome, "passed");
  assert.equal((run2.providerData.baselines as Array<{ baselineSha256: string }>)[0]!.baselineSha256, img.sha256);
});

test("self-authored detection ignores case, separators and ./ prefixes", async () => {
  const { selfAuthored } = await import("./engine.ts");
  const back = String.raw`src\b\x.test.mjs`;
  assert.deepEqual(selfAuthored(["src/a/Greeting.test.mjs", back, "./src/c/y.test.mjs", "src/d/z.test.mjs"], ["SRC/A/greeting.test.mjs", "src/b/x.test.mjs", "src/c/y.test.mjs"]), ["src/a/Greeting.test.mjs", back, "./src/c/y.test.mjs"]);
  assert.deepEqual(selfAuthored(["src/d/z.test.mjs"], []), []);
});

// ---------- sözleşme (madde 56) ve durum (madde 57) laboratuvarları teslim kanıtı olarak ----------

const SUBJECT_OK = JSON.stringify({ items: [{ id: 1 }, { id: 2 }], total: 2 });
const SUBJECT_DUP = JSON.stringify({ items: [{ id: 1 }, { id: 1 }], total: 2 });
const subjectStep = (text: string): ScriptStep => ({ summary: "wrote the output", write: { "src/a/out.json": text } });
const CONTRACT_LIST = [
  { name: "ids are unique", kind: "invariant", rule: { op: "unique", path: "items", key: "id" }, criteria: ["c1"] },
  { name: "total is two", kind: "postcondition", rule: { op: "equals", path: "total", value: 2 }, criteria: ["c2"] },
];
const contractsContract = (subjectFile = "src/a/out.json"): TaskContract => ({ ...CONTRACT, verification: validateVerification({ contracts: { subjectFile, contracts: CONTRACT_LIST }, timeoutMs: 60_000 }) });
const GOOD_MACHINE = { initial: "start", states: ["start", "done"], final: ["done"], transitions: [{ from: "start", event: "go", to: "done" }] };
const statesContract = (machine: unknown): TaskContract => ({
  ...CONTRACT,
  verification: validateVerification({
    states: { machine, neverReach: [{ from: "done", to: "start", name: "[ac:c1] done never returns to start" }], traces: [{ name: "[ac:c2] happy path", steps: [{ event: "go", expect: "done" }], expectFinal: true }] },
    timeoutMs: 60_000,
  }),
});
const labRun = (e: ReturnType<typeof env>, wid: string, provider: string) => e.store.verificationRuns(wid).find((r) => r.provider === provider)!;
const logText = (run: { evidence: Array<{ kind: string; path?: string }> }): string => readFileSync(run.evidence.find((x) => x.kind === "log")!.path!, "utf8");

test("lab plan validation: contracts and states are validated, unknown fields and bad subject files are refused", () => {
  const ok = validateVerification({ contracts: { subjectFile: "src/a/out.json", contracts: CONTRACT_LIST }, states: { machine: GOOD_MACHINE } });
  assert.equal(ok.contracts!.subjectFile, "src/a/out.json");
  assert.equal(ok.contracts!.contracts.length, 2);
  assert.equal(ok.states!.machine.initial, "start");
  assert.equal(validateVerification({ states: { machine: GOOD_MACHINE } }).timeoutMs, 120_000, "states alone is a valid plan");
  const bad = (v: unknown) => assert.throws(() => validateVerification(v), ValidationError);
  bad({ timeoutMs: 5000 });
  const c = (subjectFile: unknown, contracts: unknown = CONTRACT_LIST) => ({ contracts: { subjectFile, contracts } });
  for (const f of ["../out.json", "src/../../out.json", "/abs/out.json", "C:/out.json", "C:\\out.json", "src\\out.json", "src/a/out.txt", "src/a/out", "", 7, `${"a/".repeat(150)}x.json`, "src//out.json", "./out.json", "src/./out.json", "out\n.json"]) bad(c(f));
  bad({ contracts: { subjectFile: "a.json", contracts: CONTRACT_LIST, extra: 1 } });
  bad(c("a.json", []));
  bad(c("a.json", [{ name: "x", kind: "invariant", rule: { op: "matches", path: "a", value: "x" } }]));
  bad(c("a.json", [{ name: "x", kind: "invariant", rule: { op: "exists", path: "a" }, extra: 1 }]));
  bad({ states: { machine: { initial: "a", states: [], transitions: [] } } });
  bad({ states: { machine: GOOD_MACHINE, extra: 1 } });
  bad({ states: 5 });
  bad({ contracts: 5 });
});

test("contracts as delivery proof: holding invariants -> delivery PASSED with a LOG evidence file per lab run", async () => {
  const e = env(() => subjectStep(SUBJECT_OK), { rounds: null });
  const { taskId, wid } = start(e, contractsContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  const d = delivery(e, taskId)!;
  assert.equal(d.verdict, "passed", d.reasons.join("; "));
  assert.deepEqual(d.criteria.map((c) => [c.id, c.status]), [["c1", "verified"], ["c2", "verified"]]);
  const run = labRun(e, wid, "contracts-lab");
  assert.equal(run.status, "passed");
  assert.equal(e.store.verificationRuns(wid).length, 1);
  const log = run.evidence.find((x) => x.kind === "log")!;
  assert.equal(checkEvidenceFile(log), null);
  assert.match(logText(run), /\[passed\] invariant \/ ids are unique/);
});

test("contracts as delivery proof: a violated invariant -> delivery FAILED and the violation message is in the evidence", async () => {
  const e = env(() => subjectStep(SUBJECT_DUP), { rounds: null });
  const { taskId, wid } = start(e, contractsContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /verification_failed/);
  assert.equal(delivery(e, taskId)!.verdict, "failed");
  const run = labRun(e, wid, "contracts-lab");
  const failing = run.tests.find((t) => t.outcome === "failed")!;
  assert.equal(failing.classification, "product_defect");
  assert.ok(failing.evidenceRefs.length === 1 && run.evidence.some((x) => x.id === failing.evidenceRefs[0]), "the failing test points at the log evidence");
  assert.match(logText(run), /has a duplicate/);
  assert.match(failing.error!.detail ?? "", /duplicate/);
});

test("contracts as delivery proof: the first violation goes back for repair and the corrected output passes", async () => {
  let n = 0;
  const e = env(() => subjectStep(++n === 1 ? SUBJECT_DUP : SUBJECT_OK));
  const { taskId, wid } = start(e, contractsContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  assert.equal(e.coder.calls.length, 2);
  assert.match(e.coder.calls[1]!.prompt, /ids are unique/);
  assert.equal(delivery(e, taskId)!.verdict, "passed");
});

test("state lab as delivery proof: a sound machine passes; a machine that breaks a neverReach rule fails", async () => {
  const good = env(() => files(GOOD_IMPL, TESTS_BOTH), { rounds: null });
  const g = start(good, statesContract(GOOD_MACHINE));
  assert.equal((await good.engine.start(g.wid)).state, "succeeded");
  assert.equal(delivery(good, g.taskId)!.verdict, "passed");
  assert.equal(labRun(good, g.wid, "state-lab").status, "passed");

  const broken = env(() => files(GOOD_IMPL, TESTS_BOTH), { rounds: null });
  const b = start(broken, statesContract({ ...GOOD_MACHINE, transitions: [...GOOD_MACHINE.transitions, { from: "done", event: "reset", to: "start" }] }));
  const out = await broken.engine.start(b.wid);
  assert.equal(out.state, "failed");
  assert.equal(delivery(broken, b.taskId)!.verdict, "failed");
  const run = labRun(broken, b.wid, "state-lab");
  assert.equal(run.status, "failed");
  assert.match(logText(run), /a forbidden path exists/);
  assert.match(logText(run), /done -\(reset\)-> start/);
  for (const t of run.tests.filter((x) => x.outcome === "failed")) assert.ok(t.evidenceRefs.length > 0);
});

test("contracts and states need no verification.run permission (they run no workspace code), and a contracts + states plan runs both", async () => {
  const e = env(() => subjectStep(SUBJECT_OK), { rounds: null, shell: false });
  const both: TaskContract = { ...CONTRACT, verification: validateVerification({ contracts: { subjectFile: "src/a/out.json", contracts: CONTRACT_LIST.map((x) => ({ ...x, criteria: x.criteria[0] === "c1" ? ["c1"] : ["c2"] })) }, states: { machine: GOOD_MACHINE }, timeoutMs: 60_000 }) };
  const { taskId, wid } = start(e, both);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  assert.deepEqual(e.store.verificationRuns(wid).map((r) => r.provider).sort(), ["contracts-lab", "state-lab"]);
  assert.equal(delivery(e, taskId)!.verdict, "passed");
});

test("contracts subject problems are verification errors, never a pass: missing, outside the workspace, too large, not JSON", async () => {
  const cases: Array<{ name: string; contract: TaskContract; step: ScriptStep; message: RegExp }> = [
    { name: "missing", contract: contractsContract("src/a/absent.json"), step: subjectStep(SUBJECT_OK), message: /does not exist/ },
    // Doğrulayıcıyı aşan (ör. veritabanına doğrudan yazılmış) bir plan bile çalışma ağacı dışına çıkamaz.
    { name: "outside", contract: { ...CONTRACT, verification: { timeoutMs: 60_000, contracts: { subjectFile: "../outside.json", contracts: validateVerification({ contracts: { subjectFile: "a.json", contracts: CONTRACT_LIST } }).contracts!.contracts } } }, step: subjectStep(SUBJECT_OK), message: /outside the workspace/ },
    { name: "too large", contract: contractsContract(), step: subjectStep(JSON.stringify({ items: [], total: 2, pad: "x".repeat(300 * 1024) })), message: /larger than 256 KB/ },
    { name: "not json", contract: contractsContract(), step: subjectStep("{ not json"), message: /not valid JSON/ },
  ];
  for (const c of cases) {
    const e = env(() => c.step, { rounds: null });
    const { taskId, wid } = start(e, c.contract);
    const out = await e.engine.start(wid);
    assert.equal(out.state, "failed", c.name);
    assert.match(out.error ?? "", /delivery_unverified/, c.name);
    assert.equal(e.coder.calls.length, 1, `${c.name}: an infra problem is not sent back for repair`);
    const d = delivery(e, taskId)!;
    assert.notEqual(d.verdict, "passed", c.name);
    const run = labRun(e, wid, "contracts-lab");
    assert.equal(run.status, "error", c.name);
    assert.equal(run.tests[0]!.classification, "infra", c.name);
    assert.match(run.tests[0]!.error!.message, c.message, c.name);
    assert.equal(run.tests[0]!.evidenceRefs.length, 1, `${c.name}: the failing test has log evidence`);
    assert.equal(checkEvidenceFile(run.evidence.find((x) => x.kind === "log")!), null, c.name);
  }
});

test("a planned contracts/state run that never happened leaves the delivery unverified (expected providers)", async () => {
  const { auditDelivery } = await import("../verify/auditor.ts");
  const { StateLabProvider } = await import("../verify/labs/state.ts");
  const { attachLabLog } = await import("./lab-runs.ts");
  const dir = mkTmp("agentmom-lab-ev-");
  const state = attachLabLog(await new StateLabProvider().run({ machine: GOOD_MACHINE, traces: [{ name: "[ac:c1] [ac:c2] go", steps: [{ event: "go" }] }] }).result, dir);
  const base = { criteria: CONTRACT.acceptance, review: { approved: true, criteria: [{ id: "c1", met: true }, { id: "c2", met: true }] } };
  assert.equal(auditDelivery({ ...base, runs: [state], expectedProviders: ["state-lab"] }).verdict, "passed");
  const missing = auditDelivery({ ...base, runs: [state], expectedProviders: ["state-lab", "contracts-lab"] });
  assert.equal(missing.verdict, "unverified");
  assert.match(missing.reasons.join(" "), /no run from the expected provider contracts-lab/);
  assert.equal(auditDelivery({ ...base, runs: [], expectedProviders: ["contracts-lab"] }).verdict, "unverified");
});

// ---------- erişilebilirlik laboratuvarı (madde 27), test verisi soy ağacı (madde 59), hata oynatma (madde 60) ----------

const PAGE_GOOD = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Greeting</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>Hello</h1><img src="a.png" alt="Logo"><button>Go</button></body></html>';
const PAGE_BAD = PAGE_GOOD.replace(' lang="en"', "").replace('alt="Logo"', "");
const pageStep = (html: string): ScriptStep => ({ summary: "built the page", write: { "src/a/site/index.html": html } });
const A11Y_CRITERIA = { c1: ["WCAG 3.1.1", "WCAG 2.4.2"], c2: ["WCAG 1.1.1"] };
const a11yContract = (a11y: Record<string, unknown> = {}, extra: Record<string, unknown> = {}): TaskContract => ({
  ...CONTRACT,
  verification: validateVerification({ a11y: { files: ["src/a/site/index.html"], contrastPairs: [{ name: "body text", fg: "#222222", bg: "#ffffff" }], criteria: A11Y_CRITERIA, ...a11y }, timeoutMs: 60_000, ...extra }),
});

// Başlangıç taahhüdünde verilen dosyalar bulunan bir depo (veri dosyalarının "görev değiştirmedi" durumunu sınamak için).
function startWithFiles(e: ReturnType<typeof env>, contract: TaskContract, committed: Record<string, string>) {
  const task = e.tasks.create({ title: "wf", requestedAction: "file.read", request: { action: "file.read" }, decision: "allow" });
  e.tasks.transition(task.id, "approved", { kind: "user", id: "yusuf" });
  e.store.setContract(task.id, contract);
  const dir = repo(e.base);
  const git = (...a: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...a], { cwd: dir, stdio: "pipe" });
  for (const [p, text] of Object.entries(committed)) {
    mkdirSync(join(dir, p, ".."), { recursive: true });
    writeFileSync(join(dir, p), text);
  }
  git("add", "-A");
  git("commit", "-q", "-m", "fixtures");
  return { taskId: task.id, wid: e.store.create(task.id, dir, DEF) };
}

const kindRows = (e: ReturnType<typeof env>, taskId: string, kind: string) => e.evidence.list(taskId).filter((x) => x.kind === kind);

test("plan validation for a11y and dataFiles: a11y counts as a plan, dataFiles alone does not, and bad values are refused", () => {
  const ok = validateVerification({ a11y: { files: ["site/index.html", "site/a.htm"], contrastPairs: [{ name: "n", fg: "#000000", bg: "#ffffff", large: true }], criteria: { c1: ["WCAG"] } }, dataFiles: ["fixtures/a.json", "seed.sql"] });
  assert.deepEqual(ok.a11y!.files, ["site/index.html", "site/a.htm"]);
  assert.deepEqual(ok.dataFiles, ["fixtures/a.json", "seed.sql"]);
  assert.equal(validateVerification({ a11y: { files: ["index.html"] } }).a11y!.contrastPairs.length, 0, "a11y alone is a valid plan");
  const bad = (v: unknown) => assert.throws(() => validateVerification(v), ValidationError);
  bad({ dataFiles: ["a.json"] });
  bad({ dataFiles: ["a.json"], timeoutMs: 5000 });
  bad({ states: { machine: GOOD_MACHINE }, dataFiles: [] });
  bad({ states: { machine: GOOD_MACHINE }, dataFiles: ["../a.json"] });
  bad({ states: { machine: GOOD_MACHINE }, dataFiles: ["/abs/a.json"] });
  bad({ states: { machine: GOOD_MACHINE }, dataFiles: ["C:/a.json"] });
  bad({ states: { machine: GOOD_MACHINE }, dataFiles: ["a.mjs"] });
  bad({ states: { machine: GOOD_MACHINE }, dataFiles: Array.from({ length: 51 }, (_, i) => `f${i}.json`) });
  bad({ states: { machine: GOOD_MACHINE }, dataFiles: "a.json" });
  bad({ a11y: { files: [] } });
  bad({ a11y: { files: ["index.txt"] } });
  bad({ a11y: { files: ["../index.html"] } });
  bad({ a11y: { files: ["index.html"], root: "/" } });
  bad({ a11y: { files: ["index.html"], contrastPairs: [{ name: "n", fg: "red", bg: "#ffffff" }] } });
  bad({ a11y: 5 });
});

test("a11y as delivery proof: a clean page passes, with a LOG evidence file and no replay bundle", async () => {
  const e = env(() => pageStep(PAGE_GOOD), { rounds: null, shell: false });
  const { taskId, wid } = start(e, a11yContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  const d = delivery(e, taskId)!;
  assert.equal(d.verdict, "passed", d.reasons.join("; "));
  assert.deepEqual(d.criteria.map((c) => [c.id, c.status]), [["c1", "verified"], ["c2", "verified"]]);
  const run = labRun(e, wid, "a11y-lab");
  assert.equal(run.status, "passed");
  assert.ok(run.tests.length > 17, "every check plus the contrast pair ran");
  assert.equal(checkEvidenceFile(run.evidence.find((x) => x.kind === "log")!), null);
  assert.match(logText(run), /\[passed\] a11y \/ \[WCAG 3\.1\.1\]/);
  assert.equal(kindRows(e, taskId, "replay").length, 0, "a passing delivery has no replay bundle");
  assert.equal(kindRows(e, taskId, "lineage").length, 0, "no dataFiles, no lineage");
});

test("a11y as delivery proof: a violation breaks the delivery (FAILED), points at file:line, and leaves a verifiable replay bundle", async () => {
  const e = env(() => pageStep(PAGE_BAD), { rounds: null, shell: false });
  const { taskId, wid } = start(e, a11yContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /verification_failed/);
  assert.equal(e.coder.calls.length, 1);
  assert.equal(delivery(e, taskId)!.verdict, "failed");
  const run = labRun(e, wid, "a11y-lab");
  const failing = run.tests.filter((t) => t.outcome === "failed");
  assert.deepEqual(failing.map((t) => t.id), ["wcag-3.1.1-lang", "wcag-1.1.1-img-alt"]);
  assert.ok(failing.every((t) => t.classification === "product_defect" && t.evidenceRefs.length === 1));
  assert.match(logText(run), /src\/a\/site\/index\.html:1 <html> has no lang attribute/);
  // hata oynatma paketi
  const rows = kindRows(e, taskId, "replay");
  assert.equal(rows.length, 1);
  const data = rows[0]!.data as { bundle: { runId: string; provider: string; commit?: string; files: string[]; command: { kind: string; lab?: string }; failingTests: Array<{ name: string; evidenceRefs: string[] }> }; file: { path: string; sha256: string; bytes: number } };
  assert.equal(data.bundle.provider, "a11y-lab");
  assert.equal(data.bundle.runId, run.runId);
  assert.deepEqual(data.bundle.failingTests.map((t) => t.name.slice(0, 15)), ["[WCAG 3.1.1] th", "[WCAG 1.1.1] im"]);
  assert.deepEqual(data.bundle.command.lab, "a11y");
  assert.match(data.bundle.commit ?? "", /^[0-9a-f]{40}$/);
  assert.ok(data.bundle.files.includes("src/a/site/index.html"));
  assert.deepEqual(verifyReplayBundle(data.bundle), { ok: true, problems: [] });
  assert.equal(checkEvidenceFile({ id: "replay", kind: "report", summary: "", ...data.file }), null, "the bundle file on disk is intact");
  assert.deepEqual(JSON.parse(readFileSync(data.file.path, "utf8")), JSON.parse(JSON.stringify(data.bundle)));
  assert.ok(e.mem.events.some((x) => x.action === "workflow.replay" && x.result === "written"));
});

test("a11y with no criteria mapping still cannot be ignored: a failed check fails the delivery and a broken run is never 'passed'", async () => {
  // Hiç ölçüt eşlemesi yok ve başka kanıt yok: ölçütler zaten doğrulanmamış olurdu; ihlal ise teslimi "failed" yapar (kapı).
  const noMap = { ...CONTRACT, verification: validateVerification({ a11y: { files: ["src/a/site/index.html"] }, timeoutMs: 60_000 }) };
  const bad = env(() => pageStep(PAGE_BAD), { rounds: null, shell: false });
  const b = start(bad, noMap);
  assert.equal((await bad.engine.start(b.wid)).state, "failed");
  assert.equal(delivery(bad, b.taskId)!.verdict, "failed");
  assert.match(delivery(bad, b.taskId)!.reasons[0]!, /a11y-lab: 2 accessibility check\(s\) failed/);
  // Başka bir sağlayıcı tüm ölçütleri doğruluyor, a11y dosyası ise okunamıyor: teslim "passed" OLMAZ.
  const covered: TaskContract = {
    ...CONTRACT,
    verification: validateVerification({
      contracts: { subjectFile: "src/a/out.json", contracts: CONTRACT_LIST },
      a11y: { files: ["src/a/site/missing.html"] },
      timeoutMs: 60_000,
    }),
  };
  const e = env(() => ({ summary: "wrote", write: { "src/a/out.json": SUBJECT_OK } }), { rounds: null, shell: false });
  const s = start(e, covered);
  const out = await e.engine.start(s.wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /delivery_unverified/);
  assert.equal(labRun(e, s.wid, "contracts-lab").status, "passed", "the other proof is fine");
  const run = labRun(e, s.wid, "a11y-lab");
  assert.equal(run.status, "error");
  assert.equal(run.tests[0]!.classification, "infra");
  assert.equal(delivery(e, s.taskId)!.verdict, "unverified");
  assert.match(delivery(e, s.taskId)!.reasons[0]!, /could not complete/);
  assert.equal(e.coder.calls.length, 1, "an infra problem is not sent back for repair");
});

test("a11y violation goes back for repair as the first product defect and the corrected page passes", async () => {
  let n = 0;
  const e = env(() => pageStep(++n === 1 ? PAGE_BAD : PAGE_GOOD), { shell: false });
  const { taskId, wid } = start(e, a11yContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  assert.equal(e.coder.calls.length, 2);
  assert.match(e.coder.calls[1]!.prompt, /\[WCAG 3\.1\.1\]/);
  assert.equal(delivery(e, taskId)!.verdict, "passed");
  assert.equal(kindRows(e, taskId, "replay").length, 1, "the failed first round left its replay bundle");
});

test("a11y inputs that cannot be read are infra errors that keep the delivery from passing: too large, outside the workspace, not present", async () => {
  const cases: Array<{ name: string; contract: TaskContract; step: ScriptStep; message: RegExp }> = [
    { name: "too large", contract: a11yContract(), step: pageStep(`${PAGE_GOOD}<!--${"x".repeat(310 * 1024)}-->`), message: /larger than 300 KB/ },
    { name: "missing", contract: a11yContract({ files: ["src/a/site/nope.html"] }), step: pageStep(PAGE_GOOD), message: /does not exist/ },
    // Doğrulayıcıyı aşan (ör. veritabanına doğrudan yazılmış) bir plan bile çalışma ağacı dışına çıkamaz.
    { name: "outside", contract: { ...CONTRACT, verification: { timeoutMs: 60_000, a11y: { files: ["../outside.html"], contrastPairs: [], criteria: A11Y_CRITERIA } } }, step: pageStep(PAGE_GOOD), message: /not accepted/ },
  ];
  for (const c of cases) {
    const e = env(() => c.step, { rounds: null, shell: false });
    const { taskId, wid } = start(e, c.contract);
    const out = await e.engine.start(wid);
    assert.equal(out.state, "failed", c.name);
    assert.match(out.error ?? "", /delivery_unverified/, c.name);
    assert.equal(e.coder.calls.length, 1, `${c.name}: not sent back for repair`);
    const d = delivery(e, taskId)!;
    assert.notEqual(d.verdict, "passed", c.name);
    const run = labRun(e, wid, "a11y-lab");
    assert.equal(run.status, "error", c.name);
    assert.equal(run.tests[0]!.classification, "infra", c.name);
    assert.match(run.tests[0]!.error!.message, c.message, c.name);
    assert.deepEqual(run.tests[0]!.criteria, ["c1", "c2"], `${c.name}: the mapped criteria are tainted, not silently unverified`);
    assert.equal(run.tests[0]!.evidenceRefs.length, 1, c.name);
    assert.equal(checkEvidenceFile(run.evidence.find((x) => x.kind === "log")!), null, c.name);
    assert.equal(kindRows(e, taskId, "replay").length, 0, `${c.name}: an infra error is not a product failure, so no replay bundle`);
  }
});

const USERS_V1 = '{"users":[{"id":1}]}';
const SEED = "id,name\n1,ada\n";
const lineageContract = (extra: Record<string, unknown> = {}): TaskContract => ({
  ...CONTRACT,
  verification: validateVerification({ contracts: { subjectFile: "src/a/out.json", contracts: CONTRACT_LIST }, dataFiles: ["src/a/data/users.json", "src/a/data/seed.csv"], timeoutMs: 60_000, ...extra }),
});
const committedData = { "src/a/data/users.json": USERS_V1, "src/a/data/seed.csv": SEED };

test("dataFiles: a lineage evidence file is written, linked to every run, and a fixture the task changed is flagged and reported as a warning", async () => {
  const e = env(() => ({ summary: "wrote", write: { "src/a/out.json": SUBJECT_OK, "src/a/data/users.json": '{"users":[{"id":1},{"id":2}]}' } }), { rounds: null, shell: false });
  const { taskId, wid } = startWithFiles(e, lineageContract(), committedData);
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  const run = labRun(e, wid, "contracts-lab");
  const item = run.evidence.find((x) => x.kind === "report")!;
  assert.match(item.id, /^lineage-/);
  assert.equal(checkEvidenceFile(item), null);
  const onDisk = JSON.parse(readFileSync(item.path!, "utf8")) as { schema: string; taskId: string; entries: Array<{ path: string; sha256: string; bytes: number; gitBlob?: string; modifiedByTask?: boolean }>; modified: string[] };
  assert.equal(onDisk.schema, "agentmom.lineage/1");
  assert.equal(onDisk.taskId, taskId);
  assert.deepEqual(onDisk.entries.map((x) => [x.path, x.modifiedByTask]), [["src/a/data/users.json", true], ["src/a/data/seed.csv", false]]);
  assert.ok(onDisk.entries.every((x) => x.sha256.length === 64 && x.bytes > 0));
  assert.deepEqual(onDisk.modified, ["src/a/data/users.json"]);
  assert.deepEqual((run.providerData as { lineage: unknown }).lineage, { evidenceId: item.id, files: 2, modifiedByTask: ["src/a/data/users.json"] });
  const rows = kindRows(e, taskId, "lineage");
  assert.equal(rows.length, 1);
  assert.deepEqual((rows[0]!.data as { modified: string[] }).modified, ["src/a/data/users.json"]);
  // teslim denetiminde uyarı (mevcut selfAuthoredTests mantığı): geçer, ama bağımsız kanıt değildir
  const rep = kindRows(e, taskId, "delivery").at(-1)!.data as { verdict: string; warnings: string[]; selfAuthoredTests: string[] };
  assert.equal(rep.verdict, "passed");
  assert.deepEqual(rep.selfAuthoredTests, ["src/a/data/users.json (data file)"]);
  assert.match(rep.warnings.join(" "), /written or changed by the implementer: src\/a\/data\/users\.json \(data file\)/);
});

test("dataFiles: untouched fixtures raise no warning, and requireTrustedTests makes a task-modified fixture count as untrusted proof", async () => {
  const calm = env(() => ({ summary: "wrote", write: { "src/a/out.json": SUBJECT_OK } }), { rounds: null, shell: false });
  const c = startWithFiles(calm, lineageContract(), committedData);
  assert.equal((await calm.engine.start(c.wid)).state, "succeeded");
  const rep = kindRows(calm, c.taskId, "delivery").at(-1)!.data as { warnings: string[]; selfAuthoredTests: string[] };
  assert.deepEqual(rep.selfAuthoredTests, []);
  assert.deepEqual(rep.warnings, []);
  const entries = (JSON.parse(readFileSync(labRun(calm, c.wid, "contracts-lab").evidence.find((x) => x.kind === "report")!.path!, "utf8")) as { entries: Array<{ modifiedByTask: boolean }> }).entries;
  assert.deepEqual(entries.map((x) => x.modifiedByTask), [false, false]);

  const strict = env(() => ({ summary: "wrote", write: { "src/a/out.json": SUBJECT_OK, "src/a/data/seed.csv": "id,name\n1,eve\n" } }), { rounds: null, shell: false });
  const s = startWithFiles(strict, lineageContract({ requireTrustedTests: true }), committedData);
  const out = await strict.engine.start(s.wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /delivery_unverified/);
  assert.match(delivery(strict, s.taskId)!.reasons.join(" "), /seed\.csv \(data file\).*do not count as proof/);
});

test("dataFiles that cannot be recorded (missing, too large) are an infra failure: the delivery never passes", async () => {
  const missing = env(() => ({ summary: "wrote", write: { "src/a/out.json": SUBJECT_OK } }), { rounds: null, shell: false });
  const m = startWithFiles(missing, lineageContract(), { "src/a/data/users.json": USERS_V1 });
  const out = await missing.engine.start(m.wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /verification_error/);
  assert.match(out.error ?? "", /seed\.csv \(the file does not exist/);
  assert.equal(missing.store.verificationRuns(m.wid).length, 0);
  assert.equal(kindRows(missing, m.taskId, "delivery").length, 0);

  const big = env(() => ({ summary: "wrote", write: { "src/a/out.json": SUBJECT_OK } }), { rounds: null, shell: false });
  const b = startWithFiles(big, lineageContract(), { "src/a/data/users.json": USERS_V1, "src/a/data/seed.csv": "x".repeat(9 * 1024 * 1024) });
  const bigOut = await big.engine.start(b.wid);
  assert.equal(bigOut.state, "failed");
  assert.match(bigOut.error ?? "", /verification_error.*larger than 8192 KB/);
});

test("a failed local-test delivery leaves a replay bundle whose command is node --test and whose evidence hashes verify", async () => {
  const e = env(() => files(BUGGY_IMPL, TESTS_BOTH), { rounds: null });
  const { taskId, wid } = start(e);
  assert.equal((await e.engine.start(wid)).state, "failed");
  const rows = kindRows(e, taskId, "replay");
  assert.equal(rows.length, 1);
  const bundle = (rows[0]!.data as { bundle: { provider: string; command: { kind: string; display: string }; failingTests: Array<{ name: string; evidenceRefs: string[] }>; environment: { node: string }; plan: { localTests: { files: string[] } }; files: string[] } }).bundle;
  assert.equal(bundle.provider, "local-tests");
  assert.equal(bundle.command.kind, "node-test");
  assert.equal(bundle.command.display, "node --test ./src/a/greeting.test.mjs");
  assert.ok(bundle.failingTests.some((t) => /greets by name/.test(t.name)));
  assert.equal(bundle.environment.node, process.version);
  assert.deepEqual(bundle.plan.localTests.files, ["src/a/greeting.test.mjs"]);
  assert.ok(bundle.files.includes("src/a/greeting.mjs"));
  assert.deepEqual(verifyReplayBundle(bundle), { ok: true, problems: [] });
  // ayrıca doğrulama koşusundaki gerçek kanıt dosyalarıyla eşleşir
  const run = e.store.verificationRuns(wid)[0]!;
  const bundled = (bundle as unknown as { evidence: Array<{ id: string; sha256?: string }> }).evidence;
  assert.equal(bundled.length, run.evidence.length);
  for (const ev of bundled) assert.equal(run.evidence.find((x) => x.id === ev.id)!.sha256, ev.sha256);
});

test("a rejection by the reviewer alone has nothing to replay: no bundle is written when no test failed", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_BOTH), { rounds: null, critic: () => ({ summary: JSON.stringify({ approved: false, criteria: [{ id: "c1", met: true }, { id: "c2", met: false }] }) }) });
  const { taskId, wid } = start(e);
  assert.equal((await e.engine.start(wid)).state, "failed");
  assert.equal(delivery(e, taskId)!.verdict, "failed");
  assert.equal(kindRows(e, taskId, "replay").length, 0);
});

// ---------- mutasyon testi (madde 58): testler yeşil ama bir şey yakalıyor mu? ----------

// Yalnız "boş olmayan bir şey döndü" diyen zayıf testler: greet içindeki + -> - mutantını fark etmez.
const TESTS_WEAK_BUT_GREEN = `${HEAD}test("[ac:c1] greets by name", () => assert.ok(String(greet("Ada")).length > 0));\ntest("[ac:c2] greets the world by default", () => assert.ok(String(greet()).length > 0));\n`;

const mutationContract = (mutation: Record<string, unknown> = { files: ["src/a/greeting.mjs"] }, extra: Record<string, unknown> = {}): TaskContract => ({
  ...CONTRACT,
  verification: validateVerification({ localTests: { files: ["src/a/greeting.test.mjs"] }, mutation, timeoutMs: 120_000, ...extra }),
});

test("plan validation for mutation: localTests is required, files follow the source rules, and a test file cannot be mutated", () => {
  const ok = validateVerification({ localTests: { files: ["src/a/x.test.mjs"] }, mutation: { files: ["src/a/x.mjs"], maxMutants: 10, minScore: 0.7 } });
  assert.deepEqual(ok.mutation, { files: ["src/a/x.mjs"], maxMutants: 10, minScore: 0.7 });
  const bad = (v: unknown) => assert.throws(() => validateVerification(v), ValidationError);
  const lt = { files: ["src/a/x.test.mjs"] };
  bad({ a11y: { files: ["index.html"] }, mutation: { files: ["src/a/x.mjs"] } });
  bad({ localTests: lt, mutation: { files: [] } });
  bad({ localTests: lt, mutation: { files: ["../x.mjs"] } });
  bad({ localTests: lt, mutation: { files: ["src/a/y.test.mjs"] } });
  bad({ localTests: lt, mutation: { files: ["src/a/x.test.mjs"] } });
  bad({ localTests: lt, mutation: { files: ["src/a/x.txt"] } });
  bad({ localTests: lt, mutation: { files: ["src/a/x.mjs"], maxMutants: 99 } });
  bad({ localTests: lt, mutation: { files: ["src/a/x.mjs"], minScore: 2 } });
  bad({ localTests: lt, mutation: { files: ["src/a/x.mjs"], extra: 1 } });
  bad({ localTests: lt, mutation: 5 });
});

test("mutation as delivery proof: a suite that really catches the mutants passes, the mutation run carries LOG evidence and the worktree is unchanged", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_BOTH), { rounds: null });
  const { taskId, wid } = start(e, mutationContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  const d = delivery(e, taskId)!;
  assert.equal(d.verdict, "passed", d.reasons.join("; "));
  const runs = e.store.verificationRuns(wid);
  assert.deepEqual(runs.map((r) => r.provider), ["local-tests", "mutation-lab"]);
  const run = labRun(e, wid, "mutation-lab");
  assert.equal(run.status, "passed");
  assert.equal((run.providerData as { total: number; killed: number }).total, 2);
  assert.equal((run.providerData as { killed: number }).killed, 2);
  for (const ev of run.evidence) assert.equal(checkEvidenceFile(ev), null);
  assert.match(logText(run), /mutation-lab run/);
  assert.equal(kindRows(e, taskId, "replay").length, 0);
  // Gerçek çalışma ağacındaki kaynak dosya hâlâ özgün (mutasyon yalnız kopyada).
  const wtRoot = join(e.base, "worktrees");
  const found = readdirSync(wtRoot).map((n) => join(wtRoot, n, "src", "a", "greeting.mjs")).filter((p) => existsSync(p));
  assert.equal(found.length, 1);
  assert.equal(readFileSync(found[0]!, "utf8"), GOOD_IMPL);
});

test("mutation as delivery proof: green but toothless tests -> mutants survive -> delivery FAILED, with the survivors named and a replay bundle", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_WEAK_BUT_GREEN), { rounds: null });
  const { taskId, wid } = start(e, mutationContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /verification_failed/);
  assert.equal(e.store.verificationRuns(wid).find((r) => r.provider === "local-tests")!.status, "passed", "the plain tests were green");
  const d = delivery(e, taskId)!;
  assert.equal(d.verdict, "failed");
  assert.match(d.reasons[0]!, /mutation-lab: mutation score 0\.00 \(0 of 2 mutants killed\)/);
  const run = labRun(e, wid, "mutation-lab");
  assert.equal(run.status, "failed");
  assert.equal(run.tests.filter((t) => t.outcome === "failed" && t.id !== "mutation-score").length, 2);
  assert.ok(run.tests.every((t) => t.outcome !== "failed" || (t.classification === "product_defect" && t.evidenceRefs.length > 0)));
  assert.match(logText(run), /\[survived\] src\/a\/greeting\.mjs:1 arithmetic \+ -> -/);
  const rows = kindRows(e, taskId, "replay");
  assert.equal(rows.length, 1);
  const bundle = (rows[0]!.data as { bundle: { provider: string; command: { kind: string; lab: string } } }).bundle;
  assert.equal(bundle.provider, "mutation-lab");
  assert.equal(bundle.command.lab, "mutation");
  assert.deepEqual(verifyReplayBundle(bundle as never), { ok: true, problems: [] });
});

test("mutation as delivery proof: the same toothless tests pass when minScore is 0, but the surviving mutants are warned about", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_WEAK_BUT_GREEN), { rounds: null });
  const { taskId, wid } = start(e, mutationContract({ files: ["src/a/greeting.mjs"], minScore: 0 }));
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  const rows = e.evidence.list(taskId).filter((x) => x.kind === "delivery");
  const report = rows[rows.length - 1]!.data as { verdict: string; warnings: string[] };
  assert.equal(report.verdict, "passed");
  assert.ok(report.warnings.some((w) => /mutation-lab: 2 mutant\(s\) survived/.test(w)), report.warnings.join("; "));
});

test("mutation does not run when the plain tests fail: the failure is the local-tests one and no mutation-lab run exists", async () => {
  const e = env(() => files(BUGGY_IMPL, TESTS_BOTH), { rounds: null });
  const { taskId, wid } = start(e, mutationContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.deepEqual(e.store.verificationRuns(wid).map((r) => r.provider), ["local-tests"]);
  const d = delivery(e, taskId)!;
  assert.equal(d.verdict, "failed");
  assert.doesNotMatch(d.reasons.join(" "), /expected provider mutation-lab/);
});

test("mutation with a source file that does not exist is an infra error: the delivery is UNVERIFIED, never passed", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_BOTH), { rounds: null });
  const { taskId, wid } = start(e, mutationContract({ files: ["src/a/missing.mjs"] }));
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /delivery_unverified/);
  const d = delivery(e, taskId)!;
  assert.equal(d.verdict, "unverified");
  assert.match(d.reasons.join(" "), /mutation-lab: the mutation run could not complete/);
  const run = labRun(e, wid, "mutation-lab");
  assert.equal(run.status, "error");
  assert.equal(run.tests[0]!.classification, "infra");
});

test("mutation needs the same verification.run permission as the plain tests", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_BOTH), { rounds: null, shell: false });
  const { wid } = start(e, mutationContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /verification_not_authorized/);
  assert.equal(e.store.verificationRuns(wid).length, 0);
});

test("mutation with tests the implementer wrote: the score is only a warning by default, and requireTrustedTests makes the delivery UNVERIFIED", async () => {
  const e = env(() => files(GOOD_IMPL, TESTS_BOTH), { rounds: null });
  const { taskId, wid } = start(e, mutationContract());
  assert.equal((await e.engine.start(wid)).state, "succeeded");
  const rows = e.evidence.list(taskId).filter((x) => x.kind === "delivery");
  const report = rows[rows.length - 1]!.data as { verdict: string; warnings: string[] };
  assert.equal(report.verdict, "passed");
  assert.ok(report.warnings.some((w) => /mutation-lab: the tests were written or changed by the implementer/.test(w)), report.warnings.join("; "));
  const strict = env(() => files(GOOD_IMPL, TESTS_BOTH), { rounds: null });
  const s = start(strict, mutationContract(undefined, { requireTrustedTests: true }));
  const out = await strict.engine.start(s.wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /delivery_unverified/);
  const d = delivery(strict, s.taskId)!;
  assert.equal(d.verdict, "unverified");
  const srows = strict.evidence.list(s.taskId).filter((x) => x.kind === "delivery");
  assert.ok((srows[srows.length - 1]!.data as { warnings: string[] }).warnings.some((w) => /mutation-lab: the tests were written or changed/.test(w)));
});

test("visual regression gate: a missing baseline keeps the delivery UNVERIFIED even when the screenshot step maps to no criterion and other tests cover every criterion", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const page = '<!doctype html><meta charset="utf-8"><title>VR</title><h1 id="t">Hello, world!</h1><p id="o">Hello, Ada!</p>';
  const contract: TaskContract = {
    ...CONTRACT,
    verification: {
      browser: {
        siteDir: "src/a/site",
        steps: [
          { kind: "goto", path: "/index.html" },
          { kind: "expectText", selector: "#t", text: "Hello, world!", name: "default greeting", criteria: ["c2"] },
          { kind: "expectText", selector: "#o", text: "Hello, Ada!", name: "greets by name", criteria: ["c1"] },
          { kind: "expectScreenshotMatch", name: "looks as approved", baseline: "home.png" },
        ],
      },
      timeoutMs: 60_000,
    },
  };
  const e = env(() => ({ summary: "built the page", write: { "src/a/site/index.html": page } }));
  const { taskId, wid } = start(e, contract);
  await e.engine.start(wid);
  const d = delivery(e, taskId)!;
  assert.equal(d.verdict, "unverified", JSON.stringify(d.reasons));
  assert.ok(d.reasons.some((r) => r.includes("visual regression was not performed")), JSON.stringify(d.reasons));
});

// ---------- tasarım laboratuvarı (madde 49 + 50) ----------

const DESIGN_SPEC = { palette: ["#1a2b3c", "#ff6600"], fonts: ["Inter"], spacingScale: [0, 4, 8, 16], radiusScale: [0, 4], forbidden: { strings: ["Acme Corp"] } };
const DESIGN_CRITERIA = { c1: ["palette-conformance", "font-conformance", "spacing-scale"], c2: ["anti-template-colors", "anti-placeholder"] };
const DESIGN_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Greeting</title><link rel="stylesheet" href="style.css"></head><body><h1>Hello team</h1></body></html>';
const DESIGN_CSS_GOOD = "body { font-family: Inter, sans-serif; color: #1a2b3c; margin: 0; padding: 16px; border-radius: 4px; }\na { color: #ff6600; gap: 8px; }\n";
const DESIGN_CSS_BAD = "body { font-family: Arial, sans-serif; color: #1a2b3c; margin: 0; padding: 13px; border-radius: 4px; }\na { color: #667eea; }\n";
const designStep = (css: string, html = DESIGN_HTML): ScriptStep => ({ summary: "built the page", write: { "src/a/site/index.html": html, "src/a/site/style.css": css } });
const designContract = (design: Record<string, unknown> = {}, extra: Record<string, unknown> = {}): TaskContract => ({
  ...CONTRACT,
  verification: validateVerification({ design: { files: ["src/a/site/index.html", "src/a/site/style.css"], spec: DESIGN_SPEC, criteria: DESIGN_CRITERIA, ...design }, timeoutMs: 60_000, ...extra }),
});

test("plan validation for design: design counts as a plan, exactly one of spec/specFile, bad values are refused", () => {
  const ok = validateVerification({ design: { files: ["site/index.html", "site/a.css"], spec: { palette: ["#ABC"], fonts: ["Inter"] }, criteria: { c1: ["design"] } } });
  assert.deepEqual(ok.design!.files, ["site/index.html", "site/a.css"]);
  assert.deepEqual(ok.design!.spec!.palette, ["#aabbcc"], "the stored spec is the validated, normalised one");
  assert.equal(validateVerification({ design: { files: ["a.css"], specFile: "design/spec.json" } }).design!.specFile, "design/spec.json", "design alone is a valid plan");
  const bad = (v: unknown) => assert.throws(() => validateVerification(v), ValidationError);
  bad({ design: { files: ["a.css"] } });
  bad({ design: { files: ["a.css"], spec: DESIGN_SPEC, specFile: "s.json" } });
  bad({ design: { files: [], spec: DESIGN_SPEC } });
  bad({ design: { files: ["a.txt"], spec: DESIGN_SPEC } });
  bad({ design: { files: ["../a.css"], spec: DESIGN_SPEC } });
  bad({ design: { files: ["a.css"], specFile: "../s.json" } });
  bad({ design: { files: ["a.css"], specFile: "s.txt" } });
  bad({ design: { files: ["a.css"], spec: { palette: ["red"], fonts: [] } } });
  bad({ design: { files: ["a.css"], spec: { palette: [], fonts: [], extra: 1 } } });
  bad({ design: { files: ["a.css"], spec: DESIGN_SPEC, root: "/" } });
  bad({ design: 5 });
});

test("design as delivery proof: a conforming page passes, with a LOG evidence file and no replay bundle", async () => {
  const e = env(() => designStep(DESIGN_CSS_GOOD), { rounds: null, shell: false });
  const { taskId, wid } = start(e, designContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  const d = delivery(e, taskId)!;
  assert.equal(d.verdict, "passed", d.reasons.join("; "));
  assert.deepEqual(d.criteria.map((c) => [c.id, c.status]), [["c1", "verified"], ["c2", "verified"]]);
  const run = labRun(e, wid, "design-lab");
  assert.equal(run.status, "passed");
  assert.equal(checkEvidenceFile(run.evidence.find((x) => x.kind === "log")!), null);
  assert.match(logText(run), /\[passed\] design \/ \[design\] palette-conformance/);
  assert.equal(kindRows(e, taskId, "replay").length, 0, "a passing delivery has no replay bundle");
});

test("design as delivery proof: violations break the delivery (FAILED), point at file:line, and leave a verifiable replay bundle", async () => {
  const e = env(() => designStep(DESIGN_CSS_BAD), { rounds: null, shell: false });
  const { taskId, wid } = start(e, designContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /verification_failed/);
  assert.equal(e.coder.calls.length, 1);
  assert.equal(delivery(e, taskId)!.verdict, "failed");
  assert.match(delivery(e, taskId)!.reasons[0]!, /design-lab: \d+ design check\(s\) failed/);
  const run = labRun(e, wid, "design-lab");
  const failing = run.tests.filter((t) => t.outcome === "failed");
  assert.deepEqual(failing.map((t) => t.id), ["design-palette-conformance", "design-font-conformance", "design-spacing-scale", "design-anti-template-colors"]);
  assert.ok(failing.every((t) => t.classification === "product_defect" && t.evidenceRefs.length === 1));
  assert.match(logText(run), /src\/a\/site\/style\.css:2 color #667eea is not in the palette/);
  assert.match(logText(run), /src\/a\/site\/style\.css:1 13px is not on the spacing scale/);
  const rows = kindRows(e, taskId, "replay");
  assert.equal(rows.length, 1);
  const data = rows[0]!.data as { bundle: { runId: string; provider: string; files: string[]; command: { kind: string; lab?: string; plan?: { spec?: { palette: string[] } } }; failingTests: Array<{ name: string }> } };
  assert.equal(data.bundle.provider, "design-lab");
  assert.equal(data.bundle.runId, run.runId);
  assert.equal(data.bundle.command.lab, "design");
  assert.deepEqual(data.bundle.command.plan?.spec?.palette, ["#1a2b3c", "#ff6600"], "the replay command carries the design plan");
  assert.ok(data.bundle.files.includes("src/a/site/style.css"));
  assert.deepEqual(verifyReplayBundle(data.bundle as never), { ok: true, problems: [] });
});

test("design with no criteria mapping still cannot be ignored: a violation fails the delivery", async () => {
  const noMap: TaskContract = { ...CONTRACT, verification: validateVerification({ design: { files: ["src/a/site/style.css"], spec: DESIGN_SPEC }, timeoutMs: 60_000 }) };
  const e = env(() => designStep(DESIGN_CSS_BAD), { rounds: null, shell: false });
  const s = start(e, noMap);
  assert.equal((await e.engine.start(s.wid)).state, "failed");
  assert.equal(delivery(e, s.taskId)!.verdict, "failed");
  assert.match(delivery(e, s.taskId)!.reasons[0]!, /design-lab: 4 design check\(s\) failed/);
});

const DESIGN_SPEC_JSON = JSON.stringify(DESIGN_SPEC);
const PERMISSIVE_SPEC_JSON = JSON.stringify({ palette: ["#667eea", "#1a2b3c", "#ff6600"], fonts: ["Inter", "Arial"], paletteTolerance: 30, spacingScale: [0, 4, 8, 13, 16], radiusScale: [0, 4] });
const specFileContract = (extra: Record<string, unknown> = {}): TaskContract => designContract({ spec: undefined, specFile: "src/a/design.json" }, extra);
const pageFiles = (css: string): Record<string, string> => ({ "src/a/site/index.html": DESIGN_HTML, "src/a/site/style.css": css });

test("design specFile that is part of the base commit and untouched by the implementer is trusted: a violation goes back for repair, the corrected output passes", async () => {
  let n = 0;
  const e = env(() => ({ summary: "built", write: pageFiles(++n === 1 ? DESIGN_CSS_BAD : DESIGN_CSS_GOOD) }), { shell: false });
  const { taskId, wid } = startWithFiles(e, specFileContract(), { "src/a/design.json": DESIGN_SPEC_JSON });
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  assert.equal(e.coder.calls.length, 2);
  assert.match(e.coder.calls[1]!.prompt, /\[design\] palette-conformance/);
  assert.equal(delivery(e, taskId)!.verdict, "passed");
  assert.equal(kindRows(e, taskId, "replay").length, 1, "the failed first round left its replay bundle");
});

test("design specFile written or changed by the implementer is not independent proof: a permissive spec cannot launder a bad page (delivery stays unverified, never passed)", async () => {
  // Uygulayıcı hem kötü CSS'i hem de onu geçirecek gevşek bir sözleşme dosyasını yazıyor.
  const e = env(() => ({ summary: "built", write: { ...pageFiles(DESIGN_CSS_BAD), "src/a/design.json": PERMISSIVE_SPEC_JSON } }), { rounds: null, shell: false });
  const { taskId, wid } = start(e, specFileContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /delivery_unverified/);
  assert.equal(labRun(e, wid, "design-lab").status, "passed", "the lab itself is fooled by the permissive spec, the engine is not");
  const d = delivery(e, taskId)!;
  assert.equal(d.verdict, "unverified");
  assert.match(d.reasons[0]!, /design-lab: the design spec file was changed by the implementer.*use an inline spec/);
  assert.equal(e.coder.calls.length, 1);
  // Aynı dosya taban commit'te var ve uygulayıcı DEĞİŞTİRİYOR: yine güvenilmez.
  const e2 = env(() => ({ summary: "built", write: { ...pageFiles(DESIGN_CSS_GOOD), "src/a/design.json": PERMISSIVE_SPEC_JSON } }), { rounds: null, shell: false });
  const s2 = startWithFiles(e2, specFileContract(), { "src/a/design.json": DESIGN_SPEC_JSON });
  assert.equal((await e2.engine.start(s2.wid)).state, "failed");
  assert.equal(delivery(e2, s2.taskId)!.verdict, "unverified");
  // Gevşek sözleşme ürün hatasını gizlese de gerçek bir ihlal varsa teslim yine "failed" olur (kapı ihlali önceler).
  const e3 = env(() => ({ summary: "built", write: { ...pageFiles(DESIGN_CSS_BAD), "src/a/design.json": DESIGN_SPEC_JSON } }), { rounds: null, shell: false });
  const s3 = start(e3, specFileContract());
  assert.equal((await e3.engine.start(s3.wid)).state, "failed");
  assert.equal(delivery(e3, s3.taskId)!.verdict, "failed", "a genuine violation stays a failure");
  assert.match(delivery(e3, s3.taskId)!.reasons.join(" "), /design-lab: \d+ design check\(s\) failed/);
  // requireTrustedTests açıkken değiştirilmiş sözleşme kanıt sayılmaz (auditör nedeni "design spec file" olarak verir).
  const e4 = env(() => ({ summary: "built", write: { ...pageFiles(DESIGN_CSS_GOOD), "src/a/design.json": DESIGN_SPEC_JSON } }), { rounds: null, shell: false });
  const s4 = start(e4, specFileContract({ requireTrustedTests: true }));
  assert.equal((await e4.engine.start(s4.wid)).state, "failed");
  const d4 = delivery(e4, s4.taskId)!;
  assert.equal(d4.verdict, "unverified");
  assert.match(d4.reasons.join(" "), /src\/a\/design\.json \(design spec file\)/, "requireTrustedTests names the spec file as implementer-controlled");
});

test("design specFile on a .gitignore'd path (absent from the base commit and invisible to git status) is not trusted: delivery stays unverified", async () => {
  const c = designContract({ spec: undefined, specFile: "src/a/ignored/design.json" });
  const e = env(() => ({ summary: "built", write: { ...pageFiles(DESIGN_CSS_GOOD), "src/a/ignored/design.json": DESIGN_SPEC_JSON } }), { rounds: null, shell: false });
  const { taskId, wid } = startWithFiles(e, c, { ".gitignore": "src/a/ignored/\n" });
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /delivery_unverified/);
  assert.equal(labRun(e, wid, "design-lab").status, "passed", "the lab itself accepts the spec, the engine does not trust it");
  const d = delivery(e, taskId)!;
  assert.equal(d.verdict, "unverified");
  assert.match(d.reasons[0]!, /design-lab: the design spec file was changed by the implementer/);
  // Taban commit'te izlenmeyen bir dosya, .gitignore olmasa bile (uygulayıcı yeni yazdı) güvenilmez ve requireTrustedTests'te kanıt sayılmaz.
  const e2 = env(() => ({ summary: "built", write: { ...pageFiles(DESIGN_CSS_GOOD), "src/a/design.json": DESIGN_SPEC_JSON } }), { rounds: null, shell: false });
  const s2 = start(e2, specFileContract({ requireTrustedTests: true }));
  assert.equal((await e2.engine.start(s2.wid)).state, "failed");
  assert.match(delivery(e2, s2.taskId)!.reasons.join(" "), /src\/a\/design\.json \(design spec file\)/);
});

test("design specFile tracked in the base commit but loosened by the implementer without committing is not trusted", async () => {
  const e = env(() => ({ summary: "built", write: { ...pageFiles(DESIGN_CSS_GOOD), "src/a/design.json": PERMISSIVE_SPEC_JSON } }), { rounds: null, shell: false });
  const { taskId, wid } = startWithFiles(e, specFileContract(), { "src/a/design.json": DESIGN_SPEC_JSON });
  assert.equal((await e.engine.start(wid)).state, "failed");
  assert.equal(delivery(e, taskId)!.verdict, "unverified");
  assert.match(delivery(e, taskId)!.reasons[0]!, /design spec file was changed by the implementer/);
});

test("design specFile changed and COMMITTED by the implementer (HEAD moves on) is still judged against the base blob: not trusted", async () => {
  const run = (cwd: string, ...a: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...a], { cwd, stdio: "pipe" });
  const e = env((call) => {
    for (const [p, text] of Object.entries({ ...pageFiles(DESIGN_CSS_GOOD), "src/a/design.json": PERMISSIVE_SPEC_JSON })) {
      mkdirSync(join(call.cwd, p, ".."), { recursive: true });
      writeFileSync(join(call.cwd, p), text);
    }
    run(call.cwd, "add", "-A");
    run(call.cwd, "commit", "-q", "-m", "implementer commit");
    return { summary: "built and committed" };
  }, { rounds: null, shell: false });
  const { taskId, wid } = startWithFiles(e, specFileContract(), { "src/a/design.json": DESIGN_SPEC_JSON });
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed", JSON.stringify(out));
  assert.match(out.error ?? "", /delivery_unverified/);
  assert.equal(delivery(e, taskId)!.verdict, "unverified");
  assert.match(delivery(e, taskId)!.reasons[0]!, /design spec file was changed by the implementer/);
});

test("an inline design spec is the recommended path and is never affected by what the implementer wrote", async () => {
  // Uygulayıcı bir design.json da yazsa, satır içi spec kullanıldığı için teslim etkilenmez.
  const e = env(() => ({ summary: "built", write: { ...pageFiles(DESIGN_CSS_GOOD), "src/a/design.json": PERMISSIVE_SPEC_JSON } }), { rounds: null, shell: false });
  const { taskId, wid } = start(e, designContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "succeeded", JSON.stringify(out));
  assert.equal(delivery(e, taskId)!.verdict, "passed");
  // Inline spec + uygulayıcı ihlal yazıyor: yine failed (spec uygulayıcıya erişilemez, plan içinde).
  const e2 = env(() => ({ summary: "built", write: { ...pageFiles(DESIGN_CSS_BAD), "src/a/design.json": PERMISSIVE_SPEC_JSON } }), { rounds: null, shell: false });
  const s2 = start(e2, designContract());
  assert.equal((await e2.engine.start(s2.wid)).state, "failed");
  assert.equal(delivery(e2, s2.taskId)!.verdict, "failed");
});

test("design: an unlisted linked stylesheet is never silently skipped: the delivery is unverified with the reference named in the log", async () => {
  const html = DESIGN_HTML.replace("href=\"style.css\"", "href=\"style.css\"><link rel=\"stylesheet\" href=\"extra.css\"");
  const e = env(() => ({ summary: "built", write: { "src/a/site/index.html": html, "src/a/site/style.css": DESIGN_CSS_GOOD, "src/a/site/extra.css": "a { color: #ff00aa }" } }), { rounds: null, shell: false });
  const { taskId, wid } = start(e, designContract());
  const out = await e.engine.start(wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /delivery_unverified/);
  const run = labRun(e, wid, "design-lab");
  assert.equal(run.status, "error");
  assert.match(logText(run), /linked stylesheet is covered: extra\.css/);
  assert.equal(delivery(e, taskId)!.verdict, "unverified");
  assert.equal(e.coder.calls.length, 1, "not sent back for repair");
});

test("design inputs that cannot be read are infra errors that keep the delivery from passing: unreadable spec, missing / too large file, plan outside the workspace", async () => {
  const cases: Array<{ name: string; contract: TaskContract; step: ScriptStep; message: RegExp }> = [
    { name: "specFile missing", contract: designContract({ spec: undefined, specFile: "src/a/nospec.json" }), step: designStep(DESIGN_CSS_GOOD), message: /does not exist/ },
    { name: "specFile invalid JSON", contract: designContract({ spec: undefined, specFile: "src/a/spec.json" }), step: { summary: "x", write: { "src/a/spec.json": "{nope", "src/a/site/index.html": DESIGN_HTML, "src/a/site/style.css": DESIGN_CSS_GOOD } }, message: /not valid JSON/ },
    { name: "specFile too large", contract: designContract({ spec: undefined, specFile: "src/a/spec.json" }), step: { summary: "x", write: { "src/a/spec.json": JSON.stringify({ palette: [], fonts: [], pad: "x".repeat(70_000) }), "src/a/site/index.html": DESIGN_HTML, "src/a/site/style.css": DESIGN_CSS_GOOD } }, message: /larger than 64 KB/ },
    { name: "css missing", contract: designContract({ files: ["src/a/site/index.html", "src/a/site/nope.css"] }), step: designStep(DESIGN_CSS_GOOD), message: /does not exist/ },
    { name: "css too large", contract: designContract(), step: designStep(`${DESIGN_CSS_GOOD}/*${"x".repeat(310 * 1024)}*/`), message: /larger than 300 KB/ },
    // Doğrulayıcıyı aşan (ör. veritabanına doğrudan yazılmış) bir plan bile çalışma ağacı dışına çıkamaz.
    { name: "outside", contract: { ...CONTRACT, verification: { timeoutMs: 60_000, design: { files: ["../outside.css"], spec: DESIGN_SPEC, criteria: DESIGN_CRITERIA } } }, step: designStep(DESIGN_CSS_GOOD), message: /not accepted/ },
  ];
  for (const c of cases) {
    const e = env(() => c.step, { rounds: null, shell: false });
    const { taskId, wid } = start(e, c.contract);
    const out = await e.engine.start(wid);
    assert.equal(out.state, "failed", c.name);
    assert.match(out.error ?? "", /delivery_unverified/, c.name);
    assert.equal(e.coder.calls.length, 1, `${c.name}: not sent back for repair`);
    const d = delivery(e, taskId)!;
    assert.notEqual(d.verdict, "passed", c.name);
    const run = labRun(e, wid, "design-lab");
    assert.equal(run.status, "error", c.name);
    const err = run.tests.find((t) => t.outcome === "error")!;
    assert.equal(err.classification, "infra", c.name);
    assert.match(err.error!.message, c.message, c.name);
    assert.deepEqual(err.criteria, ["c1", "c2"], `${c.name}: the mapped criteria are tainted, not silently unverified`);
    assert.equal(err.evidenceRefs.length, 1, c.name);
    assert.equal(checkEvidenceFile(run.evidence.find((x) => x.kind === "log")!), null, c.name);
    assert.equal(kindRows(e, taskId, "replay").length, 0, `${c.name}: an infra error is not a product failure, so no replay bundle`);
  }
});

test("a broken design run next to a fully verified other proof is never 'passed' (unverified), and a planned design run that never happened is unverified", async () => {
  const covered: TaskContract = {
    ...CONTRACT,
    verification: validateVerification({
      contracts: { subjectFile: "src/a/out.json", contracts: CONTRACT_LIST },
      design: { files: ["src/a/site/style.css"], specFile: "src/a/missing-spec.json" },
      timeoutMs: 60_000,
    }),
  };
  const e = env(() => ({ summary: "wrote", write: { "src/a/out.json": SUBJECT_OK, "src/a/site/style.css": DESIGN_CSS_GOOD } }), { rounds: null, shell: false });
  const s = start(e, covered);
  const out = await e.engine.start(s.wid);
  assert.equal(out.state, "failed");
  assert.match(out.error ?? "", /delivery_unverified/);
  assert.equal(labRun(e, s.wid, "contracts-lab").status, "passed", "the other proof is fine");
  assert.equal(labRun(e, s.wid, "design-lab").status, "error");
  assert.equal(delivery(e, s.taskId)!.verdict, "unverified");
  assert.match(delivery(e, s.taskId)!.reasons[0]!, /design-lab: the design run could not complete/);
  assert.equal(e.coder.calls.length, 1, "an infra problem is not sent back for repair");
  // Planlı sağlayıcı hiç koşmadıysa teslim "unverified" olur.
  const { auditDelivery } = await import("../verify/auditor.ts");
  const { StateLabProvider } = await import("../verify/labs/state.ts");
  const { attachLabLog } = await import("./lab-runs.ts");
  const state = attachLabLog(await new StateLabProvider().run({ machine: GOOD_MACHINE, traces: [{ name: "[ac:c1] [ac:c2] go", steps: [{ event: "go" }] }] }).result, mkTmp("agentmom-lab-ev-"));
  const base = { criteria: CONTRACT.acceptance, review: { approved: true, criteria: [{ id: "c1", met: true }, { id: "c2", met: true }] } };
  assert.equal(auditDelivery({ ...base, runs: [state], expectedProviders: ["state-lab"] }).verdict, "passed");
  const missing = auditDelivery({ ...base, runs: [state], expectedProviders: ["state-lab", "design-lab"] });
  assert.equal(missing.verdict, "unverified");
  assert.match(missing.reasons.join(" "), /no run from the expected provider design-lab/);
});
