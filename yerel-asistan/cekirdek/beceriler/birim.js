'use strict';
// Birim dönüşümü ve KDV: tamamen çevrimdışı, sabit tablo. Kur (döviz) bilerek yok.
const { sayiMi } = require('../turkce');
const { sayiYaz } = require('./_yardimci');

// Taban birime çarpan: uzunluk -> metre, kütle -> gram, hacim -> litre, süre -> saniye, alan -> m²
const BIRIM = {
  milimetre: ['uzunluk', 0.001, 'milimetre'], mm: ['uzunluk', 0.001, 'milimetre'],
  santimetre: ['uzunluk', 0.01, 'santimetre'], santim: ['uzunluk', 0.01, 'santimetre'], cm: ['uzunluk', 0.01, 'santimetre'],
  metre: ['uzunluk', 1, 'metre'], m: ['uzunluk', 1, 'metre'],
  kilometre: ['uzunluk', 1000, 'kilometre'], km: ['uzunluk', 1000, 'kilometre'],
  inc: ['uzunluk', 0.0254, 'inç'], inch: ['uzunluk', 0.0254, 'inç'],
  fit: ['uzunluk', 0.3048, 'fit'], feet: ['uzunluk', 0.3048, 'fit'], foot: ['uzunluk', 0.3048, 'fit'],
  yarda: ['uzunluk', 0.9144, 'yarda'], mil: ['uzunluk', 1609.344, 'mil'],
  miligram: ['kutle', 0.001, 'miligram'], mg: ['kutle', 0.001, 'miligram'],
  gram: ['kutle', 1, 'gram'], gr: ['kutle', 1, 'gram'], g: ['kutle', 1, 'gram'],
  kilogram: ['kutle', 1000, 'kilogram'], kilo: ['kutle', 1000, 'kilogram'], kg: ['kutle', 1000, 'kilogram'],
  ton: ['kutle', 1e6, 'ton'], libre: ['kutle', 453.59237, 'libre'], pound: ['kutle', 453.59237, 'libre'], ons: ['kutle', 28.349523125, 'ons'],
  mililitre: ['hacim', 0.001, 'mililitre'], ml: ['hacim', 0.001, 'mililitre'], litre: ['hacim', 1, 'litre'], lt: ['hacim', 1, 'litre'], l: ['hacim', 1, 'litre'],
  bardak: ['hacim', 0.2, 'bardak'], galon: ['hacim', 3.785411784, 'galon'],
  saniye: ['sure', 1, 'saniye'], sn: ['sure', 1, 'saniye'], dakika: ['sure', 60, 'dakika'], dk: ['sure', 60, 'dakika'],
  saat: ['sure', 3600, 'saat'], gun: ['sure', 86400, 'gün'], hafta: ['sure', 604800, 'hafta'],
  metrekare: ['alan', 1, 'metrekare'], m2: ['alan', 1, 'metrekare'], donum: ['alan', 1000, 'dönüm'], dekar: ['alan', 1000, 'dekar'], hektar: ['alan', 10000, 'hektar'],
};
const SICAKLIK = { celsius: 'c', santigrat: 'c', derece: 'c', c: 'c', fahrenheit: 'f', fahrenhayt: 'f', f: 'f', kelvin: 'k', k: 'k' };
const SICAKLIK_AD = { c: 'santigrat', f: 'fahrenheit', k: 'kelvin' };
const EK = /^(i|u|un|in|nin|nun|si|ye|ya|e|a|den|dan|ten|tan|de|da|te|ta|lik|lık|luk)$/;

function birimCoz(x) {
  if (Object.prototype.hasOwnProperty.call(BIRIM, x)) return x;
  // Türkçe ek toleransı: "metreye", "santime", "kilometreden" -> kök dene
  for (let k = x.length - 1; k >= 2; k--) {
    const kok = x.slice(0, k);
    if (Object.prototype.hasOwnProperty.call(BIRIM, kok) && EK.test(x.slice(k))) return kok;
  }
  return null;
}
function sicaklikCoz(x) {
  if (Object.prototype.hasOwnProperty.call(SICAKLIK, x)) return SICAKLIK[x];
  for (let k = x.length - 1; k >= 1; k--) {
    const kok = x.slice(0, k);
    if (Object.prototype.hasOwnProperty.call(SICAKLIK, kok) && EK.test(x.slice(k))) return SICAKLIK[kok];
  }
  return null;
}
function sicaklik(deger, kaynak, hedef) {
  const c = kaynak === 'c' ? deger : kaynak === 'f' ? (deger - 32) * 5 / 9 : deger - 273.15;
  return hedef === 'c' ? c : hedef === 'f' ? c * 9 / 5 + 32 : c + 273.15;
}

// "<sayı> <birim> kaç <birim>" | "<sayı> <birim> <birim>e çevir" | "<sayı> <birim> <birim> olarak"
function donusumCoz(n) {
  let deger = null;
  const birimler = [];
  const sicakliklar = [];
  for (let i = 0; i < n.length; i++) {
    const x = n[i];
    if (sayiMi(x) && deger === null) { deger = Number(x); continue; }
    const b = birimCoz(x);
    if (b) { birimler.push(b); continue; }
    const t = sicaklikCoz(x);
    if (t && deger !== null) sicakliklar.push(t);
  }
  if (deger === null) return null;
  if (sicakliklar.length === 2 && !birimler.length) return { tip: 'sicaklik', deger, kaynak: sicakliklar[0], hedef: sicakliklar[1] };
  if (birimler.length !== 2) return null;
  const [k, h] = birimler;
  if (k === h) return null;
  if (BIRIM[k][0] !== BIRIM[h][0]) return { tip: 'uyumsuz', k, h };
  return { tip: 'birim', deger, k, h };
}

// KDV: "yüzde 18 kdv 250 lira" (KDV dahil tutar), "250 liranın kdv'si yüzde 20" (yalnız KDV), "250 lira kdv hariç/dahil"
function kdvCoz(n) {
  if (!n.some((x) => /^kdv/.test(x))) return null;
  const sayilar = n.filter((x) => sayiMi(x)).map(Number);
  let oran = 20;
  let tutar = null;
  const yi = n.indexOf('yuzde');
  if (yi >= 0 && sayiMi(n[yi + 1] || '')) { oran = Number(n[yi + 1]); tutar = sayilar.find((s) => s !== oran); }
  else if (n.includes('%')) { const pi = n.indexOf('%'); if (sayiMi(n[pi - 1] || '')) { oran = Number(n[pi - 1]); tutar = sayilar.find((s) => s !== oran); } }
  else tutar = sayilar[0];
  if (tutar === undefined || tutar === null) return null;
  if (!(oran > 0 && oran < 100)) return null;
  const yalnizKdv = n.some((x) => /^kdv(si|i)$/.test(x)) || n.includes('tutari');
  const haric = n.includes('haric') || n.includes('ayir') || n.includes('cikar');
  return { tip: 'kdv', tutar, oran, mod: yalnizKdv ? 'kdv' : haric ? 'haric' : 'dahil' };
}

module.exports = {
  ad: 'birim',
  aciklama: 'Birim dönüşümü ve KDV hesabı (çevrimdışı)',
  ornekler: ['3 metre kaç santim', '100 fahrenheit kaç derece', 'yüzde 20 KDV 250 lira', '5 kilo kaç gram'],
  eslestir(norm) {
    const n = norm.split(' ').filter(Boolean);
    if (n.some((x) => /^(sayac|zamanlayici|hatirlat|alarm|sonra|once|hangi)$/.test(x) || /^(sayac|zamanlayici|hatirlat|alarm)/.test(x))) return null;
    const kdv = kdvCoz(n);
    if (kdv) return { slots: kdv, guven: 0.92 };
    const d = donusumCoz(n);
    if (!d) return null;
    return { slots: d, guven: d.tip === 'uyumsuz' ? 0.7 : 0.92 };
  },
  async calistir(s) {
    if (s.tip === 'uyumsuz') return { yanit: `${BIRIM[s.k][2]} ile ${BIRIM[s.h][2]} aynı türden değil, çeviremem.`, adimlar: [] };
    if (s.tip === 'sicaklik') {
      const v = sicaklik(s.deger, s.kaynak, s.hedef);
      return { yanit: `${sayiYaz(s.deger)} ${SICAKLIK_AD[s.kaynak]} = ${sayiYaz(Math.round(v * 100) / 100)} ${SICAKLIK_AD[s.hedef]}.`, adimlar: [], eylem: { tip: 'hesap', sonuc: v } };
    }
    if (s.tip === 'kdv') {
      const kdv = s.tutar * s.oran / 100;
      const yaz = (x) => sayiYaz(Math.round(x * 100) / 100);
      if (s.mod === 'kdv') return { yanit: `${yaz(s.tutar)} liranın yüzde ${s.oran} KDV'si ${yaz(kdv)} lira.`, adimlar: [], eylem: { tip: 'hesap', sonuc: kdv } };
      if (s.mod === 'haric') {
        const net = s.tutar / (1 + s.oran / 100);
        return { yanit: `${yaz(s.tutar)} liranın KDV hariç tutarı ${yaz(net)} lira (KDV ${yaz(s.tutar - net)} lira).`, adimlar: [], eylem: { tip: 'hesap', sonuc: net } };
      }
      return { yanit: `${yaz(s.tutar)} lira + yüzde ${s.oran} KDV = ${yaz(s.tutar + kdv)} lira (KDV ${yaz(kdv)} lira).`, adimlar: [], eylem: { tip: 'hesap', sonuc: s.tutar + kdv } };
    }
    const v = s.deger * BIRIM[s.k][1] / BIRIM[s.h][1];
    const yuvarlak = Math.abs(v) >= 1 ? Math.round(v * 1000) / 1000 : parseFloat(v.toPrecision(4));
    return { yanit: `${sayiYaz(s.deger)} ${BIRIM[s.k][2]} = ${sayiYaz(yuvarlak)} ${BIRIM[s.h][2]}.`, adimlar: [], eylem: { tip: 'hesap', sonuc: v } };
  },
};
