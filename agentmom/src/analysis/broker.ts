// İç yetenek aracısı (madde 99, D8b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// SALT ÖNERİ: talep (işlem + isteğe bağlı rol) -> uygun sağlayıcıların SIRALI listesi. Hiçbir görev başlatmaz, politika motorunu atlamaz (politika ayrıca değerlendirilir).
// Eleme (aday listesine girmez, "eliminated"ta nedeniyle yazılır): işlemi sunmuyor ya da yalnız 'doğrulanmamış', sözleşmenin allowedProviders listesinde değil,
// devre dışı, adaptörü yok, ücretli rota (api_paid: DAİMA elenir).
// Sıralama (sırayla, deterministik): 1) yetenek durumu doğrulanmış > kısmi, 2) rota tercihi yerel > abonelik, 3) son kayıt: iyi > bilinmiyor > kötü,
// 4) rol verildiyse o rolde gözlenen başarı oranı (örnek >= MIN_SAMPLE ise; yoksa karşılaştırmaya girmez), 5) sağlayıcı adı.
// KOTA (en üst anahtar, yalnız SIRALAMA): sağlayıcının KENDİ bildirdiği kalan kota %15'in altındaysa aday listede diğerlerinin ALTINA düşer ve gerekçede yazılır;
// kota bilinmiyorsa (bildirmedi/bayat) sıralama DEĞİŞMEZ ve gerekçeye "kota bilinmiyor" yazılır. Kota hiçbir sağlayıcıyı ELEMEZ ve hiçbir eleme kuralını gevşetmez/sıkılaştırmaz
// (ücretli rota yine DAİMA elenir); hiçbir koşu yönlendirilmez/başlatılmaz: yalnız öneri.
import { OPERATIONS } from "../providers/contract.ts";
import { LOW_REMAINING_PCT, isLowRemaining } from "./quota.ts";
import { healthOf, isFreeRoute, statusOf, statusWeight } from "./snapshot.ts";
import type { Health, ProviderSnapshot } from "./snapshot.ts";

export const BROKER_ROLES = ["plan", "implement", "review", "verify"] as const;
export type BrokerRole = (typeof BROKER_ROLES)[number];
export const MIN_ROLE_SAMPLE = 5;

const HEALTH_ORDER: Record<Health, number> = { iyi: 0, bilinmiyor: 1, kötü: 2 };
const ROUTE_ORDER: Record<string, number> = { local: 0, subscription: 1 };

export interface RoleObservation {
  attempts: number;
  successRate: number | null;
}

export interface CandidateQuota {
  // Sağlayıcının bildirdiği kalan kota yüzdesi; bildirmediyse null.
  remainingPct: number | null;
  reported: boolean;
  low: boolean;
}

export interface BrokerCandidate {
  rank: number;
  provider: string;
  displayName: string;
  routeKind: string;
  capabilityStatus: string;
  health: Health;
  roleObservation: RoleObservation | null;
  quota: CandidateQuota;
  reasons: string[];
}

export interface BrokerElimination {
  provider: string;
  reasons: string[];
}

export interface BrokerResult {
  capability: string;
  role: BrokerRole | null;
  candidates: BrokerCandidate[];
  eliminated: BrokerElimination[];
  summary: string;
  ordering: string;
  // Kota durumu özeti (az kalan / bilinmeyen sağlayıcı sayısı); arayüzde görünür.
  quotaNote: string;
  note: string;
}

export const BROKER_ORDERING = "kalan kota (sağlayıcının bildirdiği kalan kota < %15 olanlar en alta; bilinmiyorsa değişmez) > durum (doğrulanmış > kısmi) > rota (yerel > abonelik) > son kayıt (iyi > bilinmiyor > kötü) > rolde gözlenen başarı oranı (örnek >= 5) > ad; ücretli rota daima elenir";

// Tam sayıysa ondalıksız, değilse tek ondalık (virgülle): 14.9 -> "14,9", 12 -> "12".
// 'Az' ise aşağı yuvarlanır (14,96 -> 14,9) ki gösterim '%15' görünüp 'az' notuyla çelişmesin; karşılaştırma ham değerle yapılır.
function fmtPct(n: number, low = false): string {
  const r = low ? Math.floor(n * 10 + 1e-9) / 10 : Math.round(n * 10) / 10;
  return String(r).replace(".", ",");
}

export function isBrokerCapability(v: string): boolean {
  return (OPERATIONS as readonly string[]).includes(v);
}

export function isBrokerRole(v: string): v is BrokerRole {
  return (BROKER_ROLES as readonly string[]).includes(v);
}

// roleStats: sağlayıcı -> o roldaki gözlem (uzmanlık haritasından); verilmezse rol yalnız bilgi olarak yanıtta görünür.
export function brokerRequest(providers: ProviderSnapshot[], capability: string, role: BrokerRole | null, roleStats: ReadonlyMap<string, RoleObservation> = new Map()): BrokerResult {
  const eliminated: BrokerElimination[] = [];
  const ok: Array<{ p: ProviderSnapshot; status: string; health: Health; obs: RoleObservation | null; remaining: number | null; low: boolean }> = [];
  for (const p of providers) {
    const why: string[] = [];
    const status = statusOf(p, capability);
    if (p.routeKind === "api_paid") why.push("ücretli rota (api_paid) daima elenir; bu araç ücretli yol önermez");
    else if (!isFreeRoute(p.routeKind)) why.push("bilinmeyen rota türü elenir (yalnız yerel ve abonelik rotaları önerilir)");
    if (status === null) why.push(`${capability} yeteneği kayıtlı değil`);
    else if (statusWeight(status) === 0) why.push(`${capability} durumu '${status}': yalnız doğrulanmış ya da kısmi yetenek önerilir`);
    if (p.disabled) why.push("kullanıcı tarafından devre dışı bırakılmış");
    if (!p.hasAdapter) why.push("bu derlemede adaptörü yok (kullanılamıyor)");
    if (!p.allowedByPolicy) why.push("sözleşmenin izinli sağlayıcılar listesinde değil (allowedProviders)");
    if (why.length > 0 || status === null) {
      eliminated.push({ provider: p.id, reasons: why });
      continue;
    }
    const remaining = typeof p.quotaRemainingPct === "number" && Number.isFinite(p.quotaRemainingPct) ? p.quotaRemainingPct : null;
    ok.push({ p, status, health: healthOf(p), obs: role ? (roleStats.get(p.id) ?? null) : null, remaining, low: isLowRemaining(remaining) });
  }
  const rate = (o: RoleObservation | null): number | null => (o && o.attempts >= MIN_ROLE_SAMPLE && o.successRate !== null ? o.successRate : null);
  ok.sort((a, b) => {
    if (a.low !== b.low) return a.low ? 1 : -1;
    const sa = statusWeight(b.status) - statusWeight(a.status);
    if (sa !== 0) return sa;
    const ra = (ROUTE_ORDER[a.p.routeKind] ?? 9) - (ROUTE_ORDER[b.p.routeKind] ?? 9);
    if (ra !== 0) return ra;
    const ha = HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health];
    if (ha !== 0) return ha;
    const xa = rate(a.obs);
    const xb = rate(b.obs);
    if (xa !== null && xb !== null && xa !== xb) return xb - xa;
    return a.p.id < b.p.id ? -1 : a.p.id > b.p.id ? 1 : 0;
  });
  eliminated.sort((a, b) => (a.provider < b.provider ? -1 : a.provider > b.provider ? 1 : 0));
  const candidates: BrokerCandidate[] = ok.map((c, i) => {
    const reasons = [
      c.status === "verified" ? `${capability} doğrulanmış` : `${capability} kısmi (kanıt sınırlı)`,
      c.p.routeKind === "local" ? "yerel rota (tercih edilir)" : "abonelik rotası",
      c.health === "iyi" ? "son kayıtlı olay başarı" : c.health === "kötü" ? "son kayıtlı olay sağlayıcı hatası" : "koşu kaydı yok (sağlık bilinmiyor)",
    ];
    if (role) {
      const r = rate(c.obs);
      reasons.push(r !== null && c.obs ? `${role} rolünde gözlenen başarı %${Math.round(r * 100)} (${c.obs.attempts} deneme)` : `${role} rolünde yeterli gözlem yok (en az ${MIN_ROLE_SAMPLE} deneme gerekir)`);
    }
    if (c.low && c.remaining !== null) reasons.push(`kalan kota az (%${fmtPct(c.remaining, true)}): yedek sağlayıcı/alt model önerilir`);
    else if (c.remaining !== null) reasons.push(`kalan kota %${fmtPct(c.remaining)} (sağlayıcı bildirdi)`);
    else reasons.push("kota bilinmiyor (sağlayıcı bildirmedi)");
    return { rank: i + 1, provider: c.p.id, displayName: c.p.displayName, routeKind: c.p.routeKind, capabilityStatus: c.status, health: c.health, roleObservation: c.obs, quota: { remainingPct: c.remaining, reported: c.remaining !== null, low: c.low }, reasons };
  });
  const lowN = candidates.filter((c) => c.quota.low).length;
  const unknownN = candidates.filter((c) => !c.quota.reported).length;
  const quotaNote =
    candidates.length === 0
      ? "Kota: değerlendirilecek aday yok."
      : `Kota: ${lowN} adayda bildirilmiş kalan kota %${LOW_REMAINING_PCT} altında (listede alta düşer; yedek sağlayıcı/alt model önerilir); ${unknownN} adayda kota bilinmiyor (sıralama değişmedi). Kota hiçbir sağlayıcıyı elemez; hiçbir koşu yönlendirilmez.`;
  return {
    capability,
    role,
    candidates,
    eliminated,
    summary: candidates.length === 0 ? "uygun sağlayıcı yok" : `${candidates.length} uygun sağlayıcı; ilk sıra: ${(candidates[0] as BrokerCandidate).provider}`,
    ordering: BROKER_ORDERING,
    quotaNote,
    note: "Salt öneri: hiçbir görev başlatılmaz; seçilen sağlayıcı için politika motoru, onaylar ve sandbox kuralları ayrıca uygulanır. Yetenek durumları kayıtlı beyandır.",
  };
}
