// İç yetenek aracısı birim testleri (D8b, madde 99). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Sıralama (durum > rota > son kayıt > rol başarısı > ad), eleme nedenleri, ücretli rota daima elenir, boş sonuç, salt öneri.
import { test } from "node:test";
import assert from "node:assert/strict";
import { snap } from "../testing/analysis-fixtures.ts";
import { brokerRequest, isBrokerCapability, isBrokerRole } from "./broker.ts";

const OK = "2026-10-20T10:00:00.000Z";
const BAD = "2026-10-21T10:00:00.000Z";

test("ordering: verified before partial, then local before subscription, then health", () => {
  const sub = snap("sub", { execute: "verified" });
  const loc = snap("loc", { execute: "verified" }, { routeKind: "local" });
  const part = snap("part", { execute: "partial" }, { routeKind: "local" });
  const r = brokerRequest([part, sub, loc], "execute", null);
  assert.deepEqual(r.candidates.map((c) => c.provider), ["loc", "sub", "part"]);
  assert.deepEqual(r.candidates.map((c) => c.rank), [1, 2, 3]);
  assert.match(r.candidates[0]?.reasons.join(" ") ?? "", /yerel rota/);
  assert.match(r.candidates[2]?.reasons.join(" ") ?? "", /kısmi/);

  const good = snap("zz-good", { execute: "verified" }, { lastSuccessAt: OK });
  const bad = snap("aa-bad", { execute: "verified" }, { lastSuccessAt: OK, lastFailureAt: BAD });
  const unknown = snap("mm-unknown", { execute: "verified" });
  assert.deepEqual(brokerRequest([bad, unknown, good], "execute", null).candidates.map((c) => c.provider), ["zz-good", "mm-unknown", "aa-bad"], "health beats name");
});

test("role history breaks ties only when the sample is big enough", () => {
  const a = snap("a", { execute: "verified" });
  const b = snap("b", { execute: "verified" });
  const enough = new Map([["a", { attempts: 10, successRate: 0.5 }], ["b", { attempts: 10, successRate: 0.9 }]]);
  assert.deepEqual(brokerRequest([a, b], "execute", "implement", enough).candidates.map((c) => c.provider), ["b", "a"]);
  assert.match(brokerRequest([a, b], "execute", "implement", enough).candidates[0]?.reasons.join(" ") ?? "", /implement rolünde gözlenen başarı %90 \(10 deneme\)/);
  const thin = new Map([["a", { attempts: 3, successRate: null }], ["b", { attempts: 3, successRate: null }]]);
  const r = brokerRequest([a, b], "execute", "implement", thin);
  assert.deepEqual(r.candidates.map((c) => c.provider), ["a", "b"], "falls back to name");
  assert.match(r.candidates[0]?.reasons.join(" ") ?? "", /yeterli gözlem yok/);
  assert.equal(brokerRequest([a, b], "execute", null, enough).candidates[0]?.provider, "a", "without a role the history is not used");
});

test("eliminations carry reasons; paid routes are always eliminated; unverified is not recommended", () => {
  const paid = snap("paid", { execute: "verified" }, { routeKind: "api_paid" });
  const denied = snap("denied", { execute: "verified" }, { allowedByPolicy: false });
  const off = snap("off", { execute: "verified" }, { disabled: true });
  const noad = snap("noad", { execute: "verified" }, { hasAdapter: false });
  const unv = snap("unv", { execute: "unverified" });
  const none = snap("none", { dispose: "verified" });
  const good = snap("good", { execute: "partial" });
  const r = brokerRequest([paid, denied, off, noad, unv, none, good], "execute", "plan");
  assert.deepEqual(r.candidates.map((c) => c.provider), ["good"]);
  const why = (id: string): string => r.eliminated.find((e) => e.provider === id)?.reasons.join(" | ") ?? "";
  assert.match(why("paid"), /ücretli rota/);
  assert.match(why("denied"), /allowedProviders/);
  assert.match(why("off"), /devre dışı/);
  assert.match(why("noad"), /adaptörü yok/);
  assert.match(why("unv"), /'unverified'/);
  assert.match(why("none"), /kayıtlı değil/);
  assert.equal(r.eliminated.length, 6);
});

test("nothing suitable -> uygun sağlayıcı yok; request validation helpers", () => {
  const r = brokerRequest([snap("x", { execute: "unsupported" })], "execute", null);
  assert.deepEqual(r.candidates, []);
  assert.equal(r.summary, "uygun sağlayıcı yok");
  assert.equal(brokerRequest([], "execute", null).summary, "uygun sağlayıcı yok");
  assert.match(r.note, /hiçbir görev başlatılmaz/);
  assert.equal(isBrokerCapability("execute"), true);
  assert.equal(isBrokerCapability("rm -rf"), false);
  assert.equal(isBrokerRole("verify"), true);
  assert.equal(isBrokerRole("tekil"), false);
});

test("route allow-list: an unknown route kind is eliminated (fail-closed)", () => {
  const r = brokerRequest([snap("odd", { execute: "verified" }, { routeKind: "bulut" }), snap("ok", { execute: "partial" })], "execute", null);
  assert.deepEqual(r.candidates.map((c) => c.provider), ["ok"]);
  assert.match(r.eliminated.find((e) => e.provider === "odd")?.reasons.join(" ") ?? "", /bilinmeyen rota türü/);
});

// ---- Kota farkındalığı (yalnız SIRALAMA; eleme ve ücretli rota kuralları değişmez) ----
test("quota: a provider whose REPORTED remaining quota is under 15% drops below the others, with the reason text", () => {
  const low = snap("aa-low", { execute: "verified" }, { routeKind: "local", quotaRemainingPct: 14.9 });
  const fine = snap("zz-fine", { execute: "partial" }, { quotaRemainingPct: 60 });
  const unknown = snap("mm-unknown", { execute: "partial" });
  const r = brokerRequest([low, fine, unknown], "execute", null);
  assert.deepEqual(r.candidates.map((c) => c.provider), ["mm-unknown", "zz-fine", "aa-low"], "low quota is last even though it is local and verified");
  const last = r.candidates[2];
  assert.equal(last?.quota.low, true);
  assert.equal(last?.quota.remainingPct, 14.9);
  assert.match(last?.reasons.join(" | ") ?? "", /kalan kota az \(%14,9\): yedek sağlayıcı\/alt model önerilir/);
  assert.match(r.candidates[1]?.reasons.join(" | ") ?? "", /kalan kota %60 \(sağlayıcı bildirdi\)/);
  assert.match(r.quotaNote, /1 adayda bildirilmiş kalan kota %15 altında/);
  assert.match(r.quotaNote, /1 adayda kota bilinmiyor/);
  assert.match(r.ordering, /kalan kota/);
});

test("quota: exactly 15% is not low; unknown quota never changes the order and says 'kota bilinmiyor'", () => {
  const a = snap("a", { execute: "verified" }, { routeKind: "local", quotaRemainingPct: 15 });
  const b = snap("b", { execute: "verified" });
  const c = snap("c", { execute: "verified" }, { quotaRemainingPct: null });
  const r = brokerRequest([c, b, a], "execute", null);
  assert.deepEqual(r.candidates.map((x) => x.provider), ["a", "b", "c"], "same order as without any quota data");
  assert.equal(r.candidates[0]?.quota.low, false);
  for (const cand of r.candidates.slice(1)) {
    assert.equal(cand.quota.reported, false);
    assert.equal(cand.quota.remainingPct, null);
    assert.match(cand.reasons.join(" | "), /kota bilinmiyor/);
  }
  const without = brokerRequest([snap("a", { execute: "verified" }, { routeKind: "local" }), snap("b", { execute: "verified" }), snap("c", { execute: "verified" })], "execute", null);
  assert.deepEqual(without.candidates.map((x) => x.provider), r.candidates.map((x) => x.provider));
});

test("quota never eliminates or revives: paid route and other eliminations stay, low-quota provider stays a candidate", () => {
  const paidLow = snap("paid", { execute: "verified" }, { routeKind: "api_paid", quotaRemainingPct: 1 });
  const paidFine = snap("paid2", { execute: "verified" }, { routeKind: "api_paid", quotaRemainingPct: 99 });
  const off = snap("off", { execute: "verified" }, { disabled: true, quotaRemainingPct: 99 });
  const low = snap("low", { execute: "verified" }, { quotaRemainingPct: 0 });
  const r = brokerRequest([paidLow, paidFine, off, low], "execute", null);
  assert.deepEqual(r.candidates.map((x) => x.provider), ["low"], "a low-quota provider is still recommended (only ranked last)");
  assert.deepEqual(r.eliminated.map((e) => e.provider), ["off", "paid", "paid2"]);
  assert.match(r.eliminated.find((e) => e.provider === "paid2")?.reasons.join(" ") ?? "", /ücretli rota/);
  assert.equal(brokerRequest([], "execute", null).quotaNote, "Kota: değerlendirilecek aday yok.");
});

test("quota: the broker only ranks; it stays a pure function (input snapshots are not changed)", () => {
  const p = snap("p", { execute: "verified" }, { quotaRemainingPct: 5 });
  const copy = structuredClone(p);
  brokerRequest([p], "execute", "plan");
  assert.deepEqual(p, copy);
});

test("quota rounding: 14.96% is low (raw compare) and is displayed rounded DOWN so it never reads '%15'", () => {
  const r = brokerRequest([snap("a", { execute: "verified" }, { quotaRemainingPct: 14.96 }), snap("b", { execute: "verified" }, { quotaRemainingPct: 15 })], "execute", null);
  assert.deepEqual(r.candidates.map((c) => c.provider), ["b", "a"]);
  assert.match(r.candidates[1]?.reasons.join(" | ") ?? "", /kalan kota az \(%14,9\)/);
  assert.doesNotMatch(r.candidates[1]?.reasons.join(" | ") ?? "", /%15\)/);
  assert.match(r.candidates[0]?.reasons.join(" | ") ?? "", /kalan kota %15 \(sağlayıcı bildirdi\)/);
});
