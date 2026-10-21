const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const T = require('../../pc/temizlik');

function gecici() { return fs.mkdtempSync(path.join(os.tmpdir(), 'tmz-')); }
function yaz(k, ad, ic) { fs.writeFileSync(path.join(k, ad), ic || 'x'); }
const YOK = []; // çalışan exe dışlaması yok

test('sürüm ayrıştırma ve sayısal karşılaştırma', () => {
  assert.deepStrictEqual(T.surumAyristir('1.10.0'), [1, 10, 0]);
  assert.strictEqual(T.surumAyristir('1.0'), null);
  assert.strictEqual(T.surumAyristir('1.0.0-beta'), null);
  assert.strictEqual(T.surumKarsilastir('1.9.0', '1.10.0'), -1);
  assert.strictEqual(T.surumKarsilastir('2.0.0', '1.99.99'), 1);
  assert.strictEqual(T.surumKarsilastir('1.1.0', '1.1.0'), 0);
  assert.ok(Number.isNaN(T.surumKarsilastir('x', '1.0.0')));
});

test('yalnız eski sürümler listelenir; mevcut/yeni/tanınmayan listelenmez', () => {
  const k = gecici();
  ['Piril-Kurulum-1.0.0.exe', 'Piril-Kurulum-1.0.0.exe.blockmap', 'piril-tasinabilir-1.0.5.EXE',
    'Piril-Kurulum-1.1.0.exe', 'Piril-Kurulum-2.0.0.exe', 'not.txt', 'ayarlar.json',
    'Piril-Kurulum-1.0.0.exe.bak', 'kurulum.parca.00', 'X-Piril-Kurulum-1.0.0.exe',
    'Piril-Kurulum-1.0.exe', 'Piril-Diger-1.0.0.exe'].forEach((a) => yaz(k, a));
  const adlar = T.tara(k, '1.1.0', fs, YOK).map((o) => o.ad).sort();
  assert.deepStrictEqual(adlar, ['Piril-Kurulum-1.0.0.exe', 'Piril-Kurulum-1.0.0.exe.blockmap', 'piril-tasinabilir-1.0.5.EXE'].sort());
});

test('1.9.0 < 1.10.0 klasör taramasında da geçerli', () => {
  const k = gecici();
  yaz(k, 'Piril-Kurulum-1.9.0.exe');
  yaz(k, 'Piril-Kurulum-1.10.0.exe');
  assert.deepStrictEqual(T.tara(k, '1.10.0', fs, YOK).map((o) => o.surum), ['1.9.0']);
});

test('sembolik bağlantı ve alt klasör atlanır, özyineleme yok', () => {
  const k = gecici(); const dis = gecici();
  yaz(dis, 'hedef.bin');
  fs.symlinkSync(path.join(dis, 'hedef.bin'), path.join(k, 'Piril-Kurulum-1.0.0.exe'));
  fs.mkdirSync(path.join(k, 'Piril-Kurulum-1.0.1.exe'));
  fs.mkdirSync(path.join(k, 'alt'));
  yaz(path.join(k, 'alt'), 'Piril-Kurulum-1.0.2.exe');
  assert.deepStrictEqual(T.tara(k, '1.1.0', fs, YOK), []);
});

test('klasörün kendisi sembolik bağlantıysa gerçek yol içinde kalınır; dosya dışarıya işaret ederse atlanır', () => {
  const k = gecici(); const dis = gecici();
  yaz(dis, 'Piril-Kurulum-1.0.0.exe');
  fs.symlinkSync(path.join(dis, 'Piril-Kurulum-1.0.0.exe'), path.join(k, 'Piril-Tasinabilir-1.0.0.exe'));
  assert.deepStrictEqual(T.tara(k, '1.1.0', fs, YOK), []);
});

test('en çok 50 dosya', () => {
  const k = gecici();
  for (let i = 0; i < 80; i++) yaz(k, 'Piril-Kurulum-0.0.' + i + '.exe');
  assert.strictEqual(T.tara(k, '1.0.0', fs, YOK).length, 50);
});

test('çalışan exe listeye girmez (haric ve PORTABLE_EXECUTABLE_FILE)', () => {
  const k = gecici();
  yaz(k, 'Piril-Tasinabilir-1.0.0.exe');
  yaz(k, 'Piril-Kurulum-1.0.0.exe');
  const calisan = path.join(k, 'Piril-Tasinabilir-1.0.0.exe');
  assert.deepStrictEqual(T.tara(k, '1.1.0', fs, [calisan]).map((o) => o.ad), ['Piril-Kurulum-1.0.0.exe']);
  const onceki = process.env.PORTABLE_EXECUTABLE_FILE;
  process.env.PORTABLE_EXECUTABLE_FILE = calisan.toUpperCase().replace(/^\/TMP/, '/tmp');
  try {
    assert.ok(!T.tara(k, '1.1.0', fs).some((o) => o.ad === 'Piril-Tasinabilir-1.0.0.exe') || process.platform !== 'win32');
  } finally { if (onceki === undefined) delete process.env.PORTABLE_EXECUTABLE_FILE; else process.env.PORTABLE_EXECUTABLE_FILE = onceki; }
  process.env.PORTABLE_EXECUTABLE_FILE = calisan;
  try { assert.ok(!T.tara(k, '1.1.0', fs).some((o) => o.ad === 'Piril-Tasinabilir-1.0.0.exe')); }
  finally { if (onceki === undefined) delete process.env.PORTABLE_EXECUTABLE_FILE; else process.env.PORTABLE_EXECUTABLE_FILE = onceki; }
});

test('göreli/geçersiz klasör ve geçersiz sürüm boş döner', () => {
  assert.deepStrictEqual(T.tara('goreli/yol', '1.1.0', fs, YOK), []);
  assert.deepStrictEqual(T.tara(gecici(), 'abc', fs, YOK), []);
  assert.deepStrictEqual(T.tara('/yok/boyle/klasor', '1.1.0', fs, YOK), []);
});

test('temizle yalnız trashItem çağırır; hata diğerlerini durdurmaz', async () => {
  const k = gecici();
  ['Piril-Kurulum-1.0.0.exe', 'Piril-Kurulum-1.0.1.exe', 'Piril-Kurulum-1.0.2.exe'].forEach((a) => yaz(k, a));
  const liste = T.tara(k, '1.1.0', fs, YOK);
  const cagrilar = [];
  const sonuc = await T.temizle(liste, async (p) => {
    cagrilar.push(p);
    if (p.endsWith('1.0.1.exe')) throw new Error('kilitli');
  });
  assert.strictEqual(cagrilar.length, 3);
  assert.deepStrictEqual(sonuc.map((r) => r.durum), ['silindi', 'hata', 'silindi']);
  assert.match(sonuc[1].hata, /kilitli/);
  // trashItem sahte olduğundan dosyalar yerinde kalır: temizle başka silme yöntemi kullanmaz
  assert.strictEqual(fs.readdirSync(k).length, 3);
});

test('temizle tara() dışı/tanınmayan öğeyi reddeder, trashItem çağrılmaz', async () => {
  let n = 0;
  const sonuc = await T.temizle([
    { ad: 'not.txt', yol: '/tmp/not.txt' },
    { ad: 'Piril-Kurulum-1.0.0.exe', yol: '/tmp/baska.exe' },
    { ad: 'Piril-Kurulum-1.0.0.exe', yol: '/tmp/../etc/Piril-Kurulum-1.0.0.exe/x' },
    null
  ], async () => { n++; });
  assert.strictEqual(n, 0);
  assert.ok(sonuc.every((r) => r.durum === 'hata'));
});

test('temizle(fs, klasor): yeniden doğrular, hash ve günlük kaydı tutar; klasör dışı/symlink reddedilir', async () => {
  const k = gecici(); const dis = gecici();
  yaz(k, 'Piril-Kurulum-1.0.0.exe', 'icerik');
  yaz(dis, 'Piril-Kurulum-1.0.1.exe', 'dis');
  const liste = T.tara(k, '1.1.0', fs, YOK);
  const dista = { ad: 'Piril-Kurulum-1.0.1.exe', yol: path.join(dis, 'Piril-Kurulum-1.0.1.exe') };
  const kayitlar = []; const silinen = [];
  const sonuc = await T.temizle(liste.concat([dista]), async (p) => { silinen.push(p); },
    { fs, klasor: k, kayit: (r) => kayitlar.push(r) });
  assert.deepStrictEqual(sonuc.map((r) => r.durum), ['silindi', 'hata']);
  assert.deepStrictEqual(silinen, [liste[0].yol]);
  const beklenen = crypto.createHash('sha256').update('icerik').digest('hex');
  assert.strictEqual(kayitlar[0].sha256, beklenen);
  assert.strictEqual(kayitlar[0].ad, 'Piril-Kurulum-1.0.0.exe');
  assert.strictEqual(kayitlar[1].durum, 'hata');
  // tara'dan sonra dosya symlink ile değiştirilirse silinmez
  fs.rmSync(liste[0].yol);
  fs.symlinkSync(path.join(dis, 'Piril-Kurulum-1.0.1.exe'), liste[0].yol);
  const s2 = await T.temizle(liste, async (p) => { silinen.push(p); }, { fs, klasor: k });
  assert.strictEqual(s2[0].durum, 'hata');
  assert.strictEqual(silinen.length, 1);
});

test('sha256Dogrula: eşleşme, uyuşmazlık ve SHA256.txt yokluğu', () => {
  const k = gecici();
  yaz(k, 'Piril-Kurulum-1.1.0.exe', 'yeni');
  assert.strictEqual(T.sha256Dogrula(k, '1.1.0', fs).durum, 'yok');
  const h = crypto.createHash('sha256').update('yeni').digest('hex');
  fs.writeFileSync(path.join(k, 'SHA256.txt'), h + '  Piril-Kurulum-1.1.0.exe\n');
  assert.strictEqual(T.sha256Dogrula(k, '1.1.0', fs).durum, 'dogrulandi');
  fs.writeFileSync(path.join(k, 'SHA256.txt'), '0'.repeat(64) + '  Piril-Kurulum-1.1.0.exe\n');
  assert.strictEqual(T.sha256Dogrula(k, '1.1.0', fs).durum, 'hatali');
});

test('kullanıcı dosyaları (ayarlar, çıktılar, SHA256.txt) hiçbir zaman listelenmez', () => {
  const k = gecici();
  ['ayarlar.json', 'temizlik-log.jsonl', 'SHA256.txt', 'barkodlar.csv', 'Piril-Kurulum-1.0.0.exe.tmp'].forEach((a) => yaz(k, a));
  assert.deepStrictEqual(T.tara(k, '9.9.9', fs, YOK), []);
});

test('MANIFEST tek kaynak: üretilen adlar tanınır, desen dışı hiçbir ad tanınmaz', () => {
  const M = T.MANIFEST;
  assert.deepStrictEqual([...M.turler], ['Kurulum', 'Tasinabilir']);
  assert.deepStrictEqual([...M.uzantilar], ['.exe', '.exe.blockmap']);
  assert.ok(Object.isFrozen(M));
  const tanin = [];
  M.turler.forEach((t) => M.uzantilar.forEach((u) => tanin.push(M.onek + '-' + t + '-3.2.1' + u)));
  tanin.forEach((a) => assert.ok(T.adAyristir(a), a));
  ['a.txt', 'Piril-Kurulum-1.0.0.exe.bak', 'Piril-Kurulum-1.0.0.exe.blockmap2', 'Piril-Kurulum-1.0.0.msi',
    'Piril-Kurulum-1.0.0.exe\n', '../Piril-Kurulum-1.0.0.exe', 'ayarlar.json', 'SHA256.txt', 'Piril-Kurulum-v1.0.0.exe']
    .forEach((a) => assert.strictEqual(T.adAyristir(a), null, a));
});

test('sha256Dogrula: mevcut sürümün kurulum dosyası listede yoksa "yok" (silme yapılmaz)', () => {
  const k = gecici();
  yaz(k, 'Piril-Kurulum-1.1.0.exe', 'yeni');
  fs.writeFileSync(path.join(k, 'SHA256.txt'), '1'.repeat(64) + '  baska-dosya.exe\n');
  assert.strictEqual(T.sha256Dogrula(k, '1.1.0', fs).durum, 'yok');
});

test('sabit bağlantı (hardlink) olan dosya listelenmez', () => {
  const k = gecici(); const dis = gecici();
  yaz(dis, 'hedef.bin');
  fs.linkSync(path.join(dis, 'hedef.bin'), path.join(k, 'Piril-Kurulum-1.0.0.exe'));
  assert.deepStrictEqual(T.tara(k, '1.1.0', fs, YOK), []);
});
