// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Doğrulama laboratuvarı madde 27: erişilebilirlik laboratuvarı ("a11y-lab"). Çalışma ağacındaki STATİK HTML dosyalarını bağımlılıksız, sınırlı ve
// güvenli bir belirteçleyiciyle (tokenizer) tarar; tarayıcı/kod ÇALIŞTIRMAZ. Her WCAG denetimi ayrı bir TestResult'tır (id: wcag-<başarı ölçütü>-<anahtar>).
// Güvenlik: regex yok (ReDoS yok); dosya ≤ 300 KB, ≤ 20 dosya, ≤ 20 000 öğe, iç içelik ≤ 200, öğe başına ≤ 64 öznitelik, değerler ≤ 1000 karakter;
// <script>/<style> içeriği yok sayılır; yinelemesiz (iteratif) ayrıştırma; süre bütçesi aşılırsa koşu timed_out olur. Bulgu alıntıları maskelenir ve kısaltılır.
// Bilinen sınırlar: renkler HTML/CSS'ten ÇIKARILMAZ (kontrast yalnız açıkça verilen çiftler için); &nbsp; gibi varlıklar yalnız boşluk sayılmaz (metin sayılır);
// "/>" her öğe için kendini kapatır; CSS ile gizleme (display:none) değerlendirilmez.
import { randomUUID } from "node:crypto";
import { statSync } from "node:fs";
import { criteriaFor } from "../provider.ts";
import type { VerificationHandle, VerificationProvider } from "../provider.ts";
import type { RunResult, TestResult } from "../schema.ts";
import { CRITERION_ID, LabSpecError, boundedMs, cleanText, mkRun, mkTest, plainObject, reqString } from "./rules.ts";
import { readFileInside } from "./safe-read.ts";

export const MAX_A11Y_FILE_BYTES = 300 * 1024;
export const MAX_A11Y_FILES = 20;
export const MAX_CONTRAST_PAIRS = 50;
export const MAX_ELEMENTS = 20_000;
export const MAX_NESTING = 200;
const MAX_ATTRS = 64;
const ATTR_VALUE_MAX = 1000;
const MAX_FINDINGS_PER_CHECK = 50;
const MAX_FINDINGS_IN_DATA = 80;

export interface ContrastPair {
  name: string;
  fg: string;
  bg: string;
  large?: boolean;
}

// İş akışı planındaki biçim (root yok: çalışma ağacı motordan gelir).
export interface A11yPlan {
  files: string[];
  contrastPairs: ContrastPair[];
  criteria?: Record<string, string[]>;
}

export interface A11yRequest {
  root: string;
  files: string[];
  contrastPairs?: ContrastPair[];
  criteria?: Record<string, string[]>;
  timeoutMs?: number;
}

// ---------- istek doğrulama ----------

export function validateA11yFiles(v: unknown): string[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_A11Y_FILES) throw new LabSpecError(`a11y files must list 1 to ${MAX_A11Y_FILES} html files`);
  const seen = new Set<string>();
  return v.map((raw) => {
    const p = reqString(raw, "a11y files[]", 300);
    if (p.includes("\\") || p.startsWith("/") || p.includes(":")) throw new LabSpecError("a11y files must be workspace-relative paths with forward slashes (no drive letters or : characters)");
    if (p.split("/").some((x) => x === "" || x === "." || x === "..")) throw new LabSpecError("a11y files must not contain empty, . or .. segments");
    const lower = p.toLowerCase();
    if (!lower.endsWith(".html") && !lower.endsWith(".htm")) throw new LabSpecError("a11y files must be .html or .htm files");
    if (seen.has(lower)) throw new LabSpecError("a11y files must not repeat a file");
    seen.add(lower);
    return p;
  });
}

const HEX = "0123456789abcdefABCDEF";
function isHexColor(s: unknown): s is string {
  if (typeof s !== "string" || s.length !== 7 || s[0] !== "#") return false;
  for (let i = 1; i < 7; i++) if (!HEX.includes(s[i] as string)) return false;
  return true;
}

export function validateContrastPairs(v: unknown): ContrastPair[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > MAX_CONTRAST_PAIRS) throw new LabSpecError(`contrastPairs must list at most ${MAX_CONTRAST_PAIRS} pairs`);
  return v.map((raw, i) => {
    const o = plainObject(raw, `contrastPairs[${i}]`, ["name", "fg", "bg", "large"]);
    if (!isHexColor(o.fg) || !isHexColor(o.bg)) throw new LabSpecError(`contrastPairs[${i}]: fg and bg must be #rrggbb colors`);
    if (o.large !== undefined && typeof o.large !== "boolean") throw new LabSpecError(`contrastPairs[${i}].large must be a boolean`);
    return { name: reqString(o.name, `contrastPairs[${i}].name`, 80), fg: o.fg.toLowerCase(), bg: o.bg.toLowerCase(), ...(o.large === true ? { large: true } : {}) };
  });
}

export function validateCriteriaMap(v: unknown): Record<string, string[]> | undefined {
  if (v === undefined) return undefined;
  const c = plainObject(v, "criteria", Object.keys(v !== null && typeof v === "object" ? (v as object) : {}));
  const entries = Object.entries(c);
  if (entries.length > 50) throw new LabSpecError("criteria lists at most 50 ids");
  const out: Record<string, string[]> = {};
  for (const [id, needles] of entries) {
    if (!CRITERION_ID.test(id) || id === "__proto__") throw new LabSpecError("criteria: bad criterion id");
    if (!Array.isArray(needles) || needles.length > 20 || !needles.every((n) => typeof n === "string" && n.length <= 200)) throw new LabSpecError("criteria: each id maps to a list of at most 20 name fragments");
    out[id] = needles as string[];
  }
  return out;
}

export function validateA11yPlan(input: unknown): A11yPlan {
  const o = plainObject(input, "a11y", ["files", "contrastPairs", "criteria"]);
  const criteria = validateCriteriaMap(o.criteria);
  return { files: validateA11yFiles(o.files), contrastPairs: validateContrastPairs(o.contrastPairs), ...(criteria ? { criteria } : {}) };
}

interface A11yJob extends A11yPlan {
  root: string;
  timeoutMs: number;
}

export function validateA11yRequest(input: unknown): A11yJob {
  const o = plainObject(input, "spec", ["root", "files", "contrastPairs", "criteria", "timeoutMs"]);
  const root = reqString(o.root, "spec.root", 1000);
  try {
    if (!statSync(root).isDirectory()) throw new Error("not a directory");
  } catch {
    throw new LabSpecError("spec.root must be an existing directory");
  }
  const plan = validateA11yPlan({ files: o.files, ...(o.contrastPairs !== undefined ? { contrastPairs: o.contrastPairs } : {}), ...(o.criteria !== undefined ? { criteria: o.criteria } : {}) });
  return { ...plan, root, timeoutMs: boundedMs(o.timeoutMs, "spec.timeoutMs", 30_000, 10_000) };
}

// ---------- kontrast (WCAG 1.4.3) ----------

function channel(c8: number): number {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  return 0.2126 * channel(parseInt(hex.slice(1, 3), 16)) + 0.7152 * channel(parseInt(hex.slice(3, 5), 16)) + 0.0722 * channel(parseInt(hex.slice(5, 7), 16));
}

// WCAG 2.x göreli parlaklık oranı (1..21). Girdi doğrulanmış #rrggbb olmalıdır.
export function contrastRatio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export const CONTRAST_NORMAL = 4.5;
export const CONTRAST_LARGE = 3.0;

// ---------- HTML belirteçleyici ----------

interface El {
  tag: string;
  attrs: Map<string, string>;
  pos: number;
  end: number;
  line: number;
  parent: number;
  last: number;
  tStart: number;
  tEnd: number;
  hiddenBy: number;
}

export interface Doc {
  src: string;
  els: El[];
  problems: Array<{ pos: number; reason: string }>;
  lineOf: (pos: number) => number;
  // Metin düğümleri (parts) ve konumları (partPos, dosyadaki ilk boşluk olmayan karakter); <style> ham metin aralıkları (design-lab için; a11y denetimleri kullanmaz).
  parts: string[];
  partPos: number[];
  styles: Array<{ from: number; to: number }>;
}

class A11yBudgetError extends Error {
  constructor() {
    super("the analysis exceeded its time budget");
    this.name = "A11yBudgetError";
  }
}

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW_TEXT = new Set(["script", "style"]);
const RCDATA = new Set(["textarea", "title"]);
const AUTOCLOSE = new Map<string, string[]>([
  ["li", ["li"]],
  ["p", ["p"]],
  ["option", ["option"]],
  ["dt", ["dt", "dd"]],
  ["dd", ["dt", "dd"]],
  ["tr", ["tr", "td", "th"]],
  ["td", ["td", "th"]],
  ["th", ["td", "th"]],
]);

const isWs = (c: number): boolean => c === 32 || c === 9 || c === 10 || c === 13 || c === 12;
const isAlpha = (c: number): boolean => (c | 32) >= 97 && (c | 32) <= 122;

// textMax: bir metin düğümünden saklanan en çok karakter (a11y varsayılanı 300; design-lab tüm metni arar).
export function parseHtml(src: string, deadline: number, textMax = 300): Doc {
  const nl: number[] = [];
  for (let i = src.indexOf("\n"); i >= 0; i = src.indexOf("\n", i + 1)) nl.push(i);
  const lineOf = (pos: number): number => {
    let lo = 0;
    let hi = nl.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((nl[mid] as number) < pos) lo = mid + 1;
      else hi = mid;
    }
    return lo + 1;
  };
  const els: El[] = [];
  const parts: string[] = [];
  const partPos: number[] = [];
  const styles: Array<{ from: number; to: number }> = [];
  const problems: Doc["problems"] = [];
  const stack: number[] = [];
  const n = src.length;
  let guard = 0;
  let tooDeepReported = false;
  const tick = (): void => {
    if ((++guard & 1023) === 0 && Date.now() > deadline) throw new A11yBudgetError();
  };
  const addText = (from: number, to: number): void => {
    for (let k = from; k < to; k++) {
      if (!isWs(src.charCodeAt(k))) {
        parts.push(src.slice(from, Math.min(to, from + textMax)));
        partPos.push(k);
        return;
      }
    }
  };
  const closeTop = (): void => {
    const idx = stack.pop() as number;
    const e = els[idx] as El;
    e.last = els.length - 1;
    e.tEnd = parts.length;
  };
  // Ham metin öğelerinin (script/style/title/textarea) kapanış etiketini bulur: büyük/küçük harf duyarsız, doğrusal zamanlı.
  const findClose = (name: string, from: number): { start: number; after: number } => {
    let k = from;
    for (;;) {
      tick();
      k = src.indexOf("</", k);
      if (k < 0) return { start: n, after: n };
      if (src.slice(k + 2, k + 2 + name.length).toLowerCase() === name) {
        const c = k + 2 + name.length < n ? src.charCodeAt(k + 2 + name.length) : 62;
        if (isWs(c) || c === 62 || c === 47) {
          const e = src.indexOf(">", k);
          return { start: k, after: e < 0 ? n : e + 1 };
        }
      }
      k += 2;
    }
  };

  let i = 0;
  scan: while (i < n) {
    tick();
    const lt = src.indexOf("<", i);
    if (lt < 0) {
      addText(i, n);
      break;
    }
    if (lt > i) addText(i, lt);
    const c1 = lt + 1 < n ? src.charCodeAt(lt + 1) : 0;
    if (c1 === 33 && src.startsWith("<!--", lt)) {
      // HTML ayrıştırma kuralı: `<!-->` ve `<!--->` hemen kapanır; aksi hâlde `-->` ya da `--!>` kapatır (tarayıcı gibi; yoksa yorum içine gizlenen öğeler denetimden kaçardı).
      if (src.startsWith("<!-->", lt)) {
        i = lt + 5;
        continue;
      }
      if (src.startsWith("<!--->", lt)) {
        i = lt + 6;
        continue;
      }
      const e1 = src.indexOf("-->", lt + 4);
      const e2 = src.indexOf("--!>", lt + 4);
      const e = e1 < 0 ? e2 : e2 < 0 ? e1 : Math.min(e1, e2);
      i = e < 0 ? n : e + (src.startsWith("--!>", e) ? 4 : 3);
      continue;
    }
    if (c1 === 33 || c1 === 63) {
      const e = src.indexOf(">", lt + 2);
      i = e < 0 ? n : e + 1;
      continue;
    }
    if (c1 === 47) {
      if (!isAlpha(lt + 2 < n ? src.charCodeAt(lt + 2) : 0)) {
        const e = src.indexOf(">", lt + 2);
        i = e < 0 ? n : e + 1;
        continue;
      }
      let j = lt + 2;
      while (j < n) {
        const d = src.charCodeAt(j);
        if (isWs(d) || d === 62 || d === 47) break;
        j++;
      }
      const name = src.slice(lt + 2, Math.min(j, lt + 42)).toLowerCase();
      const e = src.indexOf(">", j);
      i = e < 0 ? n : e + 1;
      for (let k = stack.length - 1; k >= 0; k--) {
        if ((els[stack[k] as number] as El).tag === name) {
          while (stack.length > k) closeTop();
          break;
        }
      }
      continue;
    }
    if (!isAlpha(c1)) {
      i = lt + 1;
      continue;
    }
    // başlangıç etiketi
    let j = lt + 1;
    while (j < n) {
      const d = src.charCodeAt(j);
      if (isWs(d) || d === 62 || d === 47) break;
      j++;
    }
    const tag = src.slice(lt + 1, Math.min(j, lt + 41)).toLowerCase();
    const attrs = new Map<string, string>();
    let selfClose = false;
    for (;;) {
      tick();
      while (j < n && isWs(src.charCodeAt(j))) j++;
      if (j >= n) break;
      const c = src.charCodeAt(j);
      if (c === 62) {
        j++;
        break;
      }
      if (c === 47) {
        if (src.charCodeAt(j + 1) === 62) {
          selfClose = true;
          j += 2;
          break;
        }
        j++;
        continue;
      }
      const ns = j;
      while (j < n) {
        const d = src.charCodeAt(j);
        if (isWs(d) || d === 61 || d === 62 || d === 47) break;
        j++;
      }
      if (j === ns) {
        j++;
        continue;
      }
      const aname = src.slice(ns, Math.min(j, ns + 60)).toLowerCase();
      while (j < n && isWs(src.charCodeAt(j))) j++;
      let value = "";
      if (src.charCodeAt(j) === 61) {
        j++;
        while (j < n && isWs(src.charCodeAt(j))) j++;
        const q = src.charCodeAt(j);
        if (q === 34 || q === 39) {
          const e = src.indexOf(String.fromCharCode(q), j + 1);
          if (e < 0) {
            problems.push({ pos: lt, reason: "unclosed attribute quote; the rest of the file is part of this tag" });
            value = src.slice(j + 1, j + 1 + ATTR_VALUE_MAX);
            j = n;
          } else {
            value = src.slice(j + 1, Math.min(e, j + 1 + ATTR_VALUE_MAX));
            j = e + 1;
          }
        } else {
          const vs = j;
          while (j < n && !isWs(src.charCodeAt(j)) && src.charCodeAt(j) !== 62) j++;
          value = src.slice(vs, Math.min(j, vs + ATTR_VALUE_MAX));
        }
      }
      if (attrs.size < MAX_ATTRS && !attrs.has(aname)) attrs.set(aname, value);
    }

    if (RAW_TEXT.has(tag) && !selfClose) {
      // <script>/<style> içeriği yok sayılır: içindeki sahte etiketler öğe oluşturmaz.
      const cl = findClose(tag, j);
      if (tag === "style" && styles.length < 200) styles.push({ from: j, to: cl.start });
      i = cl.after;
      continue;
    }
    const ac = AUTOCLOSE.get(tag);
    if (ac && stack.length > 0 && ac.includes((els[stack[stack.length - 1] as number] as El).tag)) closeTop();
    if (els.length >= MAX_ELEMENTS) {
      problems.push({ pos: lt, reason: `more than ${MAX_ELEMENTS} elements; the rest of the file was not analysed` });
      break scan;
    }
    const parent = stack.length > 0 ? (stack[stack.length - 1] as number) : -1;
    const pe = parent >= 0 ? (els[parent] as El) : undefined;
    const idx = els.length;
    const el: El = {
      tag,
      attrs,
      pos: lt,
      end: Math.min(j, n),
      line: lineOf(lt),
      parent,
      last: idx,
      tStart: parts.length,
      tEnd: parts.length,
      hiddenBy: pe ? (isAriaHidden(pe) ? parent : pe.hiddenBy) : -1,
    };
    els.push(el);
    if (tag === "img") {
      const alt = attrs.get("alt");
      if (alt !== undefined && alt.trim() !== "") {
        parts.push(alt.slice(0, 300));
        partPos.push(lt);
      }
      el.tEnd = parts.length;
    }
    if (RCDATA.has(tag) && !selfClose) {
      const close = findClose(tag, j);
      addText(j, close.start);
      el.tEnd = parts.length;
      el.last = idx;
      i = close.after;
      continue;
    }
    i = Math.min(j, n);
    if (VOID.has(tag) || selfClose) continue;
    if (stack.length >= MAX_NESTING) {
      if (!tooDeepReported) {
        tooDeepReported = true;
        problems.push({ pos: lt, reason: `elements are nested deeper than ${MAX_NESTING} levels; deeper elements were treated as flat` });
      }
      continue;
    }
    stack.push(idx);
  }
  while (stack.length > 0) closeTop();
  return { src, els, problems, lineOf, parts, partPos, styles };
}

function isAriaHidden(e: El): boolean {
  return (e.attrs.get("aria-hidden") ?? "").trim().toLowerCase() === "true";
}

// ---------- denetimler ----------

interface CheckDef {
  key: string;
  refs: string[];
  title: string;
}

export const A11Y_CHECKS: readonly CheckDef[] = [
  { key: "lang", refs: ["3.1.1"], title: "the page declares its language (lang on <html>)" },
  { key: "title", refs: ["2.4.2"], title: "the page has a non-empty <title>" },
  { key: "img-alt", refs: ["1.1.1"], title: "images have a text alternative (alt)" },
  { key: "form-labels", refs: ["1.3.1", "4.1.2"], title: "form controls have a label" },
  { key: "button-names", refs: ["4.1.2"], title: "buttons have an accessible name" },
  { key: "link-names", refs: ["2.4.4"], title: "links have an accessible name" },
  { key: "heading-order", refs: ["1.3.1"], title: "heading levels do not skip" },
  { key: "single-h1", refs: ["1.3.1"], title: "the page has exactly one <h1>" },
  { key: "tabindex", refs: ["2.4.3"], title: "no tabindex greater than 0" },
  { key: "duplicate-id", refs: ["4.1.1"], title: "ids are unique" },
  { key: "parsing", refs: ["4.1.1"], title: "the markup can be parsed completely" },
  { key: "aria-roles", refs: ["4.1.2"], title: "ARIA roles are valid" },
  { key: "aria-refs", refs: ["4.1.2"], title: "aria-labelledby/aria-describedby targets exist" },
  { key: "aria-hidden-focus", refs: ["4.1.2"], title: "aria-hidden does not hide focusable elements" },
  { key: "anchor-href", refs: ["2.1.1"], title: "links that act like buttons have an href" },
  { key: "table-headers", refs: ["1.3.1"], title: "data tables have header cells (th)" },
  { key: "viewport", refs: ["1.4.4"], title: "the viewport allows zoom" },
];

const ROLES = new Set(
  (
    "alert alertdialog application article banner blockquote button caption cell checkbox code columnheader combobox complementary contentinfo definition deletion dialog directory document emphasis feed figure form generic grid gridcell group heading img insertion link list listbox listitem log main marquee math menu menubar menuitem menuitemcheckbox menuitemradio meter navigation none note option paragraph presentation progressbar radio radiogroup region row rowgroup rowheader scrollbar search searchbox separator slider spinbutton status strong subscript superscript switch tab table tablist tabpanel term textbox time timer toolbar tooltip tree treegrid treeitem " +
    "doc-abstract doc-acknowledgments doc-afterword doc-appendix doc-backlink doc-biblioentry doc-bibliography doc-biblioref doc-chapter doc-colophon doc-conclusion doc-cover doc-credit doc-credits doc-dedication doc-endnote doc-endnotes doc-epigraph doc-epilogue doc-errata doc-example doc-footnote doc-foreword doc-glossary doc-glossref doc-index doc-introduction doc-noteref doc-notice doc-pagebreak doc-pagelist doc-part doc-preface doc-prologue doc-pullquote doc-qna doc-subtitle doc-tip doc-toc graphics-document graphics-object graphics-symbol"
  ).split(" "),
);

// Bulgu konumu: öğe ya da (ayrıştırma sorunları için) yalnız satır/konum; null = sayfa düzeyi (satır 1, alıntı yok).
interface At {
  line: number;
  pos: number;
  end: number;
}
type Add = (check: string, at: At | null, reason: string) => void;

const nonEmpty = (v: string | undefined): boolean => v !== undefined && v.trim() !== "";

// Boşlukla ayırma: regex'siz, doğrusal.
function tokens(v: string): string[] {
  const out: string[] = [];
  let start = -1;
  for (let i = 0; i <= v.length; i++) {
    const space = i === v.length || isWs(v.charCodeAt(i));
    if (space && start >= 0) {
      out.push(v.slice(start, i));
      start = -1;
    } else if (!space && start < 0) start = i;
    if (out.length >= 100) break;
  }
  return out;
}

function intAttr(v: string | undefined): number | null {
  if (v === undefined) return null;
  const t = v.trim();
  if (t === "") return null;
  const x = Number(t);
  return Number.isInteger(x) ? x : null;
}

function validLang(v: string): boolean {
  const t = v.trim();
  if (t.length < 2 || t.length > 35) return false;
  const parts = t.split("-");
  const first = parts[0] as string;
  if (first !== "x" && first !== "i" && !(first.length >= 2 && first.length <= 8 && [...first].every((ch) => isAlpha(ch.charCodeAt(0))))) return false;
  return parts.every((p) => p.length >= 1 && p.length <= 8 && [...p].every((ch) => isAlpha(ch.charCodeAt(0)) || (ch >= "0" && ch <= "9")));
}

function inSvg(els: El[], e: El): boolean {
  let p = e.parent;
  for (let g = 0; p >= 0 && g <= MAX_NESTING + 2; g++) {
    if ((els[p] as El).tag === "svg") return true;
    p = (els[p] as El).parent;
  }
  return false;
}

function enclosing(els: El[], e: El, tag: string): El | null {
  let p = e.parent;
  for (let g = 0; p >= 0 && g <= MAX_NESTING + 2; g++) {
    if ((els[p] as El).tag === tag) return els[p] as El;
    p = (els[p] as El).parent;
  }
  return null;
}

function focusable(e: El): boolean {
  const tab = intAttr(e.attrs.get("tabindex"));
  if (tab !== null && tab < 0) return false;
  const t = e.tag;
  if ((t === "button" || t === "input" || t === "select" || t === "textarea") && e.attrs.has("disabled")) return false;
  if ((t === "a" || t === "area") && e.attrs.has("href")) return true;
  if (t === "button" || t === "select" || t === "textarea" || t === "summary") return true;
  if (t === "input") return (e.attrs.get("type") ?? "text").trim().toLowerCase() !== "hidden";
  if ((t === "audio" || t === "video") && e.attrs.has("controls")) return true;
  if (tab !== null && tab >= 0) return true;
  const ce = e.attrs.get("contenteditable");
  return ce !== undefined && (ce.trim() === "" || ce.trim().toLowerCase() === "true");
}

function analyzeDoc(doc: Doc, add: Add): void {
  const { els } = doc;
  const ids = new Map<string, number>();
  const labelFor = new Map<string, El>();
  for (const [i, e] of els.entries()) {
    const id = e.attrs.get("id");
    if (id !== undefined && id.trim() !== "") {
      const k = id.trim();
      if (ids.has(k)) add("duplicate-id", e, `duplicate id "${cleanText(k, 40)}" (first used at line ${(els[ids.get(k) as number] as El).line})`);
      else ids.set(k, i);
    }
    if (e.tag === "label") {
      const f = e.attrs.get("for");
      if (f !== undefined && f.trim() !== "" && !labelFor.has(f.trim())) labelFor.set(f.trim(), e);
    }
  }
  const hasText = (e: El): boolean => e.tEnd > e.tStart;
  const idHasName = (token: string): boolean => {
    const k = ids.get(token);
    if (k === undefined) return false;
    const t = els[k] as El;
    return hasText(t) || nonEmpty(t.attrs.get("aria-label"));
  };
  const hasName = (e: El, index: number): boolean => {
    if (nonEmpty(e.attrs.get("aria-label"))) return true;
    const lb = e.attrs.get("aria-labelledby");
    if (nonEmpty(lb)) return tokens(lb as string).some(idHasName);
    if (hasText(e)) return true;
    if (nonEmpty(e.attrs.get("title"))) return true;
    for (let k = index + 1; k <= e.last; k++) if (nonEmpty((els[k] as El).attrs.get("aria-label"))) return true;
    return false;
  };

  // sayfa düzeyi
  const html = els.find((e) => e.tag === "html");
  if (!html) add("lang", null, "there is no <html> element, so no language is declared");
  else {
    const lang = html.attrs.get("lang") ?? html.attrs.get("xml:lang");
    if (!nonEmpty(lang)) add("lang", html, "<html> has no lang attribute");
    else if (!validLang(lang as string)) add("lang", html, `lang "${cleanText(lang, 40)}" is not a valid language tag`);
  }
  const titles = els.filter((e) => e.tag === "title" && !inSvg(els, e));
  if (titles.length === 0) add("title", null, "there is no <title> element");
  else if (!titles.some(hasText)) add("title", titles[0] as El, "the <title> is empty");

  let h1Count = 0;
  let prevLevel = 0;
  for (const [i, e] of els.entries()) {
    const t = e.tag;
    const type = (e.attrs.get("type") ?? "").trim().toLowerCase();
    const role = (e.attrs.get("role") ?? "").trim().toLowerCase();
    if (t === "img" && !e.attrs.has("alt") && role !== "presentation" && role !== "none") add("img-alt", e, "image has no alt attribute (use alt=\"\" for decorative images)");
    else if (t === "input" && type === "image" && !nonEmpty(e.attrs.get("alt")) && !nonEmpty(e.attrs.get("aria-label")) && !nonEmpty(e.attrs.get("aria-labelledby"))) add("img-alt", e, "image button has no alt text");
    else if (t === "area" && e.attrs.has("href") && !e.attrs.has("alt") && !nonEmpty(e.attrs.get("aria-label"))) add("img-alt", e, "image map area has no alt text");

    if (t === "input" ? !["hidden", "submit", "button", "reset", "image"].includes(type) : t === "select" || t === "textarea") {
      let labelled = nonEmpty(e.attrs.get("aria-label")) || nonEmpty(e.attrs.get("title"));
      const lb = e.attrs.get("aria-labelledby");
      if (!labelled && nonEmpty(lb)) labelled = tokens(lb as string).some(idHasName);
      const id = e.attrs.get("id");
      if (!labelled && nonEmpty(id)) {
        const l = labelFor.get((id as string).trim());
        labelled = l !== undefined && hasText(l);
      }
      if (!labelled) {
        const w = enclosing(els, e, "label");
        labelled = w !== null && hasText(w);
      }
      if (!labelled) add("form-labels", e, `<${t}> has no label (label for/wrapping label/aria-label/aria-labelledby)`);
    }

    if (t === "button" || (t === "input" && type === "button") || (role === "button" && t !== "a" && t !== "input")) {
      const named = t === "input" ? nonEmpty(e.attrs.get("value")) || nonEmpty(e.attrs.get("aria-label")) || nonEmpty(e.attrs.get("title")) || (nonEmpty(e.attrs.get("aria-labelledby")) && tokens(e.attrs.get("aria-labelledby") as string).some(idHasName)) : hasName(e, i);
      if (!named) add("button-names", e, "button has no accessible name");
    }
    if ((t === "a" && e.attrs.has("href")) || (role === "link" && t !== "a")) {
      if (!hasName(e, i)) add("link-names", e, "link has no accessible name");
    }

    if (t.length === 2 && t.charCodeAt(0) === 104 && t.charCodeAt(1) >= 49 && t.charCodeAt(1) <= 54) {
      const level = t.charCodeAt(1) - 48;
      if (level === 1) {
        h1Count++;
        if (h1Count > 1) add("single-h1", e, "more than one <h1> on the page");
      }
      if (prevLevel > 0 && level > prevLevel + 1) add("heading-order", e, `heading level jumps from h${prevLevel} to h${level}`);
      prevLevel = level;
    }

    const ti = intAttr(e.attrs.get("tabindex"));
    if (ti !== null && ti > 0) add("tabindex", e, `tabindex="${ti}" changes the natural focus order`);

    if (e.attrs.has("role")) {
      for (const r of tokens(role)) if (!ROLES.has(r)) add("aria-roles", e, `unknown ARIA role "${cleanText(r, 40)}"`);
    }
    for (const name of ["aria-labelledby", "aria-describedby"]) {
      const v = e.attrs.get(name);
      if (v !== undefined) for (const tok of tokens(v)) if (!ids.has(tok)) add("aria-refs", e, `${name} points to a missing id "${cleanText(tok, 40)}"`);
    }
    if (focusable(e)) {
      const by = isAriaHidden(e) ? i : e.hiddenBy;
      if (by === i) add("aria-hidden-focus", e, `focusable <${t}> has aria-hidden="true"`);
      else if (by >= 0) add("aria-hidden-focus", e, `focusable <${t}> is inside aria-hidden="true" (line ${(els[by] as El).line})`);
    }
    if (t === "a" && !e.attrs.has("href")) {
      const tab = intAttr(e.attrs.get("tabindex"));
      if (e.attrs.has("onclick") || role === "button" || role === "link" || (tab !== null && tab >= 0)) add("anchor-href", e, "<a> without href is not keyboard-operable or exposed as a link");
    }
    if (t === "table" && role !== "presentation" && role !== "none") {
      let th = false;
      for (let k = i + 1; k <= e.last && !th; k++) {
        const c = els[k] as El;
        const cr = (c.attrs.get("role") ?? "").trim().toLowerCase();
        th = c.tag === "th" || cr === "columnheader" || cr === "rowheader";
      }
      if (!th) add("table-headers", e, "table has no header cells (th)");
    }
    if (t === "meta" && (e.attrs.get("name") ?? "").trim().toLowerCase() === "viewport") {
      for (const piece of (e.attrs.get("content") ?? "").split(",").flatMap((x) => x.split(";"))) {
        const eq = piece.indexOf("=");
        if (eq < 0) continue;
        const k = piece.slice(0, eq).trim().toLowerCase();
        const v = piece.slice(eq + 1).trim().toLowerCase();
        if (k === "user-scalable" && (v === "no" || v === "0")) add("viewport", e, "user-scalable disables zooming");
        if (k === "maximum-scale") {
          const x = Number.parseFloat(v);
          if (Number.isFinite(x) && x < 2) add("viewport", e, `maximum-scale=${cleanText(v, 10)} limits zooming below 200%`);
        }
      }
    }
  }
  if (h1Count === 0) add("single-h1", null, "the page has no <h1>");
  for (const p of doc.problems) add("parsing", { line: doc.lineOf(p.pos), pos: p.pos, end: p.pos + 100 }, p.reason);
}

// ---------- tek HTML metni için (testler ve sağlayıcı ortak) ----------

export interface A11yFinding {
  check: string;
  line: number;
  reason: string;
  excerpt: string;
}

export function auditHtml(src: string, deadline = Date.now() + 10_000): A11yFinding[] {
  const doc = parseHtml(src, deadline);
  const out: A11yFinding[] = [];
  analyzeDoc(doc, (check, at, reason) => {
    out.push({ check, line: at ? at.line : 1, reason, excerpt: at ? cleanText(src.slice(at.pos, Math.min(at.end, at.pos + 200)), 100) : "" });
  });
  return out;
}

// ---------- sağlayıcı ----------

const fmt = (r: number, ok: boolean): string => (ok ? r.toFixed(2) : (Math.floor(r * 100) / 100).toFixed(2));

export class A11yLabProvider implements VerificationProvider<A11yRequest> {
  readonly id = "a11y-lab";

  // Girdi hatası burada, çalışmadan ÖNCE LabSpecError olarak fırlar.
  run(request: A11yRequest): VerificationHandle {
    const job = validateA11yRequest(request);
    const ctl = { cancelled: false };
    return {
      runId: randomUUID(),
      result: this.execute(job, ctl),
      cancel: async () => {
        ctl.cancelled = true;
      },
    };
  }

  private async execute(job: A11yJob, ctl: { cancelled: boolean }): Promise<RunResult> {
    const started = Date.now();
    const deadline = started + job.timeoutMs;
    const tests: TestResult[] = [];
    const data: Array<{ check: string; file: string; line: number; reason: string; excerpt: string }> = [];
    const per = new Map<string, { count: number; items: string[]; files: Set<string> }>();
    let analysed = 0;
    let elements = 0;
    let timedOut = false;
    const skipped: string[] = [];
    // Çözümlenemeyen dosya (araç/girdi hatası: infra) planın a11y ölçütlerini "error" yapar: eşlenmiş ölçüt kanıtsız "doğrulandı" sayılmaz.
    const claimed = Object.keys(job.criteria ?? {});
    const fileTest = (file: string, message: string): void => {
      tests.push(mkTest(tests.length, { suite: "files", name: `[WCAG] the file can be analysed: ${cleanText(file, 120)}`, outcome: "error", durationMs: 0, message, detail: `file: ${cleanText(file, 120)}`, criteria: claimed }));
    };
    for (const file of job.files) {
      // Dosyalar arasında olay döngüsüne nefes aldır: tarama senkron olduğu için sunucu tek istekle donmasın.
      await new Promise<void>((r) => setImmediate(r));
      // İptal: koşu hemen "cancelled" biter (o ana kadarki hata testleriyle); denetimler eksik veriyle "geçmiş" sayılmaz.
      if (ctl.cancelled) return mkRun(this.id, started, tests, [], { lab: "a11y", files: job.files.length, analysed, cancelled: true }, "cancelled");
      if (timedOut || Date.now() > deadline) {
        timedOut = true;
        skipped.push(file);
        continue;
      }
      const read = readFileInside(job.root, file, MAX_A11Y_FILE_BYTES);
      if (!read.ok) {
        fileTest(file, read.message);
        continue;
      }
      try {
        const text = read.buf.toString("utf8");
        const doc = parseHtml(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text, deadline);
        elements += doc.els.length;
        analyzeDoc(doc, (check, at, reason) => {
          const line = at ? at.line : 1;
          const excerpt = at ? cleanText(doc.src.slice(at.pos, Math.min(at.end, at.pos + 200)), 100) : "";
          const slot = per.get(check) ?? { count: 0, items: [], files: new Set<string>() };
          per.set(check, slot);
          slot.count++;
          slot.files.add(file);
          const item = `${cleanText(file, 100)}:${line} ${cleanText(reason, 160)}${excerpt ? ` — ${excerpt}` : ""}`;
          if (slot.items.length < MAX_FINDINGS_PER_CHECK) slot.items.push(item);
          if (data.length < MAX_FINDINGS_IN_DATA) data.push({ check, file: cleanText(file, 100), line, reason: cleanText(reason, 160), excerpt });
        });
        analysed++;
      } catch (e) {
        if (e instanceof A11yBudgetError) {
          timedOut = true;
          fileTest(file, "the analysis exceeded its time budget");
        } else fileTest(file, "the file could not be analysed");
      }
    }
    // Hiç dosya çözümlenemediyse denetimler boşuna "geçmiş" sayılmaz: yalnız hata testleri kalır.
    if (analysed > 0) {
      for (const c of A11Y_CHECKS) {
        const name = `${c.refs.map((r) => `[WCAG ${r}]`).join("")} ${c.title}`;
        const id = `wcag-${c.refs[0]}-${c.key}`;
        const crit = criteriaFor(name, job.criteria);
        const slot = per.get(c.key);
        const t0 = Date.now();
        const test = slot
          ? mkTest(tests.length, { suite: "a11y", name, outcome: "failed", durationMs: Date.now() - t0, message: `${slot.count} violation(s) in ${slot.files.size} file(s)`, detail: slot.items.slice(0, 5).join("; "), criteria: crit })
          : mkTest(tests.length, { suite: "a11y", name, outcome: "passed", durationMs: Date.now() - t0, criteria: crit });
        tests.push({ ...test, id });
      }
      job.contrastPairs.forEach((p, i) => {
        const ratio = contrastRatio(p.fg, p.bg);
        const need = p.large ? CONTRAST_LARGE : CONTRAST_NORMAL;
        const ok = ratio + 1e-9 >= need;
        const name = `[WCAG 1.4.3] contrast ${cleanText(p.name, 80)} (${p.fg} on ${p.bg}${p.large ? ", large text" : ""})`;
        const crit = criteriaFor(name, job.criteria);
        const test = ok
          ? mkTest(tests.length, { suite: "contrast", name, outcome: "passed", durationMs: 0, criteria: crit })
          : mkTest(tests.length, { suite: "contrast", name, outcome: "failed", durationMs: 0, message: `contrast ${fmt(ratio, false)}:1 is below the required ${need}:1`, detail: `${p.fg} on ${p.bg}`, criteria: crit });
        tests.push({ ...test, id: `wcag-1.4.3-contrast-${i + 1}` });
      });
    }
    let findingsTotal = 0;
    for (const s of per.values()) findingsTotal += s.count;
    return mkRun(
      this.id,
      started,
      tests,
      [],
      { lab: "a11y", files: job.files.length, analysed, skippedFiles: skipped.length, elements, contrastPairs: job.contrastPairs.length, findingsTotal, findings: data },
      timedOut ? "timed_out" : undefined,
    );
  }
}
