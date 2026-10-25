import { randomUUID } from "node:crypto";
import type { Db } from "../core/db/db.ts";
import type { RepairFeedback } from "../verify/repair.ts";
import type { RunResult } from "../verify/schema.ts";
import type { Handoff } from "./handoff.ts";
import { conflictingScopes } from "./scopes.ts";
import type { Role, TaskContract, WorkflowDefinition } from "./types.ts";

export type WorkflowState = "pending" | "running" | "succeeded" | "failed";
export type StepState = "pending" | "running" | "succeeded" | "failed" | "interrupted";

export interface WorkflowRow {
  id: string;
  taskId: string;
  repoPath: string;
  definition: WorkflowDefinition;
  worktreePath: string | null;
  attemptId: string | null;
  state: WorkflowState;
  error: string | null;
  repairRound: number;
  repairFeedback: RepairFeedback | null;
  createdAt: string;
  updatedAt: string;
}

export interface StepRow {
  idx: number;
  role: Role;
  state: StepState;
  attempts: number;
  providerIdx: number;
  providerAttempts: number;
  providerId: string | null;
  output: unknown;
  error: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

type Row = Record<string, unknown>;

export class WorkflowStore {
  private readonly db: Db;
  private readonly now: () => Date;

  constructor(db: Db, now: () => Date = () => new Date()) {
    this.db = db;
    this.now = now;
  }

  setContract(taskId: string, c: TaskContract): void {
    this.db
      .prepare(
        `INSERT INTO task_contracts (task_id, goal, acceptance_json, write_scopes_json, constraints_json, verification_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(task_id) DO UPDATE SET goal = excluded.goal, acceptance_json = excluded.acceptance_json, write_scopes_json = excluded.write_scopes_json, constraints_json = excluded.constraints_json, verification_json = excluded.verification_json`,
      )
      .run(taskId, c.goal, JSON.stringify(c.acceptance), JSON.stringify(c.writeScopes), JSON.stringify(c.constraints), c.verification ? JSON.stringify(c.verification) : null, this.now().toISOString());
  }

  getContract(taskId: string): TaskContract | undefined {
    const r = this.db.prepare("SELECT * FROM task_contracts WHERE task_id = ?").get(taskId) as Row | undefined;
    if (!r) return undefined;
    return {
      goal: r.goal as string,
      acceptance: JSON.parse(r.acceptance_json as string),
      writeScopes: JSON.parse(r.write_scopes_json as string),
      constraints: JSON.parse(r.constraints_json as string),
      ...(r.verification_json ? { verification: JSON.parse(r.verification_json as string) } : {}),
    };
  }

  create(taskId: string, repoPath: string, def: WorkflowDefinition): string {
    const id = randomUUID();
    const ts = this.now().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare("INSERT INTO workflows (id, task_id, repo_path, definition_json, state, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)")
        .run(id, taskId, repoPath, JSON.stringify(def), ts, ts);
      const ins = this.db.prepare("INSERT INTO workflow_steps (id, workflow_id, idx, role, state) VALUES (?, ?, ?, ?, 'pending')");
      def.steps.forEach((s, i) => ins.run(randomUUID(), id, i, s.role));
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
    return id;
  }

  get(id: string): { workflow: WorkflowRow; steps: StepRow[] } | undefined {
    const r = this.db.prepare("SELECT * FROM workflows WHERE id = ?").get(id) as Row | undefined;
    if (!r) return undefined;
    const steps = (this.db.prepare("SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY idx").all(id) as Row[]).map((s) => ({
      idx: s.idx as number,
      role: s.role as Role,
      state: s.state as StepState,
      attempts: s.attempts as number,
      providerIdx: s.provider_idx as number,
      providerAttempts: s.provider_attempts as number,
      providerId: (s.provider_id as string | null) ?? null,
      output: s.output_json ? JSON.parse(s.output_json as string) : null,
      error: (s.error as string | null) ?? null,
      startedAt: (s.started_at as string | null) ?? null,
      endedAt: (s.ended_at as string | null) ?? null,
    }));
    return {
      workflow: {
        id: r.id as string,
        taskId: r.task_id as string,
        repoPath: r.repo_path as string,
        definition: JSON.parse(r.definition_json as string),
        worktreePath: (r.worktree_path as string | null) ?? null,
        attemptId: (r.attempt_id as string | null) ?? null,
        state: r.state as WorkflowState,
        error: (r.error as string | null) ?? null,
        repairRound: (r.repair_round as number | null) ?? 0,
        repairFeedback: r.repair_feedback_json ? JSON.parse(r.repair_feedback_json as string) : null,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      },
      steps,
    };
  }

  // Newest first, at most 100 (Faz 11 D3 list view; yazan: Claude [İP:AgentMom Faz 11 D3]). Read-only summary: title from the task, step counts from the rows.
  list(limit = 100): Array<{ id: string; taskId: string; title: string | null; state: WorkflowState; stepsDone: number; stepsTotal: number; createdAt: string; updatedAt: string }> {
    const n = Math.max(1, Math.min(Math.trunc(limit) || 100, 100));
    const rows = this.db
      .prepare(
        `SELECT w.id, w.task_id, t.title, w.state, w.created_at, w.updated_at,
                (SELECT count(*) FROM workflow_steps s WHERE s.workflow_id = w.id AND s.state = 'succeeded') AS done,
                (SELECT count(*) FROM workflow_steps s WHERE s.workflow_id = w.id) AS total
         FROM workflows w LEFT JOIN tasks t ON t.id = w.task_id ORDER BY w.created_at DESC, w.rowid DESC LIMIT ?`,
      )
      .all(n) as Row[];
    return rows.map((r) => ({
      id: r.id as string,
      taskId: r.task_id as string,
      title: (r.title as string | null) ?? null,
      state: r.state as WorkflowState,
      stepsDone: Number(r.done),
      stepsTotal: Number(r.total),
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    }));
  }

  // Newest first; passed/failed/total come from the stored run result (failed counts failed + error tests), nothing is recomputed or invented.
  listVerificationRuns(limit: number): Array<{ id: string; taskId: string; provider: string; status: string; passed: number | null; failed: number | null; total: number | null; createdAt: string }> {
    const rows = this.db.prepare("SELECT id, task_id, provider, status, result_json, created_at FROM verification_runs ORDER BY created_at DESC, rowid DESC LIMIT ?").all(limit) as Row[];
    return rows.map((r) => {
      let totals: Record<string, unknown> | null = null;
      try {
        const parsed = JSON.parse(r.result_json as string) as { totals?: unknown };
        if (parsed && typeof parsed.totals === "object" && parsed.totals !== null) totals = parsed.totals as Record<string, unknown>;
      } catch {
        totals = null;
      }
      const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
      const p = num(totals?.passed);
      const f = num(totals?.failed);
      const s = num(totals?.skipped);
      const e = num(totals?.error);
      const known = p !== null && f !== null && s !== null && e !== null;
      return {
        id: r.id as string,
        taskId: r.task_id as string,
        provider: r.provider as string,
        status: r.status as string,
        passed: p,
        failed: f !== null && e !== null ? f + e : f,
        total: known ? (p as number) + (f as number) + (s as number) + (e as number) : null,
        createdAt: r.created_at as string,
      };
    });
  }

  runningIds(): string[] {
    return (this.db.prepare("SELECT id FROM workflows WHERE state = 'running' ORDER BY created_at").all() as Row[]).map((r) => r.id as string);
  }

  patchWorkflow(id: string, p: { state?: WorkflowState; worktreePath?: string; attemptId?: string; error?: string | null; repairRound?: number; repairFeedback?: RepairFeedback | null }): void {
    const sets: string[] = ["updated_at = ?"];
    const vals: Array<string | null> = [this.now().toISOString()];
    if (p.state !== undefined) (sets.push("state = ?"), vals.push(p.state));
    if (p.worktreePath !== undefined) (sets.push("worktree_path = ?"), vals.push(p.worktreePath));
    if (p.attemptId !== undefined) (sets.push("attempt_id = ?"), vals.push(p.attemptId));
    if (p.error !== undefined) (sets.push("error = ?"), vals.push(p.error));
    if (p.repairFeedback !== undefined) (sets.push("repair_feedback_json = ?"), vals.push(p.repairFeedback === null ? null : JSON.stringify(p.repairFeedback)));
    if (p.repairRound !== undefined) (sets.push("repair_round = ?"), vals.push(String(p.repairRound)));
    this.db.prepare(`UPDATE workflows SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
  }

  patchStep(
    workflowId: string,
    idx: number,
    p: { state?: StepState; attempts?: number; providerIdx?: number; providerAttempts?: number; providerId?: string | null; output?: unknown; error?: string | null; startedAt?: string; endedAt?: string | null },
  ): void {
    const cols: Record<string, string | number | null> = {};
    if (p.state !== undefined) cols.state = p.state;
    if (p.attempts !== undefined) cols.attempts = p.attempts;
    if (p.providerIdx !== undefined) cols.provider_idx = p.providerIdx;
    if (p.providerAttempts !== undefined) cols.provider_attempts = p.providerAttempts;
    if (p.providerId !== undefined) cols.provider_id = p.providerId;
    if (p.output !== undefined) cols.output_json = JSON.stringify(p.output);
    if (p.error !== undefined) cols.error = p.error;
    if (p.startedAt !== undefined) cols.started_at = p.startedAt;
    if (p.endedAt !== undefined) cols.ended_at = p.endedAt;
    const keys = Object.keys(cols);
    if (keys.length === 0) return;
    this.db.prepare(`UPDATE workflow_steps SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE workflow_id = ? AND idx = ?`).run(...keys.map((k) => cols[k] as string | number | null), workflowId, idx);
  }

  addVerificationRun(taskId: string, workflowId: string, round: number, run: RunResult): void {
    this.db
      .prepare("INSERT INTO verification_runs (id, task_id, workflow_id, round, provider, status, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(run.runId, taskId, workflowId, round, run.provider, run.status, JSON.stringify(run), this.now().toISOString());
  }

  verificationRuns(workflowId: string): RunResult[] {
    return (this.db.prepare("SELECT result_json FROM verification_runs WHERE workflow_id = ? ORDER BY created_at, rowid").all(workflowId) as Row[]).map((r) => JSON.parse(r.result_json as string));
  }

  addHandoff(workflowId: string, h: Handoff): void {
    this.db
      .prepare("INSERT INTO workflow_handoffs (id, workflow_id, from_idx, to_idx, contract_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(randomUUID(), workflowId, h.from?.idx ?? null, h.to.idx, JSON.stringify(h), this.now().toISOString());
  }

  handoffs(workflowId: string): Handoff[] {
    return (this.db.prepare("SELECT contract_json FROM workflow_handoffs WHERE workflow_id = ? ORDER BY created_at, rowid").all(workflowId) as Row[]).map((r) => JSON.parse(r.contract_json as string));
  }

  // Atomic: either every scope is free of overlap with other active claims on the same repository, or nothing is claimed.
  tryClaim(workflowId: string, repoPath: string, scopes: string[]): { ok: true } | { ok: false; conflicts: Array<{ workflowId: string; scopes: Array<[string, string]> }> } {
    const repo = repoPath.replace(/\\/g, "/").toLowerCase();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const active = this.db.prepare("SELECT workflow_id, repo_path, scopes_json FROM scope_claims WHERE state = 'active'").all() as Row[];
      if (active.some((c) => c.workflow_id === workflowId)) {
        this.db.exec("COMMIT");
        return { ok: true };
      }
      const conflicts: Array<{ workflowId: string; scopes: Array<[string, string]> }> = [];
      for (const c of active) {
        if ((c.repo_path as string) !== repo) continue;
        const found = conflictingScopes(scopes, JSON.parse(c.scopes_json as string));
        if (found.length) conflicts.push({ workflowId: c.workflow_id as string, scopes: found });
      }
      if (conflicts.length) {
        this.db.exec("ROLLBACK");
        return { ok: false, conflicts };
      }
      this.db
        .prepare("INSERT INTO scope_claims (id, workflow_id, repo_path, scopes_json, state, created_at) VALUES (?, ?, ?, ?, 'active', ?)")
        .run(randomUUID(), workflowId, repo, JSON.stringify(scopes), this.now().toISOString());
      this.db.exec("COMMIT");
      return { ok: true };
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  releaseClaims(workflowId: string): void {
    this.db.prepare("UPDATE scope_claims SET state = 'released', released_at = ? WHERE workflow_id = ? AND state = 'active'").run(this.now().toISOString(), workflowId);
  }

  activeClaims(): Array<{ workflowId: string; repoPath: string; scopes: string[] }> {
    return (this.db.prepare("SELECT workflow_id, repo_path, scopes_json FROM scope_claims WHERE state = 'active'").all() as Row[]).map((c) => ({
      workflowId: c.workflow_id as string,
      repoPath: c.repo_path as string,
      scopes: JSON.parse(c.scopes_json as string),
    }));
  }
}
