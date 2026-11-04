// Sağlayıcı detay/test/devre dışı ve D3 liste uçları testleri (Faz 11, D3). Yazan: Claude [İP:AgentMom Faz 11 D3]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite + gerçek HTTP sunucusu; sağlayıcılar betikli test ikizleridir (gerçek CLI, model çağrısı, internet ve dosya silme yok).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
import type { Server } from "node:http";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { AuditLog, MemoryAuditSink, SqliteAuditSink } from "../core/audit/audit.ts";
import { AuthRegistry } from "../core/auth/auth.ts";
import { DEFAULT_CONFIG } from "../core/config/config.ts";
import { openDb } from "../core/db/db.ts";
import type { Db } from "../core/db/db.ts";
import { loadMigrations, migrate, rollback } from "../core/db/migrate.ts";
import { TaskStore } from "../core/tasks/tasks.ts";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import type { ConnectionReport } from "../providers/contract.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { ScriptedAdapter } from "../testing/scripted-adapter.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import type { TaskContract } from "../workflows/types.ts";
import { createApp } from "./app.ts";
import { runConnectionTest, statusFromReport } from "./providers-api.ts";

const BASE = mkTmp("agentmom-prov-");
const USER = { kind: "user", id: "yusuf" } as const;

class ReportingAdapter extends ScriptedAdapter {
  private readonly report: () => Promise<ConnectionReport>;
  constructor(id: string, report: () => Promise<ConnectionReport>) {
    super(id, () => ({ summary: "ok" }));
    this.report = report;
  }
  override testConnection(): Promise<ConnectionReport> {
    return this.report();
  }
}

let server: Server;
let port: number;
let db: Db;
let dbPath: string;
let audit: AuditLog;
let auth: AuthRegistry;
let agentToken: string;
let registry: ProviderRegistry;
let workflows: WorkflowStore;
let engine: WorkflowEngine;
const primary = new ScriptedAdapter("prim-a", () => ({ summary: "ok" }));
const fallback = new ScriptedAdapter("fall-b", () => ({ summary: "ok" }));

before(async () => {
  dbPath = join(BASE, "p.db");
  db = openDb(dbPath);
  migrate(db);
  audit = new AuditLog([new SqliteAuditSink(db), new MemoryAuditSink()]);
  auth = new AuthRegistry();
  agentToken = auth.issueAgentToken("test-agent");
  registry = new ProviderRegistry(db);
  registry.register(new ScriptedAdapter("claude-code", () => ({ summary: "ok" })));
  registry.register(new ReportingAdapter("codex", async () => ({ reachable: true, authenticated: true, version: "0.99.1", detail: "logged in", checkedAt: "2026-10-22T00:00:00.000Z" })));
  registry.register(new ReportingAdapter("gemini", async () => {
    throw new Error("spawn failed token=abcdefghijklmnop1234");
  }));
  registry.register(primary);
  registry.register(fallback);
  const worktreeRoot = join(BASE, "wt");
  workflows = new WorkflowStore(db);
  const contract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedProviders: ["claude-code", "prim-a", "fall-b"], allowedDirs: [BASE] };
  engine = new WorkflowEngine({ tasks: new TaskStore(db), audit, registry, evidence: new EvidenceStore(db), store: workflows, contract, worktreeRoot });
  const config = structuredClone(DEFAULT_CONFIG);
  config.policy.defaultContract = contract;
  server = createApp({ db, dbPath, config, audit, auth, registry, engine, workflows, worktreeRoot });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const addr = server.address();
  port = typeof addr === "object" && addr ? addr.port : 0;
});

after(async () => {
  await new Promise<void>((ok) => server.close(() => ok()));
  db.close();
});

interface Reply {
  status: number;
  json: any;
}

function call(method: string, path: string, body?: unknown, token: string | null = auth.userToken): Promise<Reply> {
  return new Promise((ok, fail) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port,
        method,
        path,
        headers: { host: `127.0.0.1:${port}`, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(payload ? { "content-type": "application/json" } : {}) },
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

function approvedTask(title = "iş"): string {
  const tasks = new TaskStore(db);
  const t = tasks.create({ title, requestedAction: "file.read", request: {}, decision: "allow" });
  tasks.transition(t.id, "approved", USER);
  return t.id;
}

test("auth: no token 401, agent token 403 on every new read and write route", async () => {
  const reads = ["/api/providers/claude-code", "/api/workflows", "/api/verification/runs", "/api/capabilities", "/api/help/claude-code"];
  const writes = ["/api/providers/claude-code/test", "/api/providers/claude-code/disable", "/api/providers/claude-code/enable"];
  for (const p of reads) {
    assert.equal((await call("GET", p, undefined, null)).status, 401, `GET ${p} without token`);
    assert.equal((await call("GET", p, undefined, agentToken)).status, 403, `GET ${p} with agent token`);
  }
  for (const p of writes) {
    assert.equal((await call("POST", p, {}, null)).status, 401, `POST ${p} without token`);
    assert.equal((await call("POST", p, {}, agentToken)).status, 403, `POST ${p} with agent token`);
  }
  assert.equal(registry.isDisabled("claude-code"), false, "the agent could not disable anything");
});

test("provider id: invalid 400, unknown 404, extra body field 400, wrong verb 404", async () => {
  for (const bad of ["Claude", "a_b", "x".repeat(41), "a.b", "a%2Fb", "%00"]) assert.equal((await call("GET", `/api/providers/${bad}`)).status, 400, bad);
  // A dot-segment is normalized away by the URL parser before routing: it never reaches a provider route.
  assert.equal((await call("GET", "/api/providers/%2e%2e")).status, 404);
  assert.equal((await call("GET", "/api/providers/nope")).status, 404);
  assert.equal((await call("POST", "/api/providers/nope/disable", {})).status, 404);
  assert.equal((await call("POST", "/api/providers/claude-code/disable", { reason: "x" })).status, 400);
  assert.equal((await call("POST", "/api/providers/claude-code/delete", {})).status, 404);
  assert.equal((await call("GET", "/api/providers/claude-code/test")).status, 404);
});

test("detail: shape, policy flag, models/lastSuccess/lastErrors only from audit records, secrets redacted, limits null", async () => {
  const attempt = randomUUID();
  const taskId = randomUUID();
  audit.record({ initiator: { kind: "system", id: "orchestrator" }, action: "run.started", decision: "allow", result: `attempt ${attempt}`, details: { taskId, providerId: "claude-code" } });
  audit.record({ initiator: { kind: "agent", id: "claude-code" }, action: "provider.event:started", decision: "n/a", result: "started", details: { taskId, attemptId: attempt, data: { subtype: "init", model: "claude-opus-5-5" } } });
  audit.record({ initiator: { kind: "system", id: "orchestrator" }, action: "run.finished", decision: "n/a", result: "succeeded", details: { taskId, attemptId: attempt, exitCode: 0 } });
  audit.record({ initiator: { kind: "system", id: "orchestrator" }, action: "run.refused:provider.call", decision: "deny", result: "provider_not_allowed", details: { taskId, providerId: "claude-code", reason: "not in contract" } });
  // An older raw row with a secret: the detail must redact it again (defense in depth), and keep it short.
  db.prepare("INSERT INTO audit_events (id, ts, initiator_kind, initiator_id, action, decision, result, details_json) VALUES (?, ?, 'agent', 'claude-code', 'provider.event:error', 'n/a', 'error', ?)").run(
    randomUUID(),
    new Date(Date.now() + 1000).toISOString(),
    JSON.stringify({ data: { message: `boom sk-ant-${"Z".repeat(30)} ${"y".repeat(500)}` } }),
  );
  // Another provider's events never leak into this one.
  audit.record({ initiator: { kind: "agent", id: "codex" }, action: "provider.event:started", decision: "n/a", result: "started", details: { attemptId: randomUUID(), data: { model: "gpt-x" } } });

  const r = await call("GET", "/api/providers/claude-code");
  assert.equal(r.status, 200);
  const p = r.json.provider;
  for (const k of ["id", "displayName", "routeKind", "authMethod", "enabled", "allowedByPolicy", "version", "capabilities", "models", "lastSuccess", "lastErrors", "docs", "limits"]) assert.ok(k in p, k);
  assert.equal(p.id, "claude-code");
  assert.equal(p.authMethod, "abonelik oturumu (CLI)");
  assert.equal(p.enabled, true);
  assert.equal(p.allowedByPolicy, true);
  assert.equal(p.version, null, "no test ran yet: version unknown");
  assert.equal(p.limits, null);
  assert.equal(p.docs, "claude-code");
  assert.deepEqual(p.models.map((m: any) => [m.model, m.runs]), [["claude-opus-5-5", 1]]);
  assert.equal(p.lastSuccess.model, "claude-opus-5-5");
  assert.ok(p.lastErrors.length >= 2 && p.lastErrors.length <= 5);
  const text = JSON.stringify(p.lastErrors);
  assert.ok(!text.includes("sk-ant-ZZZZ"), "secret redacted");
  assert.ok(p.lastErrors.every((e: any) => e.message.length <= 200));
  assert.ok(p.lastErrors.some((e: any) => e.kind === "run.refused:provider.call" && /not in contract/.test(e.message)));
  assert.ok(p.capabilities.every((c: any) => "operation" in c && "status" in c && "evidence" in c && "verifiedAt" in c));
  assert.ok(p.capabilities.every((c: any) => c.status === "verified" || c.verifiedAt === null), "verifiedAt only for verified capabilities");

  const codex = (await call("GET", "/api/providers/codex")).json.provider;
  assert.equal(codex.allowedByPolicy, false, "codex is not in the test contract");
  assert.deepEqual(codex.models.map((m: any) => m.model), ["gpt-x"]);
  assert.equal(codex.lastSuccess, null);
  assert.equal((await call("GET", "/api/providers/prim-a")).json.provider.docs, null);
});

test("test endpoint: local only, honest status (never verified without a confirmed login), dated evidence, audit, 15 s rate limit", async () => {
  // Scripted claude-code: reachable, login state unknown -> partial, NOT verified.
  const r = await call("POST", "/api/providers/claude-code/test", {});
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.test.status, "partial");
  const cap = r.json.provider.capabilities.find((c: any) => c.operation === "testConnection");
  assert.equal(cap.status, "partial");
  assert.match(cap.evidence, /local testConnection at \d{4}-\d{2}-\d{2}T/);
  assert.match(cap.evidence, /no model call/);
  assert.equal(cap.verifiedAt, null);
  assert.equal(primary.calls.length + fallback.calls.length, 0, "a test never executes a provider");
  const stored = registry.list().find((p) => p.id === "claude-code")!.capabilities.find((c) => c.operation === "testConnection")!;
  assert.equal(stored.status, "partial", "written to the capability table");
  // Rate limit per provider.
  assert.equal((await call("POST", "/api/providers/claude-code/test", {})).status, 429);
  // A confirmed login -> verified, with the version recorded.
  const c = await call("POST", "/api/providers/codex/test", {});
  assert.equal(c.json.test.status, "verified");
  assert.equal(c.json.provider.version, "0.99.1");
  assert.ok(c.json.provider.capabilities.find((x: any) => x.operation === "testConnection").verifiedAt);
  // A failing test -> unverified, the error text is redacted.
  const g = await call("POST", "/api/providers/gemini/test", {});
  assert.equal(g.json.test.status, "unverified");
  assert.ok(!JSON.stringify(g.json).includes("abcdefghijklmnop1234"));
  const ev = db.prepare("SELECT result, details_json FROM audit_events WHERE action = 'provider.test' ORDER BY rowid").all() as Array<{ result: string; details_json: string }>;
  assert.deepEqual(ev.map((e) => [JSON.parse(e.details_json).providerId, e.result]), [["claude-code", "partial"], ["codex", "verified"], ["gemini", "unverified"]]);
});

test("connection test: timeout gives unverified (no hang), report mapping is conservative", async () => {
  const hang = new ReportingAdapter("hangs", () => new Promise<ConnectionReport>(() => undefined));
  registry.register(hang);
  const t0 = Date.now();
  const out = await runConnectionTest({ registry, audit, now: () => new Date() }, "hangs", USER, 50);
  assert.ok(Date.now() - t0 < 2000);
  assert.equal(out.status, "unverified");
  assert.equal(out.timedOut, true);
  assert.equal(statusFromReport(null), "unverified");
  assert.equal(statusFromReport({ reachable: false, authenticated: true, version: null, detail: "", checkedAt: "" }), "unverified");
  assert.equal(statusFromReport({ reachable: true, authenticated: false, version: null, detail: "", checkedAt: "" }), "partial");
  assert.equal(statusFromReport({ reachable: true, authenticated: true, version: null, detail: "", checkedAt: "" }), "verified");
});

test("disable is FAIL-CLOSED on every execution path and never switches to another provider; enable restores; state persists across reopen", async () => {
  const d = await call("POST", "/api/providers/prim-a/disable", {});
  assert.equal(d.status, 200);
  assert.equal(d.json.provider.enabled, false);
  assert.equal(d.json.provider.state.changedBy, "user:local-user", "who changed it comes from the token, never from the body");
  assert.equal(registry.get("prim-a"), undefined);
  assert.throws(() => registry.require("prim-a"), /disabled/);
  assert.throws(() => registry.forOperation("prim-a", "execute"), /disabled/);
  const listed = (await call("GET", "/api/providers")).json.providers.find((p: any) => p.id === "prim-a");
  assert.equal(listed.disabled, true, "still listed, marked disabled");
  assert.equal((await call("POST", "/api/providers/prim-a/test", {})).status, 409, "a disabled provider is not even tested");

  // Single run: refused, no other provider runs instead.
  const t1 = approvedTask("tek çalıştırma");
  const run = await call("POST", `/api/tasks/${t1}/run`, { providerId: "prim-a", repoPath: BASE, prompt: "x" });
  assert.equal(run.status, 409);
  assert.equal(run.json.code, "unknown_provider");

  // Workflow creation through the API: rejected.
  const t2 = approvedTask("akış api");
  workflows.setContract(t2, { goal: "g", acceptance: [{ id: "a1", text: "t" }], writeScopes: [], constraints: [] } as unknown as TaskContract);
  const wfr = await call("POST", `/api/tasks/${t2}/workflow`, { repoPath: BASE, definition: { steps: [{ role: "plan", providerId: "prim-a", fallbackProviders: ["fall-b"] }] } });
  assert.equal(wfr.status, 400, JSON.stringify(wfr.json));

  // A workflow created BEFORE the provider was disabled: the engine fails closed, the fallback is NOT used.
  const t3 = approvedTask("akış motor");
  workflows.setContract(t3, { goal: "g", acceptance: [{ id: "a1", text: "t" }], writeScopes: [], constraints: [] } as unknown as TaskContract);
  const wid = workflows.create(t3, BASE, { steps: [{ role: "plan", providerId: "prim-a", fallbackProviders: ["fall-b"] }] });
  const outcome = await engine.start(wid);
  assert.equal(outcome.state, "failed");
  assert.match(outcome.error ?? "", /^unknown_provider/);
  assert.equal(primary.calls.length, 0);
  assert.equal(fallback.calls.length, 0, "no switch to another provider");

  const ev = db.prepare("SELECT initiator_kind, initiator_id, details_json FROM audit_events WHERE action = 'provider.disable'").all() as Array<Record<string, string>>;
  assert.equal(ev.length, 1);
  assert.equal(ev[0]!.initiator_kind, "user");
  assert.equal(JSON.parse(ev[0]!.details_json as string).changedBy, "user:local-user");

  // Persists: a fresh registry on a fresh connection to the same file sees it disabled.
  const db2 = openDb(dbPath);
  const reg2 = new ProviderRegistry(db2);
  reg2.register(new ScriptedAdapter("prim-a", () => ({ summary: "ok" })));
  assert.equal(reg2.get("prim-a"), undefined);
  assert.equal(reg2.list().find((p) => p.id === "prim-a")?.disabled, true);
  // Rows are never deleted.
  assert.throws(() => db2.prepare("DELETE FROM provider_state").run(), /never deleted/);
  db2.close();

  const e = await call("POST", "/api/providers/prim-a/enable", {});
  assert.equal(e.status, 200);
  assert.equal(e.json.provider.enabled, true);
  assert.equal(registry.get("prim-a")?.id, "prim-a");
  const db3 = openDb(dbPath);
  const reg3 = new ProviderRegistry(db3);
  assert.equal(reg3.isDisabled("prim-a"), false, "enable persists too");
  db3.close();
});

test("GET /api/workflows: newest first, contract shape, at most 100", async () => {
  const r = await call("GET", "/api/workflows");
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.json.workflows) && r.json.workflows.length >= 1 && r.json.workflows.length <= 100);
  const w = r.json.workflows[0];
  assert.deepEqual(Object.keys(w).sort(), ["createdAt", "id", "state", "stepsDone", "stepsTotal", "taskId", "title", "updatedAt"]);
  assert.equal(w.title, "akış motor");
  assert.equal(w.stepsTotal, 1);
  assert.equal(w.stepsDone, 0);
});

test("GET /api/verification/runs: limit validated 1..200, totals only from stored results", async () => {
  const taskId = approvedTask("doğrulama");
  const wid = workflows.create(taskId, BASE, { steps: [{ role: "verify" }] });
  workflows.addVerificationRun(taskId, wid, 0, { runId: randomUUID(), provider: "node-test", status: "failed", totals: { passed: 7, failed: 1, skipped: 2, error: 1 } } as any);
  for (const bad of ["0", "201", "-1", "abc", "1.5", "9999"]) assert.equal((await call("GET", `/api/verification/runs?limit=${bad}`)).status, 400, bad);
  const r = await call("GET", "/api/verification/runs?limit=1");
  assert.equal(r.status, 200);
  assert.equal(r.json.runs.length, 1);
  const v = r.json.runs[0];
  assert.deepEqual(Object.keys(v).sort(), ["createdAt", "failed", "id", "passed", "provider", "status", "taskId", "total"]);
  assert.deepEqual([v.passed, v.failed, v.total, v.status], [7, 2, 11, "failed"]);
  assert.equal((await call("GET", "/api/verification/runs")).status, 200, "default limit");
});

test("GET /api/capabilities: the status file as stored, read at request time", async () => {
  const r = await call("GET", "/api/capabilities");
  assert.equal(r.status, 200);
  assert.equal(r.json.summary.total, 100);
  assert.equal(r.json.items.length, 100);
  for (const k of ["n", "en", "tr", "sahip", "durum", "kanit", "eksik", "dilim"]) assert.ok(k in r.json.items[0], k);
});

test("help: integration and capability documents are on the fixed list; others are not", async () => {
  for (const name of ["claude-code", "codex", "gemini", "yetenekler", "egitim"]) {
    const r = await call("GET", `/api/help/${name}`);
    assert.equal(r.status, 200, name);
    assert.ok(r.json.text.length > 100, name);
  }
  assert.equal((await call("GET", "/api/help/package")).status, 404);
  assert.equal((await call("GET", "/api/help/..%2fpackage")).status, 404);
});

test("migration 012 rolls back and re-applies cleanly", () => {
  const d = openDb(join(BASE, "rb.db"));
  migrate(d);
  assert.deepEqual(rollback(d, 11), Array.from({ length: loadMigrations().length - 11 }, (_, i) => loadMigrations().length - i));
  assert.equal(d.prepare("SELECT count(*) AS c FROM sqlite_master WHERE name = 'provider_state'").get()?.c, 0);
  assert.deepEqual(migrate(d), Array.from({ length: loadMigrations().length - 11 }, (_, i) => 12 + i));
  d.close();
});
