'use strict';
module.exports = {
  ad: 'tesekkur',
  aciklama: 'Teşekkürü karşılar',
  ornekler: ['teşekkürler', 'sağ ol', 'eyvallah'],
  eslestir(norm) {
    const n = norm.split(' ');
    if (n.length > 5) return null;
    if (n.some((x) => /^(tesekkur|mersi|eyvallah|saol)/.test(x)) || /\bsag ?ol/.test(norm)) {
      return { slots: {}, guven: 0.55 };
    }
    return null;
  },
  async calistir() {
    return { yanit: 'Rica ederim!', adimlar: [] };
  },
};
