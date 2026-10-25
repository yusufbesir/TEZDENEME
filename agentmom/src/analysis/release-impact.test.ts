// Sürüm etki analizi birim testleri (madde 29, D8b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Başvuru doğrulaması (seçenek enjeksiyonu reddi), mkTmp içinde GEÇİCİ git deposuyla gerçek diff, migrasyon uyarısı, git yok / başvuru yok / depo yok dürüst hata,
// ve YAZMA YOKLUĞU (depo klasörü, .git dahil, çağrı öncesi ve sonrası aynı). git kurulu değilse depo testleri atlanır.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { DANGEROUS_CONFIG, MAX_ANALYZED_FILES, MAX_LISTED_CHANGES, analyzeRelease, parseNameStatus, runCommand, validateRef } from "./release-impact.ts";
import type { ReleaseImpactOk } from "./release-impact.ts";

const haveGit = ((): boolean => {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
const skip = haveGit ? false : "git kurulu değil";
const NULL_DEV = process.platform === "win32" ? "NUL" : "/dev/null";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args], {
    cwd,
    env: { ...process.env, GIT_CONFIG_GLOBAL: NULL_DEV, GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function put(root: string, rel: string, content: string): void {
  const p = join(root, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, content);
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

// v1: lib <- user <- user.test, old; v2: lib değişti, new eklendi, old silindi, migrasyon eklendi, belge değişti.
function repo(): string {
  const root = mkTmp("agentmom-rel-");
  git(root, ["init", "-q"]);
  git(root, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  put(root, "src/lib.ts", "export const lib = 1;\n");
  put(root, "src/user.ts", 'import { lib } from "./lib.ts";\nexport const user = lib + 1;\n');
  put(root, "src/user.test.ts", 'import { user } from "./user.ts";\nvoid user;\n');
  put(root, "src/old.ts", "export const old = 1;\n");
  put(root, "docs/readme.md", "bir\n");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "v1"]);
  git(root, ["tag", "v1.0"]);
  put(root, "src/lib.ts", "export const lib = 2;\n");
  put(root, "src/new.ts", "export const fresh = 1;\n");
  put(root, "src/core/db/migrations/002_x.sql", "CREATE TABLE t (id INTEGER);\n");
  put(root, "docs/readme.md", "iki\n");
  git(root, ["rm", "-q", "src/old.ts"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "v2"]);
  git(root, ["tag", "v2.0"]);
  return root;
}

test("validateRef: geçerli başvurular kabul; seçenek enjeksiyonu ve tehlikeli biçimler reddedilir", () => {
  for (const ok of ["main", "v1.0", "feature/x-y_z", "abcdef0", "a", "release-2026.10", "0123456789abcdef0123456789abcdef01234567"]) assert.equal(validateRef(ok), null, ok);
  const bad: unknown[] = ["", "--upload-pack=touch x", "--upload-pack=", "-x", "-", "--", "a..b", "a b", " a", "a ", "a@{1}", "@{u}", "HEAD@{1}", "a~1", "a^", "a^{commit}", "a:b", "a\\b", "a//b", "a/", "a.", "x.lock", "a?b", "a*b", "a[0]", "a\nb", "a\u0000b", "é", "x".repeat(101), null, undefined, 5, {}, []];
  for (const b of bad) assert.notEqual(validateRef(b), null, JSON.stringify(b));
  assert.equal(validateRef("x".repeat(100)), null);
});

test("parseNameStatus: -z çıktısı ayrıştırılır; bozuk çıktı null", () => {
  assert.deepEqual(parseNameStatus("M\u0000src/a.ts\u0000A\u0000b c.ts\u0000D\u0000z.ts\u0000"), [
    { status: "A", file: "b c.ts" },
    { status: "M", file: "src/a.ts" },
    { status: "D", file: "z.ts" },
  ]);
  assert.deepEqual(parseNameStatus(""), []);
  assert.equal(parseNameStatus("M\u0000"), null);
  assert.equal(parseNameStatus("zz\u0000a\u0000"), null, "küçük harf durum geçersiz: tek büyük harf beklenir");
  assert.equal(parseNameStatus("1\u0000a\u0000"), null);
});

test("gerçek git diff: değişenler, etki sayıları, testsiz değişenler ve migrasyon uyarısı", { skip }, async () => {
  const root = repo();
  const r = (await analyzeRelease(root, "v1.0", "v2.0")) as ReleaseImpactOk;
  assert.equal(r.status, "ok");
  assert.equal(r.changes.total, 5);
  assert.deepEqual(r.changes.byStatus, { A: 2, D: 1, M: 2 });
  assert.deepEqual(r.changes.listed.map((c) => `${c.status} ${c.file}`), ["M docs/readme.md", "A src/core/db/migrations/002_x.sql", "M src/lib.ts", "A src/new.ts", "D src/old.ts"]);
  assert.equal(r.resolved.from.length, 12);
  assert.equal(r.srcChanged.count, 3, "lib, new, old (migrasyon .sql kod dosyası değil)");
  const lib = r.files.find((f) => f.file === "src/lib.ts");
  assert.deepEqual(lib, { file: "src/lib.ts", status: "M", isTest: false, inGraph: true, directDependents: 1, dependentFiles: 1, dependentTests: 1 });
  const fresh = r.files.find((f) => f.file === "src/new.ts");
  assert.deepEqual(fresh, { file: "src/new.ts", status: "A", isTest: false, inGraph: true, directDependents: 0, dependentFiles: 0, dependentTests: 0 });
  const old = r.files.find((f) => f.file === "src/old.ts");
  assert.deepEqual(old, { file: "src/old.ts", status: "D", isTest: false, inGraph: false, directDependents: null, dependentFiles: null, dependentTests: null }, "silinen dosyanın etkisi uydurulmaz");
  assert.deepEqual({ files: r.radius.files, tests: r.radius.tests }, { files: 1, tests: 1 }, "user.ts ve user.test.ts");
  assert.deepEqual(r.untestedChanged.examples, ["src/lib.ts", "src/new.ts"]);
  assert.equal(r.untestedChanged.count, 2);
  assert.equal(r.migrations.count, 1);
  assert.deepEqual(r.migrations.changed, ["A src/core/db/migrations/002_x.sql"]);
  assert.match(r.migrations.warning ?? "", /migrasyon/i);
  assert.equal(r.surface.serverRouteFileChanged, false);
  assert.equal(r.surface.uiFilesChanged, 0);
  assert.equal(r.surface.endpointLevel, "çözümlenmedi");
  assert.equal(r.scan.graphIncomplete, false);
  assert.match(r.note, /uç değişimi çözümlenmez/);
});

test("ters yön: durumlar tersine döner; aynı başvuru boş fark; branch/etiket/sha hepsi çalışır; migrasyon yoksa uyarı null", { skip }, async () => {
  const root = repo();
  const back = (await analyzeRelease(root, "v2.0", "v1.0")) as ReleaseImpactOk;
  assert.deepEqual(back.changes.byStatus, { A: 1, D: 2, M: 2 });
  assert.equal(back.migrations.count, 1, "migrasyon silindi de olsa değişmiş sayılır");
  const same = (await analyzeRelease(root, "main", "v2.0")) as ReleaseImpactOk;
  assert.equal(same.changes.total, 0);
  assert.equal(same.migrations.warning, null);
  assert.deepEqual(same.files, []);
  const sha = git(root, ["rev-parse", "v1.0"]).trim();
  const bySha = (await analyzeRelease(root, sha.slice(0, 8), "main")) as ReleaseImpactOk;
  assert.equal(bySha.status, "ok");
  assert.equal(bySha.changes.total, 5);
  assert.equal(bySha.resolved.from, sha.slice(0, 12));
});

test("var olmayan başvuru, git deposu olmayan klasör ve git bulunamaması: dürüst 'okunamadı', ayrıntı sızmaz", { skip }, async () => {
  const root = repo();
  const missing = await analyzeRelease(root, "v1.0", "yok-dal");
  assert.deepEqual(missing, { status: "unreadable", code: "ref_not_found", reason: "başvurulardan biri bu depoda bulunamadı" });
  assert.doesNotMatch(JSON.stringify(missing), /yok-dal/, "başvuru yanıtta yankılanmaz");
  const nogit = mkTmp("agentmom-rel-nogit-");
  put(nogit, "src/a.ts", "export const a = 1;\n");
  const none = await analyzeRelease(nogit, "main", "main");
  assert.equal(none.status, "unreadable");
  assert.ok(none.status === "unreadable" && none.code === "git_failed", "üst klasördeki (bu projenin) deposu bulunmamalı");
  const nobin = await analyzeRelease(root, "v1.0", "v2.0", { gitBin: "agentmom-yok-git-xyz" });
  assert.deepEqual(nobin, { status: "unreadable", code: "git_missing", reason: "git çalıştırılamadı (kurulu değil ya da bulunamadı)" });
});

test("geçersiz başvuru git'e HİÇ ulaşmaz: analyzeRelease fırlatır (var olmayan git ikilisi bile çalıştırılmaz)", async () => {
  for (const bad of ["--upload-pack=x", "-x", "a..b", "a b", "a@{1}", "x".repeat(101)]) {
    await assert.rejects(() => analyzeRelease(resolve("."), bad, "main", { gitBin: "agentmom-yok-git-xyz" }), /geçersiz başvuru/, bad);
    await assert.rejects(() => analyzeRelease(resolve("."), "main", bad, { gitBin: "agentmom-yok-git-xyz" }), /geçersiz başvuru/, bad);
  }
});

test("YAZMA YOK: çağrıdan önce ve sonra depo klasörü (.git dahil) bayt/zaman damgasına kadar aynı; çalışma ağacı ve HEAD değişmez", { skip }, async () => {
  const root = repo();
  const headBefore = git(root, ["rev-parse", "HEAD"]);
  const statusBefore = git(root, ["status", "--porcelain"]);
  const before = snapshot(root);
  await analyzeRelease(root, "v1.0", "v2.0");
  await analyzeRelease(root, "v2.0", "v1.0");
  await analyzeRelease(root, "v1.0", "yok-dal");
  assert.deepEqual(snapshot(root), before);
  assert.equal(git(root, ["rev-parse", "HEAD"]), headBefore);
  assert.equal(git(root, ["status", "--porcelain"]), statusBefore);
  assert.equal(readFileSync(join(root, "src/lib.ts"), "utf8"), "export const lib = 2;\n", "çıkış (checkout) yapılmadı");
});

test("sınırlar: çok sayıda değişiklikte liste en çok 200, etki analizi en çok 50 dosya; sayılar gerçek toplamdır", { skip }, async () => {
  const root = mkTmp("agentmom-rel-big-");
  git(root, ["init", "-q"]);
  git(root, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  put(root, "README.md", "x\n");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "c1"]);
  git(root, ["tag", "base"]);
  for (let i = 0; i < 260; i++) put(root, `src/gen/f${String(i).padStart(3, "0")}.ts`, `export const v${i} = ${i};\n`);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "c2"]);
  const r = (await analyzeRelease(root, "base", "main")) as ReleaseImpactOk;
  assert.equal(r.changes.total, 260);
  assert.equal(r.changes.listed.length, MAX_LISTED_CHANGES);
  assert.equal(r.changes.listTruncated, true);
  assert.equal(r.srcChanged.count, 260);
  assert.equal(r.srcChanged.analyzed, MAX_ANALYZED_FILES);
  assert.equal(r.srcChanged.notAnalyzed, 210);
  assert.equal(r.files.length, 50);
  assert.equal(r.untestedChanged.count, 260);
  assert.ok(r.untestedChanged.examples.length <= 50);
});

test("zaman aşımı: 1 ms içinde bitemeyen git TAM OLARAK 'timeout' döner (asılı kalmaz)", { skip }, async () => {
  const root = repo();
  const r = await analyzeRelease(root, "v1.0", "v2.0", { timeoutMs: 1 });
  assert.deepEqual(r, { status: "unreadable", code: "timeout", reason: "git zaman aşımına uğradı" });
});

// ---- kötü niyetli depo yapılandırması (denetim düzeltmesi 1) -----------------------------------------------------------------------------
const EVIL_CONFIGS: Array<{ name: string; text: string; key: RegExp }> = [
  { name: "sshCommand + promisor + partialClone", text: '[core]\n\tsshCommand = "sh -c \'echo pwned > MARKER.txt\'"\n[extensions]\n\tpartialClone = origin\n[remote "origin"]\n\turl = ssh://127.0.0.1:1/x\n\tpromisor = true\n\tpartialclonefilter = blob:none\n', key: /^core\.sshcommand$/ },
  { name: "fsmonitor", text: '[core]\n\tfsmonitor = "echo pwned > MARKER.txt"\n', key: /^core\.fsmonitor$/ },
  { name: "hooksPath", text: "[core]\n\thooksPath = .evilhooks\n", key: /^core\.hookspath$/ },
  { name: "yalnız promisor", text: '[remote "origin"]\n\turl = ssh://127.0.0.1:1/x\n\tpromisor = true\n', key: /^remote\.origin\.promisor$/ },
  { name: "partialClone", text: "[extensions]\n\tpartialClone = origin\n", key: /^extensions\.partialclone$/ },
  { name: "pager/editor/alias/include/credential/protocol", text: "[core]\n\tpager = evil\n", key: /^core\.pager$/ },
  { name: "alias", text: "[alias]\n\tdiff = !evil\n", key: /^alias\.diff$/ },
  { name: "include", text: "[include]\n\tpath = ../evil.cfg\n", key: /^include\.path$/ },
  { name: "credential", text: "[credential]\n\thelper = evil\n", key: /^credential\.helper$/ },
  { name: "diff.external", text: "[diff]\n\texternal = evil\n", key: /^diff\.external$/ },
  { name: "filter", text: '[filter "x"]\n\tsmudge = evil\n', key: /^filter\.x\.smudge$/ },
];

for (const c of EVIL_CONFIGS) {
  test(`kötü niyetli .git/config (${c.name}): hiçbir git komutu çalışmadan 'unsafe_config'; anahtar adı yazılır, değeri YAZILMAZ; işaretçi dosya oluşmaz`, { skip }, async () => {
    const root = repo();
    appendFileSync(join(root, ".git", "config"), c.text);
    const r = await analyzeRelease(root, "v1.0", "v2.0");
    assert.equal(r.status, "unreadable");
    assert.ok(r.status === "unreadable" && r.code === "unsafe_config", JSON.stringify(r));
    assert.ok(r.status === "unreadable" && typeof r.key === "string" && c.key.test(r.key), `anahtar: ${JSON.stringify(r)}`);
    assert.doesNotMatch(JSON.stringify(r), /pwned|evil|MARKER|127\.0\.0\.1|ssh:/, "değer sızmaz");
    assert.equal(existsSync(join(root, "MARKER.txt")), false, "komut çalışmadı");
    assert.equal(existsSync(join(root, ".evilhooks")), false);
  });
}

test("DANGEROUS_CONFIG: zararsız anahtarlar (user.*, branch.*, remote.origin.url, core.filemode) tehlikeli sayılmaz; depo normal çalışır", { skip }, async () => {
  for (const k of ["user.name", "branch.main.remote", "remote.origin.url", "core.filemode", "core.autocrlf", "core.bare", "gc.auto"]) assert.equal(DANGEROUS_CONFIG.test(k), false, k);
  const root = repo();
  appendFileSync(join(root, ".git", "config"), '[user]\n\tname = x\n[remote "origin"]\n\turl = https://example.invalid/x.git\n[branch "main"]\n\tremote = origin\n');
  const r = await analyzeRelease(root, "v1.0", "v2.0");
  assert.equal(r.status, "ok");
});

// ---- süreç ağacı öldürme (denetim düzeltmesi 6) ---------------------------------------------------------------------------------------------
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
function treeScript(dir: string, floodBytes: number): { args: string[]; pidFile: string } {
  const pidFile = join(dir, "grand.pid");
  const grand = `require("fs").writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setInterval(() => {}, 1000)`;
  const parent = `require("child_process").spawn(process.execPath, ["-e", ${JSON.stringify(grand)}], { stdio: "ignore" }); ${floodBytes > 0 ? `process.stdout.write("x".repeat(${floodBytes}));` : ""} setInterval(() => {}, 1000)`;
  return { args: ["-e", parent], pidFile };
}

test("zaman aşımında SÜREÇ AĞACI (torun dahil) öldürülür; geriye çalışan süreç kalmaz", async () => {
  const dir = mkTmp("agentmom-rel-kill-");
  const { args, pidFile } = treeScript(dir, 0);
  const r = await runCommand(process.execPath, args, { cwd: dir, env: { ...process.env } as Record<string, string>, timeoutMs: 2500, maxBuffer: 1024 * 1024 });
  assert.deepEqual(r, { ok: false, code: "timeout" });
  assert.ok(existsSync(pidFile), "torun süreç başlamıştı");
  const pid = Number(readFileSync(pidFile, "utf8"));
  await sleep(500);
  assert.equal(alive(pid), false, `torun süreç (${pid}) hâlâ çalışıyor`);
});

test("çıktı sınırında süreç ağacı öldürülür ve 'output_limit' döner (zaman aşımını beklemez)", async () => {
  const dir = mkTmp("agentmom-rel-flood-");
  const { args, pidFile } = treeScript(dir, 200_000);
  const t0 = Date.now();
  const r = await runCommand(process.execPath, args, { cwd: dir, env: { ...process.env } as Record<string, string>, timeoutMs: 20_000, maxBuffer: 1000 });
  assert.deepEqual(r, { ok: false, code: "output_limit" });
  assert.ok(Date.now() - t0 < 15_000, "zaman aşımına kadar beklenmedi");
  if (existsSync(pidFile)) {
    const pid = Number(readFileSync(pidFile, "utf8"));
    await sleep(500);
    assert.equal(alive(pid), false, `torun süreç (${pid}) hâlâ çalışıyor`);
  }
});
