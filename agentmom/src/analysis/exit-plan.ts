// Sağlayıcı çıkış / değiştirilebilirlik planlayıcı (madde 80, D8b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// SALT OKUNUR ÖNERİ: hiçbir sağlayıcıya geçmez, politika motorunu atlamaz, canlı test yok; yalnız kayıtlı beyan + politika sözleşmesi + güncel durum.
// ÜCRETLİ ROTA ASLA ÖNERİLMEZ: api_paid adaylar "kapalı" etiketiyle ayrı listelenir, puanlanmaz.
//
// Değiştirilebilirlik puanı (0..100, tamsayı) = 100 x kapsama x rotaUyumu x sağlıkÇarpanı
//  - gereken yetenekler: HEDEF sağlayıcının doğrulanmış (1) ya da kısmi (0.5) sunduğu işlemler; ağırlık wt(op).
//  - kapsama = ortalama( min(wc(op), wt(op)) / wt(op) ) tüm gereken işlemler üzerinde; wc = adayın o işlemdeki durum ağırlığı (doğrulanmış 1, kısmi 0.5, diğer 0).
//    Aday hedefin kısmi sunduğu bir işlemi doğrulanmış sunuyorsa fazladan puan almaz (üst sınır 1).
//  - rotaUyumu: aynı rota türü 1.0; abonelik <-> yerel 0.7 (farklı ama ikisi de ücretsiz rota).
//  - sağlıkÇarpanı: son kayıtlı olay başarıysa 1.0; hiç kayıt yoksa 0.9 (bilinmiyor); son olay sağlayıcı hatasıysa 0.7.
// Elenme (puanlanmaz, "excluded"ta nedeniyle listelenir): devre dışı, adaptörü yok ("kullanılamıyor"), sözleşmenin allowedProviders listesinde değil.
import { healthOf, isActive, isFreeRoute, statusOf, statusWeight } from "./snapshot.ts";
import type { Health, ProviderSnapshot } from "./snapshot.ts";

export const HEALTH_FACTOR: Record<Health, number> = { iyi: 1, bilinmiyor: 0.9, kötü: 0.7 };

export interface MissingCapability {
  operation: string;
  targetStatus: string;
  candidateStatus: string | null;
}

export interface ExitCandidate {
  provider: string;
  displayName: string;
  routeKind: string;
  coverage: number | null;
  routeCompat: number;
  health: Health;
  healthFactor: number;
  swapScore: number | null;
  missing: MissingCapability[];
  reasons: string[];
}

export interface ExitPlan {
  target: { id: string; displayName: string; routeKind: string; active: boolean; requiredCapabilities: Array<{ operation: string; status: string }> };
  verdict: "yedek var" | "kısmi yedek" | "yedek yok";
  summary: string;
  candidates: ExitCandidate[];
  closed: ExitCandidate[];
  excluded: ExitCandidate[];
  formula: string;
  note: string;
}

export const EXIT_FORMULA = "puan = 100 x kapsama x rotaUyumu x sağlıkÇarpanı; kapsama = hedefin doğrulanmış/kısmi sunduğu işlemlerin adaytaki durum ağırlığına (doğrulanmış 1, kısmi 0.5) göre ortalaması (üst sınır 1); rotaUyumu aynı tür 1.0, abonelik<->yerel 0.7; sağlıkÇarpanı iyi 1.0 / bilinmiyor 0.9 / kötü 0.7";

function routeCompat(target: string, candidate: string): number {
  return target === candidate ? 1 : 0.7;
}

export function buildExitPlan(providers: ProviderSnapshot[], targetId: string): ExitPlan | null {
  const target = providers.find((p) => p.id === targetId);
  if (!target) return null;
  const required = target.capabilities.map((c) => ({ operation: c.operation, status: c.status, w: statusWeight(c.status) })).filter((c) => c.w > 0);

  const candidates: ExitCandidate[] = [];
  const closed: ExitCandidate[] = [];
  const excluded: ExitCandidate[] = [];
  for (const p of providers) {
    if (p.id === target.id) continue;
    const missing: MissingCapability[] = [];
    let sum = 0;
    for (const r of required) {
      const have = statusOf(p, r.operation);
      const wc = have === null ? 0 : statusWeight(have);
      sum += Math.min(wc, r.w) / r.w;
      if (wc < r.w) missing.push({ operation: r.operation, targetStatus: r.status, candidateStatus: have });
    }
    const coverage = required.length === 0 ? null : Math.round((sum / required.length) * 1000) / 1000;
    const health = healthOf(p);
    const compat = routeCompat(target.routeKind, p.routeKind);
    const base: ExitCandidate = { provider: p.id, displayName: p.displayName, routeKind: p.routeKind, coverage, routeCompat: compat, health, healthFactor: HEALTH_FACTOR[health], swapScore: null, missing, reasons: [] };

    if (p.routeKind === "api_paid") {
      closed.push({ ...base, routeCompat: 0, reasons: ["kapalı: ücretli rota (api_paid) hiçbir koşulda önerilmez; yalnız kullanıcı kararıyla ve ayrı onayla açılabilir"] });
      continue;
    }
    const why: string[] = [];
    if (!isFreeRoute(p.routeKind)) why.push("bilinmeyen rota türü: yalnız yerel ve abonelik rotaları puanlanır");
    if (p.disabled) why.push("kullanıcı tarafından devre dışı bırakılmış");
    if (!p.hasAdapter) why.push("bu derlemede adaptörü yok (kullanılamıyor)");
    if (!p.allowedByPolicy) why.push("sözleşmenin izinli sağlayıcılar listesinde değil");
    if (why.length > 0) {
      excluded.push({ ...base, reasons: why });
      continue;
    }
    if (coverage === null) {
      excluded.push({ ...base, reasons: ["hedef sağlayıcının doğrulanmış ya da kısmi bir yeteneği kayıtlı değil; kapsama hesaplanamaz"] });
      continue;
    }
    const score = Math.round(100 * coverage * compat * HEALTH_FACTOR[health]);
    const reasons = [
      `kapsama %${Math.round(coverage * 100)} (${required.length - missing.length}/${required.length} işlem tam karşılanıyor)`,
      compat === 1 ? `aynı rota türü (${p.routeKind})` : `farklı rota türü (${target.routeKind} -> ${p.routeKind}), uyum 0.7`,
      health === "iyi" ? "son kayıtlı olay başarı" : health === "kötü" ? "son kayıtlı olay sağlayıcı hatası (çarpan 0.7)" : "koşu kaydı yok: sağlık bilinmiyor (çarpan 0.9)",
    ];
    if (missing.length > 0) reasons.push(`eksik kalan: ${missing.map((m) => m.operation).join(", ")}`);
    candidates.push({ ...base, swapScore: score, reasons });
  }
  const byScore = (a: ExitCandidate, b: ExitCandidate): number => (b.swapScore ?? -1) - (a.swapScore ?? -1) || (a.provider < b.provider ? -1 : a.provider > b.provider ? 1 : 0);
  candidates.sort(byScore);
  closed.sort(byScore);
  excluded.sort(byScore);

  const useful = candidates.filter((c) => (c.swapScore ?? 0) > 0);
  const best = useful[0];
  let verdict: ExitPlan["verdict"] = "yedek yok";
  let summary = "Yedek yok: hedef sağlayıcının yerini alabilecek, izinli, kullanılabilir ve ücretsiz rotalı bir aday kayıtlı değil.";
  if (best) {
    const full = best.missing.length === 0;
    verdict = full ? "yedek var" : "kısmi yedek";
    summary = full ? `${best.provider} hedefin tüm kayıtlı yeteneklerini karşılıyor (puan ${best.swapScore}).` : `En iyi aday ${best.provider} (puan ${best.swapScore}); ${best.missing.length} yetenek eksik ya da daha düşük durumda.`;
  }
  return {
    target: {
      id: target.id,
      displayName: target.displayName,
      routeKind: target.routeKind,
      active: isActive(target),
      requiredCapabilities: required.map((r) => ({ operation: r.operation, status: r.status })),
    },
    verdict,
    summary,
    candidates,
    closed,
    excluded,
    formula: EXIT_FORMULA,
    note: "Salt öneri: hiçbir şey değiştirilmez, hiçbir sağlayıcıya geçilmez; geçiş her zaman politika motorundan ve kullanıcıdan geçer. Yetenek durumları kayıtlı beyandır, canlı test değildir.",
  };
}
