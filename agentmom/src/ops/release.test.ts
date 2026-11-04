import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { ReleaseError, checkRelease, compareSemver, nextVersion, parseSemver, readGitHead, readRelease, recordedVersions, renderNotes, writeNotes } from "./release.ts";

const T0 = new Date("2026-10-25T12:00:00.000Z");
const SHA = "a".repeat(40);
const code = (c: string) => (e: unknown) => e instanceof ReleaseError && e.code === c;

function repo(opts: { version?: string; lock?: boolean; git?: "ref" | "detached" | "packed" | "none"; name?: string } = {}) {
  const root = mkTmp("surum-");
  const name = opts.name ?? "ornek";
  const version = opts.version ?? "1.2.3";
  writeFileSync(join(root, "package.json"), JSON.stringify({ name, version, engines: { node: ">=24" } }));
  if (opts.lock !== false) writeFileSync(join(root, "package-lock.json"), JSON.stringify({ name, version, lockfileVersion: 3 }));
  const git = opts.git ?? "ref";
  if (git !== "none") {
    mkdirSync(join(root, ".git", "refs", "heads"), { recursive: true });
    if (git === "ref") {
      writeFileSync(join(root, ".git", "HEAD"), "ref: refs/heads/ana\n");
      writeFileSync(join(root, ".git", "refs", "heads", "ana"), SHA + "\n");
    } else if (git === "detached") writeFileSync(join(root, ".git", "HEAD"), SHA + "\n");
    else {
      writeFileSync(join(root, ".git", "HEAD"), "ref: refs/heads/ana\n");
      writeFileSync(join(root, ".git", "packed-refs"), `# pack-refs\n${SHA} refs/heads/ana\n${"b".repeat(40)} refs/heads/baska\n`);
    }
  }
  return root;
}

test("sürüm numarası: yalnız X.Y.Z; patch/minor/major doğru; sıralama sayısal; bozuk girdi reddedilir", () => {
  assert.deepEqual(parseSemver("1.20.3"), { major: 1, minor: 20, patch: 3 });
  for (const bad of ["1.2", "01.2.3", "1.2.3-beta", "1.2.3+x", "v1.2.3", "1.2.x", "", " 1.2.3", "1.2.3\n", "-1.0.0", "1234567890.0.0"]) assert.throws(() => parseSemver(bad), code("invalid_version"), bad);
  assert.throws(() => parseSemver(5), code("invalid_version"));
  assert.equal(nextVersion("1.2.3", "patch"), "1.2.4");
  assert.equal(nextVersion("1.2.3", "minor"), "1.3.0");
  assert.equal(nextVersion("1.2.3", "major"), "2.0.0");
  assert.throws(() => nextVersion("1.2.3", "bilinmez"), code("invalid_kind"));
  assert.ok(compareSemver("1.10.0", "1.9.0") > 0, "10 > 9 (metin sıralaması değil)");
  assert.ok(compareSemver("0.9.9", "1.0.0") < 0);
  assert.equal(compareSemver("2.0.0", "2.0.0"), 0);
});

test("git HEAD: ref (gevşek), detached, packed-refs okunur; bozuk/yol kaçışlı/yok -> null (tahmin yok)", () => {
  assert.deepEqual(readGitHead(repo({ git: "ref" })), { branch: "ana", commit: SHA });
  assert.deepEqual(readGitHead(repo({ git: "detached" })), { branch: null, commit: SHA });
  assert.deepEqual(readGitHead(repo({ git: "packed" })), { branch: "ana", commit: SHA });
  assert.deepEqual(readGitHead(repo({ git: "none" })), { branch: null, commit: null });
  const bad = repo({ git: "ref" });
  writeFileSync(join(bad, ".git", "HEAD"), "ref: refs/../../etc/passwd\n");
  assert.deepEqual(readGitHead(bad), { branch: null, commit: null });
  writeFileSync(join(bad, ".git", "HEAD"), "ref: refs/heads/ana\n");
  writeFileSync(join(bad, ".git", "refs", "heads", "ana"), "bozuk\n");
  assert.deepEqual(readGitHead(bad), { branch: "ana", commit: null }, "gevşek ref bozuksa packed-refs de yoksa commit yok");
});

test("readRelease: sürüm, node, kilit özeti ve (varsa) durum sayıları; geçersiz sürüm ve package.json reddedilir", () => {
  const r = repo();
  mkdirSync(join(r, "docs", "status"), { recursive: true });
  writeFileSync(join(r, "docs", "status", "100-yetenek-durum.json"), JSON.stringify({ summary: { dogrulandi: 3, kismi: 4, planli: 1, kapsamdisi: 2, total: 10 } }));
  const i = readRelease(r);
  assert.equal(i.version, "1.2.3");
  assert.equal(i.nodeEngine, ">=24");
  assert.match(i.lockfileSha256 ?? "", /^[0-9a-f]{64}$/);
  assert.deepEqual(i.status, { dogrulandi: 3, kismi: 4, planli: 1, kapsamdisi: 2, total: 10 });
  assert.equal(i.git.commit, SHA);
  const w = repo({ version: "1.2" });
  assert.throws(() => readRelease(w), code("invalid_version"));
  writeFileSync(join(w, "package.json"), "{bozuk");
  assert.throws(() => readRelease(w), code("invalid_package"));
  assert.throws(() => readRelease("goreli"), code("invalid_repo"));
  const empty = mkTmp("surum-bos-");
  assert.throws(() => readRelease(empty), code("missing_file"));
});

test("checkRelease: kilit yok, git yok, aynı sürüm kaydı var, daha yeni kayıt var -> hepsi listelenir", () => {
  const ok = repo();
  assert.equal(checkRelease(ok).ok, true);
  const noLock = checkRelease(repo({ lock: false }));
  assert.ok(noLock.problems.some((p) => /package-lock/.test(p)));
  const noGit = checkRelease(repo({ git: "none" }));
  assert.ok(noGit.problems.some((p) => /git commit/.test(p)));
  const dup = repo();
  mkdirSync(join(dup, "docs", "surumler"), { recursive: true });
  writeFileSync(join(dup, "docs", "surumler", "1.2.3.md"), "x");
  writeFileSync(join(dup, "docs", "surumler", "9.0.0.md"), "x");
  writeFileSync(join(dup, "docs", "surumler", "notlar.md"), "x");
  const c = checkRelease(dup);
  assert.ok(c.problems.some((p) => /already has a release record/.test(p)));
  assert.ok(c.problems.some((p) => /older than the recorded 9\.0\.0/.test(p)));
  assert.deepEqual(recordedVersions(dup), ["1.2.3", "9.0.0"], "sürüm adı olmayan dosya yok sayılır");
});

test("writeNotes: yeni dosya yazar, package.json'a dokunmaz, ikinci kez yazmaz; önceki sürümü bulur", () => {
  const r = repo();
  const before = readFileSync(join(r, "package.json"), "utf8");
  mkdirSync(join(r, "docs", "surumler"), { recursive: true });
  writeFileSync(join(r, "docs", "surumler", "1.0.0.md"), "eski");
  const w = writeNotes(r, T0);
  assert.equal(readFileSync(w.path, "utf8"), w.text);
  assert.match(w.text, /# ornek 1\.2\.3/);
  assert.match(w.text, /Önceki kayıtlı sürüm: 1\.0\.0/);
  assert.match(w.text, new RegExp(SHA));
  assert.match(w.text, /2026-10-25T12:00:00\.000Z/);
  assert.equal(readFileSync(join(r, "package.json"), "utf8"), before, "package.json değişmez");
  assert.throws(() => writeNotes(r, T0), code("check_failed"), "aynı sürüm ikinci kez yazılmaz");
  assert.equal(readFileSync(join(r, "docs", "surumler", "1.0.0.md"), "utf8"), "eski", "var olan kayıt değişmez");
});

test("writeNotes reddetme yolları: kontrol hatası hiçbir şey yazmaz; gizli bilgi; sembolik bağlı package.json ve docs/surumler", (t) => {
  const noLock = repo({ lock: false });
  assert.throws(() => writeNotes(noLock, T0), code("check_failed"));
  assert.equal(existsSync(join(noLock, "docs", "surumler")), false, "reddedilen kayıt klasör bile açmaz");
  const secret = repo({ name: "sk-" + "zz9yy8xx7ww6vv5uu4tt3ss2" });
  assert.throws(() => writeNotes(secret, T0), code("secret_found"));
  assert.equal(existsSync(join(secret, "docs", "surumler")), false);
  const link = repo();
  const outside = mkTmp("surum-disari-");
  mkdirSync(join(link, "docs"), { recursive: true });
  try {
    symlinkSync(outside, join(link, "docs", "surumler"));
  } catch {
    t.skip("symlinks unavailable in this environment");
    return;
  }
  assert.throws(() => writeNotes(link, T0), code("invalid_dest"));
  assert.deepEqual(readdirSync(outside), [], "dışarıya hiçbir şey yazılmadı");
  const linkedPkg = repo();
  const real = join(linkedPkg, "gercek.json");
  writeFileSync(real, JSON.stringify({ name: "x", version: "1.0.0" }));
  rmSync(join(linkedPkg, "package.json"));
  symlinkSync(real, join(linkedPkg, "package.json"));
  assert.throws(() => readRelease(linkedPkg), code("invalid_file"));
});

test("renderNotes: durum yoksa 'okunamadı' der, bilinmeyen alanları 'bilinmiyor' yazar (uydurma yok)", () => {
  const text = renderNotes({ name: "", version: "0.0.1", nodeEngine: "", lockfileSha256: null, git: { branch: null, commit: null }, status: null, previous: null }, T0);
  assert.match(text, /# agentmom 0\.0\.1/);
  assert.match(text, /Kaynak: bilinmiyor @ bilinmiyor/);
  assert.match(text, /Yetenek durumu: okunamadı/);
  assert.match(text, /Node: belirtilmemiş/);
  assert.match(text, /package-lock\.json SHA-256: yok/);
});

test("kayıt metni enjeksiyonu: satır sonlu ad ya da motor sürümü, geçersiz npm adı reddedilir; kilit uyuşmazlığı ve boş ad sorun olarak listelenir", () => {
  for (const name of ["x\n# Sahte başlık\n- Kaynak: main @ " + "f".repeat(40), "Büyük", "a b", "../x", "@/x"]) {
    const r = repo({ name });
    assert.throws(() => readRelease(r), code("invalid_package"), JSON.stringify(name));
  }
  const eng = repo();
  writeFileSync(join(eng, "package.json"), JSON.stringify({ name: "ornek", version: "1.2.3", engines: { node: "1\n\n## enjekte" } }));
  assert.throws(() => readRelease(eng), code("invalid_package"));
  assert.equal(readRelease(repo({ name: "@kapsam/ornek" })).name, "@kapsam/ornek");
  const stale = repo();
  writeFileSync(join(stale, "package-lock.json"), JSON.stringify({ name: "baska", version: "9.9.9" }));
  assert.ok(checkRelease(stale).problems.some((p) => /stale/.test(p)));
  writeFileSync(join(stale, "package-lock.json"), "{bozuk");
  assert.ok(checkRelease(stale).problems.some((p) => /not valid JSON/.test(p)));
  const noName = repo();
  writeFileSync(join(noName, "package.json"), JSON.stringify({ version: "1.2.3" }));
  assert.ok(checkRelease(noName).problems.some((p) => /no name/.test(p)));
});

test("klasör oluşturma: docs bağı / dosyası / boşa işaret eden docs/surumler dışarıda hiçbir şey açmaz ve ReleaseError verir", (t) => {
  const out = mkTmp("surum-disari-");
  const a = repo();
  try {
    symlinkSync(out, join(a, "docs"));
  } catch {
    t.skip("symlinks unavailable in this environment");
    return;
  }
  assert.throws(() => writeNotes(a, T0), code("invalid_dest"));
  assert.deepEqual(readdirSync(out), [], "docs bağı dışarıda surumler/ açmaz");
  const b = repo();
  writeFileSync(join(b, "docs"), "dosya");
  assert.throws(() => writeNotes(b, T0), code("invalid_dest"));
  const c = repo();
  mkdirSync(join(c, "docs"));
  symlinkSync(join(out, "yok"), join(c, "docs", "surumler"));
  assert.throws(() => writeNotes(c, T0), code("invalid_dest"));
  assert.deepEqual(readdirSync(out), []);
});

test("önceki sürüm: sıralamasız birden çok kayıt arasından kendisinden küçük en büyüğü seçilir; kendisi ve büyükler dışlanır", () => {
  const r = repo({ version: "1.2.3" });
  mkdirSync(join(r, "docs", "surumler"), { recursive: true });
  for (const v of ["1.2.0", "0.5.0", "1.10.0", "1.0.0"]) writeFileSync(join(r, "docs", "surumler", v + ".md"), "x");
  assert.equal(readRelease(r).previous, "1.2.0");
  assert.deepEqual(recordedVersions(r), ["0.5.0", "1.0.0", "1.2.0", "1.10.0"]);
});

test("git HEAD ayrıntıları: packed-refs'te önce başka ref gelse de doğru ref seçilir; kısa/uzun hex ve çift eğik çizgili ref null; worktree gitdir dosyası desteklenir", () => {
  const p = repo({ git: "packed" });
  writeFileSync(join(p, ".git", "packed-refs"), `${"b".repeat(40)} refs/heads/baska\n${SHA} refs/heads/ana\n`);
  assert.equal(readGitHead(p).commit, SHA);
  const bad = repo({ git: "detached" });
  for (const head of ["abc1234", SHA + "0", "ref: refs/heads//ana", "ref: refs/heads/ana/", "ref: refs/heads/.gizli", "ref: refs/heads/a.lock/../x"]) {
    writeFileSync(join(bad, ".git", "HEAD"), head + "\n");
    assert.equal(readGitHead(bad).commit, null, head);
  }
  // worktree: .git bir dosya, HEAD gitdir içinde, ref'ler commondir'de
  const main = repo({ git: "ref" });
  const wt = mkTmp("surum-wt-");
  const gd = join(main, ".git", "worktrees", "wt");
  mkdirSync(gd, { recursive: true });
  writeFileSync(join(gd, "HEAD"), "ref: refs/heads/ana\n");
  writeFileSync(join(gd, "commondir"), "../..\n");
  writeFileSync(join(wt, ".git"), `gitdir: ${gd}\n`);
  assert.deepEqual(readGitHead(wt), { branch: "ana", commit: SHA });
  writeFileSync(join(wt, ".git"), "gitdir: /yok/boyle/yer\n");
  assert.deepEqual(readGitHead(wt), { branch: null, commit: null });
  writeFileSync(join(wt, ".git"), "baska bir şey\n");
  assert.deepEqual(readGitHead(wt), { branch: null, commit: null });
});

test("sınırlar: 2 MB üstü package.json reddedilir; nextVersion kendi ayrıştırıcısının reddedeceği sayı üretmez", () => {
  const r = repo();
  writeFileSync(join(r, "package.json"), JSON.stringify({ name: "ornek", version: "1.2.3", pad: "x".repeat(2_000_001) }));
  assert.throws(() => readRelease(r), code("invalid_file"));
  assert.throws(() => nextVersion("999999999.0.0", "major"), code("invalid_version"));
  assert.equal(nextVersion("999999999.0.0", "minor"), "999999999.1.0");
});
