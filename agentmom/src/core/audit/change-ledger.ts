// Anlamsal değişiklik defteri (madde 78, D5b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Denetim kaydı "ne oldu"yu (eylem+karar) tutar; bu defter "ne DEĞİŞTİ ve NEDEN"i insan okuyabilir biçimde tutar: tür, özet, gerekçe, kim,
// bağlı görev/denetim kaydı, etkilenen dosyalar. Yalnız eklenir (SQL tetikleyici), metinler sır taramasından geçer ve kısaltılır. Model/ağ yok.
import { randomUUID } from "node:crypto";
import type { Db } from "../db/db.ts";
import type { Actor } from "../policy/types.ts";
import { redactString } from "./redact.ts";

export const CHANGE_KINDS = ["task_decision", "task_contract", "grant", "automation", "policy", "manual", "backup", "other"] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export class ChangeLedgerError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ChangeLedgerError";
    this.code = code;
  }
}

export interface ChangeInput {
  kind: string;
  summary: string;
  reason: string;
  taskId?: string | null;
  auditId?: string | null;
  files?: string[];
}

export interface ChangeEntry {
  id: string;
  ts: string;
  kind: ChangeKind;
  summary: string;
  reason: string;
  actor: string;
  taskId: string | null;
  auditId: string | null;
  files: string[];
}

interface Row {
  id: string;
  ts: string;
  kind: string;
  summary: string;
  reason: string;
  actor_kind: string;
  actor_id: string;
  task_id: string | null;
  audit_id: string | null;
  files_json: string;
}

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? redactString(v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim()).slice(0, max) : "";
}

function parseFiles(s: string): string[] {
  try {
    const v: unknown = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 50) : [];
  } catch {
    return [];
  }
}

export class ChangeLedger {
  private readonly db: Db;
  private readonly now: () => Date;

  constructor(db: Db, opts: { now?: () => Date } = {}) {
    this.db = db;
    this.now = opts.now ?? (() => new Date());
  }

  record(input: ChangeInput, actor: Actor): ChangeEntry {
    if (!(CHANGE_KINDS as readonly string[]).includes(input.kind)) throw new ChangeLedgerError("invalid_field", `kind must be one of ${CHANGE_KINDS.join(", ")}`);
    const summary = clean(input.summary, 200);
    const reason = clean(input.reason, 500);
    if (summary.length < 3) throw new ChangeLedgerError("invalid_field", "summary of at least 3 characters is required");
    if (reason.length < 3) throw new ChangeLedgerError("invalid_field", "reason of at least 3 characters is required");
    if (input.files !== undefined && !Array.isArray(input.files)) throw new ChangeLedgerError("invalid_field", "files must be an array of paths");
    const files = (input.files ?? []).filter((f) => typeof f === "string").slice(0, 50).map((f) => clean(f, 300)).filter((f) => f.length > 0);
    const id = randomUUID();
    const ts = this.now().toISOString();
    this.db.prepare("INSERT INTO change_ledger (id, ts, kind, summary, reason, actor_kind, actor_id, task_id, audit_id, files_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, ts, input.kind, summary, reason, actor.kind, clean(actor.id, 80), input.taskId ? clean(input.taskId, 80) : null, input.auditId ? clean(input.auditId, 80) : null, JSON.stringify(files));
    return this.get(id) as ChangeEntry;
  }

  get(id: string): ChangeEntry | undefined {
    const r = this.db.prepare("SELECT * FROM change_ledger WHERE id = ?").get(id) as Row | undefined;
    return r ? this.map(r) : undefined;
  }

  list(opts: { kind?: string; taskId?: string; limit?: number } = {}): ChangeEntry[] {
    const where: string[] = [];
    const args: Array<string | number> = [];
    if (opts.kind) {
      where.push("kind = ?");
      args.push(opts.kind);
    }
    if (opts.taskId) {
      where.push("task_id = ?");
      args.push(opts.taskId);
    }
    args.push(Math.min(Math.max(1, opts.limit ?? 100), 500));
    const rows = this.db.prepare(`SELECT * FROM change_ledger ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ts DESC, rowid DESC LIMIT ?`).all(...args) as unknown as Row[];
    return rows.map((r) => this.map(r));
  }

  private map(r: Row): ChangeEntry {
    return { id: r.id, ts: r.ts, kind: r.kind as ChangeKind, summary: r.summary, reason: r.reason, actor: `${r.actor_kind}:${r.actor_id}`, taskId: r.task_id, auditId: r.audit_id, files: parseFiles(r.files_json) };
  }
}
