'use strict';
const { sayiMi } = require('../turkce');
const { desteklenmiyor, platformFn } = require('./_yardimci');

const SES = new Set(['ses', 'sesi', 'sesini', 'sesin', 'sesler', 'seslerini', 'seviyesi', 'seviyesini']);
const AC = new Set(['ac', 'arttir', 'artir', 'yukselt', 'guclendir', 'yuksel']);
const KIS = new Set(['kis', 'azalt', 'dusur', 'alcalt']);
const YAP = new Set(['yap', 'ayarla', 'yuzde', 'olsun', 'getir', 'koy', 'yuzdeye']);

module.exports = {
  ad: 'ses',
  aciklama: 'Ses seviyesini ayarlar',
  ornekler: ['sesi aç', 'sesi kıs', 'sesi yüzde 40 yap', 'sesi kapat'],
  platformGerekli: ['sesAyarla'],
  eslestir(norm) {
    const n = norm.split(' ');
    const sesli = n.some((x) => SES.has(x));
    const sustur = n.some((x) => x === 'sustur' || /^sessiz/.test(x));
    if (!sesli && !sustur) return null;
    const az = n.includes('biraz') || n.includes('azicik') || n.includes('hafif');
    const cok = n.includes('cok') || n.includes('iyice') || n.includes('epey');
    const fark = az ? 5 : cok ? 25 : 10;
    const sayi = n.find((x) => sayiMi(x));
    if (sesli && sayi !== undefined && n.some((x) => YAP.has(x) || x === 'yuzde')) {
      return { slots: { mutlak: Math.max(0, Math.min(100, Number(sayi))) }, guven: 0.9 };
    }
    if (sustur || (sesli && n.includes('kapat'))) return { slots: { sustur: true }, guven: 0.9 };
    if (sesli && (n.includes('sonuna') || n.includes('tam'))) return { slots: { mutlak: 100 }, guven: 0.85 };
    if (sesli && n.some((x) => AC.has(x))) return { slots: { fark }, guven: 0.85 };
    if (sesli && n.some((x) => KIS.has(x))) return { slots: { fark: -fark }, guven: 0.85 };
    return null;
  },
  async calistir(slots, ctx) {
    try {
      if (slots.sustur) {
        const f = platformFn(ctx, 'sesKapatAc');
        if (!f) return desteklenmiyor();
        const r = await f();
        const durum = r && typeof r.sessiz === 'boolean' ? (r.sessiz ? 'Sesi kapattım.' : 'Sesi açtım.') : 'Sessiz modunu değiştirdim.';
        return { yanit: durum, adimlar: [] };
      }
      const f = platformFn(ctx, 'sesAyarla');
      if (!f) return desteklenmiyor();
      if (slots.mutlak !== undefined) {
        await f({ mutlak: slots.mutlak });
        return { yanit: `Sesi yüzde ${slots.mutlak} yaptım.`, adimlar: [] };
      }
      await f({ fark: slots.fark });
      return { yanit: slots.fark > 0 ? 'Sesi açtım.' : 'Sesi kıstım.', adimlar: [] };
    } catch (e) {
      return { yanit: 'Ses ayarını değiştiremedim.', adimlar: [{ etiket: 'Ses ayarlanıyor', durum: 'hata' }] };
    }
  },
};
