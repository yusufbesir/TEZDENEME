'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { lanIpSec } = require('../../pc/ag');
const { izinliKaynak, istekIzinli, gonderenGecerli } = require('../../pc/guvenlik');
const { depoOlustur } = require('../../pc/depo');
const ikon = require('../../pc/ikon');

const gecici = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pyd-'));

test('lanIpSec: özel adres seçilir, sanal/dahili/IPv6/genel elenir, 192.168 öncelikli', () => {
  const a = (address, internal, family) => ({ address, internal: !!internal, family: family || 'IPv4' });
  assert.strictEqual(lanIpSec({ Ethernet: [a('10.0.0.5')], 'Wi-Fi': [a('192.168.1.20')] }), '192.168.1.20');
  assert.strictEqual(lanIpSec({ 'vEthernet (WSL)': [a('172.20.0.1')], Ethernet: [a('10.1.2.3')] }), '10.1.2.3');
  assert.strictEqual(lanIpSec({ lo: [a('127.0.0.1', true)], Ethernet: [a('8.8.8.8')], x: [a('fe80::1', false, 'IPv6')] }), null);
  assert.strictEqual(lanIpSec({ Ethernet: [a('172.32.0.1')] }), null);
  assert.strictEqual(lanIpSec({ Ethernet: [a('172.31.0.9')] }), '172.31.0.9');
  assert.strictEqual(lanIpSec({ Ethernet: [a('192.168.1.999')] }), null);
  assert.strictEqual(lanIpSec({ Ethernet: [a('169.254.1.1')] }), null);
  assert.strictEqual(lanIpSec(null), null);
});

test('izinliKaynak: yalnız izinli yerel dosya; uzak/UNC/başka dosya reddedilir', () => {
  const izin = [path.resolve('/uygulama/arayuz/index.html')];
  const url = require('node:url').pathToFileURL(izin[0]).href;
  assert.ok(izinliKaynak(url, izin));
  assert.ok(izinliKaynak(url + '?mod=pc#x', izin));
  ['https://example.com/index.html', 'file://sunucu/paylasim/index.html', 'file:///uygulama/arayuz/baska.html', 'file:///uygulama/arayuz/../x.html',
    'javascript:1', 'data:text/html,x', '', null, 5, 'file:///' + 'a'.repeat(5000)].forEach((u) => assert.ok(!izinliKaynak(u, izin), String(u).slice(0, 40)));
});

test('istekIzinli: file:// yalnız uygulamanın kaynak klasörleri içinde (ve yerel data:image/blob:)', () => {
  const kok = path.resolve('/uygulama');
  const arayuz = path.resolve('/uygulama/arayuz');
  const f = (...p) => require('node:url').pathToFileURL(path.join(...p)).href;
  assert.ok(istekIzinli(f(arayuz, 'index.html'), [arayuz]));
  assert.ok(istekIzinli(f(arayuz, 'alt', 'stil.css') + '?v=1#x', [arayuz]));
  assert.ok(istekIzinli(f(kok, 'karakter.html'), [kok, arayuz]));
  // kök dışı, kardeş klasör öneki, üst klasör, kökün kendisi
  [f('/etc/passwd'), f('/uygulama-baska/x.html'), f('/uygulama/gizli.txt'), f(arayuz), 'file:///uygulama/arayuz/../gizli.txt',
    'file:///uygulama/arayuz/%2e%2e/gizli.txt', 'file:///uygulama/arayuz%2f..%2fgizli', 'file://sunucu/paylasim/arayuz/index.html',
    'file:///' + 'a'.repeat(5000)].forEach((u) => assert.ok(!istekIzinli(u, [arayuz]), u.slice(0, 50)));
  // kökler verilmezse file:// reddedilir (kapalı varsayılan); göreli kök geçersiz
  assert.ok(!istekIzinli(f(arayuz, 'index.html')));
  assert.ok(!istekIzinli(f(arayuz, 'index.html'), []));
  assert.ok(!istekIzinli(f(arayuz, 'index.html'), ['arayuz']));
  assert.ok(istekIzinli('data:image/png;base64,AAAA', [arayuz]));
  assert.ok(istekIzinli('blob:null/abc', [arayuz]));
  ['https://example.com/', 'http://127.0.0.1:11434/', 'ws://192.168.1.2:1/', 'data:text/html,x', 'javascript:1', undefined, null, 5]
    .forEach((u) => assert.ok(!istekIzinli(u, [arayuz]), String(u)));
});

test('gonderenGecerli: yalnız bizim pencerenin ana çerçevesi ve izinli sayfa', () => {
  const izin = [path.resolve('/u/arayuz/index.html')];
  const url = require('node:url').pathToFileURL(izin[0]).href;
  const wc = { mainFrame: { url } };
  wc.mainFrame = { url };
  const pencere = { webContents: wc, isDestroyed: () => false };
  assert.ok(gonderenGecerli({ sender: wc, senderFrame: wc.mainFrame }, [pencere], izin));
  assert.ok(!gonderenGecerli({ sender: wc, senderFrame: { url } }, [pencere], izin), 'alt çerçeve');
  assert.ok(!gonderenGecerli({ sender: { mainFrame: wc.mainFrame }, senderFrame: wc.mainFrame }, [pencere], izin), 'başka webContents');
  const kotu = { mainFrame: { url: 'https://evil.example/' } };
  assert.ok(!gonderenGecerli({ sender: kotu, senderFrame: kotu.mainFrame }, [{ webContents: kotu, isDestroyed: () => false }], izin));
  assert.ok(!gonderenGecerli({ sender: wc, senderFrame: wc.mainFrame }, [{ webContents: wc, isDestroyed: () => true }], izin));
  assert.ok(!gonderenGecerli({}, [pencere], izin));
  assert.ok(!gonderenGecerli(null, [pencere], izin));
});

test('depo: yaz/oku kalıcı, derin kopya, __proto__ anahtarı kirletmez, geçersiz anahtar reddedilir', () => {
  const k = gecici(); const dosya = path.join(k, 'depo.json');
  const d = depoOlustur(dosya, fs);
  assert.strictEqual(d.oku('yok'), undefined);
  const nesne = { a: [1, 2] };
  d.yaz('notlar', nesne); nesne.a.push(3);
  assert.deepStrictEqual(d.oku('notlar'), { a: [1, 2] });
  const o = d.oku('notlar'); o.a.push(9);
  assert.deepStrictEqual(d.oku('notlar'), { a: [1, 2] });
  d.yaz('__proto__', { kirli: true });
  assert.strictEqual({}.kirli, undefined);
  assert.throws(() => d.yaz('', 1));
  assert.throws(() => d.yaz('x'.repeat(101), 1));
  assert.throws(() => d.yaz('buyuk', 'x'.repeat((1 << 20) + 10)));
  assert.strictEqual(d.oku('buyuk'), undefined, 'başarısız yazım geri alınır');
  const d2 = depoOlustur(dosya, fs);
  assert.deepStrictEqual(d2.oku('notlar'), { a: [1, 2] });
  assert.ok(!fs.existsSync(dosya + '.tmp'));
  fs.writeFileSync(dosya, '{bozuk');
  assert.strictEqual(depoOlustur(dosya, fs).oku('notlar'), undefined);
});

test('ikon: geçerli PNG (imza, IHDR, CRC, piksel), uyarı rengi farklı', () => {
  const b = ikon.png(256, false);
  assert.deepStrictEqual([...b.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.strictEqual(b.readUInt32BE(16), 256);
  assert.strictEqual(b.readUInt32BE(20), 256);
  // blokları gez: CRC doğrula, IDAT'ı aç
  let o = 8; const idat = []; let son = '';
  while (o < b.length) {
    const n = b.readUInt32BE(o); const tur = b.toString('ascii', o + 4, o + 8);
    assert.strictEqual(b.readUInt32BE(o + 8 + n), ikon.crc32(b.subarray(o + 4, o + 8 + n)), tur);
    if (tur === 'IDAT') idat.push(b.subarray(o + 8, o + 8 + n));
    son = tur; o += 12 + n;
  }
  assert.strictEqual(son, 'IEND');
  const ham = zlib.inflateSync(Buffer.concat(idat));
  assert.strictEqual(ham.length, (256 * 4 + 1) * 256);
  assert.strictEqual(ham[0], 0);
  assert.strictEqual(ham[1 + 3], 0, 'sol üst köşe saydam');
  assert.ok(!ikon.png(32, true).equals(ikon.png(32, false)));
  DESEN_KONTROL();
  function DESEN_KONTROL() { assert.strictEqual(ikon.DESEN.length, 16); ikon.DESEN.forEach((s) => assert.strictEqual(s.length, 16)); }
  assert.strictEqual(ikon.crc32(Buffer.from('123456789')), 0xCBF43926);
  assert.throws(() => ikon.pngKodla(0, 1, Buffer.alloc(0)));
  assert.throws(() => ikon.pngKodla(2, 2, Buffer.alloc(3)));
  const diskte = path.join(__dirname, '..', '..', 'pc', 'build', 'icon.png');
  if (fs.existsSync(diskte)) assert.strictEqual(fs.readFileSync(diskte).readUInt32BE(16), 256);
});
