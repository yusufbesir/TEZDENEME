<!-- Ne: Uygulamalara özel logo/ikon setleri. Sahibi: Logo işi (cmsg SkkDBmKLm konusu). Değiştirme kuralı: yalnız bu işin sahibi değiştirir; uygulama koduna entegrasyonu o uygulamanın sahibi yapar. -->
# Uygulama logoları — kullanım notu
Her klasörde: `ikon.svg` (kaynak), `ikon-512.png`, `ikon-1024.png`, `ikon.ico` (16–256 px, Windows), `ikon.icns` (macOS), `android/mipmap-*/ic_launcher.png` (Flutter/Android).
Üretim: `python3 uret.py` (Pillow + cairosvg). Hepsi TAARKOD ile aynı dilde: yuvarlatılmış kare, düz renk, 16 px'te okunur.

| Uygulama | Renk | Simge |
|---|---|---|
| Dosya Dönüştürücü | mavi + sarı | belge → belge, ok |
| Adım Adım | turuncu | basamaklar ve bayrak |
| Dinamik QR | lacivert + yeşil | QR köşe kareleri, sarı nokta |
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
