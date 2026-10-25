// D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. Ek bölümler 'D9' ile işaretlidir; ADR-016: yetenekler kendiliğinden çalışmaz.
// AgentMom "Görevler ve İş Akışları" sayfası (Faz 11, D3). Yazan: Claude [İP:AgentMom Faz 11 / sayfalar]. Sahip: Yusuf.
// Ne: AM_PAGES.register("tasks", ...). Görev tablosu (AM.state.tasks; satıra tıklama selectTopic ile sohbete geçer) + iş akışları tablosu (AM.state.data.workflows).
// Kural: veri yalnız AM.state.* ve AM.state.data; ağ yok; sunucu metni yalnız textContent; durum şekil + metin. Değiştirme: yalnız sahibi.
"use strict";
(function () {
  var ID = "tasks";
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
    "page-tasks.intro": "Görevler onay akışından, iş akışları iş akışı motorundan gelir. Bir göreve tıklayınca sohbet görünümünde açılır.",
    "page-tasks.tasks": "Görevler", "page-tasks.tasksCaption": "Görev tablosu", "page-tasks.tasksEmpty": "Henüz görev yok.",
    "page-tasks.colTitle": "Başlık", "page-tasks.colState": "Durum", "page-tasks.colAction": "Eylem / hedef", "page-tasks.colTime": "Zaman",
    "page-tasks.open": "Aç: {ad}", "page-tasks.limit": "İlk {n} kayıt gösteriliyor; toplam {toplam}.",
    "page-tasks.workflows": "İş akışları", "page-tasks.wfCaption": "İş akışları tablosu", "page-tasks.wfEmpty": "Henüz iş akışı yok.",
    "page-tasks.wfName": "Ad", "page-tasks.wfState": "Durum", "page-tasks.wfProgress": "Adım ilerlemesi", "page-tasks.wfTime": "Güncelleme",
    "page-tasks.wfSteps": "{yapilan}/{toplam} adım", "page-tasks.wfStepsUnknown": "Adım sayısı bilinmiyor", "page-tasks.wfProgressLabel": "{ad}: {yapilan}/{toplam} adım tamamlandı",
    "page-tasks.noTitle": "(başlıksız)",
    "page-tasks.stalled": "takılmış görünüyor", "page-tasks.stalledLong": "uzun süredir",
    "page-tasks.stalledLabel": "Takılma ayrıntısı: {ad}",
    "page-tasks.stalledText": "Son iz: {dk} dk önce. Bu yalnız bir şüphedir: uzun süren meşru bir iş olabilir. Hiçbir şey kendiliğinden iptal edilmez ya da yönlendirilmez.",
    "page-tasks.attn": "Dikkat sırası",
    "page-tasks.attnDesc": "Onay bekleyen görevleri dikkat bütçenize göre şimdi, bugün ve toplu/sonra olarak sıralar. Yalnız SIRALAR: hiçbir görevi onaylamaz ya da reddetmez; karar sizindir. Yalnız düğmeye bastığınızda hesaplanır.",
    "page-tasks.attnBudget": "Dikkat bütçesi (1-50)",
    "page-tasks.attnRun": "Sırayı göster",
    "page-tasks.attnBad": "Bütçe 1 ile 50 arasında bir tam sayı olmalı.",
    "page-tasks.attnInvalid": "Bütçe geçersiz; istek gönderilmedi",
    "page-tasks.attnErr": "Dikkat sırası alınamadı",
    "page-tasks.attnBadResp": "Sunucu yanıtı okunamadı.",
    "page-tasks.attn.now": "Şimdi",
    "page-tasks.attn.today": "Bugün",
    "page-tasks.attn.batch": "Toplu/sonra",
    "page-tasks.attn.critical": "Kritik",
    "page-tasks.attn.criticalMark": "kritik",
    "page-tasks.attn.risk.critical": "Kritik",
    "page-tasks.attn.risk.high": "Yüksek",
    "page-tasks.attn.risk.medium": "Orta",
    "page-tasks.attn.risk.low": "Düşük",
    "page-tasks.attn.risk.unknown": "Bilinmiyor",
    "page-tasks.attnTotals": "Bütçe: {budget} · bekleyen görev: {bekleyen} · grup: {grup}",
    "page-tasks.attnOver": "Kritik riskli öğe sayısı bütçeyi aşıyor. Kritik olanlar bütçeden bağımsız olarak her zaman 'şimdi' katmanındadır.",
    "page-tasks.attnTruncated": "Uyarı: bekleyen görevlerin hepsi değerlendirilemedi (yalnız en eski ve en yeniler); aradakiler listelenmedi.",
    "page-tasks.attnEmpty": "Onay bekleyen görev yok.",
    "page-tasks.attnCaption": "Dikkat sırası: öncelik sırasıyla gruplanmış onay bekleyen görevler",
    "page-tasks.attnColTier": "Katman",
    "page-tasks.attnColRisk": "Risk",
    "page-tasks.attnColWait": "Bekleme",
    "page-tasks.attnColRepeat": "Tekrar",
    "page-tasks.attnColWhy": "Nedenler",
    "page-tasks.attnMin": "{n} dk",
    "page-tasks.attnRepeat": "{n} aynı görev (gruplandı)",
    "page-tasks.attnNote": "Sunucu notu: {note}"
  };
  if (typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("page-tasks", TR);
  function T(key, vars) { return K.T(key, vars); }

  function arr(v) { return Array.isArray(v) ? v : []; }
  function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  function num(v) { var n = Number(v); return v === null || v === undefined || v === "" || !isFinite(n) ? null : n; }

  var MAX_ROWS = 200;
  var sortTasks = { key: "time", dir: "desc" };
  var sortWf = { key: "time", dir: "desc" };

  // ---- saf mantık ----
  function normTask(t) {
    t = isObj(t) ? t : {};
    var req = isObj(t.request) ? t.request : {};
    return {
      id: PU.safeStr(t.id, 64), title: PU.safeStr(t.title, 300), state: PU.safeStr(t.state, 40), action: PU.safeStr(t.requestedAction, 120),
      target: req.target == null ? "" : PU.safeStr(req.target, 300), createdAt: PU.safeStr(t.createdAt, 40)
    };
  }
  function actionText(r) {
    if (r.action && r.target) return r.action + " → " + r.target;
    return r.action || r.target || "";
  }
  var TASK_GET = {
    title: function (r) { return r.title; },
    state: function (r) { return T(PU.statusInfo(r.state).key); },
    time: function (r) { var t = Date.parse(r.createdAt); return isFinite(t) ? t : null; }
  };
  function taskRows(tasks, sort) {
    var rows = arr(tasks).map(normTask);
    var key = sort && Object.prototype.hasOwnProperty.call(TASK_GET, sort.key) ? sort.key : "time";
    return PU.sortBy(rows, TASK_GET[key], sort && sort.dir === "asc" ? "asc" : "desc");
  }
  function normWorkflow(w) {
    w = isObj(w) ? w : {};
    var done = num(w.stepsDone), total = num(w.stepsTotal);
    var okSteps = total !== null && total > 0 && done !== null && done >= 0;
    var d = okSteps ? Math.min(done, total) : null;
    return {
      id: PU.safeStr(w.id, 64), taskId: w.taskId ? PU.safeStr(w.taskId, 64) : "", title: PU.safeStr(w.title, 300), state: PU.safeStr(w.state, 40),
      done: d, total: okSteps ? total : null, pct: okSteps ? Math.round((d / total) * 100) : null, updatedAt: PU.safeStr(w.updatedAt || w.createdAt, 40)
    };
  }
  var WF_GET = {
    title: function (r) { return r.title; },
    state: function (r) { return T(PU.statusInfo(r.state).key); },
    progress: function (r) { return r.pct; },
    time: function (r) { var t = Date.parse(r.updatedAt); return isFinite(t) ? t : null; }
  };
  function workflowRows(value, sort) {
    var rows = arr(isObj(value) ? value.workflows : value).map(normWorkflow);
    var key = sort && Object.prototype.hasOwnProperty.call(WF_GET, sort.key) ? sort.key : "time";
    return PU.sortBy(rows, WF_GET[key], sort && sort.dir === "asc" ? "asc" : "desc");
  }

  // ---- çizim ----
  function openTopic(id) { if (id) K.act("selectTopic", id); }

  function openButton(label, id, key) {
    return K.button(label, key, function () { openTopic(id); }, "am-pg-linkbtn");
  }

  // Takılma şüphesi (GET /api/status/indicators): yalnız çalışan görevler için ve yalnız şüphe olarak gösterilir (renk + simge + metin; tıklayınca ayrıntı).
  var STALL_OPEN = Object.create(null);
  function stalledMap(AM) {
    var ind = AM.state && isObj(AM.state.indicators) ? AM.state.indicators : null;
    var items = ind && isObj(ind.stalled) ? arr(ind.stalled.items) : [];
    var map = Object.create(null);
    items.filter(isObj).forEach(function (i) {
      var m = num(i.lastTraceMin);
      if (typeof i.taskId === "string" && i.taskId.length <= 64 && m !== null) map[i.taskId] = { lastTraceMin: m, long: i.long === true };
    });
    return map;
  }
  function stateCell(r, stalled, title) {
    var box = K.el("span", "am-pg-statecell");
    box.appendChild(K.stateBadge(r.state));
    var s = PU.normState(r.state) === "running" ? stalled[r.id] : undefined;
    if (s) {
      var open = STALL_OPEN[r.id] === true;
      var b = K.button((s.long ? "✕ " : "▲ ") + T("page-tasks.stalled") + (s.long ? " · " + T("page-tasks.stalledLong") : ""), "stalled:" + r.id, function (ev) { if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation(); STALL_OPEN[r.id] = !open; P.rerender(); }, "am-pg-chip am-pg-chipbtn " + (s.long ? "am-pg-tone-bad" : "am-pg-tone-warn"));
      b.setAttribute("aria-expanded", open ? "true" : "false");
      b.setAttribute("aria-label", T("page-tasks.stalledLabel", { ad: title }));
      box.appendChild(b);
      if (open) {
        var d = K.el("div", "am-pg-note", T("page-tasks.stalledText", { dk: PU.fmtNum(s.lastTraceMin) }));
        d.addEventListener("click", function (ev) { if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation(); });
        box.appendChild(d);
      }
    }
    return box;
  }

  function renderTasks(root, AM) {
    var body = K.section(root, T("page-tasks.tasks"), { count: PU.fmtNum(arr(AM.state && AM.state.tasks).length) });
    var all = taskRows(AM.state && AM.state.tasks, sortTasks);
    if (!all.length) { body.appendChild(K.emptyCard(T("page-tasks.tasksEmpty"))); return; }
    var lim = PU.limitRows(all, MAX_ROWS);
    var stalled = stalledMap(AM);
    K.table(body, {
      caption: T("page-tasks.tasksCaption"),
      cols: [{ label: T("page-tasks.colTitle"), sortKey: "title" }, { label: T("page-tasks.colState"), sortKey: "state" }, { label: T("page-tasks.colAction") }, { label: T("page-tasks.colTime"), sortKey: "time" }],
      sort: sortTasks,
      onSort: function (k) { sortTasks = PU.nextSort(sortTasks, k, k === "time" ? "desc" : "asc"); P.rerender(); },
      rows: lim.shown.map(function (r) {
        var title = r.title || T("page-tasks.noTitle");
        return {
          cells: [openButton(title, r.id, "task:" + r.id), stateCell(r, stalled, title), actionText(r) || T("pages.dash"), PU.formatTime(r.createdAt) || T("pages.dash")],
          onActivate: function () { openTopic(r.id); }
        };
      })
    });
    if (lim.hidden > 0) body.appendChild(K.el("p", "am-pg-note", T("page-tasks.limit", { n: lim.shown.length, toplam: lim.total })));
  }

  function progressCell(r) {
    var box = K.el("div", "am-pg-prog");
    if (r.total === null) { box.appendChild(K.el("span", "am-pg-note", T("page-tasks.wfStepsUnknown"))); return box; }
    var pr = K.el("progress", "am-pg-progress");
    pr.setAttribute("max", String(r.total));
    pr.setAttribute("value", String(r.done));
    pr.setAttribute("aria-label", T("page-tasks.wfProgressLabel", { ad: r.title || T("page-tasks.noTitle"), yapilan: r.done, toplam: r.total }));
    box.appendChild(pr);
    box.appendChild(K.el("span", "am-pg-prog-t", T("page-tasks.wfSteps", { yapilan: r.done, toplam: r.total }) + " (%" + r.pct + ")"));
    return box;
  }

  function renderWorkflows(root, AM) {
    var body = K.section(root, T("page-tasks.workflows"), {});
    var entry = K.ensureData(AM, "workflows");
    K.asyncBody(body, entry, function () { K.reload(AM, "workflows"); }, function (value) {
      var rows = workflowRows(value, sortWf);
      if (!rows.length) { body.appendChild(K.emptyCard(T("page-tasks.wfEmpty"))); return; }
      var lim = PU.limitRows(rows, MAX_ROWS);
      K.table(body, {
        caption: T("page-tasks.wfCaption"),
        cols: [{ label: T("page-tasks.wfName"), sortKey: "title" }, { label: T("page-tasks.wfState"), sortKey: "state" }, { label: T("page-tasks.wfProgress"), sortKey: "progress" }, { label: T("page-tasks.wfTime"), sortKey: "time" }],
        sort: sortWf,
        onSort: function (k) { sortWf = PU.nextSort(sortWf, k, k === "time" ? "desc" : "asc"); P.rerender(); },
        rows: lim.shown.map(function (r) {
          var title = r.title || T("page-tasks.noTitle");
          var first = r.taskId ? openButton(title, r.taskId, "wf:" + r.id) : K.el("span", null, title);
          return { cells: [first, K.stateBadge(r.state), progressCell(r), PU.formatTime(r.updatedAt) || T("pages.dash")], onActivate: r.taskId ? function () { openTopic(r.taskId); } : null };
        })
      });
      if (lim.hidden > 0) body.appendChild(K.el("p", "am-pg-note", T("page-tasks.limit", { n: lim.shown.length, toplam: lim.total })));
    });
  }

  // ---- Dikkat sırası (93): onay bekleyen görevleri bütçeye göre şimdi/bugün/toplu katmanlarına ayırır. Yalnız SIRALAR: görev onaylamaz/reddetmez, kendiliğinden çalışmaz (yalnız düğmeyle ya da yetenekler menüsünden gelince). ----
  var ATTN = { budget: "5", key: null, err: "", lastParam: "" };
  var ATTN_ID = "am-lab-attn";
  function attnBudget(v) {
    var s = typeof v === "string" ? v.trim() : "";
    if (!/^[0-9]{1,2}$/.test(s)) return null;
    var n = parseInt(s, 10);
    return n >= 1 && n <= 50 ? n : null;
  }
  function runAttention() {
    var n = attnBudget(ATTN.budget);
    if (n === null) { ATTN.err = T("page-tasks.attnBad"); ATTN.key = null; P.rerender(); return; }
    ATTN.err = "";
    ATTN.key = "attention:" + n;
    K.act("loadData", "attention", n);
    P.rerender();
  }
  function secOf(param) {
    var m = typeof param === "string" ? /^bolum:([A-Za-z0-9._-]{1,60})(?::[0-9]{1,6})?$/.exec(param) : null;
    return m ? m[1] : "";
  }
  var TIER_KEY = { now: "page-tasks.attn.now", today: "page-tasks.attn.today", batch: "page-tasks.attn.batch" };
  var RISK_TONE = { critical: "bad", high: "warn", medium: "info", low: "ok" };
  function attnSummary(value) {
    var v = isObj(value) ? value : null;
    if (!v || !Array.isArray(v.items)) return null;
    var c = isObj(v.counts) ? v.counts : {};
    return {
      budget: num(v.budget), awaiting: num(v.totalAwaiting), groups: num(v.totalGroups), truncated: v.truncated === true, over: v.overBudget === true,
      counts: { now: num(c.now), today: num(c.today), batch: num(c.batch), critical: num(c.critical) }, note: PU.safeStr(v.note, 700),
      items: v.items.slice(0, 100).filter(isObj).map(function (i) {
        return {
          id: PU.safeStr(i.taskId, 64), title: PU.safeStr(i.title, 200), action: PU.safeStr(i.requestedAction, 120), risk: PU.safeStr(i.riskLevel, 20), score: num(i.riskScore), wait: num(i.waitingMinutes),
          tier: Object.prototype.hasOwnProperty.call(TIER_KEY, i.tier) ? i.tier : "", critical: i.critical === true, count: num(i.count) || 1,
          reasons: arr(i.reasons).slice(0, 3).map(function (r) { return PU.safeStr(r, 200); })
        };
      })
    };
  }
  function attnCount(n) { return n === null ? T("pages.dash") : PU.fmtNum(n); }
  function renderAttention(root, AM, param) {
    var id = secOf(param);
    if (id === ATTN_ID && param !== ATTN.lastParam) { ATTN.lastParam = param; if (attnBudget(ATTN.budget) !== null) { ATTN.err = ""; ATTN.key = "attention:" + attnBudget(ATTN.budget); K.act("loadData", "attention", attnBudget(ATTN.budget)); } }
    var body = K.section(root, T("page-tasks.attn"), { desc: T("page-tasks.attnDesc") });
    var secEl = body.parentNode;
    var headEl = secEl && secEl.children ? secEl.children[0] : null;
    var h = headEl && headEl.children ? headEl.children[0] : null;
    if (h) { h.id = ATTN_ID; if (secEl.setAttribute) secEl.setAttribute("aria-labelledby", ATTN_ID); }
    var form = K.el("div", "am-pg-actions");
    var lab = K.el("label", "am-pg-label", T("page-tasks.attnBudget"));
    var inp = K.el("input", "am-pg-input");
    var inpId = K.nextId("ab");
    lab.setAttribute("for", inpId);
    inp.id = inpId; inp.type = "text"; inp.value = ATTN.budget; inp.maxLength = 2; inp.autocomplete = "off";
    inp.setAttribute("inputmode", "numeric");
    inp.setAttribute("data-am-key", "attn-budget");
    inp.addEventListener("input", function (ev) { if (ev && ev.isComposing) return; ATTN.budget = String(inp.value); });
    form.appendChild(lab); form.appendChild(inp);
    form.appendChild(K.button(T("page-tasks.attnRun"), "attn-run", runAttention));
    body.appendChild(form);
    if (ATTN.err) body.appendChild(K.errorCard(ATTN.err, null, T("page-tasks.attnInvalid")));
    if (!ATTN.key) return;
    var st = PU.dataState(AM.state && AM.state.data ? AM.state.data[ATTN.key] : undefined);
    var live = K.el("div", "am-pg-live");
    live.setAttribute("aria-live", "polite");
    body.appendChild(live);
    K.asyncBody(live, st, runAttention, function (value) {
      var s = attnSummary(value);
      if (!s) { live.appendChild(K.errorCard(T("page-tasks.attnBadResp"), runAttention, T("page-tasks.attnErr"))); return; }
      K.cards(live, [
        K.statCard({ label: T("page-tasks.attn.now"), value: attnCount(s.counts.now), tone: "warn", shape: "!" }),
        K.statCard({ label: T("page-tasks.attn.today"), value: attnCount(s.counts.today), tone: "info", shape: "●" }),
        K.statCard({ label: T("page-tasks.attn.batch"), value: attnCount(s.counts.batch), tone: "muted", shape: "○" }),
        K.statCard({ label: T("page-tasks.attn.critical"), value: attnCount(s.counts.critical), tone: s.counts.critical ? "bad" : "muted", shape: "✕" })
      ]);
      live.appendChild(K.el("p", "am-pg-note", T("page-tasks.attnTotals", { budget: attnCount(s.budget), bekleyen: attnCount(s.awaiting), grup: attnCount(s.groups) })));
      if (s.over) live.appendChild(K.el("p", "am-pg-note", T("page-tasks.attnOver")));
      if (s.truncated) live.appendChild(K.el("p", "am-pg-note", T("page-tasks.attnTruncated")));
      if (!s.items.length) { live.appendChild(K.emptyCard(T("page-tasks.attnEmpty"))); return; }
      K.table(live, {
        caption: T("page-tasks.attnCaption"),
        cols: [{ label: T("page-tasks.colTitle") }, { label: T("page-tasks.attnColTier") }, { label: T("page-tasks.attnColRisk") }, { label: T("page-tasks.attnColWait") }, { label: T("page-tasks.attnColRepeat") }, { label: T("page-tasks.attnColWhy") }],
        rows: s.items.map(function (r) {
          var title = r.title || T("page-tasks.noTitle");
          var tier = r.tier ? K.chip(T(TIER_KEY[r.tier]) + (r.critical ? " · " + T("page-tasks.attn.criticalMark") : ""), r.critical ? "bad" : r.tier === "now" ? "warn" : r.tier === "today" ? "info" : "muted") : K.el("span", null, T("pages.dash"));
          var known = Object.prototype.hasOwnProperty.call(RISK_TONE, r.risk);
          var risk = K.chip((r.risk ? T(known ? "page-tasks.attn.risk." + r.risk : "page-tasks.attn.risk.unknown") : T("pages.dash")) + (r.score === null ? "" : " (" + PU.fmtNum(r.score) + ")"), known ? RISK_TONE[r.risk] : "muted");
          return { cells: [openButton(title, r.id, "attn:" + r.id), tier, risk, r.wait === null ? T("pages.dash") : T("page-tasks.attnMin", { n: PU.fmtNum(r.wait) }), r.count > 1 ? T("page-tasks.attnRepeat", { n: PU.fmtNum(r.count) }) : T("pages.dash"), r.reasons.join(" · ") || T("pages.dash")] };
        })
      });
      if (s.note) live.appendChild(K.el("p", "am-pg-note", T("page-tasks.attnNote", { note: s.note })));
    });
  }

  function render(AM, root, param) {
    root.appendChild(K.el("p", "am-pg-lead", T("page-tasks.intro")));
    renderTasks(root, AM);
    renderAttention(root, AM, param);
    renderWorkflows(root, AM);
  }

  P.register(ID, {
    title: T("pages.title.tasks"), group: "manage", render: render,
    pure: {
      normTask: normTask, attnSummary: attnSummary, attnBudget: attnBudget, actionText: actionText, taskRows: taskRows, normWorkflow: normWorkflow, workflowRows: workflowRows, TR: TR,
      resetSort: function () { sortTasks = { key: "time", dir: "desc" }; sortWf = { key: "time", dir: "desc" }; },
      getSort: function () { return { tasks: sortTasks, workflows: sortWf }; }
    }
  });
})();
