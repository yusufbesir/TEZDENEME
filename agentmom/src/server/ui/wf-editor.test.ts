// Görsel iş akışı editörü (madde 16) saf mantık testleri: sunucu validateDefinition ile eşlik. Sahip: Claude [İP:AgentMom devam].
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { ValidationError, validateDefinition } from "../../workflows/types.ts";

const dir = import.meta.dirname as string;
const win: any = {};
vm.runInContext(fs.readFileSync(path.join(dir, "wf-editor.js"), "utf8"), vm.createContext({ window: win }), { filename: "wf-editor.js" });
const W = win.AM_WFEDIT;
const J = (x: unknown): any => JSON.parse(JSON.stringify(x));
const PROVIDERS = ["a", "b"];
const isReg = (id: string): boolean => PROVIDERS.includes(id);

function serverCode(def: unknown): string | null {
  try {
    validateDefinition(def, isReg);
    return null;
  } catch (e) {
    if (e instanceof ValidationError) return e.code;
    throw e;
  }
}

test("eşlik: istemci doğrulaması sunucu validateDefinition ile aynı kararı verir (65 bin kombinasyon)", () => {
  const opts = ["", "a", "b", "zz"];
  const fbs = [[], ["b"], ["a", "b"], ["zz"]];
  const planFbs = [[], ["zz"]];
  let n = 0;
  let okCount = 0;
  for (let mask = 0; mask < 16; mask++) {
    for (let pi = 0; pi < 64; pi++) {
      for (let fi = 0; fi < 16; fi++) {
        for (const allowSame of [false, true]) {
         for (const pf of planFbs) {
          const model = W.blank();
          model.allowSame = allowSame;
          W.ROLES.forEach((r: string, i: number) => { model.roles[r].on = (mask & (1 << i)) !== 0; });
          model.roles.plan.provider = opts[pi & 3];
          model.roles.implement.provider = opts[(pi >> 2) & 3];
          model.roles.review.provider = opts[(pi >> 4) & 3];
          model.roles.implement.fallbacks = fbs[fi % 4];
          model.roles.review.fallbacks = fbs[Math.floor(fi / 4)];
          model.roles.plan.fallbacks = pf;
          const problems = W.validate(model, PROVIDERS);
          const code = serverCode(W.toDefinition(model));
          n++;
          if (code === null) {
            okCount++;
            assert.equal(problems.length, 0, "sunucu kabul etti, istemci sorun saydı: " + JSON.stringify(model));
          } else {
            assert.ok(problems.length > 0, "sunucu reddetti, istemci kabul etti: " + code + " " + JSON.stringify(model));
            assert.ok(problems.some((p: any) => p.code === code), `sunucu kodu ${code} istemci listesinde yok: ${JSON.stringify(problems)}`);
          }
         }
        }
      }
    }
  }
  assert.equal(n, 65536);
  assert.ok(okCount > 100, "geçerli örnek sayısı: " + okCount);
});

test("toDefinition: sırayı sabit tutar, doğrulama adımı sağlayıcı taşımaz, boş alanlar çıkmaz", () => {
  const m = W.blank();
  m.roles.verify.on = true; m.roles.implement.on = true; m.roles.review.on = true;
  m.roles.implement.provider = "a"; m.roles.review.provider = "b"; m.roles.review.fallbacks = ["a"]; m.roles.implement.attempts = 2;
  const def = J(W.toDefinition(m));
  assert.deepEqual(def.steps.map((s: any) => s.role), ["implement", "review", "verify"]);
  assert.deepEqual(def.steps[0], { role: "implement", providerId: "a", maxAttempts: 2 });
  assert.deepEqual(def.steps[2], { role: "verify" });
  assert.equal("allowSameProviderReview" in def, false);
  m.allowSame = true;
  assert.equal(J(W.toDefinition(m)).allowSameProviderReview, true);
  assert.deepEqual(J(W.validate(m, PROVIDERS)), []);
  assert.equal(serverCode(def), null);
});

test("normalize: bozuk girdi güvenli şekle iner (bilinmeyen rol, aşırı yedek, geçersiz deneme sayısı)", () => {
  const n = J(W.normalize({ allowSame: "evet", roles: { hack: { on: true }, plan: { on: true, provider: 5, fallbacks: ["a", "b", "c", "d", "e", 7], attempts: 9 }, implement: "x" } }));
  assert.equal(n.allowSame, false);
  assert.equal("hack" in n.roles, false);
  assert.equal(n.roles.plan.provider, "");
  assert.deepEqual(n.roles.plan.fallbacks, ["a", "b", "c"]);
  assert.equal(n.roles.plan.attempts, 0);
  assert.equal(n.roles.implement.on, false);
  assert.deepEqual(J(W.normalize(null)), J(W.blank()));
  const proto = J(W.normalize({ roles: JSON.parse('{"__proto__":{"on":true}}') }));
  assert.equal(proto.roles.plan.on, false);
});

test("validate: sorunlar rol ve anahtarla ayrışır; hiçbir adım seçilmemişse tek sorun", () => {
  assert.deepEqual(J(W.validate(W.blank(), PROVIDERS)), [{ code: "invalid_definition", role: "", key: "noSteps" }]);
  const m = W.blank();
  m.roles.review.on = true; m.roles.verify.on = true;
  const keys = W.validate(m, PROVIDERS).map((p: any) => p.key);
  assert.ok(keys.includes("providerMissing") && keys.includes("reviewNeedsImplement") && keys.includes("verifyNeedsBoth"));
});

test("preset: şablonlar geçerli tanım üretir; sağlayıcı yalnız tek seçenek varsa atanır, tahmin edilmez", () => {
  assert.deepEqual(J(W.PRESET_IDS).sort(), ["build", "full", "plan", "reviewed"]);
  for (const id of W.PRESET_IDS) {
    const none = W.preset(id, ["a", "b"]);
    assert.ok(W.validate(none, PROVIDERS).length > 0, id + ": sağlayıcı seçilmeden geçerli sayılmaz");
    assert.equal(none.roles.implement.provider, "");
  }
  const single = W.preset("build", ["a"]);
  assert.equal(single.roles.implement.provider, "a");
  assert.deepEqual(J(W.validate(single, ["a"])), []);
  assert.deepEqual(J(W.preset("nope", ["a"])), J(W.blank()));
  assert.deepEqual(J(W.validate(W.preset("reviewed", ["a"]), ["a"])).map((p: any) => p.key), ["notIndependent"], "tek sağlayıcıyla gözden geçirme bağımsız sayılmaz");
});

test("diagram: dört düğüm sabit sırada; kapalı roller kapalı işaretlenir", () => {
  const m = W.blank();
  m.roles.implement.on = true; m.roles.implement.provider = "a";
  const d = J(W.diagram(m));
  assert.deepEqual(d.map((x: any) => x.role), ["plan", "implement", "review", "verify"]);
  assert.deepEqual(d.map((x: any) => x.on), [false, true, false, false]);
  assert.equal(d[1].provider, "a");
});

test("eşlik: garip sağlayıcı adları (boşluk, prototip anahtarı) ve deneme sayısı sunucuyla aynı karara varır", () => {
  const names = ["", " ", "\t", "constructor", "toString", "__proto__", "hasOwnProperty", "a", " a"];
  for (const name of names) {
    for (const where of ["provider", "fallback"] as const) {
      const m = W.blank();
      m.roles.implement.on = true;
      if (where === "provider") m.roles.implement.provider = name;
      else { m.roles.implement.provider = "a"; m.roles.implement.fallbacks = [name]; }
      const code = serverCode(W.toDefinition(m));
      const problems = W.validate(m, PROVIDERS);
      if (code === null) assert.equal(problems.length, 0, `${where}=${JSON.stringify(name)}: sunucu kabul etti`);
      else assert.ok(problems.length > 0, `${where}=${JSON.stringify(name)}: sunucu reddetti (${code}), istemci kabul etti`);
    }
  }
  for (const att of [0, 1, 2, 3, 4, -1, 1.5, "2", null]) {
    const m = W.blank();
    m.roles.plan.on = true; m.roles.plan.provider = "a"; m.roles.plan.attempts = att;
    assert.deepEqual(J(W.validate(m, PROVIDERS)), [], "normalize geçersiz deneme sayısını eler: " + JSON.stringify(att));
    assert.equal(serverCode(W.toDefinition(m)), null);
  }
});

test("validate: boş iki sağlayıcı için 'bağımsız değil' ek uyarısı çıkmaz (yalnız eksik sağlayıcı)", () => {
  const m = W.preset("reviewed", ["a", "b"]);
  assert.deepEqual(J(W.validate(m, PROVIDERS)).map((p: any) => p.key), ["providerMissing", "providerMissing"]);
});
