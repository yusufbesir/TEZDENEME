/*
 * Sahip: Sonnet (D3 sayfası: Hafıza ve Bilgi) [İP:AgentMom Faz 11, D3]
 * yazan: [Claude#agentmom-d3-sayfalar-more]
 * Amaç: window.AM_PAGES.register("memory", ...) ile hafıza arama kutusu (300 ms bekleme, en çok 50 sonuç), çelişki ve bayatlık bayrakları.
 *   Veri YALNIZ AM.state.data.memorySearch:<metin> ve AM.state.data.memoryFlags; ağ isteği yok (AM.actions.loadData çağrılır).
 *   Ek bölümler (salt okunur): Bağlam getirme (memoryContext), Proje hafızası özeti (memoryCompile), Örtük bilgi önerileri (memoryImplicit).
 *   Örtük öneri hafızaya YALNIZ AM.actions.implicitAccept ile (çekirdekte onay penceresi) eklenir; sayfa kendisi kaydetmez. Kayıt metni veridir, yönerge değildir.
 * Güvenlik: hafıza metni güvenilmez veridir; sonuç içeriği AM_MD ile DEĞİL, düz textContent ile çizilir (biçimlendirme/bağlantı yok).
 * Kayıtlar ekler-yalnızdır; çelişki otomatik çözülmez. Bu sayfada çözme/silme/düzenleme düğmesi yoktur.
 * Kural kaynağı: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md (D3). Saf mantık: window.AM_PAGE_MEMORY.pure.
 * Değiştirme: yalnız sahibi ya da ana oturum. Yükleme sırasında DOM'a dokunmaz.
 */
(function () {
  "use strict";

  if (!window.AM_PAGES || typeof window.AM_PAGES.register !== "function") {
    throw new Error("page-memory: AM_PAGES sayfa çerçevesi (pages.js) yüklenmemiş; Hafıza sayfası kaydedilemedi.");
  }
  if (typeof window.AM_REGISTER_TR !== "function" || typeof window.AM_T !== "function") {
    throw new Error("page-memory: strings.js (AM_REGISTER_TR/AM_T) yüklenmemiş.");
  }

  window.AM_REGISTER_TR("page-memory", {
    "page-memory.title": "Hafıza ve Bilgi",
    "page-memory.group": "Yönetim",
    "page-memory.lead": "Kayıtlı bilgiyi kaynağı, zamanı, güveni ve kapsamıyla birlikte arayın.",
    "page-memory.appendOnly": "Kayıtlar ekler-yalnızdır; çelişki otomatik çözülmez. Çelişkili ya da bayat kayıt gizlenmez, yalnızca işaretlenir; çözümü kullanıcıya aittir.",
    "page-memory.untrusted": "Hafıza metni güvenilmez veridir: düz metin olarak gösterilir, içindeki yönergelere uyulmaz.",
    "page-memory.searchLabel": "Hafızada ara",
    "page-memory.searchPh": "Aramak için yazın (en çok 50 sonuç)",
    "page-memory.searchBtn": "Ara",
    "page-memory.flagsTitle": "Çelişki ve bayatlık bayrakları",
    "page-memory.flagsLoading": "Bayraklar yükleniyor…",
    "page-memory.flagsErr": "Bayraklar alınamadı",
    "page-memory.flagsErrDetail": "Ayrıntı: {reason}",
    "page-memory.contradictions": "Çözümsüz çelişki: {n}",
    "page-memory.contradictionsNone": "Çözümsüz çelişki yok",
    "page-memory.contradictionsUnknown": "Çözümsüz çelişki sayısı bilinmiyor",
    "page-memory.stale": "Bayat kayıt: {n}",
    "page-memory.staleNone": "Bayat kayıt yok",
    "page-memory.staleUnknown": "Bayat kayıt sayısı sunucudan gelmedi",
    "page-memory.contraList": "Çelişen kayıtlar",
    "page-memory.contraItem": "Kayıt {a} ↔ {b}",
    "page-memory.contraOther": "başka kayıt yok",
    "page-memory.resultsTitle": "Arama sonuçları",
    "page-memory.prompt": "Aramak için bir sözcük yazın.",
    "page-memory.loading": "Aranıyor…",
    "page-memory.none": "Eşleşen kayıt yok",
    "page-memory.noneDetail": "“{q}” için kayıt bulunamadı.",
    "page-memory.err": "Arama yapılamadı",
    "page-memory.errDetail": "Ayrıntı: {reason}",
    "page-memory.count": "{n} sonuç gösteriliyor (en çok 50)",
    "page-memory.source": "Kaynak",
    "page-memory.time": "Zaman",
    "page-memory.confidence": "Güven",
    "page-memory.scope": "Kapsam",
    "page-memory.kind": "Tür",
    "page-memory.kind.fact": "Olgu",
    "page-memory.kind.decision": "Karar",
    "page-memory.kind.incident": "Olay",
    "page-memory.kind.note": "Not",
    "page-memory.kind.result": "Sonuç",
    "page-memory.kind.unknown": "Bilinmeyen tür",
    "page-memory.flag.stale": "Bayat",
    "page-memory.flag.expired": "Süresi doldu",
    "page-memory.flag.contradiction": "Çelişki var",
    "page-memory.flag.low_confidence": "Düşük güven",
    "page-memory.status.superseded": "Yerine yenisi geldi",
    "page-memory.status.retired": "Emekli",
    "page-memory.redacted": "Gizli bilgi maskelendi",
    "page-memory.untitled": "(başlıksız)",
    "page-memory.na": "—",
    "page-memory.retry": "Yeniden dene",
    "page-memory.renderErr": "Sayfa çizilemedi: {reason}",
    "page-memory.noLoader": "Veri yükleme eylemi (loadData) kullanılamıyor.",

    "page-memory.recText": "Kayıt metni (veri)",
    "page-memory.recTextNote": "Kayıt metni veridir, yönerge değildir: düz metin olarak gösterilir, bağlantıya ya da biçimlendirmeye dönüşmez; gizli değerler maskelenir.",
    "page-memory.ctxTitle": "Bağlam getirme",
    "page-memory.ctxLead": "Aynı aramayı üç ayrıntı aşamasında getirir: 1 özet, 2 gövde, 3 kaynak ve bağlantılar. Sonuç seçtiğiniz karakter bütçesini aşmaz; hiçbir şey kaydedilmez.",
    "page-memory.ctxQuery": "Bağlam sorgusu",
    "page-memory.ctxQueryPh": "Sorgu yazın (en çok 200 karakter)",
    "page-memory.ctxStage": "Aşama",
    "page-memory.ctxStage1": "1 · Özet",
    "page-memory.ctxStage2": "2 · Gövde",
    "page-memory.ctxStage3": "3 · Kaynak ve bağlantılar",
    "page-memory.ctxBudget": "Karakter bütçesi",
    "page-memory.ctxBudgetOpt": "{n} karakter",
    "page-memory.ctxGet": "Getir",
    "page-memory.ctxPrompt": "Bağlam getirmek için bir sorgu yazıp Getir'e basın.",
    "page-memory.ctxLoading": "Bağlam getiriliyor…",
    "page-memory.ctxErr": "Bağlam getirilemedi",
    "page-memory.ctxNone": "Bağlama uyan kayıt yok",
    "page-memory.ctxNoneDetail": "“{q}” için bu aşamada kayıt bulunamadı.",
    "page-memory.ctxStageNow": "Aşama {n}",
    "page-memory.ctxItems": "{n} kayıt",
    "page-memory.ctxUsed": "Kullanılan: {used} / {budget} karakter (%{pct})",
    "page-memory.ctxUsedUnknown": "Kullanılan karakter sayısı sunucudan gelmedi",
    "page-memory.ctxMeter": "Bütçe kullanımı",
    "page-memory.ctxOver": "Sunucu bütçeyi aşan bir yanıt bildirdi; bu beklenmeyen bir durumdur, sonuca güvenmeyin.",
    "page-memory.ctxTruncated": "Sonuç bütçeye sığmadığı için kesildi: bazı kayıtlar ya da metin parçaları yok. Bütçeyi artırın ya da sorguyu daraltın.",
    "page-memory.ctxNext": "Sonraki aşama: {ad}",
    "page-memory.ctxCaption": "Bağlam getirme sonuçları (aşama {n})",
    "page-memory.col.title": "Başlık",
    "page-memory.col.kind": "Tür",
    "page-memory.col.scope": "Kapsam",
    "page-memory.col.flags": "Bayraklar",
    "page-memory.col.score": "Skor",
    "page-memory.col.summary": "Kayıt metni (veri): özet",
    "page-memory.col.body": "Kayıt metni (veri): gövde",
    "page-memory.col.source": "Kaynak",
    "page-memory.col.time": "Zaman",
    "page-memory.col.contra": "Çelişkiler",
    "page-memory.col.links": "Bağlantılar",
    "page-memory.col.path": "Dışa aktarım yolu",
    "page-memory.clipped": "Kısaltıldı",
    "page-memory.noFlags": "Bayraksız",
    "page-memory.observed": "Gözlem: {t}",
    "page-memory.validUntil": "Geçerlilik sonu: {t}",
    "page-memory.noContra": "Çelişki yok",
    "page-memory.contraOne": "Çelişen kayıt: {o}",
    "page-memory.linkReplaces": "Yerine geçtiği: {id}",
    "page-memory.linkReplacedBy": "Yerine geçen: {id}",
    "page-memory.noLinks": "Bağlantı yok",
    "page-memory.cmpTitle": "Proje hafızası özeti",
    "page-memory.cmpLead": "Hafızadaki geçerli kayıtlardan okunabilir bir özet metni derler. Yalnız gösterir; hiçbir şeyi kaydetmez ya da dosyaya yazmaz.",
    "page-memory.cmpScope": "Kapsam (isteğe bağlı)",
    "page-memory.cmpScopePh": "Boş bırakırsanız tüm kapsamlar",
    "page-memory.cmpBtn": "Derle",
    "page-memory.cmpBadScope": "Kapsam adı geçersiz: harf ya da rakamla başlamalı; yalnız harf, rakam, boşluk ve - _ . : içerebilir (en çok 80 karakter).",
    "page-memory.cmpPrompt": "Özet metnini görmek için Derle'ye basın.",
    "page-memory.cmpLoading": "Özet derleniyor…",
    "page-memory.cmpErr": "Özet derlenemedi",
    "page-memory.cmpEmpty": "Derlenecek kayıt yok",
    "page-memory.cmpEmptyDetail": "Bu kapsamda özetlenecek geçerli kayıt bulunamadı.",
    "page-memory.cmpGenerated": "Derlenme zamanı: {t}",
    "page-memory.cmpCounts": "Kayıt sayıları",
    "page-memory.cmpSections": "Bölümler",
    "page-memory.cmpSectionItem": "{ad}: {n}",
    "page-memory.cmpSectionCut": "{ad}: {n} (kısaltıldı)",
    "page-memory.cmpTruncated": "Özet uzunluk sınırına sığmadığı için kesildi; bazı kayıtlar metinde yok.",
    "page-memory.cmpMasked": "Metindeki {n} gizli değer maskelendi.",
    "page-memory.cmpMaskedYes": "Metindeki gizli değerler maskelendi.",
    "page-memory.cmpText": "Derlenen metin (veri)",
    "page-memory.cmpSelect": "Panoya kopyalama düğmesi yoktur: metni fare ya da klavyeyle seçip kopyalayabilirsiniz.",
    "page-memory.impTitle": "Örtük bilgi önerileri",
    "page-memory.impLead": "Bunlar yalnız ÖNERİDİR; hiçbiri kendiliğinden kaydedilmez. Tekrar eden örüntülerden kurallarla çıkarılır; eklemek için onay vermeniz gerekir.",
    "page-memory.impLoading": "Öneriler yükleniyor…",
    "page-memory.impErr": "Öneriler alınamadı",
    "page-memory.impEmpty": "Henüz tekrar eden örüntü yok",
    "page-memory.impEmptyDetail": "Yeterince tekrar eden bir örüntü bulunduğunda öneri burada görünür.",
    "page-memory.impSkipped": "{n} öneri zaten hafızada kayıtlı olduğu için gösterilmiyor.",
    "page-memory.impEvidence": "Kanıt sayısı: {n}",
    "page-memory.impRepeat": "Tekrar: {n}",
    "page-memory.impConf": "Güven: %{n}",
    "page-memory.impConfUnknown": "Güven bilinmiyor",
    "page-memory.impScope": "Önerilen kapsam: {s}",
    "page-memory.impEvidenceList": "Kanıtlar",
    "page-memory.impAdd": "Hafızaya ekle",
    "page-memory.impWarn": "Ajan çıktısından/denetim kaydından türetildi; doğrulanmadı. Kaydetmeden önce metni kontrol edin.",
    "page-memory.impTooLong": "Metin çok uzun (2000 karakterden fazla) ya da kesilmiş; eklenemez.",
    "page-memory.impAdding": "Ekleniyor…",
    "page-memory.impDone": "Eklendi; liste yenilendi.",
    "page-memory.impDup": "Bu bilgi hafızada zaten vardı; yeni kayıt açılmadı.",
    "page-memory.impActionErr": "Eklenemedi",
    "page-memory.impItemKind": "Tür: {k}",
    "page-memory.impItemKindUnknown": "Bilinmeyen tür"
  });

  var T = function (key, vars) { return window.AM_T(key, vars); };

  // ------------------------------------------------------------------ saf mantık
  var DEBOUNCE_MS = 300;
  var MAX_RESULTS = 50;
  var MAX_QUERY = 100;
  var KIND_OK = { fact: 1, decision: 1, incident: 1, note: 1, result: 1 };
  var FLAG_TONE = { stale: "warn", expired: "warn", contradiction: "bad", low_confidence: "info" };
  var FLAG_ICON = { stale: "clock", expired: "clock", contradiction: "alert", low_confidence: "info" };

  function str(v, max) { return typeof v === "string" ? v.slice(0, max || 300) : v == null ? "" : String(v).slice(0, max || 300); }
  function num(v) { var n = Number(v); return v === null || v === undefined || v === "" || !isFinite(n) ? null : n; }

  function cleanQuery(s) { return String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY); }
  function searchKey(term) { return "memorySearch:" + term; }
  function normHits(value) {
    var list = value && typeof value === "object" ? (Array.isArray(value) ? value : value.hits) : null;
    return (Array.isArray(list) ? list.slice(0, MAX_RESULTS) : []).map(function (h) {
      var o = h && typeof h === "object" ? h : {};
      var conf = num(o.confidence);
      return {
        id: str(o.id, 64), kind: KIND_OK[o.kind] === 1 ? o.kind : "unknown", title: str(o.title, 300), body: str(o.body, 1500),
        source: str(o.source, 200), sourceRef: o.sourceRef == null ? "" : str(o.sourceRef, 300), scope: str(o.scope, 120),
        confidence: conf, observedAt: str(o.observedAt, 40), status: str(o.status, 20), redacted: o.redacted === true,
        flags: (Array.isArray(o.flags) ? o.flags.slice(0, 8) : []).filter(function (f) { return Object.prototype.hasOwnProperty.call(FLAG_TONE, f); })
      };
    });
  }
  function confPct(c) { return c === null || c === undefined ? null : Math.round(Math.min(1, Math.max(0, c)) * 100); }
  function fmtTime(iso) {
    var d = new Date(String(iso || ""));
    if (isNaN(d.getTime())) return str(iso, 40);
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  // memoryFlags: çözümsüz çelişki ve bayat sayıları. Sunucu vermediyse null (bilinmiyor); 0 uydurulmaz.
  function flagsSummary(value) {
    var v = value && typeof value === "object" ? value : {};
    var contra = Array.isArray(v.contradictions) ? v.contradictions : null;
    var cn = contra ? contra.length : num(v.contradictionCount);
    var staleArr = Array.isArray(v.stale) ? v.stale : Array.isArray(v.staleRecords) ? v.staleRecords : null;
    var sn = staleArr ? staleArr.length : num(v.staleCount !== undefined ? v.staleCount : typeof v.stale === "number" ? v.stale : null);
    return {
      contradictions: cn,
      stale: sn,
      list: (contra || []).slice(0, 20).map(function (c) {
        var o = c && typeof c === "object" ? c : {};
        return { id: str(o.id, 64), recordId: str(o.recordId, 64), otherId: o.otherId == null ? "" : str(o.otherId, 64), detail: str(o.detail, 500) };
      })
    };
  }

  // ---- Bağlam getirme, proje hafızası özeti, örtük öneriler: saf mantık ----
  // Sunucudan gelen her metin güvenilmez VERİDİR: denetim/çift yönlü karakterler boşluğa çevrilir, bilinen gizli değer kalıpları maskelenir, uzunluk sınırlanır.
  var CTRL_RE = /[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  var BLOCK_CTRL_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  var SECRET_RE = /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,})\b|Bearer\s+[A-Za-z0-9._~+\/=-]{12,}/g;
  var SCOPE_RE = /^[A-Za-z0-9][A-Za-z0-9_.:\- ]{0,79}$/;
  var MAX_CTX_QUERY = 200;
  var BUDGETS = [500, 1000, 3000, 6000, 12000, 20000];
  var DEFAULT_BUDGET = 3000;
  var MAX_MARKDOWN = 60000;
  var MAX_CANDIDATES = 50;
  var MAX_EVIDENCE = 10;
  var IMPL_MAX_TEXT = 2000; // çekirdekteki IMPLICIT_MAX ile aynı tek sınır
  var IMPL_KIND_OK = { fact: 1, note: 1, incident: 1 };

  function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  function safe(v, max) {
    var s = typeof v === "string" ? v : v == null ? "" : String(v);
    s = s.replace(CTRL_RE, " ").replace(SECRET_RE, "[gizli]");
    var lim = max || 300;
    return s.length > lim ? s.slice(0, lim - 1) + "…" : s;
  }
  // Çok satırlı metin (derlenen özet): satır sonu ve sekme korunur, diğer denetim/çift yönlü karakterler boşluğa çevrilir, gizli değerler maskelenir.
  function safeBlock(v, max) {
    var s = typeof v === "string" ? v : "";
    s = s.replace(/\r\n?/g, "\n").replace(BLOCK_CTRL_RE, " ").replace(SECRET_RE, "[gizli]");
    var lim = max || MAX_MARKDOWN;
    return s.length > lim ? s.slice(0, lim - 1) + "…" : s;
  }
  function fmtInt(n) { var v = num(n); return v === null ? "—" : String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function cleanCtxQuery(s) { return String(s == null ? "" : s).replace(CTRL_RE, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CTX_QUERY); }
  function pickStage(v) { var n = Number(v); return n === 2 || n === 3 ? n : 1; }
  function pickBudget(v) { var n = Number(v); return BUDGETS.indexOf(n) >= 0 ? n : DEFAULT_BUDGET; }
  // Çekirdekteki memoryContext parametre biçimi: "aşama|bütçe|sorgu".
  function ctxParam(stage, budget, q) { return pickStage(stage) + "|" + pickBudget(budget) + "|" + cleanCtxQuery(q); }
  function ctxKey(param) { return "memoryContext:" + param; }
  function cmpKey(scope) { return scope ? "memoryCompile:" + scope : "memoryCompile"; }
  function scopeOk(s) { return s === "" || SCOPE_RE.test(s); }

  function normItem(raw) {
    var o = isObj(raw) ? raw : {};
    var sc = num(o.score);
    var contra = (Array.isArray(o.contradictions) ? o.contradictions.slice(0, 10) : []).map(function (c) {
      var x = isObj(c) ? c : {};
      return { otherId: x.otherId == null ? "" : safe(x.otherId, 64), detail: safe(x.detail, 300) };
    });
    var l = isObj(o.links) ? o.links : {};
    return {
      id: safe(o.id, 64), kind: KIND_OK[o.kind] === 1 ? o.kind : "unknown", scope: safe(o.scope, 120), title: safe(o.title, 200),
      flags: (Array.isArray(o.flags) ? o.flags.slice(0, 8) : []).filter(function (f) { return Object.prototype.hasOwnProperty.call(FLAG_TONE, f); }),
      score: sc === null ? null : Math.round(Math.min(1, Math.max(0, sc)) * 100),
      summary: safe(o.summary, 400), body: safe(o.body, 1500), bodyClipped: o.bodyClipped === true,
      source: safe(o.source, 200), sourceRef: o.sourceRef == null ? "" : safe(o.sourceRef, 300), exportedPath: o.exportedPath == null ? "" : safe(o.exportedPath, 300),
      observedAt: safe(o.observedAt, 40), validUntil: o.validUntil == null ? "" : safe(o.validUntil, 40),
      contradictions: contra, replaces: l.replaces == null ? "" : safe(l.replaces, 64), replacedBy: l.replacedBy == null ? "" : safe(l.replacedBy, 64)
    };
  }
  // Bozuk/eksik yanıt: null (hata kartı); uydurma sayı yok.
  function normContext(value) {
    var v = isObj(value) ? value : null;
    if (!v || !Array.isArray(v.items)) return null;
    var next = Number(v.nextStage);
    return {
      stage: pickStage(v.stage), query: safe(v.query, MAX_CTX_QUERY), items: v.items.slice(0, 50).map(normItem),
      used: num(v.usedChars), budget: num(v.budgetChars), truncated: v.truncated === true, next: next === 2 || next === 3 ? next : null
    };
  }
  function normCompile(value) {
    var v = isObj(value) ? value : null;
    if (!v || typeof v.markdown !== "string") return null;
    var counts = [];
    if (isObj(v.counts)) Object.keys(v.counts).slice(0, 20).forEach(function (k) { var n = num(v.counts[k]); if (n !== null) counts.push({ name: safe(k, 60), n: n }); });
    var secs = (Array.isArray(v.sections) ? v.sections.slice(0, 30) : []).map(function (s) {
      var o = isObj(s) ? s : {};
      return { name: safe(o.name, 80), n: num(o.count), truncated: o.truncated === true };
    });
    var masked = v.maskedSecrets === true ? true : num(v.maskedSecrets);
    return { markdown: safeBlock(v.markdown, MAX_MARKDOWN), sections: secs, counts: counts, generatedAt: safe(v.generatedAt, 40), truncated: v.truncated === true, masked: masked };
  }
  function normCandidates(value) {
    var v = isObj(value) ? value : null;
    if (!v || !Array.isArray(v.candidates)) return null;
    var list = v.candidates.slice(0, MAX_CANDIDATES).filter(isObj).map(function (c) {
      var conf = num(c.confidence);
      var ev = (Array.isArray(c.evidence) ? c.evidence.slice(0, MAX_EVIDENCE) : []).map(function (e) { return safe(e, 300); }).filter(function (e) { return e !== ""; });
      return {
        id: safe(c.id, 80), kind: IMPL_KIND_OK[c.kind] === 1 ? c.kind : "unknown", text: safe(c.text, 20000),
        long: c.textCut === true || (typeof c.text === "string" && c.text.length > IMPL_MAX_TEXT), evidence: ev, count: num(c.count),
        confidence: conf === null || conf < 0 || conf > 1 ? null : Math.round(conf * 100), scope: safe(c.suggestedScope, 80)
      };
    });
    return { list: list, skipped: num(v.skippedAlreadyRecorded) };
  }

  // ------------------------------------------------------------------ DOM
  var TONES = { ok: 1, warn: 1, bad: 1, info: 1, muted: 1 };
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  function icon(name, size) {
    try { if (typeof window.AM_ICON === "function") return window.AM_ICON(name, { size: size || 14 }); } catch (e) { /* simge yoksa metin yeter */ }
    return document.createTextNode("");
  }
  function chip(text, tone, iconName) {
    var t = TONES[tone] === 1 ? tone : "muted";
    var c = el("span", "am-more-chip am-more-chip--" + t);
    c.appendChild(icon(iconName, 12));
    c.appendChild(el("span", "am-more-chip-t", text));
    return c;
  }
  function stateCard(kind, title, detail, retry) {
    var c = el("div", "am-more-card am-more-card--" + (kind === "error" ? "error" : kind === "loading" ? "loading" : "empty"));
    c.setAttribute("role", kind === "error" ? "alert" : "status");
    if (kind === "loading") {
      c.setAttribute("aria-busy", "true");
      c.appendChild(el("p", "am-more-card-t", title));
      for (var i = 0; i < 3; i++) { var s = el("span", "am-more-skel"); s.setAttribute("aria-hidden", "true"); c.appendChild(s); }
      return c;
    }
    c.appendChild(icon(kind === "error" ? "alert" : "info", 18));
    c.appendChild(el("p", "am-more-card-t", title));
    if (detail) c.appendChild(el("p", "am-more-card-d", detail));
    if (retry) { var b = el("button", "am-more-btn", T("page-memory.retry")); b.type = "button"; b.addEventListener("click", retry); c.appendChild(b); }
    return c;
  }
  function noteLine(iconName, text, warn) {
    var n = el("p", warn === true ? "am-more-note am-more-note--warn" : "am-more-note");
    n.appendChild(icon(iconName, 16));
    n.appendChild(el("span", "am-more-note-t", text));
    return n;
  }

  var S = { AM: null, root: null, page: null, ui: null, term: "", timer: null, flagsRequested: false, ctxParam: null, ctxPrompt: "prompt", cmpScope: null, cmpBad: false, impRequested: false, accepting: Object.create(null) };

  function dataOf(key) { var AM = S.AM; return AM && AM.state && AM.state.data ? AM.state.data[key] : undefined; }
  function loader() { return S.AM && S.AM.actions && typeof S.AM.actions.loadData === "function" ? S.AM.actions.loadData : null; }

  function runSearch(term) {
    var f = loader();
    S.term = term;
    if (!term) { fillResults(); return; }
    if (f) f.call(S.AM.actions, "memorySearch", term);
    fillResults();
  }
  function schedule(raw) {
    var term = cleanQuery(raw);
    if (S.timer !== null && typeof clearTimeout === "function") clearTimeout(S.timer);
    S.timer = null;
    if (!term) { runSearch(""); return; }
    S.timer = setTimeout(function () { S.timer = null; runSearch(term); }, DEBOUNCE_MS);
  }

  function buildShell(root) {
    root.textContent = "";
    var ui = {};
    var page = el("section", "am-more-page");
    page.setAttribute("aria-labelledby", "am-more-mm-h");
    var h = el("h2", "am-more-h", T("page-memory.title")); h.setAttribute("id", "am-more-mm-h");
    page.appendChild(h);
    page.appendChild(el("p", "am-more-lead", T("page-memory.lead")));
    var notes = el("div", "am-more-notes");
    notes.appendChild(noteLine("shield", T("page-memory.appendOnly")));
    notes.appendChild(noteLine("alert", T("page-memory.untrusted")));
    page.appendChild(notes);

    var form = el("form", "am-more-controls");
    form.setAttribute("role", "search");
    form.addEventListener("submit", function (e) {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      if (S.timer !== null && typeof clearTimeout === "function") clearTimeout(S.timer);
      S.timer = null;
      runSearch(cleanQuery(ui.q.value));
    });
    var lab = el("label", "am-more-field am-more-field--grow");
    lab.setAttribute("for", "am-more-mm-q");
    lab.appendChild(el("span", "am-more-field-l", T("page-memory.searchLabel")));
    ui.q = el("input", "am-more-input");
    ui.q.type = "search";
    ui.q.setAttribute("id", "am-more-mm-q");
    ui.q.setAttribute("placeholder", T("page-memory.searchPh"));
    ui.q.setAttribute("autocomplete", "off");
    ui.q.setAttribute("maxlength", String(MAX_QUERY));
    ui.q.addEventListener("input", function () { schedule(ui.q.value); });
    lab.appendChild(ui.q);
    form.appendChild(lab);
    var sb = el("button", "am-more-btn", T("page-memory.searchBtn"));
    sb.type = "submit";
    form.appendChild(sb);
    page.appendChild(form);

    ui.flagsSec = el("section", "am-more-sec");
    ui.flagsSec.setAttribute("aria-labelledby", "am-more-mm-f");
    var fh = el("h3", "am-more-h3", T("page-memory.flagsTitle")); fh.setAttribute("id", "am-more-mm-f");
    ui.flagsSec.appendChild(fh);
    ui.flagsBody = el("div", "am-more-flagsbody");
    ui.flagsSec.appendChild(ui.flagsBody);
    page.appendChild(ui.flagsSec);

    ui.resSec = el("section", "am-more-sec");
    ui.resSec.setAttribute("aria-labelledby", "am-more-mm-r");
    var rh = el("h3", "am-more-h3", T("page-memory.resultsTitle")); rh.setAttribute("id", "am-more-mm-r");
    ui.resSec.appendChild(rh);
    ui.resBody = el("div", "am-more-resbody");
    ui.resBody.setAttribute("aria-live", "polite");
    ui.resSec.appendChild(ui.resBody);
    page.appendChild(ui.resSec);

    buildContextSection(page, ui);
    buildCompileSection(page, ui);
    buildImplicitSection(page, ui);

    root.appendChild(page);
    S.page = page;
    return ui;
  }

  // ---- Yeni bölümler: kabuk (bir kez kurulur; girdiler yeniden çizimde korunur) ----
  function newSection(page, idBase, titleKey, leadKey) {
    var sec = el("section", "am-more-sec");
    sec.setAttribute("aria-labelledby", idBase);
    var h = el("h3", "am-more-h3", T(titleKey)); h.setAttribute("id", idBase);
    sec.appendChild(h);
    if (leadKey) sec.appendChild(el("p", "am-more-hint", T(leadKey)));
    page.appendChild(sec);
    return sec;
  }
  function labelled(form, idBase, labelKey, control, grow) {
    var lab = el("label", "am-more-field" + (grow ? " am-more-field--grow" : ""));
    lab.setAttribute("for", idBase);
    lab.appendChild(el("span", "am-more-field-l", T(labelKey)));
    control.setAttribute("id", idBase);
    lab.appendChild(control);
    form.appendChild(lab);
  }
  function submitBtn(form, textKey) {
    var b = el("button", "am-more-btn", T(textKey));
    b.type = "submit";
    form.appendChild(b);
    return b;
  }

  function buildContextSection(page, ui) {
    var sec = newSection(page, "am-more-mm-c", "page-memory.ctxTitle", "page-memory.ctxLead");
    sec.appendChild(noteLine("alert", T("page-memory.recTextNote")));
    var form = el("form", "am-more-controls");
    form.setAttribute("role", "search");
    form.addEventListener("submit", function (e) { if (e && typeof e.preventDefault === "function") e.preventDefault(); runContext(); });
    ui.cq = el("input", "am-more-input");
    ui.cq.type = "search";
    ui.cq.setAttribute("placeholder", T("page-memory.ctxQueryPh"));
    ui.cq.setAttribute("autocomplete", "off");
    ui.cq.setAttribute("maxlength", String(MAX_CTX_QUERY));
    labelled(form, "am-more-mm-cq", "page-memory.ctxQuery", ui.cq, true);
    ui.cs = el("select", "am-more-select");
    [1, 2, 3].forEach(function (n) { var o = el("option", "", T("page-memory.ctxStage" + n)); o.value = String(n); ui.cs.appendChild(o); });
    ui.cs.value = "1";
    ui.cs.addEventListener("change", function () { if (cleanCtxQuery(ui.cq.value)) runContext(); });
    labelled(form, "am-more-mm-cs", "page-memory.ctxStage", ui.cs, false);
    ui.cb = el("select", "am-more-select");
    BUDGETS.forEach(function (n) { var o = el("option", "", T("page-memory.ctxBudgetOpt", { n: fmtInt(n) })); o.value = String(n); ui.cb.appendChild(o); });
    ui.cb.value = String(DEFAULT_BUDGET);
    ui.cb.addEventListener("change", function () { if (cleanCtxQuery(ui.cq.value)) runContext(); });
    labelled(form, "am-more-mm-cb", "page-memory.ctxBudget", ui.cb, false);
    submitBtn(form, "page-memory.ctxGet");
    sec.appendChild(form);
    ui.ctxBody = el("div", "am-more-ctxbody");
    ui.ctxBody.setAttribute("aria-live", "polite");
    sec.appendChild(ui.ctxBody);
  }

  function buildCompileSection(page, ui) {
    var sec = newSection(page, "am-more-mm-k", "page-memory.cmpTitle", "page-memory.cmpLead");
    var form = el("form", "am-more-controls");
    form.addEventListener("submit", function (e) { if (e && typeof e.preventDefault === "function") e.preventDefault(); runCompile(); });
    ui.ks = el("input", "am-more-input");
    ui.ks.type = "text";
    ui.ks.setAttribute("placeholder", T("page-memory.cmpScopePh"));
    ui.ks.setAttribute("autocomplete", "off");
    ui.ks.setAttribute("maxlength", "80");
    labelled(form, "am-more-mm-ks", "page-memory.cmpScope", ui.ks, true);
    submitBtn(form, "page-memory.cmpBtn");
    sec.appendChild(form);
    ui.cmpBody = el("div", "am-more-cmpbody");
    ui.cmpBody.setAttribute("aria-live", "polite");
    sec.appendChild(ui.cmpBody);
  }

  function buildImplicitSection(page, ui) {
    var sec = newSection(page, "am-more-mm-i", "page-memory.impTitle", null);
    sec.appendChild(noteLine("shield", T("page-memory.impLead")));
    sec.appendChild(noteLine("alert", T("page-memory.recTextNote")));
    ui.impBody = el("div", "am-more-impbody");
    ui.impBody.setAttribute("aria-live", "polite");
    sec.appendChild(ui.impBody);
  }

  function fillFlags() {
    var ui = S.ui; var body = ui.flagsBody;
    body.textContent = "";
    var d = dataOf("memoryFlags");
    if (!d) {
      if (loader() && !S.flagsRequested) { S.flagsRequested = true; loader().call(S.AM.actions, "memoryFlags"); }
      body.appendChild(stateCard("loading", T("page-memory.flagsLoading")));
      return;
    }
    if (d.status === "loading") { body.appendChild(stateCard("loading", T("page-memory.flagsLoading"))); return; }
    if (d.status === "error") {
      body.appendChild(stateCard("error", T("page-memory.flagsErr"), T("page-memory.flagsErrDetail", { reason: str(d.reason, 200) || "?" }), function () {
        if (loader()) loader().call(S.AM.actions, "memoryFlags");
      }));
      return;
    }
    S.flagsRequested = false;
    var f = flagsSummary(d.value);
    var row = el("div", "am-more-chips");
    if (f.contradictions === null) row.appendChild(chip(T("page-memory.contradictionsUnknown"), "info", "info"));
    else if (f.contradictions > 0) row.appendChild(chip(T("page-memory.contradictions", { n: f.contradictions }), "bad", "alert"));
    else row.appendChild(chip(T("page-memory.contradictionsNone"), "ok", "check"));
    if (f.stale === null) row.appendChild(chip(T("page-memory.staleUnknown"), "info", "info"));
    else if (f.stale > 0) row.appendChild(chip(T("page-memory.stale", { n: f.stale }), "warn", "clock"));
    else row.appendChild(chip(T("page-memory.staleNone"), "ok", "check"));
    body.appendChild(row);
    if (f.list.length) {
      body.appendChild(el("h4", "am-more-h4", T("page-memory.contraList")));
      var ul = el("ul", "am-more-list");
      f.list.forEach(function (c) {
        var li = el("li", "am-more-list-li");
        li.appendChild(el("strong", "am-more-mono", T("page-memory.contraItem", { a: c.recordId || "?", b: c.otherId || T("page-memory.contraOther") })));
        if (c.detail) li.appendChild(el("span", "am-more-list-d", c.detail));
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }
  }

  function hitCard(h) {
    var li = el("li", "am-more-hit");
    var head = el("div", "am-more-hit-h");
    head.appendChild(el("strong", "am-more-hit-t", h.title || T("page-memory.untitled")));
    head.appendChild(chip(T("page-memory.kind." + h.kind), "muted", "doc"));
    h.flags.forEach(function (f) { head.appendChild(chip(T("page-memory.flag." + f), FLAG_TONE[f], FLAG_ICON[f])); });
    if (h.status === "superseded" || h.status === "retired") head.appendChild(chip(T("page-memory.status." + h.status), "muted", "archive"));
    if (h.redacted) head.appendChild(chip(T("page-memory.redacted"), "info", "shield"));
    li.appendChild(head);
    if (h.body) li.appendChild(el("p", "am-more-hit-b", h.body));
    var dl = el("dl", "am-more-kv");
    var pct = confPct(h.confidence);
    [["page-memory.source", h.source + (h.sourceRef ? " · " + h.sourceRef : "")], ["page-memory.time", fmtTime(h.observedAt) || T("page-memory.na")],
      ["page-memory.confidence", pct === null ? T("page-memory.na") : "%" + pct], ["page-memory.scope", h.scope || T("page-memory.na")]].forEach(function (p) {
      var w = el("div", "am-more-kv-i");
      w.appendChild(el("dt", "am-more-kv-k", T(p[0])));
      w.appendChild(el("dd", "am-more-kv-v", p[1] || T("page-memory.na")));
      dl.appendChild(w);
    });
    li.appendChild(dl);
    return li;
  }

  function fillResults() {
    var ui = S.ui; var body = ui.resBody;
    body.textContent = "";
    if (!S.term) { body.appendChild(stateCard("empty", T("page-memory.prompt"), "", null)); return; }
    var d = dataOf(searchKey(S.term));
    if (!d || d.status === "loading") { body.appendChild(stateCard("loading", T("page-memory.loading"))); return; }
    if (d.status === "error") {
      var term = S.term;
      body.appendChild(stateCard("error", T("page-memory.err"), T("page-memory.errDetail", { reason: str(d.reason, 200) || "?" }), function () { runSearch(term); }));
      return;
    }
    var hits = normHits(d.value);
    if (!hits.length) { body.appendChild(stateCard("empty", T("page-memory.none"), T("page-memory.noneDetail", { q: S.term }), null)); return; }
    body.appendChild(el("p", "am-more-count", T("page-memory.count", { n: hits.length })));
    var ul = el("ul", "am-more-hits");
    hits.forEach(function (h) { ul.appendChild(hitCard(h)); });
    body.appendChild(ul);
  }

  // ---- Bağlam getirme ----
  function flagChips(flags) {
    var row = el("span", "am-more-chips");
    if (!flags.length) { row.appendChild(el("span", "am-more-dim", T("page-memory.noFlags"))); return row; }
    flags.forEach(function (f) { row.appendChild(chip(T("page-memory.flag." + f), FLAG_TONE[f], FLAG_ICON[f])); });
    return row;
  }
  function td(content, cls) {
    var c = el("td", "am-more-td" + (cls ? " " + cls : ""));
    if (content && typeof content === "object") c.appendChild(content); else c.textContent = content == null || content === "" ? T("page-memory.na") : String(content);
    return c;
  }
  function tableShell(caption, cols) {
    var wrap = el("div", "am-more-tablewrap");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("aria-label", caption);
    var t = el("table", "am-more-table am-more-table--cap");
    t.appendChild(el("caption", "am-more-sr", caption));
    var thead = el("thead"); var htr = el("tr");
    cols.forEach(function (c) { var th = el("th", "am-more-th", T(c)); th.setAttribute("scope", "col"); htr.appendChild(th); });
    thead.appendChild(htr); t.appendChild(thead);
    var tb = el("tbody"); t.appendChild(tb); wrap.appendChild(t);
    return { wrap: wrap, tbody: tb };
  }
  function textCell(text, clipped) {
    var box = el("div", "am-more-rectext");
    box.appendChild(el("span", "am-more-rectext-t", text || T("page-memory.na")));
    if (clipped) box.appendChild(chip(T("page-memory.clipped"), "info", "info"));
    return td(box);
  }
  function itemRow(stage, it) {
    var tr = el("tr", "am-more-row");
    var titleBox = el("div", "am-more-names");
    titleBox.appendChild(el("strong", "am-more-name-tr", it.title || T("page-memory.untitled")));
    titleBox.appendChild(el("span", "am-more-evid", it.id));
    if (stage === 1) {
      tr.appendChild(td(titleBox, "am-more-td--name"));
      tr.appendChild(td(T("page-memory.kind." + it.kind)));
      tr.appendChild(td(it.scope));
      tr.appendChild(td(flagChips(it.flags)));
      tr.appendChild(td(it.score === null ? "" : "%" + it.score, "am-more-td--num"));
      tr.appendChild(textCell(it.summary, false));
    } else if (stage === 2) {
      tr.appendChild(td(titleBox, "am-more-td--name"));
      tr.appendChild(td(T("page-memory.kind." + it.kind)));
      tr.appendChild(td(flagChips(it.flags)));
      tr.appendChild(textCell(it.body, it.bodyClipped));
    } else {
      tr.appendChild(td(titleBox, "am-more-td--name"));
      tr.appendChild(td(flagChips(it.flags)));
      tr.appendChild(td(it.source + (it.sourceRef ? " · " + it.sourceRef : "")));
      var tm = el("div", "am-more-names");
      tm.appendChild(el("span", "am-more-name-tr", T("page-memory.observed", { t: fmtTime(it.observedAt) || T("page-memory.na") })));
      if (it.validUntil) tm.appendChild(el("span", "am-more-name-en", T("page-memory.validUntil", { t: fmtTime(it.validUntil) })));
      tr.appendChild(td(tm));
      var cb = el("div", "am-more-names");
      if (!it.contradictions.length) cb.appendChild(el("span", "am-more-dim", T("page-memory.noContra")));
      it.contradictions.forEach(function (c) {
        cb.appendChild(el("span", "am-more-name-tr", T("page-memory.contraOne", { o: c.otherId || T("page-memory.contraOther") })));
        if (c.detail) cb.appendChild(el("span", "am-more-name-en", c.detail));
      });
      tr.appendChild(td(cb));
      var lb = el("div", "am-more-names");
      if (!it.replaces && !it.replacedBy) lb.appendChild(el("span", "am-more-dim", T("page-memory.noLinks")));
      if (it.replaces) lb.appendChild(el("span", "am-more-name-tr", T("page-memory.linkReplaces", { id: it.replaces })));
      if (it.replacedBy) lb.appendChild(el("span", "am-more-name-tr", T("page-memory.linkReplacedBy", { id: it.replacedBy })));
      tr.appendChild(td(lb));
      tr.appendChild(td(it.exportedPath, "am-more-td--mono"));
    }
    return tr;
  }
  var STAGE_COLS = {
    1: ["page-memory.col.title", "page-memory.col.kind", "page-memory.col.scope", "page-memory.col.flags", "page-memory.col.score", "page-memory.col.summary"],
    2: ["page-memory.col.title", "page-memory.col.kind", "page-memory.col.flags", "page-memory.col.body"],
    3: ["page-memory.col.title", "page-memory.col.flags", "page-memory.col.source", "page-memory.col.time", "page-memory.col.contra", "page-memory.col.links", "page-memory.col.path"]
  };

  function runContext() {
    var ui = S.ui; var f = loader();
    var q = cleanCtxQuery(ui.cq.value);
    if (!q) { S.ctxParam = null; S.ctxPrompt = "prompt"; fillContext(); return; }
    S.ctxParam = ctxParam(ui.cs.value, ui.cb.value, q);
    if (f) f.call(S.AM.actions, "memoryContext", S.ctxParam);
    fillContext();
  }
  function fillContext() {
    var ui = S.ui; var body = ui.ctxBody;
    body.textContent = "";
    if (!S.ctxParam) { body.appendChild(stateCard("empty", T("page-memory.ctxPrompt"), "", null)); return; }
    var param = S.ctxParam;
    var d = dataOf(ctxKey(param));
    if (!d || d.status === "loading") { body.appendChild(stateCard("loading", T("page-memory.ctxLoading"))); return; }
    var retry = function () { if (loader()) loader().call(S.AM.actions, "memoryContext", param); };
    if (d.status === "error") {
      body.appendChild(stateCard("error", T("page-memory.ctxErr"), T("page-memory.errDetail", { reason: safe(d.reason, 200) || "?" }), retry));
      return;
    }
    var r = normContext(d.value);
    if (!r) { body.appendChild(stateCard("error", T("page-memory.ctxErr"), T("page-memory.errDetail", { reason: "?" }), retry)); return; }
    var head = el("p", "am-more-count");
    head.appendChild(chip(T("page-memory.ctxStageNow", { n: r.stage }), "info", "info"));
    head.appendChild(document.createTextNode(" " + T("page-memory.ctxItems", { n: r.items.length })));
    body.appendChild(head);
    if (r.used === null || r.budget === null || r.budget <= 0) body.appendChild(el("p", "am-more-hint", T("page-memory.ctxUsedUnknown")));
    else {
      var pct = Math.round(r.used / r.budget * 100);
      var usage = el("p", "am-more-count", T("page-memory.ctxUsed", { used: fmtInt(r.used), budget: fmtInt(r.budget), pct: pct }));
      body.appendChild(usage);
      var m = el("progress", "am-more-meter");
      m.setAttribute("max", String(r.budget));
      m.setAttribute("value", String(Math.min(r.budget, Math.max(0, r.used))));
      m.setAttribute("aria-label", T("page-memory.ctxMeter"));
      body.appendChild(m);
      if (r.used > r.budget) body.appendChild(noteLine("alert", T("page-memory.ctxOver"), true));
    }
    if (r.truncated) body.appendChild(noteLine("alert", T("page-memory.ctxTruncated"), true));
    if (!r.items.length) { body.appendChild(stateCard("empty", T("page-memory.ctxNone"), T("page-memory.ctxNoneDetail", { q: safe(r.query, 100) }), null)); return; }
    var tbl = tableShell(T("page-memory.ctxCaption", { n: r.stage }), STAGE_COLS[r.stage]);
    r.items.forEach(function (it) { tbl.tbody.appendChild(itemRow(r.stage, it)); });
    body.appendChild(tbl.wrap);
    if (r.next) {
      var nb = el("button", "am-more-btn am-more-btn--ghost", T("page-memory.ctxNext", { ad: T("page-memory.ctxStage" + r.next) }));
      nb.type = "button";
      nb.addEventListener("click", function () { S.ui.cs.value = String(r.next); runContext(); });
      body.appendChild(nb);
    }
  }

  // ---- Proje hafızası özeti ----
  function runCompile() {
    var ui = S.ui; var f = loader();
    var scope = String(ui.ks.value == null ? "" : ui.ks.value).trim();
    if (!scopeOk(scope)) { S.cmpBad = true; S.cmpScope = null; fillCompile(); return; }
    S.cmpBad = false;
    S.cmpScope = scope;
    if (f) { if (scope) f.call(S.AM.actions, "memoryCompile", scope); else f.call(S.AM.actions, "memoryCompile"); }
    fillCompile();
  }
  function fillCompile() {
    var ui = S.ui; var body = ui.cmpBody;
    body.textContent = "";
    if (S.cmpBad) { body.appendChild(stateCard("error", T("page-memory.cmpErr"), T("page-memory.cmpBadScope"), null)); return; }
    if (S.cmpScope === null) { body.appendChild(stateCard("empty", T("page-memory.cmpPrompt"), "", null)); return; }
    var scope = S.cmpScope;
    var d = dataOf(cmpKey(scope));
    if (!d || d.status === "loading") { body.appendChild(stateCard("loading", T("page-memory.cmpLoading"))); return; }
    var retry = function () { if (loader()) { if (scope) loader().call(S.AM.actions, "memoryCompile", scope); else loader().call(S.AM.actions, "memoryCompile"); } };
    if (d.status === "error") { body.appendChild(stateCard("error", T("page-memory.cmpErr"), T("page-memory.errDetail", { reason: safe(d.reason, 200) || "?" }), retry)); return; }
    var r = normCompile(d.value);
    if (!r) { body.appendChild(stateCard("error", T("page-memory.cmpErr"), T("page-memory.errDetail", { reason: "?" }), retry)); return; }
    if (r.generatedAt) body.appendChild(el("p", "am-more-count", T("page-memory.cmpGenerated", { t: fmtTime(r.generatedAt) })));
    if (r.counts.length) {
      body.appendChild(el("h4", "am-more-h4", T("page-memory.cmpCounts")));
      var dl = el("dl", "am-more-kv");
      r.counts.forEach(function (c) {
        var w = el("div", "am-more-kv-i");
        w.appendChild(el("dt", "am-more-kv-k", c.name));
        w.appendChild(el("dd", "am-more-kv-v", fmtInt(c.n)));
        dl.appendChild(w);
      });
      body.appendChild(dl);
    }
    if (r.sections.length) {
      body.appendChild(el("h4", "am-more-h4", T("page-memory.cmpSections")));
      var row = el("div", "am-more-chips");
      r.sections.forEach(function (s) {
        row.appendChild(chip(T(s.truncated ? "page-memory.cmpSectionCut" : "page-memory.cmpSectionItem", { ad: s.name || T("page-memory.untitled"), n: s.n === null ? T("page-memory.na") : fmtInt(s.n) }), s.truncated ? "warn" : "muted", s.truncated ? "alert" : "doc"));
      });
      body.appendChild(row);
    }
    if (r.truncated) body.appendChild(noteLine("alert", T("page-memory.cmpTruncated"), true));
    if (r.masked === true) body.appendChild(noteLine("shield", T("page-memory.cmpMaskedYes")));
    else if (r.masked !== null && r.masked > 0) body.appendChild(noteLine("shield", T("page-memory.cmpMasked", { n: fmtInt(r.masked) })));
    if (!r.markdown.trim()) { body.appendChild(stateCard("empty", T("page-memory.cmpEmpty"), T("page-memory.cmpEmptyDetail"), null)); return; }
    body.appendChild(el("h4", "am-more-h4", T("page-memory.cmpText")));
    body.appendChild(el("p", "am-more-hint", T("page-memory.cmpSelect")));
    var blk = el("div", "am-more-textblock", r.markdown);
    blk.setAttribute("role", "region");
    blk.setAttribute("tabindex", "0");
    blk.setAttribute("aria-label", T("page-memory.cmpText"));
    body.appendChild(blk);
  }

  // ---- Örtük bilgi önerileri ----
  function accept(id) {
    var f = S.AM && S.AM.actions && typeof S.AM.actions.implicitAccept === "function" ? S.AM.actions.implicitAccept : null;
    if (!f || S.accepting[id]) return;
    S.accepting[id] = true;
    var done = function () { delete S.accepting[id]; try { fillImplicit(); } catch (e) { /* sonraki çizimde düzelir */ } };
    var p;
    try { p = f.call(S.AM.actions, id); } catch (e) { p = null; }
    Promise.resolve(p).then(done, done);
    fillImplicit();
  }
  function candidateCard(c) {
    var li = el("li", "am-more-cand");
    var head = el("div", "am-more-hit-h");
    head.appendChild(chip(c.kind === "unknown" ? T("page-memory.impItemKindUnknown") : T("page-memory.kind." + c.kind), "muted", "doc"));
    head.appendChild(chip(c.confidence === null ? T("page-memory.impConfUnknown") : T("page-memory.impConf", { n: c.confidence }), "info", "info"));
    head.appendChild(chip(T("page-memory.impEvidence", { n: c.evidence.length }), "muted", "clock"));
    if (c.count !== null) head.appendChild(chip(T("page-memory.impRepeat", { n: fmtInt(c.count) }), "muted", "clock"));
    li.appendChild(head);
    var lab = el("p", "am-more-evid", T("page-memory.recText"));
    li.appendChild(lab);
    var tb = el("div", "am-more-textblock", c.text || T("page-memory.na"));
    tb.setAttribute("role", "region");
    tb.setAttribute("tabindex", "0");
    tb.setAttribute("aria-label", T("page-memory.recText"));
    li.appendChild(tb);
    li.appendChild(noteLine("alert", T("page-memory.impWarn"), true));
    if (c.long) li.appendChild(noteLine("alert", T("page-memory.impTooLong"), true));
    if (c.scope) li.appendChild(el("p", "am-more-dim", T("page-memory.impScope", { s: c.scope })));
    if (c.evidence.length) {
      li.appendChild(el("h4", "am-more-h4", T("page-memory.impEvidenceList")));
      var ul = el("ul", "am-more-list");
      c.evidence.forEach(function (e) { ul.appendChild(el("li", "am-more-list-li", e)); });
      li.appendChild(ul);
    }
    var busy = S.accepting[c.id] === true;
    var b = el("button", "am-more-btn", busy ? T("page-memory.impAdding") : T("page-memory.impAdd"));
    b.type = "button";
    b.disabled = busy || c.long;
    b.setAttribute("aria-label", T("page-memory.impAdd") + ": " + (c.text || c.id).slice(0, 80));
    b.addEventListener("click", function () { if (!c.long) accept(c.id); });
    li.appendChild(b);
    var st = dataOf("implicitAccept:" + c.id);
    if (st && st.status === "error") {
      var a = el("p", "am-more-note am-more-note--warn", "");
      a.setAttribute("role", "alert");
      a.appendChild(el("strong", "am-more-note-t", T("page-memory.impActionErr") + ": "));
      a.appendChild(el("span", "am-more-note-t", safe(st.reason, 400) || "?"));
      li.appendChild(a);
    } else if (st && st.status === "ok") {
      var ok = el("p", "am-more-hint", st.value && st.value.duplicate === true ? T("page-memory.impDup") : T("page-memory.impDone"));
      ok.setAttribute("role", "status");
      li.appendChild(ok);
    }
    return li;
  }
  function fillImplicit() {
    var ui = S.ui; var body = ui.impBody;
    body.textContent = "";
    var d = dataOf("memoryImplicit");
    if (!d) {
      if (loader() && !S.impRequested) { S.impRequested = true; loader().call(S.AM.actions, "memoryImplicit"); }
      body.appendChild(stateCard("loading", T("page-memory.impLoading")));
      return;
    }
    if (d.status === "loading") { body.appendChild(stateCard("loading", T("page-memory.impLoading"))); return; }
    var retry = function () { if (loader()) loader().call(S.AM.actions, "memoryImplicit"); };
    if (d.status === "error") { body.appendChild(stateCard("error", T("page-memory.impErr"), T("page-memory.errDetail", { reason: safe(d.reason, 200) || "?" }), retry)); return; }
    S.impRequested = false;
    var r = normCandidates(d.value);
    if (!r) { body.appendChild(stateCard("error", T("page-memory.impErr"), T("page-memory.errDetail", { reason: "?" }), retry)); return; }
    if (r.skipped !== null && r.skipped > 0) body.appendChild(el("p", "am-more-hint", T("page-memory.impSkipped", { n: fmtInt(r.skipped) })));
    if (!r.list.length) { body.appendChild(stateCard("empty", T("page-memory.impEmpty"), T("page-memory.impEmptyDetail"), null)); return; }
    var ul = el("ul", "am-more-cands");
    r.list.forEach(function (c) { ul.appendChild(candidateCard(c)); });
    body.appendChild(ul);
  }

  function render(AM, root) {
    S.AM = AM;
    if (S.root !== root || !S.ui || !S.page || S.page.parentNode !== root) { S.root = root; S.ui = buildShell(root); }
    fillFlags();
    fillResults();
    fillContext();
    fillCompile();
    fillImplicit();
  }

  window.AM_PAGE_MEMORY = {
    render: render,
    pure: {
      DEBOUNCE_MS: DEBOUNCE_MS, MAX_RESULTS: MAX_RESULTS, cleanQuery: cleanQuery, searchKey: searchKey, normHits: normHits, confPct: confPct, flagsSummary: flagsSummary,
      BUDGETS: BUDGETS, cleanCtxQuery: cleanCtxQuery, ctxParam: ctxParam, ctxKey: ctxKey, normContext: normContext, normCompile: normCompile, normCandidates: normCandidates,
      scopeOk: scopeOk, safe: safe, safeBlock: safeBlock, fmtInt: fmtInt
    }
  };

  window.AM_PAGES.register("memory", {
    title: T("page-memory.title"),
    group: T("page-memory.group"),
    render: function (AM, root) {
      try { render(AM, root); } catch (e) {
        S.root = null;
        root.textContent = "";
        root.appendChild(stateCard("error", T("page-memory.err"), T("page-memory.renderErr", { reason: str(e && e.message, 200) || "?" }), function () {
          try { render(AM, root); } catch (e2) { /* görünür hata kartı zaten çizildi */ }
        }));
      }
    }
  });
})();
