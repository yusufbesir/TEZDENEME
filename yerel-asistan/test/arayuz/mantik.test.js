'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../../arayuz/mantik.js');
const K = require('../../arayuz/karakter.js');

test('modSec: parametre ve köprüye göre', () => {
  assert.equal(M.modSec('?mod=pc', false), 'pc');
  assert.equal(M.modSec('?mod=telefon', true), 'telefon');
  assert.equal(M.modSec('', true), 'pc');
  assert.equal(M.modSec('', false), 'telefon');
  assert.equal(M.modSec('?mod=baska', false), 'telefon');
  assert.equal(M.modSec('?x=1&mod=pc', false), 'pc');
});

test('komutYolu', () => {
  assert.equal(M.komutYolu({ mod: 'pc', kopruVar: true }), 'kopru');
  assert.equal(M.komutYolu({ mod: 'pc', kopruVar: false }), 'yok');
  assert.equal(M.komutYolu({ mod: 'telefon', bagli: true }), 'uzak');
  assert.equal(M.komutYolu({ mod: 'telefon', bagli: false }), 'yerel');
});

test('adresCoz: yalnız yerel adresler', () => {
  assert.deepEqual(M.adresCoz('192.168.1.20:9000', 1), { ok: true, url: 'ws://192.168.1.20:9000' });
  assert.deepEqual(M.adresCoz('ws://10.0.0.5', 8765), { ok: true, url: 'ws://10.0.0.5:8765' });
  assert.equal(M.adresCoz('172.16.0.1:1', 1).ok, true);
  assert.equal(M.adresCoz('172.32.0.1:1', 1).ok, false);
  assert.equal(M.adresCoz('8.8.8.8:80', 1).ok, false);
  assert.equal(M.adresCoz('example.com:80', 1).ok, false);
  assert.equal(M.adresCoz('wss://192.168.1.2:1', 1).ok, false);
  assert.equal(M.adresCoz('192.168.1.2:99999', 1).ok, false);
  assert.equal(M.adresCoz('192.168.1.2/yol', 1).ok, false);
  assert.equal(M.adresCoz('', 1).ok, false);
  assert.equal(M.adresCoz('evim.local:5', 1).ok, true);
});

test('kodNormallestir', () => {
  const g = 'ABCDEFGH'.repeat(4) + 'ABCDEFGH'.slice(0, 3);
  const k = M.kodNormallestir(' piril-' + g.toLowerCase() + ' ');
  assert.match(k, /^PIRIL-[A-Z0-9]{8}(-[A-Z0-9]{1,8})+$/);
  assert.equal(M.kodNormallestir('kisa'), null);
  assert.equal(M.kodNormallestir(''), null);
});

test('baglantiDurumu: üç durum', () => {
  assert.equal(M.baglantiDurumu({ mod: 'telefon', bagli: false }).metin, 'Bağlı değil');
  assert.equal(M.baglantiDurumu({ mod: 'telefon', bagli: true, uzakKontrol: false }).metin, 'Bağlı · Uzaktan kontrol kapalı');
  assert.equal(M.baglantiDurumu({ mod: 'telefon', bagli: true, uzakKontrol: true }).metin, 'Bağlı');
  assert.equal(M.uzaktanSekmesiGorunur({ mod: 'telefon', bagli: true }), true);
  assert.equal(M.uzaktanSekmesiGorunur({ mod: 'telefon', bagli: false }), false);
  assert.equal(M.uzaktanSekmesiGorunur({ mod: 'pc', bagli: true }), false);
});

test('adimListesi: boşken görünmez, uydurma adım yok', () => {
  const l = M.adimListesi();
  assert.equal(l.gorunur(), false);
  l.yanittanUygula([]);
  l.yanittanUygula(undefined);
  l.isle('', 'bitti');
  assert.equal(l.gorunur(), false);
  assert.deepEqual(l.liste(), []);
});

test('adimListesi: ilerleme iletileri gerçek sırada, sonra yanıtla birleşir', () => {
  const l = M.adimListesi();
  l.isle('Komut çözümleniyor', 'suruyor');
  assert.deepEqual(l.liste(), [{ etiket: 'Komut çözümleniyor', durum: 'suruyor' }]);
  l.isle('Komut çözümleniyor', 'bitti');
  l.isle('Dosyalar aranıyor', 'suruyor');
  l.yanittanUygula([
    { etiket: 'Komut çözümleniyor', durum: 'bitti' },
    { etiket: 'Dosyalar aranıyor', durum: 'bitti' },
    { etiket: 'Sonuçlar sıralanıyor', durum: 'bitti' },
  ]);
  assert.deepEqual(l.liste().map((a) => [a.etiket, a.durum]), [
    ['Komut çözümleniyor', 'bitti'],
    ['Dosyalar aranıyor', 'bitti'],
    ['Sonuçlar sıralanıyor', 'bitti'],
  ]);
});

test('adimListesi: hata durumu korunur, sürüyor kalmaz, sıfırlanır', () => {
  const l = M.adimListesi();
  l.yanittanUygula([{ etiket: 'A', durum: 'bitti' }, { etiket: 'B', durum: 'hata' }]);
  assert.equal(l.liste()[1].durum, 'hata');
  l.isle('C', 'suruyor');
  l.yanittanUygula([]);
  assert.ok(l.liste().every((a) => a.durum !== 'suruyor'));
  l.sifirla();
  assert.equal(l.gorunur(), false);
});

test('karakterDurumu', () => {
  assert.equal(M.karakterDurumu({ evre: 'dinliyor' }), 'dinliyor');
  assert.equal(M.karakterDurumu({ evre: 'bitti', adimlar: [{ durum: 'bitti' }] }), 'bitti');
  assert.equal(M.karakterDurumu({ evre: 'bitti', adimlar: [{ durum: 'hata' }] }), 'hata');
  assert.equal(M.karakterDurumu({ evre: 'bitti', hata: true }), 'hata');
  assert.equal(M.karakterDurumu({}), 'bekliyor');
});

test('normalKoordinat: 0..1 aralığına sıkıştırır', () => {
  const r = { left: 10, top: 20, width: 200, height: 100 };
  assert.deepEqual(M.normalKoordinat(110, 70, r), { x: 0.5, y: 0.5 });
  assert.deepEqual(M.normalKoordinat(0, 500, r), { x: 0, y: 1 });
  assert.equal(M.normalKoordinat(1, 1, { left: 0, top: 0, width: 0, height: 5 }), null);
});

test('uzakHataMetni ve sayacMetni', () => {
  assert.match(M.uzakHataMetni('uzak_kapali'), /Uzaktan kontrole izin ver/);
  assert.equal(M.uzakHataMetni('x', 'merhaba'), 'merhaba');
  assert.equal(M.sayacMetni(65), '01:05');
  assert.equal(M.sayacMetni(-3), '00:00');
});

test('karakter: 16x16 ızgara, tüm durumlar için geçerli SVG ve rect', () => {
  assert.equal(K.GOVDE.length, 16);
  for (const s of K.GOVDE) assert.equal(s.length, 16);
  for (const d of K.DURUMLAR) {
    const svg = K.svgUret(d);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 16 16"/);
    assert.match(svg, /<rect /);
    assert.ok(!/https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg', '')), 'harici kaynak yok');
    assert.ok(!/style=|<image|<script/.test(svg), 'CSP uyumlu: satır içi stil/görsel/betik yok');
    // Tüm rect'ler ızgara içinde
    for (const m of svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)) {
      assert.ok(+m[1] + +m[3] <= 16 && +m[2] + +m[4] <= 16);
    }
  }
  assert.match(K.svgUret('bekliyor'), /k-goz-kapali/);
  assert.match(K.svgUret('dinliyor'), /k-dalga/);
  assert.notEqual(K.svgUret('bitti'), K.svgUret('hata'));
  assert.equal(K.svgUret('yok-boyle-durum'), K.svgUret('bekliyor'));
});

test('index.html: CSP ve harici kaynak yok', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const h = fs.readFileSync(path.join(__dirname, '../../arayuz/index.html'), 'utf8');
  assert.match(h, /default-src 'self'/);
  assert.match(h, /connect-src 'self' ws:/);
  assert.ok(!/(src|href)="https?:/.test(h));
  assert.ok(!/<script>[^<]/.test(h), 'satır içi betik yok');
  for (const f of ['mantik.js', 'karakter.js', 'uygulama.js', 'stil.css']) {
    assert.ok(fs.existsSync(path.join(__dirname, '../../arayuz', f)));
  }
  const css = fs.readFileSync(path.join(__dirname, '../../arayuz/stil.css'), 'utf8');
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /prefers-contrast/);
  assert.ok(!/url\(\s*['"]?https?:|@import/.test(css));
});
