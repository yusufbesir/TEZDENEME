// Risk değerlendirmesi testleri (madde 11, D5a). Yazan: Claude [İP:AgentMom D5a]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Saf işlev: dosya sistemi kullanılmaz, yollar yalnız metindir (var olmaları gerekmez).
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, parse, resolve } from "node:path";
import { ACTION_BASE, assessRisk, assessTaskRequest, levelFor } from "./risk.ts";
import { ACTION_TYPES } from "./types.ts";
import type { RiskInput } from "./risk.ts";

const ROOT = resolve("risk-kok-yok");
const ALLOWED = join(ROOT, "Projeler");
const FORBIDDEN = join(ROOT, "HAFIZAM1", "anahtarlar");
const contract: RiskInput["contract"] = {
  allowedDirs: [ALLOWED],
  allowedActions: ["file.read", "file.write", "shell.exec", "verification.run", "provider.call", "task.create"],
  allowedProviders: ["claude-code"],
  trustedRepos: [join(ALLOWED, "agentmom")],
  forbiddenDirs: [FORBIDDEN],
  paidRoute: "none",
};

test("thresholds: 0-24 low, 25-49 medium, 50-74 high, 75+ critical", () => {
  assert.deepEqual([0, 24, 25, 49, 50, 74, 75, 100].map(levelFor), ["low", "low", "medium", "medium", "high", "high", "critical", "critical"]);
});

test("every policy action has a base score", () => {
  for (const a of ACTION_TYPES) assert.ok(typeof ACTION_BASE[a] === "number", a);
});

test("file.read inside the allowed folder is low; deterministic for the same input", () => {
  const input = { action: "file.read", target: join(ALLOWED, "agentmom", "src", "x.ts"), contract };
  const a = assessRisk(input);
  assert.equal(a.level, "low");
  assert.deepEqual(assessRisk(input), a);
  assert.ok(a.reasons.every((r) => typeof r === "string" && r.length > 0));
});

test("shell.exec with a delete command and dynamic construct is critical, with Turkish reasons", () => {
  const a = assessRisk({ action: "shell.exec", target: join(ALLOWED, "agentmom"), command: "Remove-Item -Recurse $(Get-Location)", contract });
  assert.equal(a.level, "critical");
  assert.ok(a.score >= 75 && a.score <= 100);
  assert.ok(a.reasons.some((r) => /silme/.test(r)));
  assert.ok(a.reasons.some((r) => /dinamik/.test(r)));
  assert.ok(a.reasons.some((r) => /geri alınamaz/.test(r)));
  assert.ok(a.reasons.some((r) => /depo\/izinli kök/.test(r)), "repo root generality");
});

test("target outside allowed folders, in or near a forbidden folder, config/script/hook files raise the score", () => {
  const inside = assessRisk({ action: "file.write", target: join(ALLOWED, "a.txt"), contract }).score;
  const outside = assessRisk({ action: "file.write", target: join(ROOT, "baska", "a.txt"), contract });
  assert.ok(outside.score > inside && outside.reasons.some((r) => /izinli klasörlerin dışında/.test(r)));
  const forb = assessRisk({ action: "file.read", target: join(FORBIDDEN, "k.txt"), contract });
  assert.ok(forb.reasons.some((r) => /yasak bir klasörün içinde/.test(r)));
  const near = assessRisk({ action: "file.read", target: join(ROOT, "HAFIZAM1", "kasa"), contract });
  assert.ok(near.reasons.some((r) => /yasak bir klasöre yakın/.test(r)));
  for (const f of ["deploy.ps1", "run.bat", "x.sh", "y.cmd", "package.json", "conf.json", join(".git", "config"), join(".git", "hooks", "pre-commit"), "user-config.json"]) {
    const r = assessRisk({ action: "file.write", target: join(ALLOWED, "agentmom", f), contract });
    assert.ok(r.reasons.some((x) => /yapılandırma\/betik\/kanca/.test(x)), f);
    assert.ok(r.score > inside, f);
  }
  const drive = assessRisk({ action: "file.write", target: parse(ROOT).root, contract });
  assert.ok(drive.reasons.some((r) => /sürücü kökü/.test(r)));
});

test("paid route adds risk; more when the contract has not approved paid routes", () => {
  const free = assessRisk({ action: "provider.call", provider: "claude-code", routeKind: "subscription", contract }).score;
  const paid = assessRisk({ action: "provider.call", provider: "claude-code", routeKind: "api_paid", contract });
  const approved = assessRisk({ action: "provider.call", provider: "claude-code", routeKind: "api_paid", contract: { ...(contract as NonNullable<RiskInput["contract"]>), paidRoute: "approved" } });
  assert.ok(paid.score > approved.score && approved.score > free);
  assert.ok(paid.reasons.some((r) => /ücretli rota/.test(r)));
  const foreign = assessRisk({ action: "provider.call", provider: "baska", contract });
  assert.ok(foreign.reasons.some((r) => /sağlayıcı sözleşmede yok/.test(r)));
});

test("policy.grant and network.request start high; unknown actions are not invented as safe", () => {
  assert.equal(assessRisk({ action: "policy.grant", contract }).level, "high");
  assert.ok(["high", "critical"].includes(assessRisk({ action: "network.request", target: "https://ornek.invalid", contract }).level));
  const u = assessRisk({ action: "garip.eylem", contract });
  assert.ok(u.score >= 25 && u.reasons[0]?.startsWith("bilinmeyen eylem"));
});

test("assessTaskRequest reads only stored fields and tolerates an empty request", () => {
  assert.equal(assessTaskRequest("file.read", {}, contract).level, "low");
  assert.equal(assessTaskRequest("file.read", null, undefined).level, "low");
  const t = assessTaskRequest("provider.call", { route: { kind: "api_paid", providerId: "claude-code" }, costUsd: 1 }, contract);
  assert.ok(t.reasons.some((r) => /ücretli rota/.test(r)));
});
