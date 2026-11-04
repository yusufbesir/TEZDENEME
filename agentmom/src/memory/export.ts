// Obsidian-compatible Markdown export of memory records (Faz 5b). Owner: Claude [IP:AgentMom Faz 5].
// APPEND ONLY: each record becomes a NEW file created with the exclusive flag ("wx"); an existing file is never overwritten, even
// by the same record. The keys folder ("anahtarlar") is refused outright, in addition to whatever the policy gate says.
import { lstatSync, realpathSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve, sep } from "node:path";
import { foldTr, MemoryError } from "./store.ts";
import type { MemoryRecord, MemoryStore } from "./store.ts";

export interface ExportResult {
  written: Array<{ id: string; path: string }>;
  skipped: Array<{ id: string; path: string; reason: "exists" }>;
}

// Throws MemoryError when the policy (or anything else the caller enforces) refuses this directory.
export type ExportGate = (dir: string) => void;

const KEYS_FOLDER = /(^|[\\/])anahtarlar([\\/]|$)/i;

export function slugFor(title: string): string {
  const s = foldTr(title).match(/[a-z0-9]+/g)?.join("-").slice(0, 50).replace(/-+$/g, "");
  return s && s.length > 0 ? s : "kayit";
}

// Values are JSON-encoded (valid YAML scalars) so a record can never inject extra front-matter keys.
function yaml(key: string, value: unknown): string {
  return `${key}: ${JSON.stringify(value ?? null)}`;
}

export function renderMarkdown(rec: MemoryRecord, flags: string[], label: string): string {
  // Untrusted text: fence it (longer than any backtick run inside) so Obsidian shows it instead of interpreting it, and break Templater tags.
  const clean = rec.body.replace(/\u0000/g, "").replace(/<%/g, "< %");
  const longest = Math.max(2, ...(clean.match(/`+/g) ?? []).map((r) => r.length));
  const fence = "`".repeat(longest + 1);
  const body = `${fence}text\n${clean}\n${fence}`;
  return [
    "---",
    yaml("description", "AgentMom operasyonel hafıza kaydı (salt ekleme). Sahip: AgentMom/Claude. Bu dosya üzerine yazılmaz; düzeltme yeni bir kayıtla yapılır. Silme yalnız Yusuf'un kararıyla ve Geri Dönüşüm Kutusu'na taşıyarak."),
    yaml("yazan", label),
    yaml("id", rec.id),
    yaml("tur", rec.kind),
    yaml("konu", rec.subject),
    yaml("kapsam", rec.scope),
    yaml("kaynak", rec.source),
    yaml("kaynak_ref", rec.sourceRef),
    yaml("guven", rec.confidence),
    yaml("gozlem_zamani", rec.observedAt),
    yaml("kayit_zamani", rec.createdAt),
    yaml("gecerlilik_sonu", rec.validUntil),
    yaml("durum", rec.status),
    yaml("bayraklar", flags),
    yaml("yerini_aldigi", rec.supersedesId),
    yaml("gizli_bilgi_maskelendi", rec.redacted),
    "---",
    `# ${rec.title.replace(/[\r\n]+/g, " ")}`,
    "",
    body,
    "",
  ].join("\n");
}

export function exportRecords(store: MemoryStore, ids: string[], dir: string, opts: { gate: ExportGate; label?: string; now?: () => Date }): ExportResult {
  if (!isAbsolute(dir)) throw new MemoryError("invalid_dir", "export directory must be an absolute path");
  const target = resolve(dir);
  if (KEYS_FOLDER.test(target)) throw new MemoryError("forbidden_dir", "the keys folder is never an export target");
  let st;
  try {
    st = lstatSync(target);
  } catch {
    throw new MemoryError("invalid_dir", "export directory must already exist (it is never created)");
  }
  if (!st.isDirectory() || st.isSymbolicLink()) throw new MemoryError("invalid_dir", "export target must be a real directory (no symlink or junction)");
  const real = realpathSync.native(target);
  if (KEYS_FOLDER.test(real)) throw new MemoryError("forbidden_dir", "the keys folder is never an export target");
  opts.gate(real);
  const now = opts.now ?? (() => new Date());
  const label = opts.label ?? "[İP:AgentMom Faz 5]";
  const result: ExportResult = { written: [], skipped: [] };
  for (const id of ids) {
    const rec = store.get(id);
    const day = (rec.observedAt || now().toISOString()).slice(0, 10);
    const path = join(real, `AgentMom-${day}-${slugFor(rec.title)}-${rec.id.slice(0, 8)}.md`);
    if (!path.startsWith(real + sep)) throw new MemoryError("invalid_dir", "export path escaped the directory");
    try {
      writeFileSync(path, renderMarkdown(rec, store.flagsFor(rec, now()), label), { flag: "wx", encoding: "utf8" });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        result.skipped.push({ id, path, reason: "exists" });
        continue;
      }
      throw err;
    }
    store.markExported(id, path);
    result.written.push({ id, path });
  }
  return result;
}
