'use strict';
// Beceriler arası ortak yardımcılar (beceri değildir; index.js'e girmez).
const { sayiMi } = require('../turkce');

const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const BIRIM = { saniye: 1, sn: 1, dakika: 60, dk: 60, saat: 3600, gun: 86400 };

const pad = (n) => String(n).padStart(2, '0');
const saatYaz = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
const tarihYaz = (d) => `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}, ${GUNLER[d.getDay()]}`;
const gunBasi = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const gunFarki = (a, b) => Math.round((gunBasi(a) - gunBasi(b)) / 864e5);

function zamanYaz(d, simdi) {
  const f = gunFarki(d, simdi);
  const gun = f === 0 ? 'bugün' : f === 1 ? 'yarın' : `${d.getDate()} ${AYLAR[d.getMonth()]} ${GUNLER[d.getDay()]}`;
  return `${gun} ${saatYaz(d)}`;
}

function desteklenmiyor() {
  return { yanit: 'Bu cihazda desteklenmiyor.', adimlar: [] };
}

function platformFn(ctx, ad) {
  const p = ctx && ctx.platform;
  return p && typeof p[ad] === 'function' ? p[ad].bind(p) : null;
}

function depoVar(ctx) {
  return !!(ctx && ctx.depo && typeof ctx.depo.oku === 'function' && typeof ctx.depo.yaz === 'function');
}

function sayiYaz(x) {
  if (!Number.isFinite(x)) return String(x);
  if (Number.isInteger(x) && Math.abs(x) < 1e15) return String(x);
  return String(parseFloat(x.toPrecision(12))).replace('.', ',');
}

function sureYaz(saniye) {
  const s = Math.round(saniye);
  const sa = Math.floor(s / 3600);
  const dk = Math.floor((s % 3600) / 60);
  const sn = s % 60;
  const p = [];
  if (sa) p.push(`${sa} saat`);
  if (dk) p.push(`${dk} dakika`);
  if (sn || !p.length) p.push(`${sn} saniye`);
  return p.join(' ');
}

// t: normal belirteç dizisi. i'den ardışık "<sayı> <birim>" çiftlerini toplar.
function sureKos(t, i) {
  let saniye = 0;
  let j = i;
  while (j + 1 < t.length && sayiMi(t[j]) && Object.prototype.hasOwnProperty.call(BIRIM, t[j + 1])) {
    saniye += Number(t[j]) * BIRIM[t[j + 1]];
    j += 2;
  }
  return { saniye, son: j };
}

function sureCoz(t) {
  let toplam = 0;
  const kul = new Set();
  for (let i = 0; i < t.length;) {
    const r = sureKos(t, i);
    if (r.son > i) {
      toplam += r.saniye;
      for (let k = i; k < r.son; k++) kul.add(k);
      i = r.son;
    } else i++;
  }
  return { saniye: toplam, kul };
}

function adim(etiket, durum) {
  return { etiket, durum: durum || 'bitti' };
}

module.exports = {
  GUNLER, AYLAR, pad, saatYaz, tarihYaz, gunBasi, gunFarki, zamanYaz, desteklenmiyor, platformFn,
  depoVar, sayiYaz, sureYaz, sureKos, sureCoz, adim,
};
