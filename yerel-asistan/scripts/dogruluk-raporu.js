'use strict';
// Türkçe doğruluk raporu: test/cekirdek/dogruluk-seti.json'daki her söyleyişi çalıştırır,
// sürüm başına yüzdeyi yazar ve docs/dogruluk-raporu.md'ye bir satır ekler. Kullanıcıya görünmez;
// geliştirme aracıdır. Çalıştırma: npm run dogruluk
const fs = require('node:fs');
const path = require('node:path');
const KOK = path.join(__dirname, '..');
const { calistir, ctxYap } = require(path.join(KOK, 'test/cekirdek/yardimci'));
const SET = JSON.parse(fs.readFileSync(path.join(KOK, 'test/cekirdek/dogruluk-seti.json'), 'utf8'));
const surum = JSON.parse(fs.readFileSync(path.join(KOK, 'package.json'), 'utf8')).version;
const RAPOR = path.join(KOK, 'docs', 'dogruluk-raporu.md');

(async () => {
  const kalan = [];
  const niyetSayim = {};
  for (const [metin, niyet] of SET) {
    const r = await calistir(metin, ctxYap());
    niyetSayim[niyet] = niyetSayim[niyet] || { toplam: 0, dogru: 0 };
    niyetSayim[niyet].toplam++;
    if (r.niyet === niyet) niyetSayim[niyet].dogru++;
    else kalan.push(`"${metin}" beklenen=${niyet} gelen=${r.niyet}`);
  }
  const dogru = SET.length - kalan.length;
  const yuzde = (100 * dogru / SET.length).toFixed(1);
  const tarih = new Date().toISOString().slice(0, 10);
  console.log(`Pırıl ${surum} · ${tarih} · doğruluk %${yuzde} (${dogru}/${SET.length})`);
  for (const [n, s] of Object.entries(niyetSayim).sort()) if (s.dogru !== s.toplam) console.log(`  ${n}: ${s.dogru}/${s.toplam}`);
  for (const k of kalan) console.log('  ✗ ' + k);
  fs.mkdirSync(path.dirname(RAPOR), { recursive: true });
  if (!fs.existsSync(RAPOR)) fs.writeFileSync(RAPOR, '# Pırıl Türkçe doğruluk raporu\n\nSürüm başına, `npm run dogruluk` ile üretilir. Set: `test/cekirdek/dogruluk-seti.json`.\n\n| Tarih | Sürüm | Doğruluk | Doğru/Toplam |\n|---|---|---|---|\n');
  const satir = `| ${tarih} | ${surum} | %${yuzde} | ${dogru}/${SET.length} |\n`;
  const mevcut = fs.readFileSync(RAPOR, 'utf8');
  if (!mevcut.includes(`| ${surum} | %${yuzde} | ${dogru}/${SET.length} |`)) fs.appendFileSync(RAPOR, satir);
  process.exitCode = kalan.length ? 1 : 0;
})();
