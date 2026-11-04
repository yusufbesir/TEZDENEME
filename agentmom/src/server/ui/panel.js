// AgentMom sağ "Genel bakış" paneli (Faz 11, dilim 2). Sahip: Sonnet [İP:AgentMom Faz 11]. yazan: [Claude#agentmom-faz11-panel]
// Ne: #panel kökünün İÇİNİ çizer (sekmeler, karşılama, konu grupları, onaylar, Faz 10 durum panosu). Açma/kapama ve yeniden boyutlandırma shell.js'indir.
// Güvenlik (Faz 10 kuralları): sunucu verisi yalnız textContent; ağ isteği yok (yalnız AM.actions.*); depolama yok; dinamik sınıf yalnız sabit kümelerden.
// Değiştirme: yalnız sahibi ya da ana oturum; sözleşme docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md bağlayıcıdır.
"use strict";
(function () {
  // ---------- Metinler (panel. önekli) ----------
  var TR = {
    "panel.tabs.label": "Panel sekmeleri",
    "panel.tab.topics": "Konular",
    "panel.tab.approvals": "Onaylar",
    "panel.tab.changes": "Değişiklikler",
    "panel.tab.scheduled": "Zamanlanmış",
    "panel.tab.overview": "Genel bakış",
    "panel.tab.add": "Yeni görev kaydı (giriş kutusuna git)",
    "panel.tool.search": "Konularda ara",
    "panel.tool.filter": "Süzgeç",
    "panel.tool.wide": "Paneli genişlet",
    "panel.tool.narrow": "Paneli daralt",
    "panel.tool.close": "Paneli kapat",
    "panel.greet.title": "Tekrar hoş geldiniz, Yusuf.",
    "panel.greet.waiting": "Sizi bekleyen {n} konu var.",
    "panel.greet.none": "Sizi bekleyen konu yok.",
    "panel.group.waiting": "Sizi bekleyenler",
    "panel.group.running": "Çalışıyor",
    "panel.group.idle": "Boşta",
    "panel.group.resolved": "Çözülmüş",
    "panel.group.resolvedNote": "Çözülmüş konular arşivdedir; hiçbiri silinmez.",
    "panel.more": "Daha fazla göster ({n})",
    "panel.less": "Daha az göster",
    "panel.search.label": "Konu ara",
    "panel.search.placeholder": "Başlık, özet veya model ara",
    "panel.search.clear": "Aramayı temizle",
    "panel.filter.status": "Durum",
    "panel.filter.provider": "Sağlayıcı",
    "panel.filter.all": "Tümü",
    "panel.filter.clear": "Süzgeçleri temizle",
    "panel.unread": "Okunmadı",
    "panel.time.now": "şimdi",
    "panel.time.min": "{n} dk",
    "panel.time.hour": "{n} sa",
    "panel.time.day": "{n} g",
    "panel.time.week": "{n} hf",
    "panel.time.month": "{n} ay",
    "panel.time.year": "{n} yıl",
    "panel.chip.subagents": "{n} alt ajan",
    "panel.chip.progress": "{done}/{total}",
    "panel.chip.progressLabel": "{done} / {total} adım",
    "panel.chip.branch": "Dal veya değişiklik isteği: {name}",
    "panel.chip.model": "Sağlayıcı: {provider} · Model: {model}",
    "panel.chip.modelUnknown": "Model bilinmiyor",
    "panel.chip.none": "belirtilmedi",
    "panel.allow": "İzin ver",
    "panel.deny": "Reddet",
    "panel.act.row": "Konuyu sohbette aç",
    "panel.approvals.title": "Onay bekleyenler",
    "panel.approvals.empty": "Bekleyen onay yok.",
    "panel.approvals.emptyHint": "Bir ajan izin istediğinde eylem, hedef ve neden burada görünür.",
    "panel.approvals.noTask": "Bu konunun görev kaydı bulunamadı; izin vermek için Genel bakış sekmesindeki Görevler listesine bakın.",
    "panel.approvals.action": "Eylem",
    "panel.approvals.target": "Hedef",
    "panel.approvals.reason": "Neden",
    "panel.approvals.why": "Risk nedenleri",
    "panel.approvals.undo": "Geri alma",
    "panel.approvals.sortNote": "Risk azalan sırada",
    "panel.risk.low": "Düşük risk",
    "panel.risk.medium": "Orta risk",
    "panel.risk.high": "Yüksek risk",
    "panel.risk.critical": "KRİTİK risk",
    "panel.risk.unknown": "Risk hesaplanamadı",
    "panel.risk.score": "puan {n}",
    "panel.risk.noReasons": "Gerekçe bildirilmedi.",
    "panel.undo.yes": "Geri alınabilir",
    "panel.undo.partial": "Kısmen geri alınabilir",
    "panel.undo.no": "GERİ ALINAMAZ",
    "panel.undo.unknown": "Geri alınabilirlik bilinmiyor",
    "panel.undo.none": "Geri alma bilgisi yok",
    "panel.undo.effect": "Etki",
    "panel.undo.how": "Nasıl",
    "panel.undo.warn": "Bu eylem geri alınamaz. İzin vermeden önce hedefi dikkatle okuyun.",
    "panel.empty.title": "Henüz konu yok",
    "panel.empty.hint": "Alttaki giriş kutusuna bir görev yazın ya da + düğmesiyle yeni bir görev kaydı başlatın.",
    "panel.noMatch.title": "Eşleşen konu yok",
    "panel.noMatch.hint": "Aramayı değiştirin ya da süzgeçleri temizleyin.",
    "panel.changes.title": "Dal ve çalışma ağacı olan konular",
    "panel.changes.empty": "Henüz dal veya çalışma ağacı yok.",
    "panel.changes.hint": "Bir görev kod değiştirdiğinde dalı ve değişiklik isteği burada görünür.",
    "panel.scheduled.title": "Zamanlanmış işler",
    "panel.scheduled.empty": "Zamanlanmış iş yok.",
    "panel.scheduled.hint": "Zamanlayıcı henüz kurulu değil. Yedek ve yinelenen işler ileride burada listelenecek; bu panel yalnız gösterir, kendiliğinden bir şey çalıştırmaz.",
    "panel.scheduled.next": "Sıradaki: {when}",
    "panel.error.title": "Panel çizilemedi",
    "panel.error.retry": "Yeniden dene",
    "panel.error.status": "Durum modülü (AM_STATUS) yüklenemedi; konular gruplanamıyor.",
    "panel.error.data": "Konu verisi alınamadı: {reason}",
    "panel.loading": "Konular yükleniyor",
    "panel.state.idle": "Boşta",
    "panel.state.running": "Çalışıyor",
    "panel.state.awaiting_approval": "Onay bekliyor",
    "panel.state.done": "Bitti",
    "panel.state.succeeded": "Bitti",
    "panel.state.failed": "Başarısız",
    "panel.state.unavailable": "Kullanılamıyor",
    "panel.state.pending": "Bekliyor",
    "panel.state.approved": "Onaylandı",
    "panel.state.cancelled": "İptal edildi",
    "panel.state.denied": "Reddedildi",
    "panel.ov.debt": "Borçlar",
    "panel.ov.decisions": "Kararlar",
    "panel.ov.skills": "Beceriler",
    "panel.ov.providers": "Sağlayıcılar",
    "panel.ov.tasks": "Görevler",
    "panel.ov.emptyDebt": "Açık borç yok.",
    "panel.ov.emptyDecisions": "Bekleyen karar yok.",
    "panel.ov.emptySkills": "Beceri kaydı yok.",
    "panel.ov.emptyProviders": "Sağlayıcı kaydı yok.",
    "panel.ov.emptyTasks": "Görev yok.",
    "panel.ov.debtBroken": "Kırık",
    "panel.ov.debtOverdue": "Gecikmiş",
    "panel.ov.debtPending": "Bekliyor",
    "panel.ov.overdueDays": "{n} gün gecikmiş",
    "panel.ov.reviewAtRisk": "Riskte",
    "panel.ov.reviewDue": "Gözden geçirme zamanı",
    "panel.ov.reviewOk": "Uygun",
    "panel.ov.skillRisk": "Risk: {risk}",
    "panel.ov.providerCounts": "Doğrulanmış: {verified} · Kısmi: {partial} · Doğrulanmamış: {unverified} · Kullanılamıyor: {unavailable} · Desteklenmiyor: {unsupported}",
    "panel.ov.providerBad": "KULLANILAMIYOR",
    "panel.ov.providerOk": "hazır",
    "panel.ov.providerPartial": "kısmi",
    "panel.ov.noFallback": "Otomatik geçiş yok: kullanılamayan bir sağlayıcı yerine başkası kendiliğinden devreye girmez; karar sizindir.",
    "panel.bk.title": "Yedek",
    "panel.bk.unavailableTitle": "Yedek durumu alınamadı",
    "panel.bk.unavailableHint": "Yedek durumu sunucudan okunamadı. Yedek alınmadı demek değildir; Ayarlar › Yedekleme bölümünden ya da yenileyerek tekrar bakın.",
    "panel.bk.lastBackup": "Son yedek",
    "panel.bk.noBackup": "Henüz yedek yok",
    "panel.bk.folder": "klasör: {dir}",
    "panel.bk.verify": "Son doğrulama",
    "panel.bk.verifyOk": "Geçti",
    "panel.bk.verifyFail": "KALDI",
    "panel.bk.noVerify": "Henüz doğrulanmadı",
    "panel.bk.changes": "Yedeksiz değişiklik",
    "panel.bk.changesN": "{n} değişiklik",
    "panel.bk.decision": "Son karar",
    "panel.bk.noDecision": "Henüz karar kaydı yok",
    "panel.bk.decTaken": "Yedek alındı",
    "panel.bk.decSkipped": "Yedek atlandı",
    "panel.bk.rule": "Kural",
    "panel.bk.ruleText": "{n} değişiklik ve {m} dk sakinlik",
    "panel.bk.ruleNote": "Sabit saat yok: yedek kullanıma göre alınır.",
    "panel.bk.ago.under1": "1 saatten kısa süre önce",
    "panel.bk.ago.hours": "{n} saat önce",
    "panel.bk.ago.days": "{n} gün önce",
    "panel.bk.stripPrefix": "Yedek uyarısı: {text}",
    "panel.bk.stripMore": " (+{n} uyarı daha)",
    "panel.bk.stripGo": "Yedek ayrıntısı için Genel bakış sekmesine geç",
    "panel.bk.warnMark": "{n} yedek uyarısı",
    "panel.bk.w.backup_failed": "Yedek başarısız",
    "panel.bk.w.verify_failed": "Yedek doğrulaması başarısız",
    "panel.bk.w.stale_with_activity": "Yedek eski, değişiklik var",
    "panel.bk.w.scheduler_error": "Zamanlayıcı hatası"
  };

  var registered = false;
  try {
    if (typeof window.AM_REGISTER_TR === "function") { window.AM_REGISTER_TR("panel", TR); registered = true; }
  } catch (e) { registered = false; }

  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function interpolate(s, vars) {
    return String(s).replace(/\{([A-Za-z0-9_]+)\}/g, function (m, n) {
      return vars && has(vars, n) && vars[n] != null ? String(vars[n]) : "";
    });
  }
  // Önce ortak AM_T (kayıtlı metinler), olmazsa bu dosyanın kendi sözlüğü; ikisinde de yoksa görünür işaret.
  function T(key, vars) {
    var out = null;
    if (typeof window.AM_T === "function") {
      try { out = String(window.AM_T(key, vars)); } catch (e) { out = null; }
    }
    if (out !== null && out.indexOf("⟦") !== 0) return out;
    if (has(TR, key)) return interpolate(TR[key], vars);
    return "⟦" + key + "⟧";
  }

  // ---------- Küçük yardımcılar ----------
  var CTRL_RE = /[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  function txt(v) { return String(v == null ? "" : v); }
  function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function clip(v, n) {
    var s = txt(v).replace(CTRL_RE, " ").replace(/\s+/g, " ").trim();
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }
  function fold(v) {
    return txt(v).toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
  }

  // ---------- Saf mantık (pure) ----------
  function relTime(v, now) {
    var t = typeof v === "number" ? v : Date.parse(txt(v));
    if (!isFinite(t)) return "";
    var n = typeof now === "number" ? now : Date.now();
    var s = Math.floor((n - t) / 1000);
    if (s < 45) return T("panel.time.now");
    if (s < 3600) return T("panel.time.min", { n: Math.max(1, Math.floor(s / 60)) });
    if (s < 86400) return T("panel.time.hour", { n: Math.floor(s / 3600) });
    var d = Math.floor(s / 86400);
    if (d < 7) return T("panel.time.day", { n: d });
    if (d < 30) return T("panel.time.week", { n: Math.floor(d / 7) });
    if (d < 365) return T("panel.time.month", { n: Math.floor(d / 30) });
    return T("panel.time.year", { n: Math.floor(d / 365) });
  }

  function countBadge(n) {
    var v = Number(n);
    if (!isFinite(v) || v <= 0) return "";
    if (v > 9) return "9+";
    return String(Math.floor(v));
  }

  var FAMILIES = { haiku: "Haiku", sonnet: "Sonnet", opus: "Opus" };
  function modelBadge(provider, model) {
    var m = /(haiku|sonnet|opus)/i.exec(txt(model));
    if (m) return FAMILIES[String(m[1]).toLowerCase()];
    var s = clip(model, 16);
    if (s && fold(s) !== "unknown" && fold(s) !== "bilinmiyor") return s;
    return "?";
  }

  function progressChip(steps) {
    if (!isObj(steps)) return "";
    var total = Math.floor(Number(steps.total));
    var done = Math.floor(Number(steps.done));
    if (!isFinite(total) || total <= 0) return "";
    if (!isFinite(done) || done < 0) done = 0;
    if (done > total) done = total;
    return done + "/" + total;
  }

  function prText(pr) {
    if (pr == null) return "";
    if (typeof pr === "number" && isFinite(pr) && pr > 0) return "#" + Math.floor(pr);
    if (typeof pr === "string") { var m = /^#?(\d{1,7})$/.exec(pr.trim()); return m ? "#" + m[1] : ""; }
    if (isObj(pr)) return prText(pr.number);
    return "";
  }
  function branchChip(topic) {
    if (!isObj(topic)) return "";
    var b = clip(topic.branch, 28);
    var p = prText(topic.pr);
    if (b && p) return b + " · " + p;
    return b || p;
  }

  function subagentCount(topic) {
    if (!isObj(topic)) return 0;
    var v = topic.subagents;
    var n = Array.isArray(v) ? v.length : Math.floor(Number(v));
    return isFinite(n) && n > 0 ? n : 0;
  }

  function normFilter(f) {
    var out = { status: "all", provider: "all" };
    if (typeof f === "string") { if (f) out.status = clip(f, 40); return out; }
    if (isObj(f)) {
      if (f.status) out.status = clip(f.status, 40) || "all";
      if (f.provider) out.provider = clip(f.provider, 60) || "all";
    }
    return out;
  }
  function filterActive(f) { var n = normFilter(f); return n.status !== "all" || n.provider !== "all"; }

  function haystack(t) {
    return fold([t.title, t.summary, t.model, t.provider, t.branch].map(txt).join(" "));
  }
  function filterTopics(topics, search, filter) {
    var f = normFilter(filter);
    var tokens = fold(clip(search, 100)).split(" ").filter(Boolean);
    return arr(topics).filter(function (t) {
      if (!isObj(t)) return false;
      if (f.status !== "all" && txt(t.state) !== f.status) return false;
      if (f.provider !== "all" && txt(t.provider) !== f.provider) return false;
      if (!tokens.length) return true;
      var h = haystack(t);
      for (var i = 0; i < tokens.length; i++) if (h.indexOf(tokens[i]) === -1) return false;
      return true;
    });
  }

  var HARD_CAP = 200;
  function limitItems(list, limit, expanded) {
    var a = arr(list).slice(0, HARD_CAP);
    var lim = Math.max(0, Math.floor(Number(limit)) || 0);
    if (expanded || a.length <= lim) return { shown: a, hidden: 0 };
    return { shown: a.slice(0, lim), hidden: a.length - lim };
  }

  var GROUP_KEYS = ["waiting", "running", "idle", "resolved"];
  function groupKeyOf(name) {
    var s = fold(name);
    if (/bekle|wait|attention|approval|needs|onay/.test(s)) return "waiting";
    if (/calis|run|work|active/.test(s)) return "running";
    if (/bosta|idle|pause/.test(s)) return "idle";
    if (/cozul|resol|done|archiv|arsiv|closed|finish|bitti/.test(s)) return "resolved";
    return "";
  }
  // AM_STATUS.group çıktısını sabit dört gruba çevirir (kendi gruplama yok); hiçbir konu sessizce düşmez: eşleşmeyenler "boşta" olur.
  function normalizeGroups(res, topics) {
    var byId = {};
    arr(topics).forEach(function (t) { if (isObj(t) && t.id != null) byId[txt(t.id)] = t; });
    var out = { waiting: [], running: [], idle: [], resolved: [] };
    var placed = {};
    function put(key, item) {
      var t = typeof item === "string" || typeof item === "number" ? byId[txt(item)] : item;
      if (!isObj(t) || !key) return;
      var id = txt(t.id);
      if (placed[id]) return;
      placed[id] = true;
      out[key].push(t);
    }
    function listOf(v) { return Array.isArray(v) ? v : isObj(v) ? arr(v.items || v.topics || v.list) : null; }
    if (Array.isArray(res)) {
      res.forEach(function (e) {
        if (!isObj(e)) return;
        var l = listOf(e);
        if (l && !("title" in e)) { var k = groupKeyOf(e.key || e.id || e.name || e.label || ""); l.forEach(function (x) { put(k, x); }); }
        else put(groupKeyOf(e.group), e);
      });
    } else if (isObj(res)) {
      Object.keys(res).forEach(function (name) {
        var l = listOf(res[name]);
        if (l) { var k = groupKeyOf(name); l.forEach(function (x) { put(k, x); }); }
      });
    }
    arr(topics).forEach(function (t) { if (isObj(t) && !placed[txt(t.id)]) put("idle", t); });
    return out;
  }
  function visibleCount(groups) { return groups.waiting.length + groups.running.length + groups.idle.length; }

  function taskFor(topic, tasks) {
    if (!isObj(topic)) return null;
    var ids = [topic.taskId, topic.id].filter(function (x) { return x != null && x !== ""; }).map(txt);
    var list = arr(tasks);
    for (var j = 0; j < ids.length; j++) {
      for (var i = 0; i < list.length; i++) {
        var t = list[i];
        if (isObj(t) && txt(t.id) === ids[j] && t.state === "awaiting_approval") return t;
      }
    }
    return null;
  }

  // Onaylar sekmesi: kaynak önce görev kayıtları (eylem+hedef); konular başlık/neden ekler. Görev kaydı bulunamayan konu "task: null" döner.
  function collectApprovals(topics, tasks) {
    var out = [];
    var seen = {};
    var tl = arr(topics).filter(isObj);
    function topicOf(id) {
      for (var i = 0; i < tl.length; i++) if (txt(tl[i].taskId) === id || txt(tl[i].id) === id) return tl[i];
      return null;
    }
    arr(tasks).forEach(function (t) {
      if (!isObj(t) || t.state !== "awaiting_approval") return;
      var id = txt(t.id);
      var topic = topicOf(id);
      seen[id] = true;
      if (topic) seen[txt(topic.id)] = true;
      out.push({
        id: topic ? txt(topic.id) : id,
        title: clip((topic && topic.title) || t.title, 200),
        action: clip(t.requestedAction, 300),
        target: clip(t.request && t.request.target != null ? t.request.target : "", 300),
        reason: clip((topic && (topic.reason || topic.summary)) || t.reason || "", 300),
        task: t,
        topic: topic
      });
    });
    tl.forEach(function (t) {
      if (t.state !== "awaiting_approval") return;
      var id = txt(t.id);
      if (seen[id] || (t.taskId != null && seen[txt(t.taskId)])) return;
      seen[id] = true;
      out.push({ id: id, title: clip(t.title, 200), action: clip(t.requestedAction, 300), target: clip(t.target, 300), reason: clip(t.reason || t.summary, 300), task: null, topic: t });
    });
    return out;
  }

  // Risk rozeti (şekil + metin + ton; renk tek ipucu değil). Risk yoksa "hesaplanamadı": güvenli varsayım YOK.
  var RISK_RANK = { critical: 4, high: 3, medium: 2, unknown: 1.5, low: 1 }; // bilinmeyen risk "düşük"ten ÖNCE gelir (doğrulanmamış = güvenli değil)
  var RISK_VIEW = { low: ["ok", "check"], medium: ["info", "circle"], high: ["warn", "triangle"], critical: ["bad", "cross"], unknown: ["muted", "ring"] };
  function riskInfo(risk) {
    var r = isObj(risk) ? risk : null;
    var lv = r && has(RISK_VIEW, txt(r.level)) && txt(r.level) !== "unknown" ? txt(r.level) : "unknown";
    var v = RISK_VIEW[lv];
    var n = r && r.score !== null && r.score !== undefined && r.score !== "" && isFinite(Number(r.score)) ? Number(r.score) : null;
    return { level: lv, tone: v[0], shape: v[1], glyph: SHAPES[v[1]], text: T("panel.risk." + lv), score: n, rank: RISK_RANK[lv], known: lv !== "unknown", reasons: r ? arr(r.reasons).slice(0, 8).map(function (x) { return clip(x, 300); }).filter(Boolean) : [] };
  }
  var UNDO_VIEW = { yes: ["ok", "check"], partial: ["warn", "triangle"], no: ["bad", "cross"], unknown: ["muted", "ring"] };
  function undoInfo(sem) {
    if (!isObj(sem)) return { mode: "none", tone: "muted", glyph: SHAPES.ring, text: T("panel.undo.none"), effect: "", undo: "", irreversible: false };
    var rv = has(UNDO_VIEW, txt(sem.reversible)) ? txt(sem.reversible) : "unknown";
    return { mode: rv, tone: UNDO_VIEW[rv][0], glyph: SHAPES[UNDO_VIEW[rv][1]], text: T("panel.undo." + rv), effect: clip(sem.effect, 300), undo: clip(sem.undo, 300), irreversible: rv === "no" };
  }
  // Onaylar risk azalan sıralanır; eşit riskte özgün sıra korunur (kararlı).
  function sortApprovals(list) {
    return arr(list).map(function (a, i) { return { a: a, i: i, r: riskInfo(isObj(a) && isObj(a.task) ? a.task.risk : null).rank }; })
      .sort(function (x, y) { return y.r - x.r || x.i - y.i; }).map(function (x) { return x.a; });
  }

  function approvalMatches(a, search) {
    var tokens = fold(clip(search, 100)).split(" ").filter(Boolean);
    if (!tokens.length) return true;
    var h = fold([a.title, a.action, a.target, a.reason].join(" "));
    for (var i = 0; i < tokens.length; i++) if (h.indexOf(tokens[i]) === -1) return false;
    return true;
  }

  var TONES = { ok: "am-pn-tone--ok", warn: "am-pn-tone--warn", bad: "am-pn-tone--bad", info: "am-pn-tone--info", violet: "am-pn-tone--violet", muted: "am-pn-tone--muted" };
  var STATE_TONE = { idle: "muted", running: "info", awaiting_approval: "warn", done: "ok", succeeded: "ok", failed: "bad", unavailable: "bad", pending: "muted", approved: "ok", cancelled: "muted", denied: "bad" };
  var TONE_SHAPE = { ok: "check", warn: "triangle", bad: "cross", info: "circle", violet: "diamond", muted: "ring" };
  var SHAPES = { circle: "●", ring: "○", square: "■", triangle: "▲", diamond: "◆", check: "✓", cross: "✕", pause: "‖", dot: "•" };

  function toneKey(t) { var k = fold(t); return has(TONES, k) ? k : ""; }
  // Şekil + metin + ton: AM_STATUS.label varsa o belirler; yoksa yerel yedek tablo (yalnız etiket, gruplama değil).
  function statusInfo(state) {
    var raw = null;
    try {
      if (window.AM_STATUS && typeof window.AM_STATUS.label === "function") raw = window.AM_STATUS.label(state);
    } catch (e) { raw = null; }
    var text = "", tone = "", shape = "";
    if (typeof raw === "string") text = clip(raw, 40);
    else if (isObj(raw)) {
      text = clip(raw.text || raw.label || raw.name, 40);
      tone = toneKey(raw.tone);
      shape = fold(raw.shape || raw.glyph || raw.icon);
    }
    var s = txt(state);
    if (!text) text = has(STATE_TONE, s) ? T("panel.state." + s) : clip(s, 24) || "?";
    if (!tone) tone = has(STATE_TONE, s) ? STATE_TONE[s] : "muted";
    if (!has(SHAPES, shape)) shape = TONE_SHAPE[tone];
    return { text: text, tone: tone, shape: shape, glyph: SHAPES[shape] };
  }

  function providerInfo(p) {
    var caps = arr(p && p.capabilities);
    function n(st) { return caps.filter(function (c) { return c && c.status === st; }).length; }
    var c = { verified: n("verified"), partial: n("partial"), unverified: n("unverified"), unavailable: n("unavailable"), unsupported: n("unsupported") };
    var usable = c.verified + c.partial + c.unverified;
    // chat.js providerBad ile AYNI kural: hiçbir yetenek kullanılabilir değilse YA DA 'execute' kullanılamazsa KULLANILAMIYOR (görev çalıştıramayan sağlayıcı sağlam görünmez).
    var exec = caps.filter(function (c) { return c && c.operation === "execute"; })[0];
    var bad = usable === 0 || !!(exec && exec.status === "unavailable");
    return { counts: c, bad: bad, level: bad ? "bad" : c.verified > 0 ? "ok" : c.partial > 0 ? "warn" : "muted" };
  }

  // ---------- Yedek durumu (saf) ----------
  function bkObj(b) { return isObj(b) ? b : null; }
  function pad2(n) { return n < 10 ? "0" + n : String(n); }
  // tr-TR gg.aa.yyyy ss:dd (yerel saat); bozuk tarih boş döner.
  function fmtDate(v) {
    var t = Date.parse(txt(v));
    if (!isFinite(t)) return "";
    var d = new Date(t);
    return pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "." + d.getFullYear() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }
  // 'N saat önce' (tr-TR); 1 saatten azsa ve 48 saati aşınca farklı birim.
  function agoText(hours) {
    var h = Number(hours);
    if (hours == null || hours === "" || !isFinite(h) || h < 0) return "";
    if (h < 1) return T("panel.bk.ago.under1");
    if (h < 48) return T("panel.bk.ago.hours", { n: Math.floor(h) });
    return T("panel.bk.ago.days", { n: Math.floor(h / 24) });
  }
  function dirName(dir) {
    var parts = clip(dir, 200).split(/[\\/]+/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "";
  }
  var BK_WARN_CODES = { backup_failed: 1, verify_failed: 1, stale_with_activity: 1, scheduler_error: 1 };
  function warnTitle(code) {
    return has(BK_WARN_CODES, code) ? T("panel.bk.w." + code) : clip(code, 40) || "?";
  }
  // Okunur uyarı kartları için özet: {code,title,text}
  function backupWarnings(b) {
    var o = bkObj(b);
    if (!o) return [];
    return arr(o.warnings).filter(isObj).slice(0, 10).map(function (w) {
      var code = clip(w.code, 40);
      return { code: code, title: warnTitle(code), text: clip(w.text, 400) };
    });
  }
  function backupBadgeCount(b) { return backupWarnings(b).length; }
  // Şerit satırı: 'Yedek uyarısı: …' (birden çoksa '(+N uyarı daha)'); uyarı yoksa boş.
  function backupStripText(b) {
    var ws = backupWarnings(b);
    if (!ws.length) return "";
    var first = ws[0].text || ws[0].title;
    var s = T("panel.bk.stripPrefix", { text: clip(first, 160) });
    if (ws.length > 1) s += T("panel.bk.stripMore", { n: ws.length - 1 });
    return s;
  }
  function backupRuleText(cfg) {
    if (!isObj(cfg)) return "";
    var n = Number(cfg.minChanges), m = Number(cfg.idleMinutes);
    if (cfg.minChanges == null || cfg.idleMinutes == null || !isFinite(n) || !isFinite(m)) return "";
    return T("panel.bk.ruleText", { n: Math.floor(n), m: Math.floor(m) });
  }
  function decisionLabel(action) {
    var a = fold(action);
    if (a === "backup") return T("panel.bk.decTaken");
    if (a === "skip") return T("panel.bk.decSkipped");
    return clip(action, 30) || "?";
  }

  // ---------- DOM yardımcıları ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = txt(text);
    return e;
  }
  function attr(e, name, value) { e.setAttribute(name, txt(value)); return e; }
  function button(cls, label, act, key) {
    var b = el("button", cls);
    b.type = "button";
    if (label) attr(b, "aria-label", label);
    if (act) attr(b, "data-pn-act", act);
    if (key) attr(b, "data-pn-key", key);
    return b;
  }
  var GLYPH = { chevron: "›", search: "⌕", filter: "≡", expand: "⤢", collapse: "⤡", close: "✕", plus: "+", branch: "⑂", agents: "◈", check: "✓", clock: "◷" };
  function icon(name, size) {
    var s = el("span", "am-pn-ico");
    attr(s, "aria-hidden", "true");
    var made = null;
    try { if (typeof window.AM_ICON === "function") made = window.AM_ICON(name, { size: size || 16 }); } catch (e) { made = null; }
    if (made && made.nodeType === 1) s.appendChild(made);
    else s.textContent = has(GLYPH, name) ? GLYPH[name] : "•";
    return s;
  }
  function walk(node, fn) {
    var kids = node && node.children ? node.children : [];
    for (var i = 0; i < kids.length; i++) { fn(kids[i]); walk(kids[i], fn); }
  }
  function within(root, node) {
    for (var n = node; n; n = n.parentNode) if (n === root) return true;
    return false;
  }
  function climb(node, name, stop) {
    for (var n = node; n && n !== stop; n = n.parentNode) {
      if (n.getAttribute && n.getAttribute(name) != null) return n;
    }
    return null;
  }

  // ---------- Durum ----------
  var S = {
    AM: null, host: null, bound: false,
    groupOpen: { waiting: true, running: true, idle: true, resolved: false },
    expanded: { waiting: false, running: false, idle: false, resolved: false },
    ov: { backup: true }, searchOpen: false, filterOpen: false,
    focusKey: null, approvalMap: {}
  };
  var TABS = ["topics", "approvals", "changes", "scheduled", "overview"];

  function view() { return (S.AM && S.AM.view) || {}; }
  function setView(patch) {
    var AM = S.AM;
    if (!AM) return;
    try {
      if (AM.actions && typeof AM.actions.setView === "function") AM.actions.setView(patch);
      else if (AM.view) Object.keys(patch).forEach(function (k) { AM.view[k] = patch[k]; });
    } catch (e) { /* görünüm yaması uygulanamadı: yerel çizim yine de güncellenir */ }
    render(AM);
  }
  function currentTab() { var t = view().panelTab; return TABS.indexOf(t) !== -1 ? t : "topics"; }

  // ---------- Parçalar ----------
  function topicRow(topic, opts) {
    var AM = S.AM;
    var li = el("li", "am-pn-item");
    var id = txt(topic.id);
    var selected = txt(view().selectedTopicId) === id && id !== "";
    var b = button("am-pn-row" + (selected ? " am-pn-row--sel" : ""), "", "open", "row:" + id);
    attr(b, "data-pn-id", id);
    attr(b, "data-pn-nav", "1");
    if (selected) attr(b, "aria-current", "true");

    var lead = el("span", "am-pn-lead");
    if (topic.unread) {
      lead.appendChild(el("span", "am-pn-unread"));
      lead.appendChild(el("span", "am-pn-sr", T("panel.unread")));
    }
    b.appendChild(lead);

    var main = el("span", "am-pn-main");
    var l1 = el("span", "am-pn-line");
    l1.appendChild(el("span", "am-pn-title", clip(topic.title, 200) || "?"));
    var when = relTime(topic.updatedAt);
    if (when) { var tm = el("span", "am-pn-time", when); tm.title = clip(topic.updatedAt, 40); l1.appendChild(tm); }
    main.appendChild(l1);

    var st = statusInfo(topic.state);
    var l2 = el("span", "am-pn-line");
    var stat = el("span", "am-pn-status " + TONES[st.tone]);
    var shape = el("span", "am-pn-shape", st.glyph);
    attr(shape, "aria-hidden", "true");
    stat.appendChild(shape);
    stat.appendChild(el("span", "am-pn-statustext", st.text));
    l2.appendChild(stat);
    var sum = clip(topic.summary, 200);
    if (sum) l2.appendChild(el("span", "am-pn-summary", sum));
    main.appendChild(l2);

    var chips = el("span", "am-pn-chips");
    var mb = modelBadge(topic.provider, topic.model);
    var mc = el("span", "am-pn-chip am-pn-chip--model" + (mb === "?" ? " am-pn-chip--unknown" : ""), mb);
    mc.title = mb === "?" ? T("panel.chip.modelUnknown") : T("panel.chip.model", { provider: clip(topic.provider, 40) || "-", model: clip(topic.model, 60) || "-" });
    chips.appendChild(mc);
    var bc = branchChip(topic);
    if (bc) {
      var bch = el("span", "am-pn-chip am-pn-chip--branch");
      bch.title = T("panel.chip.branch", { name: bc });
      bch.appendChild(icon("branch", 12));
      bch.appendChild(el("span", "am-pn-chiptext", bc));
      chips.appendChild(bch);
    }
    var sa = subagentCount(topic);
    if (sa) {
      var sch = el("span", "am-pn-chip am-pn-chip--agents");
      sch.appendChild(icon("agents", 12));
      sch.appendChild(el("span", "am-pn-chiptext", T("panel.chip.subagents", { n: sa })));
      chips.appendChild(sch);
    }
    var pc = progressChip(topic.steps);
    if (pc) {
      var pch = el("span", "am-pn-chip am-pn-chip--progress", pc);
      var pp = pc.split("/");
      pch.title = T("panel.chip.progressLabel", { done: pp[0], total: pp[1] });
      chips.appendChild(pch);
    }
    main.appendChild(chips);
    b.appendChild(main);
    li.appendChild(b);

    if (topic.state === "awaiting_approval") {
      var task = taskFor(topic, AM && AM.state && AM.state.tasks);
      if (task) {
        S.approvalMap[txt(task.id)] = task;
        li.appendChild(approveButtons(task, id));
      }
    }
    return li;
  }

  function approveButtons(task, topicId) {
    var box = el("div", "am-pn-actions");
    var tid = txt(task.id);
    var allow = button("am-pn-btn am-pn-btn--allow", "", "approve", "approve:" + topicId);
    allow.textContent = T("panel.allow");
    attr(allow, "data-pn-task", tid);
    attr(allow, "data-pn-nav", "1");
    var deny = button("am-pn-btn am-pn-btn--deny", "", "deny", "deny:" + topicId);
    deny.textContent = T("panel.deny");
    attr(deny, "data-pn-task", tid);
    attr(deny, "data-pn-nav", "1");
    box.appendChild(allow);
    box.appendChild(deny);
    return box;
  }

  function groupSection(key, items, expandedLimit) {
    var sec = el("section", "am-pn-group");
    var open = !!S.groupOpen[key];
    var head = button("am-pn-grouphead", "", "group", "grp:" + key);
    attr(head, "data-pn-group", key);
    attr(head, "data-pn-nav", "1");
    attr(head, "aria-expanded", open ? "true" : "false");
    attr(head, "aria-controls", "am-pn-grp-" + key);
    head.appendChild(icon("chevron", 14));
    head.appendChild(el("span", "am-pn-groupname", T("panel.group." + key)));
    head.appendChild(el("span", "am-pn-count", String(items.length)));
    sec.appendChild(head);
    if (!open) return sec;
    var body = el("div", "am-pn-groupbody");
    attr(body, "id", "am-pn-grp-" + key);
    if (key === "resolved") body.appendChild(el("p", "am-pn-note", T("panel.group.resolvedNote")));
    var lim = limitItems(items, key === "waiting" ? 5 : HARD_CAP, S.expanded[key]);
    var ul = el("ul", "am-pn-list");
    lim.shown.forEach(function (t) { safeAdd(ul, function () { return topicRow(t); }); });
    body.appendChild(ul);
    if (lim.hidden > 0) {
      var more = button("am-pn-more", "", "more", "more:" + key);
      attr(more, "data-pn-group", key);
      attr(more, "data-pn-nav", "1");
      more.textContent = T("panel.more", { n: lim.hidden });
      body.appendChild(more);
    } else if (S.expanded[key] && items.length > 5 && key === "waiting") {
      var less = button("am-pn-more", "", "more", "more:" + key);
      attr(less, "data-pn-group", key);
      attr(less, "data-pn-nav", "1");
      less.textContent = T("panel.less");
      body.appendChild(less);
    }
    sec.appendChild(body);
    return sec;
  }

  // Tek bozuk kayıt bütün listeyi çökertmesin.
  function safeAdd(parent, build) {
    var n;
    try { n = build(); } catch (e) { n = el("li", "am-pn-empty", T("panel.error.data", { reason: clip(e && e.message, 80) })); }
    if (n) parent.appendChild(n);
  }

  function errorCard(message) {
    var c = el("div", "am-pn-error");
    attr(c, "role", "alert");
    c.appendChild(el("strong", "am-pn-errortitle", T("panel.error.title")));
    c.appendChild(el("p", "am-pn-errortext", clip(message, 300)));
    var r = button("am-pn-btn", "", "retry", "retry");
    r.textContent = T("panel.error.retry");
    attr(r, "data-pn-nav", "1");
    c.appendChild(r);
    return c;
  }

  function skeleton() {
    var s = el("div", "am-pn-skel");
    attr(s, "aria-busy", "true");
    attr(s, "role", "status");
    s.appendChild(el("span", "am-pn-sr", T("panel.loading")));
    for (var i = 0; i < 4; i++) {
      var r = el("div", "am-pn-skelrow");
      attr(r, "aria-hidden", "true");
      r.appendChild(el("span", "am-pn-skelbar am-pn-skelbar--l"));
      r.appendChild(el("span", "am-pn-skelbar am-pn-skelbar--s"));
      s.appendChild(r);
    }
    return s;
  }

  function emptyBlock(title, hint) {
    var e = el("div", "am-pn-empty");
    e.appendChild(el("strong", "am-pn-emptytitle", title));
    e.appendChild(el("p", "am-pn-emptyhint", hint));
    return e;
  }

  // ---------- Sekme içerikleri ----------
  function groupsOf(list) {
    if (!window.AM_STATUS || typeof window.AM_STATUS.group !== "function") throw new Error(T("panel.error.status"));
    return normalizeGroups(window.AM_STATUS.group(list), list);
  }

  function compute(AM) {
    var st = AM.state || {};
    var v = AM.view || {};
    var topics = Array.isArray(st.topics) ? st.topics.filter(isObj) : null;
    var m = { topics: topics, loading: false, dataError: "", search: clip(v.panelSearch, 100), filter: normFilter(v.panelFilter) };
    m.loading = topics === null || (!!st.busy && !topics.length && !st.updatedAt);
    if (st.topicsError) m.dataError = clip(st.topicsError, 200);
    if (topics) {
      m.all = groupsOf(topics);
      m.active = filterTopics(topics, m.search, m.filter);
      m.shown = (m.search || filterActive(m.filter)) ? groupsOf(m.active) : m.all;
      m.approvals = collectApprovals(topics, st.tasks);
    } else {
      m.all = { waiting: [], running: [], idle: [], resolved: [] };
      m.shown = m.all;
      m.active = [];
      m.approvals = collectApprovals([], st.tasks);
    }
    return m;
  }

  // Tek satırlık yedek uyarı şeridi (role=status; tıklayınca Genel bakış sekmesi). Uyarı yoksa çizilmez.
  function backupStrip(b) {
    var text = backupStripText(b);
    if (!text) return null;
    var wrap = el("div", "am-pn-bkstrip");
    attr(wrap, "role", "status");
    var bt = button("am-pn-bkstripbtn", "", "bkstrip", "bkstrip");
    attr(bt, "data-pn-nav", "1");
    bt.title = T("panel.bk.stripGo");
    var sh = el("span", "am-pn-shape", SHAPES.triangle);
    attr(sh, "aria-hidden", "true");
    bt.appendChild(sh);
    bt.appendChild(el("span", "am-pn-bkstriptext", text));
    wrap.appendChild(bt);
    return wrap;
  }

  function tabTopics(m) {
    var frag = document.createDocumentFragment();
    var g = el("div", "am-pn-greet");
    g.appendChild(el("h2", "am-pn-hello", T("panel.greet.title")));
    var n = m.all.waiting.length;
    g.appendChild(el("p", "am-pn-sub", n > 0 ? T("panel.greet.waiting", { n: n }) : T("panel.greet.none")));
    frag.appendChild(g);
    var strip = backupStrip(S.AM && S.AM.state && S.AM.state.backup);
    if (strip) frag.appendChild(strip);
    if (m.dataError) frag.appendChild(errorCard(T("panel.error.data", { reason: m.dataError })));
    if (m.loading) { frag.appendChild(skeleton()); return frag; }
    if (!m.topics.length) { frag.appendChild(emptyBlock(T("panel.empty.title"), T("panel.empty.hint"))); return frag; }
    if (!m.active.length) {
      var nm = emptyBlock(T("panel.noMatch.title"), T("panel.noMatch.hint"));
      var clr = button("am-pn-btn", "", "clearall", "clearall");
      clr.textContent = T("panel.filter.clear");
      attr(clr, "data-pn-nav", "1");
      nm.appendChild(clr);
      frag.appendChild(nm);
      return frag;
    }
    GROUP_KEYS.forEach(function (k) {
      if (m.shown[k].length) safeAdd(frag, function () { return groupSection(k, m.shown[k]); });
    });
    return frag;
  }

  // Risk + geri alma bloğu (yalnız yetkili görev kaydından).
  function riskBlock(task) {
    var ri = riskInfo(task ? task.risk : null);
    var ui = undoInfo(task ? task.semantics : null);
    var box = el("div", "am-pn-risk");
    var pill = el("span", "am-pn-pill " + TONES[ri.tone]);
    pill.appendChild(el("span", "am-pn-shape", ri.glyph));
    pill.appendChild(el("span", "am-pn-statustext", ri.text + (ri.score !== null ? " · " + T("panel.risk.score", { n: ri.score }) : "")));
    box.appendChild(pill);
    if (ri.known) {
      box.appendChild(el("div", "am-pn-risk-h", T("panel.approvals.why")));
      if (ri.reasons.length) {
        var ul = el("ul", "am-pn-risk-list");
        ri.reasons.forEach(function (x) { ul.appendChild(el("li", null, x)); });
        box.appendChild(ul);
      } else box.appendChild(el("p", "am-pn-note", T("panel.risk.noReasons")));
    }
    var u = el("div", "am-pn-undo " + TONES[ui.tone] + (ui.irreversible ? " am-pn-undo--hard" : ""));
    if (ui.irreversible) attr(u, "role", "alert");
    var uh = el("div", "am-pn-undo-head");
    uh.appendChild(el("span", "am-pn-shape", ui.glyph));
    uh.appendChild(el("span", "am-pn-undo-k", T("panel.approvals.undo") + ":"));
    uh.appendChild(el("strong", null, ui.text));
    u.appendChild(uh);
    if (ui.effect) u.appendChild(el("div", "am-pn-undo-line", T("panel.undo.effect") + ": " + ui.effect));
    if (ui.undo) u.appendChild(el("div", "am-pn-undo-line", T("panel.undo.how") + ": " + ui.undo));
    if (ui.irreversible) u.appendChild(el("div", "am-pn-undo-warn", T("panel.undo.warn")));
    box.appendChild(u);
    return box;
  }

  function tabApprovals(m) {
    var frag = document.createDocumentFragment();
    var list = sortApprovals(m.approvals.filter(function (a) { return approvalMatches(a, m.search); }));
    var h = el("div", "am-pn-sechead");
    h.appendChild(el("h2", "am-pn-h2", T("panel.approvals.title")));
    h.appendChild(el("span", "am-pn-count", String(list.length)));
    frag.appendChild(h);
    if (m.loading && !list.length) { frag.appendChild(skeleton()); return frag; }
    if (!list.length) { frag.appendChild(emptyBlock(T("panel.approvals.empty"), T("panel.approvals.emptyHint"))); return frag; }
    var ul = el("ul", "am-pn-list");
    list.forEach(function (a) {
      safeAdd(ul, function () {
        var li = el("li", "am-pn-appr");
        var t = button("am-pn-apprtitle", "", "open", "row:" + a.id);
        attr(t, "data-pn-id", a.id);
        attr(t, "data-pn-nav", "1");
        t.textContent = a.title || "?";
        li.appendChild(t);
        var dl = el("dl", "am-pn-kv");
        [["panel.approvals.action", a.action], ["panel.approvals.target", a.target], ["panel.approvals.reason", a.reason]].forEach(function (p) {
          dl.appendChild(el("dt", null, T(p[0])));
          dl.appendChild(el("dd", null, p[1] || T("panel.chip.none")));
        });
        li.appendChild(dl);
        li.appendChild(riskBlock(a.task));
        if (a.task) {
          S.approvalMap[txt(a.task.id)] = a.task;
          li.appendChild(approveButtons(a.task, a.id));
        } else {
          li.appendChild(el("p", "am-pn-note", T("panel.approvals.noTask")));
        }
        return li;
      });
    });
    frag.appendChild(ul);
    return frag;
  }

  function tabChanges(m) {
    var frag = document.createDocumentFragment();
    var h = el("div", "am-pn-sechead");
    h.appendChild(el("h2", "am-pn-h2", T("panel.changes.title")));
    frag.appendChild(h);
    if (m.loading) { frag.appendChild(skeleton()); return frag; }
    var list = m.active.filter(function (t) { return !!branchChip(t) || !!t.worktree; });
    list.sort(function (a, b) { return txt(b.updatedAt) < txt(a.updatedAt) ? -1 : txt(b.updatedAt) > txt(a.updatedAt) ? 1 : 0; });
    if (!list.length) { frag.appendChild(emptyBlock(T("panel.changes.empty"), T("panel.changes.hint"))); return frag; }
    var ul = el("ul", "am-pn-list");
    limitItems(list, HARD_CAP, true).shown.forEach(function (t) { safeAdd(ul, function () { return topicRow(t); }); });
    frag.appendChild(ul);
    return frag;
  }

  function tabScheduled() {
    var frag = document.createDocumentFragment();
    var h = el("div", "am-pn-sechead");
    h.appendChild(el("h2", "am-pn-h2", T("panel.scheduled.title")));
    frag.appendChild(h);
    var items = arr(S.AM && S.AM.state && S.AM.state.scheduled).filter(isObj);
    if (!items.length) { frag.appendChild(emptyBlock(T("panel.scheduled.empty"), T("panel.scheduled.hint"))); return frag; }
    var ul = el("ul", "am-pn-list");
    items.slice(0, 50).forEach(function (s) {
      safeAdd(ul, function () {
        var li = el("li", "am-pn-appr");
        li.appendChild(el("div", "am-pn-apprtitle", clip(s.title || s.name, 200) || "?"));
        var when = clip(s.next || s.nextAt, 40);
        if (when) li.appendChild(el("p", "am-pn-note", T("panel.scheduled.next", { when: when })));
        return li;
      });
    });
    frag.appendChild(ul);
    return frag;
  }

  // Genel bakış: Faz 10 durum panosu (katlanır listeler).
  function ovItem(title, subs, pillText, pillTone) {
    var li = el("li", "am-pn-ovitem");
    var g = el("div", "am-pn-ovmain");
    g.appendChild(el("div", "am-pn-ovtitle", title));
    subs.forEach(function (s) { if (s) g.appendChild(el("div", "am-pn-ovsub", s)); });
    li.appendChild(g);
    if (pillText != null && pillText !== "") {
      var tone = has(TONES, pillTone) ? pillTone : "muted";
      var p = el("span", "am-pn-pill " + TONES[tone]);
      p.appendChild(el("span", "am-pn-shape", SHAPES[TONE_SHAPE[tone]]));
      p.appendChild(el("span", "am-pn-statustext", pillText));
      li.appendChild(p);
    }
    return li;
  }

  function ovSection(id, titleKey, count, fill) {
    var open = !!S.ov[id];
    var sec = el("section", "am-pn-ov");
    var head = button("am-pn-grouphead", "", "ov", "ov:" + id);
    attr(head, "data-pn-ov", id);
    attr(head, "data-pn-nav", "1");
    attr(head, "aria-expanded", open ? "true" : "false");
    attr(head, "aria-controls", "am-pn-ov-" + id);
    head.appendChild(icon("chevron", 14));
    head.appendChild(el("span", "am-pn-groupname", T(titleKey)));
    head.appendChild(el("span", "am-pn-count", String(count)));
    sec.appendChild(head);
    if (open) {
      var body = el("div", "am-pn-groupbody");
      attr(body, "id", "am-pn-ov-" + id);
      fill(body);
      sec.appendChild(body);
    }
    return sec;
  }

  function ovList(body, list, emptyKey, build) {
    if (!list.length) { body.appendChild(el("p", "am-pn-note", T(emptyKey))); return; }
    var ul = el("ul", "am-pn-list");
    list.forEach(function (x) { safeAdd(ul, function () { return build(x); }); });
    body.appendChild(ul);
  }

  var DEBT_TONE = { broken: ["panel.ov.debtBroken", "bad"], overdue: ["panel.ov.debtOverdue", "warn"], pending: ["panel.ov.debtPending", "muted"] };
  var REVIEW_TONE = { at_risk: ["panel.ov.reviewAtRisk", "bad"], review_due: ["panel.ov.reviewDue", "warn"], ok: ["panel.ov.reviewOk", "ok"] };

  function bkCard(kind, title, text) {
    var c = el("div", "am-pn-bkcard am-pn-bkcard--" + (kind === "bad" ? "bad" : "warn"));
    attr(c, "role", "status");
    var h = el("div", "am-pn-bkcardhead");
    var sh = el("span", "am-pn-shape", kind === "bad" ? SHAPES.cross : SHAPES.triangle);
    attr(sh, "aria-hidden", "true");
    h.appendChild(sh);
    h.appendChild(el("strong", "am-pn-bkcardtitle", title));
    c.appendChild(h);
    if (text) c.appendChild(el("p", "am-pn-bkcardtext", text));
    return c;
  }

  function bkLine(parent, label, value, sub) {
    var li = el("li", "am-pn-ovitem");
    var g = el("div", "am-pn-ovmain");
    g.appendChild(el("div", "am-pn-ovtitle", label));
    g.appendChild(el("div", "am-pn-ovsub", value));
    if (sub) g.appendChild(el("div", "am-pn-ovsub", sub));
    li.appendChild(g);
    parent.appendChild(li);
    return li;
  }

  function backupSection(b) {
    var o = bkObj(b);
    var ws = backupWarnings(o);
    return ovSection("backup", "panel.bk.title", o ? ws.length : "?", function (body) {
      if (!o) { body.appendChild(bkCard("bad", T("panel.bk.unavailableTitle"), T("panel.bk.unavailableHint"))); return; }
      ws.forEach(function (w) { body.appendChild(bkCard("warn", w.title, w.text)); });
      var ul = el("ul", "am-pn-list");
      var lb = bkObj(o.lastBackup);
      if (lb) {
        var parts = [fmtDate(lb.at), agoText(o.ageHours)].filter(Boolean).join(" · ");
        bkLine(ul, T("panel.bk.lastBackup"), parts || "?", dirName(lb.dir) ? T("panel.bk.folder", { dir: dirName(lb.dir) }) : "");
      } else bkLine(ul, T("panel.bk.lastBackup"), T("panel.bk.noBackup"));
      var lv = bkObj(o.lastVerify);
      if (lv) {
        var li = bkLine(ul, T("panel.bk.verify"), [lv.ok === true ? T("panel.bk.verifyOk") : T("panel.bk.verifyFail"), fmtDate(lv.at)].filter(Boolean).join(" · "));
        var tone = lv.ok === true ? "ok" : "bad";
        var pill = el("span", "am-pn-pill " + TONES[tone]);
        pill.appendChild(el("span", "am-pn-shape", SHAPES[TONE_SHAPE[tone]]));
        pill.appendChild(el("span", "am-pn-statustext", lv.ok === true ? T("panel.bk.verifyOk") : T("panel.bk.verifyFail")));
        li.appendChild(pill);
        if (lv.ok !== true) {
          var main = li.children[0];
          arr(lv.problems).slice(0, 10).forEach(function (p) { main.appendChild(el("div", "am-pn-ovsub", clip(p, 300))); });
        }
      } else bkLine(ul, T("panel.bk.verify"), T("panel.bk.noVerify"));
      var n = Number(o.changesSince);
      bkLine(ul, T("panel.bk.changes"), T("panel.bk.changesN", { n: isFinite(n) && n > 0 ? Math.floor(n) : 0 }));
      var ld = bkObj(o.lastDecision);
      if (ld) bkLine(ul, T("panel.bk.decision"), [decisionLabel(ld.action), clip(ld.reason, 300)].filter(Boolean).join(": "), fmtDate(ld.at));
      else bkLine(ul, T("panel.bk.decision"), T("panel.bk.noDecision"));
      var rule = backupRuleText(o.config);
      if (rule) bkLine(ul, T("panel.bk.rule"), rule, T("panel.bk.ruleNote"));
      body.appendChild(ul);
    });
  }

  function tabOverview(AM) {
    var st = AM.state || {};
    var debt = arr(st.debt).filter(isObj), decisions = arr(st.decisions).filter(isObj);
    var skills = arr(st.skills).filter(isObj), providers = arr(st.providers).filter(isObj), tasks = arr(st.tasks).filter(isObj);
    var frag = document.createDocumentFragment();

    safeAdd(frag, function () { return backupSection(st.backup); });
    safeAdd(frag, function () {
      return ovSection("debt", "panel.ov.debt", debt.length, function (body) {
        ovList(body, debt.slice(0, 30), "panel.ov.emptyDebt", function (d) {
          var m = has(DEBT_TONE, d.kind) ? DEBT_TONE[d.kind] : null;
          var subs = [clip(d.decisionTitle, 200)];
          if (Number(d.overdueDays) > 0) subs.push(T("panel.ov.overdueDays", { n: Math.floor(Number(d.overdueDays)) }));
          return ovItem(clip(d.text, 300), subs, m ? T(m[0]) : clip(d.kind, 30), m ? m[1] : "muted");
        });
      });
    });
    safeAdd(frag, function () {
      var due = decisions.filter(function (d) { return d.reviewState !== "ok"; });
      return ovSection("decisions", "panel.ov.decisions", due.length, function (body) {
        ovList(body, due.slice(0, 30), "panel.ov.emptyDecisions", function (d) {
          var m = has(REVIEW_TONE, d.reviewState) ? REVIEW_TONE[d.reviewState] : null;
          return ovItem(clip(d.title, 300), arr(d.reviewReasons).slice(0, 5).map(function (r) { return clip(r, 200); }), m ? T(m[0]) : clip(d.reviewState, 30), m ? m[1] : "muted");
        });
      });
    });
    safeAdd(frag, function () {
      var need = skills.filter(function (s) { return s.state === "awaiting_approval"; });
      return ovSection("skills", "panel.ov.skills", need.length, function (body) {
        ovList(body, need.slice(0, 30), "panel.ov.emptySkills", function (s) {
          return ovItem(clip(s.name, 300), [T("panel.ov.skillRisk", { risk: clip(s.riskClass, 40) })], statusInfo("awaiting_approval").text, "warn");
        });
      });
    });
    safeAdd(frag, function () {
      return ovSection("providers", "panel.ov.providers", providers.length, function (body) {
        var anyBad = false;
        ovList(body, providers.slice(0, 30), "panel.ov.emptyProviders", function (p) {
          var info = providerInfo(p);
          if (info.bad) anyBad = true;
          var pill = info.bad ? T("panel.ov.providerBad") : info.level === "ok" ? T("panel.ov.providerOk") : info.level === "warn" ? T("panel.ov.providerPartial") : clip(p.routeKind, 30);
          return ovItem(clip(p.displayName, 200) + " (" + clip(p.id, 60) + ")", [T("panel.ov.providerCounts", info.counts), clip(p.routeKind, 40)], pill, info.level);
        });
        if (anyBad) body.appendChild(el("p", "am-pn-note", T("panel.ov.noFallback")));
      });
    });
    safeAdd(frag, function () {
      var sorted = tasks.slice().sort(function (a, b) { var x = txt(a.createdAt), y = txt(b.createdAt); return x < y ? 1 : x > y ? -1 : 0; }).slice(0, 50);
      return ovSection("tasks", "panel.ov.tasks", tasks.length, function (body) {
        ovList(body, sorted, "panel.ov.emptyTasks", function (t) {
          var li = el("li", "am-pn-ovitem");
          var b = button("am-pn-ovlink", "", "open", "task:" + txt(t.id));
          attr(b, "data-pn-id", txt(t.id));
          attr(b, "data-pn-nav", "1");
          b.appendChild(el("span", "am-pn-ovtitle", clip(t.title, 200) || "?"));
          b.appendChild(el("span", "am-pn-ovsub", clip(t.requestedAction, 120) + " · " + clip(t.createdAt, 40)));
          li.appendChild(b);
          var si = statusInfo(t.state);
          var p = el("span", "am-pn-pill " + TONES[si.tone]);
          p.appendChild(el("span", "am-pn-shape", si.glyph));
          p.appendChild(el("span", "am-pn-statustext", si.text));
          li.appendChild(p);
          return li;
        });
      });
    });
    return frag;
  }

  // ---------- Üst şerit ----------
  function tabButton(id, selected, count, warn) {
    var b = button("am-pn-tab" + (selected ? " am-pn-tab--on" : ""), "", "tab", "tab:" + id);
    attr(b, "role", "tab");
    attr(b, "id", "am-pn-tab-" + id);
    attr(b, "aria-selected", selected ? "true" : "false");
    attr(b, "aria-controls", "am-pn-panel");
    attr(b, "tabindex", selected ? "0" : "-1");
    attr(b, "data-pn-tab", id);
    b.appendChild(el("span", "am-pn-tablabel", T("panel.tab." + id)));
    var badge = countBadge(count);
    if (badge) {
      var bd = el("span", "am-pn-badge", badge);
      bd.title = String(Math.floor(Number(count)));
      b.appendChild(bd);
    }
    var wn = countBadge(warn);
    if (wn) {
      // Uyarı işareti: şekil + sayı + ekran okuyucu metni (yalnız renk değil).
      var wm = el("span", "am-pn-warnmark");
      wm.title = T("panel.bk.warnMark", { n: Math.floor(Number(warn)) });
      var ws = el("span", "am-pn-shape", SHAPES.triangle);
      attr(ws, "aria-hidden", "true");
      wm.appendChild(ws);
      wm.appendChild(el("span", "am-pn-warncount", wn));
      wm.appendChild(el("span", "am-pn-sr", T("panel.bk.warnMark", { n: Math.floor(Number(warn)) })));
      b.appendChild(wm);
    }
    return b;
  }

  function toolButton(name, label, act, pressed) {
    var b = button("am-pn-tool", label, act, "tool:" + act);
    b.title = label;
    if (pressed !== undefined) attr(b, "aria-pressed", pressed ? "true" : "false");
    b.appendChild(icon(name, 16));
    return b;
  }

  function header(m, tab) {
    var v = view();
    var head = el("div", "am-pn-head");
    var row = el("div", "am-pn-tabrow");
    var tl = el("div", "am-pn-tablist");
    attr(tl, "role", "tablist");
    attr(tl, "aria-label", T("panel.tabs.label"));
    var approvals = m.approvals.length;
    var openCount = m.all.waiting.length + m.all.running.length + m.all.idle.length;
    TABS.forEach(function (id) {
      var count = id === "topics" ? openCount : id === "approvals" ? approvals : 0;
      var warn = (id === "topics" || id === "overview") ? backupBadgeCount(S.AM && S.AM.state && S.AM.state.backup) : 0;
      tl.appendChild(tabButton(id, tab === id, count, warn));
    });
    row.appendChild(tl);
    row.appendChild(toolButton("plus", T("panel.tab.add"), "new"));
    head.appendChild(row);

    var tools = el("div", "am-pn-tools");
    var listTab = tab === "topics" || tab === "approvals" || tab === "changes";
    var hasSearch = !!clip(v.panelSearch, 100);
    var fa = filterActive(v.panelFilter);
    if (listTab) {
      tools.appendChild(toolButton("search", T("panel.tool.search"), "searchtoggle", S.searchOpen || hasSearch));
      if (tab !== "approvals") {
        var fb = toolButton("filter", T("panel.tool.filter"), "filtertoggle", S.filterOpen || fa);
        if (fa) fb.appendChild(el("span", "am-pn-activedot"));
        tools.appendChild(fb);
      }
    }
    tools.appendChild(toolButton(v.panelWide ? "collapse" : "expand", v.panelWide ? T("panel.tool.narrow") : T("panel.tool.wide"), "wide", !!v.panelWide));
    tools.appendChild(toolButton("close", T("panel.tool.close"), "close"));
    row.appendChild(tools);

    if (listTab && (S.searchOpen || hasSearch)) {
      var sr = el("div", "am-pn-searchrow");
      var input = el("input", "am-pn-input");
      input.type = "search";
      input.value = clip(v.panelSearch, 100);
      input.placeholder = T("panel.search.placeholder");
      attr(input, "aria-label", T("panel.search.label"));
      attr(input, "data-pn-act", "search");
      attr(input, "data-pn-key", "search");
      attr(input, "maxlength", "100");
      attr(input, "autocomplete", "off");
      sr.appendChild(input);
      if (hasSearch) {
        var cl = toolButton("close", T("panel.search.clear"), "searchclear");
        sr.appendChild(cl);
      }
      head.appendChild(sr);
    }
    if (tab !== "approvals" && listTab && (S.filterOpen || fa)) head.appendChild(filterRow(m, v));
    return head;
  }

  function selectField(labelKey, act, options, current) {
    var wrap = el("label", "am-pn-field");
    wrap.appendChild(el("span", "am-pn-fieldlabel", T(labelKey)));
    var sel = el("select", "am-pn-select");
    attr(sel, "data-pn-act", act);
    attr(sel, "data-pn-key", "sel:" + act);
    var found = false;
    options.forEach(function (o) {
      var op = el("option", null, o.text);
      op.value = o.value;
      if (o.value === current) found = true;
      sel.appendChild(op);
    });
    if (!found) {
      var extra = el("option", null, current);
      extra.value = current;
      sel.appendChild(extra);
    }
    sel.value = current;
    wrap.appendChild(sel);
    return wrap;
  }

  function filterRow(m, v) {
    var f = normFilter(v.panelFilter);
    var row = el("div", "am-pn-filterrow");
    var states = [];
    var providers = [];
    arr(m.topics).forEach(function (t) {
      var s = txt(t.state);
      if (s && states.indexOf(s) === -1) states.push(s);
      var p = clip(t.provider, 60);
      if (p && providers.indexOf(p) === -1) providers.push(p);
    });
    var sOpts = [{ value: "all", text: T("panel.filter.all") }].concat(states.slice(0, 20).map(function (s) { return { value: s, text: statusInfo(s).text }; }));
    var pOpts = [{ value: "all", text: T("panel.filter.all") }].concat(providers.slice(0, 20).map(function (p) { return { value: p, text: p }; }));
    row.appendChild(selectField("panel.filter.status", "filter-status", sOpts, f.status));
    row.appendChild(selectField("panel.filter.provider", "filter-provider", pOpts, f.provider));
    if (filterActive(f)) {
      var c = button("am-pn-btn", "", "filterclear", "filterclear");
      c.textContent = T("panel.filter.clear");
      row.appendChild(c);
    }
    return row;
  }

  // ---------- Çizim ----------
  function focusedKey() {
    var host = S.host;
    var a = typeof document !== "undefined" ? document.activeElement : null;
    if (!host || !a || !within(host, a) || !a.getAttribute) return null;
    var key = a.getAttribute("data-pn-key");
    if (!key) return null;
    var pos = null;
    try { if (typeof a.selectionStart === "number") pos = [a.selectionStart, a.selectionEnd]; } catch (e) { pos = null; }
    return { key: key, pos: pos };
  }

  function restoreFocus(want) {
    if (!want || !S.host) return;
    var hit = null;
    walk(S.host, function (n) {
      if (!hit && n.getAttribute && n.getAttribute("data-pn-key") === want.key) hit = n;
    });
    if (!hit || typeof hit.focus !== "function") return;
    try { hit.focus(); } catch (e) { return; }
    if (want.pos && typeof hit.setSelectionRange === "function") {
      try { hit.setSelectionRange(want.pos[0], want.pos[1]); } catch (e) { /* konum ayarlanamadı */ }
    }
  }

  function render(AM) {
    if (AM) S.AM = AM;
    var host = S.host;
    if (!host || !S.AM) return;
    var want = null;
    try {
      want = S.focusKey ? { key: S.focusKey, pos: null } : focusedKey();
      S.focusKey = null;
      S.approvalMap = {};
      var m = compute(S.AM);
      var tab = currentTab();
      var root = el("div", "am-pn");
      root.appendChild(header(m, tab));
      var body = el("div", "am-pn-body");
      attr(body, "role", "tabpanel");
      attr(body, "id", "am-pn-panel");
      attr(body, "aria-labelledby", "am-pn-tab-" + tab);
      var content = tab === "approvals" ? tabApprovals(m) : tab === "changes" ? tabChanges(m) : tab === "scheduled" ? tabScheduled() : tab === "overview" ? tabOverview(S.AM) : tabTopics(m);
      body.appendChild(content);
      root.appendChild(body);
      host.replaceChildren(root);
    } catch (e) {
      try { host.replaceChildren(errorCard(e && e.message ? e.message : T("panel.error.title"))); } catch (e2) { /* kök bile çizilemiyor: yapılacak güvenli başka şey yok */ }
    }
    restoreFocus(want);
  }

  // ---------- Olaylar ----------
  function act(AM, name, fn) {
    try { if (AM && AM.actions && typeof AM.actions[name] === "function") return AM.actions[name](fn); } catch (e) { /* eylem çağrısı başarısız: çekirdek hata kartını gösterir */ }
    return undefined;
  }

  function navList() {
    var out = [];
    walk(S.host, function (n) { if (n.getAttribute && n.getAttribute("data-pn-nav") === "1" && !n.disabled) out.push(n); });
    return out;
  }

  function onClick(ev) {
    var AM = S.AM;
    var node = climb(ev && ev.target, "data-pn-act", S.host);
    if (!node || !AM) return;
    var a = node.getAttribute("data-pn-act");
    var v = view();
    if (a === "tab") { var id = node.getAttribute("data-pn-tab"); if (TABS.indexOf(id) !== -1) setView({ panelTab: id }); return; }
    if (a === "bkstrip") { setView({ panelTab: "overview" }); return; }
    if (a === "open") { var tid = node.getAttribute("data-pn-id"); if (tid) act(AM, "selectTopic", tid); return; }
    if (a === "approve" || a === "deny") {
      var task = S.approvalMap[node.getAttribute("data-pn-task")];
      if (task) act(AM, a, task);
      return;
    }
    if (a === "group") { var gk = node.getAttribute("data-pn-group"); if (has(S.groupOpen, gk)) { S.groupOpen[gk] = !S.groupOpen[gk]; S.focusKey = "grp:" + gk; render(AM); } return; }
    if (a === "more") { var mk = node.getAttribute("data-pn-group"); if (has(S.expanded, mk)) { S.expanded[mk] = !S.expanded[mk]; S.focusKey = "more:" + mk; render(AM); } return; }
    if (a === "ov") { var ok = node.getAttribute("data-pn-ov"); if (ok) { S.ov[ok] = !S.ov[ok]; S.focusKey = "ov:" + ok; render(AM); } return; }
    if (a === "new") { setView({ focusComposer: true }); return; }
    if (a === "close") { setView({ panelOpen: false }); return; }
    if (a === "wide") { setView({ panelWide: !v.panelWide }); return; }
    if (a === "searchtoggle") { S.searchOpen = !S.searchOpen; S.focusKey = S.searchOpen ? "search" : "tool:searchtoggle"; if (!S.searchOpen && clip(v.panelSearch, 100)) { setView({ panelSearch: "" }); return; } render(AM); return; }
    if (a === "searchclear") { S.focusKey = "search"; setView({ panelSearch: "" }); return; }
    if (a === "filtertoggle") { S.filterOpen = !S.filterOpen; S.focusKey = "tool:filtertoggle"; render(AM); return; }
    if (a === "filterclear") { setView({ panelFilter: { status: "all", provider: "all" } }); return; }
    if (a === "clearall") { S.searchOpen = false; setView({ panelSearch: "", panelFilter: { status: "all", provider: "all" } }); return; }
    if (a === "retry") { act(AM, "refresh"); render(AM); }
  }

  function onInput(ev) {
    var t = ev && ev.target;
    if (!t || !t.getAttribute || t.getAttribute("data-pn-act") !== "search") return;
    setView({ panelSearch: clip(t.value, 100) });
  }

  function onChange(ev) {
    var t = ev && ev.target;
    if (!t || !t.getAttribute) return;
    var a = t.getAttribute("data-pn-act");
    if (a !== "filter-status" && a !== "filter-provider") return;
    var f = normFilter(view().panelFilter);
    var val = clip(t.value, 60) || "all";
    if (a === "filter-status") f.status = val; else f.provider = val;
    S.focusKey = "sel:" + a;
    setView({ panelFilter: f });
  }

  function onKeydown(ev) {
    if (!ev || !S.host) return;
    var key = ev.key;
    var tabEl = climb(ev.target, "data-pn-tab", S.host);
    if (tabEl && (key === "ArrowLeft" || key === "ArrowRight" || key === "Home" || key === "End")) {
      var i = TABS.indexOf(tabEl.getAttribute("data-pn-tab"));
      var next = key === "Home" ? 0 : key === "End" ? TABS.length - 1 : (i + (key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
      if (typeof ev.preventDefault === "function") ev.preventDefault();
      S.focusKey = "tab:" + TABS[next];
      setView({ panelTab: TABS[next] });
      return;
    }
    if (key === "Escape" && ev.target && ev.target.getAttribute && ev.target.getAttribute("data-pn-act") === "search" && clip(ev.target.value, 100)) {
      if (typeof ev.preventDefault === "function") ev.preventDefault();
      S.focusKey = "search";
      setView({ panelSearch: "" });
      return;
    }
    if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Home" && key !== "End") return;
    var inBody = false;
    for (var n = ev.target; n && n !== S.host; n = n.parentNode) if (n.getAttribute && n.getAttribute("role") === "tabpanel") inBody = true;
    if (!inBody) return;
    var items = navList();
    var cur = items.indexOf(climb(ev.target, "data-pn-nav", S.host));
    if (cur === -1) return;
    var to = key === "Home" ? 0 : key === "End" ? items.length - 1 : Math.max(0, Math.min(items.length - 1, cur + (key === "ArrowDown" ? 1 : -1)));
    if (typeof ev.preventDefault === "function") ev.preventDefault();
    if (items[to] && typeof items[to].focus === "function") items[to].focus();
  }

  function init(AM, host) {
    S.AM = AM;
    S.host = host || (typeof document !== "undefined" ? document.getElementById("panel") : null);
    if (!S.host || S.bound) return;
    S.bound = true;
    S.host.addEventListener("click", onClick);
    S.host.addEventListener("input", onInput);
    S.host.addEventListener("change", onChange);
    S.host.addEventListener("keydown", onKeydown);
  }

  function resetForTest() {
    S.AM = null; S.host = null; S.bound = false;
    S.groupOpen = { waiting: true, running: true, idle: true, resolved: false };
    S.expanded = { waiting: false, running: false, idle: false, resolved: false };
    S.ov = { backup: true }; S.searchOpen = false; S.filterOpen = false; S.focusKey = null; S.approvalMap = {};
  }

  window.AM_PANEL = {
    init: init,
    render: render,
    pure: {
      relTime: relTime, countBadge: countBadge, modelBadge: modelBadge, progressChip: progressChip,
      branchChip: branchChip, subagentCount: subagentCount, normFilter: normFilter, filterActive: filterActive,
      filterTopics: filterTopics, limitItems: limitItems, normalizeGroups: normalizeGroups, visibleCount: visibleCount,
      taskFor: taskFor, collectApprovals: collectApprovals, statusInfo: statusInfo, providerInfo: providerInfo,
      backupWarnings: backupWarnings, backupBadgeCount: backupBadgeCount, backupStripText: backupStripText, agoText: agoText,
      riskInfo: riskInfo, undoInfo: undoInfo, sortApprovals: sortApprovals, backupRuleText: backupRuleText, fmtDate: fmtDate, dirName: dirName,
      clip: clip, fold: fold, strings: TR, registered: registered, resetForTest: resetForTest
    }
  };
})();
