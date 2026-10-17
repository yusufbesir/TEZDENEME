<!-- Ne: Uygulamalara özel logo/ikon setleri. Sahibi: Logo işi (cmsg SkkDBmKLm konusu). Değiştirme kuralı: yalnız bu işin sahibi değiştirir; uygulama koduna entegrasyonu o uygulamanın sahibi yapar. -->
# Uygulama logoları — kullanım notu
Her klasörde: `ikon.svg` (kaynak, yuvarlak köşe), `ikon-tam-kare.svg` + `ikon-ios-1024.png` (iOS/mağaza, köşe yuvarlama yok), `ikon-512/1024.png`, `ikon.ico` (16–256 px), `ikon.icns`, `android/mipmap-*` ve adaptive icon katmanları (`android-on-plan-432.png`, `android-arka-plan-432.png`).
Üretim: `python3 uret.py` (Pillow + cairosvg). Hepsi TAARKOD ile aynı dilde: yuvarlatılmış kare, düz renk, 16 px'te okunur.

| Uygulama | Renk | Simge |
|---|---|---|
| Dosya Dönüştürücü | mavi + sarı | belge siluetinin içinde negatif boşlukla çift yönlü ok |
| Adım Adım | turuncu | basamaklardan kurulan A, tepede güneş |
| Dinamik QR | lacivert + yeşil | QR modülleri çevresinde dönen (yenilenen) çift ok |
TAARKOD kendi logosunu korur (`barkod-sifreleme/logo`). YZ Merkezi'nin logosunu kendi konusu yeniler.

## Entegrasyon (sahibi yapar)
- **Electron (Dosya Dönüştürücü):** `ikon-1024.png` → `build/icon.png`, `ikon.ico` → `build/icon.ico`, `ikon.icns` → `build/icon.icns`; package.json'da `"icon": "build/icon.png"`, pencere için `BrowserWindow({icon})`. Varsayılan Electron ikonu bu yüzden çıkıyor: icon tanımlı değil.
- **Flutter (Adım Adım):** `android/mipmap-*` içeriğini `android/app/src/main/res/` altına kopyala; Windows için `ikon.ico` → `windows/runner/resources/app_icon.ico`.
- Yeni uygulamada önce simge tasarla, sonra `build/` altına koy; ikonsuz exe çıkarma.

## Logo yaparken kullanılacak kaynaklar
- Simge setleri (MIT/açık): Lucide, Tabler Icons, Phosphor, Iconify (200 binden fazla simge, tek API). Lisansı her sette kontrol et (ör. Solar CC BY 4.0, anma ister).
- Esinlenme: Dribbble, Behance (uygulama ikonu/logo aramaları), Mobbin (gerçek uygulama ekranları), Logobook, Brandfetch. Kopyalama değil, dil ve oran için bak.
- Araçlar: SVG elle/kodla (en güvenilir, sürüm kontrollü), Figma, Inkscape, ImageMagick/Pillow ile boyutlama, `png2icons` ile icns.
- Kurallar: tek anlamlı simge, 2-3 renk, 16 px testi, yazı yok (yazı yalnız yatay logoda), koyu/açık zeminde okunurluk.

## Araştırılan logo tasarım kuralları (uygulananlar)
Kaynaklar genel tasarım yazılarıdır, resmi standart değil; ikon ölçüleri için Apple HIG ve developer.android.com esas alınmalı.
- **Tek fikir, basit biçim:** akılda kalan işaret tek bir kavramı anlatır (belge+ok, basamak, yenilenen QR). Kaynaklar: [Cieden](https://cieden.com/book/atoms/logo/principles-of-logo-design), [Visme](https://visme.co/blog/logo-design-principles/), [Self-Made Designer](https://selfmadedesigner.com/principles-logo-design/).
- **Negatif boşlukla anlam (FedEx oku gibi):** Dosya Dönüştürücü'de ok belgenin içine oyuldu, Adım Adım'da basamakların arası A'yı kuruyor.
- **Ölçek testi:** 16/32/64/128/256/512 px'te bak; ince çizgi küçük boyutta lekeye döner. `uret.py` küçük boyut önizlemesi üretir.
- **2-3 renk, yazı yok, köşe yuvarlamayı sen koyma (iOS/Android maskeler):** tam kare sürümü ve Android adaptive katmanları bu yüzden ayrı. Android: 108 dp tuval, ortadaki ~66 dp görünür güvenli bölge; sanat bu alanda tutuldu ([Verpex](https://verpex.com/blog/website-tips/adaptive-icons-and-logos), [MobileAction](https://www.mobileaction.co/guide/app-icon-guide/)).
- **Altın oran/ızgara** isteğe bağlı yardımcıdır, kural değil.
- Yaratıcılık için: önce uygulamanın tek eylemini bir fiille yaz (dönüştür, tırman, yenile), sonra bu fiili basit bir geometriyle (ok, basamak, halka) anlat; clipart simgeyi olduğu gibi kullanma.
