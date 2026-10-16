// Panel betiği (CSP: satır içi betik yok). Yalnızca küçük yardımcılar.
(function () {
  "use strict";

  // "Tümünü seç" onay kutusu: data-hepsini-sec="<seçilecek onay kutularının name değeri>"
  document.querySelectorAll("[data-hepsini-sec]").forEach(function (ana) {
    var ad = ana.getAttribute("data-hepsini-sec");
    var kutular = function () {
      return document.querySelectorAll('input[type="checkbox"][name="' + ad + '"]');
    };
    ana.addEventListener("change", function () {
      kutular().forEach(function (k) { k.checked = ana.checked; });
      sayaciGuncelle();
    });
    document.addEventListener("change", function (olay) {
      if (olay.target && olay.target.name === ad) {
        var hepsi = Array.prototype.every.call(kutular(), function (k) { return k.checked; });
        ana.checked = hepsi;
        sayaciGuncelle();
      }
    });
  });

  function sayaciGuncelle() {
    var sayac = document.querySelector("[data-secili-sayac]");
    if (!sayac) { return; }
    var ad = sayac.getAttribute("data-secili-sayac");
    sayac.textContent = document.querySelectorAll('input[type="checkbox"][name="' + ad + '"]:checked').length;
  }

  // Kopyala düğmesi: data-kopyala="<kopyalanacak girdinin id değeri>"
  document.querySelectorAll("[data-kopyala]").forEach(function (dugme) {
    dugme.addEventListener("click", function () {
      var girdi = document.getElementById(dugme.getAttribute("data-kopyala"));
      if (!girdi) { return; }
      girdi.select();
      var bildir = function () {
        var not = document.querySelector("[data-kopyalandi]");
        if (not) { not.hidden = false; }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(girdi.value).then(bildir, function () { document.execCommand("copy"); bildir(); });
      } else {
        document.execCommand("copy");
        bildir();
      }
    });
  });

  // Toplu işlem düğmeleri bir kod seçilmeden gönderilmesin.
  document.querySelectorAll("form[data-toplu]").forEach(function (form) {
    form.addEventListener("submit", function (olay) {
      var ad = form.getAttribute("data-toplu");
      if (!form.querySelector('input[name="' + ad + '"]:checked')) {
        olay.preventDefault();
        window.alert("Önce en az bir kayıt seçin.");
      }
    });
  });
})();
