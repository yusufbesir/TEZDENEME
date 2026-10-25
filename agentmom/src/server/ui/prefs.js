// AgentMom arayüz tercihleri (Faz 11). Sahip: Claude [İP:AgentMom Faz 11].
// localStorage'a YALNIZ burada, YALNIZ beyaz listeli anahtarlarla ve her zaman try/catch içinde dokunulur. Sır, belirteç, sunucu verisi yazılmaz.
// Okunan değer tür ve aralık denetiminden geçer; geçersizse varsayılan kullanılır (sessizce bozuk değer taşınmaz).
"use strict";
(function () {
  var KEY = "agentmom.prefs.v1";
  var SPEC = {
    theme: { check: function (v) { return v === "dark" || v === "light" || v === "system"; }, def: "dark" },
    leftW: { check: function (v) { return typeof v === "number" && isFinite(v) && v >= 200 && v <= 420; }, def: null },
    rightW: { check: function (v) { return typeof v === "number" && isFinite(v) && v >= 300 && v <= 640; }, def: null },
    panelOpen: { check: function (v) { return typeof v === "boolean"; }, def: false },
    sidebarCollapsed: { check: function (v) { return typeof v === "boolean"; }, def: false },
    panelWide: { check: function (v) { return typeof v === "boolean"; }, def: false },
    // Arayüz karmaşıklığı (madde 91): "simple" = gelişmiş bölümler tek satıra daralır; varsayılan "advanced" (hiçbir şey gizlenmez).
    complexity: { check: function (v) { return v === "simple" || v === "advanced"; }, def: "advanced" }
  };

  function sanitize(src) {
    var out = {};
    Object.keys(SPEC).forEach(function (k) {
      var v = src && Object.prototype.hasOwnProperty.call(src, k) ? src[k] : undefined;
      out[k] = SPEC[k].check(v) ? v : SPEC[k].def;
    });
    return out;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw || raw.length > 2000) return sanitize(null);
      return sanitize(JSON.parse(raw));
    } catch (e) { return sanitize(null); }
  }

  function save(prefs) {
    try { window.localStorage.setItem(KEY, JSON.stringify(sanitize(prefs))); return true; }
    catch (e) { return false; } // özel pencere / depolama kapalı: tercih yalnız bu oturumda geçerli
  }

  window.AM_PREFS = { load: load, save: save, keys: Object.keys(SPEC), pure: { sanitize: sanitize } };
})();
