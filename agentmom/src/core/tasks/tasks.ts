import { randomUUID } from "node:crypto";
import type { Db } from "../db/db.ts";
import type { Actor } from "../policy/types.ts";

export const TASK_STATES = ["pending", "awaiting_approval", "approved", "running", "succeeded", "failed", "cancelled", "denied"] as const;
export type TaskState = (typeof TASK_STATES)[number];

export const TASK_TRANSITIONS: Record<TaskState, readonly TaskState[]> = {
  pending: ["awaiting_approval", "approved", "denied", "cancelled"],
  awaiting_approval: ["approved", "denied", "cancelled"],
  approved: ["running", "cancelled"],
  running: ["succeeded", "failed", "cancelled"],
  failed: ["pending"],
  succeeded: [],
  cancelled: [],
  denied: [],
};

export class TaskError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TaskError";
    this.code = code;
  }
}

export function canTransition(from: TaskState, to: TaskState): boolean {
  return TASK_TRANSITIONS[from].includes(to);
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  state: TaskState;
  requestedAction: string;
  request: unknown;
  decision: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Attempt {
  id: string;
  taskId: string;
  attemptNo: number;
  state: "running" | "succeeded" | "failed";
  startedAt: string;
  endedAt: string | null;
  exitCode: number | null;
  error: string | null;
}

export interface NewTask {
  title: string;
  description?: string;
  requestedAction: string;
  request: unknown;
  decision: string;
}

type Row = Record<string, unknown>;

function toTask(r: Row): Task {
  return {
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    state: r.state as TaskState,
    requestedAction: r.requested_action as string,
    request: JSON.parse(r.request_json as string),
    decision: r.decision as string,
    approvedBy: (r.approved_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toAttempt(r: Row): Attempt {
  return {
    id: r.id as string,
    taskId: r.task_id as string,
    attemptNo: r.attempt_no as number,
    state: r.state as Attempt["state"],
    startedAt: r.started_at as string,
    endedAt: (r.ended_at as string | null) ?? null,
    exitCode: (r.exit_code as number | null) ?? null,
    error: (r.error as string | null) ?? null,
  };
}

export class TaskStore {
  private readonly db: Db;
  private readonly now: () => Date;

  constructor(db: Db, now: () => Date = () => new Date()) {
    this.db = db;
    this.now = now;
  }

  create(input: NewTask): Task {
    const id = randomUUID();
    const ts = this.now().toISOString();
    this.db
      .prepare(
        "INSERT INTO tasks (id, title, description, state, requested_action, request_json, decision, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)",
      )
      .run(id, input.title, input.description ?? null, input.requestedAction, JSON.stringify(input.request), input.decision, ts, ts);
    return this.require(id);
  }

  get(id: string): Task | undefined {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Row | undefined;
    return row ? toTask(row) : undefined;
  }

  require(id: string): Task {
    const task = this.get(id);
    if (!task) throw new TaskError("not_found", `task ${id} not found`);
    return task;
  }

  // Belirli durumdaki görevler (dikkat bütçesi için): sınır 1..5000; "newest" en yeni önce, "oldest" en eski önce.
  listByState(state: TaskState, limit = 100, order: "newest" | "oldest" = "newest"): Task[] {
    const dir = order === "oldest" ? "ASC" : "DESC";
    const rows = this.db.prepare(`SELECT * FROM tasks WHERE state = ? ORDER BY created_at ${dir}, rowid ${dir} LIMIT ?`).all(state, Math.max(1, Math.min(limit, 5000))) as Row[];
    return rows.map(toTask);
  }

  countByState(state: TaskState): number {
    return Number((this.db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE state = ?").get(state) as { n: number }).n);
  }

  list(limit = 100): Task[] {
    const rows = this.db.prepare("SELECT * FROM tasks ORDER BY created_at DESC, rowid DESC LIMIT ?").all(Math.max(1, Math.min(limit, 1000))) as Row[];
    return rows.map(toTask);
  }

  // Only the user can approve: an agent can never move its own task out of awaiting_approval.
  transition(id: string, to: TaskState, actor: Actor): Task {
    const task = this.require(id);
    if (!canTransition(task.state, to)) {
      throw new TaskError("invalid_transition", `cannot move task from ${task.state} to ${to}`);
    }
    if (task.state === "awaiting_approval" && to === "approved" && actor.kind !== "user") {
      throw new TaskError("approval_requires_user", "only the user can approve a task");
    }
    this.db
      .prepare("UPDATE tasks SET state = ?, updated_at = ?, approved_by = CASE WHEN ? = 'approved' THEN ? ELSE approved_by END WHERE id = ?")
      .run(to, this.now().toISOString(), to, actor.kind, id);
    return this.require(id);
  }

  startAttempt(taskId: string, actor: Actor): Attempt {
    this.transition(taskId, "running", actor);
    const next = (this.db.prepare("SELECT COALESCE(MAX(attempt_no), 0) + 1 AS n FROM task_attempts WHERE task_id = ?").get(taskId) as Row).n as number;
    const id = randomUUID();
    this.db
      .prepare("INSERT INTO task_attempts (id, task_id, attempt_no, state, started_at) VALUES (?, ?, ?, 'running', ?)")
      .run(id, taskId, next, this.now().toISOString());
    return this.attempts(taskId).find((a) => a.id === id) as Attempt;
  }

  finishAttempt(attemptId: string, outcome: { exitCode: number; error?: string }, actor: Actor): Attempt {
    const row = this.db.prepare("SELECT * FROM task_attempts WHERE id = ?").get(attemptId) as Row | undefined;
    if (!row) throw new TaskError("not_found", `attempt ${attemptId} not found`);
    if (row.state !== "running") throw new TaskError("invalid_transition", "attempt already finished");
    const ok = outcome.exitCode === 0;
    this.db
      .prepare("UPDATE task_attempts SET state = ?, ended_at = ?, exit_code = ?, error = ? WHERE id = ?")
      .run(ok ? "succeeded" : "failed", this.now().toISOString(), outcome.exitCode, outcome.error ?? null, attemptId);
    this.transition(row.task_id as string, ok ? "succeeded" : "failed", actor);
    return this.attempts(row.task_id as string).find((a) => a.id === attemptId) as Attempt;
  }

  attempts(taskId: string): Attempt[] {
    const rows = this.db.prepare("SELECT * FROM task_attempts WHERE task_id = ? ORDER BY attempt_no").all(taskId) as Row[];
    return rows.map(toAttempt);
  }
}
