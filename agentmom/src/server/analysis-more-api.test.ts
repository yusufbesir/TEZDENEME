// Sistem analitiği uçları (teknik borç 33, sürüm etkisi 29, veri profili 25) testleri. Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite + gerçek HTTP sunucusu; model çağrısı, internet ve silme yok. Bu uçlar yalnız OKUR: kayıt ya da denetim satırı yazmaz; anonim 401, ajan 403, POST yok.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import type { Server } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
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

const BASE = mkTmp("agentmom-d11-");
const OTHER = mkTmp("agentmom-d11-other-");
let server: Server;
let port: number;
let db: Db;
let auth: AuthRegistry;
let agentToken: string;

before(async () => {
  const dbPath = join(BASE, "d11.db");
  db = openDb(dbPath);
  migrate(db);
  const audit = new AuditLog([new SqliteAuditSink(db)]);
  auth = new AuthRegistry();
  agentToken = auth.issueAgentToken("test-agent");
  const registry = new ProviderRegistry(db);
  registry.register(new ScriptedAdapter("local-x", () => ({ summary: "ok" }), { routeKind: "local" }));
  const worktreeRoot = join(BASE, "wt");
  const workflows = new WorkflowStore(db);
  const contract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedProviders: ["local-x"], allowedDirs: [BASE], forbiddenDirs: [join(BASE, "keys")], allowedActions: ["task.create" as const, "file.read" as const], approvalRequiredActions: ["file.write" as const] };
  const engine = new WorkflowEngine({ tasks: new TaskStore(db), audit, registry, evidence: new EvidenceStore(db), store: workflows, contract, worktreeRoot });
  const config = structuredClone(DEFAULT_CONFIG);
  config.policy.defaultContract = contract;
  server = createApp({ db, dbPath, config, audit, auth, registry, engine, workflows, worktreeRoot });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const addr = server.address();
  port = typeof addr === "object" && addr ? addr.port : 0;
  mkdirSync(join(BASE, "keys"), { recursive: true });
  mkdirSync(join(BASE, "data"), { recursive: true });
  writeFileSync(join(BASE, "data", "people.csv"), "id,name,note\n1,ada,HIDDEN-MARKER-CELL-XYZ\n2,bob,\n3,ada,\n");
  writeFileSync(join(BASE, "data", "rows.json"), JSON.stringify([{ id: 1, tag: "HIDDEN-MARKER-CELL-XYZ" }, { id: 2 }]));
  writeFileSync(join(BASE, "data", "events.ndjson"), '{"a":1}\n{"a":2}\n');
  writeFileSync(join(BASE, "data", ".env.csv"), "a\n1\n");
  writeFileSync(join(BASE, "keys", "k.csv"), "a\n1\n");
  writeFileSync(join(OTHER, "out.csv"), "a\n1\n");
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
const get = (path: string, token: string | null = auth.userToken) => call("GET", path, token);
const rowCount = (t: string): number => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
const counts = () => ["tasks", "audit_events", "task_evidence", "memory_records", "providers", "capabilities", "provider_state", "workflows", "workflow_steps", "verification_runs", "decisions", "predictions"].map(rowCount);
const NO_INTERNALS = /node_modules|[A-Z]:\\|stack|\n\s+at /;
const enc = (p: string): string => encodeURIComponent(p);

const dataPath = (name: string): string => `/api/analysis/data-profile?path=${enc(join(BASE, "data", name))}`;
const ROUTES = ["/api/analysis/tech-debt", "/api/analysis/release-impact?from=HEAD&to=HEAD", dataPath("people.csv")];

test("auth: anonim 401, ajan 403 ve yalnız GET (POST 404/401) her yeni analiz ucunda", async () => {
  for (const p of ROUTES) {
    assert.equal((await get(p, null)).status, 401, p);
    assert.equal((await get(p, agentToken)).status, 403, p);
    assert.equal((await call("POST", p.split("?")[0] as string)).status, 404, `${p}: POST`);
    assert.equal((await call("POST", p.split("?")[0] as string, null)).status, 401, `${p}: anonim POST`);
  }
});

test("tech-debt: sayılar ve örnekler; puan yok; güncel sürüm bilinmiyor; bilinmeyen parametre 400; hiçbir kayıt yazılmaz", async () => {
  const before = counts();
  const r = await get("/api/analysis/tech-debt");
  assert.equal(r.status, 200);
  const d = r.json.techDebt;
  assert.ok(d.scan.filesScanned > 100);
  assert.equal(d.scan.maxFiles, 3000);
  assert.equal(d.scan.budgetMs, 2000);
  assert.equal(typeof d.scan.graphIncomplete, "boolean");
  assert.equal(typeof d.markers.count, "number");
  assert.ok(d.markers.examples.every((e: string) => /^src\/.+:\d+$/.test(e)));
  assert.equal(d.size.largest.length, 10);
  assert.equal(d.dependencies.latestVersion, "bilinmiyor");
  assert.equal(d.dependencies.networkChecked, false);
  assert.ok(d.dependencies.examples.every((e: { latest: string }) => e.latest === "bilinmiyor"));
  assert.doesNotMatch(JSON.stringify(r.json), /"(score|priority|grade|rating)"/);
  assert.doesNotMatch(JSON.stringify(r.json), NO_INTERNALS);
  assert.equal((await get("/api/analysis/tech-debt?x=1")).status, 400);
  assert.equal((await get("/api/analysis/tech-debt?x=1&x=2")).status, 400);
  assert.deepEqual(counts(), before, "salt okunur: hiçbir tabloya satır yazılmadı");
});

test("release-impact: from/to zorunlu (tahmin yok), enjeksiyon ve biçim hataları 400, ayrıntı sızmaz", async () => {
  const bad = [
    "",
    "?from=HEAD",
    "?to=HEAD",
    "?from=&to=HEAD",
    "?from=HEAD&to=",
    `?from=${enc("--upload-pack=touch x")}&to=HEAD`,
    `?from=HEAD&to=${enc("--output=x")}`,
    "?from=-x&to=HEAD",
    `?from=${enc("a..b")}&to=HEAD`,
    `?from=${enc("a b")}&to=HEAD`,
    `?from=${enc("a@{1}")}&to=HEAD`,
    `?from=${enc("HEAD~1")}&to=HEAD`,
    `?from=${enc("HEAD^")}&to=HEAD`,
    `?from=${enc("a:b")}&to=HEAD`,
    `?from=${enc("a\\b")}&to=HEAD`,
    `?from=${"x".repeat(101)}&to=HEAD`,
    "?from=HEAD&to=HEAD&extra=1",
    "?from=HEAD&from=main&to=HEAD",
    "?from=HEAD&to=HEAD&to=main",
  ];
  for (const q of bad) {
    const b = await get(`/api/analysis/release-impact${q}`);
    assert.equal(b.status, 400, q);
    assert.equal(typeof b.json.error, "string");
    assert.doesNotMatch(JSON.stringify(b.json), NO_INTERNALS);
    assert.doesNotMatch(JSON.stringify(b.json), /touch x|--output/, "girdi yankılanmaz");
  }
});

test("release-impact: aynı başvuru boş fark; var olmayan başvuru dürüst 'okunamadı'; hiçbir kayıt yazılmaz", async () => {
  const before = counts();
  const same = await get("/api/analysis/release-impact?from=HEAD&to=HEAD");
  assert.equal(same.status, 200);
  const r = same.json.releaseImpact;
  if (r.status === "ok") {
    assert.equal(r.changes.total, 0);
    assert.deepEqual(r.files, []);
    assert.equal(r.migrations.warning, null);
    assert.equal(r.resolved.from, r.resolved.to);
  } else assert.equal(r.status, "unreadable");
  const missing = await get("/api/analysis/release-impact?from=HEAD&to=yok-boyle-bir-dal-xyz");
  assert.equal(missing.status, 200);
  assert.equal(missing.json.releaseImpact.status, "unreadable");
  assert.ok(["ref_not_found", "git_missing", "git_failed"].includes(missing.json.releaseImpact.code));
  assert.doesNotMatch(JSON.stringify(missing.json), /yok-boyle-bir-dal-xyz/);
  assert.doesNotMatch(JSON.stringify(missing.json), NO_INTERNALS);
  assert.deepEqual(counts(), before);
});

test("data-profile: CSV/JSON/NDJSON profili; ham hücre değeri çıktıda yok; hiçbir kayıt yazılmaz", async () => {
  const before = counts();
  const r = await get(dataPath("people.csv"));
  assert.equal(r.status, 200);
  const p = r.json.dataProfile;
  assert.equal(p.format, "csv");
  assert.equal(p.rows, 3);
  assert.deepEqual(p.columns.map((c: { name: string }) => c.name), ["id", "name", "note"]);
  assert.equal(p.columns[2].type, "text");
  assert.equal(p.columns[2].emptyCount, 2);
  assert.equal(p.columns[1].unique, 2);
  assert.equal(p.truncated, false);
  assert.ok(!JSON.stringify(r.json).includes("HIDDEN-MARKER-CELL-XYZ"));
  const j = await get(dataPath("rows.json"));
  assert.equal(j.status, 200);
  assert.equal(j.json.dataProfile.rows, 2);
  assert.ok(!JSON.stringify(j.json).includes("HIDDEN-MARKER-CELL-XYZ"));
  const n = await get(dataPath("events.ndjson"));
  assert.equal(n.status, 200);
  assert.equal(n.json.dataProfile.rows, 2);
  assert.deepEqual(counts(), before);
});

test("data-profile: parametre hataları 400, izinli klasör dışı/yasak/sır dosyası 403, olmayan dosya 404; iletiler yol sızdırmaz", async () => {
  const noInternals = (j: unknown): void => {
    assert.doesNotMatch(JSON.stringify(j), NO_INTERNALS);
    assert.doesNotMatch(JSON.stringify(j), /agentmom-d11|keys|\.env/);
  };
  for (const q of ["", "?path=", "?path=relative.csv", `?path=${enc(join(BASE, "data", "x.exe"))}`, `?path=${enc(join(BASE, "data", "people.csv") + ":stream")}`, `?path=${enc(`${BASE}/data/../data/people.csv`)}`, `?path=${enc(join(BASE, "data", "people.csv"))}&extra=1`, `?path=${enc(join(BASE, "data", "people.csv"))}&path=${enc(join(BASE, "data", "rows.json"))}`, `?path=${"a".repeat(401)}.csv`]) {
    const b = await get(`/api/analysis/data-profile${q}`);
    assert.equal(b.status, 400, q);
    noInternals(b.json);
  }
  const forbidden = [join(OTHER, "out.csv"), join(BASE, "keys", "k.csv"), join(BASE, "data", ".env.csv")];
  for (const f of forbidden) {
    const b = await get(`/api/analysis/data-profile?path=${enc(f)}`);
    assert.equal(b.status, 403, f);
    noInternals(b.json);
  }
  const missing = await get(`/api/analysis/data-profile?path=${enc(join(BASE, "data", "yok.csv"))}`);
  assert.equal(missing.status, 404);
  noInternals(missing.json);
});

test("data-profile: 8 MB üstü dosya 413; tam sınırdaki kabul", async () => {
  writeFileSync(join(BASE, "data", "big.csv"), `${"a\n".repeat(4 * 1024 * 1024)}b`);
  const b = await get(dataPath("big.csv"));
  assert.equal(b.status, 413);
  assert.doesNotMatch(JSON.stringify(b.json), NO_INTERNALS);
  writeFileSync(join(BASE, "data", "exact.csv"), "a\n".repeat(4 * 1024 * 1024));
  const ok = await get(dataPath("exact.csv"));
  assert.equal(ok.status, 200);
  assert.equal(ok.json.dataProfile.truncated, true);
});

test("data-profile: UNC, aygıt yolları ve aygıt adları 400 ve hızlı (ağ/dosya sistemi denenmez)", async () => {
  const t0 = Date.now();
  for (const p of ["\\\\192.0.2.1\\share\\a.csv", "//192.0.2.1/share/a.csv", "\\\\?\\C:\\data\\a.csv", "\\\\.\\PhysicalDrive0\\a.csv", join(BASE, "data", "NUL.csv"), join(BASE, "data", "con.json")]) {
    const b = await get(`/api/analysis/data-profile?path=${enc(p)}`);
    assert.equal(b.status, 400, p);
    assert.doesNotMatch(JSON.stringify(b.json), NO_INTERNALS);
    assert.doesNotMatch(JSON.stringify(b.json), /192\.0\.2\.1|PhysicalDrive/);
  }
  assert.ok(Date.now() - t0 < 2000, "ağ erişimi beklenmedi");
});

test("429 busy: aynı anda yalnız BİR tarama çalışır; eşzamanlı istekler 429 {code:'busy'} alır", async () => {
  const rs = await Promise.all(Array.from({ length: 8 }, () => get("/api/analysis/tech-debt")));
  const statuses = rs.map((r) => r.status);
  assert.ok(statuses.includes(200), "biri çalışır");
  assert.ok(statuses.includes(429), `eşzamanlı istek reddedilmedi: ${statuses.join(",")}`);
  for (const r of rs.filter((x) => x.status === 429)) assert.equal(r.json.code, "busy");
  assert.ok(statuses.every((s) => s === 200 || s === 429));
  // veri profili ve sürüm etkisi de aynı kilidi paylaşır: kilit serbest kalınca yeniden çalışır
  assert.equal((await get("/api/analysis/tech-debt")).status, 200);
});
