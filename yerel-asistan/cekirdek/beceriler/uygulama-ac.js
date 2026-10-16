'use strict';
// Uygulama aç: yalnızca beyaz listedeki uygulamalar. Kullanıcı metni platforma ASLA aktarılmaz;
// platforma yalnızca listedeki sabit kimlik gider.
const { desteklenmiyor, platformFn, adim } = require('./_yardimci');

const UYGULAMALAR = [
  [/\bhesap makine\w*|\bcalculator\b|\bcalc\b/, 'calc', 'Hesap makinesi'],
  [/\bnot defter\w*|\bnotepad\b/, 'notepad', 'Not defteri'],
  [/\bpaint\b/, 'paint', 'Paint'],
  [/\bdosya gezgin\w*|\bexplorer\b|\bgezgin\w*/, 'explorer', 'Dosya gezgini'],
  [/\bchrome\b|\bkrom\b/, 'chrome', 'Chrome'],
  [/\bfirefox\b/, 'firefox', 'Firefox'],
  [/\bedge\b/, 'edge', 'Edge'],
  [/\bspotify\b/, 'spotify', 'Spotify'],
  [/\bvscode\b|\bvisual studio code\b/, 'vscode', 'Visual Studio Code'],
  [/\bword\b/, 'word', 'Word'],
  [/\bexcel\b/, 'excel', 'Excel'],
  [/\bpowerpoint\b/, 'powerpoint', 'PowerPoint'],
  [/\bvlc\b/, 'vlc', 'VLC'],
  [/\bdiscord\b/, 'discord', 'Discord'],
  [/\bwhatsapp\b/, 'whatsapp', 'WhatsApp'],
];
// TEK kimlik listesi (çekirdek tarafı). Platform tarafındaki kimlik -> çalıştırılabilir tablosu
// (pc/platform/windows.js UYGULAMALAR) bu listeyle birebir aynı kimlikleri içermek zorundadır; test denetler.
const KIMLIKLER = Object.freeze(UYGULAMALAR.map((u) => u[1]));
const TETIK = new Set(['ac', 'calistir', 'baslat']);
// Kabuk/yol/tırnak vb. tehlikeli karakterler. Kesme işareti (chrome'u) serbest.
const TEHLIKELI = /[&;|`$<>\\/"\n\r\t\0(){}[\]*?~^%!=]|\.\./;

module.exports = {
  ad: 'uygulama-ac',
  aciklama: 'Uygulama açar (güvenli listedekiler)',
  ornekler: ['hesap makinesini aç', 'chrome\'u aç', 'not defterini başlat'],
  platformGerekli: ['uygulamaAc'],
  eslestir(norm, bilgi) {
    const t = norm.split(' ');
    if (!t.some((x) => TETIK.has(x))) return null;
    const ham = (bilgi && bilgi.ham) || norm;
    const bulunan = UYGULAMALAR.filter(([re]) => re.test(norm));
    const tehlikeli = TEHLIKELI.test(ham);
    if (tehlikeli) {
      // Yalnızca açıkça bir uygulama adı içeriyorsa reddi bildir; aksi halde başka beceriler denesin.
      return bulunan.length ? { slots: { red: true }, guven: 0.95 } : null;
    }
    if (bulunan.length === 0) return null;
    if (bulunan.length > 1) return { slots: { red: true }, guven: 0.95 };
    return { slots: { kimlik: bulunan[0][1], ad: bulunan[0][2] }, guven: 0.9 };
  },
  async calistir(slots, ctx) {
    if (slots.red) {
      return { yanit: 'Bu isteği güvenlik nedeniyle yapmıyorum: aynı anda tek bir uygulama adı söyle.', adimlar: [] };
    }
    const ac = platformFn(ctx, 'uygulamaAc');
    if (!ac) return desteklenmiyor();
    try {
      await ac(slots.kimlik);
      return { yanit: `${slots.ad} açıldı.`, adimlar: [adim(`${slots.ad} açılıyor`)], eylem: { tip: 'uygulama', ad: slots.kimlik } };
    } catch (e) {
      return { yanit: `${slots.ad} açılamadı.`, adimlar: [adim(`${slots.ad} açılıyor`, 'hata')] };
    }
  },
  KIMLIKLER,
  _uygulamalar: UYGULAMALAR,
};
