'use strict';
// Güvenli hesap: eval/Function YOK. Özyinelemeli iniş ayrıştırıcısı yalnızca sayı ve işleç belirteçlerini kabul eder.
const { sayiMi } = require('../turkce');
const { sayiYaz } = require('./_yardimci');

const OP = {
  '+': '+', arti: '+', '-': '-', eksi: '-', '*': '*', carpi: '*', kere: '*', kez: '*', x: '*',
  '/': '/', bolu: '/', bolumu: '/', '^': '^', uzeri: '^', ussu: '^', mod: 'mod',
};
const DOLGU = new Set(['kac', 'eder', 'nedir', 'kactir', 'hesapla', 'hesap', 'sonuc', 'sonucu', 'ne', 'esittir', '=',
  'bul', 'soyle', 'bana', 'lutfen', 'acaba', 'misin']);
const SONEK = new Set(['i', 'u', 'un', 'in', 'nin', 'nun', 'si', 'ini', 'unu', 'yi', 'yu', 'a', 'e', 'ya', 'ye']);
const AZAMI_BELIRTEC = 100;

class HesapHatasi extends Error {}

function degerlendir(t) {
  let p = 0;
  let derinlik = 0;
  const hata = (m) => { throw new HesapHatasi(m); };

  function ifade() {
    let v = terim();
    while (t[p] === '+' || t[p] === '-') {
      const o = t[p++];
      const r = terim();
      v = o === '+' ? v + r : v - r;
    }
    return v;
  }
  function terim() {
    let v = us();
    while (t[p] === '*' || t[p] === '/' || t[p] === 'mod') {
      const o = t[p++];
      const r = us();
      if (o === '*') v *= r;
      else {
        if (r === 0) hata('sifir');
        v = o === '/' ? v / r : v % r;
      }
    }
    return v;
  }
  function us() {
    if (t[p] === '-') { p++; return -us(); }
    if (t[p] === '+') { p++; return us(); }
    const b = birincil();
    if (t[p] === '^') {
      p++;
      const e = us();
      if (Math.abs(e) > 1000) hata('buyuk');
      return Math.pow(b, e);
    }
    return b;
  }
  function birincil() {
    if (++derinlik > 50) hata('derin');
    const s = t[p++];
    let v;
    if (s === undefined) hata('eksik');
    else if (sayiMi(s)) v = Number(s);
    else if (s === '(') {
      v = ifade();
      if (t[p++] !== ')') hata('parantez');
    } else if (s === 'karekok') {
      const a = us();
      if (a < 0) hata('negatif');
      v = Math.sqrt(a);
    } else hata('beklenmeyen');
    derinlik--;
    return v;
  }

  const v = ifade();
  if (p !== t.length) hata('artik');
  if (!Number.isFinite(v)) hata('sonsuz');
  return v;
}

function yuzdeDegerlendir(t) {
  // "N1 yuzde N2" (N1'in yüzde N2'si)  |  "yuzde N2 N1"
  if (t.length === 3 && sayiMi(t[0]) && t[1] === 'yuzde' && sayiMi(t[2])) return Number(t[0]) * Number(t[2]) / 100;
  if (t.length === 3 && t[0] === 'yuzde' && sayiMi(t[1]) && sayiMi(t[2])) return Number(t[2]) * Number(t[1]) / 100;
  throw new HesapHatasi('yuzde');
}

function hazirla(n) {
  const t = [];
  let bilinmeyen = false;
  for (let i = 0; i < n.length; i++) {
    const x = n[i];
    if (sayiMi(x)) t.push(x);
    else if (Object.prototype.hasOwnProperty.call(OP, x)) t.push(OP[x]);
    else if (x === '%') t.push('yuzde');
    else if (x === '(' || x === ')' || x === 'yuzde' || x === 'karekok') t.push(x);
    else if (DOLGU.has(x)) continue;
    else if (SONEK.has(x) && i > 0 && (sayiMi(n[i - 1]) || n[i - 1] === '%')) continue;
    else bilinmeyen = true;
  }
  return { t, bilinmeyen };
}

function hesapla(t) {
  if (t.includes('yuzde')) return yuzdeDegerlendir(t);
  return degerlendir(t);
}

module.exports = {
  ad: 'hesap',
  aciklama: 'Hesap yapar (dört işlem, yüzde, üs, karekök)',
  ornekler: ['on iki çarpı yedi', 'yüzde 15\'i 240', '100 bölü 8 kaç eder'],
  eslestir(norm) {
    const n = norm.split(' ').filter(Boolean);
    const anahtar = n.includes('hesapla');
    if (n.length > AZAMI_BELIRTEC) return anahtar ? { slots: { hata: 'uzun' }, guven: 0.9 } : null;
    const { t, bilinmeyen } = hazirla(n);
    const sayiVar = t.some((x) => sayiMi(x));
    const opVar = t.some((x) => ['+', '-', '*', '/', '^', 'mod', 'yuzde', 'karekok'].includes(x));
    if (bilinmeyen || !sayiVar || !opVar) {
      return anahtar ? { slots: { hata: 'anlasilmadi' }, guven: 0.9 } : null;
    }
    return { slots: { t }, guven: 0.9 };
  },
  async calistir(slots) {
    if (slots.hata) return { yanit: 'Bu işlemi güvenle hesaplayamadım. Örneğin “on iki çarpı yedi” de.', adimlar: [] };
    try {
      const v = hesapla(slots.t);
      if (!Number.isFinite(v)) throw new HesapHatasi('sonsuz');
      return { yanit: `Sonuç: ${sayiYaz(v)}`, adimlar: [], eylem: { tip: 'hesap', sonuc: v } };
    } catch (e) {
      if (e instanceof HesapHatasi) {
        return { yanit: e.message === 'sifir' ? 'Sıfıra bölemem.' : 'Bu işlemi hesaplayamadım.', adimlar: [] };
      }
      throw e;
    }
  },
};
