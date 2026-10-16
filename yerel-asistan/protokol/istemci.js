'use strict';
// Pırıl protokol istemcisi (telefon; tarayıcı ve Node ile uyumlu).
// WebSocket sınıfı enjekte edilebilir (varsayılan: globalThis.WebSocket).
const S = typeof require === 'function' ? require('./sifre') : globalThis.PirilSifre;

function baglan({ url, kod, WebSocketSinifi, zamanAsimiMs = 10000 } = {}) {
  const WS = WebSocketSinifi || globalThis.WebSocket;
  if (!WS) return Promise.reject(S.hata('ws_yok', 'WebSocket sınıfı yok.'));
  let sir;
  try {
    sir = S.kodAyristir(kod);
  } catch (e) {
    return Promise.reject(e);
  }

  return new Promise((coz, red) => {
    const ws = new WS(url);
    const dinleyiciler = {};
    const bekleyenKomut = new Map(); // id -> {ilerlemeCb, coz, red}
    const bekleyenEkran = []; // FIFO
    let gonderici = null;
    let alici = null;
    let evre = 'acilis'; // acilis -> merhaba -> sunucuSinav -> hazir -> kapali
    let kimlikSayac = 0;
    let uzakKontrol = null;
    let gecici = null; // {ozel, acik}
    let bitti = false;

    const yay = (olay, veri) => {
      for (const f of (dinleyiciler[olay] || []).slice()) {
        try { f(veri); } catch (e) { /* dinleyici hatası akışı bozmaz */ }
      }
    };
    const dinle = (olay, f) => {
      (dinleyiciler[olay] = dinleyiciler[olay] || []).push(f);
      return () => { dinleyiciler[olay] = (dinleyiciler[olay] || []).filter((x) => x !== f); };
    };

    const zamanlayici = setTimeout(() => reddet(S.hata('zaman_asimi', 'Bağlantı zaman aşımına uğradı.')), zamanAsimiMs);

    function reddet(e) {
      clearTimeout(zamanlayici);
      if (evre !== 'hazir' && !bitti) { bitti = true; red(e); }
      kapatIc();
    }
    function kapatIc() {
      const eski = evre;
      evre = 'kapali';
      gecici = null;
      try { ws.close(); } catch (e) { /* kapalı */ }
      if (eski !== 'kapali') {
        const e = S.hata('kapandi', 'Bağlantı kapandı.');
        for (const [, b] of bekleyenKomut) b.red(e);
        bekleyenKomut.clear();
        for (const b of bekleyenEkran.splice(0)) b.red(e);
        yay('kapandi', {});
      }
    }

    function yolla(nesne) {
      if (evre === 'kapali' || !gonderici) return Promise.reject(S.hata('kapali', 'Bağlantı kapalı.'));
      return gonderici.gonder(nesne, (m) => ws.send(m));
    }

    function ileti(m) {
      switch (m.t) {
        case 'ilerleme': {
          const b = bekleyenKomut.get(m.id);
          if (b && b.ilerlemeCb) { try { b.ilerlemeCb(m.etiket, m.durum); } catch (e) { /* yut */ } }
          yay('ilerleme', m);
          break;
        }
        case 'yanit': {
          const b = bekleyenKomut.get(m.id);
          if (b) { bekleyenKomut.delete(m.id); b.coz(m); }
          yay('yanit', m);
          break;
        }
        case 'ekran': {
          const b = bekleyenEkran.shift();
          if (b) b.coz(m);
          yay('ekran', m);
          break;
        }
        case 'durum':
          if (typeof m.uzakKontrol === 'boolean') uzakKontrol = m.uzakKontrol;
          yay('durum', m);
          break;
        case 'hata': {
          const e = S.hata(String(m.kod), String(m.mesaj || m.kod));
          const b = typeof m.id === 'string' ? bekleyenKomut.get(m.id) : null;
          if (b) { bekleyenKomut.delete(m.id); b.red(e); }
          else if (m.kod === 'uzak_kapali' || m.kod === 'desteklenmiyor' || m.kod === 'islem_hatasi') {
            const eb = bekleyenEkran.shift();
            if (eb) eb.red(e);
          }
          yay('hata', m);
          break;
        }
        default:
          yay(m.t, m); // onay vb.
      }
    }

    function mesaj(metin) {
      if (evre === 'merhaba') {
        try {
          const m = JSON.parse(metin);
          if (!m || m.v !== S.SURUM || m.t !== 'merhaba') throw new Error('merhaba degil');
          const rs = S.b64Coz(m.rs);
          if (rs.length !== 16) throw new Error('rs');
          const sunucuAcik = S.b64Coz(m.ek);
          if (sunucuAcik.length !== S.ACIK_BAYT || sunucuAcik[0] !== 4 || !gecici) throw new Error('ek');
          evre = 'anahtar';
          const ozel = gecici.ozel;
          const istemciAcik = gecici.acik;
          gecici = null; // tek kullanımlık: özel anahtar türetmeden sonra atılır
          S.anahtarlariTuret(sir, ri, rs, { ozel, karsiAcik: sunucuAcik, istemciAcik, sunucuAcik }).then((k) => {
            gonderici = new S.Gonderici(k.c2s);
            alici = new S.Alici(k.s2c);
            evre = 'sunucuSinav';
            if (bekleyenIlk.length) { for (const x of bekleyenIlk.splice(0)) mesaj(x); }
          }, () => reddet(S.hata('anahtar', 'Anahtar türetilemedi.')));
        } catch (e) {
          reddet(S.hata('merhaba', 'Sunucudan geçersiz merhaba geldi.'));
        }
        return;
      }
      if (evre === 'anahtar') { bekleyenIlk.push(metin); return; }
      if (evre !== 'sunucuSinav' && evre !== 'hazir') return;
      const sinav = evre === 'sunucuSinav';
      alici.coz(metin).then((bayt) => {
        if (evre === 'kapali') return;
        const m = S.jsonCoz(bayt);
        if (!m || typeof m !== 'object' || typeof m.t !== 'string') throw new Error('ileti');
        if (sinav) {
          // Sunucunun ilk şifreli iletisi çözüldü: sunucu doğru sırrı biliyor.
          if (m.t !== 'durum' || typeof m.uzakKontrol !== 'boolean') throw new Error('ilk ileti durum degil');
          evre = 'hazir';
          clearTimeout(zamanlayici);
          uzakKontrol = m.uzakKontrol;
          bitti = true;
          // İstemci kimliğini de kanıtlayan ilk şifreli ileti (sunucu bunu yok sayar, bayrağı değiştirmez).
          yolla({ t: 'durum', uzakKontrol: false }).catch(() => {});
          coz(arayuz);
          return;
        }
        ileti(m);
      }).catch(() => {
        if (sinav) reddet(S.hata('sunucu_kimlik', 'Sunucu doğrulanamadı (kod yanlış olabilir).'));
        else kapatIc();
      });
    }

    const bekleyenIlk = [];
    const ri = S.rastgele(16);

    const gonderTemel = (nesne) => yolla(nesne);
    const yeniId = () => `k${++kimlikSayac}-${S.b64Kodla(S.rastgele(6)).replace(/[+/=]/g, 'x')}`;

    const arayuz = {
      komutGonder(metin, ilerlemeCb) {
        const id = yeniId();
        return new Promise((c, r) => {
          bekleyenKomut.set(id, { ilerlemeCb, coz: c, red: r });
          yolla({ t: 'komut', id, metin: String(metin) }).catch((e) => { bekleyenKomut.delete(id); r(e); });
        });
      },
      isaret: (x, y) => gonderTemel({ t: 'isaret', x, y }),
      tikla: (x, y, dugme = 'sol') => gonderTemel({ t: 'tikla', x, y, dugme }),
      yaz: (metin) => gonderTemel({ t: 'yaz', metin: String(metin) }),
      tus: (tus) => gonderTemel({ t: 'tus', tus: String(tus) }),
      onaySonucGonder: (id, tamam) => gonderTemel({ t: 'onaySonuc', id, tamam: tamam === true }),
      ekranIste() {
        return new Promise((c, r) => {
          const b = { coz: c, red: r };
          bekleyenEkran.push(b);
          yolla({ t: 'ekranIste' }).catch((e) => {
            const i = bekleyenEkran.indexOf(b);
            if (i >= 0) bekleyenEkran.splice(i, 1);
            r(e);
          });
        });
      },
      dinle,
      get uzakKontrol() { return uzakKontrol; },
      get acik() { return evre === 'hazir'; },
      kapat() { kapatIc(); },
    };

    const olayEkle = (ad, f) => (ws.addEventListener ? ws.addEventListener(ad, f) : (ws['on' + ad] = f));
    olayEkle('open', () => {
      S.geciciUret().then((g) => {
        if (evre === 'kapali' || bitti) return;
        gecici = g;
        evre = 'merhaba';
        ws.send(JSON.stringify({ v: S.SURUM, t: 'merhaba', ri: S.b64Kodla(ri), ek: S.b64Kodla(g.acik) }));
      }, () => reddet(S.hata('ecdh', 'Geçici anahtar üretilemedi.')));
    });
    olayEkle('message', (e) => {
      const d = e && e.data;
      if (typeof d !== 'string') return reddet(S.hata('ikili', 'Beklenmeyen ikili ileti.'));
      mesaj(d);
    });
    olayEkle('error', () => reddet(S.hata('baglanti', 'Bağlantı kurulamadı.')));
    olayEkle('close', () => {
      if (!bitti) reddet(S.hata('kapandi', 'Sunucu bağlantıyı kapattı (kilitli, yanlış kod ya da meşgul olabilir).'));
      else kapatIc();
    });
  });
}

const api = { baglan };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else globalThis.PirilIstemci = api;
