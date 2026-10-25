// AgentMom görsel iş akışı editörü: saf mantık (Faz 11, D9c, madde 16). Yazan: Claude [İP:AgentMom devam]. Sahip: Yusuf.
// Ne: editör modeli -> sunucu tanımı (WorkflowDefinition), sunucu kurallarının tüm sorunları listeleyen aynası, diyagram düğümleri, hazır şablonlar.
// Kural: DOM yok, ağ yok, hiçbir şeyi çalıştırmaz ya da göndermez (ADR-016). Kurallar src/workflows/types.ts validateDefinition'ın aynasıdır (kayıt/devre dışı bilgisi çağıranın verdiği listeye bağlıdır); eşlik testi wf-editor.test.ts'dedir.
// Değiştirme: yalnız sahibi.
"use strict";
(function () {
  var ROLES = ["plan", "implement", "review", "verify"];
  var MAX_FALLBACKS = 3;
  var MAX_ATTEMPTS = 3;

  function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  function blank() {
    return {
      allowSame: false,
      roles: {
        plan: { on: false, provider: "", fallbacks: [], attempts: 0 },
        implement: { on: false, provider: "", fallbacks: [], attempts: 0 },
        review: { on: false, provider: "", fallbacks: [], attempts: 0 },
        verify: { on: false, provider: "", fallbacks: [], attempts: 0 }
      }
    };
  }

  // Ayarlar bozuk gelse de model her zaman aynı şekle indirgenir (yalnız bilinen roller).
  function normalize(m) {
    var out = blank();
    var src = isObj(m) ? m : {};
    out.allowSame = src.allowSame === true;
    var roles = isObj(src.roles) ? src.roles : {};
    ROLES.forEach(function (r) {
      var s = isObj(roles[r]) ? roles[r] : {};
      var fb = Array.isArray(s.fallbacks) ? s.fallbacks.filter(function (x) { return typeof x === "string" && x.trim().length > 0 && x.length <= 100; }).slice(0, MAX_FALLBACKS) : [];
      var a = Number(s.attempts);
      out.roles[r] = {
        on: s.on === true,
        provider: typeof s.provider === "string" ? s.provider.slice(0, 100) : "",
        fallbacks: fb,
        attempts: Number.isInteger(a) && a >= 1 && a <= MAX_ATTEMPTS ? a : 0
      };
    });
    return out;
  }

  function toDefinition(model) {
    var m = normalize(model);
    var steps = [];
    ROLES.forEach(function (r) {
      var s = m.roles[r];
      if (!s.on) return;
      var step = { role: r };
      if (r !== "verify") {
        step.providerId = s.provider;
        if (s.fallbacks.length) step.fallbackProviders = s.fallbacks.slice();
      }
      if (s.attempts) step.maxAttempts = s.attempts;
      steps.push(step);
    });
    var def = { steps: steps };
    if (m.allowSame) def.allowSameProviderReview = true;
    return def;
  }

  // Sunucu kuralları: sunucu ilk hatada durur, burada hepsi toplanır. Her sorun { code, role, key } (kod sunucu koduyla aynı).
  function validate(model, providerIds) {
    var m = normalize(model);
    var known = Object.create(null);
    (Array.isArray(providerIds) ? providerIds : []).forEach(function (id) { if (typeof id === "string") known[id] = true; });
    var problems = [];
    function add(code, role, key) { problems.push({ code: code, role: role || "", key: key }); }
    var on = ROLES.filter(function (r) { return m.roles[r].on; });
    if (on.length === 0) add("invalid_definition", "", "noSteps");
    ROLES.forEach(function (r) {
      var s = m.roles[r];
      if (!s.on || r === "verify") return;
      if (s.provider.trim() === "") { add("invalid_field", r, "providerMissing"); return; }
      [s.provider].concat(s.fallbacks).forEach(function (id) { if (!known[id]) add("unknown_provider", r, "providerUnknown"); });
    });
    var has = function (r) { return m.roles[r].on; };
    if (has("review") && !has("implement")) add("invalid_definition", "review", "reviewNeedsImplement");
    if (has("verify") && !(has("implement") && has("review"))) add("invalid_definition", "verify", "verifyNeedsBoth");
    if (has("implement") && has("review") && !m.allowSame) {
      var impl = Object.create(null);
      [m.roles.implement.provider].concat(m.roles.implement.fallbacks).forEach(function (id) { impl[id] = true; });
      var rev = [m.roles.review.provider].concat(m.roles.review.fallbacks);
      var bothSet = m.roles.implement.provider.trim() !== "" && m.roles.review.provider.trim() !== "";
      if (bothSet && (rev.every(function (id) { return impl[id] === true; }) || m.roles.review.provider === m.roles.implement.provider)) add("review_not_independent", "review", "notIndependent");
    }
    return problems;
  }

  // Diyagram: kapalı roller de gösterilir (kapalı = soluk), okun yönü sabit sıra.
  function diagram(model) {
    var m = normalize(model);
    return ROLES.map(function (r, i) {
      var s = m.roles[r];
      return { role: r, index: i, on: s.on, provider: r === "verify" ? "" : s.provider, fallbacks: s.fallbacks.slice(), attempts: s.attempts };
    });
  }

  var PRESETS = {
    plan: { allowSame: false, roles: { plan: { on: true } } },
    build: { allowSame: false, roles: { implement: { on: true } } },
    reviewed: { allowSame: false, roles: { implement: { on: true }, review: { on: true } } },
    full: { allowSame: false, roles: { plan: { on: true }, implement: { on: true }, review: { on: true }, verify: { on: true } } }
  };
  function preset(id, providerIds) {
    var ids = Array.isArray(providerIds) ? providerIds.filter(function (x) { return typeof x === "string"; }) : [];
    var p = Object.prototype.hasOwnProperty.call(PRESETS, id) ? PRESETS[id] : null;
    var m = normalize(p);
    // Sağlayıcıyı kendiliğinden SEÇMEZ ya da tahmin etmez; yalnız bir sağlayıcı varsa ve bağımsızlık gerekmiyorsa atar (kullanıcı değiştirebilir).
    if (ids.length === 1) ROLES.forEach(function (r) { if (r !== "verify" && m.roles[r].on) m.roles[r].provider = ids[0]; });
    return m;
  }

  var api = { ROLES: ROLES.slice(), MAX_FALLBACKS: MAX_FALLBACKS, MAX_ATTEMPTS: MAX_ATTEMPTS, blank: blank, normalize: normalize, toDefinition: toDefinition, validate: validate, diagram: diagram, preset: preset, PRESET_IDS: Object.keys(PRESETS) };
  if (typeof window !== "undefined") window.AM_WFEDIT = api;
})();
