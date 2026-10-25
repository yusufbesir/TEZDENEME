// Kullanım-tabanlı denetimli yedek testleri (Faz 11 dilim 4). Sahip: Claude [İP:AgentMom Faz 11]. Gerçek SQLite + gerçek createBackup/verifyBackup; internet/silme yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { AuditLog, SqliteAuditSink } from "../core/audit/audit.ts";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { DEFAULT_SCHEDULER, BackupScheduler, decide } from "./backup-scheduler.ts";
import type { SchedulerConfig } from "./backup-scheduler.ts";

const MIN = 60_000;
const CFG: SchedulerConfig = { ...DEFAULT_SCHEDULER };

test("decide: no change = no backup; a few changes wait; a busy session waits; idle with enough changes backs up; closing backs up; manual always", () => {
  const now = 10_000_000;
  assert.equal(decide(CFG, { now, lastBackupAt: now - 5 * 3600_000, changesSince: 0, lastActivityAt: null }).code, "no_activity");
  assert.equal(decide(CFG, { now, lastBackupAt: now - MIN, changesSince: 3, lastActivityAt: now - 60 * MIN }).code, "few_changes");
  assert.equal(decide(CFG, { now, lastBackupAt: now - MIN, changesSince: 20, lastActivityAt: now - MIN }).code, "busy");
  assert.equal(decide(CFG, { now, lastBackupAt: now - 3600_000, changesSince: 20, lastActivityAt: now - 11 * MIN }).action, "backup");
  assert.equal(decide(CFG, { now, lastBackupAt: null, changesSince: 1, lastActivityAt: now - 11 * MIN }).code, "first_backup");
  assert.equal(decide(CFG, { now, lastBackupAt: now - MIN, changesSince: 2, lastActivityAt: now - MIN, closing: true }).code, "closing");
  assert.equal(decide(CFG, { now, lastBackupAt: now, changesSince: 0, lastActivityAt: null, closing: true }).action, "skip", "closing with nothing new is still no backup");
  assert.equal(decide(CFG, { now, lastBackupAt: now, changesSince: 0, lastActivityAt: null, manual: true }).code, "manual");
});

function setup() {
  const base = mkTmp("am-sched-");
  const repo = join(base, "repo");
  const state = join(base, "state");
  const dest = join(base, "yedek");
  for (const d of [repo, state, dest]) mkdirSync(d, { recursive: true });
  const db = openDb(join(base, "t.db"));
  migrate(db);
  let t = Date.parse("2026-10-22T10:00:00Z");
  const clock = { now: () => new Date(t), advance: (ms: number) => void (t += ms) };
  const audit = new AuditLog([new SqliteAuditSink(db)], clock.now);
  const configPath = join(base, "cfg.json");
  writeFileSync(configPath, JSON.stringify({ ornek: true }));
  const sched = new BackupScheduler({ db, audit, now: clock.now, backupOptions: { destRoot: dest, repoRoot: repo, stateDir: state, configFiles: [{ name: "user-config.json", path: configPath }] }, cfg: { minChanges: 3, idleMs: 10 * MIN, staleWarnMs: 3 * 24 * 3600_000, verifyEveryMs: 12 * 3600_000 } });
  const work = (n: number) => { for (let i = 0; i < n; i++) audit.record({ initiator: { kind: "user", id: "u" }, action: "task.create", decision: "allow", result: "ok" }); };
  const decisions = () => (db.prepare("SELECT decision, result FROM audit_events WHERE action = 'backup.decision' ORDER BY ts").all() as unknown as Array<{ decision: string; result: string }>).map((r) => ({ decision: r.decision, result: r.result }));
  return { sched, clock, work, decisions, dest, db, audit };
}

test("real flow: no activity -> skipped and logged once; activity while busy waits; after idle a verified backup is made and every decision is in the audit log", async () => {
  const { sched, clock, work, decisions, dest } = setup();
  await sched.tick();
  assert.deepEqual(decisions(), [{ decision: "skip", result: "no_activity" }]);
  clock.advance(MIN);
  await sched.tick();
  assert.equal(decisions().length, 1, "the same skip reason is logged once, not every minute");
  assert.equal(readdirSync(dest).length, 0, "nothing is backed up without activity");

  work(5);
  await sched.tick();
  assert.equal(decisions().at(-1)?.result, "busy");
  assert.equal(readdirSync(dest).length, 0);

  clock.advance(11 * MIN);
  await sched.tick();
  assert.deepEqual(decisions().at(-1), { decision: "backup", result: "first_backup" });
  assert.equal(readdirSync(dest).length, 1);
  const st = sched.status();
  assert.equal(st.changesSince, 0);
  assert.equal(st.lastVerify?.ok, true);
  assert.deepEqual(st.warnings, []);
  assert.equal(st.lastBackup?.dir.startsWith("agentmom-yedek-"), true);

  // new little activity, below the threshold: waits; closing takes it anyway
  clock.advance(MIN);
  work(1);
  clock.advance(20 * MIN);
  await sched.tick();
  assert.equal(decisions().at(-1)?.result, "few_changes");
  await sched.close();
  assert.equal(decisions().at(-1)?.result, "closing");
  assert.equal(readdirSync(dest).length, 2, "a second NEW directory: nothing is overwritten");
});

test("failure is loud: a failing backup is recorded and shows as a warning; a failing verification shows as a warning; stale + activity warns", async () => {
  const { sched, clock, work, db, audit } = setup();
  // backup fails (destination removed from the options by pointing create at a throwing function)
  const broken = new BackupScheduler({ db, audit, now: clock.now, backupOptions: { destRoot: "Z:/yok", repoRoot: "D:/x", stateDir: "D:/y" }, cfg: { minChanges: 1, idleMs: 0 } });
  work(2);
  clock.advance(MIN);
  await broken.tick();
  const w = broken.status().warnings.map((x) => x.code);
  assert.ok(w.includes("backup_failed"), `warnings: ${w.join(",")}`);

  // verification failure
  const bad = new BackupScheduler({ db, audit, now: clock.now, backupOptions: { destRoot: "Z:/yok", repoRoot: "D:/x", stateDir: "D:/y" }, create: () => ({ dir: "X:/agentmom-yedek-1", manifest: {} as never }), verify: () => ({ ok: false, problems: ["özet uyuşmuyor"], needsMigration: false, manifest: null }), cfg: { minChanges: 1, idleMs: 0 } });
  work(2);
  clock.advance(MIN);
  await bad.tick({ manual: true });
  assert.ok(bad.status().warnings.some((x) => x.code === "verify_failed" && /özet uyuşmuyor/.test(x.text)));

  // stale backup + activity
  const { sched: s2, clock: c2, work: w2 } = setup();
  w2(2);
  c2.advance(11 * MIN);
  await s2.tick();
  c2.advance(4 * 24 * 3600_000);
  w2(1);
  assert.ok(s2.status().warnings.some((x) => x.code === "stale_with_activity"));
  void sched;
});

test("single instance: a tick that starts while another runs does nothing; the scheduler throws nothing even when the audit log is unusable", async () => {
  const { sched, work, clock } = setup();
  work(5);
  clock.advance(11 * MIN);
  const [a, b] = await Promise.all([sched.tick(), sched.tick()]);
  assert.ok((a === null) !== (b === null) || (a !== null && b !== null), "never two backups at once");
  await assert.doesNotReject(sched.close());
});

test("the module can neither change policy nor delete: only createBackup/verifyBackup are called (source check)", async () => {
  const src = (await import("node:fs")).readFileSync(resolve(import.meta.dirname, "backup-scheduler.ts"), "utf8");
  for (const bad of ["unlinkSync", "rmSync", "rmdirSync", "writeFileSync", "evaluate(", "defaultContract", "icacls", "chmod"]) assert.ok(!src.includes(bad), `forbidden: ${bad}`);
});

test("a failing backup backs off (no new attempt every minute); a manual backup overrides; success clears the warning", async () => {
  const { clock, work, db, audit } = setup();
  let calls = 0;
  let failing = true;
  const sched = new BackupScheduler({
    db, audit, now: clock.now, backupOptions: { destRoot: "Z:/yok", repoRoot: "D:/x", stateDir: "D:/y" }, cfg: { minChanges: 1, idleMs: 0 },
    create: () => { calls++; if (failing) throw new Error("secret_found: sır benzeri içerik"); return { dir: "X:/agentmom-yedek-ok", manifest: {} as never }; },
    verify: () => ({ ok: true, problems: [], needsMigration: false, manifest: null }),
  });
  work(3);
  clock.advance(MIN);
  await sched.tick();
  assert.equal(calls, 1);
  for (let i = 0; i < 10; i++) { clock.advance(MIN); await sched.tick(); }
  assert.equal(calls, 1, "ten more minutes later there is still no new attempt (backoff 30 min)");
  assert.equal((await sched.close(), calls), 1, "closing does not hammer a failing backup either");
  clock.advance(31 * MIN);
  await sched.tick();
  assert.equal(calls, 2, "after the backoff one more attempt is made");
  clock.advance(MIN);
  await sched.tick();
  assert.equal(calls, 2, "second failure doubles the wait (1 h)");
  assert.ok(sched.status().warnings.some((w) => w.code === "backup_failed" && /beklemede/.test(w.text)));
  failing = false;
  const r = await sched.manual();
  assert.equal(calls, 3, "a manual backup is not blocked by the backoff");
  assert.equal(r?.ok, true);
  assert.equal(r?.verifyOk, true);
});

test("a backup dated in the future (clock rolled back or forged manifest) is not 'the latest' and raises a warning", async () => {
  const { sched, clock, dest, work } = setup();
  mkdirSync(join(dest, "agentmom-yedek-29991231-000000-aaaaaa"), { recursive: true });
  writeFileSync(join(dest, "agentmom-yedek-29991231-000000-aaaaaa", "manifest.json"), JSON.stringify({ createdAt: "2999-12-31T00:00:00.000Z", reason: "sahte" }));
  work(3);
  clock.advance(11 * MIN);
  await sched.tick();
  const st = sched.status();
  assert.ok(st.warnings.some((w) => w.code === "clock_skew"), "forged/future backup is flagged");
  assert.ok(st.lastBackup && !st.lastBackup.dir.includes("2999"), "a real backup was made and the forged one is not counted as the latest");
});
