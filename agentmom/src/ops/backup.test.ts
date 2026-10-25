import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { mkTmp } from "../testing/tmp.ts";
import { openDb } from "../core/db/db.ts";
import { loadMigrations, migrate, rollback } from "../core/db/migrate.ts";
import { MemoryStore } from "../memory/store.ts";
import { BackupError, backupBeforeMigration, createBackup, pendingMigrations, restoreBackup, verifyBackup, MANIFEST } from "./backup.ts";

const LATEST = loadMigrations().length;
const FAKE_KEY = "sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2";
const T0 = new Date("2026-10-21T12:00:00.000Z");

function world() {
  const base = mkTmp("yedek-");
  const repo = join(base, "repo");
  const state = join(base, "state");
  const out = join(base, "yedekler");
  const cfg = join(base, "cfg");
  for (const d of [repo, state, out, cfg]) mkdirSync(d);
  const db = openDb(join(base, "live.db"));
  migrate(db);
  const memory = new MemoryStore(db);
  for (let i = 0; i < 5; i++) memory.add({ kind: "note", title: `not ${i}`, body: `icerik ${i}`, source: "test", scope: "yedek", confidence: 0.8 });
  const userCfg = join(cfg, "user-config.json");
  writeFileSync(userCfg, JSON.stringify({ policy: { defaultContract: { id: "x", allowedDirs: ["D:/YusufII/Projeler"] } } }));
  return { base, repo, state, out, db, userCfg, opts: { db, destRoot: out, repoRoot: repo, stateDir: state, configFiles: [{ name: "user-config.json", path: userCfg }], now: () => T0 } };
}

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof BackupError ? e.code : `other:${(e as Error).message}`;
  }
  return undefined;
}

test("backup -> verify -> restore round trip: consistent snapshot, hashes, counts, config copy, usable restored database", () => {
  const w = world();
  const { dir, manifest } = createBackup(w.opts);
  assert.match(dir, /agentmom-yedek-20261021-120000-[0-9a-f]{6}$/);
  assert.equal(manifest.schemaVersion, LATEST);
  assert.equal(manifest.tableCounts.memory_records, 5);
  assert.deepEqual(manifest.files.map((f) => f.name), ["agentmom.db", "user-config.json"]);
  const v = verifyBackup(dir);
  assert.equal(v.ok, true, v.problems.join("; "));
  assert.equal(v.needsMigration, false);
  const target = join(w.base, "geri-yuklenen");
  const r = restoreBackup({ backupDir: dir, targetDir: target, repoRoot: w.repo, stateDir: w.state });
  assert.deepEqual(r.files, ["agentmom.db", "user-config.json"]);
  assert.equal(verifyBackup(target).ok, true, "the restored folder is itself a verifiable backup");
  const restored = openDb(join(target, "agentmom.db"));
  assert.equal(new MemoryStore(restored).search("icerik", { scope: "yedek" }).length, 5);
  assert.deepEqual(migrate(restored), [], "a current backup needs no migration");
  assert.equal(readFileSync(join(target, "user-config.json"), "utf8"), readFileSync(w.userCfg, "utf8"));
  restored.close();
  // The live database was not touched by the backup or the restore.
  assert.equal(new MemoryStore(w.db).list().length, 5);
});

test("verification catches every kind of damage: flipped byte, edited manifest, missing/extra/renamed file, no manifest, hostile manifest entries", () => {
  const w = world();
  const fresh = () => createBackup({ ...w.opts, now: () => new Date(T0.getTime() + Math.random() * 1000) }).dir;
  let d = fresh();
  appendFileSync(join(d, "agentmom.db"), Buffer.from([0]));
  assert.match(verifyBackup(d).problems.join(";"), /does not match the manifest/);
  d = fresh();
  const m = JSON.parse(readFileSync(join(d, MANIFEST), "utf8"));
  m.files[0].sha256 = "0".repeat(64);
  writeFileSync(join(d, MANIFEST), JSON.stringify(m));
  assert.equal(verifyBackup(d).ok, false);
  d = fresh();
  writeFileSync(join(d, "ekstra.txt"), "x");
  assert.match(verifyBackup(d).problems.join(";"), /unexpected file/);
  d = fresh();
  writeFileSync(join(d, "user-config.json"), "{}");
  assert.match(verifyBackup(d).problems.join(";"), /user-config.json: content does not match/);
  d = fresh();
  const mm = JSON.parse(readFileSync(join(d, MANIFEST), "utf8"));
  mm.files.push({ name: "..\\..\\gizli.txt", kind: "config", bytes: 1, sha256: "a".repeat(64) }, { name: "token.txt", kind: "config", bytes: 1, sha256: "a".repeat(64) });
  writeFileSync(join(d, MANIFEST), JSON.stringify(mm));
  assert.match(verifyBackup(d).problems.join(";"), /invalid file entry/);
  d = fresh();
  writeFileSync(join(d, MANIFEST), "yok hukmunde {");
  assert.match(verifyBackup(d).problems.join(";"), /not valid JSON/);
  const empty = join(w.out, "yarim");
  mkdirSync(empty);
  writeFileSync(join(empty, "agentmom.db"), "yarim");
  assert.match(verifyBackup(empty).problems.join(";"), /no manifest/, "an unfinished attempt is never accepted");
  assert.equal(verifyBackup("goreli/yol").ok, false);
  // A database that is internally corrupt (hash updated to match) still fails the integrity check.
  d = fresh();
  const dbFile = join(d, "agentmom.db");
  const bytes = readFileSync(dbFile);
  for (let i = 4096 * 2; i < 4096 * 2 + 64; i++) bytes[i] = 0xff;
  writeFileSync(dbFile, bytes);
  const m2 = JSON.parse(readFileSync(join(d, MANIFEST), "utf8"));
  m2.files[0].sha256 = (await_hash(bytes));
  writeFileSync(join(d, MANIFEST), JSON.stringify(m2));
  assert.equal(verifyBackup(d).ok, false);
});

function await_hash(b: Buffer): string {
  return spawnSync(process.execPath, ["-e", `process.stdout.write(require("crypto").createHash("sha256").update(require("fs").readFileSync(0)).digest("hex"))`], { input: b }).stdout.toString();
}

test("a backup whose protective triggers were removed (hashes made consistent) or that carries an extra view/trigger is REJECTED, so a restore can never silently drop the append-only guarantees", () => {
  const w = world();
  const rehash = (d: string) => {
    const bytes = readFileSync(join(d, "agentmom.db"));
    const m = JSON.parse(readFileSync(join(d, MANIFEST), "utf8"));
    m.files[0].sha256 = await_hash(bytes);
    m.files[0].bytes = bytes.length;
    writeFileSync(join(d, MANIFEST), JSON.stringify(m));
  };
  const tamper = (sql: string) => {
    const d = createBackup({ ...w.opts, now: () => new Date(T0.getTime() + Math.random() * 1000) }).dir;
    const raw = new DatabaseSync(join(d, "agentmom.db"));
    raw.exec(sql);
    raw.close();
    rehash(d);
    return verifyBackup(d);
  };
  const dropped = tamper("DROP TRIGGER memory_records_immutable");
  assert.equal(dropped.ok, false);
  assert.match(dropped.problems.join(";"), /protective trigger was removed/);
  assert.match(tamper("DROP TRIGGER skill_events_no_delete").problems.join(";"), /missing trigger:skill_events_no_delete/);
  assert.match(tamper("DROP TRIGGER predictions_no_delete; CREATE TRIGGER predictions_no_delete BEFORE DELETE ON predictions BEGIN SELECT 1; END").problems.join(";"), /was altered/);
  assert.match(tamper("CREATE VIEW sahte AS SELECT 1").problems.join(";"), /unexpected view:sahte/);
  assert.match(tamper("CREATE TRIGGER arka_kapi AFTER INSERT ON memory_records BEGIN UPDATE memory_records SET status = 'retired'; END").problems.join(";"), /unexpected trigger:arka_kapi/);
  assert.match(tamper("CREATE TABLE gizli_tablo (x)").problems.join(";"), /unexpected table:gizli_tablo/);
  assert.equal(verifyBackup(createBackup({ ...w.opts, now: () => new Date(T0.getTime() + 5000) }).dir).ok, true, "an untouched backup still passes");
  assert.equal(code(() => restoreBackup({ backupDir: createBackupTampered(w), targetDir: join(w.base, "kotu-geri"), repoRoot: w.repo, stateDir: w.state })), "verify_failed");
});

function createBackupTampered(w: ReturnType<typeof world>): string {
  const d = createBackup({ ...w.opts, now: () => new Date(T0.getTime() + 9000 + Math.random() * 1000) }).dir;
  const raw = new DatabaseSync(join(d, "agentmom.db"));
  raw.exec("DROP TRIGGER memory_records_no_delete");
  raw.close();
  const bytes = readFileSync(join(d, "agentmom.db"));
  const m = JSON.parse(readFileSync(join(d, MANIFEST), "utf8"));
  m.files[0].sha256 = await_hash(bytes);
  m.files[0].bytes = bytes.length;
  writeFileSync(join(d, MANIFEST), JSON.stringify(m));
  return d;
}

test("backups never contain keys: secret-looking config, key-named files, state-tree files, secrets inside the database, reserved names all refuse BEFORE anything is written", () => {
  const w = world();
  const dirs = () => readdirSync(w.out).length;
  const bad = join(w.base, "cfg", "k.json");
  writeFileSync(bad, JSON.stringify({ note: `anahtar ${FAKE_KEY}` }));
  assert.equal(code(() => createBackup({ ...w.opts, configFiles: [{ name: "k.json", path: bad }] })), "secret_found");
  const tok = join(w.base, "cfg", "session.token");
  writeFileSync(tok, "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG");
  assert.equal(code(() => createBackup({ ...w.opts, configFiles: [{ name: "x.json", path: tok }] })), "invalid_config");
  assert.equal(code(() => createBackup({ ...w.opts, configFiles: [{ name: "session.token", path: w.userCfg }] })), "invalid_config");
  assert.equal(code(() => createBackup({ ...w.opts, configFiles: [{ name: ".env", path: w.userCfg }] })), "invalid_config");
  assert.equal(code(() => createBackup({ ...w.opts, configFiles: [{ name: MANIFEST, path: w.userCfg }] })), "invalid_config");
  assert.equal(code(() => createBackup({ ...w.opts, configFiles: [{ name: "agentmom.db", path: w.userCfg }] })), "invalid_config");
  assert.equal(code(() => createBackup({ ...w.opts, configFiles: [{ name: "../x.json", path: w.userCfg }] })), "invalid_config");
  assert.equal(code(() => createBackup({ ...w.opts, configFiles: [{ name: "a.json", path: w.userCfg }, { name: "a.json", path: w.userCfg }] })), "invalid_config");
  const inState = join(w.state, "a.json");
  writeFileSync(inState, "{}");
  assert.equal(code(() => createBackup({ ...w.opts, configFiles: [{ name: "a.json", path: inState }] })), "invalid_config");
  assert.equal(code(() => createBackup({ ...w.opts, configFiles: [{ name: "a.json", path: join(w.base, "yok.json") }] })), "invalid_config");
  assert.equal(dirs(), 0, "nothing was created by any refused attempt");
  // A secret that got into the database (bypassing the app's redaction) stops the backup too.
  w.db.prepare("INSERT INTO memory_records (id, kind, title, body, source, scope, confidence, observed_at, created_at, content_hash) VALUES ('raw1', 'note', 't', ?, 's', 'yedek', 0.5, 'x', 'x', 'h')").run(`sizmis ${FAKE_KEY}`);
  assert.equal(code(() => createBackup(w.opts)), "secret_found");
});

test("destinations: must be an absolute, existing, real folder outside the repo and the agents' state tree, never the keys/archive folders; a gate can refuse", () => {
  const w = world();
  assert.equal(code(() => createBackup({ ...w.opts, destRoot: "goreli" })), "invalid_dest");
  assert.equal(code(() => createBackup({ ...w.opts, destRoot: join(w.base, "yok") })), "invalid_dest");
  assert.equal(existsSync(join(w.base, "yok")), false, "never created");
  assert.equal(code(() => createBackup({ ...w.opts, destRoot: w.userCfg })), "invalid_dest");
  assert.equal(code(() => createBackup({ ...w.opts, destRoot: w.repo })), "forbidden_dest");
  mkdirSync(join(w.repo, "alt"));
  assert.equal(code(() => createBackup({ ...w.opts, destRoot: join(w.repo, "alt") })), "forbidden_dest");
  assert.equal(code(() => createBackup({ ...w.opts, destRoot: w.state })), "forbidden_dest");
  for (const name of ["anahtarlar", "Arşiv", "ARSIV"]) {
    const p = join(w.base, name);
    mkdirSync(p);
    assert.equal(code(() => createBackup({ ...w.opts, destRoot: p })), "forbidden_dest", name);
  }
  const link = join(w.base, "baglanti");
  try {
    symlinkSync(w.out, link, "junction");
    assert.equal(code(() => createBackup({ ...w.opts, destRoot: link })), "invalid_dest");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EPERM") throw e;
  }
  assert.equal(code(() => createBackup({ ...w.opts, gate: () => { throw new BackupError("forbidden_dest", "politika"); } })), "forbidden_dest");
  assert.equal(readdirSync(w.out).length, 0);
});

test("append only: every backup is a new folder (even within one second), nothing is overwritten or deleted, restore refuses an existing target and an unverified backup", () => {
  const w = world();
  const a = createBackup(w.opts).dir;
  const b = createBackup(w.opts).dir;
  assert.notEqual(a, b);
  assert.equal(readdirSync(w.out).length, 2);
  const before = readFileSync(join(a, "agentmom.db"));
  createBackup(w.opts);
  assert.deepEqual(readFileSync(join(a, "agentmom.db")), before);
  const target = join(w.base, "hedef");
  mkdirSync(target);
  writeFileSync(join(target, "benim.txt"), "dokunma");
  assert.throws(() => restoreBackup({ backupDir: a, targetDir: target, repoRoot: w.repo, stateDir: w.state }));
  assert.equal(readFileSync(join(target, "benim.txt"), "utf8"), "dokunma", "an existing target is left exactly as it was");
  appendFileSync(join(b, "agentmom.db"), "x");
  const t2 = join(w.base, "hedef2");
  assert.equal(code(() => restoreBackup({ backupDir: b, targetDir: t2, repoRoot: w.repo, stateDir: w.state })), "verify_failed");
  assert.equal(existsSync(t2), false, "nothing is written for a backup that does not verify");
  assert.equal(code(() => restoreBackup({ backupDir: a, targetDir: join(w.repo, "geri"), repoRoot: w.repo, stateDir: w.state })), "forbidden_dest");
  assert.equal(code(() => restoreBackup({ backupDir: a, targetDir: join(w.base, "anahtarlar", "x"), repoRoot: w.repo, stateDir: w.state })) !== undefined, true);
});

test("schema safety: an older backup is restorable and migrates forward with its data; a database NEWER than the code, or with an edited migration, is rejected", () => {
  const w = world();
  rollback(w.db, 8);
  const { dir } = createBackup(w.opts);
  const v = verifyBackup(dir);
  assert.equal(v.ok, true, v.problems.join("; "));
  assert.equal(v.needsMigration, true);
  const target = join(w.base, "eski");
  const r = restoreBackup({ backupDir: dir, targetDir: target, repoRoot: w.repo, stateDir: w.state });
  assert.equal(r.needsMigration, true);
  const restored = openDb(join(target, "agentmom.db"));
  assert.deepEqual(migrate(restored), Array.from({ length: LATEST - 8 }, (_, i) => 9 + i));
  assert.equal(new MemoryStore(restored).list().length, 5, "data survives the forward migration");
  restored.close();
  // A snapshot taken by a NEWER build (applied migration the code has no file for) must not be accepted or migrated.
  const w2 = world();
  w2.db.prepare(`INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES (${LATEST + 1}, 'gelecek', 'abc', 'x')`).run();
  const newer = createBackup(w2.opts);
  assert.match(verifyBackup(newer.dir).problems.join(";"), /has no file/);
  assert.throws(() => migrate(w2.db), /has no file/);
  // An edited migration file is detected.
  const w3 = world();
  w3.db.prepare("UPDATE schema_migrations SET checksum = 'degismis' WHERE version = 3").run();
  const edited = createBackup(w3.opts);
  assert.match(verifyBackup(edited.dir).problems.join(";"), /modified after being applied/);
});

test("pre-migration safety: a verified snapshot is taken first when an existing database has pending migrations; no snapshot for fresh or current databases; a failed snapshot blocks the migration", () => {
  const w = world();
  assert.deepEqual(pendingMigrations(w.db), []);
  assert.equal(backupBeforeMigration(w.opts).backedUp, false, "up to date: nothing to do");
  assert.equal(readdirSync(w.out).length, 0);
  const fresh = openDb(join(w.base, "fresh.db"));
  assert.equal(backupBeforeMigration({ ...w.opts, db: fresh }).backedUp, false, "a brand-new database has nothing to protect");
  assert.deepEqual(pendingMigrations(fresh).length, LATEST);
  rollback(w.db, 8);
  assert.deepEqual(pendingMigrations(w.db), Array.from({ length: LATEST - 8 }, (_, i) => 9 + i));
  const r = backupBeforeMigration(w.opts);
  assert.equal(r.backedUp, true);
  assert.deepEqual(r.pending, Array.from({ length: LATEST - 8 }, (_, i) => 9 + i));
  const v = verifyBackup(r.dir as string);
  assert.equal(v.manifest?.schemaVersion, 8, "the snapshot is the OLD schema, taken before migrating");
  assert.match(v.manifest?.reason ?? "", /before migration 9,10,11,12,13/);
  assert.equal(code(() => backupBeforeMigration({ ...w.opts, destRoot: join(w.base, "yok") })), "invalid_dest", "if the snapshot cannot be made the caller must not migrate");
  assert.deepEqual(pendingMigrations(w.db), Array.from({ length: LATEST - 8 }, (_, i) => 9 + i), "and nothing was migrated");
});

test("REAL crash: a writer process is SIGKILLed mid-write; the database reopens clean, every acknowledged commit survived, no half-written record exists, and a backup taken WHILE it wrote is consistent", async () => {
  const w = world();
  const dbPath = join(w.base, "crash.db");
  const child = spawn(process.execPath, [join(import.meta.dirname, "testing", "writer.ts"), dbPath], { stdio: ["ignore", "pipe", "inherit"], windowsHide: true });
  let acked = 0;
  let snapshotAcks = -1;
  let snapshotDir = "";
  const exited = new Promise<void>((ok) => child.on("exit", () => ok()));
  const reader = openDbLater(dbPath);
  await new Promise<void>((ok, fail) => {
    const timer = setTimeout(() => fail(new Error("writer produced too little")), 60_000);
    let buf = "";
    child.stdout.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      for (const m of buf.matchAll(/ack (\d+)\n/g)) acked = Math.max(acked, Number(m[1]));
      buf = buf.slice(buf.lastIndexOf("\n") + 1);
      if (snapshotAcks < 0 && acked >= 25) {
        snapshotAcks = acked;
        const live = reader();
        snapshotDir = createBackup({ ...w.opts, db: live, configFiles: [], now: () => T0 }).dir;
        live.close();
      }
      if (snapshotAcks >= 0 && acked >= snapshotAcks + 40) {
        clearTimeout(timer);
        child.kill("SIGKILL");
        ok();
      }
    });
  });
  await exited;
  const after = new DatabaseSync(dbPath);
  try {
    assert.deepEqual((after.prepare("PRAGMA integrity_check").all() as unknown as Array<{ integrity_check: string }>).map((r) => r.integrity_check), ["ok"]);
    const n = (after.prepare("SELECT COUNT(*) AS n FROM memory_records").get() as unknown as { n: number }).n;
    const fts = (after.prepare("SELECT COUNT(*) AS n FROM memory_fts").get() as unknown as { n: number }).n;
    assert.ok(n >= acked, `every acknowledged commit survived (${n} rows, ${acked} acked)`);
    assert.equal(fts, n, "record and search index are atomic: no half-written record");
    assert.equal((after.prepare("PRAGMA foreign_key_check").all() as unknown[]).length, 0);
    assert.throws(() => after.exec("UPDATE memory_records SET body = 'x'"), /append-only/, "triggers still protect the data after the crash");
  } finally {
    after.close();
  }
  const v = verifyBackup(snapshotDir);
  assert.equal(v.ok, true, v.problems.join("; "));
  assert.ok((v.manifest?.tableCounts.memory_records ?? 0) >= snapshotAcks, "the snapshot taken during writing contains everything acknowledged before it");
  const target = join(w.base, "crash-geri");
  restoreBackup({ backupDir: snapshotDir, targetDir: target, repoRoot: w.repo, stateDir: w.state });
  const restored = openDb(join(target, "agentmom.db"));
  assert.ok(new MemoryStore(restored).list({ scope: "crash-test", limit: 500 }).length >= snapshotAcks);
  restored.close();
});

function openDbLater(path: string): () => ReturnType<typeof openDb> {
  return () => openDb(path);
}

test("command line: yedekle / dogrula / geri-yukle work end to end in a scratch root and print no secrets", () => {
  const base = mkTmp("yedek-cli-");
  const root = join(base, "root");
  const out = join(base, "out");
  const state = join(base, "state");
  mkdirSync(join(root, "data"), { recursive: true });
  mkdirSync(state);
  const db = openDb(join(root, "data", "agentmom.db"));
  migrate(db);
  new MemoryStore(db).add({ kind: "note", title: "cli", body: "cli govde", source: "t", scope: "cli", confidence: 0.5 });
  db.close();
  const cli = resolve(import.meta.dirname, "..", "cli", "yedek.ts");
  const env = { ...process.env, AGENTMOM_BACKUP_DIR: out, AGENTMOM_STATE_DIR: state, AGENTMOM_USER_CONFIG: "" };
  delete (env as Record<string, string | undefined>).AGENTMOM_USER_CONFIG;
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: root, env, encoding: "utf8" });
  const made = run("yedekle");
  assert.equal(made.status, 0, made.stderr + made.stdout);
  assert.match(made.stdout, /Doğrulama: GEÇTİ/);
  const dir = readdirSync(out)[0] as string;
  const full = join(out, dir);
  assert.equal(run("dogrula", full).status, 0);
  appendFileSync(join(full, "agentmom.db"), "x");
  const bad = run("dogrula", full);
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /KALDI/);
  const made2 = run("yedekle");
  const full2 = join(out, readdirSync(out).find((d) => d !== dir) as string);
  const rest = run("geri-yukle", full2, join(base, "yeni"));
  assert.equal(rest.status, 0, rest.stderr + rest.stdout);
  assert.match(rest.stdout, /Canlı veritabanına DOKUNULMADI/);
  assert.equal(existsSync(join(base, "yeni", "agentmom.db")), true);
  assert.equal(run("geri-yukle", full2, join(base, "yeni")).status, 1, "restoring over an existing folder is refused");
  assert.equal(run("bilinmeyen").status, 2);
  assert.equal(made2.status, 0);
});

test("review hardening: the backup root is validated BEFORE it is created, a database secret is named by table.column, restore cannot target the backup itself, names are compared case-insensitively, state dir is mandatory", async () => {
  const { ensureBackupRoot } = await import("./backup.ts");
  const w = world();
  for (const bad of [join(w.base, "anahtarlar", "yedek"), join(w.base, "Arşiv"), join(w.repo, "yedek"), join(w.state, "yedek"), "goreli"]) {
    assert.ok(["forbidden_dest", "invalid_dest"].includes(code(() => ensureBackupRoot(bad, { repoRoot: w.repo, stateDir: w.state })) ?? ""), bad);
  }
  assert.equal(existsSync(join(w.base, "Arşiv")), false);
  assert.equal(existsSync(join(w.base, "anahtarlar")), false, "refused paths are never created");
  assert.equal(code(() => ensureBackupRoot(join(w.base, "bir", "iki"), { repoRoot: w.repo, stateDir: w.state })), "invalid_dest", "only ONE new level is ever created");
  assert.equal(ensureBackupRoot(join(w.base, "yeni-yedek"), { repoRoot: w.repo, stateDir: w.state }), join(w.base, "yeni-yedek"));
  assert.equal(existsSync(join(w.base, "yeni-yedek")), true);
  // secret in the database: the message names the place
  w.db.prepare("INSERT INTO memory_records (id, kind, title, body, source, scope, confidence, observed_at, created_at, content_hash) VALUES ('raw2', 'note', 't', ?, 's', 'yedek', 0.5, 'x', 'x', 'h2')").run(`password: hunter2xyzabc`);
  try {
    createBackup(w.opts);
    assert.fail("should refuse");
  } catch (e) {
    assert.equal((e as BackupError).code, "secret_found");
    assert.match((e as Error).message, /memory_records\.body/);
  }
  // restore into the backup itself / inside it
  const w2 = world();
  const { dir } = createBackup(w2.opts);
  assert.equal(code(() => restoreBackup({ backupDir: dir, targetDir: join(dir, "alt"), repoRoot: w2.repo, stateDir: w2.state })), "invalid_dest");
  assert.deepEqual(readdirSync(dir).sort(), ["agentmom.db", MANIFEST, "user-config.json"].sort(), "the backup was not polluted");
  // case-insensitive duplicate / reserved names, non-json configs, missing state dir
  assert.equal(code(() => createBackup({ ...w2.opts, configFiles: [{ name: "A.json", path: w2.userCfg }, { name: "a.JSON", path: w2.userCfg }] })), "invalid_config");
  assert.equal(code(() => createBackup({ ...w2.opts, configFiles: [{ name: "AGENTMOM.DB", path: w2.userCfg }] })), "invalid_config");
  assert.equal(code(() => createBackup({ ...w2.opts, configFiles: [{ name: "notlar.txt", path: w2.userCfg }] })), "invalid_config", "only .json config files");
  assert.equal(code(() => createBackup({ ...w2.opts, stateDir: undefined as never })) !== undefined, true, "a missing state dir is refused, not silently skipped");
  const m = JSON.parse(readFileSync(join(dir, MANIFEST), "utf8"));
  m.files.push({ ...m.files[0], name: "AGENTMOM.DB" });
  writeFileSync(join(dir, MANIFEST), JSON.stringify(m));
  assert.match(verifyBackup(dir).problems.join(";"), /duplicate manifest entry/);
});
