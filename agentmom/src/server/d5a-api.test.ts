// D5a uçları testleri: eylem anlamları, denetim zinciri doğrulaması, canlı izleme, görevlerde risk/semantics alanları. Yazan: Claude [İP:AgentMom D5a];
// sahip: Yusuf. Yalnız yazan yapay zeka değiştirir. Gerçek SQLite + gerçek HTTP sunucusu; sağlayıcılar betikli ikizlerdir (model çağrısı, internet, silme yok).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import type { Server } from "node:http";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { AuditLog, SqliteAuditSink } from "../core/audit/audit.ts";
import { AuthRegistry } from "../core/auth/auth.ts";
import { DEFAULT_CONFIG } from "../core/config/config.ts";
import { openDb } from "../core/db/db.ts";
import type { Db } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { ACTION_TYPES } from "../core/policy/types.ts";
import { TaskStore } from "../core/tasks/tasks.ts";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { ScriptedAdapter } from "../testing/scripted-adapter.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { createApp } from "./app.ts";

const BASE = mkTmp("agentmom-d5a-");
let server: Server;
let port: number;
let db: Db;
let auth: AuthRegistry;
let agentToken: string;

before(async () => {
  const dbPath = join(BASE, "d5a.db");
  db = openDb(dbPath);
  migrate(db);
  const audit = new AuditLog([new SqliteAuditSink(db)]);
  auth = new AuthRegistry();
  agentToken = auth.issueAgentToken("test-agent");
  const registry = new ProviderRegistry(db);
  registry.register(new ScriptedAdapter("claude-code", () => ({ summary: "ok" })));
  const worktreeRoot = join(BASE, "wt");
  const workflows = new WorkflowStore(db);
  const contract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedProviders: ["claude-code"], allowedDirs: [BASE], allowedActions: ["task.create" as const, "file.read" as const, "file.write" as const], approvalRequiredActions: ["file.write" as const] };
  const engine = new WorkflowEngine({ tasks: new TaskStore(db), audit, registry, evidence: new EvidenceStore(db), store: workflows, contract, worktreeRoot });
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

function call(method: string, path: string, body?: unknown, token: string | null = auth.userToken): Promise<{ status: number; json: any }> {
  return new Promise((ok, fail) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = httpRequest(
      { host: "127.0.0.1", port, method, path, headers: { host: `127.0.0.1:${port}`, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(payload ? { "content-type": "application/json" } : {}) } },
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

test("auth: no token 401, agent token 403 on every new D5a route", async () => {
  for (const p of ["/api/actions/semantics", "/api/audit/verify", "/api/monitor"]) {
    assert.equal((await call("GET", p, undefined, null)).status, 401, `GET ${p} without token`);
    assert.equal((await call("GET", p, undefined, agentToken)).status, 403, `GET ${p} with agent token`);
  }
});

test("GET /api/actions/semantics lists a record for every policy action", async () => {
  const r = await call("GET", "/api/actions/semantics");
  assert.equal(r.status, 200);
  const names = r.json.actions.map((a: { action: string }) => a.action);
  for (const a of ACTION_TYPES) assert.ok(names.includes(a), a);
  assert.ok(names.includes("file.recycle"));
  const shell = r.json.actions.find((a: { action: string }) => a.action === "shell.exec");
  assert.deepEqual(Object.keys(shell).sort(), ["action", "effect", "reversible", "sensitivity", "undo"]);
});

test("tasks carry computed risk and semantics (additive; existing fields unchanged; not stored)", async () => {
  const created = await call("POST", "/api/tasks", { title: "yaz", request: { action: "file.write", target: join(BASE, "package.json") } });
  assert.equal(created.status, 201);
  assert.equal(created.json.task.state, "awaiting_approval");
  assert.equal(created.json.task.risk.level, "medium");
  assert.ok(created.json.task.risk.reasons.some((r: string) => /yapılandırma/.test(r)));
  assert.equal(created.json.task.semantics.action, "file.write");
  const list = await call("GET", "/api/tasks");
  const t = list.json.tasks.find((x: { id: string }) => x.id === created.json.task.id);
  for (const k of ["id", "title", "description", "state", "requestedAction", "request", "decision", "approvedBy", "createdAt", "updatedAt"]) assert.ok(k in t, k);
  assert.ok(typeof t.risk.score === "number" && t.semantics.reversible === "partial");
  const row = db.prepare("SELECT request_json FROM tasks WHERE id = ?").get(t.id) as { request_json: string };
  assert.ok(!row.request_json.includes("risk"), "risk is computed, never written to the database");
  // Agent-created tasks also get the informational fields; a critical risk adds no server rule (the policy decision is unchanged).
  const agent = await call("POST", "/api/tasks", { title: "ajan", request: { action: "file.read", target: join(BASE, "a.txt") } }, agentToken);
  assert.equal(agent.status, 201);
  assert.equal(agent.json.decision.decision, "allow");
  const approved = await call("POST", `/api/tasks/${created.json.task.id}/approve`, {});
  assert.equal(approved.status, 200);
  assert.equal(approved.json.task.state, "approved");
  assert.ok(approved.json.task.risk && approved.json.task.semantics);
});

test("GET /api/monitor returns the report shape; the waiting task appears with its risk", async () => {
  await call("POST", "/api/tasks", { title: "bekleyen", request: { action: "file.write", target: join(BASE, "x.txt") } });
  const r = await call("GET", "/api/monitor");
  assert.equal(r.status, 200);
  for (const k of ["generatedAt", "running", "awaitingApproval", "slowSteps", "retries", "failedLast24h", "bottleneck", "thresholds"]) assert.ok(k in r.json, k);
  const w = r.json.awaitingApproval.find((a: { title: string }) => a.title === "bekleyen");
  assert.ok(w && typeof w.waitingMin === "number" && w.risk.level);
  assert.ok(["approval_wait", "slow_step", "retries", "none"].includes(r.json.bottleneck.kind));
});

test("GET /api/audit/verify: every row written by the app is chained and the chain verifies", async () => {
  const r = await call("GET", "/api/audit/verify");
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.ok(r.json.total >= 3 && r.json.chained === r.json.total);
  assert.equal(r.json.firstBreak, null);
  assert.ok(!Number.isNaN(Date.parse(r.json.checkedAt)));
});
