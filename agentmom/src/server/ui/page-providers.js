/*
 * Sahip: Sonnet (D3 sayfası: AI Bağlantıları ve Sağlayıcılar) [İP:AgentMom Faz 11, D3]
 * yazan: [Claude#agentmom-faz11-d3-saglayicilar]
 * Amaç: window.AM_PAGES.register("providers", {title, group, render(AM, root, param)}). param boşsa sağlayıcı LİSTESİ,
 *       doluysa o sağlayıcının DETAY sayfası (AM.state.data["providerDetail:<id>"]).
 * Dürüstlük kuralı: 'doğrulanmadı / desteklenmiyor / kullanılamıyor' yetenek asla 'kullanılabilir' gibi çizilmez; sağlayıcının bildirmediği
 *       değer (limit, plan, sıfırlanma, model listesi) uydurulmaz: 'Bilinmiyor: sağlayıcı bildirmedi'. Otomatik geçiş yoktur.
 * Eylemler: Test / Devre dışı bırak / Etkinleştir yalnız AM.actions.providerAction(id, ...) çağırır (onay penceresi çekirdekte).
 *       Yeniden bağlan / Güncelle / Bağlantıyı kes bu pencerede komut ÇALIŞTIRMAZ: açıklama + kopyalanabilir komut metni gösterir.
 * Güvenlik: sunucu verisi yalnız textContent; HTML dizesi ataması, satır içi stil/olay, dış kaynak, tarayıcı depolaması, ağ isteği YOK.
 *       Ağ/veri yalnız AM.actions.* ile. Stiller page-providers.css (yalnız var(--am-*)).
 * Değiştirme: yalnız sahibi ya da ana oturum. Yüklenirken DOM'a dokunmaz; saf mantık window.AM_PAGE_PROVIDERS.pure altındadır.
 */
(function () {
  "use strict";

  // Çerçeve (pages.js) ya da metin kaydı yoksa sessiz kalınmaz: yükleme hatası çekirdeğin hata kartında GÖRÜNÜR.
  if (!window.AM_PAGES || typeof window.AM_PAGES.register !== "function") {
    throw new Error("page-providers.js: sayfa çerçevesi (pages.js, window.AM_PAGES) yüklenmedi; sağlayıcılar sayfası çizilemez.");
  }
  if (typeof window.AM_REGISTER_TR !== "function") {
    throw new Error("page-providers.js: strings.js (AM_REGISTER_TR) yüklenmedi.");
  }

  var TR = {
    "page-providers.title": "AI Bağlantıları ve Sağlayıcılar",
    "page-providers.intro": "Her sağlayıcının hangi işlemi kanıtla yapabildiğini gösterir. Kanıtı olmayan hiçbir yetenek kullanılabilir sayılmaz.",
    "page-providers.noFallback": "Otomatik geçiş yok: kullanılamayan bir sağlayıcı yerine başkası kendiliğinden devreye girmez; karar sizindir.",
    "page-providers.planned": "OpenCode, Cursor ve Antigravity: kuruldu, ancak AgentMom adaptörü YOK (Planlı). Bu araçlar henüz bağlı değildir; kullanılamaz.",
    "page-providers.loading": "Yükleniyor…",
    "page-providers.empty": "Sağlayıcı kaydı yok.",
    "page-providers.emptyHint": "Sunucu henüz hiç sağlayıcı bildirmedi. Üstteki yenile düğmesini deneyin.",
    "page-providers.err.title": "Bu sayfa çizilemedi",
    "page-providers.err.detail": "Ayrıntı: {reason}",
    "page-providers.err.retry": "Yeniden dene",
    "page-providers.listLabel": "Sağlayıcılar",
    "page-providers.rowOpen": "{name}: {level}. Ayrıntıyı aç",
    "page-providers.noId": "Bu kayıt geçersiz bir kimlik taşıyor; ayrıntı açılamaz.",
    "page-providers.route": "Rota: {route}",
    "page-providers.route.subscription": "Abonelik",
    "page-providers.route.unknown": "bildirilmedi",
    "page-providers.lastSuccessLine": "Son başarılı işlem: {when}",
    "page-providers.lastSuccessNone": "Kayıtlı başarılı işlem yok",
    "page-providers.detailHint": "Son işlem bilgisi için satırı açın.",

    "page-providers.level.ready": "Hazır",
    "page-providers.level.partial": "Kısmi",
    "page-providers.level.unverified": "Doğrulanmadı",
    "page-providers.level.unavailable": "KULLANILAMIYOR",
    "page-providers.level.disabled": "Devre dışı",
    "page-providers.level.unknown": "Yetenek bildirilmedi",

    "page-providers.status.verified": "Doğrulandı",
    "page-providers.status.partial": "Kısmi",
    "page-providers.status.unverified": "Doğrulanmadı",
    "page-providers.status.unsupported": "Desteklenmiyor",
    "page-providers.status.unavailable": "KULLANILAMIYOR",
    "page-providers.use.yes": "Kullanılabilir",
    "page-providers.use.partial": "Kısmen kullanılabilir: kanıt eksik",
    "page-providers.use.unverified": "Kullanılabilir değil: kanıtla doğrulanmadı",
    "page-providers.use.unsupported": "Kullanılamaz: sağlayıcı bu işlemi desteklemiyor",
    "page-providers.use.unavailable": "Kullanılamaz: şu an erişilemiyor",
    "page-providers.countsLabel": "Yetenek sayıları",
    "page-providers.count": "{label}: {n}",

    "page-providers.back": "Tüm sağlayıcılar",
    "page-providers.backAria": "Sağlayıcı listesine dön",
    "page-providers.detail.loading": "Sağlayıcı ayrıntısı yükleniyor…",
    "page-providers.detail.errTitle": "Sağlayıcı ayrıntısı alınamadı",
    "page-providers.detail.errBody": "Sunucudan ayrıntı okunamadı. Hiçbir değer uydurulmadı. Neden: {reason}",
    "page-providers.detail.notFound": "Sunucu bu kimlikle bir sağlayıcı bildirmedi.",
    "page-providers.unknown": "Bilinmiyor: sağlayıcı bildirmedi",
    "page-providers.yes": "Evet",
    "page-providers.no": "Hayır",
    "page-providers.enabled": "Etkin",
    "page-providers.disabledChip": "Devre dışı",

    "page-providers.sec.actions": "Eylemler",
    "page-providers.sec.connection": "Bağlantı durumu",
    "page-providers.sec.caps": "Yetenekler",
    "page-providers.sec.models": "Modeller",
    "page-providers.sec.health": "Sağlık",
    "page-providers.sec.perms": "İzinler",
    "page-providers.sec.billing": "Kullanım ve fatura yolu",
    "page-providers.sec.limits": "Limitler",
    "page-providers.sec.last": "Son başarılı işlem",
    "page-providers.sec.version": "Sürüm uyumu",
    "page-providers.sec.docs": "Bilinen sınırlar",
    "page-providers.sec.errors": "Son hatalar",
    "page-providers.sec.commands": "Giriş, güncelleme ve bağlantıyı kesme",

    "page-providers.conn.status": "Durum",
    "page-providers.conn.route": "Rota",
    "page-providers.conn.auth": "Yetkilendirme yöntemi",
    "page-providers.conn.enabled": "AgentMom içinde",

    "page-providers.caps.caption": "Sağlayıcı yetenekleri ve kanıt kaynakları",
    "page-providers.caps.op": "İşlem",
    "page-providers.caps.status": "Durum",
    "page-providers.caps.usable": "Kullanılabilirlik",
    "page-providers.caps.evidence": "Kanıt kaynağı",
    "page-providers.caps.verifiedAt": "Son doğrulama",
    "page-providers.caps.none": "Bu sağlayıcı yetenek bildirmedi; hiçbir işlem kullanılabilir sayılmaz.",
    "page-providers.caps.noEvidence": "Kanıt bildirilmedi",
    "page-providers.caps.neverVerified": "Hiç doğrulanmadı",
    "page-providers.caps.warn": "Bu sağlayıcıda kullanılabilir olmayan yetenekler var. Onlar için işlem başlatılmaz; başka sağlayıcıya otomatik geçilmez.",

    "page-providers.models.caption": "Sağlayıcıyla çalışan modeller",
    "page-providers.models.model": "Model",
    "page-providers.models.runs": "Çalıştırma sayısı",
    "page-providers.models.lastAt": "Son zaman",
    "page-providers.models.none": "Model listesi: Bilinmiyor: sağlayıcı bildirmedi",

    "page-providers.health.test": "Bağlantı sınaması (yetenek)",
    "page-providers.health.last": "Bu oturumdaki son eylem sonucu",
    "page-providers.health.none": "Bu oturumda eylem çalıştırılmadı",
    "page-providers.health.errors": "Kayıtlı hata sayısı",
    "page-providers.health.note": "Test yerel yapılır (bağlantı sınaması); model çağrısı yapmaz.",
    "page-providers.health.notReported": "Bildirilmedi",

    "page-providers.perms.policy": "Politika bu sağlayıcıya izin veriyor mu",
    "page-providers.perms.inList": "Politikadaki izinli sağlayıcı listesinde",
    "page-providers.perms.summary": "Politika özeti",
    "page-providers.perms.summaryText": "{actions} tanınan eylem, {approval} tanesi izin ister; ücretli rota: {paid}.",
    "page-providers.perms.none": "Politika özeti sunucudan alınamadı.",
    "page-providers.perms.note": "İzinleri bu sayfa değiştirmez; politika yalnız Yusuf'un açık onayıyla değişir.",

    "page-providers.billing.subscription": "Abonelik rotası · ücretli rota kapalı · liste fiyatı yalnız bilgidir",
    "page-providers.billing.other": "Rota: {route} · liste fiyatı yalnız bilgidir; bu sayfa ücret göstermez",
    "page-providers.billing.note": "Gösterilen token ve liste fiyatı eşdeğeri tahsilat değildir.",

    "page-providers.limits.none": "Bilinmiyor: sağlayıcı bildirmedi",
    "page-providers.limits.reported": "Sağlayıcının bildirdiği limit bilgileri (olduğu gibi):",
    "page-providers.limits.nested": "(iç içe ayrıntı; burada gösterilmez)",

    "page-providers.last.at": "Zaman",
    "page-providers.last.model": "Model",
    "page-providers.last.none": "Henüz kayıtlı başarılı işlem yok.",

    "page-providers.version.value": "Sürüm",

    "page-providers.docs.none": "Bu sağlayıcı için bilinen sınırlar belgesi bildirilmedi.",
    "page-providers.docs.loading": "Belge yükleniyor…",
    "page-providers.docs.missing": "Belge alınamadı: sunucu bu belgeyi sunmadı.",
    "page-providers.docs.error": "Belge alınamadı (durum: {reason}).",
    "page-providers.docs.retry": "Belgeyi yeniden yükle",
    "page-providers.docs.region": "Bilinen sınırlar belgesi",

    "page-providers.errors.none": "Kayıtlı hata yok.",
    "page-providers.errors.caption": "Son hatalar (gizli bilgiler maskelenmiştir)",
    "page-providers.errors.at": "Zaman",
    "page-providers.errors.kind": "Tür",
    "page-providers.errors.msg": "Mesaj",

    "page-providers.act.test": "Test",
    "page-providers.act.testHint": "Yerel bağlantı sınaması çalıştırır; model çağrısı yapmaz. Önce onay sorulur.",
    "page-providers.act.disable": "Devre dışı bırak",
    "page-providers.act.enable": "Etkinleştir",
    "page-providers.act.toggleHint": "Sağlayıcıyı AgentMom içinde kapatır ya da açar; hiçbir şey silinmez. Önce onay sorulur.",
    "page-providers.act.result": "Son eylem sonucu",
    "page-providers.act.ok": "Eylem tamamlandı.",
    "page-providers.act.failed": "Eylem başarısız: {reason}",
    "page-providers.act.errorLine": "Eylem hatası: {reason}",
    "page-providers.act.unavailable": "Bu eylem şu an kullanılamıyor; işlem yapılmadı.",

    "page-providers.cmd.intro": "Giriş sağlayıcının kendi komutuyla yapılır. Bu pencere komut ÇALIŞTIRMAZ; aşağıdaki düğmeler yalnız komut metnini panoya kopyalar. Komutu kendi terminalinizde siz çalıştırın.",
    "page-providers.cmd.reconnect": "Yeniden bağlan",
    "page-providers.cmd.reconnectDesc": "Oturum açma ya da yeniden giriş için sağlayıcının komutu.",
    "page-providers.cmd.update": "Güncelle",
    "page-providers.cmd.updateDesc": "Sağlayıcının komut satırı aracını güncelleme komutu.",
    "page-providers.cmd.disconnect": "Bağlantıyı kes",
    "page-providers.cmd.disconnectDesc": "Sağlayıcıdaki oturumu kapatma komutu.",
    "page-providers.cmd.copy": "{label} komutunu kopyala",
    "page-providers.cmd.copied": "Komut panoya kopyalandı. Bu pencere komutu çalıştırmaz.",
    "page-providers.cmd.copyFail": "Komut kopyalanamadı.",
    "page-providers.cmd.none": "Bu sağlayıcı için komut bildirilmedi; sağlayıcının kendi belgesine bakın.",
    "page-providers.cmd.nonePlaceholder": "komut bildirilmedi"
  };

  window.AM_REGISTER_TR("page-providers", TR);

  function T(key, vars) {
    try { return String(window.AM_T(key, vars)); } catch (e) { return "⟦" + key + "⟧"; }
  }

  // ------------------------------------------------------------------ saf mantık
  var STATUSES = ["verified", "partial", "unverified", "unsupported", "unavailable"];
  var DOC_WHITELIST = ["claude-code", "codex", "gemini"];
  var DASH = "—";

  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function str(v, max) {
    var s = v == null ? "" : String(v);
    s = s.replace(/[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, " ");
    var lim = max || 300;
    return s.length > lim ? s.slice(0, lim - 1) + "…" : s;
  }
  function strOrNull(v, max) { return v == null || v === "" ? null : str(v, max); }
  function arr(v, max) { return Array.isArray(v) ? v.slice(0, max || 100) : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }

  function validId(id) { return typeof id === "string" && /^[a-z0-9-]{1,40}$/.test(id); }

  function normStatus(s) {
    var k = String(s == null ? "" : s).toLowerCase();
    return STATUSES.indexOf(k) >= 0 ? k : "unverified"; // bilinmeyen durum asla 'doğrulandı' olmaz
  }

  function capCounts(caps) {
    var c = { verified: 0, partial: 0, unverified: 0, unsupported: 0, unavailable: 0 };
    arr(caps, 200).forEach(function (x) { c[normStatus(obj(x).status)] += 1; });
    return c;
  }

  // Durum rozeti: yalnız TÜM yetenekler doğrulandıysa 'ready'. Doğrulanmamış/kısmi olan hiçbir şey 'ready' olmaz.
  function providerLevel(caps, disabled) {
    if (disabled === true) return "disabled";
    var list = arr(caps, 200);
    if (!list.length) return "unknown";
    var c = capCounts(list);
    if (c.verified + c.partial === 0) return c.unverified > 0 ? "unverified" : "unavailable";
    if (c.partial > 0 || c.unverified > 0 || c.unavailable > 0 || c.unsupported > 0) return "partial";
    return "ready";
  }

  function levelTone(level) {
    if (level === "ready") return "ok";
    if (level === "partial" || level === "unverified") return "warn";
    if (level === "unavailable") return "bad";
    return "muted";
  }

  function statusTone(status) {
    var s = normStatus(status);
    if (s === "verified") return "ok";
    if (s === "partial" || s === "unverified") return "warn";
    if (s === "unavailable") return "bad";
    return "muted";
  }

  // Kullanılabilirlik: yalnız 'verified' tam kullanılabilir; partial kısmen; kalanlar açıkça KULLANILAMAZ.
  function usability(status) {
    var s = normStatus(status);
    if (s === "verified") return { usable: "yes", key: "yes" };
    if (s === "partial") return { usable: "partial", key: "partial" };
    return { usable: "no", key: s };
  }

  var COMMANDS = {
    "claude-code": { reconnect: "claude auth login", update: "claude update", disconnect: "claude auth logout" },
    codex: { reconnect: "codex login", update: "npm install -g @openai/codex@latest", disconnect: "codex logout" },
    gemini: { reconnect: null, update: null, disconnect: null }
  };
  // Yalnız bilinen komutlar; bilinmeyen sağlayıcı/eylem için null (komut uydurulmaz).
  function commandsFor(id) {
    var base = Object.prototype.hasOwnProperty.call(COMMANDS, id) ? COMMANDS[id] : null;
    return { reconnect: base ? base.reconnect : null, update: base ? base.update : null, disconnect: base ? base.disconnect : null };
  }

  function docNameOf(docs) { return typeof docs === "string" && DOC_WHITELIST.indexOf(docs) >= 0 ? docs : null; }

  function scrubSecrets(text) {
    var s = String(text == null ? "" : text);
    s = s.replace(/Bearer\s+[A-Za-z0-9._~+\/=-]+/gi, "Bearer [gizli]");
    s = s.replace(/#token=\S*/g, "#token=[gizli]");
    s = s.replace(/\b(token|secret|password|passwd|api[_-]?key|authorization)(\s*[:=]\s*)\S+/gi, "$1$2[gizli]");
    s = s.replace(/\b(?:sk|pk|ghp|gho|xox[bap]|AKIA)[-_A-Za-z0-9]{10,}/g, "[gizli]");
    s = s.replace(/\b[A-Za-z0-9_-]{40,}\b/g, "[gizli]");
    return s;
  }

  function pad2(n) { return n < 10 ? "0" + n : String(n); }
  function fmtDateTime(iso) {
    var t = Date.parse(String(iso == null ? "" : iso));
    if (!isFinite(t)) return DASH;
    var d = new Date(t);
    return pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "." + d.getFullYear() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }
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

  function normDetail(p) {
    var x = obj(p);
    return {
      id: str(x.id, 100), displayName: str(x.displayName || x.id, 200), routeKind: str(x.routeKind, 40), authMethod: strOrNull(x.authMethod, 100),
      enabled: x.enabled === true ? true : x.enabled === false ? false : null,
      allowedByPolicy: x.allowedByPolicy === true ? true : x.allowedByPolicy === false ? false : null,
      version: strOrNull(x.version, 100),
      capabilities: arr(x.capabilities, 100).map(function (c) {
        var o = obj(c);
        return { operation: str(o.operation, 100), status: normStatus(o.status), evidence: strOrNull(o.evidence, 500), verifiedAt: strOrNull(o.verifiedAt, 40) };
      }),
      models: arr(x.models, 50).map(function (m) {
        var o = obj(m);
        return { model: str(o.model, 100), runs: isNum(o.runs) ? o.runs : null, lastAt: strOrNull(o.lastAt, 40) };
      }),
      lastSuccess: x.lastSuccess && typeof x.lastSuccess === "object" ? { at: strOrNull(x.lastSuccess.at, 40), model: strOrNull(x.lastSuccess.model, 100) } : null,
      lastErrors: arr(x.lastErrors, 20).map(function (e) {
        var o = obj(e);
        return { at: strOrNull(o.at, 40), kind: str(o.kind, 60), message: scrubSecrets(str(o.message, 500)) };
      }),
      docs: docNameOf(x.docs),
      limits: x.limits && typeof x.limits === "object" && !Array.isArray(x.limits) && Object.keys(x.limits).length ? x.limits : null
    };
  }

  // Sağlayıcının bildirdiği limit nesnesi: yalnız skaler değerler olduğu gibi listelenir; anlam/yüzde/sıfırlanma türetilmez.
  function limitRows(limits) {
    if (!limits || typeof limits !== "object") return null;
    var rows = [];
    Object.keys(limits).slice(0, 40).forEach(function (k) {
      if (!/^[A-Za-z0-9_.-]{1,60}$/.test(k)) return;
      var v = limits[k];
      var text;
      if (typeof v === "string") text = str(v, 200);
      else if (isNum(v)) text = fmtInt(v);
      else if (typeof v === "boolean") text = v ? "true" : "false";
      else if (v === null) text = DASH;
      else text = null;
      rows.push({ key: k, value: text });
    });
    return rows.length ? rows : null;
  }

  // Eylem sonucu (AM.state.data["providerAction:<id>"]) -> {tone, kind, text}
  function actionResult(entry) {
    if (!entry || typeof entry !== "object") return null;
    if (entry.status === "loading") return { tone: "muted", kind: "loading", text: T("page-providers.loading") };
    if (entry.status === "error") return { tone: "bad", kind: "error", text: T("page-providers.act.failed", { reason: str(scrubSecrets(entry.reason || DASH), 300) }) };
    if (entry.status === "ok") {
      var v = obj(entry.value);
      var msg = typeof v.message === "string" ? v.message : typeof v.detail === "string" ? v.detail : typeof v.error === "string" ? v.error : "";
      if (v.ok === false || typeof v.error === "string") return { tone: "bad", kind: "failed", text: T("page-providers.act.failed", { reason: str(scrubSecrets(msg || DASH), 300) }) };
      return { tone: "ok", kind: "ok", text: msg ? T("page-providers.act.ok") + " " + str(scrubSecrets(msg), 300) : T("page-providers.act.ok") };
    }
    return null;
  }

  function billingKey(routeKind) { return routeKind === "subscription" ? "subscription" : "other"; }

  function listInfo(p, detailEntry) {
    var x = obj(p);
    var det = detailEntry && detailEntry.status === "ok" && detailEntry.value && detailEntry.value.provider ? normDetail(detailEntry.value.provider) : null;
    var caps = arr(x.capabilities, 200).map(function (c) { return { operation: str(obj(c).operation, 100), status: normStatus(obj(c).status) }; });
    var disabled = det ? det.enabled === false : false;
    return {
      id: str(x.id, 100), name: str(x.displayName || x.id, 200), routeKind: str(x.routeKind, 40), caps: caps,
      counts: capCounts(caps), level: providerLevel(caps, disabled), disabled: disabled,
      lastSuccess: det ? (det.lastSuccess ? det.lastSuccess : false) : undefined
    };
  }

  function sigOf(AM, id) {
    try {
      var st = AM && AM.state ? AM.state : {};
      var data = st.data || {};
      return JSON.stringify([id, st.providers, st.policy, st.busy === true, data["providerDetail:" + id], data["providerAction:" + id],
        (function () { var o = {}; (st.providers || []).forEach(function (p) { if (p && p.id) o[p.id] = data["providerDetail:" + p.id]; }); return id ? null : o; })(),
        id && st.docs ? st.docs : null]);
    } catch (e) { return "?" + Math.random(); }
  }

  var pure = {
    normStatus: normStatus, capCounts: capCounts, providerLevel: providerLevel, levelTone: levelTone, statusTone: statusTone, usability: usability,
    commandsFor: commandsFor, docNameOf: docNameOf, scrubSecrets: scrubSecrets, fmtDateTime: fmtDateTime, fmtInt: fmtInt, normDetail: normDetail,
    limitRows: limitRows, actionResult: actionResult, billingKey: billingKey, validId: validId, listInfo: listInfo, sigOf: sigOf,
    STATUSES: STATUSES, DOC_WHITELIST: DOC_WHITELIST
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

  // Rozet: şekil (simge) + metin; renk tek ipucu değildir.
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

  var S = { lastRoot: null, lastSig: "", live: null, docRequested: {}, docMissing: {}, lastParam: null };

  function announce(text) { if (S.live) S.live.textContent = String(text); }

  function btn(label, onClick, fkey, cls) {
    var b = el("button", "am-pp-btn" + (cls ? " " + cls : ""), label);
    b.type = "button";
    if (fkey) b.setAttribute("data-fkey", fkey);
    b.addEventListener("click", onClick);
    return b;
  }

  function section(parent, title, level) {
    var s = el("section", "am-pp-sec");
    s.appendChild(el(level || "h3", "am-pp-h3", title));
    parent.appendChild(s);
    return s;
  }

  function kv(parent, label, valueNode) {
    var r = el("div", "am-pp-kv");
    r.appendChild(el("div", "am-pp-k", label));
    var v = el("div", "am-pp-v");
    if (valueNode && typeof valueNode === "object" && valueNode.nodeType) v.appendChild(valueNode);
    else v.textContent = String(valueNode == null ? "" : valueNode);
    r.appendChild(v);
    parent.appendChild(r);
    return r;
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
    if (onRetry) body.appendChild(btn(T("page-providers.err.retry"), onRetry, "retry"));
    c.appendChild(body);
    parent.appendChild(c);
    return c;
  }

  // Gerçek table / th scope: ilk sütun satır başlığıdır.
  function makeTable(caption, heads, rows, rowClassOf) {
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
    rows.forEach(function (cells, ri) {
      var tr = el("tr", rowClassOf ? rowClassOf(ri) : "");
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

  function counts(info) {
    var wrap = el("span", "am-pp-counts");
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", T("page-providers.countsLabel"));
    STATUSES.forEach(function (s) {
      var n = info.counts[s];
      var label = T("page-providers.status." + s);
      var c = chip(T("page-providers.count", { label: label, n: n }), n > 0 ? statusTone(s) : "muted", n > 0 ? undefined : "dot");
      wrap.appendChild(c);
    });
    return wrap;
  }

  // ------------------------------------------------------------------ LİSTE
  function buildList(AM, root) {
    var st = AM.state || {};
    var data = st.data || {};
    var h = el("h2", "am-pp-h2", T("page-providers.title"));
    h.setAttribute("tabindex", "-1");
    h.setAttribute("data-fkey", "title");
    root.appendChild(h);
    root.appendChild(el("p", "am-pp-desc", T("page-providers.intro")));
    note(root, T("page-providers.noFallback"), "warn");
    note(root, T("page-providers.planned"), "info");

    var list = arr(st.providers, 100);
    if (!list.length) {
      if (st.busy === true) { skeleton(root, T("page-providers.loading")); return; }
      var e = el("div", "am-pp-empty");
      e.appendChild(el("strong", "am-pp-empty-t", T("page-providers.empty")));
      e.appendChild(el("p", "am-pp-empty-d", T("page-providers.emptyHint")));
      root.appendChild(e);
      return;
    }

    var ul = el("ul", "am-pp-list");
    ul.setAttribute("aria-label", T("page-providers.listLabel"));
    list.forEach(function (p) {
      var info = listInfo(p, data["providerDetail:" + str(obj(p).id, 100)]);
      var li = el("li", "am-pp-li");
      var inner = el("span", "am-pp-card");
      var top = el("span", "am-pp-card-top");
      top.appendChild(el("span", "am-pp-name", info.name));
      top.appendChild(chip(T("page-providers.level." + info.level), levelTone(info.level)));
      inner.appendChild(top);
      var meta = el("span", "am-pp-meta");
      var routeText = info.routeKind === "subscription" ? T("page-providers.route.subscription") : (info.routeKind || T("page-providers.route.unknown"));
      meta.appendChild(chip(T("page-providers.route", { route: routeText }), "info", "link"));
      inner.appendChild(meta);
      inner.appendChild(counts(info));
      if (info.lastSuccess === undefined) inner.appendChild(el("span", "am-pp-sub", T("page-providers.detailHint")));
      else if (info.lastSuccess === false) inner.appendChild(el("span", "am-pp-sub", T("page-providers.lastSuccessNone")));
      else inner.appendChild(el("span", "am-pp-sub", T("page-providers.lastSuccessLine", { when: fmtDateTime(info.lastSuccess.at) + (info.lastSuccess.model ? " · " + info.lastSuccess.model : "") })));

      if (validId(info.id)) {
        var b = el("button", "am-pp-rowbtn");
        b.type = "button";
        b.setAttribute("data-fkey", "row:" + info.id);
        b.setAttribute("aria-label", T("page-providers.rowOpen", { name: info.name, level: T("page-providers.level." + info.level) }));
        b.appendChild(inner);
        b.addEventListener("click", function () {
          act(AM, "setView", [{ page: "providers", pageParam: info.id }]);
          act(AM, "loadData", ["providerDetail", info.id]);
        });
        li.appendChild(b);
      } else {
        inner.appendChild(el("span", "am-pp-sub", T("page-providers.noId")));
        li.appendChild(inner);
      }
      ul.appendChild(li);
    });
    root.appendChild(ul);
  }

  // ------------------------------------------------------------------ DETAY
  function copyCommand(AM, cmd) {
    var a = AM && AM.actions;
    if (!a || typeof a.copyText !== "function") { announce(T("page-providers.act.unavailable")); return; }
    var r;
    try { r = a.copyText(cmd); } catch (e) { announce(T("page-providers.cmd.copyFail")); return; }
    Promise.resolve(r).then(function (ok) { announce(ok === false ? T("page-providers.cmd.copyFail") : T("page-providers.cmd.copied")); }, function () { announce(T("page-providers.cmd.copyFail")); });
  }

  function buildDocs(AM, parent, p) {
    var sec = section(parent, T("page-providers.sec.docs"));
    if (!p.docs) { sec.appendChild(el("p", "am-pp-muted", T("page-providers.docs.none"))); return; }
    var name = p.docs;
    var docs = obj(AM.state && AM.state.docs);
    var entry = docs[name];
    if (!entry && !S.docRequested[name]) {
      S.docRequested[name] = true;
      var r;
      try { r = AM.actions && typeof AM.actions.loadDoc === "function" ? AM.actions.loadDoc(name) : null; } catch (e) { r = null; }
      Promise.resolve(r).then(function () {
        if (!obj(AM.state && AM.state.docs)[name]) {
          S.docMissing[name] = true;
          if (S.lastRoot && S.lastParam) { S.lastSig = ""; render(AM, S.lastRoot, S.lastParam); }
        }
      }, function () { S.docMissing[name] = true; });
    }
    if (!entry) {
      if (S.docMissing[name]) sec.appendChild(el("p", "am-pp-muted", T("page-providers.docs.missing")));
      else { var l = el("p", "am-pp-muted", T("page-providers.docs.loading")); l.setAttribute("role", "status"); sec.appendChild(l); }
      return;
    }
    if (entry.status === "loading") { var l2 = el("p", "am-pp-muted", T("page-providers.docs.loading")); l2.setAttribute("role", "status"); sec.appendChild(l2); return; }
    if (entry.status === "error") {
      sec.appendChild(el("p", "am-pp-muted", T("page-providers.docs.error", { reason: str(entry.reason || DASH, 40) })));
      sec.appendChild(btn(T("page-providers.docs.retry"), function () { S.docRequested[name] = false; S.lastSig = ""; act(AM, "loadDoc", [name]); }, "docretry"));
      return;
    }
    var box = el("div", "am-pp-doc");
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", T("page-providers.docs.region"));
    box.setAttribute("tabindex", "0");
    var text = typeof entry.text === "string" ? entry.text : "";
    var done = false;
    try {
      if (window.AM_MD && typeof window.AM_MD.render === "function") { box.appendChild(window.AM_MD.render(text)); done = true; }
    } catch (e) { box.textContent = ""; done = false; }
    if (!done) { var pre = el("pre", "am-pp-pre"); pre.textContent = text; box.appendChild(pre); }
    sec.appendChild(box);
  }

  function buildDetail(AM, root, id) {
    var st = AM.state || {};
    var data = st.data || {};
    var key = "providerDetail:" + id;
    var entry = data[key];
    var listed = null;
    arr(st.providers, 100).forEach(function (p) { if (obj(p).id === id) listed = p; });

    if (!entry && validId(id)) act(AM, "loadData", ["providerDetail", id]);

    var back = btn("← " + T("page-providers.back"), function () { act(AM, "setView", [{ page: "providers", pageParam: "" }]); }, "back", "am-pp-btn--ghost");
    back.setAttribute("aria-label", T("page-providers.backAria"));
    root.appendChild(back);

    var p = entry && entry.status === "ok" && entry.value && entry.value.provider && typeof entry.value.provider === "object" ? normDetail(entry.value.provider) : null;
    var titleText = p ? p.displayName : (listed ? str(obj(listed).displayName || id, 200) : id);
    var h = el("h2", "am-pp-h2", titleText);
    h.setAttribute("tabindex", "-1");
    h.setAttribute("data-fkey", "title");
    root.appendChild(h);

    if (!entry || entry.status === "loading") { skeleton(root, T("page-providers.detail.loading")); return; }
    if (entry.status === "error") {
      errorCard(root, T("page-providers.detail.errTitle"), T("page-providers.detail.errBody", { reason: str(scrubSecrets(entry.reason || DASH), 200) }), function () { act(AM, "loadData", ["providerDetail", id]); });
      return;
    }
    if (!p) { errorCard(root, T("page-providers.detail.errTitle"), T("page-providers.detail.notFound"), function () { act(AM, "loadData", ["providerDetail", id]); }); return; }

    var disabled = p.enabled === false;
    var level = providerLevel(p.capabilities, disabled);
    var head = el("div", "am-pp-headchips");
    head.appendChild(chip(T("page-providers.level." + level), levelTone(level)));
    head.appendChild(chip(T("page-providers.route", { route: p.routeKind === "subscription" ? T("page-providers.route.subscription") : (p.routeKind || T("page-providers.route.unknown")) }), "info", "link"));
    head.appendChild(disabled ? chip(T("page-providers.disabledChip"), "muted", "x") : chip(T("page-providers.enabled"), "ok"));
    root.appendChild(head);
    note(root, T("page-providers.noFallback"), "warn");

    // Eylemler
    var aSec = section(root, T("page-providers.sec.actions"));
    var row = el("div", "am-pp-actions");
    row.appendChild(btn(T("page-providers.act.test"), function () { act(AM, "providerAction", [id, "test"]); }, "act:test"));
    if (disabled) row.appendChild(btn(T("page-providers.act.enable"), function () { act(AM, "providerAction", [id, "enable"]); }, "act:enable"));
    else row.appendChild(btn(T("page-providers.act.disable"), function () { act(AM, "providerAction", [id, "disable"]); }, "act:disable", "am-pp-btn--danger"));
    aSec.appendChild(row);
    aSec.appendChild(el("p", "am-pp-muted", T("page-providers.act.testHint")));
    aSec.appendChild(el("p", "am-pp-muted", T("page-providers.act.toggleHint")));
    var res = actionResult(data["providerAction:" + id]);
    if (res) {
      var rn = note(aSec, res.text, res.tone === "ok" ? "ok" : res.tone === "bad" ? "bad" : "muted");
      rn.setAttribute("role", res.tone === "bad" ? "alert" : "status");
    }

    // Bağlantı durumu
    var cSec = section(root, T("page-providers.sec.connection"));
    kv(cSec, T("page-providers.conn.status"), chip(T("page-providers.level." + level), levelTone(level)));
    kv(cSec, T("page-providers.conn.route"), p.routeKind === "subscription" ? T("page-providers.route.subscription") : (p.routeKind || T("page-providers.route.unknown")));
    kv(cSec, T("page-providers.conn.auth"), p.authMethod || T("page-providers.unknown"));
    kv(cSec, T("page-providers.conn.enabled"), disabled ? T("page-providers.disabledChip") : (p.enabled === true ? T("page-providers.enabled") : T("page-providers.unknown")));

    // Yetenekler
    var capSec = section(root, T("page-providers.sec.caps"));
    if (!p.capabilities.length) {
      note(capSec, T("page-providers.caps.none"), "warn");
    } else {
      var c = capCounts(p.capabilities);
      if (c.partial + c.unverified + c.unsupported + c.unavailable > 0) note(capSec, T("page-providers.caps.warn"), "warn");
      var rows = p.capabilities.map(function (cap) {
        var u = usability(cap.status);
        return [
          cap.operation || DASH,
          chip(T("page-providers.status." + cap.status), statusTone(cap.status)),
          chip(T("page-providers.use." + u.key), u.usable === "yes" ? "ok" : u.usable === "partial" ? "warn" : "bad", u.usable === "yes" ? "check" : u.usable === "partial" ? "alert" : "x"),
          cap.evidence || T("page-providers.caps.noEvidence"),
          cap.verifiedAt ? fmtDateTime(cap.verifiedAt) : T("page-providers.caps.neverVerified")
        ];
      });
      capSec.appendChild(makeTable(T("page-providers.caps.caption"),
        [T("page-providers.caps.op"), T("page-providers.caps.status"), T("page-providers.caps.usable"), T("page-providers.caps.evidence"), T("page-providers.caps.verifiedAt")],
        rows, function (i) { return usability(p.capabilities[i].status).usable === "no" ? "am-pp-tr--no" : ""; }));
    }

    // Modeller
    var mSec = section(root, T("page-providers.sec.models"));
    if (!p.models.length) mSec.appendChild(el("p", "am-pp-muted", T("page-providers.models.none")));
    else mSec.appendChild(makeTable(T("page-providers.models.caption"),
      [T("page-providers.models.model"), T("page-providers.models.runs"), T("page-providers.models.lastAt")],
      p.models.map(function (m) { return [m.model || DASH, m.runs === null ? DASH : fmtInt(m.runs), m.lastAt ? fmtDateTime(m.lastAt) : DASH]; })));

    // Sağlık
    var hSec = section(root, T("page-providers.sec.health"));
    var testCap = null;
    p.capabilities.forEach(function (cap) { if (/^testconnection$/i.test(cap.operation)) testCap = cap; });
    kv(hSec, T("page-providers.health.test"), testCap ? chip(T("page-providers.status." + testCap.status), statusTone(testCap.status)) : T("page-providers.health.notReported"));
    kv(hSec, T("page-providers.health.last"), res ? res.text : T("page-providers.health.none"));
    kv(hSec, T("page-providers.health.errors"), fmtInt(p.lastErrors.length));
    hSec.appendChild(el("p", "am-pp-muted", T("page-providers.health.note")));

    // İzinler
    var pSec = section(root, T("page-providers.sec.perms"));
    kv(pSec, T("page-providers.perms.policy"), p.allowedByPolicy === true ? chip(T("page-providers.yes"), "ok") : p.allowedByPolicy === false ? chip(T("page-providers.no"), "bad") : T("page-providers.unknown"));
    var pol = st.policy && typeof st.policy === "object" ? st.policy : null;
    if (pol) {
      var inList = arr(pol.allowedProviders, 100).indexOf(id) >= 0;
      kv(pSec, T("page-providers.perms.inList"), inList ? T("page-providers.yes") : T("page-providers.no"));
      kv(pSec, T("page-providers.perms.summary"), T("page-providers.perms.summaryText", { actions: arr(pol.allowedActions, 500).length, approval: arr(pol.approvalRequiredActions, 500).length, paid: str(pol.paidRoute || DASH, 40) }));
    } else {
      kv(pSec, T("page-providers.perms.summary"), T("page-providers.perms.none"));
    }
    pSec.appendChild(el("p", "am-pp-muted", T("page-providers.perms.note")));

    // Kullanım / fatura yolu
    var bSec = section(root, T("page-providers.sec.billing"));
    var bt = billingKey(p.routeKind) === "subscription" ? T("page-providers.billing.subscription") : T("page-providers.billing.other", { route: p.routeKind || T("page-providers.route.unknown") });
    bSec.appendChild(el("p", "am-pp-strong", bt));
    bSec.appendChild(el("p", "am-pp-muted", T("page-providers.billing.note")));

    // Limitler
    var lSec = section(root, T("page-providers.sec.limits"));
    var lr = limitRows(p.limits);
    if (!lr) lSec.appendChild(el("p", "am-pp-muted", T("page-providers.limits.none")));
    else {
      lSec.appendChild(el("p", "am-pp-muted", T("page-providers.limits.reported")));
      lr.forEach(function (r) { kv(lSec, r.key, r.value === null ? T("page-providers.limits.nested") : r.value); });
    }

    // Son başarılı işlem
    var sSec = section(root, T("page-providers.sec.last"));
    if (!p.lastSuccess) sSec.appendChild(el("p", "am-pp-muted", T("page-providers.last.none")));
    else {
      kv(sSec, T("page-providers.last.at"), p.lastSuccess.at ? fmtDateTime(p.lastSuccess.at) : T("page-providers.unknown"));
      kv(sSec, T("page-providers.last.model"), p.lastSuccess.model || T("page-providers.unknown"));
    }

    // Sürüm uyumu
    var vSec = section(root, T("page-providers.sec.version"));
    kv(vSec, T("page-providers.version.value"), p.version || T("page-providers.unknown"));

    // Bilinen sınırlar
    buildDocs(AM, root, p);

    // Son hatalar
    var eSec = section(root, T("page-providers.sec.errors"));
    if (!p.lastErrors.length) eSec.appendChild(el("p", "am-pp-muted", T("page-providers.errors.none")));
    else eSec.appendChild(makeTable(T("page-providers.errors.caption"),
      [T("page-providers.errors.at"), T("page-providers.errors.kind"), T("page-providers.errors.msg")],
      p.lastErrors.map(function (er) { return [er.at ? fmtDateTime(er.at) : DASH, er.kind || DASH, er.message || DASH]; })));

    // Yeniden bağlan / Güncelle / Bağlantıyı kes: komut ÇALIŞTIRMAZ, yalnız kopyalar
    var kSec = section(root, T("page-providers.sec.commands"));
    kSec.appendChild(el("p", "am-pp-muted", T("page-providers.cmd.intro")));
    var cmds = commandsFor(id);
    [["reconnect", cmds.reconnect], ["update", cmds.update], ["disconnect", cmds.disconnect]].forEach(function (pair) {
      var verb = pair[0];
      var cmd = pair[1];
      var label = T("page-providers.cmd." + verb);
      var box = el("div", "am-pp-cmd");
      box.appendChild(el("div", "am-pp-cmd-t", label));
      box.appendChild(el("div", "am-pp-muted", T("page-providers.cmd." + verb + "Desc")));
      var code = el("code", "am-pp-code", cmd || T("page-providers.cmd.nonePlaceholder"));
      box.appendChild(code);
      if (cmd) {
        var cb = btn(T("page-providers.cmd.copy", { label: label }), function () { copyCommand(AM, cmd); }, "cmd:" + verb);
        box.appendChild(cb);
      } else {
        box.appendChild(el("div", "am-pp-muted", T("page-providers.cmd.none")));
      }
      kSec.appendChild(box);
    });
  }

  // ------------------------------------------------------------------ giriş noktası
  function render(AM, root, param) {
    var id = typeof param === "string" ? param : "";
    var sig = sigOf(AM, id);
    if (root === S.lastRoot && sig === S.lastSig && root.children && root.children.length > 0) return;
    var fk = activeKey(root);
    root.textContent = "";
    S.docRequested = S.docRequested || {};
    var live = el("div", "am-pp-live am-pp-sr");
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    S.live = live;
    try {
      var page = el("div", "am-pp-page");
      if (id) buildDetail(AM, page, id); else buildList(AM, page);
      page.appendChild(live);
      root.appendChild(page);
    } catch (e) {
      root.textContent = "";
      errorCard(root, T("page-providers.err.title"), T("page-providers.err.detail", { reason: str(scrubSecrets(e && e.message ? e.message : e), 200) }), function () { S.lastSig = ""; render(AM, root, param); });
    }
    S.lastRoot = root;
    S.lastSig = sig;
    if (S.lastParam !== id) { S.lastParam = id; fk = "title"; }
    restoreFocus(root, fk);
  }

  window.AM_PAGES.register("providers", { title: T("page-providers.title"), group: "Yönetim", render: render });
  window.AM_PAGE_PROVIDERS = Object.freeze({ pure: Object.freeze(pure), render: render });
})();
