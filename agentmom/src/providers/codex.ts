import { CliAdapter } from "./cli-adapter.ts";
import type { CliAdapterOptions, ParsedLine } from "./cli-adapter.ts";
import { CapabilityError } from "./contract.ts";
import type { ConnectionReport, ErrorCode, ExecutionHandle, ExecutionRequest, SandboxPolicy, Usage } from "./contract.ts";

export const CODEX_EXE =
  "D:\\Programlar\\npm-global\\node_modules\\@openai\\codex\\node_modules\\@openai\\codex-win32-x64\\vendor\\x86_64-pc-windows-msvc\\bin\\codex.exe";
const NODE_DIR = "D:\\n8n\\nodejs";

const UNVERIFIED_NOTE = "event shape follows observed `codex exec --json` documentation; verify with a real run before relying on it";
const REAL_RUN_AT = "2026-10-21T16:02:00.000Z";
const REAL_RUN_NOTE =
  "real run 2026-10-21 (codex-cli 0.163.0, ChatGPT login, read-only sandbox, prompt 'pong'): thread.started, turn.started, item.completed(agent_message, error), turn.completed(usage) observed; two read-only independent code reviews (about 76k input tokens each) of a Claude-written diff also ran for real (2026-10-21) and returned the requested JSON verdict; failure, cancel, workspace-write and tool events NOT verified against real output";

function obj(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Subscription route (ChatGPT login) only; no API key environment is forwarded. Sessions are ephemeral.
export class CodexAdapter extends CliAdapter {
  readonly id = "codex";
  readonly displayName = "Codex CLI";
  readonly routeKind = "subscription" as const;
  // Measured 2026-10-21: even `read-only` (and an explicit profile) reads files outside the working directory on this Windows setup.
  readonly readScope = "unconfined" as const;

  constructor(opts: Partial<CliAdapterOptions> = {}) {
    super({ launcher: { command: CODEX_EXE, prefixArgs: [] }, extraPathDirs: [NODE_DIR], ...opts });
    this.setCapability("describeCapabilities", "verified", "local, pure function");
    this.setCapability("validateConfiguration", "verified", "local file check");
    this.setCapability("testConnection", "unverified", "not run yet");
    this.applyRealRunEvidence();
    this.setCapability("cancel", "unverified", `fixture-tested only: ${UNVERIFIED_NOTE}`);
    this.setCapability("getStatus", "verified", "local state");
    this.setCapability("dispose", "verified", "local state");
  }

  // Codex only offers coarse sandbox modes, not per-tool allowlists. workspace-write also lets the agent run any shell command
  // inside the workspace, so it is refused unless the contract grants Bash; read-only is allowed for the read tools only.
  // Known limit: Codex's read-only mode is not confined to the working directory for reads.
  checkSandbox(sandbox: SandboxPolicy): string | null {
    const readTools = new Set(["Read", "Glob", "Grep"]);
    if (sandbox.permission === "workspace_write") {
      return sandbox.allowedTools.includes("Bash") ? null : "codex cannot restrict a writable sandbox to file edits; the contract must also grant shell.exec for the agent";
    }
    const extra = sandbox.allowedTools.filter((t) => !readTools.has(t));
    return extra.length === 0 ? null : `codex cannot express these tools in a read-only sandbox: ${extra.join(", ")}`;
  }

  override execute(request: ExecutionRequest): ExecutionHandle {
    const why = this.checkSandbox(request.sandbox);
    if (why) throw new CapabilityError(this.id, "execute", "partial", why);
    return super.execute(request);
  }

  protected buildArgs(request: ExecutionRequest): string[] {
    const sandbox = request.sandbox.permission === "workspace_write" ? "workspace-write" : "read-only";
    const args = ["exec", "--json", "--ephemeral", "-s", sandbox, "-C", request.cwd];
    if (request.model) args.push("-m", request.model);
    return args;
  }

  protected parseLine(value: unknown, ctx: Record<string, unknown>): ParsedLine | null {
    const o = obj(value);
    if (!o || typeof o.type !== "string") return null;
    if (o.type === "thread.started") return { events: [{ type: "started", data: { threadId: o.thread_id } }] };
    if (o.type === "item.completed" || o.type === "item.started") {
      const item = obj(o.item);
      if (!item) return null;
      if (item.type === "agent_message" && typeof item.text === "string" && o.type === "item.completed") {
        ctx.lastMessage = item.text;
        return { events: [{ type: "message", data: { role: "assistant", text: item.text } }] };
      }
      if (item.type === "command_execution") {
        return { events: [{ type: o.type === "item.started" ? "tool_use" : "tool_result", data: { tool: "shell", command: item.command, exitCode: item.exit_code } }] };
      }
      if (item.type === "error" && typeof item.message === "string") {
        return { events: [{ type: "error", data: { warning: true, message: item.message } }] };
      }
      if (item.type === "file_change") return { events: [{ type: "tool_result", data: { tool: "file_change" } }] };
      return null;
    }
    if (o.type === "turn.completed") {
      const u = obj(o.usage);
      const usage: Usage = {
        inputTokens: num(u?.input_tokens),
        outputTokens: num(u?.output_tokens),
        costUsd: null,
        source: u ? "reported" : "unknown",
      };
      return { events: [{ type: "usage", data: { ...usage } }], usage, final: { ok: true, summary: typeof ctx.lastMessage === "string" ? ctx.lastMessage : "" } };
    }
    if (o.type === "turn.failed" || o.type === "error") {
      const message = typeof o.message === "string" ? o.message : String(obj(o.error)?.message ?? "error");
      return { events: [{ type: "error", data: { message } }], final: { ok: false, summary: "", errorText: message } };
    }
    return null;
  }

  protected classifyFailure(text: string): ErrorCode {
    if (/not logged in|log in|login|unauthorized|\b401\b|invalid api key|authentication/i.test(text)) return "auth_required";
    if (/rate.?limit|\b429\b|usage limit|too many requests/i.test(text)) return "rate_limited";
    if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|network|connection/i.test(text)) return "network";
    return "process_failed";
  }

  async testConnection(): Promise<ConnectionReport> {
    const checkedAt = this.now().toISOString();
    const version = await this.runQuick(["--version"]);
    if (version.error || version.code !== 0) {
      this.setCapability("testConnection", "unavailable", `codex --version failed (${version.error ?? `exit ${version.code}`})`);
      return { reachable: false, authenticated: null, version: null, detail: "executable could not be run", checkedAt };
    }
    const v = /(\d+\.\d+\.\d+)/.exec(version.stdout)?.[1] ?? null;
    const status = await this.runQuick(["login", "status"]);
    const authenticated = status.code === 0 ? true : status.code === null ? null : false;
    this.setCapability("testConnection", "verified", `codex --version and login status ran at ${checkedAt}`);
    if (authenticated === true) this.applyRealRunEvidence();
    else {
      for (const op of ["execute", "streamEvents", "collectEvidence", "getUsage"] as const) {
        this.setCapability(op, "unverified", `not logged in now; last real run evidence: ${REAL_RUN_NOTE}`);
      }
    }
    return {
      reachable: true,
      authenticated,
      version: v,
      detail: authenticated === true ? "logged in" : authenticated === false ? "not logged in" : "login state could not be read",
      checkedAt,
    };
  }

  private applyRealRunEvidence(): void {
    for (const op of ["execute", "streamEvents", "collectEvidence", "getUsage"] as const) this.setCapability(op, "partial", REAL_RUN_NOTE, REAL_RUN_AT);
  }
}
