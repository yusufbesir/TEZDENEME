// Veri sınırı ek sezgisi testleri (kodlanmış/yüksek entropili uzun dizgi => secret). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Saf işlev testleri: ağ, model, dosya yok. Yanlış alarm riski kodda belgelidir; burada sınırı testle çiziyoruz.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyText, looksLikeEncodedSecret } from "./data-boundary.ts";

test("yakalananlar: base64/URL-güvenli karışık harfli uzun dizgi ve >= 32 karakterlik çeşitli onaltılık dizgi", () => {
  for (const s of [
    "aB3dE9fGh1JkLm0NpQr5StUv7WxYz2AbCdEfGh",
    "x9Zk2Lq8Vb4Nm7Rt1Yp6Hs3Jd5Fg0WcQeAuBoIiK=",
    "Zm9vYmFyOnN1cGVyLXNlY3JldC1wYXNzd29yZC12YWx1ZQ0aBcD",
    "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    "0123456789abcdef0123456789abcdef",
    "token_aB3dE9fGh1JkLm0NpQr5StUv7WxYz2AbCdEf",
  ]) {
    assert.equal(looksLikeEncodedSecret(`bağlam ${s} sonu`), true, s);
    assert.equal(classifyText(`bağlam ${s} sonu`), "secret", s);
  }
});

test("yakalanmayanlar (yanlış alarm sınırı): düz metin, kısa kimlik, UUID, kebab/slug, küçük harfli uzun sözcük, tekrarlı dizgi", () => {
  for (const s of [
    "Önbellek tutarlılığı nasıl sağlanır, hangi çözüm aileleri vardır?",
    "docs/decisions/ADR-016-yetenekler-cagrilan-aractir ve src/server/ui/page-integrations.js",
    "00000000-0000-4000-8000-000000000001",
    "a1b2c3d4e5f6a7b8",
    "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "KULLANICI_GIRDISI#0123456789abcdef",
    "11111111111111111111111111111111",
  ]) {
    assert.equal(looksLikeEncodedSecret(s), false, s);
    assert.equal(classifyText(s), "internal", s);
  }
});

test("mevcut kalıp tabanlı sınıflandırma bozulmadı", () => {
  assert.equal(classifyText("anahtar sk-abcdefghijklmnopqrstuvwxyz123456"), "secret");
  assert.equal(classifyText("password: hunter2hunter2"), "secret");
  assert.equal(classifyText("normal metin"), "internal");
});
