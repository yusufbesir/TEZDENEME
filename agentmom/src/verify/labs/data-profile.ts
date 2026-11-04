// Veri analizi laboratuvarı (madde 25, D8b): yerel dosya profili. Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// SALT OKUNUR, yerel, modelsiz, ağsız. Kullanıcı bir dosya yolu verir (CSV / TSV / JSON dizi / NDJSON, en çok 8 MB); yol politika denetiminden geçer
// (allowedDirs ya da trustedRepos içinde, forbiddenDirs/anahtar klasörü/sır dosyası adı DEĞİL) ve safe-read ile (sembolik bağ/sabit bağ yok) okunur.
// ÇIKTIDA HAM VERİ YOKTUR: hücre değerleri örnek olarak bile dönmez; yalnız toplulaştırılmış sayılar, sütun adları (redakte) ve işaretler.
// Duyarlı (sır kalıbı ya da duyarlı sütun adı) sütunlarda yalnız sayılar kalır (min/max bastırılır) ve 'duyarlı' uyarısı verilir.
// Sınırlar: tek geçiş; benzersiz sayacı sütun başına en çok MAX_DISTINCT; en çok MAX_ROWS satır (aşılırsa truncated=true); en çok MAX_COLUMNS sütun; süre bütçesi.
// CSV ayrıştırıcısı düzenli ifadesizdir (alan alan tarar): tırnaklı alan, "" kaçışı, tırnak içi satır sonu, CRLF/LF/CR ve BOM güvenlidir.
import { createHash } from "node:crypto";
import { basename, dirname, extname, isAbsolute } from "node:path";
import { redactString } from "../../core/audit/redact.ts";
import { classifyPath, classifyText } from "../../core/policy/data-boundary.ts";
import { canon, hasUnexpandedShortName, isInside, isInsideReal } from "../../core/policy/engine.ts";
import type { AutonomyContract } from "../../core/policy/types.ts";
import { readFileInside } from "./safe-read.ts";

export const MAX_PROFILE_BYTES = 8 * 1024 * 1024;
export const MAX_ROWS = 200_000;
export const MAX_COLUMNS = 200;
export const MAX_DISTINCT = 1000;
export const PROFILE_BUDGET_MS = 5000;
export const MOSTLY_EMPTY_RATIO = 0.8;
export const MAX_PATH_LENGTH = 400;
// Kodda gömülü yasak yerler (memory/export.ts'teki anahtar klasörü kalıbı + arşiv klasörü): sözleşme boş olsa da reddedilir.
const KEYS_FOLDER = /(^|[\\/])anahtarlar([\\/]|$)/i;
const ARCHIVE_FOLDER = /^d:[\\/]ar[şsŞ][iıİ]v([\\/]|$)/i;
const DEVICE_NAME = /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\..*)?$/i;
const PHONE = /^\+?[\d\s().-]{7,}$/;
const SECRET_SCAN_CHUNK = 500;
const WORK_STEP = 20_000;
const MAX_CELL_SCAN = 500;
const EXT_FORMAT: Record<string, DataFormat> = { ".csv": "csv", ".tsv": "tsv", ".json": "json", ".ndjson": "ndjson", ".jsonl": "ndjson" };
const NUMERIC = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d{1,4})?$/;
const SENSITIVE_NAME = /(pass(?:word|wd)?|parola|şifre|sifre|secret|token|api[-_ ]?key|authorization|credential|private[-_ ]?key|cookie|tckn|tc[-_ ]?kimlik|iban|ssn|card[-_ ]?(?:number|no)|kart[-_ ]?no)/i;
const CTRL = /[\u0000-\u001f\u007f-\u009f\u061C\u200B-\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const HAS_CTRL = /[\u0000-\u001f\u007f-\u009f\u061C\u200B-\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/;

export type DataFormat = "csv" | "tsv" | "json" | "ndjson";
export type ColumnType = "number" | "text" | "empty" | "mixed";
export type ProfileErrorCode = "bad_path" | "unsupported_type" | "secret_path" | "outside_policy" | "missing" | "too_large" | "unreadable" | "bad_format";

const MESSAGES: Record<ProfileErrorCode, string> = {
  bad_path: "path mutlak bir dosya yolu olmalı (en çok 400 karakter; denetim karakteri, '..' ve ':' ek akışı olamaz)",
  unsupported_type: "dosya türü desteklenmiyor (.csv, .tsv, .json, .ndjson, .jsonl)",
  secret_path: "bu yol gizli/yasak bir yer ya da sır dosyası olarak sınıflanıyor; profil çıkarılmaz",
  outside_policy: "dosya izinli klasörlerin (allowedDirs / trustedRepos) dışında",
  missing: "dosya yok ya da açılamadı",
  too_large: "dosya 8 MB sınırından büyük",
  unreadable: "dosya okunamadı (düzenli tek bir dosya olmalı; sembolik bağ ya da sabit bağ olamaz)",
  bad_format: "dosya içeriği seçilen türe göre okunamadı (JSON için dizi, NDJSON için satır başına bir nesne beklenir)",
};

export class DataProfileError extends Error {
  readonly code: ProfileErrorCode;
  constructor(code: ProfileErrorCode) {
    super(MESSAGES[code]);
    this.name = "DataProfileError";
    this.code = code;
  }
}

export type PolicyView = Pick<AutonomyContract, "allowedDirs" | "trustedRepos"> & Partial<Pick<AutonomyContract, "forbiddenDirs" | "sensitiveDirs">>;

// Gerçek (çözülmüş) konum denetimi: yasak/anahtar/arşiv klasörü, sır sınıfı, izinli klasör. Dosya açıldıktan sonra da (TOCTOU) aynı denetim yinelenir.
export function realLocationProblem(real: string, policy: PolicyView): ProfileErrorCode | null {
  if (KEYS_FOLDER.test(real) || ARCHIVE_FOLDER.test(real) || hasUnexpandedShortName(real)) return "secret_path";
  if ((policy.forbiddenDirs ?? []).some((d) => isInside(canon(d), real) || isInside(real, canon(d)))) return "secret_path";
  if (classifyPath(real, { forbiddenDirs: policy.forbiddenDirs ?? [], sensitiveDirs: [] }) === "secret") return "secret_path";
  if (![...policy.allowedDirs, ...policy.trustedRepos].some((dir) => isInside(canon(dir), real))) return "outside_policy";
  return null;
}

// Yol politika denetimi. SIRA: önce yalnız SÖZCÜKSEL denetimler (dosya sistemine/ağa dokunmaz: UNC, aygıt adı, izinli klasör ön denetimi), sonra gerçek konum.
export function checkProfilePath(path: unknown, policy: PolicyView): { format: DataFormat; pathClass: "internal" | "sensitive" } {
  if (typeof path !== "string" || path.length === 0 || path.length > MAX_PATH_LENGTH || HAS_CTRL.test(path) || !isAbsolute(path)) throw new DataProfileError("bad_path");
  // UNC (\\sunucu\paylaşım), \\?\ ve \\.\ aygıt yolları ve "//" ile başlayanlar: realpath/ağ erişimi tetiklememesi için hiç denenmez.
  if (/^[\\/]{2}/.test(path)) throw new DataProfileError("bad_path");
  const segments = path.split(/[\\/]/);
  if (segments.includes("..") || segments.some((x) => DEVICE_NAME.test(x))) throw new DataProfileError("bad_path");
  const drive = /^[A-Za-z]:/.test(path) ? 2 : 0;
  if (path.slice(drive).includes(":")) throw new DataProfileError("bad_path");
  const format = EXT_FORMAT[extname(path).toLowerCase()];
  if (format === undefined) throw new DataProfileError("unsupported_type");
  const dirs = [...policy.allowedDirs, ...policy.trustedRepos];
  if (!dirs.some((dir) => isInside(dir, path))) throw new DataProfileError("outside_policy");
  if (KEYS_FOLDER.test(path) || ARCHIVE_FOLDER.test(path) || (policy.forbiddenDirs ?? []).some((d) => isInside(d, path) || isInside(path, d))) throw new DataProfileError("secret_path");
  const problem = realLocationProblem(canon(path), policy);
  if (problem !== null) throw new DataProfileError(problem);
  const cls = classifyPath(path, { forbiddenDirs: policy.forbiddenDirs ?? [], sensitiveDirs: policy.sensitiveDirs ?? [] });
  return { format, pathClass: cls === "sensitive" ? "sensitive" : "internal" };
}

// ---- CSV okuyucu (düzenli ifadesiz) --------------------------------------------------------------------------------------------
export class CsvReader {
  pos = 0;
  unterminatedQuotes = 0;
  // Son kaydın GERÇEK alan sayısı (bellek için yalnız ilk MAX_COLUMNS+1 alan saklanır).
  fieldCount = 0;
  private readonly s: string;
  private readonly d: string;
  constructor(text: string, delimiter: string) {
    this.s = text;
    this.d = delimiter;
  }

  // Sonraki kayıt (alan dizisi) ya da veri bitti ise null.
  next(): string[] | null {
    const s = this.s;
    const d = this.d;
    const n = s.length;
    if (this.pos >= n) return null;
    const row: string[] = [];
    let count = 0;
    const keep = (v: string): void => {
      count++;
      this.fieldCount = count;
      if (row.length <= MAX_COLUMNS) row.push(v);
    };
    let i = this.pos;
    for (;;) {
      let end: number;
      if (i < n && s[i] === '"') {
        let buf = "";
        let j = i + 1;
        for (;;) {
          const q = s.indexOf('"', j);
          if (q < 0) {
            buf += s.slice(j);
            j = n;
            this.unterminatedQuotes++;
            break;
          }
          buf += s.slice(j, q);
          if (s[q + 1] === '"') {
            buf += '"';
            j = q + 2;
            continue;
          }
          j = q + 1;
          break;
        }
        end = j;
        while (end < n && s[end] !== d && s[end] !== "\n" && s[end] !== "\r") end++;
        keep(end > j ? buf + s.slice(j, end) : buf);
      } else {
        end = i;
        while (end < n && s[end] !== d && s[end] !== "\n" && s[end] !== "\r") end++;
        keep(s.slice(i, end));
      }
      i = end;
      if (i >= n) {
        this.pos = n;
        return row;
      }
      if (s[i] === d) {
        i++;
        if (i >= n) {
          keep("");
          this.pos = n;
          return row;
        }
        continue;
      }
      i += s[i] === "\r" && s[i + 1] === "\n" ? 2 : 1;
      this.pos = i;
      return row;
    }
  }
}

// ---- toplulaştırıcı ---------------------------------------------------------------------------------------------------------------
type Cell = { kind: "empty" } | { kind: "num"; key: string; value: number; scan: string | null } | { kind: "text"; key: string; scan: string | null };

function keyOf(s: string): string {
  return s.length > 128 ? `${s.slice(0, 128)}\u0001${s.length}` : s;
}

function cellFromString(raw: string): Cell {
  const t = raw.trim();
  if (t.length === 0) return { kind: "empty" };
  if (t.length <= 40 && NUMERIC.test(t)) {
    const v = Number(t);
    if (Number.isFinite(v)) return { kind: "num", key: t, value: v, scan: null };
  }
  return { kind: "text", key: keyOf(t), scan: t.length >= 6 ? t.slice(0, MAX_CELL_SCAN) : null };
}

function cellFromJson(v: unknown): Cell {
  if (v === undefined || v === null) return { kind: "empty" };
  if (typeof v === "number") return Number.isFinite(v) ? { kind: "num", key: String(v), value: v, scan: null } : { kind: "text", key: String(v), scan: null };
  if (typeof v === "string") {
    const t = v.trim();
    return t.length === 0 ? { kind: "empty" } : { kind: "text", key: keyOf(t), scan: t.length >= 6 ? t.slice(0, MAX_CELL_SCAN) : null };
  }
  if (typeof v === "boolean") return { kind: "text", key: v ? "true" : "false", scan: null };
  let s: string;
  try {
    s = JSON.stringify(v) ?? "";
  } catch {
    s = "[iç içe]";
  }
  return { kind: "text", key: keyOf(s), scan: s.length >= 6 ? s.slice(0, MAX_CELL_SCAN) : null };
}

class ColumnAcc {
  empty = 0;
  numeric = 0;
  text = 0;
  readonly distinct = new Set<string>();
  capped = false;
  secretCells = 0;
  readonly name: string;
  readonly nameSensitive: boolean;
  constructor(name: string) {
    this.name = name;
    this.nameSensitive = SENSITIVE_NAME.test(name) || name.startsWith("[gizli ad ");
  }
}

function entropyBits(t: string): number {
  const n = new Map<string, number>();
  for (const ch of t) n.set(ch, (n.get(ch) ?? 0) + 1);
  let h = 0;
  for (const k of n.values()) h -= (k / t.length) * Math.log2(k / t.length);
  return h;
}

// Ad, veri gibi görünüyorsa (e-posta, telefon, yalnız rakam, 20+ karakter, yüksek entropi) ya da sır kalıbı taşıyorsa maskelenir.
function nameLooksLikeData(s: string): boolean {
  return s.includes("@") || PHONE.test(s) || /^\d+$/.test(s) || s.length >= 20 || (s.length >= 12 && entropyBits(s) >= 3.6) || classifyText(s) === "secret";
}

function safeName(raw: string, index: number): string {
  const s = raw.replace(CTRL, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (s.length === 0) return `sütun ${index + 1}`;
  return nameLooksLikeData(s) ? `[gizli ad ${index + 1}]` : redactString(s);
}

// Başlıksız CSV: ilk satır veri gibiyse (e-posta/telefon/yalnız rakam ya da hücrelerin çoğu sayı) sütun adı OLARAK kullanılmaz.
function headerLooksLikeData(cells: string[]): boolean {
  let numeric = 0;
  for (const raw of cells) {
    const t = raw.trim();
    if (t.includes("@") || PHONE.test(t) || /^\d+$/.test(t)) return true;
    if (t.length > 0 && t.length <= 40 && NUMERIC.test(t)) numeric++;
  }
  return cells.length > 0 && numeric * 2 > cells.length;
}

class Profiler {
  readonly cols: ColumnAcc[] = [];
  readonly index = new Map<string, number>();
  // JSON/NDJSON: ham anahtar -> sütun (-1: sütun sınırı nedeniyle yok sayıldı) ve sütunun ham anahtarı.
  private readonly known = new Map<string, number>();
  private readonly rawKeys: string[] = [];
  rows = 0;
  duplicates = 0;
  ragged = 0;
  bad = 0;
  blank = 0;
  ignoredColumns = 0;
  secretCells = 0;
  work = 0;
  readonly notices: string[] = [];
  private readonly seen = new Set<string>();
  private pending: Array<{ col: number; text: string }> = [];

  addColumn(rawName: string): number {
    if (this.cols.length >= MAX_COLUMNS) {
      this.ignoredColumns++;
      return -1;
    }
    let name = safeName(rawName, this.cols.length);
    if (name.startsWith("[gizli ad ") && !this.notices.includes("names_masked")) this.notices.push("names_masked");
    if (this.index.has(name)) {
      let n = 2;
      while (this.index.has(`${name} (${n})`)) n++;
      name = `${name} (${n})`;
    }
    this.index.set(name, this.cols.length);
    this.cols.push(new ColumnAcc(name));
    return this.cols.length - 1;
  }

  cell(ci: number, c: Cell): void {
    const a = this.cols[ci] as ColumnAcc;
    this.work += c.kind === "empty" ? 1 : 1 + (c.scan === null ? 0 : c.scan.length >> 4);
    if (c.kind === "empty") {
      a.empty++;
      return;
    }
    if (c.kind === "num") {
      a.numeric++;
    } else {
      a.text++;
      if (c.scan !== null) {
        this.pending.push({ col: ci, text: c.scan });
        if (this.pending.length >= SECRET_SCAN_CHUNK) this.flush();
      }
    }
    if (!a.capped) {
      a.distinct.add(c.key);
      if (a.distinct.size >= MAX_DISTINCT) a.capped = true;
    }
  }

  // Parça parça sır taraması: önce birleşik metinde tek geçiş; yalnız pozitifse hücre hücre sayılır (yanlış pozitifler hücre düzeyinde elenir).
  flush(): void {
    if (this.pending.length === 0) return;
    const batch = this.pending;
    this.pending = [];
    if (classifyText(batch.map((p) => p.text).join("\n")) !== "secret") return;
    for (const p of batch) {
      if (classifyText(p.text) === "secret") {
        (this.cols[p.col] as ColumnAcc).secretCells++;
        this.secretCells++;
      }
    }
  }

  // JSON/NDJSON nesne satırı: yeni anahtar yeni sütundur (önceki satırlarda boştu); eksik anahtar boş hücredir.
  objectRow(row: Record<string, unknown>): void {
    for (const key of Object.keys(row)) {
      if (this.known.has(key) || this.known.size >= 5000) continue;
      const ci = this.addColumn(key);
      this.known.set(key, ci);
      if (ci >= 0) {
        this.rawKeys[ci] = key;
        (this.cols[ci] as ColumnAcc).empty += this.rows;
      }
    }
    for (let i = 0; i < this.cols.length; i++) {
      const key = this.rawKeys[i] as string;
      this.cell(i, cellFromJson(Object.hasOwn(row, key) ? row[key] : undefined));
    }
    let digest: string;
    try {
      digest = JSON.stringify(row);
    } catch {
      digest = String(this.rows);
    }
    this.rowSeen(digest);
  }

  // Satır özeti: yinelenen satır sayımı için kısaltılmış özet (satırın kendisi saklanmaz).
  rowSeen(rowKey: string): void {
    this.rows++;
    this.work += 2;
    const h = createHash("sha1").update(rowKey).digest("hex").slice(0, 20);
    if (this.seen.has(h)) this.duplicates++;
    else this.seen.add(h);
  }
}

export interface ProfileColumn {
  index: number;
  name: string;
  type: ColumnType;
  nonEmpty: number;
  emptyCount: number;
  emptyRatio: number;
  unique: number;
  uniqueCapped: boolean;
  numericCount: number;
  textCount: number;
  sensitive: boolean;
  flags: string[];
}

export interface DataProfile {
  format: DataFormat;
  pathClass: "internal" | "sensitive";
  bytes: number;
  rows: number;
  columnCount: number;
  ignoredColumns: number;
  columns: ProfileColumn[];
  duplicateRows: number;
  raggedRows: number;
  badRows: number;
  blankLines: number;
  notices: string[];
  anomalies: Array<{ column: string; kind: "mostly_empty" | "constant" | "mixed_type" }>;
  sensitive: { columns: number; cells: number; warning: boolean };
  truncated: boolean;
  truncatedBy: "rows" | "time" | null;
  limits: { maxBytes: number; maxRows: number; maxColumns: number; maxDistinct: number; mostlyEmptyRatio: number; budgetMs: number };
  note: string;
}

const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

interface RunOpts {
  maxRows: number;
  budgetMs: number;
}

// Tüm satır üreticileri için ortak döngü: sınır ve süre denetimi, olay döngüsüne düzenli geri verme.
async function consume(p: Profiler, nextRow: () => (() => void) | null, opts: RunOpts): Promise<"rows" | "time" | null> {
  const deadline = performance.now() + opts.budgetMs;
  let mark = p.work;
  for (;;) {
    const apply = nextRow();
    if (apply === null) return null;
    if (p.rows >= opts.maxRows) return "rows";
    apply();
    // Süre ve olay döngüsü denetimi işlenen hücre/bayt miktarına bağlıdır (satır sayısına değil): geniş ve kısa dosyalar da düzenli aralıkla yield eder.
    if (p.work - mark >= WORK_STEP) {
      mark = p.work;
      if (performance.now() > deadline) return "time";
      await tick();
    }
  }
}

async function runCsv(p: Profiler, text: string, delimiter: string, opts: RunOpts): Promise<"rows" | "time" | null> {
  const rd = new CsvReader(text, delimiter);
  interface Rec {
    cells: string[];
    count: number;
  }
  const readNonBlank = (): Rec | null => {
    for (;;) {
      const r = rd.next();
      if (r === null) return null;
      if (rd.fieldCount === 1 && (r[0] as string).length === 0) {
        p.blank++;
        continue;
      }
      return { cells: r, count: rd.fieldCount };
    }
  };
  const header = readNonBlank();
  if (header === null) return null;
  const ncols = header.count;
  const asData = headerLooksLikeData(header.cells);
  if (asData) p.notices.push("header_as_data");
  header.cells.forEach((h, i) => p.addColumn(asData ? `sütun ${i + 1}` : h));
  p.ignoredColumns = Math.max(0, ncols - MAX_COLUMNS);
  const kept = p.cols.length;
  const applyRow = (rec: Rec): void => {
    const r = rec.cells;
    if (rec.count !== ncols) p.ragged++;
    for (let i = 0; i < kept; i++) p.cell(i, i < r.length ? cellFromString(r[i] as string) : { kind: "empty" });
    p.rowSeen(r.join(""));
  };
  let first: Rec | null = asData ? header : null;
  return consume(
    p,
    () => {
      const r = first ?? readNonBlank();
      first = null;
      if (r === null) return null;
      return () => applyRow(r);
    },
    opts,
  );
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);


async function runJson(p: Profiler, text: string, opts: RunOpts): Promise<"rows" | "time" | null> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new DataProfileError("bad_format");
  }
  if (!Array.isArray(data)) throw new DataProfileError("bad_format");
  let i = 0;
  const r = await consume(
    p,
    () => {
      if (i >= data.length) return null;
      const el = data[i++];
      return () => {
        if (isPlainObject(el)) p.objectRow(el);
        else p.bad++;
      };
    },
    opts,
  );
  return r;
}

async function runNdjson(p: Profiler, text: string, opts: RunOpts): Promise<"rows" | "time" | null> {
  let pos = 0;
  const r = await consume(
    p,
    () => {
      for (;;) {
        if (pos >= text.length) return null;
        let end = text.indexOf("\n", pos);
        if (end < 0) end = text.length;
        const line = text.slice(pos, end).trim();
        pos = end + 1;
        if (line.length === 0) {
          p.blank++;
          continue;
        }
        return () => {
          let el: unknown;
          try {
            el = JSON.parse(line);
          } catch {
            p.bad++;
            return;
          }
          if (isPlainObject(el)) p.objectRow(el);
          else p.bad++;
        };
      }
    },
    opts,
  );
  return r;
}

export interface ProfileOptions {
  maxRows?: number;
  budgetMs?: number;
  maxBytes?: number;
}

export async function profileText(text: string, format: DataFormat, bytes: number, pathClass: "internal" | "sensitive", opts: ProfileOptions = {}): Promise<DataProfile> {
  const run: RunOpts = { maxRows: opts.maxRows ?? MAX_ROWS, budgetMs: opts.budgetMs ?? PROFILE_BUDGET_MS };
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const p = new Profiler();
  const stopped = format === "csv" ? await runCsv(p, body, ",", run) : format === "tsv" ? await runCsv(p, body, "\t", run) : format === "json" ? await runJson(p, body, run) : await runNdjson(p, body, run);
  p.flush();

  const columns: ProfileColumn[] = [];
  const anomalies: DataProfile["anomalies"] = [];
  let sensitiveColumns = 0;
  p.cols.forEach((a, index) => {
    const nonEmpty = a.numeric + a.text;
    const type: ColumnType = nonEmpty === 0 ? "empty" : a.text === 0 ? "number" : a.numeric === 0 ? "text" : "mixed";
    const sensitive = a.nameSensitive || a.secretCells > 0;
    if (sensitive) sensitiveColumns++;
    const ratio = p.rows > 0 ? a.empty / p.rows : 0;
    const flags: string[] = [];
    if (p.rows > 0 && ratio >= MOSTLY_EMPTY_RATIO) flags.push("mostly_empty");
    if (p.rows >= 2 && nonEmpty >= 2 && !a.capped && a.distinct.size === 1) flags.push("constant");
    if (type === "mixed") flags.push("mixed_type");
    for (const f of flags) anomalies.push({ column: a.name, kind: f as DataProfile["anomalies"][number]["kind"] });
    columns.push({
      index,
      name: a.name,
      type,
      nonEmpty,
      emptyCount: a.empty,
      emptyRatio: Math.round(ratio * 10000) / 10000,
      unique: a.distinct.size,
      uniqueCapped: a.capped,
      numericCount: a.numeric,
      textCount: a.text,
      sensitive,
      flags,
    });
  });
  return {
    format,
    pathClass,
    bytes,
    rows: p.rows,
    columnCount: columns.length,
    ignoredColumns: p.ignoredColumns,
    columns,
    duplicateRows: p.duplicates,
    raggedRows: p.ragged,
    badRows: p.bad,
    blankLines: p.blank,
    notices: p.notices,
    anomalies,
    sensitive: { columns: sensitiveColumns, cells: p.secretCells, warning: sensitiveColumns > 0 },
    truncated: stopped !== null,
    truncatedBy: stopped,
    limits: { maxBytes: opts.maxBytes ?? MAX_PROFILE_BYTES, maxRows: run.maxRows, maxColumns: MAX_COLUMNS, maxDistinct: MAX_DISTINCT, mostlyEmptyRatio: MOSTLY_EMPTY_RATIO, budgetMs: run.budgetMs },
    note: "Hücre değeri yok (örnek, en küçük/en büyük dahil); sütun adları kalıp taşıyorsa (e-posta, telefon, rakam, uzun ya da yüksek entropili) maskelenir. Yalnız tür, boş oranı, benzersiz sayısı (sütun başına en çok 1000'e kadar) ve anomali sayıları döner. Sayı algısı yalnız '.' ondalık ayraçlı yazımı tanır. Duyarlılık sezgiseldir; yanlış alarm ya da kaçırma olabilir. JSON'da tür JSON türünden gelir. Kesilen dosyada sayılar yalnız okunan satırlar içindir.",
  };
}

// Yol denetimi + güvenli okuma + profil. Hata: DataProfileError (sabit iletiler; yol ya da içerik sızdırılmaz).
export async function profileFile(path: string, policy: PolicyView, opts: ProfileOptions = {}): Promise<DataProfile> {
  const { format, pathClass } = checkProfilePath(path, policy);
  const maxBytes = opts.maxBytes ?? MAX_PROFILE_BYTES;
  const read = readFileInside(dirname(path), basename(path), maxBytes, (real) => realLocationProblem(real, policy) === null);
  if (!read.ok) throw new DataProfileError(read.reason === "missing" ? "missing" : read.reason === "too_large" ? "too_large" : "unreadable");
  return profileText(read.buf.toString("utf8"), format, read.buf.length, pathClass, opts);
}
