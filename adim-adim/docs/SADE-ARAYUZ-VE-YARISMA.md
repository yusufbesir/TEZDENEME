# Sade arayüz, mikro ders ve bilgi yarışması: tasarım

Bu dosya: Adım Adım uygulamasının 2026-10-16 arayüz yenilemesi ve bilgi yarışması bölümünün tasarım kararları. Sahibi: Yusuf (yusufbesir). Değiştirme kuralı: kararlar değişirse bu dosya güncellenir; eski karar silinmez, "Değişti" notu eklenir. Yapay zekalar bu dosyayı okuyup uygular, kendi başına karar değiştirmez.

İz etiketi: [İP:Adım Adım öğrenme uygulaması#Dwv81f] · Tarih: 2026-10-16

## 1. Yusuf'un isteği (özet)
- Arayüz çok karışık, her yerde buton var. Duolingo/Busuu gibi sade olsun.
- Alan seçilince yalnızca o alan görünsün: İngilizce seçildiyse sadece İngilizce, Programlama seçildiyse sadece programlama.
- Üç geliştirme önerisinin hepsi: günlük hedef + seri, aralıklı tekrar kuyruğu, 2 dakikalık mikro ders.
- Trivia Crack gibi ayrı bir bilgi yarışması bölümü; her alan ve her seviye için ayrı sorular (A1'e A1 soruları); kategoriler genel kültür, tarih, sanat, matematik, fizik gibi; yazılımda farklı bir kurgu.
- Basit animasyonlar. Eğitim araştırmalarına dayalı özellikler ve renkler.

## 2. İncelenen uygulamalar (web kaynaklarından, kurulum yapılmadı)
**Duolingo** (resmî blog, UX incelemeleri): Tek doğrusal yol; her daire bir ders, üniteler başlıklı bölümler; yol aralıklı tekrar mantığıyla yeni ve eski konuları karıştırır. Üst çubukta yalnızca seri alevi, kurs bayrağı ve can/elmas. Alt çubukta 5-6 sekme. Önce oyna, sonra profil. Dersler kısa, anında geri bildirim, yeşil doğru / kırmızı yanlış bandı. Seri kayıp korkusuyla (loss aversion) alışkanlık kurar.

**Busuu**: Ders akışı sade; kısa kelime kartları, ardından alıştırma; haftalık hedef; tekrar bölümü ayrı sekmede.

**Trivia Crack** (TouchArcade incelemesi, Trivia Crack 2 duyurusu): Çark çevirme → 6 kategoriden biri (Eğlence, Sanat, Spor, Tarih, Bilim, Coğrafya) ya da taç dilimi. 3 doğru → taç sorusu, kategori seçersin, doğruysa o kategorinin tacı. 6 taç = oyun biter. Can sistemi (3 can, saatte 1 yenilenir). Güçlendiriciler: Bomba (2 yanlış şıkkı siler), Ekstra Süre, Çift Şans, Geç. Soru başına 30 saniye. Her kategoriye ait renk ve karakter.

**DuoCards**: Sağa kaydır bildim, sola kaydır bilmedim; Leitner tabanlı aralıklı tekrar; günlük seri; puanla maskotun evini süsleme.

## 3. Öğrenme bilimi (kaynaklı)
- **Donoghue & Hattie (2021), Frontiers in Education, 10 tekniğin meta-analizi** (Dunlosky ve ark. 2013 listesinin 1.619 etki büyüklüğüyle sınanması): dağıtılmış çalışma d=0,85; alıştırma testi (retrieval practice) d=0,74 (geri bildirim varsa daha yüksek); açıklayıcı sorgulama d=0,56; imgeleme d=0,56; kendine açıklama d=0,54; anahtar sözcük mnemonik d=0,50; yeniden okuma d=0,47; serpiştirme d=0,47; altını çizme ve özetleme d=0,44. Düşük ön bilgili öğrencilerde etkiler daha büyük.
- **Mehta & Zhu (2009), Science, UBC**: 600+ katılımcı; kırmızı ekran ayrıntı ve hafıza (hatırlama, düzeltme) görevlerinde maviye göre %31'e kadar daha iyi; mavi ekran yaratıcı görevlerde yaklaşık iki kat daha fazla üretim. Açıklama: kırmızı dikkat/uyanıklık, mavi açıklık/güven.
- **Elliot ve ark. (2007), JEP: General**: Sınav öncesi kısa kırmızı görme başarıyı düşürür (kaçınma güdüsü). Bu yüzden değerlendirme ekranlarında kırmızı zemin ve kırmızı "yanlış" baskısı kullanılmaz.
- **Dzulkifli & Mustafar (2013), Malaysian Journal of Medical Sciences**: Renk, dikkat ve bellek performansını artırır; etkinin anahtarı zemin-ön plan kontrastı ve sıcak renklerin dikkat çekiciliğidir; aşırı renk dikkat dağıtır.
- **Kaplan (1995) Dikkat Yenilenme Kuramı; Lichtenfeld ve ark. (2012)**: Yeşil doğal tonlar kısa molalarda dikkati yeniler, yaratıcı performansı artırır.

### Tasarıma yansıması
| Bulgu | Uygulamadaki karşılığı |
|---|---|
| Alıştırma testi d=0,74 | Bilgi yarışması (geri bildirimli çoktan seçmeli), her cevaptan sonra açıklama |
| Dağıtılmış çalışma d=0,85 | Mevcut Leitner tekrar kuyruğu; mikro ders önce zamanı gelen kartları alır |
| Serpiştirme d=0,47 | Mikro ders ve tekrar farklı alıştırma türlerini ve üniteleri karıştırır |
| Açıklayıcı sorgulama / kendine açıklama | Açıklama metni doğru cevapta da gösterilir ("Neden doğru?") |
| Hedef belirleme, alışkanlık | Günlük XP hedefi, seri, hatırlatma (mevcut) |
| Kırmızı: ayrıntı/hafıza, sınavda kaçınma | Yarışma zamanlayıcısı ve sorular nötr zeminde; sıcak renk yalnızca küçük vurgu; yanlış için kızıl-turuncu, kırmızı değil |
| Mavi: açıklık, yaratıcılık | Öğrenme yolu ve yazma alıştırmaları sakin petrol/mavi tonlarda (mevcut ana renk) |
| Yeşil: dikkat yenilenmesi | Ders sonu ve mola ekranlarında yeşil-mavi "doğru" rengi; Programlama alan rengi yeşil |
| Kontrast ve ölçülü renk | Düşük kromalı zemin, WCAG AA; kategoriler Okabe-Ito mantığıyla ayrışır |

## 4. Bilgi mimarisi (sade)
### Alan seçimi
- İlk açılışta tam ekran **Alan seç**: iki büyük kart, "İngilizce" ve "Programlama". Seçim `OgrenciDurumu.alan` alanında saklanır ('dil' | 'kod').
- Alan seçilince uygulamanın her yeri yalnızca o alanın içeriğini gösterir: yol, tekrar, yarışma, profil istatistikleri.
- Alan değiştirme: Profil ekranında "Alanı değiştir" (tek satır). Diğer alanın ilerlemesi silinmez.

### Gezinme: 4 sekme
Yol · Yarışma · Tekrar · Profil. Ayarlar artık sekme değil; Profil'in sağ üstündeki dişli simgesiyle açılır (`/ayarlar`).

### Yol ekranı (eski "Kurs seç" çipleri kalkar)
- Üst şerit: alan adı (ör. "İngilizce"), seri alevi, günlük hedef halkası (küçük). Başka buton yok.
- Tek doğrusal yol: alanın kursları sırayla (Programlama: HTML → CSS → JS). Her kurs başlığı bir "sahanlık" bandı, her ünite bir başlık, her ders bir basamak (mevcut `Basamak`).
- Sıradaki ders öne çıkar ("Başla"). Kilitli dersler soluk.
- Yolun üstünde tek bir ikincil eylem: **"2 dakikalık ders"** (mikro ders). Tekrar sayısı rozeti kalkar; bekleyen kart sayısı Tekrar sekmesinin üstünde küçük sayı rozeti olarak görünür.

### Mikro ders (2 dakika)
- `Motor.mikroSec(durum, kurslar, bugun, {adet: 5})`: önce zamanı gelen tekrar kartları (bu alanın kurslarından), kalan yerler sıradaki dersten ve bitmiş derslerden karışık türlerle doldurulur (serpiştirme). 5 alıştırma ≈ 2 dakika.
- `Motor.mikroBitir(durum, dogru, toplam, bugun)`: XP = 5 + 2×doğru (+3 tam puan), seri ve günlük XP güncellenir, `tamamlanan` değişmez. Kartlar `kartIsle` ile normal işlenir.
- Rota: `/mikro`, aynı `AlistirmaOturumu` bileşeni. Özet ekranında "Yola dön".

### Günlük hedef ve seri (mevcut, sadeleştirildi)
- Hedef halkası ve seri alevi üst şeritte. Hedef tamamlanınca halka yeşile döner ve bir kez kısa ölçek animasyonu yapar.
- Ders özeti: XP sayacı 0'dan hedefe sayar (≤250 ms), kupa simgesi ölçeklenerek belirir.

## 5. Bilgi yarışması: farklı kurgu
Yarışma, ders motorundan bağımsız bir pakettir: `lib/yarisma/`. Ders içeriği (`Kurs/Unite/Ders`) ile veri paylaşmaz; kendi soru bankası, oyun motoru, deposu ve ekranları vardır. Tek bağ: oyun sonunda kazanılan XP ana duruma `Motor.yarismaXp` üzerinden eklenir ve alan/seviye seçimi ana durumdan okunur.

### Dosyalar
```
lib/yarisma/
  model.dart          YarismaKategori (6), YarismaSorusu, Seviye bağlantısı
  sorular/            soru bankası: ingilizce_a1.dart, programlama_1.dart (HTML), programlama_2.dart (CSS), programlama_3.dart (JS)
  soru_bankasi.dart   alan + seviyeye göre soru listesi; kursBul gibi bulucu
  motor.dart          YarismaMotoru: saf Dart, yan etkisiz; oyun durumu ve geçişler
  depo.dart           YarismaDepo (Bellek, Dosya: yarisma.v1.json), YarismaIstatistik
  saglayicilar.dart   Riverpod sağlayıcılar
  ekranlar/           yarisma_ekrani.dart (lobi), oyun_ekrani.dart, bilesenler: cark.dart, tac.dart, sure_cubugu.dart
```

### Kategoriler (6, Trivia Crack düzeni; Yusuf'un listesi)
| Kimlik | Ad | Simge | Renk (açık/koyu, Okabe-Ito mantığı) |
|---|---|---|---|
| genelKultur | Genel Kültür | lightbulb | turuncu #D55E00 / #F2A25C |
| tarih | Tarih | account_balance | hardal #856309 / #F0BB3B |
| sanat | Sanat | palette | mor #7B3FA0 / #CC79A7 |
| matematik | Matematik | calculate | mavi #0072B2 / #56B4E9 |
| fen | Fen ve Fizik | science | yeşil-mavi #007E57 / #51DAA7 |
| cografya | Coğrafya | public | petrol #007277 / #4FCDCD |

### Seviye eşlemesi
- İngilizce alanı: seviye = kurs (`ingilizce-1` → "A1"). Sorular İngilizce yazılır, A1 sözcük dağarcığıyla; açıklama Türkçe. Sonraki kurslar (A2…) eklendiğinde aynı adla soru dosyası eklenir.
- Programlama alanı: seviye = kurs (`html-1` → 1 "HTML", `css-1` → 2 "CSS", `js-1` → 3 "JS"). Sorular Türkçe; genel kültür/tarih/sanat/matematik/fen/coğrafya alanlarından, bilişim dünyasına yakın örneklerle (ör. tarih: ilk web sayfası 1991).
- Soru bankası: her seviye × kategori en az 4 soru (A1: 6). Her soru 4 şık, tek doğru, kısa Türkçe açıklama.
- Oyun yalnızca o anda seçili alanın seviyelerini gösterir. Varsayılan seviye: yolda en son açılan kurs.

### Oyun kuralları (tek oyunculu taç koşusu)
1. Oyun 3 **can**la başlar. Süre: soru başına 20 s (yanlış sayılır).
2. **Çark**: 6 kategori dilimi + 1 taç dilimi (1/7). Çark rastgele durur (test için `Random` enjekte edilir).
3. Doğru cevap: +10 puan, ardışık doğru sayacı +1. Yanlış/süre bitti: −1 can, sayaç 0.
4. Sayaç 3'e ulaşınca (ya da taç dilimi) **taç sorusu**: oyuncu henüz almadığı kategorilerden birini seçer; doğruysa +50 puan ve o kategorinin tacı. Yanlışsa can gitmez, sayaç 0 olur.
5. 6 taç = **kazandın**. 0 can = oyun bitti. Puan toplanır; her oyun sonunda XP = puan ÷ 5 (en az 5) ana duruma eklenir ve seri/günlük hedefe sayılır.
6. **Güçlendiriciler** (oyun başına birer adet, jetonla satın alınmaz; para yok): Bomba (2 yanlış şıkkı siler), Çift Şans (yanlışsa bir hak daha), Ekstra Süre (+15 s), Geç (soruyu değiştirir). Soru başına en çok bir güçlendirici.
7. Aynı oyunda soru tekrar etmez; kategori sorusu bitince havuz yeniden açılır.
8. Oyun sonunda kısa özet: puan, taçlar, doğru oranı, kategori başına doğru/yanlış. Yanlış bilinen sorular "öğrenmek için" açıklamalarıyla listelenir (açıklayıcı geri bildirim).

### Kalıcı yarışma istatistikleri (`yarisma.v1.json`)
Alan+seviye başına: oynanan, kazanılan, en iyi puan, kategori başına doğru/yanlış, toplanan toplam taç. Ana durum dosyasına yazılmaz (farklı kurgu, bağımsız şema).

## 6. Animasyonlar (basit, anlaşılır)
- Genel kural: 250 ms'yi aşmaz; sistem "hareketi azalt" diyorsa 0 ms (`Olcu.sure`).
- **Tek istisna**: çark dönüşü 1.200 ms (oyun hissi için şart). Hareketi azalt açıksa çark dönmez, sonuç anında gösterilir.
- Çark: `AnimationController` + `Curves.easeOutCubic`, bitişte seçilen dilim kısa ölçek vurgusu.
- Taç kazanımı: taç simgesi 0→1 ölçek + hafif yukarı kayma.
- Doğru cevap: şık kartı kısa yeşil-mavi parlama; yanlış: 2 kez küçük yatay sarsıntı (±6 px).
- Ders/mikro ders özeti: XP sayacı sayar, kupa ölçeklenerek belirir.
- Seri: bugün ilk ders bitince alev simgesi bir kez nabız atar.
- Hedef halkası: hedef dolunca renk değişimi (`AnimatedContainer` renk geçişi).

## 7. Renkler: alan vurguları ve yarışma
- Mevcut palet korunur (bkz. `TASARIM.md`). Eklenenler `AdimRenkleri`'ne değil, ayrı `AlanRenkleri` ve `KategoriRenkleri` yardımcılarına yazılır; böylece tema şeması bozulmaz.
- Alan vurgusu: İngilizce → mavi (#0072B2 açık / #56B4E9 koyu), Programlama → yeşil (#007E57 / #51DAA7). Yalnızca alan başlığı ve kurs sahanlık bandında kullanılır; eylem butonları ana renkte kalır.
- Yarışma soru ekranı: zemin nötr (mevcut), kategori rengi yalnızca üst bant ve çark diliminde. Kırmızı zemin yok (Elliot 2007). Süre çubuğu petrol; son 5 saniyede hardala döner (sıcak renk = dikkat; Dzulkifli & Mustafar 2013).

## 8. Gelecek özellik önerileri (araştırma temelli, bu turda yapılmaz)
1. **Yarı ömür regresyonu (yapıldı, 2026-10-16)** ile kart aralığı (Settles & Meeder 2016): Leitner yerine kişisel unutma eğrisi.
2. **Açıklayıcı sorgulama kartı**: Tekrar sırasında "Neden?" sorusu; öğrenci kısa açıklama yazar, model cevapla karşılaştırır (d=0,56).
3. **Hata defteri (yapıldı, 2026-10-16)**: Yanlış bilinen yarışma soruları ve alıştırmalar tek listede; haftalık "zayıf noktalar" mikro dersi.
4. **Serpiştirilmiş ünite tekrarı (yapıldı, 2026-10-16)**: Ünite sonunda önceki ünitelerden karışık 5 soru (interleaving).
5. **Haftalık hedef + esnek seri (yapıldı, 2026-10-16)**: Seri dondurma yerine "haftada 5 gün" hedefi (dış ödül baskısını azaltır, iç motivasyonu korur).
6. **Sesli okuma zorunlu dinleme oranı**: A1'de her derste en az 2 dinleme alıştırması (çift kodlama).
7. **Konuşma alıştırması**: Cihaz STT ile telaffuz; cihazda özel kalır.
8. **Çevrimdışı A2 ve "Günlük hayat" ünitesi**: içerik genişlemesi; yarışma A2 soruları birlikte gelir.

## 8a. Uygulama notları (2026-10-16, ilk sürüm)
- Değişti: `/alan-sec` yönlendirmesi yalnız alan boşken çalışır; Profil'deki "Değiştir" alan doluyken de bu ekranı açar.
- Değişti: Kategori kartlarında taç sayısı yerine doğru/yanlış gösterilir; toplam taç istatistik satırındadır (kayıt kategori başına taç tutmaz).
- Oyun ekranı lobiden tam ekran Navigator ile açılır; ayrı go_router rotası yok.
- Çark durduktan sonra kategori adı 700 ms görünür, sonra soru gelir; hareketi azalt açıkken bekleme yok.
- Tekrar sekmesi de yalnızca seçili alanın kartlarını gösterir; diğer alanın kartları silinmez, alan değişince görünür.

### 8a-2. Öğrenme motoru turu (2026-10-16): madde 1, 3, 4, 5
- **Yarı ömür (madde 1):** `Kart` artık `yariOmurGun` (varsayılan 1,0) ve `sonCevap` (bool?, son cevap doğru muydu) taşır. `Motor.kartIsle`: doğruda yarı ömür ×2 (en çok 180 gün), yanlışta ÷2 (en az 0,5 gün); sonraki tekrar = bugün + yarı ömür (tam sayıya yuvarlanır, en az 1 gün). Eski `kutu` alanı kalır ve yarı ömürden türetilir (<2 gün 1, <4 gün 2, <8 gün 3, <16 gün 4, ötesi 5). Eski kayıtta `yariOmurGun` yoksa kutunun eski aralığı (1, 2, 4, 8, 16 gün) başlangıç yarı ömrü olur; böylece mevcut ilerleme geri düşmez. Not: bu, Settles & Meeder'in öğrenilmiş regresyonu değil, onun ×2/÷2 biçiminde basitleştirilmiş kuralıdır.
- **Hata defteri (madde 3):** `HataKaydi` (tür 'kart' | 'yarisma', kimlik, kategori, seviye, gün) `OgrenciDurumu.hatalar` listesinde tutulur; en çok 200, en eskisi düşer, aynı tür+kimlik tekrar yanlışsa tek kayıt kalır (yenisi sona). Kart yanlışları `Motor.kartIsle` içinde (ders, mikro ders ve Tekrar oturumları hepsi bu yoldan geçer), yarışma yanlışları `Motor.yarismaBitir(..., yanlisSorular:)` ile (oyun ekranı `YarismaOyunu.sonuc.yanlisBilinenler` verir) yazılır. Tekrar sekmesinde "Hata defteri" bölümü (en yeni 20 satır, kategori rengi `KategoriRenkleri` ile + simge + ad) ve "Zayıf noktalar dersi" düğmesi (`/mikro?mod=zayif`) vardır. Zayıf noktalar dersi son 7 günün (bugün dahil) kart hatalarını `Motor.mikroSec(oncelikliKartlar:)` ile önce sorar, kalan yeri normal mikro ders gibi doldurur. Yarışma soruları Alıştırma olmadığından bu derse girmez; yalnız listede görünür.
- **Serpiştirilmiş ünite tekrarı (madde 4):** Ders kimliğindeki `uN` parçası `Motor.uniteNo` ile çözülür (`ingilizce-1.u1.d1` ve `html-1-u1-d1` biçimleri; `Motor.kursKimligi` kurs kısmını verir). Bir ünitenin son dersi bitince `Motor.serpistirmeSec` aynı kursun önceki ünitelerinden 5 alıştırma seçer (az kullanılan tür önce, ardışık aynı tür yok, `Random(tohum)`); ders özetinde "Karışık tekrar (5 soru)" düğmesi çıkar (`/mikro?mod=karisik&ders=<id>`). İlk ünitede önerilmez. Bitişte `mikroBitir` (XP = `mikroXp`) çalışır.
- **Haftalık hedef + esnek seri (madde 5):** `OgrenciDurumu.haftalikHedefGun` (3-7, varsayılan 5; Ayarlar'da kaydırıcı). Bu haftaki gün sayısı ayrıca saklanmaz, `gunlukXp`ten hesaplanır (`Motor.haftaGunSayisi`, hafta Pazartesi başlar). Seri kuralı: ardışık gün eskisi gibi +1; arada 1 günden uzun ara varsa seri yalnızca son çalışılan haftada hedef gün sayısı tutulmuşsa ve bugün aynı ya da hemen sonraki haftadaysa kopmaz (+1 ile sürer), aksi halde 1'e düşer. Yol sayfasında seri göstergesinin altında "Bu hafta 3/5 gün" satırı görünür. Günlük XP hedefi aynen kalır.
- **Veri uyumu:** Yeni alanlar (`yariOmurGun`, `sonCevap`, `hatalar`, `haftalikHedefGun`) yoksa varsayılan değer alınır; bozuk değer sessizce varsayılana döner; `fromJson` fırlatmaz. `test/hata_defteri_test.dart` ve `test/motor_test.dart` eski biçimli JSON'u sınar.

## 9. Kaynaklar
- Duolingo blog, "New Duolingo home screen design" (blog.duolingo.com/new-duolingo-home-screen-design)
- 925 Studios, "Duolingo UX Breakdown" (925studios.co/blog/duolingo-design-breakdown)
- TouchArcade, Trivia Crack incelemesi (toucharcade.com, 2015-02-03)
- Learning Counsel, DuoCards tanıtımı (thelearningcounsel.com)
- Donoghue, G. M. & Hattie, J. A. C. (2021). A Meta-Analysis of Ten Learning Techniques. Frontiers in Education, 6:581216.
- Dunlosky, J. ve ark. (2013). Improving Students' Learning With Effective Learning Techniques. Psychological Science in the Public Interest, 14(1).
- Mehta, R. & Zhu, R. J. (2009). Blue or Red? Exploring the Effect of Color on Cognitive Task Performances. Science, 323(5918). (ScienceDaily özeti, 2009-02-05)
- Elliot, A. J. ve ark. (2007). Color and psychological functioning: The effect of red on performance attainment. JEP: General, 136(1).
- Dzulkifli, M. A. & Mustafar, M. F. (2013). The Influence of Colour on Memory Performance: A Review. Malaysian Journal of Medical Sciences, 20(2).
- Kaplan, S. (1995). The restorative benefits of nature. Journal of Environmental Psychology, 15(3).
- Lichtenfeld, S. ve ark. (2012). Fertile Green. Personality and Social Psychology Bulletin, 38(6).
- Settles, B. & Meeder, B. (2016). A Trainable Spaced Repetition Model for Language Learning. ACL.

Jev notu: Bu oturumda Jev erişilebilir değil; kaynak puanlaması yapılmadı, kaynaklar elle seçildi.
