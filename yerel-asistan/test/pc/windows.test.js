'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const W = require('../../pc/platform/windows');

const SALDIRILAR = ['calc & del *', 'a" ; Remove-Item -Recurse C:\\ ; "', "x'; calc; '", 'ad\nGet-Process', '$(calc)', '`calc`', 'a|b', '..\\..\\x'];

function coz(args) { return Buffer.from(args[args.length - 1], 'base64').toString('utf16le'); }

test('psArgs: sabit bayraklar ve UTF-16LE base64 EncodedCommand', () => {
  const a = W.psArgs('Write-Output 1');
  assert.deepStrictEqual(a.slice(0, 5), ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand']);
  assert.strictEqual(coz(a), 'Write-Output 1');
  assert.throws(() => W.psKodla(''));
  assert.throws(() => W.psKodla(5));
});

test('ortamHazirla: yalnız PIRIL_ anahtarları, NUL ve aşırı uzun değer reddedilir', () => {
  assert.strictEqual(W.ortamHazirla({ A: '1' }, { PIRIL_AD: 'x' }).PIRIL_AD, 'x');
  assert.throws(() => W.ortamHazirla({}, { PATH: 'x' }));
  assert.throws(() => W.ortamHazirla({}, { PIRIL_AD: 'a\u0000b' }));
  assert.throws(() => W.ortamHazirla({}, { PIRIL_AD: 'a'.repeat(5000) }));
});

test('uygulamaCoz: yalnız tablodaki kimlikler; ad, alt dize, büyük harf ve enjeksiyon reddedilir', () => {
  assert.deepStrictEqual(W.uygulamaCoz('notepad'), { tur: 'exe', exe: 'notepad.exe' });
  assert.deepStrictEqual(W.uygulamaCoz('calc'), { tur: 'exe', exe: 'calc.exe' });
  assert.deepStrictEqual(W.uygulamaCoz('edge'), { tur: 'exe', exe: 'msedge.exe' });
  assert.deepStrictEqual(W.uygulamaCoz('spotify'), { tur: 'baslat', ad: 'Spotify' });
  assert.deepStrictEqual(W.uygulamaCoz('vscode'), { tur: 'baslat', ad: 'Visual Studio Code' });
  // Türkçe/serbest adlar ve eski beyaz liste girdileri artık kimlik değildir
  ['Not Defteri', 'HESAP MAKİNESİ', 'Tarayıcı', 'Spotify', 'cmd', 'taskmgr', 'komut istemi', 'calc.exe', 'Olmayan Program', 'note', 'notepad ', 'constructor', '__proto__', 'toString', 'hasOwnProperty']
    .forEach((s) => assert.throws(() => W.uygulamaCoz(s), /Geçersiz/, s));
  SALDIRILAR.concat(['calc.exe & del', 'a'.repeat(41), '', '   ', 'a;b', 'a<b', null, 5, {}]).forEach((s) => {
    assert.throws(() => W.uygulamaCoz(s), /Geçersiz/, String(s));
  });
});

test('uygulama tablosu: çekirdeğin kimlik listesiyle BİREBİR aynı; her girdi tam ad ya da güvenli exe', () => {
  const { KIMLIKLER } = require('../../cekirdek/beceriler/uygulama-ac');
  assert.deepStrictEqual(Object.keys(W.UYGULAMALAR).sort(), [...KIMLIKLER].sort());
  assert.strictEqual(KIMLIKLER.length, 15);
  assert.ok(Object.isFrozen(W.UYGULAMALAR));
  for (const k of KIMLIKLER) {
    const u = W.UYGULAMALAR[k];
    assert.ok(Boolean(u.exe) !== Boolean(u.baslat), k + ': exe ya da baslat (yalnız biri)');
    if (u.exe) assert.match(u.exe, /^[A-Za-z0-9_-]{1,40}\.exe$/, k);
    if (u.baslat) assert.match(u.baslat, /^[\p{L}\p{N} ._-]{1,40}$/u, k);
    assert.ok(W.uygulamaCoz(k), k);
  }
});

test('Başlat araması betiği tam ad eşleşmesi kullanır (alt dize/joker yok)', () => {
  const b = W.SABLON.baslatAc;
  assert.match(b, /\$_\.BaseName -eq \$ad/);
  assert.doesNotMatch(b, /-like|WildcardPattern|-match \$|\.Contains\(|\.IndexOf\(/);
});

test('urlDogrula: yalnız http/https', () => {
  assert.strictEqual(W.urlDogrula('https://example.com/a?b=1'), 'https://example.com/a?b=1');
  assert.strictEqual(W.urlDogrula('http://localhost:8080'), 'http://localhost:8080/');
  ['file:///C:/x', 'javascript:alert(1)', 'ms-msdt:/id', 'calc.exe', 'https://u:p@evil.com', 'https://a.com/ b', 'https://a.com/\nb', 'ftp://a.com',
    'https://' + 'a'.repeat(3000) + '.com', '', null, 42, 'data:text/html,x', '\\\\sunucu\\paylasim'].forEach((u) => {
    assert.strictEqual(W.urlDogrula(u), null, String(u).slice(0, 30));
  });
});

test('sesPlani: mutlak/fark/sessiz, aralık dışı reddedilir', () => {
  assert.deepStrictEqual(W.sesPlani({ mutlak: 40 }), { asagi: 50, yukari: 20, sessiz: 0 });
  assert.deepStrictEqual(W.sesPlani({ fark: -10 }), { asagi: 5, yukari: 0, sessiz: 0 });
  assert.deepStrictEqual(W.sesPlani({ fark: 100 }), { asagi: 0, yukari: 50, sessiz: 0 });
  assert.deepStrictEqual(W.sesPlani({ sessiz: true }), { asagi: 0, yukari: 0, sessiz: 1 });
  [{ mutlak: 101 }, { mutlak: -1 }, { mutlak: NaN }, { fark: 101 }, { fark: Infinity }, { mutlak: '50' }, {}, null].forEach((s) => {
    assert.throws(() => W.sesPlani(s), undefined, JSON.stringify(s));
  });
});

test('fare/tık: koordinat 0..1 -> on binde bir; NaN ve aralık dışı reddedilir', () => {
  assert.deepStrictEqual(W.fareKomutu(0.5, 1).env, { PIRIL_X: 5000, PIRIL_Y: 10000, PIRIL_DUGME: 'yok', PIRIL_TIKSAYI: 0 });
  assert.strictEqual(W.tikKomutu(0, 0, 'sag').env.PIRIL_DUGME, 'sag');
  assert.strictEqual(W.tikKomutu(0, 0, undefined).env.PIRIL_DUGME, 'sol');
  [[NaN, 0], [0, NaN], [-0.1, 0], [1.01, 0], [0, 2], ['0.5', 0], [null, 0], [Infinity, 0], [undefined, 0], [{}, 0]].forEach(([x, y]) => {
    assert.throws(() => W.fareKomutu(x, y), undefined, String(x) + ',' + String(y));
    assert.throws(() => W.tikKomutu(x, y, 'sol'), undefined, String(x) + ',' + String(y));
  });
  ['orta; calc', 'x', {}, 5].forEach((d) => assert.throws(() => W.tikKomutu(0.1, 0.1, d)));
  assert.throws(() => W.tikKomutu(0.1, 0.1, 'sol', 3));
  assert.throws(() => W.tikKomutu(0.1, 0.1, 'sol', 1.5));
});

test('yazMetniTemizle: sınır, kontrol karakteri, satır sonu', () => {
  assert.strictEqual(W.yazMetniTemizle('merhaba'), 'merhaba');
  assert.strictEqual(W.yazMetniTemizle('a\r\nb\tc'), 'a\nb c');
  assert.strictEqual(W.yazMetniTemizle('a'.repeat(500)).length, 500);
  assert.throws(() => W.yazMetniTemizle('a'.repeat(501)));
  assert.throws(() => W.yazMetniTemizle('a'.repeat(100000)));
  assert.throws(() => W.yazMetniTemizle(''));
  assert.throws(() => W.yazMetniTemizle('a\u0000b'));
  assert.throws(() => W.yazMetniTemizle('a\u001bb'));
  assert.throws(() => W.yazMetniTemizle(['a']));
  // enjeksiyon dizeleri metin olarak AYNEN geçer (komuta değil, ortam değişkenine gider); yeni satır Enter tuşudur
  assert.strictEqual(W.yazKomutu('calc & del *').env.PIRIL_METIN, 'calc & del *');
});

test('tusKomutu: beyaz liste', () => {
  assert.strictEqual(W.tusKomutu('enter').env.PIRIL_VK, '13');
  assert.strictEqual(W.tusKomutu('Ctrl+C').env.PIRIL_VK, '17,67');
  assert.strictEqual(W.tusKomutu('alt+tab').env.PIRIL_VK, '18,9');
  assert.strictEqual(W.tusKomutu('f5').env.PIRIL_VK, '116');
  assert.strictEqual(W.tusKomutu('ctrl+shift+esc').env.PIRIL_VK, '17,16,27');
  ['win+r', 'win', 'ctrl+', '+', 'a,b', '13', 'f13', 'ctrl+alt+shift+a+b', 'x'.repeat(31), 'a;calc', '', null, 5, 'c\nd', 'ctrl+win+r'].forEach((t) => {
    assert.throws(() => W.tusKomutu(t), undefined, String(t));
  });
});

test('üretilen EncodedCommand betiğinde kullanıcı girdisi geçmez; girdi yalnız ortam değişkeninde', async () => {
  const cagrilar = [];
  const execFile = (exe, args, opts, cb) => { cagrilar.push({ exe, args, opts }); cb(null, ''); };
  const ortam = W.olustur({ shell: { openExternal: async () => {} }, clipboard: {}, execFile, fs, os, app: {}, screen: {}, desktopCapturer: {} });
  const girdi = 'calc & del *"\n$(Remove-Item x)';
  await ortam.platform.uygulamaAc('spotify');
  await ortam.uzak.yaz(girdi.replace('\n', ' '));
  await ortam.uzak.tus('ctrl+c');
  await ortam.uzak.tikla(0.25, 0.75, 'sol');
  await ortam.uzak.fareTasi(0.1, 0.2);
  await ortam.platform.sesAyarla({ mutlak: 30 });
  assert.strictEqual(cagrilar.length, 6);
  for (const c of cagrilar) {
    assert.strictEqual(c.exe, 'powershell.exe');
    assert.deepStrictEqual(c.args.slice(0, 5), ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand']);
    assert.strictEqual(c.args.length, 6);
    const betik = coz(c.args);
    ['Spotify', 'calc & del', 'Remove-Item x', '0.25', '2500', '7500'].forEach((s) => assert.ok(betik.indexOf(s) === -1, s));
    assert.ok(Object.keys(c.opts.env).some((k) => k.startsWith('PIRIL_')));
  }
  assert.strictEqual(cagrilar[0].opts.env.PIRIL_AD, 'Spotify');
  assert.strictEqual(cagrilar[1].opts.env.PIRIL_METIN, 'calc & del *" $(Remove-Item x)');
  assert.strictEqual(cagrilar[3].opts.env.PIRIL_X, '2500');
  assert.strictEqual(cagrilar[3].opts.env.PIRIL_Y, '7500');
});

test('şablonlar sabit: her biri doğrulama içerir ve kullanıcı girdisi için yer tutucu enterpolasyonu yok', () => {
  Object.keys(W.SABLON).forEach((ad) => {
    const b = W.SABLON[ad];
    assert.ok(!/\$\{|%s|\{\{/.test(b), ad);
    if (ad !== 'pil') assert.match(b, /\$env:PIRIL_/, ad);
    if (ad !== 'pil') assert.match(b, /exit 2/, ad);
  });
  // yalnızca platform nesnesi geçersiz girdide hiç execFile çağırmaz
  let n = 0;
  const ortam = W.olustur({ shell: { openExternal: async () => { n++; } }, clipboard: {}, execFile: () => { n++; }, fs, os, app: {}, screen: {}, desktopCapturer: {} });
  return Promise.all([
    ortam.platform.uygulamaAc('calc & del *'), ortam.platform.uygulamaAc('Spotify'), ortam.platform.uygulamaAc('bilinmeyen'), ortam.platform.urlAc('file:///C:/Windows'), ortam.platform.sesAyarla({ mutlak: 500 }),
    ortam.uzak.fareTasi(NaN, 0), ortam.uzak.tikla(2, 2, 'sol'), ortam.uzak.yaz('a'.repeat(9999)), ortam.uzak.tus('win+r')
  ].map((p) => p.then(() => assert.fail('reddedilmeliydi'), () => {}))).then(() => assert.strictEqual(n, 0));
});

test('uygulamaAc: Başlat araması (kimlik) bulunamazsa anlaşılır hata, eşleşmeyen kimlik reddedilir; urlAc geçerli adresi shell.openExternal ile açar', async () => {
  const acilan = [];
  const ortam = W.olustur({
    shell: { openExternal: async (u) => { acilan.push(u); } }, clipboard: {}, fs, os, app: {}, screen: {}, desktopCapturer: {},
    execFile: (e, a, o, cb) => { const h = new Error('x'); h.code = 3; cb(h); }
  });
  await assert.rejects(ortam.platform.uygulamaAc('Olmayan Program'), /Geçersiz/);
  await assert.rejects(ortam.platform.uygulamaAc('spotify'), /bulunamadı/);
  await ortam.platform.urlAc('https://example.com');
  assert.deepStrictEqual(acilan, ['https://example.com/']);
});

test('dosyaAraYurut: derinlik ve sonuç sınırı, sembolik bağ izlenmez, gizli klasör atlanır, yol karakterli sorgu reddedilir', () => {
  const k = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-'));
  const dis = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-'));
  fs.writeFileSync(path.join(dis, 'gizli-rapor.txt'), 'x');
  fs.symlinkSync(dis, path.join(k, 'baglanti'));
  fs.mkdirSync(path.join(k, '.gizli'));
  fs.writeFileSync(path.join(k, '.gizli', 'rapor-gizli.txt'), 'x');
  fs.writeFileSync(path.join(k, 'Rapor.docx'), 'x');
  fs.writeFileSync(path.join(k, 'ıŞIK-raporu.txt'), 'x');
  let d = k;
  for (let i = 1; i <= 7; i++) { d = path.join(d, 'a' + i); fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'rapor' + i + '.txt'), 'x'); }
  const sonuc = W.dosyaAraYurut(fs, [k], 'rapor');
  assert.ok(sonuc.some((s) => s.endsWith('Rapor.docx')));
  assert.ok(sonuc.some((s) => s.endsWith('ıŞIK-raporu.txt')));
  assert.ok(!sonuc.some((s) => /gizli/.test(s)), 'sembolik bağ/gizli klasör izlenmemeli');
  assert.ok(sonuc.some((s) => s.endsWith('rapor4.txt')));
  assert.ok(!sonuc.some((s) => s.endsWith('rapor5.txt')), 'derinlik sınırı (4)');
  assert.strictEqual(W.dosyaAraYurut(fs, [k], 'rapor', { en_cok: 2 }).length, 2);
  assert.ok(W.dosyaAraYurut(fs, [k], 'rapor', { en_cok: 9999 }).length <= 50);
  ['..\\x', '../x', 'a/b', '', 'a\u0000', 'x'.repeat(101), null].forEach((q) => assert.deepStrictEqual(W.dosyaAraYurut(fs, [k], q), [], String(q)));
  // kök sembolik bağsa ya da göreli yolsa taranmaz
  assert.deepStrictEqual(W.dosyaAraYurut(fs, [path.join(k, 'baglanti')], 'gizli'), []);
  assert.deepStrictEqual(W.dosyaAraYurut(fs, ['goreli'], 'rapor'), []);
});

test('pilAyristir ve ekranDosyaAdi', () => {
  assert.deepStrictEqual(W.pilAyristir('{"yuzde":87,"sarjda":true}\r\n'), { pilYuzde: 87, sarjda: true });
  assert.deepStrictEqual(W.pilAyristir(''), {});
  assert.deepStrictEqual(W.pilAyristir('bozuk'), {});
  assert.deepStrictEqual(W.pilAyristir('{"yuzde":500}'), {});
  assert.strictEqual(W.ekranDosyaAdi(new Date(2026, 0, 2, 3, 4, 5)), 'Piril-20260102-030405.png');
  assert.match(W.ekranDosyaAdi('x'), /^Piril-\d{8}-\d{6}\.png$/);
});

test('panoYaz sınırı ve kilitle komutu', async () => {
  const kayit = []; let pano = '';
  const ortam = W.olustur({
    shell: {}, clipboard: { readText: () => 'abc', writeText: (t) => { pano = t; } }, fs, os, app: {}, screen: {}, desktopCapturer: {},
    execFile: (e, a, o, cb) => { kayit.push([e, a]); cb(null, ''); }
  });
  assert.strictEqual(await ortam.platform.panoOku(), 'abc');
  await ortam.platform.panoYaz('merhaba');
  assert.strictEqual(pano, 'merhaba');
  await assert.rejects(ortam.platform.panoYaz('x'.repeat(100001)));
  await assert.rejects(ortam.platform.panoYaz(5));
  await ortam.platform.kilitle();
  assert.deepStrictEqual(kayit, [['rundll32.exe', ['user32.dll,LockWorkStation']]]);
});

// ---------- B7: eşzamanlılık ve hız sınırı ----------
const bekle = () => new Promise((c) => setImmediate(c));

test('semaforOlustur: aynı anda en çok 2 çalışır, sıra korunur, kuyruk tavanı aşılırsa reddedilir', async () => {
  const sem = W.semaforOlustur(2, 3);
  let aktif = 0, enFazla = 0; const bitir = []; const sira = [];
  const is = (n) => () => new Promise((c) => { aktif++; enFazla = Math.max(enFazla, aktif); sira.push(n); bitir.push(() => { aktif--; c(n); }); });
  const ps = [1, 2, 3, 4, 5].map((n) => sem.calistir(is(n)));
  await bekle();
  assert.deepStrictEqual(sem.durum(), { calisan: 2, bekleyen: 3 });
  await assert.rejects(sem.calistir(is(6)), /bekleyen/);
  while (bitir.length) { bitir.shift()(); await bekle(); }
  assert.deepStrictEqual(await Promise.all(ps), [1, 2, 3, 4, 5]);
  assert.strictEqual(enFazla, 2);
  assert.deepStrictEqual(sira, [1, 2, 3, 4, 5]);
  // hata sayaç sızdırmaz
  await assert.rejects(sem.calistir(() => Promise.reject(new Error('x'))), /x/);
  assert.deepStrictEqual(sem.durum(), { calisan: 0, bekleyen: 0 });
});

test('hizSiniriOlustur: kayan pencerede en çok 20; reddedilenler sayılmaz; süre dolunca yeniden izin', () => {
  let t = 1000;
  const h = W.hizSiniriOlustur(20, 1000, () => t);
  for (let i = 0; i < 20; i++) assert.ok(h.izin(), 'izin ' + i);
  assert.ok(!h.izin()); assert.ok(!h.izin());
  t += 999; assert.ok(!h.izin());
  t += 1; assert.ok(h.izin());
});

test('siraOlustur: işler gelme sırasıyla birbirini bekler; hata sonrakini engellemez', async () => {
  const q = W.siraOlustur(); const log = [];
  const a = q.ekle(async () => { log.push('a1'); await bekle(); await bekle(); log.push('a2'); });
  const b = q.ekle(async () => { log.push('b1'); throw new Error('b'); });
  const c = q.ekle(async () => { log.push('c1'); return 7; });
  await assert.rejects(b, /b/);
  assert.strictEqual(await c, 7); await a;
  assert.deepStrictEqual(log, ['a1', 'a2', 'b1', 'c1']);
});

test('olustur: PowerShell süreç sayısı 2 ile sınırlı; uzak tus/yaz sıralı; saniyede 20 uzak işlem aşılırsa reddedilir', async () => {
  let aktif = 0, enFazla = 0; const bekleyenler = []; const cagrilar = [];
  const execFile = (exe, args, opts, cb) => { aktif++; enFazla = Math.max(enFazla, aktif); cagrilar.push(opts.env); bekleyenler.push(() => { aktif--; cb(null, ''); }); };
  let t = 5000;
  const ortam = W.olustur({ shell: {}, clipboard: {}, execFile, fs, os, app: {}, screen: {}, desktopCapturer: {}, simdi: () => t });
  const ps = [ortam.platform.sesKapatAc(), ortam.platform.sesKapatAc(), ortam.platform.sesKapatAc(), ortam.platform.sesKapatAc()];
  await bekle();
  assert.strictEqual(cagrilar.length, 2, 'ilk anda yalnız 2 süreç');
  while (bekleyenler.length) { bekleyenler.shift()(); await bekle(); }
  await Promise.all(ps);
  assert.strictEqual(cagrilar.length, 4); assert.strictEqual(enFazla, 2);

  // yaz/tus sıralı: biri bitmeden diğeri başlamaz
  cagrilar.length = 0;
  const y1 = ortam.uzak.yaz('bir'); const y2 = ortam.uzak.tus('enter'); const y3 = ortam.uzak.yaz('uc');
  await bekle();
  assert.strictEqual(cagrilar.length, 1); assert.strictEqual(cagrilar[0].PIRIL_METIN, 'bir');
  bekleyenler.shift()(); await bekle();
  assert.strictEqual(cagrilar.length, 2); assert.strictEqual(cagrilar[1].PIRIL_VK, '13');
  bekleyenler.shift()(); await bekle();
  assert.strictEqual(cagrilar.length, 3); assert.strictEqual(cagrilar[2].PIRIL_METIN, 'uc');
  bekleyenler.shift()(); await Promise.all([y1, y2, y3]);

  // hız sınırı: yeni pencerede 20 işlem geçer, sonrakiler reddedilir
  t = 9000;
  const hizli = ortam.uzak; const sonuclar = [];
  for (let i = 0; i < 25; i++) sonuclar.push(hizli.fareTasi(0.5, 0.5).then(() => 'ok', (e) => e.message));
  await bekle();
  while (bekleyenler.length) { bekleyenler.shift()(); await bekle(); }
  const r = await Promise.all(sonuclar);
  assert.strictEqual(r.filter((x) => x === 'ok').length, 20);
  assert.strictEqual(r.filter((x) => /Çok fazla uzak işlem/.test(x)).length, 5);
  t = 10001;
  const sonraki = ortam.uzak.fareTasi(0.1, 0.1);
  await bekle(); while (bekleyenler.length) { bekleyenler.shift()(); await bekle(); }
  await sonraki;
});
