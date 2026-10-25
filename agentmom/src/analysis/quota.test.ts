// Kota ve gösterge seviyesi birim testleri. Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Seviye eşikleri (74.9/75/89.9/90), sağlayıcı bildirimi doğrulaması (bayat/tutarsız/sıfırlanmış = bilinmiyor), gerçek veritabanından salt okuma.
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryAudit } from "../testing/analysis-fixtures.ts";
import { LOW_REMAINING_PCT, QUOTA_MAX_AGE_MS, isLowRemaining, levelOf, parseLimits, readProviderLimits } from "./quota.ts";

const NOW = new Date("2026-10-23T12:00:00.000Z");
const ago = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();

test("levelOf: <75 ok, >=75 warn, >=90 critical, number missing -> unknown", () => {
  assert.equal(levelOf(0), "ok");
  assert.equal(levelOf(74.9), "ok");
  assert.equal(levelOf(75), "warn");
  assert.equal(levelOf(89.9), "warn");
  assert.equal(levelOf(90), "critical");
  assert.equal(levelOf(100), "critical");
  assert.equal(levelOf(null), "unknown");
  assert.equal(levelOf(Number.NaN), "unknown");
  assert.equal(levelOf(-1), "unknown");
});

test("isLowRemaining: strictly below 15; unknown is never low", () => {
  assert.equal(LOW_REMAINING_PCT, 15);
  assert.equal(isLowRemaining(14.9), true);
  assert.equal(isLowRemaining(15), false);
  assert.equal(isLowRemaining(0), true);
  assert.equal(isLowRemaining(null), false);
  assert.equal(isLowRemaining(undefined), false);
});

test("parseLimits: used or remaining is enough; the other is derived; nothing is invented", () => {
  const a = parseLimits({ usedPct: 80 }, ago(1000), NOW);
  assert.deepEqual([a?.usedPct, a?.remainingPct, a?.source], [80, 20, "provider"]);
  const b = parseLimits({ remainingPct: 12.5 }, ago(1000), NOW);
  assert.deepEqual([b?.usedPct, b?.remainingPct], [87.5, 12.5]);
  assert.equal(parseLimits({}, ago(1000), NOW), null, "no percentage reported");
  assert.equal(parseLimits({ usedPct: "80" }, ago(1000), NOW), null, "string is not a number");
  assert.equal(parseLimits({ usedPct: 101 }, ago(1000), NOW), null);
  assert.equal(parseLimits({ usedPct: -1 }, ago(1000), NOW), null);
  assert.equal(parseLimits(null, ago(1000), NOW), null);
  assert.equal(parseLimits([80], ago(1000), NOW), null);
});

test("parseLimits: stale, future, inconsistent and already-reset reports are unknown", () => {
  assert.notEqual(parseLimits({ usedPct: 50 }, ago(QUOTA_MAX_AGE_MS - 1), NOW), null);
  assert.equal(parseLimits({ usedPct: 50 }, ago(QUOTA_MAX_AGE_MS + 1), NOW), null, "older than 6 hours");
  assert.equal(parseLimits({ usedPct: 50 }, new Date(NOW.getTime() + 10 * 60000).toISOString(), NOW), null, "stamp in the future");
  assert.equal(parseLimits({ usedPct: 50 }, "değil", NOW), null, "unreadable stamp");
  assert.equal(parseLimits({ usedPct: 50, remainingPct: 20 }, ago(1000), NOW), null, "used + remaining must be about 100");
  assert.notEqual(parseLimits({ usedPct: 50, remainingPct: 50.5 }, ago(1000), NOW), null);
  assert.equal(parseLimits({ usedPct: 50, resetsAt: ago(1000) }, ago(5000), NOW), null, "reset time already passed");
  assert.equal(parseLimits({ usedPct: 50, resetsAt: "yarın" }, ago(5000), NOW), null);
  const ok = parseLimits({ usedPct: 50, resetsAt: new Date(NOW.getTime() + 3600000).toISOString() }, ago(5000), NOW);
  assert.equal(ok?.resetsAt, new Date(NOW.getTime() + 3600000).toISOString());
});

test("readProviderLimits: reads only the provider's own newest usage event; a normal usage event without limits is unknown", () => {
  const { db, audit, setClock } = memoryAudit(ago(3600000));
  const rec = (id: string, data: Record<string, unknown>): void => void audit.record({ initiator: { kind: "agent", id }, action: "provider.event:usage", decision: "n/a", result: "usage", details: { taskId: "t", data } });
  assert.equal(readProviderLimits(db, "claude-code", NOW), null, "no events at all");
  rec("claude-code", { inputTokens: 10, outputTokens: 5 });
  assert.equal(readProviderLimits(db, "claude-code", NOW), null, "usage event without limits");
  setClock(ago(1800000));
  rec("claude-code", { limits: { usedPct: 40 } });
  setClock(ago(900000));
  rec("claude-code", { limits: { usedPct: 91 } });
  rec("codex", { limits: { usedPct: 10 } });
  const l = readProviderLimits(db, "claude-code", NOW);
  assert.equal(l?.usedPct, 91, "newest event wins");
  assert.equal(readProviderLimits(db, "codex", NOW)?.usedPct, 10, "per provider");
  assert.equal(readProviderLimits(db, "gemini", NOW), null);
  assert.equal(readProviderLimits(db, "claude-code", new Date(NOW.getTime() + QUOTA_MAX_AGE_MS)), null, "becomes stale");
  const before = (db.prepare("SELECT COUNT(*) AS n FROM audit_events").get() as { n: number }).n;
  readProviderLimits(db, "claude-code", NOW);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM audit_events").get() as { n: number }).n, before, "read-only");
});

// ---- Denetim düzeltmeleri ----
import { LIMITS_SQL } from "./quota.ts";
import { DEFAULT_CONFIG } from "../core/config/config.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { ScriptedAdapter } from "../testing/scripted-adapter.ts";
import { providerSnapshots } from "./snapshot.ts";
import { providerDetail } from "../server/providers-api.ts";

test("readProviderLimits sorgusu ts aralığıyla idx_audit_ts dizinini kullanır (tüm geçmiş taranmaz) ve bayat olayı görmez", () => {
  const { db, audit, setClock } = memoryAudit(ago(10 * 3600000));
  const plan = (db.prepare(`EXPLAIN QUERY PLAN ${LIMITS_SQL}`).all(ago(QUOTA_MAX_AGE_MS), "claude-code") as Array<{ detail: string }>).map((r) => r.detail).join(" | ");
  assert.match(plan, /idx_audit_ts/, plan);
  audit.record({ initiator: { kind: "agent", id: "claude-code" }, action: "provider.event:usage", decision: "n/a", result: "usage", details: { taskId: "t", data: { limits: { usedPct: 50 } } } });
  assert.equal(readProviderLimits(db, "claude-code", NOW), null, "10 saat önceki olay pencere dışında");
  setClock(ago(1000));
  audit.record({ initiator: { kind: "agent", id: "claude-code" }, action: "provider.event:usage", decision: "n/a", result: "usage", details: { taskId: "t", data: { limits: { usedPct: 60 } } } });
  assert.equal(readProviderLimits(db, "claude-code", NOW)?.usedPct, 60);
});

test("türetilen kalan kota yuvarlanmaz: used 85.04 -> remaining 14.96 (<15, az); gürültü giderilir", () => {
  const a = parseLimits({ usedPct: 85.04 }, ago(1000), NOW);
  assert.equal(a?.remainingPct, 14.96);
  assert.equal(isLowRemaining(a?.remainingPct), true);
  const b = parseLimits({ usedPct: 85 }, ago(1000), NOW);
  assert.equal(b?.remainingPct, 15);
  assert.equal(isLowRemaining(b?.remainingPct), false);
  assert.equal(parseLimits({ remainingPct: 14.9 }, ago(1000), NOW)?.usedPct, 85.1);
});

test("providerSnapshots/providerDetail 'now' alır: bildirim taze iken görünür, now ilerleyince bayat sayılıp bilinmiyor olur", () => {
  const { db, audit } = memoryAudit(ago(3600000));
  const registry = new ProviderRegistry(db);
  registry.register(new ScriptedAdapter("claude-code", () => ({ summary: "ok" }), { routeKind: "subscription" }));
  const contract = { ...structuredClone(DEFAULT_CONFIG.policy.defaultContract), allowedProviders: ["claude-code"] };
  audit.record({ initiator: { kind: "agent", id: "claude-code" }, action: "provider.event:usage", decision: "n/a", result: "usage", details: { taskId: "t", data: { limits: { remainingPct: 10 } } } });
  assert.equal(providerSnapshots(db, registry, contract, NOW)[0]?.quotaRemainingPct, 10);
  assert.equal(providerDetail(db, registry, contract, "claude-code", undefined, NOW)?.limits?.remainingPct, 10);
  const later = new Date(NOW.getTime() + QUOTA_MAX_AGE_MS);
  assert.equal(providerSnapshots(db, registry, contract, later)[0]?.quotaRemainingPct, null);
  assert.equal(providerDetail(db, registry, contract, "claude-code", undefined, later)?.limits, null);
});
