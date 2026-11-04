/*
 * Sahip: Sonnet (bağlam halkası) [İP:AgentMom Faz 11, dilim 2]
 * yazan: [Claude#agentmom-faz11-dilim2-shell]
 * Amaç: window.AM_RING: #ringBtn içine aktif konunun bağlam doluluğunu halka olarak çizer; tıklayınca giriş kutusunun
 *       üstüne açılan bilgi penceresi (Bu konu / Sağlayıcı sınırları / Tüm proje kullanımı).
 * Sözleşme: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md (Ekran 7); güvenlik: docs/tasarim/arayuz-sozlesmesi.md.
 * Kurallar: UYDURMA YOK: veri yoksa "bilinmiyor"; sağlayıcı sınırı yalnız sağlayıcının kendi bildirdiği ve zaman damgalı
 *            değerlerle gösterilir. Otomatik gönderme/sıkıştırma/oturum açma YOK; yalnız kullanıcı tıklarsa eylem çağrılır.
 *            Sunucu verisi yalnız textContent; ağ yok (yalnız AM.actions.*); satır içi stil yok (yalnız CSS değişkeni ataması).
 * Test: saf mantık window.AM_RING.pure altında (shell.test.ts, node:vm).
 * Değiştirme: yalnız sahibi ya da ana oturum; Codex/Antigravity bu dosyayı değiştirmez.
 */
(function () {
  "use strict";

  var TR = {
    "ring.label": "Bağlam %{pct} dolu",
    "ring.labelUnknown": "Bağlam bilinmiyor",
    "ring.popLabel": "Bağlam kullanımı",
    "ring.unknown": "Bilinmiyor",
    "ring.sec.topic": "Bu konu",
    "ring.sec.limits": "Sağlayıcı sınırları",
    "ring.noTopic": "Konu seçilmedi",
    "ring.context": "Bağlam",
    "ring.contextValue": "{tokens} / {limit} token",
    "ring.topicTotal": "Konunun toplam kullanımı",
    "ring.tokenValue": "{tokens} token",
    "ring.share": "Projedeki payı",
    "ring.noCompaction": "Otomatik sıkıştırma yok. 150k civarında devir notu önerilir.",
    "ring.limitsUnknown": "Bilinmiyor: sağlayıcı bildirmedi",
    "ring.route": "Abonelik rotası · ücretli rota kapalı",
    "ring.limit.used": "Kullanım",
    "ring.limit.usedValue": "{used} / {limit}",
    "ring.limit.pct": "Doluluk",
    "ring.limit.reset": "Sıfırlanma",
    "ring.limit.source": "kaynak: sağlayıcı bildirimi, {time}",
    "ring.warn": "Bağlam dolmak üzere: devir notu hazırla",
    "ring.near": "Bağlam sınıra yaklaştı. Bu konuda devam etmek yerine yeni konuda devam edebilirsiniz.",
    "ring.newTopic": "Yeni konuda devam et",
    "ring.usage": "Tüm proje kullanımını gör →",
    "ring.error.title": "Bağlam bilgisi çizilemedi",
    "ring.error.retry": "Yeniden dene"
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
      try { window.AM_REGISTER_TR("ring", TR); } catch (e) { /* kayıt tekrarı zararsız */ }
    }
  }
  registerTr();

  /* ---------- Saf mantık ---------- */
  var DEFAULT_LIMIT = 150000;
  var WARN_AT = 60;   // sarı
  var HIGH_AT = 80;   // kırmızı + ünlem + devir notu çipi
  var NEAR_AT = 90;   // "yeni konuda devam et" önerisi (limitin %90'ı)
  var RADIUS = 11;
  var CIRC = 2 * Math.PI * RADIUS;
  var NS = "http://www.w3.org/2000/svg";

  function num(x) { return typeof x === "number" && isFinite(x) ? x : null; }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  // Önce ham token/limit; yoksa sunucunun verdiği yüzde (0-100). İkisi de yoksa bilinmiyor (uydurma yok).
  function compute(ctx) {
    var c = ctx && typeof ctx === "object" ? ctx : {};
    var lim = num(c.limit);
    var limit = lim !== null && lim > 0 ? lim : DEFAULT_LIMIT;
    var tk = num(c.tokens);
    var tokens = tk !== null && tk >= 0 ? Math.round(tk) : null;
    var raw = null;
    if (tokens !== null) raw = tokens / limit * 100;
    else if (num(c.pct) !== null && c.pct >= 0) raw = c.pct;
    if (raw === null) {
      return { known: false, pct: null, level: "unknown", tokens: null, limit: limit, warn80: false, near: false };
    }
    var pct = clamp(Math.round(raw), 0, 100);
    var level = pct >= HIGH_AT ? "high" : (pct >= WARN_AT ? "warn" : "ok");
    return {
      known: true,
      pct: pct,
      level: level,
      tokens: tokens,
      limit: limit,
      warn80: pct >= HIGH_AT,
      near: pct >= NEAR_AT || (tokens !== null && tokens >= limit * NEAR_AT / 100)
    };
  }

  function dash(c) {
    if (!c || !c.known) return "3 4";
    var d = Math.round(CIRC * c.pct / 100 * 100) / 100;
    return d + " " + (Math.round(CIRC * 100) / 100);
  }

  function label(c) {
    return c && c.known ? T("ring.label", { pct: c.pct }) : T("ring.labelUnknown");
  }

  function fmtInt(n) {
    var v = num(n);
    if (v === null) return T("ring.unknown");
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function fmtPct(n) {
    var v = num(n);
    if (v === null) return T("ring.unknown");
    var r = Math.round(v * 10) / 10;
    return "%" + String(r).replace(".", ",");
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function fmtTime(iso) {
    var t = typeof iso === "string" ? Date.parse(iso) : NaN;
    if (!isFinite(t)) return "";
    var d = new Date(t);
    return pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "." + d.getFullYear() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function usageRow(usage, topicId) {
    if (!usage || !Array.isArray(usage.topicsTable) || typeof topicId !== "string") return null;
    for (var i = 0; i < usage.topicsTable.length; i += 1) {
      var r = usage.topicsTable[i];
      if (r && r.id === topicId) return r;
    }
    return null;
  }

  function topicUsageTokens(usage, topicId) {
    var r = usageRow(usage, topicId);
    return r && num(r.tokens) !== null ? r.tokens : null;
  }

  function projectShare(usage, topicId) {
    var r = usageRow(usage, topicId);
    if (!r) return null;
    if (num(r.sharePct) !== null) return r.sharePct;
    if (num(r.tokens) === null) return null;
    var sum = 0;
    for (var i = 0; i < usage.topicsTable.length; i += 1) {
      var t = usage.topicsTable[i];
      if (!t || num(t.tokens) === null) return null;
      sum += t.tokens;
    }
    return sum > 0 ? r.tokens / sum * 100 : null;
  }

  function cleanText(s, max) {
    return String(s === null || s === undefined ? "" : s).replace(/[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, " ").replace(/\s+/g, " ").trim().slice(0, max || 60);
  }

  // YALNIZ sağlayıcının kendi bildirdiği (source === "provider") ve geçerli zaman damgası olan kayıtlar. Gerisi atılır.
  function verifiedLimits(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length; i += 1) {
      var e = list[i];
      if (!e || typeof e !== "object" || e.source !== "provider") continue;
      var name = cleanText(e.provider, 40);
      if (!name) continue;
      if (typeof e.at !== "string" || !isFinite(Date.parse(e.at))) continue;
      var used = num(e.used) !== null && e.used >= 0 ? e.used : null;
      var limit = num(e.limit) !== null && e.limit >= 0 ? e.limit : null;
      var pct = num(e.pct) !== null && e.pct >= 0 && e.pct <= 100 ? e.pct : null;
      var resetsAt = typeof e.resetsAt === "string" && isFinite(Date.parse(e.resetsAt)) ? e.resetsAt : null;
      if (used === null && limit === null && pct === null && resetsAt === null) continue;
      out.push({ provider: name, used: used, limit: limit, pct: pct, resetsAt: resetsAt, at: e.at });
    }
    return out;
  }

  function placement(rect, vw, vh, popW) {
    var r = rect || { left: 0, right: 0, top: 0 };
    var w = Math.min(popW, Math.max(200, vw - 16));
    var left = clamp(Math.round(r.right - w), 8, Math.max(8, vw - w - 8));
    var bottom = Math.max(8, Math.round(vh - r.top + 8));
    var maxH = Math.max(160, Math.round(r.top - 16));
    return { left: left, bottom: bottom, width: Math.round(w), maxH: maxH };
  }

  function selectedTopic(AM) {
    var v = (AM && AM.view) || {};
    var st = (AM && AM.state) || {};
    var id = v.selectedTopicId;
    if (typeof id !== "string" || !id) return null;
    var i;
    var tl = Array.isArray(st.topics) ? st.topics : [];
    for (i = 0; i < tl.length; i += 1) {
      if (tl[i] && tl[i].id === id) return { id: id, title: cleanText(tl[i].title, 120), provider: typeof tl[i].provider === "string" ? tl[i].provider : null };
    }
    var sl = Array.isArray(st.subsessions) ? st.subsessions : [];
    for (i = 0; i < sl.length; i += 1) {
      if (sl[i] && sl[i].id === id) return { id: id, title: cleanText(sl[i].name, 120), provider: typeof sl[i].provider === "string" ? sl[i].provider : null };
    }
    return { id: id, title: "", provider: null };
  }

  var pure = {
    DEFAULT_LIMIT: DEFAULT_LIMIT,
    WARN_AT: WARN_AT,
    HIGH_AT: HIGH_AT,
    NEAR_AT: NEAR_AT,
    CIRC: CIRC,
    compute: compute,
    dash: dash,
    label: label,
    fmtInt: fmtInt,
    fmtPct: fmtPct,
    fmtTime: fmtTime,
    usageRow: usageRow,
    topicUsageTokens: topicUsageTokens,
    projectShare: projectShare,
    verifiedLimits: verifiedLimits,
    placement: placement,
    selectedTopic: selectedTopic,
    T: T
  };

  /* ---------- Çalışma zamanı ---------- */
  var R = { AM: null, host: null, svg: null, parts: {}, pop: null, panel: null, open: false, sig: null, installed: false };
  var LEVEL_CLASSES = ["am-ring--ok", "am-ring--warn", "am-ring--high", "am-ring--unknown"];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    var keys = Object.keys(attrs || {});
    for (var i = 0; i < keys.length; i += 1) n.setAttribute(keys[i], String(attrs[keys[i]]));
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

  function act(name) {
    var a = R.AM && R.AM.actions;
    if (a && typeof a[name] === "function") return a[name].apply(a, Array.prototype.slice.call(arguments, 1));
    return undefined;
  }

  function buildSvg() {
    var svg = svgEl("svg", { viewBox: "0 0 28 28", width: 24, height: 24, class: "am-ring-svg", focusable: "false", "aria-hidden": "true" });
    var track = svgEl("circle", { cx: 14, cy: 14, r: RADIUS, fill: "none", "stroke-width": 3, class: "am-ring-track" });
    var fillC = svgEl("circle", { cx: 14, cy: 14, r: RADIUS, fill: "none", "stroke-width": 3, "stroke-linecap": "round", transform: "rotate(-90 14 14)", class: "am-ring-fill" });
    var spin = svgEl("circle", { cx: 14, cy: 14, r: RADIUS + 2, fill: "none", "stroke-width": 1.5, "stroke-linecap": "round", "stroke-dasharray": "14 56", class: "am-ring-spin", visibility: "hidden" });
    var bang = svgEl("g", { class: "am-ring-bang", visibility: "hidden", "stroke-width": 2.4, "stroke-linecap": "round", fill: "none" });
    bang.appendChild(svgEl("line", { x1: 14, y1: 8.5, x2: 14, y2: 15 }));
    bang.appendChild(svgEl("line", { x1: 14, y1: 19, x2: 14, y2: 19.01 }));
    svg.appendChild(track);
    svg.appendChild(fillC);
    svg.appendChild(spin);
    svg.appendChild(bang);
    var pctEl = el("span", "am-ring-pct");
    pctEl.setAttribute("aria-hidden", "true");
    R.host.appendChild(svg);
    R.host.appendChild(pctEl);
    R.svg = svg;
    R.parts = { fill: fillC, spin: spin, bang: bang, pct: pctEl };
  }

  function drawButton() {
    var AM = R.AM;
    var host = R.host;
    if (!host) return;
    if (!R.svg || !host.contains(R.svg)) { clear(host); buildSvg(); }
    var st = (AM && AM.state) || {};
    var c = compute(st.ctx);
    for (var i = 0; i < LEVEL_CLASSES.length; i += 1) host.classList.remove(LEVEL_CLASSES[i]);
    host.classList.add("am-ring--" + c.level);
    var busy = !!st.busy;
    if (busy) host.classList.add("am-ring--busy"); else host.classList.remove("am-ring--busy");
    host.setAttribute("aria-busy", busy ? "true" : "false");
    R.parts.fill.setAttribute("stroke-dasharray", dash(c));
    R.parts.spin.setAttribute("visibility", busy ? "visible" : "hidden");
    R.parts.bang.setAttribute("visibility", c.known && c.level === "high" ? "visible" : "hidden");
    R.parts.pct.textContent = c.known ? c.pct + "%" : "–";
    var lab = label(c);
    host.setAttribute("aria-label", lab);
    host.title = lab;
  }

  /* --- açılır pencere --- */
  function focusables() {
    return R.panel ? Array.prototype.slice.call(R.panel.querySelectorAll("button:not([disabled])")) : [];
  }

  function place() {
    if (!R.pop || !R.host) return;
    var rect = R.host.getBoundingClientRect();
    var p = placement(rect, window.innerWidth, window.innerHeight, 360);
    R.pop.style.setProperty("--am-ring-left", p.left + "px");
    R.pop.style.setProperty("--am-ring-bottom", p.bottom + "px");
    R.pop.style.setProperty("--am-ring-w", p.width + "px");
    R.pop.style.setProperty("--am-ring-maxh", p.maxH + "px");
  }

  function row(parent, k, v) {
    var r = el("div", "am-ring-row");
    r.appendChild(el("span", "am-ring-k", k));
    r.appendChild(el("span", "am-ring-v", v));
    parent.appendChild(r);
    return r;
  }

  function section(title) {
    var s = el("section", "am-ring-sec");
    s.appendChild(el("h3", "am-ring-h", title));
    return s;
  }

  function popData() {
    var AM = R.AM;
    var st = (AM && AM.state) || {};
    var topic = selectedTopic(AM);
    var c = compute(st.ctx);
    return {
      c: c,
      topic: topic,
      topicTokens: topic ? topicUsageTokens(st.usage, topic.id) : null,
      share: topic ? projectShare(st.usage, topic.id) : null,
      limits: verifiedLimits(st.providerLimits)
    };
  }

  function drawPopover(force) {
    var d = popData();
    var sig = JSON.stringify(d) + (typeof window.AM_LANG === "function" ? window.AM_LANG() : "tr");
    if (!force && sig === R.sig && R.panel) return;
    var hadFocus = R.panel && R.panel.contains(document.activeElement);
    R.sig = sig;
    clear(R.pop);
    var panel = el("div", "am-ring-pop");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", T("ring.popLabel"));
    panel.tabIndex = -1;
    R.panel = panel;
    var c = d.c;

    if (c.warn80) {
      var chip = el("div", "am-ring-alert");
      chip.appendChild(icon("alert", 16));
      var b1 = el("button", "am-btn am-ring-chipbtn", T("ring.warn"));
      b1.type = "button";
      b1.addEventListener("click", function () {
        act("setView", { focusComposer: true, draft: "devir notu" });
        closePop(false);
      });
      chip.appendChild(b1);
      panel.appendChild(chip);
    }
    if (c.near) {
      var near = el("div", "am-ring-alert");
      near.appendChild(el("p", "am-ring-note", T("ring.near")));
      if (d.topic && d.topic.provider) {
        var b2 = el("button", "am-btn am-ring-chipbtn", T("ring.newTopic"));
        b2.type = "button";
        b2.addEventListener("click", function () {
          act("createSubsession", { provider: d.topic.provider, roleHint: "Devam" });
          closePop(false);
        });
        near.appendChild(b2);
      }
      panel.appendChild(near);
    }

    var s1 = section(T("ring.sec.topic"));
    s1.appendChild(el("div", "am-ring-topic am-truncate", d.topic && d.topic.title ? d.topic.title : T("ring.noTopic")));
    row(s1, T("ring.context"), c.known && c.tokens !== null ? T("ring.contextValue", { tokens: fmtInt(c.tokens), limit: fmtInt(c.limit) }) : (c.known ? fmtPct(c.pct) : T("ring.unknown")));
    if (c.known) {
      var bar = document.createElement("progress");
      bar.className = "am-ring-bar am-ring-bar--" + c.level;
      bar.max = 100;
      bar.value = c.pct;
      bar.setAttribute("aria-label", label(c));
      s1.appendChild(bar);
    } else {
      s1.appendChild(el("div", "am-ring-bar-unknown", T("ring.unknown")));
    }
    row(s1, T("ring.topicTotal"), d.topicTokens !== null ? T("ring.tokenValue", { tokens: fmtInt(d.topicTokens) }) : T("ring.unknown"));
    row(s1, T("ring.share"), d.share !== null ? fmtPct(d.share) : T("ring.unknown"));
    s1.appendChild(el("p", "am-ring-note", T("ring.noCompaction")));
    panel.appendChild(s1);

    var s2 = section(T("ring.sec.limits"));
    if (!d.limits.length) {
      s2.appendChild(el("p", "am-ring-note", T("ring.limitsUnknown")));
    } else {
      for (var i = 0; i < d.limits.length; i += 1) {
        var L = d.limits[i];
        var box = el("div", "am-ring-limit");
        box.appendChild(el("div", "am-ring-limit-name am-truncate", L.provider));
        if (L.used !== null && L.limit !== null) row(box, T("ring.limit.used"), T("ring.limit.usedValue", { used: fmtInt(L.used), limit: fmtInt(L.limit) }));
        if (L.pct !== null) row(box, T("ring.limit.pct"), fmtPct(L.pct));
        if (L.resetsAt) row(box, T("ring.limit.reset"), fmtTime(L.resetsAt));
        box.appendChild(el("div", "am-ring-source", T("ring.limit.source", { time: fmtTime(L.at) })));
        s2.appendChild(box);
      }
    }
    s2.appendChild(el("p", "am-ring-route", T("ring.route")));
    panel.appendChild(s2);

    var s3 = el("div", "am-ring-foot");
    var more = el("button", "am-btn am-btn--ghost am-ring-more", T("ring.usage"));
    more.type = "button";
    more.addEventListener("click", function () {
      act("openProjectSettings", "usage");
      closePop(false);
    });
    s3.appendChild(more);
    panel.appendChild(s3);

    panel.addEventListener("keydown", function (ev) {
      var k = ev.key;
      if (k !== "ArrowDown" && k !== "ArrowUp" && k !== "Home" && k !== "End") return;
      var f = focusables();
      if (!f.length) return;
      ev.preventDefault();
      var i2 = f.indexOf(document.activeElement);
      var ni = k === "Home" ? 0 : (k === "End" ? f.length - 1 : (k === "ArrowDown" ? (i2 + 1) % f.length : (i2 - 1 + f.length) % f.length));
      f[ni].focus();
    });
    R.pop.appendChild(panel);
    place();
    if (hadFocus) panel.focus();
  }

  function popError(err) {
    if (!R.pop) return;
    clear(R.pop);
    R.panel = null;
    R.sig = null;
    var card = el("div", "am-card am-ring-pop");
    card.setAttribute("role", "alert");
    card.appendChild(el("strong", "", T("ring.error.title")));
    var msg = err && err.message ? String(err.message) : String(err);
    card.appendChild(el("span", "am-truncate", msg.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 200)));
    var retry = el("button", "am-btn am-btn--primary", T("ring.error.retry"));
    retry.type = "button";
    retry.addEventListener("click", function () {
      try { drawPopover(true); } catch (e2) { popError(e2); }
    });
    card.appendChild(retry);
    R.pop.appendChild(card);
  }

  function ensurePop() {
    if (R.pop) return;
    var pop = el("div", "am-overlay am-ring-overlay");
    pop.setAttribute("data-owner", "ring");
    pop.hidden = true;
    var root = document.getElementById("overlayRoot") || document.body;
    root.appendChild(pop);
    R.pop = pop;
  }

  function openPop() {
    ensurePop();
    R.open = true;
    R.pop.hidden = false;
    R.host.setAttribute("aria-expanded", "true");
    try { drawPopover(true); } catch (e) { popError(e); }
    place();
    if (R.panel) R.panel.focus();
  }

  function closePop(restoreFocus) {
    if (!R.open) return;
    R.open = false;
    if (R.pop) R.pop.hidden = true;
    R.host.setAttribute("aria-expanded", "false");
    if (restoreFocus && typeof R.host.focus === "function") R.host.focus();
  }

  function togglePop() {
    if (R.open) closePop(false); else openPop();
  }

  function install() {
    if (R.installed) return;
    R.installed = true;
    document.addEventListener("keydown", function (ev) {
      if (R.open && ev.key === "Escape" && !ev.defaultPrevented) {
        ev.preventDefault();
        closePop(true);
      }
    }, true);
    document.addEventListener("pointerdown", function (ev) {
      if (!R.open) return;
      var t = ev.target;
      if (R.pop && R.pop.contains(t)) return;
      if (R.host && R.host.contains(t)) return;
      closePop(false);
    });
    window.addEventListener("resize", function () { if (R.open) place(); });
  }

  function init(AM, host) {
    R.AM = AM;
    R.host = host || document.getElementById("ringBtn");
    registerTr();
    if (!R.host) return;
    var h = R.host;
    h.setAttribute("aria-haspopup", "dialog");
    h.setAttribute("aria-expanded", "false");
    if (h.tagName !== "BUTTON") {
      h.setAttribute("role", "button");
      h.tabIndex = 0;
      h.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          togglePop();
        }
      });
    } else if (!h.getAttribute("type")) {
      h.type = "button";
    }
    h.addEventListener("click", function (ev) {
      ev.preventDefault();
      togglePop();
    });
    install();
  }

  function render(AM) {
    if (AM) R.AM = AM;
    if (!R.host) return;
    try {
      drawButton();
    } catch (e) {
      clear(R.host);
      R.svg = null;
      var s = el("span", "am-ring-fail", "!");
      s.setAttribute("role", "alert");
      s.setAttribute("aria-label", T("ring.error.title"));
      R.host.appendChild(s);
      return;
    }
    if (R.open) {
      try { drawPopover(false); } catch (e2) { popError(e2); }
    }
  }

  window.AM_RING = { init: init, render: render, pure: pure, open: openPop, close: closePop };
})();
