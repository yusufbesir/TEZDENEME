// D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. Ek bölümler 'D9' ile işaretlidir; ADR-016: yetenekler kendiliğinden çalışmaz.
/*
 * Sahip: Sonnet (D3 sayfası: Araştırma ve Kalibrasyon) [İP:AgentMom Faz 11, D3]
 * yazan: [Claude#agentmom-d3-sayfalar-more]
 * Amaç: window.AM_PAGES.register("research", ...) ile kalibrasyon özeti (data.calibration).
 *   Bu sayfada karar/onay düğmesi yoktur; kararlar yalnızca kullanıcıya aittir.
 *   Ek bölüm (salt okunur): Karar soy ağacı (data.genealogy orman, data.genealogy:<kimlik> zincir); karar başlıkları veridir, yalnız textContent.
 * Kural kaynağı: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md (D3). Sunucu metni yalnız textContent. Saf mantık: window.AM_PAGE_RESEARCH.pure.
 * Değiştirme: yalnız sahibi ya da ana oturum. Yükleme sırasında DOM'a dokunmaz.
 */
(function () {
  "use strict";

  if (!window.AM_PAGES || typeof window.AM_PAGES.register !== "function") {
    throw new Error("page-research: AM_PAGES sayfa çerçevesi (pages.js) yüklenmemiş; Araştırma sayfası kaydedilemedi.");
  }
  if (typeof window.AM_REGISTER_TR !== "function" || typeof window.AM_T !== "function") {
    throw new Error("page-research: strings.js (AM_REGISTER_TR/AM_T) yüklenmemiş.");
  }

  window.AM_REGISTER_TR("page-research", {
    "page-research.title": "Araştırma ve Kalibrasyon",
    "page-research.group": "Yönetim",
    "page-research.lead": "Tahmin kalibrasyonu: güvenin gerçekleşen sonuçlarla ne kadar örtüştüğü.",
    "page-research.onlyRecords": "Bu sayfa yalnızca okunur. Karar ve onay yalnızca kullanıcıya aittir ve bu sayfada verilmez.",
    "page-research.calEmpty": "Kalibrasyon verisi yok",
    "page-research.calEmptyDetail": "Henüz değerlendirilecek bir kalibrasyon raporu yok.",
    "page-research.calTitle": "Kalibrasyon özeti",
    "page-research.calHint": "Tahmin güveninin gerçekleşen sonuçlarla ne kadar örtüştüğü. Yetersiz veri, iyi kalibre demek değildir.",
    "page-research.cal.insufficient_data": "Yetersiz veri",
    "page-research.cal.biased_sample": "Önyargılı örneklem",
    "page-research.cal.calibrated": "Kalibre",
    "page-research.cal.overconfident": "Aşırı güvenli",
    "page-research.cal.underconfident": "Yeterince güvenmiyor",
    "page-research.cal.unknown": "Bilinmeyen sonuç",
    "page-research.calResolved": "Sonuçlanan tahmin",
    "page-research.calOverdue": "Süresi geçmiş, sonuçlanmamış",
    "page-research.calBrier": "Brier skoru",
    "page-research.calConf": "Ortalama güven",
    "page-research.calAcc": "Gerçekleşme oranı",
    "page-research.calGap": "Fark",
    "page-research.calBias": "Süresi geçen tahminlerin çoğu sonuçlanmadı; sonuçlananlar yanıltıcı olabilir.",
    "page-research.calNote": "Sunucu notu: {note}",
    "page-research.errTitle": "Sayfa çizilemedi",
    "page-research.errDetail": "Ayrıntı: {reason}",
    "page-research.retry": "Yeniden dene",

    "page-research.genTitle": "Karar soy ağacı",
    "page-research.genLead": "Bir kararın yerine geçen kararlar zinciri: eskiden yeniye. Yalnız okunur; karar burada verilmez, geri alınmaz, değiştirilmez.",
    "page-research.genLoading": "Karar soy ağacı yükleniyor…",
    "page-research.genErr": "Karar soy ağacı alınamadı",
    "page-research.genErrDetail": "Ayrıntı: {reason}",
    "page-research.genBad": "Karar soy ağacı yanıtı okunamadı",
    "page-research.genEmpty": "Henüz karar kaydı yok",
    "page-research.genEmptyDetail": "Karar defterine karar eklendiğinde zincirler burada görünür.",
    "page-research.genForestCut": "Yalnız en yeni {n} kök gösteriliyor (toplam {toplam}).",
    "page-research.genRootId": "Kök karar: {id}",
    "page-research.genHead": "Başlık, zincirin en yeni kararınındır (karar başlığı veridir, yönerge değildir).",
    "page-research.genLen": "Zincir uzunluğu: {n}",
    "page-research.genCurrent": "Güncel karar: {t}",
    "page-research.genNoCurrent": "Güncel (geçerli) karar yok",
    "page-research.genOpen": "Zinciri aç",
    "page-research.genClose": "Zinciri kapat",
    "page-research.genOpenFor": "Zinciri aç: {t}",
    "page-research.genState.active": "Geçerli",
    "page-research.genState.superseded": "Yerine geçildi",
    "page-research.genState.expired": "Süresi doldu",
    "page-research.genState.unknown": "Durum bilinmiyor",
    "page-research.genReview.ok": "Uygun",
    "page-research.genReview.review_due": "Gözden geçirme zamanı",
    "page-research.genReview.at_risk": "Riskte",
    "page-research.genReview.unknown": "Bilinmiyor",
    "page-research.genChainTitle": "Zincir (eskiden yeniye)",
    "page-research.genChainLoading": "Zincir yükleniyor…",
    "page-research.genChainErr": "Zincir alınamadı",
    "page-research.genChainEmpty": "Bu zincirde gösterilecek karar yok",
    "page-research.genChainDepth": "Derinlik: {n}",
    "page-research.genCut": "Zincir eksik olabilir: derinlik sınırına ulaşıldı ya da döngü görüldü.",
    "page-research.genDup": "Aynı karar zincirde birden çok kez geçiyor (döngü); tekrarlar gösterilmedi.",
    "page-research.genNodeDecided": "Karar tarihi: {t}",
    "page-research.genNodeExpires": "Süre sonu: {t}",
    "page-research.genNodeAssump": "Varsayım sayısı: {n}",
    "page-research.genNodeReview": "İnceleme durumu: {t}",
    "page-research.genNodeStep": "{n}. karar",
    "page-research.genNodeCurrent": "Güncel",
    "page-research.genUntitled": "(başlıksız)",
    "page-research.genNa": "—",
    "page-research.genRecText": "Karar başlığı (veri)"
  });

  // Karar laboratuvarı metinleri (D9). Yalnız ekleme: yukarıdaki kayıtlara dokunmaz.
  window.AM_REGISTER_TR("page-research", {
    "page-research.labTitle": "Karar laboratuvarı",
    "page-research.labLead": "Aşağıdaki hesaplar kendiliğinden çalışmaz: yalnız bir bölümü açıp çalıştırdığınızda çalışır. Hepsi yalnız ÖNERİ üretir; hiçbir şey kaydetmez, hiçbir kararı vermez ya da değiştirmez.",
    "page-research.labOpen": "Aç",
    "page-research.labClose": "Kapat",
    "page-research.labRun": "Hesapla",
    "page-research.labRunning": "Hesaplanıyor…",
    "page-research.labRemove": "Satırı çıkar",
    "page-research.labRefresh": "Yenile",
    "page-research.labBad": "Sunucu yanıtı okunamadı; sonuç gösterilemiyor.",

    "page-research.hypTitle": "Rakip hipotezler",
    "page-research.hypLead": "Birbirini dışlayan hipotezleri kanıtlarla karşılaştırır: ardıl olasılık, kanıtın ayırt ediciliği, ACH uyuşmazlığı.",
    "page-research.hypNote": "Her kanıt için, hipotez doğruysa o kanıtın görülme olasılığını (0 ile 1 arası) girin. Boş bırakılan olabilirlik 0,5 (ayırt etmez) sayılır ve uyarı yazılır. Öncül girmezseniz hipotezler eşit öncülle başlar; girerseniz toplamı 1 olmalıdır.",
    "page-research.hypMode": "Yöntem",
    "page-research.hypModeBayes": "Bayes (ardıl olasılık)",
    "page-research.hypModeAch": "ACH (uyuşmazlık sayısı)",
    "page-research.hypList": "Hipotezler",
    "page-research.hypN": "Hipotez {n}",
    "page-research.hypName": "Hipotez {n}: ad",
    "page-research.hypPrior": "Hipotez {n}: öncül (isteğe bağlı)",
    "page-research.hypAdd": "Hipotez ekle",
    "page-research.hypEvList": "Kanıtlar",
    "page-research.hypEvN": "Kanıt {n}",
    "page-research.hypEvText": "Kanıt {n}: metin",
    "page-research.hypEvAdd": "Kanıt ekle",
    "page-research.hypLik": "Olabilirlik: {h}",
    "page-research.hypLikHint": "Kanıtlar, hipotez verilmişken birbirinden bağımsız varsayılır; bağımlı kanıtlar sonucu olduğundan keskin gösterir.",
    "page-research.hypResErr": "Hipotez hesabı yapılamadı",
    "page-research.hypResTitle": "Sonuç",
    "page-research.hypResNote": "Yöntem: {mode} · Öncül: {prior}. Bu yalnız bir öneridir; hiçbir şey kaydedilmedi.",
    "page-research.hypPriorGiven": "verdiğiniz öncüller",
    "page-research.hypPriorEqual": "eşit öncül",
    "page-research.hypPostCaption": "Hipotezlerin ardıl olasılıkları",
    "page-research.hypColRank": "Sıra",
    "page-research.hypColName": "Hipotez",
    "page-research.hypColPost": "Ardıl olasılık",
    "page-research.hypColPrior": "Öncül",
    "page-research.hypColInc": "Uyuşmazlık sayısı",
    "page-research.hypColState": "Durum",
    "page-research.hypBarLabel": "{ad}: ardıl olasılık",
    "page-research.hypEliminated": "Elendi",
    "page-research.hypUndefined": "Tanımsız",
    "page-research.hypAlive": "Canlı",
    "page-research.hypLeast": "En az çürütülen hipotez: {ad} (uyuşmazlık sayısı {n}){esit}",
    "page-research.hypTied": ". Eşit olanlar: {ids}",
    "page-research.hypLeastNone": "En az çürütülen hipotez belirlenemedi: bütün hipotezler elendi.",
    "page-research.hypDiagTitle": "Kanıtların ayırt ediciliği",
    "page-research.hypDiagCaption": "Kanıt, güç, olabilirlik oranı ve not",
    "page-research.hypColEv": "Kanıt",
    "page-research.hypColStrength": "Güç",
    "page-research.hypColRatio": "Oran",
    "page-research.hypColNote": "Not",
    "page-research.hypWarnTitle": "Uyarılar",
    "page-research.hypAssumpTitle": "Varsayımlar",

    "page-research.voiTitle": "Bilgi değeri",
    "page-research.voiLead": "Karar vermeden önce bilgi toplamaya değip değmediğini hesaplar: seçeneklerin beklenen değeri, mükemmel bilginin değeri (EVPI) ve testin değeri (EVSI).",
    "page-research.voiNote": "Durumların olasılıkları toplamı 1 olmalıdır. Kazançlar aynı birimde (para, saat, puan…) olmalıdır; birimi siz seçersiniz.",
    "page-research.voiStates": "Durumlar",
    "page-research.voiStateN": "Durum {n}",
    "page-research.voiStateName": "Durum {n}: ad",
    "page-research.voiStateP": "Durum {n}: olasılık",
    "page-research.voiStateAdd": "Durum ekle",
    "page-research.voiOptions": "Seçenekler",
    "page-research.voiOptN": "Seçenek {n}",
    "page-research.voiOptName": "Seçenek {n}: ad",
    "page-research.voiPay": "Kazanç: {s}",
    "page-research.voiOptAdd": "Seçenek ekle",
    "page-research.voiTests": "Testler (isteğe bağlı)",
    "page-research.voiTestNote": "Bu arayüz testin sonucunu yalnız iki değerli (pozitif/negatif) alır: her durum için testin pozitif çıkma olasılığını girin; negatif olasılık 1 eksiği olarak hesaplanır. Sunucu daha genel sonuç dağılımlarını da hesaplayabilir; burada gönderilmez.",
    "page-research.voiTestN": "Test {n}",
    "page-research.voiTestName": "Test {n}: ad",
    "page-research.voiTestCost": "Test {n}: maliyet",
    "page-research.voiTestPos": "Pozitif sonuç olasılığı: {s}",
    "page-research.voiTestAdd": "Test ekle",
    "page-research.voiResErr": "Bilgi değeri hesabı yapılamadı",
    "page-research.voiResTitle": "Sonuç",
    "page-research.voiEvCaption": "Seçeneklerin beklenen değeri",
    "page-research.voiColOpt": "Seçenek",
    "page-research.voiColEv": "Beklenen değer",
    "page-research.voiColBest": "En iyi",
    "page-research.voiBest": "En iyi seçenek",
    "page-research.voiEvpi": "Mükemmel bilginin değeri (EVPI)",
    "page-research.voiMargin": "İlk iki seçenek arası fark",
    "page-research.voiTestCaption": "Testlerin değeri",
    "page-research.voiColTest": "Test",
    "page-research.voiColEvsi": "EVSI",
    "page-research.voiColCost": "Maliyet",
    "page-research.voiColNet": "Net değer",
    "page-research.voiColWorth": "Toplamaya değer mi",
    "page-research.voiWorth": "Değer",
    "page-research.voiNotWorth": "Değmez",
    "page-research.voiOutHead": "{ad}: olası sonuçlar",
    "page-research.voiOutLine": "{y} sonuç: olasılık {p}; bu durumda en iyi seçenek {opt}",
    "page-research.voiPositive": "Pozitif",
    "page-research.voiNegative": "Negatif",
    "page-research.voiRec": "Öneri: {text}",
    "page-research.voiSens": "Duyarlılık",

    "page-research.resTitle": "Çelişki çözüm önerileri",
    "page-research.resLead": "Çelişen hafıza kayıtları için hangisinin tutulacağını ve hangisinin emekli edileceğini kuralla önerir.",
    "page-research.resOnly": "Yalnız ÖNERİDİR: hiçbir kayıt emekli edilmedi, hiçbir bayrak çözülmedi. Uygulama kullanıcı kararıdır.",
    "page-research.resLoading": "Çelişki çözüm önerileri yükleniyor…",
    "page-research.resErr": "Çelişki çözüm önerileri alınamadı",
    "page-research.resOpen": "Açık çelişki",
    "page-research.resConsidered": "Değerlendirilen",
    "page-research.resSuggested": "Önerilen",
    "page-research.resUnresolvable": "Çözülemez",
    "page-research.resCut": "Liste kesildi: yalnız bir bölümü değerlendirildi.",
    "page-research.resEmpty": "Çözüm önerisi yok",
    "page-research.resEmptyDetail": "Açık bir çelişki bayrağı yok ya da hiçbiri değerlendirilemedi.",
    "page-research.resSuggestedChip": "Önerildi",
    "page-research.resUnresolvableChip": "Çözülemez",
    "page-research.resConfChip": "Güven: {p}",
    "page-research.resConf": "güven {p}",
    "page-research.resKeep": "Önerilen (tutulacak): {r}",
    "page-research.resRetire": "Emekli edilmesi önerilen: {r}",
    "page-research.resRecA": "Kayıt A: {r}",
    "page-research.resRecB": "Kayıt B: {r}",
    "page-research.resNoRecord": "(kayıt yok)",
    "page-research.resInactive": "Emekli edilmesi önerilen kayıt zaten etkin değil; yalnız bayrağın çözülmesi yeter.",
    "page-research.resRuleLine": "Kural: {kural}. Gerekçe: {neden}",
    "page-research.resDissent": "Farklı sonuç veren kurallar: {k}",
    "page-research.resRule.yenilik": "Yenilik",
    "page-research.resRule.guven": "Güven",
    "page-research.resRule.tur": "Tür",
    "page-research.resRule.kaynak": "Kaynak",
    "page-research.resRule.bayatlik": "Bayatlık",
    "page-research.resRule.none": "Kural uygulanamadı",

    "page-research.halfTitle": "Bilgi yarı ömrü",
    "page-research.halfLead": "Hafıza kayıtlarının türe ve kapsama göre ne kadar çabuk eskidiğini gösterir.",
    "page-research.halfLoading": "Bilgi yarı ömrü haritası yükleniyor…",
    "page-research.halfErr": "Bilgi yarı ömrü haritası alınamadı",
    "page-research.halfHonest": "Örnek boyutu {n} değerinden azsa tahmin yapılmaz ve 'Yetersiz veri' yazılır; bu, bilginin eskimediği anlamına gelmez.",
    "page-research.halfRead": "Okunan kayıt",
    "page-research.halfBadTimes": "Zamanı bozuk, dışarıda bırakılan",
    "page-research.halfLimit": "Okuma sınırına ulaşıldı: bazı kayıtlar hesaba girmemiş olabilir.",
    "page-research.halfCut": "Grup listesi kesildi.",
    "page-research.halfByKind": "Türe göre",
    "page-research.halfByScope": "Tür ve kapsama göre",
    "page-research.halfNone": "Gösterilecek grup yok.",
    "page-research.halfAllScopes": "Tüm kapsamlar",
    "page-research.halfColKind": "Tür",
    "page-research.halfColScope": "Kapsam",
    "page-research.halfColRecords": "Kayıt",
    "page-research.halfColActive": "Etkin",
    "page-research.halfColAge": "Ortanca yaş (gün)",
    "page-research.halfColStale": "Bayat/süresi dolmuş payı",
    "page-research.halfColSample": "Örnek boyutu",
    "page-research.halfColStatus": "Durum",
    "page-research.halfColHalf": "Yarı ömür",
    "page-research.halfColAdvice": "Öneri",
    "page-research.halfEnough": "Yeterli veri",
    "page-research.halfInsufficient": "Yetersiz veri",
    "page-research.halfNoEst": "Tahmin edilemedi",
    "page-research.halfDays": "{n} gün",

    "page-research.learnTitle": "Öğrenme getirisi",
    "page-research.learnLead": "Tahmin hatasının (Brier skoru) zamanla düşüp düşmediğini, genel ve kaynak bazında gösterir.",
    "page-research.learnLoading": "Öğrenme getirisi yükleniyor…",
    "page-research.learnErr": "Öğrenme getirisi alınamadı",
    "page-research.learnHonest": "Sonuçlanan tahmin sayısı {n} değerinden azsa iyileşme hesaplanmaz ve 'Yetersiz veri' yazılır.",
    "page-research.learnCut": "Kaynak listesi kesildi (toplam {toplam} kaynak).",
    "page-research.learnEmpty": "Öğrenme verisi yok",
    "page-research.learnEmptyDetail": "Henüz değerlendirilecek tahmin yok.",
    "page-research.learnCaption": "Brier skoru ve iyileşme (genel ve kaynak bazında)",
    "page-research.learnAll": "Genel (tüm kaynaklar)",
    "page-research.learnColSource": "Kaynak",
    "page-research.learnColResolved": "Sonuçlanan",
    "page-research.learnColOpen": "Açık",
    "page-research.learnColOverdue": "Gecikmiş",
    "page-research.learnColBrier": "Ortalama Brier",
    "page-research.learnColFirst": "İlk yarı",
    "page-research.learnColLast": "Son yarı",
    "page-research.learnColImp": "İyileşme",
    "page-research.learnColReturn": "Öğrenme getirisi",
    "page-research.learnColTrend": "Eğilim",
    "page-research.learnColStatus": "Durum",
    "page-research.learnColNote": "Not",
    "page-research.learnTrendUp": "İyileşiyor",
    "page-research.learnTrendDown": "Kötüleşiyor",
    "page-research.learnTrendFlat": "Değişmiyor",

    "page-research.argOpen": "Argüman",
    "page-research.argClose": "Argümanı kapat",
    "page-research.argOpenFor": "Argüman derle: {t}",
    "page-research.argTitle": "Argüman",
    "page-research.argOnly": "Argüman, kararın kayıtlı dayanaklarından derlenir. Yalnız okunur; kararı değiştirmez ya da onaylamaz.",
    "page-research.argLoading": "Argüman derleniyor…",
    "page-research.argErr": "Argüman derlenemedi",
    "page-research.argVerdict": "Hüküm: {v}",
    "page-research.argClaim": "İddia: {t}",
    "page-research.argScope": "Kapsam: {t}",
    "page-research.argStatus": "Durum: {t}",
    "page-research.argReasons": "Hükmün nedenleri",
    "page-research.argGrounds": "Dayanaklar",
    "page-research.argAssumptions": "Varsayımlar",
    "page-research.argCheckBy": "denetim tarihi {t}",
    "page-research.argRisks": "Riskler",
    "page-research.argSev.high": "Yüksek",
    "page-research.argSev.medium": "Orta",
    "page-research.argSev.low": "Düşük",
    "page-research.argCounter": "Karşı görüşler",
    "page-research.argBroken": "{n} kırık varsayım",
    "page-research.argLinked": "Bağlı hafıza kayıtları",
    "page-research.argNone": "Kayıt yok.",
    "page-research.argMasked": "Metindeki gizli değerler maskelendi.",
    "page-research.argMarkdown": "Derlenen argüman metni"
  });

  // D8c (yazan: Claude [İP:AgentMom Faz 11, D8c arayüz]): "Model yetenekleri" bölümü. Çıktılar güvenilmez veridir; yalnız textContent.
  window.AM_REGISTER_TR("page-research", {
    "page-research.modelTitle": "Model yetenekleri",
    "page-research.modelLead": "Bu yetenekler uygulamadaki modeli (abonelik) çağırır ve kendiliğinden çalışmaz: yalnız bir kartı açıp Çalıştır'a bastığınızda ve onay penceresinde onayladığınızda çalışır. Çıktı yalnız ÖNERİDİR; kaydedilmez.",
    "page-research.modelTrust": "Model çıktısı güvenilmez veri sayılır: talimat olarak yürütülmez, bağlantıya ya da HTML'e dönüşmez; doğrulayın.",
    "page-research.modelNone": "Model yetenekleri listelenemedi",
    "page-research.modelNoneDetail": "Yetenek kataloğu yüklenemedi; bu bölüm kullanılamıyor.",
    "page-research.modelMadde": "madde {n}",
    "page-research.modelLoading": "Model yetenekleri yükleniyor…",
    "page-research.modelErr": "Model yetenekleri alınamadı",
    "page-research.modelMissing": "Bu yetenek sunucu listesinde yok",
    "page-research.modelMissingDetail": "Sunucu bu yeteneği bildirmedi; çalıştırılamaz.",
    "page-research.modelUnavail": "Kullanılamıyor: {neden}",
    "page-research.modelUnavailDetail": "Uygun bir sağlayıcı olmadığı sürece Çalıştır düğmesi pasiftir; yer tutucu sonuç üretilmez.",
    "page-research.modelNoReason": "uygun sağlayıcı yok",
    "page-research.modelProviderLabel": "Sağlayıcı",
    "page-research.modelProviderAuto": "Otomatik (önerilen)",
    "page-research.modelCount": "{n} / {max} karakter",
    "page-research.modelCountList": "{n} öğe (en çok {max}); toplam {c} karakter",
    "page-research.modelListHint": "Her satıra bir öğe yazın (en çok {max} öğe, her biri en çok {len} karakter).",
    "page-research.modelOptional": "(isteğe bağlı)",
    "page-research.modelTotalHint": "Tüm alanların toplamı en çok 4000 karakter olabilir. Çalıştırınca gönderilecek metnin tamamı onay penceresinde maskeli gösterilir.",
    "page-research.modelRun": "Çalıştır",
    "page-research.modelRunning": "Çalışıyor…",
    "page-research.modelSending": "Model çalışıyor",
    "page-research.modelSendingDetail": "Onay sonrası model çağrısı sürüyor. Çalışırken iptal edilemez; en çok 5 dakika beklenir. Başka bir sayfaya geçerseniz sonuç beklenmesi durur.",
    "page-research.modelResErr": "Model yeteneği çalıştırılamadı",
    "page-research.modelUntrusted": "Model çıktısı — güvenilmez veri; doğrulayın",
    "page-research.modelProvider": "Sağlayıcı: {ad}",
    "page-research.modelNotSaved": "Sonuç yalnız bu ekranda durur; kaydedilmez. Sunucuda yalnız çalıştırma kanıtı tutulur.",
    "page-research.modelWarnTitle": "Uyarılar",
    "page-research.modelBadShape": "Sonuç beklenen biçimde değil; gösterilemiyor.",
    "page-research.modelFamilies": "Çözüm aileleri",
    "page-research.modelColFamily": "Aile",
    "page-research.modelColIdea": "Fikir",
    "page-research.modelColPros": "Artılar",
    "page-research.modelColCons": "Eksiler",
    "page-research.modelColAssump": "Varsayımlar",
    "page-research.modelTradeoffs": "Ödünleşimler",
    "page-research.modelNext": "Önerilen ilk adım",
    "page-research.modelTransfers": "Aktarımlar",
    "page-research.modelColDiscipline": "Disiplin",
    "page-research.modelColConcept": "Kavram",
    "page-research.modelColMapping": "Eşleme",
    "page-research.modelColRisks": "Riskler",
    "page-research.modelInversions": "Ters çevirmeler",
    "page-research.modelColFailure": "Başarısızlık biçimi",
    "page-research.modelColWhy": "Neden olur",
    "page-research.modelColPrevent": "Önlemler",
    "page-research.modelPremortem": "Ön-ölüm analizi",
    "page-research.modelBehaviors": "Ortaya çıkabilecek davranışlar",
    "page-research.modelColBehavior": "Davranış",
    "page-research.modelColTrigger": "Tetikleyici",
    "page-research.modelColLikelihood": "Olasılık",
    "page-research.modelColMitigation": "Önlem",
    "page-research.modelLik.low": "Düşük",
    "page-research.modelLik.medium": "Orta",
    "page-research.modelLik.high": "Yüksek",
    "page-research.modelLik.unknown": "Bilinmiyor",
    "page-research.modelHorizons": "Ufuklar",
    "page-research.modelObjectives": "Amaçlar",
    "page-research.modelHRisks": "Riskler",
    "page-research.modelDepends": "Bağımlılıklar",
    "page-research.modelNotes": "Ufuklar arası tutarlılık notları",
    "page-research.modelIntentTitle": "Önerilen yetenek",
    "page-research.modelIntentNone": "Katalogda bu isteğe uygun bir yetenek bulunamadı.",
    "page-research.modelIntentParams": "Önerilen parametreler",
    "page-research.modelIntentNoParams": "Parametre önerilmedi.",
    "page-research.modelIntentWhy": "Açıklama",
    "page-research.modelIntentOnly": "Bu yalnız bir öneridir: hiçbir yetenek çalıştırılmadı. Menüde açmak sizi ilgili sayfaya götürür; çalıştırmak yine sizin kararınızdır.",
    "page-research.modelIntentOpen": "Menüde aç: {ad}",
    "page-research.modelIntentUnknown": "Katalogda bulunamadı ({id}); açılamıyor.",
    "page-research.modelEmpty": "(boş)"
  });
  // D8c-UI-2: internetli model yetenekleri (37, 38, 40).
  window.AM_REGISTER_TR("page-research", {
    "page-research.urlsLabel": "Adresler (isteğe bağlı)",
    "page-research.urlsHint": "Her satıra bir adres yazın (http ya da https adresi, en çok {max}). Adres vermezseniz kaynaksız mod: model yalnız kendi bilgisiyle yanıtlar ve sonuç doğrulanmamış sayılır.",
    "page-research.urlsCount": "{n} adres (en çok {max})",
    "page-research.netOffTitle": "İnternet kapalı: yalnız kaynaksız mod",
    "page-research.netOffDetail": "Adres verirseniz hiçbir şey çalıştırılmaz. Adres vermeden çalıştırırsanız model yalnız kendi bilgisiyle yanıtlar. Adresli kullanım için Ayarlar > İnternet erişimi'ni açın.",
    "page-research.netOnTitle": "İnternet açık: yalnız izinli alan adları",
    "page-research.netOnDetail": "Adresler yalnız şu alan adlarından getirilir: {liste}. Her adres için onay penceresinde ve tek kullanımlık bilet ile onayınız alınır.",
    "page-research.netOnNone": "(liste boş)",
    "page-research.netOpenSettings": "Ayarlar > İnternet erişimi",
    "page-research.srcTitle": "Kaynaklar",
    "page-research.srcNone": "Bu koşuda kaynak getirilmedi.",
    "page-research.srcColNo": "No",
    "page-research.srcColUrl": "Alan adı ve adres",
    "page-research.srcColDate": "Getirilme",
    "page-research.srcColStatus": "Durum",
    "page-research.srcColBytes": "Bayt",
    "page-research.srcColHash": "sha256 (kısa)",
    "page-research.srcColErr": "Hata",
    "page-research.srcTruncated": "kısaltıldı",
    "page-research.srcErr.approval_required": "onay gerekli (bilet yok ya da geçersiz)",
    "page-research.srcErr.redirect_needs_approval": "yönlendirme ayrı onay gerektirir",
    "page-research.srcErr.total_limit": "toplam kaynak sınırı aşıldı",
    "page-research.srcErr.host_not_allowed": "alan adı izinli değil",
    "page-research.srcErr.net_disabled": "internet kapalı",
    "page-research.srcErr.invalid_url": "adres geçersiz",
    "page-research.srcErr.rate_limited": "istek sınırına takıldı",
    "page-research.srcErr.scheme_not_allowed": "adres türü izinli değil",
    "page-research.srcErr.port_not_allowed": "kapı numarası izinli değil",
    "page-research.srcErr.ip_literal": "IP adresi kabul edilmez",
    "page-research.srcErr.url_too_long": "adres çok uzun",
    "page-research.srcErr.credentials_in_url": "adreste kullanıcı bilgisi var",
    "page-research.srcErr.secret_in_url": "adreste sır benzeri değer var",
    "page-research.srcErr.timeout": "zaman aşımı",
    "page-research.srcErr.too_large": "içerik çok büyük",
    "page-research.srcErr.unsupported_content": "içerik türü desteklenmiyor",
    "page-research.srcErr.fetch_failed": "getirilemedi",
    "page-research.srcErr.blocked_address": "adres engellendi",
    "page-research.srcErr.other": "hata kodu: {kod}",
    "page-research.verOk": "✓ alıntı kaynakta aynen geçiyor",
    "page-research.verOkNote": "iddianın doğruluğunu garanti etmez",
    "page-research.verBad.partial": "✕ alıntı cümlenin yalnız bir kısmı",
    "page-research.verBad.short": "✕ alıntı çok kısa",
    "page-research.verBad.notFound": "✕ alıntı kaynakta bulunamadı",
    "page-research.verBad.noQuote": "✕ alıntı verilmedi",
    "page-research.verMeaning": "Doğrulama ne demek: {metin}",
    "page-research.srcPathDigest": "yol özeti: {ozet}",
    "page-research.verNone": "— kaynaksız (model bilgisi)",
    "page-research.verNoQuote": "— alıntı verilmedi",
    "page-research.verCol": "Doğrulama",
    "page-research.attrCol": "Kaynak ve alıntı",
    "page-research.attrSource": "Kaynak {n}",
    "page-research.attrNone": "kaynaksız",
    "page-research.sourcelessChip": "Kaynaksız yanıt",
    "page-research.sourcelessText": "Bu yanıt internetten kaynak getirilmeden, yalnız model bilgisiyle üretildi; doğrulayın.",
    "page-research.unverified": "{n} alıntı kaynakta bulunamadı; bu iddialara güvenmeyin, kaynağı kendiniz kontrol edin.",
    "page-research.rcSummary": "Özet",
    "page-research.rcFindings": "Bulgular",
    "page-research.rcColClaim": "Bulgu",
    "page-research.rcColConf": "Güven",
    "page-research.rcGaps": "Eksikler",
    "page-research.rcFollow": "Sonraki adımlar",
    "page-research.fdFeatures": "Önerilen özellikler",
    "page-research.fdColName": "Özellik",
    "page-research.fdColWhy": "Gerekçe",
    "page-research.fdColPri": "Öncelik",
    "page-research.fdColEffort": "Emek",
    "page-research.fdEffort.S": "S (küçük)",
    "page-research.fdEffort.M": "M (orta)",
    "page-research.fdEffort.L": "L (büyük)",
    "page-research.fdRisks": "Riskler",
    "page-research.crEntities": "Karşılaştırılanlar",
    "page-research.crColName": "Ad",
    "page-research.crColStr": "Güçlü yönler",
    "page-research.crColWeak": "Zayıf yönler",
    "page-research.crCompare": "Ölçüt karşılaştırması",
    "page-research.crColCrit": "Ölçüt",
    "page-research.crColNotes": "Notlar",
    "page-research.crGaps": "Eksikler"
  });

  // D8c-UI-3: müzakere (madde 75).
  window.AM_REGISTER_TR("page-research", {
    "page-research.negoRounds2": "2 tur (varsayılan)",
    "page-research.negoRounds1": "1 tur",
    "page-research.negoAuto": "Otomatik (önerilen)",
    "page-research.negoSame": "Öneren ve eleştirmen sağlayıcı aynı olamaz: müzakere iki FARKLI sağlayıcı ister. Birini değiştirin ya da ikisini Otomatik bırakın.",
    "page-research.negoNeedTwo": "Müzakere iki FARKLI sağlayıcı gerektirir; yeterli sağlayıcı yoksa Çalıştır pasif kalır.",
    "page-research.negoProviders": "Sağlayıcılar: A (öneren) = {a}, B (eleştirmen) = {b}; {n} tur",
    "page-research.negoTranscript": "Müzakere yazışması",
    "page-research.negoRound": "Tur {n}",
    "page-research.negoRoleA": "A (öneren)",
    "page-research.negoRoleB": "B (eleştirmen)",
    "page-research.negoStep.propose": "Öneri",
    "page-research.negoStep.critique": "Eleştiri",
    "page-research.negoStep.revise": "Gözden geçirme",
    "page-research.negoStep.final": "Son tutum",
    "page-research.negoPosition": "Duruş: {t}",
    "page-research.negoProposal": "Öneri {id}: {t}",
    "page-research.negoPros": "Artılar",
    "page-research.negoCons": "Eksikler",
    "page-research.negoCritique": "{id} için itiraz ({sev}): {t}",
    "page-research.negoSuggest": "Düzeltme önerisi: {t}",
    "page-research.negoCounter": "Karşı öneri: {t}",
    "page-research.negoRevision": "{id} değişikliği: {t}",
    "page-research.negoAnswers": "Eleştiriye yanıt: {t}",
    "page-research.negoStance": "Duruş: {t}",
    "page-research.negoStanceFinal": "Son tutum: {t}",
    "page-research.negoStance.agree": "Katılıyor",
    "page-research.negoStance.partial": "Kısmen katılıyor",
    "page-research.negoStance.disagree": "Katılmıyor",
    "page-research.negoSev.low": "düşük",
    "page-research.negoSev.medium": "orta",
    "page-research.negoSev.high": "yüksek",
    "page-research.negoOutcome": "Sonuç",
    "page-research.negoStatus.consensus": "Uzlaşma",
    "page-research.negoStatus.partial": "Kısmi uzlaşma",
    "page-research.negoStatus.disagreement": "Anlaşmazlık",
    "page-research.negoAgreed": "Uzlaşılan noktalar",
    "page-research.negoOpen": "Açık sorunlar",
    "page-research.negoRec": "ÖNERİ",
    "page-research.negoRecNote": "Bu yalnız bir öneridir; hiçbir şey kendiliğinden uygulanmadı, karar sizindir.",
    "page-research.negoPartial": "Müzakere yarıda kesildi: {n} adım tamamlandı. Aşağıda yalnız tamamlanan adımlar var; sonuç türetilmedi.",
    "page-research.negoPartialWhy": "Neden: {t}",
    "page-research.negoConf": "Güven: {t}",
    "page-research.negoConf.low": "düşük",
    "page-research.negoConf.medium": "orta",
    "page-research.negoSource": "Kaynak: {t}",
    "page-research.negoSingle": "Tek tur: uzlaşma doğrulanamaz (itiraz yok demek, karşı tarafın onayı demek değildir).",
    "page-research.sandboxInfo": "Analiz çalışma alanı: {n} / {limit} çalışma ağacı.",
    "page-research.sandboxFull": "Analiz çalışma alanında çok fazla eski çalışma ağacı birikti; Geri Dönüşüm Kutusu'na taşınması gerekir. Taşınana kadar model yetenekleri çalışmayabilir."
  });

  var T = function (key, vars) { return window.AM_T(key, vars); };

  // ------------------------------------------------------------------ saf mantık
  var VERDICT = { insufficient_data: "muted", biased_sample: "warn", calibrated: "ok", overconfident: "warn", underconfident: "warn" };

  function str(v, max) { return typeof v === "string" ? v.slice(0, max || 300) : v == null ? "" : String(v).slice(0, max || 300); }
  function num(v) { var n = Number(v); return v === null || v === undefined || v === "" || !isFinite(n) ? null : n; }

  function fmtPct(x) { var n = num(x); return n === null ? "—" : "%" + Math.round(n * 100); }
  function fmtDec(x, d) { var n = num(x); return n === null ? "—" : n.toFixed(d).replace(".", ","); }
  // Kalibrasyon: rapor yoksa null (bölüm gizlenir).
  function calSummary(value) {
    var r = value && typeof value === "object" ? (value.report && typeof value.report === "object" ? value.report : value) : null;
    if (!r || typeof r !== "object" || (r.verdict === undefined && r.resolved === undefined)) return null;
    var v = Object.prototype.hasOwnProperty.call(VERDICT, r.verdict) ? r.verdict : "unknown";
    return {
      verdict: v, tone: VERDICT[v] || "info", resolved: num(r.resolved), overdue: num(r.unresolvedOverdue), brier: num(r.brier),
      meanConfidence: num(r.meanConfidence), accuracy: num(r.accuracy), gap: num(r.gap), bias: r.selectionBiasWarning === true, note: str(r.note, 600)
    };
  }

  // ---- Karar soy ağacı: saf mantık ----
  // Sunucu metni güvenilmez VERİDİR: denetim/çift yönlü karakterler boşluğa çevrilir, bilinen gizli değer kalıpları maskelenir, uzunluk sınırlanır.
  var CTRL_RE = /[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  var SECRET_RE = /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,})\b|Bearer\s+[A-Za-z0-9._~+\/=-]{12,}/g;
  var ID_RE = /^[0-9a-f-]{36}$/;
  var GEN_STATE = { active: ["ok", "check"], superseded: ["muted", "archive"], expired: ["warn", "clock"] };
  var REVIEW_OK = { ok: 1, review_due: 1, at_risk: 1 };
  var MAX_NODES = 60;
  var MAX_TREES = 100;

  function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  function safe(v, max) {
    var s = typeof v === "string" ? v : v == null ? "" : String(v);
    s = s.replace(CTRL_RE, " ").replace(SECRET_RE, "[gizli]");
    var lim = max || 300;
    return s.length > lim ? s.slice(0, lim - 1) + "…" : s;
  }
  function stateOf(v) { return Object.prototype.hasOwnProperty.call(GEN_STATE, v) ? v : "unknown"; }
  function reviewOf(v) { return REVIEW_OK[v] === 1 ? v : "unknown"; }
  function fmtDate(iso) {
    var d = new Date(String(iso || ""));
    if (isNaN(d.getTime())) return safe(iso, 40);
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  // Orman: bozuk/eksik yanıt null (hata kartı); eksik alan uydurulmaz.
  function forestSummary(value) {
    var v = isObj(value) ? value : null;
    if (!v || !Array.isArray(v.trees)) return null;
    var total = num(v.totalRoots);
    var trees = v.trees.slice(0, MAX_TREES).filter(isObj).map(function (t) {
      var chain = Array.isArray(t.chain) ? t.chain : [];
      var len = num(t.depth);
      return {
        root: safe(t.root, 64), length: len !== null && len >= 0 ? Math.floor(len) : chain.length, current: t.current == null ? null : safe(t.current, 64),
        headId: safe(t.headId, 64), headTitle: safe(t.headTitle, 300), headState: stateOf(t.headState), headReview: reviewOf(t.headReviewState), truncated: t.truncated === true
      };
    });
    return { total: total === null ? trees.length : total, cut: v.truncated === true, trees: trees };
  }
  // Tek zincir: yanıt {genealogy: {...}} ya da doğrudan {...}. Düğümler eskiden yeniye; tekrar eden kimlik (döngü) bir kez gösterilir ve uyarı verir.
  function chainSummary(value) {
    var g = isObj(value) ? (isObj(value.genealogy) ? value.genealogy : value) : null;
    if (!g || !Array.isArray(g.nodes)) return null;
    var order = Array.isArray(g.chain) ? g.chain.map(function (x) { return safe(x, 64); }) : [];
    var seen = Object.create(null);
    var dup = false;
    var nodes = [];
    g.nodes.slice(0, MAX_NODES).filter(isObj).forEach(function (n, i) {
      var id = safe(n.id, 64);
      if (id && seen[id]) { dup = true; return; }
      if (id) seen[id] = true;
      var pos = order.indexOf(id);
      nodes.push({
        i: i, pos: pos < 0 ? 1e6 + i : pos, id: id, title: safe(n.title, 300), decidedAt: safe(n.decidedAt, 40), expiresAt: safe(n.expiresAt, 40), state: stateOf(n.state),
        assumptions: Array.isArray(n.assumptions) ? Math.min(n.assumptions.length, 500) : null, review: reviewOf(n.reviewState)
      });
    });
    nodes.sort(function (a, b) { return a.pos === b.pos ? a.i - b.i : a.pos - b.pos; });
    var depth = num(g.depth);
    return { root: safe(g.root, 64), current: g.current == null ? null : safe(g.current, 64), nodes: nodes, depth: depth === null ? nodes.length : depth, cut: g.truncated === true, dup: dup };
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
    if (retry) { var b = el("button", "am-more-btn", T("page-research.retry")); b.type = "button"; b.addEventListener("click", retry); c.appendChild(b); }
    return c;
  }
  function noteLine(iconName, text) {
    var n = el("p", "am-more-note");
    n.appendChild(icon(iconName, 16));
    n.appendChild(el("span", "am-more-note-t", text));
    return n;
  }
  function section(id, titleKey) {
    var s = el("section", "am-more-sec");
    s.setAttribute("aria-labelledby", id);
    var h = el("h3", "am-more-h3", T(titleKey)); h.setAttribute("id", id);
    s.appendChild(h);
    return s;
  }

  var S = { AM: null, root: null, page: null, req: Object.create(null), lastSig: null, sel: null };

  function dataOf(AM, key) { return AM && AM.state && AM.state.data ? AM.state.data[key] : undefined; }
  function request(key, force, param) {
    var AM = S.AM;
    if (!AM || !AM.actions || typeof AM.actions.loadData !== "function") return false;
    var rk = param === undefined ? key : key + ":" + param;
    if (S.req[rk] && !force) return true;
    S.req[rk] = true;
    if (param === undefined) AM.actions.loadData(key); else AM.actions.loadData(key, param);
    return true;
  }

  function calSection(AM) {
    var d = dataOf(AM, "calibration");
    if (!d) { request("calibration", false); return null; }
    if (d.status !== "ok") return null;
    var c = calSummary(d.value);
    if (!c) return null;
    var sec = section("am-more-rs-c", "page-research.calTitle");
    sec.appendChild(el("p", "am-more-hint", T("page-research.calHint")));
    var head = el("p", "am-more-count");
    head.appendChild(chip(T("page-research.cal." + c.verdict), c.tone, c.tone === "ok" ? "check" : c.tone === "muted" ? "info" : "alert"));
    sec.appendChild(head);
    var dl = el("dl", "am-more-kv");
    [["page-research.calResolved", c.resolved === null ? "—" : String(c.resolved)], ["page-research.calOverdue", c.overdue === null ? "—" : String(c.overdue)],
      ["page-research.calBrier", fmtDec(c.brier, 3)], ["page-research.calConf", fmtPct(c.meanConfidence)], ["page-research.calAcc", fmtPct(c.accuracy)], ["page-research.calGap", fmtDec(c.gap, 2)]].forEach(function (p) {
      var w = el("div", "am-more-kv-i");
      w.appendChild(el("dt", "am-more-kv-k", T(p[0])));
      w.appendChild(el("dd", "am-more-kv-v", p[1]));
      dl.appendChild(w);
    });
    sec.appendChild(dl);
    if (c.bias) sec.appendChild(noteLine("alert", T("page-research.calBias")));
    if (c.note) sec.appendChild(el("p", "am-more-hint", T("page-research.calNote", { note: c.note })));
    return sec;
  }

  // ---- Karar soy ağacı ----
  function genBadge(state) {
    var info = GEN_STATE[state];
    return chip(T("page-research.genState." + state), info ? info[0] : "muted", info ? info[1] : "info");
  }
  function openChain(id) {
    S.sel = S.sel === id ? null : id;
    if (S.sel) request("genealogy", true, S.sel);
    redraw();
  }
  function treeItem(t) {
    var li = el("li", "am-more-tree");
    var open = S.sel === t.root;
    var head = el("div", "am-more-hit-h");
    head.appendChild(el("strong", "am-more-hit-t", t.headTitle || T("page-research.genUntitled")));
    head.appendChild(genBadge(t.headState));
    if (t.truncated) head.appendChild(chip(T("page-research.genCut"), "warn", "alert"));
    li.appendChild(head);
    li.appendChild(el("p", "am-more-evid", T("page-research.genHead")));
    var cur = t.current === null ? T("page-research.genNoCurrent") : T("page-research.genCurrent", { t: t.current === t.headId && t.headTitle ? t.headTitle : t.current });
    li.appendChild(facts([T("page-research.genRootId", { id: t.root || T("page-research.genNa") }), T("page-research.genLen", { n: t.length }), cur]));
    if (ID_RE.test(t.root)) {
      var b = el("button", "am-more-btn am-more-btn--ghost", open ? T("page-research.genClose") : T("page-research.genOpen"));
      b.type = "button";
      b.setAttribute("aria-expanded", open ? "true" : "false");
      b.setAttribute("aria-label", (open ? T("page-research.genClose") : T("page-research.genOpenFor", { t: (t.headTitle || t.root).slice(0, 80) })));
      b.addEventListener("click", function () { openChain(t.root); });
      li.appendChild(b);
    }
    var argB = argButton(t.headId, t.headTitle);
    if (argB) li.appendChild(argB);
    return li;
  }
  function nodeItem(n, idx, last, curId) {
    var li = el("li", "am-more-node am-more-node--d" + Math.min(idx, 5));
    var head = el("div", "am-more-hit-h");
    head.appendChild(el("span", "am-more-node-arrow", idx === 0 ? "●" : "↳"));
    head.appendChild(el("strong", "am-more-hit-t", n.title || T("page-research.genUntitled")));
    head.appendChild(chip(T("page-research.genNodeStep", { n: idx + 1 }), "muted", "doc"));
    head.appendChild(genBadge(n.state));
    if (curId !== null && n.id === curId) head.appendChild(chip(T("page-research.genNodeCurrent"), "ok", "check"));
    li.appendChild(head);
    li.appendChild(facts([T("page-research.genNodeDecided", { t: fmtDate(n.decidedAt) || T("page-research.genNa") }), T("page-research.genNodeExpires", { t: fmtDate(n.expiresAt) || T("page-research.genNa") }),
      T("page-research.genNodeAssump", { n: n.assumptions === null ? T("page-research.genNa") : n.assumptions }), T("page-research.genNodeReview", { t: T("page-research.genReview." + n.review) })]));
    var nodeArg = argButton(n.id, n.title);
    if (nodeArg) li.appendChild(nodeArg);
    return li;
  }
  function facts(lines) {
    var ul = el("ul", "am-more-facts");
    lines.forEach(function (txt) { ul.appendChild(el("li", "am-more-fact", txt)); });
    return ul;
  }
  function chainBlock(AM, id) {
    var box = el("div", "am-more-chain");
    box.appendChild(el("h4", "am-more-h4", T("page-research.genChainTitle")));
    var d = dataOf(AM, "genealogy:" + id);
    if (!d || d.status === "loading") { box.appendChild(stateCard("loading", T("page-research.genChainLoading"))); return box; }
    var retry = function () { request("genealogy", true, id); };
    if (d.status === "error") { box.appendChild(stateCard("error", T("page-research.genChainErr"), T("page-research.genErrDetail", { reason: safe(d.reason, 200) || "?" }), retry)); return box; }
    var c = chainSummary(d.value);
    if (!c) { box.appendChild(stateCard("error", T("page-research.genChainErr"), T("page-research.genBad"), retry)); return box; }
    box.appendChild(el("p", "am-more-count", T("page-research.genChainDepth", { n: c.depth })));
    if (c.cut) box.appendChild(noteLine("alert", T("page-research.genCut")));
    if (c.dup) box.appendChild(noteLine("alert", T("page-research.genDup")));
    if (!c.nodes.length) { box.appendChild(stateCard("empty", T("page-research.genChainEmpty"), "", null)); return box; }
    var ol = el("ol", "am-more-nodes");
    c.nodes.forEach(function (n, i) { ol.appendChild(nodeItem(n, i, i === c.nodes.length - 1, c.current)); });
    box.appendChild(ol);
    return box;
  }
  function genSection(AM) {
    var sec = section("am-more-rs-g", "page-research.genTitle");
    sec.appendChild(el("p", "am-more-hint", T("page-research.genLead")));
    var d = dataOf(AM, "genealogy");
    if (!d) { request("genealogy", false); sec.appendChild(stateCard("loading", T("page-research.genLoading"))); return sec; }
    if (d.status === "loading") { sec.appendChild(stateCard("loading", T("page-research.genLoading"))); return sec; }
    var retry = function () { request("genealogy", true); };
    if (d.status === "error") { sec.appendChild(stateCard("error", T("page-research.genErr"), T("page-research.genErrDetail", { reason: safe(d.reason, 200) || "?" }), retry)); return sec; }
    var f = forestSummary(d.value);
    if (!f) { sec.appendChild(stateCard("error", T("page-research.genErr"), T("page-research.genBad"), retry)); return sec; }
    if (!f.trees.length) { sec.appendChild(stateCard("empty", T("page-research.genEmpty"), T("page-research.genEmptyDetail"), null)); return sec; }
    if (f.cut) sec.appendChild(noteLine("alert", T("page-research.genForestCut", { n: f.trees.length, toplam: f.total })));
    var ul = el("ul", "am-more-trees");
    f.trees.forEach(function (t) {
      ul.appendChild(treeItem(t));
    });
    sec.appendChild(ul);
    if (S.sel) sec.appendChild(chainBlock(AM, S.sel));
    if (LAB.argId) sec.appendChild(argBlock(AM, LAB.argId));
    return sec;
  }

  // ------------------------------------------------------------------ Karar laboratuvarı (D9): kullanıcı AÇIP ÇALIŞTIRINCA çalışan hesaplar (ADR-016). Hiçbiri kendiliğinden başlamaz, hiçbiri kayıt/karar yazmaz.
  // Form değerleri modül düzeyinde HAM metin olarak tutulur (sayfa her durum değişiminde baştan çizilir); doğrulama ve istek çekirdektedir (AM.actions.hypothesesRun / voiRun).
  var LAB = { open: Object.create(null), lastParam: "", mode: "bayes", argId: null, hyp: null, voi: null, uid: 0 };
  function hypDefault() { return { hypotheses: [{ name: "", prior: "" }, { name: "", prior: "" }], evidence: [{ text: "", lik: ["", ""] }] }; }
  function voiDefault() { return { states: [{ name: "", p: "" }, { name: "", p: "" }], options: [{ name: "", pay: ["", ""] }, { name: "", pay: ["", ""] }], tests: [] }; }
  LAB.hyp = hypDefault();
  LAB.voi = voiDefault();
  var LAB_IDS = ["am-lab-hyp", "am-lab-voi", "am-lab-res", "am-lab-half", "am-lab-learn"];

  function secOf(param) {
    var m = typeof param === "string" ? /^bolum:([A-Za-z0-9._-]{1,60})(?::[0-9]{1,6})?$/.exec(param) : null;
    return m ? m[1] : "";
  }
  // Yetenekler menüsünden gelindiyse (pageParam "bolum:<kimlik>[:<sayaç>]") ilgili laboratuvar bölümü bir kez açılır.
  function applyParam(param) {
    if (typeof param !== "string" || param === LAB.lastParam) return;
    LAB.lastParam = param;
    var id = secOf(param);
    if (id && (LAB_IDS.indexOf(id) >= 0 || /^am-model-[a-z][a-z-]{1,30}$/.test(id))) LAB.open[id] = true;
  }
  function fmtNum(n, d) {
    var x = num(n);
    if (x === null) return "—";
    try { return x.toLocaleString("tr-TR", { maximumFractionDigits: d === undefined ? 4 : d }); } catch (e) { return String(x); }
  }
  function act(name, arg) {
    var AM = S.AM;
    if (!AM || !AM.actions || typeof AM.actions[name] !== "function") return undefined;
    try { var r = AM.actions[name](arg); if (r && typeof r.then === "function") r.then(null, function () { /* hata çekirdekte AM.state.data'ya yazılır */ }); return r; } catch (e) { return undefined; }
  }
  // Veri isteği: aynı veri nesnesi için bir kez (çıkış/girişte AM.state.data yenilenir ve yeniden istenir); zorla = "Yenile".
  S.reqD = Object.create(null);
  function ensure(key, param, force) {
    var AM = S.AM;
    if (!AM || !AM.actions || typeof AM.actions.loadData !== "function") return;
    var rk = param === undefined ? key : key + ":" + param;
    if (!force) {
      if (dataOf(AM, rk) || S.reqD[rk] === (AM.state && AM.state.data)) return;
    }
    S.reqD[rk] = AM.state && AM.state.data;
    try {
      var r = param === undefined ? AM.actions.loadData(key) : AM.actions.loadData(key, param);
      if (r && typeof r.then === "function") r.then(null, function () { /* hata AM.state.data'ya yazılır */ });
    } catch (e) { /* görünür hata sonraki çizimde */ }
  }

  function btn(label, key, onClick, ghost, disabled) {
    var b = el("button", "am-more-btn" + (ghost ? " am-more-btn--ghost" : ""), label);
    b.type = "button";
    if (key) b.setAttribute("data-am-key", key);
    if (disabled) b.disabled = true;
    b.addEventListener("click", function () { if (!b.disabled) onClick(); });
    return b;
  }
  function inputField(parent, o) {
    LAB.uid += 1;
    var id = "am-lab-f" + LAB.uid;
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
      c.setAttribute("maxlength", String(o.max || 100));
      if (o.numeric) c.setAttribute("inputmode", "decimal");
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
  function bar(frac, label) {
    var w = el("div", "am-more-bar");
    var f = num(frac);
    var p = el("progress", "am-more-meter");
    p.setAttribute("max", "100");
    p.setAttribute("value", String(f === null ? 0 : Math.max(0, Math.min(100, Math.round(f * 100)))));
    p.setAttribute("aria-label", label);
    w.appendChild(p);
    w.appendChild(el("span", "am-more-bar-t", f === null ? "—" : "%" + fmtNum(f * 100, 1)));
    return w;
  }
  function lines(parent, list, cap) {
    var items = (Array.isArray(list) ? list : []).slice(0, cap || 30);
    if (!items.length) return;
    var ul = el("ul", "am-more-facts");
    items.forEach(function (t) { ul.appendChild(el("li", "am-more-fact", safe(t, 400))); });
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

  // Bölüm kabuğu: başlık (kimlik = menü hedefi) + aç/kapat düğmesi; gövde yalnız açıkken kurulur (tembel yükleme).
  function labSection(id, titleKey, leadKey, build) { return labSectionText(id, T(titleKey), T(leadKey), build); }
  function labSectionText(id, title, lead, build) {
    var sec = el("section", "am-more-sec am-more-lab");
    sec.setAttribute("aria-labelledby", id);
    var head = el("div", "am-more-labhead");
    var h = el("h4", "am-more-h4 am-more-labtitle", title);
    h.setAttribute("id", id);
    head.appendChild(h);
    var open = LAB.open[id] === true;
    var b = btn(T(open ? "page-research.labClose" : "page-research.labOpen"), "lab-toggle:" + id, function () { LAB.open[id] = !open; redraw(); }, true);
    b.setAttribute("aria-expanded", open ? "true" : "false");
    head.appendChild(b);
    sec.appendChild(head);
    sec.appendChild(el("p", "am-more-hint", lead));
    if (open) {
      var body = el("div", "am-more-labbody");
      sec.appendChild(body);
      try { build(body); } catch (e) { body.appendChild(stateCard("error", T("page-research.errTitle"), T("page-research.errDetail", { reason: str(e && e.message, 200) || "?" }), null)); }
    }
    return sec;
  }
  // GET bölümleri için ortak gövde: yükle (tembel) -> yükleniyor / hata (+ yeniden dene) / boş / sonuç.
  function getBody(body, AM, key, loadingKey, errKey, render) {
    ensure(key);
    var d = dataOf(AM, key);
    if (!d || d.status === "loading") { body.appendChild(stateCard("loading", T(loadingKey))); return; }
    var retry = function () { ensure(key, undefined, true); redraw(); };
    if (d.status === "error") { body.appendChild(stateCard("error", T(errKey), T("page-research.genErrDetail", { reason: safe(d.reason, 200) || "?" }), retry)); return; }
    var v = isObj(d.value) ? d.value : null;
    if (!v) { body.appendChild(stateCard("error", T(errKey), T("page-research.labBad"), retry)); return; }
    render(body, v);
    body.appendChild(btn(T("page-research.labRefresh"), "lab-refresh:" + key, retry, true));
  }

  // ---- Rakip hipotezler (62) ----
  function hypFields() {
    var f = LAB.hyp;
    return {
      mode: LAB.mode,
      hypotheses: f.hypotheses.map(function (h, i) { return { id: "h" + (i + 1), name: h.name, prior: h.prior }; }),
      evidence: f.evidence.map(function (e, i) {
        var lk = {};
        f.hypotheses.forEach(function (h, j) { lk["h" + (j + 1)] = e.lik[j]; });
        return { id: "e" + (i + 1), text: e.text, likelihoods: lk };
      })
    };
  }
  function hypName(i) { var n = LAB.hyp.hypotheses[i] ? safe(LAB.hyp.hypotheses[i].name, 40).trim() : ""; return n || T("page-research.hypN", { n: i + 1 }); }
  function hypForm(body, AM) {
    var f = LAB.hyp;
    body.appendChild(el("p", "am-more-hint", T("page-research.hypNote")));
    var top = el("div", "am-more-controls");
    inputField(top, { key: "hyp-mode", label: T("page-research.hypMode"), options: [["bayes", T("page-research.hypModeBayes")], ["ach", T("page-research.hypModeAch")]], get: function () { return LAB.mode; }, set: function (v) { LAB.mode = v === "ach" ? "ach" : "bayes"; } });
    body.appendChild(top);
    body.appendChild(el("h5", "am-more-h5", T("page-research.hypList")));
    f.hypotheses.forEach(function (h, i) {
      var row = el("div", "am-more-controls am-more-labrow");
      row.setAttribute("role", "group");
      row.setAttribute("aria-label", T("page-research.hypN", { n: i + 1 }));
      inputField(row, { key: "hyp-name-" + i, label: T("page-research.hypName", { n: i + 1 }), wide: true, max: 100, get: function () { return h.name; }, set: function (v) { h.name = v; } });
      inputField(row, { key: "hyp-prior-" + i, label: T("page-research.hypPrior", { n: i + 1 }), numeric: true, max: 12, get: function () { return h.prior; }, set: function (v) { h.prior = v; } });
      if (f.hypotheses.length > 2) row.appendChild(btn(T("page-research.labRemove"), "hyp-del-" + i, function () { f.hypotheses.splice(i, 1); f.evidence.forEach(function (e) { e.lik.splice(i, 1); }); redraw(); }, true));
      body.appendChild(row);
    });
    if (f.hypotheses.length < 10) body.appendChild(btn(T("page-research.hypAdd"), "hyp-add", function () { f.hypotheses.push({ name: "", prior: "" }); f.evidence.forEach(function (e) { e.lik.push(""); }); redraw(); }, true));
    body.appendChild(el("h5", "am-more-h5", T("page-research.hypEvList")));
    f.evidence.forEach(function (e, i) {
      var box = el("div", "am-more-labgroup");
      box.setAttribute("role", "group");
      box.setAttribute("aria-label", T("page-research.hypEvN", { n: i + 1 }));
      var row = el("div", "am-more-controls am-more-labrow");
      inputField(row, { key: "ev-text-" + i, label: T("page-research.hypEvText", { n: i + 1 }), wide: true, max: 300, get: function () { return e.text; }, set: function (v) { e.text = v; } });
      if (f.evidence.length > 1) row.appendChild(btn(T("page-research.labRemove"), "ev-del-" + i, function () { f.evidence.splice(i, 1); redraw(); }, true));
      box.appendChild(row);
      var lk = el("div", "am-more-controls am-more-labrow");
      f.hypotheses.forEach(function (h, j) {
        inputField(lk, { key: "ev-lik-" + i + "-" + j, label: T("page-research.hypLik", { h: hypName(j) }), numeric: true, max: 12, get: function () { return e.lik[j] === undefined ? "" : e.lik[j]; }, set: function (v) { e.lik[j] = v; } });
      });
      box.appendChild(lk);
      body.appendChild(box);
    });
    if (f.evidence.length < 30) body.appendChild(btn(T("page-research.hypEvAdd"), "ev-add", function () { f.evidence.push({ text: "", lik: f.hypotheses.map(function () { return ""; }) }); redraw(); }, true));
    body.appendChild(el("p", "am-more-hint", T("page-research.hypLikHint")));
    var d = dataOf(AM, "hypothesesResult");
    var running = !!d && d.status === "loading";
    var actions = el("div", "am-more-actions");
    actions.appendChild(btn(T("page-research.labRun"), "hyp-run", function () { act("hypothesesRun", hypFields()); }, false, running));
    body.appendChild(actions);
    resultBlock(body, d, hypResult, "page-research.hypResErr");
  }
  function resultBlock(body, d, render, errKey) {
    if (!d) return;
    var box = el("div", "am-more-result");
    box.setAttribute("aria-live", "polite");
    if (d.status === "loading") box.appendChild(stateCard("loading", T("page-research.labRunning")));
    else if (d.status === "error") box.appendChild(stateCard("error", T(errKey), safe(d.reason, 500) || "?", null));
    else {
      try { render(box, isObj(d.value) ? d.value : {}); } catch (e) { box.appendChild(stateCard("error", T(errKey), T("page-research.labBad"), null)); }
    }
    body.appendChild(box);
  }
  function hypResult(box, value) {
    var a = isObj(value.analysis) ? value.analysis : null;
    if (!a || !Array.isArray(a.posteriors)) { box.appendChild(stateCard("error", T("page-research.hypResErr"), T("page-research.labBad"), null)); return; }
    box.appendChild(el("h5", "am-more-h5", T("page-research.hypResTitle")));
    box.appendChild(el("p", "am-more-hint", T("page-research.hypResNote", { mode: a.mode === "ach" ? T("page-research.hypModeAch") : T("page-research.hypModeBayes"), prior: a.priorUsed === "verilen" ? T("page-research.hypPriorGiven") : T("page-research.hypPriorEqual") })));
    var post = a.posteriors.filter(isObj).slice(0, 10).sort(function (x, y) { return (num(x.rank) || 99) - (num(y.rank) || 99); });
    box.appendChild(labTable(T("page-research.hypPostCaption"), [T("page-research.hypColRank"), T("page-research.hypColName"), T("page-research.hypColPost"), T("page-research.hypColPrior"), T("page-research.hypColInc"), T("page-research.hypColState")],
      post.map(function (p) {
        var state = p.eliminated === true ? chip(T("page-research.hypEliminated"), "bad", "alert") : (num(p.posterior) === null ? chip(T("page-research.hypUndefined"), "warn", "alert") : chip(T("page-research.hypAlive"), "ok", "check"));
        return [String(num(p.rank) === null ? "—" : num(p.rank)), safe(p.name, 100) + " (" + safe(p.id, 30) + ")", bar(p.posterior, T("page-research.hypBarLabel", { ad: safe(p.name, 60) })), fmtPct(p.prior), String(num(p.inconsistent) === null ? "—" : num(p.inconsistent)), state];
      })));
    var lr = isObj(a.leastRefuted) ? a.leastRefuted : null;
    box.appendChild(lr ? noteLine("info", T("page-research.hypLeast", { ad: safe(lr.name, 100), n: num(lr.inconsistent) === null ? "—" : num(lr.inconsistent), esit: Array.isArray(lr.tiedWith) && lr.tiedWith.length ? T("page-research.hypTied", { ids: lr.tiedWith.slice(0, 10).map(function (x) { return safe(x, 30); }).join(", ") }) : "" })) : noteLine("alert", T("page-research.hypLeastNone")));
    var ev = (Array.isArray(a.evidence) ? a.evidence : []).filter(isObj).slice(0, 30);
    if (ev.length) {
      box.appendChild(el("h5", "am-more-h5", T("page-research.hypDiagTitle")));
      box.appendChild(labTable(T("page-research.hypDiagCaption"), [T("page-research.hypColEv"), T("page-research.hypColStrength"), T("page-research.hypColRatio"), T("page-research.hypColNote")],
        ev.map(function (e) {
          return [safe(e.text, 300), safe(e.strength, 30), e.ratioInfinite === true ? "∞" : (num(e.ratio) === null ? "—" : fmtNum(e.ratio, 2)), safe(e.note, 300)];
        })));
    }
    if (Array.isArray(a.warnings) && a.warnings.length) { box.appendChild(el("h5", "am-more-h5", T("page-research.hypWarnTitle"))); lines(box, a.warnings, 30); }
    if (Array.isArray(a.assumptions) && a.assumptions.length) { box.appendChild(el("h5", "am-more-h5", T("page-research.hypAssumpTitle"))); lines(box, a.assumptions, 10); }
  }

  // ---- Bilgi değeri (63) ----
  function sid(i) { return "s" + (i + 1); }
  function voiFields() {
    var f = LAB.voi;
    return {
      states: f.states.map(function (s, i) { return { id: sid(i), p: s.p }; }),
      options: f.options.map(function (o, i) {
        var pay = {};
        f.states.forEach(function (s, j) { pay[sid(j)] = o.pay[j]; });
        return { id: "o" + (i + 1), name: o.name, payoffs: pay };
      }),
      tests: f.tests.map(function (t, i) {
        var pos = {};
        f.states.forEach(function (s, j) { pos[sid(j)] = t.pos[j]; });
        return { id: "t" + (i + 1), name: t.name, cost: t.cost, positive: pos };
      })
    };
  }
  function stateName(i) { var n = LAB.voi.states[i] ? safe(LAB.voi.states[i].name, 40).trim() : ""; return n || T("page-research.voiStateN", { n: i + 1 }); }
  function voiForm(body, AM) {
    var f = LAB.voi;
    body.appendChild(el("p", "am-more-hint", T("page-research.voiNote")));
    body.appendChild(el("h5", "am-more-h5", T("page-research.voiStates")));
    f.states.forEach(function (s, i) {
      var row = el("div", "am-more-controls am-more-labrow");
      row.setAttribute("role", "group");
      row.setAttribute("aria-label", T("page-research.voiStateN", { n: i + 1 }));
      inputField(row, { key: "voi-sname-" + i, label: T("page-research.voiStateName", { n: i + 1 }), wide: true, max: 60, get: function () { return s.name; }, set: function (v) { s.name = v; } });
      inputField(row, { key: "voi-sp-" + i, label: T("page-research.voiStateP", { n: i + 1 }), numeric: true, max: 12, get: function () { return s.p; }, set: function (v) { s.p = v; } });
      if (f.states.length > 2) row.appendChild(btn(T("page-research.labRemove"), "voi-sdel-" + i, function () { f.states.splice(i, 1); f.options.forEach(function (o) { o.pay.splice(i, 1); }); f.tests.forEach(function (t) { t.pos.splice(i, 1); }); redraw(); }, true));
      body.appendChild(row);
    });
    if (f.states.length < 10) body.appendChild(btn(T("page-research.voiStateAdd"), "voi-sadd", function () { f.states.push({ name: "", p: "" }); f.options.forEach(function (o) { o.pay.push(""); }); f.tests.forEach(function (t) { t.pos.push(""); }); redraw(); }, true));
    body.appendChild(el("h5", "am-more-h5", T("page-research.voiOptions")));
    f.options.forEach(function (o, i) {
      var box = el("div", "am-more-labgroup");
      box.setAttribute("role", "group");
      box.setAttribute("aria-label", T("page-research.voiOptN", { n: i + 1 }));
      var row = el("div", "am-more-controls am-more-labrow");
      inputField(row, { key: "voi-oname-" + i, label: T("page-research.voiOptName", { n: i + 1 }), wide: true, max: 100, get: function () { return o.name; }, set: function (v) { o.name = v; } });
      if (f.options.length > 2) row.appendChild(btn(T("page-research.labRemove"), "voi-odel-" + i, function () { f.options.splice(i, 1); redraw(); }, true));
      box.appendChild(row);
      var pr = el("div", "am-more-controls am-more-labrow");
      f.states.forEach(function (s, j) {
        inputField(pr, { key: "voi-pay-" + i + "-" + j, label: T("page-research.voiPay", { s: stateName(j) }), numeric: true, max: 20, get: function () { return o.pay[j] === undefined ? "" : o.pay[j]; }, set: function (v) { o.pay[j] = v; } });
      });
      box.appendChild(pr);
      body.appendChild(box);
    });
    if (f.options.length < 10) body.appendChild(btn(T("page-research.voiOptAdd"), "voi-oadd", function () { f.options.push({ name: "", pay: f.states.map(function () { return ""; }) }); redraw(); }, true));
    body.appendChild(el("h5", "am-more-h5", T("page-research.voiTests")));
    body.appendChild(el("p", "am-more-hint", T("page-research.voiTestNote")));
    f.tests.forEach(function (t, i) {
      var box = el("div", "am-more-labgroup");
      box.setAttribute("role", "group");
      box.setAttribute("aria-label", T("page-research.voiTestN", { n: i + 1 }));
      var row = el("div", "am-more-controls am-more-labrow");
      inputField(row, { key: "voi-tname-" + i, label: T("page-research.voiTestName", { n: i + 1 }), wide: true, max: 100, get: function () { return t.name; }, set: function (v) { t.name = v; } });
      inputField(row, { key: "voi-tcost-" + i, label: T("page-research.voiTestCost", { n: i + 1 }), numeric: true, max: 20, get: function () { return t.cost; }, set: function (v) { t.cost = v; } });
      row.appendChild(btn(T("page-research.labRemove"), "voi-tdel-" + i, function () { f.tests.splice(i, 1); redraw(); }, true));
      box.appendChild(row);
      var pr = el("div", "am-more-controls am-more-labrow");
      f.states.forEach(function (s, j) {
        inputField(pr, { key: "voi-tpos-" + i + "-" + j, label: T("page-research.voiTestPos", { s: stateName(j) }), numeric: true, max: 12, get: function () { return t.pos[j] === undefined ? "" : t.pos[j]; }, set: function (v) { t.pos[j] = v; } });
      });
      box.appendChild(pr);
      body.appendChild(box);
    });
    if (f.tests.length < 5) body.appendChild(btn(T("page-research.voiTestAdd"), "voi-tadd", function () { f.tests.push({ name: "", cost: "", pos: f.states.map(function () { return ""; }) }); redraw(); }, true));
    var d = dataOf(AM, "voiResult");
    var running = !!d && d.status === "loading";
    var actions = el("div", "am-more-actions");
    actions.appendChild(btn(T("page-research.labRun"), "voi-run", function () { act("voiRun", voiFields()); }, false, running));
    body.appendChild(actions);
    resultBlock(body, d, voiResult, "page-research.voiResErr");
  }
  function voiResult(box, value) {
    var v = isObj(value.voi) ? value.voi : null;
    if (!v || !Array.isArray(v.optionValues)) { box.appendChild(stateCard("error", T("page-research.voiResErr"), T("page-research.labBad"), null)); return; }
    box.appendChild(el("h5", "am-more-h5", T("page-research.voiResTitle")));
    var names = Object.create(null);
    var best = isObj(v.bestOption) ? safe(v.bestOption.id, 30) : "";
    var evRows = v.optionValues.filter(isObj).slice(0, 10);
    evRows.forEach(function (o) { names[safe(o.id, 30)] = safe(o.name, 100); });
    box.appendChild(labTable(T("page-research.voiEvCaption"), [T("page-research.voiColOpt"), T("page-research.voiColEv"), T("page-research.voiColBest")],
      evRows.map(function (o) { return [safe(o.name, 100), fmtNum(o.expectedValue), safe(o.id, 30) === best ? chip(T("page-research.voiBest"), "ok", "check") : "—"]; })));
    box.appendChild(kvBox([[T("page-research.voiEvpi"), fmtNum(v.evpi)], [T("page-research.voiMargin"), v.margin === null ? "—" : fmtNum(v.margin)]]));
    var tests = (Array.isArray(v.tests) ? v.tests : []).filter(isObj).slice(0, 5);
    if (tests.length) {
      box.appendChild(labTable(T("page-research.voiTestCaption"), [T("page-research.voiColTest"), T("page-research.voiColEvsi"), T("page-research.voiColCost"), T("page-research.voiColNet"), T("page-research.voiColWorth")],
        tests.map(function (t) { return [safe(t.name, 100), fmtNum(t.evsi), fmtNum(t.cost), fmtNum(t.net), t.worthIt === true ? chip(T("page-research.voiWorth"), "ok", "check") : chip(T("page-research.voiNotWorth"), "muted", "info")]; })));
      tests.forEach(function (t) {
        var outs = (Array.isArray(t.outcomes) ? t.outcomes : []).filter(isObj).slice(0, 10);
        if (!outs.length) return;
        box.appendChild(el("p", "am-more-hint", T("page-research.voiOutHead", { ad: safe(t.name, 100) })));
        lines(box, outs.map(function (o) { return T("page-research.voiOutLine", { y: o.outcome === "positive" ? T("page-research.voiPositive") : o.outcome === "negative" ? T("page-research.voiNegative") : safe(o.outcome, 30), p: fmtPct(o.probability), opt: names[safe(o.bestOptionId, 30)] || safe(o.bestOptionId, 30) }); }), 10);
      });
    }
    var rec = isObj(v.recommendation) ? v.recommendation : null;
    if (rec) box.appendChild(noteLine(rec.gather === true ? "info" : "check", T("page-research.voiRec", { text: safe(rec.text, 600) })));
    if (Array.isArray(v.sensitivity) && v.sensitivity.length) { box.appendChild(el("h5", "am-more-h5", T("page-research.voiSens"))); lines(box, v.sensitivity, 10); }
    if (Array.isArray(v.assumptions) && v.assumptions.length) { box.appendChild(el("h5", "am-more-h5", T("page-research.hypAssumpTitle"))); lines(box, v.assumptions, 10); }
  }

  // ---- Çelişki çözüm önerileri (64) ----
  var RULE_LABEL = { yenilik: "page-research.resRule.yenilik", guven: "page-research.resRule.guven", tur: "page-research.resRule.tur", kaynak: "page-research.resRule.kaynak", bayatlik: "page-research.resRule.bayatlik" };
  function briefLine(b) {
    if (!isObj(b)) return T("page-research.resNoRecord");
    return safe(b.title, 160) + " · " + safe(b.kind, 30) + " · " + safe(b.scope, 40) + " · " + T("page-research.resConf", { p: fmtPct(b.confidence) });
  }
  function resSection(body, AM) {
    getBody(body, AM, "contradictionResolutions", "page-research.resLoading", "page-research.resErr", function (box, v) {
      box.appendChild(noteLine("shield", T("page-research.resOnly")));
      box.appendChild(kvBox([[T("page-research.resOpen"), String(num(v.totalOpen) === null ? "—" : num(v.totalOpen))], [T("page-research.resConsidered"), String(num(v.considered) === null ? "—" : num(v.considered))],
        [T("page-research.resSuggested"), String(num(v.suggested) === null ? "—" : num(v.suggested))], [T("page-research.resUnresolvable"), String(num(v.unresolvable) === null ? "—" : num(v.unresolvable))]]));
      if (v.truncated === true) box.appendChild(noteLine("alert", T("page-research.resCut")));
      if (v.note) box.appendChild(el("p", "am-more-hint", T("page-research.calNote", { note: safe(v.note, 600) })));
      var list = (Array.isArray(v.resolutions) ? v.resolutions : []).filter(isObj).slice(0, 50);
      if (!list.length) { box.appendChild(stateCard("empty", T("page-research.resEmpty"), T("page-research.resEmptyDetail"), null)); return; }
      var ul = el("ul", "am-more-cands");
      list.forEach(function (r) {
        var li = el("li", "am-more-cand");
        var head = el("div", "am-more-hit-h");
        var ok = r.outcome === "önerildi";
        head.appendChild(chip(ok ? T("page-research.resSuggestedChip") : T("page-research.resUnresolvableChip"), ok ? "info" : "warn", ok ? "check" : "alert"));
        head.appendChild(chip(T("page-research.resConfChip", { p: fmtPct(r.confidence) }), "muted", "info"));
        li.appendChild(head);
        if (r.detail) li.appendChild(el("p", "am-more-evid", safe(r.detail, 300)));
        var a = isObj(r.a) ? r.a : null, b = isObj(r.b) ? r.b : null;
        var keep = a && a.id === r.keep ? a : b && b.id === r.keep ? b : null;
        var retire = a && a.id === r.retire ? a : b && b.id === r.retire ? b : null;
        if (ok) {
          lines(li, [T("page-research.resKeep", { r: keep ? briefLine(keep) : safe(r.keep, 64) }), T("page-research.resRetire", { r: retire ? briefLine(retire) : safe(r.retire, 64) })], 2);
          if (r.retireAlreadyInactive === true) li.appendChild(el("p", "am-more-evid", T("page-research.resInactive")));
        } else {
          lines(li, [T("page-research.resRecA", { r: briefLine(a) }), T("page-research.resRecB", { r: briefLine(b) })], 2);
        }
        var rule = Object.prototype.hasOwnProperty.call(RULE_LABEL, r.rule) ? T(RULE_LABEL[r.rule]) : T("page-research.resRule.none");
        li.appendChild(el("p", "am-more-evid", T("page-research.resRuleLine", { kural: rule, neden: safe(r.rationale, 400) })));
        if (Array.isArray(r.dissentingRules) && r.dissentingRules.length) li.appendChild(el("p", "am-more-evid", T("page-research.resDissent", { k: r.dissentingRules.slice(0, 5).map(function (x) { return Object.prototype.hasOwnProperty.call(RULE_LABEL, x) ? T(RULE_LABEL[x]) : safe(x, 30); }).join(", ") })));
        ul.appendChild(li);
      });
      box.appendChild(ul);
    });
  }

  // ---- Bilgi yarı ömrü (66) ----
  function halfRow(g) {
    var st = g.status === "yeterli" ? chip(T("page-research.halfEnough"), "ok", "check") : g.status === "tahmin edilemedi" ? chip(T("page-research.halfNoEst"), "warn", "alert") : chip(T("page-research.halfInsufficient"), "muted", "info");
    var half = g.status === "yeterli" && num(g.halfLifeDays) !== null ? T("page-research.halfDays", { n: fmtNum(g.halfLifeDays, 1) }) : T("page-research.halfInsufficient");
    return [safe(g.kind, 40), g.scope == null ? T("page-research.halfAllScopes") : safe(g.scope, 60), String(num(g.records) === null ? "—" : num(g.records)), String(num(g.activeRecords) === null ? "—" : num(g.activeRecords)),
      num(g.medianAgeDays) === null ? "—" : fmtNum(g.medianAgeDays, 1), g.staleOrExpiredShare == null ? "—" : fmtPct(g.staleOrExpiredShare), String(num(g.sampleSize) === null ? "—" : num(g.sampleSize)), st, half, safe(g.adviceText, 300)];
  }
  function halfTable(box, caption, list) {
    var rows = (Array.isArray(list) ? list : []).filter(isObj).slice(0, 100);
    if (!rows.length) { box.appendChild(el("p", "am-more-hint", T("page-research.halfNone"))); return; }
    box.appendChild(labTable(caption, [T("page-research.halfColKind"), T("page-research.halfColScope"), T("page-research.halfColRecords"), T("page-research.halfColActive"), T("page-research.halfColAge"), T("page-research.halfColStale"), T("page-research.halfColSample"), T("page-research.halfColStatus"), T("page-research.halfColHalf"), T("page-research.halfColAdvice")], rows.map(halfRow)));
  }
  function halfSection(body, AM) {
    getBody(body, AM, "halflife", "page-research.halfLoading", "page-research.halfErr", function (box, v) {
      box.appendChild(noteLine("info", T("page-research.halfHonest", { n: String(num(v.minSample) === null ? "—" : num(v.minSample)) })));
      box.appendChild(kvBox([[T("page-research.halfRead"), String(num(v.recordsRead) === null ? "—" : num(v.recordsRead))], [T("page-research.halfBadTimes"), String(num(v.excludedBadTimes) === null ? "—" : num(v.excludedBadTimes))]]));
      if (v.readLimitReached === true) box.appendChild(noteLine("alert", T("page-research.halfLimit")));
      if (v.truncatedGroups === true) box.appendChild(noteLine("alert", T("page-research.halfCut")));
      if (v.note) box.appendChild(el("p", "am-more-hint", T("page-research.calNote", { note: safe(v.note, 600) })));
      box.appendChild(el("h5", "am-more-h5", T("page-research.halfByKind")));
      halfTable(box, T("page-research.halfByKind"), v.byKind);
      box.appendChild(el("h5", "am-more-h5", T("page-research.halfByScope")));
      halfTable(box, T("page-research.halfByScope"), v.byKindAndScope);
    });
  }

  // ---- Öğrenme getirisi (97) ----
  function learnRow(e) {
    var st = e.status === "yeterli" ? chip(T("page-research.halfEnough"), "ok", "check") : chip(T("page-research.halfInsufficient"), "muted", "info");
    var tr = e.trend === "iyileşiyor" ? T("page-research.learnTrendUp") : e.trend === "kötüleşiyor" ? T("page-research.learnTrendDown") : e.trend === "değişmiyor" ? T("page-research.learnTrendFlat") : "—";
    return [e.source == null ? T("page-research.learnAll") : safe(e.source, 60), String(num(e.resolved) === null ? "—" : num(e.resolved)), String(num(e.open) === null ? "—" : num(e.open)), String(num(e.unresolvedOverdue) === null ? "—" : num(e.unresolvedOverdue)),
      fmtDec(e.meanBrier, 3), fmtDec(e.firstHalfBrier, 3), fmtDec(e.lastHalfBrier, 3), fmtDec(e.improvement, 3), fmtDec(e.learningReturn, 3), tr, st, safe(e.note, 300)];
  }
  function learnSection(body, AM) {
    getBody(body, AM, "learning", "page-research.learnLoading", "page-research.learnErr", function (box, v) {
      box.appendChild(noteLine("info", T("page-research.learnHonest", { n: String(num(v.minResolved) === null ? "—" : num(v.minResolved)) })));
      if (v.truncated === true) box.appendChild(noteLine("alert", T("page-research.learnCut", { toplam: String(num(v.sourcesTotal) === null ? "—" : num(v.sourcesTotal)) })));
      if (v.note) box.appendChild(el("p", "am-more-hint", T("page-research.calNote", { note: safe(v.note, 600) })));
      var rows = [];
      if (isObj(v.overall)) rows.push(v.overall);
      (Array.isArray(v.sources) ? v.sources : []).filter(isObj).slice(0, 100).forEach(function (s) { rows.push(s); });
      if (!rows.length) { box.appendChild(stateCard("empty", T("page-research.learnEmpty"), T("page-research.learnEmptyDetail"), null)); return; }
      box.appendChild(labTable(T("page-research.learnCaption"), [T("page-research.learnColSource"), T("page-research.learnColResolved"), T("page-research.learnColOpen"), T("page-research.learnColOverdue"), T("page-research.learnColBrier"), T("page-research.learnColFirst"), T("page-research.learnColLast"), T("page-research.learnColImp"), T("page-research.learnColReturn"), T("page-research.learnColTrend"), T("page-research.learnColStatus"), T("page-research.learnColNote")], rows.map(learnRow)));
    });
  }

  // ---- Argüman derle (61): karar soy ağacındaki "Argüman" düğmesi ----
  function openArg(id) {
    if (!ID_RE.test(id)) return;
    LAB.argId = LAB.argId === id ? null : id;
    if (LAB.argId) ensure("argument", id, true);
    redraw();
  }
  function argButton(id, title) {
    if (!ID_RE.test(id)) return null;
    var open = LAB.argId === id;
    var b = btn(open ? T("page-research.argClose") : T("page-research.argOpen"), "arg:" + id, function () { openArg(id); }, true);
    b.setAttribute("aria-expanded", open ? "true" : "false");
    b.setAttribute("aria-label", (open ? T("page-research.argClose") : T("page-research.argOpenFor", { t: safe(title, 80) || id })));
    return b;
  }
  var VERDICT_TONE = { "güvenilir": ["ok", "check"], "gözden geçir": ["warn", "alert"], "zayıf": ["bad", "alert"] };
  var SEV_TONE = { high: "bad", medium: "warn", low: "muted" };
  function argBlock(AM, id) {
    var box = el("div", "am-more-chain am-more-arg");
    box.setAttribute("id", "am-lab-arg");
    box.appendChild(el("h4", "am-more-h4", T("page-research.argTitle")));
    box.appendChild(noteLine("shield", T("page-research.argOnly")));
    var d = dataOf(AM, "argument:" + id);
    var retry = function () { ensure("argument", id, true); redraw(); };
    if (!d || d.status === "loading") { box.appendChild(stateCard("loading", T("page-research.argLoading"))); return box; }
    if (d.status === "error") { box.appendChild(stateCard("error", T("page-research.argErr"), T("page-research.genErrDetail", { reason: safe(d.reason, 200) || "?" }), retry)); return box; }
    var a = isObj(d.value) && isObj(d.value.argument) ? d.value.argument : null;
    if (!a) { box.appendChild(stateCard("error", T("page-research.argErr"), T("page-research.labBad"), retry)); return box; }
    var vt = Object.prototype.hasOwnProperty.call(VERDICT_TONE, a.verdict) ? VERDICT_TONE[a.verdict] : ["muted", "info"];
    var head = el("div", "am-more-hit-h");
    head.appendChild(chip(T("page-research.argVerdict", { v: Object.prototype.hasOwnProperty.call(VERDICT_TONE, a.verdict) ? a.verdict : T("page-research.genState.unknown") }), vt[0], vt[1]));
    box.appendChild(head);
    box.appendChild(el("p", "am-more-hit-t", T("page-research.argClaim", { t: safe(a.claim, 400) })));
    box.appendChild(facts([T("page-research.argScope", { t: safe(a.scope, 60) }), T("page-research.argStatus", { t: safe(a.status, 40) }), T("page-research.genNodeDecided", { t: fmtDate(a.decidedAt) }), T("page-research.genNodeExpires", { t: fmtDate(a.expiresAt) })]));
    function block(titleKey, list, fn) {
      var items = (Array.isArray(list) ? list : []).slice(0, 30);
      box.appendChild(el("h5", "am-more-h5", T(titleKey)));
      if (!items.length) { box.appendChild(el("p", "am-more-hint", T("page-research.argNone"))); return; }
      lines(box, items.map(fn), 30);
    }
    block("page-research.argReasons", a.verdictReasons, function (x) { return safe(x, 300); });
    block("page-research.argGrounds", a.grounds, function (x) { return safe(x, 400); });
    block("page-research.argAssumptions", a.assumptions, function (x) { x = isObj(x) ? x : {}; return safe(x.text, 300) + " — " + safe(x.status, 40) + (x.checkBy ? " · " + T("page-research.argCheckBy", { t: fmtDate(x.checkBy) }) : ""); });
    box.appendChild(el("h5", "am-more-h5", T("page-research.argRisks")));
    var risks = (Array.isArray(a.risks) ? a.risks : []).filter(isObj).slice(0, 30);
    if (!risks.length) box.appendChild(el("p", "am-more-hint", T("page-research.argNone")));
    risks.forEach(function (r) {
      var p = el("p", "am-more-evid");
      p.appendChild(chip(T("page-research.argSev." + (SEV_TONE[r.severity] ? r.severity : "low")), SEV_TONE[r.severity] || "muted", "alert"));
      p.appendChild(el("span", "am-more-chip-t", safe(r.kind, 60) + ": " + safe(r.text, 300)));
      box.appendChild(p);
    });
    block("page-research.argCounter", a.counterpoints, function (x) { x = isObj(x) ? x : {}; return safe(x.title, 200) + " (" + fmtDate(x.decidedAt) + ") — " + safe(x.rationale, 300) + (Array.isArray(x.brokenAssumptions) && x.brokenAssumptions.length ? " · " + T("page-research.argBroken", { n: x.brokenAssumptions.length }) : ""); });
    block("page-research.argLinked", a.linkedMemory, function (x) { x = isObj(x) ? x : {}; return safe(x.title, 160) + " · " + safe(x.kind, 30) + " · " + fmtPct(x.confidence); });
    if (a.maskedSecrets === true) box.appendChild(noteLine("shield", T("page-research.argMasked")));
    if (typeof a.markdown === "string" && a.markdown) {
      box.appendChild(el("h5", "am-more-h5", T("page-research.argMarkdown")));
      var pre = el("pre", "am-more-textblock", safeBlock(a.markdown, 60000));
      pre.setAttribute("tabindex", "0");
      pre.setAttribute("aria-label", T("page-research.argMarkdown"));
      box.appendChild(pre);
    }
    return box;
  }
  function safeBlock(v, max) {
    var s = typeof v === "string" ? v : v == null ? "" : String(v);
    s = s.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, " ").replace(SECRET_RE, "[gizli]");
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  }

  // ================================================================ D8c: Model yetenekleri (81, 82, 84, 85, 65, 92)
  // Kart başına tembel yükleme: kart açılınca GET /api/capabilities/model istenir. Çalıştırma AM.actions.modelRun'dır (onay penceresi çekirdekte). Çıktı güvenilmez veri: yalnız textContent, maskeli.
  var MOD = { vals: Object.create(null), prov: Object.create(null) };
  var MODEL_SLUG_RE = /^[a-z][a-z-]{1,30}$/;
  var MODEL_FIELD_RE = /^[A-Za-z][A-Za-z0-9]{0,30}$/;
  var MODEL_LIKE = { low: "muted", medium: "warn", high: "bad" };

  function mtext(v, max) { return safeBlock(v, max || 800); }
  function marr(v) { return Array.isArray(v) ? v : []; }
  function modelEntries() {
    var cat = Array.isArray(window.AM_CAPABILITIES) ? window.AM_CAPABILITIES : [];
    return cat.filter(function (c) { return c && c.tur === "model" && MODEL_SLUG_RE.test(String(c.modelId)) && typeof c.bolum === "string"; });
  }
  function serverItem(AM, slug) {
    var d = dataOf(AM, "modelCapabilities");
    var list = d && d.status === "ok" && isObj(d.value) && Array.isArray(d.value.capabilities) ? d.value.capabilities : [];
    for (var i = 0; i < list.length; i += 1) if (isObj(list[i]) && list[i].id === slug) return list[i];
    return null;
  }
  function itemAvail(it) {
    var a = isObj(it.availability) ? it.availability : null;
    if (a && typeof a.available === "boolean") return { ok: a.available, reason: mtext(a.reason, 200) };
    return { ok: it.available === true, reason: mtext(it.reason, 200) };
  }
  function itemSpecs(it) {
    return marr(it.fields).filter(function (f) { return isObj(f) && MODEL_FIELD_RE.test(String(f.name)) && (f.kind === "text" || f.kind === "list" || f.kind === "number") && num(f.maxLength) > 0; })
      .map(function (f) { return { name: f.name, label: mtext(f.label || f.name, 80), kind: f.kind, required: f.required === true, max: num(f.maxLength), maxItems: num(f.maxItems) || 10 }; });
  }
  function anyModelRunning(AM) {
    var data = AM && AM.state && AM.state.data ? AM.state.data : {};
    return Object.keys(data).some(function (k) { return k.indexOf("modelRun:") === 0 && data[k] && data[k].status === "loading"; });
  }
  function areaField(parent, o) {
    LAB.uid += 1;
    var id = "am-lab-f" + LAB.uid;
    var lab = el("label", "am-more-field am-more-field--grow am-more-field--full");
    lab.setAttribute("for", id);
    lab.appendChild(el("span", "am-more-field-l", o.label));
    var c = el("textarea", "am-more-input am-more-textarea");
    c.rows = o.rows || 5;
    c.setAttribute("id", id);
    c.setAttribute("data-am-key", o.key);
    c.setAttribute("autocomplete", "off");
    if (o.max) c.setAttribute("maxlength", String(o.max));
    c.value = o.get();
    var count = el("span", "am-more-hint am-more-count", o.count(c.value));
    var take = function () { o.set(String(c.value)); count.textContent = o.count(String(c.value)); };
    c.addEventListener("input", function (ev) { if (ev && ev.isComposing) return; take(); });
    c.addEventListener("compositionend", take);
    lab.appendChild(c);
    if (o.hint) lab.appendChild(el("span", "am-more-hint", o.hint));
    lab.appendChild(count);
    parent.appendChild(lab);
    return c;
  }
  function provOptions(AM) {
    var opts = [["auto", T("page-research.modelProviderAuto")]];
    var list = AM && AM.state && Array.isArray(AM.state.providers) ? AM.state.providers : [];
    list.forEach(function (p) {
      if (!isObj(p) || typeof p.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(p.id) || p.routeKind === "api_paid") return;
      opts.push([p.id, mtext(p.displayName || p.id, 80)]);
    });
    return opts;
  }
  function mlist(items) {
    var ul = el("ul", "am-more-facts");
    var a = marr(items).slice(0, 12);
    if (!a.length) ul.appendChild(el("li", "am-more-fact", T("page-research.modelEmpty")));
    a.forEach(function (t) { ul.appendChild(el("li", "am-more-fact", mtext(t, 400))); });
    return ul;
  }
  function mlines(box, titleKey, items) {
    box.appendChild(el("h5", "am-more-h5", T(titleKey)));
    box.appendChild(mlist(items));
  }
  function mpara(box, titleKey, text) {
    box.appendChild(el("h5", "am-more-h5", T(titleKey)));
    box.appendChild(el("p", "am-more-p am-more-modeltext", mtext(text, 1500)));
  }

  var MODEL_VIEWS = {
    "solution-space": function (box, r) {
      var fam = marr(r.families);
      if (!fam.length) throw new Error("families");
      box.appendChild(el("h5", "am-more-h5", T("page-research.modelFamilies")));
      box.appendChild(labTable(T("page-research.modelFamilies"), [T("page-research.modelColFamily"), T("page-research.modelColIdea"), T("page-research.modelColPros"), T("page-research.modelColCons"), T("page-research.modelColAssump")],
        fam.map(function (f) { f = isObj(f) ? f : {}; return [mtext(f.name, 120), mtext(f.idea, 800), mlist(f.pros), mlist(f.cons), mlist(f.assumptions)]; })));
      mlines(box, "page-research.modelTradeoffs", r.tradeoffs);
      mpara(box, "page-research.modelNext", r.recommendedNext);
    },
    "idea-transfer": function (box, r) {
      var tr = marr(r.transfers);
      if (!tr.length) throw new Error("transfers");
      box.appendChild(el("h5", "am-more-h5", T("page-research.modelTransfers")));
      box.appendChild(labTable(T("page-research.modelTransfers"), [T("page-research.modelColDiscipline"), T("page-research.modelColConcept"), T("page-research.modelColMapping"), T("page-research.modelColRisks")],
        tr.map(function (t) { t = isObj(t) ? t : {}; return [mtext(t.discipline, 120), mtext(t.concept, 400), mtext(t.mapping, 800), mlist(t.risks)]; })));
    },
    "inversion": function (box, r) {
      var inv = marr(r.inversions);
      if (!inv.length) throw new Error("inversions");
      box.appendChild(el("h5", "am-more-h5", T("page-research.modelInversions")));
      box.appendChild(labTable(T("page-research.modelInversions"), [T("page-research.modelColFailure"), T("page-research.modelColWhy"), T("page-research.modelColPrevent")],
        inv.map(function (i) { i = isObj(i) ? i : {}; return [mtext(i.failureMode, 300), mtext(i.whyItHappens, 600), mlist(i.preventions)]; })));
      mpara(box, "page-research.modelPremortem", r.premortem);
    },
    "emergence": function (box, r) {
      var bh = marr(r.behaviors);
      if (!bh.length) throw new Error("behaviors");
      box.appendChild(el("h5", "am-more-h5", T("page-research.modelBehaviors")));
      box.appendChild(labTable(T("page-research.modelBehaviors"), [T("page-research.modelColBehavior"), T("page-research.modelColTrigger"), T("page-research.modelColLikelihood"), T("page-research.modelColMitigation")],
        bh.map(function (b) {
          b = isObj(b) ? b : {};
          var lk = Object.prototype.hasOwnProperty.call(MODEL_LIKE, b.likelihood) ? b.likelihood : "unknown";
          return [mtext(b.description, 600), mtext(b.trigger, 400), chip(T("page-research.modelLik." + lk), MODEL_LIKE[lk] || "muted"), mtext(b.mitigation, 500)];
        })));
    },
    "multi-horizon": function (box, r) {
      var hz = marr(r.horizons);
      if (!hz.length) throw new Error("horizons");
      box.appendChild(el("h5", "am-more-h5", T("page-research.modelHorizons")));
      hz.forEach(function (h) {
        h = isObj(h) ? h : {};
        var card = el("div", "am-more-labgroup");
        card.setAttribute("role", "group");
        card.setAttribute("aria-label", mtext(h.name, 80));
        card.appendChild(el("h5", "am-more-h5", mtext(h.name, 80)));
        [["modelObjectives", h.objectives], ["modelHRisks", h.risks], ["modelDepends", h.dependsOn]].forEach(function (p) { card.appendChild(el("h6", "am-more-h6", T("page-research." + p[0]))); card.appendChild(mlist(p[1])); });
        box.appendChild(card);
      });
      mlines(box, "page-research.modelNotes", r.consistencyNotes);
    },
    "intent": function (box, r, AM) {
      var id = typeof r.intent === "string" ? r.intent : "none";
      box.appendChild(el("h5", "am-more-h5", T("page-research.modelIntentTitle")));
      var entry = null;
      if (id !== "none") {
        var cat = Array.isArray(window.AM_CAPABILITIES) ? window.AM_CAPABILITIES : [];
        var m = /^madde-([0-9]{1,3})$/.exec(id);
        for (var i = 0; i < cat.length; i += 1) {
          var c = cat[i];
          if (c && ((m && c.id === Number(m[1])) || (!m && c.modelId === id))) { entry = c; break; }
        }
      }
      if (id === "none") box.appendChild(el("p", "am-more-p", T("page-research.modelIntentNone")));
      else box.appendChild(el("p", "am-more-p am-more-modeltext", entry ? mtext(entry.ad, 120) + " (" + mtext(id, 40) + ")" : mtext(id, 60)));
      var params = isObj(r.params) ? r.params : {};
      var keys = Object.keys(params).slice(0, 6);
      box.appendChild(el("h5", "am-more-h5", T("page-research.modelIntentParams")));
      if (!keys.length) box.appendChild(el("p", "am-more-hint", T("page-research.modelIntentNoParams")));
      else box.appendChild(kvBox(keys.map(function (k) { return [mtext(k, 40), mtext(String(params[k]), 200)]; })));
      mpara(box, "page-research.modelIntentWhy", r.explanation);
      box.appendChild(el("p", "am-more-hint", T("page-research.modelIntentOnly")));
      if (id !== "none") {
        // YALNIZ gezinir (AM.actions.openCapability): hiçbir yeteneği kendiliğinden çalıştırmaz (ADR-016).
        if (entry) box.appendChild(btn(T("page-research.modelIntentOpen", { ad: mtext(entry.ad, 80) }), "model-intent-open", function () { act("openCapability", entry.id); }, true));
        else box.appendChild(el("p", "am-more-hint", T("page-research.modelIntentUnknown", { id: mtext(id, 60) })));
      }
    }
  };

  // ---- İnternetli yetenekler (37, 38, 40): kaynak tablosu, alıntı doğrulama rozetleri, kaynaksız mod bandı. Kaynak adresleri BAĞLANTI DEĞİL düz metindir (kopyalanabilir). ----
  var NET_SLUGS = ["research-center", "feature-discovery", "competitor-research"];
  var SRC_ERR = { approval_required: 1, redirect_needs_approval: 1, total_limit: 1, host_not_allowed: 1, net_disabled: 1, invalid_url: 1, rate_limited: 1, scheme_not_allowed: 1, port_not_allowed: 1, ip_literal: 1, url_too_long: 1, credentials_in_url: 1, secret_in_url: 1, timeout: 1, too_large: 1, unsupported_content: 1, fetch_failed: 1, blocked_address: 1 };
  function srcHost(u) { var m = /^https?:[\/][\/]([^\/?#:@]+)/i.exec(String(u)); return m ? m[1].toLowerCase() : ""; }
  function srcErrText(code) {
    var c = typeof code === "string" ? code : "";
    if (c === "") return "—";
    if (Object.prototype.hasOwnProperty.call(SRC_ERR, c)) return T("page-research.srcErr." + c);
    return T("page-research.srcErr.other", { kod: /^[a-z0-9_]{1,40}$/.test(c) ? c : "?" });
  }
  function shortHash(h) { return typeof h === "string" && /^[0-9a-f]{16,128}$/i.test(h) ? h.slice(0, 12) : "—"; }
  function srcDate(v) { var s = mtext(v, 40); return s ? s.replace("T", " ").replace(/\.\d+Z?$|Z$/, "") : "—"; }
  function sourcesTable(box, sources) {
    var list = marr(sources).filter(isObj).slice(0, 5);
    box.appendChild(el("h5", "am-more-h5", T("page-research.srcTitle")));
    if (!list.length) { box.appendChild(el("p", "am-more-hint", T("page-research.srcNone"))); return; }
    box.appendChild(labTable(T("page-research.srcTitle"), [T("page-research.srcColNo"), T("page-research.srcColUrl"), T("page-research.srcColDate"), T("page-research.srcColStatus"), T("page-research.srcColBytes"), T("page-research.srcColHash"), T("page-research.srcColErr")],
      list.map(function (s) {
        var cell = el("div", "am-more-srccell");
        // Sunucu yeniden başlayınca yanıt tam adres yerine yalnız alan adı + yol özeti (pathSha256) taşıyabilir.
        var hasUrl = typeof s.url === "string" && s.url !== "";
        cell.appendChild(el("strong", "am-more-srchost", (hasUrl ? srcHost(s.url) : mtext(s.host, 100)) || "—"));
        cell.appendChild(el("span", "am-more-srcurl", hasUrl ? mtext(s.url, 600) : T("page-research.srcPathDigest", { ozet: shortHash(s.pathSha256) })));
        var st = num(s.status), by = num(s.bytes);
        return [String(num(s.index) === null ? "?" : num(s.index)), cell, srcDate(s.fetchedAt), st === null ? "—" : String(Math.floor(st)) + (s.truncated === true ? " · " + T("page-research.srcTruncated") : ""), by === null ? "—" : fmtNum(by, 0), shortHash(s.sha256), srcErrText(s.error)];
      })));
  }
  // Sunucu kuralı: true = alıntı kaynakta AYNEN ve cümle sonuna kadar geçiyor (iddianın doğruluğunu GARANTİ ETMEZ); false + neden notu; null = kaynaksız.
  function verifyReason(it) {
    var n = typeof it.note === "string" ? it.note : "";
    if (n.indexOf("yalnız bir kısmı") >= 0) return "partial";
    if (n.indexOf("çok kısa") >= 0) return "short";
    if (n.indexOf("bulunamadı") >= 0) return "notFound";
    if (n.indexOf("alıntı verilmedi") >= 0) return "noQuote";
    return typeof it.quote === "string" && it.quote !== "" ? "notFound" : "noQuote";
  }
  function verifyChip(it) {
    var si = num(it.sourceIndex);
    var w = el("div", "am-more-srccell");
    if (it.verified === true) { w.appendChild(chip(T("page-research.verOk"), "ok", "check")); w.appendChild(el("span", "am-more-hint", T("page-research.verOkNote"))); }
    else if (it.verified === false) w.appendChild(chip(T("page-research.verBad." + verifyReason(it)), "bad", "alert"));
    else w.appendChild(chip(si === null ? T("page-research.verNone") : T("page-research.verNoQuote"), "muted"));
    return w;
  }
  function attrCell(it) {
    var cell = el("div", "am-more-srccell");
    var si = num(it.sourceIndex);
    cell.appendChild(el("strong", "am-more-srchost", si === null ? T("page-research.attrNone") : T("page-research.attrSource", { n: Math.floor(si) })));
    if (typeof it.quote === "string" && it.quote !== "") cell.appendChild(el("span", "am-more-quote", "“" + mtext(it.quote, 600) + "”"));
    return cell;
  }
  function netPreamble(box, r) {
    if (r.sourceless === true) {
      var w = el("div", "am-more-note am-more-sourceless");
      w.setAttribute("role", "status");
      w.appendChild(chip(T("page-research.sourcelessChip"), "warn", "alert"));
      w.appendChild(el("span", "am-more-note-t", mtext(r.warning, 400) || T("page-research.sourcelessText")));
      box.appendChild(w);
    }
    var vm = mtext(r.verifiedMeaning, 700);
    if (vm) box.appendChild(el("p", "am-more-hint", T("page-research.verMeaning", { metin: vm })));
    var uc = num(r.unverifiedCount);
    if (uc !== null && uc > 0) box.appendChild(noteLine("alert", T("page-research.unverified", { n: Math.floor(uc) })));
    sourcesTable(box, r.sources);
  }
  function lvl(v) { return Object.prototype.hasOwnProperty.call(MODEL_LIKE, v) ? T("page-research.modelLik." + v) : T("page-research.modelLik.unknown"); }
  function lvlChip(v) { return chip(lvl(v), Object.prototype.hasOwnProperty.call(MODEL_LIKE, v) ? MODEL_LIKE[v] : "muted"); }
  MODEL_VIEWS["research-center"] = function (box, r) {
    var f = marr(r.findings);
    if (!f.length) throw new Error("findings");
    netPreamble(box, r);
    mpara(box, "page-research.rcSummary", r.summary);
    box.appendChild(el("h5", "am-more-h5", T("page-research.rcFindings")));
    box.appendChild(labTable(T("page-research.rcFindings"), [T("page-research.rcColClaim"), T("page-research.attrCol"), T("page-research.rcColConf"), T("page-research.verCol")],
      f.map(function (x) { x = isObj(x) ? x : {}; return [mtext(x.claim, 600), attrCell(x), lvlChip(x.confidence), verifyChip(x)]; })));
    mlines(box, "page-research.rcGaps", r.gaps);
    mlines(box, "page-research.rcFollow", r.followUps);
  };
  MODEL_VIEWS["feature-discovery"] = function (box, r) {
    var f = marr(r.features);
    if (!f.length) throw new Error("features");
    netPreamble(box, r);
    box.appendChild(el("h5", "am-more-h5", T("page-research.fdFeatures")));
    box.appendChild(labTable(T("page-research.fdFeatures"), [T("page-research.fdColName"), T("page-research.fdColWhy"), T("page-research.fdColPri"), T("page-research.fdColEffort"), T("page-research.attrCol"), T("page-research.verCol")],
      f.map(function (x) {
        x = isObj(x) ? x : {};
        var ef = x.effort === "S" || x.effort === "M" || x.effort === "L" ? T("page-research.fdEffort." + x.effort) : "—";
        return [mtext(x.name, 120), mtext(x.rationale, 600), lvlChip(x.priority), ef, attrCell(x), verifyChip(x)];
      })));
    mlines(box, "page-research.fdRisks", r.risks);
  };
  MODEL_VIEWS["competitor-research"] = function (box, r) {
    var e = marr(r.entities);
    if (!e.length) throw new Error("entities");
    netPreamble(box, r);
    box.appendChild(el("h5", "am-more-h5", T("page-research.crEntities")));
    box.appendChild(labTable(T("page-research.crEntities"), [T("page-research.crColName"), T("page-research.crColStr"), T("page-research.crColWeak"), T("page-research.attrCol"), T("page-research.verCol")],
      e.map(function (x) { x = isObj(x) ? x : {}; return [mtext(x.name, 120), mlist(x.strengths), mlist(x.weaknesses), attrCell(x), verifyChip(x)]; })));
    var cmp = marr(r.comparison);
    if (cmp.length) {
      box.appendChild(el("h5", "am-more-h5", T("page-research.crCompare")));
      box.appendChild(labTable(T("page-research.crCompare"), [T("page-research.crColCrit"), T("page-research.crColNotes")], cmp.map(function (c) { c = isObj(c) ? c : {}; return [mtext(c.criterion, 120), mtext(c.notes, 600)]; })));
    }
    mlines(box, "page-research.crGaps", r.gaps);
  };

  // ---- Müzakere (75): tur tur yazışma, sonuç rozeti, ÖNERİ; kısmi (yarıda kesilmiş) sonuçta belirgin bant ----
  var STANCE_TONE = { agree: "ok", partial: "warn", disagree: "bad" };
  var STATUS_TONE = { consensus: "ok", partial: "warn", disagreement: "bad" };
  function kvLine(card, text) { card.appendChild(el("p", "am-more-p am-more-modeltext", mtext(text, 900))); }
  function negoProposal(card, p, idKey) {
    p = isObj(p) ? p : {};
    kvLine(card, T("page-research.negoProposal", { id: mtext(p.id || idKey || "", 20), t: mtext(p.summary, 600) }));
    if (marr(p.pros).length) { card.appendChild(el("h6", "am-more-h6", T("page-research.negoPros"))); card.appendChild(mlist(p.pros)); }
    if (marr(p.cons).length) { card.appendChild(el("h6", "am-more-h6", T("page-research.negoCons"))); card.appendChild(mlist(p.cons)); }
  }
  function negoStepBody(card, step, c) {
    c = isObj(c) ? c : {};
    if (step === "propose") {
      kvLine(card, T("page-research.negoPosition", { t: mtext(c.position, 600) }));
      marr(c.proposals).slice(0, 4).forEach(function (p) { negoProposal(card, p); });
    } else if (step === "critique") {
      marr(c.critiques).slice(0, 8).forEach(function (x) {
        x = isObj(x) ? x : {};
        var sev = Object.prototype.hasOwnProperty.call(MODEL_LIKE, x.severity) ? x.severity : "";
        kvLine(card, T("page-research.negoCritique", { id: mtext(x.proposalId, 20), sev: sev ? T("page-research.negoSev." + sev) : "?", t: mtext(x.objection, 600) }));
        kvLine(card, T("page-research.negoSuggest", { t: mtext(x.suggestion, 600) }));
      });
      if (isObj(c.counterProposal)) kvLine(card, T("page-research.negoCounter", { t: mtext(c.counterProposal.summary, 600) }));
    } else if (step === "revise") {
      marr(c.revisions).slice(0, 8).forEach(function (x) {
        x = isObj(x) ? x : {};
        kvLine(card, T("page-research.negoRevision", { id: mtext(x.proposalId, 20), t: mtext(x.change, 600) }));
        kvLine(card, T("page-research.negoAnswers", { t: mtext(x.answersCritique, 600) }));
      });
      kvLine(card, T("page-research.negoStance", { t: mtext(c.stance, 400) }));
    } else if (step === "final") {
      var st = Object.prototype.hasOwnProperty.call(STANCE_TONE, c.stance) ? c.stance : "";
      var h = el("p", "am-more-p");
      h.appendChild(chip(st ? T("page-research.negoStance." + st) : T("page-research.modelLik.unknown"), st ? STANCE_TONE[st] : "muted"));
      card.appendChild(h);
      if (marr(c.agreedPoints).length) { card.appendChild(el("h6", "am-more-h6", T("page-research.negoAgreed"))); card.appendChild(mlist(c.agreedPoints)); }
      if (marr(c.remainingIssues).length) { card.appendChild(el("h6", "am-more-h6", T("page-research.negoOpen"))); card.appendChild(mlist(c.remainingIssues)); }
      kvLine(card, mtext(c.recommendation, 800));
    }
  }
  MODEL_VIEWS["negotiation"] = function (box, r, AM, value) {
    var tr = marr(r.transcript);
    if (r.partial === true) {
      var done = num(r.completedSteps);
      var band = el("div", "am-more-note am-more-sourceless");
      band.setAttribute("role", "alert");
      band.appendChild(chip(T("page-research.negoPartial", { n: done === null ? tr.length : Math.floor(done) }), "bad", "alert"));
      if (value && value.failure) band.appendChild(el("span", "am-more-note-t", T("page-research.negoPartialWhy", { t: mtext(value.failure, 300) })));
      box.appendChild(band);
    } else if (!tr.length || !isObj(r.outcome)) throw new Error("transcript");
    var pv = isObj(r.providers) ? r.providers : {};
    var rounds = num(r.rounds);
    box.appendChild(el("p", "am-more-hint", T("page-research.negoProviders", { a: mtext(pv.A, 60) || "?", b: mtext(pv.B, 60) || "?", n: rounds === null ? "?" : Math.floor(rounds) })));
    box.appendChild(el("h5", "am-more-h5", T("page-research.negoTranscript")));
    tr.slice(0, 4).forEach(function (t) {
      t = isObj(t) ? t : {};
      var step = ["propose", "critique", "revise", "final"].indexOf(t.step) >= 0 ? t.step : "propose";
      var card = el("div", "am-more-labgroup");
      card.setAttribute("role", "group");
      var title = T("page-research.negoRound", { n: num(t.round) === null ? "?" : Math.floor(num(t.round)) }) + " · " + (t.role === "B" ? T("page-research.negoRoleB") : T("page-research.negoRoleA")) + " · " + mtext(t.providerId, 60) + " · " + T("page-research.negoStep." + step);
      card.setAttribute("aria-label", title);
      card.appendChild(el("h6", "am-more-h6", title));
      negoStepBody(card, step, t.content);
      box.appendChild(card);
    });
    if (r.partial === true || !isObj(r.outcome)) return;
    var oc = r.outcome;
    box.appendChild(el("h5", "am-more-h5", T("page-research.negoOutcome")));
    var stt = Object.prototype.hasOwnProperty.call(STATUS_TONE, oc.status) ? oc.status : "";
    var line = el("p", "am-more-p");
    line.appendChild(chip(stt ? T("page-research.negoStatus." + stt) : T("page-research.modelLik.unknown"), stt ? STATUS_TONE[stt] : "muted"));
    var cf = oc.confidence === "low" || oc.confidence === "medium" ? oc.confidence : "";
    if (cf) line.appendChild(chip(T("page-research.negoConf", { t: T(cf === "low" ? "page-research.negoConf.low" : "page-research.negoConf.medium") }), cf === "low" ? "warn" : "muted"));
    box.appendChild(line);
    if (rounds === 1) box.appendChild(noteLine("alert", T("page-research.negoSingle")));
    mlines(box, "page-research.negoAgreed", oc.agreedPoints);
    mlines(box, "page-research.negoOpen", oc.openIssues);
    box.appendChild(el("h5", "am-more-h5", T("page-research.negoRec")));
    box.appendChild(el("p", "am-more-p am-more-modeltext", mtext(oc.recommendation, 900)));
    if (oc.recommendationSource) box.appendChild(el("p", "am-more-hint", T("page-research.negoSource", { t: mtext(oc.recommendationSource, 120) })));
    box.appendChild(el("p", "am-more-hint", mtext(r.note, 300) || T("page-research.negoRecNote")));
  };

  function modelResult(box, slug, value, AM) {
    var head = el("div", "am-more-modelhead");
    head.appendChild(chip(T("page-research.modelUntrusted"), "warn", "alert"));
    head.appendChild(el("span", "am-more-modelprov", T("page-research.modelProvider", { ad: mtext(value.providerId, 60) || "?" })));
    box.appendChild(head);
    box.appendChild(el("p", "am-more-hint", T("page-research.modelNotSaved")));
    var w = marr(value.warnings);
    if (w.length) { box.appendChild(el("h5", "am-more-h5", T("page-research.modelWarnTitle"))); box.appendChild(mlist(w)); }
    var view = Object.prototype.hasOwnProperty.call(MODEL_VIEWS, slug) ? MODEL_VIEWS[slug] : null;
    if (!view || !isObj(value.result)) { box.appendChild(stateCard("error", T("page-research.modelResErr"), T("page-research.modelBadShape"), null)); return; }
    try { view(box, value.result, AM, value); } catch (e) { box.appendChild(stateCard("error", T("page-research.modelResErr"), T("page-research.modelBadShape"), null)); }
  }

  // İnternetli yetenek: internet durumu (sunucu listesindeki net, yoksa netSettings) ve Ayarlar'a gitme düğmesi.
  function netBand(body, AM, item) {
    var on = null, domains = [];
    var n = isObj(item.net) ? item.net : null;
    if (n && typeof n.enabled === "boolean") { on = n.enabled; domains = marr(n.allowedDomains); }
    else {
      var d = dataOf(AM, "netSettings");
      var st = d && d.status === "ok" && isObj(d.value) && isObj(d.value.settings) ? d.value.settings : null;
      if (st) { on = st.enabled === true; domains = marr(st.allowedDomains); }
    }
    if (on === null) return;
    var list = domains.filter(function (x) { return typeof x === "string"; }).slice(0, 50).map(function (x) { return mtext(x, 100); });
    var box = el("div", "am-more-netband");
    box.appendChild(stateCard("empty", T(on ? "page-research.netOnTitle" : "page-research.netOffTitle"), on ? T("page-research.netOnDetail", { liste: list.length ? list.join(", ") : T("page-research.netOnNone") }) : T("page-research.netOffDetail"), null));
    box.appendChild(btn(T("page-research.netOpenSettings"), "net-open-settings", function () { act("openSettings", "internet"); }, true));
    body.appendChild(box);
  }
  function negoSame(vals) { var a = vals.providerA, b = vals.providerB; return !!a && !!b && a !== "auto" && b !== "auto" && a === b; }
  function negoSelect(body, AM, sp, vals, slug) {
    var row = el("div", "am-more-controls");
    var opts = sp.name === "rounds" ? [["2", T("page-research.negoRounds2")], ["1", T("page-research.negoRounds1")]] : provOptions(AM);
    inputField(row, { key: "model-" + slug + "-" + sp.name, label: sp.label, options: opts, get: function () { return typeof vals[sp.name] === "string" && vals[sp.name] ? vals[sp.name] : opts[0][0]; }, set: function (v) { vals[sp.name] = v; if (sp.name !== "rounds") redraw(); } });
    body.appendChild(row);
  }
  function modelCard(body, AM, entry) {
    var slug = entry.modelId;
    ensure("modelCapabilities");
    if (NET_SLUGS.indexOf(slug) >= 0) ensure("netSettings");
    var d = dataOf(AM, "modelCapabilities");
    if (!d || d.status === "loading") { body.appendChild(stateCard("loading", T("page-research.modelLoading"))); return; }
    var retry = function () { ensure("modelCapabilities", undefined, true); redraw(); };
    if (d.status === "error") { body.appendChild(stateCard("error", T("page-research.modelErr"), T("page-research.genErrDetail", { reason: safe(d.reason, 200) || "?" }), retry)); return; }
    var item = serverItem(AM, slug);
    if (!item) { body.appendChild(stateCard("error", T("page-research.modelMissing"), T("page-research.modelMissingDetail"), retry)); return; }
    var av = itemAvail(item);
    if (!av.ok) body.appendChild(stateCard("empty", T("page-research.modelUnavail", { neden: av.reason || T("page-research.modelNoReason") }), T("page-research.modelUnavailDetail"), null));
    var specs = itemSpecs(item);
    if (item.needsNet === true) netBand(body, AM, item);
    var vals = MOD.vals[slug] || (MOD.vals[slug] = Object.create(null));
    var nego = slug === "negotiation";
    if (nego) body.appendChild(el("p", "am-more-hint", T("page-research.negoNeedTwo")));
    specs.forEach(function (sp) {
      if (nego && (sp.name === "rounds" || sp.name === "providerA" || sp.name === "providerB")) { negoSelect(body, AM, sp, vals, slug); return; }
      var isUrls = sp.name === "urls" && sp.kind === "list";
      var label = isUrls ? T("page-research.urlsLabel") : sp.label + (sp.required ? "" : " " + T("page-research.modelOptional"));
      areaField(body, {
        key: "model-" + slug + "-" + sp.name, label: label, rows: sp.kind === "list" ? 3 : 6, max: sp.kind === "text" ? sp.max : 0,
        hint: isUrls ? T("page-research.urlsHint", { max: sp.maxItems }) : sp.kind === "list" ? T("page-research.modelListHint", { max: sp.maxItems, len: sp.max }) : "",
        get: function () { return typeof vals[sp.name] === "string" ? vals[sp.name] : ""; },
        set: function (v) { vals[sp.name] = v; },
        count: function (v) {
          if (sp.kind === "text") return T("page-research.modelCount", { n: v.length, max: sp.max });
          var rows = v.split("\n").filter(function (x) { return x.trim() !== ""; });
          if (isUrls) return T("page-research.urlsCount", { n: rows.length, max: sp.maxItems });
          return T("page-research.modelCountList", { n: rows.length, max: sp.maxItems, c: rows.join("").length });
        }
      });
    });
    var pr = el("div", "am-more-controls");
    if (nego && negoSame(vals)) body.appendChild(noteLine("alert", T("page-research.negoSame")));
    if (!nego) inputField(pr, { key: "model-" + slug + "-provider", label: T("page-research.modelProviderLabel"), options: provOptions(AM), get: function () { return MOD.prov[slug] || "auto"; }, set: function (v) { MOD.prov[slug] = v; } });
    body.appendChild(pr);
    body.appendChild(el("p", "am-more-hint", T("page-research.modelTotalHint")));
    var d2 = dataOf(AM, "modelRun:" + slug);
    var running = anyModelRunning(AM);
    var actions = el("div", "am-more-actions");
    actions.appendChild(btn(T(d2 && d2.status === "loading" ? "page-research.modelRunning" : "page-research.modelRun"), "model-run-" + slug, function () {
      var fields = {};
      specs.forEach(function (sp) {
        var raw = typeof vals[sp.name] === "string" ? vals[sp.name] : "";
        if ((sp.name === "providerA" || sp.name === "providerB") && raw === "auto") raw = "";
        fields[sp.name] = sp.kind === "list" ? raw.split("\n") : raw;
      });
      var p = MOD.prov[slug];
      try {
        var r = AM.actions.modelRun(slug, fields, p && p !== "auto" ? p : "");
        if (r && typeof r.then === "function") r.then(null, function () { /* hata AM.state.data'ya yazılır */ });
      } catch (e) { /* görünür hata sonraki çizimde */ }
    }, false, !av.ok || running || (nego && negoSame(vals))));
    body.appendChild(actions);
    if (!d2) return;
    var box = el("div", "am-more-result");
    box.setAttribute("aria-live", "polite");
    if (d2.status === "loading") {
      box.appendChild(stateCard("loading", T("page-research.modelSending")));
      box.appendChild(el("p", "am-more-hint", T("page-research.modelSendingDetail")));
    } else if (d2.status === "error") {
      box.appendChild(stateCard("error", T("page-research.modelResErr"), safe(d2.reason, 500) || "?", null));
      if (d2.action === "settings") box.appendChild(btn(T("page-research.netOpenSettings"), "net-open-settings-err", function () { act("openSettings", "internet"); }, false));
    }
    else modelResult(box, slug, isObj(d2.value) ? d2.value : {}, AM);
    body.appendChild(box);
  }

  function modelsSection(AM) {
    var sec = el("section", "am-more-sec am-more-labs");
    sec.setAttribute("aria-labelledby", "am-model-group");
    var h = el("h3", "am-more-h3", T("page-research.modelTitle")); h.setAttribute("id", "am-model-group");
    sec.appendChild(h);
    sec.appendChild(el("p", "am-more-hint", T("page-research.modelLead")));
    sec.appendChild(noteLine("shield", T("page-research.modelTrust")));
    var sbx = dataOf(AM, "modelCapabilities");
    var sb = sbx && sbx.status === "ok" && isObj(sbx.value) && isObj(sbx.value.sandbox) ? sbx.value.sandbox : null;
    if (sb && num(sb.worktrees) !== null && num(sb.limit) !== null) {
      sec.appendChild(el("p", "am-more-hint", T("page-research.sandboxInfo", { n: Math.floor(num(sb.worktrees)), limit: Math.floor(num(sb.limit)) })));
      if (num(sb.worktrees) >= num(sb.limit)) sec.appendChild(noteLine("alert", T("page-research.sandboxFull")));
    }
    var entries = modelEntries();
    if (!entries.length) { sec.appendChild(stateCard("empty", T("page-research.modelNone"), T("page-research.modelNoneDetail"), null)); return sec; }
    entries.forEach(function (e) {
      sec.appendChild(labSectionText(e.bolum, mtext(e.ad, 80) + " (" + T("page-research.modelMadde", { n: e.id }) + ")", mtext(e.aciklama, 400), function (b) { modelCard(b, AM, e); }));
    });
    return sec;
  }

  function labsSection(AM) {
    var sec = el("section", "am-more-sec am-more-labs");
    sec.setAttribute("aria-labelledby", "am-lab-group");
    var h = el("h3", "am-more-h3", T("page-research.labTitle")); h.setAttribute("id", "am-lab-group");
    sec.appendChild(h);
    sec.appendChild(el("p", "am-more-hint", T("page-research.labLead")));
    sec.appendChild(labSection("am-lab-hyp", "page-research.hypTitle", "page-research.hypLead", function (b) { hypForm(b, AM); }));
    sec.appendChild(labSection("am-lab-voi", "page-research.voiTitle", "page-research.voiLead", function (b) { voiForm(b, AM); }));
    sec.appendChild(labSection("am-lab-res", "page-research.resTitle", "page-research.resLead", function (b) { resSection(b, AM); }));
    sec.appendChild(labSection("am-lab-half", "page-research.halfTitle", "page-research.halfLead", function (b) { halfSection(b, AM); }));
    sec.appendChild(labSection("am-lab-learn", "page-research.learnTitle", "page-research.learnLead", function (b) { learnSection(b, AM); }));
    return sec;
  }

  // Sayfa kendi içinde yeniden çizildiğinde (bölüm aç/kapat, satır ekle/çıkar) odak, aynı data-am-key'li öğeye geri verilir.
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
  function redraw() {
    if (!(S.AM && S.root)) return;
    var a = document.activeElement;
    var key = a && a.getAttribute ? a.getAttribute("data-am-key") : null;
    try { draw(S.AM, S.root); } catch (e) { fail(S.AM, S.root, e); return; }
    var n = key ? findKeyNode(S.root, key) : null;
    if (n && typeof n.focus === "function") { try { n.focus(); } catch (e2) { /* odak verilemezse kullanıcı yeniden odaklar */ } }
  }

  function draw(AM, root) {
    S.AM = AM; S.root = root;
    root.textContent = "";
    var page = el("section", "am-more-page");
    page.setAttribute("aria-labelledby", "am-more-rs-h");
    var h = el("h2", "am-more-h", T("page-research.title")); h.setAttribute("id", "am-more-rs-h");
    page.appendChild(h);
    page.appendChild(el("p", "am-more-lead", T("page-research.lead")));
    var notes = el("div", "am-more-notes");
    notes.appendChild(noteLine("shield", T("page-research.onlyRecords")));
    page.appendChild(notes);
    var cal = calSection(AM);
    page.appendChild(cal || stateCard("empty", T("page-research.calEmpty"), T("page-research.calEmptyDetail"), null));
    page.appendChild(genSection(AM));
    LAB.uid = 0;
    page.appendChild(labsSection(AM));
    page.appendChild(modelsSection(AM));
    root.appendChild(page);
    S.page = page;
  }

  function fail(AM, root, e) {
    root.textContent = "";
    root.appendChild(stateCard("error", T("page-research.errTitle"), T("page-research.errDetail", { reason: str(e && e.message, 200) || "?" }), function () {
      try { draw(AM, root); } catch (e2) { fail(AM, root, e2); }
    }));
  }

  // Sayfada girdi alanı yok: her durum değişiminde baştan çizilir.
  function render(AM, root, param) { S.AM = AM; applyParam(param); draw(AM, root); }

  window.AM_PAGE_RESEARCH = {
    render: render,
    pure: {
      calSummary: calSummary, fmtPct: fmtPct, fmtDec: fmtDec, forestSummary: forestSummary, chainSummary: chainSummary, safe: safe
    }
  };

  window.AM_PAGES.register("research", {
    title: T("page-research.title"),
    group: T("page-research.group"),
    render: function (AM, root, param) {
      try { render(AM, root, param); } catch (e) { fail(AM, root, e); }
    }
  });
})();
