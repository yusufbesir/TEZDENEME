// Teknik borç merkezi (madde 33, D8b): yerel sinyaller, KAYNAK GÖSTERİMLİ. Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// SALT OKUNUR, yerel, modelsiz, ağsız: yalnız verilen kökün src klasörünü (scan.ts bütçesiyle) ve package.json'u okur; hiçbir şey yazmaz.
// Yalnız SAYILAR ve örnekler (dosya:satır) döner: toplam puan, öncelik ya da yorum YOKTUR (uydurma yok). Beş sinyal:
//  (a) açık işaretçiler (yorum satırlarındaki büyük harfli iş/düzeltme notları; test dosyaları ve src/testing sayılmaz),
//  (b) kardeş test dosyası (aynı klasörde <ad>.test.ts|js|mjs) bulunmayan kaynak dosyalar (dolaylı test olabilir: bu yalnız doğrudan eşleşmedir),
//  (c) en büyük 10 dosya ve 600+ satırlık dosyalar, (d) içe aktarma döngüleri (impact.ts grafiği), (e) package.json'daki bildirilen sürümler.
// (e) için AĞ KONTROLÜ YAPILMAZ: güncel sürüm HER ZAMAN "bilinmiyor" yazılır. Tarama bütçesi (3000 dosya, 2 sn, dosya başına 300 KB) ve graphIncomplete bayrağı çıktıda görünür.
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { redactString } from "../core/audit/redact.ts";
import { buildGraphAsync, findCycles } from "./impact.ts";
import type { ImportGraph } from "./impact.ts";
import { MAX_FILES, MAX_FILE_BYTES, SCAN_BUDGET_MS, scanSrc } from "./scan.ts";
import type { ScannedFile } from "./scan.ts";

export const SAMPLE_CAP = 20;
export const LARGEST_N = 10;
export const BIG_FILE_LINES = 600;
export const MAX_PACKAGE_BYTES = 512 * 1024;
export const MAX_LINE_CHARS = 4096;
const CODE_EXTS: ReadonlySet<string> = new Set([".ts", ".js", ".mjs"]);
// İşaretçi sözcükleri parçalı yazılır: bu dosyanın kendi satırları işaretçi sayılmasın.
export const MARKER_WORDS: readonly string[] = ["TO" + "DO", "FIX" + "ME", "X".repeat(3), "HA" + "CK"];
const MARKER_RE = new RegExp(`(?<![A-Za-z0-9_])(${MARKER_WORDS.join("|")})(?![A-Za-z0-9_])`);
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export const isTestPath = (p: string): boolean => /\.test\.(?:ts|js|mjs)$/.test(p) || p.startsWith("src/testing/");

// ---- (a) işaretçiler -------------------------------------------------------------------------------------------------------
export interface MarkerHit {
  line: number;
  kind: string;
}

// Tek satırın yorum kısmı: TEK GEÇİŞ (kuadratik değil). Blok yorum durumu satırlar arasında taşınır; "://" (adres) yorum başlatmaz.
// Yaklaşık: dizgi içindeki "//" ya da "/*" da yorum başlangıcı SAYILIR (dizgi çözümlenmez); bu bilinen bir sınırdır ve çıktı notunda yazar.
function commentPart(line: string, state: { inBlock: boolean }): string {
  const n = line.length;
  let out = "";
  let seg = state.inBlock ? 0 : -1;
  let i = 0;
  while (i < n) {
    const c = line.charCodeAt(i);
    if (state.inBlock) {
      if (c === 42 && line.charCodeAt(i + 1) === 47) {
        out += `${line.slice(seg, i)} `;
        state.inBlock = false;
        seg = -1;
        i += 2;
      } else i++;
    } else if (c === 47) {
      const d = line.charCodeAt(i + 1);
      if (d === 47 && !(i > 0 && line.charCodeAt(i - 1) === 58)) return out + line.slice(i + 2);
      if (d === 42) {
        state.inBlock = true;
        i += 2;
        seg = i;
      } else i++;
    } else i++;
  }
  return state.inBlock && seg >= 0 ? out + line.slice(seg) : out;
}

// 4 KB'tan uzun satırlar (bundle/veri satırları) taranmaz ve sayılır.
export function findMarkers(content: string, stats?: { longLines: number }): MarkerHit[] {
  const out: MarkerHit[] = [];
  const state = { inBlock: false };
  let pos = 0;
  let line = 0;
  for (;;) {
    let end = content.indexOf("\n", pos);
    if (end < 0) end = content.length;
    line++;
    if (end - pos > MAX_LINE_CHARS) {
      if (stats) stats.longLines++;
    } else {
      const comment = commentPart(content.slice(pos, end), state);
      if (comment.length > 0) {
        const m = MARKER_RE.exec(comment);
        if (m) out.push({ line, kind: m[1] as string });
      }
    }
    if (end >= content.length) break;
    pos = end + 1;
  }
  return out;
}

// ---- (b) kardeş test --------------------------------------------------------------------------------------------------------
export function hasSiblingTest(path: string, known: ReadonlySet<string>): boolean {
  const dot = path.lastIndexOf(".");
  const stem = dot < 0 ? path : path.slice(0, dot);
  for (const ext of [".ts", ".js", ".mjs"]) if (known.has(`${stem}.test${ext}`)) return true;
  return false;
}

// ---- (c) boyut ---------------------------------------------------------------------------------------------------------------
export function lineCount(content: string): number {
  if (content.length === 0) return 0;
  let n = 1;
  for (let i = content.indexOf("\n"); i >= 0; i = content.indexOf("\n", i + 1)) n++;
  return content.endsWith("\n") ? n - 1 : n;
}

// ---- (e) bağımlılıklar ---------------------------------------------------------------------------------------------------------
export interface DependencyExample {
  name: string;
  section: string;
  declared: string;
  latest: "bilinmiyor";
}

export interface DependencyInfo {
  status: "ok" | "absent" | "unreadable";
  networkChecked: false;
  latestVersion: "bilinmiyor";
  count: number;
  bySection: Record<string, number>;
  examples: DependencyExample[];
}

const SECTIONS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"] as const;
const SEMVERISH = /^[0-9A-Za-z.^~<>=*|\s+_-]{1,80}$/;

export function parseDependencies(text: string | null): DependencyInfo {
  const base = { networkChecked: false as const, latestVersion: "bilinmiyor" as const, bySection: {} as Record<string, number>, examples: [] as DependencyExample[], count: 0 };
  if (text === null) return { status: "absent", ...base };
  let pkg: unknown;
  try {
    pkg = JSON.parse(text);
  } catch {
    return { status: "unreadable", ...base };
  }
  if (pkg === null || typeof pkg !== "object" || Array.isArray(pkg)) return { status: "unreadable", ...base };
  const all: DependencyExample[] = [];
  for (const section of SECTIONS) {
    const v = (pkg as Record<string, unknown>)[section];
    if (v === null || typeof v !== "object" || Array.isArray(v)) continue;
    const names = Object.keys(v as object).sort(cmp);
    base.bySection[section] = names.length;
    for (const name of names) {
      const raw = (v as Record<string, unknown>)[name];
      const declared = typeof raw === "string" && SEMVERISH.test(raw) && !raw.includes("://") ? raw.trim() : "(özel kaynak ya da biçim)";
      all.push({ name: redactString(name.replace(/[^\x20-\x7e]/g, "?").slice(0, 80)), section, declared: redactString(declared), latest: "bilinmiyor" });
    }
  }
  return { status: "ok", ...base, count: all.length, examples: all.slice(0, SAMPLE_CAP) };
}

async function readPackageJson(root: string): Promise<string | null | "unreadable"> {
  const p = join(root, "package.json");
  try {
    const st = await stat(p);
    if (!st.isFile()) return null;
    if (st.size > MAX_PACKAGE_BYTES) return "unreadable";
    return await readFile(p, "utf8");
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "ENOENT" ? null : "unreadable";
  }
}

// ---- rapor ------------------------------------------------------------------------------------------------------------------------
export interface TechDebtReport {
  scan: { filesScanned: number; maxFiles: number; budgetMs: number; maxFileBytes: number; elapsedMs: number; skippedLarge: number; truncated: boolean; graphIncomplete: boolean };
  markers: { words: string[]; longLinesSkipped: number; maxLineChars: number; count: number; filesWithMarkers: number; byKind: Record<string, number>; examples: string[]; sampleCap: number };
  untested: { sourceFiles: number; count: number; examples: string[]; sampleCap: number; basis: string };
  size: { largest: Array<{ file: string; lines: number }>; bigThreshold: number; bigCount: number; bigExamples: Array<{ file: string; lines: number }>; sampleCap: number };
  cycles: { count: number; examples: string[][]; sampleCap: number };
  dependencies: DependencyInfo;
  note: string;
}

export function analyzeTechDebt(files: ScannedFile[], graph: ImportGraph, scan: { elapsedMs: number; skippedLarge: number; truncated: boolean; maxFiles: number; budgetMs: number }, deps: DependencyInfo): TechDebtReport {
  const code = files.filter((f) => CODE_EXTS.has(f.path.slice(f.path.lastIndexOf(".")).toLowerCase())).sort((a, b) => cmp(a.path, b.path));
  const known = new Set(code.map((f) => f.path));

  const markerExamples: string[] = [];
  const byKind: Record<string, number> = {};
  const lineStats = { longLines: 0 };
  let markerCount = 0;
  let markerFiles = 0;
  for (const f of code) {
    if (isTestPath(f.path)) continue;
    const hits = findMarkers(f.content, lineStats);
    if (hits.length === 0) continue;
    markerFiles++;
    for (const h of hits) {
      markerCount++;
      byKind[h.kind] = (byKind[h.kind] ?? 0) + 1;
      if (markerExamples.length < SAMPLE_CAP) markerExamples.push(`${f.path}:${h.line}`);
    }
  }

  // Yalnız testlerce içe aktarılan dosyalar (test yardımcıları) test beklenen kaynak sayılmaz.
  const support = (p: string): boolean => {
    const imp = graph.importers.get(p) ?? [];
    return imp.length > 0 && imp.every(isTestPath);
  };
  const sources = code.filter((f) => !isTestPath(f.path) && !support(f.path));
  const untested = sources.filter((f) => !hasSiblingTest(f.path, known));

  const sized = code.map((f) => ({ file: f.path, lines: lineCount(f.content) }));
  const bySize = [...sized].sort((a, b) => b.lines - a.lines || cmp(a.file, b.file));
  const big = bySize.filter((x) => x.lines >= BIG_FILE_LINES);

  const cycles = findCycles(graph);
  return {
    scan: { filesScanned: files.length, maxFiles: scan.maxFiles, budgetMs: scan.budgetMs, maxFileBytes: MAX_FILE_BYTES, elapsedMs: scan.elapsedMs, skippedLarge: scan.skippedLarge, truncated: scan.truncated, graphIncomplete: scan.truncated || graph.truncated || graph.stats.skippedFiles > 0 },
    markers: { words: [...MARKER_WORDS], longLinesSkipped: lineStats.longLines, maxLineChars: MAX_LINE_CHARS, count: markerCount, filesWithMarkers: markerFiles, byKind, examples: markerExamples, sampleCap: SAMPLE_CAP },
    untested: { sourceFiles: sources.length, count: untested.length, examples: untested.slice(0, SAMPLE_CAP).map((f) => f.path), sampleCap: SAMPLE_CAP, basis: "Yalnız aynı klasörde <ad>.test.ts/.js/.mjs olup olmadığına bakılır; dolaylı test varsa bu yine de 'yok' sayılır." },
    size: { largest: bySize.slice(0, LARGEST_N), bigThreshold: BIG_FILE_LINES, bigCount: big.length, bigExamples: big.slice(0, SAMPLE_CAP), sampleCap: SAMPLE_CAP },
    cycles: { count: cycles.length, examples: cycles.slice(0, SAMPLE_CAP).map((c) => c.slice(0, SAMPLE_CAP)), sampleCap: SAMPLE_CAP },
    dependencies: deps,
    note: "Yalnız yerel sayımlar: toplam puan, öncelik ya da yorum yoktur; hiçbir sinyal 'borç miktarı' anlamına gelmez. İşaretçiler yorum satırlarında yaklaşık aranır (dizgi içindeki '//' ya da '/*' yorum sayılabilir; 4 KB'tan uzun satırlar atlanır ve markers.longLinesSkipped ile sayılır). 300 KB üstü dosyalar okunmaz (skippedLarge) ve boyut/işaretçi sayımına girmez. Güncel paket sürümleri için ağ kontrolü YAPILMADI: güncel sürüm bilinmiyor.",
  };
}

export async function buildTechDebt(root: string, opts: { budgetMs?: number; maxFiles?: number } = {}): Promise<TechDebtReport> {
  const scan = await scanSrc(root, { exts: CODE_EXTS, ...(opts.budgetMs !== undefined ? { budgetMs: opts.budgetMs } : {}), ...(opts.maxFiles !== undefined ? { maxFiles: opts.maxFiles } : {}) });
  const graph = await buildGraphAsync(scan.files, opts.budgetMs !== undefined ? { budgetMs: opts.budgetMs } : {});
  const pkg = await readPackageJson(root);
  const deps = pkg === "unreadable" ? parseDependencies("") : parseDependencies(pkg);
  return analyzeTechDebt(scan.files, graph, { elapsedMs: scan.elapsedMs, skippedLarge: scan.skippedLarge, truncated: scan.truncated, maxFiles: opts.maxFiles ?? MAX_FILES, budgetMs: opts.budgetMs ?? SCAN_BUDGET_MS }, deps);
}
