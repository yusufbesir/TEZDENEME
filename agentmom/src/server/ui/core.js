// D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. Ek bölümler 'D9' ile işaretlidir; ADR-016: yetenekler kendiliğinden çalışmaz.
// AgentMom Komuta Paneli çekirdeği (Faz 10, Faz 11 dilim 2'de masaüstü mimarisine uyarlandı). Yazan: Claude [İP:AgentMom Faz 10/11].
// Sahip: Yusuf. Değiştirme kuralı: yalnız bu dosyayı yazan Claude iş parçacığı değiştirir; sözleşmeler docs/tasarim/arayuz-sozlesmesi.md ve masaustu-arayuz-sozlesmesi-faz11.md bağlayıcıdır.
// Güvenlik özeti: belirteç yalnız bu dosyadadır, yalnız Authorization: Bearer başlığında gider (çerez yok, CSRF'e kapalı),
// #token= parçasından okununca adres çubuğundan silinir, yalnız bu sekmenin sessionStorage'ında (olmazsa bellekte) tutulur ve
// hiçbir yere (DOM, günlük, hata metni, başlık) yazılmaz. Sunucu metni state'e girmeden temizlenir; çizim modüllerde yalnız textContent ile yapılır.
// Onay/ret ve serbest metinle görev kaydı her zaman AM_DIALOG.confirm ile (eylem + hedef gösterilerek) sorulur; iptal edilirse hiçbir istek gitmez.
// Sessiz geri düşme yok: başarısız istek yeniden denenmez, başka uca/sağlayıcıya geçilmez; açık hata kartı gösterilir. Eksik modül = görünür hata (beyaz ekran yok).
"use strict";
(function () {
  var KEY = "agentmom.token";
  var TOKEN_RE = /^[A-Za-z0-9_-]{16,200}$/;
  var HASH_RE = /^#token=([A-Za-z0-9_-]{16,200})$/;
  var ID_RE = /^[0-9a-f-]{36}$/;
  var DOC_NAMES = ["egitim", "harita", "el-kitabi", "guvenlik", "claude-code", "codex", "gemini", "yetenekler"];
  var CTRL_RE = /[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  var POLL_MS = 15000;
  var LOG_MAX = 100;

  var token = null;
  var confirmOpen = false;
  var hoverHold = false;
  var focusHold = false;
  var refreshing = null;

  function $(id) { return document.getElementById(id); }

  // Ajan kaynaklı metinde görünmez/çift yönlü/denetim karakterleri başlığı sahteleyebilir: boşluğa çevrilir ve uzunluk sınırlanır.
  function clean(v, max) {
    var s = String(v == null ? "" : v).replace(CTRL_RE, " ");
    var lim = max || 500;
    return s.length > lim ? s.slice(0, lim - 1) + "…" : s;
  }

  // Hata metinlerine belirtecin kazara karışmasını engelleyen son süzgeç.
  function scrub(text) {
    var s = String(text == null ? "" : text);
    if (token && token.length >= 16) s = s.split(token).join("[gizli]");
    return s.replace(/Bearer\s+[A-Za-z0-9_-]+/gi, "Bearer [gizli]").replace(/#token=[^\s]*/g, "#token=[gizli]");
  }

  function hasT() { return typeof window.AM_T === "function"; }
  function T(key, vars) {
    if (hasT()) {
      try { return String(window.AM_T(key, vars)); } catch (e) { /* aşağıdaki görünür işarete düş */ }
    }
    return "⟦" + key + "⟧";
  }

  var prefs = (window.AM_PREFS && typeof window.AM_PREFS.load === "function") ? window.AM_PREFS.load() : {};

  // ---- Örnek durum (sözleşmedeki şekil) ----
  var AM = {
    state: {
      connected: false, health: { status: null, checks: [] },
      tasks: [], debt: [], decisions: [], skills: [], providers: [], evidence: {},
      topics: [], timeline: { local: [] }, subsessions: [], usage: null, ctx: null, indicators: null, docs: {}, policy: null, backup: null, data: {},
      project: { name: "AgentMom" }, busy: false, updatedAt: null
    },
    log: [],
    view: {
      selectedId: null, search: "", lastSeenCount: 0,
      selectedTopicId: null, panelOpen: prefs.panelOpen === true, panelWide: prefs.panelWide === true, panelTab: "topics", panelSearch: "", panelFilter: "",
      settingsOpen: false, settingsSection: "general", projectSettingsOpen: false, projectSettingsPage: "general",
      theme: prefs.theme || "dark", density: "comfortable", complexity: prefs.complexity === "simple" ? "simple" : "advanced", lang: prefs.lang === "en" ? "en" : "tr", advancedOpen: [], leftW: prefs.leftW || null, rightW: prefs.rightW || null, sidebarCollapsed: prefs.sidebarCollapsed === true,
      page: "chat", pageParam: "", paletteOpen: false, focusComposer: false, draft: "", newSession: false, order: [], attachments: [], history: { stack: [], idx: -1 }
    },
    actions: null
  };

  var seenTopics = Object.create(null); // konu id -> görülen öğe sayısı (okunmadı ve 'Yeni' ayracı için, yalnız bellekte)

  function addLog(role, text) {
    AM.log.push({ role: role === "user" ? "user" : "assistant", text: String(text == null ? "" : text), at: new Date().toISOString() });
    if (AM.log.length > LOG_MAX) AM.log.splice(0, AM.log.length - LOG_MAX);
  }

  // ---- Hata sınırı ----
  // AM_T yoksa (strings.js yüklenemedi) ham Türkçe yedek metin; bu bir geri düşme değil, hatanın kendisini göstermektir.
  var RAW_TITLE = "Bir şey ters gitti";
  var RAW_MISSING = "Panel dosyalarından biri yüklenemedi. Sayfayı yenileyin; sorun sürerse sunucuyu yeniden başlatın.";
  var RAW_RETRY = "Yeniden dene";

  function ensureErrorCard() {
    var card = $("errorCard");
    if (card) return card;
    // İskelet de yoksa beyaz ekran yerine en küçük okunur kartı kendimiz kurarız.
    card = document.createElement("div");
    card.id = "errorCard";
    card.setAttribute("role", "alert");
    var h = document.createElement("strong"); h.id = "errorTitle";
    var p = document.createElement("p"); p.id = "errorMsg";
    var b = document.createElement("button"); b.id = "errorRetry"; b.type = "button"; b.textContent = RAW_RETRY;
    b.addEventListener("click", onRetry);
    card.appendChild(h); card.appendChild(p); card.appendChild(b);
    (document.body || document.documentElement).appendChild(card);
    return card;
  }

  function showError(message, rawTitle) {
    try {
      var card = ensureErrorCard();
      var t = $("errorTitle"), m = $("errorMsg");
      if (t) t.textContent = rawTitle ? RAW_TITLE : clean(T("error.title"), 300);
      if (m) m.textContent = clean(scrub(message), 400);
      card.hidden = false;
      // Kart #app içindeyse ve #app gizliyse hata görünmez kalmasın.
      var app = $("app");
      if (app && app.contains(card) && app.hidden && (rawTitle || token)) app.hidden = false;
    } catch (e) { /* hata kartı bile kurulamıyorsa yapılacak başka güvenli şey yok */ }
  }

  // Eksik/bozuk modül hatası KALICIDIR: sonraki başarılı veri yenilemesi onu silemez (kullanıcı boş uygulamanın nedenini okuyabilsin).
  var fatalModuleMsg = null;
  function hideError() { if (fatalModuleMsg) return; var c = $("errorCard"); if (c) c.hidden = true; }

  // ---- Modül kaydı: her modül window.AM_<AD> = { init(AM, host), render(AM) }; eksik/bozuk modül GÖRÜNÜR hata verir ----
  var MODULES = [
    { global: "AM_SHELL", host: "topbar", file: "shell.js" },
    { global: "AM_SIDEBAR", host: "sidebar", file: "sidebar.js" },
    { global: "AM_USERMENU", host: "userMenuRoot", file: "usermenu.js" },
    { global: "AM_PAGES", host: "pageView", file: "pages.js" },
    { global: "AM_CHAT", host: "chatView", file: "chat.js" },
    { global: "AM_PANEL", host: "panel", file: "panel.js" },
    { global: "AM_RING", host: "ringBtn", file: "ring.js" },
    { global: "AM_SETTINGS", host: "overlayRoot", file: "settings.js" },
    { global: "AM_USAGE", host: "overlayRoot", file: "usage.js" },
    { global: "AM_PALETTE", host: "overlayRoot", file: "palette.js" }
  ];
  var REQUIRED_GLOBALS = ["AM_T", "AM_ICON", "AM_MD", "AM_STATUS", "AM_DIALOG", "AM_NAME"];
  var initialized = false;

  function missingParts() {
    var miss = [];
    REQUIRED_GLOBALS.forEach(function (g) { if (!window[g]) miss.push(g); });
    MODULES.forEach(function (m) { var mod = window[m.global]; if (!mod || typeof mod.render !== "function" || typeof mod.init !== "function") miss.push(m.file); });
    return miss;
  }

  function initModules() {
    if (initialized) return;
    var miss = missingParts();
    if (miss.length) { fatalModuleMsg = RAW_MISSING + " (eksik: " + miss.join(", ") + ")"; showError(fatalModuleMsg, true); return; }
    MODULES.forEach(function (m) {
      try { window[m.global].init(AM, $(m.host)); }
      catch (e) { showError(T("error.render", { reason: m.file + ": " + clean(scrub(e && e.message ? e.message : String(e)), 200) })); }
    });
    initialized = true;
  }

  var renderQueued = false;
  function render() {
    if (!initialized) return;
    rebuildDerived();
    applyChrome();
    MODULES.forEach(function (m) {
      try { window[m.global].render(AM); }
      catch (e) { showError(T("error.render", { reason: m.file + ": " + clean(scrub(e && e.message ? e.message : String(e)), 200) })); }
    });
  }
  // Aynı turda gelen birden çok durum değişikliği tek çizimde toplanır.
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    Promise.resolve().then(function () { renderQueued = false; render(); });
  }

  function onRetry() { hideError(); if (token) refresh(); else render(); }

  window.addEventListener("error", function (ev) {
    var msg = ev && ev.message ? ev.message : "";
    showError(hasT() ? T("error.render", { reason: clean(scrub(msg), 200) }) : RAW_MISSING, !hasT());
  });
  window.addEventListener("unhandledrejection", function (ev) {
    var r = ev ? ev.reason : null;
    if (r && r.auth) { expire(); return; }
    var msg = r && r.message ? r.message : String(r == null ? "" : r);
    showError(hasT() ? T("error.unknown") + " " + clean(scrub(msg), 200) : RAW_MISSING, !hasT());
  });

  // ---- Belirteç ----
  function storeToken(v) {
    token = v;
    try { sessionStorage.setItem(KEY, v); } catch (e) { /* özel pencere: yalnız bellekte */ }
  }

  function clearToken() {
    token = null;
    try { sessionStorage.removeItem(KEY); } catch (e) { /* sessionStorage yok */ }
  }

  function loadToken() {
    var h = location.hash || "";
    if (h.indexOf("#token=") === 0) {
      var m = HASH_RE.exec(h);
      if (m) storeToken(m[1]);
      // Biçimi bozuk olsa bile parça adres çubuğundan ve geçmişten silinir.
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* yok */ }
    }
    if (!token) {
      try { token = sessionStorage.getItem(KEY) || null; } catch (e) { /* sessionStorage yok */ }
    }
    if (token && !TOKEN_RE.test(token)) clearToken();
  }

  // ---- Ağ ----
  function authError() { var e = new Error("auth"); e.auth = true; return e; }

  // Yalnız aynı kaynak yollar: "/" ile başlar, "//" ile başlamaz, ters bölü içermez.
  function samePath(path) { return typeof path === "string" && path.charAt(0) === "/" && path.charAt(1) !== "/" && path.indexOf("\\") < 0; }

  // timeoutMs (isteğe bağlı): AbortController ile iptal; yoksa davranış değişmez. AbortController yoksa zaman aşımı uygulanmaz.
  function api(path, method, body, timeoutMs) {
    if (!samePath(path)) return Promise.reject(new Error("yol reddedildi"));
    if (!token) return Promise.reject(authError());
    var init = { method: method || "GET", headers: { authorization: "Bearer " + token }, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", redirect: "error" };
    if (body !== undefined) { init.headers["content-type"] = "application/json"; init.body = JSON.stringify(body); }
    var timer = null;
    if (timeoutMs && typeof AbortController === "function") { var ac = new AbortController(); init.signal = ac.signal; timer = setTimeout(function () { ac.abort(); }, timeoutMs); }
    return fetch(path, init).then(function (r) {
      return r.text().then(function (t) {
        if (timer) clearTimeout(timer);
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
        if (r.status === 401) throw authError();
        AM.state.connected = true;
        return { status: r.status, json: j };
      });
    }, function (e) {
      if (timer) clearTimeout(timer);
      AM.state.connected = false;
      throw e;
    });
  }

  function reasonOf(res) {
    var j = res && res.json;
    return clean(j && typeof j.error === "string" ? j.error : "", 200);
  }

  function expire() {
    clearToken();
    var lm = $("loginMsg");
    if (lm) lm.textContent = T("login.expired");
    show(false);
  }

  // ---- Temizleyiciler: sunucu verisi state'e girmeden önce ----
  function arr(v, max) { return Array.isArray(v) ? v.slice(0, max || 500) : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function idOf(v) { return clean(v, 64); }
  function numOrNull(v) { var n = Number(v); return v === null || v === undefined || v === "" || !isFinite(n) ? null : n; }
  function strOrNull(v, max) { return v === null || v === undefined ? null : clean(v, max || 100); }

  function normTask(t) {
    t = obj(t);
    var req = t.request && typeof t.request === "object" ? { target: t.request.target == null ? null : clean(t.request.target) } : null;
    var rk = t.risk && typeof t.risk === "object" ? { level: ["low", "medium", "high", "critical"].indexOf(t.risk.level) >= 0 ? t.risk.level : "unknown", score: numOrNull(t.risk.score), reasons: strList(t.risk.reasons, 8) } : null;
    var sm = t.semantics && typeof t.semantics === "object" ? { effect: clean(t.semantics.effect, 300), reversible: ["yes", "partial", "no"].indexOf(t.semantics.reversible) >= 0 ? t.semantics.reversible : "unknown", undo: clean(t.semantics.undo, 300) } : null;
    return { id: idOf(t.id), title: clean(t.title, 300), state: clean(t.state, 40), requestedAction: clean(t.requestedAction), request: req, decision: clean(t.decision, 40), createdAt: clean(t.createdAt, 40), risk: rk, semantics: sm };
  }
  function normDebt(d) {
    d = obj(d);
    var n = Number(d.overdueDays);
    return { assumptionId: idOf(d.assumptionId), decisionId: idOf(d.decisionId), decisionTitle: clean(d.decisionTitle, 300), text: clean(d.text), status: clean(d.status, 40), overdueDays: isFinite(n) ? Math.max(0, Math.floor(n)) : 0, kind: clean(d.kind, 40) };
  }
  function normDecision(d) {
    d = obj(d);
    return { id: idOf(d.id), title: clean(d.title, 300), reviewState: clean(d.reviewState, 40), reviewReasons: arr(d.reviewReasons, 20).map(function (r) { return clean(r); }) };
  }
  function normSkill(s) { s = obj(s); return { id: idOf(s.id), name: clean(s.name, 300), state: clean(s.state, 40), riskClass: clean(s.riskClass, 40) }; }
  function normProvider(p) {
    p = obj(p);
    return { id: clean(p.id, 100), displayName: clean(p.displayName, 300), routeKind: clean(p.routeKind, 40), disabled: p.disabled === true, capabilities: arr(p.capabilities, 100).map(function (c) { c = obj(c); return { operation: clean(c.operation, 100), status: clean(c.status, 40) }; }) };
  }
  function normHealth(h) {
    h = obj(h);
    var st = h.status === "green" ? "green" : h.status === "red" ? "red" : null;
    return { status: st, checks: arr(h.checks, 50).map(function (c) { c = obj(c); return { name: clean(c.name, 100), ok: c.ok === true, detail: clean(c.detail) }; }) };
  }
  function normEvidence(e) { e = obj(e); return { kind: clean(e.kind, 60), summary: clean(e.summary), createdAt: clean(e.createdAt, 40) }; }
  function normSub(s) {
    s = obj(s);
    var steps = s.steps && typeof s.steps === "object" ? { done: numOrNull(s.steps.done), total: numOrNull(s.steps.total) } : null;
    var src = s.modelSource === "run" || s.modelSource === "declared" ? s.modelSource : "unknown";
    return {
      id: idOf(s.id), name: window.AM_NAME ? window.AM_NAME.clean(s.name) : clean(s.name, 60), roleHint: strOrNull(s.roleHint, 60), provider: clean(s.provider, 60), model: strOrNull(s.model, 100), modelSource: src,
      state: clean(s.state, 40), pinned: s.pinned === true, archived: s.archived === true, unread: s.unread === true, updatedAt: clean(s.updatedAt, 40), taskId: s.taskId ? idOf(s.taskId) : null, steps: steps, renameCount: numOrNull(s.renameCount) || 0
    };
  }
  function normNumRec(r, keys) { r = obj(r); var o = {}; keys.forEach(function (k) { o[k] = numOrNull(r[k]); }); return o; }
  function normUsage(u) {
    u = obj(u);
    var tokens = u.tokens && typeof u.tokens === "object" ? normNumRec(u.tokens, ["input", "output", "cacheWrite", "cacheRead"]) : null;
    var cc = u.codeChanges && typeof u.codeChanges === "object" ? normNumRec(u.codeChanges, ["added", "removed"]) : null;
    return {
      updatedAt: clean(u.updatedAt, 40), topics: numOrNull(u.topics), tokens: tokens, cacheHitPct: numOrNull(u.cacheHitPct), codeChanges: cc,
      byModel: arr(u.byModel, 20).map(function (m) { m = obj(m); var o = normNumRec(m, ["input", "output", "cacheWrite", "cacheRead", "topics"]); o.model = clean(m.model, 100); return o; }),
      topicsTable: arr(u.topicsTable, 200).map(function (t) { t = obj(t); return { id: idOf(t.id), title: clean(t.title, 300), model: strOrNull(t.model, 100), lastAt: strOrNull(t.lastAt, 40), tokens: numOrNull(t.tokens), cacheHitPct: numOrNull(t.cacheHitPct), sharePct: numOrNull(t.sharePct) }; }),
      note: clean(u.note, 200)
    };
  }
  function normCtx(c) { c = obj(c); return { tokens: numOrNull(c.tokens), limit: numOrNull(c.limit) || 150000, pct: numOrNull(c.pct), source: c.source === "run" ? "run" : "unknown" }; }
  function strList(v, max) { return arr(v, max || 200).map(function (x) { return clean(x, 300); }); }
  function normBackup(b) {
    b = obj(b);
    var lb = b.lastBackup && typeof b.lastBackup === "object" ? { at: clean(b.lastBackup.at, 40), dir: clean(b.lastBackup.dir, 120), reason: clean(b.lastBackup.reason, 80) } : null;
    var lv = b.lastVerify && typeof b.lastVerify === "object" ? { at: clean(b.lastVerify.at, 40), ok: b.lastVerify.ok === true, problems: strList(b.lastVerify.problems, 10) } : null;
    var ld = b.lastDecision && typeof b.lastDecision === "object" ? { at: clean(b.lastDecision.at, 40), action: clean(b.lastDecision.action, 20), code: clean(b.lastDecision.code, 40), reason: clean(b.lastDecision.reason, 300) } : null;
    var cfg = obj(b.config);
    return { lastBackup: lb, ageHours: numOrNull(b.ageHours), changesSince: numOrNull(b.changesSince) || 0, lastVerify: lv, lastDecision: ld, config: { minChanges: numOrNull(cfg.minChanges), idleMinutes: numOrNull(cfg.idleMinutes), staleDays: numOrNull(cfg.staleDays) },
      warnings: arr(b.warnings, 10).map(function (w) { w = obj(w); return { code: clean(w.code, 40), text: clean(w.text, 400) }; }) };
  }
  // Genel veri yükleyici (D3 sayfaları): modüller ağ isteği YAPMAZ; yalnız beyaz listeli uçlar, doğrulanmış parametrelerle ve derin temizlikten geçerek AM.state.data'ya yazılır.
  function deepClean(v, depth, lim) {
    if (depth > (lim || 6)) return null;
    if (typeof v === "string") return clean(v, 2000);
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "boolean" || v === null) return v;
    if (Array.isArray(v)) return v.slice(0, 500).map(function (x) { return deepClean(x, depth + 1, lim); });
    if (v && typeof v === "object") {
      var o = {};
      Object.keys(v).slice(0, 80).forEach(function (k) { if (/^[A-Za-z0-9_.-]{1,60}$/.test(k) && k !== "__proto__") o[k] = deepClean(v[k], depth + 1, lim); });
      return o;
    }
    return null;
  }
  var MEM_SCOPE_RE = /^[A-Za-z0-9][A-Za-z0-9_.:\- ]{0,79}$/;
  function parseContextParam(p) {
    var m = typeof p === "string" ? /^([123])\|([0-9]{3,5})\|([\s\S]{1,200})$/.exec(p) : null;
    if (!m) return null;
    var budget = parseInt(m[2], 10), q = m[3];
    if (budget < 200 || budget > 20000 || q.search(CTRL_RE) >= 0 || q.trim() === "") return null;
    return { stage: parseInt(m[1], 10), budget: budget, q: q.trim() };
  }
  // Proje hafızası özeti çok satırlı metindir: derin temizlik satır sonlarını silerdi; burada satır sonu/sekme korunur, diğer denetim ve çift yönlü karakterler boşluğa çevrilir (en çok 60000).
  var BLOCK_CTRL_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  // Örtük öneri metni derin temizlikte 2000'de kesilip "…" eklenirdi; kesilmiş metin sessizce kaydedilmesin diye metin kesilmeden (en çok 20000) tutulur, daha uzunsa textCut=true işaretlenir (eklenemez).
  function cleanImplicit(json) {
    var v = deepClean(json, 0);
    if (v && Array.isArray(v.candidates) && json && Array.isArray(json.candidates)) {
      v.candidates.forEach(function (c, i) {
        var jc = json.candidates[i];
        if (!c || typeof c !== "object" || !jc || typeof jc.text !== "string") return;
        var s = jc.text.replace(CTRL_RE, " ");
        c.textCut = s.length > 20000;
        c.text = c.textCut ? s.slice(0, 20000) : s;
      });
    }
    return v;
  }
  function cleanCompile(json) {
    var v = deepClean(json, 0);
    if (v && typeof v === "object" && !Array.isArray(v) && json && typeof json.markdown === "string") {
      var s = json.markdown.replace(/\r\n?/g, "\n").replace(BLOCK_CTRL_RE, " ");
      v.markdown = s.length > 60000 ? s.slice(0, 59999) + "…" : s;
    }
    return v;
  }
  function cleanArgument(json) {
    var v = deepClean(json, 0);
    if (v && typeof v === "object" && !Array.isArray(v) && v.argument && typeof v.argument === "object" && json && json.argument && typeof json.argument.markdown === "string") {
      var s = json.argument.markdown.replace(/\r\n?/g, "\n").replace(BLOCK_CTRL_RE, " ");
      v.argument.markdown = s.length > 60000 ? s.slice(0, 59999) + "…" : s;
    }
    return v;
  }
  // D8a/D8b parametre doğrulayıcıları (istemcide; sunucu sınırlarıyla aynı ya da daha sıkı). Geçersiz parametrede loadData istek ATMAZ.
  var IMPACT_FILE_RE = /^[A-Za-z0-9_.\/-]{1,200}$/;
  var PROVIDER_PARAM_RE = /^[A-Za-z0-9_.:-]{1,60}$/;
  var BROKER_CAPABILITIES = ["describeCapabilities", "validateConfiguration", "testConnection", "execute", "streamEvents", "getStatus", "cancel", "collectEvidence", "getUsage", "dispose"];
  var BROKER_ROLES = ["plan", "implement", "review", "verify"];
  function parseImpactParam(p) {
    var m = typeof p === "string" ? /^([^|]{1,200})\|([0-9])$/.exec(p) : null;
    if (!m) return null;
    var depth = parseInt(m[2], 10);
    if (depth < 1 || depth > 6 || !IMPACT_FILE_RE.test(m[1]) || m[1].indexOf("..") >= 0 || m[1].charAt(0) === "/") return null;
    return { file: m[1], depth: depth };
  }
  function parseBrokerParam(p) {
    var m = typeof p === "string" ? /^([A-Za-z]{1,40})\|([a-z]{0,20})$/.exec(p) : null;
    if (!m || BROKER_CAPABILITIES.indexOf(m[1]) < 0 || (m[2] !== "" && BROKER_ROLES.indexOf(m[2]) < 0)) return null;
    return { capability: m[1], role: m[2] };
  }
  // Madde 29 ve 25 (D8b): sürüm başvurusu ve veri dosyası yolu doğrulayıcıları (sunucu kurallarıyla aynı ya da daha sıkı; geçersizde istek atılmaz).
  var REF_RE = /^[A-Za-z0-9][A-Za-z0-9._\/-]{0,99}$/;
  function validRef(r) { return typeof r === "string" && REF_RE.test(r) && r.indexOf("..") < 0 && r.indexOf("//") < 0 && !/[\/.]$/.test(r) && !/\.lock$/.test(r); }
  function parseReleaseParam(p) {
    var m = typeof p === "string" ? /^([^|]{1,100})\|([^|]{1,100})$/.exec(p) : null;
    if (!m || !validRef(m[1]) || !validRef(m[2])) return null;
    return { from: m[1], to: m[2] };
  }
  var DATA_PATH_RE = /^(?![\\\/]{2})(?:[A-Za-z]:[\\\/]|\/)[^\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]{1,398}\.(?:csv|tsv|json|ndjson|jsonl)$/i;
  function validDataPath(p) { return typeof p === "string" && p.length <= 400 && DATA_PATH_RE.test(p) && !/(^|[\\\/])\.\.([\\\/]|$)/.test(p) && p.slice(2).indexOf(":") < 0; }

  function attentionBudget(p) {
    if (p === undefined || p === "") return undefined;
    var s = typeof p === "number" ? String(p) : p;
    if (typeof s !== "string" || !/^[0-9]{1,2}$/.test(s)) return null;
    var n = parseInt(s, 10);
    return n >= 1 && n <= 50 ? n : null;
  }
  var DATA_ENDPOINTS = {
    audit: { path: function () { return "/api/audit?limit=200"; } },
    workflows: { path: function () { return "/api/workflows"; } },
    verification: { path: function () { return "/api/verification/runs?limit=100"; } },
    capabilities: { path: function () { return "/api/capabilities"; } },
    memoryFlags: { path: function () { return "/api/memory/flags"; } },
    memorySearch: { path: function (q) { return "/api/memory/search?q=" + encodeURIComponent(String(q || "").slice(0, 100)) + "&limit=50"; }, ok: function (q) { return typeof q === "string" && q.length <= 100; } },
    // Aşamalı bağlam getirme (madde 44): parametre "aşama|bütçe|sorgu" (aşama 1-3, bütçe 200-20000, sorgu 1-200 karakter); salt okunur.
    memoryContext: { path: function (p) { var c = parseContextParam(p); return "/api/memory/context?q=" + encodeURIComponent(c.q) + "&stage=" + c.stage + "&budget=" + c.budget; }, ok: function (p) { return parseContextParam(p) !== null; } },
    // Proje hafızası özeti (madde 90): parametre isteğe bağlı kapsam adı; salt okunur.
    memoryCompile: { path: function (s) { return "/api/memory/compile" + (s ? "?scope=" + encodeURIComponent(s) : ""); }, ok: function (s) { return s === undefined || s === "" || (typeof s === "string" && MEM_SCOPE_RE.test(s)); } },
    // Örtük bilgi önerileri (madde 87): salt okunur; hiçbiri kendiliğinden kaydedilmez.
    memoryImplicit: { path: function () { return "/api/memory/implicit"; } },
    // Karar soy ağacı (madde 89): parametresiz = orman; karar kimliğiyle = tek zincir; salt okunur.
    genealogy: { path: function (id) { return id ? "/api/decisions/" + id + "/genealogy" : "/api/decisions/genealogy"; }, ok: function (id) { return id === undefined || id === "" || (typeof id === "string" && ID_RE.test(id)); } },
    secretRefs: { path: function () { return "/api/secrets/refs"; } },
    monitor: { path: function () { return "/api/monitor"; } },
    auditVerify: { path: function () { return "/api/audit/verify"; } },
    actionSemantics: { path: function () { return "/api/actions/semantics"; } },
    calibration: { path: function () { return "/api/calibration"; } },
    grants: { path: function () { return "/api/grants"; } },
    changes: { path: function () { return "/api/changes"; } },
    automation: { path: function () { return "/api/automation"; } },
    providerDetail: { path: function (id) { return "/api/providers/" + id; }, ok: function (id) { return typeof id === "string" && /^[a-z0-9-]{1,40}$/.test(id); } },
    // D8a (salt okunur; yalnız kullanıcı isteğiyle çağrılır, ADR-016): çelişki çözüm önerileri (64), bilgi yarı ömrü (66), öğrenme getirisi (97), dikkat sırası (93: parametre bütçe 1-50), argüman (61: karar kimliği).
    contradictionResolutions: { path: function () { return "/api/memory/contradictions/resolutions"; } },
    halflife: { path: function () { return "/api/memory/halflife"; } },
    learning: { path: function () { return "/api/reasoning/learning"; } },
    attention: { path: function (b) { var n = attentionBudget(b); return "/api/attention" + (n === undefined ? "" : "?budget=" + n); }, ok: function (b) { return attentionBudget(b) !== null; } },
    argument: { path: function (id) { return "/api/decisions/" + id + "/argument"; }, ok: function (id) { return typeof id === "string" && ID_RE.test(id); } },
    // D8b (hepsi salt okunur GET): etki haritası (70: parametre "dosya|derinlik"), graf özeti, süreklilik (73), çıkış planı (80: sağlayıcı kimliği), aracı (99: "yetenek|rol"), çevrimdışı (74), uzmanlık (86), gölge fiyat (72), eksiklik (83).
    analysisImpact: { path: function (p) { var c = parseImpactParam(p); return "/api/analysis/impact?file=" + encodeURIComponent(c.file) + "&depth=" + c.depth; }, ok: function (p) { return parseImpactParam(p) !== null; } },
    analysisGraph: { path: function () { return "/api/analysis/graph"; } },
    analysisContinuity: { path: function () { return "/api/analysis/continuity"; } },
    analysisExit: { path: function (id) { return "/api/analysis/exit?provider=" + encodeURIComponent(id); }, ok: function (id) { return typeof id === "string" && PROVIDER_PARAM_RE.test(id); } },
    analysisBroker: { path: function (p) { var c = parseBrokerParam(p); return "/api/analysis/broker?capability=" + c.capability + (c.role ? "&role=" + c.role : ""); }, ok: function (p) { return parseBrokerParam(p) !== null; } },
    analysisOffline: { path: function () { return "/api/analysis/offline"; } },
    analysisExpertise: { path: function () { return "/api/analysis/expertise"; } },
    analysisShadow: { path: function () { return "/api/analysis/shadow-price"; } },
    analysisAbsence: { path: function () { return "/api/analysis/absence"; } },
    // Madde 33, 29, 25 (D8b, salt okunur GET): teknik borç (parametresiz), sürüm etkisi (parametre "başvuru|başvuru"), veri profili (parametre mutlak dosya yolu).
    analysisTechDebt: { path: function () { return "/api/analysis/tech-debt"; } },
    analysisRelease: { path: function (p) { var c = parseReleaseParam(p); return "/api/analysis/release-impact?from=" + encodeURIComponent(c.from) + "&to=" + encodeURIComponent(c.to); }, ok: function (p) { return parseReleaseParam(p) !== null; } },
    analysisDataProfile: { path: function (p) { return "/api/analysis/data-profile?path=" + encodeURIComponent(p); }, ok: function (p) { return validDataPath(p); } },
    // Bağlam değiştirme maliyeti (madde 71): parametre gün sayısı 1..30; salt okunur, yalnız ölçüm.
    analysisSwitching: { path: function (d) { return "/api/analysis/switching?days=" + parseInt(d, 10); }, ok: function (d) { var n = typeof d === "number" ? d : typeof d === "string" && /^[0-9]{1,2}$/.test(d) ? parseInt(d, 10) : 0; return n >= 1 && n <= 30 && String(n) === String(d); } },
    // D8c (model yetenekleri 81/82/84/85/65/92, internet ayarları): yetenek listesi + koşu durumu (yoklama modelRun içindedir) + ağ ayarları ve son getirmeler. Hepsi GET.
    modelCapabilities: { path: function () { return "/api/capabilities/model"; } },
    modelRun: { path: function (id) { return "/api/capabilities/model/runs/" + id; }, ok: function (id) { return typeof id === "string" && ID_RE.test(id); } },
    netSettings: { path: function () { return "/api/net/settings"; } },
    netFetches: { path: function () { return "/api/net/fetches"; } }
  };
  // /api/monitor gerçek şekli -> arayüz sözleşmesi (running[], waiting[], slow[], retries[], bottleneck, counts). Bilinmeyen değer null kalır; uydurma yok.
  function adaptMonitor(v) {
    v = obj(v);
    var run = obj(v.running);
    var running = arr(run.workflows, 100).map(function (w) { w = obj(w); return { taskId: w.taskId, title: w.title, provider: null, sinceMin: numOrNull(w.runningMin), lastTraceMin: numOrNull(w.lastTraceMin), stalled: w.stalled === true, stalledLong: w.stalledLong === true }; })
      .concat(arr(run.tasks, 100).map(function (t) { t = obj(t); return { taskId: t.id, title: t.title, provider: null, sinceMin: numOrNull(t.runningMin), lastTraceMin: numOrNull(t.lastTraceMin), stalled: t.stalled === true, stalledLong: t.stalledLong === true }; }));
    // Takılma ŞÜPHESİ (yalnız bilgi; iptal/yönlendirme yok): sunucunun bildirdiği liste, bilinmeyen yaş atılır.
    var stalled = arr(v.stalled, 20).map(function (x) { x = obj(x); return { taskId: x.taskId, title: x.title || null, lastTraceMin: numOrNull(x.lastTraceMin), long: x.stalledLong === true }; }).filter(function (x) { return typeof x.taskId === "string" && x.lastTraceMin !== null; });
    var waiting = arr(v.awaitingApproval, 100).map(function (w) { w = obj(w); return { taskId: w.taskId, title: w.title, ageMin: numOrNull(w.waitingMin), risk: w.risk || null }; });
    var slow = arr(v.slowSteps, 100).map(function (x) { x = obj(x); return { taskId: x.taskId, title: x.title || null, stepRole: x.role, durationMin: numOrNull(x.durationMin) }; });
    var f24 = obj(v.failedLast24h);
    var failed = (numOrNull(f24.tasks) === null && numOrNull(f24.workflows) === null) ? null : (numOrNull(f24.tasks) || 0) + (numOrNull(f24.workflows) || 0);
    var b = v.bottleneck && typeof v.bottleneck === "object" ? v.bottleneck : null;
    return { at: v.generatedAt, running: running, stalled: stalled, waiting: waiting, slow: slow, retries: arr(v.retries, 100), bottleneck: b, counts: { running: running.length, waiting: waiting.length, failedLast24h: failed } };
  }

  function loadData(name, param) {
    if (!token || !Object.prototype.hasOwnProperty.call(DATA_ENDPOINTS, name)) return Promise.resolve();
    var ep = DATA_ENDPOINTS[name];
    if (ep.ok && !ep.ok(param)) return Promise.resolve();
    var key = param === undefined || param === "" ? name : name + ":" + param;
    // Arama gibi parametreli anahtarlar birikmesin: aynı adın en yeni 12 parametresi tutulur.
    var same = Object.keys(AM.state.data).filter(function (k) { return k.indexOf(name + ":") === 0; });
    if (same.length >= 12 && same.indexOf(key) < 0) delete AM.state.data[same[0]];
    // Zaten yüklü veri yenilenirken eski değer görünür kalır (iskelet yanıp sönmesin); ilk yüklemede "loading".
    var prevEntry = AM.state.data[key];
    AM.state.data[key] = prevEntry && prevEntry.status === "ok" ? { status: "ok", value: prevEntry.value, refreshing: true } : { status: "loading", value: null };
    scheduleRender();
    return api(ep.path(param)).then(function (res) {
      AM.state.data[key] = res.status < 400 && res.json !== null ? { status: "ok", value: name === "monitor" ? deepClean(adaptMonitor(deepClean(res.json, 0)), 0) : name === "memoryCompile" ? cleanCompile(res.json) : name === "memoryImplicit" ? cleanImplicit(res.json) : name === "argument" ? cleanArgument(res.json) : name === "analysisAbsence" ? deepClean(res.json, 0, 10) : deepClean(res.json, 0) } : { status: "error", value: null, reason: res.status + (reasonOf(res) ? ": " + reasonOf(res) : "") };
    }, function (e) {
      if (e && e.auth) throw e;
      AM.state.data[key] = { status: "error", value: null, reason: clean(scrub(e && e.message ? e.message : ""), 200) };
    }).then(function () { scheduleRender(); }, function (e) { if (e && e.auth) expire(); });
  }

  // Sağlayıcı eylemleri: test (yerel, model çağrısı yok), devre dışı bırak/etkinleştir. Önce eylem + hedef gösterilerek sorulur; yalnız kullanıcı belirteci.
  function providerAction(id, verb) {
    if (typeof id !== "string" || !/^[a-z0-9-]{1,40}$/.test(id) || ["test", "disable", "enable"].indexOf(verb) < 0) return Promise.resolve();
    var title = T(verb === "test" ? "core.providerTestTitle" : verb === "disable" ? "core.providerDisableTitle" : "core.providerEnableTitle");
    return ask({ title: title, action: "provider." + verb, target: id, detail: T(verb === "test" ? "core.providerTestDetail" : verb === "disable" ? "core.providerDisableDetail" : "core.providerEnableDetail"), confirmLabel: T("core.confirm"), cancelLabel: T("core.cancel"), danger: verb === "disable" }).then(function (yes) {
      if (!yes) return null;
      return api("/api/providers/" + id + "/" + verb, "POST", {}).then(function (res) {
        AM.state.data["providerAction:" + id] = res.status < 400 ? { status: "ok", value: deepClean(res.json, 0) } : { status: "error", value: null, reason: res.status + (reasonOf(res) ? ": " + reasonOf(res) : "") };
      }, function (e) { if (e && e.auth) throw e; AM.state.data["providerAction:" + id] = { status: "error", value: null, reason: clean(scrub(e && e.message ? e.message : ""), 200) }; })
        .then(function () { return Promise.all([refresh(), loadData("providerDetail", id)]); });
    }).then(null, function (e) { if (e && e.auth) expire(); });
  }

  // Liste eylemleri (izin iptali, otomasyon kuralı aç/kapat): önce eylem + hedef gösterilerek sorulur; yalnız kullanıcı belirteci; sonuç yenilenir. Oluşturma eylemleri aşağıda (createAction).
  var LIST_ACTIONS = {
    grantRevoke: { dataKey: "grants", prefix: "grantAction:", verbs: ["revoke"], path: function (id) { return "/api/grants/" + id + "/revoke"; }, text: function () { return ["core.grantRevokeTitle", "core.grantRevokeDetail", "grant.revoke", true]; } },
    automationRule: { dataKey: "automation", prefix: "automationAction:", verbs: ["enable", "disable", "runNow"], path: function (id, verb) { return "/api/automation/rules/" + id + "/" + (verb === "runNow" ? "run-now" : verb); }, text: function (verb) { return verb === "runNow" ? ["core.ruleRunNowTitle", "core.ruleRunNowDetail", "automation.rule.run-now", false] : verb === "enable" ? ["core.ruleEnableTitle", "core.ruleEnableDetail", "automation.rule.enable", false] : ["core.ruleDisableTitle", "core.ruleDisableDetail", "automation.rule.disable", true]; },
      reason: function (res, verb) {
        if (verb !== "runNow") return null;
        var j = obj(res && res.json), code = typeof j.code === "string" ? j.code : "", st = res ? res.status : 0;
        if (code === "busy") return T("core.rule.runBusy");
        if (code === "rate_limited" || st === 429) return T("core.rule.runRate");
        if (code === "not_schedule" || code === "rule_disabled") return T("core.rule.runNotAllowed");
        if (code === "not_found" || st === 404) return T("core.rule.runUnknown");
        return null;
      } }
  };
  function listAction(kind, id, verb) {
    var def = LIST_ACTIONS[kind];
    if (!def || typeof id !== "string" || !/^[A-Za-z0-9_.-]{1,80}$/.test(id) || def.verbs.indexOf(verb) < 0) return Promise.resolve();
    var tx = def.text(verb);
    return ask({ title: T(tx[0]), action: tx[2], target: id, detail: T(tx[1]), confirmLabel: T("core.confirm"), cancelLabel: T("core.cancel"), danger: tx[3] }).then(function (yes) {
      if (!yes) return null;
      return api(def.path(id, verb), "POST", {}).then(function (res) {
        AM.state.data[def.prefix + id] = res.status < 400 ? { status: "ok", value: deepClean(res.json, 0) } : { status: "error", value: null, reason: (def.reason && def.reason(res, verb)) || (res.status + (reasonOf(res) ? ": " + reasonOf(res) : "")) };
      }, function (e) { if (e && e.auth) throw e; AM.state.data[def.prefix + id] = { status: "error", value: null, reason: clean(scrub(e && e.message ? e.message : ""), 200) }; })
        .then(function () { return loadData(def.dataKey); });
    }).then(null, function (e) { if (e && e.auth) expire(); });
  }

  // Oluşturma eylemleri (geçici izin, defter kaydı, otomasyon kuralı): alanlar İSTEMCİDE de doğrulanır (sunucu sınırlarıyla aynı); geçersizse pencere AÇILMAZ ve istek GİTMEZ.
  // Geçerliyse önce eylemin ne yapacağı gösterilen onay penceresi açılır; yalnız onaylanırsa POST gider (gövde HAM değerlerle; maskeleme yalnız pencerede gösterimdedir). Sonuç AM.state.data[stateKey] içinde okunur; ilgili liste yenilenir.
  var SECRET_SHOW_RE = /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,})\b|Bearer\s+[A-Za-z0-9._~+\/=-]{12,}/g;
  function maskShow(v, max) { return clean(String(v == null ? "" : v).replace(SECRET_SHOW_RE, "[gizli]"), max || 300); }
  function fText(v) { return typeof v === "string" ? v.replace(CTRL_RE, " ").trim() : ""; }
  function fPath(v, max) { var s = typeof v === "string" ? v.trim() : ""; return s !== "" && s.length <= max && s.search(CTRL_RE) < 0 ? s : null; }
  function fInt(v, min, max) {
    var s = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim() : "";
    if (!/^[0-9]{1,7}$/.test(s)) return null;
    var n = parseInt(s, 10);
    return n >= min && n <= max ? n : null;
  }
  function fTextOk(s, min, max) { return s.length >= min && s.length <= max; }
  var GRANT_ACTIONS = ["file.read", "file.write", "verification.run"];
  var RULE_TASK_ACTIONS = ["file.read", "verification.run"];
  var RULE_PATTERN_RE = /^[a-z0-9_.:-]{1,60}\*?$/;
  var TASK_ID_RE = /^[A-Za-z0-9_.-]{1,80}$/;
  function bad(key, vars) { return { err: key, vars: vars || {} }; }
  function vGrant(f) {
    var action = typeof f.action === "string" && GRANT_ACTIONS.indexOf(f.action) >= 0 ? f.action : null;
    if (!action) return bad("core.createErr.grantAction");
    var dir = fPath(f.scopeDir, 500);
    if (dir === null) return bad("core.createErr.path", { alan: T("core.fld.scopeDir"), max: 500 });
    var reason = fText(f.reason);
    if (!fTextOk(reason, 3, 300)) return bad("core.createErr.text", { alan: T("core.fld.reason"), min: 3, max: 300 });
    var ttl = fInt(f.ttlMinutes, 1, 1440);
    if (ttl === null) return bad("core.createErr.range", { alan: T("core.fld.ttl"), min: 1, max: 1440 });
    var uses = fInt(f.maxUses, 1, 100);
    if (uses === null) return bad("core.createErr.range", { alan: T("core.fld.maxUses"), min: 1, max: 100 });
    return { body: { action: action, scopeDir: dir, reason: reason, ttlMinutes: ttl, maxUses: uses }, target: maskShow(action + " → " + dir, 400), detail: T("core.grantCreateDetail", { klasor: maskShow(dir, 300), dk: ttl, kez: uses, neden: maskShow(reason, 300) }) };
  }
  function vChange(f) {
    var summary = fText(f.summary);
    if (!fTextOk(summary, 3, 200)) return bad("core.createErr.text", { alan: T("core.fld.summary"), min: 3, max: 200 });
    var reason = fText(f.reason);
    if (!fTextOk(reason, 3, 500)) return bad("core.createErr.text", { alan: T("core.fld.reason"), min: 3, max: 500 });
    var taskId = typeof f.taskId === "string" ? f.taskId.trim() : "";
    if (taskId !== "" && !TASK_ID_RE.test(taskId)) return bad("core.createErr.taskId");
    var files = [];
    var raw = Array.isArray(f.files) ? f.files : typeof f.files === "string" ? f.files.split(/\r?\n/) : [];
    for (var i = 0; i < raw.length; i++) {
      if (typeof raw[i] !== "string") return bad("core.createErr.files");
      var line = raw[i].trim();
      if (line === "") continue;
      if (line.length > 300 || line.search(CTRL_RE) >= 0 || files.length >= 50) return bad("core.createErr.files");
      files.push(line);
    }
    var body = { kind: "manual", summary: summary, reason: reason };
    if (taskId !== "") body.taskId = taskId;
    if (files.length) body.files = files;
    return { body: body, target: maskShow(summary, 200), detail: T("core.changeCreateDetail", { n: files.length, neden: maskShow(reason, 300) }) };
  }
  // Zamanlı kural (D8c): tetikleyici { kind: "schedule", schedule: { kind: "interval", everyMinutes: 15..10080 } | { kind: "daily", at: "HH:MM", weekdays?: [1..7] } } (sunucu sınırlarıyla aynı).
  var RULE_ANALYSES = ["attention", "halflife", "learning", "absence", "continuity", "offline", "shadow-price"];
  var SCHED_MAX_RULES = 20;
  var DAY_KEYS = [1, 2, 3, 4, 5, 6, 7];
  function schedSummary(s) {
    s = obj(s);
    if (s.kind === "interval") return T("core.sched.interval", { n: s.everyMinutes });
    var days = Array.isArray(s.weekdays) ? s.weekdays.slice().sort().filter(function (d) { return DAY_KEYS.indexOf(d) >= 0; }) : [];
    if (!days.length || days.length === 7) return T("core.sched.daily", { at: clean(s.at, 5) });
    return T("core.sched.dailyDays", { at: clean(s.at, 5), gunler: days.map(function (d) { return T("core.sched.day." + d); }).join(", ") });
  }
  function vSchedule(t) {
    t = obj(t);
    if (t.kind === "interval") {
      var n = fInt(t.everyMinutes, 15, 10080);
      if (n === null) return bad("core.createErr.range", { alan: T("core.fld.everyMinutes"), min: 15, max: 10080 });
      return { schedule: { kind: "interval", everyMinutes: n }, maxCool: n * 60 };
    }
    if (t.kind === "daily") {
      var at = typeof t.at === "string" ? t.at.trim() : "";
      if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(at)) return bad("core.createErr.at");
      var out = { kind: "daily", at: at };
      if (t.weekdays !== undefined) {
        var w = Array.isArray(t.weekdays) ? t.weekdays : null;
        var seen = {}, ok = !!w && w.length >= 1 && w.length <= 7;
        if (ok) w.forEach(function (d) { if (typeof d !== "number" || DAY_KEYS.indexOf(d) < 0 || seen[d]) ok = false; seen[d] = true; });
        if (!ok) return bad("core.createErr.days");
        out.weekdays = w.slice();
      }
      return { schedule: out, maxCool: 86400 };
    }
    return bad("core.createErr.schedKind");
  }
  function vRule(f) {
    var name = fText(f.name);
    if (!fTextOk(name, 3, 80)) return bad("core.createErr.text", { alan: T("core.fld.ruleName"), min: 3, max: 80 });
    var isSched = f.trigger !== undefined && f.trigger !== null;
    var pattern = "", sched = null;
    if (isSched) {
      var tr = obj(f.trigger);
      if (tr.kind !== "schedule") return bad("core.createErr.trigger");
      sched = vSchedule(tr.schedule);
      if (sched.err) return sched;
      var ad = obj(AM.state.data.automation);
      var rl = ad.status === "ok" ? arr(obj(ad.value).rules, 500).map(obj) : [];
      var used = rl.filter(function (r) { return r.enabled === true && obj(r.trigger).kind === "schedule"; }).length;
      var maxRules = numOrNull(obj(ad.value).maxScheduleRules) || SCHED_MAX_RULES;
      if (used >= maxRules) return bad("core.createErr.scheduleLimit", { max: maxRules });
    } else {
      pattern = typeof f.eventPattern === "string" ? f.eventPattern.trim() : "";
      if (!RULE_PATTERN_RE.test(pattern) || pattern.indexOf("automation.") === 0) return bad("core.createErr.pattern");
    }
    var cool = fInt(f.cooldownSeconds, 10, 86400);
    if (cool === null) return bad("core.createErr.range", { alan: T("core.fld.cooldown"), min: 10, max: 86400 });
    if (sched && cool > sched.maxCool) return bad("core.createErr.coolLong", { max: sched.maxCool });
    var kind = f.actionKind === "notify" || f.actionKind === "record_task" || (isSched && f.actionKind === "run_analysis") ? f.actionKind : null;
    if (!kind) return bad(f.actionKind === "run_analysis" ? "core.createErr.analysisEvent" : "core.createErr.ruleKind");
    var p = f.params && typeof f.params === "object" && !Array.isArray(f.params) ? f.params : {};
    var params, detail;
    if (kind === "run_analysis") {
      var an = typeof p.analysis === "string" && RULE_ANALYSES.indexOf(p.analysis) >= 0 ? p.analysis : null;
      if (!an) return bad("core.createErr.analysis");
      params = { analysis: an };
      detail = T("core.ruleCreateDetailSchedAnalysis", { zaman: schedSummary(sched.schedule), bekleme: cool, analiz: an });
    } else if (kind === "notify") {
      var msg = fText(p.message);
      if (!fTextOk(msg, 3, 300)) return bad("core.createErr.text", { alan: T("core.fld.message"), min: 3, max: 300 });
      params = { message: msg };
      detail = isSched ? T("core.ruleCreateDetailSchedNotify", { zaman: schedSummary(sched.schedule), bekleme: cool, ileti: maskShow(msg, 300) }) : T("core.ruleCreateDetailNotify", { desen: maskShow(pattern, 80), bekleme: cool, ileti: maskShow(msg, 300) });
    } else {
      var title = fText(p.title);
      if (!fTextOk(title, 3, 200)) return bad("core.createErr.text", { alan: T("core.fld.taskTitle"), min: 3, max: 200 });
      var tAct = typeof p.action === "string" && RULE_TASK_ACTIONS.indexOf(p.action) >= 0 ? p.action : null;
      if (!tAct) return bad("core.createErr.taskAction");
      var target = fPath(p.target, 500);
      if (target === null) return bad("core.createErr.path", { alan: T("core.fld.taskTarget"), max: 500 });
      params = { title: title, action: tAct, target: target };
      detail = isSched ? T("core.ruleCreateDetailSchedTask", { zaman: schedSummary(sched.schedule), bekleme: cool, eylem: tAct, hedef: maskShow(target, 300), baslik: maskShow(title, 200) }) : T("core.ruleCreateDetailTask", { desen: maskShow(pattern, 80), bekleme: cool, eylem: tAct, hedef: maskShow(target, 300), baslik: maskShow(title, 200) });
    }
    if (isSched) return { body: { name: name, trigger: { kind: "schedule", schedule: sched.schedule }, actionKind: kind, params: params, cooldownSeconds: cool }, target: maskShow(name + " (" + schedSummary(sched.schedule) + ")", 300), detail: detail + " " + T("core.ruleSchedWarn") };
    return { body: { name: name, eventPattern: pattern, actionKind: kind, params: params, cooldownSeconds: cool }, target: maskShow(name + " (" + pattern + ")", 300), detail: detail };
  }
  var CREATE_ACTIONS = {
    grantCreate: { stateKey: "grantCreate", dataKey: "grants", path: "/api/grants", action: "grant.create", title: "core.grantCreateTitle", danger: true, validate: vGrant },
    changeCreate: { stateKey: "changeCreate", dataKey: "changes", path: "/api/changes", action: "change.record", title: "core.changeCreateTitle", danger: false, validate: vChange },
    ruleCreate: { stateKey: "ruleCreate", dataKey: "automation", path: "/api/automation/rules", action: "automation.rule.create", title: "core.ruleCreateTitle", danger: false, validate: vRule }
  };
  var CREATE_SRV_CODES = { invalid_field: "core.createSrv.invalid_field", scope_outside_contract: "core.createSrv.scope_outside_contract", scope_forbidden: "core.createSrv.scope_forbidden", approval_requires_user: "core.createSrv.approval_requires_user" };
  var createBusy = {};
  function createReason(res) {
    var code = res && res.json && typeof res.json.code === "string" ? res.json.code : "";
    if (Object.prototype.hasOwnProperty.call(CREATE_SRV_CODES, code)) return T(CREATE_SRV_CODES[code]);
    if (res && res.status === 403) return T("core.createSrv.approval_requires_user");
    return T("core.createSrv.generic", { n: res ? res.status : 0 });
  }
  function createAction(kind, fields) {
    var def = CREATE_ACTIONS[kind];
    if (!def || createBusy[kind]) return Promise.resolve({ ok: false });
    var f = fields && typeof fields === "object" && !Array.isArray(fields) ? fields : {};
    var v = def.validate(f);
    if (v.err) {
      AM.state.data[def.stateKey] = { status: "error", value: null, reason: T(v.err, v.vars) };
      scheduleRender();
      return Promise.resolve({ ok: false, invalid: true });
    }
    createBusy[kind] = true;
    return ask({ title: T(def.title), action: def.action, target: v.target, detail: v.detail, confirmLabel: T("core.createConfirm"), cancelLabel: T("core.cancel"), danger: def.danger }).then(function (yes) {
      if (!yes) return { ok: false, cancelled: true };
      return api(def.path, "POST", v.body).then(function (res) {
        if (res.status < 400) { AM.state.data[def.stateKey] = { status: "ok", value: null }; return { ok: true }; }
        AM.state.data[def.stateKey] = { status: "error", value: null, reason: createReason(res) };
        return { ok: false };
      }, function (e) { if (e && e.auth) throw e; AM.state.data[def.stateKey] = { status: "error", value: null, reason: T("core.createSrv.network") }; return { ok: false }; })
        .then(function (out) { return loadData(def.dataKey).then(function () { return out; }); });
    }).then(function (out) { createBusy[kind] = false; return out; }, function (e) { createBusy[kind] = false; if (e && e.auth) expire(); return { ok: false }; });
  }

  // Örtük bilgi önerisini hafızaya ekleme (madde 87): öneri ASLA kendiliğinden kaydedilmez; yalnız bu eylem, kullanıcı onay penceresinden geçince POST /api/memory yapar.
  // Aday AM.state.data.memoryImplicit içinden kimliğiyle bulunur (modülün verdiği nesneye güvenilmez); kaynak etiketi 'ortuk-aday', güven adaydan gelir.
  // Sonuç AM.state.data["implicitAccept:<kimlik>"] içinde okunur; sunucu hatası Türkçe; aynı aday için çift gönderim yok.
  var IMPLICIT_KINDS = ["fact", "note", "incident"];
  var IMPLICIT_MAX = 2000; // tek sınır: pencerede tam gösterilebilen (safe.js alan sınırı) ve gönderilen en uzun metin
  var implicitBusy = {};
  function implicitFail(key, msgKey) {
    AM.state.data[key] = { status: "error", value: null, reason: T(msgKey) };
    scheduleRender();
    return { ok: false, invalid: true };
  }
  function implicitAccept(candidateId) {
    var id = typeof candidateId === "string" ? candidateId : "";
    if (!TASK_ID_RE.test(id) || implicitBusy[id]) return Promise.resolve({ ok: false });
    var key = "implicitAccept:" + id;
    var entry = AM.state.data.memoryImplicit;
    var list = entry && entry.status === "ok" && entry.value && Array.isArray(entry.value.candidates) ? entry.value.candidates : [];
    var cand = null;
    for (var i = 0; i < list.length; i++) if (list[i] && typeof list[i] === "object" && list[i].id === id) { cand = list[i]; break; }
    if (!cand) { var bad0 = implicitFail(key, "core.implicitErr.unknown"); return loadData("memoryImplicit").then(function () { return bad0; }); }
    var text = fText(cand.text);
    if (text === "") return Promise.resolve(implicitFail(key, "core.implicitErr.text"));
    if (cand.textCut === true || text.length > IMPLICIT_MAX) return Promise.resolve(implicitFail(key, "core.implicitErr.tooLong"));
    var shown = text.replace(SECRET_SHOW_RE, "[gizli]"); // gösterilen = gönderilen: pencerede ve gövdede aynı maskeli metin
    var conf = numOrNull(cand.confidence);
    if (conf === null || conf < 0 || conf > 1) return Promise.resolve(implicitFail(key, "core.implicitErr.confidence"));
    var kind = IMPLICIT_KINDS.indexOf(cand.kind) >= 0 ? cand.kind : "note";
    var scope = typeof cand.suggestedScope === "string" && MEM_SCOPE_RE.test(cand.suggestedScope.trim()) ? cand.suggestedScope.trim() : "agentmom";
    var title = shown.replace(/\s+/g, " ").slice(0, 120);
    var body = { kind: kind, title: title, body: shown, source: "ortuk-aday", scope: scope, confidence: conf, sourceRef: "ortuk-aday:" + id };
    implicitBusy[id] = true;
    return ask({
      title: T("core.implicitAcceptTitle"), action: "memory.add", target: shown,
      detail: T("core.implicitAcceptDetail", { tur: kind, kapsam: maskShow(scope, 80), guven: Math.round(conf * 100) }),
      confirmLabel: T("core.implicitAcceptConfirm"), cancelLabel: T("core.cancel"), danger: false
    }).then(function (yes) {
      if (!yes) return { ok: false, cancelled: true };
      return api("/api/memory", "POST", body).then(function (res) {
        if (res.status < 400) { AM.state.data[key] = { status: "ok", value: { duplicate: !!(res.json && res.json.duplicate === true) } }; return { ok: true }; }
        AM.state.data[key] = { status: "error", value: null, reason: createReason(res) };
        return { ok: false };
      }, function (e) { if (e && e.auth) throw e; AM.state.data[key] = { status: "error", value: null, reason: T("core.createSrv.network") }; return { ok: false }; })
        .then(function (out) {
          var again = [loadData("memoryImplicit"), loadData("memoryFlags")];
          Object.keys(AM.state.data).filter(function (k) { return k.indexOf("memorySearch:") === 0; }).slice(-3).forEach(function (k) { again.push(loadData("memorySearch", k.slice(13))); });
          return Promise.all(again).then(function () { return out; });
        });
    }).then(function (out) { implicitBusy[id] = false; return out; }, function (e) { implicitBusy[id] = false; if (e && e.auth) expire(); return { ok: false }; });
  }

  // Karar laboratuvarı hesapları (rakip hipotezler 62, bilgi değeri 63): YAN ETKİSİZ saf hesap (sunucu kayıt/denetim yazmaz) olduğu için onay penceresi yoktur; ama alanlar istemcide sunucu sınırlarıyla aynı sıkılıkta doğrulanır,
  // geçersizse istek GİTMEZ ve Türkçe hata AM.state.data[stateKey]'e yazılır; çift gönderim engellenir. Sonuç aynı anahtarda: { status, value: sunucu yanıtı | null, reason }.
  var LAB_ID_RE = /^[A-Za-z0-9_-]{1,30}$/;
  var LAB_BAD_IDS = ["__proto__", "constructor", "prototype"];
  var LAB_NUM_RE = /^-?(?:[0-9]+(?:[.,][0-9]+)?|[.,][0-9]+)$/;
  var LAB_MAX_ABS = 1e12;
  var labBusy = {};
  function labNum(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string") return null;
    var s = v.trim();
    if (s.length > 24 || !LAB_NUM_RE.test(s)) return null;
    var n = parseFloat(s.replace(",", "."));
    return isFinite(n) ? n : null;
  }
  function labProb(v) { var n = labNum(v); return n !== null && n >= 0 && n <= 1 ? n : null; }
  function labMoney(v, nonNegative) { var n = labNum(v); return n !== null && Math.abs(n) <= LAB_MAX_ABS && (!nonNegative || n >= 0) ? n : null; }
  function labId(v) { return typeof v === "string" && LAB_ID_RE.test(v) && LAB_BAD_IDS.indexOf(v) < 0 ? v : null; }
  function labBlank(v) { return v === undefined || v === null || (typeof v === "string" && v.trim() === ""); }
  function labShow(n) { return String(Math.round(n * 1e9) / 1e9).replace(".", ","); }
  function labFld(key, i) { return T(key) + " " + (i + 1); }
  function arrOf(v) { return Array.isArray(v) ? v : []; }
  function vHypotheses(f) {
    var hs = arrOf(f.hypotheses), es = arrOf(f.evidence);
    if (hs.length < 2 || hs.length > 10) return bad("core.labErr.hypCount");
    if (es.length < 1 || es.length > 30) return bad("core.labErr.evCount");
    var mode = labBlank(f.mode) ? "bayes" : f.mode;
    if (mode !== "bayes" && mode !== "ach") return bad("core.labErr.mode");
    var ids = [], hyps = [], given = 0, sum = 0, i, j;
    for (i = 0; i < hs.length; i += 1) {
      var h = obj(hs[i]);
      var id = labId(h.id);
      if (id === null) return bad("core.labErr.id", { alan: labFld("core.fld.hypothesis", i) });
      if (ids.indexOf(id) >= 0) return bad("core.labErr.dupId", { id: clean(id, 30) });
      ids.push(id);
      var name = fText(h.name);
      if (!fTextOk(name, 1, 100)) return bad("core.createErr.text", { alan: labFld("core.fld.hypothesis", i), min: 1, max: 100 });
      var item = { id: id, name: name };
      if (!labBlank(h.prior)) {
        var pr = labProb(h.prior);
        if (pr === null) return bad("core.labErr.prob", { alan: T("core.fld.prior") + " (" + labFld("core.fld.hypothesis", i) + ")" });
        item.prior = pr; given += 1; sum += pr;
      }
      hyps.push(item);
    }
    if (given !== 0 && given !== hyps.length) return bad("core.labErr.priorAll");
    if (given === hyps.length && Math.abs(sum - 1) > 1e-6) return bad("core.labErr.priorSum", { toplam: labShow(sum) });
    var eids = [], evs = [];
    for (i = 0; i < es.length; i += 1) {
      var e = obj(es[i]);
      var eid = labId(e.id);
      if (eid === null) return bad("core.labErr.id", { alan: labFld("core.fld.evidence", i) });
      if (eids.indexOf(eid) >= 0) return bad("core.labErr.dupId", { id: clean(eid, 30) });
      eids.push(eid);
      var text = fText(e.text);
      if (!fTextOk(text, 1, 300)) return bad("core.createErr.text", { alan: labFld("core.fld.evidence", i), min: 1, max: 300 });
      var lk = obj(e.likelihoods), lik = {};
      for (j = 0; j < ids.length; j += 1) {
        var raw = Object.prototype.hasOwnProperty.call(lk, ids[j]) ? lk[ids[j]] : undefined;
        if (labBlank(raw)) continue;
        var lp = labProb(raw);
        if (lp === null) return bad("core.labErr.prob", { alan: T("core.fld.likelihood") + " (" + labFld("core.fld.evidence", i) + ", " + clean(hyps[j].name, 40) + ")" });
        lik[ids[j]] = lp;
      }
      evs.push({ id: eid, text: text, likelihoods: lik });
    }
    return { target: "-", body: { hypotheses: hyps, evidence: evs, mode: mode } };
  }
  function vVoi(f) {
    var ss = arrOf(f.states), os = arrOf(f.options), ts = arrOf(f.tests);
    if (ss.length < 2 || ss.length > 10) return bad("core.labErr.stateCount");
    if (os.length < 2 || os.length > 10) return bad("core.labErr.optCount");
    if (ts.length > 5) return bad("core.labErr.testCount");
    var sids = [], states = [], sum = 0, i, j;
    for (i = 0; i < ss.length; i += 1) {
      var s = obj(ss[i]);
      var sid = labId(s.id);
      if (sid === null) return bad("core.labErr.id", { alan: labFld("core.fld.state", i) });
      if (sids.indexOf(sid) >= 0) return bad("core.labErr.dupId", { id: clean(sid, 30) });
      sids.push(sid);
      var p = labProb(s.p);
      if (p === null) return bad("core.labErr.prob", { alan: T("core.fld.stateProb") + " (" + labFld("core.fld.state", i) + ")" });
      sum += p; states.push({ id: sid, p: p });
    }
    if (Math.abs(sum - 1) > 1e-6) return bad("core.labErr.stateSum", { toplam: labShow(sum) });
    var oids = [], opts = [];
    for (i = 0; i < os.length; i += 1) {
      var o = obj(os[i]);
      var oid = labId(o.id);
      if (oid === null) return bad("core.labErr.id", { alan: labFld("core.fld.option", i) });
      if (oids.indexOf(oid) >= 0) return bad("core.labErr.dupId", { id: clean(oid, 30) });
      oids.push(oid);
      var oname = fText(o.name);
      if (!fTextOk(oname, 1, 100)) return bad("core.createErr.text", { alan: labFld("core.fld.option", i), min: 1, max: 100 });
      var po = obj(o.payoffs), pay = {};
      for (j = 0; j < sids.length; j += 1) {
        var v = Object.prototype.hasOwnProperty.call(po, sids[j]) ? labMoney(po[sids[j]], false) : null;
        if (v === null) return bad("core.labErr.num", { alan: T("core.fld.payoff") + " (" + labFld("core.fld.option", i) + ", " + T("core.fld.state") + " " + (j + 1) + ")" });
        pay[sids[j]] = v;
      }
      opts.push({ id: oid, name: oname, payoffs: pay });
    }
    // Test: arayüz yalnız iki değerli 'pozitif/negatif' sonuç gönderir (sunucu daha genel olsa da): her durum için tek alan = pozitif sonuç olasılığı; negatif = 1 - pozitif.
    var tids = [], tests = [];
    for (i = 0; i < ts.length; i += 1) {
      var t = obj(ts[i]);
      var tid = labId(t.id);
      if (tid === null) return bad("core.labErr.id", { alan: labFld("core.fld.test", i) });
      if (tids.indexOf(tid) >= 0) return bad("core.labErr.dupId", { id: clean(tid, 30) });
      tids.push(tid);
      var tname = fText(t.name);
      if (!fTextOk(tname, 1, 100)) return bad("core.createErr.text", { alan: labFld("core.fld.test", i), min: 1, max: 100 });
      var cost = labMoney(t.cost, true);
      if (cost === null) return bad("core.labErr.cost", { alan: labFld("core.fld.test", i) });
      var pos = obj(t.positive), lks = {};
      for (j = 0; j < sids.length; j += 1) {
        var pp = Object.prototype.hasOwnProperty.call(pos, sids[j]) ? labProb(pos[sids[j]]) : null;
        if (pp === null) return bad("core.labErr.prob", { alan: T("core.fld.posProb") + " (" + labFld("core.fld.test", i) + ", " + T("core.fld.state") + " " + (j + 1) + ")" });
        lks[sids[j]] = { positive: pp, negative: Math.round((1 - pp) * 1e12) / 1e12 };
      }
      tests.push({ id: tid, name: tname, cost: cost, likelihoods: lks });
    }
    var body = { states: states, options: opts };
    if (tests.length) body.tests = tests;
    return { target: "-", body: body };
  }
  var LAB_ACTIONS = {
    hypothesesRun: { validate: vHypotheses, path: "/api/reasoning/hypotheses", stateKey: "hypothesesResult", field: "analysis" },
    voiRun: { validate: vVoi, path: "/api/reasoning/voi", stateKey: "voiResult", field: "voi" }
  };
  function labRun(kind, fields) {
    var def = LAB_ACTIONS[kind];
    if (!def || labBusy[kind]) return Promise.resolve({ ok: false, busy: !!def });
    var v = def.validate(obj(fields));
    if (v.err) {
      AM.state.data[def.stateKey] = { status: "error", value: null, reason: T(v.err, v.vars) };
      scheduleRender();
      return Promise.resolve({ ok: false, invalid: true });
    }
    labBusy[kind] = true;
    AM.state.data[def.stateKey] = { status: "loading", value: null };
    scheduleRender();
    return api(def.path, "POST", v.body).then(function (res) {
      if (res.status < 400 && res.json && typeof res.json === "object" && res.json[def.field] && typeof res.json[def.field] === "object") {
        AM.state.data[def.stateKey] = { status: "ok", value: deepClean(res.json, 0) };
        return { ok: true };
      }
      AM.state.data[def.stateKey] = { status: "error", value: null, reason: res.status < 400 ? T("core.labSrv.shape") : T("core.labSrv.rejected", { n: res.status, neden: reasonOf(res) }) };
      return { ok: false };
    }, function (e) {
      if (e && e.auth) throw e;
      AM.state.data[def.stateKey] = { status: "error", value: null, reason: T("core.labSrv.network") };
      return { ok: false };
    }).then(function (out) { labBusy[kind] = false; scheduleRender(); return out; }, function (e) { labBusy[kind] = false; if (e && e.auth) expire(); return { ok: false }; });
  }

  // ---- D8c: Model yetenekleri (81, 82, 84, 85, 65, 92) ve internet ayarları. yazan: [Claude#agentmom-d8c-arayuz]. ADR-016: yetenek kendiliğinden çalışmaz; yalnız kullanıcı çağırır. ----
  // Model yeteneği: metin uygulamadaki modele (abonelik rotası) gider; ONAY PENCERESİ ZORUNLU ve gönderilecek metnin TAMAMI (maskeli) orada gösterilir (gösterilen = gönderilen).
  // Çıktı GÜVENİLMEZ VERİDİR: yalnız AM.state.data["modelRun:<kimlik>"] içinde tutulur, kaydedilmez. Yoklama 2 sn aralıkla en çok 5 dk; sayfa değişirse durur.
  var MODEL_ID_RE = /^[a-z][a-z-]{1,30}$/;
  var MODEL_FIELD_RE = /^[A-Za-z][A-Za-z0-9]{0,30}$/;
  var MODEL_PROVIDER_RE = /^[a-z0-9-]{1,40}$/;
  var MODEL_TOTAL_MAX = 4000;
  var MODEL_POLL_MS = 2000;
  var MODEL_POLL_MAX = 150;
  var MODEL_POLL_MAX_LONG = 360; // müzakere (madde 75): en çok 12 dakika
  var MODEL_LONG = { negotiation: true };
  var MODEL_HIDDEN_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;
  var modelBusy = false;
  function modelText(v) { return String(v).replace(/\r\n?/g, "\n").replace(/\t/g, " ").replace(MODEL_HIDDEN_RE, "").trim(); }
  function modelItem(capId) {
    var e = AM.state.data.modelCapabilities;
    var list = e && e.status === "ok" && e.value && Array.isArray(e.value.capabilities) ? e.value.capabilities : null;
    if (!list) return null;
    for (var i = 0; i < list.length; i += 1) if (obj(list[i]).id === capId) return list[i];
    return null;
  }
  function modelAvail(item) {
    var a = obj(item.availability);
    if (typeof a.available === "boolean") return { ok: a.available, reason: clean(a.reason, 200) };
    return { ok: item.available === true, reason: clean(item.reason, 200) };
  }
  function modelSpecs(item) {
    return arr(item.fields, 10).map(obj).filter(function (f) { return MODEL_FIELD_RE.test(String(f.name)) && (f.kind === "text" || f.kind === "list" || f.kind === "number") && numOrNull(f.maxLength) > 0; })
      .map(function (f) { return { name: f.name, label: clean(f.label || f.name, 80), kind: f.kind, required: f.required === true, max: Math.min(numOrNull(f.maxLength), MODEL_TOTAL_MAX), maxItems: Math.min(numOrNull(f.maxItems) || 10, 20) }; });
  }
  // Alanlar istemcide sunucu sınırlarıyla aynı sıkılıkta doğrulanır; gövde ve pencere MASKELİ aynı metni taşır.
  function modelValidate(item, raw) {
    var specs = modelSpecs(item);
    if (!specs.length) return bad("core.model.err.noFields");
    var f = obj(raw), body = {}, shown = [], total = 0, masked = false, urlInfo = [];
    function mask(t) { var m = t.replace(SECRET_SHOW_RE, "[gizli]"); if (m !== t) masked = true; return m; }
    for (var i = 0; i < specs.length; i += 1) {
      var sp = specs[i], v = f[sp.name];
      if (sp.name === "urls" && sp.kind === "list") {
        var ur = modelUrlList(v, sp);
        if (ur.err) return ur;
        if (ur.list.length) { urlInfo = ur.list; body.urls = ur.list.map(function (u) { return u.href; }); }
        continue;
      }
      if (sp.kind === "number") {
        if (v === undefined || v === null || v === "") continue;
        var nv = typeof v === "number" ? v : typeof v === "string" && /^[0-9]{1,6}$/.test(v.trim()) ? parseInt(v.trim(), 10) : NaN;
        if (!isFinite(nv) || Math.floor(nv) !== nv || (sp.name === "rounds" && nv !== 1 && nv !== 2)) return bad("core.model.err.number", { alan: sp.label });
        body[sp.name] = nv;
        shown.push(sp.label + ": " + nv);
        continue;
      }
      if (sp.kind === "text") {
        if (v !== undefined && v !== null && typeof v !== "string") return bad("core.model.err.type", { alan: sp.label });
        var t = typeof v === "string" ? modelText(v) : "";
        if (t === "") { if (sp.required) return bad("core.model.err.required", { alan: sp.label }); continue; }
        if (t.length > sp.max) return bad("core.model.err.long", { alan: sp.label, max: sp.max });
        total += t.length;
        var mt = mask(t);
        if ((sp.name === "providerA" || sp.name === "providerB") && !MODEL_PROVIDER_RE.test(mt)) return bad("core.model.err.provider");
        body[sp.name] = mt;
        shown.push(sp.label + ": " + mt);
      } else {
        var src = Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : [];
        var out = [];
        for (var j = 0; j < src.length; j += 1) {
          if (typeof src[j] !== "string") return bad("core.model.err.type", { alan: sp.label });
          var it = modelText(src[j]);
          if (it === "") continue;
          if (it.length > sp.max) return bad("core.model.err.long", { alan: sp.label, max: sp.max });
          total += it.length;
          out.push(mask(it));
        }
        if (!out.length) { if (sp.required) return bad("core.model.err.requiredList", { alan: sp.label }); continue; }
        if (out.length > sp.maxItems) return bad("core.model.err.items", { alan: sp.label, max: sp.maxItems });
        body[sp.name] = out;
        shown.push(sp.label + ":\n" + out.map(function (x) { return "- " + x; }).join("\n"));
      }
    }
    if (total > MODEL_TOTAL_MAX) return bad("core.model.err.total", { max: MODEL_TOTAL_MAX });
    if (body.providerA && body.providerA === body.providerB) return bad("core.model.err.sameProvider");
    return { body: body, text: shown.join("\n"), masked: masked, urls: urlInfo };
  }
  function modelSrvReason(res) {
    var j = obj(res && res.json), code = typeof j.code === "string" ? j.code : "", st = res ? res.status : 0;
    var why = maskShow(typeof j.reason === "string" && j.reason ? j.reason : j.error, 240);
    if (st === 429) return T("core.model.srv.busy");
    if (code === "net_disabled") return T("core.model.srv.netDisabled");
    if (code === "sandbox_cleanup_needed") return T("core.model.srv.sandbox");
    if (code === "host_not_allowed") return T("core.model.srv.hostNotAllowedAny");
    if (code === "sources_unavailable") return T("core.model.srv.sourcesUnavailable");
    if (st === 503 || code === "provider_unavailable") return T("core.model.srv.provider", { neden: why || "?" });
    if (code === "data_boundary_secret") return T("core.model.srv.secret");
    if (st === 400) return T("core.model.srv.validation", { neden: why || "?" });
    if (st === 403) return T("core.model.srv.forbidden", { neden: why || "?" });
    if (st === 404) return T("core.model.srv.notFound");
    return T("core.model.srv.generic", { n: st });
  }
  // İnternetli yetenekler (37, 38, 40): adresler (urls) isteğe bağlıdır (boşsa kaynaksız mod). Adres istemcide doğrulanır: http/https, <= 2000, kullanıcı bilgisi/IP/localhost/yerel ad reddi.
  function modelUrl(raw) {
    var s = typeof raw === "string" ? modelText(raw) : "";
    if (s === "") return { err: "core.model.err.urlEmpty" };
    if (s.length > 2000) return { err: "core.model.err.urlLong" };
    if (!/^https?:\/\/[^\x00-\x20\x7f-\x9f]+$/i.test(s)) return { err: "core.model.err.urlScheme", vars: { adres: clean(s, 80) } };
    var u;
    try { u = new URL(s); } catch (e) { return { err: "core.model.err.urlBad", vars: { adres: clean(s, 80) } }; }
    if (u.username || u.password) return { err: "core.model.err.urlCreds" };
    var host = String(u.hostname || "").toLowerCase();
    if (host === "" || host.indexOf(":") >= 0 || host.charAt(0) === "[" || /^[0-9.]+$/.test(host) || /^0x[0-9a-f]*$/.test(host)) return { err: "core.model.err.urlIp", vars: { adres: clean(host, 80) } };
    var d = netDomain(host);
    if (d.err) return { err: "core.model.err.urlHost", vars: { ad: clean(host, 80) } };
    u.hash = "";
    return { href: u.href, host: host };
  }
  function modelUrlList(v, sp) {
    var src = Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : [];
    var out = [], seen = {};
    for (var i = 0; i < src.length; i += 1) {
      if (typeof src[i] !== "string") return bad("core.model.err.type", { alan: sp.label });
      if (modelText(src[i]) === "") continue;
      var r = modelUrl(src[i]);
      if (r.err) return bad(r.err, r.vars);
      if (seen[r.href]) return bad("core.model.err.urlDup", { adres: clean(r.href, 100) });
      seen[r.href] = true;
      out.push(r);
    }
    if (out.length > sp.maxItems) return bad("core.model.err.items", { alan: sp.label, max: sp.maxItems });
    return { list: out };
  }
  function netHostAllowed(host, domains) {
    for (var i = 0; i < domains.length; i += 1) {
      var d = String(domains[i]);
      if (d.indexOf("*.") === 0) { var base = d.slice(2); if (host.length > base.length + 1 && host.slice(-(base.length + 1)) === "." + base) return true; }
      else if (host === d) return true;
    }
    return false;
  }
  function modelNetGate(urls) {
    var d = AM.state.data.netSettings;
    var s = d && d.status === "ok" && d.value && typeof d.value === "object" && d.value.settings && typeof d.value.settings === "object" ? d.value.settings : null;
    if (!s) return { err: "core.model.err.netUnknown", settings: true };
    if (s.enabled !== true) return { err: "core.model.err.netOff", settings: true };
    var domains = arr(s.allowedDomains, 50);
    for (var i = 0; i < urls.length; i += 1) if (!netHostAllowed(urls[i].host, domains)) return { err: "core.model.err.hostNotAllowed", vars: { ad: urls[i].host }, settings: true };
    return null;
  }
  function modelTicketReason(res, u) {
    var j = obj(res && res.json), code = typeof j.code === "string" ? j.code : "";
    if (code === "net_disabled") return T("core.model.srv.netDisabled");
    if (code === "host_not_allowed") return T("core.model.srv.hostNotAllowed", { ad: clean(u.host, 80) });
    return T("core.model.srv.ticket", { neden: maskShow(j.error, 240) || String(res ? res.status : 0) });
  }
  // Onay sonrası HER adres için tek kullanımlık bilet alınır. Biletler yalnız bu işlevin yerel değişkenlerinde yaşar: ekrana, günlüğe ve AM.state'e yazılmaz.
  function modelTickets(urls) {
    var tickets = {}, hrefs = [];
    var chain = Promise.resolve({ ok: true });
    urls.forEach(function (u) {
      chain = chain.then(function (st) {
        if (!st.ok) return st;
        return api("/api/net/approve", "POST", { url: u.href }).then(function (res) {
          var j = obj(res.json);
          if (res.status >= 400) return { ok: false, reason: modelTicketReason(res, u) };
          var tk = typeof j.ticket === "string" ? j.ticket : "", nu = typeof j.url === "string" ? j.url : "";
          if (!tk || tk.length > 200 || !nu || nu.length > 2000) return { ok: false, reason: T("core.model.run.shape") };
          tickets[nu] = tk;
          hrefs.push(nu);
          return { ok: true };
        });
      });
    });
    return chain.then(function (st) { return st.ok ? { ok: true, tickets: tickets, urls: hrefs } : st; });
  }
  function modelRun(capId, fields, providerId) {
    if (typeof capId !== "string" || !MODEL_ID_RE.test(capId)) return Promise.resolve({ ok: false });
    if (modelBusy) return Promise.resolve({ ok: false, busy: true });
    var key = "modelRun:" + capId;
    function stop(msgKey, vars, action) {
      AM.state.data[key] = { status: "error", value: null, reason: T(msgKey, vars) };
      if (action) AM.state.data[key].action = action;
      scheduleRender();
      return { ok: false, invalid: true };
    }
    var item = modelItem(capId);
    if (!item) return Promise.resolve(stop("core.model.err.unknown"));
    var av = modelAvail(item);
    if (!av.ok) return Promise.resolve(stop("core.model.err.unavailable", { neden: av.reason || T("core.model.err.noReason") }));
    var pid = null;
    if (providerId !== undefined && providerId !== null && providerId !== "") {
      if (typeof providerId !== "string" || !MODEL_PROVIDER_RE.test(providerId)) return Promise.resolve(stop("core.model.err.provider"));
      pid = providerId;
    }
    var v = modelValidate(item, fields);
    if (v.err) return Promise.resolve(stop(v.err, v.vars));
    var urls = v.urls || [];
    modelBusy = true;
    var pre = urls.length && !(AM.state.data.netSettings && AM.state.data.netSettings.status === "ok") ? loadData("netSettings") : Promise.resolve();
    return pre.then(function () {
      var gate = urls.length ? modelNetGate(urls) : null;
      if (gate) return stop(gate.err, gate.vars, gate.settings ? "settings" : "");
      var warnings = arr(AM.state.data.modelCapabilities && AM.state.data.modelCapabilities.value && AM.state.data.modelCapabilities.value.warnings, 5).map(function (w) { return maskShow(w, 300); });
      var detail = T("core.model.confirmDetail", { saglayici: pid || T("core.model.autoProvider"), ad: clean(item.ad || capId, 80) });
      if (v.masked) detail += " " + T("core.model.maskedNote") + (warnings.length ? " " + warnings.join(" ") : "");
      var target = v.text;
      if (urls.length) {
        detail += " " + T("core.model.netDetail");
        target += (target ? "\n\n" : "") + T("core.model.netList") + "\n" + urls.map(function (u, i) { return (i + 1) + ". " + u.href + " (" + T("core.model.netHost", { ad: u.host }) + ")"; }).join("\n");
      } else if (capId === "negotiation") {
        detail += " " + T("core.model.negoDetail");
      } else if (arr(item.fields, 10).some(function (f) { return obj(f).name === "urls"; })) {
        detail += " " + T("core.model.sourcelessDetail");
      }
      return ask({ title: T("core.model.confirmTitle"), action: "model.run:" + capId, target: target, targetMax: 16000, detail: detail, confirmLabel: T("core.model.confirm"), cancelLabel: T("core.cancel"), danger: false }).then(function (yes) {
        if (!yes) return { ok: false, cancelled: true };
        var startPage = AM.view.page;
        AM.state.data[key] = { status: "loading", value: null, phase: "send" };
        scheduleRender();
        var ticketStep = urls.length ? modelTickets(urls) : Promise.resolve({ ok: true, tickets: null, urls: null });
        return ticketStep.then(function (tk) {
          if (!tk.ok) { AM.state.data[key] = { status: "error", value: null, reason: tk.reason }; return { ok: false }; }
          var input = {};
          Object.keys(v.body).forEach(function (k) { input[k] = v.body[k]; });
          if (tk.urls) { input.urls = tk.urls; input.tickets = tk.tickets; }
          var postBody = { input: input };
          if (pid && capId !== "negotiation") postBody.providerId = pid; // müzakerede üst alan providerId YOK (sunucu 400 verir): yalnız providerA/providerB
          return api("/api/capabilities/model/" + capId + "/run", "POST", postBody).then(function (res) {
            postBody = null; input = null; tk = null;
            var tid = res.json && typeof res.json.taskId === "string" ? res.json.taskId : "";
            if (res.status !== 202 && res.status !== 200) { AM.state.data[key] = { status: "error", value: null, reason: modelSrvReason(res) }; return { ok: false }; }
            if (!ID_RE.test(tid)) { AM.state.data[key] = { status: "error", value: null, reason: T("core.model.run.shape") }; return { ok: false }; }
            var runWarn = arr(res.json.warnings, 5).map(function (w) { return maskShow(w, 300); });
            AM.state.data[key] = { status: "loading", value: null, phase: "run", taskId: tid };
            scheduleRender();
            return new Promise(function (resolve) {
              var n = 0;
              function end(entry, out) { AM.state.data[key] = entry; resolve(out); }
              function tick() {
                if (AM.view.page !== startPage || !token) { end({ status: "error", value: null, reason: T("core.model.run.stopped") }, { ok: false, stopped: true }); return; }
                n += 1;
                api(DATA_ENDPOINTS.modelRun.path(tid)).then(function (r) {
                  var j = obj(r.json), st = typeof j.status === "string" ? j.status : "";
                  if (r.status === 404) { end({ status: "error", value: null, reason: T("core.model.srv.notFound") }, { ok: false }); return; }
                  if (r.status >= 400) { end({ status: "error", value: null, reason: T("core.model.srv.generic", { n: r.status }) }, { ok: false }); return; }
                  if (st === "running") {
                    if (n >= (MODEL_LONG[capId] ? MODEL_POLL_MAX_LONG : MODEL_POLL_MAX)) { end({ status: "error", value: null, reason: T(MODEL_LONG[capId] ? "core.model.run.timeoutLong" : "core.model.run.timeout") }, { ok: false }); return; }
                    scheduleRender();
                    setTimeout(tick, MODEL_POLL_MS);
                    return;
                  }
                  if (st === "done" && j.result && typeof j.result === "object" && !Array.isArray(j.result)) {
                    end({ status: "ok", value: { capabilityId: capId, providerId: clean(j.providerId, 60), result: deepClean(j.result, 0, 8), warnings: runWarn } }, { ok: true });
                    return;
                  }
                  if (st === "failed" || st === "refused") {
                    var em = maskShow(obj(j.error).message, 300);
                    // Yarıda kesilen müzakere: tamamlanan adımlar KISMİ sonuç olarak korunur (sayfa belirgin bant gösterir).
                    if (capId === "negotiation" && j.result && typeof j.result === "object" && j.result.partial === true) {
                      end({ status: "ok", value: { capabilityId: capId, providerId: clean(j.providerId, 60), result: deepClean(j.result, 0, 8), warnings: runWarn, failure: em || "?" } }, { ok: true, partial: true });
                      return;
                    }
                    end({ status: "error", value: null, reason: T(st === "failed" ? "core.model.run.failed" : "core.model.run.refused", { neden: em || "?" }) }, { ok: false });
                    return;
                  }
                  end({ status: "error", value: null, reason: T("core.model.run.shape") }, { ok: false });
                }, function (e) {
                  if (e && e.auth) { resolve({ ok: false }); expire(); return; }
                  end({ status: "error", value: null, reason: T("core.model.run.network") }, { ok: false });
                });
              }
              setTimeout(tick, MODEL_POLL_MS);
            });
          });
        }, function (e) {
          if (e && e.auth) throw e;
          AM.state.data[key] = { status: "error", value: null, reason: T("core.model.run.network") };
          return { ok: false };
        });
      });
    }).then(function (out) { modelBusy = false; scheduleRender(); return out; }, function (e) { modelBusy = false; if (e && e.auth) expire(); return { ok: false }; });
  }

  // İnternet ayarları: alan adı doğrulaması sunucudaki normalizeDomainPattern kurallarıyla uyumludur (IP, localhost/.local, tek etiket reddi; ≤ 50; boş listeyle açma engelli).
  var NET_MAX_DOMAINS = 50;
  var NET_DOMAIN_MAX = 100;
  var NET_LOCAL = ["localhost", "local", "internal", "lan", "localdomain", "home.arpa", "intranet", "corp", "home", "private", "invalid", "test", "example"];
  var NET_LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  function netDomain(raw) {
    if (typeof raw !== "string") return { err: "core.net.err.text" };
    var s = raw.trim().toLowerCase();
    if (s.length < 1 || s.length > NET_DOMAIN_MAX) return { err: "core.net.err.len", vars: { max: NET_DOMAIN_MAX } };
    if (/[\u0000- \u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff\/\\?#@:%\[\]]/.test(s)) return { err: "core.net.err.chars" };
    var wild = s.indexOf("*.") === 0;
    var body = wild ? s.slice(2) : s;
    if (body === "" || body.indexOf("*") >= 0) return { err: "core.net.err.wild" };
    if (/^[0-9.]+$/.test(body)) return { err: "core.net.err.ip" };
    var ascii = body;
    if (/[^\u0000-\u007f]/.test(body)) {
      try { ascii = new URL("http://" + body).hostname; } catch (e) { return { err: "core.net.err.idn" }; }
      if (typeof ascii !== "string" || ascii === "") return { err: "core.net.err.idn" };
    }
    if (ascii.length > NET_DOMAIN_MAX || ascii.charAt(0) === "." || ascii.charAt(ascii.length - 1) === ".") return { err: "core.net.err.dot" };
    var labels = ascii.split(".");
    if (labels.length < 2) return { err: "core.net.err.single" };
    for (var i = 0; i < labels.length; i += 1) if (!NET_LABEL_RE.test(labels[i])) return { err: "core.net.err.label" };
    var tld = labels[labels.length - 1];
    if (/^[0-9]+$/.test(tld) || /^0x[0-9a-f]*$/.test(tld)) return { err: "core.net.err.ip" };
    for (var k = 0; k < NET_LOCAL.length; k += 1) if (ascii === NET_LOCAL[k] || ascii.slice(-(NET_LOCAL[k].length + 1)) === "." + NET_LOCAL[k]) return { err: "core.net.err.local" };
    return { value: wild ? "*." + ascii : ascii };
  }
  var netBusy = false;
  function netSettingsSave(fields) {
    if (netBusy) return Promise.resolve({ ok: false, busy: true });
    var f = obj(fields), key = "netSettingsSave";
    function stop(msgKey, vars) {
      AM.state.data[key] = { status: "error", value: null, reason: T(msgKey, vars) };
      scheduleRender();
      return Promise.resolve({ ok: false, invalid: true });
    }
    if (typeof f.enabled !== "boolean" || typeof f.perUseApproval !== "boolean") return stop("core.net.err.flags");
    if (!Array.isArray(f.allowedDomains)) return stop("core.net.err.list");
    if (f.allowedDomains.length > NET_MAX_DOMAINS) return stop("core.net.err.count", { max: NET_MAX_DOMAINS });
    var seen = {}, list = [];
    for (var i = 0; i < f.allowedDomains.length; i += 1) {
      var d = netDomain(f.allowedDomains[i]);
      if (d.err) return stop(d.err, d.vars);
      if (!seen[d.value]) { seen[d.value] = true; list.push(d.value); }
    }
    list.sort();
    if (f.enabled && list.length === 0) return stop("core.net.err.empty");
    var body = { enabled: f.enabled, allowedDomains: list, perUseApproval: f.perUseApproval };
    netBusy = true;
    return ask({
      title: T(f.enabled ? "core.net.confirmTitleOn" : "core.net.confirmTitleOff"), action: "net.settings", target: list.length ? list.join(", ") : T("core.net.noDomains"),
      detail: T(f.enabled ? "core.net.confirmDetailOn" : "core.net.confirmDetailOff", { onay: T(f.perUseApproval ? "core.net.perUseYes" : "core.net.perUseNo"), n: list.length }),
      confirmLabel: T("core.net.confirm"), cancelLabel: T("core.cancel"), danger: f.enabled && !f.perUseApproval
    }).then(function (yes) {
      if (!yes) return { ok: false, cancelled: true };
      return api("/api/net/settings", "POST", body).then(function (res) {
        if (res.status < 400) { AM.state.data[key] = { status: "ok", value: null }; return { ok: true }; }
        var why = maskShow(reasonOf(res), 240);
        AM.state.data[key] = { status: "error", value: null, reason: res.status === 403 ? T("core.createSrv.approval_requires_user") : T("core.net.srvInvalid", { neden: why || String(res.status) }) };
        return { ok: false };
      }, function (e) { if (e && e.auth) throw e; AM.state.data[key] = { status: "error", value: null, reason: T("core.createSrv.network") }; return { ok: false }; })
        .then(function (out) { return Promise.all([loadData("netSettings"), loadData("netFetches")]).then(function () { return out; }); });
    }).then(function (out) { netBusy = false; scheduleRender(); return out; }, function (e) { netBusy = false; if (e && e.auth) expire(); return { ok: false }; });
  }

  function normPolicy(p) {
    p = obj(p);
    return { contractId: clean(p.contractId, 100), allowedActions: strList(p.allowedActions), approvalRequiredActions: strList(p.approvalRequiredActions), allowedDirs: strList(p.allowedDirs), forbiddenDirs: strList(p.forbiddenDirs), trustedRepos: strList(p.trustedRepos), allowedProviders: strList(p.allowedProviders), paidRoute: clean(p.paidRoute, 40), maxRuntimeMs: numOrNull(p.maxRuntimeMs) };
  }

  // ---- Yenileme: her uç bağımsız; biri düşerse diğerleri çizilir, hata kartı hangi uç olduğunu söyler ----
  var ENDPOINTS = [
    { path: "/api/tasks", field: "tasks", key: "tasks", norm: normTask },
    { path: "/api/assumption-debt", field: "debt", key: "debt", norm: normDebt },
    { path: "/api/decisions", field: "decisions", key: "decisions", norm: normDecision },
    { path: "/api/skills", field: "skills", key: "skills", norm: normSkill },
    { path: "/api/providers", field: "providers", key: "providers", norm: normProvider },
    { path: "/api/subsessions", field: "subsessions", key: "subsessions", norm: normSub }
  ];

  function loadHealth() {
    // /health belirteçsizdir; 503 de okunur rapordur.
    return fetch("/health", { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", redirect: "error" })
      .then(function (r) { return r.json(); })
      .then(function (j) { AM.state.health = normHealth(j); return null; }, function () { AM.state.health = { status: null, checks: [] }; return "/health"; });
  }

  function loadPolicy() {
    return api("/api/policy").then(function (res) {
      if (res.status >= 400 || !res.json || !res.json.policy) return "/api/policy (" + res.status + ")";
      AM.state.policy = normPolicy(res.json.policy);
      return null;
    }, function (e) { if (e && e.auth) throw e; return "/api/policy (" + T("error.unknown") + ")"; });
  }

  function loadBackup() {
    return api("/api/backup/status").then(function (res) {
      // 503 = bu sunucuda zamanlayıcı kurulu değil (ör. test sunucusu): hata kartı AÇILMAZ ama panelde "Yedek durumu alınamadı" kartı AÇIKÇA görünür (sessiz gizleme yok).
      if (res.status === 503) { AM.state.backup = null; return null; }
      if (res.status >= 400 || !res.json || !res.json.backup) return "/api/backup/status (" + res.status + ")";
      AM.state.backup = normBackup(res.json.backup);
      return null;
    }, function (e) { if (e && e.auth) throw e; return "/api/backup/status (" + T("error.unknown") + ")"; });
  }

  function loadOne(ep) {
    return api(ep.path).then(function (res) {
      if (res.status >= 400 || !res.json || !Array.isArray(res.json[ep.field])) {
        // Eski veri tutulur ama hata kartı açıkça söyler; başka uca/kaynağa geçilmez.
        return ep.path + " (" + res.status + (reasonOf(res) ? ": " + reasonOf(res) : "") + ")";
      }
      AM.state[ep.key] = arr(res.json[ep.field]).map(ep.norm);
      return null;
    }, function (e) {
      if (e && e.auth) throw e;
      return ep.path + " (" + T("error.unknown") + ")";
    });
  }

  function refresh() {
    if (!token) return Promise.resolve();
    if (refreshing) return refreshing;
    AM.state.busy = true;
    render();
    var jobs = [loadHealth(), loadPolicy(), loadBackup()].concat(ENDPOINTS.map(loadOne));
    refreshing = Promise.all(jobs).then(function (fails) {
      var bad = fails.filter(function (f) { return f; });
      AM.state.updatedAt = new Date().toISOString();
      if (bad.length) showError(T("error.server", { reason: bad.join(" · ") }));
      else hideError();
    }, function (e) {
      if (e && e.auth) { expire(); return; }
      showError(T("error.server", { reason: clean(scrub(e && e.message ? e.message : ""), 200) }));
    }).then(function () {
      refreshing = null;
      AM.state.busy = false;
      if (token) {
        loadCtx();
        loadIndicators(false);
        if (AM.view.page === "overview") loadData("monitor"); // Genel Bakış açıkken canlı izleme her yoklamada tazelenir
        render();
      }
    });
    return refreshing;
  }

  // Onay penceresi: eylem + hedef AYRI satırlarda gösterilir (AM_DIALOG, safe.js). Pencere açıkken otomatik yenileme durur.
  function ask(opts) {
    confirmOpen = true;
    return window.AM_DIALOG.confirm(opts).then(function (v) { confirmOpen = false; return v === true; }, function () { confirmOpen = false; return false; });
  }

  // ---- Türetilmiş görünüm verisi: konular ve sohbet zaman çizelgesi (yalnız mevcut kayıtlardan; uydurma yok) ----
  function subForTask(taskId) {
    for (var i = 0; i < AM.state.subsessions.length; i++) if (AM.state.subsessions[i].taskId === taskId) return AM.state.subsessions[i];
    return null;
  }

  function rebuildDerived() {
    var tasks = AM.state.tasks;
    AM.state.topics = tasks.map(function (t) {
      var sub = subForTask(t.id);
      var seen = seenTopics[t.id];
      var unread = (t.state === "awaiting_approval" || t.state === "failed") && !seen;
      return {
        id: t.id, taskId: t.id, requestedAction: t.requestedAction, target: t.request && t.request.target ? t.request.target : null, title: t.title, state: t.state, unread: unread,
        provider: sub ? sub.provider : null, model: sub ? sub.model : null, modelSource: sub ? sub.modelSource : "unknown", steps: sub ? sub.steps : null,
        summary: t.requestedAction + (t.request && t.request.target ? " → " + t.request.target : ""), updatedAt: t.createdAt, archived: false
      };
    });
    // Yerel yazışma (AM.log) chat.js tarafından doğrudan okunur; burada tekrar konmaz (çift görünmesin).
    var tl = { local: [] };
    tasks.forEach(function (t) {
      var items = [{ id: t.id + ":u", kind: "user", text: t.title, at: t.createdAt, note: T("core.sentToTopic") }];
      var ev = AM.state.evidence[t.id];
      if (Array.isArray(ev)) ev.forEach(function (e, i) {
        var kind = /verif|test/i.test(e.kind) ? "verify" : "tool";
        items.push({ id: t.id + ":e" + i, kind: kind, text: e.summary, at: e.createdAt, state: "succeeded", card: { title: e.kind, summary: e.summary } });
      });
      else if (ev === "error") items.push({ id: t.id + ":ee", kind: "assistant", text: T("topic.noEvidence"), at: t.createdAt });
      items.push({ id: t.id + ":s", kind: "assistant", text: T("state." + t.state) + (t.decision ? " · " + t.decision : ""), at: t.createdAt, state: t.state });
      if (t.state === "awaiting_approval") items.push({ id: t.id + ":a", kind: "approval", text: "", at: t.createdAt, state: t.state, card: { taskId: t.id } });
      if (t.state === "failed" || t.state === "denied") items.push({ id: t.id + ":f", kind: "error", text: T("state." + t.state), at: t.createdAt, state: t.state });
      tl[t.id] = items;
    });
    AM.state.timeline = tl;
  }

  function applyChrome() {
    var root = document.documentElement;
    var th = AM.view.theme === "light" || AM.view.theme === "system" ? AM.view.theme : "dark";
    if (root.getAttribute("data-theme") !== th) root.setAttribute("data-theme", th);
    if (AM.view.leftW) root.style.setProperty("--am-left-w", AM.view.leftW + "px");
    if (AM.view.rightW) root.style.setProperty("--am-right-w", AM.view.rightW + "px");
    var app = $("app");
    if (app) {
      // data-panel, data-sidebar, data-layout ve data-drawer öznitelikleri shell.js tarafından yönetilir (çift yazım çakışması olmasın).
      app.setAttribute("data-panel-wide", AM.view.panelWide ? "1" : "0");
    }
  }

  // ---- Eylemler ----
  function decide(task, verb) {
    var id = task && typeof task.id === "string" ? task.id : "";
    if (!ID_RE.test(id)) { addLog("assistant", T("approval.failed", { status: "-", reason: "id" })); scheduleRender(); return Promise.resolve(); }
    // Pencerede gösterilen bilgi modülün verdiği nesneden değil, çekirdeğin temizlenmiş kaydından gelir.
    var known = null;
    for (var i = 0; i < AM.state.tasks.length; i++) if (AM.state.tasks[i].id === id) { known = AM.state.tasks[i]; break; }
    // Yalnızca çekirdeğin kendi kaydında bilinen VE hâlâ onay bekleyen görev için eylem yapılır (modülün verdiği sahte/eski nesneye güvenilmez).
    if (!known || known.state !== "awaiting_approval") {
      addLog("assistant", T("approval.failed", { status: "-", reason: "görev artık onay beklemiyor ya da bilinmiyor" }));
      scheduleRender();
      return refresh();
    }
    var t = known;
    var allow = verb === "approve";
    return ask({
      title: T(allow ? "approval.confirmAllow" : "approval.confirmDeny"),
      action: clean(t.requestedAction),
      target: clean(t.request && t.request.target ? t.request.target : "-"),
      // Güvenilir (çekirdek) risk/geri alma satırları ÖNCE; ajanın yazdığı başlık en sonda ve etiketli (başlık risk satırını taklit edemez).
      detail: (t.risk ? T("core.riskLine", { level: T("core.risk." + t.risk.level), score: t.risk.score === null ? "?" : t.risk.score }) + (t.risk.reasons.length ? " · " + t.risk.reasons.slice(0, 6).join("; ") : "") + "\n" : "") + (t.semantics ? T("core.undoLine", { rev: T("core.rev." + t.semantics.reversible), undo: t.semantics.undo || "-" }) + "\n" : "") + T("core.agentTitle", { baslik: clean(t.title, 300) }),
      confirmLabel: T(allow ? "approval.allow" : "approval.deny"),
      cancelLabel: T("core.cancel"),
      danger: allow
    }).then(function (yes) {
      if (!yes) return null;
      return api("/api/tasks/" + encodeURIComponent(id) + "/" + verb, "POST", {}).then(function (res) {
        if (res.status >= 400) addLog("assistant", T("approval.failed", { status: res.status, reason: reasonOf(res) }));
        else addLog("assistant", T(allow ? "approval.doneAllow" : "approval.doneDeny"));
      }, function (e) {
        if (e && e.auth) throw e;
        addLog("assistant", T("approval.failed", { status: "-", reason: clean(scrub(e && e.message ? e.message : ""), 200) }));
      }).then(function () { return refresh(); });
    }).then(null, function (e) { if (e && e.auth) expire(); });
  }

  function counts() {
    var s = AM.state;
    return {
      tasks: s.tasks.length,
      waiting: s.tasks.filter(function (t) { return t.state === "awaiting_approval"; }).length,
      broken: s.debt.filter(function (d) { return d.kind === "broken"; }).length,
      review: s.decisions.filter(function (d) { return d.reviewState && d.reviewState !== "ok"; }).length
    };
  }

  function listReply(title, items, emptyKey, line) {
    if (!items.length) return title + "\n" + T(emptyKey);
    return title + "\n" + items.slice(0, 30).map(function (x) { return "• " + line(x); }).join("\n") + (items.length > 30 ? "\n…" : "");
  }

  function stateLabel(s) { return T("state." + s); }

  function providerLine(p) {
    var c = function (st) { return p.capabilities.filter(function (x) { return x.status === st; }).length; };
    var usable = c("verified") + c("partial") > 0;
    return p.displayName + " (" + p.id + ") · " + (usable ? (c("verified") ? T("providers.available") : T("providers.partial")) : T("providers.unavailable")) + " · " +
      T("providers.counts", { verified: c("verified"), partial: c("partial"), unverified: c("unverified"), unavailable: c("unavailable"), unsupported: c("unsupported") });
  }

  function normCmd(w) {
    return w.toLowerCase().replace(/ı/g, "i").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ü/g, "u");
  }

  var LOCAL = {
    "/yardim": function () { return T("cmd.help"); },
    "/durum": function () { return T("cmd.statusLine", counts()); },
    "/gorevler": function () { return listReply(T("cards.tasks"), AM.state.tasks, "cards.emptyTasks", function (t) { return t.title + " — " + stateLabel(t.state); }); },
    "/onay": function () {
      var q = AM.state.tasks.filter(function (t) { return t.state === "awaiting_approval"; });
      return listReply(T("approval.title"), q, "feed.noApprovals", function (t) { return t.title + " — " + t.requestedAction + " → " + ((t.request && t.request.target) || "-"); });
    },
    "/borc": function () { return listReply(T("cards.debt"), AM.state.debt, "cards.emptyDebt", function (d) { return d.text + " — " + T("debt." + d.kind) + (d.overdueDays ? " · " + T("debt.overdueDays", { n: d.overdueDays }) : ""); }); },
    "/kararlar": function () {
      var due = AM.state.decisions.filter(function (d) { return d.reviewState && d.reviewState !== "ok"; });
      return listReply(T("cards.decisions"), due, "cards.emptyDecisions", function (d) { return d.title + " — " + T("review." + d.reviewState); });
    },
    "/beceriler": function () { return listReply(T("cards.skills"), AM.state.skills, "cards.emptySkills", function (s) { return s.name + " — " + stateLabel(s.state) + " · " + T("skill.risk", { risk: s.riskClass }); }); },
    "/saglayicilar": function () { return listReply(T("cards.providers"), AM.state.providers, "cards.emptyProviders", providerLine) + "\n" + T("providers.noFallback"); },
    "/yetenekler": function () { var c = window.AM_CAPABILITIES_API; return c && typeof c.textList === "function" ? c.textList(AM) : T("cmd.capsNone"); }
  };

  function toLocal() { if (!AM.view.selectedTopicId) AM.view.selectedTopicId = "local"; }

  function command(text) {
    var raw = String(text == null ? "" : text).trim();
    if (!raw) return Promise.resolve();
    var shown = clean(raw, 2000);
    toLocal();
    if (raw.charAt(0) === "/") {
      var word = normCmd(raw.split(/\s+/)[0]);
      if (word === "/temizle") { AM.log.splice(0, AM.log.length); addLog("assistant", T("cmd.cleared")); render(); return Promise.resolve(); }
      addLog("user", shown);
      if (word === "/yenile") { render(); return refresh().then(function () { addLog("assistant", T("cmd.statusLine", counts())); render(); }); }
      if (Object.prototype.hasOwnProperty.call(LOCAL, word)) addLog("assistant", LOCAL[word]());
      else addLog("assistant", T("cmd.unknown", { cmd: clean(word, 60) }));
      render();
      return Promise.resolve();
    }
    // Serbest metin: yalnız görev KAYDI açar (task.create); ajan ya da sağlayıcı başlatılmaz. Önce sorulur.
    addLog("user", shown);
    var title = clean(raw, 200);
    render();
    return ask({ title: T("cmd.freeTitle"), action: "task.create", target: "-", detail: title, confirmLabel: T("core.save"), cancelLabel: T("core.cancel"), danger: false }).then(function (yes) {
      if (!yes) { addLog("assistant", T("cmd.freeCancel")); render(); return null; }
      return api("/api/tasks", "POST", { title: title, request: { action: "task.create" } }).then(function (res) {
        var task = res.json && res.json.task ? normTask(res.json.task) : null;
        if ((res.status === 201 || res.status === 403) && task && task.id) addLog("assistant", T("cmd.freeDone", { id: task.id, state: stateLabel(task.state) }));
        else addLog("assistant", T("error.server", { reason: res.status + (reasonOf(res) ? ": " + reasonOf(res) : "") }));
      }, function (e) {
        if (e && e.auth) throw e;
        addLog("assistant", T("error.server", { reason: clean(scrub(e && e.message ? e.message : ""), 200) }));
      }).then(function () { return refresh(); });
    }).then(null, function (e) { if (e && e.auth) expire(); });
  }

  function loadEvidence(id) {
    if (typeof id !== "string" || !ID_RE.test(id)) return Promise.resolve();
    AM.state.evidence[id] = "loading";
    scheduleRender();
    return api("/api/tasks/" + encodeURIComponent(id) + "/evidence").then(function (res) {
      AM.state.evidence[id] = res.status < 400 && res.json && Array.isArray(res.json.evidence) ? arr(res.json.evidence, 200).map(normEvidence) : "error";
    }, function (e) {
      if (e && e.auth) throw e;
      AM.state.evidence[id] = "error";
    }).then(function () { scheduleRender(); }, function (e) { if (e && e.auth) expire(); });
  }

  function loadCtx() {
    var id = AM.view.selectedTopicId;
    if (!token || typeof id !== "string" || !ID_RE.test(id)) { AM.state.ctx = null; return Promise.resolve(); }
    return api("/api/usage/context?topic=" + encodeURIComponent(id)).then(function (res) {
      AM.state.ctx = res.status < 400 && res.json ? normCtx(res.json) : null;
    }, function (e) { if (e && e.auth) throw e; AM.state.ctx = null; }).then(function () { scheduleRender(); }, function (e) { if (e && e.auth) expire(); });
  }

  // Durum göstergeleri (bağlam %, kota %, bekleyen onay, takılma şüphesi): salt okunur GET /api/status/indicators. 30 sn'de bir (zorlama: konu değişince);
  // sayfa gizliyken ya da oturum yokken istek GİTMEZ. Sunucu yanıtı doğrulanıp temizlenir; bilinmeyen değer null kalır.
  var IND_TIMEOUT_MS = 10000, IND_EVERY_MS = 30000, indAt = 0, indBusy = false, indSeq = 0;
  var IND_LEVELS = ["ok", "warn", "critical", "unknown"];
  function indLevel(v, pct) { return pct === null ? "unknown" : IND_LEVELS.indexOf(v) >= 0 ? v : "unknown"; }
  function normIndicators(j) {
    j = obj(j);
    var c = obj(j.context), q = obj(j.quota), p = obj(j.pendingApprovals), s = obj(j.stalled);
    var cp = numOrNull(c.percent), qp = numOrNull(q.percent);
    var items = arr(s.items, 20).map(function (x) { x = obj(x); return { taskId: typeof x.taskId === "string" && ID_RE.test(x.taskId) ? x.taskId : null, lastTraceMin: numOrNull(x.lastTraceMin), long: x.long === true }; }).filter(function (x) { return x.taskId && x.lastTraceMin !== null; });
    return {
      context: { percent: cp, level: indLevel(c.level, cp), usedTokens: numOrNull(c.usedTokens), windowTokens: numOrNull(c.windowTokens), source: c.source === "reported" && cp !== null ? "reported" : "unknown" },
      quota: { percent: qp, level: indLevel(q.level, qp), providerId: typeof q.providerId === "string" ? clean(q.providerId, 60) : null, reported: q.reported === true && qp !== null },
      pendingApprovals: { count: numOrNull(p.count), critical: numOrNull(p.critical), truncated: p.truncated === true },
      stalled: { count: items.length, items: items },
      at: typeof j.generatedAt === "string" ? clean(j.generatedAt, 40) : null
    };
  }
  function loadIndicators(force) {
    if (!token || (indBusy && !force)) return Promise.resolve();
    if (document.hidden) return Promise.resolve();
    var t = Date.now();
    if (!force && t - indAt < IND_EVERY_MS) return Promise.resolve();
    indBusy = true;
    indAt = t;
    var seq = ++indSeq; // konu değişince eski isteğin yanıtı yenisini ezmesin
    var id = AM.view.selectedTopicId;
    var q = typeof id === "string" && ID_RE.test(id) ? "?session=" + encodeURIComponent(id) : "";
    return api("/api/status/indicators" + q, "GET", undefined, IND_TIMEOUT_MS).then(function (res) {
      if (seq === indSeq) AM.state.indicators = res.status < 400 && res.json ? normIndicators(res.json) : null;
    }, function (e) { if (e && e.auth) throw e; if (seq === indSeq) AM.state.indicators = null; }).then(function () { if (seq === indSeq) indBusy = false; scheduleRender(); }, function (e) { indBusy = false; if (e && e.auth) expire(); });
  }

  function loadUsage() {
    if (!token) return Promise.resolve();
    AM.state.usage = { status: "loading" };
    scheduleRender();
    return api("/api/usage").then(function (res) {
      AM.state.usage = res.status < 400 && res.json ? Object.assign({ status: "ok" }, normUsage(res.json)) : { status: "error", reason: res.status + (reasonOf(res) ? ": " + reasonOf(res) : "") };
    }, function (e) {
      if (e && e.auth) throw e;
      AM.state.usage = { status: "error", reason: clean(scrub(e && e.message ? e.message : ""), 200) };
    }).then(function () { scheduleRender(); }, function (e) { if (e && e.auth) expire(); });
  }

  function loadDoc(name) {
    if (DOC_NAMES.indexOf(name) < 0) return Promise.resolve();
    var cur = AM.state.docs[name];
    if (cur && cur.status === "loading") return Promise.resolve();
    AM.state.docs[name] = { status: "loading", text: "" };
    scheduleRender();
    return api("/api/help/" + name).then(function (res) {
      // Belgenin başındaki HTML yorum satırı (sahip/kural notu) okuyucuya gösterilmez.
      AM.state.docs[name] = res.status < 400 && res.json && typeof res.json.text === "string" ? { status: "ok", text: res.json.text.replace(/^\s*<!--[\s\S]*?-->\s*/, "") } : { status: "error", text: "", reason: String(res.status) };
    }, function (e) {
      if (e && e.auth) throw e;
      AM.state.docs[name] = { status: "error", text: "", reason: clean(scrub(e && e.message ? e.message : ""), 120) };
    }).then(function () { scheduleRender(); }, function (e) { if (e && e.auth) expire(); });
  }

  // setView: yalnız beyaz listeli anahtarlar ve doğrulanmış değerler; kalıcı olanlar AM_PREFS'e yazılır.
  var VIEW_SPEC = {
    selectedTopicId: function (v) { return v === null || v === "local" || (typeof v === "string" && ID_RE.test(v)); },
    panelOpen: function (v) { return typeof v === "boolean"; },
    panelWide: function (v) { return typeof v === "boolean"; },
    panelTab: function (v) { return ["topics", "approvals", "changes", "scheduled", "overview"].indexOf(v) >= 0; },
    panelSearch: function (v) { return typeof v === "string" && v.length <= 100; },
    panelFilter: function (v) { return (typeof v === "string" && v.length <= 40) || (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length <= 4 && Object.keys(v).every(function (k) { return typeof v[k] === "string" && v[k].length <= 40; })); },
    settingsOpen: function (v) { return typeof v === "boolean"; },
    settingsSection: function (v) { return typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v); },
    projectSettingsOpen: function (v) { return typeof v === "boolean"; },
    projectSettingsPage: function (v) { return typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v); },
    theme: function (v) { return v === "dark" || v === "light" || v === "system"; },
    density: function (v) { return v === "comfortable" || v === "compact"; },
    // Madde 91: arayüz karmaşıklığı (kalıcı) ve bu oturumda açılan gelişmiş bölüm anahtarları (kalıcı DEĞİL).
    complexity: function (v) { return v === "simple" || v === "advanced"; },
    lang: function (v) { return v === "tr" || v === "en"; },
    advancedOpen: function (v) { return Array.isArray(v) && v.length <= 20 && v.every(function (k) { return typeof k === "string" && /^[a-z][a-z-]{0,29}$/.test(k); }); },
    leftW: function (v) { return typeof v === "number" && isFinite(v) && v >= 200 && v <= 420; },
    rightW: function (v) { return typeof v === "number" && isFinite(v) && v >= 300 && v <= 640; },
    sidebarCollapsed: function (v) { return typeof v === "boolean"; },
    paletteOpen: function (v) { return typeof v === "boolean"; },
    page: function (v) { return typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v); },
    pageParam: function (v) { return typeof v === "string" && /^[A-Za-z0-9._:-]{0,80}$/.test(v); },
    focusComposer: function (v) { return typeof v === "boolean"; },
    draft: function (v) { return typeof v === "string" && v.length <= 500; },
    newSession: function (v) { return typeof v === "boolean"; },
    search: function (v) { return typeof v === "string" && v.length <= 100; },
    order: function (v) { return Array.isArray(v) && v.length <= 100 && v.every(function (x) { return typeof x === "string" && ID_RE.test(x); }); },
    history: function (v) { return !!v && typeof v === "object" && Array.isArray(v.stack) && v.stack.length <= 50 && v.stack.every(function (x) { return typeof x === "string" && x.length <= 80; }) && typeof v.idx === "number" && isFinite(v.idx) && v.idx >= -1 && v.idx <= 50; },
    attachments: function (v) { return Array.isArray(v) && v.length <= 20 && v.every(function (x) { return x && typeof x === "object" && typeof x.name === "string" && x.name.length <= 200; }); }
  };
  var PERSIST = ["theme", "leftW", "rightW", "panelOpen", "sidebarCollapsed", "panelWide", "complexity", "lang"];

  // §14 ana navigasyon sayfaları (kimlik = sayfa modülünün kayıt adı). 'settings' modal açar, sayfa değildir.
  var PAGE_IDS = ["overview", "projects", "tasks", "providers", "models", "integrations", "skills", "research", "memory", "verify", "usage", "security", "audit"];

  var capNonce = 0;
  // Gelişmiş bölüm anahtarları (pages.js ADVANCED_KEYS ile aynı): Sistem analitiği ("analytics"), eylem anlamları ("semantics"), yetenek kayıt defteri ("registry").
  function advancedKeyOf(e) {
    var b = e && typeof e.bolum === "string" ? e.bolum : "";
    if (e && e.sayfa === "integrations" && b.indexOf("am-lab-") === 0) return "analytics";
    if (e && e.sayfa === "integrations" && (b === "am-more-int-tb" || b === "am-more-int-rg")) return "registry";
    return "";
  }
  // Dil değişince statik iskelet metinleri ve belge dili yeniden yazılır; sayfalar sonraki çizimde yeni dili kullanır.
  function applyLang() {
    var code = typeof window.AM_SET_LANG === "function" ? window.AM_SET_LANG(AM.view.lang) : "tr";
    AM.view.lang = code;
    try { document.documentElement.setAttribute("lang", code); } catch (e) { /* sahte DOM */ }
    if (typeof applyStaticText === "function") applyStaticText();
  }
  function setView(patch) {
    if (!patch || typeof patch !== "object") return;
    var changed = false, persist = false;
    Object.keys(patch).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(VIEW_SPEC, k) || !VIEW_SPEC[k](patch[k])) return;
      AM.view[k] = patch[k];
      if (k === "lang") applyLang();
      changed = true;
      if (PERSIST.indexOf(k) >= 0) persist = true;
    });
    if (persist && window.AM_PREFS) {
      var o = {}; PERSIST.forEach(function (k) { o[k] = AM.view[k]; });
      window.AM_PREFS.save(o);
    }
    if (changed) { if (Object.prototype.hasOwnProperty.call(patch, "selectedTopicId")) { loadCtx(); loadIndicators(true); } scheduleRender(); }
  }

  function selectTopic(id) {
    if (id !== "local" && !(typeof id === "string" && ID_RE.test(id))) return Promise.resolve();
    setView({ selectedTopicId: id, page: "chat", pageParam: "" });
    if (id === "local") return Promise.resolve();
    var tl = AM.state.timeline[id];
    seenTopics[id] = tl ? tl.filter(function (x) { return x.kind !== "divider"; }).length : 1;
    return loadEvidence(id);
  }

  function subAction(id, verb, body) {
    if (typeof id !== "string" || !ID_RE.test(id)) return Promise.resolve();
    return api("/api/subsessions/" + encodeURIComponent(id) + "/" + verb, "POST", body).then(function (res) {
      if (res.status >= 400) { addLog("assistant", T("error.server", { reason: res.status + (reasonOf(res) ? ": " + reasonOf(res) : "") })); scheduleRender(); }
    }, function (e) { if (e && e.auth) throw e; addLog("assistant", T("error.server", { reason: clean(scrub(e && e.message ? e.message : ""), 200) })); })
      .then(function () { return refresh(); }, function (e) { if (e && e.auth) expire(); });
  }

  function openSettings(section) {
    setView({ settingsOpen: true, settingsSection: typeof section === "string" && /^[a-z0-9-]{1,40}$/.test(section) ? section : "general", projectSettingsOpen: false });
    return Promise.resolve();
  }

  function openProjectSettings(page) {
    var p = typeof page === "string" && /^[a-z0-9-]{1,40}$/.test(page) ? page : "general";
    setView({ projectSettingsOpen: true, projectSettingsPage: p, settingsOpen: false });
    if (p === "usage") return loadUsage();
    return Promise.resolve();
  }

  function quitApp() {
    // Sunucuyu düzgün kapatır (başlatıcı penceresi kapanınca zaten kapatır); belirteç sunucuda geçersiz kalır.
    return api("/api/desktop/quit", "POST", {}).then(function () {
      clearToken();
      showError(T("core.quitting"));
      try { window.close(); } catch (e) { /* pencere kapatılamazsa kullanıcı kapatır */ }
    }, function (e) { if (e && e.auth) { expire(); return; } showError(T("error.server", { reason: clean(scrub(e && e.message ? e.message : ""), 200) })); });
  }

  function copyText(text) {
    var s = clean(text, 20000);
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s).then(function () { return true; }, function () { return false; }); } catch (e) { /* aşağıda false */ }
    return Promise.resolve(false);
  }

  function logout() {
    clearToken();
    var lm = $("loginMsg");
    if (lm) lm.textContent = "";
    show(false);
  }

  AM.actions = Object.freeze({
    approve: function (task) { return decide(task, "approve"); },
    deny: function (task) { return decide(task, "deny"); },
    refresh: function () { return refresh(); },
    command: command,
    loadEvidence: loadEvidence,
    logout: logout,
    setView: setView,
    selectTopic: selectTopic,
    openSettings: openSettings,
    closeSettings: function () { setView({ settingsOpen: false, projectSettingsOpen: false }); },
    openProjectSettings: openProjectSettings,
    // Sol menü gezinmesi: yeni oturum, ya da sağ Genel bakış panelinde ilgili sekme (ayrı sayfa uydurulmaz).
    navigate: function (id) {
      if (id === "new") { setView({ newSession: true, selectedTopicId: null, focusComposer: true, page: "chat", pageParam: "" }); return Promise.resolve(); }
      if (PAGE_IDS.indexOf(id) >= 0) { setView({ page: id, pageParam: "" }); return Promise.resolve(); }
      if (id === "scheduled") { setView({ panelOpen: true, panelTab: "scheduled" }); return Promise.resolve(); }
      if (["projects", "artifacts", "memory", "skills"].indexOf(id) >= 0) { setView({ panelOpen: true, panelTab: "overview" }); return Promise.resolve(); }
      return Promise.resolve();
    },
    openPalette: function () { setView({ paletteOpen: true }); loadData("modelCapabilities"); }, // model yeteneklerinin kullanılabilirliği menüde gri/açık görünsün
    closePalette: function () { setView({ paletteOpen: false }); },
    loadDoc: loadDoc,
    loadUsage: loadUsage,
    quitApp: quitApp,
    loadData: loadData,
    providerAction: providerAction,
    grantRevoke: function (id) { return listAction("grantRevoke", id, "revoke"); },
    automationRule: function (id, verb) { return listAction("automationRule", id, verb); },
    grantCreate: function (fields) { return createAction("grantCreate", fields); },
    changeCreate: function (fields) { return createAction("changeCreate", fields); },
    ruleCreate: function (fields) { return createAction("ruleCreate", fields); },
    implicitAccept: implicitAccept,
    hypothesesRun: function (fields) { return labRun("hypothesesRun", fields); },
    voiRun: function (fields) { return labRun("voiRun", fields); },
    // D8c: model yeteneği (onay penceresi zorunlu; çıktı güvenilmez veri) ve internet ayarları (onay penceresi zorunlu).
    modelRun: modelRun,
    netSettingsSave: netSettingsSave,
    netDomainCheck: function (raw) { var d = netDomain(raw); return d.err ? { ok: false, message: T(d.err, d.vars) } : { ok: true, value: d.value }; },
    // Yetenekler menüsü (palette / sohbet): katalogdaki yeteneğin sayfasını ve bölümünü açar. Yetenek yalnız kullanıcının bu isteğiyle açılır; hiçbir hesap kendiliğinden başlamaz (ADR-016).
    openCapability: function (id) {
      var capApi = window.AM_CAPABILITIES_API;
      var n = typeof id === "number" ? id : typeof id === "string" && /^[0-9]{1,3}$/.test(id) ? parseInt(id, 10) : -1;
      var e = capApi && typeof capApi.byId === "function" ? capApi.byId(n) : null;
      if (!e || PAGE_IDS.indexOf(e.sayfa) < 0) return Promise.resolve();
      capNonce = capNonce % 999999 + 1;
      var tg = capApi.target(e, capNonce);
      // Menü her zaman tam: gizli (gelişmiş) bir bölüme menüden gidilirse o bölüm bu oturumda açılır.
      var advKey = advancedKeyOf(e);
      var opened = Array.isArray(AM.view.advancedOpen) ? AM.view.advancedOpen.slice(0, 19) : [];
      if (advKey && opened.indexOf(advKey) < 0) opened.push(advKey);
      setView({ page: tg.page, pageParam: tg.param, settingsOpen: false, projectSettingsOpen: false, advancedOpen: opened });
      return Promise.resolve();
    },
    // Elle yedek: önce eylem + hedef gösterilerek sorulur; yedek anahtar/belirteç içermez, üzerine yazmaz, hiçbir şeyi silmez.
    runBackup: function () {
      return ask({ title: T("core.backupTitle"), action: "backup.create", target: AM.state.backup && AM.state.backup.lastBackup ? "yeni klasör (son: " + AM.state.backup.lastBackup.dir + ")" : "yeni klasör", detail: T("core.backupDetail"), confirmLabel: T("core.backupConfirm"), cancelLabel: T("core.cancel"), danger: false }).then(function (yes) {
        if (!yes) return null;
        return api("/api/backup/run", "POST", {}).then(function (res) {
          if (res.status >= 400) addLog("assistant", T("error.server", { reason: res.status + (reasonOf(res) ? ": " + reasonOf(res) : "") }));
          else if (res.json && res.json.busy === true) addLog("assistant", T("core.backupBusy"));
          else if (res.json && res.json.ok === true && res.json.verifyOk === true) addLog("assistant", T("core.backupDone"));
          else addLog("assistant", T("core.backupFailed"));
        }, function (e) { if (e && e.auth) throw e; addLog("assistant", T("error.server", { reason: clean(scrub(e && e.message ? e.message : ""), 200) })); }).then(function () { return refresh(); });
      }).then(null, function (e) { if (e && e.auth) expire(); });
    },
    copyText: copyText,
    renameSubsession: function (id, name) {
      var n = window.AM_NAME ? window.AM_NAME.clean(name) : clean(name, 60);
      if (!n) return Promise.resolve();
      return subAction(id, "rename", { name: n });
    },
    pinSubsession: function (id, pinned) { return subAction(id, "pin", { pinned: pinned === true }); },
    archiveSubsession: function (id, archived) { return subAction(id, "archive", { archived: archived !== false }); },
    createSubsession: function (opts) {
      var o = obj(opts);
      var body = { provider: clean(o.provider || "claude-code", 60) };
      if (o.roleHint) body.roleHint = clean(o.roleHint, 60);
      if (o.name) body.name = window.AM_NAME ? window.AM_NAME.clean(o.name) : clean(o.name, 60);
      return api("/api/subsessions", "POST", body).then(function () { return refresh(); }, function (e) { if (e && e.auth) expire(); else { addLog("assistant", T("error.server", { reason: clean(scrub(e && e.message ? e.message : ""), 200) })); scheduleRender(); } });
    }
  });
  Object.freeze(AM);
  window.AM = AM;

  // ---- Görünüm geçişi ----
  function show(doRefresh) {
    var lv = $("loginView"), app = $("app");
    if (lv) lv.hidden = !!token;
    if (app) app.hidden = !token;
    if (!token) {
      // Oturum kapanınca bellekteki veri de bırakılır.
      AM.state.tasks = []; AM.state.debt = []; AM.state.decisions = []; AM.state.skills = []; AM.state.providers = []; AM.state.evidence = {};
      AM.state.subsessions = []; AM.state.usage = null; AM.state.ctx = null; AM.state.indicators = null; AM.state.docs = {}; AM.state.policy = null; AM.state.backup = null; AM.state.data = {}; AM.state.topics = []; AM.state.timeline = { local: [] };
      AM.state.connected = false; AM.state.updatedAt = null;
      hideError();
      return;
    }
    if (doRefresh !== false) refresh();
  }

  function holding() { return hoverHold || focusHold; }
  function inApproval(node) { return !!(node && node.nodeType === 1 && typeof node.closest === "function" && node.closest(".am-card--approval")); }

  function on(id, ev, fn) { var n = $(id); if (n) n.addEventListener(ev, fn); }

  // Statik iskeletteki metinler (data-i18n*) AM_T ile doldurulur; bilinmeyen anahtar ⟦anahtar⟧ olarak görünür.
  function applyStaticText() {
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = T(nodes[i].getAttribute("data-i18n"));
    nodes = document.querySelectorAll("[data-i18n-aria]");
    for (var j = 0; j < nodes.length; j++) nodes[j].setAttribute("aria-label", T(nodes[j].getAttribute("data-i18n-aria")));
    nodes = document.querySelectorAll("[data-i18n-ph]");
    for (var k = 0; k < nodes.length; k++) nodes[k].setAttribute("placeholder", T(nodes[k].getAttribute("data-i18n-ph")));
  }

  document.addEventListener("DOMContentLoaded", function () {
    var boot = $("bootNote"); if (boot) boot.hidden = true; // betikler yüklendi: 'yükleniyor' notu kalkar
    applyLang();
    loadToken();

    on("loginForm", "submit", function (ev) {
      ev.preventDefault();
      var input = $("tokenInput");
      var v = input ? String(input.value || "").trim() : "";
      if (input) input.value = "";
      var lm = $("loginMsg");
      if (!TOKEN_RE.test(v)) { if (lm) lm.textContent = T("login.bad"); return; }
      storeToken(v);
      if (lm) lm.textContent = "";
      show();
    });
    on("errorRetry", "click", onRetry);

    // Giriş kutusu gönderimi chat.js'tedir (AM.actions.command); çekirdekte ikinci bir gönderim bağı YOK (çift gönderim olmasın).

    // Onay kartı üzerinde imleç ya da odak varken otomatik yenileme listeyi kaydırmaz (yanlış satıra tıklama olmaz).
    document.addEventListener("mouseover", function (e) { hoverHold = inApproval(e.target); });
    document.addEventListener("mouseout", function (e) { hoverHold = inApproval(e.relatedTarget); });
    document.addEventListener("focusin", function (e) { focusHold = inApproval(e.target); });
    document.addEventListener("focusout", function (e) { focusHold = inApproval(e.relatedTarget); });

    // Açık panelde "ui" yeniden çalışınca tarayıcı yalnız parçayı değiştirir: yeni belirteç burada yakalanır.
    window.addEventListener("hashchange", function () {
      if ((location.hash || "").indexOf("#token=") === 0) { token = null; loadToken(); show(); }
    });

    initModules();
    show();

    setInterval(function () {
      if (token && !document.hidden && !holding() && !confirmOpen && !AM.state.busy) refresh();
    }, POLL_MS);
  });
})();
