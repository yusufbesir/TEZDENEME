// Madde 92: niyet katmanı (model yeteneği, D8c-1). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Çıktı yalnız ÖNERİDİR: kimlik katalog listesinde yoksa "none"a düşürülür, parametreler ayrıca doğrulanır; hiçbir şey kendiliğinden çalıştırılmaz (ADR-016).
import { OutputInvalid, asObject, asText, cleanText, renderPrompt } from "./common.ts";
import type { CleanInput, ModelCapability } from "./common.ts";

// Katalog: model yetenekleri (kimlik) ve kullanıcı-çağrılı yetenekler ("madde-NN", src/server/ui/capabilities.js ile aynı madde numaraları). Kendisi (intent) yoktur.
export const INTENT_CATALOG: ReadonlyArray<{ id: string; ad: string }> = [
  { id: "solution-space", ad: "Çözüm uzayı gezgini" },
  { id: "idea-transfer", ad: "Disiplinler arası fikir aktarımı" },
  { id: "inversion", ad: "Tersine çevirme" },
  { id: "emergence", ad: "Ortaya çıkan davranış" },
  { id: "multi-horizon", ad: "Çok ufuklu strateji" },
  { id: "negotiation", ad: "Ajanlar arası müzakere" },
  { id: "research-center", ad: "Araştırma merkezi" },
  { id: "feature-discovery", ad: "Özellik keşfi" },
  { id: "competitor-research", ad: "Rakip ve ekosistem araştırması" },
  { id: "madde-21", ad: "Otomatik dokümantasyon" },
  { id: "madde-24", ad: "API test laboratuvarı" },
  { id: "madde-27", ad: "Erişilebilirlik laboratuvarı" },
  { id: "madde-44", ad: "Aşamalı bağlam getirme" },
  { id: "madde-49", ad: "Projeye özgü tasarım motoru" },
  { id: "madde-50", ad: "Jenerik tasarım karşıtı ilkeler" },
  { id: "madde-56", ad: "Davranış sözleşmeleri ve değişmezler" },
  { id: "madde-57", ad: "Durum geçiş laboratuvarı" },
  { id: "madde-58", ad: "Mutasyon testi" },
  { id: "madde-61", ad: "Argüman derle" },
  { id: "madde-62", ad: "Rakip hipotezler" },
  { id: "madde-63", ad: "Bilgi değeri" },
  { id: "madde-64", ad: "Çelişki çözüm önerileri" },
  { id: "madde-66", ad: "Bilgi yarı ömrü" },
  { id: "madde-70", ad: "Etki haritası" },
  { id: "madde-72", ad: "Kaynak gölge fiyatı" },
  { id: "madde-73", ad: "Yetenek süreklilik grafiği" },
  { id: "madde-74", ad: "Çevrimdışı süreklilik kipi" },
  { id: "madde-80", ad: "Sağlayıcı çıkış planı" },
  { id: "madde-83", ad: "Eksiklik ve fazlalık" },
  { id: "madde-86", ad: "Uzmanlık haritası" },
  { id: "madde-87", ad: "Örtük bilgi önerileri" },
  { id: "madde-89", ad: "Karar soy ağacı" },
  { id: "madde-90", ad: "Proje hafızası özeti" },
  { id: "madde-93", ad: "Dikkat sırası" },
  { id: "madde-97", ad: "Öğrenme getirisi" },
  { id: "madde-99", ad: "İç yetenek aracısı" },
];
const IDS: ReadonlySet<string> = new Set(INTENT_CATALOG.map((c) => c.id));
const PARAM_KEY = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
const MAX_PARAMS = 6;

const SCHEMA = `{"intent":"<katalog kimliği ya da none>","params":{"<ad>":"<kısa metin, sayı ya da true/false>"},"explanation":""}`;

export const intent: ModelCapability = {
  id: "intent",
  madde: 92,
  ad: "Niyet katmanı",
  aciklama: "Serbest metindeki isteği yetenek kataloğundaki bir yeteneğe eşlemeyi ÖNERİR; hiçbir yeteneği kendiliğinden çalıştırmaz, karar kullanıcıdadır.",
  fields: [{ name: "text", label: "İstek", kind: "text", required: true, maxLength: 2500 }],
  schemaSummary: "intent(katalog kimliği|none), params{ad: metin|sayı|mantıksal}, explanation",
  promptBuilder(input: CleanInput): string {
    const katalog = INTENT_CATALOG.map((c) => `${c.id}: ${c.ad}`).join("\n");
    return renderPrompt({
      gorev: `İsteği aşağıdaki katalogdan EN FAZLA bir yeteneğe eşle (uymuyorsa intent alanına none yaz). Yalnız öneri üretiyorsun; hiçbir şey çalıştırılmayacak.\nKatalog:\n${katalog}`,
      schema: SCHEMA,
      input,
      labels: { text: "İstek" },
    });
  },
  validateOutput(raw: unknown): Record<string, unknown> {
    const o = asObject(raw, "çıktı");
    const explanation = asText(o.explanation, "explanation", 600);
    // Katalog dışı (ya da metin olmayan) kimlik asla geçmez: "none".
    const wanted = typeof o.intent === "string" ? o.intent.trim() : "";
    const id = IDS.has(wanted) ? wanted : "none";
    const params: Record<string, string | number | boolean> = {};
    if (o.params !== undefined && o.params !== null) {
      const p = asObject(o.params, "params");
      const keys = Object.keys(p);
      if (keys.length > MAX_PARAMS) throw new OutputInvalid(`params: en çok ${MAX_PARAMS} alan olabilir`);
      for (const k of keys) {
        if (!PARAM_KEY.test(k)) throw new OutputInvalid("params: geçersiz alan adı");
        const v = p[k];
        if (typeof v === "string") params[k] = cleanText(v, 200);
        else if (typeof v === "number" && Number.isFinite(v)) params[k] = v;
        else if (typeof v === "boolean") params[k] = v;
        else throw new OutputInvalid(`params.${k}: yalnız metin, sayı ya da mantıksal değer olabilir`);
      }
    }
    // Katalogda olmayan niyet için parametre taşınmaz.
    return { intent: id, params: id === "none" ? {} : params, explanation };
  },
  example: { intent: "madde-70", params: { file: "src/a.ts" }, explanation: "İstek, bir dosyanın etkisini sormaya benziyor." },
};
