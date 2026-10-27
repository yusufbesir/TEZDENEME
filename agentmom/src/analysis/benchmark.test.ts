// Ajan/model kıyaslama testleri (madde 12). Sahip: Claude [İP:AgentMom devam]. Ağ, model, sağlayıcı koşusu yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { BenchmarkError, MIN_SAMPLE, RESULTS_SCHEMA, SUITE_SCHEMA, compare, parseRun, parseSuite, renderComparison, wilson } from "./benchmark.ts";

const REPO = resolve(import.meta.dirname, "..", "..");
const suiteRaw = (n = 12) => ({ schema: SUITE_SCHEMA, id: "s1", title: "Deneme", cases: Array.from({ length: n }, (_, i) => ({ id: `c${i}`, title: `Vaka ${i}`, category: i % 2 ? "review" : "implement" })) });
const suite = parseSuite(suiteRaw());
const run = (provider: string, model: string, passed: (i: number) => boolean, opts: { n?: number; ms?: (i: number) => number | undefined; tokens?: number } = {}) => ({
  schema: RESULTS_SCHEMA, suiteId: "s1", runAt: "2026-10-25T10:00:00Z", provider, model,
  results: Array.from({ length: opts.n ?? 12 }, (_, i) => ({ caseId: `c${i}`, passed: passed(i), ms: opts.ms ? opts.ms(i) : 1000 + i, tokens: opts.tokens ?? 100 })),
});

test("wilson: bilinen değerler ve sınırlar", () => {
  const w = wilson(8, 10);
  assert.ok(Math.abs(w.low - 0.4902) < 0.001 && Math.abs(w.high - 0.9433) < 0.001, `${w.low} ${w.high}`);
  assert.deepEqual(wilson(0, 0), { low: 0, high: 1 });
  assert.ok(wilson(10, 10).high <= 1 && wilson(0, 10).low >= 0);
  assert.ok(wilson(50, 100).high - wilson(50, 100).low < wilson(5, 10).high - wilson(5, 10).low, "büyük örnekte aralık dar");
});

test("açık fark: aralıkları çakışmayan iki sağlayıcı ayrı sıralanır, küçük örnek aralık yazmaz", () => {
  const big = parseSuite(suiteRaw(60));
  const r = (p: string, ok: (i: number) => boolean) => parseRun(run(p, "m", ok, { n: 60 }), big);
  const c = compare(big, [r("iyi", () => true), r("kotu", (i) => i % 4 === 0)]);
  assert.deepEqual(c.ranking, [["iyi/m"], ["kotu/m"]]);
  assert.equal(c.entities[0]!.rate, 1);
  const tiny = compare(suite, [parseRun(run("az", "m", () => true, { n: 5 }), suite)]);
  assert.equal(tiny.entities[0]!.status, "yetersiz veri");
  assert.equal(tiny.entities[0]!.rate, null);
  assert.equal(tiny.ranking.length, 0);
  assert.ok(tiny.warnings.some((w) => /yetersiz veri/.test(w)));
  assert.ok(MIN_SAMPLE === 10);
});

test("çakışan aralıklar 'ayırt edilemez' kümesinde birlikte kalır, sıralama uydurulmaz", () => {
  const c = compare(suite, [parseRun(run("a", "m", (i) => i < 10), suite), parseRun(run("b", "m", (i) => i < 9), suite)]);
  assert.deepEqual(c.ranking, [["a/m", "b/m"]], "12 vakada 10/12 ile 9/12 ayrışmaz");
  assert.match(renderComparison(c), /a\/m {2}≈ {2}b\/m/);
});

test("karşılaştırma yalnız ortak vakalarda yapılır ve uyarı verir; çoklu koşu birleşir", () => {
  const full = parseRun(run("a", "m", () => true), suite);
  const part = parseRun(run("b", "m", () => true, { n: 10 }), suite);
  const c = compare(suite, [full, part]);
  assert.equal(c.commonCases, 10);
  assert.equal(c.entities[0]!.attempts, 10, "a da yalnız ortak 10 vakada sayılır");
  assert.ok(c.warnings.some((w) => /ortak vaka 10\/12/.test(w)));
  const twice = compare(suite, [full, parseRun(run("a", "m", () => false), suite)]);
  assert.equal(twice.entities[0]!.attempts, 24);
  assert.equal(twice.entities[0]!.passes, 12);
  assert.equal(twice.entities[0]!.runs, 2);
});

test("süre ve token: eksik kayıt varsa uyarı, token toplamı yazılmaz; ortanca doğru", () => {
  const partial = parseRun(run("a", "m", () => true, { ms: (i) => (i < 6 ? 100 * (i + 1) : undefined) }), suite);
  const c = compare(suite, [partial]);
  assert.equal(c.entities[0]!.medianMs, 350, "100..600 ortancası 350");
  assert.ok(c.warnings.some((w) => /süre 6\/12/.test(w)));
  const noTok = JSON.parse(JSON.stringify(run("a", "m", () => true)));
  noTok.results[0].tokens = null;
  assert.equal(compare(suite, [parseRun(noTok, suite)]).entities[0]!.totalTokens, null);
  assert.equal(compare(suite, [parseRun(run("a", "m", () => true, { tokens: 7 }), suite)]).entities[0]!.totalTokens, 84);
});

test("kategori kırılımı vaka kümesindeki kategoriden gelir", () => {
  const c = compare(suite, [parseRun(run("a", "m", (i) => i % 2 === 0), suite)]);
  assert.deepEqual(c.entities[0]!.byCategory, [{ category: "implement", attempts: 6, passes: 6 }, { category: "review", attempts: 6, passes: 0 }]);
});

test("katı doğrulama: bilinmeyen alan, yanlış şema/küme, tekrar, bilinmeyen vaka, kötü sayı/zaman, gizli bilgi, kontrol karakteri reddedilir", () => {
  const bad = (f: () => unknown, m: string) => assert.throws(f, BenchmarkError, m);
  bad(() => parseSuite({ ...suiteRaw(), extra: 1 }), "fazla alan");
  bad(() => parseSuite({ ...suiteRaw(), schema: "x" }), "şema");
  bad(() => parseSuite({ ...suiteRaw(), cases: [] }), "boş");
  bad(() => parseSuite({ ...suiteRaw(), cases: [{ id: "a", title: "t", category: "plan" }, { id: "a", title: "t", category: "plan" }] }), "tekrar");
  bad(() => parseSuite({ ...suiteRaw(), cases: [{ id: "a b", title: "t", category: "plan" }] }), "kimlik");
  bad(() => parseSuite({ ...suiteRaw(), cases: [{ id: "a", title: "t", category: "yok" }] }), "kategori");
  bad(() => parseSuite({ ...suiteRaw(), title: "ok\nHACK" }), "satır sonu");
  bad(() => parseSuite({ ...suiteRaw(), title: "anahtar sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2" }), "gizli bilgi");
  const base = run("a", "m", () => true);
  bad(() => parseRun({ ...base, suiteId: "baska" }, suite), "kümeyle eşleşmiyor");
  bad(() => parseRun({ ...base, runAt: "dün" }, suite), "zaman");
  bad(() => parseRun({ ...base, runAt: "2026-02-31T00:00:00Z" }, suite), "geçersiz tarih");
  bad(() => parseRun({ ...base, results: [{ caseId: "yok", passed: true }] }, suite), "bilinmeyen vaka");
  bad(() => parseRun({ ...base, results: [{ caseId: "c0", passed: true }, { caseId: "c0", passed: false }] }, suite), "koşuda tekrar");
  bad(() => parseRun({ ...base, results: [{ caseId: "c0", passed: "evet" }] }, suite), "passed türü");
  bad(() => parseRun({ ...base, results: [{ caseId: "c0", passed: true, ms: -1 }] }, suite), "negatif süre");
  bad(() => parseRun({ ...base, results: [{ caseId: "c0", passed: true, ms: 1.5 }] }, suite), "kesirli süre");
  bad(() => parseRun({ ...base, results: [{ caseId: "c0", passed: true, note: "x" }] }, suite), "not alanı yok");
  bad(() => parseRun({ ...base, provider: "a/b" }, suite), "provider biçimi");
  bad(() => compare(suite, []), "boş koşu");
});

test("çıktı temizliği: sağlayıcı/model kimliği tablo ya da satır bozamaz (kimlikler zaten kısıtlı), uyarılar temiz", () => {
  const out = renderComparison(compare(suite, [parseRun(run("a", "m", () => true), suite)]));
  assert.ok(!new RegExp("[\\u0000-\\u0008\\u001b\\u2028]").test(out));
  assert.match(out, /\| a\/m \| 1 \| 12 \| 100\.0% \|/);
});

test("CLI: sablon, karşılaştır, hatalar; hiçbir şey yazmaz", () => {
  const dir = mkdtempSync(join(tmpdir(), "kiyas-"));
  writeFileSync(join(dir, "s.json"), JSON.stringify(suiteRaw()));
  writeFileSync(join(dir, "a.json"), JSON.stringify(run("a", "m", () => true)));
  writeFileSync(join(dir, "b.json"), JSON.stringify(run("b", "m", (i) => i < 3)));
  const sh = (...a: string[]) => execFileSync(process.execPath, ["--experimental-strip-types", "scripts/kiyas.mjs", ...a], { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const before = readdirSync(dir).length;
  assert.match(sh("sablon"), /agentmom-benchmark-suite\/1/);
  assert.match(sh("karsilastir", join(dir, "s.json"), join(dir, "a.json"), join(dir, "b.json")), /Sıralama/);
  assert.equal(JSON.parse(sh("karsilastir", join(dir, "s.json"), join(dir, "a.json"), "--json")).commonCases, 12);
  assert.equal(readdirSync(dir).length, before, "komut klasöre yazmadı");
  assert.throws(() => sh("karsilastir", join(dir, "s.json")), (e: any) => e.status === 2);
  assert.throws(() => sh("karsilastir", join(dir, "yok.json"), join(dir, "a.json")), (e: any) => e.status === 2);
  assert.throws(() => sh("karsilastir", join(dir, "s.json"), join(dir, "a.json"), "--x"), (e: any) => e.status === 2);
});

test("zincirleme çakışma: A-B ve B-C çakışıp A-C çakışmasa da üçü tek 'ayırt edilemez' kümededir", () => {
  const big = parseSuite(suiteRaw(40));
  const r = (p: string, k: number) => parseRun(run(p, "m", (i) => i < k, { n: 40 }), big);
  const c = compare(big, [r("a", 38), r("b", 31), r("c", 25)]);
  assert.equal(c.ranking.length, 1, "sıralama zincirle tek küme olur");
  assert.deepEqual(c.ranking[0], ["a/m", "b/m", "c/m"]);
});

test("aynı koşu dosyası tekrar verilemez; örnek büyüklüğü ayrı vaka sayısıdır", () => {
  const same = parseRun(run("a", "m", () => true, { n: 5 }), suite);
  assert.throws(() => compare(suite, [same, parseRun(run("a", "m", () => true, { n: 5 }), suite)]), BenchmarkError);
  // 5 vaka x 3 farklı koşu = 15 deneme ama yalnız 5 ayrı vaka: yetersiz veri kalır
  const reps = [1, 2, 3].map((d) => parseRun({ ...run("a", "m", () => true, { n: 5 }), runAt: `2026-10-25T10:0${d}:00Z` }, suite));
  const c = compare(suite, reps);
  assert.equal(c.entities[0]!.status, "yetersiz veri");
  assert.equal(c.entities[0]!.attempts, 15);
});

test("CLI: aynı sonuç dosyası on kez verilince örnek büyümez, hata verir", () => {
  const dir = mkdtempSync(join(tmpdir(), "kiyas-"));
  writeFileSync(join(dir, "s.json"), JSON.stringify(suiteRaw()));
  writeFileSync(join(dir, "a.json"), JSON.stringify(run("a", "m", () => true)));
  const args = ["--experimental-strip-types", "scripts/kiyas.mjs", "karsilastir", join(dir, "s.json"), ...Array(10).fill(join(dir, "a.json"))];
  assert.throws(() => execFileSync(process.execPath, args, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }), (e: any) => e.status === 2);
});
