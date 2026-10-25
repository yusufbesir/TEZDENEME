// Madde 40: rakip ve ekosistem araştırması (INTERNETLİ model yeteneği, D8c-2b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. Çıktı güvenilmez veridir.
import { asItems, asObject, asText, asTextList, renderPrompt } from "./common.ts";
import type { CleanInput, ModelCapability, OutputContext, PromptSource } from "./common.ts";
import { SOURCELESS_WARNING, attribute, countUnverified, netFields } from "./net-common.ts";

const SCHEMA = `{"entities":[{"name":"","strengths":[""],"weaknesses":[""],"sourceIndex":1,"quote":"kaynaktan aynen alıntı"}],"comparison":[{"criterion":"","notes":""}],"gaps":[""]}`;

export const competitorResearch: ModelCapability = {
  id: "competitor-research",
  madde: 40,
  ad: "Rakip ve ekosistem araştırması",
  aciklama: `Bir konuyu ve karşılaştırılacak (en çok 4) rakibi, verdiğiniz (en çok 5) adresten getirilen kaynaklara dayanarak karşılaştırır; güçlü/zayıf yönler ve ölçüt tablosu çıkarır, alıntılar doğrulanır. ${SOURCELESS_WARNING} (adres verilmezse).`,
  needsNet: true,
  fields: netFields([
    { name: "subject", label: "Konu", kind: "text", required: true, maxLength: 500 },
    { name: "compareWith", label: "Karşılaştırılacaklar", kind: "list", required: false, maxLength: 100, maxItems: 4 },
  ]),
  schemaSummary: "entities[1-6]{name,strengths[],weaknesses[],sourceIndex|null,quote|null,verified}, comparison[0-10]{criterion,notes}, gaps[], unverifiedCount, sources[]",
  promptBuilder(input: CleanInput, sources?: PromptSource[]): string {
    const { urls: _urls, tickets: _tickets, ...rest } = input;
    return renderPrompt({
      gorev: "Konuyu ve karşılaştırılacakları değerlendir. Her varlık için güçlü ve zayıf yönleri, varsa dayandığı kaynağı yaz; ölçüt bazlı karşılaştırma ve eksik kalan noktaları ver.",
      schema: SCHEMA,
      input: rest,
      labels: { subject: "Konu", compareWith: "Karşılaştırılacaklar" },
      sourceless: !sources || sources.length === 0,
      ...(sources ? { sources } : {}),
    });
  },
  validateOutput(raw: unknown, ctx?: OutputContext): Record<string, unknown> {
    const o = asObject(raw, "çıktı");
    const entities = asItems(o.entities, "entities", { min: 1, max: 6 }, (e, w) => ({
      name: asText(e.name, `${w}.name`, 120),
      strengths: asTextList(e.strengths, `${w}.strengths`, { max: 6, itemMax: 300 }),
      weaknesses: asTextList(e.weaknesses, `${w}.weaknesses`, { max: 6, itemMax: 300 }),
      ...attribute(e, w, ctx),
    }));
    return {
      entities,
      comparison: asItems(o.comparison, "comparison", { min: 0, max: 10 }, (c, w) => ({ criterion: asText(c.criterion, `${w}.criterion`, 120), notes: asText(c.notes, `${w}.notes`, 600) })),
      gaps: asTextList(o.gaps, "gaps", { max: 8, itemMax: 400 }),
      unverifiedCount: countUnverified(entities),
    };
  },
  example: {
    entities: [{ name: "Örnek ürün", strengths: ["Hızlı"], weaknesses: ["Pahalı"], sourceIndex: null, quote: null, verified: null, note: "kaynaksız (model bilgisi, doğrulanmamış)" }],
    comparison: [{ criterion: "Fiyat", notes: "Orta" }],
    gaps: ["Fiyat verisi eksik"],
    unverifiedCount: 0,
  },
};
