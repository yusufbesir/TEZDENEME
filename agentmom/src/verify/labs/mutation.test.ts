// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// mutation-lab (madde 58) testleri: taramacı/operatörler, örnekleme, doğrulama, iyi test mutantları öldürür, zayıf test öldürmez, kırık temel koşu,
// zaman aşımı kopyada, orijinal dosyalar değişmez, kopya sınırları ve bağ atlama.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../../testing/tmp.ts";
import { validateRunResult } from "../schema.ts";
import { fillExcerpts, generateMutants, sampleMutants, validateMutationPlan, MutationLabProvider } from "./mutation.ts";
import type { MutationRequest } from "./mutation.ts";
import { LabSpecError } from "./rules.ts";

// ---------- yardımcılar ----------

const SRC = `export const isAdult = (age) => age >= 18;
export function add(a, b) {
  return a + b;
}
export const isEven = (n) => n % 2 === 0;
export const always = () => true;
`;

const GOOD_TESTS = `import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdult, add, isEven, always } from "./calc.mjs";
test("adult boundary", () => {
  assert.equal(isAdult(18), true);
  assert.equal(isAdult(17), false);
});
test("add", () => assert.equal(add(2, 3), 5));
test("even", () => {
  assert.equal(isEven(4), true);
  assert.equal(isEven(3), false);
});
test("always", () => assert.equal(always(), true));
`;

// Hiçbir sınırı ve değeri sınamayan zayıf testler.
const WEAK_TESTS = `import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdult, add } from "./calc.mjs";
test("runs", () => {
  assert.equal(typeof add(2, 3), "number");
  assert.equal(isAdult(30), true);
});
`;

const RED_TESTS = `import { test } from "node:test";
import assert from "node:assert/strict";
import { add } from "./calc.mjs";
test("wrong expectation", () => assert.equal(add(1, 1), 3));
`;

function workspace(tests: string, src = SRC): string {
  const dir = mkTmp("agentmom-mut-");
  writeFileSync(join(dir, "calc.mjs"), src);
  writeFileSync(join(dir, "calc.test.mjs"), tests);
  // Kopyaya GİRMEMESİ gereken şeyler.
  mkdirSync(join(dir, ".git"), { recursive: true });
  writeFileSync(join(dir, ".git", "config"), "[core]\n");
  mkdirSync(join(dir, "node_modules", "x"), { recursive: true });
  writeFileSync(join(dir, "node_modules", "x", "index.js"), "module.exports = 1;\n");
  writeFileSync(join(dir, ".env"), "SECRET_TOKEN=do-not-copy\n");
  return dir;
}

function treeHashes(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string, rel: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const abs = join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      if (statSync(abs).isDirectory()) walk(abs, r);
      else out[r] = createHash("sha256").update(readFileSync(abs)).digest("hex");
    }
  };
  walk(root, "");
  return out;
}

function req(cwd: string, over: Partial<MutationRequest> = {}): MutationRequest {
  return { cwd, files: ["calc.mjs"], testFiles: ["calc.test.mjs"], evidenceDir: mkTmp("agentmom-mutev-"), perMutantTimeoutMs: 20_000, ...over };
}

const names = (ms: ReturnType<typeof generateMutants>): string[] => ms.map((m) => `${m.line}:${m.from}>${m.to}`);

// ---------- saf birimler ----------

test("mutation tokenizer: strings, template text, comments and regex literals are never touched", () => {
  const src = [
    "// a === b and true",
    'const s = "a === b && true";',
    "const t = `x ${1 + 2} === y`;",
    "const re = /a+b===c/g;",
    "/* return 1; */",
    "const ok = a === b;",
    "",
  ].join("\n");
  assert.deepEqual(names(generateMutants("x.js", src)), ["6:===>!=="]);
});

test("mutation operators: equality, relational, logical, boolean, arithmetic, single-line return and 0/1 constants; generics and unary signs are left alone", () => {
  const src = [
    "const r1 = a == b;",
    "const r2 = a != b;",
    "const r3 = a < b;",
    "const r4 = a > b;",
    "const r5 = a <= b;",
    "const r6 = a >= b;",
    "const r7 = a && b;",
    "const r8 = a || b;",
    "const r9 = true;",
    "const r10 = false;",
    "const r11 = a + b;",
    "const r12 = a - b;",
    "const r13 = -a;",
    "const g: Array<string> = [];",
    "function f() { return a + 1; }",
    "function h() {",
    "  return {",
    "    k: 2,",
    "  };",
    "}",
    "const n0 = 0, n1 = 1, n2 = 2, n05 = 0.5;",
  ].join("\n");
  const got = generateMutants("x.ts", src).map((m) => `${m.line}:${m.from}>${m.to}`);
  assert.deepEqual(got, [
    "1:==>!=",
    "2:!=>==",
    "3:<><=",
    "4:>>>=",
    "5:<=><",
    "6:>=>>",
    "7:&&>||",
    "8:||>&&",
    "9:true>false",
    "10:false>true",
    "11:+>-",
    "12:->+",
    "15:return a + 1>return undefined",
    "15:+>-",
    "15:1>2",
    "21:0>1",
    "21:1>2",
  ]);
  // Satır alıntısı kısa ve maskeli.
  const m = generateMutants("x.js", 'const k = "x"; const secret = "sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; const q = a === b;')[0]!;
  fillExcerpts('const k = "x"; const secret = "sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; const q = a === b;', [m]);
  assert.ok(!m.excerpt.includes("AAAAAAAAAAAAAAAAAAAAAAAA"), m.excerpt);
});

test("mutation sampling is deterministic and evenly spaced; no randomness", () => {
  const all = Array.from({ length: 10 }, (_, i) => i);
  assert.deepEqual(sampleMutants(all, 4), [0, 2, 5, 7]);
  assert.deepEqual(sampleMutants(all, 4), [0, 2, 5, 7]);
  assert.deepEqual(sampleMutants(all, 20), all);
});

test("mutation plan validation: files, limits and unknown fields", () => {
  assert.deepEqual(validateMutationPlan({ files: ["src/a.ts", "b.mjs"], maxMutants: 5, minScore: 0.5 }), { files: ["src/a.ts", "b.mjs"], maxMutants: 5, minScore: 0.5 });
  const bad = (v: unknown) => assert.throws(() => validateMutationPlan(v), LabSpecError);
  bad({});
  bad({ files: [] });
  bad({ files: ["a.js", "b.js", "c.js", "d.js", "e.js", "f.js"] });
  bad({ files: ["../a.js"] });
  bad({ files: ["/abs/a.js"] });
  bad({ files: ["C:/a.js"] });
  bad({ files: ["a.txt"] });
  bad({ files: ["a.d.ts"] });
  bad({ files: ["a.test.js"] });
  bad({ files: ["node_modules/x/a.js"] });
  bad({ files: [".git/a.js"] });
  bad({ files: ["-x/a.js"] });
  bad({ files: ["a.js", "A.js"] });
  bad({ files: ["a.js"], maxMutants: 0 });
  bad({ files: ["a.js"], maxMutants: 31 });
  bad({ files: ["a.js"], minScore: 1.5 });
  bad({ files: ["a.js"], minScore: -0.1 });
  bad({ files: ["a.js"], extra: 1 });
});

test("mutation request: missing test file, mutating a test file and a bad timeout are refused before anything runs", () => {
  const cwd = workspace(GOOD_TESTS);
  const p = new MutationLabProvider();
  assert.throws(() => p.run(req(cwd, { testFiles: ["nope.test.mjs"] })), LabSpecError);
  assert.throws(() => p.run(req(cwd, { files: ["calc.test.mjs"] })), LabSpecError);
  assert.throws(() => p.run(req(cwd, { files: ["missing.mjs"] })), LabSpecError);
  assert.throws(() => p.run(req(cwd, { perMutantTimeoutMs: 10 })), LabSpecError);
  assert.throws(() => p.run({ ...req(cwd), bogus: 1 } as MutationRequest), LabSpecError);
});

// ---------- gerçek koşular ----------

test("mutation: a good test suite kills every mutant, the original files never change, and the copy holds no .git / node_modules / .env", async () => {
  const cwd = workspace(GOOD_TESTS);
  const before = treeHashes(cwd);
  const r = req(cwd);
  const out = await new MutationLabProvider().run(r).result;
  validateRunResult(out);
  assert.equal(out.provider, "mutation-lab");
  assert.equal(out.status, "passed", JSON.stringify(out.tests.map((t) => [t.name, t.outcome, t.error?.message])));
  const pd = out.providerData as { score: number; killed: number; survived: number; total: number; perFile: Record<string, { total: number; killed: number; survived: number }> };
  assert.equal(pd.total, 6);
  assert.equal(pd.killed, 6);
  assert.equal(pd.survived, 0);
  assert.equal(pd.score, 1);
  assert.deepEqual(pd.perFile, { "calc.mjs": { total: 6, killed: 6, survived: 0 } });
  assert.equal(out.tests[0]!.id, "mutation-score");
  assert.equal(out.tests[0]!.outcome, "passed");
  assert.ok(out.tests.slice(1).every((t) => t.suite === "mutation" && t.outcome === "passed"));
  assert.ok(out.tests.some((t) => t.name.startsWith("calc.mjs:1 relational >=→>")));
  // Orijinal dosyalar bit bit aynı.
  assert.deepEqual(treeHashes(cwd), before);
  // LOG kanıtı var ve gerçekten diskte.
  const log = out.evidence.find((e) => e.kind === "log")!;
  assert.ok(log && existsSync(log.path!));
  // Kopya: orijinal içerik geri yüklenmiş, .git / node_modules / .env yok.
  const copy = join(r.evidenceDir, "tmp", `mutation-${out.runId.slice(0, 8)}`, "copy");
  assert.equal(readFileSync(join(copy, "calc.mjs"), "utf8"), SRC, "the copy's source was restored after the last mutant");
  assert.ok(existsSync(join(copy, "calc.test.mjs")));
  assert.ok(!existsSync(join(copy, ".git")) && !existsSync(join(copy, "node_modules")) && !existsSync(join(copy, ".env")));
});

test("mutation: a weak test suite lets mutants survive; survivors are product defects with line + masked excerpt and the score test fails", async () => {
  const cwd = workspace(WEAK_TESTS);
  const before = treeHashes(cwd);
  const out = await new MutationLabProvider().run(req(cwd)).result;
  validateRunResult(out);
  assert.equal(out.status, "failed");
  const pd = out.providerData as { score: number; killed: number; survived: number; total: number };
  assert.equal(pd.total, 6);
  assert.equal(pd.killed, 1, "only the return->undefined mutant of add() is noticed");
  assert.equal(pd.survived, 5);
  const score = out.tests.find((t) => t.id === "mutation-score")!;
  assert.equal(score.outcome, "failed");
  assert.equal(score.classification, "product_defect");
  assert.match(score.error!.message, /0\.17 \(1 of 6/);
  const survivors = out.tests.filter((t) => t.id !== "mutation-score" && t.outcome === "failed");
  assert.equal(survivors.length, 5);
  for (const s of survivors) {
    assert.equal(s.classification, "product_defect");
    assert.match(s.error!.message, /mutant survived/);
    assert.match(s.error!.detail ?? "", /^calc\.mjs:\d+: /);
    assert.ok(s.evidenceRefs.length > 0, "a failing test must carry evidence");
  }
  assert.ok(survivors.some((s) => s.name.startsWith("calc.mjs:1 relational >=→>")));
  const logText = readFileSync(out.evidence.find((e) => e.kind === "log")!.path!, "utf8");
  assert.match(logText, /\[survived\] calc\.mjs:1 relational >= -> >/);
  assert.deepEqual(treeHashes(cwd), before);
});

test("mutation: minScore decides the score test and maxMutants limits the sample", async () => {
  const cwd = workspace(WEAK_TESTS);
  const lenient = await new MutationLabProvider().run(req(cwd, { minScore: 0 })).result;
  assert.equal(lenient.tests.find((t) => t.id === "mutation-score")!.outcome, "passed");
  assert.equal(lenient.status, "failed", "survivors are still reported as failed tests");
  const cwd2 = workspace(GOOD_TESTS);
  const strict = await new MutationLabProvider().run(req(cwd2, { minScore: 1, maxMutants: 3 })).result;
  assert.equal(strict.status, "passed");
  assert.equal(strict.tests.find((t) => t.id === "mutation-score")!.outcome, "passed");
  assert.equal((strict.providerData as { sampled: number }).sampled, 3);
});

test("mutation: a red baseline is an infra error and no mutant is made", async () => {
  const cwd = workspace(RED_TESTS);
  const out = await new MutationLabProvider().run(req(cwd)).result;
  validateRunResult(out);
  assert.equal(out.status, "error");
  assert.equal(out.tests.length, 1);
  assert.equal(out.tests[0]!.outcome, "error");
  assert.equal(out.tests[0]!.classification, "infra");
  assert.match(out.tests[0]!.error!.message, /baseline red/);
  assert.equal((out.providerData as { total?: number }).total, undefined);
  assert.ok(out.tests[0]!.evidenceRefs.length > 0);
});

test("mutation: a mutant that loops forever is killed by the timeout, inside the copy, and the original is untouched", async () => {
  const loop = `export function countTo(n) {
  let i = 0;
  while (i !== n) {
    i = i + 1;
  }
  return i;
}
`;
  const tests = `import { test } from "node:test";
import assert from "node:assert/strict";
import { countTo } from "./loop.mjs";
test("counts", () => assert.equal(countTo(3), 3));
`;
  const cwd = mkTmp("agentmom-mut-");
  writeFileSync(join(cwd, "loop.mjs"), loop);
  writeFileSync(join(cwd, "loop.test.mjs"), tests);
  const before = treeHashes(cwd);
  const r = req(cwd, { files: ["loop.mjs"], testFiles: ["loop.test.mjs"], perMutantTimeoutMs: 2000 });
  const t0 = Date.now();
  const out = await new MutationLabProvider().run(r).result;
  validateRunResult(out);
  assert.ok(Date.now() - t0 < 60_000);
  const logText = readFileSync(out.evidence.find((e) => e.kind === "log")!.path!, "utf8");
  assert.match(logText, /killed:timeout\] loop\.mjs:4 arithmetic \+ -> -/);
  assert.deepEqual(treeHashes(cwd), before);
  const copy = join(r.evidenceDir, "tmp", `mutation-${out.runId.slice(0, 8)}`, "copy");
  assert.equal(readFileSync(join(copy, "loop.mjs"), "utf8"), loop);
  // Zaman aşımı "öldürüldü" sayılır: bu mutantlar başarısız test üretmez.
  const arithmetic = out.tests.find((t) => t.name.includes("arithmetic"))!;
  assert.equal(arithmetic.outcome, "passed");
});

test("mutation: a symlink/junction in the workspace is skipped, never copied or followed", async () => {
  const cwd = workspace(GOOD_TESTS);
  const outside = mkTmp("agentmom-outside-");
  writeFileSync(join(outside, "secret.txt"), "outside");
  symlinkSync(outside, join(cwd, "out"), "junction");
  const r = req(cwd);
  const out = await new MutationLabProvider().run(r).result;
  validateRunResult(out);
  assert.equal(out.status, "passed", JSON.stringify(out.tests.map((t) => [t.name, t.outcome, t.error?.message])));
  assert.equal((out.providerData as { copy: { skippedEntries: number } }).copy.skippedEntries, 1);
  const copy = join(r.evidenceDir, "tmp", `mutation-${out.runId.slice(0, 8)}`, "copy");
  assert.ok(!existsSync(join(copy, "out")));
});

test("mutation: a workspace with more than 2000 files is an infra error (too large to copy) and nothing is mutated", async () => {
  const cwd = workspace(GOOD_TESTS);
  mkdirSync(join(cwd, "many"));
  for (let i = 0; i < 2001; i++) writeFileSync(join(cwd, "many", `f${i}.txt`), "x");
  const out = await new MutationLabProvider().run(req(cwd)).result;
  validateRunResult(out);
  assert.equal(out.status, "error");
  assert.equal(out.tests.length, 1);
  assert.match(out.tests[0]!.error!.message, /more than 2000 files/);
  assert.equal(out.tests[0]!.classification, "infra");
});

test("mutation: a source file that cannot be tokenized is an infra error", async () => {
  const cwd = workspace(GOOD_TESTS, 'export const x = "unterminated;\n');
  const out = await new MutationLabProvider().run(req(cwd)).result;
  validateRunResult(out);
  assert.equal(out.status, "error");
  assert.match(out.tests[0]!.error!.message, /could not be tokenized/);
});

test("mutation: no mutable tokens -> the score test is skipped (nothing was challenged)", async () => {
  const cwd2 = mkTmp("agentmom-mut-");
  writeFileSync(join(cwd2, "plain.mjs"), "export const name = (s) => s;\n");
  writeFileSync(join(cwd2, "plain.test.mjs"), 'import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { name } from "./plain.mjs";\ntest("n", () => assert.equal(name("a"), "a"));\n');
  const out2 = await new MutationLabProvider().run(req(cwd2, { files: ["plain.mjs"], testFiles: ["plain.test.mjs"] })).result;
  validateRunResult(out2);
  assert.equal(out2.status, "passed");
  assert.equal(out2.tests[0]!.id, "mutation-score");
  assert.equal(out2.tests[0]!.outcome, "skipped");
});

test("mutation: cancelling before the run starts yields a cancelled run", async () => {
  const cwd = workspace(GOOD_TESTS);
  const h = new MutationLabProvider().run(req(cwd));
  await h.cancel();
  const out = await h.result;
  validateRunResult(out);
  assert.equal(out.status, "cancelled");
});

// ---------- güvenlik denetimi düzeltmeleri ----------

test("mutation generation is linear: 490 KB of 'return return ...' and of 'a+a+...' on ONE line finish quickly", () => {
  const returns = "return ".repeat(70_000);
  const t0 = Date.now();
  const r1 = generateMutants("x.js", returns);
  const t1 = Date.now() - t0;
  assert.ok(t1 < 2000, `return flood took ${t1} ms`);
  assert.ok(r1.length <= 5000, "candidates per file are capped");
  const pluses = "a+".repeat(240_000);
  const t2 = Date.now();
  const r2 = generateMutants("y.js", pluses);
  const t3 = Date.now() - t2;
  assert.ok(t3 < 2000, `plus flood took ${t3} ms`);
  assert.equal(r2.length, 5000, "evenly thinned down to the cap");
  // alıntı yalnız seçilen mutantlar için üretilir ve uzun satırda da kısadır
  const picked = sampleMutants(r2, 5);
  const t4 = Date.now();
  fillExcerpts(pluses, picked);
  assert.ok(Date.now() - t4 < 500);
  assert.ok(picked.every((m) => m.excerpt.length <= 120));
});

test("mutation generation honours its time budget", () => {
  assert.throws(() => generateMutants("z.js", "a+".repeat(100_000), Date.now() - 1), /time budget/);
});

test("mutation: a test that crashes the process on any change only kills WEAKLY (half weight) and the kill kinds are reported", async () => {
  const crashing = `import { test } from "node:test";
import { readFileSync } from "node:fs";
if (readFileSync("./calc.mjs", "utf8") !== ${JSON.stringify(SRC)}) process.exit(3);
test("ok", () => {});
`;
  const cwd = workspace(crashing);
  const out = await new MutationLabProvider().run(req(cwd)).result;
  validateRunResult(out);
  const pd = out.providerData as { score: number; killed: number; killedByFailure: number; killedByCrash: number; killedByTimeout: number; total: number };
  assert.equal(pd.total, 6);
  assert.equal(pd.killed, 6);
  assert.equal(pd.killedByFailure, 0);
  assert.equal(pd.killedByCrash, 6);
  assert.equal(pd.killedByTimeout, 0);
  assert.equal(pd.score, 0.5, "(0 + 0.5 x 6) / 6");
  const score = out.tests.find((t) => t.id === "mutation-score")!;
  assert.equal(score.outcome, "failed", "0.5 < the default minimum 0.6");
  assert.match(score.error!.message, /6 only by crash\/timeout counted as half/);
  // Gerçek assert ile öldürenler tam ağırlıklıdır.
  const good = await new MutationLabProvider().run(req(workspace(GOOD_TESTS))).result;
  const g = good.providerData as { killedByFailure: number; killedByCrash: number; killedByTimeout: number; score: number };
  assert.deepEqual([g.killedByFailure, g.killedByCrash, g.killedByTimeout, g.score], [6, 0, 0, 1]);
});

test("mutation: the sloppy timeout kills are counted as timeouts (weak)", async () => {
  const loop = "export function countTo(n) {\n  let i = 0;\n  while (i !== n) {\n    i = i + 1;\n  }\n  return i;\n}\n";
  const tests = 'import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { countTo } from "./loop.mjs";\ntest("counts", () => assert.equal(countTo(3), 3));\n';
  const cwd = mkTmp("agentmom-mut-");
  writeFileSync(join(cwd, "loop.mjs"), loop);
  writeFileSync(join(cwd, "loop.test.mjs"), tests);
  const out = await new MutationLabProvider().run(req(cwd, { files: ["loop.mjs"], testFiles: ["loop.test.mjs"], perMutantTimeoutMs: 2000 })).result;
  const pd = out.providerData as { killedByTimeout: number; killedByFailure: number; total: number; killed: number };
  assert.ok(pd.killedByTimeout >= 2, JSON.stringify(pd));
  assert.ok(pd.killedByFailure >= 1);
});

test("mutation copy never takes secret-looking files (.env*, .envrc, .npmrc, *.pem, *.key, id_rsa*, credentials*, secrets*, ...)", async () => {
  const cwd = workspace(GOOD_TESTS);
  const secrets = [".envrc", ".env.local", ".npmrc", ".netrc", "server.pem", "tls.key", "store.pfx", "bundle.p12", "vault.kdbx", "id_rsa", "id_ed25519.pub", "id_ecdsa", "credentials.json", "secrets.yaml"];
  for (const s of secrets) writeFileSync(join(cwd, s), "top-secret");
  const r = req(cwd);
  const out = await new MutationLabProvider().run(r).result;
  assert.equal(out.status, "passed", JSON.stringify(out.tests.map((t) => [t.name, t.error?.message])));
  const copy = join(r.evidenceDir, "tmp", `mutation-${out.runId.slice(0, 8)}`, "copy");
  assert.ok(existsSync(join(copy, "calc.mjs")));
  for (const s of [...secrets, ".env"]) assert.ok(!existsSync(join(copy, s)), `${s} must not be copied`);
});

test("mutation: too many old copy folders block a new run (nothing is deleted), and too many directories are refused", async () => {
  const cwd = workspace(GOOD_TESTS);
  const r = req(cwd);
  for (let i = 0; i < 20; i++) mkdirSync(join(r.evidenceDir, "tmp", `mutation-old${i}`), { recursive: true });
  const blocked = await new MutationLabProvider().run(r).result;
  assert.equal(blocked.status, "error");
  assert.match(blocked.tests[0]!.error!.message, /kopya birikimi/);
  assert.ok(existsSync(join(r.evidenceDir, "tmp", "mutation-old0")), "nothing was deleted");
  const cwd2 = workspace(GOOD_TESTS);
  for (let i = 0; i < 2001; i++) mkdirSync(join(cwd2, `d${i}`));
  const dirs = await new MutationLabProvider().run(req(cwd2)).result;
  assert.equal(dirs.status, "error");
  assert.match(dirs.tests[0]!.error!.message, /more than 2000 directories/);
});
