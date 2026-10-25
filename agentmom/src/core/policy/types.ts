export const ACTION_TYPES = [
  "file.read",
  "file.write",
  "shell.exec",
  // The ORCHESTRATOR runs the task's verification tests in an isolated worker. Separate from shell.exec, which is a shell for the agent itself.
  "verification.run",
  "network.request",
  "provider.call",
  "provider.switch",
  "task.create",
  "policy.grant",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export type ActorKind = "user" | "agent" | "system";
export type RouteKind = "subscription" | "api_paid" | "local";
// Veri sınıfı (madde 76): secret yalnız yerel rotada kalır, sensitive ücretli rotaya gitmez. Verilmezse kural uygulanmaz (bilinmeyen = engellenmez).
export type DataClass = "public" | "internal" | "sensitive" | "secret";

export interface Actor {
  kind: ActorKind;
  id: string;
}

export interface Route {
  kind: RouteKind;
  providerId: string;
}

export interface Approval {
  grantedBy: ActorKind;
  // Approval of a task or action is NOT approval to spend: a paid route needs this explicit flag (or a contract that approves it).
  paidRoute?: boolean;
}

export interface ActionRequest {
  actor: Actor;
  action: ActionType;
  target?: string;
  provider?: string;
  route?: Route;
  previousRoute?: Route;
  costUsd?: number;
  durationMs?: number;
  approval?: Approval;
  // The provider can read outside its working directory (no verified read confinement).
  unconfinedRead?: boolean;
  dataClass?: DataClass;
}

export interface AutonomyContract {
  id: string;
  allowedActions: ActionType[];
  allowedDirs: string[];
  allowedProviders: string[];
  // Repositories where providers with unconfined reads may run. Empty means none.
  trustedRepos: string[];
  // Hard no-go areas for every provider and action, checked before anything else about a path (e.g. an archive). Layers can add, never remove.
  forbiddenDirs?: string[];
  // Duyarlı veri klasörleri (madde 76): buradaki veri ücretli (API) rotaya gönderilmez. Katmanlar ekleyebilir, çıkaramaz.
  sensitiveDirs?: string[];
  budget: { maxUsd: number; spentUsd: number };
  expiresAt: string;
  maxRuntimeMs: number;
  approvalRequiredActions: ActionType[];
  paidRoute: "none" | "approved";
}

export type DecisionKind = "allow" | "deny" | "require_approval";

export interface Decision {
  decision: DecisionKind;
  rule: string;
  reason: string;
}
