# 2026-10-15 Barkod sıra şifreleme uygulaması

## Özet
- Barkoddaki sıralı numaraları (1, 2, 3...) bir anahtar kelimenin harf sırasına göre karıştıran küçük bir uygulama yazıldı.
- Tek HTML dosyası, internet gerekmez, Windows'ta tarayıcıda açılır.
- Kriptografik güvenlik değildir; yalnızca sırayı gizler.

## Nasıl çalışır
- Kelimenin harfleri Türkçe alfabe sırasına dizilir; eşit harflerde soldaki önce gelir. Bu sıra bir yer değiştirme planı olur.
- Sıra numarası sabit haneye (varsayılan 6) tamamlanır; rakamlar bu plana göre kaydırılır ve yer değiştirir.
- Ardından iki tur zincirleme karıştırma yapılır; böylece ardışık numaralar birbirine benzemez.
- Her adım tersine çevrilebilir: aynı kelime ve hane sayısıyla kod çözülür. İki numara asla aynı kodu almaz.

## Kullanım
- Anahtar kelime uygulamada elle girilir; hiçbir yere kaydedilmez ve bu nota yazılmadı.
- Tek numara şifreleme/çözme ve aralık için toplu CSV listesi var.

## Dosyalar
- barkod-sifreleme.html (uygulama), src/core.js (algoritma), test/core.test.js (17 test), build.js (HTML'i yeniden üretir).
- Konum: proje dosyaları, barkod-sifreleme klasörü.

## Doğrulama
- 17 birim testi geçti: geri çözme, birebirlik, Türkçe harfler, tekrar eden harfler, sınır değerleri.
- Ayrı denetçi ajanla güvenlik incelemesi yapıldı: kritik bulgu yok.

## Güncelleme: Luhn ve 20 haneli barkod
- Barkod 20 hane: ilk 19 hane şifreli sıra no, son hane Luhn kontrol rakamı. Kontrol rakamı şifrelenmiş 19 haneye göre hesaplanır.
- Çözerken önce Luhn kontrol edilir; tutmazsa barkod hatalı sayılır.
- Uzun sıra numaraları metin olarak işlenir, kayıp olmaz. CSV'de Excel'in 20 haneyi bozmaması için metin biçimi seçeneği var.
