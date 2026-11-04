// Durum göstergeleri ucu testleri (GET /api/status/indicators). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite + gerçek HTTP sunucusu + sahte saat; sağlayıcılar betikli ikizlerdir (model çağrısı, internet, silme yok). Uç yalnız OKUR.
// Kapsam: bilinmiyor durumları, eşikler (74.9 / 75 / 89.9 / 90), 5 sn önbellek, session doğrulaması, anonim 401 / ajan 403, yan etkisizlik, uydurma yok.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
import { TaskStore } from "../core/tasks/tasks.ts";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { ScriptedAdapter } from "../testing/scripted-adapter.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { createApp } from "./app.ts";
import { SubsessionStore } from "./subsessions.ts";

const BASE = mkTmp("agentmom-indicators-");
let server: Server;
let port: number;
let db: Db;
let auth: AuthRegistry;
let agentToken: string;
let clock = new Date();
let tasks: TaskStore;
let subs: SubsessionStore;

before(async () => {
  const dbPath = join(BASE, "indicators.db");
  db = openDb(dbPath);
  migrate(db);
  const audit = new AuditLog([new SqliteAuditSink(db)]);
  auth = new AuthRegistry();
  agentToken = auth.issueAgentToken("test-agent");
  const registry = new ProviderRegistry(db);
  registry.register(new ScriptedAdapter("claude-code", () => ({ summary: "ok" }), { routeKind: "subscription" }));
  registry.register(new ScriptedAdapter("local-x", () => ({ summary: "ok" }), { routeKind: "local" }));
  const worktreeRoot = join(BASE, "wt");
  const workflows = new WorkflowStore(db);
  const contract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedProviders: ["claude-code", "local-x"], allowedDirs: [BASE] };
  const engine = new WorkflowEngine({ tasks: new TaskStore(db), audit, registry, evidence: new EvidenceStore(db), store: workflows, contract, worktreeRoot });
  const config = structuredClone(DEFAULT_CONFIG);
  config.policy.defaultContract = contract;
  const now = () => clock;
  tasks = new TaskStore(db, now);
  subs = new SubsessionStore(db, { now });
  server = createApp({ db, dbPath, config, audit, auth, registry, engine, workflows, worktreeRoot, now });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const addr = server.address();
  port = typeof addr === "object" && addr ? addr.port : 0;
});

after(async () => {
  await new Promise<void>((ok) => server.close(() => ok()));
  db.close();
});

function call(method: string, path: string, token: string | null = auth.userToken): Promise<{ status: number; json: any }> {
  return new Promise((ok, fail) => {
    const req = httpRequest({ host: "127.0.0.1", port, method, path, headers: { host: `127.0.0.1:${port}`, ...(token ? { authorization: `Bearer ${token}` } : {}) } }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        ok({ status: res.statusCode ?? 0, json: text ? JSON.parse(text) : null });
      });
    });
    req.on("error", fail);
    req.end();
  });
}

const get = (q = "", token: string | null = auth.userToken) => call("GET", `/api/status/indicators${q}`, token);
const rowCount = (t: string): number => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
const counts = () => ["tasks", "audit_events", "task_evidence", "subsessions", "workflows"].map(rowCount);
const advance = (ms: number): void => void (clock = new Date(clock.getTime() + ms));
const WINDOW = 150_000;

// Sağlayıcı bildirimli kullanım kanıtı olan görev (input + output = tokens).
function taskWithUsage(tokens: number | null, source: "reported" | "estimated" | "unknown" = "reported"): string {
  const t = tasks.create({ title: "konu", requestedAction: "file.read", request: {}, decision: "allow" });
  const data = tokens === null ? { source: "unknown", inputTokens: null, outputTokens: null } : { source, inputTokens: tokens, outputTokens: 0 };
  db.prepare("INSERT INTO task_evidence (id, task_id, attempt_id, kind, summary, data_json, created_at) VALUES (?, ?, 'a1', 'usage', 'u', ?, ?)").run(`ev-${t.id}`, t.id, JSON.stringify(data), clock.toISOString());
  return t.id;
}

function reportLimits(providerId: string, limits: unknown, ageMs = 1000): void {
  const ts = new Date(clock.getTime() - ageMs).toISOString();
  db.prepare("INSERT INTO audit_events (id, ts, initiator_kind, initiator_id, action, decision, result, details_json) VALUES (?, ?, 'agent', ?, 'provider.event:usage', 'n/a', 'usage', ?)").run(`q-${providerId}-${ts}-${Math.random()}`, ts, providerId, JSON.stringify({ taskId: "x", data: { limits } }));
}

test("auth: no token 401, agent token 403, only GET; parameter validation (uuid, unknown or duplicate parameter)", async () => {
  assert.equal((await get("", null)).status, 401);
  assert.equal((await get("", agentToken)).status, 403);
  assert.equal((await call("POST", "/api/status/indicators")).status, 404, "no write route exists");
  assert.equal((await get("?session=abc")).status, 400);
  assert.equal((await get("?session=1234")).status, 400);
  assert.equal((await get(`?session=${encodeURIComponent("' OR 1=1 --")}`)).status, 400);
  assert.equal((await get("?foo=1")).status, 400);
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal((await get(`?session=${id}&session=${id}`)).status, 400);
  assert.equal((await get(`?session=${id}`)).status, 200, "a well-formed but unknown session is not an error");
});

test("nothing reported: every indicator says unknown, nothing is invented, and the shape is fixed", async () => {
  advance(60_000);
  const r = await get();
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.json).sort(), ["context", "generatedAt", "pendingApprovals", "quota", "stalled"]);
  assert.deepEqual(r.json.context, { percent: null, usedTokens: null, windowTokens: null, source: "unknown", level: "unknown", windowSource: "unknown", note: "bağlam: oturum seçilmedi" });
  assert.deepEqual([r.json.quota.percent, r.json.quota.providerId, r.json.quota.reported, r.json.quota.level], [null, null, false, "unknown"]);
  assert.match(r.json.quota.note, /bilinmiyor/);
  assert.deepEqual(r.json.pendingApprovals, { count: 0, critical: 0, truncated: false });
  assert.deepEqual(r.json.stalled, { count: 0, items: [] });
  assert.equal(r.json.generatedAt, clock.toISOString());
  const unknownSession = await get("?session=22222222-2222-4222-8222-222222222222");
  assert.equal(unknownSession.json.context.percent, null);
  assert.equal(unknownSession.json.context.level, "unknown");
  assert.match(unknownSession.json.context.note, /bulunamadı/);
});

test("context: provider-reported tokens over the ring's window; thresholds 74.9 / 75 / 89.9 / 90; unreported usage stays null", async () => {
  advance(10_000);
  const cases: Array<[number, number, string]> = [
    [0.5 * WINDOW, 50, "ok"],
    [0.749 * WINDOW, 74.9, "ok"],
    [0.75 * WINDOW, 75, "warn"],
    [0.899 * WINDOW, 89.9, "warn"],
    [0.9 * WINDOW, 90, "critical"],
    [1.2 * WINDOW, 120, "critical"],
  ];
  for (const [tokens, pct, level] of cases) {
    const id = taskWithUsage(Math.round(tokens));
    const r = await get(`?session=${id}`);
    assert.equal(r.status, 200);
    assert.deepEqual([r.json.context.percent, r.json.context.usedTokens, r.json.context.windowTokens, r.json.context.source, r.json.context.level, r.json.context.windowSource], [pct, Math.round(tokens), WINDOW, "reported", level, "program_default"], String(pct));
    // Halka ile aynı hesap: /api/usage/context aynı yüzdeyi verir.
    const ring = await call("GET", `/api/usage/context?topic=${id}`);
    assert.equal(ring.json.pct, r.json.context.percent, "same account as the context ring");
  }
  for (const id of [taskWithUsage(null), taskWithUsage(5000, "estimated"), taskWithUsage(5000, "unknown")]) {
    const r = await get(`?session=${id}`);
    assert.deepEqual([r.json.context.percent, r.json.context.usedTokens, r.json.context.windowTokens, r.json.context.source, r.json.context.level], [null, null, null, "unknown", "unknown"], "estimated/unknown usage is never presented as a percentage");
    assert.match(r.json.context.note, /bildirmedi/);
  }
  const bare = tasks.create({ title: "koşusuz", requestedAction: "file.read", request: {}, decision: "allow" });
  assert.equal((await get(`?session=${bare.id}`)).json.context.percent, null, "a task without any run has no context figure");
});

test("session may be a sub-session id: its task gives the context and its provider gives the quota subject", async () => {
  advance(10_000);
  const taskId = taskWithUsage(Math.round(0.8 * WINDOW));
  const sub = subs.create({ provider: "claude-code", taskId });
  const r = await get(`?session=${sub.id}`);
  assert.equal(r.json.context.percent, 80);
  assert.equal(r.json.context.level, "warn");
  assert.deepEqual([r.json.quota.providerId, r.json.quota.percent, r.json.quota.reported], ["claude-code", null, false], "the sub-session's provider is the subject, but it has not reported a quota");
  reportLimits("claude-code", { usedPct: 92 });
  advance(6000);
  const q = await get(`?session=${sub.id}`);
  assert.deepEqual([q.json.quota.percent, q.json.quota.providerId, q.json.quota.reported, q.json.quota.level], [92, "claude-code", true, "critical"]);
  const noTask = subs.create({ provider: "local-x" });
  const n = await get(`?session=${noTask.id}`);
  assert.equal(n.json.context.percent, null);
  assert.match(n.json.context.note, /görev yok/);
  assert.deepEqual([n.json.quota.percent, n.json.quota.reported], [null, false], "another provider's quota is not borrowed");
});

test("quota: only a provider's own validated report counts; thresholds 74.9 / 75 / 89.9 / 90; stale, bad or reset reports are unknown", async () => {
  advance(10_000);
  const sub = subs.create({ provider: "local-x" });
  const cases: Array<[number, string]> = [[74.9, "ok"], [75, "warn"], [89.9, "warn"], [90, "critical"]];
  for (const [pct, level] of cases) {
    reportLimits("local-x", { usedPct: pct });
    advance(6000);
    const r = await get(`?session=${sub.id}`);
    assert.deepEqual([r.json.quota.percent, r.json.quota.level, r.json.quota.reported], [pct, level, true], String(pct));
  }
  reportLimits("local-x", { usedPct: "çok" });
  advance(6000);
  const bad = await get(`?session=${sub.id}`);
  assert.deepEqual([bad.json.quota.percent, bad.json.quota.level], [null, "unknown"], "newest report is malformed: unknown, not the older value");
  reportLimits("local-x", { usedPct: 80 }, 7 * 3600 * 1000);
  const stale = await get(`?session=${subs.create({ provider: "local-x" }).id}`);
  assert.equal(stale.json.quota.percent, null, "a report older than 6 hours is not shown");
  reportLimits("local-x", { remainingPct: 5, resetsAt: new Date(clock.getTime() + 3600000).toISOString() });
  advance(6000);
  assert.equal((await get(`?session=${sub.id}`)).json.quota.percent, 95, "remaining 5 -> used 95");
});

test("5 second cache per session key: same payload inside 5 s, recomputed at 5 s; different sessions are independent", async () => {
  advance(60_000);
  const id = taskWithUsage(Math.round(0.1 * WINDOW));
  const a = await get(`?session=${id}`);
  const t0 = a.json.generatedAt;
  advance(4999);
  assert.equal((await get(`?session=${id}`)).json.generatedAt, t0, "served from cache at 4.999 s");
  const other = await get();
  assert.notEqual(other.json.generatedAt, t0, "another key is computed on its own");
  advance(1);
  const b = await get(`?session=${id}`);
  assert.notEqual(b.json.generatedAt, t0, "recomputed at 5 s");
  assert.equal(b.json.generatedAt, clock.toISOString());
  // Önbellek eski veriyi 5 sn içinde gösterebilir ama sonra değişiklik görünür.
  tasks.create({ title: "bekleyen", requestedAction: "file.write", request: { action: "file.write" }, decision: "require_approval" });
  const pending = tasks.listByState("pending", 1)[0];
  assert.ok(pending);
  tasks.transition(pending.id, "awaiting_approval", { kind: "system", id: "test" });
  assert.equal((await get()).json.pendingApprovals.count, 0, "cached inside the window");
  advance(5000);
  assert.equal((await get()).json.pendingApprovals.count, 1, "fresh after the window");
});

test("pending approvals: count of awaiting_approval + critical-risk count, same risk logic as the attention list", async () => {
  advance(60_000);
  const before = (await get()).json.pendingApprovals.count;
  const mk = (action: string, request: Record<string, unknown>): void => {
    const t = tasks.create({ title: "onay", requestedAction: action, request, decision: "require_approval" });
    tasks.transition(t.id, "awaiting_approval", { kind: "system", id: "test" });
  };
  mk("shell.exec", { command: "rm -rf build1" });
  mk("shell.exec", { command: "rm -rf build2" });
  mk("file.read", {});
  advance(5000);
  const r = await get();
  assert.equal(r.json.pendingApprovals.count, before + 3);
  const att = await call("GET", "/api/attention");
  assert.equal(r.json.pendingApprovals.critical, att.json.counts.critical, "same critical figure as the attention order");
  assert.ok(r.json.pendingApprovals.critical >= 2);
  assert.equal(r.json.pendingApprovals.truncated, false);
});

test("stalled suspects are reported (suspicion only) and carry no cancel/redirect behaviour", async () => {
  advance(60_000);
  const t = tasks.create({ title: "uzun iş", requestedAction: "file.write", request: {}, decision: "allow" });
  tasks.transition(t.id, "approved", { kind: "user", id: "u" });
  tasks.transition(t.id, "running", { kind: "system", id: "test" });
  advance(6 * 60_000);
  let r = await get();
  const item = r.json.stalled.items.find((i: { taskId: string }) => i.taskId === t.id);
  assert.ok(item, "5+ minutes without a trace -> suspect");
  assert.equal(item.long, false);
  assert.ok(item.lastTraceMin >= 5 && item.lastTraceMin < 15);
  advance(10 * 60_000);
  r = await get();
  assert.equal(r.json.stalled.items.find((i: { taskId: string }) => i.taskId === t.id).long, true, "15+ minutes -> stalledLong");
  assert.equal((db.prepare("SELECT state FROM tasks WHERE id = ?").get(t.id) as { state: string }).state, "running", "the suspect keeps running: nothing is cancelled");
  tasks.transition(t.id, "succeeded", { kind: "system", id: "test" });
  advance(5000);
  r = await get();
  assert.equal(r.json.stalled.items.some((i: { taskId: string }) => i.taskId === t.id), false, "a finished run is never stalled");
});

test("side effects: the endpoint writes nothing (no rows, no audit lines) and answers are free of internals", async () => {
  advance(60_000);
  const id = taskWithUsage(1000);
  const before = counts();
  for (const q of ["", `?session=${id}`, `?session=${id}`, "?session=33333333-3333-4333-8333-333333333333"]) {
    const r = await get(q);
    assert.equal(r.status, 200);
    assert.doesNotMatch(JSON.stringify(r.json), /node_modules|[A-Z]:\\|\n\s+at /i);
  }
  const bad = await get("?session=zzz");
  assert.doesNotMatch(JSON.stringify(bad.json), /node_modules|[A-Z]:\\|\n\s+at /);
  assert.deepEqual(counts(), before);
});

test("source guard: indicator and monitor code contain no write, cancel or redirect call", () => {
  for (const f of ["indicators.ts", "monitor.ts", "../analysis/quota.ts"]) {
    const text = readFileSync(join(import.meta.dirname, f), "utf8");
    assert.doesNotMatch(text, /\.run\(|INSERT\s|UPDATE\s|DELETE\s|\.cancel\(|\.transition\(|process\.kill|\.abort\(/i, f);
  }
});

test("session given but its provider is unknown: quota is unknown (another provider's report is not borrowed); without session the best report is shown", async () => {
  advance(60_000);
  reportLimits("local-x", { usedPct: 70 });
  advance(6000);
  const r = await get("?session=44444444-4444-4444-8444-444444444444");
  assert.deepEqual([r.json.quota.percent, r.json.quota.providerId, r.json.quota.reported, r.json.quota.level], [null, null, false, "unknown"]);
  assert.match(r.json.quota.note, /oturumun sağlayıcısı bilinmiyor/);
  const none = await get();
  assert.equal(none.json.quota.reported, true, "no session: highest reported usage over all providers");
});

test("cache eviction: 51 different sessions keep at most 50 entries - the oldest key is recomputed, the newest is still cached", async () => {
  advance(60_000);
  const ids = Array.from({ length: 51 }, (_, i) => `55555555-5555-4555-8555-${String(i).padStart(12, "0")}`);
  const first: string[] = [];
  for (const id of ids) {
    advance(1);
    first.push((await get(`?session=${id}`)).json.generatedAt);
  }
  advance(1);
  const again0 = await get(`?session=${ids[0]}`);
  assert.notEqual(again0.json.generatedAt, first[0], "oldest entry was evicted -> recomputed");
  const last = await get(`?session=${ids[50]}`);
  assert.equal(last.json.generatedAt, first[50], "newest entry is still cached");
});

test("truncated scan: more than 500 awaiting tasks -> truncated true, count is the true total, critical is a lower bound", async () => {
  advance(60_000);
  const before = (await get()).json.pendingApprovals.count;
  const total = 505;
  for (let i = 0; i < total; i++) {
    const t = tasks.create({ title: "toplu", requestedAction: i < 2 ? "shell.exec" : "file.read", request: i < 2 ? { command: `rm -rf bulk${i}` } : {}, decision: "require_approval" });
    tasks.transition(t.id, "awaiting_approval", { kind: "system", id: "test" });
  }
  advance(6000);
  const r = await get();
  assert.equal(r.json.pendingApprovals.count, before + total);
  assert.equal(r.json.pendingApprovals.truncated, true);
  assert.ok(r.json.pendingApprovals.critical >= 2);
});
