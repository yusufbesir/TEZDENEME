---
description: Adım Adım esnek yerleşim ekran görüntülerinin açıklaması (main d84716b, Debug derleme, 2026-10-16)
sahip: Yusuf (yusufbesir)
yazan: "[Claude#cihaz] İP:Adım Adım öğrenme uygulaması"
degistirme: Görüntüler silinmez ve üzerine yazılmaz; yenisi yeni tarihle eklenir. Bu dosyaya yalnız ekleme yapılır; silme yalnız Yusuf kararıyla Geri Dönüşüm Kutusu'na.
---

# Esnek yerleşim ekran görüntüleri (2026-10-16)

## Özet
- Kaynak: main `d84716b` (PR #24), `flutter run -d windows` (Debug), ekran ölçeği %125, ekran 1920x1200 fiziksel.
- Görüntüler yalnız uygulama penceresinden alındı (PrintWindow, DPI farkında).
- **Önemli:** Pencere hiçbir istekte 1222 fiziksel pikselden kısa yapılamadı; dosya adındaki boyutlar istenen boyuttur, gerçek boyut aşağıdadır. Alttaki siyah bant pencerenin ekran dışında kalan kısmıdır.

## Dosyalar
| Dosya | İstenen (fiziksel) | Gerçek pencere | Düzen |
|---|---|---|---|
| 2026-10-16-esnek-480x600.png | 480x600 | 600x1222 | Alt çubuk; etiketleri ekran dışında |
| 2026-10-16-esnek-900x700.png | 900x700 | 900x1222 | Dar ray |
| 2026-10-16-esnek-1600x900.png | 1600x900 | 1600x1222 | Geniş ray + Öğrenci/hedef paneli |

## Gözlem
- Genişlik alt sınırı çalışıyor: 300 ve 480 istendi, 600 fiziksel (480 mantıksal) oldu.
- Üç genişlikte de taşma şeridi ve kesilen metin görülmedi (yalnız Yol sekmesi).
- Diğer sekmeler gezilemedi (gönderilen tıklamaları uygulama almadı).

## Düzeltme (2026-10-16, aynı gün)
- Yukarıdaki "1222 piksel" bulgusu **yanlıştı**: Ölçüm betiğimde PowerShell değişkenlerinin büyük/küçük harf duyarsız olması nedeniyle `$h` (pencere tutamacı) ile `$H` (yükseklik) çakışmıştı. Uygulamada hata yok.
- Hatalı görüntüler silinmedi, Claude'un geçici klasörüne taşındı (scratchpad\hatali-goruntuler).
- Bu klasördeki 3 görüntü düzeltilmiş betikle (per-monitor DPI farkında) yeniden alındı:

| Dosya | İstenen (fiziksel) | Gerçek pencere | Düzen |
|---|---|---|---|
| 2026-10-16-esnek-480x600.png | 480x600 | 600x750 (alt sınır) | Alt çubuk, etiketler görünür |
| 2026-10-16-esnek-900x700.png | 900x700 | 900x750 (yükseklik alt sınırı) | Dar ray |
| 2026-10-16-esnek-1600x900.png | 1600x900 | 1600x900 | Geniş ray + yan panel |

- En küçük boyut doğrulandı: 300x400 istendi, 600x750 oldu (480x600 mantıksal x 1,25). Python + SetProcessDpiAwareness(2) ile bağımsız ölçüm de aynı sonucu verdi.
