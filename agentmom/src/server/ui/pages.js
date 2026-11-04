// D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. Ek bölümler 'D9' ile işaretlidir; ADR-016: yetenekler kendiliğinden çalışmaz.
// AgentMom sayfa çerçevesi (Faz 11, D3). Yazan: Claude [İP:AgentMom Faz 11 / sayfalar]. Sahip: Yusuf.
// Ne: window.AM_PAGES = { register(id, spec), init(AM, host), render(AM), rerender(), get(id), kit, pure }.
//   host = #pageView. AM.view.page === "chat" iken host gizli ve #chatView görünür; aksi halde #chatView gizlenir ve ilgili sayfa
//   spec.render(AM, root, AM.view.pageParam) ile çizilir. Eksik/bozuk sayfa = GÖRÜNÜR hata kartı (sessiz boş sayfa yok).
// Kural: sunucu verisi yalnız textContent; ağ/depolama yok (veri yalnız AM.actions.loadData ile, AM.state.data üzerinden); dış kaynak yok;
//   satır içi stil yok; sınıf adları sabit kümeden. Kalıcı silme yok. Değiştirme: yalnız bu dosyayı yazan Claude iş parçacığı.
"use strict";
(function () {
  var TR = {
    "pages.crumbLabel": "Konum", "pages.crumbRoot": "AgentMom", "pages.group.manage": "Yönetim", "pages.back": "Sohbete dön",
    "pages.title.overview": "Genel Bakış", "pages.title.projects": "Projeler", "pages.title.tasks": "Görevler ve İş Akışları",
    "pages.title.providers": "AI Bağlantıları ve Sağlayıcılar", "pages.title.models": "Modeller ve Ajanlar",
    "pages.title.integrations": "Entegrasyonlar ve Yetenekler", "pages.title.skills": "Beceriler", "pages.title.research": "Araştırma ve Kalibrasyon",
    "pages.title.memory": "Hafıza ve Bilgi", "pages.title.verify": "Beyin Verify", "pages.title.usage": "Kullanım ve Maliyetler",
    "pages.title.security": "Güvenlik ve Yetkiler", "pages.title.audit": "Denetim Kayıtları",
    "pages.loading": "Yükleniyor…", "pages.retry": "Yeniden dene", "pages.errTitle": "Bir şey ters gitti",
    "pages.missing": "Bu sayfa yüklenemedi: {ad}", "pages.missingHint": "Sayfa dosyası yüklenmemiş ya da kayıt olmamış. Sayfayı yenileyin; sorun sürerse sunucuyu yeniden başlatın.",
    "pages.renderFail": "Bu sayfa çizilemedi: {ad}", "pages.blank": "Bu sayfa hiçbir içerik üretmedi: {ad}",
    "pages.noFramework": "Sayfa çerçevesi (pages.js) yüklenemedi; bu sayfa gösterilemiyor: {ad}",
    "pages.noData": "Veri istenemedi (oturum yok ya da bağlantı kurulamadı).", "pages.dataFail": "Veri alınamadı: {neden}",
    "pages.planned": "Planlı", "pages.partial": "Kısmi",
    "pages.plannedHint": "Henüz kullanılamaz; planlanmıştır.", "pages.partialHint": "Kısmen çalışır; eksikler olabilir.",
    "pages.advancedHidden": "Gelişmiş bölümler gizli (Ayarlar > Görünüm > Arayüz karmaşıklığı)", "pages.advancedShow": "Göster",
    "pages.empty": "Kayıt yok", "pages.dash": "—", "pages.sortBy": "{ad} sütununa göre sırala", "pages.sortAscTxt": "artan", "pages.sortDescTxt": "azalan",
    "pages.st.pending": "Bekliyor", "pages.st.awaiting_approval": "Onay bekliyor", "pages.st.blocked": "Engellendi", "pages.st.failed": "Başarısız",
    "pages.st.unavailable": "Kullanılamıyor", "pages.st.running": "Çalışıyor", "pages.st.approved": "Onaylandı", "pages.st.idle": "Boşta",
    "pages.st.created": "Oluşturuldu", "pages.st.succeeded": "Başarılı", "pages.st.done": "Bitti", "pages.st.completed": "Tamamlandı",
    "pages.st.cancelled": "İptal edildi", "pages.st.denied": "Reddedildi", "pages.st.paused": "Duraklatıldı", "pages.st.unknown": "Durum bilinmiyor"
  };
  if (typeof window !== "undefined" && typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("pages", TR);

  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function txt(v) { return String(v == null ? "" : v); }
  function fmt(s, vars) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && has(vars, k) ? String(vars[k]) : ""; }); }
  function T(key, vars) {
    var s;
    if (typeof window !== "undefined" && typeof window.AM_T === "function") {
      try { s = window.AM_T(key, vars); } catch (e) { s = undefined; }
      if (typeof s === "string" && s.charAt(0) !== "⟦") return s;
    }
    return fmt(has(TR, key) ? TR[key] : "⟦" + key + "⟧", vars);
  }

  // ======================= SAF MANTIK (pure) =======================
  var PAGE_IDS = ["overview", "projects", "tasks", "providers", "models", "integrations", "skills", "research", "memory", "verify", "usage", "security", "audit"];
  var CTRL_RE = /[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  var CTRL_KEEP_NL_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  var TONES = { ok: "am-pg-tone-ok", warn: "am-pg-tone-warn", bad: "am-pg-tone-bad", info: "am-pg-tone-info", muted: "am-pg-tone-muted" };
  // durum -> [şekil, ton]; şekil + metin birlikte gösterilir (renk tek ipucu değil)
  var ST = {
    pending: ["⏸", "warn"], awaiting_approval: ["!", "warn"], blocked: ["⏸", "bad"], failed: ["✕", "bad"], unavailable: ["!", "bad"],
    running: ["◐", "info"], approved: ["◐", "info"], idle: ["●", "muted"], created: ["●", "muted"], paused: ["⏸", "muted"],
    succeeded: ["✓", "ok"], done: ["✓", "ok"], completed: ["✓", "ok"], cancelled: ["✕", "muted"], denied: ["✕", "muted"]
  };
  var SECRET_KEY_RE = /token|secret|password|passwd|authorization|api[-_]?key|credential|private[-_]?key|cookie/i;
  var SECRET_VAL_RE = /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,})\b|Bearer\s+[A-Za-z0-9._~+\/=-]{12,}/g;

  function clean(v, max) {
    var s = txt(v).replace(CTRL_RE, " ");
    var lim = max || 500;
    return s.length > lim ? s.slice(0, lim - 1) + "…" : s;
  }
  function cleanMulti(v, max) {
    var s = txt(v).replace(CTRL_KEEP_NL_RE, " ");
    var lim = max || 4000;
    return s.length > lim ? s.slice(0, lim - 1) + "…" : s;
  }
  function maskSecrets(v) { return txt(v).replace(SECRET_VAL_RE, "[gizli]"); }
  // Belirteç/anahtar benzeri değerler ve anahtar adları ekranda GÖSTERİLMEZ (derin, derinlik sınırlı).
  function redact(v, depth) {
    depth = depth || 0;
    if (depth > 5) return "…";
    if (typeof v === "string") return maskSecrets(v);
    if (v === null || typeof v === "number" || typeof v === "boolean") return v;
    if (Array.isArray(v)) return v.slice(0, 50).map(function (x) { return redact(x, depth + 1); });
    if (v && typeof v === "object") {
      var o = {};
      Object.keys(v).slice(0, 50).forEach(function (k) {
        if (k === "__proto__") return;
        o[k] = SECRET_KEY_RE.test(k) ? "[gizli]" : redact(v[k], depth + 1);
      });
      return o;
    }
    return null;
  }
  function detailsText(details) {
    var s;
    try { s = JSON.stringify(redact(details), null, 2); } catch (e) { s = ""; }
    if (s === undefined || s === "null") return "";
    return cleanMulti(s, 4000);
  }
  function toneCls(t) { return has(TONES, t) ? TONES[t] : TONES.muted; }
  function normState(state) {
    if (typeof state !== "string") return "unknown";
    var s = state.trim().toLowerCase();
    return has(ST, s) ? s : "unknown";
  }
  function statusInfo(state) {
    var s = normState(state);
    if (s === "unknown") return { state: "unknown", shape: "?", tone: "warn", key: "pages.st.unknown", known: false };
    return { state: s, shape: ST[s][0], tone: ST[s][1], key: "pages.st." + s, known: true };
  }
  function timeOf(v) {
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string" && v !== "") { var t = Date.parse(v); if (isFinite(t)) return t; }
    return NaN;
  }
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function formatTime(v) {
    var t = timeOf(v);
    if (!isFinite(t)) return "";
    var d = new Date(t);
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function fmtNum(n) {
    var x = Number(n);
    if (!isFinite(x)) return "";
    try { return x.toLocaleString("tr-TR"); } catch (e) { return String(x); }
  }
  function countBy(list, fn) {
    var o = {};
    arr(list).forEach(function (x) { var k = txt(fn(x)); if (k === "__proto__") return; o[k] = (o[k] || 0) + 1; });
    return o;
  }
  function distinct(list) {
    var seen = {}, out = [];
    arr(list).forEach(function (x) { var k = txt(x); if (k === "" || k === "__proto__" || has(seen, k)) return; seen[k] = 1; out.push(k); });
    return out;
  }
  // Kararlı sıralama; boş değerler HER ZAMAN sonda; metinler tr-TR, sayılar sayısal.
  function sortBy(list, getter, dir) {
    var sign = dir === "desc" ? -1 : 1;
    var dec = arr(list).map(function (x, i) { return { x: x, i: i, k: getter(x) }; });
    function empty(k) { return k === null || k === undefined || k === "" || (typeof k === "number" && !isFinite(k)); }
    dec.sort(function (a, b) {
      var ea = empty(a.k), eb = empty(b.k);
      if (ea && eb) return a.i - b.i;
      if (ea) return 1;
      if (eb) return -1;
      var c;
      if (typeof a.k === "number" && typeof b.k === "number") c = a.k - b.k;
      else c = txt(a.k).localeCompare(txt(b.k), "tr", { numeric: true, sensitivity: "base" });
      return c ? c * sign : a.i - b.i;
    });
    return dec.map(function (d) { return d.x; });
  }
  function nextSort(cur, key, defaultDir) {
    if (cur && cur.key === key) return { key: key, dir: cur.dir === "asc" ? "desc" : "asc" };
    return { key: key, dir: defaultDir === "desc" ? "desc" : "asc" };
  }
  function matchesText(haystack, q) {
    var needle = txt(q).trim().toLocaleLowerCase("tr");
    return !needle || txt(haystack).toLocaleLowerCase("tr").indexOf(needle) !== -1;
  }
  function limitRows(list, max) {
    var l = arr(list), m = max > 0 ? max : 200;
    return l.length <= m ? { shown: l, hidden: 0, total: l.length } : { shown: l.slice(0, m), hidden: l.length - m, total: l.length };
  }
  function titleKey(id) { return PAGE_IDS.indexOf(id) >= 0 ? "pages.title." + id : null; }
  function dataKey(name, param) { return param === undefined || param === null || param === "" ? name : name + ":" + param; }
  function dataState(entry) {
    var e = obj(entry);
    var st = e.status === "ok" || e.status === "error" || e.status === "loading" ? e.status : "loading";
    return { status: st, value: st === "ok" ? e.value : null, reason: st === "error" ? clean(e.reason || "", 200) : "" };
  }

  // Denetim olayı (sunucu: {id,ts,initiator:{kind,id},action,decision,result,details}) -> güvenli düz satır. Belirteç benzeri değerler maskelenir.
  function safeStr(v, max) { return maskSecrets(clean(v, max || 200)); }
  function normAudit(e) {
    e = obj(e);
    var ini = obj(e.initiator);
    var kind = safeStr(ini.kind, 40), id = safeStr(ini.id, 80);
    return { id: safeStr(e.id, 80), ts: safeStr(e.ts, 40), time: formatTime(e.ts), actor: kind && id ? kind + ":" + id : (kind || id), action: safeStr(e.action, 120), decision: safeStr(e.decision, 60), result: safeStr(e.result, 200), details: e.details };
  }
  function auditRows(value) {
    var list = Array.isArray(value) ? value : arr(obj(value).events);
    return list.map(normAudit);
  }
  function auditLine(r) { return [r.time || r.ts, r.actor, r.action, r.decision, r.result].join("\t"); }

  // ======================= DOM =======================
  var S = { AM: null, host: null, frame: null, pages: Object.create(null), req: Object.create(null), lastKey: null, secFocused: null };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = txt(text);
    return e;
  }
  function byId(id) { return typeof document !== "undefined" && document.getElementById ? document.getElementById(id) : null; }
  function hasAct(name) { return !!(S.AM && S.AM.actions && typeof S.AM.actions[name] === "function"); }
  function act(name) {
    if (!hasAct(name)) return undefined;
    return S.AM.actions[name].apply(S.AM.actions, Array.prototype.slice.call(arguments, 1));
  }
  var uid = 0;
  function nextId(prefix) { uid += 1; return "am-pg-" + prefix + uid; }

  function chip(text, tone, mono) {
    var c = el("span", "am-pg-chip " + toneCls(tone) + (mono ? " am-pg-chip--mono" : ""), text);
    return c;
  }
  // Planlı / Kısmi etiketi: kullanılamayan yetenek kullanılabilir gibi GÖSTERİLMEZ.
  function capBadge(kind, extra) {
    var planned = kind === "planned";
    var c = el("span", "am-pg-chip am-pg-cap " + (planned ? "am-pg-tone-muted" : "am-pg-tone-warn"));
    var shape = el("span", "am-pg-shape", planned ? "◌" : "◐");
    shape.setAttribute("aria-hidden", "true");
    c.appendChild(shape);
    c.appendChild(el("span", null, T(planned ? "pages.planned" : "pages.partial") + (extra ? " (" + extra + ")" : "")));
    c.title = T(planned ? "pages.plannedHint" : "pages.partialHint");
    return c;
  }
  function stateBadge(state) {
    var info = statusInfo(state);
    var b = el("span", "am-pg-st " + toneCls(info.tone));
    var sh = el("span", "am-pg-shape", info.shape);
    sh.setAttribute("aria-hidden", "true");
    b.appendChild(sh);
    b.appendChild(el("span", "am-pg-st-t", T(info.key)));
    if (!info.known && txt(state) !== "") b.title = clean(state, 80);
    return b;
  }
  function skeleton(lines) {
    var box = el("div", "am-pg-skel");
    box.setAttribute("role", "status");
    box.setAttribute("aria-busy", "true");
    box.appendChild(el("span", "am-pg-sr", T("pages.loading")));
    for (var i = 0; i < (lines || 3); i++) { var bar = el("div", "am-pg-skel-bar"); bar.setAttribute("aria-hidden", "true"); box.appendChild(bar); }
    return box;
  }
  function emptyCard(text) { var d = el("div", "am-pg-empty", text); return d; }
  function errorCard(msg, onRetry, title) {
    var c = el("div", "am-pg-error");
    c.setAttribute("role", "alert");
    c.appendChild(el("strong", "am-pg-error-t", title || T("pages.errTitle")));
    c.appendChild(el("p", "am-pg-error-m", clean(maskSecrets(msg), 400)));
    if (typeof onRetry === "function") {
      var b = el("button", "am-pg-btn", T("pages.retry"));
      b.type = "button";
      b.setAttribute("data-am-key", "retry");
      b.addEventListener("click", function () { onRetry(); });
      c.appendChild(b);
    }
    return c;
  }
  // ---- Arayüz karmaşıklığı (madde 91): TEK MERKEZİ KURAL ----
  // KARAR: "gelişmiş" etiketli bölümler yalnız laboratuvar/analitik/uzman ayrıntılarıdır: Entegrasyonlar > Sistem analitiği ("analytics"),
  // Güvenlik > Eylem anlamları tablosu ("semantics"), Entegrasyonlar > Sağlayıcı yetenek kayıt defteri ayrıntı tablosu ("registry").
  // KALANLAR HER ZAMAN AÇIKTIR: Güvenlik sayfasının izin/defter/otomasyon formları, Araştırma ve Kalibrasyon "Karar laboratuvarı" ve "Model yetenekleri" (sık kullanılır).
  // Basit kipte ("simple") gelişmiş bölüm tek satıra daralır; "Göster" bölümü o oturumda açar (AM.view.advancedOpen, kalıcı değil). Varsayılan "advanced": hiçbir şey gizlenmez.
  // Yetenekler menüsü ve komut paleti etkilenmez; menüden gidilen bölüm o oturumda açılır (core.js openCapability).
  var ADVANCED_KEYS = ["analytics", "semantics", "registry"];
  function advancedHidden(AM, key) {
    if (ADVANCED_KEYS.indexOf(key) < 0) return false;
    var v = AM && AM.view && typeof AM.view === "object" ? AM.view : {};
    if (v.complexity !== "simple") return false;
    return !(Array.isArray(v.advancedOpen) && v.advancedOpen.indexOf(key) >= 0);
  }
  function revealAdvanced(AM, key) {
    var cur = AM && AM.view && Array.isArray(AM.view.advancedOpen) ? AM.view.advancedOpen.slice(0, 19) : [];
    if (cur.indexOf(key) < 0) cur.push(key);
    var done = false;
    if (AM && AM.actions && typeof AM.actions.setView === "function") { try { AM.actions.setView({ advancedOpen: cur }); done = true; } catch (e) { /* aşağıda doğrudan yazılır */ } }
    if (!done && AM && AM.view) AM.view.advancedOpen = cur;
    render();
  }
  function advancedStub(AM, key) {
    var wrap = el("div", "am-pg-advnote");
    wrap.setAttribute("role", "note");
    wrap.setAttribute("data-advanced", key);
    wrap.appendChild(el("span", "am-pg-advtext", T("pages.advancedHidden")));
    var b = el("button", "am-pg-btn", T("pages.advancedShow"));
    b.type = "button";
    b.setAttribute("data-am-key", "advanced-show:" + key);
    b.addEventListener("click", function () { revealAdvanced(AM, key); });
    wrap.appendChild(b);
    return wrap;
  }
  function section(parent, title, opts) {
    opts = opts || {};
    if (typeof opts.advanced === "string" && advancedHidden(S.AM, opts.advanced)) {
      parent.appendChild(advancedStub(S.AM, opts.advanced));
      return el("div", "am-pg-secbody"); // bağlantısız gövde: çağıran yazsa da görünmez
    }
    var sec = el("section", "am-pg-sec");
    var id = nextId("h");
    var head = el("div", "am-pg-sechead");
    var h = el("h2", "am-pg-h2", title);
    h.id = id;
    sec.setAttribute("aria-labelledby", id);
    head.appendChild(h);
    if (opts.count !== undefined && opts.count !== null) head.appendChild(el("span", "am-pg-count", opts.count));
    (arr(opts.badges)).forEach(function (b) { if (b) head.appendChild(b); });
    sec.appendChild(head);
    if (opts.desc) sec.appendChild(el("p", "am-pg-desc", opts.desc));
    var body = el("div", "am-pg-secbody");
    sec.appendChild(body);
    parent.appendChild(sec);
    return body;
  }
  function kv(parent, rows) {
    var dl = el("dl", "am-pg-kv");
    arr(rows).forEach(function (r) {
      var row = el("div", "am-pg-kvrow");
      row.appendChild(el("dt", "am-pg-dt", r[0]));
      var dd = el("dd", "am-pg-dd");
      if (r[1] && typeof r[1] === "object" && r[1].nodeType) dd.appendChild(r[1]); else dd.textContent = txt(r[1]);
      row.appendChild(dd);
      dl.appendChild(row);
    });
    parent.appendChild(dl);
    return dl;
  }
  function pathList(parent, paths, emptyText) {
    var l = arr(paths);
    if (!l.length) { parent.appendChild(emptyCard(emptyText)); return null; }
    var ul = el("ul", "am-pg-paths");
    l.forEach(function (p) { var li = el("li", "am-pg-path"); li.appendChild(el("code", "am-pg-code", maskSecrets(clean(p, 300)))); ul.appendChild(li); });
    parent.appendChild(ul);
    return ul;
  }
  function statCard(o) {
    var li = el("li", "am-pg-card " + toneCls(o.tone));
    var lab = el("h3", "am-pg-card-l", o.label);
    li.appendChild(lab);
    var val = el("div", "am-pg-card-v");
    if (o.shape) { var sh = el("span", "am-pg-shape", o.shape); sh.setAttribute("aria-hidden", "true"); val.appendChild(sh); }
    val.appendChild(el("span", "am-pg-card-n", o.value));
    li.appendChild(val);
    if (o.sub) li.appendChild(el("div", "am-pg-card-s", o.sub));
    if (o.node) li.appendChild(o.node);
    return li;
  }
  function cards(parent, list) {
    var ul = el("ul", "am-pg-cards");
    list.forEach(function (c) { if (c) ul.appendChild(c); });
    parent.appendChild(ul);
    return ul;
  }
  function button(text, key, onClick, cls) {
    var b = el("button", cls || "am-pg-btn", text);
    b.type = "button";
    if (key) b.setAttribute("data-am-key", key);
    b.addEventListener("click", onClick);
    return b;
  }
  // Gerçek tablo. o: { caption, cols:[{label, sortKey?, right?}], rows:[{cells:[düğüm|metin], onActivate?, detail?, open?}], sort?, onSort? }
  function table(parent, o) {
    var wrap = el("div", "am-pg-tablewrap");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", o.caption);
    wrap.tabIndex = 0;
    var t = el("table", "am-pg-table");
    t.appendChild(el("caption", "am-pg-sr", o.caption));
    var thead = el("thead"), htr = el("tr");
    arr(o.cols).forEach(function (c) {
      var th = el("th", "am-pg-th" + (c.right ? " am-pg-th--right" : ""));
      th.setAttribute("scope", "col");
      if (c.sortKey && typeof o.onSort === "function") {
        var active = o.sort && o.sort.key === c.sortKey;
        th.setAttribute("aria-sort", active ? (o.sort.dir === "desc" ? "descending" : "ascending") : "none");
        var b = el("button", "am-pg-sortbtn", c.label);
        b.type = "button";
        b.setAttribute("data-am-key", "sort:" + c.sortKey);
        b.setAttribute("aria-label", T("pages.sortBy", { ad: c.label }) + (active ? " (" + T(o.sort.dir === "desc" ? "pages.sortDescTxt" : "pages.sortAscTxt") + ")" : ""));
        var ind = el("span", "am-pg-sortind", active ? (o.sort.dir === "desc" ? "▼" : "▲") : "↕");
        ind.setAttribute("aria-hidden", "true");
        b.appendChild(ind);
        b.addEventListener("click", function () { o.onSort(c.sortKey); });
        th.appendChild(b);
      } else th.textContent = txt(c.label);
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    t.appendChild(thead);
    var tb = el("tbody");
    arr(o.rows).forEach(function (r) {
      var tr = el("tr", "am-pg-tr" + (r.onActivate ? " am-pg-tr--click" : ""));
      if (r.onActivate) tr.addEventListener("click", function (ev) { if (ev && ev.target && ev.target.tagName === "BUTTON") return; r.onActivate(); });
      arr(r.cells).forEach(function (cell, i) {
        var td;
        if (i === 0) { td = el("th", "am-pg-td am-pg-td--name"); td.setAttribute("scope", "row"); }
        else td = el("td", "am-pg-td" + (o.cols[i] && o.cols[i].right ? " am-pg-td--right" : ""));
        if (cell && typeof cell === "object" && cell.nodeType) td.appendChild(cell); else td.textContent = txt(cell);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
      if (r.detail && r.open) {
        var dr = el("tr", "am-pg-tr am-pg-tr--detail");
        var dtd = el("td", "am-pg-td am-pg-td--detail");
        dtd.setAttribute("colspan", String(arr(o.cols).length));
        dtd.appendChild(r.detail);
        dr.appendChild(dtd);
        tb.appendChild(dr);
      }
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    parent.appendChild(wrap);
    return t;
  }

  // Veri: sayfa açıldığında AM.state.data[...] yoksa AM.actions.loadData ÇAĞRILIR (anahtar başına yalnız bir kez; döngü yok).
  function ensureData(AM, name, param) {
    var key = dataKey(name, param);
    var d = AM && AM.state ? AM.state.data : null;
    var entry = d ? d[key] : null;
    if (entry) return dataState(entry);
    if (S.req[key] === d && d) return { status: "error", value: null, reason: T("pages.noData") };
    S.req[key] = d;
    if (AM && AM.actions && typeof AM.actions.loadData === "function") {
      try {
        var r = AM.actions.loadData(name, param);
        if (r && typeof r.then === "function") r.then(null, function () { /* hata çekirdekte AM.state.data'ya yazılır */ });
      } catch (e) { return { status: "error", value: null, reason: clean(e && e.message ? e.message : T("pages.noData"), 200) }; }
    }
    entry = d ? d[key] : null;
    return entry ? dataState(entry) : { status: "error", value: null, reason: T("pages.noData") };
  }
  function reload(AM, name, param) {
    if (AM && AM.actions && typeof AM.actions.loadData === "function") {
      try { var r = AM.actions.loadData(name, param); if (r && typeof r.then === "function") r.then(null, function () {}); } catch (e) { /* görünür hata sonraki çizimde */ }
    }
  }
  // Yükleniyor / hata / tamam durumlarını tek yerde çizer.
  function asyncBody(parent, st, retry, okFn) {
    if (st.status === "loading") { parent.appendChild(skeleton(3)); return; }
    if (st.status === "error") { parent.appendChild(errorCard(T("pages.dataFail", { neden: st.reason || T("pages.noData") }), retry)); return; }
    okFn(st.value);
  }

  // ======================= çerçeve =======================
  function titleOf(page) {
    var spec = has(S.pages, page) ? S.pages[page] : null;
    if (spec && typeof spec.title === "string" && spec.title) return clean(spec.title, 80);
    var k = titleKey(page);
    return k ? T(k) : clean(page, 40);
  }
  function inside(root, node) {
    var n = node, guard = 0;
    while (n && guard < 100) { if (n === root) return true; n = n.parentNode; guard++; }
    return false;
  }
  function findByKey(node, key) {
    var kids = node && node.children ? node.children : [];
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.getAttribute && k.getAttribute("data-am-key") === key) return k;
      var r = findByKey(k, key);
      if (r) return r;
    }
    return null;
  }
  function focusInfo(body) {
    var a = typeof document !== "undefined" ? document.activeElement : null;
    if (!a || !a.getAttribute || !inside(body, a)) return null;
    var key = a.getAttribute("data-am-key");
    if (!key) return null;
    return { key: key, s: typeof a.selectionStart === "number" ? a.selectionStart : null, e: typeof a.selectionEnd === "number" ? a.selectionEnd : null };
  }
  function restoreFocus(body, fi) {
    if (!fi) return;
    var n = findByKey(body, fi.key);
    if (!n || typeof n.focus !== "function") return;
    try { n.focus(); if (fi.s !== null && typeof n.setSelectionRange === "function") n.setSelectionRange(fi.s, fi.e); } catch (e) { /* odak geri verilemezse kullanıcı yeniden odaklar */ }
  }

  // Yetenekler menüsü: pageParam "bolum:<kimlik>[:<sayaç>]" ise o kimlikli bölüm başlığına kaydırılır ve odaklanır (her gezinmede YALNIZ bir kez; sonraki yeniden çizimler odağı çalmaz).
  var SEC_PARAM_RE = /^bolum:([A-Za-z0-9._-]{1,60})(?::[0-9]{1,6})?$/;
  function findById(node, id) {
    var kids = node && node.children ? node.children : [];
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      var kid = k.getAttribute ? k.getAttribute("id") : null;
      if ((kid || k.id) === id) return k;
      var r = findById(k, id);
      if (r) return r;
    }
    return null;
  }
  function focusSection(body, param) {
    var m = typeof param === "string" ? SEC_PARAM_RE.exec(param) : null;
    if (!m || S.secFocused === param) return;
    var node = findById(body, m[1]);
    if (!node) return;
    S.secFocused = param;
    try {
      if (typeof node.setAttribute === "function") node.setAttribute("tabindex", "-1");
      if (typeof node.scrollIntoView === "function") node.scrollIntoView({ block: "start" });
      if (typeof node.focus === "function") node.focus();
    } catch (e) { /* kaydırma/odak yoksa kullanıcı bölümü kendisi bulur */ }
  }

  function ensureFrame() {
    if (S.frame) return S.frame;
    var host = S.host;
    host.replaceChildren();
    host.classList.add("am-pageview");
    var wrap = el("div", "am-pg");
    var head = el("header", "am-pg-head");
    var nav = el("nav", "am-pg-crumb");
    nav.setAttribute("aria-label", T("pages.crumbLabel"));
    var ol = el("ol", "am-pg-crumbl");
    var c1 = el("li", "am-pg-crumbi", T("pages.crumbRoot"));
    var c2 = el("li", "am-pg-crumbi", T("pages.group.manage"));
    var c3 = el("li", "am-pg-crumbi am-pg-crumbi--cur");
    c3.setAttribute("aria-current", "page");
    ol.appendChild(c1); ol.appendChild(c2); ol.appendChild(c3);
    nav.appendChild(ol);
    var row = el("div", "am-pg-titlerow");
    var h1 = el("h1", "am-pg-h1");
    var hid = nextId("t");
    h1.id = hid;
    var back = el("button", "am-pg-btn am-pg-back", T("pages.back"));
    back.type = "button";
    back.setAttribute("data-am-key", "back");
    back.addEventListener("click", function () { act("setView", { page: "chat", pageParam: "" }); });
    row.appendChild(h1); row.appendChild(back);
    head.appendChild(nav); head.appendChild(row);
    var body = el("div", "am-pg-body");
    body.setAttribute("role", "region");
    body.setAttribute("aria-labelledby", hid);
    wrap.appendChild(head); wrap.appendChild(body);
    host.appendChild(wrap);
    S.frame = { wrap: wrap, h1: h1, crumbCur: c3, body: body };
    return S.frame;
  }

  function missingCard(page) {
    return errorCard(T("pages.missingHint"), function () { render(); }, T("pages.missing", { ad: clean(page, 40) }));
  }

  function drawBody(page, param) {
    var f = S.frame, body = f.body;
    var fi = focusInfo(body);
    body.replaceChildren();
    var spec = has(S.pages, page) ? S.pages[page] : null;
    if (!spec) body.appendChild(missingCard(page));
    else {
      try {
        spec.render(S.AM, body, param);
        if (!body.children || body.children.length === 0) body.appendChild(errorCard(T("pages.blank", { ad: titleOf(page) }), function () { render(); }, T("pages.errTitle")));
      } catch (e) {
        body.replaceChildren();
        body.appendChild(errorCard(clean(maskSecrets(e && e.message ? e.message : "?"), 200), function () { render(); }, T("pages.renderFail", { ad: titleOf(page) })));
      }
    }
    restoreFocus(body, fi);
    focusSection(body, param);
  }

  function render(AM) {
    if (AM) S.AM = AM;
    if (!S.host || !S.AM) return;
    var view = S.AM.view || {};
    var page = typeof view.page === "string" && view.page !== "" ? view.page : "chat";
    var chat = byId("chatView");
    if (page === "chat") {
      S.host.hidden = true;
      if (chat) chat.hidden = false;
      S.lastKey = null;
      return;
    }
    if (chat) chat.hidden = true;
    S.host.hidden = false;
    var f = ensureFrame();
    var param = typeof view.pageParam === "string" ? view.pageParam : "";
    var title = titleOf(page);
    if (f.h1.textContent !== title) { f.h1.textContent = title; f.crumbCur.textContent = title; }
    var key = page + "\u0000" + param;
    if (S.lastKey !== key) { S.lastKey = key; try { S.host.scrollTop = 0; } catch (e) { /* kaydırma yoksa sorun değil */ } }
    drawBody(page, param);
  }

  function init(AM, host) {
    S.AM = AM;
    S.host = host || byId("pageView");
    if (!S.host) return;
    S.host.hidden = true;
  }

  function register(id, spec) {
    if (typeof id !== "string" || PAGE_IDS.indexOf(id) < 0) throw new Error("AM_PAGES.register: bilinmeyen sayfa kimliği");
    if (!spec || typeof spec.render !== "function") throw new Error("AM_PAGES.register: render işlevi yok (" + id + ")");
    if (has(S.pages, id)) throw new Error("AM_PAGES.register: sayfa zaten kayıtlı (" + id + ")");
    S.pages[id] = spec;
    if (S.AM && S.host && S.AM.view && S.AM.view.page === id) render();
  }

  window.AM_PAGES = {
    register: register,
    init: init,
    render: render,
    rerender: function () { render(); },
    get: function (id) { return has(S.pages, id) ? S.pages[id] : null; },
    ids: PAGE_IDS.slice(),
    // Gelişmiş bölüm kuralı (madde 91): sayfa dosyaları kendi DOM'larında bu ikisini kullanır.
    advanced: { keys: ADVANCED_KEYS.slice(), hidden: function (AM, key) { return advancedHidden(AM, key); }, stub: function (AM, key) { return advancedStub(AM, key); } },
    kit: {
      T: T, el: el, chip: chip, capBadge: capBadge, stateBadge: stateBadge, skeleton: skeleton, emptyCard: emptyCard, errorCard: errorCard,
      section: section, advancedHidden: function (AM, key) { return advancedHidden(AM, key); }, kv: kv, pathList: pathList, statCard: statCard, cards: cards, button: button, table: table,
      ensureData: ensureData, reload: reload, asyncBody: asyncBody, hasAct: hasAct, act: act, nextId: nextId
    },
    pure: {
      PAGE_IDS: PAGE_IDS, clean: clean, cleanMulti: cleanMulti, maskSecrets: maskSecrets, redact: redact, detailsText: detailsText, toneCls: toneCls,
      normState: normState, statusInfo: statusInfo, formatTime: formatTime, fmtNum: fmtNum, countBy: countBy, distinct: distinct, sortBy: sortBy,
      nextSort: nextSort, normAudit: normAudit, auditRows: auditRows, auditLine: auditLine, safeStr: safeStr, matchesText: matchesText, limitRows: limitRows, titleKey: titleKey, dataKey: dataKey, dataState: dataState, TR: TR
    }
  };
})();
