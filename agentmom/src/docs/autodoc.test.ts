// Otomatik dokümantasyon testleri: saf işlevler + üretici betik (scripts/dokuman-uret.mjs). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Betik testleri geçici bir sahte depo kökü (--kok) kullanır; ayrıca gerçek depodaki docs/status/otomatik-dokuman.md'nin güncel olduğunu doğrular.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { buildDocument, checklistCounts, describeFile, extractRoutes, firstSentence, GENERATED_HEADER, leadingComment, migrationList, moduleMap, regexToPath, routeTable } from "./autodoc.ts";

const REPO = resolve(import.meta.dirname, "..", "..");
const SCRIPT = join(REPO, "scripts", "dokuman-uret.mjs");

function runScript(args: string[]): { status: number | null; out: string; err: string } {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", SCRIPT, ...args], { cwd: REPO, encoding: "utf8" });
  return { status: r.status, out: r.stdout, err: r.stderr };
}

test("leadingComment / firstSentence / describeFile: // blocks, /* */, <!-- -->, -- SQL, shebang; the first sentence only; fallbacks", () => {
  assert.equal(leadingComment("// Birinci cümle. İkinci cümle.\n// devam\nimport x from 'y';"), "Birinci cümle. İkinci cümle. devam");
  assert.equal(leadingComment("#!/usr/bin/env node\n// Betik açıklaması. Sahip: X.\ncode();"), "Betik açıklaması. Sahip: X.");
  assert.equal(leadingComment("/*\n * Blok açıklaması burada.\n * Devamı.\n */\nconst a = 1;"), "Blok açıklaması burada. Devamı.");
  assert.equal(leadingComment("<!-- HTML açıklaması. -->\n<p>x</p>"), "HTML açıklaması.");
  assert.equal(leadingComment("-- SQL başlığı (Faz 5b). Ayrıntı.\nCREATE TABLE a (id TEXT);"), "SQL başlığı (Faz 5b). Ayrıntı.");
  assert.equal(leadingComment("import x from 'y';\n// sonradan yorum"), "");
  assert.equal(firstSentence("AgentMom operational memory (Faz 5b). Owner: Claude [IP:AgentMom Faz 5]; yalnız yazan."), "AgentMom operational memory (Faz 5b).");
  assert.equal(firstSentence("Nokta yok satır sonu"), "Nokta yok satır sonu");
  assert.equal(firstSentence("a".repeat(300)).length, 200);
  assert.equal(describeFile("src/a.ts", "// Dosya açıklaması. Fazlası.\n"), "Dosya açıklaması.");
  assert.equal(describeFile("src/a.ts", "const a = 1;\n"), "(açıklama yok)");
  assert.equal(describeFile("src/a.png", null), "(ikili ya da okunmayan dosya)");
  assert.equal(describeFile("src/a.ts", "// Satır\r\n// sonu.\r\ncode"), "Satır sonu.");
});

test("moduleMap: every folder and file, sorted by code point (not locale), pipes escaped, binary marked", () => {
  const md = moduleMap([
    { path: "src/z/b.ts", content: "// B | borulu. Fazlası.\n" },
    { path: "src/a.ts", content: "// A dosyası.\n" },
    { path: "src/z/a.png", content: null },
    { path: "src/Z/c.ts", content: "const x = 1;\n" },
  ]);
  assert.match(md, /^## Modül haritası\n\nsrc altında 4 dosya, 3 klasör\./);
  assert.ok(md.indexOf("### src/") < md.indexOf("### src/Z/") && md.indexOf("### src/Z/") < md.indexOf("### src/z/"), "uppercase sorts before lowercase: locale independent");
  assert.match(md, /\| a\.ts \| A dosyası\. \|/);
  assert.match(md, /\| b\.ts \| B \\\| borulu\. \|/);
  assert.match(md, /\| a\.png \| \(ikili ya da okunmayan dosya\) \|/);
  assert.match(md, /\| c\.ts \| \(açıklama yok\) \|/);
});

const APP = [
  'if (method === "GET" && url.pathname === "/health") {',
  'const hm = /^\\/api\\/help\\/([a-z-]{1,24})$/.exec(url.pathname);',
  'if (method === "GET" && hm) {',
  'if (method === "POST" && (url.pathname === "/api/memory" || url.pathname === "/api/memory/export")) {',
  '// if (method === "GET" && url.pathname === "/api/yorum") yorum satırı sayılmaz',
  'const dm = /^\\/api\\/decisions\\/([0-9a-f-]{36})(?:\\/(retire))?$/.exec(url.pathname);',
  'if (method === "GET" && dm && !dm[2]) return 1;',
  'if (method === "POST" && dm && dm[2]) return 2;',
  'const prm = /^\\/api\\/providers\\/([^/]+)(?:\\/(test|disable|enable))?$/.exec(url.pathname);',
  'if (prm && (method === "GET" || method === "POST")) {',
  'const m = /^\\/api\\/tasks\\/([0-9a-f-]{36})\\/(approve|deny)$/.exec(url.pathname);',
  'if (m) {',
  'if (url.pathname === "/api/memory") {',
  'if (!url.pathname.startsWith("/api/")) throw 1;',
  'if (url.pathname === "/api/yalniz-yontemsiz") return 3;',
].join("\n");

test("extractRoutes: literals, startsWith, named regexes resolved through their method line, nested method-less duplicates dropped, unresolved listed instead of invented", () => {
  const scan = extractRoutes(APP);
  const keys = scan.routes.map((r) => `${r.method} ${r.path}`);
  assert.deepEqual(keys, [
    "* /api/*",
    "GET /api/decisions/:id[/retire]",
    "POST /api/decisions/:id[/retire]",
    "GET /api/help/:param",
    "POST /api/memory",
    "POST /api/memory/export",
    "GET /api/providers/:param[/test|disable|enable]",
    "POST /api/providers/:param[/test|disable|enable]",
    "* /api/yalniz-yontemsiz",
    "GET /health",
  ]);
  assert.deepEqual(scan.unresolved, ["/api/tasks/:id/{approve|deny} (düzenli ifade; yöntem satırda belirlenemedi)"]);
  const table = routeTable(APP);
  assert.match(table, /\| GET \| \/health \|/);
  assert.match(table, /### Çözümlenemedi\n\n- \/api\/tasks\/:id\/\{approve\|deny\}/);
  assert.equal(routeTable("const x = 1;\n").includes("- (yok)"), true);
});

test("regexToPath turns groups into :id / :param / {a|b} / [/x]", () => {
  assert.equal(regexToPath("/^\\/api\\/a\\/([0-9a-f-]{36})\\/gate$/"), "/api/a/:id/gate");
  assert.equal(regexToPath("/^\\/api\\/p\\/([^/]+)$/"), "/api/p/:param");
  assert.equal(regexToPath("/^\\/api\\/s\\/(rename|pin|archive)$/"), "/api/s/{rename|pin|archive}");
  assert.equal(regexToPath("/^\\/api\\/d\\/([0-9a-f-]{36})(?:\\/(retire))?$/"), "/api/d/:id[/retire]");
});

test("migrationList: forward migrations only (no .down.sql), name + title; checklistCounts recounts items and flags a mismatching summary", () => {
  const md = migrationList([
    { path: "src/core/db/migrations/002_b.sql", content: "-- İkinci tablo (Faz 6). Ayrıntı.\nCREATE TABLE b(id);" },
    { path: "src/core/db/migrations/001_a.sql", content: "-- Birinci tablo.\nCREATE TABLE a(id);" },
    { path: "src/core/db/migrations/001_a.down.sql", content: "-- Geri alma.\nDROP TABLE a;" },
    { path: "src/other/003_c.sql", content: "-- Başka klasör\n" },
  ].map((f) => f));
  assert.match(md, /2 ileri migrasyon/);
  assert.ok(md.indexOf("001_a.sql") < md.indexOf("002_b.sql"));
  assert.doesNotMatch(md, /down/);
  assert.match(md, /\| 001_a\.sql \| Birinci tablo\. \|/);
  const json = JSON.stringify({ summary: { total: 5 }, items: [{ durum: "Doğrulandı" }, { durum: "Kısmi" }, { durum: "Kısmi" }, { durum: "Planlı" }, { durum: "Başka" }] });
  const c = checklistCounts(json);
  assert.match(c, /\| Doğrulandı \| 1 \|/);
  assert.match(c, /\| Kısmi \| 2 \|/);
  assert.match(c, /\| Tanımsız durum \| 1 \|/);
  assert.match(c, /\| Toplam \| 5 \|/);
  assert.doesNotMatch(c, /Uyarı/);
  assert.match(checklistCounts(JSON.stringify({ summary: { total: 9 }, items: [] })), /Uyarı: özet toplamı \(9\)/);
  assert.match(checklistCounts(null), /okunamadı/);
  assert.match(checklistCounts("{bozuk"), /geçerli JSON değil/);
});

test("buildDocument: generated-file header, no dates, LF only, deterministic for the same input regardless of input order", () => {
  const files = [
    { path: "src/b.ts", content: "// B modülü.\r\nconst b = 1;\r\n" },
    { path: "src/a.ts", content: "// A modülü.\n" },
    { path: "src/core/db/migrations/001_a.sql", content: "-- Tablo.\n" },
  ];
  const input = { srcFiles: files, appSource: APP, checklistJson: null };
  const doc = buildDocument(input);
  assert.equal(doc, buildDocument({ ...input, srcFiles: [...files].reverse() }));
  assert.ok(doc.startsWith(GENERATED_HEADER));
  assert.match(doc, /ÜRETİLMİŞ DOSYA: scripts\/dokuman-uret\.mjs; elle değiştirmeyin; sahibi Claude \[İP:AgentMom Faz 11\]/);
  assert.doesNotMatch(doc, /\r/);
  assert.doesNotMatch(doc, /\b20\d\d-\d\d-\d\d\b|\d\d:\d\d:\d\d/, "no date or time stamps");
  assert.ok(doc.endsWith("\n") && !doc.endsWith("\n\n"));
  assert.match(buildDocument({ ...input, appSource: null }), /Kaynak okunamadı/);
});

function fixture(): string {
  const root = mkTmp("agentmom-autodoc-");
  for (const d of ["src/server", "src/core/db/migrations", "docs/status"]) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, "src/a.ts"), "// A modülü. Ayrıntı.\nexport const a = 1;\n");
  writeFileSync(join(root, "src/server/app.ts"), 'if (method === "GET" && url.pathname === "/health") {}\n');
  writeFileSync(join(root, "src/core/db/migrations/001_x.sql"), "-- X tablosu.\nCREATE TABLE x(id);\n");
  writeFileSync(join(root, "docs/status/100-yetenek-durum.json"), JSON.stringify({ summary: { total: 1 }, items: [{ durum: "Planlı" }] }));
  return root;
}
function tree(root: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(p.slice(root.length));
    }
  };
  walk(root);
  return out.sort();
}

test("script on a throwaway tree: writes exactly one file, is byte-identical on a second run, --dogrula passes, then fails (exit 1) when a source or the document changes or is missing", () => {
  const root = fixture();
  const before = tree(root);
  const out = join(root, "docs/status/otomatik-dokuman.md");
  assert.equal(runScript(["--dogrula", "--kok", root]).status, 1, "no document yet");
  const r1 = runScript(["--kok", root]);
  assert.equal(r1.status, 0, r1.err);
  assert.deepEqual(tree(root).filter((p) => !before.includes(p)), ["\\docs\\status\\otomatik-dokuman.md"], "only the one output file is created");
  const first = readFileSync(out);
  assert.equal(runScript(["--kok", root]).status, 0);
  assert.ok(first.equals(readFileSync(out)), "same input, same bytes");
  assert.match(first.toString("utf8"), /\| GET \| \/health \|/);
  assert.match(first.toString("utf8"), /\| 001_x\.sql \| X tablosu\. \|/);
  assert.equal(runScript(["--dogrula", "--kok", root]).status, 0);
  // a changed source makes the document stale
  writeFileSync(join(root, "src/b.ts"), "// Yeni dosya.\n");
  const stale = runScript(["--dogrula", "--kok", root]);
  assert.equal(stale.status, 1);
  assert.match(stale.err, /BAYAT/);
  assert.equal(runScript(["--kok", root]).status, 0);
  assert.equal(runScript(["--dogrula", "--kok", root]).status, 0);
  // a hand-edited document is detected too
  writeFileSync(out, readFileSync(out, "utf8") + "elle eklenen satır\n");
  assert.equal(runScript(["--dogrula", "--kok", root]).status, 1);
  // CRLF checkout of the same content still validates (line endings are normalised)
  assert.equal(runScript(["--kok", root]).status, 0);
  writeFileSync(out, readFileSync(out, "utf8").replace(/\n/g, "\r\n"));
  assert.equal(runScript(["--dogrula", "--kok", root]).status, 0);
});

test("script refuses unknown arguments and never creates directories", () => {
  assert.equal(runScript(["--bilinmeyen"]).status, 2);
  const empty = mkTmp("agentmom-autodoc-empty-");
  mkdirSync(join(empty, "src"));
  const r = runScript(["--kok", empty]);
  assert.equal(r.status, 2);
  assert.match(r.err, /klasör oluşturmaz/);
  assert.deepEqual(readdirSync(empty), ["src"]);
});

test("the repository's generated document is current (run: node scripts/dokuman-uret.mjs, then commit docs/status/otomatik-dokuman.md)", () => {
  const r = runScript(["--dogrula"]);
  assert.equal(r.status, 0, `${r.err}${r.out}`);
  const doc = readFileSync(join(REPO, "docs", "status", "otomatik-dokuman.md"), "utf8");
  assert.ok(doc.startsWith(GENERATED_HEADER));
  assert.match(doc, /## Modül haritası/);
  assert.match(doc, /\| GET \| \/api\/memory\/context \|/);
  assert.match(doc, /\| GET \| \/api\/decisions\/:id\/genealogy \|/);
});

test("describeFile masks a secret in a header comment before cutting", () => {
  assert.doesNotMatch(describeFile("src/a.ts", "// Anahtar sk-abcdefghijklmnopqrstuvwxyz1234 burada. Devam.\n"), /sk-abcdef/);
});

test("script refuses to write through a symlink or junction (docs/status or the output file)", () => {
  const root = fixture();
  const real = mkTmp("agentmom-autodoc-real-");
  mkdirSync(join(real, "status"));
  const docs = join(root, "docs");
  // docs/status becomes a junction to a directory elsewhere
  const statusDir = join(docs, "status");
  const moved = join(docs, "status-eski");
  renameSync(statusDir, moved);
  symlinkSync(join(real, "status"), statusDir, "junction");
  const r = runScript(["--kok", root]);
  assert.equal(r.status, 2, r.err);
  assert.match(r.err, /sembolik bağ|kavşak/);
  assert.deepEqual(readdirSync(join(real, "status")), [], "nothing was written through the link");
});
