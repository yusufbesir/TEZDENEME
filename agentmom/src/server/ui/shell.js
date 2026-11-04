/*
 * Sahip: Sonnet (yerleşim kabuğu) [İP:AgentMom Faz 11, dilim 2]
 * yazan: [Claude#agentmom-faz11-dilim2-shell]
 * Amaç: window.AM_SHELL: üst çubuk (#topbar içi), sütun genişlik kolları, duyarlı çekmece mantığı,
 *       genel kısayollar (Ctrl+K, Ctrl+, , Ctrl+B, Ctrl+., Ctrl+Shift+O, Ctrl+Shift+T, Esc) ve tema döngüsü.
 * Sözleşme: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md (Ekranlar 7-8, bağlantı noktaları);
 *           güvenlik kuralları docs/tasarim/arayuz-sozlesmesi.md.
 * Kurallar: sunucu verisi yalnız textContent; ağ yok (yalnız AM.actions.*); depolama yok (kalıcılık prefs.js'te,
 *           AM.actions.setView ile); satır içi stil yok (yalnız CSS değişkeni ataması); dış kaynak yok.
 * Test: saf mantık window.AM_SHELL.pure altında; shell.test.ts kaynağı node:vm ile yükler.
 * Değiştirme: yalnız sahibi ya da ana oturum; Codex/Antigravity bu dosyayı değiştirmez.
 */
(function () {
  "use strict";

  /* ---------- Metinler ---------- */
  var TR = {
    "shell.bar": "Üst çubuk",
    "shell.sidebar.toggle": "Kenar çubuğunu aç/kapat",
    "shell.back": "Geri",
    "shell.forward": "İleri",
    "shell.project.menu": "Proje menüsü",
    "shell.project.default": "AgentMom",
    "shell.project.settings": "Proje ayarları",
    "shell.health.green": "Sağlıklı",
    "shell.health.red": "Sorunlu",
    "shell.health.unknown": "Bilinmiyor",
    "shell.health.label": "Sistem durumu: {durum}",
    "shell.overview": "Genel bakış",
    "shell.overview.pending": "Genel bakış, {n} bekleyen",
    "shell.settings": "Ayarlar",
    "shell.resize.left": "Sol sütun genişliği",
    "shell.resize.right": "Sağ sütun genişliği",
    "shell.theme.dark": "Tema: koyu",
    "shell.theme.light": "Tema: açık",
    "shell.theme.system": "Tema: sistem",
    "shell.error.title": "Üst çubuk çizilemedi",
    "shell.error.retry": "Yeniden dene"
  };

  function fill(text, vars) {
    return String(text).replace(/\{([A-Za-z0-9_]+)\}/g, function (m, k) {
      return vars && Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== null && vars[k] !== undefined ? String(vars[k]) : "";
    });
  }

  function T(key, vars) {
    var out;
    if (typeof window.AM_T === "function") {
      try { out = window.AM_T(key, vars); } catch (e) { out = null; }
      if (typeof out === "string" && out.indexOf("⟦") !== 0) return out;
    }
    if (Object.prototype.hasOwnProperty.call(TR, key)) return fill(TR[key], vars);
    return "⟦" + key + "⟧";
  }

  function registerTr() {
    if (typeof window.AM_REGISTER_TR === "function") {
      try { window.AM_REGISTER_TR("shell", TR); } catch (e) { /* kayıt tekrarı zararsız */ }
    }
  }
  registerTr();

  /* ---------- Saf mantık ---------- */
  var LIMITS = {
    left: { min: 200, max: 420, def: 280 },
    right: { min: 300, max: 640, def: 380 }
  };
  var COLLAPSED_W = 56;
  var THEMES = ["dark", "light", "system"];
  var HIST_MAX = 50;
  var TOPIC_RE = /^topic:([A-Za-z0-9._:-]{1,80})$/;
  var PROJECT_RE = /^project:([a-z0-9_-]{1,40})$/;
  var CODE_KEYS = { KeyK: "k", KeyB: "b", KeyO: "o", KeyT: "t", Comma: ",", Period: "." };
  var KEY_SET = { k: 1, b: 1, o: 1, t: 1, ",": 1, ".": 1 };
  var ESC_ORDER = ["dialog", "menu", "palette", "settings", "drawer"];

  function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  function clampWidth(side, w) {
    var L = LIMITS[side === "right" ? "right" : "left"];
    var n = Number(w);
    if (w === null || w === undefined || !isFinite(n)) return L.def; // Number(null) = 0 olur: boş genişlik asla en küçük sınıra kenetlenmesin
    return Math.min(L.max, Math.max(L.min, Math.round(n)));
  }

  function keyDelta(side, key, shift) {
    if (key !== "ArrowLeft" && key !== "ArrowRight") return 0;
    var step = shift ? 64 : 16;
    var grow = side === "right" ? key === "ArrowLeft" : key === "ArrowRight";
    return grow ? step : -step;
  }

  function dragWidth(side, startW, startX, curX) {
    var dx = Number(curX) - Number(startX);
    if (!isFinite(dx)) return clampWidth(side, startW);
    return clampWidth(side, side === "right" ? Number(startW) - dx : Number(startW) + dx);
  }

  function layoutMode(w) {
    var n = Number(w);
    if (!isFinite(n)) return "wide";
    if (n >= 1280) return "wide";
    if (n >= 900) return "medium";
    return "narrow";
  }

  function effectiveLeft(mode, collapsed, leftW) {
    if (collapsed && mode !== "narrow") return COLLAPSED_W;
    return clampWidth("left", leftW);
  }

  function drawerFor(mode, panelOpen, leftOpen) {
    if (mode === "wide") return "";
    if (panelOpen) return "right";
    if (mode === "narrow" && leftOpen) return "left";
    return "";
  }

  function normalizeTheme(t) {
    return THEMES.indexOf(t) >= 0 ? t : "dark";
  }

  function nextTheme(t) {
    var i = THEMES.indexOf(normalizeTheme(t));
    return THEMES[(i + 1) % THEMES.length];
  }

  function parseEntry(key) {
    if (typeof key !== "string") return null;
    if (key === "home") return { type: "home", id: null };
    var m = TOPIC_RE.exec(key);
    if (m) return { type: "topic", id: m[1] };
    m = PROJECT_RE.exec(key);
    if (m) return { type: "project", id: m[1] };
    return null;
  }

  function currentKey(view) {
    var v = view || {};
    if (v.projectSettingsOpen) {
      var page = v.projectSettingsPage || v.projectSettingsSection || "general";
      var k = "project:" + String(page);
      return parseEntry(k) ? k : "project:general";
    }
    if (typeof v.selectedTopicId === "string" && v.selectedTopicId) {
      var t = "topic:" + v.selectedTopicId;
      return parseEntry(t) ? t : "home";
    }
    return "home";
  }

  function histNew() { return { stack: ["home"], idx: 0 }; }

  function histNormalize(h) {
    if (!h || !Array.isArray(h.stack)) return histNew();
    var st = [];
    for (var i = 0; i < h.stack.length; i += 1) {
      if (parseEntry(h.stack[i])) st.push(h.stack[i]);
    }
    if (!st.length) return histNew();
    if (st.length > HIST_MAX) st = st.slice(st.length - HIST_MAX);
    var idx = Number(h.idx);
    if (!isFinite(idx) || idx !== Math.floor(idx) || idx < 0 || idx >= st.length) idx = st.length - 1;
    return { stack: st, idx: idx };
  }

  function histPush(h, key) {
    var cur = histNormalize(h);
    if (!parseEntry(key)) return cur;
    if (cur.stack[cur.idx] === key) return cur;
    var st = cur.stack.slice(0, cur.idx + 1);
    st.push(key);
    if (st.length > HIST_MAX) st = st.slice(st.length - HIST_MAX);
    return { stack: st, idx: st.length - 1 };
  }

  function histCanBack(h) { return histNormalize(h).idx > 0; }
  function histCanForward(h) { var c = histNormalize(h); return c.idx < c.stack.length - 1; }

  function histMove(h, dir) {
    var cur = histNormalize(h);
    var ni = cur.idx + (dir < 0 ? -1 : 1);
    if (ni < 0 || ni >= cur.stack.length) return null;
    return { h: { stack: cur.stack, idx: ni }, entry: cur.stack[ni] };
  }

  function pendingCount(state) {
    var s = state || {};
    var n = 0;
    var i;
    if (Array.isArray(s.topics) && s.topics.length) {
      for (i = 0; i < s.topics.length; i += 1) {
        var t = s.topics[i];
        if (t && (t.state === "awaiting_approval" || t.group === "waiting") && !t.archived) n += 1;
      }
      return n;
    }
    if (Array.isArray(s.tasks)) {
      for (i = 0; i < s.tasks.length; i += 1) {
        if (s.tasks[i] && s.tasks[i].state === "awaiting_approval") n += 1;
      }
    }
    return n;
  }

  function keyId(ev) {
    var k = typeof ev.key === "string" ? ev.key : "";
    var lower = k.length === 1 ? k.toLowerCase() : k;
    if (hasOwn(KEY_SET, lower)) return lower;
    if (typeof ev.code === "string" && hasOwn(CODE_KEYS, ev.code)) return CODE_KEYS[ev.code];
    return lower;
  }

  function shortcutAction(ev) {
    if (!ev) return null;
    if (ev.key === "Escape") {
      return (ev.ctrlKey || ev.metaKey || ev.altKey) ? null : "escape";
    }
    var mod = !!(ev.ctrlKey || ev.metaKey);
    if (!mod || ev.altKey) return null; // AltGr (Ctrl+Alt) yazı karakteri üretir; tek tuşlu kısayol yok
    var id = keyId(ev);
    if (!ev.shiftKey) {
      if (id === "k") return "palette";
      if (id === ",") return "settings";
      if (id === "b") return "sidebar";
      if (id === ".") return "panel";
      return null;
    }
    if (id === "o") return "newSession";
    if (id === "t") return "theme";
    return null;
  }

  function isTypingTarget(tag, editable, type) {
    if (editable) return true;
    var t = String(tag || "").toLowerCase();
    if (t === "textarea" || t === "select") return true;
    if (t === "input") {
      var ty = String(type || "text").toLowerCase();
      return ["button", "checkbox", "radio", "range", "color", "file", "submit", "reset", "image"].indexOf(ty) < 0;
    }
    return false;
  }

  function escapeTarget(layers) {
    var l = layers || {};
    for (var i = 0; i < ESC_ORDER.length; i += 1) {
      if (l[ESC_ORDER[i]]) return ESC_ORDER[i];
    }
    return null;
  }

  var pure = {
    LIMITS: LIMITS,
    COLLAPSED_W: COLLAPSED_W,
    clampWidth: clampWidth,
    keyDelta: keyDelta,
    dragWidth: dragWidth,
    layoutMode: layoutMode,
    effectiveLeft: effectiveLeft,
    drawerFor: drawerFor,
    normalizeTheme: normalizeTheme,
    nextTheme: nextTheme,
    parseEntry: parseEntry,
    currentKey: currentKey,
    histNew: histNew,
    histNormalize: histNormalize,
    histPush: histPush,
    histCanBack: histCanBack,
    histCanForward: histCanForward,
    histMove: histMove,
    pendingCount: pendingCount,
    shortcutAction: shortcutAction,
    isTypingTarget: isTypingTarget,
    escapeTarget: escapeTarget,
    T: T
  };

  /* ---------- Çalışma zamanı ---------- */
  var S = {
    AM: null, host: null, built: false, els: {}, leftOpen: false, menuOpen: false, mode: "wide",
    drag: null, appliedL: null, appliedR: null, lastKey: null, skipKey: null, hist: null, mirrored: null,
    theme: null, viewTheme: undefined, healthKey: null, installed: false, resizers: {}
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function icon(name, size) {
    if (typeof window.AM_ICON === "function") return window.AM_ICON(name, { size: size || 18 });
    var s = document.createElement("span");
    s.setAttribute("aria-hidden", "true");
    s.textContent = "•";
    return s;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function act(name) {
    var a = S.AM && S.AM.actions;
    if (a && typeof a[name] === "function") {
      return a[name].apply(a, Array.prototype.slice.call(arguments, 1));
    }
    return undefined;
  }

  function view() { return (S.AM && S.AM.view) || {}; }

  function mkBtn(id, iconName, labelKey, keys) {
    var b = el("button", "am-btn am-btn--ghost am-shell-btn");
    b.type = "button";
    b.id = id;
    b.setAttribute("aria-label", T(labelKey));
    if (keys) b.setAttribute("aria-keyshortcuts", keys);
    b.appendChild(icon(iconName, 18));
    return b;
  }

  function announce(text) {
    if (S.els.live) S.els.live.textContent = text;
  }

  /* --- tema --- */
  function applyTheme(t) {
    var theme = normalizeTheme(t);
    S.theme = theme;
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.setAttribute("data-theme", theme);
    }
    return theme;
  }

  function cycleTheme() {
    var next = nextTheme(S.theme || normalizeTheme(view().theme));
    applyTheme(next);
    act("setView", { theme: next });
    announce(T("shell.theme." + next));
    return next;
  }

  /* --- yerleşim --- */
  function setVar(name, px) {
    document.documentElement.style.setProperty(name, px + "px");
  }

  function currentWidth(side) {
    var v = view();
    return clampWidth(side, side === "right" ? v.rightW : v.leftW);
  }

  function applyWidth(side, px) {
    if (side === "right") {
      if (S.appliedR !== px) { setVar("--am-right-w", px); S.appliedR = px; }
    } else if (S.appliedL !== px) {
      setVar("--am-left-w", px);
      S.appliedL = px;
    }
  }

  function updateResizerAria(side) {
    var r = S.resizers[side];
    if (!r) return;
    var L = LIMITS[side];
    var w = side === "left" ? (S.drag && S.drag.side === "left" ? S.drag.cur : currentWidth("left")) : (S.drag && S.drag.side === "right" ? S.drag.cur : currentWidth("right"));
    r.setAttribute("aria-valuemin", String(L.min));
    r.setAttribute("aria-valuemax", String(L.max));
    r.setAttribute("aria-valuenow", String(w));
  }

  function commitWidths(side, w) {
    var patch = { leftW: currentWidth("left"), rightW: currentWidth("right") };
    if (side === "left") patch.leftW = w; else patch.rightW = w;
    act("setView", patch);
  }

  function mkResizer(side) {
    var d = el("div", "am-resizer am-resizer--" + side);
    d.setAttribute("role", "separator");
    d.setAttribute("aria-orientation", "vertical");
    d.setAttribute("aria-label", T("shell.resize." + side));
    d.tabIndex = 0;
    d.hidden = true;

    d.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      ev.preventDefault();
      S.drag = { side: side, startX: ev.clientX, startW: currentWidth(side), cur: currentWidth(side) };
      d.classList.add("am-resizer--active");
      if (typeof d.setPointerCapture === "function") {
        try { d.setPointerCapture(ev.pointerId); } catch (e) { /* yakalama yoksa belge olayları yeter */ }
      }
    });
    d.addEventListener("pointermove", function (ev) {
      if (!S.drag || S.drag.side !== side) return;
      var w = dragWidth(side, S.drag.startW, S.drag.startX, ev.clientX);
      S.drag.cur = w;
      applyWidth(side, side === "left" ? effectiveLeft(S.mode, false, w) : w);
      updateResizerAria(side);
    });
    function finish() {
      if (!S.drag || S.drag.side !== side) return;
      var w = S.drag.cur;
      S.drag = null;
      d.classList.remove("am-resizer--active");
      commitWidths(side, w);
    }
    d.addEventListener("pointerup", finish);
    d.addEventListener("pointercancel", finish);
    d.addEventListener("keydown", function (ev) {
      var w = currentWidth(side);
      var delta = keyDelta(side, ev.key, ev.shiftKey);
      var nw = null;
      if (delta) nw = clampWidth(side, w + delta);
      else if (ev.key === "Home") nw = LIMITS[side].min;
      else if (ev.key === "End") nw = LIMITS[side].max;
      else if (ev.key === "Enter") nw = LIMITS[side].def;
      if (nw === null) return;
      ev.preventDefault();
      applyWidth(side, side === "left" ? effectiveLeft(S.mode, false, nw) : nw);
      commitWidths(side, nw);
      updateResizerAria(side);
    });
    d.addEventListener("dblclick", function () {
      var w = LIMITS[side].def;
      applyWidth(side, side === "left" ? effectiveLeft(S.mode, false, w) : w);
      commitWidths(side, w);
      updateResizerAria(side);
    });
    S.resizers[side] = d;
    return d;
  }

  function ensureResizers() {
    var app = document.getElementById("app");
    if (!app) return;
    ["left", "right"].forEach(function (side) {
      var r = S.resizers[side] || mkResizer(side);
      if (r.parentNode !== app) app.appendChild(r);
    });
  }

  function setAttr(node, name, value) {
    if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
  }

  function applyLayout() {
    var mode = layoutMode(window.innerWidth);
    if (mode !== S.mode) {
      S.mode = mode;
      if (mode === "wide") S.leftOpen = false;
    }
    var v = view();
    var collapsed = !!v.sidebarCollapsed && mode !== "narrow";
    var panelOpen = !!v.panelOpen;
    var app = document.getElementById("app");
    if (app) {
      setAttr(app, "data-layout", mode);
      setAttr(app, "data-sidebar", mode === "narrow" ? "drawer" : (collapsed ? "collapsed" : "expanded"));
      setAttr(app, "data-panel", panelOpen ? "open" : "closed");
      setAttr(app, "data-drawer", drawerFor(mode, panelOpen, S.leftOpen));
    }
    if (!S.drag) {
      applyWidth("left", effectiveLeft(mode, collapsed, v.leftW));
      applyWidth("right", clampWidth("right", v.rightW));
    }
    if (S.resizers.left) S.resizers.left.hidden = mode === "narrow" || collapsed;
    if (S.resizers.right) S.resizers.right.hidden = mode === "narrow" || !panelOpen;
    updateResizerAria("left");
    updateResizerAria("right");
  }

  function toggleSidebar() {
    var v = view();
    if (S.mode === "narrow") {
      S.leftOpen = !S.leftOpen;
      if (S.leftOpen && v.panelOpen) act("setView", { panelOpen: false });
      applyLayout();
      updateBar();
      return;
    }
    act("setView", { sidebarCollapsed: !v.sidebarCollapsed });
  }

  function togglePanel() {
    var next = !view().panelOpen;
    if (next && S.mode === "narrow") S.leftOpen = false;
    act("setView", { panelOpen: next });
  }

  /* --- geçmiş (geri/ileri) --- */
  function goTo(p) {
    if (!p) return;
    if (p.type === "home") {
      act("setView", { selectedTopicId: null, projectSettingsOpen: false });
    } else if (p.type === "topic") {
      if (view().projectSettingsOpen) act("setView", { projectSettingsOpen: false });
      act("selectTopic", p.id);
    } else if (p.type === "project") {
      act("openProjectSettings", p.id);
    }
  }

  function navigate(dir) {
    var mv = histMove(S.hist, dir);
    if (!mv) return;
    S.hist = mv.h;
    S.skipKey = mv.entry;
    mirrorHistory();
    updateNavButtons();
    goTo(parseEntry(mv.entry));
  }

  function mirrorHistory() {
    if (S.mirrored === S.hist) return;
    var h = S.hist;
    S.mirrored = h;
    var run = function () { act("setView", { history: h }); };
    if (typeof queueMicrotask === "function") queueMicrotask(run); else run();
  }

  function trackHistory() {
    var key = currentKey(view());
    if (S.hist === null) {
      S.hist = histNormalize(view().history);
      S.mirrored = S.hist;
    }
    if (S.lastKey === null) {
      S.lastKey = key;
      if (S.hist.stack[S.hist.idx] !== key) { S.hist = histPush(S.hist, key); mirrorHistory(); }
      return;
    }
    if (key !== S.lastKey) {
      if (key === S.skipKey) {
        S.skipKey = null;
      } else {
        S.skipKey = null;
        S.hist = histPush(S.hist, key);
        mirrorHistory();
      }
      S.lastKey = key;
    }
  }

  function updateNavButtons() {
    if (!S.els.back) return;
    S.els.back.disabled = !histCanBack(S.hist);
    S.els.fwd.disabled = !histCanForward(S.hist);
  }

  /* --- proje menüsü --- */
  function openMenu(focusFirst) {
    S.menuOpen = true;
    S.els.menu.hidden = false;
    S.els.projBtn.setAttribute("aria-expanded", "true");
    if (focusFirst) {
      var first = S.els.menu.querySelector("[role=menuitem]");
      if (first) first.focus();
    }
  }

  function closeMenu(restoreFocus) {
    if (!S.menuOpen) return;
    S.menuOpen = false;
    S.els.menu.hidden = true;
    S.els.projBtn.setAttribute("aria-expanded", "false");
    if (restoreFocus) S.els.projBtn.focus();
  }

  function menuItems() {
    return Array.prototype.slice.call(S.els.menu.querySelectorAll("[role=menuitem]"));
  }

  /* --- üst çubuk yapısı --- */
  function build() {
    var host = S.host;
    clear(host);
    S.els = {};
    S.healthKey = null;

    var bar = el("div", "am-shell-bar");
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", T("shell.bar"));

    var sb = mkBtn("shellSidebarBtn", "sidebar", "shell.sidebar.toggle", "Control+B");
    sb.setAttribute("aria-expanded", "true");
    sb.addEventListener("click", toggleSidebar);

    var back = mkBtn("shellBackBtn", "back", "shell.back");
    var fwd = mkBtn("shellFwdBtn", "forward", "shell.forward");
    back.addEventListener("click", function () { navigate(-1); });
    fwd.addEventListener("click", function () { navigate(1); });

    var wrap = el("div", "am-shell-proj");
    var projBtn = el("button", "am-btn am-btn--ghost am-shell-projbtn");
    projBtn.type = "button";
    projBtn.id = "shellProjectBtn";
    projBtn.setAttribute("aria-haspopup", "menu");
    projBtn.setAttribute("aria-expanded", "false");
    projBtn.setAttribute("aria-controls", "shellProjectMenu");
    projBtn.setAttribute("aria-label", T("shell.project.menu"));
    var projName = el("span", "am-truncate am-shell-projname", T("shell.project.default"));
    projBtn.appendChild(projName);
    projBtn.appendChild(icon("chevron-down", 14));
    var menu = el("div", "am-shell-menu");
    menu.id = "shellProjectMenu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", T("shell.project.menu"));
    menu.hidden = true;
    var item = el("button", "am-shell-menuitem");
    item.type = "button";
    item.setAttribute("role", "menuitem");
    item.appendChild(icon("gear", 16));
    item.appendChild(el("span", "", T("shell.project.settings")));
    menu.appendChild(item);
    wrap.appendChild(projBtn);
    wrap.appendChild(menu);

    projBtn.addEventListener("click", function () {
      if (S.menuOpen) closeMenu(false); else openMenu(false);
    });
    projBtn.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); openMenu(true); }
    });
    item.addEventListener("click", function () {
      closeMenu(false);
      act("openProjectSettings", "general");
    });
    menu.addEventListener("keydown", function (ev) {
      var items = menuItems();
      var i = items.indexOf(document.activeElement);
      if (ev.key === "Escape") {
        ev.preventDefault();
        closeMenu(true);
      } else if (ev.key === "ArrowDown") {
        ev.preventDefault();
        if (items.length) items[(i + 1) % items.length].focus();
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        if (items.length) items[(i - 1 + items.length) % items.length].focus();
      } else if (ev.key === "Home") {
        ev.preventDefault();
        if (items.length) items[0].focus();
      } else if (ev.key === "End") {
        ev.preventDefault();
        if (items.length) items[items.length - 1].focus();
      } else if (ev.key === "Tab") {
        closeMenu(false);
      }
    });

    var grow = el("div", "am-shell-grow");
    var health = el("span", "am-pill am-pill--muted am-shell-health");
    health.id = "shellHealth";

    var ov = mkBtn("overviewBtn", "grid", "shell.overview", "Control+.");
    ov.className += " am-shell-overview";
    ov.setAttribute("aria-expanded", "false");
    ov.setAttribute("aria-controls", "panel");
    var dot = el("span", "am-shell-dot");
    dot.hidden = true;
    dot.setAttribute("aria-hidden", "true");
    ov.appendChild(dot);
    ov.addEventListener("click", togglePanel);

    var st = mkBtn("settingsBtn", "gear", "shell.settings", "Control+Comma");
    st.addEventListener("click", function () { act("openSettings", "general"); });

    var live = el("span", "am-sr");
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");

    [sb, back, fwd, wrap, grow, health, ov, st, live].forEach(function (n) { bar.appendChild(n); });
    host.appendChild(bar);

    S.els = { bar: bar, sidebarBtn: sb, back: back, fwd: fwd, projBtn: projBtn, projName: projName, menu: menu, health: health, overview: ov, dot: dot, settings: st, live: live };
    S.built = true;
    ensureResizers();
  }

  function updateHealth() {
    var AM = S.AM;
    var st = AM && AM.state;
    var status = st && st.connected !== false && st.health ? st.health.status : null;
    var key = status === "green" ? "green" : (status === "red" ? "red" : "unknown");
    if (S.healthKey === key) return;
    S.healthKey = key;
    var h = S.els.health;
    clear(h);
    var cls = { green: "am-pill--ok", red: "am-pill--bad", unknown: "am-pill--muted" };
    var ic = { green: "check", red: "alert", unknown: "dot" };
    h.className = "am-pill am-shell-health " + cls[key];
    var text = T("shell.health." + key);
    h.appendChild(icon(ic[key], 14));
    h.appendChild(el("span", "", text));
    h.setAttribute("aria-label", T("shell.health.label", { durum: text }));
    h.setAttribute("role", "status");
  }

  function updateBar() {
    var els = S.els;
    if (!els.bar) return;
    var v = view();
    var st = (S.AM && S.AM.state) || {};
    var name = typeof st.projectTitle === "string" && st.projectTitle ? st.projectTitle : (typeof v.projectTitle === "string" && v.projectTitle ? v.projectTitle : T("shell.project.default"));
    if (els.projName.textContent !== name) els.projName.textContent = name;

    var sidebarOpen = S.mode === "narrow" ? S.leftOpen : !v.sidebarCollapsed;
    els.sidebarBtn.setAttribute("aria-expanded", sidebarOpen ? "true" : "false");

    var panelOpen = !!v.panelOpen;
    els.overview.setAttribute("aria-expanded", panelOpen ? "true" : "false");
    var n = pendingCount(st);
    els.dot.hidden = n === 0;
    var label = n > 0 ? T("shell.overview.pending", { n: n }) : T("shell.overview");
    els.overview.setAttribute("aria-label", label);
    els.overview.title = label + " (Ctrl+.)";
    els.sidebarBtn.title = T("shell.sidebar.toggle") + " (Ctrl+B)";
    els.settings.title = T("shell.settings") + " (Ctrl+,)";
    els.back.title = T("shell.back");
    els.fwd.title = T("shell.forward");
    updateNavButtons();
    updateHealth();
  }

  function showError(err) {
    var host = S.host;
    if (!host) return;
    S.built = false;
    S.els = {};
    clear(host);
    var card = el("div", "am-card am-shell-error");
    card.setAttribute("role", "alert");
    card.appendChild(el("strong", "", T("shell.error.title")));
    var msg = err && err.message ? String(err.message) : String(err);
    card.appendChild(el("span", "am-shell-error-msg am-truncate", msg.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 200)));
    var retry = el("button", "am-btn am-btn--primary", T("shell.error.retry"));
    retry.type = "button";
    retry.addEventListener("click", function () { render(S.AM); });
    card.appendChild(retry);
    host.appendChild(card);
  }

  /* --- belge düzeyi dinleyiciler (bir kez) --- */
  function detectLayers() {
    var v = view();
    var palette = window.AM_PALETTE && typeof window.AM_PALETTE.isOpen === "function" && window.AM_PALETTE.isOpen();
    return {
      dialog: !!(document.querySelector('.am-overlay[data-owner="dialog"]:not([hidden])') || document.querySelector('[role="alertdialog"]')),
      menu: S.menuOpen || !!document.querySelector('[role="menu"]:not([hidden])'),
      palette: !!palette,
      settings: !!(v.settingsOpen || v.projectSettingsOpen),
      drawer: S.mode !== "wide" && !!(v.panelOpen || S.leftOpen)
    };
  }

  function onEscape(ev) {
    if (ev.defaultPrevented) return;
    var top = escapeTarget(detectLayers());
    if (!top) return;
    var v = view();
    if (top === "dialog") return;
    if (top === "menu") {
      if (S.menuOpen) { closeMenu(true); ev.preventDefault(); }
      return;
    }
    if (top === "palette") {
      if (window.AM_PALETTE && typeof window.AM_PALETTE.close === "function") { window.AM_PALETTE.close(); ev.preventDefault(); }
      return;
    }
    if (top === "settings") {
      var wasProject = !!v.projectSettingsOpen;
      act("closeSettings");
      if (wasProject) act("setView", { projectSettingsOpen: false });
      ev.preventDefault();
      return;
    }
    if (top === "drawer") {
      S.leftOpen = false;
      if (v.panelOpen) act("setView", { panelOpen: false });
      applyLayout();
      updateBar();
      ev.preventDefault();
    }
  }

  function closePalette() {
    if (window.AM_PALETTE && typeof window.AM_PALETTE.close === "function") window.AM_PALETTE.close();
  }

  function onKeydown(ev) {
    if (ev.isComposing) return;
    var a = shortcutAction(ev);
    if (!a) return;
    if (a === "escape") { onEscape(ev); return; }
    var layers = detectLayers();
    if (layers.dialog) return;
    ev.preventDefault();
    if (ev.repeat) return;
    var v = view();
    if (a === "palette") {
      if (window.AM_PALETTE && typeof window.AM_PALETTE.toggle === "function") window.AM_PALETTE.toggle(S.AM);
      return;
    }
    closePalette();
    if (S.menuOpen) closeMenu(false);
    if (a === "settings") {
      if (v.settingsOpen) act("closeSettings"); else act("openSettings", "general");
    } else if (a === "sidebar") {
      toggleSidebar();
    } else if (a === "panel") {
      togglePanel();
    } else if (a === "newSession") {
      act("setView", { newSession: true });
    } else if (a === "theme") {
      cycleTheme();
    }
  }

  function install() {
    if (S.installed) return;
    S.installed = true;
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("pointerdown", function (ev) {
      if (!S.menuOpen) return;
      var wrap = S.els.menu && S.els.menu.parentNode;
      if (wrap && !wrap.contains(ev.target)) closeMenu(false);
    });
    window.addEventListener("resize", function () {
      applyLayout();
      updateBar();
    });
    var scrim = document.getElementById("scrim");
    if (scrim) {
      scrim.addEventListener("click", function () {
        S.leftOpen = false;
        if (view().panelOpen) act("setView", { panelOpen: false });
        applyLayout();
        updateBar();
      });
    }
  }

  function init(AM, host) {
    S.AM = AM;
    S.host = host || document.getElementById("topbar");
    registerTr();
    if (!S.host) return;
    applyTheme(AM && AM.view ? AM.view.theme : "dark");
    S.viewTheme = AM && AM.view ? AM.view.theme : undefined;
    S.mode = layoutMode(window.innerWidth);
    install();
    try { build(); } catch (e) { showError(e); }
  }

  function render(AM) {
    if (AM) S.AM = AM;
    if (!S.host) return;
    try {
      if (!S.built) build();
      var v = view();
      if (v.theme !== S.viewTheme) {
        S.viewTheme = v.theme;
        if (THEMES.indexOf(v.theme) >= 0 && v.theme !== S.theme) applyTheme(v.theme);
      }
      trackHistory();
      applyLayout();
      updateBar();
    } catch (e) {
      showError(e);
    }
  }

  window.AM_SHELL = {
    init: init,
    render: render,
    pure: pure,
    cycleTheme: cycleTheme,
    applyTheme: applyTheme,
    toggleSidebar: toggleSidebar,
    togglePanel: togglePanel
  };
})();
