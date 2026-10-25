import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { coreEnv, makeEnv } from "./lab-env.ts";

const DIR = join(import.meta.dirname);
// Dil dosyaları + settings.js (settings.gorunum.* anahtarları orada): gerçek yükleme sırası.
const env = () => makeEnv(["strings-en.js", "settings.js", "sidebar.js", "chat.js"]);

test("dil: varsayılan Türkçe; en seçilince çevrilen metin İngilizce, çevrilmeyen Türkçe'ye düşer (⟦⟧ ya da boş yok); tr'ye dönüş", () => {
  const w = env().win;
  assert.equal(w.AM_LANG(), "tr");
  assert.equal(w.AM_T("login.submit"), "Giriş yap");
  assert.equal(w.AM_SET_LANG("en"), "en");
  assert.equal(w.AM_T("login.submit"), "Sign in");
  assert.equal(w.AM_T("sidebar.count", { n: 3 }), "3 sessions");
  assert.equal(w.AM_T("cmd.statusLine", { tasks: 3, waiting: 1, broken: 0, review: 2 }), "3 tasks, 1 waiting, 0 broken, 2 to review.");
  const rep = w.AM_LANG_REPORT("en");
  const untranslated = rep.missing[0];
  assert.ok(untranslated, "çeviri kısmi: bazı anahtarlar eksik olmalı (iddia abartılmaz)");
  const tr = w.AM_SET_LANG("tr") && w.AM_T(untranslated);
  assert.equal(w.AM_SET_LANG("en"), "en");
  assert.equal(w.AM_T(untranslated), tr, "eksik anahtar Türkçe metne düşer");
  assert.ok(!w.AM_T(untranslated).startsWith("⟦"));
  assert.equal(w.AM_T("yok.boyle.anahtar"), "⟦yok.boyle.anahtar⟧", "bilinmeyen anahtar görünür kalır");
  assert.equal(w.AM_SET_LANG("fr"), "tr", "desteklenmeyen dil Türkçe'ye düşer");
  assert.equal(w.AM_SET_LANG(undefined), "tr");
  assert.deepEqual(Array.from(w.AM_LANGS()), ["tr", "en"]);
});

test("dil: İngilizce sözlüğün her anahtarı Türkçede var, yer tutucuları aynı; kapsam sayısı raporlanır", () => {
  const w = env().win;
  const rep = w.AM_LANG_REPORT("en");
  assert.deepEqual(Array.from(rep.unknown), [], "Türkçede karşılığı olmayan İngilizce anahtar");
  assert.deepEqual(Array.from(rep.slotMismatch), [], "{yer tutucu} kümesi Türkçeden farklı");
  assert.ok(rep.translated > 100 && rep.translated < rep.total, `kısmi kapsam: ${rep.translated}/${rep.total}`);
});

test("dil: kayıt kuralları: desteklenmeyen kod ve anahtar çakışması hata verir; tr kaydedilemez", () => {
  const w = env().win;
  assert.throws(() => w.AM_REGISTER_LANG("fr", { "app.name": "x" }), /desteklenmeyen/);
  assert.throws(() => w.AM_REGISTER_LANG("tr", { "app.name": "x" }), /desteklenmeyen/);
  assert.throws(() => w.AM_REGISTER_LANG("en", { "app.name": "again" }), /çakışması/);
});

test("dil: rapor olumsuz örnekleri yakalar (yer tutucu uyuşmazlığı, Türkçede olmayan anahtar)", () => {
  const w = env().win;
  const missing = "core.createErr.path"; // Türkçede {alan} ve {max} taşır, İngilizcede henüz yok
  assert.ok(Array.from(w.AM_LANG_REPORT("en").missing).includes(missing), "anahtar çevrilmemiş olmalı");
  w.AM_REGISTER_LANG("en", { [missing]: "no slots here", "zzz.yok": "x" });
  const rep = w.AM_LANG_REPORT("en");
  assert.ok(Array.from(rep.slotMismatch).includes(missing), "yer tutucusu eksik çeviri yakalanır");
  assert.ok(Array.from(rep.unknown).includes("zzz.yok"), "Türkçede olmayan anahtar yakalanır");
});

test("dil: İngilizce sözlükteki her anahtar koddan ya da iskeletten gerçekten kullanılır (ölü çeviri yok)", () => {
  const src = readFileSync(join(DIR, "strings-en.js"), "utf8");
  const keys = Array.from(src.matchAll(/"([a-z][A-Za-z0-9_.-]+)":/g), (m) => m[1]);
  const files = ["core.js", "chat.js", "sidebar.js", "settings.js", "shell.js", "panel.js", "palette.js", "ring.js", "safe.js", "pages.js", "capabilities.js", "usage.js", "index.html"].map((f) => readFileSync(join(DIR, f), "utf8")).join("\n");
  // Dinamik üretilen anahtarlar (sabit eşlemeden) önek olarak aranır.
  const dead = keys.filter((k) => !files.includes('"' + k + '"') && !files.includes("'" + k + "'") && !files.includes(k.replace(/[^.]*$/, "") + '" +') && !files.includes('"' + k.replace(/[^.]*$/, "") + '"'));
  assert.deepEqual(dead, [], "kullanılmayan çeviriler: " + dead.join(", "));
});

test("dil: çekirdek setView lang geçerli değeri uygular, kaydeder; geçersizi reddeder; açılışta tercih okunur; dil yüklenemezse tr'ye düşer", () => {
  const e = coreEnv(undefined, ["strings-en.js", "prefs.js"]);
  const saved: Record<string, string> = {};
  e.win.localStorage = { getItem: (k: string) => saved[k] ?? null, setItem: (k: string, v: string) => { saved[k] = v; } };
  const AM = e.win.AM;
  assert.equal(AM.view.lang, "tr");
  AM.actions.setView({ lang: "en" });
  assert.equal(AM.view.lang, "en");
  assert.equal(e.win.AM_LANG(), "en");
  assert.equal(e.win.AM_T("login.title"), "Sign in");
  assert.equal(JSON.parse(saved["agentmom.prefs.v1"]).lang, "en", "tercih kalıcı");
  AM.actions.setView({ lang: "fr" });
  assert.equal(AM.view.lang, "en", "geçersiz dil reddedilir");
  AM.actions.setView({ lang: "tr" });
  assert.equal(e.win.AM_T("login.title"), "Giriş");
  assert.equal(JSON.parse(saved["agentmom.prefs.v1"]).lang, "tr");
  // Açılış: kayıtlı tercih "en" ise başlangıç dili en olur.
  const e2 = coreEnv(undefined, ["strings-en.js", "prefs.js"]);
  assert.equal(e2.win.AM.view.lang, "tr", "tercih yoksa tr");
  const sanitize = e2.win.AM_PREFS.pure.sanitize;
  assert.equal(sanitize({ lang: "en" }).lang, "en");
  assert.equal(sanitize({ lang: "xx" }).lang, "tr");
  assert.equal(sanitize({ lang: 5 }).lang, "tr");
  // strings-en.js yüklenmediyse en seçimi sessizce tr'ye döner (çökmez, ⟦⟧ görünmez).
  const e3 = coreEnv(undefined, ["prefs.js"]);
  e3.win.AM.actions.setView({ lang: "en" });
  assert.equal(e3.win.AM.view.lang, "tr");
  assert.equal(e3.win.AM_T("login.title"), "Giriş");
});

test("dil: Ayarlar › Görünüm dil değişince yeniden çizilir (önbellek imzası lang içerir) ve onChange setView lang çağırır", () => {
  const e = makeEnv(["strings-en.js", "settings.js"]);
  const sig = e.win.AM_SETTINGS?.pure?.sectionSig ?? e.win.AM_SETTINGS_PURE?.sectionSig;
  const sigFn = sig ?? (e.win.AM_SETTINGS && e.win.AM_SETTINGS.sectionSig);
  assert.ok(typeof sigFn === "function", "sectionSig dışa açık");
  assert.notEqual(sigFn("gorunum", {}, { lang: "tr" }), sigFn("gorunum", {}, { lang: "en" }));
  const src = readFileSync(join(DIR, "settings.js"), "utf8");
  assert.match(src, /setView\(AM, \{ lang: v === "en" \? "en" : "tr" \}\)/);
});
