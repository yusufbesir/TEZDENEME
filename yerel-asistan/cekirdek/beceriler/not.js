'use strict';
const { sayiMi } = require('../turkce');
const { depoVar, adim } = require('./_yardimci');

const ANAHTAR = 'notlar';
const NOT = new Set(['not', 'notu', 'notum']);
const NOTLAR = new Set(['notlar', 'notlari', 'notlarim', 'notlarimi', 'notlarin', 'notlarini']);
const EKLE = new Set(['al', 'ekle', 'yaz', 'kaydet', 'tut', 'et']);
const OKU = new Set(['oku', 'goster', 'listele', 'soyle', 'neler', 'ne', 'var', 'nedir', 'sirala']);
const DOLGU = new Set(['sunu', 'bunu', 'bana', 'benim', 'icin', 'lutfen', 'diye', 'defterine', 'deftere', 'kaydi']);

module.exports = {
  ad: 'not',
  aciklama: 'Not ekler, listeler ve okur',
  ornekler: ['not al süt almayı unutma', 'notlarımı listele', 'son notu oku'],
  eslestir(norm, bilgi) {
    const tk = (bilgi && bilgi.tokenlar) || norm.split(' ').map((n) => ({ n, h: n, o: n }));
    const n = tk.map((x) => x.n);
    if (n.some((x) => /^(hatirlat|sayac|zamanlayici)/.test(x))) return null;
    if (n.some((x) => NOTLAR.has(x))) return { slots: { islem: 'listele' }, guven: 0.85 };
    const ni = n.findIndex((x) => NOT.has(x));
    if (ni < 0) return null;
    if (n.some((x) => x === 'defteri' || x === 'defterini' || x === 'defter')) return null;
    if (n.includes('oku') || n.includes('goster')) {
      const sayi = n.find((x) => sayiMi(x));
      if (n.includes('son')) return { slots: { islem: 'oku', hangi: 'son' }, guven: 0.85 };
      if (sayi) return { slots: { islem: 'oku', hangi: Number(sayi) }, guven: 0.85 };
      return { slots: { islem: 'listele' }, guven: 0.8 };
    }
    // ekleme
    const vi = n.findIndex((x, i) => EKLE.has(x) && Math.abs(i - ni) <= 1);
    if (vi < 0) return null;
    const atla = new Set([ni, vi]);
    let sonra = tk.filter((x, i) => i > Math.max(ni, vi) && !DOLGU.has(x.n));
    let icerik;
    if (sonra.length) icerik = sonra.map((x) => x.h).join(' ');
    else {
      icerik = tk.filter((x, i) => !atla.has(i) && !DOLGU.has(x.n)).map((x) => x.h).join(' ');
    }
    return { slots: { islem: 'ekle', metin: icerik.trim().slice(0, 2000) }, guven: 0.85 };
  },
  async calistir(slots, ctx) {
    if (!depoVar(ctx)) return { yanit: 'Bu cihazda not kaydı desteklenmiyor.', adimlar: [] };
    const l = ctx.depo.oku(ANAHTAR);
    const notlar = Array.isArray(l) ? l : [];

    if (slots.islem === 'ekle') {
      if (!slots.metin) return { yanit: 'Neyi not alayım?', adimlar: [] };
      const id = notlar.reduce((m, k) => Math.max(m, k.id || 0), 0) + 1;
      ctx.depo.yaz(ANAHTAR, notlar.concat([{ id, metin: slots.metin, zaman: ctx.simdi().toISOString() }]));
      return { yanit: `Not aldım: ${slots.metin}`, adimlar: [adim('Not kaydedildi')], eylem: { tip: 'not', id } };
    }
    if (!notlar.length) return { yanit: 'Henüz kayıtlı notun yok.', adimlar: [] };
    if (slots.islem === 'oku') {
      const k = slots.hangi === 'son' ? notlar[notlar.length - 1] : notlar.find((x) => x.id === slots.hangi);
      if (!k) return { yanit: 'Bu numarada bir not bulamadım.', adimlar: [] };
      return { yanit: `Not ${k.id}: ${k.metin}`, adimlar: [] };
    }
    const son = notlar.slice(-10);
    return { yanit: `${notlar.length} notun var: ` + son.map((k) => `${k.id}) ${k.metin}`).join('; '), adimlar: [] };
  },
};
