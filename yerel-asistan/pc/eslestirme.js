'use strict';
// Eşleştirme sırrı yenileme ve tepsi durum metinleri (saf; Electron'a bağlı değil, test edilir).

const KOD_UYARISI = 'Kodu kimseyle paylaşma; sızdıysa yenile.';
const YENILE_ONAY_METNI = 'Eşleştirme kodu yenilenecek. Bağlı telefonun bağlantısı kesilir ve eski kod artık çalışmaz; telefonda yeni kodu girmeniz gerekir.';

// d: { onayIste(aciklama) -> Promise<boolean>, sirUret() -> Uint8Array(32), sirKaydet(sir) -> boolean (kalıcı mı), sunucu: null | { sirDegistir? } }
// Dönüş:
//   { durum: 'reddedildi' }
//   { durum: 'hata' }                                  (sunucu sırrı değiştiremedi; hiçbir şey değişmedi)
//   { durum: 'yenilendi', sir, kalici, sunucuYontemi: 'sunucu-yok' | 'sirDegistir' | 'yeniden-baslat' }
// 'yeniden-baslat': sunucu var ama sirDegistir yok (eski protokol sürümü); çağıran sunucuyu yeni sırla yeniden başlatmalı.
async function sirYenile(d) {
  let onay = false;
  try { onay = (await d.onayIste(YENILE_ONAY_METNI)) === true; } catch (e) { onay = false; }
  if (!onay) return { durum: 'reddedildi' };
  const yeni = d.sirUret();
  if (!(yeni instanceof Uint8Array) || yeni.length !== 32) return { durum: 'hata' };
  let yontem = 'sunucu-yok';
  if (d.sunucu) {
    if (typeof d.sunucu.sirDegistir === 'function') {
      try { await d.sunucu.sirDegistir(Uint8Array.from(yeni)); } catch (e) { return { durum: 'hata' }; }
      yontem = 'sirDegistir';
    } else {
      yontem = 'yeniden-baslat';
    }
  }
  let kalici = false;
  try { kalici = d.sirKaydet(yeni) === true; } catch (e) { kalici = false; }
  return { durum: 'yenilendi', sir: yeni, kalici, sunucuYontemi: yontem };
}

// Bağlı telefonu keser (sunucu.oturumuKes). Dönüş: true = çağrıldı, false = sunucu yok ya da işlev yok
async function telefonuKes(sunucu) {
  if (!sunucu || typeof sunucu.oturumuKes !== 'function') return false;
  try { await sunucu.oturumuKes(); return true; } catch (e) { return false; }
}

// IP yalnızca IPv4/IPv6 onaltılık karakterlerinden oluşuyorsa gösterilir ("::ffff:" öneki atılır).
function ipTemizle(ip) {
  if (typeof ip !== 'string') return null;
  const t = ip.replace(/^::ffff:/i, '');
  return /^[0-9a-fA-F.:]{1,45}$/.test(t) ? t : null;
}
function baglananIp(sunucu) {
  if (!sunucu || typeof sunucu.baglananIp !== 'function') return null;
  try { return ipTemizle(sunucu.baglananIp()); } catch (e) { return null; }
}

// Tepsi menüsü ve ipucu metinleri. d: { sunucuVar, bagli, ip }
function telefonDurumMetni(d) {
  if (!d || !d.sunucuVar) return 'Telefon bağlantısı kapalı';
  if (!d.bagli) return 'Telefon bağlı değil';
  return d.ip ? 'Bağlı telefon: ' + d.ip : 'Telefon bağlı';
}
function durumImzasi(d) { return [!!(d && d.sunucuVar), !!(d && d.bagli), (d && d.ip) || ''].join('|'); }

module.exports = { KOD_UYARISI, YENILE_ONAY_METNI, sirYenile, telefonuKes, ipTemizle, baglananIp, telefonDurumMetni, durumImzasi };
