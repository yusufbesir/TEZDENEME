// D9 testleri: Karar laboratuvarı (Araştırma), sistem analitiği (Entegrasyonlar), dikkat sırası (Görevler) ve çekirdek hesap eylemleri.
// Sahip: Claude [İP:AgentMom Faz 11, D9]. yazan: [Claude#agentmom-d9-yetenekler]. Kaynaklar node:vm içinde; ağ yok, tarayıcı yok, model çağrısı yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FNode, FDoc, read, walk, byTag, byKey, byId, byClass, alerts, buttons, typeInto, okData, noActiveContent, makeEnv, J, coreEnv } from "./lab-env.ts";
import type { Env } from "./lab-env.ts";

const EVIL = "<img src=x onerror=alert(1)><script>alert(2)</script> \u202Egnp.exe \u200B";
const SECRET = "sk-abcdefghijklmnopqrstuvwx";
const UUID = (n: number): string => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const text = (e: Env): string => e.host.textContent;
const nonEmpty = (s: string): void => { assert.ok(s.length > 0); };

function research(setup?: (e: Env) => void, param = ""): Env {
  const e = makeEnv();
  setup?.(e);
  e.go("research", param);
  return e;
}
const open = (e: Env, id: string): void => { buttons(byKey(e.host, "lab-toggle:" + id)!.parentNode!, /^Aç$/)[0]!.click(); e.P.rerender(); };
const toggleOf = (e: Env, id: string): FNode => byKey(e.host, "lab-toggle:" + id)!;

// ================================================================ Araştırma: yapı ve tembel yükleme
test("research/lab: beş bölüm başlığı kimlikli ve kapalı; açılmadan hiçbir laboratuvar verisi istenmez", () => {
  const e = research();
  for (const id of ["am-lab-hyp", "am-lab-voi", "am-lab-res", "am-lab-half", "am-lab-learn"]) {
    assert.ok(byId(e.host, id), id);
    assert.equal(toggleOf(e, id).attrs["aria-expanded"], "false", id);
  }
  const asked = e.loads().map((c) => c[1]);
  for (const k of ["contradictionResolutions", "halflife", "learning", "argument", "hypothesesResult", "voiResult"]) assert.ok(!asked.includes(k), k);
  assert.doesNotMatch(text(e), /⟦/);
  assert.ok(text(e).includes("kendiliğinden çalışmaz"));
  assert.ok(text(e).includes("Rakip hipotezler") && text(e).includes("Bilgi değeri") && text(e).includes("Çelişki çözüm önerileri") && text(e).includes("Bilgi yarı ömrü") && text(e).includes("Öğrenme getirisi"));
});

test("research/lab: mevcut kalibrasyon ve soy ağacı bölümleri korunur", () => {
  const e = research((x) => { x.AM.state.data.calibration = okData({ report: { verdict: "insufficient_data", resolved: 1, unresolvedOverdue: 0, brier: 0.2, meanConfidence: 0.5, accuracy: 0.5, gap: 0, selectionBiasWarning: false, note: "n" } }); });
  assert.ok(text(e).includes("Kalibrasyon özeti"));
  assert.ok(text(e).includes("Karar soy ağacı"));
  assert.equal(byTag(e.host, "h2").length, 1);
});

test("research/lab: yetenekler menüsünden gelinen bölüm bir kez açılır ve başlığa odaklanır (kapatılırsa yeniden açılmaz)", () => {
  const e = research(undefined, "bolum:am-lab-half:1");
  assert.equal(toggleOf(e, "am-lab-half").attrs["aria-expanded"], "true");
  assert.deepEqual(e.loads().filter((c) => c[1] === "halflife").length, 1, "açılınca bir kez istenir");
  const h = byId(e.host, "am-lab-half")!;
  assert.equal(e.doc.activeElement, h, "başlığa odak");
  assert.equal(h.attrs["tabindex"], "-1");
  assert.ok(h.scrolled >= 1);
  buttons(toggleOf(e, "am-lab-half").parentNode!, /^Kapat$/)[0]!.click();
  e.go("research", "bolum:am-lab-half:1");
  assert.equal(toggleOf(e, "am-lab-half").attrs["aria-expanded"], "false", "aynı gezinme yeniden açmaz");
  e.go("research", "bolum:am-lab-half:2");
  assert.equal(toggleOf(e, "am-lab-half").attrs["aria-expanded"], "true", "yeni gezinme yeniden açar");
  e.doc.activeElement = null;
  e.P.rerender();
  assert.equal(e.doc.activeElement, null, "sonraki yeniden çizimler odağı çalmaz");
});

test("research/lab: bilinmeyen ya da bozuk bölüm parametresi hiçbir şeyi açmaz", () => {
  for (const p of ["bolum:yok", "bolum:", "x", "bolum:am-lab-hyp:abc", "bolum:../x"]) {
    const e = research(undefined, p);
    for (const id of ["am-lab-hyp", "am-lab-voi", "am-lab-res", "am-lab-half", "am-lab-learn"]) assert.equal(toggleOf(e, id).attrs["aria-expanded"], "false", p + " " + id);
  }
});

// ================================================================ Rakip hipotezler
const HYP_RESULT = (over: Record<string, unknown> = {}) => ({
  analysis: {
    mode: "bayes", priorUsed: "eşit", hypothesisCount: 2, evidenceCount: 1,
    posteriors: [
      { id: "h2", name: "İkinci", prior: 0.5, posterior: 0.2, eliminated: false, inconsistent: 1, rank: 2 },
      { id: "h1", name: "Birinci", prior: 0.5, posterior: 0.8, eliminated: false, inconsistent: 0, rank: 1 },
    ],
    evidence: [{ id: "e1", text: "Kanıt bir", ratio: 4, ratioInfinite: false, strength: "orta", highestId: "h1", lowestId: "h2", note: "h1 en olası" }],
    leastRefuted: { id: "h1", name: "Birinci", inconsistent: 0, tiedWith: [] },
    warnings: ["Uyarı bir"], assumptions: ["Varsayım bir"],
    ...over,
  },
});
const hypOpen = (setup?: (e: Env) => void): Env => {
  const e = research((x) => { x.AM.actions.hypothesesRun = (f: any) => { x.calls.push(["hypothesesRun", J(f)]); return Promise.resolve({ ok: true }); }; setup?.(x); });
  open(e, "am-lab-hyp");
  return e;
};

test("hipotez formu: iki hipotez + bir kanıt alanı, etiketli girdiler ve yardım metni", () => {
  const e = hypOpen();
  for (const k of ["hyp-mode", "hyp-name-0", "hyp-prior-0", "hyp-name-1", "hyp-prior-1", "ev-text-0", "ev-lik-0-0", "ev-lik-0-1", "hyp-run", "hyp-add", "ev-add"]) assert.ok(byKey(e.host, k), k);
  assert.equal(byKey(e.host, "hyp-del-0"), undefined, "en az iki hipotez: silme yok");
  assert.equal(byKey(e.host, "ev-del-0"), undefined, "en az bir kanıt: silme yok");
  const labels = byTag(e.host, "label");
  for (const l of labels) assert.ok(l.attrs["for"], "etiket for");
  for (const k of ["hyp-name-0", "ev-lik-0-1"]) { const c = byKey(e.host, k)!; assert.ok(labels.some((l) => l.attrs["for"] === c.id), k); }
  assert.ok(text(e).includes("Boş bırakılan olabilirlik 0,5"));
  assert.doesNotMatch(text(e), /⟦/);
});

test("hipotez formu: Hesapla ham alan değerleriyle AM.actions.hypothesesRun'ı çağırır (kimlikler h1.. e1..)", () => {
  const e = hypOpen();
  typeInto(byKey(e.host, "hyp-name-0")!, "Birinci");
  typeInto(byKey(e.host, "hyp-prior-0")!, "0,6");
  typeInto(byKey(e.host, "hyp-name-1")!, "İkinci");
  typeInto(byKey(e.host, "hyp-prior-1")!, "0,4");
  typeInto(byKey(e.host, "ev-text-0")!, "Kanıt metni");
  typeInto(byKey(e.host, "ev-lik-0-0")!, "0,9");
  typeInto(byKey(e.host, "ev-lik-0-1")!, "");
  typeInto(byKey(e.host, "hyp-mode")!, "ach");
  byKey(e.host, "hyp-run")!.click();
  const call = e.calls.find((c) => c[0] === "hypothesesRun");
  assert.deepEqual(call[1], {
    mode: "ach",
    hypotheses: [{ id: "h1", name: "Birinci", prior: "0,6" }, { id: "h2", name: "İkinci", prior: "0,4" }],
    evidence: [{ id: "e1", text: "Kanıt metni", likelihoods: { h1: "0,9", h2: "" } }]
  });
});

test("hipotez formu: satır ekle/çıkar, olabilirlik sütunları hipotezlerle birlikte büyür/küçülür; yazılanlar yeniden çizimde korunur", () => {
  const e = hypOpen();
  typeInto(byKey(e.host, "hyp-name-0")!, "Ad bir");
  byKey(e.host, "hyp-add")!.click();
  assert.ok(byKey(e.host, "hyp-name-2") && byKey(e.host, "ev-lik-0-2"));
  assert.equal(byKey(e.host, "hyp-name-0")!.value, "Ad bir", "yeniden çizimde korunur");
  byKey(e.host, "ev-add")!.click();
  assert.ok(byKey(e.host, "ev-text-1") && byKey(e.host, "ev-lik-1-2") && byKey(e.host, "ev-del-0"));
  byKey(e.host, "hyp-del-0")!.click();
  assert.equal(byKey(e.host, "hyp-name-2"), undefined);
  assert.equal(byKey(e.host, "ev-lik-0-2"), undefined);
  for (let i = 0; i < 12; i++) { const b = byKey(e.host, "hyp-add"); if (b) b.click(); }
  assert.equal(byKey(e.host, "hyp-add"), undefined, "en çok 10 hipotez");
  assert.ok(byKey(e.host, "hyp-name-9") && !byKey(e.host, "hyp-name-10"));
  for (let i = 0; i < 40; i++) { const b = byKey(e.host, "ev-add"); if (b) b.click(); }
  assert.equal(byKey(e.host, "ev-add"), undefined, "en çok 30 kanıt");
});

test("hipotez sonucu: ardıl çubukları (değer + sayı), sıra, ayırt edicilik, en az çürütülen, uyarılar ve varsayımlar", () => {
  const e = hypOpen((x) => { x.AM.state.data.hypothesesResult = okData(HYP_RESULT()); });
  const res = byClass(e.host, "am-more-result")[0]!;
  const bars = byTag(res, "progress");
  assert.deepEqual(bars.map((b) => b.attrs["value"]), ["80", "20"], "sıra 1: Birinci");
  assert.ok(bars.every((b) => b.attrs["max"] === "100" && b.attrs["aria-label"]));
  const t = res.textContent;
  for (const re of [/Birinci \(h1\)/, /%80/, /%20/, /En az çürütülen hipotez: Birinci \(uyuşmazlık sayısı 0\)/, /Kanıt bir/, /orta/, /4/, /Uyarı bir/, /Varsayım bir/, /yalnız bir öneridir; hiçbir şey kaydedilmedi/, /eşit öncül/]) assert.match(t, re);
  assert.equal(byTag(res, "button").length, 0);
});

test("hipotez sonucu: elenen, tanımsız ardıl, sonsuz oran ve eşit çürütülenler dürüstçe gösterilir", () => {
  const r = HYP_RESULT({
    posteriors: [{ id: "h1", name: "A", prior: 0.5, posterior: null, eliminated: true, inconsistent: 2, rank: 1 }, { id: "h2", name: "B", prior: 0.5, posterior: null, eliminated: false, inconsistent: 1, rank: 2 }],
    evidence: [{ id: "e1", text: "k", ratio: null, ratioInfinite: true, strength: "kesin", highestId: "h2", lowestId: "h1", note: "n" }],
    leastRefuted: null, mode: "ach", priorUsed: "verilen"
  });
  const e = hypOpen((x) => { x.AM.state.data.hypothesesResult = okData(r); });
  const t = text(e);
  assert.match(t, /Elendi/); assert.match(t, /Tanımsız/); assert.match(t, /∞/); assert.match(t, /bütün hipotezler elendi/); assert.match(t, /verdiğiniz öncüller/);
  const e2 = hypOpen((x) => { x.AM.state.data.hypothesesResult = okData(HYP_RESULT({ leastRefuted: { id: "h1", name: "Birinci", inconsistent: 1, tiedWith: ["h2"] } })); });
  assert.match(text(e2), /Eşit olanlar: h2/);
});

test("hipotez sonucu: yükleniyor, sunucu/doğrulama hatası (uyarı kartı) ve bozuk yanıt; çift gönderim için düğme devre dışı", () => {
  const e = hypOpen((x) => { x.AM.state.data.hypothesesResult = { status: "loading", value: null }; });
  assert.equal(byKey(e.host, "hyp-run")!.disabled, true);
  assert.match(text(e), /Hesaplanıyor/);
  e.AM.state.data.hypothesesResult = { status: "error", value: null, reason: "Öncüllerin toplamı 1 olmalı (şu an 0,9). " + SECRET };
  e.P.rerender();
  assert.equal(byKey(e.host, "hyp-run")!.disabled, false);
  const a = alerts(e.host).filter((n) => n.textContent.includes("Hipotez hesabı yapılamadı"));
  assert.equal(a.length, 1);
  assert.match(a[0]!.textContent, /toplamı 1 olmalı/);
  assert.ok(!text(e).includes(SECRET));
  for (const bad of [null, 5, {}, { analysis: null }, { analysis: { posteriors: "x" } }, { analysis: { posteriors: [null, 4, {}], evidence: [null, {}], warnings: "x" } }]) {
    e.AM.state.data.hypothesesResult = okData(bad);
    assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad));
  }
});

test("hipotez sonucu: XSS yükü ve gizli değer etkisiz (yalnız textContent)", () => {
  const r = HYP_RESULT({
    posteriors: [{ id: EVIL, name: EVIL + SECRET, prior: 0.5, posterior: 0.5, eliminated: false, inconsistent: 0, rank: 1 }],
    evidence: [{ id: "e", text: EVIL + SECRET, ratio: 1, ratioInfinite: false, strength: EVIL, highestId: "h", lowestId: "h", note: EVIL }],
    warnings: [EVIL + SECRET], assumptions: [EVIL]
  });
  const e = hypOpen((x) => { x.AM.state.data.hypothesesResult = okData(r); });
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
  assert.ok(!/[\u202A-\u202E\u200B]/.test(text(e)));
  assert.ok(text(e).includes("<script>alert(2)</script>"), "etiket metin olarak görünür, çalışmaz");
});

// ================================================================ Bilgi değeri
const VOI_RESULT = (over: Record<string, unknown> = {}) => ({
  voi: {
    optionValues: [{ id: "o1", name: "Seçenek A", expectedValue: 10 }, { id: "o2", name: "Seçenek B", expectedValue: 4 }],
    bestOption: { id: "o1", name: "Seçenek A", expectedValue: 10 }, margin: 6, evpi: 3.5,
    tests: [{ id: "t1", name: "Deneme", cost: 1, evsi: 2, net: 1, worthIt: true, outcomes: [{ outcome: "positive", probability: 0.6, bestOptionId: "o1" }, { outcome: "negative", probability: 0.4, bestOptionId: "o2" }] }],
    recommendation: { gather: true, testId: "t1", text: "Bilgi toplamaya değer: Deneme" }, sensitivity: ["Duyarlı"], assumptions: ["Varsayım iki"],
    ...over,
  },
});
const voiOpen = (setup?: (e: Env) => void): Env => {
  const e = research((x) => { x.AM.actions.voiRun = (f: any) => { x.calls.push(["voiRun", J(f)]); return Promise.resolve({ ok: true }); }; setup?.(x); });
  open(e, "am-lab-voi");
  return e;
};

test("bilgi değeri formu: durum/seçenek/test alanları; Hesapla basit pozitif-olasılık biçimiyle voiRun'ı çağırır", () => {
  const e = voiOpen();
  for (const k of ["voi-sname-0", "voi-sp-0", "voi-sname-1", "voi-sp-1", "voi-oname-0", "voi-pay-0-0", "voi-pay-0-1", "voi-oname-1", "voi-pay-1-0", "voi-run", "voi-sadd", "voi-oadd", "voi-tadd"]) assert.ok(byKey(e.host, k), k);
  assert.ok(text(e).includes("yalnız iki değerli (pozitif/negatif)"), "basit biçim belgelenir");
  typeInto(byKey(e.host, "voi-sname-0")!, "İyi"); typeInto(byKey(e.host, "voi-sp-0")!, "0,7");
  typeInto(byKey(e.host, "voi-sname-1")!, "Kötü"); typeInto(byKey(e.host, "voi-sp-1")!, "0,3");
  typeInto(byKey(e.host, "voi-oname-0")!, "A"); typeInto(byKey(e.host, "voi-pay-0-0")!, "10"); typeInto(byKey(e.host, "voi-pay-0-1")!, "-5");
  typeInto(byKey(e.host, "voi-oname-1")!, "B"); typeInto(byKey(e.host, "voi-pay-1-0")!, "2"); typeInto(byKey(e.host, "voi-pay-1-1")!, "2");
  byKey(e.host, "voi-tadd")!.click();
  typeInto(byKey(e.host, "voi-tname-0")!, "Deneme"); typeInto(byKey(e.host, "voi-tcost-0")!, "1,5");
  typeInto(byKey(e.host, "voi-tpos-0-0")!, "0,8"); typeInto(byKey(e.host, "voi-tpos-0-1")!, "0,2");
  assert.ok(text(e).includes("Pozitif sonuç olasılığı: İyi"), "durum adı etikette");
  byKey(e.host, "voi-run")!.click();
  assert.deepEqual(e.calls.find((c) => c[0] === "voiRun")[1], {
    states: [{ id: "s1", p: "0,7" }, { id: "s2", p: "0,3" }],
    options: [{ id: "o1", name: "A", payoffs: { s1: "10", s2: "-5" } }, { id: "o2", name: "B", payoffs: { s1: "2", s2: "2" } }],
    tests: [{ id: "t1", name: "Deneme", cost: "1,5", positive: { s1: "0,8", s2: "0,2" } }]
  });
});

test("bilgi değeri formu: satır sınırları (durum ≤10, seçenek ≤10, test ≤5, alt sınır 2) ve sütun senkronu", () => {
  const e = voiOpen();
  for (let i = 0; i < 12; i++) { const b = byKey(e.host, "voi-sadd"); if (b) b.click(); }
  assert.ok(byKey(e.host, "voi-sp-9") && !byKey(e.host, "voi-sp-10") && !byKey(e.host, "voi-sadd"));
  assert.ok(byKey(e.host, "voi-pay-1-9"), "seçenek kazanç sütunları durumlarla büyür");
  for (let i = 0; i < 12; i++) { const b = byKey(e.host, "voi-oadd"); if (b) b.click(); }
  assert.ok(!byKey(e.host, "voi-oadd") && byKey(e.host, "voi-oname-9"));
  for (let i = 0; i < 8; i++) { const b = byKey(e.host, "voi-tadd"); if (b) b.click(); }
  assert.ok(!byKey(e.host, "voi-tadd") && byKey(e.host, "voi-tname-4") && !byKey(e.host, "voi-tname-5"));
  assert.ok(byKey(e.host, "voi-tpos-0-9"));
  for (let i = 0; i < 12; i++) { const b = byKey(e.host, "voi-sdel-0"); if (b) b.click(); }
  assert.ok(byKey(e.host, "voi-sp-1") && !byKey(e.host, "voi-sp-2") && !byKey(e.host, "voi-sdel-0"), "en az iki durum");
  assert.ok(!byKey(e.host, "voi-pay-0-2") && !byKey(e.host, "voi-tpos-0-2"));
});

test("bilgi değeri sonucu: EV tablosu, EVPI, EVSI/net, öneri, duyarlılık; çıktılar seçenek adlarıyla", () => {
  const e = voiOpen((x) => { x.AM.state.data.voiResult = okData(VOI_RESULT()); });
  const t = byClass(e.host, "am-more-result")[0]!.textContent;
  for (const re of [/Seçenek A/, /Seçenek B/, /En iyi seçenek/, /Mükemmel bilginin değeri \(EVPI\)3,5/, /Deneme/, /EVSI/, /Net değer/, /Değer/, /Pozitif sonuç: olasılık %60; bu durumda en iyi seçenek Seçenek A/, /Negatif sonuç: olasılık %40; bu durumda en iyi seçenek Seçenek B/, /Öneri: Bilgi toplamaya değer: Deneme/, /Duyarlı/, /Varsayım iki/]) assert.match(t, re);
  const e2 = voiOpen((x) => { x.AM.state.data.voiResult = okData(VOI_RESULT({ tests: [{ id: "t1", name: "T", cost: 9, evsi: 1, net: -8, worthIt: false, outcomes: [] }], margin: null })); });
  assert.match(text(e2), /Değmez/);
});

test("bilgi değeri sonucu: hata kartı, bozuk yanıt ve XSS yükü", () => {
  const e = voiOpen((x) => { x.AM.state.data.voiResult = { status: "error", value: null, reason: "Durum olasılıklarının toplamı 1 olmalı (şu an 0,5)." }; });
  assert.ok(alerts(e.host).some((n) => /Bilgi değeri hesabı yapılamadı/.test(n.textContent) && /toplamı 1 olmalı/.test(n.textContent)));
  for (const bad of [null, 3, {}, { voi: null }, { voi: { optionValues: "x" } }, { voi: { optionValues: [null, {}], tests: [null, { outcomes: "x" }], recommendation: 3, sensitivity: "x" } }]) {
    e.AM.state.data.voiResult = okData(bad);
    assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad));
  }
  e.AM.state.data.voiResult = okData(VOI_RESULT({ optionValues: [{ id: "o1", name: EVIL + SECRET, expectedValue: 1 }], bestOption: { id: "o1" }, recommendation: { gather: false, text: EVIL + SECRET }, sensitivity: [EVIL], assumptions: [EVIL], tests: [] }));
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
});

// ================================================================ Çelişki çözümleri, yarı ömür, öğrenme getirisi
const BRIEF = (id: string, over: Record<string, unknown> = {}) => ({ id, kind: "fact", title: "Kayıt " + id, scope: "proje", confidence: 0.8, observedAt: "2026-10-01T00:00:00Z", status: "active", source: "user", flags: [], ...over });
const RESOLUTIONS = (over: Record<string, unknown> = {}) => ({
  generatedAt: "2026-10-23T10:00:00Z", totalOpen: 2, considered: 2, truncated: false, suggested: 1, unresolvable: 1, note: "Yalnız öneri",
  resolutions: [
    { flagId: "f1", detail: "Aynı konu iki farklı değer", a: BRIEF("a1"), b: BRIEF("b1", { title: "Eski kayıt" }), outcome: "önerildi", keep: "a1", retire: "b1", retireAlreadyInactive: false, rule: "yenilik", rationale: "A daha yeni", confidence: 0.7, dissentingRules: ["guven"] },
    { flagId: "f2", detail: "Çözülemiyor", a: BRIEF("a2"), b: null, outcome: "çözülemez", keep: null, retire: null, retireAlreadyInactive: false, rule: "none", rationale: "Kural yok", confidence: 0, dissentingRules: [] },
  ],
  ...over,
});
test("çelişki çözüm önerileri: bölüm açılınca istek bir kez; yükleniyor; öneri kartları, kural, gerekçe, güven; 'yalnız ÖNERİ' notu", () => {
  const e = research();
  open(e, "am-lab-res");
  assert.deepEqual(e.loads().filter((c) => c[1] === "contradictionResolutions").length, 1);
  assert.match(text(e), /çözüm önerileri yükleniyor/);
  e.P.rerender();
  assert.equal(e.loads().filter((c) => c[1] === "contradictionResolutions").length, 1, "yeniden çizim yeniden istemez");
  e.AM.state.data.contradictionResolutions = okData(RESOLUTIONS());
  e.P.rerender();
  const t = text(e);
  for (const re of [/Yalnız ÖNERİDİR/, /Uygulama kullanıcı kararıdır/, /Önerildi/, /Güven: %70/, /Önerilen \(tutulacak\): Kayıt a1/, /Emekli edilmesi önerilen: Eski kayıt/, /Kural: Yenilik\. Gerekçe: A daha yeni/, /Farklı sonuç veren kurallar: Güven/, /Çözülemez/, /Kayıt B: \(kayıt yok\)/, /Açık çelişki/]) assert.match(t, re);
  assert.equal(buttons(byId(e.host, "am-lab-res")!.parentNode!.parentNode!, /uygula|emekli et|çöz\b|sil/i).length, 0, "uygulama düğmesi yok");
});

test("çelişki çözüm önerileri: boş liste, kesilmiş liste, hata + yeniden dene, bozuk veri, XSS", () => {
  const e = research();
  open(e, "am-lab-res");
  e.AM.state.data.contradictionResolutions = okData(RESOLUTIONS({ resolutions: [], truncated: true }));
  e.P.rerender();
  assert.match(text(e), /Çözüm önerisi yok/); assert.match(text(e), /Liste kesildi/);
  e.AM.state.data.contradictionResolutions = { status: "error", value: null, reason: "503: kullanılamıyor" };
  e.P.rerender();
  const a = alerts(e.host).filter((n) => n.textContent.includes("Çelişki çözüm önerileri alınamadı"));
  assert.equal(a.length, 1); assert.match(a[0]!.textContent, /503/);
  const n0 = e.loads().length;
  buttons(a[0]!, /Yeniden dene/)[0]!.click();
  assert.deepEqual(e.loads().slice(n0)[0], ["loadData", "contradictionResolutions", undefined], "yeniden dene yeniden ister");
  for (const bad of [null, 4, { resolutions: "x" }, { resolutions: [null, 3, {}, { a: 5, b: "x", outcome: 7 }] }]) {
    e.AM.state.data.contradictionResolutions = okData(bad);
    assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad));
  }
  e.AM.state.data.contradictionResolutions = okData(RESOLUTIONS({ resolutions: [{ ...(RESOLUTIONS().resolutions[0] as object), detail: EVIL + SECRET, rationale: EVIL + SECRET, a: BRIEF("a1", { title: EVIL + SECRET }) }] }));
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
});

const HALF_G = (over: Record<string, unknown> = {}) => ({ kind: "fact", scope: null, records: 10, activeRecords: 8, medianAgeDays: 30.5, staleCount: 2, expiredCount: 1, staleOrExpiredShare: 0.375, sampleSize: 7, censored: 3, retiredUnknownTime: 0, status: "yeterli", halfLifeDays: 45.2, defaultStaleAfterDays: 90, adviceText: "Öneri metni", ...over });
test("bilgi yarı ömrü: tür/kapsam tabloları, örnek boyutu HER ZAMAN görünür, 'yetersiz veri' dürüst", () => {
  const e = research();
  open(e, "am-lab-half");
  assert.equal(e.loads().filter((c) => c[1] === "halflife").length, 1);
  e.AM.state.data.halflife = okData({ generatedAt: "x", recordsRead: 20, excludedBadTimes: 1, readLimitReached: true, minSample: 5, byKind: [HALF_G(), HALF_G({ kind: "decision", status: "yetersiz veri", sampleSize: 2, halfLifeDays: null, staleOrExpiredShare: null, medianAgeDays: null })], byKindAndScope: [HALF_G({ scope: "proje" })], truncatedGroups: true, note: "Not" });
  e.P.rerender();
  const t = text(e);
  for (const re of [/Örnek boyutu/, /45,2 gün/, /Yeterli veri/, /Yetersiz veri/, /Tüm kapsamlar/, /proje/, /%38/, /30,5/, /Okuma sınırına ulaşıldı/, /Grup listesi kesildi/, /Zamanı bozuk, dışarıda bırakılan/, /Örnek boyutu 5 değerinden azsa/]) assert.match(t, re);
  const rows = byClass(byClass(e.host, "am-more-tablewrap")[0]!, "am-more-row");
  assert.match(rows[1]!.textContent, /decision[\s\S]*2[\s\S]*Yetersiz veri/, "yetersiz grupta örnek boyutu 2 ve yarı ömür yok");
  assert.doesNotMatch(rows[1]!.textContent, /gün$/);
});

test("bilgi yarı ömrü: boş grup, hata, bozuk veri ve XSS", () => {
  const e = research();
  open(e, "am-lab-half");
  e.AM.state.data.halflife = okData({ byKind: [], byKindAndScope: [] });
  e.P.rerender();
  assert.match(text(e), /Gösterilecek grup yok/);
  e.AM.state.data.halflife = { status: "error", value: null, reason: "500" };
  e.P.rerender();
  assert.ok(alerts(e.host).some((n) => /Bilgi yarı ömrü haritası alınamadı/.test(n.textContent)));
  for (const bad of [null, 1, { byKind: "x" }, { byKind: [null, 2, {}, { kind: 5, status: 9 }] }]) { e.AM.state.data.halflife = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
  e.AM.state.data.halflife = okData({ minSample: 5, byKind: [HALF_G({ kind: EVIL + SECRET, adviceText: EVIL + SECRET })], byKindAndScope: [] });
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
});

const LEARN_E = (over: Record<string, unknown> = {}) => ({ source: null, resolved: 12, open: 3, unresolvedOverdue: 1, meanBrier: 0.2, firstHalfBrier: 0.25, lastHalfBrier: 0.15, improvement: 0.1, learningReturn: 0.4, trend: "iyileşiyor", status: "yeterli", note: "n", ...over });
test("öğrenme getirisi: genel + kaynak bazlı Brier ve iyileşme; yetersiz veri durumları", () => {
  const e = research();
  open(e, "am-lab-learn");
  assert.equal(e.loads().filter((c) => c[1] === "learning").length, 1);
  e.AM.state.data.learning = okData({ generatedAt: "x", minResolved: 6, sourcesTotal: 30, truncated: true, overall: LEARN_E(), sources: [LEARN_E({ source: "claude-code" }), LEARN_E({ source: "codex", status: "yetersiz veri", meanBrier: null, improvement: null, learningReturn: null, trend: null, resolved: 2 })], note: "Genel not" });
  e.P.rerender();
  const t = text(e);
  for (const re of [/Genel \(tüm kaynaklar\)/, /claude-code/, /codex/, /0,200/, /0,100/, /İyileşiyor/, /Yetersiz veri/, /Kaynak listesi kesildi \(toplam 30 kaynak\)/, /sayısı 6 değerinden azsa/]) assert.match(t, re);
  e.AM.state.data.learning = okData({ minResolved: 6, overall: null, sources: [] });
  e.P.rerender();
  assert.match(text(e), /Öğrenme verisi yok/);
  e.AM.state.data.learning = { status: "error", value: null, reason: "500" };
  e.P.rerender();
  assert.ok(alerts(e.host).some((n) => /Öğrenme getirisi alınamadı/.test(n.textContent)));
  for (const bad of [null, 1, { sources: "x", overall: 3 }, { sources: [null, 1, {}], overall: [] }]) { e.AM.state.data.learning = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
  e.AM.state.data.learning = okData({ minResolved: 6, overall: LEARN_E({ source: EVIL + SECRET, note: EVIL }), sources: [] });
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
});

// ================================================================ Argüman derle
const FOREST_DATA = { totalRoots: 1, truncated: false, trees: [{ root: UUID(1), headId: UUID(1), headTitle: "Karar bir", headState: "active", headReviewState: "ok", depth: 2, current: UUID(1), chain: [UUID(1)] }] };
const ARG = (over: Record<string, unknown> = {}) => ({
  argument: {
    decisionId: UUID(1), claim: "Karar bir", scope: "proje", status: "active", decidedAt: "2026-09-01T00:00:00Z", expiresAt: "2026-12-01T00:00:00Z",
    grounds: ["Dayanak bir"], assumptions: [{ text: "Varsayım bir", status: "unverified", checkBy: "2026-11-01T00:00:00Z" }],
    risks: [{ kind: "kırık varsayım", severity: "high", text: "Risk metni" }, { kind: "bayat bellek", severity: "low", text: "Küçük risk" }],
    counterpoints: [{ decisionId: UUID(2), title: "Karşı karar", decidedAt: "2026-08-01T00:00:00Z", rationale: "Neden", brokenAssumptions: ["x"] }],
    linkedMemory: [{ id: "m1", title: "Bağlı kayıt", kind: "fact", confidence: 0.9, flags: [] }],
    verdict: "gözden geçir", verdictReasons: ["Gerekçe bir"], markdown: "# Başlık\n\nSatır iki\n- madde", maskedSecrets: true, generatedAt: "x", ...over,
  },
});
test("argüman: soy ağacındaki her karar satırında 'Argüman' düğmesi; tıklayınca GET argüman istenir ve sonuç gösterilir", () => {
  const e = research((x) => { x.AM.state.data.genealogy = okData(FOREST_DATA); });
  const tree = byClass(e.host, "am-more-tree")[0]!;
  const b = buttons(tree, /^Argüman$/)[0]!;
  assert.equal(b.attrs["aria-expanded"], "false");
  const n0 = e.loads().length;
  b.click();
  assert.deepEqual(e.loads().slice(n0)[0], ["loadData", "argument", UUID(1)]);
  assert.match(text(e), /Argüman derleniyor/);
  e.AM.state.data["argument:" + UUID(1)] = okData(ARG());
  e.P.rerender();
  const blk = byId(e.host, "am-lab-arg")!;
  const t = blk.textContent;
  for (const re of [/Hüküm: gözden geçir/, /İddia: Karar bir/, /Gerekçe bir/, /Dayanak bir/, /Varsayım bir — unverified/, /Yüksek/, /kırık varsayım: Risk metni/, /Düşük/, /Karşı karar/, /1 kırık varsayım/, /Bağlı kayıt/, /Metindeki gizli değerler maskelendi/, /Derlenen argüman metni/]) assert.match(t, re);
  const pre = byTag(blk, "pre")[0]!;
  assert.equal(pre.textContent, "# Başlık\n\nSatır iki\n- madde", "satır sonları korunur");
  assert.equal(pre.attrs["tabindex"], "0");
  assert.ok(byClass(blk, "am-more-chip").some((c) => hasWarn(c)), "hüküm rozeti uyarı tonlu");
  // aynı düğme kapatır
  buttons(byClass(e.host, "am-more-tree")[0]!, /^Argümanı kapat$/)[0]!.click();
  assert.equal(byId(e.host, "am-lab-arg"), undefined);
});
const hasWarn = (n: FNode): boolean => n.className.includes("am-more-chip--warn");

test("argüman: zincir düğümlerinde de düğme; hata + yeniden dene; geçersiz kimlikte düğme yok; XSS", () => {
  const e = research((x) => { x.AM.state.data.genealogy = okData(FOREST_DATA); });
  click0(e);
  e.AM.state.data["genealogy:" + UUID(1)] = okData({ genealogy: { root: UUID(1), chain: [UUID(1)], current: UUID(1), depth: 1, truncated: false, nodes: [{ id: UUID(1), title: "Karar bir", decidedAt: "2026-09-01T00:00:00Z", expiresAt: "2026-12-01T00:00:00Z", state: "active", assumptions: [], reviewState: "ok" }, { id: EVIL, title: "Bozuk", state: "active" }] } });
  e.P.rerender();
  const nodes = byClass(e.host, "am-more-node");
  assert.equal(buttons(nodes[0]!, /^Argüman$/).length, 1);
  assert.equal(buttons(nodes[1]!, /Argüman/).length, 0, "geçersiz kimlikli düğümde yok");
  buttons(nodes[0]!, /^Argüman$/)[0]!.click();
  e.AM.state.data["argument:" + UUID(1)] = { status: "error", value: null, reason: "404: karar bulunamadı" };
  e.P.rerender();
  const a = alerts(e.host).filter((n) => /Argüman derlenemedi/.test(n.textContent));
  assert.equal(a.length, 1); assert.match(a[0]!.textContent, /404/);
  const n0 = e.loads().length;
  buttons(a[0]!, /Yeniden dene/)[0]!.click();
  assert.deepEqual(e.loads().slice(n0)[0], ["loadData", "argument", UUID(1)]);
  for (const bad of [null, 2, {}, { argument: null }, { argument: { risks: "x", grounds: 4, assumptions: [null, 1], counterpoints: [null], linkedMemory: "x", markdown: 5 } }]) { e.AM.state.data["argument:" + UUID(1)] = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
  e.AM.state.data["argument:" + UUID(1)] = okData(ARG({ claim: EVIL + SECRET, grounds: [EVIL + SECRET], markdown: EVIL + SECRET + "\n\u202E", verdict: EVIL, risks: [{ kind: EVIL, severity: EVIL, text: EVIL }] }));
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
  assert.ok(!/[\u202A-\u202E\u200B]/.test(text(e)));
  assert.equal(buttons(e.host, /onayla|reddet|sil\b|kaydet|geri al/i).length, 0, "karar düğmesi yok");
});
function click0(e: Env): void { buttons(byClass(e.host, "am-more-tree")[0]!, /Zinciri aç/)[0]!.click(); }

// ================================================================ Entegrasyonlar: sistem analitiği
const CAPS_MIN = { items: [{ n: 1, en: "A", tr: "A", sahip: "M1", durum: "Doğrulandı", kanit: [], eksik: "", dilim: "M1" }], summary: { total: 1, dogrulandi: 1, kismi: 0, planli: 0, desteklenmiyor: 0, kapsamdisi: 0 }, slices: {}, registry: [], updatedAt: "x" };
function integ(setup?: (e: Env) => void, param = ""): Env {
  const e = makeEnv();
  e.AM.state.data.capabilities = okData(CAPS_MIN);
  setup?.(e);
  e.go("integrations", param);
  return e;
}
const openI = (e: Env, id: string): void => { buttons(toggleOf(e, id).parentNode!, /^Aç$/)[0]!.click(); };
const LAB_IDS_I = ["am-lab-impact", "am-lab-cont", "am-lab-exit", "am-lab-broker", "am-lab-offline", "am-lab-expertise", "am-lab-shadow", "am-lab-absence"];

test("integrations/lab: mevcut yetenek tablosu korunur; sekiz analiz bölümü kimlikli, kapalı; hiçbir analiz verisi istenmez", () => {
  const e = integ();
  assert.ok(text(e).includes("100 yetenek") || text(e).includes("Yetenek"), "tablo bölümü sürer");
  assert.ok(byId(e.host, "am-more-int-tb"), "mevcut tablo bölümü kimliği");
  for (const id of LAB_IDS_I) { assert.ok(byId(e.host, id), id); assert.equal(toggleOf(e, id).attrs["aria-expanded"], "false", id); }
  assert.equal(e.loads().filter((c) => /^analysis/.test(c[1])).length, 0);
  assert.equal(byTag(e.host, "h2").length, 1);
  assert.match(text(e), /Sistem analitiği/);
  assert.doesNotMatch(text(e), /⟦/);
});

test("integrations/lab: menüden gelinen bölüm açılır, yüklenir ve odaklanır", () => {
  const e = integ(undefined, "bolum:am-lab-cont:3");
  assert.equal(toggleOf(e, "am-lab-cont").attrs["aria-expanded"], "true");
  assert.equal(e.loads().filter((c) => c[1] === "analysisContinuity").length, 1);
  assert.equal(e.doc.activeElement, byId(e.host, "am-lab-cont"));
});

test("etki haritası: geçersiz dosya/derinlik istek göndermez ve Türkçe hata gösterir; geçerli istek doğru parametreyle gider", () => {
  const e = integ();
  openI(e, "am-lab-impact");
  e.P.rerender();
  const run = () => { byKey(e.host, "impact-run")!.click(); };
  for (const bad of ["", "   ", "../x.ts", "src/../x.ts", "/etc/passwd", "src\\a.ts", "C:\\a.ts", "src/a:b.ts", "x".repeat(201), "src/a b.ts", "src/<x>.ts"]) {
    typeInto(byKey(e.host, "impact-file")!, bad);
    run();
    assert.equal(e.loads().filter((c) => c[1] === "analysisImpact").length, 0, "istek yok: " + JSON.stringify(bad));
    assert.ok(alerts(e.host).some((n) => /Dosya yolu geçersiz/.test(n.textContent)), "hata: " + JSON.stringify(bad));
  }
  typeInto(byKey(e.host, "impact-file")!, "src/server/app.ts");
  typeInto(byKey(e.host, "impact-depth")!, "9");
  run();
  assert.equal(e.loads().filter((c) => c[1] === "analysisImpact").length, 0);
  assert.ok(alerts(e.host).some((n) => /Derinlik 1 ile 6/.test(n.textContent)));
  typeInto(byKey(e.host, "impact-depth")!, "4");
  run();
  assert.deepEqual(e.loads().filter((c) => c[1] === "analysisImpact"), [["loadData", "analysisImpact", "src/server/app.ts|4"]]);
  assert.equal(alerts(e.host).filter((n) => /Dosya yolu geçersiz|Derinlik 1/.test(n.textContent)).length, 0, "hata temizlendi");
  assert.match(text(e), /Analiz yükleniyor/);
});

const IMPACT = (over: Record<string, unknown> = {}) => ({
  impact: {
    file: "src/a.ts", depth: 3, isTest: false, directImports: ["src/b.ts"], externalImports: ["node:fs"],
    layers: [{ distance: 1, files: ["src/c.ts", "src/d.ts"], tests: ["src/c.test.ts"] }, { distance: 2, files: ["src/e.ts"], tests: [] }],
    affectedTests: [{ file: "src/c.test.ts", distance: 1 }], radius: { direct: 2, transitive: 3, tests: 1, unboundedTransitive: 5, unboundedMaxDistance: 4 },
    inCycle: true, cycle: ["src/a.ts", "src/c.ts", "src/a.ts"], truncated: true, note: "Sunucu notu", ...over,
  },
});
test("etki haritası sonucu: katman katman bağımlılar, etkilenen testler, döngü ve kesildi uyarıları", () => {
  const e = integ();
  openI(e, "am-lab-impact");
  e.P.rerender();
  typeInto(byKey(e.host, "impact-file")!, "src/a.ts");
  byKey(e.host, "impact-run")!.click();
  e.AM.state.data["analysisImpact:src/a.ts|3"] = okData(IMPACT());
  e.P.rerender();
  const t = text(e);
  for (const re of [/Katman 1 \(uzaklık 1\)/, /Katman 2 \(uzaklık 2\)/, /src\/c\.ts/, /src\/e\.ts/, /Etkilenen testler/, /src\/c\.test\.ts/, /döngü \(dairesel bağımlılık\)/, /src\/a\.ts → src\/c\.ts → src\/a\.ts/, /Sonuç kesildi/, /Doğrudan bağımlı/, /Sunucu notu: Sunucu notu/, /node:fs|src\/b\.ts/]) assert.match(t, re);
  e.AM.state.data["analysisImpact:src/a.ts|3"] = okData(IMPACT({ layers: [], affectedTests: [], inCycle: false, truncated: false }));
  e.P.rerender();
  assert.match(text(e), /Etkilenen dosya yok/);
  assert.doesNotMatch(text(e), /Sonuç kesildi/);
});

test("etki haritası: hata (+ yeniden dene), bozuk yanıt, XSS; graf özeti ayrı düğmeyle", () => {
  const e = integ();
  openI(e, "am-lab-impact");
  e.P.rerender();
  typeInto(byKey(e.host, "impact-file")!, "src/a.ts");
  byKey(e.host, "impact-run")!.click();
  e.AM.state.data["analysisImpact:src/a.ts|3"] = { status: "error", value: null, reason: "404: dosya bulunamadı" };
  e.P.rerender();
  const a = alerts(e.host).filter((n) => /Etki analizi yapılamadı/.test(n.textContent));
  assert.equal(a.length, 1); assert.match(a[0]!.textContent, /404/);
  const n0 = e.loads().length;
  buttons(a[0]!, /Yeniden dene/)[0]!.click();
  assert.deepEqual(e.loads().slice(n0)[0], ["loadData", "analysisImpact", "src/a.ts|3"]);
  for (const bad of [null, 3, {}, { impact: null }, { impact: { layers: "x", affectedTests: 2, radius: 5, cycle: 3 } }, { impact: { layers: [null, 1, { files: 4 }] } }]) { e.AM.state.data["analysisImpact:src/a.ts|3"] = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
  e.AM.state.data["analysisImpact:src/a.ts|3"] = okData(IMPACT({ file: EVIL + SECRET, layers: [{ distance: EVIL, files: [EVIL + SECRET], tests: [EVIL] }], note: EVIL + SECRET }));
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
  const n1 = e.loads().length;
  byKey(e.host, "graph-run")!.click();
  assert.deepEqual(e.loads().slice(n1)[0], ["loadData", "analysisGraph", undefined]);
  e.AM.state.data.analysisGraph = okData({ graph: { files: 10, edges: 20, externalImports: 3, unresolvedInSrc: 0, outsideSrc: 0, dynamicImports: 1, topDependedOn: [{ file: "src/core.ts", dependents: 7 }], cycleCount: 1, cycles: [["src/a.ts", "src/b.ts", "src/a.ts"]], scan: { elapsedMs: 5, skippedLarge: 0, truncated: true }, note: "n" } });
  e.P.rerender();
  for (const re of [/Bağımlılık grafı özeti/, /src\/core\.ts — 7 bağımlı/, /src\/a\.ts → src\/b\.ts → src\/a\.ts/, /Tarama kesildi/]) assert.match(text(e), re);
  for (const bad of [null, {}, { graph: null }, { graph: { topDependedOn: "x", cycles: [1, null, ["a"]], scan: 3 } }]) { e.AM.state.data.analysisGraph = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
});

const CONT = {
  continuity: {
    providers: [], capabilities: [{ operation: "execute", nobody: false }, { operation: "cancel", nobody: true }], edges: [],
    singlePoints: [{ capability: "execute", provider: "codex", status: "verified", essential: true, active: true }],
    ifProviderLost: [{ provider: "codex", lost: ["execute", "cancel"], retained: ["getStatus"], noProviderLeft: false }, { provider: "claude-code", lost: [], retained: ["a"], noProviderLeft: true }],
    summary: { providers: 3, activeProviders: 2, capabilities: 10, edges: 20, singlePoints: 1, essentialSinglePoints: 1, offeredByNobody: 1 }, note: "n",
  },
};
test("yetenek sürekliliği: tek hata noktaları, kaybolan/kalan yetenekler, hiçbir sağlayıcının sunmadığı; boş durumlar", () => {
  const e = integ();
  openI(e, "am-lab-cont");
  e.P.rerender();
  assert.equal(e.loads().filter((c) => c[1] === "analysisContinuity").length, 1);
  assert.match(text(e), /Analiz yükleniyor/);
  e.AM.state.data.analysisContinuity = okData(CONT);
  e.P.rerender();
  for (const re of [/Tek hata noktaları/, /execute/, /codex/, /Zorunlu/, /Kaybolan yetenekler/, /execute, cancel/, /Hiç sağlayıcı kalmıyor/, /Kayıp yok/, /Hiçbir sağlayıcının sunmadığı yetenekler/, /cancel/]) assert.match(text(e), re);
  e.AM.state.data.analysisContinuity = okData({ continuity: { singlePoints: [], ifProviderLost: [], capabilities: [], summary: {} } });
  e.P.rerender();
  assert.match(text(e), /Tek hata noktası yok/); assert.match(text(e), /Sağlayıcı bulunamadı/);
  e.AM.state.data.analysisContinuity = { status: "error", value: null, reason: "503" };
  e.P.rerender();
  assert.ok(alerts(e.host).some((n) => /Süreklilik analizi alınamadı/.test(n.textContent)));
  for (const bad of [null, 1, {}, { continuity: null }, { continuity: { singlePoints: "x", ifProviderLost: [null, { lost: 4 }], capabilities: [null, 1] } }]) { e.AM.state.data.analysisContinuity = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
});

const EXIT = (over: Record<string, unknown> = {}) => ({
  exit: {
    target: { id: "claude-code", displayName: "Claude Code", routeKind: "subscription", active: true, requiredCapabilities: [] }, verdict: "kısmi yedek", summary: "Özet metni",
    candidates: [{ provider: "codex", displayName: "Codex", routeKind: "subscription", coverage: 0.8, routeCompat: 1, health: "unknown", healthFactor: 0.9, swapScore: 72, missing: [{ operation: "streamEvents", targetStatus: "verified", candidateStatus: null }], reasons: ["Neden bir"] }],
    closed: [{ provider: "api-x", displayName: "API X", routeKind: "api_paid", coverage: 1, routeCompat: 0, health: "unknown", healthFactor: 0.9, swapScore: null, missing: [], reasons: ["Ücretli rota kapalı"] }],
    excluded: [{ provider: "opencode", displayName: "OpenCode", routeKind: "subscription", coverage: null, routeCompat: 1, health: "unknown", healthFactor: 0.9, swapScore: null, missing: [], reasons: ["Adaptör yok"] }],
    formula: "puan = ...", note: "Not", ...over,
  },
});
test("çıkış planı: sağlayıcı seçici, geçersiz kimlik istek göndermez; sonuç adaylar, puan, eksik yetenek, 'api_paid kapalı', 'yedek yok'", () => {
  const e = integ((x) => { x.AM.state.providers = [{ id: "claude-code", displayName: "Claude Code" }, { id: "codex", displayName: "Codex" }]; });
  openI(e, "am-lab-exit");
  e.P.rerender();
  const sel = byKey(e.host, "exit-provider")!;
  assert.equal(sel.tag, "select");
  assert.deepEqual(byTag(sel, "option").map((o) => o.value), ["claude-code", "codex"]);
  byKey(e.host, "exit-run")!.click();
  assert.deepEqual(e.loads().filter((c) => c[1] === "analysisExit"), [["loadData", "analysisExit", "claude-code"]]);
  e.AM.state.data["analysisExit:claude-code"] = okData(EXIT());
  e.P.rerender();
  for (const re of [/Kısmi yedek/, /Hedef sağlayıcı: Claude Code \(claude-code\)/, /Codex \(codex\)/, /%80/, /72/, /streamEvents/, /api_paid kapalı/, /API X/, /Elenenler/, /OpenCode/, /Adaptör yok/, /Puan formülü/]) assert.match(text(e), re);
  e.AM.state.data["analysisExit:claude-code"] = okData(EXIT({ verdict: "yedek yok", candidates: [], closed: [], excluded: [] }));
  e.P.rerender();
  assert.match(text(e), /Yedek yok/); assert.match(text(e), /Yerine geçebilecek aday yok/);
  // sağlayıcı listesi yoksa metin kutusu; geçersiz kimlik istek göndermez
  const e2 = integ();
  openI(e2, "am-lab-exit");
  e2.P.rerender();
  const inp = byKey(e2.host, "exit-provider")!;
  assert.equal(inp.tag, "input");
  for (const bad of ["", "a b", "../x", "x".repeat(61), "a/b", "a\\b"]) {
    typeInto(inp, bad);
    byKey(e2.host, "exit-run")!.click();
    assert.equal(e2.loads().filter((c) => c[1] === "analysisExit").length, 0, JSON.stringify(bad));
    assert.ok(alerts(e2.host).some((n) => /Sağlayıcı kimliği geçersiz/.test(n.textContent)));
  }
  typeInto(byKey(e2.host, "exit-provider")!, "claude-code");
  byKey(e2.host, "exit-run")!.click();
  assert.equal(e2.loads().filter((c) => c[1] === "analysisExit").length, 1);
});

test("çıkış planı: hata, bozuk yanıt ve XSS", () => {
  const e = integ((x) => { x.AM.state.providers = [{ id: "codex", displayName: EVIL }]; });
  openI(e, "am-lab-exit"); e.P.rerender();
  byKey(e.host, "exit-run")!.click();
  e.AM.state.data["analysisExit:codex"] = { status: "error", value: null, reason: "404: bilinmeyen sağlayıcı" };
  e.P.rerender();
  assert.ok(alerts(e.host).some((n) => /Çıkış planı alınamadı/.test(n.textContent) && /404/.test(n.textContent)));
  for (const bad of [null, 1, {}, { exit: null }, { exit: { candidates: "x", closed: [null, 3], excluded: 5, target: 5 } }]) { e.AM.state.data["analysisExit:codex"] = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
  e.AM.state.data["analysisExit:codex"] = okData(EXIT({ summary: EVIL + SECRET, candidates: [{ provider: EVIL, displayName: EVIL + SECRET, routeKind: EVIL, coverage: 0.5, swapScore: 1, missing: [{ operation: EVIL }], reasons: [EVIL + SECRET] }] }));
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
});

const BROKER = (over: Record<string, unknown> = {}) => ({
  broker: {
    capability: "execute", role: "review", summary: "1 aday, 1 elendi",
    candidates: [{ rank: 1, provider: "codex", displayName: "Codex", routeKind: "subscription", capabilityStatus: "verified", health: "good", roleObservation: { attempts: 9, successRate: 0.89 }, reasons: ["Doğrulanmış"] }, { rank: 2, provider: "claude-code", displayName: "Claude Code", routeKind: "subscription", capabilityStatus: "partial", health: "unknown", roleObservation: null, reasons: [] }],
    eliminated: [{ provider: "api-x", reasons: ["Ücretli rota daima elenir"] }], ordering: "durum > rota", note: "Not", ...over,
  },
});
test("iç yetenek aracısı: yetenek + rol seçicileri; istek 'yetenek|rol'; sıralı adaylar ve elenenler nedenleriyle", () => {
  const e = integ();
  openI(e, "am-lab-broker"); e.P.rerender();
  const cap = byKey(e.host, "broker-cap")!;
  assert.equal(byTag(cap, "option").length, 10);
  assert.deepEqual(byTag(byKey(e.host, "broker-role")!, "option").map((o) => o.value), ["", "plan", "implement", "review", "verify"]);
  typeInto(cap, "execute"); typeInto(byKey(e.host, "broker-role")!, "review");
  byKey(e.host, "broker-run")!.click();
  assert.deepEqual(e.loads().filter((c) => c[1] === "analysisBroker"), [["loadData", "analysisBroker", "execute|review"]]);
  e.AM.state.data["analysisBroker:execute|review"] = okData(BROKER());
  e.P.rerender();
  for (const re of [/1\. Codex \(codex\)/, /2\. Claude Code \(claude-code\)/, /rolde 9 deneme, başarı %89/, /rolde gözlem yok/, /Doğrulanmış/, /Elenen sağlayıcılar/, /api-x — Ücretli rota daima elenir/, /Sıralama ölçütü: durum > rota/]) assert.match(text(e), re);
  // bozuk değerler istek göndermez
  const n0 = e.loads().length;
  const sel = byKey(e.host, "broker-cap")!;
  typeInto(sel, "rm -rf");
  byKey(e.host, "broker-run")!.click();
  assert.equal(e.loads().length, n0, "beyaz liste dışı yetenek: istek yok");
  assert.ok(alerts(e.host).some((n) => /Yetenek listeden/.test(n.textContent)));
  typeInto(byKey(e.host, "broker-cap")!, "execute"); typeInto(byKey(e.host, "broker-role")!, "admin");
  byKey(e.host, "broker-run")!.click();
  assert.equal(e.loads().length, n0, "beyaz liste dışı rol: istek yok");
  typeInto(byKey(e.host, "broker-role")!, "");
  byKey(e.host, "broker-run")!.click();
  assert.deepEqual(e.loads()[e.loads().length - 1], ["loadData", "analysisBroker", "execute|"], "rolsüz");
  e.AM.state.data["analysisBroker:execute|"] = okData(BROKER({ candidates: [], eliminated: [] }));
  e.P.rerender();
  assert.match(text(e), /Uygun sağlayıcı yok/);
  for (const bad of [null, 1, {}, { broker: null }, { broker: { candidates: "x", eliminated: [null, 1], summary: 5 } }]) { e.AM.state.data["analysisBroker:execute|"] = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
  e.AM.state.data["analysisBroker:execute|"] = okData(BROKER({ summary: EVIL + SECRET, candidates: [{ rank: 1, provider: EVIL, displayName: EVIL + SECRET, reasons: [EVIL] }], eliminated: [{ provider: EVIL, reasons: [EVIL + SECRET] }] }));
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
});

const OFFLINE = (over: Record<string, unknown> = {}) => ({
  offline: {
    mode: "kısıtlı", offline: false, usableProviders: 1, verifiedProviders: 0, providers: [{ id: "codex", usable: true, executeStatus: "partial", reasons: ["Kısmi"] }],
    works: [{ id: "w1", name: "Görev kaydı", needsProvider: false, endpoints: ["GET /api/tasks"], why: "Yerel çalışır" }],
    blockedNow: [{ id: "b1", name: "Doğrulama koşusu", needsProvider: true, endpoints: [], why: "Sağlayıcı doğrulanmadı" }],
    needsProvider: [{ id: "n1", name: "Model koşusu", needsProvider: true, endpoints: [], why: "Sağlayıcı gerekir" }], summary: "Kısıtlı kip", note: "Not", ...over,
  },
});
test("çevrimdışı kip: kip rozeti, çevrimdışıyken yapılabilirler, engelliler, sağlayıcı gerektirenler", () => {
  const e = integ();
  openI(e, "am-lab-offline"); e.P.rerender();
  assert.equal(e.loads().filter((c) => c[1] === "analysisOffline").length, 1);
  e.AM.state.data.analysisOffline = okData(OFFLINE());
  e.P.rerender();
  for (const re of [/Kısıtlı/, /Çevrimdışıyken yapılabilirler/, /Görev kaydı — Yerel çalışır/, /Şu an engelli olanlar/, /Doğrulama koşusu/, /Sağlayıcı gerektirenler/, /Model koşusu/, /codex/]) assert.match(text(e), re);
  assert.ok(byClass(e.host, "am-more-chip").some((c) => c.className.includes("--warn") && /Kısıtlı/.test(c.textContent)));
  e.AM.state.data.analysisOffline = okData(OFFLINE({ mode: "çevrimdışı" }));
  e.P.rerender();
  assert.ok(byClass(e.host, "am-more-chip").some((c) => c.className.includes("--bad") && /Çevrimdışı/.test(c.textContent)));
  e.AM.state.data.analysisOffline = { status: "error", value: null, reason: "500" };
  e.P.rerender();
  assert.ok(alerts(e.host).some((n) => /Çevrimdışı kip bilgisi alınamadı/.test(n.textContent)));
  for (const bad of [null, 1, {}, { offline: null }, { offline: { works: "x", providers: [null, 1], mode: 5 } }]) { e.AM.state.data.analysisOffline = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
  e.AM.state.data.analysisOffline = okData(OFFLINE({ summary: EVIL + SECRET, works: [{ name: EVIL + SECRET, why: EVIL }] }));
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
});

test("uzmanlık haritası: sağlayıcı×rol tablosu; yetersiz veri dürüst, gözlem sayısı (n) hep görünür", () => {
  const e = integ();
  openI(e, "am-lab-expertise"); e.P.rerender();
  e.AM.state.data.analysisExpertise = okData({ expertise: { minSample: 5, rows: [
    { provider: "codex", role: "implement", attempts: 12, succeeded: 10, failed: 2, status: "yeterli", successRate: 0.8333, avgDurationMs: 4200, lastErrorKinds: [] },
    { provider: "codex", role: "review", attempts: 2, succeeded: 2, failed: 0, status: "yetersiz veri", successRate: null, avgDurationMs: null, lastErrorKinds: [] },
    { provider: "claude-code", role: "plan", attempts: 7, succeeded: 7, failed: 0, status: "yeterli", successRate: 1, avgDurationMs: null, lastErrorKinds: [] }],
    refusals: [{ provider: null, kind: "policy", count: 3 }], deliveries: null, unattributedSteps: 4, scan: { auditRows: 5000, limit: 5000, truncated: true }, note: "Not" } });
  e.P.rerender();
  const t = text(e);
  for (const re of [/%83 \(n=12\) · ort\. 4,2 sn/, /Yetersiz veri \(n=2\)/, /%100 \(n=7\)/, /Gözlem yok/, /Gözlem sayısı 5 değerinden azsa/, /Sağlayıcı bilinmiyor — policy × 3/, /5\.000 satırda kesildi/, /4 adım/]) assert.match(t, re);
  e.AM.state.data.analysisExpertise = okData({ expertise: { minSample: 5, rows: [], refusals: [], scan: {} } });
  e.P.rerender();
  assert.match(text(e), /Gözlem yok/);
  for (const bad of [null, 1, {}, { expertise: null }, { expertise: { rows: [null, 1, { provider: 5, role: 6 }], refusals: "x" } }]) { e.AM.state.data.analysisExpertise = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
  e.AM.state.data.analysisExpertise = okData({ expertise: { minSample: 5, rows: [{ provider: EVIL + SECRET, role: "plan", attempts: 9, status: "yeterli", successRate: 0.5 }], refusals: [] , scan: {} } });
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
});

test("kaynak gölge fiyatı: kıtlık göstergesi çubuğu, 'sınır bilinmiyor' dürüst, para birimi yok notu", () => {
  const e = integ();
  openI(e, "am-lab-shadow"); e.P.rerender();
  e.AM.state.data.analysisShadow = okData({ shadowPrice: { generatedAt: "x", windowDays: 7, costBasis: "list", currency: null, providers: [
    { provider: "codex", last7d: { calls: 40, tokens: 120000, reportedRuns: 30, durationMs: 1 }, last24h: { calls: 9, tokens: 30000 }, prior6d: { calls: 31, tokens: 90000 }, acceleration: { basis: "token", value: 1.4, note: "n" }, limit: { tokens7d: 200000, source: "kullanıcı" }, usageToLimit: 0.6, scarcity: 0.6, shadowPriceIndex: 84, level: "kıt", status: "Sınır bilindi" },
    { provider: "claude-code", last7d: { calls: 3, tokens: null, reportedRuns: 0, durationMs: null }, last24h: { calls: 0, tokens: null }, prior6d: { calls: 3, tokens: null }, acceleration: { basis: null, value: null, note: "" }, limit: null, usageToLimit: null, scarcity: null, shadowPriceIndex: null, level: null, status: "Sınır bilinmiyor: endeks yok" }], formula: "endeks = ...", note: "Not" } });
  e.P.rerender();
  const t = text(e);
  for (const re of [/para birimi yoktur/, /Sınır bilinmiyor/, /84 \/ 100/, /Kıt/i, /200\.000 \(kullanıcı\)|200000 \(kullanıcı\)/, /1,4 × \(token\)/, /Bildirilmedi/, /Formül: endeks/]) assert.match(t, re);
  const bar = byTag(e.host, "progress")[0]!;
  assert.equal(bar.attrs["value"], "84"); assert.equal(bar.attrs["max"], "100");
  assert.equal(byTag(e.host, "progress").length, 1, "sınırı bilinmeyen sağlayıcıya uydurma çubuk yok");
  for (const bad of [null, 1, {}, { shadowPrice: null }, { shadowPrice: { providers: "x" } }, { shadowPrice: { providers: [null, 1, { last7d: 4, limit: "x", acceleration: [] }] } }]) { e.AM.state.data.analysisShadow = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
  e.AM.state.data.analysisShadow = okData({ shadowPrice: { providers: [{ provider: EVIL + SECRET, status: EVIL + SECRET, shadowPriceIndex: 5, level: EVIL, limit: { tokens7d: 1, source: EVIL } }] } });
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
});

test("eksiklik/fazlalık: kullanılmayan ve eksik listeleri, sayılar, 'silme önerisi değildir', derin (4+ katman) veri", () => {
  const e = integ();
  openI(e, "am-lab-absence"); e.P.rerender();
  e.AM.state.data.analysisAbsence = okData({ absence: {
    unused: { tables: { items: [{ table: "eski_tablo", migration: "0001", referencedByTests: true, deliberate: true, note: "" }], total: 1, truncated: false }, endpoints: { items: [{ method: "GET", path: "/api/x" }], total: 40, truncated: true }, endpointsOnlyTests: { items: [], total: 0, truncated: false }, capabilities: { items: [{ operation: "cancel", declaredBy: ["codex", "claude-code"] }], total: 1, truncated: false } },
    missing: { plannedBySlice: [{ slice: "M14", count: 12, items: [{ n: 61, title: "Akıl yürütme" }] }], plannedTotal: 12, endpointsWithoutUi: { items: [{ method: "POST", path: "/api/y", clients: [] }], total: 1, truncated: false }, modulesWithoutDirectTest: { items: ["src/a.ts"], total: 1, truncated: false } },
    scan: { files: 100, elapsedMs: 10, skippedLarge: 0, truncated: true }, note: "Not" } });
  e.P.rerender();
  const t = text(e);
  for (const re of [/silme önerisi DEĞİLDİR/, /eski_tablo \(0001\) — bilerek bırakılmış — testlerde geçiyor/, /GET \/api\/x/, /\(40\)/, /…ve 39 tane daha/, /cancel — codex, claude-code/, /M14: 12 madde: #61 Akıl yürütme/, /POST \/api\/y/, /src\/a\.ts/, /Tarama kesildi/, /Liste kesildi/]) assert.match(t, re);
  for (const bad of [null, 1, {}, { absence: null }, { absence: { unused: 3, missing: [], scan: "x" } }, { absence: { unused: { tables: { items: [null, 1, "x"] } }, missing: { plannedBySlice: [null, { items: 5 }] } } }]) { e.AM.state.data.analysisAbsence = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
  e.AM.state.data.analysisAbsence = okData({ absence: { unused: { tables: { items: [{ table: EVIL + SECRET, migration: EVIL }], total: 1 } }, missing: {}, scan: {}, note: EVIL + SECRET } });
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
});

test("integrations/lab: yenile düğmesi aynı veriyi yeniden ister; çıkıştan sonra (veri sıfırlanınca) yeniden yüklenir", () => {
  const e = integ();
  openI(e, "am-lab-offline"); e.P.rerender();
  e.AM.state.data.analysisOffline = okData(OFFLINE());
  e.P.rerender();
  const n0 = e.loads().length;
  buttons(byId(e.host, "am-lab-offline")!.parentNode!.parentNode!, /^Yenile$/)[0]!.click();
  assert.deepEqual(e.loads().slice(n0)[0], ["loadData", "analysisOffline", undefined]);
  e.AM.state.data = {};
  e.AM.state.data.capabilities = okData(CAPS_MIN);
  const n1 = e.loads().filter((c) => c[1] === "analysisOffline").length;
  e.P.rerender();
  assert.equal(e.loads().filter((c) => c[1] === "analysisOffline").length, n1 + 1, "yeni veri nesnesi: yeniden istenir");
});

// ================================================================ Görevler: dikkat sırası
const ATTN = (over: Record<string, unknown> = {}) => ({
  budget: 5, totalAwaiting: 4, totalGroups: 2, truncated: false, counts: { now: 1, today: 1, batch: 0, critical: 1 }, overBudget: false,
  items: [
    { taskId: UUID(1), count: 3, taskIds: [UUID(1)], title: "Tekrarlayan görev", requestedAction: "file.write", riskLevel: "critical", riskScore: 90, priority: 95, waitingMinutes: 120, tier: "now", tierLabel: "şimdi", critical: true, reasons: ["Sistem dosyası", "Geri alınamaz"] },
    { taskId: UUID(2), count: 1, taskIds: [UUID(2)], title: "Sıradan görev", requestedAction: "file.read", riskLevel: "low", riskScore: 5, priority: 6, waitingMinutes: 4, tier: "today", tierLabel: "bugün", critical: false, reasons: [] },
  ],
  note: "Yalnız SIRALAMADIR", ...over,
});
function tasks(setup?: (e: Env) => void, param = ""): Env {
  const e = makeEnv();
  setup?.(e);
  e.go("tasks", param);
  return e;
}
test("tasks/dikkat sırası: bölüm kimlikli; hiçbir şey kendiliğinden istenmez; mevcut tablolar korunur", () => {
  const e = tasks();
  assert.ok(byId(e.host, "am-lab-attn"));
  assert.equal(e.loads().filter((c) => c[1] === "attention").length, 0);
  assert.match(text(e), /Dikkat sırası/); assert.match(text(e), /Görevler/); assert.match(text(e), /İş akışları/);
  assert.match(text(e), /Yalnız SIRALAR/);
  assert.ok(byKey(e.host, "attn-budget") && byKey(e.host, "attn-run"));
  assert.ok(byTag(e.host, "label").some((l) => l.attrs["for"] === byKey(e.host, "attn-budget")!.id));
});

test("tasks/dikkat sırası: geçersiz bütçe istek göndermez ve Türkçe hata gösterir; geçerli bütçe doğru isteği gönderir", () => {
  const e = tasks();
  for (const bad of ["", "0", "51", "abc", "1.5", "-3", "100", " "]) {
    typeInto(byKey(e.host, "attn-budget")!, bad);
    byKey(e.host, "attn-run")!.click();
    assert.equal(e.loads().filter((c) => c[1] === "attention").length, 0, JSON.stringify(bad));
    assert.ok(alerts(e.host).some((n) => /Bütçe 1 ile 50/.test(n.textContent)), JSON.stringify(bad));
  }
  typeInto(byKey(e.host, "attn-budget")!, "7");
  byKey(e.host, "attn-run")!.click();
  assert.deepEqual(e.loads().filter((c) => c[1] === "attention"), [["loadData", "attention", 7]]);
  assert.equal(alerts(e.host).filter((n) => /Bütçe 1 ile 50/.test(n.textContent)).length, 0);
  assert.match(text(e), /Yükleniyor/);
});

test("tasks/dikkat sırası: katmanlar, kritik işaret, gruplanmış tekrar (count), bütçe aşımı ve kesildi uyarıları", () => {
  const e = tasks();
  typeInto(byKey(e.host, "attn-budget")!, "5");
  byKey(e.host, "attn-run")!.click();
  e.AM.state.data["attention:5"] = okData(ATTN({ overBudget: true, truncated: true }));
  e.P.rerender();
  const t = text(e);
  for (const re of [/Şimdi/, /Bugün/, /Toplu\/sonra/, /Kritik/, /Tekrarlayan görev/, /3 aynı görev \(gruplandı\)/, /Sıradan görev/, /120 dk/, /Sistem dosyası · Geri alınamaz/, /Bütçe: 5 · bekleyen görev: 4 · grup: 2/, /bütçeyi aşıyor/, /hepsi değerlendirilemedi/, /Sunucu notu: Yalnız SIRALAMADIR/, /kritik/]) assert.match(t, re);
  const rows = byClass(byTag(e.host, "table").filter((x) => x.children[0]?.textContent.includes("Dikkat sırası"))[0]!, "am-pg-tr");
  assert.equal(rows.length, 2);
  assert.equal(buttons(byId(e.host, "am-lab-attn")!.parentNode!.parentNode!, /onayla|reddet|izin ver/i).length, 0, "onay/ret düğmesi yok");
  buttons(rows[0]!, /Tekrarlayan görev/)[0]!.click();
  assert.deepEqual(e.calls.find((c) => c[0] === "selectTopic"), ["selectTopic", UUID(1)]);
});

test("tasks/dikkat sırası: hata + yeniden dene, boş liste, bozuk yanıt, XSS", () => {
  const e = tasks();
  byKey(e.host, "attn-run")!.click();
  e.AM.state.data["attention:5"] = { status: "error", value: null, reason: "400: budget geçersiz" };
  e.P.rerender();
  const a = alerts(e.host).filter((n) => /400/.test(n.textContent));
  assert.equal(a.length, 1);
  const n0 = e.loads().length;
  buttons(a[0]!, /Yeniden dene/)[0]!.click();
  assert.deepEqual(e.loads().slice(n0)[0], ["loadData", "attention", 5]);
  e.AM.state.data["attention:5"] = okData(ATTN({ items: [], counts: { now: 0, today: 0, batch: 0, critical: 0 }, totalAwaiting: 0, totalGroups: 0 }));
  e.P.rerender();
  assert.match(text(e), /Onay bekleyen görev yok/);
  for (const bad of [null, 5, {}, { items: "x" }, { items: [null, 1, {}, { reasons: 4, tier: EVIL, riskLevel: EVIL, count: "x" }] }]) { e.AM.state.data["attention:5"] = okData(bad); assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad)); }
  e.AM.state.data["attention:5"] = okData(ATTN({ note: EVIL + SECRET, items: [{ taskId: EVIL, count: 2, title: EVIL + SECRET, riskLevel: EVIL, tier: "now", reasons: [EVIL + SECRET] }] }));
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
  assert.ok(!/[\u202A-\u202E\u200B]/.test(text(e)));
});

test("tasks/dikkat sırası: menüden gelinirse (bölüm parametresi) bir kez hesaplanır ve başlığa odaklanır", () => {
  const e = tasks(undefined, "bolum:am-lab-attn:1");
  assert.deepEqual(e.loads().filter((c) => c[1] === "attention"), [["loadData", "attention", 5]]);
  assert.equal(e.doc.activeElement, byId(e.host, "am-lab-attn"));
  e.P.rerender();
  assert.equal(e.loads().filter((c) => c[1] === "attention").length, 1, "yeniden çizim yeniden istemez");
});

// ================================================================ Çekirdek: veri uçları ve hesap eylemleri
test("çekirdek: yeni GET uçları beyaz listede ve parametre doğrulaması istemcide (geçersizde istek yok)", async () => {
  const c = coreEnv();
  await c.flush();
  const b0 = c.calls.length;
  const A = c.win.AM.actions;
  await A.loadData("contradictionResolutions"); await A.loadData("halflife"); await A.loadData("learning");
  await A.loadData("attention"); await A.loadData("attention", 12); await A.loadData("attention", "50");
  await A.loadData("argument", UUID(5));
  await A.loadData("analysisGraph"); await A.loadData("analysisContinuity"); await A.loadData("analysisOffline"); await A.loadData("analysisExpertise"); await A.loadData("analysisShadow"); await A.loadData("analysisAbsence");
  await A.loadData("analysisImpact", "src/server/app.ts|3"); await A.loadData("analysisExit", "claude-code"); await A.loadData("analysisBroker", "execute|review"); await A.loadData("analysisBroker", "getStatus|");
  assert.deepEqual(c.calls.slice(b0).map((x) => x[1]), [
    "/api/memory/contradictions/resolutions", "/api/memory/halflife", "/api/reasoning/learning", "/api/attention", "/api/attention?budget=12", "/api/attention?budget=50",
    "/api/decisions/" + UUID(5) + "/argument", "/api/analysis/graph", "/api/analysis/continuity", "/api/analysis/offline", "/api/analysis/expertise", "/api/analysis/shadow-price", "/api/analysis/absence",
    "/api/analysis/impact?file=src%2Fserver%2Fapp.ts&depth=3", "/api/analysis/exit?provider=claude-code", "/api/analysis/broker?capability=execute&role=review", "/api/analysis/broker?capability=getStatus"
  ]);
  assert.ok(c.calls.slice(b0).every((x) => x[0] === "GET"));
  const b1 = c.calls.length;
  for (const p of [0, "0", 51, "51", "x", "1.5", -1, "1e1", " 5"]) await A.loadData("attention", p);
  for (const p of ["bad", "../x", "x/y", "00000000-0000-4000-8000-00000000000g", "00000000-0000-4000-8000-0000000000012", undefined as any]) await A.loadData("argument", p);
  for (const p of ["", "|3", "src/a.ts", "src/a.ts|0", "src/a.ts|7", "src/a.ts|x", "src/../a.ts|3", "/etc/passwd|3", "src\\a.ts|3", "src/a:b.ts|3", "src/a b.ts|3", "x".repeat(201) + "|3", "src/a.ts|3|4", "src/a.ts?x=1|3", "src/a.ts&x|3"]) await A.loadData("analysisImpact", p);
  for (const p of ["", "a b", "../x", "x".repeat(61), "a/b", "a?x=1", "a&b", "a\\b", 5 as any]) await A.loadData("analysisExit", p);
  for (const p of ["", "execute", "execute|admin", "evil|plan", "execute|plan|x", "execute|", "execute&x=1|plan", "Execute|plan"].filter((x) => x !== "execute|")) await A.loadData("analysisBroker", p);
  assert.equal(c.calls.length, b1, "hiçbir geçersiz parametre istek göndermedi");
});

test("çekirdek: parametreli anahtarlar en yeni 12 ile sınırlı; argüman metni satır sonlarını korur; eksiklik yanıtı derin veriyi korur", async () => {
  const md = "# Başlık\n\nSatır iki\r\n- madde \u202E";
  const c = coreEnv((p) => p.includes("/argument") ? { status: 200, body: { argument: { decisionId: UUID(1), claim: "c", markdown: md, risks: [] } } } : p.includes("/analysis/absence") ? { status: 200, body: { absence: { unused: { capabilities: { items: [{ operation: "x", declaredBy: ["codex", "claude"] }], total: 1 } }, missing: { plannedBySlice: [{ slice: "M1", count: 1, items: [{ n: 1, title: "derin başlık" }] }] } } } } : undefined);
  await c.flush();
  const A = c.win.AM.actions;
  for (let i = 1; i <= 15; i++) await A.loadData("argument", UUID(i));
  await c.flush();
  const keys = Object.keys(c.win.AM.state.data).filter((k) => k.startsWith("argument:"));
  assert.equal(keys.length, 12);
  assert.ok(!keys.includes("argument:" + UUID(1)) && keys.includes("argument:" + UUID(15)));
  assert.equal(c.data("argument:" + UUID(15)).value.argument.markdown, "# Başlık\n\nSatır iki\n- madde  ", "satır sonu korunur, bidi karakter boşluğa çevrilir");
  await A.loadData("analysisAbsence");
  await c.flush();
  const ab = c.data("analysisAbsence").value.absence;
  assert.deepEqual(J(ab.unused.capabilities.items[0].declaredBy), ["codex", "claude"], "derin dizi korunur");
  assert.equal(ab.missing.plannedBySlice[0].items[0].title, "derin başlık");
});

const HYP_OK = { hypotheses: [{ id: "h1", name: "Birinci", prior: "0,6" }, { id: "h2", name: "İkinci", prior: "0,4" }], evidence: [{ id: "e1", text: "Kanıt", likelihoods: { h1: "0,9", h2: "0,1" } }], mode: "bayes" };
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

test("çekirdek hipotez: geçerli girdi doğru gövdeyi gönderir (onay penceresi yok), sonuç hypothesesResult içinde", async () => {
  const c = coreEnv((p) => p === "/api/reasoning/hypotheses" ? { status: 200, body: { analysis: { posteriors: [{ id: "h1", name: "Birinci", posterior: 0.9 }] } } } : undefined);
  await c.flush();
  const b0 = c.calls.length;
  const out = await c.win.AM.actions.hypothesesRun(HYP_OK);
  assert.equal(out.ok, true);
  const posts = c.calls.slice(b0).filter((x) => x[0] === "POST");
  assert.equal(posts.length, 1);
  assert.equal(posts[0]![1], "/api/reasoning/hypotheses");
  assert.deepEqual(JSON.parse(posts[0]![2] as string), { hypotheses: [{ id: "h1", name: "Birinci", prior: 0.6 }, { id: "h2", name: "İkinci", prior: 0.4 }], evidence: [{ id: "e1", text: "Kanıt", likelihoods: { h1: 0.9, h2: 0.1 } }], mode: "bayes" });
  assert.equal(c.data("hypothesesResult").status, "ok");
  assert.equal(c.data("hypothesesResult").value.analysis.posteriors[0].posterior, 0.9);
  // öncül yok + boş olabilirlik atlanır + ACH
  const f = clone(HYP_OK) as any;
  f.hypotheses.forEach((h: any) => { delete h.prior; }); f.evidence[0].likelihoods.h2 = ""; f.mode = "ach";
  await c.win.AM.actions.hypothesesRun(f);
  assert.deepEqual(JSON.parse(c.posts()[1]![2] as string), { hypotheses: [{ id: "h1", name: "Birinci" }, { id: "h2", name: "İkinci" }], evidence: [{ id: "e1", text: "Kanıt", likelihoods: { h1: 0.9 } }], mode: "ach" });
});

test("çekirdek hipotez: geçersiz girdi (toplam≠1, aralık dışı, tekrar kimlik, biçim) POST göndermez ve Türkçe hata yazar", async () => {
  const c = coreEnv();
  await c.flush();
  const b0 = c.calls.length;
  const mut = (fn: (f: any) => void) => { const f = clone(HYP_OK) as any; fn(f); return f; };
  const cases: Array<[any, RegExp]> = [
    [mut((f) => { f.hypotheses[0].prior = "0,5"; f.hypotheses[1].prior = "0,4"; }), /Öncüllerin toplamı 1 olmalı \(şu an 0,9\)/],
    [mut((f) => { f.hypotheses[0].prior = "1,2"; f.hypotheses[1].prior = "-0,2"; }), /0 ile 1 arasında/],
    [mut((f) => { f.hypotheses[1].prior = ""; }), /ya hiç girilmemeli ya da bütün hipotezler/],
    [mut((f) => { f.hypotheses[1].id = "h1"; }), /Kimlik tekrarlandı: h1/],
    [mut((f) => { f.evidence.push({ id: "e1", text: "x", likelihoods: {} }); }), /Kimlik tekrarlandı: e1/],
    [mut((f) => { f.hypotheses[0].id = "a b"; }), /kimlik harf, rakam, alt çizgi ve tire/],
    [mut((f) => { f.hypotheses[0].id = "__proto__"; }), /kimlik harf/],
    [mut((f) => { f.hypotheses[0].id = "x".repeat(31); }), /kimlik harf/],
    [mut((f) => { f.hypotheses.pop(); }), /Rakip hipotez sayısı 2 ile 10/],
    [mut((f) => { for (let i = 0; i < 9; i++) f.hypotheses.push({ id: "z" + i, name: "n" }); }), /Rakip hipotez sayısı 2 ile 10/],
    [mut((f) => { f.evidence = []; }), /Kanıt sayısı 1 ile 30/],
    [mut((f) => { f.evidence = Array.from({ length: 31 }, (_x, i) => ({ id: "e" + i, text: "k", likelihoods: {} })); }), /Kanıt sayısı 1 ile 30/],
    [mut((f) => { f.hypotheses[0].name = "   "; }), /en az 1, en çok 100/],
    [mut((f) => { f.hypotheses[0].name = "x".repeat(101); }), /en az 1, en çok 100/],
    [mut((f) => { f.evidence[0].text = ""; }), /en az 1, en çok 300/],
    [mut((f) => { f.evidence[0].likelihoods.h1 = "2"; }), /0 ile 1 arasında/],
    [mut((f) => { f.evidence[0].likelihoods.h1 = "abc"; }), /0 ile 1 arasında/],
    [mut((f) => { f.evidence[0].likelihoods.h1 = "1e-1"; }), /0 ile 1 arasında/],
    [mut((f) => { f.mode = "mix"; }), /Yöntem/],
    [mut((f) => { f.hypotheses[0].prior = "NaN"; }), /0 ile 1 arasında/],
  ];
  for (const [f, re] of cases) {
    const out = await c.win.AM.actions.hypothesesRun(f);
    assert.equal(out.ok, false);
    assert.equal(out.invalid, true);
    assert.equal(c.data("hypothesesResult").status, "error");
    assert.match(c.data("hypothesesResult").reason, re);
  }
  for (const bad of [null, undefined, 5, "x", [], {}]) { const out = await c.win.AM.actions.hypothesesRun(bad); assert.equal(out.ok, false); }
  assert.equal(c.calls.length, b0, "hiçbir geçersiz girdi istek göndermedi");
});

test("çekirdek hipotez: sunucu reddi ve ağ hatası Türkçe; çift gönderim engellenir; bozuk yanıt hata olur", async () => {
  let release: (() => void) | null = null;
  const gate = new Promise<void>((r) => { release = r; });
  let mode = "slow";
  const c = coreEnv((p) => {
    if (p !== "/api/reasoning/hypotheses") return undefined;
    if (mode === "reject") return { status: 400, body: { error: "öncüllerin toplamı 1 olmalı" } };
    if (mode === "shape") return { status: 200, body: { baska: 1 } };
    return undefined;
  });
  await c.flush();
  mode = "reject";
  const out = await c.win.AM.actions.hypothesesRun(HYP_OK);
  assert.equal(out.ok, false);
  assert.match(c.data("hypothesesResult").reason, /Sunucu hesabı kabul etmedi \(kod 400\)\. öncüllerin toplamı 1 olmalı/);
  mode = "shape";
  await c.win.AM.actions.hypothesesRun(HYP_OK);
  assert.match(c.data("hypothesesResult").reason, /yanıtı okunamadı/);
  // çift gönderim: ilk çağrı sürerken ikincisi istek göndermez
  mode = "slow";
  const origFetch = (c.win as any);
  void origFetch; void gate; void release;
  const p1 = c.win.AM.actions.hypothesesRun(HYP_OK);
  const before = c.posts().length;
  const p2 = c.win.AM.actions.hypothesesRun(HYP_OK);
  assert.equal(c.data("hypothesesResult").status, "loading");
  const r2 = await p2;
  assert.equal(r2.ok, false); assert.equal(r2.busy, true);
  await p1;
  assert.equal(c.posts().length, before, "ikinci çağrı ek istek göndermedi");
});

const VOI_OK = {
  states: [{ id: "s1", p: "0,7" }, { id: "s2", p: "0,3" }],
  options: [{ id: "o1", name: "A", payoffs: { s1: "10", s2: "-5" } }, { id: "o2", name: "B", payoffs: { s1: "2", s2: "2" } }],
  tests: [{ id: "t1", name: "Deneme", cost: "1,5", positive: { s1: "0,8", s2: "0,2" } }]
};
test("çekirdek bilgi değeri: geçerli girdi pozitif/negatif olabilirlik tablosuna çevrilir; testsiz de çalışır", async () => {
  const c = coreEnv((p) => p === "/api/reasoning/voi" ? { status: 200, body: { voi: { optionValues: [], bestOption: { id: "o1" } } } } : undefined);
  await c.flush();
  const out = await c.win.AM.actions.voiRun(VOI_OK);
  assert.equal(out.ok, true);
  const body = JSON.parse(c.posts()[0]![2] as string);
  assert.deepEqual(body.states, [{ id: "s1", p: 0.7 }, { id: "s2", p: 0.3 }]);
  assert.deepEqual(body.options[0], { id: "o1", name: "A", payoffs: { s1: 10, s2: -5 } });
  assert.deepEqual(body.tests, [{ id: "t1", name: "Deneme", cost: 1.5, likelihoods: { s1: { positive: 0.8, negative: 0.2 }, s2: { positive: 0.2, negative: 0.8 } } }]);
  assert.equal(c.data("voiResult").status, "ok");
  const f = clone(VOI_OK) as any; f.tests = [];
  await c.win.AM.actions.voiRun(f);
  assert.equal("tests" in JSON.parse(c.posts()[1]![2] as string), false, "test yoksa alan gönderilmez");
  const g = clone(VOI_OK) as any; delete g.tests;
  await c.win.AM.actions.voiRun(g);
  assert.equal(c.posts().length, 3);
});

test("çekirdek bilgi değeri: geçersiz girdi POST göndermez ve Türkçe hata yazar", async () => {
  const c = coreEnv();
  await c.flush();
  const b0 = c.calls.length;
  const mut = (fn: (f: any) => void) => { const f = clone(VOI_OK) as any; fn(f); return f; };
  const cases: Array<[any, RegExp]> = [
    [mut((f) => { f.states[0].p = "0,5"; }), /Durum olasılıklarının toplamı 1 olmalı \(şu an 0,8\)/],
    [mut((f) => { f.states[0].p = "1,5"; f.states[1].p = "-0,5"; }), /0 ile 1 arasında/],
    [mut((f) => { f.states[1].id = "s1"; }), /Kimlik tekrarlandı: s1/],
    [mut((f) => { f.options[1].id = "o1"; }), /Kimlik tekrarlandı: o1/],
    [mut((f) => { f.tests.push({ ...f.tests[0] }); }), /Kimlik tekrarlandı: t1/],
    [mut((f) => { f.states[0].id = "a b"; }), /kimlik harf/],
    [mut((f) => { f.states.pop(); }), /Durum sayısı 2 ile 10/],
    [mut((f) => { f.options.pop(); }), /Seçenek sayısı 2 ile 10/],
    [mut((f) => { f.tests = Array.from({ length: 6 }, (_x, i) => ({ ...f.tests[0], id: "t" + (i + 1) })); }), /Test sayısı en çok 5/],
    [mut((f) => { f.options[0].payoffs.s1 = "abc"; }), /-1000000000000 ile 1000000000000/],
    [mut((f) => { f.options[0].payoffs.s1 = "1000000000001"; }), /-1000000000000 ile 1000000000000/],
    [mut((f) => { delete f.options[0].payoffs.s2; }), /Kazanç/],
    [mut((f) => { f.options[0].name = ""; }), /en az 1, en çok 100/],
    [mut((f) => { f.tests[0].cost = "-1"; }), /maliyet 0 ile/],
    [mut((f) => { f.tests[0].cost = ""; }), /maliyet 0 ile/],
    [mut((f) => { f.tests[0].positive.s1 = "1,1"; }), /0 ile 1 arasında/],
    [mut((f) => { delete f.tests[0].positive.s2; }), /Pozitif sonuç olasılığı/],
    [mut((f) => { f.tests[0].name = ""; }), /en az 1, en çok 100/],
  ];
  for (const [f, re] of cases) {
    const out = await c.win.AM.actions.voiRun(f);
    assert.equal(out.ok, false); assert.equal(out.invalid, true);
    assert.match(c.data("voiResult").reason, re);
  }
  for (const bad of [null, undefined, 3, "x", [], {}]) { assert.equal((await c.win.AM.actions.voiRun(bad)).ok, false); }
  assert.equal(c.calls.length, b0, "hiçbir geçersiz girdi istek göndermedi");
});

// ================================================================ Kaynak güvenliği
test("kaynak: yeni kod innerHTML/localStorage/fetch/inline stil kullanmaz; bidi/görünmez karakter kaçışlı; sınıflar yalnız var(--am-*) ile biçimlenir", () => {
  const banned = [/innerHTML/, /outerHTML/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new Function/, /srcdoc/, /postMessage/, /document\.cookie/, /localStorage/, /sessionStorage/, /\bfetch\s*\(/, /XMLHttpRequest/, /setTimeout\s*\(\s*["']/, /<style/i, /<script/i];
  for (const f of ["capabilities.js", "page-research.js", "page-integrations.js", "page-tasks.js"]) {
    const src = read(f);
    for (const b of banned) assert.ok(!b.test(src), f + ": " + String(b));
    assert.ok(!/[\u202A-\u202E\u2066-\u2069\u200B-\u200F\uFEFF]/.test(src), f + ": bidi/görünmez karakter");
    assert.ok(!/\.style\b|setAttribute\(\s*["']style/.test(src), f + ": satır içi stil");
  }
  assert.ok(!/[\u202A-\u202E\u2066-\u2069\u200B-\u200F\uFEFF]/.test(read("core.js")));
  const css = read("page-more.css") + read("pages.css");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css) && !/\brgba?\s*\(/i.test(css) && !/url\s*\(/i.test(css));
  const used = new Set<string>();
  for (const f of ["page-research.js", "page-integrations.js"]) for (const m of read(f).matchAll(/["' ]((?:am-more-[a-z0-9-]+)(?: am-more-[a-z0-9-]+)*)/g)) for (const k of (m[1] as string).split(" ")) used.add(k);
  const exempt = (k: string) => /^am-more-(int|mm|sk|rs|vf)-/.test(k) || /row$/.test(k) || /body$/.test(k) || /-t$/.test(k) || /--$/.test(k);
  assert.deepEqual([...used].filter((k) => !exempt(k) && !css.includes("." + k)).sort(), []);
  const labClasses = ["am-more-lab", "am-more-labs", "am-more-labhost", "am-more-labhead", "am-more-labtitle", "am-more-labbody", "am-more-labgroup", "am-more-labrow", "am-more-actions", "am-more-result", "am-more-h5", "am-more-bar", "am-more-bar-box", "am-more-arg"];
  for (const k of labClasses) assert.ok(read("page-more.css").includes("." + k), k);
});

test("metinler: laboratuvar bölümlerinin tüm durumlarında eksik anahtar (⟦…⟧) kalmaz ve simgeler tanımlıdır", () => {
  const e = research((x) => {
    x.AM.state.data.genealogy = okData(FOREST_DATA);
    x.AM.state.data.hypothesesResult = okData(HYP_RESULT()); x.AM.state.data.voiResult = okData(VOI_RESULT());
    x.AM.state.data.contradictionResolutions = okData(RESOLUTIONS()); x.AM.state.data.halflife = okData({ minSample: 5, byKind: [HALF_G()], byKindAndScope: [HALF_G({ scope: "p" })] });
    x.AM.state.data.learning = okData({ minResolved: 6, overall: LEARN_E(), sources: [LEARN_E({ source: "s" })] });
    x.AM.state.data["argument:" + UUID(1)] = okData(ARG());
  });
  for (const id of ["am-lab-hyp", "am-lab-voi", "am-lab-res", "am-lab-half", "am-lab-learn"]) open(e, id);
  buttons(byClass(e.host, "am-more-tree")[0]!, /^Argüman$/)[0]!.click();
  e.AM.state.data["argument:" + UUID(1)] = okData(ARG());
  e.P.rerender();
  assert.doesNotMatch(text(e), /⟦/);
  const fallback = e.win.AM_ICON("__yok__", { size: 12 }) as FNode;
  const sig = (n: FNode) => JSON.stringify(n.children.map((x) => x.tag)) + n.children.map((x) => JSON.stringify(x.attrs)).join("");
  for (const svg of walk(e.host).filter((n) => n.tag === "svg")) assert.ok(svg, "simge");
  for (const nm of ["alert", "check", "info", "shield"]) assert.notEqual(sig(e.win.AM_ICON(nm, { size: 12 }) as FNode), sig(fallback), nm);
  const i = integ((x) => {
    x.AM.state.providers = [{ id: "codex", displayName: "Codex" }];
    x.AM.state.data.analysisContinuity = okData(CONT); x.AM.state.data.analysisOffline = okData(OFFLINE()); x.AM.state.data["analysisExit:codex"] = okData(EXIT());
    x.AM.state.data.analysisGraph = okData({ graph: {} });
  });
  for (const id of LAB_IDS_I) openI(i, id);
  i.P.rerender();
  byKey(i.host, "exit-run")!.click();
  i.AM.state.data["analysisExit:codex"] = okData(EXIT());
  i.AM.state.data["analysisBroker:execute|"] = okData(BROKER());
  byKey(i.host, "broker-run")!.click();
  i.AM.state.data["analysisBroker:execute|"] = okData(BROKER());
  i.P.rerender();
  assert.doesNotMatch(text(i), /⟦/);
  const t = tasks((x) => { x.AM.state.data["attention:5"] = okData(ATTN()); });
  byKey(t.host, "attn-run")!.click();
  t.AM.state.data["attention:5"] = okData(ATTN());
  t.P.rerender();
  assert.doesNotMatch(text(t), /⟦/);
  nonEmpty(text(t));
  void FDoc; void byTag;
});

test("odak: bölüm aç/kapat ve satır ekle sonrası odak aynı anahtarlı (yeni) öğeye geri verilir (Araştırma ve Entegrasyonlar)", () => {
  const e = research();
  const t = toggleOf(e, "am-lab-hyp");
  e.doc.activeElement = t;
  t.click();
  const t2 = toggleOf(e, "am-lab-hyp");
  assert.notEqual(t2, t, "düğme yeniden kuruldu");
  assert.equal(e.doc.activeElement, t2, "odak yeni düğmede");
  assert.equal(t2.attrs["aria-expanded"], "true");
  const add = byKey(e.host, "hyp-add")!;
  e.doc.activeElement = add;
  add.click();
  assert.equal(e.doc.activeElement, byKey(e.host, "hyp-add"));
  assert.ok(byKey(e.host, "hyp-name-2"));
  const i = integ();
  const it = toggleOf(i, "am-lab-broker");
  i.doc.activeElement = it;
  it.click();
  assert.equal(i.doc.activeElement, toggleOf(i, "am-lab-broker"));
  assert.equal(toggleOf(i, "am-lab-broker").attrs["aria-expanded"], "true");
});

// ================================================================ Bağlam değiştirme (71)
const SW_LIMITS = "kullanıcının sohbet/pencere geçişleri kaydedilmez; yalnız denetim kayıtlarına düşen görev/iş akışı etkinlikleri ölçülür; bu nedenle KISMİ bir göstergedir";
const SW = (over: Record<string, unknown> = {}, reload: Record<string, unknown> = {}) => ({ switching: {
  generatedAt: "2026-10-23T10:00:00.000Z", days: 7, timezone: "UTC", status: "yeterli",
  sample: { events: 42, withoutContext: 3, contexts: 5, rowsScanned: 45, rowLimit: 5000, truncated: false, minEvents: 20 },
  switches: { total: 12, perDay: [{ date: "2026-10-22", events: 20, switches: 8 }, { date: "2026-10-23", events: 22, switches: 4 }], topHours: [{ hourUtc: 9, switches: 5 }, { hourUtc: 14, switches: 3 }] },
  sessions: { gapMinutes: 30, count: 7, measured: 4, avgDurationMs: 900000 },
  reload: { estimatedTokens: 12000, label: "x", coveredSwitches: 8, uncoveredSwitches: 4, basis: "geçilen bağlamın son 5 koşusunun ortalaması", ...reload },
  limits: SW_LIMITS, note: "Yalnız ölçüm, öneri yok.", ...over,
} });
test("bağlam değiştirme: bölüm kimlikli ve kapalı; açılınca 7 günlük ölçüm istenir; gün seçici yeniden ister (1..30)", () => {
  const e = integ();
  assert.ok(byId(e.host, "am-lab-switching"));
  assert.equal(toggleOf(e, "am-lab-switching").attrs["aria-expanded"], "false");
  assert.equal(e.loads().filter((c) => c[1] === "analysisSwitching").length, 0);
  assert.match(text(e), /Bağlam değiştirme/);
  openI(e, "am-lab-switching"); e.P.rerender();
  assert.deepEqual(e.loads().filter((c) => c[1] === "analysisSwitching").map((c) => c[2]), ["7"]);
  const sel = byKey(e.host, "sw-days")!;
  assert.deepEqual(byTag(sel, "option").map((o) => o.textContent), ["1", "2", "3", "5", "7", "14", "21", "30"]);
  typeInto(sel, "14");
  byKey(e.host, "sw-run")!.click();
  assert.deepEqual(e.loads().filter((c) => c[1] === "analysisSwitching").map((c) => c[2]), ["7", "14"]);
  const e2 = integ(undefined, "bolum:am-lab-switching:1");
  assert.equal(toggleOf(e2, "am-lab-switching").attrs["aria-expanded"], "true", "menüden gelinen bölüm açılır");
});

test("bağlam değiştirme: gün başına geçiş (çubuk), en yoğun saatler, ortalama oturum, tahmini yeniden yükleme, örnek boyutu ve KISMİ sınır notu görünür", () => {
  const e = integ((x) => { x.AM.state.data["analysisSwitching:7"] = okData(SW()); }, "bolum:am-lab-switching:1");
  const t = text(e);
  for (const m of ["Yeterli veri", "2026-10-22", "2026-10-23", "En yoğun saatler (UTC)", "09:00", "14:00", "15 dk", "Ortalama bağlam oturumu", "Tahmini yeniden yükleme token'ı", "en az 12.000", "8 / 4", "42", "KISMİ bir göstergedir", "Sınırlar:"]) assert.ok(t.includes(m), m);
  assert.equal(walk(e.host).filter((n) => n.tag === "progress").length, 2, "gün başına çubuk");
});

test("bağlam değiştirme: tam kapsamda kesin sayı; bilinmiyorsa AYNEN 'bilinmiyor'; yetersiz veri dürüst (ortalama ve tahmin yazılmaz)", () => {
  const full = integ((x) => { x.AM.state.data["analysisSwitching:7"] = okData(SW({}, { uncoveredSwitches: 0, coveredSwitches: 12 })); }, "bolum:am-lab-switching:1");
  assert.ok(text(full).includes("12.000") && !text(full).includes("en az 12.000"));
  const unk = integ((x) => { x.AM.state.data["analysisSwitching:7"] = okData(SW({}, { estimatedTokens: null, coveredSwitches: 0, uncoveredSwitches: 12 })); }, "bolum:am-lab-switching:1");
  const items = walk(unk.host).filter((n) => /am-more-kv-i/.test(n.className)).map((n) => n.textContent);
  assert.ok(items.some((x) => x === "Tahmini yeniden yükleme token'ıbilinmiyor"), "AYNEN bilinmiyor: " + items.join("|"));
  const low = integ((x) => { x.AM.state.data["analysisSwitching:7"] = okData(SW({ status: "yetersiz veri", sample: { events: 5, withoutContext: 0, contexts: 2, rowsScanned: 5, rowLimit: 5000, truncated: false, minEvents: 20 }, sessions: { gapMinutes: 30, count: 2, measured: 0, avgDurationMs: null } }, { estimatedTokens: null })); }, "bolum:am-lab-switching:1");
  const lt = text(low);
  assert.ok(lt.includes("Yetersiz veri") && lt.includes("Olay sayısı 5, en az 20 gerekir: ortalama ve tahmin verilmez."));
  assert.ok(lt.includes("KISMİ bir göstergedir"), "yetersiz veride de sınır notu");
  assert.ok(!/\d+ dk/.test(lt.replace(/Her \d+/g, "")), "ortalama süre yazılmaz");
  assert.ok(!lt.includes("bilinmiyor"));
});

test("bağlam değiştirme: yükleniyor / hata / bozuk yanıt dürüst; XSS yükü ve sır etkisiz", () => {
  const load = integ((x) => { x.AM.state.data["analysisSwitching:7"] = { status: "loading", value: null }; }, "bolum:am-lab-switching:1");
  assert.ok(byClass(load.host, "am-more-card--loading").length >= 1);
  const err = integ((x) => { x.AM.state.data["analysisSwitching:7"] = { status: "error", value: null, reason: "500: hata sk-abcdefghijklmnopqrstuvwx" }; }, "bolum:am-lab-switching:1");
  assert.ok(text(err).includes("Bağlam değiştirme ölçümü alınamadı") && text(err).includes("500: hata") && !text(err).includes("sk-abcdefghijklmnopqrstuvwx"));
  assert.ok(alerts(err.host).length >= 1);
  for (const bad of [{}, { switching: "x" }, { switching: null }]) {
    const e = integ((x) => { x.AM.state.data["analysisSwitching:7"] = okData(bad); }, "bolum:am-lab-switching:1");
    assert.ok(text(e).includes("Bağlam değiştirme ölçümü alınamadı"));
  }
  const ev = integ((x) => { x.AM.state.data["analysisSwitching:7"] = okData(SW({ limits: EVIL, note: EVIL, switches: { total: "x", perDay: [{ date: EVIL, events: "a", switches: -1 }, null, 5], topHours: [{ hourUtc: "z", switches: null }, null] }, sessions: null, sample: null })); }, "bolum:am-lab-switching:1");
  noActiveContent(ev.host);
  assert.ok(text(ev).includes("<img src=x onerror=alert(1)>"));
  assert.doesNotMatch(text(ev), /⟦/);
});

test("çekirdek: analysisSwitching ucu beyaz listede; gün sayısı 1..30 doğrulanır (geçersizde istek yok)", async () => {
  const c = coreEnv();
  await c.flush();
  const n0 = c.calls.length;
  await c.win.AM.actions.loadData("analysisSwitching", "7");
  await c.win.AM.actions.loadData("analysisSwitching", 30);
  assert.deepEqual(c.calls.slice(n0).map((x) => x[1]), ["/api/analysis/switching?days=7", "/api/analysis/switching?days=30"]);
  const n1 = c.calls.length;
  for (const bad of ["0", "31", "abc", "7.5", "07", "-1", "", undefined, "7&x=1", "1e1"]) await c.win.AM.actions.loadData("analysisSwitching", bad);
  assert.equal(c.calls.length, n1);
});

test("iç yetenek aracısı: kota notu ve adayın kota gerekçesi görünür (yalnız öneri); sunucu metni düz metindir", () => {
  const e = integ();
  openI(e, "am-lab-broker"); e.P.rerender();
  typeInto(byKey(e.host, "broker-cap")!, "execute");
  byKey(e.host, "broker-run")!.click();
  const low = { rank: 2, provider: "codex", displayName: "Codex", routeKind: "subscription", capabilityStatus: "verified", health: "iyi", roleObservation: null, quota: { remainingPct: 12, reported: true, low: true }, reasons: ["kalan kota az (%12): yedek sağlayıcı/alt model önerilir"] };
  const unknown = { rank: 1, provider: "claude-code", displayName: "Claude Code", routeKind: "subscription", capabilityStatus: "partial", health: "bilinmiyor", roleObservation: null, quota: { remainingPct: null, reported: false, low: false }, reasons: ["kota bilinmiyor (sağlayıcı bildirmedi)"] };
  e.AM.state.data["analysisBroker:execute|"] = okData(BROKER({ role: null, candidates: [unknown, low], quotaNote: "Kota: 1 adayda bildirilmiş kalan kota %15 altında; 1 adayda kota bilinmiyor (sıralama değişmedi)." }));
  e.P.rerender();
  for (const re of [/kalan kota az \(%12\): yedek sağlayıcı\/alt model önerilir/, /kota bilinmiyor \(sağlayıcı bildirmedi\)/, /Kota: 1 adayda bildirilmiş kalan kota %15 altında/]) assert.match(text(e), re);
  e.AM.state.data["analysisBroker:execute|"] = okData(BROKER({ quotaNote: EVIL + SECRET }));
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
  e.AM.state.data["analysisBroker:execute|"] = okData(BROKER({ quotaNote: 5 }));
  assert.doesNotThrow(() => e.P.rerender());
});
