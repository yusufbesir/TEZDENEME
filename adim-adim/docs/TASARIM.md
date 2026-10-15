# Tasarım kararları

İz etiketi: [İP:Adım Adım öğrenme uygulaması#Dwv81f] · Tarih: 2026-10-15

## Özet
- Özgün yön: "basamak" yolu (her ders bir basamak, her ünite bir sahanlık). Maskot, logo ve içerik hiçbir uygulamadan alınmadı.
- Esinlenen yöntemler: kısa dersler ve anında geri bildirim (Duolingo, Busuu, Mimo), görsel ilerleme yolu (Duolingo), aralıklı tekrar kuyruğu (Memrise, Drops), seri ve günlük hedef (hepsi), dinleme/konuşma alıştırmaları (TalkPal, EF Hello), kod boşluğu doldurma (Mimo).
- Renkler OKLCH (algısal düzgün renk uzayı) ile seçildi, sRGB'ye çevrildi, WCAG 2.2 AA kontrastı hesaplandı.

## Renk bilimi
- OKLCH'de L (açıklık) algısal olarak düzgündür; aynı L'ye sahip renkler aynı parlaklıkta görünür. Açık ve koyu tema aynı L kademeleriyle kurulduğundan iki temada renk hiyerarşisi aynıdır.
- Ana renk petrol/teal (h≈200): Duolingo yeşili, Busuu turuncu/mavisi, Memrise mor/sarısı ve Mimo'nun koyu-neon diliyle çakışmaz. Vurgu hardal (h≈85) yalnızca seri, XP ve rozet gibi küçük alanlarda.
- Doğru (yeşil-mavi, h≈165) ve hata (kızıl-turuncu, h≈40) çifti, Okabe-Ito renk körlüğü güvenli paletinin mantığına uyar (kırmızı-yeşil ayrımına dayanmaz). Her geri bildirim ayrıca simge ve metinle verilir; hiçbir bilgi yalnızca renkle taşınmaz.
- Koyu tema saf siyah değil, düşük kromalı koyu petrol zemin (L=0.20); vurgu renklerinin L'si artırıldı, kroması hafif düşürüldü.
- "Renk psikolojisi öğrenmeyi artırır" iddiasının kanıtı zayıf ve tutarsız; renkler okunabilirlik ve marka ayrışması için seçildi, öğrenme etkisi iddia edilmiyor.

## Renk tablosu (kontrast = zemine karşı WCAG oranı)
| Belirteç | Açık tema | Kontrast | Koyu tema | Kontrast |
|---|---|---|---|---|
| zemin | #F7FBFB oklch(0.985 0.004 200) | – | #10171A oklch(0.20 0.012 220) | – |
| yüzey | #EAF2F2 | – | #1D2629 | – |
| metin | #172428 | 15.3 | #E7F1F1 | 15.7 |
| metin ikincil | #526065 | 6.3 | #A4B1B2 | 8.2 |
| ana (petrol) | #007277 | 5.5 | #4FCDCD | 9.4 |
| vurgu (hardal) | #856309 | 5.2 | #F0BB3B | 10.2 |
| doğru | #007E57 | 4.9 | #51DAA7 | 10.3 |
| hata | #BF4306 | 5.0 | #FF8D64 | 8.0 |

Tüm metin renkleri 4.5:1 (AA) üstünde. Ana rengin üstündeki metin: açıkta #FCFCFC (5.6), koyuda #0B181C (9.4).

## Tipografi (OFL lisanslı, Türkçe karakterleri tam)
- Nunito: başlıklar; yuvarlak uçlar, sıcak ton.
- Inter: gövde ve arayüz; ekran okunabilirliği, çok ağırlık.
- JetBrains Mono: kod alıştırmaları.

## Deneyim kuralları
- Dokunma hedefi en az 48 dp, köşe yarıçapı 16, boşluklar 8'in katları.
- Animasyonlar 250 ms'yi aşmaz; sistem "hareketi azalt" ayarına uyulur.
- Seri ve XP ölçülü gösterilir; dış ödülün iç motivasyonu aşındırma riski bilinir.
- Aralıklı tekrar: Leitner 5 kutu (1, 2, 4, 8, 16 gün). Etkisi araştırmalarda mütevazı; abartılmaz.

## Kaynaklar
- Okabe & Ito (2008) renk körlüğü güvenli palet; Cepeda ve ark. (2006) dağıtılmış çalışma meta-analizi; Settles & Meeder (2016) Duolingo yarı ömür regresyonu (ACL P16-1174); WCAG 2.2.
