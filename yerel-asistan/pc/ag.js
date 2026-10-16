'use strict';
// LAN IPv4 seçimi (saf; os.networkInterfaces() çıktısı verilir).
// Yalnız özel (RFC1918) adresler; sanal bağdaştırıcılar (WSL, Hyper-V, VirtualBox, VMware, Docker, VPN) elenir.
const SANAL = /vethernet|virtualbox|vmware|vbox|wsl|hyper-v|docker|loopback|tailscale|zerotier|hamachi|tap-|vpn|bluetooth/i;

function ipv4Parcala(ip) {
  const m = typeof ip === 'string' && ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const p = m.slice(1).map(Number);
  return p.every((n) => n <= 255) ? p : null;
}
// 0 en iyi: 192.168/16, 1: 10/8, 2: 172.16/12 ; özel değilse null
function oncelik(ip) {
  const p = ipv4Parcala(ip);
  if (!p) return null;
  if (p[0] === 192 && p[1] === 168) return 0;
  if (p[0] === 10) return 1;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return 2;
  return null;
}
// Dönüş: ip dizesi ya da null
function lanIpSec(arayuzler) {
  const adaylar = [];
  Object.keys(arayuzler || {}).forEach((ad) => {
    if (SANAL.test(ad)) return;
    (arayuzler[ad] || []).forEach((a) => {
      if (!a || a.internal) return;
      if (a.family !== 'IPv4' && a.family !== 4) return;
      const o = oncelik(a.address);
      if (o !== null) adaylar.push({ ip: a.address, o });
    });
  });
  adaylar.sort((x, y) => x.o - y.o);
  return adaylar.length ? adaylar[0].ip : null;
}
module.exports = { lanIpSec, oncelik, ipv4Parcala };
