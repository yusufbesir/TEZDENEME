// Nedensel etki haritası (madde 70, D8b): src altındaki import grafiği, bağımlılar ve etkilenen testler. Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// SALT OKUNUR, modelsiz, ağsız. İçe aktarmalar düzenli ifadeyle DEĞİL, küçük bir sözcük taramasıyla (yorum / dizgi / şablon / regex sabiti atlanarak) çıkarılır:
// `import ... from "x"`, `import "x"`, `export ... from "x"`, `import("x")`. Yalnız depo içi göreli içe aktarmalar grafiğe girer; "node:" ve paket adları "dış" sayılır.
// Bilinmeyen/çözülemeyen içe aktarma uydurulmaz: sayılır ve ayrı belirtilir. Kullanıcı girdisi ile dosya sistemi yolu KURULMAZ (dosya yalnız tarama sonucundaki adlarla eşleştirilir).
import { posix } from "node:path";
import { scanSrc } from "./scan.ts";
import type { ScannedFile } from "./scan.ts";

export const MAX_DEPTH = 6;
export const LIST_CAP = 500;
export const TOP_N = 20;
export const BUILD_BUDGET_MS = 2000;
const CODE_EXTS: ReadonlySet<string> = new Set([".ts", ".js", ".mjs"]);
const FILE_PATH_RE = /^src\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
const REGEX_BEFORE_KEYWORDS = new Set(["return", "typeof", "case", "in", "of", "delete", "void", "throw", "new", "else", "do", "yield", "await", "instanceof"]);

// ---- sözcük taraması -----------------------------------------------------------------------------------------------------
interface Tok {
  t: "id" | "str" | "p" | "num" | "re" | "tpl";
  v: string;
}

function isIdStart(c: string): boolean {
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$" || c.charCodeAt(0) > 127;
}
function isIdPart(c: string): boolean {
  return isIdStart(c) || (c >= "0" && c <= "9");
}

// ${ ... } / şablon iç içeliği bu sınırı aşan dosya "çözümlenemedi" sayılır (yığın taşması yerine NestingError; dosya atlanır ve bildirilir).
export const MAX_NESTING = 256;
export class NestingError extends Error {}

// Kapanış ters tırnağından sonraki dizin. ${ ... } içindeki dizgi ve iç içe şablonlar atlanır.
function skipTemplate(s: string, start: number, level = 0): number {
  if (level > MAX_NESTING) throw new NestingError("iç içelik sınırı aşıldı");
  let i = start + 1;
  while (i < s.length) {
    const c = s[i] as string;
    if (c === "\\") i += 2;
    else if (c === "`") return i + 1;
    else if (c === "$" && s[i + 1] === "{") i = skipBraced(s, i + 1, level + 1);
    else i++;
  }
  return s.length;
}

// `{` ile başlayan ifade bloğunun eşleşen `}` sonrası dizini.
function skipBraced(s: string, start: number, level = 0): number {
  if (level > MAX_NESTING) throw new NestingError("iç içelik sınırı aşıldı");
  let depth = 0;
  let i = start;
  while (i < s.length) {
    const c = s[i] as string;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i + 1;
    } else if (c === '"' || c === "'") i = skipString(s, i) - 1;
    else if (c === "`") i = skipTemplate(s, i, level + 1) - 1;
    i++;
  }
  return s.length;
}

function skipString(s: string, start: number): number {
  const q = s[start] as string;
  let i = start + 1;
  while (i < s.length) {
    const c = s[i] as string;
    if (c === "\\") i += 2;
    else if (c === q) return i + 1;
    else if (c === "\n") return i;
    else i++;
  }
  return s.length;
}

function skipRegex(s: string, start: number): number {
  let i = start + 1;
  let inClass = false;
  while (i < s.length) {
    const c = s[i] as string;
    if (c === "\\") i += 2;
    else if (c === "\n") return i;
    else if (c === "[") {
      inClass = true;
      i++;
    } else if (c === "]") {
      inClass = false;
      i++;
    } else if (c === "/" && !inClass) {
      i++;
      while (i < s.length && isIdPart(s[i] as string)) i++;
      return i;
    } else i++;
  }
  return s.length;
}

export function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i] as string;
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
    } else if (c === "/" && s[i + 1] === "/") {
      while (i < s.length && s[i] !== "\n") i++;
    } else if (c === "/" && s[i + 1] === "*") {
      const end = s.indexOf("*/", i + 2);
      i = end < 0 ? s.length : end + 2;
    } else if (c === '"' || c === "'") {
      const end = skipString(s, i);
      out.push({ t: "str", v: s.slice(i + 1, Math.max(i + 1, end - 1)) });
      i = end;
    } else if (c === "`") {
      i = skipTemplate(s, i);
      out.push({ t: "tpl", v: "" });
    } else if (c === "/") {
      const prev = out[out.length - 1];
      const division = prev !== undefined && ((prev.t === "id" && !REGEX_BEFORE_KEYWORDS.has(prev.v)) || prev.t === "num" || prev.t === "str" || prev.t === "tpl" || prev.t === "re" || (prev.t === "p" && (prev.v === ")" || prev.v === "]" || prev.v === "}")));
      if (division) {
        out.push({ t: "p", v: "/" });
        i++;
      } else {
        i = skipRegex(s, i);
        out.push({ t: "re", v: "" });
      }
    } else if (isIdStart(c)) {
      let j = i + 1;
      while (j < s.length && isIdPart(s[j] as string)) j++;
      out.push({ t: "id", v: s.slice(i, j) });
      i = j;
    } else if (c >= "0" && c <= "9") {
      let j = i + 1;
      while (j < s.length && (isIdPart(s[j] as string) || s[j] === ".")) j++;
      out.push({ t: "num", v: "" });
      i = j;
    } else {
      out.push({ t: "p", v: c });
      i++;
    }
  }
  return out;
}

export interface ImportRef {
  spec: string;
  kind: "static" | "reexport" | "dynamic" | "side-effect";
  typeOnly: boolean;
}

const SCAN_AHEAD = 4000;

// `from "x"` için ileri tarama: parantez derinliğinde 0 iken `from` + dizgi. Derinlik 0'da `;`, `import`, `export` görülürse bırakılır.
function findFrom(tokens: Tok[], start: number): string | null {
  let depth = 0;
  for (let j = start; j < tokens.length && j < start + SCAN_AHEAD; j++) {
    const tk = tokens[j] as Tok;
    if (tk.t === "p") {
      if (tk.v === "{") depth++;
      else if (tk.v === "}") depth = Math.max(0, depth - 1);
      else if (tk.v === ";" && depth === 0) return null;
    } else if (tk.t === "id") {
      if (tk.v === "import" || tk.v === "export") return null;
      if (tk.v === "from" && depth === 0) {
        const nx = tokens[j + 1];
        return nx !== undefined && nx.t === "str" ? nx.v : null;
      }
    }
  }
  return null;
}

export function scanImports(source: string): ImportRef[] {
  const tokens = tokenize(source);
  const out: ImportRef[] = [];
  for (let k = 0; k < tokens.length; k++) {
    const tk = tokens[k] as Tok;
    if (tk.t !== "id" || (tk.v !== "import" && tk.v !== "export")) continue;
    const prev = tokens[k - 1];
    if (prev !== undefined && prev.t === "p" && prev.v === ".") continue;
    const n1 = tokens[k + 1];
    if (n1 === undefined) continue;
    if (tk.v === "import") {
      if (n1.t === "p" && n1.v === "(") {
        const a = tokens[k + 2];
        const b = tokens[k + 3];
        if (a !== undefined && a.t === "str" && b !== undefined && b.t === "p" && (b.v === ")" || b.v === ",")) out.push({ spec: a.v, kind: "dynamic", typeOnly: false });
      } else if (n1.t === "str") {
        out.push({ spec: n1.v, kind: "side-effect", typeOnly: false });
      } else if (!(n1.t === "p" && n1.v === ".")) {
        const n2 = tokens[k + 2];
        const typeOnly = n1.t === "id" && n1.v === "type" && !(n2 !== undefined && n2.t === "id" && n2.v === "from");
        const spec = findFrom(tokens, k + 1);
        if (spec !== null) out.push({ spec, kind: "static", typeOnly });
      }
    } else {
      let at = k + 1;
      let typeOnly = false;
      if (n1.t === "id" && n1.v === "type") {
        typeOnly = true;
        at = k + 2;
      }
      const head = tokens[at];
      if (head !== undefined && head.t === "p" && (head.v === "{" || head.v === "*")) {
        const spec = findFrom(tokens, at);
        if (spec !== null) out.push({ spec, kind: "reexport", typeOnly });
      }
    }
  }
  return out;
}

// ---- grafik ------------------------------------------------------------------------------------------------------------
export interface ImportGraph {
  files: string[];
  // dosya -> bağımlılıkları (bu dosyanın içe aktardığı depo içi dosyalar), sıralı ve tekil.
  imports: Map<string, string[]>;
  // dosya -> bağımlıları (onu içe aktaranlar), sıralı ve tekil.
  importers: Map<string, string[]>;
  // dosya -> dış içe aktarmalar (paket adı ya da "node:..."), sıralı ve tekil.
  external: Map<string, string[]>;
  stats: { edges: number; externalSpecs: number; unresolvedInSrc: number; outsideSrc: number; dynamic: number; skippedFiles: number };
  // Süre bütçesi aşıldı, kalan dosyalar taranmadı.
  truncated: boolean;
}

type Resolution = { kind: "internal"; path: string } | { kind: "external"; name: string } | { kind: "missing" } | { kind: "outside" };

export function resolveSpec(from: string, spec: string, known: ReadonlySet<string>): Resolution {
  if (!spec.startsWith("./") && !spec.startsWith("../")) {
    if (spec.startsWith("node:")) return { kind: "external", name: spec.slice(0, 80) };
    const parts = spec.split("/");
    const name = spec.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] as string);
    return { kind: "external", name: name.slice(0, 80) };
  }
  const base = posix.normalize(posix.join(posix.dirname(from), spec));
  if (base.startsWith("..") || posix.isAbsolute(base)) return { kind: "outside" };
  const candidates = [base, `${base}.ts`, `${base}.js`, `${base}.mjs`, `${base}/index.ts`, `${base}/index.js`];
  if (base.endsWith(".js")) candidates.push(`${base.slice(0, -3)}.ts`);
  if (base.endsWith(".mjs")) candidates.push(`${base.slice(0, -4)}.ts`);
  for (const c of candidates) if (known.has(c)) return { kind: "internal", path: c };
  return base.startsWith("src/") ? { kind: "missing" } : { kind: "outside" };
}

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export interface BuildOptions {
  // Ms cinsinden süre bütçesi (yalnız buildGraphAsync); aşılırsa kısmi grafik + truncated.
  budgetMs?: number;
}

interface FileScan {
  deps: Set<string>;
  ext: Set<string>;
  missing: number;
  outside: number;
  dynamic: number;
}

// Tek dosya taraması; iç içelik sınırı aşılırsa (ya da beklenmedik bir tarama hatasında) null: dosya atlanır.
function scanOneFile(f: ScannedFile, known: ReadonlySet<string>): FileScan | null {
  let refs: ImportRef[];
  try {
    refs = scanImports(f.content);
  } catch {
    return null;
  }
  const out: FileScan = { deps: new Set(), ext: new Set(), missing: 0, outside: 0, dynamic: 0 };
  for (const ref of refs) {
    if (ref.kind === "dynamic") out.dynamic++;
    const r = resolveSpec(f.path, ref.spec, known);
    if (r.kind === "internal") {
      if (r.path !== f.path) out.deps.add(r.path);
    } else if (r.kind === "external") out.ext.add(r.name);
    else if (r.kind === "missing") out.missing++;
    else out.outside++;
  }
  return out;
}

class GraphAccumulator {
  readonly code: ScannedFile[];
  readonly known: Set<string>;
  readonly imports = new Map<string, string[]>();
  readonly importers = new Map<string, Set<string>>();
  readonly external = new Map<string, string[]>();
  readonly stats = { edges: 0, externalSpecs: 0, unresolvedInSrc: 0, outsideSrc: 0, dynamic: 0, skippedFiles: 0 };

  constructor(files: ScannedFile[]) {
    this.code = files.filter((f) => CODE_EXTS.has(f.path.slice(f.path.lastIndexOf(".")).toLowerCase()));
    this.known = new Set(this.code.map((f) => f.path));
    for (const n of this.known) this.importers.set(n, new Set());
  }

  add(f: ScannedFile): void {
    const r = scanOneFile(f, this.known);
    if (r === null) {
      this.stats.skippedFiles++;
      this.imports.set(f.path, []);
      this.external.set(f.path, []);
      return;
    }
    this.imports.set(f.path, [...r.deps].sort(cmp));
    this.external.set(f.path, [...r.ext].sort(cmp));
    this.stats.edges += r.deps.size;
    this.stats.externalSpecs += r.ext.size;
    this.stats.unresolvedInSrc += r.missing;
    this.stats.outsideSrc += r.outside;
    this.stats.dynamic += r.dynamic;
    for (const d of r.deps) this.importers.get(d)?.add(f.path);
  }

  finish(): ImportGraph {
    const names = [...this.known].sort(cmp);
    const imp = new Map<string, string[]>();
    for (const n of names) imp.set(n, [...(this.importers.get(n) ?? [])].sort(cmp));
    for (const n of names) if (!this.imports.has(n)) this.imports.set(n, []);
    return { files: names, imports: this.imports, importers: imp, external: this.external, stats: this.stats, truncated: false };
  }
}

export function buildGraph(files: ScannedFile[]): ImportGraph {
  const acc = new GraphAccumulator(files);
  for (const f of acc.code) acc.add(f);
  return acc.finish();
}

// Süre bütçeli ve dosyalar arasında olay döngüsünü serbest bırakan sürüm; bütçe aşılırsa kalan dosyalar taranmaz (truncated=true).
export async function buildGraphAsync(files: ScannedFile[], opts: BuildOptions = {}): Promise<ImportGraph> {
  const deadline = performance.now() + (opts.budgetMs ?? BUILD_BUDGET_MS);
  const acc = new GraphAccumulator(files);
  let truncated = false;
  let n = 0;
  for (const f of acc.code) {
    if (performance.now() > deadline) {
      truncated = true;
      break;
    }
    acc.add(f);
    if (++n % 4 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
  }
  const g = acc.finish();
  g.truncated = truncated;
  return g;
}

// Tarjan (yinelemesiz): boyutu 1'den büyük (ya da kendi kendine bağımlı) güçlü bağlı bileşenler = döngüler.
export function findCycles(graph: ImportGraph): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  let counter = 0;
  for (const root of graph.files) {
    if (index.has(root)) continue;
    const work: Array<{ v: string; i: number }> = [{ v: root, i: 0 }];
    index.set(root, counter);
    low.set(root, counter++);
    stack.push(root);
    onStack.add(root);
    while (work.length > 0) {
      const frame = work[work.length - 1] as { v: string; i: number };
      const deps = graph.imports.get(frame.v) ?? [];
      if (frame.i < deps.length) {
        const w = deps[frame.i++] as string;
        if (!index.has(w)) {
          index.set(w, counter);
          low.set(w, counter++);
          stack.push(w);
          onStack.add(w);
          work.push({ v: w, i: 0 });
        } else if (onStack.has(w)) {
          low.set(frame.v, Math.min(low.get(frame.v) as number, index.get(w) as number));
        }
      } else {
        work.pop();
        const parent = work[work.length - 1];
        if (parent) low.set(parent.v, Math.min(low.get(parent.v) as number, low.get(frame.v) as number));
        if (low.get(frame.v) === index.get(frame.v)) {
          const comp: string[] = [];
          let w: string;
          do {
            w = stack.pop() as string;
            onStack.delete(w);
            comp.push(w);
          } while (w !== frame.v);
          if (comp.length > 1) cycles.push(comp.sort(cmp));
        }
      }
    }
  }
  return cycles.sort((a, b) => b.length - a.length || cmp(a[0] as string, b[0] as string));
}

// ---- dosya yolu doğrulaması ---------------------------------------------------------------------------------------------
// null = geçerli biçim. Yol ASLA dosya sistemine verilmez; yalnız tarama sonucundaki adlarla karşılaştırılır.
export function validateFileParam(file: string): string | null {
  if (file.length === 0 || file.length > 200) return "file 1..200 karakterlik göreli bir yol olmalı";
  if (file.includes("\\") || file.includes(":") || file.includes("\0") || file.startsWith("/") || file.split("/").includes("..")) return "file göreli olmalı (mutlak yol, '..', ':' ve '\\' kullanılamaz)";
  if (!FILE_PATH_RE.test(file)) return "file src/ altında bir dosya yolu olmalı (harf, rakam, . _ - ve /)";
  if (!CODE_EXTS.has(file.slice(file.lastIndexOf(".")).toLowerCase())) return "file bir .ts, .js ya da .mjs dosyası olmalı";
  return null;
}

// ---- etki analizi -------------------------------------------------------------------------------------------------------
export interface ImpactLayer {
  distance: number;
  files: string[];
  tests: string[];
}

export interface ImpactReport {
  file: string;
  depth: number;
  isTest: boolean;
  directImports: string[];
  externalImports: string[];
  layers: ImpactLayer[];
  affectedTests: Array<{ file: string; distance: number }>;
  radius: { direct: number; transitive: number; tests: number; unboundedTransitive: number; unboundedMaxDistance: number };
  inCycle: boolean;
  cycle: string[] | null;
  truncated: boolean;
  // Grafik eksik olabilir: süre bütçesi aşıldı ya da çözümlenemeyen dosya atlandı.
  graphIncomplete: boolean;
  note: string;
}

const isTestFile = (p: string): boolean => p.endsWith(".test.ts") || p.endsWith(".test.js") || p.endsWith(".test.mjs");

function bfs(graph: ImportGraph, start: string, maxDepth: number): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]]);
  let frontier = [start];
  for (let d = 1; d <= maxDepth && frontier.length > 0; d++) {
    const next: string[] = [];
    for (const f of frontier) {
      for (const imp of graph.importers.get(f) ?? []) {
        if (dist.has(imp)) continue;
        dist.set(imp, d);
        next.push(imp);
      }
    }
    frontier = next;
  }
  return dist;
}

export function analyzeImpact(graph: ImportGraph, file: string, depth: number): ImpactReport | null {
  if (!graph.imports.has(file)) return null;
  const bounded = bfs(graph, file, depth);
  const all = bfs(graph, file, graph.files.length);
  let remaining = LIST_CAP;
  let truncated = false;
  const layers: ImpactLayer[] = [];
  const affectedTests: ImpactReport["affectedTests"] = [];
  for (let d = 1; d <= depth; d++) {
    const at = [...bounded.entries()].filter(([, dd]) => dd === d).map(([f]) => f).sort(cmp);
    if (at.length === 0) break;
    const tests = at.filter(isTestFile);
    const files = at.filter((f) => !isTestFile(f));
    for (const t of tests) affectedTests.push({ file: t, distance: d });
    const keep = files.slice(0, Math.max(0, remaining));
    if (keep.length < files.length) truncated = true;
    remaining -= keep.length;
    layers.push({ distance: d, files: keep, tests });
  }
  const boundedOthers = [...bounded.keys()].filter((f) => f !== file);
  const cycle = findCycles(graph).find((c) => c.includes(file)) ?? null;
  return {
    file,
    depth,
    isTest: isTestFile(file),
    directImports: graph.imports.get(file) ?? [],
    externalImports: graph.external.get(file) ?? [],
    layers,
    affectedTests,
    radius: {
      direct: (graph.importers.get(file) ?? []).length,
      transitive: boundedOthers.length,
      tests: affectedTests.length,
      unboundedTransitive: all.size - 1,
      unboundedMaxDistance: Math.max(0, ...all.values()),
    },
    inCycle: cycle !== null,
    cycle: cycle ? cycle.slice(0, 20) : null,
    truncated,
    graphIncomplete: graph.truncated || graph.stats.skippedFiles > 0,
    note: "Yalnız statik/dinamik içe aktarmalar sayılır (dizgi ile kurulan yollar, ters bölü ile çözülen yüklemeler görünmez). Test dosyaları 'affectedTests' içinde ayrı listelenir. Bu bir kesinlik değil, kaynak taramasından çıkarılmış tahmini etkidir.",
  };
}

export interface GraphSummary {
  files: number;
  edges: number;
  externalImports: number;
  unresolvedInSrc: number;
  outsideSrc: number;
  dynamicImports: number;
  topDependedOn: Array<{ file: string; dependents: number }>;
  cycleCount: number;
  cycles: string[][];
  scan: { elapsedMs: number; skippedLarge: number; truncated: boolean; skippedUnparsable: number };
  note: string;
}

export function summarizeGraph(graph: ImportGraph, scan: { elapsedMs: number; skippedLarge: number; truncated: boolean }): GraphSummary {
  const top = graph.files
    .map((f) => ({ file: f, dependents: (graph.importers.get(f) ?? []).length }))
    .filter((x) => x.dependents > 0)
    .sort((a, b) => b.dependents - a.dependents || cmp(a.file, b.file))
    .slice(0, TOP_N);
  const cycles = findCycles(graph);
  return {
    files: graph.files.length,
    edges: graph.stats.edges,
    externalImports: graph.stats.externalSpecs,
    unresolvedInSrc: graph.stats.unresolvedInSrc,
    outsideSrc: graph.stats.outsideSrc,
    dynamicImports: graph.stats.dynamic,
    topDependedOn: top,
    cycleCount: cycles.length,
    cycles: cycles.slice(0, 20).map((c) => c.slice(0, 20)),
    scan: { ...scan, truncated: scan.truncated || graph.truncated, skippedUnparsable: graph.stats.skippedFiles },
    note: "Grafik yalnız src/ altındaki .ts/.js/.mjs dosyalarından çıkarılır (en çok 3000 dosya, dosya başına 300 KB, 2 sn bütçe); sınır aşılırsa scan.truncated=true olur.",
  };
}

export async function loadImportGraph(root: string): Promise<{ graph: ImportGraph; scan: { elapsedMs: number; skippedLarge: number; truncated: boolean } }> {
  const scan = await scanSrc(root, { exts: CODE_EXTS });
  return { graph: await buildGraphAsync(scan.files), scan: { elapsedMs: scan.elapsedMs, skippedLarge: scan.skippedLarge, truncated: scan.truncated } };
}
