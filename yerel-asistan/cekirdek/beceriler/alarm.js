'use strict';
// Alarm: hatırlatıcıyla aynı kayıt listesini kullanır (tur:'alarm'); zaman çözümü hatirlatici._zamanCoz ile.
const hatirlatici = require('./hatirlatici');
const { zamanYaz, depoVar, adim } = require('./_yardimci');

const ANAHTAR = 'hatirlaticilar';
const IPTAL = new Set(['kapat', 'iptal', 'sil', 'kaldir', 'durdur']);
const LISTE = new Set(['goster', 'listele', 'neler', 'var', 'soyle']);

module.exports = {
  ad: 'alarm',
  aciklama: 'Alarm kurar, listeler, iptal eder',
  ornekler: ["sabah 7'ye alarm kur", 'alarm kur 6:30', 'alarmları göster', 'alarmı iptal et'],
  eslestir(norm, bilgi) {
    const t = norm.split(' ');
    if (!t.some((x) => /^alarm/.test(x))) return null;
    if (t.some((x) => /^(sayac|zamanlayici|hatirlat)/.test(x))) return null;
    const tk = (bilgi && bilgi.tokenlar) || [];
    if (t.some((x) => IPTAL.has(x))) return { slots: { islem: 'iptal' }, guven: 0.85 };
    if (t.some((x) => /^alarmlar/.test(x)) || t.some((x) => LISTE.has(x))) return { slots: { islem: 'listele' }, guven: 0.85 };
    return { slots: { islem: 'ekle', tk }, guven: 0.85 };
  },
  async calistir(slots, ctx) {
    if (!depoVar(ctx)) return { yanit: 'Bu cihazda alarm kaydı desteklenmiyor.', adimlar: [] };
    const simdi = ctx.simdi();
    const liste = ctx.depo.oku(ANAHTAR);
    const kayitlar = Array.isArray(liste) ? liste : [];
    const alarmlar = kayitlar.filter((k) => k.tur === 'alarm' && !k.tamam && new Date(k.zaman) > simdi)
      .sort((a, b) => new Date(a.zaman) - new Date(b.zaman));

    if (slots.islem === 'listele') {
      if (!alarmlar.length) return { yanit: 'Kurulu alarm yok.', adimlar: [] };
      return { yanit: 'Alarmlar: ' + alarmlar.map((k) => zamanYaz(new Date(k.zaman), simdi)).join('; ') + '.', adimlar: [] };
    }
    if (slots.islem === 'iptal') {
      if (!alarmlar.length) return { yanit: 'İptal edilecek alarm yok.', adimlar: [] };
      const ilk = alarmlar[0];
      ctx.depo.yaz(ANAHTAR, kayitlar.map((k) => (k.id === ilk.id ? Object.assign({}, k, { tamam: true }) : k)));
      return {
        yanit: `${zamanYaz(new Date(ilk.zaman), simdi)} alarmını iptal ettim.`,
        adimlar: [adim('Alarm iptal edildi')],
        eylem: { tip: 'alarm-iptal', id: ilk.id },
      };
    }
    const z = hatirlatici._zamanCoz(slots.tk || [], simdi);
    if (z && z.gecmis) return { yanit: 'Bu saat geçmiş görünüyor; ileri bir zaman söyler misin?', adimlar: [] };
    if (!z) return { yanit: 'Alarmı kaça kurayım? Örneğin “sabah 7’ye alarm kur”.', adimlar: [] };
    const id = kayitlar.reduce((m, k) => Math.max(m, k.id || 0), 0) + 1;
    const kayit = { id, zaman: z.tarih.toISOString(), metin: 'Alarm', tur: 'alarm', tamam: false };
    ctx.depo.yaz(ANAHTAR, kayitlar.concat([kayit]));
    return {
      yanit: `Alarmı ${zamanYaz(z.tarih, simdi)} için kurdum.`,
      adimlar: [adim('Alarm kaydedildi')],
      eylem: { tip: 'alarm', id, zaman: kayit.zaman },
    };
  },
};
