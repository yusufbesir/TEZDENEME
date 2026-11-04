// İnternet erişimi ayarları testleri (D8c-2a). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { AuditLog, SqliteAuditSink } from "../core/audit/audit.ts";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { NetError, NetSettingsStore } from "./settings.ts";

function setup() {
  const db = openDb(":memory:");
  migrate(db);
  const audit = new AuditLog([new SqliteAuditSink(db)]);
  return { db, audit, store: new NetSettingsStore(db, { audit }) };
}
const USER = { kind: "user" as const, id: "yusuf" };
const AGENT = { kind: "agent" as const, id: "ajan" };

test("default settings: internet is OFF, no domains, per-use approval ON, nobody has set it", () => {
  const { store } = setup();
  assert.deepEqual(store.get(), { enabled: false, allowedDomains: [], perUseApproval: true, setBy: null, setAt: null });
});

test("only the user can set; agent and system are refused (and the refusal is audited); nothing is stored", () => {
  const { store, db } = setup();
  const input = { enabled: true, allowedDomains: ["example.com"], perUseApproval: true };
  for (const actor of [AGENT, { kind: "system" as const, id: "automation" }]) {
    assert.throws(() => store.set(input, actor), (e: unknown) => e instanceof NetError && e.code === "approval_requires_user");
  }
  assert.equal(store.get().enabled, false);
  assert.equal((db.prepare("SELECT count(*) AS n FROM net_settings").get() as { n: number }).n, 0);
  assert.equal((db.prepare("SELECT count(*) AS n FROM audit_events WHERE action = 'net.settings' AND decision = 'deny'").get() as { n: number }).n, 2);
});

test("set stores the NEWEST row as current, normalises domains (sorted, lower-case, unique), audits old/new summaries (domain names only) and writes a ledger entry", () => {
  const { store, db } = setup();
  const s1 = store.set({ enabled: true, allowedDomains: ["Docs.Example.com", "example.com", "example.com"], perUseApproval: false }, USER);
  assert.deepEqual(s1.allowedDomains, ["docs.example.com", "example.com"]);
  assert.equal(s1.enabled, true);
  assert.equal(s1.perUseApproval, false);
  assert.equal(s1.setBy, "user:yusuf");
  const s2 = store.set({ enabled: false, allowedDomains: ["example.com"], perUseApproval: true }, USER);
  assert.equal(store.get().enabled, false);
  assert.equal(s2.allowedDomains.length, 1);
  const rows = db.prepare("SELECT details_json FROM audit_events WHERE action = 'net.settings' AND decision = 'allow' ORDER BY rowid").all() as Array<{ details_json: string }>;
  assert.equal(rows.length, 2);
  const d2 = JSON.parse((rows[1] as { details_json: string }).details_json) as { before: { enabled: boolean; domainCount: number }; after: { enabled: boolean; domainCount: number; domains: string[] } };
  assert.equal(d2.before.enabled, true);
  assert.equal(d2.before.domainCount, 2);
  assert.equal(d2.after.enabled, false);
  assert.deepEqual(d2.after.domains, ["example.com"]);
  const ledger = db.prepare("SELECT kind, summary, reason, actor_kind FROM change_ledger ORDER BY rowid").all() as Array<{ kind: string; summary: string; reason: string; actor_kind: string }>;
  assert.equal(ledger.length, 2);
  assert.equal((ledger[0] as { kind: string }).kind, "policy");
  assert.match((ledger[0] as { reason: string }).reason, /açtı/);
  assert.match((ledger[1] as { reason: string }).reason, /kapattı/);
});

test("validation: enabling needs at least one domain; IPs, local names, single labels, bad shapes, wrong types and 51 domains are refused; nothing is stored", () => {
  const { store, db } = setup();
  const t = (allowedDomains: unknown, enabled: unknown = true, perUseApproval: unknown = true) => () => store.set({ enabled, allowedDomains, perUseApproval }, USER);
  const bad = (f: () => unknown) => assert.throws(f, (e: unknown) => e instanceof NetError && e.code === "invalid_field");
  bad(t([]));
  for (const d of ["127.0.0.1", "10.0.0.1", "localhost", "*.local", "intranet", "router.lan", "x.internal", "[::1]", "a b.com", "http://example.com", "example.com/x", "*.com", "a.*.com"]) bad(t([d]));
  bad(t(["example.com", "127.0.0.1"]));
  bad(t(Array.from({ length: 51 }, (_v, i) => `site${i}.example.com`)));
  bad(t(["x".repeat(101) + ".com"]));
  bad(t("example.com"));
  bad(t(null));
  bad(t([5]));
  bad(t(["example.com"], "yes"));
  bad(t(["example.com"], true, "no"));
  bad(t(["example.com"], null));
  assert.equal((db.prepare("SELECT count(*) AS n FROM net_settings").get() as { n: number }).n, 0);
  // 50 alan adı tam sınırdır ve kabul edilir; kapatmak için alan adı gerekmez.
  assert.equal(store.set({ enabled: true, allowedDomains: Array.from({ length: 50 }, (_v, i) => `site${i}.example.com`), perUseApproval: true }, USER).allowedDomains.length, 50);
  assert.equal(store.set({ enabled: false, allowedDomains: [], perUseApproval: true }, USER).enabled, false);
});

test("net_settings is append-only at the SQL level: UPDATE and DELETE are aborted by triggers", () => {
  const { store, db } = setup();
  store.set({ enabled: true, allowedDomains: ["example.com"], perUseApproval: true }, USER);
  assert.throws(() => db.exec("UPDATE net_settings SET enabled = 0"), /append-only/);
  assert.throws(() => db.exec("DELETE FROM net_settings"), /append-only/);
  assert.equal(store.get().enabled, true);
});

test("migration 015 down removes the tables and up/down round-trips", async () => {
  const { rollback, migrate: mig, loadMigrations } = await import("../core/db/migrate.ts");
  const db = openDb(":memory:");
  mig(db);
  rollback(db, 14);
  assert.equal((db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name IN ('net_settings','net_fetches')").get() as { n: number }).n, 0);
  assert.deepEqual(mig(db), Array.from({ length: loadMigrations().length - 14 }, (_, i) => 15 + i));
});

test("public-suffix wildcards are refused by the settings validation; the current row is chosen by the explicit seq column", () => {
  const { store, db } = setup();
  for (const d of ["*.github.io", "*.co.uk", "*.vercel.app", "github.io"]) {
    assert.throws(() => store.set({ enabled: true, allowedDomains: [d], perUseApproval: true }, USER), (e: unknown) => e instanceof NetError && e.code === "invalid_field", d);
  }
  store.set({ enabled: true, allowedDomains: ["alice.github.io"], perUseApproval: true }, USER);
  store.set({ enabled: false, allowedDomains: [], perUseApproval: true }, USER);
  const cols = (db.prepare("PRAGMA table_info(net_settings)").all() as Array<{ name: string; pk: number }>).filter((c) => c.pk === 1).map((c) => c.name);
  assert.deepEqual(cols, ["seq"]);
  assert.equal(store.get().enabled, false);
  const seqs = (db.prepare("SELECT seq FROM net_settings ORDER BY seq").all() as Array<{ seq: number }>).map((r) => r.seq);
  assert.deepEqual(seqs, [1, 2]);
});
