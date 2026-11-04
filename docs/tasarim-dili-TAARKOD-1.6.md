---
description: TAARKOD tasarım dili 1.6 önerisi (1.5.0'ın araçlarla güçlendirilmiş hâli): bütünleşik başlık şeridi, iplik ilerleme göstergesi, yeni logo. Kod değiştirmez; uygulayıcı iş parçacıkları kullanır.
sahip: Yusuf
yazan: [Claude#TAARKOD-tasarim]
tags: [tasarim, taarkod, konu/tasarim-dili]
surum: 1.6-uygulandi
tarih: 2026-10-26
degistirme: 1.5.0 belgesi (tasarim-dili-TAARKOD.md) korunur; bu belge onaylanınca yerine geçer, eskisi silinmez.
---
# TAARKOD tasarım dili 1.6

## Güncel durum (2026-10-26)
- 1.6.x uygulandı: 1.6.0 (başlık şeridi, iplik ilerleme göstergesi, yeni logo), 1.6.1 (Yardım en sağda, "Daha fazla" çekmecesi), 1.6.2 (Stitch Şifrele uyarlaması: serif başlık, sekme ikonları, etiket pahı ve çift dikiş).
- Yazı tipi kararı TERSİNE DÖNDÜ: aşağıdaki "Newsreader / Space Mono gömülmez" reddi geçersiz. Yusuf "İçine göm" dedi; 1.7.0'da Newsreader ve Space Mono WOFF2 olarak uygulamaya gömülür (CSP'de yalnız font-src data: eklenir, OFL lisansları dahil).
- Gerçek Windows penceresinde titleBarOverlay kontrolü hâlâ bekliyor.

> Aşağıdaki metin önerinin ilk hâlidir; eski içerik korunur.

## Özet
- 1.5.0'ın ilkeleri korunur (tek vurgu, düz, kartsız, çevrimdışı, hareketsiz, AA kontrast).
- Yeni: başlık şeridi bilgi taşır (aktif iş + iplik ilerleme göstergesi); pencere etkin değilken dikiş soluklaşır.
- Yeni logo: anahtar delikli barkod + koşu dikişi, 3 SVG (ikon, zeminsiz işaret, yatay).
- Stitch'ten alınan 4 fikir, reddedilen 5 fikir (gerekçeleriyle aşağıda).
- Uygulama kodu bu iş parçacığında DEĞİŞMEDİ; uygulayıcı: "Barkod sıra şifreleme uygulaması" (TAARKOD) iş parçacığı.

## 1. Araç doğrulaması (2026-10-26)
| Araç | Sonuç |
|---|---|
| Stitch MCP | Çalışıyor: proje listesi alındı, yeni proje açıldı (`17252524353411601383`), tasarım sistemi üretti. Ekran üretimi (generate_screen_from_text) ilk çağrıda zaman aşımı verdi; üretim arka planda sürdü (bkz. §6). |
| ui-ux-pro-max | Çalışıyor: `python scripts\search.py ... --design-system` çıktı verdi. Önerisi (Swiss/minimalizm, mavi+turuncu, Outfit) TAARKOD markasına uymuyor; yalnız kontrol listesi (kontrast 4.5:1, görünür odak, azaltılmış hareket) alındı. |
| Figma MCP | Bağlı (araç listesinde); bu işte kullanılmadı: logo SVG'si elle ve koda uygun çizildi, Stitch yeterliydi. |
| Gerçek pencerede titleBarOverlay | Bu oturumda DENENMEDİ: boş RAM 0,8 GB (OCR eğitimi çalışıyor), Electron açılmadı. Bekleyen adım, §7. |

## 2. Başlık şeridi (1.5.0 → 1.6)
Şerit zaten pencere çerçevesi (48 px + 3 px dikiş). 1.6 bunu "uygulamanın canlı parçası" yapar:
1. **Sol:** zeminsiz logo işareti (24 px yükseklik, `taarkod-isaret-1.6.svg`) + "TAARKOD" (değişmez).
2. **Orta (yeni):** aktif iş adı, `--ustSoluk`, `--mono`, `--t-s`, en çok 1 satır, taşarsa orta kısaltma. Örnek: `Şifrele · Parti 2026-10-26`. Sürükleme alanı olarak kalır.
3. **Sağ:** Tema, Dil (1.5.0 gibi) + sistem düğmeleri boşluğu (aynı `env(titlebar-area-*)` formülü).
4. **İplik ilerleme göstergesi (yeni):** dikiş çizgisi (3 px) uzun işlemde ilerlemeyi gösterir: tamamlanan kısım düz sarı çizgi, kalan kısım kesik dikiş. Animasyon değil, durum değişimidir (hareketsiz ilkesi korunur). Basamaklı çalışır (en çok %10 adım) = "terzi metresi" hissi. Ekran okuyucu için şerit içinde gizli `role="progressbar"` + `aria-valuenow`.
5. **Pencere etkin değil (yeni):** `:focus-within` yerine ana işlemden gelen `blur/focus` ile `html[data-pasif]`: dikiş %40 saydamlık, şerit metni `--ustSoluk`. Windows'un etkin/pasif başlık davranışıyla uyumlu.
6. Renk/boyut belirteçleri değişmez (`--ust`, `--ustYazi`, `--ustSoluk`, `--ustSimge`, `--ustUstu`). `titleBarOverlay` tarifi 1.5.0 §7 ile aynı; yeni köprü ihtiyacı yok (pasif işareti mevcut `focus/blur` ile sayfada tutulabilir; ana işleme yeni yetki verilmez).

CSS taslağı (uygulayıcı için, yalnız `html[data-masaustu]` altında):
```css
.ust .dikis{height:3px;background:repeating-linear-gradient(90deg,var(--dikis) 0 12px,transparent 12px 20px)}
.ust .dikis i{display:block;height:3px;width:calc(var(--ilerleme,0) * 1%);background:var(--dikis)}
html[data-pasif] .ust .dikis{opacity:.4}
```
(`--ilerleme` JS ile 0-100, 10'ar adım; `i` öğesi dikişin üstünde mutlak konumlu.)

## 3. Bileşen eklemeleri (Stitch'ten uyarlanan)
1. **Çift dikişli etiket kenarı:** barkod etiketinde dış 1 px düz + 3 px içeride 1 px kesik dikiş (1.5.0'da 6 px idi; 3 px daha gerçek kenar dikişi). Mevcut 3 px yarıçap yerine etikete özel **45° 2 px pah** (clip-path) isteğe bağlı; uygulama sadece etikette.
2. **Basamaklı ölçü şeridi ilerlemesi:** liste/parti işlemlerinde kare bloklu ilerleme (4 px aralık) — başlıktaki dikiş göstergesinin aynı dili.
3. **Durum çubuğu (isteğe bağlı):** pencere altında 24 px, `--ust` zemin, `--mono`; yerleşim değişmeyeceği için yalnız "yeni özellik" olarak, onayla.
4. **Rozetler:** `--yuzey2` zemin, solda 2 px sarı "iplik ucu" (öznitelik rozetleri için); şifreli durum rozeti `--ust` zemin + `--ustYazi`.

## 4. Stitch fikirlerinden reddedilenler
| Fikir | Neden |
|---|---|
| Newsreader / Space Grotesk / Space Mono | Çevrimdışı, CSP `default-src 'none'`, yazı tipi gömülmez (ilke 4). Sistem yığını kalır. | (~~geçersiz, 1.7.0'da gömülüyor~~)
| 0 px yarıçap | 1.5.0'da 4 px karar verildi; değiştirmek yerleşimi/algıyı bozar. |
| BÜYÜK HARF mono etiketler ("TAARKOD / ATELIER") | İlke 3: büyük harf etiket yok. |
| Elmas (45°) radyo düğmesi | Tanınırlık/erişilebilirlik; standart radyo kalır. |
| 3 bölmeli (sol/orta/sağ) yerleşim | İlke 7: menü/sekme yapısı korunur. |
| Sarı odak halkası (açık temada) | Krem zeminde `#F4C430` kontrastı < 3:1; `--odak` (#17262B açık, #F4C430 koyu) kalır. |

## 5. Logo 1.6
Fikir 1.5.0'dan korunur (anahtar delikli barkod = şifreleme, sarı koşu dikişi = dokuma etiket) ama çizim sadeleştirildi ve ayırt edicilik arttı:
- **Barkod çubukları** 4 farklı kalınlık; ortadaki geniş çubuk **sarı anahtar deliği** taşır (daire + yamuk, 1.5.0'daki küçük delikten belirgin).
- **Koşu dikişi** altta 6 sarı kesik (3 yerine), şerit dikişiyle aynı oran (36 px iplik / 20 px aralık, 512 tabanında).
- Zemin: kare sürümde `#14513D`, yatay sürümde `#0F3B2E` (şerit rengiyle bütünleşir); işaret sürümü zeminsiz.
- 16 px'te okunurluk: çubuk dokusu + sarı delik 1.5.0 ile aynı kural, deneme: 24 px işaret şeritte okunur (render önizlendi; 16 px favicon denemesi uygulayıcıda).
- Kullanım kuralları 1.5.0 §8 ile aynı (çevresinde %10 boşluk, döndürme/gerdirme yok).
Dosyalar (`D:\YusufII\HAFIZAM1\kasa\notlar\tasarim-TAARKOD-1.6\`): `taarkod-ikon-1.6.svg` (512 kare, uygulama simgesi), `taarkod-isaret-1.6.svg` (zeminsiz, şerit), `taarkod-logo-yatay-1.6.svg` (yazılı; yazı `<text>`, sistem yazı tipi — baskıda yola çevrilmeli). Eski logo `masaustu/build/logo.svg` ve `yedek-1.4/` dokunulmadı.

## 6. Stitch çıktıları
- Proje: "TAARKOD tasarım dili 1.6" (`projects/17252524353411601383`), tasarım sistemi "Sartorial Encryption Atelier" (çam/ecru/sarı iplik, §4'teki fikirleri üretti).
- Ekran üretimi (masaüstü ana pencere) başlatıldı; ilk çağrı zaman aşımına düştü. Yeniden denenmedi (talimat). Ekran görününce bu bölüme eklenir; görünmezse Stitch arayüzünden "TAARKOD tasarım dili 1.6" projesine bakılır.

## 7. Uygulayıcıya notlar ve bekleyenler
1. Uygulama TAARKOD iş parçacığınca yapılır (bu iş kod değiştirmedi). Belirteçler ve `pencere.js` eşleşmesi test edilir (1.5.0 §7 madde 6).
2. Yeni testler: kontrast (şerit orta metni `--ustSoluk` 7.4:1 / 8.5:1 korunur), `data-pasif` yalnız masaüstünde, ilerleme çubuğu `role="progressbar"`.
3. **Gerçek Windows penceresi kontrolü bekliyor:** `D:\Programlar\TAARKOD` içinde yalnız kurulum/taşınabilir exe var (kurulu uygulama `%LOCALAPPDATA%\Programs\TAARKOD`). RAM boşalınca `TAARKOD-Tasinabilir-1.5.0.exe` açılıp `titleBarOverlay` (düğme rengi, sürükleme, çift tık büyütme, Snap Layouts, Tema değişince renk) görsel kontrol edilecek. Bu oturumda yapılmadı, sonuç yazılmadı.
