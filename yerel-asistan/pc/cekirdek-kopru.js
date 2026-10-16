'use strict';
// Çekirdek köprüsü (saf; Electron'a bağlı değil, test edilir): ctx kurulumu, komut çalıştırma, telefon işleyicisi
// ve isteğe bağlı yerel LLM (Ollama) bağlantısı. Her şey enjekte edilir.
//
// dis: {
//   modulYukle(klasor, dosya), depo(), platform(), onayIste(aciklama, bag), uzakKontrolAcik(),
//   ilerlemeYayinla(etiket, durum), ayarOku(), fetch, simdi?
// }

// Ayarlarda yerelLlm.etkin === true değilse KAPALI. (Varsayılan: kapalı.)
function yerelLlmEtkinMi(ayar) {
  return !!(ayar && typeof ayar === 'object' && ayar.yerelLlm && typeof ayar.yerelLlm === 'object' && ayar.yerelLlm.etkin === true);
}
function yerelLlmAyarla(ayar, etkin) {
  const yeni = Object.assign({}, ayar);
  yeni.yerelLlm = Object.assign({}, ayar && typeof ayar.yerelLlm === 'object' && ayar.yerelLlm ? ayar.yerelLlm : {}, { etkin: etkin === true });
  return yeni;
}

function kopruOlustur(dis) {
  let llmOnbellek = null;

  // Kapalıyken undefined döner: ctx.yerelLlm yoktur, dolayısıyla hiçbir ağ isteği yapılmaz (fetch'e bile dokunulmaz).
  function yerelLlmAl() {
    let ayar;
    try { ayar = dis.ayarOku(); } catch (e) { return undefined; }
    if (!yerelLlmEtkinMi(ayar)) return undefined;
    const model = typeof ayar.yerelLlm.model === 'string' ? ayar.yerelLlm.model : undefined;
    if (llmOnbellek && llmOnbellek.model === model) return llmOnbellek.fn;
    try {
      const m = dis.modulYukle('cekirdek', 'yerel-llm.js');
      const fn = m.olustur({ fetch: dis.fetch, model });
      llmOnbellek = { model, fn };
      return fn;
    } catch (e) { return undefined; }
  }

  function ctxKur() {
    const ctx = {
      simdi: typeof dis.simdi === 'function' ? dis.simdi : () => new Date(),
      depo: dis.depo(),
      platform: dis.platform(),
      onayIste: dis.onayIste,
      uzakKontrolAcik: () => dis.uzakKontrolAcik() === true
    };
    const llm = yerelLlmAl();
    if (llm) ctx.yerelLlm = llm;
    return ctx;
  }

  async function komutCalistir(metin, ctxEk, ilerlemeTelefon) {
    const { calistir } = dis.modulYukle('cekirdek', 'asistan.js');
    const ctx = Object.assign(ctxKur(), ctxEk || {});
    const sonuc = await calistir(String(metin), ctx);
    // Yalnızca çekirdeğin raporladığı GERÇEK adımlar arayüze iletilir.
    (Array.isArray(sonuc && sonuc.adimlar) ? sonuc.adimlar : []).forEach((a) => {
      const d = a.durum === 'hata' ? 'hata' : 'bitti';
      try { dis.ilerlemeYayinla(a.etiket, d); } catch (e) { /* pencere kapanıyor */ }
      if (typeof ilerlemeTelefon === 'function') { try { ilerlemeTelefon(a.etiket, d); } catch (e) { /* bağlantı kapanmış olabilir */ } }
    });
    return sonuc;
  }

  // Protokol sunucusunun isleyici seçeneği: telefondan gelen komut. kaynak:'telefon' ZORLANIR (ctxEk onu değiştiremez).
  function telefonIsleyici(metin, istemciCtx) {
    const ic = istemciCtx || {};
    const onay = typeof ic.onayIste === 'function' ? ic.onayIste : (a) => dis.onayIste(a, { kaynak: 'telefon' });
    return komutCalistir(metin, { onayIste: onay, kaynak: 'telefon' }, ic.ilerleme);
  }

  return { ctxKur, komutCalistir, telefonIsleyici, yerelLlmAl };
}

module.exports = { kopruOlustur, yerelLlmEtkinMi, yerelLlmAyarla };
