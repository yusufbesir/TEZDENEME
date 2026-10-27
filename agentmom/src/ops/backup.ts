// Local backup, verification and restore (Faz 9, #30). Owner: Claude [IP:AgentMom Faz 9].
// APPEND ONLY and LOCAL: a backup is a NEW directory (never overwrites, nothing is ever deleted: pruning old backups is the user's decision, via the Recycle Bin).
// The database is copied with SQLite's own VACUUM INTO (a consistent snapshot even while the server writes). Backups never contain keys: tokens, the
// agent state tree and credential stores are not included, config files and the database are scanned for secret-looking content, and a hit refuses the backup.
// Restore never touches the live database: it verifies a backup and writes a verified COPY into a new directory; swapping it in is a deliberate manual step.
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { redactString } from "../core/audit/redact.ts";
import type { Db } from "../core/db/db.ts";
import { DEFAULT_MIGRATIONS_DIR, loadMigrations, verifyHistory } from "../core/db/migrate.ts";

export class BackupError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BackupError";
    this.code = code;
  }
}

export const MANIFEST = "manifest.json";
export const FORBIDDEN = /(^|[\\/])(anahtarlar|ar[sş]iv)([\\/]|$)/i;
// Names that look like secret material are never copied, whatever their content.
const SECRET_NAME = /(token|secret|credential|password|passwd|\.pem$|\.key$|\.pfx$|\.env|id_rsa|\.sandbox)/i;
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;
const MAX_CONFIG_BYTES = 1_000_000;

export interface BackupFile {
  name: string;
  kind: "database" | "config";
  bytes: number;
  sha256: string;
}

export interface BackupManifest {
  format: 1;
  tool: "agentmom";
  createdAt: string;
  reason: string;
  schemaVersion: number;
  migrations: Array<{ version: number; name: string; checksum: string }>;
  tableCounts: Record<string, number>;
  files: BackupFile[];
}

export interface VerifyReport {
  ok: boolean;
  problems: string[];
  needsMigration: boolean;
  manifest: BackupManifest | null;
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function inside(parent: string, child: string): boolean {
  const p = resolve(parent).toLowerCase();
  const c = resolve(child).toLowerCase();
  return c === p || c.startsWith(p.endsWith(sep) ? p : p + sep);
}

// The destination must be an existing, real directory outside the repository and outside the agents' state tree, and never the keys/archive folders.
export function checkDestination(destRoot: string, opts: { repoRoot: string; stateDir: string; gate?: (realDir: string) => void }): string {
  if (!isAbsolute(destRoot)) throw new BackupError("invalid_dest", "the backup folder must be an absolute path");
  if (FORBIDDEN.test(destRoot)) throw new BackupError("forbidden_dest", "the keys and archive folders are never a backup destination");
  let st;
  try {
    st = lstatSync(destRoot);
  } catch {
    throw new BackupError("invalid_dest", "the backup folder must already exist (it is never created for you)");
  }
  if (!st.isDirectory() || st.isSymbolicLink()) throw new BackupError("invalid_dest", "the backup folder must be a real directory (no symlink or junction)");
  const real = realpathSync.native(destRoot);
  if (FORBIDDEN.test(real)) throw new BackupError("forbidden_dest", "the keys and archive folders are never a backup destination");
  if (inside(opts.repoRoot, real)) throw new BackupError("forbidden_dest", "a backup inside the repository could be committed by accident");
  if (inside(opts.stateDir, real) || inside(realStateDir(opts.stateDir), real)) throw new BackupError("forbidden_dest", "a backup inside the agents' working tree is not allowed");
  opts.gate?.(real);
  return real;
}

// Creates the backup root ONLY after the unresolved path passed the keys/archive/repo/state checks (the nearest existing parent is resolved first); one level only.
export function ensureBackupRoot(path: string, opts: { repoRoot: string; stateDir: string }): string {
  if (!isAbsolute(path)) throw new BackupError("invalid_dest", "the backup folder must be an absolute path");
  const abs = resolve(path);
  if (FORBIDDEN.test(abs)) throw new BackupError("forbidden_dest", "the keys and archive folders are never a backup destination");
  if (inside(opts.repoRoot, abs) || inside(opts.stateDir, abs)) throw new BackupError("forbidden_dest", "the backup folder must be outside the repository and the agents' working tree");
  if (!existsSync(abs)) {
    let parent: string;
    try {
      parent = realpathSync.native(resolve(abs, ".."));
    } catch {
      throw new BackupError("invalid_dest", "the parent of the backup folder must exist");
    }
    if (FORBIDDEN.test(parent) || inside(opts.repoRoot, parent) || inside(opts.stateDir, parent)) throw new BackupError("forbidden_dest", "the backup folder cannot be created there");
    mkdirSync(abs);
  }
  return abs;
}

// Table-by-table scan of every text value: independent of how SQLite splits long values across pages, and it names the place that holds the secret.
function scanTables(db: DatabaseSync): void {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%\\_fts\\_%' ESCAPE '\\' ORDER BY name").all() as unknown as Array<{ name: string }>;
  for (const t of tables) {
    if (!/^[A-Za-z0-9_]+$/.test(t.name)) continue;
    const cols = (db.prepare(`PRAGMA table_info("${t.name}")`).all() as unknown as Array<{ name: string; type: string }>).filter((c) => /^[A-Za-z0-9_]+$/.test(c.name));
    for (const c of cols) {
      const stmt = db.prepare(`SELECT "${c.name}" AS v FROM "${t.name}" WHERE typeof("${c.name}") IN ('text', 'blob')`);
      for (const row of stmt.iterate() as Iterable<{ v: unknown }>) {
        const text = typeof row.v === "string" ? row.v : Buffer.from(row.v as Uint8Array).toString("latin1");
        if (redactString(text) !== text) throw new BackupError("secret_found", `the database column ${t.name}.${c.name} contains secret-looking content: nothing was backed up (backups never contain keys)`);
      }
    }
  }
}

function scanText(label: string, text: string): void {
  if (redactString(text) !== text) throw new BackupError("secret_found", `${label} contains secret-looking content: nothing was backed up (backups never contain keys)`);
}

function realStateDir(p: string): string {
  try {
    return realpathSync.native(p);
  } catch {
    return resolve(p);
  }
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\..*$/, "").replace("T", "-");
}

function tableCounts(db: DatabaseSync): Record<string, number> {
  const out: Record<string, number> = {};
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%\\_fts%' ESCAPE '\\' ORDER BY name").all() as unknown as Array<{ name: string }>;
  for (const t of tables) {
    if (!/^[A-Za-z0-9_]+$/.test(t.name)) continue;
    out[t.name] = (db.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get() as unknown as { n: number }).n;
  }
  return out;
}

export interface CreateBackupOptions {
  db: Db;
  destRoot: string;
  repoRoot: string;
  stateDir: string;
  configFiles?: Array<{ name: string; path: string }>;
  reason?: string;
  now?: () => Date;
  gate?: (realDir: string) => void;
  migrationsDir?: string;
}

export function createBackup(opts: CreateBackupOptions): { dir: string; manifest: BackupManifest } {
  const now = (opts.now ?? (() => new Date()))();
  const root = checkDestination(opts.destRoot, opts);
  // Everything that will be copied is checked BEFORE any file is created.
  const configs = (opts.configFiles ?? []).map((c) => {
    if (!FILE_NAME.test(c.name) || SECRET_NAME.test(c.name) || !/\.json$/i.test(c.name)) throw new BackupError("invalid_config", `config name not allowed in a backup: ${c.name}`);
    if (SECRET_NAME.test(basename(c.path)) || FORBIDDEN.test(c.path)) throw new BackupError("invalid_config", `file looks like secret material and is never backed up: ${basename(c.path)}`);
    let st;
    try {
      st = lstatSync(c.path);
    } catch {
      throw new BackupError("invalid_config", `config file not found: ${c.name}`);
    }
    if (!st.isFile() || st.isSymbolicLink() || st.size > MAX_CONFIG_BYTES) throw new BackupError("invalid_config", `config must be a regular file of at most 1 MB: ${c.name}`);
    const realCfg = realpathSync.native(c.path);
    if (SECRET_NAME.test(basename(realCfg)) || FORBIDDEN.test(realCfg)) throw new BackupError("invalid_config", `the real file behind ${c.name} looks like secret material and is never backed up`);
    if (inside(opts.stateDir, realCfg) || inside(realStateDir(opts.stateDir), realCfg)) throw new BackupError("invalid_config", "files from the agents' working tree are never backed up");
    const data = readFileSync(c.path);
    scanText(`config ${c.name}`, data.toString("utf8"));
    return { name: c.name, data };
  });
  if (new Set(configs.map((c) => c.name)).size !== configs.length || new Set(configs.map((c) => c.name.toLowerCase())).size !== configs.length || configs.some((c) => c.name.toLowerCase() === "agentmom.db" || c.name.toLowerCase() === MANIFEST)) throw new BackupError("invalid_config", "config names must be unique and not reserved");

  const dir = join(root, `agentmom-yedek-${stamp(now)}-${randomBytes(3).toString("hex")}`);
  mkdirSync(dir); // not recursive: fails if it exists
  const dbPath = join(dir, "agentmom.db");
  // VACUUM INTO writes a consistent snapshot through SQLite itself (WAL-aware), so a running server is not a problem.
  opts.db.exec(`VACUUM INTO '${dbPath.replace(/'/g, "''")}'`);
  const snap = new DatabaseSync(dbPath, { readOnly: true });
  let manifest: BackupManifest;
  try {
    const integrity = (snap.prepare("PRAGMA integrity_check").all() as unknown as Array<{ integrity_check: string }>).map((r) => r.integrity_check);
    if (integrity.length !== 1 || integrity[0] !== "ok") throw new BackupError("integrity_failed", `the snapshot failed its integrity check: ${integrity.join("; ").slice(0, 200)}`);
    const migrations = snap.prepare("SELECT version, name, checksum FROM schema_migrations ORDER BY version").all() as unknown as BackupManifest["migrations"];
    scanTables(snap);
    manifest = { format: 1, tool: "agentmom", createdAt: now.toISOString(), reason: redactString(opts.reason ?? "manual"), schemaVersion: migrations.length ? (migrations[migrations.length - 1] as { version: number }).version : 0, migrations: migrations.map((m) => ({ version: m.version, name: m.name, checksum: m.checksum })), tableCounts: tableCounts(snap), files: [] };
  } finally {
    snap.close();
  }
  const dbBytes = readFileSync(dbPath);
  // A secret-looking string anywhere in the raw database file (including free text) refuses the backup: the database must never hold keys.
  scanText("the database", dbBytes.toString("latin1"));
  manifest.files.push({ name: "agentmom.db", kind: "database", bytes: dbBytes.length, sha256: sha256(dbBytes) });
  for (const c of configs) {
    writeFileSync(join(dir, c.name), c.data, { flag: "wx" });
    manifest.files.push({ name: c.name, kind: "config", bytes: c.data.length, sha256: sha256(c.data) });
  }
  // The manifest is written LAST: a directory without one is an unfinished attempt and verify/restore refuse it.
  writeFileSync(join(dir, MANIFEST), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  return { dir, manifest };
}

// The schema a database MUST have after migrations 1..version: the exact set of tables/indexes/views/triggers, and every trigger's exact text.
// A backup whose protective triggers were removed (or that carries an extra view/trigger) is rejected even if its hashes are consistent.
function schemaFingerprint(db: DatabaseSync): Map<string, string> {
  const out = new Map<string, string>();
  const rows = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all() as unknown as Array<{ type: string; name: string; sql: string | null }>;
  for (const r of rows) out.set(`${r.type}:${r.name}`, r.type === "trigger" ? (r.sql ?? "").replace(/\s+/g, " ").trim() : "");
  return out;
}

export function expectedSchema(version: number, dir: string = DEFAULT_MIGRATIONS_DIR): Map<string, string> {
  const mem = new DatabaseSync(":memory:");
  try {
    mem.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)");
    for (const f of loadMigrations(dir)) if (f.version <= version) mem.exec(f.sql);
    return schemaFingerprint(mem);
  } finally {
    mem.close();
  }
}

// Strict, read-only verification of a backup directory.
export function verifyBackup(dir: string, opts: { migrationsDir?: string } = {}): VerifyReport {
  const problems: string[] = [];
  let manifest: BackupManifest | null = null;
  const fail = (m: string): VerifyReport => ({ ok: false, problems: [...problems, m], needsMigration: false, manifest });
  if (!isAbsolute(dir)) return fail("backup path must be absolute");
  let raw: string;
  try {
    raw = readFileSync(join(dir, MANIFEST), "utf8");
  } catch {
    return fail("no manifest.json: not a finished AgentMom backup");
  }
  try {
    manifest = JSON.parse(raw) as BackupManifest;
  } catch {
    return fail("manifest.json is not valid JSON");
  }
  if (!manifest || manifest.format !== 1 || manifest.tool !== "agentmom" || !Array.isArray(manifest.files) || !Array.isArray(manifest.migrations)) return fail("manifest has an unknown shape");
  const listed = new Set<string>();
  for (const f of manifest.files) {
    if (!f || typeof f.name !== "string" || !FILE_NAME.test(f.name) || SECRET_NAME.test(f.name) || typeof f.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(f.sha256)) {
      problems.push(`manifest lists an invalid file entry: ${String(f && (f as BackupFile).name).slice(0, 60)}`);
      continue;
    }
    if (listed.has(f.name.toLowerCase())) problems.push(`duplicate manifest entry: ${f.name}`);
    listed.add(f.name.toLowerCase());
    try {
      const st = lstatSync(join(dir, f.name));
      if (!st.isFile() || st.isSymbolicLink()) throw new Error("not a regular file");
      const data = readFileSync(join(dir, f.name));
      if (data.length !== f.bytes || sha256(data) !== f.sha256) problems.push(`${f.name}: content does not match the manifest (changed or corrupted)`);
    } catch {
      problems.push(`${f.name}: missing or unreadable`);
    }
  }
  if (!listed.has("agentmom.db")) problems.push("the manifest does not list agentmom.db");
  for (const name of readdirSync(dir)) if (name !== MANIFEST && !listed.has(name.toLowerCase())) problems.push(`${name}: not in the manifest (unexpected file)`);
  let needsMigration = false;
  if (!problems.length) {
    let snap: DatabaseSync | undefined;
    try {
      snap = new DatabaseSync(join(dir, "agentmom.db"), { readOnly: true });
      const integrity = (snap.prepare("PRAGMA integrity_check").all() as unknown as Array<{ integrity_check: string }>).map((r) => r.integrity_check);
      if (integrity.length !== 1 || integrity[0] !== "ok") problems.push(`integrity_check: ${integrity.join("; ").slice(0, 200)}`);
      const fk = snap.prepare("PRAGMA foreign_key_check").all();
      if (fk.length > 0) problems.push(`foreign_key_check: ${fk.length} violation(s)`);
      const applied = snap.prepare("SELECT version, name, checksum FROM schema_migrations ORDER BY version").all() as unknown as BackupManifest["migrations"];
      const files = loadMigrations(opts.migrationsDir ?? DEFAULT_MIGRATIONS_DIR);
      try {
        verifyHistory(applied, files);
      } catch (e) {
        problems.push(`schema history: ${(e as Error).message}`);
      }
      needsMigration = applied.length < files.length;
      if (!problems.some((p) => p.startsWith("schema history"))) {
        const want = expectedSchema(applied.length ? (applied[applied.length - 1] as { version: number }).version : 0, opts.migrationsDir ?? DEFAULT_MIGRATIONS_DIR);
        const have = schemaFingerprint(snap);
        for (const [k, v] of want) {
          if (!have.has(k)) problems.push(`schema: missing ${k}${k.startsWith("trigger:") ? " (a protective trigger was removed)" : ""}`);
          else if (have.get(k) !== v) problems.push(`schema: ${k} was altered`);
        }
        for (const k of have.keys()) if (!want.has(k)) problems.push(`schema: unexpected ${k} (not created by any migration)`);
      }
      if (JSON.stringify(applied.map((m) => [m.version, m.checksum])) !== JSON.stringify(manifest.migrations.map((m) => [m.version, m.checksum]))) problems.push("the database's migration history differs from the manifest");
    } catch (e) {
      problems.push(`the database cannot be opened: ${(e as Error).message.slice(0, 120)}`);
    } finally {
      snap?.close();
    }
  }
  return { ok: problems.length === 0, problems, needsMigration, manifest };
}

// Writes a verified COPY into a NEW directory. The live database and live config are never touched; the caller swaps it in deliberately.
export function restoreBackup(opts: { backupDir: string; targetDir: string; repoRoot: string; stateDir: string; gate?: (realDir: string) => void; migrationsDir?: string }): { dir: string; files: string[]; needsMigration: boolean } {
  const report = verifyBackup(opts.backupDir, opts.migrationsDir ? { migrationsDir: opts.migrationsDir } : {});
  if (!report.ok || !report.manifest) throw new BackupError("verify_failed", `the backup did not verify, nothing was restored: ${report.problems.join("; ").slice(0, 400)}`);
  if (!isAbsolute(opts.targetDir)) throw new BackupError("invalid_dest", "the restore folder must be an absolute path");
  if (inside(opts.backupDir, opts.targetDir)) throw new BackupError("invalid_dest", "the restore folder cannot be inside the backup it restores from");
  const parent = checkDestination(resolve(opts.targetDir, ".."), opts);
  if (inside(opts.backupDir, parent)) throw new BackupError("invalid_dest", "the restore folder cannot be inside the backup it restores from");
  const target = join(parent, basename(opts.targetDir));
  if (FORBIDDEN.test(target)) throw new BackupError("forbidden_dest", "the keys and archive folders are never a restore destination");
  mkdirSync(target); // fails when it exists: a restore never overwrites anything
  const written: string[] = [];
  for (const f of report.manifest.files) {
    copyFileSync(join(opts.backupDir, f.name), join(target, f.name), 1 /* COPYFILE_EXCL */);
    const copy = readFileSync(join(target, f.name));
    if (sha256(copy) !== f.sha256) throw new BackupError("copy_mismatch", `${f.name} changed while being restored; the partial folder was left in place for inspection`);
    written.push(f.name);
  }
  // The manifest travels with the copy, so the restored folder can itself be verified later.
  copyFileSync(join(opts.backupDir, MANIFEST), join(target, MANIFEST), 1 /* COPYFILE_EXCL */);
  return { dir: target, files: written, needsMigration: report.needsMigration };
}

// ---- migration safety ---------------------------------------------------------------------------------------------------
export function pendingMigrations(db: Db, dir: string = DEFAULT_MIGRATIONS_DIR): number[] {
  const files = loadMigrations(dir);
  let applied: Array<{ version: number }> = [];
  try {
    applied = db.prepare("SELECT version FROM schema_migrations").all() as unknown as Array<{ version: number }>;
  } catch {
    applied = []; // brand-new database: nothing is applied yet
  }
  const have = new Set(applied.map((a) => a.version));
  return files.filter((f) => !have.has(f.version)).map((f) => f.version);
}

// Called before migrating an EXISTING database: if anything is pending, a verified snapshot is taken first and a failure stops the start-up.
export function backupBeforeMigration(opts: CreateBackupOptions): { backedUp: boolean; dir?: string; pending: number[] } {
  const dirForMigrations = opts.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;
  const pending = pendingMigrations(opts.db, dirForMigrations);
  const hasData = (() => {
    try {
      return (opts.db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get() as unknown as { n: number }).n > 0;
    } catch {
      return false;
    }
  })();
  if (pending.length === 0 || !hasData) return { backedUp: false, pending };
  const made = createBackup({ ...opts, reason: `before migration ${pending.join(",")}` });
  const verified = verifyBackup(made.dir, { migrationsDir: dirForMigrations });
  // The snapshot is older than the code on purpose, so "needs migration" is expected here; any other problem is fatal.
  if (!verified.ok) throw new BackupError("verify_failed", `the pre-migration backup did not verify, the database was NOT migrated: ${verified.problems.join("; ").slice(0, 300)}`);
  return { backedUp: true, dir: made.dir, pending };
}

export function sizeOf(path: string): number {
  return statSync(path).size;
}
