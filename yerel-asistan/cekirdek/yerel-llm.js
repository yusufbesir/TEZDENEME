'use strict';
// İsteğe bağlı yerel Ollama istemcisi. Yalnızca http://127.0.0.1:11434.
// fetch ENJEKTE edilir; global ağ kullanılmaz. Ağ yoksa/hata olursa null döner.

const IZINLI_SUNUCULAR = Object.freeze(['127.0.0.1']);
const IZINLI_PORT = '11434';
const ZAMAN_ASIMI_MS = 20000;
const SISTEM_ISTEMI =
  'Sen Pırıl adlı yerel bir Türkçe asistansın. Kısa ve net Türkçe yanıt ver. ' +
  'Komut çalıştırdığını veya dosyalara eriştiğini iddia etme.';

function sunucuDogrula(sunucu) {
  let u;
  try {
    u = new URL(sunucu);
  } catch (e) {
    throw new Error('Geçersiz sunucu adresi');
  }
  if (u.protocol !== 'http:' || !IZINLI_SUNUCULAR.includes(u.hostname) || (u.port || '80') !== IZINLI_PORT
    || u.username || u.password || (u.pathname !== '/' && u.pathname !== '') || u.search || u.hash) {
    throw new Error('Yalnızca http://127.0.0.1:11434 kullanılabilir');
  }
  return 'http://127.0.0.1:11434';
}

// olustur({ fetch, sunucu?, model?, zamanAsimiMs? }) -> async (metin) -> string | null
function olustur(secenek) {
  const o = secenek || {};
  const taban = sunucuDogrula(o.sunucu || 'http://127.0.0.1:11434');
  const model = o.model || 'llama3.2';
  if (!/^[A-Za-z0-9._:/-]{1,80}$/.test(model)) throw new Error('Geçersiz model adı');
  const fetchFn = o.fetch;
  const sure = Math.min(Number(o.zamanAsimiMs) > 0 ? Number(o.zamanAsimiMs) : ZAMAN_ASIMI_MS, ZAMAN_ASIMI_MS);

  return async function yerelLlm(metin) {
    if (typeof fetchFn !== 'function') return null;
    if (typeof metin !== 'string' || !metin.trim()) return null;
    const ac = new AbortController();
    const zamanlayici = setTimeout(() => ac.abort(), sure);
    try {
      const res = await fetchFn(taban + '/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        redirect: 'error',
        signal: ac.signal,
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: 'system', content: SISTEM_ISTEMI },
            { role: 'user', content: metin.slice(0, 2000) },
          ],
        }),
      });
      if (!res || !res.ok) return null;
      const veri = await res.json();
      const icerik = veri && veri.message && veri.message.content;
      if (typeof icerik !== 'string' || !icerik.trim()) return null;
      return icerik.trim().slice(0, 1500);
    } catch (e) {
      return null;
    } finally {
      clearTimeout(zamanlayici);
    }
  };
}

module.exports = { olustur, sunucuDogrula, IZINLI_SUNUCULAR, ZAMAN_ASIMI_MS };
