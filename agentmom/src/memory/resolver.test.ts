// Mantıksal çelişki çözücü testleri. Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek (bellek içi) SQLite; saat sahte. Çözücü yalnız ÖNERİR: kayıtlar ve bayraklar test sonunda değişmemiş olmalı.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { MemoryStore } from "./store.ts";
import type { MemoryInput } from "./store.ts";
import { MAX_RESOLUTIONS, suggestResolutions } from "./resolver.ts";

const DAY = 86_400_000;
const T0 = new Date("2026-10-21T12:00:00.000Z");
const ago = (days: number) => new Date(T0.getTime() - days * DAY).toISOString();

function setup() {
  const db = openDb(":memory:");
  migrate(db);
  const store = new MemoryStore(db, () => T0);
  return { db, store, src: { store, now: () => T0 } };
}

let n = 0;
const rec = (over: Partial<MemoryInput> & { subject: string }): MemoryInput => ({ kind: "fact", title: `Kayıt ${++n}`, body: `İçerik ${n} ${over.subject}`, source: "test", scope: "agentmom", confidence: 0.8, observedAt: ago(1), ...over });

// Aynı konuda iki kayıt: ilki a, ikincisi b (b eklenince çelişki bayrağı oluşur).
function pair(store: MemoryStore, subject: string, a: Partial<MemoryInput>, b: Partial<MemoryInput>) {
  const ra = store.add(rec({ subject, ...a })).record;
  const rb = store.add(rec({ subject, ...b })).record;
  return { ra, rb };
}

test("rule 1 (recency): the newer observation is kept when the dates differ by at least 7 days", () => {
  const { store, src } = setup();
  const { ra, rb } = pair(store, "konu.yenilik", { observedAt: ago(30) }, { observedAt: ago(1) });
  const r = suggestResolutions(src);
  assert.equal(r.totalOpen, 1);
  const x = r.resolutions[0]!;
  assert.equal(x.outcome, "önerildi");
  assert.equal(x.rule, "yenilik");
  assert.equal(x.keep, rb.id);
  assert.equal(x.retire, ra.id);
  assert.equal(x.retireAlreadyInactive, false);
  assert.ok(x.confidence > 0.5 && x.confidence <= 1);
  assert.match(x.rationale, /daha yeni gözlem/);
  // yönden bağımsız: yeni olan ilk eklenen de olsa aynı sonuç
  const o = setup();
  const p2 = pair(o.store, "konu.yenilik", { observedAt: ago(1) }, { observedAt: ago(30) });
  assert.equal(suggestResolutions(o.src).resolutions[0]!.keep, p2.ra.id);
});

test("rule 2 (confidence): with equal dates the clearly more confident record is kept", () => {
  const { store, src } = setup();
  const { ra, rb } = pair(store, "konu.guven", { confidence: 0.9 }, { confidence: 0.5 });
  const x = suggestResolutions(src).resolutions[0]!;
  assert.equal(x.rule, "guven");
  assert.equal(x.keep, ra.id);
  assert.equal(x.retire, rb.id);
  // küçük fark (0,1) belirleyici değildir
  const o = setup();
  pair(o.store, "konu.guven", { confidence: 0.8 }, { confidence: 0.7 });
  assert.equal(suggestResolutions(o.src).resolutions[0]!.outcome, "çözülemez");
});

test("rule 3 (kind): decision > fact > note, only among those three", () => {
  const { store, src } = setup();
  const { ra } = pair(store, "konu.tur", { kind: "decision" }, { kind: "note" });
  const x = suggestResolutions(src).resolutions[0]!;
  assert.equal(x.rule, "tur");
  assert.equal(x.keep, ra.id);
  const o = setup();
  pair(o.store, "konu.tur", { kind: "incident" }, { kind: "note" });
  assert.equal(suggestResolutions(o.src).resolutions[0]!.outcome, "çözülemez", "incident is not ranked");
});

test("rule 4 (source authority): user source beats agent source; unknown sources are not compared", () => {
  const { store, src } = setup();
  const { rb } = pair(store, "konu.kaynak", { source: "agent:claude" }, { source: "user:yusuf" });
  const x = suggestResolutions(src).resolutions[0]!;
  assert.equal(x.rule, "kaynak");
  assert.equal(x.keep, rb.id);
  const o = setup();
  pair(o.store, "konu.kaynak", { source: "wiki" }, { source: "user:yusuf" });
  assert.equal(suggestResolutions(o.src).resolutions[0]!.outcome, "çözülemez");
});

test("rule 5 (staleness): the fresh record wins when the other is stale and dates are within 7 days", () => {
  const { store, src } = setup();
  // fact bayatlığı 90 gün: 91 gün önceki bayat, 88 gün önceki değil; fark 3 gün (< 7)
  const { rb } = pair(store, "konu.bayat", { observedAt: ago(91) }, { observedAt: ago(88) });
  const x = suggestResolutions(src).resolutions[0]!;
  assert.equal(x.rule, "bayatlik");
  assert.equal(x.keep, rb.id);
  // çelişki bayrağında kayıt (a) sonradan eklenen, diğeri (b) önceki kayıttır.
  assert.deepEqual(x.b?.flags, ["stale"]);
  assert.deepEqual(x.a?.flags, []);
});

test("a newer but stale record does not win by recency over a fresh one", () => {
  const { store, src } = setup();
  // incident bayatlığı 30 gün. a: 40 gün önce (bayat). b: 33 gün önce değil mi? 33 > 30 bayat. Bu yüzden note kullan: eşik 180.
  // a (note, 200 gün önce) bayat; b (note, 190 gün önce) da bayat => ikisi bayat, yenilik b'yi seçer.
  const both = setup();
  const p = pair(both.store, "konu.ikisi", { kind: "note", observedAt: ago(200) }, { kind: "note", observedAt: ago(190) });
  assert.equal(suggestResolutions(both.src).resolutions[0]!.keep, p.rb.id);
  // Yeni olan (b) süresi dolmuş (validUntil geçmiş), eski olan (a) geçerli: yenilik işlemez; bayatlık a'yı seçer.
  const { store: s2, src: src2 } = setup();
  const { ra } = pair(s2, "konu.yeni-ama-bayat", { observedAt: ago(20), confidence: 0.8 }, { observedAt: ago(5), validUntil: ago(2), confidence: 0.8 });
  const x = suggestResolutions(src2).resolutions[0]!;
  assert.equal(x.rule, "bayatlik");
  assert.equal(x.keep, ra.id);
  void store;
  void src;
});

test("dissent: a later rule that disagrees lowers the confidence and is listed", () => {
  const plain = setup();
  pair(plain.store, "konu.a", { observedAt: ago(30) }, { observedAt: ago(1) });
  const base = suggestResolutions(plain.src).resolutions[0]!;
  const { store, src } = setup();
  const { rb } = pair(store, "konu.karsi-oy", { observedAt: ago(30), confidence: 0.95 }, { observedAt: ago(1), confidence: 0.55 });
  const x = suggestResolutions(src).resolutions[0]!;
  assert.equal(x.rule, "yenilik");
  assert.equal(x.keep, rb.id);
  assert.deepEqual(x.dissentingRules, ["guven"]);
  assert.ok(x.confidence < base.confidence, `${x.confidence} < ${base.confidence}`);
  assert.match(x.rationale, /guven kural/);
});

test("ties and ambiguity: 'cannot be resolved, the user decides' with no keep/retire", () => {
  const { store, src } = setup();
  pair(store, "konu.esit", {}, {});
  const x = suggestResolutions(src).resolutions[0]!;
  assert.equal(x.outcome, "çözülemez");
  assert.equal(x.keep, null);
  assert.equal(x.retire, null);
  assert.equal(x.rule, "none");
  assert.equal(x.confidence, 0);
  assert.match(x.rationale, /kullanıcı karar versin/);
  assert.equal(suggestResolutions(src).unresolvable, 1);
});

test("an already inactive loser is reported so that only the flag needs resolving", () => {
  const { db, store, src } = setup();
  const { ra, rb } = pair(store, "konu.pasif", { observedAt: ago(30) }, { observedAt: ago(1) });
  store.retire(ra.id);
  const x = suggestResolutions(src).resolutions[0]!;
  assert.equal(x.retire, ra.id);
  assert.equal(x.retireAlreadyInactive, true);
  assert.match(x.rationale, /yalnız çelişki bayrağını çözmek yeter/);
  void db;
  void rb;
});

test("read-only: no record is retired and no flag is resolved; at most 50 are considered and truncation is reported", () => {
  const { db, store, src } = setup();
  for (let i = 0; i < MAX_RESOLUTIONS + 5; i++) pair(store, `konu.toplu${i}`, { observedAt: ago(30) }, { observedAt: ago(1) });
  const snap = () => JSON.stringify([db.prepare("SELECT id, status FROM memory_records ORDER BY id").all(), db.prepare("SELECT id, resolved_at FROM memory_flags ORDER BY id").all()]);
  const before = snap();
  const r = suggestResolutions(src);
  assert.equal(r.totalOpen, MAX_RESOLUTIONS + 5);
  assert.equal(r.considered, MAX_RESOLUTIONS);
  assert.equal(r.truncated, true);
  assert.equal(r.resolutions.length, MAX_RESOLUTIONS);
  assert.equal(snap(), before);
  assert.deepEqual(suggestResolutions(src), r, "deterministic");
});

test("no open contradictions: an empty, honest report", () => {
  const { src } = setup();
  const r = suggestResolutions(src);
  assert.equal(r.totalOpen, 0);
  assert.deepEqual(r.resolutions, []);
  assert.equal(r.truncated, false);
});

test("texts in the report are masked", () => {
  const { store, src } = setup();
  pair(store, "konu.sir", { title: "Anahtar sk-abcdefghijklmnopqrstuvwxyz0123 tutuluyor", observedAt: ago(30) }, { observedAt: ago(1) });
  assert.doesNotMatch(JSON.stringify(suggestResolutions(src)), /sk-abcdef/);
});

test("source classification is not fooled by free text: 'user-claude' is an agent, a fake 'decision:' id is unknown, a real decision id is user-sourced", () => {
  const fake = "decision:00000000-0000-0000-0000-000000000001";
  // user-claude (ajan) eski kullanıcı kaydına karşı yeni olsa da kazanamaz değil: kullanıcı DEĞİL, ajan sayılır; karşı taraf gerçek kullanıcıysa kullanıcı korunur
  const a = setup();
  const p = pair(a.store, "konu.ajan-taklit", { source: "user:yusuf", observedAt: ago(30) }, { source: "user-claude", observedAt: ago(1) });
  const x = suggestResolutions(a.src).resolutions[0]!;
  assert.equal(x.rule, "kaynak");
  assert.equal(x.keep, p.ra.id, "the real user record wins although the agent record is newer");
  // sahte decision:<id> bilinmiyor sayılır: kaynak kuralı işlemez
  const b = setup();
  pair(b.store, "konu.sahte-karar", { source: "agent:claude", observedAt: ago(30) }, { source: fake, observedAt: ago(30) });
  assert.equal(suggestResolutions({ ...b.src, decisionExists: () => false }).resolutions[0]!.outcome, "çözülemez");
  // gerçek karar kimliği kullanıcı kaynaklıdır
  const c = setup();
  const q = pair(c.store, "konu.gercek-karar", { source: "agent:claude", observedAt: ago(1) }, { source: fake, observedAt: ago(30) });
  const y = suggestResolutions({ ...c.src, decisionExists: (id) => id === "00000000-0000-0000-0000-000000000001" }).resolutions[0]!;
  assert.equal(y.rule, "kaynak");
  assert.equal(y.keep, q.rb.id);
  // sahte "user" ön eki taklitleri
  const d = setup();
  pair(d.store, "konu.onek", { source: "userx", observedAt: ago(30) }, { source: "agent:codex", observedAt: ago(1) });
  assert.notEqual(suggestResolutions(d.src).resolutions[0]!.rule, "kaynak", "'userx' is not a user source");
});

test("an agent record can never win against a user-sourced one by recency or confidence", () => {
  const { store, src } = setup();
  const { ra } = pair(store, "konu.ajan-yenilik", { source: "user:yusuf", observedAt: ago(60), confidence: 0.5 }, { source: "agent:claude", observedAt: ago(1), confidence: 0.95 });
  const x = suggestResolutions(src).resolutions[0]!;
  assert.equal(x.keep, ra.id);
  assert.equal(x.rule, "kaynak");
  assert.deepEqual([...x.dissentingRules].sort(), ["guven", "yenilik"]);
});

test("retiring a user-sourced record is suggested with confidence at most 0.5 and an explicit note", () => {
  const { store, src } = setup();
  // kullanıcı kaydı eski ve bilinmeyen kaynaklı yeni kayıt kazanıyor (kaynak karşılaştırması yok): kullanıcı kaydı emekli önerisi
  const { ra, rb } = pair(store, "konu.kullanici-emekli", { source: "user:yusuf", observedAt: ago(90) }, { source: "wiki", observedAt: ago(1) });
  const x = suggestResolutions(src).resolutions[0]!;
  assert.equal(x.keep, rb.id);
  assert.equal(x.retire, ra.id);
  assert.ok(x.confidence <= 0.5, String(x.confidence));
  assert.match(x.rationale, /yalnız siz emekli edebilirsiniz/);
  // ajan kaydını emekli önerirken not yok
  const o = setup();
  pair(o.store, "konu.ajan-emekli", { source: "agent:claude", observedAt: ago(90) }, { source: "user:yusuf", observedAt: ago(1) });
  assert.doesNotMatch(suggestResolutions(o.src).resolutions[0]!.rationale, /yalnız siz/);
});
