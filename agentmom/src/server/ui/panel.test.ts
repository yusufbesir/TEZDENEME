// Sağ "Genel bakış" paneli (panel.js) testleri. Sahip: Sonnet [İP:AgentMom Faz 11]. yazan: [Claude#agentmom-faz11-panel]
// Kaynak node:vm ile sahte window/document içinde yüklenir; ağ yok, tarayıcı yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const dir = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(dir, "panel.js"), "utf8");
const CSS = readFileSync(join(dir, "panel.css"), "utf8");

// ---------- Sahte DOM (panel.js'in kullandığı yüzey kadar) ----------
class FNode {
  nodeType = 1;
  tag: string;
  children: FNode[] = [];
  parentNode: FNode | null = null;
  attrs: Record<string, string> = {};
  className = "";
  own = "";
  listeners: Record<string, Array<(e: any) => void>> = {};
  value = "";
  type = "";
  title = "";
  placeholder = "";
  disabled = false;
  doc: FDoc;
  constructor(tag: string, doc: FDoc) { this.tag = tag; this.doc = doc; }
  get textContent(): string { return this.own + this.children.map((c) => c.textContent).join(""); }
  set textContent(v: unknown) { this.own = String(v); this.children = []; }
  appendChild(c: FNode) {
    if (c.tag === "#frag") { for (const k of [...c.children]) this.appendChild(k); c.children = []; return c; }
    c.parentNode = this; this.children.push(c); return c;
  }
  replaceChildren(...nodes: FNode[]) { this.children = []; for (const n of nodes) this.appendChild(n); }
  setAttribute(k: string, v: unknown) { this.attrs[k] = String(v); }
  getAttribute(k: string) { return Object.hasOwn(this.attrs, k) ? (this.attrs[k] as string) : null; }
  addEventListener(t: string, fn: (e: any) => void) { (this.listeners[t] ||= []).push(fn); }
  focus() { this.doc.activeElement = this; }
}
class FDoc {
  activeElement: FNode | null = null;
  made: string[] = [];
  createElement(tag: string) { this.made.push(tag); return new FNode(tag, this); }
  createDocumentFragment() { return new FNode("#frag", this); }
  createElementNS(_ns: string, tag: string) { this.made.push(tag); return new FNode(tag, this); }
  createTextNode(t: string) { const n = new FNode("#text", this); n.own = t; return n; }
}
function walkAll(n: FNode, out: FNode[] = []): FNode[] { for (const c of n.children) { out.push(c); walkAll(c, out); } return out; }
function byKey(host: FNode, key: string): FNode | undefined { return walkAll(host).find((n) => n.attrs["data-pn-key"] === key); }
function byText(host: FNode, text: string): FNode | undefined { return walkAll(host).find((n) => n.children.length === 0 && n.own === text); }
function dispatch(host: FNode, type: string, target: FNode, extra: Record<string, unknown> = {}) {
  const ev = { target, type, key: "", preventDefault() { (ev as any).prevented = true; }, ...extra };
  for (const fn of host.listeners[type] || []) fn(ev);
  return ev as any;
}

// ---------- Sahte çekirdek ----------
function mkTopic(i: number, over: Record<string, unknown> = {}) {
  return { id: `t${i}`, title: `Konu ${i}`, state: "idle", unread: false, provider: "claude", model: "claude-sonnet-4", steps: null, summary: `özet ${i}`, updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), archived: false, ...over };
}
function fakeStatus() {
  const tone: Record<string, string> = { awaiting_approval: "warn", failed: "bad", unavailable: "bad", running: "info", done: "ok", idle: "muted" };
  const text: Record<string, string> = { awaiting_approval: "Onay bekliyor", failed: "Başarısız", unavailable: "Kullanılamıyor", running: "Çalışıyor", done: "Bitti", idle: "Boşta" };
  return {
    group(list: any[]) {
      const g: any = { waiting: [], running: [], idle: [], resolved: [] };
      for (const t of list) {
        if (t.state === "awaiting_approval" || t.state === "failed" || t.state === "unavailable") g.waiting.push(t);
        else if (t.state === "running") g.running.push(t);
        else if (t.state === "done" || t.archived) g.resolved.push(t);
        else g.idle.push(t);
      }
      return g;
    },
    label(s: string) { return { text: text[s] ?? s, tone: tone[s] ?? "muted", shape: s === "unavailable" ? "cross" : s === "done" ? "check" : "circle" }; },
  };
}
function load(opts: { status?: boolean; register?: ((p: string, d: any) => void) | null; icon?: boolean } = {}) {
  const doc = new FDoc();
  const host = new FNode("div", doc);
  const win: any = {};
  if (opts.status !== false) win.AM_STATUS = fakeStatus();
  if (opts.register) win.AM_REGISTER_TR = opts.register;
  if (opts.icon) win.AM_ICON = (name: string) => { const s = doc.createElementNS("svg", "svg"); s.setAttribute("data-icon", name); return s; };
  const ctx: any = vm.createContext({ window: win, document: doc });
  new vm.Script(SRC).runInContext(ctx);
  const panel = win.AM_PANEL;
  const calls: any[] = [];
  const AM: any = {
    state: { topics: [], tasks: [], debt: [], decisions: [], skills: [], providers: [], busy: false, updatedAt: "2026-10-22T10:00:00Z" },
    view: { panelTab: "topics", panelSearch: "", panelFilter: null, panelOpen: true, panelWide: false, selectedTopicId: null },
    actions: {
      selectTopic: (id: string) => calls.push(["select", id]),
      approve: (t: any) => calls.push(["approve", t.id]),
      deny: (t: any) => calls.push(["deny", t.id]),
      refresh: () => calls.push(["refresh"]),
      setView: (p: any) => { Object.assign(AM.view, p); calls.push(["setView", p]); },
    },
  };
  return { win, doc, host, panel, pure: panel.pure, AM, calls, start() { panel.init(AM, host); panel.render(AM); } };
}

// ---------- Saf mantık ----------
test("relTime: tr-TR kısa göreli zaman", () => {
  const { pure } = load();
  const now = Date.parse("2026-10-22T12:00:00Z");
  const ago = (s: number) => new Date(now - s * 1000).toISOString();
  assert.equal(pure.relTime(ago(5), now), "şimdi");
  assert.equal(pure.relTime(ago(60 * 5), now), "5 dk");
  assert.equal(pure.relTime(ago(3600 * 2 + 50), now), "2 sa");
  assert.equal(pure.relTime(ago(86400 * 5), now), "5 g");
  assert.equal(pure.relTime(ago(86400 * 14), now), "2 hf");
  assert.equal(pure.relTime(ago(86400 * 90), now), "3 ay");
  assert.equal(pure.relTime(ago(86400 * 800), now), "2 yıl");
  assert.equal(pure.relTime(new Date(now + 60_000).toISOString(), now), "şimdi", "gelecek zaman 'şimdi' olur");
  assert.equal(pure.relTime("bozuk", now), "");
  assert.equal(pure.relTime(null, now), "");
});

test("countBadge: 9'dan fazlası '9+', sıfır ve bozuk değer boş", () => {
  const { pure } = load();
  assert.equal(pure.countBadge(0), "");
  assert.equal(pure.countBadge(-3), "");
  assert.equal(pure.countBadge("x"), "");
  assert.equal(pure.countBadge(1), "1");
  assert.equal(pure.countBadge(9), "9");
  assert.equal(pure.countBadge(10), "9+");
  assert.equal(pure.countBadge(250), "9+");
});

test("modelBadge: Haiku/Sonnet/Opus açık, bilinmeyen '?'", () => {
  const { pure } = load();
  assert.equal(pure.modelBadge("claude", "claude-haiku-4-5"), "Haiku");
  assert.equal(pure.modelBadge("claude", "Claude-Sonnet-5"), "Sonnet");
  assert.equal(pure.modelBadge("claude", "claude-opus-4"), "Opus");
  assert.equal(pure.modelBadge("claude", null), "?");
  assert.equal(pure.modelBadge("claude", "unknown"), "?");
  assert.equal(pure.modelBadge("codex", "gpt-5-codex"), "gpt-5-codex");
  assert.equal(pure.modelBadge("x", "m".repeat(40)).length, 16, "uzun model adı kesilir");
});

test("progressChip: adım çipi '3/5', bozuk veri boş", () => {
  const { pure } = load();
  assert.equal(pure.progressChip({ done: 3, total: 5 }), "3/5");
  assert.equal(pure.progressChip({ done: 9, total: 5 }), "5/5");
  assert.equal(pure.progressChip({ done: -1, total: 5 }), "0/5");
  assert.equal(pure.progressChip({ done: 1, total: 0 }), "");
  assert.equal(pure.progressChip(null), "");
  assert.equal(pure.progressChip("3/5"), "");
});

test("branchChip ve subagentCount", () => {
  const { pure } = load();
  assert.equal(pure.branchChip({ branch: "faz11/panel", pr: 12 }), "faz11/panel · #12");
  assert.equal(pure.branchChip({ pr: "#7" }), "#7");
  assert.equal(pure.branchChip({ branch: "x" }), "x");
  assert.equal(pure.branchChip({ pr: "abc" }), "");
  assert.equal(pure.branchChip({}), "");
  assert.ok(pure.branchChip({ branch: "b".repeat(80) }).length <= 28, "dal adı kesilir");
  assert.equal(pure.subagentCount({ subagents: 3 }), 3);
  assert.equal(pure.subagentCount({ subagents: [1, 2] }), 2);
  assert.equal(pure.subagentCount({ subagents: 0 }), 0);
  assert.equal(pure.subagentCount({ subagents: "x" }), 0);
});

test("normFilter / filterActive", () => {
  const { pure } = load();
  assert.deepEqual({ ...pure.normFilter(null) }, { status: "all", provider: "all" });
  assert.deepEqual({ ...pure.normFilter("running") }, { status: "running", provider: "all" });
  assert.deepEqual({ ...pure.normFilter({ status: "failed", provider: "codex" }) }, { status: "failed", provider: "codex" });
  assert.equal(pure.filterActive(null), false);
  assert.equal(pure.filterActive({ provider: "codex" }), true);
});

test("filterTopics: arama (tr katlama), durum ve sağlayıcı süzgeci", () => {
  const { pure } = load();
  const list = [
    mkTopic(1, { title: "Işık raporu", state: "running" }),
    mkTopic(2, { title: "Yedek", state: "failed", provider: "codex", model: "gpt" }),
    mkTopic(3, { title: "Rapor taslağı", summary: "dal faz11", branch: "faz11/x" }),
    null,
  ];
  assert.equal(pure.filterTopics(list, "", null).length, 3, "geçersiz kayıt atlanır");
  assert.deepEqual(pure.filterTopics(list, "isik", null).map((t: any) => t.id), ["t1"], "Işık = isik");
  assert.deepEqual(pure.filterTopics(list, "RAPOR", null).map((t: any) => t.id), ["t1", "t3"]);
  assert.deepEqual(pure.filterTopics(list, "rapor faz11", null).map((t: any) => t.id), ["t3"], "tüm sözcükler eşleşmeli");
  assert.deepEqual(pure.filterTopics(list, "", { status: "failed" }).map((t: any) => t.id), ["t2"]);
  assert.deepEqual(pure.filterTopics(list, "", { provider: "codex" }).map((t: any) => t.id), ["t2"]);
  assert.deepEqual(pure.filterTopics(list, "yedek", { status: "running" }), []);
});

test("limitItems: ilk 5 + 'daha fazla' mantığı", () => {
  const { pure } = load();
  const l = Array.from({ length: 8 }, (_, i) => i);
  const a = pure.limitItems(l, 5, false);
  assert.equal(a.shown.length, 5);
  assert.equal(a.hidden, 3);
  const b = pure.limitItems(l, 5, true);
  assert.equal(b.shown.length, 8);
  assert.equal(b.hidden, 0);
  assert.equal(pure.limitItems([1, 2], 5, false).hidden, 0);
  assert.equal(pure.limitItems(null, 5, false).shown.length, 0);
  assert.equal(pure.limitItems(Array.from({ length: 500 }, (_, i) => i), 5, true).shown.length, 200, "sert üst sınır");
});

test("normalizeGroups: nesne, dizi ve kimlik dizesi biçimleri; hiçbir konu düşmez", () => {
  const { pure } = load();
  const topics = [mkTopic(1), mkTopic(2), mkTopic(3), mkTopic(4)];
  const g1 = pure.normalizeGroups({ waiting: [topics[0]], running: ["t2"], resolved: [topics[2]] }, topics);
  assert.deepEqual(Array.from(g1.waiting.map((t: any) => t.id)), ["t1"]);
  assert.deepEqual(Array.from(g1.running.map((t: any) => t.id)), ["t2"], "kimlik dizesi konuya çözülür");
  assert.deepEqual(Array.from(g1.resolved.map((t: any) => t.id)), ["t3"]);
  assert.deepEqual(Array.from(g1.idle.map((t: any) => t.id)), ["t4"], "eşleşmeyen konu sessizce düşmez, boşta olur");
  const g2 = pure.normalizeGroups([{ key: "needsYou", items: [topics[0]] }, { key: "working", items: [topics[1]] }], topics);
  assert.equal(g2.waiting.length, 1);
  assert.equal(g2.running.length, 1);
  const g3 = pure.normalizeGroups({ waiting: [topics[0]], idle: [topics[0]] }, [topics[0]]);
  assert.equal(g3.waiting.length + g3.idle.length, 1, "aynı konu iki grupta görünmez");
  const g4 = pure.normalizeGroups(null, topics);
  assert.equal(g4.idle.length, 4);
  assert.equal(pure.visibleCount(g1), 3, "çözülmüş sayıya girmez");
});

test("taskFor ve collectApprovals", () => {
  const { pure } = load();
  const tasks = [
    { id: "a1", title: "Yedek al", state: "awaiting_approval", requestedAction: "backup.run", request: { target: "D:\\kasa" } },
    { id: "a2", title: "Bitti", state: "succeeded", requestedAction: "x", request: null },
  ];
  const topics = [mkTopic(1, { id: "tp1", taskId: "a1", state: "awaiting_approval", summary: "yedek için izin" }), mkTopic(2, { id: "tp2", state: "awaiting_approval", requestedAction: "net.fetch", reason: "veri lazım" })];
  assert.equal(pure.taskFor(topics[0], tasks).id, "a1", "taskId ile bulunur");
  assert.equal(pure.taskFor(topics[1], tasks), null);
  assert.equal(pure.taskFor({ id: "a2" }, tasks), null, "onay beklemeyen görev dönmez");
  const list = pure.collectApprovals(topics, tasks);
  assert.equal(list.length, 2);
  assert.equal(list[0].id, "tp1");
  assert.equal(list[0].action, "backup.run");
  assert.equal(list[0].target, "D:\\kasa");
  assert.equal(list[0].reason, "yedek için izin");
  assert.equal(list[0].task.id, "a1");
  assert.equal(list[1].task, null, "görev kaydı yoksa onaylanamaz");
  assert.equal(list[1].reason, "veri lazım");
});

test("statusInfo: AM_STATUS.label şekil+metin+ton; yedek tablo; bozuk ton temizlenir", () => {
  const l = load();
  const a = l.pure.statusInfo("unavailable");
  assert.equal(a.text, "Kullanılamıyor");
  assert.equal(a.tone, "bad");
  assert.equal(a.shape, "cross");
  const nolabel = load({ status: false });
  const b = nolabel.pure.statusInfo("awaiting_approval");
  assert.equal(b.text, "Onay bekliyor");
  assert.equal(b.tone, "warn");
  assert.ok(b.glyph, "şekil her zaman var");
  const c = nolabel.pure.statusInfo("bilinmeyen_durum");
  assert.equal(c.tone, "muted");
  assert.equal(c.text, "bilinmeyen_durum");
  const w = load();
  w.win.AM_STATUS.label = () => ({ text: "X", tone: "<script>", shape: "nope" });
  const d = w.pure.statusInfo("idle");
  assert.equal(d.tone, "muted", "sabit kümede olmayan ton reddedilir");
  assert.ok(d.glyph);
});

test("providerInfo: kullanılamayan sağlayıcı kötü işaretlenir", () => {
  const { pure } = load();
  assert.equal(pure.providerInfo({ capabilities: [{ operation: "execute", status: "unavailable" }, { operation: "testConnection", status: "verified" }] }).bad, true);
  assert.equal(pure.providerInfo({ capabilities: [{ operation: "x", status: "unavailable" }, { operation: "execute", status: "verified" }] }).bad, false);
  assert.equal(pure.providerInfo({ capabilities: [] }).bad, true);
  assert.equal(pure.providerInfo({ capabilities: [{ status: "verified" }] }).level, "ok");
  assert.equal(pure.providerInfo({ capabilities: [{ status: "partial" }] }).level, "warn");
});

// ---------- Sözleşme / güvenlik ----------
test("metinler: tüm anahtarlar 'panel.' önekli ve AM_REGISTER_TR ile kaydedilir", () => {
  let got: any = null;
  const l = load({ register: (p, d) => { got = [p, d]; } });
  assert.equal(got[0], "panel");
  assert.ok(Object.keys(got[1]).length > 50);
  for (const k of Object.keys(l.pure.strings)) assert.ok(k.startsWith("panel."), `anahtar ${k}`);
  assert.equal(l.pure.registered, true);
});

test("yükleme DOM'a dokunmaz ve kaydedici yoksa da çalışır", () => {
  const ctx: any = vm.createContext({ window: {} });
  assert.doesNotThrow(() => new vm.Script(SRC).runInContext(ctx));
  assert.equal(typeof ctx.window.AM_PANEL.init, "function");
  assert.equal(typeof ctx.window.AM_PANEL.render, "function");
  assert.equal(typeof ctx.window.AM_PANEL.pure, "object");
});

test("kaynak taraması: yasak API yok, dış kaynak yok, CSS yalnız belirteç", () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const js = strip(SRC);
  for (const sink of ["innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval(", "new Function", "javascript:", "srcdoc", "postMessage", "localStorage", "sessionStorage", "document.cookie", "fetch(", "XMLHttpRequest", "WebSocket", "Authorization", "Bearer", "setTimeout(", "setInterval("]) {
    assert.ok(!js.includes(sink), `panel.js yasak: ${sink}`);
  }
  assert.ok(!/https?:\/\//i.test(js + CSS), "dış adres yok");
  assert.ok(!/\.style\b|setAttribute\(\s*["']style["']/.test(js), "satır içi stil yok");
  const css = strip(CSS);
  assert.ok(!/@import|url\(/i.test(css), "CSS içe aktarma/url yok");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css) && !/\brgba?\(/.test(css), "CSS'te ham renk yok; yalnız var(--am-*)");
  assert.ok(!/\bDelete\b|\bSil\b/.test(js.replace(/Çözülmüş konular arşivdedir; hiçbiri silinmez\./, "")), "arayüzde Sil eylemi yok");
});

// ---------- Çizim ----------
function seed(l: ReturnType<typeof load>, n = 0) {
  l.AM.state.topics = [
    mkTopic(1, { state: "awaiting_approval", unread: true, title: "İzin isteyen konu", taskId: "k1", branch: "faz11/panel", pr: 7, subagents: 2, steps: { done: 3, total: 5 }, model: "claude-opus-4" }),
    mkTopic(2, { state: "running", title: "Çalışan konu", model: "claude-haiku-4-5" }),
    mkTopic(3, { state: "idle", title: "Boştaki konu", model: null }),
    mkTopic(4, { state: "done", title: "Bitmiş konu" }),
    mkTopic(5, { state: "unavailable", title: "Kapalı sağlayıcı konusu", provider: "codex" }),
  ];
  for (let i = 0; i < n; i++) l.AM.state.topics.push(mkTopic(100 + i, { state: "awaiting_approval", title: `Ek bekleyen ${i}` }));
  l.AM.state.tasks = [{ id: "k1", title: "İzin isteyen konu", state: "awaiting_approval", requestedAction: "file.write", request: { target: "D:\\x\\y.txt" }, decision: "ask", createdAt: "2026-10-22T09:00:00Z" }];
}

test("render: karşılama, bekleyen sayısı, gruplar, çözülmüş varsayılan kapalı", () => {
  const l = load();
  seed(l);
  l.start();
  const all = l.host.textContent;
  assert.ok(all.includes("Tekrar hoş geldiniz, Yusuf."));
  assert.ok(all.includes("Sizi bekleyen 2 konu var."), "bekleyen = bekleyen grup uzunluğu");
  for (const g of ["Sizi bekleyenler", "Çalışıyor", "Boşta", "Çözülmüş"]) assert.ok(all.includes(g), g);
  assert.ok(all.includes("İzin isteyen konu"));
  assert.ok(!all.includes("Bitmiş konu"), "çözülmüş grup kapalı başlar");
  const hd = byKey(l.host, "grp:resolved")!;
  assert.equal(hd.getAttribute("aria-expanded"), "false");
  assert.equal(byKey(l.host, "grp:waiting")!.getAttribute("aria-expanded"), "true");
});

test("render: konu satırı durum etiketi, model rozeti, dal/PR, alt ajan, ilerleme, okunmadı", () => {
  const l = load();
  seed(l);
  l.start();
  const all = l.host.textContent;
  assert.ok(all.includes("Onay bekliyor"));
  assert.ok(all.includes("Kullanılamıyor"));
  assert.ok(all.includes("Opus") && all.includes("Haiku"));
  assert.ok(all.includes("?"), "modeli bilinmeyen konu '?' rozeti alır");
  assert.ok(all.includes("faz11/panel · #7"));
  assert.ok(all.includes("2 alt ajan"));
  assert.ok(all.includes("3/5"));
  assert.ok(all.includes("Okunmadı"));
  const kapali = walkAll(l.host).find((n) => n.className.includes("am-pn-tone--bad"));
  assert.ok(kapali, "kullanılamıyor kırmızı ton sınıfı");
  const shape = walkAll(l.host).find((n) => n.className === "am-pn-shape" && n.own === "\u2715");
  assert.ok(shape, "şekil yalnız renk değil: çarpı işareti");
});

test("bekleyenlerde ilk 5 satır + 'Daha fazla göster'; açınca hepsi", () => {
  const l = load();
  seed(l, 6);
  l.start();
  const rows = () => walkAll(l.host).filter((n) => (n.attrs["data-pn-key"] || "").startsWith("row:") && n.attrs["data-pn-id"] !== undefined);
  const count = (re: RegExp) => rows().filter((n) => re.test(n.attrs["data-pn-id"] as string)).length;
  assert.equal(count(/^(t1|t5|t10\d)$/), 5, "8 bekleyen: yalnız 5 çizilir");
  const more = byKey(l.host, "more:waiting")!;
  assert.ok(more.textContent.includes("Daha fazla göster (3)"));
  dispatch(l.host, "click", more);
  assert.equal(count(/^(t1|t5|t10\d)$/), 8, "tümü gösterilir");
  assert.ok(byKey(l.host, "more:waiting")!.textContent.includes("Daha az göster"));
});

test("satıra tıklama selectTopic çağırır; satır içi İzin ver/Reddet AM.actions.approve/deny", () => {
  const l = load();
  seed(l);
  l.start();
  dispatch(l.host, "click", byKey(l.host, "row:t2")!);
  assert.deepEqual(l.calls.pop(), ["select", "t2"]);
  dispatch(l.host, "click", byKey(l.host, "approve:t1")!);
  assert.deepEqual(l.calls.pop(), ["approve", "k1"]);
  dispatch(l.host, "click", byKey(l.host, "deny:t1")!);
  assert.deepEqual(l.calls.pop(), ["deny", "k1"]);
  assert.equal(byKey(l.host, "approve:t2"), undefined, "onay beklemeyen satırda onay düğmesi yok");
});

test("XSS: sunucu metni yalnız metin olarak yazılır, etiket üretilmez", () => {
  const l = load();
  seed(l);
  l.AM.state.topics[1].title = "<img src=x onerror=alert(1)><script>boom()</script>";
  l.AM.state.topics[1].summary = "\"><svg onload=1>";
  l.start();
  assert.ok(l.host.textContent.includes("<img src=x onerror=alert(1)>"));
  for (const t of ["img", "script", "svg", "iframe"]) assert.ok(!l.doc.made.includes(t), `${t} öğesi üretilmedi`);
  assert.ok(walkAll(l.host).every((n) => !Object.keys(n.attrs).some((k) => /^on/i.test(k))), "olay özniteliği yok");
});

test("uzun/boşluksuz metin kesilir; bozuk kayıt paneli çökertmez", () => {
  const l = load();
  seed(l);
  l.AM.state.topics[1].title = "x".repeat(5000);
  l.AM.state.topics[1].summary = "y".repeat(5000);
  l.AM.state.topics.push(null, "garip", 5, { id: 99 });
  l.start();
  const t = walkAll(l.host).find((n) => n.className === "am-pn-title" && n.own.startsWith("xxx"))!;
  assert.ok(t.own.length <= 200, "başlık 200 karaktere kırpılır");
  assert.ok(l.host.textContent.length > 100, "geri kalan çizildi");
  assert.equal(walkAll(l.host).filter((n) => n.attrs.role === "alert").length, 0, "hata kartı yok");
});

test("sekmeler: tablist/tab/tabpanel, sayaç rozeti 9+, ok tuşuyla sekme değişimi", () => {
  const l = load();
  seed(l, 10);
  l.start();
  const tl = walkAll(l.host).find((n) => n.attrs.role === "tablist")!;
  assert.ok(tl.getAttribute("aria-label"));
  const tabs = walkAll(l.host).filter((n) => n.attrs.role === "tab");
  assert.deepEqual(tabs.map((t) => t.attrs["data-pn-tab"]), ["topics", "approvals", "changes", "scheduled", "overview"]);
  assert.equal(tabs[0]!.attrs["aria-selected"], "true");
  assert.equal(tabs[0]!.attrs.tabindex, "0");
  assert.equal(tabs[1]!.attrs.tabindex, "-1");
  assert.ok(tabs[0]!.textContent.includes("9+"), "13 açık konu: 9+");
  assert.ok(tabs[1]!.textContent.includes("9+"), "11 onay: 9+");
  const panelEl = walkAll(l.host).find((n) => n.attrs.role === "tabpanel")!;
  assert.equal(panelEl.attrs["aria-labelledby"], "am-pn-tab-topics");
  const ev = dispatch(l.host, "keydown", tabs[0]!, { key: "ArrowRight" });
  assert.equal(ev.prevented, true);
  assert.equal(l.AM.view.panelTab, "approvals");
  assert.equal(l.doc.activeElement!.attrs["data-pn-tab"], "approvals", "odak yeni sekmeye taşınır");
  dispatch(l.host, "keydown", l.doc.activeElement!, { key: "End" });
  assert.equal(l.AM.view.panelTab, "overview");
  dispatch(l.host, "keydown", l.doc.activeElement!, { key: "ArrowRight" });
  assert.equal(l.AM.view.panelTab, "topics", "sarmalanır");
});

test("Onaylar sekmesi: eylem + hedef + neden görünür, yalnız onay bekleyenler", () => {
  const l = load();
  seed(l);
  l.AM.view.panelTab = "approvals";
  l.start();
  const all = l.host.textContent;
  assert.ok(all.includes("file.write") && all.includes("D:\\x\\y.txt"));
  assert.ok(all.includes("Eylem") && all.includes("Hedef") && all.includes("Neden"));
  assert.ok(!all.includes("Çalışan konu"), "onay beklemeyenler görünmez");
  dispatch(l.host, "click", byKey(l.host, "approve:t1")!);
  assert.deepEqual(l.calls.pop(), ["approve", "k1"]);
  const noTask = load();
  noTask.AM.state.topics = [mkTopic(8, { state: "awaiting_approval", title: "Kayıtsız" })];
  noTask.AM.view.panelTab = "approvals";
  noTask.start();
  assert.ok(noTask.host.textContent.includes("görev kaydı bulunamadı"));
  assert.equal(byKey(noTask.host, "approve:t8"), undefined, "görev kaydı yoksa İzin ver yok");
});

test("Değişiklikler ve Zamanlanmış sekmeleri: liste ve boş durum (zamanlayıcı kurulmaz)", () => {
  const l = load();
  seed(l);
  l.AM.view.panelTab = "changes";
  l.start();
  assert.ok(l.host.textContent.includes("faz11/panel · #7"));
  assert.ok(!l.host.textContent.includes("Boştaki konu"), "dalı olmayan konu yok");
  const e = load();
  e.AM.state.topics = [mkTopic(1)];
  e.AM.view.panelTab = "changes";
  e.start();
  assert.ok(e.host.textContent.includes("Henüz dal veya çalışma ağacı yok."));
  e.AM.view.panelTab = "scheduled";
  e.panel.render(e.AM);
  assert.ok(e.host.textContent.includes("Zamanlayıcı henüz kurulu değil"));
});

test("Genel bakış sekmesi: Faz 10 panosu katlanır listeler, KULLANILAMIYOR ve otomatik geçiş yok notu", () => {
  const l = load();
  seed(l);
  l.AM.view.panelTab = "overview";
  l.AM.state.debt = [{ kind: "broken", text: "Kırık varsayım", decisionTitle: "Karar A", overdueDays: 3 }];
  l.AM.state.decisions = [{ title: "Gözden geçir", reviewState: "review_due", reviewReasons: ["süre doldu"] }, { title: "Tamam", reviewState: "ok", reviewReasons: [] }];
  l.AM.state.skills = [{ name: "Beceri X", state: "awaiting_approval", riskClass: "yüksek" }];
  l.AM.state.providers = [{ id: "codex", displayName: "Codex", routeKind: "cli", capabilities: [{ operation: "x", status: "unavailable" }] }];
  l.start();
  assert.equal(walkAll(l.host).filter((n) => (n.attrs["data-pn-key"] || "").startsWith("ov:")).length, 6, "altı katlanır bölüm (Yedek dahil)");
  assert.ok(!l.host.textContent.includes("Kırık varsayım"), "bölümler kapalı başlar");
  for (const id of ["debt", "decisions", "skills", "providers", "tasks"]) dispatch(l.host, "click", byKey(l.host, `ov:${id}`)!);
  const all = l.host.textContent;
  for (const s of ["Kırık varsayım", "3 gün gecikmiş", "Gözden geçir", "Beceri X", "Risk: yüksek", "KULLANILAMIYOR", "Otomatik geçiş yok"]) assert.ok(all.includes(s), s);
  assert.ok(!all.includes("Tamam"), "uygun kararlar listelenmez");
  assert.equal(byKey(l.host, "ov:debt")!.getAttribute("aria-expanded"), "true");
  dispatch(l.host, "click", byKey(l.host, "task:k1")!);
  assert.deepEqual(l.calls.pop(), ["select", "k1"]);
});

test("grup başlığı katlanır: aria-expanded değişir, çözülmüş açılınca arşiv notu", () => {
  const l = load();
  seed(l);
  l.start();
  dispatch(l.host, "click", byKey(l.host, "grp:resolved")!);
  assert.equal(byKey(l.host, "grp:resolved")!.getAttribute("aria-expanded"), "true");
  assert.ok(l.host.textContent.includes("Bitmiş konu"));
  assert.ok(l.host.textContent.includes("arşivdedir; hiçbiri silinmez"));
  dispatch(l.host, "click", byKey(l.host, "grp:waiting")!);
  assert.ok(!l.host.textContent.includes("İzin isteyen konu"));
  assert.equal(l.doc.activeElement!.attrs["data-pn-key"], "grp:waiting", "odak başlıkta kalır");
});

test("arama ve süzgeç: AM.view.panelSearch/panelFilter güncellenir, sonuç süzülür, eşleşme yoksa boş durum", () => {
  const l = load();
  seed(l);
  l.start();
  dispatch(l.host, "click", byKey(l.host, "tool:searchtoggle")!);
  const input = byKey(l.host, "search")!;
  assert.equal(l.doc.activeElement, input, "arama açılınca odak giriş kutusunda");
  input.value = "çalışan";
  dispatch(l.host, "input", input);
  assert.equal(l.AM.view.panelSearch, "çalışan");
  assert.ok(l.host.textContent.includes("Çalışan konu") && !l.host.textContent.includes("Boştaki konu"));
  assert.equal(l.doc.activeElement!.attrs["data-pn-key"], "search", "yazarken odak kaybolmaz");
  const input2 = byKey(l.host, "search")!;
  input2.value = "olmayan şey";
  dispatch(l.host, "input", input2);
  assert.ok(l.host.textContent.includes("Eşleşen konu yok"));
  dispatch(l.host, "click", byKey(l.host, "clearall")!);
  assert.equal(l.AM.view.panelSearch, "");
  assert.ok(l.host.textContent.includes("Boştaki konu"));
  dispatch(l.host, "click", byKey(l.host, "tool:filtertoggle")!);
  const sel = byKey(l.host, "sel:filter-status")!;
  sel.value = "running";
  dispatch(l.host, "change", sel);
  assert.equal(l.AM.view.panelFilter.status, "running");
  assert.ok(l.host.textContent.includes("Çalışan konu") && !l.host.textContent.includes("Boştaki konu"));
  assert.ok(byKey(l.host, "filterclear"), "etkin süzgeçte temizle düğmesi");
});

test("üst şerit eylemleri: + giriş kutusuna odak, genişlet, kapat", () => {
  const l = load();
  seed(l);
  l.start();
  dispatch(l.host, "click", byKey(l.host, "tool:new")!);
  assert.equal(JSON.stringify(l.calls.filter((c) => c[0] === "setView").pop()), JSON.stringify(["setView", { focusComposer: true }]));
  dispatch(l.host, "click", byKey(l.host, "tool:wide")!);
  assert.equal(l.AM.view.panelWide, true);
  assert.equal(byKey(l.host, "tool:wide")!.getAttribute("aria-pressed"), "true");
  dispatch(l.host, "click", byKey(l.host, "tool:close")!);
  assert.equal(l.AM.view.panelOpen, false);
  assert.ok(!l.calls.some((c) => c[0] === "command"), "yeni görev kaydı komut göndermez");
});

test("klavye: ok tuşları satırlar arasında gezinir, Home/End uçlara gider", () => {
  const l = load();
  seed(l);
  l.start();
  const first = byKey(l.host, "grp:waiting")!;
  first.focus();
  const ev = dispatch(l.host, "keydown", first, { key: "ArrowDown" });
  assert.equal(ev.prevented, true);
  assert.equal(l.doc.activeElement!.attrs["data-pn-key"], "row:t1", "başlıktan ilk satıra");
  dispatch(l.host, "keydown", l.doc.activeElement!, { key: "ArrowUp" });
  assert.equal(l.doc.activeElement!.attrs["data-pn-key"], "grp:waiting");
  dispatch(l.host, "keydown", l.doc.activeElement!, { key: "End" });
  const last = l.doc.activeElement!;
  assert.ok(last.attrs["data-pn-nav"] === "1");
  dispatch(l.host, "keydown", last, { key: "ArrowDown" });
  assert.equal(l.doc.activeElement, last, "son öğede durur");
  dispatch(l.host, "keydown", last, { key: "Home" });
  assert.equal(l.doc.activeElement!.attrs["data-pn-key"], "grp:waiting");
});

test("boş durum, yüklenme iskeleti ve veri hatası", () => {
  const empty = load();
  empty.start();
  assert.ok(empty.host.textContent.includes("Henüz konu yok"));
  assert.ok(empty.host.textContent.includes("Sizi bekleyen konu yok."));
  const loading = load();
  loading.AM.state.topics = undefined;
  loading.start();
  const sk = walkAll(loading.host).find((n) => n.attrs["aria-busy"] === "true");
  assert.ok(sk, "iskelet aria-busy");
  assert.ok(loading.host.textContent.includes("Konular yükleniyor"));
  const bad = load();
  bad.AM.state.topicsError = "sunucu 500";
  bad.start();
  const alert = walkAll(bad.host).find((n) => n.attrs.role === "alert");
  assert.ok(alert && alert.textContent.includes("sunucu 500"));
});

test("render hatası okunur hata kartı + yeniden dene; AM_STATUS yoksa sessiz gruplama yok", () => {
  const l = load({ status: false });
  seed(l);
  l.start();
  const alert = walkAll(l.host).find((n) => n.attrs.role === "alert")!;
  assert.ok(alert, "hata kartı role=alert");
  assert.ok(alert.textContent.includes("AM_STATUS"));
  assert.ok(!l.host.textContent.includes("İzin isteyen konu"), "kendi gruplamasına düşmez");
  dispatch(l.host, "click", byKey(l.host, "retry")!);
  assert.ok(l.calls.some((c) => c[0] === "refresh"), "yeniden dene AM.actions.refresh çağırır");
  l.win.AM_STATUS = fakeStatus();
  l.panel.render(l.AM);
  assert.equal(walkAll(l.host).filter((n) => n.attrs.role === "alert").length, 0, "durum gelince kart kalkar");
});

test("AM_ICON varsa SVG simgesi kullanılır, yoksa metin yedeği", () => {
  const withIcon = load({ icon: true });
  seed(withIcon);
  withIcon.start();
  assert.ok(walkAll(withIcon.host).some((n) => n.tag === "svg" && n.attrs["data-icon"] === "chevron"));
  const without = load();
  seed(without);
  without.start();
  assert.ok(walkAll(without.host).some((n) => n.className === "am-pn-ico" && n.own === "\u203a"));
});

test("sert sınır: 500 konu çizimi kilitlemez", () => {
  const l = load();
  l.AM.state.topics = Array.from({ length: 500 }, (_, i) => mkTopic(i, { state: "idle" }));
  l.start();
  const rows = walkAll(l.host).filter((n) => (n.attrs["data-pn-key"] || "").startsWith("row:"));
  assert.ok(rows.length <= 200);
});

// ================================================================ Yedek durumu (kullanım tabanlı denetimli yedek)
function mkBackup(over: Record<string, unknown> = {}) {
  return {
    lastBackup: { at: "2026-10-22T08:00:00Z", dir: "D:\\YusufII\\yedekler\\yedek-20261022-0800", reason: "idle" },
    ageHours: 5.4, changesSince: 7,
    lastVerify: { at: "2026-10-22T08:01:00Z", ok: true, problems: [] },
    lastDecision: { at: "2026-10-22T11:00:00Z", action: "skip", code: "few_changes", reason: "yalnız 7 değişiklik var (eşik 20)" },
    warnings: [], config: { minChanges: 20, idleMinutes: 15, staleDays: 3 }, ...over,
  };
}
const WARN_ALL = [
  { code: "backup_failed", text: "Son yedek denemesi başarısız: disk dolu" },
  { code: "verify_failed", text: "Yedek doğrulaması başarısız (x)" },
  { code: "stale_with_activity", text: "Son yedek 80 saat önce" },
  { code: "scheduler_error", text: "zamanlayıcı durdu" },
];
function tabBtn(host: FNode, id: string) { return byKey(host, "tab:" + id)!; }
function overviewWith(backup: unknown) {
  const l = load();
  l.AM.state.backup = backup;
  l.AM.view.panelTab = "overview";
  l.start();
  return l;
}

test("yedek pure: agoText 'N saat önce' ve sınırlar", () => {
  const { pure } = load();
  assert.equal(pure.agoText(5.9), "5 saat önce");
  assert.equal(pure.agoText(0.4), "1 saatten kısa süre önce");
  assert.equal(pure.agoText(72), "3 gün önce");
  assert.equal(pure.agoText(null), "");
  assert.equal(pure.agoText("x"), "");
  assert.equal(pure.agoText(-1), "");
});

test("yedek pure: uyarı özeti kod başına başlık, rozet sayısı, null/bozuk veri güvenli", () => {
  const { pure } = load();
  const w = pure.backupWarnings({ warnings: WARN_ALL });
  assert.deepEqual(w.map((x: any) => x.title), ["Yedek başarısız", "Yedek doğrulaması başarısız", "Yedek eski, değişiklik var", "Zamanlayıcı hatası"]);
  assert.equal(pure.backupBadgeCount({ warnings: WARN_ALL }), 4);
  assert.equal(pure.backupBadgeCount(null), 0);
  assert.equal(pure.backupBadgeCount({ warnings: "x" }), 0);
  assert.equal(pure.backupBadgeCount({ warnings: [] }), 0);
  assert.equal(pure.backupWarnings({ warnings: [null, 3, { code: "yeni_kod", text: "t" }] })[0].title, "yeni_kod", "bilinmeyen kod ham gösterilir, düşmez");
  assert.equal(pure.backupStripText({ warnings: [] }), "");
  assert.equal(pure.backupStripText({ warnings: [WARN_ALL[0]] }), "Yedek uyarısı: Son yedek denemesi başarısız: disk dolu");
  assert.ok(pure.backupStripText({ warnings: WARN_ALL }).endsWith("(+3 uyarı daha)"));
});

test("yedek pure: kural özeti sabit saat içermez; klasör adı yolun son parçasıdır", () => {
  const { pure } = load();
  assert.equal(pure.backupRuleText({ minChanges: 20, idleMinutes: 15 }), "20 değişiklik ve 15 dk sakinlik");
  assert.equal(pure.backupRuleText({ minChanges: null, idleMinutes: 15 }), "");
  assert.equal(pure.backupRuleText(null), "");
  assert.equal(pure.dirName("D:\\a\\b\\yedek-1"), "yedek-1");
  assert.equal(pure.dirName("/x/y/z/"), "z");
  assert.equal(pure.dirName(null), "");
  assert.match(pure.fmtDate("2026-10-22T08:00:00Z"), /^22\.10\.2026 \d{2}:\d{2}$/);
  assert.equal(pure.fmtDate("bozuk"), "");
});

test("yedek: uyarı varsa Konular sekmesinde şerit + sekme rozeti, Genel bakış etiketinde rozet", () => {
  const l = load();
  l.AM.state.topics = [mkTopic(1)];
  l.AM.state.backup = mkBackup({ warnings: [WARN_ALL[0], WARN_ALL[2]] });
  l.start();
  const strip = walkAll(l.host).find((n) => n.className === "am-pn-bkstrip")!;
  assert.ok(strip, "şerit çizildi");
  assert.equal(strip.attrs.role, "status", "role=alert değil role=status");
  assert.ok(strip.textContent.startsWith("▲Yedek uyarısı: Son yedek denemesi başarısız"));
  assert.ok(strip.textContent.includes("(+1 uyarı daha)"));
  const order = walkAll(l.host).filter((n) => n.className === "am-pn-bkstrip" || n.className === "am-pn-group");
  assert.equal(order[0]!.className, "am-pn-bkstrip", "şerit 'Sizi bekleyenler' grubundan önce");
  for (const id of ["topics", "overview"]) {
    const mark = walkAll(tabBtn(l.host, id)).find((n) => n.className === "am-pn-warnmark")!;
    assert.ok(mark, id + " sekmesinde uyarı işareti");
    assert.ok(mark.textContent.includes("▲") && mark.textContent.includes("2"), "şekil + sayı");
  }
  for (const id of ["approvals", "changes", "scheduled"]) assert.ok(!walkAll(tabBtn(l.host, id)).some((n) => n.className === "am-pn-warnmark"), id + " işaretsiz");
});

test("yedek: şeride tıklayınca Genel bakış sekmesine geçilir (AM.actions.setView)", () => {
  const l = load();
  l.AM.state.backup = mkBackup({ warnings: [WARN_ALL[1]] });
  l.start();
  dispatch(l.host, "click", byKey(l.host, "bkstrip")!);
  assert.equal(JSON.stringify(l.calls.filter((c) => c[0] === "setView").pop()), JSON.stringify(["setView", { panelTab: "overview" }]));
  assert.equal(l.AM.view.panelTab, "overview");
  assert.ok(!walkAll(l.host).some((n) => n.className === "am-pn-bkstrip"), "Genel bakışta şerit çıkmaz");
});

test("yedek: uyarı yokken şerit ve rozet yok", () => {
  const l = load();
  l.AM.state.topics = [mkTopic(1)];
  l.AM.state.backup = mkBackup();
  l.start();
  assert.ok(!walkAll(l.host).some((n) => n.className === "am-pn-bkstrip" || n.className === "am-pn-warnmark"));
});

test("yedek: AM.state.backup null ise 'Yedek durumu alınamadı' kartı (sessizce gizlenmez), şerit yok", () => {
  const l = overviewWith(null);
  const card = walkAll(l.host).find((n) => n.className.startsWith("am-pn-bkcard "))!;
  assert.ok(card, "kart var");
  assert.ok(card.textContent.includes("Yedek durumu alınamadı"));
  assert.equal(card.attrs.role, "status");
  assert.ok(!walkAll(l.host).some((n) => n.className === "am-pn-bkstrip" || n.className === "am-pn-warnmark"));
  l.AM.view.panelTab = "topics";
  l.panel.render(l.AM);
  assert.ok(!walkAll(l.host).some((n) => n.className === "am-pn-bkstrip"));
});

test("yedek: Genel bakış 'Yedek' bölümü son yedek, doğrulama, değişiklik, karar ve kural özetini gösterir", () => {
  const l = overviewWith(mkBackup());
  const text = l.host.textContent;
  assert.ok(text.includes("Yedek"));
  assert.ok(text.includes("5 saat önce"));
  assert.ok(text.includes("klasör: yedek-20261022-0800"));
  assert.ok(!text.includes("D:\\YusufII\\yedekler"), "tam yol değil klasör adı");
  assert.ok(text.includes("Geçti"));
  assert.ok(text.includes("7 değişiklik"));
  assert.ok(text.includes("Yedek atlandı: yalnız 7 değişiklik var (eşik 20)"));
  assert.ok(text.includes("20 değişiklik ve 15 dk sakinlik"));
  assert.ok(text.includes("Sabit saat yok"), "kural notu sabit saat olmadığını söyler");
});

test("yedek: doğrulama KALDI ise sorunlar listelenir; uyarı kartları başlık + metinle role=status", () => {
  const l = overviewWith(mkBackup({ warnings: WARN_ALL, lastVerify: { at: "2026-10-22T08:01:00Z", ok: false, problems: ["özet uyuşmuyor: a.json", "şema eksik"] } }));
  const text = l.host.textContent;
  assert.ok(text.includes("KALDI") && text.includes("özet uyuşmuyor: a.json") && text.includes("şema eksik"));
  const cards = walkAll(l.host).filter((n) => n.className.startsWith("am-pn-bkcard "));
  assert.equal(cards.length, 4);
  for (const c of cards) { assert.equal(c.attrs.role, "status"); assert.ok(c.textContent.includes("▲")); }
  assert.ok(cards[0]!.textContent.includes("Yedek başarısız") && cards[0]!.textContent.includes("disk dolu"));
  assert.ok(cards[3]!.textContent.includes("Zamanlayıcı hatası"));
  assert.equal(walkAll(l.host).filter((n) => n.attrs.role === "alert").length, 0, "role=alert yok");
});

test("yedek: uyarı metnindeki XSS yükü yalnız metin olarak görünür", () => {
  const payload = "<img src=x onerror=alert(1)><script>alert(2)</script>";
  const l = load();
  l.AM.state.topics = [mkTopic(1)];
  l.AM.state.backup = mkBackup({ warnings: [{ code: "backup_failed", text: payload }], lastDecision: { at: "2026-10-22T11:00:00Z", action: "backup", code: "x", reason: payload }, lastBackup: { at: "x", dir: payload, reason: "" } });
  l.start();
  l.AM.view.panelTab = "overview";
  l.panel.render(l.AM);
  assert.ok(!l.doc.made.includes("img") && !l.doc.made.includes("script"), "img/script öğesi üretilmedi");
  assert.ok(l.host.textContent.includes("<img src=x"), "yük metin olarak görünür");
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|localStorage|fetch\(/.test(SRC.replace(/\/\/.*$/gm, "")), "yasak API yok");
});

test("yedek: bozuk/eksik alanlar çizimi çökertmez", () => {
  for (const b of [{}, { warnings: null, lastBackup: "x", lastVerify: 3, lastDecision: [], config: null }, { lastBackup: { at: null, dir: null }, lastVerify: { ok: false, problems: null }, ageHours: "abc" }]) {
    const l = overviewWith(b);
    assert.equal(walkAll(l.host).filter((n) => n.attrs.role === "alert").length, 0);
    assert.ok(l.host.textContent.includes("Yedek"));
  }
});

test("yedek CSS: dış kaynak yok, yeni sınıflar tanımlı", () => {
  for (const c of ["am-pn-bkstrip", "am-pn-bkstripbtn", "am-pn-warnmark", "am-pn-bkcard"]) assert.ok(CSS.includes("." + c), c);
  assert.ok(!/url\(|@import/.test(CSS));
});

// ---------- Risk rozeti, geri alma ve risk sıralaması (Onaylar) [Claude#agentmom-faz11-risk] ----------
const J = (v: unknown) => JSON.parse(JSON.stringify(v));
function riskSeed(l: ReturnType<typeof load>) {
  const mk = (id: string, risk: any, sem: any) => ({ id, title: "Görev " + id, state: "awaiting_approval", requestedAction: "act." + id, request: { target: "T" + id }, risk, semantics: sem });
  l.AM.state.topics = [];
  l.AM.state.tasks = [
    mk("a", { level: "low", score: 1, reasons: ["okuma"] }, { effect: "Okur", reversible: "yes", undo: "-" }),
    mk("b", null, null),
    mk("c", { level: "critical", score: 99, reasons: ["kalıcı", "dış yol"] }, { effect: "Üzerine yazar", reversible: "no", undo: "Yok" }),
    mk("d", { level: "high", score: 70, reasons: ["ağ"] }, { effect: "Ağa yazar", reversible: "partial", undo: "Geri çek" }),
    mk("e", { level: "medium", score: 40, reasons: ["yazma"] }, { effect: "Yazar", reversible: "yes", undo: "Eski sürüm" }),
  ];
}

test("risk rozeti: düzey -> ton + şekil + metin; renk tek ipucu değil", () => {
  const { pure } = load();
  const r = (lv: string) => J(pure.riskInfo({ level: lv, score: 2, reasons: [] }));
  assert.deepEqual([r("low").tone, r("low").glyph, r("low").text], ["ok", "✓", "Düşük risk"]);
  assert.deepEqual([r("medium").tone, r("medium").glyph, r("medium").text], ["info", "●", "Orta risk"]);
  assert.deepEqual([r("high").tone, r("high").glyph, r("high").text], ["warn", "▲", "Yüksek risk"]);
  assert.deepEqual([r("critical").tone, r("critical").glyph, r("critical").text], ["bad", "✕", "KRİTİK risk"]);
});

test("risk yok/bozuk: 'Risk hesaplanamadı', sıralamada düşükten önce (güvenli varsayım yok)", () => {
  const { pure } = load();
  for (const x of [null, undefined, {}, { level: "x" }, { level: "unknown" }, 5]) {
    const i = J(pure.riskInfo(x));
    assert.equal(i.text, "Risk hesaplanamadı");
    assert.equal(i.known, false);
    assert.equal(i.tone, "muted");
  }
  assert.ok(pure.riskInfo(null).rank > pure.riskInfo({ level: "low" }).rank);
  assert.ok(pure.riskInfo(null).rank < pure.riskInfo({ level: "medium" }).rank);
});

test("geri alma bilgisi: reversible=no belirgin, eksik veri varsayım yapmaz", () => {
  const { pure } = load();
  assert.equal(pure.undoInfo({ reversible: "no" }).irreversible, true);
  assert.equal(pure.undoInfo({ reversible: "no" }).text, "GERİ ALINAMAZ");
  assert.equal(pure.undoInfo({ reversible: "bilinmez" }).text, "Geri alınabilirlik bilinmiyor");
  assert.equal(pure.undoInfo(undefined).text, "Geri alma bilgisi yok");
  assert.equal(pure.undoInfo(undefined).irreversible, false);
});

test("sortApprovals: risk azalan, eşitte özgün sıra; kayıtsız satır düşmez", () => {
  const { pure } = load();
  const tasks = [
    { id: "1", risk: { level: "low" } }, { id: "2", risk: null }, { id: "3", risk: { level: "critical" } },
    { id: "4", risk: { level: "high" } }, { id: "5", risk: { level: "medium" } }, { id: "6", risk: { level: "high" } },
  ];
  const sorted = pure.sortApprovals(tasks.map((t) => ({ id: t.id, task: t })));
  assert.deepEqual(Array.from(sorted.map((a: any) => a.id)), ["3", "4", "6", "5", "2", "1"]);
  assert.deepEqual(Array.from(pure.sortApprovals(null)), []);
  assert.equal(pure.sortApprovals([{ id: "x", task: null }, { id: "y" }]).length, 2);
});

test("Onaylar sekmesi: risk azalan sıralı çizilir; rozet + Neden + Geri alma satırı görünür", () => {
  const l = load();
  riskSeed(l);
  l.AM.view.panelTab = "approvals";
  l.start();
  const all = l.host.textContent;
  const order = ["act.c", "act.d", "act.e", "act.b", "act.a"].map((a) => all.indexOf(a));
  assert.ok(order.every((v) => v >= 0));
  assert.deepEqual([...order].sort((x, y) => x - y), order, "KRİTİK > yüksek > orta > bilinmiyor > düşük");
  assert.ok(all.includes("KRİTİK risk") && all.includes("puan 99"));
  assert.ok(all.includes("Risk nedenleri") && all.includes("kalıcı") && all.includes("dış yol"));
  assert.ok(all.includes("Geri alma:") && all.includes("Üzerine yazar"));
  assert.ok(all.includes("Risk hesaplanamadı"), "risksiz görev açıkça işaretlenir");
});

test("Onaylar sekmesi: GERİ ALINAMAZ uyarısı role=alert; geri alınabilirde yok", () => {
  const l = load();
  riskSeed(l);
  l.AM.view.panelTab = "approvals";
  l.start();
  const alerts = walkAll(l.host).filter((n) => n.attrs["role"] === "alert" && n.className.includes("am-pn-undo--hard"));
  assert.equal(alerts.length, 1, "yalnız reversible=no olan tek görev");
  assert.ok(alerts[0]!.textContent.includes("GERİ ALINAMAZ") && alerts[0]!.textContent.includes("Bu eylem geri alınamaz"));
  assert.ok(l.host.textContent.includes("Kısmen geri alınabilir"));
});

test("Onaylar sekmesi: risk YALNIZ görev kaydından; konu kartındaki sahte risk yok sayılır", () => {
  const l = load();
  l.AM.state.topics = [mkTopic(1, { id: "tp1", taskId: "k1", state: "awaiting_approval", risk: { level: "low", reasons: ["SAHTE"] }, semantics: { reversible: "yes" } })];
  l.AM.state.tasks = [{ id: "k1", title: "T", state: "awaiting_approval", requestedAction: "file.write", request: { target: "x" } }];
  l.AM.view.panelTab = "approvals";
  l.start();
  assert.ok(l.host.textContent.includes("Risk hesaplanamadı"));
  assert.ok(!l.host.textContent.includes("SAHTE") && !l.host.textContent.includes("Düşük risk"));
});

test("Onaylar sekmesi: risk metni XSS yükü yalnız metin; onay düğmeleri çalışmaya devam eder", () => {
  const l = load();
  riskSeed(l);
  l.AM.state.tasks[2].risk.reasons = ["<img src=x onerror=alert(1)>"];
  l.AM.view.panelTab = "approvals";
  l.start();
  assert.ok(walkAll(l.host).every((n) => n.tag !== "img" && n.tag !== "script"));
  assert.ok(l.host.textContent.includes("<img src=x onerror=alert(1)>"));
  dispatch(l.host, "click", byKey(l.host, "approve:c")!);
  assert.deepEqual(l.calls.pop(), ["approve", "c"]);
});
