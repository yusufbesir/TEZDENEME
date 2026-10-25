// AgentMom kullanıcı menüsü (Faz 11, dilim 2, Ekran 4). Yazan: Claude [İP:AgentMom Faz 11 / usermenu].
// Ne: kullanıcı satırına tıklayınca YUKARI açılan menü (kök #userMenuRoot). Hesap/e-posta, API anahtarı, plan/fatura, uzantı mağazası YOKTUR.
// Kural: yalnız AM.actions.* ve AM_DIALOG.confirm; metinler textContent; satır içi stil yok. "Uygulamayı kapat" onaysız çalışmaz. Sahibi dışında değiştirilmez.
"use strict";
(function () {
  var TR = {
    "usermenu.label": "Kullanıcı menüsü", "usermenu.localMode": "Yerel kip", "usermenu.localNote": "model çağrısı yok · abonelik rotası",
    "usermenu.settings": "Ayarlar", "usermenu.usage": "Kullanım", "usermenu.language": "Dil", "usermenu.langValue": "Türkçe", "usermenu.help": "Yardım",
    "usermenu.changelog": "Değişiklik günlüğü", "usermenu.about": "Hakkında / Daha fazla bilgi", "usermenu.back": "Geri",
    "usermenu.aboutVersion": "Sürüm", "usermenu.aboutAdr": "ADR listesi", "usermenu.aboutSecurity": "Güvenlik sınırları",
    "usermenu.aboutRisks": "Kalan riskler", "usermenu.aboutManual": "İşletim el kitabı", "usermenu.aboutLicense": "Lisans ve kaynaklar",
    "usermenu.backup": "Yedek al / Yedekten yükle", "usermenu.backupHint": "Ayarlar › Yedekleme",
    "usermenu.quit": "Uygulamayı kapat", "usermenu.quitTitle": "Uygulamayı kapat",
    "usermenu.quitAction": "Kapat", "usermenu.quitTarget": "AgentMom uygulaması", "usermenu.quitDetail": "Çalışan işler varsa yarıda kalabilir. Kayıtlı veri silinmez.",
    "usermenu.quitConfirm": "Uygulamayı kapat", "usermenu.cancel": "Vazgeç"
  };
  if (typeof window !== "undefined" && typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("usermenu", TR);

  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
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
  // Menü tanımı: sep = ayraç; run = [eylemAdı, ...argümanlar]; sub = alt menü adı; confirm = onay gerektirir.
  var MAIN = [
    { id: "settings", icon: "settings", glyph: "⚙", key: "usermenu.settings", kbd: "Ctrl+,", run: ["openSettings", "general"] },
    { id: "usage", icon: "chart", glyph: "▁▃▅", key: "usermenu.usage", run: ["openProjectSettings", "usage"] },
    { id: "language", icon: "globe", glyph: "◌", key: "usermenu.language", valueKey: "usermenu.langValue", run: ["openSettings", "general"] },
    { id: "help", icon: "help", glyph: "?", key: "usermenu.help", run: ["openSettings", "help"] },
    { sep: true },
    { id: "changelog", icon: "list", glyph: "☰", key: "usermenu.changelog", run: ["openSettings", "changelog"] },
    { id: "about", icon: "info", glyph: "i", key: "usermenu.about", sub: "about" },
    { id: "backup", icon: "archive", glyph: "▤", key: "usermenu.backup", valueKey: "usermenu.backupHint", run: ["openSettings", "backup"] },
    { sep: true },
    { id: "quit", icon: "power", glyph: "⏻", key: "usermenu.quit", confirm: true, run: ["quitApp"] }
  ];
  var ABOUT = [
    { id: "about-version", icon: "info", glyph: "i", key: "usermenu.aboutVersion", run: ["openSettings", "about"] },
    { id: "about-adr", icon: "list", glyph: "☰", key: "usermenu.aboutAdr", run: ["openSettings", "adr"] },
    { id: "about-security", icon: "shield", glyph: "◈", key: "usermenu.aboutSecurity", run: ["openSettings", "security"] },
    { id: "about-risks", icon: "warning", glyph: "⚠", key: "usermenu.aboutRisks", run: ["openSettings", "risks"] },
    { id: "about-manual", icon: "book", glyph: "▤", key: "usermenu.aboutManual", run: ["openSettings", "manual"] },
    { id: "about-license", icon: "file", glyph: "©", key: "usermenu.aboutLicense", run: ["openSettings", "license"] }
  ];
  var MENUS = { main: MAIN, about: ABOUT };

  function items(name) { return (has(MENUS, name) ? MENUS[name] : MAIN).filter(function (i) { return !i.sep; }); }
  function aboutIdx() { var l = items("main"); for (var i = 0; i < l.length; i++) if (l[i].id === "about") return i; return 0; }
  function navIndex(cur, n, key) {
    if (!(n > 0)) return -1;
    if (key === "Home") return 0;
    if (key === "End") return n - 1;
    if (key === "ArrowDown") return cur < 0 ? 0 : (cur + 1) % n;
    if (key === "ArrowUp") return cur < 0 ? n - 1 : (cur - 1 + n) % n;
    return cur;
  }
  // Menü öğesi için yürütme planı: hangi eylem, hangi argüman, onay gerekir mi.
  function plan(menuName, id) {
    var list = (has(MENUS, menuName) ? MENUS[menuName] : MAIN);
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.id === id) {
        if (it.sub) return { kind: "sub", sub: it.sub };
        return { kind: it.confirm ? "confirm" : "action", action: it.run[0], args: it.run.slice(1) };
      }
    }
    return null;
  }
  function confirmOptions() {
    return {
      title: T("usermenu.quitTitle"), action: T("usermenu.quitAction"), target: T("usermenu.quitTarget"),
      detail: T("usermenu.quitDetail"), confirmLabel: T("usermenu.quitConfirm"), cancelLabel: T("usermenu.cancel"), danger: true
    };
  }

  // ======================= DOM =======================
  var AMref = null, root = null, bound = false;
  var state = { open: false, menu: "main", focusIdx: -1 };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }
  function icon(name, glyph) {
    var wrap = el("span", "am-um-ico");
    wrap.setAttribute("aria-hidden", "true");
    var node = null;
    try { if (typeof window.AM_ICON === "function") node = window.AM_ICON(name, { size: 16 }); } catch (e) { node = null; }
    if (node && typeof node === "object" && node.nodeType === 1) wrap.appendChild(node);
    else wrap.textContent = glyph || "";
    return wrap;
  }
  function userRow() { return document.querySelector("[data-am-userrow]"); }
  function syncExpanded() {
    var b = userRow();
    if (b) b.setAttribute("aria-expanded", state.open ? "true" : "false");
  }

  function close(returnFocus) {
    var was = state.open;
    state.open = false;
    state.menu = "main";
    state.focusIdx = -1;
    if (root) root.replaceChildren();
    syncExpanded();
    if (was && returnFocus) { var b = userRow(); if (b) b.focus(); }
  }
  function open(AM) {
    if (AM) AMref = AM;
    state.open = true;
    state.menu = "main";
    state.focusIdx = 0;
    draw();
    syncExpanded();
  }
  function toggle(AM) { if (state.open) close(false); else open(AM); }

  function run(it, menuName, ev) {
    if (ev && ev.isTrusted === false) return; // betikle üretilmiş tıklama menü eylemi başlatamaz
    var p = plan(menuName, it.id);
    if (!p) return;
    if (p.kind === "sub") { state.menu = p.sub; state.focusIdx = 0; draw(); return; }
    close(false);
    var acts = AMref && AMref.actions;
    if (p.kind === "confirm") {
      var dlg = window.AM_DIALOG;
      if (!dlg || typeof dlg.confirm !== "function") return; // onay penceresi yoksa kapatma yapılmaz
      Promise.resolve(dlg.confirm(confirmOptions())).then(function (ok) {
        if (ok === true && acts && typeof acts[p.action] === "function") acts[p.action]();
      });
      return;
    }
    if (acts && typeof acts[p.action] === "function") acts[p.action].apply(acts, p.args);
  }

  function itemNode(it, menuName, idx) {
    var b = el("button", "am-um-item");
    b.type = "button";
    b.setAttribute("role", "menuitem");
    b.tabIndex = idx === state.focusIdx ? 0 : -1;
    b.setAttribute("data-am-um", it.id);
    if (it.sub) b.setAttribute("aria-haspopup", "menu");
    b.appendChild(icon(it.icon, it.glyph));
    b.appendChild(el("span", "am-um-label", T(it.key)));
    if (it.valueKey) b.appendChild(el("span", "am-um-value", T(it.valueKey)));
    if (it.kbd) b.appendChild(el("span", "am-um-kbd", it.kbd));
    if (it.sub) b.appendChild(icon("chevron-right", "›"));
    b.addEventListener("click", function (ev) { run(it, menuName, ev); });
    return b;
  }

  function draw() {
    if (!root) return;
    root.replaceChildren();
    if (!state.open) return;
    try {
      var menu = el("div", "am-usermenu");
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", T("usermenu.label"));
      var idx = 0;
      if (state.menu === "main") {
        var head = el("div", "am-um-head");
        head.appendChild(el("div", "am-um-mode", T("usermenu.localMode")));
        head.appendChild(el("div", "am-um-note", T("usermenu.localNote")));
        menu.appendChild(head);
      } else {
        var back = el("button", "am-um-item am-um-backitem");
        back.type = "button";
        back.setAttribute("role", "menuitem");
        back.tabIndex = state.focusIdx === 0 ? 0 : -1;
        back.setAttribute("data-am-um", "back");
        back.appendChild(icon("chevron-left", "‹"));
        back.appendChild(el("span", "am-um-label", T("usermenu.about")));
        back.addEventListener("click", function () { state.menu = "main"; state.focusIdx = 0; draw(); });
        menu.appendChild(back);
        menu.appendChild(el("div", "am-um-sep"));
        idx = 1;
      }
      var list = MENUS[state.menu] || MAIN;
      var n = 0;
      list.forEach(function (it) {
        if (it.sep) { var s = el("div", "am-um-sep"); s.setAttribute("role", "separator"); menu.appendChild(s); return; }
        var node = itemNode(it, state.menu, idx + n);
        menu.appendChild(node);
        n++;
      });
      menu.addEventListener("keydown", onKey);
      root.appendChild(menu);
      var btns = menu.querySelectorAll("[role=menuitem]");
      var f = btns[state.focusIdx >= 0 ? state.focusIdx : 0];
      if (f) f.focus();
    } catch (e) {
      root.replaceChildren();
      var card = el("div", "am-um-error");
      card.setAttribute("role", "alert");
      card.textContent = (e && e.message) ? e.message : "?";
      root.appendChild(card);
    }
  }

  function onKey(ev) {
    var menu = ev.currentTarget;
    var btns = Array.prototype.slice.call(menu.querySelectorAll("[role=menuitem]"));
    var cur = btns.indexOf(document.activeElement);
    if (ev.key === "Escape") {
      ev.preventDefault(); ev.stopPropagation();
      if (state.menu !== "main") { state.menu = "main"; state.focusIdx = aboutIdx(); draw(); } else close(true);
    } else if (ev.key === "Tab") {
      close(false);
    } else if (ev.key === "ArrowDown" || ev.key === "ArrowUp" || ev.key === "Home" || ev.key === "End") {
      ev.preventDefault(); ev.stopPropagation();
      var n = navIndex(cur, btns.length, ev.key);
      state.focusIdx = n;
      btns.forEach(function (b, i) { b.tabIndex = i === n ? 0 : -1; });
      if (btns[n]) btns[n].focus();
    } else if (ev.key === "ArrowRight" && cur >= 0 && btns[cur].getAttribute("aria-haspopup") === "menu") {
      ev.preventDefault(); ev.stopPropagation();
      btns[cur].click();
    } else if (ev.key === "ArrowLeft" && state.menu !== "main") {
      ev.preventDefault(); ev.stopPropagation();
      state.menu = "main"; state.focusIdx = aboutIdx(); draw();
    }
  }

  function init(AM, host) {
    AMref = AM;
    root = host || document.getElementById("userMenuRoot");
    if (!root) return;
    if (!bound) {
      bound = true;
      document.addEventListener("pointerdown", function (ev) {
        if (!state.open) return;
        var t = ev.target;
        if (t && t.closest && (t.closest("#userMenuRoot") || t.closest(".am-usermenu") || t.closest("[data-am-userrow]"))) return;
        close(false);
      }, true);
    }
  }
  function render(AM) {
    if (AM) AMref = AM;
    if (!root) return;
    // Açıkken durum değişimleri menüyü yeniden çizmez (odak kaybolmasın); yalnız kök boşalmışsa yeniden kur.
    if (state.open && root && !root.firstChild) draw();
    syncExpanded();
  }

  window.AM_USERMENU = {
    init: init, render: render, open: open, close: close, toggle: toggle,
    isOpen: function () { return state.open; },
    pure: { items: items, navIndex: navIndex, plan: plan, confirmOptions: confirmOptions, MAIN: MAIN, ABOUT: ABOUT, TR: TR }
  };
})();
