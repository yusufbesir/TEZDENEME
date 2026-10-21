---
description: Pırıl yerel-asistan mimari haritası özeti
sahip: Claude
yazan: [İP:Bluey projesi incelemesi#Tazzd6]
değiştirme kuralı: yalnız Claude günceller, Archify ile yeniden üretilir
---

# Pırıl yerel-asistan: mimari harita

## Özet

Pırıl, Windows'ta Electron ile çalışan, telefondan (Android, Capacitor) şifreli yerel ağ bağlantısıyla kumanda edilebilen yerel bir asistandır. Tek ağ yolu LAN üzerindeki şifreli ws bağlantısıdır; istisna olarak isteğe bağlı ve varsayılan kapalı `127.0.0.1:11434` Ollama vardır. Çekirdek (Türkçe niyet ayrıştırma + beceriler) bilgisayarda ve telefonda aynı koddur; sistem işleri yalnız bilgisayardaki platform bağdaştırıcısıyla yapılır. Harita Archify ile üretildi (architecture, showcase); `finalize` dört kapıdan da geçti (validate, deliver, check, browser-check). Görsel inceleme yapılmadı. Kaynak revizyonu `d8abe41` (git kökü `Pırıl`, kaynak yolları `yerel-asistan/` önekli).

## Bileşenler

- **Windows (Electron):** ana süreç `pc/main.js` (tepsi, pencereler, IPC, sunucu yaşam döngüsü); `pc/preload.js` yalnız `window.piril` köprüsünü açar; sohbet ve karakter pencereleri sandbox + contextIsolation ile çalışır; `pc/guvenlik.js` file:// isteklerini uygulamanın kendi klasörleriyle sınırlar.
- **Çekirdek köprüsü:** `pc/cekirdek-kopru.js` ctx'i kurar, komutu `cekirdek/asistan.js`'e verir; telefondan gelene `kaynak:'telefon'` zorlar.
- **Paylaşılan çekirdek:** `cekirdek/` bağımlılıksız JS; beceriler, riskli olanlar için onay ister; telefonda `platform` boştur.
- **Platform:** `pc/platform/windows.js` PowerShell'i yalnız `execFile` + `-EncodedCommand` ile ve sabit betikle çalıştırır; uygulama kimlikleri tek tabloda.
- **Onay ve uzak girdi:** `pc/onay.js` aynı anda tek onay, 45 sn zaman aşımı; uzak fare/klavye yalnız "uzak kontrol" açıkken.
- **Eşleştirme:** `pc/eslestirme.js` kodu yeniler / bağlantıyı keser; sır `safeStorage` ile şifreli `sir.bin` içinde saklanır.
- **Şifreli protokol:** `protokol/sunucu.js` (kimliksiz bağlantı tavanı, IP kilidi, sıralı kuyruk) ve `protokol/istemci.js`; `protokol/sifre.js` ECDH P-256 + HKDF-SHA256 + AES-256-GCM (v2, ileri gizlilik).
- **Arayüz:** `arayuz/` Electron penceresinde ve Android WebView'da ortak.
- **Android:** `android/` Capacitor sarmalayıcı; cleartext yalnız yerel adreslere izinli (`network_security_config.xml`), yedekleme kapalı.
- **Yerel ağ sınırı:** sunucu yalnız tepsideki "Telefon bağlantısı" açıkken LAN IPv4 arayüzünde dinler.

## Veri akışı

1. Yerel yol: Kullanıcı → sohbet penceresi → preload (`piril:komut`) → ana süreç → çekirdek köprüsü → çekirdek → platform → PowerShell.
2. Uzak yol: Kullanıcı → telefon arayüzü → protokol istemcisi → (LAN, şifreli ws) → sunucu → çekirdek köprüsü → çekirdek → platform.
3. Riskli eylemler çalışmadan önce bilgisayarda onay; telefondan gelen pano/dosya becerileri uzak kontrol izni olmadan reddedilir.
4. Çekirdek durumu `ctx.depo` ile JSON dosya deposuna yazar; yerel Ollama yalnız ayarda açıksa çağrılır.

## HTML harita

[.archify/architecture-piril-yerel-asistan-20261016-140559/piril-yerel-asistan.html](.archify/architecture-piril-yerel-asistan-20261016-140559/piril-yerel-asistan.html)

Kaynak aday: `.archify/architecture-piril-yerel-asistan-20261016-140559/candidate.json`
