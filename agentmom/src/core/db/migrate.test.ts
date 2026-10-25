import { mkTmp } from "../../testing/tmp.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openDb } from "./db.ts";
import type { Db } from "./db.ts";
import { DEFAULT_MIGRATIONS_DIR, checkIntegrity, loadMigrations, migrate, rollback } from "./migrate.ts";

function schemaDump(db: Db): string {
  return JSON.stringify(db.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY name").all());
}

function copyMigrations(): string {
  const dir = mkTmp("agentmom-mig-");
  cpSync(DEFAULT_MIGRATIONS_DIR, dir, { recursive: true });
  return dir;
}

test("applies all migrations forward on a fresh database", () => {
  const db = openDb(":memory:");
  const applied = migrate(db);
  assert.deepEqual(applied, loadMigrations().map((m) => m.version));
  assert.ok(applied.length >= 2);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  for (const t of ["tasks", "task_attempts", "audit_events", "schema_migrations"]) assert.ok(tables.includes(t), t);
});

test("re-applying changes nothing", () => {
  const db = openDb(":memory:");
  migrate(db);
  const before = schemaDump(db);
  const rowsBefore = db.prepare("SELECT * FROM schema_migrations").all();
  assert.deepEqual(migrate(db), []);
  assert.equal(schemaDump(db), before);
  assert.deepEqual(db.prepare("SELECT * FROM schema_migrations").all(), rowsBefore);
});

test("applies only new migrations on an existing database", () => {
  const dir = copyMigrations();
  const db = openDb(":memory:");
  const first = migrate(db, dir);
  writeFileSync(join(dir, `${String(first.length + 1).padStart(3, "0")}_extra.sql`), "CREATE TABLE extra (id INTEGER PRIMARY KEY);");
  assert.deepEqual(migrate(db, dir), [first.length + 1]);
});

test("a failing migration rolls back and is not recorded", () => {
  const dir = copyMigrations();
  const db = openDb(":memory:");
  const n = migrate(db, dir).length;
  writeFileSync(join(dir, `${String(n + 1).padStart(3, "0")}_bad.sql`), "CREATE TABLE half (id INTEGER); INSERT INTO nope VALUES (1);");
  assert.throws(() => migrate(db, dir));
  assert.equal(db.prepare("SELECT count(*) AS c FROM schema_migrations").get()?.c, n);
  assert.equal(db.prepare("SELECT count(*) AS c FROM sqlite_master WHERE name='half'").get()?.c, 0);
});

test("detects a migration file modified after it was applied", () => {
  const dir = copyMigrations();
  const db = openDb(":memory:");
  migrate(db, dir);
  writeFileSync(join(dir, "002_indexes.sql"), "CREATE INDEX idx_other ON tasks(title);");
  assert.throws(() => migrate(db, dir), /modified after being applied/);
  assert.equal(checkIntegrity(db, dir).ok, false);
});

test("integrity check is ok on a healthy database and reports a behind schema", () => {
  const db = openDb(":memory:");
  migrate(db);
  assert.equal(checkIntegrity(db).ok, true);
  db.exec(`DELETE FROM schema_migrations WHERE version = ${loadMigrations().length}`);
  const report = checkIntegrity(db);
  assert.equal(report.ok, false);
  assert.match(report.problems.join(" "), /expected/);
});

test("rolls back to an earlier version and can re-apply forward", () => {
  const db = openDb(":memory:");
  migrate(db);
  const latest = loadMigrations().length;
  const reverted = rollback(db, 2);
  assert.deepEqual(reverted, Array.from({ length: latest - 2 }, (_v, i) => latest - i));
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  assert.ok(!tables.includes("providers") && !tables.includes("task_evidence"));
  assert.ok(tables.includes("tasks"));
  assert.equal(db.prepare("SELECT max(version) AS v FROM schema_migrations").get()?.v, 2);
  assert.equal(checkIntegrity(db).ok, false);
  assert.deepEqual(migrate(db), Array.from({ length: latest - 2 }, (_v, i) => i + 3));
  assert.equal(checkIntegrity(db).ok, true);
});

test("rollback keeps data of earlier versions; rolling back everything leaves only the history table", () => {
  const db = openDb(":memory:");
  migrate(db);
  db.prepare("INSERT INTO tasks (id, title, state, requested_action, request_json, decision, created_at, updated_at) VALUES ('t','x','pending','file.read','{}','allow','a','a')").run();
  rollback(db, 3);
  assert.equal(db.prepare("SELECT count(*) AS c FROM tasks").get()?.c, 1);
  rollback(db, 0);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((r) => r.name);
  assert.deepEqual(tables, ["schema_migrations"]);
});

test("rollback refuses when a down file is missing and reverts nothing", () => {
  const dir = copyMigrations();
  const db = openDb(":memory:");
  const n = migrate(db, dir).length;
  writeFileSync(join(dir, `${String(n + 1).padStart(3, "0")}_nodown.sql`), "CREATE TABLE nd (id INTEGER);");
  migrate(db, dir);
  assert.throws(() => rollback(db, n - 1, dir), /no down file/);
  assert.equal(db.prepare("SELECT max(version) AS v FROM schema_migrations").get()?.v, n + 1);
});

test("a down file without a matching up migration is rejected", () => {
  const dir = copyMigrations();
  writeFileSync(join(dir, "099_ghost.down.sql"), "SELECT 1;");
  assert.throws(() => rollback(openDb(":memory:"), 0, dir), /no matching up/);
});

test("rejects non-contiguous or badly named migration files", () => {
  const dir = mkTmp("agentmom-mig-");
  writeFileSync(join(dir, "001_a.sql"), "SELECT 1;");
  writeFileSync(join(dir, "003_c.sql"), "SELECT 1;");
  assert.throws(() => loadMigrations(dir), /contiguous/);
  const dir2 = mkTmp("agentmom-mig-");
  writeFileSync(join(dir2, "init.sql"), "SELECT 1;");
  assert.throws(() => loadMigrations(dir2), /invalid migration file name/);
});
