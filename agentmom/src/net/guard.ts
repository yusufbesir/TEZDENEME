// İnternet erişimi katmanı: saf güvenlik denetimleri (D8c-2a). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Ağ/DB yok: URL ayrıştırma, alan adı doğrulama/eşleme ve IP adresi sınıflandırma. Hata metinleri SABİTTİR (iç ayrıntı, IP ya da URL sızdırmaz).
import { isIP } from "node:net";
import { domainToASCII } from "node:url";
import { classifyText } from "../core/policy/data-boundary.ts";
import { redactString } from "../core/audit/redact.ts";

export const MAX_URL_LENGTH = 2000;
export const MAX_DOMAINS = 50;
export const MAX_DOMAIN_LENGTH = 100;

export interface Refusal {
  ok: false;
  code: string;
  message: string;
}

export function refuse(code: string, message: string): Refusal {
  return { ok: false, code, message };
}

// ---------- IP adresi sınıflandırma ----------

export function parseIPv4(s: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const out: number[] = [];
  for (let i = 1; i <= 4; i++) {
    const part = m[i] as string;
    if (part.length > 1 && part.startsWith("0")) return null; // sekizlik biçim belirsizliği: kabul edilmez
    const n = Number(part);
    if (n > 255) return null;
    out.push(n);
  }
  return out;
}

// IPv6 -> 16 bayt. Bölge kimliği (%) ve geçersiz biçim null döner (çağıran bunu "engelli" sayar).
export function parseIPv6(input: string): number[] | null {
  if (input.includes("%")) return null;
  let s = input;
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  if (isIP(s) !== 6) return null;
  let tail: number[] = [];
  const lastColon = s.lastIndexOf(":");
  const maybeV4 = s.slice(lastColon + 1);
  if (maybeV4.includes(".")) {
    const v4 = parseIPv4(maybeV4);
    if (!v4) return null;
    tail = v4;
    s = `${s.slice(0, lastColon + 1)}0:0`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] === "" ? [] : (halves[0] as string).split(":");
  const rest = halves.length === 2 ? (halves[1] === "" ? [] : (halves[1] as string).split(":")) : [];
  const groups: number[] = [];
  const toNum = (g: string): number | null => (/^[0-9a-fA-F]{1,4}$/.test(g) ? parseInt(g, 16) : null);
  const h = head.map(toNum);
  const r = rest.map(toNum);
  if (h.includes(null) || r.includes(null)) return null;
  if (halves.length === 1) {
    if (h.length !== 8) return null;
    groups.push(...(h as number[]));
  } else {
    const fill = 8 - h.length - r.length;
    if (fill < 1) return null;
    groups.push(...(h as number[]), ...new Array<number>(fill).fill(0), ...(r as number[]));
  }
  const bytes: number[] = [];
  for (const g of groups) bytes.push(g >> 8, g & 255);
  if (tail.length === 4) {
    bytes[12] = tail[0] as number;
    bytes[13] = tail[1] as number;
    bytes[14] = tail[2] as number;
    bytes[15] = tail[3] as number;
  }
  return bytes.length === 16 ? bytes : null;
}

// IPv4 dışı/özel/yerel/ayrılmış aralıklar. Yalnız genel (global) yayın adresleri false döner.
export function isBlockedIPv4(b: number[]): boolean {
  const [a, c, d] = [b[0] as number, b[1] as number, b[2] as number];
  if (a === 0) return true; // 0/8
  if (a === 10) return true; // 10/8
  if (a === 100 && c >= 64 && c <= 127) return true; // 100.64/10 (CGNAT)
  if (a === 127) return true; // loopback
  if (a === 169 && c === 254) return true; // bağlantı-yerel, bulut metadata 169.254.169.254 dahil
  if (a === 172 && c >= 16 && c <= 31) return true; // 172.16/12
  if (a === 192 && c === 0 && d === 0) return true; // 192.0.0/24
  if (a === 192 && c === 0 && d === 2) return true; // 192.0.2/24 belge
  if (a === 192 && c === 88 && d === 99) return true; // 6to4 aktarımı
  if (a === 192 && c === 168) return true; // 192.168/16
  if (a === 198 && (c === 18 || c === 19)) return true; // 198.18/15 benchmark
  if (a === 198 && c === 51 && d === 100) return true; // belge
  if (a === 203 && c === 0 && d === 113) return true; // belge
  if (a >= 224) return true; // çok noktaya yayın 224/4 ve ayrılmış 240/4 + yayın 255.255.255.255
  return false;
}

export function isBlockedIPv6(b: number[]): boolean {
  const first12Zero = b.slice(0, 12).every((x) => x === 0);
  if (first12Zero) return true; // ::, ::1 ve IPv4-uyumlu ::a.b.c.d (kullanımdan kalkmış)
  const isFfff = b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff;
  if (isFfff) return isBlockedIPv4(b.slice(12, 16)); // IPv4-eşlemeli: içindeki IPv4 aynı kurallarla
  // 64:ff9b::/96 NAT64: içindeki IPv4. 64:ff9b:1::/48 yerel kullanım: engelli.
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b) {
    if (b.slice(4, 12).every((x) => x === 0)) return isBlockedIPv4(b.slice(12, 16));
    return true;
  }
  // Yalnız 2000::/3 (genel tekil yayın) kabul edilir; fc00::/7, fe80::/10, fec0::/10, ff00::/8, ::/8 vb. burada elenir.
  if (((b[0] as number) & 0xe0) !== 0x20) return true;
  if (b[0] === 0x20 && b[1] === 0x02) return isBlockedIPv4(b.slice(2, 6)); // 6to4: içindeki IPv4
  if (b[0] === 0x20 && b[1] === 0x01) {
    if (b[2] === 0x0d && b[3] === 0xb8) return true; // 2001:db8::/32 belge
    if ((b[2] as number) <= 0x01) return true; // 2001::/23 IETF protokol (Teredo, ORCHID, benchmark ...)
  }
  if (b[0] === 0x3f && ((b[1] as number) & 0xf0) === 0xf0) return true; // 3fff::/20 belge
  return false;
}

// Biçimi tanınmayan adres "engelli" sayılır (kapalı kal).
export function isBlockedAddress(address: string): boolean {
  const fam = isIP(address.startsWith("[") ? address.slice(1, -1) : address);
  if (fam === 4) {
    const v4 = parseIPv4(address);
    return v4 === null ? true : isBlockedIPv4(v4);
  }
  if (fam === 6 || address.includes(":")) {
    const v6 = parseIPv6(address);
    return v6 === null ? true : isBlockedIPv6(v6);
  }
  return true;
}

// ---------- Alan adı doğrulama ve eşleme ----------

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const LOCAL_SUFFIXES = ["localhost", "local", "internal", "lan", "localdomain", "home.arpa", "intranet", "corp", "home", "private", "invalid", "test", "example"];

function isLocalName(name: string): boolean {
  return LOCAL_SUFFIXES.some((s) => name === s || name.endsWith(`.${s}`));
}

// Küçük harfli ASCII (punycode) biçime çevirir; IP adresi/yerel ad/tek etiket/kötü biçim reddedilir. Joker yalnız "*.a.b" (en az iki etiketli taban).
export function normalizeDomainPattern(raw: unknown): { ok: true; value: string } | Refusal {
  if (typeof raw !== "string") return refuse("invalid_field", "alan adı metin olmalı");
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > MAX_DOMAIN_LENGTH) return refuse("invalid_field", `alan adı 1-${MAX_DOMAIN_LENGTH} karakter olmalı`);
  if (/[\u0000- \u007f-\u009f/\\?#@:%[\]]/.test(trimmed)) return refuse("invalid_field", "alan adında geçersiz karakter var");
  const wildcard = trimmed.startsWith("*.");
  const body = wildcard ? trimmed.slice(2) : trimmed;
  if (body.includes("*") || body.length === 0) return refuse("invalid_field", "joker yalnız '*.alan.uzantı' biçiminde olabilir");
  if (isIP(body) !== 0 || isIP(body.replace(/^\[|\]$/g, "")) !== 0) return refuse("invalid_field", "IP adresi alan adı olarak eklenemez");
  const ascii = domainToASCII(body);
  if (ascii === "" || ascii.length > MAX_DOMAIN_LENGTH) return refuse("invalid_field", "alan adı geçersiz");
  if (ascii.endsWith(".") || ascii.startsWith(".")) return refuse("invalid_field", "alan adı nokta ile başlayıp bitemez");
  const labels = ascii.split(".");
  if (labels.length < 2) return refuse("invalid_field", "tek etiketli (yerel) ad kabul edilmez; en az 'ad.uzantı' olmalı");
  if (!labels.every((l) => LABEL.test(l))) return refuse("invalid_field", "alan adı etiketleri geçersiz");
  const tld = labels[labels.length - 1] as string;
  if (/^[0-9]+$/.test(tld) || /^0x[0-9a-f]*$/.test(tld) || isIP(ascii) !== 0) return refuse("invalid_field", "IP adresi biçimli ad kabul edilmez");
  if (isLocalName(ascii)) return refuse("invalid_field", "yerel ya da ayrılmış alan adı kabul edilmez");
  if (PUBLIC_SUFFIXES.includes(ascii)) return refuse("invalid_field", "genel sonek (birçok kişiye ait alan) eklenemez; tam alan adını yazın (ör. ad.github.io)");
  if (wildcard && isUnderPublicSuffix(ascii)) return refuse("invalid_field", "genel soneklerin altına joker izin verilemez; tam alan adını yazın");
  return { ok: true, value: wildcard ? `*.${ascii}` : ascii };
}

// Tam eşleşme ya da "*.alan" soneki (yalnız alt alan adları; "evilexample.com" ≠ "*.example.com", "*.example.com" kökü örtmez).
export function hostAllowed(host: string, domains: readonly string[]): boolean {
  const h = host.toLowerCase();
  for (const d of domains) {
    if (d.startsWith("*.")) {
      const base = d.slice(2);
      if (h.length > base.length + 1 && h.endsWith(`.${base}`)) return true;
    } else if (h === d) return true;
  }
  return false;
}

// ---------- URL ayrıştırma ----------

const SECRET_KEY = /(^|[^a-z])(pass(word|wd)?|secret|token|api[_-]?key|apikey|auth(orization)?|sig(nature)?|credential|session|sid|cookie|key|jwt|bearer)([^a-z]|$)/i;
const KEY_SUBSTR = /(token|secret|passw|apikey|api_key|api-key|credential)/i;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[tT ]\d{2}[:.]\d{2}(?:[:.]\d{2})?(?:[.,]\d+)?(?:[zZ]|[+-]\d{2}[:.]?\d{2})?)?$/;

// Yol parçası, ana bilgisayar etiketi ya da sorgu değeri şifrelenmiş/rastgele bir sır gibi mi? UUID ve ISO tarih/saat ve uzun slug (tire içeren küçük harfli metin) geçer.
export function looksLikeSecretValue(v: string): boolean {
  if (v.length < 32) return false;
  if (UUID.test(v) || ISO_DATE.test(v)) return false;
  if (/^[0-9a-fA-F]{32,}$/.test(v)) return true;
  if (/^[A-Za-z0-9_\-+/=.]+$/.test(v) && /[A-Z]/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v)) return true;
  if (/^[a-z0-9]{40,}$/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v)) return true;
  return false;
}

// Joker izni verilemeyen genel sonekler (kendisi ya da altı): tüm kiracılar başkalarına aittir. Tam alan adı (alice.github.io) verilebilir.
// Kayıt (ülke) soneki: kendisine joker/çıplak verilemez; altındaki kayıtlı ad (*.firma.com.tr) verilebilir.
export const REGISTRY_SUFFIXES: readonly string[] = [
  "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk", "com.tr", "org.tr", "net.tr", "edu.tr", "gov.tr", "com.au", "net.au", "org.au", "co.jp", "co.in", "co.nz", "com.br", "co.za", "com.mx", "com.cn", "com.ar",
];
// Barındırma sonekleri: kendisine VE altına joker verilemez (altındaki her ad ayrı bir kiracıdır).
export const HOSTING_SUFFIXES: readonly string[] = [
  "github.io", "githubusercontent.com", "gitlab.io", "herokuapp.com", "vercel.app", "now.sh", "netlify.app", "pages.dev", "workers.dev", "blogspot.com", "wordpress.com", "azurewebsites.net", "cloudfront.net",
  "amazonaws.com", "s3.amazonaws.com", "appspot.com", "web.app", "firebaseapp.com", "onrender.com", "fly.dev", "repl.co", "glitch.me", "surge.sh", "ngrok.io", "ngrok-free.app", "trycloudflare.com",
  "duckdns.org", "no-ip.org", "weebly.com", "wixsite.com", "tumblr.com", "myshopify.com", "bubbleapps.io", "netlify.com", "cloudapp.azure.com", "azureedge.net", "run.app", "web.val.run",
];

export const PUBLIC_SUFFIXES: readonly string[] = [...REGISTRY_SUFFIXES, ...HOSTING_SUFFIXES];

export function isUnderPublicSuffix(name: string): boolean {
  return HOSTING_SUFFIXES.some((p) => name === p || name.endsWith(`.${p}`));
}

export interface ParsedTarget {
  ok: true;
  url: URL;
  host: string;
}

// URL'yi WHATWG ile ayrıştırır ve ağa gitmeden yapılabilecek tüm denetimleri uygular (şema, kullanıcı bilgisi, IP-literal, port, uzunluk, sır).
// İzinli alan adı denetimi ayrıdır (hostAllowed): çağıran sırayla uygular.
export function parseTarget(input: unknown): ParsedTarget | Refusal {
  if (typeof input !== "string" || input.length === 0) return refuse("invalid_url", "adres geçersiz");
  if (input.length > MAX_URL_LENGTH) return refuse("url_too_long", "adres çok uzun");
  if (/[\u0000- \u007f-\u009f]/.test(input)) return refuse("invalid_url", "adres geçersiz karakter içeriyor");
  if (classifyText(input) === "secret") return refuse("secret_in_url", "adres sır benzeri bir değer içeriyor; sırlar adrese konmaz");
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return refuse("invalid_url", "adres geçersiz");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return refuse("scheme_not_allowed", "yalnız http ve https adreslerine izin verilir");
  if (url.username !== "" || url.password !== "") return refuse("credentials_in_url", "adreste kullanıcı bilgisi olamaz");
  const host = url.hostname.toLowerCase();
  if (host.length === 0) return refuse("invalid_url", "adres geçersiz");
  if (host.startsWith("[") || isIP(host) !== 0 || parseIPv4(host) !== null || /^[0-9.]+$/.test(host) || /^0x[0-9a-f.]*$/.test(host)) return refuse("ip_literal", "IP adresi içeren adreslere izin verilmez; alan adı kullanın");
  if (host.endsWith(".") || host.startsWith(".")) return refuse("invalid_url", "adres geçersiz");
  if (url.port !== "") return refuse("port_not_allowed", "yalnız varsayılan portlara (80/443) izin verilir");
  url.hash = "";
  // Sırlar yalnız sorguda değil ana bilgisayar etiketlerinde ve yol parçalarında da aranır.
  const secretMsg = "adres sır benzeri bir değer içeriyor; sırlar adrese konmaz";
  if (host.split(".").some((l) => looksLikeSecretValue(l))) return refuse("secret_in_url", secretMsg);
  for (const seg of url.pathname.split("/")) {
    let d = seg;
    try {
      d = decodeURIComponent(seg);
    } catch {
      // çözülemeyen parça ham haliyle denetlenir
    }
    if (looksLikeSecretValue(seg) || looksLikeSecretValue(d)) return refuse("secret_in_url", secretMsg);
  }
  // Sorgu parametreleri: sır benzeri anahtar/değer reddedilir (çözülmüş ve ham biçim).
  const decoded = (() => {
    try {
      return decodeURIComponent(url.href);
    } catch {
      return url.href;
    }
  })();
  if (decoded !== url.href && classifyText(decoded) === "secret") return refuse("secret_in_url", "adres sır benzeri bir değer içeriyor; sırlar adrese konmaz");
  for (const [k, v] of url.searchParams) {
    if ((SECRET_KEY.test(k) || KEY_SUBSTR.test(k)) && v.length > 0) return refuse("secret_in_url", "adres sır benzeri bir değer içeriyor; sırlar adrese konmaz");
    if (redactString(v) !== v || redactString(k) !== k || looksLikeSecretValue(v)) return refuse("secret_in_url", "adres sır benzeri bir değer içeriyor; sırlar adrese konmaz");
  }
  return { ok: true, url, host };
}
