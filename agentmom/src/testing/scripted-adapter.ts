import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { redactString } from "../core/audit/redact.ts";
import type { RouteKind } from "../core/policy/types.ts";
import { OPERATIONS, UNKNOWN_USAGE } from "../providers/contract.ts";
import type {
  CapabilityDeclaration,
  ConnectionReport,
  ErrorCode,
  Evidence,
  ExecutionHandle,
  ExecutionRequest,
  ExecutionResult,
  ExecutionStatus,
  ProviderAdapter,
  ProviderEvent,
  Usage,
} from "../providers/contract.ts";

export interface ScriptCall {
  n: number;
  cwd: string;
  prompt: string;
}

export interface ScriptStep {
  status?: "succeeded" | "failed";
  summary?: string;
  error?: { code: ErrorCode; message: string };
  write?: Record<string, string>;
  move?: Record<string, string>;
  delayMs?: number;
  hang?: boolean;
  mimicCli?: boolean;
}

// In-process test double for a provider: behavior is decided by a script, so tests need no real CLI and no real model.
export class ScriptedAdapter implements ProviderAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly routeKind: RouteKind;
  readonly contractVersion = "1";
  readonly readScope: "workspace" | "unconfined";
  readonly calls: ScriptCall[] = [];
  active = 0;
  peakActive = 0;
  private readonly script: (call: ScriptCall) => ScriptStep;
  private readonly results = new Map<string, Promise<ExecutionResult>>();
  private readonly events = new Map<string, ProviderEvent[]>();
  private readonly cancels = new Map<string, () => void>();

  constructor(id: string, script: (call: ScriptCall) => ScriptStep, opts: { routeKind?: RouteKind; readScope?: "workspace" | "unconfined" } = {}) {
    this.id = id;
    this.displayName = `scripted ${id}`;
    this.script = script;
    this.routeKind = opts.routeKind ?? "subscription";
    this.readScope = opts.readScope ?? "workspace";
  }

  describeCapabilities(): CapabilityDeclaration[] {
    return OPERATIONS.map((operation) => ({ operation, status: "unverified" as const, evidenceSource: "scripted test double", checkedAt: "2026-10-21T00:00:00.000Z" }));
  }

  validateConfiguration() {
    return { ok: true, problems: [] };
  }

  async testConnection(): Promise<ConnectionReport> {
    return { reachable: true, authenticated: null, version: null, detail: "scripted", checkedAt: "2026-10-21T00:00:00.000Z" };
  }

  execute(request: ExecutionRequest): ExecutionHandle {
    const executionId = `${this.id}-${this.calls.length + 1}`;
    const call: ScriptCall = { n: this.calls.length + 1, cwd: request.cwd, prompt: request.prompt };
    this.calls.push(call);
    const events: ProviderEvent[] = [{ type: "started", ts: new Date().toISOString(), data: { provider: this.id } }];
    this.events.set(executionId, events);
    const step = this.script(call);
    this.active++;
    this.peakActive = Math.max(this.peakActive, this.active);
    const result = new Promise<ExecutionResult>((resolve) => {
      let done = false;
      const finish = (status: ExecutionResult["status"], error?: ExecutionResult["error"]) => {
        if (done) return;
        done = true;
        this.active--;
        const full = step.summary ?? "";
        // mimicCli: gerçek CLI adaptörü gibi özeti redakte edip 2000 karaktere keser; tam yanıt yalnız fullText'te kalır.
        const summary = step.mimicCli ? redactString(full).slice(0, 2000) : full;
        events.push({ type: status === "succeeded" ? "completed" : "error", ts: new Date().toISOString(), data: { status } });
        resolve({ executionId, status, exitCode: status === "succeeded" ? 0 : 1, summary, usage: UNKNOWN_USAGE, eventCount: events.length, ...(status === "succeeded" ? { fullText: full.slice(0, 65536) } : {}), ...(error ? { error } : {}) });
      };
      this.cancels.set(executionId, () => finish("cancelled", { code: "cancelled", message: "cancelled" }));
      const go = () => {
        if (step.hang) return;
        for (const [rel, text] of Object.entries(step.write ?? {})) {
          const p = join(request.cwd, rel);
          mkdirSync(dirname(p), { recursive: true });
          writeFileSync(p, text);
        }
        for (const [from, to] of Object.entries(step.move ?? {})) {
          mkdirSync(dirname(join(request.cwd, to)), { recursive: true });
          renameSync(join(request.cwd, from), join(request.cwd, to));
        }
        if (step.status === "failed") finish("failed", step.error ?? { code: "process_failed", message: "scripted failure" });
        else finish("succeeded");
      };
      if (step.delayMs) setTimeout(go, step.delayMs);
      else queueMicrotask(go);
      const guard = setTimeout(() => {
        if (step.hang) finish("failed", { code: "timeout", message: "timed out" });
      }, request.timeoutMs);
      // Takılmayan betiklerde zamanlayıcı süreci ayakta tutmaz (testler 5 dakikalık zaman aşımını beklemesin).
      if (!step.hang) guard.unref();
    });
    this.results.set(executionId, result);
    return { executionId, result };
  }

  async *streamEvents(executionId: string): AsyncIterable<ProviderEvent> {
    await this.results.get(executionId);
    for (const e of this.events.get(executionId) ?? []) yield e;
  }

  getStatus(): ExecutionStatus {
    return "succeeded";
  }

  async cancel(executionId: string): Promise<void> {
    this.cancels.get(executionId)?.();
  }

  collectEvidence(executionId: string): Evidence {
    return { executionId, status: "succeeded", exitCode: 0, outputTail: "", eventCount: this.events.get(executionId)?.length ?? 0, startedAt: "a", endedAt: "b" };
  }

  getUsage(): Usage {
    return UNKNOWN_USAGE;
  }

  async dispose(): Promise<void> {}
}
