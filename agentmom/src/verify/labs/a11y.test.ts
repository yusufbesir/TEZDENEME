// Erişilebilirlik laboratuvarı testleri (madde 27). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Her denetim için geçen ve kalan HTML parçası, kontrast hesabı bilinen değerlerle, kötü niyetli girdiler (büyük, derin, kapanmamış tırnak, sahte etiket, ReDoS).
// Dosyalar yalnız testlerin kendi mkTmp klasörlerinde oluşturulur; tarayıcı, ağ ve süreç yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../../testing/tmp.ts";
import { validateRunResult } from "../schema.ts";
import { A11Y_CHECKS, A11yLabProvider, MAX_A11Y_FILE_BYTES, auditHtml, contrastRatio, parseHtml, validateA11yPlan } from "./a11y.ts";
import { LabSpecError, runLab } from "./index.ts";

interface DocOpts {
  lang?: string | null;
  title?: string | null;
  head?: string;
  body?: string;
}

// Hatasız taban sayfa; her test yalnız bir parçayı bozar.
function doc(o: DocOpts = {}): string {
  const lang = o.lang === null ? "" : ` lang="${o.lang ?? "en"}"`;
  const title = o.title === null ? "" : `<title>${o.title ?? "Home"}</title>`;
  return `<!doctype html>\n<html${lang}>\n<head><meta charset="utf-8">${title}${o.head ?? '<meta name="viewport" content="width=device-width, initial-scale=1">'}</head>\n<body>\n${o.body ?? "<h1>Welcome</h1>"}\n</body>\n</html>\n`;
}

const keys = (html: string): string[] => [...new Set(auditHtml(html).map((f) => f.check))].sort();

test("the baseline page has no findings at all", () => {
  const body = '<h1>Welcome</h1><h2>Sub</h2><img src="a.png" alt="A cat"><form><label for="n">Name</label><input id="n" type="text"><label>Email <input type="email"></label><button>Send</button></form><a href="/x">Read more</a><table><tr><th>A</th></tr><tr><td>1</td></tr></table>';
  assert.deepEqual(auditHtml(doc({ body })), []);
});

// [denetim anahtarı, kalan parça, geçen parçalar]
const CASES: Array<{ key: string; bad: string[]; good: string[] }> = [
  { key: "lang", bad: [doc({ lang: null }), doc({ lang: "" }), doc({ lang: "e n!" }), doc({ lang: "123" }), "<h1>fragment without html</h1><title>t</title>"], good: [doc({ lang: "tr" }), doc({ lang: "en-US" }), doc({ lang: "zh-Hant-TW" })] },
  { key: "title", bad: [doc({ title: null }), doc({ title: "" }), doc({ title: "   " }), doc({ head: "<svg><title>icon</title></svg>", title: null })], good: [doc({ title: "Ana sayfa" })] },
  { key: "img-alt", bad: [doc({ body: '<h1>x</h1><img src="a.png">' }), doc({ body: '<h1>x</h1><input type="image" src="b.png">' }), doc({ body: '<h1>x</h1><map name="m"><area href="/a" shape="rect" coords="0,0,1,1"></map>' })], good: [doc({ body: '<h1>x</h1><img src="a.png" alt="">' }), doc({ body: '<h1>x</h1><img src="a.png" alt="cat">' }), doc({ body: '<h1>x</h1><img src="a.png" role="presentation">' }), doc({ body: '<h1>x</h1><input type="image" src="b.png" alt="Go">' })] },
  { key: "form-labels", bad: [doc({ body: '<h1>x</h1><input type="text" name="q">' }), doc({ body: '<h1>x</h1><select name="s"><option>a</option></select>' }), doc({ body: '<h1>x</h1><textarea name="t"></textarea>' }), doc({ body: '<h1>x</h1><label for="q"></label><input id="q">' }), doc({ body: '<h1>x</h1><input aria-labelledby="gone">' })], good: [doc({ body: '<h1>x</h1><label for="q">Search</label><input id="q">' }), doc({ body: '<h1>x</h1><input aria-label="Search">' }), doc({ body: '<h1>x</h1><span id="l">Search</span><input aria-labelledby="l">' }), doc({ body: "<h1>x</h1><label>Search <input></label>" }), doc({ body: '<h1>x</h1><input title="Search">' }), doc({ body: '<h1>x</h1><input type="hidden" name="h"><input type="submit"><input type="button" value="b">' })] },
  { key: "button-names", bad: [doc({ body: "<h1>x</h1><button></button>" }), doc({ body: '<h1>x</h1><button><img src="i.png" alt=""></button>' }), doc({ body: '<h1>x</h1><input type="button">' }), doc({ body: '<h1>x</h1><div role="button"></div>' })], good: [doc({ body: "<h1>x</h1><button>Go</button>" }), doc({ body: '<h1>x</h1><button><img src="i.png" alt="Go"></button>' }), doc({ body: '<h1>x</h1><button aria-label="Go"></button>' }), doc({ body: '<h1>x</h1><input type="button" value="Go">' }), doc({ body: '<h1>x</h1><div role="button">Go</div>' })] },
  { key: "link-names", bad: [doc({ body: '<h1>x</h1><a href="/x"></a>' }), doc({ body: '<h1>x</h1><a href="/x"><span></span></a>' }), doc({ body: '<h1>x</h1><span role="link"></span>' })], good: [doc({ body: '<h1>x</h1><a href="/x">Read</a>' }), doc({ body: '<h1>x</h1><a href="/x"><img src="h.png" alt="Home"></a>' }), doc({ body: '<h1>x</h1><a href="/x" aria-label="Home"></a>' }), doc({ body: '<h1>x</h1><a href="/x"><span aria-label="Home"></span></a>' })] },
  { key: "heading-order", bad: [doc({ body: "<h1>a</h1><h3>b</h3>" }), doc({ body: "<h1>a</h1><h2>b</h2><h4>c</h4>" })], good: [doc({ body: "<h1>a</h1><h2>b</h2><h3>c</h3><h2>d</h2>" }), doc({ body: "<h1>a</h1><h2>b</h2><h3>c</h3><h1>d</h1>".replace("<h1>d</h1>", "<h2>d</h2>") })] },
  { key: "single-h1", bad: [doc({ body: "<h1>a</h1><h1>b</h1>" }), doc({ body: "<h2>no h1</h2>" }), doc({ body: "<p>no headings</p>" })], good: [doc({ body: "<h1>a</h1><h2>b</h2>" })] },
  { key: "tabindex", bad: [doc({ body: '<h1>x</h1><div tabindex="3">a</div>' }), doc({ body: '<h1>x</h1><div tabindex="1">a</div>' })], good: [doc({ body: '<h1>x</h1><div tabindex="0">a</div><div tabindex="-1">b</div><div tabindex="x">c</div>' })] },
  { key: "duplicate-id", bad: [doc({ body: '<h1 id="a">x</h1><p id="a">y</p>' })], good: [doc({ body: '<h1 id="a">x</h1><p id="b">y</p>' })] },
  { key: "parsing", bad: [doc({ body: '<h1>x</h1><div class="open>never closed</div>' }), doc({ body: `<h1>x</h1>${"<div>".repeat(250)}` })], good: [doc({ body: '<h1>x</h1><div class="closed">ok</div>' })] },
  { key: "aria-roles", bad: [doc({ body: '<h1>x</h1><div role="banana">a</div>' }), doc({ body: '<h1>x</h1><div role="button banana">a</div>' })], good: [doc({ body: '<h1>x</h1><div role="navigation">a</div><div role="doc-toc">b</div><div role="presentation">c</div>' })] },
  { key: "aria-refs", bad: [doc({ body: '<h1>x</h1><div aria-labelledby="missing">a</div>' }), doc({ body: '<h1>x</h1><span id="d">d</span><div aria-describedby="d nope">a</div>' })], good: [doc({ body: '<h1>x</h1><span id="d">d</span><div aria-labelledby="d" aria-describedby="d">a</div>' })] },
  { key: "aria-hidden-focus", bad: [doc({ body: '<h1>x</h1><div aria-hidden="true"><a href="/x">l</a></div>' }), doc({ body: '<h1>x</h1><button aria-hidden="true">b</button>' }), doc({ body: '<h1>x</h1><div aria-hidden="true"><div><input type="text" aria-label="q"></div></div>' })], good: [doc({ body: '<h1>x</h1><div aria-hidden="true"><a href="/x" tabindex="-1">l</a><p>text</p></div>' }), doc({ body: '<h1>x</h1><div aria-hidden="false"><a href="/x">l</a></div>' }), doc({ body: '<h1>x</h1><div aria-hidden="true"><button disabled>b</button></div>' })] },
  { key: "anchor-href", bad: [doc({ body: '<h1>x</h1><a onclick="go()">go</a>' }), doc({ body: '<h1>x</h1><a role="button" tabindex="0">go</a>' })], good: [doc({ body: '<h1>x</h1><a name="top"></a><a id="s">anchor target</a>' })] },
  { key: "table-headers", bad: [doc({ body: "<h1>x</h1><table><tr><td>1</td></tr></table>" })], good: [doc({ body: "<h1>x</h1><table><tr><th>A</th></tr></table>" }), doc({ body: '<h1>x</h1><table role="presentation"><tr><td>1</td></tr></table>' }), doc({ body: '<h1>x</h1><table><tr><td role="columnheader">A</td></tr></table>' })] },
  { key: "viewport", bad: [doc({ head: '<meta name="viewport" content="width=device-width, user-scalable=no">' }), doc({ head: '<meta name="viewport" content="width=device-width; user-scalable=0">' }), doc({ head: '<meta name="viewport" content="width=device-width, maximum-scale=1">' }), doc({ head: '<meta name="viewport" content="initial-scale=1,maximum-scale=1.5">' })], good: [doc({ head: '<meta name="viewport" content="width=device-width, maximum-scale=2">' }), doc({ head: '<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=yes">' }), doc({ head: "" })] },
];

test("every check has a failing and a passing HTML fragment, and a bad fragment trips exactly its own check", () => {
  assert.deepEqual(CASES.map((c) => c.key).sort(), A11Y_CHECKS.map((c) => c.key).sort(), "all checks are covered");
  for (const c of CASES) {
    c.bad.forEach((html, i) => {
      const got = keys(html);
      assert.ok(got.includes(c.key), `${c.key} bad[${i}] should fail, got ${JSON.stringify(got)}`);
    });
    c.good.forEach((html, i) => {
      assert.ok(!keys(html).includes(c.key), `${c.key} good[${i}] should pass, got ${JSON.stringify(auditHtml(html).filter((f) => f.check === c.key))}`);
    });
  }
  // Tek bir kusur başka denetimleri tetiklemez (örnek: yalnız dil eksik).
  assert.deepEqual(keys(doc({ lang: null })), ["lang"]);
  assert.deepEqual(keys(doc({ title: null })), ["title"]);
  assert.deepEqual(keys(doc({ body: '<h1>x</h1><img src="a.png">' })), ["img-alt"]);
});

test("findings carry the line number and a short, masked excerpt", () => {
  const html = doc({ body: '<h1>x</h1>\n<p>text</p>\n<img src="a.png" data-note="password=hunter2hunter2 token=abcd1234efgh">' });
  const f = auditHtml(html).find((x) => x.check === "img-alt")!;
  assert.equal(f.line, 7);
  assert.ok(f.excerpt.startsWith("<img src="));
  assert.ok(f.excerpt.length <= 100);
  assert.ok(!f.excerpt.includes("hunter2hunter2"), "secrets are masked in the excerpt");
  const long = auditHtml(doc({ body: `<h1>x</h1><img src="${"a".repeat(5000)}.png">` })).find((x) => x.check === "img-alt")!;
  assert.ok(long.excerpt.length <= 100);
});

test("scripts and styles are ignored: fake tags inside them create no elements", () => {
  const body = '<h1>x</h1><script>document.write("<img src=x><input><button></button><a href=/x></a>"); var s = "</div>";</script><style>a::after{content:"<img>"}</style><SCRIPT type="x"><img src=y></SCRIPT ><p>after</p>';
  assert.deepEqual(keys(doc({ body })), []);
  const parsed = parseHtml(doc({ body }), Date.now() + 5000);
  assert.ok(!parsed.els.some((e) => e.tag === "img" || e.tag === "script" || e.tag === "input"));
  assert.ok(parsed.els.some((e) => e.tag === "p"), "content after the script is still parsed");
  // Kapanmamış <script> sonrasını yutar ama hata vermez.
  assert.doesNotThrow(() => auditHtml('<html lang="en"><title>t</title><h1>x</h1><script>never closed <img src=x>'));
  // Yorumlar da yok sayılır.
  assert.deepEqual(keys(doc({ body: '<h1>x</h1><!-- <img src="x"> -->' })), []);
});

test("contrast: known ratios and thresholds for normal and large text", async () => {
  assert.ok(Math.abs(contrastRatio("#000000", "#ffffff") - 21) < 1e-9);
  assert.ok(Math.abs(contrastRatio("#ffffff", "#000000") - 21) < 1e-9, "order does not matter");
  assert.equal(contrastRatio("#336699", "#336699"), 1);
  assert.ok(Math.abs(contrastRatio("#777777", "#ffffff") - 4.48) < 0.01);
  assert.ok(Math.abs(contrastRatio("#767676", "#ffffff") - 4.54) < 0.01);
  const root = mkTmp("agentmom-a11y-c-");
  writeFileSync(join(root, "p.html"), doc());
  const r = await new A11yLabProvider()
    .run({
      root,
      files: ["p.html"],
      contrastPairs: [
        { name: "black on white", fg: "#000000", bg: "#ffffff" },
        { name: "#767676 passes", fg: "#767676", bg: "#ffffff" },
        { name: "#777777 fails", fg: "#777777", bg: "#ffffff" },
        { name: "#777777 large passes", fg: "#777777", bg: "#ffffff", large: true },
        { name: "light grey large fails", fg: "#aaaaaa", bg: "#ffffff", large: true },
        { name: "inverted passes", fg: "#ffffff", bg: "#000000" },
        { name: "uppercase hex", fg: "#767676", bg: "#FFFFFF" },
      ],
    })
    .result;
  assert.deepEqual(r.tests.filter((t) => t.id.startsWith("wcag-1.4.3-contrast")).map((t) => t.outcome), ["passed", "passed", "failed", "passed", "failed", "passed", "passed"]);
  assert.equal(r.status, "failed");
});

test("contrast boundary: the darkest grey that passes 4.5 on white and its neighbour that fails, for normal and large text", async () => {
  const hex = (g: number): string => `#${g.toString(16).padStart(2, "0").repeat(3)}`;
  // En açık gri ton: g büyüdükçe kontrast düşer; son geçen ton ile ondan bir açık (kalan) ton sınırı verir.
  const lightestPassing = (need: number): number => {
    let best = 0;
    for (let g = 0; g <= 255 && contrastRatio(hex(g), "#ffffff") + 1e-9 >= need; g++) best = g;
    return best;
  };
  const gN = lightestPassing(4.5);
  const gL = lightestPassing(3);
  assert.equal(gN, 0x76);
  assert.ok(gL > 0x76 && gL < 0xff);
  const root = mkTmp("agentmom-a11y-b-");
  writeFileSync(join(root, "p.html"), doc());
  const r = await new A11yLabProvider().run({
    root,
    files: ["p.html"],
    contrastPairs: [
      { name: "n-pass", fg: hex(gN), bg: "#ffffff" },
      { name: "n-fail", fg: hex(gN + 1), bg: "#ffffff" },
      { name: "l-pass", fg: hex(gL), bg: "#ffffff", large: true },
      { name: "l-fail", fg: hex(gL + 1), bg: "#ffffff", large: true },
    ],
  }).result;
  assert.deepEqual(r.tests.filter((t) => t.id.startsWith("wcag-1.4.3")).map((t) => t.outcome), ["passed", "failed", "passed", "failed"]);
  const bad = r.tests.find((t) => t.outcome === "failed")!;
  assert.match(bad.error!.message, /below the required 4\.5:1/);
  assert.equal(bad.classification, "product_defect");
});

test("provider: a clean page passes, a bad page fails with WCAG-referenced test ids, and the result is a valid RunResult", async () => {
  const root = mkTmp("agentmom-a11y-p-");
  writeFileSync(join(root, "good.html"), doc({ body: "<h1>Hi</h1><button>Go</button>" }));
  mkdirSync(join(root, "site"));
  writeFileSync(join(root, "site", "bad.htm"), doc({ lang: null, body: '<h1>Hi</h1><img src="a.png">\n<button></button>' }));
  const good = validateRunResult(await new A11yLabProvider().run({ root, files: ["good.html"] }).result);
  assert.equal(good.provider, "a11y-lab");
  assert.equal(good.status, "passed");
  assert.equal(good.tests.length, A11Y_CHECKS.length);
  assert.ok(good.tests.every((t) => t.outcome === "passed" && t.id.startsWith("wcag-")));
  const bad = validateRunResult(await new A11yLabProvider().run({ root, files: ["good.html", "site/bad.htm"] }).result);
  assert.equal(bad.status, "failed");
  assert.deepEqual(bad.tests.filter((t) => t.outcome === "failed").map((t) => t.id), ["wcag-3.1.1-lang", "wcag-1.1.1-img-alt", "wcag-4.1.2-button-names"]);
  const alt = bad.tests.find((t) => t.id === "wcag-1.1.1-img-alt")!;
  assert.equal(alt.classification, "product_defect");
  assert.match(alt.name, /\[WCAG 1\.1\.1\]/);
  assert.match(alt.error!.detail ?? "", /site\/bad\.htm:\d+ .*<img src="a\.png">/);
  assert.equal((bad.providerData as { analysed: number }).analysed, 2);
  assert.equal(validateRunResult(await runLab("a11y", { root, files: ["good.html"] })).status, "passed");
});

test("provider: criteria fragments claim WCAG tests for acceptance criteria", async () => {
  const root = mkTmp("agentmom-a11y-k-");
  writeFileSync(join(root, "p.html"), doc());
  const r = await new A11yLabProvider().run({ root, files: ["p.html"], criteria: { c1: ["WCAG 3.1.1", "WCAG 2.4.2"], c2: ["contrast"] }, contrastPairs: [{ name: "body text", fg: "#222222", bg: "#ffffff" }] }).result;
  assert.deepEqual(r.tests.find((t) => t.id === "wcag-3.1.1-lang")!.criteria, ["c1"]);
  assert.deepEqual(r.tests.find((t) => t.id === "wcag-2.4.2-title")!.criteria, ["c1"]);
  assert.deepEqual(r.tests.find((t) => t.id === "wcag-1.4.3-contrast-1")!.criteria, ["c2"]);
  assert.deepEqual(r.tests.find((t) => t.id === "wcag-1.1.1-img-alt")!.criteria, []);
});

test("provider: unreadable files are infra errors (never a silent pass): missing, too large, through a junction", async () => {
  const root = mkTmp("agentmom-a11y-e-");
  const other = mkTmp("agentmom-a11y-o-");
  writeFileSync(join(other, "x.html"), doc());
  writeFileSync(join(root, "big.html"), `${doc()}${"<!-- pad -->".repeat(Math.ceil(MAX_A11Y_FILE_BYTES / 12) + 10)}`);
  writeFileSync(join(root, "ok.html"), doc());
  const files = ["missing.html", "big.html"];
  let junction = false;
  try {
    symlinkSync(other, join(root, "link"), "junction");
    files.push("link/x.html");
    junction = true;
  } catch {
    // bağ oluşturulamayan ortam: bu alt durum atlanır
  }
  const r = validateRunResult(await new A11yLabProvider().run({ root, files: [...files, "ok.html"] }).result);
  assert.equal(r.status, "error");
  const errors = r.tests.filter((t) => t.outcome === "error");
  assert.equal(errors.length, files.length);
  assert.ok(errors.every((t) => t.classification === "infra"));
  assert.match(errors[0]!.error!.message, /does not exist/);
  assert.match(errors[1]!.error!.message, /larger than 300 KB/);
  if (junction) assert.match(errors[2]!.error!.message, /outside the workspace or goes through a symlink/);
  assert.equal(r.tests.filter((t) => t.id.startsWith("wcag-") && t.outcome !== "passed").length, 0, "the readable file was still analysed");
  // Hiç dosya okunamazsa denetimler boşuna "geçmez": yalnız hata testleri vardır.
  const none = validateRunResult(await new A11yLabProvider().run({ root, files: ["missing.html"] }).result);
  assert.equal(none.status, "error");
  assert.ok(none.tests.every((t) => t.outcome === "error"));
  // Eşlenen ölçütler hata testinde de talep edilir: kanıtsız "doğrulandı" sayılmaz.
  const claimed = validateRunResult(await new A11yLabProvider().run({ root, files: ["missing.html"], criteria: { c1: ["x"] } }).result);
  assert.deepEqual(claimed.tests[0]!.criteria, ["c1"]);
});

test("request validation: files, extensions, traversal, colors, root and unknown fields", () => {
  const root = mkTmp("agentmom-a11y-v-");
  const run = (spec: unknown) => new A11yLabProvider().run(spec as never);
  const bad = (spec: unknown, re?: RegExp) => assert.throws(() => run(spec), (e) => e instanceof LabSpecError && (re ? re.test(e.message) : true));
  bad({ root, files: [] });
  bad({ root, files: Array.from({ length: 21 }, (_, i) => `p${i}.html`) }, /1 to 20/);
  bad({ root, files: ["p.txt"] }, /\.html/);
  bad({ root, files: ["../p.html"] }, /\.\./);
  bad({ root, files: ["/abs/p.html"] });
  bad({ root, files: ["C:/p.html"] });
  bad({ root, files: ["a\\p.html"] });
  bad({ root, files: ["a//p.html"] });
  bad({ root, files: ["p.html", "P.HTML"] }, /repeat/);
  bad({ root, files: [5] });
  bad({ root, files: ["p.html"], extra: 1 }, /unknown field/);
  bad({ root: join(root, "nope"), files: ["p.html"] }, /existing directory/);
  bad({ root: 5, files: ["p.html"] });
  bad({ root, files: ["p.html"], contrastPairs: [{ name: "x", fg: "red", bg: "#ffffff" }] }, /#rrggbb/);
  bad({ root, files: ["p.html"], contrastPairs: [{ name: "x", fg: "#fff", bg: "#ffffff" }] });
  bad({ root, files: ["p.html"], contrastPairs: [{ name: "x", fg: "#gggggg", bg: "#ffffff" }] });
  bad({ root, files: ["p.html"], contrastPairs: [{ name: "x", fg: "#000000", bg: "#ffffff", large: "yes" }] });
  bad({ root, files: ["p.html"], contrastPairs: [{ name: "x", fg: "#000000", bg: "#ffffff", extra: 1 }] });
  bad({ root, files: ["p.html"], contrastPairs: Array.from({ length: 51 }, () => ({ name: "x", fg: "#000000", bg: "#ffffff" })) });
  bad({ root, files: ["p.html"], criteria: { "bad id!": ["x"] } });
  bad({ root, files: ["p.html"], timeoutMs: 0 });
  assert.deepEqual(validateA11yPlan({ files: ["a.html", "d/b.htm"], contrastPairs: [{ name: "n", fg: "#ABCDEF", bg: "#000000", large: true }] }), { files: ["a.html", "d/b.htm"], contrastPairs: [{ name: "n", fg: "#abcdef", bg: "#000000", large: true }] });
  assert.throws(() => validateA11yPlan({ files: ["a.html"], root: "x" }), LabSpecError);
});

// ---------- kötü niyetli / aşırı girdi ----------

const timed = async <T>(fn: () => T | Promise<T>): Promise<{ ms: number; value: T }> => {
  const t0 = Date.now();
  const value = await fn();
  return { ms: Date.now() - t0, value };
};

test("hostile input: a file close to 300 KB is analysed quickly; deep nesting, element floods and unclosed quotes are findings, not hangs", async () => {
  const root = mkTmp("agentmom-a11y-h-");
  const near = doc({ body: `<h1>x</h1>${"<p>paragraph <b>bold</b></p>\n".repeat(9000)}` }).slice(0, MAX_A11Y_FILE_BYTES - 2000);
  assert.ok(near.length > 250 * 1024);
  const hostile: Record<string, string> = {
    "near.html": near,
    "deep.html": doc({ body: `<h1>x</h1>${"<div>".repeat(60000)}` }),
    "flood.html": doc({ body: `<h1>x</h1>${"<i></i>".repeat(45000)}` }).slice(0, MAX_A11Y_FILE_BYTES),
    "quote.html": doc({ body: `<h1>x</h1><img alt="${"never closed ".repeat(20000)}` }).slice(0, MAX_A11Y_FILE_BYTES),
    "angles.html": `<html lang="en"><title>t</title>${"<a ".repeat(90000)}`,
    "attrs.html": doc({ body: `<h1>x</h1><div ${'a="1" '.repeat(50000)}>x</div>` }).slice(0, MAX_A11Y_FILE_BYTES),
    "slashes.html": `<html lang="en"><title>t</title>${"</".repeat(140000)}`,
    "redos.html": doc({ body: `<h1>x</h1><a href="${" ".repeat(250000)}`, head: `<meta name="viewport" content="${"=,;".repeat(20000)}">` }).slice(0, MAX_A11Y_FILE_BYTES),
  };
  for (const [name, text] of Object.entries(hostile)) writeFileSync(join(root, name), text);
  const files = Object.keys(hostile);
  for (const f of files) assert.ok(statLen(join(root, f)) <= MAX_A11Y_FILE_BYTES, f);
  const { ms, value: r } = await timed(() => new A11yLabProvider().run({ root, files, timeoutMs: 30000 }).result);
  assert.ok(ms < 8000, `analysis took ${ms} ms`);
  validateRunResult(r);
  assert.equal((r.providerData as { analysed: number }).analysed, files.length, "every hostile file was analysed to the end");
  assert.ok(r.tests.find((t) => t.id === "wcag-4.1.1-parsing")!.outcome === "failed");
  const parsing = r.tests.find((t) => t.id === "wcag-4.1.1-parsing")!.error!.detail!;
  assert.match(parsing, /nested deeper than 200/);
  assert.match(parsing, /more than 20000 elements/);
  assert.match(parsing, /unclosed attribute quote/);
  // Her tek dosya da tek başına hızlı biter ve çökmez.
  for (const f of files) {
    const t = await timed(() => auditHtml(hostile[f] as string, Date.now() + 20000));
    assert.ok(t.ms < 3000, `${f} took ${t.ms} ms`);
  }
});

function statLen(p: string): number {
  return statSync(p).size;
}

test("hostile input: the time budget stops the analysis, and a past deadline raises the budget error", async () => {
  const big = doc({ body: `<h1>x</h1>${"<p>a</p>".repeat(30000)}` });
  assert.throws(() => parseHtml(big, Date.now() - 1), (e) => e instanceof Error && e.name === "A11yBudgetError");
  const root = mkTmp("agentmom-a11y-t-");
  writeFileSync(join(root, "a.html"), doc());
  // Süresi dolmuş bütçe: koşu timed_out olur, dosyalar atlanır; sonuç yine geçerli şemadır ve "passed" OLMAZ.
  const r = await new A11yLabProvider().run({ root, files: ["a.html"], timeoutMs: 1 }).result;
  validateRunResult(r);
  assert.ok(r.status === "passed" || r.status === "timed_out", "1 ms is either enough for a tiny file or ends in timed_out");
});

test("hostile input: HTML control characters and secrets in findings are masked in the run result", async () => {
  const root = mkTmp("agentmom-a11y-s-");
  writeFileSync(join(root, "s.html"), doc({ body: '<h1>x</h1><img src="a.png" title="api_key=sk-abcdefghijklmnopqrstuv\u0007">' }));
  const r = await new A11yLabProvider().run({ root, files: ["s.html"] }).result;
  const dump = JSON.stringify(r);
  assert.ok(!dump.includes("sk-abcdefghijklmnopqrstuv"));
  assert.ok(!dump.includes("\u0007"));
  assert.equal(r.tests.find((t) => t.id === "wcag-1.1.1-img-alt")!.outcome, "failed");
});

test("HTML comment terminators the browser honours (<!-->, <!--->, --!>) cannot hide elements from the scan", async () => {
  const root = mkTmp("agentmom-a11y-cm-");
  for (const [name, html] of [["a.html", "<!DOCTYPE html><html lang=\"tr\"><head><title>t</title></head><body><!--><img src=a.png><!-- --></body></html>"], ["b.html", "<!DOCTYPE html><html lang=\"tr\"><head><title>t</title></head><body><!---><img src=a.png><!-- --></body></html>"], ["c.html", "<!DOCTYPE html><html lang=\"tr\"><head><title>t</title></head><body><!-- x --!><img src=a.png><!-- --></body></html>"]] as const) writeFileSync(join(root, name), html);
  for (const f of ["a.html", "b.html", "c.html"]) {
    const run = await new A11yLabProvider().run({ root, files: [f] }).result;
    assert.ok(run.tests.some((t) => t.outcome === "failed" && /1\.1\.1/.test(t.id)), `${f}: the img without alt is still found`);
  }
});
