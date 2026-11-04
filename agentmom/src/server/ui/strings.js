// D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. Ek bölümler 'D9' ile işaretlidir; ADR-016: yetenekler kendiliğinden çalışmaz.
/*
 * Sahip: Haiku (Türkçe metinler ve AM_T) [İP:AgentMom Faz 10]
 * Kural kaynağı: docs/tasarim/arayuz-sozlesmesi.md, "strings.js" bölümü.
 * Kullanıcı yalnız Yusuf'tur. Metinler düz metindir; HTML etiketi içermez.
 * Yalnız ekleme/düzeltme ile değiştirilir.
 */
(function () {
  "use strict";

  window.AM_TR = Object.freeze({
    /* Uygulama */
    "app.name": "AgentMom",
    "app.subtitle": "Komuta Paneli",

    /* Giriş */
    "login.title": "Giriş",
    "login.help": "Erişim anahtarınızı girin. Anahtar bu tarayıcıda saklanmaz.",
    "login.label": "Erişim anahtarı",
    "login.submit": "Giriş yap",
    "login.bad": "Anahtar geçersiz. Tekrar deneyin.",
    "login.expired": "Oturum süresi doldu. Yeniden giriş yapın.",

    /* Gezinme */
    "nav.overview": "Genel bakış",
    "nav.new": "Yeni görev",
    "nav.search": "Ara",
    "nav.pinned": "Sabitlenmiş",
    "nav.recent": "Son kullanılanlar",
    "nav.sessionsEmpty": "Henüz kayıt yok.",
    "nav.openSessions": "Oturumları aç",
    "nav.openTopic": "Konuyu aç",
    "nav.close": "Kapat",
    "nav.logout": "Çıkış yap",
    "nav.refresh": "Yenile",
    "nav.user": "Yusuf · yerel",

    /* Sağlık */
    "health.green": "Sağlıklı",
    "health.red": "Sorunlu",
    "health.unknown": "Bilinmiyor",

    /* Akış */
    "feed.hello": "Merhaba Yusuf. Bugünkü durum aşağıda.",
    "feed.summary": "{tasks} görev, {waiting} bekleyen, {broken} kırık, {review} gözden geçirme.",
    "feed.new": "Yeni",
    "feed.noApprovals": "Bekleyen izin isteği yok.",

    /* İzin kartı */
    "approval.title": "İzin isteniyor",
    "approval.task": "Görev",
    "approval.action": "İstenen işlem",
    "approval.target": "Hedef",
    "approval.decision": "Karar",
    "approval.allow": "İzin ver",
    "approval.deny": "Reddet",
    "approval.confirmAllow": "Şu görev ONAYLANSIN mı?",
    "approval.confirmDeny": "Şu görev REDDEDİLSİN mi?",
    "approval.doneAllow": "Görev onaylandı.",
    "approval.doneDeny": "Görev reddedildi.",
    "approval.failed": "İşlem tamamlanamadı (durum: {status}). Neden: {reason}",

    /* Kartlar */
    "cards.debt": "Borçlar",
    "cards.decisions": "Kararlar",
    "cards.skills": "Beceriler",
    "cards.providers": "Sağlayıcılar",
    "cards.tasks": "Görevler",
    "cards.emptyDebt": "Açık borç yok.",
    "cards.emptyDecisions": "Bekleyen karar yok.",
    "cards.emptySkills": "Beceri kaydı yok.",
    "cards.emptyProviders": "Sağlayıcı kaydı yok.",
    "cards.emptyTasks": "Görev yok.",

    /* Görev durumları */
    "state.pending": "Bekliyor",
    "state.awaiting_approval": "İzin bekliyor",
    "state.approved": "Onaylandı",
    "state.running": "Çalışıyor",
    "state.succeeded": "Tamamlandı",
    "state.failed": "Başarısız",
    "state.cancelled": "İptal edildi",
    "state.denied": "Reddedildi",

    /* Borç */
    "debt.broken": "Kırık",
    "debt.overdue": "Gecikmiş",
    "debt.pending": "Bekliyor",
    "debt.overdueDays": "{n} gün gecikmiş",

    /* Gözden geçirme */
    "review.at_risk": "Riskte",
    "review.review_due": "Gözden geçirme zamanı",
    "review.ok": "Uygun",

    /* Beceri */
    "skill.risk": "Risk: {risk}",

    /* Sağlayıcılar */
    "providers.counts": "Doğrulanmış: {verified} · Kısmi: {partial} · Doğrulanmamış: {unverified} · Kullanılamıyor: {unavailable} · Desteklenmiyor: {unsupported}",
    "providers.unavailable": "KULLANILAMIYOR",
    "providers.available": "hazır",
    "providers.partial": "kısmi",
    "providers.noFallback": "Otomatik geçiş yok: kullanılamayan bir sağlayıcı yerine başkası kendiliğinden devreye girmez; karar sizindir.",

    /* Yazı alanı */
    "composer.placeholder": "Bir görev yazın veya / ile komut girin",
    "composer.send": "Gönder",
    "composer.mode": "Mod: her işlem izin ister",
    "composer.model": "Yerel kip · model çağrısı yok",
    "composer.working": "çalışıyor…",
    "composer.idle": "hazır",

    /* Konu paneli */
    "topic.title": "Konu",
    "topic.empty": "Bir konu seçin.",
    "topic.action": "İşlem",
    "topic.target": "Hedef",
    "topic.state": "Durum",
    "topic.decision": "Karar",
    "topic.created": "Oluşturulma",
    "topic.evidence": "Kanıtlar",
    "topic.noEvidence": "Kanıt kaydı yok.",
    "topic.loading": "Yükleniyor…",

    /* Hata */
    "error.title": "Bir şey ters gitti",
    "error.retry": "Yeniden dene",
    "error.server": "Sunucu hatası: {reason}",
    "error.auth": "Yetki doğrulanamadı. Yeniden giriş yapın.",
    "error.render": "Ekran çizilemedi: {reason}",
    "error.unknown": "Bilinmeyen bir hata oluştu.",

    /* Komutlar */
    "cmd.help": "Komutlar:\n/yardim - bu listeyi gösterir\n/durum - genel durumu gösterir\n/gorevler - görev listesini gösterir\n/onay - bekleyen izin isteklerini gösterir\n/borc - açık borçları gösterir\n/kararlar - kararları ve gözden geçirmeleri gösterir\n/beceriler - beceri listesini ve risk sınıflarını gösterir\n/saglayicilar - sağlayıcı durumlarını gösterir\n/yetenekler - çağırabileceğiniz yetenekleri listeler\n/yenile - verileri yeniden çeker\n/temizle - yazışma geçmişini temizler",
    "cmd.unknown": "Bilinmeyen komut: {cmd}. Komut listesi için /yardim yazın.",
    "cmd.freeConfirm": "Şu metin yeni bir görev olarak kaydedilsin mi? Metin: {text}",
    "cmd.freeDone": "Görev kaydedildi: {id} (durum: {state}). Ajan başlatılmadı.",
    "cmd.freeCancel": "Görev kaydı iptal edildi.",
    "cmd.cleared": "Yazışma geçmişi temizlendi.",
    "cmd.statusLine": "{tasks} görev, {waiting} bekleyen, {broken} kırık, {review} gözden geçirme."
  });

  // Faz 11: her arayüz modülü kendi metinlerini önekli anahtarlarla kaydeder (modül.anahtar). Çakışma ya da yanlış önek GÖRÜNÜR hatadır (sessiz ezme yok).
  var EXT = Object.create(null);
  window.AM_REGISTER_TR = function (module, texts) {
    var mod = String(module);
    if (!/^[a-z][a-z0-9-]{1,24}$/.test(mod)) throw new Error("AM_REGISTER_TR: geçersiz modül adı " + mod);
    Object.keys(texts || {}).forEach(function (key) {
      if (key.indexOf(mod + ".") !== 0) throw new Error("AM_REGISTER_TR: anahtar '" + key + "' '" + mod + ".' ile başlamalı");
      if (EXT[key] !== undefined || Object.prototype.hasOwnProperty.call(window.AM_TR, key)) throw new Error("AM_REGISTER_TR: anahtar çakışması " + key);
      EXT[key] = String(texts[key]);
    });
  };

  // Faz 11 D9e (madde 26): diller. Türkçe asıl ve tamdır; diğer diller (şimdilik en) YALNIZ çevrilmiş anahtarları tutar, eksik anahtar Türkçe metne düşer (boş ya da ⟦anahtar⟧ görünmez).
  // Çeviri, Türkçe anahtarla aynı {yer tutucu} kümesini taşımak zorundadır; uyumsuzluk AM_LANG_REPORT ile görünür (testler denetler). Dil seçimi kendiliğinden değişmez: kullanıcı seçer.
  var LANGS = Object.create(null);
  var current = "tr";
  var LANG_NAMES = Object.freeze({ tr: "Türkçe", en: "English" });
  window.AM_REGISTER_LANG = function (code, texts) {
    var c = String(code);
    if (!/^[a-z]{2}$/.test(c) || c === "tr" || !Object.prototype.hasOwnProperty.call(LANG_NAMES, c)) throw new Error("AM_REGISTER_LANG: desteklenmeyen dil " + c);
    var dict = LANGS[c] || (LANGS[c] = Object.create(null));
    Object.keys(texts || {}).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(dict, key)) throw new Error("AM_REGISTER_LANG: anahtar çakışması " + c + ":" + key);
      dict[key] = String(texts[key]);
    });
  };
  window.AM_LANGS = function () { return ["tr"].concat(Object.keys(LANGS).sort()); };
  window.AM_LANG_NAME = function (code) { return Object.prototype.hasOwnProperty.call(LANG_NAMES, code) ? LANG_NAMES[code] : String(code); };
  window.AM_LANG = function () { return current; };
  window.AM_SET_LANG = function (code) {
    current = code === "tr" || (typeof code === "string" && LANGS[code]) ? code : "tr";
    return current;
  };
  function trText(k) { return Object.prototype.hasOwnProperty.call(window.AM_TR, k) ? String(window.AM_TR[k]) : EXT[k]; }
  function slots(t) { return (String(t).match(/\{[A-Za-z0-9_]+\}/g) || []).sort().join(","); }
  // Yalnız okur: çevrilen / eksik / Türkçede karşılığı olmayan / yer tutucusu uyuşmayan anahtarlar.
  window.AM_LANG_REPORT = function (code) {
    var dict = LANGS[code] || Object.create(null);
    var all = Object.keys(window.AM_TR).concat(Object.keys(EXT));
    var rep = { total: all.length, translated: 0, missing: [], unknown: [], slotMismatch: [] };
    all.forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(dict, k)) {
        rep.translated++;
        if (slots(dict[k]) !== slots(trText(k))) rep.slotMismatch.push(k);
      } else rep.missing.push(k);
    });
    Object.keys(dict).forEach(function (k) { if (trText(k) === undefined) rep.unknown.push(k); });
    return rep;
  };

  window.AM_T = function (key, vars) {
    var k = String(key);
    var text = current !== "tr" && LANGS[current] && Object.prototype.hasOwnProperty.call(LANGS[current], k) ? LANGS[current][k] : trText(k);
    if (text === undefined) {
      return "⟦" + k + "⟧";
    }
    return text.replace(/\{([A-Za-z0-9_]+)\}/g, function (match, name) {
      if (!vars || !Object.prototype.hasOwnProperty.call(vars, name)) {
        return "";
      }
      var value = vars[name];
      return value === undefined || value === null ? "" : String(value);
    });
  };
})();

// Faz 11: çekirdek, komut ve durum metinleri (modül metinleri kendi dosyalarında AM_REGISTER_TR ile kaydedilir).
window.AM_REGISTER_TR("core", {
  "core.sentToTopic": "Bir konuya gönderildi",
  "core.new": "Yeni",
  "core.cancel": "Vazgeç",
  "core.save": "Kaydet",
  "core.quitting": "AgentMom kapatılıyor. Bu pencereyi kapatabilirsiniz.",
  "core.backupTitle": "Şimdi yedek alınsın mı?",
  "core.backupDetail": "Yeni bir yedek klasörü yazılır (üzerine yazılmaz, hiçbir şey silinmez). Anahtar ve belirteç yedeğe girmez; yedek hemen doğrulanır.",
  "core.backupConfirm": "Yedek al",
  "core.backupDone": "Yedek alındı ve doğrulandı (ayrıntı: Ayarlar › Yedekleme).",
  "core.backupBusy": "Başka bir yedek sürüyor; birkaç saniye sonra yeniden deneyin.",
  "core.confirm": "Onayla",
  "core.riskLine": "Risk: {level} ({score}/100)",
  "core.agentTitle": "Görev başlığı (ajan yazdı): {baslik}",
  "core.risk.low": "düşük", "core.risk.medium": "orta", "core.risk.high": "yüksek", "core.risk.critical": "KRİTİK", "core.risk.unknown": "bilinmiyor",
  "core.undoLine": "Geri alma: {rev} — {undo}",
  "core.rev.yes": "geri alınabilir", "core.rev.partial": "kısmen geri alınabilir", "core.rev.no": "GERİ ALINAMAZ", "core.rev.unknown": "bilinmiyor",
  "core.providerTestTitle": "Bağlantı sınansın mı?",
  "core.providerTestDetail": "Yalnız yerel sürüm/oturum denetimi yapılır; model çağrısı ve ücret yoktur.",
  "core.providerDisableTitle": "Sağlayıcı devre dışı bırakılsın mı?",
  "core.providerDisableDetail": "Devre dışı sağlayıcıya yeni iş verilmez ve yerine başka sağlayıcı konmaz. İstediğiniz zaman yeniden etkinleştirebilirsiniz.",
  "core.providerEnableTitle": "Sağlayıcı yeniden etkinleştirilsin mi?",
  "core.providerEnableDetail": "Sağlayıcı tekrar kullanılabilir olur (politika izinleri değişmez).",
  "core.grantRevokeTitle": "İzin iptal edilsin mi?",
  "core.grantRevokeDetail": "Bu geçici izin hemen iptal edilir ve yeniden etkinleştirilemez; gerekirse yeni izin verilmesi gerekir. Yalnız bu izin etkilenir, politika değişmez.",
  "core.ruleEnableTitle": "Otomasyon kuralı açılsın mı?",
  "core.ruleEnableDetail": "Kural eşleşen olaylarda yalnız bildirir ya da politikadan geçen bir görev kaydı açar; izin veremez.",
  "core.ruleDisableTitle": "Otomasyon kuralı kapatılsın mı?",
  "core.ruleDisableDetail": "Kural kapalıyken tetiklenmez. İstediğiniz zaman yeniden açabilirsiniz.",
  "core.createConfirm": "Ekle",
  "core.fld.scopeDir": "Klasör", "core.fld.reason": "Gerekçe", "core.fld.ttl": "Süre (dakika)", "core.fld.maxUses": "Kullanım sayısı", "core.fld.summary": "Özet",
  "core.fld.ruleName": "Kural adı", "core.fld.cooldown": "Bekleme süresi (sn)", "core.fld.message": "Bildirim iletisi", "core.fld.taskTitle": "Görev başlığı", "core.fld.taskTarget": "Görev hedefi",
  "core.createErr.grantAction": "Eylem listeden seçilmeli: dosya okuma, dosya yazma ya da doğrulama çalıştırma.",
  "core.createErr.path": "{alan} boş olamaz (en çok {max} karakter; satır sonu ve görünmez karakter içermemeli).",
  "core.createErr.text": "{alan} en az {min}, en çok {max} karakter olmalı.",
  "core.createErr.range": "{alan} {min} ile {max} arasında bir tam sayı olmalı.",
  "core.createErr.taskId": "Görev kimliği yalnız harf, rakam, nokta, alt çizgi ve tire içerebilir (en çok 80 karakter).",
  "core.createErr.files": "Dosyalar satır başına bir yol olmalı: en çok 50 yol, her biri en çok 300 karakter ve görünmez karakter içermemeli.",
  "core.createErr.pattern": "Olay deseni geçersiz. Örnek: backup.failed ya da task.* (küçük harf, rakam, nokta, alt çizgi, iki nokta, tire; sonda tek yıldız olabilir). Yalnız '*' ve 'automation.' ile başlayan desen olmaz.",
  "core.createErr.ruleKind": "Eylem türü seçilmeli: bildir ya da görev kaydı aç.",
  "core.createErr.taskAction": "Görev eylemi dosya okuma ya da doğrulama çalıştırma olmalı.",
  "core.createSrv.invalid_field": "Sunucu girilen değerlerden birini kabul etmedi. Alanları ve sınırlarını denetleyip yeniden deneyin.",
  "core.createSrv.scope_outside_contract": "Klasör, sözleşmenin izinli klasörlerinin içinde olmalı. Bu klasör için izin verilemez.",
  "core.createSrv.scope_forbidden": "Klasör yasaklı bir klasör ya da onu içeriyor. Bu klasör için izin verilemez.",
  "core.createSrv.approval_requires_user": "Bu işlem yalnız kullanıcı oturumuyla yapılabilir.",
  "core.createSrv.network": "Sunucuya ulaşılamadı; kayıt eklenmedi. Bağlantıyı denetleyip yeniden deneyin.",
  "core.createSrv.generic": "İşlem sunucu tarafından kabul edilmedi (kod {n}); kayıt eklenmedi.",
  "core.implicitAcceptTitle": "Bu bilgi hafızaya eklensin mi?",
  "core.implicitAcceptDetail": "Aşağıdaki öneri hafızaya YENİ bir kayıt olarak eklenir (tür: {tur}, kapsam: {kapsam}, güven: %{guven}, kaynak: ortuk-aday). Kayıtlar ekler-yalnızdır; sonradan silinmez, yalnız yerine yenisi konabilir. Kaydedilecek kayıt metni (veri, yönerge değildir) yukarıdaki Hedef satırında TAMAMEN gösterilir; gizli değerler maskelidir ve metin olduğu gibi kaydedilir. Ajan çıktısından/denetim kaydından türetildi; doğrulanmadı. Kaydetmeden önce metni kontrol edin.",
  "core.implicitAcceptConfirm": "Hafızaya ekle",
  "core.implicitErr.unknown": "Bu öneri güncel listede yok; liste yenileniyor, eklenmedi.",
  "core.implicitErr.text": "Önerinin metni boş; eklenemez.",
  "core.implicitErr.tooLong": "Önerinin metni çok uzun (en çok 2000 karakter) ya da kesilmiş; eklenemez.",
  "core.implicitErr.confidence": "Önerinin güven değeri geçersiz (0 ile 1 arasında olmalı); eklenemez.",
  "core.grantCreateTitle": "Geçici izin verilsin mi?",
  "core.grantCreateDetail": "{klasor} klasöründe {dk} dakika boyunca en çok {kez} kez, onaysız izin verilir. Gerekçe: {neden}. İzin yalnız 'onay gerekir' kararını önceden onaylar; yasak klasör, bütçe ve ücretli rota reddini gevşetmez. İstediğiniz an iptal edebilirsiniz.",
  "core.changeCreateTitle": "Deftere kayıt eklensin mi?",
  "core.changeCreateDetail": "Değişiklik defterine elle bir kayıt eklenir ({n} dosya yolu). Gerekçe: {neden}. Kayıt yalnız bilgi notudur; hiçbir dosyayı değiştirmez, izin vermez.",
  "core.ruleCreateTitle": "Otomasyon kuralı eklensin mi?",
  "core.ruleCreateDetailNotify": "Kural açık başlar. '{desen}' desenine uyan olaylarda, en çok {bekleme} sn'de bir şu bildirim gösterilir: {ileti}. Kural izin veremez.",
  "core.ruleCreateDetailTask": "Kural açık başlar. '{desen}' desenine uyan olaylarda, en çok {bekleme} sn'de bir '{baslik}' başlıklı görev kaydı ({eylem}, hedef {hedef}) açılır; kayıt normal politikadan geçer, izin vermez.",
  "core.backupFailed": "Yedek ALINAMADI ya da doğrulanamadı. Ayrıntı ve uyarılar: Ayarlar › Yedekleme ve Genel bakış."
});
window.AM_REGISTER_TR("cmd", {
  "cmd.freeTitle": "Yeni görev kaydı",
  "cmd.capsNone": "Yetenek kataloğu yüklenemedi."
});
// Karar laboratuvarı (rakip hipotezler, bilgi değeri) doğrulama ve sunucu hata metinleri (core.js). Yalnız ekleme.
window.AM_REGISTER_TR("core", {
  "core.fld.hypothesis": "Hipotez", "core.fld.evidence": "Kanıt", "core.fld.prior": "Öncül", "core.fld.likelihood": "Olabilirlik",
  "core.fld.state": "Durum", "core.fld.stateProb": "Durum olasılığı", "core.fld.option": "Seçenek", "core.fld.test": "Test",
  "core.fld.payoff": "Kazanç", "core.fld.posProb": "Pozitif sonuç olasılığı",
  "core.labErr.hypCount": "Rakip hipotez sayısı 2 ile 10 arasında olmalı.",
  "core.labErr.evCount": "Kanıt sayısı 1 ile 30 arasında olmalı.",
  "core.labErr.mode": "Yöntem 'Bayes' ya da 'ACH' olmalı.",
  "core.labErr.id": "{alan}: kimlik harf, rakam, alt çizgi ve tire içeren 1 ile 30 karakter olmalı.",
  "core.labErr.dupId": "Kimlik tekrarlandı: {id}. Her kimlik yalnız bir kez kullanılabilir.",
  "core.labErr.prob": "{alan}: değer 0 ile 1 arasında bir sayı olmalı (ondalık için nokta ya da virgül).",
  "core.labErr.priorAll": "Öncüller ya hiç girilmemeli ya da bütün hipotezler için girilmeli.",
  "core.labErr.priorSum": "Öncüllerin toplamı 1 olmalı (şu an {toplam}).",
  "core.labErr.stateCount": "Durum sayısı 2 ile 10 arasında olmalı.",
  "core.labErr.optCount": "Seçenek sayısı 2 ile 10 arasında olmalı.",
  "core.labErr.testCount": "Test sayısı en çok 5 olabilir.",
  "core.labErr.stateSum": "Durum olasılıklarının toplamı 1 olmalı (şu an {toplam}).",
  "core.labErr.num": "{alan}: değer -1000000000000 ile 1000000000000 arasında bir sayı olmalı.",
  "core.labErr.cost": "{alan}: maliyet 0 ile 1000000000000 arasında bir sayı olmalı.",
  "core.labSrv.rejected": "Sunucu hesabı kabul etmedi (kod {n}). {neden}",
  "core.labSrv.network": "Sunucuya ulaşılamadı; hesap yapılamadı. Bağlantıyı denetleyip yeniden deneyin.",
  "core.labSrv.shape": "Sunucu yanıtı okunamadı; sonuç gösterilemiyor."
});
// D8c (yazan: Claude [İP:AgentMom Faz 11, D8c arayüz]): model yetenekleri ve internet ayarları eylem metinleri.
window.AM_REGISTER_TR("core", {
  "core.model.confirmTitle": "Metin uygulamadaki modele gönderilsin mi?",
  "core.model.confirmDetail": "Aşağıdaki Hedef satırındaki metnin TAMAMI ({ad}) için uygulamadaki modele (abonelik) gönderilecek; sağlayıcı: {saglayici}. Model çıktısı güvenilmez veri sayılır ve kaydedilmez. Gizli değer benzeri metinler maskelenmiştir; gösterilen metin gönderilen metindir.",
  "core.model.maskedNote": "Uyarı: metinde sır benzeri bir değer bulundu ve [gizli] olarak maskelendi.",
  "core.model.autoProvider": "otomatik (önerilen)",
  "core.model.confirm": "Modele gönder",
  "core.model.err.noFields": "Bu yeteneğin girdi alanları sunucudan alınamadı; çalıştırılamaz.",
  "core.model.err.type": "{alan}: değer metin olmalı.",
  "core.model.err.required": "{alan} boş olamaz.",
  "core.model.err.requiredList": "{alan}: en az bir öğe girin.",
  "core.model.err.long": "{alan}: en çok {max} karakter olabilir.",
  "core.model.err.items": "{alan}: en çok {max} öğe olabilir.",
  "core.model.err.total": "Girdi toplamı en çok {max} karakter olabilir.",
  "core.model.err.unknown": "Bu model yeteneği listede yok; liste yüklenemedi ya da yetenek bilinmiyor.",
  "core.model.err.unavailable": "Kullanılamıyor: {neden}",
  "core.model.err.noReason": "uygun sağlayıcı yok",
  "core.model.err.provider": "Sağlayıcı kimliği geçersiz.",
  "core.model.srv.busy": "Başka bir model yeteneği çalışıyor. Bitince yeniden deneyin.",
  "core.model.srv.provider": "Uygun sağlayıcı yok: {neden}",
  "core.model.srv.secret": "Sır içeren metin yerel olmayan sağlayıcıya gönderilemez.",
  "core.model.srv.validation": "Sunucu girdiyi kabul etmedi: {neden}",
  "core.model.srv.forbidden": "Sunucu isteği reddetti: {neden}",
  "core.model.srv.notFound": "Model yeteneği ya da koşusu bulunamadı.",
  "core.model.srv.generic": "İşlem sunucu tarafından kabul edilmedi (kod {n}).",
  "core.model.run.shape": "Sunucu yanıtı okunamadı; sonuç gösterilemiyor.",
  "core.model.run.stopped": "Sayfa değiştiği için sonuç beklenmesi durduruldu. Sunucudaki koşu sürmüş olabilir; sonuç kaydedilmez.",
  "core.model.run.timeout": "Model 5 dakika içinde yanıt vermedi; sonuç beklenmesi durduruldu.",
  "core.model.run.failed": "Model çağrısı başarısız oldu: {neden}",
  "core.model.run.refused": "Model çağrısı reddedildi: {neden}",
  "core.model.run.network": "Sunucuya ulaşılamadı; sonuç alınamadı. Bağlantıyı denetleyip yeniden deneyin.",
  "core.net.confirmTitleOn": "İnternet erişimi açılsın mı?",
  "core.net.confirmTitleOff": "İnternet erişimi kapatılsın mı?",
  "core.net.confirmDetailOn": "İnternet erişimi açılıyor. Yalnız Hedef satırındaki {n} izinli alan adına, kullanıcı isteğiyle, ücretsiz kamuya açık sayfalar GET ile getirilir; içerik güvenilmez veri sayılır. Her kullanımda onay: {onay}.",
  "core.net.confirmDetailOff": "İnternet erişimi kapatılıyor: uygulama internete hiç çıkmaz. Kaydedilecek izinli alan adı sayısı: {n}; her kullanımda onay: {onay}.",
  "core.net.perUseYes": "evet",
  "core.net.perUseNo": "hayır (açık onaylı kapsam)",
  "core.net.noDomains": "(izinli alan adı yok)",
  "core.net.confirm": "Kaydet",
  "core.net.srvInvalid": "Ayarlar sunucu tarafından kabul edilmedi: {neden}",
  "core.net.err.flags": "Açık/kapalı ve onay ayarları geçerli değil.",
  "core.net.err.list": "İzinli alan adları bir liste olmalı.",
  "core.net.err.count": "En çok {max} alan adı eklenebilir.",
  "core.net.err.empty": "İnternet erişimini açmak için en az bir izinli alan adı ekleyin.",
  "core.net.err.text": "Alan adı metin olmalı.",
  "core.net.err.len": "Alan adı 1 ile {max} karakter arasında olmalı.",
  "core.net.err.chars": "Alan adında geçersiz karakter var (adres, yol, boşluk, kapı numarası yazmayın).",
  "core.net.err.wild": "Joker yalnız '*.alan.uzantı' biçiminde olabilir.",
  "core.net.err.ip": "IP adresi alan adı olarak eklenemez.",
  "core.net.err.idn": "Alan adı geçersiz; uluslararası adları punycode (xn--) biçiminde girin.",
  "core.net.err.dot": "Alan adı nokta ile başlayıp bitemez.",
  "core.net.err.single": "Tek etiketli (yerel) ad kabul edilmez; en az 'ad.uzantı' olmalı.",
  "core.net.err.label": "Alan adı etiketleri geçersiz (harf, rakam ve tire kullanın).",
  "core.net.err.local": "Yerel ya da ayrılmış alan adı (localhost, .local, .internal vb.) kabul edilmez."
});
// D8c-UI-2: internetli model yetenekleri (37, 38, 40) — adres doğrulama, onay ve bilet metinleri.
window.AM_REGISTER_TR("core", {
  "core.model.err.urlEmpty": "Adres boş olamaz.",
  "core.model.err.urlLong": "Adres en çok 2000 karakter olabilir.",
  "core.model.err.urlScheme": "Adres http ya da https adresi olmalı ve boşluk içermemeli: {adres}",
  "core.model.err.urlBad": "Adres geçersiz: {adres}",
  "core.model.err.urlCreds": "Adreste kullanıcı adı ya da parola olamaz.",
  "core.model.err.urlIp": "IP adresi ile adres verilemez; alan adı kullanın: {adres}",
  "core.model.err.urlHost": "Alan adı kabul edilmez (yerel ya da geçersiz ad): {ad}",
  "core.model.err.urlDup": "Aynı adres iki kez verilemez (her onay bileti tek kullanımlıktır): {adres}",
  "core.model.err.netUnknown": "İnternet ayarı okunamadı; adresli çalıştırma yapılmadı. Ayarlar > İnternet erişimi bölümünü kontrol edin ya da adresleri boş bırakın (kaynaksız mod).",
  "core.model.err.netOff": "İnternet erişimi kapalı; adresler getirilemez ve hiçbir şey çalıştırılmadı. Ayarlar > İnternet erişimi'nden açın ya da adresleri boş bırakın (kaynaksız mod).",
  "core.model.err.hostNotAllowed": "Bu alan adı izinli listede değil: {ad}. Ayarlar > İnternet erişimi'nden ekleyin; hiçbir şey çalıştırılmadı.",
  "core.model.netDetail": "Adresler yalnız GET ile getirilir; içerikleri modele GÜVENİLMEZ VERİ olarak verilir. Onayınızdan sonra her adres için tek kullanımlık, 2 dakika geçerli bir onay bileti alınır.",
  "core.model.netList": "Şu adresler getirilecek ve içerikleri modele GÜVENİLMEZ VERİ olarak verilecek:",
  "core.model.netHost": "alan adı: {ad}",
  "core.model.sourcelessDetail": "Adres verilmedi: kaynaksız mod. Model yalnız kendi bilgisiyle yanıtlar; sonuç doğrulanmamış sayılır.",
  "core.model.srv.netDisabled": "İnternet erişimi kapalı. Ayarlar > İnternet erişimi'nden açın; hiçbir şey çalıştırılmadı.",
  "core.model.srv.hostNotAllowed": "Bu alan adı izinli listede değil: {ad}. Ayarlar > İnternet erişimi'nden ekleyin; hiçbir şey çalıştırılmadı.",
  "core.model.srv.hostNotAllowedAny": "Verilen adreslerden birinin alan adı izinli listede değil. Ayarlar > İnternet erişimi'nden ekleyin.",
  "core.model.srv.sourcesUnavailable": "Hiçbir kaynak getirilemedi; model çağrılmadı. Adresleri ve izinli alan adlarını denetleyin.",
  "core.model.srv.ticket": "Onay bileti alınamadı: {neden}. Hiçbir şey çalıştırılmadı."
});
// D8c-UI-3: müzakere (madde 75).
window.AM_REGISTER_TR("core", {
  "core.model.srv.sandbox": "Analiz çalışma alanında çok fazla eski çalışma ağacı birikti; Geri Dönüşüm Kutusu'na taşınması gerekir. Hiçbir şey çalıştırılmadı.",
  "core.model.err.number": "{alan}: geçerli bir sayı olmalı (tur sayısı 1 ya da 2).",
  "core.model.err.sameProvider": "Öneren ve eleştirmen sağlayıcı aynı olamaz: müzakere iki FARKLI sağlayıcı ister.",
  "core.model.negoDetail": "İKİ ayrı sağlayıcı sırayla çalışacak; birinin çıktısı diğerine GÜVENİLMEZ VERİ olarak verilecek. Süre dakikalar sürebilir (en çok 12 dakika beklenir). Sonuç yalnız ÖNERİDİR; hiçbir şey kendiliğinden uygulanmaz.",
  "core.model.run.timeoutLong": "Müzakere 12 dakika içinde bitmedi; sonuç beklenmesi durduruldu."
});
// D8c-UI-3: zamanlı otomasyon kuralları.
window.AM_REGISTER_TR("core", {
  "core.sched.interval": "her {n} dk",
  "core.sched.daily": "her gün {at}",
  "core.sched.dailyDays": "her gün {at} ({gunler})",
  "core.sched.day.1": "Pt", "core.sched.day.2": "Sa", "core.sched.day.3": "Ça", "core.sched.day.4": "Pe", "core.sched.day.5": "Cu", "core.sched.day.6": "Ct", "core.sched.day.7": "Pz",
  "core.fld.everyMinutes": "Çalışma aralığı (dk)",
  "core.createErr.trigger": "Tetikleyici türü geçersiz.",
  "core.createErr.schedKind": "Zamanlama türü geçersiz (aralık ya da günlük olmalı).",
  "core.createErr.at": "Saat HH:MM biçiminde olmalı (00:00 ile 23:59 arası).",
  "core.createErr.days": "Günler 1 ile 7 arasında (1 = Pazartesi), tekrarsız ve en çok 7 tane olmalı.",
  "core.createErr.coolLong": "Bekleme süresi çalışma aralığından uzun olamaz (bu kural için en çok {max} sn).",
  "core.createErr.analysis": "Analiz geçersiz (dikkat sırası, bilgi yarı ömrü, öğrenme getirisi, eksiklik, süreklilik, çevrimdışı ya da kaynak gölge fiyatı olmalı).",
  "core.createErr.analysisEvent": "Analiz çalıştırma yalnız zamanlı kuralda kullanılabilir.",
  "core.createErr.scheduleLimit": "En çok {max} açık zamanlı kural olabilir; önce birini kapatın.",
  "core.ruleCreateDetailSchedNotify": "Kural açık başlar ve ZAMANLIDIR: {zaman} (en çok {bekleme} sn'de bir) şu bildirim gösterilir: {ileti}.",
  "core.ruleCreateDetailSchedTask": "Kural açık başlar ve ZAMANLIDIR: {zaman} (en çok {bekleme} sn'de bir) '{baslik}' başlıklı görev kaydı ({eylem}, hedef {hedef}) açılır; kayıt normal politikadan geçer, izin vermez.",
  "core.ruleCreateDetailSchedAnalysis": "Kural açık başlar ve ZAMANLIDIR: {zaman} (en çok {bekleme} sn'de bir) '{analiz}' analizi çalıştırılır (salt okunur; model ve internet kullanılmaz).",
  "core.ruleSchedWarn": "Zamanlanmış görev kendiliğinden başlamaz: yalnız sizin kurduğunuz kural çalışır; onay gerektiren adımlar siz onaylayana kadar BEKLER; model/internet çağrısı yapılmaz.",
  "core.ruleRunNowTitle": "Kural şimdi çalıştırılsın mı?",
  "core.ruleRunNowDetail": "Zamanlı kural, takvimini beklemeden bir kez çalıştırılır (bekleme süresi ve sınırlar geçerlidir). Onay gerektiren adımlar siz onaylayana kadar bekler; model/internet çağrısı yapılmaz.",
  "core.rule.runBusy": "Bu kural şu an çalışıyor; bitince yeniden deneyin.",
  "core.rule.runRate": "Bu kural için dakikada en çok 5 deneme yapılabilir; biraz bekleyin.",
  "core.rule.runNotAllowed": "Yalnız açık ve zamanlı kurallar şimdi çalıştırılabilir.",
  "core.rule.runUnknown": "Kural bulunamadı; liste yenileniyor."
});
// (durum metinleri safe.js içinde 'status' modülü olarak kaydedilir)
