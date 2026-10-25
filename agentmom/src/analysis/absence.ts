// Eksiklik / fazlalık dedektörü (madde 83, D8b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// SALT OKUNUR, modelsiz, ağsız. Hepsi BİLGİ niteliğindedir: silme ya da değiştirme ÖNERMEZ, kesinlik iddia etmez ("görünmüyor" dili). Kaynak taraması metin eşleştirmesidir;
// dizgi birleştirmeyle kurulan yollar ya da dışarıdan (başka depo, betik) yapılan çağrılar görünmez. Tarama sınırlı ve süre bütçelidir (src/, en çok 3000 dosya, dosya başına 300 KB, 2 sn).
// (a) KULLANILMAYAN: kodda (testler hariç) başvurusu görünmeyen tablolar (009_rea gibi bilinçli bırakılanlar notla işaretlenir); hiçbir istemci (arayüz / CLI-masaüstü / test) tarafından
//     çağrısı görünmeyen HTTP uçları; sağlayıcı kayıt defterinde beyan edilip adaptör dışı kodda hiç kullanılmayan yetenekler.
// (b) EKSİK: kontrol listesindeki Planlı maddelerin dilim dağılımı; arayüzde görünmeyen yönetim (GET dışı) uçları; kendisini doğrudan içe aktaran test dosyası görünmeyen src modülleri.
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { extractRoutes, firstSentence, leadingComment } from "../docs/autodoc.ts";
import { OFFERED_STATUSES } from "./snapshot.ts";
import type { ProviderSnapshot } from "./snapshot.ts";
import { buildGraphAsync } from "./impact.ts";
import { scanSrc } from "./scan.ts";
import type { ScannedFile } from "./scan.ts";

export const LIST_CAP = 200;
export const ANALYZE_BUDGET_MS = 2000;
const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const CHECKLIST_FILE = "docs/status/100-yetenek-durum.json";
const CHECKLIST_MAX = 1024 * 1024;
const SCAN_EXTS: ReadonlySet<string> = new Set([".ts", ".js", ".mjs", ".html", ".sql"]);
const MIGRATIONS_DIR = "src/core/db/migrations/";
// Bilinçli bırakılan migrasyonlar (tabloları henüz kodda kullanılmayabilir): not, migrasyon başlığından alınır.
export const DELIBERATE_MIGRATIONS: readonly string[] = ["009_rea.sql"];
// Adaptör gövdeleri ve tanım dosyası "kullanım" sayılmaz (yetenek beyan eden taraftır, çağıran değil).
const ADAPTER_FILES = new Set(["src/providers/claude-code.ts", "src/providers/codex.ts", "src/providers/gemini.ts", "src/providers/cli-adapter.ts", "src/providers/contract.ts"]);

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const isTest = (p: string): boolean => /\.test\.(ts|js|mjs)$/.test(p);
const cap = <T>(xs: T[]): { items: T[]; total: number; truncated: boolean } => ({ items: xs.slice(0, LIST_CAP), total: xs.length, truncated: xs.length > LIST_CAP });

function isWordChar(c: string | undefined): boolean {
  return c !== undefined && ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === "_");
}

// Sözcük sınırlı arama (düzenli ifade yok).
export function hasWord(text: string, word: string): boolean {
  let from = 0;
  for (;;) {
    const i = text.indexOf(word, from);
    if (i < 0) return false;
    if (!isWordChar(text[i - 1]) && !isWordChar(text[i + word.length])) return true;
    from = i + 1;
  }
}

// ---- tablolar ----------------------------------------------------------------------------------------------------------
export interface TableRef {
  table: string;
  migration: string;
}

// `CREATE TABLE [IF NOT EXISTS] ad` ifadelerinin tablo adları (metin taraması).
export function tablesIn(sql: string): string[] {
  const lower = sql.toLowerCase();
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const i = lower.indexOf("create table", from);
    if (i < 0) break;
    let j = i + "create table".length;
    const skipWs = (): void => {
      while (j < lower.length && (lower[j] === " " || lower[j] === "\n" || lower[j] === "\r" || lower[j] === "\t")) j++;
    };
    skipWs();
    if (lower.startsWith("if not exists", j)) {
      j += "if not exists".length;
      skipWs();
    }
    let k = j;
    while (k < lower.length && isWordChar(lower[k])) k++;
    if (k > j) out.push(lower.slice(j, k));
    from = Math.max(k, i + 1);
  }
  return out;
}

// ---- uç yolları --------------------------------------------------------------------------------------------------------
// "/api/tasks/:id/{a|b}" ve "[/x|y]" kalıplarını somut yollara açar (en çok 60 varyant).
export function expandPath(path: string): string[] {
  let variants = [path];
  for (let guard = 0; guard < 6; guard++) {
    const next: string[] = [];
    let changed = false;
    for (const v of variants) {
      const a = v.indexOf("{");
      const b = a < 0 ? -1 : v.indexOf("}", a);
      const c = v.indexOf("[/");
      const d = c < 0 ? -1 : v.indexOf("]", c);
      if (a >= 0 && b > a && (c < 0 || a < c)) {
        for (const alt of v.slice(a + 1, b).split("|")) next.push(v.slice(0, a) + alt + v.slice(b + 1));
        changed = true;
      } else if (c >= 0 && d > c) {
        next.push(v.slice(0, c) + v.slice(d + 1));
        for (const alt of v.slice(c + 2, d).split("|")) next.push(`${v.slice(0, c)}/${alt}${v.slice(d + 1)}`);
        changed = true;
      } else next.push(v);
    }
    variants = [...new Set(next)].slice(0, 60);
    if (!changed) break;
  }
  return variants;
}

// Bir yolun sabit parçaları (":id" / ":param" yer tutucularından bölünür).
function fragmentsOf(path: string): string[] {
  return path.split(/:id|:param/).filter((f) => f.length > 0);
}

// Metinde yol çağrılmış görünüyor mu: tüm sabit parçalar aynı dosyada; tek parçalı (sabit) yolda ek olarak sonraki karakter yol karakteri olmamalı.
export function mentionsRoute(text: string, path: string): boolean {
  for (const variant of expandPath(path)) {
    const frags = fragmentsOf(variant);
    if (frags.length === 0) continue;
    if (!frags.every((f) => text.includes(f))) continue;
    if (frags.length > 1) return true;
    const f = frags[0] as string;
    let from = 0;
    for (;;) {
      const i = text.indexOf(f, from);
      if (i < 0) break;
      const nx = text[i + f.length];
      if (nx === undefined || !(isWordChar(nx) || nx === "-" || nx === "/")) return true;
      from = i + 1;
    }
  }
  return false;
}

type Client = "ui" | "cli" | "test";

function clientOf(p: string): Client | null {
  if (isTest(p)) return "test";
  if (p.startsWith("src/server/ui/") && (p.endsWith(".js") || p.endsWith(".html"))) return "ui";
  if (p.startsWith("src/cli/") || p.startsWith("src/desktop/")) return "cli";
  return null;
}

// ---- rapor -------------------------------------------------------------------------------------------------------------
export interface AbsenceReport {
  unused: {
    tables: { items: Array<{ table: string; migration: string; referencedByTests: boolean; deliberate: boolean; note: string }>; total: number; truncated: boolean };
    endpoints: { items: Array<{ method: string; path: string }>; total: number; truncated: boolean };
    endpointsOnlyTests: { items: Array<{ method: string; path: string }>; total: number; truncated: boolean };
    capabilities: { items: Array<{ operation: string; declaredBy: string[] }>; total: number; truncated: boolean };
  };
  missing: {
    plannedBySlice: Array<{ slice: string; count: number; items: Array<{ n: number; title: string }> }>;
    plannedTotal: number | null;
    endpointsWithoutUi: { items: Array<{ method: string; path: string; clients: string[] }>; total: number; truncated: boolean };
    modulesWithoutDirectTest: { items: string[]; total: number; truncated: boolean };
  };
  scan: { files: number; elapsedMs: number; skippedLarge: number; truncated: boolean; skippedUnparsable: number };
  note: string;
}

export interface AbsenceInput {
  files: ScannedFile[];
  checklistJson: string | null;
  providers: ProviderSnapshot[];
  scan: { elapsedMs: number; skippedLarge: number; truncated: boolean };
}

function plannedBySlice(json: string | null): { rows: AbsenceReport["missing"]["plannedBySlice"]; total: number | null } {
  if (json === null) return { rows: [], total: null };
  let parsed: { items?: Array<{ n?: unknown; tr?: unknown; durum?: unknown; dilim?: unknown }> };
  try {
    parsed = JSON.parse(json) as typeof parsed;
  } catch {
    return { rows: [], total: null };
  }
  const items = Array.isArray(parsed.items) ? parsed.items.filter((i) => i && i.durum === "Planlı") : [];
  const groups = new Map<string, Array<{ n: number; title: string }>>();
  for (const i of items) {
    const slice = typeof i.dilim === "string" && i.dilim.length > 0 ? i.dilim.slice(0, 20) : "(dilim yok)";
    groups.set(slice, [...(groups.get(slice) ?? []), { n: typeof i.n === "number" ? i.n : 0, title: typeof i.tr === "string" ? i.tr.slice(0, 120) : "" }]);
  }
  const rows = [...groups.entries()]
    .map(([slice, list]) => ({ slice, count: list.length, items: list.sort((a, b) => a.n - b.n).slice(0, 60) }))
    .sort((a, b) => cmp(a.slice, b.slice));
  return { rows, total: items.length };
}

// Süre bütçeli ve dosyalar/aşamalar arasında olay döngüsünü serbest bırakır; bütçe aşılırsa bulgular kısmidir ve scan.truncated=true olur.
export async function analyzeAbsence(input: AbsenceInput, budgetMs = ANALYZE_BUDGET_MS): Promise<AbsenceReport> {
  const deadline = performance.now() + budgetMs;
  let cut = false;
  const over = (): boolean => {
    if (performance.now() > deadline) cut = true;
    return cut;
  };
  const { files } = input;
  const codeFiles = files.filter((f) => !f.path.startsWith(MIGRATIONS_DIR) && !f.path.endsWith(".sql") && !isTest(f.path));
  const testFiles = files.filter((f) => isTest(f.path));

  // Tablolar.
  const tableRefs: TableRef[] = [];
  const migNote = new Map<string, string>();
  for (const f of files) {
    if (!f.path.startsWith(MIGRATIONS_DIR) || !f.path.endsWith(".sql") || f.path.endsWith(".down.sql")) continue;
    const name = f.path.slice(f.path.lastIndexOf("/") + 1);
    migNote.set(name, firstSentence(leadingComment(f.content), 160));
    for (const t of tablesIn(f.content)) tableRefs.push({ table: t, migration: name });
  }
  const unref: TableRef[] = [];
  for (const t of tableRefs) {
    if (over()) break;
    if (!codeFiles.some((f) => hasWord(f.content, t.table))) unref.push(t);
    await tick();
  }
  const tables = unref
    .map((t) => {
      const deliberate = DELIBERATE_MIGRATIONS.includes(t.migration);
      return {
        table: t.table,
        migration: t.migration,
        referencedByTests: testFiles.some((f) => hasWord(f.content, t.table)),
        deliberate,
        note: deliberate ? `bilinçli bırakılmış (${t.migration}): ${migNote.get(t.migration) || "başlık açıklaması yok"}` : "kodda (testler hariç) başvurusu görünmüyor; yalnız bilgi",
      };
    })
    .sort((a, b) => cmp(a.migration, b.migration) || cmp(a.table, b.table));

  // Uç yolları.
  const appFile = files.find((f) => f.path === "src/server/app.ts");
  const routes = appFile ? extractRoutes(appFile.content).routes : [];
  const clientTexts = new Map<Client, string[]>([["ui", []], ["cli", []], ["test", []]]);
  for (const f of files) {
    const c = clientOf(f.path);
    if (c) (clientTexts.get(c) as string[]).push(f.content);
  }
  const clientsFor = (path: string): Client[] => (["ui", "cli", "test"] as const).filter((c) => (clientTexts.get(c) as string[]).some((t) => mentionsRoute(t, path)));
  const routeClients: Array<{ method: string; path: string; clients: Client[] }> = [];
  for (const r of routes) {
    if (over()) break;
    routeClients.push({ ...r, clients: clientsFor(r.path) });
    if (routeClients.length % 8 === 0) await tick();
  }
  const none = routeClients.filter((r) => r.clients.length === 0).map((r) => ({ method: r.method, path: r.path }));
  const testOnly = routeClients.filter((r) => r.clients.length === 1 && r.clients[0] === "test").map((r) => ({ method: r.method, path: r.path }));
  const noUi = routeClients.filter((r) => r.method !== "GET" && r.path.startsWith("/api/") && !r.clients.includes("ui")).map((r) => ({ method: r.method, path: r.path, clients: r.clients as string[] }));

  // Beyan edilip kullanılmayan yetenekler (adaptör, tanım, test ve analiz dosyaları hariç).
  const declared = new Map<string, string[]>();
  for (const p of input.providers) for (const c of p.capabilities) if (OFFERED_STATUSES.includes(c.status)) declared.set(c.operation, [...(declared.get(c.operation) ?? []), p.id]);
  const users = codeFiles.filter((f) => !ADAPTER_FILES.has(f.path) && !f.path.startsWith("src/testing/") && !f.path.startsWith("src/analysis/") && !f.path.endsWith(".html"));
  const capabilities = [...declared.entries()]
    .filter(([op]) => !users.some((f) => f.content.includes(`.${op}(`) || f.content.includes(`.${op}?.(`) || f.content.includes(`"${op}"`) || f.content.includes(`'${op}'`)))
    .map(([operation, by]) => ({ operation, declaredBy: by.sort(cmp) }))
    .sort((a, b) => cmp(a.operation, b.operation));

  // Planlı maddeler.
  const planned = plannedBySlice(input.checklistJson);

  // Doğrudan testi görünmeyen modüller (içe aktarma grafiği: kendisini içe aktaran bir test dosyası var mı).
  await tick();
  const graph = await buildGraphAsync(files, { budgetMs: Math.max(50, deadline - performance.now()) });
  if (graph.truncated) cut = true;
  const noTest = graph.files
    .filter((f) => f.endsWith(".ts") && !isTest(f) && !f.endsWith(".d.ts") && !f.startsWith("src/testing/"))
    .filter((f) => !(graph.importers.get(f) ?? []).some(isTest))
    .sort(cmp);

  return {
    unused: { tables: cap(tables), endpoints: cap(none), endpointsOnlyTests: cap(testOnly), capabilities: cap(capabilities) },
    missing: { plannedBySlice: planned.rows, plannedTotal: planned.total, endpointsWithoutUi: cap(noUi), modulesWithoutDirectTest: cap(noTest) },
    scan: { files: files.length, ...input.scan, truncated: input.scan.truncated || cut, skippedUnparsable: graph.stats.skippedFiles },
    note: "Yalnız bilgi: silme ya da değiştirme önerisi değildir. Tarama metin eşleştirmesidir; dizgi birleştirmeyle kurulan yollar, dış betikler/depolar ve dinamik çağrılar görünmez, bu yüzden 'görünmüyor' demek 'kullanılmıyor' demek değildir. 'Doğrudan test görünmüyor' modülün dolaylı olarak test edilmediği anlamına gelmez.",
  };
}

export async function loadAbsenceInputs(root: string, providers: ProviderSnapshot[]): Promise<AbsenceInput> {
  const scan = await scanSrc(root, { exts: SCAN_EXTS });
  let checklistJson: string | null = null;
  try {
    const file = join(root, CHECKLIST_FILE);
    if ((await stat(file)).size <= CHECKLIST_MAX) checklistJson = await readFile(file, "utf8");
  } catch {
    checklistJson = null;
  }
  return { files: scan.files, checklistJson, providers, scan: { elapsedMs: scan.elapsedMs, skippedLarge: scan.skippedLarge, truncated: scan.truncated } };
}
