// Model yeteneği testleri için ortak sahte sağlayıcı ve ortam (D8c-1). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Gerçek model çağrısı YOK: ScriptedAdapter'a "execute: kısmi" yetenek durumu ve alınan istekleri (sandbox dahil) kaydetme eklenir.
import { join } from "node:path";
import { AuditLog, SqliteAuditSink } from "../core/audit/audit.ts";
import { DEFAULT_CONFIG } from "../core/config/config.ts";
import { openDb } from "../core/db/db.ts";
import type { Db } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import type { AutonomyContract, RouteKind } from "../core/policy/types.ts";
import { TaskStore } from "../core/tasks/tasks.ts";
import { ModelRunnerState } from "../capabilities/model-runner.ts";
import type { ModelRunnerDeps } from "../capabilities/model-runner.ts";
import { providerSnapshots } from "../analysis/snapshot.ts";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { OPERATIONS } from "../providers/contract.ts";
import type { CapabilityDeclaration, ExecutionHandle, ExecutionRequest } from "../providers/contract.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { ScriptedAdapter } from "./scripted-adapter.ts";
import type { ScriptCall, ScriptStep } from "./scripted-adapter.ts";
import { mkTmp } from "./tmp.ts";

export class ModelAdapter extends ScriptedAdapter {
  readonly requests: ExecutionRequest[] = [];
  private readonly executeStatus: CapabilityDeclaration["status"];

  constructor(id: string, script: (call: ScriptCall) => ScriptStep, opts: { routeKind?: RouteKind; readScope?: "workspace" | "unconfined"; executeStatus?: CapabilityDeclaration["status"] } = {}) {
    super(id, script, { ...(opts.routeKind ? { routeKind: opts.routeKind } : {}), ...(opts.readScope ? { readScope: opts.readScope } : {}) });
    this.executeStatus = opts.executeStatus ?? "partial";
  }

  override describeCapabilities(): CapabilityDeclaration[] {
    return OPERATIONS.map((operation) => ({ operation, status: operation === "execute" ? this.executeStatus : "unverified", evidenceSource: "test", checkedAt: "2026-10-23T00:00:00.000Z" }));
  }

  override execute(request: ExecutionRequest): ExecutionHandle {
    this.requests.push(request);
    return super.execute(request);
  }
}

export interface ModelEnv {
  base: string;
  stateDir: string;
  db: Db;
  audit: AuditLog;
  tasks: TaskStore;
  evidence: EvidenceStore;
  registry: ProviderRegistry;
  contract: AutonomyContract;
  state: ModelRunnerState;
  deps: ModelRunnerDeps;
}

// Yetki: provider.call + file.read (yazma da sözleşmede VAR: salt-okunur sandbox'ın sözleşmeden bağımsız olduğunu kanıtlamak için).
export function modelEnv(prefix: string, adapters: ModelAdapter[], tweak: (c: AutonomyContract) => void = () => undefined): ModelEnv {
  const base = mkTmp(prefix);
  const stateDir = join(base, "state");
  const db = openDb(join(base, "model.db"));
  migrate(db);
  const audit = new AuditLog([new SqliteAuditSink(db)]);
  const registry = new ProviderRegistry(db);
  for (const a of adapters) registry.register(a);
  const contract: AutonomyContract = {
    ...structuredClone(DEFAULT_CONFIG.policy.defaultContract),
    allowedProviders: adapters.map((a) => a.id),
    allowedDirs: [base],
    allowedActions: ["task.create", "file.read", "file.write", "provider.call"],
    approvalRequiredActions: [],
  };
  tweak(contract);
  const tasks = new TaskStore(db);
  const evidence = new EvidenceStore(db);
  const state = new ModelRunnerState();
  const deps: ModelRunnerDeps = { tasks, audit, registry, evidence, contract, stateDir, snapshots: () => providerSnapshots(db, registry, contract), state };
  return { base, stateDir, db, audit, tasks, evidence, registry, contract, state, deps };
}
