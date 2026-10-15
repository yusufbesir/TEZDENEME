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
flutter build apk           # Android (release: %USERPROFILE%\.anahtar\key.properties zorunlu, bkz. docs/IMZA.md)
```
Testler: `flutter analyze && flutter test`

Yayın imzası: Android release derlemesi `%USERPROFILE%\.anahtar\key.properties` (yalnız kullanıcının erişebildiği klasör) üzerinden ayrı yayın anahtar deposuyla imzalanır; dosya ve `*.jks` ne depoya ne proje klasörüne girer. Kurulum için bkz. `docs/IMZA.md`. `key.properties` yoksa release derlemesi varsayılan olarak DURUR (`dagitim=true`); yalnız yerel deneme için `cd android && gradlew -Pdagitim=false assembleRelease` ile debug anahtarına düşülür.

## Klasörler
- `lib/model` içerik ve öğrenci durumu modelleri
- `lib/motor` saf öğrenme motoru (Flutter'a bağımlı değil)
- `lib/depo` kalıcı kayıt
- `lib/icerik` kurslar
- `lib/ekranlar`, `lib/bilesenler` arayüz; `lib/tema` renk belirteçleri ve tema
- `lib/servis` ses (metin okuma) ve bildirim
- `test` birim ve arayüz testleri
- `SOZLESME.md` geliştiriciler arası arayüz sözleşmesi
