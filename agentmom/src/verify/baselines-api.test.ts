// Görsel regresyon taban onay ucu testleri (POST /api/tasks/:id/baselines/approve, madde 52). Yazan: Claude [İP:AgentMom madde 18/52]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite + gerçek HTTP sunucusu; koşu kayıtları elle hazırlanır (tarayıcı gerekmez). Dosyalar yalnız mkTmp klasöründe; silme yok.
// Bu dosya src/verify/ altındadır ki "src/verify/*.test.ts" kalıbıyla birlikte koşsun.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import type { Server } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { createApp } from "../server/app.ts";
import { baselineDirFor } from "./baselines.ts";
import { sha256Of } from "./evidence-files.ts";

const BASE = mkTmp("agentmom-bl-");
const ROOT = join(BASE, "verification");
let server: Server;
let port: number;
let db: Db;
let auth: AuthRegistry;
let agentToken: string;
let tasks: TaskStore;
let evidence: EvidenceStore;

const DOT_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

before(async () => {
  mkdirSync(ROOT, { recursive: true });
  const dbPath = join(BASE, "bl.db");
  db = openDb(dbPath);
  migrate(db);
  const audit = new AuditLog([new SqliteAuditSink(db)]);
  auth = new AuthRegistry();
  agentToken = auth.issueAgentToken("test-agent");
  const registry = new ProviderRegistry(db);
  const worktreeRoot = join(BASE, "wt");
  const workflows = new WorkflowStore(db);
  tasks = new TaskStore(db);
  evidence = new EvidenceStore(db);
  const contract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedDirs: [BASE] };
  const engine = new WorkflowEngine({ tasks, audit, registry, evidence, store: workflows, contract, worktreeRoot });
  const config = structuredClone(DEFAULT_CONFIG);
  config.policy.defaultContract = contract;
  server = createApp({ db, dbPath, config, audit, auth, registry, engine, workflows, worktreeRoot, evidenceRoot: ROOT });
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

let seq = 0;
function newTask(): string {
  return tasks.create({ title: `baseline task ${++seq}`, requestedAction: "task.create", request: { actor: { kind: "user", id: "u" }, action: "task.create" }, decision: "allow" }).id;
}

// Motorun yazdığı kayıt biçimi: verification:run + providerData.baselines + evidence (id, path, sha256).
function recordRun(taskId: string, file: string, image: Buffer, over: { dir?: string } = {}): { evidenceId: string; path: string; sha256: string } {
  const evidenceId = `run${++seq}-match-1`;
  const dir = over.dir ?? join(ROOT, taskId.slice(0, 8), "wf-r0");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${evidenceId}.png`);
  writeFileSync(path, image, { flag: "wx" });
  const sha256 = sha256Of(image);
  evidence.add(taskId, null, "verification:run", "browser failed", {
    runId: `run${seq}`,
    provider: "browser",
    baselines: [{ file, status: "missing", test: "t", outcome: "skipped", newEvidenceId: evidenceId, newSha256: sha256 }],
    evidence: [{ id: evidenceId, kind: "screenshot", path, sha256, bytes: image.length }],
  });
  return { evidenceId, path, sha256 };
}

const approvalRows = (): Array<{ decision: string; result: string; details: Record<string, unknown> }> =>
  (db.prepare("SELECT * FROM audit_events WHERE action = 'baseline.approve' ORDER BY rowid").all() as Array<Record<string, unknown>>).map((r) => ({ decision: r.decision as string, result: r.result as string, details: JSON.parse(String(r.details_json ?? "{}")) as Record<string, unknown> }));
const approve = (taskId: string, body: unknown, token: string | null = auth.userToken) => call("POST", `/api/tasks/${taskId}/baselines/approve`, body, token);

test("baseline approve: anonymous 401, agent token 403, nothing is written and no audit row appears", async () => {
  const t = newTask();
  const rec = recordRun(t, "home.png", DOT_PNG);
  const before = approvalRows().length;
  assert.equal((await approve(t, { name: "home.png" }, null)).status, 401);
  assert.equal((await approve(t, { name: "home.png", evidenceId: rec.evidenceId }, agentToken)).status, 403);
  assert.equal(existsSync(baselineDirFor(ROOT, t)), false, "no baseline folder was created");
  assert.equal(approvalRows().length, before);
});

test("baseline approve: the user gets 200, the NEW image is copied under the evidence root (not the workspace) and an audit row records the hash", async () => {
  const t = newTask();
  const rec = recordRun(t, "home.png", DOT_PNG);
  const r = await approve(t, { name: "home.png" });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.baseline.sha256, rec.sha256);
  assert.equal(r.json.baseline.replaced, false);
  const stored = join(baselineDirFor(ROOT, t), "home.png");
  assert.ok(stored.startsWith(ROOT));
  assert.deepEqual(readFileSync(stored), DOT_PNG);
  const row = approvalRows().find((x) => x.details.taskId === t)!;
  assert.equal(row.decision, "allow");
  assert.equal(row.details.sha256, rec.sha256);
  assert.equal(row.details.evidenceId, rec.evidenceId);
  assert.equal(row.details.name, "home.png");
  const rec2 = evidence.list(t).find((x) => x.kind === "baseline.approve")!;
  assert.deepEqual({ ...(rec2.data as object) }, { name: "home.png", sha256: rec.sha256, evidenceId: rec.evidenceId }, "the engine reads approved hashes from this record");
});

test("baseline approve: an explicit evidenceId of the same task works; invalid names, evidence ids and unknown fields are 400", async () => {
  const t = newTask();
  const rec = recordRun(t, "list.png", DOT_PNG);
  assert.equal((await approve(t, { name: "list.png", evidenceId: rec.evidenceId })).status, 200);
  for (const name of ["CON.png", "nul.png", "com1.png", "../x.png", "a/b.png", "a\\b.png", "x.txt", "x.PNG.exe", "", ".png", "-x.png", "x..png", 5, null, `${"a".repeat(90)}.png`]) {
    assert.equal((await approve(t, { name })).status, 400, `name ${JSON.stringify(name)}`);
  }
  assert.equal((await approve(t, {})).status, 400, "name is required");
  assert.equal((await approve(t, { name: "list.png", evidenceId: "../../etc/passwd" })).status, 400);
  assert.equal((await approve(t, { name: "list.png", evidenceId: 7 })).status, 400);
  assert.equal((await approve(t, { name: "list.png", path: "C:/x.png" })).status, 400, "unknown field");
  assert.equal((await approve(t, [1])).status, 400);
});

test("baseline approve: unknown task, a name no run recorded, and evidence of ANOTHER task are 404", async () => {
  const a = newTask();
  const b = newTask();
  const recB = recordRun(b, "home.png", DOT_PNG);
  recordRun(a, "home.png", DOT_PNG);
  assert.equal((await approve("00000000-0000-4000-8000-000000000000", { name: "home.png" })).status, 404, "unknown task");
  assert.equal((await approve(a, { name: "other.png" })).status, 404, "no run recorded that name");
  const foreign = await approve(a, { name: "home.png", evidenceId: recB.evidenceId });
  assert.equal(foreign.status, 404, "task A cannot approve task B's image");
  assert.equal(existsSync(join(baselineDirFor(ROOT, a), "home.png")), false);
  assert.equal((await approve(a, { name: "home.png", evidenceId: "nonexistent-match-9" })).status, 404);
});

test("baseline approve: approving again replaces the baseline but keeps the previous one under history/ (nothing is lost)", async () => {
  const t = newTask();
  const first = recordRun(t, "home.png", DOT_PNG);
  assert.equal((await approve(t, { name: "home.png" })).status, 200);
  const second = Buffer.concat([DOT_PNG, Buffer.from("changed")]);
  const rec2 = recordRun(t, "home.png", second);
  const r = await approve(t, { name: "home.png", evidenceId: rec2.evidenceId });
  assert.equal(r.status, 200);
  assert.equal(r.json.baseline.replaced, true);
  const dir = baselineDirFor(ROOT, t);
  assert.deepEqual(readFileSync(join(dir, "home.png")), second);
  assert.deepEqual(readFileSync(join(dir, "history", `${first.sha256}-home.png`)), DOT_PNG, "the old baseline is preserved byte for byte");
  assert.ok(readdirSync(dir).every((n) => !n.startsWith(".tmp-")), "no leftover temp file");
  assert.equal(approvalRows().find((x) => x.details.evidenceId === rec2.evidenceId)!.details.previousSha256, first.sha256);
});

test("baseline approve: a new image changed after the run (hash mismatch) is refused with 409 and a deny row; nothing is written", async () => {
  const t = newTask();
  const rec = recordRun(t, "home.png", DOT_PNG);
  writeFileSync(rec.path, Buffer.concat([DOT_PNG, Buffer.from("tampered")]));
  const r = await approve(t, { name: "home.png" });
  assert.equal(r.status, 409);
  assert.equal(existsSync(join(baselineDirFor(ROOT, t), "home.png")), false);
  const row = approvalRows().find((x) => x.details.taskId === t)!;
  assert.equal(row.decision, "deny");
  assert.equal(row.result, "hash_mismatch");
});

test("baseline approve: a recorded image that is outside the evidence root or not a PNG is refused (400 / 404), never copied", async () => {
  const outside = join(BASE, "outside");
  mkdirSync(outside, { recursive: true });
  const t = newTask();
  recordRun(t, "home.png", DOT_PNG, { dir: outside });
  const r = await approve(t, { name: "home.png" });
  assert.equal(r.status, 400, JSON.stringify(r.json));
  assert.equal(existsSync(join(baselineDirFor(ROOT, t), "home.png")), false);
  const t2 = newTask();
  recordRun(t2, "home.png", Buffer.from("not a png at all, just text"));
  assert.equal((await approve(t2, { name: "home.png" })).status, 400);
  assert.equal(existsSync(join(baselineDirFor(ROOT, t2), "home.png")), false);
});
