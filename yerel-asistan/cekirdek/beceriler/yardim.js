'use strict';
// Yardım metni, ctx.beceriler'in ornekler listesinden üretilir (asistan.js enjekte eder).
module.exports = {
  ad: 'yardim',
  aciklama: 'Neler yapabildiğini anlatır',
  ornekler: ['neler yapabilirsin', 'yardım', 'ne işe yararsın'],
  eslestir(norm) {
    const n = norm.split(' ');
    if (n[0] === 'yardim' || n.includes('yardim') && n.length <= 3) return { slots: {}, guven: 0.9 };
    if (/\bneler yapabil/.test(norm) || /\bne yapabil/.test(norm) || /\bne ise yara/.test(norm) || /\bkomutlar\b/.test(norm)) {
      return { slots: {}, guven: 0.9 };
    }
    return null;
  },
  async calistir(slots, ctx) {
    const liste = (ctx.beceriler || []).filter((b) => b.ad !== 'yardim' && Array.isArray(b.ornekler) && b.ornekler.length);
    const satirlar = liste.map((b) => `${b.aciklama}: “${b.ornekler[0]}”`);
    return { yanit: 'Şunları yapabilirim. ' + satirlar.join('; ') + '.', adimlar: [] };
  },
};
