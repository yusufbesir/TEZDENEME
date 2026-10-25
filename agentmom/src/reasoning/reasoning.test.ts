import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { AuditLog, MemoryAuditSink } from "../core/audit/audit.ts";
import type { Actor } from "../core/policy/types.ts";
import { MemoryStore } from "../memory/store.ts";
import { Calibration, DecisionLedger, MAX_DECISION_DAYS, ReasoningError } from "./reasoning.ts";

const USER: Actor = { kind: "user", id: "yusuf" };
const AGENT: Actor = { kind: "agent", id: "claude-code" };
const DAY = 86_400_000;
const T0 = new Date("2026-10-21T12:00:00.000Z");
const at = (days: number) => new Date(T0.getTime() + days * DAY).toISOString();

function setup() {
  const db = openDb(":memory:");
  migrate(db);
  const clock = { at: T0 };
  const sink = new MemoryAuditSink();
  const audit = new AuditLog([sink]);
  const memory = new MemoryStore(db, () => clock.at);
  return { db, clock, sink, memory, ledger: new DecisionLedger(db, { audit, memory, now: () => clock.at }), cal: new Calibration(db, { audit, now: () => clock.at }) };
}

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof ReasoningError ? e.code : `other:${(e as Error).message}`;
  }
  return undefined;
}

const base = (over: Record<string, unknown> = {}) => ({ title: "Docker ertelendi", rationale: "Yerel D: calismasi bozulmasin.", scope: "agentmom", expiresAt: at(90), assumptions: [{ text: "Yerel calisma Docker olmadan yeterli", checkBy: at(30) }], ...over });

test("a decision must expire (future, at most a year), carries assumptions with check dates, and lands in memory with the same validity", () => {
  const { ledger, memory, clock } = setup();
  const d = ledger.record(base() as never, USER);
  assert.equal(d.status, "active");
  assert.equal(d.reviewState, "ok");
  assert.equal(d.assumptions.length, 1);
  assert.equal(d.assumptions[0]!.status, "unvalidated");
  const hit = memory.search("docker", { scope: "agentmom" })[0]!;
  assert.equal(hit.id, d.memoryRecordId);
  assert.equal(hit.validUntil, d.expiresAt);
  clock.at = new Date(T0.getTime() + 100 * DAY);
  assert.ok(memory.search("docker")[0]!.flags.includes("expired"), "recall flags the memory record when the decision expires");
  for (const bad of [{ expiresAt: at(-1) }, { expiresAt: at(MAX_DECISION_DAYS + 5) }, { expiresAt: "yarin" }, { title: "" }, { assumptions: [{ text: "x", checkBy: at(-2) }] }, { assumptions: [{ text: "", checkBy: at(5) }] }]) {
    assert.equal(code(() => ledger.record(base(bad) as never, USER)), "invalid_field", JSON.stringify(bad));
  }
});

test("review state is computed: expired or overdue-assumption = review_due, broken assumption = at_risk; nothing changes by itself", () => {
  const { ledger, clock } = setup();
  const d = ledger.record(base() as never, USER);
  clock.at = new Date(T0.getTime() + 31 * DAY);
  let cur = ledger.get(d.id);
  assert.equal(cur.reviewState, "review_due");
  assert.match(cur.reviewReasons.join(" "), /not validated/);
  assert.equal(cur.status, "active", "a due review changes no stored state");
  const a = cur.assumptions[0]!;
  ledger.setAssumption(a.id, "holds", "Dogrulandi: tum testler Docker olmadan calisti", USER);
  assert.equal(ledger.get(d.id).reviewState, "ok");
  clock.at = new Date(T0.getTime() + 91 * DAY);
  assert.equal(ledger.get(d.id).reviewState, "review_due");
  assert.match(ledger.get(d.id).reviewReasons.join(" "), /expiry/);
  ledger.setAssumption(a.id, "broken", "Yeni sandbox ihtiyaci bu varsayimi curuttu", USER);
  assert.equal(ledger.get(d.id).reviewState, "at_risk");
});

test("assumptions change only through evidence-bearing events; an agent can report broken but can never declare an assumption to hold", () => {
  const { ledger, sink } = setup();
  const d = ledger.record(base() as never, USER);
  const a = d.assumptions[0]!;
  assert.equal(code(() => ledger.setAssumption(a.id, "holds", "ben dogruladim kendim", AGENT)), "approval_requires_user");
  assert.equal(code(() => ledger.setAssumption(a.id, "holds", "kisa", USER)), "invalid_field", "evidence must say what was checked");
  assert.equal(code(() => ledger.setAssumption(a.id, "unvalidated" as never, "yeterince uzun kanit metni", USER)), "invalid_field");
  assert.equal(ledger.setAssumption(a.id, "broken", "Ajan testte bu varsayimin yanlis oldugunu gordu", AGENT).status, "broken");
  assert.equal(code(() => ledger.setAssumption(a.id, "broken", "ayni durum tekrar", USER)), "conflict");
  ledger.setAssumption(a.id, "holds", "Kullanici yeniden inceledi ve dogruladi", USER);
  assert.deepEqual(ledger.assumptionEvents(a.id).map((e) => `${e.from}>${e.to}:${e.actor}`), ["unvalidated>broken:agent:claude-code", "broken>holds:user:yusuf"]);
  assert.ok(sink.events.some((e) => e.action === "assumption.holds"));
  assert.equal(code(() => ledger.setAssumption("00000000-0000-0000-0000-000000000000", "broken", "yeterince uzun kanit metni", USER)), "not_found");
});

test("superseding keeps history and the old decision's assumptions leave the debt ledger; retiring is the user's call", () => {
  const { ledger } = setup();
  const old = ledger.record(base() as never, USER);
  const next = ledger.record(base({ title: "Docker yeniden degerlendirildi", supersedesId: old.id }) as never, USER);
  assert.equal(ledger.get(old.id).status, "superseded");
  assert.equal(next.supersedesId, old.id);
  assert.equal(ledger.debt().filter((x) => x.decisionId === old.id).length, 0);
  assert.equal(ledger.debt().filter((x) => x.decisionId === next.id).length, 1);
  assert.equal(code(() => ledger.record(base({ supersedesId: old.id }) as never, USER)), "conflict");
  assert.equal(code(() => ledger.retire(next.id, AGENT)), "approval_requires_user");
  assert.equal(ledger.retire(next.id, USER).status, "retired");
  assert.equal(ledger.list({ onlyActive: true }).length, 0);
  assert.equal(ledger.list().length, 2);
});

test("assumption debt lists broken first, then overdue (oldest first), then pending; validated assumptions are not debt", () => {
  const { ledger, clock } = setup();
  const d = ledger.record(base({ assumptions: [{ text: "A pending", checkBy: at(60) }, { text: "B overdue-late", checkBy: at(5) }, { text: "C overdue-early", checkBy: at(20) }, { text: "D broken", checkBy: at(40) }, { text: "E holds", checkBy: at(40) }] }) as never, USER);
  const byText = (t: string) => d.assumptions.find((a) => a.text.startsWith(t))!;
  ledger.setAssumption(byText("D").id, "broken", "Gozlem bu varsayimi curuttu tamam", USER);
  ledger.setAssumption(byText("E").id, "holds", "Kullanici dogruladi ve kayda gecti", USER);
  clock.at = new Date(T0.getTime() + 25 * DAY);
  assert.deepEqual(ledger.debt().map((x) => `${x.kind}:${x.text.charAt(0)}`), ["broken:D", "overdue:B", "overdue:C", "pending:A"]);
  assert.ok(ledger.debt()[1]!.overdueDays > ledger.debt()[2]!.overdueDays);
});

test("ledger history is fixed in SQL: decisions, assumptions, events and predictions cannot be rewritten or deleted", () => {
  const { ledger, cal, db } = setup();
  const d = ledger.record(base() as never, USER);
  ledger.setAssumption(d.assumptions[0]!.id, "broken", "kanit metni yeterince uzun", USER);
  const p = cal.record({ source: "codex", claim: "x", confidence: 0.8, dueAt: at(5) }, AGENT);
  cal.resolve(p.id, true, "kanit", USER);
  const bad = (sql: string, re = /fixed once|never deleted|append-only|resolved once|only moves forward|cannot be replaced|starts/) => assert.throws(() => db.exec(sql), re, sql);
  bad(`UPDATE decisions SET expires_at = '2099-01-01T00:00:00.000Z' WHERE id = '${d.id}'`);
  bad(`UPDATE decisions SET title = 'x' WHERE id = '${d.id}'`);
  bad("DELETE FROM decisions");
  bad("UPDATE decision_assumptions SET text = 'x'");
  bad("UPDATE decision_assumptions SET check_by = '2099-01-01T00:00:00.000Z'");
  bad("DELETE FROM decision_assumptions");
  bad("UPDATE assumption_events SET to_status = 'holds'");
  bad("DELETE FROM assumption_events");
  bad(`UPDATE predictions SET confidence = 0.99 WHERE id = '${p.id}'`);
  bad(`UPDATE predictions SET outcome = 0 WHERE id = '${p.id}'`);
  bad("DELETE FROM predictions");
  ledger.retire(d.id, USER);
  bad(`UPDATE decisions SET status = 'active' WHERE id = '${d.id}'`, /only moves forward/);
  bad(`INSERT INTO predictions (id, source, claim, confidence, due_at, created_at, outcome) VALUES ('${crypto.randomUUID()}', 's', 'c', 0.5, 'd', 'c', 1)`);
  bad(`INSERT INTO decision_assumptions (id, decision_id, text, check_by, status, created_at) VALUES ('${crypto.randomUUID()}', '${d.id}', 't', 'c', 'holds', 'c')`);
});

function seed(cal: Calibration, source: string, conf: number, hits: number, total: number, clock: { at: Date }): void {
  for (let i = 0; i < total; i++) {
    const p = cal.record({ source, claim: `${source} ${conf} #${i}`, confidence: conf, dueAt: new Date(clock.at.getTime() + DAY).toISOString() }, AGENT);
    cal.resolve(p.id, i < hits, "sonuc gozlendi", USER);
  }
}

test("calibration: too little data is NOT 'well calibrated'; enough data gives Brier, buckets and an over/under-confidence verdict", () => {
  const { cal, clock } = setup();
  seed(cal, "codex", 0.9, 5, 5, clock);
  const small = cal.report("codex");
  assert.equal(small.verdict, "insufficient_data");
  assert.equal(small.resolved, 5);
  seed(cal, "claude", 0.9, 9, 10, clock);
  seed(cal, "claude", 0.9, 6, 10, clock);
  const over = cal.report("claude");
  assert.equal(over.resolved, 20);
  assert.equal(over.verdict, "overconfident");
  assert.ok(over.gap! > 0.1);
  assert.ok(Math.abs(over.accuracy! - 0.75) < 1e-9);
  assert.ok(over.brier! > 0.1);
  const b = over.buckets.find((x) => x.range === "0.8-1.0")!;
  assert.equal(b.n, 20);
  assert.equal(b.enoughData, true);
  assert.equal(over.buckets.find((x) => x.range === "0.0-0.2")!.n, 0);
  seed(cal, "good", 0.8, 16, 20, clock);
  assert.equal(cal.report("good").verdict, "calibrated");
  seed(cal, "shy", 0.5, 18, 20, clock);
  assert.equal(cal.report("shy").verdict, "underconfident");
  assert.equal(cal.report().resolved, 5 + 20 + 20 + 20);
});

test("a prediction is committed before the outcome: future due date, immutable confidence, user-only resolution, resolved once", () => {
  const { cal, clock } = setup();
  assert.equal(code(() => cal.record({ source: "x", claim: "c", confidence: 0.7, dueAt: at(-1) }, AGENT)), "invalid_field");
  assert.equal(code(() => cal.record({ source: "x", claim: "c", confidence: 1.2, dueAt: at(1) }, AGENT)), "invalid_field");
  assert.equal(code(() => cal.record({ source: "", claim: "c", confidence: 0.5, dueAt: at(1) }, AGENT)), "invalid_field");
  const p = cal.record({ source: "x", claim: "c", confidence: 0.7, dueAt: at(1) }, AGENT);
  assert.equal(code(() => cal.resolve(p.id, true, "ben kendim", AGENT)), "approval_requires_user");
  assert.equal(code(() => cal.resolve(p.id, "evet" as never, "kanit", USER)), "invalid_field");
  assert.equal(cal.resolve(p.id, false, "sonuc yanlis cikti", USER).outcome, false);
  assert.equal(code(() => cal.resolve(p.id, true, "degistirmeye calisiyorum", USER)), "conflict");
  void clock;
});

test("selection-bias guard: leaving overdue predictions unresolved is reported, so only grading the good ones cannot fake calibration", () => {
  const { cal, clock } = setup();
  seed(cal, "s", 0.9, 5, 5, clock);
  for (let i = 0; i < 4; i++) cal.record({ source: "s", claim: `acik ${i}`, confidence: 0.9, dueAt: new Date(clock.at.getTime() + 2 * DAY).toISOString() }, AGENT);
  assert.equal(cal.report("s").selectionBiasWarning, false, "not yet due");
  clock.at = new Date(T0.getTime() + 10 * DAY);
  const r = cal.report("s");
  assert.equal(r.unresolvedOverdue, 4);
  assert.equal(r.selectionBiasWarning, true);
});

test("the reasoning module is arithmetic and records only: no process, network, file or model access", () => {
  const src = readFileSync(new URL("./reasoning.ts", import.meta.url), "utf8");
  const code2 = src.replace(/\/\/.*$/gm, "");
  const imports = [...src.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1] ?? "");
  for (const i of imports) {
    assert.ok(!/^node:(fs|child_process|http|https|net|dgram|worker_threads|vm)/.test(i), `forbidden import ${i}`);
    assert.ok(!/providers|policy\/engine|core\/config|secrets/.test(i), `must not import ${i}`);
  }
  assert.ok(!/\b(eval|new Function|spawn|execFile|fetch|writeFileSync|readFileSync)\b/.test(code2));
});

test("review fixes: strict dates, user-only decisions, memory follows the decision's lifecycle, no duplicate collapse, scope/source validated", () => {
  const { ledger, cal, memory } = setup();
  for (const bad of ["2026-02-30T10:00:00Z", "2026-10-21 10:00 junk", "2026-10-21", "2027-01-01T10:00:00", "9999-12-31"]) {
    assert.equal(code(() => ledger.record(base({ expiresAt: bad }) as never, USER)), "invalid_field", bad);
  }
  assert.equal(code(() => ledger.record(base() as never, AGENT)), "approval_requires_user", "an agent proposes through a task, it does not record decisions");
  const a = ledger.record(base() as never, USER);
  const same = ledger.record(base() as never, USER);
  assert.notEqual(same.memoryRecordId, a.memoryRecordId, "same words, separate memory records");
  assert.equal(memory.get(a.memoryRecordId!).status, "active");
  const next = ledger.record(base({ title: "Docker yeniden", supersedesId: a.id }) as never, USER);
  assert.equal(memory.get(a.memoryRecordId!).status, "retired", "superseded decision leaves recall");
  ledger.retire(next.id, USER);
  assert.equal(memory.get(next.memoryRecordId!).status, "retired");
  assert.equal(code(() => ledger.record(base({ scope: "../kotu" }) as never, USER)), "invalid_field");
  assert.equal(code(() => ledger.record(base({ scope: "sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2" }) as never, USER)), "invalid_field");
  assert.equal(code(() => cal.record({ source: "sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2", claim: "c", confidence: 0.5, dueAt: at(2) }, AGENT)), "invalid_field");
  assert.equal(code(() => cal.record({ source: "x", claim: "c", confidence: 0.5, dueAt: "9999-12-31T00:00:00Z" }, AGENT)), "invalid_field", "due date at most a year away");
  assert.equal(cal.record({ source: "x", claim: "c", confidence: 0.5, dueAt: at(2) }, AGENT).id.length > 10, true);
});

test("an assumption status can only change together with a matching logged event, and an event must start from the real status (direct SQL cannot fake a validation)", () => {
  const { ledger, db } = setup();
  const d = ledger.record(base() as never, USER);
  const aid = d.assumptions[0]!.id;
  assert.throws(() => db.prepare("UPDATE decision_assumptions SET status = 'holds', evidence = 'sahte', checked_by = 'x', checked_at = 'y' WHERE id = ?").run(aid), /matching logged event/);
  assert.throws(() => db.prepare("INSERT INTO assumption_events (id, assumption_id, from_status, to_status, evidence, actor_kind, actor_id, created_at) VALUES (?, ?, 'broken', 'holds', 'e', 'user', 'x', 'now')").run(crypto.randomUUID(), aid), /real current status/);
  ledger.setAssumption(aid, "holds", "Gercek dogrulama kaydi yeterince uzun", USER);
  assert.equal(ledger.get(d.id).assumptions[0]!.status, "holds");
});

test("a biased sample gets no flattering verdict, and a failed memory write inside the ledger's transaction leaves nothing behind (savepoint path)", () => {
  const { cal, clock, ledger, memory, db } = setup();
  seed(cal, "s", 0.8, 16, 20, clock);
  assert.equal(cal.report("s").verdict, "calibrated");
  for (let i = 0; i < 12; i++) cal.record({ source: "s", claim: `bekleyen ${i}`, confidence: 0.8, dueAt: at(2) }, AGENT);
  clock.at = new Date(T0.getTime() + 10 * DAY);
  const r = cal.report("s");
  assert.equal(r.selectionBiasWarning, true);
  assert.equal(r.verdict, "biased_sample");
  db.exec("BEGIN IMMEDIATE");
  assert.throws(() => memory.add({ kind: "note", title: "t", body: "b", source: "s", scope: "../x", confidence: 0.5 }));
  assert.equal(db.isTransaction, true, "the outer transaction survives an inner failure");
  db.exec("ROLLBACK");
  const before = ledger.list().length;
  assert.throws(() => ledger.record(base({ supersedesId: "00000000-0000-0000-0000-000000000000" }) as never, USER));
  assert.equal(ledger.list().length, before);
  assert.equal(memory.list().length, 0);
});
