// Eksiklik / fazlalık dedektörü birim testleri (D8b, madde 83). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Sahte küçük bir "depo" üzerinde tablo / uç / yetenek / modül bulguları; gerçek depo üzerinde duman testi (süre ve bilinçli bırakılan 009_rea notu).
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { snap } from "../testing/analysis-fixtures.ts";
import { analyzeAbsence, expandPath, hasWord, loadAbsenceInputs, mentionsRoute, tablesIn } from "./absence.ts";

const REPO = resolve(import.meta.dirname, "..", "..");
const SCAN = { elapsedMs: 1, skippedLarge: 0, truncated: false };

test("hasWord / tablesIn / expandPath / mentionsRoute helpers", () => {
  assert.equal(hasWord("select * from tasks_x", "tasks"), false);
  assert.equal(hasWord("select * from tasks;", "tasks"), true);
  assert.deepEqual(tablesIn("-- c\nCREATE TABLE a (x);\ncreate table if not exists b_2 (y);\nALTER TABLE c ADD d;"), ["a", "b_2"]);
  assert.deepEqual(expandPath("/api/t/:id/{a|b}").sort(), ["/api/t/:id/a", "/api/t/:id/b"]);
  assert.deepEqual(expandPath("/api/s/:id[/gate|go]").sort(), ["/api/s/:id", "/api/s/:id/gate", "/api/s/:id/go"]);
  assert.equal(mentionsRoute(`fetch("/api/usage")`, "/api/usage"), true);
  assert.equal(mentionsRoute(`fetch("/api/usage/context?x=1")`, "/api/usage"), false, "a longer path is not a call of the shorter one");
  assert.equal(mentionsRoute(`api("/api/usage?limit=1")`, "/api/usage"), true);
  assert.equal(mentionsRoute(`"/api/tasks/" + id + "/approve"`, "/api/tasks/:id/{approve|deny}"), true);
  assert.equal(mentionsRoute(`"/api/tasks/" + id + "/other"`, "/api/tasks/:id/{approve|deny}"), false);
});

const APP = [
  `if (method === "GET" && url.pathname === "/api/seen") return 1;`,
  `if (method === "GET" && url.pathname === "/api/test-only") return 1;`,
  `if (method === "GET" && url.pathname === "/api/lonely") return 1;`,
  `if (method === "POST" && url.pathname === "/api/manage") return 1;`,
  `if (method === "POST" && url.pathname === "/api/manage-ui") return 1;`,
].join("\n");

const FILES = [
  { path: "src/server/app.ts", content: APP },
  { path: "src/server/ui/core.js", content: `fetch("/api/seen"); post("/api/manage-ui");` },
  { path: "src/server/other.test.ts", content: `get("/api/test-only"); get("/api/seen"); post("/api/manage");` },
  { path: "src/core/db/migrations/001_init.sql", content: `-- Başlangıç şeması. Ayrıntı.\nCREATE TABLE used_t (id TEXT);\nCREATE TABLE ghost_t (id TEXT);\nCREATE TABLE test_only_t (id TEXT);` },
  { path: "src/core/db/migrations/009_rea.sql", content: `-- REA tabloları bilinçli bırakıldı. Daha fazlası.\nCREATE TABLE rea_x (id TEXT);` },
  { path: "src/core/db/migrations/001_init.down.sql", content: `DROP TABLE used_t;` },
  { path: "src/core/store.ts", content: `db.prepare("SELECT 1 FROM used_t").get();` },
  { path: "src/core/store.test.ts", content: `import "./store.ts"; db.exec("DELETE FROM test_only_t");` },
  { path: "src/core/untested.ts", content: `export const u = 1;` },
  { path: "src/core/dep.ts", content: `import "./untested.ts"; export const d = 2; // used by runtime only` },
  { path: "src/core/main.ts", content: `import "./dep.ts"; adapter.execute(); registry.forOperation(id, "cancel");` },
  { path: "src/testing/helper.ts", content: `export const h = 1;` },
];

const CHECKLIST = JSON.stringify({ items: [{ n: 2, tr: "İki", durum: "Planlı", dilim: "D10" }, { n: 1, tr: "Bir", durum: "Planlı", dilim: "D10" }, { n: 3, tr: "Üç", durum: "Planlı", dilim: "D9" }, { n: 4, tr: "Dört", durum: "Doğrulandı", dilim: "D9" }] });

test("unused: tables, endpoints, test-only endpoints and declared-but-unused capabilities", async () => {
  const providers = [snap("p", { execute: "verified", cancel: "partial", getUsage: "partial", dispose: "unsupported" })];
  const r = await analyzeAbsence({ files: FILES, checklistJson: CHECKLIST, providers, scan: SCAN });
  assert.deepEqual(r.unused.tables.items.map((t) => t.table), ["ghost_t", "test_only_t", "rea_x"], "migration order, then name");
  const ghost = r.unused.tables.items.find((t) => t.table === "ghost_t");
  assert.equal(ghost?.deliberate, false);
  assert.equal(ghost?.referencedByTests, false);
  assert.equal(r.unused.tables.items.find((t) => t.table === "test_only_t")?.referencedByTests, true);
  const rea = r.unused.tables.items.find((t) => t.table === "rea_x");
  assert.equal(rea?.deliberate, true);
  assert.match(rea?.note ?? "", /bilinçli bırakılmış \(009_rea\.sql\): REA tabloları bilinçli bırakıldı\./);
  assert.deepEqual(r.unused.endpoints.items, [{ method: "GET", path: "/api/lonely" }]);
  assert.deepEqual(r.unused.endpointsOnlyTests.items, [{ method: "POST", path: "/api/manage" }, { method: "GET", path: "/api/test-only" }]);
  // execute: adapter.execute( çağrısı var, cancel: "cancel" dizgisi var, getUsage: hiçbir yerde yok
  assert.deepEqual(r.unused.capabilities.items, [{ operation: "getUsage", declaredBy: ["p"] }]);
});

test("missing: planned items by slice, management endpoints without UI, modules without a direct test", async () => {
  const r = await analyzeAbsence({ files: FILES, checklistJson: CHECKLIST, providers: [], scan: SCAN });
  assert.equal(r.missing.plannedTotal, 3);
  assert.deepEqual(r.missing.plannedBySlice.map((s) => [s.slice, s.count, s.items.map((i) => i.n)]), [["D10", 2, [1, 2]], ["D9", 1, [3]]]);
  assert.deepEqual(r.missing.endpointsWithoutUi.items.map((e) => e.path), ["/api/manage"], "POST routes only; /api/manage-ui has a UI caller");
  assert.deepEqual(r.missing.endpointsWithoutUi.items[0]?.clients, ["test"]);
  // store.ts: store.test.ts onu içe aktarır. untested.ts/dep.ts/main.ts: doğrudan test yok. testing/ dizini ve app.ts da listelenir (app.ts'i içe aktaran test yok).
  assert.deepEqual(r.missing.modulesWithoutDirectTest.items, ["src/core/dep.ts", "src/core/main.ts", "src/core/untested.ts", "src/server/app.ts"]);
  assert.match(r.note, /silme ya da değiştirme önerisi değildir/);
});

test("a missing checklist is reported as unknown, not as zero", async () => {
  const r = await analyzeAbsence({ files: FILES, checklistJson: null, providers: [], scan: SCAN });
  assert.equal(r.missing.plannedTotal, null);
  assert.deepEqual(r.missing.plannedBySlice, []);
  assert.equal((await analyzeAbsence({ files: FILES, checklistJson: "{bozuk", providers: [], scan: SCAN })).missing.plannedTotal, null);
});

test("real repository smoke: finishes in time, rea tables are marked deliberate, lists are capped", async () => {
  const t0 = Date.now();
  const inputs = await loadAbsenceInputs(REPO, [snap("p", { execute: "partial" })]);
  const r = await analyzeAbsence(inputs);
  assert.ok(Date.now() - t0 < 5000);
  assert.equal(r.scan.truncated, false);
  assert.ok(r.scan.files > 100);
  for (const list of [r.unused.tables, r.unused.endpoints, r.unused.endpointsOnlyTests, r.unused.capabilities, r.missing.endpointsWithoutUi, r.missing.modulesWithoutDirectTest]) {
    assert.ok(list.items.length <= 200 && list.total >= list.items.length);
  }
  for (const t of r.unused.tables.items.filter((x) => x.migration === "009_rea.sql")) assert.equal(t.deliberate, true);
  assert.ok(r.missing.plannedTotal !== null && r.missing.plannedTotal > 0);
  assert.ok(r.missing.plannedBySlice.every((s) => s.count > 0));
});

test("hostile files do not break the detector: unparsable file skipped and reported, exhausted budget gives a partial result", async () => {
  const nested = "const x = " + "`${".repeat(5000) + "1" + "}`".repeat(5000) + ";";
  const files = [...FILES, { path: "src/core/bomb.ts", content: nested }, { path: "src/core/flood.ts", content: "import{".repeat(40000) }];
  const t0 = performance.now();
  const r = await analyzeAbsence({ files, checklistJson: CHECKLIST, providers: [], scan: SCAN });
  assert.ok(performance.now() - t0 < 3000);
  assert.equal(r.scan.skippedUnparsable, 1);
  assert.deepEqual(r.unused.endpoints.items, [{ method: "GET", path: "/api/lonely" }]);
  const cut = await analyzeAbsence({ files, checklistJson: CHECKLIST, providers: [], scan: SCAN }, -1);
  assert.equal(cut.scan.truncated, true);
});
