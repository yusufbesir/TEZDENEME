/*
 * Sahip: Sonnet (Proje ayarları + Kullanım) [İP:AgentMom Faz 11, dilim 2]
 * yazan: [Claude#agentmom-faz11-ayarlar]
 * Amaç: window.AM_USAGE = { init(AM, host), render(AM), pure }. #overlayRoot içinde div.am-overlay[data-owner="project-settings"]
 *       ayrı modal: Genel, Bellek, Ortam, Kullanım, Hata ayıklama. AM.view.projectSettingsOpen / projectSettingsPage ile açılır.
 * Kullanım sayfası yalnız BİLGİDİR: veri yoksa (null) '—' ve 'veri yok' yazılır; uydurma, tahmin, ücret/fiyat, süre ya da limit
 *       penceresi tahmini YOKTUR. Sayılar tr-TR biçimindedir (1,9 Mr, %96).
 * Kural kaynağı: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md (Ekran 6) ve docs/tasarim/arayuz-sozlesmesi.md (güvenlik):
 *       sunucu verisi yalnız textContent; HTML dizesi ataması, satır içi stil/olay, dış kaynak, tarayıcı depolaması ve ağ isteği YOK. Çubuk genişlikleri
 *       am-w-0..am-w-100 sabit sınıflarıyla verilir. Ortam değişkeni DEĞERİ ve API anahtarı değişkenleri asla gösterilmez.
 * Değiştirme: yalnız sahibi ya da ana oturum. Yükleme sırasında DOM'a dokunmaz; saf mantık window.AM_USAGE.pure altındadır.
 */
(function () {
  "use strict";

  var TR = {
    "usage.title": "Proje ayarları",
    "usage.close": "Proje ayarları penceresini kapat",
    "usage.navLabel": "Proje ayarları gezinmesi",
    "usage.nav.genel": "Genel",
    "usage.nav.bellek": "Bellek",
    "usage.nav.ortam": "Ortam",
    "usage.nav.kullanim": "Kullanım",
    "usage.nav.hata": "Hata ayıklama",
    "usage.na": "—",
    "usage.noData": "veri yok",
    "usage.copy": "Kopyala",
    "usage.copied": "Panoya kopyalandı.",
    "usage.copyFail": "Kopyalanamadı.",
    "usage.noAction": "Bu eylem şu an kullanılamıyor; işlem yapılmadı.",
    "usage.err.title": "Bu sayfa çizilemedi",
    "usage.err.detail": "Ayrıntı: {reason}",
    "usage.err.retry": "Yeniden dene",
    "usage.err.register": "Metin kaydı hatası: {reason}",
    "usage.readOnly": "Bu sayfa salt okunurdur; hiçbir ayarı değiştirmez.",

    "usage.genel.title": "Genel",
    "usage.genel.desc": "Projenin adı, kök klasörü ve kapsam özeti. Salt okunur.",
    "usage.genel.name": "Proje adı",
    "usage.genel.root": "Kök klasör",
    "usage.genel.trusted": "Güvenilir kökler",
    "usage.genel.trustedDesc": "{n} klasör. Güvenilir olmayan yerde kısıtsız okuma yapan sağlayıcı çalışmaz.",
    "usage.genel.trustedNone": "Güvenilir kök bildirilmedi.",
    "usage.genel.scopeBlock": "Kapsam ve izin özeti",
    "usage.genel.scopeNote": "Yusuf'un açık onayı olmadan politika değişmez. Burada yalnız sayılar gösterilir.",
    "usage.genel.scopeNone": "Politika özeti sunucudan alınamadı.",
    "usage.genel.allowedDirs": "İzinli klasörler",
    "usage.genel.forbiddenDirs": "Yasak klasörler",
    "usage.genel.trustedRepos": "Güvenilir depolar",
    "usage.genel.actions": "Tanınan eylemler",
    "usage.genel.needApproval": "İzin isteyen eylemler",
    "usage.genel.notReported": "bildirilmedi",

    "usage.bellek.title": "Bellek",
    "usage.bellek.desc": "Kayıtlı bilgi sayıları ve geçerlilik bayrakları. Salt okunur.",
    "usage.bellek.none": "Bellek özeti sunucudan alınamadı.",
    "usage.bellek.total": "Toplam kayıt",
    "usage.bellek.valid": "Geçerli",
    "usage.bellek.stale": "Bayat",
    "usage.bellek.staleHint": "Bayat kayıt güncel karar sayılmaz; kaynağı yeniden doğrulanmalıdır.",
    "usage.bellek.updated": "Son güncelleme",

    "usage.ortam.title": "Ortam",
    "usage.ortam.desc": "Sağlayıcılar, geçiş kuralı ve ortam değişkeni izin listesi. Değişken değerleri hiçbir yerde gösterilmez.",
    "usage.ortam.provBlock": "Sağlayıcılar",
    "usage.ortam.provCaption": "Sağlayıcılar ve durumları",
    "usage.ortam.colName": "Sağlayıcı",
    "usage.ortam.colStatus": "Durum",
    "usage.ortam.route": "Rota: {route}",
    "usage.ortam.noProv": "Sağlayıcı kaydı yok.",
    "usage.ortam.rule": "Otomatik geçiş yok",
    "usage.ortam.ruleText": "Kullanılamayan bir sağlayıcı yerine başkası kendiliğinden devreye girmez; karar sizindir.",
    "usage.ortam.level.ready": "hazır",
    "usage.ortam.level.partial": "kısmi",
    "usage.ortam.level.unverified": "doğrulanmadı",
    "usage.ortam.level.unavailable": "KULLANILAMIYOR",
    "usage.ortam.level.unknown": "yetenek bildirilmedi",
    "usage.ortam.envBlock": "Ortam değişkeni izin listesi",
    "usage.ortam.envDesc": "Yalnız adlar gösterilir; değerler asla gösterilmez.",
    "usage.ortam.envNone": "İzin listesi bildirilmedi.",
    "usage.ortam.envHidden": "{n} değişken adı anahtar ya da belirteç içerebileceği için listeden ayıklandı.",

    "usage.hata.title": "Hata ayıklama",
    "usage.hata.desc": "Denetim kaydı ve sunucu durumu. Ham belirteç ve anahtar gösterilmez.",
    "usage.hata.serverBlock": "Sunucu durumu",
    "usage.hata.status": "Genel durum",
    "usage.hata.auditBlock": "Denetim kaydı",
    "usage.hata.searchLabel": "Denetim kaydında ara",
    "usage.hata.searchPh": "Olay, aktör ya da hedef ara",
    "usage.hata.caption": "Denetim olayları",
    "usage.hata.colTime": "Zaman",
    "usage.hata.colEvent": "Olay",
    "usage.hata.colActor": "Aktör",
    "usage.hata.colTarget": "Hedef",
    "usage.hata.none": "Denetim kaydı henüz yok ya da sunucudan alınamadı.",
    "usage.hata.noMatch": "Aramayla eşleşen olay yok.",
    "usage.hata.more": "{n} tane daha göster",
    "usage.hata.checkOk": "tamam",
    "usage.hata.checkBad": "sorun",
    "usage.hata.noChecks": "Sunucu denetim sonucu bildirmedi.",

    "usage.k.title": "Kullanım",
    "usage.k.sub": "Bu proje",
    "usage.k.abbr": "Kısaltmalar: K = bin, M = milyon, Mr = milyar. Veri yoksa — ve “veri yok” yazılır; hiçbir değer tahmin edilmez.",
    "usage.k.priceNote": "Liste fiyatı bilgidir, ödeme yok. Bu sayfada ücret, süre ya da limit penceresi tahmini gösterilmez.",
    "usage.k.serverNote": "Sunucu notu: {note}",
    "usage.k.copyTotals": "Toplamları panoya kopyala",
    "usage.k.refresh": "Kullanımı yenile",
    "usage.k.updated": "Güncelleme: {t}",
    "usage.k.loading": "Kullanım verisi yükleniyor…",
    "usage.k.errTitle": "Kullanım verisi alınamadı",
    "usage.k.errDetail": "Sunucudan kullanım özeti okunamadı. Hiçbir değer uydurulmadı.",
    "usage.k.emptyTitle": "Henüz kayıt yok",
    "usage.k.emptyDetail": "Bu proje için kayıtlı kullanım verisi bulunmuyor.",
    "usage.k.stripLabel": "Kullanım özeti",
    "usage.k.statTopics": "Konular",
    "usage.k.statTokens": "Token",
    "usage.k.statCache": "Önbellek isabeti",
    "usage.k.statCode": "Kod değişiklikleri",
    "usage.k.statCoord": "Koordinatör payı",
    "usage.k.codeLabel": "{added} satır eklendi, {removed} satır silindi",
    "usage.k.stackBlock": "Token dağılımı",
    "usage.k.stackLabel": "Token türlerinin oranı: {parts}",
    "usage.k.stackNone": "Token dağılımı için veri yok.",
    "usage.k.input": "Girdi",
    "usage.k.output": "Çıktı",
    "usage.k.cacheWrite": "Önbelleğe yazma",
    "usage.k.cacheRead": "Önbellek okuma",
    "usage.k.topicsRow": "Konular",
    "usage.k.total": "Toplam",
    "usage.k.haiku": "Haiku",
    "usage.k.sonnet": "Sonnet",
    "usage.k.opus": "Opus",
    "usage.k.other": "Diğer",
    "usage.k.model": "Model",
    "usage.k.breakdown": "Döküm",
    "usage.k.breakdownCaption": "Model ve token türüne göre döküm",
    "usage.k.topicsBlock": "Konular",
    "usage.k.topicsCaption": "Konulara göre kullanım",
    "usage.k.sortLabel": "Sırala",
    "usage.k.sortShare": "Paylaş",
    "usage.k.sortTokens": "Token",
    "usage.k.sortRecent": "Son kullanım",
    "usage.k.colTopic": "Konu",
    "usage.k.colModel": "Model · son kullanım",
    "usage.k.colBar": "Paylaş çubuğu",
    "usage.k.colTokens": "Token",
    "usage.k.colCache": "Önbellek isabeti",
    "usage.k.colShare": "Paylaş %",
    "usage.k.meterLabel": "{title}: paylaş {pct}",
    "usage.k.more": "{n} tane daha göster",
    "usage.k.noTopics": "Konu tablosu için veri yok.",
    "usage.k.alertsBlock": "Bilgi uyarıları",
    "usage.k.alertsHint": "Yalnız bilgidir; hiçbir şey kendiliğinden değişmez.",
    "usage.k.alertTop": "En çok token harcayan konular",
    "usage.k.alertLow": "Önbellek isabeti düşük konular",
    "usage.k.alertNone": "Bu ölçütte işaretlenen konu yok.",
    "usage.k.alertChip": "{title} · {value}",
    "usage.k.sum.head": "Kullanım · Bu proje",
    "usage.k.sum.topics": "Konular",
    "usage.k.sum.tokens": "Token",
    "usage.k.sum.cache": "Önbellek isabeti",
    "usage.k.sum.code": "Kod değişiklikleri"
  };

  var regError = "";
  try {
    if (typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("usage", TR);
  } catch (e) {
    regError = String(e && e.message ? e.message : e).slice(0, 200);
  }

  function T(key, vars) {
    try { return String(window.AM_T(key, vars)); } catch (e) { return "⟦" + key + "⟧"; }
  }

  // ------------------------------------------------------------------ saf mantık
  var FOLD_MAP = {
    "ç": "c", "Ç": "c", "ğ": "g", "Ğ": "g", "ı": "i", "İ": "i", "ö": "o", "Ö": "o",
    "ş": "s", "Ş": "s", "ü": "u", "Ü": "u", "â": "a", "Â": "a", "î": "i", "Î": "i", "û": "u", "Û": "u"
  };

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

  function matches(text, q) {
    var nq = fold(String(q == null ? "" : q).replace(/\s+/g, " ").trim());
    if (!nq) return true;
    var hay = fold(text);
    var parts = nq.split(" ");
    for (var i = 0; i < parts.length; i += 1) { if (hay.indexOf(parts[i]) === -1) return false; }
    return true;
  }

  function isNum(v) { return typeof v === "number" && isFinite(v); }

  var DASH = "—";

  // 1234567 -> "1.234.567" (tr-TR binlik ayracı nokta)
  function fmtInt(n) {
    if (!isNum(n)) return DASH;
    var r = Math.round(n);
    var neg = r < 0;
    var s = String(Math.abs(r));
    var out = "";
    for (var i = 0; i < s.length; i += 1) {
      if (i > 0 && (s.length - i) % 3 === 0) out += ".";
      out += s.charAt(i);
    }
    return (neg ? "-" : "") + out;
  }

  // Ondalık virgül; ",0" atılır. 1.94 -> "1,9", 12 -> "12"
  function fmtDec(x, digits) {
    var f = Math.pow(10, digits);
    var r = Math.round(Math.abs(x) * f) / f;
    var s = r.toFixed(digits).replace(".", ",");
    if (digits > 0) s = s.replace(/,0+$/, "");
    return (x < 0 && r !== 0 ? "-" : "") + s;
  }

  // K = bin, M = milyon, Mr = milyar. 100'den küçük ölçeklenmiş değer bir ondalıkla, büyüğü tam sayıyla.
  function fmtCompact(n) {
    if (!isNum(n)) return DASH;
    var a = Math.abs(n);
    var units = [[1e9, "Mr"], [1e6, "M"], [1e3, "K"]];
    for (var i = 0; i < units.length; i += 1) {
      var u = units[i];
      if (a >= u[0]) {
        var scaled = n / u[0];
        var txt = Math.abs(scaled) < 100 ? fmtDec(scaled, 1) : fmtDec(scaled, 0);
        // 999,96 K gibi yuvarlama sınırı bir üst birime taşınır
        if ((txt === "1.000" || txt === "1000") && i > 0) return fmtDec(n / units[i - 1][0], 1) + " " + units[i - 1][1];
        return txt + " " + u[1];
      }
    }
    return fmtInt(n);
  }

  // %96, %9,5, <%1; veri yoksa —
  function fmtPct(p) {
    if (!isNum(p)) return DASH;
    if (p <= 0) return "%0";
    if (p < 1) return "<%1";
    return "%" + (p < 10 ? fmtDec(p, 1) : fmtDec(p, 0));
  }

  function pad2(n) { return n < 10 ? "0" + n : String(n); }

  function fmtDate(iso) {
    var t = Date.parse(String(iso == null ? "" : iso));
    if (!isFinite(t)) return DASH;
    var d = new Date(t);
    return pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "." + d.getFullYear();
  }

  function fmtDateTime(iso) {
    var t = Date.parse(String(iso == null ? "" : iso));
    if (!isFinite(t)) return DASH;
    var d = new Date(t);
    return pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "." + d.getFullYear() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function fmtAgo(iso, nowMs) {
    var t = Date.parse(String(iso == null ? "" : iso));
    if (!isFinite(t)) return DASH;
    var diff = (isNum(nowMs) ? nowMs : Date.now()) - t;
    if (diff < 0) return fmtDate(iso);
    var s = Math.floor(diff / 1000);
    if (s < 60) return "az önce";
    var m = Math.floor(s / 60);
    if (m < 60) return m + " dk önce";
    var h = Math.floor(m / 60);
    if (h < 24) return h + " sa önce";
    var d = Math.floor(h / 24);
    if (d < 7) return d + " gün önce";
    return fmtDate(iso);
  }

  // Sabit sınıf adı: yalnız 0..100 tamsayı yüzdesi am-w-N olur.
  function wClass(pct) {
    var n = isNum(pct) ? Math.round(pct) : 0;
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return "am-w-" + n;
  }

  // En büyük kalan yöntemiyle toplamı tam 100 olan tamsayı yüzdeler; sıfırdan büyük her değer en az 1.
  function segmentPercents(values) {
    var v = (values || []).map(function (x) { return isNum(x) && x > 0 ? x : 0; });
    var total = v.reduce(function (a, b) { return a + b; }, 0);
    if (total <= 0) return v.map(function () { return 0; });
    var raw = v.map(function (x) { return (x / total) * 100; });
    var fl = raw.map(function (x) { return Math.floor(x); });
    var rem = 100 - fl.reduce(function (a, b) { return a + b; }, 0);
    var order = raw.map(function (x, i) { return { i: i, frac: x - Math.floor(x) }; }).sort(function (a, b) { return b.frac - a.frac || a.i - b.i; });
    for (var k = 0; k < rem; k += 1) fl[order[k % order.length].i] += 1;
    for (var i = 0; i < fl.length; i += 1) {
      if (v[i] > 0 && fl[i] === 0) {
        var big = 0;
        for (var j = 1; j < fl.length; j += 1) { if (fl[j] > fl[big]) big = j; }
        fl[big] -= 1;
        fl[i] = 1;
      }
    }
    return fl;
  }

  function modelFamily(name) {
    var s = String(name == null ? "" : name).toLowerCase();
    if (s.indexOf("haiku") !== -1) return "haiku";
    if (s.indexOf("sonnet") !== -1) return "sonnet";
    if (s.indexOf("opus") !== -1) return "opus";
    return "other";
  }

  function sumKnown(list) {
    var any = false;
    var sum = 0;
    list.forEach(function (v) { if (isNum(v)) { any = true; sum += v; } });
    return any ? sum : null;
  }

  var FAMILIES = ["haiku", "sonnet", "opus", "other"];
  var KINDS = ["input", "output", "cacheWrite", "cacheRead"];

  // Döküm tablosu: aile x tür hücreleri (veri yoksa null) + Toplam sütunu. Toplam: önce usage.tokens, yoksa ailelerin toplamı.
  function familyTotals(usage) {
    var u = usage && typeof usage === "object" ? usage : {};
    var by = Array.isArray(u.byModel) ? u.byModel : [];
    var rows = Array.isArray(u.topicsTable) ? u.topicsTable : null;
    var cells = {};
    FAMILIES.forEach(function (f) {
      cells[f] = {};
      var entries = by.filter(function (e) { return e && modelFamily(e.family != null ? e.family : e.model) === f; });
      KINDS.forEach(function (k) { cells[f][k] = sumKnown(entries.map(function (e) { return e[k]; })); });
      var declared = sumKnown(entries.map(function (e) { return e.topics; }));
      cells[f].topics = declared != null ? declared : (rows ? rows.filter(function (r) { return r && modelFamily(r.model) === f; }).length || (entries.length ? 0 : null) : null);
    });
    var total = {};
    var tok = u.tokens && typeof u.tokens === "object" ? u.tokens : null;
    KINDS.forEach(function (k) {
      total[k] = tok && isNum(tok[k]) ? tok[k] : sumKnown(FAMILIES.map(function (f) { return cells[f][k]; }));
    });
    total.topics = isNum(u.topics) ? u.topics : sumKnown(FAMILIES.map(function (f) { return cells[f].topics; }));
    cells.total = total;
    return cells;
  }

  function sortTopics(rows, key) {
    var list = (Array.isArray(rows) ? rows : []).map(function (r, i) { return { r: r, i: i }; });
    function val(r) {
      if (!r || typeof r !== "object") return null;
      if (key === "tokens") return isNum(r.tokens) ? r.tokens : null;
      if (key === "recent") { var t = Date.parse(String(r.lastAt == null ? "" : r.lastAt)); return isFinite(t) ? t : null; }
      return isNum(r.sharePct) ? r.sharePct : null;
    }
    list.sort(function (a, b) {
      var x = val(a.r);
      var y = val(b.r);
      if (x === null && y === null) return a.i - b.i;
      if (x === null) return 1;
      if (y === null) return -1;
      return y - x || a.i - b.i;
    });
    return list.map(function (e) { return e.r; });
  }

  var TOP_SHARE_MIN = 20;
  var LOW_CACHE_MAX = 50;
  var LOW_CACHE_MIN_TOKENS = 10000;

  function topSpenders(rows) {
    return (Array.isArray(rows) ? rows : []).filter(function (r) {
      return r && isNum(r.tokens) && r.tokens > 0 && isNum(r.sharePct) && r.sharePct >= TOP_SHARE_MIN;
    }).sort(function (a, b) { return b.tokens - a.tokens; }).slice(0, 3);
  }

  function lowCache(rows) {
    return (Array.isArray(rows) ? rows : []).filter(function (r) {
      return r && isNum(r.cacheHitPct) && r.cacheHitPct < LOW_CACHE_MAX && isNum(r.tokens) && r.tokens >= LOW_CACHE_MIN_TOKENS;
    }).sort(function (a, b) { return a.cacheHitPct - b.cacheHitPct; }).slice(0, 3);
  }

  function isEmptyUsage(u) {
    if (!u || typeof u !== "object") return true;
    var noTopics = !isNum(u.topics) || u.topics === 0;
    var noTable = !Array.isArray(u.topicsTable) || u.topicsTable.length === 0;
    var tk = u.tokens && typeof u.tokens === "object" ? u.tokens : null;
    var cc = u.codeChanges && typeof u.codeChanges === "object" ? u.codeChanges : null;
    var noTokens = !tk || !KINDS.some(function (k) { return isNum(tk[k]); });
    var noCode = !cc || !(isNum(cc.added) || isNum(cc.removed));
    return noTopics && noTable && noTokens && noCode;
  }

  // undefined/null/status:loading -> iskelet; status:error ya da error alanı -> hata kartı; boş -> 'Henüz kayıt yok'.
  function usageStatus(u) {
    if (u === undefined || u === null) return "loading";
    if (typeof u !== "object") return "error";
    if (u.status === "loading") return "loading";
    if (u.status === "error" || u.error) return "error";
    if (isEmptyUsage(u)) return "empty";
    return "ok";
  }

  var DEFAULT_LABELS = {
    head: "Kullanım · Bu proje", topics: "Konular", tokens: "Token", input: "Girdi", output: "Çıktı", cacheWrite: "Önbelleğe yazma",
    cacheRead: "Önbellek okuma", cache: "Önbellek isabeti", code: "Kod değişiklikleri"
  };

  // Panoya yalnız TOPLAMLAR, kalıp metin olarak (konu adı yok).
  function summaryText(u, labels) {
    var L = labels || DEFAULT_LABELS;
    var x = u && typeof u === "object" ? u : {};
    var tok = x.tokens && typeof x.tokens === "object" ? x.tokens : null;
    var totalTok = tok ? sumKnown(KINDS.map(function (k) { return tok[k]; })) : null;
    var cc = x.codeChanges && typeof x.codeChanges === "object" ? x.codeChanges : null;
    var lines = [L.head];
    lines.push(L.topics + ": " + fmtInt(isNum(x.topics) ? x.topics : null));
    lines.push(L.tokens + ": " + (totalTok === null ? DASH : fmtCompact(totalTok) + " (" + fmtInt(totalTok) + ")"));
    KINDS.forEach(function (k) { lines.push(L[k] + ": " + fmtInt(tok && isNum(tok[k]) ? tok[k] : null)); });
    lines.push(L.cache + ": " + fmtPct(isNum(x.cacheHitPct) ? x.cacheHitPct : null));
    lines.push(L.code + ": " + (cc && isNum(cc.added) && isNum(cc.removed) ? "+" + fmtInt(cc.added) + " −" + fmtInt(cc.removed) : DASH));
    return lines.join("\n");
  }

  var PAGES = ["genel", "bellek", "ortam", "kullanim", "hata"];

  function normPage(p) {
    var s = String(p == null ? "" : p).toLowerCase();
    // Çekirdek İngilizce kimlikler de gönderebilir ("general", "usage"…): takma adlar eşlenir.
    var alias = { general: "genel", memory: "bellek", environment: "ortam", env: "ortam", usage: "kullanim", "kullanım": "kullanim", debug: "hata", "hata-ayiklama": "hata" };
    if (Object.prototype.hasOwnProperty.call(alias, s)) s = alias[s];
    return PAGES.indexOf(s) !== -1 ? s : "genel";
  }

  function isSecretName(name) {
    return /(KEY|TOKEN|SECRET|PASS|CREDENTIAL|AUTH|BEARER|COOKIE|SESSION|PRIVATE|CERT)/i.test(String(name == null ? "" : name));
  }

  // Ortam değişkeni izin listesi: yalnız ad (DEĞER yok), anahtar/belirteç adları ayıklanır.
  function filterEnv(names) {
    var shown = [];
    var hidden = 0;
    (Array.isArray(names) ? names : []).forEach(function (n) {
      var name = String(n == null ? "" : n).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(name)) { hidden += 1; return; }
      if (isSecretName(name)) { hidden += 1; return; }
      if (shown.indexOf(name) === -1) shown.push(name);
    });
    return { shown: shown, hidden: hidden };
  }

  function scrubSecrets(text) {
    var s = String(text == null ? "" : text);
    s = s.replace(/Bearer\s+[A-Za-z0-9._~+\/=-]+/gi, "Bearer [gizli]");
    s = s.replace(/#token=\S*/g, "#token=[gizli]");
    s = s.replace(/\b(token|secret|password|passwd|api[_-]?key|authorization)(\s*[:=]\s*)\S+/gi, "$1$2[gizli]");
    s = s.replace(/\b(?:sk|pk|ghp|gho|xox[bap]|AKIA)[-_A-Za-z0-9]{10,}/g, "[gizli]");
    s = s.replace(/\b[A-Za-z0-9_-]{40,}\b/g, "[gizli]");
    return s;
  }

  function filterAudit(list, q) {
    return (Array.isArray(list) ? list : []).filter(function (e) {
      var x = e && typeof e === "object" ? e : {};
      return matches([x.event, x.actor, x.target].join(" "), q);
    });
  }

  function count(v) {
    if (Array.isArray(v)) return v.length;
    if (isNum(v) && v >= 0) return Math.floor(v);
    return null;
  }

  function policyCounts(p) {
    if (!p || typeof p !== "object") return null;
    return {
      allowedDirs: count(p.allowedDirs), forbiddenDirs: count(p.forbiddenDirs), trustedRepos: count(p.trustedRepos),
      actions: count(p.allowedActions), needApproval: count(p.approvalRequiredActions)
    };
  }

  function memoryCounts(m) {
    if (!m || typeof m !== "object") return null;
    return { total: count(m.total != null ? m.total : m.records), valid: count(m.valid), stale: count(m.stale), updatedAt: typeof m.updatedAt === "string" ? m.updatedAt : null };
  }

  function providerLevel(caps) {
    if (!Array.isArray(caps) || !caps.length) return "unknown";
    var c = { verified: 0, partial: 0, unverified: 0, unavailable: 0, unsupported: 0 };
    caps.forEach(function (x) {
      var s = String(x && x.status != null ? x.status : "").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(c, s)) c[s] += 1;
    });
    var usable = c.verified + c.partial + c.unverified;
    if (usable === 0) return "unavailable";
    if (c.verified === 0 && c.partial === 0) return "unverified";
    if (c.partial > 0 || c.unavailable > 0 || c.unsupported > 0) return "partial";
    return "ready";
  }

  var TONE_OF = {
    ok: "ok", verified: "ok", available: "ok", ready: "ok", active: "ok", green: "ok",
    partial: "warn", unverified: "warn", pending: "warn", running: "warn",
    failed: "bad", unavailable: "bad", denied: "bad", red: "bad", error: "bad"
  };

  function stateTone(state) {
    var k = String(state == null ? "" : state).toLowerCase();
    return Object.prototype.hasOwnProperty.call(TONE_OF, k) ? TONE_OF[k] : "muted";
  }

  var PAGE_KEYS = {
    genel: ["project", "policy"], bellek: ["memory"], ortam: ["providers", "project"], kullanim: ["usage"], hata: ["audit", "health"]
  };

  function pageSig(page, state, local) {
    var st = state && typeof state === "object" ? state : {};
    var parts = [page, JSON.stringify(local || null)];
    try {
      (Object.prototype.hasOwnProperty.call(PAGE_KEYS, page) ? PAGE_KEYS[page] : []).forEach(function (k) {
        parts.push(JSON.stringify(st[k] === undefined ? null : st[k]));
      });
    } catch (e) {
      parts.push("?" + Math.random());
    }
    return parts.join("|");
  }

  var pure = {
    fold: fold, matches: matches, fmtInt: fmtInt, fmtCompact: fmtCompact, fmtPct: fmtPct, fmtAgo: fmtAgo, fmtDate: fmtDate, fmtDateTime: fmtDateTime,
    wClass: wClass, segmentPercents: segmentPercents, modelFamily: modelFamily, familyTotals: familyTotals, sortTopics: sortTopics,
    topSpenders: topSpenders, lowCache: lowCache, isEmptyUsage: isEmptyUsage, usageStatus: usageStatus, summaryText: summaryText,
    normPage: normPage, isSecretName: isSecretName, filterEnv: filterEnv, scrubSecrets: scrubSecrets, filterAudit: filterAudit,
    policyCounts: policyCounts, memoryCounts: memoryCounts, providerLevel: providerLevel, stateTone: stateTone, pageSig: pageSig,
    PAGES: PAGES, FAMILIES: FAMILIES, KINDS: KINDS, TOP_SHARE_MIN: TOP_SHARE_MIN, LOW_CACHE_MAX: LOW_CACHE_MAX, LOW_CACHE_MIN_TOKENS: LOW_CACHE_MIN_TOKENS
  };

  // ------------------------------------------------------------------ DOM yardımcıları
  var TONE_CLASS = { ok: "am-set-chip--ok", warn: "am-set-chip--warn", bad: "am-set-chip--bad", info: "am-set-chip--info", muted: "am-set-chip--muted" };
  var TONE_ICON = { ok: "check", warn: "alert", bad: "x", info: "info", muted: "dot" };

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

  function chip(text, tone, opts) {
    var o = opts || {};
    var t = Object.prototype.hasOwnProperty.call(TONE_CLASS, tone) ? tone : "muted";
    var c = el("span", "am-set-chip " + TONE_CLASS[t] + (o.mono ? " am-set-chip--mono" : ""));
    c.appendChild(icon(o.icon || TONE_ICON[t], 12));
    c.appendChild(el("span", "am-set-chip-t", text));
    return c;
  }

  function nodeFrom(v) {
    if (v && typeof v === "object" && v.nodeType) return v;
    return document.createTextNode(String(v == null ? "" : v));
  }

  var U = {
    AM: null, host: null, root: null, nav: null, content: null, live: null, page: "genel", lastFocus: null, sigLast: "",
    navButtons: Object.create(null), usageRequested: false, sort: "share", limit: 10, auditQ: "", auditLimit: 25, liveTimer: 0
  };

  function announce(msg) {
    if (!U.live) return;
    U.live.textContent = String(msg);
    if (U.liveTimer) clearTimeout(U.liveTimer);
    U.liveTimer = setTimeout(function () { if (U.live) U.live.textContent = ""; }, 4000);
  }

  function setView(AM, patch) {
    var a = AM && AM.actions;
    if (a && typeof a.setView === "function") {
      try { a.setView(patch); return; } catch (e) { /* aşağıda doğrudan yazılır */ }
    }
    if (AM && AM.view && typeof AM.view === "object") {
      Object.keys(patch).forEach(function (k) { AM.view[k] = patch[k]; });
    }
  }

  function closeProject(AM) {
    setView(AM, { projectSettingsOpen: false });
    render(AM);
  }

  function copyText(AM, text) {
    var a = AM && AM.actions;
    if (!a || typeof a.copyText !== "function") { announce(T("usage.noAction")); return; }
    var r;
    try { r = a.copyText(text); } catch (e) { announce(T("usage.copyFail")); return; }
    Promise.resolve(r).then(function () { announce(T("usage.copied")); }, function () { announce(T("usage.copyFail")); });
  }

  function iconBtn(label, iconName, onClick, fkey) {
    var b = el("button", "am-set-iconbtn");
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.setAttribute("title", label);
    if (fkey) b.setAttribute("data-fkey", fkey);
    b.appendChild(icon(iconName, 16));
    b.addEventListener("click", onClick);
    return b;
  }

  function textBtn(label, onClick, fkey) {
    var b = el("button", "am-set-btn", label);
    b.type = "button";
    if (fkey) b.setAttribute("data-fkey", fkey);
    b.addEventListener("click", onClick);
    return b;
  }

  function pageHead(c, title, desc) {
    c.appendChild(el("h2", "am-set-h", title));
    if (desc) c.appendChild(el("p", "am-set-desc", desc));
  }

  function block(c, title, desc) {
    var b = el("section", "am-set-block");
    if (title) b.appendChild(el("h3", "am-set-h3", title));
    if (desc) b.appendChild(el("p", "am-set-desc", desc));
    c.appendChild(b);
    return b;
  }

  function row(parent, o) {
    var r = el("div", "am-set-row" + (o.stack ? " am-set-row--stack" : ""));
    var m = el("div", "am-set-row-main");
    m.appendChild(el("div", "am-set-row-title", o.title));
    if (o.desc) m.appendChild(el("div", "am-set-row-desc", o.desc));
    r.appendChild(m);
    if (o.ctl) {
      var cc = el("div", "am-set-row-ctl");
      cc.appendChild(nodeFrom(o.ctl));
      r.appendChild(cc);
    }
    parent.appendChild(r);
    return r;
  }

  function note(parent, text, tone) {
    var t = Object.prototype.hasOwnProperty.call(TONE_CLASS, tone) ? tone : "info";
    var n = el("div", "am-set-note am-set-note--" + t);
    n.appendChild(icon(TONE_ICON[t], 16));
    n.appendChild(el("span", "am-set-note-t", text));
    parent.appendChild(n);
    return n;
  }

  function emptyCard(parent, text) {
    var n = el("div", "am-set-empty", text);
    parent.appendChild(n);
    return n;
  }

  function errorCard(parent, title, detail, onRetry) {
    var c = el("div", "am-set-errcard");
    c.setAttribute("role", "alert");
    c.appendChild(icon("alert", 18));
    var b = el("div", "am-set-errcard-body");
    b.appendChild(el("div", "am-set-row-title", title));
    if (detail) b.appendChild(el("div", "am-set-row-desc", detail));
    c.appendChild(b);
    if (onRetry) c.appendChild(textBtn(T("usage.err.retry"), onRetry, "retry"));
    parent.appendChild(c);
    return c;
  }

  // Gerçek tablo: caption + th scope; hücre metin ya da düğüm.
  function table(parent, o) {
    var wrap = el("div", "am-set-tablewrap");
    var t = el("table", "am-set-table" + (o.numeric ? " am-use-table" : ""));
    t.appendChild(el("caption", "am-set-sr", o.caption));
    var thead = el("thead");
    var htr = el("tr");
    o.cols.forEach(function (name, i) {
      var th = el("th", "am-set-th" + (o.numeric && i > 0 && !(o.leftCols && o.leftCols.indexOf(i) !== -1) ? " am-set-th--right" : ""), name);
      th.setAttribute("scope", "col");
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    t.appendChild(thead);
    var tb = el("tbody");
    o.rows.forEach(function (cells) {
      var tr = el("tr", "am-set-tr");
      cells.forEach(function (cell, i) {
        var td;
        if (i === 0) {
          td = el("th", "am-set-td am-set-td--name");
          td.setAttribute("scope", "row");
        } else {
          td = el("td", "am-set-td" + (o.numeric && !(o.leftCols && o.leftCols.indexOf(i) !== -1) ? " am-set-td--right" : ""));
        }
        if (cell && typeof cell === "object" && !cell.nodeType && cell.name != null) {
          td.appendChild(el("div", "am-set-name", cell.name));
          if (cell.sub) td.appendChild(el("div", "am-set-sub", cell.sub));
        } else {
          td.appendChild(nodeFrom(cell));
        }
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    parent.appendChild(wrap);
    return t;
  }

  function arr(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" ? v : {}; }

  // Değer yoksa '—' + (görünmez) 'veri yok' metni: renk ya da boşluk tek ipucu olmaz.
  function valueOrNoData(text, has, extraCls) {
    var s = el("span", extraCls || "");
    if (has) { s.textContent = text; return s; }
    s.appendChild(el("span", "am-use-dash", DASH));
    s.appendChild(el("span", "am-set-sr", T("usage.noData")));
    return s;
  }

  // ------------------------------------------------------------------ sayfalar
  function pageGenel(AM, c) {
    var st = obj(AM.state);
    var pr = obj(st.project);
    pageHead(c, T("usage.genel.title"), T("usage.genel.desc"));
    var b = block(c);
    row(b, { title: T("usage.genel.name"), ctl: valueOrNoData(scrubSecrets(pr.name == null ? "" : pr.name), !!pr.name, "am-set-mono") });
    var rootCtl = el("div", "am-set-cmd");
    if (pr.root) {
      rootCtl.appendChild(el("code", "am-set-code", scrubSecrets(pr.root)));
      rootCtl.appendChild(iconBtn(T("usage.copy"), "copy", function () { copyText(AM, scrubSecrets(pr.root)); }, "copy-root"));
    } else {
      rootCtl.appendChild(valueOrNoData("", false, "am-set-mono"));
    }
    row(b, { title: T("usage.genel.root"), ctl: rootCtl, stack: true });
    var roots = arr(pr.trustedRoots);
    row(b, { title: T("usage.genel.trusted"), desc: roots.length ? T("usage.genel.trustedDesc", { n: roots.length }) : T("usage.genel.trustedNone") });
    roots.forEach(function (p, i) {
      var cc = el("div", "am-set-cmd");
      cc.appendChild(el("code", "am-set-code", scrubSecrets(p)));
      cc.appendChild(iconBtn(T("usage.copy"), "copy", function () { copyText(AM, scrubSecrets(p)); }, "copy-trusted-" + i));
      row(b, { title: String(i + 1) + ".", ctl: cc, stack: true });
    });
    var s = block(c, T("usage.genel.scopeBlock"));
    note(s, T("usage.genel.scopeNote"), "info");
    var pc = policyCounts(st.policy);
    if (!pc) { emptyCard(s, T("usage.genel.scopeNone")); return; }
    [["allowedDirs", "allowedDirs"], ["forbiddenDirs", "forbiddenDirs"], ["trustedRepos", "trustedRepos"], ["actions", "actions"], ["needApproval", "needApproval"]].forEach(function (k) {
      row(s, { title: T("usage.genel." + k[0]), ctl: valueOrNoData(String(pc[k[1]]), pc[k[1]] !== null, "am-set-num") });
    });
  }

  function pageBellek(AM, c) {
    pageHead(c, T("usage.bellek.title"), T("usage.bellek.desc"));
    var m = memoryCounts(AM.state && AM.state.memory);
    if (!m) { emptyCard(c, T("usage.bellek.none")); return; }
    var b = block(c);
    row(b, { title: T("usage.bellek.total"), ctl: valueOrNoData(String(m.total), m.total !== null, "am-set-num") });
    row(b, { title: T("usage.bellek.valid"), ctl: m.valid === null ? valueOrNoData("", false) : chip(String(m.valid), "ok") });
    row(b, { title: T("usage.bellek.stale"), desc: T("usage.bellek.staleHint"), ctl: m.stale === null ? valueOrNoData("", false) : chip(String(m.stale), m.stale > 0 ? "warn" : "ok") });
    row(b, { title: T("usage.bellek.updated"), ctl: el("span", "am-set-mono", fmtDateTime(m.updatedAt)) });
  }

  function pageOrtam(AM, c) {
    var st = obj(AM.state);
    pageHead(c, T("usage.ortam.title"), T("usage.ortam.desc"));
    var p = block(c, T("usage.ortam.provBlock"));
    note(p, T("usage.ortam.rule") + ". " + T("usage.ortam.ruleText"), "warn");
    var list = arr(st.providers);
    if (!list.length) emptyCard(p, T("usage.ortam.noProv"));
    else {
      table(p, {
        caption: T("usage.ortam.provCaption"),
        cols: [T("usage.ortam.colName"), T("usage.ortam.colStatus")],
        rows: list.map(function (pv) {
          var lv = providerLevel(pv.capabilities);
          var tone = lv === "ready" ? "ok" : (lv === "unavailable" ? "bad" : (lv === "unknown" ? "muted" : "warn"));
          var chips = el("div", "am-set-chips");
          chips.appendChild(chip(T("usage.ortam.level." + lv), tone));
          arr(pv.capabilities).forEach(function (cap) {
            chips.appendChild(chip(String(cap.operation) + ": " + String(cap.status), stateTone(cap.status), { mono: true }));
          });
          return [{ name: pv.displayName || pv.id, sub: T("usage.ortam.route", { route: pv.routeKind || DASH }) }, chips];
        })
      });
    }
    var e = block(c, T("usage.ortam.envBlock"), T("usage.ortam.envDesc"));
    var env = filterEnv(obj(st.project).envAllowlist);
    if (env.shown.length) {
      var w = el("div", "am-set-chips");
      env.shown.forEach(function (n) { w.appendChild(chip(n, "muted", { mono: true, icon: "dot" })); });
      e.appendChild(w);
    } else {
      emptyCard(e, T("usage.ortam.envNone"));
    }
    if (env.hidden > 0) note(e, T("usage.ortam.envHidden", { n: env.hidden }), "info");
  }

  function pageHata(AM, c) {
    var st = obj(AM.state);
    pageHead(c, T("usage.hata.title"), T("usage.hata.desc"));
    var s = block(c, T("usage.hata.serverBlock"));
    var hs = obj(st.health);
    var tone = hs.status === "green" ? "ok" : (hs.status === "red" ? "bad" : "muted");
    var htext = hs.status === "green" ? T("health.green") : (hs.status === "red" ? T("health.red") : T("health.unknown"));
    row(s, { title: T("usage.hata.status"), ctl: chip(htext, tone) });
    var checks = arr(hs.checks);
    if (checks.length) {
      table(s, {
        caption: T("usage.hata.serverBlock"),
        cols: [T("usage.hata.colEvent"), T("usage.ortam.colStatus")],
        rows: checks.map(function (k) {
          return [{ name: k.name, sub: scrubSecrets(k.detail || "") }, k.ok ? chip(T("usage.hata.checkOk"), "ok") : chip(T("usage.hata.checkBad"), "bad")];
        })
      });
    } else {
      emptyCard(s, T("usage.hata.noChecks"));
    }
    var a = block(c, T("usage.hata.auditBlock"));
    var all = arr(st.audit);
    if (!all.length) { emptyCard(a, T("usage.hata.none")); return; }
    var sw = el("div", "am-set-search am-use-auditsearch");
    sw.appendChild(icon("search", 16));
    var input = el("input", "am-set-search-in");
    input.type = "search";
    input.value = U.auditQ;
    input.setAttribute("aria-label", T("usage.hata.searchLabel"));
    input.setAttribute("placeholder", T("usage.hata.searchPh"));
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("data-fkey", "audit-search");
    input.addEventListener("input", function () { U.auditQ = input.value; U.auditLimit = 25; renderPage(AM, true); });
    sw.appendChild(input);
    a.appendChild(sw);
    var rows = filterAudit(all, U.auditQ);
    if (!rows.length) { emptyCard(a, T("usage.hata.noMatch")); return; }
    var shown = rows.slice(0, U.auditLimit);
    table(a, {
      caption: T("usage.hata.caption"),
      cols: [T("usage.hata.colTime"), T("usage.hata.colEvent"), T("usage.hata.colActor"), T("usage.hata.colTarget")],
      leftCols: [1, 2, 3],
      rows: shown.map(function (e) {
        var x = obj(e);
        return [
          { name: fmtDateTime(x.at) },
          el("span", "am-set-mono", scrubSecrets(x.event == null ? "" : x.event)),
          el("span", "am-set-mono", scrubSecrets(x.actor == null ? "" : x.actor)),
          el("span", "am-set-mono am-set-wrap", scrubSecrets(x.target == null ? "" : x.target))
        ];
      })
    });
    if (rows.length > shown.length) {
      var rest = rows.length - shown.length;
      a.appendChild(textBtn(T("usage.hata.more", { n: rest }), function () { U.auditLimit = rows.length; renderPage(AM, true); }, "audit-more"));
    }
  }

  var SWATCH = { input: "am-use-sw--in", output: "am-use-sw--out", cacheWrite: "am-use-sw--cw", cacheRead: "am-use-sw--cr" };
  var SEG = { input: "am-use-seg--in", output: "am-use-seg--out", cacheWrite: "am-use-seg--cw", cacheRead: "am-use-seg--cr" };

  function stat(strip, label, valueNode, sub, title) {
    var li = el("li", "am-use-stat");
    if (title) li.setAttribute("title", title);
    li.appendChild(el("div", "am-use-stat-l", label));
    var v = el("div", "am-use-stat-v");
    v.appendChild(valueNode);
    li.appendChild(v);
    if (sub) li.appendChild(el("div", "am-use-stat-s", sub));
    strip.appendChild(li);
  }

  function labelsFromT() {
    return {
      head: T("usage.k.sum.head"), topics: T("usage.k.sum.topics"), tokens: T("usage.k.sum.tokens"), input: T("usage.k.input"), output: T("usage.k.output"),
      cacheWrite: T("usage.k.cacheWrite"), cacheRead: T("usage.k.cacheRead"), cache: T("usage.k.sum.cache"), code: T("usage.k.sum.code")
    };
  }

  function skeleton(c) {
    var s = el("div", "am-help-skel");
    s.setAttribute("role", "status");
    s.setAttribute("aria-busy", "true");
    s.appendChild(el("span", "am-set-sr", T("usage.k.loading")));
    var strip = el("div", "am-use-skel-strip");
    for (var i = 0; i < 5; i += 1) strip.appendChild(el("div", "am-use-skel-tile"));
    s.appendChild(strip);
    ["am-w-100", "am-w-90", "am-w-75", "am-w-100"].forEach(function (w) { s.appendChild(el("div", "am-help-skel-line " + w)); });
    c.appendChild(s);
  }

  function requestUsage(AM, force) {
    var a = AM && AM.actions;
    if (!a || typeof a.loadUsage !== "function") return false;
    if (U.usageRequested && !force) return true;
    U.usageRequested = true;
    try {
      var r = a.loadUsage();
      if (r && typeof r.then === "function") r.then(null, function () { /* çekirdek durumu 'error' yapar */ });
    } catch (e) { /* çekirdek durumu 'error' yapar */ }
    return true;
  }

  function pageKullanim(AM, c) {
    var u = AM.state ? AM.state.usage : undefined;
    pageHead(c, T("usage.k.title"));

    var head = el("div", "am-use-subhead");
    head.appendChild(el("h3", "am-set-h3", T("usage.k.sub")));
    var tools = el("div", "am-use-tools");
    var status = usageStatus(u);
    if (status === "ok" || status === "empty") {
      tools.appendChild(iconBtn(T("usage.k.refresh"), "retry", function () { requestUsage(AM, true); }, "usage-refresh"));
      if (status === "ok") tools.appendChild(iconBtn(T("usage.k.copyTotals"), "copy", function () { copyText(AM, summaryText(u, labelsFromT())); }, "usage-copy"));
    }
    head.appendChild(tools);
    c.appendChild(head);
    c.appendChild(el("p", "am-set-desc", T("usage.k.abbr")));

    if (status === "loading") {
      // Yalnız hiç istenmediyse (state.usage boş) iste; çekirdek zaten 'loading' yaptıysa ikinci istek yok.
      if (u === undefined || u === null) {
        if (!requestUsage(AM, false)) { errorCard(c, T("usage.k.errTitle"), T("usage.noAction"), null); return; }
      }
      skeleton(c);
      return;
    }
    if (status === "error") {
      var why = u && typeof u === "object" && u.reason ? " " + T("usage.err.detail", { reason: scrubSecrets(String(u.reason)).slice(0, 200) }) : "";
      errorCard(c, T("usage.k.errTitle"), T("usage.k.errDetail") + why, function () { requestUsage(AM, true); });
      return;
    }
    if (status === "empty") {
      var ec = emptyCard(c, T("usage.k.emptyTitle") + ". " + T("usage.k.emptyDetail"));
      ec.setAttribute("role", "status");
      return;
    }

    if (u.updatedAt) c.appendChild(el("p", "am-use-updated", T("usage.k.updated", { t: fmtDateTime(u.updatedAt) })));

    // Özet şeridi
    var tok = u.tokens && typeof u.tokens === "object" ? u.tokens : null;
    var totalTok = tok ? sumKnown(KINDS.map(function (k) { return tok[k]; })) : null;
    var strip = el("ul", "am-use-strip");
    strip.setAttribute("aria-label", T("usage.k.stripLabel"));
    stat(strip, T("usage.k.statTopics"), valueOrNoData(fmtInt(u.topics), isNum(u.topics)), isNum(u.topics) ? "" : T("usage.noData"));
    stat(strip, T("usage.k.statTokens"), valueOrNoData(fmtCompact(totalTok), totalTok !== null), totalTok === null ? T("usage.noData") : "", totalTok === null ? "" : fmtInt(totalTok));
    stat(strip, T("usage.k.statCache"), valueOrNoData(fmtPct(u.cacheHitPct), isNum(u.cacheHitPct)), isNum(u.cacheHitPct) ? "" : T("usage.noData"));
    var cc = u.codeChanges && typeof u.codeChanges === "object" && isNum(u.codeChanges.added) && isNum(u.codeChanges.removed) ? u.codeChanges : null;
    var codeNode;
    if (cc) {
      codeNode = el("span", "am-use-code");
      codeNode.setAttribute("aria-label", T("usage.k.codeLabel", { added: fmtInt(cc.added), removed: fmtInt(cc.removed) }));
      codeNode.appendChild(el("span", "am-use-add", "+" + fmtInt(cc.added)));
      codeNode.appendChild(document.createTextNode(" "));
      codeNode.appendChild(el("span", "am-use-del", "−" + fmtInt(cc.removed)));
    } else {
      codeNode = valueOrNoData("", false);
    }
    stat(strip, T("usage.k.statCode"), codeNode, cc ? "" : T("usage.noData"));
    var coord = isNum(u.coordinatorPct) ? u.coordinatorPct : (u.coordinator && isNum(u.coordinator.sharePct) ? u.coordinator.sharePct : null);
    stat(strip, T("usage.k.statCoord"), valueOrNoData(fmtPct(coord), coord !== null), coord === null ? T("usage.noData") : "");
    c.appendChild(strip);

    // Parçalı yığın çubuk + değer metni (renk tek ipucu değil)
    var sb = block(c, T("usage.k.stackBlock"));
    var vals = KINDS.map(function (k) { return tok && isNum(tok[k]) ? tok[k] : 0; });
    var tsum = vals.reduce(function (a, b) { return a + b; }, 0);
    if (!tok || tsum <= 0) {
      emptyCard(sb, T("usage.k.stackNone"));
    } else {
      var pcts = segmentPercents(vals);
      var parts = KINDS.map(function (k, i) { return T("usage.k." + k) + " " + fmtCompact(vals[i]) + " (" + fmtPct(pcts[i]) + ")"; }).join(", ");
      var stack = el("div", "am-use-stack");
      stack.setAttribute("role", "img");
      stack.setAttribute("aria-label", T("usage.k.stackLabel", { parts: parts }));
      KINDS.forEach(function (k, i) {
        if (pcts[i] > 0) stack.appendChild(el("span", "am-use-seg " + SEG[k] + " " + wClass(pcts[i])));
      });
      sb.appendChild(stack);
      var legend = el("ul", "am-use-legend");
      KINDS.forEach(function (k, i) {
        var li = el("li", "am-use-legend-i");
        li.appendChild(el("span", "am-use-sw " + SWATCH[k]));
        li.appendChild(el("span", "am-use-legend-l", T("usage.k." + k)));
        li.appendChild(el("span", "am-use-legend-v", fmtCompact(vals[i]) + " · " + fmtPct(pcts[i])));
        legend.appendChild(li);
      });
      sb.appendChild(legend);
    }

    // Döküm tablosu
    var ft = familyTotals(u);
    var db = block(c, T("usage.k.breakdown"));
    var cols = [T("usage.k.model")].concat(FAMILIES.map(function (f) { return T("usage.k." + f); })).concat([T("usage.k.total")]);
    var rowsDef = KINDS.map(function (k) { return { key: k, label: T("usage.k." + k), sw: SWATCH[k] }; }).concat([{ key: "topics", label: T("usage.k.topicsRow"), sw: null }]);
    table(db, {
      caption: T("usage.k.breakdownCaption"),
      cols: cols,
      numeric: true,
      rows: rowsDef.map(function (rd) {
        var head2 = el("span", "am-use-rowhead");
        if (rd.sw) head2.appendChild(el("span", "am-use-sw " + rd.sw));
        head2.appendChild(el("span", "", rd.label));
        var cells = [head2];
        FAMILIES.concat(["total"]).forEach(function (f) {
          var v = ft[f][rd.key];
          var node = valueOrNoData(rd.key === "topics" ? fmtInt(v) : fmtCompact(v), isNum(v));
          if (isNum(v) && rd.key !== "topics") node.setAttribute("title", fmtInt(v));
          cells.push(node);
        });
        return cells;
      })
    });

    // Konular tablosu
    var tb = block(c, T("usage.k.topicsBlock"));
    var topics = arr(u.topicsTable);
    if (!topics.length) {
      emptyCard(tb, T("usage.k.noTopics"));
    } else {
      var sortWrap = el("label", "am-use-sort");
      sortWrap.appendChild(el("span", "am-use-sort-l", T("usage.k.sortLabel")));
      var sel = el("select", "am-set-select");
      sel.setAttribute("data-fkey", "usage-sort");
      [["share", "usage.k.sortShare"], ["tokens", "usage.k.sortTokens"], ["recent", "usage.k.sortRecent"]].forEach(function (o) {
        var op = el("option", "", T(o[1]));
        op.value = o[0];
        if (o[0] === U.sort) op.selected = true;
        sel.appendChild(op);
      });
      sel.addEventListener("change", function () { U.sort = sel.value === "tokens" || sel.value === "recent" ? sel.value : "share"; renderPage(AM, true); });
      sortWrap.appendChild(sel);
      tb.appendChild(sortWrap);
      var sorted = sortTopics(topics, U.sort);
      var shown = sorted.slice(0, U.limit);
      table(tb, {
        caption: T("usage.k.topicsCaption"),
        cols: [T("usage.k.colTopic"), T("usage.k.colModel"), T("usage.k.colBar"), T("usage.k.colTokens"), T("usage.k.colCache"), T("usage.k.colShare")],
        numeric: true,
        leftCols: [1, 2],
        rows: shown.map(function (r) {
          var x = obj(r);
          var title = scrubSecrets(x.title == null ? "" : x.title) || DASH;
          var meter;
          if (isNum(x.sharePct)) {
            meter = el("div", "am-use-meter");
            meter.setAttribute("role", "progressbar");
            meter.setAttribute("aria-valuemin", "0");
            meter.setAttribute("aria-valuemax", "100");
            meter.setAttribute("aria-valuenow", String(Math.round(Math.max(0, Math.min(100, x.sharePct)))));
            meter.setAttribute("aria-label", T("usage.k.meterLabel", { title: title, pct: fmtPct(x.sharePct) }));
            meter.appendChild(el("div", "am-use-meter-fill " + wClass(x.sharePct)));
          } else {
            meter = valueOrNoData("", false);
          }
          return [
            { name: title },
            { name: x.model ? String(x.model) : DASH, sub: fmtAgo(x.lastAt) },
            meter,
            valueOrNoData(fmtCompact(x.tokens), isNum(x.tokens)),
            valueOrNoData(fmtPct(x.cacheHitPct), isNum(x.cacheHitPct)),
            valueOrNoData(fmtPct(x.sharePct), isNum(x.sharePct))
          ];
        })
      });
      if (sorted.length > shown.length) {
        tb.appendChild(textBtn(T("usage.k.more", { n: sorted.length - shown.length }), function () { U.limit = sorted.length; renderPage(AM, true); }, "usage-more"));
      }
    }

    // Aynı veriden salt-bilgi uyarı çipleri
    var ab = block(c, T("usage.k.alertsBlock"), T("usage.k.alertsHint"));
    function alertGroup(label, rows, valueOf) {
      var g = el("div", "am-use-alertgroup");
      g.appendChild(el("div", "am-use-alert-l", label));
      var w = el("div", "am-set-chips");
      if (!rows.length) w.appendChild(el("span", "am-set-sub", T("usage.k.alertNone")));
      rows.forEach(function (r) {
        w.appendChild(chip(T("usage.k.alertChip", { title: scrubSecrets(r.title == null ? "" : r.title) || DASH, value: valueOf(r) }), "info", { icon: "info" }));
      });
      g.appendChild(w);
      ab.appendChild(g);
    }
    alertGroup(T("usage.k.alertTop"), topSpenders(topics), function (r) { return fmtCompact(r.tokens) + " · " + fmtPct(r.sharePct); });
    alertGroup(T("usage.k.alertLow"), lowCache(topics), function (r) { return fmtPct(r.cacheHitPct); });

    var nb = block(c);
    note(nb, T("usage.k.priceNote"), "info");
    if (u.note) note(nb, T("usage.k.serverNote", { note: scrubSecrets(String(u.note)).slice(0, 200) }), "muted");
  }

  var PAGE_DEFS = [
    { id: "genel", icon: "gear", build: pageGenel },
    { id: "bellek", icon: "brain", build: pageBellek },
    { id: "ortam", icon: "globe", build: pageOrtam },
    { id: "kullanim", icon: "grid", build: pageKullanim },
    { id: "hata", icon: "code", build: pageHata }
  ];

  function pageDef(id) {
    for (var i = 0; i < PAGE_DEFS.length; i += 1) { if (PAGE_DEFS[i].id === id) return PAGE_DEFS[i]; }
    return PAGE_DEFS[0];
  }

  // ------------------------------------------------------------------ çatı
  function localSig() { return { s: U.sort, l: U.limit, q: U.auditQ, a: U.auditLimit, g: (typeof window !== "undefined" && typeof window.AM_LANG === "function" ? window.AM_LANG() : "tr") }; }

  function renderPage(AM, force) {
    if (!U.content) return;
    var sig = pageSig(U.page, AM.state, localSig());
    if (!force && sig === U.sigLast) return;
    U.sigLast = sig;
    var c = U.content;
    var ae = document.activeElement;
    var fkey = ae && c.contains(ae) ? ae.getAttribute("data-fkey") : null;
    var top = c.scrollTop;
    while (c.firstChild) c.removeChild(c.firstChild);
    try {
      if (regError) errorCard(c, T("usage.err.title"), T("usage.err.register", { reason: regError }), null);
      pageDef(U.page).build(AM, c);
    } catch (e) {
      U.sigLast = "";
      while (c.firstChild) c.removeChild(c.firstChild);
      errorCard(c, T("usage.err.title"), T("usage.err.detail", { reason: scrubSecrets(String(e && e.message ? e.message : e)).slice(0, 200) }), function () { renderPage(AM, true); });
    }
    c.scrollTop = top;
    if (fkey) {
      var cand = c.querySelectorAll("[data-fkey]");
      for (var i = 0; i < cand.length; i += 1) {
        if (cand[i].getAttribute("data-fkey") === fkey) { cand[i].focus(); break; }
      }
    }
  }

  function paintNav() {
    PAGE_DEFS.forEach(function (d) {
      var b = U.navButtons[d.id];
      if (!b) return;
      var on = d.id === U.page;
      b.className = "am-set-nav-item" + (on ? " am-set-nav-item--on" : "");
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
      b.tabIndex = on ? 0 : -1;
    });
  }

  function selectPage(AM, id, focusNav) {
    U.page = normPage(id);
    setView(AM, { projectSettingsPage: U.page });
    paintNav();
    renderPage(AM, true);
    if (U.content) U.content.scrollTop = 0;
    if (focusNav && U.navButtons[U.page]) U.navButtons[U.page].focus();
  }

  function focusables(root) {
    var all = root.querySelectorAll("a[href],button,input,select,textarea,[tabindex]");
    var out = [];
    for (var i = 0; i < all.length; i += 1) {
      var n = all[i];
      if (n.disabled || n.tabIndex < 0) continue;
      var p = n;
      var hidden = false;
      while (p && p !== root) { if (p.hidden) { hidden = true; break; } p = p.parentNode; }
      if (!hidden) out.push(n);
    }
    return out;
  }

  function onRootKey(AM, ev) {
    if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      closeProject(AM);
      return;
    }
    if (ev.key !== "Tab") return;
    var f = focusables(U.root);
    if (!f.length) { ev.preventDefault(); return; }
    var first = f[0];
    var last = f[f.length - 1];
    var a = document.activeElement;
    if (ev.shiftKey && (a === first || !U.root.contains(a))) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && (a === last || !U.root.contains(a))) { ev.preventDefault(); first.focus(); }
  }

  function openDialog(AM) {
    U.lastFocus = document.activeElement || null;
    var root = el("div", "am-overlay am-set-overlay");
    root.setAttribute("data-owner", "project-settings");
    var dlg = el("div", "am-set-dialog");
    dlg.setAttribute("role", "dialog");
    dlg.setAttribute("aria-modal", "true");
    dlg.setAttribute("aria-labelledby", "am-use-title");
    var title = el("h1", "am-set-sr", T("usage.title"));
    title.id = "am-use-title";
    dlg.appendChild(title);

    var side = el("div", "am-set-side am-set-side--small");
    var nav = el("nav", "am-set-nav");
    nav.setAttribute("aria-label", T("usage.navLabel"));
    var group = el("div", "am-set-group");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", T("usage.title"));
    group.appendChild(el("div", "am-set-group-title", T("usage.title")));
    U.navButtons = Object.create(null);
    PAGE_DEFS.forEach(function (d) {
      var b = el("button", "am-set-nav-item");
      b.type = "button";
      b.setAttribute("data-id", d.id);
      b.appendChild(icon(d.icon, 16));
      b.appendChild(el("span", "am-set-nav-t", T("usage.nav." + d.id)));
      b.addEventListener("click", function () { selectPage(AM, d.id, false); });
      U.navButtons[d.id] = b;
      group.appendChild(b);
    });
    nav.appendChild(group);
    nav.addEventListener("keydown", function (ev) {
      var k = ev.key;
      if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].indexOf(k) === -1) return;
      var t = ev.target && ev.target.closest ? ev.target.closest(".am-set-nav-item") : null;
      if (!t) return;
      ev.preventDefault();
      var ids = PAGES;
      var i = ids.indexOf(t.getAttribute("data-id"));
      var n = k === "Home" ? 0 : (k === "End" ? ids.length - 1 : ((k === "ArrowDown" || k === "ArrowRight") ? (i + 1) % ids.length : (i - 1 + ids.length) % ids.length));
      selectPage(AM, ids[n], true);
    });
    side.appendChild(nav);

    var main = el("div", "am-set-main");
    var close = el("button", "am-set-close");
    close.type = "button";
    close.setAttribute("aria-label", T("usage.close"));
    close.setAttribute("title", T("nav.close"));
    close.appendChild(icon("x", 18));
    close.addEventListener("click", function () { closeProject(AM); });
    var content = el("div", "am-set-content");
    content.setAttribute("role", "region");
    content.setAttribute("aria-label", T("usage.title"));
    content.tabIndex = -1;
    var live = el("div", "am-set-live");
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    main.appendChild(close);
    main.appendChild(content);
    main.appendChild(live);

    dlg.appendChild(side);
    dlg.appendChild(main);
    root.appendChild(dlg);
    root.addEventListener("keydown", function (ev) { onRootKey(AM, ev); });
    root.addEventListener("mousedown", function (ev) { if (ev.target === root) closeProject(AM); });

    U.root = root; U.nav = nav; U.content = content; U.live = live;
    U.sigLast = "";
    U.host.appendChild(root);
    paintNav();
    renderPage(AM, true);
    var target = U.navButtons[U.page];
    try { if (target) target.focus(); } catch (e) { /* odak verilemezse sorun değil */ }
  }

  function closeDialog() {
    if (!U.root) return;
    var prev = U.lastFocus;
    if (U.liveTimer) { clearTimeout(U.liveTimer); U.liveTimer = 0; }
    if (U.root.parentNode) U.root.parentNode.removeChild(U.root);
    U.root = null; U.nav = null; U.content = null; U.live = null; U.navButtons = Object.create(null);
    U.lastFocus = null;
    U.usageRequested = false;
    U.limit = 10;
    U.auditLimit = 25;
    U.auditQ = "";
    if (prev && prev.isConnected && typeof prev.focus === "function") {
      try { prev.focus(); } catch (e) { /* yoksay */ }
    }
  }

  function render(AM) {
    try {
      if (!U.host) return;
      var open = !!(AM && AM.view && AM.view.projectSettingsOpen);
      if (!open) { closeDialog(); return; }
      U.page = normPage(AM.view.projectSettingsPage);
      if (!U.root) { openDialog(AM); return; }
      paintNav();
      renderPage(AM, false);
    } catch (e) {
      if (U.content) {
        while (U.content.firstChild) U.content.removeChild(U.content.firstChild);
        errorCard(U.content, T("usage.err.title"), T("usage.err.detail", { reason: scrubSecrets(String(e && e.message ? e.message : e)).slice(0, 200) }), function () { render(AM); });
      }
    }
  }

  function init(AM, host) {
    U.AM = AM;
    U.host = host || null;
  }

  window.AM_USAGE = { init: init, render: render, pure: pure };
})();
