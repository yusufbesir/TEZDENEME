import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { exportRecords, renderMarkdown, slugFor } from "./export.ts";
import { foldTr, MemoryError, MemoryStore } from "./store.ts";
import type { MemoryInput } from "./store.ts";

const T0 = new Date("2026-10-21T12:00:00.000Z");

function fresh(now: Date = T0): { store: MemoryStore; db: ReturnType<typeof openDb>; clock: { at: Date } } {
  const db = openDb(":memory:");
  migrate(db);
  const clock = { at: now };
  return { store: new MemoryStore(db, () => clock.at), db, clock };
}

function rec(over: Partial<MemoryInput> = {}): MemoryInput {
  return { kind: "fact", title: "Gemini istemcisi kapatildi", body: "Google bireysel hesaplarda Gemini CLI istemcisini reddediyor (UNSUPPORTED_CLIENT).", source: "test", scope: "agentmom", confidence: 0.9, ...over };
}

test("foldTr folds Turkish letters, including dotless and dotted i, and strips diacritics", () => {
  assert.equal(foldTr("Çılgın Şöför İstanbul ÜĞ"), "cilgin sofor istanbul ug");
  assert.equal(foldTr("IĞDIR"), "igdir");
});

test("search finds Turkish text however the query is spelled, ranks, and returns flags", () => {
  const { store } = fresh();
  store.add(rec({ title: "Kayıt şablonu", body: "Çalışma kaydı Istanbul sunucusunda tutulur." }));
  store.add(rec({ title: "Başka konu", body: "alakasiz metin" }));
  for (const q of ["kayit", "KAYIT", "kayıt", "istanbul", "İstanbul", "calisma", "çalışma sunucu"]) assert.equal(store.search(q).length >= 1, true, q);
  assert.equal(store.search("alakasiz")[0]?.title, "Başka konu");
  assert.deepEqual(store.search("olmayan kelime"), []);
  assert.deepEqual(store.search(""), []);
});

test("a hostile query never reaches FTS5 syntax: operators, quotes, column filters and wildcards are inert words", () => {
  const { store } = fresh();
  store.add(rec({ title: "alfa", body: "beta gama" }));
  for (const q of ['alfa OR beta', 'alfa" OR "x', "NEAR(alfa beta)", "body:beta", "alfa*", "-alfa", "alfa AND NOT beta", "}{)(", "title:"]) {
    assert.doesNotThrow(() => store.search(q), q);
  }
  assert.equal(store.search("body:beta").length, 0, "a column filter is just a word, not a filter");
  assert.equal(store.search("alfa AND NOT beta").length, 0, "operators become required words");
  assert.equal(store.search("alfa beta").length, 1);
});

test("records are append-only: content cannot be updated or deleted in SQL, only status moves", () => {
  const { store, db } = fresh();
  const { record } = store.add(rec());
  assert.throws(() => db.prepare("UPDATE memory_records SET body = 'changed' WHERE id = ?").run(record.id), /append-only/);
  assert.throws(() => db.prepare("UPDATE memory_records SET confidence = 0.1 WHERE id = ?").run(record.id), /append-only/);
  assert.throws(() => db.prepare("DELETE FROM memory_records WHERE id = ?").run(record.id), /never deleted/);
  assert.equal(store.get(record.id).body, rec().body);
  assert.equal(store.retire(record.id).status, "retired");
  assert.deepEqual(store.search("gemini"), [], "retired records leave the default results");
  assert.equal(store.search("gemini", { includeInactive: true }).length, 1, "but the row and its history stay");
});

test("an identical active record is not duplicated", () => {
  const { store } = fresh();
  const a = store.add(rec());
  const b = store.add(rec());
  assert.equal(a.duplicate, false);
  assert.equal(b.duplicate, true);
  assert.equal(b.record.id, a.record.id);
  assert.equal(store.list().length, 1);
});

test("superseding keeps history: the old record becomes superseded and is hidden by default, no contradiction is raised", () => {
  const { store } = fresh();
  const old = store.add(rec({ subject: "provider.gemini.status", body: "calisiyor" })).record;
  const next = store.add(rec({ subject: "provider.gemini.status", body: "kapatildi", supersedesId: old.id }));
  assert.equal(next.contradictions.length, 0);
  assert.equal(store.get(old.id).status, "superseded");
  assert.equal(next.record.supersedesId, old.id);
  assert.deepEqual(store.search("calisiyor"), []);
  assert.equal(store.search("calisiyor", { includeInactive: true }).length, 1);
  assert.throws(() => store.add(rec({ supersedesId: old.id, body: "ucuncu" })), (e: unknown) => e instanceof MemoryError && e.code === "conflict");
  assert.throws(() => store.add(rec({ supersedesId: next.record.id, scope: "baska", body: "x" })), (e: unknown) => e instanceof MemoryError && e.code === "conflict");
});

test("two active records on the same subject that disagree are FLAGGED as a contradiction, never auto-resolved; only a person resolves it", () => {
  const { store } = fresh();
  const a = store.add(rec({ subject: "docker", body: "docker kullanilir" })).record;
  const b = store.add(rec({ subject: "docker", body: "docker ertelendi" }));
  assert.deepEqual(b.contradictions, [a.id]);
  const hit = store.search("ertelendi")[0];
  assert.ok(hit?.flags.includes("contradiction"));
  assert.ok(store.search("kullanilir")[0]?.flags.includes("contradiction"), "both sides carry the flag");
  assert.equal(store.get(a.id).status, "active", "nothing is retired automatically");
  const open = store.openContradictions();
  assert.equal(open.length, 1);
  store.resolveFlag(open[0]!.id, "yusuf");
  assert.equal(store.openContradictions().length, 0);
  assert.ok(!store.search("ertelendi")[0]?.flags.includes("contradiction"));
  assert.throws(() => store.resolveFlag(open[0]!.id, "yusuf"), (e: unknown) => e instanceof MemoryError && e.code === "not_found");
  // Same subject in another scope, or no subject at all, is not a contradiction.
  assert.equal(store.add(rec({ subject: "docker", scope: "baska", body: "farkli" })).contradictions.length, 0);
  assert.equal(store.add(rec({ body: "konusuz bir not" })).contradictions.length, 0);
});

test("staleness and expiry are flagged by age and validUntil, per kind; low confidence is flagged too", () => {
  const { store, clock } = fresh();
  store.add(rec({ title: "eski olgu", body: "olgu metni", kind: "fact" }));
  store.add(rec({ title: "eski karar", body: "karar metni", kind: "decision" }));
  store.add(rec({ title: "sureli kayit", body: "sureli metin", validUntil: "2026-11-01T00:00:00.000Z" }));
  store.add(rec({ title: "emin degilim", body: "belirsiz metin", confidence: 0.3 }));
  assert.deepEqual(store.search("olgu")[0]?.flags, []);
  clock.at = new Date("2027-02-15T00:00:00.000Z"); // ~117 days later
  assert.ok(store.search("olgu")[0]?.flags.includes("stale"), "a fact goes stale after 90 days");
  assert.ok(!store.search("karar")[0]?.flags.includes("stale"), "a decision stays fresh for a year");
  assert.ok(store.search("sureli")[0]?.flags.includes("expired"));
  assert.ok(store.search("belirsiz")[0]?.flags.includes("low_confidence"));
  assert.equal(store.search("olgu").length, 1, "stale records are flagged, not hidden");
});

test("input is validated and secrets are redacted before storage", () => {
  const { store } = fresh();
  const bad: Array<Partial<MemoryInput>> = [{ kind: "x" as never }, { title: "" }, { body: "x".repeat(8001) }, { scope: "../kotu" }, { confidence: 1.5 }, { confidence: Number.NaN }, { observedAt: "yesterday" }, { observedAt: "2099-01-01T00:00:00.000Z" }, { source: " " }];
  for (const b of bad) assert.throws(() => store.add(rec(b)), (e: unknown) => e instanceof MemoryError && e.code === "invalid_field", JSON.stringify(b));
  const key = "sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2";
  const out = store.add(rec({ title: "anahtar sizdi", body: `kayit icinde ${key} var ve password=hunter2xyz`, sourceRef: `Bearer ${"a".repeat(30)}` }));
  assert.equal(out.record.redacted, true);
  assert.ok(!out.record.body.includes(key) && !out.record.body.includes("hunter2xyz"));
  assert.ok(!(out.record.sourceRef ?? "").includes("aaaaaaaaaa"));
  assert.equal(store.search("hunter2xyz").length, 0, "the secret never reached the index");
});

test("the contradiction check and the insert are atomic: a failing supersede leaves nothing behind", () => {
  const { store } = fresh();
  assert.throws(() => store.add(rec({ supersedesId: "00000000-0000-0000-0000-000000000000" })), (e: unknown) => e instanceof MemoryError && e.code === "not_found");
  assert.equal(store.list().length, 0);
  assert.equal(store.search("gemini").length, 0, "no orphan FTS row");
});

test("slugFor and renderMarkdown: front-matter values are JSON-encoded so a record cannot inject keys", () => {
  assert.equal(slugFor("Çılgın Şöför!! / ../x"), "cilgin-sofor-x");
  assert.equal(slugFor("???"), "kayit");
  const { store } = fresh();
  const r = store.add(rec({ title: 'baslik\nyazan: "sahte"\n---', body: "govde\u0000sonu", source: 'kaynak"\nkonu: kotu' })).record;
  const md = renderMarkdown(r, [], "[İP:AgentMom Faz 5]");
  const front = md.split("\n---\n")[0]!;
  assert.equal(front.split("\n").filter((l) => l.startsWith("yazan:")).length, 1);
  assert.ok(!front.includes("\nkonu: kotu"));
  assert.ok(!md.includes("\u0000"));
  assert.match(md, /^---\ndescription: /);
  assert.match(md, /\n# baslik yazan: "sahte" ---\n/);
});

test("export is append-only: new files only, an existing file is never overwritten, content carries source/time/confidence/scope/flags", () => {
  const { store } = fresh();
  const dir = mkTmp("mem-export-");
  const a = store.add(rec({ subject: "x", body: "bir" })).record;
  const b = store.add(rec({ subject: "x", body: "iki", title: "ikinci" })).record;
  const gateCalls: string[] = [];
  const r1 = exportRecords(store, [a.id, b.id], dir, { gate: (d) => gateCalls.push(d), now: () => T0 });
  assert.equal(r1.written.length, 2);
  assert.equal(gateCalls.length, 1);
  const files = readdirSync(dir);
  assert.equal(files.length, 2);
  const text = readFileSync(r1.written[0]!.path, "utf8");
  for (const key of ["kaynak:", "gozlem_zamani:", "guven:", "kapsam:", "bayraklar:", "durum:"]) assert.ok(text.includes(key), key);
  assert.ok(text.includes('"contradiction"'), "the contradiction flag is exported");
  assert.equal(store.get(a.id).exportedPath, r1.written[0]!.path);
  // A second export of the same records changes nothing.
  const before = readFileSync(r1.written[0]!.path, "utf8");
  const r2 = exportRecords(store, [a.id, b.id], dir, { gate: () => undefined, now: () => T0 });
  assert.equal(r2.written.length, 0);
  assert.equal(r2.skipped.length, 2);
  assert.equal(readFileSync(r1.written[0]!.path, "utf8"), before);
  // Even a hand-made file with the same name is left alone.
  const c = store.add(rec({ title: "ucuncu", body: "uc" })).record;
  const target = join(dir, `AgentMom-${c.observedAt.slice(0, 10)}-ucuncu-${c.id.slice(0, 8)}.md`);
  writeFileSync(target, "ELLE YAZILMIS\n");
  const r3 = exportRecords(store, [c.id], dir, { gate: () => undefined, now: () => T0 });
  assert.equal(r3.skipped.length, 1);
  assert.equal(readFileSync(target, "utf8"), "ELLE YAZILMIS\n");
});

test("export refuses the keys folder, relative or missing directories, files, symlinked directories and a gate refusal", () => {
  const { store } = fresh();
  const r = store.add(rec()).record;
  const base = mkTmp("mem-export-bad-");
  const keys = join(base, "HAFIZAM1", "anahtarlar");
  mkdirSync(keys, { recursive: true });
  const nested = join(keys, "alt");
  mkdirSync(nested);
  const gate = () => undefined;
  const code = (fn: () => unknown): string | undefined => {
    try {
      fn();
    } catch (e) {
      return e instanceof MemoryError ? e.code : "other";
    }
    return undefined;
  };
  assert.equal(code(() => exportRecords(store, [r.id], keys, { gate })), "forbidden_dir");
  assert.equal(code(() => exportRecords(store, [r.id], nested, { gate })), "forbidden_dir");
  assert.equal(code(() => exportRecords(store, [r.id], join(base, "ANAHTARLAR"), { gate })), "forbidden_dir");
  assert.equal(code(() => exportRecords(store, [r.id], "kasa/notlar", { gate })), "invalid_dir");
  assert.equal(code(() => exportRecords(store, [r.id], join(base, "yok"), { gate })), "invalid_dir");
  assert.ok(!existsSync(join(base, "yok")), "the directory is never created");
  const file = join(base, "dosya.txt");
  writeFileSync(file, "x");
  assert.equal(code(() => exportRecords(store, [r.id], file, { gate })), "invalid_dir");
  const real = join(base, "gercek");
  mkdirSync(real);
  const link = join(base, "baglanti");
  try {
    symlinkSync(real, link, "junction");
    assert.equal(code(() => exportRecords(store, [r.id], link, { gate })), "invalid_dir");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EPERM") throw e; // symlink creation can need privileges on some systems
  }
  assert.equal(code(() => exportRecords(store, [r.id], real, { gate: () => { throw new MemoryError("forbidden_dir", "policy"); } })), "forbidden_dir");
  assert.deepEqual(readdirSync(real), [], "a refused export writes nothing");
});

test("memory: status cannot go backwards, INSERT OR REPLACE is blocked, subject and scope are redacted/validated, bodies are fenced on export", () => {
  const { store, db } = fresh();
  const { record } = store.add(rec());
  store.retire(record.id);
  assert.throws(() => db.prepare("UPDATE memory_records SET status = 'active' WHERE id = ?").run(record.id), /only moves forward/);
  assert.throws(() => db.prepare("UPDATE memory_records SET id = 'x' WHERE id = ?").run(record.id), /append-only/);
  assert.throws(() => db.prepare("INSERT OR REPLACE INTO memory_records SELECT * FROM memory_records WHERE id = ?").run(record.id), /cannot be replaced/);
  const key = "sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2";
  assert.ok(!store.add(rec({ subject: `konu ${key}`, body: "baska govde" })).record.subject?.includes(key));
  assert.throws(() => store.add(rec({ scope: key, body: "b3" })), (e: unknown) => e instanceof MemoryError);
  const md = renderMarkdown(store.add(rec({ title: "t", body: "```dataviewjs\ndv.x()\n``` ve <% tp.x %>" })).record, [], "l");
  assert.ok(md.includes("\n````text\n"), "fence is longer than the longest backtick run inside");
  assert.ok(!md.includes("<% tp"));
});
