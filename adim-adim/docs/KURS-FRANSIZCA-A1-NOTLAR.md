# Fransızca A1 kursu: notlar

Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga11]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

## Kurs

`fransizca-1` (Fransızca A1: Başlangıç), `lib/icerik/fransizca_a1.dart`, ses dili `fr-FR`. 4 ünite x 3 ders (Almanca A1 ile aynı), ders başına 9-10 alıştırma (Dinle, Seçim, Boşluk, Yaz, Sırala, Eşleştir, İşaretle, Tablo). Dilbilgisi ipuçları: 12 (ders başına 1).

## Yeni dil eklemek için dokunulan noktalar

1. `lib/icerik/<dil>_a1.dart` (kurs) ve `lib/icerik/icerik.dart` (import, export, `tumKurslar`).
2. `lib/sozluk/dil_tanimi.dart`: tek satır (kod, ad, kurs öneki, TTS dili, kısa ad). Sözlük dili, paket, filtre çipi buradan gelir.
3. `lib/motor/ders_ogeleri.dart` `kursSesDili`: kurs önekinden okuma dili.
4. `lib/motor/ogrenme_yolu.dart` `_yollar`: öğrenme yolu adı.
5. `lib/ekranlar/sozluk_ekrani.dart` `kursKisaAd`: kurs kısa adı.
6. `lib/icerik/dilbilgisi_ipuclari.dart` (isteğe bağlı).
7. Testler: `icerik_test`, `dil_paketi_test`, `sozluk_test`, `dilbilgisi_ipucu_test`, `ders_ogeleri_test`, yeni `fransizca_a1_test`.

## Kapsam dışı / bilinçli

- Fiil çekimi sözlüğü (`fiil_cekimi.dart`) yalnız Almanca ve İngilizce; Fransızca eklenmedi.
- Görsel kelime ve senaryo tabloları yalnız İngilizce/Almanca (Korece senaryo); Fransızca eklenmedi.
- Soru işareti sözcüğe bitişik yazıldı (Fransızcada normal yazımda boşluklu); cevap karşılaştırmasını etkilemez.
- Yaz cevaplarında aksan toleransı genel değildir; yalnız cevap listesinde ayrıca verilen aksansız yazımlar kabul edilir.
- Windows'ta fr-FR TTS ses paketi kurulu olmalıdır.
