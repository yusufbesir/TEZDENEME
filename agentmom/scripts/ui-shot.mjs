// Opens the running AgentMom panel in a real (isolated, headless) Edge, prints console errors, writes window screenshots. Owner: Claude [IP:AgentMom Faz 11].
// Needs the server running. Usage: node scripts/ui-shot.mjs <outDir> [name:width:height ...] [--do=<action>]. The token is read from the state folder, never printed.
import { readFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const root = process.cwd();
const state = resolve(process.env.AGENTMOM_STATE_DIR ?? join(root, "..", "agentmom-state"));
const token = readFileSync(join(state, "token", "session.token"), "utf8").trim();
const base = `http://127.0.0.1:${process.env.AGENTMOM_PORT ?? 8787}`;
const out = resolve(process.argv[2] ?? "docs/testing/faz11");
mkdirSync(out, { recursive: true });
const sizes = process.argv.slice(3).filter((a) => !a.startsWith("--")).map((a) => a.split(":"));
if (sizes.length === 0) sizes.push(["ui-masaustu", "1280", "800"], ["ui-dar", "520", "820"]);
const actions = process.argv.filter((a) => a.startsWith("--do=")).map((a) => a.slice(5));

const browser = await chromium.launch({ channel: "msedge", headless: true });
for (const [name, w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(`${m.type()}: ${m.text().slice(0, 300).replaceAll(token, "[gizli]")}`); });
  page.on("pageerror", (e) => errs.push(`pageerror: ${String(e.message).slice(0, 300).replaceAll(token, "[gizli]")}`));
  await page.goto(`${base}/#token=${token}`);
  await page.waitForTimeout(2500);
  for (const a of actions) {
    // ÖRNEK VERİ (fixture): gerçek veritabanına dokunmaz; yalnız bu sayfadaki bellek durumuna yazılır ve 15 sn'lik yoklamadan önce görüntü alınır.
    if (a === "demo") {
      // Kanıt uçları da örnek JSON ile yanıtlanır (görev kimlikleri gerçek değil).
      await page.route("**/api/tasks/*/evidence", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ evidence: route.request().url().includes("-000000000002/evidence") ? [{ kind: "plan", summary: "Planlayıcı · Claude: 3 adım çıkardı (kayıt, harita, doğrulama)", createdAt: new Date(Date.now() - 54 * 60000).toISOString() }, { kind: "test", summary: "369 test geçti, 0 kaldı", createdAt: new Date(Date.now() - 50 * 60000).toISOString() }] : [] }) }));
      await page.evaluate(() => {
        const U = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
        const now = Date.now();
        const iso = (m) => new Date(now - m * 60000).toISOString();
        AM.state.tasks = [
          { id: U(1), title: "Faz 11: sol menü bileşenlerini tamamla", state: "awaiting_approval", requestedAction: "file.write", request: { target: "D:/YusufII/Projeler/agentmom/src/server/ui/sidebar.js" }, decision: "", createdAt: iso(3) },
          { id: U(2), title: "Bulguları arayüz haritasına işle", state: "succeeded", requestedAction: "task.create", request: null, decision: "allow", createdAt: iso(55) },
          { id: U(3), title: "Yedek geri yükleme denemesi", state: "failed", requestedAction: "verification.run", request: { target: "D:/YusufII/Projeler/agentmom-yedek" }, decision: "", createdAt: iso(180) },
        ];
        AM.state.evidence[U(2)] = [{ kind: "plan", summary: "Planlayıcı · Claude: 3 adım çıkardı (kayıt, harita, doğrulama)", createdAt: iso(54) }, { kind: "test", summary: "369 test geçti, 0 kaldı", createdAt: iso(50) }];
        AM.state.subsessions = [
          { id: U(11), name: "Yardımcı 1 (OPUS)", roleHint: "Planlayıcı", provider: "claude-code", model: "claude-opus-5-5", modelSource: "run", state: "running", pinned: true, archived: false, unread: false, updatedAt: iso(1), taskId: U(1), steps: { done: 3, total: 5 }, renameCount: 1 },
          { id: U(12), name: "YARDIMCI 2 (HAIKU)", roleHint: "Tarayıcı", provider: "claude-code", model: "claude-sonnet-5-5", modelSource: "run", state: "idle", pinned: true, archived: false, unread: false, updatedAt: iso(30), taskId: null, steps: null, renameCount: 1 },
          { id: U(13), name: "Denetmen", roleHint: "Doğrulayıcı", provider: "gemini", model: null, modelSource: "unknown", state: "unavailable", pinned: false, archived: false, unread: false, updatedAt: iso(300), taskId: null, steps: null, renameCount: 0 },
        ];
        AM.state.ctx = { tokens: 121000, limit: 150000, pct: 80.7, source: "run" };
      });
      await page.evaluate(() => AM.actions.selectTopic("00000000-0000-4000-8000-000000000001"));
      await page.waitForTimeout(900);
    }
    if (a === "topic2") { await page.evaluate(() => AM.actions.selectTopic("00000000-0000-4000-8000-000000000002")); await page.waitForTimeout(900); }
    if (a === "yedek") { await page.keyboard.press("Control+,"); await page.waitForTimeout(500); await page.locator("#overlayRoot").getByText("Yedekleme", { exact: true }).first().click(); await page.waitForTimeout(900); }
    if (a === "genelbakis") { await page.keyboard.press("Control+."); await page.waitForTimeout(500); await page.locator("#panel").getByText("Genel bakış", { exact: true }).first().click(); await page.waitForTimeout(700); }
    if (a.startsWith("page:")) { const [, id, param] = a.split(":"); await page.evaluate(([i, p]) => { AM.actions.navigate(i); if (p) { AM.actions.setView({ page: i, pageParam: p }); AM.actions.loadData("providerDetail", p); } }, [id, param || ""]); await page.waitForTimeout(1800); }
    if (a === "usage-demo") {
      // ÖRNEK VERİ (fixture): /api/usage yanıtı yalnız bu sayfada örnek JSON ile değiştirilir.
      await page.route("**/api/usage", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ updatedAt: new Date().toISOString(), topics: 71, tokens: { input: 6300000, output: 12600000, cacheWrite: 77800000, cacheRead: 1800000000 }, cacheHitPct: 96, codeChanges: { added: 2600000, removed: 821 }, byModel: [{ model: "claude-sonnet-5-5", input: 4000000, output: 10700000, cacheWrite: 65400000, cacheRead: 1500000000, topics: 37 }, { model: "claude-opus-5-5", input: 1900000, output: 353500, cacheWrite: 2500000, cacheRead: 61900000, topics: 17 }], topicsTable: [{ id: "1", title: "Örnek konu A", model: "claude-sonnet-5-5", lastAt: new Date().toISOString(), tokens: 322800000, cacheHitPct: 96, sharePct: 17 }, { id: "2", title: "Örnek konu B", model: "claude-opus-5-5", lastAt: new Date().toISOString(), tokens: 190800000, cacheHitPct: 91, sharePct: 10 }], note: "costBasis=list; ücret yok" }) }));
      await page.evaluate(() => AM.actions.openProjectSettings("usage")); await page.waitForTimeout(1500);
    }
    if (a === "usage") { await page.evaluate(() => AM.actions.openProjectSettings("usage")); await page.waitForTimeout(1500); }
    if (a === "menu") { await page.locator(".am-sb-user").first().click(); await page.waitForTimeout(500); }
    if (a === "ring") { await page.locator("#ringBtn").click(); await page.waitForTimeout(600); }
    if (a === "panel") { await page.keyboard.press("Control+."); await page.waitForTimeout(600); }
    if (a === "settings") { await page.keyboard.press("Control+,"); await page.waitForTimeout(800); }
    if (a === "palette") { await page.keyboard.press("Control+k"); await page.waitForTimeout(600); }
    if (a === "help") { await page.keyboard.press("Control+,"); await page.waitForTimeout(500); const n = page.getByText("Eğitim belgesi").first(); if (await n.count()) await n.click(); await page.waitForTimeout(1200); }
  }
  const suffix = actions.length ? "-" + actions.join("-").replaceAll(":", "_") : "";
  await page.screenshot({ path: join(out, `${name}${suffix}.png`) });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${name}${suffix} ${w}x${h}: yatay taşma=${overflow}px, konsol=${errs.length}`);
  for (const e of errs.slice(0, 12)) console.log("  " + e);
  await ctx.close();
}
await browser.close();
