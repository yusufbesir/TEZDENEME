// İsteğe bağlı TestSprite sağlayıcısı (madde 54). Sahip: Claude [İP:AgentMom devam].
// Bu dosya YALNIZ bildirim ve hazırlık denetimidir: TestSprite'a bağlanan hiçbir kod yoktur (ağ yok, anahtar okunmaz, süreç başlatılmaz).
// Sağlayıcı isteğe bağlıdır ve KAPALI başlar; etkinleşmesi için yüksek risk onayı (insan) ve yapılandırılmış anahtar gerekir.
// Gerçek bağlantı (adaptör) ayrı bir iştir: ağ ve anahtar kullanır, bu yüzden ayrıca kullanıcı onayı ister.
import type { CapabilityDeclaration } from "./contract.ts";
import { IntegrationCenter, IntegrationError } from "./integration-center.ts";
import type { IntegrationActor, IntegrationView } from "./integration-center.ts";

export const TESTSPRITE_ID = "testsprite";
export const TESTSPRITE_NEEDS = ["network", "api_key"] as const;

// Dürüst yetenek bildirimi: hiçbiri doğrulanmadı; yürütme yok.
export function testspriteCapabilities(checkedAt: string): CapabilityDeclaration[] {
  return [
    { operation: "describeCapabilities", status: "unverified", evidenceSource: "declaration-only", checkedAt },
    { operation: "validateConfiguration", status: "unsupported", evidenceSource: "no adapter", checkedAt },
    { operation: "testConnection", status: "unsupported", evidenceSource: "no adapter", checkedAt },
    { operation: "execute", status: "unsupported", evidenceSource: "no adapter", checkedAt },
  ];
}

// Merkeze yüksek riskli, isteğe bağlı bir sağlayıcı olarak kaydeder (zaten kayıtlıysa değiştirmez).
export function declareTestSprite(center: IntegrationCenter, actor: IntegrationActor): IntegrationView {
  const existing = center.get("provider", TESTSPRITE_ID);
  if (existing) {
    if (existing.risk !== "high" || !existing.optional) throw new IntegrationError("wrong_registration", "testsprite is registered with a lower risk or as non-optional; remove that record and declare it again");
    return existing;
  }
  return center.record({ kind: "provider", id: TESTSPRITE_ID, action: "discover", actor, risk: "high", optional: true, title: "TestSprite (isteğe bağlı)", note: "ağ ve anahtar ister; kapalı başlar" });
}

export interface Readiness {
  ready: boolean;
  blockers: string[];
}
// Kullanıma hazır mı? keyConfigured değerini çağıran söyler (anahtarın kendisi buraya gelmez, okunmaz).
export function testspriteReadiness(center: IntegrationCenter, keyConfigured: boolean): Readiness {
  const blockers: string[] = [];
  let v: IntegrationView | undefined;
  try {
    v = center.get("provider", TESTSPRITE_ID);
  } catch {
    blockers.push("the integration log cannot be read");
  }
  if (!v && blockers.length === 0) blockers.push("not registered (declareTestSprite)");
  else {
    if (v.risk !== "high" || !v.optional) blockers.push("registered with a lower risk or as non-optional");
    if (v.state !== "enabled") blockers.push(`state is ${v.state}, not enabled`);
    if (!v.approved) blockers.push("no person's approval on record");
    if (!v.effective && v.state === "enabled") blockers.push("the integration log has problems, so nothing is treated as enabled");
  }
  if (!keyConfigured) blockers.push("no API key configured");
  blockers.push("no adapter exists yet: connecting to TestSprite is not implemented");
  return { ready: false, blockers };
}
