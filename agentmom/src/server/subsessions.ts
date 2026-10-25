// Alt oturum deposu (Faz 11, dilim 2). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız bu dosyayı yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Kurallar: ad KULLANICI verisidir (temizlenir, <=60 karakter); model SİSTEM verisidir (yalnız oluşturulurken çalıştırma kaydından gelir, ad değişince
// değişmez; veritabanı tetikleyicisi de korur). Kalıcı silme yok: yalnız arşiv bayrağı. Model çağrısı ve ağ yok.
import { randomUUID } from "node:crypto";
import type { Db } from "../core/db/db.ts";

export const NAME_MAX = 60;
export const ROLE_HINT_MAX = 40;
const RAW_MAX = 1000;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type SubsessionState = "idle" | "running" | "awaiting_approval" | "done" | "failed" | "unavailable";
export type ModelSource = "run" | "declared" | "unknown";

export interface Subsession {
  id: string;
  name: string;
  roleHint: string | null;
  provider: string;
  model: string | null;
  modelSource: ModelSource;
  state: SubsessionState;
  pinned: boolean;
  archived: boolean;
  unread: boolean;
  updatedAt: string;
  taskId: string | null;
  steps: { done: number; total: number } | null;
  renameCount: number;
}

export interface NameChange {
  subsessionId: string;
  oldName: string;
  newName: string;
  changedBy: "user";
  at: string;
}

export class SubsessionError extends Error {
  readonly code: "invalid_field" | "not_found";

  constructor(code: "invalid_field" | "not_found", message: string) {
    super(message);
    this.code = code;
  }
}

// NFKC, then drop control, format (zero-width, bidi embedding/override/isolate, BOM) and line/paragraph separator characters, collapse spaces,
// trim and cut to max code points. Returns "" when nothing printable is left.
export function cleanName(raw: string, max: number = NAME_MAX): string {
  const s = raw
    .normalize("NFKC")
    // Line breaks and tabs become a space (so "a\nb" stays two words); every other control/format character is dropped.
    .replace(/[\t\n\v\f\r\u0085\p{Zl}\p{Zp}]/gu, " ")
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Co}\p{Cs}]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  return [...s].slice(0, max).join("").trim();
}

function requireName(v: unknown, field: string, max: number): string {
  if (typeof v !== "string" || v.length > RAW_MAX) throw new SubsessionError("invalid_field", `${field} must be a string of at most ${RAW_MAX} characters`);
  const name = cleanName(v, max);
  if (!name) throw new SubsessionError("invalid_field", `${field} is empty after cleaning`);
  return name;
}

const TASK_TO_STATE: Record<string, SubsessionState> = {
  pending: "idle",
  approved: "idle",
  awaiting_approval: "awaiting_approval",
  running: "running",
  succeeded: "done",
  failed: "failed",
  cancelled: "failed",
  denied: "failed",
};

type Row = Record<string, string | number | null>;

export class SubsessionStore {
  private readonly db: Db;
  private readonly now: () => Date;
  // Whether the provider is usable right now (registered adapter). Unknown provider = "unavailable"; nothing is substituted.
  private readonly providerAvailable: (id: string) => boolean;

  constructor(db: Db, opts: { now?: () => Date; providerAvailable?: (id: string) => boolean } = {}) {
    this.db = db;
    this.now = opts.now ?? (() => new Date());
    this.providerAvailable = opts.providerAvailable ?? (() => true);
  }

  // The model comes only from a recorded run (the provider's own "started" event, which carries the model it ran with), newest first, the given
  // task's run preferred. Nothing recorded -> null with source "unknown". Never guessed from the name or the provider id.
  private modelFromRuns(provider: string, taskId: string | null): { model: string | null; source: ModelSource } {
    const q = `SELECT json_extract(details_json, '$.data.model') AS model FROM audit_events
      WHERE action = 'provider.event:started' AND initiator_kind = 'agent' AND initiator_id = ? AND json_valid(details_json)
        AND typeof(json_extract(details_json, '$.data.model')) = 'text' AND length(json_extract(details_json, '$.data.model')) > 0`;
    let row: Row | undefined;
    if (taskId) row = this.db.prepare(`${q} AND json_extract(details_json, '$.taskId') = ? ORDER BY ts DESC, rowid DESC LIMIT 1`).get(provider, taskId) as Row | undefined;
    if (!row) row = this.db.prepare(`${q} ORDER BY ts DESC, rowid DESC LIMIT 1`).get(provider) as Row | undefined;
    const model = row && typeof row.model === "string" ? row.model.slice(0, 200) : null;
    return model ? { model, source: "run" } : { model: null, source: "unknown" };
  }

  create(input: { provider?: unknown; roleHint?: unknown; name?: unknown; taskId?: unknown }): Subsession {
    if (typeof input.provider !== "string" || input.provider.length === 0 || input.provider.length > 100) throw new SubsessionError("invalid_field", "provider is required (1..100 characters)");
    const provider = input.provider;
    if (!this.db.prepare("SELECT 1 FROM providers WHERE id = ?").get(provider)) throw new SubsessionError("invalid_field", `provider ${provider} is not registered`);
    const roleHint = input.roleHint === undefined || input.roleHint === null ? null : requireName(input.roleHint, "roleHint", ROLE_HINT_MAX);
    let taskId: string | null = null;
    if (input.taskId !== undefined && input.taskId !== null) {
      if (typeof input.taskId !== "string" || !UUID_RE.test(input.taskId)) throw new SubsessionError("invalid_field", "taskId must be a uuid");
      if (!this.db.prepare("SELECT 1 FROM tasks WHERE id = ?").get(input.taskId)) throw new SubsessionError("not_found", "task not found");
      taskId = input.taskId;
    }
    let name: string;
    if (input.name !== undefined) name = requireName(input.name, "name", NAME_MAX);
    else {
      const n = (this.db.prepare("SELECT COUNT(*) AS n FROM subsessions").get() as { n: number }).n;
      name = roleHint ? cleanName(`${roleHint} ${n + 1}`) : `Alt oturum ${n + 1}`;
    }
    const { model, source } = this.modelFromRuns(provider, taskId);
    const id = randomUUID();
    const ts = this.now().toISOString();
    this.db
      .prepare(
        `INSERT INTO subsessions (id, name, role_hint, provider, model, model_source, state, pinned, archived, unread, task_id, steps_done, steps_total, created_at, updated_at, rename_count)
         VALUES (?, ?, ?, ?, ?, ?, 'idle', 0, 0, 0, ?, NULL, NULL, ?, ?, 0)`,
      )
      .run(id, name, roleHint, provider, model, source, taskId, ts, ts);
    return this.require(id);
  }

  private row(id: string): Row {
    if (!UUID_RE.test(id)) throw new SubsessionError("invalid_field", "id must be a uuid");
    const r = this.db.prepare("SELECT * FROM subsessions WHERE id = ?").get(id) as Row | undefined;
    if (!r) throw new SubsessionError("not_found", "subsession not found");
    return r;
  }

  require(id: string): Subsession {
    return this.view(this.row(id));
  }

  // Archived sub-sessions stay in the list (archived: true); the UI decides where to show them. Nothing is hidden or removed.
  list(): Subsession[] {
    const rows = this.db.prepare("SELECT * FROM subsessions ORDER BY pinned DESC, updated_at DESC, rowid DESC").all() as unknown as Row[];
    return rows.map((r) => this.view(r));
  }

  // State and steps are read live from the linked task / workflow records; an unavailable provider is shown as such, never replaced.
  private view(r: Row): Subsession {
    const provider = r.provider as string;
    const taskId = (r.task_id as string | null) ?? null;
    let state = r.state as SubsessionState;
    let steps: { done: number; total: number } | null = r.steps_total === null || r.steps_total === undefined ? null : { done: Number(r.steps_done ?? 0), total: Number(r.steps_total) };
    let updatedAt = r.updated_at as string;
    if (taskId) {
      const t = this.db.prepare("SELECT state, updated_at FROM tasks WHERE id = ?").get(taskId) as Row | undefined;
      if (t) {
        state = TASK_TO_STATE[t.state as string] ?? state;
        if ((t.updated_at as string) > updatedAt) updatedAt = t.updated_at as string;
      }
      const wf = this.db.prepare("SELECT id FROM workflows WHERE task_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1").get(taskId) as Row | undefined;
      if (wf) {
        const s = this.db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN state = 'succeeded' THEN 1 ELSE 0 END) AS done FROM workflow_steps WHERE workflow_id = ?").get(wf.id as string) as Row;
        if (Number(s.total) > 0) steps = { done: Number(s.done ?? 0), total: Number(s.total) };
      }
    }
    if (!this.providerAvailable(provider)) state = "unavailable";
    return {
      id: r.id as string,
      name: r.name as string,
      roleHint: (r.role_hint as string | null) ?? null,
      provider,
      model: (r.model as string | null) ?? null,
      modelSource: r.model_source as ModelSource,
      state,
      pinned: r.pinned === 1,
      archived: r.archived === 1,
      unread: r.unread === 1,
      updatedAt,
      taskId,
      steps,
      renameCount: Number(r.rename_count),
    };
  }

  // Changes only the user-visible name; model/provider stay as recorded. Every change is kept in the append-only name history.
  rename(id: string, rawName: unknown): { subsession: Subsession; oldName: string; newName: string; changed: boolean } {
    const r = this.row(id);
    const newName = requireName(rawName, "name", NAME_MAX);
    const oldName = r.name as string;
    if (newName === oldName) return { subsession: this.view(r), oldName, newName, changed: false };
    const ts = this.now().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT INTO subsession_name_history (id, subsession_id, old_name, new_name, changed_by, at) VALUES (?, ?, ?, ?, 'user', ?)").run(randomUUID(), id, oldName, newName, ts);
      this.db.prepare("UPDATE subsessions SET name = ?, rename_count = rename_count + 1, updated_at = ? WHERE id = ?").run(newName, ts, id);
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
    return { subsession: this.require(id), oldName, newName, changed: true };
  }

  nameHistory(id: string): NameChange[] {
    this.row(id);
    const rows = this.db.prepare("SELECT * FROM subsession_name_history WHERE subsession_id = ? ORDER BY at, rowid").all(id) as unknown as Row[];
    return rows.map((h) => ({ subsessionId: h.subsession_id as string, oldName: h.old_name as string, newName: h.new_name as string, changedBy: "user", at: h.at as string }));
  }

  private setFlag(id: string, column: "pinned" | "archived" | "unread", value: unknown): Subsession {
    if (typeof value !== "boolean") throw new SubsessionError("invalid_field", `${column} must be true or false`);
    this.row(id);
    // Reading does not reorder the list; pin/archive are user changes and move updated_at.
    if (column === "unread") this.db.prepare("UPDATE subsessions SET unread = ? WHERE id = ?").run(value ? 1 : 0, id);
    else this.db.prepare(`UPDATE subsessions SET ${column} = ?, updated_at = ? WHERE id = ?`).run(value ? 1 : 0, this.now().toISOString(), id);
    return this.require(id);
  }

  pin(id: string, pinned: unknown): Subsession {
    return this.setFlag(id, "pinned", pinned);
  }

  // Reversible: archive(id, false) brings it back. There is no delete.
  archive(id: string, archived: unknown): Subsession {
    return this.setFlag(id, "archived", archived);
  }

  markRead(id: string): Subsession {
    return this.setFlag(id, "unread", false);
  }
}
