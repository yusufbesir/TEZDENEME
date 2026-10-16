'use strict';
const { tarihYaz } = require('./_yardimci');

module.exports = {
  ad: 'tarih',
  aciklama: 'Tarihi ve günü söyler',
  ornekler: ['bugün günlerden ne', 'bugün ayın kaçı', 'yarın hangi gün'],
  eslestir(norm) {
    const t = norm.split(' ');
    if (t.some((x) => /^(hatirlat|sayac|zamanlayici)/.test(x))) return null;
    const soru = t.some((x) => /^tarih/.test(x)) || t.includes('gunlerden')
      || /\bayin kaci\b/.test(norm) || /\bhangi gun/.test(norm) || /\bne gunu\b/.test(norm)
      || /\bgun(?:u)? ne\b/.test(norm);
    if (!soru) return null;
    let ofset = 0;
    let m;
    if ((m = norm.match(/\b(\d+) gun (sonra|once)\b/))) {
      ofset = Number(m[1]) * (m[2] === 'once' ? -1 : 1);
    } else if (/\bobur gun\b/.test(norm)) ofset = 2;
    else if (t.includes('yarin')) ofset = 1;
    else if (t.includes('dun')) ofset = -1;
    if (Math.abs(ofset) > 36500) return null;
    return { slots: { ofset }, guven: 0.75 };
  },
  async calistir(slots, ctx) {
    const s = ctx.simdi();
    const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + slots.ofset);
    const etiket = slots.ofset === 0 ? 'Bugün' : slots.ofset === 1 ? 'Yarın' : slots.ofset === -1 ? 'Dün'
      : slots.ofset > 0 ? `${slots.ofset} gün sonra` : `${-slots.ofset} gün önce`;
    return { yanit: `${etiket} ${tarihYaz(d)}.`, adimlar: [] };
  },
};
