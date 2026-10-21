'use strict';
// Pırıl simgesi: 16x16 piksel çizimi, saf Node ile PNG olarak yazılır (dış bağımlılık yok).
// Özgün çizimdir (üçüncü taraf karakter/kimlik içermez). uyari=true: tepsi uyarı rengi (uzaktan kontrol açık).
const zlib = require('zlib');

const DESEN = [
  '................',
  '.....BBBBBB.....',
  '...BBTTTTTTBB...',
  '..BTTTTTTTTTTB..',
  '..BTWWWTTWWWTB..',
  '.BTTWKWTTWKWTTB.',
  '.BTTWWWTTWWWTTB.',
  '.BTTTTTTTTTTTTB.',
  '.BTTTTMMMMTTTTB.',
  '.BTTTTTTTTTTTTB.',
  '..BTTTTTTTTTTB..',
  '..BTTTTTTTTTTB..',
  '...BBTTTTTTBB...',
  '....BTT..TTB....',
  '....BBB..BBB....',
  '................'
];
const PALET = {
  normal: { T: [64, 207, 196, 255], B: [20, 110, 112, 255], W: [255, 255, 255, 255], K: [16, 36, 48, 255], M: [20, 110, 112, 255] },
  uyari: { T: [255, 176, 32, 255], B: [160, 60, 0, 255], W: [255, 255, 255, 255], K: [16, 36, 48, 255], M: [160, 60, 0, 255] }
};

const CRC_TABLO = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLO[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function blok(tur, veri) {
  const b = Buffer.alloc(12 + veri.length);
  b.writeUInt32BE(veri.length, 0);
  b.write(tur, 4, 'ascii');
  veri.copy(b, 8);
  b.writeUInt32BE(crc32(b.subarray(4, 8 + veri.length)), 8 + veri.length);
  return b;
}
// rgba: Buffer(gen*yuk*4). 8 bit RGBA PNG döner.
function pngKodla(gen, yuk, rgba) {
  if (!Number.isInteger(gen) || !Number.isInteger(yuk) || gen < 1 || yuk < 1 || gen > 4096 || yuk > 4096) throw new Error('Geçersiz boyut');
  if (rgba.length !== gen * yuk * 4) throw new Error('Piksel verisi boyutu uyuşmuyor');
  const ham = Buffer.alloc((gen * 4 + 1) * yuk);
  for (let y = 0; y < yuk; y++) {
    ham[y * (gen * 4 + 1)] = 0; // süzgeç yok
    rgba.copy(ham, y * (gen * 4 + 1) + 1, y * gen * 4, (y + 1) * gen * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(gen, 0); ihdr.writeUInt32BE(yuk, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), blok('IHDR', ihdr), blok('IDAT', zlib.deflateSync(ham, { level: 9 })), blok('IEND', Buffer.alloc(0))]);
}
// boyut: 16'nın katı olması gerekmez; en yakın komşu ile ölçeklenir
function png(boyut, uyari) {
  const renk = uyari ? PALET.uyari : PALET.normal;
  const px = Buffer.alloc(boyut * boyut * 4);
  for (let y = 0; y < boyut; y++) {
    for (let x = 0; x < boyut; x++) {
      const h = DESEN[Math.min(15, Math.floor(y * 16 / boyut))][Math.min(15, Math.floor(x * 16 / boyut))];
      const c = renk[h];
      if (c) { const o = (y * boyut + x) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c[3]; }
    }
  }
  return pngKodla(boyut, boyut, px);
}
module.exports = { png, pngKodla, crc32, DESEN };
