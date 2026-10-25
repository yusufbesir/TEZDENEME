// Madde 65: çok ufuklu strateji (model yeteneği, D8c-1). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. Çıktı güvenilmez veridir.
import { asItems, asObject, asText, asTextList, renderPrompt } from "./common.ts";
import type { CleanInput, ModelCapability } from "./common.ts";

const SCHEMA = `{"horizons":[{"name":"","objectives":[""],"risks":[""],"dependsOn":[""]}],"consistencyNotes":[""]}`;

export const multiHorizon: ModelCapability = {
  id: "multi-horizon",
  madde: 65,
  ad: "Çok ufuklu strateji",
  aciklama: "Hedefi verilen ufuklara (en çok 4; ör. kısa, orta, uzun) bölerek her ufuk için amaç, risk ve bağımlılık çıkarır; ufuklar arası tutarlılık notları ekler. Yalnız öneridir.",
  fields: [
    { name: "goal", label: "Hedef", kind: "text", required: true, maxLength: 2500 },
    { name: "horizons", label: "Ufuklar", kind: "list", required: true, maxLength: 60, maxItems: 4 },
  ],
  schemaSummary: "horizons[1-4]{name,objectives[],risks[],dependsOn[]}, consistencyNotes[]",
  promptBuilder(input: CleanInput): string {
    return renderPrompt({
      gorev: "Hedefi listelenen ufuklara göre planla. Her ufuk için amaçları, riskleri ve başka hangi ufuk/amaçlara bağlı olduğunu yaz; sonunda ufuklar arası tutarlılık notları ver.",
      schema: SCHEMA,
      input,
      labels: { goal: "Hedef", horizons: "Ufuklar" },
    });
  },
  validateOutput(raw: unknown): Record<string, unknown> {
    const o = asObject(raw, "çıktı");
    return {
      horizons: asItems(o.horizons, "horizons", { min: 1, max: 4 }, (h, w) => ({
        name: asText(h.name, `${w}.name`, 80),
        objectives: asTextList(h.objectives, `${w}.objectives`, { max: 8, itemMax: 300 }),
        risks: asTextList(h.risks, `${w}.risks`, { max: 8, itemMax: 300 }),
        dependsOn: asTextList(h.dependsOn, `${w}.dependsOn`, { max: 8, itemMax: 200 }),
      })),
      consistencyNotes: asTextList(o.consistencyNotes, "consistencyNotes", { max: 8, itemMax: 400 }),
    };
  },
  example: { horizons: [{ name: "kısa", objectives: ["İlk sürüm"], risks: ["Zaman"], dependsOn: [] }], consistencyNotes: ["Kısa ufuk, uzun ufkun temelini atar."] },
};
