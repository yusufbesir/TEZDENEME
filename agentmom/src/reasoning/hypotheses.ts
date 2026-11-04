// Rakip hipotezler laboratuvarı (madde 62). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// SAF HESAPLAMA: durumsuz, kayıt yok, model/ağ/dosya yok. Aynı girdi => aynı çıktı. Yalnızca ÖNERİDİR; karar kullanıcıdadır.
// Yöntem: (1) Bayes ardılı: P(h | e1..en) ∝ P(h) · Π P(ei | h). Kanıtların hipotez verilmişken KOŞULLU BAĞIMSIZ olduğu varsayılır (naif Bayes);
//         bağımlı kanıtlar (aynı olayın iki ölçümü) sonucu aşırı güvenli yapar. Öncül verilmezse eşit öncül (1/n).
//         Hesap log uzayında yapılır (log-toplam-üstel): çok sayıda küçük olabilirlik taşma/sıfırlanma üretmez.
//         (2) ACH uyuşmazlığı: her hipotez için olabilirliği < 0,2 olan kanıt sayısı (Heuer); en az çürütülen hipotez önde.
// Belgeli varsayılan: bir kanıt için bir hipotezin olabilirliği verilmemişse 0,5 (ayırt etmez) alınır ve uyarı yazılır.
// Sıfır olabilirlik = kesin eleme: ardılı 0 olur ve uyarı yazılır (kanıt yanlışsa hipotez haksız elenir).
import { redactString } from "../core/audit/redact.ts";
import { ReasoningError } from "./reasoning.ts";

export const MIN_HYPOTHESES = 2;
export const MAX_HYPOTHESES = 10;
export const MIN_EVIDENCE = 1;
export const MAX_EVIDENCE = 30;
export const MAX_TEXT = 300;
export const MAX_NAME = 100;
export const DEFAULT_LIKELIHOOD = 0.5;
export const INCONSISTENT_BELOW = 0.2;
export const PRIOR_SUM_TOLERANCE = 1e-6;

const ID = /^[A-Za-z0-9_-]{1,30}$/;
const BAD_IDS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

export type HypothesisMode = "bayes" | "ach";

export interface Strength {
  label: "ayırt etmez" | "zayıf" | "orta" | "güçlü" | "kesin";
}

export interface HypothesisPosterior {
  id: string;
  name: string;
  prior: number;
  posterior: number | null;
  eliminated: boolean;
  inconsistent: number;
  rank: number;
}

export interface EvidenceDiagnosticity {
  id: string;
  text: string;
  // En yüksek / en düşük olabilirlik oranı. Alt sıfırsa (ve üst sıfır değilse) ratio null ve ratioInfinite true.
  ratio: number | null;
  ratioInfinite: boolean;
  strength: Strength["label"];
  highestId: string;
  lowestId: string;
  note: string;
}

export interface HypothesisAnalysis {
  mode: HypothesisMode;
  priorUsed: "eşit" | "verilen";
  posteriors: HypothesisPosterior[];
  evidence: EvidenceDiagnosticity[];
  leastRefuted: { id: string; name: string; inconsistent: number; tiedWith: string[] } | null;
  warnings: string[];
  assumptions: string[];
  hypothesisCount: number;
  evidenceCount: number;
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

function textOf(v: unknown, where: string, max: number): string {
  if (typeof v !== "string" || v.trim().length === 0 || v.length > max) fail(`${where}: 1..${max} karakterlik bir metin olmalı`);
  return redactString(v).replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}

function probOf(v: unknown, where: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) fail(`${where}: 0 ile 1 arasında sayı olmalı`);
  return v;
}

function logSumExp(xs: readonly number[]): number {
  let m = -Infinity;
  for (const x of xs) if (x > m) m = x;
  if (m === -Infinity) return -Infinity;
  let s = 0;
  for (const x of xs) s += Math.exp(x - m);
  return m + Math.log(s);
}

function strengthOf(ratio: number | null, infinite: boolean): Strength["label"] {
  if (infinite) return "kesin";
  if (ratio === null || ratio <= 1 + 1e-12) return "ayırt etmez";
  if (ratio < 3) return "zayıf";
  if (ratio < 10) return "orta";
  return "güçlü";
}

export function analyzeHypotheses(input: unknown): HypothesisAnalysis {
  if (!isObj(input)) fail("gövde bir nesne olmalı");
  onlyKeys(input, ["hypotheses", "evidence", "mode"], "gövde");
  const mode: HypothesisMode = input.mode === undefined ? "bayes" : input.mode === "bayes" || input.mode === "ach" ? input.mode : fail("mode 'bayes' ya da 'ach' olmalı");

  if (!Array.isArray(input.hypotheses) || input.hypotheses.length < MIN_HYPOTHESES || input.hypotheses.length > MAX_HYPOTHESES) fail(`hypotheses ${MIN_HYPOTHESES}..${MAX_HYPOTHESES} öğeli bir dizi olmalı`);
  if (!Array.isArray(input.evidence) || input.evidence.length < MIN_EVIDENCE || input.evidence.length > MAX_EVIDENCE) fail(`evidence ${MIN_EVIDENCE}..${MAX_EVIDENCE} öğeli bir dizi olmalı`);

  const hyps: Array<{ id: string; name: string; prior: number | null }> = [];
  const hIds = new Set<string>();
  input.hypotheses.forEach((raw: unknown, i: number) => {
    const where = `hypotheses[${i}]`;
    if (!isObj(raw)) fail(`${where}: nesne olmalı`);
    onlyKeys(raw, ["id", "name", "prior"], where);
    const id = idOf(raw.id, `${where}.id`);
    if (hIds.has(id)) fail(`${where}.id: kimlik tekrarlandı`);
    hIds.add(id);
    const prior = raw.prior === undefined ? null : probOf(raw.prior, `${where}.prior`);
    hyps.push({ id, name: textOf(raw.name, `${where}.name`, MAX_NAME), prior });
  });
  const given = hyps.filter((h) => h.prior !== null).length;
  if (given !== 0 && given !== hyps.length) fail("öncüller ya hiç verilmemeli ya da bütün hipotezler için verilmeli");
  if (given === hyps.length) {
    const sum = hyps.reduce((a, h) => a + (h.prior as number), 0);
    if (Math.abs(sum - 1) > PRIOR_SUM_TOLERANCE) fail("öncüllerin toplamı 1 olmalı");
  }
  const priorUsed: "eşit" | "verilen" = given === 0 ? "eşit" : "verilen";
  const priors = hyps.map((h) => (given === 0 ? 1 / hyps.length : (h.prior as number)));

  const warnings: string[] = [];
  const eIds = new Set<string>();
  const evs: Array<{ id: string; text: string; lik: number[] }> = [];
  input.evidence.forEach((raw: unknown, i: number) => {
    const where = `evidence[${i}]`;
    if (!isObj(raw)) fail(`${where}: nesne olmalı`);
    onlyKeys(raw, ["id", "text", "likelihoods"], where);
    const id = idOf(raw.id, `${where}.id`);
    if (eIds.has(id)) fail(`${where}.id: kimlik tekrarlandı`);
    eIds.add(id);
    const text = textOf(raw.text, `${where}.text`, MAX_TEXT);
    if (!isObj(raw.likelihoods)) fail(`${where}.likelihoods: nesne olmalı`);
    const lk = raw.likelihoods;
    for (const k of Object.keys(lk)) if (!hIds.has(k)) fail(`${where}.likelihoods: bilinmeyen hipotez kimliği`);
    const lik = hyps.map((h) => {
      if (!Object.hasOwn(lk, h.id)) {
        warnings.push(`'${id}' kanıtı için '${h.id}' olabilirliği verilmedi: ${DEFAULT_LIKELIHOOD} (ayırt etmez) varsayıldı.`);
        return DEFAULT_LIKELIHOOD;
      }
      return probOf(lk[h.id], `${where}.likelihoods.${h.id}`);
    });
    evs.push({ id, text, lik });
  });

  // Log ardıl.
  const logPost = hyps.map((_, hi) => {
    let lp = priors[hi] === 0 ? -Infinity : Math.log(priors[hi] as number);
    for (const e of evs) {
      const l = e.lik[hi] as number;
      lp += l === 0 ? -Infinity : Math.log(l);
    }
    return lp;
  });
  const z = logSumExp(logPost);
  const allEliminated = z === -Infinity;
  if (allEliminated) warnings.push("Bütün hipotezler en az bir kanıtla (olabilirlik 0) ya da sıfır öncülle elendi: ardıl olasılık tanımsız. Girdiyi gözden geçirin.");

  const inconsistent = hyps.map((_, hi) => evs.filter((e) => (e.lik[hi] as number) < INCONSISTENT_BELOW).length);
  const eliminated = hyps.map((_, hi) => logPost[hi] === -Infinity);
  hyps.forEach((h, hi) => {
    if (priors[hi] === 0) warnings.push(`'${h.id}' hipotezinin öncülü 0: hiçbir kanıt onu canlandıramaz.`);
    for (const e of evs) if (e.lik[hi] === 0) warnings.push(`'${e.id}' kanıtı '${h.id}' hipotezini KESİN eler (olabilirlik 0). Kanıt yanlış olabilirse bu eleme haksızdır.`);
  });

  const post = hyps.map((_, hi) => (allEliminated ? null : Math.exp((logPost[hi] as number) - z)));
  // Sıralama: bayes => ardıl azalan; ach => uyuşmazlık artan, sonra ardıl azalan. Eşitlikte girdi sırası (kararlı).
  const order = hyps.map((_, i) => i).sort((a, b) => {
    const pa = post[a] ?? 0;
    const pb = post[b] ?? 0;
    if (mode === "ach") return (inconsistent[a] as number) - (inconsistent[b] as number) || pb - pa || a - b;
    return pb - pa || (inconsistent[a] as number) - (inconsistent[b] as number) || a - b;
  });
  const rankOf = new Map<number, number>(order.map((hi, r) => [hi, r + 1]));
  const posteriors: HypothesisPosterior[] = hyps.map((h, hi) => ({ id: h.id, name: h.name, prior: priors[hi] as number, posterior: post[hi] ?? null, eliminated: eliminated[hi] as boolean, inconsistent: inconsistent[hi] as number, rank: rankOf.get(hi) as number }));

  const evidence: EvidenceDiagnosticity[] = evs.map((e) => {
    let hi = 0;
    let lo = 0;
    e.lik.forEach((l, i) => {
      if (l > (e.lik[hi] as number)) hi = i;
      if (l < (e.lik[lo] as number)) lo = i;
    });
    const top = e.lik[hi] as number;
    const bottom = e.lik[lo] as number;
    let ratio: number | null;
    let infinite = false;
    let note: string;
    if (top === 0) {
      ratio = null;
      note = "Bütün olabilirlikler 0: bu kanıt hiçbir hipotezle bağdaşmıyor; kanıtı ya da olabilirlikleri gözden geçirin.";
    } else if (bottom === 0) {
      ratio = null;
      infinite = true;
      note = `'${hyps[lo]?.id}' hipotezini kesin eler.`;
    } else {
      ratio = top / bottom;
      note = ratio <= 1 + 1e-12 ? "Bütün hipotezlere eşit olabilirlik veriyor: ayırt etmez." : `'${hyps[hi]?.id}' en olası, '${hyps[lo]?.id}' en az olası görüyor.`;
    }
    return { id: e.id, text: e.text, ratio, ratioInfinite: infinite, strength: strengthOf(ratio, infinite), highestId: hyps[hi]?.id as string, lowestId: hyps[lo]?.id as string, note };
  });

  // En çok çürütülmeyen: en az uyuşmazlık; eşitlikte en yüksek ardıl; yine eşitse hepsi "tiedWith" ile bildirilir.
  let leastRefuted: HypothesisAnalysis["leastRefuted"] = null;
  if (!allEliminated) {
    const alive = hyps.map((_, i) => i).filter((i) => !eliminated[i]);
    const minInc = Math.min(...alive.map((i) => inconsistent[i] as number));
    const cand = alive.filter((i) => inconsistent[i] === minInc);
    const maxPost = Math.max(...cand.map((i) => post[i] ?? 0));
    const best = cand.filter((i) => Math.abs((post[i] ?? 0) - maxPost) <= 1e-12);
    const first = best[0] as number;
    leastRefuted = { id: hyps[first]?.id as string, name: hyps[first]?.name as string, inconsistent: minInc, tiedWith: best.slice(1).map((i) => hyps[i]?.id as string) };
  }

  return {
    mode,
    priorUsed,
    posteriors,
    evidence,
    leastRefuted,
    warnings,
    assumptions: [
      "Kanıtlar, hipotez verilmişken koşullu bağımsız varsayılır (naif Bayes); bağımlı kanıtlar ardılı olduğundan fazla keskinleştirir.",
      `Verilmeyen olabilirlik ${DEFAULT_LIKELIHOOD} (ayırt etmez) alınır; ACH uyuşmazlığı olabilirliği < ${INCONSISTENT_BELOW} olan kanıtları sayar.`,
      "Hipotez kümesinin kapsayıcı ve birbirini dışlayan olduğu varsayılır (ardıllar toplamı 1).",
      "Sonuç bir ÖNERİDİR; hiçbir şey kaydedilmez ve karar yerine geçmez.",
    ],
    hypothesisCount: hyps.length,
    evidenceCount: evs.length,
  };
}
