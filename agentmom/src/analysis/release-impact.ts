// Sürüm etki analizi (madde 29, D8b): iki git başvurusu arasında değişen dosyalar ve etkileri. Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// SALT OKUNUR: yalnız `git rev-parse --verify` ve `git diff --name-status` çalışır (execFile, kabuk YOK, sabit bağımsız değişkenler, zaman aşımı, çıktı sınırı, `--` ayracı);
// yazma, checkout, fetch, ağ, model YOK. Başvurular KATI doğrulanır (başı tire ya da "..", "@{", boşluk, özel karakter yok) ve git'e yalnız çözülmüş tam sha ile verilir.
// Etki, ŞU ANKİ çalışma ağacının import grafiğinden hesaplanır (impact.ts grafiği; silinmiş ya da grafikte olmayan dosya için etki 'bilinmiyor' sayılır, uydurulmaz).
// Uç (API/arayüz) değişimi çözümlenmez: yalnız dosya düzeyinde "sunucu/arayüz dosyası değişti" bilgisi verilir. git yoksa/başvuru yoksa/zaman aşımında dürüst "okunamadı".
import { execFile } from "node:child_process";
import type { ExecFileOptionsWithStringEncoding } from "node:child_process";
import { dirname, resolve } from "node:path";
import { redactString } from "../core/audit/redact.ts";
import { buildChildEnv } from "../providers/child-env.ts";
import { buildGraphAsync } from "./impact.ts";
import type { ImportGraph } from "./impact.ts";
import { scanSrc } from "./scan.ts";
import { hasSiblingTest, isTestPath } from "./tech-debt.ts";

export const MAX_REF_LENGTH = 100;
export const MAX_ANALYZED_FILES = 50;
export const MAX_LISTED_CHANGES = 200;
export const LIST_CAP = 50;
export const GIT_TIMEOUT_MS = 8000;
export const GIT_MAX_OUTPUT = 2 * 1024 * 1024;
export const MIGRATIONS_DIR = "src/core/db/migrations/";
const CODE_EXTS: ReadonlySet<string> = new Set([".ts", ".js", ".mjs"]);
const REF_CHARS = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const NULL_DEV = process.platform === "win32" ? "NUL" : "/dev/null";
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// null = geçerli. Başvuru ASLA seçenek gibi okunamaz: ilk karakter harf/rakam, ".." ve "//" yok, "@" "{" "~" "^" ":" "\" "?" "*" "[" boşluk yok.
export function validateRef(ref: unknown): string | null {
  if (typeof ref !== "string" || ref.length === 0) return "başvuru (branch, etiket ya da sha) gerekli";
  if (ref.length > MAX_REF_LENGTH) return `başvuru en çok ${MAX_REF_LENGTH} karakter olabilir`;
  if (!REF_CHARS.test(ref)) return "başvuru harf ya da rakamla başlamalı ve yalnız harf, rakam, . _ - / içermeli (boşluk, '@{', '~', '^', ':' ve ters bölü kabul edilmez)";
  if (ref.includes("..") || ref.includes("//") || ref.endsWith("/") || ref.endsWith(".") || ref.endsWith(".lock")) return "başvuru biçimi geçersiz ('..', '//', sonda '/', '.' ya da '.lock' olamaz)";
  return null;
}

export type ReleaseFailureCode = "git_missing" | "git_failed" | "timeout" | "output_limit" | "ref_not_found" | "bad_output" | "unsafe_config";
const REASONS: Record<ReleaseFailureCode, string> = {
  git_missing: "git çalıştırılamadı (kurulu değil ya da bulunamadı)",
  git_failed: "git komutu başarısız oldu (bu klasör bir git deposu olmayabilir)",
  timeout: "git zaman aşımına uğradı",
  output_limit: "git çıktısı sınırı aştı (çok fazla değişen dosya)",
  ref_not_found: "başvurulardan biri bu depoda bulunamadı",
  bad_output: "git çıktısı okunamadı",
  unsafe_config: "deponun yerel git yapılandırmasında tehlikeli bir anahtar var; güvenlik için hiçbir git komutu (diff) çalıştırılmadı",
};

// Depo-yerel yapılandırmada bulunursa depo güvenilmez sayılır (model-runner.ts DANGEROUS_CONFIG yaklaşımı + kısmi klon/promisor ve ağ anahtarları):
// komut/filtre/kanca/pager çalıştırabilen ya da ağa (tembel getirme) çıkabilen anahtarlar.
export const DANGEROUS_CONFIG = /^(filter\.|diff\.external$|diff\..*\.(command|textconv)|merge\..*\.driver|core\.(hookspath|fsmonitor|sshcommand|pager|editor|askpass|gitproxy|attributesfile|excludesfile|worktree)|include\.|includeif\.|alias\.|credential\.|protocol\.|receive\.|uploadpack\.|url\.|extensions\.partialclone|remote\..*\.(promisor|partialclonefilter|uploadpack|receivepack|vcs|proxy)|http\.|ssh\.|gpg\.|pager\.)/i;

type GitResult = { ok: true; stdout: string } | { ok: false; code: ReleaseFailureCode; exit?: number };

// Süreç AĞACINI öldürür: Windows'ta taskkill /T /F /PID (kabuk yok), diğerlerinde süreç grubu. Bitince çözülür.
function killTree(pid: number | undefined): Promise<void> {
  return new Promise((done) => {
    if (pid === undefined) return done();
    if (process.platform === "win32") {
      try {
        execFile("taskkill", ["/T", "/F", "/PID", String(pid)], { windowsHide: true }, () => done());
      } catch {
        done();
      }
      return;
    }
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // süreç zaten bitmiş
      }
    }
    done();
  });
}

export interface CommandOptions {
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  maxBuffer: number;
}

// Kabuksuz, zaman aşımlı, çıktı sınırlı komut çalıştırıcı; zaman aşımında ve çıktı sınırında tüm süreç ağacı öldürülür.
export function runCommand(bin: string, args: string[], o: CommandOptions): Promise<GitResult> {
  return new Promise((done) => {
    let timedOut = false;
    let overflow = false;
    let seen = 0;
    let timer: NodeJS.Timeout | undefined;
    let child: ReturnType<typeof execFile>;
    try {
      child = execFile(bin, args, { cwd: o.cwd, env: o.env, windowsHide: true, maxBuffer: o.maxBuffer, encoding: "utf8", detached: process.platform !== "win32" } as ExecFileOptionsWithStringEncoding, (err, stdout) => {
        if (timer) clearTimeout(timer);
        // Süre dolduktan sonra biten komutun sonucu da zaman aşımı sayılır (öldürme yarışı sonucu belirsizleştirmesin).
        if (timedOut) return done({ ok: false, code: "timeout" });
        if (!err) return done({ ok: true, stdout });
        const e = err as NodeJS.ErrnoException & { killed?: boolean };
        if (e.code === "ENOENT") return done({ ok: false, code: "git_missing" });
        if (overflow || e.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") return done({ ok: false, code: "output_limit" });
        if (timedOut || e.killed === true) return done({ ok: false, code: "timeout" });
        return done({ ok: false, code: "git_failed", ...(typeof e.code === "number" ? { exit: e.code } : {}) });
      });
    } catch {
      return done({ ok: false, code: "git_missing" });
    }
    child.stdout?.on("data", (d: string) => {
      seen += d.length;
      if (seen > o.maxBuffer && !overflow) {
        overflow = true;
        void killTree(child.pid);
      }
    });
    timer = setTimeout(() => {
      timedOut = true;
      void killTree(child.pid).then(() => child.kill());
    }, o.timeoutMs);
  });
}

function runGit(root: string, bin: string, args: string[], timeoutMs: number): Promise<GitResult> {
  const env = {
    ...buildChildEnv(),
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
    // Kısmi klon/promisor depolarında eksik nesne için ağa çıkılmasın.
    GIT_NO_LAZY_FETCH: "1",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: NULL_DEV,
    GIT_ATTR_NOSYSTEM: "1",
    // Üst klasörlerdeki başka bir depo bulunmasın: kök kendisi depo olmalı.
    GIT_CEILING_DIRECTORIES: dirname(resolve(root)),
  };
  return runCommand(bin, ["-c", "protocol.allow=never", "-c", "core.fsmonitor=false", "-c", "core.pager=cat", "-c", "core.quotepath=false", "-c", "diff.external=", ...args], { cwd: root, env, timeoutMs, maxBuffer: GIT_MAX_OUTPUT });
}

// Tehlikeli depo-yerel anahtar varsa adını döndürür (DEĞERİ döndürmez); yoksa null. Yapılandırma okunamazsa hata sonucu.
async function unsafeConfigKey(root: string, bin: string, timeoutMs: number): Promise<{ key: string | null } | { fail: ReleaseFailureCode; exit?: number }> {
  const r = await runGit(root, bin, ["config", "--local", "--list", "-z"], timeoutMs);
  if (!r.ok) return { fail: r.code, ...(r.exit !== undefined ? { exit: r.exit } : {}) };
  for (const entry of r.stdout.split("\u0000")) {
    const key = (entry.split("\n")[0] ?? "").trim();
    if (key && DANGEROUS_CONFIG.test(key)) return { key: key.replace(/[^A-Za-z0-9._-]/g, "?").slice(0, 80) };
  }
  return { key: null };
}

const SHA = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

async function resolveRef(root: string, bin: string, ref: string, timeoutMs: number): Promise<{ ok: true; sha: string } | { ok: false; code: ReleaseFailureCode }> {
  const r = await runGit(root, bin, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], timeoutMs);
  if (!r.ok) return r.code === "git_failed" && r.exit === 1 ? { ok: false, code: "ref_not_found" } : { ok: false, code: r.code };
  const sha = r.stdout.trim();
  return SHA.test(sha) ? { ok: true, sha } : { ok: false, code: "bad_output" };
}

export interface ChangedFile {
  status: string;
  file: string;
}

// `git diff --name-status --no-renames -z` çıktısı: DURUM\0yol\0 ...
export function parseNameStatus(out: string): ChangedFile[] | null {
  const parts = out.split("\u0000");
  if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
  if (parts.length % 2 !== 0) return null;
  const res: ChangedFile[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const status = (parts[i] as string).slice(0, 1);
    if (!/^[A-Z]$/.test(status)) return null;
    res.push({ status, file: (parts[i + 1] as string).split("\\").join("/") });
  }
  return res.sort((a, b) => cmp(a.file, b.file));
}

// Yol çıktıya yalnız denetim karakterlerinden arındırılıp kırpılarak ve sır kalıpları maskelenerek konur.
const cleanPath = (p: string): string => redactString(p.replace(/[\u0000-\u001f\u007f-\u009f\u061C\u200B-\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/g, "?")).slice(0, 200);

function dependentsOf(graph: ImportGraph, start: string): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    for (const imp of graph.importers.get(queue[i] as string) ?? []) {
      if (imp === start || seen.has(imp)) continue;
      seen.add(imp);
      queue.push(imp);
    }
  }
  return seen;
}

export interface ReleaseFileImpact {
  file: string;
  status: string;
  inGraph: boolean;
  isTest: boolean;
  directDependents: number | null;
  dependentFiles: number | null;
  dependentTests: number | null;
}

export interface ReleaseImpactOk {
  status: "ok";
  from: string;
  to: string;
  resolved: { from: string; to: string };
  changes: { total: number; byStatus: Record<string, number>; listed: ChangedFile[]; listTruncated: boolean };
  srcChanged: { count: number; analyzed: number; notAnalyzed: number; analyzedCap: number };
  files: ReleaseFileImpact[];
  radius: { files: number; tests: number; basis: string };
  untestedChanged: { count: number; examples: string[] };
  migrations: { changed: string[]; count: number; warning: string | null };
  surface: { serverRouteFileChanged: boolean; uiFilesChanged: number; endpointLevel: "çözümlenmedi" };
  scan: { truncated: boolean; graphIncomplete: boolean; elapsedMs: number };
  note: string;
}

export interface ReleaseImpactFail {
  status: "unreadable";
  code: ReleaseFailureCode;
  reason: string;
  // unsafe_config: tehlikeli yapılandırma anahtarının ADI (değeri asla yazılmaz).
  key?: string;
}

export type ReleaseImpactReport = ReleaseImpactOk | ReleaseImpactFail;

const fail = (code: ReleaseFailureCode): ReleaseImpactFail => ({ status: "unreadable", code, reason: REASONS[code] });

export interface ReleaseOptions {
  gitBin?: string;
  timeoutMs?: number;
}

export async function analyzeRelease(root: string, from: string, to: string, opts: ReleaseOptions = {}): Promise<ReleaseImpactReport> {
  if (validateRef(from) !== null || validateRef(to) !== null) throw new Error("geçersiz başvuru");
  const bin = opts.gitBin ?? "git";
  const timeoutMs = opts.timeoutMs ?? GIT_TIMEOUT_MS;
  const cfg = await unsafeConfigKey(root, bin, timeoutMs);
  if ("fail" in cfg) return fail(cfg.fail);
  if (cfg.key !== null) return { ...fail("unsafe_config"), key: cfg.key };
  const a = await resolveRef(root, bin, from, timeoutMs);
  if (!a.ok) return fail(a.code);
  const b = await resolveRef(root, bin, to, timeoutMs);
  if (!b.ok) return fail(b.code);
  const diff = await runGit(root, bin, ["diff", "--name-status", "--no-renames", "--no-ext-diff", "--no-textconv", "-z", a.sha, b.sha, "--"], timeoutMs);
  if (!diff.ok) return fail(diff.code);
  const changed = parseNameStatus(diff.stdout);
  if (changed === null) return fail("bad_output");

  const scan = await scanSrc(root, { exts: CODE_EXTS });
  const graph = await buildGraphAsync(scan.files);
  const known = new Set(scan.files.map((f) => f.path));
  const support = (p: string): boolean => {
    const imp = graph.importers.get(p) ?? [];
    return imp.length > 0 && imp.every(isTestPath);
  };

  const byStatus: Record<string, number> = {};
  for (const c of changed) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;

  const isSrcCode = (p: string): boolean => p.startsWith("src/") && CODE_EXTS.has(p.slice(p.lastIndexOf(".")).toLowerCase());
  const srcChanged = changed.filter((c) => isSrcCode(c.file));
  const analyzedList = srcChanged.slice(0, MAX_ANALYZED_FILES);
  const changedSet = new Set(analyzedList.map((c) => c.file));
  const unionFiles = new Set<string>();
  const unionTests = new Set<string>();
  const files: ReleaseFileImpact[] = analyzedList.map((c) => {
    const inGraph = c.status !== "D" && graph.imports.has(c.file);
    const base = { file: cleanPath(c.file), status: c.status, isTest: isTestPath(c.file) };
    if (!inGraph) return { ...base, inGraph: false, directDependents: null, dependentFiles: null, dependentTests: null };
    const deps = dependentsOf(graph, c.file);
    let nf = 0;
    let nt = 0;
    for (const d of deps) {
      if (isTestPath(d)) {
        nt++;
        if (!changedSet.has(d)) unionTests.add(d);
      } else {
        nf++;
        if (!changedSet.has(d)) unionFiles.add(d);
      }
    }
    return { ...base, inGraph: true, directDependents: (graph.importers.get(c.file) ?? []).length, dependentFiles: nf, dependentTests: nt };
  });

  const untested = srcChanged.filter((c) => c.status !== "D" && !isTestPath(c.file) && known.has(c.file) && !support(c.file) && !hasSiblingTest(c.file, known)).map((c) => cleanPath(c.file));
  const migrations = changed.filter((c) => c.file.startsWith(MIGRATIONS_DIR)).map((c) => cleanPath(`${c.status} ${c.file}`));
  return {
    status: "ok",
    from,
    to,
    resolved: { from: a.sha.slice(0, 12), to: b.sha.slice(0, 12) },
    changes: { total: changed.length, byStatus, listed: changed.slice(0, MAX_LISTED_CHANGES).map((c) => ({ status: c.status, file: cleanPath(c.file) })), listTruncated: changed.length > MAX_LISTED_CHANGES },
    srcChanged: { count: srcChanged.length, analyzed: analyzedList.length, notAnalyzed: srcChanged.length - analyzedList.length, analyzedCap: MAX_ANALYZED_FILES },
    files,
    radius: { files: unionFiles.size, tests: unionTests.size, basis: "Analiz edilen değişen dosyaların (en çok 50) bağımlılarının birleşimi; değişen dosyaların kendisi sayılmaz." },
    untestedChanged: { count: untested.length, examples: untested.slice(0, LIST_CAP) },
    migrations: { changed: migrations.slice(0, 20), count: migrations.length, warning: migrations.length > 0 ? "Veritabanı migrasyonu değişti: bu sürüm mevcut veritabanlarının şemasını etkileyebilir; geri alma ve yedek planını elle gözden geçirin." : null },
    surface: { serverRouteFileChanged: changed.some((c) => c.file === "src/server/app.ts"), uiFilesChanged: changed.filter((c) => c.file.startsWith("src/server/ui/") && !isTestPath(c.file)).length, endpointLevel: "çözümlenmedi" },
    scan: { truncated: scan.truncated, graphIncomplete: scan.truncated || graph.truncated || graph.stats.skippedFiles > 0, elapsedMs: scan.elapsedMs },
    note: "Etki, şu anki çalışma ağacının içe aktarma grafiğinden hesaplanır; seçilen başvurulardaki dosya içerikleri okunmaz. Silinmiş ya da grafikte olmayan dosyanın etkisi bilinmiyor. API/arayüz uç değişimi çözümlenmez (yalnız dosya düzeyinde bilgi). Hiçbir şey yazılmaz, getirilmez ya da çıkış (checkout) yapılmaz.",
  };
}
