'use strict';
// Anlaşılmayan komut için yakın beceri örneği önerir ("Şunu mu demek istedin?").
// Bağımlılık yok; yalnızca belirteç benzerliği (Türkçe ekleri tolere etmek için ilk 4 harf).
const { normallestir } = require('./turkce');

const ESIK = 0.34;
const DOLGU = new Set(['bana', 'lutfen', 'bir', 'su', 'bu', 'o', 've', 'ile', 'misin', 'misiniz', 'ya', 'da', 'de', 'ki', 'piril', 'hadi']);

function kokler(norm) {
  return new Set(norm.split(' ').filter((x) => x && !DOLGU.has(x)).map((x) => (/^\d/.test(x) ? '#' : x.slice(0, 4))));
}

function benzerlik(a, b) {
  if (!a.size || !b.size) return 0;
  let ortak = 0;
  for (const x of a) if (b.has(x)) ortak++;
  return ortak / (a.size + b.size - ortak);
}

// Her becerinin en iyi örneğini puanlar; dönüş: en iyi 3 aday [{ ornek, ad, puan }] (puanı eşiği geçenler önce).
function adaylar(metin, beceriler) {
  const g = kokler(normallestir(metin));
  const liste = [];
  for (const b of beceriler || []) {
    if (!Array.isArray(b.ornekler) || !b.ornekler.length) continue;
    let en = null;
    for (const o of b.ornekler) {
      const p = benzerlik(g, kokler(normallestir(o)));
      if (!en || p > en.puan) en = { ornek: o, ad: b.ad, puan: p };
    }
    liste.push(en);
  }
  liste.sort((x, y) => y.puan - x.puan);
  return liste.slice(0, 3);
}

function oneriBul(metin, beceriler) {
  // Yalnız sayı/işaretten oluşan girdi için öneri yapılmaz (örnek listesi yeter).
  if (![...kokler(normallestir(metin))].some((k) => k !== '#')) return null;
  const a = adaylar(metin, beceriler);
  return a.length && a[0].puan >= ESIK ? a[0] : null;
}

// Anlaşılmadığında gösterilecek üç örnek: önce yakın adaylar, kalanı farklı becerilerden sabit sırayla.
function ornekler(metin, beceriler, sabit) {
  const secim = [];
  const gorulen = new Set();
  const ekle = (ornek, ad) => { if (ornek && !gorulen.has(ad)) { gorulen.add(ad); secim.push(ornek); } };
  for (const a of adaylar(metin, beceriler)) if (a.puan > 0) ekle(a.ornek, a.ad);
  for (const ad of sabit || []) {
    if (secim.length >= 3) break;
    const b = (beceriler || []).find((x) => x.ad === ad);
    if (b) ekle(b.ornekler[0], ad);
  }
  return secim.slice(0, 3);
}

module.exports = { ESIK, kokler, benzerlik, adaylar, oneriBul, ornekler };
