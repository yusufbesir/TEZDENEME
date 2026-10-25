// Çevrimdışı kip planı birim testleri (D8b, madde 74). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Canlı durum (çevrimdışı / kısıtlı / çevrimiçi) ve statik harita: haritadaki her uç gerçekten src/server/app.ts'de bulunmalı (harita sessizce eskimez).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractRoutes } from "../docs/autodoc.ts";
import { snap } from "../testing/analysis-fixtures.ts";
import { FEATURE_MAP, buildOfflinePlan } from "./offline.ts";

test("no usable provider -> çevrimdışı; local features work, provider features are blocked", () => {
  const r = buildOfflinePlan([snap("a", { execute: "verified" }, { disabled: true }), snap("b", { execute: "verified" }, { allowedByPolicy: false }), snap("c", { execute: "unverified" }), snap("d", { execute: "verified" }, { hasAdapter: false })]);
  assert.equal(r.mode, "çevrimdışı");
  assert.equal(r.offline, true);
  assert.equal(r.usableProviders, 0);
  assert.ok(r.works.length > 5 && r.works.every((f) => !f.needsProvider));
  assert.deepEqual(r.blockedNow, r.needsProvider);
  assert.ok(r.blockedNow.length > 0 && r.blockedNow.every((f) => f.needsProvider));
  assert.match(r.summary, /çevrimdışı/);
  assert.match(r.providers.find((p) => p.id === "a")?.reasons.join(" ") ?? "", /devre dışı/);
  assert.match(r.providers.find((p) => p.id === "b")?.reasons.join(" ") ?? "", /izinli/);
  assert.match(r.providers.find((p) => p.id === "c")?.reasons.join(" ") ?? "", /'unverified'/);
  assert.match(r.providers.find((p) => p.id === "d")?.reasons.join(" ") ?? "", /adaptörü yok/);
});

test("a usable provider with only partial execute -> kısıtlı; a verified one -> çevrimiçi", () => {
  const limited = buildOfflinePlan([snap("p", { execute: "partial" })]);
  assert.equal(limited.mode, "kısıtlı");
  assert.equal(limited.offline, false);
  assert.equal(limited.blockedNow.length, 0);
  assert.equal(limited.usableProviders, 1);
  assert.equal(limited.verifiedProviders, 0);
  const online = buildOfflinePlan([snap("p", { execute: "partial" }), snap("v", { execute: "verified" })]);
  assert.equal(online.mode, "çevrimiçi");
  assert.equal(online.verifiedProviders, 1);
  assert.equal(buildOfflinePlan([]).mode, "çevrimdışı", "no provider at all");
});

test("feature map: ids unique, text filled in, and every endpoint exists in app.ts", () => {
  assert.equal(new Set(FEATURE_MAP.map((f) => f.id)).size, FEATURE_MAP.length);
  for (const f of FEATURE_MAP) {
    assert.ok(f.name.length > 3 && f.why.length > 10 && f.endpoints.length > 0, f.id);
    assert.doesNotMatch(f.name + f.why, /TODO|lorem|yer tutucu/i);
  }
  const app = readFileSync(resolve(import.meta.dirname, "..", "server", "app.ts"), "utf8");
  const routes = extractRoutes(app).routes;
  for (const f of FEATURE_MAP) {
    for (const ep of f.endpoints) {
      const space = ep.indexOf(" ");
      const method = ep.slice(0, space);
      const path = ep.slice(space + 1);
      const stem = path.split(":")[0] as string;
      const found = routes.some((r) => (path.includes(":") ? r.path.startsWith(stem) : r.path === path) && (r.method === method || r.method === "*"));
      assert.ok(found, `${f.id}: ${ep} is not an endpoint in app.ts`);
    }
  }
});

test("a paid or unknown route is never usable: only-paid providers keep the mode çevrimdışı", () => {
  const r = buildOfflinePlan([snap("p", { execute: "verified" }, { routeKind: "api_paid" }), snap("u", { execute: "verified" }, { routeKind: "bilinmeyen" })]);
  assert.equal(r.mode, "çevrimdışı");
  assert.match(r.providers.find((x) => x.id === "p")?.reasons.join(" ") ?? "", /ücretli rota/);
  assert.match(r.providers.find((x) => x.id === "u")?.reasons.join(" ") ?? "", /bilinmeyen rota/);
});
