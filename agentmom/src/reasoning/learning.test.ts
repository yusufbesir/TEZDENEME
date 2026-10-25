// Öğrenme getirisi hesaplayıcı testleri. Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek (bellek içi) SQLite; saat sahte. Hesap salt okunurdur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import type { Actor } from "../core/policy/types.ts";
import { Calibration } from "./reasoning.ts";
import { learningReturn, MIN_RESOLVED_FOR_LEARNING } from "./learning.ts";

const USER: Actor = { kind: "user", id: "yusuf" };
const DAY = 86_400_000;
const MIN = 60_000;
const T0 = new Date("2026-10-01T12:00:00.000Z");
const close = (a: number | null, b: number, eps = 1e-6) => assert.ok(a !== null && Math.abs(a - b) <= eps, `${a} !~ ${b}`);

function setup() {
  const db = openDb(":memory:");
  migrate(db);
  const clock = { at: T0 };
  const cal = new Calibration(db, { now: () => clock.at });
  const src = { db, now: () => clock.at };
  // Sırayla (her biri 1 dakika arayla) tahmin kaydeder; outcome verilirse hemen çözer.
  const add = (source: string, confidence: number, outcome: boolean | null) => {
    clock.at = new Date(clock.at.getTime() + MIN);
    const p = cal.record({ source, claim: "iddia", confidence, dueAt: new Date(clock.at.getTime() + 2 * DAY).toISOString() }, USER);
    if (outcome !== null) cal.resolve(p.id, outcome, "sonuç gözlendi ve doğrulandı", USER);
  };
  return { db, clock, cal, src, add };
}

test("improvement between the first and last half, learning return = improvement / resolved, sample size shown", () => {
  const { src, add } = setup();
  for (let i = 0; i < 6; i++) add("ajan-a", 0.9, false); // Brier 0,81
  for (let i = 0; i < 6; i++) add("ajan-a", 0.9, true); // Brier 0,01
  const r = learningReturn(src);
  const e = r.sources.find((s) => s.source === "ajan-a")!;
  assert.equal(e.resolved, 12);
  assert.equal(e.status, "yeterli");
  close(e.meanBrier, 0.41);
  close(e.firstHalfBrier, 0.81);
  close(e.lastHalfBrier, 0.01);
  close(e.improvement, 0.8);
  close(e.learningReturn, 0.8 / 12);
  assert.equal(e.trend, "iyileşiyor");
  assert.match(e.note, /12 çözülmüş/);
  assert.equal(r.overall.resolved, 12);
  assert.equal(r.minResolved, MIN_RESOLVED_FOR_LEARNING);
  assert.doesNotMatch(JSON.stringify(r), /confidenceInterval|güven aralığı:/);
});

test("worsening is reported as negative improvement", () => {
  const { src, add } = setup();
  for (let i = 0; i < 5; i++) add("ajan-b", 0.9, true);
  for (let i = 0; i < 5; i++) add("ajan-b", 0.9, false);
  const e = learningReturn(src).sources[0]!;
  close(e.improvement, -0.8);
  assert.equal(e.trend, "kötüleşiyor");
  assert.ok(e.learningReturn! < 0);
});

test("odd count: the middle prediction is left out so the halves are equal", () => {
  const { src, add } = setup();
  for (let i = 0; i < 5; i++) add("ajan-c", 1, true); // 0
  add("ajan-c", 0, true); // ortadaki (Brier 1) dışarıda
  for (let i = 0; i < 5; i++) add("ajan-c", 1, true); // 0
  const e = learningReturn(src).sources[0]!;
  assert.equal(e.resolved, 11);
  close(e.firstHalfBrier, 0);
  close(e.lastHalfBrier, 0);
  assert.equal(e.trend, "değişmiyor");
});

test("below 10 resolved: 'insufficient data' with the mean Brier but no improvement or return", () => {
  const { src, add } = setup();
  for (let i = 0; i < 9; i++) add("ajan-d", 0.5, i % 2 === 0);
  const e = learningReturn(src).sources[0]!;
  assert.equal(e.status, "yetersiz veri");
  assert.equal(e.resolved, 9);
  close(e.meanBrier, 0.25);
  assert.equal(e.improvement, null);
  assert.equal(e.learningReturn, null);
  assert.equal(e.firstHalfBrier, null);
  assert.equal(e.trend, null);
  assert.match(e.note, /Yetersiz veri: 9/);
});

test("sources are separate; unresolved and overdue predictions are counted and flagged", () => {
  const { clock, src, add } = setup();
  for (let i = 0; i < 10; i++) add("ajan-e", 0.7, i < 7);
  add("ajan-e", 0.7, null);
  add("ajan-f", 0.6, null);
  clock.at = new Date(clock.at.getTime() + 30 * DAY);
  const r = learningReturn(src);
  assert.deepEqual(r.sources.map((s) => s.source), ["ajan-e", "ajan-f"]);
  const e = r.sources[0]!;
  assert.equal(e.open, 1);
  assert.equal(e.unresolvedOverdue, 1);
  assert.match(e.note, /vadesi geçmiş/);
  const f = r.sources[1]!;
  assert.equal(f.resolved, 0);
  assert.equal(f.meanBrier, null);
  assert.equal(f.status, "yetersiz veri");
  assert.equal(r.overall.open, 2);
});

test("empty ledger: honest 'insufficient data', no throw; read-only and deterministic", () => {
  const { db, src, add } = setup();
  const r = learningReturn(src);
  assert.equal(r.overall.status, "yetersiz veri");
  assert.equal(r.overall.resolved, 0);
  assert.equal(r.overall.meanBrier, null);
  assert.deepEqual(r.sources, []);
  for (let i = 0; i < 10; i++) add("ajan-g", 0.8, true);
  const snap = () => JSON.stringify(db.prepare("SELECT id, outcome FROM predictions ORDER BY id").all());
  const before = snap();
  const a = learningReturn(src);
  assert.equal(snap(), before);
  assert.deepEqual(learningReturn(src), a);
});
