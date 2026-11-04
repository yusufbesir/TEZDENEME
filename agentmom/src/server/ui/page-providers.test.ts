// D3 sayfaları testleri: page-providers.js (Sağlayıcılar), page-models.js (Modeller ve Ajanlar), page-usage.js (Kullanım ve Maliyetler) ve page-providers.css.
// Sahip: Sonnet [İP:AgentMom Faz 11, D3]. yazan: [Claude#agentmom-faz11-d3-saglayicilar]
// Kaynaklar node:vm ile sahte window/document/AM_PAGES içinde yüklenir; ağ yok, tarayıcı yok, model çağrısı yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (f: string): string => readFileSync(join(dir, f), "utf8");
const SRC = {
  strings: read("strings.js"), icons: read("icons.js"), safe: read("safe.js"),
  providers: read("page-providers.js"), models: read("page-models.js"), usage: read("page-usage.js")
};
const CSS = read("page-providers.css");

// ---------- Sahte DOM: yalnız bu sayfaların kullandığı yüzey ----------
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
  hidden = false;
  disabled = false;
  value = "";
  type = "";
  id = "";
  tabIndex: number;
  isRoot = false;
  doc: FDoc;
  constructor(tag: string, doc: FDoc) {
    this.nodeName = tag.toUpperCase();
    this.doc = doc;
    this.tabIndex = ["button", "input", "select", "textarea", "a"].includes(tag) ? 0 : -1;
  }
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
  removeAttribute(k: string) { delete this.attrs[k]; }
  addEventListener(t: string, fn: Fn) { (this.listeners[t] ||= []).push(fn); }
  focus() { this.doc.activeElement = this; }
  contains(n: FNode | null): boolean { while (n) { if (n === this) return true; n = n.parentNode; } return false; }
  querySelectorAll(sel: string): FNode[] {
    const out: FNode[] = [];
    const m = /^\[([\w-]+)\]$/.exec(sel);
    const walk = (n: FNode) => { for (const c of n.children) { if (m && c.nodeType === 1 && c.getAttribute(m[1] as string) !== null) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
}
class FDoc {
  activeElement: FNode | null = null;
  createElement(tag: string) { return new FNode(tag, this); }
  createElementNS(_ns: string, tag: string) { return new FNode(tag, this); }
  createDocumentFragment() { return new FNode("#frag", this); }
  createTextNode(t: string) { const n = new FNode("#text", this); n.nodeType = 3; n.own = t; return n; }
  createTreeWalker() { return { nextNode: () => null }; }
}

interface Reg { id: string; spec: { title: string; group: string; render: (AM: any, root: FNode, param?: string) => void } }
interface Ctx { win: any; doc: FDoc; calls: Array<[string, unknown]>; AM: any; regs: Reg[] }

function load(files: Array<keyof typeof SRC>, opts: { pages?: boolean } = {}): Ctx {
  const doc = new FDoc();
  const regs: Reg[] = [];
  const sandbox: any = { document: doc, setTimeout: () => 1, clearTimeout: () => undefined };
  sandbox.window = sandbox;
  if (opts.pages !== false) sandbox.AM_PAGES = { register(id: string, spec: Reg["spec"]) { regs.push({ id, spec }); } };
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(SRC[f], sandbox, { filename: f + ".js" });
  const calls: Array<[string, unknown]> = [];
  const AM: any = {
    state: { connected: true, busy: false, providers: [], data: {}, docs: {}, policy: null, subsessions: [], usage: null },
    view: { page: "providers", pageParam: "" },
    actions: {
      setView(p: unknown) { calls.push(["setView", p]); return undefined; },
      loadData(n: string, p?: string) { calls.push(["loadData", [n, p]]); return Promise.resolve(); },
      providerAction(id: string, v: string) { calls.push(["providerAction", [id, v]]); return Promise.resolve(); },
      loadDoc(n: string) { calls.push(["loadDoc", n]); return Promise.resolve(); },
      loadUsage() { calls.push(["loadUsage", null]); return Promise.resolve(); },
      openProjectSettings(p: string) { calls.push(["openProjectSettings", p]); return Promise.resolve(); },
      copyText(t: string) { calls.push(["copyText", t]); return Promise.resolve(true); }
    }
  };
  return { win: sandbox, doc, calls, AM, regs };
}

function bootAll(): Ctx {
  return load(["strings", "icons", "safe", "providers", "models", "usage"]);
}
function pageOf(c: Ctx, id: string) {
  const r = c.regs.find((x) => x.id === id);
  assert.ok(r, "sayfa kayıtlı olmalı: " + id);
  return (r as Reg).spec;
}
function newRoot(doc: FDoc): FNode { const r = doc.createElement("div"); r.isRoot = true; return r; }
function draw(c: Ctx, id: string, param = ""): FNode {
  const root = newRoot(c.doc);
  pageOf(c, id).render(c.AM, root, param);
  return root;
}
function walk(n: FNode, fn: (x: FNode) => void) { for (const k of n.children) { fn(k); walk(k, fn); } }
function findAll(root: FNode, pred: (n: FNode) => boolean): FNode[] { const out: FNode[] = []; walk(root, (n) => { if (pred(n)) out.push(n); }); return out; }
function byTag(root: FNode, tag: string): FNode[] { return findAll(root, (n) => n.tag === tag); }
function button(root: FNode, label: string | RegExp): FNode {
  const b = findAll(root, (n) => n.tag === "button" && (typeof label === "string" ? n.textContent.includes(label) : label.test(n.textContent)))[0];
  assert.ok(b, "düğme bulunamadı: " + String(label));
  return b as FNode;
}
function click(n: FNode) { for (const f of n.listeners["click"] ?? []) f({ target: n, preventDefault() {}, stopPropagation() {} }); }
const names = (calls: Ctx["calls"], n: string) => calls.filter((c) => c[0] === n).map((c) => JSON.parse(JSON.stringify(c[1])));

const CAPS_MIX = [
  { operation: "describeCapabilities", status: "verified", evidence: "yerel", verifiedAt: "2026-10-21T10:00:00Z" },
  { operation: "execute", status: "partial", evidence: "gerçek çalıştırma 2026-10-21", verifiedAt: "2026-10-21T17:28:00Z" },
  { operation: "cancel", status: "unverified", evidence: "yalnız sahte süreç", verifiedAt: null },
  { operation: "resume", status: "unsupported", evidence: null, verifiedAt: null }
];
const LIST_PROVIDERS = [
  { id: "claude-code", displayName: "Claude Code", routeKind: "subscription", capabilities: CAPS_MIX.map((c) => ({ operation: c.operation, status: c.status })) },
  { id: "gemini", displayName: "Gemini", routeKind: "subscription", capabilities: [{ operation: "execute", status: "unavailable" }] }
];
function detail(over: Record<string, unknown> = {}) {
  return {
    provider: {
      id: "claude-code", displayName: "Claude Code", routeKind: "subscription", authMethod: "claude.ai", enabled: true, allowedByPolicy: true, version: "2.1.306",
      capabilities: CAPS_MIX, models: [], lastSuccess: null, lastErrors: [], docs: "claude-code", limits: null, ...over
    }
  };
}

// ================================================================ yükleme / kayıt
test("çerçeve (AM_PAGES) yoksa üç sayfa dosyası da GÖRÜNÜR hata fırlatır", () => {
  for (const f of ["providers", "models", "usage"] as const) {
    assert.throws(() => load(["strings", "icons", f], { pages: false }), /AM_PAGES/);
  }
});

test("üç sayfa doğru kimlikle, başlık ve grupla kaydolur; yükleme DOM'a dokunmaz", () => {
  const c = bootAll();
  assert.deepEqual(c.regs.map((r) => r.id).sort(), ["models", "providers", "usage"]);
  for (const r of c.regs) {
    assert.equal(typeof r.spec.render, "function");
    assert.ok(r.spec.title.length > 2 && !r.spec.title.startsWith("⟦"));
    assert.ok(r.spec.group.length > 0);
  }
  assert.equal(pageOf(c, "providers").title, "AI Bağlantıları ve Sağlayıcılar");
  assert.equal(pageOf(c, "models").title, "Modeller ve Ajanlar");
  assert.equal(pageOf(c, "usage").title, "Kullanım ve Maliyetler");
});

test("kullanılan her literal metin anahtarı kayıtlıdır (⟦anahtar⟧ görünmez) ve anahtarlar modül adıyla başlar", () => {
  const c = bootAll();
  for (const f of ["providers", "models", "usage"] as const) {
    const keys = new Set([...SRC[f].matchAll(/T\("(page-[a-z]+\.[A-Za-z0-9_.]*[A-Za-z0-9_])"/g)].map((m) => m[1] as string));
    assert.ok(keys.size > 10);
    for (const k of keys) assert.ok(!String(c.win.AM_T(k)).startsWith("⟦"), "eksik anahtar: " + k);
  }
  assert.ok(!String(c.win.AM_T("page-providers.level.ready")).startsWith("⟦"));
  assert.ok(String(c.win.AM_T("page-providers.yok")).startsWith("⟦"));
});

test("dinamik anahtarlar (durum, kullanılabilirlik, alt oturum durumu, komut) hepsi tanımlıdır", () => {
  const c = bootAll();
  const dyn = [
    ...["ready", "partial", "unverified", "unavailable", "disabled", "unknown"].map((s) => "page-providers.level." + s),
    ...["verified", "partial", "unverified", "unsupported", "unavailable"].map((s) => "page-providers.status." + s),
    ...["yes", "partial", "unverified", "unsupported", "unavailable"].map((s) => "page-providers.use." + s),
    ...["reconnect", "update", "disconnect"].flatMap((s) => ["page-providers.cmd." + s, "page-providers.cmd." + s + "Desc"]),
    ...["idle", "running", "awaiting_approval", "done", "failed", "unavailable", "unknown"].map((s) => "page-models.state." + s),
    ...["run", "declared", "unknown"].map((s) => "page-models.sub.src." + s),
    ...["input", "output", "cacheWrite", "cacheRead"].map((s) => "page-usage.kind." + s)
  ];
  for (const k of dyn) assert.ok(!String(c.win.AM_T(k)).startsWith("⟦"), "eksik anahtar: " + k);
});

// ================================================================ saf mantık: sağlayıcılar
test("pure: bilinmeyen yetenek durumu 'doğrulandı' olmaz (unverified'a düşer)", () => {
  const p = bootAll().win.AM_PAGE_PROVIDERS.pure;
  assert.equal(p.normStatus("verified"), "verified");
  assert.equal(p.normStatus("VERIFIED"), "verified");
  assert.equal(p.normStatus("harika"), "unverified");
  assert.equal(p.normStatus(undefined), "unverified");
});

test("pure: providerLevel yalnız tüm yetenekler doğrulandıysa 'ready' olur; unverified asla verified gibi sayılmaz", () => {
  const p = bootAll().win.AM_PAGE_PROVIDERS.pure;
  assert.equal(p.providerLevel([{ status: "verified" }, { status: "verified" }], false), "ready");
  assert.equal(p.providerLevel([{ status: "verified" }, { status: "unverified" }], false), "partial");
  assert.equal(p.providerLevel([{ status: "unverified" }, { status: "unverified" }], false), "unverified");
  assert.equal(p.providerLevel([{ status: "unavailable" }], false), "unavailable");
  assert.equal(p.providerLevel([{ status: "unsupported" }], false), "unavailable");
  assert.equal(p.providerLevel([], false), "unknown");
  assert.equal(p.providerLevel([{ status: "verified" }], true), "disabled");
});

test("pure: usability yalnız verified'ı tam, partial'ı kısmen kullanılabilir sayar; kalanı kullanılamaz", () => {
  const p = bootAll().win.AM_PAGE_PROVIDERS.pure;
  assert.equal(p.usability("verified").usable, "yes");
  assert.equal(p.usability("partial").usable, "partial");
  for (const s of ["unverified", "unsupported", "unavailable", "bilinmeyen"]) assert.equal(p.usability(s).usable, "no", s);
});

test("pure: komutlar yalnız bilinen sağlayıcılar için; bilinmeyen için komut uydurulmaz", () => {
  const p = bootAll().win.AM_PAGE_PROVIDERS.pure;
  assert.equal(p.commandsFor("claude-code").reconnect, "claude auth login");
  assert.equal(p.commandsFor("codex").reconnect, "codex login");
  assert.equal(p.commandsFor("gemini").reconnect, null);
  assert.deepEqual({ ...p.commandsFor("hayali") }, { reconnect: null, update: null, disconnect: null });
});

test("pure: belge adı beyaz listede olmalı; yol gezme ve bilinmeyen ad reddedilir", () => {
  const p = bootAll().win.AM_PAGE_PROVIDERS.pure;
  for (const ok of ["claude-code", "codex", "gemini"]) assert.equal(p.docNameOf(ok), ok);
  for (const bad of ["../../etc/passwd", "egitim", "", null, undefined, 5, "claude-code/../x"]) assert.equal(p.docNameOf(bad), null);
});

test("pure: scrubSecrets Bearer, #token ve anahtar=değer kalıplarını maskeler", () => {
  const p = bootAll().win.AM_PAGE_PROVIDERS.pure;
  const s = p.scrubSecrets("hata Bearer abc.def-123 ve token=gizliDeger ve #token=zzz ve sk-abcdefghijklmnop");
  assert.ok(!s.includes("abc.def-123") && !s.includes("gizliDeger") && !s.includes("zzz") && !s.includes("sk-abcdefghijklmnop"));
  assert.ok(s.includes("[gizli]"));
});

test("pure: limits null/boş → null (uydurma yok); dolu → yalnız sağlayıcının bildirdiği skaler satırlar", () => {
  const p = bootAll().win.AM_PAGE_PROVIDERS.pure;
  assert.equal(p.limitRows(null), null);
  assert.equal(p.limitRows({}), null);
  assert.equal(p.normDetail({ id: "x", limits: {} }).limits, null);
  const rows = p.limitRows({ window: "5s", max: 1000, nested: { a: 1 } });
  assert.equal(rows.length, 3);
  assert.equal(rows.find((r: any) => r.key === "max").value, "1.000");
  assert.equal(rows.find((r: any) => r.key === "nested").value, null);
});

test("pure: actionResult başarı/hata/yükleniyor durumlarını ayırır ve gizli bilgiyi maskeler", () => {
  const p = bootAll().win.AM_PAGE_PROVIDERS.pure;
  assert.equal(p.actionResult(undefined), null);
  assert.equal(p.actionResult({ status: "ok", value: { ok: true } }).tone, "ok");
  assert.equal(p.actionResult({ status: "ok", value: { ok: false, message: "kapalı" } }).tone, "bad");
  const e = p.actionResult({ status: "error", reason: "401 Bearer abcdefghijklmn" });
  assert.equal(e.tone, "bad");
  assert.ok(!e.text.includes("abcdefghijklmn"));
});

// ================================================================ sağlayıcı LİSTESİ
test("liste: sağlayıcı satırları, rota, durum rozeti ve yetenek sayıları; 'Otomatik geçiş yok' ve 'Planlı' notları", () => {
  const c = bootAll();
  c.AM.state.providers = LIST_PROVIDERS;
  const t = draw(c, "providers").textContent;
  assert.ok(t.includes("Claude Code") && t.includes("Gemini"));
  assert.ok(t.includes("Abonelik"));
  assert.ok(t.includes("Otomatik geçiş yok"));
  assert.ok(t.includes("OpenCode") && t.includes("Cursor") && t.includes("Antigravity") && t.includes("adaptörü YOK") && t.includes("Planlı"));
  assert.ok(t.includes("Doğrulandı: 1") && t.includes("Kısmi: 1") && t.includes("Doğrulanmadı: 1") && t.includes("Desteklenmiyor: 1"));
});

test("liste: kullanılamayan sağlayıcı KULLANILAMIYOR görünür, 'Hazır' görünmez; kısmi olan 'Hazır' değildir", () => {
  const c = bootAll();
  c.AM.state.providers = LIST_PROVIDERS;
  const root = draw(c, "providers");
  const rows = byTag(root, "button");
  const gemini = rows.find((b) => b.textContent.includes("Gemini")) as FNode;
  const claude = rows.find((b) => b.textContent.includes("Claude Code")) as FNode;
  assert.ok(gemini.textContent.includes("KULLANILAMIYOR") && !gemini.textContent.includes("Hazır"));
  assert.ok(claude.textContent.includes("Kısmi") && !claude.textContent.includes("Hazır"));
  assert.ok(/KULLANILAMIYOR/.test(gemini.getAttribute("aria-label") ?? ""));
});

test("liste: devre dışı sağlayıcı (ayrıntı verisinden) 'Devre dışı' görünür, 'Hazır' görünmez", () => {
  const c = bootAll();
  c.AM.state.providers = [{ id: "codex", displayName: "Codex", routeKind: "subscription", capabilities: [{ operation: "execute", status: "verified" }] }];
  c.AM.state.data["providerDetail:codex"] = { status: "ok", value: { provider: { id: "codex", displayName: "Codex", enabled: false, capabilities: [{ operation: "execute", status: "verified" }] } } };
  const t = draw(c, "providers").textContent;
  assert.ok(t.includes("Devre dışı"));
  assert.ok(!t.includes("Hazır"));
});

test("liste: satıra tıklama setView({page:'providers', pageParam:id}) ve loadData('providerDetail', id) çağırır", () => {
  const c = bootAll();
  c.AM.state.providers = LIST_PROVIDERS;
  const root = draw(c, "providers");
  const row = byTag(root, "button").find((b) => b.textContent.includes("Claude Code")) as FNode;
  click(row);
  assert.deepEqual(names(c.calls, "setView"), [{ page: "providers", pageParam: "claude-code" }]);
  assert.deepEqual(names(c.calls, "loadData"), [["providerDetail", "claude-code"]]);
});

test("liste: XSS yükü yalnız metin olur (eleman oluşmaz); geçersiz kimlikli satırda düğme yoktur", () => {
  const c = bootAll();
  c.AM.state.providers = [{ id: "<img src=x onerror=alert(1)>", displayName: "<script>alert(1)</script>", routeKind: "<b>x</b>", capabilities: [] }];
  const root = draw(c, "providers");
  assert.equal(findAll(root, (n) => ["img", "script", "b", "iframe"].includes(n.tag)).length, 0);
  assert.ok(root.textContent.includes("<script>alert(1)</script>"));
  assert.equal(byTag(root, "button").length, 0);
  assert.ok(root.textContent.includes("geçersiz bir kimlik"));
});

test("liste: boş liste → boş durum; meşgulken iskelet (role=status)", () => {
  const c = bootAll();
  const empty = draw(c, "providers");
  assert.ok(empty.textContent.includes("Sağlayıcı kaydı yok"));
  c.AM.state.busy = true;
  const busy = draw(c, "providers");
  assert.ok(findAll(busy, (n) => n.getAttribute("role") === "status" && n.getAttribute("aria-busy") === "true").length === 1);
});

// ================================================================ sağlayıcı DETAYI
test("detay: veri yoksa loadData istenir ve yükleniyor iskeleti görünür; başlık sağlayıcı adıdır", () => {
  const c = bootAll();
  c.AM.state.providers = LIST_PROVIDERS;
  const root = draw(c, "providers", "claude-code");
  assert.deepEqual(names(c.calls, "loadData"), [["providerDetail", "claude-code"]]);
  assert.ok(findAll(root, (n) => n.getAttribute("aria-busy") === "true").length === 1);
  assert.equal(byTag(root, "h2")[0]?.textContent, "Claude Code");
});

test("detay: hata durumunda role=alert kartı ve 'Yeniden dene' (loadData) çıkar; uydurma değer yok", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:codex"] = { status: "error", value: null, reason: "500: sunucu" };
  const root = draw(c, "providers", "codex");
  assert.equal(findAll(root, (n) => n.getAttribute("role") === "alert").length, 1);
  assert.ok(root.textContent.includes("500: sunucu"));
  c.calls.length = 0;
  click(button(root, "Yeniden dene"));
  assert.deepEqual(names(c.calls, "loadData"), [["providerDetail", "codex"]]);
  assert.ok(!root.textContent.includes("Abonelik rotası"));
});

test("detay: yetenek tablosu gerçek table/th scope; doğrulanmamış/desteklenmeyen satır 'Kullanılabilir değil/Kullanılamaz' der, doğrulandı demez", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail() };
  const root = draw(c, "providers", "claude-code");
  const tables = byTag(root, "table");
  assert.ok(tables.length >= 1);
  const caps = tables[0] as FNode;
  assert.ok(byTag(caps, "th").filter((h) => h.getAttribute("scope") === "col").length === 5);
  assert.ok(byTag(caps, "th").filter((h) => h.getAttribute("scope") === "row").length === 4);
  assert.equal(byTag(caps, "caption").length, 1);
  const rows = byTag(caps, "tr").slice(1);
  const cancel = rows.find((r) => r.textContent.includes("cancel")) as FNode;
  assert.ok(cancel.textContent.includes("Doğrulanmadı") && cancel.textContent.includes("Kullanılabilir değil"));
  assert.ok(!cancel.textContent.includes("Doğrulandı") && !/Kullanılabilir(?! değil)/.test(cancel.textContent));
  assert.ok(cancel.textContent.includes("Hiç doğrulanmadı"));
  const resume = rows.find((r) => r.textContent.includes("resume")) as FNode;
  assert.ok(resume.textContent.includes("Desteklenmiyor") && resume.textContent.includes("Kullanılamaz") && resume.textContent.includes("Kanıt bildirilmedi"));
  const ok = rows.find((r) => r.textContent.includes("describeCapabilities")) as FNode;
  assert.ok(ok.textContent.includes("Doğrulandı") && ok.textContent.includes("Kullanılabilir") && ok.textContent.includes("yerel"));
  assert.ok(root.textContent.includes("Kısmen kullanılabilir: kanıt eksik"));
});

test("detay: limits null → 'Bilinmiyor: sağlayıcı bildirmedi'; plan/yüzde/sıfırlanma uydurulmaz; modeller boşsa aynı dürüst metin", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail() };
  const t = draw(c, "providers", "claude-code").textContent;
  const lim = t.slice(t.indexOf("Limitler"), t.indexOf("Son başarılı işlem"));
  assert.ok(lim.includes("Bilinmiyor: sağlayıcı bildirmedi"));
  assert.ok(!/%|sıfırlan|plan/i.test(lim));
  assert.ok(t.includes("Model listesi: Bilinmiyor: sağlayıcı bildirmedi"));
  assert.ok(t.includes("Henüz kayıtlı başarılı işlem yok"));
});

test("detay: dolu limits yalnız bildirildiği gibi listelenir", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail({ limits: { pencere: "5 saat", ust: 2000 } }) };
  const t = draw(c, "providers", "claude-code").textContent;
  assert.ok(t.includes("pencere") && t.includes("5 saat") && t.includes("2.000"));
});

test("detay: modeller tablosu, son başarılı işlem, sürüm, yetkilendirme yöntemi görünür", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail({ models: [{ model: "claude-opus-4", runs: 12, lastAt: "2026-10-21T10:00:00Z" }], lastSuccess: { at: "2026-10-21T10:00:00Z", model: "claude-opus-4" } }) };
  const t = draw(c, "providers", "claude-code").textContent;
  assert.ok(t.includes("claude-opus-4") && t.includes("12"));
  assert.ok(t.includes("2.1.306") && t.includes("claude.ai"));
  assert.ok(/\d{2}\.\d{2}\.\d{4}/.test(t));
});

test("detay: kullanım/fatura yolu metni tam; ücret simgesi ya da tutar yok", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail() };
  const t = draw(c, "providers", "claude-code").textContent;
  assert.ok(t.includes("Abonelik rotası · ücretli rota kapalı · liste fiyatı yalnız bilgidir"));
  assert.ok(!/\$|₺|€/.test(t));
});

test("detay: izinler (allowedByPolicy ve politika özeti) gösterilir; politika yoksa dürüst metin", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail({ allowedByPolicy: false }) };
  let t = draw(c, "providers", "claude-code").textContent;
  assert.ok(t.includes("Politika özeti sunucudan alınamadı"));
  c.AM.state.policy = { allowedProviders: ["claude-code"], allowedActions: ["a", "b", "c"], approvalRequiredActions: ["b"], paidRoute: "none" };
  t = draw(c, "providers", "claude-code").textContent;
  assert.ok(t.includes("3 tanınan eylem, 1 tanesi izin ister; ücretli rota: none"));
  const root = draw(c, "providers", "claude-code");
  assert.ok(root.textContent.includes("Hayır"));
});

test("detay: Test düğmesi providerAction(id,'test'); Devre dışı bırak 'disable'", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail() };
  const root = draw(c, "providers", "claude-code");
  click(button(root, "Test"));
  click(button(root, "Devre dışı bırak"));
  assert.deepEqual(names(c.calls, "providerAction"), [["claude-code", "test"], ["claude-code", "disable"]]);
});

test("detay: devre dışı sağlayıcıda 'Etkinleştir' çıkar ve providerAction(id,'enable') çağırır; 'Devre dışı bırak' olmaz", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:codex"] = { status: "ok", value: detail({ id: "codex", displayName: "Codex", enabled: false, docs: null }) };
  const root = draw(c, "providers", "codex");
  assert.equal(findAll(root, (n) => n.tag === "button" && n.textContent === "Devre dışı bırak").length, 0);
  click(button(root, "Etkinleştir"));
  assert.deepEqual(names(c.calls, "providerAction"), [["codex", "enable"]]);
  assert.ok(root.textContent.includes("Devre dışı"));
  assert.ok(!root.textContent.includes("Hazır"));
});

test("detay: Yeniden bağlan/Güncelle/Bağlantıyı kes komut ÇALIŞTIRMAZ; yalnız copyText çağırır, providerAction çağırmaz", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail() };
  const root = draw(c, "providers", "claude-code");
  assert.ok(root.textContent.includes("ÇALIŞTIRMAZ"));
  assert.ok(root.textContent.includes("claude auth login") && root.textContent.includes("claude update") && root.textContent.includes("claude auth logout"));
  c.calls.length = 0;
  click(button(root, "Yeniden bağlan komutunu kopyala"));
  click(button(root, "Güncelle komutunu kopyala"));
  click(button(root, "Bağlantıyı kes komutunu kopyala"));
  assert.deepEqual(names(c.calls, "copyText"), ["claude auth login", "claude update", "claude auth logout"]);
  assert.equal(names(c.calls, "providerAction").length, 0);
  assert.equal(names(c.calls, "setView").length, 0);
});

test("detay: komutu bilinmeyen sağlayıcıda komut uydurulmaz, kopyalama düğmesi yoktur", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:gemini"] = { status: "ok", value: detail({ id: "gemini", displayName: "Gemini", docs: null }) };
  const root = draw(c, "providers", "gemini");
  assert.equal(findAll(root, (n) => n.tag === "button" && n.textContent.includes("komutunu kopyala")).length, 0);
  assert.ok(root.textContent.includes("komut bildirilmedi"));
});

test("detay: eylem sonucu data['providerAction:<id>'] ile görünür (başarı ve hata)", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail() };
  c.AM.state.data["providerAction:claude-code"] = { status: "ok", value: { ok: true, message: "sürüm 2.1.306" } };
  let root = draw(c, "providers", "claude-code");
  assert.ok(root.textContent.includes("Eylem tamamlandı.") && root.textContent.includes("sürüm 2.1.306"));
  c.AM.state.data["providerAction:claude-code"] = { status: "error", value: null, reason: "403: yalnız kullanıcı" };
  root = draw(c, "providers", "claude-code");
  assert.ok(root.textContent.includes("Eylem başarısız: 403: yalnız kullanıcı"));
  assert.ok(findAll(root, (n) => n.getAttribute("role") === "alert").length >= 1);
});

test("detay: son hatalar tablosunda gizli bilgi maskelenir, XSS yükü metin kalır", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail({ lastErrors: [{ at: "2026-10-21T10:00:00Z", kind: "<img src=x>", message: "kimlik Bearer abcdef1234567890xyz hatası <script>1</script>" }] }) };
  const root = draw(c, "providers", "claude-code");
  assert.ok(!root.textContent.includes("abcdef1234567890xyz"));
  assert.ok(root.textContent.includes("[gizli]") && root.textContent.includes("<script>1</script>"));
  assert.equal(findAll(root, (n) => ["img", "script"].includes(n.tag)).length, 0);
});

test("detay: bilinen sınırlar belgesi loadDoc(docs adı) ile istenir ve AM_MD ile çizilir; yükleme sırasında durum metni görünür", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail() };
  let root = draw(c, "providers", "claude-code");
  assert.deepEqual(names(c.calls, "loadDoc"), ["claude-code"]);
  assert.ok(root.textContent.includes("Belge yükleniyor"));
  c.AM.state.docs["claude-code"] = { status: "ok", text: "# Sınırlar\n\n- **Bash reddedilir**\n\n<script>alert(1)</script>" };
  root = draw(c, "providers", "claude-code");
  assert.ok(root.textContent.includes("Sınırlar") && root.textContent.includes("Bash reddedilir"));
  assert.equal(findAll(root, (n) => n.tag === "script").length, 0);
  assert.ok(names(c.calls, "loadDoc").length === 1, "belge ikinci kez istenmemeli");
});

test("detay: beyaz listede olmayan belge adı istenmez; belge yoksa dürüst metin", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail({ docs: "../../gizli" }) };
  const root = draw(c, "providers", "claude-code");
  assert.equal(names(c.calls, "loadDoc").length, 0);
  assert.ok(root.textContent.includes("belgesi bildirilmedi"));
});

test("detay: belge sunucudan hiç gelmezse (loadDoc sonrası kayıt yok) sonsuz 'yükleniyor' kalmaz", async () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail() };
  const root = draw(c, "providers", "claude-code");
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  assert.ok(root.textContent.includes("Belge alınamadı"));
  assert.ok(!root.textContent.includes("Belge yükleniyor"));
});

test("detay: 'Tüm sağlayıcılar' düğmesi listeye döner (pageParam boş)", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail() };
  const root = draw(c, "providers", "claude-code");
  click(button(root, "Tüm sağlayıcılar"));
  assert.deepEqual(names(c.calls, "setView"), [{ page: "providers", pageParam: "" }]);
});

test("detay: otomatik geçiş yok notu detayda da görünür; çizim hatasında okunur hata kartı (role=alert) çıkar", () => {
  const c = bootAll();
  c.AM.state.data["providerDetail:claude-code"] = { status: "ok", value: detail() };
  assert.ok(draw(c, "providers", "claude-code").textContent.includes("Otomatik geçiş yok"));
  const bad: any = { get state() { throw new Error("boom"); }, actions: {} };
  const root = newRoot(c.doc);
  pageOf(c, "providers").render(bad, root, "");
  assert.ok(findAll(root, (n) => n.getAttribute("role") === "alert").length >= 1);
});

test("aynı durum yeniden çizilince DOM yeniden kurulmaz; durum değişince kurulur", () => {
  const c = bootAll();
  c.AM.state.providers = LIST_PROVIDERS;
  const root = newRoot(c.doc);
  const spec = pageOf(c, "providers");
  spec.render(c.AM, root, "");
  const first = root.children[0];
  spec.render(c.AM, root, "");
  assert.equal(root.children[0], first);
  c.AM.state.providers = [LIST_PROVIDERS[0]];
  spec.render(c.AM, root, "");
  assert.notEqual(root.children[0], first);
});

// ================================================================ Modeller ve Ajanlar
const SUBS = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", name: "Opus uzman", roleHint: null, provider: "claude-code", model: "claude-sonnet-4-5", modelSource: "run", state: "running", pinned: true, archived: false, updatedAt: "2026-10-22T09:00:00Z" },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", name: "<img src=x onerror=1>", roleHint: null, provider: "codex", model: null, modelSource: "unknown", state: "weird", pinned: false, archived: true, updatedAt: "2026-10-21T09:00:00Z" },
  { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", name: "Haiku hızlı", roleHint: null, provider: "claude-code", model: "claude-haiku-4-5", modelSource: "declared", state: "done", pinned: false, archived: false, updatedAt: "2026-10-20T09:00:00Z" }
];
const USAGE = {
  status: "ok", updatedAt: "2026-10-22T08:00:00Z", topics: 4,
  tokens: { input: 1000000, output: 500000, cacheWrite: 200000, cacheRead: 240000 }, cacheHitPct: 96, codeChanges: { added: 120, removed: 30 },
  byModel: [
    { model: "claude-sonnet-4-5", input: 900000, output: 400000, cacheWrite: 100000, cacheRead: 200000, topics: 3 },
    { model: "claude-haiku-4-5", input: 100000, output: 100000, cacheWrite: 100000, cacheRead: 40000, topics: 1 }
  ],
  topicsTable: [
    { id: "t1", title: "Küçük", model: "claude-haiku-4-5", lastAt: null, tokens: 100, cacheHitPct: null, sharePct: 1 },
    { id: "t2", title: "Büyük <b>iş</b>", model: "claude-sonnet-4-5", lastAt: null, tokens: 900000, cacheHitPct: 90, sharePct: 46 },
    { id: "t3", title: "Orta", model: "claude-sonnet-4-5", lastAt: null, tokens: 5000, cacheHitPct: 80, sharePct: 3 },
    { id: "t4", title: "Dördüncü", model: "claude-sonnet-4-5", lastAt: null, tokens: 4000, cacheHitPct: 80, sharePct: 2 },
    { id: "t5", title: "Beşinci", model: "claude-sonnet-4-5", lastAt: null, tokens: 3000, cacheHitPct: 80, sharePct: 2 },
    { id: "t6", title: "Altıncı", model: "claude-sonnet-4-5", lastAt: null, tokens: 2000, cacheHitPct: 80, sharePct: 1 },
    { id: "t7", title: "Bilinmeyen", model: null, lastAt: null, tokens: null, cacheHitPct: null, sharePct: null }
  ],
  note: "costBasis=list; ücret yok"
};

test("modeller: kullanım hiç istenmediyse loadUsage bir kez çağrılır ve iskelet görünür", () => {
  const c = bootAll();
  const root = draw(c, "models");
  draw(c, "models");
  assert.equal(names(c.calls, "loadUsage").length, 1);
  assert.ok(findAll(root, (n) => n.getAttribute("aria-busy") === "true").length >= 1);
});

test("modeller: kullanım hatasında okunur hata kartı + yeniden dene (loadUsage); alt oturumlar yine çizilir", () => {
  const c = bootAll();
  c.AM.state.usage = { status: "error", reason: "500: sunucu" };
  c.AM.state.subsessions = SUBS;
  const root = draw(c, "models");
  assert.ok(findAll(root, (n) => n.getAttribute("role") === "alert").length >= 1);
  assert.ok(root.textContent.includes("500: sunucu") && root.textContent.includes("Opus uzman"));
  c.calls.length = 0;
  click(button(root, "Yeniden dene"));
  assert.equal(names(c.calls, "loadUsage").length, 1);
});

test("modeller: model tablosu usage.byModel'den; token toplamı tr-TR; sağlayıcı alt oturumdan; bilinmeyen model etiketlenir", () => {
  const c = bootAll();
  c.AM.state.usage = USAGE;
  c.AM.state.subsessions = SUBS;
  const root = draw(c, "models");
  const tables = byTag(root, "table");
  const models = tables[0] as FNode;
  const sonnet = byTag(models, "tr").find((r) => r.textContent.includes("claude-sonnet-4-5")) as FNode;
  assert.ok(sonnet.textContent.includes("1.600.000"), sonnet.textContent);
  assert.ok(sonnet.textContent.includes("claude-code"));
  assert.ok(byTag(models, "tr").some((r) => r.textContent.includes("Model bilinmiyor") && r.textContent.includes("codex")));
  assert.ok(root.textContent.includes("Ücret ya da fiyat gösterilmez"));
});

test("modeller: bilinmeyen token → '—' (uydurma yok); kullanım verisi olmayan modelde token boş", () => {
  const c = bootAll();
  c.AM.state.usage = { status: "ok", topics: 0, tokens: null, cacheHitPct: null, codeChanges: null, byModel: [], topicsTable: [], note: "" };
  c.AM.state.subsessions = [SUBS[2]];
  const root = draw(c, "models");
  const row = byTag(byTag(root, "table")[0] as FNode, "tr")[1] as FNode;
  assert.ok(row.textContent.includes("claude-haiku-4-5") && row.textContent.includes("—"));
});

test("modeller: alt oturum adı ve gerçek model AYRI gösterilir; ad-model uyuşmazlığı uyarısı; kaynak etiketi; XSS metin kalır", () => {
  const c = bootAll();
  c.AM.state.usage = USAGE;
  c.AM.state.subsessions = SUBS;
  const root = draw(c, "models");
  const subs = byTag(root, "table")[1] as FNode;
  const opus = byTag(subs, "tr").find((r) => r.textContent.includes("Opus uzman")) as FNode;
  assert.ok(opus.textContent.includes("claude-sonnet-4-5"), "gerçek model rozeti");
  assert.ok(opus.textContent.includes("Ad ile gerçek model uyuşmuyor"), "uyuşmazlık uyarısı");
  assert.ok(opus.textContent.includes("kaynak: çalıştırma kaydı") && opus.textContent.includes("Çalışıyor") && opus.textContent.includes("Sabit"));
  const haiku = byTag(subs, "tr").find((r) => r.textContent.includes("Haiku hızlı")) as FNode;
  assert.ok(!haiku.textContent.includes("uyuşmuyor") && haiku.textContent.includes("Uyarı yok") && haiku.textContent.includes("kaynak: beyan (doğrulanmadı)"));
  const xss = byTag(subs, "tr").find((r) => r.textContent.includes("<img src=x onerror=1>")) as FNode;
  assert.ok(xss.textContent.includes("Arşivde") && xss.textContent.includes("Bilinmeyen durum") && xss.textContent.includes("Model bilinmiyor"));
  assert.equal(findAll(root, (n) => n.tag === "img").length, 0);
  assert.equal(byTag(subs, "th").filter((h) => h.getAttribute("scope") === "col").length, 5);
});

test("modeller: 5 satırlık sade açıklama kutusu (model/sağlayıcı/ajan/IDE/entegrasyon) ve boş alt oturum durumu", () => {
  const c = bootAll();
  c.AM.state.usage = USAGE;
  const root = draw(c, "models");
  const lis = findAll(root, (n) => n.tag === "li");
  assert.equal(lis.length, 5);
  for (const w of ["Model:", "Sağlayıcı:", "Ajan:", "IDE:", "Entegrasyon:"]) assert.ok(lis.some((l) => l.textContent.startsWith(w)), w);
  assert.ok(root.textContent.includes("Henüz alt oturum yok"));
});

// ================================================================ Kullanım ve Maliyetler
test("kullanım: pure biçimleyiciler tr-TR (1,9 M, %96, <%1, —)", () => {
  const p = bootAll().win.AM_PAGE_USAGE.pure;
  assert.equal(p.fmtCompact(1940000), "1,9 M");
  assert.equal(p.fmtCompact(1900000000), "1,9 Mr");
  assert.equal(p.fmtCompact(null), "—");
  assert.equal(p.fmtInt(1234567), "1.234.567");
  assert.equal(p.fmtPct(96), "%96");
  assert.equal(p.fmtPct(0.4), "<%1");
  assert.equal(p.fmtPct(null), "—");
  assert.equal(p.usageStatus(undefined), "none");
  assert.equal(p.usageStatus({ status: "error" }), "error");
  assert.equal(p.usageStatus({ status: "ok", topics: 0, tokens: null, codeChanges: null, byModel: [], topicsTable: [] }), "empty");
});

test("kullanım: topTopics token'a göre azalan ilk 5, token bilinmeyen sonda", () => {
  const p = bootAll().win.AM_PAGE_USAGE.pure;
  const top = p.topTopics(USAGE.topicsTable, 5);
  assert.equal(top.length, 5);
  assert.deepEqual(top.map((r: any) => r.title).slice(0, 3), ["Büyük <b>iş</b>", "Orta", "Dördüncü"]);
  const all = p.topTopics(USAGE.topicsTable, 20);
  assert.equal(all[all.length - 1].tokens, null);
});

test("kullanım: ilk açılışta loadUsage; iskelet; hata kartı + yeniden dene; boş durum", () => {
  const c = bootAll();
  let root = draw(c, "usage");
  assert.equal(names(c.calls, "loadUsage").length, 1);
  assert.ok(findAll(root, (n) => n.getAttribute("aria-busy") === "true").length === 1);
  c.AM.state.usage = { status: "error", reason: "503: yok" };
  root = draw(c, "usage");
  assert.ok(findAll(root, (n) => n.getAttribute("role") === "alert").length === 1 && root.textContent.includes("503: yok"));
  c.calls.length = 0;
  click(button(root, "Yeniden dene"));
  assert.equal(names(c.calls, "loadUsage").length, 1);
  c.AM.state.usage = { status: "ok", topics: 0, tokens: null, cacheHitPct: null, codeChanges: null, byModel: [], topicsTable: [], note: "" };
  assert.ok(draw(c, "usage").textContent.includes("Henüz kayıt yok"));
});

test("kullanım: özet (toplam token, konu, önbellek, kod değişikliği), ücret yok notu, model dökümü ve en çok harcayan 5 konu", () => {
  const c = bootAll();
  c.AM.state.usage = USAGE;
  const root = draw(c, "usage");
  const t = root.textContent;
  assert.ok(t.includes("1,9 M") && t.includes("1.940.000 token"), t);
  assert.ok(t.includes("%96") && t.includes("+120 −30"));
  assert.ok(t.includes("costBasis=list; ücret yok, abonelik rotası"));
  assert.ok(!/\$|₺|€|USD/.test(t));
  const tables = byTag(root, "table");
  assert.equal(tables.length, 2);
  assert.equal(byTag(tables[1] as FNode, "tr").length, 6, "başlık + 5 konu");
  assert.ok((tables[1] as FNode).textContent.includes("Büyük <b>iş</b>"));
  assert.equal(findAll(root, (n) => n.tag === "b").length, 0);
  assert.ok(!(tables[1] as FNode).textContent.includes("Küçük"));
  assert.ok(byTag(tables[0] as FNode, "th").filter((h) => h.getAttribute("scope") === "row").length === 2);
});

test("kullanım: bilinmeyen değerler '—' ve 'veri yok' olarak görünür (null → uydurma yok)", () => {
  const c = bootAll();
  c.AM.state.usage = { status: "ok", topics: 2, tokens: null, cacheHitPct: null, codeChanges: null, byModel: [], topicsTable: [], note: "" };
  const t = draw(c, "usage").textContent;
  assert.ok(t.includes("veri yok") && t.includes("—"));
  assert.ok(t.includes("Model dökümü için veri yok") && t.includes("Konu tablosu için veri yok"));
});

test("kullanım: 'Ayrıntılı kullanım sayfasını aç' openProjectSettings('usage') çağırır; yenile loadUsage çağırır", () => {
  const c = bootAll();
  c.AM.state.usage = USAGE;
  const root = draw(c, "usage");
  c.calls.length = 0;
  click(button(root, "Ayrıntılı kullanım sayfasını aç"));
  assert.deepEqual(names(c.calls, "openProjectSettings"), ["usage"]);
  click(button(root, "Kullanımı yenile"));
  assert.equal(names(c.calls, "loadUsage").length, 1);
});

// ================================================================ kaynak taraması (güvenlik / uyum)
test("kaynak: yasak API'ler yok (innerHTML, eval, fetch, depolama, satır içi olay/stil, dış adres)", () => {
  for (const f of ["providers", "models", "usage"] as const) {
    const code = SRC[f].replace(/\/\*[\s\S]*?\*\//, "");
    for (const bad of [/innerHTML/, /outerHTML/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new Function/, /localStorage/, /sessionStorage/, /\bfetch\s*\(/, /XMLHttpRequest/, /postMessage/, /document\.cookie/, /srcdoc/, /\.style\b/, /setAttribute\(\s*["']style["']/, /setAttribute\(\s*["']on/, /https?:\/\//]) {
      assert.ok(!bad.test(code), f + ": yasak kalıp " + String(bad));
    }
    assert.ok(/textContent/.test(code));
  }
});

test("css: yalnız var(--am-*) renkleri; dış kaynak, @import, url(...), onaltılık/rgb renk, satır içi script yok", () => {
  const body = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/@import/.test(body) && !/url\(/.test(body) && !/https?:/.test(body));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(body), "onaltılık renk var");
  assert.ok(!/\brgba?\(/.test(body) && !/\bhsla?\(/.test(body));
  assert.ok(/var\(--am-/.test(body));
  assert.ok(/:focus-visible/.test(body));
  assert.ok(/@media \(max-width: 480px\)/.test(body));
});

test("css: kullanılan am-pp- sınıflarının çoğu stillenmiştir (kaynakta olup CSS'te olmayan sınıf yok)", () => {
  const used = new Set<string>();
  for (const f of ["providers", "models", "usage"] as const) {
    for (const m of SRC[f].matchAll(/"(am-pp-[a-z0-9-]+(?: am-pp-[a-z0-9-]+)*)"/g)) for (const k of (m[1] as string).split(" ")) used.add(k);
  }
  const dynamic = new Set(["am-pp-chip--ok", "am-pp-chip--warn", "am-pp-chip--bad", "am-pp-chip--info", "am-pp-chip--muted", "am-pp-note--info", "am-pp-note--warn", "am-pp-note--bad", "am-pp-note--ok", "am-pp-note--muted"]);
  const missing = [...used].filter((k) => !CSS.includes("." + k) && !dynamic.has(k));
  assert.deepEqual(missing.filter((k) => !["am-pp-live"].includes(k)), []);
});
