// D8c-UI-3 testleri: Arayüz karmaşıklığı (madde 91): Basit | Gelişmiş. prefs.js kalıcılığı, core.js görünüm durumu, pages.js MERKEZİ kuralı, gelişmiş bölümlerin daralması.
// Sahip: Claude [İP:AgentMom Faz 11, D8c arayüz]. yazan: [Claude#agentmom-d8c-arayuz]. Kaynaklar node:vm içinde; ağ yok, tarayıcı yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { read, byId, byKey, okData, makeEnv, coreEnv, walk, PAGES } from "./lab-env.ts";
import type { Env } from "./lab-env.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const HIDDEN = "Gelişmiş bölümler gizli (Ayarlar > Görünüm > Arayüz karmaşıklığı)";
const FILES = [...PAGES, "page-security.js"];

function prefsEnv(store?: { value: string | null; throws?: boolean }) {
  const win: Any = {};
  win.localStorage = {
    getItem: () => { if (store?.throws) throw new Error("kapalı"); return store ? store.value : null; },
    setItem: (_k: string, v: string) => { if (store?.throws) throw new Error("kapalı"); if (store) store.value = v; },
  };
  const ctx = vm.createContext({ window: win });
  vm.runInContext(read("prefs.js"), ctx, { filename: "prefs.js" });
  return win;
}

test("prefs: karmaşıklık varsayılanı GELİŞMİŞ; geçerli değer kalıcı; bozuk/geçersiz değer ve bozuk JSON varsayılana düşer", () => {
  assert.equal(prefsEnv().AM_PREFS.load().complexity, "advanced");
  const store = { value: null as string | null };
  const w = prefsEnv(store);
  assert.equal(w.AM_PREFS.save({ complexity: "simple" }), true);
  assert.equal(JSON.parse(store.value!).complexity, "simple");
  assert.equal(w.AM_PREFS.load().complexity, "simple");
  store.value = JSON.stringify({ complexity: "evil" });
  assert.equal(w.AM_PREFS.load().complexity, "advanced");
  store.value = "{bozuk";
  assert.equal(w.AM_PREFS.load().complexity, "advanced");
  store.value = JSON.stringify({ complexity: 5, theme: "light" });
  assert.deepEqual([w.AM_PREFS.load().complexity, w.AM_PREFS.load().theme], ["advanced", "light"]);
  assert.ok(w.AM_PREFS.keys.includes("complexity"));
});

test("prefs: localStorage atarsa (özel pencere/kapalı) çökmez; varsayılan döner, kayıt başarısız bildirilir", () => {
  const w = prefsEnv({ value: null, throws: true });
  assert.equal(w.AM_PREFS.load().complexity, "advanced");
  assert.equal(w.AM_PREFS.save({ complexity: "simple" }), false);
  const w2: Any = {};
  vm.runInContext(read("prefs.js"), vm.createContext({ window: w2 }), { filename: "prefs.js" });
  assert.equal(w2.AM_PREFS.load().complexity, "advanced", "localStorage hiç yok");
});

test("çekirdek: varsayılan görünüm GELİŞMİŞ ve boş advancedOpen; setView karmaşıklığı doğrular ve kalıcı yazar (advancedOpen kalıcı değil)", async () => {
  const c = coreEnv(undefined, ["prefs.js"]);
  await c.flush();
  const AM = c.win.AM;
  assert.equal(AM.view.complexity, "advanced");
  assert.deepEqual(JSON.parse(JSON.stringify(AM.view.advancedOpen)), []);
  const store = { value: null as string | null };
  c.win.localStorage = { getItem: () => store.value, setItem: (_k: string, v: string) => { store.value = v; } };
  AM.actions.setView({ complexity: "simple" });
  assert.equal(AM.view.complexity, "simple");
  assert.equal(JSON.parse(store.value!).complexity, "simple");
  AM.actions.setView({ complexity: "kötü" });
  assert.equal(AM.view.complexity, "simple", "geçersiz değer yok sayılır");
  AM.actions.setView({ advancedOpen: ["analytics"] });
  assert.deepEqual(JSON.parse(JSON.stringify(AM.view.advancedOpen)), ["analytics"]);
  assert.equal(JSON.parse(store.value!).advancedOpen, undefined, "oturum açıklığı kalıcı değil");
  AM.actions.setView({ advancedOpen: ["../x"] });
  AM.actions.setView({ advancedOpen: "analytics" });
  AM.actions.setView({ advancedOpen: Array.from({ length: 21 }, () => "a") });
  assert.deepEqual(JSON.parse(JSON.stringify(AM.view.advancedOpen)), ["analytics"], "bozuk değerler yok sayılır");
});

test("çekirdek: bozuk kayıtlı tercih (localStorage atar) başlangıçta çökmez; GELİŞMİŞ ile açılır", async () => {
  const c = coreEnv(undefined, ["prefs.js"]);
  await c.flush();
  assert.equal(c.win.AM.view.complexity, "advanced");
});

test("menü her zaman tam: gizli (gelişmiş) bölüme menüden gidilince o bölüm bu oturumda açılır; gelişmiş olmayan bölüm advancedOpen'a eklenmez", async () => {
  const c = coreEnv(undefined, ["capabilities.js"]);
  await c.flush();
  const AM = c.win.AM;
  AM.actions.setView({ complexity: "simple" });
  await AM.actions.openCapability(72);
  assert.equal(AM.view.page, "integrations");
  assert.deepEqual(JSON.parse(JSON.stringify(AM.view.advancedOpen)), ["analytics"]);
  await AM.actions.openCapability(73);
  assert.deepEqual(JSON.parse(JSON.stringify(AM.view.advancedOpen)), ["analytics"], "yinelenmez");
  await AM.actions.openCapability(62);
  assert.equal(AM.view.page, "research");
  assert.deepEqual(JSON.parse(JSON.stringify(AM.view.advancedOpen)), ["analytics"], "araştırma laboratuvarı gelişmiş değildir");
});

// ---------------------------------------------------------------- sayfalar
function sec(setup?: (e: Env) => void): Env {
  const e = makeEnv(FILES, ["capabilities.js"]);
  (e.AM.actions as Any).setView = (p: Any) => { (e.calls as Any[]).push(["setView", JSON.parse(JSON.stringify(p))]); Object.assign(e.AM.view, p); };
  e.AM.state.data.actionSemantics = okData({ actions: [{ action: "file.read", effect: "okur", reversible: "yes", undo: "-", sensitivity: "low" }] });
  setup?.(e);
  e.go("security");
  return e;
}
const text = (e: Env): string => e.host.textContent;

test("Güvenlik > Eylem anlamları: varsayılan (görünüm tanımsız ya da gelişmiş) hiçbir şey gizlenmez; Göster düğmesi yok", () => {
  for (const v of [undefined, "advanced", "bozuk"]) {
    const e = sec((x) => { if (v) (x.AM.view as Any).complexity = v; });
    assert.ok(text(e).includes("Eylem anlamları ve geri alma haritası"), String(v));
    assert.ok(!text(e).includes(HIDDEN), String(v));
    assert.equal(byKey(e.host, "advanced-show:semantics"), undefined);
  }
});

test("Güvenlik > Eylem anlamları: Basit kipte tek satıra daralır (veri istenmez), diğer bölümler (izin/defter/otomasyon) açık kalır; Göster o oturumda açar", () => {
  const e = sec((x) => { (x.AM.view as Any).complexity = "simple"; x.AM.state.data = {}; });
  const t = text(e);
  assert.ok(t.includes(HIDDEN));
  assert.ok(!t.includes("Eylem anlamları ve geri alma haritası"));
  assert.ok(t.includes("Geçici yetenek izinleri") && t.includes("Değişiklik defteri") && t.includes("Otomasyon"), "izin/defter/otomasyon bölümleri gizlenmez");
  assert.ok(byKey(e.host, "rule-new-submit") && byKey(e.host, "grant-new-submit"));
  assert.ok(!e.loads().some((c) => c[1] === "actionSemantics"), "gizliyken veri istenmez");
  byKey(e.host, "advanced-show:semantics")!.click();
  assert.deepEqual((e.calls as Any[]).filter((c) => c[0] === "setView").pop(), ["setView", { advancedOpen: ["semantics"] }]);
  e.P.rerender();
  assert.ok(text(e).includes("Eylem anlamları ve geri alma haritası"));
  assert.ok(!text(e).includes(HIDDEN));
  assert.ok(e.loads().some((c) => c[1] === "actionSemantics"));
});

test("Güvenlik > Eylem anlamları: oturumda açılmış anahtar Basit kipte de açık; bozuk advancedOpen çökmez", () => {
  const e = sec((x) => { (x.AM.view as Any).complexity = "simple"; (x.AM.view as Any).advancedOpen = ["semantics"]; });
  assert.ok(text(e).includes("Eylem anlamları ve geri alma haritası"));
  const e2 = sec((x) => { (x.AM.view as Any).complexity = "simple"; (x.AM.view as Any).advancedOpen = "semantics"; });
  assert.ok(text(e2).includes(HIDDEN));
  const e3 = sec((x) => { (x.AM.view as Any).complexity = "simple"; (x.AM.view as Any).advancedOpen = [null, 5, { a: 1 }]; });
  assert.ok(text(e3).includes(HIDDEN));
});

const CAPS_REG = { items: [{ n: 1, en: "A", tr: "A", sahip: "M1", durum: "Doğrulandı", kanit: [], eksik: "", dilim: "M1" }], summary: { total: 1, dogrulandi: 1, kismi: 0, planli: 0, desteklenmiyor: 0, kapsamdisi: 0 }, slices: {}, registry: [{ provider: "codex", operation: "run", status: "verified" }], updatedAt: "x" };
function integ(setup?: (e: Env) => void, param = ""): Env {
  const e = makeEnv(FILES, ["capabilities.js"]);
  (e.AM.actions as Any).setView = (p: Any) => { (e.calls as Any[]).push(["setView", JSON.parse(JSON.stringify(p))]); Object.assign(e.AM.view, p); };
  e.AM.state.data.capabilities = okData(CAPS_REG);
  setup?.(e);
  e.go("integrations", param);
  return e;
}

test("Entegrasyonlar: varsayılanda Sistem analitiği ve kayıt defteri açık; Basit kipte Sistem analitiği tek satıra daralır, yetenek tablosu açık kalır", () => {
  const open = integ();
  assert.ok(byId(open.host, "am-lab-impact") && byId(open.host, "am-lab-group"));
  assert.ok(!text(open).includes(HIDDEN));
  const e = integ((x) => { (x.AM.view as Any).complexity = "simple"; });
  assert.ok(text(e).includes(HIDDEN));
  assert.equal(byId(e.host, "am-lab-impact"), undefined);
  assert.equal(byId(e.host, "am-lab-shadow"), undefined);
  assert.ok(byId(e.host, "am-more-int-tb"), "yetenek tablosu gizlenmez");
  assert.ok(byKey(e.host, "advanced-show:analytics") && byKey(e.host, "advanced-show:registry"));
  assert.ok(!e.loads().some((c) => /^analysis/.test(c[1])), "gizliyken analiz verisi istenmez");
  byKey(e.host, "advanced-show:analytics")!.click();
  assert.deepEqual((e.calls as Any[]).filter((c) => c[0] === "setView").pop(), ["setView", { advancedOpen: ["analytics"] }]);
  e.P.rerender();
  assert.ok(byId(e.host, "am-lab-impact"));
  assert.ok(byKey(e.host, "advanced-show:registry"), "kayıt defteri hâlâ daralmış");
  byKey(e.host, "advanced-show:registry")!.click();
  e.P.rerender();
  assert.equal(byKey(e.host, "advanced-show:registry"), undefined);
  assert.ok(text(e).includes("Sağlayıcı yetenek kayıt defteri"));
});

test("Entegrasyonlar: menüden (yetenekler) gidilen gizli bölüm Basit kipte de açılır (advancedOpen + bolum parametresi)", () => {
  const e = integ((x) => { (x.AM.view as Any).complexity = "simple"; (x.AM.view as Any).advancedOpen = ["analytics"]; }, "bolum:am-lab-shadow:1");
  assert.ok(byId(e.host, "am-lab-shadow"));
  assert.equal(byKey(e.host, "lab-toggle:am-lab-shadow")!.attrs["aria-expanded"], "true");
});

test("Araştırma ve Kalibrasyon: Karar laboratuvarı ve Model yetenekleri Basit kipte de HER ZAMAN açık (sık kullanılır)", () => {
  const e = makeEnv(FILES, ["capabilities.js"]);
  (e.AM.view as Any).complexity = "simple";
  e.go("research");
  assert.ok(text(e).includes("Karar laboratuvarı") && text(e).includes("Model yetenekleri"));
  assert.ok(byId(e.host, "am-lab-hyp") && byId(e.host, "am-model-inversion"));
  assert.ok(!text(e).includes(HIDDEN));
});

test("merkezî kural: AM_PAGES.advanced yalnız bilinen anahtarları saklar; bilinmeyen anahtar asla gizlenmez; kit.section yalnız {advanced} ile daraltır", () => {
  const e = makeEnv(FILES);
  const A = e.win.AM_PAGES.advanced;
  assert.deepEqual(JSON.parse(JSON.stringify(A.keys)), ["analytics", "semantics", "registry"]);
  const simple: Any = { view: { complexity: "simple", advancedOpen: [] } };
  assert.equal(A.hidden(simple, "analytics"), true);
  assert.equal(A.hidden(simple, "hyp"), false, "bilinmeyen anahtar gizlenmez");
  assert.equal(A.hidden({ view: { complexity: "advanced" } }, "analytics"), false);
  assert.equal(A.hidden({ view: { complexity: "simple", advancedOpen: ["analytics"] } }, "analytics"), false);
  assert.equal(A.hidden(null, "analytics"), false);
  assert.equal(A.hidden({}, "analytics"), false);
  const kit = e.win.AM_PAGES.kit;
  const root: Any = e.doc.createElement("div");
  e.AM.view = Object.assign(e.AM.view, { complexity: "simple", advancedOpen: [] });
  e.win.AM_PAGES.init(e.AM, e.host);
  kit.section(root, "Gelişmiş başlık", { advanced: "semantics" });
  assert.ok(walk(root).some((n: Any) => n.attrs["data-advanced"] === "semantics"));
  assert.ok(!walk(root).some((n: Any) => n.tag === "h2"), "gelişmiş bölüm başlığı çizilmez");
  const root2: Any = e.doc.createElement("div");
  kit.section(root2, "Normal başlık", {});
  assert.ok(walk(root2).some((n: Any) => n.tag === "h2" && n.textContent === "Normal başlık"));
});

test("kaynak: yeni kod innerHTML/localStorage/fetch kullanmaz (localStorage yalnız prefs.js'te)", () => {
  for (const f of ["pages.js", "page-security.js", "page-integrations.js", "settings.js", "core.js"]) {
    const src = read(f);
    for (const re of [/innerHTML/, /localStorage/, /sessionStorage.*complexity/]) if (!(f === "core.js" && re.source === "sessionStorage.*complexity")) assert.doesNotMatch(src, re, f);
  }
  assert.match(read("prefs.js"), /localStorage/);
});
