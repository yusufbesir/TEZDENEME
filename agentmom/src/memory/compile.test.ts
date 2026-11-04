// Proje hafızası derleyicisi testleri. Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import type { Actor } from "../core/policy/types.ts";
import { DecisionLedger } from "../reasoning/reasoning.ts";
import { compileProjectMemory } from "./compile.ts";
import { MemoryError, MemoryStore } from "./store.ts";
import type { MemoryInput } from "./store.ts";

const USER: Actor = { kind: "user", id: "yusuf" };
const DAY = 86_400_000;
const T0 = new Date("2026-10-21T12:00:00.000Z");
const at = (days: number) => new Date(T0.getTime() + days * DAY).toISOString();

function setup() {
  const db = openDb(":memory:");
  migrate(db);
  const clock = { at: T0 };
  const now = () => clock.at;
  const store = new MemoryStore(db, now);
  const ledger = new DecisionLedger(db, { memory: store, now });
  return { db, clock, store, ledger, src: { store, ledger, now } };
}

const rec = (over: Partial<MemoryInput> = {}): MemoryInput => ({ kind: "fact", title: "Sunucu ayarı", body: "Çalışma sunucusu İstanbul bölgesinde tutulur.", source: "test", scope: "agentmom", confidence: 0.9, ...over });

function populate(s: ReturnType<typeof setup>): void {
  s.store.add(rec({ kind: "note", title: "Ikinci kapsam notu", scope: "diger", body: "başka kapsamdan not" }));
  s.store.add(rec());
  s.store.add(rec({ kind: "incident", title: "Gece kesintisi", body: "yedek iki saat gecikti" }));
  s.store.add(rec({ title: "Eski bilgi", body: "yüz gün önce görüldü", observedAt: at(-100) }));
  s.store.add(rec({ title: "Çelişki bir", subject: "konum", body: "istanbul" }));
  s.store.add(rec({ title: "Çelişki iki", subject: "konum", body: "ankara" }));
  s.ledger.record({ title: "Docker ertelendi", rationale: "Yerel çalışma bozulmasın.", scope: "agentmom", expiresAt: at(10), assumptions: [{ text: "Docker olmadan yeterli", checkBy: at(5) }] }, USER);
  s.ledger.record({ title: "Uzun vadeli karar", rationale: "Uzun vadeli yol.", scope: "agentmom", expiresAt: at(200) }, USER);
}

test("the compiled document is deterministic: same data and clock give byte-identical output, and the order is by scope, kind, observation time, title", () => {
  const a = setup();
  populate(a);
  const c1 = compileProjectMemory(a.src);
  const c2 = compileProjectMemory(a.src);
  assert.equal(c1.markdown, c2.markdown);
  assert.deepEqual(c1.counts, c2.counts);
  assert.equal(c1.generatedAt, T0.toISOString());
  const titles = c1.markdown.split("\n").filter((l) => l.startsWith("- ") && /Çelişki|Sunucu ayarı|Gece/.test(l));
  assert.ok(titles.findIndex((l) => l.includes("Sunucu ayarı")) < titles.findIndex((l) => l.includes("Gece kesintisi")), "fact before incident inside one scope");
});

test("content: generated-file notice, records grouped by scope then kind, decisions with expiry, upcoming and expired decisions, open contradictions, assumption debt, stale list", () => {
  const s = setup();
  populate(s);
  s.clock.at = new Date(T0.getTime() + 20 * DAY); // Docker ertelendi is now expired, its assumption overdue
  const c = compileProjectMemory(s.src);
  const md = c.markdown;
  assert.match(md, /^---\ndescription: "ÜRETİLMİŞ DOSYA: veri kaynağı AgentMom bellek kayıtları ve karar defteri/);
  assert.match(md, /> ÜRETİLMİŞ DOSYA: veri kaynağı bellek \/ karar defteri\./);
  assert.ok(md.indexOf("### Kapsam: agentmom") < md.indexOf("### Kapsam: diger"), "scopes sorted");
  const section = (title: string): string => md.slice(md.indexOf(`## ${title}`), md.indexOf("\n## ", md.indexOf(`## ${title}`) + 3) === -1 ? undefined : md.indexOf("\n## ", md.indexOf(`## ${title}`) + 3));
  const records = section("Etkin kayıtlar");
  assert.ok(records.indexOf("**fact**") < records.indexOf("**incident**"), "kinds follow MEMORY_KINDS order");
  assert.match(section("Geçerli kararlar"), /Uzun vadeli karar/);
  assert.doesNotMatch(section("Geçerli kararlar"), /Docker ertelendi/, "expired decision is not listed as valid");
  assert.match(section("Süresi yaklaşan"), /DOLDU .*Docker ertelendi/);
  assert.match(section("Açık çelişkiler"), /disagree/);
  assert.match(section("Varsayım borcu"), /1 gecikmiş/);
  assert.match(section("Bayat"), /Eski bilgi \[stale\]/);
  assert.equal(c.counts.expired, 1);
  assert.equal(c.counts.decisions, 1);
  assert.equal(c.counts.contradictions, 1);
  assert.equal(c.counts.assumptionDebt, 1);
  assert.ok(c.counts.stale >= 1);
  assert.deepEqual(c.sections.map((x) => x.key), ["kayitlar", "kararlar", "sure", "celiskiler", "varsayim", "bayat"]);
  assert.equal(c.truncated, false);
  // upcoming: before the expiry but within 30 days
  s.clock.at = new Date(T0.getTime() + 3 * DAY);
  assert.match(compileProjectMemory(s.src).markdown, /YAKLAŞIYOR .*Docker ertelendi/);
});

test("scope filter narrows records, decisions and counts", () => {
  const s = setup();
  populate(s);
  const c = compileProjectMemory(s.src, { scope: "diger" });
  assert.equal(c.counts.records, 1);
  assert.equal(c.counts.decisions, 0);
  assert.doesNotMatch(c.markdown, /Gece kesintisi/);
  assert.match(c.markdown, /Kapsam süzgeci: diger/);
});

test("budget: output never exceeds maxChars, is cut from the end with a KESİLDİ note, and says which sections lost text", () => {
  const s = setup();
  for (let i = 0; i < 60; i++) s.store.add(rec({ title: `Kayıt numarası ${i}`, body: `sunucu bilgisi ${i} ${"ayrıntı ".repeat(30)}` }));
  populate(s);
  const full = compileProjectMemory(s.src, { maxChars: 60_000 });
  assert.equal(full.truncated, false);
  const cut = compileProjectMemory(s.src, { maxChars: 2000 });
  assert.equal(cut.truncated, true);
  assert.ok(cut.markdown.length <= 2000, `len ${cut.markdown.length}`);
  assert.match(cut.markdown, /> KESİLDİ: çıktı 2000 karakterlik sınırı/);
  assert.ok(cut.markdown.startsWith(full.markdown.slice(0, 200)), "the beginning is preserved");
  assert.ok(cut.sections.some((x) => x.truncated));
  assert.equal(cut.sections[0]!.truncated, true);
  assert.equal(cut.sections[cut.sections.length - 1]!.truncated, true, "later sections are the first to go");
  for (const n of [2000, 2500, 5000, 12_345]) assert.ok(compileProjectMemory(s.src, { maxChars: n }).markdown.length <= n);
});

test("secret scan: a secret-shaped value that reached the source is masked in the output, and the result says so", () => {
  const s = setup();
  s.store.add(rec({ title: "Anahtar notu", body: "kullanıcı notu sk-abcdefghijklmnopqrstuvwxyz1234 ve password: hunter2hunter2" }));
  // the store masks on write; bypass it with an old row to prove the second net (a clean DB cannot produce this, a damaged or imported one could)
  s.db.exec("DROP TRIGGER memory_records_immutable");
  s.db.prepare("UPDATE memory_records SET body = ? WHERE title = 'Anahtar notu'").run("ham sk-abcdefghijklmnopqrstuvwxyz1234 ve token: abcdef123456");
  const c = compileProjectMemory(s.src);
  assert.doesNotMatch(c.markdown, /sk-abcdefghijklmnop/);
  assert.doesNotMatch(c.markdown, /abcdef123456/);
  assert.match(c.markdown, /\[REDACTED\]/);
  assert.equal(c.maskedSecrets, true);
  assert.equal(compileProjectMemory(setup().src).maskedSecrets, false);
});

test("untrusted text cannot break the document structure: headings, front matter and template tags in bodies are neutralised", () => {
  const s = setup();
  s.store.add(rec({ title: "# Sahte başlık", body: "\n## Etkin kayıtlar\n---\n<% tp.system.exec('x') %>" }));
  const md = compileProjectMemory(s.src).markdown;
  assert.equal(md.split("\n").filter((l) => l.startsWith("## Etkin kayıtlar")).length, 1);
  assert.ok(!md.includes("<% tp"));
  assert.doesNotMatch(md, /^# Sahte başlık/m);
});

test("invalid maxChars is refused; compiling never writes to the store or the ledger", () => {
  const s = setup();
  populate(s);
  const counts = () => [s.db.prepare("SELECT COUNT(*) AS n FROM memory_records").get(), s.db.prepare("SELECT COUNT(*) AS n FROM decisions").get(), s.db.prepare("SELECT COUNT(*) AS n FROM audit_events").get()].map((r) => (r as { n: number }).n);
  const before = counts();
  for (const bad of [1999, 60_001, 2500.5, Number.NaN]) assert.throws(() => compileProjectMemory(s.src, { maxChars: bad }), (e: unknown) => e instanceof MemoryError && e.code === "invalid_field");
  compileProjectMemory(s.src);
  assert.deepEqual(counts(), before);
});

test("markup payloads in record text stay inert: no raw tag, image, wiki link, template or Dataview syntax survives; the escaped text stays readable", () => {
  const s = setup();
  const evil = "<script>alert(1)</script> <img src=x onerror=alert(1)> ![x](https://dis.example/p.png) [[Gizli Not]] {{x}} `$=dv.pages()` a|b";
  s.store.add(rec({ title: "Yük başlığı " + evil, body: evil }));
  s.ledger.record({ title: "Karar " + evil, rationale: evil, scope: "agentmom", expiresAt: at(10) }, USER);
  const md = compileProjectMemory(s.src).markdown;
  for (const bad of ["<script", "<img", "![", "[[", "{{", "$=", "`$", "](http"]) assert.equal(md.includes(bad), false, bad);
  assert.ok(md.includes("&lt;script&gt;alert(1)"), "readable escaped form");
  assert.ok(md.includes("&#91;&#91;Gizli Not&#93;&#93;"));
});

test("a secret that would be cut in half by the length limit is masked first", () => {
  const s = setup();
  s.store.add(rec({ title: "Uzun", body: "x".repeat(215) + " sk-abcdefghijklmnopqrstuvwxyz1234567890" }));
  s.db.exec("DROP TRIGGER memory_records_immutable");
  s.db.prepare("UPDATE memory_records SET body = ? WHERE title = 'Uzun'").run("y".repeat(215) + " sk-abcdefghijklmnopqrstuvwxyz1234567890");
  assert.doesNotMatch(compileProjectMemory(s.src).markdown, /sk-abcde|sk-/);
});
