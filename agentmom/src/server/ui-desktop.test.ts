// AgentMom masaüstü arayüzü (Faz 11) GÜVENLİK testleri: gerçek sunucu + gerçek Edge (playwright-core, channel msedge, başsız). İnternet, model çağrısı ve dosya silme yok.
// Sahip: Yusuf. Yazan: Claude [İP:AgentMom Faz 11 test yeniden yazımı]. Değiştirme kuralı: yalnız yazan Claude iş parçacığı ya da Yusuf'un izniyle; testi gevşeterek geçirmek yasak, kaynakta gerçek hata varsa rapor edilir.
// Bu dosya, Faz 10 arayüzüne bağlı olup arayüz Faz 11'de baştan yazıldığı için kırılan altı testin (app.test.ts'ten çıkarıldı) GÜVENLİK NİYETİNİ yeni arayüze karşı yeniden kurar:
//   1 sabit rotalar ve başlıklar · 2 belirteç/XSS/onay penceresi · 3 yerleşim · 4 beyaz ekran yok · 5 komutlar · 6 onay çekirdeğin kendi kaydına bağlı · + /api/help ve /api/policy.
// Sunucu/belirteç/yardımcı kurulumu app.test.ts'ten import edilemediği için (o dosyanın üst düzey before/after'ı vardır) burada küçük bir kopya olarak yeniden kurulur.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import type { Server } from "node:http";
import { join, resolve } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { AuditLog, MemoryAuditSink, SqliteAuditSink } from "../core/audit/audit.ts";
import { AuthRegistry } from "../core/auth/auth.ts";
import { DEFAULT_CONFIG } from "../core/config/config.ts";
import type { AgentMomConfig } from "../core/config/config.ts";
import { openDb } from "../core/db/db.ts";
import type { Db } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { TaskStore } from "../core/tasks/tasks.ts";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { ScriptedAdapter } from "../testing/scripted-adapter.ts";
import { createApp } from "./app.ts";
import { UI_FILES, CSP, MISSING } from "./ui.ts";

// Bu geri çağrılar tarayıcı sayfasının içinde çalışır; bu Node projesinde DOM tipleri yoktur.
declare const document: any;
declare const window: any;

const FAKE_KEY = "sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2";
const BASE = mkTmp("agentmom-uid-");
const ROOT = resolve("D:/work/proj");
const UI_DIR = join(import.meta.dirname, "ui");
const T60 = { timeout: 300_000 };

let server: Server;
let port: number;
let db: Db;
let dbPath: string;
let auth: AuthRegistry;
let agentToken: string;
let registry: ProviderRegistry;

function config(): AgentMomConfig {
  const c = structuredClone(DEFAULT_CONFIG);
  const k = c.policy.defaultContract;
  k.allowedActions = ["task.create", "file.read", "file.write", "provider.call", "provider.switch"];
  k.allowedDirs = [ROOT, BASE];
  k.allowedProviders = ["claude", "openai", "claude-code", "codex", "wf-coder"];
  k.budget = { maxUsd: 5, spentUsd: 0 };
  k.approvalRequiredActions = ["file.write"];
  k.maxRuntimeMs = 20_000;
  return c;
}

before(async () => {
  dbPath = join(BASE, "t.db");
  db = openDb(dbPath);
  migrate(db);
  const audit = new AuditLog([new SqliteAuditSink(db), new MemoryAuditSink()]);
  auth = new AuthRegistry();
  agentToken = auth.issueAgentToken("test-agent");
  registry = new ProviderRegistry(db);
  registry.register(new ScriptedAdapter("wf-coder", () => ({ summary: "done" })));
  const worktreeRoot = join(BASE, "worktrees");
  mkdirSync(worktreeRoot, { recursive: true });
  const wfStore = new WorkflowStore(db);
  const engine = new WorkflowEngine({ tasks: new TaskStore(db), audit, registry, evidence: new EvidenceStore(db), store: wfStore, contract: config().policy.defaultContract, worktreeRoot });
  // Gerçek sunucuda zamanlayıcı her zaman kuruludur; bu test sunucusu da (arayüzün her yenilemede çağırdığı) durum ucunu karşılasın.
  const backup = { status: () => ({ lastBackup: null, ageHours: null, changesSince: 0, lastVerify: null, lastDecision: null, warnings: [], config: { minChanges: 8, idleMinutes: 10, staleDays: 3 } }), manual: async () => null };
  server = createApp({ db, dbPath, config: config(), audit, auth, registry, engine, workflows: wfStore, worktreeRoot, backup });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const addr = server.address();
  port = typeof addr === "object" && addr ? addr.port : 0;
});

after(async () => {
  await new Promise<void>((ok) => server.close(() => ok()));
  db.close();
});

interface Reply {
  status: number;
  json: any;
}

function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}, token: string | null = auth.userToken): Promise<Reply> {
  return new Promise((ok, fail) => {
    const payload = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);
    const req = httpRequest(
      { host: "127.0.0.1", port, method, path, headers: { host: `127.0.0.1:${port}`, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(payload ? { "content-type": "application/json" } : {}), ...headers } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json: any = null;
          try { json = text ? JSON.parse(text) : null; } catch { json = text; }
          ok({ status: res.statusCode ?? 0, json });
        });
      },
    );
    req.on("error", fail);
    if (payload) req.write(payload);
    req.end();
  });
}

const asAgent = (method: string, path: string, body?: unknown) => call(method, path, body, {}, agentToken);

function rawGet(path: string, headers: Record<string, string> = {}, method = "GET"): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((ok, fail) => {
    const req = httpRequest({ host: "127.0.0.1", port, method, path, headers: { host: `127.0.0.1:${port}`, ...headers } }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => ok({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", fail);
    req.end();
  });
}

async function newTask(title: string, file: string, action = "file.write"): Promise<string> {
  const r = await asAgent("POST", "/api/tasks", { title, request: { action, target: join(BASE, file) } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.task.id as string;
}

const stateOf = async (id: string): Promise<string> => (await call("GET", "/api/tasks")).json.tasks.find((t: { id: string }) => t.id === id).state;

// ---------------------------------------------------------------- tarayıcı yardımcıları
type Open = (width: number, height?: number, token?: string | null) => Promise<{ page: any; ctx: any }>;

async function withEdge<T>(fn: (open: Open) => Promise<T>): Promise<T> {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    return await fn(async (width, height = 900, token = auth.userToken) => {
      const ctx = await browser.newContext({ viewport: { width, height } });
      ctx.setDefaultTimeout(60_000);
      const page = await ctx.newPage();
      page.setDefaultTimeout(60_000);
      // token === null: gezinmeyi test kendisi yapar (yalnız parça değişimi sayfayı yeniden yüklemez, başlangıç yolu atlanırdı)
      if (token !== null) await page.goto(`http://127.0.0.1:${port}/#token=${token}`);
      return { page, ctx };
    });
  } finally {
    await browser.close();
  }
}

const URL0 = () => `http://127.0.0.1:${port}/`;

// Uygulama açıldı ve ilk yenileme bitti (AM.state.updatedAt dolu).
async function ready(page: any): Promise<void> {
  await page.waitForSelector("#app:not([hidden])");
  await page.waitForFunction(() => window.AM && window.AM.state && window.AM.state.updatedAt);
}

async function selectTopic(page: any, id: string): Promise<void> {
  await page.evaluate((i: string) => { void window.AM.actions.selectTopic(i); }, id);
  await page.waitForFunction((i: string) => window.AM.view.selectedTopicId === i, id);
}

// Çekirdeğin yazma (GET/HEAD dışı) istekleri: onay verilmeden hiçbiri gitmemeli.
function trackWrites(page: any): Array<{ method: string; path: string }> {
  const writes: Array<{ method: string; path: string }> = [];
  page.on("request", (r: { method(): string; url(): string }) => {
    const m = r.method();
    if (m !== "GET" && m !== "HEAD") writes.push({ method: m, path: new URL(r.url()).pathname });
  });
  return writes;
}

const DIALOG = '.am-overlay[data-owner="dialog"] [role="alertdialog"]';

async function dialogText(page: any): Promise<string> {
  return await page.locator(DIALOG).innerText();
}

async function closeDialog(page: any, how: "cancel" | "escape" = "cancel"): Promise<void> {
  if (how === "escape") await page.keyboard.press("Escape");
  else await page.locator(`${DIALOG} [data-action="cancel"]`).click();
  await page.waitForSelector(DIALOG, { state: "detached" });
}

// Hata kartının görünür olduğu her anın metnini sayfa içinde kaydeder (kart sonradan gizlense bile kanıt kalır).
async function recordErrorCard(page: any): Promise<void> {
  await page.addInitScript(() => {
    window.__errSeen = [];
    const check = () => {
      const c = document.getElementById("errorCard");
      if (c && !c.hidden && c.textContent && !window.__errSeen.includes(c.textContent)) window.__errSeen.push(c.textContent);
    };
    new window.MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  });
}

// ================================================================ 1) sabit rotalar
test("panel files: every route in UI_FILES serves with the strict CSP and hardening headers, carries no secret; everything else (retired v1 files, traversal, directory forms) stays closed", T60, async () => {
  const routes = Object.entries(UI_FILES);
  assert.equal(routes.length, 46, "the list of served files is closed: 46 fixed routes (page, 11 css, 32 js, icon, favicon); a new file must be added here on purpose");
  assert.deepEqual(MISSING, [], "no panel file is missing on disk");
  // CSP yalnız ui.ts'ten gelir; burada niyeti ayrıca doğrularız.
  assert.match(CSP, /default-src 'none'/);
  assert.match(CSP, /script-src 'self'/);
  assert.match(CSP, /style-src 'self'/);
  assert.match(CSP, /connect-src 'self'/);
  assert.match(CSP, /img-src 'self'/);
  assert.match(CSP, /frame-ancestors 'none'/);
  assert.match(CSP, /base-uri 'none'/);
  assert.match(CSP, /form-action 'none'/);
  assert.ok(!/unsafe-inline|unsafe-eval|\*|data:|https?:|blob:/.test(CSP), "the CSP allows no inline code, wildcard, data:/blob: or outside origin");
  for (const [path, spec] of routes) {
    const r = await rawGet(path);
    assert.equal(r.status, 200, path);
    assert.equal(String(r.headers["content-type"]), spec.type, path);
    assert.equal(r.headers["content-security-policy"], CSP, path);
    assert.equal(r.headers["x-content-type-options"], "nosniff", path);
    assert.equal(r.headers["x-frame-options"], "DENY", path);
    assert.equal(r.headers["referrer-policy"], "no-referrer", path);
    assert.equal(r.headers["cache-control"], "no-store", path);
    assert.equal(r.headers["cross-origin-opener-policy"], "same-origin", path);
    assert.equal(r.headers["cross-origin-resource-policy"], "same-origin", path);
    assert.match(String(r.headers["permissions-policy"]), /camera=\(\)/, path);
    const isText = !spec.type.startsWith("image/");
    if (isText) {
      // belirteç, sır ve veri yok: sayfa dosyaları herkese aynıdır
      assert.ok(!r.body.includes(auth.userToken) && !r.body.includes(agentToken), `${path}: no session token`);
      assert.ok(!r.body.includes(FAKE_KEY), `${path}: no key`);
      assert.ok(!/Bearer [A-Za-z0-9_-]{20,}/.test(r.body), `${path}: no literal bearer credential`);
      assert.ok(!/#token=[A-Za-z0-9_-]{16,}/.test(r.body), `${path}: no literal token fragment`);
      assert.ok(!/\bsk-[A-Za-z0-9]{16,}/.test(r.body), `${path}: no api-key-looking string`);
    }
  }
  // sayfa iskeleti: satır içi betik/stil/olay yok; her betik ve stil dosyası listedeki bir rota
  const html = readFileSync(join(UI_DIR, "index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  assert.ok(!/<script(?![^>]*\bsrc=)/i.test(html), "no inline script");
  assert.ok(!/\son[a-z]+\s*=/i.test(html), "no inline event handler");
  assert.ok(!/\sstyle\s*=|<style/i.test(html), "no inline style");
  assert.ok(!/https?:\/\//i.test(html), "no outside URL in the page");
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"]*)"/g)].map((m) => m[1] as string);
  assert.ok(refs.length >= 20, "the page references its scripts and styles");
  for (const ref of refs) assert.ok(Object.hasOwn(UI_FILES, ref), `${ref} is referenced by the page and is a served route`);
  // kapalı yollar: eski v1 dosyaları, gezinti denemeleri, dizin biçimleri
  const CLOSED = ["/ui/feed.js", "/ui/app.js", "/ui/style.css", "/ui/index.html", "/ui", "/ui/", "/ui/../x", "/ui/../src/server/app.ts", "/ui/%2e%2e/package.json", "/ui/..%2f..%2fpackage.json", "/ui/core.js/", "/ui/core.js%00.png", "/etc", "/etc/passwd", "//etc/passwd", "/package.json", "/src/server/app.ts", "/ui/chat.test.ts", "/ui/panel.test.ts", "/data/agentmom.db"];
  for (const path of CLOSED) {
    const r = await rawGet(path);
    assert.equal(r.status, 404, `${path} -> ${r.status}`);
    assert.ok(!/<html|function\s*\(/.test(r.body), `${path}: nothing of a file leaks`);
  }
  // WHATWG URL kuralı: "%2e%2e" ve ".." bir nokta parçasıdır, "/ui/.." yolu "/" olur. Sunucu bunu AYNI genel sayfa olarak sunar; başka hiçbir içerik sızmaz.
  const rootPage = await rawGet("/");
  for (const path of ["/ui/%2e%2e", "/ui/..", "/ui/%2E%2E", "/ui/./.."]) {
    const r = await rawGet(path);
    assert.ok(r.status === 404 || (r.status === 200 && r.body === rootPage.body), `${path}: either closed or exactly the public landing page (${r.status})`);
  }
  assert.equal((await rawGet("/", {}, "POST")).status, 404, "only GET serves files");
  assert.equal((await rawGet("/ui/core.js", {}, "PUT")).status, 404);
  assert.equal((await rawGet("/ui/core.js", { host: "evil.example:80" })).status, 403, "the DNS-rebinding guard also covers panel files");
  assert.equal((await rawGet("/", { origin: "http://evil.example" })).status, 403);
  assert.equal((await rawGet("/api/tasks")).status, 401, "data still needs the bearer token");
});

// ================================================================ 2) gerçek Edge: belirteç, XSS, onay penceresi
test("panel in a REAL browser (Edge): #token= moves from the URL into the tab and out of the address bar; data renders as text (XSS payload inert); the approval dialog (AM_DIALOG) shows the REAL action and target, cancel sends nothing, confirm POSTs approve; a wrong token falls back to login", T60, async () => {
  const xss = '<img src=x onerror="window.__pwned=1"><script>window.__pwned2=1</script>';
  const taskId = await newTask(xss, "browser.txt");
  const denyId = await newTask("ZARARSIZ\u202Egorunum\nikinci satir", "iptal.txt");
  await withEdge(async (open) => {
    const { page, ctx } = await open(1500, 900, null);
    const consoleErrors: string[] = [];
    page.on("console", (m: { type(): string; text(): string }) => { if (m.type() === "error") consoleErrors.push(m.text()); });
    const outside: string[] = [];
    page.on("request", (r: { url(): string }) => { if (!r.url().startsWith(`http://127.0.0.1:${port}/`)) outside.push(r.url()); });
    const dialogs: string[] = [];
    page.on("dialog", (d: any) => { dialogs.push(d.message()); void d.dismiss(); });
    const writes = trackWrites(page);

    // 1) belirteç yok -> yalnız giriş ekranı
    await page.goto(URL0());
    await page.waitForSelector("#loginView:not([hidden])");
    assert.equal(await page.locator("#app").isVisible(), false);
    assert.equal(await page.evaluate(() => window.sessionStorage.length), 0);
    // 2) giriş formu: biçimi bozuk anahtar reddedilir, doğru anahtar uygulamayı açar ve kutu hemen boşalır
    await page.locator("#tokenInput").fill("kisa");
    await page.locator("#loginSubmit").click();
    assert.match(await page.locator("#loginMsg").innerText(), /geçersiz/i);
    assert.equal(await page.locator("#app").isVisible(), false);
    // 3) belirteç parçada (parça değişimi yolu): uygulama açılır, parça adres çubuğundan silinir
    await page.goto(`${URL0()}#token=${auth.userToken}`);
    await ready(page);
    assert.equal(await page.evaluate(() => window.location.hash), "", "the token is removed from the address bar");
    assert.ok(!page.url().includes(auth.userToken), "the token is not in the URL");
    // 4) belirteç yalnız bu sekmenin sessionStorage'ında; çerez yok; localStorage'a yalnız beyaz listeli tercihler
    assert.equal(await page.evaluate(() => window.sessionStorage.length), 1);
    assert.equal(await page.evaluate(() => window.sessionStorage.getItem("agentmom.token")), auth.userToken);
    assert.equal(await page.evaluate(() => document.cookie), "");
    const ls = await page.evaluate(() => { const o: Record<string, string> = {}; for (let i = 0; i < window.localStorage.length; i++) { const k = window.localStorage.key(i); o[k] = window.localStorage.getItem(k); } return o; }) as Record<string, string>;
    for (const [k, v] of Object.entries(ls)) assert.ok(k === "agentmom.prefs.v1" && !v.includes(auth.userToken), `localStorage ${k} holds no token`);
    assert.match(await page.locator("#shellHealth").innerText(), /Sağlıklı/);
    assert.equal(await page.locator("#loginView").isVisible(), false);
    // 5) başlangıç yolu: yeni sekmede de aynı (sayfa gerçekten yeniden yüklenir)
    {
      const fresh = await ctx.newPage();
      await fresh.goto(`${URL0()}#token=${auth.userToken}`);
      await ready(fresh);
      assert.equal(await fresh.evaluate(() => window.location.hash), "");
      assert.ok(!fresh.url().includes(auth.userToken));
      await fresh.close();
    }
    // 6) veriler METİN olarak çizilir: görev başlığındaki yük işaretleme olmaz, hiçbir şey çalışmaz (sol listede ve akışta)
    await page.waitForFunction((id: string) => window.AM.state.tasks.some((t: { id: string }) => t.id === id), taskId);
    await page.locator(`[data-am-key="topic:${taskId}"]`).click(); // gerçek tıklama: kenar çubuğundaki konu
    await page.waitForSelector("#feed .am-card--approval");
    const card = page.locator("#feed .am-card--approval", { hasText: "onerror" });
    assert.equal(await card.count(), 1, "the payload shows up as visible text");
    assert.match(await card.innerText(), /<img src=x onerror=/);
    assert.equal(await page.locator("#app img, #app script, #overlayRoot img, #overlayRoot script").count(), 0, "no img/script element was created from data");
    assert.equal(await page.evaluate(() => window.__pwned), undefined);
    assert.equal(await page.evaluate(() => window.__pwned2), undefined);
    // 7) kenar çubuğu ve üç sütun gerçekten var
    assert.equal(await page.locator("#sidebar").isVisible(), true);
    assert.equal(await page.locator("#chatView").isVisible(), true);
    // 8) İzin ver -> AM_DIALOG (window.confirm DEĞİL): GERÇEK eylem + hedef ayrı satırlarda; Vazgeç hiç POST göndermez
    await card.locator("button.am-chat-btn--primary").click();
    await page.waitForSelector(DIALOG);
    assert.match(await page.locator(`${DIALOG} .am-dialog-title`).innerText(), /ONAYLANSIN/);
    assert.equal(await page.locator(`${DIALOG} [data-row="action"] .am-dialog-value`).innerText(), "file.write");
    assert.match(await page.locator(`${DIALOG} [data-row="target"] .am-dialog-value`).innerText(), /browser\.txt$/);
    assert.ok((await page.locator(`${DIALOG} [data-row="detail"]`).innerText()).includes("onerror"), "the dialog also names the task");
    assert.equal(await page.locator(`${DIALOG} img, ${DIALOG} script`).count(), 0, "the dialog renders the title as text too");
    assert.equal(await page.locator(`${DIALOG} [data-action="cancel"]`).innerText(), "Vazgeç");
    await closeDialog(page, "cancel");
    assert.deepEqual(writes, [], "Vazgeç: no write request left the page");
    assert.equal(await stateOf(taskId), "awaiting_approval");
    // Escape de iptaldir
    await card.locator("button.am-chat-btn--primary").click();
    await page.waitForSelector(DIALOG);
    await closeDialog(page, "escape");
    assert.deepEqual(writes, [], "Escape: no write request either");
    // onay düğmesi -> tam olarak POST /api/tasks/:id/approve
    await card.locator("button.am-chat-btn--primary").click();
    await page.waitForSelector(DIALOG);
    const [req] = await Promise.all([
      page.waitForRequest((r: { method(): string; url(): string }) => r.method() === "POST" && r.url().endsWith(`/api/tasks/${taskId}/approve`)),
      page.locator(`${DIALOG} [data-action="confirm"]`).click(),
    ]);
    assert.equal(req.method(), "POST");
    await page.waitForFunction(() => document.getElementById("feed")?.textContent?.includes("Görev onaylandı"));
    assert.deepEqual(writes, [{ method: "POST", path: `/api/tasks/${taskId}/approve` }], "exactly one write: the approval the user confirmed");
    assert.equal(await stateOf(taskId), "approved");
    const audit = (await call("GET", "/api/audit?limit=300")).json.events as Array<{ action: string; initiator: { kind: string } }>;
    assert.ok(audit.some((e) => e.action === "task.approve" && e.initiator.kind === "user"), "the approval is audited as the user's");
    // 9) bidi/satır sonu içeren ajan başlığı etkisizleşir; Reddet de aynı yoldan sorulur
    writes.length = 0;
    await page.locator(`[data-am-key="topic:${denyId}"]`).click();
    await page.waitForFunction(() => document.getElementById("feed")?.textContent?.includes("ZARARSIZ"));
    const card2 = page.locator("#feed .am-card--approval", { hasText: "ZARARSIZ" });
    assert.ok(!(await card2.innerText()).includes("\u202e"), "bidi override is neutralised in the card");
    await card2.locator("button.am-chat-btn--danger").click();
    await page.waitForSelector(DIALOG);
    const seen = await dialogText(page);
    assert.match(seen, /REDDEDİLSİN/);
    assert.ok(!seen.includes("\u202e"), "bidi override is neutralised in the dialog");
    await closeDialog(page, "cancel");
    assert.deepEqual(writes, []);
    assert.equal(await stateOf(denyId), "awaiting_approval", "a cancelled confirmation changes nothing");
    await card2.locator("button.am-chat-btn--danger").click();
    await page.waitForSelector(DIALOG);
    await page.locator(`${DIALOG} [data-action="confirm"]`).click();
    await page.waitForFunction(() => document.getElementById("feed")?.textContent?.includes("Görev reddedildi"));
    assert.deepEqual(writes, [{ method: "POST", path: `/api/tasks/${denyId}/deny` }]);
    assert.equal(await stateOf(denyId), "denied");
    assert.deepEqual(dialogs, [], "the page never used window.confirm/alert/prompt");
    // 10) yanlış belirteç (biçimi geçerli, sunucu 401 der) -> giriş ekranı ve açıklama; belirteç silinir
    const bad = await ctx.newPage();
    await bad.goto(`${URL0()}#token=${"x".repeat(43)}`);
    await bad.waitForSelector("#loginView:not([hidden])");
    assert.match(await bad.locator("#loginMsg").innerText(), /süresi doldu|geçersiz/i);
    assert.equal(await bad.locator("#app").isVisible(), false);
    assert.equal(await bad.evaluate(() => window.sessionStorage.getItem("agentmom.token")), null, "a rejected token is dropped");
    assert.deepEqual(outside, [], "no request ever leaves the machine");
    assert.deepEqual(consoleErrors.filter((e) => !/401|Unauthorized/i.test(e)), [], "no console error besides the expected 401");
  });
});

// ================================================================ 3) yerleşim
test("panel layout holds at every width (320..1600): no horizontal overflow, three columns when wide with the panel open, drawers when narrow; 5000 unbroken characters cannot break it", T60, async () => {
  const hugeTitle = "U".repeat(199);
  const hugeTarget = join(BASE, "x".repeat(500));
  const realHuge = (await asAgent("POST", "/api/tasks", { title: hugeTitle, request: { action: "file.write", target: hugeTarget } })).json.task.id as string;
  await newTask("kisa baslik", "kisa.txt");
  const FAKE_ID = "11111111-1111-4111-8111-111111111111";
  const measure = () => {
    const out: Record<string, number> = { iw: window.innerWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth };
    for (const id of ["app", "main", "chatView", "feed", "topbar", "composerForm", "sidebar", "panel"]) {
      const n = document.getElementById(id);
      out[id] = n ? n.scrollWidth - n.clientWidth : 0;
    }
    return out;
  };
  const fits = (m: Record<string, number>, where: string, skip: string[] = []) => {
    assert.ok((m.doc as number) <= (m.iw as number) && (m.body as number) <= (m.iw as number), `${where}: no horizontal page scroll (doc ${m.doc}, body ${m.body}, window ${m.iw})`);
    for (const id of ["app", "main", "chatView", "feed", "topbar", "composerForm", "sidebar", "panel"]) {
      if (!skip.includes(id)) assert.ok((m[id] as number) <= 1, `${where}: #${id} does not scroll sideways (${m[id]}px)`);
    }
  };
  await withEdge(async (open) => {
    for (const width of [320, 375, 520, 768, 900, 1100, 1279, 1280, 1600]) {
      const { page, ctx } = await open(width, 850, null);
      // gerçek yanıta 5000 karakterlik boşluksuz başlık/hedefli sahte bir görev eklenir (çekirdek bunu kısaltır, düzen yine bozulmamalı)
      await page.route("**/api/tasks", async (route: any) => {
        const resp = await route.fetch();
        const json = await resp.json();
        json.tasks.push({ id: FAKE_ID, title: "H".repeat(5000), state: "awaiting_approval", requestedAction: "file.write", request: { target: "/" + "t".repeat(5000) }, decision: "", createdAt: new Date().toISOString() });
        await route.fulfill({ response: resp, json });
      });
      await page.goto(`${URL0()}#token=${auth.userToken}`);
      await ready(page);
      await page.waitForFunction((id: string) => window.AM.state.tasks.some((t: { id: string }) => t.id === id), FAKE_ID);
      const mode = width >= 1280 ? "wide" : width >= 900 ? "medium" : "narrow";
      assert.equal(await page.locator("#app").getAttribute("data-layout"), mode, `layout mode at ${width}px`);
      fits(await page.evaluate(measure), `${width}px home`);
      const composer = await page.locator("#composerForm").boundingBox();
      assert.ok(composer && composer.x >= 0 && composer.x + composer.width <= width + 1, `${width}px: composer inside the viewport`);
      // sol sütun: geniş/orta genişlikte görünür, dar genişlikte kapalı çekmece
      const sidebarVisible = await page.locator("#sidebar").isVisible();
      if (width >= 900) assert.ok(sidebarVisible, `${width}px: the sidebar is a column`);
      else assert.ok(!sidebarVisible, `${width}px: the sidebar is a closed drawer`);
      assert.equal(await page.locator("#panel").isVisible(), false, `${width}px: the overview panel starts closed`);

      // gerçek uzun görev (199 + 500 karakter) ve sahte 5000 karakterlik görev: onay kartı ve düğmeleri görünür alanda
      for (const [id, label] of [[realHuge, "199/500 chars"], [FAKE_ID, "5000 chars"]] as const) {
        await selectTopic(page, id);
        await page.waitForSelector("#feed .am-card--approval");
        const m = await page.evaluate(measure);
        fits(m, `${width}px ${label}`);
        const btn = await page.locator("#feed .am-card--approval").last().locator("button.am-chat-btn--primary").boundingBox();
        assert.ok(btn && btn.x >= 0 && btn.x + btn.width <= width + 1, `${width}px ${label}: the permission button is reachable`);
      }
      // onay penceresi: uzun metinle de ekrana sığar
      await page.locator("#feed .am-card--approval").last().locator("button.am-chat-btn--primary").click();
      await page.waitForSelector(DIALOG);
      const dlg = await page.locator(DIALOG).boundingBox();
      assert.ok(dlg && dlg.x >= 0 && dlg.x + dlg.width <= width + 1, `${width}px: the dialog fits (x ${dlg?.x}, w ${dlg?.width})`);
      fits(await page.evaluate(measure), `${width}px dialog open`);
      await closeDialog(page, "cancel");
      // 5000 karakterlik boşluksuz serbest metin: kullanıcı mesajı ve soru penceresi düzeni bozmaz
      const input = page.locator("#composerInput");
      await input.fill("Z".repeat(5000));
      await input.press("Enter");
      await page.waitForSelector(DIALOG);
      const dlg2 = await page.locator(DIALOG).boundingBox();
      assert.ok(dlg2 && dlg2.x >= 0 && dlg2.x + dlg2.width <= width + 1, `${width}px: the free-text dialog fits`);
      await closeDialog(page, "cancel");
      fits(await page.evaluate(measure), `${width}px after 5000-char message`);

      // sağ 'Genel bakış' paneli: geniş ekranda üçüncü sütun, daha dar ekranda sağdan çekmece
      await page.keyboard.press("Control+.");
      await page.waitForSelector('#app[data-panel="open"]');
      await page.waitForFunction((w: number) => { const r = document.getElementById("panel").getBoundingClientRect(); return r.width > 100 && r.right <= w + 1 && r.left >= 0; }, width);
      assert.equal(await page.locator("#panel").isVisible(), true, `${width}px: the panel opens`);
      const pb = await page.locator("#panel").boundingBox();
      assert.ok(pb && pb.x >= 0 && pb.x + pb.width <= width + 1, `${width}px: the panel is inside the viewport`);
      fits(await page.evaluate(measure), `${width}px panel open`);
      if (width >= 1280) {
        const sb = await page.locator("#sidebar").boundingBox();
        const mb = await page.locator("#main").boundingBox();
        assert.ok(sb && mb && sb.x + sb.width <= mb.x + 1 && mb.x + mb.width <= pb.x + 1, `${width}px: three columns side by side (sidebar | chat | panel)`);
        assert.equal(await page.locator("#app").getAttribute("data-drawer"), "", "wide: the panel is a column, not a drawer");
        await page.keyboard.press("Control+.");
        await page.waitForSelector('#app[data-panel="closed"]');
      } else {
        assert.equal(await page.locator("#app").getAttribute("data-drawer"), "right", `${width}px: the panel is a right drawer`);
        assert.equal(await page.locator("#scrim").isVisible(), true, "the drawer has a scrim");
        await page.keyboard.press("Escape");
        await page.waitForSelector('#app[data-panel="closed"]');
        assert.equal(await page.locator("#app").getAttribute("data-drawer"), "");
      }
      // dar ekranda sol çekmece
      if (width < 900) {
        await page.locator("#shellSidebarBtn").click();
        await page.waitForSelector('#app[data-drawer="left"]');
        await page.waitForFunction((w: number) => { const r = document.getElementById("sidebar").getBoundingClientRect(); return r.width > 100 && r.left >= -1 && r.right <= w + 1; }, width);
        assert.equal(await page.locator("#sidebar").isVisible(), true, `${width}px: the session drawer opens`);
        fits(await page.evaluate(measure), `${width}px sidebar drawer`);
        await page.keyboard.press("Escape");
        await page.waitForSelector('#app[data-drawer=""]');
      }
      await ctx.close();
    }
  });
});

// ================================================================ 4) beyaz ekran yok
test("panel never white-screens: a server 500, an unloadable script file, a render crash and empty data all end in a readable state; the provider that cannot run is labelled and nothing steps in for it", T60, async () => {
  await withEdge(async (open) => {
    // (a) bir uç düşer -> hangi uç olduğunu söyleyen okunur hata kartı, kalan her şey çizilir; yeniden dene toparlar
    {
      const { page, ctx } = await open(1300, 800, null);
      await page.route("**/api/skills", (r: any) => r.abort());
      await page.goto(`${URL0()}#token=${auth.userToken}`);
      await page.waitForSelector("#errorCard:not([hidden])");
      assert.equal(await page.locator("#errorCard").getAttribute("role"), "alert");
      const t = await page.locator("#errorCard").innerText();
      assert.match(t, /Bir şey ters gitti/);
      assert.match(t, /\/api\/skills/, "the card names the failing endpoint");
      assert.equal(await page.locator("#app").isVisible(), true, "the app stays on screen");
      assert.match(await page.locator("#chatView").innerText(), /Merhaba/, "the rest still renders");
      await page.unroute("**/api/skills");
      await page.locator("#errorRetry").click();
      await page.waitForSelector("#errorCard", { state: "hidden" });
      await ctx.close();
    }
    // (b) her şey 500 -> okunur hata kartı, sayfa boş değil
    {
      const { page, ctx } = await open(1300, 800, null);
      await page.route("**/api/**", (r: any) => r.fulfill({ status: 500, contentType: "application/json", body: '{"error":"internal error"}' }));
      await page.goto(`${URL0()}#token=${auth.userToken}`);
      await page.waitForSelector("#errorCard:not([hidden])");
      assert.match(await page.locator("#errorCard").innerText(), /\(500/, "the card shows the status");
      assert.ok((await page.locator("body").innerText()).trim().length > 40, "the page is not blank");
      assert.equal(await page.locator("#app").isVisible(), true);
      await ctx.close();
    }
    // (c) bir betik dosyası yüklenemez (chat.js 404) -> okunur hata kartı eksik dosya adını söyler, beyaz ekran değil
    {
      const { page, ctx } = await open(1300, 800, null);
      await page.route("**/ui/chat.js", (r: any) => r.fulfill({ status: 404, contentType: "text/plain", body: "yok" }));
      await recordErrorCard(page);
      await page.goto(`${URL0()}#token=${auth.userToken}`);
      await ready(page);
      await page.waitForFunction(() => window.__errSeen.length > 0);
      const t = (await page.evaluate(() => window.__errSeen)) as string[];
      assert.ok(t.some((x) => /chat\.js/.test(x) && /Bir şey ters gitti/.test(x)), `the card named the missing file when it appeared (${JSON.stringify(t)})`);
      await ctx.close();
    }
    // (c2) çeviri dosyası yüklenemez (strings.js 404) -> ham Türkçe yedek metinle yine okunur kart
    {
      const { page, ctx } = await open(1300, 800, null);
      await page.route("**/ui/strings.js", (r: any) => r.fulfill({ status: 404, contentType: "text/plain", body: "yok" }));
      await recordErrorCard(page);
      await page.goto(`${URL0()}#token=${auth.userToken}`);
      await page.waitForFunction(() => window.__errSeen.length > 0);
      const t = (await page.evaluate(() => window.__errSeen)) as string[];
      assert.ok(t.some((x) => /Bir şey ters gitti/.test(x) && /eksik/.test(x)), `the raw-text card appeared (${JSON.stringify(t)})`);
      await ctx.close();
    }
    // (d) başlangıçtan sonra bir modülün çizimi çöker -> hata kartı (modül adı + neden), sonra düzelince toparlanır
    {
      const { page, ctx } = await open(1300, 800);
      await ready(page);
      await page.evaluate(() => { window.__orig = window.AM_CHAT.render; window.AM_CHAT.render = () => { throw new Error("kasitli-cokme"); }; });
      await page.evaluate(() => { void window.AM.actions.refresh(); });
      await page.waitForSelector("#errorCard:not([hidden])");
      const t = await page.locator("#errorCard").innerText();
      assert.match(t, /kasitli-cokme/);
      assert.match(t, /chat\.js/, "the card names the module that crashed");
      assert.equal(await page.locator("#app").isVisible(), true);
      await page.evaluate(() => { window.AM_CHAT.render = window.__orig; });
      await page.locator("#errorRetry").click();
      await page.waitForSelector("#errorCard", { state: "hidden" });
      await ctx.close();
    }
    // (e) boş veri -> dostça boş durumlar, hata yok
    {
      const { page, ctx } = await open(1300, 800, null);
      const empty: Record<string, unknown> = {
        "/api/tasks": { tasks: [] }, "/api/assumption-debt": { debt: [] }, "/api/decisions": { decisions: [] },
        "/api/skills": { skills: [] }, "/api/providers": { providers: [] }, "/api/subsessions": { subsessions: [] },
        "/api/backup/status": { backup: { lastBackup: null, ageHours: null, changesSince: 0, lastVerify: null, lastDecision: null, warnings: [], config: { minChanges: 8, idleMinutes: 10, staleDays: 3 } } },
        "/api/policy": { policy: { contractId: "c", allowedActions: [], approvalRequiredActions: [], allowedDirs: [], forbiddenDirs: [], trustedRepos: [], allowedProviders: [], paidRoute: "none", maxRuntimeMs: 1000 } },
      };
      await page.route("**/api/**", (r: any) => {
        const p = new URL(r.request().url()).pathname;
        return Object.hasOwn(empty, p) ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(empty[p]) }) : r.fulfill({ status: 404, contentType: "application/json", body: "{}" });
      });
      await page.goto(`${URL0()}#token=${auth.userToken}`);
      await ready(page);
      await page.waitForTimeout(500);
      assert.equal(await page.locator("#errorCard").isVisible(), false, "empty data is not an error");
      assert.match(await page.locator("#chatView").innerText(), /Merhaba/, "the welcome view is shown");
      assert.ok((await page.locator("#sidebar").innerText()).trim().length > 10, "the sidebar says something (empty state)");
      await page.keyboard.press("Control+.");
      await page.waitForSelector('#app[data-panel="open"]');
      assert.ok((await page.locator("#panel").innerText()).trim().length > 10, "the panel shows an empty state");
      await ctx.close();
    }
    // (f) çalışamayan sağlayıcı etiketlenir; yerine başkası gösterilmez ya da seçilmez
    {
      const { page, ctx } = await open(1300, 900, null);
      const tid = "22222222-2222-4222-8222-222222222222";
      const prov = { providers: [{ id: "gemini", displayName: "Gemini CLI", routeKind: "subscription", capabilities: [{ operation: "execute", status: "unavailable" }, { operation: "testConnection", status: "partial" }] }, { id: "codex", displayName: "Codex CLI", routeKind: "subscription", capabilities: [{ operation: "execute", status: "partial" }] }, { id: "qwen", displayName: "Qwen CLI", routeKind: "subscription", capabilities: [{ operation: "execute", status: "unavailable" }, { operation: "testConnection", status: "unavailable" }] }] };
      const tasks = { tasks: [{ id: tid, title: "qwen görevi", state: "awaiting_approval", requestedAction: "file.write", request: { target: "x.txt" }, decision: "", createdAt: new Date().toISOString() }] };
      const subs = { subsessions: [{ id: "33333333-3333-4333-8333-333333333333", name: "Qwen oturumu", provider: "qwen", model: null, modelSource: "unknown", state: "idle", pinned: false, archived: false, unread: false, updatedAt: new Date().toISOString(), taskId: tid, steps: null, renameCount: 0 }] };
      await page.route("**/api/providers", (r: any) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prov) }));
      await page.route("**/api/tasks", (r: any) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tasks) }));
      await page.route("**/api/subsessions", (r: any) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(subs) }));
      await page.goto(`${URL0()}#token=${auth.userToken}`);
      await ready(page);
      await page.waitForFunction(() => window.AM.state.providers.length === 3 && window.AM.state.tasks.length === 1);
      // genel bakış panelinde: sağlayıcılar bölümü açılır
      await page.keyboard.press("Control+.");
      await page.waitForSelector('#app[data-panel="open"]');
      await page.locator('#panel [data-pn-tab="overview"]').click();
      await page.locator('#panel [data-pn-ov="providers"]').click();
      await page.waitForSelector('#panel [aria-expanded="true"][data-pn-ov="providers"]');
      const ov = page.locator("#panel .am-pn-ov").filter({ has: page.locator('[data-pn-ov="providers"]') });
      const text = await ov.innerText();
      assert.match(text, /KULLANILAMIYOR/);
      assert.match(text, /Otomatik geçiş yok/);
      assert.ok(!/yedek sağlayıcı|otomatik olarak .* devreye/i.test(text), "no replacement provider is suggested");
      const gem = ov.locator(".am-pn-ovitem", { hasText: "Gemini CLI" });
      const cdx = ov.locator(".am-pn-ovitem", { hasText: "Codex CLI" });
      const qwn = ov.locator(".am-pn-ovitem", { hasText: "Qwen CLI" });
      assert.match(await gem.innerText(), /KULLANILAMIYOR/);
      assert.match(await qwn.innerText(), /KULLANILAMIYOR/);
      assert.ok(!/KULLANILAMIYOR/.test(await cdx.innerText()), "the other provider is not mislabelled, nor presented as a stand-in");
      // giriş alanındaki model rozeti: bu konunun sağlayıcısı kullanılamıyor, başka bir model adı yazılmaz
      await selectTopic(page, tid);
      await page.waitForFunction(() => document.getElementById("modelBadge")?.textContent?.includes("KULLANILAMIYOR"));
      const badge = await page.locator("#modelBadge").innerText();
      assert.match(badge, /qwen/i);
      assert.ok(!/codex|gemini|claude/i.test(badge), "the badge does not substitute another provider");
      await ctx.close();
    }
  });
});

// GERÇEK KAYNAK HATASI (chat.js providerBad ile panel.js providerInfo çelişiyor): paneldeki sağlayıcı kartı 'execute' uygulanamıyorsa (başka yetenek kısmi olsa bile) KULLANILAMIYOR der,
// ama sohbetteki model rozeti yalnız TÜM yetenekler kullanılamazsa der; 'execute'u kullanılamayan sağlayıcıya bağlı konuda rozet yine de normal görünür. Düzelince todo kaldırılmalı.
test("the composer badge agrees with the overview panel: a provider whose execute capability is unavailable is labelled KULLANILAMIYOR in both", { ...T60 }, async () => {
  await withEdge(async (open) => {
    const { page, ctx } = await open(1300, 900, null);
    const tid = "44444444-4444-4444-8444-444444444444";
    const prov = { providers: [{ id: "gemini", displayName: "Gemini CLI", routeKind: "subscription", capabilities: [{ operation: "execute", status: "unavailable" }, { operation: "testConnection", status: "partial" }] }] };
    const tasks = { tasks: [{ id: tid, title: "gemini görevi", state: "awaiting_approval", requestedAction: "file.write", request: { target: "x.txt" }, decision: "", createdAt: new Date().toISOString() }] };
    const subs = { subsessions: [{ id: "55555555-5555-4555-8555-555555555555", name: "Gemini oturumu", provider: "gemini", model: null, modelSource: "unknown", state: "idle", pinned: false, archived: false, unread: false, updatedAt: new Date().toISOString(), taskId: tid, steps: null, renameCount: 0 }] };
    await page.route("**/api/providers", (r: any) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prov) }));
    await page.route("**/api/tasks", (r: any) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tasks) }));
    await page.route("**/api/subsessions", (r: any) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(subs) }));
    await page.goto(`${URL0()}#token=${auth.userToken}`);
    await ready(page);
    await page.waitForFunction(() => window.AM.state.providers.length === 1 && window.AM.state.tasks.length === 1);
    await selectTopic(page, tid);
    await page.waitForTimeout(800);
    assert.match(await page.locator("#modelBadge").innerText(), /KULLANILAMIYOR/);
    await ctx.close();
  });
});

// GERÇEK KAYNAK HATASI (core.js refresh): eksik modül hatası initModules'ta gösterilir, ama hemen ardından gelen İLK başarılı veri yenilemesi hideError() ile kartı siler;
// kullanıcı, sohbeti/üst çubuğu olmayan boş bir uygulama görür ve nedenini okuyamaz. Düzelince bu test todo olmaktan çıkarılmalı.
test("a missing script file keeps its error card on screen after the data has loaded (the card is not wiped by the next successful refresh)", { ...T60 }, async () => {
  await withEdge(async (open) => {
    for (const file of ["chat.js", "strings.js"]) {
      const { page, ctx } = await open(1300, 800, null);
      await page.route(`**/ui/${file}`, (r: any) => r.fulfill({ status: 404, contentType: "text/plain", body: "yok" }));
      await page.goto(`${URL0()}#token=${auth.userToken}`);
      await page.waitForSelector("#app:not([hidden])");
      await page.waitForFunction(() => window.AM && window.AM.state.updatedAt);
      await page.waitForTimeout(800);
      assert.equal(await page.locator("#errorCard").isVisible(), true, `${file}: the error is still on screen once the data has loaded`);
      assert.ok((await page.locator("body").innerText()).trim().length > 40, `${file}: the page is not blank`);
      await ctx.close();
    }
  });
});

// core.js yüklenemezse hiçbir betik çalışmaz: sayfa iskeleti tek başına okunur bir şey göstermeli. Şu an GÖSTERMİYOR (kaynakta gerçek eksik; rapora yazıldı), bu yüzden todo.
test("panel never white-screens even when core.js itself cannot load (static fallback in the page)", { ...T60 }, async () => {
  await withEdge(async (open) => {
    const { page, ctx } = await open(1300, 800, null);
    await page.route("**/ui/core.js", (r: any) => r.fulfill({ status: 404, contentType: "text/plain", body: "yok" }));
    await page.goto(`${URL0()}#token=${auth.userToken}`);
    await page.waitForTimeout(1500);
    assert.ok((await page.locator("body").innerText()).trim().length > 10, "the page is not blank");
    await ctx.close();
  });
});

// ================================================================ 5) komutlar
test("panel commands in a real browser: Ctrl+K palette opens and Esc closes it; slash commands answer locally, an unknown one says so, free text opens the 'Yeni görev kaydı' dialog and Vazgeç sends no POST", T60, async () => {
  const before = (await call("GET", "/api/tasks")).json.tasks.length;
  await withEdge(async (open) => {
    const { page } = await open(1300, 850);
    await ready(page);
    const writes = trackWrites(page);
    const dialogs: string[] = [];
    page.on("dialog", (d: any) => { dialogs.push(d.message()); void d.dismiss(); });
    // Ctrl+K paleti
    const pal = '.am-overlay[data-owner="palette"] [role="dialog"]';
    await page.keyboard.press("Control+k");
    await page.waitForSelector(pal);
    assert.equal(await page.locator(pal).isVisible(), true);
    assert.equal(await page.evaluate(() => window.AM_PALETTE.isOpen()), true);
    await page.keyboard.press("Escape");
    await page.waitForSelector(pal, { state: "hidden" });
    assert.equal(await page.evaluate(() => window.AM_PALETTE.isOpen()), false);
    await page.keyboard.press("Control+k");
    await page.waitForSelector(pal);
    await page.keyboard.press("Control+k");
    await page.waitForSelector(pal, { state: "hidden" });
    // eğik çizgi komutları yerelde yanıtlanır
    const input = page.locator("#composerInput");
    await input.fill("/durum");
    await input.press("Enter");
    await page.waitForFunction(() => /\d+ görev, \d+ bekleyen, \d+ kırık, \d+ gözden geçirme/.test(document.getElementById("feed")?.textContent ?? ""));
    await input.fill("/yardim");
    await input.press("Enter");
    await page.waitForFunction(() => document.getElementById("feed")?.textContent?.includes("/saglayicilar"));
    await input.fill("/borc");
    await input.press("Enter");
    await input.fill("/bilinmeyenkomut");
    await input.press("Enter");
    await page.waitForFunction(() => document.getElementById("feed")?.textContent?.includes("Bilinmeyen komut"));
    assert.ok((await page.locator("#feed .am-chat-msg--user").count()) >= 4, "typed lines appear as user messages");
    assert.deepEqual(writes, [], "slash commands send no write request");
    // serbest metin: yalnız görev KAYDI önerilir; Vazgeç -> hiçbir POST yok
    await input.fill("Yeni bir özellik ekle");
    await input.press("Enter");
    await page.waitForSelector(DIALOG);
    assert.match(await page.locator(`${DIALOG} .am-dialog-title`).innerText(), /Yeni görev kaydı/);
    assert.equal(await page.locator(`${DIALOG} [data-row="action"] .am-dialog-value`).innerText(), "task.create");
    assert.ok((await dialogText(page)).includes("Yeni bir özellik ekle"), "the dialog quotes the typed text");
    await closeDialog(page, "cancel");
    await page.waitForFunction(() => document.getElementById("feed")?.textContent?.includes("Görev kaydı iptal edildi"));
    assert.deepEqual(writes, [], "declined: no POST /api/tasks left the page");
    assert.equal((await call("GET", "/api/tasks")).json.tasks.length, before, "declined: nothing was created");
    // Escape de iptaldir
    await input.fill("Başka bir fikir");
    await input.press("Enter");
    await page.waitForSelector(DIALOG);
    await closeDialog(page, "escape");
    assert.deepEqual(writes, []);
    assert.equal((await call("GET", "/api/tasks")).json.tasks.length, before);
    // onaylanırsa tam bir görev KAYDI açılır, ajan ya da sağlayıcı başlamaz
    await input.fill("Onaylanan kayıt");
    await input.press("Enter");
    await page.waitForSelector(DIALOG);
    await page.locator(`${DIALOG} [data-action="confirm"]`).click();
    await page.waitForFunction(() => document.getElementById("feed")?.textContent?.includes("Ajan başlatılmadı"));
    assert.deepEqual(writes, [{ method: "POST", path: "/api/tasks" }]);
    const after = (await call("GET", "/api/tasks")).json.tasks as Array<{ title: string; state: string }>;
    assert.equal(after.length, before + 1);
    assert.ok(after.some((t) => t.title === "Onaylanan kayıt" && t.state !== "running"), "a task record exists and nothing is running");
    // /temizle yazışmayı siler
    await input.fill("/temizle");
    await input.press("Enter");
    await page.waitForFunction(() => document.querySelectorAll("#feed .am-chat-msg--user").length === 0);
    assert.deepEqual(dialogs, [], "no window.confirm/alert/prompt");
  });
});

// ================================================================ 6) onay çekirdeğin kendi kaydına bağlı
test("panel approval is bound to the core's own record: a forged object cannot approve an unknown or already-decided task, and the dialog shows the REAL title/action/target", T60, async () => {
  const realId = await newTask("gercek-baslik", "gercek.txt");
  const decidedId = await newTask("zaten-onayli", "onayli.txt");
  await withEdge(async (open) => {
    const { page } = await open(1400, 900);
    await ready(page);
    await page.waitForFunction((ids: string[]) => ids.every((i) => window.AM.state.tasks.some((t: { id: string }) => t.id === i)), [realId, decidedId]);
    const writes = trackWrites(page);
    const dialogs: string[] = [];
    page.on("dialog", (d: any) => { dialogs.push(d.message()); void d.dismiss(); });
    // eylem nesnesi donmuş: modül ezemez
    assert.equal(await page.evaluate(() => Object.isFrozen(window.AM.actions) && Object.isFrozen(window.AM)), true);
    await page.evaluate(() => { try { window.AM.actions.approve = () => "pwn"; } catch { /* donmuş */ } });
    assert.equal(await page.evaluate(() => typeof window.AM.actions.approve), "function");
    // sahte nesne GERÇEK bir görevin id'sini taşır ama başlık/eylem/hedef farklı: pencere çekirdeğin kaydını gösterir
    await page.evaluate((id: string) => { void window.AM.actions.approve({ id, title: "masum-gorunumlu", requestedAction: "file.read", request: { target: "/etc/passwd" }, state: "awaiting_approval" }); }, realId);
    await page.waitForSelector(DIALOG);
    const t1 = await dialogText(page);
    assert.ok(t1.includes("gercek-baslik") && /file\.write/.test(t1) && /gercek\.txt/.test(t1), "the dialog shows the core's record");
    assert.ok(!t1.includes("masum-gorunumlu") && !t1.includes("/etc/passwd") && !t1.includes("file.read"), "nothing of the forged object reaches the dialog");
    await closeDialog(page, "cancel");
    assert.deepEqual(writes, [], "cancelled: no POST");
    // Reddet için de aynısı
    await page.evaluate((id: string) => { void window.AM.actions.deny({ id, title: "sahte" }); }, realId);
    await page.waitForSelector(DIALOG);
    const t2 = await dialogText(page);
    assert.ok(t2.includes("gercek-baslik") && !t2.includes("sahte") && /REDDEDİLSİN/.test(t2));
    await closeDialog(page, "cancel");
    // bilinmeyen / bozuk kimlikler: pencere yok, yazma yok
    const bogus: unknown[] = [{ id: "00000000-0000-0000-0000-000000000000", title: "x" }, { id: "../etc" }, { id: 123 }, { id: "" }, {}, null, undefined, "metin", { id: realId + "x" }, { id: realId.toUpperCase() }];
    for (const b of bogus) {
      await page.evaluate((o: unknown) => { void window.AM.actions.approve(o); void window.AM.actions.deny(o); }, b);
    }
    await page.waitForTimeout(600);
    assert.equal(await page.locator(DIALOG).count(), 0, "an unknown or malformed id opens no dialog");
    assert.deepEqual(writes, [], "an unknown or malformed id sends nothing");
    // başka yerde karara bağlanan görev: yenilemeden sonra çekirdeğin kaydı 'approved'; sahte nesne onu yeniden onaylatamaz
    assert.equal((await call("POST", `/api/tasks/${decidedId}/approve`, {})).status, 200);
    await page.evaluate(() => { void window.AM.actions.refresh(); });
    await page.waitForFunction((id: string) => window.AM.state.tasks.find((t: { id: string }) => t.id === id)?.state === "approved", decidedId);
    await page.evaluate((id: string) => { void window.AM.actions.approve({ id, title: "x", state: "awaiting_approval" }); void window.AM.actions.deny({ id, title: "x", state: "awaiting_approval" }); }, decidedId);
    await page.waitForTimeout(600);
    assert.equal(await page.locator(DIALOG).count(), 0, "a task that is no longer waiting opens no dialog");
    assert.deepEqual(writes, [], "and sends nothing");
    assert.deepEqual(dialogs, []);
  });
  assert.equal(await stateOf(realId), "awaiting_approval", "the real task was never touched");
  assert.equal(await stateOf(decidedId), "approved", "the decided task stays as decided");
  // sunucu tarafı da aynı kuralı korur: ikinci onay/ret kabul edilmez, durum değişmez
  assert.ok((await call("POST", `/api/tasks/${decidedId}/approve`, {})).status >= 400);
  assert.ok((await call("POST", `/api/tasks/${decidedId}/deny`, {})).status >= 400);
  assert.equal(await stateOf(decidedId), "approved");
});

// ================================================================ ek: /api/help ve /api/policy
test("GET /api/help/:name serves only the four fixed repository documents, to the user only; no path can be built from the request", async () => {
  const ok = await call("GET", "/api/help/egitim");
  assert.equal(ok.status, 200);
  assert.equal(ok.json.name, "egitim");
  assert.equal(typeof ok.json.text, "string");
  assert.ok(ok.json.text.length > 100, "the document has text");
  assert.equal(typeof ok.json.truncated, "boolean");
  assert.ok(!ok.json.text.includes(auth.userToken) && !ok.json.text.includes(agentToken));
  for (const name of ["harita", "el-kitabi", "guvenlik"]) {
    const r = await call("GET", `/api/help/${name}`);
    assert.ok(r.status === 200 || r.status === 404, `${name}: served or reported missing, never an error page (${r.status})`);
  }
  for (const path of ["/api/help/../x", "/api/help/%2e%2e%2fx", "/api/help/..%2f..%2fpackage.json", "/api/help/package", "/api/help/EGITIM", "/api/help/egitim/ek", "/api/help/", "/api/help", "/api/help/__proto__", "/api/help/constructor"]) {
    const r = await call("GET", path);
    assert.equal(r.status, 404, `${path} -> ${r.status}`);
    assert.ok(!JSON.stringify(r.json).includes("name"), `${path}: no document leaks`);
  }
  assert.equal((await asAgent("GET", "/api/help/egitim")).status, 403, "an agent token cannot read help documents");
  assert.equal((await call("GET", "/api/help/egitim", undefined, {}, null)).status, 401, "no token, no document");
  assert.equal((await call("POST", "/api/help/egitim", {})).status, 404, "only GET");
});

test("GET /api/policy is user-only and carries no secret or token-like field", async () => {
  const r = await call("GET", "/api/policy");
  assert.equal(r.status, 200);
  const p = r.json.policy;
  assert.ok(p && typeof p === "object");
  assert.deepEqual(Object.keys(p).sort(), ["allowedActions", "allowedDirs", "allowedProviders", "approvalRequiredActions", "contractId", "forbiddenDirs", "maxRuntimeMs", "paidRoute", "trustedRepos"]);
  const dump = JSON.stringify(r.json);
  assert.ok(!dump.includes(auth.userToken) && !dump.includes(agentToken) && !dump.includes(FAKE_KEY), "no token or key in the policy summary");
  const keys: string[] = [];
  const walk = (v: unknown) => { if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { keys.push(k); walk(x); } };
  walk(r.json);
  assert.ok(!keys.some((k) => /token|secret|password|apikey|api_key|credential|authorization/i.test(k)), `no secret-looking field name (${keys.join(",")})`);
  assert.ok(!/Bearer\s|#token=/.test(dump));
  assert.equal((await asAgent("GET", "/api/policy")).status, 403, "an agent token cannot read the policy summary");
  assert.equal((await call("GET", "/api/policy", undefined, {}, null)).status, 401);
  assert.equal((await call("POST", "/api/policy", {})).status, 404, "the policy cannot be changed from here");
  assert.equal((await call("PUT", "/api/policy", {})).status, 404);
});
