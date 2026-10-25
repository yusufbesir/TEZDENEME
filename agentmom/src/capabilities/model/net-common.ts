// İnternetli model yeteneklerinin (37, 38, 40) ortak parçaları (D8c-2b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Kaynak atfı: sourceIndex 1..N içinde olmalı; alıntı (quote) verilmişse kaynak metninde GERÇEKTEN geçmeli (normalleştirilmiş karşılaştırma): geçiyorsa verified:true,
// geçmiyorsa verified:false (iddia SİLİNMEZ ama işaretlenir); kaynaksız iddia verified:null ("kaynaksız, model bilgisi, doğrulanmamış"). Model çıktısı GÜVENİLMEZ VERİDİR.
import { OutputInvalid, asText, normalizeForQuote } from "./common.ts";
import type { FieldSpec, OutputContext } from "./common.ts";

export const SOURCELESS_WARNING = "Bu yanıt internetten kaynak getirilmeden, yalnız model bilgisiyle üretildi; doğrulayın";
export const UNSOURCED_NOTE = "kaynaksız (model bilgisi, doğrulanmamış)";
export const MAX_URLS = 5;

// Ortak alanlar: urls (isteğe bağlı, toplam girdi sınırına sayılmaz) ve tickets ({url: bilet}; değeri çalıştırıcı doğrular).
export function netFields(main: FieldSpec[]): FieldSpec[] {
  return [
    ...main,
    { name: "urls", label: "Adresler", kind: "list", required: false, maxLength: 2000, maxItems: MAX_URLS, counted: false, raw: true },
    { name: "tickets", label: "Onay biletleri", kind: "map", required: false, maxLength: 200, maxItems: MAX_URLS },
  ];
}

export interface Attribution {
  sourceIndex: number | null;
  quote: string | null;
  verified: boolean | null;
  note?: string;
}

// Alıntı doğrulama kuralı (DAR ve savunulabilir): verified:true YALNIZ şunlar birlikte doğruysa:
//  1) alıntı en az 30 normalleştirilmiş karakter VE en az 5 sözcük;
//  2) alıntı kaynakta aynen (boşluk/büyük-küçük harf/tipografik normalleştirmeyle) geçer ve eşleşme SÖZCÜK SINIRLARINDA başlar/biter;
//  3) alıntı kaynak CÜMLESİNİN sonuna kadar uzanır (alıntıdan hemen sonra nokta/!/?/... ya da satır/metin sonu gelir; alıntının kendisi böyle bitiyorsa da olur).
// Aksi halde verified:false + neden notu (çok kısa / cümlenin yalnız bir kısmı / bulunamadı / alıntı verilmedi). Örn. kaynak "Fiyatı yüksek değildir." iken
// "Fiyatı yüksek" alıntısı true OLMAZ (anlamı tersine çeviren kesik alıntı). verified:true "iddianın doğruluğunu GARANTİ ETMEZ": yalnız alıntının kaynakta aynen geçtiğini söyler.
export const MIN_QUOTE_CHARS = 30;
export const MIN_QUOTE_WORDS = 5;
export const VERIFIED_MEANING =
  "verified:true = alıntı kaynakta aynen (sözcük sınırlarında ve cümlenin sonuna kadar) geçiyor; iddianın doğruluğunu GARANTİ ETMEZ. verified:false = alıntı bulunamadı, çok kısa, cümlenin yalnız bir kısmı ya da hiç alıntı verilmedi. verified:null = kaynaksız (model bilgisi, doğrulanmamış).";
export const NOTE_PARTIAL = "alıntı cümlenin yalnız bir kısmı";
export const NOTE_NO_QUOTE = "kaynak numarası var ama alıntı verilmedi";
export const NOTE_SHORT = "alıntı çok kısa (en az 30 karakter ve 5 sözcük gerekir)";
export const NOTE_NOT_FOUND = "alıntı kaynakta bulunamadı";

const isWordChar = (c: string | undefined): boolean => c !== undefined && c !== "" && /[\p{L}\p{N}]/u.test(c);

// text: normalizeForQuote(kaynak, true) çıktısı (satır sonları "\n" olarak korunur; uzunluk boşluklu karşılığıyla aynıdır).
export function checkQuote(normQuote: string, text: string): { verified: boolean; note?: string } {
  if (normQuote.length < MIN_QUOTE_CHARS || normQuote.split(" ").filter(Boolean).length < MIN_QUOTE_WORDS) return { verified: false, note: NOTE_SHORT };
  const flat = text.split("\n").join(" ");
  let from = 0;
  let partial = false;
  for (;;) {
    const i = flat.indexOf(normQuote, from);
    if (i < 0) break;
    from = i + 1;
    const end = i + normQuote.length;
    if (isWordChar(flat[i - 1]) && isWordChar(normQuote[0])) continue;
    if (isWordChar(flat[end]) && isWordChar(normQuote[normQuote.length - 1])) continue;
    const rest = text.slice(end);
    if (/[.!?…]$/.test(normQuote) || /^["')\]»”]*(?:[.!?…]|\n|$)/.test(rest)) return { verified: true };
    partial = true;
  }
  return { verified: false, note: partial ? NOTE_PARTIAL : NOTE_NOT_FOUND };
}

export function attribute(item: Record<string, unknown>, where: string, ctx: OutputContext | undefined): Attribution {
  const si = item.sourceIndex;
  if (si === null || si === undefined) return { sourceIndex: null, quote: null, verified: null, note: UNSOURCED_NOTE };
  if (typeof si !== "number" || !Number.isInteger(si)) throw new OutputInvalid(`${where}.sourceIndex: tam sayı ya da null bekleniyordu`);
  const text = ctx?.sources.get(si);
  if (text === undefined) throw new OutputInvalid(`${where}.sourceIndex: getirilmiş bir kaynağa karşılık gelmiyor`);
  const q = item.quote;
  if (q === null || q === undefined) return { sourceIndex: si, quote: null, verified: false, note: NOTE_NO_QUOTE };
  if (typeof q !== "string") throw new OutputInvalid(`${where}.quote: metin ya da null bekleniyordu`);
  const r = checkQuote(normalizeForQuote(q), text);
  return { sourceIndex: si, quote: asText(q, `${where}.quote`, 600), verified: r.verified, ...(r.note ? { note: r.note } : {}) };
}

export function countUnverified(items: Array<{ verified: boolean | null }>): number {
  return items.filter((i) => i.verified === false).length;
}

export const CONFIDENCE = ["low", "medium", "high"] as const;
export const PRIORITY = ["low", "medium", "high"] as const;
export const EFFORT = ["S", "M", "L"] as const;
