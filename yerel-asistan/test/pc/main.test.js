'use strict';
// main.js Electron olmadan yüklenir (sahte 'electron'); yalnız yükleme-zamanı davranışı ve güvenlik ayarlarının varlığı denetlenir.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const MAIN = path.join(__dirname, '..', '..', 'pc', 'main.js');
const kaynak = fs.readFileSync(MAIN, 'utf8');

function sahteElectron(kilitVar) {
  const cagrilar = { quit: 0, pencere: 0, kilit: 0 };
  const noop = () => {};
  const E = {
    app: { requestSingleInstanceLock: () => { cagrilar.kilit++; return kilitVar; }, quit: () => { cagrilar.quit++; }, on: noop, whenReady: () => new Promise(noop), isReady: () => false, getPath: () => '/tmp/x', getVersion: () => '0.1.0', isPackaged: false },
    BrowserWindow: function () { cagrilar.pencere++; }, Tray: function () {}, Menu: { setApplicationMenu: noop, buildFromTemplate: noop }, nativeImage: {},
    ipcMain: { handle: noop }, dialog: {}, shell: {}, session: {}, safeStorage: {}, clipboard: {}, desktopCapturer: {}, screen: {}
  };
  return { E, cagrilar };
}
function yukle(kilitVar) {
  const { E, cagrilar } = sahteElectron(kilitVar);
  const eski = Module._load;
  Module._load = function (istek, ...r) { return istek === 'electron' ? E : eski.call(this, istek, ...r); };
  delete require.cache[MAIN];
  try { require(MAIN); } finally { Module._load = eski; delete require.cache[MAIN]; }
  return cagrilar;
}

test('main.js yüklenir; tek örnek kilidi alınamazsa çıkar ve pencere açmaz', () => {
  const c = yukle(false);
  assert.strictEqual(c.kilit, 1);
  assert.strictEqual(c.quit, 1);
  assert.strictEqual(c.pencere, 0);
});

test('main.js kilit varsa yüklemede hiçbir şey başlatmaz (pencere, dinleme yok)', () => {
  const c = yukle(true);
  assert.strictEqual(c.quit, 0);
  assert.strictEqual(c.pencere, 0);
});

test('güvenlik ayarları kaynakta var: contextIsolation, sandbox, nodeIntegration kapalı, pencere/gezinme/izin reddi, file:// sınırı', () => {
  [/contextIsolation: true/, /nodeIntegration: false/, /sandbox: true/, /webSecurity: true/,
    /setWindowOpenHandler\(\(\) => \(\{ action: 'deny' \}\)\)/, /'will-navigate'/, /setPermissionRequestHandler\(\(_wc, _izin, cb\) => cb\(false\)\)/,
    /onBeforeRequest/, /requestSingleInstanceLock/, /safeStorage\.isEncryptionAvailable\(\)/, /Content-Security-Policy/].forEach((r) => assert.match(kaynak, r));
  assert.doesNotMatch(kaynak, /nodeIntegration: true|contextIsolation: false|sandbox: false|webSecurity: false|enableRemoteModule/);
  assert.doesNotMatch(kaynak, /\beval\(|new Function\(|exec\(|shell\.openExternal|execSync/);
});

test('telefon bağlantısı: sunucu yalnızca telefonBaglantisiAc içinde başlatılır (açılışta dinleme yok)', () => {
  const sayi = (kaynak.match(/sunucuBaslat\(/g) || []).length;
  assert.strictEqual(sayi, 2, 'yalnızca açma işlevinde (ana + yedek port)');
  const baslangic = kaynak.slice(kaynak.indexOf('app.whenReady()'));
  assert.doesNotMatch(baslangic, /telefonBaglantisiAc\(/);
  assert.match(kaynak, /let uzakKontrol = false;/);
});

test('sır düz saklanmaz: safeStorage yoksa dosyaya yazma dalı yok', () => {
  const fn = kaynak.slice(kaynak.indexOf('function sirKaydet'), kaynak.indexOf('function eslestirmeKodu'));
  assert.match(fn.slice(fn.indexOf('function sirKaydet'), fn.indexOf('writeFileSync')), /if \(!safeStorage\.isEncryptionAvailable\(\)\) return false;/);
  const yoksaDali = fn.slice(fn.lastIndexOf('sirKalici = false;'));
  assert.doesNotMatch(yoksaDali, /writeFileSync/);
  assert.match(fn, /encryptString/);
});

test('preload yalnız dar köprü sunar ve ham ipcRenderer sızdırmaz', () => {
  const p = fs.readFileSync(path.join(__dirname, '..', '..', 'pc', 'preload.js'), 'utf8');
  assert.match(p, /exposeInMainWorld\('piril'/);
  ['komutGonder', 'onIlerleme', 'durum'].forEach((a) => assert.match(p, new RegExp(a)));
  assert.doesNotMatch(p, /exposeInMainWorld\([^)]*ipcRenderer\s*[,)]/);
  assert.doesNotMatch(p, /ipcRenderer:/);
});

test('tepsi menüsü: kod yenile, bağlı telefonu kes, IP durumu, Yerel yapay zeka (varsayılan kapalı) ve kod uyarısı kaynakta var', () => {
  [/Eşleştirme kodunu yenile…/, /Bağlı telefonu kes/, /Yerel yapay zeka \(Ollama\) kullan/, /telefonDurumMetni\(t\)/, /eslestirme\.KOD_UYARISI/, /eslestirme\.sirYenile/, /eslestirme\.telefonuKes/,
    /sirKaydet/, /telefonIp: eslestirme\.baglananIp\(sunucu\)/].forEach((r) => assert.match(kaynak, r));
  // yerel LLM yalnızca ayardan açılır; ctx köprüsü ayrı modülde
  assert.match(kaynak, /kopruOlustur\(/);
  assert.doesNotMatch(kaynak, /function ctxKur|yerelLlm:\s*\(/);
  // file:// yalnız kaynak klasörleriyle sınırlı; telefon bağlamı ve onay zaman aşımı modüllerden
  assert.match(kaynak, /istekIzinli\(ayrinti\.url, KAYNAK_KOKLERI\)/);
  assert.match(kaynak, /kaynak: 'telefon'/);
  assert.match(kaynak, /onayYoneticisiOlustur\(/);
  assert.doesNotMatch(kaynak, /onayAcik = true/);
});
