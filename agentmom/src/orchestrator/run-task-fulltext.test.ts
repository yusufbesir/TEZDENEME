// startRun: tam yanıt (fullText) yalnız quietAudit koşularında ve SAYILAMAZ alan olarak döner (D8c-2b). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Sahte sağlayıcı (ScriptedAdapter ikizi) + gerçek SQLite + boş sandbox deposu. Model, ağ yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureAnalysisSandbox } from "../capabilities/model-runner.ts";
import { ModelAdapter, modelEnv } from "../testing/model-kit.ts";
import { startRun } from "./run-task.ts";
import type { RunInput } from "./run-task.ts";

const USER = { kind: "user" as const, id: "user" };
const RAW = '{"token": "sk-abcdefghijklmnopqrstuvwxyz123456", "x": 1}';

async function runOnce(extra: Partial<RunInput>) {
  const a = new ModelAdapter("claude-code", () => ({ summary: RAW, mimicCli: true }));
  const e = modelEnv("agentmom-fulltext-", [a]);
  const sb = await ensureAnalysisSandbox(e.stateDir);
  const req = { actor: USER, action: "provider.call" as const, route: { kind: "subscription" as const, providerId: "claude-code" } };
  const task = e.tasks.create({ title: "t", requestedAction: "provider.call", request: req, decision: "allow" });
  e.tasks.transition(task.id, "approved", USER);
  const started = await startRun(
    { tasks: e.tasks, audit: e.audit, registry: e.registry, evidence: e.evidence, contract: { ...e.contract, allowedDirs: [...e.contract.allowedDirs, sb.repoPath] }, worktreeRoot: sb.worktreeRoot },
    { taskId: task.id, providerId: "claude-code", repoPath: sb.repoPath, prompt: "p", timeoutMs: 20_000, readOnly: true, ...extra },
    USER,
  );
  return { out: await started.done, e, taskId: task.id };
}

test("quietAudit: fullText yalnız doğrudan okunur; JSON.stringify, Object.keys ve spread'de GÖRÜNMEZ; kanıt/denetime yazılmaz", async () => {
  const { out, e, taskId } = await runOnce({ quietAudit: true });
  assert.equal(out.status, "succeeded");
  assert.equal(out.fullText, RAW);
  assert.ok(!Object.keys(out).includes("fullText"));
  assert.ok(!JSON.stringify(out).includes("sk-abcdefghijkl") && !("fullText" in JSON.parse(JSON.stringify(out))));
  assert.equal(({ ...out } as { fullText?: string }).fullText, undefined);
  assert.equal(Object.getOwnPropertyDescriptor(out, "fullText")?.enumerable, false);
  assert.ok(!JSON.stringify(e.evidence.list(taskId)).includes("sk-abcdefghijkl"));
  // summary redakte kalır (diğer yollarla aynı davranış).
  assert.ok(!(out.summary ?? "").includes("sk-abcdefghijkl"));
});

test("quietAudit YOKSA fullText hiç döndürülmez", async () => {
  const { out } = await runOnce({});
  assert.equal(out.fullText, undefined);
  assert.ok(!("fullText" in out));
});
