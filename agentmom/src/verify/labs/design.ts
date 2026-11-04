// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Doğrulama laboratuvarı madde 49 + 50: tasarım laboratuvarı ("design-lab"). Projenin KENDİ tasarım sözleşmesi (palet, font, aralık/yarıçap ölçekleri, çeşitlilik sınırları)
// çalışma ağacındaki STATİK HTML/CSS dosyalarına karşı denetlenir ve "jenerik/şablon" izleri (placeholder metin, bilinen şablon renkleri) ölçülebilir kurallarla yakalanır.
// Estetik yargı YOKTUR: her denetim deterministik ve ölçülebilirdir. Tarayıcı/kod ÇALIŞTIRILMAZ. Her denetim ayrı bir TestResult'tır (id: design-<anahtar>).
// Güvenlik: regex yok (ReDoS yok); dosya ≤ 300 KB, ≤ 20 dosya, ≤ 50 000 bildirim/dosya (aşılırsa o dosya araç/girdi hatasıdır), spec ≤ 64 KB; CSS ayrıştırıcı yinelemesizdir
// (iç içelik yalnız sayaçtır) ve süre bütçesi aşılırsa koşu timed_out olur; HTML metni a11y.ts belirteçleyicisiyle çıkarılır. Bulgu alıntıları maskelenir ve kısaltılır.
// Sözleşme kaynağı: satır içi `spec` varsayılan ve ÖNERİLEN yoldur. `specFile` çalışma ağacından okunur ve uygulayıcı tarafından değiştirilebilir (palet/tolerans/maxColors ile
// tüm denetimler geçirilebilir); bu yüzden motor, specFile görevin değişen dosyaları arasındaysa teslimi en iyi ihtimalle "unverified" yapar (bkz. engine.applyDesignGate).
// Kapsam: HTML'deki `<link rel=stylesheet>` ve CSS `@import` ile bağlanan yerel dosyalar planda listelenmemişse (ya da stil dış bir adresteyse) denetlenmeden kalır;
// bu durum her başvuru için ayrı bir araç/girdi hatası testi üretir (teslim passed olmaz).
// Taranmayan renk kaynakları: SVG fill=/stroke= öznitelikleri, bgcolor= ve <font color=> öznitelikleri, hwb()/oklch()/lab()/lch()/color-mix(), mask/filter içindeki renkler.
// Bilinen sınırlar: `var(--x)` kullanımları TAKİP EDİLMEZ (renk/aralık değeri çözülmez, yalnız `--x: #abc` tanımları taranır); color-mix()/oklch()/lab() gibi işlevler
// ve geniş adlandırılmış renk listesi dışındaki adlar tanınmaz; @media/@supports içindeki bildirimler tek düz akış olarak taranır (koşullar değerlendirilmez);
// satır içi style="" değerleri 1000 karakterde kesilir (a11y belirteçleyicisi); metin karşılaştırması varlıkları (&#108; &nbsp; &shy;), NFKD, görünmez karakterleri ve Kiril/Yunan benzeri harfleri normalleştirir, satır içi öğelerle bölünmüş metni birleştirir; yalnız küçük bir benzer-harf tablosu vardır.
import { randomUUID } from "node:crypto";
import { statSync } from "node:fs";
import { criteriaFor } from "../provider.ts";
import type { VerificationHandle, VerificationProvider } from "../provider.ts";
import type { RunResult, TestResult } from "../schema.ts";
import { parseHtml, validateCriteriaMap } from "./a11y.ts";
import { LabSpecError, boundedMs, cleanText, mkRun, mkTest, plainObject, reqString } from "./rules.ts";
import { readFileInside } from "./safe-read.ts";

export const MAX_DESIGN_FILE_BYTES = 300 * 1024;
export const MAX_DESIGN_FILES = 20;
export const MAX_DESIGN_SPEC_BYTES = 64 * 1024;
export const MAX_DECLARATIONS_PER_FILE = 50_000;
export const MAX_PALETTE = 40;
export const MAX_FONTS = 8;
export const MAX_SCALE = 40;
export const MAX_FORBIDDEN_STRINGS = 20;
const MAX_DECL_TEXT = 4000;
const MAX_FINDINGS_PER_CHECK = 50;
const MAX_FINDINGS_IN_DATA = 80;
const MAX_UNIQUE_TRACKED = 2000;
const DEFAULT_TOLERANCE = 6;
const YIELD_EVERY = 5000;
const MAX_STYLE_REF_TESTS = 20;
const TEXT_ATTRS = ["title", "alt", "placeholder", "aria-label", "aria-description", "aria-placeholder"];

export interface DesignSpec {
  palette: string[];
  paletteTolerance?: number;
  allowNeutrals?: boolean;
  fonts: string[];
  spacingScale?: number[];
  radiusScale?: number[];
  maxFontSizes?: number;
  maxColors?: number;
  maxFontFamilies?: number;
  forbidden?: { strings?: string[] };
}

// İş akışı planındaki biçim (root yok: çalışma ağacı motordan gelir). spec ile specFile'dan TAM BİRİ verilir.
export interface DesignPlan {
  files: string[];
  spec?: DesignSpec;
  specFile?: string;
  criteria?: Record<string, string[]>;
}

export interface DesignRequest extends DesignPlan {
  root: string;
  timeoutMs?: number;
}

// ---------- istek doğrulama ----------

function relPath(raw: unknown, where: string): string {
  const p = reqString(raw, where, 300);
  if (p.includes("\\") || p.startsWith("/") || p.includes(":")) throw new LabSpecError(`${where} must be a workspace-relative path with forward slashes (no drive letters or : characters)`);
  if (p.split("/").some((x) => x === "" || x === "." || x === "..")) throw new LabSpecError(`${where} must not contain empty, . or .. segments`);
  return p;
}

export function validateDesignFiles(v: unknown): string[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_DESIGN_FILES) throw new LabSpecError(`design files must list 1 to ${MAX_DESIGN_FILES} html or css files`);
  const seen = new Set<string>();
  return v.map((raw) => {
    const p = relPath(raw, "design files[]");
    const lower = p.toLowerCase();
    if (!lower.endsWith(".html") && !lower.endsWith(".htm") && !lower.endsWith(".css")) throw new LabSpecError("design files must be .html, .htm or .css files");
    if (seen.has(lower)) throw new LabSpecError("design files must not repeat a file");
    seen.add(lower);
    return p;
  });
}

function hexDigit(c: number): number {
  if (c >= 48 && c <= 57) return c - 48;
  if (c >= 97 && c <= 102) return c - 87;
  if (c >= 65 && c <= 70) return c - 55;
  return -1;
}

type RGB = [number, number, number];

// "#rgb" / "#rrggbb" (spec paleti için) → RGB; başka biçim null.
function paletteHex(s: unknown): RGB | null {
  if (typeof s !== "string" || (s.length !== 4 && s.length !== 7) || s[0] !== "#") return null;
  return hexBody(s, 1, s.length - 1);
}

// 3/4/6/8 haneli onaltılık gövde (alfa yok sayılır).
function hexBody(s: string, from: number, len: number): RGB | null {
  const d: number[] = [];
  for (let i = 0; i < len; i++) {
    const h = hexDigit(s.charCodeAt(from + i));
    if (h < 0) return null;
    d.push(h);
  }
  if (len === 3 || len === 4) return [(d[0] as number) * 17, (d[1] as number) * 17, (d[2] as number) * 17];
  return [(d[0] as number) * 16 + (d[1] as number), (d[2] as number) * 16 + (d[3] as number), (d[4] as number) * 16 + (d[5] as number)];
}

const toHex = (c: RGB): string => `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;

function numberList(v: unknown, where: string): number[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_SCALE || !v.every((x) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 10_000)) throw new LabSpecError(`${where} must list 1 to ${MAX_SCALE} numbers between 0 and 10000`);
  return v as number[];
}

function limitInt(v: unknown, where: string): number | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 1000) throw new LabSpecError(`${where} must be an integer between 1 and 1000`);
  return v;
}

export function validateDesignSpec(input: unknown): DesignSpec {
  let size = 0;
  try {
    size = JSON.stringify(input)?.length ?? 0;
  } catch {
    throw new LabSpecError("design spec must be plain JSON data");
  }
  if (size > MAX_DESIGN_SPEC_BYTES) throw new LabSpecError(`design spec is larger than ${MAX_DESIGN_SPEC_BYTES / 1024} KB`);
  const o = plainObject(input, "design spec", ["palette", "paletteTolerance", "allowNeutrals", "fonts", "spacingScale", "radiusScale", "maxFontSizes", "maxColors", "maxFontFamilies", "forbidden"]);
  if (!Array.isArray(o.palette) || o.palette.length > MAX_PALETTE) throw new LabSpecError(`design spec palette must list at most ${MAX_PALETTE} #rgb or #rrggbb colors`);
  const palette = o.palette.map((c, i) => {
    const rgb = paletteHex(c);
    if (!rgb) throw new LabSpecError(`design spec palette[${i}] must be a #rgb or #rrggbb color`);
    return toHex(rgb);
  });
  if (!Array.isArray(o.fonts) || o.fonts.length > MAX_FONTS) throw new LabSpecError(`design spec fonts must list at most ${MAX_FONTS} font family names`);
  const fonts = o.fonts.map((f, i) => reqString(f, `design spec fonts[${i}]`, 60));
  const spec: DesignSpec = { palette, fonts };
  if (o.paletteTolerance !== undefined) {
    if (typeof o.paletteTolerance !== "number" || !Number.isFinite(o.paletteTolerance) || o.paletteTolerance < 0 || o.paletteTolerance > 30) throw new LabSpecError("design spec paletteTolerance must be a number between 0 and 30");
    spec.paletteTolerance = o.paletteTolerance;
  }
  if (o.allowNeutrals !== undefined) {
    if (typeof o.allowNeutrals !== "boolean") throw new LabSpecError("design spec allowNeutrals must be a boolean");
    spec.allowNeutrals = o.allowNeutrals;
  }
  const sp = numberList(o.spacingScale, "design spec spacingScale");
  if (sp) spec.spacingScale = sp;
  const rd = numberList(o.radiusScale, "design spec radiusScale");
  if (rd) spec.radiusScale = rd;
  for (const k of ["maxFontSizes", "maxColors", "maxFontFamilies"] as const) {
    const n = limitInt(o[k], `design spec ${k}`);
    if (n !== undefined) spec[k] = n;
  }
  if (o.forbidden !== undefined) {
    const f = plainObject(o.forbidden, "design spec forbidden", ["strings"]);
    if (f.strings !== undefined) {
      if (!Array.isArray(f.strings) || f.strings.length > MAX_FORBIDDEN_STRINGS) throw new LabSpecError(`design spec forbidden.strings must list at most ${MAX_FORBIDDEN_STRINGS} strings`);
      spec.forbidden = { strings: f.strings.map((s, i) => reqString(s, `design spec forbidden.strings[${i}]`, 100)) };
    } else spec.forbidden = {};
  }
  return spec;
}

export function validateDesignPlan(input: unknown): DesignPlan {
  const o = plainObject(input, "design", ["files", "spec", "specFile", "criteria"]);
  if ((o.spec === undefined) === (o.specFile === undefined)) throw new LabSpecError("design needs exactly one of spec or specFile");
  const criteria = validateCriteriaMap(o.criteria);
  const files = validateDesignFiles(o.files);
  let specPart: Pick<DesignPlan, "spec" | "specFile">;
  if (o.spec !== undefined) specPart = { spec: validateDesignSpec(o.spec) };
  else {
    const p = relPath(o.specFile, "design specFile");
    if (!p.toLowerCase().endsWith(".json")) throw new LabSpecError("design specFile must be a .json file");
    specPart = { specFile: p };
  }
  return { files, ...specPart, ...(criteria ? { criteria } : {}) };
}

interface DesignJob extends DesignPlan {
  root: string;
  timeoutMs: number;
}

export function validateDesignRequest(input: unknown): DesignJob {
  const o = plainObject(input, "spec", ["root", "files", "spec", "specFile", "criteria", "timeoutMs"]);
  const root = reqString(o.root, "spec.root", 1000);
  try {
    if (!statSync(root).isDirectory()) throw new Error("not a directory");
  } catch {
    throw new LabSpecError("spec.root must be an existing directory");
  }
  const plan = validateDesignPlan({ files: o.files, ...(o.spec !== undefined ? { spec: o.spec } : {}), ...(o.specFile !== undefined ? { specFile: o.specFile } : {}), ...(o.criteria !== undefined ? { criteria: o.criteria } : {}) });
  return { ...plan, root, timeoutMs: boundedMs(o.timeoutMs, "spec.timeoutMs", 30_000, 10_000) };
}

// ---------- renk ayrıştırma ----------

const NAMED = new Map<string, RGB>([
  ["black", [0, 0, 0]], ["white", [255, 255, 255]], ["red", [255, 0, 0]], ["green", [0, 128, 0]], ["blue", [0, 0, 255]], ["yellow", [255, 255, 0]], ["orange", [255, 165, 0]],
  ["purple", [128, 0, 128]], ["gray", [128, 128, 128]], ["grey", [128, 128, 128]], ["silver", [192, 192, 192]], ["maroon", [128, 0, 0]], ["olive", [128, 128, 0]],
  ["lime", [0, 255, 0]], ["aqua", [0, 255, 255]], ["cyan", [0, 255, 255]], ["teal", [0, 128, 128]], ["navy", [0, 0, 128]], ["fuchsia", [255, 0, 255]], ["magenta", [255, 0, 255]],
  ["pink", [255, 192, 203]], ["brown", [165, 42, 42]], ["gold", [255, 215, 0]], ["indigo", [75, 0, 130]], ["violet", [238, 130, 238]], ["coral", [255, 127, 80]],
  ["crimson", [220, 20, 60]], ["salmon", [250, 128, 114]], ["tomato", [255, 99, 71]], ["turquoise", [64, 224, 208]], ["khaki", [240, 230, 140]], ["tan", [210, 180, 140]],
  ["beige", [245, 245, 220]], ["ivory", [255, 255, 240]], ["lavender", [230, 230, 250]], ["orchid", [218, 112, 214]], ["plum", [221, 160, 221]], ["rebeccapurple", [102, 51, 153]],
  ["darkblue", [0, 0, 139]], ["lightgray", [211, 211, 211]], ["lightgrey", [211, 211, 211]], ["darkgray", [169, 169, 169]], ["darkgrey", [169, 169, 169]],
  ["dimgray", [105, 105, 105]], ["dimgrey", [105, 105, 105]], ["whitesmoke", [245, 245, 245]], ["gainsboro", [220, 220, 220]], ["royalblue", [65, 105, 225]],
  ["dodgerblue", [30, 144, 255]], ["steelblue", [70, 130, 180]], ["skyblue", [135, 206, 235]], ["slategray", [112, 128, 144]], ["slategrey", [112, 128, 144]],
  ["darkgreen", [0, 100, 0]], ["forestgreen", [34, 139, 34]], ["limegreen", [50, 205, 50]], ["darkred", [139, 0, 0]], ["orangered", [255, 69, 0]], ["hotpink", [255, 105, 180]],
  ["deeppink", [255, 20, 147]], ["midnightblue", [25, 25, 112]], ["cornflowerblue", [100, 149, 237]],
]);
// Renk değeri olmayan (nötr) anahtar sözcükler: sayılmaz, ihlal etmez.
const NEUTRAL_KW = new Set(["transparent", "currentcolor", "inherit", "initial", "unset", "revert", "none"]);

const isIdentCh = (c: number): boolean => (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 45 || c === 95;
const isIdStart = (c: number): boolean => (c >= 97 && c <= 122) || c === 45 || c === 95;
const isWs = (c: number): boolean => c === 32 || c === 9 || c === 10 || c === 13 || c === 12;
const isDigit = (c: number): boolean => c >= 48 && c <= 57;

function hslToRgb(h: number, s: number, l: number): RGB {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.min(100, Math.max(0, s)) / 100;
  const ll = Math.min(100, Math.max(0, l)) / 100;
  const k = (n: number): number => (n + hh / 30) % 12;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number): number => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

function fnArgs(inner: string): string[] {
  const out: string[] = [];
  let start = -1;
  for (let i = 0; i <= inner.length; i++) {
    const c = i < inner.length ? inner.charCodeAt(i) : 32;
    const sep = isWs(c) || c === 44 || c === 47;
    if (sep && start >= 0) {
      out.push(inner.slice(start, i));
      start = -1;
      if (out.length >= 8) break;
    } else if (!sep && start < 0) start = i;
  }
  return out;
}

function parseColorFn(name: string, inner: string): RGB | null {
  const t = fnArgs(inner);
  if (t.length < 3) return null;
  if (name === "rgb" || name === "rgba") {
    const out: number[] = [];
    for (let k = 0; k < 3; k++) {
      const tok = t[k] as string;
      const x = tok.endsWith("%") ? Number(tok.slice(0, -1)) * 2.55 : Number(tok);
      if (!Number.isFinite(x)) return null;
      out.push(Math.min(255, Math.max(0, Math.round(x))));
    }
    return out as RGB;
  }
  const hTok = t[0] as string;
  const h = Number(hTok.endsWith("deg") ? hTok.slice(0, -3) : hTok);
  const sTok = t[1] as string;
  const lTok = t[2] as string;
  const s = Number(sTok.endsWith("%") ? sTok.slice(0, -1) : sTok);
  const l = Number(lTok.endsWith("%") ? lTok.slice(0, -1) : lTok);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  return hslToRgb(h, s, l);
}

function matchingParen(v: string, open: number): number {
  let depth = 0;
  for (let i = open; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c === 40) depth++;
    else if (c === 41 && --depth === 0) return i;
  }
  return v.length - 1;
}

// Değerdeki renkleri bulur. rgb: null = nötr anahtar sözcük (transparent, currentcolor, inherit…). url(...) içi atlanır; gradyan vb. işlevlerin içine girilir.
export function colorsIn(value: string): Array<{ rgb: RGB | null }> {
  const v = value.length > MAX_DECL_TEXT ? value.slice(0, MAX_DECL_TEXT).toLowerCase() : value.toLowerCase();
  const n = v.length;
  const out: Array<{ rgb: RGB | null }> = [];
  let i = 0;
  while (i < n && out.length < 64) {
    const c = v.charCodeAt(i);
    if (c === 35) {
      let j = i + 1;
      while (j < n && hexDigit(v.charCodeAt(j)) >= 0) j++;
      const len = j - i - 1;
      if ((len === 3 || len === 4 || len === 6 || len === 8) && !(j < n && isIdentCh(v.charCodeAt(j)))) out.push({ rgb: hexBody(v, i + 1, len) });
      i = Math.max(j, i + 1);
    } else if (isIdStart(c)) {
      let j = i + 1;
      while (j < n && isIdentCh(v.charCodeAt(j))) j++;
      const word = v.slice(i, j);
      if (v.charCodeAt(j) === 40) {
        if (word === "url" || word === "image-set" || word === "src") {
          i = matchingParen(v, j) + 1;
          continue;
        }
        if (word === "rgb" || word === "rgba" || word === "hsl" || word === "hsla") {
          const e = v.indexOf(")", j);
          if (e > 0) {
            const rgb = parseColorFn(word, v.slice(j + 1, e));
            if (rgb) out.push({ rgb });
            i = e + 1;
            continue;
          }
        }
        i = j + 1;
        continue;
      }
      const named = NAMED.get(word);
      if (named) out.push({ rgb: named });
      else if (NEUTRAL_KW.has(word)) out.push({ rgb: null });
      i = j;
    } else if (isDigit(c) || c === 46) {
      let j = i + 1;
      while (j < n && (isIdentCh(v.charCodeAt(j)) || v.charCodeAt(j) === 46)) j++;
      i = j;
    } else i++;
  }
  return out;
}

const dist = (a: RGB, b: RGB): number => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
const isNeutral = (c: RGB): boolean => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) <= 4;

// Bilinen şablon / CSS çerçevesi varsayılan renkleri (gradyan klişeleri, Bootstrap, Tailwind, Material). YALNIZ paletteTolerance içinde bir palet rengi yoksa işaretlenir.
export const TEMPLATE_COLORS: ReadonlyMap<string, string> = new Map([
  ["#667eea", "purple-blue gradient cliché"], ["#764ba2", "purple-blue gradient cliché"], ["#f093fb", "pink-purple gradient cliché"], ["#f5576c", "pink-purple gradient cliché"],
  ["#4facfe", "blue-cyan gradient cliché"], ["#00f2fe", "blue-cyan gradient cliché"], ["#6a11cb", "purple-blue gradient cliché"], ["#2575fc", "purple-blue gradient cliché"],
  ["#6366f1", "Tailwind indigo-500"], ["#8b5cf6", "Tailwind violet-500"], ["#a855f7", "Tailwind purple-500"], ["#3b82f6", "Tailwind blue-500"], ["#4f46e5", "Tailwind indigo-600"],
  ["#007bff", "Bootstrap 4 blue"], ["#0d6efd", "Bootstrap 5 blue"], ["#6c757d", "Bootstrap secondary grey"], ["#28a745", "Bootstrap 4 green"], ["#dc3545", "Bootstrap red"],
  ["#17a2b8", "Bootstrap 4 cyan"], ["#ffc107", "Bootstrap yellow"], ["#2196f3", "Material blue"], ["#1976d2", "Material blue 700"],
]);

// Şablon rengi eşleşmesi: onaltılık yazım farkı olmasın diye (hsl() yuvarlaması) en çok 2.5 RGB uzaklığı kabul edilir.
const TEMPLATE_RGB: Array<{ hex: string; note: string; rgb: RGB }> = [...TEMPLATE_COLORS].map(([hex, note]) => ({ hex, note, rgb: paletteHex(hex) as RGB }));
function templateOf(c: RGB): { hex: string; note: string } | null {
  for (const t of TEMPLATE_RGB) if (dist(c, t.rgb) <= 2.5) return t;
  return null;
}

// ---------- CSS tarayıcısı ----------

class DesignBudgetError extends Error {
  constructor() {
    super("the analysis exceeded its time budget");
    this.name = "DesignBudgetError";
  }
}

class DesignCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "DesignCancelled";
  }
}

class DesignLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DesignLimitError";
  }
}

function stripComments(s: string): string {
  let out = "";
  let i = 0;
  for (;;) {
    const a = s.indexOf("/*", i);
    if (a < 0) return out + s.slice(i);
    out += s.slice(i, a);
    const b = s.indexOf("*/", a + 2);
    if (b < 0) return out;
    i = b + 2;
  }
}

function isPropName(p: string): boolean {
  if (p.length === 0 || p.length > 64) return false;
  for (let i = 0; i < p.length; i++) if (!isIdentCh(p.charCodeAt(i))) return false;
  return true;
}

// Yinelemesiz tarama: [from,to) aralığındaki bildirimleri (prop, value) sırayla emit eder. inline=true: aralık `style=""` değeridir (süslü parantezsiz bildirim listesi).
// Yorumlar ve dizgiler atlanır; parantez içindeki `;`/`:` veridir (url(data:...;base64,...)); `{`/`}` parantez dengesizliğini sıfırlar. İç içelik yalnız sayaçtır.
function scanCss(src: string, from: number, to: number, inline: boolean, tick: () => void, problems: Set<string>, emit: (prop: string, value: string, off: number) => void, onImport?: (ref: string, off: number) => void): void {
  let i = from;
  let depth = inline ? 1 : 0;
  let segStart = from;
  let paren = 0;
  let hasComment = false;
  const finish = (end: number): void => {
    if (depth > 0 && end > segStart) {
      let seg = src.slice(segStart, Math.min(end, segStart + MAX_DECL_TEXT));
      if (hasComment) seg = stripComments(seg);
      const colon = seg.indexOf(":");
      if (colon > 0) {
        const prop = seg.slice(0, colon).trim().toLowerCase();
        if (isPropName(prop)) {
          let value = seg.slice(colon + 1).trim();
          if (value.toLowerCase().endsWith("!important")) value = value.slice(0, -10).trim();
          if (value !== "") {
            let off = segStart;
            while (off < end && isWs(src.charCodeAt(off))) off++;
            emit(prop, value, off);
          }
        }
      }
    } else if (depth === 0 && onImport && end > segStart) {
      // Üst düzey `@import`: bağlanan stil dosyası planda listeli değilse denetlenmemiş kalır; çağıran bunu raporlar.
      let seg = src.slice(segStart, Math.min(end, segStart + 600));
      if (hasComment) seg = stripComments(seg);
      seg = seg.trim();
      if (seg.length > 7 && seg.slice(0, 7).toLowerCase() === "@import") {
        const ref = importRef(seg.slice(7));
        if (ref !== null) onImport(ref, segStart);
      }
    }
    hasComment = false;
  };
  while (i < to) {
    tick();
    const c = src.charCodeAt(i);
    if (c === 47 && src.charCodeAt(i + 1) === 42) {
      hasComment = true;
      const e = src.indexOf("*/", i + 2);
      if (e < 0 || e + 2 > to) {
        problems.add("unclosed comment");
        i = to;
        break;
      }
      i = e + 2;
      continue;
    }
    if (c === 34 || c === 39) {
      let k = i + 1;
      for (;;) {
        tick();
        if (k >= to) {
          problems.add("unclosed string");
          break;
        }
        const d = src.charCodeAt(k);
        if (d === 92) {
          k += 2;
          continue;
        }
        if (d === c) {
          k++;
          break;
        }
        if (d === 10 || d === 13 || d === 12) {
          problems.add("unclosed string");
          break;
        }
        k++;
      }
      i = Math.min(k, to);
      continue;
    }
    if (c === 92) {
      i += 2;
      continue;
    }
    if (c === 40) {
      paren++;
      i++;
      continue;
    }
    if (c === 41) {
      if (paren > 0) paren--;
      i++;
      continue;
    }
    if (paren > 0 && c !== 123 && c !== 125) {
      i++;
      continue;
    }
    if (paren > 0) {
      paren = 0;
      problems.add("unbalanced parenthesis");
    }
    if (c === 123) {
      depth++;
      if (depth === 101) problems.add("blocks nested deeper than 100 levels");
      i++;
      segStart = i;
      hasComment = false;
      continue;
    }
    if (c === 125) {
      finish(i);
      if (depth > 0) depth--;
      i++;
      segStart = i;
      continue;
    }
    if (c === 59) {
      finish(i);
      i++;
      segStart = i;
      continue;
    }
    i++;
  }
  finish(Math.min(i, to));
}

// ---------- değer yardımcıları ----------

// Üst düzey ayırma (parantez ve dizgi içi bölünmez): boşluğa ya da virgüle göre.
function splitTop(v: string, comma: boolean, max = 64): string[] {
  const out: string[] = [];
  let depth = 0;
  let q = 0;
  let start = -1;
  for (let i = 0; i <= v.length; i++) {
    const c = i < v.length ? v.charCodeAt(i) : 32;
    let sep = i === v.length;
    if (!sep) {
      if (q !== 0) {
        if (c === q) q = 0;
      } else if (c === 34 || c === 39) q = c;
      else if (c === 40) depth++;
      else if (c === 41) {
        if (depth > 0) depth--;
      } else if (depth === 0 && (comma ? c === 44 : isWs(c))) sep = true;
    }
    if (sep) {
      if (start >= 0) {
        const tok = v.slice(start, i).trim();
        if (tok !== "") out.push(tok);
        start = -1;
        if (out.length >= max) break;
      }
    } else if (start < 0) start = i;
  }
  return out;
}

const GENERIC_FAMILIES = new Set(["serif", "sans-serif", "monospace", "system-ui"]);
const CSS_WIDE = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);
const SIZE_KEYWORDS = new Set(["xx-small", "x-small", "small", "medium", "large", "x-large", "xx-large", "xxx-large", "smaller", "larger"]);

function familyName(tok: string): string {
  let t = tok.trim();
  if (t.length >= 2 && (t[0] === '"' || t[0] === "'") && t[t.length - 1] === t[0]) t = t.slice(1, -1);
  return t.trim().toLowerCase();
}

function looksLikeSize(t: string): boolean {
  const l = t.toLowerCase();
  if (SIZE_KEYWORDS.has(l)) return true;
  const c = l.charCodeAt(0);
  if (!isDigit(c) && c !== 46) return false;
  for (let i = 1; i < l.length; i++) {
    const d = l.charCodeAt(i);
    if (!isDigit(d) && d !== 46) return true;
  }
  return false;
}

// `font` kısaltmasından aile listesi ve yazı boyutu: boyut belirteci (birimli sayı ya da anahtar sözcük) bulunamazsa null (basit çıkarım).
function fontShorthand(value: string): { size: string; families: string[] } | null {
  const toks = splitTop(value, false);
  const idx = toks.findIndex((t) => looksLikeSize(t));
  if (idx < 0 || idx === toks.length - 1) return null;
  const sizeTok = toks[idx] as string;
  const slash = sizeTok.indexOf("/");
  return { size: (slash > 0 ? sizeTok.slice(0, slash) : sizeTok).toLowerCase(), families: splitTop(toks.slice(idx + 1).join(" "), true) };
}

function pxOf(tok: string): number | null {
  if (tok === "0") return 0;
  if (!tok.endsWith("px")) return null;
  const body = tok.slice(0, -2);
  if (body === "" || tok.includes("(")) return null;
  const x = Number(body);
  return Number.isFinite(x) ? Math.abs(x) : null;
}

const SIDES = ["", "-top", "-right", "-bottom", "-left", "-block", "-block-start", "-block-end", "-inline", "-inline-start", "-inline-end"];
const SPACING_PROPS = new Set<string>([...SIDES.map((s) => `margin${s}`), ...SIDES.map((s) => `padding${s}`), "gap", "row-gap", "column-gap", "grid-gap", "grid-row-gap", "grid-column-gap"]);
const RADIUS_PROPS = new Set<string>(["border-radius", "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius", "border-start-start-radius", "border-start-end-radius", "border-end-start-radius", "border-end-end-radius"]);
const BORDER_SIDES = ["", "-top", "-right", "-bottom", "-left", "-block", "-block-start", "-block-end", "-inline", "-inline-start", "-inline-end"];
const COLOR_PROPS = new Set<string>([
  "color", "background", "background-color", "background-image", "fill", "stroke", "outline", "outline-color", "box-shadow", "text-shadow", "text-decoration", "text-decoration-color",
  "caret-color", "accent-color", "column-rule", "column-rule-color", "stop-color", "flood-color", "scrollbar-color", "-webkit-text-fill-color", "-webkit-text-stroke-color",
  ...BORDER_SIDES.flatMap((s) => [`border${s}`, `border${s}-color`]),
]);

// ---------- denetim tanımları ----------

interface CheckDef {
  key: string;
  title: string;
  reason: string;
}

export const DESIGN_CHECKS: readonly CheckDef[] = [
  { key: "palette-conformance", title: "colors stay within the project palette", reason: "a color that is not in the project's design contract makes the output drift from the project identity" },
  { key: "font-conformance", title: "the first font family is an allowed project font", reason: "only the fonts named in the design contract (plus generic fallbacks) may lead a font stack" },
  { key: "spacing-scale", title: "margin, padding and gap use the spacing scale", reason: "off-scale spacing values break the rhythm defined by the design contract" },
  { key: "radius-scale", title: "border radii use the radius scale", reason: "off-scale radii break the shape language defined by the design contract" },
  { key: "token-discipline", title: "share of color and spacing declarations that use custom properties (info only)", reason: "informational: design tokens keep the contract enforceable in one place" },
  { key: "variety-limits", title: "the number of distinct colors, font sizes and font families stays limited", reason: "an unbounded variety of colors, sizes or typefaces is a measurable sign of an unsystematic design" },
  { key: "anti-placeholder", title: "no placeholder or boilerplate text", reason: "placeholder wording (lorem ipsum, click here, your company…) shows that generic template content was shipped" },
  { key: "anti-template-colors", title: "no unplanned framework/template default colors", reason: "well-known framework and gradient-cliché default colors that are not in the project palette signal an unmodified template" },
  { key: "forbidden-strings", title: "the text does not contain strings the design contract forbids", reason: "the design contract lists wording that must never appear in the output" },
];

const PLACEHOLDERS = [
  "lorem ipsum", "dolor sit amet", "consectetur adipiscing", "your text here", "insert text here", "your title here", "your company", "your logo", "company name", "untitled",
  "placeholder text", "sample text", "click here", "hello world", "welcome to your", "coming soon",
];

function collapseWs(s: string): string {
  let out = "";
  let gap = false;
  for (let i = 0; i < s.length; i++) {
    if (isWs(s.charCodeAt(i))) gap = out.length > 0;
    else {
      if (gap) out += " ";
      gap = false;
      out += s[i];
    }
  }
  return out;
}

function makeLineOf(src: string): (pos: number) => number {
  const nl: number[] = [];
  for (let i = src.indexOf("\n"); i >= 0; i = src.indexOf("\n", i + 1)) nl.push(i);
  return (pos) => {
    let lo = 0;
    let hi = nl.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((nl[mid] as number) < pos) lo = mid + 1;
      else hi = mid;
    }
    return lo + 1;
  };
}

// ---------- metin normalleştirme (placeholder / yasak dize atlatmalarına karşı) ----------

const NAMED_ENT = new Map<string, string>([
  ["nbsp", " "], ["shy", ""], ["amp", "&"], ["lt", "<"], ["gt", ">"], ["quot", '"'], ["apos", "'"], ["zwj", ""], ["zwnj", ""], ["ensp", " "], ["emsp", " "], ["thinsp", " "], ["lrm", ""], ["rlm", ""],
]);

// Sayısal (&#108; &#x6c;) ve yaygın adlandırılmış varlıkları çözer; tanınmayan "&" olduğu gibi kalır. Doğrusal zamanlı.
function decodeEntities(s: string): string {
  if (!s.includes("&")) return s;
  let out = "";
  let i = 0;
  while (i < s.length) {
    const amp = s.indexOf("&", i);
    if (amp < 0) {
      out += s.slice(i);
      break;
    }
    out += s.slice(i, amp);
    const semi = s.indexOf(";", amp + 1);
    if (semi < 0 || semi - amp > 10) {
      out += "&";
      i = amp + 1;
      continue;
    }
    const body = s.slice(amp + 1, semi);
    let rep: string | undefined;
    if (body[0] === "#") {
      const hex = body[1] === "x" || body[1] === "X";
      const digits = body.slice(hex ? 2 : 1);
      let ok = digits.length > 0;
      for (let k = 0; k < digits.length && ok; k++) ok = hex ? hexDigit(digits.charCodeAt(k)) >= 0 : isDigit(digits.charCodeAt(k));
      if (ok) {
        const n = parseInt(digits, hex ? 16 : 10);
        if (n >= 1 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)) rep = String.fromCodePoint(n);
      }
    } else rep = NAMED_ENT.get(body.toLowerCase());
    if (rep === undefined) {
      out += "&";
      i = amp + 1;
    } else {
      out += rep;
      i = semi + 1;
    }
  }
  return out;
}

// Kiril / Yunan benzeri harflerin yaygın Latin eşdeğerleri (küçük harfe çevrildikten sonra).
const HOMOGLYPHS = new Map<string, string>(Object.entries({
  а: "a", с: "c", е: "e", о: "o", р: "p", х: "x", у: "y", і: "i", ј: "j", ѕ: "s", ӏ: "l", к: "k", м: "m", н: "h", т: "t", ԁ: "d", ԛ: "q", ԝ: "w",
  ο: "o", α: "a", ε: "e", ν: "v", ι: "i", κ: "k", ρ: "p", τ: "t", υ: "u", χ: "x", η: "n", ω: "w",
}));

function invisible(cp: number): boolean {
  return (
    cp === 0xad || cp === 0x180e || cp === 0xfeff || (cp >= 0x200b && cp <= 0x200f) || (cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2060 && cp <= 0x206f) || (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0x300 && cp <= 0x36f) || cp === 0x34f
  );
}

// Karşılaştırma biçimi: varlıklar çözülür, NFKD (birleşik/tam genişlik/aksanlı biçimler sadeleşir), küçük harf, görünmez/sıfır genişlikli karakterler ve birleştirici işaretler atılır,
// Kiril/Yunan benzerleri Latin'e eşlenir, boşluklar teklenir.
export function normText(raw: string): string {
  const s = decodeEntities(raw.length > 20_000 ? raw.slice(0, 20_000) : raw).normalize("NFKD").toLowerCase();
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0) as number;
    if (invisible(cp)) continue;
    if (cp < 32 && !isWs(cp)) continue;
    out += HOMOGLYPHS.get(ch) ?? ch;
  }
  return collapseWs(out);
}

// CSS dizgi kaçışları: \6c  \6C  (1-6 onaltılık hane + isteğe bağlı tek boşluk) ve \x → x.
function cssUnescape(s: string): string {
  if (!s.includes("\\")) return s;
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i] as string;
    if (c !== "\\" || i + 1 >= s.length) {
      out += c;
      i++;
      continue;
    }
    let j = i + 1;
    while (j < s.length && j < i + 7 && hexDigit(s.charCodeAt(j)) >= 0) j++;
    if (j > i + 1) {
      const n = parseInt(s.slice(i + 1, j), 16);
      if (n >= 1 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)) out += String.fromCodePoint(n);
      if (j < s.length && isWs(s.charCodeAt(j))) j++;
      i = j;
    } else {
      out += s[i + 1];
      i += 2;
    }
  }
  return out;
}

// Etiketler arası birleştirme için satır içi (inline) öğeler: aralarındaki metin düğümleri tek metin sayılır ("Lo<b>rem</b> ipsum").
const INLINE_TAGS = new Set(["a", "abbr", "b", "bdi", "bdo", "big", "cite", "code", "data", "del", "dfn", "em", "font", "i", "img", "ins", "kbd", "label", "mark", "q", "s", "samp", "small", "span", "strike", "strong", "sub", "sup", "time", "tt", "u", "var", "wbr", "br"]);

// [from,to) aralığında satır içi olmayan bir kapanış etiketi (</p>, </div>…) var mı: metin düğümleri o zaman birleştirilmez.
function closesBlock(src: string, from: number, to: number): boolean {
  let i = src.indexOf("</", from);
  while (i >= 0 && i < to) {
    let j = i + 2;
    while (j < to && isIdentCh(src.charCodeAt(j) | 32)) j++;
    if (!INLINE_TAGS.has(src.slice(i + 2, j).toLowerCase())) return true;
    i = src.indexOf("</", j);
  }
  return false;
}

// ---------- stil başvuruları (kapsam atlatma) ----------

// `@import` sonrası metinden başvuruyu çıkarır: url(x), url("x"), "x", 'x'.
function importRef(rest: string): string | null {
  const s = rest.trim();
  let inner: string;
  if (s.toLowerCase().startsWith("url(")) {
    const e = s.indexOf(")");
    inner = s.slice(4, e < 0 ? s.length : e).trim();
  } else inner = s;
  const q = inner[0];
  if (q === '"' || q === "'") {
    const e = inner.indexOf(q, 1);
    return e < 0 ? null : inner.slice(1, e);
  }
  return s.toLowerCase().startsWith("url(") && inner !== "" ? inner : null;
}

type StyleRef = { kind: "skip" } | { kind: "external" } | { kind: "local"; path: string | null };

// Başvuruyu, onu içeren dosyanın klasörüne göre çalışma ağacına göreli yola çevirir. Ağaç dışına çıkan yol path:null (listelenemez).
function resolveStyleRef(from: string, ref0: string): StyleRef {
  const flat = ref0.trim().split("\\").join("/");
  const cuts = [flat.indexOf("?"), flat.indexOf("#")].filter((x) => x >= 0);
  const ref = cuts.length > 0 ? flat.slice(0, Math.min(...cuts)) : flat;
  if (ref === "") return { kind: "skip" };
  if (ref.startsWith("//")) return { kind: "external" };
  const colon = ref.indexOf(":");
  const slash = ref.indexOf("/");
  if (colon > 0 && (slash < 0 || colon < slash)) return ref.slice(0, colon).toLowerCase() === "data" ? { kind: "skip" } : { kind: "external" };
  const segs: string[] = ref.startsWith("/") ? [] : from.split("/").slice(0, -1);
  for (const part of ref.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (segs.length === 0) return { kind: "local", path: null };
      segs.pop();
    } else segs.push(part);
  }
  return { kind: "local", path: segs.join("/") };
}

// ---------- sağlayıcı ----------

interface Slot {
  count: number;
  items: string[];
  files: Set<string>;
}

export class DesignLabProvider implements VerificationProvider<DesignRequest> {
  readonly id = "design-lab";

  // Girdi hatası burada, çalışmadan ÖNCE LabSpecError olarak fırlar.
  run(request: DesignRequest): VerificationHandle {
    const job = validateDesignRequest(request);
    const ctl = { cancelled: false };
    return {
      runId: randomUUID(),
      result: this.execute(job, ctl),
      cancel: async () => {
        ctl.cancelled = true;
      },
    };
  }

  private async execute(job: DesignJob, ctl: { cancelled: boolean }): Promise<RunResult> {
    const started = Date.now();
    const deadline = started + job.timeoutMs;
    const tests: TestResult[] = [];
    const claimed = Object.keys(job.criteria ?? {});
    // Çözümlenemeyen dosya/spec (araç/girdi hatası: infra) planın tasarım ölçütlerini "error" yapar: eşlenmiş ölçüt kanıtsız "doğrulandı" sayılmaz.
    const errTest = (suite: string, name: string, message: string, detail: string): void => {
      tests.push(mkTest(tests.length, { suite, name, outcome: "error", durationMs: 0, message, detail, criteria: claimed }));
    };
    const fileTest = (file: string, message: string): void => errTest("files", `[design] the file can be analysed: ${cleanText(file, 120)}`, message, `file: ${cleanText(file, 120)}`);

    // ---- spec ----
    let spec: DesignSpec | null = job.spec ?? null;
    if (!spec) {
      const rel = job.specFile as string;
      const read = readFileInside(job.root, rel, MAX_DESIGN_SPEC_BYTES);
      if (!read.ok) errTest("spec", "[design] the design spec can be read", read.message, `specFile: ${cleanText(rel, 120)}`);
      else {
        let json: unknown;
        let parsed = true;
        try {
          const text = read.buf.toString("utf8");
          json = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
        } catch {
          parsed = false;
          errTest("spec", "[design] the design spec can be read", "the spec file is not valid JSON", `specFile: ${cleanText(rel, 120)}`);
        }
        if (parsed) {
          try {
            spec = validateDesignSpec(json);
          } catch (e) {
            if (!(e instanceof LabSpecError)) throw e;
            errTest("spec", "[design] the design spec can be read", `the design spec was not accepted: ${e.message}`, `specFile: ${cleanText(rel, 120)}`);
          }
        }
      }
    }
    if (!spec) return mkRun(this.id, started, tests, [], { lab: "design", files: job.files.length, analysed: 0, specError: true });
    const sp = spec;

    // ---- durum ----
    const palette: RGB[] = sp.palette.map((c) => paletteHex(c) as RGB);
    const tolerance = sp.paletteTolerance ?? DEFAULT_TOLERANCE;
    const allowNeutrals = sp.allowNeutrals !== false;
    const fonts = new Set(sp.fonts.map((f) => familyName(f)));
    const maxColors = sp.maxColors ?? sp.palette.length + 8;
    const maxFontSizes = sp.maxFontSizes ?? 8;
    const maxFontFamilies = sp.maxFontFamilies ?? 3;
    const forbidden = (sp.forbidden?.strings ?? []).map((s) => normText(s)).filter((s) => s !== "");
    const per = new Map<string, Slot>();
    const data: Array<{ check: string; file: string; line: number; reason: string; excerpt: string }> = [];
    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();
    const familySet = new Set<string>();
    const problems = new Set<string>();
    const stats = { declarations: 0, customProperties: 0, tokenUse: 0, tokenHard: 0, skippedSpacing: 0, skippedRadius: 0, skippedFonts: 0 };
    let guard = 0;
    const tick = (): void => {
      if ((++guard & 1023) === 0 && Date.now() > deadline) throw new DesignBudgetError();
    };
    const note = (set: Set<string>, v: string): void => {
      if (set.size < MAX_UNIQUE_TRACKED) set.add(v);
    };
    const nearest = (c: RGB): { hex: string; d: number } => {
      let best = { hex: "", d: Infinity };
      for (const p of palette) {
        const d = dist(c, p);
        if (d < best.d) best = { hex: toHex(p), d };
      }
      return best;
    };

    let analysed = 0;
    let timedOut = false;
    let cancelled = false;
    const skipped: string[] = [];
    const styleRefs: Array<{ from: string; ref: string; line: number }> = [];
    const cancelledRun = (): RunResult => mkRun(this.id, started, tests, [], { lab: "design", files: job.files.length, analysed, cancelled: true }, "cancelled");
    const breathe = async (): Promise<void> => {
      await new Promise<void>((r) => setImmediate(r));
      if (ctl.cancelled) throw new DesignCancelled();
    };
    for (const file of job.files) {
      // Dosyalar arasında olay döngüsüne nefes aldır: tarama senkron olduğu için sunucu tek istekle donmasın.
      await new Promise<void>((r) => setImmediate(r));
      if (ctl.cancelled) return cancelledRun();
      if (timedOut || Date.now() > deadline) {
        timedOut = true;
        skipped.push(file);
        continue;
      }
      const read = readFileInside(job.root, file, MAX_DESIGN_FILE_BYTES);
      if (!read.ok) {
        fileTest(file, read.message);
        continue;
      }
      let declCount = 0;
      try {
        const raw = read.buf.toString("utf8");
        const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
        const isCss = file.toLowerCase().endsWith(".css");
        let doc: ReturnType<typeof parseHtml> | null = null;
        let lineOf: (pos: number) => number;
        if (isCss) lineOf = makeLineOf(text);
        else {
          doc = parseHtml(text, deadline, 20_000);
          lineOf = doc.lineOf;
          // Öğe sınırı aşıldıysa dosyanın kalanı çözümlenmedi: sessizce "geçti" saymak yerine araç/girdi hatası.
          if (doc.problems.some((p) => p.reason.startsWith("more than"))) throw new DesignLimitError("the html has too many elements; the rest of the file was not analysed");
        }
        const add = (check: string, line: number, reason: string, excerpt: () => string): void => {
          const slot = per.get(check) ?? { count: 0, items: [], files: new Set<string>() };
          per.set(check, slot);
          slot.count++;
          slot.files.add(file);
          if (slot.items.length < MAX_FINDINGS_PER_CHECK || data.length < MAX_FINDINGS_IN_DATA) {
            const ex = cleanText(excerpt(), 100);
            const item = `${cleanText(file, 100)}:${line} ${cleanText(reason, 160)}${ex ? ` — ${ex}` : ""}`;
            if (slot.items.length < MAX_FINDINGS_PER_CHECK) slot.items.push(item);
            if (data.length < MAX_FINDINGS_IN_DATA) data.push({ check, file: cleanText(file, 100), line, reason: cleanText(reason, 160), excerpt: ex });
          }
        };

        // Metin denetimleri (placeholder + yasak dize): karşılaştırma biçimi normText ile oluşur (varlıklar, görünmez karakterler, benzer harfler).
        const textCheck = (raw: string, line: number): boolean => {
          tick();
          const t = normText(raw);
          if (t === "") return false;
          let hit = false;
          for (const ph of PLACEHOLDERS) {
            if (t.includes(ph)) {
              add("anti-placeholder", line, `placeholder text "${ph}"`, () => raw);
              hit = true;
              break;
            }
          }
          for (const f of forbidden) {
            if (t.includes(f)) {
              add("forbidden-strings", line, `forbidden string "${cleanText(f, 60)}"`, () => raw);
              hit = true;
            }
          }
          return hit;
        };

        const handle = (prop: string, value: string, line: number): void => {
          stats.declarations++;
          tick();
          // CSS `content:` dizgileri ekranda görünen metindir.
          if (prop === "content") textCheck(cssUnescape(value), line);
          const custom = prop.startsWith("--");
          const hasVar = value.includes("var(");
          const decl = (): string => `${prop}: ${value.slice(0, 120)}`;
          if (custom) stats.customProperties++;
          if (custom || COLOR_PROPS.has(prop)) {
            let literal = false;
            for (const col of colorsIn(value)) {
              if (!col.rgb) continue;
              literal = true;
              const hex = toHex(col.rgb);
              note(colorSet, hex);
              const near = nearest(col.rgb);
              const inPalette = near.d <= tolerance + 1e-9;
              if (!inPalette && !(allowNeutrals && isNeutral(col.rgb))) {
                add("palette-conformance", line, `color ${hex} is not in the palette${near.hex ? ` (nearest ${near.hex}, distance ${near.d.toFixed(1)} > ${tolerance})` : " (the palette is empty)"}`, decl);
              }
              if (!inPalette) {
                const tpl = templateOf(col.rgb);
                if (tpl) add("anti-template-colors", line, `color ${hex} is a known template default (${tpl.hex}: ${tpl.note}) and is not in the project palette`, decl);
              }
            }
            if (!custom) {
              if (hasVar) stats.tokenUse++;
              else if (literal) stats.tokenHard++;
            }
          }
          if (prop === "font-family" || prop === "font") {
            let families: string[] | null = null;
            if (prop === "font-family") families = splitTop(value, true);
            else {
              const sh = fontShorthand(value);
              if (sh) {
                families = sh.families;
                if (!sh.size.includes("(")) note(sizeSet, sh.size);
              }
            }
            const first = families?.[0];
            if (first === undefined) stats.skippedFonts++;
            else {
              const name = familyName(first);
              if (name.includes("(") || CSS_WIDE.has(name)) stats.skippedFonts++;
              else {
                note(familySet, name);
                if (!GENERIC_FAMILIES.has(name) && !fonts.has(name)) add("font-conformance", line, `font "${cleanText(name, 40)}" leads the font stack but is not an allowed font`, decl);
              }
            }
          } else if (prop === "font-size") {
            const v = value.trim().toLowerCase();
            if (v.includes("var(") || CSS_WIDE.has(v)) stats.skippedFonts++;
            else note(sizeSet, v);
          }
          if (SPACING_PROPS.has(prop) || RADIUS_PROPS.has(prop)) {
            const spacing = SPACING_PROPS.has(prop);
            const scale = spacing ? sp.spacingScale : sp.radiusScale;
            let literal = false;
            for (const t of splitTop(value, false)) {
              const tl = t.toLowerCase();
              if (tl === "/" || tl === "auto") continue;
              const px = pxOf(tl);
              if (px === null) {
                if (spacing) stats.skippedSpacing++;
                else stats.skippedRadius++;
                continue;
              }
              literal = true;
              if (scale && !scale.some((s) => Math.abs(s - px) < 1e-9)) add(spacing ? "spacing-scale" : "radius-scale", line, `${px}px is not on the ${spacing ? "spacing" : "radius"} scale [${scale.join(", ")}]`, decl);
            }
            if (spacing) {
              if (hasVar) stats.tokenUse++;
              else if (literal) stats.tokenHard++;
            }
          }
        };

        // Bildirimler önce toplanır (sınır: dosya başına 50 000), sonra parçalar hâlinde işlenir; her 5000 bildirimde olay döngüsü serbest bırakılır ve iptal denetlenir.
        const pending: Array<{ prop: string; value: string; line: number }> = [];
        const collect = (prop: string, value: string, line: number): void => {
          if (++declCount > MAX_DECLARATIONS_PER_FILE) throw new DesignLimitError(`the file has more than ${MAX_DECLARATIONS_PER_FILE} declarations; it was not analysed`);
          pending.push({ prop, value, line });
        };
        const refs: Array<{ ref: string; line: number }> = [];
        if (isCss) scanCss(text, 0, text.length, false, tick, problems, (p, v, off) => collect(p, v, lineOf(off)), (r, off) => refs.push({ ref: r, line: lineOf(off) }));
        else {
          const d = doc as ReturnType<typeof parseHtml>;
          for (const s of d.styles) scanCss(d.src, s.from, s.to, false, tick, problems, (p, v, off) => collect(p, v, lineOf(off)), (r, off) => refs.push({ ref: r, line: lineOf(off) }));
          for (const e of d.els) {
            tick();
            const st = e.attrs.get("style");
            if (st !== undefined && st.trim() !== "") scanCss(st, 0, st.length, true, tick, problems, (p, v) => collect(p, v, e.line));
            if (e.tag === "link" && e.attrs.has("href") && (e.attrs.get("rel") ?? "").toLowerCase().split(" ").includes("stylesheet")) refs.push({ ref: e.attrs.get("href") as string, line: e.line });
          }
        }
        let sinceYield = 0;
        for (const p of pending) {
          handle(p.prop, p.value, p.line);
          if (++sinceYield % YIELD_EVERY === 0) await breathe();
        }
        if (!isCss) {
          const d = doc as ReturnType<typeof parseHtml>;
          // Metin: ardışık metin düğümleri, aralarında yalnız satır içi öğe varsa birleştirilir ("Lo<b>rem</b> ipsum"); hem bitişik hem boşlukla birleştirilmiş biçim aranır.
          let ei = 0;
          let group: string[] = [];
          let groupLine = 1;
          let groupLen = 0;
          const flush = (): void => {
            if (group.length === 0) return;
            if (!textCheck(group.join(""), groupLine) && group.length > 1) textCheck(group.join(" "), groupLine);
            group = [];
            groupLen = 0;
          };
          for (let k = 0; k < d.parts.length; k++) {
            const pos = d.partPos[k] as number;
            if (k > 0) {
              const prev = d.partPos[k - 1] as number;
              while (ei < d.els.length && (d.els[ei] as { pos: number }).pos < prev) ei++;
              let boundary = false;
              let j = ei;
              while (j < d.els.length && (d.els[j] as { pos: number }).pos < pos) {
                if (!INLINE_TAGS.has((d.els[j] as { tag: string }).tag)) boundary = true;
                j++;
              }
              ei = j;
              if (boundary || groupLen > 20_000 || closesBlock(d.src, prev, pos)) flush();
            }
            if (group.length === 0) groupLine = lineOf(pos);
            const part = d.parts[k] as string;
            group.push(part);
            groupLen += part.length;
            if (k % YIELD_EVERY === YIELD_EVERY - 1) await breathe();
          }
          flush();
          // Görünen/erişilebilir öznitelikler.
          for (const e of d.els) {
            for (const name of TEXT_ATTRS) {
              const v = e.attrs.get(name);
              if (v === undefined || (name === "alt" && e.tag === "img")) continue;
              textCheck(v, e.line);
            }
          }
          if (d.problems.length > 0) problems.add("html parsing problems");
        }
        for (const r of refs) styleRefs.push({ from: file, ref: r.ref, line: r.line });
        analysed++;
      } catch (e) {
        if (e instanceof DesignCancelled) {
          cancelled = true;
          break;
        }
        if (e instanceof DesignLimitError) fileTest(file, e.message);
        else if (e instanceof DesignBudgetError || (e instanceof Error && e.name === "A11yBudgetError")) {
          timedOut = true;
          fileTest(file, "the analysis exceeded its time budget");
        } else fileTest(file, "the file could not be analysed");
      }
    }
    if (cancelled) return cancelledRun();

    // Planda listelenmemiş (ya da dış) stil başvuruları denetlenmeden kalır: ürün hatası DEĞİL, "doğrulanmadı" (araç/girdi hatası): teslim passed olmaz.
    const listed = new Set(job.files.map((f) => f.toLowerCase()));
    const seenRefs = new Set<string>();
    let refTests = 0;
    for (const r of styleRefs) {
      const res = resolveStyleRef(r.from, r.ref);
      if (res.kind === "skip") continue;
      if (res.kind === "local" && res.path !== null && listed.has(res.path.toLowerCase())) continue;
      const key = `${r.from}\n${r.ref}`;
      if (seenRefs.has(key)) continue;
      seenRefs.add(key);
      if (++refTests > MAX_STYLE_REF_TESTS) break;
      const where = `${cleanText(r.from, 100)}:${r.line}`;
      const refText = cleanText(r.ref, 100);
      errTest("styles", `[design] the linked stylesheet is covered: ${refText}`, res.kind === "external" ? `the external stylesheet ${refText} cannot be checked` : `the stylesheet ${refText} is linked but not listed in the design files; it was not checked`, `from: ${where}`);
    }
    if (refTests > MAX_STYLE_REF_TESTS) errTest("styles", "[design] the linked stylesheets are covered", `more than ${MAX_STYLE_REF_TESTS} linked stylesheets are not covered by the listed files`, "list them in the design files");

    // Hiç dosya çözümlenemediyse denetimler boşuna "geçmiş" sayılmaz: yalnız hata testleri kalır.
    const tokenTotal = stats.tokenUse + stats.tokenHard;
    const tokenRatio = tokenTotal === 0 ? null : Math.round((stats.tokenUse / tokenTotal) * 1000) / 1000;
    if (analysed > 0) {
      for (const c of DESIGN_CHECKS) {
        const slot = per.get(c.key);
        let skipNote = "";
        if (c.key === "spacing-scale" && !sp.spacingScale) skipNote = "no spacingScale in the spec";
        else if (c.key === "radius-scale" && !sp.radiusScale) skipNote = "no radiusScale in the spec";
        else if (c.key === "forbidden-strings" && forbidden.length === 0) skipNote = "the spec lists no forbidden strings";
        else if (c.key === "token-discipline" && stats.customProperties === 0) skipNote = "no custom properties are defined";
        const name = `[design] ${c.key}: ${c.title}${skipNote ? ` (skipped: ${skipNote})` : ""}`;
        const crit = criteriaFor(name, job.criteria);
        let test: TestResult;
        if (skipNote) test = mkTest(tests.length, { suite: "design", name, outcome: "skipped", durationMs: 0, criteria: crit });
        else if (c.key === "variety-limits") {
          const over: string[] = [];
          if (colorSet.size > maxColors) over.push(`${colorSet.size} distinct colors > ${maxColors}`);
          if (sizeSet.size > maxFontSizes) over.push(`${sizeSet.size} distinct font sizes > ${maxFontSizes}`);
          if (familySet.size > maxFontFamilies) over.push(`${familySet.size} distinct font families > ${maxFontFamilies}`);
          test = over.length > 0 ? mkTest(tests.length, { suite: "design", name, outcome: "failed", durationMs: 0, message: `${over.join("; ")}: ${c.reason}`, detail: over.join("; "), criteria: crit }) : mkTest(tests.length, { suite: "design", name, outcome: "passed", durationMs: 0, criteria: crit });
        } else if (slot) test = mkTest(tests.length, { suite: "design", name, outcome: "failed", durationMs: 0, message: `${slot.count} violation(s) in ${slot.files.size} file(s): ${c.reason}`, detail: slot.items.slice(0, 5).join("; "), criteria: crit });
        else test = mkTest(tests.length, { suite: "design", name, outcome: "passed", durationMs: 0, criteria: crit });
        tests.push({ ...test, id: `design-${c.key}` });
      }
    }
    let findingsTotal = 0;
    for (const s of per.values()) findingsTotal += s.count;
    return mkRun(
      this.id,
      started,
      tests,
      [],
      {
        lab: "design",
        files: job.files.length,
        analysed,
        skippedFiles: skipped.length,
        declarations: stats.declarations,
        findingsTotal,
        findings: data,
        distinct: { colors: colorSet.size, fontSizes: sizeSet.size, fontFamilies: familySet.size },
        customPropertyUsage: { customProperties: stats.customProperties, usingCustomProperties: stats.tokenUse, hardcoded: stats.tokenHard, ratio: tokenRatio },
        skippedDynamic: { spacing: stats.skippedSpacing, radius: stats.skippedRadius, fonts: stats.skippedFonts },
        parseNotes: [...problems].slice(0, 10),
      },
      timedOut ? "timed_out" : undefined,
    );
  }
}
