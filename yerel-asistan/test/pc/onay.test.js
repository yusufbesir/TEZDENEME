'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { ONAY_ZAMAN_ASIMI_MS, onaySecenekleri, onayYoneticisiOlustur, uzakIsleyicilerOlustur } = require('../../pc/onay');

const bekle = () => new Promise((c) => setImmediate(c));

// Sahte zamanlayıcı: elle ilerletilir
function sahteZaman() {
  const isler = []; let id = 0;
  return {
    setTimeout: (fn, ms) => { isler.push({ id: ++id, fn, ms }); return id; },
    clearTimeout: (i) => { const k = isler.findIndex((x) => x.id === i); if (k >= 0) isler.splice(k, 1); },
    tetikle: () => { const j = isler.splice(0); j.forEach((x) => x.fn()); },
    bekleyen: () => isler.length, isler
  };
}

test('onaySecenekleri: telefondan gelen iş pencerede açıkça yazar; 45 sn uyarısı; metin kırpılır', () => {
  const y = onaySecenekleri('Ekranı kilitle', { kaynak: 'telefon', ip: '192.168.1.5' });
  assert.match(y.message, /Telefon/);
  assert.match(y.detail, /TELEFONUNUZDAN geldi \(192\.168\.1\.5\)/);
  assert.match(y.detail, /45 saniye/);
  assert.match(y.detail, /Ekranı kilitle/);
  assert.deepStrictEqual(y.buttons, ['İzin verme', 'İzin ver']);
  assert.strictEqual(y.defaultId, 0); assert.strictEqual(y.cancelId, 0);
  const yerel = onaySecenekleri('x');
  assert.doesNotMatch(yerel.detail + yerel.message, /telefon/i);
  assert.match(onaySecenekleri('x', { kaynak: 'telefon', ip: 'kötü<script>' }).detail, /TELEFONUNUZDAN geldi\./, 'geçersiz IP gösterilmez');
  assert.ok(onaySecenekleri('a'.repeat(1000)).detail.length < 600);
  assert.strictEqual(ONAY_ZAMAN_ASIMI_MS, 45000);
});

test('onay yöneticisi: İzin ver -> true, İzin verme/hata -> false, kilit serbest kalır', async () => {
  for (const [yanit, beklenen] of [[{ response: 1 }, true], [{ response: 0 }, false], [null, false], [undefined, false]]) {
    const z = sahteZaman();
    const y = onayYoneticisiOlustur({ goster: async () => yanit, setTimeout: z.setTimeout, clearTimeout: z.clearTimeout });
    assert.strictEqual(await y.iste('x'), beklenen);
    assert.strictEqual(y.acikMi(), false);
    assert.strictEqual(z.bekleyen(), 0, 'zamanlayıcı temizlenir');
  }
  const y = onayYoneticisiOlustur({ goster: async () => { throw new Error('x'); } });
  assert.strictEqual(await y.iste('x'), false);
  assert.strictEqual(y.acikMi(), false);
  assert.strictEqual(await onayYoneticisiOlustur({}).iste('x'), false);
});

test('onay yöneticisi: 45 sn zaman aşımı -> reddet, pencere kapatılır (abort), onayAcik serbest kalır, sonraki onay açılabilir', async () => {
  const z = sahteZaman();
  let signal = null; let coz;
  const goster = (secenek, s) => { signal = s; return new Promise((c) => { coz = c; }); }; // kullanıcı yanıt vermez
  const y = onayYoneticisiOlustur({ goster, setTimeout: z.setTimeout, clearTimeout: z.clearTimeout });
  const p = y.iste('riskli', { kaynak: 'telefon' });
  await bekle();
  assert.strictEqual(y.acikMi(), true);
  assert.strictEqual(z.isler[0].ms, 45000);
  assert.strictEqual(signal.aborted, false);
  z.tetikle();
  assert.strictEqual(await p, false);
  assert.strictEqual(signal.aborted, true);
  assert.strictEqual(y.acikMi(), false);
  // kapanmayan eski pencere sonradan "izin ver" dese bile sonuç değişmez; yeni onay açılabilir
  coz({ response: 1 });
  const y2 = y.iste('yeni');
  await bekle(); assert.strictEqual(y.acikMi(), true);
  assert.strictEqual(await Promise.all([y2, (async () => { await bekle(); coz({ response: 1 }); })()]).then((r) => r[0]), true);
});

test('onay yöneticisi: bir pencere açıkken ikinci istek anında reddedilir ve birincisini bozmaz', async () => {
  let coz; let sayi = 0;
  const y = onayYoneticisiOlustur({ goster: () => { sayi++; return new Promise((c) => { coz = c; }); } });
  const bir = y.iste('bir');
  await bekle();
  assert.strictEqual(await y.iste('iki'), false);
  assert.strictEqual(sayi, 1);
  coz({ response: 1 });
  assert.strictEqual(await bir, true);
});

test('uzak girdi: onay penceresi açıkken isaret/tikla/yaz/tus yok sayılır; kapalıyken hata; ekranIste etkilenmez', async () => {
  const cagri = [];
  const uzak = { fareTasi: async (...a) => cagri.push(['fare', ...a]), tikla: async (...a) => cagri.push(['tikla', ...a]), yaz: async (...a) => cagri.push(['yaz', ...a]), tus: async (...a) => cagri.push(['tus', ...a]) };
  let acik = true, onay = false;
  const h = uzakIsleyicilerOlustur({ uzakKontrolAcik: () => acik, onayAcik: () => onay, uzak: () => uzak, ekranOnizleme: async (g) => ({ jpg: 'x', gen: g }) });
  await h.isaret({ x: 0.1, y: 0.2 }); await h.tikla({ x: 0.3, y: 0.4 }); await h.tikla({ x: 0, y: 0, dugme: 'sag' }); await h.yaz({ metin: 'a' }); await h.tus({ tus: 'enter' });
  assert.deepStrictEqual(cagri, [['fare', 0.1, 0.2], ['tikla', 0.3, 0.4, 'sol', 1], ['tikla', 0, 0, 'sag', 1], ['yaz', 'a'], ['tus', 'enter']]);
  cagri.length = 0; onay = true;
  await h.isaret({ x: 0, y: 0 }); await h.tikla({ x: 0, y: 0 }); await h.yaz({ metin: 'a' }); await h.tus({ tus: 'enter' });
  assert.deepStrictEqual(cagri, [], 'onay açıkken hiçbir girdi uygulanmaz');
  assert.deepStrictEqual(await h.ekranIste(), { jpg: 'x', gen: 960 });
  onay = false; acik = false;
  for (const f of [() => h.isaret({ x: 0, y: 0 }), () => h.tikla({ x: 0, y: 0 }), () => h.yaz({ metin: 'a' }), () => h.tus({ tus: 'a' }), () => h.ekranIste()]) {
    await assert.rejects(f(), /kapalı/);
  }
  assert.deepStrictEqual(cagri, []);
});
