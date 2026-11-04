// Güvenilir araç pazarı (madde 32, D10): YEREL, ağsız. Sahip: Claude [İP:AgentMom devam]; yalnız yazan yapay zeka değiştirir.
// "Pazar" = kullanıcının getirdiği bir KATALOG klasörü (USB, paylaşımlı klasör, git); hiçbir şey indirilmez, yüklenmez ya da çalıştırılmaz (ADR-016). Araç paketi: tool.json + onda listelenen dosyalar.
// Güven kullanıcının açık onayıyla doğar ve pakete BAĞLIDIR: onay kaydı araç kimliği, sürüm ve tool.json özeti (içindeki dosya özetleri sayesinde tüm paket) içerir; bir bayt değişirse güven düşer.
// Onay ve iptal kayıtları yalnız EKLENİR (wx, yeni dosya); hiçbir şey silinmez ya da üzerine yazılmaz. Güven klasörü checkDestination kurallarına uyar (depo/durum klasörü/anahtarlar/arşiv dışında, var olan gerçek klasör).
// İzinler kapalı bir sözlüktür; anahtar/gizli bilgi izni YOKTUR. Yüksek riskli izin (süreç çalıştırma, ağ) onayda ayrıca açıkça istenir. Bu modül aracı ÇALIŞTIRMAZ: yalnız "güvenilir mi, hangi izinlerle" sorusunu yanıtlar.
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { hasSecret, readRegular } from "./capsule.ts";
import { checkDestination } from "./backup.ts";

export class ToolError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ToolError";
    this.code = code;
  }
}

export const TOOL_SCHEMA = "agentmom-tool/1";
export const APPROVAL_SCHEMA = "agentmom-tool-approval/1";
export const REVOKE_SCHEMA = "agentmom-tool-revoke/1";
export const MANIFEST = "tool.json";
export const PERMISSIONS = { read_workspace: "low", write_workspace: "medium", run_process: "high", network: "high" } as const;
export type Permission = keyof typeof PERMISSIONS;
export const MAX_FILES = 200;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SEG = /^[A-Za-z0-9._-]{1,100}$/;
const SHA = /^[0-9a-f]{64}$/;
const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

export interface ToolFile {
  path: string;
  sha256: string;
  bytes: number;
}
export interface ToolManifest {
  schema: typeof TOOL_SCHEMA;
  id: string;
  version: string;
  title: string;
  publisher: string;
  permissions: Permission[];
  entry: string;
  files: ToolFile[];
}
export interface ToolReview {
  manifest: ToolManifest;
  digest: string;
  risk: "low" | "medium" | "high";
  problems: string[];
}

function read(p: string, label: string): Buffer {
  try {
    return readRegular(p, label);
  } catch (e) {
    if (e instanceof ToolError) throw e;
    throw new ToolError("invalid_package", `${label} could not be read as a regular file`);
  }
}
const sha = (b: Buffer | string): string => createHash("sha256").update(b).digest("hex");
const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

function text(v: unknown, what: string, max: number): string {
  if (typeof v !== "string" || v.length === 0 || v.length > max || CONTROL.test(v)) throw new ToolError("invalid_manifest", `${what} must be 1..${max} characters of plain text`);
  return v;
}
function exactKeys(o: Record<string, unknown>, keys: string[], what: string): void {
  for (const k of Object.keys(o)) if (!keys.includes(k)) throw new ToolError("invalid_manifest", `${what}: unknown field ${k.slice(0, 30)}`);
  for (const k of keys) if (!(k in o)) throw new ToolError("invalid_manifest", `${what}: missing field ${k}`);
}
function safePath(p: unknown, what: string): string {
  if (typeof p !== "string" || p.length === 0 || p.length > 200) throw new ToolError("invalid_manifest", `${what} must be a relative path`);
  const segs = p.split("/");
  if (segs.length > 6 || segs.some((s) => s === "." || s === ".." || !SEG.test(s))) throw new ToolError("invalid_manifest", `${what} must be a plain relative path (letters, digits, . _ -; no '..')`);
  return p;
}

// Katı biçim: bilinmeyen/eksik alan, kimlik, semver, kapalı izin sözlüğü, tekil ve küçük/büyük harf duyarsız tekil dosya yolları, giriş dosyası listede olmalı.
export function parseManifest(raw: unknown): ToolManifest {
  if (!isObj(raw)) throw new ToolError("invalid_manifest", "tool.json must be an object");
  exactKeys(raw, ["schema", "id", "version", "title", "publisher", "permissions", "entry", "files"], "tool.json");
  if (raw["schema"] !== TOOL_SCHEMA) throw new ToolError("invalid_manifest", `schema must be ${TOOL_SCHEMA}`);
  const id = raw["id"];
  if (typeof id !== "string" || !ID_RE.test(id)) throw new ToolError("invalid_manifest", "id must be lowercase letters, digits and '-' (1..63)");
  const version = raw["version"];
  if (typeof version !== "string" || version.length > 40 || !SEMVER.test(version)) throw new ToolError("invalid_manifest", "version must be strict semver MAJOR.MINOR.PATCH");
  const perms = raw["permissions"];
  if (!Array.isArray(perms) || perms.length > Object.keys(PERMISSIONS).length) throw new ToolError("invalid_manifest", "permissions must be a short list");
  for (const p of perms) if (typeof p !== "string" || !Object.hasOwn(PERMISSIONS, p)) throw new ToolError("invalid_manifest", `unknown permission: ${String(p).slice(0, 30)} (allowed: ${Object.keys(PERMISSIONS).join(", ")})`);
  if (new Set(perms).size !== perms.length) throw new ToolError("invalid_manifest", "permissions must not repeat");
  const files = raw["files"];
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES) throw new ToolError("invalid_manifest", `files must list 1..${MAX_FILES} entries`);
  const seen = new Set<string>();
  const outFiles: ToolFile[] = files.map((f, i) => {
    if (!isObj(f)) throw new ToolError("invalid_manifest", `files[${i}] must be an object`);
    exactKeys(f, ["path", "sha256", "bytes"], `files[${i}]`);
    const path = safePath(f["path"], `files[${i}].path`);
    if (path.toLowerCase() === MANIFEST) throw new ToolError("invalid_manifest", `files must not list ${MANIFEST}`);
    if (seen.has(path.toLowerCase())) throw new ToolError("invalid_manifest", `duplicate file (case-insensitive): ${path}`);
    seen.add(path.toLowerCase());
    if (typeof f["sha256"] !== "string" || !SHA.test(f["sha256"])) throw new ToolError("invalid_manifest", `files[${i}].sha256 must be 64 lowercase hex digits`);
    if (typeof f["bytes"] !== "number" || !Number.isInteger(f["bytes"]) || f["bytes"] < 0 || f["bytes"] > 1024 * 1024) throw new ToolError("invalid_manifest", `files[${i}].bytes must be 0..1 MB`);
    return { path, sha256: f["sha256"], bytes: f["bytes"] };
  });
  const entry = safePath(raw["entry"], "entry");
  if (!outFiles.some((f) => f.path === entry)) throw new ToolError("invalid_manifest", "entry must be one of the listed files");
  return { schema: TOOL_SCHEMA, id, version, title: text(raw["title"], "title", 120), publisher: text(raw["publisher"], "publisher", 80), permissions: perms as Permission[], entry, files: outFiles };
}

const riskOf = (perms: Permission[]): "low" | "medium" | "high" => (perms.some((p) => PERMISSIONS[p] === "high") ? "high" : perms.some((p) => PERMISSIONS[p] === "medium") ? "medium" : "low");

function listPackage(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string, depth: number): void => {
    if (depth > 6) throw new ToolError("invalid_package", "package folders nest too deeply");
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) throw new ToolError("invalid_package", `symlinks are not allowed: ${name.slice(0, 60)}`);
      if (st.isDirectory()) walk(p, depth + 1);
      else if (st.isFile()) out.push(relative(dir, p).split("\\").join("/"));
      else throw new ToolError("invalid_package", `not a regular file: ${name.slice(0, 60)}`);
      if (out.length > MAX_FILES + 1) throw new ToolError("invalid_package", "too many files");
    }
  };
  walk(dir, 0);
  return out;
}

// İnceleme: paketi okur, her dosyanın özetini ve boyutunu manifestle karşılaştırır, listede olmayan dosyayı ve gizli bilgiyi bulur. Hiçbir şey yazmaz ya da çalıştırmaz.
export function reviewPackage(dir: string): ToolReview {
  let st;
  try {
    st = lstatSync(dir);
  } catch {
    throw new ToolError("invalid_package", "the tool folder does not exist");
  }
  if (!st.isDirectory() || st.isSymbolicLink()) throw new ToolError("invalid_package", "the tool folder must be a real directory");
  const mBuf = read(join(dir, MANIFEST), MANIFEST);
  let raw: unknown;
  try {
    raw = JSON.parse(mBuf.toString("utf8"));
  } catch {
    throw new ToolError("invalid_manifest", "tool.json is not valid JSON");
  }
  const manifest = parseManifest(raw);
  const problems: string[] = [];
  if (hasSecret(mBuf.toString("utf8"))) problems.push("tool.json contains secret-looking content");
  const present = new Set(listPackage(dir).filter((p) => p !== MANIFEST));
  const listed = new Set(manifest.files.map((f) => f.path));
  for (const p of present) if (!listed.has(p)) problems.push(`file not listed in tool.json: ${p}`);
  for (const f of manifest.files) {
    if (!present.has(f.path)) {
      problems.push(`listed file is missing: ${f.path}`);
      continue;
    }
    const buf = read(join(dir, f.path), f.path);
    if (buf.length !== f.bytes) problems.push(`size differs: ${f.path}`);
    if (sha(buf) !== f.sha256) problems.push(`digest differs: ${f.path}`);
    if (hasSecret(buf.toString("utf8"))) problems.push(`secret-looking content: ${f.path}`);
  }
  return { manifest, digest: sha(mBuf), risk: riskOf(manifest.permissions), problems };
}

// ---- güven kayıtları (yalnız ekleme) ------------------------------------------------------------------------------------
export interface Approval {
  schema: typeof APPROVAL_SCHEMA;
  id: string;
  version: string;
  digest: string;
  granted: Permission[];
  highRiskAccepted: boolean;
  approvedAt: string;
}
const key = (id: string, v: string): string => `${id}@${v}`;
const approvalFile = (id: string, v: string): string => `onay-${key(id, v)}.json`;
const revokeFile = (id: string, v: string): string => `iptal-${key(id, v)}.json`;

export interface TrustOptions {
  trustDir: string;
  repoRoot: string;
  stateDir: string;
  now?: () => Date;
}
const dest = (o: TrustOptions): string => checkDestination(o.trustDir, { repoRoot: o.repoRoot, stateDir: o.stateDir });

// Güven klasörü güven çapasıdır: araç ya da katalog klasörüyle iç içe olamaz (gerçek yollar üzerinden), yoksa paketi yazan onayı da yazabilir.
function realOf(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    throw new ToolError("invalid_package", "the folder does not exist");
  }
}
function guardTrust(root: string, other: string): void {
  const a = realOf(root);
  const b = realOf(other);
  const inside = (x: string, y: string): boolean => x === y || x.startsWith(y.endsWith(sep) ? y : y + sep);
  if (inside(a, b) || inside(b, a)) throw new ToolError("unsafe_trust_dir", "the trust folder must not be the tool folder, inside it, or contain it");
}

export function approveTool(toolDir: string, grant: Permission[], opts: TrustOptions & { acceptHighRisk?: boolean }): { file: string; approval: Approval } {
  const root = dest(opts);
  guardTrust(root, toolDir);
  const rev = reviewPackage(toolDir);
  if (rev.problems.length > 0) throw new ToolError("not_verified", `the package does not verify, nothing was approved: ${rev.problems[0]}`);
  for (const p of grant) if (!rev.manifest.permissions.includes(p)) throw new ToolError("invalid_grant", `permission was not requested by the tool: ${p}`);
  if (new Set(grant).size !== grant.length) throw new ToolError("invalid_grant", "permissions must not repeat");
  if (grant.some((p) => PERMISSIONS[p] === "high") && !opts.acceptHighRisk) throw new ToolError("high_risk", "high-risk permissions (run_process, network) need the explicit high-risk confirmation");
  const approval: Approval = { schema: APPROVAL_SCHEMA, id: rev.manifest.id, version: rev.manifest.version, digest: rev.digest, granted: [...grant].sort(), highRiskAccepted: grant.some((p) => PERMISSIONS[p] === "high"), approvedAt: (opts.now ? opts.now() : new Date()).toISOString() };
  const file = join(root, approvalFile(approval.id, approval.version));
  try {
    writeFileSync(file, JSON.stringify(approval, null, 2) + "\n", { flag: "wx" });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new ToolError("already_approved", "this tool version already has an approval record (records are never overwritten; to change it publish a new version of the tool)");
    throw new ToolError("write_failed", "could not write the approval record");
  }
  return { file, approval };
}

export function revokeTool(id: string, version: string, opts: TrustOptions): { file: string } {
  if (!ID_RE.test(id) || !SEMVER.test(version)) throw new ToolError("invalid_input", "id and version are not valid");
  const root = dest(opts);
  const file = join(root, revokeFile(id, version));
  const body = { schema: REVOKE_SCHEMA, id, version, revokedAt: (opts.now ? opts.now() : new Date()).toISOString() };
  try {
    writeFileSync(file, JSON.stringify(body, null, 2) + "\n", { flag: "wx" });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new ToolError("already_revoked", "this version is already revoked");
    throw new ToolError("write_failed", "could not write the revocation record");
  }
  return { file };
}

function readApproval(file: string, id: string, version: string): Approval | null {
  let buf: Buffer;
  try {
    lstatSync(file);
  } catch {
    return null;
  }
  try {
    buf = readRegular(file, "approval record");
  } catch {
    throw new ToolError("invalid_record", "the approval record is not a regular file");
  }
  let o: unknown;
  try {
    o = JSON.parse(buf.toString("utf8"));
  } catch {
    throw new ToolError("invalid_record", "the approval record is not valid JSON");
  }
  if (!isObj(o)) throw new ToolError("invalid_record", "the approval record is not an object");
  try {
    exactKeys(o, ["schema", "id", "version", "digest", "granted", "highRiskAccepted", "approvedAt"], "approval record");
  } catch {
    throw new ToolError("invalid_record", "the approval record has unexpected or missing fields");
  }
  const g = o["granted"];
  if (o["schema"] !== APPROVAL_SCHEMA || o["id"] !== id || o["version"] !== version || typeof o["digest"] !== "string" || !SHA.test(o["digest"]) || !Array.isArray(g) || g.some((p) => typeof p !== "string" || !Object.hasOwn(PERMISSIONS, p)) || new Set(g).size !== g.length || typeof o["highRiskAccepted"] !== "boolean" || (g.some((p) => PERMISSIONS[p as Permission] === "high") && o["highRiskAccepted"] !== true) || typeof o["approvedAt"] !== "string") {
    throw new ToolError("invalid_record", "the approval record does not match the tool it names");
  }
  return o as unknown as Approval;
}

export type TrustState = "trusted" | "not_approved" | "revoked" | "changed" | "unverified" | "permission_exceeded";
export interface Evaluation {
  id: string;
  version: string;
  state: TrustState;
  risk: "low" | "medium" | "high";
  requested: Permission[];
  granted: Permission[];
  reasons: string[];
}

// Karar sırası (en kısıtlayıcı önce): paket doğrulanmıyor -> unverified; iptal kaydı -> revoked; onay yok -> not_approved; özet farklı -> changed; istenen izin onaylananı aşıyor -> permission_exceeded; aksi halde trusted.
export function evaluateTool(toolDir: string, opts: TrustOptions): Evaluation {
  const root = dest(opts);
  guardTrust(root, toolDir);
  const rev = reviewPackage(toolDir);
  const m = rev.manifest;
  const base = { id: m.id, version: m.version, risk: rev.risk, requested: m.permissions };
  if (rev.problems.length > 0) return { ...base, state: "unverified", granted: [], reasons: rev.problems.slice(0, 20) };
  try {
    lstatSync(join(root, revokeFile(m.id, m.version)));
    return { ...base, state: "revoked", granted: [], reasons: ["a revocation record exists for this version"] };
  } catch {
    // iptal kaydı yok
  }
  const ap = readApproval(join(root, approvalFile(m.id, m.version)), m.id, m.version);
  if (!ap) return { ...base, state: "not_approved", granted: [], reasons: ["no approval record for this version"] };
  if (ap.digest !== rev.digest) return { ...base, state: "changed", granted: [], reasons: ["the package differs from the one that was approved"] };
  const extra = m.permissions.filter((p) => !ap.granted.includes(p));
  if (extra.length > 0) return { ...base, state: "permission_exceeded", granted: ap.granted, reasons: [`not granted: ${extra.join(", ")}`] };
  return { ...base, state: "trusted", granted: ap.granted, reasons: [] };
}

// Katalog: bir klasördeki ilk düzey alt klasörlerin her biri bir araç paketidir; her biri ayrı değerlendirilir, biri bozuksa diğerleri etkilenmez.
export function evaluateCatalog(catalogDir: string, opts: TrustOptions): Array<{ folder: string; evaluation: Evaluation | null; error: string | null }> {
  let st;
  try {
    st = lstatSync(catalogDir);
  } catch {
    throw new ToolError("invalid_package", "the catalog folder does not exist");
  }
  guardTrust(dest(opts), catalogDir);
  if (!st.isDirectory() || st.isSymbolicLink()) throw new ToolError("invalid_package", "the catalog must be a real directory");
  const names = readdirSync(catalogDir).sort();
  if (names.length > 200) throw new ToolError("invalid_package", "the catalog lists more than 200 entries");
  return names.map((folder) => {
    try {
      const p = join(catalogDir, folder);
      if (!lstatSync(p).isDirectory()) return { folder, evaluation: null, error: "not a folder" };
      return { folder, evaluation: evaluateTool(p, opts), error: null };
    } catch (e) {
      return { folder, evaluation: null, error: e instanceof ToolError ? `${e.code}: ${e.message}`.slice(0, 200) : "unreadable" };
    }
  });
}
