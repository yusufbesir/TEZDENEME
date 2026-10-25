import { join } from "node:path";
import { AuditLog } from "../core/audit/audit.ts";
import { redactString } from "../core/audit/redact.ts";
import type { Actor, AutonomyContract } from "../core/policy/types.ts";
import { TaskStore } from "../core/tasks/tasks.ts";
import type { ExecutionResult } from "../providers/contract.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { EvidenceStore } from "./evidence.ts";
import { RunRefused, SYSTEM, authorizeProvider, canonicalPath, collectGitEvidence, createWorktree, runProviderOnce } from "./steps.ts";

export { RunRefused } from "./steps.ts";

export interface RunDeps {
  tasks: TaskStore;
  audit: AuditLog;
  registry: ProviderRegistry;
  evidence: EvidenceStore;
  contract: AutonomyContract;
  worktreeRoot: string;
  now?: () => Date;
}

export interface RunInput {
  taskId: string;
  providerId: string;
  repoPath: string;
  prompt: string;
  classifyText?: string; // veri sınıfı hesabında istem yerine bu metin taranır (internetli yeteneklerde getirilen kamu metni kullanıcı verisi değildir)
  onExecutionId?: (id: string) => void; // yürütme kimliği (zaman aşımı bekçisi iptal edebilsin diye)
  timeoutMs?: number; readOnly?: true; quietAudit?: true; // readOnly: sözleşme yazmaya izin verse bile salt-okunur sandbox (D8c-1). quietAudit: sağlayıcı olay İÇERİĞİ denetime, yanıt özeti ve çıktı kuyruğu kanıta yazılmaz (yalnız tür/zaman/sayaç).
}

export interface StartedRun {
  taskId: string;
  attemptId: string;
  worktreePath: string;
  done: Promise<RunOutcome>;
}

export interface RunOutcome {
  status: ExecutionResult["status"];
  exitCode: number | null;
  errorCode: string | null;
  diffFiles: string[];
  // Sağlayıcının (redakte edilmiş) son yanıt özeti ve kullanımı: model yeteneği çalıştırıcısı (D8c-1) yanıtı buradan okur.
  summary?: string;
  usage?: ExecutionResult["usage"];
  // YALNIZ quietAudit koşularında, yalnız bellekte: sağlayıcının tam (redakte EDİLMEMİŞ, en çok 64 KB) yanıtı. Kanıta/denetime ASLA yazılmaz.
  fullText?: string;
}

// Authorizes, isolates (detached git worktree under worktreeRoot), runs through the adapter, audits every event and stores evidence.
// Nothing is deleted: worktrees stay for inspection.
export async function startRun(deps: RunDeps, input: RunInput, actor: Actor): Promise<StartedRun> {
  const now = deps.now ?? (() => new Date());
  if (actor.kind !== "user") throw new RunRefused("user_required", "only the user can start a run");
  const task = deps.tasks.require(input.taskId);
  if (task.state !== "approved") throw new RunRefused("not_approved", `task is ${task.state}, not approved`);
  const adapter = deps.registry.get(input.providerId);
  if (!adapter) throw new RunRefused("unknown_provider", `provider ${input.providerId} is not registered`);

  // The path is resolved to its real location ONCE; the same value is authorized and then used by git.
  const repoPath = canonicalPath(input.repoPath);
  const worktreePath = join(deps.worktreeRoot, `${task.id.slice(0, 8)}-${now().getTime().toString(36)}`);
  const sandbox = authorizeProvider(deps, { task, adapter, repoPath, worktreePath, userApproved: task.approvedBy === "user", text: input.classifyText ?? input.prompt, ...(input.readOnly ? { readOnly: true } : {}) });
  const wt = await createWorktree(deps.worktreeRoot, repoPath, worktreePath, input.readOnly ? true : undefined);

  const attempt = deps.tasks.startAttempt(task.id, SYSTEM);
  deps.audit.record({ initiator: SYSTEM, action: "run.started", decision: "allow", result: `attempt ${attempt.id}`, details: { taskId: task.id, providerId: adapter.id, worktreePath, sandbox } });

  const done = (async (): Promise<RunOutcome> => {
    const result = await runProviderOnce(deps.audit, adapter, {
      taskId: task.id,
      attemptId: attempt.id,
      prompt: input.prompt,
      cwd: worktreePath,
      sandbox,
      timeoutMs: Math.min(input.timeoutMs ?? deps.contract.maxRuntimeMs, deps.contract.maxRuntimeMs),
      ...(input.quietAudit ? { quietAudit: true } : {}),
      ...(input.onExecutionId ? { onExecutionId: input.onExecutionId } : {}),
    });

    const g = await collectGitEvidence(wt);
    deps.evidence.add(task.id, attempt.id, "diff", g.files.length ? `${g.files.length} file(s) changed` : "no changes", { worktreePath, files: g.files, stat: g.stat, diff: g.diff, truncated: g.truncated });
    deps.evidence.add(task.id, attempt.id, "execution", `${result.status} (exit ${result.exitCode ?? "none"})`, {
      provider: adapter.id,
      status: result.status,
      exitCode: result.exitCode,
      error: result.error ?? null,
      ...(input.quietAudit ? { summaryChars: result.summary.length } : { summary: redactString(result.summary) }),
      eventCount: result.eventCount,
    });
    deps.evidence.add(task.id, attempt.id, "usage", result.usage.source, result.usage);
    if (result.executionId !== "none") {
      const e = adapter.collectEvidence(result.executionId);
      deps.evidence.add(task.id, attempt.id, "output", `${e.outputTail.length} chars of output tail`, input.quietAudit ? { tailChars: e.outputTail.length } : { tail: redactString(e.outputTail) });
    }

    deps.tasks.finishAttempt(attempt.id, { exitCode: result.status === "succeeded" ? 0 : (result.exitCode ?? -1) || -1, ...(result.error ? { error: result.error.code } : {}) }, SYSTEM);
    deps.audit.record({ initiator: SYSTEM, action: "run.finished", decision: "n/a", result: result.status, details: { taskId: task.id, attemptId: attempt.id, exitCode: result.exitCode, errorCode: result.error?.code ?? null, files: g.files } });
    const outcome: RunOutcome = { status: result.status, exitCode: result.exitCode, errorCode: result.error?.code ?? null, diffFiles: g.files, summary: redactString(result.summary), usage: result.usage };
    // Tam yanıt SAYILAMAZ alan: JSON.stringify/yayılım (spread) ile kanıta ya da denetime sızamaz; yalnız doğrudan okuyan çağıran (model yeteneği çalıştırıcısı) görür.
    if (input.quietAudit && result.fullText !== undefined) Object.defineProperty(outcome, "fullText", { value: result.fullText, enumerable: false });
    return outcome;
  })();

  return { taskId: task.id, attemptId: attempt.id, worktreePath, done };
}
