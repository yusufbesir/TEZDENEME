'use strict';
// Alarm, vade (bildirim zamanı) ve birim dönüşümü testleri.
const test = require('node:test');
const assert = require('node:assert/strict');
const { calistir, ctxYap, bellekDepo, SIMDI } = require('./yardimci');
const vade = require('../../cekirdek/vade');

test('alarm: saat çözümü, listeleme, iptal', async () => {
  const ctx = ctxYap();
  let r = await calistir("sabah 7'ye alarm kur", ctx);
  assert.equal(r.niyet, 'alarm');
  assert.equal(r.eylem.tip, 'alarm');
  const z = new Date(r.eylem.zaman);
  assert.equal(z.getHours(), 7);
  assert.equal(z.getMinutes(), 0);
  assert.ok(z > SIMDI);

  r = await calistir('alarm kur 6:30', ctx);
  assert.equal(new Date(r.eylem.zaman).getMinutes(), 30);

  r = await calistir('alarmları göster', ctx);
  assert.equal(r.niyet, 'alarm');
  assert.match(r.yanit, /07:00/);
  assert.match(r.yanit, /06:30/);

  r = await calistir('alarmı iptal et', ctx);
  assert.equal(r.eylem.tip, 'alarm-iptal');
  // en yakın alarm (06:30) iptal edilir, 07:00 kalır
  r = await calistir('alarmları göster', ctx);
  assert.match(r.yanit, /07:00/);
  assert.doesNotMatch(r.yanit, /06:30/);
});

test('alarm: hatırlatıcı ve sayaç ifadelerine karışmaz', async () => {
  assert.equal((await calistir('5 dakika sayaç kur', ctxYap())).niyet, 'sayac');
  assert.equal((await calistir('yarın 9da toplantıyı hatırlat', ctxYap())).niyet, 'hatirlatici');
});

test('vade: vadesi gelen kayıt bir kez döner, eski olan kaçırıldı sayılır', () => {
  const depo = bellekDepo();
  const t = SIMDI.getTime();
  depo.yaz(vade.ANAHTAR, [
    { id: 1, zaman: new Date(t - 60000).toISOString(), metin: 'süt al', tur: 'hatirlatici' },
    { id: 2, zaman: new Date(t - 8 * 3600000).toISOString(), metin: 'Alarm', tur: 'alarm' },
    { id: 3, zaman: new Date(t + 3600000).toISOString(), metin: 'ileride', tur: 'hatirlatici' },
  ]);
  const s = vade.vadesiGelenler(depo, SIMDI);
  assert.deepEqual(s.vadesiGelen.map((k) => k.id), [1]);
  assert.equal(s.eski, 1);
  assert.equal(vade.bildirimMetni(s.vadesiGelen[0]), 'Hatırlatma: süt al');
  assert.equal(vade.bildirimMetni({ tur: 'alarm', metin: 'Alarm' }), 'Alarm! Kurduğun saat geldi.');
  // ikinci çağrıda aynı kayıt tekrar dönmez, ileri tarihli olan bekler
  const s2 = vade.vadesiGelenler(depo, SIMDI);
  assert.deepEqual(s2.vadesiGelen, []);
  assert.equal(depo.oku(vade.ANAHTAR).find((k) => k.id === 3).tamam, undefined);
  assert.equal(depo.oku(vade.ANAHTAR).find((k) => k.id === 2).kacirildi, true);
});

test('vade: depo yoksa boş döner', () => {
  assert.deepEqual(vade.vadesiGelenler(null, SIMDI), { vadesiGelen: [], eski: 0 });
});

test('birim: uzunluk, kütle, süre, sıcaklık', async () => {
  const d = async (m) => (await calistir(m, ctxYap()));
  assert.equal((await d('3 metre kaç santim')).yanit, '3 metre = 300 santimetre.');
  assert.equal((await d('5 kilo kaç gram')).yanit, '5 kilogram = 5000 gram.');
  assert.equal((await d('3 inç kaç cm')).yanit, '3 inç = 7,62 santimetre.');
  assert.equal((await d('5 dakika kaç saniye')).yanit, '5 dakika = 300 saniye.');
  assert.equal((await d('100 fahrenheit kaç derece')).yanit, '100 fahrenheit = 37,78 santigrat.');
  const u = await d('2 metre kaç kilo');
  assert.equal(u.niyet, 'birim');
  assert.match(u.yanit, /aynı türden değil/);
});

test('birim: KDV dahil, hariç ve yalnız KDV', async () => {
  const d = async (m) => (await calistir(m, ctxYap())).yanit;
  assert.match(await d('yüzde 20 KDV 250 lira'), /300 lira/);
  assert.match(await d('1200 lira kdv hariç'), /1000 lira/);
  assert.match(await d("250 liranın kdv'si yüzde 20"), /50 lira/);
});

test('birim: tarih ve sayaç ifadelerini kapmaz', async () => {
  assert.equal((await calistir('15 gün sonra hangi gün', ctxYap())).niyet, 'tarih');
  assert.equal((await calistir('on gün sonra ne günü', ctxYap())).niyet, 'tarih');
  assert.equal((await calistir('5 dakika sayaç kur', ctxYap())).niyet, 'sayac');
  assert.equal((await calistir('on iki çarpı yedi', ctxYap())).niyet, 'hesap');
});
