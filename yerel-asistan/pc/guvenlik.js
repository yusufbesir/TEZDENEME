'use strict';
// IPC gönderen doğrulaması ve kaynak denetimi (saf; Electron'a bağlı değil).
const path = require('path');
const { fileURLToPath } = require('url');

const anahtar = (p) => path.resolve(p).toLowerCase();

// url, yalnızca izinli yerel dosyalardan biriyse true (sorgu/parça yok sayılır). file: dışı, uzak ana bilgisayar, UNC reddedilir.
function izinliKaynak(url, izinliYollar) {
  if (typeof url !== 'string' || url.length > 4096) return false;
  let u;
  try { u = new URL(url); } catch (e) { return false; }
  if (u.protocol !== 'file:' || (u.hostname && u.hostname !== '')) return false;
  let yol;
  try { yol = fileURLToPath(u); } catch (e) { return false; }
  const izin = new Set((izinliYollar || []).map(anahtar));
  return izin.has(anahtar(yol));
}
// Ağ isteği engelleyici: file:// YALNIZCA uygulamanın kendi kaynak klasörleri (kokler) içindeki dosyalar için izinli;
// kökler verilmezse file:// reddedilir (kapalı varsayılan). Ek olarak yerel data:image/ ve blob:. UNC/uzak ana bilgisayar,
// kök dışına çıkan yollar (..), kodlanmış eğik çizgi ve çok uzun adresler reddedilir.
function kokIcindeMi(url, kokler) {
  if (typeof url !== 'string' || url.length > 4096 || !Array.isArray(kokler) || !kokler.length) return false;
  let u;
  try { u = new URL(url); } catch (e) { return false; }
  if (u.protocol !== 'file:' || (u.hostname && u.hostname !== '')) return false;
  let yol;
  try { yol = fileURLToPath(u); } catch (e) { return false; }
  const hedef = anahtar(yol);
  return kokler.some((k) => {
    if (typeof k !== 'string' || !path.isAbsolute(k)) return false;
    const kok = anahtar(k);
    const g = path.relative(kok, hedef);
    return g !== '' && !g.startsWith('..') && !path.isAbsolute(g);
  });
}
function istekIzinli(url, kokler) {
  if (typeof url !== 'string') return false;
  if (url.startsWith('file:')) return kokIcindeMi(url, kokler);
  return url.startsWith('data:image/') || url.startsWith('blob:');
}
// event: ipcMain olayı. pencereler: izinli BrowserWindow benzeri nesneler. Dönüş: true/false
function gonderenGecerli(event, pencereler, izinliYollar) {
  try {
    const wc = event && event.sender;
    const f = event && event.senderFrame;
    if (!wc || !f || f !== wc.mainFrame) return false;
    const bizim = (pencereler || []).some((w) => w && !(w.isDestroyed && w.isDestroyed()) && w.webContents === wc);
    return bizim && izinliKaynak(f.url, izinliYollar);
  } catch (e) { return false; }
}
module.exports = { izinliKaynak, istekIzinli, kokIcindeMi, gonderenGecerli };
