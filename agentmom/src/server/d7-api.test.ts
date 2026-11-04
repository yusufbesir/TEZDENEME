// D7 uçları testleri (aşamalı getirme, proje hafızası derleyicisi, örtük bilgi önerileri, karar soy ağacı). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite + gerçek HTTP sunucusu; sağlayıcılar betikli ikizlerdir (model çağrısı, internet, silme yok). Bu uçlar yalnız okur: hiçbiri kaydetmez.
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
import { ProviderRegistry } from "../providers/registry.ts";
import { ScriptedAdapter } from "../testing/scripted-adapter.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { createApp } from "./app.ts";

const BASE = mkTmp("agentmom-d7-");
let server: Server;
let port: number;
let db: Db;
let auth: AuthRegistry;
let agentToken: string;

before(async () => {
  const dbPath = join(BASE, "d7.db");
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

const get = (path: string, token: string | null = auth.userToken) => call("GET", path, undefined, token);
const ZERO = "00000000-0000-0000-0000-000000000000";
const mem = (over: Record<string, unknown> = {}) => ({ kind: "fact", title: "Sunucu ayarı", body: "Çalışma sunucusu İstanbul bölgesinde tutulur.", source: "test", scope: "agentmom", confidence: 0.9, ...over });
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const rowCount = (t: string): number => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;

test("auth: no token 401, agent token 403 on every D7 route", async () => {
  for (const p of ["/api/memory/context?q=sunucu", "/api/memory/compile", "/api/memory/implicit", "/api/decisions/genealogy", `/api/decisions/${ZERO}/genealogy`]) {
    assert.equal((await get(p, null)).status, 401, p);
    assert.equal((await get(p, agentToken)).status, 403, p);
  }
});

test("context: stages 1-3 over HTTP, budget respected, retired records excluded, flags present; nothing is written", async () => {
  const a = await call("POST", "/api/memory", mem({ title: "Sunucu konumu", subject: "sunucu.konum", body: "sunucu istanbul " + "u".repeat(2000) }));
  assert.equal(a.status, 201);
  await call("POST", "/api/memory", mem({ title: "Sunucu konumu ikinci", subject: "sunucu.konum", body: "sunucu ankara" }));
  const gone = await call("POST", "/api/memory", mem({ title: "Emekli sunucu", body: "sunucu emekli kayıt" }));
  assert.equal(gone.status, 201);
  db.prepare("UPDATE memory_records SET status = 'retired' WHERE id = ?").run(gone.json.record.id);
  const before = [rowCount("memory_records"), rowCount("audit_events")];

  const s1 = await get("/api/memory/context?q=sunucu");
  assert.equal(s1.status, 200);
  assert.equal(s1.json.stage, 1);
  assert.equal(s1.json.nextStage, 2);
  assert.equal(s1.json.query, "sunucu");
  assert.equal(s1.json.items.length, 2, "retired record is not included");
  assert.ok(s1.json.items.every((i: { flags: string[] }) => i.flags.includes("contradiction")), "contradiction flags are returned, not hidden");
  assert.ok(s1.json.items[0].summary.length <= 160);
  const s2 = await get("/api/memory/context?q=SUNUCU&stage=2&scope=agentmom");
  assert.equal(s2.json.stage, 2);
  assert.ok(s2.json.items.some((i: { body?: string }) => (i.body ?? "").length === 1200));
  const s3 = await get("/api/memory/context?q=sunucu&stage=3&budget=5000");
  assert.equal(s3.json.nextStage, null);
  assert.equal(s3.json.items[0].source, "test");
  assert.equal(s3.json.items[0].contradictions.length, 1);
  const tight = await get("/api/memory/context?q=sunucu&stage=2&budget=300");
  assert.ok(tight.json.usedChars <= 300 && tight.json.budgetChars === 300);
  assert.equal(tight.json.truncated, true);
  assert.deepEqual([rowCount("memory_records"), rowCount("audit_events")], before, "a read endpoint writes neither memory nor audit");
});

test("context: parameter validation, every bad value is a plain 400 without internal detail", async () => {
  const bad = [
    "/api/memory/context",
    "/api/memory/context?q=",
    "/api/memory/context?q=%20%20",
    `/api/memory/context?q=${"x".repeat(201)}`,
    "/api/memory/context?q=a&stage=0",
    "/api/memory/context?q=a&stage=4",
    "/api/memory/context?q=a&stage=abc",
    "/api/memory/context?q=a&stage=1.5",
    "/api/memory/context?q=a&budget=199",
    "/api/memory/context?q=a&budget=20001",
    "/api/memory/context?q=a&budget=-5",
    "/api/memory/context?q=a&budget=99999999999",
    "/api/memory/context?q=a&scope=" + encodeURIComponent("bad/scope"),
    "/api/memory/context?q=a&scope=" + "s".repeat(81),
    "/api/memory/context?q=a&baska=1",
    "/api/memory/context?q=a&q=b",
  ];
  for (const p of bad) {
    const r = await get(p);
    assert.equal(r.status, 400, p);
    assert.equal(typeof r.json.error, "string");
    assert.doesNotMatch(JSON.stringify(r.json), /node_modules|\.ts|[A-Z]:\\|stack|at /, p);
  }
  assert.equal((await get("/api/memory/context?q=bulunmayan")).json.items.length, 0);
  assert.equal((await call("POST", "/api/memory/context", {})).status, 404, "only GET exists");
});

test("compile: returns markdown + sections + counts without writing any file or record; scope and maxChars work; 400s", async () => {
  await call("POST", "/api/decisions", { title: "Docker ertelendi", rationale: "Yerel çalışma bozulmasın.", scope: "agentmom", expiresAt: inDays(10), assumptions: [{ text: "Docker olmadan yeterli", checkBy: inDays(5) }] });
  const before = [rowCount("memory_records"), rowCount("decisions"), rowCount("audit_events")];
  const c = await get("/api/memory/compile");
  assert.equal(c.status, 200);
  assert.equal(typeof c.json.markdown, "string");
  assert.match(c.json.markdown, /ÜRETİLMİŞ DOSYA: veri kaynağı bellek \/ karar defteri/);
  assert.match(c.json.markdown, /Docker ertelendi/);
  assert.match(c.json.markdown, /Sunucu konumu/);
  assert.equal(c.json.truncated, false);
  assert.equal(c.json.sections.length, 6);
  assert.ok(c.json.counts.records >= 2 && c.json.counts.decisions >= 1 && c.json.counts.expiring >= 1 && c.json.counts.contradictions >= 1);
  assert.ok(!Number.isNaN(Date.parse(c.json.generatedAt)));
  const cut = await get("/api/memory/compile?maxChars=2000&scope=agentmom");
  assert.equal(cut.status, 200);
  assert.ok(cut.json.markdown.length <= 2000);
  const other = await get("/api/memory/compile?scope=yok-boyle-bir-kapsam");
  assert.equal(other.json.counts.records, 0);
  for (const p of ["/api/memory/compile?maxChars=1999", "/api/memory/compile?maxChars=60001", "/api/memory/compile?maxChars=x", "/api/memory/compile?scope=" + encodeURIComponent("a/b"), "/api/memory/compile?x=1", "/api/memory/compile?maxChars=2000&maxChars=3000"]) assert.equal((await get(p)).status, 400, p);
  assert.deepEqual([rowCount("memory_records"), rowCount("decisions"), rowCount("audit_events")], before, "compiling writes nothing");
});

test("implicit: three user approvals of the same action + target produce a suggestion; saving it with POST /api/memory (a user decision) removes it; the endpoint itself never saves", async () => {
  const target = join(BASE, "baska", "x.ts");
  for (let i = 0; i < 3; i++) {
    const t = await call("POST", "/api/tasks", { title: `yaz ${i}`, request: { action: "file.write", target } }, agentToken);
    assert.equal(t.json.task.state, "awaiting_approval");
    assert.equal((await call("POST", `/api/tasks/${t.json.task.id}/approve`, {})).status, 200);
  }
  const memBefore = rowCount("memory_records");
  const r = await get("/api/memory/implicit");
  assert.equal(r.status, 200);
  assert.equal(r.json.minRepeats, 3);
  assert.ok(r.json.scannedAuditEvents > 0);
  const c = r.json.candidates.find((x: { rule: string }) => x.rule === "approval_repeat");
  assert.ok(c, JSON.stringify(r.json.candidates));
  assert.equal(c.kind, "note");
  assert.equal(c.count, 3);
  assert.equal(c.confidence, 0.6);
  assert.equal(c.evidence.length, 3);
  assert.match(c.text, /file\.write/);
  assert.equal(rowCount("memory_records"), memBefore, "suggestions are never saved automatically");
  const saved = await call("POST", "/api/memory", mem({ kind: "note", title: "Kalıcı izin önerisi", body: c.text }));
  assert.equal(saved.status, 201);
  const again = await get("/api/memory/implicit");
  assert.equal(again.json.candidates.some((x: { id: string }) => x.id === c.id), false, "already recorded => dropped");
  assert.ok(again.json.skippedAlreadyRecorded >= 1);
  assert.equal((await get("/api/memory/implicit?x=1")).status, 400);
});

test("genealogy: forest and per-decision chain over HTTP; unknown id 404; bad parameters 400", async () => {
  const a = await call("POST", "/api/decisions", { title: "Soy A", rationale: "Birinci.", scope: "agentmom", expiresAt: inDays(60) });
  assert.equal(a.status, 201);
  const b = await call("POST", "/api/decisions", { title: "Soy A v2", rationale: "İkinci.", scope: "agentmom", expiresAt: inDays(90), supersedesId: a.json.decision.id, assumptions: [{ text: "Varsayım x", checkBy: inDays(20) }] });
  assert.equal(b.status, 201);
  const decisionsBefore = rowCount("decisions");
  const g = await get(`/api/decisions/${a.json.decision.id}/genealogy`);
  assert.equal(g.status, 200);
  assert.equal(g.json.genealogy.root, a.json.decision.id);
  assert.deepEqual(g.json.genealogy.chain, [a.json.decision.id, b.json.decision.id]);
  assert.equal(g.json.genealogy.current, b.json.decision.id);
  assert.equal(g.json.genealogy.depth, 2);
  assert.deepEqual(g.json.genealogy.nodes.map((n: { state: string }) => n.state), ["superseded", "active"]);
  assert.deepEqual(g.json.genealogy.nodes[1].assumptions, [{ text: "Varsayım x", status: "unvalidated" }]);
  assert.equal((await get(`/api/decisions/${b.json.decision.id}/genealogy`)).json.genealogy.root, a.json.decision.id);
  const f = await get("/api/decisions/genealogy");
  assert.equal(f.status, 200);
  assert.ok(f.json.totalRoots >= 2);
  assert.equal(f.json.truncated, false);
  const tree = f.json.trees.find((t: { root: string }) => t.root === a.json.decision.id);
  assert.equal(tree.headTitle, "Soy A v2");
  assert.equal(tree.headState, "active");
  assert.equal(tree.depth, 2);
  assert.equal(f.json.trees.some((t: { root: string }) => t.root === b.json.decision.id), false, "a superseding decision is not a root");
  assert.equal((await get(`/api/decisions/${ZERO}/genealogy`)).status, 404);
  assert.equal((await get("/api/decisions/degil-uuid/genealogy")).status, 404);
  assert.equal((await get("/api/decisions/genealogy?x=1")).status, 400);
  assert.equal((await get(`/api/decisions/${a.json.decision.id}/genealogy?x=1`)).status, 400);
  assert.equal((await call("POST", `/api/decisions/${a.json.decision.id}/genealogy`, {})).status, 404, "read-only: no write verb");
  assert.equal(rowCount("decisions"), decisionsBefore);
  // the existing decision routes still work next to the new ones
  assert.equal((await get(`/api/decisions/${a.json.decision.id}`)).json.decision.status, "superseded");
  assert.equal((await get("/api/decisions")).status, 200);
});
