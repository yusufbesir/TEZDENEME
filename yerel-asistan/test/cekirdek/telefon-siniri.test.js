'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { calistir, ctxYap } = require('./yardimci');
const uygulamaAc = require('../../cekirdek/beceriler/uygulama-ac');

const RET = /uzaktan kontrole izin verilmeli/;

test('telefon kaynaklı pano ve dosya-ara: uzak kontrol kapalıyken nazik ret, platform çağrılmaz', async () => {
  for (const [metin, niyet] of [['panoyu oku', 'pano'], ['panoya kopyala merhaba', 'pano'], ['dosya ara rapor', 'dosya-ara']]) {
    for (const ek of [{ kaynak: 'telefon' }, { kaynak: 'telefon', uzakKontrolAcik: () => false }, { kaynak: 'telefon', uzakKontrolAcik: () => { throw new Error('x'); } },
      { kaynak: 'telefon', uzakKontrolAcik: () => 'evet' }]) {
      const ctx = ctxYap(ek);
      const r = await calistir(metin, ctx);
      assert.equal(r.niyet, niyet);
      assert.match(r.yanit, RET, metin);
      assert.deepEqual(ctx.platform.cagri, []);
    }
  }
});

test('telefon kaynaklı pano ve dosya-ara: uzak kontrol açıkken çalışır', async () => {
  const ctx = ctxYap({ kaynak: 'telefon', uzakKontrolAcik: () => true });
  assert.match((await calistir('panoyu oku', ctx)).yanit, /kopyalanan metin/);
  assert.match((await calistir('dosya ara rapor', ctx)).yanit, /dosya buldum/);
  await calistir('panoya kopyala selam', ctx);
  assert.ok(ctx.platform.cagri.some((c) => c[0] === 'panoYaz'));
});

test('yerel (kaynak yok ya da pc) komutlarda sınır yok; uygulama açma telefondan da çalışır', async () => {
  assert.match((await calistir('panoyu oku', ctxYap())).yanit, /kopyalanan metin/);
  assert.match((await calistir('dosya ara rapor', ctxYap({ kaynak: 'pc' }))).yanit, /dosya buldum/);
  const ctx = ctxYap({ kaynak: 'telefon', uzakKontrolAcik: () => false });
  const r = await calistir('hesap makinesini aç', ctx);
  assert.equal(r.niyet, 'uygulama-ac');
  assert.deepEqual(ctx.platform.cagri, [['uygulamaAc', 'calc']]);
});

test('uygulama-ac KIMLIKLER: tek kimlik listesi, 15 kimlik, becerinin gönderdiği kimliklerle aynı', () => {
  assert.deepEqual([...uygulamaAc.KIMLIKLER], ['calc', 'notepad', 'paint', 'explorer', 'chrome', 'firefox', 'edge', 'spotify', 'vscode', 'word', 'excel', 'powerpoint', 'vlc', 'discord', 'whatsapp']);
  assert.ok(Object.isFrozen(uygulamaAc.KIMLIKLER));
  assert.deepEqual(uygulamaAc._uygulamalar.map((u) => u[1]), [...uygulamaAc.KIMLIKLER]);
});
