// Sağlayıcı anlık görüntüsü (D8b ortak girdi). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Sağlayıcı kayıt defterinden ve denetim/yetenek kayıtlarından SALT OKUNUR bir düz veri çıkarır; süreklilik, çıkış planı ve aracı modülleri bu düz veri üzerinde çalışır
// (bu yüzden küçük sahte sağlayıcılarla test edilir). Canlı bağlantı testi, model çağrısı ve ağ YOK: yalnız kayıtlı beyan ve geçmiş gözlem.
import type { Db } from "../core/db/db.ts";
import type { AutonomyContract } from "../core/policy/types.ts";
import type { ProviderRegistry } from "../providers/registry.ts";
import { providerDetail } from "../server/providers-api.ts";

// providerDetail son koşu satırı okuması bu sınırla kısıtlanır (her istekte tüm geçmiş okunmaz).
export const FINISHED_ROW_LIMIT = 2000;

export const OFFERED_STATUSES: readonly string[] = ["verified", "partial", "unverified"];

export interface ProviderSnapshot {
  id: string;
  displayName: string;
  routeKind: string;
  // Bu derlemede adaptörü var mı (yoksa kayıt satırı eski bir kalıntıdır).
  hasAdapter: boolean;
  // Kullanıcı kapattı mı (provider_state).
  disabled: boolean;
  // Sözleşmenin allowedProviders listesinde mi.
  allowedByPolicy: boolean;
  capabilities: Array<{ operation: string; status: string }>;
  // Son başarılı koşu ve son sağlayıcı hatası (varsa); yoksa null (bilinmiyor).
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  // Sağlayıcının KENDİ bildirdiği kalan kota yüzdesi (0..100, taze ve doğrulanmış); yok/bilinmiyor = null ya da alan hiç yok (varsayım yapılmaz).
  quotaRemainingPct?: number | null;
}

// Yetenek durumunun ağırlığı: doğrulanmış 1, kısmi 0.5, diğerleri (doğrulanmamış / desteklenmiyor / kullanılamıyor) 0.
export function statusWeight(status: string): number {
  return status === "verified" ? 1 : status === "partial" ? 0.5 : 0;
}

export function statusOf(p: ProviderSnapshot, operation: string): string | null {
  return p.capabilities.find((c) => c.operation === operation)?.status ?? null;
}

// "Etkin": adaptörü var ve kullanıcı kapatmamış. "Kullanılabilir": etkin ve sözleşme izin veriyor.
export const isActive = (p: ProviderSnapshot): boolean => p.hasAdapter && !p.disabled;
// Rota izin listesi (kara liste değil): yalnız yerel ve abonelik rotaları önerilir/kullanılabilir sayılır; api_paid ve bilinmeyen her tür hariç.
export const FREE_ROUTES: readonly string[] = ["local", "subscription"];
export const isFreeRoute = (kind: string): boolean => FREE_ROUTES.includes(kind);
export const isUsable = (p: ProviderSnapshot): boolean => isActive(p) && p.allowedByPolicy && isFreeRoute(p.routeKind);

export type Health = "iyi" | "kötü" | "bilinmiyor";

// En yeni olay başarıysa iyi, en yeni olay hataysa kötü; hiç veri yoksa bilinmiyor (uydurma yok).
export function healthOf(p: Pick<ProviderSnapshot, "lastSuccessAt" | "lastFailureAt">): Health {
  if (p.lastSuccessAt === null && p.lastFailureAt === null) return "bilinmiyor";
  if (p.lastFailureAt !== null && (p.lastSuccessAt === null || p.lastFailureAt > p.lastSuccessAt)) return "kötü";
  return "iyi";
}

export function providerSnapshots(db: Db, registry: ProviderRegistry, contract: AutonomyContract, now: Date = new Date()): ProviderSnapshot[] {
  const out: ProviderSnapshot[] = [];
  for (const stored of registry.list()) {
    const detail = providerDetail(db, registry, contract, stored.id, FINISHED_ROW_LIMIT, now);
    // Hata sayılan olaylar: sağlayıcının kendi hata olayı ve başarısız biten koşu. Politika/sanal alan reddi ("run.refused") sağlayıcı sağlığı değildir.
    const failure = (detail?.lastErrors ?? []).find((e) => !e.kind.startsWith("run.refused"));
    out.push({
      id: stored.id,
      displayName: stored.displayName,
      routeKind: stored.routeKind,
      hasAdapter: registry.registeredAdapter(stored.id) !== undefined,
      disabled: stored.disabled,
      allowedByPolicy: contract.allowedProviders.includes(stored.id),
      capabilities: stored.capabilities.map((c) => ({ operation: c.operation, status: c.status })),
      lastSuccessAt: detail?.lastSuccess?.at ?? null,
      lastFailureAt: failure?.at ?? null,
      quotaRemainingPct: detail?.limits?.remainingPct ?? null,
    });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
