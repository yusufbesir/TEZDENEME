import { join } from "node:path";
import { CliAdapter } from "./cli-adapter.ts";
import type { CliAdapterOptions, ParsedLine } from "./cli-adapter.ts";
import { CapabilityError } from "./contract.ts";
import type { ConnectionReport, ErrorCode, ExecutionHandle, ExecutionRequest, SandboxPolicy, Usage } from "./contract.ts";

export const CLAUDE_EXE = "D:\\Programlar\\npm-global\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe";
export const NODE_DIR = "D:\\n8n\\nodejs";

const REAL_RUN_AT = "2026-10-21T17:32:00.000Z";
const REAL_RUN_NOTE =
  "real run 2026-10-21 (claude-code 2.1.306, claude.ai subscription, --safe-mode, plan mode, prompt 'pong'): system/init, assistant, rate_limit_event, result(usage, total_cost_usd, modelUsage) observed; failure (unknown model, exit 1, 404 model_not_found), timeout (1.5 s limit, process killed) and cancel were also observed for real (2026-10-21); a multi-step workflow trial (plan, implement in acceptEdits mode with a write scope, repair round) also ran for real (2026-10-21): the file edit happened and git diff showed it; individual tool_use event shapes and mid-answer cancel NOT verified against real output";
const FIXTURE_NOTE = "stream-json line shape follows public documentation; NOT verified against real output (this CLI is not logged in)";

function obj(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Subscription route only: no API key environment is forwarded (see child-env.ts), and bypassPermissions is never used.
export class ClaudeCodeAdapter extends CliAdapter {
  readonly id = "claude-code";
  readonly displayName = "Claude Code CLI";
  readonly routeKind = "subscription" as const;

  constructor(opts: Partial<CliAdapterOptions> = {}) {
    super({ launcher: { command: CLAUDE_EXE, prefixArgs: [] }, extraPathDirs: [NODE_DIR], ...opts });
    this.setCapability("describeCapabilities", "verified", "local, pure function");
    this.setCapability("validateConfiguration", "verified", "local file check");
    this.setCapability("testConnection", "unverified", "not run yet");
    this.applyRealRunEvidence();
    this.setCapability("cancel", "partial", "real run 2026-10-21 (claude-code 2.1.306): cancelling a started execution ends the process with status cancelled; timeout likewise ends with timed_out; mid-answer cancel with partial output not observed", REAL_RUN_AT);
    this.setCapability("getStatus", "verified", "local state");
    this.setCapability("dispose", "verified", "local state");
  }

  // File tools stay inside the working directory because permission prompts are off (anything outside is denied).
  // A shell would run unconfined at OS level, and no OS-level confinement has been verified here, so Bash is refused.
  checkSandbox(sandbox: SandboxPolicy): string | null {
    return sandbox.allowedTools.includes("Bash") ? "shell access is refused: no verified OS-level confinement for Claude Code's Bash tool" : null;
  }

  override execute(request: ExecutionRequest): ExecutionHandle {
    const why = this.checkSandbox(request.sandbox);
    if (why) throw new CapabilityError(this.id, "execute", "partial", why);
    return super.execute(request);
  }

  private applyRealRunEvidence(): void {
    for (const op of ["execute", "streamEvents", "collectEvidence", "getUsage"] as const) this.setCapability(op, "partial", REAL_RUN_NOTE, REAL_RUN_AT);
  }

  protected buildArgs(request: ExecutionRequest): string[] {
    const mode = request.sandbox.permission === "workspace_write" ? "acceptEdits" : "plan";
    const args = [
      "-p",
      "--output-format", "stream-json",
      "--verbose",
      "--no-session-persistence",
      // Without this the CLI loads every plugin, skill, hook and MCP server of the user profile into the worker (measured: ~558k tokens for one word).
      "--safe-mode",
      "--permission-mode", mode,
      "--permission-prompts", "none",
      "--tools", request.sandbox.allowedTools.join(","),
      "--allowedTools", request.sandbox.allowedTools.join(","),
    ];
    if (request.model) args.push("--model", request.model);
    return args;
  }

  protected parseLine(value: unknown): ParsedLine | null {
    const o = obj(value);
    if (!o || typeof o.type !== "string") return null;
    // Real output has many "system" lines (hooks, status); only init marks the start of the session.
    if (o.type === "system") return o.subtype === "init" ? { events: [{ type: "started", data: { subtype: o.subtype, model: o.model } }] } : null;
    if (o.type === "assistant" || o.type === "user") {
      const content = obj(o.message)?.content;
      const events: ParsedLine["events"] = [];
      for (const block of Array.isArray(content) ? content : []) {
        const b = obj(block);
        if (!b) continue;
        if (b.type === "text" && typeof b.text === "string") events.push({ type: "message", data: { role: o.type, text: b.text } });
        else if (b.type === "tool_use") events.push({ type: "tool_use", data: { tool: b.name, input: b.input } });
        else if (b.type === "tool_result") events.push({ type: "tool_result", data: { isError: b.is_error === true } });
      }
      return { events };
    }
    if (o.type === "result") {
      const u = obj(o.usage);
      const modelUsage = obj(o.modelUsage);
      const firstModel = modelUsage ? obj(Object.values(modelUsage)[0]) : undefined;
      // Prompt size = fresh input + cache writes + cache reads (the CLI reports them separately).
      const promptParts = [num(u?.input_tokens), num(u?.cache_creation_input_tokens), num(u?.cache_read_input_tokens)];
      const usage: Usage = {
        inputTokens: promptParts.some((x) => x !== null) ? promptParts.reduce<number>((a, b) => a + (b ?? 0), 0) : null,
        outputTokens: num(u?.output_tokens),
        costUsd: num(o.total_cost_usd),
        costBasis: typeof firstModel?.costBasis === "string" && (firstModel.costBasis === "list" || firstModel.costBasis === "billed") ? firstModel.costBasis : null,
        source: u || num(o.total_cost_usd) !== null ? "reported" : "unknown",
      };
      const ok = o.is_error !== true && (o.subtype === undefined || o.subtype === "success");
      const text = typeof o.result === "string" ? o.result : "";
      return {
        events: [{ type: "usage", data: { ...usage } }],
        usage,
        final: ok ? { ok: true, summary: text } : { ok: false, summary: "", errorText: text || String(o.subtype ?? "error") },
      };
    }
    return null;
  }

  protected classifyFailure(text: string): ErrorCode {
    if (/not logged in|please run \/?login|invalid api key|authentication|unauthorized|\b401\b|oauth/i.test(text)) return "auth_required";
    if (/rate.?limit|\b429\b|usage limit|too many requests/i.test(text)) return "rate_limited";
    if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|network|fetch failed/i.test(text)) return "network";
    return "process_failed";
  }

  async testConnection(): Promise<ConnectionReport> {
    const checkedAt = this.now().toISOString();
    const version = await this.runQuick(["--version"]);
    if (version.error || version.code !== 0) {
      this.setCapability("testConnection", "unavailable", `claude --version failed (${version.error ?? `exit ${version.code}`})`);
      return { reachable: false, authenticated: null, version: null, detail: "executable could not be run", checkedAt };
    }
    const v = /(\d+\.\d+\.\d+)/.exec(version.stdout)?.[1] ?? null;
    const status = await this.runQuick(["auth", "status", "--json"]);
    let loggedIn: boolean | null = null;
    try {
      const parsed = obj(JSON.parse(status.stdout));
      if (parsed && typeof parsed.loggedIn === "boolean") loggedIn = parsed.loggedIn;
    } catch {
      loggedIn = null;
    }
    this.setCapability("testConnection", "verified", `claude --version and auth status ran at ${checkedAt}`);
    if (loggedIn === true) this.applyRealRunEvidence();
    else for (const op of ["execute", "streamEvents", "collectEvidence", "getUsage"] as const) this.setCapability(op, "unverified", `not logged in now; last real run evidence: ${REAL_RUN_NOTE}`);
    return {
      reachable: true,
      authenticated: loggedIn,
      version: v,
      detail: loggedIn === true ? "logged in" : loggedIn === false ? "not logged in" : "login state could not be read",
      checkedAt,
    };
  }
}

export function defaultClaudeTempDir(root: string): string {
  return join(root, "data", "provider-tmp");
}
