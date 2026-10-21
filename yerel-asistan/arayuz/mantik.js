/* Pırıl arayüz mantığı: DOM'dan bağımsız saf işlevler (Node'da test edilir).
   Tarayıcıda window.PirilMantik, Node'da module.exports olarak sunulur. */
(function (kok, fabrika) {
  const m = fabrika();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else kok.PirilMantik = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- Mod seçimi ----
  // ?mod=pc | ?mod=telefon. Parametre yoksa preload köprüsü varsa pc, yoksa telefon.
  function modSec(arama, kopruVar) {
    let deger = null;
    const s = String(arama || '').replace(/^\?/, '');
    for (const parca of s.split('&')) {
      const [k, v] = parca.split('=');
      if (k === 'mod') deger = decodeURIComponent(v || '');
    }
    if (deger === 'pc' || deger === 'telefon') return deger;
    return kopruVar ? 'pc' : 'telefon';
  }

  // Komutun hangi yoldan gideceği: 'kopru' (pc), 'uzak' (bağlı telefon), 'yerel' (tek başına telefon).
  function komutYolu({ mod, bagli, kopruVar }) {
    if (mod === 'pc') return kopruVar ? 'kopru' : 'yok';
    return bagli ? 'uzak' : 'yerel';
  }

  // ---- Adres doğrulama (yalnız yerel/özel ağ) ----
  function ozelIpv4mu(ip) {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
    if (!m) return false;
    const o = m.slice(1).map(Number);
    if (o.some((n) => n > 255)) return false;
    return (
      o[0] === 10 ||
      o[0] === 127 ||
      (o[0] === 172 && o[1] >= 16 && o[1] <= 31) ||
      (o[0] === 192 && o[1] === 168) ||
      (o[0] === 169 && o[1] === 254)
    );
  }

  // "192.168.1.5:8765", "ws://192.168.1.5:8765" -> {ok, url} | {ok:false, neden}
  function adresCoz(girdi, varsayilanPort) {
    let s = String(girdi || '').trim();
    if (!s) return { ok: false, neden: 'Adres boş.' };
    if (/^wss:\/\//i.test(s)) return { ok: false, neden: 'Yalnızca yerel ws:// adresi kullanılabilir.' };
    s = s.replace(/^ws:\/\//i, '');
    if (/[\/?#@\s]/.test(s)) return { ok: false, neden: 'Adres biçimi geçersiz.' };
    const m = /^([^:]+)(?::(\d{1,5}))?$/.exec(s);
    if (!m) return { ok: false, neden: 'Adres biçimi geçersiz.' };
    const host = m[1].toLowerCase();
    const port = m[2] ? Number(m[2]) : varsayilanPort;
    if (!port || port < 1 || port > 65535) return { ok: false, neden: 'Bağlantı noktası (port) geçersiz.' };
    const yerelAd = host === 'localhost' || /^[a-z0-9-]+\.local$/.test(host);
    if (!yerelAd && !ozelIpv4mu(host)) {
      return { ok: false, neden: 'Yalnızca yerel ağ adresleri (192.168.x.x, 10.x.x.x, 172.16-31.x.x) kabul edilir.' };
    }
    return { ok: true, url: 'ws://' + host + ':' + port };
  }

  // Eşleştirme kodu: PIRIL-XXXXXXXX-... ; boşluk/tire/küçük harf toleransı.
  function kodNormallestir(girdi) {
    const s = String(girdi || '').toUpperCase().replace(/[\s_]/g, '');
    if (!s) return null;
    const govde = s.replace(/^PIRIL-?/, '').replace(/-/g, '');
    if (!/^[A-Z0-9]{20,}$/.test(govde)) return null;
    const gruplar = govde.match(/.{1,8}/g);
    return 'PIRIL-' + gruplar.join('-');
  }

  // ---- Bağlantı durumu şeridi ----
  function baglantiDurumu({ mod, bagli, uzakKontrol }) {
    if (mod === 'pc') return { metin: 'Bu bilgisayar', sinif: 'yerel', bagli: true };
    if (!bagli) return { metin: 'Bağlı değil', sinif: 'kapali', bagli: false };
    if (!uzakKontrol) return { metin: 'Bağlı · Uzaktan kontrol kapalı', sinif: 'uyari', bagli: true };
    return { metin: 'Bağlı', sinif: 'acik', bagli: true };
  }

  function uzaktanSekmesiGorunur({ mod, bagli }) {
    return mod === 'telefon' && !!bagli;
  }

  // ---- Adım listesi modeli (emek illüzyonu): yalnızca gerçek adımlar ----
  // durum: 'suruyor' | 'bitti' | 'hata'
  function adimListesi() {
    let adimlar = [];
    const gecerli = (d) => (d === 'bitti' || d === 'hata' ? d : 'suruyor');
    return {
      sifirla() { adimlar = []; },
      // Protokol 'ilerleme' iletisi ya da çekirdek adımı; aynı etiket varsa durumu güncellenir.
      isle(etiket, durum) {
        if (typeof etiket !== 'string' || !etiket.trim()) return;
        const d = gecerli(durum);
        for (let i = adimlar.length - 1; i >= 0; i--) {
          if (adimlar[i].etiket === etiket && adimlar[i].durum === 'suruyor') {
            adimlar[i].durum = d;
            return;
          }
        }
        adimlar.push({ etiket, durum: d });
      },
      // Son yanıtın adimlar listesi: eşleşenleri günceller, kalanları sırayla ekler.
      yanittanUygula(liste) {
        if (!Array.isArray(liste)) return;
        let imlec = 0;
        for (const a of liste) {
          if (!a || typeof a.etiket !== 'string') continue;
          let bulundu = -1;
          for (let i = imlec; i < adimlar.length; i++) {
            if (adimlar[i].etiket === a.etiket) { bulundu = i; break; }
          }
          const d = a.durum === 'hata' ? 'hata' : 'bitti';
          if (bulundu >= 0) { adimlar[bulundu].durum = d; imlec = bulundu + 1; }
          else { adimlar.push({ etiket: a.etiket, durum: d }); imlec = adimlar.length; }
        }
        // Yanıt geldiyse hâlâ "sürüyor" görünen adım kalmasın.
        for (const a of adimlar) if (a.durum === 'suruyor') a.durum = 'bitti';
      },
      liste() { return adimlar.map((a) => ({ ...a })); },
      gorunur() { return adimlar.length > 0; },
    };
  }

  // Karakter durumu: komutun evresinden.
  function karakterDurumu({ evre, adimlar, hata }) {
    if (hata) return 'hata';
    if (evre === 'dinliyor') return 'dinliyor';
    if (evre === 'dusunuyor') return 'dusunuyor';
    if (evre === 'calisiyor') return 'calisiyor';
    if (evre === 'bitti') {
      return Array.isArray(adimlar) && adimlar.some((a) => a.durum === 'hata') ? 'hata' : 'bitti';
    }
    return 'bekliyor';
  }

  // ---- Uzaktan kontrol: dokunma koordinatı -> 0..1 ----
  function normalKoordinat(x, y, dikdortgen) {
    const { left, top, width, height } = dikdortgen;
    if (!(width > 0) || !(height > 0)) return null;
    const k = (v) => Math.min(1, Math.max(0, v));
    return { x: k((x - left) / width), y: k((y - top) / height) };
  }

  // Protokol 'hata' iletisinden kibar uyarı.
  function uzakHataMetni(kod, mesaj) {
    const k = String(kod || '').toLowerCase();
    if (k.includes('izin') || k.includes('uzak')) {
      return 'Bilgisayarda "Uzaktan kontrole izin ver" anahtarı kapalı. Bilgisayardaki Pırıl ayarlarından açabilirsiniz.';
    }
    return mesaj ? String(mesaj) : 'Bilgisayardan bir hata bildirildi.';
  }

  function sayacMetni(saniye) {
    const s = Math.max(0, Math.floor(saniye));
    const dk = Math.floor(s / 60);
    const sn = s % 60;
    return String(dk).padStart(2, '0') + ':' + String(sn).padStart(2, '0');
  }

  return {
    modSec, komutYolu, ozelIpv4mu, adresCoz, kodNormallestir, baglantiDurumu,
    uzaktanSekmesiGorunur, adimListesi, karakterDurumu, normalKoordinat,
    uzakHataMetni, sayacMetni,
  };
});
