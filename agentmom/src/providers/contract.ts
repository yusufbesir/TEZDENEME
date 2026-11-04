import type { RouteKind } from "../core/policy/types.ts";

export const CONTRACT_VERSION = "1";

export const OPERATIONS = [
  "describeCapabilities",
  "validateConfiguration",
  "testConnection",
  "execute",
  "streamEvents",
  "getStatus",
  "cancel",
  "collectEvidence",
  "getUsage",
  "dispose",
] as const;
export type Operation = (typeof OPERATIONS)[number];

export const CAPABILITY_STATUSES = ["verified", "partial", "unverified", "unsupported", "unavailable"] as const;
export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

export interface CapabilityDeclaration {
  operation: Operation;
  status: CapabilityStatus;
  evidenceSource: string;
  checkedAt: string;
}

export class CapabilityError extends Error {
  readonly code = "capability_unsupported";
  readonly providerId: string;
  readonly operation: Operation;
  readonly status: CapabilityStatus;

  constructor(providerId: string, operation: Operation, status: CapabilityStatus = "unsupported", detail?: string) {
    super(`provider ${providerId} does not support ${operation} (${status})${detail ? `: ${detail}` : ""}`);
    this.name = "CapabilityError";
    this.providerId = providerId;
    this.operation = operation;
    this.status = status;
  }
}

export type ErrorCode =
  | "auth_required"
  | "rate_limited"
  | "network"
  | "timeout"
  | "cancelled"
  | "malformed_output"
  | "output_limit"
  | "process_failed"
  | "unavailable";

export interface ProviderError {
  code: ErrorCode;
  message: string;
}

// Missing data is null, never zero: an unreported cost must not look free.
export interface Usage {
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  // "list" = list-price equivalent reported by the CLI; on a subscription route this is NOT an amount that was charged.
  costBasis?: "list" | "billed" | null;
  source: "reported" | "estimated" | "unknown";
}

export const UNKNOWN_USAGE: Usage = { inputTokens: null, outputTokens: null, costUsd: null, source: "unknown" };

export interface PermissionRequest {
  tool: string;
  summary: string;
}

export const EVENT_TYPES = ["started", "message", "tool_use", "tool_result", "permission_request", "usage", "error", "completed"] as const;
export type ProviderEventType = (typeof EVENT_TYPES)[number];

export interface ProviderEvent {
  type: ProviderEventType;
  ts: string;
  data: Record<string, unknown>;
}

export interface SandboxPolicy {
  permission: "read_only" | "workspace_write";
  allowedTools: string[];
}

export interface ExecutionRequest {
  taskId: string;
  prompt: string;
  cwd: string;
  sandbox: SandboxPolicy;
  timeoutMs: number;
  maxOutputBytes?: number;
  model?: string;
}

export type ExecutionStatus = "running" | "succeeded" | "failed" | "cancelled" | "timed_out";

export interface ExecutionResult {
  executionId: string;
  status: Exclude<ExecutionStatus, "running">;
  exitCode: number | null;
  summary: string;
  // Yalnız bellek içi: başarılı koşuda sağlayıcının tam yanıtı (en çok 64 KB, redakte edilmemiş). Kanıta/denetime yazılmaz; yalnız yapılandırılmış çıktı ayrıştıran çağıran kullanır.
  fullText?: string;
  error?: ProviderError;
  usage: Usage;
  eventCount: number;
}

export interface ExecutionHandle {
  executionId: string;
  result: Promise<ExecutionResult>;
}

export interface ConfigReport {
  ok: boolean;
  problems: string[];
}

export interface ConnectionReport {
  reachable: boolean;
  authenticated: boolean | null;
  version: string | null;
  detail: string;
  checkedAt: string;
}

export interface Evidence {
  executionId: string;
  status: ExecutionStatus;
  exitCode: number | null;
  outputTail: string;
  eventCount: number;
  startedAt: string;
  endedAt: string | null;
}

export interface ProviderAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly routeKind: RouteKind;
  readonly contractVersion: string;
  // "unconfined" = may read files outside its working directory; such providers only run in trusted repositories.
  readonly readScope?: "workspace" | "unconfined";
  describeCapabilities(): CapabilityDeclaration[];
  validateConfiguration(): ConfigReport;
  testConnection(): Promise<ConnectionReport>;
  execute(request: ExecutionRequest): ExecutionHandle;
  streamEvents(executionId: string): AsyncIterable<ProviderEvent>;
  getStatus(executionId: string): ExecutionStatus;
  cancel(executionId: string): Promise<void>;
  collectEvidence(executionId: string): Evidence;
  getUsage(executionId: string): Usage;
  dispose(): Promise<void>;
  // Returns a reason when this provider cannot enforce the given sandbox exactly; the orchestrator then refuses to start.
  checkSandbox?(sandbox: SandboxPolicy): string | null;
}

// Calls go through this guard: an operation declared unsupported or unavailable fails loudly, never with a fake success.
export function assertSupported(adapter: ProviderAdapter, operation: Operation): void {
  const declared = adapter.describeCapabilities().find((c) => c.operation === operation);
  if (!declared) throw new CapabilityError(adapter.id, operation, "unsupported");
  if (declared.status === "unsupported" || declared.status === "unavailable") throw new CapabilityError(adapter.id, operation, declared.status);
}
