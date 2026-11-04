// Madde 81: çözüm uzayı gezgini (model yeteneği, D8c-1). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. Çıktı güvenilmez veridir.
import { asItems, asObject, asText, asTextList, renderPrompt } from "./common.ts";
import type { CleanInput, ModelCapability } from "./common.ts";

const SCHEMA = `{"families":[{"name":"","idea":"","pros":[""],"cons":[""],"assumptions":[""]}],"tradeoffs":[""],"recommendedNext":""}`;

export const solutionSpace: ModelCapability = {
  id: "solution-space",
  madde: 81,
  ad: "Çözüm uzayı gezgini",
  aciklama: "Bir problem için birbirinden farklı çözüm ailelerini; artı/eksi, varsayım ve ödünleşimleriyle çıkarır. Yalnız öneridir.",
  fields: [
    { name: "problem", label: "Problem", kind: "text", required: true, maxLength: 2500 },
    { name: "constraints", label: "Kısıtlar", kind: "list", required: false, maxLength: 300, maxItems: 8 },
  ],
  schemaSummary: "families[1-6]{name,idea,pros[],cons[],assumptions[]}, tradeoffs[], recommendedNext",
  promptBuilder(input: CleanInput): string {
    return renderPrompt({
      gorev: "Verilen problem için birbirinden gerçekten farklı 3-5 çözüm ailesi çıkar; her biri için fikir, artılar, eksiler ve varsayımlar ver. Aileler arası ödünleşimleri ve önerdiğin ilk adımı yaz.",
      schema: SCHEMA,
      input,
      labels: { problem: "Problem", constraints: "Kısıtlar" },
    });
  },
  validateOutput(raw: unknown): Record<string, unknown> {
    const o = asObject(raw, "çıktı");
    return {
      families: asItems(o.families, "families", { min: 1, max: 6 }, (f, w) => ({
        name: asText(f.name, `${w}.name`, 120),
        idea: asText(f.idea, `${w}.idea`, 800),
        pros: asTextList(f.pros, `${w}.pros`, { max: 6, itemMax: 300 }),
        cons: asTextList(f.cons, `${w}.cons`, { max: 6, itemMax: 300 }),
        assumptions: asTextList(f.assumptions, `${w}.assumptions`, { max: 6, itemMax: 300 }),
      })),
      tradeoffs: asTextList(o.tradeoffs, "tradeoffs", { max: 8, itemMax: 400 }),
      recommendedNext: asText(o.recommendedNext, "recommendedNext", 600),
    };
  },
  example: {
    families: [{ name: "Önbellek", idea: "Sık okunan veriyi bellekte tut.", pros: ["Hızlı"], cons: ["Bayatlama"], assumptions: ["Okuma ağırlıklı yük"] }],
    tradeoffs: ["Hız ile tazelik arasında denge"],
    recommendedNext: "Önce gerçek okuma oranını ölç.",
  },
};
