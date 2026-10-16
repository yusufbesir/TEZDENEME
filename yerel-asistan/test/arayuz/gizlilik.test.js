'use strict';
// Eşleştirme kodu alanı: tarayıcı/klavye hafızasına ve cihaz depolamasına yazılmamalı.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const kok = path.join(__dirname, '../../arayuz');
const html = fs.readFileSync(path.join(kok, 'index.html'), 'utf8');

test('kod girişi: autocomplete/autocapitalize/autocorrect kapalı, spellcheck=false', () => {
  const girdi = html.match(/<input[^>]*\bid="kod"[^>]*>/);
  assert.ok(girdi, '#kod alanı var');
  for (const oz of ['autocomplete="off"', 'autocapitalize="off"', 'autocorrect="off"', 'spellcheck="false"']) {
    assert.ok(girdi[0].includes(oz), oz);
  }
});

test('eşleştirme kodu cihazda saklanmaz: localStorage/sessionStorage/indexedDB/çerez yalnız çekirdek deposunda, kodla ilişkisiz', () => {
  for (const dosya of fs.readdirSync(kok).filter((a) => /\.js$/.test(a))) {
    const satirlar = fs.readFileSync(path.join(kok, dosya), 'utf8').split('\n');
    satirlar.forEach((satir, i) => {
      if (/sessionStorage|indexedDB|document\.cookie|Preferences|SecureStorage/.test(satir)) assert.fail(`${dosya}:${i + 1} beklenmeyen kalıcı depo`);
      if (/localStorage/.test(satir)) {
        assert.equal(dosya, 'uygulama.js');
        assert.match(satir, /'piril:' \+ a/, `${dosya}:${i + 1}: yalnız çekirdek deposu (anahtar öneki piril:)`);
        assert.ok(!/\bkod\b|PIRIL-/i.test(satir), 'kodla ilişkisiz');
      }
    });
  }
  const uyg = fs.readFileSync(path.join(kok, 'uygulama.js'), 'utf8');
  assert.ok(!/localStorage[^\n]*\$\('kod'\)|\$\('kod'\)[^\n]*(localStorage|setItem)/.test(uyg));
  // kod yalnızca yerel değişkende (bellek) tutulur ve istemciye geçirilir
  assert.match(uyg, /const kod = M\.kodNormallestir\(\$\('kod'\)\.value\)/);
});
