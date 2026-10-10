import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AjanAnahtari, AjanDurumu, AjanGorunumu, Calisan, Rapor } from '../types'
import {
  ADLAR,
  AJANLAR,
  ajanBul,
  balonMetni,
  bosGorunumler,
  bosRapor,
  dosyaEkle,
  dosyaYolu,
  gorevEkle,
  hukumBul,
  raporMetni,
  raporuOnar,
} from './model'
import { anaRenk, rasterHucreleri, svgKaynagi } from './sprites'

const PANEL = 'ajanlar'
const PANEL_BASLIGI = 'Ajanlar'
const DEPO_ANAHTARI = 'rapor'
const EN_FAZLA_CALISAN = 100

const ajanlar = atom({ plugin: 'ajan-paneli', key: 'ajanlar' } as const, bosGorunumler())
const rapor = atom({ plugin: 'ajan-paneli', key: 'rapor' } as const, bosRapor())
const calisanlar = atom({ plugin: 'ajan-paneli', key: 'calisanlar' } as const, {} as Record<string, Calisan>)
const beyinBaslangic = atom({ plugin: 'ajan-paneli', key: 'beyinBaslangic' } as const, 0)

const DURUM_RENGI: Record<AjanDurumu, string> = {
  Beklemede: 'inactive',
  Çalışıyor: 'warning',
  Bitti: 'success',
  Hata: 'error',
}

type Dolar = EngineInterface

async function gorunumDegistir($: Dolar, ajan: AjanAnahtari, degisiklik: Partial<AjanGorunumu>) {
  await update($, ajanlar, hepsi => ({ ...hepsi, [ajan]: { ...hepsi[ajan], ...degisiklik } }))
}

async function raporDegistir($: Dolar, ajan: AjanAnahtari, degistir: (ist: Rapor[AjanAnahtari]) => Rapor[AjanAnahtari]) {
  const yeni = await update($, rapor, hepsi => ({ ...hepsi, [ajan]: degistir(hepsi[ajan]) }))
  await $.store.set(DEPO_ANAHTARI, yeni)
}

async function paneliAc($: Dolar) {
  return $.ui.open({ id: PANEL, title: PANEL_BASLIGI })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'ajanlar',
      description: 'Ajanlar panelini açar (Beyin, scout, implementer, verifier)',
    })
    await $.command.register({
      name: 'rapor',
      description: 'Ajan raporunu gösterir; "/rapor temizle" kaydı sıfırlar',
      argumentHint: '[temizle]',
    })
    const kayitli = await $.store.get(DEPO_ANAHTARI)
    if (kayitli !== undefined) await update($, rapor, () => raporuOnar(kayitli))
    void paneliAc($)

    return next(e)
  })

  on('command.run', { command: 'ajanlar' }, async $ => {
    const acildi = await paneliAc($)

    return {
      text: acildi.isPlaced
        ? 'Ajanlar paneli açıldı.'
        : 'Ajanlar paneli hazır; terminal genişleyince görünecek.',
    }
  })

  on('command.run', { command: 'rapor' }, async ($, e) => {
    if (e.args.trim().toLowerCase() === 'temizle') {
      await update($, rapor, () => bosRapor())
      await $.store.set(DEPO_ANAHTARI, bosRapor())

      return { text: 'Ajan raporu sıfırlandı.' }
    }

    return { text: raporMetni(await read($, rapor), await read($, ajanlar)) }
  })

  // Beyin: ana oturumun her turu
  on('turn.start', async ($, e, next) => {
    const simdi = await $.clock.now()
    await update($, beyinBaslangic, () => simdi)
    await gorunumDegistir($, 'beyin', { durum: 'Çalışıyor', balon: 'Düşünüyor…' })
    await raporDegistir($, 'beyin', ist => gorevEkle(ist, e.text))

    return next(e)
  })

  // scout, implementer, verifier: Agent aracıyla başlatılan alt ajanlar
  on('agent.spawn', async ($, e, next) => {
    const ajan = ajanBul(e.subagentType)
    const sonuc = await next(e)
    if (ajan === undefined) return sonuc

    if (sonuc.deny !== undefined) {
      await gorunumDegistir($, ajan, { durum: 'Hata', balon: 'Başlatılamadı' })
      await raporDegistir($, ajan, ist => gorevEkle(ist, e.description))
      return sonuc
    }

    if (sonuc.agentId !== undefined) {
      const kimlik = sonuc.agentId
      const simdi = await $.clock.now()
      await update($, calisanlar, hepsi => {
        const yeni = { ...hepsi, [kimlik]: { ajan, baslangic: simdi, gorev: e.description } }
        const anahtarlar = Object.keys(yeni)
        for (const eski of anahtarlar.slice(0, Math.max(0, anahtarlar.length - EN_FAZLA_CALISAN))) delete yeni[eski]
        return yeni
      })
    }
    await gorunumDegistir($, ajan, {
      durum: 'Çalışıyor',
      balon: e.description.trim() === '' ? 'Göreve başlıyor' : `Görev: ${e.description.trim()}`,
      model: sonuc.model,
    })
    await raporDegistir($, ajan, ist => gorevEkle(ist, e.description))

    return sonuc
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const arac = String(e.tool)
    const girdi = e as unknown as Record<string, unknown>
    let ajan: AjanAnahtari | undefined
    if (e.agentId === undefined) {
      ajan = 'beyin'
    } else {
      ajan = (await read($, calisanlar))[e.agentId]?.ajan
    }
    if (ajan !== undefined) {
      const kim = ajan
      await gorunumDegistir($, kim, { durum: 'Çalışıyor', balon: balonMetni(arac, girdi) })
      const yol = dosyaYolu(arac, girdi)
      if (yol !== undefined) await raporDegistir($, kim, ist => dosyaEkle(ist, yol))
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const hataMi = e.reason === 'error' || e.reason === 'refusal'
    const token = e.usage === undefined ? 0 : e.usage.input_tokens + e.usage.output_tokens

    if (e.agentId === undefined) {
      const baslangic = await read($, beyinBaslangic)
      const sure = e.durationMs > 0 ? e.durationMs : baslangic > 0 ? (await $.clock.now()) - baslangic : 0
      await gorunumDegistir($, 'beyin', {
        durum: hataMi ? 'Hata' : e.isAborted ? 'Beklemede' : 'Bitti',
        balon: hataMi ? 'Bir hata oluştu' : e.isAborted ? 'Durduruldu' : 'Tur bitti',
        ...(e.usage?.model ? { model: e.usage.model } : {}),
      })
      await raporDegistir($, 'beyin', ist => ({ ...ist, sureMs: ist.sureMs + sure, token: ist.token + token }))
      return next(e)
    }

    const calisan = (await read($, calisanlar))[e.agentId]
    if (calisan === undefined) return next(e)

    const ajan = calisan.ajan
    const sure = e.durationMs > 0 ? e.durationMs : (await $.clock.now()) - calisan.baslangic
    const hukum = ajan === 'verifier' && !hataMi && !e.isAborted ? hukumBul(e.answer) : undefined
    await gorunumDegistir($, ajan, {
      durum: hataMi || e.isAborted ? 'Hata' : 'Bitti',
      balon: hataMi ? 'Bir hata oluştu' : e.isAborted ? 'Durduruldu' : hukum !== undefined ? `Sonuç: ${hukum}` : 'Bitti, özet hazır',
    })
    await raporDegistir($, ajan, ist => ({
      ...ist,
      sureMs: ist.sureMs + sure,
      token: ist.token + token,
      gecti: ist.gecti + (hukum === 'Geçti' ? 1 : 0),
      kaldi: ist.kaldi + (hukum === 'Kaldı' ? 1 : 0),
    }))

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANEL }, async ($, e) => {
    const gorunumler = await read($, ajanlar)
    const genislik = e.props.bodyColumns
    const sutun = genislik >= 40 ? 2 : 1
    const kartGenisligi = Math.max(16, Math.floor((genislik - (sutun - 1)) / sutun))

    const kartlar = AJANLAR.map(ajan => {
      const g = gorunumler[ajan]
      const renk = DURUM_RENGI[g.durum]
      const balonVar = g.durum === 'Çalışıyor' && g.balon !== ''
      let karakter
      if (e.surface === 'terminal') {
        const { Raster } = $.ui.resolve(e)
        karakter = <Raster key={`karakter-${ajan}`} {...rasterHucreleri(ajan)} />
      } else {
        const { Svg } = $.ui.resolve(e)
        karakter = <Svg source={svgKaynagi(ajan)} alt={`${ADLAR[ajan]} karakteri`} width={72} height={72} />
      }
      const { Box, Text } = $.ui.resolve(e)

      return (
        <Box
          key={`kart-${ajan}`}
          flexDirection="column"
          alignItems="center"
          borderStyle="round"
          borderColor={renk}
          paddingX={1}
          width={kartGenisligi}
        >
          {balonVar ? (
            <Box key={`balon-${ajan}`} flexDirection="column" alignItems="center">
              <Box borderStyle="round" paddingX={1}>
                <Text wrap="wrap">{g.balon}</Text>
              </Box>
              <Text dimColor>▼</Text>
            </Box>
          ) : null}
          {karakter}
          <Text bold color={anaRenk(ajan)}>
            {ADLAR[ajan]}
          </Text>
          <Text dimColor>{g.model}</Text>
          <Text color={renk}>● {g.durum}</Text>
        </Box>
      )
    })

    const { Box } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
        {kartlar}
      </Box>
    )
  })
}
