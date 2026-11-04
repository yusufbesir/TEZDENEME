// Akıl yürütme derleyicisi testleri. Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek (bellek içi) SQLite; saat sahte. Derleyici salt okunurdur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import type { Actor } from "../core/policy/types.ts";
import { MemoryStore } from "../memory/store.ts";
import { compileArgument } from "./argument.ts";
import { DecisionLedger, ReasoningError } from "./reasoning.ts";

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
  return { db, clock, store, ledger, src: { db, ledger, store, now } };
}

const dec = (title: string, over: Record<string, unknown> = {}) => ({ title, rationale: `${title} gerekçesi`, scope: "agentmom", expiresAt: at(200), assumptions: [{ text: `${title} varsayımı`, checkBy: at(30) }], ...over });

test("verdict 'reliable': every assumption holds and the expiry is far away; grounds carry the rationale and the verified assumption", () => {
  const { ledger, src } = setup();
  const d = ledger.record(dec("Docker ertelendi") as never, USER);
  ledger.setAssumption(d.assumptions[0]!.id, "holds", "Elle doğrulandı: yerel çalışma yeterli", USER);
  const a = compileArgument(src, d.id);
  assert.equal(a.verdict, "güvenilir");
  assert.equal(a.claim, "Docker ertelendi");
  assert.equal(a.status, "active");
  assert.ok(a.grounds[0]!.startsWith("Gerekçe: Docker ertelendi gerekçesi"));
  assert.ok(a.grounds.some((g) => /Doğrulanmış varsayım: Docker ertelendi varsayımı \(kanıt: Elle doğrulandı/.test(g)));
  assert.deepEqual(a.assumptions.map((x) => [x.text, x.status]), [["Docker ertelendi varsayımı", "holds"]]);
  assert.deepEqual(a.risks, []);
  assert.deepEqual(a.counterpoints, []);
  assert.equal(a.linkedMemory.length, 1, "the decision's own memory record is linked");
  assert.equal(a.linkedMemory[0]!.kind, "decision");
  assert.match(a.markdown, /\*\*Hüküm: güvenilir\*\*/);
  assert.match(a.markdown, /## Dayanaklar/);
  assert.match(a.markdown, /## Karşı görüşler/);
});

test("verdict 'review': an unvalidated assumption, or an expiry within 30 days, or an expired decision", () => {
  const { clock, ledger, src } = setup();
  const unv = ledger.record(dec("Doğrulanmamış") as never, USER);
  const a = compileArgument(src, unv.id);
  assert.equal(a.verdict, "gözden geçir");
  assert.ok(a.risks.some((r) => r.kind === "doğrulanmamış varsayım" && r.severity === "medium"));
  assert.match(a.verdictReasons.join(" "), /1 varsayım doğrulanmamış/);

  const soon = ledger.record(dec("Yakında bitiyor", { expiresAt: at(10), assumptions: [] }) as never, USER);
  const s = compileArgument(src, soon.id);
  assert.equal(s.verdict, "gözden geçir");
  assert.ok(s.risks.some((r) => r.kind === "süresi yaklaşıyor"));

  const ok = ledger.record(dec("Sağlam", { expiresAt: at(100) }) as never, USER);
  ledger.setAssumption(ok.assumptions[0]!.id, "holds", "Elle doğrulandı: yeterli kanıt var", USER);
  clock.at = new Date(T0.getTime() + 101 * DAY);
  const e = compileArgument(src, ok.id);
  assert.equal(e.verdict, "gözden geçir");
  assert.ok(e.risks.some((r) => r.kind === "süresi doldu" && r.severity === "high"));
});

test("verdict 'weak': a broken assumption, or a decision that is no longer valid (superseded or retired)", () => {
  const { ledger, src } = setup();
  const b = ledger.record(dec("Kırık varsayımlı") as never, USER);
  ledger.setAssumption(b.assumptions[0]!.id, "broken", "Gözlem varsayımı çürüttü: sunucu yetmedi", USER);
  const x = compileArgument(src, b.id);
  assert.equal(x.verdict, "zayıf");
  assert.ok(x.risks.some((r) => r.kind === "kırık varsayım" && r.severity === "high"));
  assert.match(x.verdictReasons.join(" "), /1 varsayım kırık/);

  const r = ledger.record(dec("Emekli olacak") as never, USER);
  ledger.retire(r.id, USER);
  const y = compileArgument(src, r.id);
  assert.equal(y.verdict, "zayıf");
  assert.ok(y.risks.some((q) => q.kind === "geçersiz karar"));
});

test("counterpoints: earlier decisions in the same scope that were superseded, with their broken assumptions; later ones are not counterpoints", () => {
  const { ledger, src } = setup();
  const a = ledger.record(dec("Soy A", { scope: "agentmom" }) as never, USER);
  ledger.setAssumption(a.assumptions[0]!.id, "broken", "Varsayım çürüdü: ölçüm farklı çıktı", USER);
  const b = ledger.record(dec("Soy A v2", { supersedesId: a.id }) as never, USER);
  const c = ledger.record(dec("Soy A v3", { supersedesId: b.id }) as never, USER);
  const doc = compileArgument(src, c.id);
  assert.deepEqual(doc.counterpoints.map((x) => x.decisionId), [a.id, b.id]);
  assert.deepEqual(doc.counterpoints[0]!.brokenAssumptions, ["Soy A varsayımı"]);
  assert.match(doc.markdown, /Soy A \(2026-10-21/);
  assert.match(doc.markdown, /kırık varsayım: Soy A varsayımı/);
  assert.equal(doc.linkedMemory.length, 3, "own and predecessors' memory records");
  const first = compileArgument(src, a.id);
  assert.deepEqual(first.counterpoints, [], "the root has no earlier decisions");
  assert.equal(first.verdict, "zayıf");
});

test("linked memory risks: an open contradiction flag and a stale record are listed", () => {
  const { db, clock, ledger, store, src } = setup();
  const d = ledger.record(dec("Bağlı kayıtlı", { expiresAt: at(300) }) as never, USER);
  ledger.setAssumption(d.assumptions[0]!.id, "holds", "Elle doğrulandı: yeterli kanıt var", USER);
  db.prepare("INSERT INTO memory_flags (id, record_id, other_id, flag, detail, created_at) VALUES ('f1', ?, NULL, 'contradiction', 'test', ?)").run(d.memoryRecordId, T0.toISOString());
  const a = compileArgument(src, d.id);
  assert.ok(a.risks.some((r) => r.kind === "çelişki"));
  assert.equal(a.verdict, "güvenilir", "contradictions are listed but do not change the documented verdict rule");
  clock.at = new Date(T0.getTime() + 310 * DAY);
  assert.ok(compileArgument(src, d.id).risks.some((r) => r.kind === "bayat bellek"));
  void store;
});

test("a decision without assumptions gets a low-severity note, not a verdict change", () => {
  const { ledger, src } = setup();
  const d = ledger.record(dec("Varsayımsız", { assumptions: [] }) as never, USER);
  const a = compileArgument(src, d.id);
  assert.equal(a.verdict, "güvenilir");
  assert.deepEqual(a.risks.map((r) => [r.kind, r.severity]), [["varsayım yok", "low"]]);
});

test("markdown is neutralised: raw tags, images, wiki links, templates, dataview and table pipes are escaped; secrets are masked", () => {
  const { ledger, src } = setup();
  const evil = "<script>alert(1)</script> ![x](http://e/p.png) [[bağ]] {{şablon}} $=dv.pages() | x `kod` sk-abcdefghijklmnopqrstuvwxyz0123";
  const d = ledger.record(dec("# Kötü başlık", { rationale: evil, assumptions: [{ text: evil, checkBy: at(30) }] }) as never, USER);
  const a = compileArgument(src, d.id);
  for (const bad of ["<script", "![", "[[", "{{", "$=", "sk-abcdef", "|"]) assert.ok(!a.markdown.includes(bad), `markdown contains ${bad}`);
  assert.ok(a.markdown.includes("&lt;script&gt;"));
  assert.doesNotMatch(a.markdown, /^# # /m, "title heading marker is neutralised");
  assert.doesNotMatch(JSON.stringify(a), /sk-abcdef/);
  assert.doesNotMatch(a.markdown, /\n(#|-) \S*\n.*\r/);
  // JSON alanları düz metindir (kaçışsız) ama maskelidir
  assert.ok(a.grounds[0]!.includes("<script>"));
});

test("unknown id is not_found; read-only and deterministic", () => {
  const { db, ledger, src } = setup();
  assert.throws(() => compileArgument(src, "00000000-0000-0000-0000-000000000000"), (e: unknown) => e instanceof ReasoningError && e.code === "not_found");
  const d = ledger.record(dec("Salt okunur") as never, USER);
  const snap = () => JSON.stringify([db.prepare("SELECT id, status FROM decisions").all(), db.prepare("SELECT id, status FROM decision_assumptions").all(), db.prepare("SELECT COUNT(*) AS n FROM memory_records").get()]);
  const before = snap();
  const a = compileArgument(src, d.id);
  assert.equal(snap(), before);
  assert.deepEqual(compileArgument(src, d.id), a);
  assert.equal(a.generatedAt, T0.toISOString());
});

test("maskedSecrets also reports secrets masked inside the plain JSON fields, not only in the final markdown scan", () => {
  const { db, src } = setup();
  const secret = "sk-abcdefghijklmnopqrstuvwxyz0123";
  const id = "00000000-0000-4000-8000-000000000042";
  db.prepare("INSERT INTO decisions (id, title, rationale, scope, made_by, decided_at, expires_at, supersedes_id, memory_record_id, created_at) VALUES (?, ?, ?, 'agentmom', 'user:yusuf', ?, ?, NULL, NULL, ?)").run(id, "Ham karar", `gerekçe ${secret}`, T0.toISOString(), at(100), T0.toISOString());
  const a = compileArgument(src, id);
  assert.equal(a.maskedSecrets, true);
  assert.doesNotMatch(JSON.stringify(a), /sk-abcdef/);
  const clean = setup();
  const d = new DecisionLedger(clean.db, { memory: clean.store, now: clean.src.now }).record(dec("Temiz karar") as never, USER);
  assert.equal(compileArgument(clean.src, d.id).maskedSecrets, false);
});
