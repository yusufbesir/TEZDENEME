import type { AjanAnahtari } from '../types'

// Her karakter 12x12 piksel. '.' saydam; diğer harfler aşağıdaki paletten.
// M ana renk, L açık ton, D koyu ton: her ajanın kendi renginden gelir.
const DESENLER: Record<AjanAnahtari, readonly string[]> = {
  // Beyin: gözlü, kıvrımlı bir beyin yaratığı
  beyin: [
    '..KKKKKKKK..',
    '.KLLMLLMLLK.',
    'KLMMLMMLMMLK',
    'KMLLMLLMLLMK',
    'KMMWKMMWKMMK',
    'KLMWKMMWKMLK',
    'KMMMMMMMMMMK',
    '.KMMKKKKMMK.',
    '..KDMMMMDK..',
    '...KKDDKK...',
    '....KDDK....',
    '...KKKKKK...',
  ],
  // scout: geniş kenarlı şapkalı, dürbünlü kâşif
  scout: [
    '....KKKK....',
    '...KMLLMK...',
    '..KMMMMMMK..',
    'KDDDDDDDDDDK',
    '.KSSSSSSSSK.',
    '.KGGKSSKGGK.',
    '.KGWKKKKGWK.',
    '..KSSKKSSK..',
    '.KMMMLLMMMK.',
    'KSKMMMMMMKSK',
    '..KDDKKDDK..',
    '..KKK..KKK..',
  ],
  // implementer: baretli, anahtarlı usta
  implementer: [
    '...KKKKKK...',
    '..KLMMMMLK..',
    '.KMMMLLMMMK.',
    'KKKKKKKKKKKK',
    '.KSSSSSSSSK.',
    '.KSWKSSWKSK.',
    '.KSSSSSSSSK.',
    '..KSSKKSSK..',
    '.KMMDMMDMMKG',
    'KSKMMMMMMKGG',
    '..KMMKKMMK.G',
    '..KKK..KKK..',
  ],
  // verifier: kasketli, büyüteçli müfettiş
  verifier: [
    '..KKKKKKKK..',
    '.KMMMMMMMMK.',
    '.KLLLLLLLLK.',
    '.KSSSSSSSSK.',
    '.KSWKSSWKSK.',
    '.KSSSSSSSSK.',
    '..KSKKKKSK..',
    '.KMMMMMMKGG.',
    'KSKMMMMKGWWG',
    '..KMMKKKGWWG',
    '..KMMKK.KGGK',
    '..KKK..KKK.K',
  ],
}

const ANA_RENKLER: Record<AjanAnahtari, { M: number; L: number; D: number }> = {
  beyin: { M: 0x8e44ec, L: 0xc39bff, D: 0x5b2a9e },
  scout: { M: 0x2ecc71, L: 0x8ff0b4, D: 0x1b7a43 },
  implementer: { M: 0xf39c12, L: 0xffd27a, D: 0xa8620a },
  verifier: { M: 0x3498db, L: 0x9fd3ff, D: 0x1d5f8f },
}

const ORTAK: Record<string, number> = {
  K: 0x1a1a2e,
  W: 0xffffff,
  S: 0xf1c27d,
  G: 0x9aa0a6,
}

export const BOYUT = 12

/** Pikselin rengi `0xRRGGBB`, saydamsa `undefined`. */
export function piksel(ajan: AjanAnahtari, x: number, y: number): number | undefined {
  const harf = DESENLER[ajan][y]?.[x] ?? '.'
  if (harf === '.') return undefined
  const ana = ANA_RENKLER[ajan]
  if (harf === 'M' || harf === 'L' || harf === 'D') return ana[harf]
  return ORTAK[harf]
}

export function desen(ajan: AjanAnahtari): readonly string[] {
  return DESENLER[ajan]
}

export function anaRenk(ajan: AjanAnahtari): string {
  return hex(ANA_RENKLER[ajan].M)
}

function hex(renk: number): string {
  return `#${renk.toString(16).padStart(6, '0')}`
}

const VARSAYILAN = 0x01000000

/**
 * Terminal için Raster hücreleri: her hücre üst ve alt iki pikseli yarım blokla
 * çizer, böylece 12x12 karakter 12 sütun x 6 satır olur.
 */
export function rasterHucreleri(ajan: AjanAnahtari): { columns: number; rows: number; cells: string } {
  const satir = BOYUT / 2
  const kelimeler = new Uint32Array(BOYUT * satir * 3)
  for (let y = 0; y < satir; y++) {
    for (let x = 0; x < BOYUT; x++) {
      const ust = piksel(ajan, x, y * 2)
      const alt = piksel(ajan, x, y * 2 + 1)
      const i = (y * BOYUT + x) * 3
      if (ust === undefined && alt === undefined) {
        kelimeler.set([0x20, VARSAYILAN, VARSAYILAN], i)
      } else if (ust === undefined) {
        kelimeler.set([0x2584, alt ?? VARSAYILAN, VARSAYILAN], i)
      } else {
        kelimeler.set([0x2580, ust, alt ?? VARSAYILAN], i)
      }
    }
  }
  const baytlar = new Uint8Array(kelimeler.buffer)
  let ikili = ''
  for (const bayt of baytlar) ikili += String.fromCharCode(bayt)

  return { columns: BOYUT, rows: satir, cells: btoa(ikili) }
}

/** Masaüstü, VS Code ve mobil için aynı karakterin SVG'si. */
export function svgKaynagi(ajan: AjanAnahtari): string {
  const kareler: string[] = []
  for (let y = 0; y < BOYUT; y++) {
    for (let x = 0; x < BOYUT; x++) {
      const renk = piksel(ajan, x, y)
      if (renk !== undefined) {
        kareler.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${hex(renk)}"/>`)
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOYUT} ${BOYUT}" shape-rendering="crispEdges">${kareler.join('')}</svg>`
}
