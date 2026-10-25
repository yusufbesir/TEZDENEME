// Doğrulama laboratuvarı D6a testleri. Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Kurallar, sözleşmeler, durum geçişleri ve API laboratuvarı; API testleri gerçek yerel node:http sunucusu kullanır (rastgele port, 127.0.0.1).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { TASK_STATES, TASK_TRANSITIONS } from "../../core/tasks/tasks.ts";
import { validateRunResult } from "../schema.ts";
import type { RunResult } from "../schema.ts";
import { ApiLabProvider } from "./api.ts";
import type { ApiLabRequest } from "./api.ts";
import { ContractsLabProvider } from "./contracts.ts";
import { LAB_KINDS, LabSpecError, runLab, summarizeRuns } from "./index.ts";
import { RuleBudgetError, evaluateRule, validateRule } from "./rules.ts";
import type { Rule } from "./rules.ts";
import { StateLabProvider } from "./state.ts";

const checked = async (h: { result: Promise<RunResult> }): Promise<RunResult> => validateRunResult(await h.result);
const rule = (r: unknown, subject: unknown) => evaluateRule(validateRule(r), subject);

// ---------- kurallar ----------

const DOC = { n: 5, s: "hello world", flag: true, nul: null, list: [3, 1, 2], sorted: [1, 2, 2, 5], dup: [1, 2, 1], objs: [{ id: "a", v: 1 }, { id: "b", v: 2 }], sum: 3, total: 3, a: { b: [{ c: 1 }, { c: 2 }] }, same1: { x: 1 }, same2: { x: 1 } };

test("rules: every operator has a passing and a failing example", () => {
  const cases: Array<[unknown, boolean]> = [
    [{ op: "exists", path: "n" }, true],
    [{ op: "exists", path: "missing" }, false],
    [{ op: "exists", path: "nul" }, true],
    [{ op: "absent", path: "missing" }, true],
    [{ op: "absent", path: "n" }, false],
    [{ op: "equals", path: "n", value: 5 }, true],
    [{ op: "equals", path: "n", value: 6 }, false],
    [{ op: "equals", path: "same1", value: { x: 1 } }, true],
    [{ op: "notEquals", path: "n", value: 6 }, true],
    [{ op: "notEquals", path: "n", value: 5 }, false],
    [{ op: "gt", path: "n", value: 4 }, true],
    [{ op: "gt", path: "n", value: 5 }, false],
    [{ op: "gte", path: "n", value: 5 }, true],
    [{ op: "gte", path: "n", value: 6 }, false],
    [{ op: "lt", path: "n", value: 6 }, true],
    [{ op: "lt", path: "n", value: 5 }, false],
    [{ op: "lte", path: "n", value: 5 }, true],
    [{ op: "lte", path: "n", value: 4 }, false],
    [{ op: "gt", path: "s", value: 1 }, false],
    [{ op: "in", path: "n", value: [1, 5, 9] }, true],
    [{ op: "in", path: "n", value: [1, 9] }, false],
    [{ op: "startsWith", path: "s", value: "hello" }, true],
    [{ op: "startsWith", path: "s", value: "world" }, false],
    [{ op: "endsWith", path: "s", value: "world" }, true],
    [{ op: "endsWith", path: "s", value: "hello" }, false],
    [{ op: "contains", path: "s", value: "o w" }, true],
    [{ op: "contains", path: "list", value: 2 }, true],
    [{ op: "contains", path: "list", value: 9 }, false],
    [{ op: "unique", path: "list" }, true],
    [{ op: "unique", path: "dup" }, false],
    [{ op: "unique", path: "objs", key: "id" }, true],
    [{ op: "sorted", path: "sorted" }, true],
    [{ op: "sorted", path: "list" }, false],
    [{ op: "sorted", path: "sorted", order: "desc" }, false],
    [{ op: "sorted", path: "objs", key: "v" }, true],
    [{ op: "equalsPath", path: "same1", path2: "same2" }, true],
    [{ op: "equalsPath", path: "n", path2: "sum" }, false],
    [{ op: "sumEqualsPath", path: "a.b[*].c", path2: "sum" }, true],
    [{ op: "sumEqualsPath", path: "list", path2: "n" }, false],
    [{ op: "sumEqualsPath", path: "objs", key: "v", path2: "total" }, true],
    [{ op: "lengthBetween", path: "list", value: [1, 3] }, true],
    [{ op: "lengthBetween", path: "list", value: [4, 9] }, false],
    [{ op: "lengthBetween", path: "s", value: [1, 20] }, true],
    [{ op: "type", path: "n", value: "number" }, true],
    [{ op: "type", path: "n", value: "string" }, false],
    [{ op: "type", path: "nul", value: "null" }, true],
    [{ op: "type", path: "list", value: "array" }, true],
    [{ op: "type", path: "same1", value: "object" }, true],
    [{ op: "type", path: "flag", value: "boolean" }, true],
  ];
  for (const [r, expected] of cases) assert.equal(rule(r, DOC).ok, expected, JSON.stringify(r));
});

test("rules: [*] holds for ALL elements; an empty list passes, nonEmpty is expressed with lengthBetween", () => {
  assert.equal(rule({ op: "gt", path: "a.b[*].c", value: 0 }, DOC).ok, true);
  const bad = rule({ op: "gt", path: "a.b[*].c", value: 1 }, DOC);
  assert.equal(bad.ok, false);
  assert.match(bad.detail, /a\.b\[0\]\.c/, "the first violating path is reported");
  assert.equal(rule({ op: "equals", path: "e[*].x", value: 1 }, { e: [] }).ok, true, "vacuous pass");
  assert.equal(rule({ op: "lengthBetween", path: "e", value: [1, 100] }, { e: [] }).ok, false);
  assert.equal(rule({ op: "exists", path: "a.b[1].c" }, DOC).ok, true);
  assert.equal(rule({ op: "exists", path: "a.b[7].c" }, DOC).ok, false);
  assert.equal(rule({ op: "equals", path: "$.n", value: 5 }, DOC).ok, true);
  assert.equal(rule({ op: "type", path: "$", value: "object" }, DOC).ok, true);
});

test("rules: all / any / not / implies", () => {
  const t = { op: "equals", path: "n", value: 5 };
  const f = { op: "equals", path: "n", value: 6 };
  assert.equal(rule({ all: [t, t] }, DOC).ok, true);
  assert.equal(rule({ all: [t, f] }, DOC).ok, false);
  assert.equal(rule({ any: [f, t] }, DOC).ok, true);
  assert.equal(rule({ any: [f, f] }, DOC).ok, false);
  assert.equal(rule({ not: f }, DOC).ok, true);
  assert.equal(rule({ not: t }, DOC).ok, false);
  assert.equal(rule({ implies: { if: f, then: f } }, DOC).ok, true, "false premise");
  assert.equal(rule({ implies: { if: t, then: t } }, DOC).ok, true);
  const r = rule({ implies: { if: t, then: f } }, DOC);
  assert.equal(r.ok, false);
  assert.match(r.detail, /expected 6/);
});

test("rules: poisoned path keys, deep paths, unknown ops and fields are rejected", () => {
  for (const p of ["__proto__", "a.__proto__.x", "constructor", "a.constructor.name", "prototype", "x[0].prototype"]) assert.throws(() => validateRule({ op: "exists", path: p }), LabSpecError, p);
  assert.throws(() => validateRule({ op: "exists", path: Array.from({ length: 13 }, () => "a").join(".") }), LabSpecError);
  assert.doesNotThrow(() => validateRule({ op: "exists", path: Array.from({ length: 12 }, () => "a").join(".") }));
  for (const bad of [{ op: "matches", path: "a", value: ".*" }, { op: "regex", path: "a", value: "x" }, { op: "exists" }, { op: "exists", path: "a", extra: 1 }, { op: "exists", path: "a", value: 1 }, { op: "equals", path: "a" }, { op: "gt", path: "a", value: "x" }, { op: "in", path: "a", value: [] }, { op: "type", path: "a", value: "date" }, { op: "lengthBetween", path: "a", value: [3, 1] }, { op: "equalsPath", path: "a" }, { op: "equalsPath", path: "a", path2: "b[*]" }, { op: "sorted", path: "a", order: "up" }, { op: "unique", path: "a", key: "__proto__" }, { all: [] }, { all: [{ op: "exists", path: "a" }], extra: 1 }, { not: 3 }, { implies: { if: { op: "exists", path: "a" } } }, "text", null, []]) assert.throws(() => validateRule(bad), LabSpecError, JSON.stringify(bad));
  for (const p of ["a..b", ".a", "a.", "a[", "a[x]", "a b", "a['b']", "$a", ""]) assert.throws(() => validateRule({ op: "exists", path: p }), LabSpecError, p);
  // JSON.parse üretir __proto__ anahtarını; değer içinde de reddedilir.
  assert.throws(() => validateRule({ op: "equals", path: "a", value: JSON.parse('{"__proto__": {"x": 1}}') }), LabSpecError);
  // Yol çözücü prototip özelliklerine zaten bakmaz: toString yoktur.
  assert.equal(rule({ op: "exists", path: "toString" }, {}).ok, false);
});

test("rules: size limits (nodes, depth, value length, result count)", () => {
  const leaf = { op: "exists", path: "a" };
  assert.doesNotThrow(() => validateRule({ all: Array.from({ length: 199 }, () => leaf) }));
  assert.throws(() => validateRule({ all: Array.from({ length: 200 }, () => leaf) }), /more than 200 nodes/);
  let deep: unknown = leaf;
  for (let i = 0; i < 7; i++) deep = { not: deep };
  assert.doesNotThrow(() => validateRule(deep), "depth 8 is the limit");
  assert.throws(() => validateRule({ not: deep }), /deeper than 8/);
  assert.doesNotThrow(() => validateRule({ op: "equals", path: "a", value: "x".repeat(500) }));
  assert.throws(() => validateRule({ op: "equals", path: "a", value: "x".repeat(501) }), LabSpecError);
  assert.throws(() => validateRule({ op: "equals", path: "a", value: Array.from({ length: 200 }, () => "abc") }), LabSpecError);
  const big = { e: Array.from({ length: 1001 }, (_, i) => ({ v: i })) };
  assert.throws(() => evaluateRule(validateRule({ op: "gte", path: "e[*].v", value: 0 }), big), /more than 1000/);
  const ok = { e: Array.from({ length: 1000 }, (_, i) => ({ v: i })) };
  assert.equal(evaluateRule(validateRule({ op: "gte", path: "e[*].v", value: 0 }), ok).ok, true);
});

test("rules: details are masked, cleaned and shortened", () => {
  const r1 = rule({ op: "equals", path: "user.password", value: "other" }, { user: { password: "hunter2-very-secret" } });
  assert.equal(r1.ok, false);
  assert.ok(!r1.detail.includes("hunter2"), r1.detail);
  const key = "sk-" + "a1b2c3d4e5f6g7h8i9j0";
  const r2 = rule({ op: "equals", path: "note", value: "x" }, { note: `line1\nline2 ${key}` });
  assert.ok(!r2.detail.includes(key) && !/[\n\r]/.test(r2.detail), r2.detail);
  const r3 = rule({ op: "equals", path: "note", value: "x" }, { note: "z".repeat(5000) });
  assert.ok(r3.detail.length < 400);
});

// ---------- sözleşmeler ----------

test("contracts: invariants and before/after contracts, criteria tags, run result schema", async () => {
  const subject = { before: { balance: 100, items: [1, 2] }, after: { balance: 70, items: [1, 2, 3], total: 6 } };
  const handle = new ContractsLabProvider().run({
    subject,
    contracts: [
      { name: "balance never negative", kind: "invariant", rule: { op: "gte", path: "after.balance", value: 0 }, criteria: ["AC1"] },
      { name: "items only grow", kind: "postcondition", rule: { op: "gte", path: "after.items", value: 0 } },
      { name: "balance decreased", kind: "postcondition", rule: { all: [{ op: "equals", path: "before.balance", value: 100 }, { op: "equals", path: "after.balance", value: 70 }] } },
      { name: "sum matches [ac:AC2]", kind: "postcondition", rule: { op: "sumEqualsPath", path: "after.items", path2: "after.total" } },
      { name: "no more than two items", kind: "precondition", rule: { op: "lengthBetween", path: "after.items", value: [0, 2] }, criteria: ["AC3", "AC2"] },
    ],
  });
  const run = await checked(handle);
  assert.equal(run.provider, "contracts-lab");
  assert.equal(run.status, "failed");
  assert.deepEqual(run.totals, { passed: 3, failed: 2, skipped: 0, error: 0 });
  const byName = (n: string) => run.tests.find((t) => t.name.startsWith(n))!;
  assert.equal(byName("balance never negative").suite, "invariant");
  assert.deepEqual(byName("balance never negative").criteria, ["AC1"]);
  assert.match(byName("balance never negative").name, /\[ac:AC1\]/);
  assert.deepEqual(byName("sum matches").criteria, ["AC2"], "an existing tag is not duplicated");
  assert.deepEqual(byName("no more than two").criteria.sort(), ["AC2", "AC3"]);
  const failed = byName("items only grow");
  assert.equal(failed.outcome, "failed", "gte on a list is not a number comparison");
  assert.equal(failed.classification, "product_defect");
  assert.equal(byName("no more than two").suite, "precondition");
  assert.equal(byName("no more than two").classification, "product_defect");
  assert.match(byName("no more than two").error!.detail!, /length 3/);
});

test("contracts: evaluation trouble is an infra error, not a product defect; request limits", async () => {
  const subject = { e: Array.from({ length: 1500 }, (_, i) => ({ v: i })) };
  const run = await checked(new ContractsLabProvider().run({ subject, contracts: [{ name: "too wide", kind: "invariant", rule: { op: "gte", path: "e[*].v", value: 0 } }] }));
  assert.equal(run.tests[0]!.outcome, "error");
  assert.equal(run.tests[0]!.classification, "infra");
  assert.equal(run.status, "error");
  const c = { name: "c", kind: "invariant" as const, rule: { op: "exists", path: "a" } };
  assert.throws(() => new ContractsLabProvider().run({ subject: {}, contracts: Array.from({ length: 101 }, () => c) }), LabSpecError);
  assert.throws(() => new ContractsLabProvider().run({ subject: {}, contracts: [] }), LabSpecError);
  assert.throws(() => new ContractsLabProvider().run({ subject: "x".repeat(260 * 1024), contracts: [c] }), /larger than 256 KB/);
  assert.throws(() => new ContractsLabProvider().run({ subject: {}, contracts: [{ ...c, kind: "other" as never }] }), LabSpecError);
  assert.throws(() => new ContractsLabProvider().run({ subject: {}, contracts: [{ ...c, criteria: ["bad id!"] }] }), LabSpecError);
  assert.throws(() => new ContractsLabProvider().run({ subject: {}, contracts: [{ ...c, extra: 1 } as never] }), LabSpecError);
  assert.throws(() => new ContractsLabProvider().run({ subject: {}, contracts: [{ ...c, name: "bad\nname" }] }), LabSpecError);
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.throws(() => new ContractsLabProvider().run({ subject: circular, contracts: [c] }), LabSpecError);
});

// ---------- durum laboratuvarı ----------

const GOOD = {
  initial: "idle",
  states: ["idle", "running", "done", "failed"],
  final: ["done"],
  transitions: [
    { from: "idle", event: "start", to: "running" },
    { from: "running", event: "finish", to: "done" },
    { from: "running", event: "crash", to: "failed" },
    { from: "failed", event: "retry", to: "idle" },
  ],
};
const testNamed = (run: RunResult, part: string) => run.tests.find((t) => t.name.includes(part))!;

test("state: a healthy machine passes every structural test", async () => {
  const run = await checked(new StateLabProvider().run({ machine: GOOD }));
  assert.equal(run.provider, "state-lab");
  assert.equal(run.status, "passed");
  assert.equal(run.totals.failed + run.totals.error, 0);
  assert.equal(run.tests.length, 6);
});

test("state: structural faults are caught (undeclared state, nondeterminism, unreachable state, dead end)", async () => {
  const run = await checked(
    new StateLabProvider().run({
      machine: {
        initial: "idle",
        states: ["idle", "running", "done", "island", "stuck"],
        final: ["done", "ghost"],
        transitions: [
          { from: "idle", event: "start", to: "running" },
          { from: "idle", event: "start", to: "stuck" },
          { from: "running", event: "finish", to: "done" },
          { from: "running", event: "boom", to: "nowhere" },
        ],
      },
    }),
  );
  assert.equal(run.status, "failed");
  assert.equal(testNamed(run, "transitions and final states").outcome, "failed");
  assert.match(testNamed(run, "transitions and final states").error!.detail!, /nowhere/);
  assert.match(testNamed(run, "transitions and final states").error!.detail!, /ghost/);
  assert.match(testNamed(run, "deterministic").error!.detail!, /idle \+ start/);
  assert.match(testNamed(run, "reachable from the initial").error!.detail!, /island/);
  assert.match(testNamed(run, "dead ends").error!.detail!, /island/);
  assert.match(testNamed(run, "dead ends").error!.detail!, /stuck/);
  assert.equal(testNamed(run, "initial state is declared").outcome, "passed");
  for (const t of run.tests.filter((x) => x.outcome === "failed")) assert.equal(t.classification, "product_defect");
  const undeclaredInitial = await checked(new StateLabProvider().run({ machine: { ...GOOD, initial: "nope" } }));
  assert.equal(testNamed(undeclaredInitial, "initial state is declared").outcome, "failed");
});

test("state: neverReach passes, fails with the found path, and treats from === to as a cycle", async () => {
  const run = await checked(
    new StateLabProvider().run({
      machine: GOOD,
      neverReach: [{ from: "done", to: "idle" }, { from: "idle", to: "done", name: "idle never finishes directly" }, { from: "done", to: "done" }, { from: "idle", to: "idle" }, { from: "idle", to: "missing" }],
    }),
  );
  const nr = run.tests.filter((t) => t.suite === "neverReach");
  assert.equal(nr[0]!.outcome, "passed", "done is a sink");
  assert.equal(nr[1]!.outcome, "failed");
  assert.equal(nr[1]!.name, "idle never finishes directly");
  assert.equal(nr[1]!.error!.detail, "idle -(start)-> running -(finish)-> done");
  assert.equal(nr[2]!.outcome, "passed", "done has no cycle back to itself");
  assert.equal(nr[3]!.outcome, "failed", "idle -> running -> failed -> idle is a cycle");
  assert.match(nr[3]!.error!.detail!, /failed -\(retry\)-> idle/);
  assert.equal(nr[4]!.outcome, "error");
  assert.equal(nr[4]!.classification, "infra");
});

test("state: traces pass and fail (disallowed event, expect mismatch, expectFinal)", async () => {
  const run = await checked(
    new StateLabProvider().run({
      machine: GOOD,
      criteria: { AC7: ["happy"] },
      traces: [
        { name: "happy path", steps: [{ event: "start", expect: "running" }, { event: "finish", expect: "done" }], expectFinal: true },
        { name: "retry loop", steps: [{ event: "start" }, { event: "crash" }, { event: "retry", expect: "idle" }], expectFinal: false },
        { name: "illegal event", steps: [{ event: "finish" }] },
        { name: "wrong expectation", steps: [{ event: "start", expect: "done" }] },
        { name: "should end final", steps: [{ event: "start" }], expectFinal: true },
        { name: "should not end final", steps: [{ event: "start" }, { event: "finish" }], expectFinal: false },
      ],
    }),
  );
  const tr = run.tests.filter((t) => t.suite === "trace");
  assert.deepEqual(tr.map((t) => t.outcome), ["passed", "passed", "failed", "failed", "failed", "failed"]);
  assert.deepEqual(tr[0]!.criteria, ["AC7"]);
  assert.match(tr[2]!.error!.detail!, /event finish is not allowed in state idle/);
  assert.match(tr[3]!.error!.detail!, /expected state done but reached running/);
  assert.match(tr[4]!.error!.detail!, /not final/);
  assert.match(tr[5]!.error!.detail!, /final state done/);
});

test("state: request limits", () => {
  const p = new StateLabProvider();
  const states = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);
  assert.doesNotThrow(() => p.run({ machine: { initial: "s0", states: states(200), transitions: [] } }));
  assert.throws(() => p.run({ machine: { initial: "s0", states: states(201), transitions: [] } }), LabSpecError);
  const t = (n: number) => Array.from({ length: n }, () => ({ from: "s0", event: "e", to: "s0" }));
  assert.doesNotThrow(() => p.run({ machine: { initial: "s0", states: ["s0"], transitions: t(1000) } }));
  assert.throws(() => p.run({ machine: { initial: "s0", states: ["s0"], transitions: t(1001) } }), LabSpecError);
  const trace = (n: number) => ({ name: "t", steps: Array.from({ length: n }, () => ({ event: "e" })) });
  assert.throws(() => p.run({ machine: GOOD, traces: Array.from({ length: 51 }, () => trace(1)) }), LabSpecError);
  assert.throws(() => p.run({ machine: GOOD, traces: [trace(201)] }), LabSpecError);
  assert.doesNotThrow(() => p.run({ machine: GOOD, traces: [trace(200)] }));
  assert.throws(() => p.run({ machine: { ...GOOD, extra: 1 } as never }), LabSpecError);
  assert.throws(() => p.run({ machine: { ...GOOD, states: [] } }), LabSpecError);
  assert.throws(() => p.run({ machine: { ...GOOD, transitions: [{ from: "a", event: "", to: "b" }] } }), LabSpecError);
});

test("state: AgentMom's own task state machine (the real transition table)", async () => {
  const transitions = TASK_STATES.flatMap((from) => TASK_TRANSITIONS[from].map((to) => ({ from, event: to, to })));
  const run = await checked(
    new StateLabProvider().run({
      machine: { initial: "pending", states: [...TASK_STATES], final: ["succeeded", "cancelled", "denied"], transitions },
      neverReach: [
        { from: "denied", to: "approved", name: "a denied task never becomes approved" },
        { from: "denied", to: "running" },
        { from: "cancelled", to: "running" },
        { from: "succeeded", to: "failed" },
        { from: "awaiting_approval", to: "running", name: "running requires passing through approved" },
      ],
      traces: [
        { name: "approval flow", steps: [{ event: "awaiting_approval", expect: "awaiting_approval" }, { event: "approved" }, { event: "running" }, { event: "succeeded", expect: "succeeded" }], expectFinal: true },
        { name: "failed task can be retried", steps: [{ event: "approved" }, { event: "running" }, { event: "failed" }, { event: "pending", expect: "pending" }], expectFinal: false },
        { name: "a task cannot jump from pending to running", steps: [{ event: "running" }] },
      ],
    }),
  );
  assert.equal(testNamed(run, "a denied task never becomes approved").outcome, "passed");
  assert.equal(testNamed(run, "running requires passing through approved").outcome, "failed", "the path exists, but only through approved");
  assert.match(testNamed(run, "running requires passing through approved").error!.detail!, /approved/);
  const structure = run.tests.filter((t) => t.suite === "structure");
  assert.ok(structure.every((t) => t.outcome === "passed"), JSON.stringify(structure.filter((t) => t.outcome !== "passed")));
  assert.deepEqual(run.tests.filter((t) => t.suite === "neverReach").map((t) => t.outcome), ["passed", "passed", "passed", "passed", "failed"]);
  assert.deepEqual(run.tests.filter((t) => t.suite === "trace").map((t) => t.outcome), ["passed", "passed", "failed"]);
});

// ---------- API laboratuvarı ----------

interface Seen {
  method: string;
  url: string;
  auth: string | undefined;
  host: string | undefined;
  body: string;
}
let server: Server;
let base: string;
let seen: Seen[] = [];
const slowTimers = new Set<NodeJS.Timeout>();

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(text), ...headers });
  res.end(text);
}

before(async () => {
  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    res.on("error", () => {});
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      seen.push({ method: req.method ?? "", url: req.url ?? "", auth: req.headers.authorization, host: req.headers.host, body });
      const url = req.url ?? "";
      if (url === "/ok") return json(res, 200, { id: 7, name: "alpha", items: [{ n: 1 }, { n: 2 }] }, { "x-test": "yes" });
      if (url === "/echo-auth") return json(res, 200, { echoed: req.headers.authorization ?? null });
      if (url === "/items" && req.method === "POST") return json(res, 201, { id: "abc-1", echo: JSON.parse(body || "null") });
      if (url === "/items/abc-1") return json(res, 200, { id: "abc-1", ok: true });
      if (url.startsWith("/items/") && url.includes("sum")) return json(res, 200, { id: "x" });
      if (url === "/search?q=a+b&page=2") return json(res, 200, { hit: true });
      if (url === "/redir") return void (res.writeHead(302, { location: "/ok", "content-length": 0 }), res.end());
      if (url === "/big") {
        res.writeHead(200, { "content-type": "text/plain" });
        const chunk = Buffer.alloc(64 * 1024, 97);
        for (let i = 0; i < 32; i++) res.write(chunk);
        return void res.end();
      }
      if (url === "/slow") {
        slowTimers.add(setTimeout(() => json(res, 200, { late: true }), 3000));
        return;
      }
      if (url === "/token") return json(res, 200, { token: "tok-secret-123456", v: "../x" });
      if (url === "/dot") return json(res, 200, { d: ".", pct: "50%", enc: "%2e" });
      if (url === "/nums") return json(res, 200, { items: Array.from({ length: 40000 }, (_, i) => i) });
      if (url === "/secure") return json(res, req.headers.authorization === "Bearer tok-secret-123456" ? 200 : 401, { ok: req.headers.authorization === "Bearer tok-secret-123456" });
      json(res, 404, { error: "nope" });
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
});

after(async () => {
  for (const t of slowTimers) clearTimeout(t);
  server.closeAllConnections();
  await new Promise<void>((ok) => server.close(() => ok()));
});

const api = (spec: Partial<ApiLabRequest> & Pick<ApiLabRequest, "steps">): Promise<RunResult> => {
  seen = [];
  return checked(new ApiLabProvider().run({ baseUrl: base, ...spec }));
};

test("api: passing steps (status, header, json rules, body text, latency, query, criteria)", async () => {
  const run = await api({
    headers: { Accept: "application/json" },
    steps: [
      { name: "read it", method: "GET", path: "/ok", expect: { status: [200, 201], headerEquals: { "X-Test": "yes" }, json: [{ op: "equals", path: "id", value: 7 }, { op: "gte", path: "items[*].n", value: 1 }], bodyContains: "alpha", maxMs: 5000 }, criteria: ["AC9"] },
      { name: "query", method: "GET", path: "/search", query: { q: "a b", page: "2" }, expect: { status: 200 } },
    ],
  });
  assert.equal(run.provider, "api-lab");
  assert.equal(run.status, "passed");
  assert.deepEqual(run.totals, { passed: 2, failed: 0, skipped: 0, error: 0 });
  assert.deepEqual(run.tests[0]!.criteria, ["AC9"]);
  assert.match(run.tests[0]!.name, /\[ac:AC9\]/);
  assert.equal(run.tests[0]!.suite, "api");
  assert.equal(seen[0]!.host, base.replace("http://", ""), "the Host header is the one Node derives, never user-set");
});

test("api: product failures are product_defect with details; the response excerpt is bounded", async () => {
  const run = await api({
    steps: [
      { name: "wrong status", method: "GET", path: "/nothing", expect: { status: 200 } },
      { name: "wrong json", method: "GET", path: "/ok", expect: { status: 200, json: [{ op: "equals", path: "id", value: 8 }] } },
      { name: "missing text", method: "GET", path: "/ok", expect: { status: 200, bodyContains: "zzz" } },
      { name: "wrong header", method: "GET", path: "/ok", expect: { status: 200, headerEquals: { "x-test": "no" } } },
    ],
  });
  assert.equal(run.status, "failed");
  assert.ok(run.tests.every((t) => t.outcome === "failed" && t.classification === "product_defect"));
  assert.match(run.tests[0]!.error!.message, /status 404, expected 200/);
  assert.match(run.tests[1]!.error!.message, /id is 7, expected 8/);
  assert.ok(run.tests[0]!.evidenceRefs.length === 1);
});

test("api: save and {{variable}} use values from earlier steps only", async () => {
  const run = await api({
    steps: [
      { name: "create", method: "POST", path: "/items", body: { label: "x" }, expect: { status: 201, json: [{ op: "equals", path: "echo.label", value: "x" }] }, save: { itemId: "id" } },
      { name: "read back", method: "GET", path: "/items/{{itemId}}", expect: { status: 200, json: [{ op: "equals", path: "ok", value: true }] } },
      { name: "echo variable in body", method: "POST", path: "/items", body: { ref: "{{itemId}}" }, expect: { status: 201, json: [{ op: "equals", path: "echo.ref", value: "abc-1" }] } },
    ],
  });
  assert.equal(run.status, "passed", JSON.stringify(run.tests.map((t) => t.error)));
  assert.equal(seen[0]!.method, "POST");
  assert.equal(JSON.parse(seen[0]!.body).label, "x");
  assert.equal(seen[1]!.url, "/items/abc-1");
  const spec = (p: string): ApiLabRequest => ({ baseUrl: base, steps: [{ name: "n", method: "GET", path: p, expect: { status: 200 } }] });
  assert.throws(() => new ApiLabProvider().run(spec("/items/{{never}}")), /variable never is not saved by an earlier step/);
  assert.throws(
    () => new ApiLabProvider().run({ baseUrl: base, steps: [{ name: "a", method: "GET", path: "/items/{{later}}", expect: { status: 200 } }, { name: "b", method: "GET", path: "/ok", expect: { status: 200 }, save: { later: "id" } }] }),
    LabSpecError,
    "a variable saved LATER is not available",
  );
});

test("api: a variable whose save failed is an infra error in the next step, and an unsafe substituted path is refused without a request", async () => {
  const run = await api({
    steps: [
      { name: "save a missing field", method: "GET", path: "/ok", expect: { status: 200 }, save: { gone: "nope.nothing" } },
      { name: "uses it", method: "GET", path: "/items/{{gone}}", expect: { status: 200 } },
      { name: "take dotted value", method: "GET", path: "/token", expect: { status: 200 }, save: { dots: "v" } },
      { name: "unsafe once substituted", method: "GET", path: "/items/{{dots}}", expect: { status: 200 } },
    ],
  });
  assert.equal(run.tests[0]!.outcome, "failed");
  assert.match(run.tests[0]!.error!.message, /cannot save gone/);
  assert.equal(run.tests[1]!.outcome, "error");
  assert.equal(run.tests[1]!.classification, "infra");
  assert.equal(run.tests[3]!.outcome, "error");
  assert.equal(run.tests[3]!.classification, "infra");
  assert.match(run.tests[3]!.error!.detail!, /not allowed after variable substitution/);
  assert.deepEqual(seen.map((s) => s.url), ["/ok", "/token"], "neither unsafe step sent a request");
});

test("api: redirects are NOT followed (3xx is reported as is)", async () => {
  const run = await api({
    steps: [
      { name: "redirect seen", method: "GET", path: "/redir", expect: { status: 302, headerEquals: { location: "/ok" } } },
      { name: "redirect is not 200", method: "GET", path: "/redir", expect: { status: 200 } },
    ],
  });
  assert.equal(run.tests[0]!.outcome, "passed");
  assert.equal(run.tests[1]!.outcome, "failed");
  assert.match(run.tests[1]!.error!.message, /status 302/);
  assert.deepEqual(seen.map((s) => s.url), ["/redir", "/redir"], "/ok was never requested");
});

test("api: responses over 1 MiB are cut and marked", async () => {
  const run = await api({
    steps: [
      { name: "big status only", method: "GET", path: "/big", expect: { status: 200 } },
      { name: "big as json", method: "GET", path: "/big", expect: { status: 200, json: [{ op: "exists", path: "a" }] } },
    ],
  });
  assert.equal(run.tests[0]!.outcome, "passed");
  assert.equal(run.tests[1]!.outcome, "failed");
  assert.match(run.tests[1]!.error!.message, /truncated/);
  assert.match(run.evidence[0]!.summary, /truncated at 1 MiB/);
  assert.equal(run.providerData.truncatedBodies, 2);
});

test("api: step timeout is an infra error; the total timeout skips the rest and marks the run timed_out", async () => {
  const t0 = Date.now();
  const run = await api({ stepTimeoutMs: 200, steps: [{ name: "slow", method: "GET", path: "/slow", expect: { status: 200 } }, { name: "fast", method: "GET", path: "/ok", expect: { status: 200 } }] });
  assert.ok(Date.now() - t0 < 2500);
  assert.equal(run.tests[0]!.outcome, "error");
  assert.equal(run.tests[0]!.classification, "infra");
  assert.match(run.tests[0]!.error!.message, /timed out/);
  assert.equal(run.tests[1]!.outcome, "passed");
  assert.equal(run.status, "error");
  const total = await api({ timeoutMs: 300, steps: [{ name: "slow", method: "GET", path: "/slow", expect: { status: 200 } }, { name: "after", method: "GET", path: "/ok", expect: { status: 200 } }] });
  assert.equal(total.status, "timed_out");
  assert.equal(total.tests[0]!.outcome, "error");
  assert.equal(total.tests[1]!.outcome, "skipped");
});

test("api: connection refused is an infra error", async () => {
  const probe = createServer();
  await new Promise<void>((ok) => probe.listen(0, "127.0.0.1", ok));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((ok) => probe.close(() => ok()));
  const run = await checked(new ApiLabProvider().run({ baseUrl: `http://127.0.0.1:${port}`, steps: [{ name: "down", method: "GET", path: "/ok", expect: { status: 200 } }] }));
  assert.equal(run.tests[0]!.outcome, "error");
  assert.equal(run.tests[0]!.classification, "infra");
});

test("api: the Authorization value never appears in evidence, errors or provider data", async () => {
  const token = "tok-secret-123456";
  const run = await api({
    headers: { Authorization: `Bearer ${token}` },
    steps: [
      { name: "server echoes the header", method: "GET", path: "/echo-auth", expect: { status: 200, bodyContains: "never-present" } },
      { name: "echo json rule", method: "GET", path: "/echo-auth", expect: { status: 200, json: [{ op: "equals", path: "echoed", value: "x" }] } },
    ],
  });
  assert.equal(seen[0]!.auth, `Bearer ${token}`, "the header is really sent");
  const dump = JSON.stringify(run);
  assert.ok(!dump.includes(token), dump);
  assert.ok(dump.includes("[gizli]"));
  assert.equal(run.tests[0]!.outcome, "failed");
});

test("api: a token obtained from a response and used in Authorization is masked everywhere, even in the step that revealed it", async () => {
  const run = await api({
    steps: [
      { name: "login", method: "GET", path: "/token", expect: { status: 200, bodyContains: "never-present" }, save: { tok: "token" } },
      { name: "use it", method: "GET", path: "/secure", headers: { authorization: "Bearer {{tok}}" }, expect: { status: 200, json: [{ op: "equals", path: "ok", value: false }] } },
    ],
  });
  assert.equal(seen[1]!.auth, "Bearer tok-secret-123456");
  assert.ok(!JSON.stringify(run).includes("tok-secret-123456"), JSON.stringify(run));
});

test("api: unsafe targets, paths, headers and limits are rejected before any request", async () => {
  const step = { name: "s", method: "GET" as const, path: "/ok", expect: { status: 200 } };
  const p = new ApiLabProvider();
  for (const baseUrl of ["http://example.com:80", "https://127.0.0.1:443", "http://127.0.0.1", "http://localhost", "http://127.0.0.1:0", "http://127.0.0.1:70000", "http://127.0.0.1.evil.com:80", "http://127.0.0.1:80@evil.com:80", "http://user@127.0.0.1:80", "http://127.0.0.2:80", "http://0.0.0.0:80", "http://LOCALHOST:80", "http://127.0.0.1:80/api", "http://[::1]", "ftp://127.0.0.1:21", "//127.0.0.1:80", "http://127.0.0.1:80?x=1"]) assert.throws(() => p.run({ baseUrl, steps: [step] }), LabSpecError, baseUrl);
  for (const path of ["ok", "/a/../b", "/a\\b", "//evil.com/x", "/a//b", "/a b", "/a\nb", "/a%2e%2e/b", "/a%2Fb", "/a%5cb", "/x?y=1", "/x#f", "/..", "/\u0000", "", "/a%252e%252e/b", "/a%25", "/a/./b", "/./", "/a/."]) assert.throws(() => p.run({ baseUrl: base, steps: [{ ...step, path }] }), LabSpecError, JSON.stringify(path));
  const badHeaders: Array<Record<string, string>> = [{ Host: "evil.com" }, { host: "x" }, { Cookie: "a=b" }, { "X-Other": "1" }, { Accept: "a\r\nX-Injected: 1" }, { Accept: "a", accept: "b" }];
  for (const headers of badHeaders) {
    assert.throws(() => p.run({ baseUrl: base, headers, steps: [step] }), LabSpecError, JSON.stringify(headers));
    assert.throws(() => p.run({ baseUrl: base, steps: [{ ...step, headers }] }), LabSpecError, JSON.stringify(headers));
  }
});

test("api: allowed headers pass; method, body, query, step count and timeout limits", async () => {
  const p = new ApiLabProvider();
  const step = { name: "s", method: "GET" as const, path: "/ok", expect: { status: 200 } };
  for (const h of ["accept", "Content-Type", "authorization", "x-request-id", "if-none-match", "idempotency-key"]) {
    const run = await checked(p.run({ baseUrl: base, headers: { [h]: "v" }, steps: [step] }));
    assert.equal(run.status, "passed", h);
  }
  assert.throws(() => p.run({ baseUrl: base, steps: [{ ...step, method: "TRACE" as never }] }), LabSpecError);
  assert.throws(() => p.run({ baseUrl: base, steps: [{ ...step, body: { a: 1 } }] }), /cannot have a body/);
  assert.throws(() => p.run({ baseUrl: base, steps: [{ ...step, method: "POST", body: "x".repeat(70 * 1024) }] }), LabSpecError);
  assert.throws(() => p.run({ baseUrl: base, steps: [{ ...step, query: { "bad key": "1" } }] }), LabSpecError);
  assert.throws(() => p.run({ baseUrl: base, steps: [{ ...step, expect: { status: 99 } }] }), LabSpecError);
  assert.throws(() => p.run({ baseUrl: base, steps: [{ ...step, expect: { status: 200, json: [{ op: "matches", path: "a", value: "x" } as never] } }] }), LabSpecError);
  assert.throws(() => p.run({ baseUrl: base, steps: [{ ...step, save: { "bad name": "id" } }] }), LabSpecError);
  assert.throws(() => p.run({ baseUrl: base, steps: [{ ...step, save: { ok: "list[*].id" } }] }), LabSpecError);
  assert.throws(() => p.run({ baseUrl: base, steps: Array.from({ length: 41 }, () => step) }), LabSpecError);
  assert.throws(() => p.run({ baseUrl: base, steps: [] }), LabSpecError);
  assert.throws(() => p.run({ baseUrl: base, steps: [step], stepTimeoutMs: 10_001 }), LabSpecError);
  assert.throws(() => p.run({ baseUrl: base, steps: [step], timeoutMs: 60_001 }), LabSpecError);
  assert.doesNotThrow(() => p.run({ baseUrl: base, steps: Array.from({ length: 40 }, () => step), stepTimeoutMs: 10_000, timeoutMs: 60_000 }).cancel());
  assert.throws(() => p.run({ baseUrl: base, steps: [step], extra: 1 } as never), LabSpecError);
});

test("api: localhost is accepted as a host", async () => {
  const port = base.split(":")[2];
  const run = await checked(new ApiLabProvider().run({ baseUrl: `http://localhost:${port}`, steps: [{ name: "via localhost", method: "GET", path: "/ok", expect: { status: 200 } }] }));
  assert.ok(run.status === "passed" || run.tests[0]!.classification === "infra", "either reachable, or an infra error when localhost resolves elsewhere");
});

// ---------- birleşik laboratuvar ----------

test("runLab: dispatch by kind, unknown kind and invalid specs are LabSpecError, summarizeRuns counts", async () => {
  assert.deepEqual([...LAB_KINDS], ["api", "contracts", "state", "a11y", "design"]);
  const a = await runLab("contracts", { subject: { x: 1 }, contracts: [{ name: "x is 1", kind: "invariant", rule: { op: "equals", path: "x", value: 1 } }, { name: "x is 2", kind: "invariant", rule: { op: "equals", path: "x", value: 2 } }] });
  const b = await runLab("state", { machine: GOOD });
  seen = [];
  const c = await runLab("api", { baseUrl: base, steps: [{ name: "ok", method: "GET", path: "/ok", expect: { status: 200 } }] });
  assert.deepEqual([a.provider, b.provider, c.provider], ["contracts-lab", "state-lab", "api-lab"]);
  const s = summarizeRuns([a, b, c]);
  assert.equal(s.total, 2 + 6 + 1);
  assert.equal(s.passed, 1 + 6 + 1);
  assert.equal(s.failed, 1);
  assert.equal(s.error, 0);
  assert.equal(s.skipped, 0);
  assert.deepEqual(s.byProvider["contracts-lab"], { total: 2, passed: 1, failed: 1, error: 0, skipped: 0 });
  assert.equal(s.byProvider["api-lab"]!.total, 1);
  assert.deepEqual(summarizeRuns([]), { total: 0, passed: 0, failed: 0, error: 0, skipped: 0, byProvider: {} });
  await assert.rejects(runLab("shell", {}), LabSpecError);
  await assert.rejects(runLab("contracts", undefined), LabSpecError);
  await assert.rejects(runLab("state", { machine: {} }), LabSpecError);
  await assert.rejects(runLab("api", { baseUrl: "http://example.com:80", steps: [] }), LabSpecError);
});

// ---------- güvenlik denetimi düzeltmeleri (A1-A4) ----------

const UNIQUE_199 = { all: Array.from({ length: 199 }, () => ({ op: "unique", path: "items" })) };

test("rules: unique is linear (10000 items x 199 unique nodes finishes quickly) and keeps deepEq semantics", () => {
  const items = Array.from({ length: 10_000 }, (_, i) => i);
  const t0 = Date.now();
  assert.equal(rule(UNIQUE_199, { items }).ok, true);
  assert.ok(Date.now() - t0 < 10000, `took ${Date.now() - t0} ms`);
  // eşitlik anlamı: anahtar sırası önemsiz, tür farkı önemli, key ile alan seçimi
  assert.equal(rule({ op: "unique", path: "l" }, { l: [{ a: 1, b: [2] }, { b: [2], a: 1 }] }).ok, false);
  assert.equal(rule({ op: "unique", path: "l" }, { l: [1, "1", true, null, [1], { x: 1 }] }).ok, true);
  assert.equal(rule({ op: "unique", path: "l" }, { l: [[1, 2], [2, 1]] }).ok, true);
  const d = rule({ op: "unique", path: "l", key: "id" }, { l: [{ id: 1, v: 1 }, { id: 2, v: 1 }, { id: 1, v: 9 }] });
  assert.equal(d.ok, false);
  assert.match(d.detail, /duplicate: 1 at \[0\] and \[2\]/);
  assert.equal(rule({ op: "unique", path: "l", key: "id" }, { l: [{ v: 1 }, { v: 2 }] }).ok, false, "two missing keys are equal (undefined)");
});

test("rules: evaluation budget and deadline fail cleanly (RuleBudgetError)", () => {
  const items = Array.from({ length: 5000 }, (_, i) => i);
  assert.throws(() => evaluateRule(validateRule({ op: "unique", path: "items" }), { items }, { maxSteps: 100 }), (e: unknown) => e instanceof RuleBudgetError && /kural değerlendirme bütçesi aşıldı/.test(e.message));
  assert.throws(() => evaluateRule(validateRule({ op: "unique", path: "items" }), { items }, { deadline: Date.now() - 1 }), RuleBudgetError);
  assert.equal(evaluateRule(validateRule({ op: "unique", path: "items" }), { items }, { maxSteps: 100_000, deadline: Date.now() + 10_000 }).ok, true);
  // sorted / sumEqualsPath / contains / in da bütçeye tabidir
  for (const r of [{ op: "sorted", path: "items" }, { op: "sumEqualsPath", path: "items", path2: "total" }, { op: "contains", path: "items", value: -1 }]) {
    assert.throws(() => evaluateRule(validateRule(r), { items, total: 1 }, { maxSteps: 50 }), RuleBudgetError, JSON.stringify(r));
  }
});

test("contracts: a rule that exceeds the evaluation budget becomes an infra error for that contract only", async () => {
  const items = Array.from({ length: 40_000 }, (_, i) => i);
  const run = await checked(
    new ContractsLabProvider().run({
      subject: { items },
      contracts: [
        { name: "too expensive", kind: "invariant", rule: UNIQUE_199 },
        { name: "cheap", kind: "invariant", rule: { op: "exists", path: "items" } },
      ],
    }),
  );
  assert.equal(run.tests[0]!.outcome, "error");
  assert.equal(run.tests[0]!.classification, "infra");
  assert.match(run.tests[0]!.error!.detail ?? "", /bütçesi aşıldı/);
  assert.equal(run.tests[1]!.outcome, "passed");
  assert.equal(run.status, "error");
});

test("api: response rules share the evaluation budget (infra error, not a hang)", async () => {
  const run = await api({ steps: [{ name: "heavy response rule", method: "GET", path: "/nums", expect: { status: 200, json: [UNIQUE_199 as never] } }] });
  assert.equal(run.tests[0]!.outcome, "error");
  assert.equal(run.tests[0]!.classification, "infra");
  assert.match(run.tests[0]!.error!.detail ?? "", /bütçesi aşıldı/);
});

test("api: the response excerpt is masked BEFORE it is cut, and secrets learned later are masked in earlier steps", async () => {
  const secret = "k".repeat(190);
  const run = await api({
    headers: { Authorization: `Bearer ${secret}` },
    steps: [{ name: "long secret near the cut", method: "GET", path: "/echo-auth", expect: { status: 200, bodyContains: "never-present" } }],
  });
  const dump = JSON.stringify(run);
  assert.ok(!dump.includes("kkkkkkkkkkkk"), "no fragment of the secret survives the 200-character cut");
  assert.ok(dump.includes("[gizli]"));

  // Önceki adımın alıntısı sonradan (save ile) öğrenilen değeri içeriyor: tüm rapor yeniden maskelenir.
  const later = await api({
    steps: [
      { name: "reveals a token but fails", method: "GET", path: "/token", expect: { status: 200, bodyContains: "never-present" } },
      { name: "learns the token", method: "GET", path: "/token", expect: { status: 200 }, save: { learned: "token" } },
    ],
  });
  assert.equal(later.tests[0]!.outcome, "failed");
  assert.ok(!JSON.stringify(later).includes("tok-secret-123456"), JSON.stringify(later.tests[0]));
  assert.ok(later.tests[0]!.error!.detail!.includes("[gizli]"));
  // bir Bearer belirteci (kayıtlı değer olmasa da) alıntıda görünmez
  const bearer = await api({ headers: { Authorization: "Bearer abc.def-ghi123" }, steps: [{ name: "echo", method: "GET", path: "/echo-auth", expect: { status: 200, json: [{ op: "equals", path: "echoed", value: "Bearer zzz" }] } }] });
  assert.ok(!JSON.stringify(bearer).includes("abc.def-ghi123"));
});

test("api: double-encoded and single-dot paths are refused before and after variable substitution", async () => {
  const run = await api({
    steps: [
      { name: "take values", method: "GET", path: "/dot", expect: { status: 200 }, save: { d: "d", pct: "pct", enc: "enc" } },
      { name: "dot segment", method: "GET", path: "/items/{{d}}/x", expect: { status: 200 } },
      { name: "percent", method: "GET", path: "/items/{{pct}}", expect: { status: 200 } },
      { name: "encoded dot", method: "GET", path: "/items/{{enc}}", expect: { status: 200 } },
    ],
  });
  assert.equal(run.tests[0]!.outcome, "passed");
  for (const i of [1, 2, 3]) {
    assert.equal(run.tests[i]!.outcome, "error", `step ${i}`);
    assert.equal(run.tests[i]!.classification, "infra");
  }
  assert.deepEqual(seen.map((s) => s.url), ["/dot"], "no request was sent for the refused paths");
});

test("api: forbiddenPorts rejects a target on a forbidden port (spec stage)", () => {
  const port = Number(base.split(":")[2]);
  const spec: ApiLabRequest = { baseUrl: base, steps: [{ name: "n", method: "GET", path: "/ok", expect: { status: 200 } }] };
  assert.throws(() => new ApiLabProvider().run(spec, { forbiddenPorts: [port] }), /kendi portu/);
  assert.doesNotThrow(() => new ApiLabProvider().run(spec, { forbiddenPorts: [port + 1] }).cancel());
  return assert.rejects(runLab("api", spec, { forbiddenPorts: [port] }), LabSpecError);
});

test("runLab: an aborted signal cancels an api run (remaining steps are skipped)", async () => {
  const ac = new AbortController();
  const spec: ApiLabRequest = { baseUrl: base, steps: [{ name: "slow", method: "GET", path: "/slow", expect: { status: 200 } }, { name: "never", method: "GET", path: "/ok", expect: { status: 200 } }] };
  const p = runLab("api", spec, { signal: ac.signal });
  setTimeout(() => ac.abort(), 100);
  const run = await p;
  assert.equal(run.status, "cancelled");
  assert.ok(run.tests.every((t) => t.outcome === "skipped"));
});
