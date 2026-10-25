// Madde 82: disiplinler arası fikir aktarımı (model yeteneği, D8c-1). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. Çıktı güvenilmez veridir.
import { asItems, asObject, asText, asTextList, renderPrompt } from "./common.ts";
import type { CleanInput, ModelCapability } from "./common.ts";

const SCHEMA = `{"transfers":[{"discipline":"","concept":"","mapping":"","risks":[""]}]}`;

export const ideaTransfer: ModelCapability = {
  id: "idea-transfer",
  madde: 82,
  ad: "Disiplinler arası fikir aktarımı",
  aciklama: "Problemi, verilen (en çok 3) başka disiplinin kavramlarıyla eşleyerek yeni bakış açıları önerir; her aktarımın riskini söyler. Yalnız öneridir.",
  fields: [
    { name: "problem", label: "Problem", kind: "text", required: true, maxLength: 2500 },
    { name: "disciplines", label: "Kaynak disiplinler", kind: "list", required: true, maxLength: 80, maxItems: 3 },
  ],
  schemaSummary: "transfers[1-6]{discipline,concept,mapping,risks[]}",
  promptBuilder(input: CleanInput): string {
    return renderPrompt({
      gorev: "Verilen problemi, listelenen kaynak disiplinlerin kavramlarıyla eşle. Her disiplin için en az bir aktarım ver: kavram, probleme nasıl eşlendiği ve bu eşlemenin riskleri.",
      schema: SCHEMA,
      input,
      labels: { problem: "Problem", disciplines: "Kaynak disiplinler" },
    });
  },
  validateOutput(raw: unknown): Record<string, unknown> {
    const o = asObject(raw, "çıktı");
    return {
      transfers: asItems(o.transfers, "transfers", { min: 1, max: 6 }, (t, w) => ({
        discipline: asText(t.discipline, `${w}.discipline`, 120),
        concept: asText(t.concept, `${w}.concept`, 400),
        mapping: asText(t.mapping, `${w}.mapping`, 800),
        risks: asTextList(t.risks, `${w}.risks`, { max: 6, itemMax: 300 }),
      })),
    };
  },
  example: { transfers: [{ discipline: "Ekoloji", concept: "Taşıma kapasitesi", mapping: "Kuyruk uzunluğunu kaynak sınırıyla eşle.", risks: ["Benzetme sınırlı olabilir"] }] },
};
