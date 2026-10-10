import type { AjanAnahtari, AjanGorunumu, AjanIstatistigi, Rapor } from '../types'

export const AJANLAR: readonly AjanAnahtari[] = ['beyin', 'scout', 'implementer', 'verifier']

export const ADLAR: Record<AjanAnahtari, string> = {
  beyin: 'Beyin',
  scout: 'scout',
  implementer: 'implementer',
  verifier: 'verifier',
}

export const VARSAYILAN_MODELLER: Record<AjanAnahtari, string> = {
  beyin: 'claude-opus-5-5',
  scout: 'claude-haiku-5-5',
  implementer: 'claude-sonnet-5-5',
  verifier: 'claude-sonnet-5-5',
}

const EN_FAZLA_GOREV = 50
const EN_FAZLA_DOSYA = 100

export function bosGorunumler(): Record<AjanAnahtari, AjanGorunumu> {
  const sonuc = {} as Record<AjanAnahtari, AjanGorunumu>
  for (const ajan of AJANLAR) {
    sonuc[ajan] = { durum: 'Beklemede', balon: '', model: VARSAYILAN_MODELLER[ajan] }
  }
  return sonuc
}

export function bosIstatistik(): AjanIstatistigi {
  return { cagri: 0, sureMs: 0, token: 0, gorevler: [], dosyalar: [], gecti: 0, kaldi: 0 }
}

export function bosRapor(): Rapor {
  return {
    beyin: bosIstatistik(),
    scout: bosIstatistik(),
    implementer: bosIstatistik(),
    verifier: bosIstatistik(),
  }
}

/** Depodan okunan değeri eksik alanları tamamlayarak rapora çevirir. */
export function raporuOnar(deger: unknown): Rapor {
  const rapor = bosRapor()
  if (typeof deger !== 'object' || deger === null) return rapor
  const kayit = deger as Record<string, Partial<AjanIstatistigi> | undefined>
  for (const ajan of AJANLAR) {
    const eski = kayit[ajan]
    if (eski !== undefined) rapor[ajan] = { ...bosIstatistik(), ...eski }
  }
  return rapor
}

/** `scout`, `proje:scout` gibi alt ajan türlerini panel ajanına eşler. */
export function ajanBul(altAjanTuru: string): AjanAnahtari | undefined {
  const ad = altAjanTuru.split(':').pop()?.trim().toLowerCase()
  if (ad === 'scout' || ad === 'implementer' || ad === 'verifier') return ad
  return undefined
}

export function gorevEkle(istatistik: AjanIstatistigi, gorev: string): AjanIstatistigi {
  const temiz = gorev.trim()
  if (temiz === '') return { ...istatistik, cagri: istatistik.cagri + 1 }
  return {
    ...istatistik,
    cagri: istatistik.cagri + 1,
    gorevler: [...istatistik.gorevler, temiz].slice(-EN_FAZLA_GOREV),
  }
}

export function dosyaEkle(istatistik: AjanIstatistigi, dosya: string): AjanIstatistigi {
  if (istatistik.dosyalar.includes(dosya)) return istatistik
  return { ...istatistik, dosyalar: [...istatistik.dosyalar, dosya].slice(-EN_FAZLA_DOSYA) }
}

/** Verifier'ın cevabındaki hükmü bulur: ilk geçen Geçti ya da Kaldı. */
export function hukumBul(cevap: string): 'Geçti' | 'Kaldı' | undefined {
  const eslesme = /(GEÇTİ|Geçti|geçti|KALDI|Kaldı|kaldı)/.exec(cevap)
  if (eslesme === null) return undefined
  return eslesme[1]!.toLowerCase().startsWith('g') ? 'Geçti' : 'Kaldı'
}

function kisalt(metin: string, uzunluk = 40): string {
  const tek = metin.replace(/\s+/g, ' ').trim()
  return tek.length > uzunluk ? `${tek.slice(0, uzunluk - 1)}…` : tek
}

function dosyaAdi(yol: string): string {
  return yol.split('/').pop() ?? yol
}

/** Bir araç çağrısından karakterin üstündeki kısa Türkçe balonu üretir. */
export function balonMetni(arac: string, girdi: Record<string, unknown>): string {
  const metin = (alan: string) => (typeof girdi[alan] === 'string' ? (girdi[alan] as string) : '')
  switch (arac) {
    case 'Read':
      return `${dosyaAdi(metin('file_path'))} okunuyor`
    case 'Edit':
    case 'MultiEdit':
      return `${dosyaAdi(metin('file_path'))} düzenleniyor`
    case 'Write':
      return `${dosyaAdi(metin('file_path'))} yazılıyor`
    case 'NotebookEdit':
      return `${dosyaAdi(metin('notebook_path'))} düzenleniyor`
    case 'Grep':
      return `"${kisalt(metin('pattern'), 24)}" aranıyor`
    case 'Glob':
      return `${kisalt(metin('pattern'), 24)} dosyaları taranıyor`
    case 'Bash': {
      const komut = metin('command')
      if (/\b(test|jest|vitest|pytest|mocha)\b/.test(komut)) return 'Testler çalışıyor'
      if (/\b(lint|eslint|tsc|ruff)\b/.test(komut)) return 'Lint ve tip kontrolü'
      if (/^\s*git\b/.test(komut)) return 'git ile değişikliğe bakıyor'
      return `Komut: ${kisalt(metin('description') || komut, 30)}`
    }
    case 'Agent':
    case 'Task': {
      const hedef = ajanBul(metin('subagent_type'))
      return hedef === undefined ? 'Alt ajana görev veriyor' : `${hedef} ajanına görev veriyor`
    }
    case 'WebFetch':
      return 'Web sayfası okunuyor'
    case 'WebSearch':
      return `Web'de "${kisalt(metin('query'), 20)}" aranıyor`
    case 'TodoWrite':
      return 'Yapılacaklar güncelleniyor'
    default:
      return `${kisalt(arac, 24)} kullanılıyor`
  }
}

/** Değişen ya da okunan dosyanın yolu, yoksa `undefined`. */
export function dosyaYolu(arac: string, girdi: Record<string, unknown>): string | undefined {
  const alan = arac === 'NotebookEdit' ? 'notebook_path' : 'file_path'
  if (!['Read', 'Edit', 'MultiEdit', 'Write', 'NotebookEdit'].includes(arac)) return undefined
  const yol = girdi[alan]
  return typeof yol === 'string' && yol !== '' ? yol : undefined
}

export function sureYaz(ms: number): string {
  const saniye = Math.round(ms / 1000)
  if (saniye < 60) return `${saniye}sn`
  const dakika = Math.floor(saniye / 60)
  if (dakika < 60) return `${dakika}dk ${saniye % 60}sn`
  return `${Math.floor(dakika / 60)}sa ${dakika % 60}dk`
}

function tokenYaz(token: number): string {
  if (token >= 1_000_000) return `${(token / 1_000_000).toFixed(1)}M`
  if (token >= 1_000) return `${(token / 1_000).toFixed(1)}k`
  return String(token)
}

function liste(ogeler: readonly string[], son = 10): string {
  if (ogeler.length === 0) return '-'
  const gosterilen = ogeler.slice(-son)
  const gizli = ogeler.length - gosterilen.length
  return gosterilen.join(', ') + (gizli > 0 ? ` (+${gizli} daha)` : '')
}

export function raporMetni(rapor: Rapor, gorunumler: Record<AjanAnahtari, AjanGorunumu>): string {
  const satirlar = ['Ajan raporu', '']
  for (const ajan of AJANLAR) {
    const ist = rapor[ajan]
    const birim = ajan === 'beyin' ? 'tur' : 'çağrı'
    satirlar.push(
      `${ADLAR[ajan]} (${gorunumler[ajan].model}): ${ist.cagri} ${birim}, ${sureYaz(ist.sureMs)}, ${tokenYaz(ist.token)} token`,
    )
    satirlar.push(`  Görevler: ${liste(ist.gorevler.map(g => kisalt(g, 60)), 5)}`)
    satirlar.push(`  Dosyalar: ${liste(ist.dosyalar.map(dosyaAdi))}`)
    if (ajan === 'verifier') satirlar.push(`  Geçti: ${ist.gecti}, Kaldı: ${ist.kaldi}`)
    satirlar.push('')
  }
  satirlar.push('Kaydı sıfırlamak için: /rapor temizle')
  return satirlar.join('\n')
}
