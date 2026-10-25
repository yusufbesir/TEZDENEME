import { accessSync, constants, existsSync } from "node:fs";
import { dirname } from "node:path";
import { openDb } from "../db/db.ts";
import { DEFAULT_MIGRATIONS_DIR, checkIntegrity } from "../db/migrate.ts";

export interface HealthCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface HealthReport {
  status: "green" | "red";
  checks: HealthCheck[];
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Green only if every real check passes. Each check opens the database itself; nothing is cached or assumed.
export function checkHealth(opts: { dbPath: string; migrationsDir?: string }): HealthReport {
  const checks: HealthCheck[] = [];
  const dir = opts.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;

  try {
    accessSync(existsSync(opts.dbPath) ? opts.dbPath : dirname(opts.dbPath), constants.W_OK);
    checks.push({ name: "write_permission", ok: true, detail: "database location is writable" });
  } catch (err) {
    checks.push({ name: "write_permission", ok: false, detail: message(err) });
  }

  let db: ReturnType<typeof openDb> | undefined;
  try {
    db = openDb(opts.dbPath);
    const one = db.prepare("SELECT 1 AS one").get();
    if (one?.one !== 1) throw new Error("unexpected SELECT 1 result");
    checks.push({ name: "db_open", ok: true, detail: "database opens and answers queries" });
  } catch (err) {
    checks.push({ name: "db_open", ok: false, detail: message(err) });
  }

  if (db) {
    try {
      const report = checkIntegrity(db, dir);
      checks.push({
        name: "migrations_and_integrity",
        ok: report.ok,
        detail: report.ok ? `schema version ${report.currentVersion}/${report.latestVersion}, integrity ok` : report.problems.join("; "),
      });
    } catch (err) {
      checks.push({ name: "migrations_and_integrity", ok: false, detail: message(err) });
    }

    try {
      db.exec("BEGIN IMMEDIATE");
      db.exec("CREATE TABLE IF NOT EXISTS _health_probe (x INTEGER)");
      db.exec("INSERT INTO _health_probe VALUES (1)");
      db.exec("ROLLBACK");
      checks.push({ name: "db_write", ok: true, detail: "write transaction succeeded and was rolled back" });
    } catch (err) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // no open transaction
      }
      checks.push({ name: "db_write", ok: false, detail: message(err) });
    }
    try {
      db.close();
    } catch {
      // already closed
    }
  }

  return { status: checks.every((c) => c.ok) ? "green" : "red", checks };
}
