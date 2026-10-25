// AgentMom "Güvenlik ve Yetkiler" sayfası (Faz 11, D3). Yazan: Claude [İP:AgentMom Faz 11 / sayfalar]. Sahip: Yusuf.
// Ne: AM_PAGES.register("security", ...). Politika özeti (AM.state.policy): izinli / onay isteyen eylemler, klasör sayıları ve yolları, güvenilir depolar, izinli sağlayıcılar, ücretli rota.
// Kural: politika YALNIZ OKUNUR (değiştirme düğmesi yok); tek yazma eylemleri çekirdekte onay penceresiyle: izin İPTALİ ve otomasyon kuralı aç/kapat (oluşturma formları da çekirdekteki doğrulama + onay penceresinden geçer: izin, defter kaydı, otomasyon kuralı); belirteç/anahtar asla gösterilmez (maskelenir); veri yalnız AM.state.policy; ağ yok; metin yalnız textContent. Değiştirme: yalnız sahibi.
"use strict";
(function () {
  var ID = "security";
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
    "page-security.intro": "Etkin güvenlik politikası. Politika burada değiştirilemez; geçici izin, defter ve otomasyon bölümleri yalnız kullanıcı içindir.",
    "page-security.noPolicy": "Politika yüklenemedi; güvenlik bilgisi gösterilemiyor. Eksik bilgi 'izinli' anlamına gelmez.",
    "page-security.summary": "Özet",
    "page-security.cAllowed": "İzinli eylem", "page-security.cApproval": "Onay isteyen eylem", "page-security.cAllowedDirs": "İzinli klasör", "page-security.cForbiddenDirs": "Yasaklı klasör",
    "page-security.cTrusted": "Güvenilir depo", "page-security.cProviders": "İzinli sağlayıcı", "page-security.cPaid": "Ücretli rota", "page-security.cRuntime": "Azami çalışma süresi",
    "page-security.paidOff": "KAPALI", "page-security.paidOffSub": "Ücretli sağlayıcıya otomatik yönlendirme yok.", "page-security.paidOn": "AÇIK (onaylı)",
    "page-security.paidOnSub": "Ücretli rota onaylanmış; kullanım ücret doğurabilir.", "page-security.paidUnknown": "Bilinmiyor", "page-security.paidUnknownSub": "Politika değeri okunamadı; KAPALI varsayılmaz.",
    "page-security.runtimeSec": "{n} sn", "page-security.runtimeUnknown": "Bildirilmedi",
    "page-security.allowedActions": "İzinli eylemler", "page-security.allowedActionsDesc": "Onay istemeden yapılabilen eylemler.", "page-security.noAllowedActions": "İzinli eylem tanımlı değil.",
    "page-security.approvalActions": "Onay isteyen eylemler", "page-security.approvalActionsDesc": "Yusuf onaylamadan yapılmaz.", "page-security.noApprovalActions": "Onay isteyen eylem tanımlı değil.",
    "page-security.allowedDirs": "İzinli klasörler", "page-security.noAllowedDirs": "İzinli klasör yok.",
    "page-security.forbiddenDirs": "Yasaklı klasörler", "page-security.noForbiddenDirs": "Yasaklı klasör yok.",
    "page-security.trusted": "Güvenilir depolar", "page-security.noTrusted": "Güvenilir depo yok.",
    "page-security.providers": "İzinli sağlayıcılar", "page-security.noProviders": "Liste boş: hiçbir sağlayıcı açıkça izinli değil.",
    "page-security.rulesTitle": "Değişmez kurallar",
    "page-security.noDelete": "Kalıcı silme yoktur: silme yalnız Geri Dönüşüm Kutusu'na taşıyarak yapılır ve kararı yalnız Yusuf verir. Arayüzde 'Sil' düğmesi bulunmaz; yalnız geri alınabilir 'Arşivle' vardır.",
    "page-security.changeNote": "Politikayı yalnız Yusuf açık onayıyla değiştirir. Bu sayfada değiştirme düğmesi yoktur; ajanlar politikayı genişletemez.",
    "page-security.secretNote": "Belirteç, anahtar ve parola bu sayfada hiçbir koşulda gösterilmez.",
    "page-security.contract": "Politika sözleşmesi",
    "page-security.secretsTitle": "Sır referansları", "page-security.secretsDesc": "Windows Kimlik Bilgisi Yöneticisi'ndeki 'agentmom:' girdilerinin YALNIZ adları. Değerler hiçbir koşulda okunmaz, yazılmaz ya da gösterilmez.",
    "page-security.secretsEmpty": "Kayıtlı sır referansı yok (AgentMom şu an hiçbir sağlayıcı anahtarı saklamıyor: abonelik rotası, API anahtarı yok).", "page-security.secretsUnavailable": "Sır deposu listelenemedi; bu 'sır yok' demek değildir.",
    "page-security.rolesTitle": "Yetki modeli (tek sahip)", "page-security.rolesDesc": "AgentMom yalnız Yusuf içindir: çok kullanıcı, hesap ya da paylaşım yoktur. Aşağıdaki ayrım uygulamada zorunludur (ajan belirteci yönetim uçlarında 403 alır; testle doğrulanır).",
    "page-security.roleUser": "Kullanıcı (Yusuf)", "page-security.roleUserCan": "Onay/ret, sağlayıcı test/devre dışı, yedek, alt oturum adlandırma ve arşivleme, bellek/karar/beceri kararları. Politikayı genişletmek yalnız depo dışındaki kullanıcı yapılandırma dosyasıyla yapılır; uygulamadan değil.",
    "page-security.roleAgent": "Ajanlar", "page-security.roleAgentCan": "Yalnız görev KAYDI oluşturabilir (task.create). Onaylayamaz, politikayı/ayarı değiştiremez, alt oturum adını değiştiremez, yönetim uçlarını çağıramaz.",
    "page-security.semTitle": "Eylem anlamları ve geri alma haritası", "page-security.semDesc": "Her eylemin ne yaptığı, geri alınıp alınamadığı ve nasıl geri alındığı. Bilinmeyen 'geri alınabilir' sayılmaz.",
    "page-security.semSearch": "Eylemlerde ara", "page-security.semSearchHint": "Eylem, etki ya da geri alma yolunda ara…", "page-security.semRevLabel": "Geri alınabilirlik süzgeci", "page-security.semRevAll": "Tümü",
    "page-security.semCaption": "Eylem anlamları ve geri alma haritası", "page-security.semColAction": "Eylem", "page-security.semColEffect": "Ne yapar", "page-security.semColRev": "Geri alınabilir mi", "page-security.semColUndo": "Nasıl geri alınır", "page-security.semColSens": "Hassasiyet",
    "page-security.semEmpty": "Eylem anlamı kaydı yok.", "page-security.semNoMatch": "Süzgece uyan eylem yok.", "page-security.semShown": "{n} / {toplam} eylem",
    "page-security.rev.yes": "Geri alınabilir", "page-security.rev.partial": "Kısmen", "page-security.rev.no": "GERİ ALINAMAZ", "page-security.rev.unknown": "Bilinmiyor",
    "page-security.semNoUndo": "Geri alma yolu bildirilmedi", "page-security.sensUnknown": "Bilinmiyor",
    "page-security.roleSystem": "Sistem (zamanlayıcı)", "page-security.roleSystemCan": "Yalnız yedek zamanlayıcısı: yedek alma/doğrulama (ek, üzerine yazmaz, silmez); politika/ACL değiştiremez.",
    "page-security.actionFailed": "İşlem yapılamadı",
    "page-security.createFailed": "Kayıt eklenemedi", "page-security.createDone": "Eklendi. Liste yenilendi.",
    "page-security.form.add": "Ekle", "page-security.form.choose": "Seçin…",
    "page-security.form.act.file_read": "Dosya okuma (file.read)", "page-security.form.act.file_write": "Dosya yazma (file.write)", "page-security.form.act.verification_run": "Doğrulama çalıştırma (verification.run)",
    "page-security.form.grantTitle": "Yeni izin ekle",
    "page-security.form.grantWarn": "İzin yalnız 'onay gerekir' kararını önceden onaylar; yasak klasör, bütçe ve ücretli rota reddini gevşetmez; ajan izin veremez.",
    "page-security.form.gAction": "Eylem", "page-security.form.gActionHelp": "İzin verilecek eylem. Yalnız bu üç eylem için geçici izin verilebilir.",
    "page-security.form.gDir": "Klasör", "page-security.form.gDirHelp": "İznin geçerli olacağı klasörün tam yolu. Sözleşmenin izinli klasörlerinin içinde olmalı, yasak klasör olmamalı.",
    "page-security.form.gReason": "Gerekçe", "page-security.form.gReasonHelp": "İznin neden verildiği (3-300 karakter). Denetim kaydına yazılır.",
    "page-security.form.gTtl": "Süre (dakika)", "page-security.form.gTtlHelp": "İznin geçerli kalacağı süre: 1 ile 1440 dakika (en çok 24 saat).",
    "page-security.form.gUses": "Kullanım sayısı", "page-security.form.gUsesHelp": "İznin en çok kaç kez kullanılabileceği: 1 ile 100.",
    "page-security.form.changeTitle": "Yeni kayıt ekle",
    "page-security.form.changeNote": "Deftere elle (manual) bilgi notu eklenir; bu kayıt hiçbir dosyayı değiştirmez ve izin vermez.",
    "page-security.form.cSummary": "Özet", "page-security.form.cSummaryHelp": "Yapılan değişikliğin kısa özeti (3-200 karakter).",
    "page-security.form.cReason": "Gerekçe", "page-security.form.cReasonHelp": "Değişikliğin neden yapıldığı (3-500 karakter).",
    "page-security.form.cTask": "Görev kimliği (isteğe bağlı)", "page-security.form.cTaskHelp": "İlgili görevin kimliği; yoksa boş bırakın.",
    "page-security.form.cFiles": "Dosyalar (isteğe bağlı)", "page-security.form.cFilesHelp": "Etkilenen dosya yolları, satır başına bir yol (en çok 50 yol); yoksa boş bırakın.",
    "page-security.form.ruleTitle": "Yeni kural ekle",
    "page-security.form.ruleNote": "Kural açık başlar; yalnız bildirir ya da politikadan geçen görev kaydı açar. Otomasyon izin veremez.",
    "page-security.form.rName": "Kural adı", "page-security.form.rNameHelp": "Kuralı tanımak için kısa ad (3-80 karakter).",
    "page-security.form.rPattern": "Olay deseni", "page-security.form.rPatternHelp": "Kuralın hangi olaylarda çalışacağı: tam olay adı (backup.failed) ya da sonu * ile biten önek (task.*). Yalnız '*' ve 'automation.' ile başlayan desen olmaz.",
    "page-security.form.rKind": "Eylem türü", "page-security.form.rKindHelp": "Bildir: yalnız bildirim gösterir. Görev kaydı aç: politikadan geçen bir görev kaydı oluşturur.",
    "page-security.form.rMessage": "Bildirim iletisi", "page-security.form.rMessageHelp": "Olay olunca gösterilecek ileti (3-300 karakter).",
    "page-security.form.rTitle": "Görev başlığı", "page-security.form.rTitleHelp": "Açılacak görev kaydının başlığı (3-200 karakter).",
    "page-security.form.rTaskAct": "Görev eylemi", "page-security.form.rTaskActHelp": "Görev kaydının eylemi: dosya okuma ya da doğrulama çalıştırma.",
    "page-security.form.rTarget": "Görev hedefi", "page-security.form.rTargetHelp": "Eylemin uygulanacağı dosya ya da klasör yolu (en çok 500 karakter).",
    "page-security.form.rCool": "Bekleme süresi (sn)", "page-security.form.rCoolHelp": "Kuralın iki çalışması arasındaki en kısa süre: 10 ile 86400 saniye.",
    "page-security.grants.title": "Geçici yetenek izinleri",
    "page-security.grants.desc": "İzin yalnız 'onay gerekir' kararını önceden onaylar; yasak klasör, bütçe, ücretli rota ve sözleşme reddini gevşetmez. Aşağıdan yeni izin eklenebilir; etkin izin iptal edilebilir.",
    "page-security.grants.empty": "Geçici izin kaydı yok.",
    "page-security.grants.caption": "Geçici yetenek izinleri",
    "page-security.grants.colAction": "Eylem", "page-security.grants.colScope": "Kapsam klasörü", "page-security.grants.colUses": "Kalan kullanım", "page-security.grants.colExpires": "Bitiş",
    "page-security.grants.colState": "Durum", "page-security.grants.colReason": "Gerekçe", "page-security.grants.colOps": "İşlem",
    "page-security.grants.usesVal": "{n} / {toplam}",
    "page-security.grants.revoke": "İptal et",
    "page-security.grants.st.active": "Etkin", "page-security.grants.st.exhausted": "Tükendi", "page-security.grants.st.expired": "Süresi doldu", "page-security.grants.st.revoked": "İptal edildi", "page-security.grants.st.unknown": "Bilinmiyor",
    "page-security.changes.title": "Değişiklik defteri",
    "page-security.changes.desc": "Yapılan değişikliklerin kaydı; en yeni üstte. Elle bilgi notu eklenebilir.",
    "page-security.changes.empty": "Değişiklik kaydı yok.",
    "page-security.changes.caption": "Değişiklik defteri",
    "page-security.changes.colTime": "Zaman", "page-security.changes.colKind": "Tür", "page-security.changes.colSummary": "Özet", "page-security.changes.colReason": "Gerekçe", "page-security.changes.colActor": "Kim",
    "page-security.changes.shown": "{n} / {toplam} kayıt gösteriliyor (en yeniler).",
    "page-security.automation.title": "Otomasyon",
    "page-security.automation.desc": "Kurallar yalnız bildirir ya da politikadan geçen görev kaydı açar; otomasyon izin veremez; kendi olayları kural tetiklemez.",
    "page-security.automation.empty": "Otomasyon kuralı yok.",
    "page-security.automation.caption": "Otomasyon kuralları",
    "page-security.automation.colName": "Ad", "page-security.automation.colPattern": "Olay deseni", "page-security.automation.colAction": "Eylem", "page-security.automation.colCooldown": "Bekleme", "page-security.automation.colEnabled": "Durum",
    "page-security.automation.act.notify": "Bildir", "page-security.automation.act.record_task": "Görev kaydı aç", "page-security.automation.act.unknown": "Bilinmiyor",
    "page-security.automation.on": "Açık", "page-security.automation.off": "Kapalı", "page-security.automation.stateUnknown": "Bilinmiyor",
    "page-security.automation.turnOn": "Aç", "page-security.automation.turnOff": "Kapat",
    "page-security.automation.runsTitle": "Son çalışmalar", "page-security.automation.runsEmpty": "Henüz çalışma kaydı yok.", "page-security.automation.runsCaption": "Otomasyon son çalışmaları",
    "page-security.automation.runRule": "Kural", "page-security.automation.runOutcome": "Sonuç", "page-security.automation.runMessage": "İleti",
    "page-security.automation.run.notified": "Bildirildi", "page-security.automation.run.task_recorded": "Görev kaydı açıldı", "page-security.automation.run.skipped_cooldown": "Bekleme nedeniyle atlandı",
    "page-security.automation.run.skipped_rate": "Saatlik sınır nedeniyle atlandı", "page-security.automation.run.error": "Hata", "page-security.automation.run.unknown": "Bilinmiyor",
    "page-security.automation.run.scheduled_ok": "Zamanlanmış çalıştı", "page-security.automation.run.missed": "Kaçırıldı",
    "page-security.automation.act.run_analysis": "Analiz çalıştır",
    "page-security.automation.colTrigger": "Tetikleyici", "page-security.automation.colNext": "Sonraki çalışma",
    "page-security.automation.runNow": "Şimdi çalıştır", "page-security.automation.noNext": "—",
    "page-security.automation.eventTrigger": "olay: {desen}",
    "page-security.automation.runNowDone": "Kural çalıştırıldı: {sonuc}", "page-security.automation.runNowSkipped": "Kural bu kez çalıştırılmadı (atlandı): {neden}",
    "page-security.form.rTrig": "Tetikleyici türü", "page-security.form.rTrigHelp": "Olay: denetim kaydındaki bir olayda çalışır. Zamanlı: aralık ya da günlük saat geldiğinde çalışır.",
    "page-security.form.rTrigEvent": "Olay", "page-security.form.rTrigSched": "Zamanlı",
    "page-security.form.rSKind": "Zamanlama", "page-security.form.rSKindHelp": "Belirli aralıkla ya da her gün belirli saatte.",
    "page-security.form.rSInterval": "Her N dakikada bir", "page-security.form.rSDaily": "Her gün belirli saatte",
    "page-security.form.rEvery": "Aralık (dakika)", "page-security.form.rEveryHelp": "15 ile 10080 (7 gün) arasında tam sayı.",
    "page-security.form.rAt": "Saat (HH:MM)", "page-security.form.rAtHelp": "Yerel saat, 00:00 ile 23:59 arası. Örnek: 09:00.",
    "page-security.form.rDays": "Günler", "page-security.form.rDaysHelp": "Hiçbiri seçilmezse her gün çalışır.",
    "page-security.form.day.1": "Pazartesi", "page-security.form.day.2": "Salı", "page-security.form.day.3": "Çarşamba", "page-security.form.day.4": "Perşembe", "page-security.form.day.5": "Cuma", "page-security.form.day.6": "Cumartesi", "page-security.form.day.7": "Pazar",
    "page-security.form.rAnalysis": "Analiz", "page-security.form.rAnalysisHelp": "Salt okunur analiz çalıştırılır; model ve internet kullanılmaz.",
    "page-security.form.analysis.attention": "Dikkat sırası", "page-security.form.analysis.halflife": "Bilgi yarı ömrü", "page-security.form.analysis.learning": "Öğrenme getirisi", "page-security.form.analysis.absence": "Eksiklik ve fazlalık",
    "page-security.form.analysis.continuity": "Yetenek sürekliliği", "page-security.form.analysis.offline": "Çevrimdışı süreklilik", "page-security.form.analysis.shadow-price": "Kaynak gölge fiyatı",
    "page-security.form.rCoolSched": "Zamanlı kuralda bekleme süresi çalışma aralığından (günlük kuralda 86400 sn) uzun olamaz.",
    "page-security.form.rSchedWarn": "Zamanlanmış görev kendiliğinden başlamaz: yalnız sizin kurduğunuz kural çalışır; onay gerektiren adımlar siz onaylayana kadar BEKLER; model/internet çağrısı yapılmaz.",
    "page-security.form.rSchedInfo": "En çok {max} açık zamanlı kural olabilir; şu an {n} açık."
  };
  if (typeof window.AM_REGISTER_TR === "function") window.AM_REGISTER_TR("page-security", TR);
  function T(key, vars) { return K.T(key, vars); }

  function arr(v) { return Array.isArray(v) ? v : []; }
  function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }

  // ---- saf mantık ----
  function cleanList(l) { return arr(l).map(function (x) { return PU.maskSecrets(PU.clean(x, 300)); }).filter(function (x) { return x !== ""; }); }
  function paidKind(v) { return v === "none" ? "none" : v === "approved" ? "approved" : "unknown"; }
  function policySummary(policy) {
    if (!isObj(policy)) return null;
    var lists = {
      allowedActions: cleanList(policy.allowedActions), approvalActions: cleanList(policy.approvalRequiredActions), allowedDirs: cleanList(policy.allowedDirs),
      forbiddenDirs: cleanList(policy.forbiddenDirs), trustedRepos: cleanList(policy.trustedRepos), allowedProviders: cleanList(policy.allowedProviders)
    };
    var ms = Number(policy.maxRuntimeMs);
    return {
      lists: lists,
      counts: {
        allowedActions: lists.allowedActions.length, approvalActions: lists.approvalActions.length, allowedDirs: lists.allowedDirs.length,
        forbiddenDirs: lists.forbiddenDirs.length, trustedRepos: lists.trustedRepos.length, allowedProviders: lists.allowedProviders.length
      },
      paid: paidKind(policy.paidRoute), maxRuntimeSec: isFinite(ms) && ms > 0 && policy.maxRuntimeMs !== null && policy.maxRuntimeMs !== "" ? Math.round(ms / 1000) : null,
      contractId: PU.maskSecrets(PU.clean(policy.contractId, 100))
    };
  }

  // ---- eylem anlamları ----
  var REV = { yes: ["ok", "✓"], partial: ["warn", "▲"], no: ["bad", "✕"], unknown: ["muted", "○"] };
  function revKind(v) { return v === "yes" || v === "partial" || v === "no" ? v : "unknown"; }
  function revLabel(k) { return k === "yes" ? T("page-security.rev.yes") : k === "partial" ? T("page-security.rev.partial") : k === "no" ? T("page-security.rev.no") : T("page-security.rev.unknown"); }
  function semRows(value) {
    var list = isObj(value) ? arr(value.actions) : [];
    return list.filter(isObj).map(function (a) {
      return { action: PU.maskSecrets(PU.clean(a.action, 120)), effect: PU.maskSecrets(PU.clean(a.effect, 300)), reversible: revKind(a.reversible), undo: PU.maskSecrets(PU.clean(a.undo, 300)), sensitivity: PU.maskSecrets(PU.clean(a.sensitivity, 60)) };
    });
  }
  function filterSem(rows, f) {
    var q = f && typeof f.q === "string" ? f.q : "", rev = f && typeof f.rev === "string" ? f.rev : "";
    return arr(rows).filter(function (r) {
      if (rev && r.reversible !== rev) return false;
      return !q.trim() || PU.matchesText([r.action, r.effect, r.undo, r.sensitivity].join(" "), q);
    });
  }
  var semLocal = { q: "", rev: "" };

  // ---- çizim ----
  function semSection(AM, root) {
    var gate = K.advancedHidden(AM, "semantics");
    var body = K.section(root, T("page-security.semTitle"), { desc: T("page-security.semDesc"), advanced: "semantics" });
    if (gate) return; // basit kip: bölüm daraldı, veri de istenmez
    var entry = K.ensureData(AM, "actionSemantics");
    K.asyncBody(body, entry, function () { K.reload(AM, "actionSemantics"); }, function (value) {
      var rows = semRows(value);
      if (!rows.length) { body.appendChild(K.emptyCard(T("page-security.semEmpty"))); return; }
      var shown = filterSem(rows, semLocal);
      var bar = K.el("div", "am-pg-filters");
      var sid = K.nextId("sq"), rid = K.nextId("sr");
      var f1 = K.el("div", "am-pg-field");
      var l1 = K.el("label", "am-pg-label", T("page-security.semSearch")); l1.setAttribute("for", sid);
      var inp = K.el("input", "am-pg-input");
      inp.id = sid; inp.type = "search"; inp.value = semLocal.q; inp.placeholder = T("page-security.semSearchHint"); inp.autocomplete = "off"; inp.maxLength = 100;
      inp.setAttribute("data-am-key", "sem-q");
      inp.addEventListener("input", function (ev) { if (ev && ev.isComposing) return; semLocal.q = String(inp.value).slice(0, 100); P.rerender(); });
      inp.addEventListener("compositionend", function () { semLocal.q = String(inp.value).slice(0, 100); P.rerender(); });
      f1.appendChild(l1); f1.appendChild(inp);
      var f2 = K.el("div", "am-pg-field");
      var l2 = K.el("label", "am-pg-label", T("page-security.semRevLabel")); l2.setAttribute("for", rid);
      var sel = K.el("select", "am-pg-input");
      sel.id = rid; sel.setAttribute("data-am-key", "sem-rev");
      [["", T("page-security.semRevAll")], ["no", T("page-security.rev.no")], ["partial", T("page-security.rev.partial")], ["yes", T("page-security.rev.yes")], ["unknown", T("page-security.rev.unknown")]].forEach(function (p) {
        var o = K.el("option", null, p[1]); o.value = p[0]; if (p[0] === semLocal.rev) o.selected = true; sel.appendChild(o);
      });
      sel.value = semLocal.rev;
      sel.addEventListener("change", function () { semLocal.rev = revKind(String(sel.value)) === "unknown" && sel.value !== "unknown" ? "" : String(sel.value); P.rerender(); });
      f2.appendChild(l2); f2.appendChild(sel);
      bar.appendChild(f1); bar.appendChild(f2);
      body.appendChild(bar);
      body.appendChild(K.el("p", "am-pg-count", T("page-security.semShown", { n: PU.fmtNum(shown.length), toplam: PU.fmtNum(rows.length) })));
      if (!shown.length) { body.appendChild(K.emptyCard(T("page-security.semNoMatch"))); return; }
      K.table(body, {
        caption: T("page-security.semCaption"),
        cols: [{ label: T("page-security.semColAction") }, { label: T("page-security.semColEffect") }, { label: T("page-security.semColRev") }, { label: T("page-security.semColUndo") }, { label: T("page-security.semColSens") }],
        rows: shown.map(function (r) {
          var rv = REV[r.reversible];
          var badge = K.el("span", "am-pg-st am-pg-tone-" + rv[0]);
          var sh = K.el("span", "am-pg-shape", rv[1]); sh.setAttribute("aria-hidden", "true");
          badge.appendChild(sh);
          badge.appendChild(K.el("span", "am-pg-st-t", revLabel(r.reversible)));
          return { cells: [K.el("code", "am-pg-code", r.action || T("pages.dash")), r.effect || T("pages.dash"), badge, r.undo || T("page-security.semNoUndo"), r.sensitivity || T("page-security.sensUnknown")] };
        })
      });
    });
  }

  // ---- Geçici yetenek izinleri, değişiklik defteri, otomasyon (listeleme + iptal/aç-kapat; oluşturma arayüzü YOK) ----
  var GRANT_ST = { active: ["ok", "✓", "page-security.grants.st.active"], exhausted: ["muted", "○", "page-security.grants.st.exhausted"], expired: ["warn", "◷", "page-security.grants.st.expired"], revoked: ["bad", "✕", "page-security.grants.st.revoked"], unknown: ["muted", "?", "page-security.grants.st.unknown"] };
  function grantKind(v) { return v === "active" || v === "exhausted" || v === "expired" || v === "revoked" ? v : "unknown"; }
  function numOrNull(v) { return typeof v === "number" && isFinite(v) && v >= 0 ? Math.floor(v) : null; }
  function cleanText(v, max) { return PU.maskSecrets(PU.clean(v, max || 300)); }
  function grantRows(value) {
    var list = isObj(value) ? arr(value.grants) : [];
    return list.filter(isObj).map(function (g) {
      var max = numOrNull(g.maxUses), used = numOrNull(g.uses);
      return {
        id: PU.clean(g.id, 80), action: cleanText(g.action, 120), scopeDir: cleanText(g.scopeDir, 300), reason: cleanText(g.reason, 300), createdBy: cleanText(g.createdBy, 80),
        expiresAt: PU.formatTime(g.expiresAt) || cleanText(g.expiresAt, 40), maxUses: max, uses: used, remaining: max !== null && used !== null ? Math.max(0, max - used) : null, state: grantKind(g.state)
      };
    });
  }
  function badge(tone, shape, text) {
    var b = K.el("span", "am-pg-st am-pg-tone-" + tone);
    var sh = K.el("span", "am-pg-shape", shape); sh.setAttribute("aria-hidden", "true");
    b.appendChild(sh);
    b.appendChild(K.el("span", "am-pg-st-t", text));
    return b;
  }
  function showActionErrors(body, AM, prefix, ids) {
    var d = AM && AM.state && isObj(AM.state.data) ? AM.state.data : {};
    var n = 0;
    ids.forEach(function (id) {
      var e = d[prefix + id];
      if (n < 3 && isObj(e) && e.status === "error") { n++; body.appendChild(K.errorCard(cleanText(e.reason, 200) || T("pages.noData"), null, T("page-security.actionFailed"))); }
    });
  }

  // ---- Oluşturma formları (izin, defter, kural): "Yeni ... ekle" açılır kısmı; doğrulama + onay penceresi + POST çekirdekte (AM.actions.grantCreate / changeCreate / ruleCreate) ----
  // Form durumu modül düzeyinde HAM değerlerle tutulur (yeniden çizimde yazılanlar kaybolmasın); gönderimde ham gider, ekranda yalnız textContent/value.
  var GRANT_DEFAULT = { open: false, action: "", scopeDir: "", reason: "", ttl: "60", uses: "1" };
  var CHANGE_DEFAULT = { open: false, summary: "", reason: "", taskId: "", files: "" };
  var RULE_DEFAULT = { open: false, name: "", pattern: "", kind: "notify", message: "", title: "", taskAction: "file.read", target: "", cooldown: "300", trig: "event", sKind: "interval", every: "60", at: "09:00", days: "", analysis: "attention" };
  var DAY_TR = { 1: "page-security.form.day.1", 2: "page-security.form.day.2", 3: "page-security.form.day.3", 4: "page-security.form.day.4", 5: "page-security.form.day.5", 6: "page-security.form.day.6", 7: "page-security.form.day.7" };
  var ANALYSIS_TR = { attention: "page-security.form.analysis.attention", halflife: "page-security.form.analysis.halflife", learning: "page-security.form.analysis.learning", absence: "page-security.form.analysis.absence", continuity: "page-security.form.analysis.continuity", offline: "page-security.form.analysis.offline", "shadow-price": "page-security.form.analysis.shadow-price" };
  var ANALYSIS_IDS = ["attention", "halflife", "learning", "absence", "continuity", "offline", "shadow-price"];
  var fGrant = Object.assign({}, GRANT_DEFAULT), fChange = Object.assign({}, CHANGE_DEFAULT), fRule = Object.assign({}, RULE_DEFAULT);
  function resetForm(st, def) { Object.keys(def).forEach(function (k) { if (k !== "open") st[k] = def[k]; }); }

  // o: { key, label, help, type: input|select|textarea, get, set, options?, placeholder?, numeric?, onChange? }
  function formField(parent, o) {
    var wrap = K.el("div", "am-pg-field am-pg-field--form");
    var id = K.nextId("f"), hid = K.nextId("fh");
    var lab = K.el("label", "am-pg-label", o.label); lab.setAttribute("for", id);
    var c;
    if (o.type === "select") {
      c = K.el("select", "am-pg-input");
      o.options.forEach(function (p) { var op = K.el("option", null, p[1]); op.value = p[0]; if (p[0] === o.get()) op.selected = true; c.appendChild(op); });
      c.value = o.get();
    } else if (o.type === "textarea") {
      c = K.el("textarea", "am-pg-input am-pg-textarea"); c.rows = 4; c.value = o.get(); c.maxLength = 20000;
    } else {
      c = K.el("input", "am-pg-input"); c.type = "text"; c.value = o.get(); c.autocomplete = "off"; c.maxLength = 1000;
      if (o.numeric) c.setAttribute("inputmode", "numeric");
    }
    c.id = id; c.setAttribute("data-am-key", o.key); c.setAttribute("aria-describedby", hid);
    if (o.placeholder) c.placeholder = o.placeholder;
    function take() { o.set(String(c.value)); if (o.onChange) o.onChange(); }
    c.addEventListener(o.type === "select" ? "change" : "input", function (ev) { if (ev && ev.isComposing) return; take(); });
    if (o.type !== "select") c.addEventListener("compositionend", take);
    var help = K.el("p", "am-pg-help", o.help); help.id = hid;
    wrap.appendChild(lab); wrap.appendChild(c); wrap.appendChild(help);
    parent.appendChild(wrap);
    return c;
  }
  function formBox(parent, o) {
    var d = K.el("details", "am-pg-details");
    d.open = o.st.open === true;
    d.addEventListener("toggle", function () { o.st.open = d.open === true; });
    var sm = K.el("summary", "am-pg-summary", o.title); sm.setAttribute("data-am-key", o.key + "-toggle");
    d.appendChild(sm);
    var box = K.el("div", "am-pg-form"); box.setAttribute("role", "group"); box.setAttribute("aria-label", o.title);
    if (o.note) box.appendChild(K.el("p", "am-pg-formnote", o.note));
    o.build(box);
    var row = K.el("div", "am-pg-actions");
    row.appendChild(K.button(T("page-security.form.add"), o.key + "-submit", o.submit));
    box.appendChild(row);
    d.appendChild(box);
    parent.appendChild(d);
    return d;
  }
  function submitCreate(AM, name, fields, st, def) {
    var r = K.act(name, fields);
    if (r && typeof r.then === "function") r.then(function (out) { if (out && out.ok === true) resetForm(st, def); P.rerender(); }, function () { /* hata çekirdekte AM.state.data'ya yazılır */ });
  }
  function createResult(AM, body, stateKey) {
    var e = AM && AM.state && isObj(AM.state.data) ? AM.state.data[stateKey] : null;
    if (!isObj(e)) return;
    if (e.status === "error") body.appendChild(K.errorCard(cleanText(e.reason, 400) || T("pages.noData"), null, T("page-security.createFailed")));
    else if (e.status === "ok") { var ok = K.el("p", "am-pg-ok", T("page-security.createDone")); ok.setAttribute("role", "status"); body.appendChild(ok); }
  }
  var GRANT_ACT_OPTS = function () { return [["", T("page-security.form.choose")], ["file.read", T("page-security.form.act.file_read")], ["file.write", T("page-security.form.act.file_write")], ["verification.run", T("page-security.form.act.verification_run")]]; };

  function grantForm(AM, body) {
    var st = fGrant;
    formBox(body, {
      key: "grant-new", st: st, title: T("page-security.form.grantTitle"), note: T("page-security.form.grantWarn"),
      build: function (box) {
        formField(box, { key: "gf-action", label: T("page-security.form.gAction"), help: T("page-security.form.gActionHelp"), type: "select", options: GRANT_ACT_OPTS(), get: function () { return st.action; }, set: function (v) { st.action = v; } });
        formField(box, { key: "gf-dir", label: T("page-security.form.gDir"), help: T("page-security.form.gDirHelp"), type: "input", placeholder: "D:\\YusufII\\Projeler\\proje", get: function () { return st.scopeDir; }, set: function (v) { st.scopeDir = v; } });
        formField(box, { key: "gf-reason", label: T("page-security.form.gReason"), help: T("page-security.form.gReasonHelp"), type: "input", get: function () { return st.reason; }, set: function (v) { st.reason = v; } });
        formField(box, { key: "gf-ttl", label: T("page-security.form.gTtl"), help: T("page-security.form.gTtlHelp"), type: "input", numeric: true, get: function () { return st.ttl; }, set: function (v) { st.ttl = v; } });
        formField(box, { key: "gf-uses", label: T("page-security.form.gUses"), help: T("page-security.form.gUsesHelp"), type: "input", numeric: true, get: function () { return st.uses; }, set: function (v) { st.uses = v; } });
      },
      submit: function () { submitCreate(AM, "grantCreate", { action: st.action, scopeDir: st.scopeDir, reason: st.reason, ttlMinutes: st.ttl, maxUses: st.uses }, st, GRANT_DEFAULT); }
    });
    createResult(AM, body, "grantCreate");
  }
  function changeForm(AM, body) {
    var st = fChange;
    formBox(body, {
      key: "change-new", st: st, title: T("page-security.form.changeTitle"), note: T("page-security.form.changeNote"),
      build: function (box) {
        formField(box, { key: "cf-summary", label: T("page-security.form.cSummary"), help: T("page-security.form.cSummaryHelp"), type: "input", get: function () { return st.summary; }, set: function (v) { st.summary = v; } });
        formField(box, { key: "cf-reason", label: T("page-security.form.cReason"), help: T("page-security.form.cReasonHelp"), type: "input", get: function () { return st.reason; }, set: function (v) { st.reason = v; } });
        formField(box, { key: "cf-task", label: T("page-security.form.cTask"), help: T("page-security.form.cTaskHelp"), type: "input", get: function () { return st.taskId; }, set: function (v) { st.taskId = v; } });
        formField(box, { key: "cf-files", label: T("page-security.form.cFiles"), help: T("page-security.form.cFilesHelp"), type: "textarea", get: function () { return st.files; }, set: function (v) { st.files = v; } });
      },
      submit: function () { submitCreate(AM, "changeCreate", { summary: st.summary, reason: st.reason, taskId: st.taskId, files: st.files }, st, CHANGE_DEFAULT); }
    });
    createResult(AM, body, "changeCreate");
  }
  function dayBoxes(parent, st) {
    var wrap = K.el("fieldset", "am-pg-field am-pg-field--form");
    wrap.appendChild(K.el("legend", "am-pg-label", T("page-security.form.rDays")));
    var row = K.el("div", "am-pg-days");
    [1, 2, 3, 4, 5, 6, 7].forEach(function (d) {
      var lab = K.el("label", "am-pg-daylab");
      var c = K.el("input", "am-pg-daybox"); c.type = "checkbox"; c.checked = String(st.days).indexOf(String(d)) >= 0;
      c.setAttribute("data-am-key", "rf-day-" + d);
      c.addEventListener("change", function () {
        var set = String(st.days).split("").filter(function (x) { return x !== String(d); });
        if (c.checked) set.push(String(d));
        st.days = set.sort().join("");
      });
      lab.appendChild(c); lab.appendChild(K.el("span", "am-pg-daytxt", T(DAY_TR[d])));
      row.appendChild(lab);
    });
    wrap.appendChild(row);
    wrap.appendChild(K.el("p", "am-pg-help", T("page-security.form.rDaysHelp")));
    parent.appendChild(wrap);
  }
  function scheduledCount(AM) {
    var d = AM && AM.state && isObj(AM.state.data) ? AM.state.data.automation : null;
    var v = isObj(d) && d.status === "ok" && isObj(d.value) ? d.value : null;
    var rules = v ? arr(v.rules).filter(isObj) : [];
    return { n: rules.filter(function (r) { return r.enabled === true && isObj(r.trigger) && r.trigger.kind === "schedule"; }).length, max: v && numOrNull(v.maxScheduleRules) ? numOrNull(v.maxScheduleRules) : 20, analyses: v && Array.isArray(v.analyses) ? v.analyses.filter(function (a) { return ANALYSIS_IDS.indexOf(a) >= 0; }) : ANALYSIS_IDS };
  }
  function ruleForm(AM, body) {
    var st = fRule;
    var sc = scheduledCount(AM);
    var sched = st.trig === "schedule";
    formBox(body, {
      key: "rule-new", st: st, title: T("page-security.form.ruleTitle"), note: T("page-security.form.ruleNote"),
      build: function (box) {
        formField(box, { key: "rf-name", label: T("page-security.form.rName"), help: T("page-security.form.rNameHelp"), type: "input", get: function () { return st.name; }, set: function (v) { st.name = v; } });
        formField(box, { key: "rf-trig", label: T("page-security.form.rTrig"), help: T("page-security.form.rTrigHelp"), type: "select", options: [["event", T("page-security.form.rTrigEvent")], ["schedule", T("page-security.form.rTrigSched")]], get: function () { return st.trig; }, set: function (v) { st.trig = v === "schedule" ? "schedule" : "event"; if (st.trig === "event" && st.kind === "run_analysis") st.kind = "notify"; }, onChange: function () { P.rerender(); } });
        if (sched) {
          box.appendChild(K.el("p", "am-pg-formnote am-pg-schedwarn", T("page-security.form.rSchedWarn")));
          box.appendChild(K.el("p", "am-pg-help", T("page-security.form.rSchedInfo", { max: sc.max, n: sc.n })));
          formField(box, { key: "rf-skind", label: T("page-security.form.rSKind"), help: T("page-security.form.rSKindHelp"), type: "select", options: [["interval", T("page-security.form.rSInterval")], ["daily", T("page-security.form.rSDaily")]], get: function () { return st.sKind; }, set: function (v) { st.sKind = v === "daily" ? "daily" : "interval"; }, onChange: function () { P.rerender(); } });
          if (st.sKind === "daily") {
            formField(box, { key: "rf-at", label: T("page-security.form.rAt"), help: T("page-security.form.rAtHelp"), type: "input", placeholder: "09:00", get: function () { return st.at; }, set: function (v) { st.at = v; } });
            dayBoxes(box, st);
          } else {
            formField(box, { key: "rf-every", label: T("page-security.form.rEvery"), help: T("page-security.form.rEveryHelp"), type: "input", numeric: true, get: function () { return st.every; }, set: function (v) { st.every = v; } });
          }
        }
        if (!sched) formField(box, { key: "rf-pattern", label: T("page-security.form.rPattern"), help: T("page-security.form.rPatternHelp"), type: "input", placeholder: "backup.failed  /  task.*", get: function () { return st.pattern; }, set: function (v) { st.pattern = v; } });
        formField(box, { key: "rf-kind", label: T("page-security.form.rKind"), help: T("page-security.form.rKindHelp"), type: "select", options: [["notify", T("page-security.automation.act.notify")], ["record_task", T("page-security.automation.act.record_task")]].concat(sched ? [["run_analysis", T("page-security.automation.act.run_analysis")]] : []), get: function () { return st.kind; }, set: function (v) { st.kind = v === "record_task" ? "record_task" : v === "run_analysis" && sched ? "run_analysis" : "notify"; }, onChange: function () { P.rerender(); } });
        if (st.kind === "run_analysis") {
          formField(box, { key: "rf-analysis", label: T("page-security.form.rAnalysis"), help: T("page-security.form.rAnalysisHelp"), type: "select", options: sc.analyses.map(function (a) { return [a, T(ANALYSIS_TR[a])]; }), get: function () { return st.analysis; }, set: function (v) { st.analysis = v; } });
        } else if (st.kind === "record_task") {
          formField(box, { key: "rf-title", label: T("page-security.form.rTitle"), help: T("page-security.form.rTitleHelp"), type: "input", get: function () { return st.title; }, set: function (v) { st.title = v; } });
          formField(box, { key: "rf-taskact", label: T("page-security.form.rTaskAct"), help: T("page-security.form.rTaskActHelp"), type: "select", options: [["file.read", T("page-security.form.act.file_read")], ["verification.run", T("page-security.form.act.verification_run")]], get: function () { return st.taskAction; }, set: function (v) { st.taskAction = v === "verification.run" ? "verification.run" : "file.read"; } });
          formField(box, { key: "rf-target", label: T("page-security.form.rTarget"), help: T("page-security.form.rTargetHelp"), type: "input", get: function () { return st.target; }, set: function (v) { st.target = v; } });
        } else {
          formField(box, { key: "rf-message", label: T("page-security.form.rMessage"), help: T("page-security.form.rMessageHelp"), type: "input", get: function () { return st.message; }, set: function (v) { st.message = v; } });
        }
        formField(box, { key: "rf-cool", label: T("page-security.form.rCool"), help: T("page-security.form.rCoolHelp") + (sched ? " " + T("page-security.form.rCoolSched") : ""), type: "input", numeric: true, get: function () { return st.cooldown; }, set: function (v) { st.cooldown = v; } });
      },
      submit: function () {
        var params = st.kind === "run_analysis" ? { analysis: st.analysis } : st.kind === "record_task" ? { title: st.title, action: st.taskAction, target: st.target } : { message: st.message };
        if (st.trig === "schedule") {
          var days = String(st.days).split("").filter(Boolean).map(Number);
          var schedule = st.sKind === "daily" ? (days.length ? { kind: "daily", at: st.at, weekdays: days } : { kind: "daily", at: st.at }) : { kind: "interval", everyMinutes: st.every };
          submitCreate(AM, "ruleCreate", { name: st.name, trigger: { kind: "schedule", schedule: schedule }, actionKind: st.kind, params: params, cooldownSeconds: st.cooldown }, st, RULE_DEFAULT);
          return;
        }
        submitCreate(AM, "ruleCreate", { name: st.name, eventPattern: st.pattern, actionKind: st.kind, params: params, cooldownSeconds: st.cooldown }, st, RULE_DEFAULT);
      }
    });
    createResult(AM, body, "ruleCreate");
  }

  function grantsSection(AM, root) {
    var body = K.section(root, T("page-security.grants.title"), { desc: T("page-security.grants.desc") });
    grantForm(AM, body);
    var entry = K.ensureData(AM, "grants");
    K.asyncBody(body, entry, function () { K.reload(AM, "grants"); }, function (value) {
      var rows = grantRows(value);
      if (!rows.length) { body.appendChild(K.emptyCard(T("page-security.grants.empty"))); return; }
      showActionErrors(body, AM, "grantAction:", rows.map(function (r) { return r.id; }));
      K.table(body, {
        caption: T("page-security.grants.caption"),
        cols: [{ label: T("page-security.grants.colAction") }, { label: T("page-security.grants.colScope") }, { label: T("page-security.grants.colUses") }, { label: T("page-security.grants.colExpires") }, { label: T("page-security.grants.colState") }, { label: T("page-security.grants.colReason") }, { label: T("page-security.grants.colOps") }],
        rows: rows.map(function (r) {
          var st = GRANT_ST[r.state];
          var ops = K.el("span", "am-pg-ops");
          if (r.state === "active" && r.id) ops.appendChild(K.button(T("page-security.grants.revoke"), "grant-revoke:" + r.id, function () { K.act("grantRevoke", r.id); }));
          else ops.textContent = T("pages.dash");
          return { cells: [K.el("code", "am-pg-code", r.action || T("pages.dash")), K.el("code", "am-pg-code", r.scopeDir || T("pages.dash")), r.remaining === null ? T("pages.dash") : T("page-security.grants.usesVal", { n: PU.fmtNum(r.remaining), toplam: PU.fmtNum(r.maxUses) }), r.expiresAt || T("pages.dash"), badge(st[0], st[1], T(st[2])), r.reason || T("pages.dash"), ops] };
        })
      });
    });
  }

  function newestFirst(a, b) { return b.t === a.t ? a.i - b.i : (b.t > a.t ? 1 : -1); }
  function changeRows(value) {
    var list = isObj(value) ? arr(value.changes) : [];
    return list.filter(isObj).map(function (c, i) {
      var t = Date.parse(typeof c.ts === "string" ? c.ts : "");
      return { i: i, t: isFinite(t) ? t : -Infinity, time: PU.formatTime(c.ts) || cleanText(c.ts, 40), kind: cleanText(c.kind, 60), summary: cleanText(c.summary, 400), reason: cleanText(c.reason, 300), actor: cleanText(c.actor, 80) };
    }).sort(newestFirst);
  }
  function changesSection(AM, root) {
    var body = K.section(root, T("page-security.changes.title"), { desc: T("page-security.changes.desc") });
    changeForm(AM, body);
    var entry = K.ensureData(AM, "changes");
    K.asyncBody(body, entry, function () { K.reload(AM, "changes"); }, function (value) {
      var all = changeRows(value);
      if (!all.length) { body.appendChild(K.emptyCard(T("page-security.changes.empty"))); return; }
      var lim = PU.limitRows(all, 200);
      if (lim.hidden > 0) body.appendChild(K.el("p", "am-pg-count", T("page-security.changes.shown", { n: PU.fmtNum(lim.shown.length), toplam: PU.fmtNum(lim.total) })));
      K.table(body, {
        caption: T("page-security.changes.caption"),
        cols: [{ label: T("page-security.changes.colTime") }, { label: T("page-security.changes.colKind") }, { label: T("page-security.changes.colSummary") }, { label: T("page-security.changes.colReason") }, { label: T("page-security.changes.colActor") }],
        rows: lim.shown.map(function (r) { return { cells: [r.time || T("pages.dash"), K.el("code", "am-pg-code", r.kind || T("pages.dash")), r.summary || T("pages.dash"), r.reason || T("pages.dash"), r.actor || T("pages.dash")] }; })
      });
    });
  }

  var RUN_ST = { notified: ["ok", "✓", "page-security.automation.run.notified"], task_recorded: ["ok", "✓", "page-security.automation.run.task_recorded"], skipped_cooldown: ["muted", "○", "page-security.automation.run.skipped_cooldown"], skipped_rate: ["warn", "▲", "page-security.automation.run.skipped_rate"], scheduled_ok: ["ok", "✓", "page-security.automation.run.scheduled_ok"], missed: ["warn", "▲", "page-security.automation.run.missed"], error: ["bad", "✕", "page-security.automation.run.error"], unknown: ["muted", "?", "page-security.automation.run.unknown"] };
  function runKind(v) { return typeof v === "string" && Object.prototype.hasOwnProperty.call(RUN_ST, v) ? v : "unknown"; }
  var DAY_SHORT = { 1: "Pt", 2: "Sa", 3: "Ça", 4: "Pe", 5: "Cu", 6: "Ct", 7: "Pz" };
  // Tetikleyici özeti: "her 60 dk" / "her gün 09:00 (Pt, Sa)". Bozuk zamanlama dürüstçe "—".
  function schedText(sc) {
    if (sc.kind === "interval") { var n = numOrNull(sc.everyMinutes); return n === null ? T("pages.dash") : "her " + PU.fmtNum(n) + " dk"; }
    if (sc.kind === "daily" && typeof sc.at === "string" && /^[0-2][0-9]:[0-5][0-9]$/.test(sc.at)) {
      var days = arr(sc.weekdays).filter(function (d) { return typeof d === "number" && DAY_SHORT[d]; }).sort();
      return "her gün " + sc.at + (days.length && days.length < 7 ? " (" + days.map(function (d) { return DAY_SHORT[d]; }).join(", ") + ")" : "");
    }
    return T("pages.dash");
  }
  function ruleRows(value) {
    var list = isObj(value) ? arr(value.rules) : [];
    return list.filter(isObj).map(function (r) {
      var tg = isObj(r.trigger) ? r.trigger : null;
      var isSched = !!tg && tg.kind === "schedule" && isObj(tg.schedule);
      return { id: PU.clean(r.id, 80), name: cleanText(r.name, 120), pattern: cleanText(r.eventPattern, 200), isSched: isSched, trigger: isSched ? schedText(tg.schedule) : "", nextRunAt: typeof r.nextRunAt === "string" ? r.nextRunAt : "", actionKind: r.actionKind === "notify" || r.actionKind === "record_task" || r.actionKind === "run_analysis" ? r.actionKind : "unknown", enabled: r.enabled === true ? true : r.enabled === false ? false : null, cooldown: numOrNull(r.cooldownSeconds) };
    });
  }
  function runRows(value, rules) {
    var list = isObj(value) ? arr(value.runs) : [];
    var names = Object.create(null);
    arr(rules).forEach(function (r) { if (r.id) names[r.id] = r.name; });
    return list.filter(isObj).map(function (r, i) {
      var t = Date.parse(typeof r.ts === "string" ? r.ts : "");
      var rid = PU.clean(r.ruleId, 80);
      return { i: i, t: isFinite(t) ? t : -Infinity, time: PU.formatTime(r.ts) || cleanText(r.ts, 40), rule: names[rid] ? names[rid] : cleanText(rid, 80), outcome: runKind(r.outcome), message: cleanText(r.message, 300) };
    }).sort(newestFirst);
  }
  function actionLabel(k) { return k === "notify" ? T("page-security.automation.act.notify") : k === "record_task" ? T("page-security.automation.act.record_task") : k === "run_analysis" ? T("page-security.automation.act.run_analysis") : T("page-security.automation.act.unknown"); }
  // "Şimdi çalıştır" sonuç bildirimleri (başarı ya da atlama); hatalar showActionErrors'ta.
  function showRunNowNotes(body, AM, ids) {
    var d = AM && AM.state && isObj(AM.state.data) ? AM.state.data : {};
    var n = 0;
    ids.forEach(function (id) {
      var e = d["automationAction:" + id];
      if (n >= 3 || !isObj(e) || e.status !== "ok" || !isObj(e.value) || !isObj(e.value.run)) return;
      n++;
      var sk = typeof e.value.skippedReason === "string" && e.value.skippedReason ? cleanText(e.value.skippedReason, 300) : "";
      var oc = runKind(e.value.run.outcome);
      var p = K.el("p", "am-pg-note", sk ? T("page-security.automation.runNowSkipped", { neden: sk }) : T("page-security.automation.runNowDone", { sonuc: T(RUN_ST[oc][2]) }));
      p.setAttribute("role", "status");
      body.appendChild(p);
    });
  }
  function automationSection(AM, root) {
    var body = K.section(root, T("page-security.automation.title"), { desc: T("page-security.automation.desc") });
    ruleForm(AM, body);
    var entry = K.ensureData(AM, "automation");
    K.asyncBody(body, entry, function () { K.reload(AM, "automation"); }, function (value) {
      var rules = ruleRows(value);
      if (!rules.length) body.appendChild(K.emptyCard(T("page-security.automation.empty")));
      else {
        showActionErrors(body, AM, "automationAction:", rules.map(function (r) { return r.id; }));
        showRunNowNotes(body, AM, rules.map(function (r) { return r.id; }));
        K.table(body, {
          caption: T("page-security.automation.caption"),
          cols: [{ label: T("page-security.automation.colName") }, { label: T("page-security.automation.colTrigger") }, { label: T("page-security.automation.colAction") }, { label: T("page-security.automation.colNext") }, { label: T("page-security.automation.colCooldown") }, { label: T("page-security.automation.colEnabled") }, { label: T("page-security.grants.colOps") }],
          rows: rules.map(function (r) {
            var ops = K.el("span", "am-pg-ops");
            if (r.id && r.enabled === true) ops.appendChild(K.button(T("page-security.automation.turnOff"), "rule-off:" + r.id, function () { K.act("automationRule", r.id, "disable"); }));
            else if (r.id && r.enabled === false) ops.appendChild(K.button(T("page-security.automation.turnOn"), "rule-on:" + r.id, function () { K.act("automationRule", r.id, "enable"); }));
            else ops.textContent = T("pages.dash");
            if (r.id && r.isSched && r.enabled === true) ops.appendChild(K.button(T("page-security.automation.runNow"), "rule-run:" + r.id, function () { K.act("automationRule", r.id, "runNow"); }));
            var st = r.enabled === true ? badge("ok", "✓", T("page-security.automation.on")) : r.enabled === false ? badge("muted", "○", T("page-security.automation.off")) : badge("muted", "?", T("page-security.automation.stateUnknown"));
            return { cells: [r.name || T("pages.dash"), K.el("code", "am-pg-code", r.isSched ? r.trigger : (r.pattern || T("pages.dash"))), actionLabel(r.actionKind), r.isSched && r.enabled === true && r.nextRunAt ? (PU.formatTime(r.nextRunAt) || T("pages.dash")) : T("pages.dash"), r.cooldown === null ? T("pages.dash") : T("page-security.runtimeSec", { n: PU.fmtNum(r.cooldown) }), st, ops] };
          })
        });
      }
      var runs = runRows(value, rules);
      body.appendChild(K.el("h3", "am-pg-h3", T("page-security.automation.runsTitle")));
      if (!runs.length) { body.appendChild(K.emptyCard(T("page-security.automation.runsEmpty"))); return; }
      var lim = PU.limitRows(runs, 50);
      K.table(body, {
        caption: T("page-security.automation.runsCaption"),
        cols: [{ label: T("page-security.changes.colTime") }, { label: T("page-security.automation.runRule") }, { label: T("page-security.automation.runOutcome") }, { label: T("page-security.automation.runMessage") }],
        rows: lim.shown.map(function (r) { var st = RUN_ST[r.outcome]; return { cells: [r.time || T("pages.dash"), r.rule || T("pages.dash"), badge(st[0], st[1], T(st[2])), r.message || T("pages.dash")] }; })
      });
    });
  }

  // ---- çizim (sayfa) ----
  function chipList(parent, items, tone, emptyText) {
    if (!items.length) { parent.appendChild(K.emptyCard(emptyText)); return; }
    var ul = K.el("ul", "am-pg-chips");
    items.forEach(function (a) { var li = K.el("li", "am-pg-chipli"); li.appendChild(K.chip(a, tone, true)); ul.appendChild(li); });
    parent.appendChild(ul);
  }

  function render(AM, root) {
    root.appendChild(K.el("p", "am-pg-lead", T("page-security.intro")));
    var s = policySummary(AM.state && AM.state.policy);
    if (!s) {
      root.appendChild(K.errorCard(T("page-security.noPolicy"), function () { K.act("refresh"); }));
    } else {
      var paidV = s.paid === "none" ? ["page-security.paidOff", "ok", "✓", "page-security.paidOffSub"] : s.paid === "approved" ? ["page-security.paidOn", "warn", "!", "page-security.paidOnSub"] : ["page-security.paidUnknown", "warn", "?", "page-security.paidUnknownSub"];
      var c = s.counts;
      var sum = K.section(root, T("page-security.summary"), {});
      K.cards(sum, [
        K.statCard({ label: T("page-security.cAllowed"), value: PU.fmtNum(c.allowedActions), tone: "info", shape: "●" }),
        K.statCard({ label: T("page-security.cApproval"), value: PU.fmtNum(c.approvalActions), tone: "warn", shape: "!" }),
        K.statCard({ label: T("page-security.cAllowedDirs"), value: PU.fmtNum(c.allowedDirs), tone: "info", shape: "●" }),
        K.statCard({ label: T("page-security.cForbiddenDirs"), value: PU.fmtNum(c.forbiddenDirs), tone: "bad", shape: "✕" }),
        K.statCard({ label: T("page-security.cTrusted"), value: PU.fmtNum(c.trustedRepos), tone: "info", shape: "●" }),
        K.statCard({ label: T("page-security.cProviders"), value: PU.fmtNum(c.allowedProviders), tone: "info", shape: "●" }),
        K.statCard({ label: T("page-security.cPaid"), value: T(paidV[0]), tone: paidV[1], shape: paidV[2], sub: T(paidV[3]) }),
        K.statCard({ label: T("page-security.cRuntime"), value: s.maxRuntimeSec === null ? T("page-security.runtimeUnknown") : T("page-security.runtimeSec", { n: PU.fmtNum(s.maxRuntimeSec) }), tone: "muted", shape: "●" })
      ]);
      if (s.contractId) K.kv(sum, [[T("page-security.contract"), K.el("code", "am-pg-code", s.contractId)]]);

      chipList(K.section(root, T("page-security.allowedActions"), { count: c.allowedActions, desc: T("page-security.allowedActionsDesc") }), s.lists.allowedActions, "ok", T("page-security.noAllowedActions"));
      chipList(K.section(root, T("page-security.approvalActions"), { count: c.approvalActions, desc: T("page-security.approvalActionsDesc") }), s.lists.approvalActions, "warn", T("page-security.noApprovalActions"));
      K.pathList(K.section(root, T("page-security.allowedDirs"), { count: c.allowedDirs }), s.lists.allowedDirs, T("page-security.noAllowedDirs"));
      K.pathList(K.section(root, T("page-security.forbiddenDirs"), { count: c.forbiddenDirs }), s.lists.forbiddenDirs, T("page-security.noForbiddenDirs"));
      K.pathList(K.section(root, T("page-security.trusted"), { count: c.trustedRepos }), s.lists.trustedRepos, T("page-security.noTrusted"));
      chipList(K.section(root, T("page-security.providers"), { count: c.allowedProviders }), s.lists.allowedProviders, "info", T("page-security.noProviders"));
    }
    // Sır referansları (yalnız adlar) ve yetki modeli
    var sec = K.section(root, T("page-security.secretsTitle"), { desc: T("page-security.secretsDesc") });
    var secSt = K.ensureData(AM, "secretRefs");
    K.asyncBody(sec, secSt, function () { K.reload(AM, "secretRefs"); }, function (v) {
      var refs = v && Array.isArray(v.refs) ? v.refs.map(function (x) { return PU.maskSecrets(PU.clean(x, 120)); }) : [];
      if (!refs.length) { sec.appendChild(K.emptyCard(T("page-security.secretsEmpty"))); return; }
      chipList(sec, refs, "info", T("page-security.secretsEmpty"));
    });
    semSection(AM, root);
    grantsSection(AM, root);
    changesSection(AM, root);
    automationSection(AM, root);
    var roles = K.section(root, T("page-security.rolesTitle"), { desc: T("page-security.rolesDesc") });
    K.kv(roles, [[T("page-security.roleUser"), T("page-security.roleUserCan")], [T("page-security.roleAgent"), T("page-security.roleAgentCan")], [T("page-security.roleSystem"), T("page-security.roleSystemCan")]]);
    var rules = K.section(root, T("page-security.rulesTitle"), {});
    var ul = K.el("ul", "am-pg-rules");
    ["page-security.noDelete", "page-security.changeNote", "page-security.secretNote"].forEach(function (k) { ul.appendChild(K.el("li", "am-pg-rule", T(k))); });
    rules.appendChild(ul);
  }

  P.register(ID, { title: T("pages.title.security"), group: "manage", render: render, pure: { semRows: semRows, filterSem: filterSem, revKind: revKind, semState: function () { return semLocal; }, policySummary: policySummary, paidKind: paidKind, grantRows: grantRows, changeRows: changeRows, ruleRows: ruleRows, runRows: runRows, grantKind: grantKind, runKind: runKind, cleanList: cleanList, TR: TR } });
})();
