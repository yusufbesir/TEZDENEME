'use strict';
// Onay penceresinin saf mantığı (Electron'a bağlı değil; dialog ve zamanlayıcı enjekte edilir).
// - Aynı anda tek onay: biri açıkken gelen diğer istekler reddedilir.
// - 45 sn zaman aşımı: süre dolunca pencere kapatılır (AbortSignal), sonuç RED olur ve kilit serbest kalır.
// - İş telefondan geldiyse pencere bunu açıkça yazar.
// - Onay penceresi açıkken uzak girdi (isaret/tikla/yaz/tus) yok sayılır.

const ONAY_ZAMAN_ASIMI_MS = 45000;
const METIN_SINIRI = 400;

// bag: { kaynak?: 'telefon', ip?: string }
function onaySecenekleri(aciklama, bag, zamanAsimiMs) {
  const b = bag || {};
  const sn = Math.round((zamanAsimiMs || ONAY_ZAMAN_ASIMI_MS) / 1000);
  const metin = String(aciklama == null ? '' : aciklama).slice(0, METIN_SINIRI);
  const telefon = b.kaynak === 'telefon';
  const ip = typeof b.ip === 'string' && /^[0-9a-fA-F.:]{1,45}$/.test(b.ip) ? b.ip : null;
  const satirlar = [];
  if (telefon) satirlar.push('Bu istek TELEFONUNUZDAN geldi' + (ip ? ' (' + ip + ')' : '') + '.', '');
  satirlar.push(metin, '', sn + ' saniye içinde yanıt vermezseniz otomatik olarak reddedilir.');
  return {
    type: 'question', title: 'Pırıl: onay gerekiyor',
    message: telefon ? 'Telefon bir işleme izin istiyor. İzin veriyor musunuz?' : 'Bu işleme izin veriyor musunuz?',
    detail: satirlar.join('\n'), buttons: ['İzin verme', 'İzin ver'], defaultId: 0, cancelId: 0, noLink: true
  };
}

// dis: { goster(secenek, signal) -> Promise<{response:number}>, zamanAsimiMs?, setTimeout?, clearTimeout? }
function onayYoneticisiOlustur(dis) {
  const d = dis || {};
  const ms = Number.isFinite(d.zamanAsimiMs) && d.zamanAsimiMs > 0 ? d.zamanAsimiMs : ONAY_ZAMAN_ASIMI_MS;
  const kur = d.setTimeout || setTimeout;
  const temizle = d.clearTimeout || clearTimeout;
  let onayAcik = false;

  async function iste(aciklama, bag) {
    if (onayAcik || typeof d.goster !== 'function') return false;
    onayAcik = true;
    const ac = new AbortController();
    let zaman = null;
    try {
      const sureDoldu = new Promise((coz) => {
        zaman = kur(() => { try { ac.abort(); } catch (e) { /* yoksay */ } coz(false); }, ms);
      });
      const kullanici = Promise.resolve()
        .then(() => d.goster(onaySecenekleri(aciklama, bag, ms), ac.signal))
        .then((r) => !!r && r.response === 1, () => false);
      return await Promise.race([kullanici, sureDoldu]);
    } catch (e) {
      return false;
    } finally {
      if (zaman !== null) temizle(zaman);
      onayAcik = false; // zaman aşımında da, hatada da serbest
    }
  }
  return { iste, acikMi: () => onayAcik };
}

// Uzak girdi işleyicileri. d: { uzakKontrolAcik(), onayAcik(), uzak() -> {fareTasi,tikla,yaz,tus}, ekranOnizleme(gen) }
// Uzak kontrol kapalıysa hata fırlatır (sunucu "islem_hatasi" döner); onay penceresi açıksa girdi sessizce yok sayılır.
function uzakIsleyicilerOlustur(d) {
  const kapi = () => {
    if (!d.uzakKontrolAcik()) throw new Error('Uzaktan kontrol kapalı');
    return !d.onayAcik();
  };
  return {
    isaret: async (v) => { if (kapi()) await d.uzak().fareTasi(v.x, v.y); },
    tikla: async (v) => { if (kapi()) await d.uzak().tikla(v.x, v.y, v.dugme || 'sol', 1); },
    yaz: async (v) => { if (kapi()) await d.uzak().yaz(v.metin); },
    tus: async (v) => { if (kapi()) await d.uzak().tus(v.tus); },
    ekranIste: async () => { kapi(); return d.ekranOnizleme(960); }
  };
}

module.exports = { ONAY_ZAMAN_ASIMI_MS, onaySecenekleri, onayYoneticisiOlustur, uzakIsleyicilerOlustur };
