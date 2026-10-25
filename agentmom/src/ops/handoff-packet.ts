// Handoff packet for continuing work on another machine (Faz 11, D9g, madde 19). Owner: Claude [İP:AgentMom devam]. ADR-016: runs only when the user asks (scripts/devir.mjs); nothing here runs by itself.
// A packet is a NEW folder holding a short, human-readable hand-over of ONE piece of work: goal, what is done, what comes next, open questions, constraints and file NAMES (never contents).
// It carries no code, no keys and no database; there is no network, upload or remote execution here: the user moves the folder (USB, shared drive, git) and the other machine only READS it.
// Same discipline as the capsule: secret-scanned before anything is written, the manifest is written LAST, verify re-derives the readable text from the data (nothing is trusted on its own), open never writes.
import { createHash, randomBytes } from "node:crypto";
import { lstatSync, mkdirSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { redactString } from "../core/audit/redact.ts";
import { isAbsolute, join } from "node:path";
import { hasSecret, readRegular } from "./capsule.ts";
import { checkDestination } from "./backup.ts";

export class PacketError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PacketError";
    this.code = code;
  }
}

export const PACKET_DATA = "devir.json";
export const PACKET_TEXT = "DEVIR.md";
export const PACKET_MANIFEST = "manifest.json";
const FILES = [PACKET_DATA, PACKET_TEXT, PACKET_MANIFEST];
export const STATUSES = ["not_started", "in_progress", "blocked", "review"] as const;
export type PacketStatus = (typeof STATUSES)[number];

export interface PacketData {
  format: 1;
  tool: "agentmom";
  kind: "handoff-packet";
  createdAt: string;
  title: string;
  goal: string;
  status: PacketStatus;
  origin: string;
  done: string[];
  next: string[];
  openQuestions: string[];
  constraints: string[];
  files: string[];
}

export interface PacketManifest {
  format: 1;
  kind: "handoff-packet-manifest";
  files: Array<{ name: string; bytes: number; sha256: string }>;
}

const LIMITS = { title: 120, goal: 2000, origin: 60, item: 300, path: 200, done: 30, next: 30, openQuestions: 20, constraints: 20, files: 100 } as const;
// Single-line text only: no control, format or separator characters (a line break or a bidi override could forge or reorder what the readable file shows).
// \p{Cc} controls, \p{Cf} format characters (zero-width, bidi overrides, soft hyphen, BOM), \p{Zl}/\p{Zp} line/paragraph separators, and unpaired surrogates (they do not survive a UTF-8 round trip).
const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;
// Words people actually write in this kind of note; redactString only knows English key names.
const TR_SECRET = /(?<![\p{L}\p{N}_])(?:parola|şifre|sifre|api[ _-]?key)(?![\p{L}\p{N}_])\s*[:=]\s*\S+/iu;
// A path may use letters, digits and . _ - / space @ + ( ) only (no ":" -> no NTFS streams, no "~", no backtick -> safe inside a code span).
const PATH_CHARS = /^[\p{L}\p{N}._\-\/ @+()]+$/u;

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function text(v: unknown, label: string, max: number, min = 1): string {
  if (typeof v !== "string") throw new PacketError("invalid_field", `${label} must be text`);
  const t = v.trim();
  if (t.length < min || t.length > max) throw new PacketError("invalid_field", `${label} must be ${min === 0 ? "at most" : `${min} to`} ${max} characters`);
  if (CONTROL.test(t)) throw new PacketError("invalid_field", `${label} must be a single line without control characters`);
  return t;
}

function list(v: unknown, label: string, maxItems: number, maxLen: number): string[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > maxItems) throw new PacketError("invalid_field", `${label} must be a list of at most ${maxItems} items`);
  return v.map((x, i) => text(x, `${label}[${i}]`, maxLen));
}

// File names only, relative, forward-slash, no traversal, no drive letters, no hidden-folder tricks.
function filePath(v: unknown, label: string): string {
  const p = text(v, label, LIMITS.path);
  if (!PATH_CHARS.test(p)) throw new PacketError("invalid_field", `${label} may contain only letters, digits and . _ - / space @ + ( )`);
  if (p.startsWith("/") || p.startsWith("\\") || /^[A-Za-z]:/.test(p) || p.includes("\\") || p.split("/").some((s) => s === "" || s === "." || s === "..")) {
    throw new PacketError("invalid_field", `${label} must be a relative path with forward slashes and no "." or ".." parts`);
  }
  return p;
}

// Validates untrusted input and returns the canonical packet data; unknown keys are refused so nothing rides along unseen.
export function normalizePacket(input: unknown, now: Date): PacketData {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new PacketError("invalid_input", "the input must be a JSON object");
  const o = input as Record<string, unknown>;
  const allowed = new Set(["title", "goal", "status", "origin", "done", "next", "openQuestions", "constraints", "files"]);
  for (const k of Object.keys(o)) if (!allowed.has(k)) throw new PacketError("invalid_input", `unknown field: ${k.slice(0, 40)}`);
  const status = o.status === undefined ? "in_progress" : o.status;
  if (typeof status !== "string" || !(STATUSES as readonly string[]).includes(status)) throw new PacketError("invalid_field", `status must be one of ${STATUSES.join(", ")}`);
  const files = list(o.files, "files", LIMITS.files, LIMITS.path).map((p, i) => filePath(p, `files[${i}]`));
  if (new Set(files.map((f) => f.toLowerCase())).size !== files.length) throw new PacketError("invalid_field", "files lists the same path twice (case-insensitively)");
  return {
    format: 1,
    tool: "agentmom",
    kind: "handoff-packet",
    createdAt: now.toISOString(),
    title: text(o.title, "title", LIMITS.title),
    goal: text(o.goal, "goal", LIMITS.goal),
    status: status as PacketStatus,
    origin: o.origin === undefined ? "" : text(o.origin, "origin", LIMITS.origin, 0),
    done: list(o.done, "done", LIMITS.done, LIMITS.item),
    next: list(o.next, "next", LIMITS.next, LIMITS.item),
    openQuestions: list(o.openQuestions, "openQuestions", LIMITS.openQuestions, LIMITS.item),
    constraints: list(o.constraints, "constraints", LIMITS.constraints, LIMITS.item),
    files,
  };
}

// Markdown-safe text: structural characters are escaped and a leading list/heading/setext marker is neutralised, so a value can never turn into a heading, list item, link, HTML or code.
function md(v: string): string {
  const e = v.replace(/[\\`*_[\]<>#!|~&]/g, "\\$&");
  return e.replace(/^([-+=]|\d+[.)])/, "\\$1");
}

// The readable file is ALWAYS derived from the data (create writes it, verify recomputes it and compares).
export function renderPacket(d: PacketData): string {
  const bullets = (xs: string[], raw = false): string[] => (xs.length ? xs.map((x) => (raw ? `- \`${x}\`` : `- ${md(x)}`)) : ["- (yok)"]);
  return [
    `# Devir: ${md(d.title)}`,
    "",
    `- Durum: ${d.status}`,
    `- Oluşturulma: ${d.createdAt}`,
    `- Kaynak makine/oturum: ${d.origin ? md(d.origin) : "belirtilmemiş"}`,
    "",
    "## Amaç",
    md(d.goal),
    "",
    "## Yapılanlar",
    ...bullets(d.done),
    "",
    "## Sıradaki adımlar",
    ...bullets(d.next),
    "",
    "## Açık sorular",
    ...bullets(d.openQuestions),
    "",
    "## Kısıtlar",
    ...bullets(d.constraints),
    "",
    "## İlgili dosyalar (yalnız adlar; içerik pakette YOK)",
    ...bullets(d.files, true),
    "",
    "Bu paket yalnız bilgi notudur: kod, anahtar ya da veritabanı taşımaz, hiçbir şeyi çalıştırmaz ve izin vermez. Devralan kişi/oturum yetkiyi kendi makinesinde ayrıca alır.",
    "",
  ].join("\n");
}

export interface CreatePacketOptions {
  input: unknown;
  destRoot: string;
  repoRoot: string;
  stateDir: string;
  now?: () => Date;
  gate?: (realDir: string) => void;
}

// Names the first field whose text looks like a key/secret ("" when none): lets the user fix the right line instead of guessing.
function secretField(d: PacketData): string {
  const fields: Array<[string, string]> = [["title", d.title], ["goal", d.goal], ["origin", d.origin]];
  for (const k of ["done", "next", "openQuestions", "constraints"] as const) d[k].forEach((x, i) => fields.push([`${k}[${i}]`, x]));
  for (const [name, v] of fields) if (hasSecret(v) || TR_SECRET.test(v)) return name;
  // File names: only value patterns name the field here; the whole-text scan below is stricter (a name like user_auth.ts is rejected, a known false positive).
  const f = d.files.findIndex((p) => redactString(p) !== p);
  return f >= 0 ? `files[${f}]` : "";
}

export function createPacket(opts: CreatePacketOptions): { dir: string; data: PacketData } {
  const now = (opts.now ?? (() => new Date()))();
  const data = normalizePacket(opts.input, now);
  const dataText = JSON.stringify(data, null, 2) + "\n";
  const md = renderPacket(data);
  // Everything is validated and scanned BEFORE the destination is touched.
  const bad = secretField(data);
  if (bad || hasSecret(dataText) || hasSecret(md)) throw new PacketError("secret_found", `${bad ? `the field "${bad}"` : "the packet"} looks like it contains a secret or key: nothing was written (packets never contain keys; rephrase the text)`);
  let repoReal = opts.repoRoot;
  try {
    repoReal = realpathSync.native(opts.repoRoot);
  } catch {
    // an unreachable project folder cannot contain the destination either
  }
  const root = checkDestination(opts.destRoot, { repoRoot: repoReal, stateDir: opts.stateDir, ...(opts.gate ? { gate: opts.gate } : {}) });
  const dBuf = Buffer.from(dataText, "utf8");
  const mBuf = Buffer.from(md, "utf8");
  const manifest: PacketManifest = { format: 1, kind: "handoff-packet-manifest", files: [{ name: PACKET_DATA, bytes: dBuf.length, sha256: sha256(dBuf) }, { name: PACKET_TEXT, bytes: mBuf.length, sha256: sha256(mBuf) }] };
  const manifestText = JSON.stringify(manifest, null, 2) + "\n";
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\..*$/, "").replace("T", "-");
  const dir = join(root, `agentmom-devir-${stamp}-${randomBytes(3).toString("hex")}`);
  try {
    mkdirSync(dir); // not recursive: fails if it exists
    writeFileSync(join(dir, PACKET_DATA), dBuf, { flag: "wx" });
    writeFileSync(join(dir, PACKET_TEXT), mBuf, { flag: "wx" });
    // The manifest is written LAST: a folder without one is an unfinished attempt and verify refuses it.
    writeFileSync(join(dir, PACKET_MANIFEST), manifestText, { flag: "wx" });
  } catch (e) {
    throw new PacketError("write_failed", `the packet could not be written (${(e as NodeJS.ErrnoException).code ?? "error"}); a partial folder may remain: ${dir}`);
  }
  return { dir, data };
}

export interface PacketVerifyReport {
  ok: boolean;
  problems: string[];
  data: PacketData | null;
  text: string | null;
}

// Strict, read-only verification; the bytes it checked are the bytes it reports.
export function verifyPacket(dir: string): PacketVerifyReport {
  const problems: string[] = [];
  const fail = (m: string): PacketVerifyReport => ({ ok: false, problems: [...problems, m], data: null, text: null });
  if (!isAbsolute(dir)) return fail("packet path must be absolute");
  const read = (name: string): Buffer | null => {
    try {
      return readRegular(join(dir, name), name);
    } catch {
      return null;
    }
  };
  const mBuf = read(PACKET_MANIFEST);
  if (!mBuf) return fail("no manifest.json: not a finished AgentMom handoff packet");
  let manifest: PacketManifest;
  try {
    manifest = JSON.parse(mBuf.toString("utf8")) as PacketManifest;
  } catch {
    return fail("manifest.json is not valid JSON");
  }
  if (!manifest || manifest.format !== 1 || manifest.kind !== "handoff-packet-manifest" || !Array.isArray(manifest.files)) return fail("manifest has an unknown shape");
  // Nothing rides along unseen: exact keys, exact entry keys and types, canonical bytes, and the manifest itself is secret-scanned.
  const exact = (o: unknown, keys: string[]): boolean => !!o && typeof o === "object" && !Array.isArray(o) && Object.keys(o as object).join() === keys.join();
  if (!exact(manifest, ["format", "kind", "files"]) || !manifest.files.every((f) => exact(f, ["name", "bytes", "sha256"]) && typeof f.name === "string" && Number.isInteger(f.bytes) && typeof f.sha256 === "string" && /^[0-9a-f]{64}$/.test(f.sha256))) return fail("manifest has unexpected or malformed fields");
  if (JSON.stringify(manifest, null, 2) + "\n" !== mBuf.toString("utf8")) problems.push("manifest.json is not in canonical form");
  if (hasSecret(mBuf.toString("utf8"))) problems.push("manifest.json contains secret-looking content");
  if (manifest.files.length !== 2 || manifest.files[0]?.name !== PACKET_DATA || manifest.files[1]?.name !== PACKET_TEXT) problems.push("manifest must list exactly devir.json and DEVIR.md, in that order");
  const bufs: Record<string, Buffer | null> = {};
  for (const name of [PACKET_DATA, PACKET_TEXT]) {
    const b = read(name);
    bufs[name] = b;
    const entry = manifest.files.find((f) => f && f.name === name);
    if (!b) problems.push(`${name}: missing or unreadable`);
    else if (!entry || entry.bytes !== b.length || entry.sha256 !== sha256(b)) problems.push(`${name}: content does not match the manifest (changed or corrupted)`);
  }
  for (const n of readdirSync(dir)) if (!FILES.includes(n)) problems.push(`${n}: not part of a packet (unexpected file)`);
  let data: PacketData | null = null;
  if (bufs[PACKET_DATA]) {
    try {
      const parsed = JSON.parse(bufs[PACKET_DATA]!.toString("utf8")) as Record<string, unknown>;
      const { format, tool, kind, createdAt, ...rest } = parsed;
      if (format !== 1 || tool !== "agentmom" || kind !== "handoff-packet" || typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))) throw new PacketError("invalid_input", "devir.json has an unknown shape");
      data = normalizePacket(rest, new Date(createdAt));
      if (data.createdAt !== createdAt) throw new PacketError("invalid_input", "createdAt is not canonical");
      if (JSON.stringify(data, null, 2) + "\n" !== bufs[PACKET_DATA]!.toString("utf8")) throw new PacketError("invalid_input", "devir.json is not in canonical form (missing fields, reordered keys or extra whitespace)");
    } catch (e) {
      problems.push(`devir.json: ${e instanceof Error ? e.message : "invalid"}`);
    }
  }
  let md: string | null = null;
  if (bufs[PACKET_TEXT]) {
    md = bufs[PACKET_TEXT]!.toString("utf8");
    if (data && md !== renderPacket(data)) problems.push("DEVIR.md does not match devir.json (the readable text is derived from the data)");
    if (hasSecret(md) || (bufs[PACKET_DATA] && hasSecret(bufs[PACKET_DATA]!.toString("utf8")))) problems.push("the packet contains secret-looking content");
  }
  return { ok: problems.length === 0, problems, data: problems.length === 0 ? data : null, text: problems.length === 0 ? md : null };
}

// Reading a packet never writes anything: it verifies, then returns the readable text.
export function openPacket(dir: string): { data: PacketData; text: string } {
  const r = verifyPacket(dir);
  if (!r.ok || !r.data || r.text === null) throw new PacketError("verify_failed", `the packet did not verify: ${r.problems.join("; ").slice(0, 400)}`);
  return { data: r.data, text: r.text };
}

export function isPacketFolder(dir: string): boolean {
  try {
    return lstatSync(join(dir, PACKET_MANIFEST)).isFile();
  } catch {
    return false;
  }
}
