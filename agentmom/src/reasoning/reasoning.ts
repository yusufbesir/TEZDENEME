// Reasoning ledgers (Faz 7, M14). Owner: Claude [IP:AgentMom Faz 7]. Capabilities #67 assumption debt, #69 decision expiry contracts, #68 confidence calibration.
// Pure records and deterministic arithmetic: no model, no network, no file access, no policy change. Everything is append-only (SQL triggers):
// a decision is replaced by a superseding one, an assumption changes only through logged events, a prediction's confidence can never be rewritten
// and it can be resolved once. An agent may only report a BROKEN assumption; only the user may declare one to HOLD.
import { randomUUID } from "node:crypto";
import type { AuditLog } from "../core/audit/audit.ts";
import { redactString } from "../core/audit/redact.ts";
import type { Db } from "../core/db/db.ts";
import type { Actor } from "../core/policy/types.ts";
import type { MemoryStore } from "../memory/store.ts";

export class ReasoningError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ReasoningError";
    this.code = code;
  }
}

export type AssumptionStatus = "unvalidated" | "holds" | "broken";
export type ReviewState = "ok" | "review_due" | "at_risk";

export interface Assumption {
  id: string;
  decisionId: string;
  text: string;
  checkBy: string;
  status: AssumptionStatus;
  evidence: string | null;
  checkedBy: string | null;
  checkedAt: string | null;
  overdue: boolean;
}

export interface Decision {
  id: string;
  title: string;
  rationale: string;
  scope: string;
  madeBy: string;
  decidedAt: string;
  expiresAt: string;
  supersedesId: string | null;
  status: "active" | "superseded" | "retired";
  memoryRecordId: string | null;
  assumptions: Assumption[];
  reviewState: ReviewState;
  reviewReasons: string[];
}

export const MAX_DECISION_DAYS = 366;
export const MAX_PREDICTION_DAYS = 366;
const DAY = 86_400_000;

function str(v: unknown, name: string, max: number): string {
  if (typeof v !== "string" || v.trim().length === 0 || v.length > max) throw new ReasoningError("invalid_field", `${name} must be a non-empty string of at most ${max} characters`);
  return v;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const SHORT_NAME = /^[A-Za-z0-9][A-Za-z0-9_.:\- ]{0,79}$/;

// Strict ISO 8601 with an explicit zone; impossible dates ("2026-02-30") are refused instead of silently rolling over.
function iso(v: unknown, name: string): string {
  const mt = typeof v === "string" ? ISO.exec(v) : null;
  if (!mt || Number.isNaN(Date.parse(v as string))) throw new ReasoningError("invalid_field", `${name} must be a full ISO date-time with a zone, e.g. 2026-10-21T12:00:00Z`);
  const probe = new Date(Date.UTC(Number(mt[1]), Number(mt[2]) - 1, Number(mt[3])));
  if (probe.getUTCMonth() !== Number(mt[2]) - 1 || probe.getUTCDate() !== Number(mt[3])) throw new ReasoningError("invalid_field", `${name} is not a real calendar date`);
  return new Date(v as string).toISOString();
}

function shortName(v: unknown, name: string): string {
  const s = str(v, name, 100);
  if (!SHORT_NAME.test(s) || redactString(s) !== s) throw new ReasoningError("invalid_field", `${name} must be a short name (letters, digits, - _ . : and spaces)`);
  return s;
}

interface DecisionRow {
  id: string;
  title: string;
  rationale: string;
  scope: string;
  made_by: string;
  decided_at: string;
  expires_at: string;
  supersedes_id: string | null;
  status: Decision["status"];
  memory_record_id: string | null;
}

interface AssumptionRow {
  id: string;
  decision_id: string;
  text: string;
  check_by: string;
  status: AssumptionStatus;
  evidence: string | null;
  checked_by: string | null;
  checked_at: string | null;
}

export class DecisionLedger {
  private readonly db: Db;
  private readonly audit: AuditLog | undefined;
  private readonly memory: MemoryStore | undefined;
  private readonly now: () => Date;

  constructor(db: Db, opts: { audit?: AuditLog; memory?: MemoryStore; now?: () => Date } = {}) {
    this.db = db;
    this.audit = opts.audit;
    this.memory = opts.memory;
    this.now = opts.now ?? (() => new Date());
  }

  private toAssumption(r: AssumptionRow): Assumption {
    return { id: r.id, decisionId: r.decision_id, text: r.text, checkBy: r.check_by, status: r.status, evidence: r.evidence, checkedBy: r.checked_by, checkedAt: r.checked_at, overdue: r.status === "unvalidated" && Date.parse(r.check_by) < this.now().getTime() };
  }

  private toDecision(r: DecisionRow): Decision {
    const assumptions = (this.db.prepare("SELECT * FROM decision_assumptions WHERE decision_id = ? ORDER BY created_at, rowid").all(r.id) as unknown as AssumptionRow[]).map((a) => this.toAssumption(a));
    const reasons: string[] = [];
    let state: ReviewState = "ok";
    if (r.status === "active") {
      if (Date.parse(r.expires_at) < this.now().getTime()) {
        state = "review_due";
        reasons.push("the decision's expiry date has passed");
      }
      const overdue = assumptions.filter((a) => a.overdue);
      if (overdue.length > 0) {
        state = "review_due";
        reasons.push(`${overdue.length} assumption(s) not validated by their check date`);
      }
      const broken = assumptions.filter((a) => a.status === "broken");
      if (broken.length > 0) {
        state = "at_risk";
        reasons.push(`${broken.length} assumption(s) broken: the reasoning no longer holds`);
      }
    }
    return { id: r.id, title: r.title, rationale: r.rationale, scope: r.scope, madeBy: r.made_by, decidedAt: r.decided_at, expiresAt: r.expires_at, supersedesId: r.supersedes_id, status: r.status, memoryRecordId: r.memory_record_id, assumptions, reviewState: state, reviewReasons: reasons };
  }

  get(id: string): Decision {
    const r = this.db.prepare("SELECT * FROM decisions WHERE id = ?").get(id) as unknown as DecisionRow | undefined;
    if (!r) throw new ReasoningError("not_found", `decision ${id} not found`);
    return this.toDecision(r);
  }

  list(opts: { onlyActive?: boolean } = {}): Decision[] {
    const rows = this.db.prepare(`SELECT * FROM decisions ${opts.onlyActive ? "WHERE status = 'active'" : ""} ORDER BY decided_at DESC LIMIT 500`).all() as unknown as DecisionRow[];
    return rows.map((r) => this.toDecision(r));
  }

  // A decision MUST carry an expiry (at most about a year) and may list the assumptions it rests on, each with a check-by date.
  record(input: { title: string; rationale: string; scope: string; expiresAt: string; assumptions?: Array<{ text: string; checkBy: string }>; supersedesId?: string }, actor: Actor): Decision {
    const title = redactString(str(input.title, "title", 200));
    const rationale = redactString(str(input.rationale, "rationale", 4000));
    if (actor.kind !== "user") throw new ReasoningError("approval_requires_user", "only the user records or supersedes a decision (an agent proposes it through a task)");
    const scope = shortName(input.scope, "scope");
    const now = this.now();
    const expiresAt = iso(input.expiresAt, "expiresAt");
    if (Date.parse(expiresAt) <= now.getTime()) throw new ReasoningError("invalid_field", "expiresAt must be in the future: every decision expires");
    if (Date.parse(expiresAt) > now.getTime() + MAX_DECISION_DAYS * DAY) throw new ReasoningError("invalid_field", `a decision can be valid for at most ${MAX_DECISION_DAYS} days; renew it with a new decision`);
    const assumptions = input.assumptions ?? [];
    if (!Array.isArray(assumptions) || assumptions.length > 20) throw new ReasoningError("invalid_field", "at most 20 assumptions");
    const prepared = assumptions.map((a, i) => {
      const checkBy = iso(a?.checkBy, `assumptions[${i}].checkBy`);
      if (Date.parse(checkBy) <= now.getTime()) throw new ReasoningError("invalid_field", `assumptions[${i}].checkBy must be in the future`);
      return { text: redactString(str(a?.text, `assumptions[${i}].text`, 500)), checkBy };
    });
    let old: DecisionRow | undefined;
    if (input.supersedesId !== undefined) {
      old = this.db.prepare("SELECT * FROM decisions WHERE id = ?").get(input.supersedesId) as unknown as DecisionRow | undefined;
      if (!old) throw new ReasoningError("not_found", "supersedesId does not exist");
      if (old.status !== "active") throw new ReasoningError("conflict", "only an active decision can be superseded");
    }
    const id = randomUUID();
    const at = now.toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      let memoryId: string | null = null;
      if (this.memory) {
        // The decision's expiry becomes the memory record's validity: recall flags it expired when the decision is.
        // The decision id is part of the body, so two decisions with the same words never collapse into one memory record.
        memoryId = this.memory.add({ kind: "decision", title: title.slice(0, 200), body: `${rationale}\n\nVarsayımlar: ${prepared.map((a) => a.text).join(" | ") || "yok"}\n[karar:${id}]`.slice(0, 8000), source: `decision:${id}`, scope, confidence: 0.9, validUntil: expiresAt }).record.id;
      }
      this.db.prepare("INSERT INTO decisions (id, title, rationale, scope, made_by, decided_at, expires_at, supersedes_id, memory_record_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, title, rationale, scope, `${actor.kind}:${actor.id}`, at, expiresAt, old?.id ?? null, memoryId, at);
      for (const a of prepared) this.db.prepare("INSERT INTO decision_assumptions (id, decision_id, text, check_by, created_at) VALUES (?, ?, ?, ?, ?)").run(randomUUID(), id, a.text, a.checkBy, at);
      if (old) {
        this.db.prepare("UPDATE decisions SET status = 'superseded' WHERE id = ?").run(old.id);
        // The superseded decision's memory record stops being recalled as current.
        if (old.memory_record_id && this.memory) this.memory.retire(old.memory_record_id);
      }
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
    this.audit?.record({ initiator: actor, action: "decision.record", decision: "allow", result: `decision ${id}`, details: { id, scope, expiresAt, assumptions: prepared.length, supersedes: old?.id ?? null } });
    return this.get(id);
  }

  // Evidence is mandatory. An agent may only report a assumption as BROKEN; declaring one to HOLD is the user's call (no self-validation).
  setAssumption(assumptionId: string, to: AssumptionStatus, evidence: string, actor: Actor): Assumption {
    if (to !== "holds" && to !== "broken") throw new ReasoningError("invalid_field", "an assumption can only be moved to holds or broken");
    const ev = redactString(str(evidence, "evidence", 1000));
    if (ev.replace(/\[REDACTED\]/g, "").trim().length < 10) throw new ReasoningError("invalid_field", "evidence must say what was checked (at least 10 characters besides secrets)");
    if (to === "holds" && actor.kind !== "user") throw new ReasoningError("approval_requires_user", "only the user can declare an assumption to hold");
    const a = this.db.prepare("SELECT * FROM decision_assumptions WHERE id = ?").get(assumptionId) as unknown as AssumptionRow | undefined;
    if (!a) throw new ReasoningError("not_found", `assumption ${assumptionId} not found`);
    const d = this.db.prepare("SELECT status FROM decisions WHERE id = ?").get(a.decision_id) as unknown as { status: string };
    if (d.status !== "active") throw new ReasoningError("conflict", "the decision is no longer active");
    if (a.status === to) throw new ReasoningError("conflict", `already ${to}`);
    const at = this.now().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT INTO assumption_events (id, assumption_id, from_status, to_status, evidence, actor_kind, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), assumptionId, a.status, to, ev, actor.kind, actor.id, at);
      this.db.prepare("UPDATE decision_assumptions SET status = ?, evidence = ?, checked_by = ?, checked_at = ? WHERE id = ?").run(to, ev, `${actor.kind}:${actor.id}`, at, assumptionId);
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
    this.audit?.record({ initiator: actor, action: `assumption.${to}`, decision: "allow", result: `assumption ${assumptionId}`, details: { assumptionId, decisionId: a.decision_id, to } });
    return this.toAssumption(this.db.prepare("SELECT * FROM decision_assumptions WHERE id = ?").get(assumptionId) as unknown as AssumptionRow);
  }

  assumptionEvents(assumptionId: string): Array<{ from: string; to: string; evidence: string; actor: string; at: string }> {
    return (this.db.prepare("SELECT from_status, to_status, evidence, actor_kind, actor_id, created_at FROM assumption_events WHERE assumption_id = ? ORDER BY created_at, rowid").all(assumptionId) as unknown as Array<{ from_status: string; to_status: string; evidence: string; actor_kind: string; actor_id: string; created_at: string }>).map((e) => ({ from: e.from_status, to: e.to_status, evidence: e.evidence, actor: `${e.actor_kind}:${e.actor_id}`, at: e.created_at }));
  }

  retire(id: string, actor: Actor): Decision {
    if (actor.kind !== "user") throw new ReasoningError("approval_requires_user", "only the user can retire a decision");
    const d = this.get(id);
    if (d.status === "retired") return d;
    this.db.prepare("UPDATE decisions SET status = 'retired' WHERE id = ?").run(id);
    if (d.memoryRecordId && this.memory) this.memory.retire(d.memoryRecordId);
    this.audit?.record({ initiator: actor, action: "decision.retire", decision: "allow", result: `decision ${id}`, details: { id } });
    return this.get(id);
  }

  // The assumption-debt ledger: every unvalidated or broken assumption under an ACTIVE decision, worst first
  // (broken before overdue before pending; then by how long overdue; then by how many active decisions share the same assumption text scope).
  debt(): Array<{ assumptionId: string; decisionId: string; decisionTitle: string; text: string; status: AssumptionStatus; overdueDays: number; kind: "broken" | "overdue" | "pending" }> {
    const rows = this.db
      .prepare(`SELECT a.*, d.title AS dtitle FROM decision_assumptions a JOIN decisions d ON d.id = a.decision_id WHERE d.status = 'active' AND a.status != 'holds' ORDER BY a.check_by`)
      .all() as unknown as Array<AssumptionRow & { dtitle: string }>;
    const now = this.now().getTime();
    const out = rows.map((r) => {
      const overdueDays = Math.max(0, Math.floor((now - Date.parse(r.check_by)) / DAY));
      const kind: "broken" | "overdue" | "pending" = r.status === "broken" ? "broken" : overdueDays > 0 ? "overdue" : "pending";
      return { assumptionId: r.id, decisionId: r.decision_id, decisionTitle: r.dtitle, text: r.text, status: r.status, overdueDays, kind };
    });
    const rank = { broken: 0, overdue: 1, pending: 2 } as const;
    return out.sort((x, y) => rank[x.kind] - rank[y.kind] || y.overdueDays - x.overdueDays);
  }
}

// ---- confidence calibration (#68) ---------------------------------------------------------------------------------------
export interface Prediction {
  id: string;
  source: string;
  claim: string;
  confidence: number;
  dueAt: string;
  createdAt: string;
  outcome: boolean | null;
  resolvedAt: string | null;
  evidence: string | null;
}

export interface CalibrationBucket {
  range: string;
  n: number;
  meanConfidence: number | null;
  observedFrequency: number | null;
  enoughData: boolean;
}

export interface CalibrationReport {
  source: string | null;
  resolved: number;
  unresolvedOverdue: number;
  unresolvedTotal: number;
  brier: number | null;
  meanConfidence: number | null;
  accuracy: number | null;
  gap: number | null;
  verdict: "insufficient_data" | "biased_sample" | "calibrated" | "overconfident" | "underconfident";
  selectionBiasWarning: boolean;
  buckets: CalibrationBucket[];
  note: string;
}

export const MIN_RESOLVED = 20;
export const MIN_BUCKET = 5;
export const TOLERANCE = 0.05;

interface PredRow {
  id: string;
  source: string;
  claim: string;
  confidence: number;
  due_at: string;
  created_at: string;
  outcome: number | null;
  resolved_at: string | null;
  evidence: string | null;
}

export class Calibration {
  private readonly db: Db;
  private readonly audit: AuditLog | undefined;
  private readonly now: () => Date;

  constructor(db: Db, opts: { audit?: AuditLog; now?: () => Date } = {}) {
    this.db = db;
    this.audit = opts.audit;
    this.now = opts.now ?? (() => new Date());
  }

  private toPred(r: PredRow): Prediction {
    return { id: r.id, source: r.source, claim: r.claim, confidence: r.confidence, dueAt: r.due_at, createdAt: r.created_at, outcome: r.outcome === null ? null : r.outcome === 1, resolvedAt: r.resolved_at, evidence: r.evidence };
  }

  get(id: string): Prediction {
    const r = this.db.prepare("SELECT * FROM predictions WHERE id = ?").get(id) as unknown as PredRow | undefined;
    if (!r) throw new ReasoningError("not_found", `prediction ${id} not found`);
    return this.toPred(r);
  }

  // The confidence is committed BEFORE the outcome is known and can never be edited; every prediction must name when it will be checked.
  record(input: { source: string; claim: string; confidence: number; dueAt: string }, actor: Actor): Prediction {
    const source = shortName(input.source, "source");
    const claim = redactString(str(input.claim, "claim", 500));
    if (typeof input.confidence !== "number" || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) throw new ReasoningError("invalid_field", "confidence must be a number from 0 to 1");
    const dueAt = iso(input.dueAt, "dueAt");
    if (Date.parse(dueAt) <= this.now().getTime()) throw new ReasoningError("invalid_field", "dueAt must be in the future: a prediction is made before the outcome is known");
    if (Date.parse(dueAt) > this.now().getTime() + MAX_PREDICTION_DAYS * DAY) throw new ReasoningError("invalid_field", `dueAt can be at most ${MAX_PREDICTION_DAYS} days away (an unreachable check date would hide the prediction from the bias guard)`);
    const id = randomUUID();
    this.db.prepare("INSERT INTO predictions (id, source, claim, confidence, due_at, created_at, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, source, claim, input.confidence, dueAt, this.now().toISOString(), `${actor.kind}:${actor.id}`);
    this.audit?.record({ initiator: actor, action: "prediction.record", decision: "allow", result: `prediction ${id}`, details: { id, source, confidence: input.confidence } });
    return this.get(id);
  }

  resolve(id: string, outcome: boolean, evidence: string, actor: Actor): Prediction {
    if (actor.kind !== "user") throw new ReasoningError("approval_requires_user", "only the user resolves a prediction (a predictor must not grade itself)");
    if (typeof outcome !== "boolean") throw new ReasoningError("invalid_field", "outcome must be true or false");
    const ev = redactString(str(evidence, "evidence", 1000));
    const p = this.get(id);
    if (p.outcome !== null) throw new ReasoningError("conflict", "already resolved");
    this.db.prepare("UPDATE predictions SET outcome = ?, resolved_at = ?, evidence = ? WHERE id = ?").run(outcome ? 1 : 0, this.now().toISOString(), ev, id);
    this.audit?.record({ initiator: actor, action: "prediction.resolve", decision: "allow", result: `prediction ${id} ${outcome}`, details: { id, outcome } });
    return this.get(id);
  }

  report(source?: string): CalibrationReport {
    const rows = (source === undefined ? this.db.prepare("SELECT * FROM predictions").all() : this.db.prepare("SELECT * FROM predictions WHERE source = ?").all(source)) as unknown as PredRow[];
    const now = this.now().getTime();
    const resolved = rows.filter((r) => r.outcome !== null);
    const open = rows.filter((r) => r.outcome === null);
    const overdue = open.filter((r) => Date.parse(r.due_at) < now);
    const buckets: CalibrationBucket[] = [];
    for (let i = 0; i < 5; i++) {
      const lo = i / 5;
      const hi = (i + 1) / 5;
      const inB = resolved.filter((r) => r.confidence >= lo && (i === 4 ? r.confidence <= hi : r.confidence < hi));
      const n = inB.length;
      buckets.push({ range: `${lo.toFixed(1)}-${hi.toFixed(1)}`, n, meanConfidence: n ? inB.reduce((a, r) => a + r.confidence, 0) / n : null, observedFrequency: n ? inB.reduce((a, r) => a + (r.outcome as number), 0) / n : null, enoughData: n >= MIN_BUCKET });
    }
    const n = resolved.length;
    const brier = n ? resolved.reduce((a, r) => a + (r.confidence - (r.outcome as number)) ** 2, 0) / n : null;
    const meanConfidence = n ? resolved.reduce((a, r) => a + r.confidence, 0) / n : null;
    const accuracy = n ? resolved.reduce((a, r) => a + (r.outcome as number), 0) / n : null;
    const gap = meanConfidence !== null && accuracy !== null ? meanConfidence - accuracy : null;
    // Resolving only the flattering predictions would fake calibration: a large share of overdue-but-unresolved ones is flagged.
    const selectionBiasWarning = overdue.length > 0 && overdue.length / Math.max(1, overdue.length + n) > 0.3;
    let verdict: CalibrationReport["verdict"] = "insufficient_data";
    let note = `${n} resolved prediction(s); at least ${MIN_RESOLVED} are needed before any verdict (too little data is not "well calibrated").`;
    if (n >= MIN_RESOLVED && gap !== null) {
      verdict = Math.abs(gap) <= TOLERANCE ? "calibrated" : gap > 0 ? "overconfident" : "underconfident";
      note = `mean confidence ${(meanConfidence as number).toFixed(2)} vs observed accuracy ${(accuracy as number).toFixed(2)} (gap ${gap.toFixed(2)}, tolerance ${TOLERANCE}); Brier ${(brier as number).toFixed(3)} (0 = perfect, 0.25 = always saying 50%).`;
    }
    if (selectionBiasWarning && verdict !== "insufficient_data") {
      verdict = "biased_sample";
      note = `many overdue predictions are still unresolved, so the resolved ones may be a flattering sample: grade the overdue ones before trusting any verdict. ${note}`;
    }
    return { source: source ?? null, resolved: n, unresolvedOverdue: overdue.length, unresolvedTotal: open.length, brier, meanConfidence, accuracy, gap, verdict, selectionBiasWarning, buckets, note };
  }
}
