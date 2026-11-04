#!/usr/bin/env node
'use strict';
// `npx cap add android` ile üretilen android/app/src/main/ klasörüne Pırıl yamalarını uygular.
// Idempotent: tekrar çalıştırmak dosyaları değiştirmez. Kullanım:
//   node scripts/yamala.js [--ip 192.168.1.20[,10.0.0.5]] [--android <cap add android'in ürettiği klasör; varsayılan android/android>]
const fs = require('node:fs');
const path = require('node:path');

const IP_BASLA = '<!-- PIRIL-IP-BASLANGIC -->';
const IP_BITIS = '<!-- PIRIL-IP-BITIS -->';
const NSC_OZNITELIK = 'android:networkSecurityConfig="@xml/network_security_config"';

// Yedekleme tamamen kapalı: eşleştirme kodu ve uygulama verisi buluta/yedeğe çıkmasın.
const YEDEK_OZNITELIKLERI = [
  ['android:allowBackup', 'false'],
  ['android:fullBackupContent', 'false'],
  ['android:dataExtractionRules', '@xml/data_extraction_rules']
];
const REGEX_KACIS = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function hataFirlat(m) { throw new Error('yamala: ' + m); }

function ozelIpv4(ip) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return false;
  const o = m.slice(1).map(Number);
  if (o.some((n) => n > 255)) return false;
  return o[0] === 10 || (o[0] === 172 && o[1] >= 16 && o[1] <= 31) || (o[0] === 192 && o[1] === 168);
}

function izinleriOku(yamalarDizin) {
  return fs.readFileSync(path.join(yamalarDizin, 'izinler.txt'), 'utf8')
    .split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
}

// Manifest metnine izinleri ve ağ güvenlik yapılandırması özniteliğini ekler.
function manifestYamala(xml, izinler) {
  if (!/<manifest[\s>]/.test(xml) || !/<application[\s>]/.test(xml)) hataFirlat('AndroidManifest.xml beklenen biçimde değil.');
  let cikti = xml;
  const eksik = izinler.filter((i) => !new RegExp('<uses-permission[^>]*android:name="' + i.replace(/\./g, '\\.') + '"').test(cikti));
  if (eksik.length) {
    const satirlar = eksik.map((i) => `    <uses-permission android:name="${i}" />`).join('\n');
    // İzinler </application> sonrasına, </manifest> öncesine eklenir (geçerli konum).
    cikti = cikti.replace(/(\s*)<\/manifest>/, `\n\n${satirlar}\n$1</manifest>`);
  }
  // <application ...> etiketi
  cikti = cikti.replace(/<application\b([^>]*)>/, (tum, oz) => {
    let yeni = oz;
    if (/android:networkSecurityConfig="[^"]*"/.test(yeni)) {
      yeni = yeni.replace(/android:networkSecurityConfig="[^"]*"/, NSC_OZNITELIK);
    } else {
      yeni += '\n        ' + NSC_OZNITELIK;
    }
    // Yedekleme kapalı (varsa değeri düzelt, yoksa ekle; tekrar çalıştırmak aynı sonucu verir)
    for (const [ad, deger] of YEDEK_OZNITELIKLERI) {
      const re = new RegExp(REGEX_KACIS(ad) + '="[^"]*"');
      yeni = re.test(yeni) ? yeni.replace(re, `${ad}="${deger}"`) : yeni + `\n        ${ad}="${deger}"`;
    }
    // Genel açık metin izni varsa kapat; yalnızca ağ güvenlik yapılandırması izin verir.
    yeni = yeni.replace(/android:usesCleartextTraffic="true"/, 'android:usesCleartextTraffic="false"');
    return '<application' + yeni + '>';
  });
  return cikti;
}

function ipBloguOku(xml) {
  const b = xml.indexOf(IP_BASLA);
  const s = xml.indexOf(IP_BITIS);
  if (b < 0 || s < b) hataFirlat('network_security_config.xml içinde IP işaretleri yok.');
  const govde = xml.slice(b + IP_BASLA.length, s);
  return [...govde.matchAll(/<domain[^>]*>([^<]+)<\/domain>/g)].map((m) => m[1].trim());
}

// IP listesini işaretler arasına yazar (kümeler birleşir, sıralı, tekrarsız).
function ipEkle(xml, ipler) {
  for (const ip of ipler) if (!ozelIpv4(ip)) hataFirlat(`"${ip}" özel (yerel) bir IPv4 adresi değil.`);
  const b = xml.indexOf(IP_BASLA);
  const s = xml.indexOf(IP_BITIS);
  if (b < 0 || s < b) hataFirlat('network_security_config.xml içinde IP işaretleri yok.');
  const hepsi = [...new Set([...ipBloguOku(xml), ...ipler])].sort();
  const satirlar = hepsi.map((ip) => `\n    <domain includeSubdomains="false">${ip}</domain>`).join('');
  return xml.slice(0, b) + IP_BASLA + satirlar + '\n    ' + xml.slice(s);
}

function yaz(yol, icerik) {
  const mevcut = fs.existsSync(yol) ? fs.readFileSync(yol, 'utf8') : null;
  if (mevcut === icerik) return false;
  fs.mkdirSync(path.dirname(yol), { recursive: true });
  fs.writeFileSync(yol, icerik);
  return true;
}

const YOGUNLUKLAR = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const ADAPTIVE_XML = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
  + '    <background android:drawable="@color/ic_launcher_background" />\n'
  + '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n</adaptive-icon>\n';
const ARKA_PLAN_XML = (renk) => '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">' + renk + '</color>\n</resources>\n';

function bayt(yol, icerik) {
  if (fs.existsSync(yol) && fs.readFileSync(yol).equals(icerik)) return false;
  fs.mkdirSync(path.dirname(yol), { recursive: true });
  fs.writeFileSync(yol, icerik);
  return true;
}

// Pırıl logosunu (logo/android/mipmap-*) Capacitor'un varsayılan simgelerinin üstüne yazar; adaptive icon XML'ini kurar.
function logoYamala(ana, logoDizin, degisen) {
  if (!fs.existsSync(path.join(logoDizin, 'mipmap-xxxhdpi', 'ic_launcher.png'))) hataFirlat('logo klasörü eksik: ' + logoDizin + ' (önce python3 logo/uret.py)');
  for (const y of YOGUNLUKLAR) {
    for (const d of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
      const kaynak = path.join(logoDizin, 'mipmap-' + y, d);
      if (!fs.existsSync(kaynak)) continue;
      if (bayt(path.join(ana, 'res', 'mipmap-' + y, d), fs.readFileSync(kaynak))) degisen.push('res/mipmap-' + y + '/' + d);
    }
  }
  for (const d of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    if (yaz(path.join(ana, 'res', 'mipmap-anydpi-v26', d), ADAPTIVE_XML)) degisen.push('res/mipmap-anydpi-v26/' + d);
  }
  if (yaz(path.join(ana, 'res', 'values', 'ic_launcher_background.xml'), ARKA_PLAN_XML('#14343a'))) degisen.push('res/values/ic_launcher_background.xml');
}

// androidDizin: `cap add android` ile üretilen android/ ; yamalarDizin: bu pakettaki yamalar/ ; logoDizin: logo/android (isteğe bağlı)
// Sürüm: Capacitor şablonu app/build.gradle içinde versionName "1.0" / versionCode 1 bırakır;
// package.json sürümü buraya yazılır. versionCode = büyük*10000 + küçük*100 + yama (0.1.2 -> 102).
function surumKodu(surum) {
  const p = String(surum).split('.').map((x) => parseInt(x, 10) || 0);
  return (p[0] || 0) * 10000 + (p[1] || 0) * 100 + (p[2] || 0);
}
function surumYamala(androidDizin, surum, degisen) {
  if (!/^\d+\.\d+\.\d+$/.test(String(surum))) return;
  const yol = path.join(androidDizin, 'app', 'build.gradle');
  if (!fs.existsSync(yol)) return;
  const eski = fs.readFileSync(yol, 'utf8');
  const yeni = eski
    .replace(/versionName\s+"[^"]*"/, `versionName "${surum}"`)
    .replace(/versionCode\s+\d+/, `versionCode ${surumKodu(surum)}`);
  if (yaz(yol, yeni)) degisen.push('app/build.gradle');
}

function yamala({ androidDizin, yamalarDizin, ipler = [], logoDizin, surum }) {
  const ana = path.join(androidDizin, 'app', 'src', 'main');
  const manifestYol = path.join(ana, 'AndroidManifest.xml');
  if (!fs.existsSync(manifestYol)) hataFirlat(manifestYol + ' yok. Önce `npx cap add android` çalıştırın.');
  const degisen = [];

  const nscYol = path.join(ana, 'res', 'xml', 'network_security_config.xml');
  // Mevcut hedefte eklenmiş IP'ler korunur; şablon temel alınır.
  let nsc = fs.readFileSync(path.join(yamalarDizin, 'network_security_config.xml'), 'utf8');
  const onceki = fs.existsSync(nscYol) ? fs.readFileSync(nscYol, 'utf8') : null;
  const korunan = onceki && onceki.includes(IP_BASLA) ? ipBloguOku(onceki) : [];
  if (korunan.length || ipler.length) nsc = ipEkle(nsc, [...korunan, ...ipler]);
  if (yaz(nscYol, nsc)) degisen.push('res/xml/network_security_config.xml');

  const derYol = path.join(ana, 'res', 'xml', 'data_extraction_rules.xml');
  if (yaz(derYol, fs.readFileSync(path.join(yamalarDizin, 'data_extraction_rules.xml'), 'utf8'))) degisen.push('res/xml/data_extraction_rules.xml');

  const manifest = fs.readFileSync(manifestYol, 'utf8');
  const yeni = manifestYamala(manifest, izinleriOku(yamalarDizin));
  if (yaz(manifestYol, yeni)) degisen.push('AndroidManifest.xml');
  if (logoDizin) logoYamala(ana, logoDizin, degisen);
  if (surum) surumYamala(androidDizin, surum, degisen);
  return { degisen };
}

module.exports = { yamala, logoYamala, surumYamala, surumKodu, manifestYamala, YEDEK_OZNITELIKLERI, ipEkle, ipBloguOku, ozelIpv4 };

if (require.main === module) {
  const arg = process.argv.slice(2);
  const al = (ad) => { const i = arg.indexOf(ad); return i >= 0 ? arg[i + 1] : undefined; };
  try {
    const ipler = (al('--ip') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const androidDizin = path.resolve(al('--android') || path.join(__dirname, '..', 'android'));
    const logoDizin = path.join(__dirname, '..', '..', 'logo', 'android');
    const surum = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version;
    const s = yamala({ androidDizin, yamalarDizin: path.join(__dirname, '..', 'yamalar'), ipler, logoDizin: fs.existsSync(logoDizin) ? logoDizin : undefined, surum });
    console.log(s.degisen.length ? 'Yamalandı: ' + s.degisen.join(', ') : 'Zaten yamalı, değişiklik yok.');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
