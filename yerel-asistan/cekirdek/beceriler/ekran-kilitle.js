'use strict';
// Riskli: onay olmadan çalışmaz (çekirdek, onayIste yoksa reddeder).
const { desteklenmiyor, platformFn, adim } = require('./_yardimci');

module.exports = {
  ad: 'ekran-kilitle',
  aciklama: 'Ekranı kilitler (onay ister)',
  ornekler: ['ekranı kilitle', 'bilgisayarı kilitle', 'ekranı kilitler misin'],
  riskli: true,
  platformGerekli: ['kilitle'],
  onayAciklama: () => 'Ekran kilitlenecek. Onaylıyor musun?',
  eslestir(norm) {
    const n = norm.split(' ');
    if (n.some((x) => /^kilitle/.test(x)) || (n.some((x) => /^kilit/.test(x)) && n.some((x) => /^(ekran|bilgisayar|pc)/.test(x)))) {
      return { slots: {}, guven: 0.9 };
    }
    return null;
  },
  async calistir(slots, ctx) {
    const f = platformFn(ctx, 'kilitle');
    if (!f) return desteklenmiyor();
    try {
      await f();
      return { yanit: 'Ekranı kilitledim.', adimlar: [adim('Ekran kilitleniyor')] };
    } catch (e) {
      return { yanit: 'Ekranı kilitleyemedim.', adimlar: [adim('Ekran kilitleniyor', 'hata')] };
    }
  },
};
