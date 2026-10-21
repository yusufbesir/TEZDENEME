'use strict';
const { desteklenmiyor, platformFn, adim } = require('./_yardimci');

const ARAMA_URL = 'https://duckduckgo.com/?q=';
const WEB = new Set(['web', 'internet', 'internette', 'internetten', 'google', 'gugl', 'net', 'netten', 'webde']);
const DOLGU = new Set(['web', 'de', 'da', 'te', 'ta', 'internet', 'internette', 'internetten', 'google', 'gugl', 'net', 'netten',
  'webde', 'ara', 'arastir', 'aratir', 'bul', 'bana', 'lutfen', 'icin', 'hakkinda', 'misin', 'bakar', 'ile']);

module.exports = {
  ad: 'web-ara',
  aciklama: 'Web\'de arama yapar',
  ornekler: ['web\'de hava durumu ara', 'internette kedi bakımı araştır', 'google\'da en iyi film ara'],
  platformGerekli: ['urlAc'],
  eslestir(norm, bilgi) {
    const n = norm.split(' ');
    if (n.some((x) => /^dosya/.test(x))) return null;
    const ara = n.some((x) => x === 'ara' || x === 'arastir' || x === 'aratir');
    if (!ara) return null;
    const tk = (bilgi && bilgi.tokenlar) || n.map((x) => ({ n: x, h: x }));
    const sorgu = tk.filter((x) => !DOLGU.has(x.n)).map((x) => x.h).join(' ').trim().slice(0, 200);
    const webli = n.some((x) => WEB.has(x));
    return { slots: { sorgu }, guven: webli ? 0.8 : 0.55 };
  },
  async calistir(slots, ctx) {
    if (!slots.sorgu) return { yanit: 'Ne aramamı istersin?', adimlar: [] };
    const urlAc = platformFn(ctx, 'urlAc');
    if (!urlAc) return desteklenmiyor();
    const url = ARAMA_URL + encodeURIComponent(slots.sorgu);
    if (!url.startsWith('https://')) return { yanit: 'Yalnızca güvenli (https) adres açabilirim.', adimlar: [] };
    try {
      await urlAc(url);
      return {
        yanit: `“${slots.sorgu}” için web aramasını açtım.`,
        adimlar: [adim('Arama adresi hazırlandı'), adim('Tarayıcı açılıyor')],
        eylem: { tip: 'webAra', url },
      };
    } catch (e) {
      return { yanit: 'Tarayıcıyı açamadım.', adimlar: [adim('Arama adresi hazırlandı'), adim('Tarayıcı açılıyor', 'hata')] };
    }
  },
  _aramaUrl: ARAMA_URL,
};
