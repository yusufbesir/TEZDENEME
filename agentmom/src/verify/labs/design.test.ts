// Tasarım laboratuvarı testleri (madde 49 + 50). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Her denetim için geçen ve kalan örnek, renk dönüşümleri, tolerans sınırı, nötr kuralı, ölçekler, çeşitlilik sınırları, placeholder listesi, şablon renkleri,
// specFile hataları ve kötü niyetli girdiler (büyük, çok bildirimli, kapanmamış tırnak/yorum, derin @media, var() döngüsü, çok uzun değer).
// Dosyalar yalnız testlerin kendi mkTmp klasörlerinde oluşturulur; tarayıcı, ağ ve süreç yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../../testing/tmp.ts";
import { validateRunResult } from "../schema.ts";
import type { RunResult } from "../schema.ts";
import { A11yLabProvider } from "./a11y.ts";
import { readFileInside } from "./safe-read.ts";
import { DESIGN_CHECKS, DesignLabProvider, MAX_DECLARATIONS_PER_FILE, MAX_DESIGN_FILE_BYTES, TEMPLATE_COLORS, colorsIn, normText, validateDesignPlan, validateDesignSpec } from "./design.ts";
import type { DesignSpec } from "./design.ts";
import { LabSpecError, runLab } from "./index.ts";

const SPEC: DesignSpec = {
  palette: ["#1a2b3c", "#ff6600"],
  fonts: ["Inter", "Georgia"],
  spacingScale: [0, 4, 8, 12, 16, 24, 32],
  radiusScale: [0, 4, 8],
  forbidden: { strings: ["Acme Corp"] },
};

async function run(files: Record<string, string>, spec: DesignSpec = SPEC, extra: Record<string, unknown> = {}): Promise<RunResult> {
  const root = mkTmp("agentmom-design-");
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(root, name, ".."), { recursive: true });
    writeFileSync(join(root, name), text);
  }
  return validateRunResult(await new DesignLabProvider().run({ root, files: Object.keys(files), spec, ...extra } as never).result);
}

const t = (r: RunResult, key: string) => r.tests.find((x) => x.id === `design-${key}`)!;
const css = (body: string): Record<string, string> => ({ "a.css": body });
const page = (body: string, head = ""): string => `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>Dashboard</title>${head}</head>\n<body>\n${body}\n</body>\n</html>\n`;

// Bir CSS parçasının tek bir denetimde kalıp kalmadığı.
async function fails(key: string, body: string, spec: DesignSpec = SPEC): Promise<boolean> {
  return t(await run(css(body), spec), key).outcome === "failed";
}

test("a conforming stylesheet and page pass every check (skipped ones only when the spec has no rule for them)", async () => {
  const r = await run({
    "style.css": ":root { --brand: #1a2b3c; }\nbody { font-family: Inter, sans-serif; color: var(--brand); margin: 0; padding: 16px 24px; border-radius: 8px; background: #fff; }\na { color: #ff6600; gap: 8px; }\n",
    "index.html": page('<h1>Quarterly report</h1><p style="margin: 8px; color: #1a2b3c">Numbers</p>', "<style>h1 { font-size: 24px; font-family: Georgia, serif; }</style>"),
  });
  assert.equal(r.provider, "design-lab");
  assert.equal(r.status, "passed", JSON.stringify(r.tests.filter((x) => x.outcome !== "passed" && x.outcome !== "skipped").map((x) => x.error)));
  assert.equal(r.tests.length, DESIGN_CHECKS.length);
  assert.deepEqual(r.tests.map((x) => x.id), DESIGN_CHECKS.map((c) => `design-${c.key}`));
  assert.ok(r.tests.every((x) => x.outcome === "passed"));
  assert.ok(r.tests.every((x) => /^\[design\] /.test(x.name)));
  // Spec'te ölçek / yasak dize yoksa o denetimler "skipped" olur ve nedenini adda taşır.
  const bare = await run(css("a { color: #1a2b3c; margin: 5px; border-radius: 3px }"), { palette: ["#1a2b3c"], fonts: [] });
  assert.equal(bare.status, "passed");
  assert.deepEqual(["spacing-scale", "radius-scale", "forbidden-strings", "token-discipline"].map((k) => t(bare, k).outcome), ["skipped", "skipped", "skipped", "skipped"]);
  assert.match(t(bare, "spacing-scale").name, /skipped: no spacingScale/);
  assert.match(t(bare, "token-discipline").name, /skipped: no custom properties are defined/);
});

test("color parsing: #rgb/#rrggbb/#rgba, rgb(), hsl(), named colors and neutral keywords convert to RGB; url() and non-colors are ignored", () => {
  const one = (v: string) => colorsIn(v).map((c) => c.rgb);
  assert.deepEqual(one("#abc"), [[170, 187, 204]]);
  assert.deepEqual(one("#AABBCC"), [[170, 187, 204]]);
  assert.deepEqual(one("#abcd"), [[170, 187, 204]], "alpha digit is ignored");
  assert.deepEqual(one("#aabbcc80"), [[170, 187, 204]]);
  assert.deepEqual(one("rgb(255, 102, 0)"), [[255, 102, 0]]);
  assert.deepEqual(one("rgba(255,102,0,.5)"), [[255, 102, 0]]);
  assert.deepEqual(one("rgb(100% 0% 0% / 50%)"), [[255, 0, 0]]);
  assert.deepEqual(one("hsl(0, 100%, 50%)"), [[255, 0, 0]]);
  assert.deepEqual(one("hsl(24 100% 50%)"), [[255, 102, 0]]);
  assert.deepEqual(one("hsla(120deg, 100%, 25%, 0.3)"), [[0, 128, 0]]);
  assert.deepEqual(one("hsl(360, 100%, 50%)"), [[255, 0, 0]]);
  assert.deepEqual(one("RED"), [[255, 0, 0]]);
  assert.deepEqual(one("1px solid RebeccaPurple"), [[102, 51, 153]]);
  assert.deepEqual(one("transparent"), [null]);
  assert.deepEqual(one("currentColor"), [null]);
  assert.deepEqual(one("0 0 4px rgba(0,0,0,.2), 0 1px red"), [[0, 0, 0], [255, 0, 0]]);
  assert.deepEqual(one("linear-gradient(135deg, #667eea 0%, rgb(118, 75, 162) 100%)"), [[102, 126, 234], [118, 75, 162]]);
  // Renk olmayanlar ve atlananlar.
  assert.deepEqual(one("url(red.png)"), []);
  assert.deepEqual(one('url("data:image/png;base64,#fff")'), []);
  assert.deepEqual(one("#12345"), [], "5 hex digits is not a color");
  assert.deepEqual(one("#abcg"), []);
  assert.deepEqual(one("var(--red)"), [], "custom property names are not colors");
  assert.deepEqual(one("var(--c, #fff)"), [[255, 255, 255]], "a literal fallback is a color");
  assert.deepEqual(one("rgb(var(--r), 0, 0)"), [], "dynamic colors are not followed");
  assert.deepEqual(one("12px solid"), []);
  assert.deepEqual(one("color-mix(in srgb, red 40%, blue)").length, 2, "inside unknown functions literal colors are still seen");
});

test("palette-conformance: non-palette colors fail, palette colors pass in every notation, neutrals follow allowNeutrals", async () => {
  assert.equal(await fails("palette-conformance", "a { color: #ff00aa }"), true);
  assert.equal(await fails("palette-conformance", "a { color: red }"), true);
  assert.equal(await fails("palette-conformance", "a { background-color: rgb(1, 2, 250) }"), true);
  assert.equal(await fails("palette-conformance", "a { background: hsl(200, 80%, 40%) }"), true);
  // palette: #1a2b3c = rgb(26,43,60), #ff6600 = rgb(255,102,0)
  for (const ok of ["#1a2b3c", "#1A2B3C", "rgb(26, 43, 60)", "rgb(255 102 0)", "hsl(24, 100%, 50%)", "hsla(24deg 100% 50% / .4)"]) assert.equal(await fails("palette-conformance", `a { color: ${ok} }`), false, ok);
  // Nötr kural: #000, #fff, transparent, currentColor, inherit, gri tonları (r≈g≈b).
  for (const n of ["#000", "#fff", "#FFFFFF", "#888", "#7b7b7d", "transparent", "currentColor", "inherit", "gray", "white", "rgb(10, 10, 10)"]) assert.equal(await fails("palette-conformance", `a { color: ${n} }`), false, n);
  assert.equal(await fails("palette-conformance", "a { color: #000 }", { ...SPEC, allowNeutrals: false }), true, "allowNeutrals:false makes #000 a violation");
  assert.equal(await fails("palette-conformance", "a { color: transparent; border-color: currentColor }", { ...SPEC, allowNeutrals: false }), false, "keywords are never colors");
  assert.equal(await fails("palette-conformance", "a { color: #888 }", { ...SPEC, allowNeutrals: false }), true);
  // Bir griye çok yakın ama gri olmayan renk nötr sayılmaz.
  assert.equal(await fails("palette-conformance", "a { color: #808a80 }"), true);
});

test("palette-conformance covers every color-carrying property, custom properties, <style> and style=\"\"; var() usage is NOT followed", async () => {
  for (const decl of ["border: 1px solid #ff00aa", "border-top-color: #ff00aa", "outline: 2px solid #ff00aa", "fill: #ff00aa", "stroke: #ff00aa", "box-shadow: 0 0 4px #ff00aa", "text-shadow: 1px 1px #ff00aa", "background-image: linear-gradient(#ff00aa, #fff)", "--accent: #ff00aa", "--shadow: 0 0 2px red"]) {
    assert.equal(await fails("palette-conformance", `a { ${decl}; }`), true, decl);
  }
  // Renk taşımayan özelliklerdeki ve dizgilerdeki renk benzeri metinler taranmaz.
  assert.equal(await fails("palette-conformance", 'a::after { content: "#ff00aa red"; font-family: Inter; margin: 4px; }'), false);
  // Sınır: var(--x) kullanımı takip edilmez (yalnız --x tanımı taranır).
  assert.equal(await fails("palette-conformance", "a { color: var(--undefined-token) }"), false);
  assert.equal(await fails("palette-conformance", ":root { --brand: #ff00aa } a { color: var(--brand) }"), true, "the definition is what is flagged");
  const html = await run({ "i.html": page('<p style="color: #ff00aa">x</p>', "<style>\np { background: #00ffaa; }\n</style>") });
  const f = t(html, "palette-conformance");
  assert.equal(f.outcome, "failed");
  assert.match(f.error!.message, /2 violation\(s\) in 1 file\(s\)/);
  assert.match(f.error!.detail!, /i\.html:\d+ color #ff00aa is not in the palette \(nearest #[0-9a-f]{6}, distance [\d.]+ > 6\) — color: #ff00aa/);
  assert.match(f.error!.detail!, /i\.html:\d+ color #00ffaa .* — background: #00ffaa/);
  assert.equal(f.classification, "product_defect");
});

test("palette-conformance tolerance: a distance equal to the tolerance passes, one step further fails; 0 means exact", async () => {
  const spec: DesignSpec = { palette: ["#102030"], fonts: [] };
  assert.equal(await fails("palette-conformance", "a { color: #102036 }", spec), false, "distance 6 = default tolerance");
  assert.equal(await fails("palette-conformance", "a { color: #102037 }", spec), true, "distance 7");
  assert.equal(await fails("palette-conformance", "a { color: #102037 }", { ...spec, paletteTolerance: 7 }), false);
  assert.equal(await fails("palette-conformance", "a { color: #102038 }", { ...spec, paletteTolerance: 7 }), true);
  assert.equal(await fails("palette-conformance", "a { color: #102031 }", { ...spec, paletteTolerance: 0 }), true);
  assert.equal(await fails("palette-conformance", "a { color: #102030 }", { ...spec, paletteTolerance: 0 }), false);
  // Öklid: iki kanalda 4'er fark = 5.66 ≤ 6; üçer kanalda 4'er = 6.93 > 6.
  assert.equal(await fails("palette-conformance", "a { color: #142434 }", spec), true);
  assert.equal(await fails("palette-conformance", "a { color: #142434 }", { ...spec, paletteTolerance: 7 }), false);
  assert.equal(await fails("palette-conformance", "a { color: #142430 }", spec), false);
});

test("font-conformance: only the first family counts; generic fallbacks lead freely; font shorthand is parsed simply", async () => {
  for (const ok of ["Inter, sans-serif", '"Inter", Arial', "'Georgia', serif", "georgia", "monospace", "system-ui", "sans-serif", "serif", "inherit", "var(--font-body)", "Inter,Comic Sans"]) assert.equal(await fails("font-conformance", `a { font-family: ${ok} }`), false, ok);
  for (const bad of ["Arial, sans-serif", '"Comic Sans MS", cursive', "-apple-system, Inter", "cursive", "Roboto"]) assert.equal(await fails("font-conformance", `a { font-family: ${bad} }`), true, bad);
  assert.equal(await fails("font-conformance", "a { font: 14px Inter }"), false);
  assert.equal(await fails("font-conformance", "a { font: italic 700 14px/1.5 Georgia, serif }"), false);
  assert.equal(await fails("font-conformance", "a { font: italic 700 14px/1.5 Arial, sans-serif }"), true);
  assert.equal(await fails("font-conformance", 'a { font: bold 1.2rem "Helvetica Neue", Inter }'), true);
  assert.equal(await fails("font-conformance", "a { font: inherit }"), false, "no size token: skipped, not guessed");
  const r = await run(css("a { font-family: var(--f); font: inherit; font-size: var(--s) }"));
  assert.equal((r.providerData as { skippedDynamic: { fonts: number } }).skippedDynamic.fonts, 3, "skipped declarations are counted");
  const d = t(await run(css("\n\na { font-family: Arial, serif }")), "font-conformance");
  assert.match(d.error!.detail!, /a\.css:3 font "arial" leads the font stack but is not an allowed font — font-family: Arial, serif/);
});

test("spacing-scale: px values on the scale pass; off-scale fail; %, em, rem, auto, calc() and var() are skipped and counted", async () => {
  for (const ok of ["margin: 0 8px 16px 24px", "padding: 0", "gap: 12px", "margin: -8px", "padding-inline: 4px 32px", "row-gap: 8px", "column-gap: 0px", "margin: 1em 2rem auto 5%", "padding: calc(8px + 3px)", "margin: var(--space)", "gap: 2vh 3ch", "margin: 8px !important", "grid-gap: 16px"]) assert.equal(await fails("spacing-scale", `a { ${ok} }`), false, ok);
  for (const bad of ["margin: 5px", "padding: 8px 10px", "gap: 20px", "margin-top: -7px", "padding-block-end: 9px", "column-gap: 100px", "margin: 8px 8px 8px 7px", "padding: 8.5px"]) assert.equal(await fails("spacing-scale", `a { ${bad} }`), true, bad);
  const r = await run(css("a { margin: 1em 2rem auto 5% calc(1px + 2px); gap: var(--g) }"));
  assert.equal(t(r, "spacing-scale").outcome, "passed");
  assert.equal((r.providerData as { skippedDynamic: { spacing: number } }).skippedDynamic.spacing, 5, "em, rem, %, calc() and var() are counted, auto is not a value");
  const d = t(await run(css("a {\n  padding: 8px 10px;\n}")), "spacing-scale");
  assert.match(d.error!.detail!, /a\.css:2 10px is not on the spacing scale \[0, 4, 8, 12, 16, 24, 32\] — padding: 8px 10px/);
});

test("radius-scale: scale values pass; off-scale fail; percentages are skipped; the slash form is read per token", async () => {
  for (const ok of ["border-radius: 8px", "border-radius: 0 4px 8px 4px", "border-radius: 50%", "border-top-left-radius: 4px", "border-radius: 8px / 4px", "border-radius: var(--r)", "border-radius: 1em"]) assert.equal(await fails("radius-scale", `a { ${ok} }`), false, ok);
  for (const bad of ["border-radius: 6px", "border-radius: 8px 9px", "border-bottom-right-radius: 10px", "border-radius: 9999px"]) assert.equal(await fails("radius-scale", `a { ${bad} }`), true, bad);
  // Palet / ölçek dışındaki özellikler karışmaz: margin ölçeği radius'u etkilemez.
  assert.equal(await fails("radius-scale", "a { margin: 5px }"), false);
  assert.equal(await fails("spacing-scale", "a { border-radius: 6px }"), false);
});

test("token-discipline is information only: skipped without custom properties, otherwise it passes and reports the share in providerData", async () => {
  const none = await run(css("a { color: #1a2b3c; margin: 8px }"));
  assert.equal(t(none, "token-discipline").outcome, "skipped");
  const r = await run(css(":root { --c: #1a2b3c; --s: 8px }\na { color: var(--c); margin: 8px }\nb { padding: var(--s); background: #fff }"));
  assert.equal(r.status, "passed");
  assert.equal(t(r, "token-discipline").outcome, "passed");
  const td = (r.providerData as { customPropertyUsage: { customProperties: number; usingCustomProperties: number; hardcoded: number; ratio: number } }).customPropertyUsage;
  assert.deepEqual(td, { customProperties: 2, usingCustomProperties: 2, hardcoded: 2, ratio: 0.5 });
  // Hiç token kullanmayan ama tanımlayan bir sayfa da yalnız bilgi verir, teslimi bozmaz.
  const lowShare = await run(css(":root { --c: #1a2b3c }\na { color: #1a2b3c; margin: 8px; padding: 4px }"));
  assert.equal(lowShare.status, "passed");
  assert.equal((lowShare.providerData as { customPropertyUsage: { ratio: number } }).customPropertyUsage.ratio, 0);
});

test("variety-limits: distinct colors, font sizes and font families are capped (explicit and default limits)", async () => {
  const greys = (n: number): string => Array.from({ length: n }, (_, i) => `.c${i} { color: #${(16 + i).toString(16)}${(16 + i).toString(16)}${(16 + i).toString(16)} }`).join("\n");
  assert.equal(await fails("variety-limits", greys(3), { ...SPEC, maxColors: 3 }), false);
  assert.equal(await fails("variety-limits", greys(4), { ...SPEC, maxColors: 3 }), true);
  assert.equal(await fails("variety-limits", greys(10)), false, "default maxColors = palette (2) + 8");
  assert.equal(await fails("variety-limits", greys(11)), true);
  const sizes = (n: number): string => Array.from({ length: n }, (_, i) => `.s${i} { font-size: ${10 + i}px }`).join("\n");
  assert.equal(await fails("variety-limits", sizes(8)), false, "default maxFontSizes = 8");
  assert.equal(await fails("variety-limits", sizes(9)), true);
  assert.equal(await fails("variety-limits", sizes(2), { ...SPEC, maxFontSizes: 2 }), false);
  assert.equal(await fails("variety-limits", sizes(3), { ...SPEC, maxFontSizes: 2 }), true);
  assert.equal(await fails("variety-limits", "a { font-family: Inter } b { font-family: Georgia } c { font-family: monospace }"), false, "default maxFontFamilies = 3");
  assert.equal(await fails("variety-limits", "a { font-family: Inter } b { font-family: Georgia } c { font-family: monospace } d { font-family: Arial }"), true);
  assert.equal(await fails("variety-limits", "a { font-family: Inter, serif } b { font-family: Inter, monospace } c { font: 12px Inter }", { ...SPEC, maxFontFamilies: 1 }), false, "only the first family of each stack counts");
  assert.equal(await fails("variety-limits", "a { font-family: Inter } b { font-family: Georgia }", { ...SPEC, maxFontFamilies: 1 }), true);
  // Aynı değer tekrar edince çeşitlilik artmaz; farklı yazımlı aynı renk tek sayılır.
  assert.equal(await fails("variety-limits", "a { color: #fff } b { color: #FFFFFF } c { color: white } d { color: rgb(255,255,255) }", { ...SPEC, maxColors: 1 }), false);
  const f = t(await run(css(`${greys(4)}\n${sizes(3)}`), { ...SPEC, maxColors: 3, maxFontSizes: 2 }), "variety-limits");
  assert.match(f.error!.message, /4 distinct colors > 3; 3 distinct font sizes > 2/);
});

test("anti-placeholder: the fixed phrase list is matched case-insensitively in text nodes, <title>, alt and title attributes", async () => {
  const phrases = ["lorem ipsum", "dolor sit amet", "your text here", "your company", "company name", "untitled", "placeholder text", "sample text", "click here", "hello world", "welcome to your", "coming soon"];
  for (const ph of phrases) {
    for (const variant of [ph, ph.toUpperCase(), ph[0]!.toUpperCase() + ph.slice(1), ph.replace(" ", "\n   ")]) {
      const r = await run({ "i.html": page(`<h1>Report</h1><p>Intro: ${variant} and more</p>`) });
      assert.equal(t(r, "anti-placeholder").outcome, "failed", `${ph} / ${JSON.stringify(variant)}`);
    }
  }
  const attrs = await run({ "i.html": page('<h1>Report</h1><img src="a.png" alt="Your Company logo"><a href="/x" title="HELLO WORLD">go</a><input alt="Click   Here">') });
  assert.match(t(attrs, "anti-placeholder").error!.message, /3 violation\(s\)/);
  const title = await run({ "i.html": page("<h1>x</h1>").replace("Dashboard", "Untitled Document") });
  assert.equal(t(title, "anti-placeholder").outcome, "failed");
  // Geçen durumlar: gerçek metin; script/yorum içindeki ifadeler ve CSS yorumları metin sayılmaz (CSS `content:` ise görünen metindir, bkz. aşağıdaki test).
  const clean = await run({
    "i.html": page('<h1>Quarterly numbers</h1><p>Revenue grew 4%.</p><script>var s = "lorem ipsum click here";</script><style>/* coming soon */ .a::after { content: "ok" }</style><!-- hello world -->'),
    "s.css": "/* lorem ipsum */ .a::after { content: attr(data-x) }",
  });
  assert.equal(t(clean, "anti-placeholder").outcome, "passed");
  const f = t(await run({ "i.html": page("<h1>x</h1>\n<p>\n  Lorem ipsum dolor\n</p>") }), "anti-placeholder");
  assert.match(f.error!.detail!, /i\.html:7 placeholder text "lorem ipsum" — \s*Lorem ipsum dolor/);
});

test("anti-template-colors: known framework/gradient colors fail unless the palette (within tolerance) already has them", async () => {
  assert.ok(TEMPLATE_COLORS.has("#667eea") && TEMPLATE_COLORS.has("#764ba2") && TEMPLATE_COLORS.has("#6366f1") && TEMPLATE_COLORS.has("#8b5cf6") && TEMPLATE_COLORS.has("#007bff") && TEMPLATE_COLORS.has("#0d6efd") && TEMPLATE_COLORS.has("#3b82f6"));
  const cliche = "body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) }";
  const r = await run(css(cliche));
  assert.equal(t(r, "anti-template-colors").outcome, "failed");
  assert.match(t(r, "anti-template-colors").error!.message, /2 violation\(s\)/);
  assert.match(t(r, "anti-template-colors").error!.detail!, /a\.css:1 color #667eea is a known template default \(#667eea: purple-blue gradient cliché\)/);
  for (const c of ["#007bff", "#0D6EFD", "#3b82f6", "#6366f1", "#8b5cf6", "rgb(102, 126, 234)", "hsl(217, 91%, 60%)"]) assert.equal(await fails("anti-template-colors", `a { color: ${c} }`), true, c);
  // Palete eklenince hem şablon hem palet denetimi geçer.
  const own: DesignSpec = { ...SPEC, palette: [...SPEC.palette, "#667eea", "#764ba2"] };
  const ok = await run(css(cliche), own);
  assert.equal(t(ok, "anti-template-colors").outcome, "passed");
  assert.equal(t(ok, "palette-conformance").outcome, "passed");
  // Palet renginin toleransı içindeki yakın renk "şablon" sayılmaz; tolerans dışındaki sayılır.
  assert.equal(await fails("anti-template-colors", "a { color: #667eec }", own), false);
  assert.equal(await fails("anti-template-colors", "a { color: #667eea }", { ...SPEC, palette: ["#667eec"] }), false, "distance 2 is within tolerance of the palette color");
  assert.equal(await fails("anti-template-colors", "a { color: #667eea }", { ...SPEC, palette: ["#667ef8"] }), true, "distance 14 is outside the tolerance");
  // Şablon dışı renk bu denetimi tetiklemez.
  assert.equal(await fails("anti-template-colors", "a { color: #ff00aa }"), false);
  // Bir şablon rengi hem palet dışıdır hem şablon: iki denetim de kalır.
  const both = await run(css("a { color: #0d6efd }"));
  assert.deepEqual([t(both, "palette-conformance").outcome, t(both, "anti-template-colors").outcome], ["failed", "failed"]);
});

test("forbidden-strings: configured strings are matched case-insensitively in the text, skipped when none are configured", async () => {
  const r = await run({ "i.html": page('<h1>Welcome</h1><p>Powered by ACME   corp</p><img src="a.png" alt="acme corp logo">') });
  assert.equal(t(r, "forbidden-strings").outcome, "failed");
  assert.match(t(r, "forbidden-strings").error!.message, /2 violation\(s\)/);
  assert.equal(t(await run({ "i.html": page("<h1>Welcome</h1><p>Nothing here</p>") }), "forbidden-strings").outcome, "passed");
  assert.equal(t(await run({ "i.html": page("<p>Acme Corp</p>") }, { ...SPEC, forbidden: {} }), "forbidden-strings").outcome, "skipped");
  assert.equal(t(await run({ "i.html": page("<p>Acme Corp</p>") }, { palette: [], fonts: [] }), "forbidden-strings").outcome, "skipped");
});

test("findings: line numbers and masked, short excerpts; secrets and control characters never reach the result", async () => {
  const r = await run({ "i.html": page('<h1>x</h1>\n<p>lorem ipsum api_key=sk-abcdefghijklmnopqrstuv\u0007 tail</p>') });
  const dump = JSON.stringify(r);
  assert.ok(!dump.includes("sk-abcdefghijklmnopqrstuv"));
  assert.ok(!dump.includes("\u0007"));
  assert.match(t(r, "anti-placeholder").error!.detail!, /i\.html:6 /);
  const long = await run(css(`a { color: #ff00aa; background: url(${"x".repeat(5000)}) #ff00aa }`));
  const detail = t(long, "palette-conformance").error!.detail!;
  assert.ok(detail.length < 800, `detail length ${detail.length}`);
  // En çok 50 bulgu maddesi taşınır; sayı tam kalır.
  const many = await run(css(Array.from({ length: 200 }, (_, i) => `.x${i} { color: #ff00aa }`).join("\n")));
  assert.match(t(many, "palette-conformance").error!.message, /200 violation\(s\)/);
  assert.ok((many.providerData as { findings: unknown[] }).findings.length <= 80);
});

test("criteria fragments claim design tests for acceptance criteria; runLab accepts the design kind", async () => {
  const root = mkTmp("agentmom-design-k-");
  writeFileSync(join(root, "a.css"), "a { color: #1a2b3c }");
  const r = await new DesignLabProvider().run({ root, files: ["a.css"], spec: SPEC, criteria: { c1: ["palette-conformance", "font-conformance"], c2: ["[design] anti-"] } }).result;
  assert.deepEqual(t(r, "palette-conformance").criteria, ["c1"]);
  assert.deepEqual(t(r, "font-conformance").criteria, ["c1"]);
  assert.deepEqual(t(r, "anti-placeholder").criteria, ["c2"]);
  assert.deepEqual(t(r, "anti-template-colors").criteria, ["c2"]);
  assert.deepEqual(t(r, "spacing-scale").criteria, []);
  const via = validateRunResult(await runLab("design", { root, files: ["a.css"], spec: SPEC }));
  assert.equal(via.provider, "design-lab");
  assert.equal(via.status, "passed");
});

// ---------- spec ve istek doğrulama ----------

test("spec validation: shapes, limits and normalisation", () => {
  const ok = validateDesignSpec({ palette: ["#ABC", "#a1b2c3"], fonts: ["Inter"], paletteTolerance: 12.5, allowNeutrals: false, spacingScale: [0, 4.5], radiusScale: [0], maxFontSizes: 3, maxColors: 5, maxFontFamilies: 2, forbidden: { strings: ["x"] } });
  assert.deepEqual(ok.palette, ["#aabbcc", "#a1b2c3"], "#rgb is expanded, case is normalised");
  assert.equal(ok.paletteTolerance, 12.5);
  assert.deepEqual(validateDesignSpec({ palette: [], fonts: [] }), { palette: [], fonts: [] });
  const bad = (v: unknown, re?: RegExp) => assert.throws(() => validateDesignSpec(v), (e) => e instanceof LabSpecError && (re ? re.test(e.message) : true));
  bad(null);
  bad([]);
  bad({ fonts: [] }, /palette/);
  bad({ palette: [] }, /fonts/);
  bad({ palette: ["red"], fonts: [] }, /palette\[0\]/);
  bad({ palette: ["#12"], fonts: [] });
  bad({ palette: ["#ggg"], fonts: [] });
  bad({ palette: ["#1234"], fonts: [] }, /palette\[0\]/);
  bad({ palette: Array.from({ length: 41 }, () => "#fff"), fonts: [] }, /at most 40/);
  bad({ palette: [], fonts: Array.from({ length: 9 }, (_, i) => `f${i}`) }, /at most 8/);
  bad({ palette: [], fonts: [""] });
  bad({ palette: [], fonts: [5] });
  bad({ palette: [], fonts: [], paletteTolerance: 31 }, /between 0 and 30/);
  bad({ palette: [], fonts: [], paletteTolerance: -1 });
  bad({ palette: [], fonts: [], paletteTolerance: "6" });
  bad({ palette: [], fonts: [], allowNeutrals: "yes" });
  bad({ palette: [], fonts: [], spacingScale: [] });
  bad({ palette: [], fonts: [], spacingScale: ["8"] });
  bad({ palette: [], fonts: [], spacingScale: [-1] });
  bad({ palette: [], fonts: [], radiusScale: Array.from({ length: 41 }, () => 1) });
  bad({ palette: [], fonts: [], maxColors: 0 });
  bad({ palette: [], fonts: [], maxFontSizes: 1.5 });
  bad({ palette: [], fonts: [], maxFontFamilies: 1001 });
  bad({ palette: [], fonts: [], forbidden: { strings: Array.from({ length: 21 }, () => "x") } }, /at most 20/);
  bad({ palette: [], fonts: [], forbidden: { words: [] } }, /unknown field/);
  bad({ palette: [], fonts: [], extra: 1 }, /unknown field/);
  bad({ palette: Array.from({ length: 40 }, () => "#ffffff"), fonts: [], forbidden: { strings: Array.from({ length: 20 }, () => "x".repeat(100)) }, pad: "y".repeat(70_000) }, /larger than 64 KB/);
});

test("plan and request validation: files, extensions, traversal, spec/specFile exclusivity, root and unknown fields", () => {
  const root = mkTmp("agentmom-design-v-");
  const run1 = (spec: unknown) => new DesignLabProvider().run(spec as never);
  const bad = (spec: unknown, re?: RegExp) => assert.throws(() => run1(spec), (e) => e instanceof LabSpecError && (re ? re.test(e.message) : true));
  bad({ root, files: [], spec: SPEC });
  bad({ root, files: Array.from({ length: 21 }, (_, i) => `p${i}.css`), spec: SPEC }, /1 to 20/);
  bad({ root, files: ["p.txt"], spec: SPEC }, /\.html, \.htm or \.css/);
  bad({ root, files: ["../p.css"], spec: SPEC }, /\.\./);
  bad({ root, files: ["/abs/p.css"], spec: SPEC });
  bad({ root, files: ["C:/p.css"], spec: SPEC });
  bad({ root, files: ["a\\p.css"], spec: SPEC });
  bad({ root, files: ["a//p.css"], spec: SPEC });
  bad({ root, files: ["p.css", "P.CSS"], spec: SPEC }, /repeat/);
  bad({ root, files: ["p.css"] }, /exactly one of spec or specFile/);
  bad({ root, files: ["p.css"], spec: SPEC, specFile: "s.json" }, /exactly one of spec or specFile/);
  bad({ root, files: ["p.css"], specFile: "s.txt" }, /\.json/);
  bad({ root, files: ["p.css"], specFile: "../s.json" }, /\.\./);
  bad({ root, files: ["p.css"], specFile: "/s.json" });
  bad({ root, files: ["p.css"], spec: { palette: ["nope"], fonts: [] } }, /palette/);
  bad({ root, files: ["p.css"], spec: SPEC, extra: 1 }, /unknown field/);
  bad({ root: join(root, "nope"), files: ["p.css"], spec: SPEC }, /existing directory/);
  bad({ root: 5, files: ["p.css"], spec: SPEC });
  bad({ root, files: ["p.css"], spec: SPEC, criteria: { "bad id!": ["x"] } });
  bad({ root, files: ["p.css"], spec: SPEC, timeoutMs: 0 });
  assert.deepEqual(validateDesignPlan({ files: ["a.html", "d/b.css", "c.htm"], specFile: "design/spec.json" }), { files: ["a.html", "d/b.css", "c.htm"], specFile: "design/spec.json" });
  assert.deepEqual(validateDesignPlan({ files: ["a.css"], spec: { palette: ["#FFF"], fonts: [] }, criteria: { c1: ["x"] } }), { files: ["a.css"], spec: { palette: ["#ffffff"], fonts: [] }, criteria: { c1: ["x"] } });
  assert.throws(() => validateDesignPlan({ files: ["a.css"], spec: SPEC, root: "x" }), LabSpecError);
});

// ---------- specFile ----------

test("specFile: a valid spec file in the workspace is read and applied", async () => {
  const root = mkTmp("agentmom-design-sf-");
  mkdirSync(join(root, "design"));
  writeFileSync(join(root, "design", "spec.json"), JSON.stringify(SPEC));
  writeFileSync(join(root, "a.css"), "a { color: #ff00aa }");
  const r = validateRunResult(await new DesignLabProvider().run({ root, files: ["a.css"], specFile: "design/spec.json" }).result);
  assert.equal(r.status, "failed");
  assert.equal(t(r, "palette-conformance").outcome, "failed");
  writeFileSync(join(root, "design", "bom.json"), `\ufeff${JSON.stringify({ palette: ["#ff00aa"], fonts: [] })}`);
  assert.equal((await new DesignLabProvider().run({ root, files: ["a.css"], specFile: "design/bom.json" }).result).status, "passed", "a BOM is tolerated");
});

test("specFile problems are infra errors, never a pass: missing, too large, invalid JSON, invalid spec, outside the workspace", async () => {
  const root = mkTmp("agentmom-design-se-");
  const other = mkTmp("agentmom-design-so-");
  writeFileSync(join(other, "spec.json"), JSON.stringify(SPEC));
  writeFileSync(join(root, "a.css"), "a { color: #1a2b3c }");
  writeFileSync(join(root, "big.json"), JSON.stringify({ palette: [], fonts: [], pad: "x".repeat(70_000) }));
  writeFileSync(join(root, "broken.json"), '{"palette": [');
  writeFileSync(join(root, "invalid.json"), JSON.stringify({ palette: ["red"], fonts: [] }));
  writeFileSync(join(root, "array.json"), "[]");
  writeFileSync(join(root, "deep.json"), "[".repeat(60_000));
  const cases: Array<{ file: string; message: RegExp }> = [
    { file: "missing.json", message: /does not exist/ },
    { file: "big.json", message: /larger than 64 KB/ },
    { file: "broken.json", message: /not valid JSON/ },
    { file: "deep.json", message: /not valid JSON/ },
    { file: "invalid.json", message: /design spec was not accepted: .*palette\[0\]/ },
    { file: "array.json", message: /design spec was not accepted/ },
  ];
  let junction = false;
  try {
    symlinkSync(other, join(root, "link"), "junction");
    cases.push({ file: "link/spec.json", message: /outside the workspace or goes through a symlink/ });
    junction = true;
  } catch {
    // bağ oluşturulamayan ortam: bu alt durum atlanır
  }
  for (const c of cases) {
    const r = validateRunResult(await new DesignLabProvider().run({ root, files: ["a.css"], specFile: c.file, criteria: { c1: ["design"] } }).result);
    assert.equal(r.status, "error", c.file);
    assert.equal(r.tests.length, 1, `${c.file}: no design check ran`);
    assert.equal(r.tests[0]!.outcome, "error", c.file);
    assert.equal(r.tests[0]!.classification, "infra", c.file);
    assert.match(r.tests[0]!.error!.message, c.message, c.file);
    assert.deepEqual(r.tests[0]!.criteria, ["c1"], `${c.file}: mapped criteria are tainted`);
  }
  assert.equal(junction || process.platform !== "win32", true);
});

// ---------- dosya hataları ----------

test("unreadable files are infra errors (never a silent pass): missing, too large, through a junction; readable ones are still analysed", async () => {
  const root = mkTmp("agentmom-design-fe-");
  const other = mkTmp("agentmom-design-fo-");
  writeFileSync(join(other, "x.css"), "a { color: red }");
  writeFileSync(join(root, "big.css"), `a { color: #1a2b3c }\n/*${"x".repeat(MAX_DESIGN_FILE_BYTES)}*/`);
  writeFileSync(join(root, "ok.css"), "a { color: #1a2b3c }");
  const files = ["missing.css", "big.css"];
  let junction = false;
  try {
    symlinkSync(other, join(root, "link"), "junction");
    files.push("link/x.css");
    junction = true;
  } catch {
    // bağ oluşturulamayan ortam
  }
  const r = validateRunResult(await new DesignLabProvider().run({ root, files: [...files, "ok.css"], spec: SPEC, criteria: { c1: ["x"] } }).result);
  assert.equal(r.status, "error");
  const errors = r.tests.filter((x) => x.outcome === "error");
  assert.equal(errors.length, files.length);
  assert.ok(errors.every((x) => x.classification === "infra" && x.criteria.join() === "c1"));
  assert.match(errors[0]!.error!.message, /does not exist/);
  assert.match(errors[1]!.error!.message, /larger than 300 KB/);
  if (junction) assert.match(errors[2]!.error!.message, /outside the workspace or goes through a symlink/);
  assert.equal(r.tests.filter((x) => x.id.startsWith("design-") && x.outcome === "failed").length, 0, "the readable file was still analysed");
  const none = validateRunResult(await new DesignLabProvider().run({ root, files: ["missing.css"], spec: SPEC }).result);
  assert.equal(none.status, "error");
  assert.ok(none.tests.every((x) => x.outcome === "error"), "no check passes when nothing was analysed");
});

// ---------- kötü niyetli / aşırı girdi ----------

const timed = async <T>(fn: () => Promise<T>): Promise<{ ms: number; value: T }> => {
  const t0 = Date.now();
  const value = await fn();
  return { ms: Date.now() - t0, value };
};

test("hostile input: a stylesheet close to 300 KB, deep @media nesting, unclosed quotes/comments/parentheses, var() cycles and huge values finish quickly", async () => {
  const near = `${".card { color: #1a2b3c; margin: 8px; padding: 4px 8px; border-radius: 4px; font-family: Inter, sans-serif; }\n".repeat(2900)}`.slice(0, MAX_DESIGN_FILE_BYTES - 100);
  assert.ok(near.length > 250 * 1024);
  const hostile: Record<string, string> = {
    "near.css": near,
    "deep.css": `${"@media x { ".repeat(60_000)}a { color: #ff00aa }`.slice(0, MAX_DESIGN_FILE_BYTES),
    "braces.css": "}".repeat(MAX_DESIGN_FILE_BYTES - 10),
    "open-brace.css": "{".repeat(MAX_DESIGN_FILE_BYTES - 10),
    "quote.css": `a { color: "#ff00aa ${"never closed ".repeat(20_000)}`.slice(0, MAX_DESIGN_FILE_BYTES),
    "quote2.css": `a { font-family: '${"\\'".repeat(100_000)}`.slice(0, MAX_DESIGN_FILE_BYTES),
    "comment.css": `a { color: red } /* never closed ${"#ff00aa ".repeat(30_000)}`.slice(0, MAX_DESIGN_FILE_BYTES),
    "comments.css": "/*/*/*/".repeat(40_000).slice(0, MAX_DESIGN_FILE_BYTES),
    "paren.css": `a { background: url(${"x;".repeat(100_000)}`.slice(0, MAX_DESIGN_FILE_BYTES),
    "parens.css": `a { margin: ${"(".repeat(200_000)} }`.slice(0, MAX_DESIGN_FILE_BYTES),
    "cycle.css": ":root { --a: var(--b); --b: var(--a); --c: var(--c) } a { color: var(--a); margin: var(--b) var(--c); }",
    "long.css": `a { margin: ${"1px ".repeat(70_000)}; color: ${"#fff ".repeat(50_000)}; font-family: "${"a".repeat(100_000)}`.slice(0, MAX_DESIGN_FILE_BYTES),
    "colons.css": `a { ${"::".repeat(100_000)} }`.slice(0, MAX_DESIGN_FILE_BYTES),
    "i.html": page(`<p style="${"a:b;".repeat(250)}">x</p>${"<style>x{color:red}".repeat(250)}`),
  };
  for (const [name, text] of Object.entries(hostile)) {
    const root = mkTmp("agentmom-design-h-");
    writeFileSync(join(root, name), text);
    const { ms, value } = await timed(() => new DesignLabProvider().run({ root, files: [name], spec: SPEC, timeoutMs: 30_000 }).result);
    validateRunResult(value);
    assert.ok(ms < 3000, `${name} took ${ms} ms`);
    assert.ok(value.status === "passed" || value.status === "failed", `${name}: ${value.status} ${JSON.stringify(value.tests.filter((x) => x.outcome === "error").map((x) => x.error))}`);
  }
  // Hepsi birlikte tek koşuda da sınırlı sürede biter.
  const root = mkTmp("agentmom-design-h2-");
  const names = Object.keys(hostile).slice(0, 14);
  for (const n of names) writeFileSync(join(root, n), hostile[n] as string);
  const all = await timed(() => new DesignLabProvider().run({ root, files: names.slice(0, 20), spec: SPEC, timeoutMs: 30_000 }).result);
  assert.ok(all.ms < 8000, `all took ${all.ms} ms`);
  assert.equal((all.value.providerData as { analysed: number }).analysed, names.length);
  // Anlamlı bulgular hâlâ yakalanır: kapanmamış tırnaktan ÖNCEKİ ve derin @media içindeki bildirim.
  const deep = await run({ "d.css": `${"@media x { ".repeat(5000)}a { color: #ff00aa }` });
  assert.equal(t(deep, "palette-conformance").outcome, "failed");
  const r2 = await run(css('a { color: #ff00aa } b { content: "oops\nc { color: #00ffaa }'));
  assert.match(t(r2, "palette-conformance").error!.message, /2 violation/, "an unclosed string ends at the line break; later rules still count");
  // var() döngüsü takip edilmez: renk ihlali yok.
  const cyc = await run(css(hostile["cycle.css"] as string));
  assert.equal(t(cyc, "palette-conformance").outcome, "passed");
});

test("hostile input: the declaration cap is 50 000 per file (exactly the cap is analysed, one more is an infra error)", async () => {
  const body = (n: number): string => `a{${"x:1;".repeat(n)}}`;
  const atCap = body(MAX_DECLARATIONS_PER_FILE);
  assert.ok(atCap.length < MAX_DESIGN_FILE_BYTES);
  const ok = await timed(() => run(css(atCap)));
  assert.ok(ok.ms < 5000, `at the cap took ${ok.ms} ms`);
  assert.equal(ok.value.status, "passed");
  assert.equal((ok.value.providerData as { declarations: number }).declarations, MAX_DECLARATIONS_PER_FILE);
  const over = await timed(() => run(css(body(MAX_DECLARATIONS_PER_FILE + 1))));
  assert.ok(over.ms < 5000);
  assert.equal(over.value.status, "error");
  assert.equal(over.value.tests.length, 1, "no check passes when the file was not analysed");
  assert.equal(over.value.tests[0]!.classification, "infra");
  assert.match(over.value.tests[0]!.error!.message, /more than 50000 declarations/);
  // Sınır dosya başınadır: iki dosyaya bölünmüş toplam aşımı etkilemez.
  const split = await run({ "a.css": css(body(30_000))["a.css"] as string, "b.css": body(30_000) });
  assert.equal(split.status, "passed");
});

test("hostile input: the time budget ends the run as timed_out, files are skipped and the result is still a valid, non-passing RunResult", async () => {
  const root = mkTmp("agentmom-design-t-");
  const names: string[] = [];
  const big = `${"a { color: #1a2b3c; margin: 8px; padding: 4px; border-radius: 4px }\n".repeat(4000)}`.slice(0, MAX_DESIGN_FILE_BYTES);
  for (let i = 0; i < 20; i++) {
    names.push(`f${i}.css`);
    writeFileSync(join(root, `f${i}.css`), big);
  }
  const r = validateRunResult(await new DesignLabProvider().run({ root, files: names, spec: SPEC, timeoutMs: 1 }).result);
  assert.ok(r.status === "timed_out" || (r.providerData as { analysed: number }).analysed === 20, `status ${r.status}`);
  if (r.status === "timed_out") assert.ok((r.providerData as { skippedFiles: number }).skippedFiles > 0 || r.tests.some((x) => x.outcome === "error"));
});

test("placeholder / forbidden-string evasions are normalised: entities, nbsp, shy, zero-width and invisible characters, look-alike letters, tags splitting the words, long text nodes", async () => {
  const ph = async (body: string, head = "") => t(await run({ "i.html": page(body, head) }), "anti-placeholder").outcome;
  const cases: Array<[string, string]> = [
    ["numeric entity", "<p>&#108;orem ipsum</p>"],
    ["hex entity", "<p>l&#x6f;rem ipsum</p>"],
    ["named nbsp", "<p>Lorem&nbsp;ipsum</p>"],
    ["soft hyphen entity", "<p>Lo&shy;rem ip&shy;sum</p>"],
    ["soft hyphen char", "<p>Lo\u00adrem ipsum</p>"],
    ["zero width space", "<p>Lo\u200brem ip\u200csum</p>"],
    ["zero width joiner / bom / word joiner", "<p>Lo\u200drem\ufeff ip\u2060sum</p>"],
    ["unicode nbsp char", "<p>Lorem\u00a0ipsum</p>"],
    ["ideographic / thin space", "<p>click\u3000here</p>"],
    ["cyrillic look-alikes", "<p>L\u043er\u0435m ipsum</p>"],
    ["greek look-alikes", "<p>L\u03bfrem ips\u03c5m</p>"],
    ["fullwidth letters", "<p>\uff2c\uff4f\uff52\uff45\uff4d ipsum</p>"],
    ["combining marks", "<p>Lo\u0301rem ipsum</p>"],
    ["empty inline tag in the middle", "<p>Lo<b></b>rem ipsum</p>"],
    ["inline tag split", "<p><b>Lorem</b> <i>ipsum</i></p>"],
    ["inline tag split without a space node", "<p>Click<b> </b>here</p>"],
    ["line break between", "<p>Click<br>here</p>"],
    ["split inside a word", "<p>Lo<span>rem</span> ip<em>sum</em></p>"],
    ["after a very long text node", `<p>${"filler ".repeat(200)} Lorem ipsum</p>`],
    ["amp entity chain", "<p>hello&#32;world</p>"],
    ["placeholder attribute", '<input placeholder="Your text here" aria-label="x">'],
    ["aria-label attribute", '<button aria-label="Click &#104;ere">go</button>'],
    ["title attribute with entity", '<span title="Coming&nbsp;Soon">x</span>'],
    ["alt on an area", '<map name="m"><area alt="Lorem ipsum" href="/x"></map>'],
    ["aria-description attribute", '<div aria-description="company name"></div>'],
  ];
  for (const [name, body] of cases) assert.equal(await ph(body), "failed", name);
  // CSS content: değerleri (kaçışlar dahil) görünen metindir.
  for (const content of ["'Lorem ipsum'", '"Lorem\\a0ipsum"', '"\\6c orem ipsum"', '"Lo\\200b rem ipsum"', "'Click' ' here'"]) {
    const bad = (await run(css(`a::after { content: ${content}; }`))).tests.find((x) => x.id === "design-anti-placeholder")!;
    if (content === "'Click' ' here'") assert.equal(bad.outcome, "passed", "separate CSS strings are not joined (documented limit)");
    else assert.equal(bad.outcome, "failed", content);
  }
  assert.equal(t(await run({ "i.html": page("<p>x</p>", "<style>.a::after { content: 'Lorem ipsum' }</style>") }), "anti-placeholder").outcome, "failed");
  assert.equal(t(await run(css("a::after { content: attr(data-x); } b::before { content: counter(x) '.'; }")), "anti-placeholder").outcome, "passed");
  // Yasak dizeler aynı normalleştirmeyle aranır.
  const fb = async (body: string) => t(await run({ "i.html": page(body) }), "forbidden-strings").outcome;
  assert.equal(await fb("<p>Powered by Ac&#109;e&nbsp;Corp</p>"), "failed");
  assert.equal(await fb("<p>ACME<b></b> Co\u200brp</p>"), "failed");
  assert.equal(await fb('<p title="Acm\u0435 Corp">x</p>'), "failed");
  // Normalleştirme masum metni bozmaz.
  for (const body of ["<p>Lorem is a word, ipsum is not.</p>", "<p>Click</p><p>here</p>", "<p>Ünite &amp; Şirket &copy; 2025 &lt;ok&gt;</p>", "<p>Привет мир</p>", "<p>&notanentity; &#xZZ; &#; &</p>", "<ul><li>Sample</li><li>Text</li></ul>", "<p>Sample</p><span>text</span>", "<div>Click</div><a href='/x'>here</a>", "<h2>Hello</h2><b>world</b>"]) {
    assert.equal(await ph(body), "passed", body);
  }
  const f = t(await run({ "i.html": page("<h1>x</h1>\n<p>Lo&shy;rem\n  ipsum</p>") }), "anti-placeholder");
  assert.match(f.error!.message, /1 violation\(s\)/, "the bare and the space-joined forms count once");
});

test("normText: the comparison form", () => {
  assert.equal(normText("  Lo&#114;em&nbsp;&nbsp;IPSUM\n"), "lorem ipsum");
  assert.equal(normText("&bogus; &amp;amp; &#0; &#x110000; &#xD800;"), "&bogus; &amp; &#0; &#x110000; &#xd800;");
  assert.equal(normText("АВС"), "aвc", "upper case Cyrillic is lower-cased, then mapped");
  assert.equal(normText("орен"), "opeh");
  assert.equal(normText("a\u0000b\u0007c"), "abc");
  assert.equal(normText("x".repeat(30_000)).length, 20_000);
});

test("linked stylesheets that are not covered: unlisted local files and @import are unverified (infra error per reference), external ones too", async () => {
  const link = (href: string) => page("<p>x</p>", `<link rel="stylesheet" href="${href}">`);
  const errs = (r: RunResult) => r.tests.filter((x) => x.outcome === "error");
  // Listelenmiş: temiz.
  const ok = await run({ "site/i.html": link("style.css"), "site/style.css": "a { color: #1a2b3c }" });
  assert.equal(ok.status, "passed");
  for (const href of ["./style.css", "style.css?v=2", "style.css#x", "/site/style.css", "../site/style.css", "STYLE.CSS", "data:text/css,a{}"]) {
    const r = await run({ "site/i.html": link(href), "site/style.css": "a { color: #1a2b3c }" });
    assert.equal(errs(r).length, 0, href);
  }
  // Listelenmemiş yerel stil.
  const un = await run({ "i.html": link("css/extra.css") });
  assert.equal(un.status, "error");
  assert.equal(errs(un).length, 1);
  assert.equal(errs(un)[0]!.classification, "infra");
  assert.match(errs(un)[0]!.name, /linked stylesheet is covered: css\/extra\.css/);
  assert.match(errs(un)[0]!.error!.message, /linked but not listed in the design files; it was not checked/);
  assert.match(errs(un)[0]!.error!.detail!, /i\.html:3/);
  assert.equal(un.tests.filter((x) => x.id.startsWith("design-")).length, DESIGN_CHECKS.length, "the listed file's checks still ran");
  // Ağaç dışına çıkan ve dış başvurular.
  for (const href of ["../x.css", "https://cdn.example.com/a.css", "//cdn.example.com/a.css", "http://example.com/a.css", "file:///c:/a.css"]) {
    const r = await run({ "i.html": link(href) });
    assert.equal(errs(r).length, 1, href);
    assert.equal(r.status, "error", href);
  }
  assert.match(errs(await run({ "i.html": link("https://cdn.example.com/a.css") }))[0]!.error!.message, /external stylesheet .* cannot be checked/);
  // rel çok değerli, büyük harf; stylesheet olmayan link yok sayılır.
  assert.equal(errs(await run({ "i.html": page("<p>x</p>", '<link rel="ICON stylesheet" href="x.css">') })).length, 1);
  assert.equal(errs(await run({ "i.html": page("<p>x</p>", '<link rel="icon" href="x.ico"><link rel="preconnect" href="https://a.example">') })).length, 0);
  // @import: CSS dosyasında ve <style> içinde.
  for (const imp of ['@import "other.css";', "@import url(other.css) screen;", "@import url('other.css');", "/* c */ @import 'other.css' print;"]) {
    const r = await run(css(`${imp}\na { color: #1a2b3c }`));
    assert.equal(errs(r).length, 1, imp);
    assert.match(errs(r)[0]!.name, /other\.css/, imp);
  }
  const inStyle = await run({ "i.html": page("<p>x</p>", "<style>@import url(x/y.css);</style>") });
  assert.equal(errs(inStyle).length, 1);
  assert.equal(errs(await run({ "a.css": '@import "b.css";', "b.css": "a { color: #1a2b3c }" })).length, 0, "an imported file that is listed is covered");
  assert.equal(errs(await run({ "d/a.css": '@import "b.css";', "b.css": "a { color: #1a2b3c }" })).length, 1, "@import is relative to the importing file");
  assert.equal(errs(await run(css("a { background: url(other.css) } b { content: '@import \"x.css\"' }"))).length, 0, "only top-level @import counts");
  // Aynı başvuru bir kez; çok sayıda başvuru sınırlıdır.
  assert.equal(errs(await run({ "i.html": page("<p>x</p>", '<link rel="stylesheet" href="z.css"><link rel="stylesheet" href="z.css">') })).length, 1);
  const many = await run({ "i.html": page("<p>x</p>", Array.from({ length: 30 }, (_, i) => `<link rel="stylesheet" href="s${i}.css">`).join("")) });
  assert.equal(errs(many).length, 21, "20 references plus one summary");
  // Eşlenmiş ölçütler kirlenir.
  const crit = await run({ "i.html": link("nope.css") }, SPEC, { criteria: { c1: ["design"] } });
  assert.deepEqual(errs(crit)[0]!.criteria, ["c1"]);
});

test("event loop and cancellation: a big file yields to the event loop, cancel() ends the run as cancelled (design and a11y)", async () => {
  const root = mkTmp("agentmom-design-cx-");
  writeFileSync(join(root, "big.css"), `a{${"x:1;".repeat(MAX_DECLARATIONS_PER_FILE)}}`);
  let hits = 0;
  let done = false;
  const spin = (): void => {
    hits++;
    if (!done) setImmediate(spin);
  };
  setImmediate(spin);
  const r = await new DesignLabProvider().run({ root, files: ["big.css"], spec: SPEC }).result;
  done = true;
  assert.equal(r.status, "passed");
  assert.ok(hits >= 10, `the event loop was released ${hits} times while analysing 50 000 declarations`);
  // İptal: ilk dosyadan önce.
  const h = new DesignLabProvider().run({ root, files: ["big.css"], spec: SPEC });
  await h.cancel();
  const c = validateRunResult(await h.result);
  assert.equal(c.status, "cancelled");
  assert.ok(c.tests.every((x) => !x.id.startsWith("design-")), "no check result is reported for a cancelled run");
  // İptal: dosya içinde (çok bildirimli dosyada ilk nefesten sonra).
  const h2 = new DesignLabProvider().run({ root, files: ["big.css"], spec: SPEC });
  const waited = new Promise<void>((ok) => setImmediate(() => setImmediate(() => ok())));
  await waited;
  await h2.cancel();
  const c2 = validateRunResult(await h2.result);
  assert.ok(c2.status === "cancelled" || c2.status === "passed", `status ${c2.status}`);
  // runLab: abort sinyali koşuyu iptal eder.
  const ac = new AbortController();
  const p = runLab("design", { root, files: ["big.css"], spec: SPEC }, { signal: ac.signal });
  ac.abort();
  assert.equal((await p).status, "cancelled");
  writeFileSync(join(root, "p.html"), "<html lang=en><title>t</title><h1>x</h1>");
  assert.equal((await runLab("a11y", { root, files: ["p.html"] }, { signal: AbortSignal.abort() })).status, "cancelled");
  const ha = new A11yLabProvider().run({ root, files: ["p.html"] });
  await ha.cancel();
  assert.equal(validateRunResult(await ha.result).status, "cancelled");
});

test("paths with a colon are refused everywhere (NTFS alternate data streams, drive letters)", async () => {
  const root = mkTmp("agentmom-design-colon-");
  writeFileSync(join(root, "a.css"), "a { color: #1a2b3c }");
  const bad = (spec: unknown) => assert.throws(() => new DesignLabProvider().run(spec as never), (e) => e instanceof LabSpecError);
  bad({ root, files: ["a.css:stream.css"], spec: SPEC });
  bad({ root, files: ["a.css::$DATA"], spec: SPEC });
  bad({ root, files: ["C:a.css"], spec: SPEC });
  bad({ root, files: ["dir/a.css:s"], spec: SPEC });
  bad({ root, files: ["a.css"], specFile: "s.json:x" });
  assert.throws(() => new A11yLabProvider().run({ root, files: ["a.html:s.css"] }), (e) => e instanceof LabSpecError);
  assert.throws(() => new A11yLabProvider().run({ root, files: ["d/a.html:s"] }), (e) => e instanceof LabSpecError);
  assert.throws(() => validateDesignPlan({ files: ["a.css"], specFile: "x:y.json" }), LabSpecError);
  // Doğrulayıcıyı aşan bir yol bile okuyucuda reddedilir.
  for (const rel of ["a.css:stream", "a.css::$DATA", "C:/a.css", "C:a.css"]) {
    const r = readFileInside(root, rel, 1000);
    assert.equal(r.ok, false, rel);
  }
  assert.equal(readFileInside(root, "a.css", 1000).ok, true);
});

test("HTML text uses the a11y tokenizer: comments terminated like a browser, script/style text ignored, entities and nesting do not hide placeholders", async () => {
  const r = await run({ "a.html": '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body><!--><p>Lorem ipsum</p><!-- --></body></html>' });
  assert.equal(t(r, "anti-placeholder").outcome, "failed", "<!--> closes immediately");
  const r2 = await run({ "a.html": '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body><script>"</script><p>Click here</p></body></html>' });
  assert.equal(t(r2, "anti-placeholder").outcome, "failed");
  const nested = await run({ "d.html": `<!doctype html><html lang="en"><title>T</title>${"<div>".repeat(300)}Hello world` });
  assert.equal(t(nested, "anti-placeholder").outcome, "failed", "nesting beyond 200 levels is flattened, the text is still read");
  // Öğe sınırı (20 000) aşılırsa dosyanın kalanı görülmedi: sessiz geçiş yok, araç/girdi hatası.
  const flood = await run({ "f.html": `<!doctype html><html lang="en"><title>T</title>${"<i></i>".repeat(25_000)}Hello world` });
  assert.equal(flood.status, "error");
  assert.equal(flood.tests.length, 1);
  assert.match(flood.tests[0]!.error!.message, /too many elements/);
});
