// Yetenek süreklilik grafiği birim testleri (D8b, madde 73). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Küçük sahte sağlayıcılarla: kenarlar, yeteneği sunan sayısı, tek hata noktaları, bir sağlayıcı kapanırsa kaybolan/kalan yetenekler.
import { test } from "node:test";
import assert from "node:assert/strict";
import { snap } from "../testing/analysis-fixtures.ts";
import { buildContinuity } from "./continuity.ts";

const A = snap("a", { execute: "verified", streamEvents: "partial", getUsage: "partial", cancel: "unsupported", testConnection: "unverified" }, { lastSuccessAt: "2026-10-20T10:00:00.000Z" });
const B = snap("b", { execute: "partial", streamEvents: "unavailable", collectEvidence: "partial", testConnection: "verified" }, { lastSuccessAt: "2026-10-20T10:00:00.000Z", lastFailureAt: "2026-10-21T10:00:00.000Z" });
const C = snap("c", { execute: "unverified", dispose: "verified" }, { disabled: true });

test("edges exist only for verified / partial / unverified; unsupported and unavailable are not offers", () => {
  const r = buildContinuity([A, B, C]);
  assert.ok(!r.edges.some((e) => e.provider === "a" && e.capability === "cancel"));
  assert.ok(!r.edges.some((e) => e.provider === "b" && e.capability === "streamEvents"));
  assert.ok(r.edges.some((e) => e.provider === "c" && e.capability === "execute" && e.status === "unverified"));
  const exec = r.capabilities.find((c) => c.operation === "execute");
  assert.deepEqual(exec?.offeredBy, ["a", "b", "c"]);
  assert.deepEqual(exec?.verifiedBy, ["a"]);
  assert.deepEqual(exec?.partialBy, ["b"]);
  assert.deepEqual(exec?.unverifiedBy, ["c"]);
  assert.equal(exec?.essential, true);
  assert.deepEqual(exec?.activeOfferers, ["a", "b"], "the disabled provider is not active");
});

test("single points of failure: declared by exactly one provider; effective single point counts only active providers", () => {
  const r = buildContinuity([A, B, C]);
  const sp = r.singlePoints.map((s) => `${s.capability}:${s.provider}`).sort();
  assert.deepEqual(sp, ["collectEvidence:b", "dispose:c", "getUsage:a", "streamEvents:a"]);
  assert.equal(r.capabilities.find((c) => c.operation === "dispose")?.effectiveSinglePoint, false, "only offered by a disabled provider -> zero active");
  assert.equal(r.capabilities.find((c) => c.operation === "testConnection")?.singlePointOfFailure, false);
  assert.equal(r.capabilities.find((c) => c.operation === "testConnection")?.effectiveSinglePoint, false);
  assert.equal(r.capabilities.find((c) => c.operation === "execute")?.effectiveSinglePoint, false);
  assert.equal(r.capabilities.find((c) => c.operation === "validateConfiguration")?.nobody, true);
  assert.equal(r.summary.essentialSinglePoints, 3, "streamEvents, getUsage (a) and collectEvidence (b) are essential; dispose is not");
});

test("if a provider is lost: lost vs retained, based on active providers", () => {
  const r = buildContinuity([A, B, C]);
  const lossA = r.ifProviderLost.find((l) => l.provider === "a");
  assert.deepEqual(lossA?.lost.sort(), ["getUsage", "streamEvents"]);
  assert.ok(lossA?.retained.includes("execute") && lossA.retained.includes("testConnection"));
  assert.equal(lossA?.noProviderLeft, false);
  const lossB = r.ifProviderLost.find((l) => l.provider === "b");
  assert.deepEqual(lossB?.lost.sort(), ["collectEvidence"]);
  assert.ok(lossB?.retained.includes("execute"));
  const lossC = r.ifProviderLost.find((l) => l.provider === "c");
  assert.deepEqual(lossC?.lost, [], "a disabled provider contributes nothing, so nothing is lost");
});

test("one provider only: every offered capability is lost when it goes, and no provider is left", () => {
  const r = buildContinuity([A]);
  assert.equal(r.ifProviderLost[0]?.noProviderLeft, true);
  assert.deepEqual(r.ifProviderLost[0]?.lost.sort(), ["execute", "getUsage", "streamEvents", "testConnection"]);
  assert.equal(r.summary.singlePoints, 4);
  assert.equal(buildContinuity([]).summary.edges, 0);
});

test("provider health comes only from recorded events", () => {
  const r = buildContinuity([A, B, C]);
  assert.equal(r.providers.find((p) => p.id === "a")?.health, "iyi");
  assert.equal(r.providers.find((p) => p.id === "b")?.health, "kötü");
  assert.equal(r.providers.find((p) => p.id === "c")?.health, "bilinmiyor");
  assert.match(r.note, /canlı test yapılmaz/);
});
