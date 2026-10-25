import { randomUUID } from "node:crypto";
import type { Db } from "../core/db/db.ts";

export interface EvidenceRecord {
  id: string;
  taskId: string;
  attemptId: string | null;
  kind: string;
  summary: string;
  data: unknown;
  createdAt: string;
}

export class EvidenceStore {
  private readonly db: Db;
  private readonly now: () => Date;

  constructor(db: Db, now: () => Date = () => new Date()) {
    this.db = db;
    this.now = now;
  }

  add(taskId: string, attemptId: string | null, kind: string, summary: string, data: unknown): void {
    this.db
      .prepare("INSERT INTO task_evidence (id, task_id, attempt_id, kind, summary, data_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(randomUUID(), taskId, attemptId, kind, summary, JSON.stringify(data), this.now().toISOString());
  }

  list(taskId: string): EvidenceRecord[] {
    const rows = this.db.prepare("SELECT * FROM task_evidence WHERE task_id = ? ORDER BY created_at, rowid").all(taskId) as unknown as Array<Record<string, string | null>>;
    return rows.map((r) => ({
      id: r.id as string,
      taskId: r.task_id as string,
      attemptId: r.attempt_id ?? null,
      kind: r.kind as string,
      summary: r.summary as string,
      data: JSON.parse(r.data_json as string),
      createdAt: r.created_at as string,
    }));
  }
}
