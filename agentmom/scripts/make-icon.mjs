// Generates the ORIGINAL AgentMom mark (no third-party artwork): a bright core node linked to three satellite nodes on a deep indigo tile.
// Writes src/server/ui/icon.png (256) and src/desktop/assets/agentmom.ico (16/32/48/64/128/256, PNG-compressed). Owner: Claude [IP:AgentMom Faz 11].
// Run: node scripts/make-icon.mjs   (pure Node, no dependencies)
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";

const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// Drawing in unit coordinates 0..1, 4x4 supersampling.
const TILE = [0x1a, 0x1b, 0x3f], CORE = [0x3d, 0xdb, 0xb4], SAT = [[0xff, 0xb4, 0x4d], [0xa7, 0x8b, 0xfa], [0x5c, 0xc8, 0xff]];
const core = [0.5, 0.5], sats = [[0.5, 0.22], [0.25, 0.7], [0.75, 0.7]];
function sample(u, v) {
  // rounded tile
  const r = 0.22, dx = Math.max(Math.abs(u - 0.5) - (0.5 - r), 0), dy = Math.max(Math.abs(v - 0.5) - (0.5 - r), 0);
  if (Math.hypot(dx, dy) > r) return null;
  let col = TILE;
  // links
  for (const [sx, sy] of sats) {
    const px = u - core[0], py = v - core[1], ex = sx - core[0], ey = sy - core[1];
    const t = Math.max(0, Math.min(1, (px * ex + py * ey) / (ex * ex + ey * ey)));
    if (Math.hypot(px - ex * t, py - ey * t) < 0.016) col = [0x7a, 0x82, 0xc8];
  }
  sats.forEach(([sx, sy], i) => { if (Math.hypot(u - sx, v - sy) < 0.075) col = SAT[i]; });
  if (Math.hypot(u - core[0], v - core[1]) < 0.15) col = CORE;
  if (Math.hypot(u - core[0], v - core[1]) < 0.06) col = TILE;
  return col;
}
function render(size) {
  const buf = Buffer.alloc(size * size * 4), S = 4;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const c = sample((x + (sx + 0.5) / S) / size, (y + (sy + 0.5) / S) / size);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
    }
    const o = (y * size + x) * 4;
    if (a) { buf[o] = r / a; buf[o + 1] = g / a; buf[o + 2] = b / a; buf[o + 3] = Math.round((255 * a) / (S * S)); }
  }
  return png(size, buf);
}

const sizes = [16, 32, 48, 64, 128, 256];
const images = sizes.map((s) => render(s));
const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = sizes.map((s, i) => { const e = Buffer.alloc(16); e[0] = s === 256 ? 0 : s; e[1] = s === 256 ? 0 : s; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(images[i].length, 8); e.writeUInt32LE(offset, 12); offset += images[i].length; return e; });
const root = join(import.meta.dirname, "..");
mkdirSync(join(root, "src/desktop/assets"), { recursive: true });
writeFileSync(join(root, "src/desktop/assets/agentmom.ico"), Buffer.concat([head, ...dir, ...images]));
writeFileSync(join(root, "src/server/ui/icon.png"), images[sizes.length - 1]);
console.log("icon written");
