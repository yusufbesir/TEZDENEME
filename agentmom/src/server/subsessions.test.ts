// Alt oturum ve kullanım API testleri (Faz 11, dilim 2). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
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
import { ProviderRegistry } from "../providers/registry.ts";
import { ScriptedAdapter } from "../testing/scripted-adapter.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { createApp } from "./app.ts";
import { cleanName, SubsessionStore } from "./subsessions.ts";
import { contextFor, parseStat, usageReport } from "./usage.ts";

const BASE = mkTmp("agentmom-subs-");
const USER = { kind: "user", id: "yusuf" } as const;

let server: Server;
let port: number;
let db: Db;
let audit: AuditLog;
let mem: MemoryAuditSink;
let auth: AuthRegistry;
let agentToken: string;
let registry: ProviderRegistry;

before(async () => {
  const dbPath = join(BASE, "s.db");
  db = openDb(dbPath);
  migrate(db);
  mem = new MemoryAuditSink();
  audit = new AuditLog([new SqliteAuditSink(db), mem]);
  auth = new AuthRegistry();
  agentToken = auth.issueAgentToken("test-agent");
  registry = new ProviderRegistry(db);
  registry.register(new ScriptedAdapter("claude-code", () => ({ summary: "ok" })));
  registry.register(new ScriptedAdapter("codex", () => ({ summary: "ok" })));
  // A provider that was registered once but has no adapter now: its sub-sessions must show "unavailable", never another provider.
  db.prepare("INSERT INTO providers (id, display_name, contract_version, route_kind, registered_at, updated_at) VALUES ('gone', 'Gone', '1', 'local', 'x', 'x')").run();
  const worktreeRoot = join(BASE, "wt");
  const workflows = new WorkflowStore(db);
  const engine = new WorkflowEngine({ tasks: new TaskStore(db), audit, registry, evidence: new EvidenceStore(db), store: workflows, contract: DEFAULT_CONFIG.policy.defaultContract, worktreeRoot });
  server = createApp({ db, dbPath, config: structuredClone(DEFAULT_CONFIG), audit, auth, registry, engine, workflows, worktreeRoot });
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

async function create(body: Record<string, unknown> = { provider: "claude-code" }): Promise<any> {
  const r = await call("POST", "/api/subsessions", body);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.subsession;
}

function newTask(title = "konu"): string {
  return new TaskStore(db).create({ title, requestedAction: "file.read", request: {}, decision: "allow" }).id;
}

test("usage on an EMPTY database: 200 with nulls, nothing invented, no cost", async () => {
  const fresh = openDb(join(BASE, "empty.db"));
  migrate(fresh);
  const rep = usageReport(fresh, () => new Date("2026-10-22T10:00:00.000Z"));
  assert.deepEqual(rep, {
    updatedAt: "2026-10-22T10:00:00.000Z",
    topics: 0,
    runs: { total: 0, reported: 0, unknown: 0 },
    source: "unknown",
    tokens: null,
    cacheHitPct: null,
    codeChanges: null,
    byModel: [],
    topicsTable: [],
    note: "costBasis=list; ücret yok",
  });
  fresh.close();
  // Through the API on the shared database (no runs recorded there yet).
  const r = await call("GET", "/api/usage");
  assert.equal(r.status, 200);
  assert.equal(r.json.tokens, null);
  assert.equal(r.json.cacheHitPct, null);
  assert.equal(r.json.codeChanges, null);
  assert.equal(r.json.note, "costBasis=list; ücret yok");
  assert.equal("costUsd" in r.json, false);
});

test("agent token: create, rename, pin, archive are 403; reads are 403 too; nothing changes", async () => {
  const s = await create();
  assert.equal((await asAgent("POST", "/api/subsessions", { provider: "claude-code" })).status, 403);
  assert.equal((await asAgent("POST", `/api/subsessions/${s.id}/rename`, { name: "ajan adı" })).status, 403);
  assert.equal((await asAgent("POST", `/api/subsessions/${s.id}/pin`, { pinned: true })).status, 403);
  assert.equal((await asAgent("POST", `/api/subsessions/${s.id}/archive`, { archived: true })).status, 403);
  assert.equal((await asAgent("GET", "/api/subsessions")).status, 403);
  assert.equal((await asAgent("GET", "/api/usage")).status, 403);
  assert.equal((await asAgent("GET", `/api/usage/context?topic=${s.id}`)).status, 403);
  const after = (await call("GET", "/api/subsessions")).json.subsessions.find((x: any) => x.id === s.id);
  assert.equal(after.name, s.name);
  assert.equal(after.pinned, false);
  assert.equal(after.archived, false);
  assert.equal((await call("POST", "/api/subsessions", { provider: "claude-code" }, {}, null)).status, 401);
});

test("create: contract shape, model unknown when no run recorded, unknown fields / bad provider / wrong content type rejected", async () => {
  const s = await create({ provider: "codex", roleHint: "inceleme" });
  assert.deepEqual(Object.keys(s).sort(), ["archived", "id", "model", "modelSource", "name", "pinned", "provider", "renameCount", "roleHint", "state", "steps", "taskId", "unread", "updatedAt"].sort());
  assert.match(s.id, /^[0-9a-f-]{36}$/);
  assert.equal(s.provider, "codex");
  assert.equal(s.model, null);
  assert.equal(s.modelSource, "unknown");
  assert.equal(s.state, "idle");
  assert.equal(s.steps, null);
  assert.equal(s.taskId, null);
  assert.equal(s.renameCount, 0);
  assert.equal((await call("POST", "/api/subsessions", { provider: "codex", model: "claude-opus-5" })).status, 400, "the client cannot set the model");
  assert.equal((await call("POST", "/api/subsessions", { provider: "codex", modelSource: "run" })).status, 400);
  assert.equal((await call("POST", "/api/subsessions", { provider: "nope" })).status, 400);
  assert.equal((await call("POST", "/api/subsessions", {})).status, 400);
  assert.equal((await call("POST", "/api/subsessions", { provider: "codex", taskId: "x" })).status, 400);
  assert.equal((await call("POST", "/api/subsessions", { provider: "codex", taskId: "00000000-0000-4000-8000-000000000000" })).status, 404);
  assert.equal((await call("POST", "/api/subsessions", JSON.stringify({ provider: "codex" }), { "content-type": "text/plain" })).status, 415);
  assert.equal((await call("POST", "/api/subsessions", { provider: "codex", name: "​‮ " })).status, 400, "a name that cleans to empty is refused");
  const ev = mem.events.find((e) => e.action === "subsession.create" && (e.details as any).id === s.id);
  assert.ok(ev, "create is audited");
  assert.equal(ev.initiator.kind, "user");
});

test("name cleaning: NFKC, control/zero-width/bidi characters removed, spaces collapsed, at most 60 code points, empty -> 400", async () => {
  assert.equal(cleanName("  Ａｊａｎ\u0000 ​plan‮⁦  "), "Ajan plan");
  assert.equal(cleanName("a\nb\tc d"), "a b c d");
  assert.equal(cleanName("‍‌﻿"), "");
  assert.equal([...cleanName("ğ".repeat(80))].length, 60);
  assert.equal([...cleanName("😀".repeat(70))].length, 60, "cut by code points, never in the middle of a surrogate pair");
  const s = await create();
  const r = await call("POST", `/api/subsessions/${s.id}/rename`, { name: "  Plan‮ ajanı\u0007  " });
  assert.equal(r.status, 200);
  assert.equal(r.json.subsession.name, "Plan ajanı");
  assert.equal((await call("POST", `/api/subsessions/${s.id}/rename`, { name: "⁧​" })).status, 400);
  assert.equal((await call("POST", `/api/subsessions/${s.id}/rename`, { name: 42 })).status, 400);
  assert.equal((await call("POST", `/api/subsessions/${s.id}/rename`, { name: "x".repeat(1001) })).status, 400);
  assert.equal((await call("POST", `/api/subsessions/${s.id}/rename`, { name: "ok", extra: 1 })).status, 400, "unknown field");
});

test("model is system data: taken from the run record at creation; rename never changes it (nor can SQL)", async () => {
  const taskId = newTask("model konusu");
  audit.record({ initiator: { kind: "agent", id: "claude-code" }, action: "provider.event:started", decision: "n/a", result: "started", details: { taskId, attemptId: "a1", ts: "t", data: { subtype: "init", model: "claude-sonnet-4-6" } } });
  const s = await create({ provider: "claude-code", taskId });
  assert.equal(s.model, "claude-sonnet-4-6");
  assert.equal(s.modelSource, "run");
  const r = await call("POST", `/api/subsessions/${s.id}/rename`, { name: "GPT-5 Opus codex" });
  assert.equal(r.status, 200);
  assert.equal(r.json.subsession.name, "GPT-5 Opus codex");
  assert.equal(r.json.subsession.model, "claude-sonnet-4-6", "the name does not change the model");
  assert.equal(r.json.subsession.modelSource, "run");
  assert.equal(r.json.subsession.provider, "claude-code");
  assert.throws(() => db.prepare("UPDATE subsessions SET model = 'x' WHERE id = ?").run(s.id), /system data/);
  assert.throws(() => db.prepare("UPDATE subsessions SET provider = 'codex' WHERE id = ?").run(s.id), /system data/);
});

test("rename writes the append-only name history and an audit event with old and new name; same name is a no-op", async () => {
  const s = await create({ provider: "claude-code", name: "İlk ad" });
  await call("POST", `/api/subsessions/${s.id}/rename`, { name: "İkinci ad" });
  const r = await call("POST", `/api/subsessions/${s.id}/rename`, { name: "Üçüncü ad" });
  assert.equal(r.json.subsession.renameCount, 2);
  const same = await call("POST", `/api/subsessions/${s.id}/rename`, { name: "Üçüncü ad" });
  assert.equal(same.json.subsession.renameCount, 2);
  const store = new SubsessionStore(db);
  assert.deepEqual(store.nameHistory(s.id).map((h) => [h.oldName, h.newName, h.changedBy]), [["İlk ad", "İkinci ad", "user"], ["İkinci ad", "Üçüncü ad", "user"]]);
  const ev = mem.events.filter((e) => e.action === "subsession.rename" && (e.details as any).id === s.id && (e.details as any).changed);
  assert.deepEqual(ev.map((e) => [(e.details as any).oldName, (e.details as any).newName]), [["İlk ad", "İkinci ad"], ["İkinci ad", "Üçüncü ad"]]);
  assert.throws(() => db.prepare("DELETE FROM subsession_name_history WHERE subsession_id = ?").run(s.id), /append-only/);
  assert.throws(() => db.prepare("UPDATE subsession_name_history SET new_name = 'x' WHERE subsession_id = ?").run(s.id), /append-only/);
});

test("pin and archive are reversible flags; archived sub-sessions stay in the list (archived: true); no delete exists", async () => {
  const s = await create();
  const p = await call("POST", `/api/subsessions/${s.id}/pin`, { pinned: true });
  assert.equal(p.status, 200);
  assert.equal(p.json.subsession.pinned, true);
  assert.equal((await call("GET", "/api/subsessions")).json.subsessions[0].id, s.id, "pinned first");
  const a = await call("POST", `/api/subsessions/${s.id}/archive`, { archived: true });
  assert.equal(a.json.subsession.archived, true);
  const listed = (await call("GET", "/api/subsessions")).json.subsessions.find((x: any) => x.id === s.id);
  assert.ok(listed, "archived is still listed");
  assert.equal(listed.archived, true);
  assert.equal((await call("POST", `/api/subsessions/${s.id}/archive`, { archived: false })).json.subsession.archived, false);
  assert.equal((await call("POST", `/api/subsessions/${s.id}/pin`, { pinned: "yes" })).status, 400);
  assert.equal((await call("POST", `/api/subsessions/${s.id}/archive`, {})).status, 400);
  assert.equal((await call("DELETE", `/api/subsessions/${s.id}`)).status, 404, "there is no delete route");
  assert.throws(() => db.prepare("DELETE FROM subsessions WHERE id = ?").run(s.id), /never deleted/);
  assert.ok(mem.events.some((e) => e.action === "subsession.archive" && (e.details as any).id === s.id));
  assert.ok(mem.events.some((e) => e.action === "subsession.pin" && (e.details as any).id === s.id));
});

test("invalid id -> 400, unknown id -> 404", async () => {
  for (const verb of ["rename", "pin", "archive"]) {
    const body = verb === "rename" ? { name: "a" } : verb === "pin" ? { pinned: true } : { archived: true };
    assert.equal((await call("POST", `/api/subsessions/not-a-uuid/${verb}`, body)).status, 400, verb);
    assert.equal((await call("POST", `/api/subsessions/00000000-0000-4000-8000-000000000000/${verb}`, body)).status, 404, verb);
  }
  assert.equal((await call("GET", "/api/usage/context?topic=abc")).status, 400);
  assert.equal((await call("GET", "/api/usage/context")).status, 400);
  assert.equal((await call("GET", "/api/usage/context?topic=00000000-0000-4000-8000-000000000000")).status, 404);
});

test("state is read live: linked task drives it; a provider without an adapter is 'unavailable' (never substituted); markRead clears unread", async () => {
  const taskId = newTask("canlı durum");
  const s = await create({ provider: "codex", taskId });
  assert.equal(s.state, "idle");
  new TaskStore(db).transition(taskId, "awaiting_approval", USER);
  assert.equal((await call("GET", "/api/subsessions")).json.subsessions.find((x: any) => x.id === s.id).state, "awaiting_approval");
  const gone = await create({ provider: "gone" });
  assert.equal(gone.state, "unavailable");
  assert.equal(gone.provider, "gone");
  const store = new SubsessionStore(db);
  db.prepare("UPDATE subsessions SET unread = 1 WHERE id = ?").run(s.id);
  assert.equal(store.require(s.id).unread, true);
  assert.equal(store.markRead(s.id).unread, false);
});

test("usage and context come only from stored run records: reported tokens summed, unknown runs counted but not invented, last diff per attempt", async () => {
  const ev = new EvidenceStore(db);
  const t1 = newTask("kullanım 1");
  const t2 = newTask("kullanım 2");
  audit.record({ initiator: { kind: "agent", id: "claude-code" }, action: "provider.event:started", decision: "n/a", result: "started", details: { taskId: t1, attemptId: "a1", data: { model: "claude-opus-4-7" } } });
  ev.add(t1, "a1", "execution", "succeeded", { provider: "claude-code", status: "succeeded" });
  ev.add(t1, "a1", "usage", "reported", { inputTokens: 1000, outputTokens: 200, costUsd: 0.5, source: "reported" });
  ev.add(t1, "a1", "diff", "1 file", { stat: " a.txt | 3 ++-\n 1 file changed, 2 insertions(+), 1 deletion(-)\n" });
  ev.add(t1, "a1", "diff", "1 file", { stat: " a.txt | 5 +++--\n 1 file changed, 3 insertions(+), 2 deletions(-)\n" });
  ev.add(t2, "w1", "step:plan", "succeeded", { provider: "codex", usage: { inputTokens: 300, outputTokens: 100, costUsd: null, source: "reported" } });
  ev.add(t2, "w1", "step:review", "succeeded", { provider: "codex", usage: { inputTokens: null, outputTokens: null, costUsd: null, source: "unknown" } });

  const rep = usageReport(db);
  assert.deepEqual(rep.runs, { total: 3, reported: 2, unknown: 1 });
  assert.equal(rep.source, "run");
  assert.deepEqual(rep.tokens, { input: 1300, output: 300, cacheWrite: null, cacheRead: null });
  assert.equal(rep.cacheHitPct, null);
  assert.deepEqual(rep.codeChanges, { added: 3, removed: 2 }, "only the latest diff of an attempt counts");
  assert.equal(JSON.stringify(rep).includes("0.5"), false, "cost is never reported");
  const opus = rep.byModel.find((m) => m.model === "claude-opus-4-7");
  assert.deepEqual(opus, { model: "claude-opus-4-7", provider: "claude-code", runs: 1, reportedRuns: 1, input: 1000, output: 200 });
  const codex = rep.byModel.find((m) => m.provider === "codex");
  assert.deepEqual(codex, { model: null, provider: "codex", runs: 2, reportedRuns: 1, input: 300, output: 100 }, "no started event -> model null, not guessed");
  const row1 = rep.topicsTable.find((r) => r.id === t1);
  assert.deepEqual(row1 && { title: row1.title, model: row1.model, tokens: row1.tokens, sharePct: row1.sharePct, cacheHitPct: row1.cacheHitPct }, { title: "kullanım 1", model: "claude-opus-4-7", tokens: 1200, sharePct: 75, cacheHitPct: null });
  assert.equal(rep.topicsTable.find((r) => r.id === t2)?.sharePct, 25);

  assert.deepEqual(contextFor(db, t1), { tokens: 1200, limit: 150000, pct: 0.8, source: "run" });
  const t3 = newTask("çalıştırılmamış");
  assert.deepEqual(contextFor(db, t3), { tokens: null, limit: 150000, pct: null, source: "unknown" });
  const api = await call("GET", `/api/usage/context?topic=${t2}`);
  assert.equal(api.status, 200);
  assert.deepEqual(api.json, { tokens: 400, limit: 150000, pct: 0.3, source: "run" });
  assert.equal((await call("GET", "/api/usage")).json.tokens.input, 1300);
});

test("parseStat reads git's summary line; anything else is not guessed", () => {
  assert.deepEqual(parseStat(" 2 files changed, 10 insertions(+)\n"), { added: 10, removed: 0 });
  assert.deepEqual(parseStat(" 1 file changed, 4 deletions(-)"), { added: 0, removed: 4 });
  assert.deepEqual(parseStat(""), { added: 0, removed: 0 });
  assert.equal(parseStat("garbage"), null);
  assert.equal(parseStat(undefined), null);
});

test("migration 011 rolls back and re-applies cleanly", () => {
  const d = openDb(join(BASE, "rb.db"));
  migrate(d);
  const N = loadMigrations().length;
  assert.deepEqual(rollback(d, 10), Array.from({ length: N - 10 }, (_, i) => N - i));
  assert.equal(d.prepare("SELECT name FROM sqlite_master WHERE name = 'subsessions'").get(), undefined);
  assert.deepEqual(migrate(d), Array.from({ length: N - 10 }, (_, i) => 11 + i));
  d.close();
});
