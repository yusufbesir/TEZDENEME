'use strict';
// Test yardımcıları: ham (kütüphanesiz) istemci ve sunucu başlatıcı.
const WebSocket = require('../../protokol/node_modules/ws');
const S = require('../../protokol/sifre');
const { sunucuBaslat } = require('../../protokol/sunucu');

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function kos(kosul, ms = 3000) {
  const bas = Date.now();
  while (Date.now() - bas < ms) {
    if (await kosul()) return true;
    await bekle(10);
  }
  return false;
}

async function sunucu(ek = {}) {
  const { sir, kod } = S.kodUret();
  const s = await sunucuBaslat({
    sir, host: '127.0.0.1', port: 0,
    isleyici: async (metin, ctx) => {
      await ctx.ilerleme('Komut çözümleniyor', 'bitti');
      return { yanit: `tamam: ${metin}`, adimlar: [{ etiket: 'x', durum: 'bitti' }], eylem: null };
    },
    ...ek,
  });
  return { s, sir, kod, url: `ws://127.0.0.1:${s.port}` };
}

// Elle el sıkışan ham istemci.
async function hamBaglan(url, sir, { ri = S.rastgele(16), merhabaGonder = true, gecici, localAddress } = {}) {
  const ws = new WebSocket(url, localAddress ? { localAddress } : undefined);
  const gelen = [];
  let bekleyen = null;
  let kapandi = false;
  let kapanisKodu = null;
  ws.on('message', (d) => { gelen.push(d.toString()); if (bekleyen) { const b = bekleyen; bekleyen = null; b(); } });
  ws.on('close', (kod) => { kapandi = true; kapanisKodu = kod; if (bekleyen) { const b = bekleyen; bekleyen = null; b(); } });
  ws.on('error', () => {});
  await new Promise((r) => ws.once('open', r).once('close', r));
  const sonraki = async (ms = 2000) => {
    if (!gelen.length && !kapandi) await Promise.race([new Promise((r) => { bekleyen = r; }), bekle(ms)]);
    return gelen.shift();
  };
  const o = {
    ws, ri, gelen, sonraki,
    get kapandi() { return kapandi; },
    get kapanisKodu() { return kapanisKodu; },
    kapanmayiBekle: () => kos(() => kapandi),
  };
  if (!merhabaGonder) return o;
  const g = gecici || (await S.geciciUret());
  o.istemciAcik = g.acik;
  ws.send(JSON.stringify({ v: S.SURUM, t: 'merhaba', ri: S.b64Kodla(ri), ek: S.b64Kodla(g.acik) }));
  const m = JSON.parse(await sonraki());
  o.rs = S.b64Coz(m.rs);
  o.sunucuAcik = S.b64Coz(m.ek);
  const k = await S.anahtarlariTuret(sir, ri, o.rs, { ozel: g.ozel, karsiAcik: o.sunucuAcik, istemciAcik: g.acik, sunucuAcik: o.sunucuAcik });
  o.gonderici = new S.Gonderici(k.c2s);
  o.alici = new S.Alici(k.s2c);
  o.gonder = (nesne) => o.gonderici.gonder(nesne, (z) => ws.send(z));
  o.al = async () => { const z = await sonraki(); return z === undefined ? undefined : S.jsonCoz(await o.alici.coz(z)); };
  return o;
}

module.exports = { WebSocket, S, sunucu, hamBaglan, bekle, kos };
