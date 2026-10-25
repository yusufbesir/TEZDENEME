/*
 * Sahip: Sonnet (D3 sayfası: Kullanım ve Maliyetler) [İP:AgentMom Faz 11, D3]
 * yazan: [Claude#agentmom-faz11-d3-saglayicilar]
 * Amaç: window.AM_PAGES.register("usage", {title, group, render(AM, root, param)}). AM.state.usage özeti: toplam token, konu sayısı, önbellek isabeti,
 *       kod değişiklikleri, kısa model dökümü ve en çok token harcayan 5 konu. Ayrıntılı döküm 'Proje ayarları > Kullanım' sayfasındadır
 *       (AM.actions.openProjectSettings('usage')).
 * Dürüstlük kuralı: ÜCRET/FİYAT GÖSTERİLMEZ (costBasis=list; ücret yok, abonelik rotası). Veri yoksa (null) '—' ve 'veri yok'; tahmin, süre ya da limit
 *       penceresi uydurulmaz. Sayılar tr-TR biçimindedir (1,9 Mr, %96).
 * Güvenlik: sunucu verisi yalnız textContent; HTML dizesi ataması, satır içi stil/olay, dış kaynak, tarayıcı depolaması, ağ isteği YOK.
 *       Veri yalnız AM.actions.loadUsage ile istenir. Stiller page-providers.css (yalnız var(--am-*)).
 * Değiştirme: yalnız sahibi ya da ana oturum. Yüklenirken DOM'a dokunmaz; saf mantık window.AM_PAGE_USAGE.pure altındadır.
 */
(function () {
  "use strict";

  if (!window.AM_PAGES || typeof window.AM_PAGES.register !== "function") {
    throw new Error("page-usage.js: sayfa çerçevesi (pages.js, window.AM_PAGES) yüklenmedi; kullanım sayfası çizilemez.");
  }
  if (typeof window.AM_REGISTER_TR !== "function") {
    throw new Error("page-usage.js: strings.js (AM_REGISTER_TR) yüklenmedi.");
  }

  var TR = {
    "page-usage.title": "Kullanım ve Maliyetler",
    "page-usage.intro": "Bu projedeki token kullanımı ve kod değişikliklerinin kısa özeti. Veri yoksa — ve “veri yok” yazılır; hiçbir değer tahmin edilmez.",
    "page-usage.priceNote": "Ücret ya da fiyat gösterilmez: costBasis=list; ücret yok, abonelik rotası. Liste fiyatı yalnız bilgidir, ödeme yoktur.",
    "page-usage.serverNote": "Sunucu notu: {note}",
    "page-usage.abbr": "Kısaltmalar: K = bin, M = milyon, Mr = milyar.",
    "page-usage.na": "—",
    "page-usage.noData": "veri yok",
    "page-usage.updated": "Güncelleme: {t}",
    "page-usage.loading": "Kullanım verisi yükleniyor…",
    "page-usage.errTitle": "Kullanım verisi alınamadı",
    "page-usage.errBody": "Sunucudan kullanım özeti okunamadı. Hiçbir değer uydurulmadı. Neden: {reason}",
    "page-usage.retry": "Yeniden dene",
    "page-usage.emptyTitle": "Henüz kayıt yok",
    "page-usage.emptyBody": "Bu proje için kayıtlı kullanım verisi bulunmuyor.",
    "page-usage.err.title": "Bu sayfa çizilemedi",
    "page-usage.err.detail": "Ayrıntı: {reason}",

    "page-usage.sum.title": "Özet",
    "page-usage.sum.label": "Kullanım özeti",
    "page-usage.sum.tokens": "Toplam token",
    "page-usage.sum.topics": "Konu sayısı",
    "page-usage.sum.cache": "Önbellek isabeti",
    "page-usage.sum.code": "Kod değişiklikleri",
    "page-usage.sum.codeValue": "{added} satır eklendi, {removed} satır silindi",
    "page-usage.sum.tokensExact": "{n} token",
    "page-usage.kind.input": "Girdi",
    "page-usage.kind.output": "Çıktı",
    "page-usage.kind.cacheWrite": "Önbelleğe yazma",
    "page-usage.kind.cacheRead": "Önbellek okuma",
    "page-usage.kinds.label": "Token türleri",

    "page-usage.models.title": "Model dökümü",
    "page-usage.models.caption": "Modele göre token kullanımı (kısa)",
    "page-usage.models.model": "Model",
    "page-usage.models.tokens": "Token (toplam)",
    "page-usage.models.topics": "Konu sayısı",
    "page-usage.models.none": "Model dökümü için veri yok.",
    "page-usage.models.unknown": "Model bilinmiyor",

    "page-usage.top.title": "En çok token harcayan konular",
    "page-usage.top.caption": "En çok token harcayan ilk 5 konu",
    "page-usage.top.topic": "Konu",
    "page-usage.top.model": "Model",
    "page-usage.top.tokens": "Token",
    "page-usage.top.share": "Paylaş %",
    "page-usage.top.none": "Konu tablosu için veri yok.",

    "page-usage.open": "Ayrıntılı kullanım sayfasını aç",
    "page-usage.openHint": "Döküm tablosu, tüm konular ve sıralama seçenekleri Proje ayarları > Kullanım sayfasındadır.",
    "page-usage.refresh": "Kullanımı yenile"
  };

  window.AM_REGISTER_TR("page-usage", TR);

  function T(key, vars) {
    try { return String(window.AM_T(key, vars)); } catch (e) { return "⟦" + key + "⟧"; }
  }

  // ------------------------------------------------------------------ saf mantık
  var DASH = "—";
  var KINDS = ["input", "output", "cacheWrite", "cacheRead"];

  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function str(v, max) {
    var s = v == null ? "" : String(v);
    s = s.replace(/[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, " ");
    var lim = max || 300;
    return s.length > lim ? s.slice(0, lim - 1) + "…" : s;
  }
  function arr(v, max) { return Array.isArray(v) ? v.slice(0, max || 500) : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }

  function fmtInt(n) {
    if (!isNum(n)) return DASH;
    var r = Math.round(n);
    var s = String(Math.abs(r));
    var out = "";
    for (var i = 0; i < s.length; i += 1) {
      if (i > 0 && (s.length - i) % 3 === 0) out += ".";
      out += s.charAt(i);
    }
    return (r < 0 ? "-" : "") + out;
  }

  function fmtDec(x, digits) {
    var f = Math.pow(10, digits);
    var r = Math.round(Math.abs(x) * f) / f;
    var s = r.toFixed(digits).replace(".", ",");
    if (digits > 0) s = s.replace(/,0+$/, "");
    return (x < 0 && r !== 0 ? "-" : "") + s;
  }

  // K = bin, M = milyon, Mr = milyar; 1.940.000 -> "1,9 M"
  function fmtCompact(n) {
    if (!isNum(n)) return DASH;
    var a = Math.abs(n);
    var units = [[1e9, "Mr"], [1e6, "M"], [1e3, "K"]];
    for (var i = 0; i < units.length; i += 1) {
      var u = units[i];
      if (a >= u[0]) {
        var scaled = n / u[0];
        var txt = Math.abs(scaled) < 100 ? fmtDec(scaled, 1) : fmtDec(scaled, 0);
        if ((txt === "1.000" || txt === "1000") && i > 0) return fmtDec(n / units[i - 1][0], 1) + " " + units[i - 1][1];
        return txt + " " + u[1];
      }
    }
    return fmtInt(n);
  }

  function fmtPct(p) {
    if (!isNum(p)) return DASH;
    if (p <= 0) return "%0";
    if (p < 1) return "<%1";
    return "%" + (p < 10 ? fmtDec(p, 1) : fmtDec(p, 0));
  }

  function pad2(n) { return n < 10 ? "0" + n : String(n); }
  function fmtDateTime(iso) {
    var t = Date.parse(String(iso == null ? "" : iso));
    if (!isFinite(t)) return DASH;
    var d = new Date(t);
    return pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "." + d.getFullYear() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function sumKnown(list) {
    var any = false;
    var sum = 0;
    list.forEach(function (v) { if (isNum(v)) { any = true; sum += v; } });
    return any ? sum : null;
  }

  function totalTokens(u) {
    var tk = obj(obj(u).tokens);
    return sumKnown(KINDS.map(function (k) { return tk[k]; }));
  }

  function isEmptyUsage(u) {
    var x = obj(u);
    var noTopics = !isNum(x.topics) || x.topics === 0;
    var noTable = !Array.isArray(x.topicsTable) || x.topicsTable.length === 0;
    var tk = obj(x.tokens);
    var cc = obj(x.codeChanges);
    var noTokens = !KINDS.some(function (k) { return isNum(tk[k]); });
    var noCode = !(isNum(cc.added) || isNum(cc.removed));
    var noModels = !Array.isArray(x.byModel) || x.byModel.length === 0;
    return noTopics && noTable && noTokens && noCode && noModels;
  }

  // undefined/null -> 'none' (henüz istenmedi); status:loading; error; boş; ok
  function usageStatus(u) {
    if (u === undefined || u === null) return "none";
    if (typeof u !== "object") return "error";
    if (u.status === "loading") return "loading";
    if (u.status === "error" || u.error) return "error";
    if (isEmptyUsage(u)) return "empty";
    return "ok";
  }

  function modelBreakdown(u) {
    return arr(obj(u).byModel, 50).map(function (m) {
      var o = obj(m);
      return { model: typeof o.model === "string" && o.model.trim() ? str(o.model, 100) : null, tokens: sumKnown(KINDS.map(function (k) { return o[k]; })), topics: isNum(o.topics) ? o.topics : null };
    }).sort(function (a, b) {
      if (a.tokens === null && b.tokens !== null) return 1;
      if (b.tokens === null && a.tokens !== null) return -1;
      if (a.tokens !== null && b.tokens !== null && a.tokens !== b.tokens) return b.tokens - a.tokens;
      return String(a.model).localeCompare(String(b.model));
    });
  }

  // topicsTable içinden en çok token harcayan ilk n konu; token bilinmeyenler sona.
  function topTopics(rows, n) {
    var list = arr(rows, 500).map(function (r, i) {
      var o = obj(r);
      return {
        id: str(o.id, 64), title: str(o.title, 300), model: typeof o.model === "string" && o.model.trim() ? str(o.model, 100) : null,
        tokens: isNum(o.tokens) ? o.tokens : null, sharePct: isNum(o.sharePct) ? o.sharePct : null, i: i
      };
    });
    list.sort(function (a, b) {
      if (a.tokens === null && b.tokens === null) return a.i - b.i;
      if (a.tokens === null) return 1;
      if (b.tokens === null) return -1;
      return b.tokens - a.tokens || a.i - b.i;
    });
    return list.slice(0, isNum(n) ? n : 5);
  }

  function sigOf(AM, requested) {
    try { var st = AM && AM.state ? AM.state : {}; return JSON.stringify([st.usage, requested === true, (typeof window !== "undefined" && typeof window.AM_LANG === "function" ? window.AM_LANG() : "tr")]); } catch (e) { return "?" + Math.random(); }
  }

  var pure = {
    fmtInt: fmtInt, fmtCompact: fmtCompact, fmtPct: fmtPct, fmtDateTime: fmtDateTime, sumKnown: sumKnown, totalTokens: totalTokens,
    isEmptyUsage: isEmptyUsage, usageStatus: usageStatus, modelBreakdown: modelBreakdown, topTopics: topTopics, sigOf: sigOf, KINDS: KINDS
  };

  // ------------------------------------------------------------------ DOM yardımcıları
  var TONE_ICON = { ok: "check", warn: "alert", bad: "x", info: "info", muted: "dot" };
  var TONES = ["ok", "warn", "bad", "info", "muted"];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }

  function icon(name, size) {
    try {
      if (typeof window.AM_ICON === "function") return window.AM_ICON(name, { size: size || 16 });
    } catch (e) { /* simge yoksa metin yeter */ }
    return document.createTextNode("");
  }

  function act(AM, name, args) {
    var a = AM && AM.actions;
    if (!a || typeof a[name] !== "function") return false;
    try {
      var r = a[name].apply(a, args || []);
      if (r && typeof r.then === "function") r.then(null, function () { /* çekirdek hatayı kendisi gösterir */ });
    } catch (e) { return false; }
    return true;
  }

  var S = { lastRoot: null, lastSig: "", usageRequested: false, started: false };

  function btn(label, onClick, fkey) {
    var b = el("button", "am-pp-btn", label);
    b.type = "button";
    if (fkey) b.setAttribute("data-fkey", fkey);
    b.addEventListener("click", onClick);
    return b;
  }

  function section(parent, title) {
    var s = el("section", "am-pp-sec");
    s.appendChild(el("h3", "am-pp-h3", title));
    parent.appendChild(s);
    return s;
  }

  function note(parent, text, tone) {
    var t = TONES.indexOf(tone) >= 0 ? tone : "info";
    var n = el("div", "am-pp-note am-pp-note--" + t);
    n.appendChild(icon(TONE_ICON[t], 16));
    n.appendChild(el("span", "am-pp-note-t", text));
    parent.appendChild(n);
    return n;
  }

  function skeleton(parent, text) {
    var s = el("div", "am-pp-skel");
    s.setAttribute("role", "status");
    s.setAttribute("aria-busy", "true");
    s.appendChild(el("div", "am-pp-skel-line"));
    s.appendChild(el("div", "am-pp-skel-line am-pp-skel-line--short"));
    s.appendChild(el("span", "am-pp-skel-t", text));
    parent.appendChild(s);
    return s;
  }

  function errorCard(parent, title, detail, onRetry) {
    var c = el("div", "am-pp-err");
    c.setAttribute("role", "alert");
    c.appendChild(icon("alert", 18));
    var body = el("div", "am-pp-err-body");
    body.appendChild(el("strong", "am-pp-err-title", title));
    if (detail) body.appendChild(el("p", "am-pp-err-detail", detail));
    if (onRetry) body.appendChild(btn(T("page-usage.retry"), onRetry, "retry"));
    c.appendChild(body);
    parent.appendChild(c);
    return c;
  }

  function makeTable(caption, heads, rows, rightFrom) {
    var wrap = el("div", "am-pp-tablewrap");
    var t = el("table", "am-pp-table");
    t.appendChild(el("caption", "am-pp-sr", caption));
    var thead = el("thead");
    var hr = el("tr");
    heads.forEach(function (h, i) {
      var th = el("th", "am-pp-th" + (rightFrom !== undefined && i >= rightFrom ? " am-pp-th--right" : ""), h);
      th.setAttribute("scope", "col");
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    t.appendChild(thead);
    var tb = el("tbody");
    rows.forEach(function (cells) {
      var tr = el("tr");
      cells.forEach(function (cell, ci) {
        var right = rightFrom !== undefined && ci >= rightFrom ? " am-pp-td--right" : "";
        var c = ci === 0 ? el("th", "am-pp-td am-pp-td--head") : el("td", "am-pp-td" + right);
        if (ci === 0) c.setAttribute("scope", "row");
        c.textContent = String(cell == null ? "" : cell);
        tr.appendChild(c);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    return wrap;
  }

  function activeKey(root) {
    try {
      var a = document.activeElement;
      if (a && typeof root.contains === "function" && root.contains(a) && typeof a.getAttribute === "function") return a.getAttribute("data-fkey");
    } catch (e) { /* odak okunamadı */ }
    return null;
  }

  function restoreFocus(root, key) {
    if (!key) return;
    try {
      var nodes = root.querySelectorAll("[data-fkey]");
      for (var i = 0; i < nodes.length; i += 1) {
        if (nodes[i].getAttribute("data-fkey") === key) { nodes[i].focus(); return; }
      }
    } catch (e) { /* odak geri verilemedi */ }
  }

  function stat(parent, label, value, sub) {
    var c = el("div", "am-pp-stat");
    c.appendChild(el("div", "am-pp-stat-k", label));
    c.appendChild(el("div", "am-pp-stat-v", value));
    if (sub) c.appendChild(el("div", "am-pp-stat-s", sub));
    parent.appendChild(c);
    return c;
  }

  function reload(AM) { S.usageRequested = true; S.lastSig = ""; act(AM, "loadUsage", []); }

  function buildBody(AM, page, usage) {
    var status = usageStatus(usage);
    if (status === "none" || status === "loading") { skeleton(page, T("page-usage.loading")); return; }
    if (status === "error") {
      errorCard(page, T("page-usage.errTitle"), T("page-usage.errBody", { reason: str(obj(usage).reason || DASH, 200) }), function () { reload(AM); });
      return;
    }
    if (status === "empty") {
      var e = el("div", "am-pp-empty");
      e.appendChild(el("strong", "am-pp-empty-t", T("page-usage.emptyTitle")));
      e.appendChild(el("p", "am-pp-empty-d", T("page-usage.emptyBody")));
      page.appendChild(e);
      return;
    }

    var u = obj(usage);
    // Özet
    var sec = section(page, T("page-usage.sum.title"));
    var grid = el("div", "am-pp-stats");
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", T("page-usage.sum.label"));
    var total = totalTokens(u);
    stat(grid, T("page-usage.sum.tokens"), total === null ? DASH : fmtCompact(total), total === null ? T("page-usage.noData") : T("page-usage.sum.tokensExact", { n: fmtInt(total) }));
    stat(grid, T("page-usage.sum.topics"), fmtInt(isNum(u.topics) ? u.topics : null), isNum(u.topics) ? "" : T("page-usage.noData"));
    stat(grid, T("page-usage.sum.cache"), fmtPct(isNum(u.cacheHitPct) ? u.cacheHitPct : null), isNum(u.cacheHitPct) ? "" : T("page-usage.noData"));
    var cc = obj(u.codeChanges);
    var hasCode = isNum(cc.added) && isNum(cc.removed);
    stat(grid, T("page-usage.sum.code"), hasCode ? "+" + fmtInt(cc.added) + " −" + fmtInt(cc.removed) : DASH,
      hasCode ? T("page-usage.sum.codeValue", { added: fmtInt(cc.added), removed: fmtInt(cc.removed) }) : T("page-usage.noData"));
    sec.appendChild(grid);

    var tk = obj(u.tokens);
    var kinds = el("ul", "am-pp-kinds");
    kinds.setAttribute("aria-label", T("page-usage.kinds.label"));
    KINDS.forEach(function (k) {
      var li = el("li", "am-pp-kind");
      li.appendChild(el("span", "am-pp-kind-k", T("page-usage.kind." + k)));
      li.appendChild(el("span", "am-pp-kind-v", isNum(tk[k]) ? fmtInt(tk[k]) : DASH + " (" + T("page-usage.noData") + ")"));
      kinds.appendChild(li);
    });
    sec.appendChild(kinds);
    if (u.updatedAt) sec.appendChild(el("p", "am-pp-muted", T("page-usage.updated", { t: fmtDateTime(u.updatedAt) })));
    sec.appendChild(el("p", "am-pp-muted", T("page-usage.abbr")));

    // Model dökümü
    var mSec = section(page, T("page-usage.models.title"));
    var models = modelBreakdown(u);
    if (!models.length) mSec.appendChild(el("p", "am-pp-muted", T("page-usage.models.none")));
    else mSec.appendChild(makeTable(T("page-usage.models.caption"),
      [T("page-usage.models.model"), T("page-usage.models.tokens"), T("page-usage.models.topics")],
      models.map(function (m) { return [m.model !== null ? m.model : T("page-usage.models.unknown"), m.tokens === null ? DASH : fmtInt(m.tokens), m.topics === null ? DASH : fmtInt(m.topics)]; }), 1));

    // En çok token harcayan konular
    var tSec = section(page, T("page-usage.top.title"));
    var top = topTopics(u.topicsTable, 5);
    if (!top.length) tSec.appendChild(el("p", "am-pp-muted", T("page-usage.top.none")));
    else tSec.appendChild(makeTable(T("page-usage.top.caption"),
      [T("page-usage.top.topic"), T("page-usage.top.model"), T("page-usage.top.tokens"), T("page-usage.top.share")],
      top.map(function (r) { return [r.title || DASH, r.model !== null ? r.model : DASH, r.tokens === null ? DASH : fmtInt(r.tokens), fmtPct(r.sharePct)]; }), 2));

    // Ayrıntılı sayfa
    var oSec = section(page, T("page-usage.open"));
    oSec.appendChild(el("p", "am-pp-muted", T("page-usage.openHint")));
    var row = el("div", "am-pp-actions");
    row.appendChild(btn(T("page-usage.open"), function () { act(AM, "openProjectSettings", ["usage"]); }, "open"));
    row.appendChild(btn(T("page-usage.refresh"), function () { reload(AM); }, "refresh"));
    oSec.appendChild(row);
  }

  // ------------------------------------------------------------------ giriş noktası
  function render(AM, root, param) {
    void param;
    var st = AM && AM.state ? AM.state : {};
    if ((st.usage === undefined || st.usage === null) && !S.usageRequested) {
      S.usageRequested = true;
      act(AM, "loadUsage", []);
    }
    var sig = sigOf(AM, S.usageRequested);
    if (root === S.lastRoot && sig === S.lastSig && root.children && root.children.length > 0) return;
    var fk = activeKey(root);
    root.textContent = "";
    try {
      var page = el("div", "am-pp-page");
      var h = el("h2", "am-pp-h2", T("page-usage.title"));
      h.setAttribute("tabindex", "-1");
      h.setAttribute("data-fkey", "title");
      page.appendChild(h);
      page.appendChild(el("p", "am-pp-desc", T("page-usage.intro")));
      note(page, T("page-usage.priceNote"), "info");
      if (st.usage && typeof st.usage === "object" && typeof st.usage.note === "string" && st.usage.note) {
        page.appendChild(el("p", "am-pp-muted", T("page-usage.serverNote", { note: str(st.usage.note, 200) })));
      }
      buildBody(AM, page, st.usage);
      root.appendChild(page);
    } catch (e) {
      root.textContent = "";
      errorCard(root, T("page-usage.err.title"), T("page-usage.err.detail", { reason: str(e && e.message ? e.message : e, 200) }), function () { S.lastSig = ""; render(AM, root, param); });
    }
    S.lastRoot = root;
    S.lastSig = sig;
    if (!S.started) { S.started = true; fk = "title"; }
    restoreFocus(root, fk);
  }

  window.AM_PAGES.register("usage", { title: T("page-usage.title"), group: "Yönetim", render: render });
  window.AM_PAGE_USAGE = Object.freeze({ pure: Object.freeze(pure), render: render });
})();
