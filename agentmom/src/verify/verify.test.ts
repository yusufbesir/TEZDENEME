import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { classifyFailure } from "./classify.ts";
import { checkEvidenceFile, saveEvidence, sha256Of } from "./evidence-files.ts";
import { parseJunit } from "./junit.ts";
import { LocalTestProvider, validateTestFiles } from "./local-tests.ts";
import { criteriaFor } from "./provider.ts";
import { SchemaError, VERIFY_SCHEMA_VERSION, totalsOf, validateRunResult } from "./schema.ts";
import type { RunResult, TestResult } from "./schema.ts";

const FAKE_KEY = "sk-" + "Jj1Kk2Ll3Mm4Nn5Oo6Pp7Qq8";

function workspace(files: Record<string, string>): string {
  const dir = mkTmp("agentmom-vt-");
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
}

const HEAD = 'import { test } from "node:test";\nimport assert from "node:assert/strict";\n';

function req(cwd: string, files: string[], over: Record<string, unknown> = {}) {
  return { cwd, files, timeoutMs: 20_000, evidenceDir: mkTmp("agentmom-ev-"), ...over };
}

function t(over: Partial<TestResult> = {}): TestResult {
  return { id: "t1", suite: null, name: "x", outcome: "passed", durationMs: 1, error: null, criteria: [], classification: null, evidenceRefs: [], attempts: 1, ...over };
}

function run(over: Partial<RunResult> = {}): RunResult {
  return {
    schemaVersion: VERIFY_SCHEMA_VERSION,
    runId: "r1",
    provider: "local-tests",
    startedAt: "2026-10-21T00:00:00.000Z",
    endedAt: "2026-10-21T00:00:01.000Z",
    durationMs: 1000,
    status: "passed",
    tests: [t()],
    evidence: [],
    totals: { passed: 1, failed: 0, skipped: 0, error: 0 },
    environment: { node: "v24", platform: "win32" },
    providerData: {},
    ...over,
  };
}

// ---------- schema ----------

test("schema: a valid result passes and totals are computed", () => {
  assert.equal(validateRunResult(run()).runId, "r1");
  assert.deepEqual(totalsOf([t(), t({ id: "b", outcome: "skipped" }), t({ id: "c", outcome: "failed", error: { message: "m" }, classification: "product_defect" })]), { passed: 1, failed: 1, skipped: 1, error: 0 });
});

test("schema: rejects failures without classification or error, stray classifications, duplicate ids and dangling evidence refs", () => {
  const bad = (r: RunResult): string => {
    try {
      validateRunResult(r);
    } catch (err) {
      return err instanceof SchemaError ? err.problems.join(" | ") : "other";
    }
    return "none";
  };
  assert.match(bad(run({ tests: [t({ outcome: "failed", error: { message: "m" } })] })), /without a classification/);
  assert.match(bad(run({ tests: [t({ outcome: "failed", classification: "flaky" })] })), /without an error/);
  assert.match(bad(run({ tests: [t({ classification: "flaky" })] })), /did not fail/);
  assert.match(bad(run({ tests: [t(), t()] })), /duplicate test id/);
  assert.match(bad(run({ tests: [t({ evidenceRefs: ["nope"] })] })), /unknown evidence/);
  assert.match(bad({ ...run(), schemaVersion: 2 as never }), /schemaVersion/);
  assert.match(bad({ ...run(), status: "weird" as never }), /status is invalid/);
});

// ---------- classification ----------

test("classification: infra, flaky, environment, product defect, in that order", () => {
  assert.equal(classifyFailure({ message: "x", runLevel: "timeout" }), "infra");
  assert.equal(classifyFailure({ message: "AssertionError", passedOnRetry: true }), "flaky");
  assert.equal(classifyFailure({ message: "ENOENT: no such file" }), "environment");
  assert.equal(classifyFailure({ message: "connect ECONNREFUSED 127.0.0.1:1" }), "environment");
  assert.equal(classifyFailure({ message: "Cannot find module 'left-pad'" }), "environment");
  assert.equal(classifyFailure({ message: "Expected values to be strictly equal:\n1 !== 2" }), "product_defect");
  assert.equal(classifyFailure({ message: "something unexplained" }), "product_defect", "unexplained failures fail closed");
});

// ---------- junit / criteria / evidence files ----------

test("junit: suites, skips, failures with entities and CDATA are parsed", () => {
  const xml = `<testsuites><testsuite name="outer"><testcase name="a &amp; b" time="0.5" file="D:\\x\\a.test.mjs"/><testsuite name="inner">
<testcase name="bad" time="0.01"><failure type="x" message="1 !== 2 &#10;more"><![CDATA[stack here]]></failure></testcase></testsuite>
<testcase name="later" time="0"><skipped type="skipped" message="todo"/></testcase></testsuite></testsuites>`;
  const cases = parseJunit(xml);
  assert.deepEqual(cases.map((c) => [c.suite, c.name, c.outcome]), [["outer", "a & b", "passed"], ["outer > inner", "bad", "failed"], ["outer", "later", "skipped"]]);
  assert.equal(cases[0]!.timeMs, 500);
  assert.match(cases[1]!.message ?? "", /1 !== 2 \nmore/);
  assert.equal(cases[1]!.detail, "stack here");
});

test("criteria mapping: [ac:id] tags and explicit maps, both explicit, nothing inferred", () => {
  assert.deepEqual(criteriaFor("[ac:c1] [ac:c2] does things"), ["c1", "c2"]);
  assert.deepEqual(criteriaFor("greeting file exists", { c3: ["greeting file"] }), ["c3"]);
  assert.deepEqual(criteriaFor("unrelated test", { c3: ["greeting file"] }), []);
  assert.deepEqual(criteriaFor("[ac:bad id] x"), []);
});

test("evidence files: hashed, written once, tampering and loss are detected", () => {
  const dir = mkTmp("agentmom-ev-");
  const item = saveEvidence(dir, "log1", "log", "a log", "hello\n", "log");
  assert.equal(item.sha256, sha256Of("hello\n"));
  assert.equal(checkEvidenceFile(item), null);
  assert.throws(() => saveEvidence(dir, "log1", "log", "again", "other", "log"), /EEXIST/);
  writeFileSync(item.path!, "tampered\n");
  assert.match(checkEvidenceFile(item) ?? "", /size changed|hash mismatch/);
  writeFileSync(item.path!, "hello!!\n");
  assert.match(checkEvidenceFile(item) ?? "", /hash mismatch|size changed/);
  assert.match(checkEvidenceFile({ ...item, path: join(dir, "gone.log") }) ?? "", /missing/);
  const empty = saveEvidence(dir, "e", "log", "empty", "x", "log");
  writeFileSync(empty.path!, "");
  assert.match(checkEvidenceFile(empty) ?? "", /empty/);
});

test("test file validation: relative, existing, named like a test", () => {
  const ws = workspace({ "a.test.mjs": HEAD });
  assert.deepEqual(validateTestFiles(ws, ["a.test.mjs"]), ["a.test.mjs"]);
  for (const bad of ["../x.test.mjs", "/abs.test.mjs", "C:/x.test.mjs", "a.mjs", "missing.test.mjs"]) assert.throws(() => validateTestFiles(ws, [bad]), Error, bad);
  assert.throws(() => validateTestFiles(ws, []), /1 to 100/);
});

// ---------- local test provider (really runs node --test) ----------

test("local tests: a passing and a failing run become structured, classified, evidence-backed results", async () => {
  const ws = workspace({
    "ok.test.mjs": `${HEAD}test("[ac:c1] adds", () => { assert.equal(1 + 1, 2); });\ntest("[ac:c2] skipped for now", { skip: "later" }, () => {});\n`,
    "bad.test.mjs": `${HEAD}test("[ac:c3] multiplies", () => { assert.equal(2 * 2, 5); });\n`,
  });
  const r = await new LocalTestProvider().run(req(ws, ["ok.test.mjs", "bad.test.mjs"])).result;
  validateRunResult(r);
  assert.equal(r.status, "failed");
  assert.deepEqual(r.totals, { passed: 1, failed: 1, skipped: 1, error: 0 });
  const bad = r.tests.find((x) => x.name.includes("multiplies"))!;
  assert.equal(bad.classification, "product_defect");
  assert.deepEqual(bad.criteria, ["c3"]);
  assert.match(bad.error?.message ?? "", /4 !== 5/);
  assert.ok(bad.evidenceRefs.length >= 1);
  for (const e of r.evidence) assert.equal(checkEvidenceFile(e), null);
  assert.equal(r.tests.find((x) => x.name.includes("adds"))!.criteria[0], "c1");
  assert.equal((r.providerData.exitCodes as Record<string, number>)["bad.test.mjs"], 1);
  assert.equal(r.providerData.processPerFile, true);
});

test("local tests: an all-green run is status passed with no classifications", async () => {
  const ws = workspace({ "ok.test.mjs": `${HEAD}test("[ac:c1] fine", () => {});\n` });
  const r = await new LocalTestProvider().run(req(ws, ["ok.test.mjs"])).result;
  assert.equal(r.status, "passed");
  assert.ok(r.tests.every((x) => x.classification === null));
});

test("local tests: a missing file at runtime is an environment failure, not a product defect", async () => {
  const ws = workspace({ "env.test.mjs": `${HEAD}import { readFileSync } from "node:fs";\ntest("[ac:c1] reads config", () => { readFileSync("does-not-exist.cfg"); });\n` });
  const r = await new LocalTestProvider().run(req(ws, ["env.test.mjs"])).result;
  assert.equal(r.tests[0]!.classification, "environment");
});

test("local tests: flaky is detected by retrying only the failed files (fail once, then pass)", async () => {
  const ws = workspace({
    "flaky.test.mjs": `${HEAD}import { existsSync, writeFileSync } from "node:fs";\nimport { tmpdir } from "node:os";\nimport { join } from "node:path";\nconst flag = join(tmpdir(), "seen.flag");\ntest("[ac:c1] flaky one", () => { if (!existsSync(flag)) { writeFileSync(flag, "1"); assert.fail("first time fails"); } });\n`,
    "steady.test.mjs": `${HEAD}test("[ac:c2] steady", () => {});\n`,
  });
  const r = await new LocalTestProvider().run(req(ws, ["flaky.test.mjs", "steady.test.mjs"], { retryFailures: true })).result;
  const f = r.tests.find((x) => x.name.includes("flaky one"))!;
  assert.equal(f.outcome, "failed", "a flaky test is never reported as a clean pass");
  assert.equal(f.classification, "flaky");
  assert.equal(f.attempts, 2);
  assert.equal(r.status, "failed");
  assert.equal(r.tests.find((x) => x.name.includes("steady"))!.attempts, 1);
});

test("local tests: a consistently failing test stays a product defect after the retry", async () => {
  const ws = workspace({ "bad.test.mjs": `${HEAD}test("[ac:c1] always fails", () => { assert.equal(1, 2); });\n` });
  const r = await new LocalTestProvider().run(req(ws, ["bad.test.mjs"], { retryFailures: true })).result;
  assert.equal(r.tests[0]!.classification, "product_defect");
  assert.equal(r.tests[0]!.attempts, 2);
});

test("local tests: a hanging run is killed at the timeout and classified infra", async () => {
  const ws = workspace({ "hang.test.mjs": `${HEAD}test("[ac:c1] never ends", async () => { await new Promise(() => setInterval(() => {}, 1000)); });\n` });
  const t0 = Date.now();
  const r = await new LocalTestProvider().run(req(ws, ["hang.test.mjs"], { timeoutMs: 1500 })).result;
  assert.equal(r.status, "timed_out");
  assert.equal(r.tests[0]!.classification, "infra");
  assert.match(r.tests[0]!.error?.message ?? "", /exceeded 1500 ms/);
  assert.ok(Date.now() - t0 < 15_000);
  validateRunResult(r);
});

test("local tests: cancellation stops the run and is recorded as cancelled", async () => {
  const ws = workspace({ "hang.test.mjs": `${HEAD}test("[ac:c1] never ends", async () => { await new Promise(() => setInterval(() => {}, 1000)); });\n` });
  const h = new LocalTestProvider().run(req(ws, ["hang.test.mjs"], { timeoutMs: 60_000 }));
  await new Promise((r) => setTimeout(r, 700));
  await h.cancel();
  const r = await h.result;
  assert.equal(r.status, "cancelled");
  assert.equal(r.tests[0]!.classification, "infra");
});

test("local tests: secrets in test output are masked in results and evidence files", async () => {
  const ws = workspace({ "leak.test.mjs": `${HEAD}test("[ac:c1] leaks", () => { assert.fail("token ${FAKE_KEY} leaked"); });\n` });
  const r = await new LocalTestProvider().run(req(ws, ["leak.test.mjs"])).result;
  const all = JSON.stringify(r) + r.evidence.map((e) => readFileSync(e.path!, "utf8")).join("");
  assert.ok(!all.includes(FAKE_KEY));
});

test("local tests run under Node's permission model: outside reads, workspace writes and process spawning are denied; scratch writes work", async () => {
  const outside = workspace({ "secret.txt": "TOP-SECRET-OUTSIDE" });
  const ws = workspace({
    "perm.test.mjs": `${HEAD}import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("[ac:c1] can read its own workspace", () => { assert.ok(readFileSync(new URL(import.meta.url)).length > 0); });
test("[ac:c2] can write the scratch dir", () => { writeFileSync(join(tmpdir(), "ok.txt"), "x"); });
test("[ac:c3] outside read", () => { readFileSync(${JSON.stringify(join(outside, "secret.txt"))}); });
test("[ac:c4] workspace write", () => { writeFileSync("new-file.txt", "x"); });
test("[ac:c5] spawn", () => { spawnSync("cmd", ["/c", "echo hi"]); });
`,
  });
  const r = await new LocalTestProvider().run(req(ws, ["perm.test.mjs"])).result;
  const by = (c: string) => r.tests.find((x) => x.criteria.includes(c))!;
  assert.equal(by("c1").outcome, "passed");
  assert.equal(by("c2").outcome, "passed");
  for (const c of ["c3", "c4", "c5"]) {
    assert.equal(by(c).outcome, "failed", c);
    assert.match(by(c).error?.message ?? "", /restricted|ERR_ACCESS_DENIED/, c);
    assert.equal(by(c).classification, "environment", c);
  }
  assert.ok(!JSON.stringify(r).includes("TOP-SECRET-OUTSIDE"));
});

test("local tests: a TypeScript test file runs under the permission model", async () => {
  const ws = workspace({ "ts.test.ts": `${HEAD}test("[ac:c1] typed", () => { const n: number = 2; assert.equal(n * 2, 4); });\n` });
  const r = await new LocalTestProvider().run(req(ws, ["ts.test.ts"])).result;
  assert.equal(r.status, "passed", JSON.stringify(r.tests));
});

// ---------- hardening after the independent security review ----------

test("a test file cannot forge results for OTHER files: each file runs in its own process and speaks only for itself", async () => {
  const forged = '<testsuites><testcase name="[ac:c1] real behavior" time="0.001"/></testsuites>';
  const ws = workspace({
    "real.test.mjs": `${HEAD}test("[ac:c1] real behavior", () => { assert.equal(1, 2); });\n`,
    "evil.test.mjs": `process.stdout.write(${JSON.stringify(forged)} + "\\n");\nprocess.exit(0);\n`,
  });
  const r = await new LocalTestProvider().run(req(ws, ["real.test.mjs", "evil.test.mjs"])).result;
  const real = r.tests.find((x) => x.name === "[ac:c1] real behavior" && x.outcome === "failed");
  assert.ok(real, "the genuine failure of real.test.mjs is still reported");
  assert.equal(real!.classification, "product_defect");
  assert.equal(r.status, "failed");
});

test("results that disagree with the exit code are not trusted (exit 0 with failures, exit 1 without; an empty file covers nothing)", async () => {
  const failXml = '<testsuites><testcase name="x" time="0"><failure message="m"/></testcase></testsuites>';
  const passXml = '<testsuites><testcase name="y" time="0"/></testsuites>';
  const ws = workspace({
    "a.test.mjs": `process.stdout.write(${JSON.stringify(failXml)});\nprocess.exit(0);\n`,
    "b.test.mjs": `process.stdout.write(${JSON.stringify(passXml)});\nprocess.exit(1);\n`,
    "c.test.mjs": `// no tests at all\n`,
  });
  const r = await new LocalTestProvider().run(req(ws, ["a.test.mjs", "b.test.mjs", "c.test.mjs"])).result;
  assert.equal(r.status, "error");
  const bad = r.tests.filter((x) => x.id.startsWith("file:"));
  assert.equal(bad.length, 2);
  assert.ok(bad.every((x) => x.outcome === "error" && x.classification === "infra"));
  assert.match(bad.map((x) => x.error?.message).join(" | "), /exited 0 but reported failing/);
  assert.match(bad.map((x) => x.error?.message).join(" | "), /exited 1 but reported no failing/);
  const empty = r.tests.find((x) => x.name.includes("c.test.mjs"))!;
  assert.deepEqual(empty.criteria, [], "a file without tests only shows up as a bare file entry that covers no criterion");
});

test("a workspace containing a symlink/junction is refused before anything runs", async () => {
  const outside = workspace({ "secret.txt": "TOP-SECRET-OUTSIDE" });
  const ws = workspace({ "ok.test.mjs": `${HEAD.replace('import { greet } from "./greeting.mjs";\n', "")}test("[ac:c1] fine", () => {});\n` });
  symlinkSync(outside, join(ws, "link-to-outside"), "junction");
  const r = await new LocalTestProvider().run(req(ws, ["ok.test.mjs"])).result;
  assert.equal(r.status, "error");
  assert.equal(r.tests[0]!.name, "workspace");
  assert.equal(r.tests[0]!.classification, "environment");
  assert.match(r.tests[0]!.error?.message ?? "", /symlink\/junction/);
  assert.ok(!r.tests.some((x) => x.outcome === "passed"), "no test was executed");
});

test("test file names cannot smuggle node options", () => {
  const ws = workspace({ "--test-reporter=x.test.mjs": "", "ok.test.mjs": "" });
  for (const bad of ["--test-reporter=x.test.mjs", "sub/-x.test.mjs", "-x.test.mjs"]) assert.throws(() => validateTestFiles(ws, [bad]), Error, bad);
});

test("secrets in test names are masked and names are length-capped", async () => {
  const long = "x".repeat(500);
  const ws = workspace({ "n.test.mjs": `${HEAD}test("[ac:c1] key ${FAKE_KEY} ${long}", () => { assert.equal(1, 2); });\n` });
  const r = await new LocalTestProvider().run(req(ws, ["n.test.mjs"])).result;
  assert.ok(!JSON.stringify(r).includes(FAKE_KEY));
  assert.ok(r.tests[0]!.name.length <= 200);
});

test("link scan covers a .git directory, hard links and the scratch dir; links created between files are caught before the next process starts", async () => {
  const outside = workspace({ "secret.txt": "TOP-SECRET-OUTSIDE" });
  const ws = workspace({ "ok.test.mjs": `${HEAD.replace('import { greet } from "./greeting.mjs";\n', "")}test("[ac:c1] fine", () => {});\n` });
  mkdirSync(join(ws, ".git"));
  symlinkSync(outside, join(ws, ".git", "sneaky"), "junction");
  const r = await new LocalTestProvider().run(req(ws, ["ok.test.mjs"])).result;
  assert.equal(r.tests[0]!.name, "workspace", "a link hidden inside a .git directory is found");
  assert.ok(!r.tests.some((x) => x.outcome === "passed"));
});

test("a test file cannot plant a link in the workspace (the permission model denies the write), and later files still run normally", async () => {
  const outside = workspace({ "secret.txt": "TOP-SECRET-OUTSIDE" });
  const ws = workspace({
    "a.test.mjs": `import { test } from "node:test";
import { symlinkSync } from "node:fs";
test("[ac:c1] tries to plant a link", () => { symlinkSync(${JSON.stringify(outside)}, "planted", "junction"); });
`,
    "b.test.mjs": `import { test } from "node:test";
test("[ac:c2] second", () => {});
`,
  });
  const r = await new LocalTestProvider().run(req(ws, ["a.test.mjs", "b.test.mjs"])).result;
  const a = r.tests.find((x) => x.name === "[ac:c1] tries to plant a link")!;
  assert.equal(a.outcome, "failed");
  assert.match(a.error?.message ?? "", /restricted|ERR_ACCESS_DENIED|requires full fs/);
  assert.equal(a.classification, "environment");
  assert.equal(r.tests.find((x) => x.name === "[ac:c2] second")!.outcome, "passed");
  assert.equal(existsSync(join(ws, "planted")), false);
});
