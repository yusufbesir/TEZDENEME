/*
 * Sahip: Sonnet (D3 sayfası: Modeller ve Ajanlar) [İP:AgentMom Faz 11, D3]
 * yazan: [Claude#agentmom-faz11-d3-saglayicilar]
 * Amaç: window.AM_PAGES.register("models", {title, group, render(AM, root, param)}). Model tablosu AM.state.usage.byModel ve alt oturumlardan
 *       (AM.state.subsessions) türetilir; sağlayıcı ayrıntı uçlarından değil. Alt oturum satırı: kullanıcının verdiği AD ile sistemin bildirdiği
 *       GERÇEK MODEL ayrı gösterilir; ad ile model uyuşmuyorsa uyarı (AM_NAME.modelMismatch). Veri yoksa '—' / 'veri yok' (uydurma yok).
 * Güvenlik: sunucu verisi yalnız textContent; HTML dizesi ataması, satır içi stil/olay, dış kaynak, tarayıcı depolaması, ağ isteği YOK.
 *       Veri yalnız AM.actions.loadUsage ile istenir. Stiller page-providers.css (yalnız var(--am-*)).
 * Değiştirme: yalnız sahibi ya da ana oturum. Yüklenirken DOM'a dokunmaz; saf mantık window.AM_PAGE_MODELS.pure altındadır.
 */
(function () {
  "use strict";

  if (!window.AM_PAGES || typeof window.AM_PAGES.register !== "function") {
    throw new Error("page-models.js: sayfa çerçevesi (pages.js, window.AM_PAGES) yüklenmedi; modeller sayfası çizilemez.");
  }
  if (typeof window.AM_REGISTER_TR !== "function") {
    throw new Error("page-models.js: strings.js (AM_REGISTER_TR) yüklenmedi.");
  }

  var TR = {
    "page-models.title": "Modeller ve Ajanlar",
    "page-models.intro": "Hangi modelin ne kadar kullanıldığı ve alt oturumların gerçekte hangi modelle çalıştığı. Veri yoksa — yazılır; hiçbir değer tahmin edilmez.",
    "page-models.loading": "Yükleniyor…",
    "page-models.na": "—",
    "page-models.noData": "veri yok",
    "page-models.err.title": "Bu sayfa çizilemedi",
    "page-models.err.detail": "Ayrıntı: {reason}",
    "page-models.err.retry": "Yeniden dene",

    "page-models.explain.title": "Kısaca: bu kelimeler ne demek?",
    "page-models.explain.model": "Model: cevabı üreten yapay zekânın kendisi (örneğin Opus, Sonnet, Haiku).",
    "page-models.explain.provider": "Sağlayıcı: modeli size sunan uygulama ya da şirket (Claude Code, Codex, Gemini). Giriş ve limitler buradan gelir.",
    "page-models.explain.agent": "Ajan: bir işi adım adım yürüten çalışan; model, talimat ve izinli araçlardan oluşur. Alt oturum bir ajandır.",
    "page-models.explain.ide": "IDE: kod yazdığınız editör (VS Code, JetBrains gibi). Yapay zekâ orada yaşamak zorunda değildir.",
    "page-models.explain.integration": "Entegrasyon: bir aracı AgentMom'a bağlayan köprü (adaptör). Köprü yoksa araç kurulu olsa da kullanılamaz.",

    "page-models.models.title": "Modeller",
    "page-models.models.caption": "Modellere göre kullanım",
    "page-models.models.model": "Model",
    "page-models.models.provider": "Sağlayıcı",
    "page-models.models.topics": "Konu sayısı",
    "page-models.models.sessions": "Alt oturum",
    "page-models.models.tokens": "Token (toplam)",
    "page-models.models.unknownModel": "Model bilinmiyor",
    "page-models.models.unknownModelNote": "Sağlayıcı bu oturumlar için model bildirmedi.",
    "page-models.models.empty": "Henüz model kullanımı kaydı yok.",
    "page-models.models.emptyHint": "Kullanım ve alt oturum kaydı geldiğinde burada görünür.",
    "page-models.models.note": "Token toplamı girdi, çıktı, önbelleğe yazma ve önbellek okumayı içerir. Ücret ya da fiyat gösterilmez.",
    "page-models.models.loading": "Kullanım verisi yükleniyor…",
    "page-models.models.errTitle": "Kullanım verisi alınamadı",
    "page-models.models.errBody": "Model kullanım tablosu için sunucudan veri okunamadı. Hiçbir değer uydurulmadı. Neden: {reason}",
    "page-models.models.partial": "Kullanım verisi alınamadı; tabloda yalnız alt oturumların bildirdiği modeller var, token sütunu boş.",

    "page-models.sub.title": "Alt oturumlar",
    "page-models.sub.caption": "Alt oturumlar, gerçek modelleri ve durumları",
    "page-models.sub.name": "Ad (sizin verdiğiniz)",
    "page-models.sub.model": "Gerçek model",
    "page-models.sub.provider": "Sağlayıcı",
    "page-models.sub.state": "Durum",
    "page-models.sub.warn": "Uyarı",
    "page-models.sub.empty": "Henüz alt oturum yok.",
    "page-models.sub.emptyHint": "Sol menüden yeni bir alt oturum oluşturduğunuzda burada listelenir.",
    "page-models.sub.archived": "Arşivde",
    "page-models.sub.pinned": "Sabit",
    "page-models.sub.noWarn": "Uyarı yok",
    "page-models.sub.nameNote": "Ad sizin yazdığınız serbest metindir; model ise kayıttan gelir ve ayrı gösterilir. Ad modelin ne olduğunu kanıtlamaz.",
    "page-models.sub.mismatch": "Ad ile gerçek model uyuşmuyor: ad “{nameFamily}” diyor, kayıtlı model {modelFamily}.",
    "page-models.sub.mismatchUnknown": "belirsiz",
    "page-models.sub.modelUnknown": "Model bilinmiyor",
    "page-models.sub.src.run": "kaynak: çalıştırma kaydı",
    "page-models.sub.src.declared": "kaynak: beyan (doğrulanmadı)",
    "page-models.sub.src.unknown": "kaynak: bilinmiyor",

    "page-models.state.idle": "Boşta",
    "page-models.state.running": "Çalışıyor",
    "page-models.state.awaiting_approval": "Onay bekliyor",
    "page-models.state.done": "Bitti",
    "page-models.state.failed": "Başarısız",
    "page-models.state.unavailable": "KULLANILAMIYOR",
    "page-models.state.unknown": "Bilinmeyen durum"
  };

  window.AM_REGISTER_TR("page-models", TR);

  function T(key, vars) {
    try { return String(window.AM_T(key, vars)); } catch (e) { return "⟦" + key + "⟧"; }
  }

  // ------------------------------------------------------------------ saf mantık
  var DASH = "—";
  var KINDS = ["input", "output", "cacheWrite", "cacheRead"];
  var STATE_SPEC = {
    idle: { tone: "muted", icon: "dot" },
    running: { tone: "info", icon: "spinner" },
    awaiting_approval: { tone: "warn", icon: "alert" },
    done: { tone: "ok", icon: "check" },
    failed: { tone: "bad", icon: "x" },
    unavailable: { tone: "bad", icon: "x" }
  };

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

  function sumKnown(list) {
    var any = false;
    var sum = 0;
    list.forEach(function (v) { if (isNum(v)) { any = true; sum += v; } });
    return any ? sum : null;
  }

  function stateSpec(state) {
    var k = String(state == null ? "" : state);
    return Object.prototype.hasOwnProperty.call(STATE_SPEC, k) ? { key: k, tone: STATE_SPEC[k].tone, icon: STATE_SPEC[k].icon } : { key: "unknown", tone: "muted", icon: "info" };
  }

  // Sistem alanı (kayıttan): yalnız dize olarak kabul edilir.
  function modelOf(v) { return typeof v === "string" && v.trim() ? str(v, 100) : null; }

  // Model satırları: usage.byModel + topicsTable + alt oturumlar. Sağlayıcı yalnız alt oturum kaydından gelir; yoksa boş (uydurma yok).
  function modelRows(usage, subs) {
    var u = obj(usage);
    var map = Object.create(null);
    var order = [];
    function slot(model) {
      var k = model === null ? "\u0000unknown" : model;
      if (!map[k]) { map[k] = { model: model, providers: [], topics: null, sessions: 0, tokens: null }; order.push(k); }
      return map[k];
    }
    arr(u.byModel, 50).forEach(function (m) {
      var o = obj(m);
      var r = slot(modelOf(o.model));
      r.tokens = sumKnown(KINDS.map(function (k) { return o[k]; }));
      r.topics = isNum(o.topics) ? o.topics : null;
    });
    var table = arr(u.topicsTable, 500);
    if (table.length) {
      Object.keys(map).forEach(function (k) {
        var r = map[k];
        if (r.topics === null && r.model !== null) {
          r.topics = table.filter(function (t) { return obj(t).model === r.model; }).length;
        }
      });
    }
    arr(subs, 500).forEach(function (s) {
      var o = obj(s);
      var r = slot(modelOf(o.model));
      r.sessions += 1;
      var prov = str(o.provider, 60);
      if (prov && r.providers.indexOf(prov) < 0) r.providers.push(prov);
    });
    var rows = order.map(function (k) { return map[k]; });
    rows.sort(function (a, b) {
      if (a.model === null && b.model !== null) return 1;
      if (b.model === null && a.model !== null) return -1;
      var x = a.tokens;
      var y = b.tokens;
      if (x === null && y !== null) return 1;
      if (y === null && x !== null) return -1;
      if (x !== null && y !== null && x !== y) return y - x;
      return String(a.model).localeCompare(String(b.model));
    });
    return rows;
  }

  function mismatchOf(name, model) {
    var nm = window.AM_NAME;
    if (!nm || typeof nm.modelMismatch !== "function") return null;
    try {
      var m = nm.modelMismatch(name, model);
      return m && m.mismatch === true ? { nameFamily: m.nameFamily || null, modelFamily: m.modelFamily || null } : null;
    } catch (e) { return null; }
  }

  // Alt oturum satırları: önce arşivde olmayanlar, sonra güncelleme zamanı yeni olanlar.
  function subRows(subs) {
    var rows = arr(subs, 500).map(function (s, i) {
      var o = obj(s);
      var model = modelOf(o.model);
      var name = str(o.name, 60);
      var src = o.modelSource === "run" || o.modelSource === "declared" ? o.modelSource : "unknown";
      return {
        id: str(o.id, 64), name: name, model: model, modelSource: src, provider: str(o.provider, 60), state: stateSpec(o.state), archived: o.archived === true,
        pinned: o.pinned === true, updatedAt: Date.parse(String(o.updatedAt || "")), mismatch: mismatchOf(name, model), i: i
      };
    });
    rows.sort(function (a, b) {
      if (a.archived !== b.archived) return a.archived ? 1 : -1;
      var x = isFinite(a.updatedAt) ? a.updatedAt : -Infinity;
      var y = isFinite(b.updatedAt) ? b.updatedAt : -Infinity;
      if (x !== y) return y > x ? 1 : -1;
      return a.i - b.i;
    });
    return rows;
  }

  function usageState(u) {
    if (u === undefined || u === null) return "none";
    if (typeof u !== "object") return "error";
    if (u.status === "loading") return "loading";
    if (u.status === "error" || u.error) return "error";
    return "ok";
  }

  function sigOf(AM, requested) {
    try { var st = AM && AM.state ? AM.state : {}; return JSON.stringify([st.usage, st.subsessions, requested === true]); } catch (e) { return "?" + Math.random(); }
  }

  var pure = {
    fmtInt: fmtInt, sumKnown: sumKnown, stateSpec: stateSpec, modelOf: modelOf, modelRows: modelRows, subRows: subRows,
    mismatchOf: mismatchOf, usageState: usageState, sigOf: sigOf
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

  function chip(text, tone, iconName) {
    var t = TONES.indexOf(tone) >= 0 ? tone : "muted";
    var c = el("span", "am-pp-chip am-pp-chip--" + t);
    c.appendChild(icon(iconName || TONE_ICON[t], 12));
    c.appendChild(el("span", "am-pp-chip-t", text));
    return c;
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
    if (onRetry) body.appendChild(btn(T("page-models.err.retry"), onRetry, "retry"));
    c.appendChild(body);
    parent.appendChild(c);
    return c;
  }

  function makeTable(caption, heads, rows) {
    var wrap = el("div", "am-pp-tablewrap");
    var t = el("table", "am-pp-table");
    t.appendChild(el("caption", "am-pp-sr", caption));
    var thead = el("thead");
    var hr = el("tr");
    heads.forEach(function (h) {
      var th = el("th", "am-pp-th", h);
      th.setAttribute("scope", "col");
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    t.appendChild(thead);
    var tb = el("tbody");
    rows.forEach(function (cells) {
      var tr = el("tr");
      cells.forEach(function (cell, ci) {
        var c = ci === 0 ? el("th", "am-pp-td am-pp-td--head") : el("td", "am-pp-td");
        if (ci === 0) c.setAttribute("scope", "row");
        if (cell && typeof cell === "object" && cell.nodeType) c.appendChild(cell);
        else c.textContent = String(cell == null ? "" : cell);
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

  function explainBox(parent) {
    var box = el("section", "am-pp-explain");
    box.setAttribute("aria-labelledby", "am-pm-explain-h");
    var h = el("h3", "am-pp-h3", T("page-models.explain.title"));
    h.id = "am-pm-explain-h";
    box.appendChild(h);
    var ul = el("ul", "am-pp-explain-list");
    ["model", "provider", "agent", "ide", "integration"].forEach(function (k) { ul.appendChild(el("li", "am-pp-explain-li", T("page-models.explain." + k))); });
    box.appendChild(ul);
    parent.appendChild(box);
  }

  function modelsSection(AM, parent, usage, subs) {
    var sec = section(parent, T("page-models.models.title"));
    var us = usageState(usage);
    if (us === "none" || us === "loading") { skeleton(sec, T("page-models.models.loading")); return; }
    var partial = false;
    if (us === "error") {
      errorCard(sec, T("page-models.models.errTitle"), T("page-models.models.errBody", { reason: str(obj(usage).reason || DASH, 200) }), function () { S.usageRequested = true; S.lastSig = ""; act(AM, "loadUsage", []); });
      partial = true;
    }
    var rows = modelRows(partial ? null : usage, subs);
    if (!rows.length) {
      if (partial) return;
      var e = el("div", "am-pp-empty");
      e.appendChild(el("strong", "am-pp-empty-t", T("page-models.models.empty")));
      e.appendChild(el("p", "am-pp-empty-d", T("page-models.models.emptyHint")));
      sec.appendChild(e);
      return;
    }
    if (partial) note(sec, T("page-models.models.partial"), "warn");
    var cells = rows.map(function (r) {
      var nameCell = r.model !== null ? r.model : T("page-models.models.unknownModel");
      return [
        nameCell,
        r.providers.length ? r.providers.join(", ") : DASH,
        r.topics === null ? DASH : fmtInt(r.topics),
        fmtInt(r.sessions),
        r.tokens === null ? DASH : fmtInt(r.tokens)
      ];
    });
    sec.appendChild(makeTable(T("page-models.models.caption"),
      [T("page-models.models.model"), T("page-models.models.provider"), T("page-models.models.topics"), T("page-models.models.sessions"), T("page-models.models.tokens")], cells));
    if (rows.some(function (r) { return r.model === null; })) sec.appendChild(el("p", "am-pp-muted", T("page-models.models.unknownModelNote")));
    sec.appendChild(el("p", "am-pp-muted", T("page-models.models.note")));
  }

  function subsSection(parent, subs) {
    var sec = section(parent, T("page-models.sub.title"));
    var rows = subRows(subs);
    if (!rows.length) {
      var e = el("div", "am-pp-empty");
      e.appendChild(el("strong", "am-pp-empty-t", T("page-models.sub.empty")));
      e.appendChild(el("p", "am-pp-empty-d", T("page-models.sub.emptyHint")));
      sec.appendChild(e);
      return;
    }
    sec.appendChild(el("p", "am-pp-muted", T("page-models.sub.nameNote")));
    var cells = rows.map(function (r) {
      var nameNode = el("span", "am-pp-namecell");
      nameNode.appendChild(el("span", "am-pp-name", r.name || DASH));
      if (r.pinned) nameNode.appendChild(chip(T("page-models.sub.pinned"), "muted", "pin"));
      if (r.archived) nameNode.appendChild(chip(T("page-models.sub.archived"), "muted", "archive"));

      var modelNode = el("span", "am-pp-modelcell");
      modelNode.appendChild(chip(r.model !== null ? r.model : T("page-models.sub.modelUnknown"), r.model !== null ? "info" : "muted", r.model !== null ? "spark" : "info"));
      modelNode.appendChild(el("span", "am-pp-sub", T("page-models.sub.src." + r.modelSource)));

      var stateNode = chip(T("page-models.state." + r.state.key), r.state.tone, r.state.icon);

      var warnNode;
      if (r.mismatch) {
        warnNode = chip(T("page-models.sub.mismatch", {
          nameFamily: r.mismatch.nameFamily || DASH,
          modelFamily: r.mismatch.modelFamily || T("page-models.sub.mismatchUnknown")
        }), "warn", "alert");
        warnNode.setAttribute("role", "note");
      } else {
        warnNode = el("span", "am-pp-muted", T("page-models.sub.noWarn"));
      }
      return [nameNode, modelNode, r.provider || DASH, stateNode, warnNode];
    });
    sec.appendChild(makeTable(T("page-models.sub.caption"),
      [T("page-models.sub.name"), T("page-models.sub.model"), T("page-models.sub.provider"), T("page-models.sub.state"), T("page-models.sub.warn")], cells));
  }

  // ------------------------------------------------------------------ giriş noktası
  function render(AM, root, param) {
    void param;
    var st = AM && AM.state ? AM.state : {};
    // Kullanım hiç istenmediyse sayfa ilk açılışta bir kez ister (ağ isteğini çekirdek yapar).
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
      var h = el("h2", "am-pp-h2", T("page-models.title"));
      h.setAttribute("tabindex", "-1");
      h.setAttribute("data-fkey", "title");
      page.appendChild(h);
      page.appendChild(el("p", "am-pp-desc", T("page-models.intro")));
      explainBox(page);
      modelsSection(AM, page, st.usage, st.subsessions);
      subsSection(page, st.subsessions);
      root.appendChild(page);
    } catch (e) {
      root.textContent = "";
      errorCard(root, T("page-models.err.title"), T("page-models.err.detail", { reason: str(e && e.message ? e.message : e, 200) }), function () { S.lastSig = ""; render(AM, root, param); });
    }
    S.lastRoot = root;
    S.lastSig = sig;
    if (!S.started) { S.started = true; fk = "title"; }
    restoreFocus(root, fk);
  }

  window.AM_PAGES.register("models", { title: T("page-models.title"), group: "Yönetim", render: render });
  window.AM_PAGE_MODELS = Object.freeze({ pure: Object.freeze(pure), render: render });
})();
