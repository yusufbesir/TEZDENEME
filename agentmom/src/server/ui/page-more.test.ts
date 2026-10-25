// D3 sayfaları testleri: Entegrasyonlar, Beceriler, Araştırma, Hafıza, Beyin Verify (page-*.js + page-more.css).
// Sahip: Sonnet [İP:AgentMom Faz 11, D3]. yazan: [Claude#agentmom-d3-sayfalar-more]
// Kaynaklar node:vm ile sahte window/document + sahte AM_PAGES içinde yüklenir; ağ yok, tarayıcı yok, model çağrısı yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (f: string): string => readFileSync(join(dir, f), "utf8");
const FILES = {
  strings: "strings.js", icons: "icons.js",
  integrations: "page-integrations.js", skills: "page-skills.js", research: "page-research.js", memory: "page-memory.js", verify: "page-verify.js"
} as const;
type Key = keyof typeof FILES;
const SRC = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, read(f)])) as Record<Key, string>;
const CSS = read("page-more.css");
const CAPS = JSON.parse(readFileSync(join(dir, "..", "..", "..", "docs", "status", "100-yetenek-durum.json"), "utf8"));

// ---------- Sahte DOM ----------
type Fn = (e: any) => void;
class FNode {
  nodeType = 1;
  nodeName: string;
  children: FNode[] = [];
  parentNode: FNode | null = null;
  attrs: Record<string, string> = {};
  className = "";
  own = "";
  listeners: Record<string, Fn[]> = {};
  value = "";
  type = "";
  disabled = false;
  doc: FDoc;
  constructor(tag: string, doc: FDoc) { this.nodeName = tag.toUpperCase(); this.doc = doc; }
  get tag(): string { return this.nodeName.toLowerCase(); }
  get nodeValue(): string { return this.own; }
  get firstChild(): FNode | null { return this.children[0] ?? null; }
  get textContent(): string { return this.own + this.children.map((c) => c.textContent).join(""); }
  set textContent(v: unknown) { this.own = String(v); this.children = []; }
  appendChild(c: FNode) {
    if (c.nodeName === "#FRAG") { for (const k of [...c.children]) this.appendChild(k); c.children = []; return c; }
    if (c.parentNode) c.parentNode.removeChild(c);
    c.parentNode = this; this.children.push(c); return c;
  }
  removeChild(c: FNode) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; }
  setAttribute(k: string, v: unknown) { this.attrs[k] = String(v); }
  getAttribute(k: string) { return Object.hasOwn(this.attrs, k) ? (this.attrs[k] as string) : null; }
  addEventListener(t: string, fn: Fn) { (this.listeners[t] ||= []).push(fn); }
  focus() { this.doc.activeElement = this; }
}
class FDoc {
  activeElement: FNode | null = null;
  createElement(tag: string) { return new FNode(tag, this); }
  createElementNS(_ns: string, tag: string) { return new FNode(tag, this); }
  createDocumentFragment() { return new FNode("#frag", this); }
  createTextNode(t: string) { const n = new FNode("#text", this); n.nodeType = 3; n.own = t; return n; }
}

interface Timer { id: number; fn: () => void; ms: number }
interface Ctx { win: any; doc: FDoc; root: FNode; pages: Record<string, any>; timers: Timer[]; iconNames: string[]; calls: Array<[string, unknown[]]>; AM: any }

function load(files: Key[], opts: { frame?: boolean } = {}): Ctx {
  const doc = new FDoc();
  const timers: Timer[] = [];
  let tid = 0;
  const pages: Record<string, any> = {};
  const sandbox: any = {
    document: doc,
    setTimeout: (fn: () => void, ms: number) => { const id = ++tid; timers.push({ id, fn, ms }); return id; },
    clearTimeout: (id: number) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); }
  };
  sandbox.window = sandbox;
  if (opts.frame !== false) sandbox.AM_PAGES = { register(id: string, def: any) { pages[id] = def; } };
  vm.createContext(sandbox);
  const iconNames: string[] = [];
  for (const f of files) {
    vm.runInContext(SRC[f], sandbox, { filename: f + ".js" });
    if (f === "icons") {
      const real = sandbox.AM_ICON;
      sandbox.AM_ICON = (name: string, o: unknown) => { iconNames.push(name); return real(name, o); };
    }
  }
  const root = doc.createElement("div");
  const calls: Array<[string, unknown[]]> = [];
  const AM: any = {
    state: { skills: [], data: {} },
    view: {},
    actions: {
      loadData(...a: unknown[]) { calls.push(["loadData", a]); },
      copyText(t: string) { calls.push(["copyText", [t]]); return Promise.resolve(true); }
    }
  };
  return { win: sandbox, doc, root, pages, timers, iconNames, calls, AM };
}

const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
function all(root: FNode, pred: (n: FNode) => boolean): FNode[] {
  const out: FNode[] = [];
  const walk = (n: FNode) => { for (const c of n.children) { if (pred(c)) out.push(c); walk(c); } };
  walk(root);
  return out;
}
const hasClass = (n: FNode, c: string) => n.className.split(/\s+/).includes(c);
const byClass = (root: FNode, c: string) => all(root, (n) => hasClass(n, c));
const byTag = (root: FNode, t: string) => all(root, (n) => n.tag === t);
function fire(n: FNode, type: string, extra: Record<string, unknown> = {}) {
  const ev: any = { target: n, preventDefault() {}, stopPropagation() {}, ...extra };
  for (const f of n.listeners[type] ?? []) f(ev);
}
const click = (n: FNode) => fire(n, "click");
const BAD_TAGS = ["script", "iframe", "img", "a", "object", "embed", "style"];
function noActiveContent(root: FNode) {
  assert.deepEqual(all(root, (n) => BAD_TAGS.includes(n.tag)).map((n) => n.tag), []);
  assert.equal(all(root, (n) => Object.keys(n.attrs).some((k) => /^on/i.test(k) || k === "style" || k === "srcdoc" || k === "href")).length, 0);
}
function mount(key: Key, files: Key[], id: string, mutate?: (c: Ctx) => void): Ctx {
  const c = load(files);
  if (mutate) mutate(c);
  return c;
}
const BASE: Key[] = ["strings", "icons"];
function render(c: Ctx, id: string) { c.pages[id].render(c.AM, c.root); }
const okData = (value: unknown) => ({ status: "ok", value });
const alertCards = (root: FNode) => all(root, (n) => n.attrs["role"] === "alert");

// ================================================================ çerçeve ve kayıt
test("çerçeve yoksa her sayfa dosyası görünür hata fırlatır", () => {
  for (const k of ["integrations", "skills", "research", "memory", "verify"] as Key[]) {
    assert.throws(() => load([...BASE, k], { frame: false }), /AM_PAGES/, k);
  }
});

test("strings.js yoksa sayfa dosyası görünür hata fırlatır", () => {
  assert.throws(() => load(["integrations"]), /strings\.js/);
});

test("kayıt: kimlik, Türkçe başlık ve grup", () => {
  const c = load([...BASE, "integrations", "skills", "research", "memory", "verify"]);
  const expect: Record<string, string> = { integrations: "Entegrasyonlar ve Yetenekler", skills: "Beceriler", research: "Araştırma ve Kalibrasyon", memory: "Hafıza ve Bilgi", verify: "Beyin Verify" };
  assert.deepEqual(Object.keys(c.pages).sort(), Object.keys(expect).sort());
  for (const [id, title] of Object.entries(expect)) {
    assert.equal(c.pages[id].title, title);
    assert.equal(c.pages[id].group, "Yönetim");
    assert.equal(typeof c.pages[id].render, "function");
  }
});

test("yükleme sırasında DOM'a dokunulmaz ve metin anahtarları modül adıyla başlar", () => {
  const c = load([...BASE, "integrations", "skills", "research", "memory", "verify"]);
  assert.equal(c.root.children.length, 0);
  assert.equal(c.win.AM_T("page-integrations.title"), "Entegrasyonlar ve Yetenekler");
  assert.equal(c.win.AM_T("page-verify.title"), "Beyin Verify");
});

// ================================================================ integrations: saf mantık
test("integrations.pure: durum rozeti dürüst; Planlı ve Kısmi asla Doğrulandı gibi çizilmez", () => {
  const p = load([...BASE, "integrations"]).win.AM_PAGE_INTEGRATIONS.pure;
  const ok = plain(p.statusInfo("Doğrulandı")), part = plain(p.statusInfo("Kısmi")), plan = plain(p.statusInfo("Planlı")), no = plain(p.statusInfo("Desteklenmiyor"));
  assert.equal(ok.tone, "ok");
  for (const x of [part, plan, no]) { assert.notEqual(x.tone, "ok"); assert.notEqual(x.icon, ok.icon); assert.notEqual(x.labelKey, ok.labelKey); }
  assert.equal(plan.key, "planli");
  assert.equal(p.statusInfo("doğrulandı ").key, "dogrulandi");
});

test("integrations.pure: bilinmeyen durum 'Doğrulandı' sayılmaz", () => {
  const p = load([...BASE, "integrations"]).win.AM_PAGE_INTEGRATIONS.pure;
  for (const v of ["", "Verified", "OK", null, undefined, "doğrulandı!", "Doğrulandı?"]) assert.equal(p.statusKey(v), "bilinmiyor", String(v));
  assert.equal(p.opInfo("verified").tone, "ok");
  assert.notEqual(p.opInfo("unverified").tone, "ok");
  assert.notEqual(p.opInfo("unavailable").tone, "ok");
  assert.notEqual(p.opInfo("partial").tone, "ok");
  assert.equal(p.opInfo("bogus").key, "unknown");
});

test("integrations.pure: gerçek 100 maddelik dosyada sayımlar özetle eşleşir", () => {
  const p = load([...BASE, "integrations"]).win.AM_PAGE_INTEGRATIONS.pure;
  const items = plain(p.normItems(CAPS.items));
  assert.equal(items.length, 100);
  const c = plain(p.countByStatus(items));
  assert.deepEqual([c.dogrulandi, c.kismi, c.planli, c.desteklenmiyor, c.kapsamdisi, c.total], [CAPS.summary.dogrulandi, CAPS.summary.kismi, CAPS.summary.planli, CAPS.summary.desteklenmiyor, CAPS.summary.kapsamdisi, 100]);
  assert.equal(p.summaryMismatch(CAPS.summary, c), false);
  assert.equal(p.summaryMismatch({ ...CAPS.summary, planli: 1 }, c), true);
});

test("integrations.pure: süzgeçler (metin, durum, dilim) ve Türkçe katlama", () => {
  const p = load([...BASE, "integrations"]).win.AM_PAGE_INTEGRATIONS.pure;
  const items = p.normItems(CAPS.items);
  assert.equal(p.filterItems(items, {}).length, 100);
  // Beklentiler gerçek durum dosyasından türetilir (durumlar ilerledikçe test kırılmasın).
  const cnt = (f: (i: any) => boolean) => (CAPS.items as any[]).filter(f).length;
  assert.equal(p.filterItems(items, { status: "planli" }).length, cnt((i) => i.durum === "Planlı"));
  assert.equal(p.filterItems(items, { status: "dogrulandi" }).length, cnt((i) => i.durum === "Doğrulandı"));
  assert.equal(p.filterItems(items, { slice: "D6" }).length, cnt((i) => i.dilim === "D6"));
  assert.equal(p.filterItems(items, { slice: "-" }).length, cnt((i) => i.dilim === "-"));
  assert.equal(p.filterItems(items, { status: "planli", slice: "D6" }).length, CAPS.items.filter((i: any) => i.durum === "Planlı" && i.dilim === "D6").length);
  const a = p.filterItems(items, { query: "TARAYICI otomasyonu" });
  assert.ok(a.length >= 1 && plain(a).some((i: any) => i.n === 18));
  assert.equal(p.filterItems(items, { query: "yokboylebirsey" }).length, 0);
  assert.equal(p.fold("İŞLETİM Çğüö"), "isletim cguo");
});

test("integrations.pure: sıralama kararlı ve yönlüdür", () => {
  const p = load([...BASE, "integrations"]).win.AM_PAGE_INTEGRATIONS.pure;
  const items = p.normItems(CAPS.items);
  assert.equal(plain(p.sortItems(items, "n", "asc"))[0].n, 1);
  assert.equal(plain(p.sortItems(items, "n", "desc"))[0].n, 100);
  const d = plain(p.sortItems(items, "durum", "asc"));
  assert.equal(d[0].durum, "Doğrulandı");
  // Beklenti dosya özetinden türetilir: sonda 'Kapsam dışı' maddeler, onlardan hemen önce son 'Planlı'.
  const out = (CAPS.summary as any).kapsamdisi as number;
  assert.equal(d.length, 100);
  for (let k = 0; k < out; k++) assert.equal(d[99 - k].durum, "Kapsam dışı", "son " + out + " madde");
  assert.equal(d[99 - out].durum, "Planlı");
  // kararlılık: aynı durumlu maddeler giriş sırasını korur
  const kismi = d.filter((i: any) => i.durum === "Kısmi").map((i: any) => i.n);
  assert.deepEqual(kismi, [...kismi].sort((x: number, y: number) => x - y));
  assert.equal(items.length, 100);
});

test("integrations.pure: dilim sayımı ve tamamlanma işareti", () => {
  const p = load([...BASE, "integrations"]).win.AM_PAGE_INTEGRATIONS.pure;
  const st = plain(p.sliceStats(p.normItems(CAPS.items), CAPS.slices)) as any[];
  assert.deepEqual(st.map((s) => s.id), ["D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"]);
  // Beklentiler gerçek durum dosyasından türetilir (madde durumları değiştikçe test kırılmasın); niyet: sayım doğru, tamamlanma işareti dilim metninden gelir.
  const count = (id: string) => (CAPS.items as any[]).filter((i) => i.dilim === id).length;
  for (const id of ["D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"]) assert.equal(st.find((s) => s.id === id).total, count(id), id);
  assert.equal(st.find((s) => s.id === "D4").complete, /TAMAMLANDI/.test((CAPS.slices as any).D4));
  assert.equal(st.find((s) => s.id === "D3").complete, /TAMAMLANDI/.test((CAPS.slices as any).D3));
  const noSlice = (CAPS.items as any[]).filter((i) => !/^D\d+$/.test(i.dilim)).length;
  assert.equal(st.reduce((a, s) => a + s.total, 0) + noSlice, 100);
});

test("integrations.pure: yalnız 20, 31 ve 39 'Yusuf kararı bekliyor'", () => {
  const p = load([...BASE, "integrations"]).win.AM_PAGE_INTEGRATIONS.pure;
  const flagged = plain(p.normItems(CAPS.items)).filter((i: any) => p.needsDecision(i)).map((i: any) => i.n);
  assert.deepEqual(flagged, [20, 31, 39]);
});

test("integrations.pure: kısa yol ve kayıt defteri matrisi", () => {
  const p = load([...BASE, "integrations"]).win.AM_PAGE_INTEGRATIONS.pure;
  assert.equal(p.shortPath("src/server/ui/chat.js"), "ui/chat.js");
  assert.equal(p.shortPath("D:\\a\\b\\c.ts"), "b/c.ts");
  const m = plain(p.registryMatrix(CAPS.registry)) as any;
  assert.equal(m.providers.length, 3);
  assert.equal(m.rows.length, 10);
  assert.equal(m.rows[0].cells.length, 3);
});

// ================================================================ integrations: çizim
function mountInt(value: unknown = CAPS): Ctx {
  const c = load([...BASE, "integrations"]);
  c.AM.state.data.capabilities = okData(value);
  render(c, "integrations");
  return c;
}
const dataRows = (root: FNode) => all(root, (n) => n.tag === "tr" && n.attrs["data-n"] !== undefined);

test("integrations: 100 satırın hepsi çizilir; gerçek table/th scope; açıklama ve not metinleri", () => {
  const c = mountInt();
  assert.equal(dataRows(c.root).length, 100);
  const tables = byTag(c.root, "table");
  assert.equal(tables.length, 2);
  for (const t of tables) {
    assert.ok(byTag(t, "caption").length === 1);
    assert.ok(byTag(t, "th").every((th) => th.attrs["scope"] === "col" || th.attrs["scope"] === "row"));
  }
  assert.equal(byTag(tables[0] as FNode, "th").filter((th) => th.attrs["scope"] === "row").length, 100);
  const text = c.root.textContent;
  assert.match(text, /Kullanılamayan yetenek kullanılabilir gibi gösterilmez/);
  assert.match(text, /OpenCode, Cursor ve Antigravity: kuruldu, adaptör yok/);
  assert.match(text, /100 \/ 100 yetenek gösteriliyor|100 \/ 100/);
  assert.doesNotMatch(text, /⟦/);
});

test("integrations: özet şeridi sayıları dosyadan türetilir; Kapsam dışı ayrı sayılır; toplam 100", () => {
  const c = mountInt();
  const tiles = byClass(c.root, "am-more-tile");
  assert.equal(tiles.length, 6);
  const t = tiles.map((x) => x.textContent);
  assert.match(t[0] as string, /16\s*Doğrulandı|Doğrulandı/);
  const sm = CAPS.summary;
  assert.ok(t[0]!.includes(String(sm.dogrulandi)) && t[1]!.includes(String(sm.kismi)) && t[2]!.includes(String(sm.planli)) && t[3]!.includes(String(sm.desteklenmiyor)) && t[4]!.includes(String(sm.kapsamdisi)) && t[4]!.includes("Kapsam dışı") && t[5]!.includes("100"));
  assert.equal(sm.dogrulandi + sm.kismi + sm.planli + sm.desteklenmiyor + sm.kapsamdisi, 100);
  assert.ok(t[2]!.includes("Planlı"));
});

test("integrations: her satırın durum rozeti doğru; Planlı 'Doğrulandı' gibi çizilmez", () => {
  const c = mountInt();
  const label: Record<string, string> = { "Doğrulandı": "Doğrulandı", "Kısmi": "Kısmi", "Planlı": "Planlı", "Kapsam dışı": "Kapsam dışı" };
  const toneOf: Record<string, string> = { "Doğrulandı": "am-more-chip--ok", "Kısmi": "am-more-chip--warn", "Planlı": "am-more-chip--muted", "Kapsam dışı": "am-more-chip--muted" };
  for (const tr of dataRows(c.root)) {
    const n = Number(tr.attrs["data-n"]);
    const item = CAPS.items.find((i: any) => i.n === n);
    const statusCell = tr.children[3] as FNode;
    const chipEl = byClass(statusCell, "am-more-chip")[0] as FNode;
    assert.ok(chipEl.textContent.includes(label[item.durum] as string), `madde ${n}`);
    assert.ok(hasClass(chipEl, toneOf[item.durum] as string), `madde ${n} ton`);
    if (item.durum !== "Doğrulandı") {
      assert.ok(!chipEl.textContent.includes("Doğrulandı"), `madde ${n} yanlış etiket`);
      assert.ok(!hasClass(chipEl, "am-more-chip--ok"), `madde ${n} yeşil`);
    }
  }
});

test("integrations: çelişkili 20, 31, 39 için 'Yusuf kararı bekliyor' etiketi; başkasında yok", () => {
  const c = mountInt();
  const tagged = dataRows(c.root).filter((tr) => tr.textContent.includes("Yusuf kararı bekliyor")).map((tr) => Number(tr.attrs["data-n"]));
  assert.deepEqual(tagged.sort((a, b) => a - b), [20, 31, 39]);
});

test("integrations: dilim planı kartları 8 dilim; tamamlanan işaretli", () => {
  const c = mountInt();
  const cards = byClass(c.root, "am-more-slice");
  assert.equal(cards.length, 8);
  const done = cards.filter((x) => hasClass(x, "am-more-slice--done"));
  assert.ok(done.length >= 1);
  assert.ok(done.some((x) => x.textContent.includes("D4") && x.textContent.includes("Tamamlandı")));
  const d3 = cards.find((x) => x.textContent.startsWith("D3")) as FNode;
  assert.match(d3.textContent, /\d+ madde/);
  assert.match(d3.textContent, /Sürüyor|Tamamlandı/);
});

test("integrations: sağlayıcı kayıt defteri 3 sağlayıcı x 10 işlem ve dürüst durumlar", () => {
  const c = mountInt();
  const rows = byClass(c.root, "am-more-regrow");
  assert.equal(rows.length, 10);
  assert.equal((rows[0] as FNode).children.length, 4);
  const txt = (rows.find((r) => r.textContent.includes("testConnection")) as FNode).textContent;
  assert.match(txt, /Doğrulanmadı/);
  assert.doesNotMatch(txt, /Doğrulandı/);
  const chips = byClass(c.root, "am-more-regrow").flatMap((r) => byClass(r, "am-more-chip"));
  for (const ch of chips) {
    if (ch.textContent.startsWith("Doğrulanmadı") || ch.textContent.startsWith("Kısmi")) assert.ok(!hasClass(ch, "am-more-chip--ok"));
  }
});

test("integrations: metin araması, durum ve dilim süzgeçleri satırları azaltır", () => {
  const c = mountInt();
  const q = byTag(c.root, "input")[0] as FNode;
  q.value = "komuta merkezi"; fire(q, "input");
  let rows = dataRows(c.root);
  assert.ok(rows.length >= 1 && rows.length < 100);
  assert.ok(rows.some((r) => r.attrs["data-n"] === "1"));
  assert.match(c.root.textContent, new RegExp(`${rows.length} / 100 yetenek`));
  q.value = ""; fire(q, "input");
  assert.equal(dataRows(c.root).length, 100);
  const [stSel, slSel] = byTag(c.root, "select") as [FNode, FNode];
  stSel.value = "planli"; fire(stSel, "change");
  assert.equal(dataRows(c.root).length, CAPS.summary.planli);
  slSel.value = "D6"; fire(slSel, "change");
  assert.equal(dataRows(c.root).length, CAPS.items.filter((i: any) => i.durum === "Planlı" && i.dilim === "D6").length);
  stSel.value = "all"; slSel.value = "all"; fire(stSel, "change"); fire(slSel, "change");
  assert.equal(dataRows(c.root).length, 100);
});

test("integrations: eşleşme yoksa boş durum kartı, süzgeç temizle düğmesi hepsini geri getirir", () => {
  const c = mountInt();
  const q = byTag(c.root, "input")[0] as FNode;
  q.value = "hicbirseyeuymayan"; fire(q, "input");
  assert.equal(dataRows(c.root).length, 0);
  assert.match(c.root.textContent, /Süzgeçlerle eşleşen yetenek yok/);
  const clr = byTag(c.root, "button").find((b) => b.textContent === "Süzgeçleri temizle") as FNode;
  click(clr);
  assert.equal(dataRows(c.root).length, 100);
});

test("integrations: sütun başlığına tıklayınca sıralama; aria-sort güncellenir", () => {
  const c = mountInt();
  const nHead = byTag(c.root, "th").find((th) => hasClass(th, "am-more-th--n")) as FNode;
  assert.equal(nHead.attrs["aria-sort"], "ascending");
  assert.equal((dataRows(c.root)[0] as FNode).attrs["data-n"], "1");
  click(byTag(nHead, "button")[0] as FNode);
  const head2 = byTag(c.root, "th").find((th) => hasClass(th, "am-more-th--n")) as FNode;
  assert.equal(head2.attrs["aria-sort"], "descending");
  assert.equal((dataRows(c.root)[0] as FNode).attrs["data-n"], "100");
  const dHead = byTag(c.root, "th").find((th) => hasClass(th, "am-more-th--durum")) as FNode;
  click(byTag(dHead, "button")[0] as FNode);
  const first = dataRows(c.root)[0] as FNode;
  assert.match(first.textContent, /Doğrulandı/);
});

test("integrations: satırı genişletince tam eksik ve kanıt dosyaları görünür; kanıt kopyalanabilir", () => {
  const c = mountInt();
  const row = dataRows(c.root).find((r) => r.attrs["data-n"] === "1") as FNode;
  const toggle = byTag(row, "button")[0] as FNode;
  assert.equal(toggle.attrs["aria-expanded"], "false");
  assert.equal(byClass(c.root, "am-more-detail").length, 0);
  click(toggle);
  const detail = byClass(c.root, "am-more-detail");
  assert.equal(detail.length, 1);
  const full = CAPS.items[0].eksik as string;
  assert.ok((detail[0] as FNode).textContent.includes(full));
  const toggle2 = byTag(dataRows(c.root).find((r) => r.attrs["data-n"] === "1") as FNode, "button")[0] as FNode;
  assert.equal(toggle2.attrs["aria-expanded"], "true");
  const proof = byClass(detail[0] as FNode, "am-more-proof")[0] as FNode;
  assert.equal(proof.textContent, CAPS.items[0].kanit[0]);
  click(proof);
  assert.deepEqual(c.calls.filter((x) => x[0] === "copyText")[0], ["copyText", [CAPS.items[0].kanit[0]]]);
  click(byTag(dataRows(c.root).find((r) => r.attrs["data-n"] === "1") as FNode, "button")[0] as FNode);
  assert.equal(byClass(c.root, "am-more-detail").length, 0);
});

test("integrations: süzgeç kutusu yeniden çizimde korunur (odak kaybı yok)", () => {
  const c = mountInt();
  const q1 = byTag(c.root, "input")[0] as FNode;
  q1.value = "kom"; fire(q1, "input");
  c.AM.state.data.capabilities = okData(CAPS);
  render(c, "integrations");
  assert.equal(byTag(c.root, "input")[0], q1);
  assert.equal(q1.value, "kom");
});

test("integrations: XSS yükü yalnız metin olarak görünür", () => {
  const evil = "<img src=x onerror=alert(1)><script>alert(2)</script>";
  const items = [
    { n: 1, en: evil, tr: evil, sahip: evil, durum: evil, kanit: [evil], eksik: evil, dilim: evil },
    { n: 2, en: "ok", tr: "ok", sahip: "M1", durum: "Planlı", kanit: [], eksik: "x", dilim: "D3" }
  ];
  const c = mountInt({ summary: { dogrulandi: 0, kismi: 0, planli: 1, desteklenmiyor: 0, total: 2 }, items, slices: { D3: evil }, registry: [{ id: evil, ad: evil, rota: evil, ops: [{ op: evil, durum: evil, kanit: evil }] }], updatedAt: evil });
  noActiveContent(c.root);
  assert.ok(c.root.textContent.includes(evil));
  // genişletilmiş satır da güvenli
  click(byTag(dataRows(c.root)[0] as FNode, "button")[0] as FNode);
  noActiveContent(c.root);
  // bilinmeyen durum 'Doğrulandı' olarak çizilmez
  const st = (dataRows(c.root)[0] as FNode).children[3] as FNode;
  assert.ok(hasClass(byClass(st, "am-more-chip")[0] as FNode, "am-more-chip--info"));
});

test("integrations: sunucu özeti tutarsızsa uyarı notu, sayım tablodan", () => {
  const c = mountInt({ ...CAPS, summary: { ...CAPS.summary, dogrulandi: 99 } });
  assert.match(c.root.textContent, /sunucu özeti/);
  assert.ok(byClass(c.root, "am-more-tile")[0]!.textContent.includes(String(CAPS.summary.dogrulandi)));
});

test("integrations: veri yokken bir kez loadData('capabilities'), yükleniyor kartı, döngü yok", () => {
  const c = load([...BASE, "integrations"]);
  render(c, "integrations");
  render(c, "integrations");
  render(c, "integrations");
  assert.deepEqual(c.calls.filter((x) => x[0] === "loadData"), [["loadData", ["capabilities"]]]);
  assert.ok(all(c.root, (n) => n.attrs["aria-busy"] === "true").length >= 1);
  assert.equal(dataRows(c.root).length, 0);
});

test("integrations: hata kartı role=alert + yeniden dene yeniden ister", () => {
  const c = load([...BASE, "integrations"]);
  c.AM.state.data.capabilities = { status: "error", value: null, reason: "500: kırık" };
  render(c, "integrations");
  const a = alertCards(c.root);
  assert.equal(a.length, 1);
  assert.match((a[0] as FNode).textContent, /500: kırık/);
  const before = c.calls.length;
  click(byTag(a[0] as FNode, "button")[0] as FNode);
  assert.equal(c.calls.length, before + 1);
  assert.deepEqual(c.calls[c.calls.length - 1], ["loadData", ["capabilities"]]);
});

test("integrations: boş liste boş durum kartı; loadData yoksa görünür hata", () => {
  const c = mountInt({ summary: {}, items: [], slices: {}, registry: [] });
  assert.match(c.root.textContent, /Yetenek kaydı yok/);
  const d = load([...BASE, "integrations"]);
  delete d.AM.actions.loadData;
  render(d, "integrations");
  assert.equal(alertCards(d.root).length, 1);
});

test("integrations: çizim hatası okunur hata kartına dönüşür", () => {
  const c = load([...BASE, "integrations"]);
  Object.defineProperty(c.AM.state, "data", { get() { throw new Error("boom"); } });
  c.pages["integrations"].render(c.AM, c.root);
  const a = alertCards(c.root);
  assert.equal(a.length, 1);
  assert.match((a[0] as FNode).textContent, /boom/);
});

// ================================================================ skills
const SKILLS = [
  { id: "1", name: "Aday beceri", state: "candidate", riskClass: "contained" },
  { id: "2", name: "Güvenlikte", state: "security_review", riskClass: "privileged" },
  { id: "3", name: "Onay bekleyen", state: "awaiting_approval", riskClass: "remote" },
  { id: "4", name: "Yayında", state: "released", riskClass: "contained" },
  { id: "5", name: "Reddedilen", state: "rejected", riskClass: "privileged" },
  { id: "6", name: "Tuhaf", state: "weird_state", riskClass: "cosmic" }
];
function mountSkills(list: unknown = SKILLS): Ctx {
  const c = load([...BASE, "skills"]);
  c.AM.state.skills = list;
  render(c, "skills");
  return c;
}

test("skills.pure: aşama sırası, risk sınıfı ve bilinmeyenler", () => {
  const p = load([...BASE, "skills"]).win.AM_PAGE_SKILLS.pure;
  assert.deepEqual(plain(p.FLOW), ["candidate", "researching", "security_review", "isolated_test", "awaiting_approval", "released"]);
  assert.equal(p.stateInfo("released").tone, "ok");
  assert.equal(p.stateInfo("rejected").ended, true);
  assert.equal(p.stateInfo("revoked").tone, "bad");
  assert.equal(p.stateKey("weird"), "unknown");
  assert.notEqual(p.stateInfo("candidate").tone, "ok");
  assert.equal(p.riskInfo("contained").tone, "ok");
  assert.equal(p.riskInfo("privileged").tone, "warn");
  assert.equal(p.riskInfo("remote").tone, "bad");
  assert.equal(p.riskInfo("???").key, "unknown");
  // Bilinmeyen aşama bitmiş süreçlerden önce; yayına yakın olan sonra gelir.
  const sorted = plain(p.sortSkills(p.normSkills(SKILLS))).map((s: any) => s.id);
  assert.deepEqual(sorted, ["1", "2", "3", "4", "6", "5"]);
});

test("skills: tablo, aşama çubuğu ve dürüst notlar", () => {
  const c = mountSkills();
  const rows = byClass(c.root, "am-more-skillrow");
  assert.equal(rows.length, 6);
  assert.equal(byTag(c.root, "table").length, 1);
  assert.ok(byTag(c.root, "th").every((th) => th.attrs["scope"]));
  const flow = byClass(c.root, "am-more-flow")[0] as FNode;
  assert.equal(flow.tag, "ol");
  assert.equal(byClass(flow, "am-more-flow-step").length, 6);
  const ft = flow.textContent;
  for (const w of ["Aday", "Araştırma", "Güvenlik", "Yalıtılmış test", "Onay", "Yayın"]) assert.ok(ft.includes(w), w);
  const text = c.root.textContent;
  assert.match(text, /KAYIT/);
  assert.match(text, /Otomatik indirme ya da kurulum YAPILMAZ/);
  assert.doesNotMatch(text, /⟦/);
});

test("skills: karar/onay düğmesi YOK; durum rozetleri doğru", () => {
  const c = mountSkills();
  assert.equal(byTag(c.root, "button").length, 0);
  assert.equal(byTag(c.root, "input").length, 0);
  const rowBy = (name: string) => byClass(c.root, "am-more-skillrow").find((r) => r.textContent.includes(name)) as FNode;
  assert.ok(hasClass(byClass(rowBy("Yayında"), "am-more-chip")[0] as FNode, "am-more-chip--ok"));
  assert.ok(!hasClass(byClass(rowBy("Onay bekleyen"), "am-more-chip")[0] as FNode, "am-more-chip--ok"));
  assert.ok(hasClass(byClass(rowBy("Reddedilen"), "am-more-chip")[0] as FNode, "am-more-chip--bad"));
  assert.match(rowBy("Tuhaf").textContent, /Bilinmeyen aşama/);
  assert.match(rowBy("Tuhaf").textContent, /Bilinmeyen risk/);
});

test("skills: boş durum, XSS ve çizim hatası", () => {
  const e = mountSkills([]);
  assert.match(e.root.textContent, /Beceri kaydı yok/);
  const evil = "<img src=x onerror=alert(1)>";
  const c = mountSkills([{ id: evil, name: evil, state: evil, riskClass: evil }]);
  noActiveContent(c.root);
  assert.ok(c.root.textContent.includes(evil));
  const f = load([...BASE, "skills"]);
  Object.defineProperty(f.AM.state, "skills", { get() { throw new Error("patladı"); } });
  render(f, "skills");
  assert.equal(alertCards(f.root).length, 1);
});

// ================================================================ research
const CAL = { report: { source: null, resolved: 3, unresolvedOverdue: 1, unresolvedTotal: 2, brier: 0.1234, meanConfidence: 0.8, accuracy: 0.7, gap: 0.1, verdict: "insufficient_data", selectionBiasWarning: false, buckets: [], note: "n yetersiz" } };
function mountResearch(setup?: (c: Ctx) => void): Ctx {
  const c = load([...BASE, "research"]);
  c.AM.state.data.calibration = okData(CAL);
  if (setup) setup(c);
  render(c, "research");
  return c;
}

test("research.pure: kalibrasyon", () => {
  const p = load([...BASE, "research"]).win.AM_PAGE_RESEARCH.pure;
  assert.equal(p.calSummary(null), null);
  assert.equal(p.calSummary({}), null);
  assert.equal(plain(p.calSummary(CAL)).verdict, "insufficient_data");
  assert.equal(p.fmtDec(0.1234, 3), "0,123");
});

test("research: yalnız okunur notu; karar düğmesi yok", () => {
  const c = mountResearch();
  assert.match(c.root.textContent, /Bu sayfa yalnızca okunur/);
  // Karar laboratuvarı bölüm düğmeleri (Aç/Kapat) hesabı yalnız kullanıcı isteğiyle açar; karar/onay/kayıt düğmesi yoktur.
  assert.equal(byTag(c.root, "button").filter((b) => !/^(Aç|Kapat)$/.test(b.textContent)).length, 0);
  assert.equal(byTag(c.root, "button").filter((b) => /onayla|reddet|sil\u0008|geri al|kaydet/i.test(b.textContent)).length, 0);
  assert.doesNotMatch(c.root.textContent, /⟦/);
});

test("research: kalibrasyon özeti gösterilir; veri yoksa ya da hatalıysa gizlenir", () => {
  const c = mountResearch();
  assert.match(c.root.textContent, /Kalibrasyon özeti/);
  assert.match(c.root.textContent, /Yetersiz veri/);
  assert.match(c.root.textContent, /0,123/);
  const g1 = mountResearch((x) => { x.AM.state.data.calibration = { status: "error", value: null, reason: "404" }; });
  assert.doesNotMatch(g1.root.textContent, /Kalibrasyon özeti/);
  assert.match(g1.root.textContent, /Kalibrasyon verisi yok/);
  const g2 = mountResearch((x) => { x.AM.state.data.calibration = okData({ report: null }); });
  assert.doesNotMatch(g2.root.textContent, /Kalibrasyon özeti/);
});

test("research: veri yokken calibration bir kez istenir", () => {
  const c = load([...BASE, "research"]);
  render(c, "research"); render(c, "research"); render(c, "research");
  const calls = c.calls.filter((x) => x[0] === "loadData").map((x) => (x[1] as string[])[0]);
  assert.deepEqual(calls, ["calibration", "genealogy"], "kalibrasyon ve karar soy ağacı birer kez istenir");
});

test("research: XSS yükü metin olarak kalır", () => {
  const evil = "<script>alert(1)</script>";
  const x = mountResearch((y) => {
    y.AM.state.data.calibration = okData({ report: { verdict: evil, note: evil, resolved: 1 } });
  });
  noActiveContent(x.root);
  assert.ok(x.root.textContent.includes(evil));
});

test("research: çizim hatası okunur hata kartı", () => {
  const c = load([...BASE, "research"]);
  Object.defineProperty(c.AM.state, "data", { get() { throw new Error("veri kırık"); } });
  render(c, "research");
  assert.equal(alertCards(c.root).length, 1);
});

// ================================================================ memory
const HITS = (n: number) => Array.from({ length: n }, (_, i) => ({
  id: "m" + i, kind: "fact", title: "Kayıt " + i, body: "Gövde " + i, source: "kasa", sourceRef: "not-" + i + ".md", scope: "proje", confidence: 0.75,
  observedAt: "2026-10-01T10:00:00Z", status: "active", redacted: false, flags: i === 0 ? ["stale", "contradiction"] : []
}));
function mountMemory(setup?: (c: Ctx) => void): Ctx {
  const c = load([...BASE, "memory"]);
  c.AM.state.data.memoryFlags = okData({ contradictions: [{ id: "f1", recordId: "m0", otherId: "m1", detail: "farklı değerler" }] });
  if (setup) setup(c);
  render(c, "memory");
  return c;
}
const typeInto = (c: Ctx, text: string) => { const q = byTag(c.root, "input")[0] as FNode; q.value = text; fire(q, "input"); return q; };

test("memory.pure: sorgu temizliği, anahtar ve 50 sonuç sınırı", () => {
  const p = load([...BASE, "memory"]).win.AM_PAGE_MEMORY.pure;
  assert.equal(p.DEBOUNCE_MS, 300);
  assert.equal(p.MAX_RESULTS, 50);
  assert.equal(p.cleanQuery("  a\u0000  b\n c  "), "a b c");
  assert.equal(p.cleanQuery("x".repeat(500)).length, 100);
  assert.equal(p.searchKey("abc"), "memorySearch:abc");
  assert.equal(p.normHits({ hits: HITS(80) }).length, 50);
  assert.equal(p.normHits(null).length, 0);
  assert.equal(p.confPct(0.756), 76);
  const f = plain(p.flagsSummary({ contradictions: [{ id: "a" }, { id: "b" }], stale: [1, 2, 3] }));
  assert.equal(f.contradictions, 2); assert.equal(f.stale, 3);
  const u = plain(p.flagsSummary({}));
  assert.equal(u.contradictions, null); assert.equal(u.stale, null);
});

test("memory: yazınca 300 ms bekleme, tek zamanlayıcı; süre dolunca bir kez loadData", () => {
  const c = mountMemory();
  const before = c.calls.filter((x) => x[0] === "loadData").length;
  typeInto(c, "ab");
  typeInto(c, "abc");
  typeInto(c, "abcd");
  assert.equal(c.timers.length, 1);
  assert.equal((c.timers[0] as Timer).ms, 300);
  assert.equal(c.calls.filter((x) => x[0] === "loadData").length, before);
  (c.timers[0] as Timer).fn();
  const loads = c.calls.filter((x) => x[0] === "loadData").slice(before);
  assert.deepEqual(loads, [["loadData", ["memorySearch", "abcd"]]]);
});

test("memory: boş sorgu istek yapmaz ve bekleyen zamanlayıcıyı iptal eder", () => {
  const c = mountMemory();
  const before = c.calls.length;
  typeInto(c, "abc");
  assert.equal(c.timers.length, 1);
  typeInto(c, "   ");
  assert.equal(c.timers.length, 0);
  assert.equal(c.calls.length, before);
  assert.match(c.root.textContent, /Aramak için bir sözcük yazın/);
});

test("memory: Enter (submit) beklemeden arar", () => {
  const c = mountMemory();
  typeInto(c, "sunucu");
  const form = byTag(c.root, "form")[0] as FNode;
  fire(form, "submit");
  assert.equal(c.timers.length, 0);
  assert.deepEqual(c.calls.filter((x) => x[0] === "loadData").pop(), ["loadData", ["memorySearch", "sunucu"]]);
});

test("memory: sonuçlar en çok 50; kaynak, zaman, güven, kapsam ve bayrak alanları görünür", () => {
  const c = mountMemory((x) => { x.AM.state.data["memorySearch:abc"] = okData({ hits: HITS(80) }); });
  typeInto(c, "abc"); (c.timers[0] as Timer).fn();
  render(c, "memory");
  const hits = byClass(c.root, "am-more-hit");
  assert.equal(hits.length, 50);
  const t = (hits[0] as FNode).textContent;
  assert.match(t, /Kaynak/); assert.match(t, /kasa · not-0\.md/);
  assert.match(t, /Zaman/); assert.match(t, /01\.10\.2026/);
  assert.match(t, /Güven/); assert.match(t, /%75/);
  assert.match(t, /Kapsam/); assert.match(t, /proje/);
  assert.match(t, /Bayat/); assert.match(t, /Çelişki var/);
  assert.match(c.root.textContent, /50 sonuç gösteriliyor/);
});

test("memory: sonuç içeriği düz metin; HTML/bağlantı yükü etkin içerik üretmez (AM_MD kullanılmaz)", () => {
  const evil = "<img src=x onerror=alert(1)> [tıkla](javascript:alert(1)) **kalın** <script>x</script>";
  const hit = { ...HITS(1)[0], title: evil, body: evil, source: evil, sourceRef: evil, scope: evil };
  const c = mountMemory((x) => { x.AM.state.data["memorySearch:abc"] = okData({ hits: [hit] }); });
  typeInto(c, "abc"); (c.timers[0] as Timer).fn(); render(c, "memory");
  noActiveContent(c.root);
  assert.ok(c.root.textContent.includes(evil));
  assert.ok(!/AM_MD\s*[.(]/.test(SRC.memory), "kaynak AM_MD çağırmamalı");
});

test("memory: yükleniyor, boş sonuç, hata + yeniden dene", () => {
  const c = mountMemory();
  typeInto(c, "yok"); (c.timers[0] as Timer).fn();
  assert.ok(all(c.root, (n) => n.attrs["aria-busy"] === "true").length >= 1);
  c.AM.state.data["memorySearch:yok"] = okData({ hits: [] });
  render(c, "memory");
  assert.match(c.root.textContent, /Eşleşen kayıt yok/);
  c.AM.state.data["memorySearch:yok"] = { status: "error", value: null, reason: "500" };
  render(c, "memory");
  const a = alertCards(c.root).filter((n) => n.textContent.includes("Arama yapılamadı"));
  assert.equal(a.length, 1);
  const n0 = c.calls.length;
  click(byTag(a[0] as FNode, "button")[0] as FNode);
  assert.deepEqual(c.calls[n0], ["loadData", ["memorySearch", "yok"]]);
});

test("memory: çelişki ve bayatlık bayrakları; sunucu bilgi vermediyse 'bilinmiyor' (uydurma 0 yok)", () => {
  const c = mountMemory();
  const t = c.root.textContent;
  assert.match(t, /Çözümsüz çelişki: 1/);
  assert.match(t, /Bayat kayıt sayısı sunucudan gelmedi/);
  assert.match(t, /farklı değerler/);
  assert.match(t, /ekler-yalnızdır; çelişki otomatik çözülmez/);
  assert.match(t, /güvenilmez veridir/);
  const z = mountMemory((x) => { x.AM.state.data.memoryFlags = okData({ contradictions: [], stale: [] }); });
  assert.match(z.root.textContent, /Çözümsüz çelişki yok/);
  assert.match(z.root.textContent, /Bayat kayıt yok/);
});

test("memory: bayrak verisi yokken memoryFlags bir kez istenir; hata kartı", () => {
  const c = load([...BASE, "memory"]);
  render(c, "memory"); render(c, "memory");
  assert.deepEqual(c.calls.filter((x) => x[0] === "loadData"), [["loadData", ["memoryFlags"]], ["loadData", ["memoryImplicit"]]], "bayraklar ve örtük öneriler birer kez istenir");
  c.AM.state.data.memoryFlags = { status: "error", value: null, reason: "x" };
  render(c, "memory");
  assert.equal(alertCards(c.root).length, 1);
});

test("memory: arama kutusu yeniden çizimde aynı kalır; silme/çözme düğmesi yok", () => {
  const c = mountMemory();
  const q = typeInto(c, "abc");
  render(c, "memory");
  assert.equal(byTag(c.root, "input")[0], q);
  assert.equal(q.value, "abc");
  assert.equal(byTag(c.root, "button").filter((b) => /sil|çöz|sakla|düzenle/i.test(b.textContent)).length, 0);
});

test("memory: çizim hatası okunur hata kartı", () => {
  const c = load([...BASE, "memory"]);
  Object.defineProperty(c.AM.state, "data", { get() { throw new Error("hafıza kırık"); } });
  c.pages["memory"].render(c.AM, c.root);
  assert.equal(alertCards(c.root).length, 1);
});

// ================================================================ memory: bağlam getirme, proje hafızası özeti, örtük öneriler
const EVIL = "<img src=x onerror=alert(1)> [tıkla](javascript:alert(1)) **kalın** <script>x</script>";
const pByTag = (c: Ctx, t: string): FNode[] => byTag(c.root, t);
const ctxInput = (c: Ctx): FNode => pByTag(c, "input")[1] as FNode;
const ctxSelects = (c: Ctx): FNode[] => pByTag(c, "select");
const ctxForm = (c: Ctx): FNode => pByTag(c, "form")[1] as FNode;
const loadsOf = (c: Ctx) => c.calls.filter((x) => x[0] === "loadData").map((x) => x[1] as unknown[]);
const CTX_ITEM = (i: number, over: Record<string, unknown> = {}) => ({ id: "m" + i, kind: "fact", scope: "proje", title: "Kayıt " + i, flags: [], score: 0.8, ...over });
function ctxResult(stage: number, items: unknown[], over: Record<string, unknown> = {}) {
  return { stage, query: "sorgu", items, usedChars: 2950, budgetChars: 3000, truncated: false, nextStage: stage < 3 ? stage + 1 : null, ...over };
}
function runCtx(c: Ctx, q = "sorgu", stage = "1", budget = "3000"): string {
  const sels = ctxSelects(c);
  (sels[0] as FNode).value = stage;
  (sels[1] as FNode).value = budget;
  ctxInput(c).value = q;
  fire(ctxForm(c), "submit");
  return stage + "|" + budget + "|" + q;
}

test("memory.pure: bağlam parametresi, sorgu 200 karakter, bozuk yanıt null", () => {
  const p = load([...BASE, "memory"]).win.AM_PAGE_MEMORY.pure;
  assert.equal(p.ctxParam(2, 3000, "  a\u0000  b "), "2|3000|a b");
  assert.equal(p.ctxParam(9, 7, "x"), "1|3000|x", "geçersiz aşama ve bütçe varsayılana döner");
  assert.equal(p.cleanCtxQuery("x".repeat(500)).length, 200);
  assert.equal(p.normContext(null), null);
  assert.equal(p.normContext({ items: "x" }), null);
  assert.equal(p.normCompile({ sections: [] }), null);
  assert.equal(p.normCandidates({}), null);
  assert.ok(plain(p.BUDGETS).every((n: number) => n >= 200 && n <= 20000));
  assert.equal(p.fmtInt(2950), "2.950");
  assert.equal(p.scopeOk(""), true); assert.equal(p.scopeOk("proje a"), true); assert.equal(p.scopeOk("../x"), false); assert.equal(p.scopeOk("x".repeat(81)), false);
});

test("memory/bağlam: yeni bölümler var; sorgu kutusu en çok 200; boş sorgu istek yapmaz; etiketler girdilere bağlı", () => {
  const c = mountMemory();
  const txt = c.root.textContent;
  for (const s of ["Bağlam getirme", "Proje hafızası özeti", "Örtük bilgi önerileri", "Bunlar yalnız ÖNERİDİR; hiçbiri kendiliğinden kaydedilmez"]) assert.ok(txt.includes(s), s);
  assert.equal(ctxInput(c).attrs["maxlength"], "200");
  assert.deepEqual(ctxSelects(c).map((s) => s.children.length), [3, 6]);
  const n0 = loadsOf(c).length;
  fire(ctxForm(c), "submit");
  ctxInput(c).value = "   ";
  fire(ctxForm(c), "submit");
  assert.equal(loadsOf(c).length, n0, "boş sorgu: istek yok");
  assert.match(c.root.textContent, /Bağlam getirmek için bir sorgu yazıp Getir/);
  for (const l of byTag(c.root, "label")) assert.ok(l.attrs["for"]);
  assert.doesNotMatch(c.root.textContent, /⟦/);
});

test("memory/bağlam: Getir doğru parametreyle istek yapar; aşama ve bütçe değişince yeni doğru istek", () => {
  const c = mountMemory();
  const n0 = loadsOf(c).length;
  const key = runCtx(c, "sunucu ayarı", "1", "3000");
  assert.deepEqual(loadsOf(c).slice(n0), [["memoryContext", key]]);
  assert.equal(key, "1|3000|sunucu ayarı");
  assert.ok(all(c.root, (n) => n.attrs["aria-busy"] === "true").length >= 1, "yükleniyor göstergesi");
  const sels = ctxSelects(c);
  (sels[0] as FNode).value = "2"; fire(sels[0] as FNode, "change");
  (sels[1] as FNode).value = "6000"; fire(sels[1] as FNode, "change");
  assert.deepEqual(loadsOf(c).slice(n0), [["memoryContext", "1|3000|sunucu ayarı"], ["memoryContext", "2|3000|sunucu ayarı"], ["memoryContext", "2|6000|sunucu ayarı"]]);
  // 200'den uzun sorgu kırpılır
  runCtx(c, "y".repeat(300), "3", "500");
  assert.deepEqual(loadsOf(c).pop(), ["memoryContext", "3|500|" + "y".repeat(200)]);
});

test("memory/bağlam: aşama 1 tablosu — başlık, tür, kapsam, bayrak rozetleri, skor, 'Kayıt metni (veri)' özeti", () => {
  const c = mountMemory();
  const key = runCtx(c);
  c.AM.state.data["memoryContext:" + key] = okData(ctxResult(1, [CTX_ITEM(0, { flags: ["stale", "contradiction", "bogus"], summary: "özet metni" }), CTX_ITEM(1, { kind: "uydurma" })]));
  render(c, "memory");
  const heads = byTag(pByTag(c, "table")[0] as FNode, "th").map((th) => th.textContent);
  assert.deepEqual(heads, ["Başlık", "Tür", "Kapsam", "Bayraklar", "Skor", "Kayıt metni (veri): özet"]);
  const rows = byClass(c.root, "am-more-row");
  assert.equal(rows.length, 2);
  const r0 = (rows[0] as FNode).textContent;
  assert.match(r0, /Kayıt 0/); assert.match(r0, /Olgu/); assert.match(r0, /proje/); assert.match(r0, /Bayat/); assert.match(r0, /Çelişki var/); assert.match(r0, /%80/); assert.match(r0, /özet metni/);
  assert.doesNotMatch(r0, /bogus/, "bilinmeyen bayrak rozet olmaz");
  assert.match((rows[1] as FNode).textContent, /Bilinmeyen tür/);
  assert.match((rows[1] as FNode).textContent, /Bayraksız/);
  const chips = byClass(rows[0] as FNode, "am-more-chip");
  assert.ok(chips.some((x) => hasClass(x, "am-more-chip--bad")), "çelişki uyarı tonu şekil+metinle");
  assert.match(c.root.textContent, /Aşama 1/);
  assert.match(c.root.textContent, /2 kayıt/);
});

test("memory/bağlam: aşama 2 gövde (kısaltıldı rozeti), aşama 3 kaynak, çelişki ve bağlantılar", () => {
  const c = mountMemory();
  const k2 = runCtx(c, "sorgu", "2");
  c.AM.state.data["memoryContext:" + k2] = okData(ctxResult(2, [CTX_ITEM(0, { body: "gövde metni", bodyClipped: true }), CTX_ITEM(1, { body: "kısa", bodyClipped: false })]));
  render(c, "memory");
  assert.deepEqual(byTag(pByTag(c, "table")[0] as FNode, "th").map((th) => th.textContent), ["Başlık", "Tür", "Bayraklar", "Kayıt metni (veri): gövde"]);
  const r = byClass(c.root, "am-more-row");
  assert.match((r[0] as FNode).textContent, /gövde metni/); assert.match((r[0] as FNode).textContent, /Kısaltıldı/);
  assert.doesNotMatch((r[1] as FNode).textContent, /Kısaltıldı/);
  const k3 = runCtx(c, "sorgu", "3");
  c.AM.state.data["memoryContext:" + k3] = okData(ctxResult(3, [CTX_ITEM(0, {
    source: "kasa", sourceRef: "not.md", exportedPath: "D:\\kasa\\not.md", observedAt: "2026-10-01T10:00:00Z", validUntil: "2026-12-01T10:00:00Z",
    contradictions: [{ flagId: "f1", otherId: "m9", detail: "farklı sayı" }], links: { replaces: "m5", replacedBy: null }, flags: ["expired"]
  })]));
  render(c, "memory");
  assert.deepEqual(byTag(pByTag(c, "table")[0] as FNode, "th").map((th) => th.textContent), ["Başlık", "Bayraklar", "Kaynak", "Zaman", "Çelişkiler", "Bağlantılar", "Dışa aktarım yolu"]);
  const t = (byClass(c.root, "am-more-row")[0] as FNode).textContent;
  for (const re of [/kasa · not\.md/, /Gözlem: 01\.10\.2026/, /Geçerlilik sonu: 01\.12\.2026/, /Çelişen kayıt: m9/, /farklı sayı/, /Yerine geçtiği: m5/, /not\.md/, /Süresi doldu/]) assert.match(t, re);
  assert.doesNotMatch(t, /Yerine geçen/);
  assert.equal(byClass(c.root, "am-more-btn--ghost").length, 0, "aşama 3: sonraki aşama düğmesi yok");
});

test("memory/bağlam: bütçe göstergesi, kesildi uyarısı ve 'sonraki aşama' düğmesi", () => {
  const c = mountMemory();
  const key = runCtx(c, "sorgu", "1", "3000");
  c.AM.state.data["memoryContext:" + key] = okData(ctxResult(1, [CTX_ITEM(0, { summary: "s" })], { truncated: true }));
  render(c, "memory");
  assert.match(c.root.textContent, /Kullanılan: 2\.950 \/ 3\.000 karakter \(%98\)/);
  const m = byTag(c.root, "progress")[0] as FNode;
  assert.equal(m.attrs["max"], "3000"); assert.equal(m.attrs["value"], "2950");
  assert.match(c.root.textContent, /Sonuç bütçeye sığmadığı için kesildi/);
  const next = byClass(c.root, "am-more-btn--ghost")[0] as FNode;
  assert.match(next.textContent, /Sonraki aşama: 2 · Gövde/);
  const n0 = loadsOf(c).length;
  click(next);
  assert.deepEqual(loadsOf(c).slice(n0), [["memoryContext", "2|3000|sorgu"]]);
  assert.equal((ctxSelects(c)[0] as FNode).value, "2");
  // kesilmedi + bütçe bilinmiyor
  const k2 = runCtx(c, "sorgu", "1", "500");
  c.AM.state.data["memoryContext:" + k2] = okData(ctxResult(1, [CTX_ITEM(0)], { usedChars: null, budgetChars: null }));
  render(c, "memory");
  assert.match(c.root.textContent, /Kullanılan karakter sayısı sunucudan gelmedi/);
  assert.doesNotMatch(c.root.textContent, /Sonuç bütçeye sığmadığı/);
  // bütçeyi aşan (beklenmeyen) yanıt gizlenmez
  const k3 = runCtx(c, "sorgu", "1", "1000");
  c.AM.state.data["memoryContext:" + k3] = okData(ctxResult(1, [CTX_ITEM(0)], { usedChars: 1500, budgetChars: 1000 }));
  render(c, "memory");
  assert.match(c.root.textContent, /bütçeyi aşan bir yanıt/);
  assert.equal((byTag(c.root, "progress")[0] as FNode).attrs["value"], "1000");
});

test("memory/bağlam: boş sonuç, hata + yeniden dene, bozuk yanıt çökmez", () => {
  const c = mountMemory();
  const key = runCtx(c);
  c.AM.state.data["memoryContext:" + key] = okData(ctxResult(1, []));
  render(c, "memory");
  assert.match(c.root.textContent, /Bağlama uyan kayıt yok/);
  c.AM.state.data["memoryContext:" + key] = { status: "error", value: null, reason: "400: q gerekli" };
  render(c, "memory");
  const a = alertCards(c.root).filter((n) => n.textContent.includes("Bağlam getirilemedi"));
  assert.equal(a.length, 1);
  assert.match((a[0] as FNode).textContent, /400: q gerekli/);
  const n0 = loadsOf(c).length;
  click(byTag(a[0] as FNode, "button")[0] as FNode);
  assert.deepEqual(loadsOf(c).slice(n0), [["memoryContext", key]]);
  for (const bad of [null, 5, "x", { items: null }, { items: [null, 7, "x", { flags: 3, contradictions: "x", links: 4 }] }]) {
    c.AM.state.data["memoryContext:" + key] = okData(bad);
    assert.doesNotThrow(() => render(c, "memory"));
  }
  assert.equal(alertCards(c.root).filter((n) => n.textContent.includes("Bağlam getirilemedi")).length, 0, "son bozuk-ama-dizi yanıt satır olarak çizilir");
});

test("memory/bağlam: XSS yükü ve gizli değer; metin etkin içerik üretmez", () => {
  const c = mountMemory();
  const key = runCtx(c, "sorgu", "3");
  const secret = "sk-abcdefghijklmnopqrstuvwx";
  c.AM.state.data["memoryContext:" + key] = okData(ctxResult(3, [CTX_ITEM(0, { title: EVIL + secret, scope: EVIL, source: EVIL, sourceRef: EVIL, exportedPath: EVIL, contradictions: [{ otherId: EVIL, detail: EVIL }], links: { replaces: EVIL, replacedBy: EVIL } })]));
  render(c, "memory");
  noActiveContent(c.root);
  assert.ok(c.root.textContent.includes(EVIL));
  assert.ok(!c.root.textContent.includes(secret), "gizli değer maskelenir");
  assert.match(c.root.textContent, /\[gizli\]/);
  const k1 = runCtx(c, "sorgu", "1");
  c.AM.state.data["memoryContext:" + k1] = okData(ctxResult(1, [CTX_ITEM(0, { summary: EVIL })]));
  render(c, "memory");
  noActiveContent(c.root);
  assert.ok(c.root.textContent.includes(EVIL));
});

const CMP = (over: Record<string, unknown> = {}) => ({ markdown: "# Proje\n\n- madde bir\n- madde iki\n", sections: [{ name: "Kararlar", count: 2, truncated: false }, { name: "Olaylar", count: 9, truncated: true }], counts: { facts: 4, decisions: 2 }, generatedAt: "2026-10-22T09:30:00Z", truncated: false, maskedSecrets: 0, ...over });
const cmpInput = (c: Ctx): FNode => pByTag(c, "input")[2] as FNode;
const cmpForm = (c: Ctx): FNode => pByTag(c, "form")[2] as FNode;

test("memory/özet: kapsam seçici + Derle; geçersiz kapsam istek yapmaz; kapsam parametresi iletilir", () => {
  const c = mountMemory();
  assert.match(c.root.textContent, /Özet metnini görmek için Derle'ye basın/);
  const n0 = loadsOf(c).length;
  cmpInput(c).value = "../x"; fire(cmpForm(c), "submit");
  assert.equal(loadsOf(c).length, n0);
  assert.equal(alertCards(c.root).filter((n) => n.textContent.includes("Kapsam adı geçersiz")).length, 1);
  cmpInput(c).value = ""; fire(cmpForm(c), "submit");
  assert.deepEqual(loadsOf(c).slice(n0), [["memoryCompile"]]);
  cmpInput(c).value = " proje a "; fire(cmpForm(c), "submit");
  assert.deepEqual(loadsOf(c).pop(), ["memoryCompile", "proje a"]);
  assert.equal(alertCards(c.root).filter((n) => n.textContent.includes("Kapsam adı geçersiz")).length, 0);
});

test("memory/özet: metin güvenli blokta (pre yok, textContent), bölüm sayıları, panoya kopyala yok", () => {
  const c = mountMemory();
  cmpInput(c).value = ""; fire(cmpForm(c), "submit");
  c.AM.state.data["memoryCompile"] = okData(CMP());
  render(c, "memory");
  const blk = byClass(c.root, "am-more-textblock")[0] as FNode;
  assert.equal(blk.textContent, "# Proje\n\n- madde bir\n- madde iki\n", "satır sonları korunur");
  assert.equal(blk.attrs["tabindex"], "0");
  assert.equal(byTag(c.root, "pre").length, 0);
  const t = c.root.textContent;
  for (const re of [/Kararlar: 2/, /Olaylar: 9 \(kısaltıldı\)/, /facts/, /Derlenme zamanı: 22\.10\.2026/, /fare ya da klavyeyle seçip/]) assert.match(t, re);
  assert.equal(byTag(c.root, "button").filter((b) => /kopyala/i.test(b.textContent)).length, 0);
  assert.equal(c.calls.filter((x) => x[0] === "copyText").length, 0);
  noActiveContent(c.root);
});

test("memory/özet: kesildi ve maskelendi uyarıları; boş özet; hata + yeniden dene; XSS yükü", () => {
  const c = mountMemory();
  cmpInput(c).value = ""; fire(cmpForm(c), "submit");
  c.AM.state.data["memoryCompile"] = okData(CMP({ truncated: true, maskedSecrets: 3 }));
  render(c, "memory");
  assert.match(c.root.textContent, /Özet uzunluk sınırına sığmadığı için kesildi/);
  assert.match(c.root.textContent, /Metindeki 3 gizli değer maskelendi/);
  c.AM.state.data["memoryCompile"] = okData(CMP({ maskedSecrets: true }));
  render(c, "memory");
  assert.match(c.root.textContent, /Metindeki gizli değerler maskelendi/);
  c.AM.state.data["memoryCompile"] = okData(CMP({ markdown: "   " }));
  render(c, "memory");
  assert.match(c.root.textContent, /Derlenecek kayıt yok/);
  c.AM.state.data["memoryCompile"] = { status: "error", value: null, reason: "400" };
  render(c, "memory");
  const a = alertCards(c.root).filter((n) => n.textContent.includes("Özet derlenemedi"));
  assert.equal(a.length, 1);
  const n0 = loadsOf(c).length;
  click(byTag(a[0] as FNode, "button")[0] as FNode);
  assert.deepEqual(loadsOf(c).slice(n0), [["memoryCompile"]]);
  c.AM.state.data["memoryCompile"] = okData(CMP({ markdown: EVIL + " sk-abcdefghijklmnopqrstuvwx \u202Egnp", sections: [{ name: EVIL, count: 1 }], counts: { [EVIL]: 1 } }));
  render(c, "memory");
  noActiveContent(c.root);
  const blk = byClass(c.root, "am-more-textblock")[0] as FNode;
  assert.ok(blk.textContent.includes(EVIL) && !blk.textContent.includes("sk-abc") && !blk.textContent.includes("\u202E"));
  c.AM.state.data["memoryCompile"] = okData(5);
  assert.doesNotThrow(() => render(c, "memory"));
});

const CAND = (i: number, over: Record<string, unknown> = {}) => ({ id: "ort-" + i, kind: "note", text: "Öneri metni " + i, evidence: ["kanıt bir", "kanıt iki", "kanıt üç"], count: 3, confidence: 0.6, suggestedScope: "agentmom", ...over });

test("memory/örtük: yükleniyor, boş durum, açıklama; veri yokken bir kez istenir", () => {
  const c = load([...BASE, "memory"]);
  render(c, "memory");
  assert.match(c.root.textContent, /Öneriler yükleniyor/);
  c.AM.state.data.memoryImplicit = okData({ candidates: [], skippedAlreadyRecorded: 0 });
  render(c, "memory");
  assert.match(c.root.textContent, /Henüz tekrar eden örüntü yok/);
  assert.equal(byClass(c.root, "am-more-cand").length, 0);
  assert.equal(loadsOf(c).filter((l) => l[0] === "memoryImplicit").length, 1);
  c.AM.state.data.memoryImplicit = { status: "error", value: null, reason: "503" };
  render(c, "memory");
  const a = alertCards(c.root).filter((n) => n.textContent.includes("Öneriler alınamadı"));
  assert.equal(a.length, 1);
  click(byTag(a[0] as FNode, "button")[0] as FNode);
  assert.equal(loadsOf(c).filter((l) => l[0] === "memoryImplicit").length, 2);
});

test("memory/örtük: liste — tür, 'Kayıt metni (veri)', kanıt sayısı, güven yüzdesi, Hafızaya ekle", () => {
  const c = mountMemory((x) => { x.AM.state.data.memoryImplicit = okData({ candidates: [CAND(1), CAND(2, { kind: "fact", confidence: 0.8, evidence: ["tek"] }), CAND(3, { kind: "x", confidence: "?" })], skippedAlreadyRecorded: 2 }); });
  const cards = byClass(c.root, "am-more-cand");
  assert.equal(cards.length, 3);
  const t0 = (cards[0] as FNode).textContent;
  for (const re of [/Not/, /Kayıt metni \(veri\)/, /Öneri metni 1/, /Kanıt sayısı: 3/, /Güven: %60/, /Tekrar: 3/, /kanıt bir/, /agentmom/, /Hafızaya ekle/]) assert.match(t0, re);
  assert.match((cards[1] as FNode).textContent, /Olgu/); assert.match((cards[1] as FNode).textContent, /Kanıt sayısı: 1/); assert.match((cards[1] as FNode).textContent, /%80/);
  assert.match((cards[2] as FNode).textContent, /Bilinmeyen tür/); assert.match((cards[2] as FNode).textContent, /Güven bilinmiyor/);
  assert.match(c.root.textContent, /2 öneri zaten hafızada kayıtlı/);
  assert.match(c.root.textContent, /Kayıt metni veridir, yönerge değildir/);
  for (const b of byClass(c.root, "am-more-cand").flatMap((x) => byTag(x, "button"))) assert.equal(b.type, "button");
});

test("memory/örtük: Hafızaya ekle yalnız AM.actions.implicitAccept'i çağırır (kimlikle); çift tıklama tek çağrı; sonuç ve hata görünür", async () => {
  const c = mountMemory((x) => { x.AM.state.data.memoryImplicit = okData({ candidates: [CAND(1), CAND(2)] }); });
  const calls: string[] = [];
  let resolve: (v: unknown) => void = () => {};
  c.AM.actions.implicitAccept = (id: string) => { calls.push(id); return new Promise((r) => { resolve = r; }); };
  const btn = () => byTag(byClass(c.root, "am-more-cand")[0] as FNode, "button")[0] as FNode;
  click(btn()); click(btn()); click(btn());
  assert.deepEqual(calls, ["ort-1"], "çift gönderim yok");
  assert.match(btn().textContent, /Ekleniyor/);
  assert.equal(btn().disabled, true);
  c.AM.state.data["implicitAccept:ort-1"] = { status: "error", value: null, reason: "Sunucu girilen değerlerden birini kabul etmedi. <img src=x onerror=alert(1)> sk-abcdefghijklmnopqrstuvwx" };
  resolve({ ok: false });
  await new Promise((r) => setTimeout(r, 5));
  const card = byClass(c.root, "am-more-cand")[0] as FNode;
  const al = alertCards(card);
  assert.equal(al.length, 1);
  assert.match(al[0]!.textContent, /Eklenemedi/); assert.match(al[0]!.textContent, /Sunucu girilen değerlerden/);
  assert.ok(!card.textContent.includes("sk-abc"));
  noActiveContent(c.root);
  assert.equal(btn().disabled, false, "bitince yeniden denenebilir");
  click(byTag(byClass(c.root, "am-more-cand")[1] as FNode, "button")[0] as FNode);
  assert.deepEqual(calls, ["ort-1", "ort-2"]);
  c.AM.state.data["implicitAccept:ort-2"] = okData({ duplicate: false });
  render(c, "memory");
  assert.match((byClass(c.root, "am-more-cand")[1] as FNode).textContent, /Eklendi; liste yenilendi/);
});

test("memory/örtük: XSS yükü ve gizli değer; eylem yoksa çökmez; bozuk veri", () => {
  const c = mountMemory((x) => { x.AM.state.data.memoryImplicit = okData({ candidates: [CAND(1, { text: EVIL + " sk-abcdefghijklmnopqrstuvwx", evidence: [EVIL, 5, null], suggestedScope: EVIL, kind: EVIL, id: "ort-1" }), null, 7, "x"] }); });
  noActiveContent(c.root);
  assert.ok(c.root.textContent.includes(EVIL));
  assert.ok(!c.root.textContent.includes("sk-abc"));
  const b = byTag(byClass(c.root, "am-more-cand")[0] as FNode, "button")[0] as FNode;
  assert.doesNotThrow(() => click(b), "AM.actions.implicitAccept yoksa sessizce hiçbir şey olmaz");
  for (const bad of [null, 5, { candidates: "x" }, { candidates: [{}] }]) {
    c.AM.state.data.memoryImplicit = okData(bad);
    assert.doesNotThrow(() => render(c, "memory"));
  }
});

test("memory/örtük: aday metni kesilmeden tam görünür; doğrulanmadı uyarısı; 2000'i aşan aday için düğme pasif ve açıklama var", () => {
  const full = "p".repeat(700) + " UZUN-SON " + "q".repeat(100);
  const c = mountMemory((x) => { x.AM.state.data.memoryImplicit = okData({ candidates: [CAND(1, { text: full }), CAND(2, { text: "r".repeat(2001) }), CAND(3, { text: "kesik…", textCut: true }), CAND(4, { text: "r".repeat(2000) })] }); });
  const calls: string[] = [];
  c.AM.actions.implicitAccept = (id: string) => { calls.push(id); return Promise.resolve({ ok: true }); };
  render(c, "memory");
  const cards = byClass(c.root, "am-more-cand");
  const blk = (n: FNode) => byClass(n, "am-more-textblock")[0] as FNode;
  assert.equal(blk(cards[0] as FNode).textContent, full, "600 karakterde kesilmez");
  for (const n of cards) assert.match(n.textContent, /Ajan çıktısından\/denetim kaydından türetildi; doğrulanmadı\. Kaydetmeden önce metni kontrol edin\./);
  const btn = (i: number) => byTag(cards[i] as FNode, "button")[0] as FNode;
  assert.equal(btn(0).disabled, false);
  assert.equal(btn(3).disabled, false, "tam 2000 eklenebilir");
  for (const i of [1, 2]) {
    assert.equal(btn(i).disabled, true);
    assert.match((cards[i] as FNode).textContent, /Metin çok uzun \(2000 karakterden fazla\) ya da kesilmiş; eklenemez/);
    click(btn(i));
  }
  assert.deepEqual(calls, [], "pasif düğme eylemi çağırmaz");
  assert.doesNotMatch((cards[0] as FNode).textContent, /eklenemez/);
});

// ================================================================ research: karar soy ağacı
const UUID = (n: number) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const TREE = (n: number, over: Record<string, unknown> = {}) => ({ root: UUID(n), chain: [UUID(n), UUID(n + 100)], depth: 2, current: UUID(n + 100), headId: UUID(n + 100), headTitle: "Karar " + n, headState: "active", headReviewState: "ok", truncated: false, ...over });
const NODE = (n: number, over: Record<string, unknown> = {}) => ({ id: UUID(n), title: "Düğüm " + n, decidedAt: "2026-09-01T10:00:00Z", expiresAt: "2026-12-01T10:00:00Z", state: "active", status: "active", supersedes: null, supersededBy: null, assumptions: [{ text: "a", status: "open" }, { text: "b", status: "open" }], reviewState: "ok", ...over });
function mountGen(forest: unknown, setup?: (c: Ctx) => void): Ctx {
  const c = load([...BASE, "research"]);
  c.AM.state.data.calibration = okData(CAL);
  if (forest !== undefined) c.AM.state.data.genealogy = forest;
  if (setup) setup(c);
  render(c, "research");
  return c;
}
const FOREST = (trees: unknown[], over: Record<string, unknown> = {}) => okData({ totalRoots: trees.length, truncated: false, trees, ...over });

test("research/soy ağacı: kalibrasyon bölümü korunur; yükleniyor, boş, hata + yeniden dene", () => {
  const c = mountGen(undefined);
  assert.match(c.root.textContent, /Kalibrasyon özeti/);
  assert.match(c.root.textContent, /Karar soy ağacı/);
  assert.match(c.root.textContent, /Karar soy ağacı yükleniyor/);
  assert.ok(all(c.root, (n) => n.attrs["aria-busy"] === "true").length >= 1);
  assert.equal(loadsOf(c).filter((l) => l[0] === "genealogy").length, 1);
  c.AM.state.data.genealogy = FOREST([]);
  render(c, "research");
  assert.match(c.root.textContent, /Henüz karar kaydı yok/);
  c.AM.state.data.genealogy = { status: "error", value: null, reason: "500" };
  render(c, "research");
  const a = alertCards(c.root).filter((n) => n.textContent.includes("Karar soy ağacı alınamadı"));
  assert.equal(a.length, 1);
  assert.match((a[0] as FNode).textContent, /500/);
  click(byTag(a[0] as FNode, "button")[0] as FNode);
  assert.equal(loadsOf(c).filter((l) => l[0] === "genealogy").length, 2);
  assert.doesNotMatch(c.root.textContent, /⟦/);
});

test("research/soy ağacı: orman satırı — başlık, zincir uzunluğu, güncel karar, durum rozetleri (geçerli/yerine geçildi/süresi doldu)", () => {
  const c = mountGen(FOREST([TREE(1), TREE(2, { headState: "superseded", current: null, depth: 3 }), TREE(3, { headState: "expired", current: null }), TREE(4, { headState: "garip" })]));
  const items = byClass(c.root, "am-more-tree");
  assert.equal(items.length, 4);
  const t = items.map((i) => i.textContent);
  assert.match(t[0]!, /Karar 1/); assert.match(t[0]!, /Zincir uzunluğu: 2/); assert.match(t[0]!, /Güncel karar: Karar 1/); assert.match(t[0]!, /Geçerli/);
  assert.match(t[1]!, /Yerine geçildi/); assert.match(t[1]!, /Zincir uzunluğu: 3/); assert.match(t[1]!, /Güncel \(geçerli\) karar yok/);
  assert.match(t[2]!, /Süresi doldu/);
  assert.match(t[3]!, /Durum bilinmiyor/);
  assert.ok(hasClass(byClass(items[0] as FNode, "am-more-chip")[0] as FNode, "am-more-chip--ok"));
  assert.ok(!hasClass(byClass(items[1] as FNode, "am-more-chip")[0] as FNode, "am-more-chip--ok"));
  assert.match(c.root.textContent, /Kök karar: 00000000-0000-4000-8000-000000000001/);
});

test("research/soy ağacı: kök açılınca zincir istenir; eskiden yeniye girintili, düğüm alanları, güncel işareti", () => {
  const c = mountGen(FOREST([TREE(1)]));
  const n0 = loadsOf(c).length;
  const btn = byTag(byClass(c.root, "am-more-tree")[0] as FNode, "button")[0] as FNode;
  assert.equal(btn.attrs["aria-expanded"], "false");
  click(btn);
  assert.deepEqual(loadsOf(c).slice(n0), [["genealogy", UUID(1)]]);
  assert.match(c.root.textContent, /Zincir yükleniyor/);
  // sunucu yanıtı {genealogy: ...} sarmalı; düğümler bilerek ters sırada gelir
  c.AM.state.data["genealogy:" + UUID(1)] = okData({ genealogy: { root: UUID(1), chain: [UUID(1), UUID(2), UUID(3)], current: UUID(3), depth: 3, truncated: false, nodes: [
    NODE(3, { title: "Üçüncü", state: "active", reviewState: "review_due" }), NODE(1, { title: "Birinci", state: "superseded" }), NODE(2, { title: "İkinci", state: "expired", assumptions: [], reviewState: "at_risk" })
  ] } });
  render(c, "research");
  const nodes = byClass(c.root, "am-more-node");
  assert.deepEqual(nodes.map((n) => (byClass(n, "am-more-hit-t")[0] as FNode).textContent), ["Birinci", "İkinci", "Üçüncü"], "eskiden yeniye");
  assert.ok(hasClass(nodes[0] as FNode, "am-more-node--d0") && hasClass(nodes[1] as FNode, "am-more-node--d1") && hasClass(nodes[2] as FNode, "am-more-node--d2"), "girinti");
  const n2 = (nodes[1] as FNode).textContent;
  for (const re of [/Karar tarihi: 01\.09\.2026/, /Süre sonu: 01\.12\.2026/, /Varsayım sayısı: 0/, /İnceleme durumu: Riskte/, /Süresi doldu/, /2\. karar/]) assert.match(n2, re);
  assert.match((nodes[0] as FNode).textContent, /Yerine geçildi/);
  assert.match((nodes[2] as FNode).textContent, /Varsayım sayısı: 2/); assert.match((nodes[2] as FNode).textContent, /Gözden geçirme zamanı/); assert.match((nodes[2] as FNode).textContent, /Güncel/);
  assert.match(c.root.textContent, /Derinlik: 3/);
  assert.doesNotMatch(c.root.textContent, /Zincir eksik olabilir/);
  // yeniden tıklayınca kapanır
  click(byTag(byClass(c.root, "am-more-tree")[0] as FNode, "button")[0] as FNode);
  assert.equal(byClass(c.root, "am-more-node").length, 0);
});

test("research/soy ağacı: kesildi/döngü/derinlik uyarısı; zincir hatası; bozuk veri çökmez", () => {
  const c = mountGen(FOREST([TREE(1, { truncated: true })], { truncated: true, totalRoots: 250 }));
  assert.match(c.root.textContent, /Yalnız en yeni 1 kök gösteriliyor \(toplam 250\)/);
  assert.match((byClass(c.root, "am-more-tree")[0] as FNode).textContent, /Zincir eksik olabilir/);
  click(byTag(byClass(c.root, "am-more-tree")[0] as FNode, "button")[0] as FNode);
  c.AM.state.data["genealogy:" + UUID(1)] = okData({ root: UUID(1), chain: [UUID(1), UUID(2), UUID(1)], current: null, depth: 3, truncated: true, nodes: [NODE(1), NODE(2), NODE(1)] });
  render(c, "research");
  assert.equal(byClass(c.root, "am-more-node").length, 2, "tekrarlanan düğüm bir kez");
  assert.match(c.root.textContent, /Aynı karar zincirde birden çok kez geçiyor/);
  assert.ok(alertCards(c.root).length === 0);
  assert.ok(c.root.textContent.split("Zincir eksik olabilir").length >= 3, "zincir uyarısı da var");
  c.AM.state.data["genealogy:" + UUID(1)] = { status: "error", value: null, reason: "404: karar bulunamadı" };
  render(c, "research");
  const a = alertCards(c.root).filter((n) => n.textContent.includes("Zincir alınamadı"));
  assert.equal(a.length, 1); assert.match((a[0] as FNode).textContent, /404/);
  const n0 = loadsOf(c).length;
  click(byTag(a[0] as FNode, "button")[0] as FNode);
  assert.deepEqual(loadsOf(c).slice(n0), [["genealogy", UUID(1)]]);
  for (const bad of [null, 5, {}, { nodes: "x" }, { genealogy: null }, { nodes: [null, 4, {}] }]) {
    c.AM.state.data["genealogy:" + UUID(1)] = okData(bad);
    assert.doesNotThrow(() => render(c, "research"), JSON.stringify(bad));
  }
  for (const bad of [null, 5, { trees: "x" }, { trees: [null, 4, {}, { chain: 3 }] }]) {
    c.AM.state.data.genealogy = okData(bad);
    assert.doesNotThrow(() => render(c, "research"), JSON.stringify(bad));
  }
});

test("research/soy ağacı: XSS yükü ve gizli değer etkisiz; karar düğmesi yok; kimliği bozuk kök açılamaz", () => {
  const secret = "sk-abcdefghijklmnopqrstuvwx";
  const c = mountGen(FOREST([TREE(1, { headTitle: EVIL + secret, current: EVIL, root: UUID(1) }), TREE(2, { root: EVIL })]));
  noActiveContent(c.root);
  assert.ok(c.root.textContent.includes(EVIL));
  assert.ok(!c.root.textContent.includes(secret));
  const trees = byClass(c.root, "am-more-tree");
  assert.equal(byTag(trees[1] as FNode, "button").filter((b) => /Zinciri aç/.test(b.textContent)).length, 0, "geçersiz kimlikli kökün açma düğmesi yok");
  click(byTag(trees[0] as FNode, "button")[0] as FNode);
  c.AM.state.data["genealogy:" + UUID(1)] = okData({ nodes: [NODE(1, { title: EVIL + secret, id: EVIL, assumptions: EVIL, state: EVIL, reviewState: EVIL, decidedAt: EVIL })] });
  render(c, "research");
  noActiveContent(c.root);
  assert.ok(c.root.textContent.includes(EVIL));
  assert.ok(!c.root.textContent.includes(secret));
  assert.equal(byTag(c.root, "button").filter((b) => /onayla|reddet|sil|geri al|kaydet/i.test(b.textContent)).length, 0);
});

// ================================================================ verify
const RUNS = { runs: [
  { id: "a", taskId: "t1", provider: "claude-code", status: "passed", passed: 10, failed: 0, total: 10, createdAt: "2026-10-20T08:00:00Z" },
  { id: "b", taskId: "t2", provider: "playwright", status: "failed", passed: 3, failed: 2, total: 5, createdAt: "2026-10-21T08:00:00Z" },
  { id: "c", taskId: "t3", provider: "codex", status: "running", passed: null, failed: null, total: null, createdAt: "2026-10-22T08:00:00Z" }
] };
function mountVerify(value: unknown = RUNS): Ctx {
  const c = load([...BASE, "verify"]);
  c.AM.state.data.verification = okData(value);
  render(c, "verify");
  return c;
}

test("verify.pure: durum, sıralama ve toplamlar", () => {
  const p = load([...BASE, "verify"]).win.AM_PAGE_VERIFY.pure;
  assert.equal(p.statusInfo("passed").tone, "ok");
  assert.equal(p.statusInfo("failed").tone, "bad");
  assert.notEqual(p.statusInfo("running").tone, "ok");
  assert.notEqual(p.statusInfo("pending").tone, "ok");
  assert.equal(p.statusKey("garip"), "unknown");
  assert.notEqual(p.statusInfo("garip").tone, "ok");
  const runs = p.normRuns(RUNS);
  assert.equal(plain(p.sortRuns(runs))[0].id, "c");
  const s = plain(p.summarize(runs));
  assert.deepEqual([s.total, s.passed, s.failed], [3, 13, 2]);
  assert.equal(p.inconsistent({ passed: 9, failed: 9, total: 10 }), true);
  assert.equal(p.inconsistent({ passed: null, failed: 0, total: 3 }), false);
});

test("verify: koşu tablosu (sağlayıcı, durum, geçti/kaldı/toplam, zaman), en yeni üstte", () => {
  const c = mountVerify();
  const rows = byClass(c.root, "am-more-runrow");
  assert.equal(rows.length, 3);
  assert.ok((rows[0] as FNode).textContent.startsWith("codex"));
  assert.match((rows[1] as FNode).textContent, /playwright.*Kaldı/);
  const ok = rows[2] as FNode;
  assert.ok(hasClass(byClass(ok, "am-more-chip")[0] as FNode, "am-more-chip--ok"));
  assert.match(ok.textContent, /\d\d\.\d\d\.\d{4} \d\d:\d\d/);
  assert.ok(hasClass(byClass(rows[1] as FNode, "am-more-chip")[0] as FNode, "am-more-chip--bad"));
  assert.ok(!hasClass(byClass(rows[0] as FNode, "am-more-chip")[0] as FNode, "am-more-chip--ok"));
  const heads = byTag(byTag(c.root, "table")[0] as FNode, "th").filter((th) => th.attrs["scope"] === "col").map((th) => th.textContent);
  assert.deepEqual(heads, ["Sağlayıcı", "Durum", "Geçti", "Kaldı", "Toplam", "Zaman"]);
});

test("verify: yaklaşım açıklaması ve doğrulama türleri; planlı türler asla 'Destekleniyor' değil", () => {
  const c = mountVerify();
  assert.match(c.root.textContent, /yerel test, tarayıcı kontrolü ve bağımsız teslim denetçisi/);
  const types = byClass(c.root, "am-more-typerow");
  assert.equal(types.length, 7);
  for (const name of ["API testi", "Veri doğrulama", "Erişilebilirlik laboratuvarı", "Mutasyon testi"]) {
    const r = types.find((t) => t.textContent.startsWith(name)) as FNode;
    assert.ok(r, name);
    const ch = byClass(r, "am-more-chip")[0] as FNode;
    assert.match(ch.textContent, /Planlı/);
    assert.doesNotMatch(ch.textContent, /Destekleniyor/);
    assert.ok(!hasClass(ch, "am-more-chip--ok"));
  }
  const local = types.find((t) => t.textContent.startsWith("Yerel test")) as FNode;
  assert.match(local.textContent, /Destekleniyor/);
  const browser = types.find((t) => t.textContent.startsWith("Tarayıcı kontrolü")) as FNode;
  assert.match(browser.textContent, /Kısmi/);
});

test("verify: kayıt yoksa 'Henüz doğrulama kaydı yok' kartı (başarılı varsayılmaz)", () => {
  const c = mountVerify({ runs: [] });
  assert.match(c.root.textContent, /Henüz doğrulama kaydı yok/);
  assert.equal(byClass(c.root, "am-more-runrow").length, 0);
});

test("verify: veri yokken loadData('verification') bir kez; yükleniyor; hata + yeniden dene", () => {
  const c = load([...BASE, "verify"]);
  render(c, "verify"); render(c, "verify"); render(c, "verify");
  assert.deepEqual(c.calls.filter((x) => x[0] === "loadData"), [["loadData", ["verification"]]]);
  assert.ok(all(c.root, (n) => n.attrs["aria-busy"] === "true").length >= 1);
  c.AM.state.data.verification = { status: "error", value: null, reason: "503" };
  render(c, "verify");
  const a = alertCards(c.root);
  assert.equal(a.length, 1);
  assert.match((a[0] as FNode).textContent, /503/);
  const n0 = c.calls.length;
  click(byTag(a[0] as FNode, "button")[0] as FNode);
  assert.deepEqual(c.calls[n0], ["loadData", ["verification"]]);
});

test("verify: XSS yükü, tutarsız sayılar ve çizim hatası", () => {
  const evil = "<img src=x onerror=alert(1)>";
  const c = mountVerify({ runs: [{ id: evil, taskId: evil, provider: evil, status: evil, passed: 9, failed: 9, total: 10, createdAt: evil }] });
  noActiveContent(c.root);
  assert.ok(c.root.textContent.includes(evil));
  assert.match(c.root.textContent, /Sayılar tutarsız/);
  const f = load([...BASE, "verify"]);
  Object.defineProperty(f.AM.state, "data", { get() { throw new Error("kırık"); } });
  render(f, "verify");
  assert.equal(alertCards(f.root).length, 1);
});

// ================================================================ ortak: kaynak ve stil denetimi, simgeler, eksik metin
const JS_FILES = ["page-integrations.js", "page-skills.js", "page-research.js", "page-memory.js", "page-verify.js"];

test("güvenlik: sayfa dosyalarında yasaklı yapı ve dış kaynak yok", () => {
  const banned = [/innerHTML/, /outerHTML/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new Function/, /srcdoc/, /postMessage/, /document\.cookie/, /localStorage/, /sessionStorage/, /\bfetch\s*\(/, /XMLHttpRequest/, /setTimeout\s*\(\s*["']/, /\son[a-z]+\s*=/, /<style/i, /<script/i, /https?:\/\//, /\.style\b/, /setAttribute\(\s*["']style["']/, /\bimport\s*\(/];
  for (const f of JS_FILES) {
    const src = read(f);
    for (const b of banned) assert.ok(!b.test(src), `${f}: ${String(b)}`);
    assert.match(src, /AM_PAGES\.register/, f);
    assert.match(src, /AM_REGISTER_TR\("page-/, f);
  }
});

test("güvenlik: sayfa dosyaları AM_MD kullanmaz (güvenilmez metin düz textContent)", () => {
  for (const f of JS_FILES) assert.ok(!/AM_MD\s*[.(]/.test(read(f)), f);
});

test("stil: yalnız var(--am-*), dış kaynak yok, satır içi renk yok, 320px duyarlılık", () => {
  assert.ok(!/url\s*\(/i.test(CSS));
  assert.ok(!/@import/i.test(CSS));
  assert.ok(!/https?:\/\//i.test(CSS));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(CSS), "sabit renk yok");
  assert.ok(!/\brgba?\s*\(/i.test(CSS), "sabit renk yok");
  assert.ok(/@media \(max-width: 480px\)/.test(CSS));
  assert.ok(/overflow-x:\s*auto/.test(CSS));
  assert.ok(/prefers-reduced-motion/.test(CSS));
  assert.ok(/:focus-visible/.test(CSS));
  assert.ok(/var\(--am-focus\)/.test(CSS));
  assert.ok(/\.am-more-sr\b/.test(CSS));
  const classes = new Set<string>();
  for (const f of JS_FILES) for (const m of read(f).matchAll(/["' ]((?:am-more-[a-z0-9-]+)(?: am-more-[a-z0-9-]+)*)/g)) for (const k of (m[1] as string).split(" ")) classes.add(k);
  // Kimlik (id) değerleri ve yalnız işaret amaçlı sınıflar (satır/gövde/iç metin) stil gerektirmez.
  const exempt = (k: string) => /^am-more-(int|mm|sk|rs|vf)-/.test(k) || /row$/.test(k) || /body$/.test(k) || /-t$/.test(k) || /--$/.test(k);
  const missing = [...classes].filter((k) => !exempt(k) && !CSS.includes("." + k));
  assert.deepEqual(missing.sort(), []);
});

test("simgeler: sayfalarda kullanılan her simge adı AM_ICON'da vardır", () => {
  const c = load([...BASE, "integrations", "skills", "research", "memory", "verify"]);
  const realNames = new Set<string>();
  const probe = c.win.AM_ICON;
  void probe;
  // gerçek tanım listesi: bilinmeyen ad yedek simge (kare + çarpı, 2 çocuk) üretir; geçerli simgeler farklı yapıdadır.
  const fallback = c.win.AM_ICON("__yok__", { size: 12 }) as FNode;
  const fallbackSig = JSON.stringify(fallback.children.map((x) => x.tag));
  c.AM.state.skills = SKILLS;
  c.AM.state.data = { capabilities: okData(CAPS), calibration: okData(CAL), memoryFlags: okData({ contradictions: [{}] }), verification: okData(RUNS), "memorySearch:abc": okData({ hits: HITS(2) }) };
  for (const id of ["integrations", "skills", "research", "verify"]) { c.root.textContent = ""; render(c, id); }
  c.root.textContent = ""; render(c, "memory");
  typeInto(c, "abc"); (c.timers[0] as Timer).fn(); render(c, "memory");
  for (const n of c.iconNames) realNames.add(n);
  assert.ok(realNames.size >= 10);
  for (const name of realNames) {
    if (name === "__yok__") continue;
    const node = c.win.AM_ICON(name, { size: 12 }) as FNode;
    assert.notEqual(JSON.stringify(node.children.map((x) => x.tag)) + node.children.map((x) => JSON.stringify(x.attrs)).join(""), fallbackSig + fallback.children.map((x) => JSON.stringify(x.attrs)).join(""), `simge yok: ${name}`);
  }
});

test("yeni bölümler: eksik metin anahtarı ve eksik simge yok (bağlam 3 aşama, özet, öneri, soy ağacı)", () => {
  const c = load([...BASE, "research", "memory"]);
  const fallback = c.win.AM_ICON("__yok__", { size: 12 }) as FNode;
  const sig = (n: FNode) => JSON.stringify(n.children.map((x) => x.tag)) + n.children.map((x) => JSON.stringify(x.attrs)).join("");
  c.AM.state.data = {
    memoryFlags: okData({ contradictions: [], stale: [] }), calibration: okData(CAL), memoryImplicit: okData({ candidates: [CAND(1)], skippedAlreadyRecorded: 1 }), memoryCompile: okData(CMP({ truncated: true, maskedSecrets: 2 })),
    genealogy: FOREST([TREE(1, { truncated: true }), TREE(2, { headState: "expired", current: null })], { truncated: true }),
    ["genealogy:" + UUID(1)]: okData({ genealogy: { root: UUID(1), chain: [UUID(1), UUID(2)], current: UUID(2), depth: 2, truncated: true, nodes: [NODE(1, { state: "superseded" }), NODE(2)] } })
  };
  render(c, "research");
  click(byTag(byClass(c.root, "am-more-tree")[0] as FNode, "button")[0] as FNode);
  assert.doesNotMatch(c.root.textContent, /⟦/, "research");
  c.root.textContent = ""; render(c, "memory");
  fire(cmpForm(c), "submit");
  for (const st of ["1", "2", "3"]) {
    const key = runCtx(c, "sorgu", st);
    c.AM.state.data["memoryContext:" + key] = okData(ctxResult(Number(st), [CTX_ITEM(0, { flags: ["stale", "expired", "contradiction", "low_confidence"], summary: "s", body: "b", bodyClipped: true, contradictions: [{ otherId: "m2", detail: "d" }], links: { replaces: "m1", replacedBy: "m3" } })], { truncated: true }));
    render(c, "memory");
    assert.doesNotMatch(c.root.textContent, /⟦/, "memory aşama " + st);
  }
  assert.ok(c.iconNames.length > 0);
  for (const name of new Set(c.iconNames)) if (name !== "__yok__") assert.notEqual(sig(c.win.AM_ICON(name, { size: 12 }) as FNode), sig(fallback), "simge yok: " + name);
});

test("metinler: hiçbir sayfa çiziminde eksik anahtar (⟦…⟧) kalmaz", () => {
  const c = load([...BASE, "integrations", "skills", "research", "memory", "verify"]);
  c.AM.state.skills = SKILLS;
  c.AM.state.data = { capabilities: okData(CAPS), calibration: okData(CAL), memoryFlags: okData({ contradictions: [{ id: "f", recordId: "a", otherId: null, detail: "d" }], stale: [1] }), verification: okData(RUNS), "memorySearch:abc": okData({ hits: HITS(3) }) };
  for (const id of ["integrations", "skills", "research", "memory", "verify"]) {
    c.root.textContent = ""; render(c, id);
    if (id === "memory") { typeInto(c, "abc"); (c.timers[0] as Timer).fn(); render(c, "memory"); }
    assert.doesNotMatch(c.root.textContent, /⟦/, id);
  }
  // uzun satırlar: tüm tablolar kaydırma kutusunda
  c.root.textContent = ""; render(c, "integrations");
  assert.ok(byTag(c.root, "table").every((t) => (t.parentNode as FNode).attrs["role"] === "region" && (t.parentNode as FNode).attrs["tabindex"] === "0"));
});

test("erişilebilirlik: sayfa başlığı h2, bölümler aria-labelledby, canlı bölge, etiketli girdiler", () => {
  const c = mountInt();
  assert.equal(byTag(c.root, "h2").length, 1);
  for (const s of byTag(c.root, "section")) {
    const lab = s.attrs["aria-labelledby"] ?? s.attrs["aria-label"];
    assert.ok(lab, "bölüm adsız");
  }
  const labels = byTag(c.root, "label");
  assert.ok(labels.length >= 3);
  for (const l of labels) assert.ok(l.attrs["for"]);
  assert.ok(all(c.root, (n) => n.attrs["aria-live"] === "polite").length >= 1);
  // tüm düğmeler tür belirtir
  assert.ok(byTag(c.root, "button").every((b) => b.type === "button"));
});
