'use strict';
// Vadesi gelen hatırlatıcı/alarmları bulur ve tamamlandı işaretler. Arayüz ve PC uygulaması
// bunu periyodik çağırır; bildirimi platform gösterir. Bağımlılık yok, ağ yok.
const ANAHTAR = 'hatirlaticilar';
const GECMIS_SINIRI_MS = 6 * 3600 * 1000; // 6 saatten eski vadeler sessizce kapanır (cihaz kapalıyken birikenler)

function depoVar(depo) {
  return !!(depo && typeof depo.oku === 'function' && typeof depo.yaz === 'function');
}

// -> { vadesiGelen: [{ id, zaman, metin, tur }], eski: n }
function vadesiGelenler(depo, simdi) {
  if (!depoVar(depo)) return { vadesiGelen: [], eski: 0 };
  const liste = depo.oku(ANAHTAR);
  const kayitlar = Array.isArray(liste) ? liste : [];
  const t = (simdi instanceof Date ? simdi : new Date()).getTime();
  const vadesiGelen = [];
  let eski = 0;
  let degisti = false;
  const yeni = kayitlar.map((k) => {
    if (!k || k.tamam) return k;
    const z = new Date(k.zaman).getTime();
    if (!(z <= t)) return k;
    degisti = true;
    if (t - z > GECMIS_SINIRI_MS) { eski++; return Object.assign({}, k, { tamam: true, kacirildi: true }); }
    vadesiGelen.push({ id: k.id, zaman: k.zaman, metin: String(k.metin || ''), tur: k.tur === 'alarm' ? 'alarm' : 'hatirlatici' });
    return Object.assign({}, k, { tamam: true });
  });
  if (degisti) depo.yaz(ANAHTAR, yeni);
  return { vadesiGelen, eski };
}

function bildirimMetni(k) {
  return k.tur === 'alarm' ? 'Alarm! ' + (k.metin && k.metin !== 'Alarm' ? k.metin : 'Kurduğun saat geldi.') : 'Hatırlatma: ' + k.metin;
}

module.exports = { vadesiGelenler, bildirimMetni, ANAHTAR, GECMIS_SINIRI_MS };
