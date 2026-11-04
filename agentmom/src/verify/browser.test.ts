import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { BrowserProvider } from "./browser.ts";
import { checkEvidenceFile } from "./evidence-files.ts";
import { ScenarioError, validateScenario } from "./scenario.ts";
import type { ScenarioStep } from "./scenario.ts";
import { validateRunResult } from "./schema.ts";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const HAVE_EDGE = existsSync(EDGE);

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>Fixture</title></head><body>
<h1 id="title">Greeting page</h1>
<button id="btn" onclick="document.getElementById('out').textContent='clicked'">Say hi</button>
<p id="out">idle</p>
<img src="https://tracker.example.invalid/pixel.png" alt="external">
</body></html>`;

function site(): string {
  const dir = mkTmp("agentmom-site-");
  writeFileSync(join(dir, "index.html"), PAGE);
  writeFileSync(join(dir, ".secret"), "do-not-serve");
  mkdirSync(join(dir, "sub"));
  writeFileSync(join(dir, "sub", "page.html"), "<p id='x'>sub page</p>");
  return dir;
}

function req(steps: unknown[], over: Record<string, unknown> = {}) {
  return { siteDir: site(), steps: steps as ScenarioStep[], evidenceDir: mkTmp("agentmom-bev-"), timeoutMs: 60_000, ...over };
}

const GOTO = { kind: "goto", path: "/index.html" };

// ---------- scenario validation (pure) ----------

test("scenario: valid steps pass; unknown kinds, fields, traversal and external paths are rejected", () => {
  assert.equal(validateScenario([GOTO, { kind: "click", selector: "#btn" }]).length, 2);
  const bad = (steps: unknown) => assert.throws(() => validateScenario(steps), ScenarioError);
  bad([]);
  bad([{ kind: "click", selector: "#a" }]);
  bad([GOTO, { kind: "eval", code: "alert(1)" }]);
  bad([GOTO, { kind: "click", selector: "#a", extra: 1 }]);
  bad([{ kind: "goto", path: "/../etc/passwd" }]);
  bad([{ kind: "goto", path: "//evil.example/x" }]);
  bad([{ kind: "goto", path: "https://evil.example/x" }]);
  bad([GOTO, { kind: "expectText", selector: "#a", text: "t", name: "n", criteria: ["bad id"] }]);
  bad(new Array(80).fill(GOTO));
});

// ---------- real browser runs (installed Edge, local page) ----------

test("browser: a passing scenario produces criteria-tagged results and real screenshot evidence; external requests are blocked", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const r = await new BrowserProvider().run(
    req([
      GOTO,
      { kind: "expectVisible", selector: "#title", name: "[ac:c1] heading is visible" },
      { kind: "expectText", selector: "#title", text: "Greeting page", name: "heading text", criteria: ["c1"] },
      { kind: "click", selector: "#btn" },
      { kind: "expectText", selector: "#out", text: "clicked", name: "[ac:c2] button updates the page" },
      { kind: "screenshot", name: "final state" },
    ]),
  ).result;
  validateRunResult(r);
  assert.equal(r.status, "passed", JSON.stringify(r.tests.map((t) => [t.name, t.outcome, t.error?.message])));
  assert.deepEqual(r.totals, { passed: 4, failed: 0, skipped: 0, error: 0 });
  assert.deepEqual(r.tests.map((t) => t.criteria), [["c1"], ["c1"], ["c2"], []]);
  const shot = r.evidence.find((e) => e.kind === "screenshot")!;
  assert.ok(shot, "a screenshot was captured");
  assert.equal(checkEvidenceFile(shot), null);
  assert.ok(shot.bytes! > 1000, "a real image, not an empty file");
  assert.equal(readFileSync(shot.path!).subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "PNG signature");
  assert.ok(shot.path!.toLowerCase().startsWith("d:\\"), "evidence is on D:");
  assert.ok((r.providerData.blockedRequests as string[]).some((u) => u.includes("tracker.example.invalid")), "the external request was blocked, not sent");
  assert.equal(r.providerData.channel, "msedge");
});

test("browser: a wrong expectation is a product defect with a failure screenshot", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const r = await new BrowserProvider().run(req([GOTO, { kind: "expectText", selector: "#title", text: "Farewell", name: "[ac:c1] heading says farewell" }])).result;
  validateRunResult(r);
  assert.equal(r.status, "failed");
  const bad = r.tests[0]!;
  assert.equal(bad.classification, "product_defect");
  assert.match(bad.error?.message ?? "", /Farewell/);
  const refs = r.evidence.filter((e) => bad.evidenceRefs.includes(e.id) && e.kind === "screenshot");
  assert.equal(refs.length, 1);
  assert.equal(checkEvidenceFile(refs[0]!), null);
});

test("browser: a missing element is reported as a failed step, not a crash", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const r = await new BrowserProvider().run(req([GOTO, { kind: "click", selector: "#does-not-exist" }, { kind: "expectVisible", selector: "#title", name: "still reachable" }], { stepTimeoutMs: 800 })).result;
  validateRunResult(r);
  assert.equal(r.tests[0]!.outcome, "failed");
  assert.equal(r.tests[0]!.classification, "product_defect");
  assert.equal(r.tests[1]!.outcome, "passed", "later steps still run");
});

test("browser: the static server never serves dotfiles or paths outside the site", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const r = await new BrowserProvider().run(req([{ kind: "goto", path: "/.secret" }, { kind: "expectText", selector: "body", text: "not found", name: "dotfile is hidden" }])).result;
  assert.equal(r.tests[0]!.outcome, "passed", JSON.stringify(r.tests));
  const r2 = await new BrowserProvider().run(req([{ kind: "goto", path: "/sub/page.html" }, { kind: "expectText", selector: "#x", text: "sub page", name: "sub pages work" }])).result;
  assert.equal(r2.tests[0]!.outcome, "passed");
});

test("browser: a launch failure is an environment problem, not a product defect", async () => {
  const r = await new BrowserProvider().run(req([GOTO, { kind: "expectVisible", selector: "#title", name: "x" }], { channel: "no-such-browser" })).result;
  validateRunResult(r);
  assert.equal(r.status, "error");
  assert.equal(r.tests[0]!.classification, "environment");
});

test("browser: the run is killed at the timeout and classified infra", async () => {
  const t0 = Date.now();
  const r = await new BrowserProvider().run(req([GOTO, { kind: "expectVisible", selector: "#title", name: "x" }], { timeoutMs: 300 })).result;
  assert.equal(r.status, "timed_out");
  assert.equal(r.tests[0]!.classification, "infra");
  assert.ok(Date.now() - t0 < 20_000);
  validateRunResult(r);
});

test("browser: cancellation stops the run", async () => {
  const h = new BrowserProvider().run(req([GOTO, { kind: "expectVisible", selector: "#title", name: "x" }]));
  await new Promise((r) => setTimeout(r, 200));
  await h.cancel();
  const r = await h.result;
  assert.equal(r.status, "cancelled");
});

test("browser: external fetches and WebSockets from the page are blocked and recorded", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const dir = site();
  writeFileSync(join(dir, "net.html"), `<!doctype html><p id="s">start</p><script>
fetch("http://tracker.example.invalid/beacon").catch(() => {});
try { new WebSocket("ws://tracker.example.invalid/socket"); } catch (e) {}
document.getElementById("s").textContent = "done";
</script>`);
  const r = await new BrowserProvider().run({ siteDir: dir, steps: [{ kind: "goto", path: "/net.html" }, { kind: "expectText", selector: "#s", text: "done", name: "page ran" }], evidenceDir: mkTmp("agentmom-bev-"), timeoutMs: 60_000 }).result;
  assert.equal(r.tests[0]!.outcome, "passed", JSON.stringify(r.tests));
  const blocked = (r.providerData.blockedRequests as string[]).join(" ");
  assert.match(blocked, /tracker\.example\.invalid\/beacon/);
  assert.match(blocked, /ws:/);
});

test("browser: a site directory containing a symlink/junction is refused", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const dir = site();
  const outside = mkTmp("agentmom-outside-");
  writeFileSync(join(outside, "x.html"), "<p>outside</p>");
  symlinkSync(outside, join(dir, "out"), "junction");
  await assert.rejects(new BrowserProvider().run({ siteDir: dir, steps: [{ kind: "goto", path: "/index.html" }], evidenceDir: mkTmp("agentmom-bev-"), timeoutMs: 30_000 }).result, /symlink\/junction/);
});

test("browser: backslash and malformed-percent paths do not reach hidden files and do not crash the server", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const r = await new BrowserProvider().run(req([{ kind: "goto", path: "/%5C.secret" }, { kind: "expectText", selector: "body", text: "not found", name: "backslash dotfile hidden" }])).result;
  assert.equal(r.tests[0]!.outcome, "passed", JSON.stringify(r.tests));
  const r2 = await new BrowserProvider().run(req([{ kind: "goto", path: "/%zz" }, { kind: "expectText", selector: "body", text: "not found", name: "bad escape handled" }])).result;
  assert.equal(r2.tests[0]!.outcome, "passed", JSON.stringify(r2.tests));
});

// ---------- görsel kalite kapısı (madde 51): expectVisualQuality ----------

test("scenario: expectVisualQuality accepts viewports/checks/criteria and rejects bad sizes, unknown checks and unknown fields", () => {
  const ok = validateScenario([GOTO, { kind: "expectVisualQuality", name: "vq", viewports: [{ width: 360, height: 800 }, { width: 3000, height: 200 }], checks: ["contrast", "overflow"], criteria: ["c1"] }]);
  assert.equal(ok[1]!.kind, "expectVisualQuality");
  assert.equal(validateScenario([GOTO, { kind: "expectVisualQuality", name: "vq" }]).length, 2, "everything optional but the name");
  const bad = (step: Record<string, unknown>) => assert.throws(() => validateScenario([GOTO, { kind: "expectVisualQuality", name: "vq", ...step }]), ScenarioError);
  bad({ name: "" });
  bad({ viewports: [] });
  bad({ viewports: new Array(5).fill({ width: 360, height: 800 }) });
  bad({ viewports: [{ width: 199, height: 800 }] });
  bad({ viewports: [{ width: 360, height: 3001 }] });
  bad({ viewports: [{ width: 360.5, height: 800 }] });
  bad({ viewports: [{ width: "360", height: 800 }] });
  bad({ viewports: [{ width: 360 }] });
  bad({ viewports: [{ width: 360, height: 800, deviceScaleFactor: 3 }] });
  bad({ viewports: "mobile" });
  bad({ checks: [] });
  bad({ checks: ["beauty"] });
  bad({ checks: ["contrast", "contrast"] });
  bad({ checks: "contrast" });
  bad({ criteria: ["bad id"] });
  bad({ code: "alert(1)" });
});

const DOT_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const GOOD_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Good</title>
<style>
body{margin:0;font:16px/1.5 sans-serif;background:#fff;color:#111}
main{padding:16px}
button,a.btn{display:inline-block;min-width:44px;min-height:44px;padding:8px 12px;margin:4px;font-size:16px;background:#1a56db;color:#fff;border:0}
img{width:32px;height:32px}
p{max-width:60ch}
.grad{background:linear-gradient(#ffffff,#eeeeee);color:#999999;padding:8px}
</style></head><body><main>
<h1>Welcome</h1>
<p>Plain readable text with enough contrast.</p>
<p>Read the <a href="/index.html">terms</a> carefully.</p>
<button id="b1">First</button><button id="b2">Second</button><a class="btn" href="/index.html">Link</a>
<img alt="dot" src="/dot.png">
<div class="grad">Low contrast on a gradient is skipped, not judged</div>
</main></body></html>`;

const BAD_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bad</title>
<style>
body{margin:0;font:16px sans-serif;background:#fff;color:#111}
#wide{width:600px;height:10px;background:#cccccc}
#tiny{font-size:8px}
#faint{color:#cccccc;background:#ffffff}
#small{display:block;width:12px;height:12px;padding:0;border:0;background:#333}
#o1,#o2{position:absolute;top:400px;width:100px;height:50px}
#o1{left:20px}#o2{left:60px}
#clip{width:80px;overflow:hidden;white-space:nowrap}
</style></head><body>
<div id="wide"></div>
<p id="tiny">tiny text here</p>
<p id="faint">faint grey text</p>
<button id="small" aria-label="tiny"></button>
<button id="o1">One</button><button id="o2">Two</button>
<div id="clip">This long sentence is clipped by its box</div>
<img id="broken" src="/missing.png" style="width:40px;height:40px" alt="gone">
</body></html>`;

function pageSite(html: string): string {
  const dir = mkTmp("agentmom-vsite-");
  writeFileSync(join(dir, "index.html"), html);
  writeFileSync(join(dir, "dot.png"), DOT_PNG);
  return dir;
}

const outcomes = (r: { tests: Array<{ name: string; outcome: string }> }): Record<string, string> => Object.fromEntries(r.tests.map((t) => [t.name, t.outcome]));

test("visual quality: a sound page passes every rule at three viewports, with one real screenshot per viewport and skipped (gradient) elements reported", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const r = await new BrowserProvider().run(req([GOTO, { kind: "expectVisualQuality", name: "[ac:c1] visual quality", criteria: ["c2"] }], { siteDir: pageSite(GOOD_PAGE) })).result;
  validateRunResult(r);
  assert.equal(r.status, "passed", JSON.stringify(r.tests.filter((t) => t.outcome !== "passed").map((t) => [t.name, t.error?.message])));
  assert.equal(r.tests.length, 21, "3 viewports x 7 rules");
  assert.ok(r.tests.every((t) => t.criteria.includes("c1") && t.criteria.includes("c2")));
  assert.ok(r.tests.some((t) => t.name === "[ac:c1] visual quality / 360x800 / no horizontal overflow"));
  assert.ok(r.tests.some((t) => t.name === "[ac:c1] visual quality / 1280x800 / text contrast (WCAG AA)"));
  const shots = r.evidence.filter((e) => e.kind === "screenshot");
  assert.equal(shots.length, 3);
  for (const s of shots) {
    assert.equal(checkEvidenceFile(s), null);
    assert.equal(readFileSync(s.path!).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  }
  assert.ok(r.tests.every((t) => t.evidenceRefs.length === 1), "each passing rule points at its viewport screenshot");
  const visual = r.providerData.visual as Array<{ name: string; checked: number; skipped: number; violations: number }>;
  const contrast = visual.filter((v) => v.name.endsWith("text contrast (WCAG AA)"));
  assert.equal(contrast.length, 3);
  assert.ok(contrast.every((v) => v.skipped >= 1 && v.checked >= 3 && v.violations === 0), JSON.stringify(contrast));
});

test("visual quality: a bad page fails exactly the broken rules, naming the element and the measured value; horizontal overflow shows at 360 px only", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const r = await new BrowserProvider().run(req([GOTO, { kind: "expectVisualQuality", name: "vq" }], { siteDir: pageSite(BAD_PAGE) })).result;
  validateRunResult(r);
  assert.equal(r.status, "failed");
  const o = outcomes(r);
  for (const vp of ["360x800", "768x1024", "1280x800"]) {
    for (const rule of ["no clipped text", "smallest text >= 11px", "interactive targets >= 24x24px", "text contrast (WCAG AA)", "no overlapping controls", "images are not broken"]) {
      assert.equal(o[`vq / ${vp} / ${rule}`], "failed", `${vp} ${rule}`);
    }
  }
  assert.equal(o["vq / 360x800 / no horizontal overflow"], "failed");
  assert.equal(o["vq / 768x1024 / no horizontal overflow"], "passed");
  assert.equal(o["vq / 1280x800 / no horizontal overflow"], "passed");
  const detail = (rule: string) => r.tests.find((t) => t.name === `vq / 360x800 / ${rule}`)!;
  assert.match(detail("no horizontal overflow").error!.message, /scrollWidth 600 > clientWidth 360/);
  assert.match(detail("no horizontal overflow").error!.detail ?? "", /culprit: div#wide/);
  assert.match(detail("no clipped text").error!.message, /div#clip.*scrollWidth \d+ > clientWidth 80/);
  assert.match(detail("smallest text >= 11px").error!.message, /p#tiny.*font-size 8px < 11px/);
  assert.match(detail("interactive targets >= 24x24px").error!.message, /button#small.*12x12px < 24x24px/);
  assert.match(detail("text contrast (WCAG AA)").error!.message, /p#faint.*contrast 1\.6\d:1 < 4\.5:1/);
  assert.match(detail("no overlapping controls").error!.message, /button#o1.*overlaps button#o2/);
  assert.match(detail("images are not broken").error!.message, /img#broken.*naturalWidth 0/);
  for (const t of r.tests.filter((x) => x.outcome === "failed")) {
    assert.equal(t.classification, "product_defect");
    assert.ok(t.evidenceRefs.length >= 2, "log + the viewport screenshot");
    assert.ok(t.evidenceRefs.some((id) => r.evidence.find((e) => e.id === id)?.kind === "screenshot"));
  }
  assert.equal(r.evidence.filter((e) => e.kind === "screenshot").length, 3, "one screenshot per viewport, shared by its rules");
  const ids = r.evidence.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("visual quality: a subset of rules and custom viewports produce exactly those tests, and later steps still run", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const r = await new BrowserProvider().run(
    req(
      [GOTO, { kind: "expectVisualQuality", name: "vq", viewports: [{ width: 400, height: 700 }], checks: ["contrast", "overflow"] }, { kind: "expectVisible", selector: "#faint", name: "later step still works" }],
      { siteDir: pageSite(BAD_PAGE) },
    ),
  ).result;
  validateRunResult(r);
  assert.deepEqual(r.tests.map((t) => [t.name, t.outcome]), [
    ["vq / 400x700 / text contrast (WCAG AA)", "failed"],
    ["vq / 400x700 / no horizontal overflow", "failed"],
    ["later step still works", "passed"],
  ]);
});

// ---------- güvenlik denetimi düzeltmeleri: ölçülemeyen kural sessizce geçmez, ezilmiş yerleşikler sahte geçiş üretemez ----------

const GRADIENT_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Gradient</title>
<style>body{margin:0;font:16px sans-serif;background:linear-gradient(#ffffff,#eeeeee);color:#cccccc}</style></head><body><p>faint text on a gradient</p></body></html>`;

test("visual quality: a gradient body cannot hide low-contrast text: the contrast rule is unverifiable (error), not passed", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const r = await new BrowserProvider().run(req([GOTO, { kind: "expectVisualQuality", name: "vq", viewports: [{ width: 400, height: 700 }] }], { siteDir: pageSite(GRADIENT_PAGE) })).result;
  validateRunResult(r);
  const o = outcomes(r);
  assert.equal(o["vq / 400x700 / text contrast (WCAG AA)"], "error");
  assert.match(r.tests.find((t) => t.name.endsWith("text contrast (WCAG AA)"))!.error!.message, /not verifiable: 1 of 1/);
  assert.equal(r.status, "error");
  assert.equal(o["vq / 400x700 / no horizontal overflow"], "passed");
});

test("visual quality: a page with nothing to measure reports 'skipped' for those rules, not a green pass", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const r = await new BrowserProvider().run(req([GOTO, { kind: "expectVisualQuality", name: "vq", viewports: [{ width: 400, height: 700 }] }], { siteDir: pageSite('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Empty</title></head><body></body></html>') })).result;
  validateRunResult(r);
  const o = outcomes(r);
  assert.equal(o["vq / 400x700 / smallest text >= 11px"], "skipped");
  assert.equal(o["vq / 400x700 / interactive targets >= 24x24px"], "skipped");
  assert.equal(o["vq / 400x700 / images are not broken"], "skipped");
  assert.equal(o["vq / 400x700 / no horizontal overflow"], "passed");
  assert.equal(r.status, "passed");
});

const OVERRIDE_SCRIPT = `<script>
Element.prototype.getBoundingClientRect = function () { return { width: 100, height: 100, left: 0, top: 0, right: 100, bottom: 100 }; };
window.getComputedStyle = function () { return { display: "block", visibility: "visible", color: "rgb(0, 0, 0)", backgroundColor: "rgb(255, 255, 255)", backgroundImage: "none", fontSize: "16px", fontWeight: "400", overflowX: "visible", overflowY: "visible", pointerEvents: "auto" }; };
</script>`;

test("visual quality: a page that overrides built-ins to fake a clean result fails every rule instead", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const r = await new BrowserProvider().run(req([GOTO, { kind: "expectVisualQuality", name: "vq" }], { siteDir: pageSite(BAD_PAGE.replace("</head>", `${OVERRIDE_SCRIPT}</head>`)) })).result;
  validateRunResult(r);
  assert.equal(r.status, "failed");
  assert.equal(r.tests.length, 21);
  assert.ok(r.tests.every((t) => t.outcome === "failed"), JSON.stringify(outcomes(r)));
  assert.ok(r.tests.every((t) => /overrides built-in/.test(t.error!.message) && /getComputedStyle/.test(t.error!.message)));
  // Kontrol: aynı sayfa betiksiz olsaydı gerçek ihlaller bulunurdu (üstteki test); ezme ile bile "geçti" üretilemez.
});

test("visual quality: instance-level overrides (document.querySelectorAll) do not blind the measurement", { skip: !HAVE_EDGE && "Edge is not installed" }, async () => {
  const html = BAD_PAGE.replace("</head>", "<script>document.querySelectorAll = function () { return []; };</script></head>");
  const r = await new BrowserProvider().run(req([GOTO, { kind: "expectVisualQuality", name: "vq", viewports: [{ width: 360, height: 800 }], checks: ["overlap", "images"] }], { siteDir: pageSite(html) })).result;
  validateRunResult(r);
  assert.deepEqual(r.tests.map((t) => t.outcome), ["failed", "failed"]);
  assert.match(r.tests[0]!.error!.message, /overlaps/);
});

test("scenario: at most 8 measured viewports across all expectVisualQuality steps", () => {
  const vq = (n?: number) => ({ kind: "expectVisualQuality", name: "vq", ...(n ? { viewports: new Array(n).fill({ width: 360, height: 800 }) } : {}) });
  assert.equal(validateScenario([GOTO, vq(), vq(), vq(2)]).length, 4, "3 + 3 + 2 = 8 is fine");
  assert.throws(() => validateScenario([GOTO, vq(), vq(), vq()]), /at most 8 viewports/);
  assert.throws(() => validateScenario([GOTO, vq(4), vq(4), vq(1)]), ScenarioError);
});
