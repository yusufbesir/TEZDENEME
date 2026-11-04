// Bilgi yarı ömrü haritası testleri. Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek (bellek içi) SQLite; saat sahte. Hesap salt okunurdur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { MEMORY_KINDS, MemoryStore } from "./store.ts";
import type { MemoryInput, MemoryKind } from "./store.ts";
import { halfLifeMap, kaplanMeierHalfLife, MIN_LIFETIMES } from "./halflife.ts";

const DAY = 86_400_000;
const T0 = new Date("2026-10-01T12:00:00.000Z");

function setup() {
  const db = openDb(":memory:");
  migrate(db);
  const clock = { at: T0 };
  const store = new MemoryStore(db, () => clock.at);
  return { db, clock, store, src: { store, now: () => clock.at } };
}

let n = 0;
const rec = (over: Partial<MemoryInput> = {}): MemoryInput => ({ kind: "fact", title: `Kayıt ${++n}`, body: `İçerik ${n}`, source: "test", scope: "agentmom", confidence: 0.8, ...over });
const group = (m: ReturnType<typeof halfLifeMap>, kind: MemoryKind) => m.byKind.find((g) => g.kind === kind)!;

// k adet kayıt T0'da eklenir, 20 gün sonra her biri yenisiyle değiştirilir (ömür 20 gün).
function supersededAfter20(store: MemoryStore, clock: { at: Date }, kind: MemoryKind, k: number, scope = "agentmom") {
  const olds = Array.from({ length: k }, () => store.add(rec({ kind, scope })).record);
  clock.at = new Date(T0.getTime() + 20 * DAY);
  for (const o of olds) store.add(rec({ kind, scope, supersedesId: o.id }));
}

test("Kaplan-Meier: first day the survival curve reaches 0.5, censoring handled", () => {
  assert.equal(kaplanMeierHalfLife([{ t: 1, event: true }, { t: 2, event: true }, { t: 3, event: true }]), 2);
  // 4 olay ve 4 kırpılmış gözlem (t=0,5): ilk gün 1 olay, riskte 8 => 0,875; t=2'de 3 olay riskte 7... elle:
  assert.equal(kaplanMeierHalfLife([{ t: 5, event: false }, { t: 20, event: true }, { t: 20, event: true }]), 20);
  assert.equal(kaplanMeierHalfLife([{ t: 10, event: true }, { t: 50, event: false }, { t: 50, event: false }, { t: 50, event: false }]), null, "curve stays above 0.5");
  assert.equal(kaplanMeierHalfLife([]), null);
});

test("estimate from superseded records with right-censored active ones: 6 lifetimes of 20 days => half-life 20 days, sample size shown", () => {
  const { clock, store, src } = setup();
  supersededAfter20(store, clock, "fact", 6);
  clock.at = new Date(T0.getTime() + 25 * DAY);
  const m = halfLifeMap(src);
  const g = group(m, "fact");
  assert.equal(g.sampleSize, 6);
  assert.equal(g.censored, 6);
  assert.equal(g.status, "yeterli");
  assert.equal(g.halfLifeDays, 20);
  assert.equal(g.records, 12);
  assert.equal(g.activeRecords, 6);
  assert.equal(g.defaultStaleAfterDays, 90);
  assert.match(g.adviceText, /kısaltmayı düşünün/, "default 90 days is more than twice the observed 20");
  assert.match(g.adviceText, /örnek 6/);
  assert.equal(g.scope, null);
  const s = m.byKindAndScope.find((x) => x.kind === "fact" && x.scope === "agentmom")!;
  assert.equal(s.halfLifeDays, 20);
  assert.equal(m.minSample, MIN_LIFETIMES);
  assert.equal(m.byKind.length, MEMORY_KINDS.length);
});

test("fewer than 5 observed lifetimes: 'insufficient data', NO estimate, sample size still visible", () => {
  const { clock, store, src } = setup();
  supersededAfter20(store, clock, "note", 4);
  const g = group(halfLifeMap(src), "note");
  assert.equal(g.sampleSize, 4);
  assert.equal(g.status, "yetersiz veri");
  assert.equal(g.halfLifeDays, null);
  assert.match(g.adviceText, /yetersiz veri/);
  assert.match(g.adviceText, /4/);
});

test("most records still valid: the half-life cannot be estimated (no invented number)", () => {
  const { clock, store, src } = setup();
  supersededAfter20(store, clock, "result", 5);
  for (let i = 0; i < 20; i++) store.add(rec({ kind: "result" }));
  clock.at = new Date(T0.getTime() + 60 * DAY);
  const g = group(halfLifeMap(src), "result");
  assert.equal(g.sampleSize, 5);
  assert.equal(g.status, "tahmin edilemedi");
  assert.equal(g.halfLifeDays, null);
});

test("stale/expired share and median age of active records; retired records are counted but excluded from lifetimes", () => {
  const { clock, store, src } = setup();
  clock.at = new Date(T0.getTime() + 200 * DAY);
  const at = clock.at.getTime();
  const iso = (daysAgo: number) => new Date(at - daysAgo * DAY).toISOString();
  store.add(rec({ kind: "fact", observedAt: iso(10) }));
  store.add(rec({ kind: "fact", observedAt: iso(100) })); // 90 günden eski => bayat
  store.add(rec({ kind: "fact", observedAt: iso(20), validUntil: iso(1) })); // süresi dolmuş
  const r = store.add(rec({ kind: "fact", observedAt: iso(30) })).record;
  store.retire(r.id);
  const g = group(halfLifeMap(src), "fact");
  assert.equal(g.records, 4);
  assert.equal(g.activeRecords, 3);
  assert.equal(g.staleCount, 1);
  assert.equal(g.expiredCount, 1);
  assert.equal(g.staleOrExpiredShare, 0.667);
  assert.equal(g.medianAgeDays, 20);
  assert.equal(g.retiredUnknownTime, 1);
  assert.equal(g.sampleSize, 0);
});

test("per-scope groups are separate", () => {
  const { clock, store, src } = setup();
  supersededAfter20(store, clock, "fact", 5, "alfa");
  supersededAfter20(store, clock, "fact", 2, "beta");
  const m = halfLifeMap(src);
  assert.equal(m.byKindAndScope.find((x) => x.scope === "alfa")!.sampleSize, 5);
  assert.equal(m.byKindAndScope.find((x) => x.scope === "beta")!.status, "yetersiz veri");
});

test("empty store: every group is 'insufficient data', no throw; read-only and deterministic", () => {
  const { db, src, store, clock } = setup();
  const m = halfLifeMap(src);
  assert.ok(m.byKind.every((g) => g.status === "yetersiz veri" && g.sampleSize === 0 && g.medianAgeDays === null && g.staleOrExpiredShare === null));
  assert.deepEqual(m.byKindAndScope, []);
  assert.equal(m.recordsRead, 0);
  supersededAfter20(store, clock, "fact", 5);
  const snap = () => JSON.stringify(db.prepare("SELECT id, status FROM memory_records ORDER BY id").all());
  const before = snap();
  const a = halfLifeMap(src);
  assert.equal(snap(), before);
  assert.deepEqual(halfLifeMap(src), a);
});

test("corrupt timestamps cannot hang or poison the estimate: NaN and non-positive lifetimes are excluded and counted", () => {
  const { db, clock, store, src } = setup();
  supersededAfter20(store, clock, "fact", 6);
  clock.at = new Date(T0.getTime() + 25 * DAY);
  const raw = (id: string, createdAt: string) => db.prepare("INSERT INTO memory_records (id, kind, title, body, source, scope, confidence, observed_at, created_at, status, content_hash) VALUES (?, 'fact', 'bozuk', ?, 'test', 'agentmom', 0.5, ?, ?, 'active', ?)").run(id, id, T0.toISOString(), createdAt, id);
  raw("bozuk-1", "bozuk-tarih");
  raw("gelecek-1", new Date(T0.getTime() + 400 * DAY).toISOString()); // yaş < 0
  const m = halfLifeMap(src);
  assert.equal(m.excludedBadTimes, 2);
  const g = group(m, "fact");
  assert.equal(g.halfLifeDays, 20);
  assert.equal(g.sampleSize, 6);
  assert.equal(kaplanMeierHalfLife([{ t: NaN, event: true }, { t: -1, event: true }, { t: 0, event: true }]), null);
  assert.equal(kaplanMeierHalfLife([{ t: NaN, event: false }, { t: 3, event: true }]), 3);
});
