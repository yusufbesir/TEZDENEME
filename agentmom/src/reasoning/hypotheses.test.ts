// Rakip hipotezler laboratuvarı testleri. Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Saf hesaplama: veritabanı, ağ, dosya yok. Sayısal örnekler elle hesaplanmıştır.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeHypotheses } from "./hypotheses.ts";
import { ReasoningError } from "./reasoning.ts";

const close = (a: number | null, b: number, eps = 1e-9) => assert.ok(a !== null && Math.abs(a - b) <= eps, `${a} !~ ${b}`);
const h = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: `Hipotez ${id}`, ...extra });
const bad = (input: unknown, why: string) => assert.throws(() => analyzeHypotheses(input), (e: unknown) => e instanceof ReasoningError && e.code === "invalid_field", why);

test("equal priors: posteriors match the hand calculation; independence is stated; ranking and diagnosticity", () => {
  // H1: 0,5·0,8·0,6 = 0,24; H2: 0,5·0,2·0,3 = 0,03 => 0,24/0,27 ve 0,03/0,27
  const a = analyzeHypotheses({
    hypotheses: [h("H1"), h("H2")],
    evidence: [
      { id: "e1", text: "Birinci kanıt", likelihoods: { H1: 0.8, H2: 0.2 } },
      { id: "e2", text: "İkinci kanıt", likelihoods: { H1: 0.6, H2: 0.3 } },
    ],
  });
  assert.equal(a.mode, "bayes");
  assert.equal(a.priorUsed, "eşit");
  close(a.posteriors[0]!.posterior, 0.24 / 0.27);
  close(a.posteriors[1]!.posterior, 0.03 / 0.27);
  close(a.posteriors[0]!.posterior! + a.posteriors[1]!.posterior!, 1);
  assert.deepEqual(a.posteriors.map((p) => p.rank), [1, 2]);
  assert.match(a.assumptions.join(" "), /koşullu bağımsız/);
  close(a.evidence[0]!.ratio, 4);
  assert.equal(a.evidence[0]!.strength, "orta");
  assert.equal(a.evidence[0]!.highestId, "H1");
  assert.equal(a.evidence[0]!.lowestId, "H2");
  close(a.evidence[1]!.ratio, 2);
  assert.equal(a.evidence[1]!.strength, "zayıf");
  assert.deepEqual(a.warnings, []);
  assert.equal(a.leastRefuted?.id, "H1");
});

test("given priors are used and must sum to 1 and be given for all hypotheses", () => {
  const ev = [{ id: "e1", text: "k", likelihoods: { A: 0.5, B: 0.5 } }];
  const a = analyzeHypotheses({ hypotheses: [h("A", { prior: 0.9 }), h("B", { prior: 0.1 })], evidence: ev });
  assert.equal(a.priorUsed, "verilen");
  close(a.posteriors[0]!.posterior, 0.9);
  assert.equal(a.evidence[0]!.strength, "ayırt etmez");
  bad({ hypotheses: [h("A", { prior: 0.9 }), h("B")], evidence: ev }, "partial priors");
  bad({ hypotheses: [h("A", { prior: 0.9 }), h("B", { prior: 0.2 })], evidence: ev }, "sum != 1");
  bad({ hypotheses: [h("A", { prior: -0.1 }), h("B", { prior: 1.1 })], evidence: ev }, "out of range");
});

test("a zero likelihood eliminates the hypothesis with a warning; missing likelihoods default to 0.5 with a warning", () => {
  const a = analyzeHypotheses({
    hypotheses: [h("A"), h("B"), h("C")],
    evidence: [
      { id: "e1", text: "k1", likelihoods: { A: 0.9, B: 0, C: 0.3 } },
      { id: "e2", text: "k2", likelihoods: { A: 0.5, B: 0.9 } },
    ],
  });
  const b = a.posteriors.find((p) => p.id === "B")!;
  assert.equal(b.posterior, 0);
  assert.equal(b.eliminated, true);
  assert.ok(a.warnings.some((w) => /'e1'.*'B'.*KESİN eler/.test(w)));
  assert.ok(a.warnings.some((w) => /'e2' kanıtı için 'C' olabilirliği verilmedi: 0\.5/.test(w)));
  // C, e2'de 0,5 varsayıldı: A ∝ 1/3·0,9·0,5 = 0,15; C ∝ 1/3·0,3·0,5 = 0,05 => A = 0,75
  close(a.posteriors.find((p) => p.id === "A")!.posterior, 0.75);
  assert.equal(a.evidence[0]!.ratioInfinite, true);
  assert.equal(a.evidence[0]!.ratio, null);
  assert.equal(a.evidence[0]!.strength, "kesin");
});

test("everything eliminated: posteriors are null, an honest warning, no leastRefuted", () => {
  const a = analyzeHypotheses({ hypotheses: [h("A"), h("B")], evidence: [{ id: "e1", text: "k", likelihoods: { A: 0, B: 0 } }] });
  assert.ok(a.posteriors.every((p) => p.posterior === null && p.eliminated));
  assert.equal(a.leastRefuted, null);
  assert.ok(a.warnings.some((w) => /tanımsız/.test(w)));
  assert.match(a.evidence[0]!.note, /hiçbir hipotezle bağdaşmıyor/);
});

test("ACH: inconsistency counts (likelihood < 0.2), ranking by fewest inconsistencies, least refuted with ties reported", () => {
  const input = {
    mode: "ach",
    hypotheses: [h("A"), h("B"), h("C")],
    evidence: [
      { id: "e1", text: "k1", likelihoods: { A: 0.1, B: 0.9, C: 0.9 } },
      { id: "e2", text: "k2", likelihoods: { A: 0.19, B: 0.2, C: 0.5 } },
      { id: "e3", text: "k3", likelihoods: { A: 0.9, B: 0.05, C: 0.9 } },
    ],
  };
  const a = analyzeHypotheses(input);
  assert.deepEqual(a.posteriors.map((p) => [p.id, p.inconsistent]), [["A", 2], ["B", 1], ["C", 0]]);
  assert.equal(a.posteriors.find((p) => p.id === "C")!.rank, 1);
  assert.equal(a.leastRefuted?.id, "C");
  assert.deepEqual(a.leastRefuted?.tiedWith, []);
  // eşit uyuşmazlık: ardıl yüksek olan öne; tam eşitlik tiedWith'te
  const t = analyzeHypotheses({ hypotheses: [h("A"), h("B")], evidence: [{ id: "e1", text: "k", likelihoods: { A: 0.7, B: 0.7 } }] });
  assert.equal(t.leastRefuted?.id, "A");
  assert.deepEqual(t.leastRefuted?.tiedWith, ["B"]);
  // bayes modunda sıralama ardıla göre
  const b = analyzeHypotheses({ ...input, mode: "bayes" });
  assert.equal(b.posteriors.find((p) => p.rank === 1)!.id, "C");
});

test("numerically stable: 30 tiny likelihoods do not underflow (log space)", () => {
  const evidence = Array.from({ length: 30 }, (_, i) => ({ id: `e${i}`, text: "çok küçük", likelihoods: { A: 1e-200, B: 1e-201 } }));
  const a = analyzeHypotheses({ hypotheses: [h("A"), h("B")], evidence });
  close(a.posteriors[0]!.posterior, 1e30 / (1e30 + 1), 1e-12);
  assert.ok(a.posteriors.every((p) => Number.isFinite(p.posterior as number)));
  // çok büyük oran taşma üretmez
  const big = analyzeHypotheses({ hypotheses: [h("A"), h("B")], evidence: [{ id: "e", text: "k", likelihoods: { A: 1, B: 1e-300 } }] });
  assert.ok(Number.isFinite(big.evidence[0]!.ratio as number));
});

test("deterministic: same input, same output", () => {
  const input = { hypotheses: [h("A"), h("B")], evidence: [{ id: "e1", text: "k", likelihoods: { A: 0.3, B: 0.6 } }] };
  assert.deepEqual(analyzeHypotheses(input), analyzeHypotheses(structuredClone(input)));
});

test("hostile input: NaN, Infinity, negatives, >1, wrong types, duplicates, prototype keys, long text, unknown fields", () => {
  const ok = { hypotheses: [h("A"), h("B")], evidence: [{ id: "e1", text: "k", likelihoods: { A: 0.5, B: 0.5 } }] };
  assert.doesNotThrow(() => analyzeHypotheses(ok));
  for (const v of [NaN, Infinity, -Infinity, -0.1, 1.0001, "0.5", null, true, {}, []]) {
    bad({ ...ok, evidence: [{ id: "e1", text: "k", likelihoods: { A: v, B: 0.5 } }] }, `likelihood ${String(v)}`);
  }
  for (const v of [NaN, Infinity, 2]) bad({ hypotheses: [h("A", { prior: v }), h("B")], evidence: ok.evidence }, `prior ${String(v)}`);
  bad(null, "null");
  bad([], "array");
  bad({ ...ok, extra: 1 }, "unknown body field");
  bad({ ...ok, mode: "bayesci" }, "bad mode");
  bad({ hypotheses: [h("A")], evidence: ok.evidence }, "1 hypothesis");
  bad({ hypotheses: Array.from({ length: 11 }, (_, i) => h(`H${i}`)), evidence: ok.evidence }, "11 hypotheses");
  bad({ hypotheses: ok.hypotheses, evidence: [] }, "no evidence");
  bad({ hypotheses: ok.hypotheses, evidence: Array.from({ length: 31 }, (_, i) => ({ id: `e${i}`, text: "k", likelihoods: {} })) }, "31 evidence");
  bad({ hypotheses: [h("A"), h("A")], evidence: ok.evidence }, "duplicate hypothesis id");
  bad({ hypotheses: ok.hypotheses, evidence: [ok.evidence[0], ok.evidence[0]] }, "duplicate evidence id");
  for (const id of ["__proto__", "constructor", "prototype", "", "a b", "x".repeat(31), "ı", "a.b", 5]) bad({ hypotheses: [h(id as string), h("B")], evidence: ok.evidence }, `id ${String(id)}`);
  bad({ hypotheses: [h("A", { name: "x".repeat(101) }), h("B")], evidence: ok.evidence }, "long name");
  bad({ hypotheses: [h("A", { extra: 1 }), h("B")], evidence: ok.evidence }, "unknown hypothesis field");
  bad({ hypotheses: ok.hypotheses, evidence: [{ id: "e1", text: "x".repeat(301), likelihoods: {} }] }, "long text");
  bad({ hypotheses: ok.hypotheses, evidence: [{ id: "e1", text: "   ", likelihoods: {} }] }, "blank text");
  bad({ hypotheses: ok.hypotheses, evidence: [{ id: "e1", text: "k", likelihoods: { Z: 0.5 } }] }, "unknown hypothesis in likelihoods");
  bad({ hypotheses: ok.hypotheses, evidence: [{ id: "e1", text: "k", likelihoods: JSON.parse('{"__proto__": 0.5}') }] }, "__proto__ likelihood key");
  bad({ hypotheses: ok.hypotheses, evidence: [{ id: "e1", text: "k", likelihoods: [0.5, 0.5] }] }, "likelihoods array");
});

test("texts are masked: a secret-shaped token never reaches the output", () => {
  const secret = "sk-abcdefghijklmnopqrstuvwxyz0123";
  const a = analyzeHypotheses({ hypotheses: [h("A", { name: `ad ${secret}` }), h("B")], evidence: [{ id: "e1", text: `kanıt ${secret}\nsatır`, likelihoods: { A: 0.5, B: 0.5 } }] });
  assert.doesNotMatch(JSON.stringify(a), /sk-abcdef/);
  assert.match(a.evidence[0]!.text, /\[REDACTED\]/);
  assert.doesNotMatch(a.evidence[0]!.text, /\n/);
});
