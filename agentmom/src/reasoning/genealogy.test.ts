// Karar soy ağacı testleri. Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import type { Actor } from "../core/policy/types.ts";
import { MemoryStore } from "../memory/store.ts";
import { DecisionLedger, ReasoningError } from "./reasoning.ts";
import { genealogyForest, genealogyOf, MAX_DEPTH } from "./genealogy.ts";

const USER: Actor = { kind: "user", id: "yusuf" };
const DAY = 86_400_000;
const T0 = new Date("2026-10-21T12:00:00.000Z");
const at = (days: number) => new Date(T0.getTime() + days * DAY).toISOString();

function setup() {
  const db = openDb(":memory:");
  migrate(db);
  const clock = { at: T0 };
  const now = () => clock.at;
  const memory = new MemoryStore(db, now);
  const ledger = new DecisionLedger(db, { memory, now });
  return { db, clock, ledger, src: { db, ledger, now } };
}

const dec = (title: string, over: Record<string, unknown> = {}) => ({ title, rationale: `${title} gerekçesi`, scope: "agentmom", expiresAt: at(90), assumptions: [{ text: `${title} varsayımı`, checkBy: at(30) }], ...over });

test("a supersedes chain is walked from any member: root, chain oldest to newest, current, nodes with assumptions and links", () => {
  const { ledger, src } = setup();
  const a = ledger.record(dec("Docker ertelendi") as never, USER);
  const b = ledger.record(dec("Docker kısmen açıldı", { supersedesId: a.id }) as never, USER);
  const c = ledger.record(dec("Docker açıldı", { supersedesId: b.id }) as never, USER);
  for (const from of [a.id, b.id, c.id]) {
    const g = genealogyOf(src, from);
    assert.equal(g.root, a.id);
    assert.deepEqual(g.chain, [a.id, b.id, c.id]);
    assert.equal(g.depth, 3);
    assert.equal(g.current, c.id);
    assert.equal(g.truncated, false);
  }
  const g = genealogyOf(src, b.id);
  assert.deepEqual(g.nodes.map((n) => n.state), ["superseded", "superseded", "active"]);
  assert.deepEqual(g.nodes.map((n) => [n.supersedes, n.supersededBy]), [[null, b.id], [a.id, c.id], [b.id, null]]);
  assert.deepEqual(g.nodes[2]!.assumptions, [{ text: "Docker açıldı varsayımı", status: "unvalidated" }]);
  assert.equal(g.nodes[2]!.reviewState, "ok");
  assert.equal(g.nodes[0]!.title, "Docker ertelendi");
  assert.equal(g.nodes[0]!.expiresAt, a.expiresAt);
});

test("a single decision is its own chain; an unknown id is not_found", () => {
  const { ledger, src } = setup();
  const a = ledger.record(dec("Tek karar") as never, USER);
  const g = genealogyOf(src, a.id);
  assert.deepEqual(g.chain, [a.id]);
  assert.equal(g.root, a.id);
  assert.equal(g.current, a.id);
  assert.throws(() => genealogyOf(src, "00000000-0000-0000-0000-000000000000"), (e: unknown) => e instanceof ReasoningError && e.code === "not_found");
});

test("no forks: an active decision can be superseded once, so a second successor is refused by the ledger", () => {
  const { ledger, src } = setup();
  const a = ledger.record(dec("Kök") as never, USER);
  ledger.record(dec("Halef bir", { supersedesId: a.id }) as never, USER);
  assert.throws(() => ledger.record(dec("Halef iki", { supersedesId: a.id }) as never, USER), (e: unknown) => e instanceof ReasoningError && e.code === "conflict");
  assert.equal(genealogyOf(src, a.id).chain.length, 2);
});

test("an expired head gives state expired and current null; an expired middle stays superseded; a retired head with no successor is expired", () => {
  const { ledger, clock, src } = setup();
  const a = ledger.record(dec("Eski", { expiresAt: at(10) }) as never, USER);
  const b = ledger.record(dec("Yeni", { supersedesId: a.id, expiresAt: at(20) }) as never, USER);
  clock.at = new Date(T0.getTime() + 15 * DAY);
  assert.equal(genealogyOf(src, a.id).current, b.id, "head still valid at day 15");
  clock.at = new Date(T0.getTime() + 25 * DAY);
  const g = genealogyOf(src, a.id);
  assert.deepEqual(g.nodes.map((n) => n.state), ["superseded", "expired"]);
  assert.equal(g.current, null);
  assert.equal(g.nodes[1]!.reviewState, "review_due");
  const { ledger: l2, src: s2 } = setup();
  const r = l2.record(dec("Geri çekilen") as never, USER);
  l2.retire(r.id, USER);
  const gr = genealogyOf(s2, r.id);
  assert.equal(gr.nodes[0]!.state, "expired");
  assert.equal(gr.nodes[0]!.status, "retired");
  assert.equal(gr.current, null);
});

test("cycle protection: a corrupted self/loop reference stops the walk and marks the result truncated (no endless loop)", () => {
  const { ledger, db, src } = setup();
  const a = ledger.record(dec("A") as never, USER);
  const b = ledger.record(dec("B", { supersedesId: a.id }) as never, USER);
  // The ledger forbids this through triggers; simulate a damaged database by dropping the guard in this throwaway in-memory copy.
  db.exec("DROP TRIGGER decisions_content_immutable");
  db.prepare("UPDATE decisions SET supersedes_id = ? WHERE id = ?").run(b.id, a.id);
  const g = genealogyOf(src, a.id);
  assert.equal(g.truncated, true);
  assert.ok(g.chain.length <= MAX_DEPTH);
  assert.equal(new Set(g.chain).size, g.chain.length, "no id twice");
});

test("depth is bounded at 50 and the result says so", () => {
  const { ledger, src } = setup();
  let prev = ledger.record(dec("k0") as never, USER);
  const first = prev.id;
  for (let i = 1; i < 55; i++) prev = ledger.record(dec(`k${i}`, { supersedesId: prev.id }) as never, USER);
  const g = genealogyOf(src, first);
  assert.equal(g.depth, MAX_DEPTH);
  assert.equal(g.truncated, true);
});

test("forest: one summary per root, newest root first, only roots, read-only", () => {
  const { ledger, db, src } = setup();
  const a = ledger.record(dec("Konu A") as never, USER);
  const a2 = ledger.record(dec("Konu A v2", { supersedesId: a.id }) as never, USER);
  const b = ledger.record(dec("Konu B") as never, USER);
  const before = (db.prepare("SELECT COUNT(*) AS n FROM decisions").get() as { n: number }).n;
  const f = genealogyForest(src);
  assert.equal(f.totalRoots, 2);
  assert.equal(f.truncated, false);
  assert.deepEqual(f.trees.map((t) => t.root).sort(), [a.id, b.id].sort());
  const ta = f.trees.find((t) => t.root === a.id)!;
  assert.deepEqual(ta.chain, [a.id, a2.id]);
  assert.equal(ta.headTitle, "Konu A v2");
  assert.equal(ta.headState, "active");
  assert.equal(ta.current, a2.id);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM decisions").get() as { n: number }).n, before);
});

test("forest is capped at 100 roots and reports the real total", () => {
  const { ledger, src } = setup();
  for (let i = 0; i < 103; i++) ledger.record(dec(`Kök ${i}`, { assumptions: [] }) as never, USER);
  const f = genealogyForest(src);
  assert.equal(f.trees.length, 100);
  assert.equal(f.totalRoots, 103);
  assert.equal(f.truncated, true);
});
