'use strict';
const { desteklenmiyor, platformFn, adim } = require('./_yardimci');

const DOLGU = new Set(['ara', 'arastir', 'bul', 'adli', 'isimli', 'bilgisayarda', 'bilgisayarimda', 'bilgisayardan', 'pcde', 'bana',
  'lutfen', 'icinde', 'gecen', 'misin', 'var', 'mi', 'mu']);

module.exports = {
  ad: 'dosya-ara',
  aciklama: 'Bilgisayarda dosya arar',
  // Telefondan gelen komutta yalnızca bilgisayarda uzaktan kontrol açıkken çalışır (asistan.js uygular).
  uzakKontrolGerekli: true,
  ornekler: ['dosya ara rapor', 'fatura adlı dosyayı bul', 'bilgisayarda tez dosyasını ara'],
  platformGerekli: ['dosyaAra'],
  eslestir(norm, bilgi) {
    const n = norm.split(' ');
    if (!n.some((x) => /^dosya/.test(x))) return null;
    if (!n.some((x) => ['ara', 'arastir', 'bul'].includes(x))) return null;
    const tk = (bilgi && bilgi.tokenlar) || n.map((x) => ({ n: x, h: x }));
    const sorgu = tk.filter((x) => !/^dosya/.test(x.n) && !DOLGU.has(x.n)).map((x) => x.h).join(' ').trim().slice(0, 100);
    return { slots: { sorgu }, guven: 0.9 };
  },
  async calistir(slots, ctx) {
    if (!slots.sorgu) return { yanit: 'Hangi dosyayı arayayım?', adimlar: [] };
    const ara = platformFn(ctx, 'dosyaAra');
    if (!ara) return desteklenmiyor();
    const adimlar = [adim('Komut çözümleniyor')];
    let sonuc;
    try {
      sonuc = await ara(slots.sorgu, { en_cok: 5 });
      adimlar.push(adim('Dosyalar aranıyor'));
    } catch (e) {
      adimlar.push(adim('Dosyalar aranıyor', 'hata'));
      return { yanit: 'Dosya aramasında bir hata oldu.', adimlar };
    }
    const yollar = (Array.isArray(sonuc) ? sonuc : []).filter((y) => typeof y === 'string')
      .sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, 5);
    adimlar.push(adim('Sonuçlar sıralanıyor'));
    if (!yollar.length) return { yanit: `“${slots.sorgu}” için dosya bulamadım.`, adimlar };
    return {
      yanit: `${yollar.length} dosya buldum: ` + yollar.join('; '),
      adimlar,
      eylem: { tip: 'dosyaListesi', yollar },
    };
  },
};
