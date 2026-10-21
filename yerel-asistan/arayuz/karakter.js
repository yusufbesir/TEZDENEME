/* Pırıl: özgün 16x16 piksel karakter. SVG, rect'lerle JS'te üretilir (harici görsel yok).
   Tarayıcıda window.PirilKarakter, Node'da module.exports. */
(function (kok, fabrika) {
  const k = fabrika();
  if (typeof module === 'object' && module.exports) module.exports = k;
  else kok.PirilKarakter = k;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BOYUT = 16;
  const DURUMLAR = ['bekliyor', 'dinliyor', 'dusunuyor', 'calisiyor', 'bitti', 'hata'];

  const RENK = {
    T: '#5fd4c8', // gövde (yumuşak turkuaz)
    D: '#1d6f73', // kontur
    L: '#a9efe6', // açık karın
    W: '#ffffff', // göz akı
    P: '#14343a', // gözbebeği
    K: '#ff9fb0', // yanak
    A: '#f2b84b', // dalga / kıvılcım
    Y: '#6cb8ff', // gözyaşı
    G: '#8a9ba8', // düşünce baloncuğu
  };

  // Gövde: 16 satır x 16 sütun. '.' boş.
  const GOVDE = [
    '................',
    '..DD........DD..',
    '..DTD......DTD..',
    '..DTTDDDDDDTTD..',
    '.DTTTTTTTTTTTTD.',
    '.DTTTTTTTTTTTTD.',
    '.DTTTTTTTTTTTTD.',
    '.DTTTTTTTTTTTTD.',
    '.DTTTTTTTTTTTTD.',
    '.DTTLLLLLLLLTTD.',
    '.DTTLLLLLLLLTTD.',
    '.DTTLLLLLLLLTTD.',
    '..DTTTTTTTTTTD..',
    '..DDTTTTTTTTDD..',
    '...DDD....DDD...',
    '................',
  ];

  // Katmanlar: { satır: [ 'sütunBaşı', 'desen' ] } yerine tam 16 sütunluk satır desenleri,
  // yalnızca değişen satırlar verilir (diğerleri '.' sayılır).
  function katman(satirlar) {
    const k = Array.from({ length: BOYUT }, () => '.'.repeat(BOYUT));
    for (const [no, desen] of Object.entries(satirlar)) {
      if (desen.length !== BOYUT) throw new Error('Katman satırı 16 karakter olmalı: ' + no);
      k[Number(no)] = desen;
    }
    return k;
  }

  // Gözler (sol: sütun 3-6, sağ: sütun 9-12)
  const GOZ_ACIK = katman({
    4: '...WWWW..WWWW...',
    5: '...WPPW..WPPW...',
    6: '...WPPW..WPPW...',
    7: '...WWWW..WWWW...',
  });
  const GOZ_YUKARI = katman({
    4: '...WPPW..WPPW...',
    5: '...WPPW..WPPW...',
    6: '...WWWW..WWWW...',
    7: '...WWWW..WWWW...',
  });
  const GOZ_KISIK = katman({
    5: '...WWWW..WWWW...',
    6: '...PPPP..PPPP...',
    7: '...WWWW..WWWW...',
  });
  const GOZ_KAPALI = katman({
    6: '...DDDD..DDDD...',
  });
  const GOZ_MUTLU = katman({
    5: '....PP....PP....',
    6: '...P..P..P..P...',
  });
  const GOZ_UZGUN = katman({
    4: '...WWWW..WWWW...',
    5: '...WWWW..WWWW...',
    6: '...WPPW..WPPW...',
    7: '...WPPW..WPPW...',
  });

  const AGIZ_DUZ = katman({ 10: '......DDDD......' });
  const AGIZ_KUCUK = katman({ 10: '.......DD.......' });
  const AGIZ_GULEN = katman({
    9: '.....D....D.....',
    10: '......DDDD......',
  });
  const AGIZ_UZGUN = katman({
    9: '......DDDD......',
    10: '.....D....D.....',
  });
  const YANAK = katman({ 8: '..KK........KK..' });
  const GOZYASI = katman({ 8: '...Y............' });
  const KULAK_DALGA1 = katman({ 2: 'A..............A', 3: 'A..............A' });
  const KULAK_DALGA2 = katman({ 1: 'A..............A', 2: 'A..............A', 3: 'A..............A', 4: 'A..............A' });
  const DUSUNCE = katman({
    0: '..............G.',
    1: '............G...',
  });
  const KIVILCIM = katman({
    1: '.A..A.........A.',
  });

  // Satır satır desenden birleştirilmiş rect listesi: yatay ardışık aynı renkler tek rect.
  function rectler(katmanlar) {
    const izgara = Array.from({ length: BOYUT }, () => Array(BOYUT).fill('.'));
    for (const kat of katmanlar) {
      for (let y = 0; y < BOYUT; y++) {
        for (let x = 0; x < BOYUT; x++) {
          const h = kat[y][x];
          if (h !== '.') izgara[y][x] = h;
        }
      }
    }
    const liste = [];
    for (let y = 0; y < BOYUT; y++) {
      let x = 0;
      while (x < BOYUT) {
        const h = izgara[y][x];
        if (h === '.') { x++; continue; }
        let b = x + 1;
        while (b < BOYUT && izgara[y][b] === h) b++;
        liste.push({ x, y, w: b - x, h: 1, renk: RENK[h] });
        x = b;
      }
    }
    return liste;
  }

  function rectMetni(liste) {
    return liste
      .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.renk}"/>`)
      .join('');
  }

  function grup(sinif, katmanlar) {
    return `<g class="${sinif}">${rectMetni(rectler(katmanlar))}</g>`;
  }

  const ETIKET = {
    bekliyor: 'Pırıl bekliyor',
    dinliyor: 'Pırıl dinliyor',
    dusunuyor: 'Pırıl düşünüyor',
    calisiyor: 'Pırıl çalışıyor',
    bitti: 'Pırıl işi bitirdi',
    hata: 'Pırıl üzgün, bir sorun oldu',
  };

  // Durum başına katman düzeni.
  function duzen(durum) {
    switch (durum) {
      case 'dinliyor':
        return [
          ['k-yuz', [GOZ_ACIK, AGIZ_KUCUK]],
          ['k-dalga k-dalga1', [KULAK_DALGA1]],
          ['k-dalga k-dalga2', [KULAK_DALGA2]],
        ];
      case 'dusunuyor':
        return [
          ['k-yuz', [GOZ_YUKARI, AGIZ_DUZ]],
          ['k-dusunce', [DUSUNCE]],
        ];
      case 'calisiyor':
        return [
          ['k-yuz', [GOZ_KISIK, AGIZ_KUCUK]],
          ['k-kivilcim', [KIVILCIM]],
        ];
      case 'bitti':
        return [['k-yuz', [GOZ_MUTLU, AGIZ_GULEN, YANAK]]];
      case 'hata':
        return [['k-yuz', [GOZ_UZGUN, AGIZ_UZGUN, GOZYASI]]];
      case 'bekliyor':
      default:
        return [
          ['k-yuz k-goz-acik', [GOZ_ACIK, AGIZ_GULEN]],
          ['k-yuz k-goz-kapali', [GOZ_KAPALI, AGIZ_GULEN]],
        ];
    }
  }

  function gecerliDurum(d) {
    return DURUMLAR.includes(d) ? d : 'bekliyor';
  }

  function svgUret(durum) {
    const d = gecerliDurum(durum);
    const govde = grup('k-govde', [GOVDE]);
    const yuz = duzen(d).map(([sinif, katmanlar]) => {
      return grup(sinif, katmanlar);
    }).join('');
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOYUT} ${BOYUT}" ` +
      `shape-rendering="crispEdges" role="img" aria-label="${ETIKET[d]}" data-durum="${d}">` +
      `<title>${ETIKET[d]}</title>${govde}${yuz}</svg>`
    );
  }

  // Tarayıcı: kapsayıcıya karakteri yerleştirir ve durumunu değiştirir.
  function baglaKapsayici(kapsayici) {
    let simdiki = null;
    return {
      durumAyarla(d) {
        const g = gecerliDurum(d);
        if (g === simdiki) return;
        simdiki = g;
        kapsayici.innerHTML = svgUret(g);
        kapsayici.className = kapsayici.className
          .split(/\s+/).filter((c) => c && !c.startsWith('durum-')).concat('durum-' + g).join(' ');
      },
      durum() { return simdiki; },
    };
  }

  return { BOYUT, DURUMLAR, GOVDE, svgUret, rectler, baglaKapsayici, ETIKET };
});
