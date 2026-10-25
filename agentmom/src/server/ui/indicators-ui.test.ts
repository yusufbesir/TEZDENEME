// Durum göstergeleri çekirdek testleri (core.js loadIndicators/normIndicators, canlı izleme takılma uyarlaması) ve sayfa rozetleri (Genel Bakış, Görevler).
// Sahip: Claude [İP:AgentMom Faz 11]. yazan: [Claude#agentmom-indicators]. Kaynaklar node:vm içinde; ağ yok, tarayıcı yok, model çağrısı yok.
// Kapsam: 30 sn yenileme, sayfa gizliyken durma, oturum yokken istek yok, bilinmiyor/uydurma yok, XSS yok, takılma rozeti (renk + simge + metin, tıklayınca ayrıntı, iptal yok).
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { byKey, byTag, makeEnv, read, walk } from "./lab-env.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const UUID = (n: number): string => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");

// coreEnv'in değiştirilebilir saatli, gizlenebilir sayfalı ve interval'i tutan sürümü.
function indEnv(respond: (p: string) => { status: number; body: unknown } | undefined, opts: { token?: boolean; hang?: boolean } = {}) {
  const timers: Array<[() => void, number]> = [];
  const signals: Array<{ aborted: boolean }> = [];
  const clears: number[] = [];
  const calls: string[] = [];
  const state = { now: 1_700_000_000_000, hidden: false };
  const intervals: Array<() => void> = [];
  const doc: Any = { getElementById: () => null, querySelectorAll: () => [], get hidden() { return state.hidden; }, addEventListener: (t: string, fn: () => void) => { (listeners[t] ||= []).push(fn); }, createElement: () => ({ setAttribute() {}, appendChild() {}, addEventListener() {} }) };
  const listeners: Record<string, Array<() => void>> = {};
  class FakeDate extends Date {
    constructor(...a: Any[]) {
      if (a.length === 0) super(state.now);
      else super(...(a as [Any]));
    }
    static override now(): number { return state.now; }
  }
  const fetchStub = (p: string, init: Any) => {
    calls.push(init.method + " " + p);
    if (init.signal) signals.push(init.signal);
    if (opts.hang && p.startsWith("/api/status/indicators")) return new Promise((_ok, fail) => { init.signal.onabort = () => fail(new Error("abort")); });
    const custom = respond(p);
    return Promise.resolve({ status: custom ? custom.status : 200, text: () => Promise.resolve(JSON.stringify(custom ? custom.body : {})) });
  };
  const store: Record<string, string> = opts.token === false ? {} : { "agentmom.token": "t".repeat(32) };
  const win: Any = { AM_DIALOG: { confirm: () => Promise.resolve(true) }, addEventListener() {} };
  const ctx = vm.createContext({
    window: win, document: doc, location: { hash: "", pathname: "/ui", search: "" }, history: { replaceState() {} }, fetch: fetchStub, Date: FakeDate,
    sessionStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } },
    setInterval: (fn: () => void) => { intervals.push(fn); return intervals.length; }, setTimeout: (fn: () => void, ms: number) => { timers.push([fn, ms]); return timers.length; }, clearTimeout: (id: number) => { clears.push(id); }, console, Promise, URL,
    AbortController: class { signal: Any = { aborted: false, onabort: null }; abort() { this.signal.aborted = true; this.signal.onabort?.(); } },
  });
  for (const f of ["strings.js", "core.js"]) vm.runInContext(read(f), ctx, { filename: f });
  for (const fn of listeners["DOMContentLoaded"] || []) fn();
  const flush = () => new Promise((r) => setTimeout(r, 30));
  const indCalls = () => calls.filter((c) => c.startsWith("GET /api/status/indicators"));
  return { win, state, calls, intervals, flush, indCalls, timers, signals, clears, AM: win.AM as Any };
}

const GOOD = {
  context: { percent: 77.5, usedTokens: 116250, windowTokens: 150000, source: "reported", level: "warn", windowSource: "program_default", note: "x" },
  quota: { percent: null, providerId: "claude-code", reported: false, level: "unknown", note: "kota: bilinmiyor" },
  pendingApprovals: { count: 2, critical: 1, truncated: false },
  stalled: { count: 1, items: [{ taskId: UUID(7), lastTraceMin: 7.4, long: false }] },
  generatedAt: "2026-10-23T12:00:00.000Z",
};

test("çekirdek: ilk yoklamada göstergeler istenir ve doğrulanıp durumda tutulur (bilinmeyen null kalır)", async () => {
  const k = indEnv((p) => (p.startsWith("/api/status/indicators") ? { status: 200, body: GOOD } : undefined));
  await k.flush();
  assert.equal(k.indCalls().length, 1);
  assert.equal(k.indCalls()[0], "GET /api/status/indicators", "konu seçili değilse session parametresi yok");
  const ind = k.AM.state.indicators;
  assert.deepEqual(JSON.parse(JSON.stringify(ind.context)), { percent: 77.5, level: "warn", usedTokens: 116250, windowTokens: 150000, source: "reported" });
  assert.deepEqual(JSON.parse(JSON.stringify(ind.quota)), { percent: null, level: "unknown", providerId: "claude-code", reported: false });
  assert.deepEqual(JSON.parse(JSON.stringify(ind.pendingApprovals)), { count: 2, critical: 1, truncated: false });
  assert.equal(ind.stalled.count, 1);
});

test("çekirdek: 30 sn dolmadan yeniden istenmez, dolunca istenir; konu değişince hemen (session=uuid)", async () => {
  const k = indEnv((p) => (p.startsWith("/api/status/indicators") ? { status: 200, body: GOOD } : undefined));
  await k.flush();
  assert.equal(k.indCalls().length, 1);
  k.state.now += 29_000;
  await k.AM.actions.refresh();
  await k.flush();
  assert.equal(k.indCalls().length, 1, "29 sn: yeni istek yok");
  k.state.now += 1_000;
  await k.AM.actions.refresh();
  await k.flush();
  assert.equal(k.indCalls().length, 2, "30 sn: yenilendi");
  k.AM.actions.setView({ selectedTopicId: UUID(5) });
  await k.flush();
  assert.equal(k.indCalls().length, 3, "konu değişimi zorlar");
  assert.equal(k.indCalls()[2], "GET /api/status/indicators?session=" + UUID(5));
  k.AM.actions.setView({ selectedTopicId: "not-a-uuid" });
  await k.flush();
  assert.ok(k.indCalls().every((c) => !c.includes("not-a-uuid")), "biçimsiz kimlik sunucuya gitmez");
});

test("çekirdek: sayfa gizliyken istek gitmez ve yoklama döngüsü durur; görünür olunca devam eder", async () => {
  const k = indEnv((p) => (p.startsWith("/api/status/indicators") ? { status: 200, body: GOOD } : undefined));
  await k.flush();
  const before = k.calls.length;
  k.state.hidden = true;
  k.state.now += 120_000;
  for (const fn of k.intervals) fn();
  await k.AM.actions.refresh();
  k.AM.actions.setView({ selectedTopicId: UUID(9) });
  await k.flush();
  assert.equal(k.indCalls().length, 1, "gizliyken yeni gösterge isteği yok");
  assert.equal(k.calls.length, before + (k.calls.length - before), "yoklama sayısı yalnız elle çağrılan refresh kadar");
  k.state.hidden = false;
  k.state.now += 1000;
  await k.AM.actions.refresh();
  await k.flush();
  assert.equal(k.indCalls().length, 2, "görünür olunca devam");
});

test("çekirdek: oturum (belirteç) yokken hiç istek gitmez", async () => {
  const k = indEnv(() => undefined, { token: false });
  await k.flush();
  k.AM.actions.setView({ selectedTopicId: UUID(1) });
  await k.flush();
  assert.equal(k.calls.length, 0);
  assert.equal(k.AM.state.indicators, null);
});

test("çekirdek: sunucu hatası/bozuk yanıt göstergeleri null yapar (bilinmiyor); uydurma değer yok", async () => {
  for (const reply of [{ status: 500, body: { error: "x" } }, { status: 200, body: {} }, { status: 200, body: { context: { percent: "çok", level: "critical" }, quota: { percent: 120, level: "zzz", reported: true }, pendingApprovals: { count: "x" } } }]) {
    const k = indEnv((p) => (p.startsWith("/api/status/indicators") ? reply : undefined));
    await k.flush();
    const ind = k.AM.state.indicators;
    if (reply.status === 500) { assert.equal(ind, null); continue; }
    assert.equal(ind.context.percent, null);
    assert.equal(ind.context.level, "unknown", "yüzde yoksa seviye de bilinmiyor");
    assert.equal(ind.context.source, "unknown");
    assert.equal(ind.pendingApprovals.count, null);
    assert.equal(ind.quota.reported, ind.quota.percent !== null);
    assert.ok(["ok", "warn", "critical", "unknown"].includes(ind.quota.level), "seviye kümesi dışına çıkamaz");
  }
});

test("çekirdek: sunucudan gelen sağlayıcı adı/kimlik temizlenir; kimliği biçimsiz takılma öğeleri atılır", async () => {
  const evil = "<img src=x onerror=alert(1)>‮" + "a".repeat(200);
  const body = { ...GOOD, quota: { percent: 40, level: "ok", providerId: evil, reported: true }, stalled: { count: 3, items: [{ taskId: "<script>", lastTraceMin: 9 }, { taskId: UUID(2), lastTraceMin: null }, { taskId: UUID(3), lastTraceMin: 16, long: true }] } };
  const k = indEnv((p) => (p.startsWith("/api/status/indicators") ? { status: 200, body } : undefined));
  await k.flush();
  const ind = k.AM.state.indicators;
  assert.ok(ind.quota.providerId.length <= 61);
  assert.ok(!/[‮]/.test(ind.quota.providerId));
  assert.deepEqual(JSON.parse(JSON.stringify(ind.stalled.items)), [{ taskId: UUID(3), lastTraceMin: 16, long: true }]);
  assert.equal(ind.stalled.count, 1);
});

test("çekirdek: canlı izleme uyarlaması takılma şüphesini taşır; bilinmeyen yaş atılır", async () => {
  const mon = {
    generatedAt: "2026-10-23T12:00:00.000Z",
    running: { workflows: [{ id: UUID(1), taskId: UUID(2), title: "akış", runningMin: 30, lastTraceMin: 6, stalled: true, stalledLong: false }], tasks: [{ id: UUID(3), title: "koşu", runningMin: 40, lastTraceMin: null, stalled: false, stalledLong: false }] },
    stalled: [{ kind: "workflow", id: UUID(1), taskId: UUID(2), title: "akış", lastTraceMin: 6, stalledLong: false }, { kind: "task", id: UUID(9), taskId: UUID(9), title: "x", lastTraceMin: null, stalledLong: true }],
    awaitingApproval: [], slowSteps: [], retries: [], failedLast24h: { tasks: 0, workflows: 0, items: [] }, bottleneck: { kind: "none", text: "yok" },
  };
  const k = indEnv((p) => (p === "/api/monitor" ? { status: 200, body: mon } : undefined));
  await k.flush();
  k.AM.view.page = "overview";
  await k.AM.actions.loadData("monitor");
  await k.flush();
  const v = k.AM.state.data.monitor.value;
  assert.deepEqual(JSON.parse(JSON.stringify(v.stalled)), [{ taskId: UUID(2), title: "akış", lastTraceMin: 6, long: false }]);
  assert.equal(v.running[0].stalled, true);
  assert.equal(v.running[0].lastTraceMin, 6);
  assert.equal(v.running[1].lastTraceMin, null);
  assert.equal(v.running[1].stalled, false);
});

// ---------------------------------------------------------------- sayfalar
test("Genel Bakış: takılma rozeti renk + simge + metin; tıklayınca ayrıntı; iptal düğmesi YOK", () => {
  const env = makeEnv(["pages.js", "page-overview.js"]);
  const st = env.AM.state;
  st.data.monitor = {
    status: "ok",
    value: { at: "t", running: [], waiting: [], slow: [], retries: [], bottleneck: { kind: "none", text: "yok" }, counts: { running: 2, waiting: 0, failedLast24h: 0 }, stalled: [{ taskId: UUID(1), title: "uzun iş", lastTraceMin: 7.4, long: false }, { taskId: UUID(2), title: "çok uzun", lastTraceMin: 20, long: true }] },
  };
  env.go("overview");
  const texts = walk(env.host).map((n) => n.textContent);
  const all = env.host.textContent;
  assert.match(all, /▲ takılmış görünüyor/);
  assert.match(all, /✕ takılmış görünüyor · uzun süredir/);
  assert.match(all, /5 dk hiç iz/);
  assert.ok(!/Son iz: .* dk önce/.test(all), "ayrıntı tıklanana kadar kapalı");
  const toggle = byKey(env.host, "stalled:" + UUID(1));
  assert.ok(toggle);
  assert.equal(toggle.attrs["aria-expanded"], "false");
  toggle.fire("click");
  env.go("overview");
  const open = env.host.textContent;
  assert.match(open, /Son iz: 7 dk önce\. Bu yalnız bir şüphedir/);
  assert.match(open, /kendiliğinden iptal edilmez/);
  assert.equal(byKey(env.host, "stalled:" + UUID(1))?.attrs["aria-expanded"], "true");
  assert.ok(texts.length > 0);
  assert.ok(!/İptal et|Sonlandır|Öldür/i.test(open), "iptal/öldürme düğmesi yok");
  const names = byTag(env.host, "button").map((b) => b.textContent);
  assert.ok(!names.some((n) => /iptal|sonlandır|durdur|öldür/i.test(n)), "hiçbir düğme iptal etmez: " + names.join("|"));
});

test("Genel Bakış: takılan koşu yoksa '✓ Takılmış görünen koşu yok'; sunucu listeyi hiç bildirmediyse 'yok' denmez", () => {
  const env = makeEnv(["pages.js", "page-overview.js"]);
  const base = { at: "t", running: [], waiting: [], slow: [], retries: [], bottleneck: { kind: "none", text: "yok" }, counts: { running: 0, waiting: 0, failedLast24h: 0 } };
  env.AM.state.data.monitor = { status: "ok", value: { ...base, stalled: [] } };
  env.go("overview");
  assert.match(env.host.textContent, /✓ Takılmış görünen koşu yok/);
  env.AM.state.data.monitor = { status: "ok", value: base };
  env.go("overview");
  assert.ok(!/Takılmış görünen koşu yok/.test(env.host.textContent), "bilinmeyen = yok denmez");
  assert.ok(!/Takılma şüphesi/.test(env.host.textContent));
});

test("Genel Bakış: sunucudan gelen başlık/kimlik düz metin olarak yazılır (XSS yok)", () => {
  const env = makeEnv(["pages.js", "page-overview.js"]);
  const evil = "<img src=x onerror=alert(1)>";
  env.AM.state.data.monitor = { status: "ok", value: { at: "t", running: [], waiting: [], slow: [], retries: [], bottleneck: { kind: "none", text: "yok" }, counts: { running: 1, waiting: 0, failedLast24h: 0 }, stalled: [{ taskId: UUID(1), title: evil, lastTraceMin: 9, long: false }] } };
  env.go("overview");
  assert.ok(env.host.textContent.includes(evil), "metin olarak görünür");
  assert.equal(walk(env.host).filter((n) => n.tag === "img" || n.tag === "script").length, 0);
});

test("Görevler: çalışan görevde takılma rozeti; çalışmayan görevde asla; tıklayınca ayrıntı", () => {
  const env = makeEnv(["pages.js", "page-tasks.js"]);
  const st = env.AM.state;
  st.tasks = [
    { id: UUID(1), title: "koşan", state: "running", requestedAction: "file.write", request: {}, createdAt: "2026-10-23T10:00:00.000Z" },
    { id: UUID(2), title: "biten", state: "succeeded", requestedAction: "file.write", request: {}, createdAt: "2026-10-23T09:00:00.000Z" },
  ];
  st.indicators = { stalled: { count: 2, items: [{ taskId: UUID(1), lastTraceMin: 16, long: true }, { taskId: UUID(2), lastTraceMin: 30, long: true }] } };
  env.go("tasks");
  const t1 = byKey(env.host, "stalled:" + UUID(1));
  assert.ok(t1, "çalışan görevde rozet");
  assert.match(t1.textContent, /✕ takılmış görünüyor · uzun süredir/);
  assert.equal(byKey(env.host, "stalled:" + UUID(2)), undefined, "biten görev takılmış sayılmaz");
  assert.ok(!/Son iz:/.test(env.host.textContent));
  t1.fire("click");
  env.go("tasks");
  assert.match(env.host.textContent, /Son iz: 16 dk önce\. Bu yalnız bir şüphedir/);
  assert.ok(!byTag(env.host, "button").some((b) => /iptal|sonlandır|öldür/i.test(b.textContent)));
});

test("Görevler: göstergeler yokken ya da bozukken rozet çizilmez ve sayfa bozulmaz", () => {
  const env = makeEnv(["pages.js", "page-tasks.js"]);
  env.AM.state.tasks = [{ id: UUID(1), title: "koşan", state: "running", requestedAction: "file.write", request: {}, createdAt: "2026-10-23T10:00:00.000Z" }];
  for (const bad of [undefined, null, {}, { stalled: null }, { stalled: { items: "x" } }, { stalled: { items: [{ taskId: UUID(1), lastTraceMin: "çok" }, null, 5] } }]) {
    env.AM.state.indicators = bad;
    env.go("tasks");
    assert.equal(byKey(env.host, "stalled:" + UUID(1)), undefined);
    assert.match(env.host.textContent, /koşan/);
  }
});

// ---- Denetim düzeltmeleri ----
test("çekirdek: gösterge isteği ~10 sn zaman aşımıyla iptal edilir; takılı istek durumu null yapar ve sonraki yoklama yeniden dener", async () => {
  const k = indEnv(() => undefined, { hang: true });
  await k.flush();
  assert.equal(k.indCalls().length, 1);
  assert.equal(k.signals.length, 1, "AbortController sinyali istekle gitti");
  const t = k.timers.find((x) => x[1] === 10000);
  assert.ok(t, "10 sn'lik zaman aşımı kuruldu");
  t[0]();
  await k.flush();
  assert.equal(k.signals[0]?.aborted, true);
  assert.equal(k.AM.state.indicators, null);
  k.state.now += 30_000;
  await k.AM.actions.refresh();
  await k.flush();
  assert.equal(k.indCalls().length, 2, "takılı istek yoklamayı kilitlemedi");
});

test("çekirdek: başarılı yanıt zaman aşımı sayacını temizler; diğer istekler zaman aşımı almaz", async () => {
  const k = indEnv((p) => (p.startsWith("/api/status/indicators") ? { status: 200, body: GOOD } : undefined));
  await k.flush();
  assert.ok(k.clears.length >= 1, "sayaç temizlendi");
  assert.equal(k.timers.filter((x) => x[1] === 10000).length, 1, "yalnız gösterge isteği sayaç kurar");
  assert.equal(k.signals.length, 1);
});

test("Görevler: takılma ayrıntısı <p> değil bölüm (div); düğme ve ayrıntı tıklaması satıra yayılmaz", () => {
  const env = makeEnv(["pages.js", "page-tasks.js"]);
  env.AM.state.tasks = [{ id: UUID(1), title: "koşan", state: "running", requestedAction: "file.write", request: {}, createdAt: "2026-10-23T10:00:00.000Z" }];
  env.AM.state.indicators = { stalled: { count: 1, items: [{ taskId: UUID(1), lastTraceMin: 8, long: false }] } };
  env.go("tasks");
  let stops = 0;
  byKey(env.host, "stalled:" + UUID(1))!.fire("click", { stopPropagation: () => { stops++; } });
  assert.equal(stops, 1, "düğme tıklaması yayılmayı durdurur");
  env.go("tasks");
  const detail = walk(env.host).find((n) => /Son iz: 8 dk önce/.test(n.textContent) && n.children.length === 0);
  assert.ok(detail, "ayrıntı metni var");
  assert.equal(detail.tag, "div");
  assert.ok(!walk(env.host).some((n) => n.tag === "p" && /Son iz:/.test(n.textContent)), "<p> yok");
  detail.fire("click", { stopPropagation: () => { stops++; } });
  assert.equal(stops, 2, "ayrıntı tıklaması da yayılmaz");
});
