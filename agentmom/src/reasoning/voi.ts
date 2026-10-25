// Bilgi değeri değerlendirici (madde 63). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// SAF MATEMATİK: durumsuz, kayıt yok, model/ağ/dosya yok. Yalnızca ÖNERİDİR; karar kullanıcıdadır.
// Tanımlar (kazanç büyüklüğü beklenen değer ölçeğindedir; birimi kullanıcı seçer):
//   EV(o)  = Σ_s p(s) · kazanç(o, s)                      seçeneğin beklenen değeri
//   EV*    = max_o EV(o)                                   bilgisiz en iyi karar
//   EVPI   = Σ_s p(s) · max_o kazanç(o, s) − EV*           mükemmel bilginin değeri (üst sınır)
//   EVSI(t)= Σ_y max_o Σ_s p(s) · L(y|s) · kazanç(o, s) − EV*   t testinin (kusurlu bilgi) beklenen değeri
//   net(t) = EVSI(t) − maliyet(t);  net > 0 ise "toplamaya değer"
// Birleşik olasılık biçimi kullanılır (P(y) ile bölme yok): sıfır olasılıklı sonuçlarda bölme hatası olmaz.
import { redactString } from "../core/audit/redact.ts";
import { ReasoningError } from "./reasoning.ts";

export const MIN_STATES = 2;
export const MAX_STATES = 10;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 10;
export const MAX_TESTS = 5;
export const MAX_OUTCOMES = 10;
export const MAX_ABS = 1e12;
export const SUM_TOLERANCE = 1e-6;

const ID = /^[A-Za-z0-9_-]{1,30}$/;
const BAD_IDS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

export interface VoiTestResult {
  id: string;
  name: string;
  cost: number;
  evsi: number;
  net: number;
  worthIt: boolean;
  outcomes: Array<{ outcome: string; probability: number; bestOptionId: string }>;
}

export interface VoiResult {
  optionValues: Array<{ id: string; name: string; expectedValue: number }>;
  bestOption: { id: string; name: string; expectedValue: number };
  margin: number | null;
  evpi: number;
  tests: VoiTestResult[];
  recommendation: { gather: boolean; testId: string | null; text: string };
  sensitivity: string[];
  assumptions: string[];
}

function fail(message: string): never {
  throw new ReasoningError("invalid_field", message);
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function onlyKeys(o: Record<string, unknown>, allowed: readonly string[], where: string): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(`${where}: bilinmeyen alan`);
}

function idOf(v: unknown, where: string): string {
  if (typeof v !== "string" || !ID.test(v) || BAD_IDS.has(v)) fail(`${where}: kimlik harf, rakam, - ve _ içeren 1..30 karakterlik bir ad olmalı`);
  return v;
}

function nameOf(v: unknown, where: string): string {
  if (typeof v !== "string" || v.trim().length === 0 || v.length > 100) fail(`${where}: 1..100 karakterlik bir ad olmalı`);
  return redactString(v).replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}

function prob(v: unknown, where: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) fail(`${where}: 0 ile 1 arasında sayı olmalı`);
  return v;
}

function money(v: unknown, where: string, nonNegative: boolean): number {
  if (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > MAX_ABS || (nonNegative && v < 0)) fail(`${where}: ${nonNegative ? "0" : "-1e12"} ile 1e12 arasında sonlu bir sayı olmalı`);
  return v;
}

// Toplamayı sıfıra yakın gürültüden arındır: |x| ≤ 1e-9·ölçek ise 0.
function clean(x: number, scale: number): number {
  return Math.abs(x) <= 1e-9 * Math.max(1, scale) ? 0 : x;
}

export function evaluateVoi(input: unknown): VoiResult {
  if (!isObj(input)) fail("gövde bir nesne olmalı");
  onlyKeys(input, ["states", "options", "tests"], "gövde");
  if (!Array.isArray(input.states) || input.states.length < MIN_STATES || input.states.length > MAX_STATES) fail(`states ${MIN_STATES}..${MAX_STATES} öğeli bir dizi olmalı`);
  if (!Array.isArray(input.options) || input.options.length < MIN_OPTIONS || input.options.length > MAX_OPTIONS) fail(`options ${MIN_OPTIONS}..${MAX_OPTIONS} öğeli bir dizi olmalı`);
  const rawTests: unknown[] = input.tests === undefined ? [] : Array.isArray(input.tests) && input.tests.length <= MAX_TESTS ? input.tests : fail(`tests en çok ${MAX_TESTS} öğeli bir dizi olmalı`);

  const sIds: string[] = [];
  const p: number[] = [];
  input.states.forEach((raw: unknown, i: number) => {
    const where = `states[${i}]`;
    if (!isObj(raw)) fail(`${where}: nesne olmalı`);
    onlyKeys(raw, ["id", "p"], where);
    const id = idOf(raw.id, `${where}.id`);
    if (sIds.includes(id)) fail(`${where}.id: kimlik tekrarlandı`);
    sIds.push(id);
    p.push(prob(raw.p, `${where}.p`));
  });
  if (Math.abs(p.reduce((a, b) => a + b, 0) - 1) > SUM_TOLERANCE) fail("durum olasılıklarının toplamı 1 olmalı");

  const oIds: string[] = [];
  const oNames: string[] = [];
  const pay: number[][] = [];
  input.options.forEach((raw: unknown, i: number) => {
    const where = `options[${i}]`;
    if (!isObj(raw)) fail(`${where}: nesne olmalı`);
    onlyKeys(raw, ["id", "name", "payoffs"], where);
    const id = idOf(raw.id, `${where}.id`);
    if (oIds.includes(id)) fail(`${where}.id: kimlik tekrarlandı`);
    oIds.push(id);
    oNames.push(nameOf(raw.name, `${where}.name`));
    if (!isObj(raw.payoffs)) fail(`${where}.payoffs: nesne olmalı`);
    const po = raw.payoffs;
    for (const k of Object.keys(po)) if (!sIds.includes(k)) fail(`${where}.payoffs: bilinmeyen durum kimliği`);
    pay.push(
      sIds.map((s) => {
        if (!Object.hasOwn(po, s)) fail(`${where}.payoffs: her durum için kazanç verilmeli`);
        return money(po[s], `${where}.payoffs.${s}`, false);
      }),
    );
  });

  const scale = Math.max(1, ...pay.flat().map(Math.abs));
  const ev = pay.map((row) => row.reduce((a, v, si) => a + (p[si] as number) * v, 0));
  let best = 0;
  ev.forEach((v, i) => {
    if (v > (ev[best] as number)) best = i;
  });
  const evStar = ev[best] as number;
  const perfect = sIds.reduce((a, _, si) => a + (p[si] as number) * Math.max(...pay.map((row) => row[si] as number)), 0);
  const evpi = clean(perfect - evStar, scale);
  const sorted = [...ev].sort((a, b) => b - a);
  const margin = sorted.length > 1 ? clean((sorted[0] as number) - (sorted[1] as number), scale) : null;

  const tIds: string[] = [];
  const tests: VoiTestResult[] = rawTests.map((raw: unknown, i: number) => {
    const where = `tests[${i}]`;
    if (!isObj(raw)) fail(`${where}: nesne olmalı`);
    onlyKeys(raw, ["id", "name", "cost", "likelihoods"], where);
    const id = idOf(raw.id, `${where}.id`);
    if (tIds.includes(id)) fail(`${where}.id: kimlik tekrarlandı`);
    tIds.push(id);
    const name = nameOf(raw.name, `${where}.name`);
    const cost = money(raw.cost, `${where}.cost`, true);
    if (!isObj(raw.likelihoods)) fail(`${where}.likelihoods: nesne olmalı`);
    const lk = raw.likelihoods;
    for (const k of Object.keys(lk)) if (!sIds.includes(k)) fail(`${where}.likelihoods: bilinmeyen durum kimliği`);
    const outcomes: string[] = [];
    const table: Map<string, number>[] = sIds.map((s) => {
      if (!Object.hasOwn(lk, s)) fail(`${where}.likelihoods: her durum için sonuç dağılımı verilmeli`);
      const row = lk[s];
      if (!isObj(row)) fail(`${where}.likelihoods.${s}: nesne olmalı`);
      const m = new Map<string, number>();
      let sum = 0;
      for (const y of Object.keys(row)) {
        const yid = idOf(y, `${where}.likelihoods.${s}`);
        const v = prob(row[y], `${where}.likelihoods.${s}.${yid}`);
        m.set(yid, v);
        sum += v;
        if (!outcomes.includes(yid)) outcomes.push(yid);
      }
      if (Math.abs(sum - 1) > SUM_TOLERANCE) fail(`${where}.likelihoods.${s}: sonuç olasılıklarının toplamı 1 olmalı`);
      return m;
    });
    if (outcomes.length < 2 || outcomes.length > MAX_OUTCOMES) fail(`${where}: 2..${MAX_OUTCOMES} farklı sonuç olmalı`);
    let total = 0;
    const per = outcomes.map((y) => {
      // joint[o] = Σ_s p(s) L(y|s) kazanç(o,s)
      const joint = pay.map((row) => row.reduce((a, v, si) => a + (p[si] as number) * (table[si]?.get(y) ?? 0) * v, 0));
      let bo = 0;
      joint.forEach((v, oi) => {
        if (v > (joint[bo] as number)) bo = oi;
      });
      total += joint[bo] as number;
      const py = sIds.reduce((a, _, si) => a + (p[si] as number) * (table[si]?.get(y) ?? 0), 0);
      return { outcome: y, probability: py, bestOptionId: oIds[bo] as string };
    });
    const evsi = clean(total - evStar, scale);
    const net = clean(evsi - cost, scale);
    return { id, name, cost, evsi, net, worthIt: net > 0, outcomes: per };
  });

  const bestTest = tests.reduce<VoiTestResult | null>((b, t) => (t.worthIt && (b === null || t.net > b.net) ? t : b), null);
  const recommendation = bestTest
    ? { gather: true, testId: bestTest.id, text: `Bilgi toplamaya değer: '${bestTest.name}' (beklenen net değer ${bestTest.net}, EVSI ${bestTest.evsi}, maliyet ${bestTest.cost}).` }
    : tests.length > 0
      ? { gather: false, testId: null, text: `Hiçbir testin net değeri pozitif değil: bilgi toplamadan '${oNames[best]}' seçeneğiyle ilerlemek beklenen değerce daha iyi.` }
      : { gather: evpi > 0, testId: null, text: evpi > 0 ? `Test verilmedi. Mükemmel bilginin değeri ${evpi}: bir testin maliyeti bundan büyükse toplamaya değmez.` : "Test verilmedi ve mükemmel bilgi kararı değiştirmez (EVPI 0): bilgi toplamaya gerek yok." };

  const sensitivity: string[] = [];
  if (margin !== null && margin <= 0.05 * scale) sensitivity.push(`En iyi iki seçenek arasındaki fark küçük (${margin}): olasılık ya da kazanç tahminlerindeki küçük bir değişiklik seçimi çevirebilir.`);
  if (sIds.length === 2 && sorted.length > 1) {
    const second = ev.indexOf(sorted[1] as number);
    // p(s0)=q için iki doğrunun kesişimi: q·(a0−b0) + (1−q)·(a1−b1) = 0.
    const d0 = (pay[best]?.[0] as number) - (pay[second]?.[0] as number);
    const d1 = (pay[best]?.[1] as number) - (pay[second]?.[1] as number);
    if (d0 - d1 !== 0) {
      const q = -d1 / (d0 - d1);
      if (q > 0 && q < 1 && second !== best) sensitivity.push(`'${sIds[0]}' durumunun olasılığı ${Number(q.toFixed(6))} olursa '${oNames[best]}' ile '${oNames[second]}' eşitlenir (şu an ${p[0]}).`);
    }
  }
  for (const t of tests) if (t.cost > 0 && Math.abs(t.net) <= 0.1 * t.cost) sensitivity.push(`'${t.name}' için net değer maliyete göre çok küçük (${t.net}): karar tahminlere duyarlı.`);
  if (sensitivity.length === 0) sensitivity.push("Verilen olasılık ve kazançlarda belirgin bir duyarlılık işareti yok; yine de olasılıklar öznel tahmindir.");

  return {
    optionValues: oIds.map((id, i) => ({ id, name: oNames[i] as string, expectedValue: ev[i] as number })),
    bestOption: { id: oIds[best] as string, name: oNames[best] as string, expectedValue: evStar },
    margin,
    evpi,
    tests,
    recommendation,
    sensitivity,
    assumptions: [
      "Olasılıklar ve kazançlar kullanıcının girdisidir; hesap yalnız beklenen değeri maksimize eder (risk iştahı yok).",
      "Test sonuçları durum verilmişken tanımlanır; sonuçtan sonra en iyi seçenek yeniden seçilir.",
      "EVSI ≤ EVPI her zaman geçerlidir; testin maliyeti EVPI'yi aşarsa hiçbir test değmez.",
      "Sonuç bir ÖNERİDİR; hiçbir şey kaydedilmez ve karar yerine geçmez.",
    ],
  };
}
