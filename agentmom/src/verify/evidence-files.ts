import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EvidenceItem, EvidenceKind } from "./schema.ts";

export function sha256Of(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

// Evidence files are written once under the evidence directory (on D:) and described by hash and size so any later reader can prove they are unchanged.
export function saveEvidence(dir: string, id: string, kind: EvidenceKind, summary: string, data: Buffer | string, extension: string): EvidenceItem {
  mkdirSync(dir, { recursive: true });
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  const path = join(dir, `${id}.${extension}`);
  writeFileSync(path, buf, { flag: "wx" });
  return { id, kind, summary, path, sha256: sha256Of(buf), bytes: buf.length };
}

export function checkEvidenceFile(item: EvidenceItem): string | null {
  if (!item.path) return null;
  try {
    const st = statSync(item.path);
    if (!st.isFile()) return `${item.id}: not a file`;
    if (st.size === 0) return `${item.id}: empty file`;
    if (item.bytes !== undefined && st.size !== item.bytes) return `${item.id}: size changed (${st.size} != ${item.bytes})`;
    if (item.sha256 && sha256Of(readFileSync(item.path)) !== item.sha256) return `${item.id}: hash mismatch`;
    return null;
  } catch {
    return `${item.id}: file missing`;
  }
}

// Describes a file another process already wrote (e.g. a screenshot): the trusted parent computes the hash and size.
export function describeFile(path: string, id: string, kind: EvidenceKind, summary: string): EvidenceItem {
  const buf = readFileSync(path);
  return { id, kind, summary, path, sha256: sha256Of(buf), bytes: buf.length };
}
