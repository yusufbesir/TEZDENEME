export type AjanAnahtari = 'beyin' | 'scout' | 'implementer' | 'verifier'

export type AjanDurumu = 'Beklemede' | 'Çalışıyor' | 'Bitti' | 'Hata'

export type AjanGorunumu = {
  durum: AjanDurumu
  balon: string
  model: string
}

export type AjanIstatistigi = {
  cagri: number
  sureMs: number
  token: number
  gorevler: string[]
  dosyalar: string[]
  gecti: number
  kaldi: number
}

export type Calisan = {
  ajan: AjanAnahtari
  baslangic: number
  gorev: string
}

export type Rapor = Record<AjanAnahtari, AjanIstatistigi>

declare module 'claude-code' {
  interface PluginState {
    'ajan-paneli': {
      ajanlar: Record<AjanAnahtari, AjanGorunumu>
      rapor: Rapor
      calisanlar: Record<string, Calisan>
      beyinBaslangic: number
    }
  }
}
