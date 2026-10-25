// D8c-3a uç testleri: ajanlar arası müzakere (madde 75) HTTP üzerinden. Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite + gerçek HTTP sunucusu; iki ScriptedAdapter ikizi. GERÇEK MODEL/İNTERNET YOK.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import type { Server } from "node:http";
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
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { createApp } from "./app.ts";

const BASE = mkTmp("agentmom-d8c3a-api-");
let server: Server;
let port = 0;
let db: Db;
let auth: AuthRegistry;
let agentToken: string;
let registry: ProviderRegistry;
let A: ModelAdapter;
let B: ModelAdapter;
const pending: Array<Promise<unknown>> = [];

const OUT: Record<string, unknown> = {
  propose: { position: "p", proposals: [{ id: "o1", summary: "s", pros: ["a"], cons: ["b"] }] },
  critique: { critiques: [{ proposalId: "o1", objection: "x", severity: "low", suggestion: "y" }], counterProposal: null, stance: "partial" },
  revise: { revisions: [{ proposalId: "o1", change: "c", answersCritique: "d" }], stance: "devam" },
  final: { stance: "partial", remainingIssues: ["kalan"], agreedPoints: ["o1"], recommendation: "öneri" },
};
const stepOf = (p: string): string => (p.includes("Konu için en çok 4 öneri") ? "propose" : p.includes("Önceki çıktıdaki (A'nın önerileri)") ? "critique" : p.includes("Eleştirmenin itirazlarına") ? "revise" : "final");

before(async () => {
  const dbPath = join(BASE, "d8c3a.db");
  db = openDb(dbPath);
  migrate(db);
  const audit = new AuditLog([new SqliteAuditSink(db)]);
  auth = new AuthRegistry();
  agentToken = auth.issueAgentToken("test-agent");
  registry = new ProviderRegistry(db);
  const script = (call: { prompt: string }) => ({ summary: JSON.stringify(OUT[stepOf(call.prompt)]) });
  A = new ModelAdapter("claude-code", script);
  B = new ModelAdapter("gemini", script);
  registry.register(A);
  registry.register(B);
  const worktreeRoot = join(BASE, "wt");
  const workflows = new WorkflowStore(db);
  const contract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedProviders: ["claude-code", "gemini"], allowedDirs: [BASE], allowedActions: ["task.create" as const, "file.read" as const, "provider.call" as const], approvalRequiredActions: [] };
  const engine = new WorkflowEngine({ tasks: new TaskStore(db), audit, registry, evidence: new EvidenceStore(db), store: workflows, contract, worktreeRoot });
  const config = structuredClone(DEFAULT_CONFIG);
  config.policy.defaultContract = contract;
  server = createApp({ db, dbPath, config, audit, auth, registry, engine, workflows, worktreeRoot, stateDir: join(BASE, "state"), modelRunTimeoutMs: 20_000, onModelRun: (d) => void pending.push(d) });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  port = (server.address() as { port: number }).port;
});

after(async () => {
  await Promise.allSettled(pending);
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

const run = (body: unknown, token: string | null = auth.userToken) => call("POST", "/api/capabilities/model/negotiation/run", body, token);

test("liste: negotiation (madde 75) alan tanımlarıyla (topic, options, constraints, rounds, providerA, providerB); iki sağlayıcı varken kullanılabilir", async () => {
  const r = await call("GET", "/api/capabilities/model");
  assert.equal(r.status, 200);
  const c = (r.json.capabilities as Array<{ id: string; madde: number; fields: Array<{ name: string }>; availability: { available: boolean; reason: string } }>).find((x) => x.id === "negotiation")!;
  assert.equal(c.madde, 75);
  assert.deepEqual(c.fields.map((f) => f.name), ["topic", "options", "constraints", "rounds", "providerA", "providerB"]);
  assert.equal(c.availability.available, true);
});

test("kimlik: belirteçsiz 401, ajan 403; müzakere uç üzerinden 202 -> done, transcript ve sonuç; untrusted:true", async () => {
  assert.equal((await run({ input: { topic: "x" } }, null)).status, 401);
  assert.equal((await run({ input: { topic: "x" } }, agentToken)).status, 403);
  const r = await run({ input: { topic: "Hangi önbellek?", options: ["Bellek", "Disk"], rounds: 2 } });
  assert.equal(r.status, 202, JSON.stringify(r.json));
  assert.equal(r.json.providerId, "claude-code+gemini");
  await Promise.allSettled(pending.splice(0));
  const g = await call("GET", `/api/capabilities/model/runs/${r.json.taskId}`);
  assert.equal(g.status, 200);
  assert.equal(g.json.status, "done");
  assert.equal(g.json.capabilityId, "negotiation");
  assert.equal(g.json.result.untrusted, true);
  assert.equal(g.json.result.outcome.status, "partial");
  assert.deepEqual(g.json.result.outcome.openIssues, ["kalan"]);
  assert.deepEqual(g.json.result.providers, { A: "claude-code", B: "gemini" });
  assert.equal(g.json.result.transcript.length, 4);
});

test("tek sağlayıcı kalınca 503 provider_unavailable + neden, model çağrısı yok; liste 'kullanılamıyor' der; sağlayıcı dönünce çalışır", async () => {
  registry.setDisabled("gemini", true, "test");
  try {
    const calls = A.calls.length + B.calls.length;
    const r = await run({ input: { topic: "x" } });
    assert.equal(r.status, 503);
    assert.equal(r.json.code, "provider_unavailable");
    assert.match(r.json.reason, /müzakere için iki farklı sağlayıcı gerekir/);
    assert.equal(A.calls.length + B.calls.length, calls);
    const list = (await call("GET", "/api/capabilities/model")).json.capabilities as Array<{ id: string; availability: { available: boolean } }>;
    assert.equal(list.find((x) => x.id === "negotiation")!.availability.available, false);
    assert.equal(list.find((x) => x.id === "inversion")!.availability.available, true);
  } finally {
    registry.setDisabled("gemini", false, "test");
  }
  const ok = await run({ input: { topic: "x", rounds: 1 } });
  assert.equal(ok.status, 202);
  await Promise.allSettled(pending.splice(0));
});

test("doğrulama ve kilit: aynı sağlayıcı 400, rounds sınırı 400; müzakere sürerken ikinci istek 429", async () => {
  assert.equal((await run({ input: { topic: "x", providerA: "gemini", providerB: "gemini" } })).status, 400);
  assert.equal((await run({ input: { topic: "x", rounds: 5 } })).status, 400);
  assert.equal((await run({ input: { topic: "x" }, extra: 1 })).status, 400);
  const first = await run({ input: { topic: "uzun" } });
  assert.equal(first.status, 202);
  const second = await run({ input: { topic: "ikinci" } });
  assert.equal(second.status, 429);
  assert.equal(second.json.code, "busy");
  await Promise.allSettled(pending.splice(0));
});
