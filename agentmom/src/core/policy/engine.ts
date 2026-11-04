import { realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { ActionRequest, AutonomyContract, Decision } from "./types.ts";

// Windows 8.3 kısa adı (örn. SECRE~1): ad uzun adına açılamadıysa yasak klasör eşleşmesi kaçabilir; bu yüzden NATIVE çözümleme kullanılır ve açılamayan kısa ad reddedilir.
const SHORT_NAME = /(^|[\\/])[^\\/.]{1,6}~[0-9]+(\.[^\\/]{0,3})?([\\/]|$)/;
export function hasUnexpandedShortName(p: string): boolean {
  return process.platform === "win32" && SHORT_NAME.test(p);
}

const PATH_SCOPED = new Set(["file.read", "file.write", "shell.exec", "verification.run"]);

function deny(rule: string, reason: string): Decision {
  return { decision: "deny", rule, reason };
}

function needApproval(rule: string, reason: string): Decision {
  return { decision: "require_approval", rule, reason };
}

// Real location of a path, also for paths that do not exist yet: the nearest existing ancestor is resolved (links followed) and the rest appended.
export function canon(p: string): string {
  const abs = resolve(p);
  const rest: string[] = [];
  let cur = abs;
  for (;;) {
    try {
      return rest.length ? join(realpathSync.native(cur), ...rest.reverse()) : realpathSync.native(cur);
    } catch {
      const parent = dirname(cur);
      if (parent === cur) return abs;
      rest.push(cur.slice(parent.length).replace(/^[\\/]+/, ""));
      cur = parent;
    }
  }
}

export function isInsideReal(root: string, target: string): boolean {
  return isInside(canon(root), canon(target));
}

export function isInside(root: string, target: string): boolean {
  if (target.includes("\0") || root.includes("\0")) return false;
  const rel = relative(resolve(root), resolve(target));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

// Deterministic: same request, contract and clock always give the same decision. No model is consulted.
export function evaluate(req: ActionRequest, contract: AutonomyContract | undefined, now: Date): Decision {
  if (req.approval && req.approval.grantedBy !== "user") {
    return deny("agent_cannot_self_approve", "approval can only be granted by the user");
  }
  const userApproved = req.approval?.grantedBy === "user";

  if (req.action === "policy.grant") {
    if (req.actor.kind !== "user") {
      return deny("agent_cannot_self_grant", "only the user can change permissions or contracts");
    }
    return { decision: "allow", rule: "user_grant", reason: "permission change requested by the user" };
  }

  if (!contract) return deny("no_contract", "no autonomy contract applies");

  const expires = Date.parse(contract.expiresAt);
  if (Number.isNaN(expires) || now.getTime() >= expires) {
    return deny("contract_expired", "autonomy contract expired or has an invalid expiry");
  }

  // Kısa ad (8.3) çözülemediyse yol gerçek konumuna bağlanamaz: kapalı kal (fail-closed).
  if (req.target && hasUnexpandedShortName(canon(req.target))) return deny("path_short_name", "the target contains an unresolved Windows 8.3 short name");

  // A target inside a forbidden directory is refused, and so is a target that CONTAINS one (an ancestor such as the drive root),
  // because recursive actions on it would reach the forbidden area.
  if (req.target && contract.forbiddenDirs?.some((dir) => isInside(dir, req.target as string) || isInside(req.target as string, dir) || isInsideReal(dir, req.target as string) || isInsideReal(req.target as string, dir))) {
    return deny("path_forbidden", "the target is, or contains, a forbidden directory");
  }

  if (!contract.allowedActions.includes(req.action)) {
    return deny("action_not_allowed", `action ${req.action} is not in the contract`);
  }

  if (PATH_SCOPED.has(req.action)) {
    if (!req.target) return deny("target_required", "a target path is required for this action");
    if (!contract.allowedDirs.some((dir) => isInside(dir, req.target as string) && isInsideReal(dir, req.target as string))) {
      return deny("path_outside_scope", "target is outside the allowed directories");
    }
  }

  if (req.action === "provider.call" || req.action === "provider.switch") {
    const providerId = req.route?.providerId ?? req.provider;
    if (!providerId) return deny("provider_required", "a provider is required for this action");
    if (!contract.allowedProviders.includes(providerId)) {
      return deny("provider_not_allowed", `provider ${providerId} is not in the contract`);
    }
  }

  // Veri sınırı (madde 76): ret kuralıdır, hiçbir onay ya da izin gevşetemez.
  if (req.dataClass === "secret") {
    if (req.action === "network.request") return deny("data_boundary_secret", "secret data never leaves the machine through a network request");
    if ((req.action === "provider.call" || req.action === "provider.switch") && req.route?.kind !== "local") return deny("data_boundary_secret", "secret data may only go to a local route");
  }
  if (req.dataClass === "sensitive" && (req.action === "provider.call" || req.action === "provider.switch") && req.route?.kind === "api_paid") {
    return deny("data_boundary_sensitive", "sensitive data is never sent through a paid API route");
  }

  if (req.unconfinedRead) {
    const target = req.target;
    if (!target || !contract.trustedRepos.some((repo) => isInside(repo, target) && isInsideReal(repo, target))) {
      return deny("untrusted_repo_for_unconfined_provider", "this provider can read outside its workspace, so it only runs in repositories marked trusted");
    }
  }

  const paidApproved = contract.paidRoute === "approved" || (userApproved && req.approval?.paidRoute === true);
  if (req.action === "provider.switch" && req.route?.kind === "api_paid" && req.previousRoute?.kind !== "api_paid" && !paidApproved) {
    return deny("silent_paid_switch", "switching to a paid route requires explicit approval");
  }
  if (req.route?.kind === "api_paid") {
    if (!paidApproved) return needApproval("paid_route_needs_approval", "paid route needs explicit approval");
    if (req.costUsd === undefined) return needApproval("cost_unknown", "paid route with unknown cost needs approval");
  }

  if (req.costUsd !== undefined) {
    if (!Number.isFinite(req.costUsd) || req.costUsd < 0) return deny("invalid_cost", "cost must be a non-negative number");
    if (contract.budget.spentUsd + req.costUsd > contract.budget.maxUsd) {
      return deny("budget_exceeded", "request would exceed the contract budget");
    }
  }

  if (req.durationMs !== undefined && req.durationMs > contract.maxRuntimeMs) {
    return deny("runtime_exceeded", "requested duration exceeds the contract limit");
  }

  if (contract.approvalRequiredActions.includes(req.action) && !userApproved) {
    return needApproval("approval_required", `action ${req.action} needs user approval`);
  }

  return { decision: "allow", rule: "within_contract", reason: "request is within the autonomy contract" };
}
