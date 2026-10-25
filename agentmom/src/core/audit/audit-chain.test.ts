// Hesap verebilirlik zinciri testleri (madde 95, D5a). Yazan: Claude [İP:AgentMom D5a]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite (bellek içi). Bozulma, tetikleyiciyi atlayan bir yoldan (test veritabanında tetikleyici kaldırılarak) simüle edilir; gerçek veriye dokunulmaz.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../db/db.ts";
import { migrate, rollback } from "../db/migrate.ts";
import { AUDIT_GENESIS, AuditLog, SqliteAuditSink, canonicalJson, chainHash, verifyAuditChain, verifyChainRows } from "./audit.ts";
import type { ChainRow } from "./audit.ts";

const T = () => new Date("2026-10-22T10:00:00.000Z");

function world() {
  const db = openDb(":memory:");
  migrate(db);
  const audit = new AuditLog([new SqliteAuditSink(db)], T);
  return { db, audit };
}

function rows(db: ReturnType<typeof openDb>): ChainRow[] {
  return db.prepare("SELECT id, ts, initiator_kind, initiator_id, action, decision, result, details_json, prev_hash, hash FROM audit_events ORDER BY rowid").all() as unknown as ChainRow[];
}

test("canonical JSON sorts keys at every level and drops undefined", () => {
  assert.equal(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: null }], c: "x" }, u: undefined }), '{"a":{"c":"x","d":[2,{"y":null,"z":1}]},"b":1}');
  assert.equal(canonicalJson(null), "null");
});

test("each new audit row links to the previous one; the first chained row links to GENESIS; verify passes", () => {
  const { db, audit } = world();
  for (let i = 0; i < 5; i++) audit.record({ initiator: { kind: "user", id: "yusuf" }, action: `t.${i}`, decision: "allow", result: "ok", details: { i, nested: { b: 2, a: 1 } } });
  const r = rows(db);
  assert.equal(r[0]?.prev_hash, AUDIT_GENESIS);
  for (let i = 1; i < r.length; i++) assert.equal(r[i]?.prev_hash, r[i - 1]?.hash);
  const v = verifyAuditChain(db, T);
  assert.deepEqual(v, { ok: true, total: 5, chained: 5, unchainedAfterStart: 0, firstBreak: null, checkedAt: "2026-10-22T10:00:00.000Z" });
});

test("audit rows cannot be updated or deleted (append-only triggers)", () => {
  const { db, audit } = world();
  const e = audit.record({ initiator: { kind: "user", id: "yusuf" }, action: "x", decision: "allow", result: "ok" });
  assert.throws(() => db.prepare("UPDATE audit_events SET result = 'sahte' WHERE id = ?").run(e.id), /append-only/);
  assert.throws(() => db.prepare("DELETE FROM audit_events WHERE id = ?").run(e.id), /append-only/);
  assert.equal(verifyAuditChain(db, T).ok, true);
});

test("tampering through a path that bypasses the trigger is detected at the first broken row", () => {
  const { db, audit } = world();
  const ev = [0, 1, 2, 3].map((i) => audit.record({ initiator: { kind: "agent", id: "a" }, action: `t.${i}`, decision: "allow", result: "ok", details: { i } }));
  // Simülasyon: tetikleyici kaldırılıp satır elle değiştirilir (bir saldırganın doğrudan dosya düzenlemesi gibi).
  db.exec("DROP TRIGGER audit_events_no_update");
  db.prepare("UPDATE audit_events SET result = 'sahte' WHERE id = ?").run(ev[2]?.id as string);
  const v = verifyAuditChain(db, T);
  assert.equal(v.ok, false);
  assert.deepEqual(v.firstBreak, { id: ev[2]?.id, ts: ev[2]?.ts });
  assert.equal(v.chained, 4);
});

test("deleting a middle row (bypassing the trigger) breaks the link of the next row", () => {
  const { db, audit } = world();
  const ev = [0, 1, 2].map((i) => audit.record({ initiator: { kind: "user", id: "u" }, action: `t.${i}`, decision: "allow", result: "ok" }));
  db.exec("DROP TRIGGER audit_events_no_delete");
  db.prepare("DELETE FROM audit_events WHERE id = ?").run(ev[1]?.id as string);
  const v = verifyAuditChain(db, T);
  assert.equal(v.ok, false);
  assert.equal(v.firstBreak?.id, ev[2]?.id);
});

test("pure verifier: forged hash with a correct link is caught; pre-chain rows are skipped; later unchained rows fail the chain", () => {
  const base = { ts: "2026-10-22T10:00:00.000Z", initiator_kind: "user", initiator_id: "u", decision: "allow", result: "ok", details_json: "null" };
  const f = (id: string, action: string) => ({ id, ts: base.ts, initiator: { kind: "user", id: "u" }, action, decision: "allow", result: "ok", details: null });
  const h1 = chainHash(AUDIT_GENESIS, f("1", "a"));
  const h2 = chainHash(h1, f("2", "b"));
  const good: ChainRow[] = [
    { ...base, id: "0", action: "old", prev_hash: null, hash: null },
    { ...base, id: "1", action: "a", prev_hash: AUDIT_GENESIS, hash: h1 },
    { ...base, id: "x", action: "raw", prev_hash: null, hash: null },
    { ...base, id: "2", action: "b", prev_hash: h1, hash: h2 },
  ];
  const ok = verifyChainRows(good, "t");
  assert.deepEqual(ok, { ok: false, total: 4, chained: 2, unchainedAfterStart: 1, firstBreak: { id: "x", ts: base.ts }, checkedAt: "t" }); // zincir başladıktan sonra özetsiz satır = şüpheli
  const forged = good.filter((r) => r.id !== "x").map((r) => (r.id === "2" ? { ...r, action: "c" } : r));
  assert.deepEqual(verifyChainRows(forged, "t").firstBreak, { id: "2", ts: base.ts });
  const badJson = good.filter((r) => r.id !== "x").map((r) => (r.id === "1" ? { ...r, details_json: "{bozuk" } : r));
  assert.equal(verifyChainRows(badJson, "t").firstBreak?.id, "1");
});

test("audit written inside an outer transaction uses a savepoint and still chains; a rolled back outer transaction leaves no row", () => {
  const { db, audit } = world();
  audit.record({ initiator: { kind: "user", id: "u" }, action: "before", decision: "allow", result: "ok" });
  db.exec("BEGIN IMMEDIATE");
  audit.record({ initiator: { kind: "user", id: "u" }, action: "inside", decision: "allow", result: "ok" });
  db.exec("COMMIT");
  db.exec("BEGIN IMMEDIATE");
  audit.record({ initiator: { kind: "user", id: "u" }, action: "dropped", decision: "allow", result: "ok" });
  db.exec("ROLLBACK");
  audit.record({ initiator: { kind: "user", id: "u" }, action: "after", decision: "allow", result: "ok" });
  assert.deepEqual(rows(db).map((r) => r.action), ["before", "inside", "after"]);
  assert.equal(verifyAuditChain(db, T).ok, true);
});

test("rows written before migration 013 are not chained; the chain starts after it and rollback of 013 keeps the rows", () => {
  const db = openDb(":memory:");
  migrate(db);
  rollback(db, 12);
  const audit = new AuditLog([new SqliteAuditSink(db)], T);
  audit.record({ initiator: { kind: "user", id: "u" }, action: "old", decision: "allow", result: "ok" });
  assert.deepEqual(verifyAuditChain(db, T), { ok: true, total: 1, chained: 0, unchainedAfterStart: 0, firstBreak: null, checkedAt: "2026-10-22T10:00:00.000Z" });
  migrate(db);
  const audit2 = new AuditLog([new SqliteAuditSink(db)], T);
  audit2.record({ initiator: { kind: "user", id: "u" }, action: "new", decision: "allow", result: "ok" });
  const v = verifyAuditChain(db, T);
  assert.equal(v.ok, true);
  assert.equal(v.total, 2);
  assert.equal(v.chained, 1);
  rollback(db, 12);
  assert.equal((db.prepare("SELECT count(*) AS n FROM audit_events").get() as { n: number }).n, 2);
});
