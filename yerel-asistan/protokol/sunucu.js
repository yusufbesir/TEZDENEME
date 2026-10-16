'use strict';
// Pırıl protokol sunucusu (yalnız Node). Bilgisayarda çalışır.
const { WebSocketServer } = require('ws');
const S = require('./sifre');

const UZAK_TURLER = new Set(['isaret', 'tikla', 'yaz', 'tus', 'ekranIste']);
const DUGMELER = new Set(['sol', 'sag', 'orta']);

const strMi = (v, en = 4096) => typeof v === 'string' && v.length <= en;
const sayiMi = (v) => typeof v === 'number' && Number.isFinite(v);
const birimMi = (v) => sayiMi(v) && v >= 0 && v <= 1;

// İstemciden kabul edilen iletiler ve şemaları. Dönüş: null (geçerli) ya da hata metni.
const SEMA = {
  komut: (m) => (strMi(m.id, 64) && typeof m.metin === 'string' ? null : 'komut{id,metin} bekleniyor'),
  onaySonuc: (m) => (strMi(m.id, 64) && typeof m.tamam === 'boolean' ? null : 'onaySonuc{id,tamam} bekleniyor'),
  isaret: (m) => (birimMi(m.x) && birimMi(m.y) ? null : 'isaret{x,y} 0..1 olmalı'),
  tikla: (m) =>
    birimMi(m.x) && birimMi(m.y) && (m.dugme === undefined || DUGMELER.has(m.dugme))
      ? null
      : 'tikla{x,y,dugme} geçersiz',
  yaz: (m) => (strMi(m.metin, 10000) ? null : 'yaz{metin} bekleniyor'),
  tus: (m) => (strMi(m.tus, 64) ? null : 'tus{tus} bekleniyor'),
  ekranIste: () => null,
  durum: (m) => (typeof m.uzakKontrol === 'boolean' ? null : 'durum{uzakKontrol} bekleniyor'),
};

const MERHABA_SINIR = 1024; // kimlik doğrulanana kadar ws çerçeve üst sınırı (bayt)
const KIMLIKSIZ_TOPLAM = 4;
const KIMLIKSIZ_IP = 2;
const KUYRUK_SINIR = 32;
const HARITA_SINIR = 1024;
const LOG_PENCERE_MS = 1000;
const LOG_PENCERE_SAYI = 5;
// Doğrulanmış oturumda istemci->sunucu zarfı en çok SINIR düz bayt taşır (ekran yalnız sunucudan gider).
const DOGRULANMIS_SINIR = Math.ceil(((S.SINIR + 16) * 4) / 3) + 256;

const sirDogrula = (v) => {
  if (typeof v === 'string') v = S.kodAyristir(v);
  if (!(v instanceof Uint8Array) || v.length !== 32) throw new Error('sir 32 baytlık Uint8Array (ya da PIRIL- kodu) olmalı');
  return Uint8Array.from(v);
};

async function sunucuBaslat(secenek = {}) {
  const {
    host = '127.0.0.1',
    port = 0,
    isleyici,
    onayIste,
    uzak = {},
    log: logDis = () => {},
    simdi = () => Date.now(),
    kilitEsik = 5,
    kilitSureMs = 60000,
    girisSuresiMs = 10000,
    pingMs = 15000,
  } = secenek;
  let sir = sirDogrula(secenek.sir);
  let sirNesil = 0;

  let uzakKontrol = secenek.uzakKontrol === true;
  let aktif = null;
  const oturumlar = new Set();
  const hatalar = new Map(); // ip -> {sayi, kilitBitis, son}

  // Günlük taşmasını önlemek için aynı olay saniyede en çok 5 kez yazılır.
  const logPenceresi = new Map(); // olay -> {bas, sayi}
  function log(olay, mesaj) {
    const t = simdi();
    let p = logPenceresi.get(olay);
    if (!p || t - p.bas >= LOG_PENCERE_MS || t < p.bas) {
      p = { bas: t, sayi: 0 };
      logPenceresi.set(olay, p);
    }
    if (p.sayi >= LOG_PENCERE_SAYI) return;
    p.sayi += 1;
    try { logDis(mesaj === undefined ? olay : mesaj); } catch (e) { /* günlük hatası akışı bozmaz */ }
  }

  // ---- kilitlenme ----
  // Kilit yalnızca YENİ, kimliği kanıtlanmamış bağlantı denemelerini engeller (60 sn).
  // Kimliğini zaten kanıtlamış aktif oturum etkilenmez.
  function kilitliMi(ip) {
    const k = hatalar.get(ip);
    if (!k || !k.kilitBitis) return false;
    if (simdi() >= k.kilitBitis) {
      hatalar.delete(ip);
      return false;
    }
    return true;
  }
  function haritaTemizle() {
    const t = simdi();
    for (const [k, v] of hatalar) {
      const bitti = v.kilitBitis ? t >= v.kilitBitis : t - v.son >= kilitSureMs;
      if (bitti || t < v.son) hatalar.delete(k);
    }
    while (hatalar.size >= HARITA_SINIR) {
      let silinecek;
      for (const [k, v] of hatalar) { if (!v.kilitBitis) { silinecek = k; break; } }
      if (silinecek === undefined) silinecek = hatalar.keys().next().value;
      hatalar.delete(silinecek);
    }
  }
  function hataKaydet(ip) {
    if (kilitliMi(ip)) return;
    if (!hatalar.has(ip) && hatalar.size >= HARITA_SINIR) haritaTemizle();
    const k = hatalar.get(ip) || { sayi: 0, kilitBitis: 0, son: 0 };
    k.sayi += 1;
    k.son = simdi();
    if (k.sayi >= kilitEsik) {
      k.kilitBitis = simdi() + kilitSureMs;
      k.sayi = 0;
      log('kilit', `kilit: ${ip}`);
    }
    hatalar.set(ip, k);
  }

  const wss = new WebSocketServer({ host, port, maxPayload: MERHABA_SINIR });
  await new Promise((coz, red) => {
    wss.once('listening', coz);
    wss.once('error', red);
  });
  wss.on('error', (e) => log('sunucu_hata', `sunucu hatası: ${e.message}`));

  function kimliksizSay(ip) {
    let toplam = 0;
    let ipSay = 0;
    for (const o of oturumlar) {
      if (o.dogrulandi) continue;
      toplam += 1;
      if (o.ip === ip) ipSay += 1;
    }
    return { toplam, ipSay };
  }

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress || '?';
    ws.on('error', () => {});
    if (kilitliMi(ip)) {
      log('kilitli_red', `kilitli bağlantı reddedildi: ${ip}`);
      ws.terminate();
      return;
    }
    const say = kimliksizSay(ip);
    if (say.toplam >= KIMLIKSIZ_TOPLAM || say.ipSay >= KIMLIKSIZ_IP) {
      log('kimliksiz_tavan', `kimliksiz bağlantı tavanı aşıldı: ${ip}`);
      ws.terminate();
      return;
    }
    // Her yeni kimliksiz deneme bağlantı AÇILIRKEN sayılır; kimlik kanıtlanınca silinir.
    hataKaydet(ip);
    oturumAc(ws, ip);
  });

  function oturumAc(ws, ip) {
    const o = {
      ws, ip,
      durum: 'merhaba', // merhaba -> anahtar -> hazir
      dogrulandi: false,
      gonderici: null,
      alici: null,
      canli: true,
      nesil: sirNesil,
      bekleyen: 0,
      zincir: Promise.resolve(),
    };
    oturumlar.add(o);

    const girisZamani = setTimeout(() => {
      if (!o.dogrulandi) kapatHata(1008, 'zaman asimi');
    }, girisSuresiMs);
    if (girisZamani.unref) girisZamani.unref();
    const ping = setInterval(() => {
      if (!o.canli) return ws.terminate();
      o.canli = false;
      try { ws.ping(); } catch (e) { /* kapanıyor */ }
    }, pingMs);
    if (ping.unref) ping.unref();
    ws.on('pong', () => { o.canli = true; });

    // Kimlik doğrulanmadan önceki her sorun bağlantıyı kapatır (deneme zaten açılışta sayıldı).
    function kapatHata(kod, neden) {
      try { ws.close(kod, neden); } catch (e) { /* zaten kapalı */ }
    }
    // Bozuk/tekrar zarf: kapat. Kimliksiz bağlantıda ek hatalı deneme sayılır.
    function zarfHatasi(neden) {
      if (!o.dogrulandi) hataKaydet(ip);
      log('zarf_red', `zarf reddedildi (${neden}): ${ip}`);
      try { ws.close(1008, 'gecersiz zarf'); } catch (e) { /* kapalı */ }
    }

    function gonder(nesne) {
      if (!o.gonderici || ws.readyState !== 1) return Promise.resolve(false);
      return o.gonderici
        .gonder(nesne, (m) => { if (ws.readyState === 1) ws.send(m); })
        .then(() => true, (e) => { log('gonderilemedi', `gönderilemedi: ${e.kod || e.message}`); return false; });
    }
    o.gonder = gonder;
    const hataGonder = (kod, mesaj, id) => gonder(id === undefined ? { t: 'hata', kod, mesaj } : { t: 'hata', kod, mesaj, id });

    ws.on('close', () => {
      clearTimeout(girisZamani);
      clearInterval(ping);
      oturumlar.delete(o);
      if (aktif === o) aktif = null;
    });

    ws.on('message', (veri, ikili) => {
      if (ikili) return kapatHata(1003, 'ikili iletisim yok');
      const metin = veri.toString();
      if (o.durum === 'merhaba') return merhabaIsle(metin);
      if (o.durum !== 'hazir') return kapatHata(1008, 'sirasiz ileti');
      o.alici.coz(metin).then(
        (bayt) => { if (dogrula()) kuyrugaAl(bayt); },
        (e) => zarfHatasi(e.kod || 'hata')
      );
    });

    function merhabaIsle(metin) {
      o.durum = 'anahtar';
      let ri;
      let istemciAcik;
      try {
        if (metin.length > MERHABA_SINIR) throw new Error('uzun');
        const m = JSON.parse(metin);
        if (!m || m.v !== S.SURUM || m.t !== 'merhaba') throw new Error('merhaba degil');
        ri = S.b64Coz(m.ri);
        if (ri.length !== 16) throw new Error('ri uzunluk');
        istemciAcik = S.b64Coz(m.ek);
        if (istemciAcik.length !== S.ACIK_BAYT || istemciAcik[0] !== 4) throw new Error('ek');
      } catch (e) {
        return kapatHata(1008, 'gecersiz merhaba');
      }
      const rs = S.rastgele(16);
      const sirAnlik = sir;
      (async () => {
        const gecici = await S.geciciUret();
        const k = await S.anahtarlariTuret(sirAnlik, ri, rs, {
          ozel: gecici.ozel, karsiAcik: istemciAcik, istemciAcik, sunucuAcik: gecici.acik,
        });
        gecici.ozel = null; // geçici özel anahtar atılır
        return { k, sunucuAcik: gecici.acik };
      })().then(({ k, sunucuAcik }) => {
        if (ws.readyState !== 1) return;
        o.gonderici = new S.Gonderici(k.s2c);
        o.alici = new S.Alici(k.c2s, S.SINIR);
        o.durum = 'hazir';
        ws.send(JSON.stringify({ v: S.SURUM, t: 'merhaba', rs: S.b64Kodla(rs), ek: S.b64Kodla(sunucuAcik) }));
        // Sunucunun kimliğini kanıtlayan ilk şifreli ileti.
        gonder({ t: 'durum', uzakKontrol });
      }).catch(() => kapatHata(1011, 'ic hata'));
    }

    function dogrula() {
      if (o.mesgul) return false;
      if (o.dogrulandi) return true;
      if (o.nesil !== sirNesil) { // sır el sıkışma sırasında değiştirildi: eski sırla kimlik geçmez
        kapatHata(1008, 'sir degisti');
        return false;
      }
      if (aktif && aktif !== o) {
        o.mesgul = true;
        o.dogrulandi = true; // anahtarı bilen biri: saldırı sayılmaz, yalnızca meşgul
        hatalar.delete(ip);
        // Kimlik kanıtlandı: ws çerçeve sınırı yükseltilir.
        yukseltSinir();
        hataGonder('mesgul', 'Zaten bağlı bir telefon var.').then(() => {
          try { ws.close(1013, 'mesgul'); } catch (e) { /* kapalı */ }
        });
        return false;
      }
      o.dogrulandi = true;
      yukseltSinir();
      aktif = o;
      hatalar.delete(ip);
      log('baglandi', `telefon bağlandı: ${ip}`);
      return true;
    }

    function yukseltSinir() {
      // ws, çerçeve sınırını oluşturma anında alır; kimlik kanıtlanınca alıcıda yükseltilir.
      if (ws._receiver) ws._receiver._maxPayload = DOGRULANMIS_SINIR;
    }

    // Doğrulanmış oturumdaki iletiler tek sıralı kuyrukta işlenir: biri bitmeden öbürü başlamaz.
    function kuyrugaAl(bayt) {
      if (o.bekleyen >= KUYRUK_SINIR) {
        let id;
        try { const m = S.jsonCoz(bayt); if (m && typeof m.id === 'string') id = m.id; } catch (e) { /* id yok */ }
        hataGonder('mesgul', 'Çok fazla bekleyen ileti var.', id);
        return;
      }
      o.bekleyen += 1;
      o.zincir = o.zincir.then(() => iletiIsle(bayt)).catch(() => {}).then(() => { o.bekleyen -= 1; });
    }

    async function iletiIsle(bayt) {
      let m;
      try {
        m = S.jsonCoz(bayt);
      } catch (e) {
        return void hataGonder('bozuk_json', 'İleti geçerli JSON değil.');
      }
      if (!m || typeof m !== 'object' || Array.isArray(m) || typeof m.t !== 'string') {
        return void hataGonder('gecersiz', 'İleti biçimi geçersiz.');
      }
      if (bayt.length > S.SINIR) {
        return void hataGonder('cok_buyuk', 'İleti boyut sınırını aşıyor.');
      }
      const sema = Object.prototype.hasOwnProperty.call(SEMA, m.t) ? SEMA[m.t] : null;
      if (!sema) return void hataGonder('bilinmeyen_tur', `Bilinmeyen ileti türü: ${m.t.slice(0, 32)}`);
      const sorun = sema(m);
      if (sorun) return void hataGonder('gecersiz', sorun, typeof m.id === 'string' ? m.id : undefined);

      if (UZAK_TURLER.has(m.t) && !uzakKontrol) {
        return void hataGonder('uzak_kapali', 'Bilgisayarda uzaktan kontrol kapalı.', typeof m.id === 'string' ? m.id : undefined);
      }

      try {
        switch (m.t) {
          case 'komut': return await komutIsle(m);
          case 'ekranIste': {
            if (typeof uzak.ekranIste !== 'function') return void hataGonder('desteklenmiyor', 'Ekran görüntüsü desteklenmiyor.');
            const r = await uzak.ekranIste();
            if (!r || typeof r.jpg !== 'string') throw new Error('ekran yok');
            return void gonder({ t: 'ekran', jpg: r.jpg, gen: r.gen | 0, yuk: r.yuk | 0 });
          }
          case 'isaret': case 'tikla': case 'yaz': case 'tus': {
            if (typeof uzak[m.t] !== 'function') return void hataGonder('desteklenmiyor', 'Bu eylem desteklenmiyor.');
            const { t, ...veri } = m;
            await uzak[t](veri, { onayIste });
            return;
          }
          default: return; // onaySonuc, durum: kabul edilir, bir şey yapmaz
        }
      } catch (e) {
        log('isleme_hata', `işleme hatası (${String(m.t).slice(0, 32)}): ${e && e.message}`);
        hataGonder('islem_hatasi', 'İşlem tamamlanamadı.', typeof m.id === 'string' ? m.id : undefined);
      }
    }

    async function komutIsle(m) {
      if (typeof isleyici !== 'function') return void hataGonder('desteklenmiyor', 'Komut işleyici yok.', m.id);
      const ctx = {
        ilerleme: (etiket, durum) => gonder({ t: 'ilerleme', id: m.id, etiket: String(etiket), durum: String(durum) }),
        onayIste: typeof onayIste === 'function' ? onayIste : async () => false,
      };
      let r;
      try {
        r = await isleyici(m.metin, ctx);
      } catch (e) {
        log('isleyici_hata', `işleyici hatası: ${e && e.message}`);
        return void hataGonder('isleyici_hatasi', 'Komut çalıştırılamadı.', m.id);
      }
      r = r || {};
      await gonder({
        t: 'yanit', id: m.id,
        yanit: typeof r.yanit === 'string' ? r.yanit : '',
        adimlar: Array.isArray(r.adimlar) ? r.adimlar : [],
        eylem: r.eylem === undefined ? null : r.eylem,
      });
    }
  }

  function oturumuKes() {
    const o = aktif;
    aktif = null;
    if (o) { try { o.ws.terminate(); } catch (e) { /* kapalı */ } }
    return o !== null;
  }

  const adres = wss.address();
  return {
    host: adres.address,
    port: adres.port,
    uzakKontrolAyarla(b) {
      uzakKontrol = b === true;
      if (aktif) aktif.gonder({ t: 'durum', uzakKontrol });
    },
    uzakKontrolAcik: () => uzakKontrol,
    kilitliMi,
    kilitKayitSayisi: () => hatalar.size,
    aktifOturumVar: () => aktif !== null,
    // Aktif oturumun IP'si ya da null.
    baglananIp: () => (aktif ? aktif.ip : null),
    // Aktif oturumu hemen düşürür (yeni oturumlar yine kodla bağlanabilir).
    oturumuKes,
    // Sırrı yeniler (yeniSir verilmezse rastgele üretilir) VE aktif oturumu düşürür.
    // Kimliksiz, eski sırla el sıkışmakta olan bağlantılar da doğrulanamaz. Yeni PIRIL- kodunu döndürür.
    sirDegistir(yeniSir) {
      const yeni = yeniSir === undefined ? S.kodUret().sir : sirDogrula(yeniSir);
      sir = Uint8Array.from(yeni);
      sirNesil += 1;
      oturumuKes();
      return S.kodBicimle(sir);
    },
    kapat() {
      return new Promise((coz) => {
        for (const o of oturumlar) { try { o.ws.terminate(); } catch (e) { /* kapalı */ } }
        wss.close(() => coz());
      });
    },
  };
}

module.exports = { sunucuBaslat };
