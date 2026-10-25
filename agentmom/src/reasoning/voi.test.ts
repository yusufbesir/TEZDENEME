// Bilgi değeri değerlendirici testleri. Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Saf matematik. Klasik petrol sondajı örneği elle hesaplanmıştır:
//   p(petrol)=0,3; sondaj: petrol +200, kuru −60; sondaj yok: 0.  EV(sondaj)=60−42=18; EVPI=0,3·200−18=42.
//   Sismik test: P(pozitif|petrol)=0,8, P(pozitif|kuru)=0,2. Birleşik: poz-petrol 0,24, poz-kuru 0,7·0,2=0,14 => sondaj 48−8,4=39,6; neg: 12−33,6<0 => 0.
//   EVSI = 39,6 − 18 = 21,6.
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateVoi } from "./voi.ts";
import { ReasoningError } from "./reasoning.ts";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);
const bad = (input: unknown, why: string) => assert.throws(() => evaluateVoi(input), (e: unknown) => e instanceof ReasoningError && e.code === "invalid_field", why);

const base = () => ({
  states: [{ id: "petrol", p: 0.3 }, { id: "kuru", p: 0.7 }],
  options: [
    { id: "sondaj", name: "Sondaj yap", payoffs: { petrol: 200, kuru: -60 } },
    { id: "yok", name: "Sondaj yapma", payoffs: { petrol: 0, kuru: 0 } },
  ],
});
const seismic = (cost: number) => ({ id: "sismik", name: "Sismik", cost, likelihoods: { petrol: { poz: 0.8, neg: 0.2 }, kuru: { poz: 0.2, neg: 0.8 } } });

test("oil drilling: expected values, best option, EVPI and EVSI match the hand calculation", () => {
  const r = evaluateVoi({ ...base(), tests: [seismic(10)] });
  close(r.optionValues[0]!.expectedValue, 18);
  close(r.optionValues[1]!.expectedValue, 0);
  assert.equal(r.bestOption.id, "sondaj");
  close(r.bestOption.expectedValue, 18);
  close(r.margin!, 18);
  close(r.evpi, 42);
  const t = r.tests[0]!;
  close(t.evsi, 21.6);
  close(t.net, 11.6);
  assert.equal(t.worthIt, true);
  assert.ok(t.evsi <= r.evpi);
  const pos = t.outcomes.find((o) => o.outcome === "poz")!;
  close(pos.probability, 0.38);
  assert.equal(pos.bestOptionId, "sondaj");
  assert.equal(t.outcomes.find((o) => o.outcome === "neg")!.bestOptionId, "yok");
  assert.equal(r.recommendation.gather, true);
  assert.equal(r.recommendation.testId, "sismik");
  assert.match(r.recommendation.text, /Bilgi toplamaya değer/);
  // iki durumlu duyarlılık: q·200 + (1−q)(−60) = 0 => q = 60/260
  assert.ok(r.sensitivity.some((s) => s.includes("0.230769")));
});

test("a test costing more than its EVSI is not worth it; the cheaper-net test wins among several", () => {
  const r = evaluateVoi({ ...base(), tests: [seismic(30), { ...seismic(5), id: "ucuz", name: "Ucuz test" }] });
  assert.equal(r.tests[0]!.worthIt, false);
  close(r.tests[0]!.net, -8.4);
  assert.equal(r.recommendation.testId, "ucuz");
  const none = evaluateVoi({ ...base(), tests: [seismic(30)] });
  assert.equal(none.recommendation.gather, false);
  assert.equal(none.recommendation.testId, null);
  assert.match(none.recommendation.text, /net değeri pozitif değil/);
});

test("perfect and useless tests: EVSI = EVPI for a perfectly informative test, 0 for an uninformative one", () => {
  const perfect = { id: "mukemmel", name: "Mükemmel", cost: 0, likelihoods: { petrol: { p: 1, k: 0 }, kuru: { p: 0, k: 1 } } };
  const useless = { id: "bos", name: "Boş", cost: 0, likelihoods: { petrol: { a: 0.5, b: 0.5 }, kuru: { a: 0.5, b: 0.5 } } };
  const r = evaluateVoi({ ...base(), tests: [perfect, useless] });
  close(r.tests[0]!.evsi, r.evpi);
  close(r.tests[1]!.evsi, 0);
  assert.equal(r.tests[1]!.worthIt, false);
});

test("no tests: the recommendation is based on EVPI; a dominant option means no information is worth gathering", () => {
  const r = evaluateVoi(base());
  assert.deepEqual(r.tests, []);
  assert.equal(r.recommendation.gather, true);
  assert.match(r.recommendation.text, /Test verilmedi/);
  const dominant = evaluateVoi({
    states: [{ id: "a", p: 0.5 }, { id: "b", p: 0.5 }],
    options: [{ id: "x", name: "X", payoffs: { a: 10, b: 10 } }, { id: "y", name: "Y", payoffs: { a: 1, b: 1 } }],
  });
  close(dominant.evpi, 0);
  assert.equal(dominant.recommendation.gather, false);
});

test("three states: EV and EVPI computed generally", () => {
  const r = evaluateVoi({
    states: [{ id: "s1", p: 0.2 }, { id: "s2", p: 0.5 }, { id: "s3", p: 0.3 }],
    options: [
      { id: "o1", name: "O1", payoffs: { s1: 10, s2: 0, s3: 5 } },
      { id: "o2", name: "O2", payoffs: { s1: 0, s2: 8, s3: 0 } },
      { id: "o3", name: "O3", payoffs: { s1: 3, s2: 3, s3: 3 } },
    ],
  });
  // EV: o1 = 2 + 0 + 1,5 = 3,5; o2 = 4; o3 = 3. En iyi o2. Mükemmel: 0,2·10 + 0,5·8 + 0,3·5 = 7,5 => EVPI 3,5.
  assert.equal(r.bestOption.id, "o2");
  close(r.evpi, 3.5);
  close(r.margin!, 0.5);
});

test("deterministic", () => {
  const input = { ...base(), tests: [seismic(10)] };
  assert.deepEqual(evaluateVoi(input), evaluateVoi(structuredClone(input)));
});

test("hostile input: NaN, Infinity, huge numbers, bad sums, missing/extra keys, duplicates, prototype keys, too many items", () => {
  assert.doesNotThrow(() => evaluateVoi({ ...base(), tests: [seismic(1)] }));
  bad(null, "null");
  bad({ ...base(), extra: 1 }, "unknown field");
  bad({ states: [{ id: "a", p: 1 }], options: base().options }, "one state");
  bad({ states: base().states, options: [base().options[0]] }, "one option");
  bad({ ...base(), states: [{ id: "petrol", p: 0.3 }, { id: "kuru", p: 0.6 }] }, "p sum 0.9");
  bad({ ...base(), states: [{ id: "petrol", p: NaN }, { id: "kuru", p: 1 }] }, "p NaN");
  bad({ ...base(), states: [{ id: "petrol", p: 1.5 }, { id: "kuru", p: -0.5 }] }, "p out of range");
  bad({ ...base(), states: [{ id: "petrol", p: 0.5 }, { id: "petrol", p: 0.5 }] }, "duplicate state");
  for (const v of [NaN, Infinity, -Infinity, 1e13, -1e13, "5", null]) {
    bad({ ...base(), options: [{ id: "sondaj", name: "S", payoffs: { petrol: v, kuru: 0 } }, base().options[1]] }, `payoff ${String(v)}`);
  }
  bad({ ...base(), options: [{ id: "sondaj", name: "S", payoffs: { petrol: 1 } }, base().options[1]] }, "missing payoff");
  bad({ ...base(), options: [{ id: "sondaj", name: "S", payoffs: { petrol: 1, kuru: 1, baska: 2 } }, base().options[1]] }, "extra payoff key");
  bad({ ...base(), options: [{ id: "sondaj", name: "S", payoffs: JSON.parse('{"__proto__": 1, "petrol": 1, "kuru": 1}') }, base().options[1]] }, "__proto__ payoff key");
  bad({ ...base(), options: [base().options[0], { ...base().options[1], id: "sondaj" }] }, "duplicate option");
  for (const id of ["__proto__", "constructor", "prototype", "", "a b"]) bad({ ...base(), options: [{ ...base().options[0], id }, base().options[1]] }, `option id ${id}`);
  bad({ ...base(), options: Array.from({ length: 11 }, (_, i) => ({ id: `o${i}`, name: "O", payoffs: { petrol: i, kuru: i } })) }, "11 options");
  bad({ ...base(), tests: Array.from({ length: 6 }, (_, i) => ({ ...seismic(1), id: `t${i}` })) }, "6 tests");
  bad({ ...base(), tests: [{ ...seismic(1), cost: -1 }] }, "negative cost");
  bad({ ...base(), tests: [{ ...seismic(1), cost: NaN }] }, "NaN cost");
  bad({ ...base(), tests: [{ ...seismic(1), cost: 1e13 }] }, "huge cost");
  bad({ ...base(), tests: [{ ...seismic(1), likelihoods: { petrol: { poz: 0.8, neg: 0.3 }, kuru: { poz: 0.2, neg: 0.8 } } }] }, "likelihood row sums to 1.1");
  bad({ ...base(), tests: [{ ...seismic(1), likelihoods: { petrol: { poz: 0.8, neg: 0.2 } } }] }, "missing state in likelihoods");
  bad({ ...base(), tests: [{ ...seismic(1), likelihoods: { petrol: { poz: 1 }, kuru: { poz: 1 } } }] }, "single outcome");
  bad({ ...base(), tests: [{ ...seismic(1), likelihoods: JSON.parse('{"__proto__": {"a": 1}, "petrol": {"a": 0.5, "b": 0.5}, "kuru": {"a": 0.5, "b": 0.5}}') }] }, "__proto__ state key");
  bad({ ...base(), tests: [{ ...seismic(1), likelihoods: { petrol: { poz: 0.8, "__proto__": 0.2 }, kuru: { poz: 0.2, neg: 0.8 } } }] }, "outcome id");
  bad({ ...base(), tests: "yok" }, "tests not array");
});

test("names are masked: a secret-shaped token in an option or test name never reaches the output", () => {
  const secret = "sk-abcdefghijklmnopqrstuvwxyz0123";
  const input = base();
  input.options[0]!.name = `Sondaj ${secret}`;
  const r = evaluateVoi({ ...input, tests: [{ ...seismic(10), name: `Sismik ${secret}` }] });
  assert.doesNotMatch(JSON.stringify(r), /sk-abcdef/);
  assert.match(r.bestOption.name, /\[REDACTED\]/);
});
