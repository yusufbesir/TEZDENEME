# 2026-10-15 Barkod kuralları, standartlar ve şifreleme yöntemleri

İz etiketi: [İP:Barkod sıra şifreleme uygulaması#ixQ4SM]

## Özet
- Önceki notların devamı: "Barkod sıra şifreleme uygulaması" ve "Barkod Luhn ve 20 hane güncellemesi".
- Barkod artık: önek (varsayılan TO) + şifreli rakamlar + sonda Luhn kontrol rakamı. Standart seçilebilir; uzunluk otomatik önerilir.
- Üç şifreleme yöntemi seçilebilir; karar için açıklama kartları ve ayrı bir araştırma raporu var.

## Yapılanlar
- Barkod standartları: Code 128 (varsayılan), Code 39, Code 93. Üçü de gerçek tarayıcı çözücüsüyle (zxing-cpp) okutuldu.
- En uygun uzunluk: en büyük sıra no ve tahmin direncinden hesaplanır. Code 128'de Luhn dahil çift sayıda rakam en kısa barkodu verir. Örnek: 1 milyon numara için 12 rakam.
- Üretilen grup için 4 örnek barkod görüntüsü (SVG) gösterilir, indirilir, yazdırılır.
- Kural düğmeleri: varsayılana dön, kuralları dosyaya aktar/yükle (anahtar kelime hiçbir zaman dosyaya yazılmaz), yeni seri başlat.
- Şifreleme yöntemleri: harf karıştırma (mevcut, varsayılan), doğrusal, Feistel (önerilen, en güçlü).

## Önemli bulgular
- Harf karıştırmada ardışık numaraların kodları arasında çok az sayıda tekrar eden fark deseni oluşur; doğrusal yöntemde fark tamamen sabittir. Feistel bunu gizler.
- Harf karıştırmada kelimenin yalnızca ilk (rakam sayısı) harfi etkilidir.
- Araştırma raporundaki bazı standart ayrıntıları ağ erişimi olmadığı için doğrulanamadı; raporda işaretli.

## Doğrulama
- 70 birim testi geçti. Ayrı doğrulayıcı ajan güvenlik incelemesi yaptı: kritik bulgu yok.

## Birlikte çalışılanlar
- implementer / claude-sonnet-5-5: şifreleme yöntemleri modülü
- implementer / claude-sonnet-5-5: barkod standartları modülü
- implementer / claude-sonnet-5-5: araştırma raporu
- implementer / claude-sonnet-5-5: arayüz birleştirme
- verifier / claude-sonnet-5-5: bağımsız doğrulama ve güvenlik incelemesi
- Bilgi alınan diğer iş parçacıkları: yok. (Bağımsız denetmen iş parçacığı kuralları PR #8 ile ekliyor.)
