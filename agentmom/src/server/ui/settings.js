/*
 * Sahip: Sonnet (Ayarlar penceresi) [İP:AgentMom Faz 11, dilim 2]
 * yazan: [Claude#agentmom-faz11-ayarlar]
 * Amaç: window.AM_SETTINGS = { init(AM, host), render(AM), pure }. #overlayRoot içinde
 *       div.am-overlay[data-owner="settings"] tam ekrana yakın MODAL: solda aranabilir gruplu gezinme,
 *       sağda bölüm içeriği. Yardım bölümlerinin içeriği help.js'tedir (AM_HELP.renderSection).
 * Kural kaynağı: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md (Ekran 5) ve docs/tasarim/arayuz-sozlesmesi.md
 *       (güvenlik kuralları): sunucu verisi yalnız textContent; HTML dizesi ataması, satır içi stil/olay, dış kaynak, tarayıcı depolaması ve ağ isteği YOK.
 * Güvenlik duruşu: pencere SALT OKUNUR ya da onaylı değişiklik yapar. Politika/izin değiştiren, belirteç gösteren,
 *       API anahtarı isteyen, kalıcı silme yapan hiçbir öğe yoktur; tehlikeli işlem yalnız Arşivle ve AM_DIALOG.confirm ile.
 * Değiştirme: yalnız sahibi ya da ana oturum. Yükleme sırasında DOM'a dokunmaz; saf mantık window.AM_SETTINGS.pure altındadır.
 */
(function () {
  "use strict";

  // ------------------------------------------------------------------ metinler
  var TR = {
    "settings.title": "Ayarlar",
    "settings.close": "Ayarlar penceresini kapat",
    "settings.searchLabel": "Ayarlarda ara",
    "settings.searchPh": "Ara",
    "settings.navLabel": "Ayarlar gezinmesi",
    "settings.noMatch": "Eşleşen bölüm ya da satır yok.",
    "settings.noRows": "Bu bölümde eşleşen satır yok.",
    "settings.group.settings": "Ayarlar",
    "settings.group.computer": "Bu bilgisayar",
    "settings.group.help": "Yardım",
    "settings.nav.genel": "Genel",
    "settings.nav.saglayicilar": "Sağlayıcılar",
    "settings.nav.guvenlik": "Güvenlik ve izinler",
    "settings.nav.bellek": "Bellek",
    "settings.nav.beceriler": "Beceriler",
    "settings.nav.yedekleme": "Yedekleme",
    "settings.nav.gorunum": "Görünüm",
    "settings.nav.sistem": "Sistem",
    "settings.nav.kasa": "Kasa ve dosyalar",
    "settings.nav.gelistirici": "Geliştirici",
    "settings.nav.egitim": "Eğitim belgesi",
    "settings.nav.kisayollar": "Kısayollar",
    "settings.nav.komutlar": "Komutlar",
    "settings.nav.guvenlik-sinirlari": "Güvenlik sınırları",
    "settings.nav.el-kitabi": "İşletim el kitabı",
    "settings.err.title": "Bu bölüm çizilemedi",
    "settings.err.detail": "Ayrıntı: {reason}",
    "settings.err.retry": "Yeniden dene",
    "settings.err.noHelp": "Yardım modülü yüklenemedi; bu bölüm gösterilemiyor.",
    "settings.err.noDialog": "Onay penceresi yüklenemedi; işlem yapılmadı.",
    "settings.err.noAction": "Bu eylem şu an kullanılamıyor; işlem yapılmadı.",
    "settings.err.register": "Metin kaydı hatası: {reason}",
    "settings.na": "—",
    "settings.noData": "veri yok",
    "settings.yes": "Evet",
    "settings.no": "Hayır",
    "settings.copy": "Kopyala",
    "settings.copied": "Panoya kopyalandı.",
    "settings.copyFail": "Kopyalanamadı.",
    "settings.tone.ok": "tamam",
    "settings.tone.warn": "dikkat",
    "settings.tone.bad": "sorun",
    "settings.tone.info": "bilgi",
    "settings.tone.muted": "belirsiz",

    "settings.genel.title": "Genel",
    "settings.genel.desc": "Uygulamanın yerel kipte nasıl çalıştığına ve proje kısayollarına bakış. Bu sayfa kendi başına bir ayarı değiştirmez.",
    "settings.genel.appBlock": "Uygulama",
    "settings.genel.name": "Uygulama",
    "settings.genel.mode": "Çalışma kipi",
    "settings.genel.modeDesc": "Arayüz model çağırmaz; her işlem için izin ister.",
    "settings.genel.conn": "Sunucu bağlantısı",
    "settings.genel.connOk": "bağlı",
    "settings.genel.connBad": "bağlı değil",
    "settings.genel.updated": "Son güncelleme",
    "settings.genel.workBlock": "Çalışma özeti",
    "settings.genel.tasks": "Görevler",
    "settings.genel.tasksDesc": "{total} kayıt: {waiting} izin bekliyor, {running} çalışıyor, {failed} başarısız.",
    "settings.genel.debt": "Varsayım borcu",
    "settings.genel.debtDesc": "{n} açık kalem.",
    "settings.genel.projectBlock": "Proje",
    "settings.genel.projectRow": "Proje ayarları",
    "settings.genel.projectRowDesc": "Kök klasör, bellek, ortam ve hata ayıklama görünümü.",
    "settings.genel.openProject": "Proje ayarlarını aç",
    "settings.genel.usageRow": "Kullanım",
    "settings.genel.usageRowDesc": "Token, önbellek ve kod değişikliği özeti (yalnız bilgi).",
    "settings.genel.openUsage": "Kullanımı aç",
    "settings.genel.subBlock": "Alt oturumlar",
    "settings.genel.archiveRow": "Boştaki alt oturumları arşivle",
    "settings.genel.archiveDesc": "{n} boşta ya da tamamlanmış alt oturum arşive taşınır. Arşiv geri alınabilir; hiçbir şey silinmez.",
    "settings.genel.archiveNone": "Arşivlenecek boşta alt oturum yok.",
    "settings.genel.archiveBtn": "Arşivle…",
    "settings.genel.archiveTitle": "Boştaki alt oturumlar arşivlensin mi?",
    "settings.genel.archiveAction": "Arşivle (geri alınabilir)",
    "settings.genel.archiveTarget": "{n} alt oturum",
    "settings.genel.archiveDone": "{n} alt oturum arşivlendi.",
    "settings.genel.archiveFail": "{n} alt oturum arşivlenemedi.",

    "settings.saglayicilar.title": "Sağlayıcılar",
    "settings.saglayicilar.desc": "Model sağlayıcılarının doğrulanmış durumu. Salt okunur; arayüz hiçbir sağlayıcıyı çağırmaz.",
    "settings.saglayicilar.colName": "Sağlayıcı",
    "settings.saglayicilar.colCaps": "Yetenekler",
    "settings.saglayicilar.route": "Rota: {route}",
    "settings.saglayicilar.level.ready": "hazır",
    "settings.saglayicilar.level.partial": "kısmi",
    "settings.saglayicilar.level.unverified": "doğrulanmadı",
    "settings.saglayicilar.level.unknown": "yetenek bildirilmedi",
    "settings.saglayicilar.noCaps": "Yetenek bildirilmedi.",
    "settings.saglayicilar.capsCaption": "Sağlayıcılar ve yetenek durumları",

    "settings.guvenlik.title": "Güvenlik ve izinler",
    "settings.guvenlik.desc": "Etkin politikanın salt okunur özeti. Bu pencereden izin genişletilemez.",
    "settings.guvenlik.note": "Yusuf'un açık onayı olmadan politika değişmez. Burada yalnız sayılar ve eylem listesi gösterilir; klasör yolları ve gizli bilgiler gösterilmez.",
    "settings.guvenlik.none": "Politika özeti sunucudan alınamadı; sayılar gösterilemiyor.",
    "settings.guvenlik.dirsBlock": "Kapsam",
    "settings.guvenlik.allowedDirs": "İzinli klasörler",
    "settings.guvenlik.allowedDirsDesc": "Ajanların çalışabildiği klasör sayısı.",
    "settings.guvenlik.forbiddenDirs": "Yasak klasörler",
    "settings.guvenlik.forbiddenDirsDesc": "Her sağlayıcı ve eylem için kesin yasak alan sayısı.",
    "settings.guvenlik.trustedRepos": "Güvenilir depolar",
    "settings.guvenlik.trustedReposDesc": "Kısıtsız okuma yapan sağlayıcıların çalışabildiği depo sayısı.",
    "settings.guvenlik.allowedProviders": "İzinli sağlayıcılar",
    "settings.guvenlik.allowedProvidersDesc": "Politikanın izin verdiği sağlayıcı sayısı.",
    "settings.guvenlik.paid": "Ücretli rota",
    "settings.guvenlik.paidNone": "izin yok",
    "settings.guvenlik.paidApproved": "onaylı",
    "settings.guvenlik.expires": "Sözleşme bitişi",
    "settings.guvenlik.actionsBlock": "Eylemler",
    "settings.guvenlik.actionsDesc": "Politikanın tanıdığı eylemler. \"izin ister\" olanlar her seferinde sizin onayınızı bekler.",
    "settings.guvenlik.actionsCaption": "İzinli eylemler ve onay gereksinimi",
    "settings.guvenlik.colAction": "Eylem",
    "settings.guvenlik.colStatus": "Durum",
    "settings.guvenlik.needApproval": "izin ister",
    "settings.guvenlik.allowed": "izinli",
    "settings.guvenlik.noActions": "Eylem listesi bildirilmedi.",

    "settings.bellek.title": "Bellek",
    "settings.bellek.desc": "Kayıtlı bilgi sayıları ve geçerlilik durumu. Salt okunur.",
    "settings.bellek.none": "Bellek özeti sunucudan alınamadı.",
    "settings.bellek.total": "Toplam kayıt",
    "settings.bellek.valid": "Geçerli kayıt",
    "settings.bellek.stale": "Bayat kayıt",
    "settings.bellek.staleDesc": "Süresi ya da kaynağı eskimiş kayıtlar güncel karar sayılmaz.",
    "settings.bellek.updated": "Son güncelleme",

    "settings.beceriler.title": "Beceriler",
    "settings.beceriler.desc": "Kayıtlı becerilerin durumu ve risk sınıfı. Salt okunur.",
    "settings.beceriler.colName": "Beceri",
    "settings.beceriler.caption": "Beceriler, durum ve risk sınıfı",

    "settings.yedekleme.title": "Yedekleme",
    "settings.yedekleme.desc": "Yedek alma ve doğrulama komutları. Bu pencere komut çalıştırmaz; komutları terminalde kendiniz çalıştırırsınız.",
    "settings.yedekleme.infoBlock": "Kurallar",
    "settings.yedekleme.info1": "Her yedek yeni bir klasöre yazılır; hiçbir şey üzerine yazılmaz ya da silinmez.",
    "settings.yedekleme.info2": "Yedek oturum belirtecini, kimlik bilgilerini ve anahtar klasörünü içermez.",
    "settings.yedekleme.info3": "Eski yedekleri silmek yalnız sizin kararınızdır: Geri Dönüşüm Kutusu'na taşıyın.",
    "settings.yedekleme.cmdBlock": "Komutlar",
    "settings.yedekleme.cmdMake": "Yedek al",
    "settings.yedekleme.cmdMakeDesc": "Sunucu çalışırken de güvenli; yeni klasör oluşturur.",
    "settings.yedekleme.cmdCheck": "Yedeği doğrula",
    "settings.yedekleme.cmdCheckDesc": "Özetler, bütünlük ve şema denetimi. Yedek klasörünü kendiniz yazarsınız.",
    "settings.yedekleme.cmdRestore": "Doğrulanmış kopyayı yeni klasöre aç",
    "settings.yedekleme.cmdRestoreDesc": "Canlı veriye dokunmaz; hedef klasör var olmamalıdır.",
    "settings.yedekleme.statusBlock": "Durum",
    "settings.yedekleme.unavailableTitle": "Yedek durumu alınamadı",
    "settings.yedekleme.unavailableHint": "Yedek durumu sunucudan okunamadı. Yedek alınmadı demek değildir; biraz sonra yeniden bakın.",
    "settings.yedekleme.policy": "Yedek sabit saatte değil, kullanıma göre alınır: değişiklik olduysa ve kullanım sakinleştiğinde ya da uygulama kapanırken. Hiç değişiklik yoksa yedek alınmaz. Her karar denetim kaydına yazılır.",
    "settings.yedekleme.lastBackup": "Son yedek",
    "settings.yedekleme.noBackup": "Henüz yedek yok",
    "settings.yedekleme.folder": "klasör: {dir}",
    "settings.yedekleme.verify": "Son doğrulama",
    "settings.yedekleme.verifyOk": "Geçti",
    "settings.yedekleme.verifyFail": "KALDI",
    "settings.yedekleme.noVerify": "Henüz doğrulanmadı",
    "settings.yedekleme.changes": "Yedeksiz değişiklik",
    "settings.yedekleme.changesN": "{n} değişiklik",
    "settings.yedekleme.decision": "Son karar",
    "settings.yedekleme.noDecision": "Henüz karar kaydı yok",
    "settings.yedekleme.decTaken": "Yedek alındı",
    "settings.yedekleme.decSkipped": "Yedek atlandı",
    "settings.yedekleme.rule": "Kural",
    "settings.yedekleme.ruleText": "{n} değişiklik ve {m} dk sakinlik",
    "settings.yedekleme.runRow": "Şimdi yedek al",
    "settings.yedekleme.runDesc": "Yeni bir yedek klasörü yazılır; önce onayınız istenir. Eski yedekler silinmez.",
    "settings.yedekleme.runBtn": "Şimdi yedek al",
    "settings.yedekleme.runBusy": "Yedek alınıyor…",
    "settings.yedekleme.runNoAction": "Yedek alma eylemi kullanılamıyor.",
    "settings.yedekleme.ago.under1": "1 saatten kısa süre önce",
    "settings.yedekleme.ago.hours": "{n} saat önce",
    "settings.yedekleme.ago.days": "{n} gün önce",
    "settings.yedekleme.w.backup_failed": "Yedek başarısız",
    "settings.yedekleme.w.verify_failed": "Yedek doğrulaması başarısız",
    "settings.yedekleme.w.stale_with_activity": "Yedek eski, değişiklik var",
    "settings.yedekleme.w.scheduler_error": "Zamanlayıcı hatası",

    "settings.gorunum.title": "Görünüm",
    "settings.gorunum.desc": "Tema ve yoğunluk. Seçim bu tarayıcıda hatırlanır.",
    "settings.gorunum.themeRow": "Tema",
    "settings.gorunum.themeDesc": "Koyu, açık ya da sistem tercihini izle.",
    "settings.gorunum.themeGroup": "Tema seçimi",
    "settings.gorunum.dark": "Koyu",
    "settings.gorunum.light": "Açık",
    "settings.gorunum.system": "Sistem",
    "settings.gorunum.complexity": "Arayüz karmaşıklığı",
    "settings.gorunum.complexityGroup": "Arayüz karmaşıklığı: Basit ya da Gelişmiş",
    "settings.gorunum.complexityDesc": "Basit: laboratuvar, sistem analitiği, eylem anlamları ve kayıt defteri gibi gelişmiş bölümler tek satıra daralır (Göster ile açılır). Gelişmiş (varsayılan): her bölüm açık. Yetenekler menüsü ve komut paleti her zaman tamdır.",
    "settings.gorunum.simple": "Basit",
    "settings.gorunum.advanced": "Gelişmiş",
    "settings.gorunum.density": "Sıkı yoğunluk",
    "settings.gorunum.densityDesc": "Listelerde ve sohbette satır aralarını daraltır.",

    "settings.sistem.title": "Sistem",
    "settings.sistem.desc": "Sürüm, sunucu sağlığı ve çalışma klasörleri. Belirteç ve anahtarlar burada asla gösterilmez.",
    "settings.sistem.versionBlock": "Sürüm",
    "settings.sistem.version": "Uygulama sürümü",
    "settings.sistem.latest": "Güncelleme durumu",
    "settings.sistem.healthBlock": "Sunucu sağlığı",
    "settings.sistem.health": "Genel durum",
    "settings.sistem.healthChecks": "Denetimler",
    "settings.sistem.colCheck": "Denetim",
    "settings.sistem.colResult": "Sonuç",
    "settings.sistem.checkOk": "tamam",
    "settings.sistem.checkBad": "sorun",
    "settings.sistem.noChecks": "Sunucu denetim sonucu bildirmedi.",
    "settings.sistem.dirsBlock": "Çalışma klasörleri",
    "settings.sistem.noDirs": "Sunucu klasör bilgisi bildirmedi.",
    "settings.sistem.notReported": "bildirilmedi",

    "settings.kasa.title": "Kasa ve dosyalar",
    "settings.kasa.desc": "Not kasası, yedek ve veri klasörleri (salt okunur).",
    "settings.kasa.note": "Notlar yalnız Obsidian'da tutulur; bu arayüz kasaya yazmaz. Silme kararı yalnız Yusuf'undur ve yalnız Geri Dönüşüm Kutusu'na taşıyarak yapılır.",
    "settings.kasa.noDirs": "Sunucu kasa ya da dosya klasörü bildirmedi.",
    "settings.kasa.dirsBlock": "Klasörler",

    "settings.gelistirici.title": "Geliştirici",
    "settings.gelistirici.desc": "Denetim kaydından son olaylar (salt okunur). Ham belirteç ve anahtar gösterilmez.",
    "settings.gelistirici.none": "Denetim kaydı henüz yok ya da sunucudan alınamadı.",
    "settings.gelistirici.caption": "Son denetim olayları",
    "settings.gelistirici.colTime": "Zaman",
    "settings.gelistirici.colEvent": "Olay",
    "settings.gelistirici.colActor": "Aktör",
    "settings.gelistirici.colTarget": "Hedef",
    "settings.gelistirici.moreRow": "Tam denetim kaydı",
    "settings.gelistirici.moreDesc": "Proje ayarlarındaki Hata ayıklama sayfasında tüm olayları görürsünüz.",
    "settings.gelistirici.openDebug": "Hata ayıklamayı aç",
    "settings.nav.internet": "İnternet erişimi",
    "settings.internet.title": "İnternet erişimi",
    "settings.internet.desc": "Uygulamanın internete çıkıp çıkmayacağını burada siz belirlersiniz. Varsayılan KAPALIDIR.",
    "settings.internet.statusBlock": "Durum",
    "settings.internet.status": "Geçerli durum",
    "settings.internet.statusOn": "Açık",
    "settings.internet.statusOff": "Kapalı",
    "settings.internet.loading": "Ayarlar yükleniyor; bu sırada internet kapalı sayılır.",
    "settings.internet.loadErr": "Ayarlar sunucudan okunamadı ({reason}); internet kapalı sayılır.",
    "settings.internet.explain": "Kapalıyken uygulama internete HİÇ çıkmaz. Açıkken yalnız aşağıdaki alan adlarına, kullanıcı isteğiyle, ücretsiz kamuya açık sayfaları GET ile getirir; içerik güvenilmez veri sayılır.",
    "settings.internet.howTo": "Etkinleştirmek için anahtarı açın, en az bir alan adı ekleyin ve Kaydet'e basın.",
    "settings.internet.configBlock": "Ayar",
    "settings.internet.enable": "İnternet erişimi",
    "settings.internet.enableDesc": "Açık ya da kapalı. Kaydedene kadar değişiklik geçerli olmaz.",
    "settings.internet.perUse": "Her kullanımda onay iste",
    "settings.internet.perUseDesc": "Varsayılan açıktır: her getirme için size ayrıca sorulur.",
    "settings.internet.perUseWarn": "Dikkat: Bunu kapatmak, listedeki alan adları için açık onaylı kapsam verir; getirmeler her seferinde sorulmadan yapılabilir. Yalnız güvendiğiniz alan adlarıyla kapatın.",
    "settings.internet.domainsBlock": "İzinli alan adları",
    "settings.internet.domainsDesc": "Yalnız bu alan adlarına çıkılabilir ({n} / 50). Örnek: docs.python.org ya da *.wikipedia.org (yalnız alt alan adları). IP adresi, localhost, .local ve tek etiketli adlar eklenemez.",
    "settings.internet.noDomains": "Henüz izinli alan adı yok.",
    "settings.internet.remove": "Kaldır",
    "settings.internet.removeFor": "{ad} alan adını kaldır",
    "settings.internet.addRow": "Alan adı ekle",
    "settings.internet.addHint": "Adres ya da yol değil, yalnız alan adı yazın.",
    "settings.internet.addLabel": "Eklenecek alan adı",
    "settings.internet.addPh": "docs.python.org",
    "settings.internet.add": "Ekle",
    "settings.internet.errEmpty": "Önce bir alan adı yazın.",
    "settings.internet.errMax": "En çok 50 alan adı eklenebilir.",
    "settings.internet.errBad": "Alan adı geçersiz.",
    "settings.internet.saveBlock": "Kaydet",
    "settings.internet.needDomain": "İnternet erişimini açmak için en az bir izinli alan adı ekleyin.",
    "settings.internet.saveRow": "Ayarları kaydet",
    "settings.internet.saveDesc": "Önce ne değişeceği gösterilen bir onay penceresi açılır.",
    "settings.internet.save": "Kaydet",
    "settings.internet.saving": "Kaydediliyor…",
    "settings.internet.saved": "Ayarlar kaydedildi.",
    "settings.internet.fetchBlock": "Son getirmeler",
    "settings.internet.fetchDesc": "Yalnız zaman, alan adı, durum, bayt ve sonuç gösterilir; adres yolu ve içerik gösterilmez.",
    "settings.internet.fetchLoading": "Getirme kaydı yükleniyor…",
    "settings.internet.fetchErr": "Getirme kaydı okunamadı ({reason}).",
    "settings.internet.fetchNone": "Henüz getirme yok.",
    "settings.internet.fetchCaption": "Son internet getirmeleri",
    "settings.internet.colTime": "Zaman",
    "settings.internet.colHost": "Alan adı",
    "settings.internet.colStatus": "Durum",
    "settings.internet.colBytes": "Bayt",
    "settings.internet.colOutcome": "Sonuç",
    "settings.internet.badHost": "(geçersiz ad)"
  };

  var regError = "";
  try {
    if (typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("settings", TR);
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

  // Her UTF-16 birimi için tek birim üretir (uzunluk korunur); Türkçe harfler ASCII karşılığına, hepsi küçük harfe.
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

  // Boş sorgu her şeyle eşleşir; birden çok sözcük varsa hepsi geçmelidir.
  function matches(text, q) {
    var nq = normalizeQuery(q);
    if (!nq) return true;
    var hay = fold(text);
    var parts = nq.split(" ");
    for (var i = 0; i < parts.length; i += 1) {
      if (hay.indexOf(parts[i]) === -1) return false;
    }
    return true;
  }

  var GROUPS = [
    { id: "settings", labelKey: "settings.group.settings", items: [
      { id: "genel", icon: "gear", labelKey: "settings.nav.genel" },
      { id: "saglayicilar", icon: "globe", labelKey: "settings.nav.saglayicilar" },
      { id: "guvenlik", icon: "shield", labelKey: "settings.nav.guvenlik" },
      { id: "bellek", icon: "brain", labelKey: "settings.nav.bellek" },
      { id: "beceriler", icon: "spark", labelKey: "settings.nav.beceriler" },
      { id: "yedekleme", icon: "database", labelKey: "settings.nav.yedekleme" },
      { id: "gorunum", icon: "grid", labelKey: "settings.nav.gorunum" },
      { id: "internet", icon: "globe", labelKey: "settings.nav.internet" }
    ] },
    { id: "computer", labelKey: "settings.group.computer", items: [
      { id: "sistem", icon: "info", labelKey: "settings.nav.sistem" },
      { id: "kasa", icon: "folder", labelKey: "settings.nav.kasa" },
      { id: "gelistirici", icon: "code", labelKey: "settings.nav.gelistirici" }
    ] },
    { id: "help", labelKey: "settings.group.help", items: [
      { id: "egitim", icon: "book", labelKey: "settings.nav.egitim" },
      { id: "kisayollar", icon: "keyboard", labelKey: "settings.nav.kisayollar" },
      { id: "komutlar", icon: "chat", labelKey: "settings.nav.komutlar" },
      { id: "guvenlik-sinirlari", icon: "shield", labelKey: "settings.nav.guvenlik-sinirlari" },
      { id: "el-kitabi", icon: "doc", labelKey: "settings.nav.el-kitabi" }
    ] }
  ];

  var HELP_IDS = ["egitim", "kisayollar", "komutlar", "guvenlik-sinirlari", "el-kitabi"];
  var DOC_OF = { "egitim": "egitim", "el-kitabi": "el-kitabi", "guvenlik-sinirlari": "guvenlik" };

  function flattenNav(groups) {
    var out = [];
    (groups || []).forEach(function (g) { (g.items || []).forEach(function (it) { out.push(it.id); }); });
    return out;
  }

  var ALL_IDS = flattenNav(GROUPS);

  function isHelpSection(id) { return HELP_IDS.indexOf(id) !== -1; }

  // Çekirdek (core.js) ve kabuk İngilizce kimlikler de gönderebilir ("general", "help"…): bilinen takma adlar eşlenir.
  var SECTION_ALIAS = {
    general: "genel", providers: "saglayicilar", security: "guvenlik", memory: "bellek", skills: "beceriler", backup: "yedekleme",
    appearance: "gorunum", internet: "internet", network: "internet", web: "internet", system: "sistem", files: "kasa", vault: "kasa", developer: "gelistirici", help: "egitim",
    shortcuts: "kisayollar", commands: "komutlar", limits: "guvenlik-sinirlari", manual: "el-kitabi", handbook: "el-kitabi"
  };

  function normSection(id) {
    var s = String(id == null ? "" : id).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(SECTION_ALIAS, s)) s = SECTION_ALIAS[s];
    return ALL_IDS.indexOf(s) !== -1 ? s : "genel";
  }

  // textOf(düğüm): grup ya da öğe için aranabilir metin. Grup başlığı eşleşirse tüm grup kalır.
  function filterNav(groups, q, textOf) {
    var out = [];
    (groups || []).forEach(function (g) {
      if (!normalizeQuery(q)) { out.push({ id: g.id, labelKey: g.labelKey, items: g.items.slice() }); return; }
      var groupHit = matches(textOf(g), q);
      var items = g.items.filter(function (it) { return groupHit || matches(textOf(it), q); });
      if (items.length) out.push({ id: g.id, labelKey: g.labelKey, items: items });
    });
    return out;
  }

  // Ok tuşlarıyla görünür bölüm kimlikleri arasında dolaşım (uçlarda sarar).
  function moveSelection(ids, current, key) {
    if (!ids || !ids.length) return null;
    var i = ids.indexOf(current);
    if (key === "Home") return ids[0];
    if (key === "End") return ids[ids.length - 1];
    if (i === -1) return ids[0];
    if (key === "ArrowDown" || key === "ArrowRight") return ids[(i + 1) % ids.length];
    if (key === "ArrowUp" || key === "ArrowLeft") return ids[(i - 1 + ids.length) % ids.length];
    return current;
  }

  function count(v) {
    if (Array.isArray(v)) return v.length;
    if (typeof v === "number" && isFinite(v) && v >= 0) return Math.floor(v);
    return null;
  }

  // Politika özeti: yalnız sayılar ve eylem adları; klasör yolları dışarı çıkarılmaz.
  function policySummary(p) {
    if (!p || typeof p !== "object") return null;
    var allowed = Array.isArray(p.allowedActions) ? p.allowedActions : [];
    var need = Array.isArray(p.approvalRequiredActions) ? p.approvalRequiredActions : [];
    var seen = Object.create(null);
    var actions = [];
    allowed.concat(need).forEach(function (a) {
      var name = String(a == null ? "" : a).slice(0, 60);
      if (!name || seen[name]) return;
      seen[name] = true;
      actions.push({ name: name, approval: need.indexOf(a) !== -1 });
    });
    return {
      allowedDirs: count(p.allowedDirs),
      forbiddenDirs: count(p.forbiddenDirs),
      trustedRepos: count(p.trustedRepos),
      allowedProviders: count(p.allowedProviders),
      paidRoute: p.paidRoute === "approved" ? "approved" : (p.paidRoute === "none" ? "none" : null),
      expiresAt: typeof p.expiresAt === "string" ? p.expiresAt : null,
      actions: actions
    };
  }

  function memorySummary(m) {
    if (!m || typeof m !== "object") return null;
    var total = count(m.total != null ? m.total : m.records);
    return {
      total: total,
      valid: count(m.valid),
      stale: count(m.stale),
      updatedAt: typeof m.updatedAt === "string" ? m.updatedAt : null
    };
  }

  var TONE_OF = {
    ok: "ok", verified: "ok", available: "ok", ready: "ok", active: "ok", succeeded: "ok", approved: "ok", green: "ok", valid: "ok", healthy: "ok",
    partial: "warn", pending: "warn", review_due: "warn", running: "warn", awaiting_approval: "warn", unverified: "warn", at_risk: "warn", stale: "warn",
    failed: "bad", unavailable: "bad", denied: "bad", red: "bad", broken: "bad", error: "bad",
    cancelled: "muted", unsupported: "muted", unknown: "muted"
  };

  // Durum rengi tek ipucu değildir; çipte simge ve metin de bulunur. Bilinmeyen durum "muted".
  function stateTone(state) {
    var k = String(state == null ? "" : state).toLowerCase();
    return Object.prototype.hasOwnProperty.call(TONE_OF, k) ? TONE_OF[k] : "muted";
  }

  function countCaps(caps) {
    var c = { verified: 0, partial: 0, unverified: 0, unavailable: 0, unsupported: 0, other: 0 };
    (Array.isArray(caps) ? caps : []).forEach(function (x) {
      var s = String(x && x.status != null ? x.status : "").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(c, s) && s !== "other") c[s] += 1; else c.other += 1;
    });
    return c;
  }

  function providerLevel(caps) {
    if (!Array.isArray(caps) || !caps.length) return "unknown";
    var c = countCaps(caps);
    var usable = c.verified + c.partial + c.unverified;
    if (usable === 0) return "unavailable";
    if (c.verified === 0 && c.partial === 0) return "unverified";
    if (c.partial > 0 || c.unavailable > 0 || c.unsupported > 0) return "partial";
    return "ready";
  }

  function providerCounts(list) {
    var all = { verified: 0, partial: 0, unverified: 0, unavailable: 0, unsupported: 0 };
    (Array.isArray(list) ? list : []).forEach(function (p) {
      var c = countCaps(p && p.capabilities);
      Object.keys(all).forEach(function (k) { all[k] += c[k]; });
    });
    return all;
  }

  function taskCounts(tasks) {
    var r = { total: 0, waiting: 0, running: 0, failed: 0 };
    (Array.isArray(tasks) ? tasks : []).forEach(function (t) {
      r.total += 1;
      var s = t && t.state;
      if (s === "awaiting_approval") r.waiting += 1;
      else if (s === "running") r.running += 1;
      else if (s === "failed") r.failed += 1;
    });
    return r;
  }

  // Yalnız boşta ya da bitmiş, sabitlenmemiş, arşivlenmemiş alt oturumlar toplu arşive girer.
  function archivable(subs) {
    var ids = [];
    (Array.isArray(subs) ? subs : []).forEach(function (s) {
      if (!s || typeof s.id !== "string") return;
      if (s.archived || s.pinned) return;
      if (s.state === "idle" || s.state === "done") ids.push(s.id);
    });
    return ids;
  }

  function isConfirmed(r) {
    return r === true || !!(r && typeof r === "object" && r.confirmed === true);
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

  function isSecretName(name) {
    return /(KEY|TOKEN|SECRET|PASS|CREDENTIAL|AUTH|BEARER|COOKIE|SESSION|PRIVATE|CERT)/i.test(String(name == null ? "" : name));
  }

  var FILE_KINDS = ["vault", "kasa", "backup", "yedek", "data", "veri"];

  function splitDirs(dirs) {
    var work = [];
    var files = [];
    (Array.isArray(dirs) ? dirs : []).forEach(function (d) {
      if (!d || typeof d !== "object") return;
      var item = { label: String(d.label == null ? "" : d.label).slice(0, 120), path: scrubSecrets(String(d.path == null ? "" : d.path).slice(0, 400)), kind: String(d.kind == null ? "" : d.kind).toLowerCase() };
      if (!item.path) return;
      (FILE_KINDS.indexOf(item.kind) !== -1 ? files : work).push(item);
    });
    return { work: work, files: files };
  }

  function pad2(n) { return n < 10 ? "0" + n : String(n); }

  function fmtDateTime(iso) {
    var t = Date.parse(String(iso == null ? "" : iso));
    if (!isFinite(t)) return "—";
    var d = new Date(t);
    return pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "." + d.getFullYear() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  var DYNAMIC_KEYS = {
    genel: ["connected", "health", "tasks", "debt", "subsessions"],
    saglayicilar: ["providers"],
    guvenlik: ["policy"],
    bellek: ["memory"],
    beceriler: ["skills"],
    yedekleme: ["backup"],
    sistem: ["health", "system", "update"],
    kasa: ["system"],
    gelistirici: ["audit"]
  };

  // Bölümün yeniden çizilmesi gerekip gerekmediğini anlamak için küçük parmak izi (yoklama odağı bozmasın).
  function sectionSig(id, state, view) {
    var st = state && typeof state === "object" ? state : {};
    var vw = view && typeof view === "object" ? view : {};
    var parts = [id, String(vw.theme), String(vw.density), String(vw.complexity)];
    try {
      if (Object.prototype.hasOwnProperty.call(DOC_OF, id)) {
        var d = st.docs && st.docs[DOC_OF[id]];
        parts.push(d ? String(d.status) : "-", d && typeof d.text === "string" ? String(d.text.length) : "0");
      } else {
        var keys = Object.prototype.hasOwnProperty.call(DYNAMIC_KEYS, id) ? DYNAMIC_KEYS[id] : [];
        keys.forEach(function (k) { parts.push(JSON.stringify(st[k] === undefined ? null : st[k])); });
        if (id === "internet") {
          ["netSettings", "netFetches", "netSettingsSave"].forEach(function (k) { parts.push(JSON.stringify(st.data && st.data[k] !== undefined ? st.data[k] : null)); });
        }
      }
    } catch (e) {
      parts.push("?" + Math.random());
    }
    return parts.join("|");
  }

  // ---- Yedek durumu (saf yardımcılar) ----
  function bkClip(v, n) {
    var s = String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim();
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }
  function backupObj(b) { return b && typeof b === "object" && !Array.isArray(b) ? b : null; }
  // 'N saat önce' (tr-TR); 1 saatten azsa ve 48 saati aşınca farklı birim; bilinmeyen boş.
  function backupAgoText(hours) {
    var h = Number(hours);
    if (hours == null || hours === "" || !isFinite(h) || h < 0) return "";
    if (h < 1) return T("settings.yedekleme.ago.under1");
    if (h < 48) return T("settings.yedekleme.ago.hours", { n: Math.floor(h) });
    return T("settings.yedekleme.ago.days", { n: Math.floor(h / 24) });
  }
  var BK_CODES = { backup_failed: 1, verify_failed: 1, stale_with_activity: 1, scheduler_error: 1 };
  function backupWarnings(b) {
    var o = backupObj(b);
    if (!o || !Array.isArray(o.warnings)) return [];
    return o.warnings.filter(function (w) { return w && typeof w === "object"; }).slice(0, 10).map(function (w) {
      var code = bkClip(w.code, 40);
      return { code: code, title: Object.prototype.hasOwnProperty.call(BK_CODES, code) ? T("settings.yedekleme.w." + code) : (code || "?"), text: bkClip(w.text, 400) };
    });
  }
  function backupDirName(dir) {
    var parts = bkClip(dir, 200).split(/[\\/]+/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "";
  }
  function backupRuleText(cfg) {
    if (!cfg || typeof cfg !== "object") return "";
    var n = Number(cfg.minChanges), m = Number(cfg.idleMinutes);
    if (cfg.minChanges == null || cfg.idleMinutes == null || !isFinite(n) || !isFinite(m)) return "";
    return T("settings.yedekleme.ruleText", { n: Math.floor(n), m: Math.floor(m) });
  }
  function backupDecisionLabel(action) {
    var a = String(action == null ? "" : action).toLowerCase();
    if (a === "backup") return T("settings.yedekleme.decTaken");
    if (a === "skip") return T("settings.yedekleme.decSkipped");
    return bkClip(action, 30) || "?";
  }

  var pure = {
    backupAgoText: backupAgoText, backupWarnings: backupWarnings, backupDirName: backupDirName, backupRuleText: backupRuleText, backupDecisionLabel: backupDecisionLabel,
    fold: fold, normalizeQuery: normalizeQuery, matches: matches, GROUPS: GROUPS, HELP_IDS: HELP_IDS, DOC_OF: DOC_OF,
    flattenNav: flattenNav, isHelpSection: isHelpSection, normSection: normSection, filterNav: filterNav, moveSelection: moveSelection,
    policySummary: policySummary, memorySummary: memorySummary, stateTone: stateTone, countCaps: countCaps, providerLevel: providerLevel,
    providerCounts: providerCounts, taskCounts: taskCounts, archivable: archivable, isConfirmed: isConfirmed, scrubSecrets: scrubSecrets,
    isSecretName: isSecretName, SECTION_ALIAS: SECTION_ALIAS, splitDirs: splitDirs, fmtDateTime: fmtDateTime, sectionSig: sectionSig
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
    if (o.icon !== false) c.appendChild(icon(o.icon || TONE_ICON[t], 12));
    c.appendChild(el("span", "am-set-chip-t", text));
    if (o.title) c.setAttribute("title", String(o.title));
    return c;
  }

  function btn(label, onClick, kind, fkey) {
    var b = el("button", "am-set-btn" + (kind === "danger" ? " am-set-btn--danger" : ""), label);
    b.type = "button";
    if (fkey) b.setAttribute("data-fkey", fkey);
    b.addEventListener("click", onClick);
    return b;
  }

  function nodeFrom(v) {
    if (v && typeof v === "object" && v.nodeType) return v;
    return document.createTextNode(String(v == null ? "" : v));
  }

  // ------------------------------------------------------------------ durum
  var S = {
    AM: null, host: null, root: null, side: null, nav: null, search: null, content: null, live: null, closeBtn: null,
    net: { draft: null, baseSig: "", input: "", err: "", busy: false, asked: false },
    backupBusy: false, section: "genel", query: "", lastFocus: null, sigLast: "", visibleIds: [], navButtons: Object.create(null), liveTimer: 0
  };

  function announce(msg) {
    if (!S.live) return;
    S.live.textContent = String(msg);
    if (S.liveTimer) clearTimeout(S.liveTimer);
    S.liveTimer = setTimeout(function () { if (S.live) S.live.textContent = ""; }, 4000);
  }

  function copyText(AM, text, label) {
    var a = AM && AM.actions;
    if (!a || typeof a.copyText !== "function") { announce(T("settings.err.noAction")); return; }
    var r;
    try { r = a.copyText(text); } catch (e) { announce(T("settings.copyFail")); return; }
    Promise.resolve(r).then(function () { announce(label || T("settings.copied")); }, function () { announce(T("settings.copyFail")); });
  }

  function copyBtn(AM, text, fkey) {
    var b = el("button", "am-set-iconbtn");
    b.type = "button";
    b.setAttribute("aria-label", T("settings.copy"));
    b.setAttribute("title", T("settings.copy"));
    if (fkey) b.setAttribute("data-fkey", fkey);
    b.appendChild(icon("copy", 16));
    b.addEventListener("click", function () { copyText(AM, text); });
    return b;
  }

  function confirmDanger(opts, run) {
    var D = window.AM_DIALOG;
    if (!D || typeof D.confirm !== "function") { announce(T("settings.err.noDialog")); return; }
    var r;
    try { r = D.confirm({ title: opts.title, action: opts.action, target: opts.target, danger: true }); } catch (e) { announce(T("settings.err.noDialog")); return; }
    Promise.resolve(r).then(function (ok) { if (isConfirmed(ok)) run(); }, function () { announce(T("settings.err.noDialog")); });
  }

  function setView(AM, patch) {
    // Doğrulamalı yol AM.actions.setView'dir; yalnız o yoksa (ya da atarsa) doğrudan yazılır.
    var a = AM && AM.actions;
    if (a && typeof a.setView === "function") {
      try { a.setView(patch); } catch (e) { /* beyaz liste dışı/geçersiz değer: sessizce AM.view'a yazılmaz (doğrulamasız doğrudan yazma yolu kaldırıldı) */ }
    }
  }

  function closeSettings(AM) {
    var a = AM && AM.actions;
    if (a && typeof a.closeSettings === "function") { a.closeSettings(); return; }
    if (AM && AM.view) AM.view.settingsOpen = false;
    render(AM);
  }

  // ------------------------------------------------------------------ bileşenler (kalıplar)
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

  // Satır + düğme / anahtar / çip kalıbı: başlık+açıklama solda, denetim sağda.
  function row(parent, o) {
    var r = el("div", "am-set-row am-set-f" + (o.danger ? " am-set-row--danger" : ""));
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
    var n = el("div", "am-set-note am-set-f am-set-note--" + t);
    n.appendChild(icon(TONE_ICON[t], 16));
    n.appendChild(el("span", "am-set-note-t", text));
    parent.appendChild(n);
    return n;
  }

  function emptyCard(parent, text) {
    var n = el("div", "am-set-empty am-set-f", text);
    parent.appendChild(n);
    return n;
  }

  // Gerçek tablo: caption + th scope. cells: her hücre metin ya da düğüm; ilk hücre {name, sub} olabilir.
  function table(parent, o) {
    var wrap = el("div", "am-set-tablewrap");
    var t = el("table", "am-set-table");
    t.appendChild(el("caption", "am-set-sr", o.caption));
    var thead = el("thead");
    var htr = el("tr");
    o.cols.forEach(function (c, i) {
      var th = el("th", i === o.cols.length - 1 && o.lastRight ? "am-set-th am-set-th--right" : "am-set-th", c);
      th.setAttribute("scope", "col");
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    t.appendChild(thead);
    var tb = el("tbody");
    o.rows.forEach(function (cells) {
      var tr = el("tr", "am-set-tr am-set-f");
      cells.forEach(function (cell, i) {
        var td;
        if (i === 0) {
          td = el("th", "am-set-td am-set-td--name");
          td.setAttribute("scope", "row");
        } else {
          td = el("td", "am-set-td" + (i === cells.length - 1 && o.lastRight ? " am-set-td--right" : ""));
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

  function chipRow(chips) {
    var w = el("div", "am-set-chips");
    chips.forEach(function (c) { w.appendChild(c); });
    return w;
  }

  function switchCtl(o) {
    var b = el("button", "am-set-switch");
    b.type = "button";
    b.setAttribute("role", "switch");
    b.setAttribute("aria-checked", o.checked ? "true" : "false");
    b.setAttribute("aria-label", o.label);
    if (o.fkey) b.setAttribute("data-fkey", o.fkey);
    b.appendChild(el("span", "am-set-switch-thumb"));
    b.addEventListener("click", function () {
      var next = b.getAttribute("aria-checked") !== "true";
      b.setAttribute("aria-checked", next ? "true" : "false");
      o.onChange(next);
    });
    return b;
  }

  // Üç seçenekli grup (radiogroup): ok tuşları gezer ve seçer.
  function segmented(o) {
    var g = el("div", "am-set-seg");
    g.setAttribute("role", "radiogroup");
    g.setAttribute("aria-label", o.label);
    var btns = [];
    function paint(value) {
      btns.forEach(function (b, i) {
        var on = o.options[i].value === value;
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        b.className = "am-set-seg-btn" + (on ? " am-set-seg-btn--on" : "");
      });
    }
    o.options.forEach(function (opt, i) {
      var b = el("button", "am-set-seg-btn");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("data-fkey", "seg-" + opt.value);
      if (opt.icon) b.appendChild(icon(opt.icon, 14));
      b.appendChild(el("span", "am-set-seg-t", opt.label));
      b.addEventListener("click", function () { paint(opt.value); o.onChange(opt.value); });
      b.addEventListener("keydown", function (ev) {
        var k = ev.key;
        var d = (k === "ArrowRight" || k === "ArrowDown") ? 1 : ((k === "ArrowLeft" || k === "ArrowUp") ? -1 : 0);
        if (!d) return;
        ev.preventDefault();
        var n = (i + d + btns.length) % btns.length;
        paint(o.options[n].value);
        o.onChange(o.options[n].value);
        btns[n].focus();
      });
      btns.push(b);
      g.appendChild(b);
    });
    paint(o.value);
    return g;
  }

  function errorCard(parent, title, detail, onRetry) {
    var c = el("div", "am-set-errcard");
    c.setAttribute("role", "alert");
    c.appendChild(icon("alert", 18));
    var t = el("div", "am-set-errcard-body");
    t.appendChild(el("div", "am-set-row-title", title));
    if (detail) t.appendChild(el("div", "am-set-row-desc", detail));
    c.appendChild(t);
    if (onRetry) c.appendChild(btn(T("settings.err.retry"), onRetry, null, "retry"));
    parent.appendChild(c);
    return c;
  }

  // ------------------------------------------------------------------ bölümler
  function arr(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" ? v : {}; }
  function dash() { return T("settings.na"); }
  function countText(n) { return n == null ? dash() : String(n); }

  function secGenel(AM, c) {
    var st = obj(AM.state);
    pageHead(c, T("settings.genel.title"), T("settings.genel.desc"));
    var b = block(c, T("settings.genel.appBlock"));
    row(b, { title: T("settings.genel.name"), desc: T("app.name") + " · " + T("app.subtitle") });
    row(b, { title: T("settings.genel.mode"), desc: T("settings.genel.modeDesc"), ctl: chip(T("composer.model"), "info", { mono: false }) });
    row(b, { title: T("settings.genel.conn"), ctl: st.connected ? chip(T("settings.genel.connOk"), "ok") : chip(T("settings.genel.connBad"), "bad") });
    row(b, { title: T("settings.genel.updated"), ctl: el("span", "am-set-mono", fmtDateTime(st.updatedAt)) });

    var w = block(c, T("settings.genel.workBlock"));
    var tc = taskCounts(st.tasks);
    row(w, { title: T("settings.genel.tasks"), desc: T("settings.genel.tasksDesc", { total: tc.total, waiting: tc.waiting, running: tc.running, failed: tc.failed }) });
    row(w, { title: T("settings.genel.debt"), desc: T("settings.genel.debtDesc", { n: arr(st.debt).length }) });

    var p = block(c, T("settings.genel.projectBlock"));
    function openProject(page) {
      var a = AM.actions;
      if (!a || typeof a.openProjectSettings !== "function") { announce(T("settings.err.noAction")); return; }
      if (typeof a.closeSettings === "function") a.closeSettings();
      a.openProjectSettings(page);
    }
    row(p, { title: T("settings.genel.projectRow"), desc: T("settings.genel.projectRowDesc"), ctl: btn(T("settings.genel.openProject"), function () { openProject("genel"); }, null, "open-project") });
    row(p, { title: T("settings.genel.usageRow"), desc: T("settings.genel.usageRowDesc"), ctl: btn(T("settings.genel.openUsage"), function () { openProject("kullanim"); }, null, "open-usage") });

    var s = block(c, T("settings.genel.subBlock"));
    var ids = archivable(st.subsessions);
    var canArchive = AM.actions && typeof AM.actions.archiveSubsession === "function";
    if (ids.length && canArchive) {
      row(s, {
        danger: true,
        title: T("settings.genel.archiveRow"),
        desc: T("settings.genel.archiveDesc", { n: ids.length }),
        ctl: btn(T("settings.genel.archiveBtn"), function () {
          confirmDanger({ title: T("settings.genel.archiveTitle"), action: T("settings.genel.archiveAction"), target: T("settings.genel.archiveTarget", { n: ids.length }) }, function () {
            var done = 0;
            var failed = 0;
            ids.reduce(function (chain, id) {
              return chain.then(function () {
                return Promise.resolve(AM.actions.archiveSubsession(id, true)).then(function () { done += 1; }, function () { failed += 1; });
              });
            }, Promise.resolve()).then(function () {
              announce(T("settings.genel.archiveDone", { n: done }) + (failed ? " " + T("settings.genel.archiveFail", { n: failed }) : ""));
            });
          });
        }, "danger", "archive-all")
      });
    } else {
      row(s, { title: T("settings.genel.archiveRow"), desc: T("settings.genel.archiveNone") });
    }
  }

  function levelTone(level) {
    return level === "ready" ? "ok" : (level === "unavailable" ? "bad" : (level === "unknown" ? "muted" : "warn"));
  }

  function secSaglayicilar(AM, c) {
    var list = arr(AM.state && AM.state.providers);
    pageHead(c, T("settings.saglayicilar.title"), T("settings.saglayicilar.desc"));
    var cn = providerCounts(list);
    var sum = block(c);
    sum.appendChild(el("p", "am-set-summary am-set-f", T("providers.counts", cn)));
    note(sum, T("providers.noFallback"), "warn");
    if (!list.length) { emptyCard(c, T("cards.emptyProviders")); return; }
    var rows = list.map(function (p) {
      var level = providerLevel(p.capabilities);
      var chips = [];
      if (level === "unavailable") chips.push(chip(T("providers.unavailable"), "bad"));
      else if (level === "ready") chips.push(chip(T("providers.available"), "ok"));
      else if (level === "partial") chips.push(chip(T("providers.partial"), "warn"));
      else chips.push(chip(T("settings.saglayicilar.level." + level), levelTone(level)));
      arr(p.capabilities).forEach(function (cap) {
        chips.push(chip(String(cap.operation) + ": " + String(cap.status), stateTone(cap.status), { mono: true }));
      });
      return [
        { name: p.displayName || p.id, sub: T("settings.saglayicilar.route", { route: p.routeKind || dash() }) },
        chipRow(chips)
      ];
    });
    table(c, { caption: T("settings.saglayicilar.capsCaption"), cols: [T("settings.saglayicilar.colName"), T("settings.saglayicilar.colCaps")], rows: rows });
  }

  function secGuvenlik(AM, c) {
    pageHead(c, T("settings.guvenlik.title"), T("settings.guvenlik.desc"));
    note(c, T("settings.guvenlik.note"), "info");
    var s = policySummary(AM.state && AM.state.policy);
    if (!s) { emptyCard(c, T("settings.guvenlik.none")); return; }
    var b = block(c, T("settings.guvenlik.dirsBlock"));
    function numRow(k) {
      row(b, { title: T("settings.guvenlik." + k), desc: T("settings.guvenlik." + k + "Desc"), ctl: el("span", "am-set-num", countText(s[k])) });
    }
    numRow("allowedDirs");
    numRow("forbiddenDirs");
    numRow("trustedRepos");
    numRow("allowedProviders");
    row(b, { title: T("settings.guvenlik.paid"), ctl: s.paidRoute === null ? el("span", "am-set-mono", dash()) : (s.paidRoute === "approved" ? chip(T("settings.guvenlik.paidApproved"), "warn") : chip(T("settings.guvenlik.paidNone"), "ok")) });
    row(b, { title: T("settings.guvenlik.expires"), ctl: el("span", "am-set-mono", fmtDateTime(s.expiresAt)) });
    var a = block(c, T("settings.guvenlik.actionsBlock"), T("settings.guvenlik.actionsDesc"));
    if (!s.actions.length) { emptyCard(a, T("settings.guvenlik.noActions")); return; }
    table(a, {
      caption: T("settings.guvenlik.actionsCaption"),
      cols: [T("settings.guvenlik.colAction"), T("settings.guvenlik.colStatus")],
      lastRight: true,
      rows: s.actions.map(function (x) {
        return [
          { name: x.name },
          x.approval ? chip(T("settings.guvenlik.needApproval"), "warn", { icon: "shield" }) : chip(T("settings.guvenlik.allowed"), "ok")
        ];
      })
    });
  }

  function secBellek(AM, c) {
    pageHead(c, T("settings.bellek.title"), T("settings.bellek.desc"));
    var m = memorySummary(AM.state && AM.state.memory);
    if (!m) { emptyCard(c, T("settings.bellek.none")); return; }
    var b = block(c);
    row(b, { title: T("settings.bellek.total"), ctl: el("span", "am-set-num", countText(m.total)) });
    row(b, { title: T("settings.bellek.valid"), ctl: m.valid == null ? el("span", "am-set-mono", dash()) : chip(String(m.valid), "ok") });
    row(b, { title: T("settings.bellek.stale"), desc: T("settings.bellek.staleDesc"), ctl: m.stale == null ? el("span", "am-set-mono", dash()) : chip(String(m.stale), m.stale > 0 ? "warn" : "ok") });
    row(b, { title: T("settings.bellek.updated"), ctl: el("span", "am-set-mono", fmtDateTime(m.updatedAt)) });
  }

  function secBeceriler(AM, c) {
    pageHead(c, T("settings.beceriler.title"), T("settings.beceriler.desc"));
    var list = arr(AM.state && AM.state.skills);
    if (!list.length) { emptyCard(c, T("cards.emptySkills")); return; }
    table(c, {
      caption: T("settings.beceriler.caption"),
      cols: [T("settings.beceriler.colName"), T("settings.guvenlik.colStatus")],
      lastRight: true,
      rows: list.map(function (s) {
        return [
          { name: s.name || s.id, sub: s.riskClass ? T("skill.risk", { risk: s.riskClass }) : "" },
          chip(String(s.state || dash()), stateTone(s.state))
        ];
      })
    });
  }

  // 'Şimdi yedek al': onay penceresi çekirdekte (AM.actions.runBackup); çalışırken düğme devre dışı, ikinci tıklama yok sayılır.
  function runBackupNow(AM) {
    if (S.backupBusy) return;
    var a = AM && AM.actions;
    if (!a || typeof a.runBackup !== "function") { announce(T("settings.yedekleme.runNoAction")); return; }
    S.backupBusy = true;
    renderContent(AM, true);
    function done() { S.backupBusy = false; renderContent(AM, true); }
    var r;
    try { r = a.runBackup(); } catch (e) { done(); announce(T("settings.err.noAction")); return; }
    Promise.resolve(r).then(done, done);
  }

  function backupStatusBlock(AM, c) {
    var b = block(c, T("settings.yedekleme.statusBlock"));
    var o = backupObj(AM.state && AM.state.backup);
    if (!o) {
      var un = note(b, T("settings.yedekleme.unavailableTitle") + ". " + T("settings.yedekleme.unavailableHint"), "bad");
      un.setAttribute("role", "status");
    } else {
      backupWarnings(o).forEach(function (w) {
        var n = note(b, w.title + (w.text ? ": " + w.text : ""), "warn");
        n.setAttribute("role", "status");
        n.className += " am-set-bkwarn";
      });
      var lb = backupObj(o.lastBackup);
      if (lb) {
        var parts = [fmtDateTime(lb.at), backupAgoText(o.ageHours)].filter(function (x) { return x && x !== "—"; }).join(" · ");
        var dn = backupDirName(lb.dir);
        row(b, { title: T("settings.yedekleme.lastBackup"), desc: (parts || "—") + (dn ? " · " + T("settings.yedekleme.folder", { dir: dn }) : "") });
      } else row(b, { title: T("settings.yedekleme.lastBackup"), desc: T("settings.yedekleme.noBackup") });
      var lv = backupObj(o.lastVerify);
      if (lv) {
        var okv = lv.ok === true;
        var vr = row(b, {
          title: T("settings.yedekleme.verify"), desc: fmtDateTime(lv.at),
          ctl: chip(okv ? T("settings.yedekleme.verifyOk") : T("settings.yedekleme.verifyFail"), okv ? "ok" : "bad")
        });
        if (!okv) {
          var main = vr.children[0];
          arr(lv.problems).slice(0, 10).forEach(function (p) { main.appendChild(el("div", "am-set-row-desc", bkClip(p, 300))); });
        }
      } else row(b, { title: T("settings.yedekleme.verify"), desc: T("settings.yedekleme.noVerify") });
      var ch = Number(o.changesSince);
      row(b, { title: T("settings.yedekleme.changes"), desc: T("settings.yedekleme.changesN", { n: isFinite(ch) && ch > 0 ? Math.floor(ch) : 0 }) });
      var ld = backupObj(o.lastDecision);
      if (ld) row(b, { title: T("settings.yedekleme.decision"), desc: [backupDecisionLabel(ld.action), bkClip(ld.reason, 300)].filter(Boolean).join(": ") + " · " + fmtDateTime(ld.at) });
      else row(b, { title: T("settings.yedekleme.decision"), desc: T("settings.yedekleme.noDecision") });
      var rule = backupRuleText(o.config);
      if (rule) row(b, { title: T("settings.yedekleme.rule"), desc: rule });
    }
    note(b, T("settings.yedekleme.policy"), "info");
    var ctl = el("div", "am-set-bkactions");
    var rb = btn(S.backupBusy ? T("settings.yedekleme.runBusy") : T("settings.yedekleme.runBtn"), function () { runBackupNow(AM); }, null, "run-backup");
    if (S.backupBusy) { rb.disabled = true; rb.setAttribute("aria-busy", "true"); }
    ctl.appendChild(rb);
    row(b, { title: T("settings.yedekleme.runRow"), desc: T("settings.yedekleme.runDesc"), ctl: ctl });
  }

  function secYedekleme(AM, c) {
    pageHead(c, T("settings.yedekleme.title"), T("settings.yedekleme.desc"));
    backupStatusBlock(AM, c);
    var i = block(c, T("settings.yedekleme.infoBlock"));
    ["info1", "info2", "info3"].forEach(function (k) { note(i, T("settings.yedekleme." + k), "info"); });
    var b = block(c, T("settings.yedekleme.cmdBlock"));
    [
      ["cmdMake", "npm run yedek -- yedekle"],
      ["cmdCheck", "npm run yedek -- dogrula <yedek-klasörü>"],
      ["cmdRestore", "npm run yedek -- geri-yukle <yedek> <YENİ-klasör>"]
    ].forEach(function (x) {
      var ctl = el("div", "am-set-cmd");
      ctl.appendChild(el("code", "am-set-code", x[1]));
      ctl.appendChild(copyBtn(AM, x[1], "copy-" + x[0]));
      row(b, { title: T("settings.yedekleme." + x[0]), desc: T("settings.yedekleme." + x[0] + "Desc"), ctl: ctl }).classList.add("am-set-row--stack");
    });
  }

  // ---- İnternet erişimi (D8c) ----
  // VARSAYILAN KAPALI. Değişiklik yalnız bu bölümden, AM.actions.netSettingsSave ile (onay penceresi çekirdekte). Getirme tablosu URL yolu/içerik GÖSTERMEZ.
  // Taslak (S.net) sunucu ayarı değişince sunucudan yeniden kurulur; kaydedilmemiş değişiklik "Kaydet"e basılana kadar geçerli değildir.
  var NET_HOST_RE = /^[a-z0-9.*-]{1,100}$/;
  function netData(AM, key) {
    var d = AM && AM.state && AM.state.data && typeof AM.state.data === "object" ? AM.state.data[key] : undefined;
    return d && typeof d === "object" ? d : null;
  }
  function netServer(AM) {
    var d = netData(AM, "netSettings");
    var s = d && d.status === "ok" && d.value && typeof d.value === "object" && d.value.settings && typeof d.value.settings === "object" ? d.value.settings : null;
    if (!s) return null;
    return { enabled: s.enabled === true, perUseApproval: s.perUseApproval !== false, allowedDomains: arr(s.allowedDomains).filter(function (x) { return typeof x === "string"; }).slice(0, 50) };
  }
  function netEnsureDraft(AM) {
    var sv = netServer(AM);
    var sig = sv ? JSON.stringify(sv) : "";
    if (!S.net.draft || (sv && S.net.baseSig !== sig)) {
      S.net.baseSig = sig;
      S.net.draft = sv ? { enabled: sv.enabled, perUseApproval: sv.perUseApproval, domains: sv.allowedDomains.slice() } : { enabled: false, perUseApproval: true, domains: [] };
    }
    return S.net.draft;
  }
  function netRerender(AM) { renderContent(AM, true); }
  function netAddDomain(AM) {
    var dr = netEnsureDraft(AM);
    var raw = S.net.input;
    S.net.err = "";
    if (String(raw).trim() === "") { S.net.err = T("settings.internet.errEmpty"); netRerender(AM); return; }
    if (dr.domains.length >= 50) { S.net.err = T("settings.internet.errMax"); netRerender(AM); return; }
    var a = AM && AM.actions;
    var value = String(raw).trim().toLowerCase();
    if (a && typeof a.netDomainCheck === "function") {
      var chk = a.netDomainCheck(raw);
      if (!chk || chk.ok !== true) { S.net.err = chk && chk.message ? String(chk.message).slice(0, 300) : T("settings.internet.errBad"); netRerender(AM); return; }
      value = String(chk.value);
    }
    if (dr.domains.indexOf(value) < 0) dr.domains.push(value);
    S.net.input = "";
    netRerender(AM);
  }
  function netSave(AM) {
    if (S.net.busy) return;
    var dr = netEnsureDraft(AM);
    if (dr.enabled && dr.domains.length === 0) return; // boş listeyle açma engelli (düğme de pasiftir)
    var a = AM && AM.actions;
    if (!a || typeof a.netSettingsSave !== "function") { announce(T("settings.err.noAction")); return; }
    S.net.busy = true;
    netRerender(AM);
    function done() { S.net.busy = false; S.net.baseSig = ""; netRerender(AM); }
    var r;
    try { r = a.netSettingsSave({ enabled: dr.enabled, allowedDomains: dr.domains.slice(), perUseApproval: dr.perUseApproval }); } catch (e) { done(); announce(T("settings.err.noAction")); return; }
    Promise.resolve(r).then(done, done);
  }
  function netFetchRows(AM) {
    var d = netData(AM, "netFetches");
    var list = d && d.status === "ok" && d.value && Array.isArray(d.value.fetches) ? d.value.fetches : [];
    return list.slice(0, 100).filter(function (f) { return f && typeof f === "object"; }).map(function (f) {
      var host = typeof f.host === "string" && NET_HOST_RE.test(f.host) ? f.host : T("settings.internet.badHost");
      var st = Number(f.status), by = Number(f.bytes);
      return [fmtDateTime(f.ts), host, isFinite(st) && f.status !== null ? String(Math.floor(st)) : dash(), isFinite(by) && f.bytes !== null ? String(Math.floor(by)) : dash(), bkClip(f.outcome, 80) || dash()];
    });
  }

  function secInternet(AM, c) {
    pageHead(c, T("settings.internet.title"), T("settings.internet.desc"));
    var dr = netEnsureDraft(AM);
    var sv = netServer(AM);
    var ds = netData(AM, "netSettings");
    var st = block(c, T("settings.internet.statusBlock"));
    var on = !!(sv && sv.enabled);
    row(st, { title: T("settings.internet.status"), ctl: chip(on ? T("settings.internet.statusOn") : T("settings.internet.statusOff"), on ? "warn" : "ok") });
    if (!ds || ds.status === "loading") note(st, T("settings.internet.loading"), "info").setAttribute("role", "status");
    else if (ds.status === "error") note(st, T("settings.internet.loadErr", { reason: bkClip(ds.reason, 200) || dash() }), "bad").setAttribute("role", "status");
    note(st, T("settings.internet.explain"), "info");
    note(st, T("settings.internet.howTo"), "info");

    var cf = block(c, T("settings.internet.configBlock"));
    row(cf, {
      title: T("settings.internet.enable"), desc: T("settings.internet.enableDesc"),
      ctl: switchCtl({ label: T("settings.internet.enable"), checked: dr.enabled, fkey: "net-enable", onChange: function (v) { dr.enabled = v; S.net.err = ""; netRerender(AM); } })
    });
    row(cf, {
      title: T("settings.internet.perUse"), desc: T("settings.internet.perUseDesc"),
      ctl: switchCtl({ label: T("settings.internet.perUse"), checked: dr.perUseApproval, fkey: "net-peruse", onChange: function (v) { dr.perUseApproval = v; netRerender(AM); } })
    });
    if (!dr.perUseApproval) note(cf, T("settings.internet.perUseWarn"), "warn");

    var dm = block(c, T("settings.internet.domainsBlock"), T("settings.internet.domainsDesc", { n: dr.domains.length }));
    if (!dr.domains.length) emptyCard(dm, T("settings.internet.noDomains"));
    dr.domains.forEach(function (d, i) {
      var rm = btn(T("settings.internet.remove"), function () { dr.domains.splice(i, 1); netRerender(AM); }, null, "net-del-" + i);
      rm.setAttribute("aria-label", T("settings.internet.removeFor", { ad: d }));
      row(dm, { title: d, ctl: rm });
    });
    var add = el("div", "am-set-netadd");
    var inp = el("input", "am-set-input");
    inp.type = "text";
    inp.setAttribute("aria-label", T("settings.internet.addLabel"));
    inp.setAttribute("placeholder", T("settings.internet.addPh"));
    inp.setAttribute("autocomplete", "off");
    inp.setAttribute("spellcheck", "false");
    inp.setAttribute("maxlength", "100");
    inp.setAttribute("data-fkey", "net-input");
    inp.value = S.net.input;
    inp.addEventListener("input", function () { S.net.input = String(inp.value); });
    inp.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); S.net.input = String(inp.value); netAddDomain(AM); } });
    add.appendChild(inp);
    add.appendChild(btn(T("settings.internet.add"), function () { S.net.input = String(inp.value); netAddDomain(AM); }, null, "net-add"));
    row(dm, { title: T("settings.internet.addRow"), desc: T("settings.internet.addHint"), ctl: add }).classList.add("am-set-row--stack");
    if (S.net.err) note(dm, S.net.err, "bad").setAttribute("role", "alert");

    var sb = block(c, T("settings.internet.saveBlock"));
    var blocked = dr.enabled && dr.domains.length === 0;
    if (blocked) note(sb, T("settings.internet.needDomain"), "warn");
    var save = btn(S.net.busy ? T("settings.internet.saving") : T("settings.internet.save"), function () { netSave(AM); }, null, "net-save");
    if (S.net.busy || blocked) { save.disabled = true; if (S.net.busy) save.setAttribute("aria-busy", "true"); }
    row(sb, { title: T("settings.internet.saveRow"), desc: T("settings.internet.saveDesc"), ctl: save });
    var res = netData(AM, "netSettingsSave");
    if (res && res.status === "error") note(sb, bkClip(res.reason, 300), "bad").setAttribute("role", "alert");
    else if (res && res.status === "ok") note(sb, T("settings.internet.saved"), "ok").setAttribute("role", "status");

    var fb = block(c, T("settings.internet.fetchBlock"), T("settings.internet.fetchDesc"));
    var fd = netData(AM, "netFetches");
    if (!fd || fd.status === "loading") emptyCard(fb, T("settings.internet.fetchLoading"));
    else if (fd.status === "error") note(fb, T("settings.internet.fetchErr", { reason: bkClip(fd.reason, 200) || dash() }), "bad");
    else {
      var rows = netFetchRows(AM);
      if (!rows.length) emptyCard(fb, T("settings.internet.fetchNone"));
      else table(fb, { caption: T("settings.internet.fetchCaption"), cols: [T("settings.internet.colTime"), T("settings.internet.colHost"), T("settings.internet.colStatus"), T("settings.internet.colBytes"), T("settings.internet.colOutcome")], rows: rows });
    }
  }

  function secGorunum(AM, c) {
    pageHead(c, T("settings.gorunum.title"), T("settings.gorunum.desc"));
    var view = obj(AM.view);
    var theme = view.theme === "light" || view.theme === "system" ? view.theme : "dark";
    var b = block(c);
    row(b, {
      title: T("settings.gorunum.themeRow"), desc: T("settings.gorunum.themeDesc"),
      ctl: segmented({
        label: T("settings.gorunum.themeGroup"), value: theme,
        options: [
          { value: "dark", label: T("settings.gorunum.dark") },
          { value: "light", label: T("settings.gorunum.light") },
          { value: "system", label: T("settings.gorunum.system") }
        ],
        onChange: function (v) { setView(AM, { theme: v }); }
      })
    });
    var cx = view.complexity === "simple" ? "simple" : "advanced";
    row(b, {
      title: T("settings.gorunum.complexity"), desc: T("settings.gorunum.complexityDesc"),
      ctl: segmented({
        label: T("settings.gorunum.complexityGroup"), value: cx,
        options: [
          { value: "simple", label: T("settings.gorunum.simple") },
          { value: "advanced", label: T("settings.gorunum.advanced") }
        ],
        onChange: function (v) { setView(AM, { complexity: v === "simple" ? "simple" : "advanced" }); }
      })
    });
  }

  function dirRows(parent, dirs, AM) {
    dirs.forEach(function (d, i) {
      var ctl = el("div", "am-set-cmd");
      ctl.appendChild(el("code", "am-set-code", d.path));
      ctl.appendChild(copyBtn(AM, d.path, "copy-dir-" + i));
      row(parent, { title: d.label || d.kind || dash(), ctl: ctl }).classList.add("am-set-row--stack");
    });
  }

  function secSistem(AM, c) {
    var st = obj(AM.state);
    pageHead(c, T("settings.sistem.title"), T("settings.sistem.desc"));
    var up = obj(st.update);
    var sys = obj(st.system);
    var v = block(c, T("settings.sistem.versionBlock"));
    var ver = sys.version != null ? sys.version : up.current;
    row(v, { title: T("settings.sistem.version"), ctl: el("span", "am-set-mono", ver == null ? T("settings.sistem.notReported") : String(ver)) });
    var upState = up.state != null ? up.state : (up.latest != null ? up.latest : null);
    row(v, { title: T("settings.sistem.latest"), ctl: upState == null ? el("span", "am-set-mono", T("settings.sistem.notReported")) : chip(String(upState), stateTone(upState), { mono: true }) });

    var h = block(c, T("settings.sistem.healthBlock"));
    var hs = obj(st.health);
    var tone = hs.status === "green" ? "ok" : (hs.status === "red" ? "bad" : "muted");
    var htext = hs.status === "green" ? T("health.green") : (hs.status === "red" ? T("health.red") : T("health.unknown"));
    row(h, { title: T("settings.sistem.health"), ctl: chip(htext, tone) });
    var checks = arr(hs.checks);
    if (checks.length) {
      table(h, {
        caption: T("settings.sistem.healthChecks"),
        cols: [T("settings.sistem.colCheck"), T("settings.sistem.colResult")],
        lastRight: true,
        rows: checks.map(function (k) {
          return [{ name: k.name, sub: scrubSecrets(k.detail || "") }, k.ok ? chip(T("settings.sistem.checkOk"), "ok") : chip(T("settings.sistem.checkBad"), "bad")];
        })
      });
    } else {
      emptyCard(h, T("settings.sistem.noChecks"));
    }

    var d = block(c, T("settings.sistem.dirsBlock"));
    var dirs = splitDirs(sys.dirs).work;
    if (dirs.length) dirRows(d, dirs, AM); else emptyCard(d, T("settings.sistem.noDirs"));
  }

  function secKasa(AM, c) {
    pageHead(c, T("settings.kasa.title"), T("settings.kasa.desc"));
    note(c, T("settings.kasa.note"), "info");
    var b = block(c, T("settings.kasa.dirsBlock"));
    var dirs = splitDirs(obj(AM.state && AM.state.system).dirs).files;
    if (dirs.length) dirRows(b, dirs, AM); else emptyCard(b, T("settings.kasa.noDirs"));
  }

  function secGelistirici(AM, c) {
    pageHead(c, T("settings.gelistirici.title"), T("settings.gelistirici.desc"));
    var ev = arr(AM.state && AM.state.audit).slice(0, 15);
    if (!ev.length) emptyCard(c, T("settings.gelistirici.none"));
    else {
      table(c, {
        caption: T("settings.gelistirici.caption"),
        cols: [T("settings.gelistirici.colTime"), T("settings.gelistirici.colEvent"), T("settings.gelistirici.colActor"), T("settings.gelistirici.colTarget")],
        rows: ev.map(function (e) {
          var x = obj(e);
          return [
            { name: fmtDateTime(x.at) },
            el("span", "am-set-mono", scrubSecrets(x.event == null ? "" : x.event)),
            el("span", "am-set-mono", scrubSecrets(x.actor == null ? "" : x.actor)),
            el("span", "am-set-mono am-set-wrap", scrubSecrets(x.target == null ? "" : x.target))
          ];
        })
      });
    }
    var b = block(c);
    row(b, {
      title: T("settings.gelistirici.moreRow"), desc: T("settings.gelistirici.moreDesc"),
      ctl: btn(T("settings.gelistirici.openDebug"), function () {
        var a = AM.actions;
        if (!a || typeof a.openProjectSettings !== "function") { announce(T("settings.err.noAction")); return; }
        if (typeof a.closeSettings === "function") a.closeSettings();
        a.openProjectSettings("hata");
      }, null, "open-debug")
    });
  }

  function secHelp(AM, c, id) {
    var H = window.AM_HELP;
    if (!H || typeof H.renderSection !== "function") {
      errorCard(c, T("settings.err.title"), T("settings.err.noHelp"), null);
      return;
    }
    H.renderSection(AM, id, c);
  }

  var BUILDERS = {
    genel: secGenel, saglayicilar: secSaglayicilar, guvenlik: secGuvenlik, bellek: secBellek, beceriler: secBeceriler,
    yedekleme: secYedekleme, gorunum: secGorunum, internet: secInternet, sistem: secSistem, kasa: secKasa, gelistirici: secGelistirici
  };

  function buildSection(AM, id, c) {
    if (isHelpSection(id)) { secHelp(AM, c, id); return; }
    BUILDERS[id](AM, c);
  }

  // Satır metinlerinden arama dizini (nav süzmesi için). Yardım bölümleri AM_HELP'ten gelir.
  function buildIndex(AM) {
    var idx = Object.create(null);
    ALL_IDS.forEach(function (id) {
      try {
        if (isHelpSection(id)) {
          var H = window.AM_HELP;
          idx[id] = H && typeof H.indexText === "function" ? String(H.indexText(AM, id)) : "";
          return;
        }
        var tmp = document.createElement("div");
        BUILDERS[id](AM, tmp);
        idx[id] = tmp.textContent || "";
      } catch (e) {
        idx[id] = "";
      }
    });
    return idx;
  }

  // ------------------------------------------------------------------ çatı: nav, içerik, modal davranışı
  function visibleNavGroups(AM) {
    var idx = normalizeQuery(S.query) ? buildIndex(AM) : Object.create(null);
    return filterNav(GROUPS, S.query, function (node) {
      if (node.items) return T(node.labelKey);
      return T(node.labelKey) + " " + (idx[node.id] || "");
    });
  }

  function paintNavSelection() {
    S.visibleIds.forEach(function (id) {
      var b = S.navButtons[id];
      if (!b) return;
      var on = id === S.section;
      b.className = "am-set-nav-item" + (on ? " am-set-nav-item--on" : "");
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
      b.tabIndex = on ? 0 : -1;
    });
    // Seçili bölüm süzmeyle gizlendiyse ilk görünür öğe sekme durağı olur.
    if (S.visibleIds.length && S.visibleIds.indexOf(S.section) === -1) {
      var first = S.navButtons[S.visibleIds[0]];
      if (first) first.tabIndex = 0;
    }
  }

  function rebuildNav(AM) {
    var nav = S.nav;
    while (nav.firstChild) nav.removeChild(nav.firstChild);
    S.navButtons = Object.create(null);
    var groups = visibleNavGroups(AM);
    S.visibleIds = flattenNav(groups);
    if (!groups.length) {
      nav.appendChild(el("div", "am-set-nav-empty", T("settings.noMatch")));
      return;
    }
    groups.forEach(function (g) {
      var gw = el("div", "am-set-group");
      gw.setAttribute("role", "group");
      var gt = el("div", "am-set-group-title", T(g.labelKey));
      gt.id = "am-set-g-" + g.id;
      gw.setAttribute("aria-labelledby", gt.id);
      gw.appendChild(gt);
      g.items.forEach(function (it) {
        var b = el("button", "am-set-nav-item");
        b.type = "button";
        b.setAttribute("data-id", it.id);
        b.appendChild(icon(it.icon, 16));
        b.appendChild(el("span", "am-set-nav-t", T(it.labelKey)));
        b.addEventListener("click", function () { selectSection(AM, it.id, false); });
        S.navButtons[it.id] = b;
        gw.appendChild(b);
      });
      nav.appendChild(gw);
    });
    paintNavSelection();
  }

  function selectSection(AM, id, focusNav) {
    var sec = normSection(id);
    S.section = sec;
    setView(AM, { settingsSection: sec });
    paintNavSelection();
    renderContent(AM, true);
    if (focusNav && S.navButtons[sec]) S.navButtons[sec].focus();
    if (S.content) S.content.scrollTop = 0;
  }

  function applyRowFilter(content, q) {
    var nq = normalizeQuery(q);
    var items = content.querySelectorAll(".am-set-f");
    var shown = 0;
    for (var i = 0; i < items.length; i += 1) {
      var it = items[i];
      var ok = !nq || matches(it.textContent || "", nq);
      it.hidden = !ok;
      if (ok) shown += 1;
    }
    var blocks = content.querySelectorAll(".am-set-block");
    for (var j = 0; j < blocks.length; j += 1) {
      var b = blocks[j];
      var kids = b.querySelectorAll(".am-set-f");
      if (!kids.length) continue;
      var any = false;
      for (var k = 0; k < kids.length; k += 1) { if (!kids[k].hidden) { any = true; break; } }
      b.hidden = !any;
    }
    if (nq && items.length && shown === 0) content.appendChild(el("div", "am-set-empty", T("settings.noRows")));
  }

  // İnternet bölümü açılınca ayar ve getirme kaydı bir kez istenir (bölüm kurucuları yan etkisizdir: arama dizini onları da çağırır).
  function netLoadOnce(AM) {
    var a = AM && AM.actions;
    if (S.net.asked || !a || typeof a.loadData !== "function") return;
    S.net.asked = true;
    ["netSettings", "netFetches"].forEach(function (k) {
      try { var r = a.loadData(k); if (r && typeof r.then === "function") r.then(null, function () { /* hata AM.state.data'ya yazılır */ }); } catch (e) { /* görünür hata sonraki çizimde */ }
    });
  }

  function renderContent(AM, force) {
    if (!S.content) return;
    var sig = sectionSig(S.section, AM.state, AM.view) + "#" + S.query;
    if (!force && sig === S.sigLast) return;
    S.sigLast = sig;
    var c = S.content;
    if (S.section === "internet") netLoadOnce(AM);
    var ae = document.activeElement;
    var fkey = ae && c.contains(ae) ? ae.getAttribute("data-fkey") : null;
    var top = c.scrollTop;
    while (c.firstChild) c.removeChild(c.firstChild);
    try {
      if (regError) errorCard(c, T("settings.err.title"), T("settings.err.register", { reason: regError }), null);
      buildSection(AM, S.section, c);
      if (!Object.prototype.hasOwnProperty.call(DOC_OF, S.section)) applyRowFilter(c, S.query);
    } catch (e) {
      S.sigLast = "";
      while (c.firstChild) c.removeChild(c.firstChild);
      errorCard(c, T("settings.err.title"), T("settings.err.detail", { reason: scrubSecrets(String(e && e.message ? e.message : e)).slice(0, 200) }), function () { renderContent(AM, true); });
    }
    c.scrollTop = top;
    if (fkey) {
      var cand = c.querySelectorAll("[data-fkey]");
      for (var i = 0; i < cand.length; i += 1) {
        if (cand[i].getAttribute("data-fkey") === fkey) { cand[i].focus(); break; }
      }
    }
  }

  function focusables(root) {
    var all = root.querySelectorAll('a[href],button,input,select,textarea,[tabindex]');
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
      closeSettings(AM);
      return;
    }
    if (ev.key !== "Tab") return;
    var f = focusables(S.root);
    if (!f.length) { ev.preventDefault(); return; }
    var first = f[0];
    var last = f[f.length - 1];
    var a = document.activeElement;
    if (ev.shiftKey && (a === first || !S.root.contains(a))) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && (a === last || !S.root.contains(a))) { ev.preventDefault(); first.focus(); }
  }

  function openDialog(AM) {
    S.lastFocus = document.activeElement || null;
    var root = el("div", "am-overlay am-set-overlay");
    root.setAttribute("data-owner", "settings");
    var dlg = el("div", "am-set-dialog");
    dlg.setAttribute("role", "dialog");
    dlg.setAttribute("aria-modal", "true");
    dlg.id = "am-set-dialog";
    var title = el("h1", "am-set-sr", T("settings.title"));
    title.id = "am-set-title";
    dlg.setAttribute("aria-labelledby", "am-set-title");
    dlg.appendChild(title);

    var side = el("div", "am-set-side");
    var sw = el("div", "am-set-search");
    sw.appendChild(icon("search", 16));
    var input = el("input", "am-set-search-in");
    input.type = "search";
    input.setAttribute("aria-label", T("settings.searchLabel"));
    input.setAttribute("placeholder", T("settings.searchPh"));
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    sw.appendChild(input);
    side.appendChild(sw);
    var nav = el("nav", "am-set-nav");
    nav.setAttribute("aria-label", T("settings.navLabel"));
    side.appendChild(nav);

    var main = el("div", "am-set-main");
    var close = el("button", "am-set-close");
    close.type = "button";
    close.setAttribute("aria-label", T("settings.close"));
    close.setAttribute("title", T("nav.close"));
    close.appendChild(icon("x", 18));
    close.addEventListener("click", function () { closeSettings(AM); });
    var content = el("div", "am-set-content");
    content.setAttribute("role", "region");
    content.setAttribute("aria-label", T("settings.title"));
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
    root.addEventListener("mousedown", function (ev) { if (ev.target === root) closeSettings(AM); });
    nav.addEventListener("keydown", function (ev) {
      var k = ev.key;
      if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].indexOf(k) === -1) return;
      var t = ev.target && ev.target.closest ? ev.target.closest(".am-set-nav-item") : null;
      if (!t) return;
      ev.preventDefault();
      var next = moveSelection(S.visibleIds, t.getAttribute("data-id"), k);
      if (next) selectSection(AM, next, true);
    });
    input.addEventListener("input", function () {
      S.query = input.value;
      rebuildNav(AM);
      if (S.visibleIds.length && S.visibleIds.indexOf(S.section) === -1) selectSection(AM, S.visibleIds[0], false);
      else renderContent(AM, true);
    });

    S.root = root; S.side = side; S.nav = nav; S.search = input; S.content = content; S.live = live; S.closeBtn = close;
    S.query = "";
    S.sigLast = "";
    S.host.appendChild(root);
    rebuildNav(AM);
    renderContent(AM, true);
    var target = S.navButtons[S.section] || input;
    try { target.focus(); } catch (e) { /* odak verilemezse sorun değil */ }
  }

  function closeDialog() {
    if (!S.root) return;
    var prev = S.lastFocus;
    if (S.liveTimer) { clearTimeout(S.liveTimer); S.liveTimer = 0; }
    if (S.root.parentNode) S.root.parentNode.removeChild(S.root);
    S.root = null; S.side = null; S.nav = null; S.search = null; S.content = null; S.live = null; S.closeBtn = null;
    S.navButtons = Object.create(null); S.visibleIds = [];
    S.net = { draft: null, baseSig: "", input: "", err: "", busy: false, asked: false };
    S.lastFocus = null;
    if (prev && prev.isConnected && typeof prev.focus === "function") {
      try { prev.focus(); } catch (e) { /* yoksay */ }
    }
  }

  function render(AM) {
    try {
      if (!S.host) return;
      var open = !!(AM && AM.view && AM.view.settingsOpen);
      if (!open) { closeDialog(); return; }
      S.section = normSection(AM.view.settingsSection);
      if (!S.root) { openDialog(AM); return; }
      // Açıkken: bölüm dışarıdan değiştiyse nav'ı eşle; veri değiştiyse yalnız gerekirse içerik yenilenir.
      paintNavSelection();
      renderContent(AM, false);
    } catch (e) {
      if (S.content) {
        while (S.content.firstChild) S.content.removeChild(S.content.firstChild);
        errorCard(S.content, T("settings.err.title"), T("settings.err.detail", { reason: scrubSecrets(String(e && e.message ? e.message : e)).slice(0, 200) }), function () { render(AM); });
      }
    }
  }

  function init(AM, host) {
    S.AM = AM;
    S.host = host || null;
  }

  window.AM_SETTINGS = { init: init, render: render, pure: pure };
})();
