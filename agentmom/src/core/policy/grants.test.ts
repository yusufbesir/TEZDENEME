// Geçici yetenek izinleri testleri (madde 77, D5b). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek SQLite (bellek içi) ve gerçek politika motoru; model/ağ yok. İzin, SADECE "onay gerekir" kararını gevşetebilir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { mkTmp } from "../../testing/tmp.ts";
import { AuditLog, SqliteAuditSink } from "../audit/audit.ts";
import { DEFAULT_CONFIG } from "../config/config.ts";
import { openDb } from "../db/db.ts";
import { migrate } from "../db/migrate.ts";
import { GrantError, GrantStore, evaluateWithGrants } from "./grants.ts";
import type { ActionRequest, AutonomyContract } from "./types.ts";

const USER = { kind: "user" as const, id: "yusuf" };
const AGENT = { kind: "agent" as const, id: "a1" };
const BASE = mkTmp("agentmom-grants-");

function world(startIso = "2026-10-23T10:00:00.000Z") {
  const clock = { t: new Date(startIso) };
  const now = () => new Date(clock.t);
  const db = openDb(":memory:");
  migrate(db);
  const audit = new AuditLog([new SqliteAuditSink(db)], now);
  const contract: AutonomyContract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedActions: ["task.create", "file.read", "file.write", "verification.run", "network.request"], allowedDirs: [BASE], forbiddenDirs: [join(BASE, "yasak")], approvalRequiredActions: ["file.write", "verification.run"] };
  const grants = new GrantStore(db, { audit, now });
  return { db, audit, contract, grants, clock, now };
}

const write = (target: string): ActionRequest => ({ actor: { kind: "agent", id: "a1" }, action: "file.write", target });
const good = { action: "file.write", scopeDir: join(BASE, "proje"), reason: "refactor için", ttlMinutes: 30, maxUses: 2 };

test("without a grant file.write needs approval; with a matching grant it is allowed once per use and then needs approval again", () => {
  const w = world();
  const t = join(BASE, "proje", "a.ts");
  assert.equal(evaluateWithGrants(write(t), w.contract, w.now(), w.grants).decision, "require_approval");
  const g = w.grants.create(good, USER, w.contract);
  assert.equal(g.state, "active");
  const d1 = evaluateWithGrants(write(t), w.contract, w.now(), w.grants, w.audit);
  assert.equal(d1.decision, "allow");
  assert.equal(d1.rule, "temporary_grant");
  assert.equal(evaluateWithGrants(write(t), w.contract, w.now(), w.grants).decision, "allow");
  const d3 = evaluateWithGrants(write(t), w.contract, w.now(), w.grants);
  assert.equal(d3.decision, "require_approval", "max uses reached");
  assert.equal(w.grants.get(g.id)?.state, "exhausted");
});

test("the grant is scoped by action and directory, and expires", () => {
  const w = world();
  w.grants.create(good, USER, w.contract);
  assert.equal(evaluateWithGrants(write(join(BASE, "baska", "a.ts")), w.contract, w.now(), w.grants).decision, "require_approval", "other directory");
  assert.equal(evaluateWithGrants({ ...write(join(BASE, "proje", "a.ts")), action: "verification.run" }, w.contract, w.now(), w.grants).decision, "require_approval", "other action");
  w.clock.t = new Date("2026-10-23T10:31:00.000Z");
  assert.equal(evaluateWithGrants(write(join(BASE, "proje", "a.ts")), w.contract, w.now(), w.grants).decision, "require_approval", "after 30 minutes");
  assert.equal(w.grants.list()[0]?.state, "expired");
});

test("a grant never loosens a denial: forbidden dir, outside scope, action not in contract, paid route, budget, expired contract", () => {
  const w = world();
  w.grants.create({ ...good, scopeDir: join(BASE, "proje") }, USER, w.contract);
  const denied = (req: ActionRequest, rule: string) => {
    const d = evaluateWithGrants(req, w.contract, w.now(), w.grants);
    assert.equal(d.decision, "deny", rule);
    assert.equal(d.rule, rule);
  };
  denied(write(join(BASE, "yasak", "x")), "path_forbidden");
  denied(write(join(BASE, "..", "disarida", "x")), "path_outside_scope");
  denied({ actor: AGENT, action: "shell.exec", target: join(BASE, "proje") }, "action_not_allowed");
  denied({ ...write(join(BASE, "proje", "x")), costUsd: 5 }, "budget_exceeded");
  const paid = evaluateWithGrants({ actor: AGENT, action: "file.write", target: join(BASE, "proje", "x"), route: { kind: "api_paid", providerId: "x" }, costUsd: 0 }, w.contract, w.now(), w.grants);
  assert.notEqual(paid.decision, "allow", "paid route still needs its own approval");
  const expired = { ...w.contract, expiresAt: "2026-10-23T09:00:00.000Z" };
  assert.equal(evaluateWithGrants(write(join(BASE, "proje", "x")), expired, w.now(), w.grants).rule, "contract_expired");
});

test("only the user creates or revokes grants; an agent is refused", () => {
  const w = world();
  assert.throws(() => w.grants.create(good, AGENT, w.contract), (e: unknown) => e instanceof GrantError && e.code === "approval_requires_user");
  const g = w.grants.create(good, USER, w.contract);
  assert.throws(() => w.grants.revoke(g.id, AGENT), (e: unknown) => e instanceof GrantError && e.code === "approval_requires_user");
  assert.equal(w.grants.revoke(g.id, USER).state, "revoked");
  assert.throws(() => w.grants.revoke(g.id, USER), (e: unknown) => e instanceof GrantError && e.code === "conflict");
  assert.equal(evaluateWithGrants(write(join(BASE, "proje", "a.ts")), w.contract, w.now(), w.grants).decision, "require_approval", "revoked grant is dead");
});

test("validation: ungrantable actions, ttl and uses limits, scope must be inside the contract and not touch forbidden dirs, reason required", () => {
  const w = world();
  const bad = (patch: object, code: string) => assert.throws(() => w.grants.create({ ...good, ...patch } as typeof good, USER, w.contract), (e: unknown) => e instanceof GrantError && e.code === code, JSON.stringify(patch));
  bad({ action: "shell.exec" }, "invalid_field");
  bad({ action: "network.request" }, "invalid_field");
  bad({ action: "policy.grant" }, "invalid_field");
  bad({ ttlMinutes: 1441 }, "invalid_field");
  bad({ ttlMinutes: 0 }, "invalid_field");
  bad({ maxUses: 0 }, "invalid_field");
  bad({ maxUses: 101 }, "invalid_field");
  bad({ maxUses: 1.5 }, "invalid_field");
  bad({ reason: "x" }, "invalid_field");
  bad({ scopeDir: "" }, "invalid_field");
  bad({ scopeDir: join(BASE, "..") }, "scope_outside_contract");
  bad({ scopeDir: join(BASE, "yasak", "alt") }, "scope_forbidden");
  bad({ scopeDir: BASE }, "scope_forbidden");
});

test("grant rows are append-only: content cannot be rewritten, uses only go up, a revocation is final, rows cannot be deleted", () => {
  const w = world();
  const g = w.grants.create(good, USER, w.contract);
  assert.throws(() => w.db.prepare("UPDATE capability_grants SET scope_dir = ? WHERE id = ?").run(BASE, g.id), /immutable/);
  assert.throws(() => w.db.prepare("UPDATE capability_grants SET expires_at = ? WHERE id = ?").run("2099-01-01T00:00:00Z", g.id), /immutable/);
  assert.throws(() => w.db.prepare("UPDATE capability_grants SET max_uses = 100 WHERE id = ?").run(g.id), /immutable/);
  w.db.prepare("UPDATE capability_grants SET uses = 1 WHERE id = ?").run(g.id);
  assert.throws(() => w.db.prepare("UPDATE capability_grants SET uses = 0 WHERE id = ?").run(g.id), /only increase/);
  assert.throws(() => w.db.prepare("DELETE FROM capability_grants WHERE id = ?").run(g.id), /append-only/);
  w.grants.revoke(g.id, USER);
  assert.throws(() => w.db.prepare("UPDATE capability_grants SET revoked_at = NULL WHERE id = ?").run(g.id), /final/);
});

test("create, use and revoke are audited; the reason is stripped of secrets", () => {
  const w = world();
  const g = w.grants.create({ ...good, reason: "token=abcdef123456 ile test" }, USER, w.contract);
  assert.ok(!g.reason.includes("abcdef123456"));
  evaluateWithGrants(write(join(BASE, "proje", "a.ts")), w.contract, w.now(), w.grants, w.audit);
  w.grants.revoke(g.id, USER);
  const actions = (w.db.prepare("SELECT action FROM audit_events ORDER BY rowid").all() as Array<{ action: string }>).map((r) => r.action);
  assert.deepEqual(actions, ["grant.create", "grant.use", "grant.revoke"]);
});

test("a request that already carries a user approval is not touched; an unscoped request never consumes a grant", () => {
  const w = world();
  const g = w.grants.create(good, USER, w.contract);
  assert.equal(evaluateWithGrants({ ...write(join(BASE, "proje", "a")), approval: { grantedBy: "user" } }, w.contract, w.now(), w.grants).rule, "within_contract");
  assert.equal(evaluateWithGrants({ actor: AGENT, action: "file.write" }, w.contract, w.now(), w.grants).decision, "deny", "target required stays a denial");
  assert.equal(w.grants.get(g.id)?.uses, 0);
});
