// D8b uçları testleri (sistem analitiği: etki haritası, süreklilik, çıkış planı, aracı, çevrimdışı kip, uzmanlık, gölge fiyat, eksiklik dedektörü).
// Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite + gerçek HTTP sunucusu; sağlayıcılar betikli ikizlerdir (model çağrısı, internet, silme yok). Bu uçlar yalnız OKUR: hiçbiri kayıt ya da denetim satırı yazmaz.
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
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { OPERATIONS } from "../providers/contract.ts";
import type { CapabilityDeclaration } from "../providers/contract.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { ScriptedAdapter } from "../testing/scripted-adapter.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { createApp } from "./app.ts";

// Yetenek durumları elle verilen betikli sağlayıcı.
class CapAdapter extends ScriptedAdapter {
  private readonly caps: Record<string, string>;
  constructor(id: string, caps: Record<string, string>, routeKind: "subscription" | "local" | "api_paid") {
    super(id, () => ({ summary: "ok" }), { routeKind });
    this.caps = caps;
  }
  override describeCapabilities(): CapabilityDeclaration[] {
    return OPERATIONS.map((operation) => ({ operation, status: (this.caps[operation] ?? "unsupported") as CapabilityDeclaration["status"], evidenceSource: "test", checkedAt: "2026-10-21T00:00:00.000Z" }));
  }
}

const BASE = mkTmp("agentmom-d8b-");
let server: Server;
let port: number;
let db: Db;
let auth: AuthRegistry;
let agentToken: string;
let audit: AuditLog;

before(async () => {
  const dbPath = join(BASE, "d8b.db");
  db = openDb(dbPath);
  migrate(db);
  audit = new AuditLog([new SqliteAuditSink(db)]);
  auth = new AuthRegistry();
  agentToken = auth.issueAgentToken("test-agent");
  const registry = new ProviderRegistry(db);
  registry.register(new CapAdapter("claude-code", { execute: "partial", streamEvents: "partial", collectEvidence: "partial", getUsage: "partial", testConnection: "unverified", describeCapabilities: "verified", cancel: "partial" }, "subscription"));
  registry.register(new CapAdapter("local-x", { execute: "verified", testConnection: "verified", describeCapabilities: "verified", dispose: "verified" }, "local"));
  registry.register(new CapAdapter("paid-x", { execute: "verified", streamEvents: "verified", collectEvidence: "verified", getUsage: "verified" }, "api_paid"));
  const worktreeRoot = join(BASE, "wt");
  const workflows = new WorkflowStore(db);
  const contract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedProviders: ["claude-code", "local-x"], allowedDirs: [BASE], allowedActions: ["task.create" as const, "file.read" as const, "file.write" as const, "verification.run" as const], approvalRequiredActions: ["file.write" as const, "verification.run" as const] };
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
      { host: "127.0.0.1", port, method, path, headers: { host: `127.0.0.1:${port}`, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(payload !== undefined ? { "content-type": "application/json" } : {}) } },
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
const rowCount = (t: string): number => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
const counts = () => ["tasks", "audit_events", "task_evidence", "memory_records", "providers", "capabilities", "provider_state", "workflows", "workflow_steps", "verification_runs", "decisions", "predictions"].map(rowCount);
const NO_INTERNALS = /node_modules|[A-Z]:\\|stack|\n\s+at /;

const ROUTES = [
  "/api/analysis/impact?file=src/providers/registry.ts",
  "/api/analysis/graph",
  "/api/analysis/continuity",
  "/api/analysis/portfolio",
  "/api/analysis/exit?provider=claude-code",
  "/api/analysis/broker?capability=execute",
  "/api/analysis/offline",
  "/api/analysis/expertise",
  "/api/analysis/shadow-price",
  "/api/analysis/absence",
  "/api/analysis/switching?days=7",
];

test("auth: no token 401 and agent token 403 on every analysis route; only GET exists", async () => {
  for (const p of ROUTES) {
    assert.equal((await get(p, null)).status, 401, p);
    assert.equal((await get(p, agentToken)).status, 403, p);
    assert.equal((await call("POST", p.split("?")[0] as string, {})).status, 404, `${p}: POST`);
    assert.equal((await call("POST", p.split("?")[0] as string, {}, null)).status, 401, `${p}: anonymous POST`);
  }
});

test("impact: dependents, tests, radius; parameter errors 400 and unknown file 404 without internal detail", async () => {
  const r = await get("/api/analysis/impact?file=src/providers/registry.ts");
  assert.equal(r.status, 200);
  const x = r.json.impact;
  assert.equal(x.file, "src/providers/registry.ts");
  assert.equal(x.depth, 3);
  assert.ok(x.layers[0].files.includes("src/server/app.ts"));
  assert.ok(x.affectedTests.some((t: { file: string }) => t.file.endsWith(".test.ts")));
  assert.ok(x.radius.direct >= 5 && x.radius.transitive >= x.radius.direct - x.radius.tests);
  assert.equal(typeof x.inCycle, "boolean");
  assert.ok(x.directImports.includes("src/providers/contract.ts"));
  assert.equal((await get("/api/analysis/impact?file=src/providers/registry.ts&depth=1")).json.impact.depth, 1);
  assert.equal((await get("/api/analysis/impact?file=src/providers/registry.ts&depth=6")).status, 200);
  const bad = [
    "",
    "?depth=2",
    "?file=",
    "?file=../package.json",
    "?file=src/../package.json",
    "?file=/etc/passwd",
    "?file=C:/Windows/x.ts",
    "?file=src%5Cserver%5Capp.ts",
    "?file=src/server/app.ts:stream",
    "?file=package.json",
    "?file=src/core/db/migrations/001_init.sql",
    "?file=src/server/app.ts&depth=0",
    "?file=src/server/app.ts&depth=7",
    "?file=src/server/app.ts&depth=x",
    "?file=src/server/app.ts&depth=1.5",
    "?file=src/server/app.ts&depth=1&depth=2",
    "?file=src/server/app.ts&extra=1",
    `?file=${"src/" + "a/".repeat(150) + "x.ts"}`,
  ];
  for (const q of bad) {
    const b = await get(`/api/analysis/impact${q}`);
    assert.equal(b.status, 400, q);
    assert.equal(typeof b.json.error, "string");
    assert.doesNotMatch(JSON.stringify(b.json), NO_INTERNALS);
  }
  const nf = await get("/api/analysis/impact?file=src/yok/hic-yok.ts");
  assert.equal(nf.status, 404);
  assert.doesNotMatch(JSON.stringify(nf.json), /hic-yok/, "the path is not echoed back");
});

test("graph: summary only, within the time budget", async () => {
  const t0 = Date.now();
  const r = await get("/api/analysis/graph");
  assert.ok(Date.now() - t0 < 5000);
  assert.equal(r.status, 200);
  const g = r.json.graph;
  assert.ok(g.files > 100 && g.edges > 100);
  assert.ok(g.cycleCount >= 0 && Array.isArray(g.cycles));
  assert.ok(g.topDependedOn.length > 0 && g.topDependedOn.length <= 20);
  assert.equal(g.scan.truncated, false);
  assert.equal(g.imports, undefined, "no per-file edge list in the summary");
  assert.equal((await get("/api/analysis/graph?x=1")).status, 400);
});

test("continuity: nodes, edges, single points and loss summary from the registry only", async () => {
  const r = await get("/api/analysis/continuity");
  assert.equal(r.status, 200);
  const c = r.json.continuity;
  assert.deepEqual(c.providers.map((p: { id: string }) => p.id), ["claude-code", "local-x", "paid-x"]);
  assert.ok(c.edges.some((e: { provider: string; capability: string; status: string }) => e.provider === "local-x" && e.capability === "execute" && e.status === "verified"));
  assert.ok(!c.edges.some((e: { provider: string; capability: string }) => e.provider === "claude-code" && e.capability === "dispose"), "unsupported is not an offer");
  assert.deepEqual(c.singlePoints.filter((s: { capability: string }) => s.capability === "dispose").map((s: { provider: string }) => s.provider), ["local-x"]);
  const lossLocal = c.ifProviderLost.find((l: { provider: string }) => l.provider === "local-x");
  assert.deepEqual(lossLocal.lost, ["dispose"]);
  assert.ok(lossLocal.retained.includes("execute"));
  assert.equal(c.summary.providers, 3);
  assert.equal((await get("/api/analysis/continuity?x=1")).status, 400);
});

test("portfolio: only the contract's trustedRepos (none here -> empty honest report), params rejected", async () => {
  const r = await get("/api/analysis/portfolio");
  assert.equal(r.status, 200);
  assert.deepEqual([r.json.portfolio.projects.length, r.json.portfolio.truncated], [0, false]);
  assert.ok(r.json.portfolio.notes.length > 0);
  assert.equal((await get("/api/analysis/portfolio?x=1")).status, 400);
});

test("exit: paid route is closed, policy-denied is excluded, candidates are scored; 400 / 404", async () => {
  const r = await get("/api/analysis/exit?provider=claude-code");
  assert.equal(r.status, 200);
  const e = r.json.exit;
  assert.equal(e.target.id, "claude-code");
  assert.deepEqual(e.candidates.map((c: { provider: string }) => c.provider), ["local-x"]);
  assert.ok(e.candidates[0].swapScore > 0 && e.candidates[0].swapScore < 100);
  assert.ok(e.candidates[0].missing.length > 0);
  assert.deepEqual(e.closed.map((c: { provider: string }) => c.provider), ["paid-x"]);
  assert.equal(e.closed[0].swapScore, null);
  assert.equal(e.verdict, "kısmi yedek");
  const l = await get("/api/analysis/exit?provider=local-x");
  assert.equal(l.json.exit.candidates[0].provider, "claude-code");
  assert.equal(l.json.exit.verdict, "kısmi yedek", "claude-code covers execute (partial) and describeCapabilities only");
  assert.equal((await get("/api/analysis/exit?provider=yok-boyle")).status, 404);
  for (const q of ["", "?provider=", "?provider=BÜYÜK", "?provider=a_b", `?provider=${"a".repeat(41)}`, "?provider=local-x&provider=claude-code", "?provider=local-x&x=1"]) {
    const b = await get(`/api/analysis/exit${q}`);
    assert.equal(b.status, 400, q);
    assert.doesNotMatch(JSON.stringify(b.json), NO_INTERNALS);
  }
});

test("broker: ordered candidates with reasons, eliminations with causes, empty answer is honest; 400s", async () => {
  const r = await get("/api/analysis/broker?capability=execute&role=implement");
  assert.equal(r.status, 200);
  const b = r.json.broker;
  assert.deepEqual(b.candidates.map((c: { provider: string }) => c.provider), ["local-x", "claude-code"], "verified+local first");
  assert.ok(b.candidates[0].reasons.length >= 3);
  assert.equal(b.role, "implement");
  const paid = b.eliminated.find((x: { provider: string }) => x.provider === "paid-x");
  assert.match(paid.reasons.join(" "), /ücretli rota/);
  const none = await get("/api/analysis/broker?capability=cancel");
  assert.deepEqual(none.json.broker.candidates.map((c: { provider: string }) => c.provider), ["claude-code"]);
  const empty = await get("/api/analysis/broker?capability=validateConfiguration");
  assert.equal(empty.json.broker.summary, "uygun sağlayıcı yok");
  assert.equal(empty.json.broker.candidates.length, 0);
  assert.equal(empty.json.broker.role, null);
  for (const q of ["", "?role=plan", "?capability=", "?capability=rm", "?capability=execute&role=boss", "?capability=execute&role=tekil", "?capability=execute&capability=cancel", "?capability=execute&x=1"]) {
    const bad = await get(`/api/analysis/broker${q}`);
    assert.equal(bad.status, 400, q);
    assert.doesNotMatch(JSON.stringify(bad.json), NO_INTERNALS);
  }
});

test("offline: online with a verified provider; offline when every allowed provider is disabled (and back)", async () => {
  const on = await get("/api/analysis/offline");
  assert.equal(on.status, 200);
  assert.equal(on.json.offline.mode, "çevrimiçi");
  assert.equal(on.json.offline.offline, false);
  assert.ok(on.json.offline.works.length > 5 && on.json.offline.needsProvider.length > 0);
  assert.equal(on.json.offline.blockedNow.length, 0);
  assert.equal((await call("POST", "/api/providers/local-x/disable", {})).status, 200);
  assert.equal((await call("POST", "/api/providers/claude-code/disable", {})).status, 200);
  try {
    const off = (await get("/api/analysis/offline")).json.offline;
    assert.equal(off.mode, "çevrimdışı");
    assert.equal(off.offline, true);
    assert.deepEqual(off.blockedNow.map((f: { id: string }) => f.id), off.needsProvider.map((f: { id: string }) => f.id));
    assert.match(off.providers.find((p: { id: string }) => p.id === "paid-x").reasons.join(" "), /izinli/);
    const br = await get("/api/analysis/broker?capability=execute");
    assert.equal(br.json.broker.candidates.length, 0, "disabled providers are not recommended");
    const ex = await get("/api/analysis/exit?provider=claude-code");
    assert.equal(ex.json.exit.verdict, "yedek yok");
    assert.equal(ex.json.exit.excluded.find((c: { provider: string }) => c.provider === "local-x").reasons.join(" ").includes("devre dışı"), true);
  } finally {
    assert.equal((await call("POST", "/api/providers/local-x/enable", {})).status, 200);
    assert.equal((await call("POST", "/api/providers/claude-code/enable", {})).status, 200);
  }
  assert.equal((await get("/api/analysis/offline")).json.offline.mode, "çevrimiçi");
  assert.equal((await get("/api/analysis/offline?x=1")).status, 400);
});

test("expertise: observed runs per provider x role; small samples carry no rate", async () => {
  let n = 0;
  const ev = (action: string, result: string, details: Record<string, unknown>): void => {
    audit.record({ initiator: { kind: "system", id: "orchestrator" }, action, decision: "n/a", result, details });
  };
  for (let i = 0; i < 6; i++) {
    ev("workflow.step.started", "running", { workflowId: "wf-e", step: n, role: "review", providerId: "claude-code", attempt: 1 });
    ev("workflow.step.succeeded", "ok", { workflowId: "wf-e", step: n++, role: "review", providerId: "claude-code" });
  }
  ev("workflow.step.started", "running", { workflowId: "wf-e", step: 99, role: "plan", providerId: "local-x", attempt: 1 });
  ev("workflow.step.retry", "timeout", { workflowId: "wf-e", step: 99, providerId: "local-x", attempt: 1 });
  ev("run.refused:capability", "capability_unsupported", { taskId: "t", providerId: "local-x", operation: "execute" });
  const r = await get("/api/analysis/expertise");
  assert.equal(r.status, 200);
  const x = r.json.expertise;
  const rev = x.rows.find((q: { provider: string; role: string }) => q.provider === "claude-code" && q.role === "review");
  assert.deepEqual([rev.attempts, rev.succeeded, rev.status, rev.successRate], [6, 6, "yeterli", 1]);
  const plan = x.rows.find((q: { provider: string; role: string }) => q.provider === "local-x" && q.role === "plan");
  assert.deepEqual([plan.attempts, plan.failed, plan.status, plan.successRate, plan.avgDurationMs, plan.lastErrorKinds], [1, 1, "yetersiz veri", null, null, ["timeout"]]);
  assert.deepEqual(x.refusals, [{ provider: "local-x", kind: "capability", count: 1 }]);
  assert.equal(x.minSample, 5);
  assert.equal(x.scan.truncated, false);
  // aracı, rolde yeterli gözlemi olan sağlayıcıyı notunda gösterir
  const br = await get("/api/analysis/broker?capability=execute&role=review");
  assert.equal(br.json.broker.candidates.find((c: { provider: string }) => c.provider === "claude-code").roleObservation.attempts, 6);
  assert.equal((await get("/api/analysis/expertise?x=1")).status, 400);
});

test("shadow-price: no invented limit, no currency, usage windows from stored records", async () => {
  const ts = new Date().toISOString();
  db.prepare("INSERT INTO tasks (id, title, state, requested_action, request_json, decision, created_at, updated_at) VALUES ('tsk-shadow','x','approved','file.read','{}','allow',?,?)").run(ts, ts);
  const ev = new EvidenceStore(db);
  ev.add("tsk-shadow", "att1", "execution", "ok", { provider: "claude-code" });
  ev.add("tsk-shadow", "att1", "usage", "reported", { inputTokens: 100, outputTokens: 20, costUsd: 5, source: "reported" });
  const r = await get("/api/analysis/shadow-price");
  assert.equal(r.status, 200);
  const s = r.json.shadowPrice;
  assert.equal(s.costBasis, "list");
  assert.equal(s.currency, null);
  assert.deepEqual(s.providers.map((p: { provider: string }) => p.provider), ["claude-code", "local-x", "paid-x"]);
  const c = s.providers.find((p: { provider: string }) => p.provider === "claude-code");
  assert.equal(c.last7d.tokens, 120);
  assert.equal(c.last24h.tokens, 120);
  assert.equal(c.limit, null);
  assert.equal(c.shadowPriceIndex, null);
  assert.equal(c.status, "sınır bilinmiyor");
  assert.match(s.note, /ücret yok/);
  assert.doesNotMatch(JSON.stringify(s), /costUsd|usd|\$/i);
  assert.equal((await get("/api/analysis/shadow-price?x=1")).status, 400);
});

test("absence: informational lists, capped, no deletion advice", async () => {
  const t0 = Date.now();
  const r = await get("/api/analysis/absence");
  assert.ok(Date.now() - t0 < 5000);
  assert.equal(r.status, 200);
  const a = r.json.absence;
  for (const l of [a.unused.tables, a.unused.endpoints, a.unused.endpointsOnlyTests, a.unused.capabilities, a.missing.endpointsWithoutUi, a.missing.modulesWithoutDirectTest]) {
    assert.ok(Array.isArray(l.items) && l.items.length <= 200 && l.total >= l.items.length && typeof l.truncated === "boolean");
  }
  for (const t of a.unused.tables.items.filter((q: { migration: string }) => q.migration === "009_rea.sql")) assert.equal(t.deliberate, true);
  assert.ok(a.missing.plannedTotal > 0 && a.missing.plannedBySlice.length > 0);
  assert.equal(a.scan.truncated, false);
  assert.match(a.note, /silme ya da değiştirme önerisi değildir/);
  assert.equal((await get("/api/analysis/absence?x=1")).status, 400);
});

test("side-effect free: no table changes and no audit rows from any analysis call", async () => {
  const before = counts();
  for (const p of ROUTES) assert.equal((await get(p)).status, 200, p);
  for (const p of ["/api/analysis/broker?capability=getUsage&role=plan", "/api/analysis/exit?provider=local-x", "/api/analysis/impact?file=src/server/app.ts&depth=6"]) assert.equal((await get(p)).status, 200, p);
  assert.deepEqual(counts(), before);
});

test("concurrent scans: at most one runs, the other gets 429 busy (never a 5xx)", async () => {
  const rs = await Promise.all([get("/api/analysis/graph"), get("/api/analysis/graph"), get("/api/analysis/absence")]);
  for (const r of rs) assert.ok(r.status === 200 || r.status === 429, String(r.status));
  assert.ok(rs.some((r) => r.status === 200));
  for (const r of rs.filter((x) => x.status === 429)) assert.equal(r.json.code, "busy");
  assert.equal((await get("/api/analysis/graph")).status, 200, "the lock is released afterwards");
});

test("switching: partial indicator with sample size and limits note; days validation; read-only", async () => {
  const r = await get("/api/analysis/switching");
  assert.equal(r.status, 200);
  const s = r.json.switching;
  assert.equal(s.days, 7);
  assert.equal(s.switches.perDay.length, 7);
  assert.equal(typeof s.sample.events, "number");
  assert.ok(["yeterli", "yetersiz veri"].includes(s.status));
  assert.match(s.limits, /KISMİ bir göstergedir/);
  assert.match(s.reload.label, /^tahmini yeniden yükleme token'ı: /);
  assert.equal((await get("/api/analysis/switching?days=30")).json.switching.switches.perDay.length, 30);
  assert.equal((await get("/api/analysis/switching?days=1")).json.switching.switches.perDay.length, 1);
  for (const q of ["?days=0", "?days=31", "?days=x", "?days=1.5", "?days=", "?days=-1", "?days=1&days=2", "?x=1", "?days=99999999999"]) {
    const b = await get(`/api/analysis/switching${q}`);
    assert.equal(b.status, 400, q);
    assert.doesNotMatch(JSON.stringify(b.json), NO_INTERNALS);
  }
  const before = counts();
  await get("/api/analysis/switching?days=14");
  assert.deepEqual(counts(), before);
});
