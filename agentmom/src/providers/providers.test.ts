import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import type { AutonomyContract } from "../core/policy/types.ts";
import { ClaudeCodeAdapter } from "./claude-code.ts";
import { CodexAdapter } from "./codex.ts";
import { GeminiAdapter } from "./gemini.ts";
import { buildChildEnv } from "./child-env.ts";
import { CapabilityError, OPERATIONS, assertSupported } from "./contract.ts";
import type { ExecutionRequest, ProviderAdapter, ProviderEvent } from "./contract.ts";
import { sandboxFromContract } from "./policy-map.ts";
import { ProviderRegistry } from "./registry.ts";

const FIXTURE = join(import.meta.dirname, "testing", "fake-cli.mjs");
const FAKE_KEY = "sk-" + "Qq1Ww2Ee3Rr4Tt5Yy6Uu7Ii8";
const FAKE_GH = "ghp_" + "abcdefghijklmnopqrstuvwxyz0123456789";

type Kind = "claude" | "codex" | "gemini";
const KINDS: Kind[] = ["claude", "codex", "gemini"];

function make(kind: Kind, over: { command?: string; envBase?: NodeJS.ProcessEnv } = {}) {
  const opts = {
    launcher: { command: over.command ?? process.execPath, prefixArgs: [FIXTURE, kind] },
    ...(over.envBase ? { envBase: over.envBase } : {}),
  };
  return kind === "claude" ? new ClaudeCodeAdapter(opts) : kind === "codex" ? new CodexAdapter(opts) : new GeminiAdapter({ ...opts, allowUnverifiedExecution: true });
}

function request(mode: string, over: Partial<ExecutionRequest> = {}, extra = ""): ExecutionRequest {
  return {
    taskId: "t1",
    prompt: extra ? `${mode}\n${extra}` : mode,
    cwd: mkTmp("agentmom-prov-"),
    sandbox: { permission: "read_only", allowedTools: ["Read"] },
    timeoutMs: 15_000,
    ...over,
  };
}

async function collect(adapter: ProviderAdapter, id: string): Promise<ProviderEvent[]> {
  const out: ProviderEvent[] = [];
  for await (const e of adapter.streamEvents(id)) out.push(e);
  return out;
}

for (const kind of KINDS) {
  test(`[${kind}] success: ordered events, result, evidence, usage`, async () => {
    const a = make(kind);
    const h = a.execute(request("ok"));
    const events = await collect(a, h.executionId);
    const result = await h.result;
    assert.equal(result.status, "succeeded");
    assert.equal(result.exitCode, 0);
    assert.equal(events[0]?.type, "started");
    assert.ok(events.some((e) => e.type === "message"));
    assert.equal(events.at(-1)?.type, "completed");
    assert.equal(a.getStatus(h.executionId), "succeeded");
    const ev = a.collectEvidence(h.executionId);
    assert.equal(ev.exitCode, 0);
    assert.equal(ev.eventCount, events.length);
    const usage = a.getUsage(h.executionId);
    assert.equal(usage.source, "reported");
    assert.equal(usage.inputTokens, 10);
    if (kind === "claude") assert.equal(usage.costUsd, 0.01);
    else assert.equal(usage.costUsd, null, "unreported cost must be null, not zero");
  });

  test(`[${kind}] a late subscriber still receives all buffered events`, async () => {
    const a = make(kind);
    const h = a.execute(request("ok"));
    await h.result;
    const events = await collect(a, h.executionId);
    assert.equal(events[0]?.type, "started");
    assert.equal(events.at(-1)?.type, "completed");
  });

  test(`[${kind}] invalid credentials -> auth_required`, async () => {
    const r = await make(kind).execute(request("auth")).result;
    assert.equal(r.status, "failed");
    assert.equal(r.error?.code, "auth_required");
  });

  test(`[${kind}] rate limit -> rate_limited`, async () => {
    const r = await make(kind).execute(request("ratelimit")).result;
    assert.equal(r.error?.code, "rate_limited");
  });

  test(`[${kind}] network failure -> network`, async () => {
    const r = await make(kind).execute(request("network")).result;
    assert.equal(r.status, "failed");
    assert.equal(r.error?.code, "network");
  });

  test(`[${kind}] timeout kills the process -> timed_out`, async () => {
    const a = make(kind);
    const t0 = Date.now();
    const r = await a.execute(request("hang", { timeoutMs: 600 })).result;
    assert.equal(r.status, "timed_out");
    assert.equal(r.error?.code, "timeout");
    assert.ok(Date.now() - t0 < 10_000, "process was not left running for its full sleep");
  });

  test(`[${kind}] cancel mid-run -> cancelled`, async () => {
    const a = make(kind);
    const h = a.execute(request("hang"));
    await new Promise((r) => setTimeout(r, 400));
    assert.equal(a.getStatus(h.executionId), "running");
    await a.cancel(h.executionId);
    const r = await h.result;
    assert.equal(r.status, "cancelled");
    assert.equal(r.error?.code, "cancelled");
    assert.equal(a.getStatus(h.executionId), "cancelled");
  });

  test(`[${kind}] malformed output without a final result fails; garbage lines around a valid result are tolerated`, async () => {
    const bad = await make(kind).execute(request("garbage")).result;
    assert.equal(bad.status, "failed");
    assert.equal(bad.error?.code, "malformed_output");
    const ok = await make(kind).execute(request("partial")).result;
    assert.equal(ok.status, "succeeded");
  });

  test(`[${kind}] runaway output hits the size limit`, async () => {
    const r = await make(kind).execute(request("flood", { maxOutputBytes: 200_000, timeoutMs: 15_000 })).result;
    assert.equal(r.status, "failed");
    assert.equal(r.error?.code, "output_limit");
  });

  test(`[${kind}] nonzero exit without output -> process_failed`, async () => {
    const r = await make(kind).execute(request("nonzero")).result;
    assert.equal(r.exitCode, 3);
    assert.equal(r.error?.code, "process_failed");
  });

  test(`[${kind}] missing executable -> unavailable, config invalid, connection unreachable`, async () => {
    const a = make(kind, { command: "D:\\does\\not\\exist.exe" });
    assert.equal(a.validateConfiguration().ok, false);
    const r = await a.execute(request("ok")).result;
    assert.equal(r.status, "failed");
    assert.equal(r.error?.code, "unavailable");
    const c = await a.testConnection();
    assert.equal(c.reachable, false);
    assert.equal(c.authenticated, null);
    assert.equal(a.describeCapabilities().find((x) => x.operation === "testConnection")?.status, "unavailable");
  });

  test(`[${kind}] secrets are redacted in events, evidence tail and summary`, async () => {
    const a = make(kind);
    const h = a.execute(request("secret"));
    const events = await collect(a, h.executionId);
    const r = await h.result;
    const all = JSON.stringify(events) + JSON.stringify(a.collectEvidence(h.executionId)) + JSON.stringify(r);
    assert.ok(!all.includes(FAKE_KEY));
    assert.ok(!all.includes(FAKE_GH));
    assert.ok(!all.includes("hunter2hunter2"));
  });

  test(`[${kind}] API keys in the parent environment are never passed to the child`, async () => {
    const base = {
      ...process.env,
      ANTHROPIC_API_KEY: "should-not-leak-1",
      OPENAI_API_KEY: "should-not-leak-2",
      GEMINI_API_KEY: "should-not-leak-3",
      GOOGLE_API_KEY: "should-not-leak-4",
      GITHUB_TOKEN: "should-not-leak-5",
      AWS_SECRET_ACCESS_KEY: "should-not-leak-6",
    };
    const a = make(kind, { envBase: base });
    const h = a.execute(request("args"));
    const events = await collect(a, h.executionId);
    await h.result;
    const text = JSON.stringify(events);
    for (const name of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "GITHUB_TOKEN", "AWS_SECRET_ACCESS_KEY"]) {
      assert.ok(!text.includes(name), `${name} leaked into the child environment`);
    }
    assert.ok(!text.includes("should-not-leak"));
  });

  test(`[${kind}] permission flags come from the sandbox policy and never include a bypass`, async () => {
    const a = make(kind);
    if (kind === "gemini") {
      const g = a.execute(request("args", { sandbox: { permission: "read_only", allowedTools: ["Read"] } }));
      const text = JSON.stringify(await collect(a, g.executionId));
      assert.ok(text.includes("plan") && !/yolo|auto_edit|-y\b/.test(text));
      assert.throws(() => a.execute(request("args", { sandbox: { permission: "workspace_write", allowedTools: ["Edit", "Bash"] } })), CapabilityError);
      return;
    }
    const ro = a.execute(request("args", { sandbox: { permission: "read_only", allowedTools: ["Read", "Grep"] } }));
    const roEvents = JSON.stringify(await collect(a, ro.executionId));
    const rw = a.execute(request("args", { sandbox: { permission: "workspace_write", allowedTools: kind === "codex" ? ["Read", "Edit", "Bash"] : ["Read", "Edit"] } }));
    const rwEvents = JSON.stringify(await collect(a, rw.executionId));
    for (const text of [roEvents, rwEvents]) {
      assert.ok(!/bypass|dangerously|danger-full-access/i.test(text), "no bypass flag may be passed");
    }
    if (kind === "claude") {
      assert.ok(roEvents.includes("plan") && !roEvents.includes("acceptEdits"));
      assert.ok(rwEvents.includes("acceptEdits"));
      assert.ok(roEvents.includes("Read,Grep") && !roEvents.includes("Edit"));
      assert.ok(roEvents.includes("--no-session-persistence") && roEvents.includes("none"));
    } else {
      assert.ok(roEvents.includes("read-only") && !roEvents.includes("workspace-write"));
      assert.ok(rwEvents.includes("workspace-write"));
      assert.ok(roEvents.includes("--ephemeral"));
    }
  });

  test(`[${kind}] dispose cancels running executions`, async () => {
    const a = make(kind);
    const h = a.execute(request("hang"));
    await new Promise((r) => setTimeout(r, 300));
    await a.dispose();
    assert.equal((await h.result).status, "cancelled");
  });
}

test("child env is an allowlist: keys and tokens are dropped, PATH gets the extra dirs first, TEMP is redirected", () => {
  const env = buildChildEnv({
    base: { Path: "C:\\x", SystemRoot: "C:\\Windows", ANTHROPIC_API_KEY: "a", openai_api_key: "b", MY_SECRET: "c", USERPROFILE: "C:\\u" },
    extraPathDirs: ["D:\\n8n\\nodejs"],
    tempDir: "D:\\tmp",
  });
  assert.equal(env.PATH, "D:\\n8n\\nodejs;C:\\x");
  assert.equal(env.SystemRoot, "C:\\Windows");
  assert.equal(env.TEMP, "D:\\tmp");
  assert.deepEqual(Object.keys(env).filter((k) => /key|secret|token/i.test(k)), []);
});

test("every contract operation is declared with a status, an evidence source and a date", () => {
  for (const kind of KINDS) {
    const decl = make(kind).describeCapabilities();
    assert.deepEqual(decl.map((d) => d.operation), [...OPERATIONS]);
    for (const d of decl) {
      assert.ok(d.evidenceSource.length > 0 && !Number.isNaN(Date.parse(d.checkedAt)), d.operation);
    }
  }
});

test("capability declarations match the evidence: claude and codex partial from one real run each, gemini disabled", () => {
  const claude = make("claude").describeCapabilities().find((d) => d.operation === "execute");
  assert.equal(claude?.status, "partial");
  assert.match(claude?.evidenceSource ?? "", /real run 2026-10-21/);
  assert.match(claude?.evidenceSource ?? "", /NOT verified/);
  assert.equal(make("claude").describeCapabilities().find((d) => d.operation === "cancel")?.status, "partial", "cancel and timeout were observed for real on 2026-10-21");
  const codex = make("codex").describeCapabilities().find((d) => d.operation === "execute");
  assert.equal(codex?.status, "partial");
  assert.match(codex?.evidenceSource ?? "", /real run 2026-10-21/);
  assert.match(codex?.evidenceSource ?? "", /NOT verified/);
  assert.equal(codex?.checkedAt, "2026-10-21T16:02:00.000Z");
});

test("a recorded REAL codex run (2026-10-21) replays through the adapter: success, usage, warning item as error event", async () => {
  const a = make("codex");
  const h = a.execute(request("replay", {}, join(import.meta.dirname, "testing", "codex-real-run.jsonl")));
  const events = await collect(a, h.executionId);
  const r = await h.result;
  assert.equal(r.status, "succeeded");
  assert.equal(r.summary, "pong");
  assert.deepEqual(a.getUsage(h.executionId), { inputTokens: 23407, outputTokens: 5, costUsd: null, source: "reported" });
  assert.ok(events.some((e) => e.type === "error" && e.data.warning === true));
  assert.ok(events.some((e) => e.type === "message" && e.data.text === "pong"));
});

test("an operation declared unsupported fails with CapabilityError, never a fake success", () => {
  const a = make("claude");
  const wrapped: ProviderAdapter = Object.assign(Object.create(a) as ProviderAdapter, {
    describeCapabilities: () => a.describeCapabilities().map((d) => (d.operation === "cancel" ? { ...d, status: "unsupported" as const } : d)),
  });
  assert.throws(() => assertSupported(wrapped, "cancel"), CapabilityError);
  assert.doesNotThrow(() => assertSupported(wrapped, "execute"));
  try {
    assertSupported(wrapped, "cancel");
  } catch (err) {
    assert.ok(err instanceof CapabilityError);
    assert.equal(err.operation, "cancel");
    assert.equal(err.code, "capability_unsupported");
  }
});

test("registry persists providers and capabilities, and refuses unsupported operations", () => {
  const db = openDb(":memory:");
  migrate(db);
  const registry = new ProviderRegistry(db);
  const a = make("claude");
  registry.register(a);
  assert.throws(() => registry.register(a), /already registered/);
  const [stored] = registry.list();
  assert.equal(stored?.id, "claude-code");
  assert.equal(stored?.routeKind, "subscription");
  assert.equal(stored?.capabilities.length, OPERATIONS.length);
  assert.ok(stored?.capabilities.every((c) => ["verified", "partial", "unverified", "unsupported", "unavailable"].includes(c.status)));
  assert.equal(registry.forOperation("claude-code", "execute").id, "claude-code");
  assert.throws(() => registry.require("nope"), /not registered/);
});

test("registry reflects capability changes after a connection test (missing executable -> unavailable)", async () => {
  const db = openDb(":memory:");
  migrate(db);
  const registry = new ProviderRegistry(db);
  const a = make("codex", { command: "D:\\does\\not\\exist.exe" });
  registry.register(a);
  await a.testConnection();
  registry.refresh("codex");
  const cap = registry.list()[0]?.capabilities.find((c) => c.operation === "testConnection");
  assert.equal(cap?.status, "unavailable");
});

test("sandbox is derived from the contract: nothing unapproved is granted", () => {
  const contract: AutonomyContract = {
    id: "c",
    allowedActions: ["file.read", "file.write", "shell.exec"],
    allowedDirs: [],
    allowedProviders: [],
    trustedRepos: [],
    budget: { maxUsd: 0, spentUsd: 0 },
    expiresAt: "2099-01-01T00:00:00Z",
    maxRuntimeMs: 1000,
    approvalRequiredActions: ["file.write", "shell.exec"],
    paidRoute: "none",
  };
  assert.deepEqual(sandboxFromContract(contract, false), { permission: "read_only", allowedTools: ["Read", "Glob", "Grep"] });
  assert.deepEqual(sandboxFromContract(contract, true).allowedTools, ["Read", "Glob", "Grep", "Edit", "Write", "Bash"]);
  assert.equal(sandboxFromContract({ ...contract, allowedActions: ["file.read"] }, true).permission, "read_only");
  assert.equal(sandboxFromContract({ ...contract, approvalRequiredActions: [] }, false).permission, "workspace_write");
});

test("a shell is never granted without write access (Bash implies write)", () => {
  const base: AutonomyContract = {
    id: "c",
    allowedActions: ["file.read", "shell.exec"],
    allowedDirs: [],
    allowedProviders: [],
    trustedRepos: [],
    budget: { maxUsd: 0, spentUsd: 0 },
    expiresAt: "2099-01-01T00:00:00Z",
    maxRuntimeMs: 1000,
    approvalRequiredActions: [],
    paidRoute: "none",
  };
  assert.deepEqual(sandboxFromContract(base, true), { permission: "read_only", allowedTools: ["Read", "Glob", "Grep"] });
  assert.ok(sandboxFromContract({ ...base, allowedActions: ["file.read", "file.write", "shell.exec"] }, true).allowedTools.includes("Bash"));
});

test("codex refuses sandboxes it cannot enforce instead of silently widening them", () => {
  const a = new CodexAdapter({ launcher: { command: process.execPath, prefixArgs: [FIXTURE, "codex"] } });
  assert.equal(a.checkSandbox({ permission: "read_only", allowedTools: ["Read", "Glob", "Grep"] }), null);
  assert.match(a.checkSandbox({ permission: "read_only", allowedTools: ["Read", "WebFetch"] }) ?? "", /cannot express/);
  assert.match(a.checkSandbox({ permission: "workspace_write", allowedTools: ["Read", "Edit", "Write"] }) ?? "", /shell\.exec/);
  assert.equal(a.checkSandbox({ permission: "workspace_write", allowedTools: ["Read", "Edit", "Write", "Bash"] }), null);
  assert.throws(() => a.execute(request("ok", { sandbox: { permission: "workspace_write", allowedTools: ["Edit"] } })), CapabilityError);
});

test("claude restricts the built-in tool set with --tools as well as --allowedTools", async () => {
  const a = make("claude");
  const h = a.execute(request("args", { sandbox: { permission: "read_only", allowedTools: ["Read", "Grep"] } }));
  const events = JSON.stringify(await collect(a, h.executionId));
  assert.ok(events.includes("--tools"));
});

test("claude refuses to run with a shell: no verified OS-level confinement", () => {
  const a = make("claude");
  assert.match(a.checkSandbox({ permission: "workspace_write", allowedTools: ["Read", "Edit", "Write", "Bash"] }) ?? "", /Bash tool/);
  assert.equal(a.checkSandbox({ permission: "workspace_write", allowedTools: ["Read", "Edit", "Write"] }), null);
  assert.throws(() => a.execute(request("ok", { sandbox: { permission: "workspace_write", allowedTools: ["Bash"] } })), CapabilityError);
});

test("gemini only runs read-only plan mode", () => {
  const a = make("gemini");
  assert.equal(a.checkSandbox({ permission: "read_only", allowedTools: ["Read", "Glob", "Grep"] }), null);
  assert.match(a.checkSandbox({ permission: "workspace_write", allowedTools: ["Edit"] }) ?? "", /not verified/);
});

test("gemini connection check is honest: reachable but authentication unknown", async () => {
  const a = make("gemini", { command: "D:\\does\\not\\exist.exe" });
  const c = await a.testConnection();
  assert.equal(c.reachable, false);
  assert.equal(c.authenticated, null);
});

test("gemini execution is disabled by default: unavailable capability, orchestrator guard and execute() all refuse", async () => {
  const a = new GeminiAdapter({ launcher: { command: process.execPath, prefixArgs: [FIXTURE, "gemini"] } });
  const exec = a.describeCapabilities().find((c) => c.operation === "execute");
  assert.equal(exec?.status, "unavailable");
  assert.throws(() => assertSupported(a, "execute"), CapabilityError);
  assert.throws(() => a.execute(request("ok", { sandbox: { permission: "read_only", allowedTools: ["Read"] } })), CapabilityError);
  assert.match(a.checkSandbox({ permission: "read_only", allowedTools: ["Read"] }) ?? "", /disabled/);
  const c = await a.testConnection();
  assert.equal(c.authenticated, null);
});

test("a recorded REAL claude run (2026-10-21, claude.ai subscription, --safe-mode) replays through the adapter", async () => {
  const a = make("claude");
  const file = join(import.meta.dirname, "testing", "claude-real-run.jsonl");
  const h = a.execute(request("replay", {}, file));
  const events = await collect(a, h.executionId);
  const r = await h.result;
  assert.equal(r.status, "succeeded");
  assert.equal(r.summary, "pong");
  const u = a.getUsage(h.executionId);
  assert.equal(u.source, "reported");
  assert.equal(u.costBasis, "list", "a subscription run reports a list-price equivalent, not a charge");
  assert.ok((u.inputTokens ?? 0) > 1000, "prompt size includes cache writes/reads");
  assert.deepEqual(events.map((e) => e.type), ["started", "started", "message", "usage", "completed"], "only system/init counts as a start; rate_limit_event is ignored");
});

test("the REAL gemini stderr from a not-logged-in CLI (exit 41) is classified auth_required", async () => {
  const a = make("gemini");
  const file = join(import.meta.dirname, "testing", "gemini-real-auth-error.txt");
  const r = await a.execute(request("replay-stderr", { sandbox: { permission: "read_only", allowedTools: ["Read"] } }, `${file}\n41`)).result;
  assert.equal(r.status, "failed");
  assert.equal(r.exitCode, 41);
  assert.equal(r.error?.code, "auth_required");
});

test("the REAL gemini error after a successful login (client retired for personal accounts) is classified unavailable, not auth_required", async () => {
  const a = make("gemini");
  const file = join(import.meta.dirname, "testing", "gemini-real-ineligible.txt");
  const r = await a.execute(request("replay-stderr", { sandbox: { permission: "read_only", allowedTools: ["Read"] } }, `${file}\n55`)).result;
  assert.equal(r.status, "failed");
  assert.equal(r.exitCode, 55);
  assert.equal(r.error?.code, "unavailable");
});

test("the REAL claude failure for an unknown model (2026-10-21: exit 1, 404 model_not_found) is a failed run with zero usage and the CLI's own message", async () => {
  const a = make("claude");
  const file = join(import.meta.dirname, "testing", "claude-real-badmodel.jsonl");
  const h = a.execute(request("replay", {}, file));
  const events = await collect(a, h.executionId);
  const r = await h.result;
  assert.equal(r.status, "failed");
  assert.match(r.summary ?? "", /no-such-model-xyz/);
  assert.equal(a.getUsage(h.executionId).inputTokens, 0);
  assert.ok(events.some((e) => e.type === "error"));
});
