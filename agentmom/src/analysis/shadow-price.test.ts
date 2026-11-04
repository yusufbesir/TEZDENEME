// Kaynak gölge fiyatı birim testleri (D8b, madde 72). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Elle hesaplanmış kıtlık / hızlanma / endeks, sınır bilinmiyorsa uydurma yok, para birimi yok, kullanım kayıtlarının toplanması.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { memoryAudit } from "../testing/analysis-fixtures.ts";
import type { Observation } from "./expertise.ts";
import { ROW_LIMIT, collectUsageRecords, computeShadowPrices } from "./shadow-price.ts";

const NOW = new Date("2026-10-23T12:00:00.000Z");
const ago = (h: number): string => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const call = (provider: string, h: number, durationMs: number | null = null): Observation => ({ provider, role: "tekil", ok: true, durationMs, ts: ago(h), errorKind: null });

const usage = [
  { provider: "p", at: ago(2), tokens: 600 },
  { provider: "p", at: ago(48), tokens: 100 },
  { provider: "p", at: ago(96), tokens: 200 },
  { provider: "p", at: ago(120), tokens: 300 },
  { provider: "p", at: ago(24 * 8), tokens: 9999 },
  { provider: "p", at: ago(30), tokens: null },
];

test("known limit: scarcity and shadow price index by hand", () => {
  const r = computeShadowPrices({ providers: ["p"], usage, calls: [call("p", 1, 2000), call("p", 30, 1000), call("p", 24 * 9, 5000)], now: NOW, limits: { p: { tokens7d: 4800, source: "sözleşme belgesi" } } });
  const p = r.providers[0];
  assert.equal(p?.last7d.tokens, 1200, "the 8-day-old record is outside the window");
  assert.equal(p?.last24h.tokens, 600);
  assert.equal(p?.prior6d.tokens, 600);
  assert.equal(p?.last7d.reportedRuns, 4);
  assert.equal(p?.last7d.calls, 2);
  assert.equal(p?.last7d.durationMs, 3000);
  // hızlanma = 600 / (600 / 6) = 6 -> çarpan 2'ye kırpılır; oran = 1200 / 4800 = 0.25; endeks = round(100 x 0.25 x 2) = 50
  assert.deepEqual([p?.acceleration.basis, p?.acceleration.value], ["token", 6]);
  assert.equal(p?.usageToLimit, 0.25);
  assert.equal(p?.scarcity, 0.25);
  assert.equal(p?.shadowPriceIndex, 50);
  assert.equal(p?.level, "orta");
  assert.match(p?.status ?? "", /sözleşme belgesi/);
});

test("unknown limit: no index, no invented limit; no currency anywhere", () => {
  const r = computeShadowPrices({ providers: ["p", "idle"], usage, calls: [], now: NOW });
  const p = r.providers.find((x) => x.provider === "p");
  assert.equal(p?.limit, null);
  assert.equal(p?.usageToLimit, null);
  assert.equal(p?.scarcity, null);
  assert.equal(p?.shadowPriceIndex, null);
  assert.equal(p?.level, null);
  assert.equal(p?.status, "sınır bilinmiyor");
  const idle = r.providers.find((x) => x.provider === "idle");
  assert.deepEqual([idle?.last7d.calls, idle?.last7d.tokens, idle?.acceleration.value], [0, null, null]);
  assert.equal(idle?.acceleration.basis, null);
  assert.equal(r.costBasis, "list");
  assert.equal(r.currency, null);
  assert.doesNotMatch(JSON.stringify(r), /usd|\$|€|₺/i);
  assert.match(r.note, /ücret yok/);
});

test("without tokens the acceleration uses call counts; a missing baseline gives null", () => {
  const calls = [call("c", 1), call("c", 3), ...[30, 50, 70, 90, 110, 130].map((h) => call("c", h))];
  const r = computeShadowPrices({ providers: ["c", "n"], usage: [], calls: [...calls, call("n", 2)], now: NOW });
  const c = r.providers.find((x) => x.provider === "c");
  assert.deepEqual([c?.acceleration.basis, c?.acceleration.value], ["çağrı", 2], "2 calls in 24 h vs 6 calls / 6 days");
  const n = r.providers.find((x) => x.provider === "n");
  assert.equal(n?.acceleration.value, null);
  assert.match(n?.acceleration.note ?? "", /karşılaştırma tabanı yok/);
});

test("limit known but no token usage reported: honest status, no index", () => {
  const r = computeShadowPrices({ providers: ["p"], usage: [], calls: [call("p", 1)], now: NOW, limits: { p: { tokens7d: 1000, source: "elle" } } });
  assert.equal(r.providers[0]?.shadowPriceIndex, null);
  assert.match(r.providers[0]?.status ?? "", /bildirilmiş token kullanımı yok/);
});

test("collectUsageRecords: only reported tokens, provider from the execution record, window respected", () => {
  const m = memoryAudit();
  m.db.prepare("INSERT INTO tasks (id, title, state, requested_action, request_json, decision, created_at, updated_at) VALUES ('t1','x','approved','file.read','{}','allow',?,?)").run(ago(500), ago(500));
  const at = (h: number) => () => new Date(NOW.getTime() - h * 3_600_000);
  const recent = new EvidenceStore(m.db, at(3));
  recent.add("t1", "A1", "execution", "ok", { provider: "p" });
  recent.add("t1", "A1", "usage", "reported", { inputTokens: 10, outputTokens: 5, costUsd: 99, source: "reported" });
  recent.add("t1", "A2", "execution", "ok", { provider: "p" });
  recent.add("t1", "A2", "usage", "unknown", { inputTokens: null, outputTokens: null, costUsd: null, source: "unknown" });
  recent.add("t1", "A3", "step:implement", "ok", { provider: "q", usage: { inputTokens: 7, outputTokens: null, source: "reported" } });
  new EvidenceStore(m.db, at(24 * 9)).add("t1", "A4", "usage", "reported", { inputTokens: 1000, outputTokens: 1000, source: "reported" });
  const { records: recs, truncated } = collectUsageRecords(m.db, NOW);
  assert.equal(truncated, false);
  assert.deepEqual(recs.map((r) => [r.provider, r.tokens]).sort(), [["p", null], ["p", 15], ["q", 7]]);
  assert.doesNotMatch(JSON.stringify(recs), /99/, "costUsd is never read");
});

test("row limit: the NEWEST rows are kept and the report says it was truncated", () => {
  const m = memoryAudit();
  m.db.prepare("INSERT INTO tasks (id, title, state, requested_action, request_json, decision, created_at, updated_at) VALUES ('t1','x','approved','file.read','{}','allow',?,?)").run(ago(1), ago(1));
  const ins = m.db.prepare("INSERT INTO task_evidence (id, task_id, attempt_id, kind, summary, data_json, created_at) VALUES (?, 't1', ?, 'step:plan', 's', ?, ?)");
  m.db.exec("BEGIN");
  for (let i = 0; i < ROW_LIMIT + 5; i++) ins.run(`e${i}`, `a${i}`, JSON.stringify({ provider: "p", usage: { inputTokens: i, outputTokens: 0, source: "reported" } }), new Date(NOW.getTime() - (ROW_LIMIT + 5 - i) * 1000).toISOString());
  m.db.exec("COMMIT");
  const { records, truncated } = collectUsageRecords(m.db, NOW);
  assert.equal(truncated, true);
  assert.equal(records.length, ROW_LIMIT);
  assert.equal(records[records.length - 1]?.tokens, ROW_LIMIT + 4, "the newest row survived");
  assert.equal(records[0]?.tokens, 5, "the 5 oldest rows were dropped");
  const rep = computeShadowPrices({ providers: ["p"], usage: records, calls: [], now: NOW, truncated });
  assert.equal(rep.truncated, true);
  assert.match(rep.note, /UYARI/);
  assert.equal(computeShadowPrices({ providers: [], usage: [], calls: [], now: NOW }).truncated, false);
});
