// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Doğrulama laboratuvarı madde 58: mutasyon testi ("mutation-lab"). Soru: "testler yeşil ama gerçekten bir şey yakalıyor mu?".
// Kaynak dosyalarda küçük, deterministik değişiklikler (mutantlar) üretilir ve her biri için projenin testleri yeniden koşulur; testler kırılırsa mutant
// "öldürüldü", yine geçerse "hayatta kaldı" (testler değişikliği fark etmedi) sayılır. Skor = öldürülen / üretilen.
// GÜVENLİK: mutasyon ASLA gerçek çalışma ağacında yapılmaz. Ağaç önce evidenceDir/tmp altındaki bir KOPYAYA alınır (.git, node_modules ve .env* hariç; sembolik bağ,
// kavşak ve sabit bağlı dosyalar atlanır; en çok 2000 dosya ve 50 MB, aşarsa infra hatası). Mutant yazma, test koşusu ve geri yükleme yalnız kopyada olur;
// orijinal kaynak dosyaların sha256'sı koşu başında ve sonunda karşılaştırılır. Alt süreçler LocalTestProvider'ın mevcut güvenli yolundan (node --permission, süreç
// başına dosya, süre sınırı, boyut sınırı) geçer; burada kendi spawn'ımız YOKTUR. Aynı anda tek mutasyon koşusu çalışır; toplam süre sınırı vardır.
// Mutasyon üretimi: string / şablon metni / yorum / regex sabitine dokunmayan küçük bir sözcük taramacısı; rastgelelik yok, sıralama kararlı, fazlası eşit aralıklı örneklenir.
// BİLİNEN SINIRLAR: JSX desteklenmez; yalnız .js/.mjs/.cjs/.ts; şablon metni içindeki ${...} ifadeleri mutasyona uğramaz; `<` ve `>` yalnız iki yanında boşluk
// varsa mutasyona uğrar (TS genel türleri Dizi<T> sözdizimi bozmasın diye); kopya node_modules içermediğinden harici paket gerektiren testlerin temel koşusu kırmızı olur (infra);
// kopya klasörü koşu sonrasında SİLİNMEZ (evidenceDir/tmp altında kalır; silme yalnız Yusuf'un kararıdır).
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { copyFile, lstat, readdir } from "node:fs/promises";
import type { Stats } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, resolve, sep } from "node:path";
import { redactString } from "../../core/audit/redact.ts";
import { SECRET_NAME } from "../../core/policy/data-boundary.ts";
import { saveEvidence, sha256Of } from "../evidence-files.ts";
import { LocalTestProvider, validateTestFiles } from "../local-tests.ts";
import type { VerificationHandle, VerificationProvider } from "../provider.ts";
import type { EvidenceItem, RunResult, RunStatus, TestResult } from "../schema.ts";
import { LabSpecError, cleanText, mkRun, mkTest, plainObject, reqString } from "./rules.ts";
import { readFileInside } from "./safe-read.ts";

export const MAX_MUTATION_FILES = 5;
export const MAX_MUTANTS_LIMIT = 30;
export const DEFAULT_MAX_MUTANTS = 20;
export const DEFAULT_MIN_SCORE = 0.6;
export const DEFAULT_PER_MUTANT_TIMEOUT_MS = 30_000;
export const DEFAULT_TOTAL_TIMEOUT_MS = 10 * 60_000;
export const MAX_COPY_FILES = 2000;
export const MAX_COPY_BYTES = 50 * 1024 * 1024;
export const MAX_SOURCE_BYTES = 512 * 1024;
const SOURCE_EXT = [".js", ".mjs", ".cjs", ".ts"] as const;
const TEST_FILE = /\.(test|spec)\.(ts|mjs|js|cjs)$/i;
const MAX_LOG_CHARS = 100_000;

// ---------- plan / istek doğrulaması ----------

export interface MutationPlan {
  files: string[];
  maxMutants?: number;
  minScore?: number;
}

export interface MutationRequest extends MutationPlan {
  cwd: string;
  testFiles: string[];
  perMutantTimeoutMs?: number;
  totalTimeoutMs?: number;
  evidenceDir: string;
}

function normalizeSource(raw: unknown): string {
  const p = reqString(raw, "files[]", 300).replace(/\\/g, "/");
  if (p.startsWith("/") || /^[a-zA-Z]:/.test(p)) throw new LabSpecError("files must be workspace-relative paths");
  const parts = p.split("/");
  if (parts.some((x) => x === "" || x === "." || x === "..")) throw new LabSpecError("files must not contain empty, . or .. segments");
  if (parts.some((x) => x.startsWith("-"))) throw new LabSpecError('file path components must not start with "-"');
  if (parts.some((x) => x.toLowerCase() === "node_modules" || x.toLowerCase() === ".git")) throw new LabSpecError("files must not be inside node_modules or .git");
  const lower = p.toLowerCase();
  if (!SOURCE_EXT.some((e) => lower.endsWith(e)) || lower.endsWith(".d.ts")) throw new LabSpecError(`files must be ${SOURCE_EXT.join("/")} source files`);
  if (TEST_FILE.test(p)) throw new LabSpecError(`a test file cannot be mutated: ${cleanText(p, 100)}`);
  return p;
}

export function validateMutationPlan(input: unknown): MutationPlan {
  const o = plainObject(input, "mutation", ["files", "maxMutants", "minScore"]);
  if (!Array.isArray(o.files) || o.files.length === 0 || o.files.length > MAX_MUTATION_FILES) throw new LabSpecError(`mutation.files must list 1 to ${MAX_MUTATION_FILES} source files`);
  const seen = new Set<string>();
  const files = o.files.map((f) => {
    const p = normalizeSource(f);
    if (seen.has(p.toLowerCase())) throw new LabSpecError("mutation.files must not repeat a file");
    seen.add(p.toLowerCase());
    return p;
  });
  const plan: MutationPlan = { files };
  if (o.maxMutants !== undefined) {
    if (typeof o.maxMutants !== "number" || !Number.isInteger(o.maxMutants) || o.maxMutants < 1 || o.maxMutants > MAX_MUTANTS_LIMIT) throw new LabSpecError(`mutation.maxMutants must be an integer from 1 to ${MAX_MUTANTS_LIMIT}`);
    plan.maxMutants = o.maxMutants;
  }
  if (o.minScore !== undefined) {
    if (typeof o.minScore !== "number" || !Number.isFinite(o.minScore) || o.minScore < 0 || o.minScore > 1) throw new LabSpecError("mutation.minScore must be a number from 0 to 1");
    plan.minScore = o.minScore;
  }
  return plan;
}

interface MutationJob {
  cwd: string;
  files: string[];
  testFiles: string[];
  maxMutants: number;
  minScore: number;
  perMutantTimeoutMs: number;
  totalTimeoutMs: number;
  evidenceDir: string;
}

export function validateMutationRequest(input: unknown): MutationJob {
  const o = plainObject(input, "spec", ["cwd", "files", "testFiles", "maxMutants", "minScore", "perMutantTimeoutMs", "totalTimeoutMs", "evidenceDir"]);
  const cwd = reqString(o.cwd, "spec.cwd", 1000);
  try {
    if (!statSync(cwd).isDirectory()) throw new Error("not a directory");
  } catch {
    throw new LabSpecError("spec.cwd must be an existing directory");
  }
  const evidenceDir = reqString(o.evidenceDir, "spec.evidenceDir", 1000);
  const plan = validateMutationPlan({ files: o.files, ...(o.maxMutants !== undefined ? { maxMutants: o.maxMutants } : {}), ...(o.minScore !== undefined ? { minScore: o.minScore } : {}) });
  let testFiles: string[];
  try {
    testFiles = validateTestFiles(cwd, Array.isArray(o.testFiles) ? (o.testFiles as string[]) : []);
  } catch (err) {
    throw new LabSpecError(`spec.testFiles: ${err instanceof Error ? cleanText(err.message, 200) : "invalid"}`);
  }
  const tests = new Set(testFiles.map((f) => f.toLowerCase()));
  for (const f of plan.files) {
    if (tests.has(f.toLowerCase())) throw new LabSpecError(`a test file cannot be mutated: ${cleanText(f, 100)}`);
    let st: Stats | null = null;
    try {
      st = statSync(resolve(cwd, f));
    } catch {
      st = null;
    }
    if (!st || !st.isFile()) throw new LabSpecError(`source file not found: ${cleanText(f, 100)}`);
  }
  const per = o.perMutantTimeoutMs === undefined ? DEFAULT_PER_MUTANT_TIMEOUT_MS : o.perMutantTimeoutMs;
  if (typeof per !== "number" || !Number.isInteger(per) || per < 2000 || per > 60_000) throw new LabSpecError("spec.perMutantTimeoutMs must be an integer from 2000 to 60000");
  const total = o.totalTimeoutMs === undefined ? DEFAULT_TOTAL_TIMEOUT_MS : o.totalTimeoutMs;
  if (typeof total !== "number" || !Number.isInteger(total) || total < 5000 || total > DEFAULT_TOTAL_TIMEOUT_MS) throw new LabSpecError(`spec.totalTimeoutMs must be an integer from 5000 to ${DEFAULT_TOTAL_TIMEOUT_MS}`);
  return { cwd, files: plan.files, testFiles, maxMutants: plan.maxMutants ?? DEFAULT_MAX_MUTANTS, minScore: plan.minScore ?? DEFAULT_MIN_SCORE, perMutantTimeoutMs: per, totalTimeoutMs: total, evidenceDir };
}

// ---------- sözcük taramacısı ----------

type TokKind = "id" | "num" | "str" | "tpl" | "re" | "punct";
interface Tok {
  k: TokKind;
  text: string;
  pos: number;
  end: number;
}

class MutationParseError extends Error {}

const PUNCT = [">>>=", "...", "===", "!==", "**=", "<<=", ">>=", ">>>", "&&=", "||=", "??=", "=>", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<", ">>", "**"];
// Bu sözcüklerden sonra gelen "/" bir bölme değil, regex başlangıcıdır; bu sözcüklerden sonra "+"/"-" tekli işleçtir.
const PREFIX_WORDS = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
const MAX_TEMPLATE_DEPTH = 30;

const isIdStart = (c: string): boolean => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$" || c > "\u007f";
const isDigit = (c: string): boolean => c >= "0" && c <= "9";
const isIdPart = (c: string): boolean => isIdStart(c) || isDigit(c);

function valueEnd(t: Tok | undefined): boolean {
  if (!t) return false;
  if (t.k === "id") return !PREFIX_WORDS.has(t.text);
  if (t.k === "punct") return t.text === ")" || t.text === "]";
  return true;
}

function regexAllowed(prev: Tok | undefined): boolean {
  if (!prev) return true;
  if (prev.k === "id") return PREFIX_WORDS.has(prev.text);
  if (prev.k === "punct") return prev.text !== ")" && prev.text !== "]" && prev.text !== "}";
  return false;
}

// Şablon metninin içini (iç içe ${...} dahil) atlar; kapanış ters tırnağının ardındaki konumu döndürür.
function skipTemplate(src: string, start: number, depth: number): number {
  if (depth > MAX_TEMPLATE_DEPTH) throw new MutationParseError("templates are nested too deeply");
  let i = start + 1;
  while (i < src.length) {
    const c = src[i] as string;
    if (c === "\\") i += 2;
    else if (c === "`") return i + 1;
    else if (c === "$" && src[i + 1] === "{") i = lex(src, i + 2, true, depth + 1).end;
    else i++;
  }
  throw new MutationParseError("unterminated template literal");
}

// stopAtBrace: bir ${ ifadesinin içindeyiz; eşleşen "}" görülünce o noktada dur ve "}" sonrasındaki konumu döndür.
function lex(src: string, from: number, stopAtBrace: boolean, depth = 0): { toks: Tok[]; end: number } {
  const toks: Tok[] = [];
  let i = from;
  let braces = 0;
  if (from === 0 && src.startsWith("#!")) while (i < src.length && src[i] !== "\n") i++;
  const push = (k: TokKind, end: number): void => {
    toks.push({ k, text: src.slice(i, end), pos: i, end });
    i = end;
  };
  while (i < src.length) {
    const c = src[i] as string;
    const n = src[i + 1];
    if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === "\v" || c === " " || c === "﻿" || c === " " || c === " ") {
      i++;
    } else if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "/" && n === "*") {
      const e = src.indexOf("*/", i + 2);
      if (e < 0) throw new MutationParseError("unterminated block comment");
      i = e + 2;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\\") j++;
        else if (src[j] === "\n") throw new MutationParseError("unterminated string literal");
        j++;
      }
      if (j >= src.length) throw new MutationParseError("unterminated string literal");
      push("str", j + 1);
    } else if (c === "`") {
      push("tpl", skipTemplate(src, i, depth));
    } else if (c === "/" && regexAllowed(toks[toks.length - 1])) {
      let j = i + 1;
      let inClass = false;
      let ok = false;
      while (j < src.length && src[j] !== "\n") {
        const d = src[j] as string;
        if (d === "\\") j++;
        else if (d === "[") inClass = true;
        else if (d === "]") inClass = false;
        else if (d === "/" && !inClass) {
          ok = true;
          break;
        }
        j++;
      }
      if (!ok) throw new MutationParseError("unterminated regular expression literal");
      j++;
      while (j < src.length && isIdPart(src[j] as string)) j++;
      push("re", j);
    } else if (isDigit(c) || (c === "." && n !== undefined && isDigit(n))) {
      let j = i;
      if (c === "0" && n !== undefined && "xXbBoO".includes(n)) {
        j += 2;
        while (j < src.length && (isIdPart(src[j] as string))) j++;
      } else {
        while (j < src.length && (isDigit(src[j] as string) || src[j] === "_")) j++;
        if (src[j] === "." && src[j + 1] !== ".") {
          j++;
          while (j < src.length && (isDigit(src[j] as string) || src[j] === "_")) j++;
        }
        if ((src[j] === "e" || src[j] === "E") && (isDigit(src[j + 1] ?? "") || ((src[j + 1] === "+" || src[j + 1] === "-") && isDigit(src[j + 2] ?? "")))) {
          j += 2;
          while (j < src.length && isDigit(src[j] as string)) j++;
        }
        if (src[j] === "n") j++;
      }
      push("num", j);
    } else if (isIdStart(c) || (c === "#" && n !== undefined && isIdStart(n))) {
      let j = i + 1;
      while (j < src.length && isIdPart(src[j] as string)) j++;
      push("id", j);
    } else {
      if (c === "{") braces++;
      if (c === "}") {
        if (stopAtBrace && braces === 0) return { toks, end: i + 1 };
        braces--;
      }
      const p = PUNCT.find((x) => src.startsWith(x, i));
      push("punct", i + (p ? p.length : 1));
    }
  }
  if (stopAtBrace) throw new MutationParseError("unterminated template expression");
  return { toks, end: i };
}

// ---------- mutant üretimi ----------

export interface Mutant {
  file: string;
  line: number;
  pos: number;
  end: number;
  from: string;
  to: string;
  label: string;
  excerpt: string;
}

const EQ: Record<string, string> = { "===": "!==", "!==": "===", "==": "!=", "!=": "==" };
const REL: Record<string, string> = { "<": "<=", ">": ">=", "<=": "<", ">=": ">" };
const LOGIC: Record<string, string> = { "&&": "||", "||": "&&" };

function lineStarts(src: string): number[] {
  const out = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") out.push(i + 1);
  return out;
}

function lineOf(starts: number[], pos: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((starts[mid] as number) <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

export const MAX_CANDIDATES_PER_FILE = 5000;
const MAX_RETURN_SCAN_TOKENS = 200;

// Tek geçişte doğrusal (O(n)) çalışır: satır başlangıçları ve "önünde satır sonu var mı" bilgisi BİR KEZ hesaplanır, "return" taraması en çok 200 belirteç bakar,
// alıntı (excerpt) burada ÜRETİLMEZ (yalnız seçilen mutantlar için excerptOf ile). deadline aşılırsa MutationParseError fırlar.
export function generateMutants(file: string, src: string, deadline?: number): Mutant[] {
  const toks = lex(src, 0, false).toks;
  const starts = lineStarts(src);
  // nl[k]: k. belirteçten önce (bir önceki belirteçle arasında) satır sonu var mı?
  const nl: boolean[] = new Array<boolean>(toks.length);
  let gapStart = 0;
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k] as Tok;
    let has = false;
    for (let p = gapStart; p < tk.pos; p++) {
      if (src.charCodeAt(p) === 10) {
        has = true;
        break;
      }
    }
    nl[k] = has;
    gapStart = tk.end;
  }
  const out: Mutant[] = [];
  const add = (t: Tok, end: number, from: string, to: string, label: string): void => {
    out.push({ file, line: lineOf(starts, t.pos), pos: t.pos, end, from, to, label, excerpt: "" });
  };
  const spaced = (t: Tok): boolean => /\s/.test(src[t.pos - 1] ?? "") && /\s/.test(src[t.end] ?? "");
  for (let i = 0; i < toks.length; i++) {
    if (deadline !== undefined && (i & 4095) === 0 && Date.now() > deadline) throw new MutationParseError("the mutant generation exceeded its time budget");
    const t = toks[i] as Tok;
    const prev = toks[i - 1];
    const next = toks[i + 1];
    if (t.k === "punct") {
      const eq = EQ[t.text];
      const rel = REL[t.text];
      const logic = LOGIC[t.text];
      if (eq) add(t, t.end, t.text, eq, "equality");
      else if (rel && (t.text.length === 2 || spaced(t))) add(t, t.end, t.text, rel, "relational");
      else if (logic) add(t, t.end, t.text, logic, "logical");
      else if ((t.text === "+" || t.text === "-") && valueEnd(prev) && next !== undefined && !(next.k === "punct" && (next.text === "=" || next.text === ")" || next.text === "]"))) add(t, t.end, t.text, t.text === "+" ? "-" : "+", "arithmetic");
    } else if (t.k === "id") {
      if ((t.text === "true" || t.text === "false") && !(prev && prev.k === "punct" && (prev.text === "." || prev.text === "?."))) add(t, t.end, t.text, t.text === "true" ? "false" : "true", "boolean");
      else if (t.text === "return" && !(prev && prev.k === "punct" && (prev.text === "." || prev.text === "?."))) {
        // Yalnız tek satırlık "return <ifade>;" ; en çok MAX_RETURN_SCAN_TOKENS belirteç ileriye bakılır.
        let depth = 0;
        let semi = -1;
        for (let j = i + 1; j < toks.length && j <= i + MAX_RETURN_SCAN_TOKENS; j++) {
          if (nl[j]) break;
          const u = toks[j] as Tok;
          if (u.k === "punct") {
            if (u.text === "(" || u.text === "[" || u.text === "{") depth++;
            else if (u.text === ")" || u.text === "]" || u.text === "}") {
              depth--;
              if (depth < 0) break;
            } else if (u.text === ";" && depth === 0) {
              semi = j;
              break;
            }
          }
        }
        if (semi > i + 1) {
          const semiTok = toks[semi] as Tok;
          const expr = src.slice(t.end, semiTok.pos).trim();
          if (expr !== "undefined") add(t, semiTok.pos, `return ${expr.length > 40 ? `${expr.slice(0, 40)}…` : expr}`, "return undefined", "return");
        }
      }
    } else if (t.k === "num" && (t.text === "0" || t.text === "1") && !(prev && prev.k === "punct" && prev.text === ".")) {
      add(t, t.end, t.text, t.text === "0" ? "1" : "2", "number");
    }
  }
  // Aday sayısı üst sınırı: aşılırsa eşit aralıklı seyreltilir (deterministik).
  return sampleMutants(out, MAX_CANDIDATES_PER_FILE);
}

// Satır alıntısı yalnız SEÇİLEN mutantlar için üretilir (uzun satırlarda mutant başına tüm satırı kesmek ikinci dereceden maliyet doğurur).
export function fillExcerpts(src: string, ms: Mutant[]): void {
  const starts = lineStarts(src);
  for (const m of ms) {
    const from = starts[m.line - 1] as number;
    const stop = m.line < starts.length ? (starts[m.line] as number) - 1 : src.length;
    m.excerpt = cleanText(src.slice(from, Math.min(stop, from + 400)).trim(), 120);
  }
}

// maxMutants'tan fazlaysa eşit aralıklı seçim (rastgelelik yok): i. seçim = floor(i * n / max).
export function sampleMutants<T>(all: T[], max: number): T[] {
  if (all.length <= max) return all;
  const picked: T[] = [];
  for (let i = 0; i < max; i++) picked.push(all[Math.floor((i * all.length) / max)] as T);
  return picked;
}

function applyMutant(src: string, m: Mutant): string {
  return src.slice(0, m.pos) + m.to + src.slice(m.end);
}

// ---------- kopya ----------

class CopyLimitError extends Error {}

export const MAX_COPY_DIRS = 2000;
// Kopya klasörleri SİLİNMEZ (silme yalnız Yusuf'un kararıdır). Birikim sınırsız büyümesin diye evidenceDir/tmp altında bu kadar mutation-* klasörü varsa yeni koşu infra hata verir.
export const MAX_COPY_FOLDERS = 20;

export interface CopyStats {
  files: number;
  bytes: number;
  skipped: string[];
}

// Gizli görünen dosya adları kopyaya HİÇ alınmaz: data-boundary.ts'teki SECRET_NAME (.env*, *.pem, *.key, *.pfx, *.p12, *.kdbx, id_rsa/ed25519/ecdsa*, credentials*, secrets*,
// .npmrc, .netrc) + .envrc. Ayrıca .git ve node_modules.
function isSkippedName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower === ".git" || lower === "node_modules" || lower === ".envrc" || SECRET_NAME.test(name);
}

const tick = (): Promise<void> => new Promise((r) => setImmediate(r));

// evidenceDir/tmp altındaki mutation-* kopya klasörlerinin sayısı.
export function countCopyFolders(evidenceDir: string): number {
  try {
    return readdirSync(join(evidenceDir, "tmp")).filter((n) => n.startsWith("mutation-")).length;
  } catch {
    return 0;
  }
}

// Çalışma ağacını kopyalar: gizli adlar/.git/node_modules ve sembolik bağ/kavşak/sabit bağ dosyaları atlanır; sınır (dosya, dizin, bayt) aşılırsa CopyLimitError.
// Kopyalama dosyalar arasında olay döngüsüne nefes aldırır (eşzamansız fs).
export async function copyWorkspace(src: string, dst: string, evidenceDir: string): Promise<CopyStats> {
  const root = resolve(src);
  const ev = resolve(evidenceDir).toLowerCase();
  const plan: Array<{ rel: string; size: number }> = [];
  const dirs: string[] = [];
  const skipped: string[] = [];
  let bytes = 0;
  let steps = 0;
  const walk = async (dir: string, rel: string): Promise<void> => {
    for (const name of await readdir(dir)) {
      if (++steps % 200 === 0) await tick();
      const abs = join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      const lower = resolve(abs).toLowerCase();
      if (lower === ev || lower.startsWith(ev + sep)) continue;
      if (isSkippedName(name)) continue;
      const st = await lstat(abs);
      if (st.isSymbolicLink()) skipped.push(`${r} (link)`);
      else if (st.isDirectory()) {
        dirs.push(r);
        if (dirs.length > MAX_COPY_DIRS) throw new CopyLimitError(`the workspace has more than ${MAX_COPY_DIRS} directories; too large to copy for mutation testing`);
        await walk(abs, r);
      } else if (st.isFile()) {
        if (st.nlink > 1) {
          skipped.push(`${r} (hard link)`);
          continue;
        }
        plan.push({ rel: r, size: st.size });
        bytes += st.size;
        if (plan.length > MAX_COPY_FILES) throw new CopyLimitError(`the workspace has more than ${MAX_COPY_FILES} files; too large to copy for mutation testing`);
        if (bytes > MAX_COPY_BYTES) throw new CopyLimitError(`the workspace is larger than ${MAX_COPY_BYTES / 1024 / 1024} MB; too large to copy for mutation testing`);
      }
    }
  };
  await walk(root, "");
  mkdirSync(dst, { recursive: true });
  for (const d of dirs) mkdirSync(join(dst, d), { recursive: true });
  let n = 0;
  for (const f of plan) {
    await copyFile(join(root, f.rel), join(dst, f.rel));
    if (++n % 50 === 0) await tick();
  }
  return { files: plan.length, bytes, skipped: skipped.slice(0, 50) };
}

// ---------- sağlayıcı ----------

// Aynı anda tek mutasyon koşusu: koşular sıraya girer.
let queue: Promise<unknown> = Promise.resolve();

interface Outcome {
  mutant: Mutant;
  verdict: "killed" | "survived";
  how: string;
  ms: number;
}

class InfraAbort extends Error {}

export class MutationLabProvider implements VerificationProvider<MutationRequest> {
  readonly id = "mutation-lab";

  // Girdi hatası burada, çalışmadan ÖNCE LabSpecError olarak fırlar.
  run(request: MutationRequest): VerificationHandle {
    const job = validateMutationRequest(request);
    const runId = randomUUID();
    const state = { cancelled: false, current: null as VerificationHandle | null };
    const prior = queue;
    const result = (async (): Promise<RunResult> => {
      await prior.catch(() => undefined);
      return this.execute(runId, job, state);
    })();
    queue = result.catch(() => undefined);
    return {
      runId,
      result,
      cancel: async () => {
        state.cancelled = true;
        if (state.current) await state.current.cancel().catch(() => undefined);
        await result.catch(() => undefined);
      },
    };
  }

  private async execute(runId: string, job: MutationJob, state: { cancelled: boolean; current: VerificationHandle | null }): Promise<RunResult> {
    const started = Date.now();
    const deadline = started + job.totalTimeoutMs;
    const tests: TestResult[] = [];
    const evidence: EvidenceItem[] = [];
    const log: string[] = [`mutation-lab run ${runId}`, `files: ${job.files.join(", ")}`, `testFiles: ${job.testFiles.join(", ")}`, `maxMutants: ${job.maxMutants}  minScore: ${job.minScore}`];
    const data: Record<string, unknown> = { lab: "mutation", files: job.files, testFiles: job.testFiles, maxMutants: job.maxMutants, minScore: job.minScore };
    let forced: RunStatus | undefined;
    const infra = (name: string, message: string, detail?: string): void => {
      tests.push(mkTest(tests.length, { suite: "mutation", name, outcome: "error", durationMs: Date.now() - started, message, ...(detail ? { detail } : {}) }));
      log.push(`[error] ${name}: ${message}${detail ? ` (${detail})` : ""}`);
    };
    const finish = (): RunResult => {
      const text = `${redactString(log.join("\n")).slice(0, MAX_LOG_CHARS)}\n`;
      const item = saveEvidence(job.evidenceDir, `${runId}-mutation-log`, "log", `mutation-lab log (${tests.length} result(s))`, text, "log");
      evidence.push(item);
      for (const t of tests) if ((t.outcome === "failed" || t.outcome === "error") && !t.evidenceRefs.includes(item.id)) t.evidenceRefs.push(item.id);
      const run = mkRun(this.id, started, tests, evidence, data, forced);
      run.runId = runId;
      return run;
    };

    const originals = new Map<string, { buf: Buffer; text: string; sha: string }>();
    try {
      if (state.cancelled) {
        forced = "cancelled";
        infra("run", "the mutation run was cancelled");
        return finish();
      }
      // 1) Orijinal kaynaklar güvenle okunur ve özetlenir.
      for (const f of job.files) {
        const read = readFileInside(job.cwd, f, MAX_SOURCE_BYTES);
        if (!read.ok) throw new InfraAbort(`the source file ${cleanText(f, 100)} cannot be read: ${read.message}`);
        const text = read.buf.toString("utf8");
        if (!Buffer.from(text, "utf8").equals(read.buf)) throw new InfraAbort(`the source file ${cleanText(f, 100)} is not valid UTF-8`);
        originals.set(f, { buf: read.buf, text, sha: sha256Of(read.buf) });
      }
      // 2) Mutantlar kopyadan ÖNCE üretilir (taramacı hatası erken ve ucuz görünsün).
      const all: Mutant[] = [];
      for (const f of job.files) {
        // Üretim senkron ve doğrusal; dosyalar arasında olay döngüsü serbest bırakılır ve toplam süre bütçesi denetlenir.
        await new Promise<void>((r) => setImmediate(r));
        try {
          for (const m of generateMutants(f, (originals.get(f) as { text: string }).text, deadline)) all.push(m);
        } catch (err) {
          if (err instanceof MutationParseError) throw new InfraAbort(`the source file ${cleanText(f, 100)} could not be tokenized: ${cleanText(err.message, 100)}`);
          throw err;
        }
      }
      const chosen = sampleMutants(all, job.maxMutants);
      for (const f of job.files) fillExcerpts((originals.get(f) as { text: string }).text, chosen.filter((m) => m.file === f));
      data.generated = all.length;
      data.sampled = chosen.length;
      log.push(`mutants generated: ${all.length}, tested: ${chosen.length}`);

      // 3) Çalışma ağacı KOPYASI. Eski kopyalar silinmediği için birikim sınırlıdır: sınır aşıldıysa yeni koşu infra hata verir (silme Yusuf'un kararıdır).
      if (countCopyFolders(job.evidenceDir) >= MAX_COPY_FOLDERS) throw new InfraAbort(`kopya birikimi: ${job.evidenceDir}/tmp altında ${MAX_COPY_FOLDERS} veya daha çok mutation-* kopya klasörü var; Yusuf'un temizlemesi gerekir (copy accumulation: the old copies must be cleaned up by Yusuf, nothing is deleted automatically)`);
      const base = join(job.evidenceDir, "tmp", `mutation-${runId.slice(0, 8)}`);
      const copyDir = join(base, "copy");
      const subEvidence = join(base, "runs");
      mkdirSync(subEvidence, { recursive: true });
      let copy: CopyStats;
      try {
        copy = await copyWorkspace(job.cwd, copyDir, job.evidenceDir);
      } catch (err) {
        if (err instanceof CopyLimitError) throw new InfraAbort(err.message);
        throw new InfraAbort(`the workspace could not be copied: ${cleanText(err instanceof Error ? err.message : String(err), 150)}`);
      }
      data.copy = { files: copy.files, bytes: copy.bytes, skippedEntries: copy.skipped.length };
      log.push(`copy: ${copy.files} file(s), ${copy.bytes} byte(s), skipped ${copy.skipped.length} link(s)`);
      if (copy.skipped.length) log.push(`skipped: ${copy.skipped.slice(0, 20).join(", ")}`);

      const local = new LocalTestProvider();
      const runTests = async (timeoutMs: number): Promise<RunResult> => {
        const h = local.run({ cwd: copyDir, files: job.testFiles, timeoutMs, evidenceDir: subEvidence });
        state.current = h;
        try {
          return await h.result;
        } finally {
          state.current = null;
        }
      };

      // 4) Temel koşu (mutasyonsuz kopya): kırmızıysa mutasyon yapılmaz.
      const baseStart = Date.now();
      const baseline = await runTests(Math.max(1000, Math.min(120_000, deadline - Date.now())));
      const baselineMs = Date.now() - baseStart;
      data.baselineMs = baselineMs;
      if (state.cancelled) {
        forced = "cancelled";
        infra("run", "the mutation run was cancelled");
        return finish();
      }
      if (baseline.status !== "passed") {
        const bad = baseline.tests.filter((t) => t.outcome === "failed" || t.outcome === "error").slice(0, 3).map((t) => t.name).join("; ");
        infra("baseline: the tests pass on the unmodified copy", `baseline red: the tests do not pass on an unmodified copy of the workspace (status ${baseline.status}); mutation testing was not started`, bad ? `failing: ${bad}` : undefined);
        data.baseline = baseline.status;
        return finish();
      }
      data.baseline = "passed";
      const perMutant = Math.min(60_000, Math.max(job.perMutantTimeoutMs, baselineMs * 3));
      data.perMutantTimeoutMs = perMutant;

      // 5) Mutant döngüsü: yaz -> koş -> geri yükle.
      const outcomes: Outcome[] = [];
      let budgetHit = false;
      for (const m of chosen) {
        if (state.cancelled) break;
        const left = deadline - Date.now();
        if (left < 1500) {
          budgetHit = true;
          break;
        }
        const orig = originals.get(m.file) as { buf: Buffer; text: string };
        const target = join(copyDir, ...m.file.split("/"));
        const t0 = Date.now();
        let res: RunResult;
        writeFileSync(target, applyMutant(orig.text, m), "utf8");
        try {
          res = await runTests(Math.min(perMutant, left));
        } finally {
          writeFileSync(target, orig.buf);
        }
        if (state.cancelled) break;
        const ms = Date.now() - t0;
        if (res.status === "passed") outcomes.push({ mutant: m, verdict: "survived", how: "tests still pass", ms });
        else if (res.status === "failed") outcomes.push({ mutant: m, verdict: "killed", how: "failure", ms });
        else if (res.status === "timed_out") outcomes.push({ mutant: m, verdict: "killed", how: "timeout", ms });
        else if (res.status === "cancelled") break;
        else {
          // error: çalışma ağacı/başlatma sorunları araç hatasıdır (öldürme sayılmaz); çöken/sonuçsuz kalan koşu mutantı öldürmüş sayılır.
          const toolError = res.tests.find((t) => t.name === "workspace" || (t.name === "run" && /could not start node/.test(t.error?.message ?? "")));
          if (toolError) throw new InfraAbort(`the test run could not be carried out on the copy: ${cleanText(toolError.error?.message ?? "error", 150)}`);
          outcomes.push({ mutant: m, verdict: "killed", how: "crash", ms });
        }
      }

      // 6) Orijinaller değişmedi mi?
      for (const f of job.files) {
        const again = readFileInside(job.cwd, f, MAX_SOURCE_BYTES);
        const o = originals.get(f) as { sha: string };
        if (!again.ok || sha256Of(again.buf) !== o.sha) throw new InfraAbort(`the original source file ${cleanText(f, 100)} changed during the run`);
      }

      // 7) Sonuçlar.
      const killed = outcomes.filter((o) => o.verdict === "killed").length;
      const survived = outcomes.length - killed;
      const total = outcomes.length;
      // Öldürme türleri: testin kendi başarısızlığı (assert/istisna) GÜÇLÜ; çökme ve zaman aşımı ZAYIF (örneğin kaynağın özetini kontrol eden bir test her mutantı çökertebilir).
      // Skor = (güçlü + 0,5 x zayıf) / toplam. minScore bu skora uygulanır.
      const killedByFailure = outcomes.filter((o) => o.how === "failure").length;
      const killedByCrash = outcomes.filter((o) => o.how === "crash").length;
      const killedByTimeout = outcomes.filter((o) => o.how === "timeout").length;
      const weak = killedByCrash + killedByTimeout;
      const weighted = killedByFailure + 0.5 * weak;
      const score = total === 0 ? null : Math.round((weighted / total) * 1000) / 1000;
      const perFile: Record<string, { total: number; killed: number; survived: number }> = {};
      for (const o of outcomes) {
        const s = (perFile[o.mutant.file] ??= { total: 0, killed: 0, survived: 0 });
        s.total++;
        s[o.verdict]++;
      }
      Object.assign(data, { score, scoreFormula: "(killedByFailure + 0.5 * (killedByCrash + killedByTimeout)) / total", killed, killedByFailure, killedByCrash, killedByTimeout, survived, total, perFile });
      log.push(`result: ${killed} killed, ${survived} survived, ${total} total, score ${score ?? "n/a"}`);

      const partial = budgetHit || state.cancelled;
      if (!partial) {
        const meets = score !== null && weighted >= job.minScore * total - 1e-9;
        tests.push(
          mkTest(0, {
            suite: "mutation",
            name: `mutation score >= ${job.minScore}`,
            outcome: score === null ? "skipped" : meets ? "passed" : "failed",
            durationMs: Date.now() - started,
            message: `mutation score ${score === null ? "n/a" : score.toFixed(2)} (${killed} of ${total} mutants killed${weak > 0 ? `, ${weak} only by crash/timeout counted as half` : ""}) is below the minimum ${job.minScore}; survived: ${outcomes.filter((o) => o.verdict === "survived").slice(0, 3).map((o) => `${o.mutant.file}:${o.mutant.line} ${o.mutant.from}→${o.mutant.to}`).join(", ")}`,
          }),
        );
        (tests[0] as TestResult).id = "mutation-score";
        if (score === null) log.push("no mutants could be generated from the given files");
      }
      let n = tests.length;
      for (const o of outcomes) {
        const m = o.mutant;
        const name = `${m.file}:${m.line} ${m.label} ${m.from}→${m.to}`;
        const t = mkTest(n++, { suite: "mutation", name, outcome: o.verdict === "survived" ? "failed" : "passed", durationMs: o.ms, message: "mutant survived: testler bu değişikliği fark etmedi", detail: `${m.file}:${m.line}: ${m.excerpt}` });
        tests.push(t);
        if (o.verdict === "survived") log.push(`[survived] ${m.file}:${m.line} ${m.label} ${m.from} -> ${m.to}   | ${m.excerpt}`);
        else log.push(`[killed:${o.how}] ${m.file}:${m.line} ${m.label} ${m.from} -> ${m.to}`);
      }
      if (state.cancelled) {
        forced = "cancelled";
        infra("run", "the mutation run was cancelled");
      } else if (budgetHit) {
        infra("run", `the mutation run exceeded its time budget (${job.totalTimeoutMs} ms): ${total} of ${chosen.length} mutants were tested`);
      }
      return finish();
    } catch (err) {
      if (err instanceof InfraAbort) infra("mutation run can be carried out", err.message);
      else infra("mutation run can be carried out", `unexpected error: ${cleanText(err instanceof Error ? err.message : String(err), 200)}`);
      return finish();
    }
  }
}
