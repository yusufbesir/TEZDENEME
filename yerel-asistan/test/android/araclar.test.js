'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { hazirla } = require('../../android/scripts/hazirla.js');
const Y = require('../../android/scripts/yamala.js');

const YAMALAR = path.join(__dirname, '../../android/yamalar');
const GERCEK_KOK = path.join(__dirname, '../..');

function gecici() { return fs.mkdtempSync(path.join(os.tmpdir(), 'piril-')); }
function yaz(dizin, yol, icerik) {
  const t = path.join(dizin, yol);
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.writeFileSync(t, icerik);
}

function sahteKok() {
  const kok = gecici();
  for (const d of ['index.html', 'stil.css', 'mantik.js', 'karakter.js', 'uygulama.js']) yaz(kok, 'arayuz/' + d, '/* ' + d + ' */');
  yaz(kok, 'cekirdek/asistan.js', "const t = require('./turkce'); const b = require('./beceriler'); module.exports = { calistir: async (m) => ({ yanit: t.buyut(m) + b.x }) };");
  yaz(kok, 'cekirdek/turkce.js', "exports.buyut = (s) => s.toUpperCase();");
  yaz(kok, 'cekirdek/beceriler/index.js', "module.exports = { x: require('../veri.json').a };");
  yaz(kok, 'cekirdek/veri.json', '{"a":"!"}');
  yaz(kok, 'protokol/sifre.js', "const api = { s: 1 };\nif (typeof module !== 'undefined' && module.exports) module.exports = api; else globalThis.PirilSifre = api;");
  yaz(kok, 'protokol/istemci.js', "const S = typeof require === 'function' ? require('./sifre') : globalThis.PirilSifre;\nconst api = { sifre: S };\nif (typeof module !== 'undefined' && module.exports) module.exports = api; else globalThis.PirilIstemci = api;");
  return kok;
}

test('hazirla: dosyaları kopyalar, çekirdek paketi tarayıcıda çalışır', async () => {
  const kok = sahteKok();
  const cikis = path.join(gecici(), 'www');
  const s = hazirla({ kok, cikis });
  assert.ok(s.dosyalar.includes('cekirdek.bundle.js'));
  for (const d of ['index.html', 'stil.css', 'mantik.js', 'karakter.js', 'uygulama.js', 'cekirdek.bundle.js', 'sifre.js', 'istemci.js']) {
    assert.ok(fs.existsSync(path.join(cikis, d)), d);
  }
  // Çekirdek paketi: tarayıcı benzeri (require/module yok) bağlamda çalışır
  const bag = { globalThis: null };
  bag.globalThis = bag;
  vm.createContext(bag);
  vm.runInContext(fs.readFileSync(path.join(cikis, 'cekirdek.bundle.js'), 'utf8'), bag);
  assert.equal((await bag.PirilCekirdek.calistir('abc')).yanit, 'ABC!');
  // Protokol: ayrı betikler olarak sırayla yüklenince global'lere bağlanır, `api` çakışmaz
  vm.runInContext(fs.readFileSync(path.join(cikis, 'sifre.js'), 'utf8'), bag);
  vm.runInContext(fs.readFileSync(path.join(cikis, 'istemci.js'), 'utf8'), bag);
  assert.equal(bag.PirilSifre.s, 1);
  assert.equal(bag.PirilIstemci.sifre, bag.PirilSifre);
});

test('hazirla: idempotent (ikinci çalıştırma aynı çıktı)', () => {
  const kok = sahteKok();
  const cikis = path.join(gecici(), 'www');
  hazirla({ kok, cikis });
  const once = fs.readFileSync(path.join(cikis, 'cekirdek.bundle.js'), 'utf8');
  hazirla({ kok, cikis });
  assert.equal(fs.readFileSync(path.join(cikis, 'cekirdek.bundle.js'), 'utf8'), once);
});

test('hazirla: ES modülü ve bilinmeyen paket reddedilir, www bozulmaz', () => {
  const kok = sahteKok();
  const cikis = path.join(gecici(), 'www');
  hazirla({ kok, cikis });
  yaz(kok, 'cekirdek/turkce.js', "export const buyut = (s) => s;");
  assert.throws(() => hazirla({ kok, cikis }), /ES-modül/);
  yaz(kok, 'cekirdek/turkce.js', "const fs = require('fs'); exports.buyut = (s) => s;");
  assert.throws(() => hazirla({ kok, cikis }), /tarayıcıda bulunmayan modül "fs"/);
  assert.ok(fs.existsSync(path.join(cikis, 'cekirdek.bundle.js')));
});

test('hazirla: güvenli olmayan çıkış klasörü reddedilir', () => {
  const kok = sahteKok();
  assert.throws(() => hazirla({ kok, cikis: kok }), /güvenli değil/);
  assert.throws(() => hazirla({ kok, cikis: path.dirname(kok) }), /güvenli değil/);
});

test('hazirla: gerçek depo (cekirdek varsa) paketlenir', { skip: !fs.existsSync(path.join(GERCEK_KOK, 'cekirdek/asistan.js')) }, () => {
  const cikis = path.join(gecici(), 'www');
  hazirla({ kok: GERCEK_KOK, cikis });
  assert.ok(fs.statSync(path.join(cikis, 'cekirdek.bundle.js')).size > 100);
});

const MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true"
        android:theme="@style/AppTheme">
        <activity android:name=".MainActivity" android:exported="true" />
    </application>

    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
`;

function androidKur() {
  const a = gecici();
  yaz(a, 'app/src/main/AndroidManifest.xml', MANIFEST);
  return a;
}

test('yamala: izinler, ağ yapılandırması, idempotent', () => {
  const a = androidKur();
  const r1 = Y.yamala({ androidDizin: a, yamalarDizin: YAMALAR });
  assert.deepEqual(r1.degisen.sort(), ['AndroidManifest.xml', 'res/xml/data_extraction_rules.xml', 'res/xml/network_security_config.xml']);
  const mp = path.join(a, 'app/src/main/AndroidManifest.xml');
  const m = fs.readFileSync(mp, 'utf8');
  for (const i of ['RECORD_AUDIO', 'INTERNET', 'ACCESS_NETWORK_STATE']) {
    assert.equal((m.match(new RegExp('android.permission.' + i + '"', 'g')) || []).length, 1, i);
  }
  assert.match(m, /android:networkSecurityConfig="@xml\/network_security_config"/);
  assert.match(m, /usesCleartextTraffic="false"/);
  assert.ok(!/usesCleartextTraffic="true"/.test(m));
  assert.ok(m.indexOf('</application>') < m.indexOf('RECORD_AUDIO'));
  const r2 = Y.yamala({ androidDizin: a, yamalarDizin: YAMALAR });
  assert.deepEqual(r2.degisen, []);
  assert.equal(fs.readFileSync(mp, 'utf8'), m);
});

test('yamala: yedekleme tamamen kapalı (allowBackup, fullBackupContent, dataExtractionRules), idempotent', () => {
  const a = androidKur();
  Y.yamala({ androidDizin: a, yamalarDizin: YAMALAR });
  const mp = path.join(a, 'app/src/main/AndroidManifest.xml');
  const m = fs.readFileSync(mp, 'utf8');
  const say = (r) => (m.match(r) || []).length;
  assert.equal(say(/android:allowBackup="false"/g), 1);
  assert.equal(say(/android:allowBackup="true"/g), 0);
  assert.equal(say(/android:fullBackupContent="false"/g), 1);
  assert.equal(say(/android:dataExtractionRules="@xml\/data_extraction_rules"/g), 1);
  assert.equal(say(/android:allowBackup=/g), 1);
  const der = fs.readFileSync(path.join(a, 'app/src/main/res/xml/data_extraction_rules.xml'), 'utf8');
  assert.match(der, /<cloud-backup>/);
  assert.match(der, /<device-transfer>/);
  assert.ok(!/<include/.test(der), 'hiçbir alan dahil edilmez');
  for (const alan of ['root', 'file', 'database', 'sharedpref', 'external']) assert.equal((der.match(new RegExp('<exclude domain="' + alan + '"', 'g')) || []).length, 2, alan);
  // ikinci çalıştırma: değişiklik yok, öznitelik çoğalmaz
  assert.deepEqual(Y.yamala({ androidDizin: a, yamalarDizin: YAMALAR }).degisen, []);
  assert.equal(fs.readFileSync(mp, 'utf8'), m);
  // özniteliği olmayan ve fullBackupContent="@xml/x" olan manifestler de düzelir
  const m2 = Y.manifestYamala(MANIFEST.replace('android:allowBackup="true"', 'android:fullBackupContent="@xml/eski"'), ['android.permission.INTERNET']);
  assert.match(m2, /android:fullBackupContent="false"/);
  assert.match(m2, /android:allowBackup="false"/);
  assert.equal(Y.manifestYamala(m2, ['android.permission.INTERNET']), m2);
});

test('yamala: ağ yapılandırması yalnız yerel adreslere cleartext verir', () => {
  const x = fs.readFileSync(path.join(YAMALAR, 'network_security_config.xml'), 'utf8');
  assert.match(x, /<base-config cleartextTrafficPermitted="false">/);
  assert.equal((x.match(/cleartextTrafficPermitted="true"/g) || []).length, 1);
  for (const m of x.matchAll(/<domain[^>]*>([^<]+)<\/domain>/g)) {
    assert.match(m[1], /^(localhost|10\.0\.2\.2|local)$/);
  }
});

test('yamala --ip: özel IP eklenir, tekrarsız, korunur; genel IP reddedilir', () => {
  const a = androidKur();
  Y.yamala({ androidDizin: a, yamalarDizin: YAMALAR, ipler: ['192.168.1.20'] });
  Y.yamala({ androidDizin: a, yamalarDizin: YAMALAR, ipler: ['192.168.1.20', '10.0.0.5'] });
  const nsc = path.join(a, 'app/src/main/res/xml/network_security_config.xml');
  const x1 = fs.readFileSync(nsc, 'utf8');
  assert.deepEqual(Y.ipBloguOku(x1), ['10.0.0.5', '192.168.1.20']);
  // IP verilmeden yeniden yamalama eklenenleri silmez ve değişiklik yapmaz
  const r = Y.yamala({ androidDizin: a, yamalarDizin: YAMALAR });
  assert.deepEqual(r.degisen, []);
  assert.equal(fs.readFileSync(nsc, 'utf8'), x1);
  assert.throws(() => Y.yamala({ androidDizin: a, yamalarDizin: YAMALAR, ipler: ['8.8.8.8'] }), /özel/);
  assert.throws(() => Y.ozelIpv4('x') || Y.ipEkle('<!-- PIRIL-IP-BASLANGIC --><!-- PIRIL-IP-BITIS -->', ['example.com']), /özel/);
});

test('yamala: cap add android yapılmamışsa anlaşılır hata', () => {
  assert.throws(() => Y.yamala({ androidDizin: gecici(), yamalarDizin: YAMALAR }), /cap add android/);
});

test('yapılandırma: capacitor.config.json ve package.json sabit sürümlü, harici URL yok', () => {
  const kok = path.join(__dirname, '../../android');
  const c = JSON.parse(fs.readFileSync(path.join(kok, 'capacitor.config.json'), 'utf8'));
  assert.equal(c.appId, 'com.piril.asistan');
  assert.equal(c.appName, 'Pırıl');
  assert.equal(c.webDir, 'www');
  assert.ok(!c.server.url);
  assert.deepEqual(c.server.allowNavigation, []);
  const p = JSON.parse(fs.readFileSync(path.join(kok, 'package.json'), 'utf8'));
  const hepsi = { ...p.dependencies, ...p.devDependencies };
  for (const ad of ['@capacitor/core', '@capacitor/cli', '@capacitor/android', '@capacitor-community/speech-recognition']) {
    assert.match(hepsi[ad], /^\d+\.\d+\.\d+$/, ad);
  }
});
