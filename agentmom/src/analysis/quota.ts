// Sağlayıcı kotası ve gösterge seviyeleri (Faz 11 durum göstergeleri + kota farkında öneri). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// İLKE: sağlayıcının BİLDİRMEDİĞİ değer asla uydurulmaz. Kota yalnız sağlayıcı olayının (provider.event:usage) kendi "data.limits" alanından, doğrulanarak okunur;
// bugünkü hiçbir adaptör bu alanı üretmez (claude-code rate_limit_event'i bilerek yok sayar), bu yüzden bugün sonuç "bilinmiyor"dur. Tahmin, varsayılan limit, ücret yok.
// Bayat bildirim (6 saatten eski), gelecekteki damga, sıfırlanma zamanı geçmiş bildirim ve kendi içinde tutarsız bildirim "bilinmiyor" sayılır.
// Salt okunur: tek SELECT; hiçbir şey yazılmaz; model ve ağ yok.
import type { Db } from "../core/db/db.ts";

export const WARN_PCT = 75;
export const CRITICAL_PCT = 90;
// Bildirilmiş KALAN kota bunun ALTINDAYSA (kesin küçük) "az" sayılır.
export const LOW_REMAINING_PCT = 15;
export const QUOTA_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const FUTURE_SKEW_MS = 5 * 60 * 1000;
const INCONSISTENT_TOLERANCE_PCT = 1;

export type IndicatorLevel = "ok" | "warn" | "critical" | "unknown";

// <%75 ok, >=%75 warn, >=%90 critical; sayı yoksa unknown.
export function levelOf(percent: number | null): IndicatorLevel {
  if (percent === null || typeof percent !== "number" || !Number.isFinite(percent) || percent < 0) return "unknown";
  return percent >= CRITICAL_PCT ? "critical" : percent >= WARN_PCT ? "warn" : "ok";
}

export interface ProviderLimits {
  source: "provider";
  usedPct: number | null;
  remainingPct: number | null;
  resetsAt: string | null;
  at: string;
}

const pct = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null);
// Türetilen karşı değer yalnız kayan nokta gürültüsünden arındırılır (6 ondalık); 1 ondalığa YUVARLANMAZ ki '< %15' karşılaştırması bozulmasın (yuvarlama yalnız gösterimde)
const clean6 = (n: number): number => Math.round(n * 1e6) / 1e6;

// SAF doğrulama: ham "limits" nesnesi + olayın zaman damgası -> güvenilir ProviderLimits ya da null (bilinmiyor).
export function parseLimits(raw: unknown, at: string, now: Date): ProviderLimits | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const atMs = Date.parse(at);
  if (!Number.isFinite(atMs)) return null;
  if (now.getTime() - atMs > QUOTA_MAX_AGE_MS || atMs - now.getTime() > FUTURE_SKEW_MS) return null;
  let used = pct(r.usedPct);
  let remaining = pct(r.remainingPct);
  if (used === null && remaining === null) return null;
  if (used !== null && remaining !== null && Math.abs(used + remaining - 100) > INCONSISTENT_TOLERANCE_PCT) return null;
  if (used === null && remaining !== null) used = clean6(100 - remaining);
  if (remaining === null && used !== null) remaining = clean6(100 - used);
  let resetsAt: string | null = null;
  if (typeof r.resetsAt === "string") {
    const t = Date.parse(r.resetsAt);
    if (!Number.isFinite(t)) return null;
    if (t <= now.getTime()) return null;
    resetsAt = new Date(t).toISOString();
  }
  return { source: "provider", usedPct: used, remainingPct: remaining, resetsAt, at: new Date(atMs).toISOString() };
}

// En yeni provider.event:usage kaydındaki limits alanı. Yoksa/geçersizse null = bilinmiyor.
// ts >= ? aralığı idx_audit_ts dizinini kullanır (tüm denetim geçmişi taranmaz); bayat bildirim zaten bilinmiyor sayıldığı için sonuç değişmez.
export const LIMITS_SQL = `SELECT ts, details_json FROM audit_events
       WHERE ts >= ? AND action = 'provider.event:usage' AND initiator_kind = 'agent' AND initiator_id = ? AND json_valid(details_json) AND json_extract(details_json, '$.data.limits') IS NOT NULL
       ORDER BY ts DESC, rowid DESC LIMIT 1`;

export function readProviderLimits(db: Db, providerId: string, now: Date = new Date()): ProviderLimits | null {
  const since = new Date(now.getTime() - QUOTA_MAX_AGE_MS).toISOString();
  const row = db.prepare(LIMITS_SQL).get(since, providerId) as { ts?: unknown; details_json?: unknown } | undefined;
  if (!row || typeof row.ts !== "string" || typeof row.details_json !== "string") return null;
  try {
    const d: unknown = JSON.parse(row.details_json);
    const data = d !== null && typeof d === "object" ? (d as Record<string, unknown>).data : null;
    const limits = data !== null && typeof data === "object" ? (data as Record<string, unknown>).limits : null;
    return parseLimits(limits, row.ts, now);
  } catch {
    return null;
  }
}

// Bildirilmiş kalan kota "az" mı? Bilinmiyorsa false (sıralama değişmez).
export const isLowRemaining = (remainingPct: number | null | undefined): boolean => typeof remainingPct === "number" && Number.isFinite(remainingPct) && remainingPct < LOW_REMAINING_PCT;
