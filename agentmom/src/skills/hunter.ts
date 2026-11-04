// Skill Hunter (madde 35): kullanıcının verdiği YEREL klasörde beceri adaylarını bulur. Sahip: Claude [İP:AgentMom devam].
// Ağ yok, indirme yok, beceri ÇALIŞTIRILMAZ, hiçbir şey yazılmaz (ADR-016). Çıktı yalnız bir öneridir: yaşam döngüsüne aday olarak kaydetmek
// (SkillLifecycle.propose) ve tüm kapılar insana aittir. Hızlı ön süzgeç riskleri işaretler; güvenlik incelemesinin yerine GEÇMEZ.
import { createHash } from "node:crypto";
import { lstatSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { hasSecret, readRegular } from "../ops/capsule.ts";
import type { RiskClass } from "./lifecycle.ts";

export const SKILL_FILE = "SKILL.md";
export const MAX_SKILLS = 200;
export const MAX_FILES_PER_SKILL = 100;
const MAX_DEPTH = 4;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
// Yalnız bu uzantılar "belge" sayılır; başka her şey (Makefile, .psm1, .vbs, .lua, uzantısız...) betik/yürütülebilir kabul edilir (yanlış pozitif tercih edilir).
const DOC_EXT = /\.(md|markdown|txt|json|ya?ml|csv|tsv|html?|css|svg|png|jpe?g|gif|webp|pdf)$/i;
const NETWORK_HINT = /https?:\/\/|\b(curl|wget|fetch|axios|requests\.|urllib|http\.client|node:https?|socket|ssh|scp|nc|netcat|git\s+clone|pip3?\s+install|npm\s+(i|install)|invoke-webrequest|iwr)\b/i;
// Belgede bile kabuk komutu/yükseltme ipucu: SKILL.md ve metin dosyalarına gömülü komutlar yaşam döngüsünde "betikli" sayılır.
const COMMAND_HINT = /\b(bash|zsh|powershell|pwsh|cmd\.exe|sudo|chmod|eval|rm\s+-rf|postinstall|allowed-tools)\b|\|\s*(ba)?sh\b|\b(curl|wget)\b/i;
const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
// Windows'ta sorun çıkaran adlar (aygıt adları, sonda nokta) kabul edilmez.
export function validSkillName(n: unknown): n is string {
  return typeof n === "string" && NAME_RE.test(n) && !RESERVED.test(n) && !n.endsWith(".");
}

export class HunterError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "HunterError";
    this.code = code;
  }
}

export interface HuntCandidate {
  folder: string;
  name: string;
  description: string;
  riskClass: RiskClass;
  artifactSha256: string;
  files: number;
  findings: string[];
  // Gizli bilgi ya da ikili dosya yoksa true. Betik, komut ipucu, aynı ad/içerik bulguları ENGELLEMEZ (yalnız yazılır); true "güvenli" demek değildir.
  proposable: boolean;
}
export interface HuntReport {
  candidates: HuntCandidate[];
  skipped: Array<{ folder: string; reason: string }>;
}

// Bir beceri paketinin tek özeti: yol sırasına göre "yol NUL dosya-özeti" satırlarının özeti. Fabrika ve avcı aynı işlevi kullanır.
export function artifactDigest(files: Array<{ path: string; sha256: string; exec?: boolean }>): string {
  const lines = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)).map((f) => `${f.path}\0${f.sha256}\0${f.exec ? "x" : "-"}\n`);
  return createHash("sha256").update(lines.join("")).digest("hex");
}

// Çok basit, katı ön bilgi: yalnız "---" arasında "anahtar: değer" satırları. Başka biçim reddedilir.
export function parseFrontmatter(md: string): { name: string; description: string; extraKeys: string[] } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(md);
  if (!m) throw new HunterError("invalid_skill", "SKILL.md must start with a --- frontmatter block");
  const got: Record<string, string> = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const kv = /^([a-z][a-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!kv) throw new HunterError("invalid_skill", "frontmatter lines must be 'key: value'");
    if (Object.hasOwn(got, kv[1]!)) throw new HunterError("invalid_skill", `frontmatter key repeated: ${kv[1]}`);
    let val = kv[2]!.trim();
    if (val.startsWith('"')) {
      try {
        const j: unknown = JSON.parse(val);
        if (typeof j !== "string") throw new Error();
        val = j;
      } catch {
        throw new HunterError("invalid_skill", "a quoted frontmatter value must be a JSON string");
      }
    }
    got[kv[1]!] = val;
  }
  const extraKeys = Object.keys(got).filter((k) => k !== "name" && k !== "description");
  const name = got["name"];
  const description = got["description"];
  if (name === undefined || !validSkillName(name)) throw new HunterError("invalid_skill", "name must be letters, digits, . _ - (1..100)");
  if (description === undefined || description.length === 0 || description.length > 2000 || CONTROL.test(description)) throw new HunterError("invalid_skill", "description must be 1..2000 characters of plain text");
  return { name, description, extraKeys };
}

function scanFolder(root: string, folder: string): HuntCandidate {
  const dir = join(root, folder);
  const list: Array<{ path: string; sha256: string; exec?: boolean }> = [];
  let skillBuf: Buffer | undefined;
  const findings: string[] = [];
  let hasScript = false;
  let hasNetwork = false;
  const walk = (d: string, depth: number): void => {
    if (depth > MAX_DEPTH) throw new HunterError("invalid_skill", "folders nest too deeply");
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      const st = lstatSync(p);
      const rel = relative(dir, p).split("\\").join("/");
      if (st.isSymbolicLink()) throw new HunterError("invalid_skill", `symlinks are not allowed: ${rel.slice(0, 80)}`);
      if (st.isDirectory()) {
        walk(p, depth + 1);
        continue;
      }
      if (!st.isFile()) throw new HunterError("invalid_skill", `not a regular file: ${rel.slice(0, 80)}`);
      if (list.length >= MAX_FILES_PER_SKILL) throw new HunterError("invalid_skill", `more than ${MAX_FILES_PER_SKILL} files`);
      let buf: Buffer;
      try {
        buf = readRegular(p, rel);
      } catch {
        throw new HunterError("invalid_skill", `could not read as a regular, single-link file under 1 MB: ${rel.slice(0, 80)}`);
      }
      if (/[\\:]/.test(n) || CONTROL.test(n)) throw new HunterError("invalid_skill", `file name has characters that differ between systems: ${JSON.stringify(rel).slice(0, 80)}`);
      const exec = (st.mode & 0o111) !== 0;
      list.push({ path: rel, sha256: createHash("sha256").update(buf).digest("hex"), exec });
      if (rel === SKILL_FILE) skillBuf = buf;
      const binary = buf.includes(0);
      const asText = buf.toString("utf8").replace(/^\uFEFF/, "");
      const script = !DOC_EXT.test(n) || exec || asText.startsWith("#!");
      if (binary) findings.push(`binary file: ${rel}`);
      if (script || binary) hasScript = true;
      if (!binary && (hasSecret(asText) || hasSecret(rel))) findings.push(`secret-looking content: ${rel}`);
      if (!binary && !script && COMMAND_HINT.test(asText)) {
        hasScript = true;
        findings.push(`mentions shell commands or tool grants: ${rel}`);
      }
      if (!binary && (script || COMMAND_HINT.test(asText)) && NETWORK_HINT.test(asText)) hasNetwork = true;
    }
  };
  walk(dir, 0);
  if (!skillBuf) throw new HunterError("invalid_skill", `no ${SKILL_FILE} at the top of the folder`);
  const fm = parseFrontmatter(skillBuf.toString("utf8").replace(/^\uFEFF/, ""));
  for (const k of fm.extraKeys) findings.push(`unknown frontmatter key: ${k.slice(0, 40)}`);
  const riskClass: RiskClass = hasNetwork ? "remote" : hasScript ? "privileged" : "contained";
  if (hasScript) findings.push("contains scripts or binaries: needs the security gate and an isolated test");
  const blocking = findings.some((f) => f.startsWith("secret-looking") || f.startsWith("binary file"));
  return { folder, name: fm.name, description: fm.description, riskClass, artifactSha256: artifactDigest(list), files: list.length, findings, proposable: !blocking };
}

// Kök klasörün ilk düzey alt klasörlerinin her biri bir beceri adayıdır. Biri bozuksa diğerleri etkilenmez, nedeni "skipped" içinde yazılır.
export function huntSkills(root: string): HuntReport {
  let st;
  try {
    st = lstatSync(root);
  } catch {
    throw new HunterError("invalid_root", "the folder does not exist");
  }
  if (!st.isDirectory() || st.isSymbolicLink()) throw new HunterError("invalid_root", "the folder must be a real directory");
  const names = readdirSync(root).sort();
  if (names.length > MAX_SKILLS) throw new HunterError("invalid_root", `the folder lists more than ${MAX_SKILLS} entries`);
  const candidates: HuntCandidate[] = [];
  const skipped: HuntReport["skipped"] = [];
  const seenNames = new Map<string, string>();
  const seenDigests = new Map<string, string>();
  for (const folder of names) {
    try {
      const l = lstatSync(join(root, folder));
      if (l.isSymbolicLink() || !l.isDirectory()) {
        skipped.push({ folder, reason: "not a real folder" });
        continue;
      }
      const c = scanFolder(root, folder);
      const dupName = seenNames.get(c.name.toLowerCase());
      if (dupName !== undefined) c.findings.push(`same name as folder ${dupName}`);
      const dupDigest = seenDigests.get(c.artifactSha256);
      if (dupDigest !== undefined) c.findings.push(`identical content to folder ${dupDigest}`);
      seenNames.set(c.name.toLowerCase(), folder);
      seenDigests.set(c.artifactSha256, folder);
      candidates.push(c);
    } catch (e) {
      skipped.push({ folder: folder.slice(0, 80), reason: e instanceof HunterError ? e.message.slice(0, 200) : "unreadable" });
    }
  }
  return { candidates, skipped };
}

// Yaşam döngüsüne önerilecek kayıt girdisi. Kaydı yapmak çağıranın (insanın) kararıdır.
export function toProposal(c: HuntCandidate, origin: string): { name: string; origin: string; description: string; riskClass: RiskClass; artifactSha256: string } {
  if (!c.proposable) throw new HunterError("not_proposable", "this candidate has blocking findings");
  return { name: c.name, origin, description: c.description, riskClass: c.riskClass, artifactSha256: c.artifactSha256 };
}
