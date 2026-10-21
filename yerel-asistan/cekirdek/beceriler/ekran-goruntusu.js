'use strict';
const { desteklenmiyor, platformFn, adim } = require('./_yardimci');

module.exports = {
  ad: 'ekran-goruntusu',
  aciklama: 'Ekran görüntüsü alır',
  ornekler: ['ekran görüntüsü al', 'ekranın fotoğrafını çek', 'screenshot al'],
  platformGerekli: ['ekranGoruntusu'],
  eslestir(norm) {
    const n = norm.split(' ');
    if (n.some((x) => /^kilit/.test(x))) return null;
    if (n.includes('screenshot') || n.includes('ss')) return { slots: {}, guven: 0.85 };
    const ekran = n.some((x) => /^ekran/.test(x));
    if (ekran && n.some((x) => /^(goruntu|resim|fotograf|yakala|kopya)/.test(x))) return { slots: {}, guven: 0.85 };
    return null;
  },
  async calistir(slots, ctx) {
    const f = platformFn(ctx, 'ekranGoruntusu');
    if (!f) return desteklenmiyor();
    try {
      const r = await f();
      const yol = r && typeof r.yol === 'string' ? r.yol : null;
      return {
        yanit: yol ? `Ekran görüntüsünü aldım: ${yol}` : 'Ekran görüntüsünü aldım.',
        adimlar: [adim('Ekran görüntüsü alınıyor')],
        eylem: { tip: 'ekranGoruntusu', yol },
      };
    } catch (e) {
      return { yanit: 'Ekran görüntüsünü alamadım.', adimlar: [adim('Ekran görüntüsü alınıyor', 'hata')] };
    }
  },
};
