// AgentMom "Projeler" sayfası (Faz 11, D3). Yazan: Claude [İP:AgentMom Faz 11 / sayfalar]. Sahip: Yusuf.
// Ne: AM_PAGES.register("projects", ...). Tek proje kartı (ad, kök klasör, izinli/yasak klasörler, güvenilir depolar; yalnız YOL gösterimi) + çoklu proje için dürüst "Planlı (D9)" notu.
// Kural: veri yalnız AM.state.project ve AM.state.policy; ağ yok; sunucu metni yalnız textContent; yol bağlantı/eylem değildir. Değiştirme: yalnız sahibi.
"use strict";
(function () {
  var ID = "projects";
  var P = typeof window !== "undefined" ? window.AM_PAGES : null;
  if (!P || typeof P.register !== "function" || !P.kit) {
    try { if (typeof console !== "undefined") console.error("AM_PAGES yok: " + ID); } catch (e) { /* konsol yoksa */ }
    try {
      var h = document.getElementById("pageView");
      if (h) { var d = document.createElement("div"); d.setAttribute("role", "alert"); d.textContent = "Sayfa çerçevesi (pages.js) yüklenemedi; bu sayfa gösterilemiyor: " + ID; h.appendChild(d); }
    } catch (e2) { /* DOM yoksa çekirdek eksik modül hatasını gösterir */ }
    return;
  }
  var K = P.kit, PU = P.pure;

  var TR = {
    "page-projects.intro": "AgentMom şu an tek bir projeyi yönetir. Klasörler ve depolar güvenlik politikasından okunur; bu sayfada yol değiştirilemez.",
    "page-projects.card": "Etkin proje", "page-projects.name": "Ad", "page-projects.root": "Kök klasör", "page-projects.rootNote": "politikadaki ilk izinli klasör",
    "page-projects.rootNone": "Bildirilmedi", "page-projects.allowed": "İzinli klasörler", "page-projects.forbidden": "Yasaklı klasörler", "page-projects.trusted": "Güvenilir depolar",
    "page-projects.noAllowed": "Politikada izinli klasör yok.", "page-projects.noForbidden": "Politikada yasaklı klasör yok.", "page-projects.noTrusted": "Politikada güvenilir depo yok.",
    "page-projects.noPolicy": "Politika yüklenemedi; klasör ve depo bilgisi gösterilemiyor.", "page-projects.default": "AgentMom",
    "page-projects.multi": "Çoklu proje", "page-projects.multiNote": "Çoklu proje: Planlı (D9). Şu an yalnız bu proje yönetilir; proje ekleme, silme ya da geçiş yoktur.",
    "page-projects.active": "Etkin"
  };
  if (typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("page-projects", TR);
  function T(key, vars) { return K.T(key, vars); }

  function arr(v) { return Array.isArray(v) ? v : []; }
  function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }

  // ---- saf mantık ----
  function projectName(project) {
    var n = isObj(project) ? PU.clean(project.name, 80).trim() : "";
    return n || T("page-projects.default");
  }
  function pathsOf(policy) {
    if (!isObj(policy)) return null;
    var cl = function (l) { return arr(l).map(function (x) { return PU.maskSecrets(PU.clean(x, 300)); }).filter(function (x) { return x !== ""; }); };
    var allowed = cl(policy.allowedDirs);
    return { root: allowed.length ? allowed[0] : "", allowed: allowed, forbidden: cl(policy.forbiddenDirs), trusted: cl(policy.trustedRepos) };
  }

  // ---- çizim ----
  function render(AM, root) {
    var st = AM.state || {};
    root.appendChild(K.el("p", "am-pg-lead", T("page-projects.intro")));
    var paths = pathsOf(st.policy);

    var card = K.el("article", "am-pg-panel");
    var hid = K.nextId("p");
    var head = K.el("div", "am-pg-sechead");
    var h = K.el("h2", "am-pg-h2", T("page-projects.card"));
    h.id = hid;
    card.setAttribute("aria-labelledby", hid);
    head.appendChild(h);
    head.appendChild(K.chip("● " + T("page-projects.active"), "ok"));
    card.appendChild(head);
    K.kv(card, [
      [T("page-projects.name"), projectName(st.project)],
      [T("page-projects.root"), paths && paths.root ? K.el("code", "am-pg-code", paths.root) : T("page-projects.rootNone")]
    ]);
    if (paths && paths.root) card.appendChild(K.el("p", "am-pg-note", "(" + T("page-projects.rootNote") + ")"));
    root.appendChild(card);

    if (!paths) { root.appendChild(K.errorCard(T("page-projects.noPolicy"), function () { K.act("refresh"); })); }
    else {
      K.pathList(K.section(root, T("page-projects.allowed"), { count: paths.allowed.length }), paths.allowed, T("page-projects.noAllowed"));
      K.pathList(K.section(root, T("page-projects.forbidden"), { count: paths.forbidden.length }), paths.forbidden, T("page-projects.noForbidden"));
      K.pathList(K.section(root, T("page-projects.trusted"), { count: paths.trusted.length }), paths.trusted, T("page-projects.noTrusted"));
    }

    var multi = K.section(root, T("page-projects.multi"), { badges: [K.capBadge("planned", "D9")] });
    multi.appendChild(K.el("p", "am-pg-note", T("page-projects.multiNote")));
  }

  P.register(ID, { title: T("pages.title.projects"), group: "manage", render: render, pure: { projectName: projectName, pathsOf: pathsOf, TR: TR } });
})();
