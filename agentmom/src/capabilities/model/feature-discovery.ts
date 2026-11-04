// Madde 38: özellik keşfi (INTERNETLİ model yeteneği, D8c-2b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. Çıktı güvenilmez veridir.
import { asEnum, asItems, asObject, asText, asTextList, renderPrompt } from "./common.ts";
import type { CleanInput, ModelCapability, OutputContext, PromptSource } from "./common.ts";
import { EFFORT, PRIORITY, SOURCELESS_WARNING, attribute, countUnverified, netFields } from "./net-common.ts";

const SCHEMA = `{"features":[{"name":"","rationale":"","priority":"low|medium|high","sourceIndex":1,"quote":"kaynaktan aynen alıntı","effort":"S|M|L"}],"risks":[""]}`;

export const featureDiscovery: ModelCapability = {
  id: "feature-discovery",
  madde: 38,
  ad: "Özellik keşfi",
  aciklama: `Proje tanımınıza ve verdiğiniz (en çok 5) adresten getirilen kaynaklara dayanarak eklenebilecek özellikleri gerekçe, öncelik ve emek tahminiyle önerir; alıntılar doğrulanır. ${SOURCELESS_WARNING} (adres verilmezse).`,
  needsNet: true,
  fields: netFields([
    { name: "projectDescription", label: "Proje tanımı", kind: "text", required: true, maxLength: 2000 },
    { name: "constraints", label: "Kısıtlar", kind: "text", required: false, maxLength: 1000 },
  ]),
  schemaSummary: "features[1-10]{name,rationale,priority(low|medium|high),sourceIndex|null,quote|null,effort(S|M|L),verified}, risks[], unverifiedCount, sources[]",
  promptBuilder(input: CleanInput, sources?: PromptSource[]): string {
    const { urls: _urls, tickets: _tickets, ...rest } = input;
    return renderPrompt({
      gorev: "Projeye eklenebilecek özellikleri öner. Her özellik için gerekçe, öncelik (low, medium, high), emek (S, M, L) ve varsa dayandığı kaynak yaz; sonunda riskleri listele.",
      schema: SCHEMA,
      input: rest,
      labels: { projectDescription: "Proje tanımı", constraints: "Kısıtlar" },
      sourceless: !sources || sources.length === 0,
      ...(sources ? { sources } : {}),
    });
  },
  validateOutput(raw: unknown, ctx?: OutputContext): Record<string, unknown> {
    const o = asObject(raw, "çıktı");
    const features = asItems(o.features, "features", { min: 1, max: 10 }, (f, w) => ({
      name: asText(f.name, `${w}.name`, 120),
      rationale: asText(f.rationale, `${w}.rationale`, 600),
      priority: asEnum(f.priority, `${w}.priority`, PRIORITY),
      ...attribute(f, w, ctx),
      effort: asEnum(f.effort, `${w}.effort`, EFFORT),
    }));
    return { features, risks: asTextList(o.risks, "risks", { max: 8, itemMax: 400 }), unverifiedCount: countUnverified(features) };
  },
  example: {
    features: [{ name: "Dışa aktarma", rationale: "Kullanıcılar verilerini taşımak ister.", priority: "medium", sourceIndex: null, quote: null, verified: null, note: "kaynaksız (model bilgisi, doğrulanmamış)", effort: "M" }],
    risks: ["Kapsam büyümesi"],
    unverifiedCount: 0,
  },
};
