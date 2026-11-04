// Ajan/model kıyaslama merkezi (madde 12, D10). Sahip: Claude [İP:AgentMom devam]; yalnız yazan yapay zeka değiştirir.
// SALT OKUNUR, modelsiz, ağsız, kendiliğinden çalışmaz (ADR-016): sağlayıcıları KOŞTURMAZ. Kullanıcı (ya da kendi aracı) sabit bir vaka kümesini sağlayıcı/model başına koşturur, sonucu bir JSON dosyasına yazar;
// bu modül dosyaları katı doğrular ve karşılaştırır. Karşılaştırma yalnız ortak vakalar üzerindedir (farklı vaka kümesiyle adil kıyas olmaz).
// Aritmetik koddadır (model yok): geçme oranı Wilson %95 aralığıyla verilir; aralıklar çakışıyorsa sağlayıcılar "ayırt edilemez" sayılır, sıralama uydurulmaz.
// Örnek boyutu < MIN_SAMPLE ise oran YAZILMAZ ("yetersiz veri"). Başlıklar gizli bilgi taramasından geçer (kapsülle aynı kalıplar).
// Tekrarlanan koşular BAĞIMSIZ sayılmaz: oran vaka başına geçme oranlarının ortalamasıdır, aralık ayrı vaka sayısı üzerinden hesaplanır; MIN_SAMPLE de ayrı (ortak) vaka sayısıdır. Aynı koşu dosyası iki kez verilirse reddedilir.
import { hasSecret } from "../ops/capsule.ts";

export class BenchmarkError extends Error {}

export const SUITE_SCHEMA = "agentmom-benchmark-suite/1";
export const RESULTS_SCHEMA = "agentmom-benchmark-results/1";
export const CATEGORIES = ["plan", "implement", "review", "verify", "other"] as const;
export type Category = (typeof CATEGORIES)[number];
export const MIN_SAMPLE = 10;
export const MAX_CASES = 500;
export const MAX_RESULTS_FILES = 50;
const Z = 1.96;
const ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

export interface BenchCase {
  id: string;
  title: string;
  category: Category;
}
export interface BenchSuite {
  id: string;
  title: string;
  cases: BenchCase[];
}
export interface BenchResult {
  caseId: string;
  passed: boolean;
  ms: number | null;
  tokens: number | null;
}
export interface BenchRun {
  suiteId: string;
  runAt: string;
  provider: string;
  model: string;
  results: BenchResult[];
}

const obj = (v: unknown, what: string): Record<string, unknown> => {
  if (v === null || typeof v !== "object" || Array.isArray(v)) throw new BenchmarkError(`${what} bir nesne olmalı`);
  return v as Record<string, unknown>;
};
function exactKeys(o: Record<string, unknown>, allowed: string[], what: string): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) throw new BenchmarkError(`${what}: bilinmeyen alan ${k.slice(0, 30)}`);
}
function text(v: unknown, what: string, max: number): string {
  if (typeof v !== "string" || v.length === 0 || v.length > max) throw new BenchmarkError(`${what} 1..${max} karakterlik metin olmalı`);
  if (CONTROL.test(v)) throw new BenchmarkError(`${what} denetim/biçim karakteri içeremez`);
  if (hasSecret(v)) throw new BenchmarkError(`${what} gizli bilgiye benziyor; hiçbir şey kabul edilmedi`);
  return v;
}
function id(v: unknown, what: string): string {
  if (typeof v !== "string" || !ID_RE.test(v)) throw new BenchmarkError(`${what} harf, rakam, . _ - içeren 1..64 karakterlik kimlik olmalı`);
  return v;
}

export function parseSuite(raw: unknown): BenchSuite {
  const o = obj(raw, "vaka kümesi");
  exactKeys(o, ["schema", "id", "title", "cases"], "vaka kümesi");
  if (o["schema"] !== SUITE_SCHEMA) throw new BenchmarkError(`schema ${SUITE_SCHEMA} olmalı`);
  const cases = o["cases"];
  if (!Array.isArray(cases) || cases.length === 0 || cases.length > MAX_CASES) throw new BenchmarkError(`cases 1..${MAX_CASES} elemanlı dizi olmalı`);
  const seen = new Set<string>();
  const out: BenchCase[] = cases.map((c, i) => {
    const co = obj(c, `cases[${i}]`);
    exactKeys(co, ["id", "title", "category"], `cases[${i}]`);
    const cid = id(co["id"], `cases[${i}].id`);
    if (seen.has(cid)) throw new BenchmarkError(`vaka kimliği tekrarlandı: ${cid}`);
    seen.add(cid);
    const category = co["category"];
    if (typeof category !== "string" || !(CATEGORIES as readonly string[]).includes(category)) throw new BenchmarkError(`cases[${i}].category ${CATEGORIES.join("|")} olmalı`);
    return { id: cid, title: text(co["title"], `cases[${i}].title`, 200), category: category as Category };
  });
  return { id: id(o["id"], "id"), title: text(o["title"], "title", 200), cases: out };
}

export function parseRun(raw: unknown, suite: BenchSuite): BenchRun {
  const o = obj(raw, "sonuç dosyası");
  exactKeys(o, ["schema", "suiteId", "runAt", "provider", "model", "results"], "sonuç dosyası");
  if (o["schema"] !== RESULTS_SCHEMA) throw new BenchmarkError(`schema ${RESULTS_SCHEMA} olmalı`);
  if (o["suiteId"] !== suite.id) throw new BenchmarkError("suiteId vaka kümesiyle eşleşmiyor");
  const runAt = o["runAt"];
  if (typeof runAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(runAt) || Number.isNaN(Date.parse(runAt)) || new Date(runAt).toISOString().slice(0, 19) !== runAt.slice(0, 19) || runAt < "2000-" || runAt >= "2101-") throw new BenchmarkError("runAt UTC ISO zamanı olmalı (…Z)");
  const results = o["results"];
  if (!Array.isArray(results) || results.length === 0 || results.length > MAX_CASES) throw new BenchmarkError(`results 1..${MAX_CASES} elemanlı dizi olmalı`);
  const known = new Set(suite.cases.map((c) => c.id));
  const seen = new Set<string>();
  const out: BenchResult[] = results.map((r, i) => {
    const ro = obj(r, `results[${i}]`);
    exactKeys(ro, ["caseId", "passed", "ms", "tokens"], `results[${i}]`);
    const caseId = id(ro["caseId"], `results[${i}].caseId`);
    if (!known.has(caseId)) throw new BenchmarkError(`results[${i}].caseId vaka kümesinde yok: ${caseId}`);
    if (seen.has(caseId)) throw new BenchmarkError(`bir koşuda vaka tekrarlandı: ${caseId}`);
    seen.add(caseId);
    if (typeof ro["passed"] !== "boolean") throw new BenchmarkError(`results[${i}].passed true/false olmalı`);
    const num = (k: "ms" | "tokens", max: number): number | null => {
      const v = ro[k];
      if (v === undefined || v === null) return null;
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > max) throw new BenchmarkError(`results[${i}].${k} 0..${max} arası tam sayı olmalı`);
      return v;
    };
    return { caseId, passed: ro["passed"], ms: num("ms", 86_400_000), tokens: num("tokens", 1_000_000_000) };
  });
  return { suiteId: suite.id, runAt, provider: id(o["provider"], "provider"), model: id(o["model"], "model"), results: out };
}

// Wilson %95 aralığı (k başarı, n deneme).
export function wilson(k: number, n: number): { low: number; high: number } {
  if (n <= 0) return { low: 0, high: 1 };
  const p = k / n;
  const z2 = Z * Z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}

export interface EntityReport {
  provider: string;
  model: string;
  runs: number;
  casesCovered: number;
  attempts: number;
  passes: number;
  distinctCases: number;
  status: "ok" | "yetersiz veri";
  rate: number | null;
  low: number | null;
  high: number | null;
  medianMs: number | null;
  totalTokens: number | null;
  byCategory: Array<{ category: Category; attempts: number; passes: number }>;
}
export interface Comparison {
  suiteId: string;
  commonCases: number;
  entities: EntityReport[];
  // Alt sınıra göre sıralı kümeler; zincirleme çakışan aralıklar aynı kümede (bkz. compare içindeki not).
  ranking: string[][];
  warnings: string[];
}

export function compare(suite: BenchSuite, runs: BenchRun[]): Comparison {
  if (runs.length === 0 || runs.length > MAX_RESULTS_FILES) throw new BenchmarkError(`sonuç dosyası sayısı 1..${MAX_RESULTS_FILES} olmalı`);
  const seenRuns = new Set<string>();
  for (const r of runs) {
    const fp = JSON.stringify([r.provider, r.model, r.runAt, r.results]);
    if (seenRuns.has(fp)) throw new BenchmarkError(`aynı koşu iki kez verildi: ${r.provider}/${r.model} ${r.runAt}`);
    seenRuns.add(fp);
  }
  const byEntity = new Map<string, BenchRun[]>();
  for (const r of runs) (byEntity.get(`${r.provider}/${r.model}`) ?? byEntity.set(`${r.provider}/${r.model}`, []).get(`${r.provider}/${r.model}`)!).push(r);
  const warnings: string[] = [];
  // Ortak vakalar: her sağlayıcı/modelin en az bir koşuda yanıtladığı vakaların kesişimi.
  let common: Set<string> | null = null;
  for (const rs of byEntity.values()) {
    const covered = new Set(rs.flatMap((r) => r.results.map((x) => x.caseId)));
    common = common === null ? covered : new Set([...common].filter((c) => covered.has(c)));
  }
  const commonSet = common ?? new Set<string>();
  const catOf = new Map(suite.cases.map((c) => [c.id, c.category]));
  const entities: EntityReport[] = [];
  for (const [key, rs] of [...byEntity].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const slash = key.indexOf("/");
    const rows = rs.flatMap((r) => r.results).filter((x) => commonSet.has(x.caseId));
    const passes = rows.filter((x) => x.passed).length;
    const attempts = rows.length;
    // Vaka başına geçme oranı; tekrar koşular vaka tahminini sağlamlaştırır ama örnek sayısını artırmaz.
    const perCase = new Map<string, { n: number; k: number }>();
    for (const x of rows) {
      const c = perCase.get(x.caseId) ?? { n: 0, k: 0 };
      c.n++;
      if (x.passed) c.k++;
      perCase.set(x.caseId, c);
    }
    const distinct = perCase.size;
    const effective = [...perCase.values()].reduce((acc, c) => acc + c.k / c.n, 0);
    const ok = distinct >= MIN_SAMPLE;
    const w = ok ? wilson(effective, distinct) : null;
    const ms = rows.map((x) => x.ms).filter((x): x is number => x !== null);
    const toks = rows.map((x) => x.tokens).filter((x): x is number => x !== null);
    const cats = CATEGORIES.map((category) => {
      const cr = rows.filter((x) => catOf.get(x.caseId) === category);
      return { category, attempts: cr.length, passes: cr.filter((x) => x.passed).length };
    }).filter((c) => c.attempts > 0);
    entities.push({
      provider: key.slice(0, slash),
      model: key.slice(slash + 1),
      runs: rs.length,
      casesCovered: new Set(rs.flatMap((r) => r.results.map((x) => x.caseId))).size,
      attempts,
      passes,
      distinctCases: distinct,
      status: ok ? "ok" : "yetersiz veri",
      rate: ok ? effective / distinct : null,
      low: w ? w.low : null,
      high: w ? w.high : null,
      medianMs: median(ms),
      totalTokens: toks.length === rows.length && toks.length > 0 ? toks.reduce((a, b) => a + b, 0) : null,
      byCategory: cats,
    });
    if (ms.length > 0 && ms.length < rows.length) warnings.push(`${key}: süre ${ms.length}/${rows.length} denemede kayıtlı; ortanca yalnız kayıtlılardan`);
    if (toks.length > 0 && toks.length < rows.length) warnings.push(`${key}: token ${toks.length}/${rows.length} denemede kayıtlı; toplam yazılmadı`);
  }
  if (byEntity.size > 1 && commonSet.size < suite.cases.length) warnings.push(`ortak vaka ${commonSet.size}/${suite.cases.length}: karşılaştırma yalnız ortak vakalar üzerinde`);
  if (commonSet.size === 0) warnings.push("ortak vaka yok: karşılaştırılacak bir şey yok");
  for (const e of entities) if (e.status !== "ok") warnings.push(`${e.provider}/${e.model}: ${e.distinctCases} ayrı vaka < ${MIN_SAMPLE}, yetersiz veri (oran yazılmadı)`);
  // Sıralama: yeterli verili olanlar, alt sınıra göre; aralığı bir sonrakiyle çakışanlar aynı kümede.
  const ranked = entities.filter((e) => e.status === "ok").sort((a, b) => (b.low as number) - (a.low as number) || (`${a.provider}\0${a.model}` < `${b.provider}\0${b.model}` ? -1 : 1));
  const groups: string[][] = [];
  let lastLow = 0;
  for (const e of ranked) {
    const label = `${e.provider}/${e.model}`;
    // Zincirleme: kümenin SON üyesiyle aralığı çakışan (e.high >= son.low) kümeye girer. Kümedeki herkes birbirinden ayırt edilemez demek değildir
    // (A ile C ayrışabilir, B ikisiyle de çakışabilir); küme "kanıt bunları kesin sıralamaya yetmiyor" demektir.
    if (groups.length > 0 && (e.high as number) >= lastLow) groups[groups.length - 1]!.push(label);
    else groups.push([label]);
    lastLow = e.low as number;
  }
  return { suiteId: suite.id, commonCases: commonSet.size, entities, ranking: groups, warnings };
}

const clean = (s: string): string => s.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}|`<>\\]/gu, " ");
const pct = (x: number | null): string => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);

export function renderComparison(c: Comparison): string {
  const lines: string[] = [];
  lines.push(`Vaka kümesi: ${clean(c.suiteId)}; ortak vaka: ${c.commonCases}; sağlayıcı/model: ${c.entities.length}`);
  lines.push("", "| Sağlayıcı/model | Koşu | Deneme | Geçme | %95 aralık | Ortanca süre (ms) | Token |", "|---|---|---|---|---|---|---|");
  for (const e of c.entities) {
    const range = e.low === null ? "yetersiz veri" : `${pct(e.low)}–${pct(e.high)}`;
    lines.push(`| ${clean(e.provider)}/${clean(e.model)} | ${e.runs} | ${e.attempts} | ${e.rate === null ? "—" : pct(e.rate)} | ${range} | ${e.medianMs ?? "—"} | ${e.totalTokens ?? "—"} |`);
  }
  lines.push("", "Sıralama (zincirleme çakışan aralıklar aynı satırda; kanıt kesin sıralamaya yetmiyor):");
  if (c.ranking.length === 0) lines.push("- (sıralanacak yeterli veri yok)");
  c.ranking.forEach((g, i) => lines.push(`${i + 1}. ${g.map(clean).join("  ≈  ")}`));
  if (c.warnings.length > 0) {
    lines.push("", "Uyarılar:");
    for (const w of c.warnings) lines.push(`- ${clean(w)}`);
  }
  lines.push("", "Not: yalnız kullanıcının getirdiği sonuçlar karşılaştırılır; sağlayıcılar burada koşturulmaz. Küçük örnekte aralıklar geniştir: 'ayırt edilemez' sonucu eşit demek değildir, kanıt yetmiyor demektir.");
  return lines.join("\n") + "\n";
}
