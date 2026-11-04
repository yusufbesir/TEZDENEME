// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Doğrulama laboratuvarı madde 59: test verisi soy ağacı (data lineage). Bir doğrulama koşusunun kullandığı veri dosyalarını (fixture) kaydeder:
// yol, sha256, boyut, git blob özeti (git varsa) ve "görevin kendisi mi değiştirdi" işareti. Kayıt JSON bir "report" kanıt dosyası olarak yazılır;
// verifyLineage dosyaları yeniden okuyup sapmaları (eksik / içerik değişti / boyut) raporlar.
// Güvenlik: yollar çalışma ağacı içinde kalmalı (sembolik bağ yok), dosya ≤ 8 MB, en çok 50 dosya, toplam ≤ 64 MB. git yalnız --stdin ile ve ağacın DIŞINDAN
// (cwd = geçici klasör) çalışır: çalışma ağacının .git yapılandırması/kancaları yüklenmez. Dosya içeriği kayda YAZILMAZ, yalnız özet yazılır.
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { buildChildEnv } from "../../providers/child-env.ts";
import { saveEvidence, sha256Of } from "../evidence-files.ts";
import type { EvidenceItem } from "../schema.ts";
import { LabSpecError, cleanText, reqString } from "./rules.ts";
import { readFileInside } from "./safe-read.ts";

export const LINEAGE_SCHEMA = "agentmom.lineage/1";
export const MAX_DATA_FILES = 50;
export const MAX_DATA_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_DATA_TOTAL_BYTES = 64 * 1024 * 1024;
export const DATA_EXTENSIONS = [".json", ".csv", ".tsv", ".txt", ".sql", ".yaml", ".yml", ".xml", ".ndjson", ".jsonl"] as const;
const GIT_BUDGET_MS = 15_000;

// Çalışma ağacına göreli, ileri bölülü, ".." / "." / boş parçasız, veri uzantılı en çok 50 dosya adı. Hata: LabSpecError.
export function validateDataFiles(v: unknown): string[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_DATA_FILES) throw new LabSpecError(`dataFiles must list 1 to ${MAX_DATA_FILES} files`);
  const seen = new Set<string>();
  return v.map((raw) => {
    const p = reqString(raw, "dataFiles[]", 300);
    if (p.includes("\\") || p.startsWith("/") || (p.length > 1 && p.charCodeAt(1) === 58)) throw new LabSpecError("dataFiles must be workspace-relative paths with forward slashes");
    if (p.split("/").some((x) => x === "" || x === "." || x === "..")) throw new LabSpecError("dataFiles must not contain empty, . or .. segments");
    const lower = p.toLowerCase();
    if (!DATA_EXTENSIONS.some((ext) => lower.endsWith(ext))) throw new LabSpecError(`dataFiles must have a data extension (${DATA_EXTENSIONS.join(", ")})`);
    if (seen.has(lower)) throw new LabSpecError("dataFiles must not repeat a file");
    seen.add(lower);
    return p;
  });
}

export interface LineageEntry {
  path: string;
  sha256: string;
  bytes: number;
  // `git hash-object --no-filters` çıktısı (git yoksa ya da çalışmazsa yok).
  gitBlob?: string;
  // changedFiles verildiyse: görev (uygulayıcı) bu dosyayı değiştirdi/ekledi mi?
  modifiedByTask?: boolean;
}

export interface LineageProblem {
  path: string;
  message: string;
}

export interface LineageInput {
  root: string;
  dataFiles: string[];
  runId: string;
  taskId?: string;
  // Görevin değiştirdiği dosyalar (çalışma ağacına göreli, git --name-only biçimi).
  changedFiles?: string[];
  // Kanıt dosyasının yazılacağı klasör.
  evidenceDir: string;
  now?: () => Date;
}

export interface LineageRecord {
  schema: typeof LINEAGE_SCHEMA;
  runId: string;
  taskId?: string;
  createdAt: string;
  entries: LineageEntry[];
  // Okunamayan (eksik / ağaç dışı / çok büyük ...) dosyalar: bunlar bir ARAÇ/GİRDİ (infra) sorunudur, kayıt eksiktir.
  problems: LineageProblem[];
  // Görevin değiştirdiği veri dosyaları (entries içinde modifiedByTask === true olanlar).
  modified: string[];
  evidence: EvidenceItem;
}

// Windows ve Linux'ta aynı yol aynı dosya sayılsın: ayırıcı, baştaki ./ ve büyük/küçük harf fark yaratmaz.
function normPath(p: string): string {
  let s = p.split("\\").join("/").toLowerCase();
  while (s.startsWith("./")) s = s.slice(2);
  return s;
}

function safeId(runId: string): string {
  let out = "";
  for (const ch of runId) {
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "-") out += ch;
    if (out.length >= 60) break;
  }
  return out || "run";
}

class GitHasher {
  private available = true;
  private readonly until = Date.now() + GIT_BUDGET_MS;

  hash(buf: Buffer): string | undefined {
    if (!this.available || Date.now() > this.until) return undefined;
    try {
      const out = execFileSync("git", ["hash-object", "--no-filters", "--stdin"], {
        input: buf,
        cwd: tmpdir(),
        env: { ...buildChildEnv(), GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null", GIT_CEILING_DIRECTORIES: tmpdir() },
        timeout: 5000,
        windowsHide: true,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
        maxBuffer: 4096,
      }).trim();
      if (out.length === 40 && [...out].every((c) => (c >= "0" && c <= "9") || (c >= "a" && c <= "f"))) return out;
      this.available = false;
      return undefined;
    } catch {
      // git kurulu değil / zaman aşımı: bu özet atlanır, kayıt yine de sha256 ile tamdır.
      this.available = false;
      return undefined;
    }
  }
}

export function recordLineage(input: LineageInput): LineageRecord {
  const files = validateDataFiles(input.dataFiles);
  const changed = input.changedFiles ? new Set(input.changedFiles.map(normPath)) : null;
  const git = new GitHasher();
  const entries: LineageEntry[] = [];
  const problems: LineageProblem[] = [];
  let total = 0;
  for (const rel of files) {
    const read = readFileInside(input.root, rel, MAX_DATA_FILE_BYTES);
    if (!read.ok) {
      problems.push({ path: cleanText(rel, 200), message: read.message });
      continue;
    }
    total += read.buf.length;
    if (total > MAX_DATA_TOTAL_BYTES) {
      problems.push({ path: cleanText(rel, 200), message: `the data files together are larger than ${MAX_DATA_TOTAL_BYTES / 1024 / 1024} MB` });
      break;
    }
    const gitBlob = git.hash(read.buf);
    entries.push({ path: rel, sha256: sha256Of(read.buf), bytes: read.buf.length, ...(gitBlob ? { gitBlob } : {}), ...(changed ? { modifiedByTask: changed.has(normPath(rel)) } : {}) });
  }
  const createdAt = (input.now ?? (() => new Date()))().toISOString();
  const runId = cleanText(input.runId, 100);
  const modified = entries.filter((e) => e.modifiedByTask === true).map((e) => e.path);
  const doc = { schema: LINEAGE_SCHEMA, runId, ...(input.taskId ? { taskId: cleanText(input.taskId, 100) } : {}), createdAt, entries, problems, modified };
  const evidence = saveEvidence(input.evidenceDir, `lineage-${safeId(input.runId)}`, "report", `test data lineage: ${entries.length} file(s), ${modified.length} modified by the task${problems.length ? `, ${problems.length} problem(s)` : ""}`, `${JSON.stringify(doc, null, 2)}\n`, "json");
  return { ...doc, schema: LINEAGE_SCHEMA, evidence };
}

export type DeviationKind = "missing" | "changed" | "size" | "unreadable";

export interface LineageDeviation {
  path: string;
  kind: DeviationKind;
  expected: { sha256: string; bytes: number };
  actual?: { sha256: string; bytes: number };
}

export interface LineageVerification {
  ok: boolean;
  deviations: LineageDeviation[];
}

function checkEntries(entries: unknown): LineageEntry[] {
  if (!Array.isArray(entries) || entries.length > MAX_DATA_FILES) throw new LabSpecError(`lineage entries must be a list of at most ${MAX_DATA_FILES}`);
  return entries.map((raw) => {
    const e = raw as Partial<LineageEntry> | null;
    if (e === null || typeof e !== "object" || typeof e.path !== "string" || typeof e.sha256 !== "string" || e.sha256.length !== 64 || typeof e.bytes !== "number" || !Number.isInteger(e.bytes) || e.bytes < 0) throw new LabSpecError("a lineage entry needs path, sha256 (64 hex) and bytes");
    validateDataFiles([e.path]);
    return e as LineageEntry;
  });
}

// Kaydı yeniden okur: her dosya şimdi diskte nasıl? Sapma yoksa ok === true.
export function verifyLineage(entries: LineageEntry[], root: string): LineageVerification {
  const deviations: LineageDeviation[] = [];
  for (const e of checkEntries(entries)) {
    const expected = { sha256: e.sha256, bytes: e.bytes };
    const read = readFileInside(root, e.path, MAX_DATA_FILE_BYTES);
    if (!read.ok) {
      deviations.push({ path: e.path, kind: read.reason === "missing" ? "missing" : read.reason === "too_large" ? "size" : "unreadable", expected });
      continue;
    }
    const actual = { sha256: sha256Of(read.buf), bytes: read.buf.length };
    if (actual.bytes !== e.bytes) deviations.push({ path: e.path, kind: "size", expected, actual });
    else if (actual.sha256 !== e.sha256) deviations.push({ path: e.path, kind: "changed", expected, actual });
  }
  return { ok: deviations.length === 0, deviations };
}
