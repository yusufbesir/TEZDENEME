import type { DeliveryReport, FirstFailure } from "./auditor.ts";

export const HARD_MAX_REPAIR_ROUNDS = 3;

export interface RepairFeedback {
  round: number;
  source: "test" | "review";
  testId: string | null;
  name: string;
  criteria: string[];
  classification: string | null;
  message: string;
}

export type RepairDecision = { action: "send_back"; feedback: RepairFeedback; reason: string } | { action: "stop"; reason: string };

// The ONE repair coordinator. It decides only whether the first product defect goes back to the workflow's implement step, and for how many rounds.
// The workflow engine accepts exactly one coordinator; there is no second one to coordinate with.
export class RepairCoordinator {
  readonly maxRounds: number;

  constructor(maxRounds = 2) {
    if (!Number.isInteger(maxRounds) || maxRounds < 0) throw new Error("maxRounds must be a non-negative integer");
    this.maxRounds = Math.min(maxRounds, HARD_MAX_REPAIR_ROUNDS);
  }

  // `roundsDone` is how many repair rounds already ran.
  decide(report: DeliveryReport, roundsDone: number): RepairDecision {
    if (report.verdict === "passed") return { action: "stop", reason: "nothing to repair: delivery passed" };
    if (report.verdict === "unverified") return { action: "stop", reason: "not a code defect: the delivery is unverified (weak mapping, flaky, environment or infrastructure problem, or missing evidence); repairing code would not help" };
    const failure: FirstFailure | null = report.firstFailure;
    if (!failure) return { action: "stop", reason: "failed, but there is no product defect to send back" };
    if (roundsDone >= this.maxRounds) return { action: "stop", reason: `repair budget exhausted after ${roundsDone} round(s)` };
    return {
      action: "send_back",
      reason: `round ${roundsDone + 1} of ${this.maxRounds}: the first failure goes back to the implement step`,
      feedback: { round: roundsDone + 1, source: failure.source, testId: failure.testId, name: failure.name, criteria: failure.criteria, classification: failure.classification, message: failure.message },
    };
  }
}
