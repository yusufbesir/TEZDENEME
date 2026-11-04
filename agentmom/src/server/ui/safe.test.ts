// safe.js güvenlik testleri: güvenli markdown (XSS, şema hileleri, ReDoS, boyut/derinlik sınırları), durum gruplama,
// onay penceresi (odak tuzağı, Esc, arka plan, tek pencere), ad temizleme ve model uyuşmazlığı.
// Sahip: Yusuf. Yazan: Claude [İP:AgentMom Faz 11, safe.js]. Değiştirme kuralı: yalnız bu dosyayı yazan Claude iş parçacığı.
// Kaynak node:vm ile sahte window içinde yüklenir; DOM gerektiren bölümler için aşağıdaki en küçük sahte document kullanılır.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SRC = readFileSync(new URL("./safe.js", import.meta.url), "utf8");

// ---------------------------------------------------------------- en küçük sahte DOM
class FakeText {
  nodeType = 3;
  data: string;
  parentNode: any = null;
  constructor(d: string) { this.data = d; }
  get textContent(): string { return this.data; }
}
class FakeEl {
  nodeType = 1;
  tagName: string;
  children: any[] = [];
  parentNode: any = null;
  attrs: Record<string, string> = {};
  listeners: Record<string, Function[]> = {};
  className = "";
  disabled = false;
  doc: FakeDoc;
  constructor(tag: string, doc: FakeDoc) { this.tagName = tag.toUpperCase(); this.doc = doc; }
  set innerHTML(_v: string) { throw new Error("innerHTML YASAK"); }
  set outerHTML(_v: string) { throw new Error("outerHTML YASAK"); }
  insertAdjacentHTML(): void { throw new Error("insertAdjacentHTML YASAK"); }
  appendChild(c: any): any {
    if (c instanceof FakeFrag) { for (const k of c.children.slice()) this.appendChild(k); c.children = []; return c; }
    if (c.parentNode) c.parentNode.removeChild(c);
    c.parentNode = this; this.children.push(c); return c;
  }
  removeChild(c: any): any { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; }
  setAttribute(k: string, v: string): void { this.attrs[k] = String(v); }
  getAttribute(k: string): string | null { return Object.hasOwn(this.attrs, k) ? (this.attrs[k] as string) : null; }
  get textContent(): string { return this.children.map((c) => c.textContent).join(""); }
  set textContent(v: string) { for (const c of this.children) c.parentNode = null; this.children = [new FakeText(String(v))]; }
  addEventListener(t: string, f: Function): void { (this.listeners[t] ??= []).push(f); }
  removeEventListener(t: string, f: Function): void { this.listeners[t] = (this.listeners[t] ?? []).filter((x) => x !== f); }
  dispatch(t: string, ev: any = {}): any {
    const e = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...ev };
    for (const f of (this.listeners[t] ?? []).slice()) f(e);
    return e;
  }
  click(): void { if (!this.disabled) this.dispatch("click"); }
  focus(): void { this.doc.activeElement = this; for (const f of (this.doc.listeners["focusin"] ?? []).slice()) f({ target: this }); }
  contains(n: any): boolean { while (n) { if (n === this) return true; n = n.parentNode; } return false; }
  get isConnected(): boolean { return this.doc.body.contains(this); }
  // test yardımcıları
  all(pred: (e: FakeEl) => boolean, acc: FakeEl[] = []): FakeEl[] {
    for (const c of this.children) if (c instanceof FakeEl) { if (pred(c)) acc.push(c); c.all(pred, acc); }
    return acc;
  }
}
class FakeFrag extends FakeEl { constructor(doc: FakeDoc) { super("#fragment", doc); } }
class FakeDoc {
  activeElement: any = null;
  listeners: Record<string, Function[]> = {};
  body: FakeEl;
  created: string[] = [];
  constructor() { this.body = new FakeEl("body", this); }
  createElement(t: string): FakeEl { this.created.push(t.toLowerCase()); return new FakeEl(t, this); }
  createTextNode(d: string): FakeText { return new FakeText(String(d)); }
  createDocumentFragment(): FakeFrag { return new FakeFrag(this); }
  getElementById(id: string): FakeEl | null { return this.body.all((e) => e.getAttribute("id") === id)[0] ?? null; }
  addEventListener(t: string, f: Function): void { (this.listeners[t] ??= []).push(f); }
  removeEventListener(t: string, f: Function): void { this.listeners[t] = (this.listeners[t] ?? []).filter((x) => x !== f); }
  write(): void { throw new Error("document.write YASAK"); }
}

function load(extra: Record<string, unknown> = {}): any {
  const win: any = { ...extra };
  const ctx = vm.createContext({ window: win });
  vm.runInContext(SRC, ctx, { filename: "safe.js" });
  return win;
}
function withDom(): { win: any; doc: FakeDoc; root: FakeEl } {
  const doc = new FakeDoc();
  const root = new FakeEl("div", doc);
  root.setAttribute("id", "overlayRoot");
  doc.body.appendChild(root);
  const win = load({ document: doc });
  return { win, doc, root };
}
const j = (x: unknown): any => JSON.parse(JSON.stringify(x));
const ALLOWED_CLASSES = new Set(["am-md-p", "am-md-h1", "am-md-h2", "am-md-h3", "am-md-h4", "am-md-code", "am-md-pre",
  "am-md-quote", "am-md-ul", "am-md-ol", "am-md-table", "am-md-chip", "am-md-hr"]);
const ALLOWED_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "strong", "em", "code", "pre", "blockquote", "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td", "a", "hr", "br", "div", "span", "button"]);

function renderTo(text: string, opts?: any): { frag: FakeEl; doc: FakeDoc } {
  const { win, doc } = withDom();
  const frag = win.AM_MD.render(text, opts);
  return { frag, doc };
}
function links(frag: FakeEl): FakeEl[] { return frag.all((e) => e.tagName === "A"); }
function assertSafeTree(frag: FakeEl, doc: FakeDoc): void {
  for (const t of doc.created) assert.ok(ALLOWED_TAGS.has(t), "beklenmeyen etiket: " + t);
  for (const e of frag.all(() => true)) {
    if (e.className) assert.ok(ALLOWED_CLASSES.has(e.className), "izinsiz sınıf: " + e.className);
    for (const k of Object.keys(e.attrs)) {
      assert.ok(!/^on/i.test(k), "olay özniteliği: " + k);
      assert.notEqual(k, "style");
      assert.notEqual(k, "src");
    }
    if (e.tagName === "A") {
      assert.match(e.getAttribute("href") ?? "", /^https?:\/\//);
      assert.equal(e.getAttribute("rel"), "noopener noreferrer");
    }
  }
}

// ================================================================ kaynak denetimi
test("kaynak: yasak API yok, yükleme DOM'a dokunmaz", () => {
  for (const bad of ["innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval(", "new Function", "localStorage",
    "sessionStorage", "document.cookie", "postMessage", "srcdoc", "setTimeout(\""]) {
    assert.ok(!SRC.includes(bad), "yasak: " + bad);
  }
  // document olmadan yüklenebilmeli (yükleme anında DOM erişimi yok)
  const win = load();
  assert.equal(typeof win.AM_MD.render, "function");
  assert.equal(typeof win.AM_MD.pure.parse, "function");
  assert.equal(typeof win.AM_STATUS.pure.group, "function");
  assert.equal(typeof win.AM_NAME.pure.clean, "function");
  assert.equal(typeof win.AM_DIALOG.confirm, "function");
});

// ================================================================ AM_MD: XSS
test("md: ham HTML ve script düz metin olur", () => {
  const evil = "<script>alert(1)</script> <img src=x onerror=alert(1)> </script><svg onload=alert(1)>";
  const { frag, doc } = renderTo(evil);
  assert.equal(frag.textContent, evil);
  assert.ok(!doc.created.includes("script") && !doc.created.includes("img") && !doc.created.includes("svg"));
  assertSafeTree(frag, doc);
});

test("md: javascript/data/vbscript/file şemaları bağlantı olmaz", () => {
  const vectors = [
    "[tıkla](javascript:alert(1))",
    "[tıkla](JaVaScRiPt:alert(1))",
    "[tıkla](java\tscript:alert(1))",
    "[tıkla](java\u0000script:alert(1))",
    "[tıkla](&#x6a;avascript:alert(1))",
    "[tıkla](&#106;avascript:alert(1))",
    "[tıkla](%6Aavascript:alert(1))",
    "[tıkla](data:text/html;base64,PHNjcmlwdD4=)",
    "[tıkla](vbscript:msgbox(1))",
    "[tıkla](file:///C:/Windows/win.ini)",
    "[tıkla](//evil.example)",
    "[tıkla](/yerel/yol)",
    "[tıkla]( javascript:alert(1))",
    "[tıkla](https://evil.example\u202E/gnp.exe)",
    "[tıkla](https://google.com@evil.example/)",
    "[tıkla](https://ev il.example/)",
    "[tıkla](https:\\\\evil.example)",
    "[tıkla](https://)",
  ];
  for (const v of vectors) {
    const { frag, doc } = renderTo(v);
    assert.equal(links(frag).length, 0, "bağlantı üretmemeli: " + JSON.stringify(v));
    assertSafeTree(frag, doc);
  }
});

test("md: güvenli https bağlantısı rel/target ile çizilir", () => {
  const { frag, doc } = renderTo("Bak: [belge](https://example.com/a?b=1#c) ve [HTTP](HTTP://example.org)");
  const a = links(frag);
  assert.equal(a.length, 2);
  assert.equal(a[0]!.getAttribute("href"), "https://example.com/a?b=1#c");
  assert.equal(a[0]!.getAttribute("rel"), "noopener noreferrer");
  assert.equal(a[0]!.getAttribute("target"), "_blank");
  assert.equal(a[0]!.textContent, "belge");
  assert.equal(a[1]!.getAttribute("href"), "http://example.org", "şema küçük harfe normalleşir");
  assertSafeTree(frag, doc);
});

test("md: görseller çizilmez, yalnız alt metin görünür", () => {
  const { frag, doc } = renderTo("önce ![gizli izleyici](https://evil.example/pixel.png) sonra");
  assert.equal(frag.textContent, "önce gizli izleyici sonra");
  assert.equal(links(frag).length, 0);
  assert.ok(!doc.created.includes("img"));
});

test("md: çıplak URL çip olur, sondaki noktalama dışarıda kalır", () => {
  const cases: Array<[string, string]> = [
    ["Bkz. https://example.com/yol.", "https://example.com/yol"],
    ["(bkz. https://example.com/a_(b))", "https://example.com/a_(b)"],
    ["Şuraya bak: https://example.com/x?y=1, sonra", "https://example.com/x?y=1"],
    ["https://example.com/a!?", "https://example.com/a"],
    ["<https://example.com/z>", "https://example.com/z"],
  ];
  for (const [src, href] of cases) {
    const { frag } = renderTo(src);
    const a = links(frag);
    assert.equal(a.length, 1, src);
    assert.equal(a[0]!.getAttribute("href"), href, src);
    assert.equal(a[0]!.className, "am-md-chip");
  }
  // sözcük içinde ve kullanıcı bilgisiyle URL çip değildir
  assert.equal(links(renderTo("xhttps://example.com").frag).length, 0);
  assert.equal(links(renderTo("https://admin:pw@evil.example").frag).length, 0);
  assert.equal(links(renderTo("javascript://example.com/%0aalert(1)").frag).length, 0);
});

test("md: satır içi kod ve çitli kod düz metin; dil etiketi metin; Kopyala düğmesi", () => {
  const copied: string[] = [];
  const src = "Çalıştır `<b>x</b>`\n\n```html\"><script>alert(1)</script>\n<img src=x onerror=alert(1)>\n```";
  const { frag, doc } = renderTo(src, { onCopy: (c: string) => copied.push(c) });
  const codes = frag.all((e) => e.tagName === "CODE");
  assert.equal(codes[0]!.textContent, "<b>x</b>");
  assert.equal(codes[0]!.className, "am-md-code");
  assert.equal(codes[1]!.textContent, "<img src=x onerror=alert(1)>");
  const lang = frag.all((e) => e.getAttribute("data-md") === "lang")[0]!;
  assert.equal(lang.textContent, "html\"><script>alert(1)</script>".slice(0, 32));
  const btn = frag.all((e) => e.tagName === "BUTTON")[0]!;
  assert.equal(btn.textContent, "Kopyala");
  btn.click();
  assert.deepEqual(copied, ["<img src=x onerror=alert(1)>"]);
  assertSafeTree(frag, doc);
  // onCopy yoksa düğme yok
  assert.equal(renderTo("```\nx\n```").frag.all((e) => e.tagName === "BUTTON").length, 0);
});

test("md: başlık, kalın, italik, alıntı, ayraç, listeler, tablo", () => {
  const src = [
    "# Bir", "#### Dört", "##### beş olmaz",
    "**kalın** ve *italik* ve **_karışık_**",
    "> alıntı **kalın**", "",
    "---",
    "- a", "- b", "  - b1", "  - b2", "", "3. üç", "4. dört", "",
    "| A | B |", "|---|:-:|", "| `x|y` | <i>z</i> |", "| \\| kaçış | 2 |",
  ].join("\n");
  const { frag, doc } = renderTo(src);
  const tags = (t: string) => frag.all((e) => e.tagName === t);
  assert.equal(tags("H1")[0]!.className, "am-md-h1");
  assert.equal(tags("H4")[0]!.textContent, "Dört");
  assert.ok(frag.textContent.includes("##### beş olmaz"));
  assert.equal(tags("STRONG")[0]!.textContent, "kalın");
  assert.equal(tags("EM")[0]!.textContent, "italik");
  assert.equal(tags("BLOCKQUOTE")[0]!.className, "am-md-quote");
  assert.equal(tags("HR").length, 1);
  assert.equal(tags("UL")[0]!.className, "am-md-ul");
  assert.equal(tags("UL").length, 2, "bir iç içe seviye");
  assert.equal(tags("OL")[0]!.getAttribute("start"), "3");
  assert.equal(tags("TABLE")[0]!.className, "am-md-table");
  assert.equal(tags("TH").length, 2);
  assert.equal(tags("TD")[0]!.textContent, "x|y", "kod içindeki | hücre ayırmaz");
  assert.equal(tags("TD")[1]!.textContent, "<i>z</i>");
  assert.equal(tags("TD")[2]!.textContent, "| kaçış");
  assertSafeTree(frag, doc);
});

test("md: iç içe liste ve alıntı bombası sınırlı", () => {
  let deepList = "";
  for (let i = 0; i < 300; i++) deepList += " ".repeat(i * 2) + "- seviye " + i + "\n"; // ~90k karakter (<200k)
  const { frag } = renderTo(deepList);
  const uls = frag.all((e) => e.tagName === "UL");
  assert.ok(uls.length <= 2, "en çok iki liste seviyesi: " + uls.length);
  assert.ok(frag.textContent.includes("seviye 299"), "içerik kaybolmaz");

  const inlineBomb = "- ".repeat(5000) + "x";
  const r2 = renderTo(inlineBomb);
  assert.ok(r2.frag.all((e) => e.tagName === "UL").length <= 1);

  const quoteBomb = ">".repeat(10000) + " derin";
  const t0 = performance.now();
  const r3 = renderTo(quoteBomb);
  assert.ok(performance.now() - t0 < 1500);
  assert.ok(r3.frag.all((e) => e.tagName === "BLOCKQUOTE").length <= 6);
  assert.ok(r3.frag.textContent.includes("derin"));

  const emBomb = "**".repeat(3000) + "a" + "**".repeat(3000);
  const tree = load().AM_MD.parse(emBomb);
  let depth = 0;
  const walk = (n: any, d: number) => { depth = Math.max(depth, d); for (const c of n.children ?? []) walk(c, d + 1); };
  walk(tree, 0);
  assert.ok(depth < 12, "satır içi derinlik sınırlı: " + depth);
});

test("md: çok büyük girdi kısaltılır ve not eklenir", () => {
  const big = "a".repeat(250_000);
  const { frag } = renderTo(big);
  const ps = frag.all((e) => e.tagName === "P");
  assert.match(ps[ps.length - 1]!.textContent, /kısaltıldı/);
  assert.equal(ps[0]!.textContent.length, 200_000);
  const win = load();
  assert.equal(win.AM_MD.parse("x".repeat(200_000)).truncated, false);
  assert.equal(win.AM_MD.parse("x".repeat(200_001)).truncated, true);
  // vekil çiftin ortasından kesilmez
  const emoji = "a".repeat(199_999) + "😀😀";
  const p = win.AM_MD.parse(emoji);
  const txt = p.children[0].children[0].text as string;
  assert.ok(!/[\uD800-\uDBFF]$/.test(txt));
});

test("md: ReDoS kalıpları doğrusal sürede biter", () => {
  const win = load();
  const N = 100_000;
  const patterns = [
    "[".repeat(N),
    "[a](".repeat(N / 4),
    "![".repeat(N / 2),
    "`".repeat(N),
    "` `` ``` ".repeat(N / 10),
    "*a ".repeat(N / 3),
    "**a ".repeat(N / 4),
    "_*".repeat(N / 2),
    "https://" + "a".repeat(N),
    "https://a.b/" + "(".repeat(N / 2) + ")".repeat(N / 2) + ".",
    "\\".repeat(N),
    "|".repeat(N) + "\n" + "|-".repeat(N / 2),
    ("- a\n  b\n").repeat(N / 8),
    ("> ".repeat(20) + "x\n").repeat(N / 50),
    "# ".repeat(N / 2),
    "```\n".repeat(N / 4),
  ];
  for (const p of patterns) {
    const t0 = performance.now();
    win.AM_MD.parse(p);
    const ms = performance.now() - t0;
    assert.ok(ms < 2000, "çok yavaş (" + Math.round(ms) + " ms): " + JSON.stringify(p.slice(0, 20)));
  }
});

test("md: safeHref saf denetimleri", () => {
  const h = load().AM_MD.pure.safeHref;
  assert.equal(h("https://example.com"), "https://example.com");
  assert.equal(h("HtTpS://Example.com/Yol"), "https://Example.com/Yol");
  assert.equal(h("https://[::1]:8080/x"), "https://[::1]:8080/x");
  assert.equal(h("https://example.com\u200B"), null);
  assert.equal(h("https://exa\u2066mple.com"), null);
  assert.equal(h("https://example.com/\n"), null);
  assert.equal(h("javascript:alert(1)//https://x"), null);
  assert.equal(h(" https://example.com"), null);
  assert.equal(h("https://" + "a".repeat(3000)), null);
  assert.equal(h(42 as any), null);
});

test("md: bağlantı metni içinde iç içe bağlantı/çip üretilmez", () => {
  const { win, doc } = withDom();
  const frag = win.AM_MD.render("[https://evil.example](https://example.com) https://ok.example");
  // Metni başka bir adres gibi görünen bağlantı (oltalama) çizilmez: düz metin kalır; yalnız dürüst çıplak URL çip olur.
  assert.equal(links(frag).length, 1);
  assertSafeTree(frag, doc);
});

// ================================================================ AM_STATUS
test("status: gruplama, sıralama, bilinmeyen durum", () => {
  const S = load().AM_STATUS;
  const topics = [
    { id: "a", state: "running", updatedAt: "2026-10-22T10:00:00Z" },
    { id: "b", state: "awaiting_approval", updatedAt: "2026-10-22T11:00:00Z" },
    { id: "c", state: "pending", updatedAt: "2026-10-22T12:00:00Z" },
    { id: "d", state: "failed", updatedAt: "2026-10-22T09:00:00Z" },
    { id: "e", state: "failed", archived: true, updatedAt: "2026-10-22T09:30:00Z" },
    { id: "f", state: "denied", updatedAt: "2026-10-21T09:00:00Z" },
    { id: "g", state: "cancelled", updatedAt: "2026-10-21T10:00:00Z" },
    { id: "h", state: "idle", updatedAt: 5 },
    { id: "i", state: "created", updatedAt: 10 },
    { id: "k", state: "approved", updatedAt: "2026-10-22T13:00:00Z" },
    { id: "l", state: "teleporting", updatedAt: "2026-10-22T08:00:00Z" },
    { id: "m", state: "__proto__" },
    { id: "n", state: null },
    { id: "o", state: "succeeded", updatedAt: "bozuk-tarih" },
    { id: "p", state: "done", updatedAt: "2026-10-20T00:00:00Z" },
    { id: "q", state: "blocked", updatedAt: "2026-10-22T07:00:00Z" },
    { id: "r", state: "awaiting_approval", archived: true, updatedAt: "2026-10-22T06:00:00Z" },
    { id: "s", state: " RUNNING ", updatedAt: "2026-10-22T05:00:00Z" },
    null, 7, "x",
  ];
  const g = j(S.group(topics));
  const ids = (k: string) => g[k].map((t: any) => t.id);
  assert.deepEqual(ids("waiting"), ["c", "b", "d", "l", "q", "r", "m", "n"]);
  assert.deepEqual(ids("running"), ["k", "a", "s"]);
  assert.deepEqual(ids("idle"), ["i", "h"]);
  assert.deepEqual(ids("resolved"), ["e", "g", "f", "p", "o"]);
  const total = ids("waiting").length + ids("running").length + ids("idle").length + ids("resolved").length;
  assert.equal(total, 18, "hiçbir konu sessizce kaybolmaz");
  assert.deepEqual(j(S.group(undefined)), { waiting: [], running: [], idle: [], resolved: [] });
  assert.deepEqual(j(S.group({ length: 3 })), { waiting: [], running: [], idle: [], resolved: [] });
});

test("status: label şekil + ton + anahtar; bilinmeyen '?'", () => {
  const S = load().AM_STATUS;
  const shapes = new Set<string>();
  for (const st of ["pending", "awaiting_approval", "blocked", "running", "approved", "idle", "created", "succeeded",
    "done", "cancelled", "denied", "failed", "unavailable"]) {
    const l = S.label(st);
    assert.equal(l.key, "status." + st);
    assert.ok(["●", "◐", "✓", "✕", "!", "⏸", "?"].includes(l.shape), st);
    assert.ok(["ok", "warn", "bad", "muted", "info"].includes(l.tone), st);
    shapes.add(l.shape);
  }
  assert.ok(shapes.size >= 5, "renk tek ipucu değil: farklı şekiller");
  assert.deepEqual(j(S.label("weird<script>")), { key: "status.unknown", shape: "?", tone: "warn" });
  assert.deepEqual(j(S.label(undefined)), { key: "status.unknown", shape: "?", tone: "warn" });
  assert.equal(S.label("constructor").shape, "?");
  assert.equal(S.label("succeeded").tone, "ok");
  assert.equal(S.label("failed").tone, "bad");
});

// ================================================================ AM_NAME
test("name: temizleme (bidi, sıfır genişlik, kontrol, NFKC, uzunluk)", () => {
  const N = load().AM_NAME;
  assert.equal(N.MAX, 60);
  assert.equal(N.clean("  Kod \t\n  gözden   geçirici  "), "Kod gözden geçirici");
  assert.equal(N.clean("fatura\u202Egpj.exe"), "faturagpj.exe");
  assert.equal(N.clean("a\u2066b\u2069c\u200Ed\u200Fe"), "abcde");
  assert.equal(N.clean("gi\u200Bz\u200Dli\uFEFF"), "gizli");
  assert.equal(N.clean("x\u0000y\u0007z\u009Fw"), "x y z w");
  assert.equal(N.clean("ｏｐｕｓ ﬁ"), "opus fi");
  assert.equal(N.clean("a\uDB40\uDC41\uDB40\uDC42b"), "ab", "etiket karakterleri (görünmez kaçakçılık)");
  assert.equal(N.clean("\u200B\u202E  \u2066"), "");
  assert.equal(N.clean(null), "");
  assert.equal(N.clean({ toString() { return "x"; } } as any), "");
  const long = N.clean("ş".repeat(100));
  assert.equal(Array.from(long).length, 60);
  const emo = N.clean("😀".repeat(80));
  assert.equal(Array.from(emo).length, 60);
  assert.ok(!/[\uD800-\uDBFF]$/.test(emo), "vekil çift bölünmez");
});

test("name: modelMismatch", () => {
  const N = load().AM_NAME;
  assert.deepEqual(j(N.modelMismatch("Opus denetçi", "claude-opus-5-5")), { mismatch: false, nameFamily: "opus", modelFamily: "opus" });
  assert.deepEqual(j(N.modelMismatch("opus denetçi", "claude-sonnet-5-5")), { mismatch: true, nameFamily: "opus", modelFamily: "sonnet" });
  assert.equal(N.modelMismatch("HAIKU okuyucu", "unknown").mismatch, true, "model bilinmiyorsa uyarı");
  assert.equal(N.modelMismatch("haiku okuyucu", null).mismatch, true);
  assert.equal(N.modelMismatch("Okuyucu", "claude-haiku-5").mismatch, false, "ad aile söylemiyorsa uyarı yok");
  assert.equal(N.modelMismatch("Okuyucu", "claude-haiku-5").modelFamily, "haiku");
  assert.equal(N.modelMismatch("haikular", "claude-opus-5").mismatch, false, "sözcük sınırı");
  assert.equal(N.modelMismatch("sonnet-yardımcı", "claude-sonnet-5").mismatch, false);
  assert.equal(N.modelMismatch("op\u200Bus", "claude-sonnet-5").nameFamily, "opus", "sıfır genişlik hilesi temizlenir");
  assert.equal(N.modelMismatch("ＯＰＵＳ", "claude-sonnet-5").mismatch, true, "tam genişlik NFKC");
  assert.equal(N.modelMismatch("opus ya da sonnet", "claude-opus-5").mismatch, true, "çelişkili ad");
  assert.equal(N.modelMismatch("Fable ajanı", "claude-fable-1").mismatch, false);
});

// ================================================================ AM_DIALOG
test("dialog: yapı, etiketli satırlar, varsayılan odak, sonuç ve odak geri dönüşü", async () => {
  const { win, doc, root } = withDom();
  const opener = new FakeEl("button", doc);
  doc.body.appendChild(opener);
  opener.focus();
  const p = win.AM_DIALOG.confirm({ title: "Arşivle?", action: "Arşivle", target: "<img src=x onerror=alert(1)>\u202Eexe.txt", detail: "geri alınabilir", danger: true });
  const ov = root.children[0] as FakeEl;
  assert.equal(ov.className, "am-overlay");
  assert.equal(ov.getAttribute("data-owner"), "dialog");
  const box = ov.children[0] as FakeEl;
  assert.equal(box.getAttribute("role"), "alertdialog");
  assert.equal(box.getAttribute("aria-modal"), "true");
  const title = doc.getElementById(box.getAttribute("aria-labelledby")!)!;
  assert.equal(title.textContent, "Arşivle?");
  assert.ok(doc.getElementById(box.getAttribute("aria-describedby")!));
  const rows = box.all((e) => e.getAttribute("data-row") !== null);
  assert.equal(rows[0]!.textContent, "Eylem: Arşivle");
  assert.equal(rows[1]!.textContent, "Hedef: <img src=x onerror=alert(1)>exe.txt", "hedef metin, bidi temizli");
  const buttons = box.all((e) => e.tagName === "BUTTON");
  assert.equal(buttons.length, 2, "yalnız iki seçenek; kalıcı silme yok");
  assert.ok(!/kalıcı|sil/i.test(box.textContent));
  assert.equal(doc.activeElement.getAttribute("data-action"), "cancel", "danger: varsayılan odak İPTAL");
  buttons[1]!.click();
  buttons[1]!.click(); // çift tıklama
  assert.equal(await p, true);
  assert.equal(root.children.length, 0);
  assert.equal(doc.activeElement, opener, "odak önceki öğeye döner");
});

test("dialog: Esc iptal, arka plan tıklaması iptal, iç tıklama iptal değil", async () => {
  const { win, root } = withDom();
  const p1 = win.AM_DIALOG.confirm({ action: "a", target: "b" });
  (root.children[0] as FakeEl).dispatch("keydown", { key: "Escape" });
  assert.equal(await p1, false);

  const p2 = win.AM_DIALOG.confirm({ action: "a", target: "b" });
  const ov = root.children[0] as FakeEl;
  const box = ov.children[0] as FakeEl;
  ov.dispatch("mousedown", { target: box });
  ov.dispatch("click", { target: ov }); // içeride başlayıp dışarıda biten sürükleme iptal etmez
  assert.equal(root.children.length, 1);
  ov.dispatch("mousedown", { target: ov });
  ov.dispatch("click", { target: ov });
  assert.equal(await p2, false);
  assert.equal(root.children.length, 0);
});

test("dialog: odak tuzağı Tab/Shift+Tab ve dışarı kaçan odak", async () => {
  const { win, doc, root } = withDom();
  const outside = new FakeEl("button", doc);
  doc.body.appendChild(outside);
  const p = win.AM_DIALOG.confirm({ action: "a", target: "b" });
  const ov = root.children[0] as FakeEl;
  const [cancel, ok] = ov.all((e) => e.tagName === "BUTTON");
  assert.equal(doc.activeElement, ok, "danger değilken varsayılan odak onayda");
  const e1 = ov.dispatch("keydown", { key: "Tab" });
  assert.equal(doc.activeElement, cancel);
  assert.ok(e1.defaultPrevented);
  ov.dispatch("keydown", { key: "Tab", shiftKey: true });
  assert.equal(doc.activeElement, ok);
  ov.dispatch("keydown", { key: "Tab", shiftKey: true });
  assert.equal(doc.activeElement, cancel);
  outside.focus(); // odak dışarı kaçarsa pencereye geri çekilir
  assert.ok(ov.contains(doc.activeElement));
  win.AM_DIALOG.close();
  assert.equal(await p, false);
});

test("dialog: aynı anda tek pencere; kök yoksa güvenli iptal; AM_T çevirisi", async () => {
  const { win, root } = withDom();
  const p1 = win.AM_DIALOG.confirm({ action: "bir", target: "x" });
  const p2 = win.AM_DIALOG.confirm({ action: "iki", target: "y" });
  assert.equal(await p1, false, "ikinci çağrı öncekini false ile çözer");
  assert.equal(root.children.length, 1);
  assert.ok((root.children[0] as FakeEl).textContent.includes("iki"));
  win.AM_DIALOG.close();
  assert.equal(await p2, false);

  const bare = load({ document: new FakeDoc() });
  assert.equal(await bare.AM_DIALOG.confirm({ action: "a", target: "b" }), false);

  const doc = new FakeDoc();
  const r = new FakeEl("div", doc);
  r.setAttribute("id", "overlayRoot");
  doc.body.appendChild(r);
  const dict: Record<string, string> = { "dlg.title": "Çevrilmiş başlık", "safe.dialog.target": "HEDEF" };
  const tw = load({ document: doc, AM_T: (k: string) => dict[k] ?? "⟦" + k + "⟧" });
  const p3 = tw.AM_DIALOG.confirm({ title: "dlg.title", action: "dlg.title", target: "t", confirmLabel: "Evet" });
  const box = (r.children[0] as FakeEl).children[0] as FakeEl;
  assert.equal(box.all((e) => e.tagName === "H2")[0]!.textContent, "Çevrilmiş başlık");
  const rows = box.all((e) => e.getAttribute("data-row") !== null);
  assert.equal(rows[0]!.textContent, "Eylem: dlg.title", "eylem veridir, çevrilmez");
  assert.equal(rows[1]!.textContent, "HEDEF: t");
  assert.equal(box.all((e) => e.getAttribute("data-action") === "confirm")[0]!.textContent, "Evet");
  tw.AM_DIALOG.close();
  assert.equal(await p3, false);
});

test("dialog: hedef satırı varsayılan 2000 karakterle kısalır; targetMax (en çok 8000) verilirse TAMAMI görünür (model yeteneği: gösterilen = gönderilen)", () => {
  const { win, root } = withDom();
  const long = "a".repeat(3900) + "SON";
  for (const [opts, expectFull] of [[{ action: "a", target: long }, false], [{ action: "a", target: long, targetMax: 8000 }, true], [{ action: "a", target: long, targetMax: 999999 }, false], [{ action: "a", target: long, targetMax: "8000" }, false]] as Array<[Record<string, unknown>, boolean]>) {
    win.AM_DIALOG.confirm(opts);
    const box = (root.children[0] as FakeEl).children[0] as FakeEl;
    const target = box.all((e) => e.getAttribute("data-row") === "target")[0]!.textContent;
    assert.equal(target.includes("SON"), expectFull, String(opts.targetMax));
    if (!expectFull) assert.ok(target.length <= "Hedef: ".length + 2000);
    win.AM_DIALOG.close();
  }
});
