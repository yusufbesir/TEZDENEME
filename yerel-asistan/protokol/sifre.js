'use strict';
// Pırıl protokolü: şifreleme katmanı.
// Yalnızca globalThis.crypto.subtle (WebCrypto) kullanır; Node 22 ve Android WebView'de aynı kod çalışır.
// Buffer ve node:crypto kullanılmaz.

const SURUM = 2; // v:1 (ECDH'siz) desteklenmez
const SINIR = 256 * 1024; // düz iletinin üst sınırı (bayt)
const EKRAN_SINIR = 2 * 1024 * 1024; // `ekran` iletisi için
const ONEK = 'PIRIL-';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const KOD_BAYT = 32;
const KOD_HARF = 55; // (32 + 2 sağlama) bayt = 272 bit -> 55 Base32 karakteri

const kodlayici = new TextEncoder();
const cozucu = new TextDecoder('utf-8', { fatal: true });

function hata(kod, mesaj) {
  const e = new Error(mesaj);
  e.kod = kod;
  return e;
}

function subtle() {
  const c = globalThis.crypto;
  if (!c || !c.subtle) throw hata('webcrypto_yok', 'WebCrypto bu ortamda yok.');
  return c.subtle;
}

function rastgele(n) {
  const c = globalThis.crypto;
  if (!c || !c.getRandomValues) throw hata('webcrypto_yok', 'WebCrypto bu ortamda yok.');
  const u = new Uint8Array(n);
  c.getRandomValues(u);
  return u;
}

// ---- base64 (Buffer/btoa'ya bağımlı değil) ----
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_TERS = (() => {
  const t = new Int16Array(128).fill(-1);
  for (let i = 0; i < 64; i++) t[B64.charCodeAt(i)] = i;
  return t;
})();

function b64Kodla(u8) {
  let s = '';
  let i = 0;
  for (; i + 2 < u8.length; i += 3) {
    const n = (u8[i] << 16) | (u8[i + 1] << 8) | u8[i + 2];
    s += B64[n >> 18] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const kalan = u8.length - i;
  if (kalan === 1) {
    const n = u8[i] << 16;
    s += B64[n >> 18] + B64[(n >> 12) & 63] + '==';
  } else if (kalan === 2) {
    const n = (u8[i] << 16) | (u8[i + 1] << 8);
    s += B64[n >> 18] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return s;
}

// Katı çözücü: standart alfabe, dolgu zorunlu, bozuk girdide hata.
function b64Coz(str) {
  if (typeof str !== 'string' || str.length % 4 !== 0) throw hata('b64', 'Geçersiz base64.');
  let dolgu = 0;
  if (str.endsWith('==')) dolgu = 2;
  else if (str.endsWith('=')) dolgu = 1;
  const govde = str.length - dolgu;
  const cikti = new Uint8Array((str.length / 4) * 3 - dolgu);
  let o = 0;
  for (let i = 0; i < str.length; i += 4) {
    let n = 0;
    for (let j = 0; j < 4; j++) {
      let v = 0;
      if (i + j < govde) {
        const k = str.charCodeAt(i + j);
        v = k < 128 ? B64_TERS[k] : -1;
        if (v < 0) throw hata('b64', 'Geçersiz base64 karakteri.');
      }
      n = (n << 6) | v;
    }
    if (o < cikti.length) cikti[o++] = (n >> 16) & 255;
    if (o < cikti.length) cikti[o++] = (n >> 8) & 255;
    if (o < cikti.length) cikti[o++] = n & 255;
  }
  return cikti;
}

// ---- eşleştirme kodu ----
function crc16(u8) {
  let crc = 0xffff;
  for (let i = 0; i < u8.length; i++) {
    crc ^= u8[i] << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

function base32Kodla(u8) {
  let bit = 0;
  let deger = 0;
  let s = '';
  for (let i = 0; i < u8.length; i++) {
    deger = (deger << 8) | u8[i];
    bit += 8;
    while (bit >= 5) {
      s += B32[(deger >>> (bit - 5)) & 31];
      bit -= 5;
    }
    deger &= (1 << bit) - 1;
  }
  if (bit > 0) s += B32[(deger << (5 - bit)) & 31];
  return s;
}

function base32Coz(s, bayt) {
  const cikti = new Uint8Array(bayt);
  let bit = 0;
  let deger = 0;
  let o = 0;
  for (let i = 0; i < s.length; i++) {
    const v = B32.indexOf(s[i]);
    if (v < 0) throw hata('kod_karakter', 'Eşleştirme kodunda geçersiz karakter var.');
    deger = (deger << 5) | v;
    bit += 5;
    if (bit >= 8) {
      if (o >= bayt) throw hata('kod_uzunluk', 'Eşleştirme kodunun uzunluğu yanlış.');
      cikti[o++] = (deger >>> (bit - 8)) & 255;
      bit -= 8;
      deger &= (1 << bit) - 1;
    }
  }
  if (deger !== 0) throw hata('kod_karakter', 'Eşleştirme kodu bozuk (dolgu bitleri).');
  return cikti;
}

function kodBicimle(sir) {
  const veri = new Uint8Array(KOD_BAYT + 2);
  veri.set(sir, 0);
  const c = crc16(sir);
  veri[KOD_BAYT] = c >> 8;
  veri[KOD_BAYT + 1] = c & 255;
  const b32 = base32Kodla(veri);
  const gruplar = [];
  for (let i = 0; i < b32.length; i += 8) gruplar.push(b32.slice(i, i + 8));
  return ONEK + gruplar.join('-');
}

// Yeni 32 baytlık sır ve okunur kod üretir.
function kodUret() {
  const sir = rastgele(KOD_BAYT);
  return { sir, kod: kodBicimle(sir) };
}

// Kodu ayrıştırır; sırrı (Uint8Array(32)) döndürür. Hatalıysa e.kod ile fırlatır.
function kodAyristir(kod) {
  if (typeof kod !== 'string') throw hata('kod_tip', 'Eşleştirme kodu metin olmalı.');
  const duz = kod.replace(/[\s-]+/g, '').toUpperCase();
  if (!duz.startsWith('PIRIL')) throw hata('kod_onek', 'Eşleştirme kodu PIRIL- ile başlamalı.');
  const govde = duz.slice(5);
  if (govde.length !== KOD_HARF) throw hata('kod_uzunluk', 'Eşleştirme kodunun uzunluğu yanlış.');
  for (let i = 0; i < govde.length; i++) {
    if (B32.indexOf(govde[i]) < 0) throw hata('kod_karakter', 'Eşleştirme kodunda geçersiz karakter var.');
  }
  const veri = base32Coz(govde, KOD_BAYT + 2);
  const sir = veri.slice(0, KOD_BAYT);
  const c = crc16(sir);
  if (veri[KOD_BAYT] !== c >> 8 || veri[KOD_BAYT + 1] !== (c & 255)) {
    throw hata('kod_toplam', 'Eşleştirme kodu yanlış yazılmış (sağlama toplamı tutmuyor).');
  }
  return sir;
}

// ---- anahtar türetme ----
const ACIK_BAYT = 65; // P-256 sıkıştırılmamış nokta: 0x04 || X(32) || Y(32)

// Tek kullanımlık ECDH P-256 anahtar çifti. Özel anahtar dışa verilemez; bellekte tutulur.
async function geciciUret() {
  const cift = await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const acik = new Uint8Array(await subtle().exportKey('raw', cift.publicKey));
  return { ozel: cift.privateKey, acik };
}

// ecdh: {ozel: CryptoKey, karsiAcik, istemciAcik, sunucuAcik} (açıklar 65 baytlık Uint8Array).
// IKM = ecdh_ortak_sir || sir; salt = ri||rs||istemciAcik||sunucuAcik;
// HKDF-SHA256(IKM, salt, info = 'piril-c2s' | 'piril-s2c') -> iki ayrı AES-256-GCM anahtarı.
async function anahtarlariTuret(sir, ri, rs, ecdh) {
  if (!(sir instanceof Uint8Array) || sir.length !== KOD_BAYT) throw hata('sir', 'Sır 32 bayt olmalı.');
  if (!(ri instanceof Uint8Array) || ri.length !== 16) throw hata('ri', 'ri 16 bayt olmalı.');
  if (!(rs instanceof Uint8Array) || rs.length !== 16) throw hata('rs', 'rs 16 bayt olmalı.');
  if (!ecdh || !ecdh.ozel) throw hata('ecdh', 'Geçici anahtar gerekli.');
  for (const k of ['karsiAcik', 'istemciAcik', 'sunucuAcik']) {
    if (!(ecdh[k] instanceof Uint8Array) || ecdh[k].length !== ACIK_BAYT || ecdh[k][0] !== 4) throw hata('ecdh', 'Geçersiz açık anahtar.');
  }
  const s = subtle();
  let ortak;
  try {
    const karsi = await s.importKey('raw', ecdh.karsiAcik, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    ortak = new Uint8Array(await s.deriveBits({ name: 'ECDH', public: karsi }, ecdh.ozel, 256));
  } catch (e) {
    throw hata('ecdh', 'ECDH başarısız.');
  }
  const ikm = new Uint8Array(ortak.length + sir.length);
  ikm.set(ortak, 0);
  ikm.set(sir, ortak.length);
  ortak.fill(0);
  const salt = new Uint8Array(32 + 2 * ACIK_BAYT);
  salt.set(ri, 0);
  salt.set(rs, 16);
  salt.set(ecdh.istemciAcik, 32);
  salt.set(ecdh.sunucuAcik, 32 + ACIK_BAYT);
  const taban = await s.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);
  ikm.fill(0);
  const turet = (info) =>
    s.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt, info: kodlayici.encode(info) },
      taban,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  const [c2s, s2c] = await Promise.all([turet('piril-c2s'), turet('piril-s2c')]);
  return { c2s, s2c };
}

// ---- AES-256-GCM ----
// Nonce = 4 sıfır bayt + 8 bayt big-endian sayaç.
function nonceYap(sayac) {
  const n = new Uint8Array(12);
  new DataView(n.buffer).setBigUint64(4, BigInt(sayac), false);
  return n;
}

function sayacGecerli(n) {
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 1;
}

async function sifrele(anahtar, sayac, duzBayt) {
  if (!sayacGecerli(sayac)) throw hata('sayac', 'Geçersiz sayaç.');
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv: nonceYap(sayac), tagLength: 128 }, anahtar, duzBayt);
  return new Uint8Array(ct);
}

async function coz(anahtar, sayac, sifreliBayt) {
  if (!sayacGecerli(sayac)) throw hata('sayac', 'Geçersiz sayaç.');
  try {
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: nonceYap(sayac), tagLength: 128 }, anahtar, sifreliBayt);
    return new Uint8Array(pt);
  } catch (e) {
    throw hata('cozulemedi', 'Zarf çözülemedi.');
  }
}

// Gönderici: sayaç 1'den başlar, her zarfta kesin artar. Gönderimler sıraya dizilir ki
// zarflar sayaç sırasıyla yazılsın (şifreleme asenkron olduğu için).
class Gonderici {
  constructor(anahtar) {
    this.anahtar = anahtar;
    this.sayac = 0;
    this._zincir = Promise.resolve();
  }
  // obj: JSON'lanabilir ileti. yaz(zarfMetni) sıra garantisiyle çağrılır. Promise döner.
  gonder(obj, yaz) {
    const adim = this._zincir.then(async () => {
      const bayt = kodlayici.encode(JSON.stringify(obj));
      const limit = obj && obj.t === 'ekran' ? EKRAN_SINIR : SINIR;
      if (bayt.length > limit) throw hata('cok_buyuk', 'İleti çok büyük.');
      const n = this.sayac + 1;
      if (!sayacGecerli(n)) throw hata('sayac', 'Sayaç doldu.');
      const c = await sifrele(this.anahtar, n, bayt);
      this.sayac = n;
      yaz(JSON.stringify({ v: SURUM, n, c: b64Kodla(c) }));
    });
    this._zincir = adim.catch(() => {});
    return adim;
  }
}

// Alıcı: sayaç tam olarak son+1 olmalı (tekrar ve boşluk reddedilir). Sayaç yalnızca başarılı çözümden sonra ilerler.
// Çağrılar sıraya dizilir; bir hata sonrası alıcı bozulur ve hep hata verir.
class Alici {
  // sinir: kabul edilen düz ileti üst sınırı (bayt); sunucu SINIR, istemci EKRAN_SINIR kullanır.
  constructor(anahtar, sinir = EKRAN_SINIR) {
    this.anahtar = anahtar;
    this.sinir = sinir;
    this.son = 0;
    this.bozuk = false;
    this._zincir = Promise.resolve();
  }
  // zarfMetni: ağdan gelen metin. Çözülmüş iletiyi {bayt, nesne|null} değil, düz Uint8Array olarak döner.
  coz(zarfMetni) {
    const adim = this._zincir.then(async () => {
      if (this.bozuk) throw hata('bozuk', 'Alıcı kapandı.');
      try {
        const z = zarfAyristir(zarfMetni, this.sinir);
        if (z.n <= this.son) throw hata('sayac_geri', 'Sayaç ilerlemedi (tekrar/sıra bozuk).');
        if (z.n !== this.son + 1) throw hata('sayac_bosluk', 'Sayaçta boşluk var (ileti kaybı/sıra bozuk).');
        const bayt = await coz(this.anahtar, z.n, z.c);
        this.son = z.n;
        return bayt;
      } catch (e) {
        this.bozuk = true;
        throw e;
      }
    });
    this._zincir = adim.catch(() => {});
    return adim;
  }
}

function zarfAyristir(metin, sinir = EKRAN_SINIR) {
  let z;
  try {
    z = JSON.parse(metin);
  } catch (e) {
    throw hata('zarf_json', 'Zarf JSON değil.');
  }
  if (!z || typeof z !== 'object' || Array.isArray(z)) throw hata('zarf', 'Geçersiz zarf.');
  if (z.v !== SURUM) throw hata('surum', 'Desteklenmeyen sürüm.');
  if (!sayacGecerli(z.n)) throw hata('zarf', 'Geçersiz sayaç.');
  if (typeof z.c !== 'string' || z.c.length > Math.ceil(((sinir + 16) * 4) / 3) + 8) throw hata('zarf', 'Geçersiz içerik.');
  let c;
  try {
    c = b64Coz(z.c);
  } catch (e) {
    throw hata('zarf', 'Zarf içeriği base64 değil.');
  }
  if (c.length < 16) throw hata('zarf', 'Zarf çok kısa.');
  return { n: z.n, c };
}

// Düz baytı JSON nesnesine çevirir (katı UTF-8).
function jsonCoz(bayt) {
  return JSON.parse(cozucu.decode(bayt));
}

const api = {
  SURUM, SINIR, EKRAN_SINIR, ONEK,
  rastgele, b64Kodla, b64Coz,
  kodUret, kodAyristir, kodBicimle,
  ACIK_BAYT, geciciUret, anahtarlariTuret, sifrele, coz, nonceYap,
  Gonderici, Alici, zarfAyristir, jsonCoz, hata,
};

if (typeof module !== 'undefined' && module.exports) module.exports = api;
else globalThis.PirilSifre = api;
