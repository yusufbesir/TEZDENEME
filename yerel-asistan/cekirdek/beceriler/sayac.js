'use strict';
const { sureCoz, sureYaz } = require('./_yardimci');

const MAKS = 86400;

module.exports = {
  ad: 'sayac',
  aciklama: 'Sayaç / zamanlayıcı kurar',
  ornekler: ['5 dakika sayaç kur', 'yarım saat zamanlayıcı başlat', 'on saniye geri sayım'],
  eslestir(norm) {
    const t = norm.split(' ');
    if (t.some((x) => /^hatirlat/.test(x))) return null;
    const anahtar = t.some((x) => /^(sayac|zamanlayici)/.test(x)) || /\bgeri sayim\b/.test(norm);
    if (!anahtar) return null;
    return { slots: { saniye: sureCoz(t).saniye }, guven: 0.85 };
  },
  async calistir(slots) {
    const s = Math.round(slots.saniye);
    if (!(s > 0)) return { yanit: 'Sayacı ne kadar süreyle kurayım? Örneğin “5 dakika sayaç kur”.', adimlar: [] };
    if (s > MAKS) return { yanit: 'En fazla 24 saatlik sayaç kurabilirim.', adimlar: [] };
    return {
      yanit: `${sureYaz(s)} için sayaç başlattım.`,
      adimlar: [],
      eylem: { tip: 'sayac', saniye: s },
    };
  },
};
