'use strict';
// Hatırlatıcı: tarih/saat hesabı tamamen kodla yapılır (ctx.simdi tabanlı).
const { sayiMi } = require('../turkce');
const { sureKos, gunBasi, zamanYaz, depoVar, adim } = require('./_yardimci');

const ANAHTAR = 'hatirlaticilar';
const HAFTA = [['pazartesi', 1], ['cumartesi', 6], ['carsamba', 3], ['persembe', 4], ['sali', 2], ['cuma', 5], ['pazar', 0]];
const SONEK = new Set(['da', 'de', 'ta', 'te']);
const DOLGU = new Set(['diye', 'bana', 'beni', 'lutfen', 'ki', 'kur', 'ekle', 'olustur', 'benim', 'icin', 'misin', 'mi', 'sunu', 'bunu', 'yap']);

function haftaGunu(n) {
  for (const [ad, idx] of HAFTA) if (n === ad || (n.startsWith(ad) && n.length <= ad.length + 4)) return idx;
  return -1;
}

function tarihKur(simdi, ofset, saat, dak) {
  return new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() + ofset, saat, dak, 0, 0);
}

// -> { tarih, kul } | { gecmis:true } | null
function zamanCoz(tk, simdi) {
  const t = tk.map((x) => x.n);
  const kul = new Set();

  for (let i = 0; i < t.length; i++) {
    const r = sureKos(t, i);
    if (r.saniye > 0 && t[r.son] === 'sonra') {
      for (let j = i; j <= r.son; j++) kul.add(j);
      return { tarih: new Date(simdi.getTime() + r.saniye * 1000), kul };
    }
  }

  let gun = null;
  let hedef = -1;
  let donem = null;
  let saat = null;
  let dak = 0;
  for (let i = 0; i < t.length; i++) {
    const n = t[i];
    if (n === 'bugun') { gun = 0; kul.add(i); }
    else if (n === 'yarin') { gun = 1; kul.add(i); }
    else if ((n === 'obur' || n === 'ertesi') && t[i + 1] === 'gun') { gun = n === 'obur' ? 2 : 1; kul.add(i); kul.add(i + 1); }
    else if (haftaGunu(n) >= 0) { hedef = haftaGunu(n); kul.add(i); }
    else if (/^sabah/.test(n)) { donem = 'sabah'; kul.add(i); }
    else if (/^ogleden$/.test(n)) { donem = 'ogledensonra'; kul.add(i); if (t[i + 1] === 'sonra') kul.add(i + 1); }
    else if (/^ogle/.test(n)) { donem = 'ogle'; kul.add(i); }
    else if (/^aksam/.test(n)) { donem = 'aksam'; kul.add(i); }
    else if (n === 'gece' || n === 'geceleyin') { donem = 'gece'; kul.add(i); }
    else if (saat === null && /^\d{1,2}:\d{2}$/.test(n)) {
      const [h, m] = n.split(':').map(Number);
      saat = h; dak = m; kul.add(i);
      if (t[i - 1] === 'saat') kul.add(i - 1);
      if (SONEK.has(t[i + 1])) kul.add(i + 1);
    } else if (saat === null && n === 'saat' && sayiMi(t[i + 1] || '')) {
      const v = Number(t[i + 1]);
      saat = Math.floor(v); dak = v % 1 ? 30 : 0; kul.add(i); kul.add(i + 1);
      if (SONEK.has(t[i + 2])) kul.add(i + 2);
    } else if (saat === null && sayiMi(n) && SONEK.has(t[i + 1] || '')) {
      const v = Number(n);
      saat = Math.floor(v); dak = v % 1 ? 30 : 0; kul.add(i); kul.add(i + 1);
    }
  }

  if (saat === null && donem === null && gun === null && hedef < 0) return null;
  if (saat !== null && (saat < 0 || saat > 24 || dak > 59)) return null;
  if (saat === 24) saat = 0;

  if (saat === null) {
    const varsayilan = { sabah: 9, ogle: 12, ogledensonra: 14, aksam: 19, gece: 22 };
    if (donem) saat = varsayilan[donem];
    else if (gun === 0) return null;
    else saat = 9;
    dak = 0;
  } else if (saat < 12) {
    if ((donem === 'aksam' || donem === 'ogledensonra') || (donem === 'gece' && saat >= 6)) saat += 12;
    else if (donem === 'ogle' && saat <= 5) saat += 12;
  } else if (saat === 12 && donem === 'gece') saat = 0;

  const bugunSaat = tarihKur(simdi, 0, saat, dak);
  let ofset;
  if (gun !== null) ofset = gun;
  else if (hedef >= 0) {
    ofset = (hedef - simdi.getDay() + 7) % 7;
    if (ofset === 0 && bugunSaat <= simdi) ofset = 7;
  } else ofset = bugunSaat <= simdi ? 1 : 0;

  const tarih = tarihKur(simdi, ofset, saat, dak);
  if (tarih <= simdi) return { gecmis: true };
  return { tarih, kul };
}

function icerikCikar(tk, kul) {
  const parca = [];
  tk.forEach((x, i) => {
    if (kul.has(i)) return;
    if (x.n.startsWith('hatirla')) return;
    if (DOLGU.has(x.n)) return;
    if (/^[+\-*/()%^=]$/.test(x.n)) return;
    parca.push(x.h);
  });
  return parca.join(' ').trim();
}

module.exports = {
  ad: 'hatirlatici',
  aciklama: 'Hatırlatıcı kurar ve listeler',
  ornekler: ["yarın 9'da su iç diye hatırlat", '10 dakika sonra çamaşırı hatırlat', 'hatırlatıcılarımı göster'],
  eslestir(norm, bilgi) {
    const t = norm.split(' ');
    if (!t.some((x) => x.startsWith('hatirla'))) return null;
    if (t.some((x) => /^(sayac|zamanlayici)/.test(x))) return null;
    const tk = (bilgi && bilgi.tokenlar) || [];
    if (t.some((x) => x.startsWith('hatirlaticilar'))) return { slots: { islem: 'listele' }, guven: 0.85 };
    return { slots: { islem: 'ekle', tk }, guven: 0.85 };
  },
  async calistir(slots, ctx) {
    if (!depoVar(ctx)) return { yanit: 'Bu cihazda hatırlatıcı kaydı desteklenmiyor.', adimlar: [] };
    const simdi = ctx.simdi();
    const liste = ctx.depo.oku(ANAHTAR);
    const kayitlar = Array.isArray(liste) ? liste : [];

    if (slots.islem === 'listele') {
      const bekleyen = kayitlar.filter((k) => !k.tamam && new Date(k.zaman) > simdi)
        .sort((a, b) => new Date(a.zaman) - new Date(b.zaman)).slice(0, 8);
      if (!bekleyen.length) return { yanit: 'Bekleyen hatırlatıcın yok.', adimlar: [] };
      return {
        yanit: 'Hatırlatıcılar: ' + bekleyen.map((k) => `${zamanYaz(new Date(k.zaman), simdi)} ${k.metin}`).join('; ') + '.',
        adimlar: [],
      };
    }

    const tk = slots.tk || [];
    const z = zamanCoz(tk, simdi);
    if (z && z.gecmis) return { yanit: 'Bu saat geçmiş görünüyor; ileri bir zaman söyler misin?', adimlar: [] };
    if (!z) return { yanit: 'Ne zaman hatırlatayım? Örneğin “yarın 9’da su iç diye hatırlat”.', adimlar: [] };
    const metin = icerikCikar(tk, z.kul).slice(0, 500);
    if (!metin) return { yanit: 'Neyi hatırlatayım?', adimlar: [] };

    const id = kayitlar.reduce((m, k) => Math.max(m, k.id || 0), 0) + 1;
    const kayit = { id, zaman: z.tarih.toISOString(), metin, tamam: false };
    ctx.depo.yaz(ANAHTAR, kayitlar.concat([kayit]));
    return {
      yanit: `Tamam, ${zamanYaz(z.tarih, simdi)} için hatırlatacağım: ${metin}.`,
      adimlar: [adim('Hatırlatıcı kaydedildi')],
      eylem: { tip: 'hatirlatici', id, zaman: kayit.zaman, metin },
    };
  },
  _zamanCoz: zamanCoz,
  _gunBasi: gunBasi,
};
