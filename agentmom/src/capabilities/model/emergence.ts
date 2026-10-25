// Madde 85: ortaya çıkan davranış (model yeteneği, D8c-1). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. Çıktı güvenilmez veridir.
import { asEnum, asItems, asObject, asText, renderPrompt } from "./common.ts";
import type { CleanInput, ModelCapability } from "./common.ts";

const SCHEMA = `{"behaviors":[{"description":"","trigger":"","likelihood":"low|medium|high","mitigation":""}]}`;
export const LIKELIHOODS = ["low", "medium", "high"] as const;

export const emergence: ModelCapability = {
  id: "emergence",
  madde: 85,
  ad: "Ortaya çıkan davranış",
  aciklama: "Bir sistemin parçalarının etkileşiminden beklenmedik davranışlar çıkabilecek yerleri; tetikleyici, olasılık ve önlemle tahmin eder. Yalnız öneridir.",
  fields: [{ name: "system", label: "Sistem açıklaması", kind: "text", required: true, maxLength: 3500 }],
  schemaSummary: "behaviors[1-8]{description,trigger,likelihood(low|medium|high),mitigation}",
  promptBuilder(input: CleanInput): string {
    return renderPrompt({
      gorev: "Sistem açıklamasındaki parçaların etkileşiminden ortaya çıkabilecek, tek tek parçalarda görünmeyen davranışları tahmin et. Her biri için tetikleyici, olasılık (low, medium, high) ve önlem yaz.",
      schema: SCHEMA,
      input,
      labels: { system: "Sistem açıklaması" },
    });
  },
  validateOutput(raw: unknown): Record<string, unknown> {
    const o = asObject(raw, "çıktı");
    return {
      behaviors: asItems(o.behaviors, "behaviors", { min: 1, max: 8 }, (b, w) => ({
        description: asText(b.description, `${w}.description`, 600),
        trigger: asText(b.trigger, `${w}.trigger`, 400),
        likelihood: asEnum(b.likelihood, `${w}.likelihood`, LIKELIHOODS),
        mitigation: asText(b.mitigation, `${w}.mitigation`, 500),
      })),
    };
  },
  example: { behaviors: [{ description: "Yeniden denemeler yükü katlar.", trigger: "Yavaş yanıt", likelihood: "medium", mitigation: "Üstel geri çekilme" }] },
};
