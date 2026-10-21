#!/usr/bin/env node
'use strict';
// Arayüz + çekirdek + protokol istemcisini Capacitor'un www/ klasörüne hazırlar.
// Harici paketleyici yok: çekirdek (CommonJS) küçük bir modül sarmalayıcıyla tek dosyaya birleştirilir.
const fs = require('node:fs');
const path = require('node:path');

const ARAYUZ_DOSYALARI = ['index.html', 'stil.css', 'mantik.js', 'karakter.js', 'uygulama.js'];
const PROTOKOL_DOSYALARI = ['sifre.js', 'istemci.js']; // sifre.js önce yüklenir

function hataFirlat(m) { throw new Error('hazirla: ' + m); }

function dosyaOku(yol) {
  try { return fs.readFileSync(yol, 'utf8'); } catch (e) { return hataFirlat(yol + ' okunamadı (' + e.code + ')'); }
}

// ES modülü biçimi tarayıcıda bu sarmalayıcıyla çalışmaz; sessizce bozuk paket üretmek yerine dur.
function esmKontrol(yol, kaynak) {
  if (/^\s*(import\s[^('"]*from\s|import\s+['"]|export\s+(default|const|function|class|\{|async))/m.test(kaynak)) {
    hataFirlat(yol + ' ES-modül biçiminde; yalnızca CommonJS desteklenir.');
  }
}

// Protokol dosyaları sade betik olarak yüklenir (module yoksa window.PirilSifre / PirilIstemci).
// Ortak üst düzey adların (ör. `api`) çakışmaması için her biri IIFE içine alınır.
function protokolSarmala(kaynak) {
  return '(function () {\n' + kaynak + '\n}).call(globalThis);\n';
}

// Yerleşik Node modülleri tarayıcıda yok; yalnızca kesin gerekli olanlar için küçük yer tutucular.
const YERLESIK_YEDEK = {
  'node:crypto': '{ webcrypto: globalThis.crypto }',
  crypto: '{ webcrypto: globalThis.crypto }',
};

function coz(kok, istek, kimden) {
  const taban = path.resolve(path.dirname(kimden), istek);
  const adaylar = [taban, taban + '.js', taban + '.json', path.join(taban, 'index.js')];
  for (const a of adaylar) {
    if (fs.existsSync(a) && fs.statSync(a).isFile()) {
      const gorece = path.relative(kok, a);
      if (gorece.startsWith('..') || path.isAbsolute(gorece)) hataFirlat(istek + ' çekirdek klasörünün dışına çıkıyor.');
      return a;
    }
  }
  return hataFirlat(istek + ' bulunamadı (' + kimden + ' içinde).');
}

// kokDizin altındaki giris dosyasından başlayarak göreli require'ları izleyip tek betik üretir.
function paketle(kokDizin, giris, globalAd) {
  const kok = path.resolve(kokDizin);
  const girisYol = path.join(kok, giris);
  const modller = new Map(); // gorece yol -> kaynak
  const kuyruk = [girisYol];
  while (kuyruk.length) {
    const yol = kuyruk.pop();
    const gorece = path.relative(kok, yol).split(path.sep).join('/');
    if (modller.has(gorece)) continue;
    let kaynak = dosyaOku(yol);
    if (yol.endsWith('.json')) {
      JSON.parse(kaynak);
      kaynak = 'module.exports = ' + kaynak + ';';
    } else {
      esmKontrol(yol, kaynak);
    }
    modller.set(gorece, kaynak);
    const re = /require\(\s*(['"])([^'"]+)\1\s*\)/g;
    let m;
    while ((m = re.exec(kaynak))) {
      const istek = m[2];
      if (istek.startsWith('.')) kuyruk.push(coz(kok, istek, yol));
      else if (!(istek in YERLESIK_YEDEK)) hataFirlat(`${gorece}: tarayıcıda bulunmayan modül "${istek}" gerekiyor.`);
    }
  }
  let cikti = '/* Pırıl çekirdeği: android/scripts/hazirla.js tarafından üretildi. */\n(function () {\n"use strict";\n';
  cikti += 'var tanimlar = {};\nvar onbellek = {};\n';
  cikti += 'var yedek = { ' + Object.entries(YERLESIK_YEDEK).map(([k, v]) => JSON.stringify(k) + ': function () { return ' + v + '; }').join(', ') + ' };\n';
  cikti += 'function yolCoz(kimden, istek) {\n' +
    '  var parcalar = kimden.split("/").slice(0, -1).concat(istek.split("/")), s = [];\n' +
    '  for (var i = 0; i < parcalar.length; i++) {\n' +
    '    if (parcalar[i] === "." || parcalar[i] === "") continue;\n' +
    '    if (parcalar[i] === "..") s.pop(); else s.push(parcalar[i]);\n' +
    '  }\n' +
    '  var yol = s.join("/");\n' +
    '  var adaylar = [yol, yol + ".js", yol + ".json", yol + "/index.js"];\n' +
    '  for (var j = 0; j < adaylar.length; j++) if (tanimlar[adaylar[j]]) return adaylar[j];\n' +
    '  throw new Error("Modül yok: " + istek + " (" + kimden + ")");\n}\n';
  cikti += 'function gerek(ad) {\n  if (onbellek[ad]) return onbellek[ad].exports;\n' +
    '  var mod = onbellek[ad] = { exports: {} };\n' +
    '  tanimlar[ad](mod, mod.exports, function (istek) {\n' +
    '    if (istek.charAt(0) !== ".") { if (yedek[istek]) return yedek[istek](); throw new Error("Modül yok: " + istek); }\n' +
    '    return gerek(yolCoz(ad, istek));\n  });\n  return mod.exports;\n}\n';
  for (const [ad, kaynak] of [...modller.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    cikti += 'tanimlar[' + JSON.stringify(ad) + '] = function (module, exports, require) {\n' + kaynak + '\n};\n';
  }
  cikti += 'globalThis.' + globalAd + ' = gerek(' + JSON.stringify(path.relative(kok, girisYol).split(path.sep).join('/')) + ');\n})();\n';
  return cikti;
}

function kopyala(kaynak, hedef) {
  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  fs.copyFileSync(kaynak, hedef);
}

// kok: yerel-asistan klasörü, cikis: www klasörü
function hazirla({ kok, cikis }) {
  kok = path.resolve(kok);
  cikis = path.resolve(cikis);
  // Güvenlik: yalnızca ".../www" benzeri bir çıkış klasörünü temizleriz; kökü ya da üst klasörleri değil.
  if (cikis === kok || kok.startsWith(cikis + path.sep) || cikis === path.parse(cikis).root) {
    hataFirlat('çıkış klasörü güvenli değil: ' + cikis);
  }
  // Önce her şeyi bellekte hazırla; hata olursa www'ye dokunma.
  const cekirdek = paketle(path.join(kok, 'cekirdek'), 'asistan.js', 'PirilCekirdek');
  const protokol = PROTOKOL_DOSYALARI.map((d) => {
    const kaynak = dosyaOku(path.join(kok, 'protokol', d));
    esmKontrol(d, kaynak);
    return [d, protokolSarmala(kaynak)];
  });
  for (const d of ARAYUZ_DOSYALARI) dosyaOku(path.join(kok, 'arayuz', d));

  // Yalnızca bu betiğin ürettiği dosyaları yeniden yazarız; www içindeki başka şeye dokunmayız.
  fs.mkdirSync(cikis, { recursive: true });
  for (const d of ARAYUZ_DOSYALARI) kopyala(path.join(kok, 'arayuz', d), path.join(cikis, d));
  fs.writeFileSync(path.join(cikis, 'cekirdek.bundle.js'), cekirdek);
  for (const [d, k] of protokol) fs.writeFileSync(path.join(cikis, d), k);
  return { cikis, dosyalar: [...ARAYUZ_DOSYALARI, 'cekirdek.bundle.js', ...PROTOKOL_DOSYALARI] };
}

module.exports = { hazirla, paketle, protokolSarmala };

if (require.main === module) {
  const kok = path.resolve(__dirname, '..', '..');
  try {
    const s = hazirla({ kok, cikis: path.resolve(__dirname, '..', 'www') });
    console.log('www hazır: ' + s.cikis + '\n  ' + s.dosyalar.join('\n  '));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
