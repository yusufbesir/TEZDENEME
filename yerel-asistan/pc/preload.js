'use strict';
// Dar köprü: sayfaya yalnız window.piril.{komutGonder, onIlerleme, onVade, durum, sohbetAc} verilir. Ham ipcRenderer sızdırılmaz.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('piril', Object.freeze({
  komutGonder(metin) {
    if (typeof metin !== 'string' || metin.length === 0 || metin.length > 500) return Promise.reject(new Error('Geçersiz komut'));
    return ipcRenderer.invoke('piril:komut', metin);
  },
  // cb({ etiket, durum }) ; dönüş: aboneliği iptal eden işlev
  onIlerleme(cb) {
    if (typeof cb !== 'function') return () => {};
    const dinleyici = (_olay, ileti) => {
      if (!ileti || typeof ileti.etiket !== 'string' || typeof ileti.durum !== 'string') return;
      cb({ etiket: ileti.etiket.slice(0, 200), durum: ileti.durum.slice(0, 20) });
    };
    ipcRenderer.on('piril:ilerleme', dinleyici);
    return () => ipcRenderer.removeListener('piril:ilerleme', dinleyici);
  },
  // cb({ tur, metin }) : vadesi gelen hatırlatıcı/alarm (ana süreç bildirimi gösterdikten sonra)
  onVade(cb) {
    if (typeof cb !== 'function') return () => {};
    const dinleyici = (_olay, ileti) => {
      if (!ileti || typeof ileti.metin !== 'string') return;
      cb({ tur: ileti.tur === 'alarm' ? 'alarm' : 'hatirlatici', metin: ileti.metin.slice(0, 500) });
    };
    ipcRenderer.on('piril:vade', dinleyici);
    return () => ipcRenderer.removeListener('piril:vade', dinleyici);
  },
  durum() { return ipcRenderer.invoke('piril:durum'); },
  sohbetAc() { return ipcRenderer.invoke('piril:sohbetAc'); }
}));
