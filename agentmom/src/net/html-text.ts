// İnternet erişimi katmanı: HTML -> düz metin (D8c-2a). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Çıktı GÜVENİLMEZ VERİDİR; hiçbir yerde talimat olarak yorumlanmaz. Atılanlar: script/style/noscript/template/iframe/object/embed/svg/math/head/textarea,
// yorumlar, CDATA, doctype, gizli öğeler (hidden, aria-hidden, display:none, visibility:hidden, boyutsuz/ekran dışı stil, type=hidden), kontrol/bidi/görünmez
// karakterler. Varlıklar bir kez çözülür (çift çözme yok). Sonuç redactString'ten geçer. Doğrusal zamanlı elle yazılmış tarayıcı: düzenli ifade bombası yok.
import { redactString } from "../core/audit/redact.ts";

export const MAX_TEXT_BYTES = 60 * 1024;

const DROP_BLOCKS = new Set(["script", "style", "noscript", "template", "iframe", "object", "embed", "svg", "math", "textarea", "select", "canvas", "audio", "video", "map", "dialog"]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const BLOCK = new Set(["p", "div", "br", "li", "ul", "ol", "tr", "table", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article", "header", "footer", "main", "aside", "nav", "blockquote", "pre", "hr", "form", "fieldset", "dl", "dt", "dd", "figure", "figcaption", "address", "details", "summary", "title"]);
const CELL = new Set(["td", "th"]);
const MAX_STYLE_CHARS = 512;

// "12px", "0.01em", "0" gibi değerin sayısı ve birimi (regex'siz, doğrusal).
function numUnit(v: string): { n: number; unit: string } | null {
  let i = 0;
  if (v[i] === "-" || v[i] === "+") i++;
  while (i < v.length && ((v[i] as string) >= "0" && (v[i] as string) <= "9" || v[i] === ".")) i++;
  const n = parseFloat(v.slice(0, i));
  if (!Number.isFinite(n)) return null;
  return { n, unit: v.slice(i) };
}

// Satır içi stilde "görünmez" ipuçları. Stil MAX_STYLE_CHARS'tan uzunsa (dolgu saldırısı) gizli sayılır (kapalı kal). Regex yok: bildirimler ';' ile bölünür.
export function styleIsHidden(style: string): boolean {
  if (style.length > MAX_STYLE_CHARS) return true;
  let hZero = false;
  let wZero = false;
  let overflowHidden = false;
  for (const decl of style.toLowerCase().split(";")) {
    const c = decl.indexOf(":");
    if (c < 0) continue;
    const prop = decl.slice(0, c).trim();
    const val = decl.slice(c + 1).split("!important").join("").split(" ").join("").split("\t").join("");
    const nu = numUnit(val);
    if (prop === "display" && val === "none") return true;
    if (prop === "visibility" && (val === "hidden" || val === "collapse")) return true;
    if (prop === "opacity" && nu && nu.unit === "" && nu.n <= 0.01) return true;
    if (prop === "color" && (val === "transparent" || (val.startsWith("rgba(") && val.endsWith(",0)")) || val.endsWith(",0.0)"))) return true;
    if (prop === "font-size" && nu) {
      if (nu.unit === "" && nu.n === 0) return true;
      if ((nu.unit === "px" || nu.unit === "pt") && nu.n <= 1) return true;
      if ((nu.unit === "em" || nu.unit === "rem") && nu.n <= 0.1) return true;
      if (nu.unit === "%" && nu.n <= 10) return true;
    }
    if ((prop === "text-indent" || prop === "left" || prop === "top" || prop === "right" || prop === "margin-left" || prop === "margin-top") && nu && nu.n <= -999) return true;
    if (prop === "clip" && val.startsWith("rect(") && (val.startsWith("rect(0") || val.startsWith("rect(1px,1px,1px,1px"))) return true;
    if (prop === "clip-path" && (val.startsWith("inset(100%") || val.startsWith("circle(0"))) return true;
    if ((prop === "height" || prop === "max-height") && nu && nu.n === 0) hZero = true;
    if ((prop === "width" || prop === "max-width") && nu && nu.n === 0) wZero = true;
    if (prop === "overflow" && val === "hidden") overflowHidden = true;
  }
  return (hZero || wZero) && overflowHidden;
}

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", reg: "®", trade: "™", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", bull: "•", middot: "·", euro: "€", pound: "£", yen: "¥", cent: "¢", sect: "§", deg: "°", times: "×", divide: "÷",
  ccedil: "ç", Ccedil: "Ç", ouml: "ö", Ouml: "Ö", uuml: "ü", Uuml: "Ü", auml: "ä", Auml: "Ä", eacute: "é", Eacute: "É", egrave: "è", agrave: "à", aacute: "á", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", szlig: "ß",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([A-Za-z][A-Za-z0-9]{1,10}));/g, (m, dec: string | undefined, hex: string | undefined, name: string | undefined) => {
    if (name !== undefined) return Object.hasOwn(NAMED, name) ? (NAMED[name] as string) : m;
    const cp = dec !== undefined ? Number(dec) : parseInt(hex as string, 16);
    if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return " ";
    return String.fromCodePoint(cp);
  });
}

// Görünmez/yönlendirici karakterleri atar; satır ayırıcıları satır sonuna çevirir.
export function stripInvisible(s: string): string {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0) as number;
    if (cp === 0x0a || cp === 0x09) out += ch;
    else if (cp === 0x0d || cp === 0x2028 || cp === 0x2029 || cp === 0x85 || cp === 0x0b || cp === 0x0c) out += "\n";
    else if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) continue;
    else if (cp === 0xad || cp === 0x61c || cp === 0x180e || cp === 0xfeff || cp === 0x34f) continue;
    else if ((cp >= 0x200b && cp <= 0x200f) || (cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2060 && cp <= 0x206f) || (cp >= 0xfff9 && cp <= 0xfffb)) continue;
    else if (cp === 0x2800 || cp === 0x3164 || cp === 0x115f || cp === 0x1160 || cp === 0xffa0 || cp === 0x17b4 || cp === 0x17b5 || (cp >= 0xfe00 && cp <= 0xfe0f)) continue; // boşluk benzeri görünmez karakterler
    else if (cp >= 0xe0000 && cp <= 0xe01ef) continue; // Unicode "tag" ve varyasyon seçici ek karakterleri (ASCII kaçırma)
    else if (cp === 0xa0 || cp === 0x202f || cp === 0x2007 || (cp >= 0x2000 && cp <= 0x200a) || cp === 0x205f || cp === 0x3000) out += " ";
    else out += ch;
  }
  return out;
}

export function tidy(s: string): string {
  return s
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// UTF-8 olarak en çok maxBytes bayt kalacak biçimde kısaltır (karakteri ortadan bölmez).
export function clipBytes(s: string, maxBytes: number): { text: string; clipped: boolean } {
  if (Buffer.byteLength(s, "utf8") <= maxBytes) return { text: s, clipped: false };
  let end = Math.min(s.length, maxBytes);
  while (end > 0 && Buffer.byteLength(s.slice(0, end), "utf8") > maxBytes) end = Math.floor(end * 0.95);
  while (end < s.length && Buffer.byteLength(s.slice(0, end + 1), "utf8") <= maxBytes) end++;
  let t = s.slice(0, end);
  const last = t.charCodeAt(t.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) t = t.slice(0, -1);
  return { text: t, clipped: true };
}

interface Tag {
  name: string;
  closing: boolean;
  selfClose: boolean;
  attrs: Map<string, string>;
  end: number; // etiketten sonraki konum
}

function isNameStart(c: string): boolean {
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
}

// i konumunda '<' var ve ardından etiket adı (ya da '/' + ad) geliyorsa etiketi ayrıştırır; tırnaklı öznitelik değerleri '>' içerebilir.
function parseTag(html: string, i: number): Tag | null {
  let p = i + 1;
  let closing = false;
  if (html[p] === "/") {
    closing = true;
    p++;
  }
  if (p >= html.length || !isNameStart(html[p] as string)) return null;
  let q = p;
  while (q < html.length && !/[\s/>]/.test(html[q] as string)) q++;
  const name = html.slice(p, q).toLowerCase();
  const attrs = new Map<string, string>();
  let selfClose = false;
  p = q;
  while (p < html.length) {
    const c = html[p] as string;
    if (c === ">") return { name, closing, selfClose, attrs, end: p + 1 };
    if (c === "/") {
      selfClose = html[p + 1] === ">";
      p++;
      continue;
    }
    if (/\s/.test(c)) {
      p++;
      continue;
    }
    let a = p;
    while (a < html.length && !/[\s=/>]/.test(html[a] as string)) a++;
    const attrName = html.slice(p, a).toLowerCase();
    p = a;
    while (p < html.length && /\s/.test(html[p] as string)) p++;
    let value = "";
    if (html[p] === "=") {
      p++;
      while (p < html.length && /\s/.test(html[p] as string)) p++;
      const quote = html[p];
      if (quote === '"' || quote === "'") {
        const close = html.indexOf(quote, p + 1);
        if (close < 0) return { name, closing, selfClose, attrs, end: html.length }; // kapanmamış tırnak: tarayıcılar gibi kalan belge etikete katılır (doğrusal zaman)
        value = html.slice(p + 1, close);
        p = close + 1;
      } else {
        let v = p;
        while (v < html.length && !/[\s>]/.test(html[v] as string)) v++;
        value = html.slice(p, v);
        p = v;
      }
    }
    if (attrName.length > 0 && attrs.size < 40 && !attrs.has(attrName)) attrs.set(attrName, value);
    else if (attrName.length === 0) p++;
  }
  return { name, closing, selfClose, attrs, end: html.length }; // ">" yok: kalan belge etikete katılır (doğrusal zaman)
}

function isHiddenElement(tag: Tag): boolean {
  if (tag.attrs.has("hidden")) return true;
  if ((tag.attrs.get("aria-hidden") ?? "").trim().toLowerCase() === "true") return true;
  if (tag.name === "input" && (tag.attrs.get("type") ?? "").trim().toLowerCase() === "hidden") return true;
  const style = tag.attrs.get("style");
  if (style !== undefined && styleIsHidden(decodeEntities(style.length > MAX_STYLE_CHARS ? style.slice(0, MAX_STYLE_CHARS + 1) : style))) return true;
  return false;
}

// "</ad" kapanış etiketinin konumu (büyük/küçük harf duyarsız, regex'siz, doğrusal); yoksa -1.
function findClose(html: string, name: string, from: number): number {
  let p = from;
  for (;;) {
    const at = html.indexOf("</", p);
    if (at < 0) return -1;
    if (html.slice(at + 2, at + 2 + name.length).toLowerCase() === name) {
      const next = html[at + 2 + name.length];
      if (next === undefined || next === ">" || next === "/" || next === " " || next === "\t" || next === "\n" || next === "\r" || next === "\f") return at;
    }
    p = at + 2;
  }
}

export function htmlToText(html: string): string {
  const out: string[] = [];
  let title = "";
  let i = 0;
  const n = html.length;
  // skip: atlanan öğenin adı ve iç içe aynı ad sayacı. Kapanış etiketi gelene kadar her şey atılır.
  let skipName: string | null = null;
  let skipDepth = 0;
  let inTitle = false;
  let titleBuf = "";
  while (i < n) {
    const lt = html.indexOf("<", i);
    const textEnd = lt < 0 ? n : lt;
    if (textEnd > i && skipName === null) {
      if (inTitle) titleBuf += html.slice(i, textEnd);
      else out.push(html.slice(i, textEnd));
    }
    if (lt < 0) break;
    i = lt;
    if (html.startsWith("<!--", i)) {
      const e = html.indexOf("-->", i + 4);
      i = e < 0 ? n : e + 3;
      continue;
    }
    if (html.startsWith("<![CDATA[", i)) {
      const e = html.indexOf("]]>", i + 9);
      i = e < 0 ? n : e + 3;
      continue;
    }
    if (html[i + 1] === "!" || html[i + 1] === "?") {
      const e = html.indexOf(">", i + 2);
      i = e < 0 ? n : e + 1;
      continue;
    }
    const tag = parseTag(html, i);
    if (!tag) {
      if (skipName === null) out.push("<");
      i++;
      continue;
    }
    i = tag.end;
    if (skipName !== null) {
      if (tag.name === skipName && !VOID.has(tag.name)) {
        if (tag.closing) {
          skipDepth--;
          if (skipDepth <= 0) skipName = null;
        } else if (!tag.selfClose) skipDepth++;
      }
      continue;
    }
    if (tag.closing) {
      if (tag.name === "title") {
        inTitle = false;
        if (title === "") title = titleBuf;
      }
      if (BLOCK.has(tag.name)) out.push("\n");
      else if (CELL.has(tag.name)) out.push(" ");
      continue;
    }
    if (tag.name === "title" && !inTitle && title === "") {
      inTitle = true;
      titleBuf = "";
      continue;
    }
    // Ham metin öğeleri (script/style/textarea/title ...): kapanış etiketine kadar atla; yoksa belge sonuna kadar.
    if (DROP_BLOCKS.has(tag.name)) {
      if (tag.selfClose || VOID.has(tag.name)) continue;
      if (tag.name === "script" || tag.name === "style" || tag.name === "textarea") {
        const at = findClose(html, tag.name, i);
        if (at < 0) {
          i = n;
        } else {
          const gt = html.indexOf(">", at);
          i = gt < 0 ? n : gt + 1;
        }
        continue;
      }
      skipName = tag.name;
      skipDepth = 1;
      continue;
    }
    if (isHiddenElement(tag)) {
      if (VOID.has(tag.name) || tag.selfClose) continue;
      skipName = tag.name;
      skipDepth = 1;
      continue;
    }
    if (BLOCK.has(tag.name)) out.push("\n");
    else if (CELL.has(tag.name)) out.push(" ");
  }
  if (inTitle && title === "") title = titleBuf;
  const body = tidy(stripInvisible(decodeEntities(out.join(""))));
  const head = tidy(stripInvisible(decodeEntities(title))).replace(/\n+/g, " ");
  const combined = head ? `${head}\n\n${body}` : body;
  return tidy(redactString(combined));
}

// HTML olmayan metin (düz metin, markdown, json, xml): yalnız temizlenir ve sır maskelenir.
export function plainToText(s: string): string {
  return tidy(redactString(stripInvisible(s)));
}
