// Release records (Faz 11, D9f, madde 22). Owner: Claude [İP:AgentMom devam]. ADR-016: runs only when the user asks (scripts/surum.mjs); nothing here runs by itself.
// READ-ONLY about the project: it reads package.json, the lockfile, the git HEAD (by reading .git files, never by running git) and the status counts, previews the next version
// number and renders release notes. The only write is a NEW file docs/surumler/<version>.md (exclusive create: an existing record is never overwritten). It never bumps
// package.json, tags, publishes, installs or updates anything; there is no installer and no auto-update here.
import { createHash } from "node:crypto";
import { closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readSync, realpathSync, writeFileSync, constants } from "node:fs";
import { isAbsolute, join, resolve, sep } from "node:path";
import { redactString } from "../core/audit/redact.ts";

export class ReleaseError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ReleaseError";
    this.code = code;
  }
}

const MAX_BYTES = 2_000_000;
const NPM_NAME = /^(?:@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*$/;
// Strict MAJOR.MINOR.PATCH (no leading zeros, no prerelease/build): anything else is refused instead of guessed.
const SEMVER = /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/;
export type BumpKind = "patch" | "minor" | "major";
export const BUMP_KINDS: readonly BumpKind[] = ["patch", "minor", "major"];

export interface Semver {
  major: number;
  minor: number;
  patch: number;
}

export function parseSemver(v: unknown): Semver {
  const m = typeof v === "string" ? SEMVER.exec(v) : null;
  if (!m) throw new ReleaseError("invalid_version", "version must be MAJOR.MINOR.PATCH (digits only, no leading zeros, no prerelease)");
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

export function formatSemver(s: Semver): string {
  return `${s.major}.${s.minor}.${s.patch}`;
}

export function compareSemver(a: string, b: string): number {
  const x = parseSemver(a);
  const y = parseSemver(b);
  return x.major - y.major || x.minor - y.minor || x.patch - y.patch;
}

export function nextVersion(current: string, kind: string): string {
  if (!BUMP_KINDS.includes(kind as BumpKind)) throw new ReleaseError("invalid_kind", "kind must be patch, minor or major");
  const c = parseSemver(current);
  const next = kind === "major" ? { major: c.major + 1, minor: 0, patch: 0 } : kind === "minor" ? { major: c.major, minor: c.minor + 1, patch: 0 } : { major: c.major, minor: c.minor, patch: c.patch + 1 };
  const text = formatSemver(next);
  parseSemver(text); // the result must satisfy the same rules as the input (no number the parser itself would refuse)
  return text;
}

// One descriptor: symlinks, non-files and oversized files are refused; the bytes returned are the bytes checked.
function readRegular(p: string, label: string): Buffer {
  let l;
  try {
    l = lstatSync(p);
  } catch {
    throw new ReleaseError("missing_file", `${label} was not found`);
  }
  if (!l.isFile() || l.isSymbolicLink()) throw new ReleaseError("invalid_file", `${label} must be a regular file (no symlink)`);
  const fd = openSync(p, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const st = fstatSync(fd);
    if (!st.isFile() || st.size > MAX_BYTES) throw new ReleaseError("invalid_file", `${label} is not a regular file or is larger than 2 MB`);
    const buf = Buffer.alloc(st.size);
    let off = 0;
    while (off < buf.length) {
      const n = readSync(fd, buf, off, buf.length - off, off);
      if (n <= 0) break;
      off += n;
    }
    return buf.subarray(0, off);
  } finally {
    closeSync(fd);
  }
}

function optionalRegular(p: string, label: string): Buffer | null {
  try {
    lstatSync(p);
  } catch {
    return null;
  }
  return readRegular(p, label);
}

// A ref name git itself accepts, reduced to a safe subset: refs/ then components of [A-Za-z0-9._-] separated by single slashes; no component starts with "." or ends with ".lock".
const REF = /^refs\/(?:[A-Za-z0-9_-][A-Za-z0-9._-]*)(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/;

// The git directory: ".git" itself, or the folder a worktree/submodule ".git" file ("gitdir: <path>") points to. Refs live in the common directory ("commondir" file) when there is one.
function gitDirs(repoRoot: string): { gitDir: string; common: string } | null {
  const dot = join(repoRoot, ".git");
  const st = lstatSync(dot);
  if (st.isDirectory() && !st.isSymbolicLink()) return { gitDir: dot, common: dot };
  if (!st.isFile() || st.isSymbolicLink()) return null;
  const m = /^gitdir: (.{1,500})$/.exec(readRegular(dot, ".git").toString("utf8").trim());
  if (!m) return null;
  const gitDir = resolve(repoRoot, m[1]);
  if (!lstatSync(gitDir).isDirectory()) return null;
  const cd = optionalRegular(join(gitDir, "commondir"), "commondir");
  const common = cd ? resolve(gitDir, cd.toString("utf8").trim().slice(0, 500)) : gitDir;
  if (!lstatSync(common).isDirectory()) return null;
  return { gitDir, common };
}

// git HEAD without running git: HEAD is either a 40-hex id or "ref: <name>"; the ref is then read from its file or packed-refs. Anything unexpected -> null (never guessed).
export function readGitHead(repoRoot: string): { branch: string | null; commit: string | null } {
  try {
    const dirs = gitDirs(repoRoot);
    if (!dirs) return { branch: null, commit: null };
    const head = readRegular(join(dirs.gitDir, "HEAD"), ".git/HEAD").toString("utf8").trim();
    if (/^[0-9a-f]{40}$/.test(head)) return { branch: null, commit: head };
    const m = /^ref: (\S{1,250})$/.exec(head);
    if (!m || !REF.test(m[1])) return { branch: null, commit: null };
    const ref = m[1];
    const branch = ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : ref;
    const loose = optionalRegular(join(dirs.common, ...ref.split("/")), ref);
    if (loose && /^[0-9a-f]{40}$/.test(loose.toString("utf8").trim())) return { branch, commit: loose.toString("utf8").trim() };
    const packed = optionalRegular(join(dirs.common, "packed-refs"), "packed-refs");
    if (packed) {
      for (const line of packed.toString("utf8").split("\n")) {
        const mm = /^([0-9a-f]{40}) (\S+)$/.exec(line.trim());
        if (mm && mm[2] === ref) return { branch, commit: mm[1] };
      }
    }
    return { branch, commit: null };
  } catch {
    return { branch: null, commit: null };
  }
}

export interface ReleaseInfo {
  name: string;
  version: string;
  nodeEngine: string;
  lockfileSha256: string | null;
  git: { branch: string | null; commit: string | null };
  status: { dogrulandi: number; kismi: number; planli: number; kapsamdisi: number; total: number } | null;
  previous: string | null;
}

function root(repoRoot: string): string {
  if (!isAbsolute(repoRoot)) throw new ReleaseError("invalid_repo", "the project folder must be an absolute path");
  let st;
  try {
    st = lstatSync(repoRoot);
  } catch {
    throw new ReleaseError("invalid_repo", "the project folder does not exist");
  }
  if (!st.isDirectory() || st.isSymbolicLink()) throw new ReleaseError("invalid_repo", "the project folder must be a real directory (no symlink or junction)");
  return realpathSync.native(repoRoot);
}

// Versions already recorded under docs/surumler/ (file names X.Y.Z.md); anything else in the folder is ignored.
export function recordedVersions(repoRoot: string): string[] {
  const dir = join(root(repoRoot), "docs", "surumler");
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names.map((n) => /^(.+)\.md$/.exec(n)?.[1] ?? "").filter((v) => SEMVER.test(v)).sort(compareSemver);
}

export function readRelease(repoRoot: string): ReleaseInfo {
  const real = root(repoRoot);
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readRegular(join(real, "package.json"), "package.json").toString("utf8")) as Record<string, unknown>;
  } catch (e) {
    if (e instanceof ReleaseError) throw e;
    throw new ReleaseError("invalid_package", "package.json is not valid JSON");
  }
  if (pkg === null || typeof pkg !== "object" || Array.isArray(pkg)) throw new ReleaseError("invalid_package", "package.json must be an object");
  const version = typeof pkg.version === "string" ? pkg.version : "";
  parseSemver(version);
  const engines = pkg.engines !== null && typeof pkg.engines === "object" && !Array.isArray(pkg.engines) ? (pkg.engines as Record<string, unknown>) : {};
  const name = typeof pkg.name === "string" ? pkg.name : "";
  const nodeEngine = typeof engines.node === "string" ? engines.node : "";
  // These land in a Markdown record: a name or engine with line breaks/control characters could forge extra lines or headings, so anything that is not a plain npm name / simple range is refused.
  if (name !== "" && (name.length > 214 || !NPM_NAME.test(name))) throw new ReleaseError("invalid_package", "package.json name is not a valid npm package name");
  if (nodeEngine.length > 100 || !/^[A-Za-z0-9 .<>=~^|*x-]*$/.test(nodeEngine)) throw new ReleaseError("invalid_package", "package.json engines.node contains characters other than a plain version range");
  const lock = optionalRegular(join(real, "package-lock.json"), "package-lock.json");
  let status: ReleaseInfo["status"] = null;
  const sj = optionalRegular(join(real, "docs", "status", "100-yetenek-durum.json"), "100-yetenek-durum.json");
  if (sj) {
    try {
      const s = (JSON.parse(sj.toString("utf8")) as { summary?: Record<string, unknown> }).summary ?? {};
      const n = (k: string): number => (typeof s[k] === "number" && Number.isFinite(s[k]) ? (s[k] as number) : 0);
      status = { dogrulandi: n("dogrulandi"), kismi: n("kismi"), planli: n("planli"), kapsamdisi: n("kapsamdisi"), total: n("total") };
    } catch {
      status = null;
    }
  }
  const prev = recordedVersions(real).filter((v) => compareSemver(v, version) < 0).pop() ?? null;
  return {
    name,
    version,
    nodeEngine,
    lockfileSha256: lock ? createHash("sha256").update(lock).digest("hex") : null,
    git: readGitHead(real),
    status,
    previous: prev,
  };
}

// Rules a release record must satisfy; problems are listed, not thrown, so the user sees all of them.
export function checkRelease(repoRoot: string): { ok: boolean; problems: string[]; info: ReleaseInfo | null } {
  const problems: string[] = [];
  let info: ReleaseInfo | null = null;
  try {
    info = readRelease(repoRoot);
  } catch (e) {
    return { ok: false, problems: [e instanceof Error ? e.message : "unreadable"], info: null };
  }
  const recorded = recordedVersions(repoRoot);
  if (recorded.includes(info.version)) problems.push(`version ${info.version} already has a release record (docs/surumler/${info.version}.md)`);
  const newer = recorded.filter((v) => compareSemver(v, info!.version) > 0);
  if (newer.length) problems.push(`package.json version ${info.version} is older than the recorded ${newer[newer.length - 1]}`);
  if (!info.lockfileSha256) problems.push("package-lock.json is missing: the release cannot be rebuilt reproducibly");
  else {
    try {
      const lock = JSON.parse(readRegular(join(root(repoRoot), "package-lock.json"), "package-lock.json").toString("utf8")) as { name?: unknown; version?: unknown };
      if (lock.version !== info.version || (info.name !== "" && lock.name !== info.name)) problems.push("package-lock.json name/version do not match package.json (the lockfile is stale)");
    } catch {
      problems.push("package-lock.json is not valid JSON");
    }
  }
  if (info.name === "") problems.push("package.json has no name");
  if (!info.git.commit) problems.push("the git commit could not be read (no readable .git folder or gitdir file, or an unexpected HEAD): the record would not name its source");
  return { ok: problems.length === 0, problems, info };
}

export function renderNotes(info: ReleaseInfo, now: Date): string {
  const st = info.status;
  const lines = [
    `# ${info.name || "agentmom"} ${info.version}`,
    "",
    `- Tarih: ${now.toISOString()}`,
    `- Önceki kayıtlı sürüm: ${info.previous ?? "yok"}`,
    `- Kaynak: ${info.git.branch ?? "bilinmiyor"} @ ${info.git.commit ?? "bilinmiyor"}`,
    `- Node: ${info.nodeEngine || "belirtilmemiş"}`,
    `- package-lock.json SHA-256: ${info.lockfileSha256 ?? "yok"}`,
    st ? `- Yetenek durumu: ${st.dogrulandi} Doğrulandı, ${st.kismi} Kısmi, ${st.planli} Planlı, ${st.kapsamdisi} Kapsam dışı (toplam ${st.total})` : "- Yetenek durumu: okunamadı",
    "",
    "Bu kayıt yalnız bilgi notudur: sürüm yayınlamaz, etiketlemez, kurmaz ve güncellemez.",
    "",
  ];
  return lines.join("\n");
}

// Writes docs/surumler/<version>.md as a NEW file. Refuses a record that already exists and a record whose text would carry secret-looking content.
export function writeNotes(repoRoot: string, now: Date = new Date()): { path: string; text: string } {
  const c = checkRelease(repoRoot);
  if (!c.ok || !c.info) throw new ReleaseError("check_failed", `the release did not pass its checks, nothing was written: ${c.problems.join("; ").slice(0, 400)}`);
  const text = renderNotes(c.info, now);
  if (redactString(text) !== text) throw new ReleaseError("secret_found", "the release text would contain secret-looking content: nothing was written");
  const real = root(repoRoot);
  // Each segment is checked BEFORE anything is created, so a link or a plain file in the way never causes a folder to appear outside the project.
  let dir = real;
  for (const seg of ["docs", "surumler"]) {
    dir = join(dir, seg);
    let l;
    try {
      l = lstatSync(dir);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw new ReleaseError("invalid_dest", `docs/${seg} could not be examined`);
      try {
        mkdirSync(dir);
      } catch {
        throw new ReleaseError("invalid_dest", `docs/${seg} could not be created`);
      }
      l = lstatSync(dir);
    }
    if (!l.isDirectory() || l.isSymbolicLink() || !(realpathSync.native(dir) + sep).startsWith(real + sep)) throw new ReleaseError("invalid_dest", `${seg === "docs" ? "docs" : "docs/surumler"} must be a real directory inside the project`);
  }
  const path = join(dir, `${c.info.version}.md`);
  try {
    writeFileSync(path, text, { flag: "wx" });
  } catch (e) {
    throw new ReleaseError("write_failed", (e as NodeJS.ErrnoException).code === "EEXIST" ? "the release record already exists and is never overwritten" : "the release record could not be written");
  }
  return { path, text };
}

export function resolveRepo(p: string): string {
  return resolve(p);
}
