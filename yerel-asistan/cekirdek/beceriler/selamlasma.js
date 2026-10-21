'use strict';
const KELIMELER = new Set(['merhaba', 'selam', 'selamlar', 'gunaydin', 'naber', 'nasilsin', 'hey', 'meraba', 'slm']);

module.exports = {
  ad: 'selamlasma',
  aciklama: 'Selamlaşır',
  ornekler: ['merhaba', 'günaydın', 'nasılsın'],
  eslestir(norm) {
    const n = norm.split(' ');
    if (n.length > 4) return null;
    if (n.some((x) => KELIMELER.has(x)) || /\biyi (aksamlar|geceler|gunler)\b/.test(norm) || /\bgorusuruz\b|\bhosca kal/.test(norm)) {
      return { slots: { norm }, guven: 0.5 };
    }
    return null;
  },
  async calistir(slots) {
    const n = slots.norm;
    if (/gorusuruz|hosca kal|iyi geceler/.test(n)) return { yanit: 'Görüşürüz!', adimlar: [] };
    if (/gunaydin/.test(n)) return { yanit: 'Günaydın! Nasıl yardımcı olabilirim?', adimlar: [] };
    if (/nasilsin/.test(n)) return { yanit: 'İyiyim, teşekkürler! Sana nasıl yardımcı olabilirim?', adimlar: [] };
    return { yanit: 'Merhaba! Nasıl yardımcı olabilirim?', adimlar: [] };
  },
};
