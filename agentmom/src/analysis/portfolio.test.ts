// Çoklu proje portföyü birim testleri (madde 15). Sahip: Claude [İP:AgentMom devam]. Geçici klasörlerle; ağ/git yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPortfolio, MAX_PROJECTS } from "./portfolio.ts";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "portfolio-"));
  const a = join(root, "alfa");
  mkdirSync(join(a, ".git"), { recursive: true });
  writeFileSync(join(a, ".git", "HEAD"), "ref: refs/heads/ana-dal\n");
  writeFileSync(join(a, "package.json"), JSON.stringify({ name: "alfa-paket", version: "1.2.3" }));
  const b = join(root, "beta");
  mkdirSync(join(b, ".git"), { recursive: true });
  writeFileSync(join(b, ".git", "HEAD"), "0123456789abcdef0123456789abcdef01234567\n");
  writeFileSync(join(b, "package.json"), "{ bozuk");
  const c = join(root, "gama");
  mkdirSync(c);
  const file = join(root, "dosya.txt");
  writeFileSync(file, "x");
  return { root, a, b, c, file };
}

test("reads branch, detached head and package fields; broken package.json and missing .git are unknown, not guessed", () => {
  const f = fixture();
  try {
    const r = buildPortfolio([f.a, f.b, f.c]);
    const [a, b, c] = r.projects;
    assert.deepEqual([a?.isGitRepo, a?.branch, a?.packageName, a?.packageVersion], [true, "ana-dal", "alfa-paket", "1.2.3"]);
    assert.deepEqual([b?.isGitRepo, b?.branch, b?.detachedHead, b?.packageName], [true, null, "0123456789ab", null]);
    assert.deepEqual([c?.isGitRepo, c?.branch, c?.packageName], [false, null, null]);
    assert.equal(r.summary.gitRepos, 2);
    assert.equal(r.summary.ok, 3);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test("missing, not-a-directory and unsafe paths are classified without touching the file system for unsafe ones", () => {
  const f = fixture();
  try {
    const r = buildPortfolio([join(f.root, "yok"), f.file, "\\\\sunucu\\paylasim\\x", "//host/share", "\\\\?\\C:\\x", "D:\\a\\..\\b", "C:\\x:ads", "relative\\dir", "C:foo", "\\??\\C:\\x", "C:\\a\\CON", "C:\\a\\NUL.txt", "C:\\a\\b. "]);
    assert.deepEqual(r.projects.map((p) => p.status), ["missing", "not_directory", ...Array(11).fill("rejected")]);
    assert.equal(r.summary.rejected, 11);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test("duplicates collapse and the list is capped at MAX_PROJECTS with truncated reported", () => {
  const many = Array.from({ length: MAX_PROJECTS + 5 }, (_, i) => `/yok/proje-${i}`);
  const r = buildPortfolio([...many, many[0]!]);
  assert.equal(r.projects.length, MAX_PROJECTS);
  assert.equal(r.total, MAX_PROJECTS + 5);
  assert.equal(r.truncated, true);
});

test("an empty trustedRepos list yields an empty, honest report", () => {
  const r = buildPortfolio([]);
  assert.deepEqual([r.projects.length, r.total, r.truncated], [0, 0, false]);
  assert.ok(r.notes.length > 0);
});

test("worktree/submodule (.git is a FILE) counts as a repo with unknown branch; CRLF HEAD, BOM package.json and 64-hex detached HEAD are read; oversize files are unknown", () => {
  const root = mkdtempSync(join(tmpdir(), "portfolio-"));
  try {
    const wt = join(root, "wt");
    mkdirSync(wt);
    writeFileSync(join(wt, ".git"), "gitdir: /baska/yer\n");
    const crlf = join(root, "crlf");
    mkdirSync(join(crlf, ".git"), { recursive: true });
    writeFileSync(join(crlf, ".git", "HEAD"), "ref: refs/heads/dal\r\n");
    writeFileSync(join(crlf, "package.json"), "\uFEFF" + JSON.stringify({ name: "bom", version: "0.0.1" }));
    const sha = join(root, "sha");
    mkdirSync(join(sha, ".git"), { recursive: true });
    writeFileSync(join(sha, ".git", "HEAD"), "a".repeat(64));
    const big = join(root, "big");
    mkdirSync(join(big, ".git"), { recursive: true });
    writeFileSync(join(big, ".git", "HEAD"), "ref: refs/heads/" + "x".repeat(70000));
    const [w, c, h, b] = buildPortfolio([wt, crlf, sha, big]).projects;
    assert.deepEqual([w?.isGitRepo, w?.branch], [true, null]);
    assert.deepEqual([c?.branch, c?.packageName, c?.packageVersion], ["dal", "bom", "0.0.1"]);
    assert.equal(h?.detachedHead, "a".repeat(12));
    assert.deepEqual([b?.isGitRepo, b?.branch], [false, null]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("symlinked project root is rejected; symlinked .git and symlinked package.json are never followed", () => {
  const root = mkdtempSync(join(tmpdir(), "portfolio-"));
  try {
    const real = join(root, "gercek");
    mkdirSync(join(real, ".git"), { recursive: true });
    writeFileSync(join(real, ".git", "HEAD"), "ref: refs/heads/gizli\n");
    const link = join(root, "baglanti");
    symlinkSync(real, link, "dir");
    const holder = join(root, "tutucu");
    mkdirSync(holder);
    symlinkSync(join(real, ".git"), join(holder, ".git"), "dir");
    const pk = join(root, "pk");
    mkdirSync(pk);
    writeFileSync(join(root, "hedef.json"), JSON.stringify({ name: "sizmamali" }));
    symlinkSync(join(root, "hedef.json"), join(pk, "package.json"), "file");
    const [l, hd, p] = buildPortfolio([link, holder, pk]).projects;
    assert.equal(l?.status, "rejected");
    assert.deepEqual([hd?.isGitRepo, hd?.branch], [null, null]);
    assert.equal(p?.packageName, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
