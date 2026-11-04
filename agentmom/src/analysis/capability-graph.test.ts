// Yetenek bağımlılık grafiği ve yetenek düzeyinde etki testleri (madde 47 ve 10). Sahip: Claude [İP:AgentMom devam]. Ağ, model, yazma yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { buildGraph, loadImportGraph } from "./impact.ts";
import { COMMON_OWNERS, GraphInputError, buildCapabilityGraph, capabilityImpact, parseCapabilities, renderImpact, renderMermaid, renderSummary } from "./capability-graph.ts";
import type { Capability } from "./capability-graph.ts";

const REPO = resolve(import.meta.dirname, "..", "..");
const F = (path: string, content = ""): { path: string; content: string } => ({ path, content });
const cap = (n: number, kanit: string[]): Capability => ({ n, ad: `Yetenek ${n}`, durum: "Kısmi", kanit });

// a.ts -> b.ts -> c.ts ; a.test.ts -> a.ts ; d.ts bağımsız ; x.ts -> y.ts -> x.ts (döngü)
const files = [
  F("src/a.ts", `import { b } from "./b.ts";`),
  F("src/b.ts", `import { c } from "./c.ts";`),
  F("src/c.ts", `export const c = 1;`),
  F("src/a.test.ts", `import "./a.ts";`),
  F("src/d.ts", `export const d = 1;`),
  F("src/x.ts", `import "./y.ts";`),
  F("src/y.ts", `import "./x.ts";`),
];
const caps = [cap(1, ["src/a.ts", "src/a.test.ts", "docs/a.md"]), cap(2, ["src/b.ts"]), cap(3, ["src/c.ts"]), cap(4, ["src/d.ts"]), cap(5, ["src/x.ts"]), cap(6, ["src/y.ts"])];

test("kenarlar: A kanıtı B'nin kanıtını içe aktarırsa A -> B; kendi dosyası ve test kaynağı kenar üretmez", () => {
  const g = buildCapabilityGraph(caps, buildGraph(files));
  assert.deepEqual(g.edges.map((e) => `${e.from}>${e.to}`), ["1>2", "2>3", "5>6", "6>5"]);
  assert.deepEqual(g.edges[0]!.via, [["src/a.ts", "src/b.ts"]]);
  assert.deepEqual(g.isolated, [4]);
  assert.deepEqual(g.cycles, [[5, 6]], "karşılıklı bağlı kümeler bulunur");
  assert.equal(g.nodes[0]!.outsideGraph, 1, "docs/a.md grafik dışı kanıt olarak sayılır, uydurulmaz");
  assert.deepEqual(g.outsideGraph, [{ file: "docs/a.md", owners: [1] }]);
});

test("ortak kanıt dosyası (> COMMON_OWNERS sahip) kenar üretmez ve ayrı listelenir", () => {
  const many = Array.from({ length: COMMON_OWNERS + 1 }, (_, i) => cap(10 + i, ["src/c.ts"]));
  const g = buildCapabilityGraph([cap(1, ["src/a.ts"]), cap(2, ["src/b.ts"]), ...many], buildGraph(files));
  assert.deepEqual(g.edges.map((e) => `${e.from}>${e.to}`), ["1>2"], "b -> c kenarı yok: c ortak");
  assert.equal(g.commonFiles[0]!.file, "src/c.ts");
  assert.equal(g.commonFiles[0]!.owners.length, COMMON_OWNERS + 1);
});

test("etki: değişen dosya -> kendi yeteneği (0) ve bağımlı dosyaların yetenekleri (mesafe), çalıştırılacak testler", () => {
  const r = capabilityImpact(caps, buildGraph(files), ["src/c.ts"], 3);
  assert.deepEqual(r.hits.map((h) => [h.n, h.distance]), [[3, 0], [2, 1], [1, 2]]);
  assert.deepEqual(r.tests, ["src/a.test.ts"]);
  assert.deepEqual(r.unknown, []);
  const near = capabilityImpact(caps, buildGraph(files), ["src/c.ts"], 1);
  assert.deepEqual(near.hits.map((h) => h.n), [3, 2], "derinlik 1 yalnız doğrudan bağımlıyı alır");
  assert.deepEqual(near.tests, ["src/a.test.ts"], "çalıştırılacak testler derinlikle KESİLMEZ (derinlik 1'de de a.test.ts listelenir)");
});

test("etki: grafikte olmayan dosya 'unknown' kalır (etkisi uydurulmaz); girdi doğrulaması reddeder", () => {
  const g = buildGraph(files);
  const r = capabilityImpact(caps, g, ["src/yok.ts", "src/d.ts"], 2);
  assert.deepEqual(r.unknown, ["src/yok.ts"]);
  assert.deepEqual(r.hits.map((h) => h.n), [4]);
  assert.deepEqual(capabilityImpact(caps, g, ["src/a.txt", "scripts/x.mjs", "db/001.sql"], 2).unknown, ["db/001.sql", "scripts/x.mjs", "src/a.txt"], "src/ dışı güvenli yollar hata değil unknown");
  for (const bad of ["../x.ts", "/etc/passwd", "src\\a.ts", "", "src/a.ts\0", "a/../b.ts", "./x.ts", "x:y.ts"]) assert.throws(() => capabilityImpact(caps, g, [bad], 2), GraphInputError, bad);
  assert.throws(() => capabilityImpact(caps, g, [], 2), GraphInputError);
  assert.throws(() => capabilityImpact(caps, g, Array.from({ length: 51 }, (_, i) => `src/f${i}.ts`), 2), GraphInputError);
  for (const d of [0, 7, 1.5, NaN]) assert.throws(() => capabilityImpact(caps, g, ["src/a.ts"], d), GraphInputError, String(d));
});

test("parseCapabilities katıdır: yinelenen numara, kötü yol, eksik alan reddedilir", () => {
  const ok = { items: [{ n: 1, tr: "A", durum: "Kısmi", kanit: ["src/a.ts", "src/a.ts"] }] };
  assert.deepEqual(parseCapabilities(ok)[0]!.kanit, ["src/a.ts"], "tekrarlayan kanıt tekilleşir");
  const bad = (x: unknown) => assert.throws(() => parseCapabilities(x), GraphInputError, JSON.stringify(x).slice(0, 80));
  bad(null);
  bad({ items: [] });
  bad({ items: [{ n: 1, tr: "A", durum: "K", kanit: [] }, { n: 1, tr: "B", durum: "K", kanit: [] }] });
  bad({ items: [{ n: 0, tr: "A", durum: "K", kanit: [] }] });
  bad({ items: [{ n: 1, tr: "", durum: "K", kanit: [] }] });
  bad({ items: [{ n: 1, tr: "A", durum: "K", kanit: ["../x"] }] });
  bad({ items: [{ n: 1, tr: "A", durum: "K", kanit: ["/abs"] }] });
  bad({ items: [{ n: 1, tr: "A", durum: "K", kanit: ["./src/b.ts"] }] });
  bad({ items: [{ n: 1, tr: "A", durum: "K", kanit: ["src//c.ts"] }] });
  bad({ items: [{ n: 1, tr: "A", durum: "K", kanit: [5] }] });
});

test("çıktılar: özet, Mermaid ve etki metni; markdown/Mermaid bozan karakterler temizlenir", () => {
  const evil = [{ ...cap(1, ["src/a.ts"]), ad: 'Kötü "ad"\n|x' }, cap(2, ["src/b.ts"])];
  const g = buildCapabilityGraph(evil, buildGraph(files));
  const mm = renderMermaid(g);
  assert.match(mm, /^graph LR\n/);
  assert.match(mm, /c1 -->\|1\| c2/);
  assert.ok(!/"ad"|\n\|x/.test(mm), "çift tırnak ve satır sonu Mermaid düğümünü bozamaz");
  assert.match(renderSummary(g), /Yetenek sayısı: 2; kenar: 1/);
  assert.match(renderImpact(capabilityImpact(caps, buildGraph(files), ["src/c.ts"], 3)), /mesafe 2: .*src\/a\.ts/);
});

test("ortak dosya KAYNAK olarak da kenar üretmez (denetim bulgusu 1)", () => {
  const many = Array.from({ length: COMMON_OWNERS + 1 }, (_, i) => cap(10 + i, ["src/a.ts"]));
  const g = buildCapabilityGraph([...many, cap(2, ["src/b.ts"])], buildGraph(files));
  assert.deepEqual(g.edges, [], "a.ts ortak: ne a.ts -> b.ts kenarı var");
  assert.equal(g.commonFiles[0]!.file, "src/a.ts");
});

test("test dosyası kenar kaynağı olmaz; iki yeteneğin ortak hedefi kendi kanıtıysa kenar yok (denetim bulgusu 5)", () => {
  const fs = [F("src/a.ts"), F("src/b.ts"), F("src/a.test.ts", `import "./b.ts";`)];
  const g1 = buildCapabilityGraph([cap(1, ["src/a.test.ts"]), cap(2, ["src/b.ts"])], buildGraph(fs));
  assert.deepEqual(g1.edges, [], "yalnız test dosyası içe aktarıyor: kenar yok (isTestFile kalkarsa bu test düşer)");
  const fs2 = [F("src/a.ts", `import "./b.ts";`), F("src/b.ts")];
  const g2 = buildCapabilityGraph([cap(1, ["src/a.ts", "src/b.ts"]), cap(2, ["src/b.ts"])], buildGraph(fs2));
  assert.deepEqual(g2.edges, [], "hedef aynı zamanda kaynağın yeteneğinin de kanıtı");
});

test("mesafe en küçük yoldur: iki değişen dosyadan ya da iki yoldan ulaşılan yetenek en yakın mesafeyi alır", () => {
  const fs = [F("src/c.ts"), F("src/m.ts", `import "./c.ts";`), F("src/t.ts", `import "./m.ts"; import "./c.ts";`)];
  const r = capabilityImpact([cap(1, ["src/c.ts"]), cap(2, ["src/m.ts"]), cap(3, ["src/t.ts"])], buildGraph(fs), ["src/c.ts"], 3);
  assert.deepEqual(r.hits.map((h) => [h.n, h.distance]), [[1, 0], [2, 1], [3, 1]], "t.ts hem 1 hem 2 adımda: 1");
  const two = capabilityImpact([cap(1, ["src/c.ts"]), cap(2, ["src/m.ts"]), cap(3, ["src/t.ts"])], buildGraph(fs), ["src/c.ts", "src/m.ts"], 3);
  assert.deepEqual(two.hits.map((h) => [h.n, h.distance]), [[1, 0], [2, 0], [3, 1]]);
});

test("kanıtı yalnız test olan yetenek, o test etkilenince listelenir; test listesi derinlikten bağımsız (denetim bulguları 2 ve 10)", () => {
  const fs = [F("src/c.ts"), F("src/m.ts", `import "./c.ts";`), F("src/n.ts", `import "./m.ts";`), F("src/n.test.ts", `import "./n.ts";`)];
  const r = capabilityImpact([cap(1, ["src/c.ts"]), cap(9, ["src/n.test.ts"])], buildGraph(fs), ["src/c.ts"], 1);
  assert.deepEqual(r.tests, ["src/n.test.ts"], "derinlik 1 ama 3 adım uzaktaki test de listelenir");
  const deep = capabilityImpact([cap(1, ["src/c.ts"]), cap(9, ["src/n.test.ts"])], buildGraph(fs), ["src/c.ts"], 6);
  assert.deepEqual(deep.hits.map((h) => h.n), [1, 9]);
});

test("eksik tarama uyarısı: kesilen ya da büyük diye atlanan dosya graphIncomplete yapar (denetim bulgusu 3)", () => {
  const g = buildGraph(files);
  assert.equal(capabilityImpact(caps, g, ["src/c.ts"], 2).graphIncomplete, false);
  assert.equal(capabilityImpact(caps, g, ["src/c.ts"], 2, { truncated: false, skippedLarge: 1 }).graphIncomplete, true);
  assert.equal(capabilityImpact(caps, g, ["src/c.ts"], 2, { truncated: true, skippedLarge: 0 }).graphIncomplete, true);
  assert.equal(buildCapabilityGraph(caps, g, { truncated: false, skippedLarge: 2 }).graphIncomplete, true);
  assert.match(renderImpact(capabilityImpact(caps, g, ["src/c.ts"], 2, { truncated: false, skippedLarge: 1 })), /UYARI: içe aktarma grafiği eksik/);
});

test("çıktı temizliği: durum, yetenek adı ve dosya adındaki satır sonu/ESC/biçim karakterleri ayrı satır ya da kaçış üretemez (denetim bulgusu 4)", () => {
  const evilFiles = [F("src/c.ts"), F("src/m.ts", `import "./c.ts";`), F("src/m.test.ts", `import "./m.ts";`), F("src/z/x\n- FAKE | `y`.test.ts", `import "../c.ts";`)];
  const evilCaps: Capability[] = [{ n: 1, ad: "A\x1b[31m\u2028B", durum: "Kısmi\n## HACK | x", kanit: ["src/c.ts", "src/m.ts"] }];
  const out = renderImpact(capabilityImpact(evilCaps, buildGraph(evilFiles), ["src/c.ts"], 2));
  assert.ok(!/\x1b|\u2028/.test(out), "ESC ve U+2028 yok");
  assert.ok(!/^## HACK/m.test(out) && !/^- FAKE/m.test(out), "sahte başlık ya da madde satırı doğmaz");
  assert.ok(!/\x1b|\u2028/.test(renderMermaid(buildCapabilityGraph(evilCaps, buildGraph(evilFiles)))));
});

test("liste sınırı: 500'den çok test varsa truncated işaretlenir, sessiz kesilmez", () => {
  const many = [F("src/c.ts"), ...Array.from({ length: 520 }, (_, i) => F(`src/t${i}.test.ts`, `import "./c.ts";`))];
  const r = capabilityImpact([cap(1, ["src/c.ts"])], buildGraph(many), ["src/c.ts"], 1);
  assert.equal(r.truncated, true);
  assert.ok(r.tests.length <= 500);
});

test("gerçek depo: kendi dosyamın etkisi bu yeteneğe düşer; CLI özet ve etki çalışır, hiçbir şey yazmaz", async () => {
  const { graph } = await loadImportGraph(REPO);
  const status = JSON.parse((await import("node:fs")).readFileSync(resolve(REPO, "docs/status/100-yetenek-durum.json"), "utf8"));
  const real = parseCapabilities(status);
  assert.equal(real.length, 100);
  const g = buildCapabilityGraph(real, graph);
  assert.ok(g.edges.length > 0 && g.nodes.length === 100);
  const r = capabilityImpact(real, graph, ["src/ops/capsule.ts"], 3);
  assert.ok(r.hits.some((h) => h.n === 79 && h.distance === 0), "kapsül (79) kendi dosyasında 0 mesafede");
  const before = execFileSync("git", ["status", "--porcelain"], { cwd: REPO, encoding: "utf8" });
  const run = (...a: string[]) => execFileSync(process.execPath, ["--experimental-strip-types", "scripts/yetenek-grafi.mjs", ...a], { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  assert.match(run("ozet"), /Yetenek sayısı: 100/);
  assert.match(run("etki", "src/ops/capsule.ts", "--derinlik", "2"), /Taşınabilir Proje Kapsülleri/);
  assert.equal(JSON.parse(run("etki", "src/ops/capsule.ts", "--json")).changed[0], "src/ops/capsule.ts");
  assert.equal(execFileSync("git", ["status", "--porcelain"], { cwd: REPO, encoding: "utf8" }), before, "komutlar depoya hiçbir şey yazmadı");
  assert.throws(() => run("etki", "../x.ts"), (e: any) => e.status === 2);
  assert.throws(() => run("etki", "src/a.ts", "--derinlik"), (e: any) => e.status === 2);
});
