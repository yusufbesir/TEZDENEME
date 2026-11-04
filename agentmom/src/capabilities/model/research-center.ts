// Madde 37: araştırma merkezi (INTERNETLİ model yeteneği, D8c-2b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. Çıktı güvenilmez veridir.
import { asEnum, asItems, asObject, asText, asTextList, renderPrompt } from "./common.ts";
import type { CleanInput, ModelCapability, OutputContext, PromptSource } from "./common.ts";
import { CONFIDENCE, SOURCELESS_WARNING, attribute, countUnverified, netFields } from "./net-common.ts";

const SCHEMA = `{"summary":"","findings":[{"claim":"","sourceIndex":1,"quote":"kaynaktan aynen alıntı","confidence":"low|medium|high"}],"gaps":[""],"followUps":[""]}`;

export const researchCenter: ModelCapability = {
  id: "research-center",
  madde: 37,
  ad: "Araştırma merkezi",
  aciklama: `Soruyu, verdiğiniz (en çok 5) adresten getirilen kaynaklara dayanarak yanıtlar; her bulgu kaynak numarası ve aynen alıntıyla desteklenir, alıntılar doğrulanır. Adres verilmezse yalnız model bilgisiyle yanıtlar. ${SOURCELESS_WARNING}.`,
  needsNet: true,
  fields: netFields([
    { name: "question", label: "Soru", kind: "text", required: true, maxLength: 1500 },
    { name: "notes", label: "Notlar", kind: "text", required: false, maxLength: 1500 },
  ]),
  schemaSummary: "summary, findings[1-10]{claim,sourceIndex|null,quote|null,confidence(low|medium|high),verified}, gaps[], followUps[], unverifiedCount, sources[]",
  promptBuilder(input: CleanInput, sources?: PromptSource[]): string {
    const { urls: _urls, tickets: _tickets, ...rest } = input;
    return renderPrompt({
      gorev: "Soruyu yanıtla. Yanıtın bir özet, kaynaklara dayanan bulgular (her biri için güven düzeyi), eksik kalan noktalar ve sonraki adım önerilerinden oluşsun.",
      schema: SCHEMA,
      input: rest,
      labels: { question: "Soru", notes: "Notlar" },
      sourceless: !sources || sources.length === 0,
      ...(sources ? { sources } : {}),
    });
  },
  validateOutput(raw: unknown, ctx?: OutputContext): Record<string, unknown> {
    const o = asObject(raw, "çıktı");
    const findings = asItems(o.findings, "findings", { min: 1, max: 10 }, (f, w) => ({
      claim: asText(f.claim, `${w}.claim`, 600),
      ...attribute(f, w, ctx),
      confidence: asEnum(f.confidence, `${w}.confidence`, CONFIDENCE),
    }));
    return {
      summary: asText(o.summary, "summary", 1500),
      findings,
      gaps: asTextList(o.gaps, "gaps", { max: 8, itemMax: 400 }),
      followUps: asTextList(o.followUps, "followUps", { max: 8, itemMax: 400 }),
      unverifiedCount: countUnverified(findings),
    };
  },
  example: {
    summary: "Kısa özet.",
    findings: [{ claim: "Bir iddia.", sourceIndex: null, quote: null, verified: null, note: "kaynaksız (model bilgisi, doğrulanmamış)", confidence: "low" }],
    gaps: ["Eksik nokta"],
    followUps: ["Sonraki adım"],
    unverifiedCount: 0,
  },
};
