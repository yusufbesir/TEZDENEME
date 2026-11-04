# Rust çekirdek + Python katmanı geçiş planı (2026-11-04)

Sahibi: Yusuf. Karar kaynağı: Yusuf 12:29 TSİ "ağır hesaplamalar ve asıl işi yapan kısımlar Rust, üstüne Python; başka diller parça parça olabilir".
Kural: çalışan sürüm bozulmaz. Her aşama bir öncekinin üstüne, davranış eşitliği kanıtlanınca açılır.

## Varsayımlar (itiraz edilirse değişir)
- Arayüz Flutter/Dart kalır. Rust arayüz çizmez; saf hesap ve veri işini yapar.
- Python telefonda çalışmaz. Python; araç, doğrulama, veri hattı, paketleme ve eğitim betikleri katmanıdır (Jev zaten Python).
- Rust araç zinciri bu kutuda var (cargo 1.97, yalnız x86_64 Linux hedefi). Android hedefleri (aarch64, armv7, x86_64) ve NDK cihaz/derleme makinesinde kurulmalı; burada APK derlenmez.
- Mevcut ~1700 Dart testi kaybolmaz; eşdeğerlik için "altın vektör" olarak kalır.

## Aşamalar
0. **Envanter ve iskelet.** Tüm uygulamaların (adim-adim, dosya-donusturucu, qr-kampanya, yerel-asistan, jev, ...) hesap ağırlıklı bölümleri listelenir. `adim-adim/rust/` altında bir Cargo çalışma alanı kurulur, CI'da `cargo test` ve `cargo clippy` çalışır. Etki: çalışan sürüm değişmez.
1. **Saf çekirdek (`adim_cekirdek`).** Önce yan etkisiz, test edilebilir işler: sözlük normalize ve arama, kart yarı ömür hesabı (`kartHesapla`), dikte farkı, yerleştirme seçimi, karışık sıra, metinden kelime çıkarma, rozet/seri hesabı. Dart tarafında aynı girdilerden altın vektörler üretilir, Rust bunlarla birebir sınanır.
2. **Köprü.** `flutter_rust_bridge` (ya da `dart:ffi`) ile Dart'tan çağrı. Her işlev için bir bayrak vardır: Dart yolu varsayılan kalır, Rust yolu eşdeğerlik testi yeşil olunca açılır. Dart'ta eski yol bir sürüm boyunca durur, sonra kaldırılması Yusuf kararıdır (silme yasağı).
3. **Ağır işler Rust'ta doğrudan.** Arkadaşla yarış protokolü ve LAN aktarımı (cihaz dalındaki Dart protokolünün Rust karşılığı), durum dosyası göçü ve şifresiz ama doğrulamalı yedek, büyük JSON ayrıştırma, OCR sonrası metin işleme.
4. **Python katmanı.** İçerik doğrulayıcı betik (ders/kelime şeması), kurs veri hattı, paketleme ve sürüm betikleri, Jev danışma çağrıları, ölçüm ve rapor araçları. Rust çekirdek aynı doğrulayıcıyı komut satırı olarak da sunar; Python onu çağırır.
5. **Diğer uygulamalar.** Envantere göre sırayla: dosya-donusturucu (dönüştürme çekirdeği), qr-kampanya (kod üretimi/doğrulama), yerel-asistan (`cekirdek`). Her biri kendi deposunda ve kendi ekibiyle.

## Kabul ölçütleri
- Her aşamada: eski testler yeşil, yeni Rust testleri yeşil, eşdeğerlik testi yeşil, `flutter analyze` ve `cargo clippy` temiz.
- Ölçüm önce, değişiklik sonra: hızlanma iddiası `tool/performans_olc.dart` benzeri ölçümle yazılır.
- APK boyutu ve açılış süresi her Rust işlevi eklenince raporlanır; belirgin artışta Yusuf'a sorulur.

## Riskler
- Android derleme zinciri (NDK, çoklu hedef) ve APK büyümesi. Önlem: ilk aşamada yalnız aarch64 ve x86_64, boyut ölçümü.
- Dart ve Rust sayısal/Unicode davranış farkı (ör. `toLowerCase`, Türkçe İ/ı). Önlem: altın vektörlerde Türkçe, Arapça, Korece örnekler.
- İki dil bakım yükü. Önlem: Dart yolu yalnız eşdeğerlik kanıtından sonra emekli edilir.

## Açık karar (Yusuf)
- Arayüz Dart'ta kalsın mı (önerilen), yoksa Rust tabanlı arayüze (ör. Slint/egui) geçiş planlansın mı? İkincisi tüm uygulamayı yeniden yazmak demektir.
