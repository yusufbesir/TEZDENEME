// D9 testleri için ortak ortam (karar laboratuvarı, sistem analitiği, dikkat sırası, yetenekler menüsü). Test dosyası DEĞİLDİR; yalnız lab.test.ts ve capabilities.test.ts içe aktarır.
// Sahip: Claude [İP:AgentMom Faz 11, D9]. yazan: [Claude#agentmom-d9-yetenekler]. Kaynaklar node:vm içinde sahte window/document ile yüklenir; ağ yok, tarayıcı yok, model çağrısı yok.
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

export const dir = import.meta.dirname as string;
export const read = (f: string): string => fs.readFileSync(path.join(dir, f), "utf8");

type Fn = (e: any) => void;
export class FNode {
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
  selected = false;
  maxLength = 0;
  autocomplete = "";
  rows = 0;
  open = false;
  scrolled = 0;
  listeners: Record<string, Fn[]> = {};
  doc: FDoc;
  classes = new Set<string>();
  classList = { add: (c: string) => { this.classes.add(c); } };
  constructor(tag: string, doc: FDoc) { this.tag = tag; this.doc = doc; }
  get tagName(): string { return this.tag.toUpperCase(); }
  get firstChild(): FNode | null { return this.children[0] ?? null; }
  get textContent(): string { return this.own + this.children.map((c) => c.textContent).join(""); }
  set textContent(v: unknown) { this.own = String(v); for (const o of this.children) o.parentNode = null; this.children = []; }
  appendChild(c: FNode) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; }
  removeChild(c: FNode) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; }
  replaceChildren(...nodes: FNode[]) { for (const o of this.children) o.parentNode = null; this.children = []; for (const n of nodes) this.appendChild(n); }
  setAttribute(k: string, v: unknown) { this.attrs[k] = String(v); if (k === "id") this.id = String(v); }
  getAttribute(k: string) { return Object.hasOwn(this.attrs, k) ? (this.attrs[k] as string) : (k === "id" && this.id ? this.id : null); }
  addEventListener(t: string, fn: Fn) { (this.listeners[t] ||= []).push(fn); }
  focus() { this.doc.activeElement = this; }
  scrollIntoView() { this.scrolled += 1; }
  removeAttribute(k: string) { delete this.attrs[k]; }
  querySelectorAll(sel: string): FNode[] { const m = /^\[role=(\w+)\]$/.exec(sel); return m ? walk(this).filter((n) => n.attrs["role"] === m[1]) : []; }
  click() { if (this.disabled) return; for (const fn of this.listeners["click"] || []) fn({ target: this }); }
  fire(type: string, extra: Record<string, unknown> = {}) { for (const fn of this.listeners[type] || []) fn({ target: this, preventDefault() {}, ...extra }); }
}
export class FDoc {
  activeElement: FNode | null = null;
  ids: Record<string, FNode> = {};
  createElement(tag: string) { return new FNode(tag, this); }
  createElementNS(_ns: string, tag: string) { return new FNode(tag, this); }
  createTextNode(t: string) { const n = new FNode("#text", this); n.nodeType = 3; n.own = t; return n; }
  getElementById(id: string) { return this.ids[id] ?? null; }
}

export function walk(n: FNode, out: FNode[] = []): FNode[] { for (const c of n.children) { out.push(c); walk(c, out); } return out; }
export const J = (x: unknown): any => JSON.parse(JSON.stringify(x));
export const byTag = (n: FNode, tag: string): FNode[] => walk(n).filter((x) => x.tag === tag);
export const byKey = (n: FNode, key: string): FNode | undefined => walk(n).find((x) => x.attrs["data-am-key"] === key);
export const byId = (n: FNode, id: string): FNode | undefined => walk(n).find((x) => x.id === id || x.attrs["id"] === id);
export const hasClass = (n: FNode, c: string): boolean => n.className.split(/\s+/).includes(c);
export const byClass = (n: FNode, c: string): FNode[] => walk(n).filter((x) => hasClass(x, c));
export const alerts = (n: FNode): FNode[] => walk(n).filter((x) => x.attrs["role"] === "alert");
export const buttons = (n: FNode, re: RegExp): FNode[] => byTag(n, "button").filter((b) => re.test(b.textContent));
export const typeInto = (n: FNode, v: string): void => { n.value = v; n.fire(n.tag === "select" ? "change" : "input"); };
export const okData = (value: unknown) => ({ status: "ok", value });

const BAD_TAGS = ["script", "iframe", "img", "a", "object", "embed", "style"];
export function noActiveContent(root: FNode): void {
  const bad = walk(root).filter((n) => BAD_TAGS.includes(n.tag)).map((n) => n.tag);
  if (bad.length) throw new Error("etkin içerik etiketi: " + bad.join(","));
  const attrs = walk(root).filter((n) => Object.keys(n.attrs).some((k) => /^on/i.test(k) || k === "style" || k === "srcdoc" || k === "href"));
  if (attrs.length) throw new Error("etkin içerik özniteliği");
}

export function coreEnv(respond?: (p: string, init: any) => { status: number; body: unknown } | undefined, extra: string[] = []) {
  const calls: Array<[string, string, string | undefined]> = [];
  const timers: Array<() => void> = []; // sahte setTimeout kuyruğu (model koşusu yoklaması): tick() sıradakini çalıştırır
  const listeners: Record<string, Array<() => void>> = {};
  const doc: any = { getElementById: () => null, querySelectorAll: () => [], hidden: false, addEventListener: (t: string, fn: () => void) => { (listeners[t] ||= []).push(fn); }, createElement: () => ({ setAttribute() {}, appendChild() {}, addEventListener() {} }) };
  const win: any = { AM_DIALOG: { confirm: () => Promise.resolve(true) }, addEventListener() {} };
  const fetchStub = (p: string, init: any) => {
    calls.push([init.method, p, init.body]);
    const custom = respond ? respond(p, init) : undefined;
    if (custom) return Promise.resolve({ status: custom.status, text: () => Promise.resolve(JSON.stringify(custom.body)) });
    return Promise.resolve({ status: 200, text: () => Promise.resolve("{}") });
  };
  const store: Record<string, string> = { "agentmom.token": "t".repeat(32) };
  const ctx = vm.createContext({
    window: win, document: doc, location: { hash: "", pathname: "/ui", search: "" }, history: { replaceState() {} }, fetch: fetchStub,
    sessionStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } },
    setInterval: () => 0, setTimeout: (fn: () => void) => { timers.push(fn); return timers.length; }, clearTimeout: () => undefined, console, Promise, URL,
  });
  for (const f of ["strings.js", ...extra, "core.js"]) vm.runInContext(read(f), ctx, { filename: f });
  for (const fn of listeners["DOMContentLoaded"] || []) fn();
  const flush = () => new Promise((r) => setTimeout(r, 30));
  return { win, calls, flush, timers, tick: async () => { const fn = timers.shift(); fn?.(); await flush(); }, tickFast: async () => { const fn = timers.shift(); fn?.(); await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r)); }, gets: () => calls.filter((c) => c[0] === "GET"), data: (k: string) => win.AM.state.data[k], posts: () => calls.filter((c) => c[0] === "POST") };
}

export interface Env {
  doc: FDoc; host: FNode; chat: FNode; win: any; AM: any; calls: any[]; P: any;
  go(page: string, param?: string): void;
  loads(): any[];
}
export const PAGES = ["pages.js", "page-tasks.js", "page-research.js", "page-integrations.js", "page-memory.js", "page-verify.js"];

// Gerçek strings.js + icons.js + pages.js + istenen sayfa dosyaları. Veri istekleri AM.calls içinde ["loadData", ad, parametre] olarak görünür ve anahtar "loading" olur.
export function makeEnv(files: string[] = PAGES, extra: string[] = []): Env {
  const doc = new FDoc();
  const host = new FNode("div", doc);
  const chat = new FNode("section", doc);
  doc.ids["pageView"] = host;
  doc.ids["chatView"] = chat;
  const win: any = {};
  const ctx = vm.createContext({ window: win, document: doc, console, setTimeout: () => 0, clearTimeout: () => undefined });
  win.window = win;
  for (const f of ["strings.js", "icons.js", ...files, ...extra]) vm.runInContext(read(f), ctx, { filename: f });
  const calls: any[] = [];
  const AM: any = {
    state: { tasks: [], debt: [], decisions: [], skills: [], providers: [], topics: [], subsessions: [], health: { status: null, checks: [] }, backup: null, policy: null, data: {}, project: { name: "AgentMom" } },
    view: { page: "chat", pageParam: "" },
    actions: {
      setView: (p: any) => { calls.push(["setView", p]); Object.assign(AM.view, p); },
      navigate: (id: string) => { calls.push(["navigate", id]); AM.view.page = id; },
      selectTopic: (id: string) => { calls.push(["selectTopic", id]); },
      refresh: () => { calls.push(["refresh"]); },
      loadData: (name: string, param?: string | number) => {
        calls.push(["loadData", name, param]);
        const key = param === undefined || param === "" ? name : name + ":" + param;
        AM.state.data[key] = { status: "loading", value: null };
        return Promise.resolve();
      },
      copyText: (t: string) => { calls.push(["copyText", t]); return Promise.resolve(true); },
    },
  };
  const P = win.AM_PAGES;
  if (P) P.init(AM, host);
  return {
    doc, host, chat, win, AM, calls, P,
    go(page: string, param = "") { AM.view.page = page; AM.view.pageParam = param; P.render(AM); },
    loads() { return calls.filter((c) => c[0] === "loadData"); },
  };
}
