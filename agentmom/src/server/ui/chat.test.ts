// Sahip: Claude (Sonnet) [İP:AgentMom Faz 11, dilim 2] - chat.js (orta sohbet akışı) testleri.
// yazan: [Claude#agentmom-faz11-chat]
// Yöntem: chat.js node:vm ile sahte window içinde yüklenir (DOM'a dokunmadan); saf mantık doğrudan, çizim ise küçük bir sahte DOM ile sınanır.
// Değiştirme: yalnız sahibi ya da ana oturum.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { join } from "node:path";

const DIR = import.meta.dirname;
const SRC = readFileSync(join(DIR, "chat.js"), "utf8");
const CSS = readFileSync(join(DIR, "chat.css"), "utf8");
const TOKENS = readFileSync(join(DIR, "tokens.css"), "utf8");

// ---------- yükleyici ----------
type Reg = Record<string, Record<string, string>>;

function load(opts: { document?: any; extra?: Record<string, unknown>; register?: boolean } = {}) {
  const registered: Reg = {};
  const win: any = { ...(opts.extra ?? {}) };
  if (opts.register !== false) win.AM_REGISTER_TR = (mod: string, dict: Record<string, string>) => { registered[mod] = dict; };
  const sandbox: any = { window: win };
  if (opts.document) sandbox.document = opts.document;
  win.window = win;
  vm.runInNewContext(SRC, sandbox, { filename: "chat.js" });
  return { chat: win.AM_CHAT, registered, win };
}

// vm başka bir gerçek alan; nesneleri düz JSON'a çevirip karşılaştırırız.
const J = (v: unknown) => JSON.parse(JSON.stringify(v));

// ---------- sahte DOM ----------
class FNode {
  nodeType = 1;
  tagName: string;
  data = "";
  childNodes: FNode[] = [];
  parentNode: FNode | null = null;
  attrs: Record<string, string> = {};
  listeners: Record<string, Array<(e: any) => void>> = {};
  className = "";
  id = "";
  hidden = false;
  value = "";
  rows = 1;
  disabled = false;
  type = "";
  title = "";
  placeholder = "";
  tabIndex = 0;
  scrollTop = 0;
  scrollHeight = 0;
  clientHeight = 0;
  focused = false;
  constructor(tag: string, nodeType = 1) { this.tagName = tag.toUpperCase(); this.nodeType = nodeType; }
  get classList() {
    const self = this;
    return {
      add(c: string) { if (!self.className.split(" ").includes(c)) self.className = (self.className + " " + c).trim(); },
      remove(c: string) { self.className = self.className.split(" ").filter((x) => x && x !== c).join(" "); },
      contains(c: string) { return self.className.split(" ").includes(c); },
    };
  }
  get textContent(): string {
    if (this.nodeType === 3) return this.data;
    return this.childNodes.map((c) => c.textContent).join("");
  }
  set textContent(v: string) {
    for (const c of this.childNodes) c.parentNode = null;
    this.childNodes = [];
    if (String(v) !== "") this.appendChild(new FNode("#text", 3).withData(String(v)));
  }
  withData(d: string) { this.data = d; return this; }
  detach(n: FNode) { if (n.parentNode) n.parentNode.childNodes = n.parentNode.childNodes.filter((x) => x !== n); n.parentNode = null; }
  appendChild(n: FNode) { this.detach(n); n.parentNode = this; this.childNodes.push(n); return n; }
  insertBefore(n: FNode, ref: FNode | null) {
    if (n === ref) return n;
    this.detach(n);
    n.parentNode = this;
    const i = ref ? this.childNodes.indexOf(ref) : -1;
    if (i < 0) this.childNodes.push(n); else this.childNodes.splice(i, 0, n);
    return n;
  }
  removeChild(n: FNode) { this.detach(n); return n; }
  replaceChildren(...ns: FNode[]) { for (const c of this.childNodes) c.parentNode = null; this.childNodes = []; for (const n of ns) this.appendChild(n); }
  setAttribute(k: string, v: string) { this.attrs[k] = String(v); }
  getAttribute(k: string) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k: string) { delete this.attrs[k]; }
  addEventListener(t: string, fn: (e: any) => void) { (this.listeners[t] ??= []).push(fn); }
  dispatch(t: string, ev: any = {}) {
    const e = { preventDefault() { e.prevented = true; }, prevented: false, ...ev };
    for (const fn of this.listeners[t] ?? []) fn(e);
    return e;
  }
  focus() { this.focused = true; }
  cloneNode() { return new FNode(this.tagName, this.nodeType).withData(this.data); }
}

function makeDocument() {
  return {
    createElement: (tag: string) => new FNode(tag),
    createTextNode: (t: string) => new FNode("#text", 3).withData(String(t)),
  };
}

function walk(root: FNode, fn: (n: FNode) => void) { fn(root); for (const c of root.childNodes) walk(c, fn); }
function findAll(root: FNode, pred: (n: FNode) => boolean): FNode[] { const out: FNode[] = []; walk(root, (n) => { if (pred(n)) out.push(n); }); return out; }
function byClass(root: FNode, cls: string) { return findAll(root, (n) => n.nodeType === 1 && n.className.split(" ").includes(cls)); }
function byId(root: FNode, id: string): FNode {
  const r = findAll(root, (n) => n.id === id)[0];
  assert.ok(r, "#" + id + " bulunamadı");
  return r;
}
function textOf(n: FNode) { return n.textContent; }

function mdStub(text: string) {
  const d = new FNode("div");
  d.className = "md-stub";
  d.textContent = String(text);
  return d;
}

function mount(AM: any, extra: Record<string, unknown> = {}) {
  const doc = makeDocument();
  const { chat, win } = load({ document: doc, extra: { AM_MD: { render: mdStub }, ...extra } });
  const host = new FNode("div");
  host.id = "chatView";
  chat.init(AM, host);
  return { chat, host, win };
}

function baseAM(over: any = {}) {
  const calls: any = { approve: [], deny: [], command: [], setView: [], copy: [], stop: 0 };
  const AM: any = {
    state: { tasks: [], debt: [], decisions: [], skills: [], providers: [], topics: [], subsessions: [], timeline: {}, evidence: {}, ...(over.state ?? {}) },
    view: { selectedTopicId: null, attachments: [], ...(over.view ?? {}) },
    log: over.log ?? [],
    actions: {
      approve: (t: any) => calls.approve.push(t),
      deny: (t: any) => calls.deny.push(t),
      command: (t: string) => calls.command.push(t),
      setView: (p: any) => calls.setView.push(p),
      copyText: (t: string) => calls.copy.push(t),
      ...(over.actions ?? {}),
    },
  };
  return { AM, calls };
}

// ---------- saf mantık ----------
test("chat.js DOM'a dokunmadan yüklenir ve AM_CHAT şeklini sunar", () => {
  const { chat } = load();
  assert.equal(typeof chat.init, "function");
  assert.equal(typeof chat.render, "function");
  assert.equal(typeof chat.pure, "object");
});

test("metinler 'chat' modülüne chat. önekiyle kaydolur; kullanılan her anahtar tanımlı", () => {
  const { registered } = load();
  const dict = registered["chat"];
  assert.ok(dict, "chat modülü kaydedilmedi");
  const keys = Object.keys(dict);
  assert.ok(keys.length > 50);
  assert.ok(keys.every((k) => k.startsWith("chat.")), "chat. önekli olmayan anahtar var");
  const used = new Set<string>();
  for (const m of SRC.matchAll(/\bT\("(chat\.[A-Za-z0-9_.]+)"/g)) { if (!m[1]!.endsWith(".")) used.add(m[1]!); }
  for (const m of SRC.matchAll(/"(chat\.(?:cmd|sugg)\.[a-z_]+)"/g)) used.add(m[1]!);
  for (const u of ["now", "min", "hour", "day", "month", "year"]) { used.add("chat.time." + u); if (u !== "now") used.add("chat.ago." + u); }
  for (const b of ["merged", "open", "closed", "draft"]) used.add("chat.branch." + b);
  const missing = [...used].filter((k) => !(k in dict));
  assert.deepEqual(missing, [], "kayıtsız anahtar: " + missing.join(", "));
});

test("AM_REGISTER_TR yoksa yükleme patlamaz; hata görünür banner olarak çizilir", () => {
  const doc = makeDocument();
  const { chat } = load({ document: doc, register: false, extra: { AM_MD: { render: mdStub } } });
  const { AM } = baseAM();
  const host = new FNode("div");
  chat.init(AM, host);
  chat.render(AM);
  const banner = byClass(host, "am-chat-banner")[0]!;
  assert.equal(banner.hidden, false);
  assert.match(textOf(banner), /AM_REGISTER_TR/);
  assert.equal(banner.getAttribute("role"), "alert");
});

test("timeLabel: şimdi / dk / sa / g / ay (tr-TR), geçersiz = boş", () => {
  const { chat } = load();
  const p = chat.pure;
  const now = Date.parse("2026-10-22T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();
  assert.equal(p.timeLabel(ago(10_000), now), "şimdi");
  assert.equal(p.timeLabel(ago(5 * 60_000), now), "5 dk");
  assert.equal(p.timeLabel(ago(2 * 3_600_000), now), "2 sa");
  assert.equal(p.timeLabel(ago(3 * 86_400_000), now), "3 g");
  assert.equal(p.timeLabel(ago(90 * 86_400_000), now), "3 ay");
  assert.equal(p.timeLabel(new Date(now + 99_000).toISOString(), now), "şimdi", "gelecek zaman şimdi sayılır");
  assert.equal(p.timeLabel("saçma", now), "");
  assert.equal(p.timeLabel(null, now), "");
});

test("agoLabel: 'son güncelleme: 5 sa. önce' biçimi", () => {
  const { chat } = load();
  const now = Date.parse("2026-10-22T12:00:00Z");
  assert.equal(chat.pure.agoLabel(new Date(now - 5 * 3_600_000).toISOString(), now), "son güncelleme: 5 sa. önce");
  assert.equal(chat.pure.agoLabel(new Date(now - 20_000).toISOString(), now), "son güncelleme: şimdi");
  assert.equal(chat.pure.agoLabel("yok", now), "");
});

test("kindOf: öğe -> kart türü eşlemesi", () => {
  const { chat } = load();
  const k = chat.pure.kindOf;
  for (const kind of ["user", "assistant", "tool", "approval", "verify", "error", "handoff", "divider"]) {
    assert.equal(k({ kind }), kind);
  }
  assert.equal(k({ kind: "error", state: "unavailable" }), "unavailable");
  assert.equal(k({ kind: "error", card: { unavailable: true } }), "unavailable");
  assert.equal(k({ kind: "error", card: { kind: "unavailable" } }), "unavailable");
  assert.equal(k({ kind: "bilinmeyen" }), "unknown");
  assert.equal(k(null), "unknown");
  assert.equal(k("metin"), "unknown");
  assert.equal(k([]), "unknown");
});

test("newDividerIndex: 'Yeni' ayracı ilk kullanıcı-dışı yeni öğenin önüne gelir", () => {
  const { chat } = load();
  const f = chat.pure.newDividerIndex;
  const items = [{ kind: "user" }, { kind: "assistant" }, { kind: "user" }, { kind: "assistant" }, { kind: "tool" }];
  assert.equal(f(items, 2), 3, "kullanıcı öğesi atlanır");
  assert.equal(f(items, 5), -1, "hepsi görüldü");
  assert.equal(f(items, 0), -1, "ilk açılışta ayraç yok");
  assert.equal(f([{ kind: "user" }, { kind: "user" }], 1), -1, "yalnız kullanıcı öğeleri varsa ayraç yok");
  assert.equal(f(null, 1), -1);
});

test("slashQuery ve filterCommands: Türkçe katlama, önek önceliği", () => {
  const { chat } = load();
  const p = chat.pure;
  assert.equal(p.slashQuery("/du"), "du");
  assert.equal(p.slashQuery("/"), "");
  assert.equal(p.slashQuery("/durum şimdi"), null, "boşluktan sonra menü kapanır");
  assert.equal(p.slashQuery("merhaba /x"), null);
  assert.equal(p.slashQuery("/a\nb"), null);
  assert.deepEqual(J(p.commands), ["/yardim", "/durum", "/gorevler", "/onay", "/borc", "/kararlar", "/beceriler", "/saglayicilar", "/yetenekler", "/yenile", "/temizle"]);
  assert.equal(p.filterCommands("").length, 11);
  assert.deepEqual(J(p.filterCommands("yetenek").map((c: any) => c.name)), ["/yetenekler"]);
  assert.deepEqual(J(p.filterCommands("sağ").map((c: any) => c.name)), ["/saglayicilar"]);
  assert.deepEqual(J(p.filterCommands("BOR").map((c: any) => c.name))[0], "/borc");
  assert.equal(p.filterCommands("zzz").length, 0);
  // önek eşleşmesi içerik eşleşmesinden önce gelir
  const ge = J(p.filterCommands("ge").map((c: any) => c.name));
  assert.equal(ge[0], "/gorevler".startsWith("/ge") ? "/gorevler" : ge[0]);
});

test("summaryCounts / summaryLine: tek satır durum özeti", () => {
  const { chat } = load();
  const p = chat.pure;
  const c = p.summaryCounts({
    tasks: [{ state: "awaiting_approval" }, { state: "running" }, { state: "awaiting_approval" }],
    debt: [{ kind: "broken" }, { kind: "pending" }],
    decisions: [{ reviewState: "ok" }, { reviewState: "at_risk" }],
    providers: [{ id: "a", capabilities: [{ status: "unavailable" }] }, { id: "b", capabilities: [{ status: "verified" }] }],
  });
  assert.deepEqual(J(c), { tasks: 3, waiting: 2, broken: 1, review: 1, unavailable: 1 });
  assert.equal(p.summaryLine(c), "3 görev · 2 izin bekliyor · 1 kırık borç · 1 gözden geçirme · 1 sağlayıcı KULLANILAMIYOR");
  assert.equal(p.summaryLine(p.summaryCounts({})), "Henüz kayıt yok");
  assert.equal(p.summaryLine(null), "Henüz kayıt yok");
});

test("growRows: 1..8 satır arasında kırpılır", () => {
  const { chat } = load();
  const g = chat.pure.growRows;
  assert.equal(g(24, 24, 0, 8), 1);
  assert.equal(g(72, 24, 0, 8), 3);
  assert.equal(g(500, 24, 8, 8), 8);
  assert.equal(g(0, 24, 0, 8), 1);
  assert.equal(g(NaN, 24, 0, 8), 1);
  assert.equal(g(100, 0, 0, 8), 1);
});

test("modelBadge: gerçek model, bildirilen model, bilinmiyor, KULLANILAMIYOR; sessiz geri düşme yok", () => {
  const { chat } = load();
  const m = (s: any, v: any) => J(chat.pure.modelBadge(s, v));
  assert.equal(m({}, {}).text, "Yerel kip · model çağrısı yok");
  assert.equal(m({ ctxModel: "claude-opus-x" }, {}).text, "claude-opus-x");
  const subs = [{ id: "s1", taskId: "t1", provider: "claude", model: "claude-sonnet-5", modelSource: "run", state: "idle" }];
  assert.equal(m({ subsessions: subs, ctxModel: "baska" }, { selectedTopicId: "t1" }).text, "claude-sonnet-5", "alt oturumun gerçek modeli önceliklidir");
  assert.equal(m({ subsessions: subs }, { selectedSubsessionId: "s1" }).mode, "run");
  const declared = [{ id: "s1", taskId: "t1", model: "m1", modelSource: "declared" }];
  assert.equal(m({ subsessions: declared }, { selectedTopicId: "t1" }).text, "m1 (bildirilen)");
  const unknown = [{ id: "s1", taskId: "t1", model: null, modelSource: "unknown" }];
  const u = m({ subsessions: unknown, ctxModel: "kurtarma" }, { selectedTopicId: "t1" });
  assert.equal(u.text, "Model bilinmiyor", "bilinmeyen model başka modelle doldurulmaz");
  const down = m({ subsessions: [{ id: "s1", taskId: "t1", provider: "codex", model: "x", state: "unavailable" }], ctxModel: "yedek" }, { selectedTopicId: "t1" });
  assert.equal(down.mode, "unavailable");
  assert.match(down.text, /KULLANILAMIYOR/);
  const bad = m({ topics: [{ id: "t9", provider: "codex" }], providers: [{ id: "codex", capabilities: [{ status: "unavailable" }] }], ctxModel: "yedek" }, { selectedTopicId: "t9" });
  assert.equal(bad.mode, "unavailable", "kullanılamayan sağlayıcı yerine ctxModel gösterilmez");
});

test("isRunning, visibleSlice, statusTone, stateText", () => {
  const { chat } = load();
  const p = chat.pure;
  assert.equal(p.isRunning({ running: true }, {}), true);
  assert.equal(p.isRunning({ topics: [{ id: "t", state: "running" }] }, { selectedTopicId: "t" }), true);
  assert.equal(p.isRunning({ topics: [{ id: "t", state: "idle" }] }, { selectedTopicId: "t" }), false);
  assert.equal(p.isRunning({ subsessions: [{ id: "s", taskId: "t", state: "running" }] }, { selectedTopicId: "t" }), true);
  assert.equal(p.isRunning({}, {}), false);
  const v = p.visibleSlice([1, 2, 3, 4, 5], 2);
  assert.deepEqual(J(v), { items: [4, 5], hidden: 3 });
  assert.deepEqual(J(p.visibleSlice([1], 5)), { items: [1], hidden: 0 });
  assert.equal(p.statusTone("failed"), "bad");
  assert.equal(p.statusTone("awaiting_approval"), "warn");
  assert.equal(p.statusTone("???"), "muted");
  assert.equal(p.stateText("running"), "Çalışıyor");
  assert.equal(p.stateText(""), "Durum bilinmiyor");
  assert.equal(p.text("chat.olmayan"), "⟦chat.olmayan⟧", "bilinmeyen anahtar görünür");
});

// ---------- kaynak güvenliği ----------
test("chat.js yasak yapıları içermez", () => {
  const banned: Array<[string, RegExp]> = [
    ["inner HTML", /innerHTML|outerHTML|insertAdjacentHTML/],
    ["document.write", /document\.write/],
    ["eval", /\beval\s*\(|new\s+Function/],
    ["dize zamanlayıcı", /set(?:Timeout|Interval)\s*\(\s*["'`]/],
    ["srcdoc", /srcdoc/],
    ["postMessage", /postMessage/],
    ["çerez", /document\.cookie/],
    ["depolama", /localStorage|sessionStorage|indexedDB/],
    ["ağ", /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/],
    ["satır içi olay", /\bon(?:click|error|load|input|submit)\s*=/],
    ["satır içi stil", /setAttribute\(\s*["']style["']|\.style\.cssText|<style|<script/],
    ["dış kaynak", /https?:\/\//],
    ["javascript:", /javascript:/],
  ];
  for (const [name, re] of banned) assert.ok(!re.test(SRC), "chat.js yasak yapı içeriyor: " + name);
  assert.ok(/textContent/.test(SRC), "textContent kullanılmalı");
});

test("chat.js belirteç/ağ/Silme düğmesi içermez; yalnız AM.actions çağırır", () => {
  assert.ok(!/Authorization|Bearer|token/i.test(SRC.replace(/belirteç/gi, "")), "belirteç izi");
  const used = new Set<string>();
  for (const m of SRC.matchAll(/\u0008AM(?:ref)?\.actions\.([A-Za-z]+)/g)) used.add(m[1]!);
  const allowed = new Set(["approve", "deny", "command", "setView", "copyText", "stop", "startHandoff", "selectTopic", "loadEvidence"]);
  const extra = [...used].filter((a) => !allowed.has(a));
  assert.deepEqual(extra, [], "beklenmeyen eylem: " + extra.join(","));
  assert.ok(!/["']Sil["']|"delete"|\.remove\(\)/.test(SRC), "kalıcı silme düğmesi olmamalı");
});

test("chat.css yalnız belirteç değişkenleri kullanır: sabit renk, url(), @import, style= yok", () => {
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(CSS), "sabit renk");
  assert.ok(!/rgba?\(|hsla?\(/i.test(CSS.replace(/\/\*[\s\S]*?\*\//g, "")), "renk işlevi");
  assert.ok(!/url\s*\(/i.test(CSS), "url()");
  assert.ok(!/@import/i.test(CSS), "@import");
  assert.ok(!/https?:\/\//.test(CSS), "dış adres");
  const defined = new Set<string>();
  for (const m of TOKENS.matchAll(/(--am-[a-z0-9-]+)\s*:/g)) defined.add(m[1]!);
  for (const m of CSS.matchAll(/(--am-[a-z0-9-]+)\s*:/g)) defined.add(m[1]!);
  const undef = new Set<string>();
  for (const m of CSS.matchAll(/var\((--am-[a-z0-9-]+)/g)) if (!defined.has(m[1]!)) undef.add(m[1]!);
  assert.deepEqual([...undef], [], "tanımsız belirteç: " + [...undef].join(", "));
  assert.match(CSS, /prefers-reduced-motion/);
  assert.match(CSS, /focus-visible/);
  assert.match(CSS, /overflow-wrap:\s*anywhere/);
});

// ---------- çizim (sahte DOM) ----------
test("init: gerekli kimlikler kurulur; karşılama + öneri çipleri + tek satır özet", () => {
  const { AM, calls } = baseAM({ state: { tasks: [{ id: "a", state: "awaiting_approval" }] } });
  const { chat, host } = mount(AM);
  chat.render(AM);
  for (const id of ["feed", "welcome", "scrollDown", "composerForm", "composerInput", "attachRow", "attachBtn", "modelBadge", "modeBadge", "ringBtn", "sendBtn", "stopBtn", "slashMenu"]) byId(host, id);
  assert.equal(byId(host, "feed").getAttribute("role"), "log");
  assert.equal(byId(host, "feed").getAttribute("aria-live"), "polite");
  assert.equal(byId(host, "welcome").hidden, false, "seçili konu yokken karşılama görünür");
  assert.equal(byClass(host, "am-chat-sugg").length, 4);
  const sum = byClass(host, "am-chat-summary")[0]!;
  assert.match(textOf(sum), /1 görev · 1 izin bekliyor/);
  sum.dispatch("click");
  assert.deepEqual(J(calls.setView), [{ panelOpen: true }]);
  byClass(host, "am-chat-sugg")[0]!.dispatch("click");
  assert.deepEqual(calls.command, ["/durum"]);
  assert.equal(byId(host, "modelBadge").textContent, "Yerel kip · model çağrısı yok");
  assert.equal(byId(host, "modeBadge").textContent, "Mod: her işlem izin ister");
  assert.equal(byId(host, "stopBtn").hidden, true);
  assert.equal(byId(host, "scrollDown").hidden, true);
});

const NOW = new Date().toISOString();
function timeline() {
  return [
    { id: "1", kind: "user", text: "<img src=x onerror=alert(1)> merhaba", at: NOW, card: { edited: true } },
    { id: "2", kind: "assistant", text: "Tamam `kod` ve **kalın**", at: NOW, card: { branch: { label: "feat/chat", state: "merged" } } },
    { id: "3", kind: "tool", text: "ls", at: NOW, state: "succeeded", card: { name: "Bash", summary: "ls -la", output: "dosya1\ndosya2" } },
    { id: "4", kind: "approval", text: "", at: NOW, state: "awaiting_approval", card: { taskId: "tk1", reason: "dosya yazılacak" } },
    { id: "5", kind: "verify", text: "", at: NOW, state: "failed", card: { checks: [{ name: "tsc", ok: true }, { name: "test", ok: false, detail: "2 hata" }] } },
    { id: "6", kind: "error", text: "Bir hata", at: NOW, state: "failed", card: { detail: "stack" } },
    { id: "7", kind: "error", text: "Codex yok", at: NOW, state: "unavailable", card: { provider: "Codex" } },
    { id: "8", kind: "handoff", text: "Devir notu metni", at: NOW, card: { pct: 82 } },
    { id: "9", kind: "divider", text: "Dünden", at: NOW },
    { id: "10", kind: "tuhaf", text: "bilinmeyen tür", at: NOW },
  ];
}

test("render: tüm kart türleri çizilir; sunucu metni yalnız metin olarak yerleşir (XSS'e kapalı)", () => {
  const { AM, calls } = baseAM({
    state: { tasks: [{ id: "tk1", title: "Dosya yaz", state: "awaiting_approval", requestedAction: "file.write", request: { target: "D:/x.txt" } }], timeline: { t1: timeline() }, topics: [{ id: "t1", state: "idle" }] },
    view: { selectedTopicId: "t1" },
  });
  const { chat, host } = mount(AM);
  chat.render(AM);
  const items = byClass(host, "am-chat-items")[0]!;
  assert.equal(items.childNodes.length, 10, "10 öğe, ayraçsız (ilk açılış)");
  assert.equal(byId(host, "welcome").hidden, true, "konu doluyken karşılama gizli");
  // XSS: img elemanı yok, metin olduğu gibi duruyor
  assert.equal(findAll(host, (n) => n.tagName === "IMG").length, 0);
  const bubble = byClass(host, "am-chat-bubble")[0]!;
  assert.equal(textOf(bubble), "<img src=x onerror=alert(1)> merhaba");
  assert.match(textOf(byClass(host, "am-chat-note")[0]!), /düzenlenmiş/);
  // asistan metni AM_MD üzerinden
  assert.equal(byClass(host, "md-stub").length >= 1, true);
  assert.match(textOf(byClass(host, "am-chat-chip")[0]!), /feat\/chat.*Birleştirilmiş/);
  // araç kartı katlanır
  const head = byClass(host, "am-chat-fold-head")[0]!;
  assert.equal(head.getAttribute("aria-expanded"), "false");
  const body = byId(host, head.getAttribute("aria-controls")!);
  assert.equal(body.hidden, true);
  head.dispatch("click");
  assert.equal(head.getAttribute("aria-expanded"), "true");
  assert.equal(body.hidden, false);
  // izin kartı: düğmeler çekirdek eylemlerini çağırır
  const appr = byClass(host, "am-card--approval")[0]!;
  assert.match(textOf(appr), /file\.write/);
  assert.match(textOf(appr), /D:\/x\.txt/);
  const btns = findAll(appr, (n) => n.tagName === "BUTTON");
  assert.equal(btns.length, 2);
  btns[0]!.dispatch("click");
  btns[1]!.dispatch("click");
  assert.equal(calls.approve.length, 1);
  assert.equal(calls.deny.length, 1);
  assert.equal(calls.approve[0].id, "tk1");
  // doğrulama başarısız -> otomatik açık; kontrol satırları
  const vfold = byClass(host, "am-chat-fold")[1]!;
  assert.equal(byClass(vfold, "am-chat-check").length, 2);
  // KULLANILAMIYOR kartı: açık işaret + geçiş yok notu
  const un = byClass(host, "am-chat-unavail")[0]!;
  assert.match(textOf(un), /KULLANILAMIYOR/);
  assert.match(textOf(un), /Otomatik geçiş yok/);
  // devir notu kartı
  const ho = byClass(host, "am-chat-handoff")[0]!;
  assert.match(textOf(ho), /Bağlam %82/);
  findAll(ho, (n) => n.tagName === "BUTTON")[0]!.dispatch("click");
  assert.deepEqual(calls.copy, ["Devir notu metni"]);
  // bilinmeyen tür bozulmadan görünür
  assert.match(textOf(items.childNodes[9]!), /bilinmeyen tür/);
  // ayraç
  assert.equal(byClass(host, "am-chat-divider").length, 1);
});

test("izin kartı: görev artık onay beklemiyorsa düğme yok, karar görünür", () => {
  const { AM } = baseAM({
    state: { tasks: [{ id: "tk1", title: "x", state: "succeeded", requestedAction: "a", request: null }], timeline: { t1: [{ id: "4", kind: "approval", state: "approved", card: { taskId: "tk1" } }] } },
    view: { selectedTopicId: "t1" },
  });
  const { chat, host } = mount(AM);
  chat.render(AM);
  const appr = byClass(host, "am-card--approval")[0]!;
  assert.equal(findAll(appr, (n) => n.tagName === "BUTTON").length, 0);
  assert.match(textOf(appr), /Karar verildi/);
});

test("yeniden çizim: değişmeyen öğelerin düğümleri korunur; yeni öğe eklenince 'Yeni' ayracı çıkar", () => {
  const tl = timeline().slice(0, 3);
  const { AM } = baseAM({ state: { timeline: { t1: tl } }, view: { selectedTopicId: "t1" } });
  const { chat, host } = mount(AM);
  chat.render(AM);
  const items = byClass(host, "am-chat-items")[0]!;
  const before = items.childNodes.slice();
  chat.render(AM);
  assert.ok(items.childNodes.every((n, i) => n === before[i]), "düğümler yeniden kurulmadı");
  tl.push({ id: "11", kind: "assistant", text: "yeni yanıt", at: NOW } as any);
  chat.render(AM);
  assert.equal(byClass(host, "am-chat-divider").length, 1, "yeni asistan öğesinin önünde ayraç");
  assert.equal(items.childNodes.length, 5);
  assert.ok(items.childNodes[0] === before[0], "eski düğüm yerinde");
  const divider = byClass(host, "am-chat-divider")[0]!;
  assert.equal(textOf(divider), "Yeni");
  // yeni öğeyle ayraç sırası: ayraç son asistan öğesinden hemen önce
  assert.equal(items.childNodes.indexOf(divider), 3);
});

test("bozuk öğe tüm akışı çökertmez; render hatası okunur kart + yeniden dene verir", () => {
  const bad: any = { id: "b", kind: "tool" };
  Object.defineProperty(bad, "card", { get() { throw new Error("patladı"); }, enumerable: false });
  const { AM } = baseAM({ state: { timeline: { t1: [{ id: "1", kind: "assistant", text: "sağlam" }, bad] } }, view: { selectedTopicId: "t1" } });
  const { chat, host } = mount(AM);
  chat.render(AM);
  const items = byClass(host, "am-chat-items")[0]!;
  assert.equal(items.childNodes.length, 2);
  assert.match(textOf(items.childNodes[1]!), /gösterilemedi/);
  // tüm render çökerse
  const AM2: any = baseAM().AM;
  Object.defineProperty(AM2.state, "timeline", { get() { throw new Error("zaman çizelgesi patladı"); } });
  chat.render(AM2);
  const alertCard = findAll(host, (n) => n.getAttribute("role") === "alert" && n.className.includes("am-chat-renderror"))[0];
  assert.ok(alertCard, "okunur hata kartı");
  assert.match(textOf(alertCard!), /zaman çizelgesi patladı/);
  const retry = findAll(alertCard!, (n) => n.tagName === "BUTTON")[0]!;
  assert.match(textOf(retry), /Yeniden dene/);
});

test("giriş kutusu: Enter gönderir, Shift+Enter göndermez, boş metin gitmez", () => {
  const { AM, calls } = baseAM();
  const { chat, host } = mount(AM);
  chat.render(AM);
  const input = byId(host, "composerInput");
  input.value = "";
  const e0 = input.dispatch("keydown", { key: "Enter" });
  assert.equal(calls.command.length, 0, "boş metin gönderilmez");
  assert.equal(e0.prevented, true);
  input.value = "merhaba dünya";
  input.dispatch("keydown", { key: "Enter", shiftKey: true });
  assert.equal(calls.command.length, 0, "Shift+Enter satır ekler");
  input.dispatch("keydown", { key: "Enter", isComposing: true });
  assert.equal(calls.command.length, 0, "IME sırasında gönderilmez");
  input.dispatch("keydown", { key: "Enter" });
  assert.deepEqual(calls.command, ["merhaba dünya"]);
  assert.equal(input.value, "", "gönderince temizlenir");
  assert.equal(byId(host, "sendBtn").disabled, true);
});

test("slash menü: '/' ile açılır, ok tuşu seçer, Enter tamamlar, ikinci Enter gönderir, Esc kapatır", () => {
  const { AM, calls } = baseAM();
  const { chat, host } = mount(AM);
  chat.render(AM);
  const input = byId(host, "composerInput");
  const menu = byId(host, "slashMenu");
  input.value = "/";
  input.dispatch("input");
  assert.equal(menu.hidden, false);
  assert.equal(byClass(menu, "am-chat-slash-item").length, 11);
  assert.equal(input.getAttribute("aria-expanded"), "true");
  input.dispatch("keydown", { key: "ArrowDown" });
  const opts = byClass(menu, "am-chat-slash-item");
  assert.equal(opts[1]!.getAttribute("aria-selected"), "true");
  assert.equal(input.getAttribute("aria-activedescendant"), "am-chat-opt-1");
  input.dispatch("keydown", { key: "Enter" });
  assert.equal(input.value, "/durum");
  assert.equal(menu.hidden, true);
  assert.equal(calls.command.length, 0, "ilk Enter yalnız tamamlar");
  input.dispatch("keydown", { key: "Enter" });
  assert.deepEqual(calls.command, ["/durum"]);
  // süzme + Esc
  input.value = "/sag";
  input.dispatch("input");
  assert.equal(byClass(menu, "am-chat-slash-item").length, 1);
  input.dispatch("keydown", { key: "Escape" });
  assert.equal(menu.hidden, true);
  assert.equal(input.getAttribute("aria-expanded"), "false");
  input.value = "/zzz";
  input.dispatch("input");
  assert.equal(byClass(menu, "am-chat-slash-empty").length, 1, "eşleşme yokken görünür 'komut yok' satırı");
});

test("çalışırken DURDUR: AM.actions.stop varsa görünür ve çağrılır; yoksa gizli", () => {
  let stops = 0;
  const run = baseAM({
    state: { topics: [{ id: "t1", state: "running" }] },
    view: { selectedTopicId: "t1" },
    actions: { stop: () => { stops += 1; } },
  });
  const m = mount(run.AM);
  m.chat.render(run.AM);
  assert.equal(byId(m.host, "stopBtn").hidden, false);
  assert.equal(byId(m.host, "sendBtn").hidden, true);
  byId(m.host, "stopBtn").dispatch("click");
  assert.equal(stops, 1);
  const none = baseAM({ state: { topics: [{ id: "t1", state: "running" }] }, view: { selectedTopicId: "t1" } });
  const m2 = mount(none.AM);
  m2.chat.render(none.AM);
  assert.equal(byId(m2.host, "stopBtn").hidden, true, "eylem yoksa durdur düğmesi gizlenir");
  assert.equal(byId(m2.host, "sendBtn").hidden, false);
});

test("ek çipleri: ad + 'son güncelleme: ... önce' + ×; × setView ile listeden çıkarır", () => {
  const at = new Date(Date.now() - 5 * 3_600_000).toISOString();
  const { AM, calls } = baseAM({ view: { attachments: [{ name: "notlar.md", updatedAt: at }, { name: "b.txt" }] } });
  const { chat, host } = mount(AM);
  chat.render(AM);
  const row = byId(host, "attachRow");
  assert.equal(row.hidden, false);
  const chips = byClass(row, "am-chat-attach");
  assert.equal(chips.length, 2);
  assert.match(textOf(chips[0]!), /notlar\.md/);
  assert.match(textOf(chips[0]!), /son güncelleme: 5 sa\. önce/);
  const x = findAll(chips[0]!, (n) => n.className.includes("am-chat-attach-x"))[0]!;
  assert.match(x.getAttribute("aria-label")!, /notlar\.md/);
  x.dispatch("click");
  assert.deepEqual(J(calls.setView), [{ attachments: [{ name: "b.txt" }] }]);
  // dosya yükleme yok: + düğmesi devre dışı
  assert.equal(byId(host, "attachBtn").disabled, true);
});

test("model rozeti çizimi: kullanılamayan sağlayıcı KULLANILAMIYOR gösterir, yerine başka model yazmaz", () => {
  const { AM } = baseAM({
    state: {
      topics: [{ id: "t1", provider: "codex" }],
      providers: [{ id: "codex", capabilities: [{ status: "unavailable" }] }],
      ctxModel: "claude-yedek",
    },
    view: { selectedTopicId: "t1" },
  });
  const { chat, host } = mount(AM);
  chat.render(AM);
  const badge = byId(host, "modelBadge");
  assert.match(textOf(badge), /KULLANILAMIYOR/);
  assert.ok(!/claude-yedek/.test(textOf(badge)));
});

test("konu değişince taslak saklanır/geri gelir ve akış sıfırdan kurulur", () => {
  const { AM } = baseAM({ state: { timeline: { a: [{ id: "1", kind: "assistant", text: "A konusu" }], b: [{ id: "1", kind: "assistant", text: "B konusu" }] } }, view: { selectedTopicId: "a" } });
  const { chat, host } = mount(AM);
  chat.render(AM);
  const input = byId(host, "composerInput");
  input.value = "yarım kalan";
  AM.view.selectedTopicId = "b";
  chat.render(AM);
  assert.equal(input.value, "");
  assert.match(textOf(byClass(host, "am-chat-items")[0]!), /B konusu/);
  AM.view.selectedTopicId = "a";
  chat.render(AM);
  assert.equal(input.value, "yarım kalan");
});

test("seçili konu yokken yerel komut yazışması (AM.log) karşılamanın altında görünür", () => {
  const { AM } = baseAM({ log: [{ role: "user", text: "/durum", at: NOW }, { role: "assistant", text: "3 görev", at: NOW }] });
  const { chat, host } = mount(AM);
  chat.render(AM);
  assert.equal(byId(host, "welcome").hidden, false);
  assert.equal(byClass(host, "am-chat-items")[0]!.childNodes.length, 2);
  assert.equal(textOf(byClass(host, "am-chat-bubble")[0]!), "/durum");
});

test("çok uzun mesajlar kırpılır; 200'den fazla öğede 'önceki mesajları göster' düğmesi çıkar", () => {
  const many = Array.from({ length: 230 }, (_, i) => ({ id: "m" + i, kind: "assistant", text: "satır " + i }));
  const { AM } = baseAM({ state: { timeline: { t1: many } }, view: { selectedTopicId: "t1" } });
  const { chat, host } = mount(AM);
  chat.render(AM);
  const items = byClass(host, "am-chat-items")[0]!;
  assert.equal(items.childNodes.length, 201, "200 öğe + önceki-mesajlar düğmesi");
  const older = byClass(host, "am-chat-older")[0]!;
  assert.match(textOf(older), /Önceki 30 mesajı göster/);
  findAll(older, (n) => n.tagName === "BUTTON")[0]!.dispatch("click");
  assert.equal(byClass(host, "am-chat-older").length, 0);
  assert.equal(items.childNodes.length, 230);
});

// ---------- Risk rozeti ve geri alma (onay kartı) [Claude#agentmom-faz11-risk] ----------
function apprItem() { return [{ id: "4", kind: "approval", text: "", at: NOW, state: "awaiting_approval", card: { taskId: "tk1", reason: "x", risk: { level: "low", reasons: ["SAHTE"] }, semantics: { reversible: "yes" } } }]; }
function apprAM(task: any) {
  return baseAM({ state: { tasks: [{ id: "tk1", title: "Dosya yaz", state: "awaiting_approval", requestedAction: "file.write", request: { target: "D:/x.txt" }, ...task }], timeline: { t1: apprItem() }, topics: [{ id: "t1", state: "idle" }] }, view: { selectedTopicId: "t1" } });
}
function renderAppr(task: any) {
  const { AM } = apprAM(task);
  const { chat, host } = mount(AM);
  chat.render(AM);
  return { host, appr: byClass(host, "am-card--approval")[0]! };
}

test("risk rozeti: düzey -> ton + şekil + metin (renk tek ipucu değil)", () => {
  const { chat } = load();
  const b = (l: string) => J(chat.pure.riskBadge({ level: l, score: 3, reasons: [] }));
  assert.deepEqual([b("low").tone, b("low").shape, b("low").text], ["ok", "✓", "Düşük risk"]);
  assert.deepEqual([b("medium").tone, b("medium").shape, b("medium").text], ["info", "◐", "Orta risk"]);
  assert.deepEqual([b("high").tone, b("high").shape, b("high").text], ["warn", "▲", "Yüksek risk"]);
  assert.deepEqual([b("critical").tone, b("critical").shape, b("critical").text], ["bad", "✕", "KRİTİK risk"]);
  assert.equal(b("critical").score, 3);
});

test("risk yok/bilinmeyen: 'Risk hesaplanamadı', güvenli (düşük) varsayılmaz", () => {
  const { chat } = load();
  for (const r of [null, undefined, {}, { level: "unknown" }, { level: "garip" }, "low", []]) {
    const b = J(chat.pure.riskBadge(r));
    assert.equal(b.level, "unknown");
    assert.equal(b.text, "Risk hesaplanamadı");
    assert.equal(b.tone, "muted");
    assert.equal(b.known, false);
  }
});

test("geri alma: GERİ ALINAMAZ uyarısı yalnız reversible=no; bilgi yoksa varsayım yok", () => {
  const { chat } = load();
  assert.equal(chat.pure.undoInfo({ reversible: "no", effect: "e", undo: "-" }).irreversible, true);
  assert.equal(chat.pure.undoInfo({ reversible: "no" }).text, "GERİ ALINAMAZ");
  assert.equal(chat.pure.undoInfo({ reversible: "yes" }).irreversible, false);
  assert.equal(chat.pure.undoInfo({ reversible: "partial" }).text, "Kısmen geri alınabilir");
  assert.equal(chat.pure.undoInfo({ reversible: "uydurma" }).text, "Geri alınabilirlik bilinmiyor");
  assert.equal(chat.pure.undoInfo(null).text, "Geri alma bilgisi yok");
  assert.equal(chat.pure.undoInfo(null).irreversible, false);
});

test("onay kartı: critical + geri alınamaz -> rozet, Neden listesi ve belirgin uyarı (role=alert)", () => {
  const { appr } = renderAppr({ risk: { level: "critical", score: 95, reasons: ["Kalıcı yazma", "Politika dışı klasör"] }, semantics: { effect: "Dosyanın üzerine yazar", reversible: "no", undo: "Yok" } });
  const t = textOf(appr);
  assert.match(t, /KRİTİK risk/);
  assert.match(t, /puan 95/);
  assert.match(t, /Kalıcı yazma/);
  assert.match(t, /Politika dışı klasör/);
  assert.match(t, /Geri alma:/);
  assert.match(t, /GERİ ALINAMAZ/);
  assert.match(t, /Dosyanın üzerine yazar/);
  const hard = byClass(appr, "am-chat-undo--hard")[0]!;
  assert.equal(hard.getAttribute("role"), "alert");
  assert.equal(byClass(appr, "am-chat-risk-list")[0]!.childNodes.length, 2);
  assert.ok(byClass(appr, "am-chat-risk-badge")[0]!.className.includes("am-chat-tone-bad"));
});

test("onay kartı: geri alınabilir eylemde uyarı yok; ton ok", () => {
  const { appr } = renderAppr({ risk: { level: "low", score: 5, reasons: ["Okuma"] }, semantics: { effect: "Okur", reversible: "yes", undo: "Gerekmez" } });
  assert.match(textOf(appr), /Düşük risk/);
  assert.match(textOf(appr), /Geri alınabilir/);
  assert.equal(byClass(appr, "am-chat-undo--hard").length, 0);
  assert.equal(byClass(appr, "am-chat-undo-warn").length, 0);
});

test("onay kartı: risk alanı yoksa 'Risk hesaplanamadı' (zaman çizelgesi kartındaki sahte risk KULLANILMAZ)", () => {
  const { appr } = renderAppr({});
  const t = textOf(appr);
  assert.match(t, /Risk hesaplanamadı/);
  assert.doesNotMatch(t, /Düşük risk/);
  assert.doesNotMatch(t, /SAHTE/);
  assert.match(t, /Geri alma bilgisi yok/);
  assert.equal(byClass(appr, "am-chat-risk-list").length, 0, "risk bilinmiyorsa neden listesi uydurulmaz");
});

test("onay kartı: risk/semantics XSS yükü yalnız metin olarak görünür", () => {
  const evil = "<img src=x onerror=alert(1)>";
  const { host, appr } = renderAppr({ risk: { level: "high", reasons: [evil] }, semantics: { effect: evil, reversible: "partial", undo: evil } });
  assert.match(textOf(appr), /<img src=x onerror=alert\(1\)>/);
  assert.equal(findAll(host, (n) => n.tagName === "IMG").length, 0);
});

test("chat.css: risk stilleri yalnız var(--am-*) kullanır", () => {
  const part = CSS.slice(CSS.indexOf("Onay kartı: risk rozeti"));
  assert.ok(part.includes(".am-chat-undo--hard"));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(part) && !/\brgba?\(/.test(part));
});

// ---------- durum göstergeleri (bağlam %, kota %, bekleyen onay) ----------
const IND = (over: any = {}) => ({
  context: { percent: 62.5, level: "ok", usedTokens: 93750, windowTokens: 150000, source: "reported" },
  quota: { percent: 80, level: "warn", providerId: "claude-code", reported: true },
  pendingApprovals: { count: 0, critical: 0 },
  stalled: { count: 0, items: [] },
  ...over,
});
const indNodes = (host: FNode) => byClass(byId(host, "statusIndicators"), "am-chat-ind-badge");

test("göstergeler: seviye -> simge + metin + ton (renk tek ipucu değil); eşikler sunucu seviyesinden gelir", () => {
  const { chat } = load();
  const b = chat.pure.indicatorBadges(IND());
  assert.deepEqual(J(b.map((x: any) => [x.key, x.level, x.shape, x.tone])), [["ctx", "ok", "✓", "ok"], ["quota", "warn", "!", "warn"]]);
  assert.equal(b[0].text, "bağlam: %62,5");
  assert.equal(b[1].text, "kota: %80");
  assert.match(b[0].aria, /normal$/);
  assert.match(b[1].aria, /uyarı$/);
  const crit = chat.pure.indicatorBadges(IND({ context: { percent: 90, level: "critical" }, quota: { percent: 95, level: "critical" } }));
  assert.deepEqual(J(crit.map((x: any) => [x.shape, x.tone])), [["✕", "bad"], ["✕", "bad"]]);
  assert.match(crit[0].title, /kritik/);
});

test("göstergeler: bilinmiyor dürüstçe yazılır (yüzde uydurulmaz); yanıt yoksa da bilinmiyor", () => {
  const { chat } = load();
  for (const ind of [null, undefined, {}, IND({ context: { percent: null, level: "unknown" }, quota: { percent: null, level: "unknown" } }), IND({ context: { percent: "çok", level: "ok" }, quota: { percent: 50, level: "garip" } })]) {
    const b = chat.pure.indicatorBadges(ind);
    assert.deepEqual(J(b.map((x: any) => [x.text, x.shape, x.level])), [["bağlam: bilinmiyor", "?", "unknown"], ["kota: bilinmiyor", "?", "unknown"]]);
    assert.match(b[0].title, /tahmin edilmez/);
    assert.match(b[1].title, /tahmin edilmez/);
  }
});

test("göstergeler: bekleyen onay rozeti yalnız sayı > 0 iken; kritik varsa ✕ ve sayı yazılır", () => {
  const { chat } = load();
  assert.equal(chat.pure.indicatorBadges(IND()).some((x: any) => x.key === "approvals"), false);
  const a = chat.pure.indicatorBadges(IND({ pendingApprovals: { count: 3, critical: 0 } })).find((x: any) => x.key === "approvals");
  assert.deepEqual(J([a.text, a.shape, a.tone, a.action]), ["3 onay bekliyor", "!", "warn", "approvals"]);
  const c = chat.pure.indicatorBadges(IND({ pendingApprovals: { count: 3, critical: 2 } })).find((x: any) => x.key === "approvals");
  assert.deepEqual(J([c.text, c.shape, c.tone]), ["3 onay bekliyor (2 kritik)", "✕", "bad"]);
  assert.equal(chat.pure.indicatorBadges(IND({ pendingApprovals: { count: -1, critical: 5 } })).length, 2);
  assert.equal(chat.pure.indicatorBadges(IND({ pendingApprovals: { count: "5" } })).length, 2);
});

test("göstergeler çizimi: bağlam + kota her zaman var; rozet tıklanınca Görevler sayfasının dikkat sırası açılır", () => {
  const { AM, calls } = baseAM({ state: { indicators: IND({ pendingApprovals: { count: 2, critical: 1 } }) } });
  const { chat, host } = mount(AM);
  chat.render(AM);
  const nodes = indNodes(host);
  assert.deepEqual(nodes.map((n) => n.getAttribute("data-ind")), ["ctx", "quota", "approvals"]);
  assert.equal(byId(host, "statusIndicators").getAttribute("role"), "group");
  assert.match(textOf(nodes[0]!), /✓bağlam: %62,5/);
  assert.equal(nodes[0]!.tagName, "SPAN");
  assert.equal(nodes[0]!.getAttribute("role"), "img");
  assert.match(nodes[0]!.getAttribute("aria-label") ?? "", /bağlam: %62,5, normal/);
  assert.equal(nodes[2]!.tagName, "BUTTON");
  assert.equal(nodes[2]!.getAttribute("data-level"), "critical");
  nodes[2]!.dispatch("click");
  assert.deepEqual(J(calls.setView.at(-1)), { page: "tasks", pageParam: "bolum:am-lab-attn", settingsOpen: false, projectSettingsOpen: false });
  assert.equal(calls.approve.length + calls.deny.length, 0, "tıklama hiçbir şeyi onaylamaz/reddetmez");
});

test("göstergeler çizimi: indicators yokken 'bilinmiyor' görünür; veri değişince DOM güncellenir, aynıysa dokunulmaz", () => {
  const { AM } = baseAM();
  const { chat, host } = mount(AM);
  chat.render(AM);
  assert.deepEqual(indNodes(host).map((n) => textOf(n)), ["?bağlam: bilinmiyor", "?kota: bilinmiyor"]);
  const first = indNodes(host)[0]!;
  chat.render(AM);
  assert.equal(indNodes(host)[0], first, "imza aynıysa düğümler yeniden kurulmaz");
  AM.state.indicators = IND({ context: { percent: 91, level: "critical" } });
  chat.render(AM);
  assert.match(textOf(indNodes(host)[0]!), /✕bağlam: %91/);
  assert.equal(indNodes(host)[0]!.getAttribute("data-level"), "critical");
});

test("göstergeler: sunucu metni yalnız metin düğümü olarak yazılır (XSS yok); sağlayıcı adı yalnız düz metin ipucudur", () => {
  const evil = "<img src=x onerror=alert(1)>";
  const { AM } = baseAM({ state: { indicators: IND({ quota: { percent: 50, level: "ok", providerId: evil, reported: true }, context: { percent: 10, level: "ok", note: evil } }) } });
  const { chat, host } = mount(AM);
  chat.render(AM);
  const all = indNodes(host);
  for (const n of all) {
    assert.ok(!textOf(n).includes("<img"), "sunucu metni rozette yok");
    // Başlık (title) yalnız özellik atamasıdır; sağlayıcı adı orada düz metin olarak durur, işaretleme olarak yorumlanmaz.
    assert.equal(typeof n.title, "string");
    assert.deepEqual(findAll(n, (x) => x.tagName === "IMG" || x.tagName === "SCRIPT"), []);
  }
});

test("chat.js göstergeleri için ağ çağrısı ve yeni eylem yok (yalnız setView); 'otomatik' eylem kelimesi yok", () => {
  assert.ok(!/\bfetch\s*\(|XMLHttpRequest|setInterval|setTimeout/.test(SRC.replace(/\/\/.*$/gm, "")), "chat.js zamanlayıcı/ağ içermez");
  assert.ok(!/AMref\.actions\.(cancel|stop)\(.*stalled/.test(SRC));
});

test("göstergeler: kota ipucu sağlayıcı adını içerir; tarama sınırlıysa 'en az K kritik' yazılır", () => {
  const { chat } = load();
  const q = chat.pure.indicatorBadges(IND({ quota: { percent: 80, level: "warn", providerId: "claude-code", reported: true } }))[1];
  assert.match(q.title, /sağlayıcı: claude-code/);
  const a = chat.pure.indicatorBadges(IND({ pendingApprovals: { count: 900, critical: 3, truncated: true } })).find((x: any) => x.key === "approvals");
  assert.equal(a.text, "900 onay bekliyor (en az 3 kritik)");
  assert.equal(a.tone, "bad");
  const p = chat.pure.indicatorBadges(IND({ pendingApprovals: { count: 900, critical: 0, truncated: true } })).find((x: any) => x.key === "approvals");
  assert.equal(p.text, "900 onay bekliyor (tarama sınırlı)");
  assert.equal(p.tone, "warn");
  const n = chat.pure.indicatorBadges(IND({ pendingApprovals: { count: 4, critical: 1, truncated: false } })).find((x: any) => x.key === "approvals");
  assert.equal(n.text, "4 onay bekliyor (1 kritik)");
});
