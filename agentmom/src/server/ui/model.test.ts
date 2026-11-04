// D8c testleri: model yetenekleri (core.js modelRun, capabilities.js kayıtları, Araştırma sayfasındaki "Model yetenekleri" bölümü) ve internet ayarları eylemi (netSettingsSave, netDomainCheck).
// Sahip: Claude [İP:AgentMom Faz 11, D8c arayüz]. yazan: [Claude#agentmom-d8c-arayuz]. Kaynaklar node:vm içinde; ağ yok, tarayıcı yok, GERÇEK model çağrısı yok.
// Ayarlar bölümü ("İnternet erişimi") testleri settings.test.ts içindedir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { byKey, byTag, buttons, typeInto, okData, noActiveContent, makeEnv, coreEnv, walk, PAGES, J } from "./lab-env.ts";
import type { Env, FNode } from "./lab-env.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const UUID = (n: number): string => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const SECRET = "sk-abcdefghijklmnopqrstuvwx";
const BIDI = String.fromCharCode(0x202e);
const EVIL = "<img src=x onerror=alert(1)><script>alert(2)</script> " + BIDI + "gnp.exe";
const WARN = "sır gibi görünen kodlanmış metin yerel olmayan sağlayıcıya gönderilmez";

const NETF = [{ name: "urls", label: "Adresler", kind: "list", required: false, maxLength: 2000, maxItems: 5, counted: false }, { name: "tickets", label: "Onay biletleri", kind: "map", required: false, maxLength: 200, maxItems: 5 }];
const NET_OFF = { enabled: false, allowedDomains: [] };
const NET_ON = { enabled: true, allowedDomains: ["docs.python.org", "*.wikipedia.org"] };
const netCap = (id: string, madde: number, ad: string, main: Any[], net: Any = NET_ON): Any => ({ id, madde, ad, aciklama: "x", availability: { available: true, reason: "r" }, schema: "s", needsNet: true, net, fields: [...main, ...NETF] });
const CAPS = (over: Record<string, Any> = {}): Any => ({
  capabilities: [
    netCap("research-center", 37, "Araştırma merkezi", [{ name: "question", label: "Soru", kind: "text", required: true, maxLength: 1500 }, { name: "notes", label: "Notlar", kind: "text", required: false, maxLength: 1500 }]),
    netCap("feature-discovery", 38, "Özellik keşfi", [{ name: "projectDescription", label: "Proje tanımı", kind: "text", required: true, maxLength: 2000 }, { name: "constraints", label: "Kısıtlar", kind: "text", required: false, maxLength: 1000 }]),
    netCap("competitor-research", 40, "Rakip araştırması", [{ name: "subject", label: "Konu", kind: "text", required: true, maxLength: 500 }, { name: "compareWith", label: "Karşılaştırılacaklar", kind: "list", required: false, maxLength: 100, maxItems: 4 }]),
    { id: "solution-space", madde: 81, ad: "Çözüm uzayı gezgini", aciklama: "x", availability: { available: true, reason: "claude-code (subscription)" }, schema: "s", fields: [{ name: "problem", label: "Problem", kind: "text", required: true, maxLength: 2500 }, { name: "constraints", label: "Kısıtlar", kind: "list", required: false, maxLength: 300, maxItems: 8 }] },
    { id: "idea-transfer", madde: 82, ad: "Fikir aktarımı", aciklama: "x", availability: { available: true, reason: "r" }, schema: "s", fields: [{ name: "problem", label: "Problem", kind: "text", required: true, maxLength: 2500 }, { name: "disciplines", label: "Kaynak disiplinler", kind: "list", required: true, maxLength: 80, maxItems: 3 }] },
    { id: "inversion", madde: 84, ad: "Tersine çevirme", aciklama: "x", availability: { available: true, reason: "r" }, schema: "s", fields: [{ name: "goal", label: "Hedef", kind: "text", required: true, maxLength: 3000 }] },
    { id: "emergence", madde: 85, ad: "Ortaya çıkan davranış", aciklama: "x", availability: { available: true, reason: "r" }, schema: "s", fields: [{ name: "system", label: "Sistem açıklaması", kind: "text", required: true, maxLength: 3500 }] },
    { id: "multi-horizon", madde: 65, ad: "Çok ufuklu strateji", aciklama: "x", availability: { available: true, reason: "r" }, schema: "s", fields: [{ name: "goal", label: "Hedef", kind: "text", required: true, maxLength: 2500 }, { name: "horizons", label: "Ufuklar", kind: "list", required: true, maxLength: 60, maxItems: 4 }] },
    { id: "intent", madde: 92, ad: "Niyet katmanı", aciklama: "x", availability: { available: true, reason: "r" }, schema: "s", fields: [{ name: "text", label: "İstek", kind: "text", required: true, maxLength: 2500 }] },
  ],
  warnings: [WARN], sandbox: { worktrees: 0 }, ...over,
});

// ================================================================ çekirdek: modelRun
interface Core { c: ReturnType<typeof coreEnv>; AM: Any; dialogs: Any[]; answer: { v: boolean }; runs: Any[] }
function core(opts: { post?: { status: number; body: unknown }; runs?: Any[]; caps?: Any; net?: Any; approve?: (b: Any, n: number) => { status: number; body: unknown } } = {}): Core {
  let approvals = 0;
  const runs = [...(opts.runs ?? [{ status: 200, body: { taskId: UUID(1), status: "done", providerId: "claude-code", result: { untrusted: true, recommendedNext: "x" } } }])];
  const c = coreEnv((p, init) => {
    if (init.method === "POST" && p === "/api/net/approve") { approvals += 1; const b = JSON.parse(init.body); return opts.approve ? opts.approve(b, approvals) : { status: 200, body: { ticket: "TKT-SECRET-" + approvals, expiresAt: "2026-10-23T10:02:00Z", url: new URL(b.url).href } }; }
    if (init.method === "POST" && p.startsWith("/api/capabilities/model/")) return opts.post ?? { status: 202, body: { taskId: UUID(1), providerId: "claude-code" } };
    if (p.startsWith("/api/capabilities/model/runs/")) return runs.length > 1 ? runs.shift() : runs[0];
    return undefined;
  }, ["capabilities.js"]);
  const dialogs: Any[] = [];
  const answer = { v: true };
  c.win.AM_DIALOG.confirm = (o: Any) => { dialogs.push(o); return Promise.resolve(answer.v); };
  const AM = c.win.AM;
  AM.state.data.modelCapabilities = okData(opts.caps ?? CAPS());
  AM.state.data.netSettings = okData({ settings: opts.net ?? NET_ON });
  return { c, AM, dialogs, answer, runs };
}
const modelPosts = (k: Core): Any[] => k.c.posts().filter((x) => x[1].startsWith("/api/capabilities/model/"));
const modelGets = (k: Core): Any[] => k.c.calls.filter((x) => x[0] === "GET" && x[1].startsWith("/api/capabilities/model/runs/"));
const st = (k: Core, id = "solution-space"): Any => k.AM.state.data["modelRun:" + id];

test("modelRun: geçersiz alan (zorunlu eksik, uzun, çok öğe, toplam>4000, tür) istek ve pencere AÇMAZ; Türkçe hata yazılır", async () => {
  const k = core();
  const a = k.AM.actions;
  assert.equal((await a.modelRun("solution-space", { problem: "   " })).invalid, true);
  assert.match(st(k).reason, /Problem boş olamaz/);
  await a.modelRun("solution-space", { problem: "x".repeat(2501) });
  assert.match(st(k).reason, /Problem: en çok 2500 karakter/);
  await a.modelRun("solution-space", { problem: "p", constraints: Array.from({ length: 9 }, () => "k") });
  assert.match(st(k).reason, /Kısıtlar: en çok 8 öğe/);
  await a.modelRun("solution-space", { problem: "p".repeat(2500), constraints: Array.from({ length: 8 }, () => "k".repeat(300)) });
  assert.match(st(k).reason, /toplamı en çok 4000/);
  await a.modelRun("solution-space", { problem: 5 });
  assert.match(st(k).reason, /metin olmalı/);
  await a.modelRun("idea-transfer", { problem: "p", disciplines: [] });
  assert.match(st(k, "idea-transfer").reason, /en az bir öğe/);
  await a.modelRun("solution-space", { problem: "p", constraints: [5] });
  assert.match(st(k).reason, /metin olmalı/);
  assert.equal(k.dialogs.length, 0);
  assert.equal(modelPosts(k).length, 0);
});

test("modelRun: bilinmeyen/biçimsiz kimlik, yüklenmemiş liste, kullanılamaz yetenek ve geçersiz sağlayıcı kimliği istek göndermez", async () => {
  const k = core({ caps: CAPS({ capabilities: [{ ...CAPS().capabilities[3], availability: { available: false, reason: "claude: kapalı" } }] }) });
  const a = k.AM.actions;
  for (const bad of ["../x", "X", "", "a", 5, null, undefined]) await a.modelRun(bad, { problem: "p" });
  await a.modelRun("inversion", { goal: "g" });
  assert.match(st(k, "inversion").reason, /listede yok/);
  const r = await a.modelRun("solution-space", { problem: "p" });
  assert.equal(r.invalid, true);
  assert.equal(st(k).reason, "Kullanılamıyor: claude: kapalı");
  k.AM.state.data.modelCapabilities = okData(CAPS());
  await a.modelRun("solution-space", { problem: "p" }, "Claude Code!");
  assert.match(st(k).reason, /Sağlayıcı kimliği geçersiz/);
  k.AM.state.data.modelCapabilities = { status: "loading", value: null };
  await a.modelRun("solution-space", { problem: "p" });
  assert.match(st(k).reason, /listede yok/);
  assert.equal(k.dialogs.length, 0);
  assert.equal(modelPosts(k).length, 0);
});

test("modelRun: onay penceresi gönderilecek metnin TAMAMINI maskeli gösterir (gösterilen = gönderilen); sır uyarısı pencerede; vazgeçilirse POST yok", async () => {
  const k = core();
  k.answer.v = false;
  const problem = "Uzun problem. " + "a".repeat(2300) + " anahtar " + SECRET + " sonu";
  const r = await k.AM.actions.modelRun("solution-space", { problem, constraints: ["bir kısıt", "  ", "iki " + SECRET] }, "claude-code");
  assert.equal(r.cancelled, true);
  assert.equal(modelPosts(k).length, 0, "vazgeç -> POST yok");
  assert.equal(k.dialogs.length, 1);
  const d = k.dialogs[0];
  assert.equal(d.action, "model.run:solution-space");
  assert.equal(d.targetMax, 16000);
  assert.ok(d.target.length > 2300, "uzun metin kısaltılmadan pencereye verilir");
  assert.ok(!d.target.includes(SECRET), "gizli değer pencerede maskeli");
  assert.ok(d.target.includes("[gizli]") && d.target.includes("Problem: Uzun problem.") && d.target.includes("- bir kısıt") && d.target.includes("- iki [gizli]"));
  assert.ok(!d.target.includes("- \n"), "boş öğe yok");
  assert.match(d.detail, /uygulamadaki modele \(abonelik\)/);
  assert.match(d.detail, /güvenilmez veri sayılır ve kaydedilmez/);
  assert.match(d.detail, /sağlayıcı: claude-code/);
  assert.ok(d.detail.includes(WARN), "sır uyarısı gösterilir");
  assert.equal(d.danger, false);
  // onaylanınca gövde TAM OLARAK pencerede gösterilenle aynı (maskeli)
  k.answer.v = true;
  const p2 = k.AM.actions.modelRun("solution-space", { problem, constraints: ["bir kısıt", "  ", "iki " + SECRET] }, "claude-code");
  await k.c.flush();
  await k.c.tick();
  await p2;
  const [post] = modelPosts(k);
  const body = JSON.parse(post[2]);
  assert.equal(post[1], "/api/capabilities/model/solution-space/run");
  assert.deepEqual(Object.keys(body).sort(), ["input", "providerId"]);
  assert.equal(body.providerId, "claude-code");
  assert.ok(!JSON.stringify(body).includes(SECRET));
  assert.ok(k.dialogs[1].target.includes(body.input.problem), "pencerede gösterilen = gönderilen (problem)");
  assert.deepEqual(body.input.constraints, ["bir kısıt", "iki [gizli]"]);
  assert.ok(k.dialogs[1].target.includes("- " + body.input.constraints[1]));
});

test("modelRun: sır yoksa uyarı satırı eklenmez; onay -> doğru uç/gövde; yoklama 2 sn aralıkla sürer, done'da sonuç state'e yazılır ve kaydedilmez (yalnız bellekte)", async () => {
  const k = core({ runs: [{ status: 200, body: { taskId: UUID(1), status: "running" } }, { status: 200, body: { taskId: UUID(1), status: "running" } }, { status: 200, body: { taskId: UUID(1), status: "done", providerId: "claude-code", result: { families: [], tradeoffs: ["t"], recommendedNext: "n", untrusted: true } } }] });
  const p = k.AM.actions.modelRun("inversion", { goal: "Hedefim" });
  await k.c.flush();
  assert.ok(!k.dialogs[0].detail.includes(WARN), "sır yoksa sır uyarısı yok");
  assert.equal(k.dialogs[0].target, "Hedef: Hedefim");
  const [post] = modelPosts(k);
  assert.deepEqual(JSON.parse(post[2]), { input: { goal: "Hedefim" } }, "otomatik sağlayıcıda providerId gönderilmez");
  assert.equal(st(k, "inversion").status, "loading");
  assert.equal(k.c.timers.length, 1, "ilk yoklama zamanlandı (setTimeout)");
  assert.equal(modelGets(k).length, 0, "beklemeden istek yok");
  await k.c.tick();
  assert.equal(modelGets(k).length, 1);
  assert.equal(modelGets(k)[0][1], "/api/capabilities/model/runs/" + UUID(1));
  assert.equal(st(k, "inversion").status, "loading");
  await k.c.tick();
  assert.equal(st(k, "inversion").status, "loading");
  await k.c.tick();
  const out = await p;
  assert.equal(out.ok, true);
  assert.equal(st(k, "inversion").status, "ok");
  assert.equal(st(k, "inversion").value.providerId, "claude-code");
  assert.equal(st(k, "inversion").value.result.untrusted, true);
  assert.equal(k.c.timers.length, 0, "tamamlanınca yoklama durur");
});

test("modelRun: failed/refused Türkçe hata; kesilen yoklama durur; 5 dakikayı (150 yoklama) aşan koşu zaman aşımı olur", async () => {
  for (const [status, re] of [["failed", /Model çağrısı başarısız oldu: Sağlayıcı çöktü/], ["refused", /Model çağrısı reddedildi: Sağlayıcı çöktü/]] as const) {
    const k = core({ runs: [{ status: 200, body: { taskId: UUID(1), status, error: { code: "x", message: "Sağlayıcı çöktü " + SECRET } } }] });
    const p = k.AM.actions.modelRun("inversion", { goal: "g" });
    await k.c.flush();
    await k.c.tick();
    assert.equal((await p).ok, false);
    assert.equal(st(k, "inversion").status, "error");
    assert.match(st(k, "inversion").reason, re);
    assert.ok(!st(k, "inversion").reason.includes(SECRET));
    assert.equal(k.c.timers.length, 0);
  }
  const k = core({ runs: [{ status: 200, body: { taskId: UUID(1), status: "running" } }] });
  const p = k.AM.actions.modelRun("inversion", { goal: "g" });
  await k.c.flush();
  for (let i = 0; i < 160 && k.c.timers.length; i += 1) await k.c.tick();
  assert.equal((await p).ok, false);
  assert.equal(modelGets(k).length, 150, "en çok 150 yoklama = 5 dakika");
  assert.match(st(k, "inversion").reason, /5 dakika içinde yanıt vermedi/);
  // yoklama 404/hata
  const k2 = core({ runs: [{ status: 404, body: { error: "yok" } }] });
  const p2 = k2.AM.actions.modelRun("inversion", { goal: "g" });
  await k2.c.flush();
  await k2.c.tick();
  await p2;
  assert.match(st(k2, "inversion").reason, /bulunamadı/);
  // bozuk durum
  const k3 = core({ runs: [{ status: 200, body: { taskId: UUID(1), status: "done" } }] });
  const p3 = k3.AM.actions.modelRun("inversion", { goal: "g" });
  await k3.c.flush();
  await k3.c.tick();
  await p3;
  assert.match(st(k3, "inversion").reason, /okunamadı/);
});

test("modelRun: sayfa değişince yoklama durur (istek gitmez), sonuç beklenmesi durduruldu yazılır; sonra yeniden çalıştırılabilir", async () => {
  const k = core({ runs: [{ status: 200, body: { taskId: UUID(1), status: "running" } }] });
  k.AM.actions.setView({ page: "research" });
  const p = k.AM.actions.modelRun("inversion", { goal: "g" });
  await k.c.flush();
  k.AM.actions.setView({ page: "tasks" });
  await k.c.tick();
  const out = await p;
  assert.equal(out.stopped, true);
  assert.equal(modelGets(k).length, 0, "sayfa değişince yoklama isteği gitmez");
  assert.match(st(k, "inversion").reason, /Sayfa değiştiği için/);
  assert.equal(k.c.timers.length, 0);
  k.AM.actions.setView({ page: "research" });
  const r2 = k.AM.actions.modelRun("inversion", { goal: "g" });
  await k.c.flush();
  assert.equal(k.dialogs.length, 2, "meşgul kilidi bırakıldı");
  k.AM.actions.setView({ page: "tasks" });
  await k.c.tick();
  await r2;
});

test("modelRun: sunucu hataları Türkçe (429, 503 neden, 403 sır sınırı, 400, 403, 404, bozuk yanıt); ham iç hata gösterilmez", async () => {
  const cases: Array<[number, Any, RegExp]> = [
    [429, { error: "busy", code: "busy" }, /^Başka bir model yeteneği çalışıyor/],
    [503, { error: "x", code: "provider_unavailable", reason: "claude: kapalı " + SECRET }, /^Uygun sağlayıcı yok: claude: kapalı \[gizli\]$/],
    [403, { error: "x", code: "data_boundary_secret", warnings: [WARN] }, /^Sır içeren metin yerel olmayan sağlayıcıya gönderilemez/],
    [400, { error: "problem boş olamaz", code: "validation" }, /^Sunucu girdiyi kabul etmedi: problem boş olamaz/],
    [403, { error: "reddedildi", code: "refused" }, /^Sunucu isteği reddetti: reddedildi/],
    [404, { error: "bilinmeyen model yeteneği", code: "not_found" }, /bulunamadı/],
    [500, { error: "SELECT * FROM x stack" }, /^İşlem sunucu tarafından kabul edilmedi \(kod 500\)/],
  ];
  for (const [status, body, re] of cases) {
    const k = core({ post: { status, body } });
    const out = await k.AM.actions.modelRun("inversion", { goal: "g" });
    assert.equal(out.ok, false);
    assert.equal(st(k, "inversion").status, "error");
    assert.match(st(k, "inversion").reason, re, String(status));
    assert.ok(!st(k, "inversion").reason.includes("SELECT"));
    assert.equal(k.c.timers.length, 0, "yoklama başlamaz");
  }
  const k = core({ post: { status: 202, body: { taskId: "../x" } } });
  await k.AM.actions.modelRun("inversion", { goal: "g" });
  assert.match(st(k, "inversion").reason, /okunamadı/);
  assert.equal(k.c.timers.length, 0);
});

test("modelRun: çift gönderim yok (koşu sürerken ikinci çağrı pencere açmaz, POST göndermez); bitince yeniden çalışır", async () => {
  const k = core({ runs: [{ status: 200, body: { taskId: UUID(1), status: "done", providerId: "p", result: { untrusted: true } } }] });
  const p1 = k.AM.actions.modelRun("inversion", { goal: "g" });
  const r2 = await k.AM.actions.modelRun("inversion", { goal: "g" });
  const r3 = await k.AM.actions.modelRun("solution-space", { problem: "p" });
  assert.equal(r2.busy, true);
  assert.equal(r3.busy, true, "tek koşu: başka yetenek de bekler (sunucu 429 verirdi)");
  await k.c.flush();
  assert.equal(k.dialogs.length, 1);
  assert.equal(modelPosts(k).length, 1);
  await k.c.tick();
  await p1;
  const p4 = k.AM.actions.modelRun("inversion", { goal: "g" });
  await k.c.flush();
  assert.equal(k.dialogs.length, 2);
  await k.c.tick();
  await p4;
});

test("modelRun: yalnız kullanıcı belirteciyle gider (Authorization), model sonucu asla kaydedilmez (POST yalnız /run)", async () => {
  const k = core();
  const p = k.AM.actions.modelRun("inversion", { goal: "g" });
  await k.c.flush();
  await k.c.tick();
  await p;
  assert.deepEqual(k.c.posts().map((x) => x[1]), ["/api/capabilities/model/inversion/run"], "başka hiçbir yazma isteği yok");
});

// ================================================================ çekirdek: uçlar ve internet ayarları eylemi
test("uçlar: modelCapabilities, modelRun (kimlik doğrulaması), netSettings, netFetches beyaz listede", async () => {
  const k = core();
  await k.AM.actions.loadData("modelCapabilities");
  await k.AM.actions.loadData("netSettings");
  await k.AM.actions.loadData("netFetches");
  await k.AM.actions.loadData("modelRun", UUID(7));
  const paths = k.c.calls.filter((x) => x[0] === "GET").map((x) => x[1]);
  for (const p of ["/api/capabilities/model", "/api/net/settings", "/api/net/fetches", "/api/capabilities/model/runs/" + UUID(7)]) assert.ok(paths.includes(p), p);
  const before = k.c.calls.length;
  for (const bad of ["../x", "ABC", "", "0".repeat(35), UUID(1) + "/x", 5]) await k.AM.actions.loadData("modelRun", bad);
  assert.equal(k.c.calls.length, before, "geçersiz görev kimliğinde istek yok");
});

test("netDomainCheck: geçerli adlar normalleşir; IP, localhost, .local, tek etiket, yol, joker hatası reddedilir", () => {
  const k = core();
  const chk = (s: unknown): Any => JSON.parse(JSON.stringify(k.AM.actions.netDomainCheck(s)));
  assert.deepEqual(chk("docs.python.org"), { ok: true, value: "docs.python.org" });
  assert.deepEqual(chk("  *.Wikipedia.ORG "), { ok: true, value: "*.wikipedia.org" });
  assert.deepEqual(chk("bücher.de"), { ok: true, value: "xn--bcher-kva.de" });
  for (const [bad, re] of [
    ["10.0.0.1", /IP adresi/], ["8.8.8.8", /IP adresi/], ["[::1]", /geçersiz karakter/], ["::1", /geçersiz karakter/], ["localhost", /Tek etiketli/], ["a.localhost", /Yerel/], ["printer.local", /Yerel/], ["x.internal", /Yerel/],
    ["intranet", /Tek etiketli/], ["foo", /Tek etiketli/], ["a/b.com", /geçersiz karakter/], ["https://x.com", /geçersiz karakter/], ["x.com:8080", /geçersiz karakter/], ["a b.com", /geçersiz karakter/],
    ["*.com", /Tek etiketli/], ["ex*mple.com", /Joker/], ["*.", /Joker/], ["", /1 ile 100/], ["a".repeat(101) + ".com", /1 ile 100/], [".example.net", /nokta/], ["x.0x1", /IP adresi/], ["bad_label.com", /etiketleri geçersiz/], [5, /metin olmalı/], [null, /metin olmalı/],
  ] as Array<[unknown, RegExp]>) {
    const r = chk(bad);
    assert.equal(r.ok, false, String(bad));
    assert.match(r.message, re, String(bad));
  }
});

test("netSettingsSave: geçersiz girdi (IP, localhost, .local, tek etiket, 51 alan adı, boş listeyle açma, tür hatası) pencere AÇMAZ ve POST göndermez", async () => {
  const k = core();
  const a = k.AM.actions;
  const bad = (f: Any) => a.netSettingsSave({ perUseApproval: true, enabled: false, allowedDomains: [], ...f });
  for (const d of ["10.0.0.1", "localhost", "x.local", "tek", "a/b.com"]) {
    assert.equal((await bad({ allowedDomains: ["ok.example.net", d] })).invalid, true, d);
    assert.equal(k.AM.state.data.netSettingsSave.status, "error");
  }
  await bad({ allowedDomains: Array.from({ length: 51 }, (_, i) => "h" + i + ".example.net") });
  assert.match(k.AM.state.data.netSettingsSave.reason, /En çok 50 alan adı/);
  await bad({ enabled: true, allowedDomains: [] });
  assert.match(k.AM.state.data.netSettingsSave.reason, /en az bir izinli alan adı/);
  await bad({ enabled: "evet" });
  await bad({ perUseApproval: 1 });
  await bad({ allowedDomains: "docs.python.org" });
  assert.equal(k.dialogs.length, 0);
  assert.equal(k.c.posts().length, 0);
});

test("netSettingsSave: açma onay penceresi alan adlarını gösterir; vazgeç -> POST yok; onay -> doğru gövde (sıralı, tekrarsız), liste yenilenir; kapatma boş listeyle olur", async () => {
  const k = core();
  const a = k.AM.actions;
  k.answer.v = false;
  const r0 = await a.netSettingsSave({ enabled: true, allowedDomains: ["Docs.Python.org", "*.wikipedia.org", "docs.python.org"], perUseApproval: true });
  assert.equal(r0.cancelled, true);
  assert.equal(k.c.posts().length, 0);
  const d = k.dialogs[0];
  assert.equal(d.title, "İnternet erişimi açılsın mı?");
  assert.equal(d.action, "net.settings");
  assert.equal(d.target, "*.wikipedia.org, docs.python.org");
  assert.match(d.detail, /İnternet erişimi açılıyor/);
  assert.match(d.detail, /2 izinli alan adına/);
  assert.match(d.detail, /Her kullanımda onay: evet/);
  assert.equal(d.danger, false);
  k.answer.v = true;
  const r1 = await a.netSettingsSave({ enabled: true, allowedDomains: ["Docs.Python.org", "*.wikipedia.org", "docs.python.org"], perUseApproval: false });
  assert.equal(r1.ok, true);
  assert.equal(k.dialogs[1].danger, true, "onay istemeden açmak tehlikeli sayılır (varsayılan odak İptal)");
  const p = k.c.posts()[0]!;
  assert.equal(p[1], "/api/net/settings");
  assert.deepEqual(JSON.parse(p[2]!), { enabled: true, allowedDomains: ["*.wikipedia.org", "docs.python.org"], perUseApproval: false });
  const gets = k.c.calls.filter((x) => x[0] === "GET").map((x) => x[1]);
  assert.ok(gets.includes("/api/net/settings") && gets.includes("/api/net/fetches"), "kayıttan sonra ayar ve getirme listesi yenilenir");
  assert.equal(k.AM.state.data.netSettingsSave.status, "ok");
  const r2 = await a.netSettingsSave({ enabled: false, allowedDomains: [], perUseApproval: true });
  assert.equal(r2.ok, true);
  assert.equal(k.dialogs[2].title, "İnternet erişimi kapatılsın mı?");
  assert.match(k.dialogs[2].detail, /internete hiç çıkmaz/);
  assert.equal(k.dialogs[2].target, "(izinli alan adı yok)");
});

test("netSettingsSave: sunucu hataları Türkçe; çift gönderim yok", async () => {
  const c = coreEnv((p, init) => (init.method === "POST" && p === "/api/net/settings" ? { status: 400, body: { error: "alan adı geçersiz" } } : undefined), ["capabilities.js"]);
  c.win.AM_DIALOG.confirm = () => Promise.resolve(true);
  const a = c.win.AM.actions;
  const p1 = a.netSettingsSave({ enabled: false, allowedDomains: [], perUseApproval: true });
  const r2 = await a.netSettingsSave({ enabled: false, allowedDomains: [], perUseApproval: true });
  assert.equal(r2.busy, true);
  assert.equal((await p1).ok, false);
  assert.match(c.win.AM.state.data.netSettingsSave.reason, /Ayarlar sunucu tarafından kabul edilmedi: alan adı geçersiz/);
  assert.equal(c.posts().length, 1);
  const c2 = coreEnv((p, init) => (init.method === "POST" ? { status: 403, body: { error: "x" } } : undefined));
  c2.win.AM_DIALOG.confirm = () => Promise.resolve(true);
  await c2.win.AM.actions.netSettingsSave({ enabled: false, allowedDomains: [], perUseApproval: true });
  assert.match(c2.win.AM.state.data.netSettingsSave.reason, /yalnız kullanıcı/i);
});

// ================================================================ katalog
test("katalog: dokuz model yeteneği kayıtlı (81, 82, 84, 85, 65, 92, 37, 38, 40); sayfa 'research', bölüm kartı gerçekten var", () => {
  const e = makeEnv(PAGES, ["capabilities.js"]);
  const cat = (e.win.AM_CAPABILITIES as Any[]).filter((c) => c.tur === "model");
  assert.deepEqual(J(cat.map((c) => c.id).sort((a, b) => a - b)), [37, 38, 40, 65, 75, 81, 82, 84, 85, 92]);
  e.go("research");
  for (const c of cat) {
    assert.deepEqual(JSON.parse(JSON.stringify(c.nasil)), ["kullanıcı isteği"]);
    assert.equal(c.sayfa, "research");
    assert.ok(walk(e.host).some((n) => n.id === c.bolum || n.attrs["id"] === c.bolum), c.bolum + " başlığı sayfada");
  }
});

// ================================================================ Araştırma sayfası: Model yetenekleri
function page(setup?: (e: Env) => void, param = ""): Env {
  const e = makeEnv(PAGES, ["capabilities.js"]);
  const calls = e.calls as Any[];
  e.AM.actions.modelRun = (...args: Any[]) => { calls.push(["modelRun", ...args]); return Promise.resolve({ ok: true }); };
  e.AM.actions.openCapability = (id: number) => { calls.push(["openCapability", id]); return Promise.resolve(); };
  e.AM.state.providers = [{ id: "claude-code", displayName: "Claude Code", routeKind: "subscription" }, { id: "paid", displayName: "Ücretli", routeKind: "api_paid" }];
  setup?.(e);
  e.go("research", param);
  return e;
}
const toggle = (e: Env, slug: string): FNode => byKey(e.host, "lab-toggle:am-model-" + slug)!;
const openCard = (e: Env, slug: string): void => { buttons(toggle(e, slug).parentNode!, /^Aç$/)[0]!.click(); e.P.rerender(); };
const SLUGS = ["solution-space", "idea-transfer", "inversion", "emergence", "multi-horizon", "intent"];
const mc = (e: Env, extra?: Any): void => { e.AM.state.data.modelCapabilities = okData(extra ?? CAPS()); };

test("Model yetenekleri: bölüm ve altı kart kapalı başlar; açılmadan model verisi istenmez; mevcut bölümler korunur", () => {
  const e = page();
  assert.ok(e.host.textContent.includes("Model yetenekleri"));
  assert.ok(e.host.textContent.includes("Karar laboratuvarı") && e.host.textContent.includes("Karar soy ağacı"));
  assert.ok(e.host.textContent.includes("kendiliğinden çalışmaz"));
  for (const s of SLUGS) assert.equal(toggle(e, s).attrs["aria-expanded"], "false", s);
  assert.ok(e.host.textContent.includes("Çözüm uzayı gezgini (madde 81)") && e.host.textContent.includes("Niyet katmanı (madde 92)") && e.host.textContent.includes("Çok ufuklu strateji (madde 65)"));
  assert.ok(!e.loads().some((c) => c[1] === "modelCapabilities"));
  assert.doesNotMatch(e.host.textContent, /⟦/);
});

test("Model yetenekleri: kart açılınca liste istenir (yükleniyor); yetenekler menüsünden gelinen kart açılır", () => {
  const e = page();
  openCard(e, "inversion");
  assert.ok(e.loads().some((c) => c[1] === "modelCapabilities"));
  assert.ok(e.host.textContent.includes("Model yetenekleri yükleniyor"));
  const e2 = page(undefined, "bolum:am-model-emergence:1");
  assert.equal(toggle(e2, "emergence").attrs["aria-expanded"], "true");
  assert.equal(toggle(e2, "inversion").attrs["aria-expanded"], "false");
});

test("Model yetenekleri: sunucu listesi hata verirse hata kartı (neden) ve yeniden dene; yetenek listede yoksa dürüst hata", () => {
  const e = page((x) => { x.AM.state.data.modelCapabilities = { status: "error", value: null, reason: "503: kapalı" }; });
  openCard(e, "inversion");
  assert.ok(e.host.textContent.includes("Model yetenekleri alınamadı") && e.host.textContent.includes("503: kapalı"));
  const e2 = page((x) => mc(x, CAPS({ capabilities: [] })));
  openCard(e2, "inversion");
  assert.ok(e2.host.textContent.includes("Bu yetenek sunucu listesinde yok"));
});

test("Model yetenekleri: form alanları yeteneğin alanlarına göre, karakter sayacı ve sınırlarla; sağlayıcı seçici ücretli rotayı göstermez", () => {
  const e = page(mc);
  openCard(e, "solution-space");
  const prob = byKey(e.host, "model-solution-space-problem")!;
  const cons = byKey(e.host, "model-solution-space-constraints")!;
  assert.equal(prob.tag, "textarea");
  assert.equal(cons.tag, "textarea");
  assert.equal(prob.attrs["maxlength"], "2500");
  assert.ok(e.host.textContent.includes("0 / 2500 karakter"));
  assert.ok(e.host.textContent.includes("(isteğe bağlı)"));
  assert.ok(e.host.textContent.includes("en çok 8 öğe"));
  typeInto(prob, "Merhaba dünya");
  assert.ok(e.host.textContent.includes("13 / 2500 karakter"), "sayaç yazdıkça güncellenir");
  typeInto(cons, "bir\n\niki");
  assert.ok(e.host.textContent.includes("2 öğe (en çok 8)"));
  const sel = byKey(e.host, "model-solution-space-provider")!;
  const opts = byTag(sel, "option").map((o) => o.textContent);
  assert.deepEqual(opts, ["Otomatik (önerilen)", "Claude Code"]);
  assert.ok(e.host.textContent.includes("4000 karakter"));
  openCard(e, "idea-transfer");
  assert.ok(byKey(e.host, "model-idea-transfer-disciplines"));
  assert.ok(!e.host.textContent.includes("Kaynak disiplinler (isteğe bağlı)"), "zorunlu alan isteğe bağlı yazmaz");
});

test("Model yetenekleri: Çalıştır AM.actions.modelRun'ı alanlar ve sağlayıcıyla çağırır; yoksa sağlayıcı boş; yeniden çizimde yazılan metin korunur", () => {
  const e = page(mc);
  openCard(e, "solution-space");
  typeInto(byKey(e.host, "model-solution-space-problem")!, "Sorunum");
  typeInto(byKey(e.host, "model-solution-space-constraints")!, "k1\nk2");
  e.P.rerender();
  assert.equal(byKey(e.host, "model-solution-space-problem")!.value, "Sorunum");
  byKey(e.host, "model-run-solution-space")!.click();
  assert.deepEqual(J((e.calls as Any[]).find((c) => c[0] === "modelRun")), ["modelRun", "solution-space", { problem: "Sorunum", constraints: ["k1", "k2"] }, ""]);
  typeInto(byKey(e.host, "model-solution-space-provider")!, "claude-code");
  byKey(e.host, "model-run-solution-space")!.click();
  assert.equal(((e.calls as Any[]).filter((c) => c[0] === "modelRun")[1] as Any[])[3], "claude-code");
});

test("Model yetenekleri: kullanılamayan yetenek gri + 'Kullanılamıyor: neden'; Çalıştır pasif ve tıklama çağrı yapmaz", () => {
  const e = page((x) => mc(x, CAPS({ capabilities: [{ ...CAPS().capabilities[5], availability: { available: false, reason: "claude: kapalı; codex: kota" } }] })));
  openCard(e, "inversion");
  assert.ok(e.host.textContent.includes("Kullanılamıyor: claude: kapalı; codex: kota"));
  const run = byKey(e.host, "model-run-inversion")!;
  assert.equal(run.disabled, true);
  run.click();
  assert.equal((e.calls as Any[]).filter((c) => c[0] === "modelRun").length, 0);
  // neden yoksa dürüst varsayılan
  const e2 = page((x) => mc(x, CAPS({ capabilities: [{ ...CAPS().capabilities[5], availability: { available: false, reason: "" } }] })));
  openCard(e2, "inversion");
  assert.ok(e2.host.textContent.includes("Kullanılamıyor: uygun sağlayıcı yok"));
});

test("Model yetenekleri: çalışırken ilerleme + iptal edilemez uyarısı, düğme pasif; başka yetenekte de pasif (tek koşu); hata nedeni görünür", () => {
  const e = page((x) => { mc(x); x.AM.state.data["modelRun:inversion"] = { status: "loading", value: null, phase: "run" }; });
  openCard(e, "inversion");
  assert.ok(e.host.textContent.includes("Model çalışıyor") && e.host.textContent.includes("iptal edilemez"));
  assert.equal(byKey(e.host, "model-run-inversion")!.disabled, true);
  openCard(e, "intent");
  assert.equal(byKey(e.host, "model-run-intent")!.disabled, true, "tek koşu kilidi");
  const e2 = page((x) => { mc(x); x.AM.state.data["modelRun:inversion"] = { status: "error", value: null, reason: "Uygun sağlayıcı yok: claude: kapalı" }; });
  openCard(e2, "inversion");
  assert.ok(e2.host.textContent.includes("Model yeteneği çalıştırılamadı") && e2.host.textContent.includes("Uygun sağlayıcı yok: claude: kapalı"));
  assert.ok(!e2.host.textContent.includes("güvenilmez veri; doğrulayın"), "hata durumunda sonuç etiketi yok");
});

// Sunucu şemalarına uygun örnek sonuçlar (src/capabilities/model/*.ts örnekleri); metinlere XSS yükü ve sır konur.
const RESULTS: Record<string, Any> = {
  "solution-space": { families: [{ name: "Önbellek " + EVIL, idea: "Sık okunan veriyi tut " + SECRET, pros: ["Hızlı"], cons: ["Bayatlama"], assumptions: ["Okuma ağırlıklı"] }], tradeoffs: ["Hız ile tazelik"], recommendedNext: "Önce ölç.", untrusted: true },
  "idea-transfer": { transfers: [{ discipline: "Ekoloji", concept: "Taşıma kapasitesi", mapping: "Kuyruğu kaynakla eşle " + EVIL, risks: ["Benzetme sınırlı"] }], untrusted: true },
  "inversion": { inversions: [{ failureMode: "Kimse kullanmaz", whyItHappens: "Değer belirsiz " + EVIL, preventions: ["Erken görüşme"] }], premortem: "Bir yıl sonra proje durdu.", untrusted: true },
  "emergence": { behaviors: [{ description: "Yeniden denemeler yükü katlar " + EVIL, trigger: "Yavaş yanıt", likelihood: "medium", mitigation: "Geri çekilme" }, { description: "B", trigger: "T", likelihood: "high", mitigation: "M" }, { description: "C", trigger: "T", likelihood: "low", mitigation: "M" }], untrusted: true },
  "multi-horizon": { horizons: [{ name: "kısa " + EVIL, objectives: ["İlk sürüm"], risks: ["Zaman"], dependsOn: [] }, { name: "uzun", objectives: ["Ölçek"], risks: ["Maliyet"], dependsOn: ["kısa"] }], consistencyNotes: ["Kısa ufuk uzunun temelidir."], untrusted: true },
  "intent": { intent: "madde-70", params: { file: "src/a.ts " + EVIL, derinlik: 3, acik: true }, explanation: "İstek bir dosyanın etkisini soruyor " + EVIL, untrusted: true },
};
const MUST: Record<string, string[]> = {
  "solution-space": ["Çözüm aileleri", "Önbellek", "Artılar", "Eksiler", "Varsayımlar", "Ödünleşimler", "Hız ile tazelik", "Önerilen ilk adım", "Önce ölç."],
  "idea-transfer": ["Aktarımlar", "Ekoloji", "Taşıma kapasitesi", "Kuyruğu kaynakla eşle", "Benzetme sınırlı"],
  "inversion": ["Ters çevirmeler", "Kimse kullanmaz", "Değer belirsiz", "Erken görüşme", "Ön-ölüm analizi", "Bir yıl sonra proje durdu."],
  "emergence": ["Ortaya çıkabilecek davranışlar", "Yeniden denemeler yükü katlar", "Orta", "Yüksek", "Düşük", "Geri çekilme"],
  "multi-horizon": ["Ufuklar", "kısa", "İlk sürüm", "Zaman", "Bağımlılıklar", "Ufuklar arası tutarlılık notları", "Kısa ufuk uzunun temelidir."],
  "intent": ["Önerilen yetenek", "Etki haritası (madde-70)", "src/a.ts", "derinlik", "Açıklama", "hiçbir yetenek çalıştırılmadı"],
};

test("Model yetenekleri: her yeteneğin sonucu kendi görünümüyle çizilir; HER sonuçta 'güvenilmez veri' etiketi + sağlayıcı adı; XSS yükü etkisiz, sır maskeli", () => {
  for (const slug of SLUGS) {
    const e = page((x) => { mc(x); x.AM.state.data["modelRun:" + slug] = okData({ capabilityId: slug, providerId: "claude-code", result: RESULTS[slug], warnings: [] }); });
    openCard(e, slug);
    const t = e.host.textContent;
    assert.ok(t.includes("Model çıktısı — güvenilmez veri; doğrulayın"), slug + ": güvenilmez etiketi");
    assert.ok(t.includes("Sağlayıcı: claude-code"), slug + ": sağlayıcı adı");
    assert.ok(t.includes("kaydedilmez"), slug + ": kaydedilmez notu");
    for (const m of MUST[slug]!) assert.ok(t.includes(m), slug + ": '" + m + "'");
    noActiveContent(e.host);
    assert.ok(!t.includes(SECRET), slug + ": sır maskeli");
    assert.ok(!t.includes(BIDI), slug + ": bidi karakteri temizli");
    assert.doesNotMatch(t, /⟦/);
  }
  const t = page((x) => { mc(x); x.AM.state.data["modelRun:emergence"] = okData({ capabilityId: "emergence", providerId: "p", result: RESULTS.emergence, warnings: [] }); }).host;
  assert.ok(t);
});

test("Model yetenekleri: XSS yükü metin olarak görünür (etiket çalışmaz), tablolar gerçek tablo; olasılık rozeti tonları", () => {
  const e = page((x) => { mc(x); x.AM.state.data["modelRun:emergence"] = okData({ capabilityId: "emergence", providerId: "p", result: RESULTS.emergence, warnings: [] }); });
  openCard(e, "emergence");
  assert.ok(e.host.textContent.includes("<img src=x onerror=alert(1)><script>alert(2)</script>"), "yük düz metin olarak görünür");
  assert.equal(byTag(e.host, "script").length + byTag(e.host, "img").length, 0);
  assert.ok(byTag(e.host, "table").length >= 1);
  const chips = walk(e.host).filter((n) => /am-more-chip--(warn|bad|muted)/.test(n.className) && /^(Orta|Yüksek|Düşük)$/.test(n.textContent));
  assert.deepEqual(chips.map((c) => c.textContent + ":" + (/--(\w+)/.exec(c.className) ?? [])[1]), ["Orta:warn", "Yüksek:bad", "Düşük:muted"]);
});

test("Model yetenekleri: uyarılar (sunucu) gösterilir; bozuk/eksik sonuç şekli hata kartı olur, çökmez", () => {
  const e = page((x) => { mc(x); x.AM.state.data["modelRun:inversion"] = okData({ capabilityId: "inversion", providerId: "p", result: RESULTS.inversion, warnings: [WARN] }); });
  openCard(e, "inversion");
  assert.ok(e.host.textContent.includes("Uyarılar") && e.host.textContent.includes(WARN));
  for (const slug of SLUGS) {
    const bad = page((x) => { mc(x); x.AM.state.data["modelRun:" + slug] = okData({ capabilityId: slug, providerId: "p", result: { untrusted: true }, warnings: [] }); });
    openCard(bad, slug);
    assert.ok(bad.host.textContent.includes("güvenilmez veri; doğrulayın"), slug);
    assert.ok(bad.host.textContent.includes("beklenen biçimde değil") || slug === "intent", slug);
    const bad2 = page((x) => { mc(x); x.AM.state.data["modelRun:" + slug] = okData({ capabilityId: slug, providerId: "p", result: "dize", warnings: [] }); });
    openCard(bad2, slug);
    assert.ok(bad2.host.textContent.includes("beklenen biçimde değil"), slug);
  }
});

test("Niyet katmanı (92): öneri 'Menüde aç' ile yalnız GEZİNİR (openCapability); hiçbir yeteneği kendiliğinden çalıştırmaz; 'none' ve katalogda olmayan kimlik dürüst", () => {
  const e = page((x) => { mc(x); x.AM.state.data["modelRun:intent"] = okData({ capabilityId: "intent", providerId: "p", result: RESULTS.intent, warnings: [] }); });
  openCard(e, "intent");
  const calls = e.calls as Any[];
  assert.equal(calls.filter((c) => c[0] === "modelRun").length, 0, "çizim hiçbir şey çalıştırmaz");
  assert.equal(calls.filter((c) => c[0] === "openCapability").length, 0);
  const open = byKey(e.host, "model-intent-open")!;
  assert.match(open.textContent, /Menüde aç: Etki haritası/);
  open.click();
  assert.deepEqual(calls.filter((c) => c[0] === "openCapability"), [["openCapability", 70]]);
  assert.equal(calls.filter((c) => c[0] === "modelRun").length, 0, "tıklama yalnız gezinir");
  // model yeteneği önerisi (slug) katalogdaki kartı açar
  const e2 = page((x) => { mc(x); x.AM.state.data["modelRun:intent"] = okData({ capabilityId: "intent", providerId: "p", result: { intent: "inversion", params: {}, explanation: "e", untrusted: true }, warnings: [] }); });
  openCard(e2, "intent");
  byKey(e2.host, "model-intent-open")!.click();
  assert.deepEqual((e2.calls as Any[]).filter((c) => c[0] === "openCapability"), [["openCapability", 84]]);
  assert.ok(e2.host.textContent.includes("Parametre önerilmedi."));
  // none
  const e3 = page((x) => { mc(x); x.AM.state.data["modelRun:intent"] = okData({ capabilityId: "intent", providerId: "p", result: { intent: "none", params: {}, explanation: "e", untrusted: true }, warnings: [] }); });
  openCard(e3, "intent");
  assert.ok(e3.host.textContent.includes("Katalogda bu isteğe uygun bir yetenek bulunamadı."));
  assert.equal(byKey(e3.host, "model-intent-open"), undefined);
  // katalogda olmayan kimlik
  const e4 = page((x) => { mc(x); x.AM.state.data["modelRun:intent"] = okData({ capabilityId: "intent", providerId: "p", result: { intent: "madde-999", params: {}, explanation: "e", untrusted: true }, warnings: [] }); });
  openCard(e4, "intent");
  assert.equal(byKey(e4.host, "model-intent-open"), undefined);
  assert.ok(e4.host.textContent.includes("Katalogda bulunamadı"));
});

test("Model yetenekleri: sayfa ve bölüm kaynakta innerHTML/localStorage/fetch kullanmaz", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("./page-research.js", import.meta.url), "utf8") + fs.readFileSync(new URL("./core.js", import.meta.url), "utf8") + fs.readFileSync(new URL("./capabilities.js", import.meta.url), "utf8");
  for (const re of [/innerHTML/, /outerHTML/, /insertAdjacentHTML/, /localStorage/]) assert.doesNotMatch(src, re);
  assert.doesNotMatch(fs.readFileSync(new URL("./page-research.js", import.meta.url), "utf8") + fs.readFileSync(new URL("./capabilities.js", import.meta.url), "utf8"), /\.style\b|setAttribute\(\s*["']style/);
  assert.equal((src.match(/\bfetch\s*\(/g) ?? []).length, 2, "ağ istekleri yalnız core.js içinde (api() ve /health); yeni kod ekleme yapmadı");
});

// ================================================================ D8c-UI-2: internetli model yetenekleri (37, 38, 40)
const GOOD = "https://docs.python.org/3/library/asyncio.html";
const GOOD2 = "https://en.wikipedia.org/wiki/Event_loop";
const approves = (k: Core): Any[] => k.c.posts().filter((x) => x[1] === "/api/net/approve");
const allText = (k: Core): string => JSON.stringify([k.AM.state.data, k.AM.log, k.dialogs]);

test("internetli yetenek: adres doğrulaması istemcide (şema, boşluk, kullanıcı bilgisi, IP, localhost, yerel ad, çift, 6 adres, 2001 karakter) — pencere, bilet ve istek YOK", async () => {
  const k = core();
  const run = (urls: Any) => k.AM.actions.modelRun("research-center", { question: "q", urls });
  const cases: Array<[Any, RegExp]> = [
    [["ftp://docs.python.org/a"], /http ya da https adresi olmalı/],
    [["javascript:alert(1)"], /http ya da https adresi olmalı/],
    [["docs.python.org"], /http ya da https adresi olmalı/],
    [["https://docs.python.org/a b"], /boşluk içermemeli/],
    [["https://user:pw@docs.python.org/"], /kullanıcı adı ya da parola/],
    [["http://127.0.0.1/"], /IP adresi/],
    [["http://10.0.0.5:8080/x"], /IP adresi/],
    [["http://[::1]/"], /IP adresi|geçersiz/],
    [["http://localhost/"], /Alan adı kabul edilmez/],
    [["http://printer.local/"], /Alan adı kabul edilmez/],
    [["http://intranet/"], /Alan adı kabul edilmez/],
    [[GOOD, GOOD], /Aynı adres iki kez/],
    [[GOOD, GOOD2, GOOD + "?a=1", GOOD + "?a=2", GOOD + "?a=3", GOOD + "?a=4"], /en çok 5 öğe/],
    [["https://docs.python.org/" + "a".repeat(2000)], /en çok 2000 karakter/],
    [[5], /metin olmalı/],
  ];
  for (const [urls, re] of cases) {
    const r = await run(urls);
    assert.equal(r.invalid, true, JSON.stringify(urls).slice(0, 60));
    assert.match(st(k, "research-center").reason, re, JSON.stringify(urls).slice(0, 60));
  }
  assert.equal(k.dialogs.length, 0);
  assert.equal(approves(k).length, 0);
  assert.equal(modelPosts(k).length, 0);
});

test("internetli yetenek: URL alanı toplam 4000 karakter sınırına sayılmaz; boş satırlar atlanır", async () => {
  const k = core();
  k.answer.v = false;
  const long = "https://docs.python.org/" + "a".repeat(1900);
  const r = await k.AM.actions.modelRun("research-center", { question: "q".repeat(1500), notes: "n".repeat(1500), urls: [long, "", "  ", long + "b", long + "c", long + "d"] });
  assert.equal(r.cancelled, true, "geçerli: pencere açıldı, vazgeçildi");
  assert.equal(k.dialogs.length, 1);
  assert.equal(k.dialogs[0].target.split("\n").filter((l: string) => /^[0-9]\. https:/.test(l)).length, 4);
  assert.equal(approves(k).length, 0, "vazgeçilince bilet alınmaz");
  assert.equal(modelPosts(k).length, 0);
});

test("internetli yetenek: internet KAPALIYKEN adresli çalıştırma pencere açmaz, bilet/istek göndermez; Ayarlar'a yönlendirme eylemi işaretlenir", async () => {
  const k = core({ net: { enabled: false, allowedDomains: ["docs.python.org"] } });
  const r = await k.AM.actions.modelRun("research-center", { question: "q", urls: [GOOD] });
  assert.equal(r.invalid, true);
  assert.match(st(k, "research-center").reason, /İnternet erişimi kapalı/);
  assert.match(st(k, "research-center").reason, /Ayarlar > İnternet erişimi/);
  assert.equal(st(k, "research-center").action, "settings");
  assert.equal(k.dialogs.length + approves(k).length + modelPosts(k).length, 0);
  // izinli listede olmayan alan adı
  const k2 = core({ net: { enabled: true, allowedDomains: ["docs.python.org"] } });
  await k2.AM.actions.modelRun("research-center", { question: "q", urls: [GOOD, "https://evil.example.net/x"] });
  assert.match(st(k2, "research-center").reason, /izinli listede değil: evil\.example\.net/);
  assert.equal(st(k2, "research-center").action, "settings");
  assert.equal(k2.dialogs.length + approves(k2).length + modelPosts(k2).length, 0);
  // joker yalnız alt alan adlarını kapsar
  await k2.AM.actions.modelRun("research-center", { question: "q", urls: ["https://wikipedia.org/x"] });
  assert.match(st(k2, "research-center").reason, /izinli listede değil/);
  // ayar okunamadıysa çalıştırılmaz
  const k3 = core();
  k3.AM.state.data.netSettings = { status: "error", value: null, reason: "500" };
  await k3.AM.actions.modelRun("research-center", { question: "q", urls: [GOOD] });
  assert.match(st(k3, "research-center").reason, /İnternet ayarı okunamadı/);
  assert.equal(k3.dialogs.length, 0);
});

test("internetli yetenek: internet kapalıyken ADRESSİZ (kaynaksız mod) çalışır; pencere kaynaksız modu söyler; gövdede urls/tickets yok", async () => {
  const k = core({ net: NET_OFF });
  const p = k.AM.actions.modelRun("research-center", { question: "Soru?" });
  await k.c.flush();
  assert.match(k.dialogs[0].detail, /kaynaksız mod/);
  assert.equal(approves(k).length, 0);
  await k.c.tick();
  assert.equal((await p).ok, true);
  assert.deepEqual(JSON.parse(modelPosts(k)[0][2]), { input: { question: "Soru?" } });
});

test("internetli yetenek: onay penceresi HER adresi ve alan adını listeler; onaydan sonra URL başına bilet alınır, run gövdesi doğru; biletler hiçbir yere sızmaz", async () => {
  const k = core();
  const p = k.AM.actions.modelRun("research-center", { question: "Soru?", notes: "not", urls: [GOOD, "  " + GOOD2 + "#bolum  "] }, "claude-code");
  await k.c.flush();
  const d = k.dialogs[0];
  assert.match(d.target, /Şu adresler getirilecek ve içerikleri modele GÜVENİLMEZ VERİ olarak verilecek:/);
  assert.ok(d.target.includes("1. " + GOOD + " (alan adı: docs.python.org)"));
  assert.ok(d.target.includes("2. " + GOOD2 + " (alan adı: en.wikipedia.org)"), "parça (#) atılır; gösterilen = gönderilen");
  assert.ok(d.target.includes("Soru: Soru?"));
  assert.equal(d.targetMax, 16000);
  assert.match(d.detail, /GET ile getirilir/);
  assert.match(d.detail, /2 dakika geçerli/);
  assert.deepEqual(approves(k).map((x) => JSON.parse(x[2])), [{ url: GOOD }, { url: GOOD2 }], "onaydan sonra, her adres için tek tek");
  await k.c.tick();
  const out = await p;
  assert.equal(out.ok, true);
  const body = JSON.parse(modelPosts(k)[0][2]);
  assert.deepEqual(body.input.urls, [GOOD, GOOD2]);
  assert.deepEqual(body.input.tickets, { [GOOD]: "TKT-SECRET-1", [GOOD2]: "TKT-SECRET-2" });
  assert.equal(body.input.question, "Soru?");
  assert.equal(body.providerId, "claude-code");
  const dump = allText(k);
  assert.ok(!dump.includes("TKT-SECRET"), "bilet state/günlük/pencerede yok");
  assert.ok(!Object.keys(k.AM.state.data).some((x) => x.toLowerCase().includes("ticket")));
  // sıra: pencere -> approve -> run
  const order = k.c.calls.filter((x) => x[0] === "POST").map((x) => x[1]);
  assert.deepEqual(order, ["/api/net/approve", "/api/net/approve", "/api/capabilities/model/research-center/run"]);
});

test("internetli yetenek: bilet alınamazsa (403 net_disabled / host_not_allowed / başka) Türkçe hata gösterilir ve run POST'u GİTMEZ", async () => {
  for (const [body, re] of [
    [{ error: "internet erişimi kapalı", code: "net_disabled", howToEnable: "x" }, /İnternet erişimi kapalı\. Ayarlar > İnternet erişimi'nden açın/],
    [{ error: "bu ana bilgisayar izinli değil", code: "host_not_allowed" }, /izinli listede değil: en\.wikipedia\.org/],
    [{ error: "adres geçersiz", code: "invalid_url" }, /Onay bileti alınamadı: adres geçersiz/],
  ] as Array<[Any, RegExp]>) {
    const k = core({ approve: (_b, n) => (n === 2 ? { status: 403, body } : { status: 200, body: { ticket: "TKT-SECRET-A", expiresAt: "x", url: GOOD } }) });
    const out = await k.AM.actions.modelRun("research-center", { question: "q", urls: [GOOD, GOOD2] });
    assert.equal(out.ok, false);
    assert.equal(approves(k).length, 2);
    assert.equal(modelPosts(k).length, 0, "run POST'u yok");
    assert.equal(st(k, "research-center").status, "error");
    assert.match(st(k, "research-center").reason, re);
    assert.ok(!allText(k).includes("TKT-SECRET"));
    assert.equal(k.c.timers.length, 0);
  }
  // bozuk bilet yanıtı
  const k = core({ approve: () => ({ status: 200, body: { expiresAt: "x" } }) });
  await k.AM.actions.modelRun("research-center", { question: "q", urls: [GOOD] });
  assert.match(st(k, "research-center").reason, /okunamadı/);
  assert.equal(modelPosts(k).length, 0);
  // kilit bırakıldı: yeniden denenebilir
  k.answer.v = false;
  await k.AM.actions.modelRun("research-center", { question: "q", urls: [GOOD] });
  assert.equal(k.dialogs.length, 2);
});

test("internetli yetenek: run yanıtındaki internet hataları Türkçe (net_disabled, host_not_allowed, sources_unavailable)", async () => {
  for (const [status, body, re] of [
    [403, { error: "x", code: "net_disabled", howToEnable: "x" }, /İnternet erişimi kapalı/],
    [403, { error: "x", code: "host_not_allowed" }, /alan adı izinli listede değil/],
    [502, { error: "hiçbir kaynak getirilemedi", code: "sources_unavailable", sources: [] }, /Hiçbir kaynak getirilemedi; model çağrılmadı/],
  ] as Array<[number, Any, RegExp]>) {
    const k = core({ post: { status, body } });
    await k.AM.actions.modelRun("research-center", { question: "q", urls: [GOOD] });
    assert.match(st(k, "research-center").reason, re);
    assert.ok(!allText(k).includes("TKT-SECRET"));
  }
});

// ---------------------------------------------------------------- Araştırma sayfası: internetli kartlar
const NSLUGS = ["research-center", "feature-discovery", "competitor-research"];
const SRC = (over: Any = {}): Any => ({ index: 1, url: "https://docs.python.org/3/a?x=1", fetchedAt: "2026-10-23T10:00:00.000Z", status: 200, contentType: "text/html", bytes: 20480, sha256: "ab".repeat(32), truncated: false, ...over });
const NETRES: Record<string, Any> = {
  "research-center": { summary: "Özet metni.", findings: [
    { claim: "Birinci iddia", sourceIndex: 1, quote: "aynen alıntı bir", verified: true, confidence: "high" },
    { claim: "İkinci iddia", sourceIndex: 1, quote: "uydurma alıntı iki", verified: false, confidence: "medium" },
    { claim: "Üçüncü iddia", sourceIndex: null, quote: null, verified: null, note: "kaynaksız", confidence: "low" },
    { claim: "Dördüncü iddia", sourceIndex: 2, quote: null, verified: null, confidence: "low" },
  ], gaps: ["Eksik bir"], followUps: ["Sonraki bir"], unverifiedCount: 1, sources: [SRC(), SRC({ index: 2, url: "https://en.wikipedia.org/wiki/X", status: undefined, fetchedAt: undefined, bytes: undefined, sha256: undefined, error: "approval_required" }), SRC({ index: 3, url: "https://docs.python.org/3/c", error: "redirect_needs_approval" }), SRC({ index: 4, url: "https://docs.python.org/3/d", error: "total_limit", truncated: true }), SRC({ index: 5, url: "https://docs.python.org/3/e", error: "yeni_kod_x" })], untrusted: true },
  "feature-discovery": { features: [{ name: "Dışa aktarma", rationale: "Taşınabilirlik", priority: "high", sourceIndex: 1, quote: "aynen alıntı", verified: true, effort: "M" }, { name: "Bildirim", rationale: "Haber ver", priority: "low", sourceIndex: null, quote: null, verified: null, effort: "S" }], risks: ["Kapsam büyür"], unverifiedCount: 0, sources: [SRC()], untrusted: true },
  "competitor-research": { entities: [{ name: "Ürün A", strengths: ["Hızlı"], weaknesses: ["Pahalı"], sourceIndex: 1, quote: "aynen alıntı", verified: true }, { name: "Ürün B", strengths: ["Ucuz"], weaknesses: ["Yavaş"], sourceIndex: 1, quote: "yok alıntı", verified: false }], comparison: [{ criterion: "Fiyat", notes: "A pahalı" }], gaps: ["Fiyat verisi"], unverifiedCount: 1, sources: [SRC()], untrusted: true },
};
const NETMUST: Record<string, string[]> = {
  "research-center": ["Özet metni.", "Bulgular", "Birinci iddia", "Kaynak 1", "aynen alıntı bir", "Eksik bir", "Sonraki bir"],
  "feature-discovery": ["Önerilen özellikler", "Dışa aktarma", "M (orta)", "S (küçük)", "Kapsam büyür"],
  "competitor-research": ["Karşılaştırılanlar", "Ürün A", "Hızlı", "Pahalı", "Ölçüt karşılaştırması", "Fiyat", "Fiyat verisi"],
};
function netPage(slug: string, result: Any, extra?: (e: Env) => void): Env {
  return page((x) => { mc(x); x.AM.state.data["modelRun:" + slug] = okData({ capabilityId: slug, providerId: "claude-code", result, warnings: [] }); extra?.(x); });
}

test("internetli kartlar: üç yeni kart kapalı başlar ve katalogda; açılınca adres alanı, sayaç ve kaynaksız mod açıklaması var", () => {
  const e = page(mc);
  for (const s of NSLUGS) assert.equal(toggle(e, s).attrs["aria-expanded"], "false", s);
  assert.ok(e.host.textContent.includes("Araştırma merkezi (madde 37)") && e.host.textContent.includes("Özellik keşfi (madde 38)") && e.host.textContent.includes("Rakip ve ekosistem araştırması (madde 40)"));
  openCard(e, "research-center");
  const urls = byKey(e.host, "model-research-center-urls")!;
  assert.equal(urls.tag, "textarea");
  assert.ok(e.host.textContent.includes("Adresler (isteğe bağlı)"));
  assert.ok(e.host.textContent.includes("kaynaksız mod"));
  assert.ok(e.host.textContent.includes("0 adres (en çok 5)"));
  typeInto(urls, GOOD + "\n\n" + GOOD2);
  assert.ok(e.host.textContent.includes("2 adres (en çok 5)"));
  assert.equal(byKey(e.host, "model-research-center-tickets"), undefined, "bilet alanı formda yok");
  assert.ok(byKey(e.host, "model-research-center-question") && byKey(e.host, "model-research-center-notes"));
  openCard(e, "competitor-research");
  assert.ok(byKey(e.host, "model-competitor-research-compareWith") && byKey(e.host, "model-competitor-research-urls"));
  openCard(e, "feature-discovery");
  assert.ok(byKey(e.host, "model-feature-discovery-projectDescription"));
});

test("internetli kartlar: Çalıştır adresleri satır dizisi olarak modelRun'a verir (bilet alanı yok)", () => {
  const e = page(mc);
  openCard(e, "research-center");
  typeInto(byKey(e.host, "model-research-center-question")!, "Soru?");
  typeInto(byKey(e.host, "model-research-center-urls")!, GOOD + "\n" + GOOD2);
  byKey(e.host, "model-run-research-center")!.click();
  assert.deepEqual(J((e.calls as Any[]).find((c) => c[0] === "modelRun")), ["modelRun", "research-center", { question: "Soru?", notes: "", urls: [GOOD, GOOD2] }, ""]);
});

test("internetli kartlar: internet kapalıysa 'yalnız kaynaksız' bandı + Ayarlar'a git (openSettings); açıksa izinli alan adları listelenir; yetenek yine çalıştırılabilir", () => {
  const off = page((x) => mc(x, CAPS({ capabilities: [netCap("research-center", 37, "Araştırma merkezi", [{ name: "question", label: "Soru", kind: "text", required: true, maxLength: 1500 }], NET_OFF)] })));
  openCard(off, "research-center");
  assert.ok(off.host.textContent.includes("İnternet kapalı: yalnız kaynaksız mod"));
  assert.equal(byKey(off.host, "model-run-research-center")!.disabled, false, "kullanılabilir kalır");
  (off.AM.actions as Any).openSettings = (s: string) => { (off.calls as Any[]).push(["openSettings", s]); return Promise.resolve(); };
  byKey(off.host, "net-open-settings")!.click();
  assert.deepEqual((off.calls as Any[]).filter((c) => c[0] === "openSettings"), [["openSettings", "internet"]]);
  const on = page(mc);
  openCard(on, "research-center");
  assert.ok(on.host.textContent.includes("İnternet açık: yalnız izinli alan adları"));
  assert.ok(on.host.textContent.includes("docs.python.org, *.wikipedia.org"));
});

test("internetli kartlar: adres/internet hatası 'settings' eylemiyle gelirse Ayarlar'a git düğmesi çıkar", () => {
  const e = page((x) => { mc(x); x.AM.state.data["modelRun:research-center"] = { status: "error", value: null, reason: "İnternet erişimi kapalı; hiçbir şey çalıştırılmadı.", action: "settings" }; });
  openCard(e, "research-center");
  assert.ok(e.host.textContent.includes("İnternet erişimi kapalı; hiçbir şey çalıştırılmadı."));
  (e.AM.actions as Any).openSettings = (s: string) => { (e.calls as Any[]).push(["openSettings", s]); return Promise.resolve(); };
  byKey(e.host, "net-open-settings-err")!.click();
  assert.deepEqual((e.calls as Any[]).filter((c) => c[0] === "openSettings"), [["openSettings", "internet"]]);
});

test("internetli sonuçlar: her yetenek kendi görünümüyle çizilir; kaynak tablosu (no, alan adı, tarih, durum, bayt, kısa sha256, Türkçe hata); HER sonuçta güvenilmez etiketi", () => {
  for (const slug of NSLUGS) {
    const e = netPage(slug, NETRES[slug]);
    openCard(e, slug);
    const t = e.host.textContent;
    assert.ok(t.includes("Model çıktısı — güvenilmez veri; doğrulayın") && t.includes("Sağlayıcı: claude-code"), slug);
    for (const m of NETMUST[slug]!) assert.ok(t.includes(m), slug + ": " + m);
    assert.ok(t.includes("Kaynaklar") && t.includes("docs.python.org") && t.includes("https://docs.python.org/3/a?x=1"), slug + ": kaynak adresi düz metin");
    assert.ok(t.includes("2026-10-23 10:00:00") && t.includes("20.480") && t.includes("abababababab"), slug + ": tarih, bayt, kısa sha");
    assert.ok(!t.includes("ab".repeat(32)), slug + ": sha256 kısa gösterilir");
    noActiveContent(e.host);
    assert.equal(byTag(e.host, "a").length, 0, "bağlantı yok");
    assert.doesNotMatch(t, /⟦/);
  }
  const e = netPage("research-center", NETRES["research-center"]);
  openCard(e, "research-center");
  const t = e.host.textContent;
  for (const m of ["onay gerekli (bilet yok ya da geçersiz)", "yönlendirme ayrı onay gerektirir", "toplam kaynak sınırı aşıldı", "hata kodu: yeni_kod_x", "kısaltıldı"]) assert.ok(t.includes(m), m);
});

test("internetli sonuçlar: doğrulama rozetleri (doğrulandı / kaynakta bulunamadı / kaynaksız / alıntı verilmedi) ve doğrulanamayan sayısı uyarısı", () => {
  const e = netPage("research-center", NETRES["research-center"]);
  openCard(e, "research-center");
  const chips = walk(e.host).filter((n) => /am-more-chip--(ok|bad|muted)/.test(n.className)).map((n) => n.textContent + "|" + (/chip--(\w+)/.exec(n.className) ?? [])[1]);
  assert.ok(chips.includes("✓ alıntı kaynakta aynen geçiyor|ok"));
  assert.ok(chips.includes("✕ alıntı kaynakta bulunamadı|bad"));
  assert.ok(chips.includes("— kaynaksız (model bilgisi)|muted"));
  assert.ok(chips.includes("— alıntı verilmedi|muted"));
  assert.ok(e.host.textContent.includes("1 alıntı kaynakta bulunamadı; bu iddialara güvenmeyin"));
  assert.ok(e.host.textContent.includes("uydurma alıntı iki"), "doğrulanamayan iddia silinmez, işaretli gösterilir");
  const clean = netPage("feature-discovery", NETRES["feature-discovery"]);
  openCard(clean, "feature-discovery");
  assert.ok(!clean.host.textContent.includes("güvenmeyin"), "sayı 0 ise uyarı yok");
  const f = netPage("competitor-research", NETRES["competitor-research"]);
  openCard(f, "competitor-research");
  assert.ok(f.host.textContent.includes("✕ alıntı kaynakta bulunamadı") && f.host.textContent.includes("1 alıntı kaynakta bulunamadı"));
});

test("internetli sonuçlar: kaynaksız mod bandı (sourceless + uyarı); kaynak tablosu boşsa dürüst", () => {
  const r = { ...NETRES["research-center"], sources: [], sourceless: true, warning: "Bu yanıt internetten kaynak getirilmeden, yalnız model bilgisiyle üretildi; doğrulayın", findings: [{ claim: "İddia", sourceIndex: null, quote: null, verified: null, confidence: "low" }], unverifiedCount: 0 };
  const e = netPage("research-center", r);
  openCard(e, "research-center");
  const t = e.host.textContent;
  assert.ok(t.includes("Kaynaksız yanıt") && t.includes("yalnız model bilgisiyle üretildi; doğrulayın"));
  assert.ok(t.includes("Bu koşuda kaynak getirilmedi."));
  assert.ok(t.includes("Model çıktısı — güvenilmez veri; doğrulayın"));
  const r2 = { ...r }; delete (r2 as Any).warning;
  const e2 = netPage("research-center", r2);
  openCard(e2, "research-center");
  assert.ok(e2.host.textContent.includes("Bu yanıt internetten kaynak getirilmeden"), "uyarı yoksa yerel metin");
  const dolu = netPage("research-center", NETRES["research-center"]);
  openCard(dolu, "research-center");
  assert.ok(!dolu.host.textContent.includes("Kaynaksız yanıt"));
});

test("internetli sonuçlar: XSS yükü (alıntı, kaynak adresi, ad, hata kodu) etkisiz — düz metin, bağlantı yok, sır maskeli", () => {
  const evilUrl = "https://docs.python.org/<img src=x onerror=alert(1)>?k=" + SECRET;
  const r = {
    summary: EVIL, findings: [{ claim: EVIL, sourceIndex: 1, quote: EVIL + " " + SECRET, verified: false, confidence: "high" }], gaps: [EVIL], followUps: [EVIL], unverifiedCount: 1,
    sources: [SRC({ url: evilUrl, error: EVIL }), SRC({ index: 2, url: "javascript:alert(1)" })], untrusted: true,
  };
  const e = netPage("research-center", r);
  openCard(e, "research-center");
  noActiveContent(e.host);
  const t = e.host.textContent;
  assert.equal(byTag(e.host, "a").length + byTag(e.host, "img").length + byTag(e.host, "script").length, 0);
  assert.ok(t.includes("<img src=x onerror=alert(1)>"), "yük düz metin olarak görünür");
  assert.ok(!t.includes(SECRET) && !t.includes(BIDI));
  assert.ok(t.includes("hata kodu: ?"), "garip hata kodu gösterilmez");
  const f = netPage("feature-discovery", { features: [{ name: EVIL, rationale: EVIL, priority: "<x>", sourceIndex: "1", quote: EVIL, verified: "evet", effort: "XL" }], risks: [EVIL], sources: [EVIL, 5, null], untrusted: true });
  openCard(f, "feature-discovery");
  noActiveContent(f.host);
  assert.equal(byTag(f.host, "script").length, 0);
});

test("internetli sonuçlar: bozuk veri (eksik diziler, tür hataları, sources dizi değil) çökmez; hata kartı ya da dürüst boşluk", () => {
  for (const slug of NSLUGS) {
    for (const bad of [{ untrusted: true }, { findings: "x", features: {}, entities: 5, sources: "x" }, { findings: [null, 5, "a"], features: [null], entities: [7], sources: [null, "x", 5] }] as Any[]) {
      const e = netPage(slug, bad);
      openCard(e, slug);
      assert.ok(e.host.textContent.includes("güvenilmez veri; doğrulayın"), slug);
      assert.doesNotMatch(e.host.textContent, /⟦/);
    }
  }
  const e = netPage("research-center", { ...NETRES["research-center"], sources: "x", unverifiedCount: "abc" });
  openCard(e, "research-center");
  assert.ok(e.host.textContent.includes("Bu koşuda kaynak getirilmedi.") && !e.host.textContent.includes("güvenmeyin"));
});

test("internetli sonuçlar: kaynak adresleri tıklanabilir bağlantı değil (kaynakta href/anchor yok)", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("./page-research.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /createElement\(["']a["']\)|el\(["']a["']|\.href\s*=|setAttribute\(["']href/);
});

test("doğrulama sertleşti: ✓ 'aynen geçiyor' + 'garanti etmez' notu; ✕ nedenli (yalnız bir kısmı / çok kısa / bulunamadı / verilmedi); verifiedMeaning gösterilir", () => {
  const MEANING = "verified:true = alıntı kaynakta aynen geçiyor; iddianın doğruluğunu GARANTİ ETMEZ. " + EVIL;
  const r = {
    summary: "s", verifiedMeaning: MEANING, unverifiedCount: 4, sources: [SRC()], untrusted: true, gaps: [], followUps: [],
    findings: [
      { claim: "c1", sourceIndex: 1, quote: "Tam cümle burada geçiyor ve bitiyor.", verified: true, confidence: "high" },
      { claim: "c2", sourceIndex: 1, quote: "Tam cümle burada", verified: false, note: "alıntı cümlenin yalnız bir kısmı", confidence: "low" },
      { claim: "c3", sourceIndex: 1, quote: "kısa", verified: false, note: "alıntı çok kısa (en az 30 karakter ve 5 sözcük gerekir)", confidence: "low" },
      { claim: "c4", sourceIndex: 1, quote: "Olmayan bir cümle burada yok.", verified: false, note: "alıntı kaynakta bulunamadı", confidence: "low" },
      { claim: "c5", sourceIndex: 1, quote: null, verified: false, note: "kaynak numarası var ama alıntı verilmedi", confidence: "low" },
      { claim: "c6", sourceIndex: null, quote: null, verified: null, note: "kaynaksız (model bilgisi, doğrulanmamış)", confidence: "low" },
    ],
  };
  const e = netPage("research-center", r);
  openCard(e, "research-center");
  const t = e.host.textContent;
  const chips = walk(e.host).filter((n) => /am-more-chip--(ok|bad|muted)/.test(n.className)).map((n) => n.textContent + "|" + (/chip--(\w+)/.exec(n.className) ?? [])[1]);
  for (const c of ["✓ alıntı kaynakta aynen geçiyor|ok", "✕ alıntı cümlenin yalnız bir kısmı|bad", "✕ alıntı çok kısa|bad", "✕ alıntı kaynakta bulunamadı|bad", "✕ alıntı verilmedi|bad", "— kaynaksız (model bilgisi)|muted"]) assert.ok(chips.includes(c), c);
  assert.ok(t.includes("iddianın doğruluğunu garanti etmez"), "✓ yanında kısa not");
  assert.ok(t.includes("Doğrulama ne demek: verified:true = alıntı kaynakta aynen geçiyor"), "verifiedMeaning");
  assert.ok(t.includes("4 alıntı kaynakta bulunamadı; bu iddialara güvenmeyin"));
  noActiveContent(e.host);
  assert.ok(!t.includes(BIDI));
  assert.ok(t.includes("<img src=x onerror=alert(1)>"), "verifiedMeaning düz metin");
  // not yoksa varsayılan neden: alıntı varsa 'bulunamadı', yoksa 'verilmedi'
  const e2 = netPage("research-center", { ...r, findings: [{ claim: "a", sourceIndex: 1, quote: "x y z", verified: false }, { claim: "b", sourceIndex: 1, quote: null, verified: false }] });
  openCard(e2, "research-center");
  assert.ok(e2.host.textContent.includes("✕ alıntı kaynakta bulunamadı") && e2.host.textContent.includes("✕ alıntı verilmedi"));
  // verifiedMeaning yoksa satır yok
  const r3 = { ...r }; delete (r3 as Any).verifiedMeaning;
  const e3 = netPage("research-center", r3);
  openCard(e3, "research-center");
  assert.ok(!e3.host.textContent.includes("Doğrulama ne demek"));
});

test("kaynak tablosu: sunucu yeniden başlayınca adres yok, yalnız host + yol özeti (pathSha256) gelir — alan adı ve 'yol özeti: <12 karakter>' gösterilir, çökmez", () => {
  const src = [{ index: 1, host: "docs.python.org", pathSha256: "cd".repeat(32), fetchedAt: "2026-10-23T10:00:00.000Z", status: 200, bytes: 100, sha256: "ef".repeat(32), truncated: false }, { index: 2, host: "<img src=x onerror=1>", pathSha256: "-" }, { index: 3 }];
  const e = netPage("research-center", { ...NETRES["research-center"], sources: src });
  openCard(e, "research-center");
  const t = e.host.textContent;
  assert.ok(t.includes("docs.python.org") && t.includes("yol özeti: cdcdcdcdcdcd"));
  assert.ok(!t.includes("cd".repeat(32)), "özet kısa gösterilir");
  assert.ok(t.includes("yol özeti: —"));
  noActiveContent(e.host);
  assert.doesNotMatch(t, /⟦/);
});

// ================================================================ D8c-UI-3: müzakere (madde 75)
const TR_ENTRY = (round: number, role: string, providerId: string, step: string, content: Any): Any => ({ round, role, providerId, step, content });
const NEGO_RESULT = (over: Any = {}): Any => ({
  transcript: [
    TR_ENTRY(1, "A", "claude-code", "propose", { position: "Önbellek ekle.", proposals: [{ id: "o1", summary: "Bellek içi önbellek " + EVIL, pros: ["Hızlı"], cons: ["Bayatlama"] }] }),
    TR_ENTRY(1, "B", "local-x", "critique", { critiques: [{ proposalId: "o1", objection: "Bayat veri riski", severity: "high", suggestion: "Kısa ömür ekle" }], counterProposal: { summary: "Disk önbelleği", pros: ["Kalıcı"], cons: ["Yavaş"] } }),
    TR_ENTRY(2, "A", "claude-code", "revise", { revisions: [{ proposalId: "o1", change: "Ömür 60 sn", answersCritique: "Bayatlama sınırlandı" }], stance: "Uzlaşmaya açığım" }),
    TR_ENTRY(2, "B", "local-x", "final", { stance: "partial", remainingIssues: ["Ölçüm yok"], agreedPoints: ["Ömür kısa olmalı"], recommendation: "Önce ölç, sonra ekle." }),
  ],
  outcome: { status: "partial", agreedPoints: ["Ömür kısa olmalı"], openIssues: ["Ölçüm yok"], recommendation: "Önce ölç, sonra ekle." },
  providers: { A: "claude-code", B: "local-x" }, rounds: 2, untrusted: true, note: "Hiçbir şey kendiliğinden uygulanmadı; bu sonuç yalnız ÖNERİDİR, karar sizindir.", ...over,
});
const NEGO_CAP = (over: Any = {}): Any => ({ id: "negotiation", madde: 75, ad: "Ajanlar arası müzakere", aciklama: "x", availability: { available: true, reason: "claude-code, local-x" }, schema: "s", fields: [
  { name: "topic", label: "Konu", kind: "text", required: true, maxLength: 2000 },
  { name: "options", label: "Seçenekler", kind: "list", required: false, maxLength: 300, maxItems: 4 },
  { name: "constraints", label: "Kısıtlar", kind: "text", required: false, maxLength: 1000 },
  { name: "rounds", label: "Tur sayısı (1 ya da 2; varsayılan 2)", kind: "number", required: false, maxLength: 1 },
  { name: "providerA", label: "Öneren sağlayıcı (isteğe bağlı)", kind: "text", required: false, maxLength: 40 },
  { name: "providerB", label: "Eleştirmen sağlayıcı (isteğe bağlı)", kind: "text", required: false, maxLength: 40 },
], ...over });
const negoCaps = (over: Any = {}): Any => CAPS({ capabilities: [...CAPS().capabilities, NEGO_CAP(over)] });

test("müzakere: alan doğrulaması (konu zorunlu, seçenek ≤ 4, tur 1|2, sağlayıcı kimliği, A=B) — pencere ve istek YOK", async () => {
  const k = core({ caps: negoCaps() });
  const run = (f: Any) => k.AM.actions.modelRun("negotiation", f);
  await run({ topic: "  " });
  assert.match(st(k, "negotiation").reason, /Konu boş olamaz/);
  await run({ topic: "t", options: ["1", "2", "3", "4", "5"] });
  assert.match(st(k, "negotiation").reason, /en çok 4 öğe/);
  await run({ topic: "t", rounds: 3 });
  assert.match(st(k, "negotiation").reason, /geçerli bir sayı/);
  await run({ topic: "t", rounds: "x" });
  assert.match(st(k, "negotiation").reason, /geçerli bir sayı/);
  await run({ topic: "t", providerA: "Claude Code" });
  assert.match(st(k, "negotiation").reason, /Sağlayıcı kimliği geçersiz/);
  await run({ topic: "t", providerA: "claude-code", providerB: "claude-code" });
  assert.match(st(k, "negotiation").reason, /iki FARKLI sağlayıcı/);
  await run({ topic: "t".repeat(2001) });
  assert.match(st(k, "negotiation").reason, /en çok 2000/);
  assert.equal(k.dialogs.length + modelPosts(k).length, 0);
});

test("müzakere: iki farklı sağlayıcı yoksa kullanılamıyor (neden gösterilir), çalıştırılmaz", async () => {
  const k = core({ caps: negoCaps({ availability: { available: false, reason: "müzakere için iki farklı sağlayıcı gerekir (uygun: 1)" } }) });
  const r = await k.AM.actions.modelRun("negotiation", { topic: "t" });
  assert.equal(r.invalid, true);
  assert.match(st(k, "negotiation").reason, /Kullanılamıyor: müzakere için iki farklı sağlayıcı gerekir/);
  assert.equal(k.dialogs.length + modelPosts(k).length, 0);
});

test("müzakere: onay penceresi TAM maskeli metni ve 'İKİ ayrı sağlayıcı' uyarısını gösterir; gövde doğru (sayı olarak rounds, sağlayıcılar, seçenekler)", async () => {
  const k = core({ caps: negoCaps(), runs: [{ status: 200, body: { taskId: UUID(1), status: "done", providerId: "claude-code", result: NEGO_RESULT() } }] });
  const p = k.AM.actions.modelRun("negotiation", { topic: "Konu " + SECRET, options: ["Seçenek bir", " ", "Seçenek iki"], constraints: "Kısıt", rounds: "1", providerA: "claude-code", providerB: "local-x" });
  await k.c.flush();
  const d = k.dialogs[0];
  assert.ok(!d.target.includes(SECRET) && d.target.includes("Konu [gizli]"));
  assert.ok(d.target.includes("- Seçenek bir") && d.target.includes("- Seçenek iki"));
  assert.ok(d.target.includes("Tur sayısı (1 ya da 2; varsayılan 2): 1") && d.target.includes("claude-code") && d.target.includes("local-x"));
  assert.match(d.detail, /İKİ ayrı sağlayıcı sırayla çalışacak; birinin çıktısı diğerine GÜVENİLMEZ VERİ olarak verilecek/);
  assert.match(d.detail, /dakikalar sürebilir/);
  await k.c.tick();
  assert.equal((await p).ok, true);
  const [post] = modelPosts(k);
  assert.equal(post[1], "/api/capabilities/model/negotiation/run");
  assert.deepEqual(JSON.parse(post[2]), { input: { topic: "Konu [gizli]", options: ["Seçenek bir", "Seçenek iki"], constraints: "Kısıt", rounds: 1, providerA: "claude-code", providerB: "local-x" } });
});

test("müzakere: yoklama 12 dakikaya (360 yoklama) kadar sürer; sonra zaman aşımı; diğer yetenekler 150'de keser", async () => {
  const k = core({ caps: negoCaps(), runs: [{ status: 200, body: { taskId: UUID(1), status: "running" } }] });
  const p = k.AM.actions.modelRun("negotiation", { topic: "t" });
  await k.c.flush();
  for (let i = 0; i < 400 && k.c.timers.length; i += 1) await k.c.tickFast();
  assert.equal((await p).ok, false);
  assert.equal(modelGets(k).length, 360);
  assert.match(st(k, "negotiation").reason, /12 dakika içinde bitmedi/);
});

test("müzakere: yarıda kesilen (failed + partial) sonuç KISMİ olarak korunur; nedeni state'te", async () => {
  const partial = { transcript: NEGO_RESULT().transcript.slice(0, 2), providers: { A: "claude-code", B: "local-x" }, rounds: 2, partial: true, completedSteps: 2, untrusted: true };
  const k = core({ caps: negoCaps(), runs: [{ status: 200, body: { taskId: UUID(1), status: "failed", providerId: "local-x", error: { code: "timeout", message: "sağlayıcı süre sınırında yanıt vermedi (adım: revise)" }, result: partial } }] });
  const p = k.AM.actions.modelRun("negotiation", { topic: "t" });
  await k.c.flush();
  await k.c.tick();
  const out = await p;
  assert.equal(out.partial, true);
  assert.equal(st(k, "negotiation").status, "ok");
  assert.equal(st(k, "negotiation").value.result.partial, true);
  assert.match(st(k, "negotiation").value.failure, /süre sınırında/);
  // başka yetenekte failed hâlâ hata
  const k2 = core({ runs: [{ status: 200, body: { taskId: UUID(1), status: "failed", error: { message: "x" }, result: partial } }] });
  const p2 = k2.AM.actions.modelRun("inversion", { goal: "g" });
  await k2.c.flush();
  await k2.c.tick();
  await p2;
  assert.equal(st(k2, "inversion").status, "error");
});

function negoPage(value: Any, setup?: (e: Env) => void): Env {
  return page((x) => { mc(x, negoCaps()); x.AM.state.data["modelRun:negotiation"] = okData({ capabilityId: "negotiation", providerId: "claude-code", result: NEGO_RESULT(), warnings: [], ...value }); setup?.(x); });
}

test("müzakere kartı: konu/seçenek/kısıt alanları, tur seçici (1/2), sağlayıcı A/B seçicileri (Otomatik varsayılan); genel sağlayıcı seçici yok; A=B uyarısı ve Çalıştır pasif", () => {
  const e = page((x) => mc(x, negoCaps()));
  assert.ok(e.host.textContent.includes("Ajanlar arası müzakere (madde 75)"));
  openCard(e, "negotiation");
  assert.equal(byKey(e.host, "model-negotiation-topic")!.tag, "textarea");
  assert.equal(byKey(e.host, "model-negotiation-options")!.tag, "textarea");
  assert.ok(byKey(e.host, "model-negotiation-constraints"));
  const rounds = byKey(e.host, "model-negotiation-rounds")!;
  assert.deepEqual(byTag(rounds, "option").map((o) => o.textContent), ["2 tur (varsayılan)", "1 tur"]);
  const pa = byKey(e.host, "model-negotiation-providerA")!;
  assert.deepEqual(byTag(pa, "option").map((o) => o.textContent), ["Otomatik (önerilen)", "Claude Code"]);
  assert.ok(byKey(e.host, "model-negotiation-providerB"));
  assert.equal(byKey(e.host, "model-negotiation-provider"), undefined);
  typeInto(byKey(e.host, "model-negotiation-topic")!, "Hangi önbellek?");
  typeInto(byKey(e.host, "model-negotiation-options")!, "a\nb");
  typeInto(rounds, "1");
  byKey(e.host, "model-run-negotiation")!.click();
  assert.deepEqual(J((e.calls as Any[]).find((c) => c[0] === "modelRun")), ["modelRun", "negotiation", { topic: "Hangi önbellek?", options: ["a", "b"], constraints: "", rounds: "1", providerA: "", providerB: "" }, ""]);
  typeInto(byKey(e.host, "model-negotiation-providerA")!, "claude-code");
  typeInto(byKey(e.host, "model-negotiation-providerB")!, "claude-code");
  assert.ok(e.host.textContent.includes("Öneren ve eleştirmen sağlayıcı aynı olamaz"));
  assert.equal(byKey(e.host, "model-run-negotiation")!.disabled, true);
});

test("müzakere kartı: kullanılamıyorsa neden + Çalıştır pasif", () => {
  const e = page((x) => mc(x, negoCaps({ availability: { available: false, reason: "müzakere için iki farklı sağlayıcı gerekir" } })));
  openCard(e, "negotiation");
  assert.ok(e.host.textContent.includes("Kullanılamıyor: müzakere için iki farklı sağlayıcı gerekir"));
  assert.equal(byKey(e.host, "model-run-negotiation")!.disabled, true);
});

test("müzakere sonucu: tur tur yazışma (A/B, adım adları), uzlaşılan/açık noktalar, ÖNERİ, kısmi uzlaşma rozeti ve güvenilmez etiketi; XSS etkisiz", () => {
  const e = negoPage({});
  openCard(e, "negotiation");
  const t = e.host.textContent;
  for (const m of ["Model çıktısı — güvenilmez veri; doğrulayın", "Müzakere yazışması", "Tur 1 · A (öneren) · claude-code · Öneri", "Tur 1 · B (eleştirmen) · local-x · Eleştiri", "Tur 2 · A (öneren) · claude-code · Gözden geçirme", "Tur 2 · B (eleştirmen) · local-x · Son tutum",
    "Önbellek ekle.", "o1 için itiraz (yüksek): Bayat veri riski", "Karşı öneri: Disk önbelleği", "Ömür 60 sn", "Kısmen katılıyor", "Uzlaşılan noktalar", "Ömür kısa olmalı", "Açık sorunlar", "Ölçüm yok", "ÖNERİ", "Önce ölç, sonra ekle.", "Kısmi uzlaşma", "karar sizindir", "Sağlayıcılar: A (öneren) = claude-code, B (eleştirmen) = local-x; 2 tur"]) assert.ok(t.includes(m), m);
  assert.ok(!t.includes("yarıda kesildi"));
  noActiveContent(e.host);
  assert.ok(!t.includes(BIDI) && t.includes("<img src=x onerror=alert(1)>"));
  const chips = walk(e.host).filter((n) => /am-more-chip--/.test(n.className)).map((n) => n.textContent + "|" + (/chip--(\w+)/.exec(n.className) ?? [])[1]);
  assert.ok(chips.includes("Kısmi uzlaşma|warn") && chips.includes("Kısmen katılıyor|warn"));
  for (const [st1, label, tone] of [["consensus", "Uzlaşma", "ok"], ["disagreement", "Anlaşmazlık", "bad"]] as const) {
    const e2 = negoPage({ result: NEGO_RESULT({ outcome: { status: st1, agreedPoints: [], openIssues: [], recommendation: "r" } }) });
    openCard(e2, "negotiation");
    const cs = walk(e2.host).filter((n) => /am-more-chip--/.test(n.className)).map((n) => n.textContent + "|" + (/chip--(\w+)/.exec(n.className) ?? [])[1]);
    assert.ok(cs.includes(label + "|" + tone), st1);
  }
});

test("müzakere sonucu: 1 turluk sonuç (yalnız öneri+eleştiri) çizilir; kısmi sonuçta belirgin 'yarıda kesildi' bandı, nedeni, sonuç/ÖNERİ YOK", () => {
  const one = negoPage({ result: NEGO_RESULT({ transcript: NEGO_RESULT().transcript.slice(0, 2), rounds: 1 }) });
  openCard(one, "negotiation");
  assert.ok(one.host.textContent.includes("1 tur") && !one.host.textContent.includes("Gözden geçirme"));
  const partial = negoPage({ result: { transcript: NEGO_RESULT().transcript.slice(0, 2), providers: { A: "claude-code", B: "local-x" }, rounds: 2, partial: true, completedSteps: 2, untrusted: true }, failure: "sağlayıcı süre sınırında yanıt vermedi (adım: revise)" });
  openCard(partial, "negotiation");
  const t = partial.host.textContent;
  assert.ok(t.includes("Müzakere yarıda kesildi: 2 adım tamamlandı"));
  assert.ok(t.includes("Neden: sağlayıcı süre sınırında yanıt vermedi"));
  assert.ok(t.includes("Tur 1 · B (eleştirmen)"));
  assert.ok(!t.includes("karar sizindir") && !t.includes("Kısmi uzlaşma") && !t.includes("Uzlaşılan noktalar"), "kısmi sonuçta sonuç türetilmez");
  assert.ok(t.includes("Model çıktısı — güvenilmez veri; doğrulayın"));
  assert.ok(walk(partial.host).some((n) => n.attrs["role"] === "alert" && n.textContent.includes("yarıda kesildi")));
});

test("müzakere sonucu: bozuk veri çökmez (transcript/outcome eksik, bilinmeyen adım/durum)", () => {
  for (const r of [{ untrusted: true }, { transcript: "x", outcome: 5 }, { transcript: [null, 5, { step: "x", content: "y" }], outcome: { status: "?" }, providers: 7 }, { transcript: [], outcome: {} }]) {
    const e = negoPage({ result: r });
    openCard(e, "negotiation");
    assert.ok(e.host.textContent.includes("güvenilmez veri; doğrulayın"));
    assert.doesNotMatch(e.host.textContent, /⟦/);
  }
});

test("müzakere sonucu: güven rozeti (düşük/orta), öneri kaynağı etiketi, tek turda 'uzlaşma doğrulanamaz' notu", () => {
  const oc = (over: Any) => ({ status: "partial", agreedPoints: [], openIssues: ["x"], recommendation: "Öneri metni", confidence: "low", recommendationSource: "belirleyici şablon (model metni değil)", ...over });
  const e = negoPage({ result: NEGO_RESULT({ outcome: oc({}) }) });
  openCard(e, "negotiation");
  const chips = walk(e.host).filter((n) => /am-more-chip--/.test(n.className)).map((n) => n.textContent + "|" + (/chip--(\w+)/.exec(n.className) ?? [])[1]);
  assert.ok(chips.includes("Güven: düşük|warn"));
  assert.ok(e.host.textContent.includes("Kaynak: belirleyici şablon (model metni değil)"));
  assert.ok(!e.host.textContent.includes("uzlaşma doğrulanamaz"), "iki turda tek tur notu yok");
  const med = negoPage({ result: NEGO_RESULT({ outcome: oc({ confidence: "medium", recommendationSource: "B modeli (güvenilmez)" }) }) });
  openCard(med, "negotiation");
  assert.ok(walk(med.host).some((n) => n.textContent === "Güven: orta"));
  assert.ok(med.host.textContent.includes("Kaynak: B modeli (güvenilmez)"));
  const one = negoPage({ result: NEGO_RESULT({ rounds: 1, transcript: NEGO_RESULT().transcript.slice(0, 2), outcome: oc({ recommendation: "İtiraz yok, doğrulanmadı: tek tur" }) }) });
  openCard(one, "negotiation");
  assert.ok(one.host.textContent.includes("Tek tur: uzlaşma doğrulanamaz"));
  assert.ok(one.host.textContent.includes("İtiraz yok, doğrulanmadı: tek tur"));
  assert.ok(!one.host.textContent.includes("Uzlaşma"), "tek turda uzlaşma rozeti çıkmaz");
  // eski sonuç (alan yok) çökmez
  const old = negoPage({});
  openCard(old, "negotiation");
  assert.ok(!old.host.textContent.includes("Güven:") && !old.host.textContent.includes("Kaynak: "));
});

test("müzakere: gövdede providerId üst alanı YOK (yalnız providerA/providerB)", async () => {
  const k = core({ caps: negoCaps(), runs: [{ status: 200, body: { taskId: UUID(1), status: "done", providerId: "claude-code", result: NEGO_RESULT() } }] });
  const p = k.AM.actions.modelRun("negotiation", { topic: "t", providerA: "claude-code", providerB: "local-x" }, "claude-code");
  await k.c.flush();
  await k.c.tick();
  await p;
  const body = JSON.parse(modelPosts(k)[0][2]);
  assert.equal(body.providerId, undefined);
  assert.equal(body.input.providerA, "claude-code");
});

test("sandbox: 409 sandbox_cleanup_needed Türkçe karşılanır; sayaç Model yetenekleri bölümünde gösterilir, eşikte uyarı", async () => {
  const k = core({ post: { status: 409, body: { error: "çok fazla çalışma ağacı", code: "sandbox_cleanup_needed" } } });
  await k.AM.actions.modelRun("inversion", { goal: "g" });
  assert.equal(st(k, "inversion").reason, "Analiz çalışma alanında çok fazla eski çalışma ağacı birikti; Geri Dönüşüm Kutusu'na taşınması gerekir. Hiçbir şey çalıştırılmadı.");
  assert.equal(k.c.timers.length, 0);
  const e = page((x) => mc(x, CAPS({ sandbox: { worktrees: 12, limit: 80 } })));
  assert.ok(e.host.textContent.includes("Analiz çalışma alanı: 12 / 80 çalışma ağacı."));
  assert.ok(!e.host.textContent.includes("çok fazla eski çalışma ağacı"));
  const full = page((x) => mc(x, CAPS({ sandbox: { worktrees: 80, limit: 80 } })));
  assert.ok(full.host.textContent.includes("80 / 80") && full.host.textContent.includes("Geri Dönüşüm Kutusu'na taşınması gerekir"));
  const none = page((x) => mc(x, CAPS({ sandbox: undefined })));
  assert.ok(!none.host.textContent.includes("Analiz çalışma alanı:"));
});
