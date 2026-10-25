import { execFile } from "node:child_process";
import { mkdirSync, realpathSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { AuditLog } from "../core/audit/audit.ts";
import { redactString } from "../core/audit/redact.ts";
import { resolveInsideRoot } from "../core/config/safe-path.ts";
import { evaluate } from "../core/policy/engine.ts";
import { classifyData } from "../core/policy/data-boundary.ts";
import type { Actor, AutonomyContract, Decision, Route } from "../core/policy/types.ts";
import type { Task } from "../core/tasks/tasks.ts";
import { buildChildEnv } from "../providers/child-env.ts";
import { CapabilityError, UNKNOWN_USAGE, assertSupported } from "../providers/contract.ts";
import type { ExecutionResult, ProviderAdapter, SandboxPolicy } from "../providers/contract.ts";
import { sandboxFromContract } from "../providers/policy-map.ts";

export const SYSTEM: Actor = { kind: "system", id: "orchestrator" };
export const MAX_DIFF = 200 * 1024;

export class RunRefused extends Error {
  readonly code: string;
  readonly decision?: Decision;

  constructor(code: string, message: string, decision?: Decision) {
    super(message);
    this.name = "RunRefused";
    this.code = code;
    if (decision) this.decision = decision;
  }
}

export interface GitPin {
  gitDir: string;
  workTree: string;
}

// isolated: kullanıcı/sistem git yapılandırması (filter, attributes vb.) okunmaz; yalnız depo-yerel yapılandırma geçerlidir (model yetenek sandbox'ı, D8c-1).
const NULL_DEV = process.platform === "win32" ? "NUL" : "/dev/null";
export function git(args: string[], cwd: string, hooksDir: string, pinned?: GitPin, isolated?: boolean): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveP) => {
    execFile(
      "git",
      ["-c", `core.hooksPath=${hooksDir}`, "-c", "core.fsmonitor=false", "-c", "core.pager=cat", "-c", "core.quotepath=false", "-c", "diff.external=", ...(isolated ? ["-c", `core.attributesFile=${NULL_DEV}`] : []), ...args],
      {
        cwd,
        env: { ...buildChildEnv(), GIT_TERMINAL_PROMPT: "0", GIT_ATTR_NOSYSTEM: "1", ...(isolated ? { GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: NULL_DEV } : {}), ...(pinned ? { GIT_DIR: pinned.gitDir, GIT_WORK_TREE: pinned.workTree } : {}) },
        windowsHide: true,
        maxBuffer: 32 * 1024 * 1024,
        encoding: "utf8",
      },
      (err, stdout, stderr) => {
        const code = err ? (typeof (err as NodeJS.ErrnoException).code === "number" ? ((err as NodeJS.ErrnoException).code as unknown as number) : 1) : 0;
        resolveP({ code, stdout: stdout ?? "", stderr: stderr ?? "" });
      },
    );
  });
}

function sameDir(a: string, b: string): boolean {
  return relative(resolve(a), resolve(b)) === "";
}

// Policy decisions use the real location: a link or junction inside an allowed directory must not hide a forbidden or untrusted target.
export function canonicalPath(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

export interface AuthDeps {
  audit: AuditLog;
  contract: AutonomyContract;
  now?: () => Date;
}

// Policy gate shared by single runs and workflow steps. Returns the sandbox the provider must be held to, or throws RunRefused.
export function authorizeProvider(
  deps: AuthDeps,
  args: { task: Task; adapter: ProviderAdapter; repoPath: string; worktreePath: string; userApproved: boolean; readOnly?: boolean; previousRoute?: Route; text?: string },
): SandboxPolicy {
  const now = deps.now ?? (() => new Date());
  const { task, adapter } = args;
  args = { ...args, repoPath: canonicalPath(args.repoPath) };
  const approval = args.userApproved ? { grantedBy: "user" as const } : undefined;
  const route: Route = { kind: adapter.routeKind, providerId: adapter.id };
  const deny = (decision: Decision, what: string): never => {
    deps.audit.record({ initiator: SYSTEM, action: `run.refused:${what}`, decision: decision.decision, result: decision.rule, details: { taskId: task.id, providerId: adapter.id, reason: decision.reason } });
    throw new RunRefused(decision.rule, decision.reason, decision);
  };

  // Sınıf BİR kez hesaplanır: yollar + (verildiyse) sağlayıcıya gidecek metin (sır kalıbı taranır).
  const dataClass = classifyData({ paths: [args.repoPath, args.worktreePath], ...(args.text ? { text: args.text } : {}) }, deps.contract);
  const requested = args.previousRoute ?? (task.request as { route?: Route } | null)?.route;
  if (requested && (requested.providerId !== route.providerId || requested.kind !== route.kind)) {
    const d = evaluate({ actor: SYSTEM, action: "provider.switch", route, previousRoute: requested, dataClass, ...(approval ? { approval } : {}) }, deps.contract, now());
    if (d.decision !== "allow") deny(d, "provider.switch");
  }
  const call = evaluate(
    { actor: SYSTEM, action: "provider.call", route, target: args.repoPath, dataClass, ...(adapter.readScope === "unconfined" ? { unconfinedRead: true } : {}), ...(approval ? { approval } : {}) },
    deps.contract,
    now(),
  );
  if (call.decision !== "allow") deny(call, "provider.call");
  const read = evaluate({ actor: SYSTEM, action: "file.read", target: args.repoPath }, deps.contract, now());
  if (read.decision !== "allow") deny(read, "file.read");

  try {
    assertSupported(adapter, "execute");
  } catch (err) {
    if (err instanceof CapabilityError) {
      deps.audit.record({ initiator: SYSTEM, action: "run.refused:capability", decision: "deny", result: err.code, details: { taskId: task.id, providerId: adapter.id, operation: err.operation } });
      throw new RunRefused(err.code, err.message);
    }
    throw err;
  }

  const readOnlyContract: AutonomyContract = { ...deps.contract, allowedActions: deps.contract.allowedActions.filter((a) => a !== "file.write" && a !== "shell.exec") };
  let sandbox = sandboxFromContract(args.readOnly ? readOnlyContract : deps.contract, args.userApproved);
  if (sandbox.permission === "workspace_write") {
    const write = evaluate({ actor: SYSTEM, action: "file.write", target: args.worktreePath, ...(approval ? { approval } : {}) }, deps.contract, now());
    if (write.decision !== "allow") sandbox = sandboxFromContract(readOnlyContract, args.userApproved);
  }
  const unenforceable = adapter.checkSandbox?.(sandbox);
  if (unenforceable) {
    deps.audit.record({ initiator: SYSTEM, action: "run.refused:sandbox", decision: "deny", result: "sandbox_not_enforceable", details: { taskId: task.id, providerId: adapter.id, reason: unenforceable, sandbox } });
    throw new RunRefused("sandbox_not_enforceable", unenforceable);
  }
  return sandbox;
}

export interface Worktree {
  path: string;
  hooksDir: string;
  pinned: GitPin;
  isolated?: boolean;
}

// Detached git worktree under worktreeRoot. The git directory is resolved before any agent runs and pinned for every later command.
export async function createWorktree(worktreeRoot: string, repoPath: string, worktreePath: string, isolated?: boolean): Promise<Worktree> {
  const hooksDir = join(worktreeRoot, ".nohooks");
  mkdirSync(hooksDir, { recursive: true });
  const top = await git(["rev-parse", "--show-toplevel"], repoPath, hooksDir, undefined, isolated);
  if (top.code !== 0 || !sameDir(top.stdout.trim(), repoPath)) throw new RunRefused("not_a_repo_root", "repoPath must be the root of a git repository");
  resolveInsideRoot(worktreeRoot, relative(worktreeRoot, worktreePath));
  const add = await git(["worktree", "add", "--detach", worktreePath, "HEAD"], repoPath, hooksDir, undefined, isolated);
  if (add.code !== 0) throw new RunRefused("worktree_failed", `git worktree add failed: ${redactString(add.stderr).slice(0, 300)}`);
  return reopenWorktree(worktreeRoot, worktreePath, isolated);
}

export async function reopenWorktree(worktreeRoot: string, worktreePath: string, isolated?: boolean): Promise<Worktree> {
  const hooksDir = join(worktreeRoot, ".nohooks");
  mkdirSync(hooksDir, { recursive: true });
  const gd = await git(["rev-parse", "--absolute-git-dir"], worktreePath, hooksDir, undefined, isolated);
  if (gd.code !== 0 || !gd.stdout.trim()) throw new RunRefused("worktree_failed", "could not resolve the worktree git directory");
  return { path: worktreePath, hooksDir, pinned: { gitDir: gd.stdout.trim(), workTree: worktreePath }, ...(isolated ? { isolated: true } : {}) };
}

export async function runProviderOnce(
  audit: AuditLog,
  adapter: ProviderAdapter,
  args: { taskId: string; attemptId: string; prompt: string; cwd: string; sandbox: SandboxPolicy; timeoutMs: number; quietAudit?: true; onExecutionId?: (id: string) => void },
): Promise<ExecutionResult> {
  try {
    const handle = adapter.execute({ taskId: args.taskId, prompt: args.prompt, cwd: args.cwd, sandbox: args.sandbox, timeoutMs: args.timeoutMs });
    args.onExecutionId?.(handle.executionId);
    for await (const event of adapter.streamEvents(handle.executionId)) {
      audit.record({ initiator: { kind: "agent", id: adapter.id }, action: `provider.event:${event.type}`, decision: "n/a", result: event.type, details: { taskId: args.taskId, attemptId: args.attemptId, ts: event.ts, ...(args.quietAudit ? {} : { data: event.data }) } });
    }
    return await handle.result;
  } catch (err) {
    return { executionId: "none", status: "failed", exitCode: null, summary: "", error: { code: "process_failed", message: err instanceof Error ? err.message : String(err) }, usage: UNKNOWN_USAGE, eventCount: 0 };
  }
}

export interface GitEvidence {
  files: string[];
  stat: string;
  diff: string;
  truncated: boolean;
}

export async function collectGitEvidence(wt: Worktree): Promise<GitEvidence> {
  // --no-renames: a moved file must show up as a deletion at the source AND an addition at the destination, so both paths are scope-checked.
  const safe = ["--no-ext-diff", "--no-textconv", "--no-renames"];
  await git(["add", "-A"], wt.path, wt.hooksDir, wt.pinned, wt.isolated);
  const stat = await git(["diff", ...safe, "--cached", "--stat", "HEAD"], wt.path, wt.hooksDir, wt.pinned, wt.isolated);
  const names = await git(["diff", ...safe, "--cached", "--name-only", "HEAD"], wt.path, wt.hooksDir, wt.pinned, wt.isolated);
  const diff = await git(["diff", ...safe, "--cached", "HEAD"], wt.path, wt.hooksDir, wt.pinned, wt.isolated);
  const truncated = diff.stdout.length > MAX_DIFF;
  return {
    files: names.stdout.split("\n").map((s) => s.trim()).filter(Boolean),
    stat: redactString(stat.stdout),
    diff: redactString(truncated ? diff.stdout.slice(0, MAX_DIFF) : diff.stdout),
    truncated,
  };
}
