'use strict';
// Test yardımcıları (test dosyası değil; node --test klasör taramasında yalnızca *.test.js çalışır).
const { calistir } = require('../../cekirdek/asistan');

// 2026-10-16 Cuma 10:30 (yerel saat)
const SIMDI = new Date(2026, 9, 16, 10, 30, 0);

function bellekDepo() {
  const m = new Map();
  return { oku: (k) => (m.has(k) ? JSON.parse(m.get(k)) : undefined), yaz: (k, v) => m.set(k, JSON.stringify(v)) };
}

// Çağrıları kaydeden sahte platform
function sahtePlatform(ek) {
  const cagri = [];
  const p = {
    cagri,
    uygulamaAc: async (ad) => { cagri.push(['uygulamaAc', ad]); },
    urlAc: async (url) => { cagri.push(['urlAc', url]); },
    sesAyarla: async (o) => { cagri.push(['sesAyarla', o]); },
    sesKapatAc: async () => { cagri.push(['sesKapatAc']); return { sessiz: true }; },
    ekranGoruntusu: async () => { cagri.push(['ekranGoruntusu']); return { yol: 'C:/x/ekran.png' }; },
    dosyaAra: async (q, o) => { cagri.push(['dosyaAra', q, o]); return ['C:/uzun/yol/rapor-son.docx', 'C:/rapor.docx']; },
    panoOku: async () => 'kopyalanan metin',
    panoYaz: async (m) => { cagri.push(['panoYaz', m]); },
    kilitle: async () => { cagri.push(['kilitle']); },
    sistemBilgisi: async () => ({ pilYuzde: 80, sarjda: false, bellekKullanimYuzde: 55, cpuAdi: 'X' }),
  };
  return Object.assign(p, ek || {});
}

function ctxYap(ek) {
  return Object.assign({ simdi: () => new Date(SIMDI.getTime()), depo: bellekDepo(), platform: sahtePlatform() }, ek || {});
}

module.exports = { calistir, SIMDI, bellekDepo, sahtePlatform, ctxYap };
