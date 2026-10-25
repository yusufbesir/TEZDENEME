// Model yeteneği kayıt defteri (D8c-1): dokuz yapılandırılmış-çıktılı yetenek (6 çevrimdışı + 3 internetli: 37, 38, 40). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
import type { ModelCapability } from "./common.ts";
import { competitorResearch } from "./competitor-research.ts";
import { emergence } from "./emergence.ts";
import { featureDiscovery } from "./feature-discovery.ts";
import { ideaTransfer } from "./idea-transfer.ts";
import { intent } from "./intent.ts";
import { inversion } from "./inversion.ts";
import { multiHorizon } from "./multi-horizon.ts";
import { negotiation } from "./negotiation.ts";
import { researchCenter } from "./research-center.ts";
import { solutionSpace } from "./solution-space.ts";

export const MODEL_CAPABILITIES: readonly ModelCapability[] = Object.freeze([solutionSpace, ideaTransfer, inversion, emergence, multiHorizon, intent, researchCenter, featureDiscovery, competitorResearch, negotiation]);

export const MODEL_CAPABILITY_ID = /^[a-z][a-z-]{1,30}$/;

export function findModelCapability(id: string): ModelCapability | undefined {
  return MODEL_CAPABILITIES.find((c) => c.id === id);
}
