// Dikkat bütçesi yöneticisi testleri. Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Saf sıralama: görevler doğrudan nesne olarak verilir (veritabanı yok); girdi değişmemeli.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG } from "./config/config.ts";
import type { Task } from "./tasks/tasks.ts";
import { DEFAULT_BUDGET, MAX_BUDGET, planAttention } from "./attention.ts";

const contract = DEFAULT_CONFIG.policy.defaultContract;
const NOW = new Date("2026-10-21T12:00:00.000Z");
const HOUR = 3_600_000;
const waitingSince = (hours: number) => new Date(NOW.getTime() - hours * HOUR).toISOString();

let n = 0;
function task(requestedAction: string, request: unknown, over: Partial<Task> = {}): Task {
  n++;
  return { id: `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`, title: `Görev ${n}`, description: null, state: "awaiting_approval", requestedAction, request, decision: "ask", approvedBy: null, createdAt: waitingSince(1), updatedAt: waitingSince(1), ...over };
}
// shell.exec (50) + silme komutu (+25) => kritik; file.read düşük; policy.grant yüksek.
// Her çağrı FARKLI komut taşır (aynı girdili görevler gruplanır; bu testlerde gruplama istenmiyor). Komutlar riski değiştirmez.
const critical = (over: Partial<Task> = {}) => task("shell.exec", { command: `rm -rf build${n + 1}` }, over);
const low = (over: Partial<Task> = {}) => task("file.read", { command: `echo ${n + 1}` }, over);
const high = (over: Partial<Task> = {}) => task("policy.grant", { command: `echo ${n + 1}` }, over);

test("tiers: budget slots 'now', then 2×budget 'today', the rest 'batch'; ordered by risk", () => {
  const tasks = [critical(), ...Array.from({ length: 4 }, () => high()), ...Array.from({ length: 6 }, () => low())];
  const p = planAttention(tasks, contract, { budget: 2, now: NOW });
  assert.equal(p.totalAwaiting, 11);
  assert.equal(p.budget, 2);
  assert.deepEqual(p.counts, { now: 2, today: 4, batch: 5, critical: 1 });
  assert.equal(p.overBudget, false);
  assert.deepEqual(p.items.map((i) => i.tier).slice(0, 7), ["now", "now", "today", "today", "today", "today", "batch"]);
  assert.equal(p.items[0]!.riskLevel, "critical");
  assert.equal(p.items[0]!.critical, true);
  assert.equal(p.items[1]!.riskLevel, "high");
  assert.ok(p.items.every((i, k) => k === 0 || p.items[k - 1]!.priority >= i.priority), "sorted by priority");
  assert.ok(p.items.slice(1, 5).every((i) => i.requestedAction === "policy.grant"));
  assert.equal(p.items[0]!.tierLabel, "şimdi");
  assert.equal(p.items.at(-1)!.tierLabel, "toplu/sonra");
});

test("critical risk is always 'now' and flagged, even when it exceeds the budget; others spill over to 'today'", () => {
  const tasks = [critical(), critical(), critical(), high(), low()];
  const p = planAttention(tasks, contract, { budget: 1, now: NOW });
  assert.equal(p.overBudget, true);
  assert.deepEqual(p.counts, { now: 3, today: 2, batch: 0, critical: 3 });
  assert.ok(p.items.filter((i) => i.critical).every((i) => i.tier === "now"));
  assert.ok(p.items.filter((i) => !i.critical).every((i) => i.tier === "today"));
  assert.ok(p.items[0]!.reasons.some((r) => /silme/.test(r)), "reasons carry the risk reasons");
});

test("critical tasks consume the budget: remaining 'now' slots = budget − critical count", () => {
  const p = planAttention([critical(), high(), high(), high()], contract, { budget: 2, now: NOW });
  assert.deepEqual(p.counts, { now: 2, today: 2, batch: 0, critical: 1 });
});

test("waiting time breaks ties and ages tasks (at most +10 priority)", () => {
  const old = low({ updatedAt: waitingSince(24 * 6) });
  const fresh = low({ updatedAt: waitingSince(1) });
  const p = planAttention([fresh, old], contract, { budget: 5, now: NOW });
  assert.equal(p.items[0]!.taskId, old.id);
  assert.equal(p.items[0]!.waitingMinutes, 24 * 6 * 60);
  assert.equal(p.items[0]!.priority - p.items[0]!.riskScore, 10, "aging is capped at 5 days = +10");
  // yaşlanma riski aşmaz: bekleyen düşük görev taze yüksek görevi geçmez
  const q = planAttention([old, high()], contract, { budget: 5, now: NOW });
  assert.equal(q.items[0]!.riskLevel, "high");
});

test("only awaiting_approval tasks are included; default budget is 5", () => {
  const tasks = [low(), low({ state: "approved" }), low({ state: "denied" }), low({ state: "pending" })];
  const p = planAttention(tasks, contract, { now: NOW });
  assert.equal(p.totalAwaiting, 1);
  assert.equal(p.budget, DEFAULT_BUDGET);
  assert.deepEqual(planAttention([], contract, { now: NOW }).items, []);
  assert.deepEqual(planAttention([], contract, { now: NOW }).counts, { now: 0, today: 0, batch: 0, critical: 0 });
});

test("budget validation: 1..50 integers only", () => {
  for (const b of [0, -1, 51, 1.5, NaN, Infinity, 1e9]) assert.throws(() => planAttention([low()], contract, { budget: b, now: NOW }), RangeError, String(b));
  assert.doesNotThrow(() => planAttention([low()], contract, { budget: 1, now: NOW }));
  assert.doesNotThrow(() => planAttention([low()], contract, { budget: MAX_BUDGET, now: NOW }));
});

test("pure: the input is not mutated, the result is deterministic, secrets in titles are masked, malformed dates do not break it", () => {
  const tasks = [critical({ title: "Anahtar sk-abcdefghijklmnopqrstuvwxyz0123 ile çalış" }), low({ updatedAt: "bozuk-tarih" }), high()];
  const before = JSON.stringify(tasks);
  const a = planAttention(tasks, contract, { budget: 3, now: NOW });
  assert.equal(JSON.stringify(tasks), before);
  assert.deepEqual(planAttention(tasks, contract, { budget: 3, now: NOW }), a);
  assert.doesNotMatch(JSON.stringify(a), /sk-abcdef/);
  assert.ok(a.items.every((i) => Number.isFinite(i.priority) && Number.isFinite(i.waitingMinutes)));
  assert.match(a.note, /karar kullanıcıdadır/);
});

test("grouping: repeated identical tasks collapse into ONE row with a count; 1100 cheap tasks cannot push an old critical task out of \"now\"", () => {
  const oldCritical = critical({ updatedAt: waitingSince(24 * 30) });
  const spam = Array.from({ length: 1100 }, () => task("policy.grant", { command: "echo spam" }));
  const p = planAttention([...spam, oldCritical], contract, { budget: 1, now: NOW });
  assert.equal(p.totalAwaiting, 1101);
  assert.equal(p.totalGroups, 2);
  const crit = p.items.find((i) => i.taskId === oldCritical.id)!;
  assert.equal(crit.tier, "now");
  assert.equal(crit.critical, true);
  const grp = p.items.find((i) => i.requestedAction === "policy.grant")!;
  assert.equal(grp.count, 1100);
  assert.equal(grp.taskIds.length, 20);
  assert.equal(grp.tier, "today", "the spam group does not take a budget slot from the critical task");
  assert.match(p.note, /tek satırda toplar/);
  assert.equal(p.truncated, false);
});

test("different targets/commands/providers are not grouped; truncation and the real total are reported", () => {
  const a = task("file.write", { target: "x/a.ts" });
  const b = task("file.write", { target: "x/b.ts" });
  const c = task("file.write", { target: "x/a.ts" });
  const p = planAttention([a, b, c], contract, { budget: 5, now: NOW, totalAwaiting: 9000, truncated: true });
  assert.equal(p.totalGroups, 2);
  assert.equal(p.items.find((i) => i.count === 2)!.taskIds.length, 2);
  assert.equal(p.totalAwaiting, 9000);
  assert.equal(p.truncated, true);
  assert.match(p.note, /UYARI/);
});
