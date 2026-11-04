# Kural: Test dosyalarını temizleme

> **Özet:** Bilgisayarda test için oluşturulan dosyalar iş bitince Geri Dönüşüm Kutusu'na taşınır; kutu doluysa Yusuf'a haber verilir. Sahibi: Yusuf. Kaynak: Yusuf, 2026-10-25 16:42 ve 16:43, tüm oturumlar için. [İP:Hafıza sağlık kontrolü]

## Kural
- Bilgisayarda test amaçlı oluşturduğun dosyaları (deneme klasörleri, test çıktıları, sahte veri) iş bitince temizle.
- Temizleme, Windows Geri Dönüşüm Kutusu'na taşıma demektir; kalıcı silme yoktur (bkz. hafiza-ve-not.md, "Silme biçimi").
- Gerçek veri, kod, kayıt ve notlar kapsam dışıdır; hiçbir koşulda temizlenmez.
- Şüpheli dosyayı silme; iş raporuna yaz, karar Yusuf'un.
- Temizlenen dosyaların listesi iş raporuna ve iş notuna yazılır.

## Dolu Geri Dönüşüm Kutusu
Geri Dönüşüm Kutusu'nun dolduğunu fark eden oturum ya da ajan Yusuf'a haber verir. Kutuyu kendisi boşaltmaz; boşaltma ve kalıcı silme Yusuf'un kararıdır.

Not: Kasada aynı kural `ORTAK-AJAN-KURALLARI.md` sonunda yer alır.
