// Sayfa çerçevesi (pages.js) + sayfalar (overview, projects, tasks, security, audit) testleri. Sahip: Claude [İP:AgentMom Faz 11 / sayfalar].
// Kaynaklar node:vm ile sahte window/document içinde yüklenir; ağ yok, tarayıcı yok. Değiştirme: yalnız sahibi.
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const dir = import.meta.dirname as string;
const read = (f: string): string => fs.readFileSync(path.join(dir, f), "utf8");
const PAGE_FILES = ["page-overview.js", "page-projects.js", "page-tasks.js", "page-security.js", "page-audit.js"];
const ALL_JS = ["pages.js", ...PAGE_FILES];

// ---------- Sahte DOM ----------
class FNode {
  nodeType = 1;
  tag: string;
  children: FNode[] = [];
  parentNode: FNode | null = null;
  attrs: Record<string, string> = {};
  className = "";
  own = "";
  id = "";
  hidden = false;
  value = "";
  type = "";
  title = "";
  scrollTop = 0;
  disabled = false;
  listeners: Record<string, Array<(e: any) => void>> = {};
  doc: FDoc;
  classes = new Set<string>();
  classList = { add: (c: string) => { this.classes.add(c); } };
  constructor(tag: string, doc: FDoc) { this.tag = tag; this.doc = doc; }
  get tagName(): string { return this.tag.toUpperCase(); }
  get textContent(): string { return this.own + this.children.map((c) => c.textContent).join(""); }
  set textContent(v: unknown) { this.own = String(v); this.children = []; }
  appendChild(c: FNode) { c.parentNode = this; this.children.push(c); return c; }
  replaceChildren(...nodes: FNode[]) { this.children = []; for (const n of nodes) this.appendChild(n); }
  setAttribute(k: string, v: unknown) { this.attrs[k] = String(v); }
  getAttribute(k: string) { return Object.hasOwn(this.attrs, k) ? (this.attrs[k] as string) : null; }
  addEventListener(t: string, fn: (e: any) => void) { (this.listeners[t] ||= []).push(fn); }
  focus() { this.doc.activeElement = this; }
  click() { for (const fn of this.listeners["click"] || []) fn({ target: this }); }
  fire(type: string, extra: Record<string, unknown> = {}) { for (const fn of this.listeners[type] || []) fn({ target: this, ...extra }); }
}
class FDoc {
  activeElement: FNode | null = null;
  made: string[] = [];
  ids: Record<string, FNode> = {};
  createElement(tag: string) { this.made.push(tag); return new FNode(tag, this); }
  createTextNode(t: string) { const n = new FNode("#text", this); n.own = t; return n; }
  getElementById(id: string) { return this.ids[id] ?? null; }
}
function walk(n: FNode, out: FNode[] = []): FNode[] { for (const c of n.children) { out.push(c); walk(c, out); } return out; }
const J = (x: unknown): any => JSON.parse(JSON.stringify(x));
const byTag = (n: FNode, tag: string): FNode[] => walk(n).filter((x) => x.tag === tag);
const byKey = (n: FNode, key: string): FNode | undefined => walk(n).find((x) => x.attrs["data-am-key"] === key);
const alerts = (n: FNode): FNode[] => walk(n).filter((x) => x.attrs["role"] === "alert");

// ---------- Yükleyici ----------
function makeEnv(files: string[] = ALL_JS) {
  const doc = new FDoc();
  const host = new FNode("div", doc);
  const chat = new FNode("section", doc);
  doc.ids["pageView"] = host;
  doc.ids["chatView"] = chat;
  const reg: Record<string, Record<string, string>> = {};
  const win: any = {
    AM_REGISTER_TR: (mod: string, tr: Record<string, string>) => {
      for (const k of Object.keys(tr)) if (!k.startsWith(mod + ".")) throw new Error("önek: " + k);
      reg[mod] = tr;
    },
    AM_T: (key: string, vars?: Record<string, unknown>) => {
      for (const m of Object.keys(reg)) {
        const t = reg[m]![key];
        if (t !== undefined) return t.replace(/\{(\w+)\}/g, (_x, k) => (vars && k in vars ? String(vars[k]) : ""));
      }
      return "⟦" + key + "⟧";
    },
  };
  const ctx = vm.createContext({ window: win, document: doc, console });
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  const calls: any[] = [];
  const AM: any = {
    state: {
      tasks: [], debt: [], decisions: [], skills: [], providers: [], health: { status: null, checks: [] }, backup: null, policy: null, data: {}, project: { name: "AgentMom" },
    },
    view: { page: "chat", pageParam: "" },
    actions: {
      setView: (p: any) => { calls.push(["setView", p]); Object.assign(AM.view, p); },
      navigate: (id: string) => { calls.push(["navigate", id]); AM.view.page = id; },
      selectTopic: (id: string) => { calls.push(["selectTopic", id]); },
      refresh: () => { calls.push(["refresh"]); },
      loadData: (name: string, param?: string) => { calls.push(["loadData", name, param]); const key = param ? name + ":" + param : name; AM.state.data[key] = { status: "loading", value: null }; return Promise.resolve(); },
      copyText: (t: string) => { calls.push(["copyText", t]); return Promise.resolve(true); },
    },
  };
  const P = win.AM_PAGES;
  return { doc, host, chat, win, AM, calls, P, reg, go(page: string, param = "") { AM.view.page = page; AM.view.pageParam = param; P.render(AM); } };
}
function started(files?: string[]) { const e = makeEnv(files); e.P.init(e.AM, e.host); return e; }
const setData = (AM: any, key: string, value: unknown) => { AM.state.data[key] = { status: "ok", value }; };
const mkAudit = (n: number, over: Record<string, unknown> = {}) => Array.from({ length: n }, (_x, i) => ({
  id: "a" + i, ts: new Date(Date.UTC(2026, 9, 22, 10, i % 60)).toISOString(), initiator: { kind: "user", id: "yusuf" }, action: "task.approve" + i, decision: i % 2 ? "allow" : "deny", result: "ok", details: { n: i }, ...over,
}));

// ---------- Çerçeve ----------
test("modüller DOM'a dokunmadan yüklenir ve sözleşme API'sini sunar", () => {
  const e = makeEnv();
  assert.equal(e.doc.made.length, 0, "yükleme sırasında öğe oluşturulmaz");
  for (const k of ["register", "init", "render", "rerender", "get"]) assert.equal(typeof e.P[k], "function");
  assert.ok(e.P.pure && e.P.kit);
  assert.equal(e.P.ids.length, 13);
  for (const id of ["overview", "projects", "tasks", "security", "audit"]) assert.ok(e.P.get(id), id + " kayıtlı");
  assert.equal(e.P.get("providers"), null, "bu görevde yazılmayan sayfa kayıtlı değil");
});

test("register: bilinmeyen kimlik, render yok ve yinelenen kayıt reddedilir", () => {
  const e = makeEnv(["pages.js"]);
  assert.throws(() => e.P.register("nope", { render() {} }), /bilinmeyen/);
  assert.throws(() => e.P.register("models", {}), /render/);
  e.P.register("models", { render() {} });
  assert.throws(() => e.P.register("models", { render() {} }), /zaten/);
});

test("page=chat: pageView gizli, chatView görünür", () => {
  const e = started();
  e.chat.hidden = true;
  e.go("chat");
  assert.equal(e.host.hidden, true);
  assert.equal(e.chat.hidden, false);
});

test("sayfa değiştirme: başlık, kırıntı güncellenir; sohbete dönünce chatView geri gelir", () => {
  const e = started();
  e.go("overview");
  assert.equal(e.chat.hidden, true);
  assert.equal(e.host.hidden, false);
  assert.equal(byTag(e.host, "h1")[0]!.textContent, "Genel Bakış");
  assert.ok(e.host.textContent.includes("Yönetim"));
  e.go("projects");
  assert.equal(byTag(e.host, "h1")[0]!.textContent, "Projeler");
  assert.equal(walk(e.host).filter((n) => n.attrs["aria-current"] === "page").length, 1);
  e.go("chat");
  assert.equal(e.host.hidden, true);
  assert.equal(e.chat.hidden, false);
});

test("'Sohbete dön' düğmesi AM.actions.setView({page:'chat'}) çağırır", () => {
  const e = started();
  e.go("projects");
  byKey(e.host, "back")!.click();
  assert.deepEqual(J(e.calls.find((c) => c[0] === "setView")), ["setView", { page: "chat", pageParam: "" }]);
  assert.equal(e.AM.view.page, "chat");
});

test("eksik/yüklenmemiş sayfa: GÖRÜNÜR okunur hata kartı, sessiz boş sayfa yok", () => {
  const e = started();
  e.go("providers");
  const a = alerts(e.host);
  assert.equal(a.length, 1);
  assert.ok(a[0]!.textContent.includes("Bu sayfa yüklenemedi: providers"));
  assert.ok(byKey(a[0]!, "retry"), "yeniden dene düğmesi var");
  assert.equal(e.host.hidden, false);
  e.go("zzz-bilinmeyen");
  assert.ok(alerts(e.host)[0]!.textContent.includes("Bu sayfa yüklenemedi: zzz-bilinmeyen"));
});

test("render hatası: hata kartı + yeniden dene ikinci denemede başarılı olur", () => {
  const e = makeEnv(["pages.js"]);
  let n = 0;
  e.P.register("models", { render(_AM: any, root: FNode) { n++; if (n === 1) throw new Error("kırıldı"); const p = e.doc.createElement("p"); p.textContent = "tamam"; root.appendChild(p); } });
  e.P.init(e.AM, e.host);
  e.go("models");
  const a = alerts(e.host);
  assert.equal(a.length, 1);
  assert.ok(a[0]!.textContent.includes("Bu sayfa çizilemedi"));
  assert.ok(a[0]!.textContent.includes("kırıldı"));
  byKey(a[0]!, "retry")!.click();
  assert.equal(alerts(e.host).length, 0);
  assert.ok(e.host.textContent.includes("tamam"));
});

test("hiçbir şey çizmeyen sayfa sessiz boş kalmaz", () => {
  const e = makeEnv(["pages.js"]);
  e.P.register("models", { render() {} });
  e.P.init(e.AM, e.host);
  e.go("models");
  assert.equal(alerts(e.host).length, 1);
  assert.ok(alerts(e.host)[0]!.textContent.includes("hiçbir içerik üretmedi"));
});

test("sayfa dosyası çerçevesiz yüklenirse patlamaz ve kayıt olmaz", () => {
  for (const f of PAGE_FILES) {
    const e = makeEnv([]);
    const ctx = vm.createContext({ window: e.win, document: e.doc, console: { error() {} } });
    vm.runInContext(read(f), ctx, { filename: f });
    assert.equal(e.win.AM_PAGES, undefined);
    const alert = walk(e.host).find((n) => n.attrs["role"] === "alert");
    assert.ok(alert && alert.textContent.includes("pages.js"), f + ": görünür hata");
  }
});

// ---------- Saf mantık ----------
test("statusInfo: her durum şekil + metin anahtarı verir; bilinmeyen okunur", () => {
  const { pure } = makeEnv(["pages.js"]).P;
  const known = ["pending", "awaiting_approval", "blocked", "failed", "unavailable", "running", "approved", "idle", "created", "succeeded", "done", "completed", "cancelled", "denied", "paused"];
  for (const s of known) { const i = pure.statusInfo(s); assert.ok(i.known && i.shape && i.key === "pages.st." + s, s); }
  assert.equal(pure.statusInfo("???").key, "pages.st.unknown");
  assert.equal(pure.statusInfo("???").shape, "?");
  assert.equal(pure.statusInfo(undefined).known, false);
  assert.equal(pure.statusInfo("__proto__").known, false);
  assert.equal(pure.statusInfo("RUNNING").state, "running");
  assert.notEqual(pure.statusInfo("done").shape, pure.statusInfo("failed").shape, "başarı ve hata şekilleri farklı");
});

test("durum etiketleri: tüm durum metinleri Türkçe kaydedilmiş", () => {
  const e = makeEnv(["pages.js"]);
  for (const s of ["pending", "awaiting_approval", "failed", "unavailable", "running", "done", "unknown"]) assert.ok(!e.win.AM_T("pages.st." + s).startsWith("⟦"), s);
});

test("sortBy: kararlı, tr-TR, sayısal, boşlar HER ZAMAN sonda, azalan", () => {
  const { pure } = makeEnv(["pages.js"]).P;
  const rows = [{ n: "Çay", t: 3 }, { n: "Ada", t: null }, { n: "çam", t: 1 }, { n: "Zeytin", t: 2 }, { n: "", t: 2 }];
  assert.deepEqual(J(pure.sortBy(rows, (r: any) => r.n, "asc")).map((r: any) => r.n), ["Ada", "çam", "Çay", "Zeytin", ""]);
  assert.deepEqual(J(pure.sortBy(rows, (r: any) => r.n, "desc")).map((r: any) => r.n), ["Zeytin", "Çay", "çam", "Ada", ""]);
  assert.deepEqual(J(pure.sortBy(rows, (r: any) => r.t, "desc")).map((r: any) => r.n), ["Çay", "Zeytin", "", "çam", "Ada"], "sayısal azalan, eşitlerde sıra korunur, boş sonda");
  assert.deepEqual(J(pure.sortBy([{ v: "10" }, { v: "9" }], (r: any) => r.v, "asc")).map((r: any) => r.v), ["9", "10"], "doğal sayı sırası");
  assert.deepEqual(J(pure.sortBy(null, () => 1, "asc")), []);
});

test("nextSort: aynı sütun yön değiştirir, yeni sütun varsayılanla başlar", () => {
  const { pure } = makeEnv(["pages.js"]).P;
  assert.deepEqual(J(pure.nextSort({ key: "a", dir: "asc" }, "a", "asc")), { key: "a", dir: "desc" });
  assert.deepEqual(J(pure.nextSort({ key: "a", dir: "desc" }, "a", "asc")), { key: "a", dir: "asc" });
  assert.deepEqual(J(pure.nextSort({ key: "a", dir: "asc" }, "b", "desc")), { key: "b", dir: "desc" });
  assert.deepEqual(J(pure.nextSort(null, "b", "x")), { key: "b", dir: "asc" });
});

test("matchesText: tr-TR büyük/küçük harf (İ/ı), boş arama hepsini geçirir", () => {
  const { pure } = makeEnv(["pages.js"]).P;
  assert.equal(pure.matchesText("İSTANBUL", "istanbul"), true);
  assert.equal(pure.matchesText("ISPARTA", "ısparta"), true);
  assert.equal(pure.matchesText("Ankara", "izmir"), false);
  assert.equal(pure.matchesText("x", "   "), true);
});

test("limitRows: 200 sınırı ve gizlenen sayısı", () => {
  const { pure } = makeEnv(["pages.js"]).P;
  const r = pure.limitRows(new Array(250).fill(1), 200);
  assert.equal(r.shown.length, 200);
  assert.equal(r.hidden, 50);
  assert.equal(r.total, 250);
  assert.equal(pure.limitRows([1, 2], 200).hidden, 0);
});

test("maskSecrets/redact: belirteç benzeri değer ve gizli anahtar adları görünmez", () => {
  const { pure } = makeEnv(["pages.js"]).P;
  assert.equal(pure.maskSecrets("Authorization: Bearer abcdefghijklmnop1234"), "Authorization: [gizli]");
  assert.ok(!pure.maskSecrets("anahtar sk-abcdefghijklmnopqrstuvwx son").includes("sk-abc"));
  assert.ok(!pure.maskSecrets("ghp_abcdefghijklmnopqrstuvwxyz0123").includes("ghp_"));
  assert.equal(pure.maskSecrets("D:\\YusufII\\Projeler\\agentmom"), "D:\\YusufII\\Projeler\\agentmom", "normal yol bozulmaz");
  const r = pure.redact({ token: "x", nested: { apiKey: "y", note: "ok" }, list: [{ password: "p" }] });
  assert.equal(r.token, "[gizli]");
  assert.equal(r.nested.apiKey, "[gizli]");
  assert.equal(r.nested.note, "ok");
  assert.equal(r.list[0].password, "[gizli]");
  assert.ok(pure.detailsText({ secret: "abc", a: 1 }).includes("[gizli]"));
  assert.equal(pure.detailsText(null), "");
});

test("clean: denetim/çift yönlü karakterler boşluğa çevrilir, uzunluk sınırlanır", () => {
  const { pure } = makeEnv(["pages.js"]).P;
  assert.equal(pure.clean("a\u202eb\u0000c"), "a b c");
  assert.equal(pure.clean("x".repeat(600), 10).length, 10);
  assert.equal(pure.cleanMulti("a\nb\u202e"), "a\nb ");
});

test("formatTime: gg.aa.yyyy ss:dd, bozuk girdi boş", () => {
  const { pure } = makeEnv(["pages.js"]).P;
  assert.match(pure.formatTime("2026-10-22T10:05:00Z"), /^\d{2}\.10\.2026 \d{2}:\d{2}$|^2[12]\.10\.2026/);
  assert.equal(pure.formatTime("bozuk"), "");
  assert.equal(pure.formatTime(null), "");
  assert.equal(pure.fmtNum("x"), "");
});

test("normAudit/auditRows: sunucu verisi düz ve maskelenmiş satıra çevrilir", () => {
  const { pure } = makeEnv(["pages.js"]).P;
  const r = pure.normAudit({ id: "1", ts: "2026-10-22T10:00:00Z", initiator: { kind: "user", id: "yusuf" }, action: "a", decision: "allow", result: "ok sk-abcdefghijklmnopqrstuv", details: { x: 1 } });
  assert.equal(r.actor, "user:yusuf");
  assert.ok(!r.result.includes("sk-abc"));
  assert.equal(pure.auditRows({ events: [{}, {}] }).length, 2);
  assert.equal(pure.auditRows([{}]).length, 1);
  assert.equal(pure.auditRows(null).length, 0);
  assert.equal(pure.normAudit(null).actor, "");
});

test("dataState: eksik/bozuk kayıt 'loading' sayılır, hata nedeni temizlenir", () => {
  const { pure } = makeEnv(["pages.js"]).P;
  assert.equal(pure.dataState(undefined).status, "loading");
  assert.equal(pure.dataState({ status: "weird" }).status, "loading");
  assert.deepEqual(J(pure.dataState({ status: "error", reason: "500\u202e" })), { status: "error", value: null, reason: "500 " });
  assert.equal(pure.dataKey("memorySearch", "a b"), "memorySearch:a b");
  assert.equal(pure.dataKey("audit", ""), "audit");
});

// ---------- Veri yükleme ----------
test("veri yoksa loadData YALNIZ BİR KEZ çağrılır; yeniden çizimde döngü yok; yükleniyor iskeleti görünür", () => {
  const e = started();
  e.go("audit");
  e.go("audit");
  e.go("audit");
  assert.equal(e.calls.filter((c) => c[0] === "loadData").length, 1);
  assert.equal(e.calls.find((c) => c[0] === "loadData")![1], "audit");
  assert.ok(walk(e.host).some((n) => n.attrs["aria-busy"] === "true"), "iskelet var");
});

test("loadData hiçbir şey yazmazsa (oturum yok) görünür hata kartı; yeniden dene yeniden ister", () => {
  const e = started();
  e.AM.actions.loadData = (name: string) => { e.calls.push(["loadData", name]); return Promise.resolve(); };
  e.go("audit");
  assert.equal(alerts(e.host).length, 1);
  assert.ok(alerts(e.host)[0]!.textContent.includes("Veri istenemedi"));
  const before = e.calls.filter((c) => c[0] === "loadData").length;
  byKey(e.host, "retry")!.click();
  assert.equal(e.calls.filter((c) => c[0] === "loadData").length, before + 1);
});

test("veri hatası: neden gösterilir, yeniden dene loadData çağırır", () => {
  const e = started();
  e.AM.state.data["audit"] = { status: "error", value: null, reason: "500: sunucu" };
  e.go("audit");
  assert.ok(alerts(e.host)[0]!.textContent.includes("500: sunucu"));
  byKey(e.host, "retry")!.click();
  assert.ok(e.calls.some((c) => c[0] === "loadData" && c[1] === "audit"));
});

// ---------- Denetim sayfası ----------
test("audit: 250 olaydan en çok 200 satır; süzgeç sayıyı azaltır; karar süzgeci çalışır", () => {
  const e = started();
  setData(e.AM, "audit", { events: mkAudit(250) });
  e.go("audit");
  const rows = () => walk(byTag(e.host, "tbody")[0]!).filter((n) => n.tag === "tr");
  assert.equal(rows().length, 200);
  assert.ok(e.host.textContent.includes("200 / 250"));
  const q = byKey(e.host, "audit-q")!;
  q.value = "approve7";
  q.fire("input", { isComposing: false });
  assert.ok(rows().length > 0 && rows().length < 200);
  assert.ok(rows().every((r) => r.textContent.includes("approve7")));
  q.value = "";
  q.fire("input");
  const sel = byKey(e.host, "audit-decision")!;
  assert.ok(byTag(sel, "option").length === 3, "tümü + allow + deny");
  sel.value = "deny";
  sel.fire("change");
  assert.ok(rows().length > 0 && rows().every((r) => r.textContent.includes("deny")));
  assert.equal(e.P.get("audit").pure.state().decision, "deny");
});

test("audit: süzgece uyan kayıt yoksa okunur boş durum; sıfır kayıtta boş durum", () => {
  const e = started();
  setData(e.AM, "audit", { events: mkAudit(3) });
  e.go("audit");
  const q = byKey(e.host, "audit-q")!;
  q.value = "yokboyle";
  q.fire("input");
  assert.ok(e.host.textContent.includes("Süzgece uyan kayıt yok"));
  assert.ok(byKey(e.host, "audit-q"), "süzgeç denetimleri yerinde kalır");
  const e2 = started();
  setData(e2.AM, "audit", { events: [] });
  e2.go("audit");
  assert.ok(e2.host.textContent.includes("Henüz denetim kaydı yok"));
});

test("audit: filterAudit ayrıntı metninde de arar; açılan satır ayrıntıyı textContent ile gösterir ve gizli alanı maskeler", () => {
  const e = started();
  const evs = mkAudit(2);
  (evs[0] as any).details = { password: "hunter2", path: "C:/x" };
  setData(e.AM, "audit", { events: evs });
  e.go("audit");
  const pure = e.P.get("audit").pure;
  assert.equal(pure.filterAudit(e.P.pure.auditRows({ events: evs }), { q: "c:/x", decision: "" }).length, 1);
  assert.equal(byTag(e.host, "pre").length, 0, "katlı: ayrıntı yok");
  const btn = byKey(e.host, "x:a0")!;
  assert.equal(btn.attrs["aria-expanded"], "false");
  btn.click();
  const pre = byTag(e.host, "pre");
  assert.equal(pre.length, 1);
  assert.ok(pre[0]!.textContent.includes("C:/x"));
  assert.ok(!pre[0]!.textContent.includes("hunter2"));
  assert.ok(pre[0]!.textContent.includes("[gizli]"));
  assert.equal(byKey(e.host, "x:a0")!.attrs["aria-expanded"], "true");
  byKey(e.host, "x:a0")!.click();
  assert.equal(byTag(e.host, "pre").length, 0);
});

test("audit: XSS yükü etkisiz (yalnız metin; img/script öğesi oluşmaz)", () => {
  const e = started();
  const evil = "<img src=x onerror=alert(1)><script>alert(2)</script>";
  setData(e.AM, "audit", { events: mkAudit(1, { action: evil, result: evil, details: { m: evil } }) });
  e.go("audit");
  byKey(e.host, "x:a0")!.click();
  assert.ok(e.host.textContent.includes(evil));
  assert.ok(!e.doc.made.includes("img") && !e.doc.made.includes("script") && !e.doc.made.includes("iframe"));
});

test("audit: kopyalama TSV üretir ve AM.actions.copyText'e verir", async () => {
  const e = started();
  setData(e.AM, "audit", { events: mkAudit(3) });
  e.go("audit");
  byKey(e.host, "audit-copy")!.click();
  const c = e.calls.find((x) => x[0] === "copyText");
  assert.ok(c);
  assert.equal(String(c[1]).split("\n").length, 4, "başlık + 3 satır");
  assert.ok(String(c[1]).includes("\t"));
  await Promise.resolve(); await Promise.resolve();
  assert.ok(e.host.textContent.includes("Kopyalandı (3 satır)"));
});

// ---------- Görevler ----------
const mkTask = (i: number, over: Record<string, unknown> = {}) => ({ id: "t" + i, title: "Görev " + i, state: i % 2 ? "awaiting_approval" : "done", requestedAction: "file.write", request: { target: "D:\\x\\" + i }, createdAt: new Date(Date.UTC(2026, 9, 1 + i)).toISOString(), ...over });

test("tasks: görev tablosu satırları, durum şekil+metin, eylem/hedef; tıklama selectTopic", () => {
  const e = started();
  e.AM.state.tasks = [mkTask(1), mkTask(2)];
  setData(e.AM, "workflows", { workflows: [] });
  e.go("tasks");
  const tables = byTag(e.host, "table");
  assert.ok(tables.length >= 1);
  const trs = byTag(byTag(e.host, "tbody")[0]!, "tr");
  assert.equal(trs.length, 2);
  assert.ok(trs[0]!.textContent.includes("Görev 2"), "varsayılan: en yeni üstte");
  assert.ok(trs[1]!.textContent.includes("Onay bekliyor"));
  assert.ok(trs[1]!.textContent.includes("file.write → D:\\x\\1"));
  assert.ok(walk(trs[1]!).some((n) => n.attrs["aria-hidden"] === "true" && n.textContent === "!"), "şekil görünür (aria-hidden)");
  byKey(e.host, "task:t1")!.click();
  assert.deepEqual(J(e.calls.find((c) => c[0] === "selectTopic")), ["selectTopic", "t1"]);
  trs[0]!.click();
  assert.equal(e.calls.filter((c) => c[0] === "selectTopic").length, 2, "satıra tıklama da açar");
});

test("tasks: başlığa göre sıralama düğmesi yönü değiştirir; aria-sort doğru", () => {
  const e = started();
  e.AM.state.tasks = [mkTask(1, { title: "Beta" }), mkTask(2, { title: "Alfa" }), mkTask(3, { title: "çilek" })];
  setData(e.AM, "workflows", { workflows: [] });
  e.P.get("tasks").pure.resetSort();
  e.go("tasks");
  const order = () => byTag(byTag(e.host, "tbody")[0]!, "tr").map((r) => r.children[0]!.textContent);
  byKey(e.host, "sort:title")!.click();
  assert.deepEqual(order(), ["Alfa", "Beta", "çilek"]);
  assert.equal(byTag(e.host, "th").find((t) => t.attrs["aria-sort"] === "ascending") !== undefined, true);
  byKey(e.host, "sort:title")!.click();
  assert.deepEqual(order(), ["çilek", "Beta", "Alfa"]);
  e.P.get("tasks").pure.resetSort();
});

test("tasks: XSS başlığı yalnız metin; boş görev listesi okunur", () => {
  const e = started();
  const evil = "<img src=x onerror=alert(1)>";
  e.AM.state.tasks = [mkTask(1, { title: evil })];
  setData(e.AM, "workflows", { workflows: [] });
  e.go("tasks");
  assert.ok(e.host.textContent.includes(evil));
  assert.ok(!e.doc.made.includes("img"));
  const e2 = started();
  setData(e2.AM, "workflows", { workflows: [] });
  e2.go("tasks");
  assert.ok(e2.host.textContent.includes("Henüz görev yok"));
  assert.ok(e2.host.textContent.includes("Henüz iş akışı yok"));
});

test("tasks: iş akışı adım ilerlemesi (progress) ve hata durumu", () => {
  const e = started();
  setData(e.AM, "workflows", { workflows: [{ id: "w1", taskId: "t9", title: "Yayın", state: "running", stepsDone: 2, stepsTotal: 4, updatedAt: "2026-10-22T10:00:00Z" }, { id: "w2", title: "Bilinmeyen adım", state: "weird", stepsDone: null, stepsTotal: null }] });
  e.go("tasks");
  const pr = byTag(e.host, "progress");
  assert.equal(pr.length, 1);
  assert.equal(pr[0]!.attrs["max"], "4");
  assert.equal(pr[0]!.attrs["value"], "2");
  assert.ok(e.host.textContent.includes("2/4 adım"));
  assert.ok(e.host.textContent.includes("%50"));
  assert.ok(e.host.textContent.includes("Adım sayısı bilinmiyor"));
  assert.ok(e.host.textContent.includes("Durum bilinmiyor"));
  const e2 = started();
  e2.AM.state.data["workflows"] = { status: "error", value: null, reason: "404: yok" };
  e2.go("tasks");
  assert.ok(alerts(e2.host)[0]!.textContent.includes("404: yok"));
  const p = e.P.get("tasks").pure;
  assert.equal(p.normWorkflow({ stepsDone: 9, stepsTotal: 4 }).done, 4, "yapılan adım toplamı aşamaz");
  assert.equal(p.normWorkflow({ stepsDone: 1, stepsTotal: 0 }).total, null);
});

// ---------- Güvenlik ----------
const POLICY = { contractId: "c-1", allowedActions: ["file.read", "task.create"], approvalRequiredActions: ["file.write"], allowedDirs: ["D:\\YusufII\\Projeler\\agentmom"], forbiddenDirs: ["D:\\YusufII\\HAFIZAM1\\anahtarlar", "C:\\Windows"], trustedRepos: ["https://example.test/agentmom.git"], allowedProviders: ["claude-code"], paidRoute: "none", maxRuntimeMs: 600000 };

test("security: politika özeti sayılar, yollar ve ücretli rota KAPALI", () => {
  const e = started();
  e.AM.state.policy = POLICY;
  e.go("security");
  const t = e.host.textContent;
  for (const s of ["file.read", "file.write", "D:\\YusufII\\Projeler\\agentmom", "C:\\Windows", "example.test/agentmom.git", "claude-code", "KAPALI", "600 sn"]) assert.ok(t.includes(s), s);
  const p = e.P.get("security").pure.policySummary(POLICY);
  assert.deepEqual(J(p.counts), { allowedActions: 2, approvalActions: 1, allowedDirs: 1, forbiddenDirs: 2, trustedRepos: 1, allowedProviders: 1 });
  assert.equal(p.paid, "none");
  assert.equal(p.maxRuntimeSec, 600);
});

test("security: kalıcı silme yok ve politikayı yalnız Yusuf değiştirir notları; DEĞİŞTİRME DÜĞMESİ YOK", () => {
  const e = started();
  e.AM.state.policy = POLICY;
  e.go("security");
  const t = e.host.textContent;
  assert.ok(t.includes("Kalıcı silme yoktur"));
  assert.ok(t.includes("yalnız Yusuf açık onayıyla değiştirir"));
  const buttons = byTag(e.host, "button").map((b) => b.attrs["data-am-key"]);
  assert.deepEqual(buttons, ["back", "grant-new-submit", "change-new-submit", "rule-new-submit"], "politika değiştirme düğmesi yok; yalnız 'Sohbete dön' ve üç oluşturma formunun Ekle düğmesi");
  const fields = [...byTag(e.host, "input"), ...byTag(e.host, "select"), ...byTag(e.host, "textarea")];
  assert.ok(fields.length > 0 && fields.every((f) => /^(gf|cf|rf)-/.test(f.attrs["data-am-key"] ?? "")), "giriş alanları yalnız oluşturma formlarında");
});

test("security: ücretli rota 'approved' / bilinmeyen dürüstçe gösterilir; belirteç görünmez", () => {
  const p = makeEnv().P.get("security").pure;
  assert.equal(p.paidKind("approved"), "approved");
  assert.equal(p.paidKind(undefined), "unknown", "bilinmeyen KAPALI varsayılmaz");
  const e = started();
  e.AM.state.policy = { ...POLICY, paidRoute: "approved", trustedRepos: ["https://x.test/r?token=sk-abcdefghijklmnopqrstuvwx"] };
  e.go("security");
  assert.ok(e.host.textContent.includes("AÇIK (onaylı)"));
  assert.ok(!e.host.textContent.includes("sk-abcdefghijkl"));
  const e2 = started();
  e2.AM.state.policy = { ...POLICY, paidRoute: undefined };
  e2.go("security");
  assert.ok(e2.host.textContent.includes("Bilinmiyor"));
  assert.ok(!e2.host.textContent.includes("otomatik yönlendirme yok"), "KAPALI kartı gösterilmez");
});

test("security: politika yoksa hata kartı (eksik bilgi 'izinli' gösterilmez); boş sağlayıcı listesi açık yazılır", () => {
  const e = started();
  e.go("security");
  assert.equal(alerts(e.host).length, 1);
  assert.ok(alerts(e.host)[0]!.textContent.includes("izinli"));
  byKey(e.host, "retry")!.click();
  assert.ok(e.calls.some((c) => c[0] === "refresh"));
  const e2 = started();
  e2.AM.state.policy = { ...POLICY, allowedProviders: [] };
  e2.go("security");
  assert.ok(e2.host.textContent.includes("hiçbir sağlayıcı açıkça izinli değil"));
});

// ---------- Projeler ----------
test("projects: tek proje kartı, kök klasör, güvenilir depolar ve 'Çoklu proje: Planlı (D9)' notu", () => {
  const e = started();
  e.AM.state.policy = POLICY;
  e.go("projects");
  const t = e.host.textContent;
  assert.ok(t.includes("AgentMom"));
  assert.ok(t.includes("D:\\YusufII\\Projeler\\agentmom"));
  assert.ok(t.includes("https://example.test/agentmom.git"));
  assert.ok(t.includes("Çoklu proje: Planlı (D9)"));
  assert.ok(walk(e.host).some((n) => n.className.includes("am-pg-cap") && n.textContent.includes("Planlı")));
  assert.equal(byTag(e.host, "a").length, 0, "yol bağlantı değildir");
  const p = e.P.get("projects").pure;
  assert.equal(p.projectName({ name: "  " }), "AgentMom");
  assert.equal(p.projectName({ name: "X\u202eY" }), "X Y");
  assert.equal(p.pathsOf(null), null);
});

test("projects: politika yoksa kök klasör uydurulmaz, hata kartı", () => {
  const e = started();
  e.go("projects");
  assert.ok(e.host.textContent.includes("Bildirilmedi"));
  assert.equal(alerts(e.host).length, 1);
});

// ---------- Genel bakış ----------
test("overview: özet kartları gerçek sayılardan; Bekleyenler sağ paneli açar", () => {
  const e = started();
  e.AM.state.tasks = [mkTask(1), mkTask(3), mkTask(2), { ...mkTask(4), state: "running" }, { ...mkTask(5), state: "failed" }];
  e.AM.state.providers = [{ id: "a", capabilities: [{ operation: "execute", status: "verified" }] }, { id: "b", capabilities: [{ operation: "execute", status: "unavailable" }] }, { id: "c", capabilities: [] }];
  e.AM.state.debt = [{ kind: "broken" }, { kind: "overdue" }, { kind: "pending" }];
  e.AM.state.decisions = [{ reviewState: "ok" }, { reviewState: "due" }];
  e.AM.state.backup = { lastBackup: { at: "2026-10-22T08:00:00Z", dir: "d", reason: "r" }, warnings: [{ code: "x", text: "y" }], lastVerify: { ok: true } };
  e.AM.state.health = { status: "green", checks: [{ name: "n", ok: true, detail: "" }] };
  setData(e.AM, "audit", { events: mkAudit(12) });
  e.go("overview");
  const t = e.host.textContent;
  assert.ok(t.includes("2 onay bekliyor · 1 çalışıyor · 1 başarısız"));
  assert.ok(t.includes("1 doğrulandı · 0 kısmi · 1 doğrulanmadı · 1 kullanılamıyor"));
  assert.ok(t.includes("1 kırık · 1 gecikmiş · 1 bekliyor"));
  assert.ok(t.includes("1 karar gözden geçirme bekliyor · toplam 2"));
  assert.ok(t.includes("1 uyarı"));
  assert.ok(t.includes("Sağlıklı"));
  assert.equal(walk(byTag(e.host, "tbody")[0]!).filter((n) => n.tag === "tr").length, 8, "son 8 denetim olayı");
  byKey(e.host, "pending")!.click();
  assert.deepEqual(J(e.calls.find((c) => c[0] === "setView")), ["setView", { panelOpen: true, panelTab: "approvals" }]);
  assert.ok(byKey(e.host, "pending")!.textContent.includes("(2)"));
  byKey(e.host, "audit-all")!.click();
  assert.deepEqual(J(e.calls.find((c) => c[0] === "navigate")), ["navigate", "audit"]);
});

test("overview: yedek/sağlık/sağlayıcı verisi yoksa dürüst 'alınamadı/bilinmiyor' (başarı uydurulmaz)", () => {
  const e = started();
  setData(e.AM, "audit", { events: [] });
  e.go("overview");
  const t = e.host.textContent;
  assert.ok(t.includes("Alınamadı"));
  assert.ok(t.includes("Bilinmiyor"));
  assert.ok(t.includes("Sağlayıcı verisi yok"));
  assert.ok(!t.includes("Sağlıklı"));
  assert.ok(t.includes("Henüz denetim olayı yok"));
});

test("overview saf mantık: provider durumu execute yeteneğinden, yoksa toplamdan", () => {
  const p = makeEnv().P.get("overview").pure;
  assert.equal(p.providerStatus({ capabilities: [{ operation: "execute", status: "partial" }, { operation: "cancel", status: "verified" }] }), "partial");
  assert.equal(p.providerStatus({ capabilities: [{ operation: "cancel", status: "verified" }, { operation: "getStatus", status: "verified" }] }), "verified");
  assert.equal(p.providerStatus({ capabilities: [{ operation: "cancel", status: "unavailable" }, { operation: "x", status: "verified" }] }), "unavailable");
  assert.equal(p.providerStatus({ capabilities: [{ operation: "execute", status: "garip" }] }), "unverified");
  assert.equal(p.providerStatus({}), "unknown");
  assert.equal(p.taskStats([{ state: "awaiting_approval" }, { state: "blocked" }, null]).failed, 1);
  assert.equal(p.backupSummary(null).kind, "unknown");
  assert.equal(p.backupSummary({}).kind, "never");
  assert.equal(p.backupSummary({ lastBackup: { at: "x" }, lastVerify: { ok: false } }).kind, "warn");
  assert.equal(p.healthSummary({ status: "red", checks: [{ ok: false }] }).failing, 1);
});

// ---------- Odak ve erişilebilirlik ----------
test("yeniden çizimde odak data-am-key ile geri verilir (süzgeç kutusu yazarken kaybolmaz)", () => {
  const e = started();
  setData(e.AM, "audit", { events: mkAudit(3) });
  e.go("audit");
  const q = byKey(e.host, "audit-q")!;
  q.focus();
  q.value = "task";
  q.fire("input");
  const q2 = byKey(e.host, "audit-q")!;
  assert.notEqual(q2, q, "öğe yeniden kuruldu");
  assert.equal(e.doc.activeElement, q2, "odak yeni öğede");
  assert.equal(q2.value, "task", "değer korunur");
});

test("tablolar gerçek table/th scope, başlık h1 ve kırıntı nav; bölgeler etiketli", () => {
  const e = started();
  setData(e.AM, "audit", { events: mkAudit(2) });
  e.go("audit");
  assert.equal(byTag(e.host, "h1").length, 1);
  assert.ok(byTag(e.host, "nav")[0]!.attrs["aria-label"]);
  assert.ok(byTag(e.host, "caption").length === 1);
  const ths = byTag(e.host, "th");
  assert.ok(ths.filter((t) => t.attrs["scope"] === "col").length === 5);
  assert.ok(ths.filter((t) => t.attrs["scope"] === "row").length === 2);
  assert.equal(byTag(e.host, "table")[0]!.parentNode!.attrs["tabindex"] ?? "x", "x"); // tabIndex özelliği (öznitelik değil)
  assert.equal((byTag(e.host, "table")[0]!.parentNode as any).tabIndex, 0, "kaydırılan bölge klavyeyle odaklanır");
  assert.equal(walk(e.host).find((n) => n.tag === "div" && n.attrs["role"] === "region" && n.attrs["aria-labelledby"])!.attrs["aria-labelledby"], byTag(e.host, "h1")[0]!.id);
});

// ---------- Kaynak taraması ----------
test("kaynak taraması: yasak API, satır içi stil ve dış kaynak yok", () => {
  const banned: Array<[RegExp, string]> = [
    [/\binnerHTML\b/, "innerHTML"], [/\bouterHTML\b/, "outerHTML"], [/insertAdjacentHTML/, "insertAdjacentHTML"], [/document\.write/, "document.write"],
    [/\beval\s*\(/, "eval"], [/new\s+Function/, "new Function"], [/setTimeout\s*\(\s*["'`]/, "dize setTimeout"], [/srcdoc/, "srcdoc"], [/postMessage/, "postMessage"],
    [/document\.cookie/, "cookie"], [/localStorage|sessionStorage/, "depolama"], [/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/, "ağ"],
    [/\.style\b|setAttribute\(\s*["']style["']/, "satır içi stil"], [/\bon[a-z]+\s*=\s*["']/, "satır içi olay"], [/https?:\/\//, "dış adres"], [/<style|<script/i, "etiket"],
  ];
  for (const f of ALL_JS) {
    const src = read(f);
    for (const [re, name] of banned) assert.ok(!re.test(src), f + ": " + name);
  }
  const css = read("pages.css");
  assert.ok(!/url\(|@import|https?:\/\//.test(css), "css: dış kaynak yok");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), "css: sabit renk yok");
  const colorProps = css.match(/(^|[;{\s])(color|background|background-color|border(?:-[a-z]+)?-color|border|outline|accent-color)\s*:[^;}]*/g) || [];
  for (const decl of colorProps) {
    const v = decl.split(":").slice(1).join(":");
    assert.ok(!/\b(rgb|hsl)a?\(/.test(v), "css: ham renk işlevi yok -> " + decl.trim());
  }
});

test("kaynak taraması: dinamik sınıf adı yalnız sabit kümeden; metinler modül önekli kaydedilir", () => {
  const e = makeEnv();
  for (const [mod, tr] of Object.entries(e.reg)) for (const k of Object.keys(tr)) assert.ok(k.startsWith(mod + "."), k);
  assert.deepEqual(Object.keys(e.reg).sort(), ["page-audit", "page-overview", "page-projects", "page-security", "page-tasks", "pages"]);
  // Kullanılan her T("anahtar") gerçekten kayıtlı
  for (const f of ALL_JS) {
    const src = read(f);
    for (const m of src.matchAll(/\bT\(\s*"([a-z][a-z0-9-]*\.[A-Za-z0-9._]+)"/g)) assert.ok(!e.win.AM_T(m[1]!).startsWith("⟦"), f + ": eksik metin " + m[1]);
  }
  const pure = e.P.pure;
  assert.equal(pure.toneCls("evil\" onmouseover=\""), pure.toneCls("muted"), "bilinmeyen ton sabit sınıfa düşer");
});

test("kapsam: sayfa kimlikleri çekirdekteki PAGE_IDS ile aynı; sol menü 13 sayfayı ve gezinme eylemini kullanır", () => {
  const core = read("core.js");
  const m = core.match(/var PAGE_IDS = \[([^\]]*)\]/)!;
  const coreIds = m[1]!.split(",").map((s) => s.trim().replace(/"/g, ""));
  const e = makeEnv(["pages.js"]);
  assert.deepEqual(J(e.P.pure.PAGE_IDS), coreIds);
  const sbWin: any = {};
  vm.runInContext(read("sidebar.js"), vm.createContext({ window: sbWin }), { filename: "sidebar.js" });
  assert.deepEqual(J(sbWin.AM_SIDEBAR.pure.navPageIds()), coreIds);
  for (const id of coreIds) assert.ok(e.P.pure.titleKey(id), id);
  assert.equal(e.P.pure.titleKey("chat"), null);
});

// ---------- Canlı izleme, zincir doğrulama, eylem anlamları [Claude#agentmom-faz11-risk] ----------
const MON = { at: "2026-10-22T10:00:00Z", running: [], waiting: [], slow: [], retries: [], bottleneck: { kind: "approval_wait", text: "Onay 42 dk bekliyor", taskId: "t9" }, counts: { running: 2, waiting: 3, failedLast24h: 1 } };

test("overview: canlı izleme sayıları ve darboğaz kartı; göreve tıklayınca selectTopic", () => {
  const e = started();
  setData(e.AM, "audit", { events: [] });
  setData(e.AM, "monitor", MON);
  e.go("overview");
  const t = e.host.textContent;
  assert.ok(t.includes("Canlı izleme") && t.includes("Çalışan") && t.includes("Bekleyen (onay)") && t.includes("Başarısız (son 24 saat)"));
  assert.ok(t.includes("Onay bekliyor") && t.includes("Onay 42 dk bekliyor"));
  byKey(e.host, "bottleneck-open")!.click();
  assert.deepEqual(J(e.calls.find((c) => c[0] === "selectTopic")), ["selectTopic", "t9"]);
});

test("overview: monitor verisi yoksa 'Henüz ölçüm yok' dürüst kartı (sıfır uydurulmaz)", () => {
  const e = started();
  setData(e.AM, "audit", { events: [] });
  setData(e.AM, "monitor", {});
  e.go("overview");
  assert.ok(e.host.textContent.includes("Henüz ölçüm yok"));
  assert.ok(!byKey(e.host, "bottleneck-open"));
});

test("overview: bilinmeyen sayı null ise 'Ölçülmedi' (0 değil); darboğaz null ise 'bilgisi yok'", () => {
  const p = makeEnv().P.get("overview").pure;
  const m = J(p.monitorSummary({ counts: { running: null, waiting: 4, failedLast24h: undefined }, bottleneck: null }));
  assert.deepEqual(m.counts, { running: null, waiting: 4, failed: null });
  assert.equal(m.bottleneck, null);
  assert.equal(p.monitorSummary(null).has, false);
  assert.equal(p.monitorSummary({ counts: { running: -3 } }).counts.running, null);
  const e = started();
  setData(e.AM, "audit", { events: [] });
  setData(e.AM, "monitor", { counts: { running: null, waiting: 4, failedLast24h: null }, bottleneck: null });
  e.go("overview");
  assert.ok(e.host.textContent.includes("Ölçülmedi"));
  assert.ok(e.host.textContent.includes("Darboğaz bilgisi yok"));
});

test("overview: darboğaz 'none' bağlantı üretmez; taskId bozuksa düğme yok", () => {
  const p = makeEnv().P.get("overview").pure;
  assert.equal(p.monitorSummary({ bottleneck: { kind: "none", text: "yok", taskId: "t1" } }).bottleneck.taskId, "");
  assert.equal(p.monitorSummary({ bottleneck: { kind: "slow_step", text: "x", taskId: 5 } }).bottleneck.taskId, "");
  assert.equal(p.monitorSummary({ bottleneck: { kind: "uydurma", text: "x" } }).bottleneck.kind, "unknown");
});

test("overview: monitor için loadData yalnız bir kez; yeniden çizimde döngü yok", () => {
  const e = started();
  setData(e.AM, "audit", { events: [] });
  e.go("overview"); e.go("overview"); e.go("overview");
  assert.equal(e.calls.filter((c) => c[0] === "loadData" && c[1] === "monitor").length, 1);
});

test("overview: monitor XSS yükü yalnız metin", () => {
  const e = started();
  setData(e.AM, "audit", { events: [] });
  setData(e.AM, "monitor", { ...MON, bottleneck: { kind: "slow_step", text: "<img src=x onerror=alert(1)>", taskId: "t1" } });
  e.go("overview");
  assert.equal(byTag(e.host, "img").length, 0);
  assert.ok(e.host.textContent.includes("<img src=x onerror=alert(1)>"));
});

test("audit: zincir SAĞLAM kartı; zincirli/toplam ve eski satır 'zincire girmez' notu", () => {
  const e = started();
  setData(e.AM, "audit", { events: mkAudit(3) });
  setData(e.AM, "auditVerify", { ok: true, total: 10, chained: 7, firstBreak: null, checkedAt: "2026-10-22T10:00:00Z" });
  e.go("audit");
  const t = e.host.textContent;
  assert.ok(t.includes("Zincir doğrulama") && t.includes("ZİNCİR SAĞLAM"));
  assert.ok(t.includes("7 / 10 satır zincirli"));
  assert.ok(t.includes("3 eski satır zincirli değil") && t.includes("zincire girmez"));
  assert.equal(alerts(e.host).length, 0);
});

test("audit: zincir KIRIK görünür: role=alert, ilk kırılma id+zaman, uyarı", () => {
  const e = started();
  setData(e.AM, "audit", { events: mkAudit(3) });
  setData(e.AM, "auditVerify", { ok: false, total: 10, chained: 10, firstBreak: { id: "a77", ts: "2026-10-21T08:30:00Z" }, checkedAt: "2026-10-22T10:00:00Z" });
  e.go("audit");
  const t = e.host.textContent;
  assert.ok(t.includes("ZİNCİR KIRIK"));
  assert.ok(t.includes("a77"));
  assert.ok(t.includes("Bu kayıtlara güvenmeyin"));
  assert.equal(alerts(e.host).length, 1);
  assert.ok(!t.includes("ZİNCİR SAĞLAM"));
});

test("audit: zincirli satır yokken 'SAĞLAM' denmez; nötr 'henüz başlamadı'", () => {
  const e = started();
  setData(e.AM, "audit", { events: mkAudit(3) });
  setData(e.AM, "auditVerify", { ok: true, total: 11, chained: 0, firstBreak: null, checkedAt: "2026-10-22T10:00:00Z" });
  e.go("audit");
  const t = e.host.textContent;
  assert.ok(t.includes("Zincir henüz başlamadı"));
  assert.ok(!t.includes("ZİNCİR SAĞLAM"));
  assert.ok(t.includes("0 / 11 satır zincirli"));
  assert.equal(alerts(e.host).length, 0);
  assert.equal(makeEnv().P.get("audit").pure.chainSummary({ ok: true, total: 11, chained: 0 }).status, "pending");
});

test("audit: chainSummary ok=true olmadıkça sağlam sayılmaz; firstBreak varsa ok olsa bile KIRIK", () => {
  const p = makeEnv().P.get("audit").pure;
  assert.equal(p.chainSummary({ ok: true, total: 1, chained: 1 }).status, "ok");
  assert.equal(p.chainSummary({ ok: "true" }).status, "unknown");
  assert.equal(p.chainSummary({}).status, "unknown");
  assert.equal(p.chainSummary(null).status, "unknown");
  assert.equal(p.chainSummary({ ok: true, firstBreak: { id: "x", ts: "t" } }).status, "broken");
  assert.equal(p.chainSummary({ ok: false }).status, "broken");
  assert.equal(p.chainSummary({ ok: true, total: 5, chained: 9 }).legacy, null);
});

test("audit: 'Yeniden doğrula' loadData('auditVerify') çağırır; ilk istek yalnız bir kez", () => {
  const e = started();
  setData(e.AM, "audit", { events: mkAudit(2) });
  e.go("audit"); e.go("audit");
  assert.equal(e.calls.filter((c) => c[0] === "loadData" && c[1] === "auditVerify").length, 1, "yoklama yok");
  setData(e.AM, "auditVerify", { ok: true, total: 2, chained: 2 });
  e.go("audit");
  byKey(e.host, "audit-reverify")!.click();
  assert.equal(e.calls.filter((c) => c[0] === "loadData" && c[1] === "auditVerify").length, 2);
});

test("audit: zincir hata kartı + XSS yükü etkisiz", () => {
  const e = started();
  setData(e.AM, "audit", { events: mkAudit(1) });
  e.AM.state.data["auditVerify"] = { status: "error", value: null, reason: "500: <img src=x>" };
  e.go("audit");
  assert.equal(alerts(e.host).length, 1);
  assert.equal(byTag(e.host, "img").length, 0);
  const e2 = started();
  setData(e2.AM, "audit", { events: mkAudit(1) });
  setData(e2.AM, "auditVerify", { ok: false, firstBreak: { id: "<script>x</script>", ts: "bozuk" } });
  e2.go("audit");
  assert.equal(byTag(e2.host, "script").length, 0);
});

const SEM = { actions: [
  { action: "file.delete", effect: "Dosyayı kalıcı siler", reversible: "no", undo: "Yok", sensitivity: "high" },
  { action: "file.write", effect: "Dosya yazar", reversible: "yes", undo: "Önceki sürümü geri yükle", sensitivity: "medium" },
  { action: "net.post", effect: "Dışarı veri gönderir", reversible: "partial", undo: "Karşı tarafta silme iste", sensitivity: "high" },
  { action: "x.unknown", effect: "?", reversible: "garip", undo: "", sensitivity: "" },
] };

test("security: eylem anlamları tablosu; geri alınabilir şekil+metin, hassasiyet ve geri alma yolu", () => {
  const e = started();
  e.AM.state.policy = null;
  setData(e.AM, "actionSemantics", SEM);
  e.go("security");
  const t = e.host.textContent;
  assert.ok(t.includes("Eylem anlamları ve geri alma haritası"));
  assert.ok(t.includes("GERİ ALINAMAZ") && t.includes("Kısmen") && t.includes("Geri alınabilir") && t.includes("Bilinmiyor"));
  assert.ok(t.includes("Önceki sürümü geri yükle") && t.includes("Geri alma yolu bildirilmedi"));
  const tables = byTag(e.host, "table").filter((x) => x.children.some((c) => c.tag === "caption" && c.textContent.includes("geri alma haritası")));
  assert.equal(tables.length, 1);
  assert.equal(walk(byTag(tables[0]!, "tbody")[0]!).filter((n) => n.tag === "tr").length, 4);
  assert.ok(walk(byTag(tables[0]!, "thead")[0]!).filter((n) => n.tag === "th").every((n) => n.attrs["scope"] === "col"));
});

test("security: bilinmeyen reversible 'geri alınabilir' sayılmaz", () => {
  const p = makeEnv().P.get("security").pure;
  assert.equal(p.revKind("garip"), "unknown");
  assert.equal(p.revKind(undefined), "unknown");
  assert.equal(p.revKind("yes"), "yes");
  assert.deepEqual(J(p.semRows({ actions: [{ action: "a", reversible: "x" }, null, 5] })).map((r: any) => r.reversible), ["unknown"]);
  assert.deepEqual(J(p.semRows(null)), []);
});

test("security: süzgeçler (metin ve geri alınabilirlik) satırları azaltır", () => {
  const e = started();
  setData(e.AM, "actionSemantics", SEM);
  const p = e.P.get("security").pure;
  const rows = p.semRows(SEM);
  assert.equal(p.filterSem(rows, { q: "", rev: "no" }).length, 1);
  assert.equal(p.filterSem(rows, { q: "DOSYA", rev: "" }).length, 2);
  assert.equal(p.filterSem(rows, { q: "dosya", rev: "yes" }).length, 1);
  e.go("security");
  const sel = byKey(e.host, "sem-rev")!;
  sel.value = "no";
  sel.fire("change");
  assert.ok(e.host.textContent.includes("1 / 4 eylem"));
  const q = byKey(e.host, "sem-q")!;
  q.value = "yokboyle";
  q.fire("input");
  assert.ok(e.host.textContent.includes("Süzgece uyan eylem yok"));
  p.semState().q = ""; p.semState().rev = "";
});

test("security: eylem anlamları yükleniyor/hata/boş durumları; loadData bir kez", () => {
  const e = started();
  e.go("security"); e.go("security");
  assert.equal(e.calls.filter((c) => c[0] === "loadData" && c[1] === "actionSemantics").length, 1);
  const e2 = started();
  e2.AM.state.data["actionSemantics"] = { status: "error", value: null, reason: "503: kapalı" };
  e2.go("security");
  assert.ok(alerts(e2.host).some((n) => n.textContent.includes("503: kapalı")));
  const e3 = started();
  setData(e3.AM, "actionSemantics", { actions: [] });
  e3.go("security");
  assert.ok(e3.host.textContent.includes("Eylem anlamı kaydı yok"));
});

test("security: eylem anlamları XSS yükü yalnız metin; belirteç maskelenir", () => {
  const e = started();
  setData(e.AM, "actionSemantics", { actions: [{ action: "<img src=x onerror=alert(1)>", effect: "<script>1</script>", reversible: "no", undo: "sk-abcdefghijklmnopqrstuvwx", sensitivity: "high" }] });
  e.go("security");
  assert.equal(byTag(e.host, "img").length, 0);
  assert.equal(byTag(e.host, "script").length, 0);
  assert.ok(!e.host.textContent.includes("sk-abcdefghijklmnopqrstuvwx"));
});

// ---------- Geçici izinler, değişiklik defteri, otomasyon [Claude#agentmom-faz11-yetenek] ----------
const secBody = (host: FNode, title: string): FNode => {
  const sec = walk(host).find((n) => n.tag === "section" && walk(n).some((h) => h.tag === "h2" && h.textContent === title));
  assert.ok(sec, "bölüm yok: " + title);
  return sec!;
};
const GRANTS = { grants: [
  { id: "g1", action: "file.write", scopeDir: "D:\\proje\\a", reason: "Sürüm notu yazılacak", createdBy: "yusuf", createdAt: "2026-10-22T09:00:00Z", expiresAt: "2026-10-22T12:00:00Z", maxUses: 5, uses: 2, revokedAt: null, revokedBy: null, state: "active" },
  { id: "g2", action: "net.post", scopeDir: "D:\\proje\\b", reason: "bitti", createdBy: "yusuf", expiresAt: "2026-10-22T12:00:00Z", maxUses: 1, uses: 1, state: "exhausted" },
  { id: "g3", action: "file.write", scopeDir: "D:\\proje\\c", reason: "eski", createdBy: "yusuf", expiresAt: "2026-10-20T12:00:00Z", maxUses: 3, uses: 0, state: "expired" },
  { id: "g4", action: "file.write", scopeDir: "D:\\proje\\d", reason: "vazgeçildi", createdBy: "yusuf", expiresAt: "2026-10-23T12:00:00Z", maxUses: 3, uses: 0, revokedAt: "2026-10-22T10:00:00Z", revokedBy: "yusuf", state: "revoked" },
], maxTtlMinutes: 240, maxUses: 10, grantableActions: ["file.write"] };

test("grants: satırlar, durum rozetleri (şekil+metin), kalan kullanım ve İptal et yalnız etkin izinde", () => {
  const e = started();
  setData(e.AM, "grants", GRANTS);
  e.go("security");
  const sec = secBody(e.host, "Geçici yetenek izinleri");
  const t = sec.textContent;
  assert.ok(t.includes("Etkin") && t.includes("Tükendi") && t.includes("Süresi doldu") && t.includes("İptal edildi"));
  assert.ok(t.includes("3 / 5") && t.includes("0 / 1") && t.includes("Sürüm notu yazılacak"));
  assert.ok(t.includes("yasak klasör, bütçe, ücretli rota ve sözleşme reddini gevşetmez"));
  assert.equal(walk(sec).filter((n) => n.tag === "tr").length, 5, "başlık + 4 satır");
  assert.ok(byKey(sec, "grant-revoke:g1"));
  for (const id of ["g2", "g3", "g4"]) assert.equal(byKey(sec, "grant-revoke:" + id), undefined, id + " için iptal düğmesi olmamalı");
  assert.equal(walk(sec).filter((n) => n.tag === "button" && (n.attrs["data-am-key"] ?? "").startsWith("grant-revoke:")).length, 1);
  assert.ok(walk(sec).some((n) => n.className.includes("am-pg-shape") && n.attrs["aria-hidden"] === "true"));
});

test("grants: İptal et düğmesi çekirdek eylemini kimlikle çağırır (onay penceresi çekirdekte)", () => {
  const e = started();
  e.AM.actions.grantRevoke = (id: string) => { e.calls.push(["grantRevoke", id]); return Promise.resolve(); };
  setData(e.AM, "grants", GRANTS);
  e.go("security");
  byKey(e.host, "grant-revoke:g1")!.click();
  assert.deepEqual(e.calls.filter((c) => c[0] === "grantRevoke"), [["grantRevoke", "g1"]]);
});

test("grants: yükleniyor / hata / boş durumları; loadData bir kez", () => {
  const e = started();
  e.go("security"); e.go("security");
  assert.equal(e.calls.filter((c) => c[0] === "loadData" && c[1] === "grants").length, 1);
  assert.ok(walk(secBody(e.host, "Geçici yetenek izinleri")).some((n) => n.attrs["aria-busy"] === "true"));
  const e2 = started();
  e2.AM.state.data["grants"] = { status: "error", value: null, reason: "500: kapalı" };
  e2.go("security");
  assert.ok(alerts(secBody(e2.host, "Geçici yetenek izinleri")).some((n) => n.textContent.includes("500: kapalı")));
  byKey(secBody(e2.host, "Geçici yetenek izinleri"), "retry")!.click();
  assert.ok(e2.calls.filter((c) => c[0] === "loadData" && c[1] === "grants").length === 1, "yeniden dene loadData ister");
  const e3 = started();
  setData(e3.AM, "grants", { grants: [] });
  e3.go("security");
  assert.ok(secBody(e3.host, "Geçici yetenek izinleri").textContent.includes("Geçici izin kaydı yok"));
});

test("grants: XSS yükü ve belirteç yalnız metin; eksik/bozuk alanlar çökme yapmaz; bilinmeyen durum etkin sayılmaz", () => {
  const e = started();
  setData(e.AM, "grants", { grants: [
    { id: "x1", action: "<img src=x onerror=alert(1)>", scopeDir: "<script>1</script>", reason: "sk-abcdefghijklmnopqrstuvwx \u202Egnp.exe", state: "active", maxUses: 2, uses: 1, expiresAt: "<b>yarın</b>" },
    null, 5, "x", {}, { id: "x2", state: "garip", maxUses: "3", uses: -1 },
  ] });
  e.go("security");
  assert.equal(byTag(e.host, "img").length, 0);
  assert.equal(byTag(e.host, "script").length, 0);
  assert.equal(byTag(e.host, "b").length, 0);
  const t = secBody(e.host, "Geçici yetenek izinleri").textContent;
  assert.ok(!t.includes("sk-abcdefghijklmnopqrstuvwx") && !t.includes("\u202E"));
  assert.ok(byKey(e.host, "grant-revoke:x1"));
  assert.equal(byKey(e.host, "grant-revoke:x2"), undefined, "bilinmeyen durumda iptal düğmesi yok");
  const p = e.P.get("security").pure;
  assert.equal(p.grantKind("active "), "unknown");
  assert.equal(p.grantRows(null).length, 0);
  assert.equal(p.grantRows({ grants: "yok" }).length, 0);
  const e2 = started();
  setData(e2.AM, "grants", null);
  e2.go("security");
  assert.ok(secBody(e2.host, "Geçici yetenek izinleri").textContent.includes("Geçici izin kaydı yok"));
});

test("grants: başarısız iptal sonucu görünür hata kartı olur", () => {
  const e = started();
  setData(e.AM, "grants", GRANTS);
  e.AM.state.data["grantAction:g1"] = { status: "error", value: null, reason: "403: yalnız kullanıcı" };
  e.go("security");
  assert.ok(alerts(secBody(e.host, "Geçici yetenek izinleri")).some((n) => n.textContent.includes("403: yalnız kullanıcı")));
});

const CHANGES = { changes: [
  { id: "c1", ts: "2026-10-20T08:00:00Z", kind: "policy.update", summary: "Eski değişiklik", reason: "ilk", actor: "yusuf", taskId: null, auditId: "a1", files: ["a.txt"] },
  { id: "c3", ts: "2026-10-22T08:00:00Z", kind: "file.write", summary: "En yeni değişiklik", reason: "son", actor: "claude", taskId: "t1", auditId: "a3", files: [] },
  { id: "c2", ts: "2026-10-21T08:00:00Z", kind: "grant.revoke", summary: "Orta değişiklik", reason: "orta", actor: "yusuf", taskId: null, auditId: "a2", files: [] },
] };

test("changes: en yeni üstte; zaman, tür, özet, gerekçe, kim görünür", () => {
  const e = started();
  setData(e.AM, "changes", CHANGES);
  e.go("security");
  const sec = secBody(e.host, "Değişiklik defteri");
  const t = sec.textContent;
  for (const s of ["Zaman", "Tür", "Özet", "Gerekçe", "Kim", "file.write", "En yeni değişiklik", "son", "claude"]) assert.ok(t.includes(s), s);
  assert.ok(t.indexOf("En yeni değişiklik") < t.indexOf("Orta değişiklik") && t.indexOf("Orta değişiklik") < t.indexOf("Eski değişiklik"));
  assert.deepEqual(walk(sec).filter((n) => n.tag === "button").map((n) => n.attrs["data-am-key"]), ["change-new-submit"], "defterde satır eylemi yok; yalnız Ekle düğmesi");
  const p = e.P.get("security").pure;
  assert.deepEqual(J(p.changeRows(CHANGES)).map((r: any) => r.kind), ["file.write", "grant.revoke", "policy.update"]);
});

test("changes: yükleniyor / hata / boş; XSS ve belirteç etkisiz; bozuk kayıtlar çökertmez", () => {
  const e = started();
  e.go("security");
  assert.equal(e.calls.filter((c) => c[0] === "loadData" && c[1] === "changes").length, 1);
  assert.ok(walk(secBody(e.host, "Değişiklik defteri")).some((n) => n.attrs["aria-busy"] === "true"));
  const e2 = started();
  e2.AM.state.data["changes"] = { status: "error", value: null, reason: "503: kapalı" };
  e2.go("security");
  assert.ok(alerts(secBody(e2.host, "Değişiklik defteri")).some((n) => n.textContent.includes("503: kapalı")));
  const e3 = started();
  setData(e3.AM, "changes", { changes: [] });
  e3.go("security");
  assert.ok(secBody(e3.host, "Değişiklik defteri").textContent.includes("Değişiklik kaydı yok"));
  const e4 = started();
  setData(e4.AM, "changes", { changes: [{ ts: "bozuk", kind: "<img src=x onerror=alert(1)>", summary: "<script>1</script>", reason: "sk-abcdefghijklmnopqrstuvwx", actor: 7 }, null, "x", 3] });
  e4.go("security");
  assert.equal(byTag(e4.host, "img").length, 0);
  assert.equal(byTag(e4.host, "script").length, 0);
  assert.ok(!e4.host.textContent.includes("sk-abcdefghijklmnopqrstuvwx"));
  const e5 = started();
  setData(e5.AM, "changes", undefined);
  e5.go("security");
  assert.ok(secBody(e5.host, "Değişiklik defteri").textContent.includes("Değişiklik kaydı yok"));
});

const AUTO = {
  rules: [
    { id: "r1", name: "Hata bildirimi", eventPattern: "task.failed", actionKind: "notify", params: {}, enabled: true, cooldownSeconds: 60, createdBy: "yusuf", createdAt: "2026-10-20T08:00:00Z" },
    { id: "r2", name: "Görev aç", eventPattern: "backup.*", actionKind: "record_task", params: {}, enabled: false, cooldownSeconds: 300, createdBy: "yusuf", createdAt: "2026-10-20T08:00:00Z" },
  ],
  runs: [
    { id: "u1", ruleId: "r1", ts: "2026-10-22T08:00:00Z", eventAction: "task.failed", outcome: "notified", message: "Bildirildi" },
    { id: "u2", ruleId: "r2", ts: "2026-10-22T09:00:00Z", eventAction: "backup.done", outcome: "skipped_cooldown", message: "bekleme" },
    { id: "u3", ruleId: "r1", ts: "2026-10-22T10:00:00Z", eventAction: "task.failed", outcome: "error", message: "gönderilemedi" },
    { id: "u4", ruleId: "r2", ts: "2026-10-22T11:00:00Z", eventAction: "backup.done", outcome: "task_recorded", message: "kayıt" },
    { id: "u5", ruleId: "yok", ts: "2026-10-22T12:00:00Z", eventAction: "x", outcome: "skipped_rate", message: "sınır" },
  ],
  safeActions: ["notify", "record_task"], maxRunsPerHour: 20,
};

test("automation: kurallar (ad, desen, eylem, bekleme, açık/kapalı) ve Aç/Kapat düğmeleri; son çalışmalar rozetli", () => {
  const e = started();
  e.AM.actions.automationRule = (id: string, verb: string) => { e.calls.push(["automationRule", id, verb]); return Promise.resolve(); };
  setData(e.AM, "automation", AUTO);
  e.go("security");
  const sec = secBody(e.host, "Otomasyon");
  const t = sec.textContent;
  for (const s of ["Hata bildirimi", "task.failed", "Bildir", "Görev kaydı aç", "60 sn", "300 sn", "Açık", "Kapalı", "Son çalışmalar", "Bildirildi", "Bekleme nedeniyle atlandı", "Hata", "Görev kaydı açıldı", "Saatlik sınır nedeniyle atlandı", "gönderilemedi"]) assert.ok(t.includes(s), s);
  assert.ok(t.includes("otomasyon izin veremez") && t.includes("kendi olayları kural tetiklemez"));
  assert.ok(t.indexOf("sınır") < t.indexOf("gönderilemedi") || t.lastIndexOf("sınır") < t.lastIndexOf("bekleme"), "en yeni çalışma üstte");
  byKey(sec, "rule-off:r1")!.click();
  byKey(sec, "rule-on:r2")!.click();
  assert.equal(byKey(sec, "rule-on:r1"), undefined);
  assert.equal(byKey(sec, "rule-off:r2"), undefined);
  assert.deepEqual(e.calls.filter((c) => c[0] === "automationRule"), [["automationRule", "r1", "disable"], ["automationRule", "r2", "enable"]]);
  const p = e.P.get("security").pure;
  assert.deepEqual(J(p.runRows(AUTO, p.ruleRows(AUTO))).map((r: any) => r.rule).slice(0, 2), ["yok", "Görev aç"]);
  assert.equal(p.runKind("garip"), "unknown");
  assert.equal(p.runKind("__proto__"), "unknown");
});

test("automation: yükleniyor / hata / boş kural ve boş çalışma durumları", () => {
  const e = started();
  e.go("security");
  assert.equal(e.calls.filter((c) => c[0] === "loadData" && c[1] === "automation").length, 1);
  assert.ok(walk(secBody(e.host, "Otomasyon")).some((n) => n.attrs["aria-busy"] === "true"));
  const e2 = started();
  e2.AM.state.data["automation"] = { status: "error", value: null, reason: "500: bozuk" };
  e2.go("security");
  assert.ok(alerts(secBody(e2.host, "Otomasyon")).some((n) => n.textContent.includes("500: bozuk")));
  const e3 = started();
  setData(e3.AM, "automation", { rules: [], runs: [] });
  e3.go("security");
  const t = secBody(e3.host, "Otomasyon").textContent;
  assert.ok(t.includes("Otomasyon kuralı yok") && t.includes("Henüz çalışma kaydı yok"));
});

test("automation: XSS yükü ve belirteç etkisiz; eksik/bozuk alanlarda çökme yok; bilinmeyen durumda düğme yok", () => {
  const e = started();
  setData(e.AM, "automation", {
    rules: [{ id: "r9", name: "<img src=x onerror=alert(1)>", eventPattern: "<script>1</script>", actionKind: "kötü", enabled: "evet", cooldownSeconds: "x" }, null, 4, {}],
    runs: [{ ruleId: "r9", ts: "bozuk", outcome: "<b>x</b>", message: "sk-abcdefghijklmnopqrstuvwx" }, null, "x"],
  });
  e.go("security");
  assert.equal(byTag(e.host, "img").length, 0);
  assert.equal(byTag(e.host, "script").length, 0);
  assert.equal(byTag(e.host, "b").length, 0);
  assert.ok(!e.host.textContent.includes("sk-abcdefghijklmnopqrstuvwx"));
  assert.equal(byKey(e.host, "rule-on:r9"), undefined);
  assert.equal(byKey(e.host, "rule-off:r9"), undefined);
  const e2 = started();
  setData(e2.AM, "automation", 42);
  e2.go("security");
  assert.ok(secBody(e2.host, "Otomasyon").textContent.includes("Otomasyon kuralı yok"));
});

// ---- çekirdek: onay penceresi + POST (core.js node:vm içinde, sahte fetch/DOM) ----
function coreEnv(answer: boolean, respond?: (p: string, init: any) => { status: number; body: unknown } | undefined) {
  const calls: Array<[string, string, string | undefined]> = [];
  const dialogs: any[] = [];
  const listeners: Record<string, Array<() => void>> = {};
  const doc: any = {
    getElementById: () => null, querySelectorAll: () => [], hidden: false,
    addEventListener: (t: string, fn: () => void) => { (listeners[t] ||= []).push(fn); },
    createElement: () => ({ setAttribute() {}, appendChild() {}, addEventListener() {} }),
  };
  const win: any = {
    AM_DIALOG: { confirm: (o: any) => { dialogs.push(o); calls.push(["DIALOG", o.action + "|" + o.target, undefined]); return Promise.resolve(answer); } },
    addEventListener() {},
  };
  const fetchStub = (p: string, init: any) => {
    calls.push([init.method, p, init.body]);
    const custom = respond ? respond(p, init) : undefined;
    if (custom) return Promise.resolve({ status: custom.status, text: () => Promise.resolve(JSON.stringify(custom.body)) });
    const body = p.startsWith("/api/grants") ? { grants: [], maxTtlMinutes: 60, maxUses: 5, grantableActions: [] } : {};
    return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify(body)) });
  };
  const store: Record<string, string> = { "agentmom.token": "t".repeat(32) };
  const ctx = vm.createContext({
    window: win, document: doc, location: { hash: "", pathname: "/ui", search: "" }, history: { replaceState() {} }, fetch: fetchStub,
    sessionStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } },
    setInterval: () => 0, console, Promise,
  });
  vm.runInContext(read("strings.js"), ctx, { filename: "strings.js" });
  vm.runInContext(read("core.js"), ctx, { filename: "core.js" });
  for (const fn of listeners["DOMContentLoaded"] || []) fn();
  return { win, calls, dialogs, flush: () => new Promise((r) => setTimeout(r, 30)) };
}

test("çekirdek: izin iptali önce onay penceresi açar; vazgeçilirse istek gitmez", async () => {
  const c = coreEnv(false);
  await c.flush();
  const before = c.calls.length;
  await c.win.AM.actions.grantRevoke("g1");
  assert.equal(c.dialogs.length, 1);
  assert.equal(c.dialogs[0].action, "grant.revoke");
  assert.equal(c.dialogs[0].target, "g1");
  assert.equal(c.dialogs[0].danger, true);
  assert.deepEqual(c.calls.slice(before).map((x) => x[0]), ["DIALOG"], "yalnız pencere; POST yok");
});

test("çekirdek: onaylanınca POST /api/grants/:id/revoke gider ve izin listesi yenilenir", async () => {
  const c = coreEnv(true);
  await c.flush();
  const before = c.calls.length;
  await c.win.AM.actions.grantRevoke("g1");
  await c.flush();
  const after = c.calls.slice(before);
  assert.equal(after[0]![0], "DIALOG", "önce pencere");
  const post = after.find((x) => x[0] === "POST");
  assert.ok(post, "POST yapıldı");
  assert.equal(post![1], "/api/grants/g1/revoke");
  assert.equal(post![2], "{}");
  assert.ok(after.findIndex((x) => x[0] === "GET" && x[1] === "/api/grants") > after.indexOf(post!), "iptalden sonra liste yenilendi");
});

test("çekirdek: geçersiz kimlik ve bilinmeyen eylem pencere açmaz, istek göndermez", async () => {
  const c = coreEnv(true);
  await c.flush();
  const before = c.calls.length;
  for (const id of ["", "../x", "a/b", "g 1", "x".repeat(81), 5 as any, null as any]) await c.win.AM.actions.grantRevoke(id);
  await c.win.AM.actions.automationRule("r1", "delete");
  await c.win.AM.actions.automationRule("../r1", "enable");
  assert.equal(c.dialogs.length, 0);
  assert.equal(c.calls.length, before);
});

test("çekirdek: kural aç/kapat onay penceresiyle sorulur ve doğru uca gider; yeni veri uçları beyaz listede", async () => {
  const c = coreEnv(true);
  await c.flush();
  const before = c.calls.length;
  await c.win.AM.actions.automationRule("r1", "disable");
  await c.win.AM.actions.automationRule("r2", "enable");
  await c.flush();
  const after = c.calls.slice(before);
  assert.deepEqual(c.dialogs.map((d) => d.action + "|" + d.target), ["automation.rule.disable|r1", "automation.rule.enable|r2"]);
  assert.deepEqual(after.filter((x) => x[0] === "POST").map((x) => x[1]), ["/api/automation/rules/r1/disable", "/api/automation/rules/r2/enable"]);
  const b2 = c.calls.length;
  await c.win.AM.actions.loadData("grants"); await c.win.AM.actions.loadData("changes"); await c.win.AM.actions.loadData("automation");
  await c.win.AM.actions.loadData("grants/../x");
  assert.deepEqual(c.calls.slice(b2).map((x) => x[1]), ["/api/grants", "/api/changes", "/api/automation"]);
});

// ---------- Oluşturma formları (izin, defter, kural) [Claude#agentmom-faz11-yetenek] ----------
const FORM_KEYS = {
  "Geçici yetenek izinleri": ["gf-action", "gf-dir", "gf-reason", "gf-ttl", "gf-uses", "grant-new-submit"],
  "Değişiklik defteri": ["cf-summary", "cf-reason", "cf-task", "cf-files", "change-new-submit"],
  "Otomasyon": ["rf-name", "rf-pattern", "rf-kind", "rf-message", "rf-cool", "rule-new-submit"],
} as const;
const typeInto = (n: FNode, v: string) => { n.value = v; n.fire(n.tag === "select" ? "change" : "input"); };

test("formlar: üç bölümde kapalı başlayan 'Yeni ... ekle' kısmı, etiketli alanlar ve yardım metni var", () => {
  const e = started();
  e.go("security");
  for (const [title, keys] of Object.entries(FORM_KEYS)) {
    const sec = secBody(e.host, title);
    const det = walk(sec).find((n) => n.tag === "details");
    assert.ok(det, title + ": açılır kısım var");
    assert.notEqual((det as any).open, true, "kapalı başlar");
    for (const k of keys) assert.ok(byKey(sec, k), k);
    for (const k of keys.filter((x) => !x.endsWith("-submit"))) {
      const c = byKey(sec, k)!;
      const label = walk(sec).find((n) => n.tag === "label" && n.attrs["for"] === c.id);
      assert.ok(label && label.textContent.length > 2, k + ": etiket");
      const help = walk(sec).find((n) => n.id === c.attrs["aria-describedby"]);
      assert.ok(help && help.textContent.length > 8, k + ": yardım metni");
    }
  }
  const g = secBody(e.host, "Geçici yetenek izinleri").textContent;
  assert.ok(g.includes("Yeni izin ekle") && g.includes("İzin yalnız 'onay gerekir' kararını önceden onaylar; yasak klasör, bütçe ve ücretli rota reddini gevşetmez; ajan izin veremez"));
  assert.ok(secBody(e.host, "Değişiklik defteri").textContent.includes("Yeni kayıt ekle"));
  const a = secBody(e.host, "Otomasyon").textContent;
  assert.ok(a.includes("Yeni kural ekle") && a.includes("Bildir") && a.includes("Görev kaydı aç"));
  assert.equal((byKey(e.host, "rf-pattern") as any).placeholder, "backup.failed  /  task.*");
  const opts = walk(byKey(e.host, "gf-action")!).map((o) => o.value);
  assert.deepEqual(opts, ["", "file.read", "file.write", "verification.run"], "eylem yalnız üç değer");
});

test("formlar: Ekle düğmesi ham alan değerleriyle çekirdek eylemini çağırır; başarıda form temizlenir, başarısızda korunur", async () => {
  const e = started();
  let result: any = { ok: false };
  e.AM.actions.grantCreate = (f: any) => { e.calls.push(["grantCreate", J(f)]); return Promise.resolve(result); };
  e.go("security");
  typeInto(byKey(e.host, "gf-action")!, "file.write");
  typeInto(byKey(e.host, "gf-dir")!, "D:\\proje\\a");
  typeInto(byKey(e.host, "gf-reason")!, "sk-abcdefghijklmnopqrstuvwx sürüm notu");
  typeInto(byKey(e.host, "gf-ttl")!, "30");
  typeInto(byKey(e.host, "gf-uses")!, "3");
  byKey(e.host, "grant-new-submit")!.click();
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(e.calls.filter((c) => c[0] === "grantCreate"), [["grantCreate", { action: "file.write", scopeDir: "D:\\proje\\a", reason: "sk-abcdefghijklmnopqrstuvwx sürüm notu", ttlMinutes: "30", maxUses: "3" }]], "gönderimde ham değer");
  assert.equal(byKey(e.host, "gf-dir")!.value, "D:\\proje\\a", "başarısızda form korunur");
  result = { ok: true };
  byKey(e.host, "grant-new-submit")!.click();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(byKey(e.host, "gf-dir")!.value, "");
  assert.equal(byKey(e.host, "gf-reason")!.value, "");
  assert.equal(byKey(e.host, "gf-ttl")!.value, "60", "varsayılan süre geri gelir");
});

test("formlar: defter ve kural alanları çekirdek eylemine gider; eylem türü değişince türe göre alanlar çıkar", () => {
  const e = started();
  e.AM.actions.changeCreate = (f: any) => { e.calls.push(["changeCreate", J(f)]); return Promise.resolve({ ok: false }); };
  e.AM.actions.ruleCreate = (f: any) => { e.calls.push(["ruleCreate", J(f)]); return Promise.resolve({ ok: false }); };
  e.go("security");
  typeInto(byKey(e.host, "cf-summary")!, "Özet metni");
  typeInto(byKey(e.host, "cf-reason")!, "Gerekçe metni");
  typeInto(byKey(e.host, "cf-files")!, "a.txt\nb.txt");
  byKey(e.host, "change-new-submit")!.click();
  assert.deepEqual(e.calls.find((c) => c[0] === "changeCreate"), ["changeCreate", { summary: "Özet metni", reason: "Gerekçe metni", taskId: "", files: "a.txt\nb.txt" }]);
  assert.equal(byKey(e.host, "rf-title"), undefined, "bildir türünde görev alanları yok");
  typeInto(byKey(e.host, "rf-name")!, "Kural bir");
  typeInto(byKey(e.host, "rf-pattern")!, "task.*");
  typeInto(byKey(e.host, "rf-kind")!, "record_task");
  assert.equal(byKey(e.host, "rf-message"), undefined, "görev türünde ileti alanı yok");
  assert.ok(byKey(e.host, "rf-title") && byKey(e.host, "rf-taskact") && byKey(e.host, "rf-target"));
  assert.equal(byKey(e.host, "rf-name")!.value, "Kural bir", "tür değişince yazılanlar korunur");
  typeInto(byKey(e.host, "rf-title")!, "Görev başlığı");
  typeInto(byKey(e.host, "rf-target")!, "D:\\x");
  byKey(e.host, "rule-new-submit")!.click();
  assert.deepEqual(e.calls.find((c) => c[0] === "ruleCreate"), ["ruleCreate", { name: "Kural bir", eventPattern: "task.*", actionKind: "record_task", params: { title: "Görev başlığı", action: "file.read", target: "D:\\x" }, cooldownSeconds: "300" }]);
});

test("formlar: sonuç durumu bölümde okunur (hata kartı maskeli, başarı bildirimi); XSS yükü etkisiz", () => {
  const e = started();
  setData(e.AM, "grants", { grants: [] });
  e.AM.state.data["grantCreate"] = { status: "error", value: null, reason: "Klasör boş olamaz sk-abcdefghijklmnopqrstuvwx <img src=x onerror=alert(1)>" };
  e.AM.state.data["changeCreate"] = { status: "ok", value: null };
  e.go("security");
  typeInto(byKey(e.host, "gf-reason")!, "<script>alert(1)</script> \u202Egnp");
  e.P.rerender();
  const g = secBody(e.host, "Geçici yetenek izinleri");
  assert.ok(alerts(g).some((n) => n.textContent.includes("Klasör boş olamaz") && n.textContent.includes("Kayıt eklenemedi")));
  assert.ok(!e.host.textContent.includes("sk-abcdefghijklmnopqrstuvwx"));
  assert.equal(byTag(e.host, "img").length, 0);
  assert.equal(byTag(e.host, "script").length, 0);
  assert.equal(byKey(e.host, "gf-reason")!.value, "<script>alert(1)</script> \u202Egnp", "alan değeri yeniden çizimde korunur, yalnız value olarak");
  assert.ok(secBody(e.host, "Değişiklik defteri").textContent.includes("Eklendi"));
});

test("formlar: kaynakta innerHTML/localStorage/fetch yok; bidi karakterler kaçışlı", () => {
  const src = read("page-security.js");
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|localStorage|\bfetch\s*\(|XMLHttpRequest/.test(src));
  assert.ok(!/[\u202A-\u202E\u2066-\u2069\u200B-\u200F\uFEFF]/.test(src + read("core.js")));
});

// ---- çekirdek: oluşturma eylemleri ----
const VALID_GRANT = { action: "file.write", scopeDir: "D:\\proje\\a", reason: "Sürüm notu yazılacak", ttlMinutes: "30", maxUses: "3" };
const lastState = (c: any, k: string) => c.win.AM.state.data[k];
const postsOf = (calls: any[]) => calls.filter((x) => x[0] === "POST");

test("çekirdek: geçersiz izin alanları pencere açmaz, POST göndermez ve Türkçe hata yazar", async () => {
  const c = coreEnv(true);
  await c.flush();
  const before = c.calls.length;
  const bad: Array<[Record<string, unknown>, RegExp]> = [
    [{ ...VALID_GRANT, action: "net.post" }, /Eylem listeden seçilmeli/],
    [{ ...VALID_GRANT, action: "" }, /Eylem listeden seçilmeli/],
    [{ ...VALID_GRANT, scopeDir: "  " }, /Klasör boş olamaz/],
    [{ ...VALID_GRANT, scopeDir: "D:\\a\nD:\\b" }, /Klasör boş olamaz/],
    [{ ...VALID_GRANT, reason: "  " }, /Gerekçe en az 3/],
    [{ ...VALID_GRANT, reason: "ab" }, /Gerekçe en az 3/],
    [{ ...VALID_GRANT, reason: "x".repeat(301) }, /Gerekçe en az 3, en çok 300/],
    [{ ...VALID_GRANT, ttlMinutes: "0" }, /Süre \(dakika\) 1 ile 1440/],
    [{ ...VALID_GRANT, ttlMinutes: "1441" }, /Süre \(dakika\) 1 ile 1440/],
    [{ ...VALID_GRANT, ttlMinutes: "abc" }, /Süre/],
    [{ ...VALID_GRANT, ttlMinutes: "1.5" }, /Süre/],
    [{ ...VALID_GRANT, maxUses: "0" }, /Kullanım sayısı 1 ile 100/],
    [{ ...VALID_GRANT, maxUses: "101" }, /Kullanım sayısı 1 ile 100/],
  ];
  for (const [f, re] of bad) {
    const out = await c.win.AM.actions.grantCreate(f);
    assert.equal(out.ok, false);
    assert.equal(lastState(c, "grantCreate").status, "error");
    assert.match(lastState(c, "grantCreate").reason, re, JSON.stringify(f));
  }
  assert.equal(await c.win.AM.actions.grantCreate(null).then((o: any) => o.ok), false);
  assert.equal(c.dialogs.length, 0);
  assert.equal(c.calls.length, before, "hiç istek yok");
});

test("çekirdek: geçersiz defter ve kural alanları istek göndermez", async () => {
  const c = coreEnv(true);
  await c.flush();
  const before = c.calls.length;
  const okChange = { summary: "Özet metni", reason: "Gerekçe metni", taskId: "", files: "" };
  const okRule = { name: "Kural bir", eventPattern: "backup.failed", actionKind: "notify", params: { message: "Yedek hatası" }, cooldownSeconds: "60" };
  const badC: Array<[Record<string, unknown>, RegExp]> = [
    [{ ...okChange, summary: "" }, /Özet en az 3/], [{ ...okChange, reason: "x".repeat(501) }, /Gerekçe en az 3, en çok 500/],
    [{ ...okChange, taskId: "../x" }, /Görev kimliği/], [{ ...okChange, files: "a\n" + "y".repeat(301) }, /Dosyalar satır başına/],
    [{ ...okChange, files: Array.from({ length: 51 }, (_x, i) => "f" + i).join("\n") }, /en çok 50 yol/],
  ];
  for (const [f, re] of badC) { await c.win.AM.actions.changeCreate(f); assert.match(lastState(c, "changeCreate").reason, re); }
  const badR: Array<[Record<string, unknown>, RegExp]> = [
    [{ ...okRule, name: "ab" }, /Kural adı en az 3/], [{ ...okRule, eventPattern: "*" }, /Olay deseni geçersiz/], [{ ...okRule, eventPattern: "" }, /Olay deseni geçersiz/],
    [{ ...okRule, eventPattern: "Backup Failed" }, /Olay deseni geçersiz/], [{ ...okRule, eventPattern: "automation.*" }, /Olay deseni geçersiz/],
    [{ ...okRule, cooldownSeconds: "9" }, /Bekleme süresi \(sn\) 10 ile 86400/], [{ ...okRule, cooldownSeconds: "86401" }, /Bekleme süresi/],
    [{ ...okRule, actionKind: "delete" }, /Eylem türü seçilmeli/], [{ ...okRule, params: { message: "x" } }, /Bildirim iletisi en az 3/],
    [{ ...okRule, actionKind: "record_task", params: { title: "Başlık", action: "file.write", target: "D:\\x" } }, /Görev eylemi/],
    [{ ...okRule, actionKind: "record_task", params: { title: "Başlık", action: "file.read", target: "" } }, /Görev hedefi boş olamaz/],
    [{ ...okRule, actionKind: "record_task", params: { title: "", action: "file.read", target: "D:\\x" } }, /Görev başlığı en az 3/],
  ];
  for (const [f, re] of badR) { await c.win.AM.actions.ruleCreate(f); assert.match(lastState(c, "ruleCreate").reason, re, JSON.stringify(f)); }
  assert.equal(c.dialogs.length, 0);
  assert.equal(c.calls.length, before);
});

test("çekirdek: geçerli izin önce ne yapacağını gösteren pencere açar; vazgeçilirse POST yok", async () => {
  const c = coreEnv(false);
  await c.flush();
  const before = c.calls.length;
  const out = await c.win.AM.actions.grantCreate({ ...VALID_GRANT, reason: "sk-abcdefghijklmnopqrstuvwx yaz" });
  assert.equal(out.ok, false);
  assert.equal(c.dialogs.length, 1);
  const d = c.dialogs[0];
  assert.equal(d.action, "grant.create");
  assert.ok(d.target.includes("file.write") && d.target.includes("D:\\proje\\a"));
  assert.ok(d.detail.includes("D:\\proje\\a") && d.detail.includes("30") && d.detail.includes("3"), d.detail);
  assert.ok(!d.detail.includes("sk-abcdefghijklmnopqrstuvwx"), "pencerede maskeli");
  assert.equal(d.danger, true);
  assert.deepEqual(c.calls.slice(before).map((x: any) => x[0]), ["DIALOG"], "yalnız pencere; POST yok");
});

test("çekirdek: onaylanınca izin doğru uca doğru gövdeyle (ham değer) gider ve liste yenilenir", async () => {
  const c = coreEnv(true);
  await c.flush();
  const before = c.calls.length;
  const out = await c.win.AM.actions.grantCreate({ ...VALID_GRANT, reason: "  sk-abcdefghijklmnopqrstuvwx yaz  " });
  await c.flush();
  assert.equal(out.ok, true);
  const after = c.calls.slice(before);
  assert.equal(after[0]![0], "DIALOG");
  const post = postsOf(after)[0];
  assert.equal(post[1], "/api/grants");
  assert.deepEqual(JSON.parse(post[2]), { action: "file.write", scopeDir: "D:\\proje\\a", reason: "sk-abcdefghijklmnopqrstuvwx yaz", ttlMinutes: 30, maxUses: 3 });
  assert.ok(after.findIndex((x: any) => x[0] === "GET" && x[1] === "/api/grants") > after.indexOf(post), "oluşturmadan sonra liste yenilendi");
  assert.equal(lastState(c, "grantCreate").status, "ok");
});

test("çekirdek: defter kaydı ve kural doğru uca/gövdeye gider; isteğe bağlı alanlar boşsa gönderilmez", async () => {
  const c = coreEnv(true);
  await c.flush();
  const before = c.calls.length;
  await c.win.AM.actions.changeCreate({ summary: " Özet metni ", reason: "Gerekçe metni", taskId: " t-1 ", files: "a.txt\r\n\r\n  b.txt  \n" });
  await c.win.AM.actions.changeCreate({ summary: "İkinci özet", reason: "Gerekçe metni", taskId: "", files: "" });
  await c.win.AM.actions.ruleCreate({ name: "Kural bir", eventPattern: "task.*", actionKind: "notify", params: { message: "Görev olayı" }, cooldownSeconds: "60" });
  await c.win.AM.actions.ruleCreate({ name: "Kural iki", eventPattern: "backup.failed", actionKind: "record_task", params: { title: "Yedeği oku", action: "verification.run", target: "D:\\yedek" }, cooldownSeconds: 600 });
  await c.flush();
  const posts = postsOf(c.calls.slice(before));
  assert.deepEqual(posts.map((x: any) => x[1]), ["/api/changes", "/api/changes", "/api/automation/rules", "/api/automation/rules"]);
  assert.deepEqual(JSON.parse(posts[0][2]), { kind: "manual", summary: "Özet metni", reason: "Gerekçe metni", taskId: "t-1", files: ["a.txt", "b.txt"] });
  assert.deepEqual(JSON.parse(posts[1][2]), { kind: "manual", summary: "İkinci özet", reason: "Gerekçe metni" });
  assert.deepEqual(JSON.parse(posts[2][2]), { name: "Kural bir", eventPattern: "task.*", actionKind: "notify", params: { message: "Görev olayı" }, cooldownSeconds: 60 });
  assert.deepEqual(JSON.parse(posts[3][2]), { name: "Kural iki", eventPattern: "backup.failed", actionKind: "record_task", params: { title: "Yedeği oku", action: "verification.run", target: "D:\\yedek" }, cooldownSeconds: 600 });
  assert.deepEqual(c.dialogs.map((d: any) => d.action), ["change.record", "change.record", "automation.rule.create", "automation.rule.create"]);
  assert.ok(c.dialogs[2].detail.includes("task.*") && c.dialogs[2].detail.includes("Görev olayı") && c.dialogs[2].detail.includes("60"));
  assert.ok(c.dialogs[3].detail.includes("verification.run") && c.dialogs[3].detail.includes("D:\\yedek"));
  const gets = c.calls.slice(before).filter((x: any) => x[0] === "GET").map((x: any) => x[1]);
  assert.ok(gets.includes("/api/changes") && gets.includes("/api/automation"), "ilgili listeler yenilendi");
});

test("çekirdek: sunucu 400 hatası Türkçe ve okunur görünür; ham iç hata gösterilmez; liste yine yenilenir", async () => {
  const c = coreEnv(true, (_p, init) => (init.method === "POST" ? { status: 400, body: { error: "INTERNAL scopeDir must be inside the contract /srv/x", code: "scope_outside_contract" } } : undefined));
  await c.flush();
  const before = c.calls.length;
  const out = await c.win.AM.actions.grantCreate(VALID_GRANT);
  await c.flush();
  assert.equal(out.ok, false);
  const s = lastState(c, "grantCreate");
  assert.equal(s.status, "error");
  assert.match(s.reason, /izinli klasörlerinin içinde olmalı/);
  assert.ok(!s.reason.includes("INTERNAL") && !s.reason.includes("/srv/x"));
  assert.ok(c.calls.slice(before).some((x: any) => x[0] === "GET" && x[1] === "/api/grants"));
  const r2 = coreEnv(true, (_p, init) => (init.method === "POST" ? { status: 400, body: { error: "iç hata", code: "bilinmeyen_kod" } } : undefined));
  await r2.flush();
  await r2.win.AM.actions.changeCreate({ summary: "Özet metni", reason: "Gerekçe metni" });
  assert.match(lastState(r2, "changeCreate").reason, /kabul edilmedi \(kod 400\)/);
  const r3 = coreEnv(true, (_p, init) => (init.method === "POST" ? { status: 403, body: { error: "forbidden" } } : undefined));
  await r3.flush();
  await r3.win.AM.actions.ruleCreate({ name: "Kural bir", eventPattern: "task.*", actionKind: "notify", params: { message: "Görev olayı" }, cooldownSeconds: 60 });
  assert.match(lastState(r3, "ruleCreate").reason, /yalnız kullanıcı oturumuyla/);
});

// ---- çekirdek: hafıza veri uçları ve örtük öneriyi hafızaya ekleme [Claude#agentmom-faz11-hafiza-ui] ----
const IMPL_SECRET = "sk-abcdefghijklmnopqrstuvwx";
const IMPL = { candidates: [{ id: "ort-aaa111", kind: "note", text: "Yedek sık başarısız oluyor " + IMPL_SECRET, evidence: ["e1", "e2", "e3"], count: 3, confidence: 0.6, suggestedScope: "agentmom" }], skippedAlreadyRecorded: 0, note: "n" };
function implEnv(answer: boolean, post?: { status: number; body: unknown }, cand: Record<string, unknown> = {}) {
  const data = { ...IMPL, candidates: [{ ...IMPL.candidates[0], ...cand }] };
  return coreEnv(answer, (p, init) => {
    if (p === "/api/memory/implicit") return { status: 200, body: data };
    if (p === "/api/memory" && init.method === "POST" && post) return post;
    return undefined;
  });
}
const gets = (c: any, from = 0): string[] => c.calls.slice(from).filter((x: any) => x[0] === "GET").map((x: any) => x[1]);

test("çekirdek: hafıza bağlam/özet/öneri/soy ağacı uçları beyaz listede; parametreler doğrulanır", async () => {
  const c = coreEnv(true);
  await c.flush();
  const before = c.calls.length;
  const L = c.win.AM.actions.loadData;
  await L("memoryContext", "2|3000|sunucu ayarı"); await L("memoryCompile"); await L("memoryCompile", "proje a"); await L("memoryImplicit");
  await L("genealogy"); await L("genealogy", "00000000-0000-4000-8000-000000000001");
  assert.deepEqual(gets(c, before), [
    "/api/memory/context?q=sunucu%20ayar%C4%B1&stage=2&budget=3000", "/api/memory/compile", "/api/memory/compile?scope=proje%20a", "/api/memory/implicit",
    "/api/decisions/genealogy", "/api/decisions/00000000-0000-4000-8000-000000000001/genealogy"]);
  const b2 = c.calls.length;
  for (const p of ["0|3000|x", "4|3000|x", "1|100|x", "1|20001|x", "1|3000|", "1|3000|   ", "1|3000|" + "x".repeat(201), "1|3000|a\nb", "x", "", 5, null, undefined]) await L("memoryContext", p);
  for (const s of ["../x", "x".repeat(81), "a/b", 5]) await L("memoryCompile", s);
  for (const id of ["../x", "a/b", "x".repeat(37), 5]) await L("genealogy", id);
  assert.equal(c.calls.length, b2, "geçersiz parametre: istek yok");
});

test("çekirdek: proje hafızası özetinin satır sonları korunur, görünmez karakterler temizlenir", async () => {
  const c = coreEnv(true, (p) => (p === "/api/memory/compile" ? { status: 200, body: { markdown: "# A\n\n- b\r\n\u202E x", sections: [{ name: "Kararlar\n", count: 1 }], counts: {}, truncated: false, maskedSecrets: 0 } } : undefined));
  await c.flush();
  await c.win.AM.actions.loadData("memoryCompile");
  await c.flush();
  const v = lastState(c, "memoryCompile").value;
  assert.equal(v.markdown, "# A\n\n- b\n  x");
  assert.equal(v.sections[0].name, "Kararlar ", "diğer alanlar derin temizlikten geçer");
});

test("çekirdek: örtük öneri — vazgeçilirse POST yok; pencere metni maskeli, eylem ve hedef gösterilir", async () => {
  const c = implEnv(false);
  await c.flush();
  await c.win.AM.actions.loadData("memoryImplicit");
  await c.flush();
  const before = c.calls.length;
  const out = await c.win.AM.actions.implicitAccept("ort-aaa111");
  assert.equal(out.ok, false);
  assert.equal(c.dialogs.length, 1);
  const d = c.dialogs[0];
  assert.equal(d.title, "Bu bilgi hafızaya eklensin mi?");
  assert.equal(d.action, "memory.add");
  assert.ok(d.target.includes("Yedek sık başarısız") && !d.target.includes(IMPL_SECRET));
  assert.ok(d.detail.includes("%60") && d.detail.includes("agentmom") && d.detail.includes("ortuk-aday") && d.detail.includes("kayıt metni (veri"), d.detail);
  assert.ok(d.detail.includes("doğrulanmadı") && d.detail.includes("Kaydetmeden önce metni kontrol edin"), "uyarı metni");
  assert.ok(!d.detail.includes(IMPL_SECRET) && d.target.includes("[gizli]"));
  assert.equal(d.target, "Yedek sık başarısız oluyor [gizli]", "gösterilen = gönderilecek metin");
  assert.equal(d.danger, false);
  assert.deepEqual(c.calls.slice(before).map((x: any) => x[0]), ["DIALOG"], "yalnız pencere; POST yok");
});

test("çekirdek: örtük öneri onaylanınca POST /api/memory doğru gövdeyle gider; öneri ve bayrak listeleri yenilenir", async () => {
  const c = implEnv(true);
  await c.flush();
  await c.win.AM.actions.loadData("memoryImplicit");
  await c.flush();
  const before = c.calls.length;
  const out = await c.win.AM.actions.implicitAccept("ort-aaa111");
  await c.flush();
  assert.equal(out.ok, true);
  const after = c.calls.slice(before);
  assert.equal(after[0]![0], "DIALOG", "önce pencere");
  const posts = postsOf(after);
  assert.equal(posts.length, 1);
  assert.equal(posts[0][1], "/api/memory");
  assert.deepEqual(JSON.parse(posts[0][2]), {
    kind: "note", title: "Yedek sık başarısız oluyor [gizli]", body: "Yedek sık başarısız oluyor [gizli]", source: "ortuk-aday", scope: "agentmom", confidence: 0.6, sourceRef: "ortuk-aday:ort-aaa111"
  });
  const g = gets(c, before);
  const iPost = after.indexOf(posts[0]);
  assert.ok(after.findIndex((x: any) => x[0] === "GET" && x[1] === "/api/memory/implicit") > iPost, "öneri listesi yenilendi");
  assert.ok(after.findIndex((x: any) => x[0] === "GET" && x[1] === "/api/memory/flags") > iPost, "hafıza bayrakları yenilendi");
  assert.ok(g.includes("/api/memory/implicit") && g.includes("/api/memory/flags"));
  assert.equal(lastState(c, "implicitAccept:ort-aaa111").status, "ok");
});

test("çekirdek: örtük öneri çift gönderim yapmaz (aynı aday için tek pencere, tek POST)", async () => {
  const c = implEnv(true);
  await c.flush();
  await c.win.AM.actions.loadData("memoryImplicit");
  await c.flush();
  const before = c.calls.length;
  const a = c.win.AM.actions.implicitAccept("ort-aaa111");
  const b = c.win.AM.actions.implicitAccept("ort-aaa111");
  const [ra, rb] = await Promise.all([a, b]);
  await c.flush();
  assert.equal(c.dialogs.length, 1);
  assert.equal(postsOf(c.calls.slice(before)).length, 1);
  assert.equal(ra.ok, true); assert.equal(rb.ok, false);
  // bittikten sonra yeniden gönderilebilir (aday listede hâlâ varsa)
  await c.win.AM.actions.implicitAccept("ort-aaa111");
  assert.equal(c.dialogs.length, 2);
});

test("çekirdek: örtük öneri sunucu hataları Türkçe okunur; ham iç hata gösterilmez; liste yine yenilenir", async () => {
  const c = implEnv(true, { status: 400, body: { error: "INTERNAL scope must be a short name /srv/x", code: "invalid_field" } });
  await c.flush();
  await c.win.AM.actions.loadData("memoryImplicit");
  await c.flush();
  const before = c.calls.length;
  const out = await c.win.AM.actions.implicitAccept("ort-aaa111");
  await c.flush();
  assert.equal(out.ok, false);
  const s = lastState(c, "implicitAccept:ort-aaa111");
  assert.equal(s.status, "error");
  assert.match(s.reason, /Sunucu girilen değerlerden birini kabul etmedi/);
  assert.ok(!s.reason.includes("INTERNAL") && !s.reason.includes("/srv/x"));
  assert.ok(gets(c, before).includes("/api/memory/implicit"));
  const c2 = implEnv(true, { status: 409, body: { error: "iç", code: "conflict" } });
  await c2.flush(); await c2.win.AM.actions.loadData("memoryImplicit"); await c2.flush();
  await c2.win.AM.actions.implicitAccept("ort-aaa111");
  assert.match(lastState(c2, "implicitAccept:ort-aaa111").reason, /kabul edilmedi \(kod 409\)/);
  const c3 = implEnv(true, { status: 403, body: { error: "forbidden" } });
  await c3.flush(); await c3.win.AM.actions.loadData("memoryImplicit"); await c3.flush();
  await c3.win.AM.actions.implicitAccept("ort-aaa111");
  assert.match(lastState(c3, "implicitAccept:ort-aaa111").reason, /yalnız kullanıcı oturumuyla/);
});

test("çekirdek: örtük öneri — bilinmeyen/bozuk kimlik ve geçersiz aday pencere açmaz, POST göndermez; kapsam yedeği", async () => {
  const c = implEnv(true);
  await c.flush();
  await c.win.AM.actions.loadData("memoryImplicit");
  await c.flush();
  const before = c.calls.length;
  for (const id of ["", "../x", "a/b", "x".repeat(81), 5 as any, null as any]) assert.equal((await c.win.AM.actions.implicitAccept(id)).ok, false);
  assert.equal(c.dialogs.length, 0);
  assert.equal(postsOf(c.calls.slice(before)).length, 0);
  const u = await c.win.AM.actions.implicitAccept("ort-yok");
  await c.flush();
  assert.equal(u.ok, false);
  assert.match(lastState(c, "implicitAccept:ort-yok").reason, /güncel listede yok/);
  assert.ok(gets(c, before).includes("/api/memory/implicit"), "bilinmeyen aday: liste yenilenir");
  assert.equal(c.dialogs.length, 0);
  for (const [over, re] of [[{ confidence: 2 }, /güven değeri geçersiz/], [{ confidence: "x" }, /güven değeri geçersiz/], [{ text: "   " }, /metni boş/], [{ text: "x".repeat(2001) }, /çok uzun .* ya da kesilmiş/], [{ text: "x".repeat(20001) }, /çok uzun .* ya da kesilmiş/], [{ text: "y".repeat(2001) + " sk-abcdefghijklmnopqrstuvwx" }, /çok uzun/]] as Array<[Record<string, unknown>, RegExp]>) {
    const e = implEnv(true, undefined, over);
    await e.flush(); await e.win.AM.actions.loadData("memoryImplicit"); await e.flush();
    const b = e.calls.length;
    const o = await e.win.AM.actions.implicitAccept("ort-aaa111");
    assert.equal(o.ok, false);
    assert.match(lastState(e, "implicitAccept:ort-aaa111").reason, re);
    assert.equal(e.dialogs.length, 0);
    assert.equal(postsOf(e.calls.slice(b)).length, 0);
  }
  const f = implEnv(true, undefined, { suggestedScope: "../kötü", kind: "uydurma" });
  await f.flush(); await f.win.AM.actions.loadData("memoryImplicit"); await f.flush();
  await f.win.AM.actions.implicitAccept("ort-aaa111");
  const body = JSON.parse(postsOf(f.calls)[0][2]);
  assert.equal(body.scope, "agentmom"); assert.equal(body.kind, "note");
});

test("çekirdek: örtük öneri metni pencerede TAMAMEN görünür (601+. karakter dahil) ve aynen gönderilir; gönderilen gövde maskeli", async () => {
  const long = "a".repeat(700) + " SON-KISIM " + IMPL_SECRET + " " + "b".repeat(1200);
  const c = implEnv(true, undefined, { text: long });
  await c.flush();
  await c.win.AM.actions.loadData("memoryImplicit");
  await c.flush();
  assert.equal(lastState(c, "memoryImplicit").value.candidates[0].text, long, "çekirdek aday metnini kesmez");
  const before = c.calls.length;
  const out = await c.win.AM.actions.implicitAccept("ort-aaa111");
  await c.flush();
  assert.equal(out.ok, true);
  const shown = long.replace(IMPL_SECRET, "[gizli]");
  assert.equal(shown.length <= 2000, true);
  assert.equal(c.dialogs[0].target, shown, "pencere gönderilecek metnin tamamını gösterir");
  assert.ok(c.dialogs[0].target.includes("SON-KISIM") && c.dialogs[0].target.indexOf("SON-KISIM") > 600);
  const body = JSON.parse(postsOf(c.calls.slice(before))[0][2]);
  assert.equal(body.body, shown, "gösterilen = gönderilen");
  assert.ok(!body.body.includes(IMPL_SECRET) && !body.title.includes(IMPL_SECRET));
});

test("çekirdek: 2000'i aşan ya da kesilmiş aday eklenemez; pencere ve POST yok; tam 2000 eklenebilir", async () => {
  for (const text of ["z".repeat(2001), "z".repeat(25000)]) {
    const c = implEnv(true, undefined, { text });
    await c.flush();
    await c.win.AM.actions.loadData("memoryImplicit");
    await c.flush();
    const cand = lastState(c, "memoryImplicit").value.candidates[0];
    assert.equal(cand.text.length, text.length > 20000 ? 20000 : text.length, "metin sessizce 2000'de kesilmez");
    assert.ok(!cand.text.endsWith("…"));
    const before = c.calls.length;
    const out = await c.win.AM.actions.implicitAccept("ort-aaa111");
    assert.equal(out.ok, false);
    assert.match(lastState(c, "implicitAccept:ort-aaa111").reason, /çok uzun .* ya da kesilmiş; eklenemez/);
    assert.equal(c.dialogs.length, 0);
    assert.equal(postsOf(c.calls.slice(before)).length, 0);
  }
  const ok = implEnv(true, undefined, { text: "z".repeat(2000) });
  await ok.flush(); await ok.win.AM.actions.loadData("memoryImplicit"); await ok.flush();
  assert.equal((await ok.win.AM.actions.implicitAccept("ort-aaa111")).ok, true);
  assert.equal(JSON.parse(postsOf(ok.calls)[0][2]).body.length, 2000);
});

test("pages.css: yeni stiller yalnız var(--am-*) kullanır", () => {
  const css = read("pages.css");
  const part = css.slice(css.indexOf("Canlı izleme, zincir doğrulama"));
  assert.ok(part.includes(".am-pg-chain--broken"));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(part) && !/\brgba?\(/.test(part));
});

// ---------- D8c-UI-3: zamanlı otomasyon kuralları ----------
const SCHED_RULE = (id: string, over: Record<string, unknown> = {}) => ({ id, name: "Zamanlı " + id, eventPattern: "", triggerKind: "schedule", trigger: { kind: "schedule", schedule: { kind: "interval", everyMinutes: 60 } }, nextRunAt: "2026-10-23T11:00:00.000Z", actionKind: "run_analysis", params: { analysis: "attention" }, enabled: true, cooldownSeconds: 300, ...over });
const EVENT_RULE = (id: string) => ({ id, name: "Olay " + id, eventPattern: "task.*", triggerKind: "event", trigger: { kind: "event", eventPattern: "task.*" }, nextRunAt: null, actionKind: "notify", params: { message: "m" }, enabled: true, cooldownSeconds: 60 });
const lastRule = (e: any) => e.calls.filter((c: any) => c[0] === "ruleCreate").pop();

test("zamanlı kural formu: tetikleyici seçici (Olay/Zamanlı); zamanlıda aralık alanı, açık uyarı metni, bilgi satırı; olay deseni yok; eylemde analiz seçeneği ve 7 analiz", () => {
  const e = started();
  e.AM.actions.ruleCreate = (f: any) => { e.calls.push(["ruleCreate", J(f)]); return Promise.resolve({ ok: false }); };
  setData(e.AM, "automation", { rules: [SCHED_RULE("a1"), SCHED_RULE("a2", { enabled: false }), EVENT_RULE("e1")], runs: [], maxScheduleRules: 20, analyses: ["attention", "halflife", "learning", "absence", "continuity", "offline", "shadow-price"] });
  e.go("security");
  assert.ok(byKey(e.host, "rf-trig") && byKey(e.host, "rf-pattern"), "varsayılan: olay kuralı formu korunur");
  assert.equal(byKey(e.host, "rf-skind"), undefined);
  assert.deepEqual(byTag(byKey(e.host, "rf-kind")!, "option").map((o) => o.textContent), ["Bildir", "Görev kaydı aç"]);
  typeInto(byKey(e.host, "rf-trig")!, "schedule");
  assert.equal(byKey(e.host, "rf-pattern"), undefined);
  assert.ok(byKey(e.host, "rf-skind") && byKey(e.host, "rf-every"));
  const t = e.host.textContent;
  assert.ok(t.includes("Zamanlanmış görev kendiliğinden başlamaz: yalnız sizin kurduğunuz kural çalışır; onay gerektiren adımlar siz onaylayana kadar BEKLER; model/internet çağrısı yapılmaz."));
  assert.ok(t.includes("En çok 20 açık zamanlı kural olabilir; şu an 1 açık."));
  assert.ok(t.includes("çalışma aralığından"), "bekleme süresi ipucu");
  assert.deepEqual(byTag(byKey(e.host, "rf-kind")!, "option").map((o) => o.textContent), ["Bildir", "Görev kaydı aç", "Analiz çalıştır"]);
  typeInto(byKey(e.host, "rf-kind")!, "run_analysis");
  assert.equal(byTag(byKey(e.host, "rf-analysis")!, "option").length, 7);
  assert.equal(byKey(e.host, "rf-message"), undefined);
  typeInto(byKey(e.host, "rf-name")!, "Sabah analizi");
  typeInto(byKey(e.host, "rf-every")!, "30");
  typeInto(byKey(e.host, "rf-analysis")!, "halflife");
  typeInto(byKey(e.host, "rf-cool")!, "600");
  byKey(e.host, "rule-new-submit")!.click();
  assert.deepEqual(lastRule(e), ["ruleCreate", { name: "Sabah analizi", trigger: { kind: "schedule", schedule: { kind: "interval", everyMinutes: "30" } }, actionKind: "run_analysis", params: { analysis: "halflife" }, cooldownSeconds: "600" }]);
});

test("zamanlı kural formu: günlük saat + gün kutuları; gün yoksa weekdays gönderilmez; olaya dönünce analiz eylemi bildire düşer", () => {
  const e = started();
  e.AM.actions.ruleCreate = (f: any) => { e.calls.push(["ruleCreate", J(f)]); return Promise.resolve({ ok: false }); };
  setData(e.AM, "automation", { rules: [], runs: [] });
  e.go("security");
  typeInto(byKey(e.host, "rf-trig")!, "schedule");
  typeInto(byKey(e.host, "rf-skind")!, "daily");
  assert.equal(byKey(e.host, "rf-every"), undefined);
  assert.ok(byKey(e.host, "rf-at"));
  for (let d = 1; d <= 7; d += 1) assert.ok(byKey(e.host, "rf-day-" + d), "gün " + d);
  assert.ok(e.host.textContent.includes("Pazartesi") && e.host.textContent.includes("Pazar"));
  typeInto(byKey(e.host, "rf-name")!, "Günlük bildirim");
  typeInto(byKey(e.host, "rf-message")!, "Günaydın");
  typeInto(byKey(e.host, "rf-at")!, "08:30");
  byKey(e.host, "rule-new-submit")!.click();
  assert.deepEqual(lastRule(e)[1].trigger.schedule, { kind: "daily", at: "08:30" });
  for (const d of [1, 2]) { const b = byKey(e.host, "rf-day-" + d)! as any; b.checked = true; b.fire("change"); }
  byKey(e.host, "rule-new-submit")!.click();
  assert.deepEqual(lastRule(e)[1].trigger.schedule, { kind: "daily", at: "08:30", weekdays: [1, 2] });
  assert.equal(lastRule(e)[1].eventPattern, undefined, "zamanlı kuralda olay deseni gönderilmez");
  typeInto(byKey(e.host, "rf-kind")!, "run_analysis");
  typeInto(byKey(e.host, "rf-trig")!, "event");
  assert.equal(byKey(e.host, "rf-analysis"), undefined);
  assert.equal((byKey(e.host, "rf-kind") as any).value, "notify");
  assert.ok(byKey(e.host, "rf-pattern"));
});

test("kural listesi: tetikleyici özeti, sonraki çalışma, 'Şimdi çalıştır' yalnız zamanlı+açık kuralda; yeni sonuçlar Türkçe (zamanlanmış çalıştı, kaçırıldı)", () => {
  const e = started();
  e.AM.actions.automationRule = (id: string, verb: string) => { e.calls.push(["automationRule", id, verb]); return Promise.resolve(); };
  setData(e.AM, "automation", {
    rules: [SCHED_RULE("s1"), SCHED_RULE("s2", { trigger: { kind: "schedule", schedule: { kind: "daily", at: "09:00", weekdays: [1, 2] } } }), SCHED_RULE("s3", { trigger: { kind: "schedule", schedule: { kind: "daily", at: "18:15" } } }), SCHED_RULE("s4", { enabled: false }), EVENT_RULE("e1"), SCHED_RULE("s5", { trigger: { kind: "schedule", schedule: { kind: "weird" } }, nextRunAt: null })],
    runs: [{ id: "r1", ruleId: "s1", ts: "2026-10-23T10:00:00.000Z", eventAction: "schedule", eventId: null, outcome: "scheduled_ok", message: "analiz tamam" }, { id: "r2", ruleId: "s2", ts: "2026-10-23T09:00:00.000Z", eventAction: "schedule", eventId: null, outcome: "missed", message: "kaçırıldı: planlı çalışma" }],
  });
  e.go("security");
  const t = e.host.textContent;
  for (const m of ["her 60 dk", "her gün 09:00 (Pt, Sa)", "her gün 18:15", "task.*", "Tetikleyici", "Sonraki çalışma", "Analiz çalıştır", "Zamanlanmış çalıştı", "Kaçırıldı"]) assert.ok(t.includes(m), m);
  assert.ok(!t.includes("her gün 18:15 ("), "her gün: gün listesi yok");
  for (const id of ["s1", "s2", "s3", "s5"]) assert.ok(byKey(e.host, "rule-run:" + id), id);
  assert.equal(byKey(e.host, "rule-run:s4"), undefined, "kapalı zamanlı kural");
  assert.equal(byKey(e.host, "rule-run:e1"), undefined, "olay kuralı");
  byKey(e.host, "rule-run:s1")!.click();
  assert.deepEqual(e.calls.filter((c: any) => c[0] === "automationRule"), [["automationRule", "s1", "runNow"]]);
});

test("kural listesi: 'Şimdi çalıştır' sonucu — atlandıysa neden, çalıştıysa sonuç; hata Türkçe kart", () => {
  const e = started();
  setData(e.AM, "automation", { rules: [SCHED_RULE("s1"), SCHED_RULE("s2"), SCHED_RULE("s3")], runs: [] });
  e.AM.state.data["automationAction:s1"] = { status: "ok", value: { run: { outcome: "skipped_cooldown" }, skippedReason: "bekleme süresi dolmadı" } };
  e.AM.state.data["automationAction:s2"] = { status: "ok", value: { run: { outcome: "scheduled_ok" } } };
  e.AM.state.data["automationAction:s3"] = { status: "error", value: null, reason: "Bu kural şu an çalışıyor; bitince yeniden deneyin." };
  e.go("security");
  const t = e.host.textContent;
  assert.ok(t.includes("Kural bu kez çalıştırılmadı (atlandı): bekleme süresi dolmadı"));
  assert.ok(t.includes("Kural çalıştırıldı: Zamanlanmış çalıştı"));
  assert.ok(t.includes("Bu kural şu an çalışıyor; bitince yeniden deneyin."));
});

const CORE_RULE = async (c: any, f: any) => c.win.AM.actions.ruleCreate({ name: "Kural adı", actionKind: "notify", params: { message: "Merhaba" }, cooldownSeconds: 300, ...f });
test("çekirdek zamanlı kural: geçersiz zamanlama/gün/bekleme/eylem pencere AÇMAZ ve POST göndermez (sunucu sınırlarıyla aynı)", async () => {
  const c = coreEnv(true);
  await c.flush();
  const sch = (schedule: any) => ({ trigger: { kind: "schedule", schedule } });
  const cases: Array<[any, RegExp]> = [
    [sch({ kind: "interval", everyMinutes: 14 }), /Çalışma aralığı \(dk\)/],
    [sch({ kind: "interval", everyMinutes: 10081 }), /Çalışma aralığı \(dk\)/],
    [sch({ kind: "interval", everyMinutes: "x" }), /Çalışma aralığı \(dk\)/],
    [sch({ kind: "daily", at: "24:00" }), /HH:MM/],
    [sch({ kind: "daily", at: "9:00" }), /HH:MM/],
    [sch({ kind: "daily", at: "09:00", weekdays: [] }), /Günler 1 ile 7/],
    [sch({ kind: "daily", at: "09:00", weekdays: [8] }), /Günler 1 ile 7/],
    [sch({ kind: "daily", at: "09:00", weekdays: [1, 1] }), /Günler 1 ile 7/],
    [sch({ kind: "yearly" }), /Zamanlama türü geçersiz/],
    [{ trigger: { kind: "event" } }, /Tetikleyici türü geçersiz/],
    [{ ...sch({ kind: "interval", everyMinutes: 15 }), cooldownSeconds: 901 }, /çalışma aralığından uzun olamaz \(bu kural için en çok 900 sn\)/],
    [{ ...sch({ kind: "daily", at: "09:00" }), cooldownSeconds: 86401 }, /Bekleme süresi/],
    [{ ...sch({ kind: "interval", everyMinutes: 60 }), actionKind: "run_analysis", params: { analysis: "gizli" } }, /Analiz geçersiz/],
    [{ ...sch({ kind: "interval", everyMinutes: 60 }), actionKind: "run_analysis", params: {} }, /Analiz geçersiz/],
    [{ eventPattern: "task.*", actionKind: "run_analysis", params: { analysis: "attention" } }, /yalnız zamanlı kuralda/],
  ];
  for (const [f, re] of cases) {
    const r = await CORE_RULE(c, f);
    assert.equal(r.invalid, true, JSON.stringify(f).slice(0, 80));
    assert.match(c.win.AM.state.data.ruleCreate.reason, re, JSON.stringify(f).slice(0, 80));
  }
  assert.equal(c.dialogs.length, 0);
  assert.equal(c.calls.filter((x: any) => x[0] === "POST").length, 0);
});

test("çekirdek zamanlı kural: 20 açık zamanlı kural sınırı; geçerli kural önce uyarılı pencere açar, vazgeçilirse POST yok, onayda gövde doğru (olay deseni yok)", async () => {
  const c = coreEnv(true);
  await c.flush();
  const rules = Array.from({ length: 20 }, (_x, i) => ({ id: "s" + i, enabled: true, trigger: { kind: "schedule" } }));
  c.win.AM.state.data.automation = { status: "ok", value: { rules, maxScheduleRules: 20 } };
  const full = await CORE_RULE(c, { trigger: { kind: "schedule", schedule: { kind: "interval", everyMinutes: 15 } } });
  assert.equal(full.invalid, true);
  assert.match(c.win.AM.state.data.ruleCreate.reason, /En çok 20 açık zamanlı kural/);
  c.win.AM.state.data.automation = { status: "ok", value: { rules: rules.slice(0, 19), maxScheduleRules: 20 } };
  const ok = await CORE_RULE(c, { trigger: { kind: "schedule", schedule: { kind: "daily", at: "09:00", weekdays: [1, 2] } }, actionKind: "run_analysis", params: { analysis: "halflife" }, cooldownSeconds: 600 });
  assert.equal(ok.ok, true);
  const d = c.dialogs[0];
  assert.match(d.target, /Kural adı \(her gün 09:00 \(Pt, Sa\)\)/);
  assert.match(d.detail, /ZAMANLIDIR/);
  assert.match(d.detail, /halflife/);
  assert.match(d.detail, /Zamanlanmış görev kendiliğinden başlamaz: yalnız sizin kurduğunuz kural çalışır; onay gerektiren adımlar siz onaylayana kadar BEKLER; model\/internet çağrısı yapılmaz\./);
  const post = c.calls.find((x: any) => x[0] === "POST" && x[1] === "/api/automation/rules")!;
  assert.deepEqual(JSON.parse(post[2]!), { name: "Kural adı", trigger: { kind: "schedule", schedule: { kind: "daily", at: "09:00", weekdays: [1, 2] } }, actionKind: "run_analysis", params: { analysis: "halflife" }, cooldownSeconds: 600 });
  const c2 = coreEnv(false);
  await c2.flush();
  const r2 = await CORE_RULE(c2, { trigger: { kind: "schedule", schedule: { kind: "interval", everyMinutes: 60 } } });
  assert.equal(r2.cancelled, true);
  assert.equal(c2.calls.filter((x: any) => x[0] === "POST").length, 0);
  // olay kuralı eskisi gibi
  const c3 = coreEnv(true);
  await c3.flush();
  await CORE_RULE(c3, { eventPattern: "task.*" });
  assert.deepEqual(JSON.parse(c3.calls.find((x: any) => x[0] === "POST")![2]!), { name: "Kural adı", eventPattern: "task.*", actionKind: "notify", params: { message: "Merhaba" }, cooldownSeconds: 300 });
});

test("çekirdek şimdi çalıştır: onay penceresi, doğru uç; sonuç/atlama saklanır; 409 busy, 429 rate_limited, 409 rule_disabled Türkçe; vazgeçilirse istek yok", async () => {
  const c = coreEnv(true, (p) => (p === "/api/automation/rules/ok1/run-now" ? { status: 200, body: { run: { outcome: "skipped_cooldown" }, skippedReason: "bekleme süresi dolmadı" } }
    : p === "/api/automation/rules/b1/run-now" ? { status: 409, body: { error: "this rule is already running", code: "busy" } }
    : p === "/api/automation/rules/r1/run-now" ? { status: 429, body: { error: "run-now: at most 5", code: "rate_limited" } }
    : p === "/api/automation/rules/d1/run-now" ? { status: 409, body: { error: "the rule is disabled", code: "rule_disabled" } } : undefined));
  await c.flush();
  const A = c.win.AM.actions;
  await A.automationRule("ok1", "runNow");
  assert.equal(c.dialogs[0].action, "automation.rule.run-now");
  assert.equal(c.dialogs[0].target, "ok1");
  assert.match(c.dialogs[0].detail, /bir kez çalıştırılır/);
  assert.equal(c.win.AM.state.data["automationAction:ok1"].status, "ok");
  assert.equal(c.win.AM.state.data["automationAction:ok1"].value.skippedReason, "bekleme süresi dolmadı");
  await A.automationRule("b1", "runNow");
  assert.equal(c.win.AM.state.data["automationAction:b1"].reason, "Bu kural şu an çalışıyor; bitince yeniden deneyin.");
  await A.automationRule("r1", "runNow");
  assert.match(c.win.AM.state.data["automationAction:r1"].reason, /dakikada en çok 5 deneme/);
  await A.automationRule("d1", "runNow");
  assert.match(c.win.AM.state.data["automationAction:d1"].reason, /açık ve zamanlı kurallar/);
  const c2 = coreEnv(false);
  await c2.flush();
  await c2.win.AM.actions.automationRule("x1", "runNow");
  assert.equal(c2.calls.filter((x: any) => x[0] === "POST").length, 0);
  await c2.win.AM.actions.automationRule("x1", "explode");
  assert.equal(c2.dialogs.length, 1, "bilinmeyen eylem pencere açmaz");
});
