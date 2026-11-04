import { redactString } from "../core/audit/redact.ts";
import { auditEvidence } from "./completeness.ts";
import type { Completeness } from "./completeness.ts";
import type { Classification, RunResult } from "./schema.ts";
import { traceCriteria, worstStatus } from "./trace.ts";
import type { CriterionTrace } from "./trace.ts";

export interface ReviewVerdict {
  approved: boolean;
  criteria: Array<{ id: string; met: boolean; note?: string }>;
}

export interface FirstFailure {
  source: "test" | "review";
  runId: string | null;
  testId: string | null;
  name: string;
  criteria: string[];
  classification: Classification | null;
  message: string;
}

export interface DeliveryReport {
  schemaVersion: 1;
  // passed: every criterion verified by mapped, passing, evidence-backed tests AND the reviewer approved.
  // failed: a criterion is demonstrably not met (product defect or reviewer rejection).
  // unverified: nothing is proven wrong, but not everything is proven right (weak mapping, flaky, environment/infra problems, missing evidence).
  verdict: "passed" | "failed" | "unverified";
  reasons: string[];
  criteria: CriterionTrace[];
  unknownReferences: Array<{ testId: string; criterion: string }>;
  warnings: string[];
  selfAuthoredTests: string[];
  completeness: Completeness;
  review: { present: boolean; approved: boolean | null };
  firstFailure: FirstFailure | null;
  runs: Array<{ runId: string; provider: string; status: string; totals: RunResult["totals"] }>;
  generatedAt: string;
}

export interface DeliveryInput {
  criteria: Array<{ id: string; text: string }>;
  runs: RunResult[];
  review: ReviewVerdict | null;
  expectedProviders?: string[];
  requireReview?: boolean;
  // Plan test files that the implementer wrote or changed, and whether such tests may count as proof.
  selfAuthoredTests?: string[];
  requireTrustedTests?: boolean;
  now?: () => Date;
}

// The independent delivery auditor: a pure function over raw results and evidence files. It never sees what the implementer or reviewer
// claimed about the code; it re-validates the schema, re-hashes evidence and decides only from the proof.
export function auditDelivery(input: DeliveryInput): DeliveryReport {
  const completeness = auditEvidence(input.runs, input.expectedProviders ?? []);
  const trace = traceCriteria(input.criteria, input.runs);
  const reasons: string[] = [];
  let failed = false;
  let unverified = false;

  for (const c of trace.criteria) {
    if (c.status === "failed") (failed = true), reasons.push(`criterion ${c.id}: ${c.reason}`);
    else if (c.status !== "verified") (unverified = true), reasons.push(`criterion ${c.id} is not verified (${c.status}): ${c.reason}`);
  }
  const warnings: string[] = [];
  if (trace.stuffedTests.length) (unverified = true), reasons.push(`${trace.stuffedTests.length} test(s) claim more than the allowed number of criteria and were ignored: ${trace.stuffedTests.slice(0, 3).join(", ")}`);
  const self = input.selfAuthoredTests ?? [];
  if (self.length && input.requireTrustedTests) (unverified = true), reasons.push(`the implementer wrote or changed the verification test file(s) (${self.slice(0, 3).join(", ")}); tests the implementer controls do not count as proof here`);
  else if (self.length) warnings.push(`the verification test file(s) were written or changed by the implementer: ${self.slice(0, 3).join(", ")}; a green result shows consistency, not independent proof`);
  if (trace.unknownReferences.length) (unverified = true), reasons.push(`${trace.unknownReferences.length} test reference(s) to criteria that do not exist: ${trace.unknownReferences.slice(0, 5).map((u) => `${u.testId}->${u.criterion}`).join(", ")}`);
  if (!completeness.complete) (unverified = true), reasons.push(...completeness.problems.slice(0, 10).map((p) => `evidence: ${p}`));

  const review = { present: input.review !== null, approved: input.review ? input.review.approved : null };
  if (input.requireReview !== false && !input.review) (unverified = true), reasons.push("no independent review verdict");
  if (input.review) {
    if (!input.review.approved) (failed = true), reasons.push("the independent reviewer did not approve");
    for (const c of input.criteria) {
      const v = input.review.criteria.find((x) => x.id === c.id);
      if (!v) (unverified = true), reasons.push(`the reviewer did not rate criterion ${c.id}`);
      else if (!v.met) (failed = true), reasons.push(`the reviewer judged criterion ${c.id} not met`);
    }
  }

  const verdict = failed ? "failed" : unverified || input.runs.length === 0 ? "unverified" : "passed";
  if (verdict === "passed") reasons.push("all criteria are verified by mapped passing tests with intact evidence, and the reviewer approved");
  return {
    schemaVersion: 1,
    verdict,
    reasons: reasons.map((r) => redactString(r).slice(0, 400)),
    criteria: trace.criteria,
    unknownReferences: trace.unknownReferences,
    warnings,
    selfAuthoredTests: self,
    completeness,
    review,
    firstFailure: firstFailure(input),
    runs: input.runs.map((r) => ({ runId: r.runId, provider: r.provider, status: r.status, totals: r.totals })),
    generatedAt: (input.now ?? (() => new Date()))().toISOString(),
  };
}

// Only the first product defect is ever sent back for repair; failures that are not code defects are never "repaired".
function firstFailure(input: DeliveryInput): FirstFailure | null {
  for (const r of input.runs) {
    for (const t of r.tests) {
      if ((t.outcome === "failed" || t.outcome === "error") && t.classification === "product_defect") {
        return { source: "test", runId: r.runId, testId: t.id, name: t.name.slice(0, 200), criteria: t.criteria, classification: t.classification, message: redactString(t.error?.message ?? "test failed").slice(0, 1000) };
      }
    }
  }
  if (input.review) {
    for (const c of input.criteria) {
      const v = input.review.criteria.find((x) => x.id === c.id);
      if (v && !v.met) return { source: "review", runId: null, testId: null, name: `criterion ${c.id}`, criteria: [c.id], classification: null, message: redactString(`The reviewer judged this criterion not met: ${c.text}${v.note ? ` (${v.note})` : ""}`).slice(0, 1000) };
    }
  }
  return null;
}

export { worstStatus };
