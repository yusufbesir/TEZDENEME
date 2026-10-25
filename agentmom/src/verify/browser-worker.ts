// Runs in its own process (started by browser.ts). Serves a local site directory on 127.0.0.1, drives the installed Edge through playwright-core,
// blocks every request that is not to that local server, and prints one RESULT line. It never writes outside the evidence directory.
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { chromium } from "playwright-core";
import { DEFAULT_MAX_DIFF_RATIO, DEFAULT_VIEWPORTS, VISUAL_CHECKS } from "./scenario.ts";
import type { ScenarioStep, VisualCheck } from "./scenario.ts";
import { compareImages } from "./screenshot-compare.ts";
import type { CompareResult } from "./screenshot-compare.ts";
import { captureBuiltins, visualProbe } from "./visual-probe.ts";
import type { ProbeResult } from "./visual-probe.ts";

// Ana süreç (browser.ts) tabanı BULUR ve doğrular; worker yalnız verilen dosyayı okur ve özetini (sha256) yeniden denetler.
type WorkerBaseline = { source: "approved" | "workspace"; path: string; sha256: string } | { source: "approved" | "workspace"; invalid: string };

interface WorkerRequest {
  siteDir: string;
  steps: ScenarioStep[];
  evidenceDir: string;
  runId: string;
  stepTimeoutMs: number;
  channel: string;
  baselines?: Record<string, WorkerBaseline>;
}

// Görsel regresyon adımının kaydı (browser.ts bunu providerData.baselines'a ve kanıta bağlar).
interface BaselineInfo {
  file: string;
  status: "missing" | "match" | "diff" | "size-mismatch" | "untrusted" | "invalid";
  source?: "approved" | "workspace";
  baselineSha256?: string;
  ratio?: number;
  maxDiffRatio?: number;
  diffPixels?: number;
  totalPixels?: number;
}

interface WorkerCase {
  name: string;
  outcome: "passed" | "failed" | "error" | "skipped";
  durationMs: number;
  message: string | null;
  detail: string | null;
  criteria: string[];
  screenshot: string | null;
  // Görsel kalite kuralı sonucu: değerlendirilen / atlanan öğe ve ihlal sayısı (geçen testlerde de atlananlar görünsün diye).
  visual?: { checked: number; skipped: number; violations: number };
  // Görsel regresyon: kırmızı işaretli fark görüntüsü (dosya adı) ve taban bilgisi.
  diffImage?: string | null;
  baseline?: BaselineInfo;
}

// Geçince kendi "passed" test kaydını üreten adımlar (eylem adımları yalnız başarısız olunca kayıt üretir).
const ASSERTIONS = new Set(["expectText", "expectVisible", "screenshot", "expectUrl", "expectCount", "expectAttribute", "expectNotVisible", "expectFocused", "expectNoConsoleErrors"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// Kanal başına küçük tolerans (anti-aliasing / sıkıştırma farkları): 8/255.
const CHANNEL_TOLERANCE = 8;
// PNG IHDR'den (bayt 16..23) boyut okunur ve görüntü ÇÖZÜLMEDEN sınırlanır (çözme-bombası / bellek tüketimi).
const MAX_IMAGE_SIDE = 8000;
const MAX_IMAGE_PIXELS = 16_000_000;
const COMPARE_TIMEOUT_MS = 30_000;
function pngSize(b: Buffer): { width: number; height: number } | null {
  if (b.length < 24 || b.subarray(12, 16).toString("latin1") !== "IHDR") return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}
function sizeProblem(b: Buffer, what: string): string | null {
  const z = pngSize(b);
  if (!z) return `${what} has no valid PNG header`;
  if (z.width === 0 || z.height === 0 || z.width > MAX_IMAGE_SIDE || z.height > MAX_IMAGE_SIDE || z.width * z.height > MAX_IMAGE_PIXELS) return `${what} is ${z.width}x${z.height}; at most ${MAX_IMAGE_SIDE}px per side and ${MAX_IMAGE_PIXELS} pixels are compared`;
  return null;
}
const sha256 = (b: Buffer): string => createHash("sha256").update(b).digest("hex");
const sleep = (ms: number): Promise<void> => new Promise((ok) => setTimeout(ok, ms));
const assertion = (message: string): Error => Object.assign(new Error(message), { name: "AssertionError" });

const CHECK_LABELS: Record<VisualCheck, string> = {
  overflow: "no horizontal overflow",
  "clipped-text": "no clipped text",
  "font-size": "smallest text >= 11px",
  "target-size": "interactive targets >= 24x24px",
  contrast: "text contrast (WCAG AA)",
  overlap: "no overlapping controls",
  images: "images are not broken",
};

const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".txt": "text/plain; charset=utf-8" };

const request = JSON.parse(readFileSync(process.argv[2] as string, "utf8")) as WorkerRequest;
const siteDir = resolve(request.siteDir);
const realSite = realpathSync(siteDir);

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  let rel: string;
  try {
    rel = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname).replace(/\\/g, "/");
  } catch {
    rel = "/\0";
  }
  const file = resolve(siteDir, "." + rel);
  const inside = file === siteDir || file.startsWith(siteDir + sep);
  const hidden = rel.split("/").some((p) => p.startsWith(".")) || rel.includes("\0");
  // Even inside the directory, the real location must stay inside it (a link in the site must not lead out).
  const real = inside && !hidden && existsSync(file) ? realpathSync(file) : null;
  const realInside = real !== null && (real === realSite || real.startsWith(realSite + sep));
  if ((req.method !== "GET" && req.method !== "HEAD") || !inside || hidden || !realInside || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  res.end(req.method === "HEAD" ? undefined : readFileSync(file));
});
await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
const port = (server.address() as { port: number }).port;
const origin = `http://127.0.0.1:${port}`;

const cases: WorkerCase[] = [];
const blocked: string[] = [];
const blockedFull = new Set<string>();
let launchError: string | null = null;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;

try {
  browser = await chromium.launch({ channel: request.channel, headless: true, args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
} catch (err) {
  launchError = err instanceof Error ? err.message : String(err);
}

if (browser) {
  const context = await browser.newContext({ viewport: { width: 900, height: 600 }, serviceWorkers: "block" });
  await context.routeWebSocket(/.*/, (ws) => {
    blocked.push(`ws:${ws.url().slice(0, 100)}`);
    void ws.close();
  });
  await context.route("**/*", (route) => {
    const u = route.request().url();
    if (u.startsWith(origin + "/")) return route.continue();
    blocked.push(u.slice(0, 120));
    blockedFull.add(u);
    return route.abort();
  });
  // Görsel kalite ölçümü için yerleşiklerin özgün başvuruları sayfa betiklerinden ÖNCE yakalanır (rastgele adlı, değiştirilemez özellik).
  const capName = `__am_${randomUUID().replace(/-/g, "")}`;
  await context.addInitScript(captureBuiltins, capName);
  const page = await context.newPage();
  page.setDefaultTimeout(request.stepTimeoutMs);
  // Konsol hata sayacı: yalnız sayfanın KENDİ kaynağından gelen konsol hataları ve yakalanmamış sayfa hataları (engellenen dış istekler ve /favicon.ico sayılmaz).
  // expectNoConsoleErrors bir önceki denetimden bu yana biriken hatalara bakar.
  const consoleErrors: string[] = [];
  let consoleCursor = 0;
  const noteConsole = (text: string): void => {
    if (consoleErrors.length < 50) consoleErrors.push(text.replace(/\s+/g, " ").slice(0, 200));
  };
  page.on("pageerror", (err) => noteConsole(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    // Kaynak, mesajın bildirdiği konuma (//# sourceURL ile sahtelenebilir) DEĞİL, sayfanın gerçek origin'ine dayanır: yalnız tarayıcının kendi ağ hatası iletisi
    // ("Failed to load resource") ve yalnız ENGELLEDİĞİMİZ dış istek (ya da /favicon.ico) için olan ileti atlanır; geri kalan her console.error sayılır.
    // UYARI: expectNoConsoleErrors ajana karşı SAĞLAM kanıt DEĞİLDİR (sayfa betiği console.error'u susturabilir/yönlendirebilir); teslim denetimi bu adımı tek başına
    // kanıt saymaz (yalnız kabul ölçütüne bağlı testler sayılır) ve bir tutarlılık işaretidir.
    const text = msg.text();
    const url = msg.location().url ?? "";
    if (text.startsWith("Failed to load resource") && (blockedFull.has(url) || url.endsWith("/favicon.ico"))) return;
    noteConsole(`console.error: ${text}`);
  });
  // Başarana ya da süre dolana kadar yoklanan denetim (yeni expect adımları; eşzamansız sayfa güncellemelerini tolere eder).
  const poll = async (fn: () => Promise<{ ok: boolean; info: string }>): Promise<{ ok: boolean; info: string }> => {
    const end = Date.now() + request.stepTimeoutMs;
    for (;;) {
      let r: { ok: boolean; info: string };
      try {
        r = await fn();
      } catch (err) {
        r = { ok: false, info: err instanceof Error ? err.message.split("\n")[0] ?? "error" : "error" };
      }
      if (r.ok || Date.now() >= end) return r;
      await sleep(100);
    }
  };
  // Piksel karşılaştırması site betiklerinin çalışmadığı, ağı kapalı AYRI bir bağlamda, boş bir sayfada yapılır.
  let comparePage: Awaited<ReturnType<typeof context.newPage>> | undefined;
  const getComparePage = async (): Promise<NonNullable<typeof comparePage>> => {
    if (!comparePage) {
      const cctx = await browser!.newContext({ serviceWorkers: "block" });
      await cctx.route("**/*", (route) => route.abort());
      comparePage = await cctx.newPage();
      await comparePage.goto("about:blank");
    }
    return comparePage;
  };
  let shot = 0;
  for (const [i, step] of request.steps.entries()) {
    const started = Date.now();
    const label = (step as { name?: string }).name ?? `${step.kind} #${i}`;
    const criteria = (step as { criteria?: string[] }).criteria ?? [];
    try {
      let screenshot: string | null = null;
      if (step.kind === "goto") await page.goto(origin + step.path);
      else if (step.kind === "click") await page.locator(step.selector).click();
      else if (step.kind === "fill") await page.locator(step.selector).fill(step.value);
      else if (step.kind === "select") await page.locator(step.selector).selectOption(step.value);
      else if (step.kind === "press") await page.keyboard.press(step.key === "Space" ? " " : step.key);
      else if (step.kind === "check") await page.locator(step.selector).setChecked(step.checked ?? true);
      else if (step.kind === "focus") await page.locator(step.selector).focus();
      else if (step.kind === "waitForVisible") await page.locator(step.selector).first().waitFor({ state: "visible", timeout: step.timeoutMs ?? request.stepTimeoutMs });
      else if (step.kind === "back") await page.goBack();
      else if (step.kind === "reload") await page.reload();
      else if (step.kind === "expectUrl") {
        const expected = new URL(step.path, origin);
        const r = await poll(async () => {
          const cur = new URL(page.url());
          return { ok: cur.origin === origin && cur.pathname === expected.pathname && (expected.search === "" || cur.search === expected.search) && (expected.hash === "" || cur.hash === expected.hash), info: cur.origin === origin ? cur.pathname + cur.search + cur.hash : cur.origin };
        });
        if (!r.ok) throw assertion(`Expected URL path ${step.path} but the page is at ${r.info}`);
      } else if (step.kind === "expectCount") {
        const r = await poll(async () => {
          const n = await page.locator(step.selector).count();
          const ok = step.count !== undefined ? n === step.count : (step.min === undefined || n >= step.min) && (step.max === undefined || n <= step.max);
          return { ok, info: String(n) };
        });
        if (!r.ok) throw assertion(`Expected count of ${step.selector} to be ${step.count !== undefined ? `exactly ${step.count}` : `${step.min !== undefined ? `at least ${step.min}` : ""}${step.min !== undefined && step.max !== undefined ? " and " : ""}${step.max !== undefined ? `at most ${step.max}` : ""}`} but found ${r.info}`);
      } else if (step.kind === "expectAttribute") {
        const r = await poll(async () => {
          const loc = page.locator(step.selector).first();
          if ((await loc.count()) === 0) return { ok: false, info: "no matching element" };
          const v = await loc.getAttribute(step.attribute, { timeout: 250 });
          return { ok: v === step.value, info: v === null ? "attribute not set" : `"${v.slice(0, 100)}"` };
        });
        if (!r.ok) throw assertion(`Expected attribute ${step.attribute} of ${step.selector} to equal "${step.value.slice(0, 100)}" but found ${r.info}`);
      } else if (step.kind === "expectNotVisible") {
        const r = await poll(async () => ({ ok: !(await page.locator(step.selector).first().isVisible()), info: "still visible" }));
        if (!r.ok) throw assertion(`Expected ${step.selector} not to be visible but it is ${r.info}`);
      } else if (step.kind === "expectFocused") {
        // ":focus" Playwright'ın kendi seçici motoru üzerinden değerlendirilir (sayfada betik çalıştırılmaz).
        const r = await poll(async () => ({ ok: (await page.locator(step.selector).and(page.locator(":focus")).count()) > 0, info: "another element or nothing has focus" }));
        if (!r.ok) throw assertion(`Expected ${step.selector} to have keyboard focus but ${r.info}`);
      } else if (step.kind === "expectNoConsoleErrors") {
        await page.waitForLoadState("load");
        await sleep(100);
        const fresh = consoleErrors.slice(consoleCursor);
        consoleCursor = consoleErrors.length;
        if (fresh.length > 0) throw assertion(`Expected no console errors but found ${fresh.length}: ${fresh.slice(0, 3).join(" | ")}`);
      } else if (step.kind === "expectScreenshotMatch") {
        const restore = step.viewport !== undefined;
        if (step.viewport) await page.setViewportSize({ width: step.viewport.width, height: step.viewport.height });
        let png: Buffer;
        try {
          await page.waitForLoadState("load");
          await page.evaluate("document.fonts ? document.fonts.ready.then(function () { return 1; }) : 1");
          const opts = { type: "png", animations: "disabled", caret: "hide" } as const;
          png = step.selector ? await page.locator(step.selector).first().screenshot(opts) : await page.screenshot(opts);
        } finally {
          if (restore) await page.setViewportSize({ width: 900, height: 600 });
        }
        if (png.length > MAX_IMAGE_BYTES) throw new Error(`screenshot is larger than ${MAX_IMAGE_BYTES} bytes`);
        const newProblem = sizeProblem(png, "the new screenshot");
        const newName = `${request.runId}-match-${++shot}.png`;
        writeFileSync(join(request.evidenceDir, newName), png, { flag: "wx" });
        const entry = request.baselines?.[step.baseline];
        const base = { name: label, durationMs: 0, criteria, screenshot: newName };
        const done = (c: Omit<WorkerCase, "name" | "durationMs" | "criteria" | "screenshot">): void => {
          cases.push({ ...base, durationMs: Date.now() - started, ...c });
        };
        if (!entry) {
          done({ outcome: "skipped", message: `baseline ${step.baseline}: no approved baseline yet`, detail: `taban yok: kaydetmek için approve gerekir (POST /api/tasks/:id/baselines/approve ile "${step.baseline}" onaylanmalı). Yeni görüntü kanıt olarak saklandı; taban otomatik yazılmaz.`, baseline: { file: step.baseline, status: "missing" } });
        } else if ("invalid" in entry) {
          done({ outcome: "error", message: `baseline ${step.baseline} cannot be used: ${entry.invalid}`, detail: `source: ${entry.source}`, baseline: { file: step.baseline, status: "invalid", source: entry.source } });
        } else {
          const baseBytes = readFileSync(entry.path);
          const baseProblem = sizeProblem(baseBytes, "the baseline");
          if (newProblem || baseProblem) {
            done({ outcome: "error", message: `image too large or malformed for comparison: ${newProblem ?? baseProblem}`, detail: `source: ${entry.source}`, baseline: { file: step.baseline, status: "invalid", source: entry.source } });
          } else if (sha256(baseBytes) !== entry.sha256) {
            done({ outcome: "error", message: `baseline ${step.baseline} changed while the run was in progress (hash mismatch)`, detail: `source: ${entry.source}`, baseline: { file: step.baseline, status: "invalid", source: entry.source } });
          } else {
            const comparing = (await getComparePage()).evaluate(compareImages, { baseline: baseBytes.toString("base64"), current: png.toString("base64"), tol: CHANNEL_TOLERANCE });
            let timer: ReturnType<typeof setTimeout> | undefined;
            const cmp = await Promise.race([comparing, new Promise<never>((_ok, fail) => (timer = setTimeout(() => fail(new Error(`image comparison exceeded ${COMPARE_TIMEOUT_MS} ms`)), COMPARE_TIMEOUT_MS)))]).finally(() => clearTimeout(timer));
            const result: CompareResult = cmp;
            const maxRatio = step.maxDiffRatio ?? DEFAULT_MAX_DIFF_RATIO;
            const pct = (x: number): string => `${(x * 100).toFixed(2)}%`;
            const info = { file: step.baseline, source: entry.source, baselineSha256: entry.sha256, ratio: result.ratio, maxDiffRatio: maxRatio, diffPixels: result.diffPixels, totalPixels: result.totalPixels };
            const exceeded = result.sizeMismatch || result.ratio > maxRatio;
            let diffImage: string | null = null;
            if (exceeded && result.diffPng) {
              diffImage = `${request.runId}-diff-${shot}.png`;
              writeFileSync(join(request.evidenceDir, diffImage), Buffer.from(result.diffPng, "base64"), { flag: "wx" });
            }
            const sizeText = `baseline ${result.baselineSize.width}x${result.baselineSize.height}, now ${result.currentSize.width}x${result.currentSize.height}`;
            if (entry.source === "workspace") {
              // Çalışma ağacındaki taban uygulayıcının yazabildiği bir yerdedir: karşılaştırılır ve raporlanır ama ASLA geçiş sayılmaz (yalnız uyarı).
              done({
                outcome: "skipped",
                message: `baseline ${step.baseline}: taban uygulayıcı tarafından yazılabilir bir konumdan (.agentmom/baselines); güvenilir sayılmaz, onay gerekir`,
                detail: `${result.sizeMismatch ? `size differs (${sizeText})` : `${pct(result.ratio)} of pixels differ (limit ${pct(maxRatio)})`}; kullanıcı onaylı taban yok: POST /api/tasks/:id/baselines/approve ile onaylayın.`,
                diffImage,
                baseline: { ...info, status: "untrusted" },
              });
            } else if (exceeded) {
              done({
                outcome: "failed",
                message: result.sizeMismatch ? `AssertionError: screenshot size differs from the approved baseline ${step.baseline} (${sizeText})` : `AssertionError: ${pct(result.ratio)} of pixels differ from the approved baseline ${step.baseline} (limit ${pct(maxRatio)})`,
                detail: `${result.sizeMismatch ? "" : `${result.diffPixels} of ${result.totalPixels} pixels differ; `}baseline sha256 ${entry.sha256}`,
                diffImage,
                baseline: { ...info, status: result.sizeMismatch ? "size-mismatch" : "diff" },
              });
            } else {
              done({ outcome: "passed", message: null, detail: null, baseline: { ...info, status: "match" } });
            }
          }
        }
      } else if (step.kind === "expectText") {
        const text = (await page.locator(step.selector).first().innerText()).trim();
        if (!text.includes(step.text)) throw Object.assign(new Error(`Expected text "${step.text}" in ${step.selector} but found "${text.slice(0, 200)}"`), { name: "AssertionError" });
      } else if (step.kind === "expectVisible") {
        if (!(await page.locator(step.selector).first().isVisible())) throw Object.assign(new Error(`Expected ${step.selector} to be visible`), { name: "AssertionError" });
      } else if (step.kind === "expectVisualQuality") {
        // Her görünüm alanı için sayfa o boyuta getirilir, yüklenmesi (görüntüler, yazı tipleri) beklenir, ölçüm sayfa İÇİNDE yapılır, ardından ekran görüntüsü alınır.
        const wanted: VisualCheck[] = step.checks ?? [...VISUAL_CHECKS];
        for (const vp of step.viewports ?? DEFAULT_VIEWPORTS) {
          const vStarted = Date.now();
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.waitForLoadState("load");
          await page.evaluate("document.fonts ? document.fonts.ready.then(function () { return 1; }) : 1");
          const probe: ProbeResult = await page.evaluate(visualProbe, { checks: wanted, max: 20, capName });
          const shotName = `${request.runId}-visual-${++shot}.png`;
          // Görünüm ekranı (tam sayfa değil), en çok 1600x1000 px.
          writeFileSync(join(request.evidenceDir, shotName), await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: Math.min(vp.width, 1600), height: Math.min(vp.height, 1000) } }), { flag: "wx" });
          for (const check of wanted) {
            const r = probe.checks[check] ?? { checked: 0, skipped: 0, total: 0, items: [] };
            const tampered = probe.tampered.length > 0;
            const relevant = r.checked + r.skipped;
            // Ölçülemeyen kural sessizce geçmez: ilgili öğe var ama hiçbiri ölçülemediyse ya da atlananlar %50'yi aştıysa "doğrulanamadı" (error). Hiç ilgili öğe yoksa "skipped".
            const unverifiable = !tampered && r.total === 0 && relevant > 0 && (r.checked === 0 || r.skipped * 2 > relevant);
            const failed = tampered || r.total > 0;
            const extra = r.skipped > 0 ? ` (${r.skipped} element(s) skipped: not measurable)` : "";
            const outcome: WorkerCase["outcome"] = failed ? "failed" : unverifiable ? "error" : relevant === 0 ? "skipped" : "passed";
            const why = tampered ? `the page overrides built-in(s): ${probe.tampered.slice(0, 6).join(", ")}; the measurement cannot be trusted` : unverifiable ? `not verifiable: ${r.skipped} of ${relevant} relevant element(s) could not be measured (background image/gradient, unparsable color or scan limit)` : `${r.total} violation(s) at ${vp.width}x${vp.height}: ${r.items[0] ?? ""}${extra}`;
            cases.push({
              name: `${label} / ${vp.width}x${vp.height} / ${CHECK_LABELS[check]}`,
              outcome,
              durationMs: Date.now() - vStarted,
              message: outcome === "failed" || outcome === "error" ? why.slice(0, 1000) : null,
              detail: outcome === "failed" || outcome === "error" ? `${tampered ? probe.tampered.join(", ") : r.items.join("\n")}${extra}`.slice(0, 2000) : null,
              criteria,
              screenshot: shotName,
              visual: { checked: r.checked, skipped: r.skipped, violations: r.total },
            });
          }
        }
        await page.setViewportSize({ width: 900, height: 600 });
      } else {
        screenshot = `${request.runId}-shot-${++shot}.png`;
        writeFileSync(join(request.evidenceDir, screenshot), await page.screenshot({ type: "png" }), { flag: "wx" });
      }
      if (ASSERTIONS.has(step.kind)) {
        cases.push({ name: label, outcome: "passed", durationMs: Date.now() - started, message: null, detail: null, criteria, screenshot });
      }
    } catch (err) {
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      let screenshot: string | null = null;
      try {
        screenshot = `${request.runId}-fail-${i}.png`;
        writeFileSync(join(request.evidenceDir, screenshot), await page.screenshot({ type: "png" }), { flag: "wx" });
      } catch {
        screenshot = null;
      }
      cases.push({ name: label, outcome: "failed", durationMs: Date.now() - started, message: message.slice(0, 1000), detail: (err instanceof Error ? (err.stack ?? "") : "").slice(0, 2000), criteria, screenshot });
      if (step.kind === "goto") break;
    }
  }
  await browser.close();
}
server.close();
process.stdout.write("RESULT:" + JSON.stringify({ cases, blocked, launchError }) + "\n");
