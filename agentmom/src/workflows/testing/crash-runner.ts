// Child process used by the crash-recovery test: runs a workflow whose implement step hangs, so the parent can kill this process mid-step.
import { join } from "node:path";
import { AuditLog, SqliteAuditSink } from "../../core/audit/audit.ts";
import { openDb } from "../../core/db/db.ts";
import { TaskStore } from "../../core/tasks/tasks.ts";
import type { AutonomyContract } from "../../core/policy/types.ts";
import { EvidenceStore } from "../../orchestrator/evidence.ts";
import { ProviderRegistry } from "../../providers/registry.ts";
import { ScriptedAdapter } from "../../testing/scripted-adapter.ts";
import { WorkflowEngine } from "../engine.ts";
import { WorkflowStore } from "../store.ts";

const [dbPath, worktreeRoot, workflowId, contractJson] = process.argv.slice(2) as [string, string, string, string];
const contract = JSON.parse(contractJson) as AutonomyContract;
const db = openDb(dbPath);
const registry = new ProviderRegistry(db);
registry.register(new ScriptedAdapter("planner", () => ({ summary: "1. write src/a/greeting.txt" })));
registry.register(new ScriptedAdapter("coder", () => ({ hang: true })));
registry.register(new ScriptedAdapter("critic", () => ({ summary: "{}" })));
const engine = new WorkflowEngine({
  tasks: new TaskStore(db),
  audit: new AuditLog([new SqliteAuditSink(db)]),
  registry,
  evidence: new EvidenceStore(db),
  store: new WorkflowStore(db),
  contract,
  worktreeRoot: join(worktreeRoot),
});
console.log("child: started");
await engine.start(workflowId);
console.log("child: finished (unexpected in the crash test)");
