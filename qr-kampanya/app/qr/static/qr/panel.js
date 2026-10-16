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

  // Listede satır içi düzenleme: "Düzenle" bağlantısı (data-hizli-ac="<form id>") küçük formu açar. JS yoksa bağlantı
  // normal düzenleme sayfasına gider. Kayıt, formun action adresine POST (CSRF alanı formda) ile fetch'le gönderilir;
  // ağ hatasında form normal biçimde gönderilir (sunucu listeye yönlendirir).
  function hizliSatir(formId) { return document.getElementById(formId.replace(/^hd-/, "hd-satir-")); }
  function kisalt(metin, n) { return metin.length > n ? metin.slice(0, n - 1) + "\u2026" : metin; }

  document.querySelectorAll("[data-hizli-ac]").forEach(function (baglanti) {
    baglanti.addEventListener("click", function (olay) {
      var satir = hizliSatir(baglanti.getAttribute("data-hizli-ac"));
      if (!satir) { return; }
      olay.preventDefault();
      satir.hidden = false;
      var girdi = satir.querySelector("input");
      if (girdi) { girdi.focus(); }
    });
  });

  document.querySelectorAll("[data-hizli-kapat]").forEach(function (dugme) {
    dugme.addEventListener("click", function () {
      var satir = hizliSatir(dugme.getAttribute("data-hizli-kapat"));
      if (satir) { satir.hidden = true; }
    });
  });

  document.querySelectorAll("form[data-hizli-form]").forEach(function (form) {
    form.addEventListener("submit", function (olay) {
      if (!window.fetch || !window.FormData) { return; }
      olay.preventDefault();
      var hataKutusu = document.querySelector('[data-hizli-hata="' + form.id + '"]');
      var satir = hizliSatir(form.id);
      var ana = document.querySelector('[data-qr-satir="' + form.getAttribute("data-hizli-form") + '"]');
      if (hataKutusu) { hataKutusu.textContent = ""; }
      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        credentials: "same-origin",
        headers: { "Accept": "application/json", "X-Requested-With": "fetch" }
      }).then(function (yanit) {
        return yanit.json().then(function (veri) { return { durum: yanit.status, veri: veri }; });
      }).then(function (sonuc) {
        var veri = sonuc.veri;
        if (veri && veri.ok) {
          if (ana) {
            var hucre = function (ad, metin) {
              var h = ana.querySelector('[data-alan="' + ad + '"]');
              if (h && metin !== null && metin !== undefined) { h.textContent = kisalt(metin, ad === "ad" ? 200 : (ad === "baslik" ? 40 : 50)); }
            };
            hucre("ad", veri.ad);
            hucre("baslik", veri.baslik);
            hucre("hedef_url", veri.hedef_url);
          }
          if (hataKutusu && veri.uyarilar && veri.uyarilar.length) { hataKutusu.textContent = veri.uyarilar.join(" "); }
          else if (satir) { satir.hidden = true; }
          return;
        }
        var metinler = [];
        var hatalar = (veri && veri.hatalar) || {};
        Object.keys(hatalar).forEach(function (alan) {
          hatalar[alan].forEach(function (m) { metinler.push(alan === "__all__" ? m : alan + ": " + m); });
        });
        if (hataKutusu) { hataKutusu.textContent = metinler.join(" ") || "Kaydedilemedi."; }
      }).catch(function () {
        form.submit();
      });
    });
  });
})();
