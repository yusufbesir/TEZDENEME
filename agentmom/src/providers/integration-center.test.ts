// Entegrasyon merkezi, yaşam döngüsü ve TestSprite bildirimi testleri (madde 46, 48, 54). Sahip: Claude [İP:AgentMom devam]. Ağ yok; geçici klasör.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { IntegrationCenter, IntegrationError, LOG_FILE, replay } from "./integration-center.ts";
import { TESTSPRITE_ID, declareTestSprite, testspriteCapabilities, testspriteReadiness } from "./testsprite.ts";

const user = { kind: "user", id: "yusuf" } as const;
const agent = { kind: "agent", id: "claude" } as const;
const code = (c: string) => (e: unknown) => e instanceof IntegrationError && e.code === c;
const world = () => {
  const dir = mkdtempSync(join(tmpdir(), "entegrasyon-"));
  return { dir, c: new IntegrationCenter(dir, () => new Date("2026-10-25T12:00:00Z")) };
};

test("düşük riskli yaşam döngüsü: keşif -> yapılandır -> etkinleştir -> kapat -> kaldır; kaldırılan listeden düşer, günlük yalnız büyür", () => {
  const { dir, c } = world();
  c.record({ kind: "ide", id: "vscode", action: "discover", actor: user, risk: "low", title: "VS Code" });
  assert.equal(c.get("ide", "vscode")?.state, "discovered");
  assert.equal(c.isEffective("ide", "vscode"), false, "keşfedilen etkin değildir");
  assert.throws(() => c.record({ kind: "ide", id: "vscode", action: "enable", actor: agent }), code("conflict"), "yapılandırmadan etkinleşmez");
  c.record({ kind: "ide", id: "vscode", action: "configure", actor: agent });
  c.record({ kind: "ide", id: "vscode", action: "enable", actor: agent });
  assert.equal(c.isEffective("ide", "vscode"), true);
  assert.throws(() => c.record({ kind: "ide", id: "vscode", action: "configure", actor: agent }), code("conflict"), "etkinken yeniden yapılandırılmaz");
  c.record({ kind: "ide", id: "vscode", action: "disable", actor: agent });
  assert.equal(c.get("ide", "vscode")?.state, "disabled");
  const sizeBefore = readFileSync(join(dir, LOG_FILE), "utf8").length;
  assert.throws(() => c.record({ kind: "ide", id: "vscode", action: "remove", actor: agent }), code("human_required"));
  c.record({ kind: "ide", id: "vscode", action: "remove", actor: user });
  assert.equal(c.get("ide", "vscode"), undefined);
  assert.ok(readFileSync(join(dir, LOG_FILE), "utf8").length > sizeBefore, "kayıt eklendi, eski satırlar duruyor");
  assert.throws(() => c.record({ kind: "ide", id: "vscode", action: "enable", actor: user }), code("not_found"));
  c.record({ kind: "ide", id: "vscode", action: "discover", actor: user, risk: "low" });
  assert.equal(c.get("ide", "vscode")?.state, "discovered", "kaldırılan yeniden keşfedilebilir");
});

test("yüksek risk: insan onayı olmadan etkinleşmez; ajan onaylayamaz ve etkinleştiremez, yalnız kapatabilir; yapılandırma onayı düşürür", () => {
  const { c } = world();
  c.record({ kind: "mcp", id: "uzak", action: "discover", actor: agent });
  assert.equal(c.get("mcp", "uzak")?.risk, "high", "risk belirtilmezse yüksek");
  c.record({ kind: "mcp", id: "uzak", action: "configure", actor: agent });
  assert.throws(() => c.record({ kind: "mcp", id: "uzak", action: "enable", actor: user }), code("approval_required"));
  assert.throws(() => c.record({ kind: "mcp", id: "uzak", action: "approve", actor: agent }), code("human_required"));
  c.record({ kind: "mcp", id: "uzak", action: "approve", actor: user });
  assert.throws(() => c.record({ kind: "mcp", id: "uzak", action: "enable", actor: agent }), code("human_required"));
  c.record({ kind: "mcp", id: "uzak", action: "enable", actor: user });
  assert.equal(c.isEffective("mcp", "uzak"), true);
  c.record({ kind: "mcp", id: "uzak", action: "disable", actor: agent });
  assert.equal(c.isEffective("mcp", "uzak"), false, "ajan kapatabilir");
  c.record({ kind: "mcp", id: "uzak", action: "configure", actor: user });
  assert.equal(c.get("mcp", "uzak")?.approved, false, "yapılandırma değişti: eski onay geçmez");
  assert.throws(() => c.record({ kind: "mcp", id: "uzak", action: "enable", actor: user }), code("approval_required"));
});

test("birleşik görünüm: farklı türler tek listede, sıralı; aynı kimlik farklı türde ayrı kayıttır", () => {
  const { c } = world();
  for (const [kind, id] of [["skill", "b"], ["provider", "a"], ["tool", "a"], ["mcp", "a"]] as const) c.record({ kind, id, action: "discover", actor: user, risk: "low" });
  assert.deepEqual(c.overview().integrations.map((i) => `${i.kind}:${i.id}`), ["mcp:a", "provider:a", "skill:b", "tool:a"]);
});

test("günlük bozulursa kapalı-varsayılan: atlanan satır raporlanır ve hiçbir entegrasyon etkin sayılmaz", () => {
  const { dir, c } = world();
  c.record({ kind: "ide", id: "x", action: "discover", actor: user, risk: "low" });
  c.record({ kind: "ide", id: "x", action: "configure", actor: user });
  c.record({ kind: "ide", id: "x", action: "enable", actor: user });
  assert.equal(c.isEffective("ide", "x"), true);
  appendFileSync(join(dir, LOG_FILE), "{bozuk\n");
  assert.equal(c.isEffective("ide", "x"), false);
  assert.match(c.overview().problems[0]!, /line 4/);
  appendFileSync(join(dir, LOG_FILE), JSON.stringify({ schema: "agentmom-integration-event/1", kind: "ide", id: "x", action: "enable", actor: { kind: "user", id: "y" }, at: "2026-10-25T12:00:00Z", fazla: 1 }) + "\n");
  assert.ok(c.overview().problems.length >= 2, "bilinmeyen alanlı satır da atlanır");
  // elle yazılmış sahte onay: aracı onaylayan kayıt
  const forged = replay([
    JSON.stringify({ schema: "agentmom-integration-event/1", kind: "mcp", id: "s", action: "discover", actor: { kind: "agent", id: "a" }, at: "2026-10-25T12:00:00Z" }),
    JSON.stringify({ schema: "agentmom-integration-event/1", kind: "mcp", id: "s", action: "configure", actor: { kind: "agent", id: "a" }, at: "2026-10-25T12:00:00Z" }),
    JSON.stringify({ schema: "agentmom-integration-event/1", kind: "mcp", id: "s", action: "approve", actor: { kind: "agent", id: "a" }, at: "2026-10-25T12:00:00Z" }),
    JSON.stringify({ schema: "agentmom-integration-event/1", kind: "mcp", id: "s", action: "enable", actor: { kind: "agent", id: "a" }, at: "2026-10-25T12:00:00Z" }),
  ]);
  assert.equal(forged.integrations[0]!.effective, false);
  assert.equal(forged.integrations[0]!.state, "configured");
  assert.equal(forged.problems.length, 2);
});

test("olay doğrulaması: kötü kimlik/tür/eylem, gizli bilgi, kontrol karakteri reddedilir ve günlüğe yazılmaz; klasör geçersizse reddedilir", () => {
  const { dir, c } = world();
  const base = { kind: "ide", id: "ok", action: "discover", actor: user } as const;
  for (const bad of [{ id: "Büyük" }, { id: "../x" }, { kind: "yok" }, { action: "sil" }, { risk: "orta" }, { title: "api_key = sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" }, { note: "a\nb" }, { actor: { kind: "root", id: "x" } }] as Array<Record<string, unknown>>) {
    assert.throws(() => c.record({ ...base, ...bad } as never), IntegrationError);
  }
  assert.throws(() => readFileSync(join(dir, LOG_FILE)), "kötü olaylardan hiçbiri günlük dosyasını oluşturmadı");
  assert.equal(c.record({ ...base }).state, "discovered", "geçerli olay yazılır");
  assert.throws(() => new IntegrationCenter(join(dir, "yok")), code("invalid_dir"));
  assert.throws(() => new IntegrationCenter(join(dir, LOG_FILE)), code("invalid_dir"));
});

test("TestSprite: isteğe bağlı, yüksek riskli, kapalı başlar; hazırlık engelleri yazılır; adaptör olmadığı için hiçbir zaman 'ready' olmaz; yetenekler doğrulanmamış", () => {
  const { c } = world();
  assert.deepEqual(testspriteReadiness(c, false).blockers.slice(0, 2), ["not registered (declareTestSprite)", "no API key configured"]);
  const v = declareTestSprite(c, agent);
  assert.equal(v.risk, "high");
  assert.equal(v.optional, true);
  assert.equal(v.state, "discovered");
  assert.equal(declareTestSprite(c, user).events, 1, "ikinci çağrı yeni olay eklemez");
  c.record({ kind: "provider", id: TESTSPRITE_ID, action: "configure", actor: user });
  assert.throws(() => c.record({ kind: "provider", id: TESTSPRITE_ID, action: "enable", actor: user }), code("approval_required"));
  c.record({ kind: "provider", id: TESTSPRITE_ID, action: "approve", actor: user });
  c.record({ kind: "provider", id: TESTSPRITE_ID, action: "enable", actor: user });
  const r = testspriteReadiness(c, true);
  assert.equal(r.ready, false, "adaptör yok: bağlantı kurulamaz");
  assert.deepEqual(r.blockers, ["no adapter exists yet: connecting to TestSprite is not implemented"]);
  assert.match(testspriteReadiness(c, false).blockers.join(), /no API key/);
  const caps = testspriteCapabilities("2026-10-25T12:00:00Z");
  assert.ok(caps.every((x) => x.status === "unverified" || x.status === "unsupported"), "hiçbir yetenek 'verified' bildirilmez");
});

test("CLI: testsprite bildirir ve engelleri yazar; ajan olarak yüksek riski etkinleştiremez; hatalı kullanım 2", () => {
  const { dir } = world();
  const run = (...a: string[]) => { try { return { status: 0, out: execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "scripts/entegrasyon.mjs", ...a], { cwd: resolve(import.meta.dirname, "..", ".."), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }) }; } catch (e: any) { return { status: e.status as number, out: String(e.stdout ?? "") }; } };
  const t = JSON.parse(run("testsprite", dir).out);
  assert.equal(t.integration.state, "discovered");
  assert.equal(t.readiness.ready, false);
  assert.equal(run("yapilandir", dir, "provider", "testsprite").status, 0);
  assert.equal(run("etkinlestir", dir, "provider", "testsprite").status, 1, "onay yok");
  assert.equal(run("onayla", dir, "provider", "testsprite", "--ajan").status, 1, "ajan onaylayamaz");
  assert.equal(run("onayla", dir, "provider", "testsprite").status, 0);
  assert.equal(run("etkinlestir", dir, "provider", "testsprite", "--ajan").status, 1, "ajan yüksek riski etkinleştiremez");
  assert.equal(run("etkinlestir", dir, "provider", "testsprite").status, 0);
  assert.equal(JSON.parse(run("liste", dir).out).integrations[0].effective, true);
  assert.equal(run("liste").status, 2);
  assert.equal(run("liste", dir, "--x").status, 2);
  assert.equal(run("etkinlestir", dir, "yok-tur", "x").status, 1);
});

test("denetim A1/A10: ajanın bildirdiği risk her zaman yüksektir; kullanıcının kapattığını ajan açamaz; kaldır-yeniden keşfet riski düşüremez", () => {
  const { c } = world();
  const v = c.record({ kind: "tool", id: "sinsi", action: "discover", actor: agent, risk: "low" });
  assert.equal(v.risk, "high", "ajan 'low' beyan etse de yüksek");
  c.record({ kind: "tool", id: "sinsi", action: "configure", actor: agent });
  assert.throws(() => c.record({ kind: "tool", id: "sinsi", action: "enable", actor: agent }), code("approval_required"));
  // düşük riskli, kullanıcı bildirimi: kullanıcı kapatınca ajan geri açamaz
  c.record({ kind: "ide", id: "e", action: "discover", actor: user, risk: "low" });
  c.record({ kind: "ide", id: "e", action: "configure", actor: user });
  c.record({ kind: "ide", id: "e", action: "enable", actor: agent });
  c.record({ kind: "ide", id: "e", action: "disable", actor: user });
  assert.throws(() => c.record({ kind: "ide", id: "e", action: "enable", actor: agent }), code("human_required"));
  c.record({ kind: "ide", id: "e", action: "enable", actor: user });
  assert.equal(c.isEffective("ide", "e"), true);
  // yüksek riskli kaydı kullanıcı kaldırdıysa ajan 'low' ile yeniden açamaz
  c.record({ kind: "mcp", id: "m", action: "discover", actor: user });
  c.record({ kind: "mcp", id: "m", action: "remove", actor: user });
  c.record({ kind: "mcp", id: "m", action: "discover", actor: agent, risk: "low" });
  assert.equal(c.get("mcp", "m")?.risk, "high");
});

test("denetim A2: TestSprite daha düşük riskle önceden kaydedilmişse bildirim reddeder ve hazırlık engeli yazar", () => {
  const { c } = world();
  c.record({ kind: "provider", id: TESTSPRITE_ID, action: "discover", actor: user, risk: "low" });
  assert.throws(() => declareTestSprite(c, user), code("wrong_registration"));
  assert.ok(testspriteReadiness(c, true).blockers.some((b) => /lower risk/.test(b)));
});

test("denetim B: zaman damgası ISO olmalı; günlükte boş satırlar sayılmaz; CLI fazla argümanı reddeder", () => {
  const { dir, c } = world();
  assert.equal(replay(["{\"schema\":\"x\"}"]).problems.length, 1, "bozuk satır raporlanır");
  writeFileSync(join(dir, LOG_FILE), "\n".repeat(30000));
  assert.deepEqual(c.overview().integrations, [], "boş satırlar günlüğü doldurmaz");
  assert.equal(c.record({ kind: "ide", id: "z", action: "discover", actor: user, risk: "low" }).state, "discovered");
});
