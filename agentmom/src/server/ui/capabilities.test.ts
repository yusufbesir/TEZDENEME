// D9 testleri: Yetenekler menüsü (capabilities.js kataloğu, komut paleti "Yetenekler" grubu, "/yetenekler" komutu, AM.actions.openCapability).
// Sahip: Claude [İP:AgentMom Faz 11, D9]. yazan: [Claude#agentmom-d9-yetenekler]. Kaynaklar node:vm içinde; ağ yok, tarayıcı yok, model çağrısı yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FNode, read, byId, byClass, byKey, byTag, hasClass, typeInto, okData, makeEnv, J, coreEnv, walk, PAGES } from "./lab-env.ts";
import type { Env } from "./lab-env.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const UUID = (n: number): string => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");

function catalogEnv(): Env { return makeEnv(PAGES, ["capabilities.js"]); }
function catalog(e: Env): Any[] { return J(e.win.AM_CAPABILITIES); }

const HESAP_IDS = [21, 24, 25, 27, 29, 33, 44, 49, 50, 56, 57, 58, 61, 62, 63, 64, 66, 70, 71, 72, 73, 74, 80, 83, 86, 87, 89, 90, 93, 97, 99];
// D8c: model yetenekleri (uygulamadaki modeli çağırır) katalogda tur:"model" olarak vardır; madde 75 (müzakere) da model türüdür; katalogda olmayan kimlik örneği: 76.
const MODEL_CAT: Record<number, string> = { 81: "solution-space", 82: "idea-transfer", 84: "inversion", 85: "emergence", 65: "multi-horizon", 92: "intent", 75: "negotiation", 37: "research-center", 38: "feature-discovery", 40: "competitor-research" };
const EXPECTED_IDS = [...HESAP_IDS, ...Object.keys(MODEL_CAT).map(Number)].sort((a, b) => a - b);
const MODEL_IDS = [76];
const PAGE_IDS = ["overview", "projects", "tasks", "providers", "models", "integrations", "skills", "research", "memory", "verify", "usage", "security", "audit"];

test("katalog: dizi, kayıt biçimi, benzersiz kimlik, kullanıcı-çağrılı hesap ve model türü; yer tutucu yok", () => {
  const e = catalogEnv();
  assert.ok(Array.isArray(e.win.AM_CAPABILITIES));
  const cat = catalog(e);
  assert.deepEqual(cat.map((c) => c.id).sort((a, b) => a - b), EXPECTED_IDS);
  assert.equal(new Set(cat.map((c) => c.id)).size, cat.length);
  for (const c of cat) {
    assert.ok(Number.isInteger(c.id) && c.id >= 1 && c.id <= 100, "id " + c.id);
    assert.ok(typeof c.ad === "string" && c.ad.length > 2 && c.ad.length <= 60, "ad " + c.id);
    assert.ok(typeof c.aciklama === "string" && c.aciklama.length > 20 && c.aciklama.length <= 400, "açıklama " + c.id);
    assert.deepEqual(c.nasil, ["kullanıcı isteği"], "nasıl " + c.id);
    assert.equal(c.tur, MODEL_CAT[c.id] ? "model" : "hesap", "tür " + c.id);
    if (c.tur === "model") { assert.equal(c.modelId, MODEL_CAT[c.id]); assert.equal(c.sayfa, "research"); assert.equal(c.bolum, "am-model-" + c.modelId); } else assert.equal(c.modelId, undefined);
    assert.ok(PAGE_IDS.includes(c.sayfa), "sayfa " + c.id);
    assert.equal(c.kategori, c.sayfa);
    assert.match(c.bolum, /^[A-Za-z0-9._-]{1,60}$/);
    assert.doesNotMatch(c.ad + c.aciklama, /yakında|planlı|yer tutucu|TODO/i, "yer tutucu yok " + c.id);
  }
  for (const id of MODEL_IDS) assert.ok(!cat.some((c) => c.id === id), "model türü yetenek katalogda olmamalı: " + id);
  assert.equal(cat.filter((c) => c.tur === "model").length, 10);
  assert.ok(Object.isFrozen(e.win.AM_CAPABILITIES));
});

test("katalog: doğrulama laboratuvarları bu menüde 'Beyin Verify sayfasından' notuyla ilgili sayfaya götürür (yeni form yok)", () => {
  const cat = catalog(catalogEnv());
  for (const id of [24, 27, 49, 50, 56, 57, 58]) {
    const c = cat.find((x) => x.id === id)!;
    assert.equal(c.sayfa, "verify");
    assert.match(c.aciklama, /Beyin Verify sayfasından/);
  }
  assert.match(cat.find((x) => x.id === 21)!.aciklama, /Salt bilgi/);
});

test("katalog: her kaydın sayfa ve bölüm kimliği GERÇEKTEN var (sayfa çizilince başlık öğesi bulunur)", () => {
  const e = catalogEnv();
  e.AM.state.data.verification = okData({ runs: [] });
  e.AM.state.data.capabilities = okData({ items: [{ n: 1, en: "A", tr: "A", sahip: "M1", durum: "Doğrulandı", kanit: [], eksik: "", dilim: "M1" }], summary: { total: 1, dogrulandi: 1 }, slices: {}, registry: [], updatedAt: "x" });
  const seen = new Set<string>();
  for (const c of catalog(e)) {
    e.go(c.sayfa);
    assert.ok(byId(e.host, c.bolum), `${c.id} ${c.ad}: ${c.sayfa} sayfasında '${c.bolum}' kimliği yok`);
    seen.add(c.sayfa);
  }
  assert.deepEqual([...seen].sort(), ["integrations", "memory", "research", "tasks", "verify"]);
});

test("katalog: bölüm parametresiyle gidilen her kayıt sayfayı hata kartı olmadan çizer ve başlığa odaklanır", () => {
  const e = catalogEnv();
  e.AM.state.data.verification = okData({ runs: [] });
  e.AM.state.data.capabilities = okData({ items: [{ n: 1, en: "A", tr: "A", sahip: "M1", durum: "Doğrulandı", kanit: [], eksik: "", dilim: "M1" }], summary: { total: 1, dogrulandi: 1 }, slices: {}, registry: [], updatedAt: "x" });
  let n = 0;
  for (const c of catalog(e)) {
    n += 1;
    e.doc.activeElement = null;
    e.go(c.sayfa, `bolum:${c.bolum}:${n}`);
    assert.equal(e.host.textContent.includes("⟦"), false, c.id + " eksik metin");
    assert.equal(e.host.children[0]!.textContent.includes("Bu sayfa yüklenemedi"), false, c.id + " sayfa yüklenemedi");
    assert.equal(e.doc.activeElement, byId(e.host, c.bolum), `${c.id}: odak '${c.bolum}' başlığında olmalı`);
  }
});

test("kullanılabilirlik: yalnız BİLİNEN hata gri yapar (neden maskeli); başarılı veri varsa ya da hiç denenmediyse kullanılabilir", () => {
  const api = catalogEnv().win.AM_CAPABILITIES_API;
  const cap = (veri?: string) => ({ id: 1, veri });
  const AM = (data: Record<string, unknown>) => ({ state: { data } });
  assert.deepEqual(J(api.availability(AM({}), cap("halflife"))), { ok: true, reason: "" }, "hiç denenmedi");
  assert.deepEqual(J(api.availability(AM({}), cap())), { ok: true, reason: "" }, "veri anahtarı yok");
  assert.deepEqual(J(api.availability(AM({ halflife: { status: "loading" } }), cap("halflife"))), { ok: true, reason: "" });
  const bad = J(api.availability(AM({ halflife: { status: "error", reason: "503: kullanılamıyor sk-abcdefghijklmnopqrstuvwx \u202E" } }), cap("halflife")));
  assert.equal(bad.ok, false);
  assert.match(bad.reason, /503: kullanılamıyor/);
  assert.ok(!bad.reason.includes("sk-abcdefghijklmnopqrstuvwx") && !/[\u202A-\u202E]/.test(bad.reason));
  assert.equal(J(api.availability(AM({ halflife: { status: "error", reason: "" } }), cap("halflife"))).reason, "uç yanıt vermedi", "neden yoksa dürüst varsayılan");
  assert.equal(api.availability(AM({ "analysisExit:codex": { status: "error", reason: "404" }, "analysisExit:claude": { status: "ok", value: {} } }), cap("analysisExit")).ok, true, "parametreli anahtarlardan biri başarılıysa kullanılabilir");
  assert.equal(api.availability(AM({ "analysisExit:codex": { status: "error", reason: "404" } }), cap("analysisExit")).ok, false);
  assert.equal(api.availability(null, cap("halflife")).ok, true, "bozuk durum çökmez");
  assert.equal(api.availability(AM({ halflife: null }), cap("halflife")).ok, true);
  assert.equal(api.availability(AM({}), null).ok, true);
  assert.equal(api.sectionOf("bolum:am-lab-hyp"), "am-lab-hyp");
  assert.equal(api.sectionOf("bolum:am-lab-hyp:12"), "am-lab-hyp");
  for (const b of ["", "x", "bolum:", "bolum:a b", "bolum:../x", "bolum:a:b:c", 5, null]) assert.equal(api.sectionOf(b), "", String(b));
  assert.deepEqual(J(api.target({ sayfa: "research", bolum: "am-lab-hyp" })), { page: "research", param: "bolum:am-lab-hyp" });
  assert.deepEqual(J(api.target({ sayfa: "research", bolum: "am-lab-hyp" }, 3)), { page: "research", param: "bolum:am-lab-hyp:3" });
  assert.equal(api.byId(62).ad, "Rakip hipotezler");
  assert.equal(api.byId(76), null);
});

// ---------------------------------------------------------------- komut paleti
function palEnv(AMExtra?: (AM: Any) => void) {
  const e = makeEnv(PAGES, ["capabilities.js", "palette.js"]);
  e.doc.ids["overlayRoot"] = new FNode("div", e.doc);
  AMExtra?.(e.AM);
  return e;
}
const P = (e: Env): Any => e.win.AM_PALETTE.pure;

test("palet: katalog 'Yetenekler' grubunda, ad yazınca aranır; boş sorguda grup görünmez", () => {
  const e = palEnv();
  const items: Any[] = P(e).buildItems(e.AM);
  const caps = items.filter((i) => i.group === "capability");
  assert.equal(caps.length, EXPECTED_IDS.length);
  assert.deepEqual(J(caps.map((i) => i.id).sort()), EXPECTED_IDS.map((n) => "k:" + n).sort());
  const empty: Any[] = P(e).rankItems(items, "");
  assert.equal(empty.filter((r) => r.item.group === "capability").length, 0, "boş sorguda yetenek listesi paleti doldurmaz");
  assert.ok(empty.some((r) => r.item.id === "c:/yetenekler"), "komut listesinde /yetenekler var");
  for (const [q, id] of [["hipotez", "k:62"], ["bilgi değeri", "k:63"], ["yari omru", "k:66"], ["etki haritası", "k:70"], ["gölge", "k:72"], ["süreklilik", "k:73"], ["çevrimdışı", "k:74"], ["cikis plani", "k:80"], ["eksiklik", "k:83"], ["uzmanlık", "k:86"], ["dikkat", "k:93"], ["öğrenme", "k:97"], ["aracısı", "k:99"], ["argüman", "k:61"], ["çelişki", "k:64"], ["soy ağacı", "k:89"], ["mutasyon", "k:58"]] as const) {
    const r: Any[] = P(e).rankItems(items, q);
    assert.ok(r.some((x) => x.item.id === id), `'${q}' -> ${id}`);
  }
  const groups: Any[] = P(e).groupResults(P(e).rankItems(items, "hipotez"));
  assert.ok(groups.some((g) => g.group === "capability"), "gruplanır");
  assert.equal(e.win.AM_PALETTE.pure.T("palette.group.capability"), "Yetenekler");
});

test("palet: kategoriye göre gruplu ipucu (sayfa adı); açıklama sözcüğüyle de bulunur", () => {
  const e = palEnv();
  const items: Any[] = P(e).buildItems(e.AM);
  const hyp = items.find((i) => i.id === "k:62");
  assert.equal(hyp.hint, "Araştırma ve Kalibrasyon");
  assert.equal(hyp.icon, "spark");
  assert.equal(items.find((i) => i.id === "k:93").hint, "Görevler ve İş Akışları");
  assert.equal(items.find((i) => i.id === "k:58").hint, "Beyin Verify");
  assert.ok(P(e).rankItems(items, "rakip hipotezlerin").some((r: Any) => r.item.id === "k:62"), "açıklamadan");
});

test("palet: seçilebilir her yetenek planFor ile AM.actions.openCapability'ye bağlanır; bilinmeyen eylem reddedilir", () => {
  const e = palEnv();
  const items: Any[] = P(e).buildItems(e.AM);
  for (const i of items.filter((x) => x.group === "capability")) {
    const plan = J(P(e).planFor(i));
    assert.deepEqual(plan, { action: "openCapability", args: [Number(i.id.slice(2))] }, i.id);
  }
  assert.equal(P(e).planFor({ exec: { action: "deleteCapability", args: [1] } }), null);
});

test("palet: kullanılamayan yetenek gri + nedeni; planı yok (seçilemez)", () => {
  const e = palEnv((AM) => { AM.state.data.halflife = { status: "error", value: null, reason: "503: uç kapalı" }; });
  const items: Any[] = P(e).buildItems(e.AM);
  const it = items.find((i) => i.id === "k:66");
  assert.equal(it.disabled, true);
  assert.match(it.hint, /Kullanılamıyor: 503: uç kapalı/);
  assert.equal(P(e).planFor(it), null);
  assert.equal(items.find((i) => i.id === "k:64").disabled, false);
});

test("palet çalışma zamanı: yazınca listelenir, Enter/tıkla seçince openCapability çağrılır ve palet kapanır; gri öğe seçilemez", () => {
  const e = palEnv((AM) => {
    AM.state.data.halflife = { status: "error", value: null, reason: "503: uç kapalı" };
    AM.actions.openCapability = (id: number) => { AM.calls = (AM.calls || []).concat([[id]]); return Promise.resolve(); };
  });
  const pal = e.win.AM_PALETTE;
  pal.open(e.AM);
  const root = e.doc.ids["overlayRoot"]!;
  const input = byTag(root, "input")[0]!;
  typeInto(input, "hipotez");
  const opts = byClass(root, "am-pal-opt");
  assert.ok(opts.length >= 1);
  assert.match(opts[0]!.textContent, /Rakip hipotezler/);
  assert.match(byClass(root, "am-pal-gh")[0]!.textContent, /Yetenekler/);
  opts[0]!.click();
  assert.deepEqual(J(e.AM.calls), [[62]]);
  assert.equal(pal.isOpen(), false, "seçince palet kapanır");
  // gri öğe
  pal.open(e.AM);
  typeInto(byTag(root, "input")[0]!, "yarı ömrü");
  const gray = byClass(root, "am-pal-opt").find((o) => /Bilgi yarı ömrü/.test(o.textContent))!;
  assert.ok(gray && hasClass(gray, "am-pal-opt--disabled") && gray.attrs["aria-disabled"] === "true");
  assert.match(gray.textContent, /Kullanılamıyor: 503: uç kapalı/);
  gray.click();
  assert.equal(e.AM.calls.length, 1, "gri öğe eylem çağırmaz");
  assert.equal(pal.isOpen(), true, "palet açık kalır (neden okunur)");
  assert.match(byClass(root, "am-sr")[0]?.textContent ?? "", /Kullanılamıyor/);
});

test("palet: katalog yoksa ya da bozuksa çökmez (yetenek öğesi eklenmez)", () => {
  const e = makeEnv(PAGES, ["palette.js"]);
  const items: Any[] = e.win.AM_PALETTE.pure.buildItems(e.AM);
  assert.equal(items.filter((i) => i.group === "capability").length, 0);
  e.win.AM_CAPABILITIES = [null, 5, { ad: 4 }, { id: 1, ad: "X", aciklama: "Y", sayfa: "research", bolum: "b", kategori: "research" }];
  assert.doesNotThrow(() => e.win.AM_PALETTE.pure.buildItems(e.AM));
  const e2 = catalogEnv();
  e2.win.AM_PALETTE;
});

// ---------------------------------------------------------------- çekirdek: openCapability ve /yetenekler
test("çekirdek openCapability: kataloğa göre sayfa + bölüm parametresi; her seferinde yeni sayaç; bilinmeyen kimlik hiçbir şey yapmaz", async () => {
  const c = coreEnv(undefined, ["capabilities.js"]);
  await c.flush();
  const AM = c.win.AM;
  await AM.actions.openCapability(62);
  assert.equal(AM.view.page, "research");
  assert.equal(AM.view.pageParam, "bolum:am-lab-hyp:1");
  await AM.actions.openCapability("62");
  assert.equal(AM.view.pageParam, "bolum:am-lab-hyp:2", "aynı yeteneğe yeniden gidince sayaç değişir (yeniden açılsın diye)");
  await AM.actions.openCapability(93);
  assert.equal(AM.view.page, "tasks");
  assert.equal(AM.view.pageParam, "bolum:am-lab-attn:3");
  const before = { page: AM.view.page, param: AM.view.pageParam };
  for (const bad of [76, 0, -1, 101, "x", "../1", null, undefined, {}, [], 6.5, "1e2"]) await AM.actions.openCapability(bad);
  assert.deepEqual({ page: AM.view.page, param: AM.view.pageParam }, before, "model türü ve bozuk kimlikler görünümü değiştirmez");
  // model yeteneği: Araştırma sayfasındaki kartına götürür (hiçbir şey çalıştırmaz)
  await AM.actions.openCapability(81);
  assert.equal(AM.view.page, "research");
  assert.match(AM.view.pageParam, /^bolum:am-model-solution-space:[0-9]+$/);
  // ayar/proje ayarı penceresi açıksa kapanır
  AM.actions.setView({ settingsOpen: true });
  await AM.actions.openCapability(66);
  assert.equal(AM.view.settingsOpen, false);
  assert.equal(AM.view.page, "research");
  // katalog yüklenmemişse güvenle hiçbir şey yapmaz
  const c2 = coreEnv();
  await c2.flush();
  await c2.win.AM.actions.openCapability(62);
  assert.notEqual(c2.win.AM.view.page, "research");
});

test("çekirdek /yetenekler: katalogdaki yetenekleri kategorisiyle listeler; kullanılamayanı nedeniyle gösterir; kendiliğinden çalışmadıklarını söyler", async () => {
  const c = coreEnv(undefined, ["capabilities.js"]);
  await c.flush();
  const AM = c.win.AM;
  AM.state.data.halflife = { status: "error", value: null, reason: "503: uç kapalı" };
  await AM.actions.command("/yetenekler");
  const last = AM.log[AM.log.length - 1];
  assert.equal(last.role, "assistant");
  const t: string = last.text;
  assert.match(t, /yalnız siz çağırınca çalışır/);
  for (const n of ["Rakip hipotezler", "Bilgi değeri", "Dikkat sırası", "Etki haritası", "Mutasyon testi", "Argüman derle"]) assert.ok(t.includes(n), n);
  assert.match(t, /• Bilgi yarı ömrü — Araştırma ve Kalibrasyon \(kullanılamıyor: 503: uç kapalı\)/);
  assert.match(t, /• Rakip hipotezler — Araştırma ve Kalibrasyon$/m);
  assert.equal(t.split("\n").filter((l) => l.startsWith("•")).length, EXPECTED_IDS.length);
  for (const id of MODEL_IDS) assert.ok(!new RegExp("#" + id + "\\b").test(t));
  assert.doesNotMatch(t, /yakında|⟦/i);
  // büyük/küçük harf ve Türkçe katlama: /YETENEKLER da çalışır
  await AM.actions.command("/YETENEKLER");
  assert.match(AM.log[AM.log.length - 1].text, /Rakip hipotezler/);
  // katalog yoksa dürüst ileti
  const c2 = coreEnv();
  await c2.flush();
  await c2.win.AM.actions.command("/yetenekler");
  const l2 = c2.win.AM.log;
  assert.match(l2[l2.length - 1].text, /Yetenek kataloğu yüklenemedi/);
});

test("sohbet kutusu: '/yetenekler' komut listesinde ve /yardim metninde var", () => {
  const e = makeEnv(PAGES, ["chat.js", "palette.js"]);
  assert.ok(J(e.win.AM_CHAT.pure.commands).includes("/yetenekler"));
  assert.ok(J(e.win.AM_CHAT.pure.filterCommands("yetenek").map((x: Any) => x.name)).includes("/yetenekler"));
  assert.match(e.win.AM_T("cmd.help"), /\/yetenekler/);
  assert.equal(e.win.AM_T("chat.cmd.yetenekler").startsWith("⟦"), false);
  assert.equal(e.win.AM_T("palette.cmd.capabilities").startsWith("⟦"), false);
});

test("yükleme sırası: index.html ve sunucu beyaz listesi capabilities.js'i içerir; metinler kayıtlı", () => {
  const html = read("index.html");
  assert.match(html, /<script src="\/ui\/capabilities\.js" defer><\/script>/);
  assert.ok(html.indexOf("capabilities.js") > html.indexOf("strings.js") && html.indexOf("capabilities.js") < html.indexOf("core.js"));
  const e = catalogEnv();
  for (const k of ["caps.title", "caps.hint", "caps.listHead", "caps.empty"]) assert.equal(e.win.AM_T(k).startsWith("⟦"), false, k);
  void UUID; void walk; void byKey;
});

test("palet: yetenekler kategoriye (sayfaya) göre ayrı alt gruplara bölünür; başlık 'Yetenekler · <sayfa adı>'", () => {
  const e = palEnv();
  const items: Any[] = P(e).buildItems(e.AM);
  const groups: Any[] = P(e).groupResults(P(e).rankItems(items, "bilgi"));
  const capGroups = groups.filter((g) => g.group === "capability");
  assert.ok(capGroups.length >= 2, "araştırma ve hafıza alt grupları");
  assert.ok(["memory", "research"].every((c) => capGroups.some((g) => g.cat === c)));
  assert.equal(new Set(capGroups.map((g) => g.cat)).size, capGroups.length, "her kategori bir kez");
  for (const g of capGroups) assert.ok(g.entries.every((x: Any) => x.item.cat === g.cat), "alt grup yalnız kendi kategorisini içerir");
  assert.equal(P(e).flatten(groups).length, groups.reduce((n: number, g: Any) => n + g.entries.length, 0));
  e.win.AM_PALETTE.open(e.AM);
  const root = e.doc.ids["overlayRoot"]!;
  typeInto(byTag(root, "input")[0]!, "bilgi");
  const heads = byClass(root, "am-pal-gh").map((h) => h.textContent);
  assert.ok(heads.includes("Yetenekler · Araştırma ve Kalibrasyon") && heads.includes("Yetenekler · Hafıza ve Bilgi"), heads.join("|"));
  for (const h of byClass(root, "am-pal-group")) assert.ok(h.attrs["aria-labelledby"], "grup adlı");
});

test("kullanılabilirlik: yalnız parametreyle çağrılan yetenekler (bağlam, argüman, etki, çıkış, aracı, dikkat) tek bir parametre hatasıyla gri olmaz", () => {
  const e = catalogEnv();
  const api = e.win.AM_CAPABILITIES_API;
  const AM = { state: { data: {
    "analysisExit:x": { status: "error", reason: "404" }, "analysisImpact:src/a.ts|3": { status: "error", reason: "404" }, "analysisBroker:execute|": { status: "error", reason: "400" },
    ["argument:" + UUID(1)]: { status: "error", reason: "404" }, "attention:5": { status: "error", reason: "400" }, "memoryContext:1|2000|x": { status: "error", reason: "500" }
  } } };
  for (const id of [44, 61, 70, 80, 93, 99]) assert.equal(api.availability(AM, api.byId(id)).ok, true, String(id));
  const AM2 = { state: { data: { analysisOffline: { status: "error", reason: "500: kapalı" }, learning: { status: "ok", value: {} } } } };
  assert.equal(api.availability(AM2, api.byId(74)).ok, false);
  assert.equal(api.availability(AM2, api.byId(97)).ok, true);
});

test("kullanılabilirlik: model yetenekleri GET /api/capabilities/model yanıtından gelir (liste yoksa açık; available:false gri + neden maskeli; hata gri)", () => {
  const api = catalogEnv().win.AM_CAPABILITIES_API;
  const e = { id: 81, tur: "model", modelId: "solution-space" };
  const AM = (data: Record<string, unknown>) => ({ state: { data } });
  assert.equal(api.availability(AM({}), e).ok, true, "liste hiç yüklenmedi");
  assert.equal(api.availability(AM({ modelCapabilities: { status: "loading" } }), e).ok, true);
  const bad = J(api.availability(AM({ modelCapabilities: { status: "ok", value: { capabilities: [{ id: "solution-space", availability: { available: false, reason: "claude: kapalı sk-abcdefghijklmnopqrstuvwx" } }] } } }), e));
  assert.equal(bad.ok, false);
  assert.match(bad.reason, /claude: kapalı/);
  assert.ok(!bad.reason.includes("sk-abcdefghijklmnopqrstuvwx"));
  assert.equal(api.availability(AM({ modelCapabilities: { status: "ok", value: { capabilities: [{ id: "solution-space", availability: { available: true, reason: "x" } }] } } }), e).ok, true);
  assert.equal(api.availability(AM({ modelCapabilities: { status: "ok", value: { capabilities: [{ id: "solution-space", available: false, reason: "r" }] } } }), e).ok, false, "düz available alanı da okunur");
  assert.equal(api.availability(AM({ modelCapabilities: { status: "ok", value: { capabilities: [] } } }), e).ok, false, "sunucu listesinde yoksa kullanılamaz");
  const err = J(api.availability(AM({ modelCapabilities: { status: "error", reason: "503: x" } }), e));
  assert.equal(err.ok, false);
  assert.match(err.reason, /503/);
  assert.equal(api.availability(AM({ modelCapabilities: { status: "error", reason: "503" } }), { id: 62, tur: "hesap" }).ok, true, "hesap türü etkilenmez");
});

test("palet: kullanılamayan model yeteneği gri + neden; palet açılınca model yeteneği listesi istenir", () => {
  const e = palEnv((AM) => { AM.state.data.modelCapabilities = { status: "ok", value: { capabilities: [{ id: "intent", availability: { available: false, reason: "uygun sağlayıcı yok" } }] } }; });
  const items: Any[] = P(e).buildItems(e.AM);
  const it = items.find((i) => i.id === "k:92");
  assert.equal(it.disabled, true);
  assert.match(it.hint, /Kullanılamıyor: uygun sağlayıcı yok/);
  assert.equal(P(e).planFor(it), null);
  const c = coreEnv(undefined, ["capabilities.js"]);
  c.win.AM.actions.openPalette();
  assert.ok(c.calls.some((x) => x[0] === "GET" && x[1] === "/api/capabilities/model"));
});

test("katalog: internetli yetenekler (37, 38, 40) internet:true; internet kapalıyken kullanılabilir kalır ama 'internet kapalı: yalnız kaynaksız' notu düşer (menü, palet, /yetenekler)", async () => {
  const e = palEnv();
  const cat = catalog(e).filter((c) => c.internet === true);
  assert.deepEqual(cat.map((c) => c.id).sort((a, b) => a - b), [37, 38, 40]);
  assert.deepEqual(cat.map((c) => c.modelId).sort(), ["competitor-research", "feature-discovery", "research-center"]);
  assert.equal(catalog(e).filter((c) => c.tur === "model" && c.internet !== true).length, 7);
  const api = e.win.AM_CAPABILITIES_API;
  const item = { id: "research-center", availability: { available: true, reason: "x" }, net: { enabled: false, allowedDomains: [] } };
  const ent = { id: 37, tur: "model", modelId: "research-center", internet: true };
  const off = J(api.availability({ state: { data: { modelCapabilities: { status: "ok", value: { capabilities: [item] } } } } }, ent));
  assert.equal(off.ok, true);
  assert.equal(off.note, "internet kapalı: yalnız kaynaksız");
  const on = J(api.availability({ state: { data: { modelCapabilities: { status: "ok", value: { capabilities: [{ ...item, net: { enabled: true, allowedDomains: ["a.example.net"] } }] } } } } }, ent));
  assert.deepEqual(on, { ok: true, reason: "" });
  const viaSettings = J(api.availability({ state: { data: { modelCapabilities: { status: "ok", value: { capabilities: [{ id: "research-center", availability: { available: true } }] } }, netSettings: { status: "ok", value: { settings: { enabled: false } } } } } }, ent));
  assert.equal(viaSettings.note, "internet kapalı: yalnız kaynaksız");
  assert.equal(J(api.availability({ state: { data: { modelCapabilities: { status: "ok", value: { capabilities: [{ ...item, availability: { available: false, reason: "yok" } }] } } } } }, ent)).ok, false, "sağlayıcı yoksa gri");
  // palet: not ipucuna eklenir, öğe seçilebilir kalır
  const p = palEnv((AM) => { AM.state.data.modelCapabilities = { status: "ok", value: { capabilities: [item] } }; });
  const it = P(p).buildItems(p.AM).find((i: Any) => i.id === "k:37");
  assert.equal(it.disabled, false);
  assert.match(it.hint, /internet kapalı: yalnız kaynaksız/);
  assert.deepEqual(J(P(p).planFor(it)), { action: "openCapability", args: [37] });
  // /yetenekler
  const c = coreEnv(undefined, ["capabilities.js"]);
  await c.flush();
  c.win.AM.state.data.modelCapabilities = { status: "ok", value: { capabilities: [item, { id: "feature-discovery", availability: { available: true }, net: { enabled: true, allowedDomains: ["a.example.net"] } }] } };
  await c.win.AM.actions.command("/yetenekler");
  const t: string = c.win.AM.log[c.win.AM.log.length - 1].text;
  assert.match(t, /• Araştırma merkezi — Araştırma ve Kalibrasyon \(internet kapalı: yalnız kaynaksız\)/);
  assert.match(t, /• Özellik keşfi — Araştırma ve Kalibrasyon$/m);
});
