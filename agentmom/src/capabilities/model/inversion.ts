// Madde 84: tersine çevirme (model yeteneği, D8c-1). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. Çıktı güvenilmez veridir.
import { asItems, asObject, asText, asTextList, renderPrompt } from "./common.ts";
import type { CleanInput, ModelCapability } from "./common.ts";

const SCHEMA = `{"inversions":[{"failureMode":"","whyItHappens":"","preventions":[""]}],"premortem":""}`;

export const inversion: ModelCapability = {
  id: "inversion",
  madde: 84,
  ad: "Tersine çevirme",
  aciklama: "Hedefe nasıl kesin ulaşılamayacağını sorar: başarısızlık biçimlerini, nedenlerini ve önlemlerini listeler; kısa bir ön-ölüm analizi yazar. Yalnız öneridir.",
  fields: [{ name: "goal", label: "Hedef", kind: "text", required: true, maxLength: 3000 }],
  schemaSummary: "inversions[1-8]{failureMode,whyItHappens,preventions[]}, premortem",
  promptBuilder(input: CleanInput): string {
    return renderPrompt({
      gorev: "Hedefi tersine çevir: hedefe ulaşmayı garanti edecek şeyin tersini düşün. Başarısızlık biçimlerini, neden oluştuklarını ve önlemlerini çıkar; sonunda kısa bir ön-ölüm (premortem) paragrafı yaz.",
      schema: SCHEMA,
      input,
      labels: { goal: "Hedef" },
    });
  },
  validateOutput(raw: unknown): Record<string, unknown> {
    const o = asObject(raw, "çıktı");
    return {
      inversions: asItems(o.inversions, "inversions", { min: 1, max: 8 }, (i, w) => ({
        failureMode: asText(i.failureMode, `${w}.failureMode`, 300),
        whyItHappens: asText(i.whyItHappens, `${w}.whyItHappens`, 600),
        preventions: asTextList(i.preventions, `${w}.preventions`, { max: 6, itemMax: 300 }),
      })),
      premortem: asText(o.premortem, "premortem", 1200),
    };
  },
  example: { inversions: [{ failureMode: "Kimse kullanmaz", whyItHappens: "Değer belirsiz.", preventions: ["Erken kullanıcı görüşmesi"] }], premortem: "Bir yıl sonra proje, belirsiz değer yüzünden durdu." },
};
