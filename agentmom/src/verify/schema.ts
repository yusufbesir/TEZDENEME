// Common verification result schema (versioned). Every verification provider (local tests, browser, later others) maps into this shape
// while keeping its own raw evidence: providerData and the evidence files are never dropped.
export const VERIFY_SCHEMA_VERSION = 1;

export const OUTCOMES = ["passed", "failed", "skipped", "error"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const CLASSIFICATIONS = ["product_defect", "environment", "flaky", "infra"] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const RUN_STATUSES = ["passed", "failed", "error", "timed_out", "cancelled"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const EVIDENCE_KINDS = ["log", "screenshot", "report", "trace"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  summary: string;
  // Files live under the evidence directory on D:. sha256 and bytes let a later reader prove the file was not altered.
  path?: string;
  sha256?: string;
  bytes?: number;
}

export interface TestResult {
  id: string;
  suite: string | null;
  name: string;
  outcome: Outcome;
  durationMs: number;
  error: { message: string; detail?: string } | null;
  // Acceptance criterion ids this test claims to cover (from [ac:<id>] tags in the name or an explicit mapping).
  criteria: string[];
  // Present only for failed/error tests.
  classification: Classification | null;
  evidenceRefs: string[];
  attempts: number;
}

export interface RunResult {
  schemaVersion: typeof VERIFY_SCHEMA_VERSION;
  runId: string;
  provider: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: RunStatus;
  tests: TestResult[];
  evidence: EvidenceItem[];
  totals: { passed: number; failed: number; skipped: number; error: number };
  environment: { node: string; platform: string };
  // Provider-specific raw data, redacted and size-capped, kept alongside the common fields.
  providerData: Record<string, unknown>;
}

export class SchemaError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`invalid verification result: ${problems.join("; ")}`);
    this.name = "SchemaError";
    this.problems = problems;
  }
}

function obj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function totalsOf(tests: TestResult[]): RunResult["totals"] {
  const t = { passed: 0, failed: 0, skipped: 0, error: 0 };
  for (const x of tests) t[x.outcome]++;
  return t;
}

export function validateRunResult(input: unknown): RunResult {
  const problems: string[] = [];
  if (!obj(input)) throw new SchemaError(["result must be an object"]);
  if (input.schemaVersion !== VERIFY_SCHEMA_VERSION) problems.push(`schemaVersion must be ${VERIFY_SCHEMA_VERSION}`);
  for (const k of ["runId", "provider", "startedAt", "endedAt"]) if (typeof input[k] !== "string" || !input[k]) problems.push(`${k} is required`);
  if (typeof input.durationMs !== "number" || input.durationMs < 0) problems.push("durationMs must be a non-negative number");
  if (!(RUN_STATUSES as readonly string[]).includes(input.status as string)) problems.push("status is invalid");
  if (!Array.isArray(input.tests)) problems.push("tests must be an array");
  if (!Array.isArray(input.evidence)) problems.push("evidence must be an array");
  if (!obj(input.providerData)) problems.push("providerData must be an object");
  if (!obj(input.environment)) problems.push("environment is required");
  const evidenceIds = new Set<string>();
  if (Array.isArray(input.evidence)) {
    for (const [i, e] of input.evidence.entries()) {
      if (!obj(e) || typeof e.id !== "string" || !(EVIDENCE_KINDS as readonly string[]).includes(e.kind as string) || typeof e.summary !== "string") problems.push(`evidence[${i}] is malformed`);
      else {
        if (evidenceIds.has(e.id)) problems.push(`duplicate evidence id ${e.id}`);
        evidenceIds.add(e.id);
      }
    }
  }
  const testIds = new Set<string>();
  if (Array.isArray(input.tests)) {
    for (const [i, t] of input.tests.entries()) {
      if (!obj(t)) {
        problems.push(`tests[${i}] must be an object`);
        continue;
      }
      if (typeof t.id !== "string" || !t.id) problems.push(`tests[${i}].id is required`);
      else if (testIds.has(t.id)) problems.push(`duplicate test id ${t.id}`);
      else testIds.add(t.id);
      if (!(OUTCOMES as readonly string[]).includes(t.outcome as string)) problems.push(`tests[${i}].outcome is invalid`);
      if (!Array.isArray(t.criteria) || !t.criteria.every((c) => typeof c === "string")) problems.push(`tests[${i}].criteria must be a string array`);
      const failing = t.outcome === "failed" || t.outcome === "error";
      if (failing && !CLASSIFICATIONS.includes(t.classification as Classification)) problems.push(`tests[${i}] failed without a classification`);
      if (!failing && t.classification !== null) problems.push(`tests[${i}] has a classification but did not fail`);
      if (failing && !obj(t.error)) problems.push(`tests[${i}] failed without an error`);
      if (Array.isArray(t.evidenceRefs)) for (const r of t.evidenceRefs) if (!evidenceIds.has(r as string)) problems.push(`tests[${i}] references unknown evidence ${String(r)}`);
    }
  }
  if (problems.length) throw new SchemaError(problems);
  return input as unknown as RunResult;
}
