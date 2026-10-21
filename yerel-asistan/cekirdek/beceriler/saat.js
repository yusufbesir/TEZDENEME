'use strict';
const { saatYaz } = require('./_yardimci');

module.exports = {
  ad: 'saat',
  aciklama: 'Saati söyler',
  ornekler: ['saat kaç', 'şu an saat kaç oldu', 'saati söyler misin'],
  eslestir(norm) {
    const t = norm.split(' ');
    if (t.some((x) => /^(sayac|zamanlayici|hatirlat|alarm|tarih)/.test(x))) return null;
    if (t.some((x) => /^\d/.test(x))) return null;
    if (/\bsaat (kac|kactir|ne)\b/.test(norm) || /\bsaati\b/.test(norm)) return { slots: {}, guven: 0.8 };
    return null;
  },
  async calistir(slots, ctx) {
    return { yanit: `Saat ${saatYaz(ctx.simdi())}.`, adimlar: [] };
  },
};
