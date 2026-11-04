import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { mkTmp } from "../../testing/tmp.ts";
import { DEFAULT_CONFIG } from "../config/config.ts";
import { evaluate, hasUnexpandedShortName, isInside } from "./engine.ts";
import type { ActionRequest, AutonomyContract } from "./types.ts";

const NOW = new Date("2026-10-21T12:00:00Z");
const ROOT = resolve("D:/work/proj");

function contract(over: Partial<AutonomyContract> = {}): AutonomyContract {
  return {
    id: "c1",
    allowedActions: ["file.read", "file.write", "shell.exec", "provider.call", "provider.switch", "task.create"],
    allowedDirs: [ROOT],
    allowedProviders: ["claude", "ollama", "openai"],
    trustedRepos: [],
    budget: { maxUsd: 5, spentUsd: 1 },
    expiresAt: "2026-10-22T00:00:00Z",
    maxRuntimeMs: 60_000,
    approvalRequiredActions: ["shell.exec"],
    paidRoute: "none",
    ...over,
  };
}

const agent = { kind: "agent", id: "a1" } as const;
const user = { kind: "user", id: "yusuf" } as const;

function req(over: Partial<ActionRequest>): ActionRequest {
  return { actor: agent, action: "file.read", target: resolve(ROOT, "a.txt"), ...over };
}

test("allows an action inside the contract", () => {
  assert.equal(evaluate(req({}), contract(), NOW).decision, "allow");
});

test("denies when there is no contract", () => {
  const d = evaluate(req({}), undefined, NOW);
  assert.equal(d.decision, "deny");
  assert.equal(d.rule, "no_contract");
});

test("denies an expired contract and an invalid expiry", () => {
  assert.equal(evaluate(req({}), contract({ expiresAt: "2026-10-21T12:00:00Z" }), NOW).rule, "contract_expired");
  assert.equal(evaluate(req({}), contract({ expiresAt: "not-a-date" }), NOW).rule, "contract_expired");
});

test("denies actions missing from the contract", () => {
  assert.equal(evaluate(req({ action: "network.request" }), contract(), NOW).rule, "action_not_allowed");
});

test("denies paths outside allowed dirs, including traversal and prefix tricks", () => {
  assert.equal(evaluate(req({ target: resolve("D:/other/x") }), contract(), NOW).rule, "path_outside_scope");
  assert.equal(evaluate(req({ target: ROOT + "/../secret.txt" }), contract(), NOW).rule, "path_outside_scope");
  assert.equal(isInside(ROOT, ROOT + "-evil/x"), false);
  assert.equal(isInside(ROOT, ROOT), true);
  assert.equal(evaluate(req({ target: undefined }), contract(), NOW).rule, "target_required");
});

test("shell.exec requires approval, and a user approval clears it", () => {
  assert.equal(evaluate(req({ action: "shell.exec" }), contract(), NOW).decision, "require_approval");
  const ok = evaluate(req({ action: "shell.exec", approval: { grantedBy: "user" } }), contract(), NOW);
  assert.equal(ok.decision, "allow");
});

test("an agent cannot grant itself permissions", () => {
  const d = evaluate({ actor: agent, action: "policy.grant" }, contract(), NOW);
  assert.equal(d.decision, "deny");
  assert.equal(d.rule, "agent_cannot_self_grant");
  assert.equal(evaluate({ actor: user, action: "policy.grant" }, contract(), NOW).decision, "allow");
});

test("an agent cannot approve its own request", () => {
  const d = evaluate(req({ action: "shell.exec", approval: { grantedBy: "agent" } }), contract(), NOW);
  assert.equal(d.decision, "deny");
  assert.equal(d.rule, "agent_cannot_self_approve");
});

test("provider must be in the contract", () => {
  const route = { kind: "local", providerId: "mystery" } as const;
  assert.equal(evaluate(req({ action: "provider.call", target: undefined, route }), contract(), NOW).rule, "provider_not_allowed");
});

test("silent switch from a free route to a paid route is denied without approval", () => {
  const d = evaluate(
    req({
      action: "provider.switch",
      target: undefined,
      previousRoute: { kind: "subscription", providerId: "claude" },
      route: { kind: "api_paid", providerId: "openai" },
      costUsd: 0.1,
    }),
    contract(),
    NOW,
  );
  assert.equal(d.decision, "deny");
  assert.equal(d.rule, "silent_paid_switch");
});

test("a direct paid-route call without approval is not allowed", () => {
  const d = evaluate(
    req({ action: "provider.call", target: undefined, route: { kind: "api_paid", providerId: "openai" }, costUsd: 0.1 }),
    contract(),
    NOW,
  );
  assert.equal(d.decision, "require_approval");
  assert.equal(d.rule, "paid_route_needs_approval");
});

test("approved paid route: unknown cost needs approval, known cost within budget is allowed, over budget is denied", () => {
  const base = { action: "provider.call", target: undefined, route: { kind: "api_paid", providerId: "openai" } } as const;
  const c = contract({ paidRoute: "approved" });
  assert.equal(evaluate(req({ ...base }), c, NOW).rule, "cost_unknown");
  assert.equal(evaluate(req({ ...base, costUsd: 2 }), c, NOW).decision, "allow");
  assert.equal(evaluate(req({ ...base, costUsd: 4.5 }), c, NOW).rule, "budget_exceeded");
});

test("rejects negative or non-finite cost and over-long runtime", () => {
  assert.equal(evaluate(req({ costUsd: -1 }), contract(), NOW).rule, "invalid_cost");
  assert.equal(evaluate(req({ costUsd: Number.NaN }), contract(), NOW).rule, "invalid_cost");
  assert.equal(evaluate(req({ durationMs: 120_000 }), contract(), NOW).rule, "runtime_exceeded");
});

test("is deterministic", () => {
  const r = req({ action: "shell.exec" });
  assert.deepEqual(evaluate(r, contract(), NOW), evaluate(r, contract(), NOW));
});

test("providers with unconfined reads only run in trusted repositories", () => {
  const route = { kind: "subscription", providerId: "claude" } as const;
  const trusted = resolve(ROOT, "trusted");
  const base = { action: "provider.call", route, unconfinedRead: true } as const;
  const c = contract({ trustedRepos: [trusted] });
  assert.equal(evaluate(req({ ...base, target: trusted }), c, NOW).decision, "allow");
  assert.equal(evaluate(req({ ...base, target: resolve(trusted, "sub") }), c, NOW).decision, "allow");
  assert.equal(evaluate(req({ ...base, target: resolve(ROOT, "other") }), c, NOW).rule, "untrusted_repo_for_unconfined_provider");
  assert.equal(evaluate(req({ ...base, target: trusted + "-evil" }), c, NOW).rule, "untrusted_repo_for_unconfined_provider");
  assert.equal(evaluate(req({ ...base, target: undefined }), c, NOW).rule, "untrusted_repo_for_unconfined_provider");
  assert.equal(evaluate(req({ ...base, target: trusted }), contract(), NOW).rule, "untrusted_repo_for_unconfined_provider", "no trusted repos means none");
  const confined = { action: "provider.call", route, target: resolve(ROOT, "other") } as const;
  assert.equal(evaluate(req(confined), contract(), NOW).decision, "allow", "confined providers are not affected");
});

test("approving a task does not approve a paid route; only an explicit paid-route approval does", () => {
  const paid = { action: "provider.call", route: { kind: "api_paid", providerId: "openai" }, costUsd: 0.5 } as const;
  assert.equal(evaluate(req({ ...paid, approval: { grantedBy: "user" } }), contract(), NOW).rule, "paid_route_needs_approval");
  const sw = {
    action: "provider.switch",
    previousRoute: { kind: "subscription", providerId: "claude" },
    route: { kind: "api_paid", providerId: "openai" },
    costUsd: 0.5,
  } as const;
  assert.equal(evaluate(req({ ...sw, approval: { grantedBy: "user" } }), contract(), NOW).rule, "silent_paid_switch");
  assert.equal(evaluate(req({ ...paid, approval: { grantedBy: "user", paidRoute: true } }), contract(), NOW).decision, "allow");
  assert.equal(evaluate(req({ ...sw, approval: { grantedBy: "user", paidRoute: true } }), contract(), NOW).decision, "allow");
  assert.equal(evaluate(req({ ...paid, approval: { grantedBy: "agent", paidRoute: true } }), contract(), NOW).rule, "agent_cannot_self_approve");
});

test("forbidden directories beat every allow rule, for every action and provider", () => {
  const archive = resolve("D:/Arsiv-test");
  const c = contract({ allowedDirs: [resolve("D:/")], trustedRepos: [resolve("D:/")], forbiddenDirs: [archive] });
  for (const action of ["file.read", "file.write", "shell.exec"] as const) {
    assert.equal(evaluate(req({ action, target: resolve(archive, "doc.txt"), approval: { grantedBy: "user" } }), c, NOW).rule, "path_forbidden", action);
  }
  const route = { kind: "subscription", providerId: "claude" } as const;
  assert.equal(evaluate(req({ action: "provider.call", route, target: resolve(archive, "repo"), unconfinedRead: true }), c, NOW).rule, "path_forbidden");
  assert.equal(evaluate(req({ action: "file.read", target: resolve(archive + "-other", "a.txt") }), c, NOW).decision, "allow", "a sibling with the same prefix is not forbidden");
  assert.equal(evaluate(req({ action: "file.read", target: resolve("D:/work/proj/a.txt") }), c, NOW).decision, "allow");
});

test("forbidden directories also refuse an ancestor target that would contain them", () => {
  const c = contract({ allowedDirs: [resolve("D:/")], forbiddenDirs: [resolve("D:/Arsiv-test")] });
  assert.equal(evaluate(req({ action: "file.read", target: resolve("D:/") }), c, NOW).rule, "path_forbidden");
  assert.equal(evaluate(req({ action: "shell.exec", target: resolve("D:/"), approval: { grantedBy: "user" } }), c, NOW).rule, "path_forbidden");
  assert.equal(evaluate(req({ action: "file.read", target: resolve("D:/other") }), c, NOW).decision, "allow");
});

test("directory rules use real locations: a junction inside an allowed directory cannot lead outside it or into a forbidden one", () => {
  const base = mkTmp("agentmom-pol-");
  const allowed = join(base, "allowed");
  const outside = join(base, "outside");
  const forbidden = join(base, "forbidden");
  for (const d of [allowed, outside, forbidden]) mkdirSync(d);
  symlinkSync(outside, join(allowed, "to-outside"), "junction");
  symlinkSync(forbidden, join(allowed, "to-forbidden"), "junction");
  const c = contract({ allowedDirs: [allowed], trustedRepos: [allowed], forbiddenDirs: [forbidden] });
  assert.equal(evaluate(req({ target: join(allowed, "plain", "x.txt") }), c, NOW).decision, "allow", "a path that does not exist yet inside the allowed dir is fine");
  assert.equal(evaluate(req({ target: join(allowed, "to-outside", "x.txt") }), c, NOW).rule, "path_outside_scope");
  assert.equal(evaluate(req({ target: join(allowed, "to-forbidden", "x.txt") }), c, NOW).rule, "path_forbidden");
  const route = { kind: "subscription", providerId: "claude" } as const;
  assert.equal(evaluate(req({ action: "provider.call", route, target: join(allowed, "to-outside"), unconfinedRead: true }), c, NOW).rule, "untrusted_repo_for_unconfined_provider");
});

test("Windows 8.3 short names: an unresolved short name is refused (fail-closed); resolvable long names are untouched; native realpath is used", () => {
  assert.equal(hasUnexpandedShortName("C:/proj/SECRE~1/anahtar.txt"), process.platform === "win32");
  assert.equal(hasUnexpandedShortName("C:/proj/PROGRA~1"), process.platform === "win32");
  assert.equal(hasUnexpandedShortName("C:/proj/uzun-klasor-adi/a.txt"), false);
  assert.equal(hasUnexpandedShortName("C:/proj/a~b/x"), false, "tilde not followed by digits is a normal name");
  if (process.platform !== "win32") return;
  const base = mkTmp("agentmom-83-");
  const contract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedActions: ["file.read" as const], allowedDirs: [base], forbiddenDirs: [join(base, "gizli-uzun-klasor")] };
  const d = evaluate({ actor: { kind: "agent", id: "a" }, action: "file.read", target: join(base, "GIZLI-~1", "x.txt") }, contract, new Date("2026-10-23T10:00:00Z"));
  assert.equal(d.decision, "deny");
  assert.equal(d.rule, "path_short_name");
  assert.equal(evaluate({ actor: { kind: "agent", id: "a" }, action: "file.read", target: join(base, "normal", "x.txt") }, contract, new Date("2026-10-23T10:00:00Z")).decision, "allow");
});
