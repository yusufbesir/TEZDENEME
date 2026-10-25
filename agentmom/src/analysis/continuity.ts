// Yetenek süreklilik grafiği (madde 73, D8b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// SALT OKUNUR, modelsiz, ağsız, canlı test YOK: yalnız sağlayıcı kayıt defterindeki BEYAN (yetenek durumu), devre dışı durumu ve son başarı/hata kaydı.
// Çizge: düğümler = sağlayıcılar ve yetenekler (işlemler); kenar = "sağlayıcı X yetenek Y'yi doğrulanmış/kısmi/doğrulanmamış sunar".
// 'desteklenmiyor' ve 'kullanılamıyor' durumları kenar OLUŞTURMAZ (sunmuyor). Tek hata noktası = yeteneği beyan eden sağlayıcı sayısı tam 1.
// Etkin (adaptörü olan, kapatılmamış) sağlayıcılara göre ayrıca "fiilen tek nokta" ve "bir sağlayıcı kapanırsa" özeti hesaplanır.
import { OPERATIONS } from "../providers/contract.ts";
import { OFFERED_STATUSES, healthOf, isActive } from "./snapshot.ts";
import type { Health, ProviderSnapshot } from "./snapshot.ts";

// Görevin çalışması için asıl önem taşıyan yetenekler (kod içinde belgeli sabit): çalıştırma, olay akışı, kanıt toplama, kullanım, bağlantı testi.
export const ESSENTIAL_OPERATIONS: readonly string[] = ["execute", "streamEvents", "collectEvidence", "getUsage", "testConnection"];

export interface ContinuityEdge {
  provider: string;
  capability: string;
  status: string;
}

export interface CapabilityRow {
  operation: string;
  essential: boolean;
  offeredBy: string[];
  verifiedBy: string[];
  partialBy: string[];
  unverifiedBy: string[];
  activeOfferers: string[];
  // Beyan eden sağlayıcı sayısı tam 1.
  singlePointOfFailure: boolean;
  // Etkin sağlayıcılar arasında beyan eden tam 1 (ya da 0).
  effectiveSinglePoint: boolean;
  nobody: boolean;
}

export interface LossRow {
  provider: string;
  // Bu sağlayıcı kapanırsa etkin sağlayıcılar arasında artık sunulmayan yetenekler.
  lost: string[];
  // Yine de en az bir (başka) etkin sağlayıcıdan sunulan yetenekler.
  retained: string[];
  // Kapanırsa hiçbir sağlayıcı kalmıyor mu.
  noProviderLeft: boolean;
}

export interface ContinuityReport {
  providers: Array<{ id: string; displayName: string; routeKind: string; hasAdapter: boolean; disabled: boolean; allowedByPolicy: boolean; active: boolean; health: Health; lastSuccessAt: string | null; lastFailureAt: string | null }>;
  capabilities: CapabilityRow[];
  edges: ContinuityEdge[];
  singlePoints: Array<{ capability: string; provider: string; status: string; essential: boolean; active: boolean }>;
  ifProviderLost: LossRow[];
  summary: { providers: number; activeProviders: number; capabilities: number; edges: number; singlePoints: number; essentialSinglePoints: number; offeredByNobody: number };
  note: string;
}

export function buildContinuity(providers: ProviderSnapshot[]): ContinuityReport {
  const edges: ContinuityEdge[] = [];
  for (const p of providers) {
    for (const c of p.capabilities) if (OFFERED_STATUSES.includes(c.status)) edges.push({ provider: p.id, capability: c.operation, status: c.status });
  }
  edges.sort((a, b) => (a.capability < b.capability ? -1 : a.capability > b.capability ? 1 : a.provider < b.provider ? -1 : a.provider > b.provider ? 1 : 0));
  const activeIds = new Set(providers.filter(isActive).map((p) => p.id));

  const capabilities: CapabilityRow[] = OPERATIONS.map((operation) => {
    const mine = edges.filter((e) => e.capability === operation);
    const offeredBy = mine.map((e) => e.provider);
    const activeOfferers = offeredBy.filter((id) => activeIds.has(id));
    return {
      operation,
      essential: ESSENTIAL_OPERATIONS.includes(operation),
      offeredBy,
      verifiedBy: mine.filter((e) => e.status === "verified").map((e) => e.provider),
      partialBy: mine.filter((e) => e.status === "partial").map((e) => e.provider),
      unverifiedBy: mine.filter((e) => e.status === "unverified").map((e) => e.provider),
      activeOfferers,
      singlePointOfFailure: offeredBy.length === 1,
      effectiveSinglePoint: activeOfferers.length === 1,
      nobody: offeredBy.length === 0,
    };
  });

  const singlePoints = capabilities
    .filter((c) => c.singlePointOfFailure)
    .map((c) => {
      const e = edges.find((x) => x.capability === c.operation) as ContinuityEdge;
      return { capability: c.operation, provider: e.provider, status: e.status, essential: c.essential, active: activeIds.has(e.provider) };
    });

  const ifProviderLost: LossRow[] = providers.map((p) => {
    const lost: string[] = [];
    const retained: string[] = [];
    for (const c of capabilities) {
      const others = c.activeOfferers.filter((id) => id !== p.id);
      if (others.length > 0) retained.push(c.operation);
      else if (c.activeOfferers.includes(p.id)) lost.push(c.operation);
    }
    const left = providers.filter((q) => q.id !== p.id && isActive(q)).length;
    return { provider: p.id, lost, retained, noProviderLeft: left === 0 };
  });

  return {
    providers: providers.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      routeKind: p.routeKind,
      hasAdapter: p.hasAdapter,
      disabled: p.disabled,
      allowedByPolicy: p.allowedByPolicy,
      active: isActive(p),
      health: healthOf(p),
      lastSuccessAt: p.lastSuccessAt,
      lastFailureAt: p.lastFailureAt,
    })),
    capabilities,
    edges,
    singlePoints,
    ifProviderLost,
    summary: {
      providers: providers.length,
      activeProviders: activeIds.size,
      capabilities: capabilities.length,
      edges: edges.length,
      singlePoints: singlePoints.length,
      essentialSinglePoints: singlePoints.filter((s) => s.essential).length,
      offeredByNobody: capabilities.filter((c) => c.nobody).length,
    },
    note: "Yalnız kayıtlı beyan: canlı test yapılmaz, hiçbir yetenek bu çağrıyla doğrulanmaz. 'Sunar' = durum doğrulanmış, kısmi ya da doğrulanmamış; 'desteklenmiyor' ve 'kullanılamıyor' sunmak sayılmaz. 'Kaybolur/kalır' etkin (adaptörü olan, kapatılmamış) sağlayıcılara göre hesaplanır.",
  };
}
