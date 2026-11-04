// AgentMom "Genel Bakış" sayfası (Faz 11, D3). Yazan: Claude [İP:AgentMom Faz 11 / sayfalar]. Sahip: Yusuf.
// Ne: AM_PAGES.register("overview", ...). Özet kartları (görev, sağlayıcı, yedek, varsayım borcu, karar gözden geçirme, sağlık), Bekleyenler kısayolu, son denetim olayları.
// Kural: veri yalnız AM.state.* ve AM.state.data.audit; ağ yok; sunucu metni yalnız textContent; durum şekil + metinle verilir. Değiştirme: yalnız sahibi.
"use strict";
(function () {
  var ID = "overview";
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
    "page-overview.intro": "Projenin tek bakışta durumu. Sayılar kayıtlardan gelir; bilinmeyen değer uydurulmaz.",
    "page-overview.cardTasks": "Görevler", "page-overview.tasksSub": "{bekleyen} onay bekliyor · {calisan} çalışıyor · {basarisiz} başarısız",
    "page-overview.cardProviders": "Sağlayıcılar", "page-overview.providersNone": "Sağlayıcı verisi yok",
    "page-overview.providersSub": "{dogrulandi} doğrulandı · {kismi} kısmi · {dogrulanmadi} doğrulanmadı · {kullanilamiyor} kullanılamıyor",
    "page-overview.providersUnsupported": " · {n} desteklenmiyor",
    "page-overview.cardBackup": "Yedek", "page-overview.backupUnknown": "Alınamadı", "page-overview.backupUnknownSub": "Yedek durumu okunamadı (zamanlayıcı kurulu değil olabilir).",
    "page-overview.backupNever": "Yedek yok", "page-overview.backupNeverSub": "Henüz alınmış yedek kaydı yok.",
    "page-overview.backupOk": "Güncel", "page-overview.backupWarn": "Uyarı var", "page-overview.backupLast": "Son: {zaman}",
    "page-overview.backupWarnings": "{n} uyarı", "page-overview.backupVerifyFail": "Son doğrulama BAŞARISIZ",
    "page-overview.cardDebt": "Varsayım borcu", "page-overview.debtSub": "{kirik} kırık · {gecikmis} gecikmiş · {bekleyen} bekliyor", "page-overview.debtNone": "Borç yok",
    "page-overview.cardDecisions": "Karar gözden geçirme", "page-overview.decisionsSub": "{n} karar gözden geçirme bekliyor · toplam {toplam}", "page-overview.decisionsNone": "Bekleyen yok",
    "page-overview.cardHealth": "Sağlık", "page-overview.healthGreen": "Sağlıklı", "page-overview.healthRed": "Sorunlu", "page-overview.healthUnknown": "Bilinmiyor",
    "page-overview.healthSub": "{n} denetim başarısız", "page-overview.healthOkSub": "Tüm denetimler geçti", "page-overview.healthUnknownSub": "Sağlık raporu alınamadı.",
    "page-overview.pending": "Bekleyenleri aç", "page-overview.pendingCount": "Bekleyenleri aç ({n})", "page-overview.pendingNote": "Sağ Genel bakış panelinde onay bekleyen işleri açar.",
    "page-overview.audit": "Son denetim olayları", "page-overview.auditAll": "Tüm denetim kayıtları", "page-overview.auditCaption": "Son denetim olayları",
    "page-overview.colTime": "Zaman", "page-overview.colActor": "Aktör", "page-overview.colAction": "Eylem", "page-overview.colDecision": "Karar", "page-overview.colResult": "Sonuç",
    "page-overview.auditEmpty": "Henüz denetim olayı yok.",
    "page-overview.live": "Canlı izleme", "page-overview.liveNote": "Yaklaşık 15 saniyede bir yenilenir; bilinmeyen değer uydurulmaz.",
    "page-overview.liveRunning": "Çalışan", "page-overview.liveWaiting": "Bekleyen (onay)", "page-overview.liveFailed": "Başarısız (son 24 saat)",
    "page-overview.liveUnknown": "Ölçülmedi", "page-overview.liveNoMeasure": "Henüz ölçüm yok",
    "page-overview.liveNoMeasureSub": "İzleme verisi henüz gelmedi ya da sunucu bildirmedi. Boşluk 'her şey yolunda' anlamına gelmez.",
    "page-overview.bottleneck": "Darboğaz", "page-overview.bnNone": "Darboğaz saptanmadı", "page-overview.bnUnknown": "Darboğaz bilgisi yok",
    "page-overview.bnUnknownSub": "Sunucu darboğaz bildirmedi; yok varsayılmaz.",
    "page-overview.bn.approval_wait": "Onay bekliyor", "page-overview.bn.slow_step": "Yavaş adım", "page-overview.bn.retries": "Tekrar denemeler",
    "page-overview.bnOpen": "İlgili konuyu aç: {ad}", "page-overview.bnOpenLabel": "Konuyu aç",
    "page-overview.stalled": "Takılma şüphesi", "page-overview.stalledNone": "Takılmış görünen koşu yok",
    "page-overview.stalledChip": "takılmış görünüyor", "page-overview.stalledLongMark": "uzun süredir",
    "page-overview.stalledDetail": "Ayrıntı", "page-overview.stalledDetailLabel": "Takılma ayrıntısı: {ad}",
    "page-overview.stalledText": "Son iz: {dk} dk önce. Bu yalnız bir şüphedir: uzun süren meşru bir iş olabilir. Hiçbir şey kendiliğinden iptal edilmez ya da yönlendirilmez.",
    "page-overview.stalledRule": "Eşik sabittir: 5 dk hiç iz (denetim olayı ya da kanıt) yoksa 'takılmış görünüyor', 15 dk ise 'uzun süredir'."
  };
  if (typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("page-overview", TR);
  function T(key, vars) { return K.T(key, vars); }

  function arr(v) { return Array.isArray(v) ? v : []; }
  function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }

  // ---- saf mantık ----
  function taskStats(tasks) {
    var l = arr(tasks).filter(isObj), n = { total: l.length, awaiting: 0, running: 0, failed: 0 };
    l.forEach(function (t) {
      var s = PU.normState(t.state);
      if (s === "awaiting_approval") n.awaiting++;
      else if (s === "running" || s === "approved") n.running++;
      else if (s === "failed" || s === "blocked" || s === "unavailable") n.failed++;
    });
    return n;
  }
  var PROV_ST = { verified: 1, partial: 1, unverified: 1, unsupported: 1, unavailable: 1 };
  function providerStatus(p) {
    var caps = arr(isObj(p) ? p.capabilities : null).filter(isObj);
    if (!caps.length) return "unknown";
    var ex = null;
    caps.forEach(function (c) { if (c.operation === "execute" && !ex) ex = c; });
    var s = ex ? String(ex.status) : null;
    if (!s) {
      var sts = caps.map(function (c) { return String(c.status); });
      if (sts.indexOf("unavailable") >= 0) s = "unavailable";
      else if (sts.every(function (x) { return x === "verified"; })) s = "verified";
      else if (sts.indexOf("verified") >= 0 || sts.indexOf("partial") >= 0) s = "partial";
      else s = "unverified";
    }
    return Object.prototype.hasOwnProperty.call(PROV_ST, s) ? s : "unverified";
  }
  function providerStats(list) {
    var l = arr(list).filter(isObj), n = { total: l.length, verified: 0, partial: 0, unverified: 0, unavailable: 0, unsupported: 0 };
    l.forEach(function (p) {
      var s = providerStatus(p);
      if (s === "unknown") n.unverified++; else n[s]++;
    });
    return n;
  }
  function debtStats(debt) {
    var l = arr(debt).filter(isObj), n = { total: l.length, broken: 0, overdue: 0, pending: 0 };
    l.forEach(function (d) {
      var k = String(d.kind);
      if (k === "broken") n.broken++; else if (k === "overdue") n.overdue++; else n.pending++;
    });
    return n;
  }
  function decisionStats(decisions) {
    var l = arr(decisions).filter(isObj);
    return { total: l.length, review: l.filter(function (d) { return d.reviewState && d.reviewState !== "ok"; }).length };
  }
  function backupSummary(b) {
    if (!isObj(b)) return { kind: "unknown", lastAt: "", warnings: 0, verifyFailed: false };
    var w = arr(b.warnings).length;
    var vf = isObj(b.lastVerify) && b.lastVerify.ok === false;
    var last = isObj(b.lastBackup) ? String(b.lastBackup.at || "") : "";
    if (!last) return { kind: "never", lastAt: "", warnings: w, verifyFailed: vf };
    return { kind: w > 0 || vf ? "warn" : "ok", lastAt: last, warnings: w, verifyFailed: vf };
  }
  function healthSummary(h) {
    var o = isObj(h) ? h : {};
    var failing = arr(o.checks).filter(function (c) { return isObj(c) && c.ok === false; }).length;
    var st = o.status === "green" ? "green" : o.status === "red" ? "red" : "unknown";
    return { status: st, failing: failing };
  }
  function recentAudit(value, n) { return PU.auditRows(value).slice(0, n > 0 ? n : 8); }
  // Canlı izleme: sunucu null/eksik alan verebilir; eksik sayı "Ölçülmedi" olur (0 uydurulmaz).
  var BN_KINDS = { approval_wait: 1, slow_step: 1, retries: 1, none: 1 };
  function cnt(v) { return v !== null && v !== undefined && v !== "" && isFinite(Number(v)) && Number(v) >= 0 ? Math.floor(Number(v)) : null; }
  function monitorSummary(value) {
    if (!isObj(value)) return { has: false, counts: { running: null, waiting: null, failed: null }, bottleneck: null, stalledKnown: false, stalled: [] };
    var c = isObj(value.counts) ? value.counts : {};
    var counts = { running: cnt(c.running), waiting: cnt(c.waiting), failed: cnt(c.failedLast24h) };
    var b = isObj(value.bottleneck) ? value.bottleneck : null;
    var bn = null;
    if (b) {
      var kind = typeof b.kind === "string" && Object.prototype.hasOwnProperty.call(BN_KINDS, b.kind) ? b.kind : "unknown";
      var tid = typeof b.taskId === "string" && b.taskId.length > 0 && b.taskId.length <= 64 ? PU.clean(b.taskId, 64) : "";
      bn = { kind: kind, text: PU.clean(b.text, 300), taskId: kind === "none" ? "" : tid };
    }
    var any = counts.running !== null || counts.waiting !== null || counts.failed !== null || bn !== null;
    // Takılma şüphesi: sunucu listeyi bildirdiyse (boş liste dahil) bilinir; hiç bildirmediyse 'yok' denmez (stalledKnown false).
    var stalledKnown = Array.isArray(value.stalled);
    var stalled = arr(value.stalled).filter(isObj).slice(0, 20).map(function (x) {
      var id = typeof x.taskId === "string" && x.taskId.length > 0 && x.taskId.length <= 64 ? PU.clean(x.taskId, 64) : "";
      return { taskId: id, title: PU.clean(x.title, 120), lastTraceMin: cnt(x.lastTraceMin), long: x.long === true };
    }).filter(function (x) { return x.taskId && x.lastTraceMin !== null; });
    return { has: any, counts: counts, bottleneck: bn, stalledKnown: stalledKnown, stalled: stalled };
  }

  // Takılma şüphesi rozeti (renk + simge + metin). Yalnız ŞÜPHE: iptal/öldürme/yönlendirme yok; ayrıntı düğmesi yalnız açıklamayı gösterir.
  var STALL_OPEN = Object.create(null);
  function stalledBox(body, m) {
    if (!m.stalledKnown) return;
    var card = K.el("div", "am-pg-panel am-pg-stalled");
    card.appendChild(K.el("h3", "am-pg-card-l", T("page-overview.stalled")));
    if (!m.stalled.length) card.appendChild(K.chip("✓ " + T("page-overview.stalledNone"), "ok"));
    m.stalled.forEach(function (s) {
      var row = K.el("div", "am-pg-actions");
      row.appendChild(K.chip((s.long ? "✕ " : "▲ ") + T("page-overview.stalledChip") + (s.long ? " · " + T("page-overview.stalledLongMark") : ""), s.long ? "bad" : "warn"));
      row.appendChild(K.el("span", "am-pg-note", s.title || s.taskId));
      var open = STALL_OPEN[s.taskId] === true;
      var tb = K.button(T("page-overview.stalledDetail"), "stalled:" + s.taskId, function () { STALL_OPEN[s.taskId] = !open; P.rerender(); });
      tb.setAttribute("aria-expanded", open ? "true" : "false");
      tb.setAttribute("aria-label", T("page-overview.stalledDetailLabel", { ad: s.title || s.taskId }));
      row.appendChild(tb);
      row.appendChild(K.button(T("page-overview.bnOpenLabel"), "stalled-open:" + s.taskId, function () { K.act("selectTopic", s.taskId); }));
      card.appendChild(row);
      if (open) card.appendChild(K.el("p", "am-pg-note", T("page-overview.stalledText", { dk: PU.fmtNum(s.lastTraceMin) })));
    });
    card.appendChild(K.el("p", "am-pg-note", T("page-overview.stalledRule")));
    body.appendChild(card);
  }

  function bnLabel(kind) { return kind === "approval_wait" ? T("page-overview.bn.approval_wait") : kind === "slow_step" ? T("page-overview.bn.slow_step") : kind === "retries" ? T("page-overview.bn.retries") : T("page-overview.bnUnknown"); }
  function liveSection(AM, root) {
    var body = K.section(root, T("page-overview.live"), { desc: T("page-overview.liveNote") });
    var entry = K.ensureData(AM, "monitor");
    K.asyncBody(body, entry, function () { K.reload(AM, "monitor"); }, function (value) {
      var m = monitorSummary(value);
      if (!m.has) { body.appendChild(K.emptyCard(T("page-overview.liveNoMeasure") + ". " + T("page-overview.liveNoMeasureSub"))); return; }
      function num(v) { return v === null ? T("page-overview.liveUnknown") : PU.fmtNum(v); }
      var cs = m.counts;
      K.cards(body, [
        K.statCard({ label: T("page-overview.liveRunning"), value: num(cs.running), tone: cs.running === null ? "muted" : "info", shape: cs.running === null ? "?" : "◐" }),
        K.statCard({ label: T("page-overview.liveWaiting"), value: num(cs.waiting), tone: cs.waiting === null ? "muted" : cs.waiting > 0 ? "warn" : "ok", shape: cs.waiting === null ? "?" : cs.waiting > 0 ? "!" : "✓" }),
        K.statCard({ label: T("page-overview.liveFailed"), value: num(cs.failed), tone: cs.failed === null ? "muted" : cs.failed > 0 ? "bad" : "ok", shape: cs.failed === null ? "?" : cs.failed > 0 ? "✕" : "✓" })
      ]);
      var bn = m.bottleneck;
      var card = K.el("div", "am-pg-panel am-pg-bottleneck");
      card.appendChild(K.el("h3", "am-pg-card-l", T("page-overview.bottleneck")));
      if (!bn) {
        card.appendChild(K.el("p", "am-pg-note", T("page-overview.bnUnknown") + ". " + T("page-overview.bnUnknownSub")));
      } else if (bn.kind === "none") {
        card.appendChild(K.chip("✓ " + T("page-overview.bnNone"), "ok"));
        if (bn.text) card.appendChild(K.el("p", "am-pg-note", bn.text));
      } else {
        card.appendChild(K.chip("▲ " + (bn.kind === "unknown" ? T("page-overview.bnUnknown") : bnLabel(bn.kind)), "warn"));
        card.appendChild(K.el("p", "am-pg-bn-text", bn.text || T("pages.dash")));
        if (bn.taskId) {
          var tid = bn.taskId;
          var b = K.button(T("page-overview.bnOpenLabel"), "bottleneck-open", function () { K.act("selectTopic", tid); });
          b.setAttribute("aria-label", T("page-overview.bnOpen", { ad: bn.text || tid }));
          var row = K.el("div", "am-pg-actions");
          row.appendChild(b);
          card.appendChild(row);
        }
      }
      body.appendChild(card);
      stalledBox(body, m);
    });
  }

  // ---- çizim ----
  function render(AM, root) {
    var st = AM.state || {};
    var intro = K.el("p", "am-pg-lead", T("page-overview.intro"));
    root.appendChild(intro);

    var ts = taskStats(st.tasks), ps = providerStats(st.providers), ds = debtStats(st.debt), dc = decisionStats(st.decisions);
    var bk = backupSummary(st.backup), hs = healthSummary(st.health);

    var list = [];
    list.push(K.statCard({
      label: T("page-overview.cardTasks"), value: PU.fmtNum(ts.total), tone: ts.awaiting > 0 || ts.failed > 0 ? "warn" : "ok", shape: ts.awaiting > 0 ? "!" : ts.failed > 0 ? "✕" : "✓",
      sub: T("page-overview.tasksSub", { bekleyen: ts.awaiting, calisan: ts.running, basarisiz: ts.failed })
    }));
    var provSub = ps.total ? T("page-overview.providersSub", { dogrulandi: ps.verified, kismi: ps.partial, dogrulanmadi: ps.unverified, kullanilamiyor: ps.unavailable }) + (ps.unsupported ? T("page-overview.providersUnsupported", { n: ps.unsupported }) : "") : T("page-overview.providersNone");
    list.push(K.statCard({
      label: T("page-overview.cardProviders"), value: PU.fmtNum(ps.total), tone: !ps.total ? "muted" : ps.unavailable > 0 ? "bad" : ps.verified === ps.total ? "ok" : "warn",
      shape: !ps.total ? "?" : ps.unavailable > 0 ? "✕" : ps.verified === ps.total ? "✓" : "◐", sub: provSub
    }));
    var bkCard;
    if (bk.kind === "unknown") bkCard = { value: T("page-overview.backupUnknown"), tone: "warn", shape: "?", sub: T("page-overview.backupUnknownSub") };
    else if (bk.kind === "never") bkCard = { value: T("page-overview.backupNever"), tone: "warn", shape: "!", sub: T("page-overview.backupNeverSub") };
    else bkCard = {
      value: T(bk.kind === "ok" ? "page-overview.backupOk" : "page-overview.backupWarn"), tone: bk.kind === "ok" ? "ok" : "warn", shape: bk.kind === "ok" ? "✓" : "!",
      sub: [T("page-overview.backupLast", { zaman: PU.formatTime(bk.lastAt) || T("pages.dash") }), bk.warnings ? T("page-overview.backupWarnings", { n: bk.warnings }) : "", bk.verifyFailed ? T("page-overview.backupVerifyFail") : ""].filter(Boolean).join(" · ")
    };
    bkCard.label = T("page-overview.cardBackup");
    list.push(K.statCard(bkCard));
    list.push(K.statCard({
      label: T("page-overview.cardDebt"), value: ds.total ? PU.fmtNum(ds.total) : T("page-overview.debtNone"), tone: ds.broken > 0 ? "bad" : ds.overdue > 0 ? "warn" : "ok", shape: ds.broken > 0 ? "✕" : ds.overdue > 0 ? "!" : "✓",
      sub: ds.total ? T("page-overview.debtSub", { kirik: ds.broken, gecikmis: ds.overdue, bekleyen: ds.pending }) : ""
    }));
    list.push(K.statCard({
      label: T("page-overview.cardDecisions"), value: dc.review ? PU.fmtNum(dc.review) : T("page-overview.decisionsNone"), tone: dc.review > 0 ? "warn" : "ok", shape: dc.review > 0 ? "!" : "✓",
      sub: T("page-overview.decisionsSub", { n: dc.review, toplam: dc.total })
    }));
    var hv = hs.status === "green" ? ["page-overview.healthGreen", "ok", "✓", hs.failing ? "page-overview.healthSub" : "page-overview.healthOkSub"] : hs.status === "red" ? ["page-overview.healthRed", "bad", "✕", "page-overview.healthSub"] : ["page-overview.healthUnknown", "warn", "?", "page-overview.healthUnknownSub"];
    list.push(K.statCard({ label: T("page-overview.cardHealth"), value: T(hv[0]), tone: hv[1], shape: hv[2], sub: T(hv[3], { n: hs.failing }) }));
    K.cards(root, list);

    // Bekleyenler kısayolu: sağ paneli açar.
    var pend = K.el("div", "am-pg-actions");
    var label = ts.awaiting > 0 ? T("page-overview.pendingCount", { n: ts.awaiting }) : T("page-overview.pending");
    pend.appendChild(K.button(label, "pending", function () { K.act("setView", { panelOpen: true, panelTab: "approvals" }); }));
    pend.appendChild(K.el("span", "am-pg-note", T("page-overview.pendingNote")));
    root.appendChild(pend);

    liveSection(AM, root);

    var body = K.section(root, T("page-overview.audit"), {});
    var entry = K.ensureData(AM, "audit");
    K.asyncBody(body, entry, function () { K.reload(AM, "audit"); }, function (value) {
      var rows = recentAudit(value, 8);
      if (!rows.length) { body.appendChild(K.emptyCard(T("page-overview.auditEmpty"))); return; }
      K.table(body, {
        caption: T("page-overview.auditCaption"),
        cols: [{ label: T("page-overview.colTime") }, { label: T("page-overview.colActor") }, { label: T("page-overview.colAction") }, { label: T("page-overview.colDecision") }, { label: T("page-overview.colResult") }],
        rows: rows.map(function (r) { return { cells: [r.time || r.ts || T("pages.dash"), r.actor || T("pages.dash"), r.action, r.decision, r.result] }; })
      });
      var more = K.el("div", "am-pg-actions");
      more.appendChild(K.button(T("page-overview.auditAll"), "audit-all", function () { K.act("navigate", "audit"); }));
      body.appendChild(more);
    });
  }

  P.register(ID, {
    title: T("pages.title.overview"), group: "manage", render: render,
    pure: { taskStats: taskStats, providerStatus: providerStatus, providerStats: providerStats, debtStats: debtStats, decisionStats: decisionStats, backupSummary: backupSummary, healthSummary: healthSummary, recentAudit: recentAudit, monitorSummary: monitorSummary, TR: TR }
  });
})();
