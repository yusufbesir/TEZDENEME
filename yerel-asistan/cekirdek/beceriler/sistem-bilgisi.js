'use strict';
const { desteklenmiyor, platformFn, adim } = require('./_yardimci');

const PIL = new Set(['pil', 'pili', 'pilim', 'pilimi', 'pilin', 'batarya', 'bataryam', 'sarj', 'sarji', 'sarjim']);

module.exports = {
  ad: 'sistem-bilgisi',
  aciklama: 'Pil ve bellek durumunu söyler',
  ornekler: ['pil durumu ne', 'bellek kullanımı kaç', 'sistem bilgisi ver'],
  platformGerekli: ['sistemBilgisi'],
  eslestir(norm) {
    const n = norm.split(' ');
    const pil = n.some((x) => PIL.has(x));
    const bellek = n.some((x) => /^(bellek|ram|rami)/.test(x));
    const genel = /\bsistem (bilgi|durum)/.test(norm) || /\bbilgisayar(in)? durum/.test(norm) || n.includes('islemci');
    if (!pil && !bellek && !genel) return null;
    return { slots: { pil: pil || genel, bellek: bellek || genel }, guven: 0.8 };
  },
  async calistir(slots, ctx) {
    const f = platformFn(ctx, 'sistemBilgisi');
    if (!f) return desteklenmiyor();
    let b;
    try {
      b = await f();
    } catch (e) {
      return { yanit: 'Sistem bilgisini alamadım.', adimlar: [adim('Sistem bilgisi okunuyor', 'hata')] };
    }
    b = b || {};
    const p = [];
    if (slots.pil) {
      if (typeof b.pilYuzde === 'number') p.push(`Pil yüzde ${Math.round(b.pilYuzde)}` + (b.sarjda === true ? ', şarjda' : b.sarjda === false ? ', şarjda değil' : ''));
      else p.push('Pil bilgisi yok');
    }
    if (slots.bellek) {
      if (typeof b.bellekKullanimYuzde === 'number') p.push(`bellek kullanımı yüzde ${Math.round(b.bellekKullanimYuzde)}`);
      else p.push('bellek bilgisi yok');
    }
    if (slots.pil && slots.bellek && b.cpuAdi) p.push(`işlemci: ${b.cpuAdi}`);
    const yanit = p.join('; ');
    return { yanit: yanit.charAt(0).toUpperCase() + yanit.slice(1) + '.', adimlar: [adim('Sistem bilgisi okunuyor')] };
  },
};
