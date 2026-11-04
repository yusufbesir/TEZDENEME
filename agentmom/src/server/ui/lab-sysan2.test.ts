// Sistem analitiği kartları (teknik borç 33, sürüm etkisi 29, veri profili 25) arayüz testleri. Sahip: Claude [İP:AgentMom Faz 11]. yazan: [Claude#agentmom-sysan2]
// Kaynaklar node:vm içinde; ağ yok, tarayıcı yok, model çağrısı yok. Kartlar, form doğrulaması (geçersizde istek yok), boş/hata/bozuk yanıt durumları, XSS ve sır etkisizliği, çekirdek beyaz liste.
import { test } from "node:test";
import assert from "node:assert/strict";
import { alerts, buttons, byId, byKey, noActiveContent, okData, typeInto, makeEnv, coreEnv, read } from "./lab-env.ts";
import type { Env } from "./lab-env.ts";

const EVIL = "<img src=x onerror=alert(1)><script>alert(2)</script> \u202Egnp.exe \u200B";
const SECRET = "sk-abcdefghijklmnopqrstuvwx";
const text = (e: Env): string => e.host.textContent;
const CAPS_MIN = { items: [{ n: 1, en: "A", tr: "A", sahip: "M1", durum: "Doğrulandı", kanit: [], eksik: "", dilim: "M1" }], summary: { total: 1, dogrulandi: 1, kismi: 0, planli: 0, desteklenmiyor: 0, kapsamdisi: 0 }, slices: {}, registry: [], updatedAt: "x" };
function integ(setup?: (e: Env) => void, param = ""): Env {
  const e = makeEnv();
  e.AM.state.data.capabilities = okData(CAPS_MIN);
  setup?.(e);
  e.go("integrations", param);
  return e;
}
const toggleOf = (e: Env, id: string) => byKey(e.host, "lab-toggle:" + id)!;
const openI = (e: Env, id: string): void => { buttons(toggleOf(e, id).parentNode!, /^Aç$/)[0]!.click(); e.P.rerender(); };
const asked = (e: Env, key: string) => e.loads().filter((c) => c[1] === key);
const NEW_IDS = ["am-lab-techdebt", "am-lab-release", "am-lab-dataprofile"];

test("yapı: üç yeni bölüm kimlikli ve kapalı; açılmadan hiçbir veri istenmez; mevcut bölümler korunur", () => {
  const e = integ();
  for (const id of NEW_IDS) { assert.ok(byId(e.host, id), id); assert.equal(toggleOf(e, id).attrs["aria-expanded"], "false", id); }
  for (const id of ["am-lab-impact", "am-lab-absence", "am-lab-broker"]) assert.ok(byId(e.host, id), id);
  assert.equal(e.loads().filter((c) => /^analysis(TechDebt|Release|DataProfile)/.test(c[1])).length, 0);
  for (const t of ["Teknik borç merkezi", "Sürüm etki analizi", "Veri analizi laboratuvarı"]) assert.ok(text(e).includes(t), t);
  assert.doesNotMatch(text(e), /⟦/);
});

test("yetenekler menüsünden gelinen bölüm açılır ve odaklanır; teknik borç bir kez istenir", () => {
  const e = integ(undefined, "bolum:am-lab-techdebt:1");
  assert.equal(toggleOf(e, "am-lab-techdebt").attrs["aria-expanded"], "true");
  assert.equal(asked(e, "analysisTechDebt").length, 1);
  assert.equal(e.doc.activeElement, byId(e.host, "am-lab-techdebt"));
  const r = integ(undefined, "bolum:am-lab-release:2");
  assert.equal(toggleOf(r, "am-lab-release").attrs["aria-expanded"], "true");
  assert.equal(asked(r, "analysisRelease").length, 0, "sürüm etkisi iki başvuru girilmeden istenmez");
  const d = integ(undefined, "bolum:am-lab-dataprofile:3");
  assert.equal(toggleOf(d, "am-lab-dataprofile").attrs["aria-expanded"], "true");
  assert.equal(asked(d, "analysisDataProfile").length, 0, "veri profili dosya yolu girilmeden istenmez");
});

// ================================================================ Teknik borç
const TD = (over: Record<string, unknown> = {}) => ({
  techDebt: {
    scan: { filesScanned: 321, maxFiles: 3000, budgetMs: 2000, maxFileBytes: 307200, elapsedMs: 150, skippedLarge: 2, truncated: false, graphIncomplete: false },
    markers: { words: ["A", "B"], longLinesSkipped: 2, maxLineChars: 4096, count: 3, filesWithMarkers: 2, byKind: { A: 3 }, examples: ["src/a.ts:12", "src/b.ts:7", "src/b.ts:9"], sampleCap: 20 },
    untested: { sourceFiles: 100, count: 2, examples: ["src/x.ts", "src/y.ts"], sampleCap: 20, basis: "b" },
    size: { largest: [{ file: "src/big.ts", lines: 900 }, { file: "src/mid.ts", lines: 450 }], bigThreshold: 600, bigCount: 1, bigExamples: [{ file: "src/big.ts", lines: 900 }], sampleCap: 20 },
    cycles: { count: 1, examples: [["src/a.ts", "src/b.ts"]], sampleCap: 20 },
    dependencies: { status: "ok", networkChecked: false, latestVersion: "bilinmiyor", count: 2, bySection: { dependencies: 1, devDependencies: 1 }, examples: [{ name: "left-pad", section: "dependencies", declared: "^1.2.3", latest: "bilinmiyor" }, { name: "tool", section: "devDependencies", declared: "~2.0.0", latest: "bilinmiyor" }] },
    note: "Sunucu notu: yalnız sayımlar", ...over,
  },
});

test("teknik borç: sinyal tablosu, kaynak gösterimli örnekler, bütçe ve 'güncel sürüm bilinmiyor'; puan/öncelik yok", () => {
  const e = integ((x) => { x.AM.state.data.analysisTechDebt = okData(TD()); }, "bolum:am-lab-techdebt:1");
  const t = text(e);
  for (const re of [/Sinyal sayıları/, /Açık işaretçiler/, /src\/a\.ts:12/, /src\/b\.ts:9/, /Kardeş testi olmayan kaynak/, /src\/x\.ts/, /2 \/ 100/, /En büyük 10 dosya/, /src\/big\.ts/, /900/, /600\+ satırlık dosyalar/, /src\/big\.ts — 900 satır/, /İçe aktarma döngüleri/, /src\/a\.ts → src\/b\.ts/, /Taranan dosya/, /321/, /Atlanan uzun satır \(4 KB üstü\)/, /en çok 3\.000 dosya, 2\.000 ms/, /left-pad/, /\^1\.2\.3/, /Ağ kontrolü yapılmadı: güncel sürüm bilinmiyor/, /Güncel sürüm/, /Sunucu notu/, /Toplam puan, öncelik ya da yorum yoktur/]) assert.match(t, re);
  assert.ok((t.match(/bilinmiyor/g) ?? []).length >= 2, "her paket için güncel sürüm 'bilinmiyor'");
  assert.doesNotMatch(t, /puan: \d|öncelik: \d|⟦/);
  assert.equal(alerts(e.host).filter((n) => /Tarama bütçesi aşıldı|grafiği eksik/.test(n.textContent)).length, 0);
});

test("teknik borç: bütçe aşıldı ve graf eksik uyarıları görünür; sıfır sayılar 'Bulunmadı'; package.json yok/okunamadı dürüst", () => {
  const e = integ((x) => { x.AM.state.data.analysisTechDebt = okData(TD({ scan: { filesScanned: 5, maxFiles: 5, budgetMs: 2000, elapsedMs: 2100, skippedLarge: 0, truncated: true, graphIncomplete: true } })); }, "bolum:am-lab-techdebt:1");
  assert.match(text(e), /Tarama bütçesi aşıldı/);
  assert.match(text(e), /grafiği eksik olabilir/);
  const zero = TD({ markers: { count: 0, examples: [] }, untested: { count: 0, sourceFiles: 0, examples: [] }, size: { largest: [], bigCount: 0, bigExamples: [] }, cycles: { count: 0, examples: [] }, dependencies: { status: "absent", count: 0, examples: [] } });
  e.AM.state.data.analysisTechDebt = okData(zero);
  e.P.rerender();
  assert.ok((text(e).match(/Bulunmadı\./g) ?? []).length >= 4);
  assert.match(text(e), /package\.json bulunamadı/);
  e.AM.state.data.analysisTechDebt = okData(TD({ dependencies: { status: "unreadable", count: 0, examples: [] } }));
  e.P.rerender();
  assert.match(text(e), /package\.json okunamadı/);
});

test("teknik borç: hata (+ yeniden dene), bozuk yanıt, XSS ve sır etkisiz", () => {
  const e = integ((x) => { x.AM.state.data.analysisTechDebt = { status: "error", value: null, reason: "503: analiz şu an yapılamadı" }; }, "bolum:am-lab-techdebt:1");
  const a = alerts(e.host).filter((n) => /Teknik borç sayımı alınamadı/.test(n.textContent));
  assert.equal(a.length, 1);
  assert.match(a[0]!.textContent, /503/);
  const n0 = e.loads().length;
  buttons(a[0]!, /Yeniden dene/)[0]!.click();
  assert.deepEqual(e.loads().slice(n0)[0], ["loadData", "analysisTechDebt", undefined]);
  for (const bad of [null, 3, {}, { techDebt: null }, { techDebt: { markers: "x", untested: 2, size: { largest: [null, 1, {}], bigExamples: "q" }, cycles: { examples: [1, null, ["a"]] }, dependencies: { examples: [null, 4] }, scan: 7 } }]) {
    e.AM.state.data.analysisTechDebt = okData(bad);
    assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad));
  }
  e.AM.state.data.analysisTechDebt = okData(TD({ markers: { count: 1, examples: [EVIL + SECRET] }, note: EVIL + SECRET, dependencies: { status: "ok", count: 1, examples: [{ name: EVIL, section: EVIL, declared: EVIL + SECRET, latest: EVIL }] } }));
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
  assert.ok(!/[\u202A-\u202E\u200B]/.test(text(e)));
});

// ================================================================ Sürüm etkisi
test("sürüm etkisi formu: geçersiz başvuru istek göndermez ve Türkçe hata gösterir; geçerli çift 'from|to' ile gider", () => {
  const e = integ(undefined, "bolum:am-lab-release:1");
  const run = () => { byKey(e.host, "rel-run")!.click(); };
  const bads: Array<[string, string]> = [["", ""], ["v1.0", ""], ["", "main"], ["--upload-pack=x", "main"], ["-x", "main"], ["a..b", "main"], ["a b", "main"], ["a@{1}", "main"], ["HEAD~1", "main"], ["a^", "main"], ["a:b", "main"], ["a\\b", "main"], ["a//b", "main"], ["a/", "main"], ["x.lock", "main"], ["x".repeat(101), "main"], ["v1.0", "a b"]];
  for (const [f, t] of bads) {
    typeInto(byKey(e.host, "rel-from")!, f);
    typeInto(byKey(e.host, "rel-to")!, t);
    run();
    assert.equal(asked(e, "analysisRelease").length, 0, "istek yok: " + JSON.stringify([f, t]));
    assert.ok(alerts(e.host).some((n) => /Başvuru geçersiz/.test(n.textContent)), "hata: " + JSON.stringify([f, t]));
  }
  typeInto(byKey(e.host, "rel-from")!, " v1.0 ");
  typeInto(byKey(e.host, "rel-to")!, "feature/x-y");
  run();
  assert.deepEqual(asked(e, "analysisRelease"), [["loadData", "analysisRelease", "v1.0|feature/x-y"]]);
  assert.equal(alerts(e.host).filter((n) => /Başvuru geçersiz/.test(n.textContent)).length, 0, "hata temizlendi");
  assert.match(text(e), /Analiz yükleniyor/);
});

const REL = (over: Record<string, unknown> = {}) => ({
  releaseImpact: {
    status: "ok", from: "v1.0", to: "v2.0", resolved: { from: "aaaaaaaaaaaa", to: "bbbbbbbbbbbb" },
    changes: { total: 5, byStatus: { A: 2, D: 1, M: 2 }, listed: [{ status: "M", file: "src/lib.ts" }, { status: "A", file: "src/new.ts" }, { status: "D", file: "src/old.ts" }], listTruncated: true },
    srcChanged: { count: 3, analyzed: 3, notAnalyzed: 0, analyzedCap: 50 },
    files: [{ file: "src/lib.ts", status: "M", inGraph: true, isTest: false, directDependents: 1, dependentFiles: 4, dependentTests: 2 }, { file: "src/old.ts", status: "D", inGraph: false, isTest: false, directDependents: null, dependentFiles: null, dependentTests: null }],
    radius: { files: 4, tests: 2, basis: "b" }, untestedChanged: { count: 2, examples: ["src/lib.ts", "src/new.ts"] },
    migrations: { changed: ["A src/core/db/migrations/002_x.sql"], count: 1, warning: "Veritabanı migrasyonu değişti: sunucu uyarısı" },
    surface: { serverRouteFileChanged: true, uiFilesChanged: 3, endpointLevel: "çözümlenmedi" }, scan: { truncated: false, graphIncomplete: true, elapsedMs: 10 },
    note: "Sunucu notu: etki çalışma ağacından", ...over,
  },
});
function relRun(e: Env): void {
  typeInto(byKey(e.host, "rel-from")!, "v1.0");
  typeInto(byKey(e.host, "rel-to")!, "v2.0");
  byKey(e.host, "rel-run")!.click();
}

test("sürüm etkisi sonucu: değişenler, etki sayıları, 'bilinmiyor', testsiz değişenler, migrasyon uyarısı, uç düzeyi çözümlenmedi", () => {
  const e = integ(undefined, "bolum:am-lab-release:1");
  relRun(e);
  e.AM.state.data["analysisRelease:v1.0|v2.0"] = okData(REL());
  e.P.rerender();
  const t = text(e);
  for (const re of [/aaaaaaaaaaaa → bbbbbbbbbbbb/, /Değişen dosya/, /eklendi: 2/, /silindi: 1/, /değişti: 2/, /Etkilenen dosya \(birleşim\)/, /Değişen kaynak dosyaların etkisi/, /src\/lib\.ts/, /src\/old\.ts/, /Testi olmayan değişen dosyalar \(2\)/, /Migrasyon dosyaları değişti/, /sunucu uyarısı/, /002_x\.sql/, /Uç düzeyinde değişim çözümlenmedi/, /Sunucu uç dosyası \(app\.ts\) değişti: Evet; değişen arayüz dosyası: 3/, /grafiği eksik olabilir/, /Liste kısaltıldı/, /Sunucu notu/]) assert.match(t, re);
  const rows = text(e).match(/bilinmiyor/g) ?? [];
  assert.ok(rows.length >= 3, "silinen dosyanın üç etki sütunu 'bilinmiyor'");
  assert.ok(alerts(e.host).every((n) => !/Başvuru geçersiz/.test(n.textContent)));
});

test("sürüm etkisi: migrasyon yoksa uyarı yok; fark yoksa boş durum; git okunamadı kartı; hata (+ yeniden dene); bozuk yanıt; XSS", () => {
  const e = integ(undefined, "bolum:am-lab-release:1");
  relRun(e);
  const key = "analysisRelease:v1.0|v2.0";
  e.AM.state.data[key] = okData(REL({ migrations: { changed: [], count: 0, warning: null }, changes: { total: 0, byStatus: {}, listed: [], listTruncated: false }, files: [], untestedChanged: { count: 0, examples: [] }, scan: { graphIncomplete: false } }));
  e.P.rerender();
  assert.doesNotMatch(text(e), /Migrasyon dosyaları değişti/);
  assert.match(text(e), /Değişen dosya yok/);
  e.AM.state.data[key] = okData({ releaseImpact: { status: "unreadable", code: "ref_not_found", reason: "başvurulardan biri bu depoda bulunamadı" } });
  e.P.rerender();
  assert.ok(alerts(e.host).some((n) => /git okunamadı/.test(n.textContent) && /bulunamadı/.test(n.textContent)));
  e.AM.state.data[key] = okData({ releaseImpact: { status: "unreadable", code: "unsafe_config", reason: "deponun yerel git yapılandırmasında tehlikeli bir anahtar var", key: "core.sshcommand" } });
  e.P.rerender();
  assert.ok(alerts(e.host).some((n) => /git okunamadı/.test(n.textContent) && /tehlikeli bir anahtar/.test(n.textContent) && /Tehlikeli yapılandırma anahtarı: core\.sshcommand/.test(n.textContent)));
  e.AM.state.data[key] = { status: "error", value: null, reason: "400: from: başvuru biçimi" };
  e.P.rerender();
  const a = alerts(e.host).filter((n) => /Sürüm etki analizi yapılamadı/.test(n.textContent));
  assert.equal(a.length, 1);
  const n0 = e.loads().length;
  buttons(a[0]!, /Yeniden dene/)[0]!.click();
  assert.deepEqual(e.loads().slice(n0)[0], ["loadData", "analysisRelease", "v1.0|v2.0"]);
  for (const bad of [null, 3, {}, { releaseImpact: null }, { releaseImpact: { status: "ok", changes: "x", files: [null, 1, {}], migrations: 4, surface: "q", untestedChanged: [] } }]) {
    e.AM.state.data[key] = okData(bad);
    assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad));
  }
  e.AM.state.data[key] = okData(REL({ from: EVIL, note: EVIL + SECRET, files: [{ file: EVIL + SECRET, status: EVIL, inGraph: true, directDependents: 1, dependentFiles: 1, dependentTests: 1 }], changes: { total: 1, byStatus: { [EVIL]: 1 }, listed: [{ status: EVIL, file: EVIL + SECRET }] }, migrations: { changed: [EVIL], count: 1, warning: EVIL + SECRET } }));
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
  assert.ok(!/[\u202A-\u202E\u200B]/.test(text(e)));
});

// ================================================================ Veri profili
test("veri profili formu: geçersiz yol istek göndermez ve Türkçe hata gösterir; geçerli yol aynen gider", () => {
  const e = integ(undefined, "bolum:am-lab-dataprofile:1");
  const run = () => { byKey(e.host, "dp-run")!.click(); };
  for (const bad of ["\\\\srv\\s\\a.csv", "//srv/s/a.csv", "\\\\?\\C:\\a.csv", "\\\\.\\C:\\a.csv", "", "   ", "relative/x.csv", "x.csv", "C:/data/x.exe", "C:/data/x", "C:/data/../x.csv", "/etc/../x.csv", "C:/data/x.csv:stream", "C:/data/\u0001x.csv", "C:/" + "a".repeat(400) + ".csv", "//server/share/x.csv".replace("//", "x:"), "C:\\data\\..\\x.csv"]) {
    typeInto(byKey(e.host, "dp-path")!, bad);
    run();
    assert.equal(asked(e, "analysisDataProfile").length, 0, "istek yok: " + JSON.stringify(bad));
    assert.ok(alerts(e.host).some((n) => /Dosya yolu geçersiz/.test(n.textContent)), "hata: " + JSON.stringify(bad));
  }
  typeInto(byKey(e.host, "dp-path")!, "  D:/projeler/veri/musteriler.CSV ");
  run();
  assert.deepEqual(asked(e, "analysisDataProfile"), [["loadData", "analysisDataProfile", "D:/projeler/veri/musteriler.CSV"]]);
  typeInto(byKey(e.host, "dp-path")!, "C:\\veri\\a.ndjson");
  run();
  assert.equal(asked(e, "analysisDataProfile")[1]![2], "C:\\veri\\a.ndjson");
  typeInto(byKey(e.host, "dp-path")!, "/home/u/v.json");
  run();
  assert.equal(asked(e, "analysisDataProfile").length, 3);
  assert.match(text(e), /Analiz yükleniyor/);
});

const PATH = "D:/projeler/veri/musteriler.csv";
const col = (name: string, over: Record<string, unknown> = {}) => ({ index: 0, name, type: "number", nonEmpty: 3, emptyCount: 0, emptyRatio: 0, unique: 3, uniqueCapped: false, numericCount: 3, textCount: 0, sensitive: false, flags: [], ...over });
const DP = (over: Record<string, unknown> = {}) => ({
  dataProfile: {
    format: "csv", pathClass: "internal", bytes: 1234, rows: 3, columnCount: 4, ignoredColumns: 0,
    columns: [col("id"), col("name", { type: "text", min: null, max: null, unique: 2, uniqueCapped: true, flags: ["constant"] }), col("score", { type: "mixed", emptyRatio: 0.25, flags: ["mixed_type", "mostly_empty"] }), col("password", { sensitive: true })],
    duplicateRows: 1, raggedRows: 2, badRows: 0, blankLines: 1,
    anomalies: [{ column: "name", kind: "constant" }, { column: "score", kind: "mixed_type" }, { column: "score", kind: "mostly_empty" }],
    notices: ["header_as_data", "names_masked"], sensitive: { columns: 1, cells: 4, warning: true }, truncated: true, truncatedBy: "rows",
    limits: { maxBytes: 8388608, maxRows: 200000, maxColumns: 200, maxDistinct: 1000, mostlyEmptyRatio: 0.8, budgetMs: 5000 },
    note: "Sunucu notu: yalnız sayılar", ...over,
  },
});
function dpRun(e: Env): void {
  typeInto(byKey(e.host, "dp-path")!, PATH);
  byKey(e.host, "dp-run")!.click();
}

test("veri profili sonucu: sayılar, sütun tablosu, anomaliler, kesildi ve duyarlı uyarısı; hücre değeri, en küçük/en büyük sütunu yok; bildirimler görünür", () => {
  const e = integ(undefined, "bolum:am-lab-dataprofile:1");
  dpRun(e);
  e.AM.state.data["analysisDataProfile:" + PATH] = okData(DP());
  e.P.rerender();
  const t = text(e);
  for (const re of [/Biçim/, /csv/, /1\.234/, /Satır/, /Yinelenen satır/, /Sütun sayısı uyuşmayan satır/, /Boş satır/, /Dosya kesildi: yalnız ilk 3 satır okundu/, /Duyarlı veri uyarısı: 1 sütun, 4 hücre/, /Anomali işaretleri \(3\)/, /name — tek değerli/, /score — karışık tür/, /score — aşırı boş/, /Sütunlar \(4\)/, /en az 2/, /%25/, /sayı/, /metin/, /karışık/, /duyarlı/, /İlk satır veri gibi göründüğü için/, /sütun adları maskelendi/, /Hiçbir sütunda hücre değeri gösterilmez/, /Sınırlar: en çok 200\.000 satır ve 200 sütun/, /Sunucu notu/]) assert.match(t, re);
  assert.doesNotMatch(t, /bastırıldı|En küçük|En büyük/, "min/max sütunu yok");
  assert.ok(alerts(e.host).length === 0 || alerts(e.host).every((n) => !/Dosya yolu geçersiz/.test(n.textContent)));
});

test("veri profili: satır yok boş durumu, anomali yok, hata (403 gibi) + yeniden dene, bozuk yanıt, XSS ve sır etkisiz", () => {
  const e = integ(undefined, "bolum:am-lab-dataprofile:1");
  dpRun(e);
  const key = "analysisDataProfile:" + PATH;
  e.AM.state.data[key] = okData(DP({ rows: 0, columnCount: 0, columns: [], anomalies: [], sensitive: { columns: 0, cells: 0, warning: false }, truncated: false }));
  e.P.rerender();
  assert.match(text(e), /Satır yok/);
  assert.match(text(e), /İşaret yok/);
  assert.doesNotMatch(text(e), /Duyarlı veri uyarısı|Dosya kesildi/);
  e.AM.state.data[key] = { status: "error", value: null, reason: "403: dosya izinli klasörlerin (allowedDirs / trustedRepos) dışında" };
  e.P.rerender();
  const a = alerts(e.host).filter((n) => /Veri profili çıkarılamadı/.test(n.textContent));
  assert.equal(a.length, 1);
  assert.match(a[0]!.textContent, /403/);
  const n0 = e.loads().length;
  buttons(a[0]!, /Yeniden dene/)[0]!.click();
  assert.deepEqual(e.loads().slice(n0)[0], ["loadData", "analysisDataProfile", PATH]);
  for (const bad of [null, 3, {}, { dataProfile: null }, { dataProfile: { columns: [null, 1, {}], anomalies: "x", sensitive: 5, limits: 7, rows: "x" } }]) {
    e.AM.state.data[key] = okData(bad);
    assert.doesNotThrow(() => e.P.rerender(), JSON.stringify(bad));
  }
  e.AM.state.data[key] = okData(DP({ format: EVIL, note: EVIL + SECRET, columns: [col(EVIL + SECRET, { type: EVIL, flags: [EVIL] })], anomalies: [{ column: EVIL + SECRET, kind: EVIL }] }));
  e.P.rerender();
  noActiveContent(e.host);
  assert.ok(!text(e).includes(SECRET));
  assert.ok(!/[\u202A-\u202E\u200B]/.test(text(e)));
});

test("kaynak: yeni metin anahtarları hep kayıtlı (⟦…⟧ kalmaz) ve yeni kod yasak desen içermez", () => {
  const e = integ((x) => { x.AM.state.data.analysisTechDebt = okData(TD()); }, "bolum:am-lab-techdebt:1");
  openI(e, "am-lab-release");
  relRun(e);
  e.AM.state.data["analysisRelease:v1.0|v2.0"] = okData(REL());
  openI(e, "am-lab-dataprofile");
  dpRun(e);
  e.AM.state.data["analysisDataProfile:" + PATH] = okData(DP());
  e.P.rerender();
  assert.doesNotMatch(text(e), /⟦/);
  const src = read("page-integrations.js");
  const used = new Set([...src.matchAll(/T\("(page-integrations\.(?:td|rel|dp)[A-Za-z]+)"/g)].map((m) => m[1] as string));
  assert.ok(used.size > 60);
  const w = e.win as unknown as { AM_T: (k: string) => string };
  for (const k of used) {
    assert.ok(!w.AM_T(k).startsWith("⟦"), k);
    assert.doesNotMatch(w.AM_T(k), /yakında|planlı|yer tutucu|TODO/i, "yer tutucu yok: " + k);
  }
  for (const banned of [/innerHTML/, /outerHTML/, /insertAdjacentHTML/, /\bfetch\s*\(/, /localStorage/, /sessionStorage/, /\beval\s*\(/, /<style/i, /<script/i]) assert.ok(!banned.test(src), String(banned));
  assert.ok(!/[\u202A-\u202E\u2066-\u2069\u200B-\u200F\uFEFF]/.test(src), "bidi/görünmez karakter");
});

test("çekirdek: üç yeni GET ucu beyaz listede, parametre istemcide doğrulanır (geçersizde istek yok)", async () => {
  const c = coreEnv();
  await c.flush();
  const b0 = c.calls.length;
  const A = c.win.AM.actions;
  await A.loadData("analysisTechDebt");
  await A.loadData("analysisRelease", "v1.0|feature/x-y");
  await A.loadData("analysisDataProfile", "D:/veri/a b.csv");
  assert.deepEqual(c.calls.slice(b0).map((x) => x[1]), [
    "/api/analysis/tech-debt", "/api/analysis/release-impact?from=v1.0&to=feature%2Fx-y", "/api/analysis/data-profile?path=D%3A%2Fveri%2Fa%20b.csv",
  ]);
  assert.ok(c.calls.slice(b0).every((x) => x[0] === "GET"));
  const b1 = c.calls.length;
  for (const p of ["", "v1.0", "|main", "v1.0|", "a|b|c", "--x|main", "a..b|main", "a b|main", "a@{1}|main", "a~1|main", "a:b|main", "a//b|main", "x.lock|main", "x".repeat(101) + "|main", "main|" + "x".repeat(101), 5 as any, undefined as any]) await A.loadData("analysisRelease", p);
  for (const p of ["//srv/s/a.csv", "\\\\srv\\s\\a.csv", "\\\\?\\C:\\a.csv", "", "x.csv", "relative/x.csv", "C:/d/x.exe", "C:/d/../x.csv", "C:/d/x.csv:s", "C:/\u0001/x.csv", "C:/" + "a".repeat(400) + ".csv", 5 as any, undefined as any]) await A.loadData("analysisDataProfile", p);
  assert.equal(c.calls.length, b1, "hiçbir geçersiz parametre istek göndermedi");
});
