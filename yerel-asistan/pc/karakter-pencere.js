'use strict';
// Karakter penceresi: yüzü komut evresine göre değiştirir (yalnızca preload köprüsü + arayuz/karakter.js kullanılır).
(function () {
  const kap = document.getElementById('karakter');
  if (!kap || typeof PirilKarakter === 'undefined') return;
  const k = PirilKarakter.baglaKapsayici(kap);
  k.durumAyarla('bekliyor');
  let zaman = null;
  function sonra(d) { clearTimeout(zaman); zaman = setTimeout(() => k.durumAyarla('bekliyor'), 4000); k.durumAyarla(d); }
  if (window.piril && typeof window.piril.onIlerleme === 'function') {
    window.piril.onIlerleme((o) => {
      if (o.durum === 'suruyor') { clearTimeout(zaman); k.durumAyarla('calisiyor'); } else if (o.durum === 'hata') sonra('hata'); else sonra('bitti');
    });
  }
})();
