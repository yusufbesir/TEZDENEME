import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { AuditLog, MemoryAuditSink } from "../core/audit/audit.ts";
import type { Actor } from "../core/policy/types.ts";
import { SkillError, SkillLifecycle } from "./lifecycle.ts";
import type { Gate } from "./lifecycle.ts";

const USER: Actor = { kind: "user", id: "yusuf" };
const AGENT: Actor = { kind: "agent", id: "claude-code" };
const HASH = "a".repeat(64);
const OTHER = "b".repeat(64);

function fresh(): { life: SkillLifecycle; db: ReturnType<typeof openDb>; sink: MemoryAuditSink } {
  const db = openDb(":memory:");
  migrate(db);
  const sink = new MemoryAuditSink();
  return { life: new SkillLifecycle(db, new AuditLog([sink])), db, sink };
}

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof SkillError ? e.code : `other:${(e as Error).message}`;
  }
  return undefined;
}

function propose(life: SkillLifecycle, over: Partial<{ riskClass: "contained" | "privileged" | "remote"; name: string; sha: string }> = {}) {
  return life.propose({ name: over.name ?? "pdf-helper", origin: "https://example.test/skills/pdf-helper", description: "ornek", riskClass: over.riskClass ?? "contained", artifactSha256: over.sha ?? HASH }, AGENT);
}

function gate(life: SkillLifecycle, id: string, g: Gate, verdict: "pass" | "fail" | "info", reviewer: string, sha = HASH) {
  return life.addGateRecord(id, { gate: g, verdict, reviewer, artifactSha256: sha, summary: `${g} ${verdict}` }, AGENT);
}

function toAwaiting(life: SkillLifecycle, id: string, security = ["codex"]): void {
  life.advance(id, AGENT); // researching
  gate(life, id, "research", "info", "claude-code");
  life.advance(id, AGENT); // security_review
  for (const r of security) gate(life, id, "security_review", "pass", r);
  life.advance(id, AGENT); // isolated_test
  gate(life, id, "isolated_test", "pass", "test-runner");
  life.advance(id, AGENT); // awaiting_approval
}

test("the full path: candidate -> researching -> security_review -> isolated_test -> awaiting_approval -> released v1, each step on the audit trail", () => {
  const { life, sink } = fresh();
  const c = propose(life);
  assert.equal(c.state, "candidate");
  assert.equal(c.proposedBy, "agent:claude-code");
  toAwaiting(life, c.id);
  assert.equal(life.get(c.id).state, "awaiting_approval");
  const done = life.release(c.id, USER, "ilk surum");
  assert.equal(done.state, "released");
  assert.equal(done.currentVersion, 1);
  assert.deepEqual(life.versions(c.id).map((v) => [v.version, v.artifactSha256, v.releasedBy, v.revokedAt]), [[1, HASH, "yusuf", null]]);
  assert.deepEqual(life.events(c.id).map((e) => e.toState), ["candidate", "researching", "security_review", "isolated_test", "awaiting_approval", "released"]);
  assert.ok(sink.events.some((e) => e.action === "skill.released"));
});

test("a step cannot be skipped and each gate needs its own evidence", () => {
  const { life } = fresh();
  const c = propose(life);
  assert.equal(code(() => life.release(c.id, USER)), "conflict", "cannot release a candidate");
  life.advance(c.id, AGENT);
  assert.equal(code(() => life.advance(c.id, AGENT)), "gate_not_met", "research needs a record");
  assert.equal(code(() => gate(life, c.id, "security_review", "pass", "codex")), "conflict", "a record belongs to its own stage");
  gate(life, c.id, "research", "info", "claude-code");
  life.advance(c.id, AGENT);
  assert.equal(code(() => life.advance(c.id, AGENT)), "gate_not_met", "security review needs a pass");
  gate(life, c.id, "security_review", "info", "codex");
  assert.equal(code(() => life.advance(c.id, AGENT)), "gate_not_met", "info is not a pass");
});

test("the proposer cannot pass its own security review or test; a fail blocks until the same reviewer passes again", () => {
  const { life } = fresh();
  const c = propose(life);
  life.advance(c.id, AGENT);
  gate(life, c.id, "research", "info", "claude-code");
  life.advance(c.id, AGENT);
  assert.equal(code(() => gate(life, c.id, "security_review", "pass", "agent:claude-code")), "not_independent");
  gate(life, c.id, "security_review", "fail", "codex");
  gate(life, c.id, "security_review", "pass", "gemini");
  assert.equal(code(() => life.advance(c.id, AGENT)), "gate_not_met", "one reviewer's fail blocks despite another's pass");
  gate(life, c.id, "security_review", "pass", "codex");
  assert.doesNotThrow(() => life.advance(c.id, AGENT));
  assert.equal(life.gateRecords(c.id, "security_review").length, 3, "history keeps the failed record");
});

test("a privileged or remote skill needs two distinct passing security reviewers", () => {
  const { life } = fresh();
  for (const risk of ["privileged", "remote"] as const) {
    const c = propose(life, { riskClass: risk, name: `s-${risk}`, sha: risk === "remote" ? OTHER : HASH });
    const sha = c.artifactSha256;
    life.advance(c.id, AGENT);
    gate(life, c.id, "research", "pass", "claude-code", sha);
    life.advance(c.id, AGENT);
    gate(life, c.id, "security_review", "pass", "codex", sha);
    gate(life, c.id, "security_review", "pass", "codex", sha);
    assert.equal(code(() => life.advance(c.id, AGENT)), "gate_not_met", "the same reviewer twice is still one");
    gate(life, c.id, "security_review", "pass", "gemini", sha);
    assert.doesNotThrow(() => life.advance(c.id, AGENT));
  }
});

test("evidence about another artifact never counts: records are bound to the candidate's SHA-256", () => {
  const { life } = fresh();
  const c = propose(life);
  life.advance(c.id, AGENT);
  assert.equal(code(() => gate(life, c.id, "research", "pass", "x", OTHER)), "artifact_mismatch");
  assert.equal(code(() => gate(life, c.id, "research", "pass", "x", "zz")), "invalid_field");
  // A changed artifact is a new candidate, and the old record does not carry over.
  const v2 = propose(life, { sha: OTHER });
  assert.notEqual(v2.id, c.id);
  assert.equal(life.gateRecords(v2.id).length, 0);
  assert.equal(code(() => propose(life, { sha: OTHER })), "conflict", "the same artifact cannot be proposed twice");
});

test("only a person releases, rejects or revokes; an agent cannot approve itself", () => {
  const { life } = fresh();
  const c = propose(life);
  toAwaiting(life, c.id);
  assert.equal(code(() => life.release(c.id, AGENT)), "approval_requires_user");
  assert.equal(code(() => life.release(c.id, { kind: "system", id: "orchestrator" })), "approval_requires_user");
  assert.equal(code(() => life.reject(c.id, AGENT, "no")), "approval_requires_user");
  assert.equal(life.get(c.id).state, "awaiting_approval");
  life.release(c.id, USER);
  assert.equal(code(() => life.revoke(c.id, AGENT, "x")), "approval_requires_user");
  assert.equal(life.revoke(c.id, USER, "guvenlik acigi").state, "revoked");
  assert.ok(life.versions(c.id).every((v) => v.revokedAt !== null));
  assert.equal(code(() => life.release(c.id, USER)), "conflict");
  assert.equal(code(() => life.advance(c.id, AGENT)), "conflict");
  assert.equal(code(() => gate(life, c.id, "isolated_test", "pass", "x")), "conflict", "no records after revoke");
});

test("a rejected candidate is final; reject needs a reason", () => {
  const { life } = fresh();
  const c = propose(life);
  assert.equal(code(() => life.reject(c.id, USER, "")), "invalid_field");
  assert.equal(life.reject(c.id, USER, "kaynak guvenilir degil").state, "rejected");
  assert.equal(code(() => life.advance(c.id, AGENT)), "conflict");
  assert.equal(code(() => life.reject(c.id, USER, "again")), "conflict");
});

test("history is append-only in SQL: gate records, events, released versions and candidate fields cannot be rewritten or deleted", () => {
  const { life, db } = fresh();
  const c = propose(life);
  toAwaiting(life, c.id);
  life.release(c.id, USER);
  const bad = (sql: string) => assert.throws(() => db.exec(sql), /append-only|cannot be|never deleted|fixed once/, sql);
  bad("UPDATE skill_gate_records SET verdict = 'pass'");
  bad("DELETE FROM skill_gate_records");
  bad("UPDATE skill_events SET to_state = 'released'");
  bad("DELETE FROM skill_events");
  bad(`UPDATE skill_versions SET artifact_sha256 = '${OTHER}'`);
  bad("DELETE FROM skill_versions");
  bad(`UPDATE skill_candidates SET artifact_sha256 = '${OTHER}'`);
  bad("UPDATE skill_candidates SET risk_class = 'contained'");
  bad("DELETE FROM skill_candidates");
});

test("input is validated and secrets in free text are redacted", () => {
  const { life } = fresh();
  const base = { name: "ok", origin: "o", description: "d", riskClass: "contained" as const, artifactSha256: HASH };
  assert.equal(code(() => life.propose({ ...base, name: "../kotu" }, AGENT)), "invalid_field");
  assert.equal(code(() => life.propose({ ...base, riskClass: "safe" as never }, AGENT)), "invalid_field");
  assert.equal(code(() => life.propose({ ...base, artifactSha256: "ABC" }, AGENT)), "invalid_field");
  assert.equal(code(() => life.propose({ ...base, origin: "" }, AGENT)), "invalid_field");
  const key = "sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2";
  const c = life.propose({ ...base, origin: `https://x.test/?k=${key}` }, AGENT);
  assert.ok(!c.origin.includes(key));
});

test("this module only keeps records: it imports no filesystem, network or process API and never evaluates anything", () => {
  const src = readFileSync(new URL("./lifecycle.ts", import.meta.url), "utf8");
  const imports = [...src.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
  for (const i of imports) assert.ok(!/^node:(fs|child_process|http|https|net|dgram|worker_threads|vm)/.test(i ?? ""), `forbidden import ${i}`);
  assert.ok(!/\b(eval|new Function|import\()\b/.test(src.replace(/\/\/.*$/gm, "")), "no dynamic code");
  assert.ok(!/\b(spawn|exec|fetch|writeFile|createWriteStream)\s*\(/.test(src.replace(/\/\/.*$/gm, "").replace(/this\.db\.exec/g, "")), "no process, network or file calls");
});

test("reviewer identities are normalised: case, spaces and the actor prefix cannot fake independence or a second reviewer", () => {
  const { life } = fresh();
  const c = propose(life, { riskClass: "privileged" });
  life.advance(c.id, AGENT);
  gate(life, c.id, "research", "info", "x");
  life.advance(c.id, AGENT);
  assert.equal(code(() => gate(life, c.id, "security_review", "pass", " Agent:Claude-Code ")), "not_independent");
  gate(life, c.id, "security_review", "pass", "Codex");
  gate(life, c.id, "security_review", "pass", " codex ");
  assert.equal(code(() => life.advance(c.id, AGENT)), "gate_not_met", "Codex and codex are one reviewer");
});

test("status regressions and INSERT OR REPLACE are blocked in SQL (skills)", () => {
  const { life, db } = fresh();
  const c = propose(life);
  toAwaiting(life, c.id);
  life.release(c.id, USER);
  assert.throws(() => db.prepare("UPDATE skill_candidates SET state = 'candidate' WHERE id = ?").run(c.id), /final|released/);
  life.revoke(c.id, USER, "x");
  assert.throws(() => db.prepare("UPDATE skill_candidates SET state = 'released' WHERE id = ?").run(c.id), /final/);
  assert.throws(() => db.prepare("UPDATE skill_versions SET revoked_at = NULL WHERE skill_id = ?").run(c.id), /stays revoked/);
  assert.throws(() => db.prepare("UPDATE skill_candidates SET current_version = 0 WHERE id = ?").run(c.id), /forward/);
  assert.throws(() => db.prepare("INSERT OR REPLACE INTO skill_events (id, skill_id, to_state, actor_kind, actor_id, created_at) SELECT id, skill_id, 'x', 'a', 'b', 'c' FROM skill_events LIMIT 1").run(), /append-only/);
});
