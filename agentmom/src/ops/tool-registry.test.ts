// Güvenilir araç pazarı testleri (madde 32). Sahip: Claude [İP:AgentMom devam]. Ağ yok, araç çalıştırılmaz; geçici klasörler.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ToolError, approveTool, evaluateCatalog, evaluateTool, parseManifest, reviewPackage, revokeTool, TOOL_SCHEMA } from "./tool-registry.ts";

const REPO = resolve(import.meta.dirname, "..", "..");
const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const code = (c: string) => (e: unknown) => e instanceof ToolError && e.code === c;

function world() {
  const root = mkdtempSync(join(tmpdir(), "arac-"));
  const dirs = { repo: join(root, "repo"), state: join(root, "state"), trust: join(root, "trust"), tools: join(root, "tools") };
  for (const d of Object.values(dirs)) mkdirSync(d);
  const opts = { trustDir: dirs.trust, repoRoot: dirs.repo, stateDir: dirs.state };
  return { root, ...dirs, opts };
}
function makeTool(base: string, name: string, over: Record<string, unknown> = {}, files: Record<string, string> = { "run.mjs": "export const x = 1;\n", "lib/util.mjs": "export const y = 2;\n" }) {
  const dir = join(base, name);
  mkdirSync(dir, { recursive: true });
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(join(dir, p, ".."), { recursive: true });
    writeFileSync(join(dir, p), c);
  }
  const manifest = {
    schema: TOOL_SCHEMA, id: name, version: "1.0.0", title: "Deneme aracı", publisher: "Yusuf", permissions: ["read_workspace"], entry: "run.mjs",
    files: Object.entries(files).map(([path, c]) => ({ path, sha256: sha(c), bytes: Buffer.byteLength(c) })), ...over,
  };
  writeFileSync(join(dir, "tool.json"), JSON.stringify(manifest, null, 2));
  return dir;
}

test("güvenilir akış: incele -> onay yok -> onayla -> trusted; onay kaydı yeni dosya, paket bağlı", () => {
  const w = world();
  const dir = makeTool(w.tools, "okuyucu");
  const rev = reviewPackage(dir);
  assert.deepEqual(rev.problems, []);
  assert.equal(rev.risk, "low");
  assert.equal(evaluateTool(dir, w.opts).state, "not_approved");
  const { file, approval } = approveTool(dir, ["read_workspace"], { ...w.opts, now: () => new Date("2026-10-25T10:00:00Z") });
  assert.deepEqual(readdirSync(w.trust), ["onay-okuyucu@1.0.0.json"]);
  assert.equal(JSON.parse(readFileSync(file, "utf8")).digest, approval.digest);
  const ev = evaluateTool(dir, w.opts);
  assert.equal(ev.state, "trusted");
  assert.deepEqual(ev.granted, ["read_workspace"]);
  assert.throws(() => approveTool(dir, ["read_workspace"], w.opts), code("already_approved"), "onay kaydı ezilmez");
  assert.equal(JSON.parse(readFileSync(file, "utf8")).approvedAt, "2026-10-25T10:00:00.000Z", "ilk kayıt değişmedi");
});

test("tek bayt değişirse güven düşer: dosya içeriği, ek dosya, eksik dosya, manifest değişimi", () => {
  const w = world();
  const dir = makeTool(w.tools, "arac");
  approveTool(dir, ["read_workspace"], w.opts);
  assert.equal(evaluateTool(dir, w.opts).state, "trusted");
  writeFileSync(join(dir, "run.mjs"), "export const x = 2;\n");
  assert.equal(evaluateTool(dir, w.opts).state, "unverified", "içerik özetle uyuşmuyor");
  writeFileSync(join(dir, "run.mjs"), "export const x = 1;\n");
  assert.equal(evaluateTool(dir, w.opts).state, "trusted", "geri alınınca tekrar güvenilir");
  const gone = makeTool(w.tools, "eksik");
  unlinkSync(join(gone, "lib/util.mjs"));
  const miss = evaluateTool(gone, w.opts);
  assert.equal(miss.state, "unverified");
  assert.match(miss.reasons.join(), /listed file is missing: lib\/util\.mjs/);
  writeFileSync(join(dir, "ek.mjs"), "x");
  const ev = evaluateTool(dir, w.opts);
  assert.equal(ev.state, "unverified");
  assert.match(ev.reasons.join(), /not listed in tool\.json: ek\.mjs/);
  // dosya + manifest birlikte yeniden hesaplanmış sahte paket: aynı kimlik@sürüm, farklı özet -> changed
  const tampered = makeTool(w.tools, "arac3", { id: "arac" }, { "run.mjs": "export const x = 666;\n", "lib/util.mjs": "export const y = 2;\n" });
  assert.equal(evaluateTool(tampered, w.opts).state, "changed", "aynı kimlik@sürüm, farklı paket: özet uyuşmaz");
  const other = makeTool(w.tools, "arac4", { id: "baska" });
  assert.equal(evaluateTool(other, w.opts).state, "not_approved", "başka kimliğin onayı yok");
});

test("izin sınırı: istenmeyen izin onaylanamaz; yüksek risk açık onay ister; onaydan sonra istek artarsa permission_exceeded", () => {
  const w = world();
  const dir = makeTool(w.tools, "kabuk", { permissions: ["read_workspace", "run_process"] });
  assert.equal(reviewPackage(dir).risk, "high");
  assert.throws(() => approveTool(dir, ["network"], w.opts), code("invalid_grant"), "araç istemediği izin verilemez");
  assert.throws(() => approveTool(dir, ["read_workspace", "run_process"], w.opts), code("high_risk"));
  assert.deepEqual(readdirSync(w.trust), [], "reddedilen onay hiçbir şey yazmadı");
  approveTool(dir, ["read_workspace"], w.opts);
  const ev = evaluateTool(dir, w.opts);
  assert.equal(ev.state, "permission_exceeded", "araç run_process istiyor ama yalnız read_workspace onaylı");
  assert.deepEqual(ev.granted, ["read_workspace"]);
  const w2 = world();
  const d2 = makeTool(w2.tools, "kabuk", { permissions: ["run_process"] });
  approveTool(d2, ["run_process"], { ...w2.opts, acceptHighRisk: true });
  assert.equal(evaluateTool(d2, w2.opts).state, "trusted");
});

test("iptal: kayıt eklenir (silme yok), sürüm bazlı; ikinci iptal ve onay olmayan sürüm", () => {
  const w = world();
  const dir = makeTool(w.tools, "arac");
  approveTool(dir, ["read_workspace"], w.opts);
  revokeTool("arac", "1.0.0", w.opts);
  assert.deepEqual(readdirSync(w.trust).sort(), ["iptal-arac@1.0.0.json", "onay-arac@1.0.0.json"], "onay kaydı yerinde");
  assert.equal(evaluateTool(dir, w.opts).state, "revoked");
  assert.throws(() => revokeTool("arac", "1.0.0", w.opts), code("already_revoked"));
  assert.throws(() => revokeTool("Arac", "1.0", w.opts), code("invalid_input"));
  const v2 = makeTool(w.tools, "arac-v2", { id: "arac", version: "1.1.0" });
  assert.equal(evaluateTool(v2, w.opts).state, "not_approved", "yeni sürüm eski onayı devralmaz");
});

test("katı manifest: bilinmeyen/eksik alan, kötü kimlik, semver, bilinmeyen izin (anahtar izni yok), yol saldırıları, çift dosya, entry listede değil", () => {
  const w = world();
  const ok = JSON.parse(readFileSync(join(makeTool(w.tools, "temiz"), "tool.json"), "utf8"));
  const bad = (patch: Record<string, unknown>, m: string) => assert.throws(() => parseManifest({ ...ok, ...patch }), code("invalid_manifest"), m);
  bad({ extra: 1 }, "fazla alan");
  bad({ id: "Büyük" }, "kimlik");
  bad({ id: "../x" }, "kimlik yolu");
  bad({ version: "1.0" }, "semver");
  bad({ version: "01.0.0" }, "öncü sıfır");
  bad({ permissions: ["secrets"] }, "anahtar izni yok");
  bad({ permissions: ["network", "network"] }, "tekrar");
  bad({ permissions: ["__proto__"] }, "prototip");
  bad({ entry: "yok.mjs" }, "entry listede yok");
  bad({ title: "a\nb" }, "satır sonu");
  for (const p of ["../x", "/etc/passwd", "a//b", "a\\b", "./a", "tool.json", "a/../b", ".."]) bad({ files: [{ path: p, sha256: sha("x"), bytes: 1 }], entry: p }, p);
  bad({ files: [ok.files[0], { ...ok.files[0], path: ok.files[0].path.toUpperCase() }] }, "büyük/küçük harf çifti");
  bad({ files: [{ ...ok.files[0], sha256: "XYZ" }] }, "özet biçimi");
  bad({ files: [{ ...ok.files[0], bytes: -1 }] }, "boyut");
  bad({ files: [] }, "boş");
});

test("paket denetimi: sembolik/sert bağ, gizli bilgi, olmayan klasör, bozuk JSON, eksik manifest", () => {
  const w = world();
  const dir = makeTool(w.tools, "ilk");
  symlinkSync(join(dir, "run.mjs"), join(dir, "bag.mjs"));
  assert.throws(() => reviewPackage(dir), code("invalid_package"));
  const hard = makeTool(w.tools, "sert");
  linkSync(join(hard, "run.mjs"), join(w.root, "dis.mjs"));
  assert.throws(() => reviewPackage(hard), code("invalid_package"), "sert bağ");
  const secret = makeTool(w.tools, "sir", {}, { "run.mjs": "const k = 'sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2" + "';\n" });
  const rv = reviewPackage(secret);
  assert.match(rv.problems.join(), /secret-looking content: run\.mjs/);
  assert.throws(() => approveTool(secret, ["read_workspace"], w.opts), code("not_verified"));
  assert.throws(() => reviewPackage(join(w.tools, "yok")), code("invalid_package"));
  const broken = join(w.tools, "bozuk");
  mkdirSync(broken);
  writeFileSync(join(broken, "tool.json"), "{");
  assert.throws(() => reviewPackage(broken), code("invalid_manifest"));
  const nom = join(w.tools, "bos");
  mkdirSync(nom);
  assert.throws(() => reviewPackage(nom), code("invalid_package"));
});

test("güven klasörü kuralları: depo içi, durum klasörü içi, anahtarlar klasörü, göreli yol ve olmayan klasör reddedilir", () => {
  const w = world();
  const dir = makeTool(w.tools, "arac");
  const attempt = (trustDir: string) => assert.throws(() => approveTool(dir, ["read_workspace"], { ...w.opts, trustDir }), (e: unknown) => e instanceof Error && !(e instanceof ToolError && e.code === "already_approved"));
  const inRepo = join(w.repo, "guven");
  mkdirSync(inRepo);
  attempt(inRepo);
  const inState = join(w.state, "guven");
  mkdirSync(inState);
  attempt(inState);
  const keys = join(w.root, "anahtarlar");
  mkdirSync(keys);
  attempt(keys);
  attempt("guven");
  attempt(join(w.root, "yok"));
  assert.deepEqual(readdirSync(inRepo).concat(readdirSync(inState), readdirSync(keys)), [], "hiçbirine yazılmadı");
});

test("bozuk onay kaydı güven vermez: farklı sürüm/kimlik, bozuk JSON, fazla alan", () => {
  const w = world();
  const dir = makeTool(w.tools, "arac");
  const { file } = approveTool(dir, ["read_workspace"], w.opts);
  const good = JSON.parse(readFileSync(file, "utf8"));
  const other = makeTool(w.tools, "diger");
  for (const body of [{ ...good, version: "9.9.9" }, { ...good, extra: 1 }, { ...good, granted: ["secrets"] }, "{"]) {
    writeFileSync(join(w.trust, "onay-diger@1.0.0.json"), typeof body === "string" ? body : JSON.stringify(body));
    assert.throws(() => evaluateTool(other, w.opts), code("invalid_record"));
    writeFileSync(join(w.trust, "onay-diger@1.0.0.json"), "");
  }
});

test("katalog: her paket ayrı değerlendirilir, biri bozuksa diğerleri etkilenmez", () => {
  const w = world();
  const cat = join(w.root, "katalog");
  mkdirSync(cat);
  const a = makeTool(cat, "iyi");
  makeTool(cat, "onaysiz");
  approveTool(a, ["read_workspace"], w.opts);
  mkdirSync(join(cat, "bozuk"));
  writeFileSync(join(cat, "dosya.txt"), "x");
  const r = evaluateCatalog(cat, w.opts);
  const by = Object.fromEntries(r.map((x) => [x.folder, x.evaluation?.state ?? x.error]));
  assert.equal(by["iyi"], "trusted");
  assert.equal(by["onaysiz"], "not_approved");
  assert.match(String(by["bozuk"]), /invalid_package/);
  assert.equal(by["dosya.txt"], "not a folder");
});

test("CLI: manifest-uret, incele, onayla, degerlendir, iptal, katalog; hatalar çıkış kodu verir; araç ÇALIŞTIRILMAZ", () => {
  const w = world();
  const marker = join(w.root, "calisti.txt");
  const dir = join(w.tools, "cli-arac");
  mkdirSync(dir);
  writeFileSync(join(dir, "run.mjs"), `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "x");\n`);
  const sh = (...a: string[]) => execFileSync(process.execPath, ["--experimental-strip-types", "scripts/arac.mjs", ...a], { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const run = (...a: string[]) => { try { return { status: 0, out: sh(...a) }; } catch (e: any) { return { status: e.status as number, out: String(e.stdout ?? "") }; } };
  const manifest = sh("manifest-uret", dir, "--id", "cli-arac", "--surum", "1.0.0", "--baslik", "CLI", "--yayinci", "Yusuf", "--giris", "run.mjs", "--izin", "read_workspace");
  writeFileSync(join(dir, "tool.json"), manifest);
  const trust = ["--guven", w.trust, "--repo", w.repo, "--durum", w.state];
  assert.equal(run("incele", dir).status, 0);
  assert.equal(run("degerlendir", dir, ...trust).status, 1, "onay yok: 1");
  assert.equal(run("onayla", dir, "--izin", "read_workspace", ...trust).status, 0);
  assert.equal(run("degerlendir", dir, ...trust).status, 0);
  assert.equal(JSON.parse(run("katalog", w.tools, ...trust).out)[0].evaluation.state, "trusted");
  assert.equal(run("onayla", dir, "--izin", "network", ...trust).status, 1);
  assert.equal(run("iptal", "cli-arac", "1.0.0", ...trust).status, 0);
  assert.equal(run("degerlendir", dir, ...trust).status, 1);
  assert.equal(run("degerlendir", dir).status, 2, "--guven/--repo zorunlu");
  assert.equal(run("degerlendir", dir, "--bilinmeyen", ...trust).status, 2);
  assert.equal(run("incele", join(w.tools, "yok")).status, 1);
  assert.equal(existsSync(marker), false, "araç hiç çalıştırılmadı");
});

test("sahte onay kaydı güven vermez: yüksek riskli izin onay bayrağı olmadan, tekrarlı izin, bayraksız eski biçim", () => {
  const w = world();
  const dir = makeTool(w.tools, "arac", { permissions: ["read_workspace", "network"] });
  const { file } = approveTool(dir, ["read_workspace", "network"], { ...w.opts, acceptHighRisk: true });
  const good = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(good.highRiskAccepted, true);
  assert.equal(evaluateTool(dir, w.opts).state, "trusted");
  const { highRiskAccepted: _h, ...legacy } = good;
  for (const body of [{ ...good, highRiskAccepted: false }, { ...good, granted: ["network", "network"] }, legacy]) {
    writeFileSync(file, JSON.stringify(body));
    assert.throws(() => evaluateTool(dir, w.opts), code("invalid_record"));
  }
});

test("güven klasörü araç ya da katalog klasörüyle iç içe olamaz", () => {
  const w = world();
  const dir = makeTool(w.tools, "arac");
  const inTool = join(dir, "guven");
  mkdirSync(inTool);
  assert.throws(() => approveTool(dir, ["read_workspace"], { ...w.opts, trustDir: inTool }), code("unsafe_trust_dir"));
  assert.throws(() => evaluateTool(dir, { ...w.opts, trustDir: inTool }), code("unsafe_trust_dir"));
  const inCatalog = join(w.tools, "guven");
  mkdirSync(inCatalog);
  assert.throws(() => evaluateCatalog(w.tools, { ...w.opts, trustDir: inCatalog }), code("unsafe_trust_dir"));
  assert.throws(() => evaluateCatalog(join(w.root, "yok"), w.opts), code("invalid_package"));
  assert.deepEqual(readdirSync(inTool).concat(readdirSync(inCatalog)), [], "hiçbirine yazılmadı");
});

test("iptal sonrası aynı sürüm yeniden onaylanamaz (kayıtlar ezilmez); yeni sürüm onaylanabilir", () => {
  const w = world();
  const dir = makeTool(w.tools, "arac");
  approveTool(dir, ["read_workspace"], w.opts);
  revokeTool("arac", "1.0.0", w.opts);
  assert.equal(evaluateTool(dir, w.opts).state, "revoked");
  assert.throws(() => approveTool(dir, ["read_workspace"], w.opts), code("already_approved"));
  assert.equal(evaluateTool(dir, w.opts).state, "revoked", "yeniden onay denemesi iptali kaldırmaz");
  const v2 = makeTool(w.tools, "arac-v2", { id: "arac", version: "1.0.1" });
  approveTool(v2, ["read_workspace"], w.opts);
  assert.equal(evaluateTool(v2, w.opts).state, "trusted");
});
