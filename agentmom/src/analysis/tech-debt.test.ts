// Teknik borç merkezi birim testleri (madde 33, D8b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Yalnız testlerin kendi mkTmp klasörleri: işaretçi sayımı (test dosyası satırları sayılmaz), kardeş test eksiği, döngü, bütçe/graphIncomplete,
// 'sürüm bilinmiyor' dürüstlüğü, puan/öncelik YOKLUĞU ve yan etkisizlik; gerçek depo üzerinde duman testi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { MARKER_WORDS, buildTechDebt, findMarkers, hasSiblingTest, lineCount, parseDependencies } from "./tech-debt.ts";

const REPO = resolve(import.meta.dirname, "..", "..");
const [TD, FM, XX, HK] = MARKER_WORDS as [string, string, string, string];

function put(root: string, rel: string, content: string): void {
  const p = join(root, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, content);
}

function project(): string {
  const root = mkTmp("agentmom-td-");
  put(root, "src/a.ts", `import { b } from "./b.ts";\n// ${TD}: a'yı sadeleştir\nexport const a = b + 1;\n`);
  put(root, "src/b.ts", `import { a } from "./a.ts";\n/* ${FM} burada\n   ikinci satır ${HK} */\nexport const b = typeof a === "number" ? 1 : 2;\n`);
  put(root, "src/a.test.ts", `import { a } from "./a.ts";\nimport { helper } from "./helper.ts";\n// ${TD} bu test satırı sayılmaz ${XX}\nvoid a; void helper;\n`);
  put(root, "src/helper.ts", "export const helper = 1;\n");
  put(root, "src/c.ts", `export const url = "http://example.com/${TD}";\nexport const s = "${FM} dizgi içinde, yorum değil";\nexport const c = 3; // ${XX} gerçek\n`);
  put(root, "src/big.ts", `${Array.from({ length: 650 }, (_, i) => `export const v${i} = ${i};`).join("\n")}\n`);
  put(root, "src/testing/fixture.ts", `// ${TD} testing klasörü sayılmaz\nexport const f = 1;\n`);
  put(root, "package.json", JSON.stringify({ name: "x", dependencies: { left: "^1.2.3", gitdep: "git+https://example.com/x.git" }, devDependencies: { tool: "~2.0.0" } }));
  return root;
}

function snapshot(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      const st = statSync(p);
      out.push(`${p}|${st.isDirectory() ? "d" : st.size}|${st.mtimeMs}`);
      if (st.isDirectory()) walk(p);
    }
  };
  walk(root);
  return out;
}

test("findMarkers: yorum satırlarındaki büyük harfli işaretçiler; adres (://) satırları, küçük harf ve birleşik sözcük sayılmaz; blok yorum satırları dahil", () => {
  const src = [
    `// ${TD} bir`,
    `const s = "${FM} dizgi";`,
    `const u = "http://x.test/${TD}";`,
    `/* ${HK}`,
    `   ${XX} devam */`,
    `const k = 1; // not: ${TD.toLowerCase()} küçük harf sayılmaz`,
    `const m = 2; // ${TD}X birleşik sözcük sayılmaz`,
    `/** ${FM}(ali): ayrıntı */`,
  ].join("\n");
  const hits = findMarkers(src);
  assert.deepEqual(hits.map((h) => `${h.line}:${h.kind}`), [`1:${TD}`, `4:${HK}`, `5:${XX}`, `8:${FM}`]);
});

test("hasSiblingTest ve lineCount", () => {
  const known = new Set(["src/a.ts", "src/a.test.ts", "src/b.js", "src/b.test.ts", "src/c.mjs", "src/c.test.mjs", "src/d.ts"]);
  assert.equal(hasSiblingTest("src/a.ts", known), true);
  assert.equal(hasSiblingTest("src/b.js", known), true, "kaynak .js, test .ts");
  assert.equal(hasSiblingTest("src/c.mjs", known), true);
  assert.equal(hasSiblingTest("src/d.ts", known), false);
  assert.equal(lineCount(""), 0);
  assert.equal(lineCount("a"), 1);
  assert.equal(lineCount("a\n"), 1);
  assert.equal(lineCount("a\nb"), 2);
  assert.equal(lineCount("a\r\nb\r\n"), 2);
});

test("işaretçiler: test dosyaları ve src/testing sayılmaz; örnekler dosya:satır; türlere göre sayı", async () => {
  const r = await buildTechDebt(project());
  assert.equal(r.markers.count, 4, "a.ts:2, b.ts:2 (bir blok yorumda iki sözcük ayrı satırda: yalnız ilk satırda kind aranır), c.ts:3");
  assert.deepEqual(r.markers.examples, ["src/a.ts:2", "src/b.ts:2", "src/b.ts:3", "src/c.ts:3"]);
  assert.equal(r.markers.filesWithMarkers, 3);
  assert.equal(r.markers.byKind[TD], 1);
  assert.equal(r.markers.byKind[FM], 1);
  assert.equal(r.markers.byKind[HK], 1);
  assert.equal(r.markers.byKind[XX], 1);
  assert.ok(!r.markers.examples.some((e) => e.includes(".test.") || e.includes("src/testing/")), "test satırı örnek olmaz");
  assert.ok(r.markers.examples.length <= 20);
});

test("işaretçi örnekleri en çok 20; sayı gerçek toplamdır", async () => {
  const root = mkTmp("agentmom-td-many-");
  put(root, "src/many.ts", `${Array.from({ length: 45 }, (_, i) => `// ${TD} ${i}`).join("\n")}\nexport const x = 1;\n`);
  const r = await buildTechDebt(root);
  assert.equal(r.markers.count, 45);
  assert.equal(r.markers.examples.length, 20);
  assert.equal(r.markers.examples[0], "src/many.ts:1");
});

test("kardeş test eksiği: testi olmayan kaynaklar listelenir; test yardımcısı (yalnız testlerce içe aktarılan) ve src/testing sayılmaz", async () => {
  const r = await buildTechDebt(project());
  assert.deepEqual(r.untested.examples, ["src/b.ts", "src/big.ts", "src/c.ts"]);
  assert.equal(r.untested.count, 3);
  assert.equal(r.untested.sourceFiles, 4, "a, b, big, c (helper ve testing sayılmaz)");
  assert.ok(!r.untested.examples.includes("src/a.ts"), "a.ts'in kardeş testi var");
  assert.ok(!r.untested.examples.includes("src/helper.ts"));
  assert.match(r.untested.basis, /dolaylı test/);
});

test("içe aktarma döngüsü: a <-> b bulunur; en büyük dosyalar ve 600+ satır", async () => {
  const r = await buildTechDebt(project());
  assert.equal(r.cycles.count, 1);
  assert.deepEqual(r.cycles.examples, [["src/a.ts", "src/b.ts"]]);
  assert.equal(r.size.largest[0]?.file, "src/big.ts");
  assert.equal(r.size.largest[0]?.lines, 650);
  assert.ok(r.size.largest.length <= 10);
  assert.equal(r.size.bigThreshold, 600);
  assert.equal(r.size.bigCount, 1);
  assert.deepEqual(r.size.bigExamples, [{ file: "src/big.ts", lines: 650 }]);
});

test("en büyük 10 ile sınırlı ve büyükten küçüğe sıralı", async () => {
  const root = mkTmp("agentmom-td-size-");
  for (let i = 1; i <= 14; i++) put(root, `src/f${String(i).padStart(2, "0")}.ts`, `${Array.from({ length: i * 10 }, (_, k) => `export const v${k} = 1;`).join("\n")}\n`);
  const r = await buildTechDebt(root);
  assert.equal(r.size.largest.length, 10);
  assert.deepEqual(r.size.largest.map((x) => x.lines), [140, 130, 120, 110, 100, 90, 80, 70, 60, 50]);
  assert.equal(r.size.bigCount, 0);
});

test("bütçe ve graphIncomplete: dosya sınırı aşılırsa truncated ve graphIncomplete görünür; kullanılan bütçe raporlanır", async () => {
  const root = project();
  const full = await buildTechDebt(root);
  assert.equal(full.scan.truncated, false);
  assert.equal(full.scan.graphIncomplete, false);
  assert.equal(full.scan.maxFiles, 3000);
  assert.equal(full.scan.budgetMs, 2000);
  assert.equal(full.scan.maxFileBytes, 300 * 1024);
  const cut = await buildTechDebt(root, { maxFiles: 2 });
  assert.equal(cut.scan.truncated, true);
  assert.equal(cut.scan.graphIncomplete, true);
  assert.equal(cut.scan.maxFiles, 2);
  assert.equal(cut.scan.filesScanned, 2);
});

test("çok büyük dosya (300 KB+) okunmaz ve skippedLarge sayılır", async () => {
  const root = mkTmp("agentmom-td-large-");
  put(root, "src/huge.ts", `// ${TD}\n${"x".repeat(310 * 1024)}\n`);
  put(root, "src/small.ts", "export const s = 1;\n");
  const r = await buildTechDebt(root);
  assert.equal(r.scan.skippedLarge, 1);
  assert.equal(r.markers.count, 0, "okunmayan dosyanın işaretçisi sayılmaz");
  assert.match(r.note, /skippedLarge/);
});

test("bağımlılık: bildirilen sürümler görünür; güncel sürüm HER ZAMAN 'bilinmiyor'; ağ kontrolü yapılmadı; özel kaynak sürüm gibi gösterilmez", async () => {
  const r = await buildTechDebt(project());
  const d = r.dependencies;
  assert.equal(d.status, "ok");
  assert.equal(d.networkChecked, false);
  assert.equal(d.latestVersion, "bilinmiyor");
  assert.equal(d.count, 3);
  assert.deepEqual(d.bySection, { dependencies: 2, devDependencies: 1 });
  assert.ok(d.examples.every((e) => e.latest === "bilinmiyor"));
  assert.deepEqual(d.examples.find((e) => e.name === "left"), { name: "left", section: "dependencies", declared: "^1.2.3", latest: "bilinmiyor" });
  assert.equal(d.examples.find((e) => e.name === "gitdep")?.declared, "(özel kaynak ya da biçim)");
  assert.doesNotMatch(JSON.stringify(d), /example\.com/, "kaynak adresi çıktıya girmez");
  assert.match(r.note, /güncel sürüm bilinmiyor/);
});

test("bağımlılık: package.json yok ya da bozuk ise dürüst durum", async () => {
  const root = mkTmp("agentmom-td-nopkg-");
  put(root, "src/x.ts", "export const x = 1;\n");
  assert.equal((await buildTechDebt(root)).dependencies.status, "absent");
  put(root, "package.json", "{ bozuk");
  assert.equal((await buildTechDebt(root)).dependencies.status, "unreadable");
  assert.equal(parseDependencies("[1,2]").status, "unreadable");
  assert.equal(parseDependencies('{"dependencies": 5}').count, 0);
});

test("toplam puan, öncelik ya da derece YOK: yalnız sayılar", async () => {
  const r = await buildTechDebt(project());
  const keys = new Set<string>();
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v !== null && typeof v === "object") for (const [k, x] of Object.entries(v)) { keys.add(k); walk(x); }
  };
  walk(r);
  for (const bad of ["score", "priority", "grade", "rating", "total", "debt", "points", "rank"]) assert.ok(!keys.has(bad), `anahtar olmamalı: ${bad}`);
  assert.match(r.note, /puan, öncelik ya da yorum yoktur/);
});

test("yan etkisiz: çağrı klasörde hiçbir dosyayı eklemez, silmez ya da değiştirmez; kaynak ağ/süreç modülü içermez", async () => {
  const root = project();
  const before = snapshot(root);
  await buildTechDebt(root);
  await buildTechDebt(root, { maxFiles: 1 });
  assert.deepEqual(snapshot(root), before);
  const src = readFileSync(resolve(import.meta.dirname, "tech-debt.ts"), "utf8");
  for (const banned of [/node:http/, /node:https/, /node:net\b/, /node:child_process/, /\bfetch\s*\(/, /writeFile|appendFile|unlink|rmSync|mkdirSync|renameSync/]) assert.doesNotMatch(src, banned, String(banned));
});

test("gerçek depo: duman testi (typescript bağımlılığı bildirilir, güncel sürüm bilinmiyor, sayılar tutarlı)", async () => {
  const r = await buildTechDebt(REPO);
  assert.ok(r.scan.filesScanned > 100);
  assert.equal(r.dependencies.status, "ok");
  assert.ok(r.dependencies.examples.some((e) => e.name === "typescript" && e.latest === "bilinmiyor"));
  assert.ok(r.size.largest.length === 10 && (r.size.largest[0]?.lines ?? 0) >= (r.size.largest[9]?.lines ?? 0));
  assert.ok(r.untested.count <= r.untested.sourceFiles);
  assert.ok(r.markers.examples.every((e) => /^src\/.+:\d+$/.test(e)));
  assert.ok(r.cycles.examples.length <= 20);
});

// ---- denetim düzeltmeleri -----------------------------------------------------------------------------------------------------------
test("findMarkers: dizgi içindeki '//' yorum SAYILIR (yaklaşık ve belgeli); '://' adresi sayılmaz", () => {
  const hits = findMarkers(`const s = "// ${TD} dizgi";\nconst u = "http://x"; // ok\n/* a\n ${FM} */`);
  assert.deepEqual(hits.map((h) => `${h.line}:${h.kind}`), [`1:${TD}`, `4:${FM}`]);
});

test("findMarkers TEK GEÇİŞ: çok blok yorum + çok '://' içeren satırlar kuadratik değil; 4 KB üstü satır atlanır ve sayılır", () => {
  const stats = { longLines: 0 };
  const huge = `${"/* */ ".repeat(40000)}${":// ".repeat(40000)}`;
  const t0 = performance.now();
  assert.deepEqual(findMarkers(huge, stats), []);
  assert.equal(stats.longLines, 1, "uzun satır atlandı");
  assert.ok(performance.now() - t0 < 500, `uzun satır çok yavaş: ${performance.now() - t0} ms`);
  const k = 300;
  const line = `${"/* */ ".repeat(k)}${":// ".repeat(k)}// ${TD}`;
  assert.ok(line.length < 4096);
  const t1 = performance.now();
  const many = findMarkers(`${Array.from({ length: 2000 }, () => line).join("\n")}\n`, stats);
  const dt = performance.now() - t1;
  assert.equal(many.length, 2000);
  assert.equal(stats.longLines, 1);
  assert.ok(dt < 3000, `kuadratik davranış? ${dt} ms`);
  const edge = findMarkers(`// ${TD}${"x".repeat(4096)}\n// ${TD}\n`, stats);
  assert.deepEqual(edge.map((h) => h.line), [2]);
  assert.equal(stats.longLines, 2);
});

test("rapor: atlanan uzun satır sayısı görünür", async () => {
  const root = mkTmp("agentmom-td-long-");
  put(root, "src/long.ts", `// ${TD}${"y".repeat(5000)}\nexport const a = 1;\n// ${TD} kısa\n`);
  const r = await buildTechDebt(root);
  assert.equal(r.markers.longLinesSkipped, 1);
  assert.equal(r.markers.maxLineChars, 4096);
  assert.equal(r.markers.count, 1);
  assert.match(r.note, /4 KB'tan uzun satırlar atlanır/);
});

test("bağımlılık sürüm alanları redactString'ten geçer (sır kalıbı sızmaz)", () => {
  const d = parseDependencies(JSON.stringify({ dependencies: { "sk-abcdefghijklmnopqrstuvwx": "^1.0.0", ok: "1.2.3 token=abc" } }));
  const s = JSON.stringify(d);
  assert.doesNotMatch(s, /sk-abcdefghijklmnopqrstuvwx/);
  assert.doesNotMatch(s, /token=abc/);
});
