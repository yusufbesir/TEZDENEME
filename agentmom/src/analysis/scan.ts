// Sistem analitiği (D8b) için depo dosyası tarayıcısı. Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// YALNIZ OKUR: yalnız verilen kökün altındaki src klasörünü gezer (sembolik bağlar atlanır), hiçbir şey yazmaz, ağ ve model yok.
// Sınırlar: dosya başına en çok MAX_FILE_BYTES, toplam en çok MAX_FILES dosya, süre bütçesi (varsayılan 2 sn). Sınır aşılırsa truncated=true (sessizce eksik bırakmaz).
// Olay döngüsü: dosyalar arasında düzenli aralıkla setImmediate ile denetim sunucuya geri verilir.
import { lstat, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

export const MAX_FILE_BYTES = 300 * 1024;
export const MAX_FILES = 3000;
export const SCAN_BUDGET_MS = 2000;
const YIELD_EVERY = 8;
const SKIP_DIRS = new Set(["node_modules", ".git"]);

export interface ScannedFile {
  // Depo köküne göre, "/" ayraçlı ("src/...").
  path: string;
  content: string;
}

export interface ScanResult {
  files: ScannedFile[];
  skippedLarge: number;
  truncated: boolean;
  elapsedMs: number;
}

export interface ScanOptions {
  exts: ReadonlySet<string>;
  maxFiles?: number;
  maxBytes?: number;
  budgetMs?: number;
}

const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
}

// src altındaki dosya yollarını (sıralı, "/" ayraçlı) döndürür. Dizin okunamazsa o dizin atlanır.
async function listPaths(root: string, exts: ReadonlySet<string>, limit: number, deadline: number): Promise<{ paths: string[]; truncated: boolean }> {
  const out: string[] = [];
  let truncated = false;
  const stack: string[] = ["src"];
  while (stack.length > 0) {
    if (performance.now() > deadline) {
      truncated = true;
      break;
    }
    const rel = stack.pop() as string;
    let entries;
    try {
      entries = await readdir(join(root, rel), { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const dirs: string[] = [];
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      const child = `${rel}/${e.name}`;
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) dirs.push(child);
      } else if (e.isFile() && exts.has(extOf(e.name))) {
        if (out.length >= limit) {
          truncated = true;
        } else out.push(child);
      }
    }
    for (let i = dirs.length - 1; i >= 0; i--) stack.push(dirs[i] as string);
    await tick();
  }
  out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { paths: out, truncated };
}

export async function scanSrc(root: string, opts: ScanOptions): Promise<ScanResult> {
  const started = performance.now();
  const deadline = started + (opts.budgetMs ?? SCAN_BUDGET_MS);
  const maxBytes = opts.maxBytes ?? MAX_FILE_BYTES;
  const listed = await listPaths(root, opts.exts, opts.maxFiles ?? MAX_FILES, deadline);
  const files: ScannedFile[] = [];
  let skippedLarge = 0;
  let truncated = listed.truncated;
  let n = 0;
  for (const p of listed.paths) {
    if (performance.now() > deadline) {
      truncated = true;
      break;
    }
    if (++n % YIELD_EVERY === 0) await tick();
    try {
      const abs = join(root, p);
      const st = await lstat(abs);
      if (!st.isFile()) continue;
      if (st.size > maxBytes) {
        skippedLarge++;
        continue;
      }
      files.push({ path: p, content: await readFile(abs, "utf8") });
    } catch {
      // Okunamayan dosya atlanır; ayrıntı yanıta yazılmaz.
    }
  }
  return { files, skippedLarge, truncated, elapsedMs: Math.round(performance.now() - started) };
}
