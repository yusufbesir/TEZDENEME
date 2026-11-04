// Nedensel etki haritası birim testleri (D8b, madde 70). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Sözcük taraması, çözümleme, bağımlı katmanları, test ayrımı, döngü tespiti, yol doğrulaması; gerçek depo üzerinde duman testi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { BUSY, exclusiveScan } from "./lock.ts";
import { NestingError, analyzeImpact, buildGraph, buildGraphAsync, findCycles, loadImportGraph, resolveSpec, scanImports, summarizeGraph, validateFileParam } from "./impact.ts";

const REPO = resolve(import.meta.dirname, "..", "..");

test("scanImports: static, type-only, multi-line, re-export, dynamic and side-effect forms", () => {
  const src = [
    `import a from "./a.ts";`,
    `import type { T } from "./types.ts";`,
    `import {`,
    `  x,`,
    `  y as z,`,
    `} from "../lib/x.ts";`,
    `import * as ns from "node:path";`,
    `import "./side.ts";`,
    `export { q } from "./q.ts";`,
    `export * from "./all.ts";`,
    `export type { R } from "./r.ts";`,
    `export const keep = 1;`,
    `export { local };`,
    `const m = await import("./dyn.ts");`,
    `import def, { named } from "pkg";`,
  ].join("\n");
  const refs = scanImports(src);
  assert.deepEqual(refs.map((r) => r.spec), ["./a.ts", "./types.ts", "../lib/x.ts", "node:path", "./side.ts", "./q.ts", "./all.ts", "./r.ts", "./dyn.ts", "pkg"]);
  assert.equal(refs.find((r) => r.spec === "./types.ts")?.typeOnly, true);
  assert.equal(refs.find((r) => r.spec === "./a.ts")?.typeOnly, false);
  assert.equal(refs.find((r) => r.spec === "./dyn.ts")?.kind, "dynamic");
  assert.equal(refs.find((r) => r.spec === "./q.ts")?.kind, "reexport");
  assert.equal(refs.find((r) => r.spec === "./side.ts")?.kind, "side-effect");
});

test("scanImports: comments, strings, templates, regex literals and member access are NOT imports", () => {
  const src = [
    `// import x from "./comment.ts";`,
    `/* import y from "./block.ts"; */`,
    "const s = 'import z from \"./str.ts\"';",
    "const t = `import w from \"./tpl.ts\" ${ \"}\" } import q from \"./tpl2.ts\"`;",
    `const re = /import v from "\\.\\/re\\.ts"/;`,
    `const half = a / b; obj.import("./member.ts");`,
    `import real from "./real.ts";`,
  ].join("\n");
  assert.deepEqual(scanImports(src).map((r) => r.spec), ["./real.ts"]);
});

test("resolveSpec: internal, extension swap, external and outside", () => {
  const known = new Set(["src/a/x.ts", "src/b/index.ts", "src/c.ts"]);
  assert.deepEqual(resolveSpec("src/a/y.ts", "./x.ts", known), { kind: "internal", path: "src/a/x.ts" });
  assert.deepEqual(resolveSpec("src/a/y.ts", "./x.js", known), { kind: "internal", path: "src/a/x.ts" });
  assert.deepEqual(resolveSpec("src/a/y.ts", "../b", known), { kind: "internal", path: "src/b/index.ts" });
  assert.deepEqual(resolveSpec("src/a/y.ts", "../c", known), { kind: "internal", path: "src/c.ts" });
  assert.deepEqual(resolveSpec("src/a/y.ts", "./yok.ts", known), { kind: "missing" });
  assert.deepEqual(resolveSpec("src/a/y.ts", "../../scripts/z.mjs", known), { kind: "outside" });
  assert.deepEqual(resolveSpec("src/a/y.ts", "node:fs", known), { kind: "external", name: "node:fs" });
  assert.deepEqual(resolveSpec("src/a/y.ts", "@scope/pkg/deep", known), { kind: "external", name: "@scope/pkg" });
  assert.deepEqual(resolveSpec("src/a/y.ts", "pkg/sub", known), { kind: "external", name: "pkg" });
});

const FAKE = [
  { path: "src/leaf.ts", content: `export const v = 1;` },
  { path: "src/mid.ts", content: `import { v } from "./leaf.ts"; import fs from "node:fs"; export const m = v;` },
  { path: "src/top.ts", content: `import { m } from "./mid.ts"; import { v } from "./leaf.ts"; export { m };` },
  { path: "src/far.ts", content: `import { m } from "./top.ts";` },
  { path: "src/leaf.test.ts", content: `import { v } from "./leaf.ts";` },
  { path: "src/far.test.ts", content: `import "./far.ts";` },
  { path: "src/cyc-a.ts", content: `import "./cyc-b.ts";` },
  { path: "src/cyc-b.ts", content: `import "./cyc-a.ts"; import "./self.ts";` },
  { path: "src/self.ts", content: `import "./self.ts";` },
];

test("buildGraph + analyzeImpact: layers by distance, tests listed separately, radius counts", () => {
  const g = buildGraph(FAKE);
  assert.equal(g.stats.edges, 9, "self import is not an edge");
  assert.deepEqual(g.external.get("src/mid.ts"), ["node:fs"]);
  const r = analyzeImpact(g, "src/leaf.ts", 3);
  assert.ok(r);
  assert.deepEqual(r.layers.map((l) => [l.distance, l.files]), [
    [1, ["src/mid.ts", "src/top.ts"]],
    [2, ["src/far.ts"]],
    [3, []],
  ]);
  assert.deepEqual(r.affectedTests, [{ file: "src/leaf.test.ts", distance: 1 }, { file: "src/far.test.ts", distance: 3 }]);
  assert.equal(r.radius.direct, 3, "mid, top and the test import leaf directly");
  assert.equal(r.radius.transitive, 5);
  assert.equal(r.radius.tests, 2);
  assert.equal(r.radius.unboundedMaxDistance, 3);
  assert.equal(r.inCycle, false);
  const shallow = analyzeImpact(g, "src/leaf.ts", 1);
  assert.deepEqual(shallow?.layers.map((l) => l.files), [["src/mid.ts", "src/top.ts"]]);
  assert.deepEqual(shallow?.affectedTests.map((t) => t.file), ["src/leaf.test.ts"], "depth limits tests too");
  assert.equal(shallow?.radius.unboundedTransitive, 5, "unbounded count ignores depth");
  assert.equal(analyzeImpact(g, "src/yok.ts", 2), null);
});

test("findCycles: mutual import is a cycle; self import and chains are not", () => {
  const g = buildGraph(FAKE);
  assert.deepEqual(findCycles(g), [["src/cyc-a.ts", "src/cyc-b.ts"]]);
  const r = analyzeImpact(g, "src/cyc-a.ts", 2);
  assert.equal(r?.inCycle, true);
  assert.deepEqual(r?.cycle, ["src/cyc-a.ts", "src/cyc-b.ts"]);
  const s = summarizeGraph(g, { elapsedMs: 1, skippedLarge: 0, truncated: false });
  assert.equal(s.cycleCount, 1);
  assert.equal(s.topDependedOn[0]?.file, "src/leaf.ts");
  assert.equal(s.topDependedOn[0]?.dependents, 3);
});

test("validateFileParam: relative src paths only", () => {
  assert.equal(validateFileParam("src/server/app.ts"), null);
  assert.equal(validateFileParam("src/server/ui/core.js"), null);
  for (const bad of ["", "app.ts", "src/../package.json", "/etc/passwd", "C:/x.ts", "src\\a.ts", "src/a.ts\0", "src/a b.ts", "src/a.json", "scripts/x.mjs", "src/" + "a/".repeat(120) + "x.ts", "src//a.ts", "src/a.ts:stream"]) {
    assert.notEqual(validateFileParam(bad), null, JSON.stringify(bad));
  }
});

test("real repository: registry dependents, graph summary and time budget", async () => {
  const t0 = Date.now();
  const { graph, scan } = await loadImportGraph(REPO);
  assert.ok(Date.now() - t0 < 5000, "scan finished within 5 s");
  assert.equal(scan.truncated, false);
  assert.ok(graph.files.includes("src/providers/registry.ts"));
  const r = analyzeImpact(graph, "src/providers/registry.ts", 2);
  assert.ok(r);
  assert.ok(r.layers[0]?.files.includes("src/server/app.ts"), "app.ts imports the registry directly");
  assert.ok(r.affectedTests.some((t) => t.file === "src/providers/providers.test.ts"));
  const s = summarizeGraph(graph, scan);
  assert.ok(s.files > 100 && s.edges > 100);
  assert.ok(s.cycleCount >= 0);
  assert.ok(s.topDependedOn.length <= 20);
  assert.ok((s.topDependedOn[0]?.dependents ?? 0) >= (s.topDependedOn[1]?.dependents ?? 0));
});

test("hostile files: deep template nesting is skipped and reported, import{ floods stay fast, async build respects its budget", async () => {
  const nested = "const x = " + "`${".repeat(5000) + "1" + "}`".repeat(5000) + ";";
  assert.throws(() => scanImports(nested), NestingError);
  const flood = "import{".repeat(Math.floor((300 * 1024) / 7));
  const t0 = performance.now();
  scanImports(flood);
  assert.ok(performance.now() - t0 < 500, "one flooded file blocks the loop only briefly");
  const files = [
    { path: "src/ok.ts", content: `import "./dep.ts";` },
    { path: "src/dep.ts", content: `export const d = 1;` },
    { path: "src/nested.ts", content: nested },
    { path: "src/flood.ts", content: flood },
  ];
  const g = buildGraph(files);
  assert.equal(g.stats.skippedFiles, 1, "only the nesting bomb is unparsable");
  assert.deepEqual(g.imports.get("src/ok.ts"), ["src/dep.ts"]);
  const ga = await buildGraphAsync(files);
  assert.equal(ga.stats.skippedFiles, 1);
  assert.equal(ga.truncated, false);
  assert.equal(analyzeImpact(ga, "src/dep.ts", 2)?.graphIncomplete, true, "reported as incomplete");
  const cut = await buildGraphAsync(files, { budgetMs: -1 });
  assert.equal(cut.truncated, true, "an exhausted budget yields a partial graph, not an error");
  assert.equal(summarizeGraph(cut, { elapsedMs: 1, skippedLarge: 0, truncated: false }).scan.truncated, true);
});

test("exclusiveScan: only one scan at a time", async () => {
  let release!: () => void;
  const first = exclusiveScan(() => new Promise<string>((resolve) => (release = () => resolve("bitti"))));
  assert.equal(await exclusiveScan(async () => "ikinci"), BUSY);
  release();
  assert.equal(await first, "bitti");
  assert.equal(await exclusiveScan(async () => "yeniden"), "yeniden");
});
