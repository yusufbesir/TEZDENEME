import type { RunResult } from "./schema.ts";

export type CriterionStatus = "verified" | "failed" | "error" | "flaky" | "unverified";

export interface LinkedTest {
  runId: string;
  provider: string;
  testId: string;
  outcome: string;
  classification: string | null;
}

export interface CriterionTrace {
  id: string;
  text: string;
  status: CriterionStatus;
  tests: LinkedTest[];
  // "Weak" = nothing was actually checked for this criterion. A green run does not make such a criterion verified.
  weak: boolean;
  reason: string;
}

export interface Traceability {
  criteria: CriterionTrace[];
  // Tests that reference a criterion id the contract does not define (typos silently verify nothing).
  unknownReferences: Array<{ testId: string; criterion: string }>;
  stuffedTests: string[];
}

// A test that claims many criteria at once is a sign of tag-stuffing: its claims are ignored and reported.
export const MAX_CRITERIA_PER_TEST = 3;

const PRIORITY: CriterionStatus[] = ["failed", "error", "flaky", "unverified", "verified"];

// Maps each acceptance criterion id of the task contract to the tests that claim to cover it. No mapping, no verification.
export function traceCriteria(criteria: Array<{ id: string; text: string }>, runs: RunResult[]): Traceability {
  const known = new Set(criteria.map((c) => c.id));
  const unknownReferences: Traceability["unknownReferences"] = [];
  for (const r of runs) for (const t of r.tests) for (const c of t.criteria) if (!known.has(c)) unknownReferences.push({ testId: t.id, criterion: c });

  const out = criteria.map((c): CriterionTrace => {
    const linked = runs.flatMap((r) => r.tests.filter((t) => t.criteria.length <= MAX_CRITERIA_PER_TEST && t.criteria.includes(c.id)).map((t) => ({ run: r, t })));
    const tests: LinkedTest[] = linked.map(({ run, t }) => ({ runId: run.runId, provider: run.provider, testId: t.id, outcome: t.outcome, classification: t.classification }));
    if (linked.length === 0) return { id: c.id, text: c.text, status: "unverified", tests, weak: true, reason: "no test is mapped to this criterion; a passing run proves nothing about it" };
    const failing = linked.filter(({ t }) => t.outcome === "failed" || t.outcome === "error");
    if (failing.some(({ t }) => t.classification === "product_defect")) return { id: c.id, text: c.text, status: "failed", tests, weak: false, reason: "a mapped test failed with a product defect" };
    if (failing.some(({ t }) => t.classification === "environment" || t.classification === "infra")) return { id: c.id, text: c.text, status: "error", tests, weak: false, reason: "a mapped test could not run properly (environment or infrastructure problem)" };
    if (failing.some(({ t }) => t.classification === "flaky")) return { id: c.id, text: c.text, status: "flaky", tests, weak: false, reason: "a mapped test is flaky (failed, then passed on retry)" };
    if (!linked.some(({ t }) => t.outcome === "passed")) return { id: c.id, text: c.text, status: "unverified", tests, weak: true, reason: "every mapped test was skipped" };
    return { id: c.id, text: c.text, status: "verified", tests, weak: false, reason: `${linked.filter(({ t }) => t.outcome === "passed").length} mapped test(s) passed` };
  });
  const stuffedTests = runs.flatMap((r) => r.tests.filter((t) => t.criteria.length > MAX_CRITERIA_PER_TEST).map((t) => t.id));
  return { criteria: out, unknownReferences, stuffedTests };
}

export function worstStatus(statuses: CriterionStatus[]): CriterionStatus {
  for (const s of PRIORITY) if (statuses.includes(s)) return s;
  return "verified";
}
