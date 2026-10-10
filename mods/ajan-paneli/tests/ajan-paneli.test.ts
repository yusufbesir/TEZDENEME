import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { ajanBul, balonMetni, hukumBul } from '../hooks/model'
import { BOYUT, desen, rasterHucreleri } from '../hooks/sprites'

const PLUGIN = 'ajan-paneli'
const SURFACES = ['terminal', 'desktop'] as const

function panel(surface: (typeof SURFACES)[number]) {
  return {
    plugin: PLUGIN,
    surface,
    component: 'Pane' as const,
    requestId: 'ajanlar',
    props: {
      title: 'Ajanlar',
      isFocused: false,
      bodyColumns: 48,
      placement: 'dock' as const,
      scroll: { offset: 0, bodyRows: 40 },
      view: {},
    },
  }
}

/** Motorun altını taklit eder: alt ajan başlatma, araç ve tur sonu. */
function motor(on: On) {
  mock.store(on)
  mock.clock(on, { now: 1_000 })
  let sayac = 0
  on('agent.spawn', ($, e) => ({
    model: e.subagentType === 'scout' ? 'claude-haiku-5-5' : 'claude-sonnet-5-5',
    agentId: `ajan-${++sayac}`,
  }))
  on('tool.call', () => ({ result: 'tamam' as never, text: 'tamam' }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
}

let kullanim = 0
function spawn(subagentType: string, description: string) {
  return {
    tool_use_id: `toolu_${++kullanim}`,
    prompt: description,
    description,
    subagentType,
    provider: { plugin: 'engine', tier: 'core' as const },
    parentModel: 'claude-opus-5-5',
    background: false,
    fork: false,
  }
}

describe('model', () => {
  test('alt ajan türleri panel ajanlarına eşlenir', () => {
    expect(ajanBul('scout')).toBe('scout')
    expect(ajanBul('proje:verifier')).toBe('verifier')
    expect(ajanBul('general-purpose')).toBe(undefined)
  })

  test('verifier hükmü cevaptan okunur', () => {
    expect(hukumBul('Sonuç: Geçti\nKanıt: 12 test')).toBe('Geçti')
    expect(hukumBul('KALDI: 2 test kırık')).toBe('Kaldı')
    expect(hukumBul('bilinmiyor')).toBe(undefined)
  })

  test('balonlar Türkçe ve kısa', () => {
    expect(balonMetni('Read', { file_path: '/a/b/index.ts' })).toBe('index.ts okunuyor')
    expect(balonMetni('Bash', { command: 'npm test' })).toBe('Testler çalışıyor')
    expect(balonMetni('Agent', { subagent_type: 'verifier' })).toBe('verifier ajanına görev veriyor')
  })

  test('her karakter 12x12 ve terminalde 12x6 hücre', () => {
    for (const ajan of ['beyin', 'scout', 'implementer', 'verifier'] as const) {
      expect(desen(ajan).length).toBe(BOYUT)
      for (const satir of desen(ajan)) expect(satir.length).toBe(BOYUT)
      const hucreler = rasterHucreleri(ajan)
      expect(hucreler.columns).toBe(12)
      expect(hucreler.rows).toBe(6)
      expect(atob(hucreler.cells).length).toBe(12 * 6 * 12)
    }
  })
})

test('panel dört kartı Beklemede durumunda çizer', async ($, on) => {
  motor(on)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount(panel(surface))
    for (const ad of ['Beyin', 'scout', 'implementer', 'verifier']) {
      expect(await ui.find({ type: 'Text', text: ad })).toBeDefined()
    }
    expect(await ui.find({ text: 'claude-haiku-5-5' })).toBeDefined()
    expect((await ui.findAll({ type: 'Text', text: '● Beklemede' })).length).toBe(4)
    await ui.unmount()
  }
})

test('çalışan ajanın balonu çıkar, bitince Bitti olur', async ($, on) => {
  motor(on)
  const { agentId } = await $.agent.spawn(spawn('scout', 'Giriş kodunu bul'))
  expect(agentId).toBe('ajan-1')

  await $.tool.call({ tool: 'Grep', pattern: 'login', agentId: 'ajan-1' } as never)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount(panel(surface))
    expect(await ui.find({ type: 'Text', text: '"login" aranıyor' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '● Çalışıyor' })).toBeDefined()
    await ui.unmount()
  }

  await $.turn.complete({
    answer: 'Bulgular: src/login.ts:12',
    durationMs: 4_000,
    isAborted: false,
    turnId: 't1',
    agentId: 'ajan-1',
    reason: 'answer',
  })
  const ui = await $.ui.mount(panel('terminal'))
  expect(await ui.find({ type: 'Text', text: '● Bitti' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '"login" aranıyor' })).toBe(undefined)
  await ui.unmount()
})

test('Beyin ana oturumun turlarında çalışır ve biter', async ($, on) => {
  motor(on)
  await $.turn.start({ text: 'Giriş sayfasını düzelt', turnId: 'ana-1' })
  await $.tool.call({ tool: 'Agent', subagent_type: 'scout', description: 'ara', prompt: 'ara' } as never)
  let ui = await $.ui.mount(panel('terminal'))
  expect(await ui.find({ type: 'Text', text: 'scout ajanına görev veriyor' })).toBeDefined()
  await ui.unmount()

  await $.turn.complete({ answer: 'Tamam', durationMs: 9_000, isAborted: false, turnId: 'ana-1', reason: 'answer' })
  ui = await $.ui.mount(panel('desktop'))
  expect(await ui.find({ type: 'Text', text: '● Bitti' })).toBeDefined()
  await ui.unmount()
})

test('alt ajan hata ile biterse Hata gösterilir', async ($, on) => {
  motor(on)
  await $.agent.spawn(spawn('implementer', 'Testi yaz'))
  await $.turn.complete({
    answer: '',
    durationMs: 1_000,
    isAborted: false,
    turnId: 't2',
    agentId: 'ajan-1',
    reason: 'error',
  })
  const ui = await $.ui.mount(panel('desktop'))
  expect(await ui.find({ type: 'Text', text: '● Hata' })).toBeDefined()
  await ui.unmount()
})

test('/rapor çağrı, süre, görev, dosya ve Geçti/Kaldı sayar; /rapor temizle sıfırlar', async ($, on) => {
  motor(on)
  const komut = (args: string) =>
    $.command.run({
      command: 'rapor',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 120 },
    } as never)

  await $.agent.spawn(spawn('implementer', 'Toplama fonksiyonu yaz'))
  await $.tool.call({ tool: 'Write', file_path: '/proje/topla.ts', content: 'x', agentId: 'ajan-1' } as never)
  await $.turn.complete({ answer: 'Değişen dosyalar: topla.ts', durationMs: 65_000, isAborted: false, turnId: 'a', agentId: 'ajan-1', reason: 'answer' })

  await $.agent.spawn(spawn('verifier', 'Toplamayı doğrula'))
  await $.turn.complete({ answer: 'Sonuç: Kaldı', durationMs: 2_000, isAborted: false, turnId: 'b', agentId: 'ajan-2', reason: 'answer' })
  await $.agent.spawn(spawn('verifier', 'Tekrar doğrula'))
  await $.turn.complete({ answer: 'Sonuç: Geçti', durationMs: 3_000, isAborted: false, turnId: 'c', agentId: 'ajan-3', reason: 'answer' })

  const metin = (await komut('')).text ?? ''
  expect(metin).toContain('implementer (claude-sonnet-5-5): 1 çağrı, 1dk 5sn')
  expect(metin).toContain('Toplama fonksiyonu yaz')
  expect(metin).toContain('topla.ts')
  expect(metin).toContain('verifier (claude-sonnet-5-5): 2 çağrı, 5sn')
  expect(metin).toContain('Geçti: 1, Kaldı: 1')

  expect((await komut('temizle')).text).toBe('Ajan raporu sıfırlandı.')
  const bos = (await komut('')).text ?? ''
  expect(bos).toContain('implementer (claude-sonnet-5-5): 0 çağrı')
  expect(bos).toContain('Geçti: 0, Kaldı: 0')
})

test('/ajanlar paneli açar', async ($, on) => {
  motor(on)
  const acilanlar: string[] = []
  on('ui.open', ($, e) => {
    acilanlar.push(e.id)
    return { value: { isPlaced: true as const } }
  })
  const sonuc = await $.command.run({
    command: 'ajanlar',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  } as never)
  expect(sonuc.text).toBe('Ajanlar paneli açıldı.')
  expect(acilanlar).toEqual(['ajanlar'])
})
