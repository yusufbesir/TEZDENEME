'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { calistir, ctxYap, sahtePlatform } = require('./yardimci');

const sor = (m, ek) => calistir(m, ctxYap(ek));
const niyetler = async (liste, niyet) => {
  for (const m of liste) assert.equal((await sor(m)).niyet, niyet, `"${m}" -> ${niyet}`);
};

test('saat', async () => {
  await niyetler(['saat kaç', 'Şu an saat kaç oldu?', 'saati söyler misin'], 'saat');
  assert.equal((await sor('saat kaç')).yanit, 'Saat 10:30.');
  assert.notEqual((await sor('bugün hava nasıl')).niyet, 'saat');
});

test('tarih / gün (sabit simdi: 16 Ekim 2026 Cuma)', async () => {
  await niyetler(['bugün günlerden ne', 'bugün ayın kaçı', 'yarın hangi gün'], 'tarih');
  assert.equal((await sor('bugün günlerden ne')).yanit, 'Bugün 16 Ekim 2026, Cuma.');
  assert.equal((await sor('yarın günlerden ne')).yanit, 'Yarın 17 Ekim 2026, Cumartesi.');
  assert.equal((await sor('dün günlerden ne')).yanit, 'Dün 15 Ekim 2026, Perşembe.');
  assert.equal((await sor('on beş gün sonra ne günü')).yanit, '15 gün sonra 31 Ekim 2026, Cumartesi.');
  assert.notEqual((await sor('yarın hatırlat')).niyet, 'tarih');
});

test('sayaç', async () => {
  await niyetler(['5 dakika sayaç kur', 'yarım saat zamanlayıcı başlat', 'on saniye geri sayım'], 'sayac');
  assert.deepEqual((await sor('5 dakika sayaç kur')).eylem, { tip: 'sayac', saniye: 300 });
  assert.equal((await sor('beş dakika sayaç kur')).eylem.saniye, 300);
  assert.equal((await sor('yarım saat zamanlayıcı')).eylem.saniye, 1800);
  assert.equal((await sor('1 saat 30 dakika sayaç')).eylem.saniye, 5400);
  const suresiz = await sor('sayaç kur');
  assert.equal(suresiz.eylem, null);
  assert.match(suresiz.yanit, /ne kadar/i);
  assert.equal((await sor('48 saat sayaç kur')).eylem, null);
  assert.notEqual((await sor('5 dakika sonra su iç diye hatırlat')).niyet, 'sayac');
});

test('hatırlatıcı: deterministik tarih hesabı', async () => {
  const ctx = ctxYap();
  const r = await calistir("yarın 9'da su iç diye hatırlat", ctx);
  assert.equal(r.niyet, 'hatirlatici');
  const kayit = ctx.depo.oku('hatirlaticilar');
  assert.equal(kayit.length, 1);
  assert.equal(kayit[0].metin, 'su iç');
  assert.equal(kayit[0].zaman, new Date(2026, 9, 17, 9, 0).toISOString());
  assert.deepEqual(r.adimlar, [{ etiket: 'Hatırlatıcı kaydedildi', durum: 'bitti' }]);
  assert.match(r.yanit, /yarın 09:00/);

  const g = ctxYap();
  await calistir('10 dakika sonra çamaşırı hatırlat', g);
  const k2 = g.depo.oku('hatirlaticilar')[0];
  assert.equal(k2.zaman, new Date(2026, 9, 16, 10, 40).toISOString());
  assert.equal(k2.metin, 'çamaşırı');

  const a = ctxYap();
  await calistir("akşam 8'de ilaç al diye hatırlat", a);
  assert.equal(a.depo.oku('hatirlaticilar')[0].zaman, new Date(2026, 9, 16, 20, 0).toISOString());

  const p = ctxYap();
  await calistir('pazartesi saat 14:30 toplantı hatırlat', p);
  assert.equal(p.depo.oku('hatirlaticilar')[0].zaman, new Date(2026, 9, 19, 14, 30).toISOString());
  assert.equal(p.depo.oku('hatirlaticilar')[0].metin, 'toplantı');

  const l = ctxYap();
  await calistir("yarın 9'da su iç diye hatırlat", l);
  const liste = await calistir('hatırlatıcılarımı göster', l);
  assert.equal(liste.niyet, 'hatirlatici');
  assert.match(liste.yanit, /su iç/);
});

test('hatırlatıcı: eksik bilgi ve geçmiş saat kaydedilmez', async () => {
  const ctx = ctxYap();
  assert.match((await calistir('su iç diye hatırlat', ctx)).yanit, /Ne zaman/);
  assert.match((await calistir('yarın 9da hatırlat', ctx)).yanit, /Neyi/);
  assert.match((await calistir("bugün 8'de su iç diye hatırlat", ctx)).yanit, /geçmiş/);
  assert.equal(ctx.depo.oku('hatirlaticilar'), undefined);
  assert.notEqual((await sor('yarın hava nasıl')).niyet, 'hatirlatici');
});

test('not', async () => {
  const ctx = ctxYap();
  const e = await calistir('not al süt almayı unutma', ctx);
  assert.equal(e.niyet, 'not');
  assert.equal(ctx.depo.oku('notlar')[0].metin, 'süt almayı unutma');
  await calistir('şunu not et: Ali\'yi ara', ctx);
  await calistir('yarın sınav var diye not al', ctx);
  const n = ctx.depo.oku('notlar');
  assert.equal(n.length, 3);
  assert.equal(n[1].metin, 'Ali yi ara');
  assert.equal(n[2].metin, 'yarın sınav var');
  const l = await calistir('notlarımı listele', ctx);
  assert.equal(l.niyet, 'not');
  assert.match(l.yanit, /3 notun var/);
  assert.match((await calistir('son notu oku', ctx)).yanit, /Not 3: yarın sınav var/);
  assert.match((await calistir('1 notu oku', ctx)).yanit, /süt almayı unutma/);
  assert.notEqual((await sor('merhaba nasılsın')).niyet, 'not');
  assert.equal(ctx.depo.oku('notlar').length, 3);
});

test('hesap', async () => {
  const c = async (m) => (await sor(m)).yanit;
  assert.equal(await c('on iki çarpı yedi'), 'Sonuç: 84');
  assert.equal(await c("yüzde 15'i 240"), 'Sonuç: 36');
  assert.equal(await c("240'ın yüzde 15'i kaç eder"), 'Sonuç: 36');
  assert.equal(await c('100 bölü 8 kaç eder'), 'Sonuç: 12,5');
  assert.equal(await c('2 + 3 * 4'), 'Sonuç: 14');
  assert.equal(await c('(2 + 3) * 4'), 'Sonuç: 20');
  assert.equal(await c('2 üzeri 10'), 'Sonuç: 1024');
  assert.equal(await c('yüz eksi on beş'), 'Sonuç: 85');
  assert.equal(await c('12 x 7'), 'Sonuç: 84');
  assert.equal((await sor('on iki çarpı yedi')).niyet, 'hesap');
  assert.equal(await c('5 bölü 0'), 'Sıfıra bölemem.');
  assert.notEqual((await sor('beş dakika sayaç kur')).niyet, 'hesap');
});

test('hesap: enjeksiyon denemeleri değerlendirilmez', async () => {
  const saldirilar = [
    'process.exit()', 'hesapla process.exit()', '1;2', 'hesapla 1;2',
    "hesapla require('child_process').execSync('calc')", 'hesapla 2 + constructor.constructor("return 1")()',
    'hesapla globalThis', '1 + 1; process.exit(1)', 'hesapla 2 ** 3', 'hesapla 9'.repeat(1) + ' ' + 'x'.repeat(10),
  ];
  for (const s of saldirilar) {
    const r = await sor(s);
    assert.ok(!/^Sonuç/.test(r.yanit), `"${s}" hesaplanmamalı: ${r.yanit}`);
  }
  const r = await sor('hesapla process.exit()');
  assert.equal(r.niyet, 'hesap');
  assert.match(r.yanit, /güvenle hesaplayamadım/);
  assert.equal((await sor('1;2')).niyet, 'bilinmiyor');
  assert.equal((await sor('process.exit()')).niyet, 'bilinmiyor');
  const kaynak = require('node:fs').readFileSync(require.resolve('../../cekirdek/beceriler/hesap.js'), 'utf8');
  assert.ok(!/\beval\s*\(|new\s+Function|Function\s*\(/.test(kaynak.replace(/\/\/.*$/gm, '')));
});

test('uygulama aç: beyaz liste ve platform çağrısı', async () => {
  await niyetler(['hesap makinesini aç', "chrome'u aç", 'not defterini başlat'], 'uygulama-ac');
  const ctx = ctxYap();
  await calistir('hesap makinesini aç', ctx);
  await calistir('not defterini aç', ctx);
  assert.deepEqual(ctx.platform.cagri, [['uygulamaAc', 'calc'], ['uygulamaAc', 'notepad']]);
  assert.notEqual((await sor('bir şarkı söyle')).niyet, 'uygulama-ac');
});

test('uygulama aç: kabuk enjeksiyonu reddedilir', async () => {
  for (const s of ['notepad & calc aç', 'notepad; calc aç', 'notepad | calc aç', 'notepad calc aç',
    'chrome"u aç', 'notepad`calc` aç', '..\\notepad aç', 'notepad $(calc) aç', 'C:\\Windows\\notepad.exe aç']) {
    const ctx = ctxYap();
    const r = await calistir(s, ctx);
    assert.equal(ctx.platform.cagri.length, 0, `"${s}" platforma gitmemeli`);
    assert.ok(r.niyet !== 'uygulama-ac' || /güvenlik/.test(r.yanit), s);
  }
  const ctx = ctxYap();
  const r = await calistir('notepad & calc aç', ctx);
  assert.equal(r.niyet, 'uygulama-ac');
  assert.match(r.yanit, /güvenlik/);
});

test('web\'de ara: yalnızca https ve kodlanmış sorgu', async () => {
  await niyetler(["web'de hava durumu ara", 'internette kedi bakımı araştır', "google'da en iyi film ara"], 'web-ara');
  const ctx = ctxYap();
  await calistir("web'de hava durumu ara", ctx);
  assert.equal(ctx.platform.cagri[0][1], 'https://duckduckgo.com/?q=' + encodeURIComponent('hava durumu'));
  const k = ctxYap();
  await calistir('internette a&b=c#x ara', k);
  const url = k.platform.cagri[0][1];
  assert.ok(url.startsWith('https://'));
  assert.ok(!/[&#]/.test(url.slice('https://duckduckgo.com/?q='.length)));
  assert.notEqual((await sor('merhaba')).niyet, 'web-ara');
});

test('ses', async () => {
  await niyetler(['sesi aç', 'sesi kıs', 'sesi yüzde 40 yap', 'sesi kapat', 'sustur'], 'ses');
  const ctx = ctxYap();
  await calistir('sesi aç', ctx);
  await calistir('sesi biraz kıs', ctx);
  await calistir('sesi yüzde elli yap', ctx);
  await calistir('sesi sustur', ctx);
  assert.deepEqual(ctx.platform.cagri, [
    ['sesAyarla', { fark: 10 }], ['sesAyarla', { fark: -5 }], ['sesAyarla', { mutlak: 50 }], ['sesKapatAc'],
  ]);
  const r = await calistir('sesi aç', ctx);
  assert.deepEqual(r.adimlar, []);
  assert.notEqual((await sor('kapıyı aç')).niyet, 'ses');
});

test('ekran görüntüsü', async () => {
  await niyetler(['ekran görüntüsü al', 'ekranın fotoğrafını çek', 'screenshot al'], 'ekran-goruntusu');
  const r = await sor('ekran görüntüsü al');
  assert.deepEqual(r.eylem, { tip: 'ekranGoruntusu', yol: 'C:/x/ekran.png' });
  assert.deepEqual(r.adimlar, [{ etiket: 'Ekran görüntüsü alınıyor', durum: 'bitti' }]);
  assert.notEqual((await sor('ekranı kilitle')).niyet, 'ekran-goruntusu');
});

test('dosya ara: gerçek adımlar', async () => {
  await niyetler(['dosya ara rapor', 'fatura adlı dosyayı bul', 'bilgisayarda tez dosyasını ara'], 'dosya-ara');
  const ctx = ctxYap();
  const r = await calistir('dosya ara rapor', ctx);
  assert.deepEqual(ctx.platform.cagri[0], ['dosyaAra', 'rapor', { en_cok: 5 }]);
  assert.deepEqual(r.adimlar.map((a) => a.etiket), ['Komut çözümleniyor', 'Dosyalar aranıyor', 'Sonuçlar sıralanıyor']);
  assert.ok(r.adimlar.every((a) => a.durum === 'bitti'));
  assert.ok(r.yanit.indexOf('C:/rapor.docx') < r.yanit.indexOf('C:/uzun'));
  assert.notEqual((await sor('internette rapor ara')).niyet, 'dosya-ara');
});

test('pano', async () => {
  await niyetler(['panoyu oku', 'panoda ne var', 'panoya kopyala merhaba dünya'], 'pano');
  const ctx = ctxYap();
  assert.match((await calistir('panoyu oku', ctx)).yanit, /kopyalanan metin/);
  await calistir('panoya yaz Merhaba Dünya', ctx);
  assert.deepEqual(ctx.platform.cagri[0], ['panoYaz', 'Merhaba Dünya']);
  assert.notEqual((await sor('panjur aç')).niyet, 'pano');
});

test('ekranı kilitle: riskli, onaysız reddedilir', async () => {
  const ctx = ctxYap();
  const r = await calistir('ekranı kilitle', ctx);
  assert.equal(r.niyet, 'ekran-kilitle');
  assert.equal(r.riskli, true);
  assert.equal(ctx.platform.cagri.length, 0);
  assert.match(r.yanit, /onay/);

  const red = ctxYap({ onayIste: async () => false });
  const r2 = await calistir('bilgisayarı kilitle', red);
  assert.equal(red.platform.cagri.length, 0);
  assert.equal(r2.riskli, true);

  let sorulan;
  const ok = ctxYap({ onayIste: async (a) => { sorulan = a; return true; } });
  const r3 = await calistir('ekranı kilitler misin', ok);
  assert.deepEqual(ok.platform.cagri, [['kilitle']]);
  assert.ok(sorulan);
  assert.equal(r3.riskli, true);
  assert.notEqual((await sor('kapıyı kilitle')).niyet, 'ekran-goruntusu');
});

test('sistem bilgisi', async () => {
  await niyetler(['pil durumu ne', 'pilim kaç', 'bellek kullanımı kaç', 'sistem bilgisi ver'], 'sistem-bilgisi');
  assert.match((await sor('pil durumu ne')).yanit, /Pil yüzde 80, şarjda değil/);
  assert.match((await sor('bellek kullanımı kaç')).yanit, /yüzde 55/);
  assert.notEqual((await sor('pilav tarifi')).niyet, 'sistem-bilgisi');
});

test('yardım: örnekler listesinden üretilir', async () => {
  await niyetler(['neler yapabilirsin', 'yardım', 'ne işe yararsın'], 'yardim');
  const r = await sor('neler yapabilirsin');
  assert.match(r.yanit, /saat kaç/);
  assert.match(r.yanit, /5 dakika sayaç kur/);
  assert.notEqual((await sor('saat kaç')).niyet, 'yardim');
});

test('selamlaşma ve teşekkür', async () => {
  await niyetler(['merhaba', 'günaydın', 'selam'], 'selamlasma');
  await niyetler(['teşekkürler', 'sağ ol', 'eyvallah'], 'tesekkur');
  assert.notEqual((await sor('merhaba saat kaç')).niyet, 'selamlasma');
  assert.notEqual((await sor('saat kaç')).niyet, 'tesekkur');
});

test('platform yoksa sistem becerileri "desteklenmiyor" der, uydurma adım yok', async () => {
  const ctx = { simdi: () => new Date(2026, 9, 16, 10, 30), depo: ctxYap().depo };
  for (const m of ['sesi aç', 'ekran görüntüsü al', 'dosya ara rapor', 'panoyu oku', 'pil durumu ne', "chrome'u aç", "web'de kedi ara"]) {
    const r = await calistir(m, ctx);
    assert.match(r.yanit, /desteklenmiyor/, m);
    assert.deepEqual(r.adimlar, [], m);
  }
  const eksik = { simdi: ctx.simdi, platform: sahtePlatform({ sesAyarla: undefined }) };
  assert.match((await calistir('sesi aç', eksik)).yanit, /desteklenmiyor/);
});

test('platform hata verirse adım durumu hata olur', async () => {
  const ctx = ctxYap({ platform: sahtePlatform({ ekranGoruntusu: async () => { throw new Error('x'); } }) });
  const r = await calistir('ekran görüntüsü al', ctx);
  assert.equal(r.adimlar[0].durum, 'hata');
});

test('eşleşme yoksa: yerelLlm yok -> anlayamadım + 3 örnek', async () => {
  const r = await sor('qwerty zxcv');
  assert.equal(r.niyet, 'bilinmiyor');
  assert.match(r.yanit, /Anlayamadım/);
  assert.equal((r.yanit.match(/“/g) || []).length, 3);
  assert.equal(r.eylem, null);
  assert.equal(r.riskli, false);
});

test('eşleşme yoksa: yerelLlm varsa ona sorulur', async () => {
  let sorulan;
  const r = await sor('qwerty zxcv', { yerelLlm: async (m) => { sorulan = m; return 'Bir cevap'; } });
  assert.equal(sorulan, 'qwerty zxcv');
  assert.equal(r.yanit, 'Bir cevap');
  assert.equal(r.niyet, 'bilinmiyor');
  const n = await sor('qwerty zxcv', { yerelLlm: async () => null });
  assert.match(n.yanit, /Anlayamadım/);
  const h = await sor('qwerty zxcv', { yerelLlm: async () => { throw new Error('x'); } });
  assert.match(h.yanit, /Anlayamadım/);
});

test('boş / geçersiz girdi', async () => {
  for (const m of ['', '   ', null, undefined, 5]) assert.equal((await sor(m)).niyet, 'bilinmiyor');
});
