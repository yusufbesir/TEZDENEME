'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../../pc/eslestirme');

const yeniSir = () => Uint8Array.from({ length: 32 }, (_, i) => i + 1);

test('sirYenile: onay reddedilirse hiçbir şey yapılmaz', async () => {
  const kayit = [];
  const s = { sirDegistir: async () => kayit.push('sunucu') };
  for (const onay of [async () => false, async () => { throw new Error('x'); }, async () => 'evet']) {
    const r = await E.sirYenile({ onayIste: onay, sirUret: () => { kayit.push('uret'); return yeniSir(); }, sirKaydet: () => { kayit.push('kaydet'); return true; }, sunucu: s });
    assert.deepStrictEqual(r, { durum: 'reddedildi' });
  }
  assert.deepStrictEqual(kayit, []);
});

test('sirYenile: yeni sır üretilir, sunucu.sirDegistir çağrılır, safeStorage ile kaydedilir', async () => {
  const kayit = [];
  const s = { sirDegistir: async (y) => kayit.push(['sunucu', y.length, y[0]]) };
  let soru;
  const r = await E.sirYenile({ onayIste: async (a) => { soru = a; return true; }, sirUret: yeniSir, sirKaydet: (y) => { kayit.push(['kaydet', y.length]); return true; }, sunucu: s });
  assert.match(soru, /bağlantısı kesilir/);
  assert.strictEqual(r.durum, 'yenilendi'); assert.strictEqual(r.kalici, true); assert.strictEqual(r.sunucuYontemi, 'sirDegistir');
  assert.deepStrictEqual(Array.from(r.sir), Array.from(yeniSir()));
  assert.deepStrictEqual(kayit, [['sunucu', 32, 1], ['kaydet', 32]], 'önce sunucu, sonra kayıt');
});

test('sirYenile: sunucu yok / sirDegistir yok / sunucu hata / kayıt yok-hata durumları', async () => {
  const baz = { onayIste: async () => true, sirUret: yeniSir, sirKaydet: () => true };
  assert.strictEqual((await E.sirYenile({ ...baz, sunucu: null })).sunucuYontemi, 'sunucu-yok');
  assert.strictEqual((await E.sirYenile({ ...baz, sunucu: { aktifOturumVar: () => true } })).sunucuYontemi, 'yeniden-baslat');
  const hata = await E.sirYenile({ ...baz, sunucu: { sirDegistir: async () => { throw new Error('x'); } }, sirKaydet: () => { throw new Error('kaydedilmemeliydi'); } });
  assert.deepStrictEqual(hata, { durum: 'hata' });
  assert.strictEqual((await E.sirYenile({ ...baz, sirKaydet: () => false, sunucu: null })).kalici, false);
  assert.strictEqual((await E.sirYenile({ ...baz, sirKaydet: () => { throw new Error('x'); }, sunucu: null })).kalici, false);
  assert.deepStrictEqual(await E.sirYenile({ ...baz, sirUret: () => new Uint8Array(5), sunucu: null }), { durum: 'hata' });
});

test('telefonuKes: oturumuKes varsa çağrılır, yoksa/hata verirse false', async () => {
  let n = 0;
  assert.strictEqual(await E.telefonuKes({ oturumuKes: async () => { n++; } }), true);
  assert.strictEqual(n, 1);
  assert.strictEqual(await E.telefonuKes({}), false);
  assert.strictEqual(await E.telefonuKes(null), false);
  assert.strictEqual(await E.telefonuKes({ oturumuKes: () => { throw new Error('x'); } }), false);
});

test('baglananIp / ipTemizle / durum metinleri', () => {
  assert.strictEqual(E.baglananIp({ baglananIp: () => '192.168.1.7' }), '192.168.1.7');
  assert.strictEqual(E.baglananIp({ baglananIp: () => '::ffff:10.0.0.2' }), '10.0.0.2');
  assert.strictEqual(E.baglananIp({ baglananIp: () => null }), null);
  assert.strictEqual(E.baglananIp({ baglananIp: () => 'x<b>' }), null);
  assert.strictEqual(E.baglananIp({ baglananIp: () => { throw new Error('x'); } }), null);
  assert.strictEqual(E.baglananIp({}), null);
  assert.strictEqual(E.baglananIp(null), null);
  assert.strictEqual(E.telefonDurumMetni({ sunucuVar: false }), 'Telefon bağlantısı kapalı');
  assert.strictEqual(E.telefonDurumMetni({ sunucuVar: true, bagli: false }), 'Telefon bağlı değil');
  assert.strictEqual(E.telefonDurumMetni({ sunucuVar: true, bagli: true, ip: '192.168.1.7' }), 'Bağlı telefon: 192.168.1.7');
  assert.strictEqual(E.telefonDurumMetni({ sunucuVar: true, bagli: true, ip: null }), 'Telefon bağlı');
  assert.notStrictEqual(E.durumImzasi({ sunucuVar: true, bagli: true, ip: 'a' }), E.durumImzasi({ sunucuVar: true, bagli: true, ip: 'b' }));
  assert.strictEqual(E.KOD_UYARISI, 'Kodu kimseyle paylaşma; sızdıysa yenile.');
});
