<!-- Ne: Adım Adım menü/ekran envanteri ve Duolingo/Busuu yapısıyla karşılaştırma. Sahibi: Yusuf (yusufbesir). Yazan: [İP:Adım Adım Windows sürümü#cihaz] Claude. Değiştirme kuralı: tarihli bölüm eklenir, silinmez. -->
# Menü envanteri ve rakip karşılaştırması (2026-10-22)

**Özet:** Adım Adım'da 4 sekme var (Yol, Yarışma, Tekrar, Profil). Duolingo benzeri ana menüde "Pratik" ve "Görevler" sekmeleri, her ekranda görünen seri/XP çubuğu ve başarım (rozet) ekranı eksik. Lig, sosyal, mağaza ve ücretli mekanikler Yusuf'un kararıyla yapılmıyor (2026-10-17).

**Kaynak notu:** Rakip sütunu mağaza yazıları ve genel bilgidir; gerçek ekran karşılaştırması BlueStacks'te Duolingo/Busuu kurulunca yapılacak (APK ya da Play Store girişi Yusuf'tan gerekir). Adım Adım sütunu kod okunarak çıkarıldı (`lib/ekranlar/kabuk.dart`, `lib/uygulama.dart`).

## Ana gezinme
| Duolingo | Busuu | Adım Adım (şimdi) | Durum |
|---|---|---|---|
| Öğren (yol) | Öğren | Yol | var |
| Pratik | Gözden geçir | Tekrar (içinde Pratik merkezi) | pratik ayrı sekme değil |
| Görevler (Quests) | Çalışma planı | Yok (plan ayrı sayfa) | eksik |
| Lig | Topluluk | Yok | yapılmayacak |
| Profil/Mağaza | Profil | Profil | var; mağaza yapılmayacak |
| Üst çubuk: bayrak, seri, taş, kalp | Hedef çubuğu | Yalnız Yol ekranında alan adı ve seri | her ekranda yok |
| Başarımlar (Profil içinde) | Rozetler | Yok | eksik |

## Mevcut ekranlar (özet)
Sekmeler: Yol (`/yol`), Yarışma (`/yarisma`), Tekrar (`/tekrar`), Profil (`/profil`). Kabuk dışı sayfalar: Ayarlar, Alan seçimi, Çalışma planı, Sözlük, Meydan okuma, Ay/yıl özeti, Süre, Öneriler, Öğrenme yolu, Yer imleri, Kelime bulutu, Pratik merkezi (eşleştirme, artan zorluk, kelime kartları, halat, görsel kelime, radyo, eller serbest, senaryo), Filtreli tekrar, Mikro ders, Ders, Yerleştirme, Ünite rehberi/özeti, Sınav, Efsanevi tekrar, Sertifika, Örnek programlar, Projeler, Satranç merkezi (bulmaca, maç, oyun sonu, araçlar). Alanlar: İngilizce (dil), Programlama (kod), Oyunlar (oyun).

## Eksikler ve karar
1. Pratik'i ana menüye al (5 sekme: Yol, Pratik, Yarışma, Görevler, Profil); Tekrar rozeti Pratik'e taşınır.
2. Günlük görevler (Görevler sekmesi): günlük/haftalık hedefler, tamamlanınca XP ve kutlama (ödül rastgele değil, sabit).
3. Başarımlar/rozetler ekranı (Profil'den ve Görevler'den erişilir).
4. Her sekmede ortak üst çubuk: alan, seri, günlük XP halkası.
5. Oyunlar alanı için yarışma soru bankası boş (`lib/yarisma/soru_bankasi.dart`): doldurulacak.
6. Yarışma "Oyna" rotası kod yorumu eski; GoRouter'a taşıma kararı.
7. Ertelenen içerikler (SURUM notundaki liste: SQL, PHP/Go, Arapça/Japonca/Fransızca/Rusça, C1, Go oyunu, okuma hikâyeleri) sonraki dalgalar.
