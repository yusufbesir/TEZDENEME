'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { kopruOlustur, yerelLlmEtkinMi, yerelLlmAyarla } = require('../../pc/cekirdek-kopru');

const KOK = path.join(__dirname, '..', '..');
const modulYukle = (k, d) => require(path.join(KOK, k, d));

function bellekDepo() { const m = new Map(); return { oku: (k) => m.get(k), yaz: (k, v) => m.set(k, v) }; }
function kur(ek) {
  const o = Object.assign({
    ayar: {}, uzak: false, ilerleme: [], onaylar: [], fetchCagri: [],
    platform: { cagri: [], panoOku: async () => 'gizli pano', dosyaAra: async () => ['C:/a/rapor.txt'], uygulamaAc: async () => {} }
  }, ek);
  const kopru = kopruOlustur({
    modulYukle, depo: () => bellekDepo(), platform: () => o.platform,
    onayIste: async (a, b) => { o.onaylar.push([a, b]); return true; }, uzakKontrolAcik: () => o.uzak,
    ilerlemeYayinla: (e, d) => o.ilerleme.push([e, d]), ayarOku: () => o.ayar,
    fetch: async (url, init) => { o.fetchCagri.push([url, init]); return { ok: true, json: async () => ({ message: { content: 'Yerel yanıt' } }) }; }
  });
  return { o, kopru };
}

test('yerelLlmEtkinMi / yerelLlmAyarla: varsayılan KAPALI, yalnız etkin === true açar', () => {
  [undefined, null, {}, { yerelLlm: null }, { yerelLlm: {} }, { yerelLlm: { etkin: 'true' } }, { yerelLlm: { etkin: 1 } }, { yerelLlm: { etkin: false } }, 'x']
    .forEach((a) => assert.strictEqual(yerelLlmEtkinMi(a), false, JSON.stringify(a)));
  assert.strictEqual(yerelLlmEtkinMi({ yerelLlm: { etkin: true } }), true);
  const a = yerelLlmAyarla({ port: 5000, yerelLlm: { model: 'm1' } }, true);
  assert.deepStrictEqual(a, { port: 5000, yerelLlm: { model: 'm1', etkin: true } });
  assert.deepStrictEqual(yerelLlmAyarla({}, false), { yerelLlm: { etkin: false } });
  assert.deepStrictEqual(yerelLlmAyarla(undefined, true), { yerelLlm: { etkin: true } });
});

test('yerel LLM kapalıyken ctx.yerelLlm yok ve bilinmeyen komutta HİÇ ağ isteği yapılmaz', async () => {
  for (const ayar of [{}, { yerelLlm: { etkin: false } }, { yerelLlm: { etkin: 'evet' } }]) {
    const { o, kopru } = kur({ ayar });
    assert.strictEqual(kopru.ctxKur().yerelLlm, undefined);
    const r = await kopru.komutCalistir('kuantum fiziğini anlat bana uzun uzun');
    assert.strictEqual(r.niyet, 'bilinmiyor');
    assert.strictEqual(o.fetchCagri.length, 0);
  }
});

test('yerel LLM açıkken yalnız http://127.0.0.1:11434 çağrılır; kapatılınca yeniden durur', async () => {
  const { o, kopru } = kur({ ayar: { yerelLlm: { etkin: true } } });
  const r = await kopru.komutCalistir('kuantum fiziğini anlat bana uzun uzun');
  assert.strictEqual(r.yanit, 'Yerel yanıt');
  assert.strictEqual(o.fetchCagri.length, 1);
  assert.strictEqual(o.fetchCagri[0][0], 'http://127.0.0.1:11434/api/chat');
  // eşleşen beceriler LLM'e gitmez
  await kopru.komutCalistir('saat kaç');
  assert.strictEqual(o.fetchCagri.length, 1);
  o.ayar = { yerelLlm: { etkin: false } };
  await kopru.komutCalistir('kuantum fiziğini anlat bana uzun uzun');
  assert.strictEqual(o.fetchCagri.length, 1);
  // geçersiz model adı: LLM kurulamaz -> yok sayılır, ağ yok
  o.ayar = { yerelLlm: { etkin: true, model: 'kötü model;rm' } };
  assert.strictEqual(kopru.ctxKur().yerelLlm, undefined);
});

test('ayarOku hata verirse LLM kapalı sayılır', () => {
  const kopru = kopruOlustur({ modulYukle, depo: () => bellekDepo(), platform: () => ({}), onayIste: async () => true, uzakKontrolAcik: () => false, ilerlemeYayinla() {}, ayarOku: () => { throw new Error('x'); }, fetch: () => assert.fail('ağ yok') });
  assert.strictEqual(kopru.ctxKur().yerelLlm, undefined);
});

test('ctxKur: simdi, depo, platform, onayIste, uzakKontrolAcik', () => {
  const { o, kopru } = kur({ uzak: true });
  const c = kopru.ctxKur();
  assert.ok(c.simdi() instanceof Date);
  assert.strictEqual(c.platform, o.platform);
  assert.strictEqual(typeof c.depo.oku, 'function');
  assert.strictEqual(c.uzakKontrolAcik(), true);
  o.uzak = 'evet'; assert.strictEqual(c.uzakKontrolAcik(), false, 'yalnız true');
});

test('komutCalistir: yalnız gerçek adımlar arayüze ve telefona iletilir', async () => {
  const { o, kopru } = kur();
  const tel = [];
  const r = await kopru.komutCalistir('dosya ara rapor', {}, (e, d) => tel.push([e, d]));
  assert.ok(r.adimlar.length >= 2);
  assert.deepStrictEqual(o.ilerleme, r.adimlar.map((a) => [a.etiket, a.durum]));
  assert.deepStrictEqual(tel, o.ilerleme);
  // telefona iletim hata verse de komut tamamlanır
  const r2 = await kopru.komutCalistir('dosya ara rapor', {}, () => { throw new Error('kapandı'); });
  assert.match(r2.yanit, /dosya buldum/);
});

test('telefonIsleyici: kaynak telefon ZORLANIR; uzak kontrol kapalıyken pano/dosya-ara reddedilir, açıkken çalışır; uygulama açma çalışır', async () => {
  const { o, kopru } = kur();
  let r = await kopru.telefonIsleyici('panoyu oku', {});
  assert.match(r.yanit, /uzaktan kontrole izin verilmeli/);
  r = await kopru.telefonIsleyici('dosya ara rapor', undefined);
  assert.match(r.yanit, /uzaktan kontrole izin verilmeli/);
  r = await kopru.telefonIsleyici('hesap makinesini aç', {});
  assert.match(r.yanit, /açıldı/);
  o.uzak = true;
  r = await kopru.telefonIsleyici('panoyu oku', {});
  assert.match(r.yanit, /gizli pano/);
  // yerel komut (kaynak yok) uzak kontrol kapalıyken de çalışır
  o.uzak = false;
  assert.match((await kopru.komutCalistir('panoyu oku')).yanit, /gizli pano/);
});

test('telefonIsleyici: onay istemcinin onayIste işlevinden, yoksa kaynak:telefon bağlamıyla ana onaydan gelir; ilerleme iletilir', async () => {
  const { o, kopru } = kur({ platform: { kilitle: async () => {}, ekranGoruntusu: async () => ({ yol: 'x' }), dosyaAra: async () => ['C:/a/rapor.txt'] } });
  await kopru.telefonIsleyici('ekranı kilitle', {});
  assert.strictEqual(o.onaylar.length, 1);
  assert.deepStrictEqual(o.onaylar[0][1], { kaynak: 'telefon' });
  const ozel = []; const ilerleme = [];
  const r = await kopru.telefonIsleyici('ekranı kilitle', { onayIste: async (a) => { ozel.push(a); return false; }, ilerleme: (e, d) => ilerleme.push([e, d]) });
  assert.strictEqual(ozel.length, 1);
  assert.match(r.yanit, /Onay verilmedi/);
  assert.strictEqual(o.onaylar.length, 1, 'ana onay tekrar çağrılmadı');
  ilerleme.length = 0;
  o.uzak = true;
  const r3 = await kopru.telefonIsleyici('dosya ara rapor', { ilerleme: (e, d) => ilerleme.push([e, d]) });
  assert.strictEqual(r3.niyet, 'dosya-ara');
  assert.deepStrictEqual(ilerleme, r3.adimlar.map((a) => [a.etiket, a.durum]));
  assert.ok(ilerleme.length >= 2);
});
