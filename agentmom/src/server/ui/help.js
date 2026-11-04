// D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. Ek bölümler 'D9' ile işaretlidir; ADR-016: yetenekler kendiliğinden çalışmaz.
/*
 * Sahip: Sonnet (Yardım içeriği) [İP:AgentMom Faz 11, dilim 2]
 * yazan: [Claude#agentmom-faz11-ayarlar]
 * Amaç: window.AM_HELP = { init(AM, host), render(AM), renderSection(AM, id, container), indexText(AM, id), pure }.
 *       Ayarlar > Yardım bölümlerinin içeriği: Eğitim belgesi, Kısayollar, Komutlar, Güvenlik sınırları, İşletim el kitabı.
 * Belgeler sunucudan okunur: AM.actions.loadDoc(ad) -> AM.state.docs[ad] = {status:'loading'|'ok'|'error', text}. İçerik KOPYALANMAZ.
 *       Markdown çizimi yalnız AM_MD.render (safe.js); bu dosya kendi markdown işleyicisi taşımaz ve HTML dizesi atamaz.
 * Kural kaynağı: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md (Ekran 5), docs/tasarim/arayuz-sozlesmesi.md (güvenlik).
 * Değiştirme: yalnız sahibi ya da ana oturum. Yükleme sırasında DOM'a dokunmaz; saf mantık window.AM_HELP.pure altındadır.
 */
(function () {
  "use strict";

  var TR = {
    "help.egitim.title": "Eğitim belgesi",
    "help.egitim.desc": "Masaüstü ajan uygulamalarının nasıl çalıştığı ve AgentMom'un karşılığı. Belge bu bilgisayardaki sunucudan okunur; internet gerekmez.",
    "help.el-kitabi.title": "İşletim el kitabı",
    "help.el-kitabi.desc": "Başlatma, yedekleme, geri yükleme ve sorun giderme. Belge bu bilgisayardaki sunucudan okunur; internet gerekmez.",
    "help.guvenlik-sinirlari.title": "Güvenlik sınırları",
    "help.guvenlik-sinirlari.desc": "Kod ve testle zorunlu kılınan kesin sınırlar. Belge bu bilgisayardaki sunucudan okunur; internet gerekmez.",
    "help.kisayollar.title": "Kısayollar",
    "help.kisayollar.desc": "Klavye ile hızlı gezinme. Kısayollar yalnız bu pencereye bakar; hiçbiri izin vermez ya da politika değiştirmez.",
    "help.komutlar.title": "Komutlar",
    "help.komutlar.desc": "Giriş kutusunda / yazınca açılan komutlar. Komutlar yalnız bilgi gösterir; serbest metin önce sorulur ve yalnız görev KAYDI açar.",
    "help.colKeys": "Kısayol",
    "help.colWhat": "Ne yapar",
    "help.colCmd": "Komut",
    "help.shortcutsCaption": "Klavye kısayolları",
    "help.commandsCaption": "Sohbet komutları",
    "help.sc.palette": "Komut paletini açar: oturumlar, bölümler, komutlar ve ayarlar.",
    "help.sc.settings": "Ayarlar penceresini açar ya da kapatır.",
    "help.sc.sidebar": "Sol kenar çubuğunu açar ya da kapatır.",
    "help.sc.newTopic": "Yeni konu başlatır.",
    "help.sc.overview": "Sağdaki Genel bakış panelini açar ya da kapatır.",
    "help.sc.send": "Mesajı gönderir.",
    "help.sc.newline": "Giriş kutusunda yeni satır ekler.",
    "help.sc.escape": "Pencereyi, menüyü ya da paleti kapatır; düzenlemeyi iptal eder.",
    "help.sc.rename": "Seçili alt oturumu yeniden adlandırır (Ctrl+Enter kaydeder, Esc iptal eder).",
    "help.sc.slash": "Giriş kutusunda komut menüsünü açar.",
    "help.cmd.yardim": "Komut listesini gösterir.",
    "help.cmd.durum": "Tek satır durum özeti: görev, bekleyen, kırık ve gözden geçirme sayıları.",
    "help.cmd.gorevler": "Görevleri ve durumlarını listeler.",
    "help.cmd.onay": "İzin bekleyen görevleri eylem ve hedefiyle gösterir; karar her zaman sizindir.",
    "help.cmd.borc": "Varsayım borcu kalemlerini listeler.",
    "help.cmd.kararlar": "Kararları ve gözden geçirme durumlarını listeler.",
    "help.cmd.beceriler": "Becerileri ve risk sınıflarını listeler.",
    "help.cmd.saglayicilar": "Sağlayıcıları ve yetenek durumlarını gösterir; kullanılamayan sağlayıcı yerine başkası kendiliğinden seçilmez.",
    "help.cmd.yetenekler": "Çağırabileceğiniz yetenekleri listeler; yetenekler kendiliğinden çalışmaz, yalnız siz çağırınca çalışır.",
    "help.cmd.yenile": "Verileri sunucudan yeniden okur.",
    "help.cmd.temizle": "Yazışma geçmişini temizler; kayıtlı görevlere dokunmaz.",
    "help.toc": "İçindekiler",
    "help.tocLabel": "Belge başlıkları",
    "help.searchLabel": "Belgede ara",
    "help.searchPh": "Belgede ara",
    "help.prev": "Önceki eşleşme",
    "help.next": "Sonraki eşleşme",
    "help.hits": "{n} eşleşme",
    "help.hitsCapped": "{n}+ eşleşme",
    "help.hitsNone": "Eşleşme yok",
    "help.hitAt": "{i} / {n}",
    "help.loading": "Belge yükleniyor…",
    "help.errTitle": "Belge yüklenemedi",
    "help.errDetail": "Sunucudan belge alınamadı. Çevrimiçi olmanız gerekmez; yerel sunucunun çalıştığından emin olup yeniden deneyin.",
    "help.retry": "Yeniden dene",
    "help.noLoad": "Belge yükleme eylemi kullanılamıyor.",
    "help.noMd": "Güvenli belge çizici (AM_MD) yüklenemedi; belge gösterilemiyor.",
    "help.noText": "Belge boş.",
    "help.renderFail": "Belge çizilemedi: {reason}"
  };

  try {
    if (typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("help", TR);
  } catch (e) { /* çakışma: anahtarlar ⟦anahtar⟧ olarak görünür */ }

  function T(key, vars) {
    try { return String(window.AM_T(key, vars)); } catch (e) { return "⟦" + key + "⟧"; }
  }

  // ------------------------------------------------------------------ saf mantık
  var FOLD_MAP = {
    "ç": "c", "Ç": "c", "ğ": "g", "Ğ": "g", "ı": "i", "İ": "i", "ö": "o", "Ö": "o",
    "ş": "s", "Ş": "s", "ü": "u", "Ü": "u", "â": "a", "Â": "a", "î": "i", "Î": "i", "û": "u", "Û": "u"
  };

  // Uzunluğu koruyan katlama: her UTF-16 birimi tek birime döner (vurgu aralıkları özgün metne denk gelir).
  function fold(s) {
    var str = String(s == null ? "" : s);
    var out = "";
    for (var i = 0; i < str.length; i += 1) {
      var c = str.charAt(i);
      if (Object.prototype.hasOwnProperty.call(FOLD_MAP, c)) { out += FOLD_MAP[c]; continue; }
      var l = c.toLowerCase();
      out += l.length === 1 ? l : c;
    }
    return out;
  }

  function normalizeQuery(q) {
    return fold(String(q == null ? "" : q).replace(/\s+/g, " ").trim());
  }

  // Aranan öbeğin metindeki [başlangıç, bitiş) aralıkları (örtüşmeyen, en çok 5000).
  function findRanges(text, q) {
    var nq = normalizeQuery(q);
    if (!nq) return [];
    var hay = fold(text);
    var out = [];
    var from = 0;
    for (;;) {
      var i = hay.indexOf(nq, from);
      if (i === -1) break;
      out.push([i, i + nq.length]);
      from = i + nq.length;
      if (out.length >= 5000) break;
    }
    return out;
  }

  function stripInline(s) {
    return String(s)
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/`+/g, "")
      .replace(/(\*\*|__)/g, "")
      .replace(/(^|\s)[*_](?=\S)|(?<=\S)[*_](?=\s|$)/g, "$1")
      .replace(/\\([\\`*_{}\[\]()#+\-.!])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Belge içindekiler: yalnız h2/h3; kod çiti içindeki satırlar atlanır; satır içi işaretler soyulur.
  function extractToc(text) {
    var out = [];
    var lines = String(text == null ? "" : text).split(/\r?\n/);
    var fence = null;
    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i] || "";
      var f = /^\s{0,3}(```+|~~~+)/.exec(line);
      if (f && f[1]) {
        var ch = f[1].charAt(0);
        if (fence === null) fence = ch; else if (fence === ch) fence = null;
        continue;
      }
      if (fence !== null) continue;
      var m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
      if (!m || !m[1] || !m[2]) continue;
      var title = stripInline(m[2]);
      if (!title) continue;
      out.push({ level: m[1].length, title: title.slice(0, 160), line: i });
      if (out.length >= 200) break;
    }
    return out;
  }

  function normHead(s) { return fold(s).replace(/[^a-z0-9]+/g, ""); }

  // İçindekiler başlıklarını çizilmiş başlıklarla sırayla eşler (çizici düzeyleri kaydırsa da metin eşleşir). Bulunamayan: -1.
  function matchHeadings(tocTitles, headTexts) {
    var heads = (headTexts || []).map(normHead);
    var j = 0;
    return (tocTitles || []).map(function (t) {
      var want = normHead(t);
      for (var k = j; k < heads.length; k += 1) {
        if (heads[k] === want) { j = k + 1; return k; }
      }
      return -1;
    });
  }

  var SHORTCUTS = [
    { keys: ["Ctrl", "K"], descKey: "help.sc.palette" },
    { keys: ["Ctrl", ","], descKey: "help.sc.settings" },
    { keys: ["Ctrl", "B"], descKey: "help.sc.sidebar" },
    { keys: ["Ctrl", "Shift", "O"], descKey: "help.sc.newTopic" },
    { keys: ["Ctrl", "."], descKey: "help.sc.overview" },
    { keys: ["Enter"], descKey: "help.sc.send" },
    { keys: ["Shift", "Enter"], descKey: "help.sc.newline" },
    { keys: ["Esc"], descKey: "help.sc.escape" },
    { keys: ["F2"], descKey: "help.sc.rename" },
    { keys: ["/"], descKey: "help.sc.slash" }
  ];

  var COMMANDS = ["yardim", "durum", "gorevler", "onay", "borc", "kararlar", "beceriler", "saglayicilar", "yetenekler", "yenile", "temizle"].map(function (n) {
    return { name: "/" + n, descKey: "help.cmd." + n };
  });

  var DOC_OF = { "egitim": "egitim", "el-kitabi": "el-kitabi", "guvenlik-sinirlari": "guvenlik" };
  var SECTION_IDS = ["egitim", "kisayollar", "komutlar", "guvenlik-sinirlari", "el-kitabi"];

  function docName(sectionId) {
    return Object.prototype.hasOwnProperty.call(DOC_OF, sectionId) ? DOC_OF[sectionId] : null;
  }

  var pure = {
    fold: fold, normalizeQuery: normalizeQuery, findRanges: findRanges, extractToc: extractToc, matchHeadings: matchHeadings,
    SHORTCUTS: SHORTCUTS, COMMANDS: COMMANDS, DOC_OF: DOC_OF, SECTION_IDS: SECTION_IDS, docName: docName
  };

  // ------------------------------------------------------------------ DOM
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

  var H = { AM: null, host: null, docs: Object.create(null) };

  function st(name) {
    if (!Object.prototype.hasOwnProperty.call(H.docs, name)) H.docs[name] = { q: "", hit: 0, requested: false };
    return H.docs[name];
  }

  function pageHead(c, id) {
    c.appendChild(el("h2", "am-set-h", T("help." + id + ".title")));
    c.appendChild(el("p", "am-set-desc", T("help." + id + ".desc")));
  }

  function simpleTable(c, caption, cols, rows) {
    var wrap = el("div", "am-set-tablewrap");
    var t = el("table", "am-set-table");
    t.appendChild(el("caption", "am-set-sr", caption));
    var thead = el("thead");
    var htr = el("tr");
    cols.forEach(function (name) {
      var th = el("th", "am-set-th", name);
      th.setAttribute("scope", "col");
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    t.appendChild(thead);
    var tb = el("tbody");
    rows.forEach(function (cells) {
      var tr = el("tr", "am-set-tr am-set-f");
      cells.forEach(function (cell, i) {
        var td;
        if (i === 0) {
          td = el("th", "am-set-td am-set-td--name");
          td.setAttribute("scope", "row");
        } else {
          td = el("td", "am-set-td");
        }
        td.appendChild(cell);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    c.appendChild(wrap);
  }

  function keysNode(keys) {
    var w = el("span", "am-help-keys");
    keys.forEach(function (k, i) {
      if (i > 0) w.appendChild(el("span", "am-help-plus", "+"));
      w.appendChild(el("kbd", "am-help-kbd", k));
    });
    return w;
  }

  function secShortcuts(c) {
    pageHead(c, "kisayollar");
    simpleTable(c, T("help.shortcutsCaption"), [T("help.colKeys"), T("help.colWhat")], SHORTCUTS.map(function (s) {
      return [keysNode(s.keys), el("span", "am-help-what", T(s.descKey))];
    }));
  }

  function secCommands(c) {
    pageHead(c, "komutlar");
    simpleTable(c, T("help.commandsCaption"), [T("help.colCmd"), T("help.colWhat")], COMMANDS.map(function (m) {
      return [el("code", "am-set-code", m.name), el("span", "am-help-what", T(m.descKey))];
    }));
  }

  function skeleton(c) {
    var s = el("div", "am-help-skel");
    s.setAttribute("role", "status");
    s.setAttribute("aria-busy", "true");
    s.appendChild(el("span", "am-set-sr", T("help.loading")));
    ["am-w-60", "am-w-100", "am-w-90", "am-w-100", "am-w-75", "am-w-40", "am-w-100", "am-w-85"].forEach(function (w) {
      s.appendChild(el("div", "am-help-skel-line " + w));
    });
    c.appendChild(s);
  }

  function errCard(c, title, detail, onRetry) {
    var card = el("div", "am-set-errcard");
    card.setAttribute("role", "alert");
    card.appendChild(icon("alert", 18));
    var body = el("div", "am-set-errcard-body");
    body.appendChild(el("div", "am-set-row-title", title));
    if (detail) body.appendChild(el("div", "am-set-row-desc", detail));
    card.appendChild(body);
    if (onRetry) {
      var b = el("button", "am-set-btn", T("help.retry"));
      b.type = "button";
      b.setAttribute("data-fkey", "help-retry");
      b.addEventListener("click", onRetry);
      card.appendChild(b);
    }
    c.appendChild(card);
  }

  function requestDoc(AM, name) {
    var s = st(name);
    var a = AM && AM.actions;
    if (!a || typeof a.loadDoc !== "function") return false;
    if (s.requested) return true;
    s.requested = true;
    try {
      var r = a.loadDoc(name);
      if (r && typeof r.then === "function") r.then(null, function () { /* çekirdek durumu 'error' yapar */ });
    } catch (e) { /* çekirdek durumu 'error' yapar; bu çağrıda ikinci deneme yok */ }
    return true;
  }

  function retryDoc(AM, name) {
    st(name).requested = false;
    requestDoc(AM, name);
    if (window.AM_SETTINGS && typeof window.AM_SETTINGS.render === "function") window.AM_SETTINGS.render(AM);
  }

  // Metin düğümlerini bölüp eşleşmeleri <mark> ile sarar (textContent; HTML yok). En çok 500 işaret.
  function highlight(root, q) {
    var marks = [];
    var capped = false;
    if (!normalizeQuery(q)) return { marks: marks, capped: capped };
    var walker = document.createTreeWalker(root, 4, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (var i = 0; i < nodes.length && !capped; i += 1) {
      var node = nodes[i];
      var parent = node.parentNode;
      if (!parent) continue;
      var pn = String(parent.nodeName).toLowerCase();
      if (pn === "script" || pn === "style" || pn === "mark" || pn === "button") continue;
      var text = node.nodeValue || "";
      var ranges = findRanges(text, q);
      if (!ranges.length) continue;
      var frag = document.createDocumentFragment();
      var last = 0;
      for (var r = 0; r < ranges.length; r += 1) {
        if (marks.length >= 500) { capped = true; break; }
        var a = ranges[r];
        if (a[0] > last) frag.appendChild(document.createTextNode(text.slice(last, a[0])));
        var mk = el("mark", "am-help-hit", text.slice(a[0], a[1]));
        marks.push(mk);
        frag.appendChild(mk);
        last = a[1];
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      parent.replaceChild(frag, node);
    }
    return { marks: marks, capped: capped };
  }

  function renderDoc(AM, name, c) {
    var s = st(name);
    var d = AM.state && AM.state.docs ? AM.state.docs[name] : null;
    if (!d || (d.status !== "ok" && d.status !== "error")) {
      if (!d && !requestDoc(AM, name)) { errCard(c, T("help.errTitle"), T("help.noLoad"), null); return; }
      skeleton(c);
      return;
    }
    if (d.status === "error") {
      errCard(c, T("help.errTitle"), T("help.errDetail"), function () { retryDoc(AM, name); });
      return;
    }
    var MD = window.AM_MD;
    if (!MD || typeof MD.render !== "function") { errCard(c, T("help.errTitle"), T("help.noMd"), null); return; }
    var text = typeof d.text === "string" ? d.text : "";
    if (!text.trim()) { errCard(c, T("help.errTitle"), T("help.noText"), function () { retryDoc(AM, name); }); return; }

    var toc = extractToc(text);
    var wrap = el("div", "am-help");

    // Araç çubuğu: belge içi arama, eşleşme sayısı, önceki/sonraki
    var bar = el("div", "am-help-bar");
    var sw = el("div", "am-set-search am-help-search");
    sw.appendChild(icon("search", 16));
    var input = el("input", "am-set-search-in");
    input.type = "search";
    input.value = s.q;
    input.setAttribute("aria-label", T("help.searchLabel"));
    input.setAttribute("placeholder", T("help.searchPh"));
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("data-fkey", "help-search");
    sw.appendChild(input);
    bar.appendChild(sw);
    var status = el("span", "am-help-count");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    bar.appendChild(status);
    function navBtn(name2, label, fkey) {
      var b = el("button", "am-set-iconbtn");
      b.type = "button";
      b.setAttribute("aria-label", label);
      b.setAttribute("title", label);
      b.setAttribute("data-fkey", fkey);
      b.appendChild(icon(name2, 16));
      return b;
    }
    var prev = navBtn("chevron-up", T("help.prev"), "help-prev");
    var next = navBtn("chevron-down", T("help.next"), "help-next");
    bar.appendChild(prev);
    bar.appendChild(next);
    wrap.appendChild(bar);

    var cols = el("div", "am-help-cols");
    var tocNav = el("nav", "am-help-toc");
    tocNav.setAttribute("aria-label", T("help.tocLabel"));
    tocNav.appendChild(el("div", "am-help-toc-title", T("help.toc")));
    var tocList = el("ul", "am-help-toc-list");
    var tocBtns = [];
    toc.forEach(function (item, i) {
      var li = el("li", "am-help-toc-li");
      var b = el("button", "am-help-toc-item" + (item.level === 3 ? " am-help-toc-item--sub" : ""), item.title);
      b.type = "button";
      b.setAttribute("data-fkey", "help-toc-" + i);
      tocBtns.push(b);
      li.appendChild(b);
      tocList.appendChild(li);
    });
    tocNav.appendChild(tocList);
    var body = el("article", "am-help-doc");
    body.setAttribute("aria-label", T("help." + (name === "guvenlik" ? "guvenlik-sinirlari" : name) + ".title"));
    cols.appendChild(tocNav);
    cols.appendChild(body);
    wrap.appendChild(cols);

    var hits = [];
    var heads = [];
    var idxOf = [];

    function setActive(i, scroll) {
      hits.forEach(function (m, k) { m.className = k === i ? "am-help-hit am-help-hit--on" : "am-help-hit"; });
      s.hit = i;
      if (scroll && hits[i] && typeof hits[i].scrollIntoView === "function") hits[i].scrollIntoView({ block: "center" });
      if (hits.length) status.textContent = T("help.hitAt", { i: i + 1, n: hits.length }) + (hitsCapped ? "+" : "");
    }
    var hitsCapped = false;

    function paintBody() {
      while (body.firstChild) body.removeChild(body.firstChild);
      try {
        var frag = MD.render(text, {
          onCopy: function (code) {
            if (AM.actions && typeof AM.actions.copyText === "function") AM.actions.copyText(code);
          }
        });
        body.appendChild(frag);
      } catch (e) {
        errCard(body, T("help.errTitle"), T("help.renderFail", { reason: String(e && e.message ? e.message : e).slice(0, 160) }), null);
        return;
      }
      var nq = normalizeQuery(s.q);
      var res = highlight(body, s.q);
      hits = res.marks;
      hitsCapped = res.capped;
      var hs = body.querySelectorAll("h1,h2,h3,h4,h5,h6");
      heads = [];
      var texts = [];
      for (var i = 0; i < hs.length; i += 1) { heads.push(hs[i]); texts.push(hs[i].textContent || ""); }
      idxOf = matchHeadings(toc.map(function (x) { return x.title; }), texts);
      if (!nq) status.textContent = "";
      else if (!hits.length) status.textContent = T("help.hitsNone");
      else {
        if (s.hit >= hits.length || s.hit < 0) s.hit = 0;
        setActive(s.hit, false);
      }
      prev.disabled = next.disabled = !hits.length;
    }

    function step(delta) {
      if (!hits.length) return;
      setActive((s.hit + delta + hits.length) % hits.length, true);
    }

    input.addEventListener("input", function () {
      s.q = input.value;
      s.hit = 0;
      paintBody();
      if (hits.length) setActive(0, true);
    });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); step(ev.shiftKey ? -1 : 1); }
    });
    prev.addEventListener("click", function () { step(-1); });
    next.addEventListener("click", function () { step(1); });
    tocBtns.forEach(function (b, i) {
      b.addEventListener("click", function () {
        var h = heads[idxOf[i]];
        if (!h) return;
        h.setAttribute("tabindex", "-1");
        if (typeof h.scrollIntoView === "function") h.scrollIntoView({ block: "start" });
        try { h.focus({ preventScroll: true }); } catch (e) { /* odak verilemezse kaydırma yeter */ }
      });
    });

    c.appendChild(wrap);
    paintBody();
  }

  // Arama dizini için bölüm metni (Ayarlar nav süzmesi): statik listeler tam, belgeler yüklüyse başlıkları.
  function indexText(AM, id) {
    try {
      if (id === "kisayollar") return SHORTCUTS.map(function (s) { return s.keys.join("+") + " " + T(s.descKey); }).join(" ");
      if (id === "komutlar") return COMMANDS.map(function (m) { return m.name + " " + T(m.descKey); }).join(" ");
      var name = docName(id);
      var d = name && AM && AM.state && AM.state.docs ? AM.state.docs[name] : null;
      if (d && d.status === "ok" && typeof d.text === "string") return extractToc(d.text).map(function (x) { return x.title; }).join(" ");
    } catch (e) { /* dizin boş kalır */ }
    return "";
  }

  function renderSection(AM, id, container) {
    if (id === "kisayollar") { secShortcuts(container); return; }
    if (id === "komutlar") { secCommands(container); return; }
    var name = docName(id);
    if (!name) { errCard(container, T("help.errTitle"), String(id).slice(0, 60), null); return; }
    pageHead(container, id);
    renderDoc(AM, name, container);
  }

  function init(AM, host) {
    H.AM = AM;
    H.host = host || null;
  }

  // Yardım bölümleri Ayarlar penceresinin içinde çizilir; kendi sabit kökü yoktur.
  function render() { /* bilinçli boş */ }

  window.AM_HELP = { init: init, render: render, renderSection: renderSection, indexText: indexText, pure: pure };
})();
