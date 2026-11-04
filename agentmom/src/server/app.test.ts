import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import type { Server } from "node:http";
import { join, resolve } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { AuditLog, MemoryAuditSink, SqliteAuditSink } from "../core/audit/audit.ts";
import { AuthRegistry } from "../core/auth/auth.ts";
import { DEFAULT_CONFIG } from "../core/config/config.ts";
import type { AgentMomConfig } from "../core/config/config.ts";
import { openDb } from "../core/db/db.ts";
import type { Db } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import type { RunOutcome } from "../orchestrator/run-task.ts";
import { ClaudeCodeAdapter } from "../providers/claude-code.ts";
import { CodexAdapter } from "../providers/codex.ts";
import { UNKNOWN_USAGE } from "../providers/contract.ts";
import type { ExecutionHandle, ExecutionRequest, ProviderAdapter, ProviderEvent } from "../providers/contract.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { TaskStore } from "../core/tasks/tasks.ts";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { ScriptedAdapter } from "../testing/scripted-adapter.ts";
import type { WorkflowOutcome } from "../workflows/engine.ts";
import { createApp } from "./app.ts";

const FAKE_KEY = "sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2";
const FIXTURE = join(import.meta.dirname, "..", "providers", "testing", "fake-cli.mjs");
const BASE = mkTmp("agentmom-srv-");
const ROOT = resolve("D:/work/proj");
const TRUSTED = mkdtempSync(join(BASE, "trusted-"));

let server: Server;
let port: number;
let db: Db;
let dbPath: string;
let mem: MemoryAuditSink;
let auth: AuthRegistry;
let agentToken: string;
let registry: ProviderRegistry;
let worktreeRoot: string;
let pending: Array<Promise<RunOutcome>> = [];
let pendingWf: Array<Promise<WorkflowOutcome>> = [];
let wfStore: WorkflowStore;
const recorded: ExecutionRequest[] = [];

function config(): AgentMomConfig {
  const c = structuredClone(DEFAULT_CONFIG);
  const k = c.policy.defaultContract;
  k.allowedActions = ["task.create", "file.read", "file.write", "provider.call", "provider.switch"];
  k.allowedDirs = [ROOT, BASE];
  k.trustedRepos = [TRUSTED];
  k.allowedProviders = ["claude", "openai", "claude-code", "codex", "extra-llm", "paid-x", "wf-planner", "wf-coder", "wf-critic"];
  k.budget = { maxUsd: 5, spentUsd: 0 };
  k.approvalRequiredActions = ["file.write"];
  k.maxRuntimeMs = 20_000;
  return c;
}

// A provider that is not a CLI at all: proves a new adapter can be registered without touching the orchestrator or policy.
class InProcessAdapter implements ProviderAdapter {
  readonly id: string;
  readonly displayName = "In-process test provider";
  readonly routeKind: "subscription" | "api_paid" | "local";
  readonly contractVersion = "1";

  constructor(id: string, routeKind: "subscription" | "api_paid" | "local") {
    this.id = id;
    this.routeKind = routeKind;
  }

  describeCapabilities() {
    return (["describeCapabilities", "validateConfiguration", "testConnection", "execute", "streamEvents", "getStatus", "cancel", "collectEvidence", "getUsage", "dispose"] as const).map((operation) => ({
      operation,
      status: "unverified" as const,
      evidenceSource: "test double",
      checkedAt: "2026-10-21T00:00:00.000Z",
    }));
  }
  validateConfiguration() {
    return { ok: true, problems: [] };
  }
  async testConnection() {
    return { reachable: true, authenticated: null, version: null, detail: "test", checkedAt: "2026-10-21T00:00:00.000Z" };
  }
  execute(request: ExecutionRequest): ExecutionHandle {
    recorded.push(request);
    writeFileSync(join(request.cwd, "extra.txt"), "from in-process provider\n");
    return {
      executionId: "x1",
      result: Promise.resolve({ executionId: "x1", status: "succeeded" as const, exitCode: 0, summary: "ok", usage: UNKNOWN_USAGE, eventCount: 1 }),
    };
  }
  async *streamEvents(): AsyncIterable<ProviderEvent> {
    yield { type: "message", ts: "2026-10-21T00:00:00.000Z", data: { text: "in-process" } };
  }
  getStatus() {
    return "succeeded" as const;
  }
  async cancel() {}
  collectEvidence() {
    return { executionId: "x1", status: "succeeded" as const, exitCode: 0, outputTail: "in-process", eventCount: 1, startedAt: "a", endedAt: "b" };
  }
  getUsage() {
    return UNKNOWN_USAGE;
  }
  async dispose() {}
}

class RecordingClaude extends ClaudeCodeAdapter {
  override execute(request: ExecutionRequest): ExecutionHandle {
    recorded.push(request);
    return super.execute(request);
  }
}

before(async () => {
  dbPath = join(BASE, "t.db");
  db = openDb(dbPath);
  migrate(db);
  mem = new MemoryAuditSink();
  const audit = new AuditLog([new SqliteAuditSink(db), mem]);
  auth = new AuthRegistry();
  agentToken = auth.issueAgentToken("test-agent");
  registry = new ProviderRegistry(db);
  const cli = { launcher: { command: process.execPath, prefixArgs: [FIXTURE, "claude"] } };
  registry.register(new RecordingClaude(cli));
  registry.register(new CodexAdapter({ launcher: { command: process.execPath, prefixArgs: [FIXTURE, "codex"] } }));
  registry.register(new InProcessAdapter("extra-llm", "local"));
  registry.register(new InProcessAdapter("paid-x", "api_paid"));
  registry.register(new ScriptedAdapter("wf-planner", () => ({ summary: "1. add the greeting file" })));
  registry.register(new ScriptedAdapter("wf-coder", () => ({ summary: "done", write: { "greeting.txt": "hello\n" } })));
  registry.register(new ScriptedAdapter("wf-critic", () => ({ summary: JSON.stringify({ approved: true, criteria: [{ id: "c1", met: true }] }) })));
  worktreeRoot = join(BASE, "worktrees");
  mkdirSync(worktreeRoot, { recursive: true });
  wfStore = new WorkflowStore(db);
  const engine = new WorkflowEngine({ tasks: new TaskStore(db), audit, registry, evidence: new EvidenceStore(db), store: wfStore, contract: config().policy.defaultContract, worktreeRoot });
  server = createApp({ db, dbPath, config: config(), audit, auth, registry, engine, workflows: wfStore, worktreeRoot, onRun: (p) => pending.push(p), onWorkflow: (p) => pendingWf.push(p) });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const addr = server.address();
  port = typeof addr === "object" && addr ? addr.port : 0;
});

after(async () => {
  await Promise.allSettled(pending);
  await new Promise<void>((ok) => server.close(() => ok()));
  db.close();
});

interface Reply {
  status: number;
  json: any;
}

function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}, token: string | null = auth.userToken): Promise<Reply> {
  return new Promise((ok, fail) => {
    const payload = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port,
        method,
        path,
        headers: { host: `127.0.0.1:${port}`, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(payload ? { "content-type": "application/json" } : {}), ...headers },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          ok({ status: res.statusCode ?? 0, json: text ? JSON.parse(text) : null });
        });
      },
    );
    req.on("error", fail);
    if (payload) req.write(payload);
    req.end();
  });
}

const asAgent = (method: string, path: string, body?: unknown) => call(method, path, body, {}, agentToken);

function makeRepo(withHook = false, trusted = false): string {
  const dir = mkdtempSync(join(trusted ? TRUSTED : BASE, "repo-"));
  const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: dir, stdio: "pipe" });
  git("init", "-q");
  writeFileSync(join(dir, "README.md"), "hello\n");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
  if (withHook) {
    writeFileSync(join(dir, ".git", "hooks", "post-checkout"), `#!/bin/sh\necho ran > "${join(dir, "HOOK-RAN.txt").replace(/\\/g, "/")}"\n`);
  }
  return dir;
}

async function approvedTask(extra: Record<string, unknown> = {}): Promise<string> {
  const r = await asAgent("POST", "/api/tasks", { title: "run me", request: { action: "file.read", target: join(BASE, "x.txt"), ...extra } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.task.id as string;
}

async function runAndWait(id: string, body: Record<string, unknown>, token = auth.userToken): Promise<Reply> {
  pending = [];
  const r = await call("POST", `/api/tasks/${id}/run`, body, {}, token);
  await Promise.allSettled(pending);
  return r;
}

test("server listens on loopback only", () => {
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  assert.equal(addr.address, "127.0.0.1");
});

test("GET /health is open and green for a migrated database", async () => {
  const r = await call("GET", "/health", undefined, {}, null);
  assert.equal(r.status, 200);
  assert.equal(r.json.status, "green");
});

test("every /api route needs a valid session token", async () => {
  for (const [m, p] of [["GET", "/api/tasks"], ["GET", "/api/audit"], ["GET", "/api/providers"], ["POST", "/api/tasks"]] as const) {
    assert.equal((await call(m, p, m === "POST" ? {} : undefined, {}, null)).status, 401, `${m} ${p} without token`);
    assert.equal((await call(m, p, m === "POST" ? {} : undefined, {}, "A".repeat(43))).status, 401, `${m} ${p} wrong token`);
  }
  assert.equal((await call("GET", "/api/tasks", undefined, { authorization: `Basic ${auth.userToken}` }, null)).status, 401);
});

test("POST /api/tasks: allowed request -> approved task and an audit record naming the authenticated actor", async () => {
  const r = await asAgent("POST", "/api/tasks", { title: "read it", request: { action: "file.read", target: join(ROOT, "a.txt") } });
  assert.equal(r.status, 201);
  assert.equal(r.json.decision.decision, "allow");
  assert.equal(r.json.task.state, "approved");
  assert.equal(r.json.task.request.actor.id, "test-agent");
  const audit = await call("GET", "/api/audit?limit=5");
  assert.ok(audit.json.events.some((e: any) => e.result.includes(r.json.task.id) && e.initiator.id === "test-agent"));
});

test("POST /api/tasks: outside the contract -> 403 and stored as denied", async () => {
  const r = await asAgent("POST", "/api/tasks", { title: "escape", request: { action: "file.read", target: resolve("D:/elsewhere/x") } });
  assert.equal(r.status, 403);
  assert.equal(r.json.decision.rule, "path_outside_scope");
  assert.equal(r.json.task.state, "denied");
});

test("POST /api/tasks: an approval-required action waits for approval", async () => {
  const r = await asAgent("POST", "/api/tasks", { title: "write", request: { action: "file.write", target: join(ROOT, "w.txt") } });
  assert.equal(r.status, 201);
  assert.equal(r.json.task.state, "awaiting_approval");
});

test("POST /api/tasks: a silent switch to a paid route is denied", async () => {
  const r = await asAgent("POST", "/api/tasks", {
    title: "switch",
    request: { action: "provider.switch", previousRoute: { kind: "subscription", providerId: "claude" }, route: { kind: "api_paid", providerId: "openai" }, costUsd: 0.2 },
  });
  assert.equal(r.status, 403);
  assert.equal(r.json.decision.rule, "silent_paid_switch");
});

test("an agent cannot self-grant or inject an approval / actor; the user can request a grant", async () => {
  assert.equal((await asAgent("POST", "/api/tasks", { title: "grant", request: { action: "policy.grant" } })).json.decision.rule, "agent_cannot_self_grant");
  for (const extra of [{ approval: { grantedBy: "user" } }, { actor: { kind: "user", id: "yusuf" } }]) {
    const r = await asAgent("POST", "/api/tasks", { title: "inject", request: { action: "file.write", target: join(ROOT, "w.txt"), ...extra } });
    assert.equal(r.status, 400, JSON.stringify(extra));
  }
  const user = await call("POST", "/api/tasks", { title: "grant", request: { action: "policy.grant" } });
  assert.equal(user.json.decision.rule, "user_grant");
});

test("approval: only the user token can approve; agents get 403 and the state does not change", async () => {
  const r = await asAgent("POST", "/api/tasks", { title: "needs approval", request: { action: "file.write", target: join(ROOT, "w.txt") } });
  const id = r.json.task.id as string;
  assert.equal((await asAgent("POST", `/api/tasks/${id}/approve`)).status, 403);
  assert.equal((await call("POST", `/api/tasks/${id}/approve`, undefined, {}, null)).status, 401);
  const tasks = await call("GET", "/api/tasks");
  assert.equal(tasks.json.tasks.find((t: any) => t.id === id).state, "awaiting_approval");
  const ok = await call("POST", `/api/tasks/${id}/approve`);
  assert.equal(ok.status, 200);
  assert.equal(ok.json.task.state, "approved");
  assert.equal(ok.json.task.approvedBy, "user");
  assert.equal((await call("POST", `/api/tasks/${id}/approve`)).status, 409);
  assert.equal((await call("POST", "/api/tasks/00000000-0000-0000-0000-000000000000/approve")).status, 404);
});

test("the user can deny a waiting task", async () => {
  const r = await asAgent("POST", "/api/tasks", { title: "deny me", request: { action: "file.write", target: join(ROOT, "w.txt") } });
  const d = await call("POST", `/api/tasks/${r.json.task.id}/deny`);
  assert.equal(d.json.task.state, "denied");
});

test("run: success path creates an isolated worktree, audits provider events, and stores diff evidence", async () => {
  const repo = makeRepo(true);
  const id = await approvedTask();
  const r = await runAndWait(id, { providerId: "claude-code", repoPath: repo, prompt: "ok\nWRITE:made-by-provider.txt" });
  assert.equal(r.status, 202, JSON.stringify(r.json));
  const wt = r.json.worktreePath as string;
  assert.ok(wt.startsWith(worktreeRoot), "worktree lives under the worktree root");
  assert.ok(existsSync(join(wt, "made-by-provider.txt")));
  assert.ok(!existsSync(join(repo, "made-by-provider.txt")), "the original checkout is untouched");
  assert.ok(!existsSync(join(repo, "HOOK-RAN.txt")), "repository hooks must not run");

  const ev = await call("GET", `/api/tasks/${id}/evidence`);
  assert.equal(ev.status, 200);
  const kinds = ev.json.evidence.map((e: any) => e.kind);
  assert.deepEqual(kinds, ["diff", "execution", "usage", "output"]);
  const diff = ev.json.evidence.find((e: any) => e.kind === "diff");
  assert.deepEqual(diff.data.files, ["made-by-provider.txt"]);
  assert.match(diff.data.diff, /made-by-provider\.txt/);
  const exec = ev.json.evidence.find((e: any) => e.kind === "execution");
  assert.equal(exec.data.status, "succeeded");
  assert.equal(exec.data.exitCode, 0);

  const tasks = await call("GET", "/api/tasks");
  assert.equal(tasks.json.tasks.find((t: any) => t.id === id).state, "succeeded");
  const audit = await call("GET", "/api/audit?limit=200");
  const actions = audit.json.events.map((e: any) => e.action);
  for (const a of ["run.started", "provider.event:started", "provider.event:message", "run.finished"]) assert.ok(actions.includes(a), a);
});

test("run: a failing provider is recorded as a failed task with its error code", async () => {
  const repo = makeRepo();
  const id = await approvedTask();
  await runAndWait(id, { providerId: "claude-code", repoPath: repo, prompt: "auth" });
  const tasks = await call("GET", "/api/tasks");
  assert.equal(tasks.json.tasks.find((t: any) => t.id === id).state, "failed");
  const ev = await call("GET", `/api/tasks/${id}/evidence`);
  assert.equal(ev.json.evidence.find((e: any) => e.kind === "execution").data.error.code, "auth_required");
});

test("run: the sandbox is derived from the contract and the user's approval", async () => {
  const repo = makeRepo();
  const ro = await approvedTask();
  recorded.length = 0;
  await runAndWait(ro, { providerId: "claude-code", repoPath: repo, prompt: "ok" });
  assert.equal(recorded.at(-1)?.sandbox.permission, "read_only");
  assert.deepEqual(recorded.at(-1)?.sandbox.allowedTools, ["Read", "Glob", "Grep"]);

  const w = await asAgent("POST", "/api/tasks", { title: "write", request: { action: "file.write", target: join(BASE, "w.txt") } });
  const wid = w.json.task.id as string;
  await call("POST", `/api/tasks/${wid}/approve`);
  await runAndWait(wid, { providerId: "claude-code", repoPath: makeRepo(), prompt: "ok" });
  assert.equal(recorded.at(-1)?.sandbox.permission, "workspace_write");
  assert.ok(recorded.at(-1)?.sandbox.allowedTools.includes("Edit"));
});

test("run: only the user token may start a run", async () => {
  const id = await approvedTask();
  const r = await call("POST", `/api/tasks/${id}/run`, { providerId: "claude-code", repoPath: makeRepo(), prompt: "ok" }, {}, agentToken);
  assert.equal(r.status, 403);
});

test("run: refuses tasks that are not approved, unknown providers, bad repos and out-of-scope repos", async () => {
  const waiting = await asAgent("POST", "/api/tasks", { title: "w", request: { action: "file.write", target: join(ROOT, "w.txt") } });
  const r1 = await call("POST", `/api/tasks/${waiting.json.task.id}/run`, { providerId: "claude-code", repoPath: makeRepo(), prompt: "ok" });
  assert.equal(r1.status, 409);
  assert.equal(r1.json.code, "not_approved");

  const id = await approvedTask();
  const r2 = await call("POST", `/api/tasks/${id}/run`, { providerId: "nope", repoPath: makeRepo(), prompt: "ok" });
  assert.equal(r2.json.code, "unknown_provider");

  const notRepo = mkdtempSync(join(BASE, "notrepo-"));
  const r3 = await call("POST", `/api/tasks/${id}/run`, { providerId: "claude-code", repoPath: notRepo, prompt: "ok" });
  assert.equal(r3.json.code, "not_a_repo_root");

  const sub = join(makeRepo(), "subdir");
  mkdirSync(sub);
  const r4 = await call("POST", `/api/tasks/${id}/run`, { providerId: "claude-code", repoPath: sub, prompt: "ok" });
  assert.equal(r4.json.code, "not_a_repo_root", "a subdirectory must not expose the parent repository");

  const r5 = await call("POST", `/api/tasks/${id}/run`, { providerId: "claude-code", repoPath: resolve("D:/elsewhere/repo"), prompt: "ok" });
  assert.equal(r5.json.code, "path_outside_scope");

  const state = (await call("GET", "/api/tasks")).json.tasks.find((t: any) => t.id === id).state;
  assert.equal(state, "approved", "refused runs leave the task untouched");
});

test("run: an unauthorized switch from the requested route to a paid provider is refused", async () => {
  const id = await approvedTask({ route: { kind: "subscription", providerId: "claude" } });
  const r = await call("POST", `/api/tasks/${id}/run`, { providerId: "paid-x", repoPath: makeRepo(), prompt: "ok" });
  assert.equal(r.status, 409);
  assert.equal(r.json.code, "silent_paid_switch");
  const audit = await call("GET", "/api/audit?limit=20");
  assert.ok(audit.json.events.some((e: any) => e.action === "run.refused:provider.switch" && e.decision === "deny"));
});

test("run: a paid provider without any approval is not started either", async () => {
  const id = await approvedTask();
  const r = await call("POST", `/api/tasks/${id}/run`, { providerId: "paid-x", repoPath: makeRepo(), prompt: "ok" });
  assert.equal(r.status, 409);
  assert.equal(r.json.code, "paid_route_needs_approval");
});

test("a new provider is added by registration only: the same orchestrator path runs an in-process adapter", async () => {
  const repo = makeRepo();
  const id = await approvedTask();
  const r = await runAndWait(id, { providerId: "extra-llm", repoPath: repo, prompt: "anything" });
  assert.equal(r.status, 202, JSON.stringify(r.json));
  const ev = await call("GET", `/api/tasks/${id}/evidence`);
  assert.deepEqual(ev.json.evidence.find((e: any) => e.kind === "diff").data.files, ["extra.txt"]);
});

test("GET /api/providers lists registered providers with dated capability declarations", async () => {
  const r = await call("GET", "/api/providers");
  assert.equal(r.status, 200);
  const ids = r.json.providers.map((p: any) => p.id);
  assert.deepEqual(ids, ["claude-code", "codex", "extra-llm", "paid-x", "wf-coder", "wf-critic", "wf-planner"]);
  assert.ok(r.json.providers[0].capabilities.every((c: any) => c.evidenceSource && c.checkedAt));
});

test("evidence for an unknown task is 404; request validation holds", async () => {
  assert.equal((await call("GET", "/api/tasks/00000000-0000-0000-0000-000000000000/evidence")).status, 404);
  assert.equal((await call("POST", "/api/tasks", "{nope")).status, 400);
  assert.equal((await call("POST", "/api/tasks", { title: "x", request: { action: "format.disk" } })).status, 400);
  assert.equal((await call("POST", "/api/tasks", { title: "x", extra: 1, request: { action: "file.read" } })).status, 400);
  assert.equal((await call("POST", "/api/tasks", { request: { action: "file.read" } })).status, 400);
  assert.equal((await call("POST", "/api/tasks", { title: "x", request: { action: "file.read", costUsd: -2 } })).status, 400);
  assert.equal((await call("POST", "/api/tasks", "{}", { "content-type": "text/plain" })).status, 415);
  const big = await call("POST", "/api/tasks", JSON.stringify({ title: "x", description: "a".repeat(80_000), request: { action: "file.read" } })).catch(() => ({ status: 413 }));
  assert.equal(big.status, 413);
  assert.equal((await call("GET", "/nope")).status, 404);
  assert.equal((await call("DELETE", "/api/tasks")).status, 404);
});

test("rejects foreign Host and Origin headers (DNS rebinding / cross-site)", async () => {
  assert.equal((await call("GET", "/health", undefined, { host: "evil.example.com" })).status, 403);
  assert.equal((await call("GET", "/health", undefined, { origin: "https://evil.example.com" })).status, 403);
  assert.equal((await call("GET", "/health", undefined, { origin: `http://localhost:${port}` })).status, 200);
});

test("secrets in a request never reach the audit stores", async () => {
  await asAgent("POST", "/api/tasks", { title: `leak ${FAKE_KEY}`, request: { action: "file.read", target: join(ROOT, `${FAKE_KEY}.txt`) } });
  const audit = await call("GET", "/api/audit?limit=300");
  assert.ok(!JSON.stringify(audit.json).includes(FAKE_KEY));
  assert.ok(!JSON.stringify(mem.events).includes(FAKE_KEY));
});

test("provider output secrets never reach audit or evidence", async () => {
  const id = await approvedTask();
  await runAndWait(id, { providerId: "claude-code", repoPath: makeRepo(), prompt: "secret" });
  const ev = await call("GET", `/api/tasks/${id}/evidence`);
  const audit = await call("GET", "/api/audit?limit=300");
  const all = JSON.stringify(ev.json) + JSON.stringify(audit.json) + JSON.stringify(mem.events);
  assert.ok(!all.includes("Qq1Ww2Ee3Rr4Tt5Yy6Uu7Ii8"));
  assert.ok(!all.includes("abcdefghijklmnopqrstuvwxyz0123456789"));
  assert.ok(!all.includes("hunter2hunter2"));
});

test("/health turns red (503) when the database file breaks", async () => {
  const badPath = join(mkTmp("agentmom-srv-bad-"), "bad.db");
  writeFileSync(badPath, "garbage ".repeat(500));
  const badDb = openDb(":memory:");
  migrate(badDb);
  const s = createApp({ db: badDb, dbPath: badPath, config: config(), audit: new AuditLog([new MemoryAuditSink()]), auth: new AuthRegistry(), registry: new ProviderRegistry(badDb), engine: undefined as unknown as WorkflowEngine, workflows: new WorkflowStore(badDb), worktreeRoot });
  await new Promise<void>((ok) => s.listen(0, "127.0.0.1", ok));
  const addr = s.address();
  const p = typeof addr === "object" && addr ? addr.port : 0;
  const r = await new Promise<Reply>((ok, fail) => {
    httpRequest({ host: "127.0.0.1", port: p, path: "/health", headers: { host: `127.0.0.1:${p}` } }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => ok({ status: res.statusCode ?? 0, json: JSON.parse(Buffer.concat(chunks).toString("utf8")) }));
    })
      .on("error", fail)
      .end();
  });
  await new Promise<void>((ok) => s.close(() => ok()));
  badDb.close();
  assert.equal(r.status, 503);
  assert.equal(r.json.status, "red");
});

test("run: codex is refused when the granted write sandbox cannot be enforced (no shell grant)", async () => {
  const w = await asAgent("POST", "/api/tasks", { title: "write", request: { action: "file.write", target: join(BASE, "w.txt") } });
  const wid = w.json.task.id as string;
  await call("POST", `/api/tasks/${wid}/approve`);
  const r = await call("POST", `/api/tasks/${wid}/run`, { providerId: "codex", repoPath: makeRepo(false, true), prompt: "ok" });
  assert.equal(r.status, 409);
  assert.equal(r.json.code, "sandbox_not_enforceable");
  const state = (await call("GET", "/api/tasks")).json.tasks.find((t: any) => t.id === wid).state;
  assert.equal(state, "approved", "a refused run leaves the task untouched and creates no worktree attempt");
  const ro = await approvedTask();
  const ok = await runAndWait(ro, { providerId: "codex", repoPath: makeRepo(false, true), prompt: "ok" });
  assert.equal(ok.status, 202, JSON.stringify(ok.json));
});

test("agent tokens can create tasks but cannot read tasks, audit, providers or evidence", async () => {
  for (const path of ["/api/tasks", "/api/audit", "/api/providers", "/api/tasks/00000000-0000-0000-0000-000000000000/evidence"]) {
    assert.equal((await asAgent("GET", path)).status, 403, path);
  }
  const created = await asAgent("POST", "/api/tasks", { title: "still allowed", request: { action: "file.read", target: join(ROOT, "a.txt") } });
  assert.equal(created.status, 201);
});

test("the session token never appears in audit output", async () => {
  const audit = await call("GET", "/api/audit?limit=500");
  assert.ok(!JSON.stringify(audit.json).includes(auth.userToken));
  assert.ok(!JSON.stringify(mem.events).includes(auth.userToken));
});

test("run: a hostile provider that repoints the worktree .git cannot make the orchestrator execute git filters", async (t) => {
  const evil = mkdtempSync(join(BASE, "evilgit-"));
  const marker = join(BASE, "PWNED-" + Date.now() + ".txt");
  const g = (cwd: string, ...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd, stdio: "pipe" });
  g(evil, "init", "-q");
  g(evil, "config", "filter.evil.clean", `sh -c "echo pwned > '${marker.replace(/\\/g, "/")}'; cat"`);

  // Positive control: with that git directory and unpinned git, the filter does run. If it cannot here, the scenario is not testable.
  const control = mkdtempSync(join(BASE, "control-"));
  writeFileSync(join(control, ".git"), `gitdir: ${join(evil, ".git")}\n`);
  writeFileSync(join(control, ".gitattributes"), "* filter=evil\n");
  writeFileSync(join(control, "x.txt"), "x\n");
  try {
    execFileSync("git", ["add", "-A"], { cwd: control, stdio: "pipe" });
  } catch {
    // an error is fine; only the marker matters
  }
  if (!existsSync(marker)) {
    t.skip("git filter execution is not reproducible in this environment");
    return;
  }
  writeFileSync(join(BASE, "marker-control-seen.txt"), "control fired\n");
  // remove nothing: the marker file is overwritten by the next check instead of deleted
  const before = readFileSync(marker, "utf8");
  writeFileSync(marker, "reset\n");

  const repo = makeRepo();
  const id = await approvedTask();
  const r = await runAndWait(id, { providerId: "claude-code", repoPath: repo, prompt: "evilgit\n" + join(evil, ".git") });
  assert.equal(r.status, 202, JSON.stringify(r.json));
  assert.equal(readFileSync(marker, "utf8"), "reset\n", "the filter must not have run during evidence collection (was: " + before.trim() + ")");
  const ev = await call("GET", `/api/tasks/${id}/evidence`);
  assert.ok(ev.json.evidence.find((e: any) => e.kind === "diff").data.files.includes("evil.txt"));
});

test("run: codex (unconfined reads) is refused in an untrusted repository, allowed in a trusted one", async () => {
  const id = await approvedTask();
  const refused = await call("POST", `/api/tasks/${id}/run`, { providerId: "codex", repoPath: makeRepo(), prompt: "ok" });
  assert.equal(refused.status, 409);
  assert.equal(refused.json.code, "untrusted_repo_for_unconfined_provider");
  assert.equal((await call("GET", "/api/tasks")).json.tasks.find((t: any) => t.id === id).state, "approved");
  const allowed = await runAndWait(id, { providerId: "codex", repoPath: makeRepo(false, true), prompt: "ok" });
  assert.equal(allowed.status, 202, JSON.stringify(allowed.json));
  const confined = await approvedTask();
  const claude = await runAndWait(confined, { providerId: "claude-code", repoPath: makeRepo(), prompt: "ok" });
  assert.equal(claude.status, 202, "confined providers are unaffected by the trusted-repo rule");
});

const WF_CONTRACT = { goal: "Add a greeting file", acceptance: [{ id: "c1", text: "greeting.txt exists" }], writeScopes: ["."], constraints: [] };
const WF_DEF = { steps: [{ role: "plan", providerId: "wf-planner" }, { role: "implement", providerId: "wf-coder" }, { role: "review", providerId: "wf-critic" }, { role: "verify" }] };

test("workflow over HTTP: contract -> workflow -> status with steps, handoffs and evidence", async () => {
  const id = await approvedTask();
  assert.equal((await call("POST", `/api/tasks/${id}/workflow`, { repoPath: makeRepo(), definition: WF_DEF })).status, 409, "contract required first");
  const c = await call("POST", `/api/tasks/${id}/contract`, WF_CONTRACT);
  assert.equal(c.status, 200, JSON.stringify(c.json));
  pendingWf = [];
  const r = await call("POST", `/api/tasks/${id}/workflow`, { repoPath: makeRepo(), definition: WF_DEF });
  assert.equal(r.status, 202, JSON.stringify(r.json));
  await Promise.allSettled(pendingWf);
  const wf = await call("GET", `/api/workflows/${r.json.workflowId}`);
  assert.equal(wf.status, 200);
  assert.equal(wf.json.workflow.state, "succeeded");
  assert.deepEqual(wf.json.steps.map((s: any) => s.state), ["succeeded", "succeeded", "succeeded", "succeeded"]);
  assert.equal(wf.json.handoffs.length, 3);
  const ev = await call("GET", `/api/tasks/${id}/evidence`);
  assert.ok(ev.json.evidence.some((e: any) => e.kind === "verification"));
  assert.equal((await call("GET", "/api/tasks")).json.tasks.find((t: any) => t.id === id).state, "succeeded");
});

test("workflow endpoints: user only, validated, task must be approved", async () => {
  const id = await approvedTask();
  assert.equal((await asAgent("POST", `/api/tasks/${id}/contract`, WF_CONTRACT)).status, 403);
  assert.equal((await asAgent("POST", `/api/tasks/${id}/workflow`, { repoPath: makeRepo(), definition: WF_DEF })).status, 403);
  assert.equal((await asAgent("GET", "/api/workflows/00000000-0000-0000-0000-000000000000")).status, 403);
  assert.equal((await call("POST", `/api/tasks/${id}/contract`, { goal: "g", acceptance: [] })).json.code, "invalid_acceptance");
  assert.equal((await call("POST", `/api/tasks/${id}/contract`, { ...WF_CONTRACT, writeScopes: ["../outside"] })).json.code, "invalid_scopes");
  await call("POST", `/api/tasks/${id}/contract`, WF_CONTRACT);
  const bad = await call("POST", `/api/tasks/${id}/workflow`, { repoPath: makeRepo(), definition: { steps: [{ role: "review", providerId: "wf-critic" }] } });
  assert.equal(bad.status, 400);
  const same = await call("POST", `/api/tasks/${id}/workflow`, { repoPath: makeRepo(), definition: { steps: [{ role: "implement", providerId: "wf-coder" }, { role: "review", providerId: "wf-coder" }, { role: "verify" }] } });
  assert.equal(same.json.code, "review_not_independent");
  const ghost = await call("POST", `/api/tasks/${id}/workflow`, { repoPath: makeRepo(), definition: { steps: [{ role: "plan", providerId: "ghost" }] } });
  assert.equal(ghost.json.code, "unknown_provider");
  assert.equal((await call("GET", "/api/workflows/00000000-0000-0000-0000-000000000000")).status, 404);
  const waiting = await asAgent("POST", "/api/tasks", { title: "w", request: { action: "file.write", target: join(ROOT, "w.txt") } });
  await call("POST", `/api/tasks/${waiting.json.task.id}/contract`, WF_CONTRACT);
  assert.equal((await call("POST", `/api/tasks/${waiting.json.task.id}/workflow`, { repoPath: makeRepo(), definition: WF_DEF })).status, 409);
});

test("workflow endpoint refuses a repository outside the allowed directories before creating anything", async () => {
  const id = await approvedTask();
  await call("POST", `/api/tasks/${id}/contract`, WF_CONTRACT);
  const r = await call("POST", `/api/tasks/${id}/workflow`, { repoPath: resolve("D:/elsewhere/repo"), definition: WF_DEF });
  assert.equal(r.status, 409);
  assert.equal(r.json.code, "path_outside_scope");
});

test("delivery endpoint: 404 until a delivery report exists; contract accepts a verification plan and rejects a bad one", async () => {
  const id = await approvedTask();
  assert.equal((await call("GET", `/api/tasks/${id}/delivery`)).status, 404);
  assert.equal((await asAgent("GET", `/api/tasks/${id}/delivery`)).status, 403);
  const ok = await call("POST", `/api/tasks/${id}/contract`, { ...WF_CONTRACT, verification: { localTests: { files: ["src/a.test.mjs"] } } });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.contract.verification.timeoutMs, 120000);
  const bad = await call("POST", `/api/tasks/${id}/contract`, { ...WF_CONTRACT, verification: { localTests: { files: ["../escape.test.mjs"] } } });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.code, "invalid_verification");
  assert.equal((await call("GET", `/api/tasks/00000000-0000-0000-0000-000000000000/delivery`)).status, 404);
});

test("memory API (Faz 5b): the user records, searches and exports; an agent token can do none of it", async () => {
  const body = { kind: "fact", title: "Docker ertelendi", body: "Docker kurulumu Yusuf'un kararıyla ertelendi.", source: "yusuf", scope: "agentmom", confidence: 0.95, subject: "docker" };
  assert.equal((await asAgent("POST", "/api/memory", body)).status, 403);
  assert.equal((await asAgent("GET", "/api/memory/search?q=docker")).status, 403);
  assert.equal((await asAgent("POST", "/api/memory/export", { dir: BASE })).status, 403);
  const added = await call("POST", "/api/memory", body);
  assert.equal(added.status, 201);
  assert.equal(added.json.duplicate, false);
  assert.equal((await call("POST", "/api/memory", body)).status, 200, "an identical record is reported as a duplicate");
  assert.equal((await call("POST", "/api/memory", { ...body, extra: 1 })).status, 400, "unknown fields are refused");
  assert.equal((await call("POST", "/api/memory", { ...body, confidence: 7 })).status, 400);
  const contra = await call("POST", "/api/memory", { ...body, body: "Docker kuruldu ve kullanılıyor." });
  assert.deepEqual(contra.json.contradictions, [added.json.record.id]);
  const found = await call("GET", "/api/memory/search?q=kullanilan&scope=agentmom");
  assert.equal(found.json.hits.length, 0, "no prefix match for a different word");
  const found2 = await call("GET", "/api/memory/search?q=kullanil&scope=agentmom");
  assert.equal(found2.json.hits.length, 1);
  assert.ok(found2.json.hits[0].flags.includes("contradiction"));
  assert.equal((await call("GET", "/api/memory/flags")).json.contradictions.length, 1);
  assert.equal((await call("GET", "/api/memory/search?q=x&kind=nonsense")).status, 400);
  assert.ok(!JSON.stringify(mem.events).includes(auth.userToken));
});

test("memory export goes through the file.write policy gate: allowed dir works append-only, the keys folder and out-of-scope dirs are refused", async () => {
  const ok = join(BASE, "kasa-notlar");
  const keys = join(BASE, "anahtarlar");
  const outside = mkTmp("agentmom-outside-");
  for (const d of [ok, keys]) mkdirSync(d, { recursive: true });
  const rec = await call("POST", "/api/memory", { kind: "note", title: "Disa aktarim", body: "kasa notu", source: "yusuf", scope: "export-test", confidence: 0.8 });
  const id = rec.json.record.id;
  const first = await call("POST", "/api/memory/export", { dir: ok, ids: [id] });
  assert.equal(first.status, 200);
  assert.equal(first.json.written.length, 1);
  const file = first.json.written[0].path;
  const content = readFileSync(file, "utf8");
  assert.match(content, /kapsam: "export-test"/);
  const again = await call("POST", "/api/memory/export", { dir: ok, ids: [id] });
  assert.equal(again.json.written.length, 0);
  assert.equal(again.json.skipped.length, 1);
  assert.equal(readFileSync(file, "utf8"), content, "never overwritten");
  assert.equal((await call("POST", "/api/memory/export", { dir: keys, ids: [id] })).status, 403, "the keys folder is refused even inside an allowed directory");
  assert.equal((await call("POST", "/api/memory/export", { dir: outside, ids: [id] })).status, 403, "outside allowedDirs is refused by policy");
  assert.equal((await call("POST", "/api/memory/export", { dir: ok, ids: ["00000000-0000-0000-0000-000000000000"] })).status, 404);
  assert.equal((await call("POST", "/api/memory/export", { dir: "relative/path", ids: [id] })).status, 400);
  assert.equal(existsSync(join(outside, "x")), false);
});

test("skill lifecycle API (Faz 5c): user-only; gates are enforced over HTTP and release needs the user", async () => {
  const sha = "c".repeat(64);
  const proposal = { name: "http-skill", origin: "https://example.test/s", description: "deneme", riskClass: "contained", artifactSha256: sha };
  assert.equal((await asAgent("POST", "/api/skills", proposal)).status, 403);
  assert.equal((await asAgent("GET", "/api/skills")).status, 403);
  const made = await call("POST", "/api/skills", proposal);
  assert.equal(made.status, 201);
  const id = made.json.skill.id as string;
  assert.equal((await call("POST", "/api/skills", proposal)).status, 409, "the same artifact twice");
  assert.equal((await call("POST", "/api/skills", { ...proposal, extra: 1 })).status, 400);
  assert.equal((await call("POST", `/api/skills/${id}/release`, {})).status, 409, "a candidate cannot be released");
  assert.equal((await call("POST", `/api/skills/${id}/advance`, {})).status, 200);
  assert.equal((await call("POST", `/api/skills/${id}/advance`, {})).status, 409, "research record missing");
  assert.equal((await call("POST", `/api/skills/${id}/gate`, { gate: "research", verdict: "info", reviewer: "claude-code", artifactSha256: "d".repeat(64), summary: "x" })).status, 409, "wrong artifact");
  assert.equal((await call("POST", `/api/skills/${id}/gate`, { gate: "research", verdict: "info", reviewer: "claude-code", artifactSha256: sha, summary: "kaynak incelendi" })).status, 201);
  await call("POST", `/api/skills/${id}/advance`, {});
  await call("POST", `/api/skills/${id}/gate`, { gate: "security_review", verdict: "pass", reviewer: "codex", artifactSha256: sha, summary: "temiz" });
  await call("POST", `/api/skills/${id}/advance`, {});
  await call("POST", `/api/skills/${id}/gate`, { gate: "isolated_test", verdict: "pass", reviewer: "test-runner", artifactSha256: sha, summary: "gecti" });
  assert.equal((await call("POST", `/api/skills/${id}/advance`, {})).json.skill.state, "awaiting_approval");
  assert.equal((await asAgent("POST", `/api/skills/${id}/release`, {})).status, 403);
  const rel = await call("POST", `/api/skills/${id}/release`, { note: "v1" });
  assert.equal(rel.status, 200);
  assert.equal(rel.json.skill.currentVersion, 1);
  const detail = await call("GET", `/api/skills/${id}`);
  assert.equal(detail.json.versions.length, 1);
  assert.deepEqual(detail.json.missing, []);
  assert.equal((await call("POST", `/api/skills/${id}/revoke`, { note: "test" })).json.skill.state, "revoked");
  assert.equal((await call("GET", "/api/skills/00000000-0000-0000-0000-000000000000")).status, 404);
});

test("reasoning API (Faz 7): user-only; decisions expire, assumption debt is listed, agents cannot validate, predictions are graded by the user", async () => {
  const soon = new Date(Date.now() + 5 * 86_400_000).toISOString();
  const later = new Date(Date.now() + 60 * 86_400_000).toISOString();
  const dec = { title: "Gemini beklemede", rationale: "Google istemciyi kapatti.", scope: "agentmom", expiresAt: later, assumptions: [{ text: "Gemini hizmeti bu hesapta donmeyecek", checkBy: soon }] };
  assert.equal((await asAgent("POST", "/api/decisions", dec)).status, 403);
  assert.equal((await asAgent("GET", "/api/assumption-debt")).status, 403);
  assert.equal((await call("POST", "/api/decisions", { ...dec, expiresAt: new Date(Date.now() - 1000).toISOString() })).status, 400);
  assert.equal((await call("POST", "/api/decisions", { ...dec, extra: 1 })).status, 400);
  const made = await call("POST", "/api/decisions", dec);
  assert.equal(made.status, 201);
  const aid = made.json.decision.assumptions[0].id as string;
  assert.equal(made.json.decision.reviewState, "ok");
  assert.equal((await call("GET", "/api/assumption-debt")).json.debt.some((d: { assumptionId: string }) => d.assumptionId === aid), true);
  assert.equal((await asAgent("POST", `/api/assumptions/${aid}`, { status: "holds", evidence: "ben dogruladim kendim yeterince uzun" })).status, 403);
  assert.equal((await call("POST", `/api/assumptions/${aid}`, { status: "broken", evidence: "Olcum bu varsayimi curuttu tamam" })).json.assumption.status, "broken");
  assert.equal((await call("GET", `/api/decisions/${made.json.decision.id}`)).json.decision.reviewState, "at_risk");
  assert.equal((await call("GET", `/api/assumptions/${aid}`)).json.events.length, 1);
  const pred = await call("POST", "/api/predictions", { source: "codex", claim: "inceleme dogru cikacak", confidence: 0.8, dueAt: later });
  assert.equal(pred.status, 201);
  assert.equal((await asAgent("POST", `/api/predictions/${pred.json.prediction.id}/resolve`, { outcome: true, evidence: "x" })).status, 403);
  assert.equal((await call("POST", `/api/predictions/${pred.json.prediction.id}/resolve`, { outcome: false, evidence: "yanlis pozitif cikti" })).json.prediction.outcome, false);
  const rep = await call("GET", "/api/calibration?source=codex");
  assert.equal(rep.json.report.verdict, "insufficient_data");
  assert.equal(rep.json.report.resolved, 1);
  assert.equal((await call("POST", `/api/decisions/${made.json.decision.id}/retire`, {})).json.decision.status, "retired");
});

// ---- Faz 8: Command Panel (static, same origin) and terminal command ----
// The route/header, real-browser (Edge), layout, white-screen, command and approval-binding tests of the Faz 10 panel were rewritten for the Faz 11 desktop UI in ui-desktop.test.ts.
test("panel source is inert by construction: no inline script/style/handlers, no dangerous DOM sinks, no outside URLs; the view layer never touches the network or storage; only the core holds the token", () => {
  const dir = join(import.meta.dirname, "ui");
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1");
  const html = readFileSync(join(dir, "index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const css = strip(readFileSync(join(dir, "layout.css"), "utf8") + readFileSync(join(dir, "tokens.css"), "utf8"));
  // Faz 11: görünüm katmanı artık tek feed.js değil; tüm görünüm modülleri aynı kurallara tabidir. localStorage yalnız prefs.js'tedir.
  const VIEW = ["chat", "sidebar", "usermenu", "panel", "settings", "help", "usage", "shell", "palette", "ring", "safe", "icons", "prefs", "strings"];
  const js: Record<string, string> = { core: strip(readFileSync(join(dir, "core.js"), "utf8")) };
  for (const m of VIEW) js[m] = strip(readFileSync(join(dir, m + ".js"), "utf8"));
  // "Bearer" in view modules may only appear in a secret-scrubbing regex (it REMOVES tokens); it can never be used to build a header.
  const viewCode = VIEW.map((m) => js[m] as string).join("\n").split("\n").filter((l) => !/replace\(\/Bearer/.test(l)).join("\n");
  const core = js["core"] as string;
  assert.ok(!/<script(?![^>]*\bsrc=)/i.test(html), "no inline script");
  assert.ok(!/\son[a-z]+\s*=/i.test(html), "no inline event handlers");
  assert.ok(!/\sstyle\s*=|<style/i.test(html), "no inline style");
  assert.ok(!/https?:\/\//i.test((html + css + Object.values(js).join(String.fromCharCode(10))).replaceAll("http://www.w3.org/2000/svg", "").replaceAll('"https://"', '""').replaceAll('"http://"', '""')), "no outside URL (the SVG namespace identifier and safe.js's link-scheme comparisons are not requests)");
  assert.ok(!/@import|url\(/i.test(css), "no imports, no url()");
  const sinks = ["innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval(", "new Function", "javascript:", "srcdoc", "postMessage", "localStorage", "document.cookie", "setTimeout(\"", "setInterval(\""];
  for (const [name, code] of Object.entries(js)) for (const sink of sinks) assert.ok(name === "prefs" && sink === "localStorage" ? true : !code.includes(sink), `${name}.js uses forbidden ${sink}`);
  for (const [name, code] of Object.entries(js)) if (name !== "prefs") assert.ok(!code.includes("localStorage"), `${name}.js must not touch localStorage (only prefs.js does)`);
  for (const bad of ["fetch(", "XMLHttpRequest", "WebSocket", "sessionStorage", "Authorization", "Bearer"]) assert.ok(!viewCode.includes(bad), `the view layer must not use ${bad}`);
  assert.ok(core.includes("Bearer") && core.includes("sessionStorage"), "the core owns the token flow");
  for (const m of core.matchAll(/fetch\(\s*([^,)]+)/g)) assert.ok(!/https?:/.test(m[1] as string), "core only fetches same-origin paths");
});

test("terminal command: summarises state, never prints the token, opens the panel with the token only in the URL fragment, refuses non-loopback servers", async () => {
  const { runCli } = await import("../cli/agentmom.ts");
  const lines: string[] = [];
  const errs: string[] = [];
  const opened: string[] = [];
  const mk = (over: Record<string, unknown> = {}) => ({
    baseUrl: `http://127.0.0.1:${port}`,
    fetch: async (url: string, init: { headers: Record<string, string> }) => {
      const r = await fetch(url, { headers: init.headers });
      return { status: r.status, text: () => r.text() };
    },
    readToken: () => auth.userToken,
    out: (l: string) => void lines.push(l),
    err: (l: string) => void errs.push(l),
    openUrl: (u: string) => void opened.push(u),
    ...over,
  });
  const evil = await asAgent("POST", "/api/tasks", { title: "kotu\u001b[2J\u001b[Hgorev", request: { action: "file.write", target: join(BASE, "cli.txt") } });
  assert.equal(evil.status, 201);
  assert.equal(await runCli(["durum"], mk()), 0);
  assert.match(lines.join("\n"), /Sağlık: yeşil/);
  assert.match(lines.join("\n"), /Görevler: \d+ \(onay bekleyen: [1-9]/);
  lines.length = 0;
  assert.equal(await runCli(["onay"], mk()), 0);
  assert.ok(lines.some((l) => l.includes("kotu") && !l.includes("\u001b")), "terminal escapes from server text are stripped");
  lines.length = 0;
  assert.equal(await runCli(["gorevler"], mk()), 0);
  assert.equal(await runCli(["borc"], mk()), 0);
  assert.equal(await runCli(["kararlar"], mk()), 0);
  assert.equal(await runCli(["ui"], mk()), 0);
  assert.equal(opened.length, 1);
  assert.equal(opened[0], `http://127.0.0.1:${port}/#token=${auth.userToken}`);
  assert.ok(!lines.concat(errs).some((l) => l.includes(auth.userToken)), "the token is never printed");
  assert.equal(await runCli(["durum"], mk({ baseUrl: "http://evil.example:80" })), 2);
  assert.equal(await runCli(["durum"], mk({ baseUrl: "http://127.0.0.1.evil.example:80" })), 2);
  assert.equal(await runCli(["durum"], mk({ readToken: () => "yanlis-belirtec-ama-gecerli-bicimde-0123456789" })), 1, "a wrong token is reported, not crashed");
  assert.equal(await runCli(["durum"], mk({ readToken: () => "kisa" })), 1);
  assert.equal(await runCli(["durum"], mk({ readToken: () => { throw new Error("yok"); } })), 1);
  assert.equal(await runCli(["bilinmeyen"], mk()), 2);
  assert.equal(await runCli(["durum"], mk({ fetch: async () => { throw new Error("ECONNREFUSED"); } })), 1);
  assert.ok(!lines.concat(errs).some((l) => l.includes(auth.userToken)));
});

// ---- Faz 10: interactive terminal session (Claude Code style) ----
async function replIo(answers: Array<string | null>, over: Record<string, unknown> = {}) {
  const lines: string[] = [];
  const errs: string[] = [];
  const asked: string[] = [];
  const opened: string[] = [];
  const queue = [...answers];
  const io = {
    baseUrl: `http://127.0.0.1:${port}`,
    fetch: async (url: string, init: { headers: Record<string, string>; method?: string; body?: string }) => {
      const r = await fetch(url, { headers: init.headers, ...(init.method ? { method: init.method } : {}), ...(init.body !== undefined ? { body: init.body } : {}) });
      return { status: r.status, text: () => r.text() };
    },
    readToken: () => auth.userToken,
    out: (l: string) => void lines.push(l),
    err: (l: string) => void errs.push(l),
    openUrl: (u: string) => void opened.push(u),
    ask: async (p: string) => {
      asked.push(p);
      return queue.length ? (queue.shift() as string | null) : null;
    },
    color: false,
    sleep: async () => undefined,
    interrupted: () => false,
    runBackup: async () => ({ code: 0, out: "Yedek alındı: X\nDoğrulama: GEÇTİ\n" }),
    readMemoryFile: () => null as string | null,
    ...over,
  };
  return { io, lines, errs, asked, opened };
}

test("REPL: start-up banner, slash commands, unknown command, token never printed, server text sanitised", async () => {
  const { runRepl } = await import("../cli/repl.ts");
  const evil = await asAgent("POST", "/api/tasks", { title: "repl\u001b[2J\u001b[1;1Hgorev", request: { action: "file.write", target: join(BASE, "repl-a.txt") } });
  assert.equal(evil.status, 201);
  const t = await replIo(["/durum", "/gorevler", "/borc", "/kararlar", "/beceriler", "/saglayicilar", "/yardim", "/bilinmiyor", "/yedek", "/hafiza", "   ", "/ui", "/cik", "/durum"]);
  assert.equal(await runRepl(t.io as never), 0);
  const all = t.lines.join("\n");
  assert.match(all, /AgentMom — yerel komuta oturumu/);
  assert.match(all, /sağlık: yeşil/);
  assert.match(all, /⏺ Sağlık: yeşil/);
  assert.match(all, /⏺ Görevler \(\d+\)/);
  assert.match(all, /Komutlar \(yazmaya \/ ile başlayın\)/);
  assert.match(all, /Bilinmeyen komut: \/bilinmiyor/);
  assert.match(all, /Yedek alınıyor/);
  assert.match(all, /AGENTMOM\.md/);
  assert.ok(!all.includes("\u001b"), "no terminal escape from server text reaches the screen");
  assert.ok(all.includes("repl") && all.includes("gorev"));
  assert.equal(t.opened[0], `http://127.0.0.1:${port}/#token=${auth.userToken}`);
  assert.ok(!t.lines.concat(t.errs).some((l) => l.includes(auth.userToken)), "the token is never printed");
  assert.equal(t.asked.length, 13, "the session ended at /cik, later input was never read");
});

test("REPL permission prompt: shows action and target, default is SKIP, 'h' denies, 'e' approves (as the user), EOF stops", async () => {
  const { runRepl } = await import("../cli/repl.ts");
  const mk = async (name: string) => {
    const r = await asAgent("POST", "/api/tasks", { title: `izin-${name}`, request: { action: "file.write", target: join(BASE, `izin-${name}.txt`) } });
    return r.json.task.id as string;
  };
  const stateOf = async (id: string) => (await call("GET", "/api/tasks")).json.tasks.find((x: { id: string }) => x.id === id).state;
  const a = await mk("a");
  const b = await mk("b");
  const c = await mk("c");
  // skip (empty answer) for every pending task: nothing changes
  const skip = await replIo(["/onay", "", "", "", "", "", "", "", "", "", "", "", "", "/cik"]);
  await runRepl(skip.io as never);
  const text = skip.lines.join("\n");
  assert.match(text, /İzin isteniyor/);
  assert.match(text, /eylem: file\.write/);
  assert.match(text, /hedef: .*izin-a\.txt/);
  assert.match(text, /politika kararı: require_approval/);
  assert.ok(skip.asked.some((q) => /varsayılan atla/.test(q)));
  assert.equal(await stateOf(a), "awaiting_approval");
  assert.equal(await stateOf(b), "awaiting_approval");
  // choose per task: answers follow the order of the list; find which prompt is for which target
  const order: string[] = [];
  const pick = await replIo(["/onay"], {});
  const answers: Record<string, string> = { "izin-a": "e", "izin-b": "h", "izin-c": "atla" };
  pick.io.ask = async (p: string) => {
    pick.asked.push(p);
    if (/İzin ver/.test(p)) {
      const last = pick.lines.slice(-6).join("\n");
      const who = /görev: (izin-[abc])/.exec(last)?.[1] ?? "?";
      order.push(who);
      return answers[who] ?? "";
    }
    return pick.asked.length === 1 ? "/onay" : null;
  };
  await runRepl(pick.io as never);
  assert.equal(await stateOf(a), "approved");
  assert.equal(await stateOf(b), "denied");
  assert.equal(await stateOf(c), "awaiting_approval", "'atla' skips");
  const audit = (await call("GET", "/api/audit?limit=400")).json.events as Array<{ action: string; initiator: { kind: string } }>;
  assert.ok(audit.some((e) => e.action === "task.approve" && e.initiator.kind === "user"));
  assert.ok(audit.some((e) => e.action === "task.deny" && e.initiator.kind === "user"));
  // EOF during the prompt stops quietly
  const eof = await replIo(["/onay", null]);
  assert.equal(await runRepl(eof.io as never), 0);
  assert.equal(await stateOf(c), "awaiting_approval");
});

test("REPL free text only creates a task RECORD after confirmation (default no); /izle streams new actions and state changes; unreachable server and bad token end cleanly", async () => {
  const { runRepl } = await import("../cli/repl.ts");
  const before = (await call("GET", "/api/tasks")).json.tasks.length;
  const no = await replIo(["Yeni bir özellik ekle", "", "başka bir metin", "h", "/cik"]);
  await runRepl(no.io as never);
  assert.equal((await call("GET", "/api/tasks")).json.tasks.length, before, "declined or defaulted: nothing was created");
  assert.match(no.lines.join("\n"), /hiçbir ajan başlatılmaz/);
  const yes = await replIo(["Panel için kayıt açılsın", "e", "/cik"]);
  await runRepl(yes.io as never);
  const tasks = (await call("GET", "/api/tasks")).json.tasks as Array<{ title: string; requestedAction: string; state: string }>;
  assert.equal(tasks.length, before + 1);
  const made = tasks.find((x) => x.title === "Panel için kayıt açılsın");
  assert.equal(made?.requestedAction, "task.create");
  assert.match(yes.lines.join("\n"), /kaydedildi: [0-9a-f]{8}/);
  // streaming: during the first sleep a new task is created and another one is approved
  let n = 0;
  const target = await asAgent("POST", "/api/tasks", { title: "akis-izlenen", request: { action: "file.write", target: join(BASE, "akis.txt") } });
  const stream = await replIo(["/izle 3", "/cik"], {
    sleep: async () => {
      n++;
      if (n === 1) {
        await asAgent("POST", "/api/tasks", { title: "akis-yeni", request: { action: "file.write", target: join(BASE, "akis2.txt") } });
        await call("POST", `/api/tasks/${target.json.task.id}/approve`, {});
      }
    },
  });
  await runRepl(stream.io as never);
  const st = stream.lines.join("\n");
  assert.match(st, /Akış izleniyor \(3 tur/);
  assert.match(st, /task\.create:file\.write/, "a new action line");
  assert.match(st, /onay bekliyor → onaylandı/, "a task state change is announced");
  assert.match(st, /akış bitti/);
  // interrupt
  let calls = 0;
  const intr = await replIo(["/izle 50", "/cik"], { interrupted: () => ++calls > 1 });
  await runRepl(intr.io as never);
  assert.match(intr.lines.join("\n"), /durduruldu/);
  // bad inputs
  const dead = await replIo([], { fetch: async () => { throw new Error("ECONNREFUSED"); } });
  assert.equal(await runRepl(dead.io as never), 1);
  const badTok = await replIo([], { readToken: () => "yanlis-belirtec-ama-gecerli-bicimde-0123456789" });
  assert.equal(await runRepl(badTok.io as never), 1);
  const evilUrl = await replIo([], { baseUrl: "http://evil.example:80" });
  assert.equal(await runRepl(evilUrl.io as never), 1);
  assert.ok(!evilUrl.lines.concat(evilUrl.errs).join("\n").includes(auth.userToken));
  const mem = await replIo(["/hafiza", "/cik"], { readMemoryFile: () => "# Proje\n\u001b[31mkirmizi\u001b[0m satir\n" });
  await runRepl(mem.io as never);
  assert.ok(!mem.lines.join("\n").includes("\u001b"));
  assert.match(mem.lines.join("\n"), /kirmizi/);
});

test("REPL as a real process (`agentmom repl`): piped session end to end, history-free, no token in the output", async () => {
  const state = mkTmp("repl-state-");
  mkdirSync(join(state, "token"), { recursive: true });
  writeFileSync(join(state, "token", "session.token"), auth.userToken);
  const cli = join(import.meta.dirname, "..", "cli", "agentmom.ts");
  const run = await new Promise<{ code: number | null; out: string }>((ok) => {
    const child = spawn(process.execPath, [cli, "repl"], { env: { ...process.env, AGENTMOM_STATE_DIR: state, AGENTMOM_PORT: String(port), NO_COLOR: "1" }, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let out = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    child.stderr.on("data", (d: Buffer) => (out += d.toString()));
    child.on("exit", (code) => ok({ code, out }));
    child.stdin.write("/durum\n/gorevler\n/cik\n");
    child.stdin.end();
  });
  assert.equal(run.code, 0, run.out);
  assert.match(run.out, /AgentMom — yerel komuta oturumu/);
  assert.match(run.out, /Sağlık: yeşil/);
  assert.match(run.out, /görüşürüz/);
  assert.ok(!run.out.includes(auth.userToken));
});

test("review fixes (Faz 10): permission prompts are 'fresh' (pre-typed lines never answer them), a task decided elsewhere is not acted on again, terminal cleaning matches the panel's", async () => {
  const { runRepl } = await import("../cli/repl.ts");
  const { clean } = await import("../cli/common.ts");
  assert.ok(!clean("a⁠b﻿c‮d\u001b[2Je").match(/[⁠﻿‮\u001b]/), "word joiner, BOM, bidi and escape are all stripped");
  const mk = async (name: string) => (await asAgent("POST", "/api/tasks", { title: `taze-${name}`, request: { action: "file.write", target: join(BASE, `taze-${name}.txt`) } })).json.task.id as string;
  const stateOf = async (id: string) => (await call("GET", "/api/tasks")).json.tasks.find((x: { id: string }) => x.id === id).state;
  const id = await mk("a");
  // another session approves the task while the prompt is open: the REPL must not approve/deny it a second time
  const t = await replIo(["/onay"]);
  const fresh: Array<boolean | undefined> = [];
  t.io.ask = async (p: string, opts?: { fresh?: boolean }) => {
    t.asked.push(p);
    if (/İzin ver/.test(p)) {
      fresh.push(opts?.fresh);
      if (/taze-a/.test(t.lines.slice(-6).join("\n"))) await call("POST", `/api/tasks/${id}/approve`, {});
      return "h"; // would DENY an already approved task if it were not re-checked
    }
    return t.asked.length === 1 ? "/onay" : null;
  };
  await runRepl(t.io as never);
  assert.ok(fresh.length >= 1 && fresh.every((f) => f === true), "every permission prompt is requested as fresh");
  assert.equal(await stateOf(id), "approved", "the task decided elsewhere was left alone");
  assert.match(t.lines.join("\n"), /artık onay beklemiyor/);
  // free-text confirmation is fresh too
  const ft = await replIo(["bir metin"]);
  const flags: Array<boolean | undefined> = [];
  ft.io.ask = async (p: string, opts?: { fresh?: boolean }) => {
    ft.asked.push(p);
    if (/\[e\]vet/.test(p)) {
      flags.push(opts?.fresh);
      return "h";
    }
    return ft.asked.length === 1 ? "bir metin" : null;
  };
  await runRepl(ft.io as never);
  assert.deepEqual(flags, [true]);
});

test("REPL as a piped process: a permission prompt cannot be answered by piped/pre-typed input, so nothing is approved and nothing is created", async () => {
  const id = (await asAgent("POST", "/api/tasks", { title: "boru-girdisi", request: { action: "file.write", target: join(BASE, "boru.txt") } })).json.task.id as string;
  const before = (await call("GET", "/api/tasks")).json.tasks.length;
  const state = mkTmp("repl-state2-");
  mkdirSync(join(state, "token"), { recursive: true });
  writeFileSync(join(state, "token", "session.token"), auth.userToken);
  const cli = join(import.meta.dirname, "..", "cli", "agentmom.ts");
  const out = await new Promise<string>((ok) => {
    const child = spawn(process.execPath, [cli, "repl"], { env: { ...process.env, AGENTMOM_STATE_DIR: state, AGENTMOM_PORT: String(port), NO_COLOR: "1" }, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let text = "";
    child.stdout.on("data", (d: Buffer) => (text += d.toString()));
    child.stderr.on("data", (d: Buffer) => (text += d.toString()));
    child.on("exit", () => ok(text));
    child.stdin.write("/onay\ne\ne\ne\nbir metin\ne\n/cik\n");
    child.stdin.end();
  });
  assert.match(out, /İzin isteniyor/);
  assert.equal((await call("GET", "/api/tasks")).json.tasks.find((t: { id: string }) => t.id === id).state, "awaiting_approval", "piped 'e' did not approve");
  assert.equal((await call("GET", "/api/tasks")).json.tasks.length, before, "piped 'e' did not create a task either");
  assert.ok(!out.includes(auth.userToken));
});

// ---- Faz 11: desktop window entry (one-time ticket, no token on the command line) ----
function entryGet(path: string): Promise<{ status: number; location?: string | undefined; cache?: string | undefined }> {
  return new Promise((ok, fail) => {
    const req = httpRequest({ host: "127.0.0.1", port, method: "GET", path, headers: { host: `127.0.0.1:${port}` } }, (res) => {
      res.resume();
      res.on("end", () => ok({ status: res.statusCode ?? 0, location: res.headers.location, cache: res.headers["cache-control"] }));
    });
    req.on("error", fail);
    req.end();
  });
}

test("desktop entry: a ticket needs the user token, redeems once into the panel redirect, and agent tokens cannot mint one", async () => {
  assert.equal((await call("POST", "/api/desktop/ticket", {}, {}, null)).status, 401);
  assert.equal((await call("POST", "/api/desktop/ticket", {}, {}, agentToken)).status, 403);
  const t = await call("POST", "/api/desktop/ticket", {});
  assert.equal(t.status, 200);
  const ticket = t.json.ticket as string;
  assert.match(ticket, /^[A-Za-z0-9_-]{20,64}$/);
  assert.ok(!JSON.stringify(t.json).includes(auth.userToken), "the ticket response must not carry the session token");
  const first = await entryGet(`/desktop/enter?t=${ticket}`);
  assert.equal(first.status, 302);
  assert.equal(first.location, `/#token=${auth.userToken}`);
  assert.equal(first.cache, "no-store");
  assert.equal((await entryGet(`/desktop/enter?t=${ticket}`)).status, 403, "a ticket works once");
  assert.equal((await entryGet("/desktop/enter?t=aaaaaaaaaaaaaaaaaaaaaaaaaaaa")).status, 403);
  assert.equal((await entryGet("/desktop/enter")).status, 403);
});

test("desktop quit is user-only and does nothing without a shell callback (tests)", async () => {
  assert.equal((await call("POST", "/api/desktop/quit", {}, {}, null)).status, 401);
  assert.equal((await call("POST", "/api/desktop/quit", {}, {}, agentToken)).status, 403);
  const r = await call("POST", "/api/desktop/quit", {});
  assert.equal(r.status, 200);
  assert.equal(r.json.quitting, false);
});

test("panel icon routes are served as images", async () => {
  assert.equal((await entryGet("/ui/icon.png")).status, 200);
  assert.equal((await entryGet("/favicon.ico")).status, 200);
});

test("desktop entry refuses a ticket presented by another page (Sec-Fetch-Site must be absent or none) and sets no-referrer", async () => {
  const t = (await call("POST", "/api/desktop/ticket", {})).json.ticket as string;
  const withSite = (site: string) =>
    new Promise<{ status: number; referrer?: string | undefined }>((ok, fail) => {
      const req = httpRequest({ host: "127.0.0.1", port, method: "GET", path: `/desktop/enter?t=${t}`, headers: { host: `127.0.0.1:${port}`, "sec-fetch-site": site } }, (res) => {
        res.resume();
        res.on("end", () => ok({ status: res.statusCode ?? 0, referrer: res.headers["referrer-policy"] as string | undefined }));
      });
      req.on("error", fail);
      req.end();
    });
  assert.equal((await withSite("cross-site")).status, 403);
  assert.equal((await withSite("same-site")).status, 403);
  const ok = await withSite("none");
  assert.equal(ok.status, 302, "the refused attempts did not use up the ticket");
  assert.equal(ok.referrer, "no-referrer");
});

test("desktop proof: only the holder of the session token can answer a nonce challenge (a port squatter cannot)", async () => {
  const { createHmac } = await import("node:crypto");
  const n = "n".repeat(24);
  const r = await call("GET", `/desktop/proof?n=${n}`, undefined, {}, null);
  assert.equal(r.status, 200);
  assert.equal(r.json.proof, createHmac("sha256", auth.userToken).update(`agentmom-desktop-proof:${n}`).digest("hex"));
  assert.ok(!JSON.stringify(r.json).includes(auth.userToken));
  assert.equal((await call("GET", "/desktop/proof?n=short", undefined, {}, null)).status, 400);
  assert.equal((await call("GET", "/desktop/proof", undefined, {}, null)).status, 400);
});

// ---- Faz 11 dilim 4: kullanım-tabanlı denetimli yedek uçları ----
test("backup endpoints: user token only; the scheduler is optional (503 without one)", async () => {
  assert.equal((await call("GET", "/api/backup/status", undefined, {}, null)).status, 401);
  assert.equal((await call("GET", "/api/backup/status", undefined, {}, agentToken)).status, 403);
  assert.equal((await call("POST", "/api/backup/run", {}, {}, agentToken)).status, 403);
  assert.equal((await call("GET", "/api/backup/status")).status, 503, "no scheduler wired in this test server");
  assert.equal((await call("POST", "/api/backup/run", { x: 1 })).status, 400);
});

// ---- Faz 11 D3b: sır deposu yalnız referans adları ----
test("secret refs endpoint: user token only, 503 when no store is wired; the response can only ever carry well-formed references", async () => {
  assert.equal((await call("GET", "/api/secrets/refs", undefined, {}, null)).status, 401);
  assert.equal((await call("GET", "/api/secrets/refs", undefined, {}, agentToken)).status, 403);
  assert.equal((await call("GET", "/api/secrets/refs")).status, 503, "this test server has no secret store wired");
  assert.equal((await call("POST", "/api/secrets/refs", {})).status, 404, "no write path exists");
});
