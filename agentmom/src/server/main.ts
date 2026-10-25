import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { AuditLog, JsonlAuditSink, SqliteAuditSink } from "../core/audit/audit.ts";
import { AuthRegistry, writeTokenFile } from "../core/auth/auth.ts";
import { loadConfig } from "../core/config/config.ts";
import { isInside } from "../core/policy/engine.ts";
import { resolveInsideRoot } from "../core/config/safe-path.ts";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { BackupError, backupBeforeMigration, ensureBackupRoot } from "../ops/backup.ts";
import { ClaudeCodeAdapter } from "../providers/claude-code.ts";
import { CodexAdapter } from "../providers/codex.ts";
import { GeminiAdapter } from "../providers/gemini.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { TaskStore } from "../core/tasks/tasks.ts";
import { BrowserProvider } from "../verify/browser.ts";
import { LocalTestProvider } from "../verify/local-tests.ts";
import { RepairCoordinator } from "../verify/repair.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { BackupScheduler } from "../ops/backup-scheduler.ts";
import { CredentialManagerStore } from "../core/secrets/credman.ts";
import { AutomationEngine } from "../automation/automation.ts";
import { startScheduler } from "../automation/scheduler.ts";
import { createApp } from "./app.ts";

const HOST = "127.0.0.1";
const root = process.cwd();

// The user layer (the only one allowed to widen policy) is read only from an explicit path outside the workspace.
// Without AGENTMOM_USER_CONFIG, <root>/../agentmom-config/user-config.json is used when it exists: a directory of its own, outside the repository
// and outside the state tree that holds worktrees and provider scratch space (places agents work in).
const stateDir = resolve(process.env.AGENTMOM_STATE_DIR ?? join(root, "..", "agentmom-state"));
const defaultUserConfig = resolve(root, "..", "agentmom-config", "user-config.json");
const userConfig = process.env.AGENTMOM_USER_CONFIG ?? (existsSync(defaultUserConfig) ? defaultUserConfig : undefined);
// The user layer can widen policy, so it must never live where an agent could have written it.
for (const unsafe of [stateDir, root]) {
  if (userConfig && isInside(unsafe, userConfig)) throw new Error(`refusing user configuration inside ${unsafe}: agents work there and could widen their own permissions`);
}
const { config, sources } = loadConfig({
  ...(userConfig ? { user: userConfig } : {}),
  project: join(root, "agentmom.config.json"),
  local: join(root, "agentmom.local.json"),
});

const dbPath = resolveInsideRoot(root, config.db.path);
const auditPath = resolveInsideRoot(root, config.audit.jsonlPath);
// Provider processes work in worktrees; the session token lives in a different tree, outside the repository and outside data/.
mkdirSync(stateDir, { recursive: true });
const worktreeRoot = resolveInsideRoot(stateDir, "worktrees");
const providerTmp = resolveInsideRoot(stateDir, "provider-tmp");
const tokenPath = resolveInsideRoot(stateDir, "token/session.token");
for (const dir of [dirname(dbPath), worktreeRoot, providerTmp, dirname(tokenPath)]) mkdirSync(dir, { recursive: true });

const db = openDb(dbPath);
// An existing database is never migrated without a verified snapshot first; if the snapshot cannot be made, the server does not start.
const backupRoot = resolve(process.env.AGENTMOM_BACKUP_DIR ?? join(root, "..", "agentmom-yedek"));
try {
  ensureBackupRoot(backupRoot, { repoRoot: root, stateDir });
  const pre = backupBeforeMigration({
    db,
    destRoot: backupRoot,
    repoRoot: root,
    stateDir,
    configFiles: [
      ...(userConfig ? [{ name: "user-config.json", path: userConfig }] : []),
      ...["agentmom.config.json", "agentmom.local.json"].filter((n) => existsSync(join(root, n))).map((n) => ({ name: n, path: join(root, n) })),
    ],
  });
  if (pre.backedUp) console.log(`pre-migration backup (verified): ${pre.dir} (pending migrations: ${pre.pending.join(", ")})`);
} catch (err) {
  console.error(`refusing to migrate: ${err instanceof BackupError ? `${err.code}: ${err.message}` : (err as Error).message}`);
  process.exit(1);
}
migrate(db);
const automation = new AutomationEngine(db);
const audit = new AuditLog([new SqliteAuditSink(db), new JsonlAuditSink(auditPath), automation]);
const auth = new AuthRegistry();
writeTokenFile(tokenPath, auth.userToken);
const registry = new ProviderRegistry(db);
registry.register(new ClaudeCodeAdapter({ tempDir: providerTmp }));
registry.register(new CodexAdapter({ tempDir: providerTmp }));
registry.register(new GeminiAdapter({ tempDir: providerTmp }));
const workflows = new WorkflowStore(db);
const verificationRoot = resolveInsideRoot(stateDir, "verification");
mkdirSync(verificationRoot, { recursive: true });
const engine = new WorkflowEngine({
  tasks: new TaskStore(db),
  audit,
  registry,
  evidence: new EvidenceStore(db),
  store: workflows,
  contract: config.policy.defaultContract,
  worktreeRoot,
  verify: { local: new LocalTestProvider(), browser: new BrowserProvider(), evidenceRoot: verificationRoot },
  repair: new RepairCoordinator(2),
});
// Kullanım-tabanlı DENETİMLİ yedek (uygulama içi; Windows Görev Zamanlayıcı/yönetici izni gerekmez). Kapanırken değişiklik varsa son bir yedek alır.
const scheduler = new BackupScheduler({
  db,
  audit,
  backupOptions: {
    destRoot: backupRoot,
    repoRoot: root,
    stateDir,
    configFiles: [
      ...(userConfig ? [{ name: "user-config.json", path: userConfig }] : []),
      ...["agentmom.config.json", "agentmom.local.json"].filter((n) => existsSync(join(root, n))).map((n) => ({ name: n, path: join(root, n) })),
    ],
  },
});
scheduler.start();
let closing = false;
function shutdown(): void {
  if (closing) return;
  closing = true;
  setTimeout(() => process.exit(0), 10_000).unref();
  void automationScheduler.stop().then(() => scheduler.close()).finally(() => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
const server = createApp({ db, dbPath, config, audit, auth, registry, engine, workflows, worktreeRoot, stateDir, evidenceRoot: verificationRoot, onQuit: shutdown, backup: scheduler, automation, secretRefs: () => new CredentialManagerStore().list() });

// Zaman tetikleyicili otomasyon kuralları (yalnız kullanıcının kurduğu; ADR-016): dakikada bir; createApp analiz çalıştırıcısını ve görev oluşturucuyu motora bağladıktan sonra başlar.
const automationScheduler = startScheduler(automation);

// Workflows left "running" by a previous process resume at their first unfinished step.
void engine.recoverAll().then((outs) => {
  if (outs.length) console.log(`resumed ${outs.length} interrupted workflow(s)`);
});

server.listen(config.server.port, HOST, () => {
  console.log(`agentmom listening on http://${HOST}:${config.server.port} (config: ${sources.join(" < ")}); session token file: ${tokenPath}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, shutdown);
