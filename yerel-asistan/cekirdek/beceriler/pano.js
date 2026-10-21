'use strict';
const { desteklenmiyor, platformFn } = require('./_yardimci');

const PANO = /^pano(yu|ya|da|daki|dakini|m|mu|mdaki|)$/;
const YAZ = new Set(['kopyala', 'yaz', 'koy', 'kaydet', 'aktar']);
const OKU = new Set(['oku', 'soyle', 'goster', 'ne', 'var', 'nedir']);
const DOLGU = new Set(['bunu', 'sunu', 'diye', 'lutfen', 'bana']);

module.exports = {
  ad: 'pano',
  aciklama: 'Panoyu okur veya panoya yazar',
  // Telefondan gelen komutta yalnızca bilgisayarda uzaktan kontrol açıkken çalışır (asistan.js uygular).
  uzakKontrolGerekli: true,
  ornekler: ['panoyu oku', 'panoda ne var', 'panoya kopyala merhaba dünya'],
  eslestir(norm, bilgi) {
    const n = norm.split(' ');
    const pi = n.findIndex((x) => PANO.test(x));
    if (pi < 0) return null;
    const tk = (bilgi && bilgi.tokenlar) || n.map((x) => ({ n: x, h: x }));
    const vi = n.findIndex((x) => YAZ.has(x));
    if (vi >= 0) {
      const icerik = tk.filter((x, i) => i !== pi && i !== vi && !DOLGU.has(x.n)).map((x) => x.h).join(' ').trim().slice(0, 10000);
      return { slots: { islem: 'yaz', metin: icerik }, guven: 0.9 };
    }
    if (n.some((x) => OKU.has(x))) return { slots: { islem: 'oku' }, guven: 0.9 };
    return null;
  },
  async calistir(slots, ctx) {
    try {
      if (slots.islem === 'yaz') {
        if (!slots.metin) return { yanit: 'Panoya ne yazayım?', adimlar: [] };
        const f = platformFn(ctx, 'panoYaz');
        if (!f) return desteklenmiyor();
        await f(slots.metin);
        return { yanit: 'Panoya kopyaladım.', adimlar: [] };
      }
      const f = platformFn(ctx, 'panoOku');
      if (!f) return desteklenmiyor();
      const m = await f();
      if (typeof m !== 'string' || !m) return { yanit: 'Pano boş.', adimlar: [] };
      return { yanit: `Panoda şu var: ${m.length > 300 ? m.slice(0, 300) + '…' : m}`, adimlar: [] };
    } catch (e) {
      return { yanit: 'Pano işlemi başarısız oldu.', adimlar: [{ etiket: 'Pano', durum: 'hata' }] };
    }
  },
};
