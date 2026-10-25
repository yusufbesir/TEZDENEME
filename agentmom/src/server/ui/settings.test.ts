// Ayarlar penceresi (settings.js), Yardım (help.js) ve Proje ayarları/Kullanım (usage.js) testleri.
// Sahip: Sonnet [İP:AgentMom Faz 11, dilim 2]. yazan: [Claude#agentmom-faz11-ayarlar]
// Kaynaklar node:vm ile sahte window/document içinde yüklenir; ağ yok, tarayıcı yok, model çağrısı yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (f: string): string => readFileSync(join(dir, f), "utf8");
const SRC = { strings: read("strings.js"), icons: read("icons.js"), settings: read("settings.js"), help: read("help.js"), usage: read("usage.js") };
const CSS = read("settings.css");

// ---------- Sahte DOM: yalnız bu modüllerin kullandığı yüzey ----------
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
  scrollTop = 0;
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
  get isConnected(): boolean { let n: FNode | null = this; while (n) { if (n.isRoot) return true; n = n.parentNode; } return false; }
  get classList() { const self = this; return { add(c: string) { self.className = (self.className + " " + c).trim(); } }; }
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
  closest(sel: string): FNode | null { let n: FNode | null = this; while (n) { if (matchSel(n, sel)) return n; n = n.parentNode; } return null; }
  querySelectorAll(sel: string): FNode[] {
    const out: FNode[] = [];
    const parts = sel.split(",").map((s) => s.trim()).filter(Boolean);
    const walk = (n: FNode) => { for (const c of n.children) { if (parts.some((p) => matchSel(c, p))) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
}
function matchSel(n: FNode, sel: string): boolean {
  if (n.nodeType !== 1 || n.nodeName.startsWith("#")) return false;
  const m = /^([a-z0-9]*)((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/i.exec(sel);
  if (!m) return false;
  if (m[1] && n.tag !== m[1].toLowerCase()) return false;
  const classes = (m[2] ?? "").split(".").filter(Boolean);
  const have = n.className.split(/\s+/);
  if (!classes.every((c) => have.includes(c))) return false;
  const attrs = [...(m[3] ?? "").matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];
  return attrs.every((a) => {
    const name = a[1] as string;
    if (name === "tabindex") return n.tabIndex >= -1 && Object.hasOwn(n.attrs, "tabindex") || n.tabIndex === 0;
    const v = n.getAttribute(name);
    return v !== null && (a[2] === undefined || v === a[2]);
  });
}
class FDoc {
  activeElement: FNode | null = null;
  createElement(tag: string) { return new FNode(tag, this); }
  createElementNS(_ns: string, tag: string) { return new FNode(tag, this); }
  createDocumentFragment() { return new FNode("#frag", this); }
  createTextNode(t: string) { const n = new FNode("#text", this); n.nodeType = 3; n.own = t; return n; }
  createTreeWalker() { return { nextNode: () => null }; }
}

interface Ctx { win: any; doc: FDoc; host: FNode; calls: Array<[string, unknown]>; AM: any }

function load(files: Array<keyof typeof SRC>): Ctx {
  const doc = new FDoc();
  const sandbox: any = { document: doc, setTimeout: () => 1, clearTimeout: () => undefined };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(SRC[f], sandbox, { filename: f + ".js" });
  const host = doc.createElement("div");
  host.isRoot = true;
  const calls: Array<[string, unknown]> = [];
  const AM: any = {
    state: {
      connected: true, updatedAt: "2026-10-22T08:30:00Z",
      health: { status: "green", checks: [{ name: "db", ok: true, detail: "Bearer abcdefghijklmnop1234 ok" }] },
      tasks: [{ id: "t1", state: "awaiting_approval" }, { id: "t2", state: "running" }], debt: [{ x: 1 }],
      providers: [
        { id: "claude-code", displayName: "Claude Code", routeKind: "subscription", capabilities: [{ operation: "run", status: "verified" }] },
        { id: "gemini", displayName: "Gemini", routeKind: "subscription", capabilities: [{ operation: "run", status: "unavailable" }] }
      ],
      policy: { allowedActions: ["file.read", "shell.exec"], approvalRequiredActions: ["shell.exec"], allowedDirs: ["D:\\gizli-yol\\a", "D:\\b"], forbiddenDirs: ["D:\\yasak"], trustedRepos: [], allowedProviders: ["claude-code"], paidRoute: "none" },
      memory: { total: 12, valid: 10, stale: 2 },
      skills: [{ id: "s1", name: "Beceri A", state: "active", riskClass: "low" }],
      system: { version: "0.1.0", dirs: [{ label: "Kasa", path: "D:\\YusufII\\HAFIZAM1\\kasa", kind: "vault" }, { label: "Proje", path: "D:\\YusufII\\Projeler\\agentmom", kind: "work" }] },
      audit: [{ at: "2026-10-22T08:00:00Z", event: "task.approve", actor: "user", target: "t1 token=supersecretvalue" }],
      subsessions: [{ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", state: "idle", pinned: false, archived: false }],
      project: { name: "agentmom", root: "D:\\YusufII\\Projeler\\agentmom", trustedRoots: ["D:\\YusufII"], envAllowlist: ["PATH", "NODE_ENV", "OPENAI_API_KEY", "GH_TOKEN"] },
      docs: {}, usage: null
    },
    view: { settingsOpen: true, settingsSection: "genel", projectSettingsOpen: false, projectSettingsPage: "genel", theme: "dark" },
    actions: {
      setView(p: Record<string, unknown>) { calls.push(["setView", p]); Object.assign(AM.view, p); },
      closeSettings() { calls.push(["closeSettings", null]); AM.view.settingsOpen = false; AM.view.projectSettingsOpen = false; },
      openProjectSettings(p: string) { calls.push(["openProjectSettings", p]); },
      loadDoc(n: string) { calls.push(["loadDoc", n]); return Promise.resolve(); },
      loadUsage() { calls.push(["loadUsage", null]); return Promise.resolve(); },
      copyText(t: string) { calls.push(["copyText", t]); return Promise.resolve(true); },
      archiveSubsession(id: string, v: boolean) { calls.push(["archive", [id, v]]); return Promise.resolve(); }
    }
  };
  return { win: sandbox, doc, host, calls, AM };
}

const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function boot(): Ctx {
  const c = load(["strings", "icons", "settings", "help", "usage"]);
  c.win.AM_SETTINGS.init(c.AM, c.host);
  c.win.AM_HELP.init(c.AM, c.host);
  c.win.AM_USAGE.init(c.AM, c.host);
  return c;
}

function find(root: FNode, pred: (n: FNode) => boolean): FNode | null {
  for (const c of root.children) { if (pred(c)) return c; const r = find(c, pred); if (r) return r; }
  return null;
}
// Olay baloncuğu: hedeften köke doğru dinleyiciler çağrılır (stopPropagation destekli).
function fire(n: FNode, type: string, extra: Record<string, unknown>) {
  let stopped = false;
  const ev: any = { target: n, shiftKey: false, preventDefault() {}, stopPropagation() { stopped = true; }, ...extra };
  for (let cur: FNode | null = n; cur && !stopped; cur = cur.parentNode) for (const f of cur.listeners[type] ?? []) f(ev);
}
function click(n: FNode) { fire(n, "click", {}); }
function key(n: FNode, k: string) { fire(n, "keydown", { key: k }); }

// ================================================================ saf mantık: settings
test("settings.pure: Türkçe katlama uzunluğu korur ve harfleri eşler", () => {
  const { win } = load(["settings"]);
  const p = win.AM_SETTINGS.pure;
  assert.equal(p.fold("İŞLETİM Çğüö"), "isletim cguo");
  assert.equal(p.fold("Güvenlik ve izinler").length, "Güvenlik ve izinler".length);
  assert.equal(p.normalizeQuery("  Kasa   VE  "), "kasa ve");
});

test("settings.pure: matches boş sorguda her şeyi, çok sözcükte hepsini ister", () => {
  const { win } = load(["settings"]);
  const p = win.AM_SETTINGS.pure;
  assert.equal(p.matches("Güvenlik ve izinler", ""), true);
  assert.equal(p.matches("Güvenlik ve izinler", "guvenlik"), true);
  assert.equal(p.matches("Güvenlik ve izinler", "IZINLER guv"), true);
  assert.equal(p.matches("Güvenlik ve izinler", "yedek"), false);
});

test("settings.pure: gezinme modeli üç grup ve 16 bölüm taşır; silme bölümü yok", () => {
  const { win } = load(["settings"]);
  const p = win.AM_SETTINGS.pure;
  assert.equal(p.GROUPS.length, 3);
  const ids: string[] = plain(p.flattenNav(p.GROUPS));
  assert.equal(ids.length, 16);
  assert.deepEqual(ids.slice(0, 7), ["genel", "saglayicilar", "guvenlik", "bellek", "beceriler", "yedekleme", "gorunum"]);
  assert.ok(!ids.some((i) => /sil|delete|trash/.test(i)));
  assert.equal(p.isHelpSection("el-kitabi"), true);
  assert.equal(p.isHelpSection("genel"), false);
});

test("settings.pure: filterNav süzer, grup başlığı eşleşirse grubu tutar, eşleşme yoksa boş döner", () => {
  const { win } = load(["settings"]);
  const p = win.AM_SETTINGS.pure;
  const label: Record<string, string> = { yedekleme: "Yedekleme", genel: "Genel" };
  const textOf = (n: any) => (n.items ? n.labelKey : (label[n.id] ?? n.id) + " " + n.id);
  assert.equal(plain(p.filterNav(p.GROUPS, "", textOf)).length, 3);
  const y = plain<any[]>(p.filterNav(p.GROUPS, "yedek", textOf));
  assert.equal(y.length, 1);
  assert.deepEqual(y[0].items.map((i: any) => i.id), ["yedekleme"]);
  const g = plain<any[]>(p.filterNav(p.GROUPS, "computer", textOf));
  assert.equal(g[0].items.length, 3);
  assert.deepEqual(plain(p.filterNav(p.GROUPS, "zzzz", textOf)), []);
});

test("settings.pure: ok tuşları görünür bölümler arasında dolaşır ve uçlarda sarar", () => {
  const { win } = load(["settings"]);
  const m = win.AM_SETTINGS.pure.moveSelection;
  const ids = ["a", "b", "c"];
  assert.equal(m(ids, "a", "ArrowDown"), "b");
  assert.equal(m(ids, "c", "ArrowDown"), "a");
  assert.equal(m(ids, "a", "ArrowUp"), "c");
  assert.equal(m(ids, "b", "ArrowRight"), "c");
  assert.equal(m(ids, "b", "Home"), "a");
  assert.equal(m(ids, "b", "End"), "c");
  assert.equal(m(ids, "zzz", "ArrowDown"), "a");
  assert.equal(m([], "a", "ArrowDown"), null);
});

test("settings.pure: normSection takma adları eşler, bilinmeyeni genel yapar", () => {
  const { win } = load(["settings"]);
  const n = win.AM_SETTINGS.pure.normSection;
  assert.equal(n("general"), "genel");
  assert.equal(n("help"), "egitim");
  assert.equal(n("guvenlik-sinirlari"), "guvenlik-sinirlari");
  assert.equal(n("../../etc"), "genel");
  assert.equal(n(undefined), "genel");
});

test("settings.pure: policySummary yalnız sayı verir, yol sızdırmaz, onay bayrağını işaretler", () => {
  const { win } = load(["settings"]);
  const p = win.AM_SETTINGS.pure;
  const raw = { allowedActions: ["file.read", "shell.exec"], approvalRequiredActions: ["shell.exec", "policy.grant"], allowedDirs: ["D:\\gizli-yol\\x", "D:\\y"], forbiddenDirs: ["D:\\yasak"], trustedRepos: [], paidRoute: "none" };
  const s = plain<any>(p.policySummary(raw));
  assert.equal(s.allowedDirs, 2);
  assert.equal(s.forbiddenDirs, 1);
  assert.equal(s.trustedRepos, 0);
  assert.equal(s.allowedProviders, null);
  assert.equal(s.paidRoute, "none");
  assert.deepEqual(s.actions.map((a: any) => [a.name, a.approval]), [["file.read", false], ["shell.exec", true], ["policy.grant", true]]);
  assert.ok(!JSON.stringify(s).includes("gizli-yol"));
  assert.equal(p.policySummary(null), null);
});

test("settings.pure: memorySummary ve taskCounts", () => {
  const p = load(["settings"]).win.AM_SETTINGS.pure;
  assert.deepEqual(plain(p.memorySummary({ records: 5, valid: 4, stale: 1 })), { total: 5, valid: 4, stale: 1, updatedAt: null });
  assert.equal(p.memorySummary("x"), null);
  assert.deepEqual(plain(p.taskCounts([{ state: "running" }, { state: "failed" }, { state: "awaiting_approval" }, null])), { total: 4, waiting: 1, running: 1, failed: 1 });
});

test("settings.pure: durum tonu bilinmeyende muted, sağlayıcı düzeyi ve sayımlar", () => {
  const p = load(["settings"]).win.AM_SETTINGS.pure;
  assert.equal(p.stateTone("verified"), "ok");
  assert.equal(p.stateTone("unavailable"), "bad");
  assert.equal(p.stateTone("partial"), "warn");
  assert.equal(p.stateTone("constructor"), "muted");
  assert.equal(p.stateTone(undefined), "muted");
  assert.equal(p.providerLevel([]), "unknown");
  assert.equal(p.providerLevel([{ status: "unavailable" }]), "unavailable");
  assert.equal(p.providerLevel([{ status: "unsupported" }]), "unavailable");
  assert.equal(p.providerLevel([{ status: "verified" }, { status: "unavailable" }]), "partial");
  assert.equal(p.providerLevel([{ status: "verified" }, { status: "verified" }]), "ready");
  assert.equal(p.providerLevel([{ status: "unverified" }]), "unverified");
  const c = plain<any>(p.providerCounts([{ capabilities: [{ status: "verified" }, { status: "unavailable" }] }, { capabilities: [{ status: "verified" }] }]));
  assert.equal(c.verified, 2);
  assert.equal(c.unavailable, 1);
});

test("settings.pure: toplu arşiv yalnız boşta/bitmiş, sabitlenmemiş, arşivsiz alt oturumları seçer", () => {
  const p = load(["settings"]).win.AM_SETTINGS.pure;
  const subs = [
    { id: "a", state: "idle" }, { id: "b", state: "running" }, { id: "c", state: "done", pinned: true },
    { id: "d", state: "done", archived: true }, { id: "e", state: "done" }, { state: "idle" }
  ];
  assert.deepEqual(plain(p.archivable(subs)), ["a", "e"]);
  assert.deepEqual(plain(p.archivable(null)), []);
});

test("settings.pure: onay sonucu yalnız true ya da {confirmed:true} sayılır", () => {
  const p = load(["settings"]).win.AM_SETTINGS.pure;
  assert.equal(p.isConfirmed(true), true);
  assert.equal(p.isConfirmed({ confirmed: true }), true);
  assert.equal(p.isConfirmed("yes"), false);
  assert.equal(p.isConfirmed(1), false);
  assert.equal(p.isConfirmed(undefined), false);
});

test("settings.pure: scrubSecrets belirteç, Bearer ve anahtar benzeri değerleri gizler", () => {
  const p = load(["settings"]).win.AM_SETTINGS.pure;
  assert.ok(!p.scrubSecrets("Authorization: Bearer abc.DEF-123").includes("abc.DEF-123"));
  assert.ok(!p.scrubSecrets("Bearer abcdefghijklmnop").includes("abcdefghijklmnop"));
  assert.ok(!p.scrubSecrets("http://x/#token=ABCDEF1234567890ABCDEF").includes("ABCDEF1234567890"));
  assert.ok(!p.scrubSecrets("api_key=sk-1234567890abcdefghij").includes("1234567890"));
  assert.ok(!p.scrubSecrets("x " + "a".repeat(48)).includes("a".repeat(48)));
  assert.equal(p.scrubSecrets("D:\\YusufII\\Projeler\\agentmom"), "D:\\YusufII\\Projeler\\agentmom");
});

test("settings.pure: isSecretName anahtar/belirteç adlarını yakalar", () => {
  const p = load(["settings"]).win.AM_SETTINGS.pure;
  for (const n of ["OPENAI_API_KEY", "GH_TOKEN", "DB_PASSWORD", "AWS_SECRET", "SESSION_ID"]) assert.equal(p.isSecretName(n), true, n);
  for (const n of ["PATH", "NODE_ENV", "HOME"]) assert.equal(p.isSecretName(n), false, n);
});

test("settings.pure: splitDirs kasa/yedek klasörlerini ayırır, boş yolları atar", () => {
  const p = load(["settings"]).win.AM_SETTINGS.pure;
  const r = plain<any>(p.splitDirs([{ label: "K", path: "D:\\kasa", kind: "vault" }, { label: "P", path: "D:\\p", kind: "work" }, { label: "Y", path: "", kind: "backup" }, null]));
  assert.equal(r.files.length, 1);
  assert.equal(r.work.length, 1);
});

test("settings.pure: tarih biçimi geçersizde — verir; sectionSig veri değişince değişir, yoklamada sabit kalır", () => {
  const p = load(["settings"]).win.AM_SETTINGS.pure;
  assert.equal(p.fmtDateTime("bozuk"), "—");
  assert.match(p.fmtDateTime("2026-10-22T08:30:00Z"), /^\d{2}\.\d{2}\.2026 \d{2}:\d{2}$/);
  const st = { providers: [{ id: "a" }], updatedAt: "1" };
  const a = p.sectionSig("saglayicilar", st, { theme: "dark" });
  assert.equal(p.sectionSig("saglayicilar", { providers: [{ id: "a" }], updatedAt: "2" }, { theme: "dark" }), a, "updatedAt değişimi yeniden çizim istemez");
  assert.notEqual(p.sectionSig("saglayicilar", { providers: [{ id: "b" }] }, { theme: "dark" }), a);
  assert.notEqual(p.sectionSig("saglayicilar", st, { theme: "light" }), a);
  assert.notEqual(p.sectionSig("egitim", { docs: { egitim: { status: "ok", text: "abc" } } }, {}), p.sectionSig("egitim", { docs: { egitim: { status: "loading", text: "" } } }, {}));
});

// ================================================================ saf mantık: help
test("help.pure: findRanges büyük/küçük ve Türkçe harf duyarsız, çakışmasız bulur", () => {
  const h = load(["help"]).win.AM_HELP.pure;
  assert.deepEqual(plain(h.findRanges("İşletim el kitabı işletim", "isletim")), [[0, 7], [18, 25]]);
  assert.deepEqual(plain(h.findRanges("aaaa", "aa")), [[0, 2], [2, 4]]);
  assert.deepEqual(plain(h.findRanges("abc", "")), []);
  assert.deepEqual(plain(h.findRanges("abc", "zzz")), []);
});

test("help.pure: extractToc yalnız h2/h3 alır, kod çitini atlar, satır içi işareti soyar", () => {
  const h = load(["help"]).win.AM_HELP.pure;
  const md = ["# Başlık", "## 1. **Giriş** `kod`", "```", "## çit içi", "```", "### Alt [bağlantı](http://x)", "#### dördüncü", "## Son ##"].join("\n");
  const toc = plain<any[]>(h.extractToc(md));
  assert.deepEqual(toc.map((t) => [t.level, t.title]), [[2, "1. Giriş kod"], [3, "Alt bağlantı"], [2, "Son"]]);
  assert.deepEqual(plain(h.extractToc("")), []);
});

test("help.pure: matchHeadings başlıkları sırayla eşler, bulunamayanı -1 yapar", () => {
  const h = load(["help"]).win.AM_HELP.pure;
  assert.deepEqual(plain(h.matchHeadings(["1. Giriş", "Güvenlik", "Yok"], ["Belge", "1. Giriş", "Güvenlik"])), [1, 2, -1]);
  assert.deepEqual(plain(h.matchHeadings([], ["a"])), []);
});

test("help.pure: kısayol ve komut listeleri sözleşmedeki tüm girdileri taşır", () => {
  const h = load(["help"]).win.AM_HELP.pure;
  const keys = plain<any[]>(h.SHORTCUTS).map((s) => s.keys.join("+"));
  for (const k of ["Ctrl+K", "Ctrl+,", "Ctrl+B", "Ctrl+Shift+O", "Ctrl+.", "Enter", "Shift+Enter", "Esc", "F2", "/"]) assert.ok(keys.includes(k), k);
  const cmds = plain<any[]>(h.COMMANDS).map((c) => c.name);
  assert.deepEqual(cmds, ["/yardim", "/durum", "/gorevler", "/onay", "/borc", "/kararlar", "/beceriler", "/saglayicilar", "/yetenekler", "/yenile", "/temizle"]);
  assert.equal(h.docName("guvenlik-sinirlari"), "guvenlik");
  assert.equal(h.docName("kisayollar"), null);
  assert.equal(h.docName("__proto__"), null);
});

// ================================================================ saf mantık: usage
test("usage.pure: tr-TR sayı biçimleri (1,9 Mr, K/M, tam sayı noktalı)", () => {
  const u = load(["usage"]).win.AM_USAGE.pure;
  assert.equal(u.fmtInt(1234567), "1.234.567");
  assert.equal(u.fmtInt(null), "—");
  assert.equal(u.fmtCompact(1_900_000_000), "1,9 Mr");
  assert.equal(u.fmtCompact(12_345), "12,3 K");
  assert.equal(u.fmtCompact(152_300), "152 K");
  assert.equal(u.fmtCompact(2_000_000), "2 M");
  assert.equal(u.fmtCompact(999), "999");
  assert.equal(u.fmtCompact(999_999), "1 M");
  assert.equal(u.fmtCompact(undefined), "—");
  assert.equal(u.fmtCompact(0), "0");
});

test("usage.pure: yüzde biçimi %96, %9,5, <%1, veri yoksa —", () => {
  const u = load(["usage"]).win.AM_USAGE.pure;
  assert.equal(u.fmtPct(96.4), "%96");
  assert.equal(u.fmtPct(9.54), "%9,5");
  assert.equal(u.fmtPct(0.4), "<%1");
  assert.equal(u.fmtPct(0), "%0");
  assert.equal(u.fmtPct(null), "—");
  assert.equal(u.fmtPct(NaN), "—");
});

test("usage.pure: göreli zaman ve geçersiz tarih", () => {
  const u = load(["usage"]).win.AM_USAGE.pure;
  const now = Date.parse("2026-10-22T12:00:00Z");
  assert.equal(u.fmtAgo("2026-10-22T11:59:40Z", now), "az önce");
  assert.equal(u.fmtAgo("2026-10-22T11:30:00Z", now), "30 dk önce");
  assert.equal(u.fmtAgo("2026-10-22T09:00:00Z", now), "3 sa önce");
  assert.equal(u.fmtAgo("2026-10-20T12:00:00Z", now), "2 gün önce");
  assert.match(u.fmtAgo("2026-09-01T12:00:00Z", now), /^\d{2}\.\d{2}\.2026$/);
  assert.equal(u.fmtAgo(null, now), "—");
});

test("usage.pure: wClass yalnız am-w-0..100 sabit sınıfı üretir", () => {
  const u = load(["usage"]).win.AM_USAGE.pure;
  assert.equal(u.wClass(42.4), "am-w-42");
  assert.equal(u.wClass(250), "am-w-100");
  assert.equal(u.wClass(-5), "am-w-0");
  assert.equal(u.wClass(NaN), "am-w-0");
  assert.equal(u.wClass("x" as unknown as number), "am-w-0");
  for (let i = 0; i <= 100; i++) assert.ok(CSS.includes(".am-w-" + i + " { width: " + i + "%; }"), "am-w-" + i);
});

test("usage.pure: segmentPercents toplamı tam 100 yapar, küçük dilimi 1 tutar", () => {
  const u = load(["usage"]).win.AM_USAGE.pure;
  const a = plain<number[]>(u.segmentPercents([1, 1, 1]));
  assert.equal(a.reduce((x, y) => x + y, 0), 100);
  const b = plain<number[]>(u.segmentPercents([1000000, 1, 0, 5]));
  assert.equal(b.reduce((x, y) => x + y, 0), 100);
  assert.ok((b[1] as number) >= 1 && b[2] === 0 && (b[3] as number) >= 1);
  assert.deepEqual(plain(u.segmentPercents([0, 0])), [0, 0]);
  assert.deepEqual(plain(u.segmentPercents([null as unknown as number, 5])), [0, 100]);
});

test("usage.pure: modelFamily ve familyTotals (veri yoksa null, uydurma yok)", () => {
  const u = load(["usage"]).win.AM_USAGE.pure;
  assert.equal(u.modelFamily("claude-haiku-4"), "haiku");
  assert.equal(u.modelFamily("Claude-Opus-4"), "opus");
  assert.equal(u.modelFamily("gpt-x"), "other");
  assert.equal(u.modelFamily(null), "other");
  const t = plain<any>(u.familyTotals({
    topics: 3,
    tokens: { input: 100, output: 50, cacheWrite: null, cacheRead: 10 },
    byModel: [{ model: "claude-sonnet-4", input: 60, output: 30, cacheWrite: null, cacheRead: 5, topics: 2 }, { model: "claude-opus-4", input: 40, output: 20, cacheWrite: null, cacheRead: 5, topics: 1 }],
    topicsTable: []
  }));
  assert.equal(t.sonnet.input, 60);
  assert.equal(t.haiku.input, null);
  assert.equal(t.sonnet.cacheWrite, null);
  assert.equal(t.total.input, 100);
  assert.equal(t.total.cacheWrite, null);
  assert.equal(t.total.topics, 3);
  assert.equal(t.opus.topics, 1);
  assert.equal(t.haiku.topics, null);
});

test("usage.pure: sortTopics üç ölçüt, boş değer sonda, kararlı, kaynağı değiştirmez", () => {
  const u = load(["usage"]).win.AM_USAGE.pure;
  const rows = [
    { id: "a", sharePct: 10, tokens: 5, lastAt: "2026-10-01T00:00:00Z" },
    { id: "b", sharePct: null, tokens: 50, lastAt: null },
    { id: "c", sharePct: 60, tokens: 20, lastAt: "2026-10-20T00:00:00Z" },
    { id: "d", sharePct: 10, tokens: null, lastAt: "2026-10-10T00:00:00Z" }
  ];
  const ids = (k: string) => plain<any[]>(u.sortTopics(rows, k)).map((r) => r.id);
  assert.deepEqual(ids("share"), ["c", "a", "d", "b"]);
  assert.deepEqual(ids("tokens"), ["b", "c", "a", "d"]);
  assert.deepEqual(ids("recent"), ["c", "d", "a", "b"]);
  assert.deepEqual(rows.map((r) => r.id), ["a", "b", "c", "d"]);
  assert.deepEqual(plain(u.sortTopics(null, "share")), []);
});

test("usage.pure: uyarı çipi seçimi eşik kurallarına uyar", () => {
  const u = load(["usage"]).win.AM_USAGE.pure;
  const rows = [
    { title: "A", tokens: 900000, sharePct: 70, cacheHitPct: 96 },
    { title: "B", tokens: 300000, sharePct: 22, cacheHitPct: 12 },
    { title: "C", tokens: 1000, sharePct: 1, cacheHitPct: 5 },
    { title: "D", tokens: 80000, sharePct: 8, cacheHitPct: null },
    { title: "E", tokens: 50000, sharePct: 6, cacheHitPct: 30 }
  ];
  assert.deepEqual(plain<any[]>(u.topSpenders(rows)).map((r) => r.title), ["A", "B"]);
  assert.deepEqual(plain<any[]>(u.lowCache(rows)).map((r) => r.title), ["B", "E"]);
  assert.deepEqual(plain(u.topSpenders(undefined)), []);
});

test("usage.pure: usageStatus yükleniyor/hata/boş/tamam ayrımı (all-null token boş sayılır)", () => {
  const u = load(["usage"]).win.AM_USAGE.pure;
  assert.equal(u.usageStatus(undefined), "loading");
  assert.equal(u.usageStatus(null), "loading");
  assert.equal(u.usageStatus({ status: "loading" }), "loading");
  assert.equal(u.usageStatus({ status: "error", reason: "x" }), "error");
  assert.equal(u.usageStatus({ status: "ok", topics: 0, tokens: { input: null, output: null, cacheWrite: null, cacheRead: null }, codeChanges: { added: null, removed: null }, topicsTable: [] }), "empty");
  assert.equal(u.usageStatus({ status: "ok", topics: 2, tokens: null }), "ok");
  assert.equal(u.usageStatus({ status: "ok", topics: null, tokens: { input: 1, output: null, cacheWrite: null, cacheRead: null } }), "ok");
});

test("usage.pure: summaryText yalnız toplamları verir, konu adı yok, eksik değerde —", () => {
  const u = load(["usage"]).win.AM_USAGE.pure;
  const txt: string = u.summaryText({
    topics: 4, tokens: { input: 1_000_000, output: 900_000, cacheWrite: null, cacheRead: 0 }, cacheHitPct: 96.4,
    codeChanges: { added: 120, removed: 45 }, topicsTable: [{ title: "Gizli Konu Adı" }]
  });
  assert.ok(txt.includes("Konular: 4"));
  assert.ok(txt.includes("1,9 M (1.900.000)"));
  assert.ok(txt.includes("Önbelleğe yazma: —"));
  assert.ok(txt.includes("%96"));
  assert.ok(txt.includes("+120 −45"));
  assert.ok(!txt.includes("Gizli Konu"));
  assert.ok(u.summaryText(null).includes("Token: —"));
});

test("usage.pure: normPage takma adları, filterEnv değerleri ve anahtar adlarını ayıklar", () => {
  const u = load(["usage"]).win.AM_USAGE.pure;
  assert.equal(u.normPage("usage"), "kullanim");
  assert.equal(u.normPage("general"), "genel");
  assert.equal(u.normPage("debug"), "hata");
  assert.equal(u.normPage("<script>"), "genel");
  const e = plain<any>(u.filterEnv(["PATH", "NODE_ENV", "OPENAI_API_KEY", "GH_TOKEN", "bad name", "PATH", "1X"]));
  assert.deepEqual(e.shown, ["PATH", "NODE_ENV"]);
  assert.equal(e.hidden, 4);
  assert.deepEqual(plain(u.filterEnv(undefined)), { shown: [], hidden: 0 });
});

test("usage.pure: filterAudit olay/aktör/hedefte Türkçe duyarsız arar; policyCounts sayı verir", () => {
  const u = load(["usage"]).win.AM_USAGE.pure;
  const ev = [{ event: "Görev.onay", actor: "user", target: "t1" }, { event: "x", actor: "agent", target: "İş" }];
  assert.equal(plain<any[]>(u.filterAudit(ev, "gorev")).length, 1);
  assert.equal(plain<any[]>(u.filterAudit(ev, "is")).length, 1);
  assert.equal(plain<any[]>(u.filterAudit(ev, "")).length, 2);
  assert.deepEqual(plain(u.policyCounts({ allowedDirs: ["a"], forbiddenDirs: [], trustedRepos: 3, allowedActions: ["x", "y"], approvalRequiredActions: ["x"] })), { allowedDirs: 1, forbiddenDirs: 0, trustedRepos: 3, actions: 2, needApproval: 1 });
});

// ================================================================ güvenlik taraması (statik)
test("güvenlik: üç modülde yasak API/desen yok, CSS dış kaynak ve satır içi stil içermez", () => {
  const banned = [/innerHTML/, /outerHTML/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new Function/, /localStorage/, /sessionStorage/, /\bfetch\s*\(/, /document\.cookie/, /postMessage/, /srcdoc/, /\.style\b/, /setAttribute\(\s*["']style["']/, /\son[a-z]+\s*=/, /<script/i, /<style/i, /javascript:/i, /XMLHttpRequest/, /window\.confirm/, /\bprompt\s*\(/];
  for (const name of ["settings", "help", "usage"] as const) {
    for (const re of banned) assert.ok(!re.test(SRC[name]), name + ".js yasak desen: " + String(re));
    // setTimeout yalnız işlev ile
    assert.ok(!/setTimeout\(\s*["'`]/.test(SRC[name]), name + ".js dize setTimeout");
  }
  assert.ok(!/url\(|@import|https?:\/\//i.test(CSS));
});

test("güvenlik: arayüzde kalıcı silme / politika genişletme / belirteç isteme öğesi yok", () => {
  const all = SRC.settings + SRC.help + SRC.usage;
  assert.ok(!/(["'`])(Sil|Sil…|Kalıcı sil|Delete|Remove)\1/.test(all));
  assert.ok(!/type\s*=\s*["']password["']/.test(all) && !/\.type\s*=\s*["']password["']/.test(all));
  assert.ok(!/grantPolicy|expandPolicy|policy\.grant|setPolicy|deleteSubsession|emptyTrash/.test(all.replace(/"policy\.grant"/g, "")));
  assert.ok(!/AM\.actions\.(approve|deny|createSubsession|quitApp|logout)/.test(all));
});

// ================================================================ metin kaydı
test("metinler: kodda geçen her sabit T() anahtarı kayıtlıdır, kayıt çakışması yok", () => {
  const c = boot();
  const T = c.win.AM_T as (k: string, v?: unknown) => string;
  for (const name of ["settings", "help", "usage"] as const) {
    const keys = [...SRC[name].matchAll(/\bT\("([a-z0-9][a-z0-9.\-]*)"\s*[,)]/g)].map((m) => m[1] as string);
    assert.ok(keys.length >= 5, name);
    for (const k of keys) assert.ok(!T(k).startsWith("⟦"), "eksik anahtar: " + k);
  }
  // dinamik öneklerle kurulan anahtarlar
  for (const id of ["genel", "saglayicilar", "guvenlik", "bellek", "beceriler", "yedekleme", "gorunum", "internet", "sistem", "kasa", "gelistirici", "egitim", "kisayollar", "komutlar", "guvenlik-sinirlari", "el-kitabi"]) assert.ok(!T("settings.nav." + id).startsWith("⟦"), id);
  for (const id of ["egitim", "kisayollar", "komutlar", "guvenlik-sinirlari", "el-kitabi"]) { assert.ok(!T("help." + id + ".title").startsWith("⟦")); assert.ok(!T("help." + id + ".desc").startsWith("⟦")); }
  for (const l of ["ready", "partial", "unverified", "unknown"]) assert.ok(!T("settings.saglayicilar.level." + l).startsWith("⟦"), l);
  for (const l of ["ready", "partial", "unverified", "unavailable", "unknown"]) assert.ok(!T("usage.ortam.level." + l).startsWith("⟦"), l);
  for (const k of ["input", "output", "cacheWrite", "cacheRead", "haiku", "sonnet", "opus", "other"]) assert.ok(!T("usage.k." + k).startsWith("⟦"), k);
  for (const k of ["allowedDirs", "forbiddenDirs", "trustedRepos", "allowedProviders"]) { assert.ok(!T("settings.guvenlik." + k).startsWith("⟦")); assert.ok(!T("settings.guvenlik." + k + "Desc").startsWith("⟦")); }
  for (const k of ["allowedDirs", "forbiddenDirs", "trustedRepos", "actions", "needApproval"]) assert.ok(!T("usage.genel." + k).startsWith("⟦"), k);
  for (const k of ["cmdMake", "cmdCheck", "cmdRestore"]) { assert.ok(!T("settings.yedekleme." + k).startsWith("⟦")); assert.ok(!T("settings.yedekleme." + k + "Desc").startsWith("⟦")); }
  for (const n of ["yardim", "durum", "gorevler", "onay", "borc", "kararlar", "beceriler", "saglayicilar", "yetenekler", "yenile", "temizle"]) assert.ok(!T("help.cmd." + n).startsWith("⟦"), n);
  // Anahtar öneki: tüm kayıtlar kendi modül önekiyle
  for (const [name, pre] of [["settings", "settings."], ["help", "help."], ["usage", "usage."]] as const) {
    const m = /var TR = \{([\s\S]*?)\n  \};/.exec(SRC[name]);
    assert.ok(m);
    for (const k of [...(m![1] as string).matchAll(/^\s*"([^"]+)":/gm)].map((x) => x[1] as string)) assert.ok(k.startsWith(pre), k);
  }
});

// ================================================================ çizim (sahte DOM)
test("render: Ayarlar kapalıyken hiçbir şey çizmez; açılınca role=dialog ve aria-modal ile çizer", () => {
  const c = boot();
  c.AM.view.settingsOpen = false;
  c.win.AM_SETTINGS.render(c.AM);
  assert.equal(c.host.children.length, 0);
  c.AM.view.settingsOpen = true;
  c.win.AM_SETTINGS.render(c.AM);
  const overlay = c.host.children[0] as FNode;
  assert.equal(overlay.getAttribute("data-owner"), "settings");
  const dlg = find(overlay, (n) => n.getAttribute("role") === "dialog") as FNode;
  assert.equal(dlg.getAttribute("aria-modal"), "true");
  assert.ok(dlg.getAttribute("aria-labelledby"));
  assert.ok(find(overlay, (n) => n.tag === "input" && n.type === "search"), "arama kutusu");
  assert.equal(overlay.querySelectorAll(".am-set-nav-item").length, 16);
  assert.equal(overlay.querySelectorAll(".am-set-group").length, 3);
});

test("render: her bölüm hatasız çizilir (yardım belgeleri iskelet + loadDoc), hata kartı yok", () => {
  const c = boot();
  c.win.AM_SETTINGS.render(c.AM);
  const overlay = c.host.children[0] as FNode;
  for (const id of ["genel", "saglayicilar", "guvenlik", "bellek", "beceriler", "yedekleme", "gorunum", "internet", "sistem", "kasa", "gelistirici", "egitim", "kisayollar", "komutlar", "guvenlik-sinirlari", "el-kitabi"]) {
    c.AM.view.settingsSection = id;
    c.win.AM_SETTINGS.render(c.AM);
    const content = find(overlay, (n) => n.className === "am-set-content") as FNode;
    assert.equal(content.querySelectorAll(".am-set-errcard").length, 0, id + " hata kartı");
    assert.ok(content.querySelectorAll(".am-set-h").length === 1, id + " başlık");
  }
  const loaded = c.calls.filter((x) => x[0] === "loadDoc").map((x) => x[1]).sort();
  assert.deepEqual(loaded, ["egitim", "el-kitabi", "guvenlik"]);
});

test("render: Sağlayıcılar gerçek veriyi gösterir, KULLANILAMIYOR ve otomatik geçiş yok notu görünür", () => {
  const c = boot();
  c.AM.view.settingsSection = "saglayicilar";
  c.win.AM_SETTINGS.render(c.AM);
  const text = (c.host.children[0] as FNode).textContent;
  assert.ok(text.includes("Claude Code") && text.includes("Gemini"));
  assert.ok(text.includes("KULLANILAMIYOR"));
  assert.ok(text.includes("Otomatik geçiş yok"));
  assert.ok(text.includes("run: verified"));
});

test("render: Güvenlik ve izinler yalnız sayı gösterir, yol sızdırmaz, düğme/giriş içermez, onay notu var", () => {
  const c = boot();
  c.AM.view.settingsSection = "guvenlik";
  c.win.AM_SETTINGS.render(c.AM);
  const overlay = c.host.children[0] as FNode;
  const content = find(overlay, (n) => n.className === "am-set-content") as FNode;
  assert.ok(!content.textContent.includes("gizli-yol"));
  assert.ok(content.textContent.includes("Yusuf'un açık onayı olmadan politika değişmez"));
  assert.ok(content.textContent.includes("izin ister"));
  assert.equal(content.querySelectorAll("button").length, 0, "politika sayfasında düğme yok");
  assert.equal(content.querySelectorAll("input").length, 0);
});

test("render: Görünüm tema seçimi AM.actions.setView({theme}) çağırır; arayüz karmaşıklığı Basit | Gelişmiş seçimi", () => {
  const c = boot();
  c.AM.view.settingsSection = "gorunum";
  c.win.AM_SETTINGS.render(c.AM);
  const overlay = c.host.children[0] as FNode;
  const light = find(overlay, (n) => n.getAttribute("data-fkey") === "seg-light") as FNode;
  click(light);
  assert.deepEqual(plain(c.calls.filter((x) => x[0] === "setView" && (x[1] as any).theme).pop()), ["setView", { theme: "light" }]);
  assert.equal(find(overlay, (n) => n.getAttribute("role") === "switch"), null, "yoğunluk yer tutucusu kalktı");
  const simple = find(overlay, (n) => n.getAttribute("data-fkey") === "seg-simple") as FNode;
  const adv = find(overlay, (n) => n.getAttribute("data-fkey") === "seg-advanced") as FNode;
  assert.ok(overlay.textContent.includes("Arayüz karmaşıklığı"));
  assert.equal(adv.getAttribute("aria-checked"), "true", "varsayılan GELİŞMİŞ");
  assert.equal(simple.getAttribute("aria-checked"), "false");
  click(simple);
  assert.equal(simple.getAttribute("aria-checked"), "true");
  assert.deepEqual(plain(c.calls.filter((x) => x[0] === "setView" && (x[1] as any).complexity).pop()), ["setView", { complexity: "simple" }]);
  click(adv);
  assert.deepEqual(plain(c.calls.filter((x) => x[0] === "setView" && (x[1] as any).complexity).pop()), ["setView", { complexity: "advanced" }]);
  c.AM.view.complexity = "simple";
  c.win.AM_SETTINGS.render(c.AM);
  assert.equal((find(overlay, (n) => n.getAttribute("data-fkey") === "seg-simple") as FNode).getAttribute("aria-checked"), "true", "kayıtlı tercih seçili görünür");
});

test("render: Esc kapatır ve odak önceki öğeye döner; ok tuşları bölüm değiştirir", () => {
  const c = boot();
  const opener = c.doc.createElement("button");
  opener.isRoot = false;
  c.host.appendChild(opener);
  opener.focus();
  c.win.AM_SETTINGS.render(c.AM);
  const overlay = c.host.children.find((n) => n.getAttribute("data-owner") === "settings") as FNode;
  const first = overlay.querySelectorAll(".am-set-nav-item")[0] as FNode;
  key(first, "ArrowDown");
  assert.equal(c.AM.view.settingsSection, "saglayicilar");
  key(overlay.querySelectorAll(".am-set-nav-item")[1] as FNode, "End");
  assert.equal(c.AM.view.settingsSection, "el-kitabi");
  key(overlay, "Escape");
  assert.ok(c.calls.some((x) => x[0] === "closeSettings"));
  c.win.AM_SETTINGS.render(c.AM);
  assert.equal(c.host.children.find((n) => n.getAttribute("data-owner") === "settings"), undefined);
  assert.equal(c.doc.activeElement, opener, "odak açan öğeye döndü");
});

test("render: arama gezinmeyi ve satırları süzer; eşleşme yoksa uyarı gösterir", () => {
  const c = boot();
  c.win.AM_SETTINGS.render(c.AM);
  const overlay = c.host.children[0] as FNode;
  const input = find(overlay, (n) => n.tag === "input" && n.type === "search") as FNode;
  input.value = "yedek";
  for (const f of input.listeners["input"] ?? []) f({});
  const items = overlay.querySelectorAll(".am-set-nav-item");
  const ids = items.map((n) => n.getAttribute("data-id"));
  assert.ok(ids.includes("yedekleme") && ids.length < 16, "süzülmüş liste");
  assert.equal(c.AM.view.settingsSection, "yedekleme", "seçili bölüm süzmede yoksa ilk görünür bölüme geçer");
  input.value = "qqqqzzzz";
  for (const f of input.listeners["input"] ?? []) f({});
  assert.equal(overlay.querySelectorAll(".am-set-nav-item").length, 0);
  assert.ok(overlay.textContent.includes("Eşleşen bölüm ya da satır yok"));
  input.value = "";
  for (const f of input.listeners["input"] ?? []) f({});
  assert.equal(overlay.querySelectorAll(".am-set-nav-item").length, 16);
});

test("render: toplu arşiv satırı AM_DIALOG.confirm olmadan çalışmaz, onayla yalnız arşivler (silmez)", async () => {
  const c = boot();
  c.win.AM_SETTINGS.render(c.AM);
  const overlay = c.host.children[0] as FNode;
  const btn = find(overlay, (n) => n.getAttribute("data-fkey") === "archive-all") as FNode;
  assert.ok(btn, "Arşivle… düğmesi");
  assert.equal(btn.textContent, "Arşivle…");
  click(btn); // AM_DIALOG yok: işlem yapılmaz
  await Promise.resolve();
  assert.equal(c.calls.filter((x) => x[0] === "archive").length, 0);
  let asked: any = null;
  c.win.AM_DIALOG = { confirm(o: unknown) { asked = o; return Promise.resolve(true); } };
  click(btn);
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  assert.equal(asked.danger, true);
  assert.ok(asked.action && asked.target && asked.title);
  assert.deepEqual(plain(c.calls.filter((x) => x[0] === "archive")), [["archive", ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", true]]]);
  c.win.AM_DIALOG = { confirm() { return Promise.resolve(false); } };
  c.calls.length = 0;
  click(btn);
  await new Promise((r) => setImmediate(r));
  assert.equal(c.calls.filter((x) => x[0] === "archive").length, 0, "iptalde arşiv yok");
});

test("render: Sistem ve Geliştirici belirteç değerlerini göstermez", () => {
  const c = boot();
  c.AM.view.settingsSection = "gelistirici";
  c.win.AM_SETTINGS.render(c.AM);
  const t1 = (c.host.children[0] as FNode).textContent;
  assert.ok(t1.includes("task.approve"));
  assert.ok(!t1.includes("supersecretvalue"));
  c.AM.view.settingsSection = "sistem";
  c.win.AM_SETTINGS.render(c.AM);
  const t2 = (c.host.children[0] as FNode).textContent;
  assert.ok(!t2.includes("abcdefghijklmnop1234"));
  assert.ok(t2.includes("0.1.0") && t2.includes("D:\\YusufII\\Projeler\\agentmom"));
  assert.ok(!t2.includes("HAFIZAM1"), "kasa klasörü Sistem'de değil Kasa bölümünde");
  c.AM.view.settingsSection = "kasa";
  c.win.AM_SETTINGS.render(c.AM);
  assert.ok((c.host.children[0] as FNode).textContent.includes("HAFIZAM1"));
});

test("render: Yedekleme komutları kopyalanabilir, silme düğmesi yok", () => {
  const c = boot();
  c.AM.view.settingsSection = "yedekleme";
  c.win.AM_SETTINGS.render(c.AM);
  const overlay = c.host.children[0] as FNode;
  const text = overlay.textContent;
  assert.ok(text.includes("npm run yedek -- yedekle"));
  assert.ok(text.includes("geri-yukle"));
  const copy = find(overlay, (n) => n.getAttribute("data-fkey") === "copy-cmdMake") as FNode;
  click(copy);
  assert.deepEqual(plain(c.calls.filter((x) => x[0] === "copyText").pop()), ["copyText", "npm run yedek -- yedekle"]);
  assert.ok(!/\bSil\b/.test(text));
});

test("render: Proje ayarları kapalıyken çizmez; Kullanım yoksa iskelet + loadUsage, hata kartı ve boş kart", () => {
  const c = boot();
  c.win.AM_USAGE.render(c.AM);
  c.AM.view.settingsOpen = false;
  c.AM.view.projectSettingsOpen = true;
  c.AM.view.projectSettingsPage = "usage";
  c.win.AM_USAGE.render(c.AM);
  const overlay = c.host.children[0] as FNode;
  assert.equal(overlay.getAttribute("data-owner"), "project-settings");
  assert.equal(overlay.querySelectorAll(".am-set-nav-item").length, 5);
  assert.equal(c.calls.filter((x) => x[0] === "loadUsage").length, 1);
  assert.ok(overlay.querySelectorAll(".am-help-skel").length === 1, "iskelet");
  c.AM.state.usage = { status: "error", reason: "503 token=abcdef" };
  c.win.AM_USAGE.render(c.AM);
  assert.equal(overlay.querySelectorAll(".am-set-errcard").length, 1);
  assert.ok(!overlay.textContent.includes("abcdef"));
  c.AM.state.usage = { status: "ok", topics: 0, tokens: null, cacheHitPct: null, codeChanges: null, byModel: [], topicsTable: [] };
  c.win.AM_USAGE.render(c.AM);
  assert.ok(overlay.textContent.includes("Henüz kayıt yok"));
  assert.equal(c.calls.filter((x) => x[0] === "loadUsage").length, 1, "yükleme tekrarlanmadı");
});

test("render: Kullanım verisi tr-TR biçimiyle, tablolar th scope ile ve fiyat/ücret olmadan çizilir", () => {
  const c = boot();
  c.AM.view.settingsOpen = false;
  c.AM.view.projectSettingsOpen = true;
  c.AM.view.projectSettingsPage = "kullanim";
  c.AM.state.usage = {
    status: "ok", updatedAt: "2026-10-22T08:00:00Z", topics: 3,
    tokens: { input: 1_000_000_000, output: 900_000_000, cacheWrite: 1000, cacheRead: null }, cacheHitPct: 96.4, codeChanges: { added: 120, removed: 45 },
    byModel: [{ model: "claude-opus-4", input: 700, output: 300, cacheWrite: null, cacheRead: null, topics: 1 }],
    topicsTable: Array.from({ length: 12 }, (_, i) => ({ id: "t" + i, title: "Konu " + i, model: "claude-opus-4", lastAt: "2026-10-21T00:00:00Z", tokens: 100000 - i, cacheHitPct: i === 3 ? 10 : 90, sharePct: i === 0 ? 40 : 5 })),
    note: "costBasis=list; ücret yok"
  };
  c.win.AM_USAGE.render(c.AM);
  const overlay = c.host.children[0] as FNode;
  const text = overlay.textContent;
  assert.ok(text.includes("1,9 Mr"), "toplam token 1,9 Mr");
  assert.ok(text.includes("%96"));
  assert.ok(text.includes("+120") && text.includes("−45"));
  assert.ok(text.includes("Liste fiyatı bilgidir, ödeme yok"));
  assert.ok(!/[$€₺]/.test(text), "para birimi yok");
  assert.ok(text.includes("veri yok"), "eksik değerlerde veri yok");
  assert.ok(text.includes("Önbelleğe yazma") && text.includes("Önbellek okuma"));
  assert.ok(text.includes("En çok token harcayan konular") && text.includes("Önbellek isabeti düşük konular"));
  assert.ok(text.includes("2 tane daha göster"), "12 konudan 10'u gösterilir");
  for (const th of overlay.querySelectorAll("th")) assert.ok(th.getAttribute("scope"), "th scope");
  assert.ok(overlay.querySelectorAll("table").length >= 2);
  assert.ok(overlay.querySelectorAll("caption").length >= 2);
  const stack = find(overlay, (n) => n.className === "am-use-stack") as FNode;
  assert.equal(stack.getAttribute("role"), "img");
  assert.match(stack.getAttribute("aria-label") as string, /Girdi/);
  const widthClasses = overlay.querySelectorAll(".am-use-seg").map((n) => n.className.split(" ").find((x) => /^am-w-\d+$/.test(x)));
  assert.ok(widthClasses.length >= 2 && widthClasses.every(Boolean));
  const meters = overlay.querySelectorAll(".am-use-meter");
  assert.ok(meters.length === 10 && meters.every((m) => m.getAttribute("role") === "progressbar"));
  // N tane daha göster → hepsi
  click(find(overlay, (n) => n.getAttribute("data-fkey") === "usage-more") as FNode);
  assert.equal(overlay.querySelectorAll(".am-use-meter").length, 12);
  // kopyala: yalnız toplamlar
  click(find(overlay, (n) => n.getAttribute("data-fkey") === "usage-copy") as FNode);
  const copied = c.calls.filter((x) => x[0] === "copyText").pop()![1] as string;
  assert.ok(copied.includes("Token: 1,9 Mr") && !copied.includes("Konu 0"));
});

test("render: Proje ayarları Ortam sayfası değişken DEĞERİ ve anahtar adı göstermez; Esc kapatır", () => {
  const c = boot();
  c.AM.view.settingsOpen = false;
  c.AM.view.projectSettingsOpen = true;
  c.AM.view.projectSettingsPage = "ortam";
  c.win.AM_USAGE.render(c.AM);
  const overlay = c.host.children[0] as FNode;
  const text = overlay.textContent;
  assert.ok(text.includes("PATH") && text.includes("NODE_ENV"));
  assert.ok(!text.includes("OPENAI_API_KEY") && !text.includes("GH_TOKEN"));
  assert.ok(text.includes("2 değişken adı") || text.includes("ayıklandı"));
  assert.ok(text.includes("Otomatik geçiş yok"));
  assert.ok(text.includes("KULLANILAMIYOR"));
  key(overlay, "Escape");
  assert.deepEqual(plain(c.calls.filter((x) => x[0] === "setView").pop()), ["setView", { projectSettingsOpen: false }]);
});

test("render: Hata ayıklama denetim kaydını gösterir, belirteç değerini gizler ve arama süzer", () => {
  const c = boot();
  c.AM.view.settingsOpen = false;
  c.AM.view.projectSettingsOpen = true;
  c.AM.view.projectSettingsPage = "hata";
  c.AM.state.audit = [
    { at: "2026-10-22T08:00:00Z", event: "task.approve", actor: "user", target: "t1 token=supersecretvalue" },
    { at: "2026-10-22T07:00:00Z", event: "policy.read", actor: "agent", target: "x" }
  ];
  c.win.AM_USAGE.render(c.AM);
  const overlay = c.host.children[0] as FNode;
  assert.ok(overlay.textContent.includes("task.approve"));
  assert.ok(!overlay.textContent.includes("supersecretvalue"));
  const input = find(overlay, (n) => n.getAttribute("data-fkey") === "audit-search") as FNode;
  input.value = "policy";
  for (const f of input.listeners["input"] ?? []) f({});
  assert.ok(!overlay.textContent.includes("task.approve"));
  assert.ok(overlay.textContent.includes("policy.read"));
});

test("render: Yardım belgeleri AM_MD yoksa okunur hata verir, belge yüklenince AM_MD ile çizer; kendi markdown'ı yok", () => {
  const c = boot();
  c.AM.state.docs = { egitim: { status: "ok", text: "# T\n## Bir\nmetin" } };
  c.AM.view.settingsSection = "egitim";
  c.win.AM_SETTINGS.render(c.AM);
  const overlay = c.host.children[0] as FNode;
  assert.ok(overlay.querySelectorAll(".am-set-errcard").length === 1, "AM_MD yok -> hata kartı");
  assert.equal(c.calls.filter((x) => x[0] === "loadDoc").length, 0, "yüklü belge yeniden istenmedi");
  let received: any = null;
  c.win.AM_MD = { render(text: string, opts: unknown) { received = [text, opts]; const f = c.doc.createDocumentFragment(); const h = c.doc.createElement("h2"); h.textContent = "Bir"; f.appendChild(h); return f; } };
  c.AM.state.docs = { egitim: { status: "ok", text: "# T\n## Bir\nmetin!" } };
  c.win.AM_SETTINGS.render(c.AM);
  assert.equal(received[0], "# T\n## Bir\nmetin!");
  assert.equal(typeof received[1].onCopy, "function");
  assert.equal(overlay.querySelectorAll(".am-help-toc-item").length, 1);
  assert.ok(overlay.querySelectorAll("article").length === 1);
  // hata durumu: kart + yeniden dene
  c.AM.state.docs = { egitim: { status: "error", text: "", reason: "500" } };
  c.win.AM_SETTINGS.render(c.AM);
  assert.ok(overlay.querySelectorAll(".am-set-errcard").length === 1);
  const retry = find(overlay, (n) => n.getAttribute("data-fkey") === "help-retry") as FNode;
  c.calls.length = 0;
  click(retry);
  assert.deepEqual(plain(c.calls.filter((x) => x[0] === "loadDoc")), [["loadDoc", "egitim"]]);
});

test("render: modüller yüklenirken DOM'a dokunmaz", () => {
  const doc = new FDoc();
  let touched = 0;
  const guard = new Proxy(doc, { get(t, p) { if (typeof p === "string" && p.startsWith("create")) touched++; return (t as any)[p]; } });
  const sandbox: any = { document: guard, setTimeout: () => 1, clearTimeout: () => undefined };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ["strings", "icons", "settings", "help", "usage"] as const) vm.runInContext(SRC[f], sandbox);
  assert.equal(touched, 0);
  for (const g of ["AM_SETTINGS", "AM_HELP", "AM_USAGE"]) {
    assert.equal(typeof sandbox[g].init, "function");
    assert.equal(typeof sandbox[g].render, "function");
    assert.ok(sandbox[g].pure);
  }
});

// ================================================================ Yedekleme durumu (kullanım tabanlı denetimli yedek)
function bkState(over: Record<string, unknown> = {}) {
  return {
    lastBackup: { at: "2026-10-22T08:00:00Z", dir: "D:\\YusufII\\yedekler\\yedek-20261022-0800", reason: "idle" },
    ageHours: 5.4, changesSince: 7,
    lastVerify: { at: "2026-10-22T08:01:00Z", ok: true, problems: [] },
    lastDecision: { at: "2026-10-22T11:00:00Z", action: "skip", code: "few_changes", reason: "yalnız 7 değişiklik var (eşik 20)" },
    warnings: [], config: { minChanges: 20, idleMinutes: 15, staleDays: 3 }, ...over,
  };
}
function bkOpen(backup: unknown) {
  const c = boot();
  c.AM.state.backup = backup;
  c.AM.view.settingsSection = "yedekleme";
  c.win.AM_SETTINGS.render(c.AM);
  return { c, overlay: c.host.children[0] as FNode };
}
const runBtn = (overlay: FNode) => find(overlay, (n) => n.getAttribute("data-fkey") === "run-backup") as FNode;

test("yedekleme.pure: 'N saat önce', kural özeti, klasör adı, uyarı başlıkları", () => {
  const { win } = load(["strings", "icons", "settings"]);
  const p = win.AM_SETTINGS.pure;
  assert.equal(p.backupAgoText(5.9), "5 saat önce");
  assert.equal(p.backupAgoText(0.2), "1 saatten kısa süre önce");
  assert.equal(p.backupAgoText(100), "4 gün önce");
  assert.equal(p.backupAgoText(null), "");
  assert.equal(p.backupRuleText({ minChanges: 20, idleMinutes: 15 }), "20 değişiklik ve 15 dk sakinlik");
  assert.equal(p.backupRuleText({}), "");
  assert.equal(p.backupDirName("D:\\a\\yedek-9"), "yedek-9");
  assert.equal(p.backupDecisionLabel("backup"), "Yedek alındı");
  assert.equal(p.backupDecisionLabel("skip"), "Yedek atlandı");
  const w = plain<any[]>(p.backupWarnings({ warnings: [{ code: "backup_failed", text: "a" }, { code: "verify_failed", text: "b" }, { code: "stale_with_activity", text: "c" }, { code: "scheduler_error", text: "d" }, null] }));
  assert.deepEqual(w.map((x) => x.title), ["Yedek başarısız", "Yedek doğrulaması başarısız", "Yedek eski, değişiklik var", "Zamanlayıcı hatası"]);
  assert.deepEqual(plain(p.backupWarnings(null)), []);
});

test("yedekleme: durum, kural özeti ve kullanıma göre alınır açıklaması görünür; Eski yedekleri silme notu kalır", () => {
  const { overlay } = bkOpen(bkState());
  const text = overlay.textContent;
  for (const s of ["5 saat önce", "klasör: yedek-20261022-0800", "Geçti", "7 değişiklik", "Yedek atlandı: yalnız 7 değişiklik var (eşik 20)", "20 değişiklik ve 15 dk sakinlik",
    "Yedek sabit saatte değil, kullanıma göre alınır: değişiklik olduysa ve kullanım sakinleştiğinde ya da uygulama kapanırken. Hiç değişiklik yoksa yedek alınmaz. Her karar denetim kaydına yazılır.",
    "Geri Dönüşüm Kutusu", "npm run yedek -- yedekle"]) assert.ok(text.includes(s), s);
  assert.ok(!text.includes("D:\\YusufII\\yedekler"), "tam yol yok");
  assert.ok(!/\bSil\b/.test(text));
});

test("yedekleme: uyarılar okunur kart (role=status, başlık + metin); doğrulama KALDI sorunları listeler", () => {
  const { overlay } = bkOpen(bkState({
    warnings: [{ code: "backup_failed", text: "disk dolu" }, { code: "stale_with_activity", text: "Son yedek 80 saat önce" }],
    lastVerify: { at: "2026-10-22T08:01:00Z", ok: false, problems: ["özet uyuşmuyor", "şema eksik"] },
  }));
  const warns = overlay.querySelectorAll(".am-set-bkwarn");
  assert.equal(warns.length, 2);
  for (const w of warns) assert.equal(w.getAttribute("role"), "status");
  assert.ok(warns[0]!.textContent.includes("Yedek başarısız: disk dolu"));
  assert.ok(warns[1]!.textContent.includes("Yedek eski, değişiklik var"));
  assert.ok(overlay.textContent.includes("KALDI") && overlay.textContent.includes("özet uyuşmuyor") && overlay.textContent.includes("şema eksik"));
  assert.equal(overlay.querySelectorAll('[role="alert"]').length, 0);
});

test("yedekleme: backup null ise 'Yedek durumu alınamadı' notu; komutlar ve düğme yine var", () => {
  const { overlay } = bkOpen(null);
  const t = overlay.textContent;
  assert.ok(t.includes("Yedek durumu alınamadı"));
  const note = overlay.querySelectorAll(".am-set-note").find((n) => n.textContent.includes("alınamadı")) as FNode;
  assert.equal(note.getAttribute("role"), "status");
  assert.ok(runBtn(overlay), "düğme var");
  assert.ok(t.includes("npm run yedek -- yedekle"));
});

test("yedekleme: uyarı metnindeki XSS yükü yalnız metin olarak kalır", () => {
  const payload = "<img src=x onerror=alert(1)><script>alert(2)</script>";
  const { overlay } = bkOpen(bkState({ warnings: [{ code: "backup_failed", text: payload }], lastDecision: { at: "2026-10-22T11:00:00Z", action: "backup", code: "x", reason: payload } }));
  assert.ok(overlay.textContent.includes(payload));
  assert.equal(overlay.querySelectorAll("img").length + overlay.querySelectorAll("script").length, 0);
  const code = SRC.settings.replace(/\/\/.*$/gm, "");
  assert.ok(!/\.innerHTML|outerHTML|insertAdjacentHTML|localStorage|fetch\(/.test(code), "yasak API yok");
});

test("yedekleme: 'Şimdi yedek al' AM.actions.runBackup'ı çağırır; çalışırken düğme devre dışı, ikinci tıklama yok sayılır", async () => {
  const { c, overlay } = bkOpen(bkState());
  let resolve!: () => void;
  let runs = 0;
  c.AM.actions.runBackup = () => { runs += 1; return new Promise<void>((r) => { resolve = r; }); };
  const first = runBtn(overlay);
  assert.equal(first.disabled, false);
  assert.equal(first.textContent, "Şimdi yedek al");
  click(first);
  assert.equal(runs, 1);
  const busy = runBtn(c.host.children[0] as FNode);
  assert.equal(busy.disabled, true, "çalışırken devre dışı");
  assert.equal(busy.getAttribute("aria-busy"), "true");
  click(first);
  click(busy);
  assert.equal(runs, 1, "ikinci tıklama yok sayıldı");
  resolve();
  await new Promise((r) => setImmediate(r));
  const after = runBtn(c.host.children[0] as FNode);
  assert.equal(after.disabled, false, "bitince yeniden etkin");
  click(after);
  assert.equal(runs, 2, "bitince tekrar çalışabilir");
});

test("yedekleme: runBackup reddedilirse (hata) düğme takılı kalmaz; eylem yoksa duyuru yapılır", async () => {
  const { c, overlay } = bkOpen(bkState());
  c.AM.actions.runBackup = () => Promise.reject(new Error("x"));
  click(runBtn(overlay));
  await new Promise((r) => setImmediate(r));
  assert.equal(runBtn(c.host.children[0] as FNode).disabled, false);
  delete c.AM.actions.runBackup;
  click(runBtn(c.host.children[0] as FNode));
  assert.equal(runBtn(c.host.children[0] as FNode).disabled, false, "eylem yoksa meşgul olmaz");
});

test("yedekleme: backup durumu değişince bölüm yeniden çizilir (sectionSig)", () => {
  const { win } = load(["strings", "settings"]);
  const p = win.AM_SETTINGS.pure;
  const a = p.sectionSig("yedekleme", { backup: null }, {});
  const b = p.sectionSig("yedekleme", { backup: { changesSince: 3 } }, {});
  assert.notEqual(a, b);
});

test("yedekleme: yeni anahtarlar eksiksiz ve settings. önekli", () => {
  const { win } = load(["strings", "icons", "settings"]);
  const T = (k: string) => win.AM_T(k) as string;
  for (const k of ["statusBlock", "unavailableTitle", "unavailableHint", "policy", "lastBackup", "noBackup", "folder", "verify", "verifyOk", "verifyFail", "noVerify", "changes", "changesN", "decision", "noDecision", "decTaken", "decSkipped", "rule", "ruleText", "runRow", "runDesc", "runBtn", "runBusy", "runNoAction", "ago.under1", "ago.hours", "ago.days", "w.backup_failed", "w.verify_failed", "w.stale_with_activity", "w.scheduler_error"])
    assert.ok(!T("settings.yedekleme." + k).startsWith("⟦"), k);
  assert.ok(CSS.includes(".am-set-bkwarn") && !/url\(|@import/.test(CSS));
});

// ================================================================ İnternet erişimi (D8c)
function netCtx(setup?: (c: Ctx) => void): Ctx {
  const c = boot();
  c.AM.state.data = {};
  c.AM.actions.loadData = (n: string) => { c.calls.push(["loadData", n]); return Promise.resolve(); };
  c.AM.actions.netDomainCheck = (raw: unknown) => (/^(\d+\.){3}\d+$|^localhost$/.test(String(raw).trim()) ? { ok: false, message: "Bu ad kabul edilmez" } : { ok: true, value: String(raw).trim().toLowerCase() });
  c.AM.actions.netSettingsSave = (f: unknown) => { c.calls.push(["netSettingsSave", plain(f)]); return Promise.resolve({ ok: true }); };
  setup?.(c);
  c.AM.view.settingsSection = "internet";
  c.win.AM_SETTINGS.render(c.AM);
  return c;
}
const netOverlay = (c: Ctx): FNode => c.host.children[0] as FNode;
const fk = (c: Ctx, k: string): FNode | undefined => netOverlay(c).querySelectorAll(`[data-fkey="${k}"]`)[0];
const delButtons = (c: Ctx): FNode[] => netOverlay(c).querySelectorAll("button").filter((b) => (b.getAttribute("data-fkey") ?? "").startsWith("net-del-"));
const netText = (c: Ctx): string => netOverlay(c).textContent;
const srv = (c: Ctx, s: Record<string, unknown>): void => { c.AM.state.data.netSettings = { status: "ok", value: { settings: s } }; };
const typeDomain = (c: Ctx, v: string): void => { const i = fk(c, "net-input") as FNode; i.value = v; for (const f of i.listeners["input"] ?? []) f({}); };
const rerender = (c: Ctx): void => c.win.AM_SETTINGS.render(c.AM);
const saves = (c: Ctx): unknown[] => c.calls.filter((x) => x[0] === "netSettingsSave").map((x) => x[1]);

test("internet: bölüm gezinmede var; VARSAYILAN KAPALI görünür; açıklama ve nasıl açılır metni yazılı; ayar ve getirme listesi bir kez istenir", () => {
  const c = netCtx();
  assert.ok(netOverlay(c).querySelectorAll(".am-set-nav-item").some((n) => n.textContent.includes("İnternet erişimi")));
  const t = netText(c);
  assert.ok(t.includes("Kapalı"), "durum rozeti Kapalı");
  assert.ok(t.includes("Kapalıyken uygulama internete HİÇ çıkmaz. Açıkken yalnız aşağıdaki alan adlarına, kullanıcı isteğiyle, ücretsiz kamuya açık sayfaları GET ile getirir; içerik güvenilmez veri sayılır."));
  assert.ok(t.includes("Etkinleştirmek için anahtarı açın, en az bir alan adı ekleyin ve Kaydet'e basın."));
  assert.equal(fk(c, "net-enable")!.getAttribute("aria-checked"), "false");
  assert.equal(fk(c, "net-peruse")!.getAttribute("aria-checked"), "true", "her kullanımda onay varsayılan açık");
  assert.ok(t.includes("docs.python.org") && t.includes("*.wikipedia.org"), "ipucu örnekleri");
  rerender(c); rerender(c);
  assert.deepEqual(c.calls.filter((x) => x[0] === "loadData").map((x) => x[1]), ["netSettings", "netFetches"]);
  assert.doesNotMatch(t, /⟦/);
});

test("internet: sunucu ayarı gösterilir (açık rozeti, alan adları, onay anahtarı); yükleme ve hata dürüst", () => {
  const c = netCtx((x) => srv(x, { enabled: true, allowedDomains: ["docs.python.org", "*.wikipedia.org"], perUseApproval: false }));
  const t = netText(c);
  assert.ok(t.includes("Açık"));
  assert.ok(t.includes("docs.python.org") && t.includes("*.wikipedia.org"));
  assert.equal(fk(c, "net-enable")!.getAttribute("aria-checked"), "true");
  assert.equal(fk(c, "net-peruse")!.getAttribute("aria-checked"), "false");
  assert.ok(t.includes("açık onaylı kapsam"), "onayı kapatma uyarısı");
  const l = netCtx((x) => { x.AM.state.data.netSettings = { status: "loading", value: null }; });
  assert.ok(netText(l).includes("Ayarlar yükleniyor") && netText(l).includes("Kapalı"));
  const e = netCtx((x) => { x.AM.state.data.netSettings = { status: "error", value: null, reason: "500: hata" }; });
  assert.ok(netText(e).includes("Ayarlar sunucudan okunamadı (500: hata); internet kapalı sayılır."));
});

test("internet: alan adı ekle/kaldır; geçersiz ad (IP, localhost) reddedilir ve eklenmez; 51. ad engellenir; Enter ile eklenir", () => {
  const c = netCtx();
  typeDomain(c, "10.0.0.1");
  click(fk(c, "net-add") as FNode);
  assert.ok(netText(c).includes("Bu ad kabul edilmez"));
  assert.ok(netText(c).includes("Henüz izinli alan adı yok."));
  typeDomain(c, "");
  click(fk(c, "net-add") as FNode);
  assert.ok(netText(c).includes("Önce bir alan adı yazın."));
  typeDomain(c, "Docs.Python.org");
  key(fk(c, "net-input") as FNode, "Enter");
  assert.ok(netText(c).includes("docs.python.org") && !netText(c).includes("Henüz izinli alan adı yok."));
  typeDomain(c, "docs.python.org");
  click(fk(c, "net-add") as FNode);
  assert.equal(delButtons(c).length, 1, "yinelenen eklenmez");
  click(fk(c, "net-del-0") as FNode);
  assert.ok(netText(c).includes("Henüz izinli alan adı yok."));
  for (let i = 0; i < 50; i += 1) { typeDomain(c, `h${i}.example.net`); click(fk(c, "net-add") as FNode); }
  assert.equal(delButtons(c).length, 50);
  typeDomain(c, "fazla.example.net");
  click(fk(c, "net-add") as FNode);
  assert.ok(netText(c).includes("En çok 50 alan adı eklenebilir."));
  assert.equal(delButtons(c).length, 50);
});

test("internet: boş alan adı listesiyle açma engelli (Kaydet pasif, çağrı yok); alan adı eklenince Kaydet doğru gövdeyle eylemi çağırır", async () => {
  const c = netCtx((x) => srv(x, { enabled: false, allowedDomains: [], perUseApproval: true }));
  click(fk(c, "net-enable") as FNode);
  assert.equal(fk(c, "net-enable")!.getAttribute("aria-checked"), "true");
  const save = fk(c, "net-save") as FNode;
  assert.equal(save.disabled, true);
  assert.ok(netText(c).includes("en az bir izinli alan adı ekleyin"));
  click(save);
  assert.equal(saves(c).length, 0);
  typeDomain(c, "docs.python.org");
  click(fk(c, "net-add") as FNode);
  assert.equal((fk(c, "net-save") as FNode).disabled, false);
  click(fk(c, "net-peruse") as FNode);
  click(fk(c, "net-save") as FNode);
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(saves(c), [{ enabled: true, allowedDomains: ["docs.python.org"], perUseApproval: false }]);
});

test("internet: kaydet sürerken ikinci tıklama yok sayılır; kapatma (boş liste) kaydedilebilir; sonuç iletisi görünür", async () => {
  let release: () => void = () => undefined;
  const c = netCtx((x) => {
    srv(x, { enabled: true, allowedDomains: ["docs.python.org"], perUseApproval: true });
    x.AM.actions.netSettingsSave = (f: unknown) => { x.calls.push(["netSettingsSave", plain(f)]); return new Promise((r) => { release = () => r({ ok: true }); }); };
  });
  click(fk(c, "net-enable") as FNode);
  click(fk(c, "net-save") as FNode);
  click(fk(c, "net-save") as FNode);
  assert.equal(saves(c).length, 1, "çift gönderim yok");
  assert.equal((fk(c, "net-save") as FNode).disabled, true);
  assert.equal((saves(c)[0] as { enabled: boolean }).enabled, false);
  release();
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal((fk(c, "net-save") as FNode).disabled, false);
  c.AM.state.data.netSettingsSave = { status: "error", value: null, reason: "Ayarlar sunucu tarafından kabul edilmedi: x" };
  rerender(c);
  assert.ok(netText(c).includes("Ayarlar sunucu tarafından kabul edilmedi: x"));
  c.AM.state.data.netSettingsSave = { status: "ok", value: null };
  rerender(c);
  assert.ok(netText(c).includes("Ayarlar kaydedildi."));
});

test("internet: getirme tablosu yalnız zaman/alan adı/durum/bayt/sonuç gösterir; yol, özet ve içerik YOK; bozuk ad maskelenir", () => {
  const c = netCtx((x) => {
    srv(x, { enabled: true, allowedDomains: ["docs.python.org"], perUseApproval: true });
    x.AM.state.data.netFetches = { status: "ok", value: { fetches: [
      { id: "1", ts: "2026-10-22T08:00:00Z", host: "docs.python.org", pathSha256: "a".repeat(64), finalHost: "docs.python.org", status: 200, contentType: "text/html", bytes: 2048, sha256: "b".repeat(64), outcome: "fetched", approvedBy: "user", purpose: "gizli amaç metni /yol/sayfa?q=1" },
      { id: "2", ts: "2026-10-22T09:00:00Z", host: "<img src=x onerror=1>.evil", status: 403, bytes: 0, outcome: "domain_not_allowed" },
    ] } };
  });
  const t = netText(c);
  for (const s of ["docs.python.org", "200", "2048", "fetched", "403", "domain_not_allowed", "Alan adı", "Bayt", "Sonuç", "(geçersiz ad)"]) assert.ok(t.includes(s), s);
  for (const s of ["a".repeat(64), "b".repeat(64), "/yol/sayfa", "text/html", "gizli amaç", "<img"]) assert.ok(!t.includes(s), "gösterilmemeli: " + s.slice(0, 12));
  assert.ok(t.includes("adres yolu ve içerik gösterilmez"));
  const empty = netCtx((x) => { x.AM.state.data.netFetches = { status: "ok", value: { fetches: [] } }; });
  assert.ok(netText(empty).includes("Henüz getirme yok."));
  const err = netCtx((x) => { x.AM.state.data.netFetches = { status: "error", value: null, reason: "500" }; });
  assert.ok(netText(err).includes("Getirme kaydı okunamadı (500)."));
});

test("internet: kaynak innerHTML/localStorage/fetch içermez; stil yalnız var(--am-*)", () => {
  const src = read("settings.js");
  for (const re of [/innerHTML/, /localStorage/, /\bfetch\s*\(/, /XMLHttpRequest/]) assert.doesNotMatch(src, re);
  const css = CSS.slice(CSS.indexOf("D8c: İnternet erişimi"));
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\s*\(|url\s*\(/);
});
