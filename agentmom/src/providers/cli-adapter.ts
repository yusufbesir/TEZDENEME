import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { redact, redactString } from "../core/audit/redact.ts";
import type { RouteKind } from "../core/policy/types.ts";
import { buildChildEnv } from "./child-env.ts";
import { CONTRACT_VERSION, OPERATIONS, UNKNOWN_USAGE } from "./contract.ts";
import type {
  CapabilityDeclaration,
  CapabilityStatus,
  ConfigReport,
  ConnectionReport,
  ErrorCode,
  Evidence,
  ExecutionHandle,
  ExecutionRequest,
  ExecutionResult,
  ExecutionStatus,
  Operation,
  ProviderAdapter,
  ProviderEvent,
  ProviderEventType,
  Usage,
} from "./contract.ts";

export interface Launcher {
  command: string;
  prefixArgs: string[];
}

export interface CliAdapterOptions {
  launcher: Launcher;
  extraPathDirs?: string[];
  tempDir?: string;
  envBase?: NodeJS.ProcessEnv;
  now?: () => Date;
}

export interface ParsedLine {
  events: Array<{ type: ProviderEventType; data: Record<string, unknown> }>;
  usage?: Usage;
  final?: { ok: boolean; summary: string; errorText?: string };
}

interface Run {
  id: string;
  status: ExecutionStatus;
  events: ProviderEvent[];
  usage: Usage;
  exitCode: number | null;
  startedAt: string;
  endedAt: string | null;
  tail: string;
  stderrTail: string;
  child?: ChildProcess;
  listeners: Set<() => void>;
  cancelled: boolean;
  timedOut: boolean;
  outputLimit: boolean;
  spawnError: string | null;
  malformed: number;
  ctx: Record<string, unknown>;
  final?: ParsedLine["final"];
  result: Promise<ExecutionResult>;
}

const TAIL_BYTES = 8 * 1024;
const MAX_LINE = 1024 * 1024;
const DEFAULT_MAX_OUTPUT = 5 * 1024 * 1024;

function tail(text: string): string {
  return text.length > TAIL_BYTES ? text.slice(text.length - TAIL_BYTES) : text;
}

export function killTree(child: ChildProcess): void {
  if (child.pid === undefined) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }).on("error", () => child.kill());
  } else {
    child.kill("SIGKILL");
  }
}

// Shared machinery for adapters that drive an official CLI as a child process (no shell, allowlisted environment).
export abstract class CliAdapter implements ProviderAdapter {
  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly routeKind: RouteKind;
  readonly contractVersion = CONTRACT_VERSION;

  protected readonly launcher: Launcher;
  protected readonly now: () => Date;
  private readonly extraPathDirs: string[];
  private readonly tempDir: string | undefined;
  private readonly envBase: NodeJS.ProcessEnv | undefined;
  private readonly runs = new Map<string, Run>();
  private readonly caps = new Map<Operation, { status: CapabilityStatus; evidenceSource: string; checkedAt: string }>();

  constructor(opts: CliAdapterOptions) {
    this.launcher = opts.launcher;
    this.extraPathDirs = opts.extraPathDirs ?? [];
    this.tempDir = opts.tempDir;
    this.envBase = opts.envBase;
    this.now = opts.now ?? (() => new Date());
  }

  protected abstract buildArgs(request: ExecutionRequest): string[];
  protected abstract parseLine(value: unknown, ctx: Record<string, unknown>): ParsedLine | null;
  protected abstract classifyFailure(text: string): ErrorCode;
  abstract testConnection(): Promise<ConnectionReport>;

  protected setCapability(operation: Operation, status: CapabilityStatus, evidenceSource: string, checkedAt?: string): void {
    this.caps.set(operation, { status, evidenceSource, checkedAt: checkedAt ?? this.now().toISOString() });
  }

  describeCapabilities(): CapabilityDeclaration[] {
    const at = this.now().toISOString();
    return OPERATIONS.map((operation) => {
      const c = this.caps.get(operation);
      return { operation, status: c?.status ?? "unverified", evidenceSource: c?.evidenceSource ?? "not checked", checkedAt: c?.checkedAt ?? at };
    });
  }

  validateConfiguration(): ConfigReport {
    const problems: string[] = [];
    if (!existsSync(this.launcher.command)) problems.push(`executable not found: ${this.launcher.command}`);
    const entry = this.launcher.prefixArgs[0];
    if (entry && entry.endsWith(".js") && !existsSync(entry)) problems.push(`entry script not found: ${entry}`);
    return { ok: problems.length === 0, problems };
  }

  protected childEnv(): Record<string, string> {
    return buildChildEnv({
      ...(this.envBase ? { base: this.envBase } : {}),
      extraPathDirs: this.extraPathDirs,
      ...(this.tempDir ? { tempDir: this.tempDir } : {}),
    });
  }

  // Short status commands (version, login status). Output is returned to the caller, never logged.
  protected runQuick(args: string[], timeoutMs = 20_000): Promise<{ code: number | null; stdout: string; stderr: string; error?: string }> {
    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let settled = false;
      const finish = (v: { code: number | null; stdout: string; stderr: string; error?: string }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      };
      const child = spawn(this.launcher.command, [...this.launcher.prefixArgs, ...args], {
        env: this.childEnv(),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        shell: false,
      });
      const timer = setTimeout(() => {
        killTree(child);
        finish({ code: null, stdout, stderr, error: "timeout" });
      }, timeoutMs);
      child.stdout.on("data", (d: Buffer) => (stdout += d.toString("utf8")));
      child.stderr.on("data", (d: Buffer) => (stderr += d.toString("utf8")));
      child.on("error", (err: NodeJS.ErrnoException) => finish({ code: null, stdout, stderr, error: err.code ?? "spawn_error" }));
      child.on("close", (code) => finish({ code, stdout, stderr }));
    });
  }

  execute(request: ExecutionRequest): ExecutionHandle {
    const id = randomUUID();
    const run: Run = {
      id,
      status: "running",
      events: [],
      usage: UNKNOWN_USAGE,
      exitCode: null,
      startedAt: this.now().toISOString(),
      endedAt: null,
      tail: "",
      stderrTail: "",
      listeners: new Set(),
      cancelled: false,
      timedOut: false,
      outputLimit: false,
      spawnError: null,
      malformed: 0,
      ctx: {},
      result: undefined as unknown as Promise<ExecutionResult>,
    };
    this.runs.set(id, run);
    run.result = new Promise<ExecutionResult>((resolve) => this.start(run, request, resolve));
    return { executionId: id, result: run.result };
  }

  private emit(run: Run, type: ProviderEventType, data: Record<string, unknown>): void {
    run.events.push({ type, ts: this.now().toISOString(), data: redact(data) as Record<string, unknown> });
    for (const l of run.listeners) l();
  }

  private start(run: Run, request: ExecutionRequest, resolve: (r: ExecutionResult) => void): void {
    const maxOutput = request.maxOutputBytes ?? DEFAULT_MAX_OUTPUT;
    let seen = 0;
    let buffer = "";
    let closed = false;
    const finalize = (code: number | null): void => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      if (buffer.trim()) this.handleLine(run, buffer);
      run.exitCode = code;
      run.endedAt = this.now().toISOString();
      resolve(this.settle(run, code));
    };
    const child = spawn(this.launcher.command, [...this.launcher.prefixArgs, ...this.buildArgs(request)], {
      cwd: request.cwd,
      env: this.childEnv(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });
    run.child = child;
    const timer = setTimeout(() => {
      run.timedOut = true;
      killTree(child);
    }, request.timeoutMs);
    this.emit(run, "started", { provider: this.id, taskId: request.taskId });
    child.on("error", (err: NodeJS.ErrnoException) => {
      run.spawnError = err.code ?? "spawn_error";
      finalize(null);
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(request.prompt);
    child.stdout.on("data", (d: Buffer) => {
      seen += d.length;
      if (seen > maxOutput) {
        if (!run.outputLimit) {
          run.outputLimit = true;
          killTree(child);
        }
        return;
      }
      const text = d.toString("utf8");
      run.tail = tail(run.tail + redactString(text));
      buffer += text;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        this.handleLine(run, buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
      }
      if (buffer.length > MAX_LINE) {
        run.malformed++;
        buffer = "";
      }
    });
    child.stderr.on("data", (d: Buffer) => {
      run.stderrTail = tail(run.stderrTail + redactString(d.toString("utf8")));
    });
    child.on("close", (code) => finalize(code));
  }

  private handleLine(run: Run, raw: string): void {
    const line = raw.trim();
    if (!line) return;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      run.malformed++;
      return;
    }
    const parsed = this.parseLine(value, run.ctx);
    if (!parsed) return;
    for (const e of parsed.events) this.emit(run, e.type, e.data);
    if (parsed.usage) run.usage = parsed.usage;
    if (parsed.final) run.final = parsed.final;
  }

  private settle(run: Run, code: number | null): ExecutionResult {
    const base = { executionId: run.id, exitCode: code, usage: run.usage, eventCount: run.events.length };
    const fail = (status: "failed" | "cancelled" | "timed_out", errCode: ErrorCode, message: string, summary = ""): ExecutionResult => {
      run.status = status;
      this.emit(run, "error", { code: errCode, message });
      return { ...base, status, summary, error: { code: errCode, message: redactString(message) } };
    };
    if (run.cancelled) return fail("cancelled", "cancelled", "execution was cancelled");
    if (run.timedOut) return fail("timed_out", "timeout", "execution exceeded its time limit");
    if (run.spawnError) return fail("failed", "unavailable", `could not start the executable (${run.spawnError})`);
    if (run.outputLimit) return fail("failed", "output_limit", "output exceeded the size limit");
    if (code === 0 && run.final?.ok) {
      run.status = "succeeded";
      this.emit(run, "completed", { exitCode: 0 });
      const ok: ExecutionResult = { ...base, status: "succeeded", summary: redactString(run.final.summary).slice(0, 2000) };
      // Tam yanıt yalnız bellekte ve SAYILAMAZ alan olarak taşınır: JSON.stringify/yayılım (spread) ile kanıta ya da denetime sızamaz.
      Object.defineProperty(ok, "fullText", { value: run.final.summary.slice(0, 65536), enumerable: false });
      return ok;
    }
    if (code === 0 && !run.final) return fail("failed", "malformed_output", `no final result in output (${run.malformed} unreadable line(s))`);
    const text = `${run.final?.errorText ?? ""}\n${run.stderrTail}\n${run.tail}`;
    return fail("failed", this.classifyFailure(text), `process ended with exit code ${code}`, redactString(run.final?.errorText ?? "").slice(0, 500));
  }

  async *streamEvents(executionId: string): AsyncIterable<ProviderEvent> {
    const run = this.requireRun(executionId);
    let index = 0;
    for (;;) {
      while (index < run.events.length) yield run.events[index++] as ProviderEvent;
      if (run.status !== "running") return;
      await new Promise<void>((resolve) => {
        const wake = () => {
          run.listeners.delete(wake);
          resolve();
        };
        run.listeners.add(wake);
        if (index < run.events.length || run.status !== "running") wake();
      });
    }
  }

  getStatus(executionId: string): ExecutionStatus {
    return this.requireRun(executionId).status;
  }

  async cancel(executionId: string): Promise<void> {
    const run = this.requireRun(executionId);
    if (run.status !== "running") return;
    run.cancelled = true;
    if (run.child) killTree(run.child);
    await run.result;
  }

  collectEvidence(executionId: string): Evidence {
    const run = this.requireRun(executionId);
    return {
      executionId,
      status: run.status,
      exitCode: run.exitCode,
      outputTail: run.tail || run.stderrTail,
      eventCount: run.events.length,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
    };
  }

  getUsage(executionId: string): Usage {
    return this.requireRun(executionId).usage;
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.runs.values()].filter((r) => r.status === "running").map((r) => this.cancel(r.id)));
    this.runs.clear();
  }

  private requireRun(id: string): Run {
    const run = this.runs.get(id);
    if (!run) throw new Error(`unknown execution ${id}`);
    return run;
  }
}
