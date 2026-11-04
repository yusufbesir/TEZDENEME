# Plan: SADE liste (2026-11-04)

Kaynak: /mnt/project-files/oneriler/2026-11-04-yeni-ozellikler/SADE-06-adim-adim.md. Ölçüt: sol menü ve ana ekran büyümez; özgün; tek kişilik, çevrimdışı. Her madde ayrı dal + PR; implementer sonra verifier.

| # | Madde | Mevcut durum (kod taraması) | Yapılacak | Dal |
|---|---|---|---|---|
| 1 | Sirala alternatif sıralar | `Sirala.dogru` tek liste; `Motor` birebir karşılaştırır; 311 Sirala, web kurslarında ~15 belirsiz | `Sirala.kabul` (ek geçerli sıralar) alanı + JSON `kabul`; kontrol herhangi birini kabul eder; belirsiz içeriklere `kabul` eklenir; test | adim-adim/sirala-kabul |
| 2 | Aralıklı tekrar: "bugün N kelime" | SRS zaten var (`Kart.sonraki`, yarı ömür modeli); tekrar ekranı var | Ana sayfadaki mevcut günlük karta tek satır "Bugün tekrar: N kelime" (dokununca tekrar ekranı); `Motor.bugunTekrarSayisi`; yeni kart yok; test | adim-adim/bugun-tekrar |
| 3 | Dikte alıştırma türü | Pratik merkezinde kelime düzeyinde "Dinle ve yaz" var; derslerde dikte türü yok | Yeni tür `dikte` (cümle TTS ile okunur, kullanıcı yazar; `Yaz` normalizasyonu + kelime farkı gösterimi); ders ekranında Yaz girişini yeniden kullanır; en 3 + de 2 derste örnek; test | adim-adim/dikte |
| 4 | Güvenlik: flutter_js zaman aşımı, yedek şema doğrulama | JS: Isolate + timeout + döngü bekçisi zaten var | `OgrenciDurumu.fromJson` için şema doğrulama (tür/aralık/boyut sınırları, bozuk alan → varsayılan, dosya kenara); bozuk JSON testleri; JS zaman aşımı için ek regresyon testi | adim-adim/yedek-sema |
| 5 | Panodan kelime yakalama | Sözlük ekranı ve kelime defteri var | Sözlük ekranı içinde "metin yapıştır" kutusu; bilinmeyen kelimeler sözlüğe göre işaretlenir; dokununca deftere; yeni sayfa yok; test | adim-adim/pano-kelime |
| 6 | Tek akıllı hatırlatıcı | `servis/bildirim.dart` (Windows), günün dersi bildirimi (varsayılan kapalı) | Günde en çok 1 bildirim; saat son çalışma saatlerinin ortancası; ayarlarda tek anahtar; test (saf işlev) | adim-adim/akilli-hatirlatici |
| 8 | TTS hız kaydırıcısı | `servis/ses.dart` flutter_tts | Dinle/Dikte/Dinle-yaz'da 0,7x-1,2x hız; ayar kalıcı; mevcut ses düğmesinin yanında küçük kaydırıcı | adim-adim/tts-hiz |
| 7 | Paket sürüm + SHA256 | İçerik Dart'a gömülü, indirilen paket yok | Şimdilik yapılmaz (uygulanamaz); içerik sürüm numarası README'de | - |

Kurallar: ana sayfa lazy liste testleri kırılgan (yeni kart ekleme); silme yok; testler yalnız ilgili dosya ile, tam paket verifier'da; commit atıfı kurala göre.
