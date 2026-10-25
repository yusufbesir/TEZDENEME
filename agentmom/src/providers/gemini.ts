import { CliAdapter } from "./cli-adapter.ts";
import type { CliAdapterOptions, ParsedLine } from "./cli-adapter.ts";
import { CapabilityError } from "./contract.ts";
import type { ConnectionReport, ErrorCode, ExecutionHandle, ExecutionRequest, SandboxPolicy, Usage } from "./contract.ts";

export const NODE_EXE = "D:\\n8n\\nodejs\\node.exe";
export const GEMINI_ENTRY = "D:\\n8n\\nodejs\\node_modules\\@google\\gemini-cli\\bundle\\gemini.js";
const NODE_DIR = "D:\\n8n\\nodejs";

const UNVERIFIED_NOTE =
  "stream-json line shape follows public documentation; NOT verified against real output (gemini has no login-status command and no model call was made)";

function obj(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Execution is OFF by default. Plan mode does not prove that tools, workspace settings, extensions or MCP servers from the working
// directory are confined, and no real call has been made. Tests (fixture) opt in with allowUnverifiedExecution.
export interface GeminiOptions extends Partial<CliAdapterOptions> {
  allowUnverifiedExecution?: boolean;
}

export class GeminiAdapter extends CliAdapter {
  readonly id = "gemini";
  readonly displayName = "Gemini CLI";
  readonly routeKind = "subscription" as const;

  private readonly allowExecution: boolean;

  constructor(opts: GeminiOptions = {}) {
    const { allowUnverifiedExecution, ...rest } = opts;
    super({ launcher: { command: NODE_EXE, prefixArgs: [GEMINI_ENTRY] }, extraPathDirs: [NODE_DIR], ...rest });
    this.allowExecution = allowUnverifiedExecution === true;
    this.setCapability("describeCapabilities", "verified", "local, pure function");
    this.setCapability("validateConfiguration", "verified", "local file check");
    this.setCapability("testConnection", "unverified", "not run yet");
    for (const op of ["execute", "streamEvents", "cancel", "collectEvidence", "getUsage"] as const) {
      if (this.allowExecution) this.setCapability(op, "unverified", `fixture-tested only: ${UNVERIFIED_NOTE}`);
      else this.setCapability(op, "unavailable", "refused: confinement is not verified; real attempt 2026-10-21 after a successful Google login: Google rejects this client for personal accounts (IneligibleTierError UNSUPPORTED_CLIENT, migrate to Antigravity)");
    }
    this.setCapability("getStatus", "verified", "local state");
    this.setCapability("dispose", "verified", "local state");
  }

  checkSandbox(sandbox: SandboxPolicy): string | null {
    if (!this.allowExecution) return "gemini execution is disabled until tool, extension and MCP confinement is verified against a real run";
    if (sandbox.permission !== "read_only") return "gemini writable sandboxes are not verified; only read-only plan mode is allowed";
    const extra = sandbox.allowedTools.filter((t) => !["Read", "Glob", "Grep"].includes(t));
    return extra.length === 0 ? null : `gemini cannot express these tools: ${extra.join(", ")}`;
  }

  override execute(request: ExecutionRequest): ExecutionHandle {
    const why = this.checkSandbox(request.sandbox);
    if (why) throw new CapabilityError(this.id, "execute", "partial", why);
    return super.execute(request);
  }

  protected buildArgs(request: ExecutionRequest): string[] {
    const args = ["-p", request.prompt, "-o", "stream-json", "--approval-mode", "plan", "-e", "none"];
    if (request.model) args.push("-m", request.model);
    return args;
  }

  protected parseLine(value: unknown): ParsedLine | null {
    const o = obj(value);
    if (!o || typeof o.type !== "string") return null;
    if (o.type === "init") return { events: [{ type: "started", data: { model: o.model } }] };
    if (o.type === "message") {
      const text = typeof o.content === "string" ? o.content : "";
      return { events: [{ type: "message", data: { role: o.role, text } }] };
    }
    if (o.type === "tool_use") return { events: [{ type: "tool_use", data: { tool: o.tool_name, input: o.parameters } }] };
    if (o.type === "tool_result") return { events: [{ type: "tool_result", data: { status: o.status } }] };
    if (o.type === "error") return { events: [{ type: "error", data: { severity: o.severity, message: o.message } }] };
    if (o.type === "result") {
      const stats = obj(o.stats);
      const usage: Usage = {
        inputTokens: num(stats?.input_tokens),
        outputTokens: num(stats?.output_tokens),
        costUsd: null,
        source: stats ? "reported" : "unknown",
      };
      const ok = o.status === "success";
      const message = String(obj(o.error)?.message ?? o.status ?? "error");
      return { events: [{ type: "usage", data: { ...usage } }], usage, final: ok ? { ok: true, summary: "" } : { ok: false, summary: "", errorText: message } };
    }
    return null;
  }

  protected classifyFailure(text: string): ErrorCode {
    // Real (2026-10-21): Google rejects this CLI for personal accounts after a SUCCESSFUL login (IneligibleTierError / UNSUPPORTED_CLIENT): the service side, not a credentials problem.
    if (/IneligibleTierError|UNSUPPORTED_CLIENT|no longer supported/i.test(text)) return "unavailable";
    if (/Please set an Auth method|GOOGLE_GENAI_USE_GCA|not logged in|login|unauthenticated|unauthorized|\b401\b|\b403\b|api key|authentication/i.test(text)) return "auth_required";
    if (/rate.?limit|\b429\b|quota|resource exhausted|too many requests/i.test(text)) return "rate_limited";
    if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|network|fetch failed/i.test(text)) return "network";
    return "process_failed";
  }

  async testConnection(): Promise<ConnectionReport> {
    const checkedAt = this.now().toISOString();
    const version = await this.runQuick(["--version"]);
    if (version.error || version.code !== 0) {
      this.setCapability("testConnection", "unavailable", `gemini --version failed (${version.error ?? `exit ${version.code}`})`);
      return { reachable: false, authenticated: null, version: null, detail: "executable could not be run", checkedAt };
    }
    const v = /(\d+\.\d+\.\d+)/.exec(version.stdout)?.[1] ?? null;
    this.setCapability("testConnection", "partial", `gemini --version ran at ${checkedAt}; authentication cannot be checked without a model call`);
    return { reachable: true, authenticated: null, version: v, detail: "reachable; authentication unknown (no status command, no model call made)", checkedAt };
  }
}
