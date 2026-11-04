---
description: Adım Adım "cihaz gerektiren" özellik planı (kart 11 arkadaşla yarışma, kart 7 kameradan kelime, kart 2 telaffuz). APK taramasından çıkan 15 kart içinde bulut oturumuyla iş bölümü yapıldı; bu belge yalnız cihaz tarafını kapsar.
sahip: Yusuf (yusufbesir)
yazan: "[İP:Adım Adım özellikler#cihaz] Claude"
degistirme: Yusuf düzenler; yapay zekâlar yalnız ekleme yapar, silme yok.
---

# Cihaz tarafı özellik planı (2026-11-04)

## Özet
Kaynak: `kasa\notlar\APK tarama özeti - Adım Adım 2026-11-04.md` (15 tema). Yusuf 2026-11-04'te 11'i (arkadaşla yarışma; aynı Wi‑Fi'da bağlan, değilse Bluetooth) ve diğer tüm özellikleri istedi. Bulut oturumu 7 dal + ikinci dalgada kart 1, 6, 8, 10, 12, 13, 14 eksiklerini alıyor; bu cihaz kart 11, 7 ve 2'yi alıyor. Dal: `claude/adim-adim-ozellikler-20261104`; özellik başına ayrı commit; push yok; mevcut dosyalara en az dokunuş, yeni dosya tercih.

## Mevcut durum (keşif, 2026-11-04)
| Kart | Durum | Not |
|---|---|---|
| 1, 3, 6, 8, 9, 14 | Var | bulut eksiklerini tamamlıyor |
| 2 telaffuz | Kısmen | `lib/servis/konusma_sherpa.dart` yalnız Windows; model dosyası depoda yok; Android mikrofon izni yok |
| 4 hatırlatıcı | Kısmen | sessiz saat ve takvim yok (bulut: tek akıllı hatırlatıcı) |
| 5 uzaktan paket | Yok | bu turda kapsam dışı (release manifestte INTERNET izni yok, içerik gömülü) |
| 7 kameradan kelime | Yok | kamera/OCR paketi yok |
| 11 arkadaşla yarışma | Yok | `lib/yarisma` tek kişilik, ağ yok |
| 13 kilit | Yok | bulut alıyor |
| 12 izin-minimal | Kısmen | ana manifestte yalnız POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED; **INTERNET yok** |

## Kart 11: Arkadaşla oyna (düello)
Tasarım:
- **Konum:** `lib/yarisma/arkadasla/` altında yalnız yeni dosyalar. Mevcut yarışma kodu (motor, depo, ekranlar) değişmez; yarışma ekranına yalnız tek giriş düğmesi "Arkadaşla oyna" eklenir (ana ekrana yeni kart yok).
- **Çekirdek (saf Dart, ağsız):** `protokol.dart` (mesajlar, güvenilmeyen girdi doğrulaması, boyut sınırları, soru havuzu sha256 özeti), `duello_motoru.dart` (sıra tabanlı, 10 soru, puan + hız bonusu, aynı tohumla iki cihazda aynı sorular).
- **Taşıma (soyut `DuelloAktarimi`):**
  1. **LAN (Windows + Android ortak):** `dart:io` UDP yayın keşfi + TCP soket. Aynı Wi‑Fi'de çalışır.
  2. **Bluetooth (yalnız Android):** `nearby_connections` (Wi‑Fi LAN / Bluetooth'u kendisi seçer). Windows'ta yok; Windows yalnız LAN.
  3. Otomatik seçim: önce LAN keşfi, bulunamazsa Android'de Nearby.
- **Sunucu yok, internet yok.** Veri yalnız iki cihaz arasında; kayıt/telemetri yok.
- **Güvenlik (karar bende):** eşleşmeden önce kullanıcı onayı (davet kodu 4 haneli, ekranda görünür); tek rakip; mesaj boyutu 4096 B; şema doğrulama; bilinmeyen tür reddi; zaman aşımı; rakipten gelen veriyle kod çalıştırma yok; soru havuzu özeti uyuşmazsa düello başlamaz (sürüm farkı); takma ad en çok 24 karakter ve ekranda düz metin.
- **İzinler (izin-minimal ilkesiyle uyum):** Android ana manifestte yalnız bu özellik için gerekenler: `INTERNET` (yerel TCP/UDP soketleri için şart, uzak sunucuya bağlanmıyoruz), `ACCESS_WIFI_STATE`, `CHANGE_WIFI_MULTICAST_STATE`; Nearby için `BLUETOOTH_SCAN/ADVERTISE/CONNECT`, `NEARBY_WIFI_DEVICES` (Android 13+). **Bu izinler kart 12'nin "açılışta 0 hassas izin" ilkesiyle çakışabilir; bulut oturumunun manifest denetimine bildirilecek.** Çalışma zamanı izni yalnız "Arkadaşla oyna"ya girilince istenir.
- **Test:** protokol ve motor birim testleri; LAN taşıması 127.0.0.1 döngü testiyle (iki uç aynı süreçte); Nearby cihaz gerektirir, cihazda elle denenecek (burada otomatik test yok, açıkça belirtilecek).

## Kart 7: Kameradan kelime ekle
- Android: ML Kit metin tanıma (çevrimdışı) + kamera/galeri seçici; Windows: dosya seçerek Tesseract (OCR başlığındaki kurulum). Mevcut "kelime ekle" akışına tek düğme. Karar öncesi paket izin/boyut incelemesi yapılacak (izin-minimal).

## Kart 2: Telaffuz "en zayıf ses"
- Mevcut `lib/motor/telaffuz.dart` üstüne; gerçek mikrofonla cihazda denenir. Android için `RECORD_AUDIO` ve model dosyası sorunu ayrıca çözülecek (şimdilik Windows).

## Yapılmayacaklar / sınırlar
- Kart 5 (uzaktan paket) ve internet sunucusu: bu turda yok.
- Yeni özelliklerin hiçbiri ana dala girmez; birleştirme koordinatörde.
