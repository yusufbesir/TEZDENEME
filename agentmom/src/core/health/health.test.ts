import { mkTmp } from "../../testing/tmp.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { openDb } from "../db/db.ts";
import { migrate } from "../db/migrate.ts";
import { checkHealth } from "./health.ts";

function tmp(): string {
  return mkTmp("agentmom-health-");
}

function names(r: ReturnType<typeof checkHealth>, ok: boolean): string[] {
  return r.checks.filter((c) => c.ok === ok).map((c) => c.name);
}

test("green on a migrated database", () => {
  const path = join(tmp(), "ok.db");
  const db = openDb(path);
  migrate(db);
  db.close();
  const r = checkHealth({ dbPath: path });
  assert.equal(r.status, "green", JSON.stringify(r));
  assert.deepEqual(names(r, false), []);
});

test("red when the database exists but was never migrated", () => {
  const path = join(tmp(), "empty.db");
  openDb(path).close();
  const r = checkHealth({ dbPath: path });
  assert.equal(r.status, "red");
  assert.ok(names(r, false).includes("migrations_and_integrity"));
});

test("red on a corrupted database file", () => {
  const path = join(tmp(), "bad.db");
  writeFileSync(path, "this is definitely not a sqlite database ".repeat(200));
  const r = checkHealth({ dbPath: path });
  assert.equal(r.status, "red");
  assert.ok(names(r, false).length >= 1);
});

test("red when the database location does not exist", () => {
  const r = checkHealth({ dbPath: join(tmp(), "missing-dir", "x.db") });
  assert.equal(r.status, "red");
  assert.ok(names(r, false).includes("write_permission"));
});

test("health check leaves no probe table behind", () => {
  const path = join(tmp(), "probe.db");
  const db = openDb(path);
  migrate(db);
  db.close();
  checkHealth({ dbPath: path });
  const again = openDb(path);
  assert.equal(again.prepare("SELECT count(*) AS c FROM sqlite_master WHERE name = '_health_probe'").get()?.c, 0);
  again.close();
});
