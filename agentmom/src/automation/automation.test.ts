// Olay tetiklemeli otomasyon + değişiklik defteri + veri sınırı testleri (madde 13, 78, 76; D5b). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf.
// Yalnız yazan yapay zeka değiştirir. Gerçek SQLite (bellek içi) ve gerçek politika motoru; model/ağ yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { AuditLog, SqliteAuditSink } from "../core/audit/audit.ts";
import { ChangeLedger, ChangeLedgerError } from "../core/audit/change-ledger.ts";
import { DEFAULT_CONFIG } from "../core/config/config.ts";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { allowedRouteKinds, classifyData, classifyPath, classifyText } from "../core/policy/data-boundary.ts";
import { evaluate } from "../core/policy/engine.ts";
import type { ActionRequest, AutonomyContract } from "../core/policy/types.ts";
import { AUTOMATION_ACTOR, AutomationEngine, AutomationError, matchesPattern } from "./automation.ts";

const USER = { kind: "user" as const, id: "yusuf" };
const AGENT = { kind: "agent" as const, id: "a1" };
const BASE = mkTmp("agentmom-d5b-");

function world() {
  const clock = { t: new Date("2026-10-23T10:00:00.000Z") };
  const now = () => new Date(clock.t);
  const db = openDb(":memory:");
  migrate(db);
  const engine = new AutomationEngine(db, { now });
  const audit = new AuditLog([new SqliteAuditSink(db), engine], now);
  return { db, engine, audit, clock, now };
}
const ev = (audit: AuditLog, action: string, initiator = USER) => audit.record({ initiator, action, decision: "allow", result: "ok" });

test("matchesPattern: exact action or trailing-star prefix only", () => {
  assert.equal(matchesPattern("backup.failed", "backup.failed"), true);
  assert.equal(matchesPattern("backup.failed", "backup.failed2"), false);
  assert.equal(matchesPattern("backup.*", "backup.decision"), true);
  assert.equal(matchesPattern("task.create:*", "task.create:file.read"), true);
  assert.equal(matchesPattern("task.*", "grant.create"), false);
});

test("only the user creates rules; names, patterns, cooldown and actions are validated; bare * and automation.* are refused", () => {
  const w = world();
  const ok = { name: "yedek hatası", eventPattern: "backup.failed", actionKind: "notify", params: { message: "Yedek başarısız oldu" }, cooldownSeconds: 60 };
  assert.throws(() => w.engine.createRule(ok, AGENT), (e: unknown) => e instanceof AutomationError && e.code === "approval_requires_user");
  const bad = (patch: object) => assert.throws(() => w.engine.createRule({ ...ok, ...patch } as typeof ok, USER), (e: unknown) => e instanceof AutomationError && e.code === "invalid_field", JSON.stringify(patch));
  bad({ eventPattern: "*" });
  bad({ eventPattern: "automation.run" });
  bad({ eventPattern: "Backup Failed" });
  bad({ cooldownSeconds: 5 });
  bad({ cooldownSeconds: 100000 });
  bad({ name: "x" });
  bad({ actionKind: "shell" });
  bad({ actionKind: "record_task", params: { title: "okuma görevi", action: "shell.exec", target: BASE } });
  bad({ actionKind: "record_task", params: { title: "okuma görevi", action: "file.read", target: "" } });
  assert.equal(w.engine.createRule(ok, USER).enabled, true);
});

test("a notify rule fires on a matching audit event and writes a run row; non-matching events do nothing", async () => {
  const w = world();
  const r = w.engine.createRule({ name: "yedek hatası", eventPattern: "backup.failed", actionKind: "notify", params: { message: "Yedek başarısız" }, cooldownSeconds: 60 }, USER);
  ev(w.audit, "task.create:file.read");
  ev(w.audit, "backup.failed", { kind: "system", id: "backup-scheduler" } as unknown as typeof USER);
  await w.engine.idle();
  const runs = w.engine.listRuns();
  assert.equal(runs.length, 1);
  assert.equal(runs[0]?.outcome, "notified");
  assert.equal(runs[0]?.ruleId, r.id);
  assert.equal(runs[0]?.message, "Yedek başarısız");
});

test("cooldown suppresses repeats (one skip row, not one per event); after the cooldown it fires again; disabled rules never fire", async () => {
  const w = world();
  const r = w.engine.createRule({ name: "olay bildir", eventPattern: "x.*", actionKind: "notify", params: { message: "olay oldu" }, cooldownSeconds: 60 }, USER);
  for (let i = 0; i < 5; i++) ev(w.audit, `x.${i}`);
  await w.engine.idle();
  let outcomes = w.engine.listRuns().map((x) => x.outcome).sort();
  assert.deepEqual(outcomes, ["notified", "skipped_cooldown"]);
  w.clock.t = new Date("2026-10-23T10:02:00.000Z");
  ev(w.audit, "x.again");
  await w.engine.idle();
  assert.equal(w.engine.listRuns().filter((x) => x.outcome === "notified").length, 2);
  w.engine.setEnabled(r.id, false, USER);
  w.clock.t = new Date("2026-10-23T11:00:00.000Z");
  ev(w.audit, "x.off");
  await w.engine.idle();
  assert.equal(w.engine.listRuns().filter((x) => x.outcome === "notified").length, 2);
  assert.throws(() => w.engine.setEnabled(r.id, true, AGENT), (e: unknown) => e instanceof AutomationError && e.code === "approval_requires_user");
  outcomes = [];
});

test("loop protection: events written by the automation itself never trigger rules; a record_task rule runs through the task creator exactly once", async () => {
  const w = world();
  const created: Array<{ title: string; request: ActionRequest }> = [];
  w.engine.setTaskCreator((title, request) => {
    created.push({ title, request });
    // Gerçek uygulamada görev oluşturma bir denetim olayı yazar; otomasyon kaynaklı olduğu için yeniden tetiklememeli.
    w.audit.record({ initiator: request.actor, action: `task.create:${request.action}`, decision: "require_approval", result: "x" });
  });
  w.engine.createRule({ name: "her görevde kontrol", eventPattern: "task.*", actionKind: "record_task", params: { title: "Gözden geçirme okuması", action: "file.read", target: BASE }, cooldownSeconds: 10 }, USER);
  ev(w.audit, "task.approve");
  await w.engine.idle();
  await w.engine.idle();
  assert.equal(created.length, 1, "no feedback loop");
  assert.deepEqual(created[0]?.request.actor, AUTOMATION_ACTOR);
  assert.equal(created[0]?.request.action, "file.read");
});

test("a failing task creator is recorded as an error run and never breaks the audit write", async () => {
  const w = world();
  w.engine.setTaskCreator(() => {
    throw new Error("disk dolu token=abcdef123456");
  });
  w.engine.createRule({ name: "hata dene", eventPattern: "y.*", actionKind: "record_task", params: { title: "Görev kaydı aç", action: "verification.run", target: BASE }, cooldownSeconds: 10 }, USER);
  assert.doesNotThrow(() => ev(w.audit, "y.1"));
  await w.engine.idle();
  const run = w.engine.listRuns()[0];
  assert.equal(run?.outcome, "error");
  assert.ok(!run?.message.includes("abcdef123456"));
  const n = (w.db.prepare("SELECT count(*) AS n FROM audit_events").get() as { n: number }).n;
  assert.equal(Number(n), 1, "the original event was written");
});

test("rules and runs are append-only in storage: rule content is immutable, rules and runs cannot be deleted", () => {
  const w = world();
  const r = w.engine.createRule({ name: "kural bir", eventPattern: "z.1", actionKind: "notify", params: { message: "mesaj var" }, cooldownSeconds: 10 }, USER);
  assert.throws(() => w.db.prepare("UPDATE automation_rules SET event_pattern = 'z.*' WHERE id = ?").run(r.id), /immutable/);
  assert.throws(() => w.db.prepare("UPDATE automation_rules SET params_json = '{}' WHERE id = ?").run(r.id), /immutable/);
  assert.throws(() => w.db.prepare("DELETE FROM automation_rules WHERE id = ?").run(r.id), /not deleted/);
  w.db.prepare("INSERT INTO automation_runs (id, rule_id, ts, event_action, event_id, outcome, message) VALUES ('1', ?, 't', 'a', NULL, 'notified', 'm')").run(r.id);
  assert.throws(() => w.db.prepare("DELETE FROM automation_runs WHERE id = '1'").run(), /append-only/);
  assert.throws(() => w.db.prepare("UPDATE automation_runs SET outcome = 'error' WHERE id = '1'").run(), /append-only/);
});

test("change ledger: validates kind/summary/reason, strips secrets, stays append-only, filters by kind and task", () => {
  const db = openDb(":memory:");
  migrate(db);
  const ledger = new ChangeLedger(db, { now: () => new Date("2026-10-23T10:00:00.000Z") });
  const e = ledger.record({ kind: "manual", summary: "Yapılandırma güncellendi", reason: "api_key=abcdef123456 yerine referans", taskId: "t-1", files: ["a.ts", "b.ts"] }, USER);
  assert.ok(!e.reason.includes("abcdef123456"));
  assert.deepEqual(e.files, ["a.ts", "b.ts"]);
  assert.equal(e.actor, "user:yusuf");
  assert.throws(() => ledger.record({ kind: "yok", summary: "bir şey oldu", reason: "çünkü" }, USER), (er: unknown) => er instanceof ChangeLedgerError && er.code === "invalid_field");
  assert.throws(() => ledger.record({ kind: "manual", summary: "x", reason: "çünkü" }, USER), (er: unknown) => er instanceof ChangeLedgerError);
  ledger.record({ kind: "grant", summary: "Geçici izin", reason: "refactor" }, USER);
  assert.equal(ledger.list({ kind: "grant" }).length, 1);
  assert.equal(ledger.list({ taskId: "t-1" }).length, 1);
  assert.equal(ledger.list().length, 2);
  assert.throws(() => db.prepare("UPDATE change_ledger SET summary = 'x'").run(), /append-only/);
  assert.throws(() => db.prepare("DELETE FROM change_ledger").run(), /append-only/);
});

test("data boundary: classification is deterministic; secret stays local, sensitive never goes to a paid route; the router lists the allowed routes", () => {
  const contract: AutonomyContract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedActions: ["provider.call", "provider.switch", "network.request", "file.read"], allowedProviders: ["p"], allowedDirs: [BASE], forbiddenDirs: [join(BASE, "anahtar")], sensitiveDirs: [join(BASE, "kisisel")], paidRoute: "approved", budget: { maxUsd: 10, spentUsd: 0 }, approvalRequiredActions: [] };
  assert.equal(classifyPath(join(BASE, "anahtar", "x"), contract), "secret");
  assert.equal(classifyPath(join(BASE, "proje", ".env"), contract), "secret");
  assert.equal(classifyPath(join(BASE, "proje", "id_rsa"), contract), "secret");
  assert.equal(classifyPath(join(BASE, "kisisel", "not.md"), contract), "sensitive");
  assert.equal(classifyPath(join(BASE, "proje", "kod.ts"), contract), "internal");
  assert.equal(classifyText("normal bir metin"), "internal");
  assert.equal(classifyText("token=abcdef1234567890"), "secret");
  assert.equal(classifyData({ paths: [join(BASE, "proje", "kod.ts"), join(BASE, "kisisel", "n.md")] }, contract), "sensitive");
  assert.equal(classifyData({ paths: [join(BASE, "proje", "kod.ts")], text: "sk-abcdefghijklmnopqrstuvwxyz" }, contract), "secret");
  assert.deepEqual(allowedRouteKinds("secret"), ["local"]);
  assert.deepEqual(allowedRouteKinds("sensitive"), ["local", "subscription"]);
  assert.deepEqual(allowedRouteKinds("internal"), ["local", "subscription", "api_paid"]);
  const t = join(BASE, "proje");
  const call = (route: "local" | "subscription" | "api_paid", dataClass: ActionRequest["dataClass"], action: ActionRequest["action"] = "provider.call") => evaluate({ actor: AGENT, action, target: t, route: { kind: route, providerId: "p" }, costUsd: 0, dataClass, ...(action === "provider.switch" ? { previousRoute: { kind: route, providerId: "p" } } : {}) }, contract, new Date("2026-10-23T10:00:00Z"));
  assert.equal(call("subscription", "secret").rule, "data_boundary_secret");
  assert.equal(call("api_paid", "secret").rule, "data_boundary_secret");
  assert.equal(call("local", "secret").decision, "allow");
  assert.equal(call("api_paid", "sensitive").rule, "data_boundary_sensitive");
  assert.equal(call("subscription", "sensitive").decision, "allow");
  assert.equal(call("api_paid", "internal").decision, "allow");
  assert.equal(call("subscription", "secret", "provider.switch").rule, "data_boundary_secret");
  assert.equal(evaluate({ actor: AGENT, action: "network.request", target: t, dataClass: "secret" }, contract, new Date("2026-10-23T10:00:00Z")).rule, "data_boundary_secret");
  assert.equal(evaluate({ actor: AGENT, action: "network.request", target: t }, contract, new Date("2026-10-23T10:00:00Z")).decision, "allow", "no class given: rule not applied");
  // user approval does not override the boundary
  assert.equal(evaluate({ actor: AGENT, action: "provider.call", target: t, route: { kind: "api_paid", providerId: "p" }, costUsd: 0, dataClass: "secret", approval: { grantedBy: "user", paidRoute: true } }, contract, new Date("2026-10-23T10:00:00Z")).decision, "deny");
});

test("data boundary review fixes: a parent of a sensitive dir is sensitive too; ledger files must be an array", () => {
  const contract = { forbiddenDirs: [], sensitiveDirs: [join(BASE, "ik")] };
  assert.equal(classifyPath(BASE, contract), "sensitive", "repo path that contains a sensitive dir");
  assert.equal(classifyPath(join(BASE, "ik", "maas.csv"), contract), "sensitive");
  assert.equal(classifyPath(join(BASE, "diger"), contract), "internal");
  const db = openDb(":memory:");
  migrate(db);
  const ledger = new ChangeLedger(db);
  assert.throws(() => ledger.record({ kind: "manual", summary: "bir şey oldu", reason: "çünkü", files: "a.ts" as unknown as string[] }, USER), (e: unknown) => e instanceof ChangeLedgerError && e.code === "invalid_field");
});
