'use strict';
// Pırıl PC uygulaması (Electron ana süreç).
// Güvenlik özeti: tek örnek kilidi; contextIsolation+sandbox, nodeIntegration yok; yalnız file:// kaynağı; pencere açma/gezinme/izin
// reddi; IPC yalnız kendi sayfalarımızdan; telefon bağlantısı kapalıyken hiç dinleme yok; eşleştirme sırrı safeStorage ile şifreli.
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, shell, session, safeStorage, clipboard, desktopCapturer, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');

const temizlik = require('./temizlik');
const ikon = require('./ikon');
const { lanIpSec } = require('./ag');
const { izinliKaynak, istekIzinli, gonderenGecerli } = require('./guvenlik');
const { depoOlustur } = require('./depo');
const windows = require('./platform/windows');
const onayModulu = require('./onay');
const eslestirme = require('./eslestirme');
const { kopruOlustur, yerelLlmEtkinMi, yerelLlmAyarla } = require('./cekirdek-kopru');

// Paketli sürümde kopyala.js modülleri pc/ altına koyar; geliştirmede kardeş klasörlerden okunur.
function modulYukle(klasor, dosya) {
  const yerel = path.join(__dirname, klasor);
  return require(fs.existsSync(yerel) ? path.join(yerel, dosya) : path.join(__dirname, '..', klasor, dosya));
}
function arayuzYolu(dosya) {
  const yerel = path.join(__dirname, 'arayuz', dosya);
  return fs.existsSync(yerel) ? yerel : path.join(__dirname, '..', 'arayuz', dosya);
}

const VARSAYILAN_PORT = 47615;
const SOHBET_HTML = arayuzYolu('index.html');
const KARAKTER_HTML = path.join(__dirname, 'karakter.html');
const IZINLI_SAYFALAR = [SOHBET_HTML, KARAKTER_HTML];
// file:// istekleri yalnızca uygulamanın kendi kaynak klasörleri içinde izinlidir (bkz. guvenlik.istekIzinli).
const KAYNAK_KOKLERI = Array.from(new Set([path.dirname(SOHBET_HTML), __dirname]));

let tray = null, sohbetPenceresi = null, karakterPenceresi = null;
let cikiyor = false;
let sunucu = null;               // yalnız "Telefon bağlantısı" açıkken dolu
let sunucuAdres = null;          // 'ip:port'
let uzakKontrol = false;         // asla kalıcı değil: her açılışta kapalı
let sir = null;                  // Uint8Array(32)
let sirKalici = false;
let depo = null;
let platformNesnesi = null;
let uzakNesne = null;

// ---------- Günlük ve ayarlar ----------
const userData = () => app.getPath('userData');
const ayarYolu = () => path.join(userData(), 'ayarlar.json');
function gunluk(olay) {
  try {
    fs.mkdirSync(userData(), { recursive: true });
    fs.appendFileSync(path.join(userData(), 'gunluk.jsonl'), JSON.stringify(Object.assign({ tarih: new Date().toISOString(), surum: app.getVersion() }, olay)) + '\n');
  } catch (e) { /* günlük yazılamazsa sessizce devam */ }
}
function ayarOku() {
  try {
    const a = JSON.parse(fs.readFileSync(ayarYolu(), 'utf8'));
    return a && typeof a === 'object' && !Array.isArray(a) ? a : {};
  } catch (e) { return {}; }
}
function ayarYaz(a) {
  try {
    fs.mkdirSync(userData(), { recursive: true });
    const gecici = ayarYolu() + '.tmp';
    fs.writeFileSync(gecici, JSON.stringify(a, null, 2), { mode: 0o600 });
    fs.renameSync(gecici, ayarYolu());
  } catch (e) { gunluk({ olay: 'ayar_yazilamadi' }); }
}

// ---------- Eşleştirme sırrı ----------
// safeStorage varsa sir.bin içinde şifreli saklanır. Yoksa düz saklama YAPILMAZ: bellekte tutulur, her açılışta yenilenir.
// Dönüş: kalıcı yazıldı mı
function sirKaydet(yeni) {
  if (!safeStorage.isEncryptionAvailable()) return false;
  try {
    fs.mkdirSync(userData(), { recursive: true });
    fs.writeFileSync(path.join(userData(), 'sir.bin'), safeStorage.encryptString(Buffer.from(yeni).toString('base64')), { mode: 0o600 });
    return true;
  } catch (e) { return false; }
}
function sirHazirla() {
  const dosya = path.join(userData(), 'sir.bin');
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const sifreli = fs.readFileSync(dosya);
      const b64 = safeStorage.decryptString(sifreli);
      const ham = Buffer.from(b64, 'base64');
      if (ham.length === 32) { sirKalici = true; return Uint8Array.from(ham); }
    } catch (e) { /* yok ya da çözülemedi: yenisi üretilir */ }
    const yeni = crypto.randomBytes(32);
    sirKalici = sirKaydet(yeni);
    return Uint8Array.from(yeni);
  }
  sirKalici = false;
  return Uint8Array.from(crypto.randomBytes(32));
}
function eslestirmeKodu() { return modulYukle('protokol', 'sifre.js').kodBicimle(sir); }

// ---------- Onay penceresi (riskli beceriler ve uzak kontrol) ----------
// Mantık pc/onay.js içinde (Electron'suz test edilir): aynı anda tek onay, 45 sn zaman aşımı (süre dolunca reddedilir ve
// kilit serbest kalır), iş telefondan geldiyse pencerede yazar, açıkken uzak girdi yok sayılır.
const onayYonetici = onayModulu.onayYoneticisiOlustur({
  goster: (secenek, signal) => {
    const ebeveyn = sohbetPenceresi && !sohbetPenceresi.isDestroyed() && sohbetPenceresi.isVisible() ? sohbetPenceresi : undefined;
    return ebeveyn ? dialog.showMessageBox(ebeveyn, Object.assign({ signal }, secenek)) : dialog.showMessageBox(Object.assign({ signal }, secenek));
  }
});
function onayIste(aciklama, bag) { return onayYonetici.iste(aciklama, bag); }
const telefonOnayIste = (aciklama) => onayIste(aciklama, { kaynak: 'telefon', ip: eslestirme.baglananIp(sunucu) });

// ---------- Çekirdek ----------
// ctx kurulumu, komut çalıştırma ve telefon işleyicisi pc/cekirdek-kopru.js içindedir (Electron'suz test edilir).
function ilerlemeYayinla(etiket, durum) {
  [sohbetPenceresi, karakterPenceresi].forEach((w) => {
    if (w && !w.isDestroyed()) { try { w.webContents.send('piril:ilerleme', { etiket: String(etiket), durum: String(durum) }); } catch (e) { /* kapanıyor */ } }
  });
}
const kopru = kopruOlustur({
  modulYukle, depo: () => depo, platform: () => platformNesnesi, onayIste: (a, b) => onayIste(a, b),
  uzakKontrolAcik: () => uzakKontrol, ilerlemeYayinla, ayarOku, fetch: (...a) => fetch(...a)
});
const komutCalistir = kopru.komutCalistir;

// ---------- Telefon bağlantısı ----------
function uzakIsleyiciler() {
  return onayModulu.uzakIsleyicilerOlustur({
    uzakKontrolAcik: () => uzakKontrol, onayAcik: () => onayYonetici.acikMi(),
    uzak: () => uzakNesne, ekranOnizleme: (gen) => platformNesnesi.ekranOnizleme(gen)
  });
}
async function telefonBaglantisiAc() {
  if (sunucu) return;
  const ip = lanIpSec(os.networkInterfaces());
  if (!ip) { dialog.showErrorBox('Pırıl', 'Yerel ağ (LAN) adresi bulunamadı. Wi-Fi ya da kabloya bağlı olduğunuzdan emin olun.'); return; }
  const { sunucuBaslat } = modulYukle('protokol', 'sunucu.js');
  const ayar = ayarOku();
  const port = Number.isInteger(ayar.port) && ayar.port >= 1024 && ayar.port <= 65535 ? ayar.port : VARSAYILAN_PORT;
  const secenek = (p) => ({
    host: ip, port: p, sir, uzakKontrol,
    isleyici: (metin, istemciCtx) => kopru.telefonIsleyici(metin, istemciCtx),
    onayIste: telefonOnayIste, uzak: uzakIsleyiciler(), log: (m) => gunluk({ olay: 'protokol', ileti: String(m).slice(0, 200) })
  });
  try {
    try { sunucu = await sunucuBaslat(secenek(port)); } catch (e) {
      if (e && e.code === 'EADDRINUSE') sunucu = await sunucuBaslat(secenek(0)); else throw e;
    }
  } catch (e) {
    sunucu = null;
    gunluk({ olay: 'sunucu_baslatilamadi', hata: String(e && e.message).slice(0, 200) });
    dialog.showErrorBox('Pırıl', 'Telefon bağlantısı başlatılamadı.');
    trayGuncelle();
    return;
  }
  sunucuAdres = ip + ':' + sunucu.port;
  gunluk({ olay: 'telefon_baglantisi_acildi', adres: sunucuAdres });
  trayGuncelle();
  kodGoster();
}
async function telefonBaglantisiKapat() {
  const s = sunucu;
  sunucu = null; sunucuAdres = null;
  if (s) { try { await s.kapat(); } catch (e) { /* kapalı */ } gunluk({ olay: 'telefon_baglantisi_kapandi' }); }
  trayGuncelle();
}
function kodGoster() {
  const satirlar = [];
  if (sunucuAdres) satirlar.push('Adres: ' + sunucuAdres);
  satirlar.push('Eşleştirme kodu:', eslestirmeKodu());
  if (!sunucuAdres) satirlar.push('', 'Telefon bağlantısı şu an kapalı; açınca telefon bu kodla bağlanır.');
  if (!sirKalici) satirlar.push('', 'Not: Bu bilgisayarda güvenli depolama yok; kod her açılışta yenilenir.');
  satirlar.push('', eslestirme.KOD_UYARISI);
  dialog.showMessageBox({ type: 'info', title: 'Pırıl: telefon eşleştirme', message: 'Telefonda bu bilgileri girin', detail: satirlar.join('\n'), buttons: ['Tamam'], noLink: true });
}

async function kodYenile() {
  const s = await eslestirme.sirYenile({ onayIste: (a) => onayIste(a), sirUret: () => Uint8Array.from(crypto.randomBytes(32)), sirKaydet, sunucu });
  if (s.durum === 'reddedildi') return;
  if (s.durum !== 'yenilendi') {
    gunluk({ olay: 'kod_yenilenemedi' });
    dialog.showErrorBox('Pırıl', 'Eşleştirme kodu yenilenemedi; eski kod geçerli kalmaya devam ediyor.');
    return;
  }
  sir = s.sir;
  sirKalici = s.kalici;
  gunluk({ olay: 'kod_yenilendi', yontem: s.sunucuYontemi });
  if (s.sunucuYontemi === 'yeniden-baslat') {
    // Sunucu sürümü sırrı yerinde değiştiremiyor: kapatılıp yeni sırla açılır (telefon düşer, yeni kod gösterilir).
    await telefonBaglantisiKapat();
    await telefonBaglantisiAc();
    return;
  }
  trayGuncelle();
  kodGoster();
}
async function bagliTelefonuKes() {
  const ok = await eslestirme.telefonuKes(sunucu);
  gunluk({ olay: 'telefon_kesildi', basarili: ok });
  trayGuncelle();
}
function yerelLlmDegistir() {
  const a = ayarOku();
  ayarYaz(yerelLlmAyarla(a, !yerelLlmEtkinMi(a)));
  gunluk({ olay: 'yerel_llm', etkin: yerelLlmEtkinMi(ayarOku()) });
  trayGuncelle();
}
function telefonDurumu() {
  return { sunucuVar: !!sunucu, bagli: !!(sunucu && sunucu.aktifOturumVar()), ip: eslestirme.baglananIp(sunucu) };
}

// ---------- Uzaktan kontrol ----------
async function uzakKontrolDegistir() {
  if (uzakKontrol) { uzakKontrol = false; } else {
    const ok = await onayIste('Telefon, bu bilgisayarın farenizi ve klavyenizi kullanmasına izin verilecek. Yalnızca eşleştirilmiş telefonunuz bunu yapabilir. İstediğiniz an tepsi menüsünden kapatabilirsiniz.');
    if (!ok) { trayGuncelle(); return; }
    uzakKontrol = true;
  }
  if (sunucu) sunucu.uzakKontrolAyarla(uzakKontrol);
  gunluk({ olay: 'uzak_kontrol', acik: uzakKontrol });
  trayGuncelle();
}

// ---------- Pencereler ----------
function webTercihleri() {
  return {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true,
    allowRunningInsecureContent: false, webviewTag: false, spellcheck: false, navigateOnDragDrop: false,
    devTools: !app.isPackaged
  };
}
function sohbetGoster() {
  if (!sohbetPenceresi || sohbetPenceresi.isDestroyed()) {
    sohbetPenceresi = new BrowserWindow({
      width: 440, height: 680, minWidth: 340, minHeight: 420, show: false, title: 'Pırıl', autoHideMenuBar: true,
      icon: nativeImage.createFromBuffer(ikon.png(256, false)), webPreferences: webTercihleri()
    });
    sohbetPenceresi.setMenuBarVisibility(false);
    sohbetPenceresi.on('close', (e) => { if (!cikiyor) { e.preventDefault(); sohbetPenceresi.hide(); } });
    sohbetPenceresi.once('ready-to-show', () => sohbetPenceresi.show());
    sohbetPenceresi.loadFile(SOHBET_HTML, { query: { mod: 'pc' } }).catch(() => {});
    return;
  }
  sohbetPenceresi.show();
  sohbetPenceresi.focus();
}
function sohbetDegistir() {
  if (sohbetPenceresi && !sohbetPenceresi.isDestroyed() && sohbetPenceresi.isVisible()) sohbetPenceresi.hide(); else sohbetGoster();
}
function karakterKur() {
  const alan = screen.getPrimaryDisplay().workArea;
  const boy = 128;
  const ayar = ayarOku();
  const k = ayar.konum;
  const gecerli = k && Number.isInteger(k.x) && Number.isInteger(k.y) && screen.getAllDisplays().some((d) => k.x >= d.bounds.x && k.y >= d.bounds.y && k.x + boy <= d.bounds.x + d.bounds.width && k.y + boy <= d.bounds.y + d.bounds.height);
  karakterPenceresi = new BrowserWindow({
    width: boy, height: boy, x: gecerli ? k.x : alan.x + alan.width - boy - 24, y: gecerli ? k.y : alan.y + alan.height - boy - 24,
    frame: false, transparent: true, resizable: false, maximizable: false, minimizable: false, fullscreenable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, focusable: false, show: false, title: 'Pırıl karakter',
    webPreferences: webTercihleri()
  });
  karakterPenceresi.setAlwaysOnTop(true, 'floating');
  karakterPenceresi.once('ready-to-show', () => karakterPenceresi.showInactive());
  let zaman = null;
  karakterPenceresi.on('moved', () => {
    clearTimeout(zaman);
    zaman = setTimeout(() => {
      if (karakterPenceresi && !karakterPenceresi.isDestroyed()) { const [x, y] = karakterPenceresi.getPosition(); const a = ayarOku(); a.konum = { x, y }; ayarYaz(a); }
    }, 500);
  });
  karakterPenceresi.loadFile(KARAKTER_HTML).catch(() => {});
}

// ---------- Tepsi ----------
let sonTrayImzasi = '';
function trayGuncelle() {
  if (!tray) return;
  const t = telefonDurumu();
  sonTrayImzasi = eslestirme.durumImzasi(t) + '|' + uzakKontrol + '|' + yerelLlmEtkinMi(ayarOku());
  tray.setImage(nativeImage.createFromBuffer(ikon.png(32, uzakKontrol)));
  tray.setToolTip((uzakKontrol ? 'Pırıl: UZAKTAN KONTROL AÇIK' : 'Pırıl') + (t.bagli ? '\n' + eslestirme.telefonDurumMetni(t) : ''));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Göster', click: () => sohbetGoster() },
    { label: 'Telefon bağlantısı', type: 'checkbox', checked: !!sunucu, click: () => (sunucu ? telefonBaglantisiKapat() : telefonBaglantisiAc()) },
    { label: eslestirme.telefonDurumMetni(t), enabled: false },
    { label: 'Bağlı telefonu kes', enabled: t.bagli, click: () => bagliTelefonuKes() },
    { label: 'Uzaktan kontrole izin ver', type: 'checkbox', checked: uzakKontrol, click: () => uzakKontrolDegistir() },
    { label: 'Eşleştirme kodunu göster', click: () => kodGoster() },
    { label: 'Eşleştirme kodunu yenile…', click: () => kodYenile() },
    { type: 'separator' },
    { label: 'Yerel yapay zeka (Ollama) kullan', type: 'checkbox', checked: yerelLlmEtkinMi(ayarOku()), click: () => yerelLlmDegistir() },
    { label: 'Eski sürüm temizliği klasörünü seç…', click: () => temizlikKlasoruSec() },
    { type: 'separator' },
    { label: 'Çıkış', click: () => { cikiyor = true; app.quit(); } }
  ]));
}
// Telefon bağlanıp ayrılınca menü kendiliğinden yenilenir (durum değiştiyse).
function trayIzle() {
  setInterval(() => {
    const t = telefonDurumu();
    if (eslestirme.durumImzasi(t) + '|' + uzakKontrol + '|' + yerelLlmEtkinMi(ayarOku()) !== sonTrayImzasi) trayGuncelle();
  }, 3000);
}
function trayKur() {
  tray = new Tray(nativeImage.createFromBuffer(ikon.png(32, false)));
  tray.on('click', () => sohbetDegistir());
  trayGuncelle();
}

// ---------- Eski sürüm temizliği ----------
function temizlikKlasoru(a) {
  if (typeof a.temizlikKlasoru === 'string' && path.isAbsolute(a.temizlikKlasoru)) return a.temizlikKlasoru;
  const tasinabilir = process.env.PORTABLE_EXECUTABLE_DIR;
  return typeof tasinabilir === 'string' && path.isAbsolute(tasinabilir) ? tasinabilir : null;
}
async function temizlikKlasoruSec() {
  const r = await dialog.showOpenDialog({ title: 'Kurulum dosyalarının (Piril-Kurulum-*.exe) bulunduğu klasör', properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return;
  const a = ayarOku(); a.temizlikKlasoru = r.filePaths[0]; ayarYaz(a);
}
// Önce yeni sürümün SHA256'sı doğrulanır; yoksa/hatalıysa hiçbir şey silinmez. Silme = geri dönüşüm kutusu. Sonuç günlüğe yazılır.
async function klasoruTemizle(klasor) {
  const kayit = (k) => gunluk(Object.assign({ olay: 'temizlik' }, k));
  const d = temizlik.sha256Dogrula(klasor, app.getVersion(), fs);
  if (d.durum !== 'dogrulandi') {
    kayit({ durum: 'silinmedi', neden: d.durum === 'hatali' ? 'sha256 uyuşmuyor' : 'doğrulanamadı (SHA256.txt yok ya da mevcut sürüm listede yok)', ad: d.ad });
    return null;
  }
  const liste = temizlik.tara(klasor, app.getVersion(), fs);
  return temizlik.temizle(liste, (p) => shell.trashItem(p), { fs, klasor, kayit });
}
// Sürüm yükseldiyse (açılış doğrulandıktan sonra) çalışır; ilk çalıştırmada yalnız sürüm yazılır.
async function baslangicTemizligi() {
  const a = ayarOku();
  const simdi = app.getVersion();
  const guncellendi = typeof a.sonCalisanSurum === 'string' && temizlik.surumKarsilastir(a.sonCalisanSurum, simdi) < 0;
  a.sonCalisanSurum = simdi;
  ayarYaz(a);
  const klasor = temizlikKlasoru(a);
  if (!guncellendi || !klasor) return;
  try {
    const sonuc = await klasoruTemizle(klasor);
    gunluk({ olay: 'temizlik_ozet', silinen: sonuc ? sonuc.filter((r) => r.durum === 'silindi').length : 0, dogrulandi: sonuc !== null });
  } catch (e) { gunluk({ olay: 'temizlik_hata', hata: String(e && e.message).slice(0, 200) }); }
}

// ---------- Güvenlik ----------
function guvenlikKur() {
  app.on('web-contents-created', (_olay, wc) => {
    wc.setWindowOpenHandler(() => ({ action: 'deny' }));
    wc.on('will-navigate', (e) => e.preventDefault());
    wc.on('will-redirect', (e) => e.preventDefault());
    wc.on('will-attach-webview', (e) => e.preventDefault());
  });
  const oturum = session.defaultSession;
  oturum.setPermissionRequestHandler((_wc, _izin, cb) => cb(false));
  oturum.setPermissionCheckHandler(() => false);
  if (oturum.setDevicePermissionHandler) oturum.setDevicePermissionHandler(() => false);
  // Yalnız uygulamanın kendi kaynak klasöründeki file:// kaynakları: diğer tüm ağ/dosya istekleri iptal edilir.
  oturum.webRequest.onBeforeRequest((ayrinti, cb) => cb({ cancel: !istekIzinli(ayrinti.url, KAYNAK_KOKLERI) }));
  oturum.webRequest.onHeadersReceived((ayrinti, cb) => {
    const baslik = Object.assign({}, ayrinti.responseHeaders);
    baslik['Content-Security-Policy'] = ["default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"];
    cb({ responseHeaders: baslik });
  });
}
function ipcKur() {
  const pencereler = () => [sohbetPenceresi, karakterPenceresi];
  const dogru = (event) => gonderenGecerli(event, pencereler(), IZINLI_SAYFALAR);
  ipcMain.handle('piril:komut', async (event, metin) => {
    if (!dogru(event)) throw new Error('Yetkisiz gönderen');
    if (typeof metin !== 'string' || !metin || metin.length > 500) throw new Error('Geçersiz komut');
    const s = await komutCalistir(metin);
    return { yanit: String(s.yanit || ''), adimlar: Array.isArray(s.adimlar) ? s.adimlar.map((a) => ({ etiket: String(a.etiket), durum: a.durum === 'hata' ? 'hata' : 'bitti' })) : [], eylem: s.eylem == null ? null : JSON.parse(JSON.stringify(s.eylem)), niyet: String(s.niyet || ''), riskli: !!s.riskli };
  });
  ipcMain.handle('piril:durum', (event) => {
    if (!dogru(event)) throw new Error('Yetkisiz gönderen');
    return { mod: 'pc', surum: app.getVersion(), telefonBaglantisi: !!sunucu, telefonBagli: !!(sunucu && sunucu.aktifOturumVar()), telefonIp: eslestirme.baglananIp(sunucu), uzakKontrol };
  });
  ipcMain.handle('piril:sohbetAc', (event) => {
    if (!dogru(event)) throw new Error('Yetkisiz gönderen');
    sohbetGoster();
  });
}

// ---------- Başlangıç ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (app.isReady()) sohbetGoster(); });
  app.on('window-all-closed', () => { /* tepside çalışmaya devam eder */ });
  app.on('before-quit', () => { cikiyor = true; if (sunucu) { try { sunucu.kapat(); } catch (e) { /* kapanıyor */ } } });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    guvenlikKur();
    sir = sirHazirla();
    depo = depoOlustur(path.join(userData(), 'depo.json'), fs);
    const w = windows.olustur({ shell, clipboard, desktopCapturer, screen, app, execFile, fs, os });
    platformNesnesi = w.platform;
    uzakNesne = w.uzak;
    ipcKur();
    trayKur();
    trayIzle();
    karakterKur();
    sohbetGoster();
    // Açılış tamamlandıktan sonra (sayfa yüklendi) eski sürüm temizliği
    sohbetPenceresi.webContents.once('did-finish-load', () => { baslangicTemizligi().catch(() => {}); });
  });
}
