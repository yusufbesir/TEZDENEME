# Konuşma tanıma kurulumu (ÖZELLİK 8.7: telaffuz / konuşma pratiği)

Sahibi Yusuf (yusufbesir). Bu belge cihaz (Windows) kurulumunu anlatır. Konteynerde
Windows ve mikrofon yoktur; gerçek tanıma yalnız cihazda doğrulanır.

## Durum

- Arayüz ve puanlama motor bağımsızdır ve test edilir (`lib/servis/konusma.dart`,
  `lib/motor/telaffuz.dart`, `lib/bilesenler/alistirma/soyle.dart`).
- Gerçek motor: `lib/servis/konusma_sherpa.dart` (`SherpaKonusma`). Çevrimdışıdır.
  Paketler: `sherpa_onnx` 1.13.8 (Windows için `sherpa_onnx_windows` ile gelir) ve
  mikrofon için `record` 6.2.1. Konteynerde `flutter pub get` ve `flutter analyze`
  temiz geçti; Windows derlemesi ve çalıştırma cihazda denenmeli.
- Model yoksa ya da Windows dışındaysa `hazirMi()` false döner; alıştırmada
  "Konuşma tanıma bu cihazda hazır değil" ve "Bu alıştırmayı atla" görünür.

## Model (Yusuf onayıyla indirilecek; depoya EKLENMEZ)

- Ne: sherpa-onnx akışlı (streaming) zipformer İngilizce modeli, örn.
  `sherpa-onnx-streaming-zipformer-en-2023-06-26` (ya da daha küçük
  `sherpa-onnx-streaming-zipformer-en-20M-2023-02-17`).
- Nereden: sherpa-onnx "pre-trained models" sayfası (k2-fsa/sherpa-onnx, GitHub
  Releases `asr-models`). İndirmeden önce Yusuf onaylar.
- Lisans: Apache-2.0 (sherpa-onnx). Model lisansını indirirken model kartından
  da doğrula.
- Boyut (TAHMİN, indirmeden doğrulanmadı): int8 sürümle yaklaşık 100-300 MB; 20M
  model daha küçüktür. Kesin boyut indirme sayfasında kontrol edilmeli.

## Nereye

Windows'ta uygulama destek dizini altında:

```
<uygulama destek dizini>/modeller/sherpa-onnx-streaming-zipformer-en/
  encoder-*.onnx   (int8 varsa o seçilir)
  decoder-*.onnx
  joiner-*.onnx    (int8 varsa o seçilir)
  tokens.txt
```

`<uygulama destek dizini>` genelde `%APPDATA%\<şirket>\<uygulama>` altındadır
(path_provider `getApplicationSupportDirectory`). Farklı bir klasör için
`SherpaKonusma(modelYolu: '...')` verilir (`lib/main.dart`).

## Cihazda doğrulama listesi

1. Model dosyalarını yukarıdaki klasöre kopyala.
2. Uygulamayı Windows'ta çalıştır; sherpa-onnx DLL'leri derlemeyle birlikte gelir.
3. Bir İngilizce A1 dersini aç, "Cümleyi yüksek sesle söyle" alıştırmasında
   mikrofon iznini ver, cümleyi söyle; kelimelerin yeşil/kırmızı gösterildiğini,
   yüzdeyi ve 3 deneme sınırını kontrol et.
4. Model klasörünü geçici olarak yeniden adlandır: "hazır değil" ve "atla"
   yolunu kontrol et.
5. Ayarlar > "Konuşma alıştırmaları" kapalıyken derste bu alıştırmaların
   çıkarıldığını kontrol et.

## Bilinen sınırlar

- Tanıma sonucu büyük harfli ve noktalamasız gelebilir; puanlama bunu
  normalleştirir. Kısaltmalar ("I'm" / "I AM") farklı yazıldığında eşleşmeyebilir.
- Mikrofon akışı (`record` + Windows) cihazda denenmedi.
