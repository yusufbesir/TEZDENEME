'use strict';
// Çekirdek: Türkçe niyet ayrıştırma + beceri çalıştırma. Kabuk çalıştırmaz, ağ kullanmaz;
// işletim sistemi işleri yalnızca ctx.platform fonksiyonlarıyla yapılır.
const { tokenla } = require('./turkce');
const beceriler = require('./beceriler');

const MAKS_UZUNLUK = 2000;
const VARSAYILAN_GUVEN = 0.6;

function sonuc(yanit, niyet, ek) {
  return Object.assign({ yanit, adimlar: [], eylem: null, niyet, riskli: false }, ek || {});
}

function eslesme(norm, bilgi) {
  let en = null;
  for (const b of beceriler) {
    let r;
    try {
      r = b.eslestir(norm, bilgi);
    } catch (e) {
      continue;
    }
    if (!r) continue;
    const slots = r.slots !== undefined ? r.slots : r;
    const guven = typeof r.guven === 'number' ? r.guven : VARSAYILAN_GUVEN;
    if (!en || guven > en.guven) en = { beceri: b, slots: slots === true ? {} : slots, guven };
  }
  return en;
}

// Güvenli varsayılan: işlev yoksa ya da hata verirse "kapalı" sayılır.
function uzakKontrolAcikMi(c) {
  try { return typeof c.uzakKontrolAcik === 'function' && c.uzakKontrolAcik() === true; } catch (e) { return false; }
}

function bilinmiyor() {
  const ornek = (ad) => {
    const b = beceriler.find((x) => x.ad === ad);
    return b && b.ornekler[0];
  };
  const liste = ['saat', 'sayac', 'hesap'].map(ornek).filter(Boolean).map((o) => `“${o}”`).join(', ');
  return `Anlayamadım. Şunları deneyebilirsin: ${liste}.`;
}

function guvenliAdimlar(a) {
  if (!Array.isArray(a)) return [];
  return a.filter((x) => x && typeof x.etiket === 'string')
    .map((x) => ({ etiket: x.etiket, durum: x.durum === 'hata' ? 'hata' : 'bitti' }));
}

async function calistir(metin, ctx) {
  const c = Object.assign({}, ctx || {});
  if (typeof c.simdi !== 'function') c.simdi = () => new Date();
  if (typeof metin !== 'string' || !metin.trim()) return sonuc('Bir şey söylemedin.', 'bilinmiyor');
  if (metin.length > MAKS_UZUNLUK) return sonuc('Bu metin çok uzun; daha kısa söyler misin?', 'bilinmiyor');

  const tokenlar = tokenla(metin);
  const norm = tokenlar.map((t) => t.n).join(' ');
  const bilgi = { ham: metin, tokenlar };
  const e = eslesme(norm, bilgi);

  if (!e) {
    if (typeof c.yerelLlm === 'function') {
      try {
        const y = await c.yerelLlm(metin);
        if (typeof y === 'string' && y.trim()) {
          return sonuc(y.trim(), 'bilinmiyor', { adimlar: [{ etiket: 'Yerel modele soruluyor', durum: 'bitti' }] });
        }
      } catch (err) {
        return sonuc(bilinmiyor(), 'bilinmiyor', { adimlar: [{ etiket: 'Yerel modele soruluyor', durum: 'hata' }] });
      }
    }
    return sonuc(bilinmiyor(), 'bilinmiyor');
  }

  const b = e.beceri;
  const bc = Object.assign({}, c, { beceriler, ham: metin });

  // Hassas beceriler (pano, dosya arama) telefondan yalnızca bilgisayarda uzaktan kontrol açıkken çalışır.
  if (b.uzakKontrolGerekli === true && c.kaynak === 'telefon' && !uzakKontrolAcikMi(c)) {
    return sonuc('Bunun için bilgisayarda uzaktan kontrole izin verilmeli.', b.ad);
  }

  if (b.riskli) {
    const ek = { riskli: true };
    if (Array.isArray(b.platformGerekli) && b.platformGerekli.some((f) => !c.platform || typeof c.platform[f] !== 'function')) {
      return sonuc('Bu cihazda desteklenmiyor.', b.ad, ek);
    }
    if (typeof c.onayIste !== 'function') {
      return sonuc('Bu işlem onay gerektiriyor ve onay alınamadığı için yapmadım.', b.ad, ek);
    }
    let onay = false;
    try {
      const aciklama = typeof b.onayAciklama === 'function' ? b.onayAciklama(e.slots) : b.aciklama;
      onay = (await c.onayIste(aciklama)) === true;
    } catch (err) {
      onay = false;
    }
    if (!onay) return sonuc('Onay verilmedi, yapmadım.', b.ad, ek);
  }

  try {
    const r = (await b.calistir(e.slots, bc)) || {};
    return {
      yanit: typeof r.yanit === 'string' ? r.yanit : '',
      adimlar: guvenliAdimlar(r.adimlar),
      eylem: r.eylem && typeof r.eylem === 'object' ? r.eylem : null,
      niyet: b.ad,
      riskli: !!b.riskli,
    };
  } catch (err) {
    return sonuc('Bu işlemi yaparken bir sorun oluştu.', b.ad, {
      adimlar: [{ etiket: 'İşlem yürütülüyor', durum: 'hata' }],
      riskli: !!b.riskli,
    });
  }
}

module.exports = { calistir };
