'use strict';
// Çekirdek için senkron JSON dosya deposu: oku(anahtar) / yaz(anahtar, deger). fs enjekte edilir.
// Atomik yazım (tmp + rename); prototip kirliliğine karşı Map; boyut sınırları.
const path = require('path');
const SINIR = Object.freeze({ ANAHTAR: 100, TOPLAM: 1 << 20 });

function depoOlustur(dosya, fs) {
  const harita = new Map();
  try {
    const ham = JSON.parse(fs.readFileSync(dosya, 'utf8'));
    if (ham && typeof ham === 'object' && !Array.isArray(ham)) {
      Object.keys(ham).forEach((k) => { if (k.length <= SINIR.ANAHTAR) harita.set(k, ham[k]); });
    }
  } catch (e) { /* dosya yok ya da bozuk: boş başlar */ }

  function diskeYaz() {
    const nesne = {};
    harita.forEach((v, k) => { Object.defineProperty(nesne, k, { value: v, enumerable: true, writable: true, configurable: true }); });
    const metin = JSON.stringify(nesne);
    if (metin.length > SINIR.TOPLAM) throw new Error('Depo boyut sınırı aşıldı');
    fs.mkdirSync(path.dirname(dosya), { recursive: true });
    const gecici = dosya + '.tmp';
    fs.writeFileSync(gecici, metin, { mode: 0o600 });
    fs.renameSync(gecici, dosya);
  }
  return {
    oku(anahtar) { return harita.has(anahtar) ? JSON.parse(JSON.stringify(harita.get(anahtar))) : undefined; },
    yaz(anahtar, deger) {
      if (typeof anahtar !== 'string' || !anahtar || anahtar.length > SINIR.ANAHTAR) throw new Error('Geçersiz depo anahtarı');
      const onceki = harita.has(anahtar) ? harita.get(anahtar) : undefined;
      const var_ = harita.has(anahtar);
      if (deger === undefined) harita.delete(anahtar); else harita.set(anahtar, JSON.parse(JSON.stringify(deger)));
      try { diskeYaz(); } catch (e) {
        if (var_) harita.set(anahtar, onceki); else harita.delete(anahtar);
        throw e;
      }
    }
  };
}
module.exports = { depoOlustur, SINIR };
