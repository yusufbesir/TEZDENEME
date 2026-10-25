---
tags: [tasarim, taarkod, konu/tasarim-dili]
surum: 1.5.0
tarih: 2026-10-25
---
# TAARKOD tasarım dili (1.5.0)

Kaynak: `barkod-sifreleme/src/sablon.html` (CSS belirteçleri), `masaustu/pencere.js`, `masaustu/build/logo.svg`. Yusuf beğenirse başka uygulamalara aynı dil uyarlanır (son bölüm).

## 1. Çıkış noktası ve tek unutulmaz detay
Sorun: masaüstünde işletim sisteminin siyah başlık çubuğu uygulamadan kopuk duruyordu. Çözüm: sistem çubuğu gizlenir, uygulamanın kendi üst şeridi pencere çerçevesi olur.

**Tek unutulmaz detay: dikiş izi.** Yusuf'un sektörü (erkek takım elbise) dokuma etiket ve dikiş kültürüdür. Üst şeridin alt kenarında sarı bir koşu dikişi (kesik çizgi) akar; barkod etiketinin kenarı da dikişlidir; logoda aynı iplik vardır. Geri kalan her şey sakin ve düzdür.

## 2. İlkeler
1. Bir vurgu: sarı iplik. Başka dekor yok (gölge, degrade, gradyan arka plan yok; tek istisna dikiş çizgisi).
2. Her şey kart değil: bölümler çizgiyle ayrılır; yuvarlak kart + gölge yığını yok. Yarıçaplar küçük (4 px), etiket 3 px, yalnız balon ve logo 8 px ve üstü.
3. Başlıklar normal yazılır: BÜYÜK HARF etiket ve tek kelimeyi vurgulayan başlık yok. Hiyerarşiyi boyut ve ağırlık kurar.
4. Çevrimdışı: yazı tipi dosyası gömülmez; sistem yığını (Segoe UI Variable, ui-sans-serif ...). CSP `default-src 'none'` değişmez.
5. Hareket yok: açılış animasyonu, geçiş yok. `prefers-reduced-motion` yine de her şeyi kapatır.
6. Erişilebilirlik: tüm metin WCAG AA (>= 4.5:1), alan kenarı >= 3:1, odak halkası 3 px, dokunma hedefi >= 40 px (çoğu 44).
7. Yerleşim ve işlev değişmez: menü/sekme yapısı korunur.

## 3. Renk belirteçleri
Marka: koyu çam, krem, sarı iplik.

| Belirteç | Açık | Koyu | Kullanım |
|---|---|---|---|
| `--kagit` | #F4F4EC | #12201F | sayfa zemini |
| `--yuzey` | #FFFFFF | #1A2B2A | alan, sekme çubuğu, balon |
| `--yuzey2` | #ECEEE4 | #162524 | çökük/ikincil yüzey |
| `--murek` | #17262B | #E7EEE9 | ana metin (14:1) |
| `--soluk` | #4B5C60 | #A7BBB3 | ikincil metin (6.3:1 / 8.3:1) |
| `--cizgi` | #D8DBCE | #2E4442 | ayırıcı çizgi |
| `--kenar` | #76847C | #6F8A82 | alan kenarı (3.9:1) |
| `--cam` | #1E6B52 | #5FC7A0 | ana eylem, bağlantı |
| `--camKoyu` | #14513D | #7FD6B5 | üzerine gelme |
| `--camYazi` | #FFFFFF | #0C1A18 | `--cam` üstündeki metin |
| `--camSoluk` | #E4EFE8 | #1F3733 | seçili satır arka planı |
| `--sari` / `--dikis` | #F4C430 | #F4C430 | sekme göstergesi, etiket şeridi, dikiş |
| `--hata` / `--tamam` | #B3261E / #1E6B52 | #FF9E96 / #7FD9B3 | durum metni |
| `--odak` | #17262B | #F4C430 | odak halkası |
| `--mavi` | #1550B8 | #8DB8FF | yalnız ipucu balonu (i) |
| **`--ust`** | **#0F3B2E** | **#0A1514** | **üst şerit = pencere çerçevesi** |
| `--ustYazi` | #F6F1E3 | #E7EEE9 | şerit metni (11:1 / 15,7:1) |
| `--ustSoluk` | #B7CDC2 | #9DB5AB | şerit etiketleri (7.4:1 / 8.5:1) |
| `--ustSimge` | #F6F1E3 | #E7EEE9 | sistem düğmesi simgeleri |
| `--ustUstu` | rgba(246,241,227,.12) | rgba(231,238,233,.12) | şerit içi üzerine gelme |

Barkod etiketi (beyaz zemin, siyah çubuk) her temada aynı kalır: tarayıcı okuması için.

## 4. Tipografi
Yığınlar: `--yazi` ("Segoe UI Variable Text", "Segoe UI", ui-sans-serif, system-ui ...), `--baslik` (Segoe UI Variable Display ...), `--mono` (ui-monospace, Cascadia Mono, Consolas ...). Gövde 16 px / 1.55.

| Adım | Belirteç | Boyut | Kullanım |
|---|---|---|---|
| xs | `--t-xs` | 0.8125 rem | rozet, uzantı |
| s | `--t-s` | 0.9 rem | not, şerit etiketi |
| m | `--t-m` | 1 rem | gövde |
| l | `--t-l` | 1.125 rem | H1 (marka adı, aralık .05 em), H3 (650) |
| xl | `--t-xl` | 1.375 rem | ayrılmış |
| 2xl | `--t-2xl` | 1.75 rem | H2 (650, aralık -.012 em) |

Ağırlıklar: 400 gövde, 600 etiket/düğme/sekme, 650-700 başlık. Seçili sekme ağırlığı değişmez (düzen kaymasın).

## 5. Boşluk ölçeği
`--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 24, `--s6` 32 px. Sayfa yan boşluğu 20 px (800 px altında 14), içerik genişliği en çok 860 px, bölümler arası 28 px.

## 6. Bileşen kuralları
- **Başlık şeridi (.ust):** `--ust` zemin, altta 3 px sarı koşu dikişi (`repeating-linear-gradient`, 12 px iplik / 8 px boşluk). Solda logo + TAARKOD, sağda Tema ve Dil seçicileri (şeffaf, kenarsız, üzerine gelince `--ustUstu`). Masaüstünde 48 px + 3 px dikiş, sayfa kayarken yapışkan (sürükleme alanı hep görünür).
- **Sekmeler:** metin sekmeleri, 48 px, seçili olanın altında 3 px sarı gösterge; kaydırılan sekme yok, dar ekranda satır kırar. Küçük sekmeler (Kurallar, Önizleme) sağa yaslı.
- **Düğmeler:** ana eylem dolu `--cam`, altında 2 px koyu iç çizgi (dokuma kenar hissi), basılınca düzleşir. İkincil: şeffaf, `--kenar` çerçeve. Kapalı: %50. Yarıçap 4 px.
- **Form alanları:** 44 px, 1 px `--kenar`, 4 px yarıçap, üzerine gelince `--soluk` kenar, odakta 3 px halka.
- **Balonlar (ipucu):** mavi (i) düğmesi ve 2 px mavi çerçeveli balon; tek mavi kullanımı budur. Balon `--yuzey` zeminli, gölgeli (tek gölgeli bileşen).
- **Barkod etiketi:** beyaz, 3 px yarıçap, üstte sarı şerit içinde koyu koşu dikişi, gövdede 6 px içeride kesik çizgili dikiş kenarı.
- **Listeler/yöntemler:** kart değil, çizgili satır; seçili satırın solunda 4 px `--cam` bant.
- **Durum:** hata sol 4 px çizgi + metin (yalnız renk değil), başarı koyu yeşil/açık yeşil metin.

## 7. Pencere bütünleşmesi (Electron tarifi)
1. `BrowserWindow`: `titleBarStyle: 'hidden'` + (Windows/Linux) `titleBarOverlay: { color: --ust, symbolColor: --ustSimge, height: 48 }`; macOS'ta `trafficLightPosition: { x: 18, y: 18 }`. Seçenekler `masaustu/pencere.js` içindedir (tek yerde, test edilebilir).
2. Sayfa Electron user-agent'ını görünce `html[data-masaustu]` (macOS'ta ayrıca `data-mac`) koyar; masaüstü CSS'i yalnız bu işaretin altındadır, web sürümü etkilenmez.
3. `.ust` sürükleme alanıdır (`-webkit-app-region: drag`); seçici, etiket, düğme, bağlantı `no-drag`. Çift tıklama büyütür, pencere kenarından boyutlanır (sistem çerçevesi davranışı korunur).
4. Sağ üstte sistem düğmeleri için boşluk: `padding-right: max(18px, 100vw - env(titlebar-area-x) - env(titlebar-area-width))`; `env()` yoksa 138 px varsayılır. macOS'ta sağ boşluk 18 px, sol 84 px (trafik ışıkları).
5. Tema değişince sayfa `--ust`/`--ustSimge` değerlerini okur ve `window.barkodMasaustu.pencereTema(renk, simge)` ile ana işleme gönderir. Ana işlem: gönderen denetimi (`gonderenKontrol`), iki renk de `^#[0-9a-fA-F]{6}$` değilse yok sayar, doğrulanmış nesneyle `setTitleBarOverlay` çağırır. Köprü başka hiçbir şey kabul etmez.
6. Renk eşleşmesi (`pencere.js` ile HTML belirteçleri) testle denetlenir; belirteç değişirse `pencere.js` de değişmelidir.

Sınırlar: gerçek Windows/macOS penceresi bu ortamda denenmedi; simülasyon (138x48 sistem düğmesi alanı) Chromium'da görüldü. Windows 11 Snap Layouts, `titleBarOverlay` ile çalışır; Linux'ta masaüstü ortamına göre değişir.

## 8. Logo
Fikir: **anahtar delikli barkod**. Barkod = ürün etiketi, anahtar deliği = şifreleme (uygulamanın işi), alttaki sarı koşu dikişi = dokuma etiket (Yusuf'un sektörü). Zemin koyu çam `#14513D`, çubuklar krem `#F6F1E3`, iplik/anahtar deliği sarı `#F4C430`.

Elenen adaylar: (A) kıvrık köşeli dikişli etiket: ayırt edilmesi zor, her etiket simgesine benzer; (C) çubuklardan geçen iplik: 32 px altında sarı çizgi gürültü olur. Seçilen (B/D) 16 px'te bile sarı delik + çubuk dokusu okunur.

Kullanım: kare simgenin çevresinde en az %10 boşluk; döndürme, gerdirme, renk değiştirme yok. Üst şeritte zeminsiz sürüm kullanılır (çubuk + delik, şerit rengine uyan kontur); uygulama simgesi, favicon ve tanıtımda tam kare sürüm. Dosyalar: `masaustu/build/logo.svg` (kaynak), `icon.png` 512, `icon.ico` (16-256), `icon.icns`, `logo/taarkod-ikon.svg`, `logo/taarkod-logo-yatay.svg`. Eski simgeler `masaustu/build/yedek-1.4/` ve `icon.eski.png`.

## 9. Başka uygulamalara uyarlama
1. Sabit kalacaklar: sistem yazı yığını ve ölçek, boşluk ölçeği, 4 px yarıçap, "tek vurgu" kuralı, üst şerit = pencere çerçevesi tarifi, kontrast eşikleri, azaltılmış hareket.
2. Uygulamaya göre değişecekler: `--cam` ve `--ust` (markanın ana ve derin rengi); vurgu rengi (`--sari`) tek kalır. Dikiş izi sektörle ilgili değilse başka bir "iz" ile değiştirilir (ör. ölçü şeridi, kesik çizgi kupon kenarı), ama yine tek olur.
3. Sıra: önce belirteçleri kopyala, sonra şeridi, sonra bileşenleri; son olarak logoyu yeni fikirle çiz (anahtar deliği yalnız şifreleme uygulamalarında anlamlıdır).
4. Her uygulamada testle denetle: belirteç kontrastı, `data-masaustu` kuralları, CSP, `innerHTML/eval/fetch` yokluğu (bkz. `test/tasarim.test.js`, `masaustu/test/pencere.test.js`).
