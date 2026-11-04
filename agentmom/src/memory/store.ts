// AgentMom operational memory (Faz 5b). Owner: Claude [IP:AgentMom Faz 5].
// Records are append-only (SQL trigger): a correction is a new record that supersedes the old one. Every record carries
// source / time / confidence / scope; contradictions and staleness are FLAGGED, never resolved or hidden automatically.
// Search is SQLite FTS5 over Turkish-folded text. Text is redacted (known secret shapes) before it is stored.
import { createHash, randomUUID } from "node:crypto";
import type { Db } from "../core/db/db.ts";
import { redactString } from "../core/audit/redact.ts";

export const MEMORY_KINDS = ["fact", "decision", "incident", "note", "result"] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

// A record older than this (from observed_at) is flagged stale; valid_until in the past is flagged expired.
export const STALE_AFTER_DAYS: Record<MemoryKind, number> = { fact: 90, decision: 365, incident: 30, note: 180, result: 60 };

export class MemoryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MemoryError";
    this.code = code;
  }
}

export interface MemoryInput {
  kind: MemoryKind;
  title: string;
  body: string;
  source: string;
  scope: string;
  confidence: number;
  subject?: string;
  sourceRef?: string;
  observedAt?: string;
  validUntil?: string;
  supersedesId?: string;
}

export type MemoryFlagName = "stale" | "expired" | "contradiction" | "low_confidence";

export interface MemoryRecord {
  id: string;
  kind: MemoryKind;
  subject: string | null;
  title: string;
  body: string;
  source: string;
  sourceRef: string | null;
  scope: string;
  confidence: number;
  observedAt: string;
  createdAt: string;
  validUntil: string | null;
  supersedesId: string | null;
  status: "active" | "superseded" | "retired";
  redacted: boolean;
  exportedPath: string | null;
}

export interface SearchHit extends MemoryRecord {
  rank: number;
  flags: MemoryFlagName[];
}

interface Row {
  id: string;
  kind: MemoryKind;
  subject: string | null;
  title: string;
  body: string;
  source: string;
  source_ref: string | null;
  scope: string;
  confidence: number;
  observed_at: string;
  created_at: string;
  valid_until: string | null;
  supersedes_id: string | null;
  status: MemoryRecord["status"];
  redacted: number;
  exported_path: string | null;
}

// Turkish-aware folding: dotless/dotted i first (toLowerCase would turn İ into i + combining dot), then drop remaining diacritics.
export function foldTr(text: string): string {
  return text
    .replace(/[İIı]/g, "i")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .normalize("NFC");
}

const SCOPE = /^[A-Za-z0-9][A-Za-z0-9_.:\- ]{0,79}$/;

function isoOrThrow(v: string, name: string): string {
  const t = Date.parse(v);
  if (!Number.isFinite(t) || !/^\d{4}-\d{2}-\d{2}/.test(v)) throw new MemoryError("invalid_field", `${name} must be an ISO date-time`);
  return new Date(t).toISOString();
}

function toRecord(r: Row): MemoryRecord {
  return {
    id: r.id,
    kind: r.kind,
    subject: r.subject,
    title: r.title,
    body: r.body,
    source: r.source,
    sourceRef: r.source_ref,
    scope: r.scope,
    confidence: r.confidence,
    observedAt: r.observed_at,
    createdAt: r.created_at,
    validUntil: r.valid_until,
    supersedesId: r.supersedes_id,
    status: r.status,
    redacted: r.redacted === 1,
    exportedPath: r.exported_path,
  };
}

function text(v: unknown, name: string, max: number, required = true): string {
  if (typeof v !== "string" || v.length > max || (required && v.trim().length === 0)) throw new MemoryError("invalid_field", `${name} must be ${required ? "a non-empty " : "a "}string of at most ${max} characters`);
  return v;
}

export class MemoryStore {
  private readonly db: Db;
  private readonly now: () => Date;

  constructor(db: Db, now: () => Date = () => new Date()) {
    this.db = db;
    this.now = now;
  }

  add(input: MemoryInput): { record: MemoryRecord; duplicate: boolean; contradictions: string[] } {
    if (!(MEMORY_KINDS as readonly string[]).includes(input.kind)) throw new MemoryError("invalid_field", `kind must be one of ${MEMORY_KINDS.join(", ")}`);
    const rawTitle = text(input.title, "title", 200);
    const rawBody = text(input.body, "body", 8000);
    const source = redactString(text(input.source, "source", 200));
    if (typeof input.scope !== "string" || !SCOPE.test(input.scope) || redactString(input.scope) !== input.scope) throw new MemoryError("invalid_field", "scope must be a short name (letters, digits, - _ . : and spaces)");
    if (typeof input.confidence !== "number" || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) throw new MemoryError("invalid_field", "confidence must be a number from 0 to 1");
    const subject = input.subject === undefined ? null : redactString(text(input.subject, "subject", 120));
    const sourceRef = input.sourceRef === undefined ? null : redactString(text(input.sourceRef, "sourceRef", 500, false));
    const createdAt = this.now().toISOString();
    const observedAt = input.observedAt === undefined ? createdAt : isoOrThrow(input.observedAt, "observedAt");
    const validUntil = input.validUntil === undefined ? null : isoOrThrow(input.validUntil, "validUntil");
    if (Date.parse(observedAt) > Date.parse(createdAt) + 60_000) throw new MemoryError("invalid_field", "observedAt is in the future");
    const title = redactString(rawTitle);
    const body = redactString(rawBody);
    const redacted = title !== rawTitle || body !== rawBody;
    const contentHash = createHash("sha256").update(JSON.stringify([input.scope, subject, title, body])).digest("hex");

    // Callers (e.g. the decision ledger) may already hold a transaction: then this becomes a savepoint inside it.
    const nested = this.db.isTransaction;
    this.db.exec(nested ? "SAVEPOINT memory_add" : "BEGIN IMMEDIATE");
    try {
      const same = this.db.prepare("SELECT * FROM memory_records WHERE content_hash = ? AND status = 'active'").get(contentHash) as unknown as Row | undefined;
      if (same) {
        this.db.exec(nested ? "RELEASE memory_add" : "COMMIT");
        return { record: toRecord(same), duplicate: true, contradictions: [] };
      }
      let supersedes: Row | undefined;
      if (input.supersedesId !== undefined) {
        supersedes = this.db.prepare("SELECT * FROM memory_records WHERE id = ?").get(input.supersedesId) as unknown as Row | undefined;
        if (!supersedes) throw new MemoryError("not_found", "supersedesId does not exist");
        if (supersedes.status !== "active") throw new MemoryError("conflict", "only an active record can be superseded");
        if (supersedes.scope !== input.scope) throw new MemoryError("conflict", "a superseding record must keep the scope");
      }
      const id = randomUUID();
      this.db
        .prepare(
          `INSERT INTO memory_records (id, kind, subject, title, body, source, source_ref, scope, confidence, observed_at, created_at, valid_until, supersedes_id, status, content_hash, redacted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        )
        .run(id, input.kind, subject, title, body, source, sourceRef, input.scope, input.confidence, observedAt, createdAt, validUntil, supersedes?.id ?? null, contentHash, redacted ? 1 : 0);
      this.db.prepare("INSERT INTO memory_fts (record_id, title, body) VALUES (?, ?, ?)").run(id, foldTr(title), foldTr(body));
      if (supersedes) this.db.prepare("UPDATE memory_records SET status = 'superseded' WHERE id = ?").run(supersedes.id);
      const contradictions: string[] = [];
      if (subject !== null) {
        const others = this.db
          .prepare("SELECT id FROM memory_records WHERE scope = ? AND subject = ? AND status = 'active' AND id != ? AND content_hash != ?")
          .all(input.scope, subject, id, contentHash) as unknown as Array<{ id: string }>;
        for (const o of others) {
          this.db
            .prepare("INSERT INTO memory_flags (id, record_id, other_id, flag, detail, created_at) VALUES (?, ?, ?, 'contradiction', ?, ?)")
            .run(randomUUID(), id, o.id, `two active records about "${subject}" in scope "${input.scope}" disagree; neither supersedes the other`, createdAt);
          contradictions.push(o.id);
        }
      }
      this.db.exec(nested ? "RELEASE memory_add" : "COMMIT");
      return { record: toRecord(this.mustGet(id)), duplicate: false, contradictions };
    } catch (err) {
      this.db.exec(nested ? "ROLLBACK TO memory_add; RELEASE memory_add" : "ROLLBACK");
      throw err;
    }
  }

  private mustGet(id: string): Row {
    const r = this.db.prepare("SELECT * FROM memory_records WHERE id = ?").get(id) as unknown as Row | undefined;
    if (!r) throw new MemoryError("not_found", `memory record ${id} not found`);
    return r;
  }

  get(id: string): MemoryRecord {
    return toRecord(this.mustGet(id));
  }

  // Retiring is the only way a record leaves the default results; the row and its history stay.
  retire(id: string): MemoryRecord {
    const r = this.mustGet(id);
    if (r.status === "retired") return toRecord(r);
    this.db.prepare("UPDATE memory_records SET status = 'retired' WHERE id = ?").run(id);
    return toRecord(this.mustGet(id));
  }

  flagsFor(record: MemoryRecord, at: Date = this.now()): MemoryFlagName[] {
    const flags: MemoryFlagName[] = [];
    if (record.validUntil !== null && Date.parse(record.validUntil) < at.getTime()) flags.push("expired");
    else if (at.getTime() - Date.parse(record.observedAt) > STALE_AFTER_DAYS[record.kind] * 86_400_000) flags.push("stale");
    const open = this.db.prepare("SELECT COUNT(*) AS n FROM memory_flags WHERE (record_id = ? OR other_id = ?) AND flag = 'contradiction' AND resolved_at IS NULL").get(record.id, record.id) as unknown as { n: number };
    if (open.n > 0) flags.push("contradiction");
    if (record.confidence < 0.5) flags.push("low_confidence");
    return flags;
  }

  openContradictions(): Array<{ id: string; recordId: string; otherId: string | null; detail: string }> {
    return (this.db.prepare("SELECT id, record_id, other_id, detail FROM memory_flags WHERE flag = 'contradiction' AND resolved_at IS NULL ORDER BY created_at").all() as unknown as Array<{ id: string; record_id: string; other_id: string | null; detail: string }>).map((r) => ({ id: r.id, recordId: r.record_id, otherId: r.other_id, detail: r.detail }));
  }

  // Only a person resolves a contradiction (the caller enforces who may call this).
  resolveFlag(flagId: string, resolvedBy: string): void {
    const r = this.db.prepare("UPDATE memory_flags SET resolved_at = ?, resolved_by = ? WHERE id = ? AND resolved_at IS NULL").run(this.now().toISOString(), redactString(text(resolvedBy, "resolvedBy", 100)), flagId);
    if (Number(r.changes) === 0) throw new MemoryError("not_found", "no open flag with that id");
  }

  // The user query never reaches FTS5 syntax: it is reduced to quoted word tokens (prefix-matched from 3 letters) joined by implicit AND.
  search(query: string, opts: { scope?: string; kinds?: MemoryKind[]; includeInactive?: boolean; limit?: number } = {}): SearchHit[] {
    const tokens = (foldTr(String(query)).match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 12);
    if (tokens.length === 0) return [];
    // Turkish is agglutinative ("sunucu" must find "sunucusunda"), so words of 3+ letters match as prefixes. The tokens are letters and digits only, so nothing here is FTS5 syntax.
    const match = tokens.map((t) => (t.length >= 3 ? `"${t}"*` : `"${t}"`)).join(" ");
    const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 20), 1), 50);
    const where = ["memory_fts MATCH ?"];
    const args: Array<string | number> = [match];
    if (opts.scope !== undefined) {
      where.push("r.scope = ?");
      args.push(opts.scope);
    }
    if (opts.kinds && opts.kinds.length > 0) {
      where.push(`r.kind IN (${opts.kinds.map(() => "?").join(",")})`);
      args.push(...opts.kinds);
    }
    if (!opts.includeInactive) where.push("r.status = 'active'");
    const rows = this.db
      .prepare(`SELECT r.*, bm25(memory_fts) AS rank FROM memory_fts JOIN memory_records r ON r.id = memory_fts.record_id WHERE ${where.join(" AND ")} ORDER BY rank LIMIT ${limit}`)
      .all(...args) as unknown as Array<Row & { rank: number }>;
    const at = this.now();
    return rows.map((r) => {
      const rec = toRecord(r);
      return { ...rec, rank: r.rank, flags: this.flagsFor(rec, at) };
    });
  }

  markExported(id: string, path: string): void {
    this.db.prepare("UPDATE memory_records SET exported_path = ? WHERE id = ?").run(path, id);
  }

  list(opts: { scope?: string; limit?: number } = {}): MemoryRecord[] {
    const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 100), 1), 500);
    const rows = (opts.scope === undefined
      ? this.db.prepare(`SELECT * FROM memory_records ORDER BY created_at DESC LIMIT ${limit}`).all()
      : this.db.prepare(`SELECT * FROM memory_records WHERE scope = ? ORDER BY created_at DESC LIMIT ${limit}`).all(opts.scope)) as unknown as Row[];
    return rows.map(toRecord);
  }
}
