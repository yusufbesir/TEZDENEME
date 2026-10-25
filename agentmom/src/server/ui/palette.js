// D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. Ek bölümler 'D9' ile işaretlidir; ADR-016: yetenekler kendiliğinden çalışmaz.
/*
 * Sahip: Sonnet (komut paleti) [İP:AgentMom Faz 11, dilim 2]
 * yazan: [Claude#agentmom-faz11-dilim2-shell]
 * Amaç: window.AM_PALETTE: Ctrl+K komut paleti. Oturumlar/konular, Ayarlar bölümleri, Proje ayarları sayfaları
 *       ve komutlar için tek giriş + sonuç listesi (combobox/listbox kalıbı), Türkçe karakter katlayan bulanık eşleme.
 * Sözleşme: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md (Ekran 8); güvenlik: docs/tasarim/arayuz-sozlesmesi.md.
 * Kurallar: salt eylem listesi (silme/kalıcı değişiklik komutu YOK); sunucu verisi yalnız textContent;
 *            ağ yok (yalnız AM.actions.*); satır içi stil yok; dış kaynak yok.
 * Test: saf mantık window.AM_PALETTE.pure altında (shell.test.ts, node:vm).
 * Değiştirme: yalnız sahibi ya da ana oturum; Codex/Antigravity bu dosyayı değiştirmez.
 */
(function () {
  "use strict";

  var TR = {
    "palette.title": "Komut paleti",
    "palette.placeholder": "Oturum, bölüm veya komut ara…",
    "palette.listLabel": "Sonuçlar",
    "palette.empty": "Sonuç yok",
    "palette.count": "{n} sonuç",
    "palette.hints": "↑↓ gez · Enter seç · Esc kapat",
    "palette.group.topic": "Oturumlar",
    "palette.group.section": "Bölümler",
    "palette.group.command": "Komutlar",
    "palette.group.capability": "Yetenekler",
    "palette.cap.unavailable": "Kullanılamıyor: {neden}",
    "palette.hint.topic": "Oturum",
    "palette.hint.settings": "Ayarlar",
    "palette.hint.project": "Proje ayarları",
    "palette.sec.general": "Genel",
    "palette.sec.providers": "Sağlayıcılar",
    "palette.sec.security": "Güvenlik ve izinler",
    "palette.sec.memory": "Bellek",
    "palette.sec.skills": "Beceriler",
    "palette.sec.backup": "Yedekleme",
    "palette.sec.appearance": "Görünüm",
    "palette.sec.system": "Sistem",
    "palette.sec.vault": "Kasa ve dosyalar",
    "palette.sec.developer": "Geliştirici",
    "palette.sec.guide": "Eğitim belgesi",
    "palette.sec.shortcuts": "Kısayollar",
    "palette.sec.commands": "Komutlar",
    "palette.sec.safety": "Güvenlik sınırları",
    "palette.sec.manual": "İşletim el kitabı",
    "palette.proj.general": "Genel",
    "palette.proj.memory": "Bellek",
    "palette.proj.environment": "Ortam",
    "palette.proj.usage": "Kullanım",
    "palette.proj.debug": "Hata ayıklama",
    "palette.cmd.help": "Komut listesini göster",
    "palette.cmd.status": "Durum özetini göster",
    "palette.cmd.tasks": "Görevleri listele",
    "palette.cmd.approvals": "Bekleyen onayları listele",
    "palette.cmd.debt": "Borçları listele",
    "palette.cmd.decisions": "Kararları listele",
    "palette.cmd.skills": "Becerileri listele",
    "palette.cmd.providers": "Sağlayıcıları listele",
    "palette.cmd.capabilities": "Yetenekleri listele",
    "palette.cmd.refresh": "Verileri yenile",
    "palette.cmd.theme": "Tema değiştir",
    "palette.cmd.themeHint": "koyu, açık, sistem",
    "palette.cmd.panelOpen": "Genel bakış panelini aç",
    "palette.cmd.panelClose": "Genel bakış panelini kapat",
    "palette.cmd.newSession": "Yeni oturum",
    "palette.cmd.help2": "Yardım",
    "palette.cmd.settings": "Ayarları aç",
    "palette.cmd.sidebar": "Kenar çubuğunu aç/kapat",
    "palette.error.title": "Komut paleti çizilemedi",
    "palette.error.retry": "Yeniden dene"
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
      try { window.AM_REGISTER_TR("palette", TR); } catch (e) { /* kayıt tekrarı zararsız */ }
    }
  }
  registerTr();

  /* ---------- Saf mantık ---------- */
  var FOLD_MAP = {
    "İ": "i", "I": "i", "ı": "i",
    "ş": "s", "Ş": "s",
    "ğ": "g", "Ğ": "g",
    "ü": "u", "Ü": "u",
    "ö": "o", "Ö": "o",
    "ç": "c", "Ç": "c",
    "â": "a", "Â": "a",
    "î": "i", "Î": "i",
    "û": "u", "Û": "u"
  };
  var SEP_RE = /[\s\-_\/.:›]/;
  var GROUP_ORDER = ["topic", "command", "section", "capability"];
  // Yetenekler grubu boş sorguda GÖSTERİLMEZ (0): ad yazınca aranır; komut listesinde "/yetenekler" vardır.
  var CAP_EMPTY = { topic: 6, command: 8, section: 5, capability: 0 };
  var CAP_QUERY = 12;
  var TITLE_MAX = 120;

  var SETTINGS_SECTIONS = ["general", "providers", "security", "memory", "skills", "backup", "appearance", "system", "vault", "developer", "guide", "shortcuts", "commands", "safety", "manual"];
  var PROJECT_PAGES = ["general", "memory", "environment", "usage", "debug"];
  var SLASH = [
    ["/yardim", "help"], ["/yetenekler", "capabilities"], ["/durum", "status"], ["/gorevler", "tasks"], ["/onay", "approvals"], ["/borc", "debt"],
    ["/kararlar", "decisions"], ["/beceriler", "skills"], ["/saglayicilar", "providers"], ["/yenile", "refresh"]
  ];

  function foldChar(c) {
    if (Object.prototype.hasOwnProperty.call(FOLD_MAP, c)) return FOLD_MAP[c];
    var l = c.toLowerCase();
    if (l.length !== 1) l = l.charAt(0);
    var n = l.normalize("NFD");
    return n.length ? n.charAt(0) : l;
  }

  // Uzunluğu koruyan katlama: ı/İ/I → i, ş→s, ğ→g, ü→u, ö→o, ç→c, aksanlar atılır; dizinler özgün metinle aynı kalır.
  function fold(s) {
    var str = String(s === null || s === undefined ? "" : s);
    var out = "";
    for (var i = 0; i < str.length; i += 1) out += foldChar(str.charAt(i));
    return out;
  }

  function isSep(ch) { return SEP_RE.test(ch); }

  function range(start, len) {
    var a = [];
    for (var i = 0; i < len; i += 1) a.push(start + i);
    return a;
  }

  function tokenMatch(tok, hay) {
    if (!tok) return { score: 1, idx: [] };
    if (hay === tok) return { score: 1000, idx: range(0, hay.length) };
    var pos = hay.indexOf(tok);
    if (pos >= 0) {
      var ws = -1;
      var from = 0;
      var p = pos;
      while (p >= 0) {
        if (p === 0 || isSep(hay.charAt(p - 1))) { ws = p; break; }
        from = p + 1;
        p = hay.indexOf(tok, from);
      }
      if (ws === 0) return { score: 800, idx: range(0, tok.length) };
      if (ws > 0) return { score: 600 - Math.min(ws, 100), idx: range(ws, tok.length) };
      return { score: 400 - Math.min(pos, 100), idx: range(pos, tok.length) };
    }
    // sıralı altdizi
    var idx = [];
    var j = 0;
    var last = -2;
    var sc = 100;
    for (var i = 0; i < hay.length && j < tok.length; i += 1) {
      if (hay.charAt(i) === tok.charAt(j)) {
        idx.push(i);
        if (i === last + 1) sc += 6;
        if (i === 0 || isSep(hay.charAt(i - 1))) sc += 8;
        last = i;
        j += 1;
      }
    }
    if (j < tok.length) return null;
    sc -= Math.min(60, idx[idx.length - 1] - idx[0] + 1 - tok.length);
    if (sc < 1) sc = 1;
    return { score: sc, idx: idx };
  }

  // Sorgunun her boşlukla ayrılmış parçası metinde eşleşmeli; skorlar toplanır, 0 = eşleşme yok.
  function matchText(query, text) {
    var toks = fold(query).split(/\s+/).filter(function (t) { return t.length > 0; });
    if (!toks.length) return { score: 1, idx: [] };
    var hay = fold(text);
    var total = 0;
    var all = [];
    for (var i = 0; i < toks.length; i += 1) {
      var m = tokenMatch(toks[i], hay);
      if (!m) return { score: 0, idx: [] };
      total += m.score;
      all = all.concat(m.idx);
    }
    var seen = {};
    var uniq = [];
    for (var k = 0; k < all.length; k += 1) {
      if (!seen[all[k]]) { seen[all[k]] = true; uniq.push(all[k]); }
    }
    uniq.sort(function (a, b) { return a - b; });
    return { score: total, idx: uniq };
  }

  function score(query, text) { return matchText(query, text).score; }

  // Eşleşen dizinleri ardışık parçalara böler: [{t, hit}]
  function segments(text, idx) {
    var str = String(text === null || text === undefined ? "" : text);
    var hit = {};
    for (var i = 0; i < idx.length; i += 1) hit[idx[i]] = true;
    var out = [];
    var cur = "";
    var curHit = false;
    for (var j = 0; j < str.length; j += 1) {
      var h = !!hit[j];
      if (j === 0) { cur = str.charAt(0); curHit = h; continue; }
      if (h === curHit) { cur += str.charAt(j); } else { out.push({ t: cur, hit: curHit }); cur = str.charAt(j); curHit = h; }
    }
    if (str.length) out.push({ t: cur, hit: curHit });
    return out;
  }

  function cleanTitle(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, " ").replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
  }

  function buildItems(AM) {
    var items = [];
    var st = (AM && AM.state) || {};
    var v = (AM && AM.view) || {};
    var seen = {};
    var i;
    var list = Array.isArray(st.topics) ? st.topics : [];
    for (i = 0; i < list.length; i += 1) {
      var t = list[i];
      if (!t || typeof t.id !== "string" || !t.id) continue;
      var tt = cleanTitle(t.title);
      if (!tt) continue;
      seen[t.id] = true;
      items.push({ id: "t:" + t.id, group: "topic", icon: "chat", title: tt, hint: T("palette.hint.topic"), keywords: "", exec: { action: "selectTopic", args: [t.id] } });
    }
    var subs = Array.isArray(st.subsessions) ? st.subsessions : [];
    for (i = 0; i < subs.length; i += 1) {
      var s = subs[i];
      if (!s || typeof s.id !== "string" || !s.id || seen[s.id] || s.archived) continue;
      var sn = cleanTitle(s.name);
      if (!sn) continue;
      seen[s.id] = true;
      items.push({ id: "t:" + s.id, group: "topic", icon: "branch", title: sn, hint: T("palette.hint.topic"), keywords: cleanTitle(s.model), exec: { action: "selectTopic", args: [s.id] } });
    }
    for (i = 0; i < SETTINGS_SECTIONS.length; i += 1) {
      var sid = SETTINGS_SECTIONS[i];
      items.push({ id: "s:" + sid, group: "section", icon: "gear", title: T("palette.sec." + sid), hint: T("palette.hint.settings"), keywords: T("palette.hint.settings"), exec: { action: "openSettings", args: [sid] } });
    }
    for (i = 0; i < PROJECT_PAGES.length; i += 1) {
      var pid = PROJECT_PAGES[i];
      items.push({ id: "p:" + pid, group: "section", icon: "folder", title: T("palette.proj." + pid), hint: T("palette.hint.project"), keywords: T("palette.hint.project"), exec: { action: "openProjectSettings", args: [pid] } });
    }
    for (i = 0; i < SLASH.length; i += 1) {
      items.push({ id: "c:" + SLASH[i][0], group: "command", icon: "code", title: SLASH[i][0], hint: T("palette.cmd." + SLASH[i][1]), keywords: T("palette.cmd." + SLASH[i][1]), exec: { action: "command", args: [SLASH[i][0]] } });
    }
    // Yetenekler menüsü (katalog capabilities.js): yetenekler yalnız kullanıcı seçince açılır; kullanılamayanlar gri + nedeni (seçilemez).
    var caps = Array.isArray(window.AM_CAPABILITIES) ? window.AM_CAPABILITIES : [];
    var capApi = window.AM_CAPABILITIES_API;
    for (i = 0; i < caps.length; i += 1) {
      var ce = caps[i];
      if (!ce || typeof ce.ad !== "string" || !capApi) continue;
      var av = capApi.availability(AM, ce);
      var plabel = capApi.pageLabel(ce);
      items.push({ id: "k:" + ce.id, group: "capability", icon: "spark", title: cleanTitle(ce.ad), hint: av.ok ? (av.note ? plabel + " · " + av.note : plabel) : T("palette.cap.unavailable", { neden: av.reason }), keywords: plabel + " " + cleanTitle(ce.aciklama), disabled: !av.ok, reason: av.reason, cat: String(ce.sayfa), catLabel: plabel, exec: { action: "openCapability", args: [ce.id] } });
    }
    items.push({ id: "c:theme", group: "command", icon: "spark", title: T("palette.cmd.theme"), hint: "Ctrl+Shift+T", keywords: T("palette.cmd.themeHint"), exec: { shell: "cycleTheme" } });
    items.push({ id: "c:panel", group: "command", icon: "grid", title: v.panelOpen ? T("palette.cmd.panelClose") : T("palette.cmd.panelOpen"), hint: "Ctrl+.", keywords: "", exec: { action: "setView", args: [{ panelOpen: !v.panelOpen }] } });
    items.push({ id: "c:new", group: "command", icon: "plus", title: T("palette.cmd.newSession"), hint: "Ctrl+Shift+O", keywords: "", exec: { action: "setView", args: [{ newSession: true }] } });
    items.push({ id: "c:help", group: "command", icon: "help", title: T("palette.cmd.help2"), hint: "", keywords: "", exec: { action: "openSettings", args: ["help"] } });
    items.push({ id: "c:settings", group: "command", icon: "gear", title: T("palette.cmd.settings"), hint: "Ctrl+,", keywords: "", exec: { action: "openSettings", args: ["general"] } });
    items.push({ id: "c:sidebar", group: "command", icon: "sidebar", title: T("palette.cmd.sidebar"), hint: "Ctrl+B", keywords: "", exec: { shell: "toggleSidebar" } });
    return items;
  }

  function rankItems(items, query) {
    var q = String(query === null || query === undefined ? "" : query).trim();
    var out = [];
    var list = Array.isArray(items) ? items : [];
    for (var i = 0; i < list.length; i += 1) {
      var it = list[i];
      var sc;
      var idx = [];
      if (!q) {
        sc = 1;
      } else {
        var a = matchText(q, it.title);
        var b = it.keywords ? matchText(q, it.keywords) : { score: 0 };
        sc = Math.max(a.score, b.score * 0.6);
        if (a.score > 0) idx = a.idx;
      }
      if (sc > 0) out.push({ item: it, score: sc, idx: idx, order: i });
    }
    out.sort(function (x, y) { return y.score - x.score || x.order - y.order; });
    var counts = {};
    var capped = [];
    for (var k = 0; k < out.length; k += 1) {
      var g = out[k].item.group;
      var cap = q ? CAP_QUERY : (Object.prototype.hasOwnProperty.call(CAP_EMPTY, g) ? CAP_EMPTY[g] : 5);
      counts[g] = (counts[g] || 0) + 1;
      if (counts[g] <= cap) capped.push(out[k]);
    }
    return capped;
  }

  // Sıralı sonuçları gruplara böler; grup sırası: en iyi skor, eşitse GROUP_ORDER.
  function groupResults(ranked) {
    var map = {};
    var groups = [];
    for (var i = 0; i < ranked.length; i += 1) {
      // Yetenekler kategoriye (sayfaya) göre ayrı alt gruplara bölünür: "Yetenekler · Araştırma ve Kalibrasyon".
      var it = ranked[i].item;
      var g = it.group + (it.cat ? ":" + it.cat : "");
      if (!map[g]) { map[g] = { group: it.group, cat: it.cat || "", catLabel: it.catLabel || "", best: ranked[i].score, entries: [] }; groups.push(map[g]); }
      map[g].entries.push(ranked[i]);
      if (ranked[i].score > map[g].best) map[g].best = ranked[i].score;
    }
    groups.sort(function (a, b) {
      return b.best - a.best || GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
    });
    return groups;
  }

  function flatten(groups) {
    var flat = [];
    for (var i = 0; i < groups.length; i += 1) {
      for (var j = 0; j < groups[i].entries.length; j += 1) flat.push(groups[i].entries[j]);
    }
    return flat;
  }

  function moveIndex(i, n, key) {
    if (!(n > 0)) return -1;
    if (key === "Home") return 0;
    if (key === "End") return n - 1;
    var cur = typeof i === "number" && i >= 0 && i < n ? i : 0;
    if (key === "ArrowDown") return (cur + 1) % n;
    if (key === "ArrowUp") return (cur - 1 + n) % n;
    return cur;
  }

  // Seçilen öğenin hangi AM.actions çağrısına (ya da kabuk eylemine) dönüşeceği.
  function planFor(item) {
    if (!item || !item.exec || item.disabled === true) return null;
    var e = item.exec;
    if (e.shell === "cycleTheme" || e.shell === "toggleSidebar") return { shell: e.shell };
    var allowed = ["selectTopic", "openSettings", "openProjectSettings", "command", "setView", "openCapability"];
    if (allowed.indexOf(e.action) < 0) return null;
    return { action: e.action, args: Array.isArray(e.args) ? e.args : [] };
  }

  var pure = {
    fold: fold,
    score: score,
    matchText: matchText,
    segments: segments,
    buildItems: buildItems,
    rankItems: rankItems,
    groupResults: groupResults,
    flatten: flatten,
    moveIndex: moveIndex,
    planFor: planFor,
    SETTINGS_SECTIONS: SETTINGS_SECTIONS,
    PROJECT_PAGES: PROJECT_PAGES,
    T: T
  };

  /* ---------- Çalışma zamanı ---------- */
  var P = { AM: null, host: null, root: null, input: null, list: null, live: null, built: false, open: false, query: "", flat: [], active: 0, prevFocus: null, uid: 0 };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function icon(name, size) {
    if (typeof window.AM_ICON === "function") return window.AM_ICON(name, { size: size || 16 });
    var s = document.createElement("span");
    s.setAttribute("aria-hidden", "true");
    s.textContent = "•";
    return s;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function optId(i) { return "am-pal-opt-" + i; }

  function setActive(i, scroll) {
    var opts = P.list ? P.list.querySelectorAll("[role=option]") : [];
    for (var k = 0; k < opts.length; k += 1) {
      var on = k === i;
      opts[k].setAttribute("aria-selected", on ? "true" : "false");
      opts[k].className = "am-pal-opt" + (on ? " am-pal-opt--active" : "") + (opts[k].getAttribute("aria-disabled") === "true" ? " am-pal-opt--disabled" : "");
    }
    P.active = i;
    if (i >= 0 && i < opts.length) {
      P.input.setAttribute("aria-activedescendant", optId(i));
      if (scroll && typeof opts[i].scrollIntoView === "function") opts[i].scrollIntoView({ block: "nearest" });
    } else {
      P.input.removeAttribute("aria-activedescendant");
    }
  }

  function run(entry) {
    if (!entry) return;
    if (entry.item && entry.item.disabled === true) { P.live.textContent = T("palette.cap.unavailable", { neden: entry.item.reason || "" }); return; }
    var plan = planFor(entry.item);
    close(true);
    if (!plan) return;
    if (plan.shell) {
      var sh = window.AM_SHELL;
      if (sh && typeof sh[plan.shell] === "function") sh[plan.shell]();
      return;
    }
    var a = P.AM && P.AM.actions;
    if (a && typeof a[plan.action] === "function") a[plan.action].apply(a, plan.args);
  }

  function drawList(keepId) {
    var AM = P.AM;
    var ranked = rankItems(buildItems(AM), P.query);
    var groups = groupResults(ranked);
    var flat = flatten(groups);
    var prevId = keepId && P.flat[P.active] ? P.flat[P.active].item.id : null;
    P.flat = flat;
    clear(P.list);
    if (!flat.length) {
      P.list.appendChild(el("div", "am-pal-empty", T("palette.empty")));
      P.live.textContent = T("palette.empty");
      setActive(-1, false);
      return;
    }
    var n = 0;
    var active = 0;
    for (var gi = 0; gi < groups.length; gi += 1) {
      var g = groups[gi];
      var gid = "am-pal-g-" + gi;
      var box = el("div", "am-pal-group");
      box.setAttribute("role", "group");
      box.setAttribute("aria-labelledby", gid);
      var gh = el("div", "am-pal-gh", g.cat ? T("palette.group." + g.group) + " · " + g.catLabel : T("palette.group." + g.group));
      gh.id = gid;
      box.appendChild(gh);
      for (var ei = 0; ei < g.entries.length; ei += 1) {
        (function (entry, index) {
          var o = el("div", "am-pal-opt");
          o.id = optId(index);
          o.setAttribute("role", "option");
          o.setAttribute("aria-selected", "false");
          if (entry.item.disabled === true) { o.setAttribute("aria-disabled", "true"); o.className = "am-pal-opt am-pal-opt--disabled"; }
          o.appendChild(icon(entry.item.icon, 16));
          var title = el("span", "am-pal-title am-truncate");
          var segs = segments(entry.item.title, entry.idx);
          for (var si = 0; si < segs.length; si += 1) {
            if (segs[si].hit) title.appendChild(el("mark", "am-pal-hit", segs[si].t));
            else title.appendChild(document.createTextNode(segs[si].t));
          }
          o.appendChild(title);
          if (entry.item.hint) o.appendChild(el("span", "am-pal-hint am-truncate", entry.item.hint));
          o.addEventListener("mousemove", function () { if (P.active !== index) setActive(index, false); });
          o.addEventListener("click", function () { run(P.flat[index]); });
          box.appendChild(o);
          if (prevId && entry.item.id === prevId) active = index;
        })(g.entries[ei], n);
        n += 1;
      }
      P.list.appendChild(box);
    }
    P.live.textContent = T("palette.count", { n: flat.length });
    setActive(active, false);
  }

  function build() {
    var uid = P.uid += 1;
    var root = el("div", "am-overlay am-pal-overlay");
    root.setAttribute("data-owner", "palette");
    root.hidden = true;

    var back = el("div", "am-pal-backdrop");
    back.addEventListener("click", function () { close(true); });

    var panel = el("div", "am-pal");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", T("palette.title"));

    var head = el("div", "am-pal-head");
    head.appendChild(icon("search", 18));
    var input = document.createElement("input");
    input.type = "text";
    input.className = "am-pal-input";
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-label", T("palette.title"));
    input.setAttribute("aria-controls", "am-pal-list-" + uid);
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("maxlength", "80");
    input.setAttribute("placeholder", T("palette.placeholder"));
    head.appendChild(input);

    var list = el("div", "am-pal-list");
    list.id = "am-pal-list-" + uid;
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", T("palette.listLabel"));

    var foot = el("div", "am-pal-foot", T("palette.hints"));
    var live = el("div", "am-sr");
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");

    panel.appendChild(head);
    panel.appendChild(list);
    panel.appendChild(foot);
    panel.appendChild(live);
    root.appendChild(back);
    root.appendChild(panel);

    input.addEventListener("input", function () {
      P.query = input.value;
      drawList(false);
    });
    input.addEventListener("keydown", function (ev) {
      if (ev.isComposing) return;
      var k = ev.key;
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Home" || k === "End") {
        ev.preventDefault();
        var ni = moveIndex(P.active, P.flat.length, k);
        if (ni >= 0) setActive(ni, true);
      } else if (k === "Enter") {
        ev.preventDefault();
        run(P.flat[P.active]);
      } else if (k === "Escape") {
        ev.preventDefault();
        close(true);
      } else if (k === "Tab") {
        ev.preventDefault();
      }
    });

    P.root = root;
    P.input = input;
    P.list = list;
    P.live = live;
    P.built = true;
    var host = P.host || document.getElementById("overlayRoot") || document.body;
    host.appendChild(root);
  }

  function showError(err) {
    if (!P.root) return;
    P.built = false;
    var parent = P.root.parentNode;
    if (parent) parent.removeChild(P.root);
    P.root = null;
    P.open = false;
    var host = P.host || document.body;
    var box = el("div", "am-overlay am-pal-overlay");
    box.setAttribute("data-owner", "palette");
    var card = el("div", "am-card am-pal-error");
    card.setAttribute("role", "alert");
    card.appendChild(el("strong", "", T("palette.error.title")));
    var msg = err && err.message ? String(err.message) : String(err);
    card.appendChild(el("span", "am-truncate", msg.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 200)));
    var retry = el("button", "am-btn am-btn--primary", T("palette.error.retry"));
    retry.type = "button";
    retry.addEventListener("click", function () {
      if (box.parentNode) box.parentNode.removeChild(box);
      open(P.AM);
    });
    card.appendChild(retry);
    box.appendChild(card);
    host.appendChild(box);
  }

  function open(AM) {
    if (AM) P.AM = AM;
    try {
      if (!P.built) build();
      if (P.open) { P.input.focus(); return; }
      P.prevFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
      P.query = "";
      P.input.value = "";
      P.root.hidden = false;
      P.open = true;
      drawList(false);
      P.input.focus();
    } catch (e) {
      showError(e);
    }
  }

  function close(restoreFocus) {
    if (!P.open || !P.root) return;
    P.open = false;
    P.root.hidden = true;
    var pf = P.prevFocus;
    P.prevFocus = null;
    if (restoreFocus && pf && typeof pf.focus === "function" && document.contains(pf)) pf.focus();
  }

  function toggle(AM) {
    if (P.open) close(true); else open(AM);
  }

  function isOpen() { return !!P.open; }

  function init(AM, host) {
    P.AM = AM;
    P.host = host || null;
    registerTr();
  }

  function render(AM) {
    if (AM) P.AM = AM;
    if (!P.open) return;
    try {
      drawList(true);
    } catch (e) {
      showError(e);
    }
  }

  window.AM_PALETTE = { init: init, render: render, pure: pure, open: open, close: close, toggle: toggle, isOpen: isOpen };
})();
