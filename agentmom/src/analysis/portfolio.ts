// Çoklu proje portföyü (madde 15, D9). Sahip: Claude [İP:AgentMom devam]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// SALT OKUNUR, yerel, modelsiz, ağsız, git çalıştırmaz: projeler = sözleşmenin trustedRepos listesi (başka kaynak YOK, yol uydurulmaz).
// Her proje için yalnız küçük dosyalar okunur: .git/HEAD (dal ya da ayrık sha) ve package.json (ad, sürüm). Bulunamayan alan null = bilinmiyor.
// UNC / aygıt yolları dosya sistemine dokunmadan reddedilir (SMB'ye gidip sunucuyu dondurmasın); en çok 50 proje, dosya başına 64 KB.
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, statSync } from "node:fs";
import { basename, join } from "node:path";

export const MAX_PROJECTS = 50;
const MAX_FILE_BYTES = 64 * 1024;

export type ProjectStatus = "ok" | "missing" | "not_directory" | "rejected";

export interface PortfolioProject {
  path: string;
  name: string;
  status: ProjectStatus;
  isGitRepo: boolean | null;
  branch: string | null;
  detachedHead: string | null;
  packageName: string | null;
  packageVersion: string | null;
}

export interface PortfolioReport {
  projects: PortfolioProject[];
  total: number;
  truncated: boolean;
  summary: { ok: number; missing: number; notDirectory: number; rejected: number; gitRepos: number };
  notes: string[];
}

const NOTES = [
  "Projeler yalnız sözleşmedeki trustedRepos listesinden gelir; listede olmayan klasör görünmez.",
  "Dal bilgisi .git/HEAD dosyasından okunur (git çalıştırılmaz); worktree/submodule (.git dosyası) depo sayılır ama dal bilinmez; kirli/temiz durumu ve görev sayısı bu sürümde YOK.",
  "Sembolik bağ/junction kökleri reddedilir; eşlenmiş AĞ SÜRÜCÜSÜ (Z:\\) yerel diskten ayırt edilemez ve yavaşsa isteği geciktirebilir.",
];

const DEVICE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
// Yalnız MUTLAK yollar (sürücü harfi ya da tek eğik çizgiyle başlayan POSIX); UNC/aygıt öneki, "..", ADS (:), boş bayt, aygıt adı bileşeni, sonu nokta/boşluk bileşeni reddedilir.
function unsafePath(p: string): boolean {
  if (p.includes("\0") || /^[\\/]{2}/.test(p)) return true;
  const absolute = /^[A-Za-z]:[\\/]/.test(p) || /^\/(?![\\/])/.test(p);
  if (!absolute) return true;
  if (/:[^\\/]/.test(p.replace(/^[A-Za-z]:/, ""))) return true;
  return p.split(/[\\/]+/).some((c) => c === ".." || DEVICE.test(c) || /[. ]$/.test(c) && c !== "" && c !== ".");
}

// TOCTOU'ya karşı: açılmış tanıtıcı üzerinden fstat + en çok MAX_FILE_BYTES okuma; sembolik bağ izlenmez (O_NOFOLLOW varsa).
function readSmall(file: string): string | null {
  let fd: number | null = null;
  try {
    if (lstatSync(file).isSymbolicLink()) return null;
    fd = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const st = fstatSync(fd);
    if (!st.isFile() || st.size > MAX_FILE_BYTES) return null;
    const buf = Buffer.alloc(Math.min(st.size, MAX_FILE_BYTES));
    const n = readSync(fd, buf, 0, buf.length, 0);
    return buf.subarray(0, n).toString("utf8").replace(/^\uFEFF/, "");
  } catch {
    return null;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

const text = (v: unknown): string | null => (typeof v === "string" && v.length > 0 && v.length <= 200 ? v.replace(/[\u0000-\u001f]/g, "") : null);

function describe(path: string): PortfolioProject {
  const base: PortfolioProject = { path, name: basename(path.replace(/[\\/]+$/, "")) || path, status: "ok", isGitRepo: null, branch: null, detachedHead: null, packageName: null, packageVersion: null };
  if (unsafePath(path)) return { ...base, status: "rejected" };
  let st;
  try {
    // Proje kökü sembolik bağ/junction ise izlenmez (yetki dışı hedefe, UNC'ye gidilmesin).
    if (lstatSync(path).isSymbolicLink()) return { ...base, status: "rejected" };
    st = statSync(path);
  } catch {
    return { ...base, status: "missing" };
  }
  if (!st.isDirectory()) return { ...base, status: "not_directory" };
  let gitEntry: ReturnType<typeof lstatSync> | null = null;
  try {
    gitEntry = lstatSync(join(path, ".git"));
  } catch {
    gitEntry = null;
  }
  // .git bir DOSYA ise (worktree/submodule: "gitdir: ...") depodur ama hedef izlenmez, dal bilinmiyor.
  const head = gitEntry?.isDirectory() === true ? readSmall(join(path, ".git", "HEAD")) : null;
  if (gitEntry === null) base.isGitRepo = false;
  else if (gitEntry.isSymbolicLink()) base.isGitRepo = null;
  else if (gitEntry.isFile()) base.isGitRepo = true;
  else if (head === null) base.isGitRepo = false;
  else {
    base.isGitRepo = true;
    const line = head.split(/\r?\n/)[0]?.trim() ?? "";
    const ref = /^ref: refs\/heads\/(.{1,200})$/.exec(line);
    if (ref) base.branch = text(ref[1]);
    else if (/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(line)) base.detachedHead = line.slice(0, 12);
  }
  const pkg = readSmall(join(path, "package.json"));
  if (pkg !== null) {
    try {
      const j: unknown = JSON.parse(pkg);
      if (j !== null && typeof j === "object" && !Array.isArray(j)) {
        base.packageName = text((j as Record<string, unknown>).name);
        base.packageVersion = text((j as Record<string, unknown>).version);
      }
    } catch {
      /* bozuk package.json = bilinmiyor */
    }
  }
  return base;
}

export function buildPortfolio(trustedRepos: readonly string[]): PortfolioReport {
  const unique = [...new Set(trustedRepos)];
  const projects = unique.slice(0, MAX_PROJECTS).map(describe);
  return {
    projects,
    total: unique.length,
    truncated: unique.length > MAX_PROJECTS,
    summary: {
      ok: projects.filter((p) => p.status === "ok").length,
      missing: projects.filter((p) => p.status === "missing").length,
      notDirectory: projects.filter((p) => p.status === "not_directory").length,
      rejected: projects.filter((p) => p.status === "rejected").length,
      gitRepos: projects.filter((p) => p.isGitRepo === true).length,
    },
    notes: NOTES,
  };
}
