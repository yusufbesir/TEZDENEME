import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./db.ts";

export const DEFAULT_MIGRATIONS_DIR = join(import.meta.dirname, "migrations");

export interface MigrationFile {
  version: number;
  name: string;
  sql: string;
  checksum: string;
}

export function loadMigrations(dir: string = DEFAULT_MIGRATIONS_DIR): MigrationFile[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql") && !f.endsWith(".down.sql")).sort();
  const out: MigrationFile[] = [];
  for (const file of files) {
    const m = /^(\d{3,})_([a-z0-9_]+)\.sql$/.exec(file);
    if (!m) throw new Error(`invalid migration file name: ${file}`);
    const version = Number(m[1]);
    const previous = out[out.length - 1];
    if (previous && version !== previous.version + 1) throw new Error(`migration versions must be contiguous, got ${file}`);
    if (!previous && version !== 1) throw new Error(`first migration must be 001, got ${file}`);
    const sql = readFileSync(join(dir, file), "utf8").replace(/\r\n/g, "\n");
    out.push({ version, name: m[2] as string, sql, checksum: createHash("sha256").update(sql).digest("hex") });
  }
  return out;
}

export function loadDownMigrations(dir: string = DEFAULT_MIGRATIONS_DIR): Map<number, string> {
  const up = new Set(loadMigrations(dir).map((m) => m.version));
  const out = new Map<number, string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".down.sql")).sort()) {
    const m = /^(\d{3,})_([a-z0-9_]+)\.down\.sql$/.exec(file);
    if (!m) throw new Error(`invalid down migration file name: ${file}`);
    const version = Number(m[1]);
    if (!up.has(version)) throw new Error(`down migration ${file} has no matching up migration`);
    out.set(version, readFileSync(join(dir, file), "utf8").replace(/\r\n/g, "\n"));
  }
  return out;
}

interface AppliedRow {
  version: number;
  name: string;
  checksum: string;
}

function ensureTable(db: Db): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);
}

function appliedRows(db: Db): AppliedRow[] {
  return db.prepare("SELECT version, name, checksum FROM schema_migrations ORDER BY version").all() as unknown as AppliedRow[];
}

// Applied migrations must still match their files: edited or missing history is a hard error.
export function verifyHistory(applied: AppliedRow[], files: MigrationFile[]): void {
  for (const row of applied) {
    const file = files.find((f) => f.version === row.version);
    if (!file) throw new Error(`applied migration ${row.version} (${row.name}) has no file`);
    if (file.checksum !== row.checksum) throw new Error(`migration ${row.version} (${row.name}) was modified after being applied`);
  }
}

export function migrate(db: Db, dir: string = DEFAULT_MIGRATIONS_DIR, now: () => Date = () => new Date()): number[] {
  const files = loadMigrations(dir);
  ensureTable(db);
  const applied = appliedRows(db);
  verifyHistory(applied, files);
  const done = new Set(applied.map((r) => r.version));
  const newlyApplied: number[] = [];
  for (const file of files) {
    if (done.has(file.version)) continue;
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(file.sql);
      db.prepare("INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES (?, ?, ?, ?)").run(
        file.version,
        file.name,
        file.checksum,
        now().toISOString(),
      );
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    newlyApplied.push(file.version);
  }
  return newlyApplied;
}

// Explicit, destructive: reverts applied migrations newer than toVersion, newest first. Every one needs a down file or nothing is reverted.
export function rollback(db: Db, toVersion: number, dir: string = DEFAULT_MIGRATIONS_DIR): number[] {
  ensureTable(db);
  const files = loadMigrations(dir);
  const downs = loadDownMigrations(dir);
  const applied = appliedRows(db);
  verifyHistory(applied, files);
  if (!Number.isInteger(toVersion) || toVersion < 0) throw new Error("toVersion must be a non-negative integer");
  const toRevert = applied.filter((r) => r.version > toVersion).sort((a, b) => b.version - a.version);
  for (const row of toRevert) if (!downs.has(row.version)) throw new Error(`migration ${row.version} (${row.name}) has no down file`);
  const reverted: number[] = [];
  for (const row of toRevert) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(downs.get(row.version) as string);
      db.prepare("DELETE FROM schema_migrations WHERE version = ?").run(row.version);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    reverted.push(row.version);
  }
  return reverted;
}

export interface IntegrityReport {
  ok: boolean;
  currentVersion: number;
  latestVersion: number;
  problems: string[];
}

export function checkIntegrity(db: Db, dir: string = DEFAULT_MIGRATIONS_DIR): IntegrityReport {
  const problems: string[] = [];
  const files = loadMigrations(dir);
  const latestVersion = files.length;
  let currentVersion = 0;
  try {
    const applied = appliedRows(db);
    const last = applied[applied.length - 1];
    currentVersion = last ? last.version : 0;
    verifyHistory(applied, files);
    if (currentVersion !== latestVersion) problems.push(`schema at version ${currentVersion}, expected ${latestVersion}`);
  } catch (err) {
    problems.push(err instanceof Error ? err.message : String(err));
  }
  const rows = db.prepare("PRAGMA integrity_check").all() as unknown as Array<{ integrity_check: string }>;
  for (const r of rows) if (r.integrity_check !== "ok") problems.push(`integrity_check: ${r.integrity_check}`);
  const fk = db.prepare("PRAGMA foreign_key_check").all();
  if (fk.length > 0) problems.push(`foreign_key_check reported ${fk.length} violation(s)`);
  return { ok: problems.length === 0, currentVersion, latestVersion, problems };
}
