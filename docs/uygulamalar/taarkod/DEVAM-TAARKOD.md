# TAARKOD devam notu (2026-10-17)

## Durum
- Son sürüm 1.3.0 (181 + 55 test, verifier Geçti). Windows exe/HTML D:\YusufII\Projeler\TAARKOD\ içinde; yer yönetimini "Eski sürümleri D:'ye taşıma" konusu yürütüyor (D:\Programlar\<ad>\).
- Yarım iş yok. Yusuf haftalık limit yenilenene kadar durdurdu.

## Bekleyen
- Yusuf onayı: sıradaki 3 öneri. Varsayılan sıra: (1) GS1 çözücü sekmesi, (2) CSV'den toplu SVG ZIP paketi, (3) QR şablonları (metin, e-posta, SMS, vCard; hata düzeltme M).
- 1.3.0 Linux (AppImage, deb) ve mac (zip x64/arm64) paketleri proje depolaması dolu olduğundan kaydedilmedi; yer açılınca `cd masaustu-build` akışıyla yeniden derlenir (ayrıntı masaustu/README.md; Linux'ta wine yok, NsisTarget.js isMacOsCatalina yaması gerekir).
- 1.2.2 Linux/mac paketleri cikti/1.2.2 içinde, arşivleme diğer konuda.
- Yusuf'un denemesi gereken: gerçek yazıcı/kamera, Windows kurulum-kaldırma, Excel xlsx, mac/Linux çalıştırma.
- Açık: TAARKOD ad/alan adı kontrolü, GitHub deposu, deb yer tutucu homepage/maintainer (taarkod.invalid), kod imzalama (ücretli), otomatik güncelleme (barındırma adresi).

## Çalışma yöntemi
- node build.js; node --test test/*.test.js (dizin argümanı yok); masaustu/test aynı.
- Sürüm yükseltme: masaustu/package.json (4), package-lock (3, 9), test/ikon.test.js:22, test/main.test.js:111-112, README, ETIKET.md:66.
- Paketleme: scratchpad masaustu-build; teslim 25 MiB parça + cihazda birleştirme + sha256 doğrulama; eski sürüm silinmez, yalnız D: arşivine taşınır / Geri Dönüşüm Kutusu.
- Günlük: .claude/orchestrator-log.md.
