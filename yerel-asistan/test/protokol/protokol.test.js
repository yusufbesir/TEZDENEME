'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { WebSocket, S, sunucu, hamBaglan, bekle, kos } = require('./yardimci');
const { baglan } = require('../../protokol/istemci');

async function kur(ek) {
  const x = await sunucu(ek);
  const temizle = [];
  x.istemci = async (kod = x.kod) => {
    const i = await baglan({ url: x.url, kod, WebSocketSinifi: WebSocket });
    temizle.push(i);
    return i;
  };
  x.bitir = async () => { temizle.forEach((i) => i.kapat()); await x.s.kapat(); };
  return x;
}

test('mutlu yol: komut, ilerleme, yanıt uçtan uca', async () => {
  const x = await kur();
  try {
    const i = await x.istemci();
    assert.equal(i.uzakKontrol, false);
    const ilerleme = [];
    const y = await i.komutGonder('saat kaç', (e, d) => ilerleme.push([e, d]));
    assert.equal(y.yanit, 'tamam: saat kaç');
    assert.deepEqual(y.adimlar, [{ etiket: 'x', durum: 'bitti' }]);
    assert.equal(y.eylem, null);
    assert.deepEqual(ilerleme, [['Komut çözümleniyor', 'bitti']]);
    // eşzamanlı komutlar sıra bozmadan çalışır
    const hepsi = await Promise.all(Array.from({ length: 20 }, (_, n) => i.komutGonder('k' + n)));
    assert.deepEqual(hepsi.map((h) => h.yanit), Array.from({ length: 20 }, (_, n) => 'tamam: k' + n));
  } finally { await x.bitir(); }
});

test('varsayılan host 127.0.0.1', async () => {
  const x = await kur();
  try { assert.equal(x.s.host, '127.0.0.1'); } finally { await x.bitir(); }
});

test('yanlış kod: istemci reddeder, sunucu kapatır', async () => {
  const x = await kur();
  try {
    const yanlis = S.kodUret().kod;
    await assert.rejects(x.istemci(yanlis), (e) => e.kod === 'sunucu_kimlik');
    assert.equal(x.s.aktifOturumVar(), false);
    // biçim hatalı kod ağa çıkmadan reddedilir
    await assert.rejects(x.istemci('PIRIL-AAAA'), { kod: 'kod_uzunluk' });
  } finally { await x.bitir(); }
});

test('zarf bit çevirme: bağlantı kapanır', async () => {
  const x = await kur();
  try {
    const h = await hamBaglan(x.url, x.sir);
    await h.al(); // sunucunun durum iletisi
    const z = [];
    await h.gonderici.gonder({ t: 'durum', uzakKontrol: false }, (m) => z.push(m));
    const o = JSON.parse(z[0]);
    const c = S.b64Coz(o.c);
    c[3] ^= 1;
    h.ws.send(JSON.stringify({ v: S.SURUM, n: o.n, c: S.b64Kodla(c) }));
    assert.ok(await h.kapanmayiBekle());
  } finally { await x.bitir(); }
});

test('replay: aynı zarf ikinci kez gelince bağlantı kapanır', async () => {
  const x = await kur();
  try {
    const h = await hamBaglan(x.url, x.sir);
    await h.al();
    const z = [];
    await h.gonderici.gonder({ t: 'komut', id: 'a', metin: 'merhaba' }, (m) => z.push(m));
    h.ws.send(z[0]);
    const ilk = [await h.al(), await h.al()]; // ilerleme + yanıt (sıra: ilerleme önce)
    assert.ok(ilk.some((m) => m.t === 'yanit'));
    h.ws.send(z[0]); // tekrar
    assert.ok(await h.kapanmayiBekle());
  } finally { await x.bitir(); }
});

test('sayaç boşluğu: n=2 ilk gelirse kapanır (son+1 şart)', async () => {
  const x = await kur();
  try {
    const h = await hamBaglan(x.url, x.sir);
    await h.al();
    const z = [];
    await h.gonderici.gonder({ t: 'durum', uzakKontrol: false }, (m) => z.push(m));
    await h.gonderici.gonder({ t: 'durum', uzakKontrol: false }, (m) => z.push(m));
    h.ws.send(z[1]); // n=2, n=1 atlandı
    assert.ok(await h.kapanmayiBekle());
  } finally { await x.bitir(); }
});

test('sayaç geri sarma: n=1, n=2 sonra n=1 kapanır', async () => {
  const x = await kur();
  try {
    const h = await hamBaglan(x.url, x.sir);
    await h.al();
    const z = [];
    for (let i = 0; i < 2; i++) await h.gonderici.gonder({ t: 'durum', uzakKontrol: false }, (m) => z.push(m));
    h.ws.send(z[0]);
    h.ws.send(z[1]);
    await bekle(100);
    assert.equal(h.kapandi, false);
    h.ws.send(z[0]);
    assert.ok(await h.kapanmayiBekle());
  } finally { await x.bitir(); }
});

test('sayacı elle değiştirilmiş zarf (nonce uyuşmaz) kapanır', async () => {
  const x = await kur();
  try {
    const h = await hamBaglan(x.url, x.sir);
    await h.al();
    const z = [];
    await h.gonderici.gonder({ t: 'durum', uzakKontrol: false }, (m) => z.push(m));
    const o = JSON.parse(z[0]);
    h.ws.send(JSON.stringify({ ...o, n: o.n + 5 }));
    assert.ok(await h.kapanmayiBekle());
  } finally { await x.bitir(); }
});

test('kilitlenme: 5 hatalı denemede 60 sn kilit (sahte saat)', async () => {
  let t = 1_000_000;
  const x = await kur({ simdi: () => t });
  try {
    for (let n = 0; n < 5; n++) {
      assert.equal(x.s.kilitliMi('127.0.0.1'), false, `deneme ${n}`);
      await assert.rejects(x.istemci(S.kodUret().kod));
      assert.ok(await kos(() => x.s.kilitliMi('127.0.0.1') || n < 4), 'kilit bekleniyor');
      if (n < 4) await bekle(60); // sunucunun kapanışı işlemesi için
    }
    assert.equal(x.s.kilitliMi('127.0.0.1'), true);
    // doğru kodla bile reddedilir
    await assert.rejects(x.istemci(), { kod: 'kapandi' });
    t += 59_000;
    await assert.rejects(x.istemci(), { kod: 'kapandi' });
    t += 2_000;
    assert.equal(x.s.kilitliMi('127.0.0.1'), false);
    const i = await x.istemci();
    assert.equal((await i.komutGonder('a')).yanit, 'tamam: a');
  } finally { await x.bitir(); }
});

test('iki oturum aynı anahtarı kullanmaz', async () => {
  const x = await kur();
  try {
    const ri = S.rastgele(16); // aynı ri bile olsa rs farklıdır
    const a = await hamBaglan(x.url, x.sir, { ri });
    await a.al();
    const z = [];
    await a.gonderici.gonder({ t: 'komut', id: 'a', metin: 'm' }, (m) => z.push(m));
    a.ws.close();
    await a.kapanmayiBekle();
    await kos(() => !x.s.aktifOturumVar());
    const b = await hamBaglan(x.url, x.sir, { ri });
    assert.notDeepEqual(a.rs, b.rs);
    await b.al();
    b.ws.send(z[0]); // A oturumunun zarfı B'de geçersiz
    assert.ok(await b.kapanmayiBekle());
  } finally { await x.bitir(); }
});

test('en çok 1 aktif telefon oturumu', async () => {
  const x = await kur();
  try {
    const i1 = await x.istemci();
    const hatalar = [];
    const i2 = await x.istemci();
    i2.dinle('hata', (m) => hatalar.push(m.kod));
    assert.ok(await kos(() => hatalar.includes('mesgul')));
    assert.ok(await kos(() => !i2.acik));
    assert.equal((await i1.komutGonder('hâlâ')).yanit, 'tamam: hâlâ');
  } finally { await x.bitir(); }
});

test('uzakKontrol kapalıyken reddedilir, API ile açılınca çalışır', async () => {
  const cagrilar = [];
  const x = await kur({
    uzak: {
      isaret: async (v) => cagrilar.push(['isaret', v]),
      tikla: async (v) => cagrilar.push(['tikla', v]),
      yaz: async (v) => cagrilar.push(['yaz', v]),
      tus: async (v) => cagrilar.push(['tus', v]),
      ekranIste: async () => ({ jpg: 'AAAA', gen: 10, yuk: 5 }),
    },
  });
  try {
    // istemci durum iletisiyle bayrağı açamaz
    const h = await hamBaglan(x.url, x.sir);
    await h.al();
    await h.gonder({ t: 'durum', uzakKontrol: true });
    await h.gonder({ t: 'isaret', x: 0.5, y: 0.5 });
    assert.equal((await h.al()).kod, 'uzak_kapali');
    h.ws.close();
    await kos(() => !x.s.aktifOturumVar());

    const i = await x.istemci();
    const hatalar = [];
    i.dinle('hata', (m) => hatalar.push(m.kod));
    await i.isaret(0.5, 0.5);
    await i.tikla(0.1, 0.2);
    await i.yaz('abc');
    await i.tus('Enter');
    await assert.rejects(i.ekranIste(), { kod: 'uzak_kapali' });
    assert.ok(await kos(() => hatalar.length >= 5));
    assert.deepEqual(hatalar, Array(5).fill('uzak_kapali'));
    assert.equal(cagrilar.length, 0);

    x.s.uzakKontrolAyarla(true);
    assert.ok(await kos(() => i.uzakKontrol === true));
    await i.isaret(0.25, 0.75);
    await i.tikla(0.5, 0.5, 'sag');
    const e = await i.ekranIste();
    assert.deepEqual([e.jpg, e.gen, e.yuk], ['AAAA', 10, 5]);
    assert.ok(await kos(() => cagrilar.length === 2));
    assert.deepEqual(cagrilar[0], ['isaret', { x: 0.25, y: 0.75 }]);
    assert.equal(cagrilar[1][1].dugme, 'sag');
    x.s.uzakKontrolAyarla(false);
    assert.ok(await kos(() => i.uzakKontrol === false));
  } finally { await x.bitir(); }
});

test('bilinmeyen tür ve şema hataları: hata iletisi, çökme yok', async () => {
  const x = await kur({ uzakKontrol: true });
  try {
    const h = await hamBaglan(x.url, x.sir);
    await h.al();
    await h.gonder({ t: 'uzayGemisi' });
    assert.equal((await h.al()).kod, 'bilinmeyen_tur');
    await h.gonder({ t: '__proto__' });
    assert.equal((await h.al()).kod, 'bilinmeyen_tur');
    await h.gonder({ t: 'toString' });
    assert.equal((await h.al()).kod, 'bilinmeyen_tur');
    await h.gonder({ t: 'isaret', x: 5, y: 0 });
    assert.equal((await h.al()).kod, 'gecersiz');
    await h.gonder({ t: 'komut', id: 1, metin: 'x' });
    assert.equal((await h.al()).kod, 'gecersiz');
    await h.gonder([1, 2]);
    assert.equal((await h.al()).kod, 'gecersiz');
    await h.gonder({ t: 'tikla', x: 0, y: 0, dugme: 'kafa' });
    assert.equal((await h.al()).kod, 'gecersiz');
    assert.equal(h.kapandi, false);
    // hâlâ çalışıyor
    await h.gonder({ t: 'komut', id: 'z', metin: 'iyi' });
    const gelenler = [await h.al(), await h.al()];
    assert.ok(gelenler.some((m) => m.t === 'yanit' && m.yanit === 'tamam: iyi'));
  } finally { await x.bitir(); }
});

test('bozuk JSON (şifreli ama JSON değil) ve devasa iletiler', async () => {
  const x = await kur();
  try {
    const h = await hamBaglan(x.url, x.sir);
    await h.al();
    // 1) şifreli ama JSON olmayan düz metin
    const g = h.gonderici;
    const n1 = g.sayac + 1;
    const c1 = await S.sifrele(g.anahtar, n1, new TextEncoder().encode('{bozuk json'));
    g.sayac = n1;
    h.ws.send(JSON.stringify({ v: S.SURUM, n: n1, c: S.b64Kodla(c1) }));
    assert.equal((await h.al()).kod, 'bozuk_json');
    // 2) tam 256 KB düz ileti geçer (şema reddeder); fazlası reddedilir
    const dene = async (uzunluk) => {
      const n = g.sayac + 1;
      const duz = new TextEncoder().encode(JSON.stringify({ t: 'yaz', metin: 'a'.repeat(uzunluk - 22) }));
      assert.equal(duz.length, uzunluk);
      const c = await S.sifrele(g.anahtar, n, duz);
      g.sayac = n;
      h.ws.send(JSON.stringify({ v: S.SURUM, n, c: S.b64Kodla(c) }));
    };
    await dene(S.SINIR);
    assert.equal((await h.al()).kod, 'gecersiz');
    assert.equal(h.kapandi, false);
    await assert.rejects(h.gonder({ t: 'yaz', metin: 'a'.repeat(300 * 1024) }), { kod: 'cok_buyuk' }); // gönderici de reddeder
    await dene(S.SINIR + 1); // sınırın hemen üstü: uygulama katmanı reddeder
    assert.equal((await h.al()).kod, 'cok_buyuk');
    await dene(S.SINIR + 2000); // ws çerçeve tavanı: bağlantı kapanır
    assert.ok(await h.kapanmayiBekle());
  } finally { await x.bitir(); }
});

test('el sıkışma öncesi bozuk girdiler (v:1 dahil): kapanır, sunucu çökmez', async () => {
  const x = await kur();
  try {
    const ek = S.b64Kodla(new Uint8Array(65));
    for (const yuk of ['merhaba', '{"v":2,"t":"merhaba","ri":"AAAAAAAAAAAAAAAAAAAAAA=="}',
      `{"v":1,"t":"merhaba","ri":"AAAAAAAAAAAAAAAAAAAAAA==","ek":"${ek}"}`]) {
      const h = await hamBaglan(x.url, x.sir, { merhabaGonder: false });
      h.ws.send(yuk);
      assert.ok(await h.kapanmayiBekle(), yuk);
    }
    const h = await hamBaglan(x.url, x.sir);
    h.ws.send(Buffer.from([1, 2, 3])); // ikili
    assert.ok(await h.kapanmayiBekle());
    // 5 hatalı deneme sayılmadı (4 + sağlam); sunucu sağlam; sunucu sağlam, doğru kodlu istemci bağlanır
    assert.equal(x.s.kilitliMi('127.0.0.1'), false);
    const i = await x.istemci();
    assert.equal((await i.komutGonder('a')).yanit, 'tamam: a');
  } finally { await x.bitir(); }
});

// ---------- ileri gizlilik, sır değişimi, sınırlar ----------

test('el sıkışma v:2: sunucu geçici açık anahtar gönderir; her oturumda farklı', async () => {
  const x = await kur();
  try {
    const a = await hamBaglan(x.url, x.sir);
    await a.al();
    assert.equal(a.sunucuAcik.length, 65);
    a.ws.close();
    await kos(() => !x.s.aktifOturumVar());
    // aynı ri ve aynı istemci geçici anahtarı olsa bile sunucu rs + geçici anahtarı yeniler
    const b = await hamBaglan(x.url, x.sir, { ri: a.ri });
    assert.notDeepEqual(a.sunucuAcik, b.sunucuAcik);
    assert.notDeepEqual(a.rs, b.rs);
    assert.equal((await b.al()).t, 'durum');
  } finally { await x.bitir(); }
});

test('sunucu kendi geçici anahtarı olmadan kabul edilmez: merhabada ek yoksa/bozuksa kapanır', async () => {
  const x = await kur();
  try {
    for (const ek of [undefined, S.b64Kodla(new Uint8Array(65)), S.b64Kodla(new Uint8Array(64))]) {
      const h = await hamBaglan(x.url, x.sir, { merhabaGonder: false });
      h.ws.send(JSON.stringify({ v: 2, t: 'merhaba', ri: S.b64Kodla(S.rastgele(16)), ...(ek ? { ek } : {}) }));
      assert.ok(await h.kapanmayiBekle());
    }
  } finally { await x.bitir(); }
});

test('sirDegistir: aktif oturum düşer, eski kodla bağlanma reddedilir, yeni kodla çalışır', async () => {
  const x = await kur();
  try {
    const i = await x.istemci();
    assert.ok(await kos(() => x.s.baglananIp() === '127.0.0.1'));
    const yeniKod = x.s.sirDegistir();
    assert.match(yeniKod, /^PIRIL-/);
    assert.equal(x.s.baglananIp(), null);
    assert.equal(x.s.aktifOturumVar(), false);
    assert.ok(await kos(() => !i.acik));
    await assert.rejects(x.istemci(x.kod), { kod: 'sunucu_kimlik' });
    const y = await x.istemci(yeniKod);
    assert.equal((await y.komutGonder('yeni')).yanit, 'tamam: yeni');
    // açıkça verilen sır (kod ya da bayt)
    const { sir: s2, kod: k2 } = S.kodUret();
    x.s.sirDegistir(s2);
    assert.ok(await kos(() => !y.acik));
    assert.equal((await (await x.istemci(k2)).komutGonder('b')).yanit, 'tamam: b');
    assert.throws(() => x.s.sirDegistir(new Uint8Array(5)));
  } finally { await x.bitir(); }
});

test('sirDegistir: değişimden önce eski sırla el sıkışmış kimliksiz bağlantı doğrulanamaz', async () => {
  const x = await kur();
  try {
    const h = await hamBaglan(x.url, x.sir);
    await h.al();
    x.s.sirDegistir();
    await h.gonder({ t: 'durum', uzakKontrol: false }).catch(() => {});
    assert.ok(await h.kapanmayiBekle());
    assert.equal(x.s.aktifOturumVar(), false);
  } finally { await x.bitir(); }
});

test('oturumuKes ve baglananIp', async () => {
  const x = await kur();
  try {
    assert.equal(x.s.baglananIp(), null);
    assert.equal(x.s.oturumuKes(), false);
    const i = await x.istemci();
    assert.ok(await kos(() => x.s.baglananIp() === '127.0.0.1'));
    assert.equal(x.s.oturumuKes(), true);
    assert.ok(await kos(() => !i.acik));
    const j = await x.istemci(); // kod aynı: yeniden bağlanabilir
    assert.equal((await j.komutGonder('a')).yanit, 'tamam: a');
  } finally { await x.bitir(); }
});

test('payload tavanı: kimlik öncesi 1 KB (message olayında terminate), doğrulanmış oturumda 256 KB', async () => {
  // ws maxPayload doğrulanmış sınıra sabit; kimliksiz bağlantıda >1 KB ileti işlenmeden koparılır ve hatalı deneme sayılır.
  // Bellek üst sınırı: kimliksiz bağlantı tavanı (toplam 4) x maxPayload (DOGRULANMIS_SINIR ~ 350 KB) ~ 1.4 MB.
  const x = await kur({ kilitEsik: 3 });
  try {
    // el sıkışma öncesi: 2 KB ileti bağlantıyı koparır (terminate -> 1006), açılış + büyük ileti = 2 hatalı deneme
    const a = await hamBaglan(x.url, x.sir, { merhabaGonder: false });
    a.ws.send('x'.repeat(2000));
    assert.ok(await a.kapanmayiBekle());
    assert.notEqual(a.kapanisKodu, 1000);
    assert.equal(x.s.kilitliMi('127.0.0.1'), false);
    // el sıkışmış ama henüz doğrulanmamış: 2 KB kopar; bu 3. hatalı deneme (açılış sayılır) -> kilit
    const b = await hamBaglan(x.url, x.sir);
    await b.al();
    b.ws.send('x'.repeat(2000));
    assert.ok(await b.kapanmayiBekle());
    assert.ok(await kos(() => x.s.kilitliMi('127.0.0.1')));
  } finally { await x.bitir(); }
  const y = await kur();
  try {
    // doğrulanınca ~200 KB'lık ileti ws katmanından geçer (şema yine reddeder)
    const c = await hamBaglan(y.url, y.sir);
    await c.al();
    await c.gonder({ t: 'durum', uzakKontrol: false });
    await bekle(100);
    await c.gonder({ t: 'yaz', metin: 'a'.repeat(200 * 1024) });
    assert.equal((await c.al()).kod, 'gecersiz');
    assert.equal(c.kapandi, false);
  } finally { await y.bitir(); }
});

test('sunucu kaynağı ws dahili alanlarına (_receiver/_maxPayload) dokunmaz', () => {
  const kaynak = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../protokol/sunucu.js'), 'utf8');
  assert.doesNotMatch(kaynak, /_receiver|_maxPayload/);
  assert.match(kaynak, /new WebSocketServer\(\{[^}]*maxPayload: DOGRULANMIS_SINIR/);
});

test('kimliksiz eşzamanlı bağlantı tavanı: IP başına 2, toplam 4; aşılan hemen kapanır', async () => {
  const x = await kur();
  try {
    const ac = (ip) => hamBaglan(x.url, x.sir, { merhabaGonder: false, localAddress: ip });
    const a1 = await ac('127.0.0.1'), a2 = await ac('127.0.0.1');
    const a3 = await ac('127.0.0.1'); // IP tavanı
    assert.ok(await a3.kapanmayiBekle());
    assert.equal(a3.gelen.length, 0); // hata iletisi bile yok
    assert.equal(a1.kapandi || a2.kapandi, false);
    const b1 = await ac('127.0.0.2'), b2 = await ac('127.0.0.2');
    const c1 = await ac('127.0.0.3'); // toplam tavan (4)
    assert.ok(await c1.kapanmayiBekle());
    assert.equal(b1.kapandi || b2.kapandi, false);
    // yer açılınca yeniden bağlanabilir
    a1.ws.close();
    assert.ok(await a1.kapanmayiBekle());
    await bekle(50);
    const d = await ac('127.0.0.3');
    await bekle(100);
    assert.equal(d.kapandi, false);
    for (const h of [a2, b1, b2, d]) h.ws.close();
    assert.ok(await kos(() => [a2, b1, b2, d].every((h) => h.kapandi)));
    await bekle(50);
    const i = await x.istemci();
    assert.equal((await i.komutGonder('a')).yanit, 'tamam: a');
  } finally { await x.bitir(); }
});

test('kilit aktif doğrulanmış oturumu etkilemez, yalnız yeni kimliksiz denemeleri engeller', async () => {
  const x = await kur();
  try {
    const i = await x.istemci();
    assert.ok(await kos(() => x.s.aktifOturumVar()));
    for (let n = 0; n < 5; n++) {
      await assert.rejects(x.istemci(S.kodUret().kod));
      await bekle(30);
    }
    assert.equal(x.s.kilitliMi('127.0.0.1'), true);
    assert.equal(i.acik, true);
    assert.ok(await kos(() => x.s.baglananIp() === '127.0.0.1'));
    assert.equal((await i.komutGonder('hâlâ')).yanit, 'tamam: hâlâ');
    assert.equal(x.s.baglananIp(), '127.0.0.1');
  } finally { await x.bitir(); }
});

test('kilit kayıt haritası sınırlı (en çok 1024)', async () => {
  const x = await kur();
  try {
    for (let n = 0; n < 1100; n++) {
      const ip = `127.1.${n >> 8}.${(n & 255) || 1}`;
      const h = await hamBaglan(x.url, x.sir, { merhabaGonder: false, localAddress: ip });
      h.ws.terminate();
      await h.kapanmayiBekle();
    }
    const say = x.s.kilitKayitSayisi();
    assert.ok(say <= 1024 && say > 500, `kayıt sayısı ${say}`);
  } finally { await x.bitir(); }
});

test('log hız sınırı: aynı olay saniyede en çok 5', async () => {
  const gunluk = [];
  const x = await kur({ simdi: () => 5_000_000, log: (m) => gunluk.push(m), kilitEsik: 1 });
  try {
    await hamBaglan(x.url, x.sir, { merhabaGonder: false }); // kilidi tetikler
    assert.ok(await kos(() => x.s.kilitliMi('127.0.0.1')));
    for (let n = 0; n < 12; n++) {
      const h = await hamBaglan(x.url, x.sir, { merhabaGonder: false });
      await h.kapanmayiBekle();
    }
    assert.equal(gunluk.filter((m) => m.startsWith('kilitli bağlantı')).length, 5);
  } finally { await x.bitir(); }
});

test('sıralı kuyruk: iletiler tek tek işlenir, sıra korunur', async () => {
  let eszamanli = 0, enCok = 0;
  const sira = [];
  const x = await kur({
    isleyici: async (metin) => {
      eszamanli++; enCok = Math.max(enCok, eszamanli);
      await bekle(15);
      sira.push(metin);
      eszamanli--;
      return { yanit: metin };
    },
  });
  try {
    const i = await x.istemci();
    const r = await Promise.all(Array.from({ length: 10 }, (_, n) => i.komutGonder('m' + n)));
    assert.deepEqual(r.map((y) => y.yanit), Array.from({ length: 10 }, (_, n) => 'm' + n));
    assert.deepEqual(sira, Array.from({ length: 10 }, (_, n) => 'm' + n));
    assert.equal(enCok, 1);
  } finally { await x.bitir(); }
});

test('kuyruk sınırı: 32 aşılırsa hata{kod:mesgul}', async () => {
  let birak;
  const kapi = new Promise((r) => { birak = r; });
  const x = await kur({ isleyici: async (metin) => { await kapi; return { yanit: metin }; } });
  try {
    const h = await hamBaglan(x.url, x.sir);
    await h.al();
    for (let n = 0; n < 40; n++) await h.gonder({ t: 'komut', id: 'c' + n, metin: 'm' + n });
    const mesgul = [];
    while (mesgul.length < 8) {
      const m = await h.al();
      assert.ok(m, 'mesgul iletileri bekleniyor');
      assert.equal(m.kod, 'mesgul');
      mesgul.push(m.id);
    }
    assert.deepEqual(mesgul, Array.from({ length: 8 }, (_, n) => 'c' + (32 + n)));
    birak();
    const yanitlar = [];
    while (yanitlar.length < 32) {
      const m = await h.al();
      assert.ok(m);
      if (m.t === 'yanit') yanitlar.push(m.id);
    }
    assert.deepEqual(yanitlar, Array.from({ length: 32 }, (_, n) => 'c' + n));
  } finally { birak(); await x.bitir(); }
});
