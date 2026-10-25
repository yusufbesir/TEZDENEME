// D8c-2b uç testleri: internetli model yetenekleri (37, 38, 40) HTTP üzerinden. Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite + gerçek HTTP sunucusu; yukarı akış yerel sahte sunucu (çözümleyici + transportOverride yalnız test bağlamında); sağlayıcı ScriptedAdapter ikizi. GERÇEK İNTERNET/MODEL YOK.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { ModelAdapter } from "../testing/model-kit.ts";
import { AuditLog, SqliteAuditSink } from "../core/audit/audit.ts";
import { AuthRegistry } from "../core/auth/auth.ts";
import { DEFAULT_CONFIG } from "../core/config/config.ts";
import { openDb } from "../core/db/db.ts";
import type { Db } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { TaskStore } from "../core/tasks/tasks.ts";
import { FetchLimiter } from "../net/web-fetch.ts";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { createApp } from "./app.ts";

const BASE = mkTmp("agentmom-d8c2b-api-");
const PUBLIC_IP = "93.184.216.34";
const TEXT = "Little yasası: L = λW. Bu yasa kuyruk sistemlerinde ortalama müşteri sayısını verir.";
let server: Server;
let upstream: Server;
let port = 0;
let upstreamPort = 0;
let db: Db;
let auth: AuthRegistry;
let agentToken: string;
let adapter: ModelAdapter;
let out = "";
const pending: Array<Promise<unknown>> = [];

before(async () => {
  upstream = createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end((req.url ?? "").startsWith("/dok") ? TEXT : "baska");
  });
  await new Promise<void>((ok) => upstream.listen(0, "127.0.0.1", ok));
  upstreamPort = (upstream.address() as AddressInfo).port;
  const dbPath = join(BASE, "d8c2b.db");
  db = openDb(dbPath);
  migrate(db);
  const audit = new AuditLog([new SqliteAuditSink(db)]);
  auth = new AuthRegistry();
  agentToken = auth.issueAgentToken("test-agent");
  const registry = new ProviderRegistry(db);
  adapter = new ModelAdapter("claude-code", () => ({ summary: out }));
  registry.register(adapter);
  const worktreeRoot = join(BASE, "wt");
  const workflows = new WorkflowStore(db);
  const contract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedProviders: ["claude-code"], allowedDirs: [BASE], allowedActions: ["task.create" as const, "file.read" as const, "provider.call" as const], approvalRequiredActions: [] };
  const engine = new WorkflowEngine({ tasks: new TaskStore(db), audit, registry, evidence: new EvidenceStore(db), store: workflows, contract, worktreeRoot });
  const config = structuredClone(DEFAULT_CONFIG);
  config.policy.defaultContract = contract;
  server = createApp({
    db,
    dbPath,
    config,
    audit,
    auth,
    registry,
    engine,
    workflows,
    worktreeRoot,
    stateDir: join(BASE, "state"),
    modelRunTimeoutMs: 5000,
    onModelRun: (d) => void pending.push(d),
    net: {
      resolver: async (h) => {
        if (h !== "example.com" && h !== "evil.com") throw new Error("ENOTFOUND");
        return [{ address: PUBLIC_IP, family: 4 }];
      },
      transportOverride: { remap: () => ({ address: "127.0.0.1", port: upstreamPort, tls: false }) },
      limiter: new FetchLimiter({ perMinute: 100 }),
      limits: { totalMs: 3000 },
    },
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  port = (server.address() as AddressInfo).port;
});

after(async () => {
  await Promise.allSettled(pending);
  server.closeAllConnections();
  upstream.closeAllConnections();
  await new Promise<void>((ok) => server.close(() => ok()));
  await new Promise<void>((ok) => upstream.close(() => ok()));
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
          const t = Buffer.concat(chunks).toString("utf8");
          ok({ status: res.statusCode ?? 0, json: t ? JSON.parse(t) : null });
        });
      },
    );
    req.on("error", fail);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

const run = (id: string, body: unknown, token: string | null = auth.userToken) => call("POST", `/api/capabilities/model/${id}/run`, body, token);
const FINDINGS = (si: number | null, quote: string | null) => JSON.stringify({ summary: "s", findings: [{ claim: "c", sourceIndex: si, quote, confidence: "low" }], gaps: [], followUps: [] });

test("liste: 37/38/40 needsNet:true ve net özeti (kapalıyken enabled:false), urls/tickets alan tanımları; diğer yeteneklerde needsNet yok", async () => {
  const r = await call("GET", "/api/capabilities/model");
  assert.equal(r.status, 200);
  const list = r.json.capabilities as Array<{ id: string; madde: number; needsNet?: boolean; net?: { enabled: boolean; allowedDomains: string[] }; fields: Array<{ name: string; kind: string; maxItems?: number }>; availability: { available: boolean } }>;
  assert.equal(list.length, 10);
  const nets = list.filter((c) => c.needsNet);
  assert.deepEqual(nets.map((c) => c.id).sort(), ["competitor-research", "feature-discovery", "research-center"]);
  assert.deepEqual(nets.map((c) => c.madde).sort((a, b) => a - b), [37, 38, 40]);
  for (const c of nets) {
    assert.deepEqual(c.net, { enabled: false, allowedDomains: [] });
    assert.equal(c.fields.find((f) => f.name === "urls")?.maxItems, 5);
    assert.equal(c.fields.find((f) => f.name === "tickets")?.kind, "map");
    assert.equal(c.availability.available, true);
  }
  assert.ok(list.filter((c) => !c.needsNet).every((c) => c.net === undefined));
  assert.equal((await call("GET", "/api/capabilities/model", undefined, null)).status, 401);
  assert.equal((await call("GET", "/api/capabilities/model", undefined, agentToken)).status, 403);
});

test("ayar KAPALI: adresli koşu 403 net_disabled + howToEnable ve MODEL ÇAĞRILMAZ; kaynaksız koşu çalışır (sourceless + uyarı)", async () => {
  const calls = adapter.calls.length;
  const r = await run("research-center", { input: { question: "Little yasası nedir?", urls: ["https://example.com/dok"] } });
  assert.equal(r.status, 403);
  assert.equal(r.json.code, "net_disabled");
  assert.match(r.json.howToEnable, /Ayarlar/);
  assert.equal(adapter.calls.length, calls);
  out = FINDINGS(null, null);
  const ok = await run("research-center", { input: { question: "Little yasası nedir?" } });
  assert.equal(ok.status, 202);
  await Promise.allSettled(pending.splice(0));
  const g = await call("GET", `/api/capabilities/model/runs/${ok.json.taskId}`);
  assert.equal(g.json.status, "done");
  assert.equal(g.json.result.sourceless, true);
  assert.match(g.json.result.warning, /yalnız model bilgisiyle üretildi; doğrulayın/);
});

test("ayar AÇIK: onay bileti al (POST /api/net/approve) -> koşu kaynağı getirir, alıntı doğrulanır; aynı bilet ikinci koşuda 502; ajan 403; izinsiz alan adı 403", async () => {
  const s = await call("POST", "/api/net/settings", { enabled: true, allowedDomains: ["example.com"], perUseApproval: true });
  assert.equal(s.status, 200);
  const list = (await call("GET", "/api/capabilities/model")).json.capabilities as Array<{ id: string; net?: { enabled: boolean; allowedDomains: string[] } }>;
  assert.deepEqual(list.find((c) => c.id === "research-center")!.net, { enabled: true, allowedDomains: ["example.com"] });

  const url = "https://example.com/dok";
  const ap = await call("POST", "/api/net/approve", { url });
  assert.equal(ap.status, 200);
  out = JSON.stringify({ summary: "s", findings: [{ claim: "gerçek", sourceIndex: 1, quote: "Bu yasa kuyruk sistemlerinde ortalama müşteri sayısını verir", confidence: "high" }, { claim: "uydurma", sourceIndex: 1, quote: "bu cümle kaynakta hiç yok", confidence: "low" }], gaps: [], followUps: [] });
  const body = { input: { question: "Little yasası nedir?", urls: [url], tickets: { [url]: ap.json.ticket } } };
  assert.equal((await run("research-center", body, agentToken)).status, 403);
  const r = await run("research-center", body);
  assert.equal(r.status, 202, JSON.stringify(r.json));
  await Promise.allSettled(pending.splice(0));
  const g = (await call("GET", `/api/capabilities/model/runs/${r.json.taskId}`)).json;
  assert.equal(g.status, "done", JSON.stringify(g.error));
  assert.deepEqual(g.result.findings.map((f: { verified: boolean }) => f.verified), [true, false]);
  assert.equal(g.result.unverifiedCount, 1);
  assert.equal(g.result.sources[0].url, url);
  assert.match(g.result.sources[0].sha256, /^[0-9a-f]{64}$/);
  // Aynı bilet ikinci koşuda reddedilir -> hiçbir kaynak getirilemez.
  const calls = adapter.calls.length;
  const again = await run("research-center", body);
  assert.equal(again.status, 502);
  assert.equal(again.json.code, "sources_unavailable");
  assert.equal(again.json.sources[0].error, "approval_required");
  assert.equal(adapter.calls.length, calls);
  // İzinli olmayan alan adı.
  const bad = await run("research-center", { input: { question: "q", urls: ["https://evil.com/dok"] } });
  assert.equal(bad.status, 403);
  assert.equal(bad.json.code, "host_not_allowed");
  assert.equal(adapter.calls.length, calls);
});
