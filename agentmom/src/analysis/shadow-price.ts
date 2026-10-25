// Kaynak gölge fiyatı (madde 72, D8b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// SALT OKUNUR, modelsiz, ağsız. Kıtlık göstergesi, PARA BİRİMİ YOK: ücret hesabı bilinçli olarak yapılmaz (costBasis=list; ücret yok), costUsd okunmaz.
// Veri kaynağı = kullanım ucuyla (GET /api/usage) aynı kayıtlar: task_evidence "usage" ve "step:<rol>".usage (yalnız sağlayıcının BİLDİRDİĞİ token), koşu sayısı/süre için
// denetim olayları (uzmanlık haritasındaki gözlemler). Bilinmeyen = null; uydurma yok.
//
// Sağlayıcı başına (pencere: son 7 gün; "son 24 saat" ve "önceki 6 gün" ayrı):
//  - kullanım: çağrı sayısı, bildirilen token toplamı, bilinen süre toplamı.
//  - sınır: hiçbir sağlayıcı doğrulanabilir bir token sınırı bildirmiyor; sınır yalnız `limits` ile verilirse bilinir, yoksa null ("sınır bilinmiyor").
//  - oran = 7 günlük token / sınır (yalnız sınır bilinirse). kıtlık = min(1, oran).
//  - hızlanma = son 24 saat / (önceki 6 günün günlük ortalaması). Token bildirilmişse token, yoksa çağrı sayısı üzerinden. Taban 0 ise null (karşılaştırma tabanı yok).
//  - gölge fiyat endeksi (0..100, birimsiz) = min(100, round(100 x kıtlık x hızlanmaÇarpanı)); hızlanmaÇarpanı = hızlanma bilinmiyorsa 1, aksi halde [0.5, 2] aralığına kırpılmış hızlanma.
//    Sınır bilinmiyorsa endeks null (kıtlık hesaplanamaz).
import type { Db } from "../core/db/db.ts";
import type { Observation } from "./expertise.ts";

export const WINDOW_DAYS = 7;
export const ROW_LIMIT = 20000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface UsageRecord {
  provider: string;
  at: string;
  tokens: number | null;
}

export interface KnownLimit {
  tokens7d: number;
  source: string;
}

export interface ShadowRow {
  provider: string;
  last7d: { calls: number; tokens: number | null; reportedRuns: number; durationMs: number | null };
  last24h: { calls: number; tokens: number | null };
  prior6d: { calls: number; tokens: number | null };
  acceleration: { basis: "token" | "çağrı" | null; value: number | null; note: string };
  limit: KnownLimit | null;
  usageToLimit: number | null;
  scarcity: number | null;
  shadowPriceIndex: number | null;
  level: "rahat" | "orta" | "kıt" | "çok kıt" | null;
  status: string;
}

export interface ShadowReport {
  generatedAt: string;
  windowDays: number;
  costBasis: "list";
  currency: null;
  // Kullanım kayıtları satır sınırına çarptı: en eski kayıtlar sayılmamış olabilir.
  truncated: boolean;
  providers: ShadowRow[];
  formula: string;
  note: string;
}

export const SHADOW_FORMULA = "endeks = min(100, round(100 x kıtlık x hızlanmaÇarpanı)); kıtlık = min(1, 7 günlük token / sınır); hızlanmaÇarpanı = clamp(son24sa / (önceki 6 günün günlük ortalaması), 0.5, 2), bilinmiyorsa 1; sınır bilinmiyorsa endeks yok";

const sum = (xs: Array<number | null>): number | null => (xs.some((x) => x !== null) ? xs.reduce<number>((a, b) => a + (b ?? 0), 0) : null);

export function computeShadowPrices(input: { providers: string[]; usage: UsageRecord[]; calls: Observation[]; now: Date; limits?: Record<string, KnownLimit>; truncated?: boolean }): ShadowReport {
  const nowMs = input.now.getTime();
  const t7 = nowMs - WINDOW_DAYS * DAY_MS;
  const t1 = nowMs - DAY_MS;
  const inWin = (at: string, from: number, to: number): boolean => {
    const t = Date.parse(at);
    return !Number.isNaN(t) && t >= from && t <= to;
  };
  const ids = new Set(input.providers);
  for (const u of input.usage) ids.add(u.provider);
  for (const c of input.calls) ids.add(c.provider);

  const providers: ShadowRow[] = [...ids].sort().map((provider) => {
    const calls = input.calls.filter((c) => c.provider === provider);
    const usage = input.usage.filter((u) => u.provider === provider);
    const c7 = calls.filter((c) => inWin(c.ts, t7, nowMs));
    const c1 = calls.filter((c) => inWin(c.ts, t1, nowMs));
    const cPrior = calls.filter((c) => inWin(c.ts, t7, t1) && !inWin(c.ts, t1, nowMs));
    const u7 = usage.filter((u) => inWin(u.at, t7, nowMs));
    const u1 = usage.filter((u) => inWin(u.at, t1, nowMs));
    const uPrior = usage.filter((u) => inWin(u.at, t7, t1) && !inWin(u.at, t1, nowMs));
    const tokens7 = sum(u7.map((u) => u.tokens));
    const tokens1 = sum(u1.map((u) => u.tokens));
    const tokensPrior = sum(uPrior.map((u) => u.tokens));

    // Hızlanma: token bildirildiyse token, yoksa çağrı sayısı.
    const useTokens = tokens7 !== null && tokens7 > 0;
    const recent = useTokens ? (tokens1 ?? 0) : c1.length;
    const prior = useTokens ? (tokensPrior ?? 0) : cPrior.length;
    let accel: ShadowRow["acceleration"];
    if (!useTokens && c7.length === 0) accel = { basis: null, value: null, note: "son 7 günde kayıt yok" };
    else if (prior === 0) accel = { basis: useTokens ? "token" : "çağrı", value: null, note: recent === 0 ? "son 7 günde kullanım yok" : "karşılaştırma tabanı yok (önceki 6 günde kullanım yok)" };
    else accel = { basis: useTokens ? "token" : "çağrı", value: Math.round((recent / (prior / 6)) * 100) / 100, note: "son 24 saat / önceki 6 günün günlük ortalaması" };

    const limit = input.limits?.[provider] ?? null;
    const ratio = limit && tokens7 !== null && limit.tokens7d > 0 ? Math.round((tokens7 / limit.tokens7d) * 1000) / 1000 : null;
    const scarcity = ratio === null ? null : Math.min(1, ratio);
    const mult = accel.value === null ? 1 : Math.min(2, Math.max(0.5, accel.value));
    const index = scarcity === null ? null : Math.min(100, Math.round(100 * scarcity * mult));
    const level = index === null ? null : index < 25 ? "rahat" : index < 60 ? "orta" : index < 85 ? "kıt" : "çok kıt";
    const durs = c7.map((c) => c.durationMs);
    return {
      provider,
      last7d: { calls: c7.length, tokens: tokens7, reportedRuns: u7.filter((u) => u.tokens !== null).length, durationMs: sum(durs) },
      last24h: { calls: c1.length, tokens: tokens1 },
      prior6d: { calls: cPrior.length, tokens: tokensPrior },
      acceleration: accel,
      limit,
      usageToLimit: ratio,
      scarcity,
      shadowPriceIndex: index,
      level,
      status: limit === null ? "sınır bilinmiyor" : tokens7 === null ? "sınır biliniyor ama son 7 günde bildirilmiş token kullanımı yok" : `sınır bilinen kaynaktan: ${limit.source}`,
    };
  });
  return {
    generatedAt: input.now.toISOString(),
    windowDays: WINDOW_DAYS,
    costBasis: "list",
    currency: null,
    truncated: input.truncated === true,
    providers,
    formula: SHADOW_FORMULA,
    note: "Para birimi yok: ücret hesabı bilinçli olarak yapılmaz (costBasis=list; ücret yok). Hiçbir sağlayıcı doğrulanabilir bir kullanım sınırı bildirmediği için sınır bilinmiyor (null) ve endeks üretilmez; uydurma sınır kullanılmaz. Çağrı ve süre denetim olaylarından (en çok 5000 son satır), token yalnız sağlayıcının bildirdiği kullanım kayıtlarından gelir." + (input.truncated === true ? " UYARI: kullanım kayıtları satır sınırına (20000) çarptı; 7 günlük pencerenin en eski kısmı eksik olabilir, toplamlar alt sınırdır." : ""),
  };
}

function parse(json: unknown): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(String(json));
    return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

// Yalnız SELECT; kullanım ucuyla (src/server/usage.ts) aynı kayıt türleri. Yalnız sağlayıcının bildirdiği (source=reported) token alınır.
export function collectUsageRecords(db: Db, now: Date): { records: UsageRecord[]; truncated: boolean } {
  const since = new Date(now.getTime() - WINDOW_DAYS * DAY_MS).toISOString();
  const all = db
    .prepare("SELECT task_id, attempt_id, kind, data_json, created_at FROM task_evidence WHERE (kind IN ('usage','execution') OR kind LIKE 'step:%') AND created_at >= ? ORDER BY created_at DESC, rowid DESC LIMIT ?")
    .all(since, ROW_LIMIT + 1) as Array<Record<string, unknown>>;
  // Sınıra çarpılırsa EN ESKİ satırlar düşer (en yeni ROW_LIMIT satır tutulur); sonuç truncated ile bildirilir.
  const truncated = all.length > ROW_LIMIT;
  const rows = all.slice(0, ROW_LIMIT).reverse();
  const execProvider = new Map<string, string>();
  for (const r of rows) {
    if (r.kind !== "execution") continue;
    const d = parse(r.data_json);
    if (d && typeof d.provider === "string") execProvider.set(`${String(r.task_id)}|${String(r.attempt_id)}`, d.provider);
  }
  const out: UsageRecord[] = [];
  const tokensOf = (u: unknown): number | null => {
    const o = u !== null && typeof u === "object" ? (u as Record<string, unknown>) : {};
    if (o.source !== "reported") return null;
    const input = isNum(o.inputTokens) ? o.inputTokens : null;
    const output = isNum(o.outputTokens) ? o.outputTokens : null;
    return input === null && output === null ? null : (input ?? 0) + (output ?? 0);
  };
  for (const r of rows) {
    const d = parse(r.data_json);
    if (!d) continue;
    const at = String(r.created_at);
    if (r.kind === "usage") {
      const p = execProvider.get(`${String(r.task_id)}|${String(r.attempt_id)}`);
      if (p) out.push({ provider: p, at, tokens: tokensOf(d) });
    } else if (typeof r.kind === "string" && r.kind.startsWith("step:") && typeof d.provider === "string") {
      out.push({ provider: d.provider, at, tokens: tokensOf(d.usage) });
    }
  }
  return { records: out, truncated };
}
