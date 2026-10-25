// D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. Ek bölümler 'D9' ile işaretlidir; ADR-016: yetenekler kendiliğinden çalışmaz.
/*
 * Sahip: Sonnet (D3 sayfası: Entegrasyonlar ve Yetenekler) [İP:AgentMom Faz 11, D3]
 * yazan: [Claude#agentmom-d3-sayfalar-more]
 * Amaç: window.AM_PAGES.register("integrations", ...) ile 100 yetenek tablosu, dilim planı ve sağlayıcı yetenek kayıt defteri.
 *   Veri YALNIZ AM.state.data.capabilities ({status,value,reason}); ağ isteği yok (AM.actions.loadData çağrılır).
 * Dürüstlük kuralı: durum rozeti şekil + metin + renk taşır; "Planlı" ve "Kısmi" asla "Doğrulandı" gibi çizilmez; kullanılamayan yetenek kullanılabilir gibi gösterilmez.
 * Kural kaynağı: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md (D3). Sunucu metni yalnız textContent. Saf mantık: window.AM_PAGE_INTEGRATIONS.pure.
 * Değiştirme: yalnız sahibi ya da ana oturum. Yükleme sırasında DOM'a dokunmaz.
 */
(function () {
  "use strict";

  if (!window.AM_PAGES || typeof window.AM_PAGES.register !== "function") {
    throw new Error("page-integrations: AM_PAGES sayfa çerçevesi (pages.js) yüklenmemiş; Entegrasyonlar sayfası kaydedilemedi.");
  }
  if (typeof window.AM_REGISTER_TR !== "function" || typeof window.AM_T !== "function") {
    throw new Error("page-integrations: strings.js (AM_REGISTER_TR/AM_T) yüklenmemiş.");
  }

  window.AM_REGISTER_TR("page-integrations", {
    "page-integrations.title": "Entegrasyonlar ve Yetenekler",
    "page-integrations.group": "Yönetim",
    "page-integrations.lead": "AgentMom'un 100 yeteneğinin dürüst durumu: hangisi kanıtla doğrulandı, hangisi kısmen çalışıyor, hangisi henüz planlı.",
    "page-integrations.honesty": "Kullanılamayan yetenek kullanılabilir gibi gösterilmez. Doğrulandı: kanıt dosyalarıyla doğrulandı. Kısmi: yalnız bir bölümü çalışıyor. Planlı: henüz yok.",
    "page-integrations.noAdapter": "OpenCode, Cursor ve Antigravity: kuruldu, adaptör yok. Bu yüzden sağlayıcı olarak kullanılamaz ve kullanılabilir gibi gösterilmez.",
    "page-integrations.loading": "Yetenek listesi yükleniyor…",
    "page-integrations.emptyTitle": "Yetenek kaydı yok",
    "page-integrations.emptyDetail": "Sunucu boş bir yetenek listesi döndürdü.",
    "page-integrations.errTitle": "Yetenek listesi alınamadı",
    "page-integrations.errDetail": "Ayrıntı: {reason}",
    "page-integrations.renderErr": "Sayfa çizilemedi: {reason}",
    "page-integrations.noLoader": "Veri yükleme eylemi (loadData) kullanılamıyor.",
    "page-integrations.retry": "Yeniden dene",
    "page-integrations.updated": "Güncelleme: {at}",
    "page-integrations.summaryLabel": "Yetenek durum özeti",
    "page-integrations.sumTotal": "Toplam",
    "page-integrations.sumMismatch": "Dikkat: sunucu özeti ({srv}) tablodaki sayımla ({calc}) uyuşmuyor; tablodaki sayım gösteriliyor.",
    "page-integrations.status.dogrulandi": "Doğrulandı",
    "page-integrations.status.kismi": "Kısmi",
    "page-integrations.status.planli": "Planlı",
    "page-integrations.status.desteklenmiyor": "Desteklenmiyor",
    "page-integrations.status.kapsamdisi": "Kapsam dışı",
    "page-integrations.status.bilinmiyor": "Bilinmeyen durum",
    "page-integrations.op.verified": "Doğrulandı",
    "page-integrations.op.partial": "Kısmi",
    "page-integrations.op.unverified": "Doğrulanmadı",
    "page-integrations.op.unavailable": "Kullanılamıyor",
    "page-integrations.op.unsupported": "Desteklenmiyor",
    "page-integrations.op.unknown": "Bilinmeyen",
    "page-integrations.slicesTitle": "Dilim planı",
    "page-integrations.slicesHint": "Sayım, her maddenin dilim alanından hesaplanır.",
    "page-integrations.sliceItems": "{n} madde",
    "page-integrations.sliceDone": "{d}/{n} doğrulandı",
    "page-integrations.sliceComplete": "Tamamlandı",
    "page-integrations.sliceOpen": "Sürüyor",
    "page-integrations.sliceShow": "Maddeleri göster",
    "page-integrations.sliceNone": "Dilimsiz",
    "page-integrations.tableTitle": "100 yetenek",
    "page-integrations.caption": "Yetenek tablosu: numara, ad, sahip modül, durum, kanıt, eksik ve dilim",
    "page-integrations.search": "Ara",
    "page-integrations.searchPh": "Ad, sahip, kanıt ya da eksik içinde ara",
    "page-integrations.fStatus": "Durum",
    "page-integrations.fSlice": "Dilim",
    "page-integrations.fAll": "Tümü",
    "page-integrations.fClear": "Süzgeçleri temizle",
    "page-integrations.count": "{shown} / {total} yetenek gösteriliyor",
    "page-integrations.noMatch": "Süzgeçlerle eşleşen yetenek yok.",
    "page-integrations.col.n": "No",
    "page-integrations.col.name": "Yetenek (EN / TR)",
    "page-integrations.col.owner": "Sahip",
    "page-integrations.col.status": "Durum",
    "page-integrations.col.proof": "Kanıt",
    "page-integrations.col.gap": "Eksik",
    "page-integrations.col.slice": "Dilim",
    "page-integrations.sortAsc": "artan",
    "page-integrations.sortDesc": "azalan",
    "page-integrations.sortBy": "{col} sütununa göre sırala",
    "page-integrations.expand": "{n}. yeteneğin ayrıntısını aç",
    "page-integrations.collapse": "{n}. yeteneğin ayrıntısını kapat",
    "page-integrations.proofNone": "Kanıt dosyası yok",
    "page-integrations.proofMore": "+{n} dosya",
    "page-integrations.proofCopy": "Kanıt yolunu kopyala: {path}",
    "page-integrations.copied": "Kopyalandı: {path}",
    "page-integrations.copyFail": "Kopyalanamadı.",
    "page-integrations.gapFull": "Eksik",
    "page-integrations.proofFull": "Kanıt dosyaları",
    "page-integrations.gapNone": "Eksik bildirilmedi",
    "page-integrations.decision": "Yusuf kararı bekliyor",
    "page-integrations.regTitle": "Sağlayıcı yetenek kayıt defteri",
    "page-integrations.regHint": "Her sağlayıcı için işlem durumu ve kanıt. Doğrulanmamış ya da kullanılamayan işlem kullanılabilir gibi çizilmez.",
    "page-integrations.regCaption": "Sağlayıcı ve işlem durum matrisi",
    "page-integrations.regOp": "İşlem",
    "page-integrations.regEmpty": "Sağlayıcı kayıt defteri boş.",
    "page-integrations.regRoute": "Rota: {route}",
    "page-integrations.noProof": "kanıt yok"
  });

  // Sistem analitiği metinleri (D9). Yalnız ekleme: yukarıdaki kayıtlara dokunmaz.
  window.AM_REGISTER_TR("page-integrations", {
    "page-integrations.labTitle": "Sistem analitiği",
    "page-integrations.labLead": "Aşağıdaki analizler kendiliğinden çalışmaz: yalnız bir bölümü açıp çalıştırdığınızda çalışır. Hepsi salt okunurdur; hiçbir şey kaydetmez, değiştirmez ya da silmez.",
    "page-integrations.labOpen": "Aç",
    "page-integrations.labClose": "Kapat",
    "page-integrations.labRefresh": "Yenile",
    "page-integrations.labLoading": "Analiz yükleniyor…",
    "page-integrations.labBad": "Sunucu yanıtı okunamadı; sonuç gösterilemiyor.",
    "page-integrations.labMore": "…ve {n} tane daha",
    "page-integrations.srvNote": "Sunucu notu: {note}",
    "page-integrations.yes": "Evet",
    "page-integrations.no": "Hayır",
    "page-integrations.impactInvalid": "Girdi geçersiz; istek gönderilmedi",

    "page-integrations.impactTitle": "Etki haritası",
    "page-integrations.impactLead": "Bir dosya değişirse hangi dosyaların ve testlerin etkileneceğini katman katman gösterir.",
    "page-integrations.impactFileLabel": "Dosya yolu (src/ altında, göreli)",
    "page-integrations.impactDepthLabel": "Derinlik (1-6)",
    "page-integrations.impactHelp": "Örnek: src/server/app.ts. Mutlak yol, '..', ':' ve ters bölü kabul edilmez.",
    "page-integrations.impactRun": "Analiz et",
    "page-integrations.impactBadFile": "Dosya yolu geçersiz: göreli olmalı, 1-200 karakter; yalnız harf, rakam, nokta, alt çizgi, tire ve eğik çizgi içerebilir; '..' ve ':' olamaz.",
    "page-integrations.impactBadDepth": "Derinlik 1 ile 6 arasında olmalı.",
    "page-integrations.impactErr": "Etki analizi yapılamadı",
    "page-integrations.impactFile": "Dosya",
    "page-integrations.impactDepth": "Derinlik",
    "page-integrations.impactIsTest": "Test dosyası mı",
    "page-integrations.impactDirect": "Doğrudan bağımlı",
    "page-integrations.impactTransitive": "Dolaylı bağımlı",
    "page-integrations.impactTests": "Etkilenen test",
    "page-integrations.impactUnbounded": "Derinliksiz dolaylı bağımlı",
    "page-integrations.impactMaxDist": "En uzak mesafe",
    "page-integrations.impactCycle": "Bu dosya bir döngü (dairesel bağımlılık) içinde:",
    "page-integrations.impactCut": "Sonuç kesildi: derinlik ya da liste sınırına ulaşıldı; etkilenenlerin hepsi gösterilmiyor olabilir.",
    "page-integrations.impactNone": "Etkilenen dosya yok",
    "page-integrations.impactNoneDetail": "Bu dosyayı içe aktaran başka dosya bulunamadı.",
    "page-integrations.impactLayer": "Katman {n} (uzaklık {d})",
    "page-integrations.impactLayerTests": "Bu katmandaki testler:",
    "page-integrations.impactAffected": "Etkilenen testler",
    "page-integrations.impactColTest": "Test",
    "page-integrations.impactColDist": "Uzaklık",
    "page-integrations.impactImports": "Bu dosyanın doğrudan içe aktardıkları",
    "page-integrations.graphRun": "Graf özeti",
    "page-integrations.graphTitle": "Bağımlılık grafı özeti",
    "page-integrations.graphErr": "Graf özeti alınamadı",
    "page-integrations.graphFiles": "Dosya",
    "page-integrations.graphEdges": "Bağ",
    "page-integrations.graphExternal": "Dış içe aktarma",
    "page-integrations.graphUnresolved": "Çözülemeyen (src içi)",
    "page-integrations.graphDynamic": "Dinamik içe aktarma",
    "page-integrations.graphCycles": "Döngü sayısı",
    "page-integrations.graphCut": "Tarama kesildi: bazı dosyalar grafa girmemiş olabilir.",
    "page-integrations.graphTop": "En çok bağımlı olunan dosyalar",
    "page-integrations.graphDeps": "{n} bağımlı",
    "page-integrations.graphCycleList": "Döngüler",

    "page-integrations.contTitle": "Yetenek sürekliliği",
    "page-integrations.contLead": "Tek hata noktalarını ve bir sağlayıcı kapanırsa hangi yeteneklerin kaybolacağını gösterir.",
    "page-integrations.contErr": "Süreklilik analizi alınamadı",
    "page-integrations.contProviders": "Sağlayıcı",
    "page-integrations.contActive": "Etkin sağlayıcı",
    "page-integrations.contCaps": "Yetenek",
    "page-integrations.contSingle": "Tek hata noktası",
    "page-integrations.contEssential": "Zorunlu tek hata noktası",
    "page-integrations.contNobody": "Hiçbir sağlayıcının sunmadığı",
    "page-integrations.contSingleTitle": "Tek hata noktaları",
    "page-integrations.contNoSingle": "Tek hata noktası yok.",
    "page-integrations.contColCap": "Yetenek",
    "page-integrations.contColProv": "Sağlayıcı",
    "page-integrations.contColStatus": "Durum",
    "page-integrations.contColEss": "Zorunlu",
    "page-integrations.contColActive": "Etkin",
    "page-integrations.contEssChip": "Zorunlu",
    "page-integrations.contActiveChip": "Etkin",
    "page-integrations.contInactiveChip": "Etkin değil",
    "page-integrations.contNobodyTitle": "Hiçbir sağlayıcının sunmadığı yetenekler",
    "page-integrations.contLostTitle": "Bir sağlayıcı kapanırsa",
    "page-integrations.contLostNone": "Sağlayıcı bulunamadı.",
    "page-integrations.contColLost": "Kaybolan yetenekler",
    "page-integrations.contColKept": "Kalan yetenek sayısı",
    "page-integrations.contColLeft": "Sağlayıcı kalır mı",
    "page-integrations.contNothing": "Kayıp yok",
    "page-integrations.contNoneLeft": "Hiç sağlayıcı kalmıyor",

    "page-integrations.exitTitle": "Çıkış ve değiştirilebilirlik",
    "page-integrations.exitLead": "Bir sağlayıcı bırakılırsa yerine geçebilecek adayları puanlar; eksik yetenekleri gösterir.",
    "page-integrations.exitProvider": "Sağlayıcı",
    "page-integrations.exitProviderText": "Sağlayıcı kimliği",
    "page-integrations.exitRun": "Planı göster",
    "page-integrations.exitBad": "Sağlayıcı kimliği geçersiz: 1-60 karakter; harf, rakam, nokta, iki nokta, alt çizgi ve tire.",
    "page-integrations.exitErr": "Çıkış planı alınamadı",
    "page-integrations.exitVerdictOk": "Yedek var",
    "page-integrations.exitVerdictPart": "Kısmi yedek",
    "page-integrations.exitVerdictNone": "Yedek yok",
    "page-integrations.exitVerdictUnknown": "Sonuç bilinmiyor",
    "page-integrations.exitTarget": "Hedef sağlayıcı: {ad} ({id}) · rota: {rota}",
    "page-integrations.exitNoCand": "Yerine geçebilecek aday yok.",
    "page-integrations.exitCandCaption": "Yedek adayları ve değiştirme puanı",
    "page-integrations.exitColProv": "Sağlayıcı",
    "page-integrations.exitColRoute": "Rota",
    "page-integrations.exitColCover": "Kapsama",
    "page-integrations.exitColHealth": "Sağlık",
    "page-integrations.exitColScore": "Puan",
    "page-integrations.exitColMissing": "Eksik yetenekler",
    "page-integrations.exitColWhy": "Nedenler",
    "page-integrations.exitNoMissing": "Eksik yok",
    "page-integrations.exitClosed": "Kapalı rotalar",
    "page-integrations.exitPaidOff": "api_paid kapalı",
    "page-integrations.exitRouteOff": "Rota kapalı",
    "page-integrations.exitExcluded": "Elenenler",
    "page-integrations.exitFormula": "Puan formülü: {f}",

    "page-integrations.brokerTitle": "İç yetenek aracısı",
    "page-integrations.brokerLead": "Bir yetenek (ve isteğe bağlı rol) için uygun sağlayıcıları sıralar; elenenleri nedenleriyle gösterir.",
    "page-integrations.brokerCap": "Yetenek",
    "page-integrations.brokerRole": "Rol",
    "page-integrations.brokerRoleAny": "Rol belirtme",
    "page-integrations.brokerRun": "Sırala",
    "page-integrations.brokerBad": "Yetenek listeden, rol ise listeden ya da boş seçilmeli.",
    "page-integrations.brokerErr": "Sıralama yapılamadı",
    "page-integrations.brokerNoCand": "Uygun sağlayıcı yok.",
    "page-integrations.brokerRank": "{n}. {ad} ({id})",
    "page-integrations.brokerLine": "Rota: {rota} · yetenek durumu: {durum} · sağlık: {saglik} · {rol}",
    "page-integrations.brokerRoleObs": "rolde {n} deneme, başarı {p}",
    "page-integrations.brokerRoleNone": "rolde gözlem yok",
    "page-integrations.brokerElim": "Elenen sağlayıcılar",
    "page-integrations.brokerOrdering": "Sıralama ölçütü: {o}",
    "page-integrations.role.plan": "Planlama",
    "page-integrations.role.implement": "Uygulama",
    "page-integrations.role.review": "İnceleme",
    "page-integrations.role.verify": "Doğrulama",
    "page-integrations.role.tekil": "Tekil görev",

    "page-integrations.offTitle": "Çevrimdışı kip",
    "page-integrations.offLead": "Sağlayıcı kullanılamazken nelerin çalışmaya devam ettiğini gösterir.",
    "page-integrations.offErr": "Çevrimdışı kip bilgisi alınamadı",
    "page-integrations.modeOffline": "Çevrimdışı",
    "page-integrations.modeLimited": "Kısıtlı",
    "page-integrations.modeOnline": "Çevrimiçi",
    "page-integrations.modeUnknown": "Kip bilinmiyor",
    "page-integrations.offUsable": "Kullanılabilir sağlayıcı",
    "page-integrations.offVerified": "Doğrulanmış sağlayıcı",
    "page-integrations.offWorks": "Çevrimdışıyken yapılabilirler",
    "page-integrations.offBlocked": "Şu an engelli olanlar",
    "page-integrations.offNeeds": "Sağlayıcı gerektirenler",
    "page-integrations.offNone": "Kayıt yok.",
    "page-integrations.offProviders": "Sağlayıcı durumu",
    "page-integrations.offColUsable": "Kullanılabilir",
    "page-integrations.offColExec": "Çalıştırma durumu",
    "page-integrations.offUsableYes": "Evet",
    "page-integrations.offUsableNo": "Hayır",

    "page-integrations.expTitle": "Uzmanlık haritası",
    "page-integrations.expLead": "Sağlayıcıların rollerde gözlenen başarı oranlarını gösterir.",
    "page-integrations.expErr": "Uzmanlık haritası alınamadı",
    "page-integrations.expHonest": "Gözlem sayısı {n} değerinden azsa oran gösterilmez ve 'Yetersiz veri' yazılır; az sayıdaki gözlem yetenek kanıtı değildir.",
    "page-integrations.expEmpty": "Gözlem yok",
    "page-integrations.expEmptyDetail": "Henüz sağlayıcı ve rol bazında gözlenmiş çalıştırma yok.",
    "page-integrations.expCaption": "Sağlayıcı ve rol bazında başarı oranı",
    "page-integrations.expNoObs": "Gözlem yok",
    "page-integrations.expInsufficient": "Yetersiz veri",
    "page-integrations.expN": "n={n}",
    "page-integrations.expAvg": "ort. {s} sn",
    "page-integrations.expRefusals": "Reddedilen istekler",
    "page-integrations.expUnknownProv": "Sağlayıcı bilinmiyor",
    "page-integrations.expCut": "Denetim kaydı taraması {n} satırda kesildi; eski gözlemler hesaba girmemiş olabilir.",
    "page-integrations.expUnattr": "{n} adım bir sağlayıcıya atfedilemedi.",

    "page-integrations.shadowTitle": "Kaynak gölge fiyatı",
    "page-integrations.shadowLead": "Sağlayıcı kotalarının ne kadar kıt olduğunu gösterir.",
    "page-integrations.shadowErr": "Gölge fiyat alınamadı",
    "page-integrations.shadowNoCurrency": "Bu bir fiyat değil, kıtlık göstergesidir: para birimi yoktur ve ücret hesaplanmaz. Kota sınırı bilinmeyen sağlayıcı için gösterge hesaplanmaz ('sınır bilinmiyor').",
    "page-integrations.shadowEmpty": "Sağlayıcı yok",
    "page-integrations.shadowEmptyDetail": "Kıtlık hesaplanacak sağlayıcı bulunamadı.",
    "page-integrations.shadowCaption": "Sağlayıcı bazında 7 günlük kullanım ve kıtlık göstergesi",
    "page-integrations.shadowColCalls": "7 günlük çağrı",
    "page-integrations.shadowColTokens": "7 günlük token",
    "page-integrations.shadowColAccel": "Hızlanma",
    "page-integrations.shadowColLimit": "Bilinen sınır",
    "page-integrations.shadowColScarcity": "Kıtlık göstergesi",
    "page-integrations.shadowColStatus": "Durum",
    "page-integrations.shadowUnknownLimit": "Sınır bilinmiyor",
    "page-integrations.shadowLimitUnknown": "Sınır bilinmiyor",
    "page-integrations.shadowTokensUnknown": "Bildirilmedi",
    "page-integrations.shadowBarLabel": "{ad}: kıtlık göstergesi",
    "page-integrations.shadowFormula": "Formül: {f}",

    "page-integrations.absTitle": "Eksiklik ve fazlalık",
    "page-integrations.absLead": "Kullanılmayan görünen ve eksik görünen parçaları listeler.",
    "page-integrations.absErr": "Eksiklik/fazlalık analizi alınamadı",
    "page-integrations.absNotDelete": "Bu liste silme önerisi DEĞİLDİR: kullanılmayan görünen bir parça bilerek bırakılmış olabilir. Hiçbir şey silinmedi ya da değiştirilmedi.",
    "page-integrations.absUnused": "Kullanılmayan görünenler",
    "page-integrations.absTables": "Hiçbir yerde kullanılmayan tablolar",
    "page-integrations.absEndpoints": "Hiçbir istemcinin çağırmadığı uçlar",
    "page-integrations.absEndpointsTests": "Yalnız testlerin çağırdığı uçlar",
    "page-integrations.absCaps": "Hiçbir yerde kullanılmayan yetenek işlemleri",
    "page-integrations.absMissing": "Eksik görünenler",
    "page-integrations.absPlanned": "Planlı ama yapılmamış maddeler",
    "page-integrations.absNoUi": "Arayüzü olmayan uçlar",
    "page-integrations.absNoTest": "Doğrudan testi olmayan modüller",
    "page-integrations.absNone": "Kayıt yok.",
    "page-integrations.absCut": "Liste kesildi.",
    "page-integrations.absDeliberate": "bilerek bırakılmış",
    "page-integrations.absTestRef": "testlerde geçiyor",
    "page-integrations.absSlice": "{s}: {n} madde",
    "page-integrations.absScanCut": "Tarama kesildi: bazı dosyalar hesaba girmemiş olabilir."
  });

  var T = function (key, vars) { return window.AM_T(key, vars); };

  // ------------------------------------------------------------------ saf mantık
  var STATUS = {
    dogrulandi: { tone: "ok", icon: "check", rank: 0 },
    kismi: { tone: "warn", icon: "alert", rank: 1 },
    planli: { tone: "muted", icon: "clock", rank: 2 },
    desteklenmiyor: { tone: "bad", icon: "x", rank: 3 },
    kapsamdisi: { tone: "muted", icon: "dot", rank: 4 },
    bilinmiyor: { tone: "info", icon: "info", rank: 5 }
  };
  var OPS = {
    verified: { tone: "ok", icon: "check" },
    partial: { tone: "warn", icon: "alert" },
    unverified: { tone: "muted", icon: "dot" },
    unavailable: { tone: "bad", icon: "x" },
    unsupported: { tone: "bad", icon: "x" },
    unknown: { tone: "info", icon: "info" }
  };
  var DECISION_SET = { 20: true, 31: true, 39: true };

  function fold(s) {
    var t = String(s == null ? "" : s).replace(/İ/g, "i").replace(/I/g, "i").toLowerCase();
    var map = { "ı": "i", "ş": "s", "ç": "c", "ğ": "g", "ü": "u", "ö": "o" };
    return t.replace(/[ışçğüö]/g, function (ch) { return map[ch]; });
  }

  function statusKey(durum) {
    var k = fold(durum).trim().replace(/\s+/g, "");
    return Object.prototype.hasOwnProperty.call(STATUS, k) && k !== "bilinmiyor" ? k : "bilinmiyor";
  }
  function statusInfo(durum) {
    var key = statusKey(durum);
    return { key: key, tone: STATUS[key].tone, icon: STATUS[key].icon, labelKey: "page-integrations.status." + key };
  }
  function opKey(durum) {
    var k = String(durum == null ? "" : durum).toLowerCase().trim();
    return Object.prototype.hasOwnProperty.call(OPS, k) && k !== "unknown" ? k : "unknown";
  }
  function opInfo(durum) {
    var key = opKey(durum);
    return { key: key, tone: OPS[key].tone, icon: OPS[key].icon, labelKey: "page-integrations.op." + key };
  }

  function str(v, max) { return typeof v === "string" ? v.slice(0, max || 600) : v == null ? "" : String(v).slice(0, max || 600); }
  function normItem(it) {
    var o = it && typeof it === "object" && !Array.isArray(it) ? it : {};
    var n = Number(o.n);
    return {
      n: isFinite(n) ? n : 0, en: str(o.en, 200), tr: str(o.tr, 200), sahip: str(o.sahip, 80), durum: str(o.durum, 40),
      kanit: Array.isArray(o.kanit) ? o.kanit.slice(0, 40).map(function (k) { return str(k, 300); }) : [],
      eksik: str(o.eksik, 2000), dilim: str(o.dilim, 20)
    };
  }
  function normItems(list) { return Array.isArray(list) ? list.slice(0, 500).map(normItem) : []; }

  function countByStatus(items) {
    var c = { dogrulandi: 0, kismi: 0, planli: 0, desteklenmiyor: 0, kapsamdisi: 0, bilinmiyor: 0, total: 0 };
    (items || []).forEach(function (it) { c[statusKey(it.durum)]++; c.total++; });
    return c;
  }
  function summaryMismatch(summary, counts) {
    if (!summary || typeof summary !== "object") return false;
    return ["dogrulandi", "kismi", "planli", "desteklenmiyor", "kapsamdisi"].some(function (k) { return Number(summary[k] || 0) !== counts[k]; }) || Number(summary.total) !== counts.total;
  }

  function needsDecision(it) {
    // Yalnız Yusuf'un açıkça karar vereceği çelişkili maddeler (20, 31, 39); metinden tahmin yürütülmez.
    return DECISION_SET[it.n] === true;
  }
  function haystack(it) {
    return fold([it.n, it.en, it.tr, it.sahip, it.durum, it.dilim, it.eksik].concat(it.kanit).join(" "));
  }
  function filterItems(items, f) {
    var q = fold((f && f.query) || "").trim().split(/\s+/).filter(Boolean);
    var st = (f && f.status) || "all";
    var sl = (f && f.slice) || "all";
    return (items || []).filter(function (it) {
      if (st !== "all" && statusKey(it.durum) !== st) return false;
      if (sl !== "all" && (it.dilim || "-") !== sl) return false;
      if (!q.length) return true;
      var h = haystack(it);
      return q.every(function (w) { return h.indexOf(w) >= 0; });
    });
  }
  var SORTERS = {
    n: function (a, b) { return a.n - b.n; },
    name: function (a, b) { return fold(a.tr || a.en).localeCompare(fold(b.tr || b.en)); },
    sahip: function (a, b) { return fold(a.sahip).localeCompare(fold(b.sahip), "en", { numeric: true }); },
    durum: function (a, b) { return STATUS[statusKey(a.durum)].rank - STATUS[statusKey(b.durum)].rank; },
    dilim: function (a, b) { return fold(a.dilim).localeCompare(fold(b.dilim), "en", { numeric: true }); }
  };
  function sortItems(items, key, dir) {
    var cmp = Object.prototype.hasOwnProperty.call(SORTERS, key) ? SORTERS[key] : SORTERS.n;
    var sign = dir === "desc" ? -1 : 1;
    return (items || []).map(function (it, i) { return { it: it, i: i }; }).sort(function (a, b) {
      var r = cmp(a.it, b.it) * sign;
      return r !== 0 ? r : a.i - b.i;
    }).map(function (x) { return x.it; });
  }

  function sliceOrder(a, b) {
    var na = Number(String(a).replace(/\D/g, "")); var nb = Number(String(b).replace(/\D/g, ""));
    return (isFinite(na) ? na : 999) - (isFinite(nb) ? nb : 999) || String(a).localeCompare(String(b));
  }
  function sliceStats(items, slices) {
    var sl = slices && typeof slices === "object" && !Array.isArray(slices) ? slices : {};
    var ids = Object.keys(sl).filter(function (k) { return /^[A-Za-z0-9_-]{1,12}$/.test(k); }).sort(sliceOrder);
    return ids.map(function (id) {
      var mine = (items || []).filter(function (it) { return it.dilim === id; });
      var done = mine.filter(function (it) { return statusKey(it.durum) === "dogrulandi"; }).length;
      var desc = str(sl[id], 700);
      var complete = /^\s*TAMAMLANDI/i.test(desc) || (mine.length > 0 && done === mine.length);
      return { id: id, desc: desc, total: mine.length, done: done, complete: complete };
    });
  }

  function shortPath(p) {
    var parts = String(p || "").split(/[\\/]+/).filter(Boolean);
    return parts.slice(-2).join("/") || String(p || "");
  }
  function normRegistry(list) {
    return (Array.isArray(list) ? list.slice(0, 30) : []).map(function (r) {
      var o = r && typeof r === "object" ? r : {};
      return {
        id: str(o.id, 60), ad: str(o.ad, 120), rota: str(o.rota, 60),
        ops: (Array.isArray(o.ops) ? o.ops.slice(0, 60) : []).map(function (p) {
          var q = p && typeof p === "object" ? p : {};
          return { op: str(q.op, 80), durum: str(q.durum, 40), kanit: str(q.kanit, 300) };
        })
      };
    });
  }
  function registryMatrix(registry) {
    var reg = normRegistry(registry);
    var ops = [];
    reg.forEach(function (r) { r.ops.forEach(function (o) { if (ops.indexOf(o.op) < 0) ops.push(o.op); }); });
    return {
      providers: reg.map(function (r) { return { id: r.id, ad: r.ad, rota: r.rota }; }),
      rows: ops.map(function (op) {
        return { op: op, cells: reg.map(function (r) { var f = null; r.ops.forEach(function (o) { if (o.op === op && !f) f = o; }); return f; }) };
      })
    };
  }
  function fmtTime(iso) {
    var d = new Date(String(iso || ""));
    if (isNaN(d.getTime())) return str(iso, 40) || "—";
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  // ------------------------------------------------------------------ DOM yardımcıları
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
  function btn(label, onClick, cls) {
    var b = el("button", cls || "am-more-btn", label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }
  function stateCard(kind, title, detail, retry) {
    var c = el("div", "am-more-card am-more-card--" + (kind === "error" ? "error" : kind === "loading" ? "loading" : "empty"));
    if (kind === "error") c.setAttribute("role", "alert");
    else c.setAttribute("role", "status");
    if (kind === "loading") {
      c.setAttribute("aria-busy", "true");
      c.appendChild(el("p", "am-more-card-t", title));
      for (var i = 0; i < 3; i++) { var s = el("span", "am-more-skel"); s.setAttribute("aria-hidden", "true"); c.appendChild(s); }
      return c;
    }
    c.appendChild(icon(kind === "error" ? "alert" : "info", 18));
    c.appendChild(el("p", "am-more-card-t", title));
    if (detail) c.appendChild(el("p", "am-more-card-d", detail));
    if (retry) c.appendChild(btn(T("page-integrations.retry"), retry));
    return c;
  }
  function clear(node) { node.textContent = ""; }

  // ------------------------------------------------------------------ durum
  var S = {
    AM: null, root: null, page: null, ui: null, requested: false, lastData: null,
    query: "", status: "all", slice: "all", sortKey: "n", sortDir: "asc", expanded: Object.create(null),
    sliceKey: "", toggles: Object.create(null), sorts: Object.create(null), copyMsg: ""
  };

  function request(force) {
    var AM = S.AM;
    if (!AM || !AM.actions || typeof AM.actions.loadData !== "function") return false;
    if (S.requested && !force) return true;
    S.requested = true;
    AM.actions.loadData("capabilities");
    return true;
  }

  function buildShell(root) {
    clear(root);
    var ui = {};
    var page = el("section", "am-more-page");
    page.setAttribute("aria-labelledby", "am-more-int-h");
    var h = el("h2", "am-more-h", T("page-integrations.title"));
    h.setAttribute("id", "am-more-int-h");
    page.appendChild(h);
    page.appendChild(el("p", "am-more-lead", T("page-integrations.lead")));
    var notes = el("div", "am-more-notes");
    notes.appendChild(noteLine("shield", T("page-integrations.honesty")));
    notes.appendChild(noteLine("info", T("page-integrations.noAdapter")));
    page.appendChild(notes);
    ui.body = el("div", "am-more-body");
    page.appendChild(ui.body);
    S.labHost = el("div", "am-more-labhost");
    page.appendChild(S.labHost);
    root.appendChild(page);
    S.page = page;
    return ui;
  }
  function noteLine(iconName, text) {
    var n = el("p", "am-more-note");
    n.appendChild(icon(iconName, 16));
    n.appendChild(el("span", "am-more-note-t", text));
    return n;
  }

  function fill() {
    var AM = S.AM; var ui = S.ui;
    var d = AM.state && AM.state.data ? AM.state.data.capabilities : null;
    if (!d) {
      if (!request(false)) { clear(ui.body); ui.body.appendChild(stateCard("error", T("page-integrations.errTitle"), T("page-integrations.noLoader"), null)); return; }
      clear(ui.body); ui.body.appendChild(stateCard("loading", T("page-integrations.loading"))); ui.built = false; return;
    }
    if (d.status === "loading") { clear(ui.body); ui.body.appendChild(stateCard("loading", T("page-integrations.loading"))); ui.built = false; return; }
    if (d.status === "error") {
      clear(ui.body);
      ui.built = false;
      ui.body.appendChild(stateCard("error", T("page-integrations.errTitle"), T("page-integrations.errDetail", { reason: str(d.reason, 200) || "?" }), function () { request(true); fillSafe(); }));
      return;
    }
    S.requested = false;
    var v = d.value && typeof d.value === "object" ? d.value : {};
    var items = normItems(v.items);
    if (!items.length) {
      clear(ui.body); ui.built = false;
      ui.body.appendChild(stateCard("empty", T("page-integrations.emptyTitle"), T("page-integrations.emptyDetail"), function () { request(true); fillSafe(); }));
      return;
    }
    S.data = { items: items, summary: v.summary, slices: v.slices, registry: v.registry, updatedAt: v.updatedAt };
    if (!ui.built) buildBody(ui);
    fillSummary(ui); fillSlices(ui); fillTable(ui); fillRegistry(ui);
  }

  function buildBody(ui) {
    clear(ui.body);
    ui.summary = el("section", "am-more-sec");
    ui.summary.setAttribute("aria-label", T("page-integrations.summaryLabel"));
    ui.slicesSec = el("section", "am-more-sec");
    ui.slicesSec.setAttribute("aria-labelledby", "am-more-int-sl");
    var sh = el("h3", "am-more-h3", T("page-integrations.slicesTitle")); sh.setAttribute("id", "am-more-int-sl");
    ui.slicesSec.appendChild(sh);
    ui.slicesSec.appendChild(el("p", "am-more-hint", T("page-integrations.slicesHint")));
    ui.slicesGrid = el("ul", "am-more-slices");
    ui.slicesSec.appendChild(ui.slicesGrid);

    ui.tableSec = el("section", "am-more-sec");
    ui.tableSec.setAttribute("aria-labelledby", "am-more-int-tb");
    var th = el("h3", "am-more-h3", T("page-integrations.tableTitle")); th.setAttribute("id", "am-more-int-tb");
    ui.tableSec.appendChild(th);
    ui.controls = el("div", "am-more-controls");
    ui.controls.setAttribute("role", "group");
    ui.controls.setAttribute("aria-label", T("page-integrations.search"));
    var f1 = el("label", "am-more-field");
    f1.setAttribute("for", "am-more-int-q");
    f1.appendChild(el("span", "am-more-field-l", T("page-integrations.search")));
    ui.q = el("input", "am-more-input");
    ui.q.type = "search";
    ui.q.setAttribute("id", "am-more-int-q");
    ui.q.setAttribute("placeholder", T("page-integrations.searchPh"));
    ui.q.setAttribute("autocomplete", "off");
    ui.q.setAttribute("maxlength", "100");
    ui.q.value = S.query;
    ui.q.addEventListener("input", function () { S.query = String(ui.q.value || "").slice(0, 100); fillTable(ui); });
    f1.appendChild(ui.q);
    var f2 = el("label", "am-more-field");
    f2.setAttribute("for", "am-more-int-st");
    f2.appendChild(el("span", "am-more-field-l", T("page-integrations.fStatus")));
    ui.st = el("select", "am-more-select");
    ui.st.setAttribute("id", "am-more-int-st");
    [["all", T("page-integrations.fAll")], ["dogrulandi", T("page-integrations.status.dogrulandi")], ["kismi", T("page-integrations.status.kismi")], ["planli", T("page-integrations.status.planli")], ["desteklenmiyor", T("page-integrations.status.desteklenmiyor")], ["kapsamdisi", T("page-integrations.status.kapsamdisi")]].forEach(function (o) {
      var op = el("option", null, o[1]); op.value = o[0]; ui.st.appendChild(op);
    });
    ui.st.value = S.status;
    ui.st.addEventListener("change", function () { S.status = String(ui.st.value || "all"); fillSummary(ui); fillTable(ui); });
    f2.appendChild(ui.st);
    var f3 = el("label", "am-more-field");
    f3.setAttribute("for", "am-more-int-sl2");
    f3.appendChild(el("span", "am-more-field-l", T("page-integrations.fSlice")));
    ui.sl = el("select", "am-more-select");
    ui.sl.setAttribute("id", "am-more-int-sl2");
    ui.sl.addEventListener("change", function () { S.slice = String(ui.sl.value || "all"); fillTable(ui); });
    f3.appendChild(ui.sl);
    ui.clearBtn = btn(T("page-integrations.fClear"), function () {
      S.query = ""; S.status = "all"; S.slice = "all"; ui.q.value = ""; ui.st.value = "all"; ui.sl.value = "all"; fillSummary(ui); fillTable(ui);
    }, "am-more-btn am-more-btn--ghost");
    ui.controls.appendChild(f1); ui.controls.appendChild(f2); ui.controls.appendChild(f3); ui.controls.appendChild(ui.clearBtn);
    ui.tableSec.appendChild(ui.controls);
    ui.count = el("p", "am-more-count");
    ui.count.setAttribute("role", "status");
    ui.count.setAttribute("aria-live", "polite");
    ui.tableSec.appendChild(ui.count);
    ui.copyLive = el("p", "am-more-sr");
    ui.copyLive.setAttribute("role", "status");
    ui.copyLive.setAttribute("aria-live", "polite");
    ui.tableSec.appendChild(ui.copyLive);
    ui.tableHost = el("div", "am-more-tablehost");
    ui.tableSec.appendChild(ui.tableHost);

    ui.regSec = el("section", "am-more-sec");
    ui.regSec.setAttribute("aria-labelledby", "am-more-int-rg");
    var rh = el("h3", "am-more-h3", T("page-integrations.regTitle")); rh.setAttribute("id", "am-more-int-rg");
    ui.regSec.appendChild(rh);
    ui.regSec.appendChild(el("p", "am-more-hint", T("page-integrations.regHint")));
    ui.regHost = el("div", "am-more-tablehost");
    ui.regSec.appendChild(ui.regHost);

    ui.body.appendChild(ui.summary);
    ui.body.appendChild(ui.slicesSec);
    ui.body.appendChild(ui.tableSec);
    ui.body.appendChild(ui.regSec);
    S.sliceKey = "";
    ui.built = true;
  }

  function fillSummary(ui) {
    clear(ui.summary);
    var counts = countByStatus(S.data.items);
    var list = el("ul", "am-more-tiles");
    ["dogrulandi", "kismi", "planli", "desteklenmiyor", "kapsamdisi"].forEach(function (k) {
      var info = statusInfo(k);
      var li = el("li", "am-more-tile-li");
      var b = el("button", "am-more-tile am-more-tile--" + info.tone);
      b.type = "button";
      b.setAttribute("aria-pressed", S.status === k ? "true" : "false");
      b.appendChild(icon(info.icon, 16));
      b.appendChild(el("span", "am-more-tile-n", counts[k]));
      b.appendChild(el("span", "am-more-tile-l", T(info.labelKey)));
      b.addEventListener("click", function () {
        S.status = S.status === k ? "all" : k; ui.st.value = S.status; fillSummary(ui); fillTable(ui);
      });
      li.appendChild(b); list.appendChild(li);
    });
    var tot = el("li", "am-more-tile-li");
    var tb = el("div", "am-more-tile am-more-tile--total");
    tb.appendChild(el("span", "am-more-tile-n", counts.total));
    tb.appendChild(el("span", "am-more-tile-l", T("page-integrations.sumTotal")));
    tot.appendChild(tb); list.appendChild(tot);
    ui.summary.appendChild(list);
    if (counts.bilinmiyor > 0) {
      var c = chip(T("page-integrations.status.bilinmiyor") + ": " + counts.bilinmiyor, "info", "info");
      ui.summary.appendChild(c);
    }
    if (summaryMismatch(S.data.summary, counts)) {
      var s = S.data.summary || {};
      var srv = [s.dogrulandi, s.kismi, s.planli, s.desteklenmiyor, s.kapsamdisi, s.total].map(function (x) { return str(x, 8); }).join("/");
      var calc = [counts.dogrulandi, counts.kismi, counts.planli, counts.desteklenmiyor, counts.kapsamdisi, counts.total].join("/");
      var warn = el("p", "am-more-note am-more-note--warn");
      warn.setAttribute("role", "status");
      warn.appendChild(icon("alert", 16));
      warn.appendChild(el("span", "am-more-note-t", T("page-integrations.sumMismatch", { srv: srv, calc: calc })));
      ui.summary.appendChild(warn);
    }
    if (S.data.updatedAt) ui.summary.appendChild(el("p", "am-more-hint", T("page-integrations.updated", { at: fmtTime(S.data.updatedAt) })));
  }

  function fillSlices(ui) {
    var stats = sliceStats(S.data.items, S.data.slices);
    clear(ui.slicesGrid);
    stats.forEach(function (s) {
      var li = el("li", "am-more-slice" + (s.complete ? " am-more-slice--done" : ""));
      var head = el("div", "am-more-slice-h");
      head.appendChild(el("strong", "am-more-slice-id", s.id));
      head.appendChild(s.complete ? chip(T("page-integrations.sliceComplete"), "ok", "check") : chip(T("page-integrations.sliceOpen"), "muted", "clock"));
      li.appendChild(head);
      li.appendChild(el("p", "am-more-slice-d", s.desc));
      li.appendChild(el("p", "am-more-slice-n", T("page-integrations.sliceItems", { n: s.total }) + " · " + T("page-integrations.sliceDone", { d: s.done, n: s.total })));
      if (s.total > 0) {
        li.appendChild(btn(T("page-integrations.sliceShow"), function () {
          S.slice = s.id; ui.sl.value = s.id; fillTable(ui);
        }, "am-more-btn am-more-btn--ghost"));
      }
      ui.slicesGrid.appendChild(li);
    });
    // Dilim süzgeci seçenekleri: dilim listesi değişmedikçe elle dokunma (seçim korunur).
    var ids = stats.map(function (s) { return s.id; });
    if (S.data.items.some(function (it) { return !it.dilim || it.dilim === "-"; })) ids.push("-");
    var key = ids.join("|");
    if (key !== S.sliceKey) {
      S.sliceKey = key;
      clear(ui.sl);
      var all = el("option", null, T("page-integrations.fAll")); all.value = "all"; ui.sl.appendChild(all);
      ids.forEach(function (id) { var o = el("option", null, id === "-" ? T("page-integrations.sliceNone") : id); o.value = id; ui.sl.appendChild(o); });
      if (S.slice !== "all" && ids.indexOf(S.slice) < 0) S.slice = "all";
      ui.sl.value = S.slice;
    }
  }

  var COLS = [
    { key: "n", label: "page-integrations.col.n", sort: true },
    { key: "name", label: "page-integrations.col.name", sort: true },
    { key: "sahip", label: "page-integrations.col.owner", sort: true },
    { key: "durum", label: "page-integrations.col.status", sort: true },
    { key: "kanit", label: "page-integrations.col.proof", sort: false },
    { key: "eksik", label: "page-integrations.col.gap", sort: false },
    { key: "dilim", label: "page-integrations.col.slice", sort: true }
  ];

  function copyPath(ui, path) {
    var AM = S.AM;
    var done = function (ok) { ui.copyLive.textContent = ok ? T("page-integrations.copied", { path: path }) : T("page-integrations.copyFail"); };
    try {
      if (AM.actions && typeof AM.actions.copyText === "function") {
        var r = AM.actions.copyText(path);
        if (r && typeof r.then === "function") r.then(function (ok) { done(ok !== false); }, function () { done(false); }); else done(true);
      } else done(false);
    } catch (e) { done(false); }
  }

  function fillTable(ui) {
    var all = S.data.items;
    var rows = sortItems(filterItems(all, { query: S.query, status: S.status, slice: S.slice }), S.sortKey, S.sortDir);
    ui.count.textContent = T("page-integrations.count", { shown: rows.length, total: all.length });
    clear(ui.tableHost);
    S.toggles = Object.create(null); S.sorts = Object.create(null);
    if (!rows.length) {
      ui.tableHost.appendChild(stateCard("empty", T("page-integrations.noMatch"), "", null));
      return;
    }
    var wrap = el("div", "am-more-tablewrap");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("aria-label", T("page-integrations.caption"));
    var t = el("table", "am-more-table am-more-table--cap");
    t.appendChild(el("caption", "am-more-sr", T("page-integrations.caption")));
    var thead = el("thead"); var htr = el("tr");
    COLS.forEach(function (c) {
      var th = el("th", "am-more-th am-more-th--" + c.key);
      th.setAttribute("scope", "col");
      if (c.sort) {
        var active = S.sortKey === c.key;
        th.setAttribute("aria-sort", active ? (S.sortDir === "desc" ? "descending" : "ascending") : "none");
        var b = el("button", "am-more-sortbtn");
        b.type = "button";
        b.setAttribute("aria-label", T("page-integrations.sortBy", { col: T(c.label) }));
        b.appendChild(el("span", "am-more-sortbtn-t", T(c.label)));
        b.appendChild(icon(active ? (S.sortDir === "desc" ? "chevron-down" : "chevron-up") : "chevron-right", 12));
        b.addEventListener("click", function () {
          if (S.sortKey === c.key) S.sortDir = S.sortDir === "asc" ? "desc" : "asc"; else { S.sortKey = c.key; S.sortDir = "asc"; }
          fillTable(ui);
          if (S.sorts[c.key] && typeof S.sorts[c.key].focus === "function") S.sorts[c.key].focus();
        });
        S.sorts[c.key] = b;
        th.appendChild(b);
      } else {
        th.textContent = T(c.label);
      }
      htr.appendChild(th);
    });
    thead.appendChild(htr); t.appendChild(thead);
    var tb = el("tbody");
    rows.forEach(function (it) { appendRow(ui, tb, it); });
    t.appendChild(tb); wrap.appendChild(t); ui.tableHost.appendChild(wrap);
  }

  function appendRow(ui, tb, it) {
    var info = statusInfo(it.durum);
    var open = S.expanded[it.n] === true;
    var tr = el("tr", "am-more-row am-more-row--" + info.key);
    tr.setAttribute("data-n", String(it.n));
    var th = el("th", "am-more-td am-more-td--n", it.n);
    th.setAttribute("scope", "row");
    tr.appendChild(th);

    var tdName = el("td", "am-more-td am-more-td--name");
    var tg = el("button", "am-more-toggle");
    tg.type = "button";
    tg.setAttribute("aria-expanded", open ? "true" : "false");
    tg.setAttribute("aria-controls", "am-more-int-d" + it.n);
    tg.setAttribute("aria-label", T(open ? "page-integrations.collapse" : "page-integrations.expand", { n: it.n }));
    tg.appendChild(icon(open ? "chevron-down" : "chevron-right", 14));
    var names = el("span", "am-more-names");
    names.appendChild(el("span", "am-more-name-tr", it.tr || it.en));
    if (it.en && it.en !== it.tr) names.appendChild(el("span", "am-more-name-en", it.en));
    tg.appendChild(names);
    tg.addEventListener("click", function () {
      S.expanded[it.n] = !(S.expanded[it.n] === true);
      fillTable(ui);
      if (S.toggles[it.n] && typeof S.toggles[it.n].focus === "function") S.toggles[it.n].focus();
    });
    S.toggles[it.n] = tg;
    tdName.appendChild(tg);
    tr.appendChild(tdName);

    tr.appendChild(el("td", "am-more-td am-more-td--mono", it.sahip || "—"));

    var tdSt = el("td", "am-more-td");
    tdSt.appendChild(chip(it.durum && info.key === "bilinmiyor" ? T(info.labelKey) + ": " + it.durum : T(info.labelKey), info.tone, info.icon));
    if (needsDecision(it)) {
      var dc = chip(T("page-integrations.decision"), "warn", "bell");
      dc.className += " am-more-chip--decision";
      tdSt.appendChild(dc);
    }
    tr.appendChild(tdSt);

    var tdPr = el("td", "am-more-td am-more-td--proof");
    if (!it.kanit.length) tdPr.appendChild(el("span", "am-more-dim", T("page-integrations.proofNone")));
    it.kanit.slice(0, 2).forEach(function (p) { tdPr.appendChild(proofBtn(ui, p)); });
    if (it.kanit.length > 2) tdPr.appendChild(el("span", "am-more-dim", T("page-integrations.proofMore", { n: it.kanit.length - 2 })));
    tr.appendChild(tdPr);

    var gap = it.eksik.length > 110 ? it.eksik.slice(0, 107) + "…" : it.eksik;
    tr.appendChild(el("td", "am-more-td am-more-td--gap", gap || T("page-integrations.gapNone")));
    tr.appendChild(el("td", "am-more-td am-more-td--mono", it.dilim || "-"));
    tb.appendChild(tr);

    if (open) {
      var dr = el("tr", "am-more-detail");
      dr.setAttribute("id", "am-more-int-d" + it.n);
      var dd = el("td", "am-more-detail-td");
      dd.setAttribute("colspan", String(COLS.length));
      var box = el("div", "am-more-detailbox");
      box.appendChild(el("h4", "am-more-h4", T("page-integrations.gapFull")));
      box.appendChild(el("p", "am-more-detail-p", it.eksik || T("page-integrations.gapNone")));
      box.appendChild(el("h4", "am-more-h4", T("page-integrations.proofFull")));
      if (!it.kanit.length) box.appendChild(el("p", "am-more-detail-p", T("page-integrations.proofNone")));
      else {
        var ul = el("ul", "am-more-proofs");
        it.kanit.forEach(function (p) {
          var li = el("li", "am-more-proofs-li");
          li.appendChild(proofBtn(ui, p, true));
          ul.appendChild(li);
        });
        box.appendChild(ul);
      }
      dd.appendChild(box); dr.appendChild(dd); tb.appendChild(dr);
    }
  }

  function proofBtn(ui, path, full) {
    var b = el("button", "am-more-proof", full ? path : shortPath(path));
    b.type = "button";
    b.setAttribute("title", path);
    b.setAttribute("aria-label", T("page-integrations.proofCopy", { path: path }));
    b.addEventListener("click", function () { copyPath(ui, path); });
    return b;
  }

  function fillRegistry(ui) {
    clear(ui.regHost);
    if (advGate("registry")) { ui.regHost.appendChild(advStub("registry")); return; }
    var m = registryMatrix(S.data.registry);
    if (!m.providers.length || !m.rows.length) { ui.regHost.appendChild(stateCard("empty", T("page-integrations.regEmpty"), "", null)); return; }
    var wrap = el("div", "am-more-tablewrap");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("aria-label", T("page-integrations.regCaption"));
    var t = el("table", "am-more-table");
    t.appendChild(el("caption", "am-more-sr", T("page-integrations.regCaption")));
    var thead = el("thead"); var htr = el("tr");
    var th0 = el("th", "am-more-th", T("page-integrations.regOp")); th0.setAttribute("scope", "col"); htr.appendChild(th0);
    m.providers.forEach(function (p) {
      var th = el("th", "am-more-th"); th.setAttribute("scope", "col");
      th.appendChild(el("span", "am-more-name-tr", p.ad || p.id));
      if (p.rota) th.appendChild(el("span", "am-more-name-en", T("page-integrations.regRoute", { route: p.rota })));
      htr.appendChild(th);
    });
    thead.appendChild(htr); t.appendChild(thead);
    var tb = el("tbody");
    m.rows.forEach(function (r) {
      var tr = el("tr", "am-more-row am-more-regrow");
      var th = el("th", "am-more-td am-more-td--mono", r.op); th.setAttribute("scope", "row"); tr.appendChild(th);
      r.cells.forEach(function (c) {
        var td = el("td", "am-more-td");
        if (!c) td.appendChild(chip(T("page-integrations.op.unknown"), "info", "info"));
        else {
          var oi = opInfo(c.durum);
          td.appendChild(chip(T(oi.labelKey), oi.tone, oi.icon));
          td.appendChild(el("span", "am-more-evid", c.kanit || T("page-integrations.noProof")));
        }
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb); wrap.appendChild(t); ui.regHost.appendChild(wrap);
  }

  // ------------------------------------------------------------------ Sistem analitiği (D9): yalnız kullanıcı bölümü açıp çalıştırınca çalışan, SALT OKUNUR hesaplar (ADR-016).
  // Hiçbiri kendiliğinden başlamaz; hiçbiri kayıt, karar ya da dosya yazmaz; hiçbiri silme önerisi değildir. Girdiler modül düzeyinde HAM metin olarak tutulur (sayfa her durum değişiminde baştan çizilir).
  var LB = { open: Object.create(null), lastParam: "", uid: 0, swDays: "7", swKey: null, file: "", depth: "3", impactKey: null, graphOn: false, exitId: "", exitKey: null, cap: "execute", role: "", brokerKey: null, err: Object.create(null), reqD: Object.create(null), relFrom: "", relTo: "", relKey: null, dpPath: "", dpKey: null };
  var LAB_IDS = ["am-lab-switching", "am-lab-impact", "am-lab-shadow", "am-lab-cont", "am-lab-offline", "am-lab-exit", "am-lab-absence", "am-lab-expertise", "am-lab-broker", "am-lab-techdebt", "am-lab-release", "am-lab-dataprofile"];
  var IMPACT_FILE_RE = /^[A-Za-z0-9_.\/-]{1,200}$/;
  var PROVIDER_RE = /^[A-Za-z0-9_.:-]{1,60}$/;
  var BROKER_OPS = ["describeCapabilities", "validateConfiguration", "testConnection", "execute", "streamEvents", "getStatus", "cancel", "collectEvidence", "getUsage", "dispose"];
  var BROKER_ROLES = ["plan", "implement", "review", "verify"];
  var SECRET_RE = /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,})\b|Bearer\s+[A-Za-z0-9._~+\/=-]{12,}/g;
  var CTRL_RE = /[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

  function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  function num(v) { var n = Number(v); return v === null || v === undefined || v === "" || !isFinite(n) ? null : n; }
  function safe(v, max) {
    var s = typeof v === "string" ? v : v == null ? "" : String(v);
    s = s.replace(CTRL_RE, " ").replace(SECRET_RE, "[gizli]");
    var lim = max || 300;
    return s.length > lim ? s.slice(0, lim - 1) + "…" : s;
  }
  function fmtNum(n, d) {
    var x = num(n);
    if (x === null) return "—";
    try { return x.toLocaleString("tr-TR", { maximumFractionDigits: d === undefined ? 2 : d }); } catch (e) { return String(x); }
  }
  function cnt(n) { var x = num(n); return x === null ? "—" : fmtNum(x, 0); }
  function pct(n) { var x = num(n); return x === null ? "—" : "%" + fmtNum(x * 100, 0); }
  function secOf(param) {
    var m = typeof param === "string" ? /^bolum:([A-Za-z0-9._-]{1,60})(?::[0-9]{1,6})?$/.exec(param) : null;
    return m ? m[1] : "";
  }
  // Yetenekler menüsünden gelindiyse (pageParam "bolum:<kimlik>[:<sayaç>]") ilgili bölüm bir kez açılır.
  function applyParam(param) {
    if (typeof param !== "string" || param === LB.lastParam) return;
    LB.lastParam = param;
    var id = secOf(param);
    if (id && LAB_IDS.indexOf(id) >= 0) LB.open[id] = true;
  }
  function dataOf(key) { var AM = S.AM; return AM && AM.state && AM.state.data ? AM.state.data[key] : undefined; }
  // Veri isteği: aynı veri nesnesi için bir kez (çıkış/girişte yenilenir); zorla = "Yenile"/"Analiz et".
  function ensure(key, param, force) {
    var AM = S.AM;
    if (!AM || !AM.actions || typeof AM.actions.loadData !== "function") return;
    var rk = param === undefined ? key : key + ":" + param;
    var store = AM.state && AM.state.data;
    if (!force && (dataOf(rk) || LB.reqD[rk] === store)) return;
    LB.reqD[rk] = store;
    try {
      var r = param === undefined ? AM.actions.loadData(key) : AM.actions.loadData(key, param);
      if (r && typeof r.then === "function") r.then(null, function () { /* hata AM.state.data'ya yazılır */ });
    } catch (e) { /* görünür hata sonraki çizimde */ }
  }

  function kbtn(label, key, onClick, ghost) {
    var b = el("button", "am-more-btn" + (ghost ? " am-more-btn--ghost" : ""), label);
    b.type = "button";
    if (key) b.setAttribute("data-am-key", key);
    b.addEventListener("click", onClick);
    return b;
  }
  function inputField(parent, o) {
    LB.uid += 1;
    var id = "am-lab-f" + LB.uid;
    var lab = el("label", "am-more-field" + (o.wide ? " am-more-field--grow" : ""));
    lab.setAttribute("for", id);
    lab.appendChild(el("span", "am-more-field-l", o.label));
    var c;
    if (o.options) {
      c = el("select", "am-more-input");
      o.options.forEach(function (p) { var op = el("option", null, p[1]); op.value = p[0]; if (p[0] === o.get()) op.selected = true; c.appendChild(op); });
      c.value = o.get();
      c.addEventListener("change", function () { o.set(String(c.value)); });
    } else {
      c = el("input", "am-more-input");
      c.type = "text";
      c.setAttribute("autocomplete", "off");
      c.setAttribute("maxlength", String(o.max || 200));
      c.value = o.get();
      var take = function () { o.set(String(c.value)); };
      c.addEventListener("input", function (ev) { if (ev && ev.isComposing) return; take(); });
      c.addEventListener("compositionend", take);
    }
    c.setAttribute("id", id);
    c.setAttribute("data-am-key", o.key);
    lab.appendChild(c);
    parent.appendChild(lab);
    return c;
  }
  function labTable(caption, cols, rows) {
    var wrap = el("div", "am-more-tablewrap");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("aria-label", caption);
    var t = el("table", "am-more-table");
    t.appendChild(el("caption", "am-more-sr", caption));
    var thead = el("thead"), htr = el("tr");
    cols.forEach(function (c) { var th = el("th", "am-more-th", c); th.setAttribute("scope", "col"); htr.appendChild(th); });
    thead.appendChild(htr);
    t.appendChild(thead);
    var tb = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr", "am-more-row");
      r.forEach(function (cell, i) {
        var td = i === 0 ? el("th", "am-more-td am-more-td--name") : el("td", "am-more-td");
        if (i === 0) td.setAttribute("scope", "row");
        if (cell && typeof cell === "object" && cell.nodeType) td.appendChild(cell); else td.textContent = String(cell == null ? "" : cell);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    return wrap;
  }
  function bar(value, label) {
    var w = el("div", "am-more-bar");
    var f = num(value);
    var p = el("progress", "am-more-meter");
    p.setAttribute("max", "100");
    p.setAttribute("value", String(f === null ? 0 : Math.max(0, Math.min(100, Math.round(f)))));
    p.setAttribute("aria-label", label);
    w.appendChild(p);
    w.appendChild(el("span", "am-more-bar-t", f === null ? "—" : fmtNum(f, 0) + " / 100"));
    return w;
  }
  function lines(parent, list, cap, total) {
    var items = (Array.isArray(list) ? list : []).slice(0, cap || 30);
    if (!items.length) return;
    var ul = el("ul", "am-more-facts");
    items.forEach(function (t) { ul.appendChild(el("li", "am-more-fact", safe(t, 400))); });
    var all = total === undefined ? (Array.isArray(list) ? list.length : 0) : total;
    if (all > items.length) ul.appendChild(el("li", "am-more-fact", T("page-integrations.labMore", { n: fmtNum(all - items.length, 0) })));
    parent.appendChild(ul);
  }
  function kvBox(rows) {
    var dl = el("dl", "am-more-kv");
    rows.forEach(function (p) {
      var w = el("div", "am-more-kv-i");
      w.appendChild(el("dt", "am-more-kv-k", p[0]));
      w.appendChild(el("dd", "am-more-kv-v", p[1]));
      dl.appendChild(w);
    });
    return dl;
  }
  function strList(list, cap) { return (Array.isArray(list) ? list : []).slice(0, cap || 10).map(function (x) { return safe(x, 80); }).join(", "); }

  function labSection(id, titleKey, leadKey, build) {
    var sec = el("section", "am-more-sec am-more-lab");
    sec.setAttribute("aria-labelledby", id);
    var head = el("div", "am-more-labhead");
    var h = el("h4", "am-more-h4 am-more-labtitle", T(titleKey));
    h.setAttribute("id", id);
    head.appendChild(h);
    var open = LB.open[id] === true;
    var b = kbtn(T(open ? "page-integrations.labClose" : "page-integrations.labOpen"), "lab-toggle:" + id, function () { LB.open[id] = !open; renderLabs(); }, true);
    b.setAttribute("aria-expanded", open ? "true" : "false");
    head.appendChild(b);
    sec.appendChild(head);
    sec.appendChild(el("p", "am-more-hint", T(leadKey)));
    if (open) {
      var body = el("div", "am-more-labbody");
      sec.appendChild(body);
      try { build(body); } catch (e) { body.appendChild(stateCard("error", T("page-integrations.errTitle"), T("page-integrations.renderErr", { reason: str(e && e.message, 200) }), null)); }
    }
    return sec;
  }
  // Veri durumları: yükleniyor / hata (+ yeniden dene) / sonuç. render(box, value) bozuk yanıtta fırlatabilir; kart gösterilir.
  function resultOf(body, key, errKey, retry, render) {
    var d = dataOf(key);
    if (!d || d.status === "loading") { body.appendChild(stateCard("loading", T("page-integrations.labLoading"))); return; }
    if (d.status === "error") { body.appendChild(stateCard("error", T(errKey), T("page-integrations.errDetail", { reason: safe(d.reason, 200) || "?" }), retry)); return; }
    var box = el("div", "am-more-result");
    box.setAttribute("aria-live", "polite");
    try {
      if (!isObj(d.value)) throw new Error("bozuk");
      render(box, d.value);
    } catch (e) {
      box.textContent = "";
      box.appendChild(stateCard("error", T(errKey), T("page-integrations.labBad"), retry));
    }
    body.appendChild(box);
  }
  // Parametresiz bölümler: açılınca bir kez yüklenir.
  function plainBody(body, key, errKey, render) {
    ensure(key);
    var retry = function () { ensure(key, undefined, true); renderLabs(); };
    resultOf(body, key, errKey, retry, render);
    body.appendChild(kbtn(T("page-integrations.labRefresh"), "lab-refresh:" + key, retry, true));
  }
  function need(v, name) { if (!isObj(v[name])) throw new Error("yanıt anahtarı yok"); return v[name]; }

  // ---- Etki haritası (70) + graf özeti ----
  function impactParam() {
    var file = LB.file.trim();
    if (!IMPACT_FILE_RE.test(file) || file.indexOf("..") >= 0 || file.charAt(0) === "/") return { err: T("page-integrations.impactBadFile") };
    var d = /^[1-6]$/.test(LB.depth) ? parseInt(LB.depth, 10) : 0;
    if (d < 1) return { err: T("page-integrations.impactBadDepth") };
    return { param: file + "|" + d };
  }
  function runImpact() {
    var p = impactParam();
    if (p.err) { LB.err["impact"] = p.err; LB.impactKey = null; renderLabs(); return; }
    delete LB.err["impact"];
    LB.impactKey = "analysisImpact:" + p.param;
    ensure("analysisImpact", p.param, true);
    renderLabs();
  }
  function impactResult(box, v) {
    var im = need(v, "impact");
    var r = isObj(im.radius) ? im.radius : {};
    box.appendChild(kvBox([[T("page-integrations.impactFile"), safe(im.file, 200)], [T("page-integrations.impactDepth"), cnt(im.depth)], [T("page-integrations.impactIsTest"), im.isTest === true ? T("page-integrations.yes") : T("page-integrations.no")],
      [T("page-integrations.impactDirect"), cnt(r.direct)], [T("page-integrations.impactTransitive"), cnt(r.transitive)], [T("page-integrations.impactTests"), cnt(r.tests)],
      [T("page-integrations.impactUnbounded"), cnt(r.unboundedTransitive)], [T("page-integrations.impactMaxDist"), cnt(r.unboundedMaxDistance)]]));
    if (im.inCycle === true) {
      box.appendChild(noteLine("alert", T("page-integrations.impactCycle")));
      if (Array.isArray(im.cycle)) lines(box, [im.cycle.slice(0, 20).map(function (x) { return safe(x, 120); }).join(" → ")], 1);
    }
    if (im.truncated === true) box.appendChild(noteLine("alert", T("page-integrations.impactCut")));
    var layers = (Array.isArray(im.layers) ? im.layers : []).filter(isObj).slice(0, 6);
    if (!layers.length) box.appendChild(stateCard("empty", T("page-integrations.impactNone"), T("page-integrations.impactNoneDetail"), null));
    layers.forEach(function (l, i) {
      box.appendChild(el("h5", "am-more-h5", T("page-integrations.impactLayer", { n: i + 1, d: cnt(l.distance) })));
      lines(box, l.files, 50, Array.isArray(l.files) ? l.files.length : 0);
      if (Array.isArray(l.tests) && l.tests.length) { box.appendChild(el("p", "am-more-hint", T("page-integrations.impactLayerTests"))); lines(box, l.tests, 30, l.tests.length); }
    });
    var at = (Array.isArray(im.affectedTests) ? im.affectedTests : []).filter(isObj);
    if (at.length) {
      box.appendChild(el("h5", "am-more-h5", T("page-integrations.impactAffected")));
      box.appendChild(labTable(T("page-integrations.impactAffected"), [T("page-integrations.impactColTest"), T("page-integrations.impactColDist")], at.slice(0, 50).map(function (t) { return [safe(t.file, 200), cnt(t.distance)]; })));
    }
    if (Array.isArray(im.directImports) && im.directImports.length) { box.appendChild(el("h5", "am-more-h5", T("page-integrations.impactImports"))); lines(box, im.directImports, 30, im.directImports.length); }
    if (im.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(im.note, 500) })));
  }
  function graphResult(box, v) {
    var g = need(v, "graph");
    var sc = isObj(g.scan) ? g.scan : {};
    box.appendChild(kvBox([[T("page-integrations.graphFiles"), cnt(g.files)], [T("page-integrations.graphEdges"), cnt(g.edges)], [T("page-integrations.graphExternal"), cnt(g.externalImports)], [T("page-integrations.graphUnresolved"), cnt(g.unresolvedInSrc)],
      [T("page-integrations.graphDynamic"), cnt(g.dynamicImports)], [T("page-integrations.graphCycles"), cnt(g.cycleCount)]]));
    if (sc.truncated === true) box.appendChild(noteLine("alert", T("page-integrations.graphCut")));
    var top = (Array.isArray(g.topDependedOn) ? g.topDependedOn : []).filter(isObj);
    if (top.length) { box.appendChild(el("h5", "am-more-h5", T("page-integrations.graphTop"))); lines(box, top.map(function (t) { return safe(t.file, 200) + " — " + T("page-integrations.graphDeps", { n: cnt(t.dependents) }); }), 20, top.length); }
    var cyc = (Array.isArray(g.cycles) ? g.cycles : []).filter(Array.isArray);
    if (cyc.length) { box.appendChild(el("h5", "am-more-h5", T("page-integrations.graphCycleList"))); lines(box, cyc.map(function (c) { return c.slice(0, 20).map(function (x) { return safe(x, 120); }).join(" → "); }), 5, cyc.length); }
    if (g.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(g.note, 500) })));
  }
  function impactSection(body) {
    var f = el("div", "am-more-controls");
    inputField(f, { key: "impact-file", label: T("page-integrations.impactFileLabel"), wide: true, max: 200, get: function () { return LB.file; }, set: function (v) { LB.file = v; } });
    inputField(f, { key: "impact-depth", label: T("page-integrations.impactDepthLabel"), options: [1, 2, 3, 4, 5, 6].map(function (n) { return [String(n), String(n)]; }), get: function () { return LB.depth; }, set: function (v) { LB.depth = v; } });
    body.appendChild(f);
    body.appendChild(el("p", "am-more-hint", T("page-integrations.impactHelp")));
    var row = el("div", "am-more-actions");
    row.appendChild(kbtn(T("page-integrations.impactRun"), "impact-run", runImpact, false));
    row.appendChild(kbtn(T("page-integrations.graphRun"), "graph-run", function () { LB.graphOn = true; ensure("analysisGraph", undefined, true); renderLabs(); }, true));
    body.appendChild(row);
    if (LB.err["impact"]) { var e = stateCard("error", T("page-integrations.impactInvalid"), LB.err["impact"], null); body.appendChild(e); }
    if (LB.impactKey) resultOf(body, LB.impactKey, "page-integrations.impactErr", runImpact, impactResult);
    if (LB.graphOn) { body.appendChild(el("h5", "am-more-h5", T("page-integrations.graphTitle"))); resultOf(body, "analysisGraph", "page-integrations.graphErr", function () { ensure("analysisGraph", undefined, true); renderLabs(); }, graphResult); }
  }

  // ---- Yetenek sürekliliği (73) ----
  function contResult(box, v) {
    var c = need(v, "continuity");
    var s = isObj(c.summary) ? c.summary : {};
    box.appendChild(kvBox([[T("page-integrations.contProviders"), cnt(s.providers)], [T("page-integrations.contActive"), cnt(s.activeProviders)], [T("page-integrations.contCaps"), cnt(s.capabilities)],
      [T("page-integrations.contSingle"), cnt(s.singlePoints)], [T("page-integrations.contEssential"), cnt(s.essentialSinglePoints)], [T("page-integrations.contNobody"), cnt(s.offeredByNobody)]]));
    var sp = (Array.isArray(c.singlePoints) ? c.singlePoints : []).filter(isObj);
    box.appendChild(el("h5", "am-more-h5", T("page-integrations.contSingleTitle")));
    if (!sp.length) box.appendChild(el("p", "am-more-hint", T("page-integrations.contNoSingle")));
    else box.appendChild(labTable(T("page-integrations.contSingleTitle"), [T("page-integrations.contColCap"), T("page-integrations.contColProv"), T("page-integrations.contColStatus"), T("page-integrations.contColEss"), T("page-integrations.contColActive")],
      sp.slice(0, 100).map(function (p) { return [safe(p.capability, 80), safe(p.provider, 60), safe(p.status, 40), p.essential === true ? chip(T("page-integrations.contEssChip"), "warn", "alert") : "—", p.active === true ? chip(T("page-integrations.contActiveChip"), "ok", "check") : chip(T("page-integrations.contInactiveChip"), "muted", "info")]; })));
    var nobody = (Array.isArray(c.capabilities) ? c.capabilities : []).filter(function (x) { return isObj(x) && x.nobody === true; });
    if (nobody.length) { box.appendChild(el("h5", "am-more-h5", T("page-integrations.contNobodyTitle"))); lines(box, nobody.map(function (x) { return safe(x.operation, 80); }), 30, nobody.length); }
    var lost = (Array.isArray(c.ifProviderLost) ? c.ifProviderLost : []).filter(isObj);
    box.appendChild(el("h5", "am-more-h5", T("page-integrations.contLostTitle")));
    if (!lost.length) box.appendChild(el("p", "am-more-hint", T("page-integrations.contLostNone")));
    else box.appendChild(labTable(T("page-integrations.contLostTitle"), [T("page-integrations.contColProv"), T("page-integrations.contColLost"), T("page-integrations.contColKept"), T("page-integrations.contColLeft")],
      lost.slice(0, 50).map(function (l) {
        return [safe(l.provider, 60), (Array.isArray(l.lost) && l.lost.length ? strList(l.lost, 10) + (l.lost.length > 10 ? " …" : "") : T("page-integrations.contNothing")), Array.isArray(l.retained) ? String(l.retained.length) : "—", l.noProviderLeft === true ? chip(T("page-integrations.contNoneLeft"), "bad", "alert") : "—"];
      })));
    if (c.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(c.note, 500) })));
  }

  // ---- Çıkış / değiştirilebilirlik (80) ----
  function runExit() {
    var id = LB.exitId.trim();
    if (!PROVIDER_RE.test(id)) { LB.err["exit"] = T("page-integrations.exitBad"); LB.exitKey = null; renderLabs(); return; }
    delete LB.err["exit"];
    LB.exitKey = "analysisExit:" + id;
    ensure("analysisExit", id, true);
    renderLabs();
  }
  var EXIT_VERDICT = { "yedek var": ["ok", "check", "page-integrations.exitVerdictOk"], "kısmi yedek": ["warn", "alert", "page-integrations.exitVerdictPart"], "yedek yok": ["bad", "alert", "page-integrations.exitVerdictNone"] };
  function exitResult(box, v) {
    var x = need(v, "exit");
    var t = isObj(x.target) ? x.target : {};
    var vd = Object.prototype.hasOwnProperty.call(EXIT_VERDICT, x.verdict) ? EXIT_VERDICT[x.verdict] : ["muted", "info", "page-integrations.exitVerdictUnknown"];
    var head = el("div", "am-more-hit-h");
    head.appendChild(chip(T(vd[2]), vd[0], vd[1]));
    box.appendChild(head);
    box.appendChild(el("p", "am-more-hit-t", T("page-integrations.exitTarget", { ad: safe(t.displayName, 100), id: safe(t.id, 60), rota: safe(t.routeKind, 40) })));
    if (x.summary) box.appendChild(el("p", "am-more-hint", safe(x.summary, 500)));
    var cands = (Array.isArray(x.candidates) ? x.candidates : []).filter(isObj);
    if (!cands.length) box.appendChild(noteLine("alert", T("page-integrations.exitNoCand")));
    else box.appendChild(labTable(T("page-integrations.exitCandCaption"), [T("page-integrations.exitColProv"), T("page-integrations.exitColRoute"), T("page-integrations.exitColCover"), T("page-integrations.exitColHealth"), T("page-integrations.exitColScore"), T("page-integrations.exitColMissing"), T("page-integrations.exitColWhy")],
      cands.slice(0, 20).map(function (c) {
        var miss = (Array.isArray(c.missing) ? c.missing : []).filter(isObj).map(function (m) { return safe(m.operation, 60); });
        return [safe(c.displayName, 100) + " (" + safe(c.provider, 60) + ")", safe(c.routeKind, 40), pct(c.coverage), safe(c.health, 20), c.swapScore == null ? "—" : fmtNum(c.swapScore, 0), miss.length ? miss.slice(0, 10).join(", ") : T("page-integrations.exitNoMissing"), strList(c.reasons, 4)];
      })));
    var closed = (Array.isArray(x.closed) ? x.closed : []).filter(isObj);
    if (closed.length) {
      box.appendChild(el("h5", "am-more-h5", T("page-integrations.exitClosed")));
      closed.slice(0, 20).forEach(function (c) {
        var p = el("p", "am-more-evid");
        p.appendChild(chip(c.routeKind === "api_paid" ? T("page-integrations.exitPaidOff") : T("page-integrations.exitRouteOff"), "muted", "shield"));
        p.appendChild(el("span", "am-more-chip-t", safe(c.displayName, 100) + " (" + safe(c.provider, 60) + ") — " + strList(c.reasons, 3)));
        box.appendChild(p);
      });
    }
    var ex = (Array.isArray(x.excluded) ? x.excluded : []).filter(isObj);
    if (ex.length) { box.appendChild(el("h5", "am-more-h5", T("page-integrations.exitExcluded"))); lines(box, ex.map(function (c) { return safe(c.displayName, 100) + " (" + safe(c.provider, 60) + ") — " + strList(c.reasons, 3); }), 20, ex.length); }
    if (x.formula) box.appendChild(el("p", "am-more-hint", T("page-integrations.exitFormula", { f: safe(x.formula, 600) })));
    if (x.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(x.note, 500) })));
  }
  function exitSection(body) {
    var provs = (S.AM && S.AM.state && Array.isArray(S.AM.state.providers) ? S.AM.state.providers : []).filter(function (p) { return isObj(p) && typeof p.id === "string" && PROVIDER_RE.test(p.id); }).slice(0, 30);
    var f = el("div", "am-more-controls");
    if (provs.length) {
      if (!provs.some(function (p) { return p.id === LB.exitId; })) LB.exitId = provs[0].id;
      inputField(f, { key: "exit-provider", label: T("page-integrations.exitProvider"), wide: true, options: provs.map(function (p) { return [p.id, safe(p.displayName || p.id, 80) + " (" + p.id + ")"]; }), get: function () { return LB.exitId; }, set: function (v) { LB.exitId = v; } });
    } else {
      inputField(f, { key: "exit-provider", label: T("page-integrations.exitProviderText"), wide: true, max: 60, get: function () { return LB.exitId; }, set: function (v) { LB.exitId = v; } });
    }
    body.appendChild(f);
    body.appendChild(kbtn(T("page-integrations.exitRun"), "exit-run", runExit, false));
    if (LB.err["exit"]) body.appendChild(stateCard("error", T("page-integrations.impactInvalid"), LB.err["exit"], null));
    if (LB.exitKey) resultOf(body, LB.exitKey, "page-integrations.exitErr", runExit, exitResult);
  }

  // ---- İç yetenek aracısı (99) ----
  function runBroker() {
    var cap = LB.cap, role = LB.role;
    if (BROKER_OPS.indexOf(cap) < 0 || (role !== "" && BROKER_ROLES.indexOf(role) < 0)) { LB.err["broker"] = T("page-integrations.brokerBad"); LB.brokerKey = null; renderLabs(); return; }
    delete LB.err["broker"];
    LB.brokerKey = "analysisBroker:" + cap + "|" + role;
    ensure("analysisBroker", cap + "|" + role, true);
    renderLabs();
  }
  function brokerResult(box, v) {
    var b = need(v, "broker");
    if (b.summary) box.appendChild(el("p", "am-more-hit-t", safe(b.summary, 500)));
    var cands = (Array.isArray(b.candidates) ? b.candidates : []).filter(isObj);
    if (!cands.length) box.appendChild(noteLine("alert", T("page-integrations.brokerNoCand")));
    else {
      var ol = el("ol", "am-more-nodes");
      cands.slice(0, 20).forEach(function (c) {
        var li = el("li", "am-more-node");
        li.appendChild(el("strong", "am-more-hit-t", T("page-integrations.brokerRank", { n: cnt(c.rank), ad: safe(c.displayName, 100), id: safe(c.provider, 60) })));
        var ro = isObj(c.roleObservation) ? c.roleObservation : null;
        li.appendChild(el("p", "am-more-evid", T("page-integrations.brokerLine", { rota: safe(c.routeKind, 40), durum: safe(c.capabilityStatus, 30), saglik: safe(c.health, 20), rol: ro ? T("page-integrations.brokerRoleObs", { n: cnt(ro.attempts), p: pct(ro.successRate) }) : T("page-integrations.brokerRoleNone") })));
        lines(li, c.reasons, 6);
        ol.appendChild(li);
      });
      box.appendChild(ol);
    }
    var el2 = (Array.isArray(b.eliminated) ? b.eliminated : []).filter(isObj);
    if (el2.length) { box.appendChild(el("h5", "am-more-h5", T("page-integrations.brokerElim"))); lines(box, el2.map(function (e) { return safe(e.provider, 60) + " — " + strList(e.reasons, 4); }), 30, el2.length); }
    // Kota notu (yalnız öneri: sağlayıcının bildirdiği kalan kota az ise aday alta düşer; bilinmiyorsa sıralama değişmez).
    if (b.quotaNote) box.appendChild(el("p", "am-more-hint", safe(b.quotaNote, 600)));
    if (b.ordering) box.appendChild(el("p", "am-more-hint", T("page-integrations.brokerOrdering", { o: safe(b.ordering, 600) })));
    if (b.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(b.note, 500) })));
  }
  function brokerSection(body) {
    var f = el("div", "am-more-controls");
    inputField(f, { key: "broker-cap", label: T("page-integrations.brokerCap"), wide: true, options: BROKER_OPS.map(function (o) { return [o, o]; }), get: function () { return LB.cap; }, set: function (v) { LB.cap = v; } });
    inputField(f, { key: "broker-role", label: T("page-integrations.brokerRole"), options: [["", T("page-integrations.brokerRoleAny")]].concat(BROKER_ROLES.map(function (r) { return [r, T("page-integrations.role." + r)]; })), get: function () { return LB.role; }, set: function (v) { LB.role = v; } });
    body.appendChild(f);
    body.appendChild(kbtn(T("page-integrations.brokerRun"), "broker-run", runBroker, false));
    if (LB.err["broker"]) body.appendChild(stateCard("error", T("page-integrations.impactInvalid"), LB.err["broker"], null));
    if (LB.brokerKey) resultOf(body, LB.brokerKey, "page-integrations.brokerErr", runBroker, brokerResult);
  }

  // ---- Çevrimdışı kip (74) ----
  var OFFLINE_MODE = { "çevrimdışı": ["bad", "alert", "page-integrations.modeOffline"], "kısıtlı": ["warn", "alert", "page-integrations.modeLimited"], "çevrimiçi": ["ok", "check", "page-integrations.modeOnline"] };
  function featureLines(box, titleKey, list) {
    var items = (Array.isArray(list) ? list : []).filter(isObj);
    box.appendChild(el("h5", "am-more-h5", T(titleKey)));
    if (!items.length) { box.appendChild(el("p", "am-more-hint", T("page-integrations.offNone"))); return; }
    lines(box, items.map(function (f) { return safe(f.name, 120) + (f.why ? " — " + safe(f.why, 240) : ""); }), 40, items.length);
  }
  function offlineResult(box, v) {
    var o = need(v, "offline");
    var m = Object.prototype.hasOwnProperty.call(OFFLINE_MODE, o.mode) ? OFFLINE_MODE[o.mode] : ["muted", "info", "page-integrations.modeUnknown"];
    var head = el("div", "am-more-hit-h");
    head.appendChild(chip(T(m[2]), m[0], m[1]));
    box.appendChild(head);
    if (o.summary) box.appendChild(el("p", "am-more-hit-t", safe(o.summary, 500)));
    box.appendChild(kvBox([[T("page-integrations.offUsable"), cnt(o.usableProviders)], [T("page-integrations.offVerified"), cnt(o.verifiedProviders)]]));
    featureLines(box, "page-integrations.offWorks", o.works);
    featureLines(box, "page-integrations.offBlocked", o.blockedNow);
    featureLines(box, "page-integrations.offNeeds", o.needsProvider);
    var provs = (Array.isArray(o.providers) ? o.providers : []).filter(isObj);
    if (provs.length) {
      box.appendChild(el("h5", "am-more-h5", T("page-integrations.offProviders")));
      box.appendChild(labTable(T("page-integrations.offProviders"), [T("page-integrations.exitColProv"), T("page-integrations.offColUsable"), T("page-integrations.offColExec"), T("page-integrations.exitColWhy")],
        provs.slice(0, 30).map(function (p) { return [safe(p.id, 60), p.usable === true ? chip(T("page-integrations.offUsableYes"), "ok", "check") : chip(T("page-integrations.offUsableNo"), "muted", "info"), p.executeStatus == null ? "—" : safe(p.executeStatus, 40), strList(p.reasons, 3)]; })));
    }
    if (o.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(o.note, 500) })));
  }

  // ---- Uzmanlık haritası (86) ----
  var ROLE_ORDER = ["plan", "implement", "review", "verify", "tekil"];
  function expertiseResult(box, v) {
    var e = need(v, "expertise");
    box.appendChild(noteLine("info", T("page-integrations.expHonest", { n: cnt(e.minSample) })));
    var rows = (Array.isArray(e.rows) ? e.rows : []).filter(isObj);
    var provs = [];
    rows.forEach(function (r) { var p = safe(r.provider, 60); if (p && provs.indexOf(p) < 0 && provs.length < 30) provs.push(p); });
    if (!provs.length) box.appendChild(stateCard("empty", T("page-integrations.expEmpty"), T("page-integrations.expEmptyDetail"), null));
    else {
      var cols = [T("page-integrations.exitColProv")].concat(ROLE_ORDER.map(function (r) { return T("page-integrations.role." + r); }));
      box.appendChild(labTable(T("page-integrations.expCaption"), cols, provs.map(function (p) {
        return [p].concat(ROLE_ORDER.map(function (role) {
          var r = rows.filter(function (x) { return safe(x.provider, 60) === p && x.role === role; })[0];
          if (!r) return T("page-integrations.expNoObs");
          var n = T("page-integrations.expN", { n: cnt(r.attempts) });
          if (r.status !== "yeterli" || num(r.successRate) === null) return T("page-integrations.expInsufficient") + " (" + n + ")";
          return pct(r.successRate) + " (" + n + ")" + (num(r.avgDurationMs) !== null ? " · " + T("page-integrations.expAvg", { s: fmtNum(r.avgDurationMs / 1000, 1) }) : "");
        }));
      })));
    }
    var ref = (Array.isArray(e.refusals) ? e.refusals : []).filter(isObj);
    if (ref.length) { box.appendChild(el("h5", "am-more-h5", T("page-integrations.expRefusals"))); lines(box, ref.map(function (r) { return (r.provider == null ? T("page-integrations.expUnknownProv") : safe(r.provider, 60)) + " — " + safe(r.kind, 60) + " × " + cnt(r.count); }), 20, ref.length); }
    var sc = isObj(e.scan) ? e.scan : {};
    if (sc.truncated === true) box.appendChild(noteLine("alert", T("page-integrations.expCut", { n: cnt(sc.limit) })));
    if (num(e.unattributedSteps) > 0) box.appendChild(el("p", "am-more-hint", T("page-integrations.expUnattr", { n: cnt(e.unattributedSteps) })));
    if (e.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(e.note, 500) })));
  }

  // ---- Kaynak gölge fiyatı (72) ----
  var LEVEL_TONE = { "rahat": "ok", "orta": "info", "kıt": "warn", "çok kıt": "bad" };
  function shadowResult(box, v) {
    var s = need(v, "shadowPrice");
    box.appendChild(noteLine("info", T("page-integrations.shadowNoCurrency")));
    var rows = (Array.isArray(s.providers) ? s.providers : []).filter(isObj);
    if (!rows.length) box.appendChild(stateCard("empty", T("page-integrations.shadowEmpty"), T("page-integrations.shadowEmptyDetail"), null));
    else box.appendChild(labTable(T("page-integrations.shadowCaption"), [T("page-integrations.exitColProv"), T("page-integrations.shadowColCalls"), T("page-integrations.shadowColTokens"), T("page-integrations.shadowColAccel"), T("page-integrations.shadowColLimit"), T("page-integrations.shadowColScarcity"), T("page-integrations.shadowColStatus")],
      rows.slice(0, 30).map(function (r) {
        var l7 = isObj(r.last7d) ? r.last7d : {};
        var ac = isObj(r.acceleration) ? r.acceleration : {};
        var lim = isObj(r.limit) ? r.limit : null;
        var idx = num(r.shadowPriceIndex);
        var scar;
        if (idx === null) scar = T("page-integrations.shadowUnknownLimit");
        else {
          scar = el("div", "am-more-bar-box");
          scar.appendChild(bar(idx, T("page-integrations.shadowBarLabel", { ad: safe(r.provider, 60) })));
          if (typeof r.level === "string" && Object.prototype.hasOwnProperty.call(LEVEL_TONE, r.level)) scar.appendChild(chip(safe(r.level, 20), LEVEL_TONE[r.level], r.level === "rahat" ? "check" : "alert"));
        }
        return [safe(r.provider, 60), cnt(l7.calls), l7.tokens == null ? T("page-integrations.shadowTokensUnknown") : cnt(l7.tokens), num(ac.value) === null ? "—" : fmtNum(ac.value, 2) + " ×" + (ac.basis ? " (" + safe(ac.basis, 10) + ")" : ""),
          lim ? cnt(lim.tokens7d) + " (" + safe(lim.source, 80) + ")" : T("page-integrations.shadowLimitUnknown"), scar, safe(r.status, 200)];
      })));
    if (s.formula) box.appendChild(el("p", "am-more-hint", T("page-integrations.shadowFormula", { f: safe(s.formula, 600) })));
    if (s.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(s.note, 500) })));
  }

  // ---- Eksiklik / fazlalık (83) ----
  function groupBlock(box, titleKey, g, lineFn) {
    var grp = isObj(g) ? g : {};
    var items = Array.isArray(grp.items) ? grp.items : [];
    var total = num(grp.total) === null ? items.length : num(grp.total);
    box.appendChild(el("h5", "am-more-h5", T(titleKey) + " (" + fmtNum(total, 0) + ")"));
    if (!items.length) { box.appendChild(el("p", "am-more-hint", T("page-integrations.absNone"))); return; }
    lines(box, items.map(function (x) { return lineFn(x === null || x === undefined ? {} : x); }), 30, total);
    if (grp.truncated === true) box.appendChild(el("p", "am-more-hint", T("page-integrations.absCut")));
  }
  function absenceResult(box, v) {
    var a = need(v, "absence");
    box.appendChild(noteLine("shield", T("page-integrations.absNotDelete")));
    var u = isObj(a.unused) ? a.unused : {};
    var m = isObj(a.missing) ? a.missing : {};
    box.appendChild(el("h5", "am-more-h5", T("page-integrations.absUnused")));
    groupBlock(box, "page-integrations.absTables", u.tables, function (x) { return safe(x.table, 80) + " (" + safe(x.migration, 80) + ")" + (x.deliberate === true ? " — " + T("page-integrations.absDeliberate") : "") + (x.referencedByTests === true ? " — " + T("page-integrations.absTestRef") : ""); });
    groupBlock(box, "page-integrations.absEndpoints", u.endpoints, function (x) { return safe(x.method, 10) + " " + safe(x.path, 200); });
    groupBlock(box, "page-integrations.absEndpointsTests", u.endpointsOnlyTests, function (x) { return safe(x.method, 10) + " " + safe(x.path, 200); });
    groupBlock(box, "page-integrations.absCaps", u.capabilities, function (x) { return safe(x.operation, 80) + " — " + strList(x.declaredBy, 6); });
    box.appendChild(el("h5", "am-more-h5", T("page-integrations.absMissing")));
    var planned = (Array.isArray(m.plannedBySlice) ? m.plannedBySlice : []).filter(isObj);
    box.appendChild(el("h5", "am-more-h5", T("page-integrations.absPlanned") + (num(m.plannedTotal) === null ? "" : " (" + fmtNum(m.plannedTotal, 0) + ")")));
    if (!planned.length) box.appendChild(el("p", "am-more-hint", T("page-integrations.absNone")));
    else lines(box, planned.map(function (p) { return T("page-integrations.absSlice", { s: safe(p.slice, 20), n: cnt(p.count) }) + (Array.isArray(p.items) ? ": " + p.items.slice(0, 5).map(function (i) { return isObj(i) ? "#" + cnt(i.n) + " " + safe(i.title, 80) : ""; }).join("; ") : ""); }), 30, planned.length);
    groupBlock(box, "page-integrations.absNoUi", m.endpointsWithoutUi, function (x) { return safe(x.method, 10) + " " + safe(x.path, 200); });
    groupBlock(box, "page-integrations.absNoTest", m.modulesWithoutDirectTest, function (x) { return safe(x, 200); });
    var sc = isObj(a.scan) ? a.scan : {};
    if (sc.truncated === true) box.appendChild(noteLine("alert", T("page-integrations.absScanCut")));
    if (a.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(a.note, 500) })));
  }

  // ---- Bağlam değiştirme maliyeti (71): yalnız ölçüm, KISMİ gösterge (sohbet/pencere geçişleri kaydedilmez) ----
  window.AM_REGISTER_TR("page-integrations", {
    "page-integrations.swTitle": "Bağlam değiştirme",
    "page-integrations.swLead": "Görevler arası geçişlerin sıklığını ve tahmini yeniden yükleme maliyetini ölçer. Yalnız ölçümdür; öneri vermez, hiçbir şey kaydetmez.",
    "page-integrations.swDays": "Gün sayısı",
    "page-integrations.swRun": "Ölç",
    "page-integrations.swErr": "Bağlam değiştirme ölçümü alınamadı",
    "page-integrations.swBad": "Gün sayısı 1 ile 30 arasında olmalı.",
    "page-integrations.swStatus": "Durum",
    "page-integrations.swEnough": "Yeterli veri",
    "page-integrations.swInsufficient": "Yetersiz veri",
    "page-integrations.swInsufficientNote": "Olay sayısı {n}, en az {min} gerekir: ortalama ve tahmin verilmez.",
    "page-integrations.swSample": "Örnek boyutu (olay)",
    "page-integrations.swContexts": "Bağlam sayısı",
    "page-integrations.swNoCtx": "Bağlamsız (sayılmayan) olay",
    "page-integrations.swTotal": "Toplam geçiş",
    "page-integrations.swCut": "Denetim satırı sınırı ({n}) aşıldı: en eski olaylar sayılmadı.",
    "page-integrations.swPerDay": "Gün başına geçiş",
    "page-integrations.swColDate": "Gün (UTC)",
    "page-integrations.swColEvents": "Olay",
    "page-integrations.swColSwitches": "Geçiş",
    "page-integrations.swColBar": "Dağılım",
    "page-integrations.swTopHours": "En yoğun saatler (UTC)",
    "page-integrations.swColHour": "Saat",
    "page-integrations.swNoHours": "Geçiş kaydı yok.",
    "page-integrations.swSessions": "Bağlam oturumları",
    "page-integrations.swSessionCount": "Oturum sayısı",
    "page-integrations.swSessionAvg": "Ortalama bağlam oturumu",
    "page-integrations.swMin": "{n} dk",
    "page-integrations.swReload": "Tahmini yeniden yükleme token'ı",
    "page-integrations.swUnknown": "bilinmiyor",
    "page-integrations.swAtLeast": "en az {n}",
    "page-integrations.swCovered": "Kapsanan / kapsanmayan geçiş",
    "page-integrations.swLimits": "Sınırlar: {t}"
  });
  var SW_DAYS = ["1", "2", "3", "5", "7", "14", "21", "30"];
  function runSwitching() {
    if (SW_DAYS.indexOf(LB.swDays) < 0) { LB.err["sw"] = T("page-integrations.swBad"); LB.swKey = null; renderLabs(); return; }
    delete LB.err["sw"];
    LB.swKey = "analysisSwitching:" + LB.swDays;
    ensure("analysisSwitching", LB.swDays, true);
    renderLabs();
  }
  function minutesText(ms) { var n = num(ms); return n === null ? "—" : T("page-integrations.swMin", { n: fmtNum(n / 60000, 1) }); }
  function switchingResult(box, v) {
    var s = need(v, "switching");
    var sm = isObj(s.sample) ? s.sample : {};
    var sw = isObj(s.switches) ? s.switches : {};
    var ss = isObj(s.sessions) ? s.sessions : {};
    var rl = isObj(s.reload) ? s.reload : {};
    var enough = s.status === "yeterli";
    var head = el("div", "am-more-hit-h");
    head.appendChild(chip(T(enough ? "page-integrations.swEnough" : "page-integrations.swInsufficient"), enough ? "ok" : "warn", enough ? "check" : "alert"));
    box.appendChild(head);
    if (!enough) box.appendChild(noteLine("alert", T("page-integrations.swInsufficientNote", { n: cnt(sm.events), min: cnt(sm.minEvents) })));
    // Sınırlar notu HER ZAMAN görünür: bu yalnız KISMİ bir göstergedir.
    box.appendChild(noteLine("alert", T("page-integrations.swLimits", { t: safe(s.limits, 600) })));
    box.appendChild(kvBox([[T("page-integrations.swSample"), cnt(sm.events)], [T("page-integrations.swContexts"), cnt(sm.contexts)], [T("page-integrations.swNoCtx"), cnt(sm.withoutContext)], [T("page-integrations.swTotal"), cnt(sw.total)]]));
    if (sm.truncated === true) box.appendChild(noteLine("alert", T("page-integrations.swCut", { n: cnt(sm.rowLimit) })));
    var perDay = (Array.isArray(sw.perDay) ? sw.perDay : []).filter(isObj).slice(0, 31);
    box.appendChild(el("h5", "am-more-h5", T("page-integrations.swPerDay")));
    var mx = 0;
    perDay.forEach(function (d) { var n = num(d.switches); if (n !== null && n > mx) mx = n; });
    box.appendChild(labTable(T("page-integrations.swPerDay"), [T("page-integrations.swColDate"), T("page-integrations.swColEvents"), T("page-integrations.swColSwitches"), T("page-integrations.swColBar")],
      perDay.map(function (d) { var n = num(d.switches); return [safe(d.date, 12), cnt(d.events), cnt(d.switches), bar(n !== null && mx > 0 ? (n / mx) * 100 : 0, safe(d.date, 12) + ": " + T("page-integrations.swColSwitches"))]; })));
    box.appendChild(el("h5", "am-more-h5", T("page-integrations.swTopHours")));
    var hours = (Array.isArray(sw.topHours) ? sw.topHours : []).filter(isObj).slice(0, 5);
    if (!hours.length) box.appendChild(el("p", "am-more-hint", T("page-integrations.swNoHours")));
    else box.appendChild(labTable(T("page-integrations.swTopHours"), [T("page-integrations.swColHour"), T("page-integrations.swColSwitches")], hours.map(function (h) { var hh = num(h.hourUtc); return [hh === null ? "—" : (hh < 10 ? "0" : "") + Math.floor(hh) + ":00", cnt(h.switches)]; })));
    box.appendChild(el("h5", "am-more-h5", T("page-integrations.swSessions")));
    box.appendChild(kvBox([[T("page-integrations.swSessionCount"), cnt(ss.count)], [T("page-integrations.swSessionAvg"), num(ss.avgDurationMs) === null ? (enough ? T("page-integrations.swUnknown") : T("page-integrations.swInsufficient").toLowerCase()) : minutesText(ss.avgDurationMs)]]));
    var tokens = num(rl.estimatedTokens);
    var tokenText = tokens === null ? (enough ? T("page-integrations.swUnknown") : T("page-integrations.swInsufficient").toLowerCase()) : (num(rl.uncoveredSwitches) > 0 ? T("page-integrations.swAtLeast", { n: fmtNum(tokens, 0) }) : fmtNum(tokens, 0));
    box.appendChild(kvBox([[T("page-integrations.swReload"), tokenText], [T("page-integrations.swCovered"), cnt(rl.coveredSwitches) + " / " + cnt(rl.uncoveredSwitches)]]));
    if (rl.basis) box.appendChild(el("p", "am-more-hint", safe(rl.basis, 500)));
    if (s.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(s.note, 500) })));
  }
  function switchingSection(body) {
    var f = el("div", "am-more-controls");
    inputField(f, { key: "sw-days", label: T("page-integrations.swDays"), options: SW_DAYS.map(function (n) { return [n, n]; }), get: function () { return LB.swDays; }, set: function (v) { LB.swDays = v; } });
    body.appendChild(f);
    body.appendChild(kbtn(T("page-integrations.swRun"), "sw-run", runSwitching, false));
    if (LB.err["sw"]) body.appendChild(stateCard("error", T("page-integrations.impactInvalid"), LB.err["sw"], null));
    if (!LB.swKey && !LB.err["sw"]) { LB.swKey = "analysisSwitching:" + LB.swDays; ensure("analysisSwitching", LB.swDays); }
    if (LB.swKey) resultOf(body, LB.swKey, "page-integrations.swErr", runSwitching, switchingResult);
  }

  // ---- Teknik borç merkezi (33), sürüm etki analizi (29), veri analizi laboratuvarı (25) ----
  // Üçü de kullanıcı isteğiyle çalışan, SALT OKUNUR hesaplardır (ADR-016). Teknik borç yalnız SAYI ve örnek verir (puan/öncelik yok); sürüm etkisi iki git başvurusu ister (tahmin yok);
  // veri profili ham hücre değeri göstermez (yalnız toplulaştırılmış sayılar). Sunucu metni yalnız textContent.
  window.AM_REGISTER_TR("page-integrations", {
    "page-integrations.tdTitle": "Teknik borç merkezi",
    "page-integrations.tdLead": "Koddaki açık işaretçileri, testi olmayan dosyaları, en büyük dosyaları, içe aktarma döngülerini ve bildirilen paket sürümlerini SAYAR. Puan ya da öncelik vermez; yalnız okur.",
    "page-integrations.tdErr": "Teknik borç sayımı alınamadı",
    "page-integrations.tdNoScore": "Yalnız sayımlar ve örnekler (dosya:satır). Toplam puan, öncelik ya da yorum yoktur; hiçbir sayı tek başına 'borç' anlamına gelmez.",
    "page-integrations.tdFiles": "Taranan dosya",
    "page-integrations.tdBudget": "Tarama bütçesi",
    "page-integrations.tdBudgetText": "en çok {files} dosya, {ms} ms",
    "page-integrations.tdElapsed": "Geçen süre",
    "page-integrations.tdSkippedLarge": "Çok büyük (okunmayan) dosya",
    "page-integrations.tdLongLines": "Atlanan uzun satır (4 KB üstü)",
    "page-integrations.tdCut": "Tarama bütçesi aşıldı: kalan dosyalar sayılmadı, sayılar eksik olabilir.",
    "page-integrations.tdGraphIncomplete": "İçe aktarma grafiği eksik olabilir (bütçe aşıldı ya da çözümlenemeyen dosya var): döngü ve test eşleşmesi sayıları kesin değildir.",
    "page-integrations.tdSignals": "Sinyal sayıları",
    "page-integrations.tdColSignal": "Sinyal",
    "page-integrations.tdColCount": "Sayı",
    "page-integrations.tdMarkers": "Açık işaretçiler (iş/düzeltme notları)",
    "page-integrations.tdUntested": "Kardeş testi olmayan kaynak",
    "page-integrations.tdBig": "600+ satırlık dosyalar",
    "page-integrations.tdCycles": "İçe aktarma döngüleri",
    "page-integrations.tdDeps": "Bağımlılıklar (package.json)",
    "page-integrations.tdNone": "Bulunmadı.",
    "page-integrations.tdNoSample": "Örnek yok.",
    "page-integrations.tdLargest": "En büyük 10 dosya",
    "page-integrations.tdColFile": "Dosya",
    "page-integrations.tdColLines": "Satır",
    "page-integrations.tdLines": "{n} satır",
    "page-integrations.tdDepsAbsent": "package.json bulunamadı.",
    "page-integrations.tdDepsUnreadable": "package.json okunamadı.",
    "page-integrations.tdNoNetwork": "Ağ kontrolü yapılmadı: güncel sürüm bilinmiyor; yalnız package.json'daki bildirilen sürüm aralıkları gösterilir.",
    "page-integrations.tdColDepName": "Paket",
    "page-integrations.tdColDepSection": "Bölüm",
    "page-integrations.tdColDepDeclared": "Bildirilen",
    "page-integrations.tdColDepLatest": "Güncel sürüm",
    "page-integrations.relTitle": "Sürüm etki analizi",
    "page-integrations.relLead": "İki git başvurusu (branch, etiket ya da sha) arasında değişen dosyaları, etkilenen dosya ve testleri, testsiz değişenleri ve migrasyon değişikliğini gösterir. Yalnız okur; getirme ya da çıkış (checkout) yapmaz.",
    "page-integrations.relFromLabel": "Başlangıç başvurusu (from)",
    "page-integrations.relToLabel": "Bitiş başvurusu (to)",
    "page-integrations.relHelp": "Örnek: v1.0 ve main. İkisi de gerekir (tahmin yapılmaz). Boşluk, '..', '@{', '~', '^', ':' ve baştaki '-' kabul edilmez.",
    "page-integrations.relRun": "Analiz et",
    "page-integrations.relBadRef": "Başvuru geçersiz: harf ya da rakamla başlamalı, en çok 100 karakter; yalnız harf, rakam, nokta, alt çizgi, tire ve eğik çizgi içerebilir; '..' ve '//' olamaz.",
    "page-integrations.relErr": "Sürüm etki analizi yapılamadı",
    "page-integrations.relUnreadable": "git okunamadı",
    "page-integrations.relUnsafeKey": "Tehlikeli yapılandırma anahtarı: {key}",
    "page-integrations.relFrom": "Başlangıç",
    "page-integrations.relTo": "Bitiş",
    "page-integrations.relResolved": "Çözülen sürümler (sha)",
    "page-integrations.relChanged": "Değişen dosya",
    "page-integrations.relByStatus": "Duruma göre",
    "page-integrations.relSrc": "Değişen kaynak dosya",
    "page-integrations.relAnalyzed": "Analiz edilen / edilmeyen",
    "page-integrations.relRadiusFiles": "Etkilenen dosya (birleşim)",
    "page-integrations.relRadiusTests": "Etkilenen test (birleşim)",
    "page-integrations.relMigWarn": "Migrasyon dosyaları değişti",
    "page-integrations.relSurface": "Sunucu uç dosyası (app.ts) değişti: {a}; değişen arayüz dosyası: {n}. Uç düzeyinde değişim çözümlenmedi.",
    "page-integrations.relFiles": "Değişen kaynak dosyaların etkisi",
    "page-integrations.relColFile": "Dosya",
    "page-integrations.relColStatus": "Durum",
    "page-integrations.relColDirect": "Doğrudan bağımlı",
    "page-integrations.relColDeps": "Bağımlı dosya",
    "page-integrations.relColTests": "Bağımlı test",
    "page-integrations.relNotInGraph": "bilinmiyor",
    "page-integrations.relUntested": "Testi olmayan değişen dosyalar",
    "page-integrations.relChanges": "Değişen dosyalar",
    "page-integrations.relCutList": "Liste kısaltıldı: ilk {n} dosya gösteriliyor.",
    "page-integrations.relNoChange": "Değişen dosya yok",
    "page-integrations.relNoChangeDetail": "Bu iki başvuru arasında fark bulunamadı.",
    "page-integrations.relGraphNote": "Etki grafiği eksik olabilir: tarama bütçesi aşıldı ya da çözümlenemeyen dosya var.",
    "page-integrations.relStA": "eklendi",
    "page-integrations.relStM": "değişti",
    "page-integrations.relStD": "silindi",
    "page-integrations.relStT": "tür değişti",
    "page-integrations.relStX": "diğer",
    "page-integrations.dpTitle": "Veri analizi laboratuvarı",
    "page-integrations.dpLead": "İzinli klasördeki bir CSV, TSV, JSON dizi ya da NDJSON dosyasının satır, sütun, tür, boşluk, benzersiz ve anomali SAYILARINI çıkarır. Ham veri (hücre değeri) gösterilmez; yalnız okur.",
    "page-integrations.dpPathLabel": "Dosya yolu (mutlak)",
    "page-integrations.dpHelp": "Örnek: C:/projeler/veri/musteriler.csv. En çok 8 MB; yol izinli klasörlerde olmalı. Gizli/yasak yerler ve sır dosyaları reddedilir.",
    "page-integrations.dpRun": "Profil çıkar",
    "page-integrations.dpBadPath": "Dosya yolu geçersiz: mutlak bir yol (örn. C:/... ya da /...) olmalı, en çok 400 karakter; '..' ve ':' ek akışı olamaz; uzantı .csv, .tsv, .json, .ndjson ya da .jsonl olmalı.",
    "page-integrations.dpErr": "Veri profili çıkarılamadı",
    "page-integrations.dpFormat": "Biçim",
    "page-integrations.dpBytes": "Boyut (bayt)",
    "page-integrations.dpRows": "Satır",
    "page-integrations.dpCols": "Sütun",
    "page-integrations.dpDup": "Yinelenen satır",
    "page-integrations.dpRagged": "Sütun sayısı uyuşmayan satır",
    "page-integrations.dpBad": "Okunamayan satır",
    "page-integrations.dpBlank": "Boş satır",
    "page-integrations.dpIgnoredCols": "Sınır nedeniyle yok sayılan sütun",
    "page-integrations.dpCut": "Dosya kesildi: yalnız ilk {n} satır okundu (sınır ya da süre bütçesi); sayılar yalnız okunan satırlar içindir.",
    "page-integrations.dpSensitive": "Duyarlı veri uyarısı: {c} sütun, {h} hücre sır/duyarlı olarak işaretlendi. Hiçbir sütunda hücre değeri gösterilmez; yalnız sayılar görünür.",
    "page-integrations.dpColSensitive": "duyarlı",
    "page-integrations.dpNoticeHeader": "İlk satır veri gibi göründüğü için (e-posta, telefon, rakam ya da çoğu sayı) sütun adları 'sütun 1..N' olarak değiştirildi ve ilk satır veri sayıldı.",
    "page-integrations.dpNoticeMasked": "Veri ya da sır kalıbı taşıyan sütun adları maskelendi ([gizli ad N]).",
    "page-integrations.dpPathSensitive": "Dosya duyarlı olarak işaretli bir klasörde.",
    "page-integrations.dpAnom": "Anomali işaretleri",
    "page-integrations.dpAnomNone": "İşaret yok.",
    "page-integrations.dpAnomMostlyEmpty": "aşırı boş",
    "page-integrations.dpAnomConstant": "tek değerli",
    "page-integrations.dpAnomMixed": "karışık tür",
    "page-integrations.dpColumns": "Sütunlar",
    "page-integrations.dpColName": "Sütun",
    "page-integrations.dpColType": "Tür",
    "page-integrations.dpColEmpty": "Boş oranı",
    "page-integrations.dpColUnique": "Benzersiz",
    "page-integrations.dpColFlags": "İşaret",
    "page-integrations.dpTypeNumber": "sayı",
    "page-integrations.dpTypeText": "metin",
    "page-integrations.dpTypeEmpty": "boş",
    "page-integrations.dpTypeMixed": "karışık",
    "page-integrations.dpAtLeast": "en az {n}",
    "page-integrations.dpEmpty": "Satır yok",
    "page-integrations.dpEmptyDetail": "Dosyada okunabilir veri satırı bulunamadı.",
    "page-integrations.dpLimits": "Sınırlar: en çok {rows} satır ve {cols} sütun; benzersiz sayacı sütun başına {d} değere kadar."
  });
  var REF_RE = /^[A-Za-z0-9][A-Za-z0-9._\/-]{0,99}$/;
  function refOk(r) { return REF_RE.test(r) && r.indexOf("..") < 0 && r.indexOf("//") < 0 && !/[\/.]$/.test(r) && !/\.lock$/.test(r); }
  var DP_PATH_RE = /^(?![\\\/]{2})(?:[A-Za-z]:[\\\/]|\/)[^\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]{1,398}\.(?:csv|tsv|json|ndjson|jsonl)$/i;
  function dpPathOk(p) { return p.length <= 400 && DP_PATH_RE.test(p) && !/(^|[\\\/])\.\.([\\\/]|$)/.test(p) && p.slice(2).indexOf(":") < 0; }
  function mapSafe(list, max, fn) { return (Array.isArray(list) ? list : []).slice(0, max).map(fn); }
  // Bir sinyal bloğu: başlık + sayı, örnekler (sayı sıfırsa 'bulunmadı').
  function sigBlock(box, titleKey, total, items) {
    var n = num(total);
    box.appendChild(el("h5", "am-more-h5", T(titleKey) + " (" + cnt(total) + ")"));
    if (!items.length) { box.appendChild(el("p", "am-more-hint", T(n === 0 ? "page-integrations.tdNone" : "page-integrations.tdNoSample"))); return; }
    lines(box, items, 20, n === null ? items.length : n);
  }
  function techDebtResult(box, v) {
    var d = need(v, "techDebt");
    var sc = isObj(d.scan) ? d.scan : {}, mk = isObj(d.markers) ? d.markers : {}, un = isObj(d.untested) ? d.untested : {}, sz = isObj(d.size) ? d.size : {}, cy = isObj(d.cycles) ? d.cycles : {}, dp = isObj(d.dependencies) ? d.dependencies : {};
    box.appendChild(noteLine("shield", T("page-integrations.tdNoScore")));
    box.appendChild(kvBox([[T("page-integrations.tdFiles"), cnt(sc.filesScanned)], [T("page-integrations.tdBudget"), T("page-integrations.tdBudgetText", { files: cnt(sc.maxFiles), ms: cnt(sc.budgetMs) })], [T("page-integrations.tdElapsed"), cnt(sc.elapsedMs) + " ms"], [T("page-integrations.tdSkippedLarge"), cnt(sc.skippedLarge)], [T("page-integrations.tdLongLines"), cnt(mk.longLinesSkipped)]]));
    if (sc.truncated === true) box.appendChild(noteLine("alert", T("page-integrations.tdCut")));
    if (sc.graphIncomplete === true) box.appendChild(noteLine("alert", T("page-integrations.tdGraphIncomplete")));
    box.appendChild(labTable(T("page-integrations.tdSignals"), [T("page-integrations.tdColSignal"), T("page-integrations.tdColCount")], [
      [T("page-integrations.tdMarkers"), cnt(mk.count)], [T("page-integrations.tdUntested"), cnt(un.count) + " / " + cnt(un.sourceFiles)], [T("page-integrations.tdBig"), cnt(sz.bigCount)], [T("page-integrations.tdCycles"), cnt(cy.count)], [T("page-integrations.tdDeps"), cnt(dp.count)]]));
    sigBlock(box, "page-integrations.tdMarkers", mk.count, mapSafe(mk.examples, 20, function (x) { return safe(x, 200); }));
    sigBlock(box, "page-integrations.tdUntested", un.count, mapSafe(un.examples, 20, function (x) { return safe(x, 200); }));
    var lg = (Array.isArray(sz.largest) ? sz.largest : []).filter(isObj).slice(0, 10);
    box.appendChild(el("h5", "am-more-h5", T("page-integrations.tdLargest")));
    if (!lg.length) box.appendChild(el("p", "am-more-hint", T("page-integrations.tdNoSample")));
    else box.appendChild(labTable(T("page-integrations.tdLargest"), [T("page-integrations.tdColFile"), T("page-integrations.tdColLines")], lg.map(function (x) { return [safe(x.file, 200), cnt(x.lines)]; })));
    sigBlock(box, "page-integrations.tdBig", sz.bigCount, (Array.isArray(sz.bigExamples) ? sz.bigExamples : []).filter(isObj).slice(0, 20).map(function (x) { return safe(x.file, 200) + " — " + T("page-integrations.tdLines", { n: cnt(x.lines) }); }));
    sigBlock(box, "page-integrations.tdCycles", cy.count, (Array.isArray(cy.examples) ? cy.examples : []).filter(Array.isArray).slice(0, 20).map(function (c) { return c.slice(0, 20).map(function (x) { return safe(x, 120); }).join(" → "); }));
    box.appendChild(el("h5", "am-more-h5", T("page-integrations.tdDeps") + " (" + cnt(dp.count) + ")"));
    if (dp.status === "absent") box.appendChild(el("p", "am-more-hint", T("page-integrations.tdDepsAbsent")));
    else if (dp.status === "unreadable") box.appendChild(noteLine("alert", T("page-integrations.tdDepsUnreadable")));
    else {
      if (dp.networkChecked !== true) box.appendChild(noteLine("alert", T("page-integrations.tdNoNetwork")));
      var ex = (Array.isArray(dp.examples) ? dp.examples : []).filter(isObj).slice(0, 20);
      if (!ex.length) box.appendChild(el("p", "am-more-hint", T("page-integrations.tdNone")));
      else box.appendChild(labTable(T("page-integrations.tdDeps"), [T("page-integrations.tdColDepName"), T("page-integrations.tdColDepSection"), T("page-integrations.tdColDepDeclared"), T("page-integrations.tdColDepLatest")],
        ex.map(function (x) { return [safe(x.name, 80), safe(x.section, 40), safe(x.declared, 80), T("page-integrations.swUnknown")]; })));
      if (num(dp.count) !== null && num(dp.count) > ex.length) box.appendChild(el("p", "am-more-hint", T("page-integrations.labMore", { n: fmtNum(num(dp.count) - ex.length, 0) })));
    }
    if (d.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(d.note, 600) })));
  }

  function runRelease() {
    var from = LB.relFrom.trim(), to = LB.relTo.trim();
    if (!refOk(from) || !refOk(to)) { LB.err["rel"] = T("page-integrations.relBadRef"); LB.relKey = null; renderLabs(); return; }
    delete LB.err["rel"];
    LB.relKey = "analysisRelease:" + from + "|" + to;
    ensure("analysisRelease", from + "|" + to, true);
    renderLabs();
  }
  function relStatus(s) { var k = { A: "relStA", M: "relStM", D: "relStD", T: "relStT" }[String(s)]; return T("page-integrations." + (k || "relStX")); }
  function releaseResult(box, v) {
    var r = need(v, "releaseImpact");
    if (r.status !== "ok") {
      box.appendChild(stateCard("error", T("page-integrations.relUnreadable"), (safe(r.reason, 300) || "?") + (r.key ? " " + T("page-integrations.relUnsafeKey", { key: safe(r.key, 80) }) : ""), null));
      return;
    }
    var rs = isObj(r.resolved) ? r.resolved : {}, ch = isObj(r.changes) ? r.changes : {}, sc = isObj(r.srcChanged) ? r.srcChanged : {}, rad = isObj(r.radius) ? r.radius : {}, mg = isObj(r.migrations) ? r.migrations : {}, sf = isObj(r.surface) ? r.surface : {}, scan = isObj(r.scan) ? r.scan : {}, un = isObj(r.untestedChanged) ? r.untestedChanged : {};
    var byStatus = isObj(ch.byStatus) ? ch.byStatus : {};
    var statusText = Object.keys(byStatus).sort().slice(0, 10).map(function (k) { return relStatus(k) + ": " + cnt(byStatus[k]); }).join(", ");
    box.appendChild(kvBox([[T("page-integrations.relFrom"), safe(r.from, 100)], [T("page-integrations.relTo"), safe(r.to, 100)], [T("page-integrations.relResolved"), safe(rs.from, 20) + " → " + safe(rs.to, 20)],
      [T("page-integrations.relChanged"), cnt(ch.total)], [T("page-integrations.relByStatus"), statusText || "—"], [T("page-integrations.relSrc"), cnt(sc.count)], [T("page-integrations.relAnalyzed"), cnt(sc.analyzed) + " / " + cnt(sc.notAnalyzed)],
      [T("page-integrations.relRadiusFiles"), cnt(rad.files)], [T("page-integrations.relRadiusTests"), cnt(rad.tests)]]));
    if (num(mg.count) > 0) {
      box.appendChild(noteLine("alert", safe(mg.warning, 400) || T("page-integrations.relMigWarn")));
      box.appendChild(el("h5", "am-more-h5", T("page-integrations.relMigWarn") + " (" + cnt(mg.count) + ")"));
      lines(box, mapSafe(mg.changed, 20, function (x) { return safe(x, 200); }), 20, num(mg.count));
    }
    if (scan.graphIncomplete === true || scan.truncated === true) box.appendChild(noteLine("alert", T("page-integrations.relGraphNote")));
    box.appendChild(el("p", "am-more-hint", T("page-integrations.relSurface", { a: sf.serverRouteFileChanged === true ? T("page-integrations.yes") : T("page-integrations.no"), n: cnt(sf.uiFilesChanged) })));
    if (num(ch.total) === 0) box.appendChild(stateCard("empty", T("page-integrations.relNoChange"), T("page-integrations.relNoChangeDetail"), null));
    var files = (Array.isArray(r.files) ? r.files : []).filter(isObj).slice(0, 50);
    if (files.length) {
      box.appendChild(el("h5", "am-more-h5", T("page-integrations.relFiles")));
      var unk = T("page-integrations.relNotInGraph");
      box.appendChild(labTable(T("page-integrations.relFiles"), [T("page-integrations.relColFile"), T("page-integrations.relColStatus"), T("page-integrations.relColDirect"), T("page-integrations.relColDeps"), T("page-integrations.relColTests")],
        files.map(function (f) { return [safe(f.file, 200), relStatus(f.status), num(f.directDependents) === null ? unk : cnt(f.directDependents), num(f.dependentFiles) === null ? unk : cnt(f.dependentFiles), num(f.dependentTests) === null ? unk : cnt(f.dependentTests)]; })));
    }
    sigBlock(box, "page-integrations.relUntested", un.count, mapSafe(un.examples, 50, function (x) { return safe(x, 200); }));
    var listed = (Array.isArray(ch.listed) ? ch.listed : []).filter(isObj);
    if (listed.length) {
      box.appendChild(el("h5", "am-more-h5", T("page-integrations.relChanges") + " (" + cnt(ch.total) + ")"));
      lines(box, listed.map(function (x) { return relStatus(x.status) + " — " + safe(x.file, 200); }), 30, listed.length);
      if (ch.listTruncated === true) box.appendChild(el("p", "am-more-hint", T("page-integrations.relCutList", { n: cnt(listed.length) })));
    }
    if (r.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(r.note, 600) })));
  }
  function releaseSection(body) {
    var f = el("div", "am-more-controls");
    inputField(f, { key: "rel-from", label: T("page-integrations.relFromLabel"), wide: true, max: 100, get: function () { return LB.relFrom; }, set: function (v) { LB.relFrom = v; } });
    inputField(f, { key: "rel-to", label: T("page-integrations.relToLabel"), wide: true, max: 100, get: function () { return LB.relTo; }, set: function (v) { LB.relTo = v; } });
    body.appendChild(f);
    body.appendChild(el("p", "am-more-hint", T("page-integrations.relHelp")));
    var row = el("div", "am-more-actions");
    row.appendChild(kbtn(T("page-integrations.relRun"), "rel-run", runRelease, false));
    body.appendChild(row);
    if (LB.err["rel"]) body.appendChild(stateCard("error", T("page-integrations.impactInvalid"), LB.err["rel"], null));
    if (LB.relKey) resultOf(body, LB.relKey, "page-integrations.relErr", runRelease, releaseResult);
  }

  function runDataProfile() {
    var p = LB.dpPath.trim();
    if (!dpPathOk(p)) { LB.err["dp"] = T("page-integrations.dpBadPath"); LB.dpKey = null; renderLabs(); return; }
    delete LB.err["dp"];
    LB.dpKey = "analysisDataProfile:" + p;
    ensure("analysisDataProfile", p, true);
    renderLabs();
  }
  function dpType(t) { var k = { number: "dpTypeNumber", text: "dpTypeText", empty: "dpTypeEmpty", mixed: "dpTypeMixed" }[String(t)]; return k ? T("page-integrations." + k) : "—"; }
  function dpFlag(f) { var k = { mostly_empty: "dpAnomMostlyEmpty", constant: "dpAnomConstant", mixed_type: "dpAnomMixed" }[String(f)]; return k ? T("page-integrations." + k) : safe(f, 40); }
  function dataProfileResult(box, v) {
    var p = need(v, "dataProfile");
    var sn = isObj(p.sensitive) ? p.sensitive : {}, lim = isObj(p.limits) ? p.limits : {};
    if (num(p.rows) === 0) box.appendChild(stateCard("empty", T("page-integrations.dpEmpty"), T("page-integrations.dpEmptyDetail"), null));
    box.appendChild(kvBox([[T("page-integrations.dpFormat"), safe(p.format, 20)], [T("page-integrations.dpBytes"), cnt(p.bytes)], [T("page-integrations.dpRows"), cnt(p.rows)], [T("page-integrations.dpCols"), cnt(p.columnCount)],
      [T("page-integrations.dpDup"), cnt(p.duplicateRows)], [T("page-integrations.dpRagged"), cnt(p.raggedRows)], [T("page-integrations.dpBad"), cnt(p.badRows)], [T("page-integrations.dpBlank"), cnt(p.blankLines)], [T("page-integrations.dpIgnoredCols"), cnt(p.ignoredColumns)]]));
    (Array.isArray(p.notices) ? p.notices : []).slice(0, 5).forEach(function (code) {
      if (code === "header_as_data") box.appendChild(noteLine("alert", T("page-integrations.dpNoticeHeader")));
      else if (code === "names_masked") box.appendChild(noteLine("alert", T("page-integrations.dpNoticeMasked")));
    });
    if (p.truncated === true) box.appendChild(noteLine("alert", T("page-integrations.dpCut", { n: cnt(p.rows) })));
    if (sn.warning === true) box.appendChild(noteLine("alert", T("page-integrations.dpSensitive", { c: cnt(sn.columns), h: cnt(sn.cells) })));
    if (p.pathClass === "sensitive") box.appendChild(noteLine("alert", T("page-integrations.dpPathSensitive")));
    var an = (Array.isArray(p.anomalies) ? p.anomalies : []).filter(isObj);
    box.appendChild(el("h5", "am-more-h5", T("page-integrations.dpAnom") + " (" + cnt(an.length) + ")"));
    if (!an.length) box.appendChild(el("p", "am-more-hint", T("page-integrations.dpAnomNone")));
    else lines(box, an.map(function (a) { return safe(a.column, 100) + " — " + dpFlag(a.kind); }), 30, an.length);
    var cols = (Array.isArray(p.columns) ? p.columns : []).filter(isObj);
    if (cols.length) {
      box.appendChild(el("h5", "am-more-h5", T("page-integrations.dpColumns") + " (" + cnt(cols.length) + ")"));
      box.appendChild(labTable(T("page-integrations.dpColumns"), [T("page-integrations.dpColName"), T("page-integrations.dpColType"), T("page-integrations.dpColEmpty"), T("page-integrations.dpColUnique"), T("page-integrations.dpColFlags")],
        cols.slice(0, 200).map(function (c) {
          var uniq = c.uniqueCapped === true ? T("page-integrations.dpAtLeast", { n: cnt(c.unique) }) : cnt(c.unique);
          var fl = (Array.isArray(c.flags) ? c.flags : []).slice(0, 5).map(dpFlag);
          if (c.sensitive === true) fl.push(T("page-integrations.dpColSensitive"));
          return [safe(c.name, 100), dpType(c.type), pct(c.emptyRatio), uniq, fl.join(", ") || "—"];
        })));
    }
    box.appendChild(el("p", "am-more-hint", T("page-integrations.dpLimits", { rows: cnt(lim.maxRows), cols: cnt(lim.maxColumns), d: cnt(lim.maxDistinct) })));
    if (p.note) box.appendChild(el("p", "am-more-hint", T("page-integrations.srvNote", { note: safe(p.note, 700) })));
  }
  function dataProfileSection(body) {
    var f = el("div", "am-more-controls");
    inputField(f, { key: "dp-path", label: T("page-integrations.dpPathLabel"), wide: true, max: 400, get: function () { return LB.dpPath; }, set: function (v) { LB.dpPath = v; } });
    body.appendChild(f);
    body.appendChild(el("p", "am-more-hint", T("page-integrations.dpHelp")));
    var row = el("div", "am-more-actions");
    row.appendChild(kbtn(T("page-integrations.dpRun"), "dp-run", runDataProfile, false));
    body.appendChild(row);
    if (LB.err["dp"]) body.appendChild(stateCard("error", T("page-integrations.impactInvalid"), LB.err["dp"], null));
    if (LB.dpKey) resultOf(body, LB.dpKey, "page-integrations.dpErr", runDataProfile, dataProfileResult);
  }

  function advGate(key) { var A = window.AM_PAGES && window.AM_PAGES.advanced; return !!A && A.hidden(S.AM, key); }
  function advStub(key) { return window.AM_PAGES.advanced.stub(S.AM, key); }
  function labsHost() {
    if (advGate("analytics")) { var stubHost = el("section", "am-more-sec am-more-labs"); stubHost.setAttribute("data-advanced", "analytics"); stubHost.appendChild(advStub("analytics")); return stubHost; }
    var host = el("section", "am-more-sec am-more-labs");
    host.setAttribute("aria-labelledby", "am-lab-group");
    var h = el("h3", "am-more-h3", T("page-integrations.labTitle"));
    h.setAttribute("id", "am-lab-group");
    host.appendChild(h);
    host.appendChild(el("p", "am-more-hint", T("page-integrations.labLead")));
    host.appendChild(labSection("am-lab-switching", "page-integrations.swTitle", "page-integrations.swLead", switchingSection));
    host.appendChild(labSection("am-lab-impact", "page-integrations.impactTitle", "page-integrations.impactLead", impactSection));
    host.appendChild(labSection("am-lab-cont", "page-integrations.contTitle", "page-integrations.contLead", function (b) { plainBody(b, "analysisContinuity", "page-integrations.contErr", contResult); }));
    host.appendChild(labSection("am-lab-exit", "page-integrations.exitTitle", "page-integrations.exitLead", exitSection));
    host.appendChild(labSection("am-lab-broker", "page-integrations.brokerTitle", "page-integrations.brokerLead", brokerSection));
    host.appendChild(labSection("am-lab-offline", "page-integrations.offTitle", "page-integrations.offLead", function (b) { plainBody(b, "analysisOffline", "page-integrations.offErr", offlineResult); }));
    host.appendChild(labSection("am-lab-expertise", "page-integrations.expTitle", "page-integrations.expLead", function (b) { plainBody(b, "analysisExpertise", "page-integrations.expErr", expertiseResult); }));
    host.appendChild(labSection("am-lab-shadow", "page-integrations.shadowTitle", "page-integrations.shadowLead", function (b) { plainBody(b, "analysisShadow", "page-integrations.shadowErr", shadowResult); }));
    host.appendChild(labSection("am-lab-absence", "page-integrations.absTitle", "page-integrations.absLead", function (b) { plainBody(b, "analysisAbsence", "page-integrations.absErr", absenceResult); }));
    host.appendChild(labSection("am-lab-techdebt", "page-integrations.tdTitle", "page-integrations.tdLead", function (b) { plainBody(b, "analysisTechDebt", "page-integrations.tdErr", techDebtResult); }));
    host.appendChild(labSection("am-lab-release", "page-integrations.relTitle", "page-integrations.relLead", releaseSection));
    host.appendChild(labSection("am-lab-dataprofile", "page-integrations.dpTitle", "page-integrations.dpLead", dataProfileSection));
    return host;
  }
  function findKeyNode(node, key) {
    var kids = node && node.children ? node.children : [];
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.getAttribute && k.getAttribute("data-am-key") === key) return k;
      var r = findKeyNode(k, key);
      if (r) return r;
    }
    return null;
  }
  // Bölüm aç/kapat ve düğmeler yalnız bu bölümü yeniden çizer; odak aynı data-am-key'li öğeye geri verilir.
  function renderLabs() {
    if (!S.labHost) return;
    LB.uid = 0;
    var a = document.activeElement;
    var key = a && a.getAttribute ? a.getAttribute("data-am-key") : null;
    S.labHost.textContent = "";
    try { S.labHost.appendChild(labsHost()); } catch (e) { S.labHost.appendChild(stateCard("error", T("page-integrations.errTitle"), T("page-integrations.renderErr", { reason: str(e && e.message, 200) }), null)); }
    var n = key ? findKeyNode(S.labHost, key) : null;
    if (n && typeof n.focus === "function") { try { n.focus(); } catch (e2) { /* odak verilemezse kullanıcı yeniden odaklar */ } }
  }

  function fillSafe() {
    try { fill(); } catch (e) {
      clear(S.ui.body);
      S.ui.built = false;
      S.ui.body.appendChild(stateCard("error", T("page-integrations.errTitle"), T("page-integrations.renderErr", { reason: str(e && e.message, 200) }), function () { fillSafe(); }));
    }
  }

  function render(AM, root, param) {
    S.AM = AM;
    applyParam(param);
    if (S.root !== root || !S.ui || !S.page || S.page.parentNode !== root) {
      S.root = root; S.ui = buildShell(root); S.lastData = null; S.sliceKey = "";
    }
    var d = AM && AM.state && AM.state.data ? AM.state.data.capabilities : null;
    if (d && d === S.lastData && S.ui.built) { renderLabs(); return; }
    S.lastData = d || null;
    fillSafe();
    renderLabs();
  }

  window.AM_PAGE_INTEGRATIONS = {
    render: render,
    pure: {
      fold: fold, statusKey: statusKey, statusInfo: statusInfo, opInfo: opInfo, normItems: normItems, countByStatus: countByStatus,
      summaryMismatch: summaryMismatch, needsDecision: needsDecision, filterItems: filterItems, sortItems: sortItems,
      sliceStats: sliceStats, shortPath: shortPath, registryMatrix: registryMatrix, fmtTime: fmtTime
    }
  };

  window.AM_PAGES.register("integrations", {
    title: T("page-integrations.title"),
    group: T("page-integrations.group"),
    render: function (AM, root, param) {
      try { render(AM, root, param); } catch (e) {
        clear(root);
        root.appendChild(stateCard("error", T("page-integrations.errTitle"), T("page-integrations.renderErr", { reason: str(e && e.message, 200) }), function () { S.root = null; try { render(AM, root); } catch (e2) { /* görünür hata kartı zaten çizildi */ } }));
      }
    }
  });
})();
