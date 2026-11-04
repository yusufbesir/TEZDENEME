// Veri analizi laboratuvarı (madde 25) testleri. Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// CSV/TSV/JSON/NDJSON profilleri, BOM/CRLF/tırnaklı alan, 200 bin satır sınırı + kesildi, 8 MB sınırı, sır dosyası/yolu reddi, allowedDirs dışı yol reddi,
// HAM HÜCRE DEĞERİNİN çıktıda OLMAMASI (gizli işaretçi hücre), regex bombasızlık ve yan etkisizlik. Yalnız testlerin kendi mkTmp klasörleri.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../../testing/tmp.ts";
import { CsvReader, DataProfileError, MAX_COLUMNS, MAX_DISTINCT, MAX_PROFILE_BYTES, MAX_ROWS, checkProfilePath, profileFile, profileText, realLocationProblem } from "./data-profile.ts";
import { readFileInside } from "./safe-read.ts";
import type { DataFormat, DataProfile } from "./data-profile.ts";

const prof = (text: string, format: DataFormat = "csv", opts = {}): Promise<DataProfile> => profileText(text, format, Buffer.byteLength(text), "internal", opts);
const col = (p: DataProfile, name: string) => {
  const c = p.columns.find((x) => x.name === name);
  assert.ok(c, `sütun yok: ${name}`);
  return c;
};
const MARKER = "HIDDEN-MARKER-CELL-XYZ";

function workspace(): { root: string; policy: { allowedDirs: string[]; trustedRepos: string[]; forbiddenDirs: string[]; sensitiveDirs: string[] }; other: string } {
  const root = mkTmp("agentmom-dp-");
  const other = mkTmp("agentmom-dp-other-");
  return { root, other, policy: { allowedDirs: [root], trustedRepos: [], forbiddenDirs: [join(root, "keys")], sensitiveDirs: [join(root, "private")] } };
}

test("CsvReader: tırnaklı alan, virgül, iç satır sonu, \"\" kaçışı, CRLF/LF/CR ve son satırda satır sonu yok", () => {
  const rd = new CsvReader('a,b,c\r\n"x,y","l1\nl2","he said ""hi"""\nlast,,\rcr,only', ",");
  assert.deepEqual(rd.next(), ["a", "b", "c"]);
  assert.deepEqual(rd.next(), ["x,y", "l1\nl2", 'he said "hi"']);
  assert.deepEqual(rd.next(), ["last", "", ""]);
  assert.deepEqual(rd.next(), ["cr", "only"]);
  assert.equal(rd.next(), null);
  const tsv = new CsvReader("a\tb\n1\t\"2\t3\"\n", "\t");
  assert.deepEqual(tsv.next(), ["a", "b"]);
  assert.deepEqual(tsv.next(), ["1", "2\t3"]);
  assert.equal(tsv.next(), null);
  const trailing = new CsvReader("a,b,", ",");
  assert.deepEqual(trailing.next(), ["a", "b", ""]);
});

test("CSV profili: satır, sütun, tür, boş oranı, benzersiz, karışık tür; hücre değeri (min/max dahil) yok", async () => {
  const p = await prof("id,name,score,note\n1,ada,3.5,\n2,bob,x,\n3,ada,10,\n");
  assert.equal(p.format, "csv");
  assert.equal(p.rows, 3);
  assert.equal(p.columnCount, 4);
  assert.deepEqual(p.columns.map((c) => c.name), ["id", "name", "score", "note"]);
  const id = col(p, "id");
  assert.deepEqual({ type: id.type, unique: id.unique, emptyCount: id.emptyCount }, { type: "number", unique: 3, emptyCount: 0 });
  const name = col(p, "name");
  assert.deepEqual({ type: name.type, unique: name.unique }, { type: "text", unique: 2 });
  const score = col(p, "score");
  assert.equal(score.type, "mixed");
  assert.deepEqual({ numericCount: score.numericCount, textCount: score.textCount }, { numericCount: 2, textCount: 1 });
  for (const c of p.columns) assert.ok(!("min" in c) && !("max" in c) && !("valuesSuppressed" in c), "sütunda hücre değeri türevi yok: " + c.name);
  assert.doesNotMatch(JSON.stringify(p), /3\.5/, "hiçbir hücre değeri çıktıda yok");
  assert.deepEqual(score.flags, ["mixed_type"]);
  const note = col(p, "note");
  assert.deepEqual({ type: note.type, emptyRatio: note.emptyRatio, nonEmpty: note.nonEmpty, unique: note.unique }, { type: "empty", emptyRatio: 1, nonEmpty: 0, unique: 0 });
  assert.deepEqual(note.flags, ["mostly_empty"]);
  assert.equal(p.truncated, false);
  assert.equal(p.truncatedBy, null);
  assert.deepEqual(p.anomalies, [{ column: "score", kind: "mixed_type" }, { column: "note", kind: "mostly_empty" }]);
});

test("CSV: BOM, CRLF, tırnaklı virgül/satır sonu/çift tırnak güvenle ayrıştırılır; sütun adında BOM kalmaz", async () => {
  const text = `\uFEFFa,b\r\n"x,y","line1\nline2"\r\n"he said ""hi""",2\r\n`;
  const p = await prof(text);
  assert.deepEqual(p.columns.map((c) => c.name), ["a", "b"]);
  assert.equal(p.rows, 2);
  assert.equal(p.raggedRows, 0);
  assert.equal(col(p, "a").unique, 2);
  assert.equal(col(p, "b").type, "mixed");
});

test("TSV, sütun sayısı uyuşmayan satırlar, boş satırlar ve yinelenen adlar", async () => {
  const p = await prof("k\tv\tk\n1\t2\t3\n\n4\t5\n6\t7\t8\t9\n", "tsv");
  assert.deepEqual(p.columns.map((c) => c.name), ["k", "v", "k (2)"]);
  assert.equal(p.rows, 3);
  assert.equal(p.raggedRows, 2);
  assert.equal(p.blankLines, 1);
  assert.equal(col(p, "k (2)").emptyCount, 1, "kısa satırın eksik alanı boş sayılır");
});

test("yinelenen satır sayısı; tek geçişte tamamı", async () => {
  const p = await prof("a,b\n1,x\n2,y\n1,x\n1,x\n");
  assert.equal(p.rows, 4);
  assert.equal(p.duplicateRows, 2);
});

test("anomali işaretleri: aşırı boş, tek değerli, karışık tür; eşikler çıktıda görünür", async () => {
  const rows = ["a,b,c,d"];
  for (let i = 0; i < 10; i++) rows.push(`${i},same,${i % 2 === 0 ? "" : "v"},${i < 5 ? "n" + i : i}`);
  const p = await prof(rows.join("\n"));
  assert.deepEqual(col(p, "b").flags, ["constant"]);
  assert.ok(col(p, "c").emptyRatio === 0.5 && !col(p, "c").flags.includes("mostly_empty"), "eşik altı");
  assert.deepEqual(col(p, "d").flags, ["mixed_type"]);
  assert.deepEqual(col(p, "a").flags, []);
  const sparse = await prof(["x,y", "1,", "2,", "3,", "4,", "5,k"].join("\n"));
  assert.deepEqual(col(sparse, "y").flags, ["mostly_empty"], "boş oranı 0,8 ve üstü");
  assert.equal(p.limits.mostlyEmptyRatio, 0.8);
  assert.equal(p.limits.maxRows, 200_000);
  assert.equal(p.limits.maxDistinct, 1000);
});

test("tek satırlık sütun 'tek değerli' sayılmaz (örnek küçük)", async () => {
  const p = await prof("a\nonly\n");
  assert.deepEqual(col(p, "a").flags, []);
});

test("JSON dizi: nesne satırları, eksik anahtarlar boş, iç içe değerler metin, nesne olmayan öğeler badRows", async () => {
  const text = JSON.stringify([{ id: 1, tag: "a" }, { id: 2, extra: { n: 1 } }, 7, null, { id: "3" }]);
  const p = await prof(text, "json");
  assert.equal(p.rows, 3);
  assert.equal(p.badRows, 2);
  assert.deepEqual(p.columns.map((c) => c.name), ["id", "tag", "extra"]);
  const id = col(p, "id");
  assert.equal(id.type, "mixed", "JSON türü korunur: 3 tırnaklı olduğu için metin");
  assert.equal(col(p, "tag").emptyCount, 2);
  assert.equal(col(p, "extra").emptyCount, 2, "önceki satırlarda yoktu");
  assert.equal(col(p, "extra").type, "text");
});

test("JSON biçimi hataları: dizi değil, bozuk JSON, bitmemiş derin iç içelik → bad_format (iç ayrıntı yok)", async () => {
  for (const bad of ['{"a":1}', "{bozuk", "", "[".repeat(200000)]) {
    await assert.rejects(() => prof(bad, "json"), (e: unknown) => e instanceof DataProfileError && e.code === "bad_format" && !/bozuk|stack|at /.test(e.message));
  }
});

test("NDJSON: boş satır atlanır, bozuk satır ve nesne olmayan satır badRows", async () => {
  const p = await prof('{"a":1,"b":"x"}\n\n{"a":2}\nbozuk\n[1]\n{"a":3,"b":"x"}\n', "ndjson");
  assert.equal(p.rows, 3);
  assert.equal(p.badRows, 2);
  assert.equal(p.blankLines, 1);
  assert.equal(col(p, "b").emptyCount, 1);
  assert.equal(col(p, "a").type, "number");
});

test("sütun sınırı: 250 sütun → 200 tutulur, fazlası ignoredColumns olarak sayılır", async () => {
  const header = Array.from({ length: 250 }, (_, i) => `c${i}`).join(",");
  const p = await prof(`${header}\n${Array.from({ length: 250 }, (_, i) => i).join(",")}\n`);
  assert.equal(p.columnCount, MAX_COLUMNS);
  assert.equal(p.ignoredColumns, 50);
  const obj: Record<string, number> = {};
  for (let i = 0; i < 250; i++) obj[`k${i}`] = i;
  const j = await prof(JSON.stringify([obj]), "json");
  assert.equal(j.columnCount, MAX_COLUMNS);
  assert.equal(j.ignoredColumns, 50);
});

test("200 bin satır sınırı: kesildi bayrağı ve okunan satır sayısı; tam sınırda kesilmez", async () => {
  const body = "a\n".repeat(MAX_ROWS + 1);
  const cut = await prof(`n\n${body}`);
  assert.equal(cut.rows, MAX_ROWS);
  assert.equal(cut.truncated, true);
  assert.equal(cut.truncatedBy, "rows");
  const exact = await prof(`n\n${"a\n".repeat(MAX_ROWS)}`);
  assert.equal(exact.rows, MAX_ROWS);
  assert.equal(exact.truncated, false);
  const small = await prof("n\n1\n2\n3\n4\n", "csv", { maxRows: 2 });
  assert.deepEqual({ rows: small.rows, truncated: small.truncated }, { rows: 2, truncated: true });
  const nd = await prof("{\"a\":1}\n{\"a\":2}\n{\"a\":3}\n", "ndjson", { maxRows: 2 });
  assert.deepEqual({ rows: nd.rows, truncated: nd.truncated }, { rows: 2, truncated: true });
  const js = await prof("[{\"a\":1},{\"a\":2},{\"a\":3}]", "json", { maxRows: 2 });
  assert.deepEqual({ rows: js.rows, truncated: js.truncated }, { rows: 2, truncated: true });
});

test("süre bütçesi: aşılırsa kesildi (truncatedBy=time), sonuç yine dürüst", async () => {
  const p = await prof(`n\n${"a\n".repeat(50000)}`, "csv", { budgetMs: -1 });
  assert.equal(p.truncated, true);
  assert.equal(p.truncatedBy, "time");
  assert.ok(p.rows >= 1000 && p.rows < 50000);
});

test("benzersiz sayacı sınırlı: 1500 farklı değerde 1000'de durur ve 'uniqueCapped' işaretlenir; sınırlı bellek", async () => {
  const p = await prof(`v\n${Array.from({ length: 1500 }, (_, i) => `val${i}`).join("\n")}\n`);
  assert.equal(col(p, "v").unique, MAX_DISTINCT);
  assert.equal(col(p, "v").uniqueCapped, true);
  assert.deepEqual(col(p, "v").flags, [], "sınırlandığı için 'tek değerli' ya da başka işaret üretilmez");
});

test("HAM VERİ DÖNMEZ: gizli işaretçi hücre ve diğer değerler hiçbir biçimde çıktıda yok (CSV, TSV, JSON, NDJSON)", async () => {
  const csv = `id,label\n1,${MARKER}\n2,other-value-123\n`;
  const outs = [
    await prof(csv),
    await prof(csv.replace(/,/g, "\t"), "tsv"),
    await prof(JSON.stringify([{ id: 1, label: MARKER }, { id: 2, label: "other-value-123" }]), "json"),
    await prof(`{"id":1,"label":"${MARKER}"}\n{"id":2,"label":"other-value-123"}\n`, "ndjson"),
  ];
  for (const o of outs) {
    const s = JSON.stringify(o);
    assert.ok(!s.includes(MARKER), "işaretçi çıktıda");
    assert.ok(!s.includes("other-value-123"));
    assert.ok(!/MARKER/.test(s));
    assert.equal(o.rows, 2);
  }
});

test("duyarlılık: sır kalıplı hücre ve duyarlı sütun adı yalnız SAYI ile raporlanır, değer sızmaz", async () => {
  const secret = "sk-abcdefghijklmnopqrstuvwx";
  const text = [`id,password,note,token=abc123456789012`, `1,1234,hello there,5`, `2,9876,${secret},6`, `3,5555,fine,7`].join("\n");
  const p = await prof(text);
  const s = JSON.stringify(p);
  assert.ok(!s.includes(secret));
  assert.ok(!s.includes("abc123456789012"), "sütun adındaki sır maskelenir");
  assert.ok(!s.includes("9876") && !s.includes("5555"), "parola sütununun değerleri çıktıda yok");
  assert.equal(p.sensitive.warning, true);
  assert.equal(p.sensitive.cells, 1);
  const pw = col(p, "password");
  assert.equal(pw.sensitive, true);
  const note = col(p, "note");
  assert.equal(note.sensitive, true);
  assert.ok(p.sensitive.columns >= 3, "password, note ve token sütunu");
  const tokenCol = p.columns.find((c) => c.index === 3);
  assert.ok(tokenCol && tokenCol.name === "[gizli ad 4]" && tokenCol.sensitive, "sır içeren sütun adı gizlenir");
  const idc = col(p, "id");
  assert.equal(idc.sensitive, false);
});

test("duyarlılık: kodlanmış yüksek entropili uzun dizgi de duyarlı sayılır; düz metin sayılmaz; yanlış pozitif parçalar hücre düzeyinde elenir", async () => {
  const blob = "aB3dE5fG7hJ9kL1mN3pQ5rS7tU9vW1xY3zA5bC7dE9";
  const p = await prof(`a,b\nplain text here,${blob}\nmore words,ordinary\n`);
  assert.equal(p.sensitive.cells, 1);
  assert.equal(col(p, "b").sensitive, true);
  assert.equal(col(p, "a").sensitive, false);
  const q = await prof(`a\n${Array.from({ length: 5000 }, (_, i) => `ordinary value number ${i}`).join("\n")}\n`);
  assert.equal(q.sensitive.warning, false);
  assert.equal(q.sensitive.cells, 0);
});

test("regex bombası ve patolojik girdiler hızlı biter: uzun sayı dizisi, çok sayıda tırnak, kapanmamış tırnak, çok uzun hücre", async () => {
  const t0 = performance.now();
  const evil = [
    `v\n${"1".repeat(300000)}x\n`,
    `v\n"${'a""'.repeat(200000)}"\n`,
    `v\n"never closed ${"z".repeat(500000)}`,
    `v\n${"a".repeat(2_000_000)}\n`,
    `v\n${"-".repeat(100000)}1e${"9".repeat(100000)}\n`,
    `v\n${"password=".repeat(50000)}\n`,
  ];
  for (const e of evil) {
    const p = await prof(e);
    assert.equal(p.rows, 1);
  }
  assert.ok(performance.now() - t0 < 5000, `çok yavaş: ${performance.now() - t0} ms`);
  const unterminated = new CsvReader('a\n"open', ",");
  unterminated.next();
  unterminated.next();
  assert.equal(unterminated.unterminatedQuotes, 1);
});

test("boş girdi ve yalnız başlık: satır yok, çökmez", async () => {
  const empty = await prof("");
  assert.deepEqual({ rows: empty.rows, columnCount: empty.columnCount }, { rows: 0, columnCount: 0 });
  const header = await prof("a,b\n");
  assert.deepEqual({ rows: header.rows, columnCount: header.columnCount }, { rows: 0, columnCount: 2 });
  assert.equal(col(header, "a").type, "empty");
  assert.equal(col(header, "a").emptyRatio, 0);
  assert.deepEqual(col(header, "a").flags, []);
  const none = await prof("[]", "json");
  assert.equal(none.rows, 0);
});

// ---- yol politikası ve dosya okuma ------------------------------------------------------------------------------------------------
test("yol denetimi: izinli klasördeki desteklenen dosya kabul; trustedRepos de izinli; sensitiveDirs 'sensitive' sınıfı", () => {
  const { root, policy, other } = workspace();
  assert.deepEqual(checkProfilePath(join(root, "d.csv"), policy), { format: "csv", pathClass: "internal" });
  assert.equal(checkProfilePath(join(root, "sub", "d.TSV"), policy).format, "tsv");
  assert.equal(checkProfilePath(join(root, "d.json"), policy).format, "json");
  assert.equal(checkProfilePath(join(root, "d.ndjson"), policy).format, "ndjson");
  assert.equal(checkProfilePath(join(root, "d.jsonl"), policy).format, "ndjson");
  assert.equal(checkProfilePath(join(root, "private", "d.csv"), policy).pathClass, "sensitive");
  const trusted = { ...policy, allowedDirs: [], trustedRepos: [other] };
  assert.equal(checkProfilePath(join(other, "x.csv"), trusted).format, "csv");
  assert.throws(() => checkProfilePath(join(root, "x.csv"), trusted), (e) => e instanceof DataProfileError && e.code === "outside_policy");
});

test("yol denetimi: izinli klasör dışı, yasak klasör, sır dosyası adları, göreli/'..'/':'/NUL/uzun yol ve desteklenmeyen tür reddedilir; ileti yolu yankılamaz", () => {
  const { root, policy, other } = workspace();
  const code = (p: unknown): string => {
    try {
      checkProfilePath(p, policy);
      return "ok";
    } catch (e) {
      assert.ok(e instanceof DataProfileError);
      assert.doesNotMatch(e.message, /agentmom-dp|keys|private|\.env/, "ileti yol ya da ad sızdırmaz");
      return e.code;
    }
  };
  assert.equal(code(join(other, "x.csv")), "outside_policy");
  assert.equal(code(`${root}/../x.csv`), "bad_path");
  assert.equal(code(join(root, "keys", "x.csv")), "secret_path");
  assert.equal(code(join(root, "keys")), "unsupported_type");
  for (const name of [".env.csv", ".env", "id_rsa.csv", "secrets.csv", "secret.json", "credentials.json", "server.key.csv".replace(".csv", ""), "x.pem"]) {
    const c = code(join(root, name));
    assert.ok(c === "secret_path" || c === "unsupported_type", `${name}: ${c}`);
  }
  assert.equal(code(join(root, ".env.csv")), "secret_path");
  assert.equal(code(join(root, "id_rsa.csv")), "secret_path");
  assert.equal(code(join(root, "credentials.json")), "secret_path");
  assert.equal(code("relative/x.csv"), "bad_path");
  assert.equal(code("x.csv"), "bad_path");
  assert.equal(code(""), "bad_path");
  assert.equal(code(null), "bad_path");
  assert.equal(code(5), "bad_path");
  assert.equal(code(`${join(root, "x.csv")}:stream`), "bad_path");
  assert.equal(code(`${join(root, "x.csv")}\u0000.json`), "bad_path");
  assert.equal(code(`${join(root, "x")}\n.csv`), "bad_path");
  assert.equal(code(`${root}${"/a".repeat(300)}.csv`), "bad_path");
  assert.equal(code(join(root, "x.exe")), "unsupported_type");
  assert.equal(code(join(root, "x.txt")), "unsupported_type");
  assert.equal(code(join(root, "noext")), "unsupported_type");
});

test("profileFile: gerçek dosya (CSV, JSON, NDJSON) profili; ham değer sızmaz; klasöre hiçbir şey yazılmaz", async () => {
  const { root, policy } = workspace();
  writeFileSync(join(root, "a.csv"), `id,label\n1,${MARKER}\n2,x\n`);
  writeFileSync(join(root, "b.json"), JSON.stringify([{ id: 1, label: MARKER }]));
  writeFileSync(join(root, "c.ndjson"), `{"id":1,"label":"${MARKER}"}\n`);
  const snap = (): string[] => readdirSync(root).sort().map((n) => `${n}|${statSync(join(root, n)).size}|${statSync(join(root, n)).mtimeMs}`);
  const before = snap();
  for (const f of ["a.csv", "b.json", "c.ndjson"]) {
    const p = await profileFile(join(root, f), policy);
    assert.ok(p.rows >= 1);
    assert.ok(!JSON.stringify(p).includes(MARKER), f);
    assert.equal(p.bytes, statSync(join(root, f)).size);
  }
  assert.deepEqual(snap(), before);
});

test("profileFile: 8 MB sınırı (tam sınır kabul, bir bayt fazlası reddedilir), olmayan dosya, klasör", async () => {
  const { root, policy } = workspace();
  const line = "a\n";
  writeFileSync(join(root, "exact.csv"), line.repeat(MAX_PROFILE_BYTES / 2));
  const ok = await profileFile(join(root, "exact.csv"), policy);
  assert.equal(ok.bytes, MAX_PROFILE_BYTES);
  assert.equal(ok.truncated, true, "satır sınırı nedeniyle kesildi");
  writeFileSync(join(root, "big.csv"), `${line.repeat(MAX_PROFILE_BYTES / 2)}b`);
  await assert.rejects(() => profileFile(join(root, "big.csv"), policy), (e: unknown) => e instanceof DataProfileError && e.code === "too_large");
  await assert.rejects(() => profileFile(join(root, "yok.csv"), policy), (e: unknown) => e instanceof DataProfileError && e.code === "missing");
  mkdirSync(join(root, "dir.csv"));
  await assert.rejects(() => profileFile(join(root, "dir.csv"), policy), (e: unknown) => e instanceof DataProfileError && ["unreadable", "missing"].includes(e.code));
});

test("profileFile: izinli klasör içinde sembolik bağ/kavşak ile dışarıya çıkış reddedilir", async (t) => {
  const { root, policy, other } = workspace();
  writeFileSync(join(other, "out.csv"), "a\n1\n");
  try {
    symlinkSync(other, join(root, "link"), "junction");
  } catch {
    t.skip("kavşak oluşturulamadı");
    return;
  }
  await assert.rejects(() => profileFile(join(root, "link", "out.csv"), policy), (e: unknown) => e instanceof DataProfileError && e.code === "outside_policy");
  try {
    symlinkSync(join(other, "out.csv"), join(root, "f.csv"), "file");
  } catch {
    return;
  }
  await assert.rejects(() => profileFile(join(root, "f.csv"), policy), (e: unknown) => e instanceof DataProfileError && ["outside_policy", "unreadable"].includes(e.code));
});

test("kaynak: ağ, süreç ve yazma modülü yok", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(join(import.meta.dirname, "data-profile.ts"), "utf8");
  for (const banned of [/node:http/, /node:https/, /node:net\b/, /node:child_process/, /\bfetch\s*\(/, /writeFile|appendFile|unlink|rmSync|mkdirSync|renameSync|createWriteStream/]) assert.doesNotMatch(src, banned, String(banned));
});

// ---- denetim düzeltmeleri ------------------------------------------------------------------------------------------------------------
test("geçerli derin iç içe JSON: çökmez ve takılmaz (dizi içinde dizi: nesne olmayan satır; derin nesne: ya profil ya bad_format)", async () => {
  const deepArr = `${"[".repeat(50000)}${"]".repeat(50000)}`;
  const t0 = performance.now();
  try {
    const p = await prof(`[${deepArr}]`, "json");
    assert.equal(p.rows, 0);
    assert.equal(p.badRows, 1);
  } catch (e) {
    assert.ok(e instanceof DataProfileError && e.code === "bad_format");
  }
  const deepObj = `${'{"a":'.repeat(20000)}1${"}".repeat(20000)}`;
  try {
    const p = await prof(`[${deepObj}]`, "json");
    assert.equal(p.rows, 1);
    assert.equal(p.columnCount, 1);
  } catch (e) {
    assert.ok(e instanceof DataProfileError && e.code === "bad_format");
  }
  assert.ok(performance.now() - t0 < 5000);
});

test("UNC, aygıt yolları ('\\\\?\\', '\\\\.\\'), '//' ile başlayanlar ve aygıt adları dosya sistemine DOKUNMADAN reddedilir (<100 ms)", () => {
  const { policy } = workspace();
  const t0 = performance.now();
  for (const p of ["\\\\192.0.2.1\\share\\a.csv", "//192.0.2.1/share/a.csv", "\\\\?\\C:\\data\\a.csv", "\\\\.\\PhysicalDrive0\\a.csv", "\\\\?\\UNC\\192.0.2.1\\s\\a.csv", "//?/C:/a.csv"]) {
    assert.throws(() => checkProfilePath(p, policy), (e: unknown) => e instanceof DataProfileError && e.code === "bad_path", p);
  }
  for (const name of ["NUL.csv", "con.csv", "AUX.json", "COM1.csv", "lpt3.tsv", "PRN.ndjson", "nul.x.csv"]) {
    assert.throws(() => checkProfilePath(join(policy.allowedDirs[0] as string, name), policy), (e: unknown) => e instanceof DataProfileError && e.code === "bad_path", name);
  }
  assert.ok(performance.now() - t0 < 100, `çok yavaş: ${performance.now() - t0} ms`);
});

test("izinli klasör dışı yol realpath'ten ÖNCE sözcüksel olarak reddedilir (olmayan sürücü/dizin bile hızlı)", () => {
  const { policy } = workspace();
  const t0 = performance.now();
  for (const p of ["Z:\\yok\\a.csv", "Z:/yok/a.csv", "/yok/yok/a.csv"]) assert.throws(() => checkProfilePath(p, policy), (e: unknown) => e instanceof DataProfileError && ["outside_policy", "bad_path"].includes(e.code), p);
  assert.ok(performance.now() - t0 < 100);
});

test("anahtar klasörü ve D:\\Arşiv koda gömülü reddedilir (sözleşmede forbiddenDirs boş olsa bile)", () => {
  const root = mkTmp("agentmom-dp-keys-");
  const open = { allowedDirs: [root], trustedRepos: [], forbiddenDirs: [] as string[], sensitiveDirs: [] as string[] };
  for (const rel of ["anahtarlar/k.csv", "HAFIZAM1/ANAHTARLAR/k.csv", "x/anahtarlar/y/k.json"]) {
    assert.throws(() => checkProfilePath(join(root, rel), open), (e: unknown) => e instanceof DataProfileError && e.code === "secret_path", rel);
  }
  const arch = { allowedDirs: ["D:\\"], trustedRepos: [], forbiddenDirs: [] as string[] };
  for (const p of ["D:\\Arşiv\\a.csv", "d:\\ARŞİV\\x\\a.csv", "D:/Arsiv/a.csv"]) {
    assert.throws(() => checkProfilePath(p, arch), (e: unknown) => e instanceof DataProfileError && e.code === "secret_path", p);
  }
  assert.equal(realLocationProblem("D:\\Arşiv\\a.csv", arch), "secret_path");
  assert.equal(realLocationProblem(join(root, "ok.csv"), open), null);
});

test("TOCTOU: dosya açıldıktan sonra gerçek yol yeniden denetlenir; kavşakla değiştirilmiş yol okunmaz", async (t) => {
  const { root, other } = workspace();
  const allowed = join(root, "allowed");
  mkdirSync(allowed, { recursive: true });
  writeFileSync(join(other, "s.csv"), `ssn_like,x\n1,2\n${MARKER},3\n`);
  writeFileSync(join(allowed, "ok.csv"), "a\n1\n");
  const policy = { allowedDirs: [allowed], trustedRepos: [] as string[], forbiddenDirs: [] as string[] };
  // 1) Politika denetimi geçen yol...
  assert.equal(checkProfilePath(join(allowed, "ok.csv"), policy).format, "csv");
  // 2) ...okumadan önce dizin bir kavşakla dışarıya bağlanır (denetim ile açma arasındaki takas).
  const swapped = join(allowed, "swap");
  try {
    symlinkSync(other, swapped, "junction");
  } catch (e) {
    t.skip(`kavşak oluşturulamadı (${(e as Error).message}); TOCTOU senaryosu bu ortamda sınanamadı`);
    return;
  }
  const verify = (real: string): boolean => realLocationProblem(real, policy) === null;
  const unchecked = readFileInside(swapped, "s.csv", 1 << 20);
  assert.equal(unchecked.ok, true, "doğrulayıcı olmadan kavşak üst dizini okuma katmanında geçer (açığın kendisi)");
  const checked = readFileInside(swapped, "s.csv", 1 << 20, verify);
  assert.deepEqual(checked.ok ? "okundu" : checked.reason, "outside", "yeniden denetim kavşaktan okunmayı reddeder");
  await assert.rejects(() => profileFile(join(swapped, "s.csv"), policy), (e: unknown) => e instanceof DataProfileError && e.code === "outside_policy");
  const real = readFileInside(allowed, "ok.csv", 1 << 20, verify);
  assert.equal(real.ok, true, "normal dosya doğrulayıcıdan geçer");
});

test("başlıksız CSV: ilk satır veri gibiyse sütun adı OLARAK dönmez ('sütun 1..N'), ilk satır veri sayılır, uyarı verilir", async () => {
  for (const first of ["ali@example.com,5551234567,42", "123456,987654,5", "+90 555 123 45 67,x,y", "1,2,hello"]) {
    const p = await prof(`${first}\nbob@example.com,5559999999,7\n`);
    assert.deepEqual(p.columns.map((c) => c.name), ["sütun 1", "sütun 2", "sütun 3"], first);
    assert.equal(p.rows, 2, "ilk satır veri sayıldı");
    assert.ok(p.notices.includes("header_as_data"));
    const s = JSON.stringify(p);
    assert.ok(!s.includes("ali@example.com") && !s.includes("5551234567") && !s.includes("123456") && !s.includes("hello"), first);
  }
  const normal = await prof("id,name\n1,ada\n");
  assert.deepEqual(normal.columns.map((c) => c.name), ["id", "name"]);
  assert.ok(!normal.notices.includes("header_as_data"));
});

test("sütun adı maskeleme: e-posta, telefon, yalnız rakam, 20+ karakter ve yüksek entropi (JSON/NDJSON anahtarları ve CSV başlığı)", async () => {
  const keys = ["ali@example.com", "+90 555 123 45 67", "20240101", "a_very_long_column_name_over_twenty", "q8Zr2LpX9vKd3Wm7", "normal"];
  const obj: Record<string, number> = {};
  keys.forEach((k, i) => { obj[k] = i; });
  for (const p of [await prof(JSON.stringify([obj]), "json"), await prof(`${JSON.stringify(obj)}\n`, "ndjson"), await prof(`${keys.join(",")}\nx,x,x,x,x,x\n`, "csv")]) {
    const s = JSON.stringify(p);
    for (const k of keys.slice(0, 5)) assert.ok(!s.includes(k), `ad sızdı: ${k}`);
    assert.ok(p.notices.includes("names_masked") || p.notices.includes("header_as_data"));
  }
  const j = await prof(JSON.stringify([obj]), "json");
  assert.deepEqual(j.columns.map((c) => c.name), ["[gizli ad 1]", "[gizli ad 2]", "[gizli ad 3]", "[gizli ad 4]", "[gizli ad 5]", "normal"]);
  assert.ok(j.columns.slice(0, 5).every((c) => c.sensitive));
});

test("not metni: 'hücre değeri yok; sütun adları kalıp taşıyorsa maskelenir'", async () => {
  const p = await prof("a\n1\n");
  assert.match(p.note, /Hücre değeri yok/);
  assert.match(p.note, /kalıp taşıyorsa/);
  assert.match(p.note, /maskelenir/);
});

test("virgül bombası: 8 MB'lık tek satırda en çok 201 alan saklanır; gerçek alan sayısı sayılır", async () => {
  const text = `${",".repeat(4 * 1024 * 1024)}\n${",".repeat(4 * 1024 * 1024 - 10)}`;
  const t0 = performance.now();
  const p = await prof(text);
  assert.ok(performance.now() - t0 < 4000);
  assert.equal(p.columnCount, MAX_COLUMNS);
  assert.equal(p.ignoredColumns, 4 * 1024 * 1024 + 1 - MAX_COLUMNS);
  assert.equal(p.rows, 1);
  assert.equal(p.raggedRows, 1);
  const rd = new CsvReader("a,b,c\n", ",");
  rd.next();
  assert.equal(rd.fieldCount, 3);
});

test("olay döngüsü: geniş ve kısa dosyada (999 satır x 200 sütun, ~7,8 MB, sır gibi hücreler) iş miktarına bağlı yield; en uzun blok ölçülür", async () => {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let v = 7;
  const rnd = (n: number): string => { let o = ""; for (let i = 0; i < n; i++) { v = (v * 1103515245 + 12345) & 0x7fffffff; o += A[v % A.length]; } return o; };
  const rows = [Array.from({ length: 200 }, (_, i) => `c${i}`).join(",")];
  for (let r = 0; r < 999; r++) rows.push(Array.from({ length: 200 }, () => rnd(40)).join(","));
  const text = rows.join("\n");
  let maxGap = 0;
  let last = performance.now();
  const iv = setInterval(() => { const n = performance.now(); maxGap = Math.max(maxGap, n - last); last = n; }, 1);
  const p = await prof(text);
  clearInterval(iv);
  maxGap = Math.max(maxGap, performance.now() - last);
  console.log(`# ölçüm: ${(text.length / 1048576).toFixed(2)} MB, en uzun olay döngüsü bloğu ${Math.round(maxGap)} ms`);
  assert.equal(p.rows, 999);
  assert.ok(maxGap < 400, `olay döngüsü ${Math.round(maxGap)} ms bloklandı`);
});
