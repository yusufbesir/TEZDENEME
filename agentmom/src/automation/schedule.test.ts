// Zaman tetikleyicili otomasyon testleri (madde 13 genişlemesi, ADR-016; migrasyon 016). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf.
// Yalnız yazan yapay zeka değiştirir. SAHTE SAAT (gerçek zamanlayıcı beklenmez), gerçek SQLite (bellek içi); model/ağ yok. Saatler YEREL saatle kurulur (TZ'den bağımsız).
import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { openDb } from "../core/db/db.ts";
import { DEFAULT_MIGRATIONS_DIR, migrate, rollback } from "../core/db/migrate.ts";
import { AUTOMATION_ACTOR, ANALYSES, AutomationEngine, AutomationError, MAX_SCHEDULE_RULES, latestDailySlot, nextDailySlot, parseSchedule } from "./automation.ts";
import type { Schedule } from "./automation.ts";
import { startScheduler } from "./scheduler.ts";
import { buildAnalysisRunner } from "./analysis-summaries.ts";

const USER = { kind: "user" as const, id: "yusuf" };
const AGENT = { kind: "agent" as const, id: "a1" };
const L = (y: number, mo: number, d: number, h = 0, mi = 0): Date => new Date(y, mo - 1, d, h, mi, 0, 0); // yerel saat
const START = L(2026, 10, 23, 10, 0); // Cuma 10:00

function world(start = START) {
  const clock = { t: new Date(start) };
  const db = openDb(":memory:");
  migrate(db);
  const engine = new AutomationEngine(db, { now: () => new Date(clock.t) });
  return { db, engine, clock };
}
const notify = (schedule: Schedule, extra: object = {}) => ({ name: "zamanlı bildirim", trigger: { kind: "schedule", schedule }, actionKind: "notify", params: { message: "Zamanlı bildirim" }, cooldownSeconds: 10, ...extra });
const outcomes = (e: AutomationEngine) => e.listRuns().map((r) => r.outcome).reverse();

test("migration 016: existing rules and runs survive the table rebuild; new columns/constraints work; down restores 015 keeping event rules", () => {
  const dir = mkTmp("agentmom-mig016-");
  for (const f of readdirSync(DEFAULT_MIGRATIONS_DIR)) {
    const v = Number(/^(\d{3})_/.exec(f)?.[1]);
    if (v <= 15) copyFileSync(join(DEFAULT_MIGRATIONS_DIR, f), join(dir, f));
  }
  const db = openDb(":memory:");
  assert.equal(migrate(db, dir).length, 15);
  db.prepare("INSERT INTO automation_rules (id, name, event_pattern, action_kind, params_json, enabled, cooldown_s, created_by, created_at) VALUES ('r1', 'eski bildirim', 'backup.failed', 'notify', '{\"message\":\"x\"}', 1, 60, 'user:yusuf', '2026-10-01T00:00:00.000Z')").run();
  db.prepare("INSERT INTO automation_rules (id, name, event_pattern, action_kind, params_json, enabled, cooldown_s, created_by, created_at) VALUES ('r2', 'eski görev', 'task.approve', 'record_task', '{}', 0, 60, 'user:yusuf', '2026-10-02T00:00:00.000Z')").run();
  db.prepare("INSERT INTO automation_runs (id, rule_id, ts, event_action, event_id, outcome, message) VALUES ('u1', 'r1', '2026-10-03T00:00:00.000Z', 'backup.failed', 'e1', 'notified', 'eski çalışma')").run();

  assert.deepEqual(migrate(db), [16]);
  assert.equal(db.prepare("SELECT count(*) AS c FROM automation_rules").get()?.c, 2);
  const r2 = db.prepare("SELECT * FROM automation_rules WHERE id = 'r2'").get() as Record<string, unknown>;
  assert.equal(r2.enabled, 0);
  assert.equal(r2.trigger_kind, "event");
  assert.equal(r2.schedule_json, null);
  assert.equal(db.prepare("SELECT message FROM automation_runs WHERE id = 'u1'").get()?.message, "eski çalışma");
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  // yeni kısıtlar
  const ins = (id: string, pat: string, kind: string, trig: string, sched: string | null) => db.prepare("INSERT INTO automation_rules (id, name, event_pattern, action_kind, params_json, cooldown_s, created_by, created_at, trigger_kind, schedule_json) VALUES (?, 'x kural', ?, ?, '{}', 60, 'user:y', '2026-10-04T00:00:00.000Z', ?, ?)").run(id, pat, kind, trig, sched);
  ins("s1", "", "run_analysis", "schedule", '{"kind":"interval","everyMinutes":15}');
  assert.throws(() => ins("s2", "backup.failed", "notify", "schedule", '{"kind":"interval","everyMinutes":15}'), /CHECK/);
  assert.throws(() => ins("s3", "", "notify", "schedule", null), /CHECK/);
  assert.throws(() => ins("s4", "a.b", "run_analysis", "event", null), /CHECK/);
  assert.throws(() => ins("s5", "a.b", "shell", "event", null), /CHECK/);
  // değişmezlik: yeni sütunlar da donuk; yalnız enabled değişir; silinemez
  assert.throws(() => db.prepare("UPDATE automation_rules SET schedule_json = '{}' WHERE id = 's1'").run(), /immutable/);
  assert.throws(() => db.prepare("UPDATE automation_rules SET trigger_kind = 'schedule' WHERE id = 'r1'").run(), /immutable/);
  assert.throws(() => db.prepare("UPDATE automation_rules SET name = 'degisti' WHERE id = 'r1'").run(), /immutable/);
  db.prepare("UPDATE automation_rules SET enabled = 0 WHERE id = 's1'").run();
  assert.throws(() => db.prepare("DELETE FROM automation_rules WHERE id = 's1'").run(), /not deleted/);
  db.prepare("INSERT INTO automation_runs (id, rule_id, ts, event_action, event_id, outcome, message) VALUES ('u2', 's1', '2026-10-05T00:00:00.000Z', 'schedule', NULL, 'scheduled_ok', 'z')").run();

  assert.deepEqual(rollback(db, 15), [16]);
  assert.equal(db.prepare("SELECT count(*) AS c FROM automation_rules").get()?.c, 2, "yalnız olay kuralları kalır");
  assert.equal(db.prepare("SELECT count(*) AS c FROM automation_runs").get()?.c, 1, "zamanlı kuralın kaydı gitti, eski kayıt kaldı");
  assert.equal(db.prepare("SELECT message FROM automation_runs WHERE id = 'u1'").get()?.message, "eski çalışma");
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  assert.throws(() => db.prepare("UPDATE automation_rules SET name = 'degisti' WHERE id = 'r1'").run(), /immutable/, "değişmezlik tetikleyicisi geri kuruldu");
  assert.throws(() => db.prepare("DELETE FROM automation_runs").run(), /append-only/);
  assert.throws(() => db.prepare("INSERT INTO automation_rules (id, name, event_pattern, action_kind, params_json, cooldown_s, created_by, created_at) VALUES ('z', 'x kural', 'a.b', 'run_analysis', '{}', 60, 'u', 't')").run(), /CHECK/);
  assert.deepEqual(migrate(db), [16], "yeniden ileri");
});

test("parseSchedule is strict: interval 15..10080, daily HH:MM, weekdays 1..7 distinct, no unknown fields", () => {
  assert.deepEqual(parseSchedule({ kind: "interval", everyMinutes: 15 }), { kind: "interval", everyMinutes: 15 });
  assert.deepEqual(parseSchedule({ kind: "interval", everyMinutes: 10080 }), { kind: "interval", everyMinutes: 10080 });
  assert.deepEqual(parseSchedule({ kind: "daily", at: "09:30", weekdays: [5, 1] }), { kind: "daily", at: "09:30", weekdays: [1, 5] });
  assert.deepEqual(parseSchedule({ kind: "daily", at: "00:00" }), { kind: "daily", at: "00:00" });
  const bad = (v: unknown) => assert.throws(() => parseSchedule(v), (e: unknown) => e instanceof AutomationError && e.code === "invalid_field", JSON.stringify(v));
  bad(null);
  bad([]);
  bad("daily");
  bad({ kind: "interval", everyMinutes: 14 });
  bad({ kind: "interval", everyMinutes: 10081 });
  bad({ kind: "interval", everyMinutes: 15.5 });
  bad({ kind: "interval", everyMinutes: "30" });
  bad({ kind: "interval", everyMinutes: 30, at: "10:00" });
  bad({ kind: "daily", at: "24:00" });
  bad({ kind: "daily", at: "9:30" });
  bad({ kind: "daily", at: "10:60" });
  bad({ kind: "daily", at: "10:00", weekdays: [] });
  bad({ kind: "daily", at: "10:00", weekdays: [0] });
  bad({ kind: "daily", at: "10:00", weekdays: [8] });
  bad({ kind: "daily", at: "10:00", weekdays: [1, 1] });
  bad({ kind: "daily", at: "10:00", weekdays: ["1"] });
  bad({ kind: "daily", at: "10:00", extra: 1 });
  bad({ kind: "cron", expr: "* * * * *" });
});

test("createRule with a schedule trigger: user only, no eventPattern, whitelisted analysis only, run_analysis only on schedules, at most 20 enabled scheduled rules", () => {
  const { engine } = world();
  const ok = notify({ kind: "interval", everyMinutes: 60 });
  assert.throws(() => engine.createRule(ok as never, AGENT), (e: unknown) => e instanceof AutomationError && e.code === "approval_requires_user");
  const bad = (patch: object, input: object = ok) => assert.throws(() => engine.createRule({ ...input, ...patch } as never, USER), (e: unknown) => e instanceof AutomationError && e.code === "invalid_field", JSON.stringify(patch));
  bad({ eventPattern: "backup.failed" });
  bad({ trigger: { kind: "cron", schedule: { kind: "interval", everyMinutes: 60 } } });
  bad({ trigger: { kind: "schedule", schedule: { kind: "interval", everyMinutes: 5 } } });
  bad({ trigger: { kind: "schedule", schedule: { kind: "interval", everyMinutes: 60 }, x: 1 } });
  bad({ trigger: "schedule" });
  bad({ actionKind: "shell" });
  bad({ actionKind: "run_analysis", params: { analysis: "shell" } });
  bad({ actionKind: "run_analysis", params: {} });
  bad({ actionKind: "run_analysis", params: { analysis: "attention" }, trigger: undefined, eventPattern: "backup.failed" }, { name: "olay analiz", cooldownSeconds: 10 });
  const created = engine.createRule({ ...ok, actionKind: "run_analysis", params: { analysis: "attention" } } as never, USER);
  assert.equal(created.triggerKind, "schedule");
  assert.equal(created.eventPattern, "");
  assert.deepEqual(created.schedule, { kind: "interval", everyMinutes: 60 });
  assert.equal(engine.createRule({ name: "olay kuralı", eventPattern: "backup.failed", actionKind: "notify", params: { message: "x y z" }, cooldownSeconds: 10 }, USER).triggerKind, "event");
  const ids = [created.id];
  for (let i = 1; i < MAX_SCHEDULE_RULES; i++) ids.push(engine.createRule(ok as never, USER).id);
  assert.throws(() => engine.createRule(ok as never, USER), (e: unknown) => e instanceof AutomationError && e.code === "limit_reached");
  engine.setEnabled(ids[0] as string, false, USER);
  const again = engine.createRule(ok as never, USER);
  assert.throws(() => engine.setEnabled(ids[0] as string, true, USER), (e: unknown) => e instanceof AutomationError && e.code === "limit_reached");
  assert.equal(engine.getRule(again.id)?.enabled, true);
});

test("latestDailySlot / nextDailySlot are local-time and respect weekdays", () => {
  const fri10 = START.getTime();
  assert.equal(latestDailySlot({ at: "09:00" }, fri10), L(2026, 10, 23, 9, 0).getTime());
  assert.equal(latestDailySlot({ at: "11:00" }, fri10), L(2026, 10, 22, 11, 0).getTime());
  assert.equal(nextDailySlot({ at: "11:00" }, fri10), L(2026, 10, 23, 11, 0).getTime());
  assert.equal(nextDailySlot({ at: "10:00" }, fri10), L(2026, 10, 24, 10, 0).getTime(), "tam o an 'sonraki' sayılmaz");
  // yalnız Pazartesi (1): Cuma 10:00'dan önceki son Pazartesi 20 Ekim, sonraki 26 Ekim
  assert.equal(latestDailySlot({ at: "09:00", weekdays: [1] }, fri10), L(2026, 10, 19, 9, 0).getTime());
  assert.equal(nextDailySlot({ at: "09:00", weekdays: [1] }, fri10), L(2026, 10, 26, 9, 0).getTime());
});

test("tick: an interval rule is not run before its time, runs exactly once when due, never twice in the same tick/minute, then again one interval later", async () => {
  const { engine, clock } = world();
  const r = engine.createRule(notify({ kind: "interval", everyMinutes: 15 }) as never, USER);
  clock.t = L(2026, 10, 23, 10, 14);
  assert.deepEqual(await engine.tick(clock.t), { ran: 0, missed: 0, skipped: 0, errors: 0, busy: false });
  clock.t = L(2026, 10, 23, 10, 15);
  assert.equal((await engine.tick(clock.t)).ran, 1);
  assert.equal((await engine.tick(clock.t)).ran, 0, "aynı dakikada ikinci çalışma yok");
  clock.t = L(2026, 10, 23, 10, 16);
  assert.equal((await engine.tick(clock.t)).ran, 0);
  clock.t = L(2026, 10, 23, 10, 30);
  assert.equal((await engine.tick(clock.t)).ran, 1);
  assert.deepEqual(outcomes(engine), ["notified", "notified"]);
  const run = engine.listRuns()[0];
  assert.equal(run?.ruleId, r.id);
  assert.equal(run?.eventAction, "schedule");
  assert.equal(run?.message, "Zamanlı bildirim");
  assert.equal(engine.nextRunAt(engine.getRule(r.id) as never, clock.t), L(2026, 10, 23, 10, 45).toISOString());
});

test("tick: a daily rule runs once at its local time (within grace), honours weekdays, and does not re-run the same slot", async () => {
  const { engine, clock } = world(L(2026, 10, 23, 8, 0));
  engine.createRule(notify({ kind: "daily", at: "09:00" }) as never, USER);
  engine.createRule(notify({ kind: "daily", at: "09:00", weekdays: [1] }, { name: "yalnız pazartesi" }) as never, USER);
  clock.t = L(2026, 10, 23, 8, 59);
  assert.equal((await engine.tick(clock.t)).ran, 0);
  clock.t = L(2026, 10, 23, 9, 0);
  assert.equal((await engine.tick(clock.t)).ran, 1, "Cuma: yalnız günlük kural");
  clock.t = L(2026, 10, 23, 9, 1);
  assert.equal((await engine.tick(clock.t)).ran, 0);
  clock.t = L(2026, 10, 24, 9, 5); // Cumartesi, 5 dk gecikmeli: hâlâ tolerans içinde
  assert.equal((await engine.tick(clock.t)).ran, 1);
  clock.t = L(2026, 10, 26, 9, 0); // Pazartesi: ikisi de
  assert.equal((await engine.tick(clock.t)).ran, 2);
  assert.equal(outcomes(engine).filter((o) => o === "notified").length, 4);
});

test("missed runs are NOT caught up: one 'missed' row, no burst, schedule moves on (daily and interval)", async () => {
  const { engine, clock } = world(L(2026, 10, 23, 8, 0));
  const d = engine.createRule(notify({ kind: "daily", at: "09:00" }) as never, USER);
  const i = engine.createRule(notify({ kind: "interval", everyMinutes: 15 }, { name: "aralık kuralı" }) as never, USER);
  clock.t = L(2026, 10, 26, 12, 0); // süreç 3 gün kapalıydı
  const t1 = await engine.tick(clock.t);
  assert.equal(t1.ran, 0);
  assert.equal(t1.missed, 2);
  const runs = engine.listRuns();
  assert.equal(runs.length, 2);
  assert.deepEqual(runs.map((r) => r.outcome), ["missed", "missed"]);
  assert.match(runs[0]?.message ?? "", /kaçırıldı/);
  clock.t = L(2026, 10, 26, 12, 1);
  assert.deepEqual(await engine.tick(clock.t), { ran: 0, missed: 0, skipped: 0, errors: 0, busy: false }, "ikinci kez 'missed' yazılmaz");
  assert.equal(engine.listRuns().length, 2);
  clock.t = L(2026, 10, 26, 12, 15);
  assert.equal((await engine.tick(clock.t)).ran, 1, "aralık kuralı çapadan bir aralık sonra çalışır");
  clock.t = L(2026, 10, 27, 9, 0);
  const t3 = await engine.tick(clock.t);
  assert.equal(t3.ran, 1, "ertesi gün 09:00: günlük kural çalışır");
  assert.equal(t3.missed, 1, "aralık kuralı yine tek 'missed' (toplu çalışma yok)");
  assert.equal(engine.listRuns().filter((r) => r.ruleId === d.id && r.outcome === "notified").length, 1);
  assert.equal(engine.listRuns().filter((r) => r.ruleId === i.id && r.outcome === "notified").length, 1);
});

test("disabled rules never run; re-enabling after a long pause yields one 'missed', not a burst", async () => {
  const { engine, clock } = world();
  const r = engine.createRule(notify({ kind: "interval", everyMinutes: 15 }) as never, USER);
  engine.setEnabled(r.id, false, USER);
  clock.t = L(2026, 10, 23, 12, 0);
  assert.equal((await engine.tick(clock.t)).ran, 0);
  assert.equal(engine.listRuns().length, 0);
  assert.equal(engine.nextRunAt(engine.getRule(r.id) as never, clock.t), null);
  engine.setEnabled(r.id, true, USER);
  const t = await engine.tick(clock.t);
  assert.equal(t.ran, 0);
  assert.equal(t.missed, 1);
  assert.deepEqual(outcomes(engine), ["missed"]);
});

test("cooldown applies to run-now after a scheduled run; skip rows are not repeated (reason returned instead); cooldown longer than the interval is refused", async () => {
  const { engine, clock } = world();
  const r = engine.createRule(notify({ kind: "interval", everyMinutes: 60 }, { cooldownSeconds: 3600 }) as never, USER);
  const bad = (cool: number, schedule: Schedule) => assert.throws(() => engine.createRule(notify(schedule, { cooldownSeconds: cool }) as never, USER), (e: unknown) => e instanceof AutomationError && e.code === "invalid_field" && /bekleme süresi çalışma aralığından uzun olamaz/.test(e.message));
  bad(3601, { kind: "interval", everyMinutes: 60 });
  bad(901, { kind: "interval", everyMinutes: 15 });
  assert.equal(engine.createRule(notify({ kind: "daily", at: "09:00" }, { cooldownSeconds: 86400 }) as never, USER).cooldownSeconds, 86400);
  clock.t = L(2026, 10, 23, 11, 0);
  assert.equal((await engine.tick(clock.t)).ran, 1);
  clock.t = L(2026, 10, 23, 11, 10);
  const m1 = await engine.runNow(r.id, USER, clock.t);
  assert.equal(m1.run.outcome, "skipped_cooldown", "elle deneme de bekleme süresine tabidir");
  assert.equal(m1.skippedReason, undefined, "ilk atlama satırı yazıldı");
  clock.t = L(2026, 10, 23, 11, 11);
  const m2 = await engine.runNow(r.id, USER, clock.t);
  assert.equal(m2.run.id, m1.run.id, "tekrar atlama yeni satır yazmaz");
  assert.match(m2.skippedReason ?? "", /bekleme süresi/);
  assert.deepEqual(outcomes(engine), ["notified", "skipped_cooldown"]);
});

test("concurrent run-now / tick cannot bypass cooldown: the action runs once; the running set is cleared on error; run-now returns its own rule's row", async () => {
  const { engine, clock } = world();
  let calls = 0;
  let release: Array<() => void> = [];
  engine.setAnalysisRunner(() => new Promise<string>((ok) => {
    calls++;
    release.push(() => ok("tamam"));
  }));
  const mk = (name: string) => engine.createRule({ ...notify({ kind: "interval", everyMinutes: 60 }, { name, cooldownSeconds: 3600 }), actionKind: "run_analysis", params: { analysis: "offline" } } as never, USER);
  const r = mk("eşzamanlı analiz");
  clock.t = L(2026, 10, 23, 10, 5);
  const five = Array.from({ length: 5 }, () => engine.runNow(r.id, USER, clock.t).then((v) => ({ v }), (e: unknown) => ({ e })));
  release.forEach((f) => f());
  const res = await Promise.all(five);
  assert.equal(calls, 1, "5 eşzamanlı runNow: analiz 1 kez");
  assert.equal(res.filter((x) => "v" in x).length, 1);
  assert.equal(res.filter((x) => "e" in x && (x.e as AutomationError).code === "busy").length, 4);

  // tick + runNow eşzamanlı (yeni kural, süreli bekleme yok)
  release = [];
  calls = 0;
  engine.setEnabled(r.id, false, USER);
  const r2 = mk("tick ve elle");
  clock.t = L(2026, 10, 23, 11, 5);
  const tickP = engine.tick(clock.t);
  const nowP = engine.runNow(r2.id, USER, clock.t).catch((e: unknown) => e);
  release.forEach((f) => f());
  await Promise.all([tickP, nowP]);
  assert.equal(calls, 1, "tick + runNow eşzamanlı: 1 kez");

  // hata yolunda küme temizlenir (sonraki çağrı busy değil)
  engine.setAnalysisRunner(() => {
    throw new Error("patladı");
  });
  const r3 = mk("hata yolu");
  clock.t = L(2026, 10, 23, 12, 0);
  const e1 = await engine.runNow(r3.id, USER, clock.t);
  assert.equal(e1.run.outcome, "error");
  assert.equal(e1.run.ruleId, r3.id);
  clock.t = L(2026, 10, 23, 12, 1);
  assert.equal((await engine.runNow(r3.id, USER, clock.t)).run.outcome, "skipped_cooldown", "küme temizlendi: busy değil, bekleme süresi");
});

test("run-now returns its own rule's row even when another rule runs concurrently", async () => {
  const { engine, clock } = world();
  let release: () => void = () => undefined;
  engine.setAnalysisRunner(() => new Promise<string>((ok) => { release = () => ok("yavaş"); }));
  const slow = engine.createRule({ ...notify({ kind: "interval", everyMinutes: 60 }, { name: "yavaş analiz" }), actionKind: "run_analysis", params: { analysis: "offline" } } as never, USER);
  const quick = engine.createRule(notify({ kind: "interval", everyMinutes: 60 }, { name: "hızlı bildirim" }) as never, USER);
  clock.t = L(2026, 10, 23, 10, 5);
  const slowP = engine.runNow(slow.id, USER, clock.t);
  const q = await engine.runNow(quick.id, USER, clock.t);
  assert.equal(q.run.ruleId, quick.id);
  assert.equal(q.run.outcome, "notified");
  release();
  const s = await slowP;
  assert.equal(s.run.ruleId, slow.id);
  assert.equal(s.run.outcome, "scheduled_ok");
});

test("run-now is rate limited: at most 5 attempts per minute per rule (rate_limited), window slides", async () => {
  const { engine, clock } = world();
  const r = engine.createRule(notify({ kind: "interval", everyMinutes: 60 }, { cooldownSeconds: 3600 }) as never, USER);
  clock.t = L(2026, 10, 23, 10, 5);
  for (let i = 0; i < 5; i++) await engine.runNow(r.id, USER, clock.t);
  await assert.rejects(engine.runNow(r.id, USER, clock.t), (e: unknown) => e instanceof AutomationError && e.code === "rate_limited");
  assert.ok(engine.listRuns().length <= 2, "sel append-only tabloyu şişirmez");
  clock.t = new Date(L(2026, 10, 23, 10, 6).getTime() + 1000);
  await engine.runNow(r.id, USER, clock.t);
});

test("run-now: user only, scheduled + enabled rules only; counts as a run (moves the anchor)", async () => {
  const { engine, clock } = world();
  const r = engine.createRule(notify({ kind: "interval", everyMinutes: 30 }) as never, USER);
  const ev = engine.createRule({ name: "olay kuralı", eventPattern: "backup.failed", actionKind: "notify", params: { message: "x y z" }, cooldownSeconds: 10 }, USER);
  await assert.rejects(engine.runNow(r.id, AGENT), (e: unknown) => e instanceof AutomationError && e.code === "approval_requires_user");
  await assert.rejects(engine.runNow("yok", USER), (e: unknown) => e instanceof AutomationError && e.code === "not_found");
  await assert.rejects(engine.runNow(ev.id, USER), (e: unknown) => e instanceof AutomationError && e.code === "not_schedule");
  clock.t = L(2026, 10, 23, 10, 10);
  const { run } = await engine.runNow(r.id, USER, clock.t);
  assert.equal(run.outcome, "notified");
  assert.equal(run.eventAction, "schedule.run-now");
  assert.equal(engine.nextRunAt(engine.getRule(r.id) as never, clock.t), L(2026, 10, 23, 10, 40).toISOString());
  engine.setEnabled(r.id, false, USER);
  await assert.rejects(engine.runNow(r.id, USER), (e: unknown) => e instanceof AutomationError && e.code === "rule_disabled");
});

test("record_task on a schedule goes through the injected task creator as system:automation; a failing creator is an 'error' row; a pending approval stays the creator's business", async () => {
  const { engine, clock } = world();
  const created: Array<{ title: string; actor: unknown; action: string }> = [];
  engine.setTaskCreator((title, request) => {
    created.push({ title, actor: request.actor, action: request.action });
  });
  engine.createRule({ ...notify({ kind: "interval", everyMinutes: 15 }), actionKind: "record_task", params: { title: "Zamanlı doğrulama", action: "verification.run", target: "C:/x" } } as never, USER);
  clock.t = L(2026, 10, 23, 10, 15);
  assert.equal((await engine.tick(clock.t)).ran, 1);
  assert.deepEqual(created, [{ title: "Zamanlı doğrulama", actor: AUTOMATION_ACTOR, action: "verification.run" }]);
  assert.equal(engine.listRuns()[0]?.outcome, "task_recorded");
  engine.setTaskCreator(() => {
    throw new Error("politika reddetti");
  });
  clock.t = L(2026, 10, 23, 10, 30);
  const t = await engine.tick(clock.t);
  assert.equal(t.errors, 1);
  assert.equal(engine.listRuns()[0]?.outcome, "error");
  assert.match(engine.listRuns()[0]?.message ?? "", /politika reddetti/);
});

test("run_analysis: whitelist only, short secret-scanned summary in the run row, unknown/missing/throwing analysis is an 'error' row; no model or network call is possible", async () => {
  const { db, engine, clock } = world();
  let fetches = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    fetches++;
    throw new Error("ağ çağrısı olmamalı");
  }) as typeof fetch;
  try {
    const called: string[] = [];
    const rule = (analysis: string) => engine.createRule({ ...notify({ kind: "interval", everyMinutes: 15 }, { name: `analiz ${analysis}` }), actionKind: "run_analysis", params: { analysis } } as never, USER);
    // çalıştırıcı bağlı değil
    rule("attention");
    clock.t = L(2026, 10, 23, 10, 15);
    await engine.tick(clock.t);
    assert.equal(engine.listRuns()[0]?.outcome, "error");
    assert.match(engine.listRuns()[0]?.message ?? "", /bağlı değil/);

    engine.setAnalysisRunner((name) => {
      called.push(name);
      if (name === "halflife") throw new Error("analiz patladı");
      return `bekleyen onay: 3 (1 kritik) token=sk-abcdefghijklmnopqrstuvwxyz0123 ${"x".repeat(900)}`;
    });
    clock.t = L(2026, 10, 23, 10, 30);
    await engine.tick(clock.t);
    const ok = engine.listRuns().find((r) => r.outcome === "scheduled_ok");
    assert.ok(ok, "attention çalıştı");
    assert.ok((ok?.message.length ?? 999) <= 300);
    assert.match(ok?.message ?? "", /^attention: bekleyen onay: 3 \(1 kritik\)/);
    assert.doesNotMatch(ok?.message ?? "", /sk-abcdefgh/);
    assert.deepEqual(called, ["attention"]);

    // beyaz listede olmayan analiz: veritabanına doğrudan eklenmiş (uç/oluşturucu zaten reddeder) kural 'error' kaydı verir ve çalıştırıcıya GİTMEZ
    db.prepare("INSERT INTO automation_rules (id, name, event_pattern, action_kind, params_json, cooldown_s, created_by, created_at, trigger_kind, schedule_json) VALUES ('evil', 'sahte analiz', '', 'run_analysis', '{\"analysis\":\"shell\"}', 10, 'user:y', ?, 'schedule', '{\"kind\":\"interval\",\"everyMinutes\":15}')").run(L(2026, 10, 23, 10, 44).toISOString());
    clock.t = L(2026, 10, 23, 10, 44);
    rule("halflife");
    clock.t = L(2026, 10, 23, 11, 0);
    await engine.tick(clock.t);
    assert.ok(!called.includes("shell"));
    assert.ok(engine.listRuns().some((r) => r.ruleId === "evil" && r.outcome === "error" && /bilinmeyen analiz/.test(r.message)));
    assert.ok(engine.listRuns().some((r) => r.outcome === "error" && r.message.startsWith("analiz çalışmadı (halflife): analiz patladı")));
    for (const n of called) assert.ok((ANALYSES as readonly string[]).includes(n));
    assert.equal(fetches, 0, "ağ çağrısı yok");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a thrown analysis becomes an error row and the other rules still run in the same tick", async () => {
  const { engine, clock } = world();
  engine.setAnalysisRunner(() => {
    throw new Error("analiz patladı");
  });
  engine.createRule({ ...notify({ kind: "interval", everyMinutes: 15 }, { name: "bozuk analiz" }), actionKind: "run_analysis", params: { analysis: "learning" } } as never, USER);
  engine.createRule(notify({ kind: "interval", everyMinutes: 15 }, { name: "sağlam bildirim" }) as never, USER);
  clock.t = L(2026, 10, 23, 10, 15);
  const t = await engine.tick(clock.t);
  assert.equal(t.errors, 1);
  assert.equal(t.ran, 1);
  const runs = engine.listRuns();
  assert.ok(runs.some((r) => r.outcome === "error" && /analiz çalışmadı \(learning\): analiz patladı/.test(r.message)));
});

test("a single in-process tick lock: a concurrent tick reports busy and the action runs once", async () => {
  const { engine, clock } = world();
  let release: () => void = () => undefined;
  let calls = 0;
  engine.setAnalysisRunner(
    () =>
      new Promise<string>((ok) => {
        calls++;
        release = () => ok("tamam");
      }),
  );
  engine.createRule({ ...notify({ kind: "interval", everyMinutes: 15 }), actionKind: "run_analysis", params: { analysis: "offline" } } as never, USER);
  clock.t = L(2026, 10, 23, 10, 15);
  const first = engine.tick(clock.t);
  const second = await engine.tick(clock.t);
  assert.equal(second.busy, true);
  release();
  assert.equal((await first).ran, 1);
  assert.equal(calls, 1);
  assert.equal(engine.listRuns()[0]?.outcome, "scheduled_ok");
});

test("event and schedule triggers do not mix: ticks never fire event rules and audit events never fire scheduled rules; event rules keep working", async () => {
  const { engine, clock } = world();
  const ev = engine.createRule({ name: "olay kuralı", eventPattern: "backup.failed", actionKind: "notify", params: { message: "Yedek hatası" }, cooldownSeconds: 10 }, USER);
  engine.createRule(notify({ kind: "interval", everyMinutes: 15 }) as never, USER);
  clock.t = L(2026, 10, 23, 12, 0);
  await engine.tick(clock.t);
  assert.ok(engine.listRuns().every((r) => r.ruleId !== ev.id), "tick olay kuralını çalıştırmaz");
  engine.write({ id: "e1", ts: clock.t.toISOString(), initiator: USER, action: "backup.failed", decision: "allow", result: "ok" } as never);
  await engine.idle();
  const runs = engine.listRuns();
  assert.equal(runs.filter((r) => r.ruleId === ev.id).length, 1);
  assert.equal(runs.filter((r) => r.ruleId !== ev.id && r.eventAction === "backup.failed").length, 0);
});

test("buildAnalysisRunner: every whitelisted name is summarised from read-only sources; unknown names throw", async () => {
  const stub = {
    attention: () => ({ totalAwaiting: 3, counts: { critical: 1, now: 1, today: 1, batch: 1 }, truncated: false }) as never,
    halflife: () => ({ recordsRead: 4, byKind: [] }) as never,
    learning: () => ({ overall: { resolved: 2, open: 1, unresolvedOverdue: 0, status: "yetersiz veri", trend: null } }) as never,
    absence: async () => ({ unused: { tables: { total: 1 }, endpoints: { total: 2 }, capabilities: { total: 3 } }, missing: { endpointsWithoutUi: { total: 4 }, modulesWithoutDirectTest: { total: 5 } }, scan: { truncated: false } }) as never,
    continuity: () => ({ summary: { providers: 2, activeProviders: 1, singlePoints: 1, essentialSinglePoints: 0, offeredByNobody: 0 } }) as never,
    offline: () => ({ mode: "çevrimiçi", usableProviders: 1, verifiedProviders: 1 }) as never,
    shadowPrice: () => ({ providers: [{ provider: "claude-code", level: "kıt" }], truncated: false }) as never,
  };
  const run = buildAnalysisRunner(stub);
  const seen = new Set<string>();
  for (const name of ANALYSES) {
    const s = await run(name);
    assert.ok(s.length > 0 && s.length <= 280, name);
    seen.add(s);
  }
  assert.equal(seen.size, ANALYSES.length);
  assert.match(await run("attention"), /^bekleyen onay: 3 \(1 kritik/);
  await assert.rejects(async () => run("shell" as never), /bilinmeyen analiz/);
});

test("startScheduler: ticks on demand with an injected clock, survives a throwing tick (stderr trace, no crash), stops cleanly and rejects a bad interval", async () => {
  const seen: Date[] = [];
  let mode: "ok" | "throw" = "ok";
  const fake = {
    async tick(at?: Date) {
      seen.push(at as Date);
      if (mode === "throw") throw new Error("tick patladı sk-abcdefghijklmnopqrstuvwxyz0123");
      return { ran: 0, missed: 0, skipped: 0, errors: 0, busy: false };
    },
  };
  assert.throws(() => startScheduler(fake, { intervalMs: 0 }));
  const fixed = L(2026, 10, 23, 10, 0);
  const s = startScheduler(fake, { intervalMs: 3_600_000, now: () => fixed });
  assert.equal(s.running, true);
  await s.tickNow();
  assert.deepEqual(seen, [fixed]);
  const writes: string[] = [];
  const realWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: string | Uint8Array) => {
    writes.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  try {
    mode = "throw";
    await s.tickNow();
  } finally {
    process.stderr.write = realWrite;
  }
  assert.equal(writes.length, 1);
  assert.match(writes[0] ?? "", /tick hatası: tick patladı/);
  assert.doesNotMatch(writes[0] ?? "", /sk-abcdefgh/);
  await s.stop();
  assert.equal(s.running, false);
  await s.tickNow();
  assert.equal(seen.length, 2, "durdurulduktan sonra tick yok");
  await s.stop();
});

test("startScheduler: no new tick while one is running; stop() waits for the real in-flight tick", async () => {
  let starts = 0;
  let release: () => void = () => undefined;
  const fake = {
    tick() {
      starts++;
      return new Promise<{ ran: number; missed: number; skipped: number; errors: number; busy: boolean }>((ok) => {
        release = () => ok({ ran: 0, missed: 0, skipped: 0, errors: 0, busy: false });
      });
    },
  };
  const s = startScheduler(fake, { intervalMs: 3_600_000 });
  const first = s.tickNow();
  const second = s.tickNow();
  assert.equal(starts, 1, "süren tick varken yenisi başlamaz");
  let stopped = false;
  const stopP = s.stop().then(() => {
    stopped = true;
  });
  await new Promise<void>((ok) => setImmediate(ok));
  assert.equal(stopped, false, "stop() süren tick'i bekler");
  release();
  await Promise.all([first, second, stopP]);
  assert.equal(stopped, true);
});
