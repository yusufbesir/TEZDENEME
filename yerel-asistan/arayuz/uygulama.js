/* Pırıl arayüzü: DOM bağlama katmanı. Mantık mantik.js'te, karakter karakter.js'te. */
(function () {
  'use strict';
  const M = window.PirilMantik;
  const K = window.PirilKarakter;
  const $ = (id) => document.getElementById(id);

  const kopruVar = !!(window.piril && typeof window.piril.komutGonder === 'function');
  const mod = M.modSec(location.search, kopruVar);
  const VARSAYILAN_PORT = 47615; // adres girişinde port yazılmazsa

  const durum = {
    evre: 'bekliyor',
    istemci: null, // protokol/istemci.js arayüzü (bağlıyken)
    uzakKontrol: false,
    mesgul: false,
    sayacZamanlayici: null,
  };
  const adimlar = M.adimListesi();
  const karakter = K.baglaKapsayici($('karakter'));

  // ---------- Yardımcılar ----------
  function betikYukle(ad) {
    return new Promise((coz, red) => {
      const s = document.createElement('script');
      s.src = ad;
      s.onload = () => coz();
      s.onerror = () => red(new Error(ad + ' yüklenemedi'));
      document.head.appendChild(s);
    });
  }

  function bilgi(metin) { $('bilgi').textContent = metin || ''; }

  function karakteriGuncelle(evre, hata) {
    durum.evre = evre;
    karakter.durumAyarla(M.karakterDurumu({ evre, adimlar: adimlar.liste(), hata }));
  }

  function mesajEkle(metin, ben) {
    const li = document.createElement('li');
    li.textContent = metin;
    if (ben) li.className = 'ben';
    $('mesajlar').appendChild(li);
    $('mesajlar').scrollTop = $('mesajlar').scrollHeight;
  }

  function adimlariCiz() {
    const ol = $('adimlar');
    ol.hidden = !adimlar.gorunur(); // adım yoksa liste hiç çıkmaz
    const mevcut = ol.children;
    const liste = adimlar.liste();
    // Mevcut öğeleri yeniden kullan: yeni adımlar eklenir, durumlar güncellenir (animasyon yalnız yeni öğede).
    for (let i = 0; i < liste.length; i++) {
      let li = mevcut[i];
      if (!li) {
        li = document.createElement('li');
        const isaret = document.createElement('span');
        isaret.className = 'isaret';
        isaret.setAttribute('aria-hidden', 'true');
        const metin = document.createElement('span');
        metin.className = 'etiket';
        li.append(isaret, metin);
        ol.appendChild(li);
      }
      li.className = liste[i].durum;
      li.lastChild.textContent = liste[i].etiket;
      const okunur = { bitti: 'tamamlandı', hata: 'hata', suruyor: 'sürüyor' }[liste[i].durum];
      li.setAttribute('aria-label', liste[i].etiket + ', ' + okunur);
    }
    while (ol.children.length > liste.length) ol.removeChild(ol.lastChild);
  }

  function adimlariSifirla() {
    adimlar.sifirla();
    $('adimlar').textContent = '';
    $('adimlar').hidden = true;
  }

  // ---------- Sayaç eylemi ----------
  function sayacBaslat(saniye) {
    clearInterval(durum.sayacZamanlayici);
    const bitis = Date.now() + saniye * 1000;
    const el = $('sayac');
    el.hidden = false;
    const guncelle = () => {
      const kalan = Math.ceil((bitis - Date.now()) / 1000);
      el.textContent = 'Sayaç: ' + M.sayacMetni(kalan);
      if (kalan <= 0) {
        clearInterval(durum.sayacZamanlayici);
        el.textContent = 'Sayaç bitti.';
        sesliOku('Sayaç bitti');
      }
    };
    guncelle();
    durum.sayacZamanlayici = setInterval(guncelle, 500);
  }

  function eylemiUygula(eylem) {
    if (eylem && eylem.tip === 'sayac' && Number(eylem.saniye) > 0) sayacBaslat(Number(eylem.saniye));
  }

  // ---------- Sonuç gösterimi ----------
  function sonucuGoster(sonuc) {
    adimlar.yanittanUygula(sonuc.adimlar);
    adimlariCiz();
    const yanit = String(sonuc.yanit || '');
    $('yanit').textContent = yanit;
    mesajEkle(yanit, false);
    eylemiUygula(sonuc.eylem);
    karakteriGuncelle('bitti', false);
    sesliOku(yanit);
  }

  function hatayiGoster(e) {
    const metin = (e && e.mesaj) || (e && e.message) || 'Bir sorun oldu.';
    $('yanit').textContent = metin;
    mesajEkle(metin, false);
    karakteriGuncelle('bitti', true);
  }

  // ---------- Komut yolları ----------
  function onayIste(aciklama) {
    return Promise.resolve(window.confirm('Pırıl onay istiyor:\n' + aciklama));
  }

  function yerelCtx() {
    return {
      simdi: () => new Date(),
      depo: {
        oku(a) {
          try { const v = localStorage.getItem('piril:' + a); return v === null ? undefined : JSON.parse(v); }
          catch (e) { return undefined; }
        },
        yaz(a, d) { try { localStorage.setItem('piril:' + a, JSON.stringify(d)); } catch (e) { /* dolu */ } },
      },
      // platform bilerek yok: sistem becerileri "bu cihazda desteklenmiyor" der.
      onayIste,
    };
  }

  let cekirdekHazir = null;
  function cekirdekYukle() {
    if (!cekirdekHazir) {
      cekirdekHazir = window.PirilCekirdek
        ? Promise.resolve()
        : betikYukle('cekirdek.bundle.js').then(() => {
          if (!window.PirilCekirdek) throw new Error('Çekirdek bulunamadı.');
        });
    }
    return cekirdekHazir;
  }

  async function komutKopru(metin) {
    let iptal = null;
    if (typeof window.piril.onIlerleme === 'function') {
      iptal = window.piril.onIlerleme((i) => { adimlar.isle(i.etiket, i.durum); adimlariCiz(); });
    }
    try { return await window.piril.komutGonder(metin); }
    finally { if (typeof iptal === 'function') iptal(); }
  }

  async function komutYerel(metin) {
    await cekirdekYukle();
    return window.PirilCekirdek.calistir(metin, yerelCtx());
  }

  async function komutUzak(metin) {
    return durum.istemci.komutGonder(metin, (etiket, d) => { adimlar.isle(etiket, d); adimlariCiz(); });
  }

  async function komutuCalistir(metin) {
    if (durum.mesgul) return;
    metin = metin.trim();
    if (!metin) return;
    durum.mesgul = true;
    $('gonder').disabled = true;
    clearInterval(durum.sayacZamanlayici);
    $('sayac').hidden = true;
    $('yanit').textContent = '';
    adimlariSifirla();
    mesajEkle(metin, true);
    karakteriGuncelle('dusunuyor', false);
    try {
      const yol = M.komutYolu({ mod, bagli: !!(durum.istemci && durum.istemci.acik), kopruVar });
      if (yol === 'yok') throw new Error('Bu pencere Pırıl bilgisayar uygulamasının dışında açılmış.');
      karakteriGuncelle('calisiyor', false);
      const sonuc = yol === 'kopru' ? await komutKopru(metin)
        : yol === 'uzak' ? await komutUzak(metin)
          : await komutYerel(metin);
      sonucuGoster(sonuc || { yanit: '', adimlar: [] });
    } catch (e) {
      hatayiGoster(e);
    } finally {
      durum.mesgul = false;
      $('gonder').disabled = false;
    }
  }

  // ---------- Bağlantı durumu ve sekmeler ----------
  function baglantiyiGuncelle() {
    const bagli = !!(durum.istemci && durum.istemci.acik);
    const d = M.baglantiDurumu({ mod, bagli, uzakKontrol: durum.uzakKontrol });
    const serit = $('baglanti-seridi');
    serit.textContent = d.metin;
    serit.className = 'serit ' + d.sinif;
    $('sekme-uzak').hidden = !M.uzaktanSekmesiGorunur({ mod, bagli });
    $('sekme-baglanti').hidden = mod !== 'telefon';
    $('baglan').hidden = bagli;
    $('baglantiyi-kes').hidden = !bagli;
    if (!bagli && !$('panel-uzak').hidden) sekmeSec('sohbet');
  }

  function sekmeSec(ad) {
    for (const s of ['sohbet', 'uzak', 'baglanti']) {
      $('panel-' + s).hidden = s !== ad;
      $('sekme-' + s).setAttribute('aria-selected', String(s === ad));
    }
  }

  // ---------- Telefon: bilgisayara bağlanma ----------
  async function bilgisayaraBaglan(ev) {
    ev.preventDefault();
    const bilgiEl = $('baglanti-bilgi');
    const adres = M.adresCoz($('adres').value, VARSAYILAN_PORT);
    if (!adres.ok) { bilgiEl.textContent = adres.neden; return; }
    const kod = M.kodNormallestir($('kod').value);
    if (!kod) { bilgiEl.textContent = 'Eşleştirme kodu geçersiz görünüyor. PIRIL- ile başlayan kodu eksiksiz girin.'; return; }
    bilgiEl.textContent = 'Bağlanılıyor…';
    $('baglan').disabled = true;
    try {
      if (!window.PirilIstemci) {
        await betikYukle('sifre.js');
        await betikYukle('istemci.js');
      }
      const istemci = await window.PirilIstemci.baglan({ url: adres.url, kod });
      durum.istemci = istemci;
      durum.uzakKontrol = !!istemci.uzakKontrol;
      istemci.dinle('durum', (m) => { durum.uzakKontrol = !!m.uzakKontrol; baglantiyiGuncelle(); });
      istemci.dinle('kapandi', () => { durum.istemci = null; durum.uzakKontrol = false; baglantiyiGuncelle(); bilgi('Bilgisayarla bağlantı kapandı.'); });
      istemci.dinle('onay', async (m) => {
        const tamam = await onayIste(m.aciklama || 'Bilgisayar bir işlem için onay istiyor.');
        try { await istemci.onaySonucGonder(m.id, tamam); } catch (e) { /* bağlantı kapanmış olabilir */ }
      });
      istemci.dinle('hata', (m) => {
        if (m.id) return; // komuta ait hatalar komutGonder reddinde ele alınır
        uzakUyari(M.uzakHataMetni(m.kod, m.mesaj));
      });
      bilgiEl.textContent = 'Bağlandı.';
      baglantiyiGuncelle();
      sekmeSec('sohbet');
    } catch (e) {
      bilgiEl.textContent = (e && e.mesaj) || (e && e.message) || 'Bağlanılamadı.';
    } finally {
      $('baglan').disabled = false;
    }
  }

  function baglantiyiKes() {
    if (durum.istemci) durum.istemci.kapat();
    durum.istemci = null;
    durum.uzakKontrol = false;
    baglantiyiGuncelle();
  }

  // ---------- Uzaktan kontrol sekmesi ----------
  let onizlemeUrl = null;
  function uzakUyari(metin) {
    const el = $('uzak-uyari');
    el.textContent = metin || '';
    el.hidden = !metin;
  }

  function b64Blob(b64, tur) {
    const ikili = atob(b64);
    const bayt = new Uint8Array(ikili.length);
    for (let i = 0; i < ikili.length; i++) bayt[i] = ikili.charCodeAt(i);
    return new Blob([bayt], { type: tur });
  }

  async function ekranYenile() {
    if (!durum.istemci || !durum.istemci.acik) return;
    if (!durum.uzakKontrol) { uzakUyari(M.uzakHataMetni('uzak_kapali')); return; }
    uzakUyari('');
    try {
      const e = await durum.istemci.ekranIste();
      if (onizlemeUrl) URL.revokeObjectURL(onizlemeUrl);
      onizlemeUrl = URL.createObjectURL(b64Blob(e.jpg, 'image/jpeg'));
      $('onizleme').src = onizlemeUrl;
      $('onizleme').hidden = false;
      $('onizleme-bos').hidden = true;
    } catch (err) {
      uzakUyari(M.uzakHataMetni(err && err.kod, err && (err.mesaj || err.message)));
    }
  }

  async function onizlemeDokun(ev) {
    if (!durum.istemci || !durum.istemci.acik) return;
    if (!durum.uzakKontrol) { uzakUyari(M.uzakHataMetni('uzak_kapali')); return; }
    const k = M.normalKoordinat(ev.clientX, ev.clientY, $('onizleme').getBoundingClientRect());
    if (!k) return;
    try {
      await durum.istemci.isaret(k.x, k.y);
      await durum.istemci.tikla(k.x, k.y, 'sol');
      uzakUyari('');
    } catch (err) {
      uzakUyari(M.uzakHataMetni(err && err.kod, err && (err.mesaj || err.message)));
    }
  }

  async function uzakYaz(ev) {
    ev.preventDefault();
    const alan = $('uzak-yazi');
    if (!alan.value || !durum.istemci || !durum.istemci.acik) return;
    if (!durum.uzakKontrol) { uzakUyari(M.uzakHataMetni('uzak_kapali')); return; }
    try {
      await durum.istemci.yaz(alan.value);
      alan.value = '';
      uzakUyari('');
    } catch (err) {
      uzakUyari(M.uzakHataMetni(err && err.kod, err && (err.mesaj || err.message)));
    }
  }

  // ---------- Ses: tanıma (yerel) ve konuşma ----------
  const sesEklentisi = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition) || null;
  const TarayiciTanima = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let tarayiciTanima = null;
  let dinliyor = false;

  function dinlemeyiBitir() {
    dinliyor = false;
    $('mikrofon').setAttribute('aria-pressed', 'false');
    $('mikrofon').setAttribute('aria-label', 'Sesle söyle');
    if (durum.evre === 'dinliyor') karakteriGuncelle('bekliyor', false);
  }

  function tanimaSonucu(metin, son) {
    $('yazi').value = metin;
    if (son) {
      dinlemeyiBitir();
      if (metin.trim()) { $('yazi').value = ''; komutuCalistir(metin); }
    }
  }

  async function eklentiylePlugin() {
    const var_ = await sesEklentisi.available();
    if (!var_ || var_.available === false) throw new Error('Bu cihazda ses tanıma yok.');
    const izin = await sesEklentisi.requestPermissions();
    if (izin && izin.speechRecognition && izin.speechRecognition !== 'granted') {
      throw new Error('Mikrofon izni verilmedi.');
    }
    let son = '';
    await sesEklentisi.removeAllListeners();
    await sesEklentisi.addListener('partialResults', (d) => {
      son = (d && d.matches && d.matches[0]) || son;
      $('yazi').value = son;
    });
    await sesEklentisi.addListener('listeningState', (d) => {
      if (d && d.status === 'stopped') tanimaSonucu(son, true);
    });
    // Bulut zorlanmaz: eklenti cihazdaki tanıyıcıyı kullanır; açılır pencere kapalı, kısmi sonuçlar açık.
    await sesEklentisi.start({ language: 'tr-TR', maxResults: 1, partialResults: true, popup: false });
  }

  function tarayiciylaBaslat() {
    tarayiciTanima = new TarayiciTanima();
    tarayiciTanima.lang = 'tr-TR';
    tarayiciTanima.interimResults = true;
    tarayiciTanima.continuous = false;
    try { tarayiciTanima.processLocally = true; } catch (e) { /* desteklenmiyorsa yok say */ }
    tarayiciTanima.onresult = (ev) => {
      let metin = '';
      let son = false;
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        metin += ev.results[i][0].transcript;
        if (ev.results[i].isFinal) son = true;
      }
      tanimaSonucu(metin, son);
    };
    tarayiciTanima.onerror = (ev) => {
      dinlemeyiBitir();
      if (ev.error === 'network' || ev.error === 'service-not-allowed') {
        $('mikrofon').hidden = true; // yerel tanıma yok; buluta gitmiyoruz
        bilgi('Bu cihazda çevrimdışı ses tanıma yok. Yazarak devam edebilirsiniz.');
      } else if (ev.error === 'not-allowed') {
        bilgi('Mikrofon izni verilmedi.');
      } else if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
        bilgi('Ses anlaşılamadı.');
      }
    };
    tarayiciTanima.onend = () => { if (dinliyor) dinlemeyiBitir(); };
    tarayiciTanima.start();
  }

  async function mikrofonDugmesi() {
    if (dinliyor) {
      try {
        if (sesEklentisi) await sesEklentisi.stop();
        else if (tarayiciTanima) tarayiciTanima.stop();
      } catch (e) { /* zaten durmuş */ }
      return;
    }
    bilgi('');
    dinliyor = true;
    $('mikrofon').setAttribute('aria-pressed', 'true');
    $('mikrofon').setAttribute('aria-label', 'Dinlemeyi durdur');
    karakteriGuncelle('dinliyor', false);
    try {
      if (sesEklentisi) await eklentiylePlugin();
      else tarayiciylaBaslat();
    } catch (e) {
      dinlemeyiBitir();
      bilgi((e && e.message) || 'Ses tanıma başlatılamadı.');
    }
  }

  function sesliOku(metin) {
    if (!$('sesli-yanit').checked || !metin || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(metin);
      u.lang = 'tr-TR';
      const tr = window.speechSynthesis.getVoices().find((v) => /^tr/i.test(v.lang) && v.localService);
      if (tr) u.voice = tr; // yalnızca yerel ses; bulut sesi seçilmez
      window.speechSynthesis.speak(u);
    } catch (e) { /* ses yoksa sessiz geç */ }
  }

  // ---------- Başlangıç ----------
  function baslat() {
    document.documentElement.dataset.mod = mod;
    karakter.durumAyarla('bekliyor');

    $('komut-formu').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const m = $('yazi').value;
      $('yazi').value = '';
      komutuCalistir(m);
    });
    $('mikrofon').addEventListener('click', mikrofonDugmesi);
    $('mikrofon').hidden = !(sesEklentisi || TarayiciTanima);

    $('sekme-sohbet').addEventListener('click', () => sekmeSec('sohbet'));
    $('sekme-uzak').addEventListener('click', () => { sekmeSec('uzak'); ekranYenile(); });
    $('sekme-baglanti').addEventListener('click', () => sekmeSec('baglanti'));
    $('baglanti-formu').addEventListener('submit', bilgisayaraBaglan);
    $('baglantiyi-kes').addEventListener('click', baglantiyiKes);
    $('ekran-yenile').addEventListener('click', ekranYenile);
    $('onizleme').addEventListener('click', onizlemeDokun);
    $('onizleme').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ekranYenile(); });
    $('uzak-yazi-formu').addEventListener('submit', uzakYaz);

    baglantiyiGuncelle();
    if (mod === 'pc' && !kopruVar) bilgi('Not: Bu sayfa Pırıl bilgisayar uygulaması dışında açıldı; komutlar çalışmaz.');
  }

  baslat();
})();
