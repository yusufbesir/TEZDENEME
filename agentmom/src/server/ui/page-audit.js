// AgentMom "Denetim Kayıtları" sayfası (Faz 11, D3). Yazan: Claude [İP:AgentMom Faz 11 / sayfalar]. Sahip: Yusuf.
// Ne: AM_PAGES.register("audit", ...). AM.state.data.audit tablosu (zaman, aktör, eylem, karar, sonuç), metin araması + karar süzgeci, en çok 200 satır,
//   kopyalanabilir (AM.actions.copyText), ayrıntı satırı katlanır (details yalnız temizlenmiş/maskelenmiş textContent).
// Kural: YALNIZ OKUMA; ağ yok; sunucu metni yalnız textContent; belirteç benzeri değerler maskelenir. Değiştirme: yalnız sahibi.
"use strict";
(function () {
  var ID = "audit";
  var P = typeof window !== "undefined" ? window.AM_PAGES : null;
  if (!P || typeof P.register !== "function" || !P.kit) {
    try { if (typeof console !== "undefined") console.error("AM_PAGES yok: " + ID); } catch (e) { /* konsol yoksa */ }
    try {
      var h = document.getElementById("pageView");
      if (h) { var d = document.createElement("div"); d.setAttribute("role", "alert"); d.textContent = "Sayfa çerçevesi (pages.js) yüklenemedi; bu sayfa gösterilemiyor: " + ID; h.appendChild(d); }
    } catch (e2) { /* DOM yoksa çekirdek eksik modül hatasını gösterir */ }
    return;
  }
  var K = P.kit, PU = P.pure;

  var TR = {
    "page-audit.intro": "Sistemin aldığı kararların değiştirilemez kaydı. En yeni olaylar üstte; en çok 200 satır gösterilir.",
    "page-audit.searchLabel": "Kayıtlarda ara", "page-audit.searchHint": "Aktör, eylem, karar, sonuç ya da ayrıntıda ara…",
    "page-audit.decisionLabel": "Karar süzgeci", "page-audit.decisionAll": "Tüm kararlar",
    "page-audit.copy": "Görünen kayıtları kopyala", "page-audit.copied": "Kopyalandı ({n} satır).", "page-audit.copyFail": "Kopyalanamadı; metni tablodan elle seçebilirsiniz.",
    "page-audit.shown": "{n} / {toplam} kayıt gösteriliyor", "page-audit.limit": "Süzgece uyan {toplam} kaydın ilk {n} tanesi gösteriliyor.",
    "page-audit.caption": "Denetim kayıtları", "page-audit.colTime": "Zaman", "page-audit.colActor": "Aktör", "page-audit.colAction": "Eylem", "page-audit.colDecision": "Karar", "page-audit.colResult": "Sonuç",
    "page-audit.empty": "Henüz denetim kaydı yok.", "page-audit.noMatch": "Süzgece uyan kayıt yok.",
    "page-audit.expand": "Ayrıntıyı göster: {ad}", "page-audit.collapse": "Ayrıntıyı gizle: {ad}", "page-audit.detailTitle": "Ayrıntı", "page-audit.noDetail": "Ayrıntı kaydı yok.",
    "page-audit.header": "Zaman\tAktör\tEylem\tKarar\tSonuç",
    "page-audit.chainTitle": "Zincir doğrulama", "page-audit.chainDesc": "Her denetim satırı bir öncekinin özetine bağlanır; bir satır sonradan değiştirilirse zincir kırılır. Bu yerel bir tutarlılık denetimidir: dış bir sabitleme noktası ya da anahtar yoktur; zincirin tamamını yeniden yazan biri ya da son satırları silen biri fark edilmeyebilir.",
    "page-audit.chainOk": "ZİNCİR SAĞLAM", "page-audit.chainPending": "Zincir henüz başlamadı (zincirli satır yok)", "page-audit.chainBroken": "ZİNCİR KIRIK", "page-audit.chainUnknown": "Doğrulama sonucu okunamadı",
    "page-audit.chainCounts": "{zincirli} / {toplam} satır zincirli", "page-audit.chainAt": "Son doğrulama: {zaman}",
    "page-audit.chainBreak": "İlk kırılma: kayıt {id} · {zaman}", "page-audit.chainBreakNoId": "İlk kırılma noktası bildirilmedi.",
    "page-audit.chainBrokenWarn": "Kayıtlar değiştirilmiş ya da silinmiş olabilir. Bu kayıtlara güvenmeyin; Yusuf'a bildirin.",
    "page-audit.chainLegacy": "{n} eski satır zincirli değil: zincir eklenmeden önce yazıldı, 'zincire girmez'. Bu satırların bütünlüğü doğrulanamaz.",
    "page-audit.chainLegacyNote": "Zincirli olmayan eski satırlar 'zincire girmez' ve doğrulamaya dahil edilmez.",
    "page-audit.chainRecheck": "Yeniden doğrula"
  };
  if (typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("page-audit", TR);
  function T(key, vars) { return K.T(key, vars); }

  function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  var MAX_ROWS = 200;
  var local = { q: "", decision: "", open: Object.create(null), copyMsg: "" };

  // ---- saf mantık ----
  function filterAudit(rows, f) {
    var q = f && typeof f.q === "string" ? f.q : "";
    var dec = f && typeof f.decision === "string" ? f.decision : "";
    return (Array.isArray(rows) ? rows : []).filter(function (r) {
      if (dec && r.decision !== dec) return false;
      if (!q.trim()) return true;
      return PU.matchesText([r.time, r.ts, r.actor, r.action, r.decision, r.result, PU.detailsText(r.details)].join(" "), q);
    });
  }
  function decisionOptions(rows) { return PU.distinct((Array.isArray(rows) ? rows : []).map(function (r) { return r.decision; })).sort(function (a, b) { return a.localeCompare(b, "tr"); }); }
  function copyText(rows) { return [T("page-audit.header")].concat((Array.isArray(rows) ? rows : []).map(PU.auditLine)).join("\n"); }
  function rowKey(r, i) { return r.id || ("i" + i); }
  // Zincir doğrulama: ok yalnız TAM true ise "sağlam"; ok:false ya da firstBreak varsa KIRIK; alan eksikse "bilinmiyor" (sağlam varsayılmaz).
  function cnt(v) { return v !== null && v !== undefined && v !== "" && isFinite(Number(v)) && Number(v) >= 0 ? Math.floor(Number(v)) : null; }
  function chainSummary(value) {
    if (!isObj(value)) return { status: "unknown", total: null, chained: null, legacy: null, firstBreak: null, checkedAt: "" };
    var total = cnt(value.total), chained = cnt(value.chained);
    var fb = isObj(value.firstBreak) ? { id: PU.safeStr(value.firstBreak.id, 80), ts: PU.safeStr(value.firstBreak.ts, 40), time: PU.formatTime(value.firstBreak.ts) } : null;
    var status = value.ok === false || fb ? "broken" : value.ok === true ? (chained === 0 ? "pending" : "ok") : "unknown";
    var legacy = total !== null && chained !== null && total >= chained ? total - chained : null;
    return { status: status, total: total, chained: chained, legacy: legacy, firstBreak: fb, checkedAt: PU.formatTime(value.checkedAt) || PU.safeStr(value.checkedAt, 40) };
  }

  // ---- çizim ----
  function detailNode(r) {
    var box = K.el("div", "am-pg-detail");
    box.appendChild(K.el("strong", "am-pg-detail-t", T("page-audit.detailTitle")));
    var text = PU.detailsText(r.details);
    if (!text) box.appendChild(K.el("p", "am-pg-note", T("page-audit.noDetail")));
    else box.appendChild(K.el("pre", "am-pg-pre", text));
    return box;
  }

  function controls(root, rows, shown, total) {
    var bar = K.el("div", "am-pg-filters");
    var sid = K.nextId("q"), did = K.nextId("d");
    var f1 = K.el("div", "am-pg-field");
    var l1 = K.el("label", "am-pg-label", T("page-audit.searchLabel")); l1.setAttribute("for", sid);
    var inp = K.el("input", "am-pg-input");
    inp.id = sid; inp.type = "search"; inp.value = local.q; inp.placeholder = T("page-audit.searchHint"); inp.autocomplete = "off";
    inp.maxLength = 100;
    inp.setAttribute("data-am-key", "audit-q");
    inp.addEventListener("input", function (ev) { if (ev && ev.isComposing) return; local.q = String(inp.value).slice(0, 100); P.rerender(); });
    inp.addEventListener("compositionend", function () { local.q = String(inp.value).slice(0, 100); P.rerender(); });
    f1.appendChild(l1); f1.appendChild(inp);
    var f2 = K.el("div", "am-pg-field");
    var l2 = K.el("label", "am-pg-label", T("page-audit.decisionLabel")); l2.setAttribute("for", did);
    var sel = K.el("select", "am-pg-input");
    sel.id = did; sel.setAttribute("data-am-key", "audit-decision");
    var o0 = K.el("option", null, T("page-audit.decisionAll")); o0.value = ""; sel.appendChild(o0);
    decisionOptions(rows).forEach(function (d) { var o = K.el("option", null, d); o.value = d; if (d === local.decision) o.selected = true; sel.appendChild(o); });
    sel.value = local.decision;
    sel.addEventListener("change", function () { local.decision = String(sel.value).slice(0, 60); P.rerender(); });
    f2.appendChild(l2); f2.appendChild(sel);
    bar.appendChild(f1); bar.appendChild(f2);
    root.appendChild(bar);

    var tools = K.el("div", "am-pg-actions");
    tools.appendChild(K.el("span", "am-pg-count", T("page-audit.shown", { n: PU.fmtNum(shown), toplam: PU.fmtNum(total) })));
    tools.appendChild(K.button(T("page-audit.copy"), "audit-copy", function () {
      var lines = copyText(local.visible || []);
      var n = (local.visible || []).length;
      var p = K.hasAct("copyText") ? K.act("copyText", lines) : null;
      if (p && typeof p.then === "function") p.then(function (ok) { local.copyMsg = ok ? T("page-audit.copied", { n: n }) : T("page-audit.copyFail"); P.rerender(); }, function () { local.copyMsg = T("page-audit.copyFail"); P.rerender(); });
      else { local.copyMsg = T("page-audit.copyFail"); P.rerender(); }
    }));
    root.appendChild(tools);
    var live = K.el("p", "am-pg-note");
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    live.textContent = local.copyMsg;
    root.appendChild(live);
  }

  function chainCard(AM, root) {
    var body = K.section(root, T("page-audit.chainTitle"), { desc: T("page-audit.chainDesc") });
    var entry = K.ensureData(AM, "auditVerify");
    K.asyncBody(body, entry, function () { K.reload(AM, "auditVerify"); }, function (value) {
      var c = chainSummary(value);
      var tone = c.status === "ok" ? "ok" : c.status === "broken" ? "bad" : c.status === "pending" ? "info" : "warn";
      var shape = c.status === "ok" ? "✓" : c.status === "broken" ? "✕" : c.status === "pending" ? "•" : "?";
      var label = c.status === "ok" ? T("page-audit.chainOk") : c.status === "broken" ? T("page-audit.chainBroken") : c.status === "pending" ? T("page-audit.chainPending") : T("page-audit.chainUnknown");
      var card = K.el("div", "am-pg-panel am-pg-chain am-pg-chain--" + c.status);
      if (c.status === "broken") card.setAttribute("role", "alert");
      var head = K.el("div", "am-pg-chain-head");
      head.appendChild(K.chip(shape + " " + label, tone));
      card.appendChild(head);
      var lines = [];
      if (c.total !== null && c.chained !== null) lines.push(T("page-audit.chainCounts", { zincirli: PU.fmtNum(c.chained), toplam: PU.fmtNum(c.total) }));
      if (c.checkedAt) lines.push(T("page-audit.chainAt", { zaman: c.checkedAt }));
      lines.forEach(function (l) { card.appendChild(K.el("p", "am-pg-note", l)); });
      if (c.status === "broken") {
        card.appendChild(K.el("p", "am-pg-chain-break", c.firstBreak ? T("page-audit.chainBreak", { id: c.firstBreak.id || T("pages.dash"), zaman: c.firstBreak.time || c.firstBreak.ts || T("pages.dash") }) : T("page-audit.chainBreakNoId")));
        card.appendChild(K.el("p", "am-pg-chain-warn", T("page-audit.chainBrokenWarn")));
      }
      if (c.legacy !== null && c.legacy > 0) card.appendChild(K.el("p", "am-pg-note", T("page-audit.chainLegacy", { n: PU.fmtNum(c.legacy) })));
      else card.appendChild(K.el("p", "am-pg-note", T("page-audit.chainLegacyNote")));
      var row = K.el("div", "am-pg-actions");
      row.appendChild(K.button(T("page-audit.chainRecheck"), "audit-reverify", function () { K.reload(AM, "auditVerify"); }));
      card.appendChild(row);
      body.appendChild(card);
    });
  }

  function render(AM, root) {
    root.appendChild(K.el("p", "am-pg-lead", T("page-audit.intro")));
    var entry = K.ensureData(AM, "audit");
    if (entry.status !== "ok") { K.asyncBody(root, entry, function () { K.reload(AM, "audit"); }, function () {}); return; }
    chainCard(AM, root);
    var rows = PU.auditRows(entry.value);
    if (!rows.length) { root.appendChild(K.emptyCard(T("page-audit.empty"))); return; }
    var filtered = filterAudit(rows, local);
    var lim = PU.limitRows(filtered, MAX_ROWS);
    local.visible = lim.shown;
    controls(root, rows, lim.shown.length, rows.length);
    if (!lim.shown.length) { root.appendChild(K.emptyCard(T("page-audit.noMatch"))); return; }
    K.table(root, {
      caption: T("page-audit.caption"),
      cols: [{ label: T("page-audit.colTime") }, { label: T("page-audit.colActor") }, { label: T("page-audit.colAction") }, { label: T("page-audit.colDecision") }, { label: T("page-audit.colResult") }],
      rows: lim.shown.map(function (r, i) {
        var k = rowKey(r, i), open = local.open[k] === true;
        var name = r.time || r.ts || T("pages.dash");
        var tb = K.button((open ? "▾ " : "▸ ") + name, "x:" + k, function () { local.open[k] = !open; P.rerender(); }, "am-pg-linkbtn");
        tb.setAttribute("aria-expanded", open ? "true" : "false");
        tb.setAttribute("aria-label", T(open ? "page-audit.collapse" : "page-audit.expand", { ad: name + " " + r.action }));
        return { cells: [tb, r.actor || T("pages.dash"), r.action, r.decision, r.result], detail: open ? detailNode(r) : null, open: open };
      })
    });
    if (lim.hidden > 0) root.appendChild(K.el("p", "am-pg-note", T("page-audit.limit", { n: lim.shown.length, toplam: lim.total })));
  }

  P.register(ID, {
    title: T("pages.title.audit"), group: "manage", render: render,
    pure: {
      chainSummary: chainSummary, filterAudit: filterAudit, decisionOptions: decisionOptions, copyText: copyText, rowKey: rowKey, MAX_ROWS: MAX_ROWS, TR: TR,
      reset: function () { local.q = ""; local.decision = ""; local.open = Object.create(null); local.copyMsg = ""; local.visible = []; },
      state: function () { return local; }
    }
  });
})();
