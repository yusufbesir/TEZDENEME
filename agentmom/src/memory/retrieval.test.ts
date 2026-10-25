// Aşamalı bellek getirme testleri. Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { MemoryError, MemoryStore } from "./store.ts";
import type { MemoryInput } from "./store.ts";
import { progressiveRetrieve } from "./retrieval.ts";

const T0 = new Date("2026-10-21T12:00:00.000Z");
const DAY = 86_400_000;

function fresh() {
  const db = openDb(":memory:");
  migrate(db);
  const clock = { at: T0 };
  return { db, clock, store: new MemoryStore(db, () => clock.at) };
}

const rec = (over: Partial<MemoryInput> = {}): MemoryInput => ({ kind: "fact", title: "Sunucu ayarı", body: "Çalışma sunucusu İstanbul bölgesinde tutulur.", source: "test", scope: "agentmom", confidence: 0.9, ...over });
const code = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return e instanceof MemoryError ? e.code : `other:${(e as Error).message}`;
  }
  return undefined;
};

test("stage 1 returns summaries only (id, kind, scope, ~160 chars, flags, score); stage 2 the body; stage 3 source and links; nextStage chains 1 -> 2 -> 3 -> null", () => {
  const { store } = fresh();
  const long = "uzun gövde ".repeat(200);
  const a = store.add(rec({ title: "Sunucu ayarı", body: `${long}`, sourceRef: "docs/x.md" })).record;
  const s1 = progressiveRetrieve(store, "sunucu", {});
  assert.equal(s1.stage, 1);
  assert.equal(s1.nextStage, 2);
  assert.equal(s1.items.length, 1);
  const i1 = s1.items[0]!;
  assert.equal(i1.id, a.id);
  assert.equal(i1.kind, "fact");
  assert.equal(i1.scope, "agentmom");
  assert.ok((i1.summary ?? "").length <= 160 && (i1.summary ?? "").length > 100);
  assert.equal(i1.body, undefined);
  assert.equal(i1.source, undefined);
  assert.ok(i1.score > 0 && i1.score <= 1);
  const s2 = progressiveRetrieve(store, "sunucu", { stage: 2 });
  assert.equal(s2.nextStage, 3);
  assert.equal(s2.items[0]!.body!.length, 1200, "body is cut at 1200 characters per record");
  assert.equal(s2.items[0]!.bodyClipped, true);
  assert.equal(s2.items[0]!.summary, undefined);
  const s3 = progressiveRetrieve(store, "sunucu", { stage: 3 });
  assert.equal(s3.nextStage, null);
  const i3 = s3.items[0]!;
  assert.equal(i3.source, "test");
  assert.equal(i3.sourceRef, "docs/x.md");
  assert.equal(i3.exportedPath, null);
  assert.deepEqual(i3.links, { replaces: null, replacedBy: null });
  assert.deepEqual(i3.contradictions, []);
  assert.equal(i3.body, undefined);
});

test("the budget is never exceeded at any stage, truncated is set when something was dropped or cut, and usedChars is the real serialized length", () => {
  const { store } = fresh();
  for (let i = 0; i < 12; i++) store.add(rec({ title: `Kayıt ${i} sunucu`, body: `sunucu ${i} ${"x".repeat(900)}` }));
  for (const stage of [1, 2, 3] as const) {
    for (const budget of [200, 250, 400, 777, 1500, 5000, 20_000]) {
      const r = progressiveRetrieve(store, "sunucu", { stage, budgetChars: budget, limit: 50 });
      assert.ok(r.usedChars <= budget, `stage ${stage} budget ${budget} used ${r.usedChars}`);
      assert.equal(r.usedChars, JSON.stringify(r.items).length);
      assert.equal(r.budgetChars, budget);
    }
  }
  const tight = progressiveRetrieve(store, "sunucu", { stage: 2, budgetChars: 1500 });
  assert.equal(tight.truncated, true);
  assert.ok(tight.items.length < 12);
  const roomy = progressiveRetrieve(store, "sunucu", { stage: 1, budgetChars: 20_000 });
  assert.equal(roomy.truncated, false);
  assert.equal(roomy.items.length, 10, "default limit 10");
});

test("stage 2 keeps the result order and fills the budget; a record that no longer fits whole is clipped, flagged, never silently dropped first", () => {
  const { store } = fresh();
  store.add(rec({ title: "Birinci sunucu", body: "sunucu " + "a".repeat(1000) }));
  store.add(rec({ title: "Ikinci sunucu", body: "sunucu sunucu sunucu " + "b".repeat(1000) }));
  const wide = progressiveRetrieve(store, "sunucu", { stage: 2, budgetChars: 20_000 });
  const order = wide.items.map((i) => i.id);
  const tight = progressiveRetrieve(store, "sunucu", { stage: 2, budgetChars: 900 });
  assert.equal(tight.items[0]!.id, order[0]);
  assert.equal(tight.truncated, true);
  assert.equal(tight.items[0]!.bodyClipped, true);
  assert.ok(tight.usedChars <= 900);
});

test("flagged records (stale, expired, contradiction, low confidence) come back marked, not dropped; passive records are never included", () => {
  const { store, clock } = fresh();
  const stale = store.add(rec({ title: "Eski sunucu notu", body: "sunucu eski", observedAt: new Date(T0.getTime() - 100 * DAY).toISOString() })).record;
  const expired = store.add(rec({ title: "Süreli sunucu", body: "sunucu süreli", validUntil: new Date(T0.getTime() + DAY).toISOString() })).record;
  store.add(rec({ title: "Çelişen bir", subject: "sunucu.konum", body: "sunucu istanbul" }));
  store.add(rec({ title: "Çelişen iki", subject: "sunucu.konum", body: "sunucu ankara" }));
  const low = store.add(rec({ title: "Düşük güven", body: "sunucu belki", confidence: 0.2 })).record;
  const gone = store.add(rec({ title: "Emekli sunucu", body: "sunucu emekli" })).record;
  store.retire(gone.id);
  const old = store.add(rec({ title: "Eski sürüm", subject: "x.y", body: "sunucu sürüm bir" })).record;
  store.add(rec({ title: "Yeni sürüm", subject: "x.y", body: "sunucu sürüm iki", supersedesId: old.id }));
  clock.at = new Date(T0.getTime() + 2 * DAY);
  for (const stage of [1, 2, 3] as const) {
    const r = progressiveRetrieve(store, "sunucu", { stage, limit: 50 });
    const byId = new Map(r.items.map((i) => [i.id, i]));
    assert.ok(byId.get(stale.id)!.flags.includes("stale"), `stale stage ${stage}`);
    assert.ok(byId.get(expired.id)!.flags.includes("expired"), `expired stage ${stage}`);
    assert.ok(byId.get(low.id)!.flags.includes("low_confidence"));
    assert.equal(r.items.filter((i) => i.flags.includes("contradiction")).length, 2);
    assert.equal(byId.has(gone.id), false, "retired record excluded");
    assert.equal(byId.has(old.id), false, "superseded record excluded");
    assert.equal(r.items.some((i) => i.title === "Yeni sürüm"), true);
  }
  // Flags survive a tight budget too.
  const tight = progressiveRetrieve(store, "sunucu", { stage: 1, budgetChars: 600, limit: 50 });
  assert.ok(tight.items.length >= 1 && tight.usedChars <= 600);
  for (const i of tight.items) assert.ok(Array.isArray(i.flags));
});

test("stage 3 shows related contradictions and same-scope supersede links in both directions", () => {
  const { store } = fresh();
  const old = store.add(rec({ title: "Sürüm bir", subject: "s.v", body: "sunucu bir" })).record;
  const next = store.add(rec({ title: "Sürüm iki", subject: "s.v", body: "sunucu iki", supersedesId: old.id })).record;
  const next2 = store.add(rec({ title: "Sürüm üç", subject: "s.v", body: "sunucu üç", supersedesId: next.id })).record;
  const c1 = store.add(rec({ title: "Konum a", subject: "s.k", body: "sunucu a" })).record;
  const c2 = store.add(rec({ title: "Konum b", subject: "s.k", body: "sunucu b" })).record;
  const r = progressiveRetrieve(store, "sunucu", { stage: 3, limit: 50 });
  const byId = new Map(r.items.map((i) => [i.id, i]));
  assert.equal(byId.has(old.id), false);
  assert.equal(byId.has(next.id), false);
  assert.deepEqual(byId.get(next2.id)!.links, { replaces: next.id, replacedBy: null });
  const k1 = byId.get(c1.id)!;
  assert.equal(k1.contradictions!.length, 1);
  assert.equal(k1.contradictions![0]!.otherId, c2.id);
  assert.match(k1.contradictions![0]!.detail, /disagree/);
});

test("Turkish folding: the query matches however it is spelled, and scope / kinds narrow the result", () => {
  const { store } = fresh();
  store.add(rec({ title: "Kayıt şablonu", body: "Çalışma kaydı İstanbul sunucusunda tutulur." }));
  store.add(rec({ title: "Başka kapsam", body: "istanbul başka", scope: "diger" }));
  store.add(rec({ title: "Karar", body: "istanbul karar", kind: "decision" }));
  for (const q of ["istanbul", "İSTANBUL", "çalışma", "CALISMA", "kayit sablonu"]) assert.ok(progressiveRetrieve(store, q).items.length >= 1, q);
  assert.equal(progressiveRetrieve(store, "istanbul", { scope: "diger" }).items.length, 1);
  assert.equal(progressiveRetrieve(store, "istanbul", { kinds: ["decision"] }).items.length, 1);
  assert.deepEqual(progressiveRetrieve(store, "bulunmayan kelime").items, []);
  assert.equal(progressiveRetrieve(store, "bulunmayan kelime").truncated, false);
});

test("invalid options are refused with invalid_field; the retrieval never writes to the store", () => {
  const { store, db } = fresh();
  store.add(rec());
  const before = (db.prepare("SELECT COUNT(*) AS n FROM memory_records").get() as { n: number }).n;
  for (const bad of [{ budgetChars: 199 }, { budgetChars: 20_001 }, { budgetChars: 1.5 }, { stage: 4 as never }, { stage: 0 as never }]) assert.equal(code(() => progressiveRetrieve(store, "sunucu", bad)), "invalid_field", JSON.stringify(bad));
  assert.equal(code(() => progressiveRetrieve(store, "x".repeat(201))), "invalid_field");
  progressiveRetrieve(store, "sunucu", { stage: 3 });
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM memory_records").get() as { n: number }).n, before);
});
