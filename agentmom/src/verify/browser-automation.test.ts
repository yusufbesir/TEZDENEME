// Genel tarayıcı otomasyonu (madde 18) + Playwright doğrulama kütüphanesi ve görsel regresyon (madde 52) testleri.
// Yazan: Claude [İP:AgentMom madde 18/52]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Gerçek Edge + küçük statik siteler (mkTmp); Edge yoksa tarayıcı testleri atlanır. Dosyalar yalnız mkTmp klasörlerinde; silme yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { ValidationError, validateVerification } from "../workflows/types.ts";
import { approveBaseline, baselineDirFor } from "./baselines.ts";
import { BrowserProvider, resolveBaseline } from "./browser.ts";
import type { BrowserRequest } from "./browser.ts";
import { checkEvidenceFile } from "./evidence-files.ts";
import { MAX_STEPS, ScenarioError, validateScenario } from "./scenario.ts";
import type { ScenarioStep } from "./scenario.ts";
import { TEMPLATE_NAMES, expandTemplate, expandTemplates, validateTemplateList } from "./scenario-library.ts";
import { validateRunResult } from "./schema.ts";
import type { RunResult } from "./schema.ts";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const HAVE_EDGE = existsSync(EDGE);
const SKIP = !HAVE_EDGE && "Edge is not installed";
const GOTO = { kind: "goto", path: "/index.html" };
const DOT_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

// ---------- fixtures ----------

const AUTO_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Auto</title></head><body>
<h1 id="h">Auto page</h1>
<select id="color"><option value="r">Red</option><option value="g">Green</option></select> <span id="color-out">none</span>
<input type="checkbox" id="agree"> <span id="agree-out">no</span>
<form id="f"><input id="name" type="text"><button id="submit" type="submit">Send</button></form> <span id="res">waiting</span>
<button id="late-btn">Show later</button> <div id="late" style="display:none">late content</div>
<div id="gone" style="display:none">hidden</div>
<ul><li class="it">a</li><li class="it">b</li><li class="it">c</li></ul>
<div id="box" data-state="ready">box</div>
<a id="to-sub" href="/sub/page.html?x=1#top">go sub</a>
<img src="https://tracker.example.invalid/pixel.png" alt="external">
<script>
document.getElementById("color").onchange = function () { document.getElementById("color-out").textContent = this.value; };
document.getElementById("agree").onchange = function () { document.getElementById("agree-out").textContent = this.checked ? "yes" : "no"; };
document.getElementById("f").onsubmit = function (e) { e.preventDefault(); document.getElementById("res").textContent = "Hello " + document.getElementById("name").value; };
document.getElementById("late-btn").onclick = function () { setTimeout(function () { document.getElementById("late").style.display = "block"; }, 300); };
</script></body></html>`;

const KBD_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Kbd</title></head><body>
<a id="t1" href="#a">one</a> <button id="t2">two</button> <input id="t3" type="text"> <button id="t4">four</button></body></html>`;

const ERR_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Err</title></head><body><p>errors</p>
<script>console.error("boom-from-page"); setTimeout(function () { throw new Error("uncaught-boom"); }, 0);</script></body></html>`;

const MISSING_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Missing</title></head><body><p>missing</p><script src="/missing.js"></script></body></html>`;

const NOTITLE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title></title></head><body><p>no title</p></body></html>`;

const GOOD_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Good</title>
<style>
body{margin:0;font:16px/1.5 sans-serif;background:#fff;color:#111}
main{padding:16px}
button{display:inline-block;min-width:44px;min-height:44px;padding:8px 12px;margin:4px;font-size:16px;background:#1a56db;color:#fff;border:0}
p{max-width:60ch}
</style></head><body><main><h1>Welcome</h1><p>Plain readable text with enough contrast.</p><button>First</button></main></body></html>`;

function autoSite(): string {
  const dir = mkTmp("agentmom-auto-");
  writeFileSync(join(dir, "index.html"), AUTO_PAGE);
  writeFileSync(join(dir, "kbd.html"), KBD_PAGE);
  writeFileSync(join(dir, "err.html"), ERR_PAGE);
  writeFileSync(join(dir, "missing.html"), MISSING_PAGE);
  writeFileSync(join(dir, "notitle.html"), NOTITLE_PAGE);
  writeFileSync(join(dir, "good.html"), GOOD_PAGE);
  mkdirSync(join(dir, "sub"));
  writeFileSync(join(dir, "sub", "page.html"), "<!doctype html><html><head><title>Sub</title></head><body><p id='x'>sub page</p></body></html>");
  return dir;
}

function run(steps: unknown[], over: Partial<BrowserRequest> = {}): Promise<RunResult> {
  return new BrowserProvider().run({ siteDir: autoSite(), steps: steps as ScenarioStep[], evidenceDir: mkTmp("agentmom-bauto-ev-"), timeoutMs: 90_000, ...over }).result;
}

const outcomes = (r: RunResult): Array<[string, string]> => r.tests.map((t) => [t.name, t.outcome]);

// ---------- scenario validation (pure) ----------

test("scenario: every new step kind accepts its valid shape", () => {
  const steps = validateScenario([
    GOTO,
    { kind: "select", selector: "#c", value: "g" },
    { kind: "press", key: "Enter" },
    { kind: "press", key: "Shift+Tab" },
    { kind: "check", selector: "#a" },
    { kind: "check", selector: "#a", checked: false },
    { kind: "waitForVisible", selector: "#late", timeoutMs: 1500 },
    { kind: "expectUrl", path: "/sub/page.html" },
    { kind: "expectUrl", path: "/sub/page.html?x=1#top", name: "[ac:c1] url", criteria: ["c1"] },
    { kind: "expectCount", selector: ".it", count: 3, name: "three items" },
    { kind: "expectCount", selector: ".it", min: 1, max: 5, name: "range" },
    { kind: "expectAttribute", selector: "#box", attribute: "data-state", value: "ready", name: "attr" },
    { kind: "expectAttribute", selector: "#box", attribute: "aria-label", value: "", name: "empty value is allowed" },
    { kind: "expectNotVisible", selector: "#gone", name: "hidden" },
    { kind: "back" },
    { kind: "reload" },
    { kind: "focus", selector: "#name" },
    { kind: "expectFocused", selector: "#name", name: "focused" },
    { kind: "expectNoConsoleErrors", name: "clean console", criteria: ["c2"] },
    { kind: "expectScreenshotMatch", name: "home", baseline: "home.png", maxDiffRatio: 0.05, viewport: { width: 400, height: 300 }, selector: "#h", criteria: ["c3"] },
    { kind: "expectScreenshotMatch", name: "home default", baseline: "home-2_v1.png" },
  ]);
  assert.equal(steps.length, 21);
  for (const key of ["Enter", "Escape", "Tab", "Shift+Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]) assert.equal(validateScenario([GOTO, { kind: "press", key }]).length, 2);
});

test("scenario: malicious or malformed inputs are rejected (long selectors, javascript:/.. paths, unknown keys and fields, prototype kinds, code steps)", () => {
  const bad = (step: unknown, why: string) => assert.throws(() => validateScenario([GOTO, step]), ScenarioError, why);
  const long = "a".repeat(201);
  for (const kind of ["click", "focus", "check", "waitForVisible"]) bad({ kind, selector: long }, `${kind} long selector`);
  bad({ kind: "select", selector: long, value: "x" }, "select long selector");
  bad({ kind: "select", selector: "#c", value: "v".repeat(501) }, "select long value");
  bad({ kind: "select", selector: "#c", value: "" }, "select empty value");
  bad({ kind: "expectCount", selector: long, count: 1, name: "n" }, "expectCount long selector");
  bad({ kind: "expectAttribute", selector: long, attribute: "a", value: "v", name: "n" }, "expectAttribute long selector");
  bad({ kind: "expectNotVisible", selector: long, name: "n" }, "expectNotVisible long selector");
  bad({ kind: "expectFocused", selector: long, name: "n" }, "expectFocused long selector");
  bad({ kind: "expectScreenshotMatch", name: "n", baseline: "a.png", selector: long }, "match long selector");
  bad({ kind: "expectNoConsoleErrors", name: "n".repeat(201) }, "long name");
  bad({ kind: "goto", path: "javascript:alert(1)" }, "goto javascript:");
  bad({ kind: "expectUrl", path: "javascript:alert(1)" }, "expectUrl javascript:");
  bad({ kind: "expectUrl", path: "https://evil.example/" }, "expectUrl absolute url");
  bad({ kind: "expectUrl", path: "//evil.example/x" }, "expectUrl protocol-relative");
  bad({ kind: "expectUrl", path: "/a/../b" }, "expectUrl ..");
  bad({ kind: "expectUrl", path: "/a\\b" }, "expectUrl backslash");
  bad({ kind: "expectUrl", path: "relative/path" }, "expectUrl not rooted");
  bad({ kind: "expectUrl", path: "/x" + "y".repeat(300) }, "expectUrl too long");
  bad({ kind: "goto", path: "/a\u0000b" }, "goto control char");
  for (const key of ["Control+A", "F12", "a", "Alt+F4", "Meta", "enter", "Enter ", "", 5, null, "Tab+Tab"]) bad({ kind: "press", key }, `key ${String(key)}`);
  bad({ kind: "press" }, "press without key");
  bad({ kind: "press", key: "Enter", extra: 1 }, "press extra field");
  bad({ kind: "back", url: "/x" }, "back extra field");
  bad({ kind: "reload", hard: true }, "reload extra field");
  for (const kind of ["constructor", "__proto__", "toString", "hasOwnProperty", "evaluate", "eval", "exec", "script"]) bad({ kind, code: "alert(1)" }, `kind ${kind}`);
  bad({ kind: "evaluate", expression: "document.cookie" }, "evaluate");
  bad({ kind: "check", selector: "#a", checked: "yes" }, "checked not boolean");
  bad({ kind: "waitForVisible", selector: "#a", timeoutMs: 50 }, "timeout too small");
  bad({ kind: "waitForVisible", selector: "#a", timeoutMs: 40_000 }, "timeout too large");
  bad({ kind: "waitForVisible", selector: "#a", timeoutMs: 100.5 }, "timeout not integer");
  bad({ kind: "expectCount", selector: ".a", name: "n" }, "expectCount without any bound");
  bad({ kind: "expectCount", selector: ".a", name: "n", count: 1, min: 0 }, "count with min");
  bad({ kind: "expectCount", selector: ".a", name: "n", min: 5, max: 2 }, "min above max");
  bad({ kind: "expectCount", selector: ".a", name: "n", count: -1 }, "negative count");
  bad({ kind: "expectCount", selector: ".a", name: "n", count: 10_001 }, "count too large");
  bad({ kind: "expectCount", selector: ".a", name: "n", count: 1.5 }, "fractional count");
  bad({ kind: "expectCount", selector: ".a", count: 1 }, "expectCount without name");
  for (const attribute of ["on click", "x=y", "a>b", "", "1abc", "a".repeat(80), 7]) bad({ kind: "expectAttribute", selector: "#a", attribute, value: "v", name: "n" }, `attribute ${String(attribute)}`);
  bad({ kind: "expectAttribute", selector: "#a", attribute: "id", value: "v".repeat(501), name: "n" }, "attribute value too long");
  bad({ kind: "expectAttribute", selector: "#a", attribute: "id", name: "n" }, "attribute without value");
  bad({ kind: "expectNoConsoleErrors" }, "no name");
  bad({ kind: "expectNoConsoleErrors", name: "n", criteria: ["bad id"] }, "bad criteria");
  for (const baseline of ["../x.png", "x.txt", "a/b.png", "a\\b.png", "x.PNG.exe", ".png", "-a.png", "x..png", "C:/x.png", "/abs.png", "", `${"a".repeat(90)}.png`, "x.png\u0000", 5, null]) bad({ kind: "expectScreenshotMatch", name: "n", baseline }, `baseline ${String(baseline)}`);
  for (const maxDiffRatio of [0.21, -0.01, 1, Number.NaN, Number.POSITIVE_INFINITY, "0.01"]) bad({ kind: "expectScreenshotMatch", name: "n", baseline: "a.png", maxDiffRatio }, `maxDiffRatio ${String(maxDiffRatio)}`);
  bad({ kind: "expectScreenshotMatch", name: "n", baseline: "a.png", viewport: { width: 199, height: 300 } }, "viewport too small");
  bad({ kind: "expectScreenshotMatch", name: "n", baseline: "a.png", viewport: { width: 400, height: 300, scale: 2 } }, "viewport extra field");
  bad({ kind: "expectScreenshotMatch", name: "n", baseline: "a.png", viewport: [400, 300] }, "viewport not an object");
  bad({ kind: "expectScreenshotMatch", name: "n", baseline: "a.png", workspacePath: "C:/x" }, "match extra field");
  bad({ kind: "expectScreenshotMatch", baseline: "a.png" }, "match without name");
  assert.throws(() => validateScenario([GOTO, ...new Array(11).fill({ kind: "expectScreenshotMatch", name: "n", baseline: "a.png" })]), /at most 10 expectScreenshotMatch/);
  assert.equal(validateScenario([GOTO, ...new Array(10).fill({ kind: "expectScreenshotMatch", name: "n", baseline: "a.png" })]).length, 11);
  assert.throws(() => validateScenario(new Array(MAX_STEPS + 1).fill({ kind: "reload" })), ScenarioError);
});

// ---------- şablon kütüphanesi (saf) ----------

test("templates: each named template expands to declarative steps within the step limit", () => {
  assert.deepEqual([...TEMPLATE_NAMES].sort(), ["form-submit", "keyboard-order", "navigation", "responsive-smoke", "smoke"]);
  const smoke = expandTemplate("smoke", { paths: ["/index.html", "/kbd.html"] });
  assert.equal(smoke.length, 8);
  assert.deepEqual(smoke.map((s) => s.kind), ["goto", "expectCount", "expectVisible", "expectNoConsoleErrors", "goto", "expectCount", "expectVisible", "expectNoConsoleErrors"]);
  const form = expandTemplate("form-submit", { path: "/index.html", fields: [{ selector: "#name", value: "Ada" }], submit: "#submit", expectText: { selector: "#res", text: "Hello Ada" } });
  assert.deepEqual(form.map((s) => s.kind), ["goto", "fill", "click", "expectText", "expectNoConsoleErrors"]);
  assert.equal(expandTemplate("form-submit", { path: "/f.html", fields: [{ selector: "#a", value: "" }], submit: "#s", expectText: "Thanks" }).find((s) => s.kind === "expectText")!.kind, "expectText", "plain text means the body");
  const kb = expandTemplate("keyboard-order", { path: "/kbd.html", selectors: ["#t1", "#t2", "#t3"] });
  assert.deepEqual(kb.map((s) => s.kind), ["goto", "press", "expectFocused", "press", "expectFocused", "press", "expectFocused"]);
  const nav = expandTemplate("navigation", { links: [{ selector: "#to-sub", expectPath: "/sub/page.html" }] });
  assert.deepEqual(nav.map((s) => s.kind), ["goto", "click", "expectUrl"]);
  assert.equal((nav[0] as { path: string }).path, "/", "default start page");
  const resp = expandTemplate("responsive-smoke", { paths: ["/good.html"], viewports: [{ width: 360, height: 800 }, { width: 1280, height: 800 }] });
  assert.deepEqual(resp.map((s) => s.kind), ["goto", "expectVisualQuality"]);
  assert.equal(expandTemplates(validateTemplateList([{ name: "smoke", params: { paths: ["/a.html"] } }, { name: "keyboard-order", params: { path: "/k.html", selectors: ["#a", "#b"] } }])).length, 4 + 5);
});

test("templates: unknown templates and parameters, wrong types, bad paths and over-limit expansions are rejected", () => {
  const bad = (name: string, params: unknown, why: string) => assert.throws(() => expandTemplate(name, params), ScenarioError, why);
  for (const name of ["", "nope", "constructor", "__proto__", "toString", "SMOKE"]) bad(name, { paths: ["/a"] }, `template ${name}`);
  bad("smoke", { paths: ["/a"], extra: 1 }, "unknown parameter");
  bad("smoke", { paths: [] }, "no paths");
  bad("smoke", { paths: new Array(11).fill("/a") }, "too many paths");
  bad("smoke", { paths: ["https://evil.example/"] }, "absolute url");
  bad("smoke", { paths: ["javascript:alert(1)"] }, "javascript:");
  bad("smoke", { paths: ["/a/../b"] }, "dotdot");
  bad("smoke", { paths: "/a" }, "paths not an array");
  bad("smoke", null, "params null");
  bad("smoke", [1], "params array");
  bad("form-submit", { path: "/f", fields: [{ selector: "#a", value: "x", extra: 1 }], submit: "#s", expectText: "t" }, "field extra");
  bad("form-submit", { path: "/f", fields: [{ selector: "#a", value: "x" }], submit: "#s" }, "no expectText");
  bad("form-submit", { path: "/f", fields: [], submit: "#s", expectText: "t" }, "no fields");
  bad("form-submit", { path: "/f", fields: [{ selector: "a".repeat(201), value: "x" }], submit: "#s", expectText: "t" }, "long selector");
  bad("form-submit", { path: "/f", fields: [{ selector: "#a", value: "x" }], submit: "#s", expectText: { selector: "#r", text: "t", extra: 1 } }, "expectText extra");
  bad("keyboard-order", { path: "/k", selectors: [] }, "no selectors");
  bad("keyboard-order", { path: "/k", selectors: new Array(21).fill("#a") }, "too many selectors");
  bad("navigation", { links: [{ selector: "#a", expectPath: "https://evil.example/" }] }, "link to absolute url");
  bad("navigation", { links: [{ selector: "#a" }] }, "link without expectPath");
  bad("navigation", { path: "//evil/x", links: [{ selector: "#a", expectPath: "/b" }] }, "start path protocol-relative");
  bad("responsive-smoke", { paths: ["/a"], viewports: [{ width: 100, height: 800 }] }, "viewport too small");
  bad("responsive-smoke", { paths: ["/a"], viewports: [] }, "no viewports");
  bad("responsive-smoke", { paths: ["/a", "/b", "/c"] }, "3 paths x 3 default viewports exceed 8 measured viewports");
  assert.throws(() => validateTemplateList([]), ScenarioError);
  assert.throws(() => validateTemplateList(new Array(11).fill({ name: "smoke", params: { paths: ["/a"] } })), ScenarioError);
  assert.throws(() => validateTemplateList([{ name: "smoke", params: { paths: ["/a"] }, extra: 1 }]), ScenarioError);
  assert.throws(() => validateTemplateList([{ name: "smoke" }]), ScenarioError);
  assert.throws(() => validateTemplateList("smoke"), ScenarioError);
  // 15 paths of keyboard-order selectors would exceed MAX_STEPS in one template: 1 + 2*20 = 41 fits; two of them exceed the combined limit (checked by the plan validator).
  assert.equal(expandTemplate("keyboard-order", { path: "/k", selectors: new Array(20).fill("#a") }).length, 41);
});

test("plan: browser.templates works alone, with steps, and the total step limit applies; unknown templates are rejected", () => {
  const plan = validateVerification({ browser: { siteDir: "site", templates: [{ name: "smoke", params: { paths: ["/index.html"] } }] } });
  assert.equal(plan.browser!.steps.length, 4);
  assert.equal(plan.browser!.steps[0]!.kind, "goto");
  const mixed = validateVerification({ browser: { siteDir: "site", steps: [GOTO, { kind: "click", selector: "#b" }], templates: [{ name: "keyboard-order", params: { path: "/kbd.html", selectors: ["#t1", "#t2"] } }], stepTimeoutMs: 1500 } });
  assert.equal(mixed.browser!.steps.length, 2 + 5);
  assert.equal(mixed.browser!.stepTimeoutMs, 1500);
  // Saklanan plan genişletilmiştir: yeniden doğrulanırsa adımlar ikiye katlanmaz.
  assert.equal(validateVerification({ browser: { siteDir: "site", steps: mixed.browser!.steps } }).browser!.steps.length, 7);
  const err = (browser: unknown) => assert.throws(() => validateVerification({ browser }), ValidationError);
  err({ siteDir: "site" });
  err({ siteDir: "site", templates: [] });
  err({ siteDir: "site", templates: [{ name: "unknown", params: {} }] });
  err({ siteDir: "site", templates: [{ name: "smoke", params: { paths: ["/a"], bogus: true } }] });
  err({ siteDir: "site", templates: "smoke" });
  err({ siteDir: "site", steps: [GOTO], extra: 1 });
  const ten = { name: "smoke", params: { paths: new Array(10).fill("/index.html") } };
  assert.equal(validateVerification({ browser: { siteDir: "site", templates: [ten] } }).browser!.steps.length, 40);
  err({ siteDir: "site", templates: [ten, ten] });
  err({ siteDir: "site", steps: new Array(30).fill(GOTO), templates: [ten] });
});

test("baseline resolution: approved folder first, workspace second (flagged), none when absent, bad names refused", () => {
  const approved = mkTmp("agentmom-rb-a-");
  const ws = mkTmp("agentmom-rb-w-");
  writeFileSync(join(ws, "only-ws.png"), DOT_PNG);
  writeFileSync(join(approved, "both.png"), DOT_PNG);
  writeFileSync(join(ws, "both.png"), Buffer.concat([DOT_PNG, Buffer.from("x")]));
  writeFileSync(join(approved, "text.png"), "not a png");
  const r = (n: string) => resolveBaseline(n, { baselineDir: approved, workspaceBaselineDir: ws });
  assert.equal(r("nothing.png"), null);
  assert.equal(r("only-ws.png")!.source, "workspace");
  const both = r("both.png")!;
  assert.equal(both.source, "approved");
  assert.ok("sha256" in both);
  assert.match((r("text.png") as { invalid: string }).invalid, /not a PNG/);
  assert.match((r("../x.png") as { invalid: string }).invalid, /invalid baseline name/);
  assert.equal(resolveBaseline("only-ws.png", { baselineDir: approved }), null, "without a workspace folder nothing is found");
});

// ---------- gerçek tarayıcı: yeni adımlar ----------

test("browser: select, check, press, focus, waitForVisible, expectUrl, back, reload, counts, attributes and visibility all pass on a real page", { skip: SKIP }, async () => {
  const r = await run([
    GOTO,
    { kind: "select", selector: "#color", value: "g" },
    { kind: "expectText", selector: "#color-out", text: "g", name: "[ac:c1] select changed the page" },
    { kind: "check", selector: "#agree" },
    { kind: "expectText", selector: "#agree-out", text: "yes", name: "checked" },
    { kind: "check", selector: "#agree", checked: false },
    { kind: "expectText", selector: "#agree-out", text: "no", name: "unchecked" },
    { kind: "focus", selector: "#agree" },
    { kind: "press", key: "Space" },
    { kind: "expectText", selector: "#agree-out", text: "yes", name: "Space toggled the checkbox" },
    { kind: "fill", selector: "#name", value: "Yusuf" },
    { kind: "press", key: "Enter" },
    { kind: "expectText", selector: "#res", text: "Hello Yusuf", name: "Enter submitted the form" },
    { kind: "click", selector: "#late-btn" },
    { kind: "waitForVisible", selector: "#late", timeoutMs: 3000 },
    { kind: "expectNotVisible", selector: "#gone", name: "[ac:c2] hidden element is not visible" },
    { kind: "expectCount", selector: ".it", count: 3, name: "exactly three items" },
    { kind: "expectCount", selector: ".it", min: 2, max: 4, name: "item range" },
    { kind: "expectCount", selector: ".nothing", count: 0, name: "zero matches" },
    { kind: "expectAttribute", selector: "#box", attribute: "data-state", value: "ready", name: "attribute value" },
    { kind: "focus", selector: "#name" },
    { kind: "expectFocused", selector: "#name", name: "name field is focused" },
    { kind: "click", selector: "#to-sub" },
    { kind: "expectUrl", path: "/sub/page.html", name: "path matches without the query" },
    { kind: "expectUrl", path: "/sub/page.html?x=1#top", name: "path with query and hash matches" },
    { kind: "back" },
    { kind: "expectUrl", path: "/index.html", name: "back returned" },
    { kind: "reload" },
    { kind: "expectText", selector: "#res", text: "waiting", name: "reload reset the page" },
    { kind: "expectNoConsoleErrors", name: "console is clean (blocked external image does not count)" },
    { kind: "screenshot", name: "end" },
  ]);
  validateRunResult(r);
  assert.equal(r.status, "passed", JSON.stringify(r.tests.filter((t) => t.outcome !== "passed").map((t) => [t.name, t.error?.message])));
  assert.equal(r.tests.length, 17, "only assertion steps make test records");
  assert.ok(r.tests.find((t) => t.name.startsWith("[ac:c1]"))!.criteria.includes("c1"));
  assert.ok((r.providerData.blockedRequests as string[]).some((u) => u.includes("tracker.example.invalid")));
});

test("browser: failing expectations are product defects with evidence, and later steps still run", { skip: SKIP }, async () => {
  const r = await run(
    [
      GOTO,
      { kind: "expectUrl", path: "/nowhere.html", name: "wrong url" },
      { kind: "expectCount", selector: ".it", count: 5, name: "wrong count" },
      { kind: "expectCount", selector: ".it", min: 4, name: "too few" },
      { kind: "expectAttribute", selector: "#box", attribute: "data-state", value: "broken", name: "wrong attribute" },
      { kind: "expectAttribute", selector: "#box", attribute: "data-missing", value: "x", name: "missing attribute" },
      { kind: "expectNotVisible", selector: "#h", name: "visible heading is not hidden" },
      { kind: "expectFocused", selector: "#name", name: "nothing focused yet" },
      { kind: "waitForVisible", selector: "#gone", timeoutMs: 300 },
      { kind: "select", selector: "#does-not-exist", value: "x" },
      { kind: "press", key: "Tab" },
      { kind: "expectVisible", selector: "#h", name: "still reachable" },
    ],
    { stepTimeoutMs: 500 },
  );
  validateRunResult(r);
  assert.equal(r.status, "failed");
  const byName = new Map(r.tests.map((t) => [t.name, t]));
  for (const n of ["wrong url", "wrong count", "too few", "wrong attribute", "missing attribute", "visible heading is not hidden", "nothing focused yet"]) {
    const t = byName.get(n)!;
    assert.equal(t.outcome, "failed", n);
    assert.equal(t.classification, "product_defect", n);
    assert.ok(t.evidenceRefs.some((id) => r.evidence.find((e) => e.id === id)?.kind === "screenshot"), `${n} has a failure screenshot`);
  }
  assert.match(byName.get("wrong url")!.error!.message, /\/nowhere\.html.*\/index\.html/);
  assert.match(byName.get("wrong count")!.error!.message, /exactly 5 but found 3/);
  assert.match(byName.get("too few")!.error!.message, /at least 4 but found 3/);
  assert.match(byName.get("wrong attribute")!.error!.message, /"ready"/);
  assert.match(byName.get("missing attribute")!.error!.message, /attribute not set/);
  assert.equal(r.tests.filter((t) => t.name.startsWith("waitForVisible") || t.name.startsWith("select")).every((t) => t.outcome === "failed"), true);
  assert.equal(r.tests.filter((t) => t.name.startsWith("waitForVisible") || t.name.startsWith("select")).length, 2);
  assert.equal(byName.get("still reachable")!.outcome, "passed");
});

test("browser: expectFocused follows a real Tab order, and a wrong order fails", { skip: SKIP }, async () => {
  const good = await run([
    { kind: "goto", path: "/kbd.html" },
    { kind: "press", key: "Tab" },
    { kind: "expectFocused", selector: "#t1", name: "first stop" },
    { kind: "press", key: "Tab" },
    { kind: "expectFocused", selector: "#t2", name: "second stop" },
    { kind: "press", key: "Tab" },
    { kind: "expectFocused", selector: "#t3", name: "third stop" },
    { kind: "press", key: "Shift+Tab" },
    { kind: "expectFocused", selector: "#t2", name: "Shift+Tab goes back" },
  ]);
  assert.equal(good.status, "passed", JSON.stringify(outcomes(good)));
  const bad = await run([{ kind: "goto", path: "/kbd.html" }, { kind: "press", key: "Tab" }, { kind: "press", key: "Tab" }, { kind: "expectFocused", selector: "#t1", name: "t1 after two Tabs" }], { stepTimeoutMs: 500 });
  assert.equal(bad.tests[0]!.outcome, "failed");
});

test("browser: expectNoConsoleErrors counts the page's own console.error, uncaught errors and own 404s since the last check; blocked external requests do not count", { skip: SKIP }, async () => {
  const r = await run(
    [
      { kind: "goto", path: "/err.html" },
      { kind: "expectNoConsoleErrors", name: "err page console" },
      { kind: "goto", path: "/index.html" },
      { kind: "expectNoConsoleErrors", name: "clean page after the error page" },
      { kind: "goto", path: "/missing.html" },
      { kind: "expectNoConsoleErrors", name: "own missing script" },
    ],
    { stepTimeoutMs: 1500 },
  );
  validateRunResult(r);
  const t = new Map(r.tests.map((x) => [x.name, x]));
  assert.equal(t.get("err page console")!.outcome, "failed");
  assert.match(t.get("err page console")!.error!.message, /boom-from-page/);
  assert.match(t.get("err page console")!.error!.message, /uncaught-boom/);
  assert.equal(t.get("clean page after the error page")!.outcome, "passed", "the cursor moved past the earlier errors; the blocked external image is not an error of the page");
  assert.equal(t.get("own missing script")!.outcome, "failed");
  assert.match(t.get("own missing script")!.error!.message, /missing\.js|404/);
});

// ---------- gerçek tarayıcı: şablonlar ----------

test("browser: all library templates run green on a sound site", { skip: SKIP }, async () => {
  const plan = validateVerification({
    browser: {
      siteDir: "site",
      templates: [
        { name: "smoke", params: { paths: ["/index.html", "/kbd.html"] } },
        { name: "form-submit", params: { path: "/index.html", fields: [{ selector: "#name", value: "Ada" }], submit: "#submit", expectText: { selector: "#res", text: "Hello Ada" } } },
        { name: "keyboard-order", params: { path: "/kbd.html", selectors: ["#t1", "#t2", "#t3", "#t4"] } },
        { name: "navigation", params: { path: "/index.html", links: [{ selector: "#to-sub", expectPath: "/sub/page.html" }] } },
        { name: "responsive-smoke", params: { paths: ["/good.html"], viewports: [{ width: 400, height: 700 }] } },
      ],
    },
  });
  const r = await run(plan.browser!.steps);
  validateRunResult(r);
  assert.equal(r.status, "passed", JSON.stringify(r.tests.filter((t) => t.outcome !== "passed").map((t) => [t.name, t.outcome, t.error?.message])));
  assert.equal(r.tests.length, 20, "smoke 6 + form 2 + keyboard 4 + navigation 1 + responsive 7 rules");
  assert.ok(r.tests.some((t) => /responsive-smoke \/good\.html \/ 400x700/.test(t.name)));
  assert.ok(r.evidence.some((e) => e.kind === "screenshot"));
});

test("browser: the smoke template catches an empty title, a console error and a missing script; keyboard-order catches a wrong order", { skip: SKIP }, async () => {
  const smoke = expandTemplate("smoke", { paths: ["/notitle.html", "/err.html", "/missing.html", "/index.html"] });
  const r = await run(smoke, { stepTimeoutMs: 800 });
  const o = new Map(outcomes(r));
  assert.equal(o.get("smoke /notitle.html: title is not empty"), "failed");
  assert.equal(o.get("smoke /notitle.html: body is visible and not empty"), "passed");
  assert.equal(o.get("smoke /err.html: no console errors"), "failed");
  assert.equal(o.get("smoke /missing.html: no console errors"), "failed");
  assert.equal(o.get("smoke /index.html: title is not empty"), "passed");
  assert.equal(o.get("smoke /index.html: no console errors"), "passed");
  const kb = await run(expandTemplate("keyboard-order", { path: "/kbd.html", selectors: ["#t1", "#t3"] }), { stepTimeoutMs: 500 });
  assert.equal(kb.tests[0]!.outcome, "passed");
  assert.equal(kb.tests[1]!.outcome, "failed", "the second Tab lands on #t2, not #t3");
});

// ---------- görsel regresyon ----------

const vrPage = (extra = "", heroHeight = 200): string => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>VR</title>
<style>body{margin:0;background:#ffffff;font:20px sans-serif;color:#111111}#hero{width:300px;height:${heroHeight}px;background:#336699}#note{padding:10px}</style></head>
<body><div id="hero"></div><p id="note">Visual regression fixture</p>${extra}</body></html>`;

function vrSite(html: string): string {
  const dir = mkTmp("agentmom-vr-site-");
  writeFileSync(join(dir, "index.html"), html);
  return dir;
}

const MATCH = { kind: "expectScreenshotMatch", name: "[ac:c1] home looks the same", baseline: "home.png" };

interface Vr {
  root: string; // kanıt kökü (hem koşu kanıtı hem onaylı taban deposu)
  taskId: string;
  baselineDir: string;
  workspaceBaselineDir: string;
}
function vrEnv(): Vr {
  const root = mkTmp("agentmom-vr-ev-");
  const taskId = randomUUID();
  return { root, taskId, baselineDir: baselineDirFor(root, taskId), workspaceBaselineDir: mkTmp("agentmom-vr-ws-") };
}
const vrRun = (env: Vr, html: string, steps: unknown[] = [GOTO, MATCH], over: Partial<BrowserRequest> = {}): Promise<RunResult> =>
  new BrowserProvider().run({ siteDir: vrSite(html), steps: steps as ScenarioStep[], evidenceDir: join(env.root, "run-" + randomUUID().slice(0, 8)), timeoutMs: 90_000, baselineDir: env.baselineDir, workspaceBaselineDir: env.workspaceBaselineDir, ...over }).result;
const baselinesOf = (r: RunResult): Array<Record<string, any>> => (r.providerData.baselines as Array<Record<string, any>>) ?? [];

test("visual regression: no baseline -> skipped (not failed) with the approve hint, the new image kept as evidence, and NOTHING is written as a baseline", { skip: SKIP }, async () => {
  const env = vrEnv();
  const r = await vrRun(env, vrPage());
  validateRunResult(r);
  assert.equal(r.status, "passed", "a missing baseline is not a failure");
  const t = r.tests[0]!;
  assert.equal(t.outcome, "skipped");
  assert.match(t.error!.detail ?? "", /taban yok: kaydetmek için approve gerekir/);
  assert.ok(t.criteria.includes("c1"));
  const shots = r.evidence.filter((e) => e.kind === "screenshot");
  assert.equal(shots.length, 1);
  assert.equal(checkEvidenceFile(shots[0]!), null);
  assert.equal(readFileSync(shots[0]!.path!).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.deepEqual(t.evidenceRefs, [shots[0]!.id]);
  const b = baselinesOf(r)[0]!;
  assert.equal(b.status, "missing");
  assert.equal(b.file, "home.png");
  assert.equal(b.newEvidenceId, shots[0]!.id);
  assert.equal(b.newSha256, shots[0]!.sha256);
  assert.equal(existsSync(env.baselineDir), false, "the approved folder was not created by the run");
  assert.deepEqual(readdirSync(env.workspaceBaselineDir), [], "the workspace folder was not written either");
});

test("visual regression: after approval the same page passes with the baseline hash on record; a changed page fails with a diff image; size mismatch fails; tolerance is respected", { skip: SKIP }, async () => {
  const env = vrEnv();
  const first = await vrRun(env, vrPage());
  const shot = first.evidence.find((e) => e.kind === "screenshot")!;
  const approved = approveBaseline({ evidenceRoot: env.root, taskId: env.taskId, name: "home.png", sourcePath: shot.path!, expectedSha256: shot.sha256! });
  assert.equal(approved.sha256, shot.sha256);

  const same = await vrRun(env, vrPage());
  validateRunResult(same);
  assert.equal(same.tests[0]!.outcome, "passed", JSON.stringify(same.tests[0]));
  assert.equal(same.status, "passed");
  const sb = baselinesOf(same)[0]!;
  assert.equal(sb.status, "match");
  assert.equal(sb.source, "approved");
  assert.equal(sb.baselineSha256, approved.sha256, "the approved baseline hash is on record");
  assert.equal(sb.ratio, 0);

  const changed = await vrRun(env, vrPage("", 400));
  validateRunResult(changed);
  assert.equal(changed.status, "failed");
  const ct = changed.tests[0]!;
  assert.equal(ct.outcome, "failed");
  assert.equal(ct.classification, "product_defect");
  assert.match(ct.error!.message, /% of pixels differ from the approved baseline home\.png/);
  const diff = changed.evidence.find((e) => e.summary.startsWith("visual diff"));
  assert.ok(diff, "a diff image was written as evidence");
  assert.equal(checkEvidenceFile(diff!), null);
  assert.equal(readFileSync(diff!.path!).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.ok(ct.evidenceRefs.includes(diff!.id), "the failed test points at the diff");
  assert.ok(ct.evidenceRefs.some((id) => id !== diff!.id && changed.evidence.find((e) => e.id === id)?.kind === "screenshot"), "and at the new screenshot");
  assert.equal(baselinesOf(changed)[0]!.status, "diff");
  assert.ok(baselinesOf(changed)[0]!.ratio > 0.1);

  // Küçük değişiklik (~0.2% alan): varsayılan %1 sınırında geçer, maxDiffRatio 0 ile kalır.
  const tiny = '<div style="position:absolute;left:400px;top:300px;width:30px;height:30px;background:#ff0000"></div>';
  const lenient = await vrRun(env, vrPage(tiny));
  assert.equal(lenient.tests[0]!.outcome, "passed", JSON.stringify(lenient.tests[0]));
  assert.ok(baselinesOf(lenient)[0]!.ratio > 0 && baselinesOf(lenient)[0]!.ratio < 0.01);
  const strict = await vrRun(env, vrPage(tiny), [GOTO, { ...MATCH, maxDiffRatio: 0 }]);
  assert.equal(strict.tests[0]!.outcome, "failed");

  // Boyut uyuşmazlığı = fark.
  const resized = await vrRun(env, vrPage(), [GOTO, { ...MATCH, viewport: { width: 400, height: 300 } }]);
  assert.equal(resized.tests[0]!.outcome, "failed");
  assert.match(resized.tests[0]!.error!.message, /size differs from the approved baseline.*baseline 900x600, now 400x300/);
  assert.equal(baselinesOf(resized)[0]!.status, "size-mismatch");
  assert.equal(resized.evidence.filter((e) => e.summary.startsWith("visual diff")).length, 0, "no pixel diff exists for different sizes");
  // Seçici ile kırpılmış görüntü de tabanla boyut olarak uyuşmaz.
  const element = await vrRun(env, vrPage(), [GOTO, { ...MATCH, selector: "#hero" }]);
  assert.equal(element.tests[0]!.outcome, "failed");
});

test("visual regression: a baseline that lives in the workspace (writable by the implementer) is never trusted: skipped with a warning even when identical, and an approved baseline wins", { skip: SKIP }, async () => {
  const env = vrEnv();
  const first = await vrRun(env, vrPage());
  const shot = first.evidence.find((e) => e.kind === "screenshot")!;
  // Uygulayıcı kendi görüntüsünü çalışma ağacına "taban" diye koyar.
  copyFileSync(shot.path!, join(env.workspaceBaselineDir, "home.png"));
  const identical = await vrRun(env, vrPage());
  validateRunResult(identical);
  const t = identical.tests[0]!;
  assert.equal(t.outcome, "skipped", "an identical workspace baseline must not produce a pass");
  assert.match(t.error!.message, /taban uygulayıcı tarafından yazılabilir bir konumdan/);
  assert.equal(baselinesOf(identical)[0]!.status, "untrusted");
  assert.equal(baselinesOf(identical)[0]!.source, "workspace");
  const different = await vrRun(env, vrPage("", 400));
  assert.equal(different.tests[0]!.outcome, "skipped", "a differing workspace baseline is a warning too, not a verdict");
  assert.equal(different.status, "passed");
  // Onaylı taban gelince o kullanılır; çalışma ağacındaki (farklı) dosya yok sayılır.
  const bigShot = (await vrRun(env, vrPage("", 400))).evidence.find((e) => e.kind === "screenshot")!;
  copyFileSync(bigShot.path!, join(env.workspaceBaselineDir, "home.png"));
  approveBaseline({ evidenceRoot: env.root, taskId: env.taskId, name: "home.png", sourcePath: shot.path!, expectedSha256: shot.sha256! });
  const both = await vrRun(env, vrPage());
  assert.equal(both.tests[0]!.outcome, "passed", JSON.stringify(both.tests[0]));
  assert.equal(baselinesOf(both)[0]!.source, "approved");
});

test("visual regression: a linked workspace folder and a corrupted approved baseline are errors, never passes", { skip: SKIP }, async () => {
  const env = vrEnv();
  const first = await vrRun(env, vrPage());
  const shot = first.evidence.find((e) => e.kind === "screenshot")!;
  const realWs = mkTmp("agentmom-vr-realws-");
  copyFileSync(shot.path!, join(realWs, "home.png"));
  const linkParent = mkTmp("agentmom-vr-link-");
  const link = join(linkParent, "baselines");
  symlinkSync(realWs, link, "junction");
  const viaLink = await vrRun(env, vrPage(), [GOTO, MATCH], { workspaceBaselineDir: link });
  assert.equal(viaLink.tests[0]!.outcome, "error");
  assert.match(viaLink.tests[0]!.error!.message, /cannot be used.*link/);
  assert.equal(viaLink.status, "error");
  mkdirSync(env.baselineDir, { recursive: true });
  writeFileSync(join(env.baselineDir, "home.png"), "this is not an image");
  const corrupt = await vrRun(env, vrPage());
  assert.equal(corrupt.tests[0]!.outcome, "error");
  assert.match(corrupt.tests[0]!.error!.message, /not a PNG/);
});

test("visual regression: duplicate step names and several matches in one run keep unique test ids and evidence", { skip: SKIP }, async () => {
  const env = vrEnv();
  const r = await vrRun(env, vrPage(), [GOTO, MATCH, { ...MATCH, baseline: "other.png" }]);
  validateRunResult(r);
  assert.equal(r.tests.length, 2);
  assert.equal(new Set(r.tests.map((t) => t.id)).size, 2);
  assert.equal(new Set(r.evidence.map((e) => e.id)).size, r.evidence.length);
  assert.deepEqual(baselinesOf(r).map((b) => b.file), ["home.png", "other.png"]);
  assert.notEqual(baselinesOf(r)[0]!.newEvidenceId, baselinesOf(r)[1]!.newEvidenceId);
});

// ---------- görsel ölçüm sertleştirmesi: Function.prototype.call/apply/bind ve cap nesnesi ----------

test("visual quality: overriding Function.prototype.call/apply/bind or Object.freeze cannot fake a pass; the captured table is frozen", { skip: SKIP }, async () => {
  const script = `<script>
var out = "";
try {
  var nm = Object.getOwnPropertyNames(window).filter(function (n) { return n.indexOf("__am_") === 0; })[0];
  var cap = window[nm];
  var orig = cap.gcs;
  try { cap.gcs = function () { return { display: "block" }; }; } catch (e) {}
  try { cap.fns.length = 0; } catch (e) {}
  try { cap.fns[0].fn = null; } catch (e) {}
  out = "frozen=" + Object.isFrozen(cap) + " fns=" + Object.isFrozen(cap.fns) + " same=" + (cap.gcs === orig) + " n=" + (cap.fns.length > 5);
} catch (e) { out = "err " + e.message; }
var fake = function () { return { width: 100, height: 100, left: 0, top: 0, right: 100, bottom: 100, display: "block" }; };
Function.prototype.call = fake; Function.prototype.apply = fake; Function.prototype.bind = fake;
Object.freeze = fake; Object.defineProperty = fake;
document.addEventListener("DOMContentLoaded", function () { document.getElementById("frz").textContent = out; });
</script>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>T</title><style>body{margin:0;font:16px sans-serif}#wide{width:600px;height:10px;background:#ccc}</style>${script}</head><body><p id="frz">pending</p><div id="wide"></div></body></html>`;
  const dir = mkTmp("agentmom-tamper-");
  writeFileSync(join(dir, "index.html"), html);
  const r = await run([GOTO, { kind: "expectText", selector: "#frz", text: "frozen=true fns=true same=true n=true", name: "capture table is frozen" }, { kind: "expectVisualQuality", name: "vq", viewports: [{ width: 360, height: 800 }], checks: ["overflow", "images"] }], { siteDir: dir });
  validateRunResult(r);
  assert.equal(r.tests[0]!.outcome, "passed", r.tests[0]!.error?.message);
  assert.equal(r.status, "failed");
  const vq = r.tests.slice(1);
  assert.ok(vq.every((t) => t.outcome === "failed" && /overrides built-in/.test(t.error!.message)), JSON.stringify(vq.map((t) => [t.name, t.outcome, t.error?.message])));
  assert.match(vq[0]!.error!.message, /Function\.prototype\.(call|apply|bind)|Object\.(freeze|defineProperty)/);
});

test("visual quality: overriding only Function.prototype.call still measures the real violation or reports tampering, never a pass", { skip: SKIP }, async () => {
  const dir = mkTmp("agentmom-tamper2-");
  writeFileSync(join(dir, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>T</title><style>body{margin:0}#wide{width:600px;height:10px;background:#ccc}</style><script>Function.prototype.call = function () { return { scrollWidth: 1, clientWidth: 1 }; };</script></head><body><div id="wide"></div></body></html>`);
  const r = await run([GOTO, { kind: "expectVisualQuality", name: "vq", viewports: [{ width: 360, height: 800 }], checks: ["overflow"] }], { siteDir: dir });
  assert.equal(r.tests[0]!.outcome, "failed");
});

// ---------- denetim düzeltmeleri (D6c): öğe düzeyi tuzaklar, kapalı içerik, onay kaydı, ayrılmış adlar, kavşak, boyut, konsol ----------

test("visual quality: an element-level Object.defineProperty trap (scrollWidth = 0) cannot fake a clean overflow result", { skip: SKIP }, async () => {
  const dir = mkTmp("agentmom-trap-");
  writeFileSync(join(dir, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>T</title><style>body{margin:0}#wide{width:600px;height:10px;background:#ccc}</style><script>Object.defineProperty(document.documentElement, "scrollWidth", { get: function () { return 0; } });</script></head><body><div id="wide"></div></body></html>`);
  const r = await run([GOTO, { kind: "expectVisualQuality", name: "vq", viewports: [{ width: 360, height: 800 }], checks: ["overflow"] }], { siteDir: dir });
  assert.equal(r.tests[0]!.outcome, "failed");
  assert.ok(r.tests[0]!.error!.message.includes("own property"), r.tests[0]!.error!.message);
});

test("visual quality: shadow DOM and iframes make the requested rules unverifiable (error), not silently clean", { skip: SKIP }, async () => {
  const dir = mkTmp("agentmom-shadow-");
  writeFileSync(join(dir, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>T</title></head><body><p>text</p><div id="h"></div><script>document.getElementById("h").attachShadow({ mode: "open" }).innerHTML = "<p style='font-size:6px'>tiny hidden in shadow</p>";</script></body></html>`);
  const r = await run([GOTO, { kind: "expectVisualQuality", name: "vq", viewports: [{ width: 400, height: 700 }], checks: ["font-size", "overflow"] }], { siteDir: dir });
  const o = new Map(outcomes(r));
  assert.equal(o.get("vq / 400x700 / smallest text >= 11px"), "error");
  assert.equal(o.get("vq / 400x700 / no horizontal overflow"), "error");
  const dir2 = mkTmp("agentmom-frame-");
  writeFileSync(join(dir2, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>T</title></head><body><p>text</p><iframe src="/index.html" title="f"></iframe></body></html>`);
  const r2 = await run([GOTO, { kind: "expectVisualQuality", name: "vq", viewports: [{ width: 400, height: 700 }], checks: ["images"] }], { siteDir: dir2 });
  assert.equal(r2.tests[0]!.outcome, "error");
});

test("console errors: a source URL spoofed with //# sourceURL does not hide the page's own console.error", { skip: SKIP }, async () => {
  const dir = mkTmp("agentmom-spoof-");
  writeFileSync(join(dir, "index.html"), `<!doctype html><html><head><title>T</title></head><body><p>x</p><script>eval('console.error("evaded-boom")\\n//# sourceURL=http://evil.example/x.js');</script></body></html>`);
  const r = await run([GOTO, { kind: "expectNoConsoleErrors", name: "spoof" }], { siteDir: dir, stepTimeoutMs: 1000 });
  assert.equal(r.tests[0]!.outcome, "failed");
  assert.ok(r.tests[0]!.error!.message.includes("evaded-boom"));
});

test("baseline names: Windows reserved device names are rejected in scenarios and plans", () => {
  for (const baseline of ["CON.png", "con.png", "Prn.png", "AUX.png", "nul.png", "COM1.png", "com9.png", "LPT1.png", "lpt9.png", "con.v2.png"]) {
    assert.throws(() => validateScenario([GOTO, { kind: "expectScreenshotMatch", name: "n", baseline }]), ScenarioError, baseline);
  }
  for (const baseline of ["console.png", "conf.png", "com10.png", "lpt0.png", "aux1.png", "nullable.png"]) assert.equal(validateScenario([GOTO, { kind: "expectScreenshotMatch", name: "n", baseline }]).length, 2, baseline);
  assert.throws(() => validateVerification({ browser: { siteDir: "site", steps: [GOTO, { kind: "expectScreenshotMatch", name: "n", baseline: "NUL.png" }] } }), ValidationError);
});

test("approved baselines: a file edited after approval is invalid; a file without an approval record is not trusted; the recorded hash passes", { skip: SKIP }, async () => {
  const env = vrEnv();
  const first = await vrRun(env, vrPage());
  const shot = first.evidence.find((e) => e.kind === "screenshot")!;
  const approved = approveBaseline({ evidenceRoot: env.root, taskId: env.taskId, name: "home.png", sourcePath: shot.path!, expectedSha256: shot.sha256! });
  const ok = await vrRun(env, vrPage(), [GOTO, MATCH], { approvedBaselines: { "home.png": approved.sha256 } });
  assert.equal(ok.tests[0]!.outcome, "passed", JSON.stringify(ok.tests[0]));
  const noRecord = await vrRun(env, vrPage(), [GOTO, MATCH], { approvedBaselines: {} });
  assert.equal(noRecord.tests[0]!.outcome, "error");
  assert.ok(noRecord.tests[0]!.error!.message.includes("no approval record"), noRecord.tests[0]!.error!.message);
  assert.equal(baselinesOf(noRecord)[0]!.status, "invalid");
  // Uygulayıcı onaylı klasördeki dosyayı elle başka (geçerli) bir PNG ile değiştirir: özet uyuşmaz.
  const other = (await vrRun(env, vrPage("", 400))).evidence.find((e) => e.kind === "screenshot")!;
  copyFileSync(other.path!, join(env.baselineDir, "home.png"));
  const edited = await vrRun(env, vrPage("", 400), [GOTO, MATCH], { approvedBaselines: { "home.png": approved.sha256 } });
  assert.equal(edited.tests[0]!.outcome, "error", "the swapped baseline would have matched the new page; the hash record prevents that");
  assert.ok(edited.tests[0]!.error!.message.includes("modified after approval"), edited.tests[0]!.error!.message);
});

test("workspace baselines: a .agentmom junction leading outside the workspace is refused", { skip: SKIP }, () => {
  const root = mkTmp("agentmom-wsroot-");
  const outside = mkTmp("agentmom-wsout-");
  mkdirSync(join(outside, "baselines"));
  writeFileSync(join(outside, "baselines", "home.png"), DOT_PNG);
  symlinkSync(outside, join(root, ".agentmom"), "junction");
  const r = resolveBaseline("home.png", { workspaceBaselineDir: join(root, ".agentmom", "baselines"), workspaceRoot: root }) as { invalid?: string };
  assert.ok(r.invalid && r.invalid.includes("outside the workspace"), JSON.stringify(r));
  // Gerçek (bağsız) klasör kabul edilir ve yine de "workspace" kaynaklıdır.
  const real = mkTmp("agentmom-wsreal-");
  mkdirSync(join(real, ".agentmom", "baselines"), { recursive: true });
  writeFileSync(join(real, ".agentmom", "baselines", "home.png"), DOT_PNG);
  const ok = resolveBaseline("home.png", { workspaceBaselineDir: join(real, ".agentmom", "baselines"), workspaceRoot: real });
  assert.equal(ok!.source, "workspace");
  assert.ok("sha256" in ok!);
});

test("visual regression: an oversized PNG header is refused before decoding (error)", { skip: SKIP }, async () => {
  const env = vrEnv();
  const huge = Buffer.from(DOT_PNG);
  huge.writeUInt32BE(9000, 16);
  huge.writeUInt32BE(9000, 20);
  mkdirSync(env.baselineDir, { recursive: true });
  writeFileSync(join(env.baselineDir, "home.png"), huge);
  const r = await vrRun(env, vrPage());
  assert.equal(r.tests[0]!.outcome, "error");
  assert.ok(r.tests[0]!.error!.message.includes("too large"), r.tests[0]!.error!.message);
});
