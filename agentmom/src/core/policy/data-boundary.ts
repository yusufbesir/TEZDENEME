// Veri sınırı yönlendiricisi (madde 76, D5b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Veriyi dört sınıfa ayırır ve sınıfa göre hangi rota türlerine gidebileceğini belirler. Deterministiktir; model/ağ yok. Sınıflandırma SEZGİSELDİR:
// yol (yasak/duyarlı klasör, sır dosyası adı) ve metin (sır kalıbı) üzerinden çalışır; dosya İÇERİĞİ taranmaz. Bilinmeyen veri "internal" sayılır,
// "public" yalnız açıkça verilirse kullanılır. Kural motorda (engine.ts) uygulanır: bu modül yalnız sınıflandırır ve izinli rotaları söyler.
import { basename } from "node:path";
import { redactString } from "../audit/redact.ts";
import { isInside, isInsideReal } from "./engine.ts";
import type { AutonomyContract, DataClass, RouteKind } from "./types.ts";

export const DATA_CLASSES: readonly DataClass[] = ["public", "internal", "sensitive", "secret"];

const RANK: Record<DataClass, number> = { public: 0, internal: 1, sensitive: 2, secret: 3 };
export const SECRET_NAME = /(^\.env(\.|$)|\.(pem|key|pfx|p12|kdbx)$|^id_(rsa|ed25519|ecdsa)|credentials?(\.|$)|secrets?(\.|$)|\.npmrc$|\.netrc$)/i;

export function maxClass(a: DataClass, b: DataClass): DataClass {
  return RANK[a] >= RANK[b] ? a : b;
}

// Rota türleri: secret yalnız yerelde kalır; sensitive ücretli (API) rotaya gitmez; internal/public her rotaya gidebilir (ücretli rota ayrıca onay ister).
export function allowedRouteKinds(c: DataClass): RouteKind[] {
  if (c === "secret") return ["local"];
  if (c === "sensitive") return ["local", "subscription"];
  return ["local", "subscription", "api_paid"];
}

export function classifyPath(p: string, contract: Pick<AutonomyContract, "forbiddenDirs" | "sensitiveDirs">): DataClass {
  if (p.includes("\0")) return "secret";
  if (contract.forbiddenDirs?.some((d) => isInside(d, p) || isInside(p, d) || isInsideReal(d, p) || isInsideReal(p, d))) return "secret";
  if (SECRET_NAME.test(basename(p))) return "secret";
  // İki yönlü (yasak klasörlerdeki gibi): yol duyarlı klasörün içindeyse YA DA onu kapsıyorsa (üst klasör) duyarlıdır.
  if (contract.sensitiveDirs?.some((d) => isInside(d, p) || isInside(p, d) || isInsideReal(d, p) || isInsideReal(p, d))) return "sensitive";
  return "internal";
}

function entropyBits(s: string): number {
  const n = new Map<string, number>();
  for (const c of s) n.set(c, (n.get(c) ?? 0) + 1);
  let h = 0;
  for (const k of n.values()) h -= (k / s.length) * Math.log2(k / s.length);
  return h;
}

// Ek sezgi (kalıp tabanlı redaksiyona EK): kodlanmış/yüksek entropili uzun dizgi sır sayılır. Deterministik ve sınırlı:
//  - onaltılık: >= 32 onaltılık karakter, >= 8 farklı karakter, entropi >= 3,0 bit/karakter;
//  - base64/URL-güvenli: >= 32 karakter ([A-Za-z0-9+_-]), büyük, küçük harf ve rakam oranları sırasıyla >= %25, >= %25, >= %8 ve entropi >= 4,0 bit/karakter.
// YANLIŞ ALARM RİSKİ: git SHA'ları (40 onaltılık), özet değerleri ve rastgele görünen uzun kimlikler "secret" sayılır (yalnız yerel rotaya gider); düz sözcük, kısa kimlik,
// UUID (kısa bölümler) ve kebab/slug metinleri (ör. ADR-016-...) büyük harf oranı düşük olduğundan sayılmaz. Bölünmüş (araya boşluk girmiş) ya da başka kodlanmış sırlar yakalanmaz.
export function looksLikeEncodedSecret(text: string): boolean {
  for (const m of text.matchAll(/[A-Za-z0-9+_-]{32,}/g)) {
    const t = m[0];
    if (/^[0-9a-fA-F]+$/.test(t)) {
      if (new Set(t.toLowerCase()).size >= 8 && entropyBits(t) >= 3.0) return true;
      continue;
    }
    const up = (t.match(/[A-Z]/g) ?? []).length / t.length;
    const lo = (t.match(/[a-z]/g) ?? []).length / t.length;
    const dg = (t.match(/[0-9]/g) ?? []).length / t.length;
    if (up >= 0.25 && lo >= 0.25 && dg >= 0.08 && entropyBits(t) >= 4.0) return true;
  }
  return false;
}

export function classifyText(text: string): DataClass {
  return redactString(text) !== text || looksLikeEncodedSecret(text) ? "secret" : "internal";
}

export function classifyData(input: { paths?: string[]; text?: string }, contract: Pick<AutonomyContract, "forbiddenDirs" | "sensitiveDirs">): DataClass {
  let c: DataClass = "internal";
  for (const p of input.paths ?? []) c = maxClass(c, classifyPath(p, contract));
  if (input.text) c = maxClass(c, classifyText(input.text));
  return c;
}
