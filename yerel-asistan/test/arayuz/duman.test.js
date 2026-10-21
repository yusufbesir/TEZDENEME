'use strict';
// Playwright duman testi: index.html'i file:// ile açar, ekran görüntüsü alır.
// playwright kurulumu/indirmesi yapılmaz; global kurulum ve /opt/pw-browsers/chromium varsa çalışır, yoksa atlanır.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execSync } = require('node:child_process');

const CHROMIUM = '/opt/pw-browsers/chromium';
function playwrightBul() {
  try {
    const kok = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return createRequire(path.join(kok, 'x.js'))('playwright');
  } catch (e) { return null; }
}
const pw = fs.existsSync(CHROMIUM) ? playwrightBul() : null;
const INDEX = 'file://' + path.resolve(__dirname, '../../arayuz/index.html');
const PNG = path.resolve(__dirname, '../../arayuz/onizleme.png');

test('arayüz duman testi (Chromium)', { skip: pw ? false : 'playwright veya Chromium yok' }, async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const tarayici = await pw.chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
  try {
    const sayfa = await tarayici.newPage({ viewport: { width: 420, height: 760 } });
    const istekler = [];
    const hatalar = [];
    sayfa.on('request', (r) => istekler.push(r.url()));
    sayfa.on('pageerror', (e) => hatalar.push(String(e)));
    sayfa.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
    // Sahte preload köprüsü: gerçek adımları döndürür (yapay bekleme yok).
    await sayfa.addInitScript(() => {
      window.piril = {
        komutGonder: async (metin) => (metin === 'sade'
          ? { yanit: 'Tamam, ses 30 yapıldı.', adimlar: [], eylem: null, niyet: 'ses', riskli: false }
          : {
            yanit: 'Üç dosya buldum.',
            adimlar: [
              { etiket: 'Komut çözümleniyor', durum: 'bitti' },
              { etiket: 'Dosyalar aranıyor', durum: 'bitti' },
              { etiket: 'Sonuçlar sıralanıyor', durum: 'bitti' },
            ],
            eylem: null, niyet: 'dosya_ara', riskli: false,
          }),
      };
    });
    await sayfa.goto(INDEX + '?mod=pc');

    assert.equal(await sayfa.locator('#karakter svg').count(), 1);
    assert.match(await sayfa.locator('#karakter svg').getAttribute('aria-label'), /Pırıl/);
    assert.equal(await sayfa.locator('#adimlar').isVisible(), false, 'başlangıçta adım listesi yok');
    assert.equal(await sayfa.locator('#mikrofon').count(), 1);
    assert.equal(await sayfa.locator('#sekme-uzak').isVisible(), false);

    // Adımsız komut: liste hiç çıkmaz
    await sayfa.fill('#yazi', 'sade');
    await sayfa.press('#yazi', 'Enter');
    await sayfa.waitForFunction(() => document.getElementById('yanit').textContent.includes('ses 30'));
    assert.equal(await sayfa.locator('#adimlar').isVisible(), false);

    // Adımlı komut: gerçek sırayla, tikli
    await sayfa.fill('#yazi', 'dosya ara');
    await sayfa.press('#yazi', 'Enter');
    await sayfa.waitForFunction(() => document.querySelectorAll('#adimlar li.bitti').length === 3);
    const etiketler = await sayfa.locator('#adimlar .etiket').allTextContents();
    assert.deepEqual(etiketler, ['Komut çözümleniyor', 'Dosyalar aranıyor', 'Sonuçlar sıralanıyor']);
    assert.equal(await sayfa.locator('#karakter svg').getAttribute('data-durum'), 'bitti');
    assert.equal(await sayfa.locator('#yanit').textContent(), 'Üç dosya buldum.');

    await sayfa.waitForTimeout(250); // animasyon bitsin
    await sayfa.screenshot({ path: PNG });
    assert.ok(fs.statSync(PNG).size > 1000);

    assert.deepEqual(hatalar, []);
    const dis = istekler.filter((u) => !u.startsWith('file://') && !u.startsWith('data:') && !u.startsWith('blob:'));
    assert.deepEqual(dis, [], 'dış ağ isteği yok');

    // Telefon modu: bağlı değil şeridi, bilgisayara bağlan sekmesi
    const tel = await tarayici.newPage({ viewport: { width: 420, height: 760 } });
    await tel.goto(INDEX + '?mod=telefon');
    assert.equal(await tel.locator('#baglanti-seridi').textContent(), 'Bağlı değil');
    assert.equal(await tel.locator('#sekme-baglanti').isVisible(), true);
    assert.equal(await tel.locator('#sekme-uzak').isVisible(), false);
    await tel.click('#sekme-baglanti');
    await tel.fill('#adres', '8.8.8.8:80');
    await tel.fill('#kod', 'PIRIL-AAAAAAAA-BBBBBBBB-CCCCCCCC-DDDDDDDD-EEEEEEE');
    await tel.click('#baglan');
    assert.match(await tel.locator('#baglanti-bilgi').textContent(), /yerel ağ/);
  } finally {
    await tarayici.close();
  }
});
