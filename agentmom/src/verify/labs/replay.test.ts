// Hata oynatma paketi testleri (madde 60). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Gerçek sağlayıcı koşuları (sözleşme laboratuvarı) ve gerçek kanıt dosyalarıyla; süreç başlatma, ağ, tarayıcı yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { mkTmp } from "../../testing/tmp.ts";
import { attachLabLog } from "../../workflows/lab-runs.ts";
import { validateVerification } from "../../workflows/types.ts";
import type { VerificationPlan } from "../../workflows/types.ts";
import { validateRunResult } from "../schema.ts";
import type { RunResult } from "../schema.ts";
import { ContractsLabProvider } from "./contracts.ts";
import { MAX_REPLAY_BYTES, REPLAY_SCHEMA, buildReplayBundle, verifyReplayBundle } from "./replay.ts";
import { mkRun, mkTest } from "./rules.ts";

const CONTRACTS = [
  { name: "x is one", kind: "invariant", rule: { op: "equals", path: "x", value: 1 }, criteria: ["c1"] },
  { name: "x is two", kind: "invariant", rule: { op: "equals", path: "x", value: 2 }, criteria: ["c2"] },
];
const plan = (extra: Record<string, unknown> = {}): VerificationPlan => validateVerification({ contracts: { subjectFile: "out.json", contracts: CONTRACTS }, ...extra });

async function failedRun(): Promise<{ run: RunResult; dir: string }> {
  const dir = mkTmp("agentmom-replay-");
  const run = await new ContractsLabProvider().run({ subject: { x: 1 }, contracts: CONTRACTS as never }).result;
  return { run: attachLabLog(run, dir), dir };
}

test("a bundle from a failed contracts run carries the failing test, its evidence refs, command, environment, plan and evidence hashes", async () => {
  const { run } = await failedRun();
  assert.equal(run.status, "failed");
  const b = buildReplayBundle(run, { plan: plan(), commit: "abc1234def", worktreeRelativeFiles: ["out.json", "src/a.ts"], now: () => new Date("2026-10-23T10:00:00Z") });
  assert.equal(b.schema, REPLAY_SCHEMA);
  assert.equal(b.runId, run.runId);
  assert.equal(b.provider, "contracts-lab");
  assert.equal(b.failingTests.length, 1);
  assert.equal(b.failingTests[0]!.name, "x is two [ac:c2]");
  assert.match(b.failingTests[0]!.error!.detail ?? "", /is 1, expected 2/);
  assert.deepEqual(b.failingTests[0]!.evidenceRefs, run.tests.find((t) => t.outcome === "failed")!.evidenceRefs);
  assert.equal(b.command.kind, "lab");
  assert.equal(b.environment.node, process.version);
  assert.equal(b.environment.platform, process.platform);
  assert.equal(b.commit, "abc1234def");
  assert.deepEqual(b.files, ["out.json", "src/a.ts"]);
  assert.equal(b.createdAt, "2026-10-23T10:00:00.000Z");
  assert.deepEqual(b.evidence.map((e) => [e.id, e.kind, e.sha256, e.bytes]), run.evidence.map((e) => [e.id, e.kind, e.sha256, e.bytes]));
  assert.ok(b.evidence.every((e) => typeof e.path === "string"));
  assert.equal((b.plan as VerificationPlan).contracts!.subjectFile, "out.json");
  assert.equal(b.truncated, undefined);
  assert.deepEqual(verifyReplayBundle(b), { ok: true, problems: [] });
  assert.deepEqual(verifyReplayBundle(JSON.parse(JSON.stringify(b))), { ok: true, problems: [] }, "survives a JSON round trip");
});

test("the command: node --test for local tests, the scenario steps for the browser, the plan part for every lab", () => {
  const lt = mkRun("local-tests", Date.now(), [mkTest(0, { suite: "s", name: "[ac:c1] greets", outcome: "failed", durationMs: 1, message: "boom", evidenceRefs: [] })], [], {});
  const p = validateVerification({ localTests: { files: ["src/a/greeting.test.mjs", "src/b/x.spec.js"] } });
  const c = buildReplayBundle(lt, { plan: p, worktreeRelativeFiles: [] }).command;
  assert.equal(c.kind, "node-test");
  if (c.kind === "node-test") {
    assert.equal(c.display, "node --test ./src/a/greeting.test.mjs ./src/b/x.spec.js");
    assert.deepEqual(c.argv, ["--test", "./src/a/greeting.test.mjs", "./src/b/x.spec.js"]);
  }
  const steps = [{ kind: "goto", path: "/index.html" }, { kind: "expectText", selector: "#t", text: "Hello", name: "greeting", criteria: ["c1"] }];
  const bp = validateVerification({ browser: { siteDir: "src/a/site", steps } });
  const br = mkRun("browser", Date.now(), [mkTest(0, { suite: null, name: "greeting", outcome: "failed", durationMs: 1, message: "text differs" })], [], {});
  const bc = buildReplayBundle(br, { plan: bp, worktreeRelativeFiles: [] }).command;
  assert.equal(bc.kind, "browser-scenario");
  if (bc.kind === "browser-scenario") {
    assert.equal(bc.siteDir, "src/a/site");
    assert.deepEqual(bc.steps, steps);
  }
  const a11y = validateVerification({ a11y: { files: ["index.html"] } });
  const ar = mkRun("a11y-lab", Date.now(), [mkTest(0, { suite: "a11y", name: "lang", outcome: "failed", durationMs: 1, message: "x" })], [], {});
  const ac = buildReplayBundle(ar, { plan: a11y, worktreeRelativeFiles: [] }).command;
  assert.equal(ac.kind, "lab");
  if (ac.kind === "lab") assert.deepEqual((ac.plan as { files: string[] }).files, ["index.html"]);
  const other = mkRun("mystery", Date.now(), [mkTest(0, { suite: null, name: "t", outcome: "error", durationMs: 1 })], [], {});
  assert.equal(buildReplayBundle(other, { plan: a11y, worktreeRelativeFiles: [] }).command.kind, "none");
});

test("the bundle is redacted: secrets in messages, details, plan keys and the commit never survive", () => {
  const run = mkRun(
    "contracts-lab",
    Date.now(),
    [mkTest(0, { suite: "invariant", name: "leaky", outcome: "failed", durationMs: 1, message: "token sk-abcdefghijklmnopqrstuvwx leaked", detail: "Authorization: Bearer abcdefghijklmnop12345 and api_key=SUPERSECRETVALUE1" })],
    [],
    {},
  );
  const p = plan({ states: { machine: { initial: "a", states: ["a"], transitions: [] } } });
  const withSecretKey = { ...p, secretNote: { password: "hunter2hunter2", token: "abc" } } as unknown as VerificationPlan;
  const b = buildReplayBundle(run, { plan: withSecretKey, commit: "sk-abcdefghijklmnopqrstuvwx", worktreeRelativeFiles: [] });
  const dump = JSON.stringify(b);
  for (const s of ["sk-abcdefghijklmnopqrstuvwx", "abcdefghijklmnop12345", "SUPERSECRETVALUE1", "hunter2hunter2"]) assert.ok(!dump.includes(s), `${s} is masked`);
  assert.ok(dump.includes("[REDACTED]"));
});

test("the bundle never exceeds 256 KB: huge error details and a huge plan are trimmed and the trimming is recorded", () => {
  const tests = Array.from({ length: 80 }, (_, i) => mkTest(i, { suite: "s", name: `failing test number ${i}`, outcome: "failed", durationMs: 1, message: "m".repeat(300), detail: "d".repeat(1000) }));
  const run = mkRun("contracts-lab", Date.now(), tests, [], {});
  const bigContracts = Array.from({ length: 100 }, (_, i) => ({ name: `contract ${i}`, kind: "invariant", rule: { op: "equals", path: "x", value: "v".repeat(480) }, criteria: [] }));
  const p = validateVerification({ contracts: { subjectFile: "out.json", contracts: bigContracts } });
  const files = Array.from({ length: 300 }, (_, i) => `src/dir/file-number-${i}.ts`);
  // Doğrulanmış planlar zaten sınırlıdır; savunma amaçlı kırpmayı sınamak için doğrulayıcıyı aşan dev bir plan verilir.
  const oversized = { ...p, huge: "h".repeat(300_000) } as unknown as VerificationPlan;
  const b = buildReplayBundle(run, { plan: oversized, worktreeRelativeFiles: files });
  assert.ok(Buffer.byteLength(JSON.stringify(b)) <= MAX_REPLAY_BYTES);
  assert.ok(Array.isArray(b.truncated) && b.truncated.length > 0);
  assert.deepEqual(b.plan, { truncated: true });
  assert.ok(b.truncated.includes("plan"));
  assert.deepEqual(verifyReplayBundle(b), { ok: true, problems: [] });
  // Sınırı aşmayan bir doğrulanmış plan olduğu gibi kalır.
  const normal = buildReplayBundle(run, { plan: p, worktreeRelativeFiles: files });
  assert.equal(normal.truncated, undefined);
  assert.equal((normal.plan as VerificationPlan).contracts!.contracts.length, 100);
  const small = buildReplayBundle(run, { plan: plan(), worktreeRelativeFiles: [] });
  assert.ok(small.failingTests.length === 50 && small.truncated === undefined, "an ordinary bundle is not trimmed (only capped at 50 failing tests)");
});

test("verifyReplayBundle detects tampering: evidence file hash, size, missing file, schema, dangling refs and non-objects", async () => {
  const { run } = await failedRun();
  const make = () => buildReplayBundle(run, { plan: plan(), worktreeRelativeFiles: [] });
  assert.equal(verifyReplayBundle(make()).ok, true);
  // kanıt dosyası değişti
  appendFileSync(run.evidence[0]!.path!, "tampered\n");
  const t = verifyReplayBundle(make());
  assert.equal(t.ok, false);
  assert.match(t.problems.join(" "), /size changed|hash mismatch/);
  // kanıt dosyası yok
  const fresh = await failedRun();
  const b = buildReplayBundle(fresh.run, { plan: plan(), worktreeRelativeFiles: [] });
  b.evidence[0]!.path = `${b.evidence[0]!.path}.gone`;
  assert.match(verifyReplayBundle(b).problems.join(" "), /file missing/);
  // şema, eksik alanlar, sarkık referans
  const good = JSON.parse(JSON.stringify(buildReplayBundle(fresh.run, { plan: plan(), worktreeRelativeFiles: [] }))) as Record<string, unknown>;
  assert.match(verifyReplayBundle({ ...good, schema: "x/9" }).problems.join(" "), /schema must be/);
  assert.match(verifyReplayBundle({ ...good, runId: "" }).problems.join(" "), /runId is required/);
  assert.match(verifyReplayBundle({ ...good, command: null }).problems.join(" "), /command is required/);
  assert.match(verifyReplayBundle({ ...good, environment: { node: 1 } }).problems.join(" "), /environment/);
  assert.match(verifyReplayBundle({ ...good, plan: null }).problems.join(" "), /plan is required/);
  assert.match(verifyReplayBundle({ ...good, evidence: [] }).problems.join(" "), /references evidence that is not in the bundle/);
  assert.match(verifyReplayBundle({ ...good, createdAt: "yesterday" }).problems.join(" "), /not a date/);
  assert.match(verifyReplayBundle({ ...good, evidence: [{ id: "a", kind: "log", path: good.evidence ? "x" : "y" }] }).problems.join(" "), /no sha256/);
  assert.match(verifyReplayBundle({ ...good, junk: "x".repeat(MAX_REPLAY_BYTES) }).problems.join(" "), /larger than 256 KB/);
  for (const v of [null, 5, "x", [], undefined]) assert.equal(verifyReplayBundle(v).ok, false);
  validateRunResult(fresh.run);
});
