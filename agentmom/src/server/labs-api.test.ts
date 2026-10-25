// Doğrulama laboratuvarı ucu testleri (POST /api/verification/labs). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite + gerçek HTTP sunucusu (kalıp: d5b-api.test.ts); api laboratuvarı için ayrıca yerel bir hedef sunucu. Model çağrısı, internet, silme yok.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import type { Server, ServerResponse } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { A11Y_CHECKS } from "../verify/labs/a11y.ts";
import { DESIGN_CHECKS } from "../verify/labs/design.ts";
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
import { validateRunResult } from "../verify/schema.ts";
import { createApp } from "./app.ts";

const BASE = mkTmp("agentmom-labs-");
let server: Server;
let port: number;
let db: Db;
let auth: AuthRegistry;
let agentToken: string;
let automation: AutomationEngine;
let target: Server;
let targetBase: string;
const held: ServerResponse[] = [];

before(async () => {
  const dbPath = join(BASE, "labs.db");
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
  const contract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedProviders: ["claude-code"], allowedDirs: [BASE], forbiddenDirs: [join(BASE, "forbidden")], allowedActions: ["task.create" as const, "file.read" as const, "file.write" as const, "verification.run" as const], approvalRequiredActions: ["file.write" as const, "verification.run" as const] };
  const engine = new WorkflowEngine({ tasks: new TaskStore(db), audit, registry, evidence: new EvidenceStore(db), store: workflows, contract, worktreeRoot });
  const config = structuredClone(DEFAULT_CONFIG);
  config.policy.defaultContract = contract;
  server = createApp({ db, dbPath, config, audit, auth, registry, engine, workflows, worktreeRoot, automation });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const addr = server.address();
  port = typeof addr === "object" && addr ? addr.port : 0;
  target = createServer((req, res) => {
    // /hold: yanıt serbest bırakılana kadar bekletilir (meşgul / iptal testleri için).
    if (req.url === "/hold") {
      held.push(res);
      return;
    }
    const text = JSON.stringify({ hello: "world", auth: req.headers.authorization ?? null });
    res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(text) });
    res.end(text);
  });
  await new Promise<void>((ok) => target.listen(0, "127.0.0.1", ok));
  targetBase = `http://127.0.0.1:${(target.address() as { port: number }).port}`;
});

after(async () => {
  releaseHeld();
  target.closeAllConnections();
  await new Promise<void>((ok) => target.close(() => ok()));
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



const LABS = "/api/verification/labs";
const contractsSpec = { subject: { x: 1 }, contracts: [{ name: "x is one", kind: "invariant", rule: { op: "equals", path: "x", value: 1 } }, { name: "x is two", kind: "invariant", rule: { op: "equals", path: "x", value: 2 } }] };
const machine = { initial: "a", states: ["a", "b"], final: ["b"], transitions: [{ from: "a", event: "go", to: "b" }] };
const auditRows = (): Array<{ action: string; decision: string; result: string; initiator: { kind: string }; details: Record<string, unknown> }> => {
  const rows = db.prepare("SELECT * FROM audit_events WHERE action = 'verification.lab' ORDER BY rowid").all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({ action: r.action as string, decision: r.decision as string, result: r.result as string, initiator: { kind: r.initiator_kind as string }, details: JSON.parse(String(r.details_json ?? r.details ?? "{}")) as Record<string, unknown> }));
};
const releaseHeld = (): void => {
  for (const r of held.splice(0)) {
    try {
      r.writeHead(200, { "content-type": "application/json" });
      r.end("{}");
    } catch {
      /* bağlantı zaten kapalı */
    }
  }
};
const until = async (cond: () => boolean, ms = 3000): Promise<void> => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("condition not met in time");
    await new Promise((r) => setTimeout(r, 10));
  }
};
const holdSpec = (): unknown => ({ baseUrl: targetBase, stepTimeoutMs: 8000, steps: [{ name: "held", method: "GET", path: "/hold", expect: { status: 200 } }] });

test("labs endpoint: anonymous 401, agent token 403 (and no audit row), GET not allowed", async () => {
  const body = { kind: "contracts", spec: contractsSpec };
  assert.equal((await call("POST", LABS, body, null)).status, 401);
  assert.equal((await call("POST", LABS, body, agentToken)).status, 403);
  assert.equal((await call("GET", LABS)).status, 404);
  assert.equal(auditRows().length, 0);
});

test("labs endpoint: invalid specs, unknown kinds and unknown body fields are 400 invalid_spec / 400", async () => {
  const bad = await call("POST", LABS, { kind: "contracts", spec: { subject: {}, contracts: [] } });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.code, "invalid_spec");
  const unknown = await call("POST", LABS, { kind: "shell", spec: {} });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.json.code, "invalid_spec");
  const nospec = await call("POST", LABS, { kind: "state" });
  assert.equal(nospec.json.code, "invalid_spec");
  const external = await call("POST", LABS, { kind: "api", spec: { baseUrl: "http://example.com:80", steps: [{ name: "n", method: "GET", path: "/", expect: { status: 200 } }] } });
  assert.equal(external.status, 400);
  assert.equal(external.json.code, "invalid_spec");
  assert.equal((await call("POST", LABS, { kind: "state", spec: { machine }, extra: 1 })).status, 400);
  assert.equal((await call("POST", LABS, { spec: {} })).status, 400);
  assert.equal((await call("POST", LABS, [1])).status, 400);
  // Geçersiz spec / bilinmeyen tür denemeleri denetlenir: deny + invalid_spec, ayrıntıda yalnız tür (spec içeriği yok). Gövde biçimi hataları (400) denetlenmez.
  const rows = auditRows();
  assert.deepEqual(rows.map((r) => [r.decision, r.result, r.details]), [
    ["deny", "invalid_spec", { kind: "contracts" }],
    ["deny", "invalid_spec", { kind: "unknown" }],
    ["deny", "invalid_spec", { kind: "state" }],
    ["deny", "invalid_spec", { kind: "api" }],
    ["deny", "invalid_spec", { kind: "unknown" }],
  ]);
  assert.ok(rows.every((r) => r.initiator.kind === "user"));
  assert.ok(!JSON.stringify(rows).includes("example.com"));
});

test("labs endpoint: an api target on AgentMom's own port is refused (400 invalid_spec)", async () => {
  const before = auditRows().length;
  const r = await call("POST", LABS, { kind: "api", spec: { baseUrl: `http://127.0.0.1:${port}`, steps: [{ name: "self", method: "GET", path: "/api/tasks", expect: { status: 200 } }] } });
  assert.equal(r.status, 400);
  assert.equal(r.json.code, "invalid_spec");
  assert.match(r.json.error, /kendi portu/);
  const rows = auditRows();
  assert.equal(rows.length, before + 1);
  assert.deepEqual([rows.at(-1)!.decision, rows.at(-1)!.result], ["deny", "invalid_spec"]);
});

test("labs endpoint: only one lab run at a time (429 busy, audited), and the slot is freed afterwards", async () => {
  const before = auditRows().length;
  const first = call("POST", LABS, { kind: "api", spec: holdSpec() });
  await until(() => held.length === 1);
  const second = await call("POST", LABS, { kind: "contracts", spec: contractsSpec });
  assert.equal(second.status, 429);
  assert.equal(second.json.code, "busy");
  assert.ok(typeof second.json.error === "string");
  const busyRow = auditRows().at(-1)!;
  assert.deepEqual([busyRow.decision, busyRow.result, busyRow.details], ["deny", "busy", { kind: "contracts" }]);
  releaseHeld();
  const done = await first;
  assert.equal(done.status, 200);
  assert.equal(done.json.run.status, "passed");
  const again = await call("POST", LABS, { kind: "contracts", spec: contractsSpec });
  assert.equal(again.status, 200);
  assert.equal(auditRows().length, before + 3);
});

test("labs endpoint: a client that disconnects cancels the run and frees the slot", async () => {
  const payload = JSON.stringify({ kind: "api", spec: holdSpec() });
  const req = httpRequest({ host: "127.0.0.1", port, method: "POST", path: LABS, headers: { host: `127.0.0.1:${port}`, authorization: `Bearer ${auth.userToken}`, "content-type": "application/json" } });
  req.on("error", () => undefined);
  req.end(payload);
  await until(() => held.length === 1);
  const t0 = Date.now();
  req.destroy();
  // İptal edilmeseydi koşu adım zaman aşımına (8 sn) kadar yuvayı tutardı.
  let freed = false;
  while (!freed && Date.now() - t0 < 3000) {
    const r = await call("POST", LABS, { kind: "contracts", spec: contractsSpec });
    if (r.status === 200) freed = true;
    else await new Promise((ok) => setTimeout(ok, 25));
  }
  assert.ok(freed, "the slot was freed well before the step timeout");
  assert.ok(Date.now() - t0 < 3000);
  held.splice(0);
});

test("labs endpoint: contracts, state and api runs return a valid RunResult and write an audit row without spec contents", async () => {
  const c = await call("POST", LABS, { kind: "contracts", spec: contractsSpec });
  assert.equal(c.status, 200);
  const run = validateRunResult(c.json.run);
  assert.equal(run.provider, "contracts-lab");
  assert.equal(run.status, "failed");
  assert.deepEqual(run.totals, { passed: 1, failed: 1, skipped: 0, error: 0 });
  const s = await call("POST", LABS, { kind: "state", spec: { machine, neverReach: [{ from: "b", to: "a" }], traces: [{ name: "go", steps: [{ event: "go", expect: "b" }], expectFinal: true }] } });
  assert.equal(s.status, 200);
  assert.equal(validateRunResult(s.json.run).status, "passed");
  const a = await call("POST", LABS, { kind: "api", spec: { baseUrl: targetBase, headers: { authorization: "Bearer tok-endpoint-secret-1" }, steps: [{ name: "hello", method: "GET", path: "/", expect: { status: 200, json: [{ op: "equals", path: "hello", value: "world" }] } }] } });
  assert.equal(a.status, 200);
  assert.equal(validateRunResult(a.json.run).provider, "api-lab");
  assert.equal(a.json.run.status, "passed");
  assert.ok(!JSON.stringify(a.json).includes("tok-endpoint-secret-1"));
  const rows = auditRows().filter((r) => r.decision === "allow").slice(-3);
  assert.deepEqual(rows.map((r) => r.result), ["contracts failed", "state passed", "api passed"]);
  assert.ok(rows.every((r) => r.initiator.kind === "user"));
  assert.deepEqual(rows[0]!.details, { kind: "contracts", provider: "contracts-lab", totals: { ok: 1, failed: 1, skipped: 0, error: 0 } });
  const dump = JSON.stringify(rows);
  assert.ok(!dump.includes("tok-endpoint-secret-1") && !dump.includes("x is one") && !dump.includes(targetBase), "no spec contents in the audit trail");
});

test("labs endpoint: nothing is stored (the run is returned only; no task link)", async () => {
  const tablesBefore = (db.prepare("SELECT COUNT(*) AS n FROM tasks").get() as { n: number }).n;
  await call("POST", LABS, { kind: "contracts", spec: contractsSpec });
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM tasks").get() as { n: number }).n, tablesBefore);
});

// ---------- erişilebilirlik laboratuvarı ucu (madde 27) ve hata oynatma ucu (madde 60) ----------

const A11Y_PAGE = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Site</title></head><body><h1>Hello</h1><img src="a.png" alt="Logo"></body></html>';
const A11Y_PAGE_BAD = A11Y_PAGE.replace(' lang="en"', "");

test("a11y lab endpoint: an allowed root runs and returns a valid RunResult; the audit row has counts only (no paths, no page contents)", async () => {
  const root = join(BASE, "site");
  mkdirSync(root, { recursive: true });
  mkdirSync(join(BASE, "forbidden"), { recursive: true });
  writeFileSync(join(root, "index.html"), A11Y_PAGE);
  writeFileSync(join(root, "bad.html"), A11Y_PAGE_BAD);
  const ok = await call("POST", LABS, { kind: "a11y", spec: { root, files: ["index.html"], contrastPairs: [{ name: "body", fg: "#222222", bg: "#ffffff" }] } });
  assert.equal(ok.status, 200);
  const run = validateRunResult(ok.json.run);
  assert.equal(run.provider, "a11y-lab");
  assert.equal(run.status, "passed");
  assert.equal(run.tests.length, A11Y_CHECKS.length + 1);
  const bad = await call("POST", LABS, { kind: "a11y", spec: { root, files: ["index.html", "bad.html"] } });
  assert.equal(bad.status, 200);
  assert.equal(bad.json.run.status, "failed");
  assert.deepEqual(bad.json.run.tests.filter((t: { outcome: string }) => t.outcome === "failed").map((t: { id: string }) => t.id), ["wcag-3.1.1-lang"]);
  const rows = auditRows().filter((r) => r.decision === "allow").slice(-2);
  assert.deepEqual(rows.map((r) => r.result), ["a11y passed", "a11y failed"]);
  assert.deepEqual(rows[1]!.details, { kind: "a11y", provider: "a11y-lab", totals: { ok: A11Y_CHECKS.length - 1, failed: 1, skipped: 0, error: 0 } });
  const dump = JSON.stringify(rows);
  assert.ok(!dump.includes(root) && !dump.includes("bad.html") && !dump.includes("Hello"), "no root path, file name or page content in the audit trail");
});

test("a11y lab endpoint: a root outside the allowed directories, inside or above a forbidden one, or with traversal is 400 invalid_spec (audited)", async () => {
  const outside = mkTmp("agentmom-labs-outside-");
  writeFileSync(join(outside, "index.html"), A11Y_PAGE);
  const before = auditRows().length;
  const attempts = [outside, join(BASE, "forbidden"), BASE, join(BASE, "site", "..", ".."), join(BASE, "forbidden", "..", "..", "x")];
  for (const root of attempts) {
    const r = await call("POST", LABS, { kind: "a11y", spec: { root, files: ["index.html"] } });
    assert.equal(r.status, 400, root);
    assert.equal(r.json.code, "invalid_spec", root);
    assert.match(r.json.error, /allowed directory/, root);
  }
  const rows = auditRows().slice(before);
  assert.equal(rows.length, attempts.length);
  assert.ok(rows.every((r) => r.decision === "deny" && r.result === "invalid_spec" && JSON.stringify(r.details) === '{"kind":"a11y"}'));
  assert.ok(!JSON.stringify(rows).includes(outside));
});

test("a11y lab endpoint: bad specs are 400 invalid_spec, and unreadable files inside an allowed root are an error run, never a pass", async () => {
  const root = join(BASE, "site");
  const bad = async (spec: unknown) => {
    const r = await call("POST", LABS, { kind: "a11y", spec });
    assert.equal(r.status, 400);
    assert.equal(r.json.code, "invalid_spec");
  };
  await bad({ root, files: ["../index.html"] });
  await bad({ root, files: [] });
  await bad({ root, files: ["index.txt"] });
  await bad({ files: ["index.html"] });
  await bad({ root: 5, files: ["index.html"] });
  await bad({ root, files: ["index.html"], contrastPairs: [{ name: "x", fg: "red", bg: "#ffffff" }] });
  await bad({ root, files: ["index.html"], extra: 1 });
  await bad({ root: join(root, "nope"), files: ["index.html"] });
  const missing = await call("POST", LABS, { kind: "a11y", spec: { root, files: ["absent.html"] } });
  assert.equal(missing.status, 200);
  assert.equal(missing.json.run.status, "error");
  assert.equal(missing.json.run.tests[0].classification, "infra");
});

test("replay endpoint: user only, 404 until a bundle exists, then the latest bundle with its file description", async () => {
  const { TaskStore } = await import("../core/tasks/tasks.ts");
  const { mkRun, mkTest } = await import("../verify/labs/rules.ts");
  const { buildReplayBundle } = await import("../verify/labs/replay.ts");
  const { validateVerification } = await import("../workflows/types.ts");
  const tasks = new TaskStore(db);
  const evidence = new EvidenceStore(db);
  const task = tasks.create({ title: "replay", requestedAction: "file.read", request: { action: "file.read" }, decision: "allow" });
  const url = `/api/tasks/${task.id}/replay`;
  assert.equal((await call("GET", url, undefined, null)).status, 401);
  assert.equal((await call("GET", url, undefined, agentToken)).status, 403);
  const none = await call("GET", url);
  assert.equal(none.status, 404);
  assert.match(none.json.error, /no replay bundle/);
  assert.equal((await call("GET", "/api/tasks/00000000-0000-4000-8000-000000000000/replay")).status, 404);
  const plan = validateVerification({ states: { machine } });
  const mk = (name: string) => buildReplayBundle(mkRun("state-lab", Date.now(), [mkTest(0, { suite: "trace", name, outcome: "failed", durationMs: 1, message: "went wrong" })], [], {}), { plan, commit: "abc1234", worktreeRelativeFiles: ["src/a.ts"] });
  evidence.add(task.id, null, "replay", "round 0", { bundle: mk("first failure"), file: { id: "replay-1", path: "x", sha256: "1".repeat(64), bytes: 10 } });
  evidence.add(task.id, null, "replay", "round 1", { bundle: mk("second failure"), file: { id: "replay-2", path: "y", sha256: "2".repeat(64), bytes: 20 } });
  const got = await call("GET", url);
  assert.equal(got.status, 200);
  assert.equal(got.json.taskId, task.id);
  assert.equal(got.json.rounds, 2);
  assert.equal(got.json.replay.schema, "agentmom.replay/1");
  assert.equal(got.json.replay.failingTests[0].name, "second failure");
  assert.equal(got.json.replay.commit, "abc1234");
  assert.equal(got.json.file.id, "replay-2");
  assert.ok(typeof got.json.createdAt === "string");
  assert.equal((await call("POST", url, {})).status, 404, "only GET exists");
});

// ---------- tasarım laboratuvarı ucu (madde 49 + 50) ----------

const DESIGN_SPEC_API = { palette: ["#1a2b3c", "#ff6600"], fonts: ["Inter"], spacingScale: [0, 4, 8, 16] };

test("design lab endpoint: an allowed root runs and returns a valid RunResult; the audit row has counts only (no paths, no file contents)", async () => {
  const root = join(BASE, "design-site");
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "good.css"), "body { font-family: Inter, sans-serif; color: #1a2b3c; padding: 16px }");
  writeFileSync(join(root, "bad.css"), "body { font-family: Arial; color: #1a2b3c; padding: 16px }");
  writeFileSync(join(root, "spec.json"), JSON.stringify(DESIGN_SPEC_API));
  const ok = await call("POST", LABS, { kind: "design", spec: { root, files: ["good.css"], spec: DESIGN_SPEC_API } });
  assert.equal(ok.status, 200);
  const run = validateRunResult(ok.json.run);
  assert.equal(run.provider, "design-lab");
  assert.equal(run.status, "passed");
  assert.equal(run.tests.length, DESIGN_CHECKS.length);
  const viaFile = await call("POST", LABS, { kind: "design", spec: { root, files: ["good.css", "bad.css"], specFile: "spec.json" } });
  assert.equal(viaFile.status, 200);
  assert.equal(viaFile.json.run.status, "failed");
  assert.deepEqual(viaFile.json.run.tests.filter((t: { outcome: string }) => t.outcome === "failed").map((t: { id: string }) => t.id), ["design-font-conformance"]);
  const rows = auditRows().filter((r) => r.decision === "allow").slice(-2);
  assert.deepEqual(rows.map((r) => r.result), ["design passed", "design failed"]);
  const skippedCount = DESIGN_CHECKS.filter((c) => ["radius-scale", "forbidden-strings", "token-discipline"].includes(c.key)).length;
  assert.deepEqual(rows[1]!.details, { kind: "design", provider: "design-lab", totals: { ok: DESIGN_CHECKS.length - 1 - skippedCount, failed: 1, skipped: skippedCount, error: 0 } });
  const dump = JSON.stringify(rows);
  assert.ok(!dump.includes(root) && !dump.includes("bad.css") && !dump.includes("Arial") && !dump.includes("spec.json"), "no root path, file name or file content in the audit trail");
});

test("design lab endpoint: a root outside the allowed directories, inside or above a forbidden one, or with traversal is 400 invalid_spec (audited)", async () => {
  const outside = mkTmp("agentmom-labs-design-outside-");
  writeFileSync(join(outside, "a.css"), "a { color: red }");
  mkdirSync(join(BASE, "forbidden"), { recursive: true });
  const before = auditRows().length;
  const attempts = [outside, join(BASE, "forbidden"), BASE, join(BASE, "design-site", "..", ".."), join(BASE, "forbidden", "..", "..", "x")];
  for (const root of attempts) {
    const r = await call("POST", LABS, { kind: "design", spec: { root, files: ["a.css"], spec: DESIGN_SPEC_API } });
    assert.equal(r.status, 400, root);
    assert.equal(r.json.code, "invalid_spec", root);
    assert.match(r.json.error, /allowed directory/, root);
  }
  const rows = auditRows().slice(before);
  assert.equal(rows.length, attempts.length);
  assert.ok(rows.every((r) => r.decision === "deny" && r.result === "invalid_spec" && JSON.stringify(r.details) === '{"kind":"design"}'));
  assert.ok(!JSON.stringify(rows).includes(outside));
});

test("design lab endpoint: bad specs are 400 invalid_spec, and unreadable files or spec files inside an allowed root are an error run, never a pass", async () => {
  const root = join(BASE, "design-site");
  const bad = async (spec: unknown) => {
    const r = await call("POST", LABS, { kind: "design", spec });
    assert.equal(r.status, 400);
    assert.equal(r.json.code, "invalid_spec");
  };
  await bad({ root, files: ["../a.css"], spec: DESIGN_SPEC_API });
  await bad({ root, files: [], spec: DESIGN_SPEC_API });
  await bad({ root, files: ["a.txt"], spec: DESIGN_SPEC_API });
  await bad({ root, files: ["good.css"] });
  await bad({ root, files: ["good.css"], spec: DESIGN_SPEC_API, specFile: "spec.json" });
  await bad({ root, files: ["good.css"], specFile: "../spec.json" });
  await bad({ root, files: ["good.css"], spec: { palette: ["red"], fonts: [] } });
  await bad({ root, files: ["good.css"], spec: { ...DESIGN_SPEC_API, extra: 1 } });
  await bad({ files: ["good.css"], spec: DESIGN_SPEC_API });
  await bad({ root: 5, files: ["good.css"], spec: DESIGN_SPEC_API });
  await bad({ root: join(root, "nope"), files: ["good.css"], spec: DESIGN_SPEC_API });
  const missing = await call("POST", LABS, { kind: "design", spec: { root, files: ["absent.css"], spec: DESIGN_SPEC_API } });
  assert.equal(missing.status, 200);
  assert.equal(missing.json.run.status, "error");
  assert.equal(missing.json.run.tests[0].classification, "infra");
  const noSpec = await call("POST", LABS, { kind: "design", spec: { root, files: ["good.css"], specFile: "absent.json" } });
  assert.equal(noSpec.status, 200);
  assert.equal(noSpec.json.run.status, "error");
  assert.equal(noSpec.json.run.tests.length, 1);
  assert.equal(noSpec.json.run.tests[0].classification, "infra");
});
