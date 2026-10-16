'use strict';
// Eski sürüm temizliği (Pırıl): saf modül (electron'a bağımlı değil; fs ve trashItem enjekte edilir).
// Güvenlik: yalnız manifestteki tam eşleşen kurulum/taşınabilir dosya adları (Piril-Kurulum-X.Y.Z.exe[.blockmap]), yalnız
// mevcut sürümden KÜÇÜK olanlar, yalnız verilen kurulum çıktı klasörünün doğrudan çocukları, silme yalnız geri dönüşüm
// kutusuna (trashItem), SHA256 doğrulaması sonrası. Kullanıcı verisi/ayar dosyalarına asla dokunmaz.
// SHA256.txt ile ilgili dürüst not: SHA256.txt kurulum dosyalarıyla AYNI klasörde durur. Bu doğrulama yalnızca bütünlük/bozulma
// (yarım indirme, bozuk kopya) denetimidir; GÜVENLİK SINIRI DEĞİLDİR. Klasöre yazabilen biri hem exe'yi hem SHA256.txt'yi
// değiştirebilir. Gerçek bir doğrulama için kod imzası gerekir (bu uygulama imzasızdır). Davranış bu nedenle yalnız "emin değilsek silme"dir.
const path = require('path');
const crypto = require('crypto');

const EN_COK = 50;
// Tek kaynak: silinebilecek dosyaların açık listesi (manifest). Desen buradan üretilir; bunun dışındaki hiçbir ad silinmez.
const MANIFEST = Object.freeze({
  onek: 'Piril',
  turler: Object.freeze(['Kurulum', 'Tasinabilir']),
  uzantilar: Object.freeze(['.exe', '.exe.blockmap'])
});
const kacis = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const AD_DESENI = new RegExp('^' + kacis(MANIFEST.onek) + '-(' + MANIFEST.turler.map(kacis).join('|') + ')-(\\d{1,6})\\.(\\d{1,6})\\.(\\d{1,6})(' +
  MANIFEST.uzantilar.map(kacis).join('|') + ')$', 'i');
const SURUM_DESENI = /^(\d{1,6})\.(\d{1,6})\.(\d{1,6})$/;

// "1.10.0" -> [1,10,0]; geçersizse null
function surumAyristir(s) {
  if (typeof s !== 'string') return null;
  const m = s.trim().match(SURUM_DESENI);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

// a<b: -1, eşit: 0, a>b: 1; geçersiz girdide NaN
function surumKarsilastir(a, b) {
  const x = Array.isArray(a) ? a : surumAyristir(a);
  const y = Array.isArray(b) ? b : surumAyristir(b);
  if (!x || !y) return NaN;
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  }
  return 0;
}

// Tanınan dosya adından { tur, surum } döner; tanınmazsa null
function adAyristir(ad) {
  if (typeof ad !== 'string') return null;
  const m = ad.match(AD_DESENI);
  if (!m) return null;
  return { tur: m[1].toLowerCase(), surum: m[2] + '.' + m[3] + '.' + m[4] };
}

function anahtar(p) {
  return path.resolve(p).toLowerCase();
}

function calisanYollar() {
  const l = [];
  if (process.execPath) l.push(process.execPath);
  if (process.env.PORTABLE_EXECUTABLE_FILE) l.push(process.env.PORTABLE_EXECUTABLE_FILE);
  return l;
}

// yol, kok'un (gerçek yol) doğrudan çocuğu mu? (.., mutlak yol, ayırıcı kaçışı yok)
function icerde(kok, yol) {
  const g = path.relative(kok, yol);
  return g !== '' && !g.startsWith('..') && !path.isAbsolute(g) && g === path.basename(g);
}

function gercekYol(fs, p) {
  return (fs.realpathSync.native || fs.realpathSync)(p);
}

// Dosya hâlâ güvenli mi: normal dosya, sembolik bağlantı/junction değil, gerçek yolu klasörün içinde.
function guvenliDosya(fs, kokGercek, yol) {
  try {
    const st = fs.lstatSync(yol);
    if (st.isSymbolicLink() || st.isDirectory() || !st.isFile()) return false;
    if (st.nlink > 1) return false; // sabit bağlantı (hardlink): başka bir yere de işaret edebilir, atlanır
    return icerde(kokGercek, gercekYol(fs, yol));
  } catch (e) { return false; }
}

// SHA256 (hex), parça parça okur
function sha256Dosya(fs, yol) {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(yol, 'r');
  try {
    const tampon = Buffer.alloc(1 << 20);
    let n;
    while ((n = fs.readSync(fd, tampon, 0, tampon.length, null)) > 0) h.update(tampon.subarray(0, n));
  } finally { fs.closeSync(fd); }
  return h.digest('hex');
}

// Klasördeki SHA256.txt ("<hash>  <ad>") ile mevcut sürümün klasördeki kurulum dosyalarını doğrular.
// Dönüş: { durum: 'dogrulandi' | 'hatali' | 'yok', ... } -- 'hatali' ise silme yapılmamalı.
function sha256Dogrula(klasor, mevcutSurum, fs) {
  let metin;
  try { metin = fs.readFileSync(path.join(klasor, 'SHA256.txt'), 'utf8'); } catch (e) { return { durum: 'yok' }; }
  const beklenen = {};
  metin.split(/\r?\n/).forEach((satir) => {
    const m = satir.trim().match(/^([0-9a-f]{64})\s+\*?(.+)$/i);
    if (m) beklenen[m[2].toLowerCase()] = m[1].toLowerCase();
  });
  let adlar;
  try { adlar = fs.readdirSync(klasor); } catch (e) { return { durum: 'yok' }; }
  let kontrol = 0;
  for (const ad of adlar) {
    const b = adAyristir(ad);
    if (!b || b.surum !== mevcutSurum || /\.blockmap$/i.test(ad) || !beklenen[ad.toLowerCase()]) continue;
    const yol = path.join(klasor, ad);
    if (!guvenliDosya(fs, gercekYol(fs, klasor), yol)) continue;
    kontrol++;
    if (sha256Dosya(fs, yol) !== beklenen[ad.toLowerCase()]) return { durum: 'hatali', ad: ad };
  }
  return kontrol > 0 ? { durum: 'dogrulandi', adet: kontrol } : { durum: 'yok' };
}

// Yalnız klasörün doğrudan çocuklarına bakar. haric: ek olarak dışlanacak yollar (varsayılan: çalışan exe).
function tara(klasor, mevcutSurum, fs, haric) {
  const mevcut = surumAyristir(mevcutSurum);
  if (!mevcut || typeof klasor !== 'string' || !path.isAbsolute(klasor)) return [];
  const dislanan = new Set((haric || calisanYollar()).filter(Boolean).map(anahtar));
  let adlar, kokGercek;
  try { kokGercek = gercekYol(fs, klasor); adlar = fs.readdirSync(klasor); } catch (e) { return []; }
  const liste = [];
  adlar.slice().sort().forEach((ad) => {
    if (liste.length >= EN_COK) return;
    const bilgi = adAyristir(ad);
    if (!bilgi) return;
    if (surumKarsilastir(bilgi.surum, mevcut) !== -1) return;
    const yol = path.join(klasor, ad);
    if (dislanan.has(anahtar(yol))) return;
    if (!guvenliDosya(fs, kokGercek, yol)) return;
    liste.push({ ad: ad, yol: yol, surum: bilgi.surum });
  });
  return liste;
}

// Yalnız trashItem (geri dönüşüm kutusu) ile siler; kalıcı silme yok. Hata diğerlerini durdurmaz.
// secenek (isteğe bağlı): { fs, klasor, kayit } -- fs+klasor verilirse her dosya silmeden hemen önce yeniden doğrulanır
// ve SHA256'sı hesaplanır; kayit({ad,yol,sha256,durum,hata}) her sonuç için çağrılır (silinen ad + hash günlüğü).
async function temizle(liste, trashItem, secenek) {
  const sec = secenek || {};
  let kokGercek = null;
  if (sec.fs && sec.klasor) { try { kokGercek = gercekYol(sec.fs, sec.klasor); } catch (e) { kokGercek = null; } }
  const sonuc = [];
  const girdi = Array.isArray(liste) ? liste.slice(0, EN_COK) : [];
  for (const oge of girdi) {
    const ad = oge && typeof oge.ad === 'string' ? oge.ad : String(oge && oge.yol);
    try {
      if (!oge || typeof oge.yol !== 'string' || !adAyristir(oge.ad) || path.basename(oge.yol) !== oge.ad) {
        throw new Error('Tanınmayan öğe');
      }
      let hash = null;
      if (sec.fs) {
        if (!kokGercek || path.dirname(path.resolve(oge.yol)) !== path.resolve(sec.klasor) || !guvenliDosya(sec.fs, kokGercek, oge.yol)) {
          throw new Error('Güvenli olmayan yol');
        }
        hash = sha256Dosya(sec.fs, oge.yol);
      }
      await trashItem(oge.yol);
      const r = { ad: ad, durum: 'silindi', sha256: hash };
      sonuc.push(r);
      if (sec.kayit) { try { sec.kayit({ ad: ad, yol: oge.yol, sha256: hash, durum: 'silindi' }); } catch (e2) { /* günlük hatası silmeyi geri almaz */ } }
    } catch (e) {
      const hata = String((e && e.message) || e);
      sonuc.push({ ad: ad, durum: 'hata', hata: hata });
      if (sec.kayit) { try { sec.kayit({ ad: ad, yol: oge && oge.yol, sha256: null, durum: 'hata', hata: hata }); } catch (e2) { /* yoksay */ } }
    }
  }
  return sonuc;
}

module.exports = { MANIFEST, tara, temizle, sha256Dosya, sha256Dogrula, icerde, surumAyristir, surumKarsilastir, adAyristir, EN_COK };
