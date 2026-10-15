# Güncelleme ve eski sürüm temizliği (Windows)

## Mekanizma
Güncelleyici (`tool/guncelle.ps1`) yeni paketi kurulum klasörüne kopyalar ama
eski dosyaları silmez. Uygulama bir sonraki açılışta `EskiSurumTemizleyici`
(`lib/guncelleme/eski_surum_temizleyici.dart`) ile yeni sürümde olmayan eski
dosyaları arka planda siler. Yalnızca Windows'ta çalışır.

## Manifestler
- `surum.manifest.json`: güncel sürüm. Biçim: `{surum, dosyalar:[{yol, boyut, sha256}]}`.
  Yollar göreli ve `/` ayırıcılıdır; `..`, mutlak yol, sürücü harfi ve ters bölü reddedilir.
- `eski.manifest.json`: önceki sürümün manifesti (güncelleyici taşır).
- Üretim: `dart run tool/manifest_olustur.dart <klasor> <surum>`.

## Kurallar
1. Yalnızca kendi kurulum klasöründeki, manifestle tanımlı eski dosyalar silinir.
2. Gerçek yol kontrolü yapılır; sembolik bağlantı ve junction izlenmez, atlanır.
3. Kullanıcı verisi ve ilerleme asla silinmez (veri `<appSupport>/adimadim/durum.v1.json`,
   kurulum dışındadır; ayrıca `adimadim/`, `durum.v1.json*`, `.bozuk-*` adları kesin dışlanır).
4. Önce yeni sürüm doğrulanır (her dosya mevcut, boyut ve SHA-256 eşleşir), sonra eski silinir.
5. Güncelleme/doğrulama başarısızsa hiçbir şey silinmez.

## Akış
Güncelleyici: yeni paketi doğrula → uygulama çalışıyorsa kapatılmasını iste ve çık →
`surum.manifest.json`'u `eski.manifest.json` yap → kopyala → hedefte yeniden doğrula
(başarısızsa manifesti geri al, hata ver). Uygulama açılışında temizleyici:
`eski.manifest.json` yoksa `gerekYok`; yeni sürüm doğrulanamazsa `dogrulanamadi` (hiçbir şey silinmez);
aksi halde adaylar (eski − yeni) yol, bağlantı ve SHA-256 denetiminden geçerse silinir,
sonra boş kalan dizinler kaldırılır. Silme hatası yoksa `eski.manifest.json` silinir.
Durum: atlanan ya da hatalı varsa `kismi`, değilse `tamam`.

## Sınırlar
- Kullanıcının değiştirdiği (özeti uyuşmayan) eski dosya silinmez; manifest yine de kaldırılır,
  dosya kalır.
- Çalışan sürümün dosyaları Windows'ta kilitliyse silinemez; hata kaydedilir, manifest kalır, sonraki açılışta yeniden denenir.
- Doğrulama ile silme arasındaki yarış (TOCTOU) tamamen engellenemez.
- Junction/bağlantı denetimi `FileSystemEntity.isLink` ve `resolveSymbolicLinks` karşılaştırmasına dayanır.
- İmza/yetki denetimi yoktur; manifest güvenilir kaynaktan gelmelidir (SHA-256 yalnızca bütünlük sağlar).
- `guncelle.ps1` Windows'ta denenmedi; bu ortamda yalnızca Dart tarafı testlidir.
