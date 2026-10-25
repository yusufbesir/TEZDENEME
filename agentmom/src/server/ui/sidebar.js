// AgentMom sol menü (Faz 11, dilim 2, Ekran 2). Yazan: Claude [İP:AgentMom Faz 11 / sidebar].
// Ne: #sidebar içini çizer (üst şerit, Ara, ana gezinme, Sabitlenmiş + kullanıcı adlı alt oturumlar, gruplar, güncelleme satırı, kullanıcı satırı).
// Kural: sunucu verisi yalnız textContent; ağ/depolama yok (yalnız AM.actions.*); dış kaynak yok; satır içi stil yok. Sahibi dışında değiştirilmez.
// Alt oturum adını AJANLAR değiştiremez: yeniden adlandırma yalnız güvenilir (isTrusted) kullanıcı olayından gider. Silme yok, yalnız Arşivle.
"use strict";
(function () {
  var TR = {
    "sidebar.menu": "Menü", "sidebar.toggle": "Kenar çubuğunu aç/kapat", "sidebar.back": "Geri", "sidebar.forward": "İleri",
    "sidebar.modeLabel": "Görünüm kipi", "sidebar.modeChat": "Sohbet", "sidebar.modeTasks": "Görevler",
    "sidebar.search": "Ara", "sidebar.searchHint": "Ara…", "sidebar.searchKbd": "Ctrl K",
    "sidebar.nav": "Ana gezinme", "sidebar.navNew": "Yeni", "sidebar.navProjects": "Projeler", "sidebar.navBeta": "Beta",
    "sidebar.navArtifacts": "Yapıtlar", "sidebar.navScheduled": "Zamanlanmış görevler", "sidebar.navMemory": "Hafıza",
    "sidebar.navSkills": "Beceriler", "sidebar.manage": "Yönetim",
    "sidebar.pg.overview": "Genel Bakış", "sidebar.pg.projects": "Projeler", "sidebar.pg.tasks": "Görevler ve İş Akışları", "sidebar.pg.providers": "AI Bağlantıları ve Sağlayıcılar",
    "sidebar.pg.models": "Modeller ve Ajanlar", "sidebar.pg.integrations": "Entegrasyonlar ve Yetenekler", "sidebar.pg.skills": "Beceriler", "sidebar.pg.research": "Araştırma ve Kalibrasyon",
    "sidebar.pg.memory": "Hafıza ve Bilgi", "sidebar.pg.verify": "Beyin Verify", "sidebar.pg.usage": "Kullanım ve Maliyetler", "sidebar.pg.security": "Güvenlik ve Yetkiler", "sidebar.pg.audit": "Denetim Kayıtları",
    "sidebar.pinned": "Sabitlenmiş", "sidebar.count": "{n} oturum", "sidebar.projectDefault": "AgentMom",
    "sidebar.thisComputer": "Bu bilgisayar", "sidebar.subsessions": "Alt oturumlar", "sidebar.project": "Proje",
    "sidebar.more": "Daha fazla", "sidebar.less": "Daha az", "sidebar.addIn": "{grup} içinde yeni oturum",
    "sidebar.empty": "Henüz oturum yok", "sidebar.noResults": "Eşleşme yok",
    "sidebar.ctxRename": "Yeniden adlandır", "sidebar.ctxPin": "Sabitle", "sidebar.ctxUnpin": "Sabitlemeyi kaldır", "sidebar.ctxArchive": "Arşivle",
    "sidebar.ctxLabel": "Alt oturum işlemleri", "sidebar.renameLabel": "Alt oturum adı",
    "sidebar.mismatch": "Ad: {ad}, gerçek model: {model}", "sidebar.modelUnknown": "Gerçek model bilinmiyor", "sidebar.modelTitle": "Gerçek model: {model}",
    "sidebar.statusIdle": "Boşta", "sidebar.statusRunning": "Çalışıyor", "sidebar.statusAwaiting": "Onay bekliyor",
    "sidebar.statusDone": "Bitti", "sidebar.statusFailed": "Başarısız", "sidebar.statusUnavailable": "KULLANILAMIYOR", "sidebar.statusUnknown": "Durum bilinmiyor",
    "sidebar.rowAria": "{ad}, {durum}, model {model}",
    "sidebar.update": "Güncellemek için yeniden başlat", "sidebar.userName": "Yusuf · yerel kip", "sidebar.userMenu": "Kullanıcı menüsü",
    "sidebar.settings": "Ayarlar", "sidebar.theme": "Tema: {tema} (değiştirmek için tıklayın)",
    "sidebar.themeDark": "koyu", "sidebar.themeLight": "açık", "sidebar.themeSystem": "sistem",
    "sidebar.errorTitle": "Kenar çubuğu çizilemedi", "sidebar.retry": "Yeniden dene", "sidebar.initials": "YB"
  };
  if (typeof window !== "undefined" && typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("sidebar", TR);

  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function arr(v) { return Array.isArray(v) ? v : []; }
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
  var FAMILIES = ["haiku", "sonnet", "opus"];
  var FAMILY_LABEL = { haiku: "Haiku", sonnet: "Sonnet", opus: "Opus" };
  var FAMILY_CLS = { haiku: "am-sb-model--haiku", sonnet: "am-sb-model--sonnet", opus: "am-sb-model--opus" };
  var STATUS = {
    idle: { shape: "idle", cls: "am-sb-dot--idle", key: "sidebar.statusIdle" },
    running: { shape: "running", cls: "am-sb-dot--running", key: "sidebar.statusRunning" },
    awaiting_approval: { shape: "awaiting", cls: "am-sb-dot--awaiting", key: "sidebar.statusAwaiting" },
    done: { shape: "done", cls: "am-sb-dot--done", key: "sidebar.statusDone" },
    failed: { shape: "failed", cls: "am-sb-dot--failed", key: "sidebar.statusFailed" },
    unavailable: { shape: "unavailable", cls: "am-sb-dot--unavailable", key: "sidebar.statusUnavailable" }
  };
  var UNKNOWN_STATUS = { shape: "unknown", cls: "am-sb-dot--unknown", key: "sidebar.statusUnknown" };
  var THEME_ORDER = ["system", "dark", "light"];

  function statusInfo(state) { var s = txt(state); return has(STATUS, s) ? STATUS[s] : UNKNOWN_STATUS; }

  function modelFamily(model) {
    var m = txt(model).toLowerCase();
    for (var i = 0; i < FAMILIES.length; i++) if (m.indexOf(FAMILIES[i]) !== -1) return FAMILIES[i];
    return null;
  }

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // Gerçek model rozeti: Haiku/Sonnet/Opus ya da sağlayıcı kısa adı; model 'unknown'/boş ise '?'.
  function modelBadge(model, provider) {
    var raw = txt(model).trim();
    if (!raw || raw.toLowerCase() === "unknown") return { text: "?", cls: "am-sb-model--unknown", known: false, family: null, real: "" };
    var fam = modelFamily(raw);
    if (fam) return { text: FAMILY_LABEL[fam], cls: FAMILY_CLS[fam], known: true, family: fam, real: FAMILY_LABEL[fam] };
    var p = txt(provider).trim() || raw;
    return { text: cap(p.slice(0, 8)), cls: "am-sb-model--other", known: true, family: null, real: raw.slice(0, 40) };
  }

  // Ad ile gerçek model uyuşmazlığı: ad bir model ailesi söylüyorsa ve gerçek model başkasıysa uyarı metni, yoksa null.
  // AM_NAME.modelMismatch varsa onun kararı esas alınır.
  function localMismatch(name, model) {
    var m = /haiku|sonnet|opus/i.exec(txt(name));
    if (!m) return null;
    var badge = modelBadge(model, "");
    if (!badge.known) return null;
    var claimed = m[0].toLowerCase();
    if (badge.family === claimed) return null;
    return T("sidebar.mismatch", { ad: claimed.toUpperCase(), model: badge.real });
  }
  function mismatchText(name, model) {
    var api = typeof window !== "undefined" ? window.AM_NAME : null;
    if (api && typeof api.modelMismatch === "function") {
      var r;
      try { r = api.modelMismatch(name, model); } catch (e) { r = undefined; }
      if (r === undefined) return localMismatch(name, model);
      if (!r) return null;
      if (typeof r === "string") return r;
      if (typeof r === "object") {
        if (r.mismatch === false) return null; // AM_NAME.modelMismatch {mismatch:false,...} döndürür: uyarı yok
        if (r.mismatch === true) return localMismatch(name, model) || T("sidebar.mismatch", { ad: String(r.nameFamily || txt(name)).toUpperCase(), model: modelBadge(model, "").real || String(r.modelFamily || "?") });
        if (typeof r.text === "string" && r.text) return r.text;
        if (typeof r.message === "string" && r.message) return r.message;
      }
      return localMismatch(name, model) || T("sidebar.mismatch", { ad: txt(name), model: modelBadge(model, "").real || "?" });
    }
    return localMismatch(name, model);
  }

  function cleanName(s) {
    var api = typeof window !== "undefined" ? window.AM_NAME : null;
    if (api && typeof api.clean === "function") { var r = api.clean(s); return typeof r === "string" ? r : ""; }
    return txt(s).replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  }

  // Sıralama: yalnız görsel sıra (order = kimlik dizisi); arşivlenmişler dışarıda; sırada olmayanlar özgün sırayla sona.
  function orderSubs(subs, order) {
    var ord = arr(order).map(String);
    var items = arr(subs).filter(function (s) { return s && s.id != null && !s.archived; }).map(function (s, i) {
      var k = ord.indexOf(String(s.id));
      return { s: s, k: k === -1 ? 1e9 + i : k };
    });
    items.sort(function (a, b) { return a.k - b.k; });
    return items.map(function (x) { return x.s; });
  }
  function splitPinned(list) {
    var pinned = [], others = [];
    arr(list).forEach(function (s) { (s.pinned ? pinned : others).push(s); });
    return { pinned: pinned, others: others };
  }
  function reorder(ids, dragId, targetId) {
    var a = arr(ids).map(String), from = a.indexOf(String(dragId)), to = a.indexOf(String(targetId));
    if (from === -1 || to === -1 || from === to) return a;
    a.splice(from, 1);
    a.splice(to, 0, String(dragId));
    return a;
  }
  function moveInOrder(ids, id, delta) {
    var a = arr(ids).map(String), i = a.indexOf(String(id)), j = i + delta;
    if (i === -1 || j < 0 || j >= a.length) return a;
    var t = a[i]; a[i] = a[j]; a[j] = t;
    return a;
  }
  function ts(v) { var n = typeof v === "number" ? v : Date.parse(txt(v)); return isNaN(n) ? 0 : n; }
  // Konular: arşivsizler, en yeni üstte; grup anahtarı kullanıcı verisi (serbest metin).
  function groupTopics(topics) {
    var map = {}, order = [];
    arr(topics).filter(function (t) { return t && t.id != null && !t.archived; })
      .sort(function (a, b) { return ts(b.updatedAt) - ts(a.updatedAt); })
      .forEach(function (t) {
        var key = txt(t.group).trim();
        if (!has(map, key)) { map[key] = []; order.push(key); }
        map[key].push(t);
      });
    var groups = order.map(function (key) {
      var kind = key === "" ? "project" : /^(local|bu bilgisayar)$/i.test(key) ? "local" : "named";
      return { key: key, kind: kind, items: map[key] };
    });
    var rank = { project: 0, named: 1, local: 2 };
    groups.sort(function (a, b) { return rank[a.kind] - rank[b.kind] || (a.kind === "named" ? a.key.localeCompare(b.key, "tr") : 0); });
    return groups;
  }
  function limitItems(items, limit, expanded) {
    var l = arr(items), n = limit > 0 ? limit : 6;
    if (expanded || l.length <= n) return { shown: l, hidden: 0 };
    return { shown: l.slice(0, n), hidden: l.length - n };
  }
  function navIndex(cur, n, key) {
    if (!(n > 0)) return -1;
    if (key === "Home") return 0;
    if (key === "End") return n - 1;
    if (key === "ArrowDown") return cur < 0 ? 0 : (cur + 1) % n;
    if (key === "ArrowUp") return cur < 0 ? n - 1 : (cur - 1 + n) % n;
    return cur;
  }
  function projectState(subs) {
    var a = arr(subs).filter(function (s) { return s && !s.archived; });
    if (a.some(function (s) { return s.state === "awaiting_approval"; })) return "awaiting_approval";
    if (a.some(function (s) { return s.state === "running"; })) return "running";
    return "idle";
  }
  function matches(text, q) {
    var needle = txt(q).trim().toLocaleLowerCase("tr");
    return !needle || txt(text).toLocaleLowerCase("tr").indexOf(needle) !== -1;
  }
  function nextTheme(cur) {
    var i = THEME_ORDER.indexOf(txt(cur));
    return i === -1 ? "dark" : THEME_ORDER[(i + 1) % THEME_ORDER.length];
  }
  function updateReady(update) { return !!update && typeof update === "object" && update.ready === true; }
  function countOpen(topics) { return arr(topics).filter(function (t) { return t && !t.archived; }).length; }

  // ======================= DOM =======================
  var AMref = null, host = null, bound = false;
  var regions = {};
  var local = { query: "", expanded: {}, editing: null, ctx: null, focusKey: null, dragId: null, dirty: false };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = txt(text);
    return e;
  }
  function icon(name, glyph) {
    var wrap = el("span", "am-sb-ico");
    wrap.setAttribute("aria-hidden", "true");
    var node = null;
    try { if (typeof window.AM_ICON === "function") node = window.AM_ICON(name, { size: 16 }); } catch (e) { node = null; }
    if (node && typeof node === "object" && node.nodeType === 1) wrap.appendChild(node);
    else wrap.textContent = glyph || "";
    return wrap;
  }
  function hasAct(name) { return !!(AMref && AMref.actions && typeof AMref.actions[name] === "function"); }
  // Hata yakalamaz: eylem hataları core.js hata sınırına (error card) gider.
  function act(name) {
    if (!hasAct(name)) return undefined;
    var rest = Array.prototype.slice.call(arguments, 1);
    return AMref.actions[name].apply(AMref.actions, rest);
  }
  function viewOf() { return (AMref && AMref.view) || {}; }
  function stateOf() { return (AMref && AMref.state) || {}; }
  function trusted(ev) { return !ev || ev.isTrusted !== false; }

  function statusText(state) {
    var info = statusInfo(state);
    if (state === "unavailable" || info === UNKNOWN_STATUS) return T(info.key);
    var api = window.AM_STATUS;
    if (api && typeof api.label === "function") {
      var s; try { s = api.label(state); } catch (e) { s = ""; }
      if (typeof s === "string" && s && s.charAt(0) !== "⟦") return s;
    }
    return T(info.key);
  }

  function iconBtn(name, glyph, label, key, onClick, opt) {
    var b = el("button", "am-sb-iconbtn");
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.title = label;
    b.setAttribute("data-am-nav", "1");
    b.setAttribute("data-am-key", key);
    if (opt && opt.disabled) b.disabled = true;
    if (opt && opt.pressed !== undefined) b.setAttribute("aria-pressed", opt.pressed ? "true" : "false");
    b.appendChild(icon(name, glyph));
    b.addEventListener("click", onClick);
    return b;
  }

  function guard(region, name, fn) {
    try { fn(); } catch (e) { showError(region, name, e); }
  }
  function showError(region, name, e) {
    region.replaceChildren();
    var card = el("div", "am-sb-error");
    card.setAttribute("role", "alert");
    card.appendChild(el("strong", null, T("sidebar.errorTitle")));
    card.appendChild(el("div", "am-sb-error-msg am-sb-trunc", (e && e.message) ? e.message : name));
    var b = el("button", "am-sb-retry", T("sidebar.retry"));
    b.type = "button";
    b.addEventListener("click", function () { render(AMref); });
    card.appendChild(b);
    region.appendChild(card);
  }

  // ---- üst şerit ----
  function renderTop(AM) {
    var r = regions.top, v = AM.view || {};
    r.replaceChildren();
    var tools = el("div", "am-sb-tools");
    tools.appendChild(iconBtn("menu", "☰", T("sidebar.menu"), "menu", function () { act("openPalette"); }, { disabled: !hasAct("openPalette") }));
    tools.appendChild(iconBtn("sidebar", "▤", T("sidebar.toggle"), "toggle", function () { act("setView", { sidebarCollapsed: !v.sidebarCollapsed }); }, { pressed: !v.sidebarCollapsed }));
    tools.appendChild(iconBtn("arrow-left", "‹", T("sidebar.back"), "back", function () { act("navBack"); }, { disabled: !hasAct("navBack") || v.canBack === false }));
    tools.appendChild(iconBtn("arrow-right", "›", T("sidebar.forward"), "forward", function () { act("navForward"); }, { disabled: !hasAct("navForward") || v.canForward === false }));
    r.appendChild(tools);
    var seg = el("div", "am-sb-seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", T("sidebar.modeLabel"));
    var mode = v.mode === "tasks" ? "tasks" : "chat";
    [["chat", "sidebar.modeChat"], ["tasks", "sidebar.modeTasks"]].forEach(function (m) {
      var b = el("button", "am-sb-segbtn" + (mode === m[0] ? " am-sb-segbtn--on" : ""), T(m[1]));
      b.type = "button";
      b.setAttribute("aria-pressed", mode === m[0] ? "true" : "false");
      b.setAttribute("data-am-nav", "1");
      b.setAttribute("data-am-key", "mode:" + m[0]);
      b.addEventListener("click", function () { act("setView", { mode: m[0] }); });
      seg.appendChild(b);
    });
    r.appendChild(seg);
  }

  // ---- ana gezinme (§14): üst grup (Yeni; Ara kalıcı arama kutusudur) + katlanır 'Yönetim' grubu ----
  var NAV_TOP = [{ id: "new", icon: "plus", glyph: "+", key: "sidebar.navNew", circle: true }];
  var NAV_PAGES = [
    { id: "overview", icon: "grid", glyph: "▦", key: "sidebar.pg.overview" },
    { id: "projects", icon: "folder", glyph: "▣", key: "sidebar.pg.projects" },
    { id: "tasks", icon: "list", glyph: "☰", key: "sidebar.pg.tasks" },
    { id: "providers", icon: "globe", glyph: "◍", key: "sidebar.pg.providers" },
    { id: "models", icon: "spark", glyph: "✦", key: "sidebar.pg.models" },
    { id: "integrations", icon: "link", glyph: "⚭", key: "sidebar.pg.integrations" },
    { id: "skills", icon: "tool", glyph: "✎", key: "sidebar.pg.skills" },
    { id: "research", icon: "scan", glyph: "◎", key: "sidebar.pg.research" },
    { id: "memory", icon: "brain", glyph: "◉", key: "sidebar.pg.memory" },
    { id: "verify", icon: "check", glyph: "✓", key: "sidebar.pg.verify" },
    { id: "usage", icon: "database", glyph: "▤", key: "sidebar.pg.usage" },
    { id: "security", icon: "shield", glyph: "◈", key: "sidebar.pg.security" },
    { id: "audit", icon: "doc", glyph: "▥", key: "sidebar.pg.audit" }
  ];
  function navPageIds() { return NAV_PAGES.map(function (n) { return n.id; }); }
  function navRow(n, v, isPage) {
    var cur = v.page === n.id;
    var b = el("button", "am-sb-row am-sb-navrow" + (cur ? " am-sb-row--active" : ""));
    b.type = "button";
    b.setAttribute("data-am-nav", "1");
    b.setAttribute("data-am-key", "nav:" + n.id);
    if (cur) b.setAttribute("aria-current", "page");
    var ic = icon(n.icon, n.glyph);
    if (n.circle) { var c = el("span", "am-sb-circle"); c.appendChild(ic); b.appendChild(c); } else b.appendChild(ic);
    b.appendChild(el("span", "am-sb-label am-sb-trunc", T(n.key)));
    b.title = T(n.key);
    b.setAttribute("aria-label", T(n.key));
    b.addEventListener("click", function () { if (!hasAct("navigate")) act("setView", isPage ? { page: n.id, pageParam: "" } : { page: "chat" }); else act("navigate", n.id); });
    return b;
  }
  function renderNav(AM) {
    var r = regions.nav, v = AM.view || {};
    r.replaceChildren();
    NAV_TOP.forEach(function (n) { r.appendChild(navRow(n, v, false)); });
    var open = local.navOpen !== false;
    var head = el("button", "am-sb-navhead am-sb-label");
    head.type = "button";
    head.setAttribute("data-am-nav", "1");
    head.setAttribute("data-am-key", "navgroup");
    head.setAttribute("aria-expanded", open ? "true" : "false");
    head.setAttribute("aria-controls", "am-sb-navlist");
    head.appendChild(el("span", "am-sb-navhead-t", T("sidebar.manage")));
    var chev = icon(open ? "chevron-down" : "chevron-right", open ? "▾" : "▸");
    head.appendChild(chev);
    head.addEventListener("click", function () { local.navOpen = !(local.navOpen !== false); renderNav(AMref); restoreFocus("navgroup"); });
    r.appendChild(head);
    var list = el("div", "am-sb-navlist");
    list.id = "am-sb-navlist";
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", T("sidebar.manage"));
    list.hidden = !open;
    NAV_PAGES.forEach(function (n) { list.appendChild(navRow(n, v, true)); });
    r.appendChild(list);
  }

  // ---- listeler ----
  function dotNode(state) {
    var info = statusInfo(state), label = statusText(state);
    var d = el("span", "am-sb-dot " + info.cls);
    d.setAttribute("role", "img");
    d.setAttribute("aria-label", label);
    d.title = label;
    return d;
  }

  function findSub(id) {
    var l = arr(stateOf().subsessions);
    for (var i = 0; i < l.length; i++) if (l[i] && String(l[i].id) === String(id)) return l[i];
    return null;
  }

  function startRename(id) {
    var s = findSub(id);
    if (!s) return;
    local.ctx = null;
    local.editing = { id: String(id), value: txt(s.name) };
    renderLists(AMref);
    var inp = regions.lists.querySelector(".am-sb-rename");
    if (inp) { inp.focus(); inp.select(); }
  }
  function cancelRename() {
    if (!local.editing) return;
    var id = local.editing.id;
    local.editing = null;
    local.focusKey = "sub:" + id;
    render(AMref);
  }
  function commitRename(ev) {
    if (!trusted(ev)) return;
    var ed = local.editing;
    if (!ed) return;
    var s = findSub(ed.id), name = cleanName(ed.value);
    local.editing = null;
    local.focusKey = "sub:" + ed.id;
    if (name && (!s || name !== txt(s.name))) act("renameSubsession", ed.id, name);
    render(AMref);
  }

  function editRow(s) {
    var li = el("li", "am-sb-item");
    var row = el("div", "am-sb-row am-sb-subrow am-sb-row--edit");
    row.appendChild(icon("code", "</>"));
    var inp = el("input", "am-sb-rename");
    inp.type = "text";
    inp.maxLength = 60;
    inp.value = local.editing.value;
    inp.setAttribute("aria-label", T("sidebar.renameLabel"));
    inp.addEventListener("input", function () { if (local.editing) local.editing.value = inp.value; });
    inp.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); ev.stopPropagation(); commitRename(ev); }
      else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); cancelRename(); }
    });
    inp.addEventListener("blur", function () { if (local.editing && local.editing.id === String(s.id)) cancelRename(); });
    row.appendChild(inp);
    li.appendChild(row);
    return li;
  }

  function ctxMenu(s) {
    var m = el("div", "am-sb-ctx");
    m.setAttribute("role", "menu");
    m.setAttribute("aria-label", T("sidebar.ctxLabel"));
    var id = String(s.id);
    var items = [
      ["rename", T("sidebar.ctxRename"), function (ev) { if (trusted(ev)) startRename(id); }],
      ["pin", s.pinned ? T("sidebar.ctxUnpin") : T("sidebar.ctxPin"), function (ev) { if (!trusted(ev)) return; closeCtx(); act("pinSubsession", id, !s.pinned); }],
      ["archive", T("sidebar.ctxArchive"), function (ev) { if (!trusted(ev)) return; closeCtx(); act("archiveSubsession", id, true); }]
    ];
    items.forEach(function (it, i) {
      var b = el("button", "am-sb-ctxitem", it[1]);
      b.type = "button";
      b.setAttribute("role", "menuitem");
      b.tabIndex = i === 0 ? 0 : -1;
      b.setAttribute("data-am-key", "ctx:" + it[0]);
      b.addEventListener("click", it[2]);
      m.appendChild(b);
    });
    m.addEventListener("keydown", function (ev) {
      var btns = Array.prototype.slice.call(m.querySelectorAll("[role=menuitem]"));
      var cur = btns.indexOf(document.activeElement);
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); closeCtx(); local.focusKey = "sub:" + id; render(AMref); }
      else if (ev.key === "Tab") { closeCtx(); render(AMref); }
      else if (ev.key === "ArrowDown" || ev.key === "ArrowUp" || ev.key === "Home" || ev.key === "End") {
        ev.preventDefault(); ev.stopPropagation();
        var n = navIndex(cur, btns.length, ev.key);
        btns.forEach(function (x, i) { x.tabIndex = i === n ? 0 : -1; });
        if (btns[n]) btns[n].focus();
      }
    });
    return m;
  }
  function closeCtx() { local.ctx = null; }

  function subRow(s, ids) {
    if (local.editing && local.editing.id === String(s.id)) return editRow(s);
    var v = viewOf(), id = String(s.id);
    var li = el("li", "am-sb-item");
    li.setAttribute("draggable", "true");
    var badge = modelBadge(s.model, s.provider);
    var warn = mismatchText(s.name, s.model);
    var row = el("button", "am-sb-row am-sb-subrow" + (String(v.selectedSubsessionId) === id ? " am-sb-row--active" : ""));
    row.type = "button";
    row.setAttribute("data-am-nav", "1");
    row.setAttribute("data-sub", id);
    row.setAttribute("data-am-key", "sub:" + id);
    row.setAttribute("aria-label", T("sidebar.rowAria", { ad: txt(s.name), durum: statusText(s.state), model: badge.known ? badge.real : T("sidebar.modelUnknown") }));
    row.title = txt(s.name);
    row.appendChild(icon("code", "</>"));
    row.appendChild(el("span", "am-sb-label am-sb-name am-sb-trunc", s.name));
    if (s.state === "unavailable") row.appendChild(el("span", "am-sb-label am-sb-unav", statusText("unavailable")));
    if (warn) {
      var w = el("span", "am-sb-warn");
      w.setAttribute("role", "img");
      w.setAttribute("aria-label", warn);
      w.title = warn;
      w.appendChild(icon("warning", "⚠"));
      row.appendChild(w);
    }
    var mb = el("span", "am-sb-label am-sb-model " + badge.cls, badge.text);
    mb.title = badge.known ? T("sidebar.modelTitle", { model: badge.real }) : T("sidebar.modelUnknown");
    row.appendChild(mb);
    row.appendChild(dotNode(s.state));
    row.addEventListener("click", function () {
      local.ctx = null;
      act("setView", { selectedSubsessionId: id });
      if (s.taskId != null) act("selectTopic", s.taskId);
    });
    row.addEventListener("dblclick", function (ev) { if (trusted(ev)) startRename(id); });
    row.addEventListener("contextmenu", function (ev) {
      ev.preventDefault();
      local.ctx = id;
      renderLists(AMref);
      var first = regions.lists.querySelector("[data-am-key='ctx:rename']");
      if (first) first.focus();
    });
    li.addEventListener("dragstart", function (ev) {
      local.dragId = id;
      if (ev.dataTransfer) { ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("text/plain", id); }
    });
    li.addEventListener("dragover", function (ev) {
      if (local.dragId && local.dragId !== id) { ev.preventDefault(); li.classList.add("am-sb-item--drop"); }
    });
    li.addEventListener("dragleave", function () { li.classList.remove("am-sb-item--drop"); });
    li.addEventListener("drop", function (ev) {
      ev.preventDefault();
      li.classList.remove("am-sb-item--drop");
      if (!local.dragId || !trusted(ev)) return;
      var next = reorder(ids, local.dragId, id);
      local.dragId = null;
      act("setView", { order: next });
    });
    li.addEventListener("dragend", function () { local.dragId = null; li.classList.remove("am-sb-item--drop"); });
    li.appendChild(row);
    if (local.ctx === id) li.appendChild(ctxMenu(s));
    return li;
  }

  function subList(list, ids) {
    var ul = el("ul", "am-sb-list am-sb-tree");
    list.forEach(function (s) {
      try { ul.appendChild(subRow(s, ids)); }
      catch (e) { ul.appendChild(el("li", "am-sb-empty", T("sidebar.errorTitle"))); }
    });
    return ul;
  }

  function groupHead(label, onAdd, addLabel) {
    var h = el("div", "am-sb-grouphead");
    h.appendChild(el("span", "am-sb-grouptitle am-sb-trunc", label));
    h.title = label;
    var add = el("button", "am-sb-add");
    add.type = "button";
    add.setAttribute("aria-label", addLabel);
    add.title = addLabel;
    add.setAttribute("data-am-nav", "1");
    add.appendChild(icon("plus", "+"));
    add.addEventListener("click", onAdd);
    h.appendChild(add);
    return h;
  }

  function topicGroup(g) {
    var v = viewOf();
    var wrap = el("div", "am-sb-group");
    var label = g.kind === "project" ? T("sidebar.project") : g.kind === "local" ? T("sidebar.thisComputer") : g.key;
    wrap.appendChild(groupHead(label, function () { act("createSubsession", { group: g.key }); }, T("sidebar.addIn", { grup: label })));
    var lim = limitItems(g.items, 6, !!local.expanded[g.key]);
    var ul = el("ul", "am-sb-list");
    lim.shown.forEach(function (t) {
      var li = el("li", "am-sb-item");
      var b = el("button", "am-sb-row am-sb-topic" + (String(v.selectedTopicId) === String(t.id) ? " am-sb-row--active" : ""));
      b.type = "button";
      b.setAttribute("data-am-nav", "1");
      b.setAttribute("data-am-key", "topic:" + txt(t.id));
      b.title = txt(t.title);
      b.appendChild(el("span", "am-sb-label am-sb-trunc", t.title));
      b.addEventListener("click", function () { act("selectTopic", t.id); });
      li.appendChild(b);
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    if (lim.hidden > 0 || local.expanded[g.key]) {
      var more = el("button", "am-sb-more am-sb-label", local.expanded[g.key] ? T("sidebar.less") : T("sidebar.more") + " (" + lim.hidden + ")");
      more.type = "button";
      more.setAttribute("data-am-nav", "1");
      more.setAttribute("aria-expanded", local.expanded[g.key] ? "true" : "false");
      more.addEventListener("click", function () { local.expanded[g.key] = !local.expanded[g.key]; renderLists(AMref); });
      wrap.appendChild(more);
    }
    return wrap;
  }

  function renderLists(AM) {
    var r = regions.lists;
    guard(r, "lists", function () {
      r.replaceChildren();
      var st = AM.state || {}, v = AM.view || {}, q = local.query;
      var all = orderSubs(st.subsessions, v.order);
      var ids = all.map(function (s) { return String(s.id); });
      var subs = q ? all.filter(function (s) { return matches(s.name, q); }) : all;
      var topics = q ? arr(st.topics).filter(function (t) { return t && matches(t.title, q); }) : arr(st.topics);
      var sp = splitPinned(subs);

      var head = el("div", "am-sb-sectionhead");
      head.appendChild(el("span", "am-sb-section am-sb-label", T("sidebar.pinned")));
      var cnt = el("span", "am-sb-count am-sb-label", T("sidebar.count", { n: countOpen(st.topics) }));
      cnt.setAttribute("aria-label", T("sidebar.count", { n: countOpen(st.topics) }));
      head.appendChild(cnt);
      r.appendChild(head);

      var pname = (st.project && st.project.name) ? txt(st.project.name) : T("sidebar.projectDefault");
      var prow = el("button", "am-sb-row am-sb-projrow" + (v.selectedSubsessionId == null ? " am-sb-row--active" : ""));
      prow.type = "button";
      prow.setAttribute("data-am-nav", "1");
      prow.setAttribute("data-am-key", "project");
      prow.title = pname;
      prow.appendChild(icon("folder", "▣"));
      prow.appendChild(el("span", "am-sb-label am-sb-name am-sb-trunc", pname));
      prow.appendChild(dotNode(projectState(st.subsessions)));
      prow.addEventListener("click", function () { act("setView", { selectedSubsessionId: null }); });
      r.appendChild(prow);

      if (sp.pinned.length) r.appendChild(subList(sp.pinned, ids));
      if (sp.others.length) {
        var og = el("div", "am-sb-group");
        og.appendChild(el("div", "am-sb-grouptitle am-sb-grouplabel am-sb-label", T("sidebar.subsessions")));
        og.appendChild(subList(sp.others, ids));
        r.appendChild(og);
      }

      var groups = groupTopics(topics);
      groups.forEach(function (g) { try { r.appendChild(topicGroup(g)); } catch (e) { r.appendChild(el("div", "am-sb-empty", T("sidebar.errorTitle"))); } });

      if (!subs.length && !groups.length) r.appendChild(el("div", "am-sb-empty am-sb-label", q ? T("sidebar.noResults") : T("sidebar.empty")));
    });
  }

  // ---- alt bölüm ----
  function renderBottom(AM) {
    guard(regions.update, "update", function () {
      var r = regions.update;
      r.replaceChildren();
      var up = (AM.state || {}).update;
      if (!updateReady(up)) return; // veri yoksa hiç gösterme
      var b = el("button", "am-sb-updatebtn");
      b.type = "button";
      b.setAttribute("data-am-nav", "1");
      b.setAttribute("data-am-key", "update");
      b.appendChild(icon("refresh", "↻"));
      b.appendChild(el("span", "am-sb-label am-sb-trunc", T("sidebar.update")));
      b.title = T("sidebar.update") + (up.version ? " (" + txt(up.version) + ")" : "");
      b.setAttribute("aria-label", b.title);
      b.addEventListener("click", function () { act("applyUpdate"); });
      r.appendChild(b);
    });
    guard(regions.userrow, "user", function () {
      var r = regions.userrow, v = AM.view || {};
      r.replaceChildren();
      var open = !!(window.AM_USERMENU && typeof window.AM_USERMENU.isOpen === "function" && window.AM_USERMENU.isOpen());
      var u = el("button", "am-sb-user");
      u.type = "button";
      u.setAttribute("data-am-userrow", "1");
      u.setAttribute("data-am-nav", "1");
      u.setAttribute("data-am-key", "userrow");
      u.setAttribute("aria-haspopup", "menu");
      u.setAttribute("aria-expanded", open ? "true" : "false");
      u.setAttribute("aria-label", T("sidebar.userMenu") + ": " + T("sidebar.userName"));
      u.title = T("sidebar.userMenu");
      var av = el("span", "am-sb-avatar", T("sidebar.initials"));
      av.setAttribute("aria-hidden", "true");
      u.appendChild(av);
      u.appendChild(el("span", "am-sb-label am-sb-usertext am-sb-trunc", T("sidebar.userName")));
      var ch = icon("chevron-up", "˄");
      ch.classList.add("am-sb-label");
      u.appendChild(ch);
      u.addEventListener("click", function () {
        if (window.AM_USERMENU && typeof window.AM_USERMENU.toggle === "function") window.AM_USERMENU.toggle(AMref);
      });
      r.appendChild(u);
      r.appendChild(iconBtn("settings", "⚙", T("sidebar.settings"), "settings", function () { act("openSettings", "general"); }, { disabled: !hasAct("openSettings") }));
      var th = txt(v.theme) || "system";
      var thName = th === "dark" ? T("sidebar.themeDark") : th === "light" ? T("sidebar.themeLight") : T("sidebar.themeSystem");
      var thIcon = th === "dark" ? ["moon", "☾"] : th === "light" ? ["sun", "☀"] : ["monitor", "▭"];
      r.appendChild(iconBtn(thIcon[0], thIcon[1], T("sidebar.theme", { tema: thName }), "theme", function () { act("setView", { theme: nextTheme(th) }); }, { disabled: !hasAct("setView") }));
    });
  }

  // ---- odak yönetimi ----
  function focusedKey() {
    var a = document.activeElement;
    if (!a || !host || !host.contains(a) || a.classList.contains("am-sb-searchinput") || a.classList.contains("am-sb-rename")) return null;
    return a.getAttribute("data-am-key");
  }
  function restoreFocus(key) {
    if (!key || !host) return;
    var all = host.querySelectorAll("[data-am-key]");
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute("data-am-key") === key) { all[i].focus(); return; }
  }

  // ---- klavye (host düzeyinde) ----
  function onKeydown(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var tag = txt(t.tagName).toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if (t.closest(".am-sb-ctx")) return;
    var subEl = t.closest("[data-sub]");
    if (ev.key === "F2" && subEl) { ev.preventDefault(); startRename(subEl.getAttribute("data-sub")); return; }
    if (ev.altKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown") && subEl) {
      ev.preventDefault();
      var ids = orderSubs(stateOf().subsessions, viewOf().order).map(function (s) { return String(s.id); });
      var id = subEl.getAttribute("data-sub");
      local.focusKey = "sub:" + id;
      act("setView", { order: moveInOrder(ids, id, ev.key === "ArrowUp" ? -1 : 1) });
      return;
    }
    if (!ev.altKey && !ev.ctrlKey && !ev.metaKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown" || ev.key === "Home" || ev.key === "End") && t.closest("[data-am-nav]")) {
      var navs = Array.prototype.slice.call(host.querySelectorAll("[data-am-nav]")).filter(function (n) { return !n.disabled; });
      var idx = navs.indexOf(t.closest("[data-am-nav]"));
      var n = navIndex(idx, navs.length, ev.key);
      if (navs[n]) { ev.preventDefault(); navs[n].focus(); }
    }
  }

  function buildSkeleton() {
    host.replaceChildren();
    host.classList.add("am-sb");
    var names = ["top", "search", "nav", "scroll", "bottom"];
    var parts = {};
    names.forEach(function (n) { parts[n] = el("div", "am-sb-" + n); host.appendChild(parts[n]); });
    regions.top = parts.top;
    regions.nav = parts.nav;
    regions.nav.setAttribute("role", "navigation");
    regions.nav.setAttribute("aria-label", T("sidebar.nav"));
    regions.lists = parts.scroll;

    // Ara kutusu kalıcıdır (yazı yazarken yeniden çizilmez).
    var box = parts.search;
    box.setAttribute("role", "search");
    box.appendChild(icon("search", "⌕"));
    var inp = el("input", "am-sb-searchinput");
    inp.type = "search";
    inp.placeholder = T("sidebar.searchHint");
    inp.setAttribute("aria-label", T("sidebar.search"));
    inp.autocomplete = "off";
    inp.addEventListener("focus", function () {
      if (hasAct("openPalette")) { inp.blur(); act("openPalette"); }
    });
    inp.addEventListener("input", function () { local.query = inp.value; if (!hasAct("openPalette")) renderLists(AMref); });
    box.appendChild(inp);
    var kbd = el("span", "am-sb-kbd am-sb-label", T("sidebar.searchKbd"));
    kbd.setAttribute("aria-hidden", "true");
    box.appendChild(kbd);

    regions.update = el("div", "am-sb-update");
    parts.bottom.appendChild(regions.update);
    var uw = el("div", "am-sb-userwrap");
    var existing = document.getElementById("userMenuRoot");
    var menuRoot = existing || el("div", "am-sb-menuroot");
    if (!existing) menuRoot.id = "userMenuRoot";
    menuRoot.classList.add("am-sb-menuroot");
    uw.appendChild(menuRoot);
    regions.userrow = el("div", "am-sb-userrow");
    uw.appendChild(regions.userrow);
    parts.bottom.appendChild(uw);
  }

  function init(AM, h) {
    AMref = AM;
    host = h || document.getElementById("sidebar");
    if (!host) return;
    buildSkeleton();
    if (!bound) {
      bound = true;
      host.addEventListener("keydown", onKeydown);
      document.addEventListener("pointerdown", function (ev) {
        if (local.ctx && !(ev.target && ev.target.closest && ev.target.closest(".am-sb-ctx"))) { local.ctx = null; renderLists(AMref); }
      }, true);
    }
  }

  function render(AM) {
    if (AM) AMref = AM;
    if (!host || !AMref) return;
    var a = document.activeElement;
    if (local.editing && a && a.classList && a.classList.contains("am-sb-rename")) { local.dirty = true; return; }
    local.dirty = false;
    var fk = local.focusKey || focusedKey();
    local.focusKey = null;
    var v = AMref.view || {};
    host.classList.toggle("am-sb--collapsed", !!v.sidebarCollapsed);
    guard(regions.top, "top", function () { renderTop(AMref); });
    guard(regions.nav, "nav", function () { renderNav(AMref); });
    renderLists(AMref);
    renderBottom(AMref);
    restoreFocus(fk);
  }

  window.AM_SIDEBAR = {
    init: init,
    render: render,
    pure: {
      statusInfo: statusInfo, modelFamily: modelFamily, modelBadge: modelBadge, mismatchText: mismatchText, cleanName: cleanName,
      orderSubs: orderSubs, splitPinned: splitPinned, reorder: reorder, moveInOrder: moveInOrder, groupTopics: groupTopics,
      limitItems: limitItems, navIndex: navIndex, projectState: projectState, matches: matches, nextTheme: nextTheme,
      updateReady: updateReady, countOpen: countOpen, navPageIds: navPageIds, NAV_PAGES: NAV_PAGES, NAV_TOP: NAV_TOP, TR: TR
    }
  };
})();
