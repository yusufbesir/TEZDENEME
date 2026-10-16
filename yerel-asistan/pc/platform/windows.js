'use strict';
// Windows platform bağdaştırıcısı.
// Güvenlik kuralı: PowerShell yalnız execFile('powershell.exe', [-NoProfile ... -EncodedCommand <b64>]) ile ve SABİT betik
// şablonlarıyla çalışır. Kullanıcı/telefon girdisi (ad, metin, koordinat) betik metnine ASLA eklenmez; PIRIL_* ortam
// değişkeniyle geçer ve betikte doğrulanır/sayıya çevrilir. Bu dosyanın mantığı saf fonksiyonlardır (Linux'ta test edilir);
// Electron/execFile bağımlılıkları olustur() içine enjekte edilir.
const path = require('path');

const SINIR = Object.freeze({
  URL: 2048, AD: 40, SORGU: 100, YAZ: 500, PANO: 100000,
  DERINLIK: 4, SONUC: 20, SONUC_TAVAN: 50, GEZILEN: 20000, ZAMAN_ASIMI: 15000,
  PS_EZAMANLI: 2, PS_KUYRUK: 32, UZAK_SANIYEDE: 20, UZAK_PENCERE_MS: 1000
});

// ---------- Metin normalleştirme ----------
function norm(s) {
  return String(s == null ? '' : s).toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/\s+/g, ' ').trim();
}
const KONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

// ---------- PowerShell sarmalayıcı (saf) ----------
// Dönüş: UTF-16LE base64 (-EncodedCommand biçimi)
function psKodla(betik) {
  if (typeof betik !== 'string' || !betik) throw new Error('Geçersiz betik');
  return Buffer.from(betik, 'utf16le').toString('base64');
}
function psArgs(betik) {
  return ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', psKodla(betik)];
}
// Yalnız PIRIL_ önekli, NUL içermeyen, makul boyutta dize değerleri geçer.
function ortamHazirla(taban, degerler) {
  const env = Object.assign({}, taban || {});
  Object.keys(degerler || {}).forEach((k) => {
    if (!/^PIRIL_[A-Z0-9_]{1,24}$/.test(k)) throw new Error('Geçersiz ortam anahtarı');
    const v = String(degerler[k]);
    if (v.indexOf('\u0000') !== -1 || v.length > 4096) throw new Error('Geçersiz ortam değeri');
    env[k] = v;
  });
  return env;
}

// ---------- Sabit betik şablonları (kullanıcı girdisi içermez) ----------
const CS_GIRDI = [
  'using System; using System.Runtime.InteropServices;',
  'public static class PirilGirdi {',
  '  [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }',
  '  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }',
  '  [StructLayout(LayoutKind.Explicit)] public struct INPUTUNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }',
  '  [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public INPUTUNION u; }',
  '  [DllImport("user32.dll", SetLastError=true)] static extern uint SendInput(uint n, INPUT[] i, int cb);',
  '  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();',
  '  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int n);',
  '  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);',
  '  static void Gonder(INPUT i) { SendInput(1, new INPUT[] { i }, Marshal.SizeOf(typeof(INPUT))); }',
  '  public static void Tus(ushort vk, bool yukari) { INPUT i = new INPUT(); i.type = 1; i.u.ki.wVk = vk; i.u.ki.dwFlags = yukari ? 2u : 0u; Gonder(i); }',
  '  public static void Karakter(ushort ch) { INPUT i = new INPUT(); i.type = 1; i.u.ki.wScan = ch; i.u.ki.dwFlags = 4u; Gonder(i); i.u.ki.dwFlags = 6u; Gonder(i); }',
  '  public static void Fare(uint bayrak) { INPUT i = new INPUT(); i.type = 0; i.u.mi.dwFlags = bayrak; Gonder(i); }',
  '}'
].join('\n');

const ORTAK_BASLIK = '$ErrorActionPreference = "Stop"\n';
const EKLE_TIP = 'Add-Type -TypeDefinition @"\n' + CS_GIRDI + '\n"@\n';

const SABLON = Object.freeze({
  // env: PIRIL_EXE -- yalnız beyaz listeden gelir; betikte yine doğrulanır
  exeAc: ORTAK_BASLIK +
    '$e = $env:PIRIL_EXE\n' +
    'if ([string]::IsNullOrEmpty($e) -or $e -notmatch \'^[A-Za-z0-9_\\-]{1,40}\\.exe$\') { exit 2 }\n' +
    'Start-Process -FilePath $e\n',
  // env: PIRIL_AD -- Başlat menüsü kısayolu: YALNIZ tam ad eşleşmesi (alt dize/joker yok; büyük-küçük harf duyarsız -eq)
  baslatAc: ORTAK_BASLIK +
    '$ad = $env:PIRIL_AD\n' +
    'if ([string]::IsNullOrEmpty($ad) -or $ad.Length -gt 40 -or $ad -notmatch \'^[\\p{L}\\p{N} ._\\-]+$\') { exit 2 }\n' +
    '$kokler = @((Join-Path $env:ProgramData \'Microsoft\\Windows\\Start Menu\\Programs\'), (Join-Path $env:APPDATA \'Microsoft\\Windows\\Start Menu\\Programs\'))\n' +
    '$bulunan = foreach ($k in $kokler) { if (Test-Path -LiteralPath $k) { Get-ChildItem -LiteralPath $k -Recurse -Filter *.lnk -ErrorAction SilentlyContinue | Where-Object { $_.BaseName -eq $ad } } }\n' +
    '$ilk = $bulunan | Select-Object -First 1\n' +
    'if (-not $ilk) { exit 3 }\n' +
    'Start-Process -FilePath $ilk.FullName\n',
  // env: PIRIL_ASAGI, PIRIL_YUKARI (0..50), PIRIL_SESSIZ (0/1). Ortam ses tuşları: 174 azalt, 175 artır, 173 sessiz.
  ses: ORTAK_BASLIK + EKLE_TIP +
    '$a = 0; $y = 0; $s = 0\n' +
    'if (-not [int]::TryParse($env:PIRIL_ASAGI, [ref]$a) -or $a -lt 0 -or $a -gt 50) { exit 2 }\n' +
    'if (-not [int]::TryParse($env:PIRIL_YUKARI, [ref]$y) -or $y -lt 0 -or $y -gt 50) { exit 2 }\n' +
    'if (-not [int]::TryParse($env:PIRIL_SESSIZ, [ref]$s) -or $s -lt 0 -or $s -gt 1) { exit 2 }\n' +
    'function Bas([int]$vk) { [PirilGirdi]::Tus([uint16]$vk, $false); [PirilGirdi]::Tus([uint16]$vk, $true) }\n' +
    'if ($s -eq 1) { Bas 173 } else {\n' +
    '  for ($i = 0; $i -lt $a; $i++) { Bas 174 }\n' +
    '  for ($i = 0; $i -lt $y; $i++) { Bas 175 }\n' +
    '}\n',
  // env: PIRIL_X, PIRIL_Y (0..10000, ekranın on binde biri), PIRIL_DUGME (yok|sol|sag|orta), PIRIL_TIKSAYI (0..2)
  fare: ORTAK_BASLIK + EKLE_TIP +
    '$x = 0; $y = 0; $n = 0\n' +
    'if (-not [int]::TryParse($env:PIRIL_X, [ref]$x) -or $x -lt 0 -or $x -gt 10000) { exit 2 }\n' +
    'if (-not [int]::TryParse($env:PIRIL_Y, [ref]$y) -or $y -lt 0 -or $y -gt 10000) { exit 2 }\n' +
    'if (-not [int]::TryParse($env:PIRIL_TIKSAYI, [ref]$n) -or $n -lt 0 -or $n -gt 2) { exit 2 }\n' +
    '$d = $env:PIRIL_DUGME\n' +
    'if ($d -notin @(\'yok\', \'sol\', \'sag\', \'orta\')) { exit 2 }\n' +
    '[void][PirilGirdi]::SetProcessDPIAware()\n' +
    '$w = [PirilGirdi]::GetSystemMetrics(0); $h = [PirilGirdi]::GetSystemMetrics(1)\n' +
    '[void][PirilGirdi]::SetCursorPos([int][math]::Round(($w - 1) * $x / 10000.0), [int][math]::Round(($h - 1) * $y / 10000.0))\n' +
    '$bas = 0; $bit = 0\n' +
    'if ($d -eq \'sol\') { $bas = 2; $bit = 4 } elseif ($d -eq \'sag\') { $bas = 8; $bit = 16 } elseif ($d -eq \'orta\') { $bas = 32; $bit = 64 }\n' +
    'if ($d -ne \'yok\') { for ($i = 0; $i -lt $n; $i++) { [PirilGirdi]::Fare([uint32]$bas); [PirilGirdi]::Fare([uint32]$bit) } }\n',
  // env: PIRIL_METIN (<=500 karakter; \n = Enter)
  yaz: ORTAK_BASLIK + EKLE_TIP +
    '$m = $env:PIRIL_METIN\n' +
    'if ([string]::IsNullOrEmpty($m) -or $m.Length -gt 500) { exit 2 }\n' +
    'foreach ($c in $m.ToCharArray()) {\n' +
    '  if ($c -eq [char]10) { [PirilGirdi]::Tus([uint16]13, $false); [PirilGirdi]::Tus([uint16]13, $true) }\n' +
    '  elseif ([int]$c -ge 32) { [PirilGirdi]::Karakter([uint16][int]$c) }\n' +
    '}\n',
  // env: PIRIL_VK (virgülle ayrılmış sanal tuş kodları 1..254, en çok 4). Basış sırayla, bırakış tersine.
  tus: ORTAK_BASLIK + EKLE_TIP +
    '$parcalar = @($env:PIRIL_VK -split \',\')\n' +
    'if ($parcalar.Count -lt 1 -or $parcalar.Count -gt 4) { exit 2 }\n' +
    '$kodlar = @()\n' +
    'foreach ($p in $parcalar) { $v = 0; if (-not [int]::TryParse($p, [ref]$v) -or $v -lt 1 -or $v -gt 254) { exit 2 }; $kodlar += $v }\n' +
    'foreach ($v in $kodlar) { [PirilGirdi]::Tus([uint16]$v, $false) }\n' +
    '[array]::Reverse($kodlar)\n' +
    'foreach ($v in $kodlar) { [PirilGirdi]::Tus([uint16]$v, $true) }\n',
  // Girdi yok. Çıktı: tek satır JSON {"yuzde":n,"sarjda":true|false} ya da boş (pil yok)
  pil: ORTAK_BASLIK +
    '$p = Get-CimInstance -ClassName Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1\n' +
    'if ($p) { @{ yuzde = [int]$p.EstimatedChargeRemaining; sarjda = ($p.BatteryStatus -in @(2, 3, 6, 7, 8, 9)) } | ConvertTo-Json -Compress }\n'
});

// ---------- Uygulama kimliği ----------
// TEK tablo: kimlik -> çalıştırılabilir. Kimlik listesi çekirdekte (cekirdek/beceriler/uygulama-ac.js KIMLIKLER) tanımlıdır;
// iki taraf test ile birebir eşitlenir. { exe } = App Paths'te kayıtlı sabit exe adı; { baslat } = Başlat menüsünde TAM ad.
const UYGULAMALAR = Object.freeze({
  calc: Object.freeze({ exe: 'calc.exe' }),
  notepad: Object.freeze({ exe: 'notepad.exe' }),
  paint: Object.freeze({ exe: 'mspaint.exe' }),
  explorer: Object.freeze({ exe: 'explorer.exe' }),
  chrome: Object.freeze({ exe: 'chrome.exe' }),
  firefox: Object.freeze({ exe: 'firefox.exe' }),
  edge: Object.freeze({ exe: 'msedge.exe' }),
  spotify: Object.freeze({ baslat: 'Spotify' }),
  vscode: Object.freeze({ baslat: 'Visual Studio Code' }),
  word: Object.freeze({ exe: 'winword.exe' }),
  excel: Object.freeze({ exe: 'excel.exe' }),
  powerpoint: Object.freeze({ exe: 'powerpnt.exe' }),
  vlc: Object.freeze({ baslat: 'VLC media player' }),
  discord: Object.freeze({ baslat: 'Discord' }),
  whatsapp: Object.freeze({ baslat: 'WhatsApp' })
});

// Dönüş: { tur:'exe', exe } | { tur:'baslat', ad } ; yalnız tablodaki kimlikler (tam, küçük harf) kabul edilir; diğerleri hata
function uygulamaCoz(kimlik) {
  if (typeof kimlik !== 'string' || !/^[a-z]{2,20}$/.test(kimlik) || !Object.prototype.hasOwnProperty.call(UYGULAMALAR, kimlik)) {
    throw new Error('Geçersiz uygulama kimliği');
  }
  const u = UYGULAMALAR[kimlik];
  return u.exe ? { tur: 'exe', exe: u.exe } : { tur: 'baslat', ad: u.baslat };
}

// ---------- URL ----------
// Yalnız http/https; kimlik bilgisi, kontrol karakteri ve aşırı uzunluk reddedilir. Dönüş: normalleştirilmiş href ya da null
function urlDogrula(url) {
  if (typeof url !== 'string') return null;
  const s = url.trim();
  if (!s || s.length > SINIR.URL || KONTROL.test(s) || /\s/.test(s)) return null;
  let u;
  try { u = new URL(s); } catch (e) { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password || !u.hostname) return null;
  return u.href;
}

// ---------- Ses ----------
// Adım başına ~%2 değişir (50 adım = tam aralık). Dönüş: { asagi, yukari, sessiz }
function sesPlani(secenek) {
  const s = secenek || {};
  const tam = (v) => typeof v === 'number' && Number.isFinite(v);
  if (s.sessiz === true) return { asagi: 0, yukari: 0, sessiz: 1 };
  if (tam(s.mutlak)) {
    if (s.mutlak < 0 || s.mutlak > 100) throw new Error('Ses 0-100 arasında olmalı');
    return { asagi: 50, yukari: Math.round(s.mutlak / 2), sessiz: 0 };
  }
  if (tam(s.fark)) {
    if (s.fark < -100 || s.fark > 100) throw new Error('Ses farkı -100..100 olmalı');
    const adim = Math.round(Math.abs(s.fark) / 2);
    return s.fark < 0 ? { asagi: adim, yukari: 0, sessiz: 0 } : { asagi: 0, yukari: adim, sessiz: 0 };
  }
  throw new Error('Ses ayarı belirtilmedi');
}

// ---------- Uzak kontrol (saf doğrulama) ----------
function oran(v, ad) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) throw new Error(ad + ' 0..1 aralığında olmalı');
  return Math.round(v * 10000);
}
const DUGMELER = Object.freeze({ sol: 'sol', sag: 'sag', orta: 'orta', left: 'sol', right: 'sag', middle: 'orta' });

function fareKomutu(x, y) { return { sablon: 'fare', env: { PIRIL_X: oran(x, 'x'), PIRIL_Y: oran(y, 'y'), PIRIL_DUGME: 'yok', PIRIL_TIKSAYI: 0 } }; }
function tikKomutu(x, y, dugme, adet) {
  const d = DUGMELER[dugme == null ? 'sol' : dugme];
  if (!d || typeof dugme === 'object') throw new Error('Geçersiz düğme');
  const n = adet == null ? 1 : adet;
  if (!Number.isInteger(n) || n < 1 || n > 2) throw new Error('Tık sayısı 1 ya da 2 olmalı');
  return { sablon: 'fare', env: { PIRIL_X: oran(x, 'x'), PIRIL_Y: oran(y, 'y'), PIRIL_DUGME: d, PIRIL_TIKSAYI: n } };
}
// Yazılacak metin: dize, 1..500 karakter; \r\n -> \n, sekme -> boşluk, diğer kontrol karakterleri reddedilir
function yazMetniTemizle(metin) {
  if (typeof metin !== 'string') throw new Error('Metin dize olmalı');
  const m = metin.replace(/\r\n?/g, '\n').replace(/\t/g, ' ');
  if (!m || m.length > SINIR.YAZ) throw new Error('Metin 1-' + SINIR.YAZ + ' karakter olmalı');
  if (/[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u2028\u2029]/.test(m)) throw new Error('Metinde izin verilmeyen karakter var');
  return m;
}
function yazKomutu(metin) { return { sablon: 'yaz', env: { PIRIL_METIN: yazMetniTemizle(metin) } }; }

const OZEL_TUSLAR = Object.freeze({
  enter: 13, esc: 27, escape: 27, tab: 9, backspace: 8, delete: 46, del: 46, space: 32, bosluk: 32,
  left: 37, right: 39, up: 38, down: 40, home: 36, end: 35, pageup: 33, pagedown: 34, insert: 45
});
const DEGISTIRICILER = Object.freeze({ ctrl: 17, control: 17, shift: 16, alt: 18 }); // 'win' bilerek yok
function tusKodu(parca) {
  const p = String(parca).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(OZEL_TUSLAR, p)) return OZEL_TUSLAR[p];
  if (/^[a-z]$/.test(p)) return p.toUpperCase().charCodeAt(0);
  if (/^[0-9]$/.test(p)) return p.charCodeAt(0);
  const f = p.match(/^f([1-9]|1[0-2])$/);
  if (f) return 111 + Number(f[1]);
  return null;
}
// "ctrl+c", "enter", "alt+tab" ... Dönüş: { sablon:'tus', env:{PIRIL_VK:'17,67'} }
function tusKomutu(tus) {
  if (typeof tus !== 'string' || !tus || tus.length > 30 || KONTROL.test(tus)) throw new Error('Geçersiz tuş');
  const parcalar = tus.split('+');
  if (parcalar.length > 4) throw new Error('Geçersiz tuş');
  const kodlar = [];
  for (let i = 0; i < parcalar.length; i++) {
    const p = parcalar[i].trim().toLowerCase();
    const son = i === parcalar.length - 1;
    let kod;
    if (!son) { kod = DEGISTIRICILER[p]; } else { kod = tusKodu(p); }
    if (!kod) throw new Error('Geçersiz tuş');
    kodlar.push(kod);
  }
  return { sablon: 'tus', env: { PIRIL_VK: kodlar.join(',') } };
}

// ---------- Dosya arama (fs enjekte; sembolik bağ izlenmez) ----------
function sorguTemizle(sorgu) {
  if (typeof sorgu !== 'string' || KONTROL.test(sorgu)) return '';
  const q = norm(sorgu);
  if (!q || q.length > SINIR.SORGU || /[\\/]/.test(q)) return '';
  return q;
}
// kokler: mutlak klasör yolları. Sembolik bağlantılar/junction'lar, gizli (.) ve AppData klasörleri atlanır.
function dosyaAraYurut(fs, kokler, sorgu, secenek) {
  const sec = secenek || {};
  const q = sorguTemizle(sorgu);
  if (!q) return [];
  const derinlik = Math.min(Math.max(Number.isInteger(sec.derinlik) ? sec.derinlik : SINIR.DERINLIK, 0), SINIR.DERINLIK);
  const enCok = Math.min(Math.max(Number.isInteger(sec.en_cok) ? sec.en_cok : SINIR.SONUC, 1), SINIR.SONUC_TAVAN);
  const sonuc = [];
  let gezilen = 0;
  const kuyruk = [];
  (Array.isArray(kokler) ? kokler : []).forEach((k) => {
    if (typeof k !== 'string' || !path.isAbsolute(k)) return;
    try { if (fs.lstatSync(k).isSymbolicLink()) return; } catch (e) { return; }
    kuyruk.push({ yol: k, d: 0 });
  });
  for (let i = 0; i < kuyruk.length && sonuc.length < enCok && gezilen < SINIR.GEZILEN; i++) {
    const { yol, d } = kuyruk[i];
    let girdiler;
    try { girdiler = fs.readdirSync(yol, { withFileTypes: true }); } catch (e) { continue; }
    for (const g of girdiler) {
      if (++gezilen > SINIR.GEZILEN || sonuc.length >= enCok) break;
      if (g.isSymbolicLink() || g.name.charAt(0) === '.') continue;
      if (g.isDirectory()) {
        if (d < derinlik && !/^(node_modules|appdata)$/i.test(g.name)) kuyruk.push({ yol: path.join(yol, g.name), d: d + 1 });
      } else if (g.isFile() && norm(g.name).indexOf(q) !== -1) {
        sonuc.push(path.join(yol, g.name));
      }
    }
  }
  return sonuc;
}

// ---------- Diğer saf yardımcılar ----------
function pilAyristir(cikti) {
  const s = String(cikti || '').trim();
  if (!s) return {};
  try {
    const o = JSON.parse(s);
    const yuzde = Number(o.yuzde);
    if (!Number.isFinite(yuzde) || yuzde < 0 || yuzde > 100) return {};
    return { pilYuzde: Math.round(yuzde), sarjda: o.sarjda === true };
  } catch (e) { return {}; }
}
function ekranDosyaAdi(tarih) {
  const t = tarih instanceof Date && !isNaN(tarih) ? tarih : new Date();
  const p = (n, u) => String(n).padStart(u || 2, '0');
  return 'Piril-' + t.getFullYear() + p(t.getMonth() + 1) + p(t.getDate()) + '-' + p(t.getHours()) + p(t.getMinutes()) + p(t.getSeconds()) + '.png';
}
function altKlasorMu(kok, yol) {
  const g = path.relative(kok, yol);
  return g === '' || (!g.startsWith('..') && !path.isAbsolute(g));
}

// ---------- Eşzamanlılık ve hız sınırı (saf) ----------
// Aynı anda en çok `enCok` iş çalışır; fazlası kuyruğa girer, kuyruk tavanı aşılırsa reddedilir.
function semaforOlustur(enCok, kuyrukTavan) {
  let calisan = 0;
  const kuyruk = [];
  function sonraki() {
    while (calisan < enCok && kuyruk.length) {
      const is = kuyruk.shift();
      calisan++;
      Promise.resolve().then(is.fn).then(is.coz, is.red).then(() => { calisan--; sonraki(); });
    }
  }
  return {
    calistir(fn) {
      return new Promise((coz, red) => {
        if (kuyruk.length >= kuyrukTavan) { red(new Error('Çok fazla bekleyen işlem')); return; }
        kuyruk.push({ fn, coz, red });
        sonraki();
      });
    },
    durum: () => ({ calisan, bekleyen: kuyruk.length })
  };
}
// Kayan pencere: `pencereMs` içinde en çok `enCok` izin; aşılırsa izin() false döner (sayılmaz).
function hizSiniriOlustur(enCok, pencereMs, simdi) {
  const zamanlar = [];
  return {
    izin() {
      const t = simdi();
      while (zamanlar.length && t - zamanlar[0] >= pencereMs) zamanlar.shift();
      if (zamanlar.length >= enCok) return false;
      zamanlar.push(t);
      return true;
    }
  };
}
// İşleri gelme sırasıyla, birbirini beklettirerek çalıştırır (önceki hata sonrakini engellemez).
function siraOlustur() {
  let son = Promise.resolve();
  return {
    ekle(fn) {
      const p = son.then(fn, fn);
      son = p.then(() => {}, () => {});
      return p;
    }
  };
}

// ---------- Platform nesnesi ----------
// dis: { shell, clipboard, desktopCapturer, screen, app, execFile, fs, os }  (hepsi enjekte edilir)
function olustur(dis) {
  const { shell, clipboard, desktopCapturer, screen, app, execFile, fs, os } = dis;
  const exeYolu = dis.powershell || 'powershell.exe';
  const simdi = typeof dis.simdi === 'function' ? dis.simdi : Date.now;
  const psSemafor = semaforOlustur(SINIR.PS_EZAMANLI, SINIR.PS_KUYRUK);
  const uzakHiz = hizSiniriOlustur(SINIR.UZAK_SANIYEDE, SINIR.UZAK_PENCERE_MS, simdi);
  const uzakSira = siraOlustur();

  function ps(sablonAdi, degerler) {
    const betik = SABLON[sablonAdi];
    if (!betik) return Promise.reject(new Error('Bilinmeyen şablon'));
    const env = ortamHazirla(process.env, degerler);
    const args = psArgs(betik);
    // Aynı anda en çok SINIR.PS_EZAMANLI PowerShell süreci
    return psSemafor.calistir(() => new Promise((coz, red) => {
      execFile(exeYolu, args, { env, timeout: SINIR.ZAMAN_ASIMI, windowsHide: true, maxBuffer: 1 << 20 }, (hata, cikti) => {
        if (hata) { const e = new Error('Komut çalıştırılamadı'); e.kod = hata.code; return red(e); }
        coz(String(cikti || ''));
      });
    }));
  }
  const komutCalistir = (k) => ps(k.sablon, k.env);

  const p = {
    async uygulamaAc(ad) {
      const c = uygulamaCoz(ad);
      if (c.tur === 'exe') { await ps('exeAc', { PIRIL_EXE: c.exe }); return; }
      try { await ps('baslatAc', { PIRIL_AD: c.ad }); } catch (e) {
        if (e.kod === 3) throw new Error('Uygulama bulunamadı');
        throw e;
      }
    },
    async urlAc(url) {
      const href = urlDogrula(url);
      if (!href) throw new Error('Yalnız http/https adresleri açılır');
      await shell.openExternal(href);
    },
    async sesAyarla(secenek) { const pl = sesPlani(secenek); await ps('ses', { PIRIL_ASAGI: pl.asagi, PIRIL_YUKARI: pl.yukari, PIRIL_SESSIZ: pl.sessiz }); },
    async sesKapatAc() { await ps('ses', { PIRIL_ASAGI: 0, PIRIL_YUKARI: 0, PIRIL_SESSIZ: 1 }); },
    async ekranGoruntusu() {
      const ekran = screen.getPrimaryDisplay();
      const ol = ekran.size, f = ekran.scaleFactor || 1;
      const kaynaklar = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.round(ol.width * f), height: Math.round(ol.height * f) } });
      if (!kaynaklar.length) throw new Error('Ekran alınamadı');
      const klasor = path.join(app.getPath('pictures'), 'Pırıl');
      fs.mkdirSync(klasor, { recursive: true });
      const yol = path.join(klasor, ekranDosyaAdi(new Date()));
      fs.writeFileSync(yol, kaynaklar[0].thumbnail.toPNG(), { flag: 'wx' });
      return { yol };
    },
    // Telefona önizleme: { jpg:b64, gen, yuk } (küçültülmüş)
    async ekranOnizleme(enGen) {
      const ekran = screen.getPrimaryDisplay();
      const w = Math.min(Math.max(Number.isInteger(enGen) ? enGen : 960, 160), 1920);
      const h = Math.max(1, Math.round(w * ekran.size.height / ekran.size.width));
      const kaynaklar = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: w, height: h } });
      if (!kaynaklar.length) throw new Error('Ekran alınamadı');
      const boyut = kaynaklar[0].thumbnail.getSize();
      return { jpg: kaynaklar[0].thumbnail.toJPEG(60).toString('base64'), gen: boyut.width, yuk: boyut.height };
    },
    async dosyaAra(sorgu, secenek) {
      const home = os.homedir();
      const adlar = ['documents', 'desktop', 'downloads', 'pictures', 'music', 'videos'];
      const kokler = [];
      adlar.forEach((a) => { try { const y = app.getPath(a); if (y && altKlasorMu(home, y)) kokler.push(y); } catch (e) { /* yoksay */ } });
      return dosyaAraYurut(fs, kokler, sorgu, secenek);
    },
    async panoOku() { return String(clipboard.readText() || '').slice(0, SINIR.PANO); },
    async panoYaz(metin) {
      if (typeof metin !== 'string' || metin.length > SINIR.PANO) throw new Error('Geçersiz pano metni');
      clipboard.writeText(metin);
    },
    async kilitle() {
      await new Promise((coz, red) => execFile('rundll32.exe', ['user32.dll,LockWorkStation'], { windowsHide: true, timeout: 5000 }, (h) => (h ? red(new Error('Kilitlenemedi')) : coz())));
    },
    async sistemBilgisi() {
      const toplam = os.totalmem(), bos = os.freemem();
      const bilgi = { bellekKullanimYuzde: toplam > 0 ? Math.round((toplam - bos) * 100 / toplam) : undefined };
      const cpu = os.cpus();
      if (cpu && cpu[0] && cpu[0].model) bilgi.cpuAdi = String(cpu[0].model).trim();
      try { Object.assign(bilgi, pilAyristir(await ps('pil', {}))); } catch (e) { /* pil bilgisi yoksa atlanır */ }
      return bilgi;
    }
  };

  // Uzak kontrol: yalnız main.js "Uzaktan kontrole izin ver" açıkken çağırır.
  // Saniyede en çok SINIR.UZAK_SANIYEDE uzak işlem (aşılırsa reddedilir); yaz/tus işlemleri sıralıdır.
  const hizKapisi = () => { if (!uzakHiz.izin()) throw new Error('Çok fazla uzak işlem'); };
  const uzak = {
    fareTasi: async (x, y) => { hizKapisi(); await komutCalistir(fareKomutu(x, y)); },
    tikla: async (x, y, dugme, adet) => { hizKapisi(); await komutCalistir(tikKomutu(x, y, dugme, adet)); },
    yaz: async (metin) => { hizKapisi(); const k = yazKomutu(metin); await uzakSira.ekle(() => komutCalistir(k)); },
    tus: async (tus) => { hizKapisi(); const k = tusKomutu(tus); await uzakSira.ekle(() => komutCalistir(k)); }
  };
  return { platform: p, uzak };
}

module.exports = {
  olustur, SINIR, SABLON, UYGULAMALAR, norm, semaforOlustur, hizSiniriOlustur, siraOlustur,
  psKodla, psArgs, ortamHazirla, uygulamaCoz, urlDogrula, sesPlani,
  fareKomutu, tikKomutu, yazKomutu, yazMetniTemizle, tusKomutu, dosyaAraYurut, sorguTemizle, pilAyristir, ekranDosyaAdi
};
