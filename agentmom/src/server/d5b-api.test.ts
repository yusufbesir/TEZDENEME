// D5b uçları testleri (geçici izinler, değişiklik defteri, otomasyon). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite + gerçek HTTP sunucusu; sağlayıcılar betikli ikizlerdir (model çağrısı, internet, silme yok).
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
import { AutomationEngine } from "../automation/automation.ts";
import { createApp } from "./app.ts";

const BASE = mkTmp("agentmom-d5b-");
let server: Server;
let port: number;
let db: Db;
let auth: AuthRegistry;
let agentToken: string;
let automation: AutomationEngine;

before(async () => {
  const dbPath = join(BASE, "d5b.db");
  db = openDb(dbPath);
  migrate(db);
  automation = new AutomationEngine(db);
  const audit = new AuditLog([new SqliteAuditSink(db), automation]);
  auth = new AuthRegistry();
  agentToken = auth.issueAgentToken("test-agent");
  const registry = new ProviderRegistry(db);
  registry.register(new ScriptedAdapter("claude-code", () => ({ summary: "ok" })));
  const worktreeRoot = join(BASE, "wt");
  const workflows = new WorkflowStore(db);
  const contract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedProviders: ["claude-code"], allowedDirs: [BASE], allowedActions: ["task.create" as const, "file.read" as const, "file.write" as const, "verification.run" as const], approvalRequiredActions: ["file.write" as const, "verification.run" as const] };
  const engine = new WorkflowEngine({ tasks: new TaskStore(db), audit, registry, evidence: new EvidenceStore(db), store: workflows, contract, worktreeRoot });
  const config = structuredClone(DEFAULT_CONFIG);
  config.policy.defaultContract = contract;
  server = createApp({ db, dbPath, config, audit, auth, registry, engine, workflows, worktreeRoot, automation });
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


const scope = () => join(BASE, "proje");
const grantBody = (patch: object = {}) => ({ action: "file.write", scopeDir: scope(), reason: "refactor için", ttlMinutes: 30, maxUses: 1, ...patch });
const taskBody = (action = "file.write", target = join(scope(), "a.ts")) => ({ title: "yaz", request: { action, target } });

test("auth: no token 401, agent token 403 on every D5b route (reads and writes)", async () => {
  for (const p of ["/api/grants", "/api/changes", "/api/automation"]) {
    assert.equal((await call("GET", p, undefined, null)).status, 401, p);
    assert.equal((await call("GET", p, undefined, agentToken)).status, 403, p);
  }
  for (const [p, b] of [["/api/grants", grantBody()], ["/api/changes", { kind: "manual", summary: "bir şey", reason: "çünkü" }], ["/api/automation/rules", { name: "kural", eventPattern: "x.y", actionKind: "notify", params: { message: "mesaj" }, cooldownSeconds: 60 }]] as const) {
    assert.equal((await call("POST", p, b, agentToken)).status, 403, `agent POST ${p}`);
    assert.equal((await call("POST", p, b, null)).status, 401, `anon POST ${p}`);
  }
});

test("temporary grant: without one the agent's file.write waits for approval; with one it is allowed exactly maxUses times; revoke kills it; everything is audited and in the ledger", async () => {
  const before = await call("POST", "/api/tasks", taskBody(), agentToken);
  assert.equal(before.json.task.state, "awaiting_approval");
  const g = await call("POST", "/api/grants", grantBody());
  assert.equal(g.status, 201);
  assert.equal(g.json.grant.state, "active");
  const t1 = await call("POST", "/api/tasks", taskBody(), agentToken);
  assert.equal(t1.status, 201);
  assert.equal(t1.json.decision.rule, "temporary_grant");
  assert.equal(t1.json.task.state, "approved");
  const t2 = await call("POST", "/api/tasks", taskBody(), agentToken);
  assert.equal(t2.json.task.state, "awaiting_approval", "single use is spent");
  assert.equal((await call("GET", "/api/grants")).json.grants[0].state, "exhausted");
  const g2 = await call("POST", "/api/grants", grantBody({ maxUses: 5 }));
  assert.equal((await call("POST", `/api/grants/${g2.json.grant.id}/revoke`, {}, agentToken)).status, 403);
  assert.equal((await call("POST", `/api/grants/${g2.json.grant.id}/revoke`, {})).json.grant.state, "revoked");
  assert.equal((await call("POST", `/api/grants/${g2.json.grant.id}/revoke`, {})).status, 409);
  assert.equal((await call("POST", "/api/tasks", taskBody(), agentToken)).json.task.state, "awaiting_approval");
  const actions = (db.prepare("SELECT action FROM audit_events WHERE action LIKE 'grant.%' ORDER BY rowid").all() as Array<{ action: string }>).map((r) => r.action);
  assert.deepEqual(actions, ["grant.create", "grant.use", "grant.create", "grant.revoke"]);
  const kinds = (await call("GET", "/api/changes?kind=grant")).json.changes.map((c: { summary: string }) => c.summary);
  assert.equal(kinds.length, 3);
});

test("grant validation over HTTP: unknown fields 400, ungrantable action 400, scope outside the contract 400, ttl too long 400", async () => {
  assert.equal((await call("POST", "/api/grants", { ...grantBody(), extra: 1 })).status, 400);
  assert.equal((await call("POST", "/api/grants", grantBody({ action: "shell.exec" }))).status, 400);
  assert.equal((await call("POST", "/api/grants", grantBody({ scopeDir: join(BASE, "..") }))).status, 400);
  assert.equal((await call("POST", "/api/grants", grantBody({ ttlMinutes: 2000 }))).status, 400);
  assert.equal((await call("POST", "/api/grants", grantBody({ maxUses: 500 }))).status, 400);
});

test("a grant never turns a policy denial into an allow over HTTP (action not in the contract)", async () => {
  await call("POST", "/api/grants", grantBody({ action: "verification.run", maxUses: 3 }));
  const r = await call("POST", "/api/tasks", { title: "kabuk", request: { action: "shell.exec", target: scope() } }, agentToken);
  assert.equal(r.status, 403);
  assert.equal(r.json.decision.rule, "action_not_allowed");
});

test("approve and deny write semantic ledger entries linked to the task; manual entries are user-only and validated", async () => {
  const t = await call("POST", "/api/tasks", taskBody("file.write", join(BASE, "baska", "x.ts")), agentToken);
  assert.equal(t.json.task.state, "awaiting_approval");
  assert.equal((await call("POST", `/api/tasks/${t.json.task.id}/approve`, {})).status, 200);
  const list = (await call("GET", `/api/changes?taskId=${t.json.task.id}`)).json.changes;
  assert.equal(list.length, 1);
  assert.equal(list[0].kind, "task_decision");
  assert.match(list[0].summary, /onaylandı/);
  const m = await call("POST", "/api/changes", { kind: "manual", summary: "Elle not", reason: "denetim için", files: ["a.ts"] });
  assert.equal(m.status, 201);
  assert.equal((await call("POST", "/api/changes", { kind: "bilinmeyen", summary: "xx yy", reason: "zz zz" })).status, 400);
  assert.equal((await call("POST", "/api/changes", { kind: "manual", summary: "xx yy", reason: "zz zz", baska: 1 })).status, 400);
});

test("automation over HTTP: a notify rule fires on a matching event; a record_task rule opens a policy-checked task; disable stops it; agents cannot create or toggle rules", async () => {
  const rn = await call("POST", "/api/automation/rules", { name: "görev bildir", eventPattern: "task.create:file.read", actionKind: "notify", params: { message: "Bir okuma görevi açıldı" }, cooldownSeconds: 10 });
  assert.equal(rn.status, 201);
  const rt = await call("POST", "/api/automation/rules", { name: "doğrulama kaydı", eventPattern: "task.approve", actionKind: "record_task", params: { title: "Onay sonrası doğrulama", action: "verification.run", target: scope() }, cooldownSeconds: 10 });
  assert.equal(rt.status, 201);
  assert.equal((await call("POST", "/api/automation/rules", { name: "kural", eventPattern: "*", actionKind: "notify", params: { message: "mesaj" }, cooldownSeconds: 10 })).status, 400);
  await call("POST", "/api/tasks", taskBody("file.read", join(BASE, "a.txt")), agentToken);
  const t = await call("POST", "/api/tasks", taskBody("file.write", join(BASE, "baska", "y.ts")), agentToken);
  await call("POST", `/api/tasks/${t.json.task.id}/approve`, {});
  await automation.idle();
  await automation.idle();
  const view = (await call("GET", "/api/automation")).json;
  const outcomes = view.runs.map((x: { outcome: string }) => x.outcome).sort();
  assert.deepEqual(outcomes, ["notified", "task_recorded"]);
  const tasks = (await call("GET", "/api/tasks")).json.tasks;
  const opened = tasks.filter((x: { title: string }) => x.title === "Onay sonrası doğrulama");
  assert.equal(opened.length, 1);
  assert.equal(opened[0].state, "awaiting_approval", "the policy engine still asks for approval; automation cannot approve");
  assert.equal((await call("POST", `/api/automation/rules/${rt.json.rule.id}/disable`, {}, agentToken)).status, 403);
  assert.equal((await call("POST", `/api/automation/rules/${rt.json.rule.id}/disable`, {})).json.rule.enabled, false);
  assert.equal((await call("POST", `/api/automation/rules/${rt.json.rule.id}/enable`, {})).json.rule.enabled, true);
  assert.equal((await call("POST", `/api/automation/rules/00000000-0000-0000-0000-000000000000/enable`, {})).status, 404);
});

test("scheduled automation over HTTP: schedule rules validated, view has trigger and nextRunAt, run-now is user-only, record_task waits for approval, run_analysis writes a short summary, no model/network", async () => {
  const sched = (patch: object = {}) => ({ name: "zamanlı kural", trigger: { kind: "schedule", schedule: { kind: "interval", everyMinutes: 15 } }, actionKind: "notify", params: { message: "Zamanlı mesaj" }, cooldownSeconds: 10, ...patch });
  assert.equal((await call("POST", "/api/automation/rules", sched(), agentToken)).status, 403);
  assert.equal((await call("POST", "/api/automation/rules", sched(), null)).status, 401);
  for (const bad of [
    sched({ eventPattern: "task.approve" }),
    sched({ trigger: { kind: "schedule", schedule: { kind: "interval", everyMinutes: 5 } } }),
    sched({ trigger: { kind: "schedule", schedule: { kind: "daily", at: "25:00" } } }),
    sched({ trigger: { kind: "schedule", schedule: { kind: "daily", at: "09:00", weekdays: [9] } } }),
    sched({ actionKind: "run_analysis", params: { analysis: "shell" } }),
    sched({ actionKind: "model_task", params: { message: "x y z" } }),
    { name: "olay analizi", eventPattern: "task.approve", actionKind: "run_analysis", params: { analysis: "attention" }, cooldownSeconds: 10 },
    sched({ unknownField: 1 }),
  ]) assert.equal((await call("POST", "/api/automation/rules", bad)).status, 400, JSON.stringify(bad));

  const rn = await call("POST", "/api/automation/rules", sched({ name: "zamanlı bildirim" }));
  assert.equal(rn.status, 201);
  assert.equal(rn.json.rule.trigger.kind, "schedule");
  assert.equal(typeof rn.json.rule.nextRunAt, "string");
  const rt = await call("POST", "/api/automation/rules", sched({ name: "zamanlı görev", trigger: { kind: "schedule", schedule: { kind: "daily", at: "09:30", weekdays: [1, 2, 3, 4, 5] } }, actionKind: "record_task", params: { title: "Zamanlı doğrulama", action: "verification.run", target: scope() } }));
  assert.equal(rt.status, 201);
  const ra = await call("POST", "/api/automation/rules", sched({ name: "zamanlı analiz", actionKind: "run_analysis", params: { analysis: "attention" } }));
  assert.equal(ra.status, 201);
  const view = (await call("GET", "/api/automation")).json;
  const mine = view.rules.find((r: { id: string }) => r.id === rt.json.rule.id);
  assert.deepEqual(mine.trigger, { kind: "schedule", schedule: { kind: "daily", at: "09:30", weekdays: [1, 2, 3, 4, 5] } });
  assert.equal(typeof mine.nextRunAt, "string");
  assert.deepEqual(view.analyses, ["attention", "halflife", "learning", "absence", "continuity", "offline", "shadow-price"]);
  assert.ok(view.rules.some((r: { trigger: { kind: string } }) => r.trigger.kind === "event"), "olay kuralları eskisi gibi görünür");

  // run-now
  assert.equal((await call("POST", `/api/automation/rules/${rn.json.rule.id}/run-now`, {}, agentToken)).status, 403);
  assert.equal((await call("POST", `/api/automation/rules/${rn.json.rule.id}/run-now`, {}, null)).status, 401);
  assert.equal((await call("POST", `/api/automation/rules/${rn.json.rule.id}/run-now`, { x: 1 })).status, 400);
  assert.equal((await call("POST", `/api/automation/rules/00000000-0000-0000-0000-000000000000/run-now`, {})).status, 404);
  const ev = view.rules.find((r: { trigger: { kind: string } }) => r.trigger.kind === "event");
  assert.equal((await call("POST", `/api/automation/rules/${ev.id}/run-now`, {})).status, 409);
  const notified = await call("POST", `/api/automation/rules/${rn.json.rule.id}/run-now`, {});
  assert.equal(notified.status, 200);
  assert.equal(notified.json.run.outcome, "notified");
  assert.equal((await call("POST", `/api/automation/rules/${rn.json.rule.id}/run-now`, {})).json.run.outcome, "skipped_cooldown");

  const tasksBefore = (await call("GET", "/api/tasks")).json.tasks.length;
  const recorded = await call("POST", `/api/automation/rules/${rt.json.rule.id}/run-now`, {});
  assert.equal(recorded.json.run.outcome, "task_recorded");
  const tasks = (await call("GET", "/api/tasks")).json.tasks;
  assert.equal(tasks.length, tasksBefore + 1);
  const opened = tasks.filter((x: { title: string }) => x.title === "Zamanlı doğrulama");
  assert.equal(opened.length, 1);
  assert.equal(opened[0].state, "awaiting_approval", "kullanıcı yokken sessiz yürütme yok: onay bekler");

  let fetches = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    fetches++;
    throw new Error("ağ çağrısı olmamalı");
  }) as typeof fetch;
  try {
    const analysed = await call("POST", `/api/automation/rules/${ra.json.rule.id}/run-now`, {});
    assert.equal(analysed.json.run.outcome, "scheduled_ok");
    assert.match(analysed.json.run.message, /^attention: bekleyen onay: \d+/);
    assert.ok(analysed.json.run.message.length <= 300);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(fetches, 0);

  await call("POST", `/api/automation/rules/${ra.json.rule.id}/disable`, {});
  assert.equal((await call("POST", `/api/automation/rules/${ra.json.rule.id}/run-now`, {})).status, 409);
  const audits = (db.prepare("SELECT action FROM audit_events WHERE action IN ('automation.rule_run_now', 'automation.rule_create')").all() as Array<{ action: string }>).map((r) => r.action);
  assert.ok(audits.includes("automation.rule_run_now"));
  const led = (await call("GET", "/api/changes?kind=automation")).json.changes.map((c: { summary: string }) => c.summary);
  assert.ok(led.some((s: string) => /elle çalıştırıldı/.test(s)));
});
