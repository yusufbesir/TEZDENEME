// D8a uçları testleri (rakip hipotezler, bilgi değeri, çelişki çözüm önerisi, bilgi yarı ömrü, öğrenme getirisi, dikkat bütçesi, akıl yürütme derleyicisi).
// Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite + gerçek HTTP sunucusu; sağlayıcılar betikli ikizlerdir (model çağrısı, internet, silme yok). Bu uçlar yalnız hesaplar/önerir: hiçbiri kaydetmez, denetim kaydı yazmaz.
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
import { TaskStore } from "../core/tasks/tasks.ts";
import type { Actor } from "../core/policy/types.ts";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { ScriptedAdapter } from "../testing/scripted-adapter.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { createApp } from "./app.ts";

const BASE = mkTmp("agentmom-d8-");
let server: Server;
let port: number;
let db: Db;
let auth: AuthRegistry;
let agentToken: string;

before(async () => {
  const dbPath = join(BASE, "d8.db");
  db = openDb(dbPath);
  migrate(db);
  const audit = new AuditLog([new SqliteAuditSink(db)]);
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
  server = createApp({ db, dbPath, config, audit, auth, registry, engine, workflows, worktreeRoot });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const addr = server.address();
  port = typeof addr === "object" && addr ? addr.port : 0;
});

after(async () => {
  await new Promise<void>((ok) => server.close(() => ok()));
  db.close();
});

function call(method: string, path: string, body?: unknown, token: string | null = auth.userToken, contentType: string | null = "application/json"): Promise<{ status: number; json: any }> {
  return new Promise((ok, fail) => {
    const payload = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);
    const req = httpRequest(
      { host: "127.0.0.1", port, method, path, headers: { host: `127.0.0.1:${port}`, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(payload !== undefined && contentType ? { "content-type": contentType } : {}) } },
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
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

const get = (path: string, token: string | null = auth.userToken) => call("GET", path, undefined, token);
const post = (path: string, body: unknown, token: string | null = auth.userToken) => call("POST", path, body, token);
const ZERO = "00000000-0000-0000-0000-000000000000";
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const agoDays = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const rowCount = (t: string): number => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
const counts = () => [rowCount("memory_records"), rowCount("memory_flags"), rowCount("decisions"), rowCount("predictions"), rowCount("tasks"), rowCount("audit_events")];
const NO_INTERNALS = /node_modules|\.ts\b|[A-Z]:\\|stack|\bat /;

const hypBody = () => ({ hypotheses: [{ id: "H1", name: "Birinci" }, { id: "H2", name: "İkinci" }], evidence: [{ id: "e1", text: "Birinci kanıt", likelihoods: { H1: 0.8, H2: 0.2 } }, { id: "e2", text: "İkinci kanıt", likelihoods: { H1: 0.6, H2: 0.3 } }] });
const voiBody = () => ({
  states: [{ id: "petrol", p: 0.3 }, { id: "kuru", p: 0.7 }],
  options: [{ id: "sondaj", name: "Sondaj", payoffs: { petrol: 200, kuru: -60 } }, { id: "yok", name: "Sondaj yok", payoffs: { petrol: 0, kuru: 0 } }],
  tests: [{ id: "sismik", name: "Sismik", cost: 10, likelihoods: { petrol: { poz: 0.8, neg: 0.2 }, kuru: { poz: 0.2, neg: 0.8 } } }],
});

test("auth: no token 401 and agent token 403 on every D8a route", async () => {
  for (const p of ["/api/memory/contradictions/resolutions", "/api/memory/halflife", "/api/reasoning/learning", "/api/attention", `/api/decisions/${ZERO}/argument`]) {
    assert.equal((await get(p, null)).status, 401, p);
    assert.equal((await get(p, agentToken)).status, 403, p);
  }
  for (const [p, body] of [["/api/reasoning/hypotheses", hypBody()], ["/api/reasoning/voi", voiBody()]] as const) {
    assert.equal((await post(p, body, null)).status, 401, p);
    assert.equal((await post(p, body, agentToken)).status, 403, p);
  }
});

test("hypotheses: success shape, posteriors match, nothing is written; 400/415 on bad input without internal detail", async () => {
  const before = counts();
  const r = await post("/api/reasoning/hypotheses", hypBody());
  assert.equal(r.status, 200);
  const a = r.json.analysis;
  assert.equal(a.mode, "bayes");
  assert.equal(a.priorUsed, "eşit");
  assert.ok(Math.abs(a.posteriors[0].posterior - 0.24 / 0.27) < 1e-9);
  assert.equal(a.evidence[0].strength, "orta");
  assert.equal(a.leastRefuted.id, "H1");
  assert.match(a.assumptions.join(" "), /koşullu bağımsız/);
  const ach = await post("/api/reasoning/hypotheses", { ...hypBody(), mode: "ach" });
  assert.equal(ach.json.analysis.mode, "ach");
  assert.deepEqual(counts(), before, "pure computation: no record, no audit event");

  const bad: unknown[] = [
    {},
    { ...hypBody(), baska: 1 },
    { ...hypBody(), mode: "x" },
    { hypotheses: [{ id: "H1", name: "a" }], evidence: hypBody().evidence },
    { ...hypBody(), hypotheses: [{ id: "__proto__", name: "a" }, { id: "H2", name: "b" }] },
    { ...hypBody(), evidence: [{ id: "e1", text: "x".repeat(301), likelihoods: {} }] },
    { ...hypBody(), evidence: [{ id: "e1", text: "k", likelihoods: { H1: 2, H2: 0.1 } }] },
    { ...hypBody(), evidence: [{ id: "e1", text: "k", likelihoods: { H1: "0.5", H2: 0.1 } }] },
    [],
    "metin",
  ];
  for (const b of bad) {
    const x = await post("/api/reasoning/hypotheses", b);
    assert.equal(x.status, 400, JSON.stringify(b).slice(0, 80));
    assert.equal(typeof x.json.error, "string");
    assert.doesNotMatch(JSON.stringify(x.json), NO_INTERNALS);
  }
  assert.equal((await call("POST", "/api/reasoning/hypotheses", "{bozuk", auth.userToken)).status, 400);
  assert.equal((await call("POST", "/api/reasoning/hypotheses", JSON.stringify(hypBody()), auth.userToken, "text/plain")).status, 415);
  assert.equal((await get("/api/reasoning/hypotheses")).status, 404, "only POST exists");
  assert.deepEqual(counts(), before);
});

test("hypotheses: a secret in a text is masked in the response", async () => {
  const b = hypBody();
  b.evidence[0]!.text = "kanıt sk-abcdefghijklmnopqrstuvwxyz0123";
  const r = await post("/api/reasoning/hypotheses", b);
  assert.equal(r.status, 200);
  assert.doesNotMatch(JSON.stringify(r.json), /sk-abcdef/);
});

test("voi: oil example over HTTP (hand-checked numbers), nothing written; 400s", async () => {
  const before = counts();
  const r = await post("/api/reasoning/voi", voiBody());
  assert.equal(r.status, 200);
  const v = r.json.voi;
  assert.equal(v.bestOption.id, "sondaj");
  assert.ok(Math.abs(v.bestOption.expectedValue - 18) < 1e-9);
  assert.ok(Math.abs(v.evpi - 42) < 1e-9);
  assert.ok(Math.abs(v.tests[0].evsi - 21.6) < 1e-9);
  assert.ok(Math.abs(v.tests[0].net - 11.6) < 1e-9);
  assert.equal(v.recommendation.gather, true);
  assert.equal(v.recommendation.testId, "sismik");
  const noTests = await post("/api/reasoning/voi", { states: voiBody().states, options: voiBody().options });
  assert.equal(noTests.status, 200);
  assert.deepEqual(noTests.json.voi.tests, []);
  assert.deepEqual(counts(), before);

  const bad: unknown[] = [
    {},
    { ...voiBody(), baska: 1 },
    { ...voiBody(), states: [{ id: "petrol", p: 0.3 }, { id: "kuru", p: 0.6 }] },
    { ...voiBody(), states: [{ id: "petrol", p: 0.3 }, { id: "kuru", p: null }] },
    { ...voiBody(), options: [{ id: "sondaj", name: "S", payoffs: { petrol: 1e30, kuru: 0 } }, voiBody().options[1]] },
    { ...voiBody(), options: [{ id: "sondaj", name: "S", payoffs: { petrol: 1 } }, voiBody().options[1]] },
    { ...voiBody(), tests: [{ ...voiBody().tests[0], cost: -5 }] },
    { ...voiBody(), tests: Array.from({ length: 6 }, (_, i) => ({ ...voiBody().tests[0], id: `t${i}` })) },
    { ...voiBody(), tests: [{ ...voiBody().tests[0], likelihoods: { petrol: { poz: 0.5, neg: 0.2 }, kuru: { poz: 0.2, neg: 0.8 } } }] },
  ];
  for (const b of bad) {
    const x = await post("/api/reasoning/voi", b);
    assert.equal(x.status, 400, JSON.stringify(b).slice(0, 80));
    assert.doesNotMatch(JSON.stringify(x.json), NO_INTERNALS);
  }
  assert.equal((await call("POST", "/api/reasoning/voi", JSON.stringify(voiBody()), auth.userToken, "text/plain")).status, 415);
});

test("contradiction resolutions: a suggestion over HTTP, never applied; halflife map shape; parameter errors", async () => {
  const mk = (over: Record<string, unknown>) => ({ kind: "fact", title: "Sunucu konumu", body: "Sunucu İstanbul'da.", source: "test", scope: "agentmom", subject: "sunucu.konum", confidence: 0.8, ...over });
  const old = await post("/api/memory", mk({ observedAt: agoDays(40) }));
  const fresh = await post("/api/memory", mk({ body: "Sunucu Ankara'da.", observedAt: agoDays(1) }));
  assert.equal(old.status, 201);
  assert.equal(fresh.status, 201);
  const before = counts();
  const r = await get("/api/memory/contradictions/resolutions");
  assert.equal(r.status, 200);
  assert.ok(r.json.totalOpen >= 1);
  const x = r.json.resolutions.find((q: { keep: string }) => q.keep === fresh.json.record.id);
  assert.ok(x, JSON.stringify(r.json.resolutions));
  assert.equal(x.retire, old.json.record.id);
  assert.equal(x.rule, "yenilik");
  assert.equal(x.outcome, "önerildi");
  assert.match(x.rationale, /emekli edilmeli/);
  assert.match(r.json.note, /hiçbir kayıt emekli edilmedi/);
  assert.deepEqual(counts(), before, "suggestions are not applied");
  assert.equal((db.prepare("SELECT status FROM memory_records WHERE id = ?").get(old.json.record.id) as { status: string }).status, "active");
  assert.equal((await get("/api/memory/contradictions/resolutions?x=1")).status, 400);
  assert.equal((await post("/api/memory/contradictions/resolutions", {})).status, 404, "only GET exists");

  const h = await get("/api/memory/halflife");
  assert.equal(h.status, 200);
  assert.equal(h.json.byKind.length, 5);
  assert.equal(h.json.minSample, 5);
  const fact = h.json.byKind.find((g: { kind: string }) => g.kind === "fact");
  assert.equal(fact.status, "yetersiz veri");
  assert.equal(fact.halfLifeDays, null);
  assert.equal(typeof fact.sampleSize, "number");
  assert.ok(fact.records >= 2);
  assert.ok(h.json.byKindAndScope.some((g: { scope: string }) => g.scope === "agentmom"));
  assert.equal((await get("/api/memory/halflife?x=1")).status, 400);
  assert.deepEqual(counts(), before);
});

test("learning: insufficient data is honest, open predictions are counted; read-only", async () => {
  const p = await post("/api/predictions", { source: "ajan-x", claim: "Test geçer", confidence: 0.7, dueAt: inDays(5) });
  assert.equal(p.status, 201);
  const before = counts();
  const r = await get("/api/reasoning/learning");
  assert.equal(r.status, 200);
  assert.equal(r.json.minResolved, 10);
  const e = r.json.sources.find((s: { source: string }) => s.source === "ajan-x");
  assert.equal(e.status, "yetersiz veri");
  assert.equal(e.resolved, 0);
  assert.equal(e.open, 1);
  assert.equal(e.improvement, null);
  assert.equal(e.learningReturn, null);
  assert.equal(r.json.overall.status, "yetersiz veri");
  assert.equal((await get("/api/reasoning/learning?x=1")).status, 400);
  assert.deepEqual(counts(), before);
});

test("attention: awaiting tasks are ranked and tiered by budget; nothing is approved or changed; budget validation", async () => {
  const target = (n: number) => join(BASE, "baska", `x${n}.ts`);
  const ids: string[] = [];
  for (let i = 0; i < 4; i++) {
    const t = await post("/api/tasks", { title: `Yaz ${i}`, request: { action: "file.write", target: target(i) } }, agentToken);
    assert.equal(t.json.task.state, "awaiting_approval");
    ids.push(t.json.task.id);
  }
  const before = counts();
  const states = () => JSON.stringify(db.prepare("SELECT id, state FROM tasks ORDER BY id").all());
  const stBefore = states();
  const r = await get("/api/attention?budget=1");
  assert.equal(r.status, 200);
  assert.equal(r.json.budget, 1);
  assert.ok(r.json.totalAwaiting >= 4);
  assert.equal(r.json.items.length, r.json.totalGroups);
  assert.ok(ids.every((id) => r.json.items.some((i: { taskId: string }) => i.taskId === id)));
  const first = r.json.items[0];
  assert.ok(first.riskScore >= 0 && Array.isArray(first.reasons) && first.reasons.length > 0);
  assert.equal(r.json.counts.now + r.json.counts.today + r.json.counts.batch, r.json.totalAwaiting);
  assert.equal(r.json.counts.now, Math.max(1, r.json.counts.critical));
  assert.ok(r.json.counts.today <= 2);
  assert.equal((await get("/api/attention")).json.budget, 5, "default budget");
  assert.equal(states(), stBefore, "no task state changed");
  assert.deepEqual(counts(), before);
  for (const q of ["budget=0", "budget=51", "budget=abc", "budget=1.5", "budget=-1", "budget=", "budget=1&budget=2", "x=1", "budget=99999999999"]) {
    const b = await get(`/api/attention?${q}`);
    assert.equal(b.status, 400, q);
    assert.doesNotMatch(JSON.stringify(b.json), NO_INTERNALS);
  }
  assert.equal((await get("/api/attention?budget=50")).status, 200);
  assert.equal((await post("/api/attention", {})).status, 404, "only GET exists");
});

test("argument: a decision compiled over HTTP; unknown id 404; bad parameters 400; read-only", async () => {
  const d = await post("/api/decisions", { title: "Docker ertelendi", rationale: "Yerel çalışma bozulmasın. <b>kalın</b>", scope: "agentmom", expiresAt: inDays(120), assumptions: [{ text: "Docker olmadan yeterli", checkBy: inDays(20) }] });
  assert.equal(d.status, 201);
  const before = counts();
  const r = await get(`/api/decisions/${d.json.decision.id}/argument`);
  assert.equal(r.status, 200);
  const a = r.json.argument;
  assert.equal(a.decisionId, d.json.decision.id);
  assert.equal(a.claim, "Docker ertelendi");
  assert.equal(a.verdict, "gözden geçir", "the assumption is not validated yet");
  assert.ok(Array.isArray(a.grounds) && a.grounds.length >= 2);
  assert.deepEqual(a.assumptions.map((x: { status: string }) => x.status), ["unvalidated"]);
  assert.ok(a.risks.some((x: { kind: string }) => x.kind === "doğrulanmamış varsayım"));
  assert.deepEqual(a.counterpoints, []);
  assert.equal(typeof a.markdown, "string");
  assert.ok(!a.markdown.includes("<b>"), "raw HTML is neutralised in markdown");
  assert.match(a.markdown, /Hüküm: gözden geçir/);
  assert.equal(a.maskedSecrets, false);
  assert.equal((await get(`/api/decisions/${ZERO}/argument`)).status, 404);
  assert.equal((await get("/api/decisions/degil-uuid/argument")).status, 404);
  assert.equal((await get(`/api/decisions/${d.json.decision.id}/argument?x=1`)).status, 400);
  assert.equal((await post(`/api/decisions/${d.json.decision.id}/argument`, {})).status, 404, "read-only: no write verb");
  assert.deepEqual(counts(), before);
  // mevcut karar uçları yanında çalışmaya devam eder
  assert.equal((await get(`/api/decisions/${d.json.decision.id}`)).status, 200);
  assert.equal((await get(`/api/decisions/${d.json.decision.id}/genealogy`)).status, 200);
});

test("attention: 1100 cheap duplicate tasks cannot push an OLD critical task out of \"now\"; repeats are grouped; real total reported", async () => {
  const store = new TaskStore(db);
  const agent: Actor = { kind: "agent", id: "test-agent" };
  const awaiting = (action: string, request: unknown) => {
    const t = store.create({ title: "kuyruk", requestedAction: action, request, decision: "require_approval" });
    store.transition(t.id, "awaiting_approval", agent);
    return t.id;
  };
  const oldCritical = awaiting("shell.exec", { command: "rm -rf eski" });
  for (let i = 0; i < 1100; i++) awaiting("policy.grant", { command: "echo ucuz" });
  const r = await get("/api/attention?budget=1");
  assert.equal(r.status, 200);
  assert.equal(r.json.truncated, false);
  const crit = r.json.items.find((i: { taskId: string }) => i.taskId === oldCritical);
  assert.ok(crit, "the old critical task is listed");
  assert.equal(crit.tier, "now");
  assert.equal(crit.critical, true);
  const spam = r.json.items.find((i: { requestedAction: string; count: number }) => i.requestedAction === "policy.grant" && i.count === 1100);
  assert.ok(spam, "1100 identical tasks form one row");
  assert.equal(spam.taskIds.length, 20);
  assert.ok(r.json.totalAwaiting >= 1101);
  assert.ok(r.json.totalGroups < 20);
});
