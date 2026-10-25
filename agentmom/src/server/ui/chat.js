// D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. Ek bölümler 'D9' ile işaretlidir; ADR-016: yetenekler kendiliğinden çalışmaz.
/*
 * Sahip: Claude (Sonnet) [İP:AgentMom Faz 11, dilim 2] - ORTA SOHBET AKIŞI modülü.
 * yazan: [Claude#agentmom-faz11-chat]
 * Ne: window.AM_CHAT = { init(AM, host), render(AM), pure }. host = #chatView; akış (#feed), karşılama (#welcome),
 *     #scrollDown ve giriş kutusu (#composerForm ...) bu dosya tarafından kurulur.
 * Kural kaynağı: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md + docs/tasarim/arayuz-sozlesmesi.md (güvenlik).
 * Güvenlik: sunucu verisi yalnız textContent/createTextNode ile yazılır (markdown/araç metni AM_MD.render ile);
 *   ağ isteği yok, depolama yok, belirteç yok; eylemler yalnız AM.actions.*; sınıf adları sabit kümeden.
 * Değiştirme: yalnız sahibi ya da ana oturum; sözleşmeye uygun düzeltme.
 */
"use strict";
(function () {
  // ---------------------------------------------------------------- metinler
  var TR = {
    "chat.feedLabel": "Sohbet akışı",
    "chat.hello": "Merhaba Yusuf",
    "chat.helloSub": "Bir komutla başla ya da bir öneri seç. İzin vermeden hiçbir işlem yapılmaz.",
    "chat.suggestLabel": "Öneriler",
    "chat.sugg.durum": "Durumu göster",
    "chat.sugg.onay": "Bekleyen izinler",
    "chat.sugg.borc": "Varsayım borcu",
    "chat.sugg.gorevler": "Görevler",
    "chat.summaryLine": "{tasks} görev · {waiting} izin bekliyor · {broken} kırık borç · {review} gözden geçirme",
    "chat.summaryUnavail": "{n} sağlayıcı KULLANILAMIYOR",
    "chat.summaryEmpty": "Henüz kayıt yok",
    "chat.summaryOpen": "Genel bakış panelini aç",
    "chat.new": "Yeni",
    "chat.scrollDown": "En alta git",
    "chat.edited": "düzenlenmiş",
    "chat.sentTo": "Bir konuya gönderildi",
    "chat.sentToNamed": "{topic} konusuna gönderildi",
    "chat.toolDefault": "Eylem",
    "chat.expandHint": "Ayrıntıyı göster ya da gizle",
    "chat.noDetail": "Ayrıntı yok.",
    "chat.copy": "Kopyala",
    "chat.approval.title": "İzin isteniyor",
    "chat.approval.task": "Görev",
    "chat.approval.action": "Eylem",
    "chat.approval.target": "Hedef",
    "chat.approval.reason": "Neden",
    "chat.approval.allow": "İzin ver",
    "chat.approval.deny": "Reddet",
    "chat.approval.allowFor": "İzin ver: {target}",
    "chat.approval.denyFor": "Reddet: {target}",
    "chat.approval.resolved": "Karar verildi: {state}",
    "chat.risk.label": "Risk",
    "chat.risk.low": "Düşük risk",
    "chat.risk.medium": "Orta risk",
    "chat.risk.high": "Yüksek risk",
    "chat.risk.critical": "KRİTİK risk",
    "chat.risk.unknown": "Risk hesaplanamadı",
    "chat.risk.score": "puan {n}",
    "chat.risk.why": "Neden",
    "chat.risk.noReasons": "Gerekçe bildirilmedi.",
    "chat.undo.label": "Geri alma",
    "chat.undo.yes": "Geri alınabilir",
    "chat.undo.partial": "Kısmen geri alınabilir",
    "chat.undo.no": "GERİ ALINAMAZ",
    "chat.undo.unknown": "Geri alınabilirlik bilinmiyor",
    "chat.undo.none": "Geri alma bilgisi yok",
    "chat.undo.effect": "Etki",
    "chat.undo.how": "Nasıl",
    "chat.undo.warn": "Bu eylem geri alınamaz. İzin vermeden önce hedefi ve etkiyi dikkatle okuyun.",
    "chat.verify.title": "Doğrulama",
    "chat.verify.passed": "{n} / {total} kontrol geçti",
    "chat.verify.none": "Kontrol sonucu yok",
    "chat.verify.ok": "Geçti",
    "chat.verify.bad": "Kaldı",
    "chat.error.title": "Bir şey ters gitti",
    "chat.error.retry": "Yeniden dene",
    "chat.error.render": "Sohbet çizilemedi: {reason}",
    "chat.error.item": "Bu kayıt gösterilemedi.",
    "chat.error.strings": "Metin kaydı yapılamadı (strings.js: AM_REGISTER_TR bulunamadı). Yedek metinler kullanılıyor.",
    "chat.unavailable": "KULLANILAMIYOR",
    "chat.unavailable.title": "Sağlayıcı kullanılamıyor",
    "chat.noFallback": "Otomatik geçiş yok: kullanılamayan bir sağlayıcı yerine başkası kendiliğinden devreye girmez; karar sizindir.",
    "chat.handoff.title": "Devir notu önerisi",
    "chat.handoff.copy": "Notu kopyala",
    "chat.handoff.start": "Yeni konuda devam et",
    "chat.handoff.dismiss": "Şimdilik gerek yok",
    "chat.handoff.pct": "Bağlam %{pct}",
    "chat.older": "Önceki {n} mesajı göster",
    "chat.attach.label": "Ekler",
    "chat.attach.remove": "{name} ekini çıkar",
    "chat.attach.updated": "son güncelleme: {ago} önce",
    "chat.attach.updatedNow": "son güncelleme: şimdi",
    "chat.attach.add": "Dosya ekle",
    "chat.attach.disabled": "Dosya yükleme bu sürümde yok",
    "chat.input.label": "Mesaj",
    "chat.input.placeholder": "Görev yaz ya da / ile komut seç",
    "chat.send": "Gönder",
    "chat.stop": "Durdur",
    "chat.mode": "Mod: her işlem izin ister",
    "chat.model.local": "Yerel kip · model çağrısı yok",
    "chat.model.unknown": "Model bilinmiyor",
    "chat.model.declared": "{model} (bildirilen)",
    "chat.model.label": "Model",
    "chat.ring": "Bağlam doluluğu",
    "chat.ind.group": "Durum göstergeleri",
    "chat.ind.ctx": "bağlam: %{pct}",
    "chat.ind.ctxUnknown": "bağlam: bilinmiyor",
    "chat.ind.ctxTitle": "Bağlam doluluğu %{pct} ({level}). Kullanılan miktar sağlayıcı bildirimli; pencere programın planlama sınırıdır.",
    "chat.ind.ctxUnknownTitle": "Sağlayıcı kullanım miktarını bildirmediği ya da konu seçilmediği için bilinmiyor; tahmin edilmez.",
    "chat.ind.quota": "kota: %{pct}",
    "chat.ind.quotaUnknown": "kota: bilinmiyor",
    "chat.ind.quotaTitle": "Kota kullanımı %{pct} ({level}); sağlayıcı: {prov}; sağlayıcının kendi bildirdiği değer.",
    "chat.ind.quotaUnknownTitle": "Sağlayıcı kota bildirmedi (ya da bildirim eski); tahmin edilmez.",
    "chat.ind.approvals": "{n} onay bekliyor",
    "chat.ind.approvalsCritical": "{n} onay bekliyor ({k} kritik)",
    "chat.ind.approvalsAtLeast": "{n} onay bekliyor (en az {k} kritik)",
    "chat.ind.approvalsPartial": "{n} onay bekliyor (tarama sınırlı)",
    "chat.ind.approvalsTitle": "Bekleyen onaylar. Görevler sayfasındaki dikkat sırasını açar; hiçbir şey kendiliğinden onaylanmaz.",
    "chat.ind.level.ok": "normal",
    "chat.ind.level.warn": "uyarı",
    "chat.ind.level.critical": "kritik",
    "chat.ind.level.unknown": "bilinmiyor",
    "chat.slash.label": "Komutlar",
    "chat.slash.empty": "Eşleşen komut yok",
    "chat.cmd.yardim": "Komut listesini göster",
    "chat.cmd.durum": "Kısa durum özeti",
    "chat.cmd.gorevler": "Görevleri listele",
    "chat.cmd.onay": "Bekleyen izinleri listele",
    "chat.cmd.borc": "Varsayım borcunu göster",
    "chat.cmd.kararlar": "Gözden geçirilecek kararlar",
    "chat.cmd.beceriler": "Becerileri listele",
    "chat.cmd.saglayicilar": "Sağlayıcı durumları",
    "chat.cmd.yetenekler": "Çağırabileceğiniz yetenekler",
    "chat.cmd.yenile": "Verileri yenile",
    "chat.cmd.temizle": "Yazışmayı temizle",
    "chat.branch.merged": "Birleştirilmiş",
    "chat.branch.open": "Açık",
    "chat.branch.closed": "Kapalı",
    "chat.branch.draft": "Taslak",
    "chat.state.pending": "Bekliyor",
    "chat.state.awaiting_approval": "İzin bekliyor",
    "chat.state.approved": "Onaylandı",
    "chat.state.running": "Çalışıyor",
    "chat.state.succeeded": "Tamamlandı",
    "chat.state.done": "Bitti",
    "chat.state.failed": "Başarısız",
    "chat.state.cancelled": "İptal edildi",
    "chat.state.denied": "Reddedildi",
    "chat.state.idle": "Boşta",
    "chat.state.unavailable": "Kullanılamıyor",
    "chat.state.unknown": "Durum bilinmiyor",
    "chat.time.now": "şimdi",
    "chat.time.min": "{n} dk",
    "chat.time.hour": "{n} sa",
    "chat.time.day": "{n} g",
    "chat.time.month": "{n} ay",
    "chat.time.year": "{n} yıl",
    "chat.ago.min": "{n} dk.",
    "chat.ago.hour": "{n} sa.",
    "chat.ago.day": "{n} g.",
    "chat.ago.month": "{n} ay",
    "chat.ago.year": "{n} yıl"
  };

  var registerMissing = false;
  try {
    if (typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("chat", TR);
    else registerMissing = true;
  } catch (e) { registerMissing = true; }

  // ---------------------------------------------------------------- küçük yardımcılar
  var MAX_TEXT = 60000;

  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function str(v, max) {
    var s = v == null ? "" : String(v);
    var lim = max || MAX_TEXT;
    return s.length > lim ? s.slice(0, lim) + "…" : s;
  }
  function fmt(s, vars) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && has(vars, k) && vars[k] != null ? String(vars[k]) : ""; });
  }
  // Kendi anahtarlarımız: bilinmeyen anahtar görünür işaretle belirir (sessiz boş metin yok).
  function T(key, vars) { return has(TR, key) ? fmt(TR[key], vars) : "⟦" + key + "⟧"; }

  var FOLD = { "ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ç": "c", "Ç": "c", "ğ": "g", "Ğ": "g", "ö": "o", "Ö": "o", "ü": "u", "Ü": "u" };
  function foldTr(s) { return str(s).replace(/[ıİşŞçÇğĞöÖüÜ]/g, function (ch) { return FOLD[ch]; }).toLowerCase(); }

  function hash(s) {
    var h = 5381, t = String(s);
    for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + ":" + t.length;
  }

  function toMs(v) {
    if (v == null || v === "") return NaN;
    if (typeof v === "number") return isFinite(v) ? v : NaN;
    if (v instanceof Date) return v.getTime();
    if (typeof v === "object" && typeof v.getTime === "function") return v.getTime();
    var t = Date.parse(String(v));
    return isFinite(t) ? t : NaN;
  }

  // ---------------------------------------------------------------- saf mantık
  // Zaman etiketi: şimdi / 5 dk / 2 sa / 3 g / 2 ay / 1 yıl (tr-TR). Geçersiz zaman: "".
  function unitOf(at, now) {
    var t = toMs(at);
    if (isNaN(t)) return null;
    var n = toMs(now);
    if (isNaN(n)) n = Date.now();
    var sec = Math.max(0, Math.floor((n - t) / 1000));
    var min = Math.floor(sec / 60);
    if (min < 1) return { u: "now", n: 0 };
    var hour = Math.floor(min / 60);
    if (hour < 1) return { u: "min", n: min };
    var day = Math.floor(hour / 24);
    if (day < 1) return { u: "hour", n: hour };
    if (day < 60) return { u: "day", n: day };
    var month = Math.floor(day / 30);
    if (month < 12) return { u: "month", n: month };
    return { u: "year", n: Math.floor(day / 365) };
  }
  function timeLabel(at, now) {
    var r = unitOf(at, now);
    if (!r) return "";
    return T("chat.time." + r.u, { n: r.n });
  }
  // Ek çipi notu: "son güncelleme: 5 sa. önce".
  function agoLabel(at, now) {
    var r = unitOf(at, now);
    if (!r) return "";
    if (r.u === "now") return T("chat.attach.updatedNow");
    return T("chat.attach.updated", { ago: T("chat.ago." + r.u, { n: r.n }) });
  }

  var KINDS = { user: 1, assistant: 1, tool: 1, approval: 1, verify: 1, error: 1, handoff: 1, divider: 1, unavailable: 1 };
  // Öğe -> kart türü. Bilinmeyen/bozuk öğe "unknown".
  function kindOf(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return "unknown";
    var k = typeof item.kind === "string" ? item.kind : "";
    if (!has(KINDS, k)) return "unknown";
    if (k === "error") {
      var c = obj(item.card);
      if (item.state === "unavailable" || c.unavailable === true || c.kind === "unavailable") return "unavailable";
    }
    return k;
  }

  // "Yeni" ayracının yeri: görülen sayıdan sonraki ilk kullanıcı-dışı öğenin dizini; yoksa -1.
  function newDividerIndex(items, seen) {
    if (!Array.isArray(items)) return -1;
    var n = Number(seen);
    if (!isFinite(n) || n <= 0 || n >= items.length) return -1;
    for (var i = Math.floor(n); i < items.length; i++) {
      var k = kindOf(items[i]);
      if (k !== "user" && k !== "divider") return i;
    }
    return -1;
  }

  var COMMANDS = [
    { name: "/yardim", key: "chat.cmd.yardim" },
    { name: "/durum", key: "chat.cmd.durum" },
    { name: "/gorevler", key: "chat.cmd.gorevler" },
    { name: "/onay", key: "chat.cmd.onay" },
    { name: "/borc", key: "chat.cmd.borc" },
    { name: "/kararlar", key: "chat.cmd.kararlar" },
    { name: "/beceriler", key: "chat.cmd.beceriler" },
    { name: "/saglayicilar", key: "chat.cmd.saglayicilar" },
    { name: "/yetenekler", key: "chat.cmd.yetenekler" },
    { name: "/yenile", key: "chat.cmd.yenile" },
    { name: "/temizle", key: "chat.cmd.temizle" }
  ];

  // Giriş "/" ile başlıyor ve boşluk/satır sonu içermiyorsa komut sorgusunu ("/du" -> "du") verir; değilse null.
  function slashQuery(text) {
    var m = /^\/([^\s]*)$/.exec(str(text));
    return m ? m[1] : null;
  }
  // Slash menü süzgeci: önce ad öneki, sonra ad/açıklama içeren; Türkçe harf katlamalı.
  function filterCommands(query) {
    var q = foldTr(query);
    var starts = [], rest = [];
    COMMANDS.forEach(function (c) {
      var nm = foldTr(c.name.slice(1));
      if (nm.indexOf(q) === 0) starts.push(c);
      else if (q && (nm.indexOf(q) !== -1 || foldTr(T(c.key)).indexOf(q) !== -1)) rest.push(c);
    });
    return starts.concat(rest);
  }

  function providerBad(p) {
    var caps = arr(p && p.capabilities);
    if (!caps.length) return false;
    var usable = caps.filter(function (c) { return c && (c.status === "verified" || c.status === "partial" || c.status === "unverified"); }).length;
    if (usable === 0) return true;
    var exec = caps.filter(function (c) { return c && c.operation === "execute"; })[0];
    return !!(exec && exec.status === "unavailable"); // panel.js providerInfo ile aynı kural
  }

  function summaryCounts(state) {
    var st = obj(state);
    var tasks = arr(st.tasks), debt = arr(st.debt), decisions = arr(st.decisions), providers = arr(st.providers);
    return {
      tasks: tasks.length,
      waiting: tasks.filter(function (t) { return t && t.state === "awaiting_approval"; }).length,
      broken: debt.filter(function (d) { return d && d.kind === "broken"; }).length,
      review: decisions.filter(function (d) { return d && d.reviewState && d.reviewState !== "ok"; }).length,
      unavailable: providers.filter(providerBad).length
    };
  }
  // Tek satır durum özeti (karşılama). Hepsi sıfırsa "Henüz kayıt yok"; kullanılamayan sağlayıcı varsa eklenir.
  function summaryLine(c) {
    var s = obj(c);
    var line;
    if (!s.tasks && !s.waiting && !s.broken && !s.review) line = T("chat.summaryEmpty");
    else line = T("chat.summaryLine", { tasks: s.tasks || 0, waiting: s.waiting || 0, broken: s.broken || 0, review: s.review || 0 });
    if (s.unavailable > 0) line += " · " + T("chat.summaryUnavail", { n: s.unavailable });
    return line;
  }

  // Otomatik büyüme: satır sayısı 1..max.
  function growRows(scrollHeight, lineHeight, padY, max) {
    var sh = Number(scrollHeight), lh = Number(lineHeight), pad = Number(padY) || 0, mx = Number(max) || 8;
    if (!isFinite(sh) || !isFinite(lh) || lh <= 0) return 1;
    var rows = Math.round((sh - pad) / lh);
    return Math.max(1, Math.min(mx, rows));
  }

  function findById(list, id) {
    if (id == null) return null;
    var a = arr(list);
    for (var i = 0; i < a.length; i++) if (a[i] && a[i].id === id) return a[i];
    return null;
  }
  function selectedSub(state, view) {
    var subs = arr(obj(state).subsessions);
    var v = obj(view);
    var s = v.selectedSubsessionId != null ? findById(subs, v.selectedSubsessionId) : null;
    if (s) return s;
    if (v.selectedTopicId == null) return null;
    for (var i = 0; i < subs.length; i++) {
      if (subs[i] && subs[i].taskId === v.selectedTopicId && !subs[i].archived) return subs[i];
    }
    return null;
  }
  function providerById(state, id) {
    var list = arr(obj(state).providers);
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
    return null;
  }
  // Model rozeti. Sessiz geri düşme yok: kullanılamayan sağlayıcı = "KULLANILAMIYOR", yerine başkası gösterilmez.
  function modelBadge(state, view) {
    var st = obj(state);
    var sub = selectedSub(st, view);
    var topic = findById(st.topics, obj(view).selectedTopicId);
    var provId = sub && sub.provider != null ? sub.provider : topic && topic.provider != null ? topic.provider : null;
    var prov = provId != null ? providerById(st, provId) : null;
    if ((sub && sub.state === "unavailable") || (prov && providerBad(prov))) {
      return { mode: "unavailable", tone: "bad", text: T("chat.unavailable"), provider: provId == null ? "" : str(provId, 80) };
    }
    if (sub) {
      var m = str(sub.model, 120).trim();
      if (!m || sub.modelSource === "unknown") return { mode: "unknown", tone: "warn", text: T("chat.model.unknown"), provider: "" };
      if (sub.modelSource === "declared") return { mode: "declared", tone: "info", text: T("chat.model.declared", { model: m }), provider: "" };
      return { mode: "run", tone: "info", text: m, provider: "" };
    }
    var cm = st.ctxModel;
    if (cm && typeof cm === "object") cm = cm.model;
    cm = str(cm, 120).trim();
    if (cm) return { mode: "run", tone: "info", text: cm, provider: "" };
    return { mode: "local", tone: "muted", text: T("chat.model.local"), provider: "" };
  }

  function isRunning(state, view) {
    var st = obj(state);
    if (st.running === true) return true;
    var sub = selectedSub(st, view);
    if (sub && sub.state === "running") return true;
    var topic = findById(st.topics, obj(view).selectedTopicId);
    return !!(topic && topic.state === "running");
  }

  // Son `limit` öğeyi verir; gizlenen sayısını bildirir.
  function visibleSlice(items, limit) {
    var a = arr(items);
    var lim = Math.max(1, Number(limit) || 200);
    if (a.length <= lim) return { items: a, hidden: 0 };
    return { items: a.slice(a.length - lim), hidden: a.length - lim };
  }

  var STATE_TONE = {
    running: "info", pending: "muted", awaiting_approval: "warn", approved: "ok", succeeded: "ok", done: "ok",
    failed: "bad", denied: "bad", cancelled: "muted", idle: "muted", unavailable: "bad", error: "bad", ok: "ok", passed: "ok"
  };
  var TONE_SHAPE = { ok: "✓", warn: "▲", bad: "✕", info: "◐", muted: "○" };
  function statusTone(state) { return has(STATE_TONE, state) ? STATE_TONE[state] : "muted"; }
  function stateText(state) {
    var k = "chat.state." + str(state, 40);
    return has(TR, k) ? T(k) : state ? str(state, 60) : T("chat.state.unknown");
  }


  // Risk rozeti: renk tek ipucu değil (şekil + metin + ton). Risk yoksa/bilinmiyorsa "hesaplanamadı" (güvenli varsayım YOK).
  var RISK_BADGE = { low: { tone: "ok", shape: "✓" }, medium: { tone: "info", shape: "◐" }, high: { tone: "warn", shape: "▲" }, critical: { tone: "bad", shape: "✕" } };
  function riskBadge(risk) {
    var r = risk && typeof risk === "object" && !Array.isArray(risk) ? risk : null;
    var lv = r && has(RISK_BADGE, r.level) ? r.level : "unknown";
    var base = lv === "unknown" ? { tone: "muted", shape: "○" } : RISK_BADGE[lv];
    var sc = r && r.score !== null && r.score !== undefined && r.score !== "" && isFinite(Number(r.score)) ? Number(r.score) : null;
    var reasons = r && Array.isArray(r.reasons) ? r.reasons.slice(0, 8).map(function (x) { return str(x, 300); }).filter(Boolean) : [];
    return { level: lv, tone: base.tone, shape: base.shape, text: T("chat.risk." + lv), score: sc, reasons: reasons, known: lv !== "unknown" };
  }
  var UNDO_BADGE = { yes: { tone: "ok", shape: "✓" }, partial: { tone: "warn", shape: "▲" }, no: { tone: "bad", shape: "✕" }, unknown: { tone: "muted", shape: "○" } };
  function undoInfo(sem) {
    var m = sem && typeof sem === "object" && !Array.isArray(sem) ? sem : null;
    if (!m) return { mode: "none", tone: "muted", shape: "○", text: T("chat.undo.none"), effect: "", undo: "", irreversible: false };
    var rv = has(UNDO_BADGE, m.reversible) ? m.reversible : "unknown";
    return { mode: rv, tone: UNDO_BADGE[rv].tone, shape: UNDO_BADGE[rv].shape, text: T("chat.undo." + rv), effect: str(m.effect, 300), undo: str(m.undo, 300), irreversible: rv === "no" };
  }
  var COMMAND_WORD_RE = /^\/[A-Za-z0-9_-]+$/;

  // Durum göstergeleri (bağlam %, kota %, bekleyen onay). UYDURMA YOK: değer yoksa 'bilinmiyor'. Renk tek ipucu değil: simge (✓ ! ✕ ?) + metin + ton.
  // Eşikler sunucudan gelen seviyededir (<%75 normal, >=%75 uyarı, >=%90 kritik). Bekleyen onay 0 ise rozet gösterilmez.
  var IND_SHAPE = { ok: "✓", warn: "!", critical: "✕", unknown: "?" };
  var IND_TONE = { ok: "ok", warn: "warn", critical: "bad", unknown: "muted" };
  function pctText(n) { return String(Math.round(n * 10) / 10).replace(".", ","); }
  function indPct(part) {
    var p = obj(part);
    var ok = typeof p.percent === "number" && isFinite(p.percent) && p.percent >= 0 && has(IND_SHAPE, p.level) && p.level !== "unknown";
    return ok ? { pct: p.percent, level: p.level, prov: str(p.providerId, 60) } : null;
  }
  function indBadge(key, known, textKey, titleKey, unknownTextKey, unknownTitleKey) {
    var level = known ? known.level : "unknown";
    var text = known ? T(textKey, { pct: pctText(known.pct) }) : T(unknownTextKey);
    var title = known ? T(titleKey, { pct: pctText(known.pct), level: T("chat.ind.level." + level), prov: known.prov || "—" }) : T(unknownTitleKey);
    return { key: key, level: level, tone: IND_TONE[level], shape: IND_SHAPE[level], text: text, title: title, aria: text + ", " + T("chat.ind.level." + level), action: null };
  }
  function indicatorBadges(ind) {
    var i = obj(ind);
    var out = [indBadge("ctx", indPct(i.context), "chat.ind.ctx", "chat.ind.ctxTitle", "chat.ind.ctxUnknown", "chat.ind.ctxUnknownTitle"), indBadge("quota", indPct(i.quota), "chat.ind.quota", "chat.ind.quotaTitle", "chat.ind.quotaUnknown", "chat.ind.quotaUnknownTitle")];
    var p = obj(i.pendingApprovals);
    var n = typeof p.count === "number" && isFinite(p.count) && p.count > 0 ? Math.floor(p.count) : 0;
    if (n > 0) {
      var k = typeof p.critical === "number" && isFinite(p.critical) && p.critical > 0 ? Math.floor(p.critical) : 0;
      var level = k > 0 ? "critical" : "warn";
      // Tarama sınırlıysa (500'ü aşan bekleyen) kritik sayısı yalnız alt sınırdır: 'en az K'.
      var cut = p.truncated === true;
      var text = k > 0 ? T(cut ? "chat.ind.approvalsAtLeast" : "chat.ind.approvalsCritical", { n: n, k: k }) : T(cut ? "chat.ind.approvalsPartial" : "chat.ind.approvals", { n: n });
      out.push({ key: "approvals", level: level, tone: IND_TONE[level], shape: IND_SHAPE[level], text: text, title: T("chat.ind.approvalsTitle"), aria: text, action: "approvals" });
    }
    return out;
  }

  var pure = {
    timeLabel: timeLabel, agoLabel: agoLabel, kindOf: kindOf, newDividerIndex: newDividerIndex,
    slashQuery: slashQuery, filterCommands: filterCommands, commands: COMMANDS.map(function (c) { return c.name; }),
    summaryCounts: summaryCounts, summaryLine: summaryLine, growRows: growRows, modelBadge: modelBadge,
    isRunning: isRunning, visibleSlice: visibleSlice, statusTone: statusTone, stateText: stateText,
    foldTr: foldTr, hash: hash, text: T, riskBadge: riskBadge, undoInfo: undoInfo, indicatorBadges: indicatorBadges
  };

  // ---------------------------------------------------------------- DOM yardımcıları
  var TONE_CLASS = { ok: "am-chat-tone-ok", warn: "am-chat-tone-warn", bad: "am-chat-tone-bad", info: "am-chat-tone-info", muted: "am-chat-tone-muted" };
  function toneCls(t) { return has(TONE_CLASS, t) ? TONE_CLASS[t] : TONE_CLASS.muted; }
  var ICON_FALLBACK = { "chevron-down": "▾", "arrow-down": "↓", plus: "+", close: "×", copy: "⧉", branch: "⑂", stop: "■", send: "↑", alert: "▲", check: "✓" };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }
  function btn(cls, text, label) {
    var b = el("button", cls, text);
    b.type = "button";
    if (label) b.setAttribute("aria-label", label);
    return b;
  }
  // AM_ICON (icons.js) varsa onunla; yoksa/başarısızsa metin simgesi.
  function icon(name, size) {
    var n = null;
    try {
      if (typeof window.AM_ICON === "function") n = window.AM_ICON(name, { size: size || 16 });
    } catch (e) { n = null; }
    if (n && n.nodeType === 1) { n.setAttribute("aria-hidden", "true"); return n; }
    var s = el("span", "am-chat-glyph", has(ICON_FALLBACK, name) ? ICON_FALLBACK[name] : "•");
    s.setAttribute("aria-hidden", "true");
    return s;
  }

  // AM_STATUS.label(state) şekli sözleşmede kesin değil: nesne {text|label, tone, shape}, dizge ya da düğüm olabilir.
  function statusInfo(state) {
    var info = { tone: statusTone(state), shape: null, text: stateText(state), node: null };
    info.shape = TONE_SHAPE[info.tone];
    try {
      if (window.AM_STATUS && typeof window.AM_STATUS.label === "function") {
        var r = window.AM_STATUS.label(state);
        if (typeof r === "string" && r) info.text = str(r, 80);
        else if (r && r.nodeType === 1) info.node = r;
        else if (r && typeof r === "object") {
          var tx = r.text != null ? r.text : r.label;
          if (tx != null && String(tx)) info.text = str(tx, 80);
          if (typeof r.tone === "string" && has(TONE_CLASS, r.tone)) { info.tone = r.tone; info.shape = TONE_SHAPE[r.tone]; }
          if (typeof r.shape === "string" && r.shape.length > 0 && r.shape.length <= 2) info.shape = r.shape;
        }
      }
    } catch (e) { /* yerel etikete düş */ }
    return info;
  }
  function statusDot(info) {
    if (info.node) { try { return info.node.cloneNode(true); } catch (e) { /* aşağıdaki yedek */ } }
    var d = el("span", "am-chat-dot " + toneCls(info.tone), info.shape || "○");
    d.setAttribute("aria-hidden", "true");
    return d;
  }

  var uid = 0;
  function nextId(prefix) { uid += 1; return prefix + uid; }

  // ---------------------------------------------------------------- modül durumu
  var AMref = null;
  var mounted = false;
  var ui = {};
  var stick = true;
  var lastTopicKey = null;
  var seen = {};
  var drafts = {};
  var openCards = {};
  var dismissed = {};
  var limits = {};
  var nodes = {};
  var slash = { open: false, index: 0, list: [], dismissedFor: null };
  var attachSig = "";
  var welcomeSig = "";

  function topicKey(view) { return view && view.selectedTopicId != null ? String(view.selectedTopicId) : "_"; }

  function onCopy(t) {
    var a = AMref && AMref.actions;
    if (a && typeof a.copyText === "function") a.copyText(String(t));
  }

  // Metin işleme yalnız AM_MD ile; AM_MD yoksa ya da hata verirse düz metin (textContent) paragrafları.
  function mdInto(parent, text) {
    var t = str(text);
    try {
      if (window.AM_MD && typeof window.AM_MD.render === "function") {
        var frag = window.AM_MD.render(t, { onCopy: onCopy });
        if (frag && frag.nodeType) { parent.appendChild(frag); return; }
      }
    } catch (e) { /* düz metne düş */ }
    t.split(/\n{2,}/).forEach(function (para) {
      var p = el("p", "am-chat-plain", para);
      parent.appendChild(p);
    });
  }

  // ---------------------------------------------------------------- kart kurucuları
  function foldCard(key, o) {
    var tone = has(TONE_CLASS, o.tone) ? o.tone : "muted";
    var wrap = el("div", "am-chat-card am-chat-fold " + toneCls(tone));
    var bodyId = nextId("am-chat-body-");
    var open = has(openCards, key) ? !!openCards[key] : !!o.open;
    var head = el("button", "am-chat-fold-head");
    head.type = "button";
    head.setAttribute("aria-expanded", open ? "true" : "false");
    head.setAttribute("aria-controls", bodyId);
    head.title = T("chat.expandHint");
    head.appendChild(statusDot(o.status));
    var sr = el("span", "am-chat-sr", o.status.text + ": ");
    head.appendChild(sr);
    head.appendChild(el("span", "am-chat-fold-name", o.title));
    head.appendChild(el("span", "am-chat-fold-sum", o.summary));
    if (o.meta) head.appendChild(el("span", "am-chat-fold-meta", o.meta));
    var chev = icon("chevron-down", 14);
    var chevWrap = el("span", "am-chat-chev");
    chevWrap.appendChild(chev);
    head.appendChild(chevWrap);
    var body = el("div", "am-chat-fold-body");
    body.id = bodyId;
    body.hidden = !open;
    if (open) wrap.classList.add("am-chat-open");
    o.fill(body);
    head.addEventListener("click", function () {
      var now = body.hidden;
      body.hidden = !now;
      head.setAttribute("aria-expanded", now ? "true" : "false");
      if (now) wrap.classList.add("am-chat-open"); else wrap.classList.remove("am-chat-open");
      openCards[key] = now;
    });
    wrap.appendChild(head);
    wrap.appendChild(body);
    return wrap;
  }

  function kvRow(label, value) {
    var r = el("div", "am-chat-kv");
    r.appendChild(el("span", "am-chat-k", label));
    r.appendChild(el("span", "am-chat-v", str(value, 2000)));
    return r;
  }

  function diffBlock(text) {
    var pre = el("pre", "am-chat-pre am-chat-diff");
    pre.tabIndex = 0;
    str(text).split(/\r?\n/).forEach(function (line) {
      var c = line.charAt(0);
      var cls = c === "+" ? "am-chat-add" : c === "-" ? "am-chat-del" : c === "@" ? "am-chat-hunk" : "am-chat-ctx";
      pre.appendChild(el("span", "am-chat-line " + cls, line + "\n"));
    });
    return pre;
  }

  function userNode(item) {
    var card = obj(item.card);
    var wrap = el("div", "am-chat-msg am-chat-msg--user");
    wrap.appendChild(el("div", "am-chat-bubble", str(item.text)));
    var notes = [];
    if (card.edited === true || item.edited === true) notes.push(T("chat.edited"));
    if (typeof card.sentTo === "string" && card.sentTo) notes.push(T("chat.sentToNamed", { topic: str(card.sentTo, 80) }));
    else if (card.sent === true || card.sentTo === true) notes.push(T("chat.sentTo"));
    if (typeof card.note === "string" && card.note) notes.push(str(card.note, 160));
    if (notes.length) wrap.appendChild(el("div", "am-chat-note", notes.join(" · ")));
    return wrap;
  }

  var BRANCH_TONE = { merged: "ok", open: "info", closed: "muted", draft: "muted" };
  function chipsOf(card) {
    var list = arr(card.chips).slice(0, 6);
    if (card.branch && typeof card.branch === "object") list.push(Object.assign({ kind: "branch" }, card.branch));
    if (card.pr && typeof card.pr === "object") list.push(Object.assign({ kind: "pr" }, card.pr));
    return list;
  }
  function chipNode(c) {
    c = obj(c);
    var chip = el("span", "am-chat-chip");
    chip.appendChild(icon("branch", 14));
    chip.appendChild(el("span", "am-chat-chip-label", str(c.label || c.name || (c.kind === "pr" ? "PR" : ""), 120)));
    if (typeof c.state === "string" && has(BRANCH_TONE, c.state)) {
      chip.appendChild(el("span", "am-chat-chip-state " + toneCls(BRANCH_TONE[c.state]), T("chat.branch." + c.state)));
    }
    return chip;
  }

  function assistantNode(item) {
    var card = obj(item.card);
    var wrap = el("div", "am-chat-msg am-chat-msg--assistant");
    var prose = el("div", "am-chat-prose");
    mdInto(prose, item.text);
    wrap.appendChild(prose);
    var chips = chipsOf(card);
    if (chips.length) {
      var row = el("div", "am-chat-chips");
      chips.forEach(function (c) { row.appendChild(chipNode(c)); });
      wrap.appendChild(row);
    }
    return wrap;
  }

  function toolNode(AM, item, key) {
    var card = obj(item.card);
    var name = str(card.name || card.tool, 120) || T("chat.toolDefault");
    var firstLine = str(item.text, 200).split(/\r?\n/)[0];
    var summary = str(card.summary, 300) || firstLine;
    var state = str(item.state || card.state, 40);
    var status = statusInfo(state);
    return foldCard(key, {
      tone: status.tone, status: status, title: name, summary: summary, meta: timeLabel(item.at),
      open: state === "failed",
      fill: function (body) {
        var any = false;
        arr(card.rows).slice(0, 30).forEach(function (r) {
          r = obj(r);
          body.appendChild(kvRow(str(r.label, 80), r.value));
          any = true;
        });
        if (typeof card.detail === "string" && card.detail) { var d = el("div", "am-chat-prose"); mdInto(d, card.detail); body.appendChild(d); any = true; }
        if (typeof card.diff === "string" && card.diff) { body.appendChild(diffBlock(card.diff)); any = true; }
        if (typeof card.output === "string" && card.output) {
          var pre = el("pre", "am-chat-pre", str(card.output));
          pre.tabIndex = 0;
          body.appendChild(pre);
          any = true;
        }
        if (item.text && item.text !== summary && !any) { var t = el("div", "am-chat-prose"); mdInto(t, item.text); body.appendChild(t); any = true; }
        if (!any) body.appendChild(el("div", "am-chat-muted", T("chat.noDetail")));
      }
    });
  }

  function verifyNode(AM, item, key) {
    var card = obj(item.card);
    var checks = arr(card.checks).slice(0, 60);
    var failed = checks.filter(function (c) { return c && c.ok === false; }).length;
    var passed = checks.filter(function (c) { return c && c.ok === true; }).length;
    var total = Number.isFinite(Number(card.total)) ? Number(card.total) : checks.length;
    if (Number.isFinite(Number(card.passed))) passed = Number(card.passed);
    var state = str(item.state || card.state, 40);
    var tone = failed > 0 || state === "failed" ? "bad" : total > 0 && passed >= total ? "ok" : statusTone(state);
    var status = { tone: tone, shape: TONE_SHAPE[tone], text: tone === "ok" ? T("chat.verify.ok") : tone === "bad" ? T("chat.verify.bad") : stateText(state), node: null };
    var summary = total > 0 ? T("chat.verify.passed", { n: passed, total: total }) : (str(card.summary, 300) || T("chat.verify.none"));
    return foldCard(key, {
      tone: tone, status: status, title: str(card.title, 120) || T("chat.verify.title"), summary: summary, meta: timeLabel(item.at),
      open: tone === "bad",
      fill: function (body) {
        if (!checks.length) { body.appendChild(el("div", "am-chat-muted", item.text ? str(item.text) : T("chat.verify.none"))); return; }
        checks.forEach(function (c) {
          c = obj(c);
          var r = el("div", "am-chat-check");
          var ok = c.ok === true;
          var g = el("span", "am-chat-dot " + toneCls(ok ? "ok" : "bad"), ok ? "✓" : "✕");
          g.setAttribute("aria-hidden", "true");
          r.appendChild(g);
          r.appendChild(el("span", "am-chat-sr", (ok ? T("chat.verify.ok") : T("chat.verify.bad")) + ": "));
          r.appendChild(el("span", "am-chat-check-name", str(c.name, 200)));
          if (c.detail) r.appendChild(el("span", "am-chat-muted am-chat-check-detail", str(c.detail, 400)));
          body.appendChild(r);
        });
      }
    });
  }

  function taskFor(AM, item) {
    var card = obj(item.card);
    var tasks = arr(AM.state && AM.state.tasks);
    var id = card.taskId != null ? card.taskId : item.taskId != null ? item.taskId : card.task && card.task.id != null ? card.task.id : null;
    if (id != null) { var t = findById(tasks, id); if (t) return t; }
    // Yetkili kayıt yalnız çekirdeğin AM.state.tasks listesidir: zaman çizelgesindeki kart verisi (card.task vb.) ASLA onay düğmesi/gösterimi için kullanılmaz.
    return null;
  }

  // Risk + geri alma bloğu: YALNIZ yetkili görev kaydından (AM.state.tasks) okunur.
  function riskBlock(task) {
    var rb = riskBadge(task ? task.risk : null);
    var ui = undoInfo(task ? task.semantics : null);
    var box = el("div", "am-chat-risk");
    var head = el("div", "am-chat-risk-head");
    var chip = el("span", "am-chat-risk-badge " + toneCls(rb.tone));
    var g = el("span", "am-chat-risk-shape", rb.shape);
    g.setAttribute("aria-hidden", "true");
    chip.appendChild(g);
    chip.appendChild(el("span", null, rb.text + (rb.score !== null ? " · " + T("chat.risk.score", { n: rb.score }) : "")));
    head.appendChild(chip);
    box.appendChild(head);
    if (rb.known) {
      var why = el("div", "am-chat-risk-why");
      why.appendChild(el("span", "am-chat-k", T("chat.risk.why")));
      if (rb.reasons.length) {
        var ul = el("ul", "am-chat-risk-list");
        rb.reasons.forEach(function (x) { ul.appendChild(el("li", null, x)); });
        why.appendChild(ul);
      } else why.appendChild(el("span", "am-chat-muted", T("chat.risk.noReasons")));
      box.appendChild(why);
    }
    var undo = el("div", "am-chat-undo " + toneCls(ui.tone) + (ui.irreversible ? " am-chat-undo--hard" : ""));
    if (ui.irreversible) undo.setAttribute("role", "alert");
    var uh = el("div", "am-chat-undo-head");
    var ug = el("span", "am-chat-risk-shape", ui.shape);
    ug.setAttribute("aria-hidden", "true");
    uh.appendChild(ug);
    uh.appendChild(el("span", "am-chat-k", T("chat.undo.label") + ":"));
    uh.appendChild(el("strong", null, ui.text));
    undo.appendChild(uh);
    if (ui.effect) undo.appendChild(kvRow(T("chat.undo.effect"), ui.effect));
    if (ui.undo) undo.appendChild(kvRow(T("chat.undo.how"), ui.undo));
    if (ui.irreversible) undo.appendChild(el("div", "am-chat-undo-warn", T("chat.undo.warn")));
    box.appendChild(undo);
    return box;
  }

  function approvalNode(AM, item) {
    var card = obj(item.card);
    var task = taskFor(AM, item);
    var live = !!(task && task.state === "awaiting_approval");
    var req = task && task.request && typeof task.request === "object" ? task.request : {};
    // Eylem ve hedef YALNIZ yetkili görev kaydından gelir (kart alanları göz ardı edilir: sahte/eski kart gerçek eylemi gizleyemez).
    var action = str(task ? task.requestedAction : "", 300);
    var target = str(task ? req.target : "", 500);
    var node = el("div", "am-card am-card--approval am-chat-card am-chat-approval " + toneCls(live ? "warn" : statusTone(item.state)));
    node.setAttribute("role", "group");
    var title = el("div", "am-chat-card-title");
    title.appendChild(statusDot(statusInfo(live ? "awaiting_approval" : str(item.state || (task && task.state), 40))));
    title.appendChild(el("span", null, T("chat.approval.title")));
    node.appendChild(title);
    node.setAttribute("aria-label", T("chat.approval.title"));
    var taskTitle = str(task ? task.title : card.taskTitle, 300);
    if (taskTitle) node.appendChild(kvRow(T("chat.approval.task"), taskTitle));
    if (action) node.appendChild(kvRow(T("chat.approval.action"), action));
    node.appendChild(kvRow(T("chat.approval.target"), target || "-"));
    if (card.reason) node.appendChild(kvRow(T("chat.approval.reason"), card.reason));
    if (item.text) node.appendChild(el("div", "am-chat-muted", str(item.text, 600)));
    node.appendChild(riskBlock(task));
    if (live) {
      var actions = el("div", "am-chat-actions");
      var allow = btn("am-chat-btn am-chat-btn--primary", T("chat.approval.allow"), T("chat.approval.allowFor", { target: target || action }));
      allow.addEventListener("click", function () { AM.actions.approve(task); });
      var deny = btn("am-chat-btn am-chat-btn--danger", T("chat.approval.deny"), T("chat.approval.denyFor", { target: target || action }));
      deny.addEventListener("click", function () { AM.actions.deny(task); });
      actions.appendChild(allow);
      actions.appendChild(deny);
      node.appendChild(actions);
    } else {
      node.appendChild(el("div", "am-chat-resolved", T("chat.approval.resolved", { state: stateText(str(item.state || (task && task.state), 40)) })));
    }
    return node;
  }

  function errorNode(AM, item) {
    var card = obj(item.card);
    var node = el("div", "am-chat-card am-chat-error " + toneCls("bad"));
    node.setAttribute("role", "group");
    var title = el("div", "am-chat-card-title");
    title.appendChild(statusDot({ tone: "bad", shape: "✕", node: null }));
    title.appendChild(el("span", null, str(card.title, 160) || T("chat.error.title")));
    node.appendChild(title);
    if (item.text) node.appendChild(el("div", "am-chat-error-text", str(item.text)));
    if (card.detail) { var pre = el("pre", "am-chat-pre", str(card.detail, 4000)); pre.tabIndex = 0; node.appendChild(pre); }
    var rc = typeof card.retryCommand === "string" ? card.retryCommand.trim() : "";
    if (COMMAND_WORD_RE.test(rc) && AM.actions && typeof AM.actions.command === "function") {
      var actions = el("div", "am-chat-actions");
      var retry = btn("am-chat-btn", T("chat.error.retry"));
      retry.addEventListener("click", function () { AM.actions.command(rc); });
      actions.appendChild(retry);
      node.appendChild(actions);
    }
    return node;
  }

  function unavailableNode(AM, item) {
    var card = obj(item.card);
    var node = el("div", "am-chat-card am-chat-unavail " + toneCls("bad"));
    node.setAttribute("role", "group");
    var title = el("div", "am-chat-card-title");
    title.appendChild(statusDot({ tone: "bad", shape: "▲", node: null }));
    title.appendChild(el("span", "am-chat-badge " + toneCls("bad"), T("chat.unavailable")));
    title.appendChild(el("span", null, str(card.title, 160) || T("chat.unavailable.title")));
    node.appendChild(title);
    var prov = str(card.provider || card.providerName, 120);
    if (prov) node.appendChild(kvRow(T("chat.model.label"), prov));
    if (item.text || card.reason) node.appendChild(el("div", "am-chat-error-text", str(item.text || card.reason, 1000)));
    node.appendChild(el("div", "am-chat-muted", T("chat.noFallback")));
    return node;
  }

  function handoffNode(AM, item, key) {
    if (dismissed[key]) return null;
    var card = obj(item.card);
    var node = el("div", "am-chat-card am-chat-handoff " + toneCls("info"));
    node.setAttribute("role", "group");
    var title = el("div", "am-chat-card-title");
    title.appendChild(statusDot({ tone: "info", shape: "◐", node: null }));
    title.appendChild(el("span", null, str(card.title, 160) || T("chat.handoff.title")));
    if (Number.isFinite(Number(card.pct))) title.appendChild(el("span", "am-chat-badge " + toneCls("info"), T("chat.handoff.pct", { pct: Math.round(Number(card.pct)) })));
    node.appendChild(title);
    var note = typeof card.note === "string" && card.note ? card.note : str(item.text);
    var body = el("div", "am-chat-prose");
    mdInto(body, note);
    node.appendChild(body);
    var actions = el("div", "am-chat-actions");
    var copy = btn("am-chat-btn", T("chat.handoff.copy"));
    copy.addEventListener("click", function () { onCopy(note); });
    actions.appendChild(copy);
    if (AM.actions && typeof AM.actions.startHandoff === "function") {
      var start = btn("am-chat-btn am-chat-btn--primary", T("chat.handoff.start"));
      start.addEventListener("click", function () { AM.actions.startHandoff(AM.view && AM.view.selectedTopicId, note); });
      actions.appendChild(start);
    }
    var dis = btn("am-chat-btn am-chat-btn--ghost", T("chat.handoff.dismiss"));
    dis.addEventListener("click", function () { dismissed[key] = true; if (AMref) render(AMref); });
    actions.appendChild(dis);
    node.appendChild(actions);
    return node;
  }

  function dividerNode(label) {
    var d = el("div", "am-chat-divider");
    d.setAttribute("role", "separator");
    d.appendChild(el("span", "am-chat-divider-label", label));
    return d;
  }

  function unknownNode(item) {
    var n = el("div", "am-chat-card am-chat-unknown " + toneCls("muted"), item && item.text ? str(item.text) : T("chat.error.item"));
    return n;
  }

  function buildItem(AM, item, key) {
    switch (kindOf(item)) {
      case "user": return userNode(item);
      case "assistant": return assistantNode(item);
      case "tool": return toolNode(AM, item, key);
      case "approval": return approvalNode(AM, item);
      case "verify": return verifyNode(AM, item, key);
      case "error": return errorNode(AM, item);
      case "unavailable": return unavailableNode(AM, item);
      case "handoff": return handoffNode(AM, item, key);
      case "divider": return dividerNode(str(item.text, 120) || T("chat.new"));
      default: return unknownNode(item);
    }
  }

  // Tek bir bozuk kayıt tüm akışı çökertmesin: kayıt kendi kabında kurulur, hata olursa okunur kayıt-hatası düğümü.
  function safeBuild(AM, item, key) {
    try { return buildItem(AM, item, key); }
    catch (e) {
      var n = el("div", "am-chat-card am-chat-unknown " + toneCls("bad"), T("chat.error.item"));
      n.setAttribute("role", "group");
      return n;
    }
  }

  function itemSig(AM, item, key) {
    var base;
    try { base = JSON.stringify(item); } catch (e) { base = String(item && item.id) + String(item && item.kind); }
    var kind = kindOf(item);
    var extra = "";
    if (kind === "approval") { var t = taskFor(AM, item); extra = t ? t.state : "-"; }
    if (kind === "tool" || kind === "verify") extra = String(Math.floor(Date.now() / 60000));
    if (kind === "handoff") extra = (dismissed[key] ? "d" : "o") + (AM.actions && typeof AM.actions.startHandoff === "function" ? "s" : "n");
    return hash(base) + "|" + extra;
  }

  // Düğümleri yerinde bırakarak sıralar: yalnız gerçekten değişen yerler DOM'a dokunur (canlı bölge tüm akışı yeniden okumasın).
  function reconcile(container, list) {
    var i, cur;
    for (i = 0; i < list.length; i++) {
      cur = container.childNodes[i];
      if (cur !== list[i]) container.insertBefore(list[i], cur || null);
    }
    while (container.childNodes.length > list.length) container.removeChild(container.childNodes[container.childNodes.length - 1]);
  }

  function logEntries(AM) {
    return arr(AM.log).slice(-100).map(function (e, i) {
      e = obj(e);
      return { id: "log-" + i, kind: e.role === "user" ? "user" : "assistant", text: str(e.text), at: e.at };
    });
  }

  // ---------------------------------------------------------------- bölümler
  function showBanner(text) {
    if (!ui.banner) return;
    if (text) { ui.banner.textContent = text; ui.banner.hidden = false; }
    else { ui.banner.textContent = ""; ui.banner.hidden = true; }
  }

  function renderFeed(AM) {
    var st = AM.state || {};
    var view = AM.view || {};
    var key = topicKey(view);
    var tl = obj(st.timeline);
    var items = view.selectedTopicId != null && has(tl, view.selectedTopicId) ? arr(tl[view.selectedTopicId]) : [];
    var entries = items.concat(logEntries(AM));
    if (!has(seen, key)) seen[key] = entries.length;
    if (seen[key] > entries.length) seen[key] = entries.length;

    ui.welcome.hidden = items.length > 0;

    var vis = visibleSlice(entries, limits[key] || 200);
    var offset = entries.length - vis.items.length;
    var divAt = newDividerIndex(entries, seen[key]);
    var used = {};
    var next = {};
    var list = [];

    function keep(k, sig, make) {
      var kk = k;
      var n = 1;
      while (has(used, kk)) { n += 1; kk = k + "#" + n; }
      used[kk] = true;
      var c = has(nodes, kk) ? nodes[kk] : null;
      var node;
      if (c && c.sig === sig) node = c.node;
      else node = make(kk);
      if (node) { next[kk] = { sig: sig, node: node }; list.push(node); }
    }

    if (vis.hidden > 0) {
      keep("older", "older:" + vis.hidden, function () {
        var wrap = el("div", "am-chat-older");
        var b = btn("am-chat-btn am-chat-btn--ghost", T("chat.older", { n: Math.min(vis.hidden, 200) }));
        b.addEventListener("click", function () { limits[key] = (limits[key] || 200) + 200; if (AMref) render(AMref); });
        wrap.appendChild(b);
        return wrap;
      });
    }
    vis.items.forEach(function (item, j) {
      var idx = j + offset;
      if (idx === divAt) keep("div-new", "div", function () { return dividerNode(T("chat.new")); });
      var base = item && item.id != null ? "i:" + str(item.id, 80) : "x:" + idx;
      keep(base, itemSig(AM, item, base), function (kk) { return safeBuild(AM, item, kk); });
    });
    nodes = next;
    reconcile(ui.items, list);
    ui.items.hidden = list.length === 0;

    if (stick) ui.feed.scrollTop = ui.feed.scrollHeight;
    ui.scrollDown.hidden = stick;
  }

  function renderWelcome(AM) {
    var line = summaryLine(summaryCounts(AM.state));
    if (line !== welcomeSig) {
      welcomeSig = line;
      ui.summaryText.textContent = line;
    }
  }

  function renderAttach(AM) {
    var list = arr(AM.view && AM.view.attachments).slice(0, 20);
    var sig;
    try { sig = hash(JSON.stringify(list)) + Math.floor(Date.now() / 60000); } catch (e) { sig = "x"; }
    if (sig === attachSig) return;
    attachSig = sig;
    ui.attachRow.replaceChildren();
    ui.attachRow.hidden = list.length === 0;
    list.forEach(function (a, i) {
      a = obj(a);
      var name = str(a.name, 160) || "?";
      var chip = el("span", "am-chat-attach");
      chip.appendChild(icon("plus", 14));
      var meta = el("span", "am-chat-attach-meta");
      meta.appendChild(el("span", "am-chat-attach-name", name));
      var ago = a.updatedAt != null ? agoLabel(a.updatedAt) : "";
      if (ago) meta.appendChild(el("span", "am-chat-attach-ago", ago));
      chip.appendChild(meta);
      var x = btn("am-chat-attach-x", "", T("chat.attach.remove", { name: name }));
      x.appendChild(icon("close", 12));
      x.addEventListener("click", function () {
        var cur = arr(AMref && AMref.view && AMref.view.attachments);
        var rest = cur.filter(function (_, k) { return k !== i; });
        if (AMref && AMref.actions && typeof AMref.actions.setView === "function") AMref.actions.setView({ attachments: rest });
      });
      chip.appendChild(x);
      ui.attachRow.appendChild(chip);
    });
  }

  // Gösterge rozetleri: imza değişmedikçe DOM'a dokunulmaz. Sunucu verisi yalnız textContent/createTextNode ile yazılır.
  var indSig = null;
  function renderIndicators(AM) {
    var badges = indicatorBadges(AM.state && AM.state.indicators);
    var sig = JSON.stringify(badges);
    if (sig === indSig) return;
    indSig = sig;
    ui.indBox.replaceChildren();
    badges.forEach(function (b) {
      var cls = "am-chat-badge am-chat-ind-badge " + toneCls(b.tone);
      var node;
      if (b.action) {
        node = btn(cls + " am-chat-ind-btn", "", b.aria);
      } else {
        node = el("span", cls);
        node.setAttribute("role", "img");
        node.setAttribute("aria-label", b.aria);
      }
      node.setAttribute("data-ind", b.key);
      node.setAttribute("data-level", b.level);
      node.appendChild(el("span", "am-chat-badge-shape", b.shape));
      node.appendChild(document.createTextNode(b.text));
      node.title = b.title;
      if (b.action === "approvals") {
        node.addEventListener("click", function () {
          if (AMref && AMref.actions && typeof AMref.actions.setView === "function") AMref.actions.setView({ page: "tasks", pageParam: "bolum:am-lab-attn", settingsOpen: false, projectSettingsOpen: false });
        });
      }
      ui.indBox.appendChild(node);
    });
  }

  function renderComposer(AM) {
    var st = AM.state || {};
    var view = AM.view || {};
    var mb = modelBadge(st, view);
    ui.modelBadge.className = "am-chat-badge am-chat-model " + toneCls(mb.tone);
    ui.modelBadge.replaceChildren();
    if (mb.mode === "unavailable") {
      ui.modelBadge.appendChild(el("span", "am-chat-badge-shape", "▲"));
      ui.modelBadge.appendChild(document.createTextNode(mb.text + (mb.provider ? " · " + mb.provider : "")));
    } else {
      ui.modelBadge.appendChild(document.createTextNode(mb.text));
    }
    ui.modelBadge.title = T("chat.model.label") + ": " + mb.text;
    ui.modeBadge.textContent = T("chat.mode");
    renderIndicators(AM);

    var canStop = !!(AM.actions && typeof AM.actions.stop === "function");
    var running = isRunning(st, view);
    ui.stopBtn.hidden = !(running && canStop);
    ui.sendBtn.hidden = running && canStop;
    ui.sendBtn.disabled = !String(ui.input.value || "").trim();
    renderAttach(AM);
  }

  function showRenderError(e) {
    nodes = {};
    var msg = str(e && e.message ? e.message : e, 200);
    ui.items.replaceChildren();
    ui.items.hidden = false;
    var card = el("div", "am-chat-card am-chat-renderror " + toneCls("bad"));
    card.setAttribute("role", "alert");
    card.appendChild(el("div", "am-chat-card-title", T("chat.error.title")));
    card.appendChild(el("div", "am-chat-error-text", T("chat.error.render", { reason: msg })));
    var actions = el("div", "am-chat-actions");
    var retry = btn("am-chat-btn am-chat-btn--primary", T("chat.error.retry"));
    retry.addEventListener("click", function () { nodes = {}; if (AMref) render(AMref); });
    actions.appendChild(retry);
    card.appendChild(actions);
    ui.items.appendChild(card);
  }

  function render(AM) {
    if (!mounted) return;
    AMref = AM;
    var view = AM.view || {};
    var key = topicKey(view);
    if (key !== lastTopicKey) {
      if (lastTopicKey !== null) drafts[lastTopicKey] = String(ui.input.value || "");
      ui.input.value = has(drafts, key) ? drafts[key] : "";
      lastTopicKey = key;
      nodes = {};
      stick = true;
      closeSlash();
      autosize();
    }
    showBanner(registerMissing ? T("chat.error.strings") : "");
    var failed = null;
    try { renderWelcome(AM); } catch (e) { failed = failed || e; }
    try { renderFeed(AM); } catch (e2) { failed = failed || e2; }
    try { renderComposer(AM); } catch (e3) { failed = failed || e3; }
    if (failed) showRenderError(failed);
  }

  // ---------------------------------------------------------------- giriş kutusu
  function autosize() {
    var input = ui.input;
    input.rows = 1;
    var lh = 24, pad = 0;
    try {
      if (typeof window.getComputedStyle === "function") {
        var cs = window.getComputedStyle(input);
        var l = parseFloat(cs.lineHeight);
        lh = isFinite(l) && l > 0 ? l : (parseFloat(cs.fontSize) || 16) * 1.5;
        pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      }
    } catch (e) { /* varsayılan */ }
    input.rows = growRows(input.scrollHeight, lh, pad, 8);
  }

  function closeSlash() {
    slash.open = false;
    slash.list = [];
    if (!ui.slash) return;
    ui.slash.hidden = true;
    ui.slash.replaceChildren();
    ui.input.setAttribute("aria-expanded", "false");
    ui.input.removeAttribute("aria-activedescendant");
  }

  function paintSlash() {
    ui.slash.replaceChildren();
    if (!slash.list.length) {
      var none = el("li", "am-chat-slash-empty", T("chat.slash.empty"));
      none.setAttribute("role", "presentation");
      ui.slash.appendChild(none);
      ui.input.removeAttribute("aria-activedescendant");
      return;
    }
    slash.list.forEach(function (c, i) {
      var li = el("li", "am-chat-slash-item" + (i === slash.index ? " am-chat-selected" : ""));
      li.id = "am-chat-opt-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === slash.index ? "true" : "false");
      li.appendChild(el("span", "am-chat-slash-name", c.name));
      li.appendChild(el("span", "am-chat-slash-desc", T(c.key)));
      li.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
      li.addEventListener("click", function () { slash.index = i; chooseSlash(); });
      ui.slash.appendChild(li);
    });
    ui.input.setAttribute("aria-activedescendant", "am-chat-opt-" + slash.index);
  }

  function updateSlash() {
    var q = slashQuery(ui.input.value);
    if (q === null || ui.input.value === slash.dismissedFor) { closeSlash(); return; }
    slash.list = filterCommands(q);
    if (slash.index >= slash.list.length) slash.index = 0;
    slash.open = true;
    ui.slash.hidden = false;
    ui.input.setAttribute("aria-expanded", "true");
    paintSlash();
  }

  function chooseSlash() {
    var c = slash.list[slash.index];
    if (!c) return;
    ui.input.value = c.name;
    closeSlash();
    autosize();
    ui.sendBtn.disabled = false;
    ui.input.focus();
  }

  function markSeen() {
    if (!AMref) return;
    var key = topicKey(AMref.view || {});
    var tl = obj(AMref.state && AMref.state.timeline);
    var sel = AMref.view && AMref.view.selectedTopicId;
    var n = (sel != null && has(tl, sel) ? arr(tl[sel]).length : 0) + arr(AMref.log).slice(-100).length;
    if (seen[key] !== n) { seen[key] = n; }
  }

  function submit() {
    var text = String(ui.input.value || "").trim();
    if (!text || !AMref || !AMref.actions || typeof AMref.actions.command !== "function") return;
    ui.input.value = "";
    drafts[lastTopicKey === null ? "_" : lastTopicKey] = "";
    closeSlash();
    autosize();
    ui.sendBtn.disabled = true;
    stick = true;
    markSeen();
    AMref.actions.command(text);
  }

  function onKeydown(ev) {
    if (ev.isComposing) return;
    if (slash.open && slash.list.length) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); slash.index = (slash.index + 1) % slash.list.length; paintSlash(); return; }
      if (ev.key === "ArrowUp") { ev.preventDefault(); slash.index = (slash.index - 1 + slash.list.length) % slash.list.length; paintSlash(); return; }
      if (ev.key === "Tab" || (ev.key === "Enter" && !ev.shiftKey)) {
        var cur = slash.list[slash.index];
        // Girilen metin zaten tam komutsa Enter gönderir; değilse komutu tamamlar.
        if (ev.key === "Enter" && cur && String(ui.input.value).trim() === cur.name) { ev.preventDefault(); submit(); return; }
        ev.preventDefault();
        chooseSlash();
        return;
      }
    }
    if (slash.open && ev.key === "Escape") {
      ev.preventDefault();
      slash.dismissedFor = ui.input.value;
      closeSlash();
      return;
    }
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      submit();
    }
  }

  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }

  function scrollToBottom() {
    var f = ui.feed;
    var top = f.scrollHeight;
    if (typeof f.scrollTo === "function") {
      try { f.scrollTo({ top: top, behavior: reducedMotion() ? "auto" : "smooth" }); } catch (e) { f.scrollTop = top; }
    } else f.scrollTop = top;
    stick = true;
    ui.scrollDown.hidden = true;
    markSeen();
  }

  // ---------------------------------------------------------------- kurulum
  function init(AM, host) {
    AMref = AM;
    if (mounted || !host) return;
    mounted = true;
    ui.host = host;
    host.classList.add("am-chat");

    ui.banner = el("div", "am-chat-banner");
    ui.banner.setAttribute("role", "alert");
    ui.banner.hidden = true;

    var stage = el("div", "am-chat-stage");
    ui.feed = el("div", "am-chat-feed");
    ui.feed.id = "feed";
    ui.feed.setAttribute("role", "log");
    ui.feed.setAttribute("aria-live", "polite");
    ui.feed.setAttribute("aria-relevant", "additions");
    ui.feed.setAttribute("aria-label", T("chat.feedLabel"));
    ui.feed.tabIndex = 0;

    // Karşılama
    ui.welcome = el("section", "am-chat-welcome");
    ui.welcome.id = "welcome";
    ui.welcome.setAttribute("aria-labelledby", "am-chat-hello");
    var hello = el("h2", "am-chat-hello", T("chat.hello"));
    hello.id = "am-chat-hello";
    ui.welcome.appendChild(hello);
    ui.welcome.appendChild(el("p", "am-chat-hello-sub", T("chat.helloSub")));
    var chips = el("div", "am-chat-suggest");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", T("chat.suggestLabel"));
    [["/durum", "chat.sugg.durum"], ["/onay", "chat.sugg.onay"], ["/borc", "chat.sugg.borc"], ["/gorevler", "chat.sugg.gorevler"]].forEach(function (s) {
      var b = btn("am-chat-sugg", T(s[1]));
      b.addEventListener("click", function () {
        if (AMref && AMref.actions && typeof AMref.actions.command === "function") { stick = true; AMref.actions.command(s[0]); }
      });
      chips.appendChild(b);
    });
    ui.welcome.appendChild(chips);
    ui.summary = btn("am-chat-summary", "", T("chat.summaryOpen"));
    ui.summaryText = el("span", "am-chat-summary-text", "");
    ui.summary.appendChild(ui.summaryText);
    ui.summary.title = T("chat.summaryOpen");
    ui.summary.addEventListener("click", function () {
      if (AMref && AMref.actions && typeof AMref.actions.setView === "function") AMref.actions.setView({ panelOpen: true });
    });
    ui.welcome.appendChild(ui.summary);

    ui.items = el("div", "am-chat-items");
    ui.feed.appendChild(ui.welcome);
    ui.feed.appendChild(ui.items);

    ui.scrollDown = btn("am-chat-jump", "", T("chat.scrollDown"));
    ui.scrollDown.id = "scrollDown";
    ui.scrollDown.title = T("chat.scrollDown");
    ui.scrollDown.appendChild(icon("arrow-down", 18));
    ui.scrollDown.hidden = true;
    ui.scrollDown.addEventListener("click", scrollToBottom);

    stage.appendChild(ui.feed);
    stage.appendChild(ui.scrollDown);

    // Giriş kutusu
    var dock = el("div", "am-chat-dock");
    ui.form = el("form", "am-chat-composer");
    ui.form.id = "composerForm";
    ui.form.setAttribute("autocomplete", "off");
    ui.form.setAttribute("novalidate", "novalidate");

    ui.slash = el("ul", "am-chat-slash");
    ui.slash.id = "slashMenu";
    ui.slash.setAttribute("role", "listbox");
    ui.slash.setAttribute("aria-label", T("chat.slash.label"));
    ui.slash.hidden = true;

    ui.attachRow = el("div", "am-chat-attachrow");
    ui.attachRow.id = "attachRow";
    ui.attachRow.setAttribute("role", "list");
    ui.attachRow.setAttribute("aria-label", T("chat.attach.label"));
    ui.attachRow.hidden = true;

    ui.input = el("textarea", "am-chat-input");
    ui.input.id = "composerInput";
    ui.input.rows = 1;
    ui.input.setAttribute("aria-label", T("chat.input.label"));
    ui.input.setAttribute("aria-autocomplete", "list");
    ui.input.setAttribute("aria-controls", "slashMenu");
    ui.input.setAttribute("aria-expanded", "false");
    ui.input.setAttribute("spellcheck", "false");
    ui.input.placeholder = T("chat.input.placeholder");

    var bar = el("div", "am-chat-bar");
    ui.attachBtn = btn("am-chat-iconbtn", "", T("chat.attach.add"));
    ui.attachBtn.id = "attachBtn";
    ui.attachBtn.disabled = true;
    ui.attachBtn.title = T("chat.attach.disabled");
    ui.attachBtn.appendChild(icon("plus", 18));
    ui.modelBadge = el("span", "am-chat-badge am-chat-model");
    ui.modelBadge.id = "modelBadge";
    ui.modeBadge = el("span", "am-chat-badge am-chat-mode");
    ui.modeBadge.id = "modeBadge";
    ui.ringBtn = btn("am-chat-ring", "", T("chat.ring"));
    ui.ringBtn.id = "ringBtn";
    ui.ringBtn.title = T("chat.ring");
    ui.indBox = el("div", "am-chat-ind");
    ui.indBox.id = "statusIndicators";
    ui.indBox.setAttribute("role", "group");
    ui.indBox.setAttribute("aria-label", T("chat.ind.group"));
    var grow = el("span", "am-chat-grow");
    ui.stopBtn = btn("am-chat-circle am-chat-circle--stop", "", T("chat.stop"));
    ui.stopBtn.id = "stopBtn";
    ui.stopBtn.title = T("chat.stop");
    ui.stopBtn.appendChild(icon("stop", 16));
    ui.stopBtn.hidden = true;
    ui.sendBtn = el("button", "am-chat-circle am-chat-circle--send");
    ui.sendBtn.id = "sendBtn";
    ui.sendBtn.type = "submit";
    ui.sendBtn.setAttribute("aria-label", T("chat.send"));
    ui.sendBtn.title = T("chat.send");
    ui.sendBtn.appendChild(icon("send", 18));
    ui.sendBtn.disabled = true;

    [ui.attachBtn, ui.modelBadge, ui.modeBadge, ui.ringBtn, ui.indBox, grow, ui.stopBtn, ui.sendBtn].forEach(function (n) { bar.appendChild(n); });
    ui.form.appendChild(ui.slash);
    ui.form.appendChild(ui.attachRow);
    ui.form.appendChild(ui.input);
    ui.form.appendChild(bar);
    dock.appendChild(ui.form);

    host.appendChild(ui.banner);
    host.appendChild(stage);
    host.appendChild(dock);

    // Olaylar
    ui.feed.addEventListener("scroll", function () {
      var dist = ui.feed.scrollHeight - ui.feed.scrollTop - ui.feed.clientHeight;
      stick = dist <= 48;
      ui.scrollDown.hidden = stick;
      if (stick) markSeen();
    });
    ui.feed.addEventListener("click", markSeen);
    ui.input.addEventListener("keydown", onKeydown);
    ui.input.addEventListener("input", function () {
      slash.dismissedFor = null;
      autosize();
      ui.sendBtn.disabled = !String(ui.input.value || "").trim();
      updateSlash();
    });
    ui.input.addEventListener("focus", markSeen);
    ui.input.addEventListener("blur", function () { closeSlash(); });
    ui.stopBtn.addEventListener("click", function () {
      if (AMref && AMref.actions && typeof AMref.actions.stop === "function") AMref.actions.stop();
    });
    ui.form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      submit();
    });
  }

  window.AM_CHAT = { init: init, render: render, pure: pure };
})();
