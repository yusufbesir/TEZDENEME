/*
 * Sahip: Claude [İP:AgentMom Faz 11, D9 yetenekler menüsü]. yazan: [Claude#agentmom-d9-yetenekler]
 * Amaç: window.AM_CAPABILITIES = KÜÇÜK STATİK KATALOG (dizi). Kullanıcının arayüzden/menüden ÇAĞIRDIĞI yetenekler (ADR-016: yetenekler kendiliğinden çalışmaz).
 *   Her kayıt: {id (kontrol listesi madde no), ad, kategori (§14 sayfa kimliği), nasil (["kullanıcı isteği"]), tur ("hesap"), sayfa, bolum (sayfadaki bölüm başlığı kimliği), aciklama, veri? (kullanılabilirlik için veri anahtarı)}.
 *   "model" türü yetenekler (81, 82, 84, 85, 65, 92: uygulamadaki modeli çağırır) tur:"model", modelId (sunucu slug'ı) ve sayfada "Model yetenekleri" kartı (am-model-<slug>) ile kayıtlıdır; kullanılabilirlik GET /api/capabilities/model'den gelir. Yer tutucu yok.
 * window.AM_CAPABILITIES_API: availability(AM, kayıt) -> {ok, reason}; target(kayıt) -> {page, param}; textList(AM) -> "/yetenekler" metni; sectionOf(param).
 * Kurallar: ağ yok; depolama yok; kullanıcı kontrollü metin yok (hepsi sabit); sunucu metni (kullanılamama nedeni) yalnız temizlenip kırpılır. Değiştirme: yalnız sahibi ya da ana oturum.
 */
(function () {
  "use strict";

  var TR = {
    "caps.title": "Yetenekler",
    "caps.hint": "Yetenekler kendiliğinden çalışmaz; yalnız siz çağırınca çalışır. Seçince ilgili sayfa ve bölüm açılır.",
    "caps.unavailable": "kullanılamıyor: {neden}",
    "caps.unavailableShort": "Kullanılamıyor",
    "caps.reasonNone": "uç yanıt vermedi",
    "caps.netOff": "internet kapalı: yalnız kaynaksız",
    "caps.listLineNote": "• {ad} — {kategori} ({not})",
    "caps.listHead": "Yetenekler (yalnız siz çağırınca çalışır; kendiliğinden kayıt/karar yazmaz):",
    "caps.listLine": "• {ad} — {kategori}",
    "caps.listLineBad": "• {ad} — {kategori} (kullanılamıyor: {neden})",
    "caps.listFoot": "Ctrl+K komut paletinde ad yazarak arayıp açabilirsiniz.",
    "caps.empty": "Yetenek kataloğu yüklenemedi.",
    "caps.page.integrations": "Entegrasyonlar ve Yetenekler",
    "caps.page.verify": "Beyin Verify",
    "caps.page.memory": "Hafıza ve Bilgi",
    "caps.page.research": "Araştırma ve Kalibrasyon",
    "caps.page.tasks": "Görevler ve İş Akışları"
  };
  if (typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("caps", TR);

  var PREFIX = "bolum:";
  var CTRL_RE = /[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  var SECRET_RE = /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,})\b|Bearer\s+[A-Za-z0-9._~+\/=-]{12,}/g;
  var USER_CALL = "kullanıcı isteği";

  function fill(text, vars) {
    return String(text).replace(/\{([A-Za-z0-9_]+)\}/g, function (m, k) {
      return vars && Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== null && vars[k] !== undefined ? String(vars[k]) : "";
    });
  }
  function T(key, vars) {
    if (typeof window.AM_T === "function") {
      try { var s = window.AM_T(key, vars); if (typeof s === "string" && s.indexOf("⟦") !== 0) return s; } catch (e) { /* aşağıdaki yedek */ }
    }
    return Object.prototype.hasOwnProperty.call(TR, key) ? fill(TR[key], vars) : "⟦" + key + "⟧";
  }

  var VERIFY_NOTE = " Beyin Verify sayfasından çalıştırılır (bu menü yalnız sayfaya götürür).";
  function cap(id, ad, sayfa, bolum, aciklama, veri) {
    var o = { id: id, ad: ad, kategori: sayfa, nasil: [USER_CALL], tur: "hesap", sayfa: sayfa, bolum: bolum, aciklama: aciklama };
    if (veri) o.veri = veri;
    return Object.freeze(o);
  }

  function modelCap(id, slug, ad, aciklama, internet) {
    var o = { id: id, ad: ad, kategori: "research", nasil: [USER_CALL], tur: "model", sayfa: "research", bolum: "am-model-" + slug, aciklama: aciklama, modelId: slug };
    if (internet === true) o.internet = true;
    return Object.freeze(o);
  }

  var CATALOG = Object.freeze([
    cap(21, "Otomatik dokümantasyon", "integrations", "am-more-int-tb", "Koddan üretilen belgeler (modül haritası, uç tablosu) docs/ altındadır; arayüzden çalıştırılmaz. Salt bilgi: durumu yetenek tablosunda görünür."),
    cap(24, "API test laboratuvarı", "verify", "am-more-vf-t", "Bildirimsel API senaryoları." + VERIFY_NOTE),
    cap(27, "Erişilebilirlik laboratuvarı", "verify", "am-more-vf-t", "Statik HTML için erişilebilirlik denetimleri." + VERIFY_NOTE),
    cap(49, "Projeye özgü tasarım motoru", "verify", "am-more-vf-t", "Projenin tasarım sözleşmesine uygunluk denetimi." + VERIFY_NOTE),
    cap(50, "Jenerik tasarım karşıtı ilkeler", "verify", "am-more-vf-t", "Jenerik/şablon izlerini ölçülebilir kurallarla yakalar." + VERIFY_NOTE),
    cap(56, "Davranış sözleşmeleri ve değişmezler", "verify", "am-more-vf-t", "Bildirimsel değişmez ve ön/son koşul sözleşmeleri." + VERIFY_NOTE),
    cap(57, "Durum geçiş laboratuvarı", "verify", "am-more-vf-t", "Durum makinesi yapısal denetimi." + VERIFY_NOTE),
    cap(58, "Mutasyon testi", "verify", "am-more-vf-t", "Çalışma ağacı kopyasında mutant üretip testleri sınar." + VERIFY_NOTE),
    cap(44, "Aşamalı bağlam getirme", "memory", "am-more-mm-c", "Hafızadan özet, bölüm ve kaynak aşamalarıyla, karakter bütçesini aşmadan bağlam getirir."),
    cap(87, "Örtük bilgi önerileri", "memory", "am-more-mm-i", "Tekrarlanan onay/ret kalıplarından ADAY öneri çıkarır; hiçbiri kendiliğinden kaydedilmez.", "memoryImplicit"),
    cap(90, "Proje hafızası özeti", "memory", "am-more-mm-k", "Geçerli kayıtlardan, kararlardan ve çelişkilerden proje özeti derler.", "memoryCompile"),
    cap(61, "Argüman derle", "research", "am-more-rs-g", "Bir kararın dayanaklarını, varsayımlarını, risklerini ve karşı görüşlerini tek metinde derler (karar soy ağacındaki Argüman düğmesi)."),
    cap(62, "Rakip hipotezler", "research", "am-lab-hyp", "Kanıtlara göre rakip hipotezlerin ardıl olasılığını hesaplar; yalnız öneridir."),
    cap(63, "Bilgi değeri", "research", "am-lab-voi", "Ek bilgi toplamaya değip değmediğini (EVPI, EVSI) hesaplar; yalnız öneridir."),
    cap(64, "Çelişki çözüm önerileri", "research", "am-lab-res", "Çelişen hafıza kayıtları için tutulacak ve emekli edilecek kaydı önerir; uygulama kullanıcı kararıdır.", "contradictionResolutions"),
    cap(66, "Bilgi yarı ömrü", "research", "am-lab-half", "Hafıza kayıtlarının türe ve kapsama göre eskime hızını gösterir.", "halflife"),
    cap(89, "Karar soy ağacı", "research", "am-more-rs-g", "Bir kararın yerine geçen kararlar zinciri.", "genealogy"),
    cap(97, "Öğrenme getirisi", "research", "am-lab-learn", "Tahmin hatasının (Brier) zamanla iyileşip iyileşmediğini gösterir.", "learning"),
    cap(93, "Dikkat sırası", "tasks", "am-lab-attn", "Onay bekleyen görevleri bütçeye göre şimdi/bugün/toplu katmanlarına ayırır; yalnız sıralar."),
    cap(70, "Etki haritası", "integrations", "am-lab-impact", "Bir dosya değişirse etkilenecek dosyaları ve testleri katman katman gösterir."),
    cap(71, "Bağlam değiştirme", "integrations", "am-lab-switching", "Görevler arası geçişleri, en yoğun saatleri ve tahmini yeniden yükleme maliyetini ölçer; KISMİ bir göstergedir, öneri vermez.", "analysisSwitching"),
    cap(72, "Kaynak gölge fiyatı", "integrations", "am-lab-shadow", "Sağlayıcı kotalarının kıtlığını gösterir (para birimi yok).", "analysisShadow"),
    cap(73, "Yetenek süreklilik grafiği", "integrations", "am-lab-cont", "Tek hata noktalarını ve bir sağlayıcı kapanırsa kaybolan yetenekleri gösterir.", "analysisContinuity"),
    cap(74, "Çevrimdışı süreklilik kipi", "integrations", "am-lab-offline", "Sağlayıcı yokken nelerin çalışmaya devam ettiğini gösterir.", "analysisOffline"),
    cap(80, "Sağlayıcı çıkış planı", "integrations", "am-lab-exit", "Bir sağlayıcı bırakılırsa yerine geçebilecek adayları puanlar."),
    cap(83, "Eksiklik ve fazlalık", "integrations", "am-lab-absence", "Kullanılmayan ve eksik görünen parçaları listeler; silme önerisi değildir.", "analysisAbsence"),
    cap(86, "Uzmanlık haritası", "integrations", "am-lab-expertise", "Sağlayıcı ve rol bazında gözlenen başarı oranlarını gösterir.", "analysisExpertise"),
    cap(99, "İç yetenek aracısı", "integrations", "am-lab-broker", "Bir yetenek için uygun sağlayıcıları sıralar, elenenleri nedenleriyle gösterir."),
    cap(33, "Teknik borç merkezi", "integrations", "am-lab-techdebt", "Açık işaretçileri, testi olmayan dosyaları, en büyük dosyaları, içe aktarma döngülerini ve bildirilen paket sürümlerini sayar; puan ya da öncelik vermez.", "analysisTechDebt"),
    cap(29, "Sürüm etki analizi", "integrations", "am-lab-release", "İki git başvurusu arasında değişen dosyaları, etkilenen dosya ve testleri, testsiz değişenleri ve migrasyon değişikliğini gösterir; yalnız okur."),
    cap(25, "Veri analizi laboratuvarı", "integrations", "am-lab-dataprofile", "İzinli klasördeki CSV, TSV, JSON ya da NDJSON dosyasının satır, sütun, tür, boşluk ve anomali sayılarını çıkarır; ham veri göstermez."),
    // Model yetenekleri (D8c): "Araştırma ve Kalibrasyon" sayfasındaki "Model yetenekleri" bölümünden çalıştırılır; kullanılabilirlik GET /api/capabilities/model'den gelir.
    modelCap(81, "solution-space", "Çözüm uzayı gezgini", "Bir problem için birbirinden farklı çözüm ailelerini; artı/eksi, varsayım ve ödünleşimleriyle çıkarır. Uygulamadaki modeli kullanır; yalnız öneridir."),
    modelCap(82, "idea-transfer", "Disiplinler arası fikir aktarımı", "Problemi başka disiplinlerin kavramlarıyla eşleyerek yeni bakış açıları önerir. Uygulamadaki modeli kullanır; yalnız öneridir."),
    modelCap(84, "inversion", "Tersine çevirme", "Hedefe nasıl ulaşılamayacağını sorar: başarısızlık biçimlerini ve önlemlerini listeler. Uygulamadaki modeli kullanır; yalnız öneridir."),
    modelCap(85, "emergence", "Ortaya çıkan davranış", "Parçaların etkileşiminden beklenmedik davranışlar çıkabilecek yerleri tahmin eder. Uygulamadaki modeli kullanır; yalnız öneridir."),
    modelCap(65, "multi-horizon", "Çok ufuklu strateji", "Hedefi ufuklara bölerek her ufuk için amaç, risk ve bağımlılık çıkarır. Uygulamadaki modeli kullanır; yalnız öneridir."),
    modelCap(92, "intent", "Niyet katmanı", "Serbest metindeki isteği yetenek kataloğundaki bir yeteneğe eşlemeyi önerir; hiçbir yeteneği kendiliğinden çalıştırmaz. Uygulamadaki modeli kullanır."),
    // İnternetli model yetenekleri (D8c-UI-2): adres verilirse izinli alan adlarından kaynak getirir; adres verilmezse (ya da internet kapalıyken) kaynaksız mod.
    modelCap(75, "negotiation", "Ajanlar arası müzakere", "İki FARKLI sağlayıcı (A öneren, B eleştirmen) bir konuda 1-2 turluk müzakere yapar; uzlaşma, kısmi uzlaşma ya da anlaşmazlık ve açık konular çıkar. İki farklı sağlayıcı gerekir; yalnız öneridir."),
    modelCap(37, "research-center", "Araştırma merkezi", "Soruyu verdiğiniz (en çok 5) adresten getirilen kaynaklara dayanarak yanıtlar; bulgular alıntıyla doğrulanır. Adres yoksa kaynaksız mod: yalnız model bilgisi.", true),
    modelCap(38, "feature-discovery", "Özellik keşfi", "Proje tanımınıza ve verdiğiniz kaynaklara dayanarak eklenebilecek özellikleri gerekçe, öncelik ve emekle önerir. Adres yoksa kaynaksız mod: yalnız model bilgisi.", true),
    modelCap(40, "competitor-research", "Rakip ve ekosistem araştırması", "Bir konuyu ve rakipleri verdiğiniz kaynaklara dayanarak karşılaştırır; alıntılar doğrulanır. Adres yoksa kaynaksız mod: yalnız model bilgisi.", true)
  ]);

  function clean(v, max) {
    var s = String(v == null ? "" : v).replace(CTRL_RE, " ").replace(SECRET_RE, "[gizli]").replace(/\s+/g, " ").trim();
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  }

  // Kullanılabilirlik: yalnız BİLİNEN bir hata varsa (ilgili veri anahtarı hata durumunda ve hiç başarılı yanıt yok) gri. Hiç denenmemiş yetenek kullanılabilir sayılır.
  // Yalnız parametreyle çağrılan yeteneklerde (bağlam, argüman, etki haritası, çıkış planı, aracı, dikkat sırası) veri anahtarı YOKTUR: tek bir geçersiz parametre (404) yeteneği kapatmaz.
  // Model türü: kullanılabilirlik GET /api/capabilities/model yanıtından gelir (liste yüklenmediyse/denenmediyse kullanılabilir sayılır; bilinen hata ya da available:false gri + neden).
  // İnternetli yetenek: internet kapalıyken kullanılabilir KALIR (kaynaksız mod) ama menüde not düşülür. Durum sunucu listesindeki net.enabled'dan, yoksa netSettings verisinden okunur.
  function withNetNote(r, e, it, data) {
    if (!e.internet) return r;
    var on = null;
    if (it && it.net && typeof it.net === "object" && typeof it.net.enabled === "boolean") on = it.net.enabled;
    else {
      var ns = data.netSettings;
      var s = ns && ns.status === "ok" && ns.value && ns.value.settings && typeof ns.value.settings === "object" ? ns.value.settings : null;
      if (s && typeof s.enabled === "boolean") on = s.enabled;
    }
    if (on === false) r.note = T("caps.netOff");
    return r;
  }
  function modelAvailability(AM, e) {
    var data = AM && AM.state && AM.state.data && typeof AM.state.data === "object" ? AM.state.data : {};
    var d = data.modelCapabilities;
    if (!d || typeof d !== "object") return { ok: true, reason: "" };
    if (d.status === "error") return { ok: false, reason: clean(d.reason, 120) || T("caps.reasonNone") };
    var list = d.status === "ok" && d.value && Array.isArray(d.value.capabilities) ? d.value.capabilities : null;
    if (!list) return { ok: true, reason: "" };
    for (var i = 0; i < list.length; i += 1) {
      var it = list[i];
      if (!it || typeof it !== "object" || it.id !== e.modelId) continue;
      var a = it.availability && typeof it.availability === "object" ? it.availability : it;
      if (a.available === true) return withNetNote({ ok: true, reason: "" }, e, it, data);
      return { ok: false, reason: clean(a.reason, 120) || T("caps.reasonNone") };
    }
    return { ok: false, reason: T("caps.reasonNone") };
  }
  function availability(AM, e) {
    if (e && e.tur === "model") return modelAvailability(AM, e);
    if (!e || !e.veri) return { ok: true, reason: "" };
    var data = AM && AM.state && AM.state.data && typeof AM.state.data === "object" ? AM.state.data : {};
    var bad = null, good = false;
    Object.keys(data).forEach(function (k) {
      if (k !== e.veri && k.indexOf(e.veri + ":") !== 0) return;
      var d = data[k];
      if (!d || typeof d !== "object") return;
      if (d.status === "ok") good = true;
      else if (d.status === "error" && !bad) bad = d;
    });
    if (bad && !good) return { ok: false, reason: clean(bad.reason, 120) || T("caps.reasonNone") };
    return { ok: true, reason: "" };
  }

  function byId(id) {
    for (var i = 0; i < CATALOG.length; i += 1) if (CATALOG[i].id === id) return CATALOG[i];
    return null;
  }
  // Sayfa parametresi: "bolum:<kimlik>" ya da (aynı bölüme yeniden gidildiğinde bile yeniden açılsın diye) "bolum:<kimlik>:<sayaç>".
  function target(e, nonce) { return e ? { page: e.sayfa, param: PREFIX + e.bolum + (nonce ? ":" + nonce : "") } : null; }
  function sectionOf(param) {
    var m = typeof param === "string" ? /^bolum:([A-Za-z0-9._-]{1,60})(?::[0-9]{1,6})?$/.exec(param) : null;
    return m ? m[1] : "";
  }
  // Sayfa adı: sayfa çerçevesinin başlığı (pages.title.*); çerçeve yüklenmemişse yerel yedek (⟦anahtar⟧ görünmesin).
  function pageLabel(e) {
    var s = T("pages.title." + e.sayfa);
    return s.indexOf("⟦") === 0 ? T("caps.page." + e.sayfa) : s;
  }

  function textList(AM) {
    if (!CATALOG.length) return T("caps.empty");
    var lines = [T("caps.listHead")];
    var order = [];
    CATALOG.forEach(function (e) { if (order.indexOf(e.kategori) < 0) order.push(e.kategori); });
    order.forEach(function (k) {
      CATALOG.filter(function (e) { return e.kategori === k; }).forEach(function (e) {
        var a = availability(AM, e);
        lines.push(a.ok ? (a.note ? T("caps.listLineNote", { ad: e.ad, kategori: pageLabel(e), not: a.note }) : T("caps.listLine", { ad: e.ad, kategori: pageLabel(e) })) : T("caps.listLineBad", { ad: e.ad, kategori: pageLabel(e), neden: a.reason }));
      });
    });
    lines.push(T("caps.listFoot"));
    return lines.join("\n");
  }

  window.AM_CAPABILITIES = CATALOG;
  window.AM_CAPABILITIES_API = Object.freeze({ availability: availability, byId: byId, target: target, sectionOf: sectionOf, pageLabel: pageLabel, textList: textList, PREFIX: PREFIX, clean: clean });
})();
