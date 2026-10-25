// Skill lifecycle skeleton (Faz 5c). Owner: Claude [IP:AgentMom Faz 5].
// candidate -> researching -> security_review -> isolated_test -> awaiting_approval -> released (versioned), with rejected / revoked as exits.
// RECORDS AND POLICY GATES ONLY: this module never fetches, installs, unpacks or runs a third-party skill (a source test pins that).
// Gate results are append-only rows bound to the candidate's artifact SHA-256; a changed artifact is a NEW candidate.
// Only a person releases, rejects or revokes. Label-level independence (reviewer != proposer) is enforced; proving WHO a label is stays the caller's job.
import { randomUUID } from "node:crypto";
import type { AuditLog } from "../core/audit/audit.ts";
import { redactString } from "../core/audit/redact.ts";
import type { Db } from "../core/db/db.ts";
import type { Actor } from "../core/policy/types.ts";

export const SKILL_STATES = ["candidate", "researching", "security_review", "isolated_test", "awaiting_approval", "released", "rejected", "revoked"] as const;
export type SkillState = (typeof SKILL_STATES)[number];
export const RISK_CLASSES = ["contained", "privileged", "remote"] as const;
export type RiskClass = (typeof RISK_CLASSES)[number];
export const GATES = ["research", "security_review", "isolated_test"] as const;
export type Gate = (typeof GATES)[number];
export type Verdict = "pass" | "fail" | "info";

// The one state each gate can be recorded in.
const GATE_STATE: Record<Gate, SkillState> = { research: "researching", security_review: "security_review", isolated_test: "isolated_test" };
// Automatable steps: an agent may move a candidate forward only when the evidence for the NEXT step is already on record.
const FORWARD: Partial<Record<SkillState, SkillState>> = { candidate: "researching", researching: "security_review", security_review: "isolated_test", isolated_test: "awaiting_approval" };
const TERMINAL: SkillState[] = ["rejected", "revoked"];

export class SkillError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SkillError";
    this.code = code;
  }
}

export interface SkillCandidate {
  id: string;
  name: string;
  origin: string;
  description: string;
  riskClass: RiskClass;
  artifactSha256: string;
  state: SkillState;
  proposedBy: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface GateRecord {
  id: string;
  skillId: string;
  gate: Gate;
  verdict: Verdict;
  reviewer: string;
  artifactSha256: string;
  summary: string;
  createdAt: string;
}

interface CandidateRow {
  id: string;
  name: string;
  origin: string;
  description: string;
  risk_class: RiskClass;
  artifact_sha256: string;
  state: SkillState;
  proposed_by: string;
  current_version: number;
  created_at: string;
  updated_at: string;
}

interface GateRow {
  id: string;
  skill_id: string;
  gate: Gate;
  verdict: Verdict;
  reviewer: string;
  artifact_sha256: string;
  summary: string;
  created_at: string;
}

const SHA256 = /^[0-9a-f]{64}$/;

// "Agent:Claude-Code ", "claude-code" and "CLAUDE-CODE" are one identity for the independence and distinct-reviewer rules.
export function normId(v: string): string {
  return v.trim().toLowerCase().replace(/^(user|agent|system):/, "").trim();
}

function str(v: unknown, name: string, max: number): string {
  if (typeof v !== "string" || v.trim().length === 0 || v.length > max) throw new SkillError("invalid_field", `${name} must be a non-empty string of at most ${max} characters`);
  return v;
}

function toCandidate(r: CandidateRow): SkillCandidate {
  return { id: r.id, name: r.name, origin: r.origin, description: r.description, riskClass: r.risk_class, artifactSha256: r.artifact_sha256, state: r.state, proposedBy: r.proposed_by, currentVersion: r.current_version, createdAt: r.created_at, updatedAt: r.updated_at };
}

function toGate(r: GateRow): GateRecord {
  return { id: r.id, skillId: r.skill_id, gate: r.gate, verdict: r.verdict, reviewer: r.reviewer, artifactSha256: r.artifact_sha256, summary: r.summary, createdAt: r.created_at };
}

export class SkillLifecycle {
  private readonly db: Db;
  private readonly audit: AuditLog | undefined;
  private readonly now: () => Date;

  constructor(db: Db, audit?: AuditLog, now: () => Date = () => new Date()) {
    this.db = db;
    this.audit = audit;
    this.now = now;
  }

  private row(id: string): CandidateRow {
    const r = this.db.prepare("SELECT * FROM skill_candidates WHERE id = ?").get(id) as unknown as CandidateRow | undefined;
    if (!r) throw new SkillError("not_found", `skill candidate ${id} not found`);
    return r;
  }

  get(id: string): SkillCandidate {
    return toCandidate(this.row(id));
  }

  list(): SkillCandidate[] {
    return (this.db.prepare("SELECT * FROM skill_candidates ORDER BY created_at DESC LIMIT 500").all() as unknown as CandidateRow[]).map(toCandidate);
  }

  gateRecords(id: string, gate?: Gate): GateRecord[] {
    this.row(id);
    const rows = (gate === undefined
      ? this.db.prepare("SELECT * FROM skill_gate_records WHERE skill_id = ? ORDER BY created_at, rowid").all(id)
      : this.db.prepare("SELECT * FROM skill_gate_records WHERE skill_id = ? AND gate = ? ORDER BY created_at, rowid").all(id, gate)) as unknown as GateRow[];
    return rows.map(toGate);
  }

  events(id: string): Array<{ fromState: string | null; toState: string; actor: string; note: string | null; createdAt: string }> {
    this.row(id);
    return (this.db.prepare("SELECT from_state, to_state, actor_kind, actor_id, note, created_at FROM skill_events WHERE skill_id = ? ORDER BY created_at, rowid").all(id) as unknown as Array<{ from_state: string | null; to_state: string; actor_kind: string; actor_id: string; note: string | null; created_at: string }>).map((e) => ({ fromState: e.from_state, toState: e.to_state, actor: `${e.actor_kind}:${e.actor_id}`, note: e.note, createdAt: e.created_at }));
  }

  versions(id: string): Array<{ version: number; artifactSha256: string; releasedBy: string; releasedAt: string; revokedAt: string | null }> {
    this.row(id);
    return (this.db.prepare("SELECT version, artifact_sha256, released_by, released_at, revoked_at FROM skill_versions WHERE skill_id = ? ORDER BY version").all(id) as unknown as Array<{ version: number; artifact_sha256: string; released_by: string; released_at: string; revoked_at: string | null }>).map((v) => ({ version: v.version, artifactSha256: v.artifact_sha256, releasedBy: v.released_by, releasedAt: v.released_at, revokedAt: v.revoked_at }));
  }

  private log(skillId: string, from: SkillState | null, to: SkillState, actor: Actor, note: string | null): void {
    const at = this.now().toISOString();
    this.db.prepare("INSERT INTO skill_events (id, skill_id, from_state, to_state, actor_kind, actor_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), skillId, from, to, actor.kind, actor.id, note, at);
    this.audit?.record({ initiator: actor, action: `skill.${to}`, decision: "allow", result: `skill ${skillId} ${from ?? "-"} -> ${to}`, details: { skillId, from, to, note } });
  }

  private setState(id: string, from: SkillState, to: SkillState, actor: Actor, note: string | null): SkillCandidate {
    const changed = this.db.prepare("UPDATE skill_candidates SET state = ?, updated_at = ? WHERE id = ? AND state = ?").run(to, this.now().toISOString(), id, from);
    if (Number(changed.changes) === 0) throw new SkillError("conflict", `skill ${id} is no longer ${from}`);
    this.log(id, from, to, actor, note);
    return this.get(id);
  }

  // Anyone may PROPOSE (including an agent); a proposal is only a record and starts at "candidate".
  propose(input: { name: string; origin: string; description: string; riskClass: RiskClass; artifactSha256: string }, actor: Actor): SkillCandidate {
    const name = str(input.name, "name", 100);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) throw new SkillError("invalid_field", "name may only use letters, digits, . _ -");
    const origin = redactString(str(input.origin, "origin", 500));
    const description = redactString(str(input.description, "description", 2000));
    if (!(RISK_CLASSES as readonly string[]).includes(input.riskClass)) throw new SkillError("invalid_field", `riskClass must be one of ${RISK_CLASSES.join(", ")}`);
    if (typeof input.artifactSha256 !== "string" || !SHA256.test(input.artifactSha256)) throw new SkillError("invalid_field", "artifactSha256 must be 64 lowercase hex characters");
    const id = randomUUID();
    const at = this.now().toISOString();
    try {
      this.db.prepare("INSERT INTO skill_candidates (id, name, origin, description, risk_class, artifact_sha256, state, proposed_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?)").run(id, name, origin, description, input.riskClass, input.artifactSha256, `${actor.kind}:${actor.id}`, at, at);
    } catch (err) {
      if (/UNIQUE/i.test(String((err as Error).message))) throw new SkillError("conflict", "this exact artifact is already a candidate under this name");
      throw err;
    }
    this.log(id, null, "candidate", actor, "proposed");
    return this.get(id);
  }

  // Records one gate result. It must match the current stage and the candidate's artifact hash, so evidence about another artifact can never count.
  addGateRecord(id: string, input: { gate: Gate; verdict: Verdict; reviewer: string; artifactSha256: string; summary: string }, actor: Actor): GateRecord {
    const c = this.row(id);
    if (!(GATES as readonly string[]).includes(input.gate)) throw new SkillError("invalid_field", `gate must be one of ${GATES.join(", ")}`);
    if (!["pass", "fail", "info"].includes(input.verdict)) throw new SkillError("invalid_field", "verdict must be pass, fail or info");
    const reviewer = str(input.reviewer, "reviewer", 100);
    const summary = redactString(str(input.summary, "summary", 4000));
    if (typeof input.artifactSha256 !== "string" || !SHA256.test(input.artifactSha256)) throw new SkillError("invalid_field", "artifactSha256 must be 64 lowercase hex characters");
    if (TERMINAL.includes(c.state) || c.state === "released") throw new SkillError("conflict", `skill is ${c.state}: no more gate records`);
    if (c.state !== GATE_STATE[input.gate]) throw new SkillError("conflict", `a ${input.gate} record belongs to state ${GATE_STATE[input.gate]}, the skill is ${c.state}`);
    if (input.artifactSha256 !== c.artifact_sha256) throw new SkillError("artifact_mismatch", "the record is about a different artifact than the candidate");
    if (input.verdict === "pass" && input.gate !== "research" && normId(reviewer) === normId(c.proposed_by)) throw new SkillError("not_independent", "the proposer cannot pass its own security review or test");
    const gid = randomUUID();
    this.db.prepare("INSERT INTO skill_gate_records (id, skill_id, gate, verdict, reviewer, artifact_sha256, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(gid, id, input.gate, input.verdict, reviewer, input.artifactSha256, summary, this.now().toISOString());
    this.audit?.record({ initiator: actor, action: `skill.gate.${input.gate}`, decision: "allow", result: `${input.verdict} by ${reviewer}`, details: { skillId: id, gate: input.gate, verdict: input.verdict, reviewer } });
    return toGate(this.db.prepare("SELECT * FROM skill_gate_records WHERE id = ?").get(gid) as unknown as GateRow);
  }

  // Each reviewer's LATEST non-info record decides for that reviewer; a later fail withdraws an earlier pass.
  private latestByReviewer(id: string, gate: Gate, hash: string): Map<string, Verdict> {
    const out = new Map<string, Verdict>();
    for (const r of this.gateRecords(id, gate)) if (r.verdict !== "info" && r.artifactSha256 === hash) out.set(normId(r.reviewer), r.verdict);
    return out;
  }

  // What is still missing to leave the current state; empty means the next step is allowed.
  missing(id: string): string[] {
    const c = this.row(id);
    const out: string[] = [];
    if (c.state === "candidate") return out;
    if (c.state === "researching") {
      if (!this.gateRecords(id, "research").some((r) => r.artifactSha256 === c.artifact_sha256)) out.push("at least one research record");
    } else if (c.state === "security_review" || c.state === "isolated_test") {
      const gate: Gate = c.state;
      const latest = this.latestByReviewer(id, gate, c.artifact_sha256);
      const passes = [...latest.entries()].filter(([, v]) => v === "pass").map(([k]) => k);
      const fails = [...latest.entries()].filter(([, v]) => v === "fail");
      if (fails.length > 0) out.push(`an unresolved failing ${gate} record (${fails.map(([k]) => k).join(", ")})`);
      const need = gate === "security_review" && c.risk_class !== "contained" ? 2 : 1;
      if (passes.length < need) out.push(`${need} passing ${gate} record${need > 1 ? "s from distinct reviewers" : ""} (have ${passes.length})`);
    }
    return out;
  }

  // Moves one step forward when the evidence is on record. Agents may do this; the gates, not the actor, are the control.
  advance(id: string, actor: Actor): SkillCandidate {
    const c = this.row(id);
    const next = FORWARD[c.state];
    if (!next) throw new SkillError("conflict", `skill is ${c.state}: there is no automatic next step${c.state === "awaiting_approval" ? " (a person must release it)" : ""}`);
    const gaps = this.missing(id);
    if (gaps.length > 0) throw new SkillError("gate_not_met", `cannot leave ${c.state}: missing ${gaps.join("; ")}`);
    return this.setState(id, c.state, next, actor, null);
  }

  private requireUser(actor: Actor, what: string): void {
    if (actor.kind !== "user") throw new SkillError("approval_requires_user", `only the user can ${what}`);
  }

  release(id: string, actor: Actor, note: string | null = null): SkillCandidate {
    this.requireUser(actor, "release a skill");
    const c = this.row(id);
    if (c.state !== "awaiting_approval") throw new SkillError("conflict", `skill is ${c.state}, only awaiting_approval can be released`);
    // Defence in depth: the evidence is re-checked at release time, so a skipped or tampered step cannot slip through.
    for (const gate of ["security_review", "isolated_test"] as Gate[]) {
      const latest = this.latestByReviewer(id, gate, c.artifact_sha256);
      const need = gate === "security_review" && c.risk_class !== "contained" ? 2 : 1;
      const passes = [...latest.values()].filter((v) => v === "pass").length;
      if (passes < need || [...latest.values()].includes("fail")) throw new SkillError("gate_not_met", `release refused: ${gate} is not satisfied for this artifact`);
    }
    const version = c.current_version + 1;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT INTO skill_versions (skill_id, version, artifact_sha256, released_by, released_at) VALUES (?, ?, ?, ?, ?)").run(id, version, c.artifact_sha256, actor.id, this.now().toISOString());
      this.db.prepare("UPDATE skill_candidates SET current_version = ? WHERE id = ?").run(version, id);
      this.setState(id, "awaiting_approval", "released", actor, note ?? `version ${version}`);
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
    return this.get(id);
  }

  reject(id: string, actor: Actor, note: string): SkillCandidate {
    this.requireUser(actor, "reject a skill");
    const c = this.row(id);
    if (TERMINAL.includes(c.state) || c.state === "released") throw new SkillError("conflict", `skill is already ${c.state}`);
    return this.setState(id, c.state, "rejected", actor, str(note, "note", 1000));
  }

  revoke(id: string, actor: Actor, note: string): SkillCandidate {
    this.requireUser(actor, "revoke a skill");
    const c = this.row(id);
    if (c.state !== "released") throw new SkillError("conflict", `only a released skill can be revoked, this one is ${c.state}`);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("UPDATE skill_versions SET revoked_at = ? WHERE skill_id = ? AND revoked_at IS NULL").run(this.now().toISOString(), id);
      this.setState(id, "released", "revoked", actor, str(note, "note", 1000));
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
    return this.get(id);
  }
}
