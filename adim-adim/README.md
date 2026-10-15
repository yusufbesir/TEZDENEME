# Adım Adım

Türkçe arayüzlü, çevrimdışı çalışan dil ve kodlama öğrenme uygulaması. Flutter ile yazıldı; tek kod tabanından Android, iOS, Windows, macOS ve Linux'a kurulur.
İz etiketi: [İP:Adım Adım öğrenme uygulaması#Dwv81f]

## Özet
- Kurslar: İngilizce A1 (13 ders), HTML, CSS ve JavaScript (6'şar ders). İçerik özgün.
- Alıştırma türleri: çoktan seçmeli, boşluk doldurma, yazma, sıralama, eşleştirme, dinleme (sesli okuma) ve kod boşluğu.
- Öğrenme motoru: kısa dersler, XP ve seviye, günlük seri, günlük hedef, aralıklı tekrar (Leitner 5 kutu).
- Tasarım: özgün "basamak" yolu; OKLCH ile seçilmiş, WCAG AA kontrastlı, renk körlüğü güvenli renkler; açık ve koyu tema. Gerekçeler `docs/TASARIM.md`, platform kararı `docs/KARAR-PLATFORM.md`.
- Veri yalnızca cihazda, tek JSON dosyasında (atomik yazma). Ağ isteği yok.

## Çalıştırma
```
flutter pub get
flutter run -d windows      # ya da -d android, -d chrome değil
flutter build windows       # Windows kurulumu (build/windows/x64/runner/Release)
flutter build apk           # Android
```
Testler: `flutter analyze && flutter test`

Yayın öncesi: Android release derlemesi şimdilik debug anahtarıyla imzalıdır (`android/app/build.gradle.kts`). Mağazaya ya da dağıtıma çıkmadan önce kendi imza anahtarınızı (`key.properties`) tanımlayın.

## Klasörler
- `lib/model` içerik ve öğrenci durumu modelleri
- `lib/motor` saf öğrenme motoru (Flutter'a bağımlı değil)
- `lib/depo` kalıcı kayıt
- `lib/icerik` kurslar
- `lib/ekranlar`, `lib/bilesenler` arayüz; `lib/tema` renk belirteçleri ve tema
- `lib/servis` ses (metin okuma) ve bildirim
- `test` birim ve arayüz testleri
- `SOZLESME.md` geliştiriciler arası arayüz sözleşmesi
