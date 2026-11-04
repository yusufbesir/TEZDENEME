// Sahip: Sonnet [İP:AgentMom Faz 11, dilim 2]. yazan: [Claude#agentmom-faz11-dilim2-shell].
// Amaç: shell.js (AM_SHELL), palette.js (AM_PALETTE), ring.js (AM_RING) ve shell.css için saf mantık + güvenlik denetimi.
// Modüller kaynaktan node:vm ile sahte pencerede yüklenir; yükleme sırasında DOM'a dokunulmadığı da burada doğrulanır
// (sahte pencerede document yok, dokunsaydı yükleme patlardı). Değiştirme: yalnız sahibi ya da ana oturum.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const UI = import.meta.dirname;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

// vm bağlamından gelen nesnelerin prototipi farklıdır; yapı karşılaştırması JSON üzerinden yapılır.
function deq(a: unknown, b: unknown, msg?: string): void {
  assert.equal(JSON.stringify(a), JSON.stringify(b), msg);
}

function src(name: string): string {
  return readFileSync(join(UI, name), "utf8");
}

function load(file: string, extra: Record<string, unknown> = {}): Any {
  const win: Record<string, unknown> = { ...extra };
  const sandbox = { window: win };
  vm.createContext(sandbox);
  vm.runInContext(src(file), sandbox, { filename: file });
  return win;
}

const shellWin = load("shell.js");
const palWin = load("palette.js");
const ringWin = load("ring.js");
const S: Any = shellWin.AM_SHELL.pure;
const P: Any = palWin.AM_PALETTE.pure;
const R: Any = ringWin.AM_RING.pure;

// ---------------------------------------------------------------- yükleme
test("modüller yüklenirken DOM'a dokunmaz ve sözleşme biçimini sunar", () => {
  for (const [win, name] of [[shellWin, "AM_SHELL"], [palWin, "AM_PALETTE"], [ringWin, "AM_RING"]] as const) {
    const m: Any = win[name];
    assert.equal(typeof m.init, "function", name + ".init");
    assert.equal(typeof m.render, "function", name + ".render");
    assert.equal(typeof m.pure, "object", name + ".pure");
  }
});

test("metinler AM_REGISTER_TR ile önekli anahtarlarla kaydedilir", () => {
  for (const [file, mod] of [["shell.js", "shell"], ["palette.js", "palette"], ["ring.js", "ring"]] as const) {
    const calls: Array<[string, Record<string, string>]> = [];
    load(file, { AM_REGISTER_TR: (n: string, t: Record<string, string>) => calls.push([n, t]) });
    assert.equal(calls.length, 1, file + " bir kez kaydeder");
    assert.equal(calls[0]![0], mod);
    const keys = Object.keys(calls[0]![1]);
    assert.ok(keys.length > 5);
    assert.ok(keys.every((k) => k.startsWith(mod + ".")), file + " anahtar öneki");
  }
});

test("kodda kullanılan her sabit metin anahtarı kayıtlı (⟦anahtar⟧ görünmez)", () => {
  for (const [file, win, name] of [["shell.js", shellWin, "AM_SHELL"], ["palette.js", palWin, "AM_PALETTE"], ["ring.js", ringWin, "AM_RING"]] as const) {
    const T: Any = win[name].pure.T;
    const text = src(file);
    const re = /\bT\("([a-z]+\.[A-Za-z0-9.]+)"\s*[,)]/g;
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = re.exec(text)) !== null) {
      n += 1;
      assert.ok(!String(T(m[1]!)).startsWith("\u27E6"), file + " eksik anahtar: " + m[1]);
    }
    assert.ok(n > 3, file + " anahtar kullanıyor");
  }
  assert.equal(S.T("shell.nope"), "\u27E6shell.nope\u27E7");
});

test("AM_T varsa onun sonucu kullanılır; ⟦..⟧ dönerse yerel metne düşülür", () => {
  const w = load("ring.js", { AM_T: (k: string) => (k === "ring.unknown" ? "X!" : "\u27E6" + k + "\u27E7") });
  assert.equal(w.AM_RING.pure.T("ring.unknown"), "X!");
  assert.equal(w.AM_RING.pure.T("ring.labelUnknown"), "Bağlam bilinmiyor");
});

// ---------------------------------------------------------------- shell: genişlik
test("clampWidth: sol 200-420, sağ 300-640, geçersiz değer varsayılana döner", () => {
  assert.equal(S.clampWidth("left", 100), 200);
  assert.equal(S.clampWidth("left", 999), 420);
  assert.equal(S.clampWidth("left", 300.4), 300);
  assert.equal(S.clampWidth("left", NaN), 280);
  assert.equal(S.clampWidth("right", 100), 300);
  assert.equal(S.clampWidth("right", 999), 640);
  assert.equal(S.clampWidth("right", undefined), 380);
  assert.equal(S.clampWidth("right", "500"), 500);
});

test("keyDelta: ←/→ 16px, Shift ile 64px, sağ kolda yön ters", () => {
  assert.equal(S.keyDelta("left", "ArrowRight", false), 16);
  assert.equal(S.keyDelta("left", "ArrowLeft", false), -16);
  assert.equal(S.keyDelta("left", "ArrowRight", true), 64);
  assert.equal(S.keyDelta("right", "ArrowLeft", false), 16);
  assert.equal(S.keyDelta("right", "ArrowRight", true), -64);
  assert.equal(S.keyDelta("left", "Enter", false), 0);
});

test("dragWidth: sürükleme yönü ve sınırlar", () => {
  assert.equal(S.dragWidth("left", 280, 100, 150), 330);
  assert.equal(S.dragWidth("right", 380, 500, 450), 430);
  assert.equal(S.dragWidth("left", 280, 100, 900), 420);
  assert.equal(S.dragWidth("right", 380, 500, 900), 300);
  assert.equal(S.dragWidth("left", 280, 100, NaN), 280);
});

test("layoutMode ve effectiveLeft", () => {
  assert.equal(S.layoutMode(1280), "wide");
  assert.equal(S.layoutMode(1279), "medium");
  assert.equal(S.layoutMode(900), "medium");
  assert.equal(S.layoutMode(899), "narrow");
  assert.equal(S.layoutMode(NaN), "wide");
  assert.equal(S.effectiveLeft("wide", true, 300), 56);
  assert.equal(S.effectiveLeft("medium", true, 300), 56);
  assert.equal(S.effectiveLeft("narrow", true, 300), 300);
  assert.equal(S.effectiveLeft("wide", false, 5000), 420);
});

test("drawerFor: geniş=yok, orta=yalnız sağ panel, dar=panel öncelikli iki çekmece", () => {
  assert.equal(S.drawerFor("wide", true, true), "");
  assert.equal(S.drawerFor("medium", true, false), "right");
  assert.equal(S.drawerFor("medium", false, true), "");
  assert.equal(S.drawerFor("narrow", false, true), "left");
  assert.equal(S.drawerFor("narrow", true, true), "right");
  assert.equal(S.drawerFor("narrow", false, false), "");
});

// ---------------------------------------------------------------- shell: tema, geçmiş
test("tema döngüsü koyu → açık → sistem → koyu", () => {
  assert.equal(S.nextTheme("dark"), "light");
  assert.equal(S.nextTheme("light"), "system");
  assert.equal(S.nextTheme("system"), "dark");
  assert.equal(S.nextTheme(undefined), "light");
  assert.equal(S.normalizeTheme("neon"), "dark");
});

test("geçmiş yığını: ekleme, geri, ileri, ileri dalı kesme, tekrarsız", () => {
  let h = S.histNew();
  deq(h, { stack: ["home"], idx: 0 });
  assert.equal(S.histCanBack(h), false);
  h = S.histPush(h, "topic:a1");
  h = S.histPush(h, "topic:a1");
  assert.equal(h.stack.length, 2);
  h = S.histPush(h, "project:usage");
  assert.equal(S.histCanBack(h), true);
  assert.equal(S.histCanForward(h), false);
  const back = S.histMove(h, -1);
  assert.equal(back.entry, "topic:a1");
  assert.equal(S.histCanForward(back.h), true);
  const fwd = S.histMove(back.h, 1);
  assert.equal(fwd.entry, "project:usage");
  assert.equal(S.histMove(fwd.h, 1), null);
  const cut = S.histPush(back.h, "topic:b2");
  deq(cut.stack, ["home", "topic:a1", "topic:b2"]);
  assert.equal(S.histMove(S.histNew(), -1), null);
});

test("geçmiş: geçersiz girdi temizlenir, uzunluk 50 ile sınırlı", () => {
  deq(S.histNormalize(null), S.histNew());
  deq(S.histNormalize({ stack: ["x y", 5, "home"], idx: 9 }), { stack: ["home"], idx: 0 });
  deq(S.histPush(S.histNew(), "<script>"), S.histNew());
  let h = S.histNew();
  for (let i = 0; i < 80; i += 1) h = S.histPush(h, "topic:t" + i);
  assert.equal(h.stack.length, 50);
  assert.equal(h.idx, 49);
  assert.equal(h.stack[49], "topic:t79");
});

test("parseEntry ve currentKey", () => {
  deq(S.parseEntry("home"), { type: "home", id: null });
  deq(S.parseEntry("topic:abc-1"), { type: "topic", id: "abc-1" });
  deq(S.parseEntry("project:usage"), { type: "project", id: "usage" });
  assert.equal(S.parseEntry("topic:"), null);
  assert.equal(S.parseEntry("topic:a b"), null);
  assert.equal(S.parseEntry(42), null);
  assert.equal(S.currentKey({}), "home");
  assert.equal(S.currentKey({ selectedTopicId: "t9" }), "topic:t9");
  assert.equal(S.currentKey({ selectedTopicId: "t9", projectSettingsOpen: true, projectSettingsPage: "usage" }), "project:usage");
  assert.equal(S.currentKey({ projectSettingsOpen: true }), "project:general");
  assert.equal(S.currentKey({ selectedTopicId: "bad id!" }), "home");
});

test("pendingCount: konulardan, yoksa görevlerden sayar; arşivlenmiş sayılmaz", () => {
  assert.equal(S.pendingCount({}), 0);
  assert.equal(S.pendingCount({ topics: [{ state: "awaiting_approval" }, { group: "waiting" }, { state: "running" }, { state: "awaiting_approval", archived: true }] }), 2);
  assert.equal(S.pendingCount({ topics: [], tasks: [{ state: "awaiting_approval" }, { state: "pending" }] }), 1);
});

// ---------------------------------------------------------------- shell: kısayollar
test("shortcutAction: kısayol → eylem eşlemesi", () => {
  const ev = (o: Record<string, unknown> | null) => S.shortcutAction(o);
  assert.equal(ev({ key: "k", ctrlKey: true }), "palette");
  assert.equal(ev({ key: "K", ctrlKey: true }), "palette");
  assert.equal(ev({ key: "k", metaKey: true }), "palette");
  assert.equal(ev({ key: ",", ctrlKey: true }), "settings");
  assert.equal(ev({ key: "b", ctrlKey: true }), "sidebar");
  assert.equal(ev({ key: ".", ctrlKey: true }), "panel");
  assert.equal(ev({ key: "O", ctrlKey: true, shiftKey: true }), "newSession");
  assert.equal(ev({ key: "T", ctrlKey: true, shiftKey: true }), "theme");
  assert.equal(ev({ key: "Escape" }), "escape");
  assert.equal(ev({ key: "Dead", code: "KeyK", ctrlKey: true }), "palette");
});

test("shortcutAction: tek tuşlu kısayol yok, AltGr ve eşleşmeyen birleşimler boş", () => {
  const ev = (o: Record<string, unknown> | null) => S.shortcutAction(o);
  assert.equal(ev({ key: "k" }), null);
  assert.equal(ev({ key: "b" }), null);
  assert.equal(ev({ key: ",", shiftKey: true }), null);
  assert.equal(ev({ key: "k", ctrlKey: true, altKey: true }), null);
  assert.equal(ev({ key: "k", ctrlKey: true, shiftKey: true }), null);
  assert.equal(ev({ key: "o", ctrlKey: true }), null);
  assert.equal(ev({ key: "t", ctrlKey: true }), null);
  assert.equal(ev({ key: "Escape", ctrlKey: true }), null);
  assert.equal(ev(null), null);
});

test("isTypingTarget ve escapeTarget önceliği (diyalog > menü > palet > ayarlar > çekmece)", () => {
  assert.equal(S.isTypingTarget("TEXTAREA", false), true);
  assert.equal(S.isTypingTarget("INPUT", false, "text"), true);
  assert.equal(S.isTypingTarget("INPUT", false, "checkbox"), false);
  assert.equal(S.isTypingTarget("DIV", true), true);
  assert.equal(S.isTypingTarget("BUTTON", false), false);
  assert.equal(S.escapeTarget({ dialog: true, menu: true, palette: true, settings: true, drawer: true }), "dialog");
  assert.equal(S.escapeTarget({ menu: true, palette: true, settings: true, drawer: true }), "menu");
  assert.equal(S.escapeTarget({ palette: true, settings: true, drawer: true }), "palette");
  assert.equal(S.escapeTarget({ settings: true, drawer: true }), "settings");
  assert.equal(S.escapeTarget({ drawer: true }), "drawer");
  assert.equal(S.escapeTarget({}), null);
  assert.equal(S.escapeTarget(null), null);
});

// ---------------------------------------------------------------- palette: eşleme
test("fold: Türkçe karakterleri katlar ve uzunluğu korur", () => {
  assert.equal(P.fold("İstanbul ŞEHİR Çağrı ığüöç"), "istanbul sehir cagri iguoc");
  assert.equal(P.fold("ISI ısı"), "isi isi");
  assert.equal(P.fold("Ünlü Öğe").length, "Ünlü Öğe".length);
  assert.equal(P.fold(null), "");
});

test("score: Türkçe katlama ve sıralama (tam > önek > sözcük başı > içerir > altdizi)", () => {
  assert.ok(P.score("sahin", "ŞAHİN") > 0);
  assert.ok(P.score("kullanim", "Kullanım") > 0);
  assert.ok(P.score("isi", "ISI") > 0);
  const exact = P.score("ayar", "ayar");
  const prefix = P.score("ayar", "ayarlar");
  const word = P.score("ayar", "proje ayarları");
  const sub = P.score("ayar", "mayara");
  const subseq = P.score("ayr", "proje ayarlar");
  assert.ok(exact > prefix && prefix > word && word > sub && sub > subseq && subseq > 0, [exact, prefix, word, sub, subseq].join(","));
  assert.equal(P.score("xyz", "ayarlar"), 0);
  assert.equal(P.score("", "her şey"), 1);
  assert.ok(P.score("tema deg", "Tema değiştir") > 0);
  assert.equal(P.score("tema zzz", "Tema değiştir"), 0);
});

test("matchText dizinleri ve segments", () => {
  deq(P.matchText("ayar", "Proje ayarları").idx, [6, 7, 8, 9]);
  const segs = P.segments("Proje ayarları", [6, 7, 8, 9]);
  deq(segs, [{ t: "Proje ", hit: false }, { t: "ayar", hit: true }, { t: "ları", hit: false }]);
  deq(P.segments("", []), []);
  deq(P.segments("ab", []), [{ t: "ab", hit: false }]);
});

// ---------------------------------------------------------------- palette: öğeler
const AMSTATE = {
  state: {
    topics: [{ id: "t1", title: "Güvenlik denetimi" }, { id: "t2", title: "  Yedekleme\u0000 planı " }, { id: "", title: "boş kimlik" }],
    subsessions: [{ id: "s1", name: "Devam 1", model: "claude-opus" }, { id: "t1", name: "Yinelenen" }, { id: "s2", name: "Eski", archived: true }]
  },
  view: { panelOpen: false }
};

test("buildItems: konular, alt oturumlar (tekrarsız, arşivsiz), bölümler, sayfalar ve komutlar", () => {
  const items: Any[] = P.buildItems(AMSTATE);
  const ids = items.map((i) => i.id);
  assert.ok(ids.includes("t:t1") && ids.includes("t:t2") && ids.includes("t:s1"));
  assert.ok(!ids.includes("t:s2"), "arşivli alt oturum yok");
  assert.equal(ids.filter((i) => i === "t:t1").length, 1);
  assert.ok(!items.some((i) => i.title === "boş kimlik"));
  assert.equal(items.find((i) => i.id === "t:t2").title, "Yedekleme planı");
  assert.equal(items.filter((i) => i.id.startsWith("s:")).length, P.SETTINGS_SECTIONS.length);
  assert.equal(items.filter((i) => i.id.startsWith("p:")).length, P.PROJECT_PAGES.length);
  assert.ok(ids.includes("c:/yardim") && ids.includes("c:theme") && ids.includes("c:new") && ids.includes("c:help"));
  assert.equal(items.find((i) => i.id === "c:panel").title, "Genel bakış panelini aç");
  const open: Any[] = P.buildItems({ state: {}, view: { panelOpen: true } });
  assert.equal(open.find((i) => i.id === "c:panel").title, "Genel bakış panelini kapat");
});

test("salt eylem listesi: silme/kalıcı değişiklik komutu yok, her öğe izinli eyleme bağlı", () => {
  const items: Any[] = P.buildItems(AMSTATE);
  for (const it of items) {
    assert.ok(P.planFor(it), "plan: " + it.id);
    const blob = (it.title + " " + JSON.stringify(it.exec)).toLowerCase();
    assert.ok(!/(sil\b|silme|delete|remove|temizle|kaldır|reset|force)/.test(blob), "yasak komut: " + it.id);
  }
  assert.equal(P.planFor({ exec: { action: "deleteEverything", args: [] } }), null);
  assert.equal(P.planFor(null), null);
  deq(P.planFor({ exec: { action: "selectTopic", args: ["t1"] } }), { action: "selectTopic", args: ["t1"] });
  deq(P.planFor({ exec: { shell: "cycleTheme" } }), { shell: "cycleTheme" });
  assert.equal(P.planFor({ exec: { shell: "evil" } }), null);
});

test("rankItems: boş sorguda grup sınırları, sorguda skor sırası", () => {
  const many = { state: { topics: Array.from({ length: 30 }, (_, i) => ({ id: "t" + i, title: "Konu " + i })) }, view: {} };
  const items: Any[] = P.buildItems(many);
  const empty: Any[] = P.rankItems(items, "");
  assert.equal(empty.filter((r) => r.item.group === "topic").length, 6);
  assert.equal(empty.filter((r) => r.item.group === "section").length, 5);
  assert.equal(empty.filter((r) => r.item.group === "command").length, 8);
  const tema: Any[] = P.rankItems(P.buildItems(AMSTATE), "tema");
  assert.equal(tema[0].item.id, "c:theme");
  const usage: Any[] = P.rankItems(P.buildItems(AMSTATE), "kullanim");
  assert.ok(usage.some((r) => r.item.id === "p:usage"));
  deq(P.rankItems(P.buildItems(AMSTATE), "qqqqzzzz"), []);
  const guv: Any[] = P.rankItems(P.buildItems(AMSTATE), "GÜVEN");
  assert.equal(guv[0].item.id, "t:t1");
});

test("groupResults/flatten: en iyi skorlu grup önce; düz liste grup sırasını izler", () => {
  const ranked: Any[] = P.rankItems(P.buildItems(AMSTATE), "yard");
  const groups: Any[] = P.groupResults(ranked);
  assert.ok(groups.length >= 1);
  const flat: Any[] = P.flatten(groups);
  assert.equal(flat.length, ranked.length);
  let i = 0;
  for (const g of groups) for (const e of g.entries) { assert.equal(flat[i], e); i += 1; }
  for (let k = 1; k < groups.length; k += 1) assert.ok(groups[k - 1].best >= groups[k].best);
  deq(P.groupResults([]), []);
});

test("moveIndex: sarmalı gezinme, Home/End, boş liste", () => {
  assert.equal(P.moveIndex(0, 3, "ArrowDown"), 1);
  assert.equal(P.moveIndex(2, 3, "ArrowDown"), 0);
  assert.equal(P.moveIndex(0, 3, "ArrowUp"), 2);
  assert.equal(P.moveIndex(1, 3, "Home"), 0);
  assert.equal(P.moveIndex(1, 3, "End"), 2);
  assert.equal(P.moveIndex(0, 0, "ArrowDown"), -1);
  assert.equal(P.moveIndex(5, 3, "ArrowDown"), 1);
});

test("palette: her bölüm/sayfa/komut için metin anahtarı var", () => {
  const T: Any = P.T;
  for (const s of P.SETTINGS_SECTIONS) assert.ok(!T("palette.sec." + s).startsWith("\u27E6"), s);
  for (const p of P.PROJECT_PAGES) assert.ok(!T("palette.proj." + p).startsWith("\u27E6"), p);
  for (const c of ["help", "status", "tasks", "approvals", "debt", "decisions", "skills", "providers", "refresh"]) {
    assert.ok(!T("palette.cmd." + c).startsWith("\u27E6"), c);
  }
});

// ---------------------------------------------------------------- ring
test("compute: ham token/limit → yüzde, seviye ve etiket", () => {
  const c = R.compute({ tokens: 57000, limit: 150000, pct: 99, source: "run" });
  assert.equal(c.known, true);
  assert.equal(c.pct, 38);
  assert.equal(c.level, "ok");
  assert.equal(R.label(c), "Bağlam %38 dolu");
  assert.equal(R.compute({ pct: 45.4 }).pct, 45);
  assert.equal(R.compute({ tokens: 200000, limit: 150000 }).pct, 100);
});

test("compute: veri yoksa BİLİNMİYOR (uydurma yok)", () => {
  for (const ctx of [undefined, null, {}, { tokens: null, pct: null, source: "unknown" }, { tokens: -5 }, { tokens: "12" }, { pct: NaN }]) {
    const c = R.compute(ctx);
    assert.equal(c.known, false);
    assert.equal(c.pct, null);
    assert.equal(c.level, "unknown");
    assert.equal(R.label(c), "Bağlam bilinmiyor");
    assert.equal(R.dash(c), "3 4");
  }
});

test("compute: renk eşikleri ve uyarı eşikleri", () => {
  const lv = (t: number) => R.compute({ tokens: t, limit: 150000 });
  assert.equal(lv(88500).level, "ok");     // %59
  assert.equal(lv(90000).level, "warn");   // %60
  assert.equal(lv(118500).level, "warn");  // %79
  assert.equal(lv(120000).level, "high");  // %80
  assert.equal(lv(119000).warn80, false);
  assert.equal(lv(120000).warn80, true);
  assert.equal(lv(120000).near, false);
  assert.equal(lv(135000).near, true);
  assert.equal(lv(150000).pct, 100);
  assert.equal(R.compute({ tokens: 1, limit: 0 }).limit, 150000);
});

test("dash: doluluk halka çevresine orantılı", () => {
  const half = R.dash({ known: true, pct: 50 }).split(" ");
  assert.ok(Math.abs(Number(half[0]) * 2 - Number(half[1])) < 0.02);
  assert.equal(R.dash({ known: true, pct: 0 }).split(" ")[0], "0");
});

test("biçimleyiciler: tr-TR binlik ayraç, yüzde ve zaman", () => {
  assert.equal(R.fmtInt(12345), "12.345");
  assert.equal(R.fmtInt(150000), "150.000");
  assert.equal(R.fmtInt(null), "Bilinmiyor");
  assert.equal(R.fmtPct(12.34), "%12,3");
  assert.equal(R.fmtPct(5), "%5");
  assert.equal(R.fmtPct(undefined), "Bilinmiyor");
  assert.match(R.fmtTime("2026-10-22T10:05:00Z"), /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
  assert.equal(R.fmtTime("bozuk"), "");
});

test("projectShare ve topicUsageTokens: yalnız gerçek veri", () => {
  const usage = { topicsTable: [{ id: "a", tokens: 300, sharePct: 30 }, { id: "b", tokens: 700 }] };
  assert.equal(R.projectShare(usage, "a"), 30);
  assert.equal(R.projectShare(usage, "b"), 70);
  assert.equal(R.projectShare(usage, "zzz"), null);
  assert.equal(R.projectShare(null, "a"), null);
  assert.equal(R.projectShare({ topicsTable: [{ id: "a", tokens: 5 }, { id: "b", tokens: null }] }, "a"), null);
  assert.equal(R.topicUsageTokens(usage, "b"), 700);
  assert.equal(R.topicUsageTokens(usage, "q"), null);
});

test("verifiedLimits: yalnız kaynağı 'provider' ve zaman damgalı kayıtlar", () => {
  const at = "2026-10-22T09:00:00Z";
  const out: Any[] = R.verifiedLimits([
    { provider: "claude-code", used: 10, limit: 100, source: "provider", at },
    { provider: "tahmin", used: 10, limit: 100, source: "estimate", at },
    { provider: "zamansız", used: 1, limit: 2, source: "provider" },
    { provider: "bozukzaman", used: 1, limit: 2, source: "provider", at: "dün" },
    { provider: "", used: 1, source: "provider", at },
    { provider: "boş", source: "provider", at },
    { provider: "yüzde", pct: 140, source: "provider", at },
    { provider: "  Ko\u0000dex  ", pct: 40, resetsAt: "2026-10-22T12:00:00Z", source: "provider", at },
    null,
    "x"
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].provider, "claude-code");
  assert.equal(out[1].provider, "Ko dex");
  assert.equal(out[1].pct, 40);
  deq(R.verifiedLimits(undefined), []);
  deq(R.verifiedLimits("x"), []);
});

test("placement: açılır pencere görünür alanda kalır ve girişin üstüne açılır", () => {
  const p = R.placement({ left: 700, right: 740, top: 600 }, 1000, 800, 360);
  assert.equal(p.width, 360);
  assert.equal(p.left, 380);
  assert.equal(p.bottom, 208);
  const edge = R.placement({ left: 0, right: 30, top: 600 }, 1000, 800, 360);
  assert.equal(edge.left, 8);
  const narrow = R.placement({ left: 0, right: 30, top: 100 }, 320, 800, 360);
  assert.ok(narrow.width <= 304 && narrow.left >= 8);
  assert.ok(narrow.maxH >= 160);
});

test("selectedTopic: konu ya da alt oturumdan ad ve sağlayıcı", () => {
  const am = { view: { selectedTopicId: "s1" }, state: { topics: [{ id: "t1", title: "A", provider: "claude-code" }], subsessions: [{ id: "s1", name: "Devam 1", provider: "codex" }] } };
  deq(R.selectedTopic(am), { id: "s1", title: "Devam 1", provider: "codex" });
  assert.equal(R.selectedTopic({ view: { selectedTopicId: "t1" }, state: am.state }).provider, "claude-code");
  assert.equal(R.selectedTopic({ view: {}, state: {} }), null);
  assert.equal(R.selectedTopic({ view: { selectedTopicId: "yok" }, state: {} }).title, "");
});

// ---------------------------------------------------------------- güvenlik denetimi
const BANNED: Array<[string, RegExp]> = [
  ["innerHTML", /innerHTML/],
  ["outerHTML", /outerHTML/],
  ["insertAdjacentHTML", /insertAdjacentHTML/],
  ["document.write", /document\.write/],
  ["eval", /\beval\s*\(/],
  ["new Function", /new\s+Function\b/],
  ["dize setTimeout", /setTimeout\s*\(\s*["'`]/],
  ["srcdoc", /srcdoc/],
  ["postMessage", /postMessage/],
  ["document.cookie", /document\.cookie/],
  ["localStorage", /localStorage|sessionStorage/],
  ["fetch/XHR", /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/],
  ["satır içi olay özniteliği", /setAttribute\(\s*["']on[a-z]+["']/i],
  ["setAttribute style", /setAttribute\(\s*["']style["']/],
  ["dış adres", /https?:\/\/(?!www\.w3\.org\/2000\/svg)/],
  ["javascript:", /javascript:/i]
];

test("JS dosyaları: yasak API yok, ağ yok, dış kaynak yok", () => {
  for (const f of ["shell.js", "palette.js", "ring.js"]) {
    const text = src(f);
    for (const [name, re] of BANNED) assert.ok(!re.test(text), f + " yasak: " + name);
    assert.ok(text.includes('"use strict"'), f + " strict");
  }
});

test("satır içi stil yok: .style yalnız CSS değişkeni ataması (setProperty) için", () => {
  for (const f of ["shell.js", "palette.js", "ring.js"]) {
    const text = src(f);
    const all = text.match(/\.style\b/g) ?? [];
    const sp = text.match(/\.style\.setProperty\(/g) ?? [];
    assert.equal(all.length, sp.length, f + " .style kullanımı yalnız setProperty");
    const calls = text.match(/\.style\.setProperty\(\s*([^,]+),/g) ?? [];
    for (const c of calls) assert.ok(/\(\s*(["']--am-[a-z-]+["']|name)\s*,/.test(c), f + " değişken adı: " + c);
  }
});

test("sunucu verisi textContent ile yazılır: dinamik metin için createTextNode/textContent dışı yol yok", () => {
  for (const f of ["shell.js", "palette.js", "ring.js"]) {
    const text = src(f);
    assert.ok(text.includes("textContent"), f);
    assert.ok(!/\.(innerText)\s*=/.test(text), f + " innerText");
    assert.ok(!/\.(html|HTML)\s*=/.test(text), f + " html ataması");
  }
});

test("her modülde render try/catch ile korunur ve hata kartı role=alert taşır", () => {
  for (const f of ["shell.js", "palette.js", "ring.js"]) {
    const text = src(f);
    assert.ok(/function render\(AM\)\s*\{[\s\S]*?try\s*\{/.test(text), f + " render try/catch");
    assert.ok(/"role",\s*"alert"/.test(text), f + " role=alert");
  }
});

test("shell.css: yalnız var(--am-*) renkleri, dış kaynak yok, reduced-motion var", () => {
  const css = src("shell.css");
  assert.ok(!/url\s*\(/i.test(css), "url()");
  assert.ok(!/@import/i.test(css), "@import");
  assert.ok(!/https?:\/\//i.test(css), "dış adres");
  assert.ok(!/:\s*#[0-9a-fA-F]{3,8}\b/.test(css), "onaltılık renk");
  assert.ok(!/\b(rgb|rgba|hsl|hsla)\s*\(/i.test(css), "işlevsel renk");
  assert.ok(/prefers-reduced-motion:\s*reduce/.test(css));
  assert.ok(/:focus-visible/.test(css));
  assert.ok(/var\(--am-focus\)/.test(css));
  assert.ok(!/\bstyle\s*=/.test(css));
});

test("shell.css: kullanılan --am-* değişkenleri tokens.css'te ya da shell.js/ring.js tarafından tanımlı", () => {
  const css = src("shell.css");
  const tokens = src("tokens.css");
  const runtime = src("shell.js") + src("ring.js");
  const used = new Set(Array.from(css.matchAll(/var\((--am-[a-z0-9-]+)/g), (m) => m[1]!));
  assert.ok(used.size > 10);
  for (const name of used) {
    assert.ok(tokens.includes(name + ":") || runtime.includes('"' + name + '"'), "tanımsız değişken: " + name);
  }
});

test("JS ve CSS içinde kullanılan sınıf adları birbiriyle tutarlı (am-shell-*, am-pal-*, am-ring-*)", () => {
  const css = src("shell.css");
  for (const f of ["shell.js", "palette.js", "ring.js"]) {
    const text = src(f);
    const classes = new Set<string>();
    for (const m of text.matchAll(/["']((?:am-(?:shell|pal|ring|resizer)[A-Za-z0-9_-]*)(?:\s+am-[A-Za-z0-9_-]+)*)["']/g)) {
      for (const c of m[1]!.split(/\s+/)) if (/^am-(shell|pal|ring|resizer)/.test(c)) classes.add(c);
    }
    assert.ok(classes.size > 0, f);
    for (const c of classes) {
      if (c.endsWith("-")) continue; // "am-resizer--" + side gibi birleşik adlar
      assert.ok(css.includes("." + c), f + " sınıfı CSS'te yok: " + c);
    }
  }
});
