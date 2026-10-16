'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../../protokol/sifre');

test('kod üret/ayrıştır gidiş-dönüş, biçim', () => {
  const { sir, kod } = S.kodUret();
  assert.match(kod, /^PIRIL-([A-Z2-7]{8}-){6}[A-Z2-7]{7}$/);
  assert.deepEqual(S.kodAyristir(kod), sir);
  assert.deepEqual(S.kodAyristir(kod.toLowerCase().replace(/-/g, ' ')), sir);
});

test('kod: hatalı karakter, uzunluk, sağlama, önek reddedilir', () => {
  const { kod } = S.kodUret();
  assert.throws(() => S.kodAyristir(kod.slice(0, -1)), { kod: 'kod_uzunluk' });
  assert.throws(() => S.kodAyristir(kod + 'A'), { kod: 'kod_uzunluk' });
  assert.throws(() => S.kodAyristir(kod.slice(0, 8) + '1' + kod.slice(9)), { kod: 'kod_karakter' });
  assert.throws(() => S.kodAyristir(kod.replace('PIRIL-', 'PIRAL-')), { kod: 'kod_onek' });
  // geçerli alfabede tek karakter değişimi -> sağlama toplamı (ya da dolgu) hatası
  const i = 10;
  const yeni = kod[i] === 'A' ? 'B' : 'A';
  assert.throws(() => S.kodAyristir(kod.slice(0, i) + yeni + kod.slice(i + 1)), (e) => ['kod_toplam', 'kod_karakter'].includes(e.kod));
  assert.throws(() => S.kodAyristir(123), { kod: 'kod_tip' });
});

test('base64 Buffer ile uyumlu', () => {
  for (let n = 0; n < 40; n++) {
    const u = S.rastgele(n);
    assert.equal(S.b64Kodla(u), Buffer.from(u).toString('base64'));
    assert.deepEqual(S.b64Coz(S.b64Kodla(u)), u);
  }
  assert.throws(() => S.b64Coz('AAA'));
  assert.throws(() => S.b64Coz('AA*A'));
});

// İstemci ve sunucu tarafını taklit eden ECDH yardımcısı.
async function elSik(sir, ri, rs, i = null, sv = null) {
  i = i || (await S.geciciUret());
  sv = sv || (await S.geciciUret());
  const ist = await S.anahtarlariTuret(sir, ri, rs, { ozel: i.ozel, karsiAcik: sv.acik, istemciAcik: i.acik, sunucuAcik: sv.acik });
  const sun = await S.anahtarlariTuret(sir, ri, rs, { ozel: sv.ozel, karsiAcik: i.acik, istemciAcik: i.acik, sunucuAcik: sv.acik });
  return { ist, sun, i, sv };
}

test('HKDF+ECDH: iki taraf aynı anahtarı türetir; iki yön farklı; yanlış sayaç/anahtar başarısız', async () => {
  const sir = S.rastgele(32), ri = S.rastgele(16), rs = S.rastgele(16);
  const { ist, sun } = await elSik(sir, ri, rs);
  const duz = new TextEncoder().encode('merhaba');
  const c = await S.sifrele(ist.c2s, 1, duz);
  assert.deepEqual(await S.coz(sun.c2s, 1, c), duz);
  await assert.rejects(S.coz(ist.c2s, 2, c));
  await assert.rejects(S.coz(sun.s2c, 1, c));
  const k2 = await elSik(sir, ri, S.rastgele(16));
  await assert.rejects(S.coz(k2.sun.c2s, 1, c));
  assert.deepEqual([...S.nonceYap(258)], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2]);
});

test('ileri gizlilik: sır, ri ve rs aynı olsa bile farklı geçici anahtar farklı oturum anahtarı verir', async () => {
  const sir = S.rastgele(32), ri = S.rastgele(16), rs = S.rastgele(16);
  const a = await elSik(sir, ri, rs);
  const b = await elSik(sir, ri, rs);
  const duz = new TextEncoder().encode('gizli');
  const c = await S.sifrele(a.ist.c2s, 1, duz);
  await assert.rejects(S.coz(b.sun.c2s, 1, c));
  // sırrı bilen ama geçici özel anahtarı bilmeyen saldırgan (kendi anahtarıyla) çözemez
  const saldirgan = await S.anahtarlariTuret(sir, ri, rs, {
    ozel: (await S.geciciUret()).ozel, karsiAcik: a.sv.acik, istemciAcik: a.i.acik, sunucuAcik: a.sv.acik,
  });
  await assert.rejects(S.coz(saldirgan.c2s, 1, c));
  // geçici anahtarlar doğru ama sır yanlış
  const yanlisSir = await elSik(S.rastgele(32), ri, rs, a.i, a.sv);
  await assert.rejects(S.coz(yanlisSir.sun.c2s, 1, c));
});

test('ECDH: geçersiz açık anahtar reddedilir', async () => {
  const sir = S.rastgele(32), ri = S.rastgele(16), rs = S.rastgele(16);
  const g = await S.geciciUret();
  const kotu = new Uint8Array(65); kotu[0] = 4; // eğri üzerinde değil
  await assert.rejects(S.anahtarlariTuret(sir, ri, rs, { ozel: g.ozel, karsiAcik: kotu, istemciAcik: g.acik, sunucuAcik: kotu }), { kod: 'ecdh' });
  await assert.rejects(S.anahtarlariTuret(sir, ri, rs), { kod: 'ecdh' });
});

test('Alici: sayaç tam son+1 olmalı; boşluk, tekrar, geri sarma reddedilir, ardından alıcı bozulur', async () => {
  const sir = S.rastgele(32);
  const { ist } = await elSik(sir, S.rastgele(16), S.rastgele(16));
  const g = new S.Gonderici(ist.c2s);
  const z = [];
  for (let i = 0; i < 3; i++) await g.gonder({ t: 'x', i }, (m) => z.push(m));
  assert.equal(JSON.parse(z[2]).n, 3);
  assert.equal(JSON.parse(z[2]).v, 2);
  const a = new S.Alici(ist.c2s);
  assert.deepEqual(S.jsonCoz(await a.coz(z[0])), { t: 'x', i: 0 });
  assert.deepEqual(S.jsonCoz(await a.coz(z[1])), { t: 'x', i: 1 });
  assert.deepEqual(S.jsonCoz(await a.coz(z[2])), { t: 'x', i: 2 });
  await assert.rejects(a.coz(z[2]), { kod: 'sayac_geri' });
  await assert.rejects(a.coz(z[0]), { kod: 'bozuk' }); // kalıcı kapanış
  const b = new S.Alici(ist.c2s);
  await b.coz(z[0]);
  await assert.rejects(b.coz(z[2]), { kod: 'sayac_bosluk' }); // atlama yok
  await assert.rejects(b.coz(z[1]), { kod: 'bozuk' });
  const c = new S.Alici(ist.c2s);
  await assert.rejects(c.coz(z[1]), { kod: 'sayac_bosluk' }); // ilk zarf n=1 olmalı
});

test('v:1 zarf reddedilir', async () => {
  const { ist } = await elSik(S.rastgele(32), S.rastgele(16), S.rastgele(16));
  const g = new S.Gonderici(ist.c2s);
  const z = [];
  await g.gonder({ t: 'x' }, (m) => z.push(m));
  const eski = JSON.stringify({ ...JSON.parse(z[0]), v: 1 });
  await assert.rejects(new S.Alici(ist.c2s).coz(eski), { kod: 'surum' });
});
