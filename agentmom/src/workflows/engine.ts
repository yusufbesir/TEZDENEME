import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { AuditLog } from "../core/audit/audit.ts";
import { redactString } from "../core/audit/redact.ts";
import { resolveInsideRoot } from "../core/config/safe-path.ts";
import { evaluate } from "../core/policy/engine.ts";
import type { AutonomyContract } from "../core/policy/types.ts";
import { TaskStore } from "../core/tasks/tasks.ts";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { RunRefused, SYSTEM, authorizeProvider, canonicalPath, collectGitEvidence, createWorktree, git, reopenWorktree, runProviderOnce } from "../orchestrator/steps.ts";
import type { Worktree } from "../orchestrator/steps.ts";
import type { ErrorCode, ProviderAdapter } from "../providers/contract.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { auditDelivery } from "../verify/auditor.ts";
import type { DeliveryReport } from "../verify/auditor.ts";
import { baselineDirFor } from "../verify/baselines.ts";
import { BrowserProvider } from "../verify/browser.ts";
import { saveEvidence } from "../verify/evidence-files.ts";
import { LabSpecError } from "../verify/labs/rules.ts";
import { recordLineage } from "../verify/labs/lineage.ts";
import type { LineageRecord } from "../verify/labs/lineage.ts";
import { buildReplayBundle } from "../verify/labs/replay.ts";
import { LocalTestProvider } from "../verify/local-tests.ts";
import { RepairCoordinator } from "../verify/repair.ts";
import type { RepairFeedback } from "../verify/repair.ts";
import { SchemaError, validateRunResult } from "../verify/schema.ts";
import type { RunResult } from "../verify/schema.ts";
import { buildHandoff, parseVerdict, renderPrompt } from "./handoff.ts";
import type { Handoff } from "./handoff.ts";
import { attachLabLog, runA11yPlan, runContractsPlan, runDesignPlan, runMutationPlan, runStatesPlan } from "./lab-runs.ts";
import { inAnyScope } from "./scopes.ts";
import { WorkflowStore } from "./store.ts";
import type { StepRow, WorkflowRow } from "./store.ts";
import type { StepDefinition, TaskContract, Verdict, VerificationPlan } from "./types.ts";

export const HARD_MAX_CONCURRENT = 3;
const RETRYABLE: ReadonlySet<ErrorCode> = new Set<ErrorCode>(["rate_limited", "network", "timeout", "process_failed", "malformed_output"]);

export interface EngineDeps {
  tasks: TaskStore;
  audit: AuditLog;
  registry: ProviderRegistry;
  evidence: EvidenceStore;
  store: WorkflowStore;
  contract: AutonomyContract;
  worktreeRoot: string;
  maxConcurrent?: number;
  // Beyin Verify: real verification providers and where their evidence files go (on D:). Without it a contract's verification plan cannot run.
  verify?: { local: LocalTestProvider; browser: BrowserProvider; evidenceRoot: string };
  // The single repair coordinator. Absent = failures are never sent back.
  repair?: RepairCoordinator;
  retryDelayMs?: number;
  now?: () => Date;
}

export interface WorkflowOutcome {
  workflowId: string;
  state: "succeeded" | "failed";
  error: string | null;
}

class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];
  peak = 0;
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
  }

  async acquire(): Promise<void> {
    if (this.active >= this.max) await new Promise<void>((resolve) => this.waiting.push(resolve));
    else this.active++;
    this.peak = Math.max(this.peak, this.active);
  }

  release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }
}

interface StepOutput {
  providerId: string | null;
  summary: string;
  changedFiles: string[];
  verdict?: Verdict;
  checks?: Array<{ name: string; ok: boolean; detail: string }>;
}

interface Ctx {
  wf: WorkflowRow;
  contract: TaskContract;
  wt: Worktree;
  userApproved: boolean;
  taskId: string;
  attemptId: string;
}

// Raised by verification when the one repair coordinator decides the first product defect goes back to the implement step.
class RepairRequest extends Error {
  readonly feedback: RepairFeedback;

  constructor(feedback: RepairFeedback, reason: string) {
    super(reason);
    this.feedback = feedback;
  }
}

// Compares paths the way Windows does: separators, leading ./ and case do not make a changed test file look unchanged.
function normPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^(\.\/)+/, "").toLowerCase();
}

export function selfAuthored(planFiles: string[], changed: string[]): string[] {
  const changedSet = new Set(changed.map(normPath));
  return planFiles.filter((f) => changedSet.has(normPath(f)));
}

class StepFailure extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class WorkflowEngine {
  private readonly d: EngineDeps;
  private readonly now: () => Date;
  private readonly inflight = new Map<string, Promise<WorkflowOutcome>>();
  private readonly limiter: Semaphore;

  constructor(deps: EngineDeps) {
    this.d = deps;
    this.now = deps.now ?? (() => new Date());
    this.limiter = new Semaphore(Math.max(1, Math.min(deps.maxConcurrent ?? HARD_MAX_CONCURRENT, HARD_MAX_CONCURRENT)));
  }

  get peakConcurrency(): number {
    return this.limiter.peak;
  }

  start(workflowId: string): Promise<WorkflowOutcome> {
    const existing = this.inflight.get(workflowId);
    if (existing) return existing;
    const p = (async () => {
      await this.limiter.acquire();
      try {
        return await this.run(workflowId);
      } finally {
        this.limiter.release();
      }
    })().finally(() => this.inflight.delete(workflowId));
    this.inflight.set(workflowId, p);
    return p;
  }

  // After a crash: steps left "running" were interrupted mid-flight. They are marked, then every running workflow resumes at its first unfinished step.
  async recoverAll(): Promise<WorkflowOutcome[]> {
    const ids = this.d.store.runningIds();
    for (const id of ids) {
      const snap = this.d.store.get(id);
      for (const s of snap?.steps ?? []) {
        if (s.state === "running") {
          this.d.store.patchStep(id, s.idx, { state: "interrupted", error: "interrupted", endedAt: this.now().toISOString() });
          this.audit("workflow.step.interrupted", "interrupted", { workflowId: id, step: s.idx, role: s.role });
        }
      }
    }
    return Promise.all(ids.map((id) => this.start(id)));
  }

  private audit(action: string, result: string, details: Record<string, unknown>): void {
    this.d.audit.record({ initiator: SYSTEM, action, decision: "n/a", result, details });
  }

  private fail(wf: WorkflowRow, code: string, message: string, extra: Record<string, unknown> = {}): WorkflowOutcome {
    const error = `${code}: ${redactString(message)}`.slice(0, 500);
    this.d.store.patchWorkflow(wf.id, { state: "failed", error });
    this.d.store.releaseClaims(wf.id);
    const attemptId = this.d.store.get(wf.id)?.workflow.attemptId;
    if (attemptId) {
      try {
        this.d.tasks.finishAttempt(attemptId, { exitCode: -1, error: code }, SYSTEM);
      } catch {
        // the attempt was already finished
      }
    }
    this.d.evidence.add(wf.taskId, attemptId ?? null, "workflow", `failed: ${code}`, { workflowId: wf.id, code, message: redactString(message), ...extra });
    this.audit("workflow.finished", "failed", { workflowId: wf.id, taskId: wf.taskId, code, ...extra });
    return { workflowId: wf.id, state: "failed", error };
  }

  private async run(workflowId: string): Promise<WorkflowOutcome> {
    const snap = this.d.store.get(workflowId);
    if (!snap) throw new Error(`unknown workflow ${workflowId}`);
    const wf = snap.workflow;
    if (wf.state === "succeeded" || wf.state === "failed") return { workflowId, state: wf.state, error: wf.error };
    const task = this.d.tasks.require(wf.taskId);
    const contract = this.d.store.getContract(task.id);
    if (!contract) return this.fail(wf, "no_task_contract", "the task has no contract (goal and acceptance criteria)");

    if (wf.state === "pending") {
      if (task.state !== "approved") return this.fail(wf, "not_approved", `task is ${task.state}, not approved`);
      const attempt = this.d.tasks.startAttempt(task.id, SYSTEM);
      this.d.store.patchWorkflow(wf.id, { state: "running", attemptId: attempt.id });
      this.audit("workflow.started", "running", { workflowId: wf.id, taskId: task.id, attemptId: attempt.id });
    } else {
      this.audit("workflow.resumed", "running", { workflowId: wf.id, taskId: task.id });
    }
    // Resolved to the real location once; authorization, worktree creation and scope claims all use this same value.
    const row = this.d.store.get(workflowId)!.workflow;
    const current = { ...row, repoPath: canonicalPath(row.repoPath) };
    const attemptId = current.attemptId as string;

    let wt: Worktree;
    try {
      if (current.worktreePath) wt = await reopenWorktree(this.d.worktreeRoot, current.worktreePath);
      else {
        const path = join(this.d.worktreeRoot, `${task.id.slice(0, 8)}-wf-${wf.id.slice(0, 8)}`);
        // The same gate a single run passes, for every first-choice provider, BEFORE git touches the repository.
        for (const step of current.definition.steps) {
          if (!step.providerId) continue;
          const adapter = this.d.registry.get(step.providerId);
          if (!adapter) return this.fail(current, "unknown_provider", `provider ${step.providerId} is not registered`);
          authorizeProvider(this.d, { task, adapter, repoPath: current.repoPath, worktreePath: path, userApproved: task.approvedBy === "user", readOnly: step.role !== "implement" });
        }
        wt = await createWorktree(this.d.worktreeRoot, current.repoPath, path);
        this.d.store.patchWorkflow(wf.id, { worktreePath: path });
        // Taban commit'i, hiçbir ajan çalışmadan ÖNCE kanıt olarak kaydedilir (şema değişmez); tasarım sözleşmesi dosyasının güvenilirliği buna göre ölçülür.
        const head = await git(["rev-parse", "HEAD"], wt.path, wt.hooksDir, wt.pinned);
        const sha = head.stdout.trim();
        if (head.code === 0 && /^[0-9a-f]{40,64}$/.test(sha)) this.d.evidence.add(task.id, attemptId, "workflow.base", `base commit ${sha.slice(0, 12)}`, { workflowId: wf.id, commit: sha });
      }
    } catch (err) {
      return this.fail(current, err instanceof RunRefused ? err.code : "worktree_failed", err instanceof Error ? err.message : String(err));
    }

    if (current.definition.steps.some((s) => s.role === "implement")) {
      if (contract.writeScopes.length === 0) return this.fail(current, "no_write_scopes", "an implement step needs at least one write scope in the task contract");
      const claim = this.d.store.tryClaim(wf.id, current.repoPath, contract.writeScopes);
      if (!claim.ok) {
        this.audit("workflow.scope_conflict", "denied", { workflowId: wf.id, conflicts: claim.conflicts });
        return this.fail(current, "scope_conflict", `write scopes overlap with active workflow(s): ${claim.conflicts.map((c) => c.workflowId).join(", ")}`, { conflicts: claim.conflicts });
      }
    }

    const ctx: Ctx = { wf: current, contract, wt, userApproved: task.approvedBy === "user", taskId: task.id, attemptId };
    for (;;) {
      let repairing = false;
      for (const i of current.definition.steps.keys()) {
        const row = this.d.store.get(workflowId)!.steps[i] as StepRow;
        if (row.state === "succeeded") continue;
        try {
          await this.runStep(ctx, row, current.definition.steps[i] as StepDefinition);
        } catch (err) {
          if (err instanceof RepairRequest) {
            this.beginRepair(ctx, err);
            repairing = true;
            break;
          }
          if (err instanceof StepFailure) {
            this.d.store.patchStep(workflowId, row.idx, { state: "failed", error: err.code, endedAt: this.now().toISOString() });
            this.audit("workflow.step.failed", err.code, { workflowId, step: row.idx, role: row.role, message: redactString(err.message) });
            return this.fail(current, err.code, err.message, { step: row.idx, role: row.role });
          }
          throw err;
        }
      }
      if (!repairing) break;
    }

    this.d.store.patchWorkflow(workflowId, { state: "succeeded", error: null });
    this.d.store.releaseClaims(workflowId);
    this.d.tasks.finishAttempt(attemptId, { exitCode: 0 }, SYSTEM);
    const final = this.d.store.get(workflowId)!;
    this.d.evidence.add(task.id, attemptId, "workflow", `succeeded (${final.steps.length} steps)`, {
      workflowId,
      steps: final.steps.map((s) => ({ idx: s.idx, role: s.role, state: s.state, attempts: s.attempts, providerId: s.providerId })),
    });
    this.audit("workflow.finished", "succeeded", { workflowId, taskId: task.id });
    return { workflowId, state: "succeeded", error: null };
  }

  private outputOf(workflowId: string, role: string): StepOutput | null {
    const s = this.d.store.get(workflowId)?.steps.find((x) => x.role === role && x.state === "succeeded");
    return (s?.output as StepOutput | undefined) ?? null;
  }

  private handoffFor(ctx: Ctx, row: StepRow): Handoff {
    const steps = this.d.store.get(ctx.wf.id)!.steps;
    const prev = [...steps].reverse().find((s) => s.idx < row.idx && s.state === "succeeded");
    const out = (prev?.output as StepOutput | null | undefined) ?? null;
    const repair = this.d.store.get(ctx.wf.id)!.workflow.repairFeedback;
    const h = buildHandoff({
      workflowId: ctx.wf.id,
      from: prev ? { idx: prev.idx, role: prev.role, providerId: out?.providerId ?? null } : null,
      to: { idx: row.idx, role: row.role },
      contract: ctx.contract,
      ...(out || (row.role === "implement" && repair)
        ? { artifacts: { summary: out?.summary ?? "", changedFiles: out?.changedFiles ?? [], ...(out?.verdict ? { verdict: out.verdict } : {}), ...(row.role === "implement" && repair ? { repairFeedback: repair } : {}) } }
        : {}),
      createdAt: this.now().toISOString(),
    });
    this.d.store.addHandoff(ctx.wf.id, h);
    return h;
  }

  private async runStep(ctx: Ctx, row: StepRow, def: StepDefinition): Promise<void> {
    const wid = ctx.wf.id;
    const started = this.now().toISOString();
    if (def.role === "verify") {
      this.d.store.patchStep(wid, row.idx, { state: "running", attempts: row.attempts + 1, startedAt: started });
      this.audit("workflow.step.started", "running", { workflowId: wid, step: row.idx, role: "verify" });
      const out = await this.verify(ctx);
      this.d.store.patchStep(wid, row.idx, { state: "succeeded", output: out, error: null, endedAt: this.now().toISOString() });
      this.d.evidence.add(ctx.taskId, ctx.attemptId, "verification", "all checks passed", out);
      this.audit("workflow.step.succeeded", "ok", { workflowId: wid, step: row.idx, role: "verify" });
      return;
    }

    const handoff = this.handoffFor(ctx, row);
    const implProvider = this.outputOf(wid, "implement")?.providerId ?? null;
    let candidates = [def.providerId as string, ...(def.fallbackProviders ?? [])];
    if (def.role === "review" && !ctx.wf.definition.allowSameProviderReview) candidates = candidates.filter((p) => p !== implProvider);
    if (candidates.length === 0) throw new StepFailure("independence_violation", "no reviewer provider differs from the implementer");
    const maxAttempts = def.maxAttempts ?? 2;
    let attempts = row.attempts;
    let pi = Math.min(row.providerIdx, candidates.length - 1);
    let onProvider = row.providerIdx === pi ? row.providerAttempts : 0;
    let lastCode = "exhausted";

    while (pi < candidates.length) {
      const adapter = this.d.registry.get(candidates[pi] as string);
      if (!adapter) throw new StepFailure("unknown_provider", this.d.registry.isDisabled(candidates[pi] as string) ? `provider ${candidates[pi]} is disabled by the user` : `provider ${candidates[pi]} is not registered`);
      let sandbox;
      try {
        // Rota bilgisi için kayıtlı adaptör (devre dışı olsa bile): yedeğe geçiş onayı/denetimi atlanmasın.
        const previous = pi > 0 ? this.d.registry.registeredAdapter(candidates[pi - 1] as string) : undefined;
        sandbox = authorizeProvider(this.d, {
          task: this.d.tasks.require(ctx.taskId),
          adapter,
          repoPath: ctx.wf.repoPath,
          worktreePath: ctx.wt.path,
          userApproved: ctx.userApproved,
          text: renderPrompt(def.role, handoff),
          readOnly: def.role !== "implement",
          ...(previous ? { previousRoute: { kind: previous.routeKind, providerId: previous.id } } : {}),
        });
      } catch (err) {
        if (err instanceof RunRefused) throw new StepFailure(pi > 0 ? "provider_switch_denied" : err.code, `${err.code}: ${err.message}`);
        throw err;
      }

      while (onProvider < maxAttempts) {
        // Her denemeden önce: kullanıcı sağlayıcıyı bu sırada devre dışı bıraktıysa yeni deneme YAPILMAZ (fail-closed).
        if (this.d.registry.isDisabled(adapter.id)) throw new StepFailure("unknown_provider", `provider ${adapter.id} is disabled by the user`);
        attempts++;
        onProvider++;
        this.d.store.patchStep(wid, row.idx, { state: "running", attempts, providerIdx: pi, providerAttempts: onProvider, providerId: adapter.id, error: null, startedAt: this.now().toISOString() });
        this.audit("workflow.step.started", "running", { workflowId: wid, step: row.idx, role: def.role, providerId: adapter.id, attempt: attempts });
        const result = await runProviderOnce(this.d.audit, adapter, {
          taskId: ctx.taskId,
          attemptId: ctx.attemptId,
          prompt: renderPrompt(def.role, handoff),
          cwd: ctx.wt.path,
          sandbox,
          timeoutMs: this.d.contract.maxRuntimeMs,
        });
        this.d.evidence.add(ctx.taskId, ctx.attemptId, `step:${def.role}`, `${result.status} via ${adapter.id} (attempt ${attempts})`, {
          step: row.idx,
          provider: adapter.id,
          status: result.status,
          error: result.error ?? null,
          summary: redactString(result.summary).slice(0, 2000),
          usage: result.usage,
        });

        if (result.status === "succeeded") {
          const output = await this.accept(ctx, def, adapter, result.summary);
          if (output) {
            this.d.store.patchStep(wid, row.idx, { state: "succeeded", output, error: null, endedAt: this.now().toISOString() });
            this.audit("workflow.step.succeeded", "ok", { workflowId: wid, step: row.idx, role: def.role, providerId: adapter.id });
            return;
          }
          lastCode = "malformed_output";
        } else {
          lastCode = result.error?.code ?? "process_failed";
          if (!RETRYABLE.has(lastCode as ErrorCode)) throw new StepFailure(lastCode, result.error?.message ?? "provider failed");
        }
        this.d.store.patchStep(wid, row.idx, { state: "failed", error: lastCode, endedAt: this.now().toISOString() });
        this.audit("workflow.step.retry", lastCode, { workflowId: wid, step: row.idx, providerId: adapter.id, attempt: attempts });
        if (this.d.retryDelayMs) await new Promise((r) => setTimeout(r, this.d.retryDelayMs));
      }
      pi++;
      onProvider = 0;
    }
    throw new StepFailure(lastCode, `all providers exhausted (last error: ${lastCode})`);
  }

  // Turns a successful provider result into the step's checkpointed output; null means the output was unusable (retryable).
  private async accept(ctx: Ctx, def: StepDefinition, adapter: ProviderAdapter, summary: string): Promise<StepOutput | null> {
    const clean = redactString(summary).slice(0, 8000);
    if (def.role === "plan") return { providerId: adapter.id, summary: clean, changedFiles: [] };
    if (def.role === "implement") {
      const g = await collectGitEvidence(ctx.wt);
      this.d.evidence.add(ctx.taskId, ctx.attemptId, "diff", `${g.files.length} file(s) changed`, { worktreePath: ctx.wt.path, files: g.files, stat: g.stat, diff: g.diff, truncated: g.truncated });
      const outside = g.files.filter((f) => !inAnyScope(f, ctx.contract.writeScopes));
      if (outside.length) throw new StepFailure("scope_violation", `changed files outside the write scopes: ${outside.slice(0, 10).join(", ")}`);
      return { providerId: adapter.id, summary: clean, changedFiles: g.files };
    }
    const verdict = parseVerdict(summary, ctx.contract.acceptance.map((c) => c.id));
    if (!verdict) return null;
    return { providerId: adapter.id, summary: clean.slice(0, 2000), changedFiles: this.outputOf(ctx.wf.id, "implement")?.changedFiles ?? [], verdict };
  }

  // Deterministic: no model decides whether the work is done.
  private async verify(ctx: Ctx): Promise<StepOutput> {
    if (ctx.contract.verification) {
      // A verification plan that cannot run must never degrade into the weaker built-in check.
      if (!this.d.verify) throw new StepFailure("verification_unavailable", "the task contract has a verification plan but no verification providers are configured");
      return this.brainVerify(ctx, ctx.contract.verification);
    }
    const impl = this.outputOf(ctx.wf.id, "implement");
    const rev = this.outputOf(ctx.wf.id, "review");
    const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
    checks.push({ name: "implement_succeeded", ok: impl !== null, detail: impl ? `${impl.changedFiles.length} file(s) changed` : "no successful implement step" });
    const verdict = rev?.verdict;
    checks.push({ name: "review_approved", ok: verdict?.approved === true, detail: verdict ? `approved=${verdict.approved}` : "no review verdict" });
    for (const c of ctx.contract.acceptance) {
      const met = verdict?.criteria.find((v) => v.id === c.id)?.met === true;
      checks.push({ name: `criterion:${c.id}`, ok: met, detail: met ? "met" : "not met" });
    }
    const g = await collectGitEvidence(ctx.wt);
    const outside = g.files.filter((f) => !inAnyScope(f, ctx.contract.writeScopes));
    checks.push({ name: "changes_within_scopes", ok: outside.length === 0, detail: outside.length ? outside.join(", ") : "all changes inside write scopes" });
    const failed = checks.filter((c) => !c.ok);
    if (failed.length) this.d.evidence.add(ctx.taskId, ctx.attemptId, "verification", `failed: ${failed.map((c) => c.name).join(", ")}`, { checks });
    if (failed.length) throw new StepFailure("verification_failed", `failed checks: ${failed.map((c) => c.name).join(", ")}`);
    return { providerId: null, summary: "all checks passed", changedFiles: g.files, checks };
  }

  // Resets implement, review and verify so the implementer can fix the first failure; planning is not repeated. The worktree keeps its changes.
  private beginRepair(ctx: Ctx, req: RepairRequest): void {
    const wid = ctx.wf.id;
    const implIdx = ctx.wf.definition.steps.findIndex((s) => s.role === "implement");
    this.d.store.patchWorkflow(wid, { repairRound: req.feedback.round, repairFeedback: req.feedback });
    for (const s of this.d.store.get(wid)!.steps) {
      if (s.idx >= implIdx) this.d.store.patchStep(wid, s.idx, { state: "pending", attempts: 0, providerIdx: 0, providerAttempts: 0, providerId: null, output: null, error: null });
    }
    this.d.evidence.add(ctx.taskId, ctx.attemptId, "repair", `round ${req.feedback.round}: ${req.feedback.name}`, { workflowId: wid, ...req.feedback });
    this.audit("workflow.repair", `round ${req.feedback.round}`, { workflowId: wid, round: req.feedback.round, failing: req.feedback.name, source: req.feedback.source, reason: req.message });
  }

  // Beyin Verify: run the real verification providers, then let the independent delivery auditor decide from the proof.
  private async brainVerify(ctx: Ctx, plan: VerificationPlan): Promise<StepOutput> {
    const impl = this.outputOf(ctx.wf.id, "implement");
    const rev = this.outputOf(ctx.wf.id, "review");
    const g = await collectGitEvidence(ctx.wt);
    const outside = g.files.filter((f) => !inAnyScope(f, ctx.contract.writeScopes));
    const checks: Array<{ name: string; ok: boolean; detail: string }> = [
      { name: "implement_succeeded", ok: impl !== null, detail: impl ? `${impl.changedFiles.length} file(s) changed` : "no successful implement step" },
      { name: "changes_within_scopes", ok: outside.length === 0, detail: outside.length ? outside.join(", ") : "all changes inside write scopes" },
    ];
    const structural = checks.filter((c) => !c.ok);
    if (structural.length) {
      this.d.evidence.add(ctx.taskId, ctx.attemptId, "verification", `failed: ${structural.map((c) => c.name).join(", ")}`, { checks });
      throw new StepFailure("verification_failed", `failed checks: ${structural.map((c) => c.name).join(", ")}`);
    }
    const round = this.d.store.get(ctx.wf.id)!.workflow.repairRound;
    const changed = [...new Set([...g.files, ...(impl?.changedFiles ?? [])])];
    const { runs, lineage, dir } = await this.runVerification(ctx, plan, round, changed);
    // Tasarım sözleşmesi dosyası (specFile) yalnız görevin TABAN commit'inde izleniyorsa VE çalışma ağacındaki içeriği taban blob'uyla aynıysa güvenilirdir; aksi halde
    // (taban yok, izlenmiyor, .gitignore'lu/yeni, değişmiş, commit edilmiş) bağımsız kanıt değildir (palet/tolerans/limitlerle tüm denetimler geçirilebilir).
    const designSpecChanged = plan.design?.specFile !== undefined && (selfAuthored([plan.design.specFile], changed).length > 0 || !(await this.specFileTrusted(ctx, plan.design.specFile)));
    const report = auditDelivery({
      criteria: ctx.contract.acceptance,
      runs,
      review: rev?.verdict ?? null,
      expectedProviders: [...(plan.localTests ? ["local-tests"] : []), ...(plan.browser ? ["browser"] : []), ...(plan.contracts ? ["contracts-lab"] : []), ...(plan.states ? ["state-lab"] : []), ...(plan.a11y ? ["a11y-lab"] : []), ...(plan.design ? ["design-lab"] : []), ...(plan.mutation && runs.some((r) => r.provider === "local-tests" && r.status === "passed") ? ["mutation-lab"] : [])],
      requireReview: ctx.wf.definition.steps.some((s) => s.role === "review"),
      // Uygulayıcının kendi yazdığı/değiştirdiği test dosyaları VE veri dosyaları (fixture) aynı mantıkla raporlanır: yeşil sonuç tutarlılığı gösterir, bağımsız kanıt değildir.
      // Auditor'a dokunulmaz: veri dosyaları "(data file)" ekiyle aynı selfAuthoredTests listesine girer; requireTrustedTests açıksa bunlar da kanıt sayılmaz.
      selfAuthoredTests: [...selfAuthored(plan.localTests?.files ?? [], impl?.changedFiles ?? []), ...(lineage?.modified ?? []).map((p) => `${p} (data file)`), ...(designSpecChanged ? [`${plan.design?.specFile ?? ""} (design spec file)`] : [])],
      ...(plan.requireTrustedTests ? { requireTrustedTests: true } : {}),
      now: this.now,
    });
    this.applyA11yGate(report, runs);
    this.applyDesignGate(report, runs, designSpecChanged);
    this.applyMutationGate(report, runs, plan.requireTrustedTests === true);
    this.applyBaselineGate(report, runs);
    this.d.evidence.add(ctx.taskId, ctx.attemptId, "delivery", `${report.verdict}${round ? ` (after ${round} repair round(s))` : ""}`, report);
    this.audit("workflow.delivery", report.verdict, { workflowId: ctx.wf.id, verdict: report.verdict, reasons: report.reasons.slice(0, 5) });
    if (report.verdict === "failed") await this.writeReplay(ctx, plan, runs, report.firstFailure?.runId ?? null, changed, dir);
    if (report.verdict === "passed") return { providerId: null, summary: "delivery passed", changedFiles: g.files, checks: [...checks, { name: "delivery", ok: true, detail: report.reasons[0] ?? "passed" }] };
    const decision = this.d.repair?.decide(report, round);
    if (decision?.action === "send_back") throw new RepairRequest(decision.feedback, decision.reason);
    throw new StepFailure(report.verdict === "failed" ? "verification_failed" : "delivery_unverified", report.reasons.slice(0, 3).join("; ") + (decision ? ` [${decision.reason}]` : ""));
  }

  // Görev iş akışının taban commit'i (createWorktree sonrası kaydedilen "workflow.base" kanıtı); kayıt yoksa null (güvenilir sayılmaz).
  private baseCommitOf(ctx: Ctx): string | null {
    let found: string | null = null;
    for (const rec of this.d.evidence.list(ctx.taskId)) {
      const d = rec.data as { workflowId?: unknown; commit?: unknown };
      if (rec.kind === "workflow.base" && d.workflowId === ctx.wf.id && typeof d.commit === "string" && /^[0-9a-f]{40,64}$/.test(d.commit)) {
        // İLK kayıt geçerlidir (savunmacı): sonradan eklenen bir kayıt tabanı kaydıramaz.
        found = d.commit;
        break;
      }
    }
    return found;
  }

  // specFile güvenilir mi: taban commit'te izleniyor VE çalışma ağacı içeriğinin blob özeti taban blob'uyla aynı. Her hata "güvenilmez" demektir.
  private async specFileTrusted(ctx: Ctx, rel: string): Promise<boolean> {
    const base = this.baseCommitOf(ctx);
    if (!base) return false;
    try {
      const path = resolveInsideRoot(ctx.wt.path, rel);
      const spec = rel.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
      const inBase = await git(["rev-parse", "--verify", "--quiet", `${base}:${spec}`], ctx.wt.path, ctx.wt.hooksDir, ctx.wt.pinned);
      const baseBlob = inBase.stdout.trim();
      if (inBase.code !== 0 || !/^[0-9a-f]{40,64}$/.test(baseBlob)) return false;
      const kind = await git(["cat-file", "-t", baseBlob], ctx.wt.path, ctx.wt.hooksDir, ctx.wt.pinned);
      if (kind.code !== 0 || kind.stdout.trim() !== "blob") return false;
      const now = await git(["hash-object", "--no-filters", "--", path], ctx.wt.path, ctx.wt.hooksDir, ctx.wt.pinned);
      return now.code === 0 && now.stdout.trim() === baseBlob;
    } catch {
      return false;
    }
  }

  // Erişilebilirlik kapısı: auditDelivery bir testi yalnız taşıdığı kabul ölçütleri üzerinden sayar; planda `criteria` eşlemesi verilmediyse a11y denetimleri hiçbir
  // ölçüte bağlanmaz ve ihlal teslimi bozmazdı. Bu yüzden a11y-lab'ın ürün hatası (failed) testleri teslimi "failed", araç/girdi hatası (error / timed_out) ise
  // "passed" teslimi "unverified" yapar. Auditor ve completeness'e dokunulmaz; yalnız elimizdeki rapor nesnesine neden eklenir.
  private applyA11yGate(report: DeliveryReport, runs: RunResult[]): void {
    const a11y = runs.filter((r) => r.provider === "a11y-lab");
    const defects = a11y.flatMap((r) => r.tests).filter((t) => t.outcome === "failed" && t.classification === "product_defect");
    if (defects.length > 0 && report.verdict !== "failed") {
      report.verdict = "failed";
      report.reasons.unshift(redactString(`a11y-lab: ${defects.length} accessibility check(s) failed: ${defects.slice(0, 3).map((t) => t.name).join(", ")}`).slice(0, 400));
    } else if (report.verdict === "passed" && a11y.some((r) => r.status === "error" || r.status === "timed_out")) {
      report.verdict = "unverified";
      report.reasons.unshift("a11y-lab: the accessibility run could not complete (a file could not be read or analysed, or time ran out)");
    }
  }

  // Tasarım kapısı (madde 49 + 50): a11y kapısıyla aynı mantık. design-lab'ın ürün hatası (failed) testleri teslimi "failed", araç/girdi hatası (okunamayan spec/dosya, error / timed_out)
  // ise "passed" teslimi "unverified" yapar; tasarım denetimleri bir kabul ölçütüne bağlı olmayabilir, bu yüzden auditDelivery'ye güvenilmez.
  private applyDesignGate(report: DeliveryReport, runs: RunResult[], specFileChanged: boolean): void {
    const design = runs.filter((r) => r.provider === "design-lab");
    const defects = design.flatMap((r) => r.tests).filter((t) => t.outcome === "failed" && t.classification === "product_defect");
    if (defects.length > 0) {
      report.verdict = "failed";
      if (!report.reasons.some((x) => x.startsWith("design-lab:"))) report.reasons.unshift(redactString(`design-lab: ${defects.length} design check(s) failed: ${defects.slice(0, 3).map((t) => t.name).join(", ")}`).slice(0, 400));
    } else if (report.verdict === "passed" && design.some((r) => r.status === "error" || r.status === "timed_out")) {
      report.verdict = "unverified";
      report.reasons.unshift("design-lab: the design run could not complete (the design spec or a file could not be read or analysed, or time ran out)");
    }
    // Sözleşme dosyasını uygulayıcı yazdıysa tasarım denetimi kendi kendini onaylayabilir: en iyi ihtimalle "unverified" (requireTrustedTests ayrıca auditör tarafında da kanıt saymaz).
    if (specFileChanged && design.length > 0 && report.verdict !== "failed") {
      report.verdict = "unverified";
      if (!report.reasons.some((x) => x.startsWith("design-lab: the design spec file"))) {
        const reason = "design-lab: the design spec file was changed by the implementer (or is not tracked unchanged in the base commit), so it is not independent proof; use an inline spec";
        // Koşu zaten araç/girdi hatasıyla bittiyse (ör. okunamayan spec) asıl neden öne kalır.
        if (design.some((r) => r.status === "error" || r.status === "timed_out")) report.reasons.push(reason);
        else report.reasons.unshift(reason);
      }
    }
  }

  // Görsel regresyon kapısı (madde 52): expectScreenshotMatch bir kabul ölçütüne bağlı olmayabilir ya da başka bir test aynı ölçütü karşılıyor olabilir; bu yüzden
  // taban eksik / güvenilmez / geçersizse (görsel regresyon YAPILMADI) "passed" teslim en iyi ihtimalle "unverified" olur; piksel farkı (diff / boyut uyuşmazlığı) ise "failed" yapar.
  private applyBaselineGate(report: DeliveryReport, runs: RunResult[]): void {
    const recs = runs.filter((r) => r.provider === "browser").flatMap((r) => (Array.isArray(r.providerData.baselines) ? (r.providerData.baselines as Array<{ file?: unknown; status?: unknown }>) : []));
    if (recs.length === 0) return;
    const diffs = recs.filter((b) => b.status === "diff" || b.status === "size-mismatch");
    const notDone = recs.filter((b) => b.status === "missing" || b.status === "untrusted" || b.status === "invalid");
    if (diffs.length > 0 && report.verdict !== "failed") {
      report.verdict = "failed";
      report.reasons.unshift(redactString(`visual regression: ${diffs.length} screenshot(s) differ from the approved baseline: ${diffs.slice(0, 3).map((b) => String(b.file)).join(", ")}`).slice(0, 400));
    } else if (notDone.length > 0 && report.verdict === "passed") {
      report.verdict = "unverified";
      report.reasons.unshift(redactString(`visual regression was not performed for ${notDone.length} screenshot(s) (baseline missing, untrusted or invalid): ${notDone.slice(0, 3).map((b) => `${String(b.file)} (${String(b.status)})`).join(", ")}; the user must approve a baseline`).slice(0, 400));
    }
  }

  // Mutasyon kapısı (madde 58): auditDelivery yalnız kabul ölçütlerine bağlı testleri sayar; mutasyon testleri ölçüte bağlı olmayabilir. Bu yüzden özet testi
  // ("mutation-score", skor < minScore) başarısızsa teslim "failed"; koşu tamamlanamadıysa (araç/girdi hatası, süre, iptal) ya da hiç mutant üretilemediyse
  // "passed" teslim "unverified" olur. minScore üstünde kalan hayatta kalan mutantlar teslimi bozmaz, uyarı olarak yazılır.
  private applyMutationGate(report: DeliveryReport, runs: RunResult[], requireTrusted: boolean): void {
    const mut = runs.filter((r) => r.provider === "mutation-lab");
    if (mut.length === 0) return;
    // Uygulayıcının kendi yazdığı/değiştirdiği testler mutasyon skorunu şişirebilir (ör. kaynağın özetini karşılaştıran test her mutantı öldürür): bağımsız kanıt sayılmaz.
    const selfTests = report.selfAuthoredTests.length > 0;
    if (selfTests) report.warnings.push(redactString(`mutation-lab: the tests were written or changed by the implementer (${report.selfAuthoredTests.slice(0, 3).join(", ")}); the mutation score is not independent proof`).slice(0, 400));
    const survivors = mut.flatMap((r) => r.tests).filter((t) => t.outcome === "failed" && t.id !== "mutation-score");
    const low = mut.flatMap((r) => r.tests).filter((t) => t.id === "mutation-score" && t.outcome === "failed");
    if (low.length > 0) {
      report.verdict = "failed";
      report.reasons.unshift(redactString(`mutation-lab: ${low[0]?.error?.message ?? "the mutation score is below the minimum"}`).slice(0, 400));
      return;
    }
    if (survivors.length > 0) report.warnings.push(redactString(`mutation-lab: ${survivors.length} mutant(s) survived although the score is acceptable: ${survivors.slice(0, 3).map((t) => t.name).join(", ")}`).slice(0, 400));
    if (report.verdict !== "passed") return;
    if (selfTests && requireTrusted) {
      report.verdict = "unverified";
      report.reasons.unshift("mutation-lab: requireTrustedTests is on and the tests behind the mutation score were written or changed by the implementer");
      return;
    }
    if (mut.some((r) => r.status === "error" || r.status === "timed_out" || r.status === "cancelled")) {
      report.verdict = "unverified";
      report.reasons.unshift("mutation-lab: the mutation run could not complete (baseline red, workspace too large to copy, time ran out or an infrastructure error)");
    } else if (mut.some((r) => r.tests.some((t) => t.id === "mutation-score" && t.outcome === "skipped"))) {
      report.verdict = "unverified";
      report.reasons.unshift("mutation-lab: no mutants could be generated from the given source files, so the tests were not challenged");
    }
  }

  // Başarısız teslim için "yeniden üretim paketi" (madde 60): ilk ürün hatasının koşusundan (yoksa ilk başarısız testli koşudan) çıkarılır, kanıt dosyası + kayıt olarak yazılır.
  // Gerçek yeniden çalıştırma (spawn) YOKTUR; paket yalnız veridir (bkz. verify/labs/replay.ts). Paket yazılamazsa teslim kararı DEĞİŞMEZ, ama denetime hata düşer.
  private async writeReplay(ctx: Ctx, plan: VerificationPlan, runs: RunResult[], firstFailureRunId: string | null, changed: string[], dir: string): Promise<void> {
    const hasFailing = (r: RunResult): boolean => r.tests.some((t) => t.outcome === "failed" || t.outcome === "error");
    const run = (firstFailureRunId ? runs.find((r) => r.runId === firstFailureRunId) : undefined) ?? runs.find(hasFailing);
    if (!run || !hasFailing(run)) return;
    try {
      let commit: string | undefined;
      const head = await git(["rev-parse", "HEAD"], ctx.wt.path, ctx.wt.hooksDir, ctx.wt.pinned);
      if (head.code === 0 && head.stdout.trim().length >= 7 && head.stdout.trim().length <= 64) commit = head.stdout.trim();
      const bundle = buildReplayBundle(run, { plan, ...(commit ? { commit } : {}), worktreeRelativeFiles: changed, now: this.now });
      const item = saveEvidence(dir, `replay-${run.runId}`, "report", `replay bundle for ${run.provider} (${bundle.failingTests.length} failing test(s))`, `${JSON.stringify(bundle, null, 2)}\n`, "json");
      this.d.evidence.add(ctx.taskId, ctx.attemptId, "replay", `${run.provider}: ${bundle.failingTests.length} failing test(s)`, { bundle, file: { id: item.id, path: item.path, sha256: item.sha256, bytes: item.bytes } });
      this.audit("workflow.replay", "written", { workflowId: ctx.wf.id, runId: run.runId, provider: run.provider, failing: bundle.failingTests.length });
    } catch (err) {
      this.audit("workflow.replay", "error", { workflowId: ctx.wf.id, runId: run.runId, message: redactString(err instanceof Error ? err.message : String(err)).slice(0, 300) });
    }
  }

  private async runVerification(ctx: Ctx, plan: VerificationPlan, round: number, changed: string[]): Promise<{ runs: RunResult[]; lineage: LineageRecord | null; dir: string }> {
    const v = this.d.verify as NonNullable<EngineDeps["verify"]>;
    const approval = ctx.userApproved ? { grantedBy: "user" as const } : undefined;
    mkdirSync(v.evidenceRoot, { recursive: true });
    const dir = resolveInsideRoot(v.evidenceRoot, join(ctx.taskId.slice(0, 8), `${ctx.wf.id.slice(0, 8)}-r${round}`));
    mkdirSync(dir, { recursive: true });
    const runs: RunResult[] = [];
    try {
      if (plan.localTests) {
        // Project tests are code from the workspace: running them is its own permission (verification.run), distinct from giving an agent a shell.
        const gate = evaluate({ actor: SYSTEM, action: "verification.run", target: ctx.wt.path, ...(approval ? { approval } : {}) }, this.d.contract, this.now());
        if (gate.decision !== "allow") throw new StepFailure("verification_not_authorized", `running project tests needs verification.run: ${gate.rule}`);
        const localRun = await v.local.run({ cwd: ctx.wt.path, files: plan.localTests.files, timeoutMs: plan.timeoutMs, evidenceDir: dir, ...(plan.localTests.retryFailures ? { retryFailures: true } : {}) }).result;
        runs.push(localRun);
        // Mutasyon testi (madde 58) yalnız testler GEÇTİYSE koşar ve aynı verification.run izin kapısından geçer; mutasyonlar çalışma ağacının geçici kopyasında yapılır.
        if (plan.mutation && localRun.status === "passed") {
          const mgate = evaluate({ actor: SYSTEM, action: "verification.run", target: ctx.wt.path, ...(approval ? { approval } : {}) }, this.d.contract, this.now());
          if (mgate.decision !== "allow") throw new StepFailure("verification_not_authorized", `running mutation tests needs verification.run: ${mgate.rule}`);
          runs.push(attachLabLog(await runMutationPlan(ctx.wt.path, plan, dir), dir));
        }
      }
      if (plan.browser) {
        const siteDir = resolveInsideRoot(ctx.wt.path, plan.browser.siteDir);
        // Görsel regresyon tabanları (madde 52): GÜVENİLİR olan yalnız kullanıcı onaylı klasördür (evidenceRoot/baselines/<görev>); çalışma ağacındaki .agentmom/baselines
        // uygulayıcının yazabildiği yer olduğundan yalnız OKUNUR ve güvenilmez sayılır (browser-worker yalnız uyarı üretir). Onay ucu: POST /api/tasks/:id/baselines/approve.
        const baselineDir = baselineDirFor(v.evidenceRoot, ctx.taskId);
        const workspaceBaselineDir = join(ctx.wt.path, ".agentmom", "baselines");
        // Onaylı taban özetleri (ad -> sha256): kullanıcının onay anında düştüğü "baseline.approve" kayıtlarından (en yenisi geçerli). Klasördeki bir dosya bu özetle
        // eşleşmiyorsa (elle değiştirilmiş) ya da onay kaydı yoksa güvenilmez: browser.ts "invalid" sayar.
        const approvedBaselines: Record<string, string> = {};
        for (const rec of this.d.evidence.list(ctx.taskId)) {
          const d = rec.data as { name?: unknown; sha256?: unknown };
          if (rec.kind === "baseline.approve" && typeof d.name === "string" && typeof d.sha256 === "string") approvedBaselines[d.name] = d.sha256;
        }
        runs.push(await v.browser.run({ siteDir, steps: plan.browser.steps, evidenceDir: dir, timeoutMs: plan.timeoutMs, baselineDir, workspaceBaselineDir, workspaceRoot: ctx.wt.path, approvedBaselines, ...(plan.browser.stepTimeoutMs ? { stepTimeoutMs: plan.browser.stepTimeoutMs } : {}) }).result);
      }
      // Sözleşme ve durum laboratuvarları saftır: çalışma ağacında kod çalıştırmazlar, bu yüzden verification.run izni gerekmez.
      // Sözleşmelerin konusu yalnız çalışma ağacının İÇİNDEN okunan bir JSON dosyasıdır.
      if (plan.contracts) runs.push(attachLabLog(await runContractsPlan(ctx.wt.path, plan), dir));
      if (plan.states) runs.push(attachLabLog(await runStatesPlan(plan), dir));
      // Erişilebilirlik laboratuvarı da saftır (kod çalıştırmaz, verification.run gerekmez): statik HTML dosyaları çalışma ağacının İÇİNDEN okunur.
      if (plan.a11y) runs.push(attachLabLog(await runA11yPlan(ctx.wt.path, plan), dir));
      // Tasarım laboratuvarı da saftır (kod çalıştırmaz, verification.run gerekmez): HTML/CSS dosyaları ve specFile çalışma ağacının İÇİNDEN okunur.
      if (plan.design) runs.push(attachLabLog(await runDesignPlan(ctx.wt.path, plan), dir));
    } catch (err) {
      if (err instanceof StepFailure) throw err;
      throw new StepFailure("verification_error", err instanceof Error ? err.message : String(err));
    }
    // Test verisi soy ağacı (madde 59): koşulardan SONRA kaydedilir; kanıt her koşunun kanıtlarına ("report") ve providerData'sına bağlanır.
    // Okunamayan veri dosyası (eksik / ağaç dışı / çok büyük) bir araç/girdi hatasıdır: teslim "passed" olmaz.
    let lineage: LineageRecord | null = null;
    if (plan.dataFiles && plan.dataFiles.length > 0) {
      try {
        lineage = recordLineage({ root: ctx.wt.path, dataFiles: plan.dataFiles, runId: `${ctx.wf.id.slice(0, 8)}-r${round}-${randomUUID().slice(0, 8)}`, taskId: ctx.taskId, changedFiles: changed, evidenceDir: dir, now: this.now });
      } catch (err) {
        throw new StepFailure("verification_error", `test data lineage could not be recorded: ${err instanceof LabSpecError || err instanceof Error ? redactString(err.message) : "unknown error"}`);
      }
      this.d.evidence.add(ctx.taskId, ctx.attemptId, "lineage", `${lineage.entries.length} data file(s), ${lineage.modified.length} modified by the task`, { runId: lineage.runId, entries: lineage.entries, problems: lineage.problems, modified: lineage.modified, file: { id: lineage.evidence.id, path: lineage.evidence.path, sha256: lineage.evidence.sha256, bytes: lineage.evidence.bytes } });
      if (lineage.problems.length > 0) throw new StepFailure("verification_error", `test data files could not be recorded: ${lineage.problems.slice(0, 3).map((p) => `${p.path} (${p.message})`).join("; ")}`);
      for (const run of runs) {
        run.evidence.push(lineage.evidence);
        run.providerData.lineage = { evidenceId: lineage.evidence.id, files: lineage.entries.length, modifiedByTask: lineage.modified };
      }
    }
    for (const run of runs) {
      try {
        validateRunResult(run);
      } catch (err) {
        throw new StepFailure("verification_error", err instanceof SchemaError ? err.message : String(err));
      }
      this.d.store.addVerificationRun(ctx.taskId, ctx.wf.id, round, run);
      this.d.evidence.add(ctx.taskId, ctx.attemptId, "verification:run", `${run.provider} ${run.status} (${run.totals.passed} passed, ${run.totals.failed} failed, ${run.totals.error} error)`, {
        runId: run.runId,
        provider: run.provider,
        status: run.status,
        round,
        totals: run.totals,
        tests: run.tests.map((t) => ({ id: t.id, name: t.name, outcome: t.outcome, classification: t.classification, criteria: t.criteria, attempts: t.attempts })),
        // Görsel regresyon kayıtları (taban adı, durum, yeni görüntünün kanıt kimliği ve özeti): onay ucu "hangi görüntü onaylanıyor"u buradan bulur.
        ...(Array.isArray(run.providerData.baselines) ? { baselines: run.providerData.baselines } : {}),
        evidence: run.evidence.map((e) => ({ id: e.id, kind: e.kind, path: e.path, sha256: e.sha256, bytes: e.bytes })),
      });
    }
    return { runs, lineage, dir };
  }
}
