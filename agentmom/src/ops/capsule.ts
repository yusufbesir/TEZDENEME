// Portable project capsule (Faz 11, D9d, madde 79). Owner: Claude [İP:AgentMom devam]. ADR-016: runs only when the user asks (scripts/kapsul.mjs); nothing here runs by itself.
// A capsule is a NEW directory holding the files that let a project be set up again on another machine: dependency manifest + lockfile, TypeScript config, node version
// hint and the project's own agent guide. It NEVER holds node_modules, git history, the database, memory notes, keys or any file outside a fixed allowlist.
// Every file is secret-scanned before anything is written; the manifest is written LAST (a directory without one is an unfinished attempt); verify is read-only;
// restore writes a verified COPY into a new directory and never installs or runs anything (the manifest only names the command the user would run).
import { createHash, randomBytes } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readSync, realpathSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, resolve, sep } from "node:path";
import { redactString } from "../core/audit/redact.ts";
import { FORBIDDEN, checkDestination } from "./backup.ts";

export class CapsuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CapsuleError";
    this.code = code;
  }
}

export const CAPSULE_MANIFEST = "manifest.json";
// Fixed allowlist: nothing else is ever copied, whatever the project contains.
export const CAPSULE_FILES = ["package.json", "package-lock.json", "tsconfig.json", ".nvmrc", "AGENTMOM.md"] as const;
const MAX_FILE_BYTES = 1_000_000;
const MAX_DEPS = 500;
const MAX_REASON = 200;
// Said out loud in the manifest so nobody mistakes a capsule for a full backup.
export const NOT_INCLUDED = ["node_modules", ".git", "yerel veritabanı (agentmom.db)", "hafıza notları", "anahtarlar ve gizli bilgiler", "kaynak kod"] as const;

export interface CapsuleFile {
  name: string;
  bytes: number;
  sha256: string;
}

export interface CapsuleManifest {
  format: 1;
  tool: "agentmom";
  kind: "project-capsule";
  createdAt: string;
  reason: string;
  project: { name: string; version: string; nodeEngine: string; dependencyCount: number; devDependencyCount: number };
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  files: CapsuleFile[];
  notIncluded: string[];
  restoreHint: string;
}

export interface CapsuleVerifyReport {
  ok: boolean;
  problems: string[];
  manifest: CapsuleManifest | null;
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}


// redactString catches the common token shapes; these cover what it misses (credentials inside URLs, npm auth keys, Google keys, JSON-quoted secret keys).
const EXTRA_SECRET: RegExp[] = [
  /[a-z][a-z0-9+.-]*:\/\/[^/\s:@"']+:[^/\s@"']+@/i,
  /_auth(?:Token)?\b/i,
  /\bnpm_[A-Za-z0-9]{20,}/,
  /\bAIza[0-9A-Za-z_-]{30,}/,
  /"(?:[\w-]*[_-])?(?:password|passwd|secret|token|api[_-]?key|apikey)"\s*:\s*"[^"]{6,}"/i,
];

export function hasSecret(text: string): boolean {
  return redactString(text) !== text || EXTRA_SECRET.some((r) => r.test(text));
}

// Reads a regular, single-link file through ONE open descriptor (no check-then-read gap): symlinks, hard links and non-files are refused.
export function readRegular(p: string, label: string): Buffer {
  const l = lstatSync(p);
  if (!l.isFile() || l.isSymbolicLink()) throw new CapsuleError("invalid_file", `${label} must be a regular file (no symlink)`);
  const fd = openSync(p, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const st = fstatSync(fd);
    if (!st.isFile() || st.nlink > 1) throw new CapsuleError("invalid_file", `${label} must be a regular file with a single link (no hard link)`);
    if (st.size > MAX_FILE_BYTES) throw new CapsuleError("invalid_file", `${label} is larger than 1 MB`);
    const buf = Buffer.alloc(st.size);
    let off = 0;
    while (off < buf.length) {
      const n = readSync(fd, buf, off, buf.length - off, off);
      if (n <= 0) break;
      off += n;
    }
    return off === buf.length ? buf : buf.subarray(0, off);
  } finally {
    closeSync(fd);
  }
}

function inside(parent: string, child: string): boolean {
  const p = resolve(parent).toLowerCase();
  const c = resolve(child).toLowerCase();
  return c === p || c.startsWith(p.endsWith(sep) ? p : p + sep);
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\..*$/, "").replace("T", "-");
}

function depMap(v: unknown, label: string): Record<string, string> {
  if (v === undefined) return {};
  if (v === null || typeof v !== "object" || Array.isArray(v)) throw new CapsuleError("invalid_package", `package.json ${label} must be an object`);
  const out: Record<string, string> = Object.create(null) as Record<string, string>;
  const entries = Object.entries(v as Record<string, unknown>);
  if (entries.length > MAX_DEPS) throw new CapsuleError("invalid_package", `package.json ${label} lists more than ${MAX_DEPS} entries`);
  for (const [k, ver] of entries) {
    if (typeof ver !== "string" || ver.length > 200 || k.length > 214) throw new CapsuleError("invalid_package", `package.json ${label} has an invalid entry: ${k.slice(0, 40)}`);
    out[k] = ver;
  }
  return out;
}

export interface CapsulePlan {
  repoRoot: string;
  include: Array<{ name: string; bytes: number; sha256: string }>;
  missing: string[];
  notIncluded: string[];
}

interface Collected {
  files: Array<{ name: string; data: Buffer }>;
  missing: string[];
}

function collect(repoRoot: string): Collected & { real: string } {
  if (!isAbsolute(repoRoot)) throw new CapsuleError("invalid_repo", "the project folder must be an absolute path");
  let st;
  try {
    st = lstatSync(repoRoot);
  } catch {
    throw new CapsuleError("invalid_repo", "the project folder does not exist");
  }
  if (!st.isDirectory() || st.isSymbolicLink()) throw new CapsuleError("invalid_repo", "the project folder must be a real directory (no symlink or junction)");
  const real = realpathSync.native(repoRoot);
  const files: Collected["files"] = [];
  const missing: string[] = [];
  for (const name of CAPSULE_FILES) {
    const p = join(real, name);
    try {
      lstatSync(p);
    } catch {
      missing.push(name);
      continue;
    }
    if (!inside(real, realpathSync.native(p))) throw new CapsuleError("invalid_file", `${name} resolves outside the project folder`);
    const data = readRegular(p, name);
    if (hasSecret(data.toString("utf8"))) throw new CapsuleError("secret_found", `${name} contains secret-looking content: nothing was written (capsules never contain keys)`);
    files.push({ name, data });
  }
  if (!files.some((f) => f.name === "package.json")) throw new CapsuleError("invalid_package", "the project has no package.json: there is nothing to rebuild a capsule from");
  return { files, missing, real };
}

type Described = Pick<CapsuleManifest, "project" | "dependencies" | "devDependencies" | "restoreHint">;

// One derivation used both when creating and when verifying: manifest fields must follow from package.json, never stand on their own.
function describe(files: Array<{ name: string; data: Buffer }>): Described {
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse((files.find((f) => f.name === "package.json") as { data: Buffer }).data.toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new CapsuleError("invalid_package", "package.json is not valid JSON");
  }
  if (pkg === null || typeof pkg !== "object" || Array.isArray(pkg)) throw new CapsuleError("invalid_package", "package.json must be an object");
  const dependencies = depMap(pkg.dependencies, "dependencies");
  const devDependencies = depMap(pkg.devDependencies, "devDependencies");
  const engines = pkg.engines !== null && typeof pkg.engines === "object" && !Array.isArray(pkg.engines) ? (pkg.engines as Record<string, unknown>) : {};
  const short = (v: unknown, n: number): string => (typeof v === "string" ? v.slice(0, n) : "");
  return {
    project: { name: short(pkg.name, 214), version: short(pkg.version, 100), nodeEngine: short(engines.node, 100), dependencyCount: Object.keys(dependencies).length, devDependencyCount: Object.keys(devDependencies).length },
    dependencies: { ...dependencies },
    devDependencies: { ...devDependencies },
    restoreHint: files.some((f) => f.name === "package-lock.json") ? "npm ci" : "npm install",
  };
}

// Read-only: shows what a capsule WOULD hold. Writes nothing.
export function planCapsule(repoRoot: string): CapsulePlan {
  const c = collect(repoRoot);
  return { repoRoot, include: c.files.map((f) => ({ name: f.name, bytes: f.data.length, sha256: sha256(f.data) })), missing: c.missing, notIncluded: [...NOT_INCLUDED] };
}

export interface CreateCapsuleOptions {
  repoRoot: string;
  destRoot: string;
  stateDir: string;
  reason?: string;
  now?: () => Date;
  gate?: (realDir: string) => void;
}

export function createCapsule(opts: CreateCapsuleOptions): { dir: string; manifest: CapsuleManifest } {
  const now = (opts.now ?? (() => new Date()))();
  // Everything is read and checked BEFORE the destination is touched.
  const c = collect(opts.repoRoot);
  const root = checkDestination(opts.destRoot, { repoRoot: c.real, stateDir: opts.stateDir, ...(opts.gate ? { gate: opts.gate } : {}) });
  const d = describe(c.files);
  const manifest: CapsuleManifest = {
    format: 1,
    tool: "agentmom",
    kind: "project-capsule",
    createdAt: now.toISOString(),
    reason: redactString(opts.reason ?? "manual").slice(0, MAX_REASON),
    ...d,
    files: c.files.map((f) => ({ name: f.name, bytes: f.data.length, sha256: sha256(f.data) })),
    notIncluded: [...NOT_INCLUDED],
  };
  const manifestText = JSON.stringify(manifest, null, 2) + "\n";
  if (hasSecret(manifestText)) throw new CapsuleError("secret_found", "the manifest would contain secret-looking content: nothing was written");
  const dir = join(root, `agentmom-kapsul-${stamp(now)}-${randomBytes(3).toString("hex")}`);
  mkdirSync(dir); // not recursive: fails if it exists
  for (const f of c.files) writeFileSync(join(dir, f.name), f.data, { flag: "wx" });
  // The manifest is written LAST: a directory without one is an unfinished attempt and verify/restore refuse it.
  writeFileSync(join(dir, CAPSULE_MANIFEST), manifestText, { flag: "wx" });
  return { dir, manifest };
}

const ALLOWED = new Set<string>(CAPSULE_FILES);

interface Verified {
  report: CapsuleVerifyReport;
  data: Map<string, Buffer>;
  manifestRaw: Buffer | null;
}

// Strict, read-only verification. The bytes it checked are returned so a restore copies exactly those bytes (no second read).
function verifyDetailed(dir: string): Verified {
  const problems: string[] = [];
  const data = new Map<string, Buffer>();
  let manifest: CapsuleManifest | null = null;
  let manifestRaw: Buffer | null = null;
  const out = (): Verified => ({ report: { ok: problems.length === 0, problems, manifest }, data, manifestRaw });
  const stop = (m: string): Verified => {
    problems.push(m);
    return out();
  };
  if (!isAbsolute(dir)) return stop("capsule path must be absolute");
  try {
    manifestRaw = readRegular(join(dir, CAPSULE_MANIFEST), CAPSULE_MANIFEST);
  } catch {
    return stop("no manifest.json: not a finished AgentMom capsule");
  }
  try {
    manifest = JSON.parse(manifestRaw.toString("utf8")) as CapsuleManifest;
  } catch {
    return stop("manifest.json is not valid JSON");
  }
  if (!manifest || manifest.format !== 1 || manifest.tool !== "agentmom" || manifest.kind !== "project-capsule" || !Array.isArray(manifest.files)) return stop("manifest has an unknown shape");
  if (hasSecret(manifestRaw.toString("utf8"))) problems.push("manifest.json contains secret-looking content");
  const listed = new Set<string>();
  for (const f of manifest.files) {
    if (!f || typeof f.name !== "string" || !ALLOWED.has(f.name) || typeof f.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(f.sha256)) {
      problems.push(`manifest lists a file outside the capsule allowlist: ${String(f && (f as CapsuleFile).name).slice(0, 60)}`);
      continue;
    }
    if (listed.has(f.name)) problems.push(`duplicate manifest entry: ${f.name}`);
    listed.add(f.name);
    try {
      const buf = readRegular(join(dir, f.name), f.name);
      if (buf.length !== f.bytes || sha256(buf) !== f.sha256) problems.push(`${f.name}: content does not match the manifest (changed or corrupted)`);
      else if (hasSecret(buf.toString("utf8"))) problems.push(`${f.name}: contains secret-looking content`);
      else data.set(f.name, buf);
    } catch {
      problems.push(`${f.name}: missing or unreadable`);
    }
  }
  if (!listed.has("package.json")) problems.push("the manifest does not list package.json");
  for (const name of readdirSync(dir)) if (name !== CAPSULE_MANIFEST && !listed.has(name)) problems.push(`${name}: not in the manifest (unexpected file)`);
  // Every descriptive field must follow from the verified package.json; nothing in the manifest is trusted on its own (restoreHint is shown to the user as a command).
  if (data.has("package.json")) {
    try {
      const d = describe([...data].map(([name, buf]) => ({ name, data: buf })));
      for (const k of ["project", "dependencies", "devDependencies", "restoreHint"] as const) if (JSON.stringify(manifest[k]) !== JSON.stringify(d[k])) problems.push(`manifest field "${k}" does not match package.json`);
    } catch (e) {
      problems.push(`package.json: ${e instanceof Error ? e.message : "unreadable"}`);
    }
  }
  if (JSON.stringify(manifest.notIncluded) !== JSON.stringify(NOT_INCLUDED)) problems.push('manifest field "notIncluded" is not the fixed list');
  if (typeof manifest.reason !== "string" || manifest.reason.length > MAX_REASON) problems.push('manifest field "reason" is invalid');
  if (typeof manifest.createdAt !== "string" || Number.isNaN(Date.parse(manifest.createdAt))) problems.push('manifest field "createdAt" is invalid');
  return out();
}

export function verifyCapsule(dir: string): CapsuleVerifyReport {
  return verifyDetailed(dir).report;
}

// Writes a verified COPY into a NEW directory, from the bytes that were verified. Never installs dependencies and never runs a command; the caller does that deliberately.
export function restoreCapsule(opts: { capsuleDir: string; targetDir: string; repoRoot: string; stateDir: string; gate?: (realDir: string) => void }): { dir: string; files: string[]; restoreHint: string } {
  const v = verifyDetailed(opts.capsuleDir);
  const report = v.report;
  if (!report.ok || !report.manifest || !v.manifestRaw) throw new CapsuleError("verify_failed", `the capsule did not verify, nothing was restored: ${report.problems.join("; ").slice(0, 400)}`);
  if (!isAbsolute(opts.targetDir)) throw new CapsuleError("invalid_dest", "the target folder must be an absolute path");
  if (inside(opts.capsuleDir, opts.targetDir)) throw new CapsuleError("invalid_dest", "the target folder cannot be inside the capsule it comes from");
  if (FORBIDDEN.test(resolve(opts.targetDir))) throw new CapsuleError("forbidden_dest", "the keys and archive folders are never a restore target");
  let repoReal = opts.repoRoot;
  try {
    repoReal = realpathSync.native(opts.repoRoot);
  } catch {
    // an unreachable project folder cannot contain the target either
  }
  const parent = checkDestination(resolve(opts.targetDir, ".."), { repoRoot: repoReal, stateDir: opts.stateDir, ...(opts.gate ? { gate: opts.gate } : {}) });
  if (inside(opts.capsuleDir, parent)) throw new CapsuleError("invalid_dest", "the target folder cannot be inside the capsule it comes from");
  const target = join(parent, basename(opts.targetDir));
  if (inside(repoReal, target) || inside(opts.stateDir, target)) throw new CapsuleError("forbidden_dest", "the target folder cannot be inside the project or the agents' working tree");
  mkdirSync(target); // fails when it exists: a restore never overwrites anything
  const written: string[] = [];
  for (const f of report.manifest.files) {
    writeFileSync(join(target, f.name), v.data.get(f.name) as Buffer, { flag: "wx" });
    written.push(f.name);
  }
  writeFileSync(join(target, CAPSULE_MANIFEST), v.manifestRaw, { flag: "wx" });
  return { dir: target, files: written, restoreHint: report.manifest.restoreHint };
}
