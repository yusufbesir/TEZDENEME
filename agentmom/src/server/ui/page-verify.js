/*
 * Sahip: Sonnet (D3 sayfası: Beyin Verify) [İP:AgentMom Faz 11, D3]
 * yazan: [Claude#agentmom-d3-sayfalar-more]
 * Amaç: window.AM_PAGES.register("verify", ...) ile doğrulama koşuları tablosu (data.verification), doğrulama yaklaşımı ve doğrulama türleri.
 *   Veri YALNIZ AM.state.data.verification ({runs:[{id,taskId,provider,status,passed,failed,total,createdAt}]}); ağ isteği yok.
 * Dürüstlük kuralı: desteklenmeyen/planlı doğrulama türleri (API, veri, erişilebilirlik laboratuvarı, mutasyon) çalışıyormuş gibi gösterilmez.
 * Kural kaynağı: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md (D3). Sunucu metni yalnız textContent. Saf mantık: window.AM_PAGE_VERIFY.pure.
 * Değiştirme: yalnız sahibi ya da ana oturum. Yükleme sırasında DOM'a dokunmaz.
 */
(function () {
  "use strict";

  if (!window.AM_PAGES || typeof window.AM_PAGES.register !== "function") {
    throw new Error("page-verify: AM_PAGES sayfa çerçevesi (pages.js) yüklenmemiş; Beyin Verify sayfası kaydedilemedi.");
  }
  if (typeof window.AM_REGISTER_TR !== "function" || typeof window.AM_T !== "function") {
    throw new Error("page-verify: strings.js (AM_REGISTER_TR/AM_T) yüklenmemiş.");
  }

  window.AM_REGISTER_TR("page-verify", {
    "page-verify.title": "Beyin Verify",
    "page-verify.group": "Yönetim",
    "page-verify.lead": "Bir işin yapıldığına ancak kanıtla inanılır. Doğrulama koşularının sonucu burada, uydurma olmadan listelenir.",
    "page-verify.how": "Doğrulama üç katmanlıdır: yerel test, tarayıcı kontrolü ve bağımsız teslim denetçisi. Yapan ajan kendi işini onaylamış sayılmaz.",
    "page-verify.runsTitle": "Doğrulama koşuları",
    "page-verify.caption": "Doğrulama koşuları tablosu: sağlayıcı, durum, geçti, kaldı, toplam ve zaman",
    "page-verify.col.provider": "Sağlayıcı",
    "page-verify.col.status": "Durum",
    "page-verify.col.passed": "Geçti",
    "page-verify.col.failed": "Kaldı",
    "page-verify.col.total": "Toplam",
    "page-verify.col.time": "Zaman",
    "page-verify.summary": "Toplam {n} koşu · geçen {p} · kalan {f}",
    "page-verify.loading": "Doğrulama kayıtları yükleniyor…",
    "page-verify.emptyTitle": "Henüz doğrulama kaydı yok",
    "page-verify.emptyDetail": "Bir doğrulama koşusu kaydedildiğinde burada görünür. Kayıt yokken başarılı varsayılmaz.",
    "page-verify.errTitle": "Doğrulama kayıtları alınamadı",
    "page-verify.errDetail": "Ayrıntı: {reason}",
    "page-verify.renderErr": "Sayfa çizilemedi: {reason}",
    "page-verify.noLoader": "Veri yükleme eylemi (loadData) kullanılamıyor.",
    "page-verify.retry": "Yeniden dene",
    "page-verify.na": "—",
    "page-verify.inconsistent": "Sayılar tutarsız",
    "page-verify.st.passed": "Geçti",
    "page-verify.st.failed": "Kaldı",
    "page-verify.st.partial": "Kısmen geçti",
    "page-verify.st.running": "Çalışıyor",
    "page-verify.st.pending": "Bekliyor",
    "page-verify.st.error": "Hata",
    "page-verify.st.unknown": "Bilinmeyen durum",
    "page-verify.typesTitle": "Doğrulama türleri",
    "page-verify.typesHint": "Hangi doğrulamanın gerçekten var olduğu, hangisinin henüz planlı olduğu.",
    "page-verify.typesCaption": "Doğrulama türleri tablosu: tür ve destek durumu",
    "page-verify.col.type": "Tür",
    "page-verify.col.support": "Destek",
    "page-verify.col.note": "Not",
    "page-verify.sup.supported": "Destekleniyor",
    "page-verify.sup.partial": "Kısmi",
    "page-verify.sup.planned": "Planlı",
    "page-verify.type.local": "Yerel test",
    "page-verify.type.localNote": "Projenin kendi testleri yerelde çalıştırılır; dış istek yapılmaz.",
    "page-verify.type.browser": "Tarayıcı kontrolü",
    "page-verify.type.browserNote": "Yalnız bildirimsel senaryolar, yerel sunucuda; genel amaçlı tarayıcı otomasyonu yok.",
    "page-verify.type.audit": "Bağımsız teslim denetçisi",
    "page-verify.type.auditNote": "Teslimi yapandan ayrı bir denetçi kanıtı inceler.",
    "page-verify.type.api": "API testi",
    "page-verify.type.apiNote": "API test laboratuvarı henüz yok.",
    "page-verify.type.data": "Veri doğrulama",
    "page-verify.type.dataNote": "Veri doğrulama sağlayıcısı henüz yok.",
    "page-verify.type.a11y": "Erişilebilirlik laboratuvarı",
    "page-verify.type.a11yNote": "Projeler için otomatik erişilebilirlik laboratuvarı henüz yok.",
    "page-verify.type.mutation": "Mutasyon testi",
    "page-verify.type.mutationNote": "Mutasyon testi henüz yok."
  });

  var T = function (key, vars) { return window.AM_T(key, vars); };

  // ------------------------------------------------------------------ saf mantık
  var ST = {
    passed: { tone: "ok", icon: "check" }, failed: { tone: "bad", icon: "x" }, partial: { tone: "warn", icon: "alert" },
    running: { tone: "info", icon: "spinner" }, pending: { tone: "muted", icon: "clock" }, error: { tone: "bad", icon: "alert" }, unknown: { tone: "warn", icon: "info" }
  };
  var ALIASES = { pass: "passed", ok: "passed", success: "passed", succeeded: "passed", green: "passed", fail: "failed", failure: "failed", red: "failed", queued: "pending" };

  function str(v, max) { return typeof v === "string" ? v.slice(0, max || 300) : v == null ? "" : String(v).slice(0, max || 300); }
  function num(v) { var n = Number(v); return v === null || v === undefined || v === "" || !isFinite(n) ? null : n; }

  function statusKey(s) {
    var k = String(s == null ? "" : s).toLowerCase().trim();
    if (Object.prototype.hasOwnProperty.call(ALIASES, k)) k = ALIASES[k];
    return Object.prototype.hasOwnProperty.call(ST, k) && k !== "unknown" ? k : "unknown";
  }
  // Sayılar tutarsızsa (kaldı > 0 iken "geçti" gibi) durum sayılardan düzeltilmez ama uyarı bayrağı verilir.
  function statusInfo(s) {
    var key = statusKey(s);
    return { key: key, tone: ST[key].tone, icon: ST[key].icon, labelKey: "page-verify.st." + key };
  }
  function normRuns(value) {
    var list = value && typeof value === "object" ? (Array.isArray(value) ? value : value.runs) : null;
    return (Array.isArray(list) ? list.slice(0, 500) : []).map(function (r) {
      var o = r && typeof r === "object" ? r : {};
      return { id: str(o.id, 64), taskId: o.taskId == null ? "" : str(o.taskId, 64), provider: str(o.provider, 100), status: str(o.status, 40), passed: num(o.passed), failed: num(o.failed), total: num(o.total), createdAt: str(o.createdAt, 40) };
    });
  }
  function inconsistent(r) {
    return r.passed !== null && r.failed !== null && r.total !== null && r.passed + r.failed > r.total;
  }
  function sortRuns(runs) {
    return (runs || []).map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) {
      var ta = Date.parse(a.r.createdAt), tb = Date.parse(b.r.createdAt);
      var va = isNaN(ta) ? -Infinity : ta, vb = isNaN(tb) ? -Infinity : tb;
      return vb === va ? a.i - b.i : vb > va ? 1 : -1;
    }).map(function (x) { return x.r; });
  }
  function summarize(runs) {
    var s = { total: (runs || []).length, passed: 0, failed: 0 };
    (runs || []).forEach(function (r) { s.passed += r.passed || 0; s.failed += r.failed || 0; });
    return s;
  }
  function fmtTime(iso) {
    var d = new Date(String(iso || ""));
    if (isNaN(d.getTime())) return str(iso, 40);
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  var TYPES = [
    { id: "local", support: "supported" }, { id: "browser", support: "partial" }, { id: "audit", support: "supported" },
    { id: "api", support: "planned" }, { id: "data", support: "planned" }, { id: "a11y", support: "planned" }, { id: "mutation", support: "planned" }
  ];
  var SUP = { supported: { tone: "ok", icon: "check" }, partial: { tone: "warn", icon: "alert" }, planned: { tone: "muted", icon: "clock" } };

  // ------------------------------------------------------------------ DOM
  var TONES = { ok: 1, warn: 1, bad: 1, info: 1, muted: 1 };
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  function icon(name, size) {
    try { if (typeof window.AM_ICON === "function") return window.AM_ICON(name, { size: size || 14 }); } catch (e) { /* simge yoksa metin yeter */ }
    return document.createTextNode("");
  }
  function chip(text, tone, iconName) {
    var t = TONES[tone] === 1 ? tone : "muted";
    var c = el("span", "am-more-chip am-more-chip--" + t);
    c.appendChild(icon(iconName, 12));
    c.appendChild(el("span", "am-more-chip-t", text));
    return c;
  }
  function stateCard(kind, title, detail, retry) {
    var c = el("div", "am-more-card am-more-card--" + (kind === "error" ? "error" : kind === "loading" ? "loading" : "empty"));
    c.setAttribute("role", kind === "error" ? "alert" : "status");
    if (kind === "loading") {
      c.setAttribute("aria-busy", "true");
      c.appendChild(el("p", "am-more-card-t", title));
      for (var i = 0; i < 3; i++) { var s = el("span", "am-more-skel"); s.setAttribute("aria-hidden", "true"); c.appendChild(s); }
      return c;
    }
    c.appendChild(icon(kind === "error" ? "alert" : "info", 18));
    c.appendChild(el("p", "am-more-card-t", title));
    if (detail) c.appendChild(el("p", "am-more-card-d", detail));
    if (retry) { var b = el("button", "am-more-btn", T("page-verify.retry")); b.type = "button"; b.addEventListener("click", retry); c.appendChild(b); }
    return c;
  }
  function noteLine(iconName, text) {
    var n = el("p", "am-more-note");
    n.appendChild(icon(iconName, 16));
    n.appendChild(el("span", "am-more-note-t", text));
    return n;
  }
  function tableShell(captionKey, cols) {
    var wrap = el("div", "am-more-tablewrap");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("aria-label", T(captionKey));
    var t = el("table", "am-more-table");
    t.appendChild(el("caption", "am-more-sr", T(captionKey)));
    var thead = el("thead"); var htr = el("tr");
    cols.forEach(function (c) { var th = el("th", "am-more-th", T(c)); th.setAttribute("scope", "col"); htr.appendChild(th); });
    thead.appendChild(htr); t.appendChild(thead);
    var tb = el("tbody"); t.appendChild(tb); wrap.appendChild(t);
    return { wrap: wrap, tbody: tb };
  }
  function section(id, titleKey) {
    var s = el("section", "am-more-sec");
    s.setAttribute("aria-labelledby", id);
    var h = el("h3", "am-more-h3", T(titleKey)); h.setAttribute("id", id);
    s.appendChild(h);
    return s;
  }
  function numCell(v) { return el("td", "am-more-td am-more-td--num", v === null ? T("page-verify.na") : String(v)); }

  var S = { AM: null, root: null, requested: false };

  function request(force) {
    var AM = S.AM;
    if (!AM || !AM.actions || typeof AM.actions.loadData !== "function") return false;
    if (S.requested && !force) return true;
    S.requested = true;
    AM.actions.loadData("verification");
    return true;
  }

  function runsSection(AM) {
    var sec = section("am-more-vf-r", "page-verify.runsTitle");
    var d = AM && AM.state && AM.state.data ? AM.state.data.verification : null;
    if (!d) {
      if (!request(false)) sec.appendChild(stateCard("error", T("page-verify.errTitle"), T("page-verify.noLoader"), null));
      else sec.appendChild(stateCard("loading", T("page-verify.loading")));
      return sec;
    }
    if (d.status === "loading") { sec.appendChild(stateCard("loading", T("page-verify.loading"))); return sec; }
    if (d.status === "error") {
      sec.appendChild(stateCard("error", T("page-verify.errTitle"), T("page-verify.errDetail", { reason: str(d.reason, 200) || "?" }), function () { request(true); redraw(); }));
      return sec;
    }
    S.requested = false;
    var runs = sortRuns(normRuns(d.value));
    if (!runs.length) { sec.appendChild(stateCard("empty", T("page-verify.emptyTitle"), T("page-verify.emptyDetail"), null)); return sec; }
    var sm = summarize(runs);
    sec.appendChild(el("p", "am-more-count", T("page-verify.summary", { n: sm.total, p: sm.passed, f: sm.failed })));
    var t = tableShell("page-verify.caption", ["page-verify.col.provider", "page-verify.col.status", "page-verify.col.passed", "page-verify.col.failed", "page-verify.col.total", "page-verify.col.time"]);
    runs.forEach(function (r) {
      var info = statusInfo(r.status);
      var tr = el("tr", "am-more-row am-more-runrow");
      var th = el("th", "am-more-td am-more-td--name", r.provider || T("page-verify.na")); th.setAttribute("scope", "row"); tr.appendChild(th);
      var tdS = el("td", "am-more-td");
      tdS.appendChild(chip(T(info.labelKey) + (info.key === "unknown" && r.status ? ": " + r.status : ""), info.tone, info.icon));
      if (inconsistent(r)) tdS.appendChild(chip(T("page-verify.inconsistent"), "warn", "alert"));
      tr.appendChild(tdS);
      tr.appendChild(numCell(r.passed)); tr.appendChild(numCell(r.failed)); tr.appendChild(numCell(r.total));
      tr.appendChild(el("td", "am-more-td", fmtTime(r.createdAt) || T("page-verify.na")));
      t.tbody.appendChild(tr);
    });
    sec.appendChild(t.wrap);
    return sec;
  }

  function typesSection() {
    var sec = section("am-more-vf-t", "page-verify.typesTitle");
    sec.appendChild(el("p", "am-more-hint", T("page-verify.typesHint")));
    var t = tableShell("page-verify.typesCaption", ["page-verify.col.type", "page-verify.col.support", "page-verify.col.note"]);
    TYPES.forEach(function (ty) {
      var tr = el("tr", "am-more-row am-more-typerow");
      var th = el("th", "am-more-td am-more-td--name", T("page-verify.type." + ty.id)); th.setAttribute("scope", "row"); tr.appendChild(th);
      var td = el("td", "am-more-td");
      td.appendChild(chip(T("page-verify.sup." + ty.support), SUP[ty.support].tone, SUP[ty.support].icon));
      tr.appendChild(td);
      tr.appendChild(el("td", "am-more-td", T("page-verify.type." + ty.id + "Note")));
      t.tbody.appendChild(tr);
    });
    sec.appendChild(t.wrap);
    return sec;
  }

  function redraw() { if (S.AM && S.root) { try { draw(S.AM, S.root); } catch (e) { fail(S.AM, S.root, e); } } }

  function draw(AM, root) {
    S.AM = AM; S.root = root;
    root.textContent = "";
    var page = el("section", "am-more-page");
    page.setAttribute("aria-labelledby", "am-more-vf-h");
    var h = el("h2", "am-more-h", T("page-verify.title")); h.setAttribute("id", "am-more-vf-h");
    page.appendChild(h);
    page.appendChild(el("p", "am-more-lead", T("page-verify.lead")));
    var notes = el("div", "am-more-notes");
    notes.appendChild(noteLine("shield", T("page-verify.how")));
    page.appendChild(notes);
    page.appendChild(runsSection(AM));
    page.appendChild(typesSection());
    root.appendChild(page);
  }

  function fail(AM, root, e) {
    root.textContent = "";
    root.appendChild(stateCard("error", T("page-verify.errTitle"), T("page-verify.renderErr", { reason: str(e && e.message, 200) || "?" }), function () {
      try { draw(AM, root); } catch (e2) { fail(AM, root, e2); }
    }));
  }

  // Girdi alanı yok: her durum değişiminde baştan çizilir.
  function render(AM, root) { draw(AM, root); }

  window.AM_PAGE_VERIFY = {
    render: render,
    pure: { statusKey: statusKey, statusInfo: statusInfo, normRuns: normRuns, sortRuns: sortRuns, summarize: summarize, inconsistent: inconsistent, TYPES: TYPES }
  };

  window.AM_PAGES.register("verify", {
    title: T("page-verify.title"),
    group: T("page-verify.group"),
    render: function (AM, root) {
      try { render(AM, root); } catch (e) { fail(AM, root, e); }
    }
  });
})();
