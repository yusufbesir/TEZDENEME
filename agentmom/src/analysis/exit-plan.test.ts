// Sağlayıcı çıkış / değiştirilebilirlik planlayıcı birim testleri (D8b, madde 80). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Elle hesaplanmış puanlar, ücretli rota asla önerilmez, politika / devre dışı / adaptörsüz eleme, "yedek yok" dürüstlüğü.
import { test } from "node:test";
import assert from "node:assert/strict";
import { snap } from "../testing/analysis-fixtures.ts";
import { buildExitPlan } from "./exit-plan.ts";

const OK = "2026-10-20T10:00:00.000Z";
const BAD = "2026-10-21T10:00:00.000Z";
const T = snap("t", { execute: "verified", streamEvents: "partial", getUsage: "unverified", cancel: "unsupported" });

test("hand-computed scores: coverage x route compatibility x health factor", () => {
  const X = snap("x", { execute: "partial", streamEvents: "verified" }, { lastSuccessAt: OK });
  const Y = snap("y", { execute: "verified", streamEvents: "partial" }, { routeKind: "local", lastSuccessAt: OK, lastFailureAt: BAD });
  const plan = buildExitPlan([T, X, Y], "t");
  assert.ok(plan);
  assert.deepEqual(plan.target.requiredCapabilities, [{ operation: "execute", status: "verified" }, { operation: "streamEvents", status: "partial" }]);
  const x = plan.candidates.find((c) => c.provider === "x");
  const y = plan.candidates.find((c) => c.provider === "y");
  // x: execute 0.5/1 = 0.5, streamEvents min(1, 0.5)/0.5 = 1 -> 0.75; same route 1; health iyi 1 -> 75
  assert.equal(x?.coverage, 0.75);
  assert.equal(x?.swapScore, 75);
  assert.deepEqual(x?.missing, [{ operation: "execute", targetStatus: "verified", candidateStatus: "partial" }]);
  // y: coverage 1; subscription -> local 0.7; health kötü 0.7 -> 49
  assert.equal(y?.coverage, 1);
  assert.equal(y?.routeCompat, 0.7);
  assert.equal(y?.swapScore, 49);
  assert.deepEqual(y?.missing, []);
  assert.deepEqual(plan.candidates.map((c) => c.provider), ["x", "y"], "sorted by score");
  assert.equal(plan.verdict, "kısmi yedek");
  assert.match(plan.summary, /x/);
  assert.match(plan.formula, /100 x kapsama/);
});

test("paid routes are NEVER recommended: listed as closed, unscored", () => {
  const Z = snap("z", { execute: "verified", streamEvents: "verified" }, { routeKind: "api_paid" });
  const plan = buildExitPlan([T, Z], "t");
  assert.equal(plan?.candidates.length, 0);
  assert.equal(plan?.closed.length, 1);
  assert.equal(plan?.closed[0]?.swapScore, null);
  assert.match(plan?.closed[0]?.reasons[0] ?? "", /^kapalı/);
  assert.equal(plan?.verdict, "yedek yok");
  assert.match(plan?.summary ?? "", /^Yedek yok/);
});

test("policy, disabled and missing adapter eliminate a candidate with the reason", () => {
  const W = snap("w", { execute: "verified", streamEvents: "verified" }, { allowedByPolicy: false });
  const V = snap("v", { execute: "verified", streamEvents: "verified" }, { disabled: true });
  const U = snap("u", { execute: "verified", streamEvents: "verified" }, { hasAdapter: false });
  const plan = buildExitPlan([T, W, V, U], "t");
  assert.equal(plan?.candidates.length, 0);
  assert.deepEqual(plan?.excluded.map((e) => e.provider).sort(), ["u", "v", "w"]);
  assert.match(plan?.excluded.find((e) => e.provider === "w")?.reasons.join(" ") ?? "", /izinli sağlayıcılar/);
  assert.match(plan?.excluded.find((e) => e.provider === "v")?.reasons.join(" ") ?? "", /devre dışı/);
  assert.match(plan?.excluded.find((e) => e.provider === "u")?.reasons.join(" ") ?? "", /adaptörü yok/);
  assert.equal(plan?.verdict, "yedek yok");
});

test("a candidate that covers nothing scores 0 and is no replacement; unknown target is null; target without capabilities cannot be covered", () => {
  const Q = snap("q", { dispose: "verified" });
  const plan = buildExitPlan([T, Q], "t");
  assert.equal(plan?.candidates[0]?.swapScore, 0);
  assert.equal(plan?.verdict, "yedek yok");
  assert.equal(buildExitPlan([T, Q], "yok"), null);
  const empty = buildExitPlan([snap("e", { cancel: "unsupported" }), Q], "e");
  assert.equal(empty?.candidates.length, 0);
  assert.equal(empty?.excluded[0]?.provider, "q");
  assert.match(empty?.excluded[0]?.reasons[0] ?? "", /kapsama hesaplanamaz/);
});

test("a full replacement is reported as yedek var", () => {
  const F = snap("f", { execute: "verified", streamEvents: "verified" }, { lastSuccessAt: OK });
  const plan = buildExitPlan([T, F], "t");
  assert.equal(plan?.candidates[0]?.swapScore, 100);
  assert.equal(plan?.verdict, "yedek var");
});

test("route allow-list: an unknown route kind is excluded, not scored", () => {
  const plan = buildExitPlan([T, snap("odd", { execute: "verified", streamEvents: "verified" }, { routeKind: "bulut" })], "t");
  assert.equal(plan?.candidates.length, 0);
  assert.match(plan?.excluded[0]?.reasons.join(" ") ?? "", /bilinmeyen rota türü/);
  assert.equal(plan?.verdict, "yedek yok");
});
