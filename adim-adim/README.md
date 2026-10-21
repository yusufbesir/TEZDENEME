# Adım Adım

Türkçe arayüzlü, çevrimdışı çalışan dil ve kodlama öğrenme uygulaması. Flutter ile yazıldı; tek kod tabanından Android, iOS, Windows, macOS ve Linux'a kurulur.
İz etiketi: [İP:Adım Adım öğrenme uygulaması#Dwv81f]

## Özet
- Kurslar: İngilizce A1 (14 ders), İngilizce A2 (12 ders), İngilizce B1 (12 ders), İngilizce B2 (12 ders), HTML, CSS ve JavaScript (6'şar ders). İçerik özgün.
- Alıştırma türleri: çoktan seçmeli, boşluk doldurma, yazma, sıralama, eşleştirme, dinleme (sesli okuma), kod boşluğu; kodda çoklu boşluk, satır seçme, anahtar sözcük yazma, çıktı yazma ve çalıştırılabilir JS (bkz. aşağıda 68–70).
- Öğrenme motoru: kısa dersler, XP ve seviye, esnek seri ve haftalık hedef (haftada 3-7 gün; hedef tutulursa günlük ara seriyi bozmaz), günlük hedef, yarı ömür tabanlı aralıklı tekrar (kişisel unutma eğrisi; 1-5 kutu göstergesi korunur), hata defteri (yanlış kartlar ve yarışma soruları, "Zayıf noktalar dersi"), ünite sonu karışık tekrar (5 soru), 2 dakikalık mikro ders (önce zamanı gelen kartlar, sonra karışık türler).
- Sade arayüz (2026-10-16): ilk açılışta alan seçimi (İngilizce / Programlama); uygulama yalnızca seçili alanın içeriğini gösterir. 4 sekme: Yol, Yarışma, Tekrar, Profil (ayarlar Profil'deki dişliden). Gerekçe ve araştırma kaynakları `docs/SADE-ARAYUZ-VE-YARISMA.md`.
- Bilgi yarışması: ders motorundan bağımsız `lib/yarisma` paketi; çark, 6 kategori (genel kültür, tarih, sanat, matematik, fen, coğrafya), taç koşusu, 3 can, güçlendiriciler; sorular alan ve seviyeye göre (A1, A2, B1 ve B2 İngilizce, HTML/CSS/JS Türkçe), 216 soru. İstatistikler ayrı `yarisma.v1.json` dosyasında.
- Tasarım: özgün "basamak" yolu; OKLCH ile seçilmiş, WCAG AA kontrastlı, renk körlüğü güvenli renkler; açık ve koyu tema. Gerekçeler `docs/TASARIM.md`, platform kararı `docs/KARAR-PLATFORM.md`.
- Veri yalnızca cihazda, tek JSON dosyasında (atomik yazma). Ağ isteği yok.

## Çalıştırma
```
flutter pub get
flutter run -d windows      # ya da -d android, -d chrome değil
flutter build windows       # Windows kurulumu (build/windows/x64/runner/Release)
flutter build apk           # Android (release: %USERPROFILE%\.anahtar\key.properties zorunlu, bkz. docs/IMZA.md)
```
Testler: `flutter analyze && flutter test`

Yayın imzası: Android release derlemesi `%USERPROFILE%\.anahtar\key.properties` (yalnız kullanıcının erişebildiği klasör) üzerinden ayrı yayın anahtar deposuyla imzalanır; dosya ve `*.jks` ne depoya ne proje klasörüne girer. Kurulum için bkz. `docs/IMZA.md`. `key.properties` yoksa release derlemesi varsayılan olarak DURUR (`dagitim=true`); yalnız yerel deneme için `cd android && gradlew -Pdagitim=false assembleRelease` ile debug anahtarına düşülür. `key.properties` var ama hatalıysa (boş alan, göreli `storeFile`, eksik `.jks`) debug derlemesi de durur; bu bilerek güvenli tarafta kalan davranıştır, dosyayı düzeltin.

## Klasörler
- `lib/model` içerik ve öğrenci durumu modelleri
- `lib/motor` saf öğrenme motoru (Flutter'a bağımlı değil)
- `lib/depo` kalıcı kayıt
- `lib/icerik` kurslar
- `lib/yarisma` bilgi yarışması (model, soru bankası, oyun motoru, depo, ekranlar); ders katmanıyla yalnız XP üzerinden bağlı
- `lib/ekranlar`, `lib/bilesenler` arayüz; `lib/tema` renk belirteçleri ve tema
- `lib/servis` ses (metin okuma) ve bildirim
- `test` birim ve arayüz testleri
- `SOZLESME.md` geliştiriciler arası arayüz sözleşmesi

## Dil ve pratik özellikleri (kapsam ve sınırlar)
- Ünite rehber kitapçığı (42): yalnız ünite verisinden (kalıplar, örnek cümleler, kelimeler, süre); CEFR yalnız kurs adında A1–C2 geçiyorsa gösterilir. Üniteye özel diyalog verisi yoktur; senaryo varsa bağlantı verilir.
- Efsanevi zor tekrar (43): biten üniteyi ipucusuz ve süreli (soru başına 15 sn, geçme %90) tekrar; geçerse ünite "altın" (`altinUniteler`). Başarısızlıkta SRS, hata defteri ve XP değişmez.
- Dinleme radyosu (46): yalnız dil kurslarının ünite cümleleri (≥3 cümlesi olan üniteler); cihaz TTS; dinle-eşleştir, dinle-tanı, sırala.
- Fiil çekim sözlüğü (61): YALNIZ kurs tablolarında doğrulanmış çekimler; kural ile üretim yok. Kapsam: Almanca dürfen, gehen, haben, kommen, können, lernen, machen, möchten, müssen, sehen, sein, werden, wollen (zamanlar tablolara göre kısmi: Präsens, Präteritum, Konjunktiv II, Perfekt biçimi); İngilizce be (Present: I, you, she, we). Kodlama, Korece, Japonca, Çince ve diğer fiiller için tablo yoktur.
- Eller serbest sesli mod (64): TTS okur, kullanıcı tekrar eder, konuşma tanıma kontrol eder; tanıma modeli/izin yoksa yalnız dinleme kipine düşer (8.7 kalıbı).
- Senaryolu konuşma (65): çevrimdışı, dallanan, iki taraflı balonlu sohbetler; cevap seç, yaz ya da söyle. İngilizce 3, Almanca 3, Korece 2 senaryo (Korece cümleler anadil denetiminden geçmedi).
- Kelime bulutu (66) ve profilde öğrenilen kelime sayısı: bitmiş ders ya da kartı olan kelimeler; boyut kartın yarı ömründen.
- Telaffuz puanı (77): 0–100, hatalı heceyi gösterir; konuşma tanıma çıktısıyla hedef metnin harf benzerliğinden hesaplanır, bu yüzden "tahmini" etiketlidir (sesin kendisi ölçülmez). Hece bölme sezgiseldir.
- Yer imi koleksiyonları (72): ders adımları (Bu dersin öğeleri) ve sözlük maddeleri koleksiyonlara kaydedilir; not, taşıma ve açma geçmişi. Profil > Yer imleri.
- Gerekçeli öneri (73): kural tabanlı, "Bunu öneriyoruz çünkü ..." ve tahmini süre (bekleyen tekrar, zayıf noktalar, düşük hafıza puanlı ünite, sıradaki ders). Yapay zekâ yoktur. Profil > Sana öneri.
- Öğrenme yolu (74): kurs kimliklerinden türetilen yol > seviye > kurs ağacı ve yüzde ilerleme (Web: HTML > CSS > JS). Profil > Öğrenme yolu.
- Örnek programlarda arama ve dil başvurusu (75): başvuru terimleri YALNIZ örneklerin kodunda geçenlerdir (etiket, CSS özelliği, JS anahtar sözcüğü/yöntem çağrısı); açıklama örnekteki notundan gelir, dışarıdan API bilgisi eklenmez.
- Hafıza puanı ve çok modlu çalışma (78): ünite puanı kart yarı ömürlerinden (0-100); kart, yazma, eşleştirme, test modları geçici destedir (SRS, hata defteri, XP değişmez). Pratik merkezi.
- Metin seçerek sözlükte aç ve CSV (81): ünite özeti, dilbilgisi notu ve örnek ayrıntısında seçim menüsünde "Sözlükte ara"; Sözlük > "Kelime defterini CSV olarak kopyala" (pano; dosya ya da klasör seçimi yok, hücre başı =,+,-,@ formül önleme).
- Kelime defteri oynatıcı (82): kelimeleri cihaz TTS ile sırayla okur; duraklat/devam, önceki/sonraki, hız, anlamı da oku, döngü. Gerçek TTS cihazda denenmedi; testte sahte ses.
- Halat çekme ve maskot (83): bilgisayara karşı çevrimdışı bilgi yarışı (yarışma sorularından, tohumla deterministik); çalışma arkadaşı XP'den türeyen emoji aşamalarıdır (saklanmaz, satın alma yok).
- Gerçek mikrofon ve TTS cihazda denenmedi; testlerde sahte ses/tanıma kullanıldı.

## Kod pratiği özellikleri (68, 69, 70; kapsam ve sınırlar)
- Etkileşimli kod türleri (68): `kodbosluk` (çoklu boşluğa parça yerleştir), `kodsec` (doğru satıra dokun), `kodyaz` (anahtar sözcüğü yaz; büyük/küçük harf duyarlı). Örnek dersler: `js-1-u4-d1` (Kodu çalıştır ve dene), `python-1-u5-d1` (Çıktıyı tahmin et), `html-1-u4-d1` (Etiketleri yerleştir); mevcut kurslara yeni ünite olarak eklendi (biten kurslarda yeni ders açık görünür). JS çıktıları gerçek QuickJS ile, Python çıktıları python3 ile doğrulandı.
- Çalıştırılabilir ders (69): `kodcalistir` yalnız JavaScript. Motor: `flutter_js` 0.8.7 (QuickJS; Windows'ta paketle gelen `quickjs_c_bridge.dll`, yeniden derleme ya da indirme yok). Kod ayrı isolate'te, ağ uzantıları kapalı (fetch/XHR/require/setTimeout yok), std/os modülleri yüklenmez. Süre sınırı: her döngü/fonksiyon gövdesine eklenen bekçi 2 sn ya da 2 milyon adımda keser (catch ile yutulamaz); paketin kendi `timeout`u çalışmayı KESMİYOR (Linux'ta denendi). eval, Function yapıcısı, import, require reddedilir; süslü parantezsiz döngü reddedilir. Bellek sınırı yok (kütüphane `jsSetMemoryLimit` dışa aktarmıyor); bekçinin göremediği tek bir uzun yerel işlem Dart tarafında zaman aşımı sayılır ama arka plan isolate'i bitene kadar sürer. Çıktı biçimi: dize olduğu gibi, dizi/nesne JSON (tarayıcı konsolundan farklı). Motor yüklenemezse alıştırma örnek çözümün çıktısını tahmine döner. Python için çalıştırma YOK (`kodcikti`: çıktıyı yaz). Süreli sınavlara (ara sınav, efsanevi) `kodcalistir` girmez.
- Gerçek motor bu bulut kapsayıcısında Linux kütüphanesiyle test edildi (`LIBQUICKJSC_TEST_PATH=<pub önbelleği>/flutter_js-0.8.7/linux/shared/libquickjs_c_bridge_plugin.so flutter test test/kod_calistirici_test.dart test/kod_etkilesim_test.dart`); kütüphane yoksa bu testler atlanır, arayüz testleri sahte çalıştırıcı kullanır. **Windows'ta denenmedi**: cihazda `flutter build windows` sonrası `quickjs_c_bridge.dll`'nin exe yanına kopyalandığı ve "Çalıştır"ın çıktı verdiği kontrol edilmeli. Android derlemesi (paket jitpack'ten `fastdev-jsruntimes-quickjs` çeker) denenmedi.
- Bölüm sonu proje ve oyun alanı (70): Kod alanında ana sayfadaki "Örnek programlar" satırındaki yapı simgesi ya da Örnek programlar üst çubuğu → Projeler. 3 şablon (HTML kartvizit, CSS ürün kartları, JS tıklama sayacı; ünitenin son dersinin özetinde "Bölüm sonu projesi" düğmesi) ve serbest çok dosyalı oyun alanları (.html/.css/.js). Durumda `kodProjeleri` (eski kayıtta boş; en çok 12 proje, 6 dosya, dosya başı 20.000, toplam 200.000 karakter). Hedefler yalnız istenen öğenin kodda olup olmadığına bakar. Önizleme WebView'siz: yalnız yapı ve metin (CSS/JS uygulanmaz); gerçek görünüm için tek dosyalık HTML panoya kopyalanır ya da İndirilenler'e (yoksa Belgeler) `adim-adim-<ad>.html` olarak kaydedilip tarayıcıda açılır. JS dosyaları konsolda DOM olmadan çalışır.
