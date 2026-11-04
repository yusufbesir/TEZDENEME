// Skill Factory (madde 36): yazılı bir tarif (spec) ile belirleyici (deterministik) bir SKILL.md üretir. Sahip: Claude [İP:AgentMom devam].
// Model yok, ağ yok, betik üretmez (yalnız metin beceri: risk sınıfı "contained"). Kullanıcı çalıştırınca ve YENİ bir klasöre yazar; var olan bir şeyin üzerine yazmaz.
// Üretilen beceri yaşam döngüsünde yine aday olarak başlar; kapılar ve yayın insana aittir.
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, rmdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hasSecret } from "../ops/capsule.ts";
import { SKILL_FILE, artifactDigest, validSkillName } from "./hunter.ts";

const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const MAX_ITEMS = 30;

export interface SkillSpec {
  name: string;
  description: string;
  title: string;
  when: string[];
  steps: string[];
  notes?: string[];
}
export class FactoryError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "FactoryError";
    this.code = code;
  }
}

function line(v: unknown, what: string, max: number): string {
  if (typeof v !== "string" || v.trim().length === 0 || v.length > max || CONTROL.test(v)) throw new FactoryError("invalid_spec", `${what} must be 1..${max} characters of single-line plain text`);
  if (hasSecret(v)) throw new FactoryError("invalid_spec", `${what} looks like it contains a secret`);
  return v.trim();
}
function list(v: unknown, what: string, required: boolean): string[] {
  if (v === undefined && !required) return [];
  if (!Array.isArray(v) || v.length > MAX_ITEMS || (required && v.length === 0)) throw new FactoryError("invalid_spec", `${what} must be a list of ${required ? 1 : 0}..${MAX_ITEMS} items`);
  return v.map((x, i) => line(x, `${what}[${i}]`, 500));
}

// Katı biçim: bilinmeyen alan reddedilir. Markdown/ön bilgi enjeksiyonunu önlemek için hiçbir alan satır sonu taşıyamaz; liste öğeleri madde işareti olarak yazılır.
export function parseSpec(raw: unknown): SkillSpec {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new FactoryError("invalid_spec", "spec must be an object");
  const o = raw as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!["name", "description", "title", "when", "steps", "notes"].includes(k)) throw new FactoryError("invalid_spec", `unknown field ${k.slice(0, 30)}`);
  const name = o["name"];
  if (!validSkillName(name)) throw new FactoryError("invalid_spec", "name must be letters, digits, . _ - (1..100), not end with a dot and not be a Windows device name (con, nul, aux...)");
  return { name, description: line(o["description"], "description", 2000), title: line(o["title"], "title", 120), when: list(o["when"], "when", true), steps: list(o["steps"], "steps", true), notes: list(o["notes"], "notes", false) };
}

export function renderSkill(spec: SkillSpec): string {
  const s = parseSpec(spec);
  const bullets = (xs: string[]): string => xs.map((x) => `- ${x}`).join("\n");
  const numbered = s.steps.map((x, i) => `${i + 1}. ${x}`).join("\n");
  const parts = [`---\nname: ${JSON.stringify(s.name)}\ndescription: ${JSON.stringify(s.description)}\n---\n`, `# ${s.title}\n`, `## Ne zaman\n${bullets(s.when)}\n`, `## Adımlar\n${numbered}\n`];
  if (s.notes && s.notes.length > 0) parts.push(`## Notlar\n${bullets(s.notes)}\n`);
  return parts.join("\n");
}

// <outDir>/<name>/SKILL.md yazar. outDir var olan gerçek klasör olmalı; <name> klasörü zaten varsa reddeder (ezme yok). Dönüş: paketin özeti (avcıyla aynı biçim).
export function writeSkill(rawSpec: unknown, outDir: string): { dir: string; file: string; artifactSha256: string } {
  const spec = parseSpec(rawSpec);
  const body = renderSkill(spec);
  let st;
  try {
    st = lstatSync(outDir);
  } catch {
    throw new FactoryError("invalid_target", "the target folder does not exist");
  }
  if (!st.isDirectory() || st.isSymbolicLink()) throw new FactoryError("invalid_target", "the target must be a real directory");
  const dir = join(outDir, spec.name);
  try {
    mkdirSync(dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new FactoryError("exists", "a file or folder with this skill name already exists; nothing was written");
    throw new FactoryError("write_failed", "could not create the skill folder");
  }
  const file = join(dir, SKILL_FILE);
  let created = false;
  try {
    writeFileSync(file, body, { flag: "wx" });
    created = true;
  } catch {
    // Dosya bu çağrıda oluşmadıysa (wx başarısız) ona dokunulmaz; yalnız bu çağrının açtığı klasör boşsa kaldırılır.
    try {
      rmdirSync(dir);
    } catch {
      // başka şey varsa dokunma
    }
  }
  if (!created) throw new FactoryError("write_failed", "could not write SKILL.md");
  return { dir, file, artifactSha256: artifactDigest([{ path: SKILL_FILE, sha256: createHash("sha256").update(body).digest("hex") }]) };
}
