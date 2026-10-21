<!--
DOSYA TANIMI (tüm yapay zekalar için):
- Ne: QR kampanya ve kısa link sisteminin ayrıntılı kullanım rehberi.
- Sahibi: Yusuf. Hazırlayan: Claude (QR kampanya iş parçası) [İP:Dinamik QR ve kampanya sistemi#tnmy6Q].
- Değiştirme kuralı: Okuyabilir, düzeltebilir, ekleme yapabilirsin. Silme yalnızca Yusuf'un kararıyla ve yalnızca Geri Dönüşüm Kutusu'na taşıma olarak yapılır.
-->

# QR Kampanya: kullanım rehberi (Yusuf için)

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

Bu rehber teknik bilgisi olmayan biri için yazıldı. Her işi adım adım anlatır. Daha derin teknik ayrıntı gerektiğinde ilgili belgeye yönlendirir. Örneklerde alan adı olarak `qr.example.com` kullanılır; **kendi alan adınızla değiştirin.**

**İçindekiler**

1. [Sistem ne yapar, temel kavramlar](#1-sistem-ne-yapar-temel-kavramlar)
2. [Kişisel kullanım düzeni: neyi internete açık bırakmalı](#2-kişisel-kullanım-düzeni-neyi-internete-açık-bırakmalı)
3. [İlk kurulum özeti](#3-ilk-kurulum-özeti)
4. [Giriş ve MFA](#4-giriş-ve-mfa)
5. [Günlük işler](#5-günlük-işler-adım-adım)
6. [Link ağacı](#6-link-ağacı)
7. [İstatistikler](#7-istatistikler)
8. [Ayarlar ekranı](#8-ayarlar-ekranı)
9. [API](#9-api)
10. [Eklentiler ve sistem bilgisi](#10-eklentiler-ve-sistem-bilgisi)
11. [Yedekleme, geri yükleme testi ve güncelleme](#11-yedekleme-geri-yükleme-testi-ve-güncelleme)
12. [Güvenlik özeti ve yapılmaması gerekenler](#12-güvenlik-özeti-ve-yapılmaması-gerekenler)
13. [Sorun giderme](#13-sorun-giderme)
14. [Sözlük ve hızlı başvuru](#14-sözlük-ve-hızlı-başvuru)

---

## 1. Sistem ne yapar, temel kavramlar

Sistem, kendi alan adınızda çalışan bir **kısa link ve dinamik QR kod** yönetim panelidir. Bir QR kodun içine her zaman bir **kısa link** yazılır:

```
https://qr.example.com/k/KMP-0001
```

Telefon bu adresi açınca sistem sizi, panelde kayıtlı **hedefe** yönlendirir. Hedefi panelden istediğiniz zaman değiştirebilirsiniz; QR'ı yeniden basmanız gerekmez.

**Önemli kural:** Hedef değişir, **kısa link değişmez**. Kısa link olmadan yönlendirme olmaz: QR'ın içinde hedefin kendisi değil, sistemin kısa linki vardır. Sistem kısa linki görünce hedefe gönderir. Bu yüzden:

- Hedefi değiştirmek basılı QR'ı etkilemez.
- Kısa kod ve alan adı bir kez basıldıktan sonra yıllarca çalışmalıdır (alan adını yenilemeyi unutmayın).
- Bir kısa kod hiçbir zaman başka bir kayda verilmez.

### Temel kavramlar

| Kavram | Anlamı |
|---|---|
| **Kısa link** (`/k/<kod>`) | QR'ın içindeki kalıcı adres. Örn. `https://qr.example.com/k/YAZ-2026`. |
| **QR kod** | Panelde **QR kodlar** listesindeki bir kayıt: kısa kod, ad, hedef, durum, tarihler. QR görseli (PNG veya SVG) bu kayıttan indirilir. |
| **Hedef** | Kısa linkin gideceği yer: "Harici web adresi" (başka bir site) ya da "Sistemdeki sayfa" (kendi kampanya sayfanız). |
| **Kampanya** | QR kodları gruplamak ve ortak başlangıç/bitiş tarihi vermek için kayıt (**Kampanyalar** menüsü). |
| **Ürün**, **Mağaza** | QR kodları ürüne veya mağazaya bağlamak için kayıtlar (**Ürünler**, **Mağazalar** menüleri). |
| **Kampanya sayfası** (`/s/<adres>`) | Sistemde yayınladığınız basit tanıtım sayfası (**Sayfalar** menüsü). Örn. `https://qr.example.com/s/kis-kampanyasi`. |
| **Link ağacı** (`/l/<adres>`) | Tek adreste birkaç düğme bağlantısı gösteren sayfa (**Link ağaçları** menüsü). Örn. `https://qr.example.com/l/yusuf`. |
| **Çöp kutusu** | "Silme" yerine taşıma yeri. **Kalıcı silme yoktur.** Kodlar buradan geri yüklenir. |
| **Arşiv** | Kullanımdan kaldırılmış ama saklanan kodların durumu. |

### Roller

| Rol | Yapabilecekleri |
|---|---|
| **Yönetici** | Her şey: kullanıcı ekleme, rol verme, MFA sıfırlama, **Ayarlar**, **Sistem bilgisi**, **Eklentiler**. |
| **Editör** | QR kod, kampanya, sayfa, ürün, mağaza, link ağacı ekleme/düzenleme/arşivleme; içe/dışa aktarma. |
| **İzleyici** | Yalnızca görüntüleme ve rapor indirme. |

Tek kullanıcı sizseniz **Yönetici** rolündesiniz ve her şeyi görürsünüz. Ayrıntı: [KULLANIM.md](KULLANIM.md).

---

## 2. Kişisel kullanım düzeni: neyi internete açık bırakmalı

Basılı QR'ı müşteri kendi telefonuyla okutur. Bu yüzden **yönlendirme adresleri internete açık kalmak zorundadır**. Yalnızca **yönetim** bölümünü (panel ve API) kendi ağınıza kısıtlayabilirsiniz.

| Adres | Ne işe yarar | Herkese açık olmalı mı? |
|---|---|---|
| `/k/<kod>` | QR yönlendirmesi | **Evet, mutlaka.** Kapanırsa basılı QR'lar çalışmaz. |
| `/k/<kod>+` | İstatistik sayfası (varsayılan kapalı; bkz. bölüm 7) | Açık kalır; ayar kapalıyken yabancıya 404 verir. |
| `/l/<adres>` | Link ağacı sayfası | **Evet.** |
| `/s/<adres>` | Kampanya sayfası | **Evet.** |
| `/saglik`, `/robots.txt`, statik dosyalar, görseller (`/medya/`) | Sistemin kendi ihtiyaçları | Evet, açık kalır. |
| `/panel/` | Yönetim paneli | **Hayır. Varsayılan kapalı;** yalnız izin verdiğiniz ağdan açılır. |
| `/api/` | API | **Hayır. Varsayılan kapalı;** yalnız izin verdiğiniz ağdan açılır. |

### Yönetim varsayılan olarak kapalıdır

Sistem kişisel kullanım içindir: internete **yalnızca kısa linkler** açıktır. Panel (`/panel/`), API (`/api/`) ve kök adres, siz izin verdiğiniz ağı yazana kadar herkese "sayfa bulunamadı" (404) verir; kurulumdan sonra bu ağı bir kez tanımlamanız gerekir:

1. Çıkış IP'nizi öğrenin (örneğin `curl -s https://ifconfig.me`). `scripts/kurulum.sh` etkileşimli terminalde SSH bağlantınızdan türetilen adresi öneri olarak gösterip sorar ve `.env` dosyasına ekler.
2. Elle yapacaksanız sunucuda `.env` dosyasına şunu ekleyin: `YONETIM_IZINLI_AGLAR=203.0.113.5/32`. **`203.0.113.5` yalnız örnektir; 1. adımda öğrendiğiniz kendi IP'nizle değiştirin.** Virgülle birden çok ağ yazılabilir; IPv6 da olur.
3. `docker compose up -d` komutunu çalıştırın.

**IP'niz sabit değilse:** sunucuya bir VPN kurun (ör. WireGuard ya da Tailscale) ve VPN'in özel adres aralığını izinli ağ olarak yazın (örn. `YONETIM_IZINLI_AGLAR=10.8.0.0/24`; aralığı kendi VPN yapılandırmanızdan alın, buradaki değer yalnız örnektir). Panele VPN bağlıyken, VPN'in sunucuya verdiği özel adres üzerinden ulaşırsınız; böylece panel internete açılmaz.

İzinli olmayan bir ağdan `/panel/` ve `/api/` adresleri "sayfa bulunamadı" (404) gösterir. QR yönlendirmesi, link ağacı ve kampanya sayfaları her zaman çalışır. Durum **Sistem bilgisi** ekranındaki "Panel/API ağ kısıtı" satırında görünür (kapalı / izinli ağ sayısı / kısıt yok). Eski davranışı (kısıtsız) yalnız bilinçli olarak `.env` içinde `YONETIM_ERISIMI=acik` yazarak alabilirsiniz; önerilmez.

**Panele giremiyorsanız (kurtarma):** sunucuya SSH ile girin (SSH bu kısıttan etkilenmez), `.env` dosyasına doğru ağı yazın (`YONETIM_IZINLI_AGLAR=...`; aynı anahtar iki kez varsa sonuncusu geçerlidir) ve `docker compose up -d` çalıştırın. Ayrıntı: [GUVENLIK.md](GUVENLIK.md) "Panel ve API erişimi".

---

## 3. İlk kurulum özeti

Kurulum bir kez yapılır. Adımların tamamı [KURULUM.md](KURULUM.md) içindedir; özeti:

1. Bir alan adı alın ve alt alan (ör. `qr.example.com`) için DNS **A kaydı** oluşturun (VPS'in IP adresine).
2. Ubuntu 24.04 bir VPS kiralayın, SSH anahtarı ve güvenlik duvarını ayarlayın.
3. Docker'ı kurun, projeyi sunucuya kopyalayın.
4. `bash scripts/kurulum.sh` komutunu çalıştırın. Betik alan adınızı ve e-postanızı sorar, `.env` dosyasını güçlü parolalarla oluşturur, servisleri başlatır, ilk yönetici hesabını açtırır ve yedek anahtarını bir kez gösterir.
5. Bölüm 5'teki deneme: panelde bir deneme kodu oluşturun, telefonla okutun, hedefi değiştirip yeniden okutun.

`.env` dosyasında (örnek: `.env.example`) **sizin değiştirmeniz gerekenler**:

| Alan | Ne yazılır |
|---|---|
| `SITE_ALAN_ADI` | QR'lara basılacak alan adı (örn. `qr.example.com`) |
| `SITE_ADRESI` | Üretimde alan adının kendisi (HTTPS otomatik); yerel denemede `http://localhost` |
| `DJANGO_ALLOWED_HOSTS` | Aynı alan adı |
| `ACME_EPOSTA` | Sertifika bildirimleri için gerçek e-posta adresiniz |

Gizli değerleri (`DJANGO_SECRET_KEY`, veritabanı parolaları, `MFA_SIFRELEME_ANAHTARI`) betik üretir; **elle yazmayın, kimseyle paylaşmayın.** Kurulum sırasında ekranda **bir kez** gösterilen **yedek özel anahtarını hemen parola yöneticinize kopyalayın**; kaybolursa yedekler açılamaz (bölüm 11).

Panel adresi: `https://qr.example.com/panel/` (yerel denemede `http://localhost/panel/`). Ana adres (`/`) panele yönlendirir.

---

## 4. Giriş ve MFA

MFA, parolaya ek olarak telefonunuzdaki doğrulama uygulamasının 6 haneli kodudur.

### İlk giriş

1. `https://qr.example.com/panel/` adresini açın. **Yönetim paneli girişi** ekranı gelir.
2. **Kullanıcı adı** ve **Parola** alanlarını doldurup **Giriş yap**'a basın. (İlk yönetici hesabını kurulum betiği açtırmıştır; betik hesap açmadıysa sunucuda `docker compose exec app python manage.py yonetici_olustur` çalıştırın.)
3. İlk girişte **İki adımlı doğrulamayı kur** ekranı çıkar. Telefonunuzda Google Authenticator, Microsoft Authenticator veya benzeri bir uygulamayı açıp ekrandaki QR'ı okutun. Okutamazsanız ekrandaki anahtarı uygulamaya elle girin.
4. Uygulamanın gösterdiği 6 haneli kodu **Doğrulama kodu** alanına yazıp **Doğrula ve etkinleştir**'e basın.

### Sonraki girişler

Parolanızdan sonra **İki adımlı doğrulama** ekranı açılır; uygulamadaki kodu yazıp **Doğrula**'ya basın. Oturum 8 saat sürer ve tarayıcıyı kapatınca biter. Çıkmak için menüdeki **Çıkış (kullanıcı adınız)** düğmesini kullanın.

### Hesabım

Menüdeki **Hesabım** sayfasında MFA durumunuzu görür (**MFA kur**, **MFA'yı kapat / sıfırla**) ve **Parolayı değiştir** ile parolanızı yenilersiniz. Parola en az 12 karakter olmalıdır.

### Deneme sınırı

Art arda 5 hatalı giriş denemesinde ilgili kullanıcı+bağlantı 15 dakika kilitlenir. Kilit süre dolunca kendiliğinden kalkar.

### Telefonu kaybederseniz

Başka bir Yönetici varsa **Kullanıcılar** sayfasında satırdaki **MFA sıfırla** bağlantısını kullanır. Tek yöneticiyseniz sunucuda şu komut çalıştırılır, sonra MFA yeniden kurulur:

```bash
docker compose exec app python manage.py mfa_sifirla <kullanici_adi>
```

---

## 5. Günlük işler, adım adım

Menü, giriş yaptıktan sonra sayfanın üstündedir: **Hızlı kısalt**, **Pano**, **QR kodlar**, **Çöp kutusu**, **İçe aktar**, **Kampanyalar**, **Sayfalar**, **Link ağaçları**, **Ürünler**, **Mağazalar**, **İstatistik**, **Hatalı kayıtlar**, **Denetim**, **Ayarlar**, **Kullanıcılar**, **Sistem bilgisi**, **Eklentiler**, **API anahtarlarım**, **Hesabım**. Rolünüze göre bazıları görünmez.

**Pano** ana ekrandır: toplam/aktif/pasif/arşiv/çöp QR sayıları, tarama sayıları, süresi yaklaşan ve dolmuş kayıtlar, günlük tarama tablosu ve **Yedekleme durumu** burada.

### 5.1 Hızlı kısalt ile tek link kısaltma ve QR indirme

1. Menüden **Hızlı kısalt**'a girin.
2. **Uzun adres (URL)** alanına adresi yapıştırın (`https://` ile başlamalı; yazmazsanız eklenir).
3. İsteğe bağlı: **Kısa kod (isteğe bağlı)** (boşsa otomatik üretilir) ve **Başlık (isteğe bağlı)** (boşsa ve ayar açıksa sistem hedef sayfanın başlığını çekmeye çalışır).
4. **Kısalt**'a basın.
5. **Kısa link hazır** ekranı açılır: QR önizlemesi, **PNG indir** ve **SVG indir** düğmeleri, kısa link ve **Kopyala** düğmesi, paylaşım kutusu. Altta **Bir tane daha** formu vardır; **QR ayrıntıları** düğmesi kaydın detay sayfasını açar.

Sistem aynı hedef başka bir kodda varsa (Ayarlar'da uyarı açıksa) ilk gönderimde kaydetmez, hangi kodlarda kullanıldığını yazar. Yine de kaydetmek için çıkan **Yine de kaydet** kutusunu işaretleyip tekrar **Kısalt**'a basın.

**PNG mi SVG mi?** PNG ekran/ofis çıktısı, SVG matbaa ve büyük baskı içindir. **Baskıdan önce QR'ı telefonla okutup doğru sayfanın açıldığını kontrol edin.** Baskıda en az 2 × 2 cm boyut ve çevresinde beyaz boşluk bırakın.

### 5.2 Yer imi düğmesini tarayıcıya ekleme ve kullanma

Bu düğme, gezdiğiniz herhangi bir sayfayı tek tıkla **Hızlı kısalt** formuna doldurur.

1. **Hızlı kısalt** sayfasının altındaki **Yer imi düğmesi** bölümüne inin.
2. **Kısalt (yer imi)** düğmesini tarayıcınızın yer imleri çubuğuna **sürükleyin**. Sürükleyemiyorsanız **Yer imi kodu** kutusundaki kodu **Kodu kopyala** ile kopyalayıp yeni bir yer iminin adres alanına yapıştırın.
3. Kullanmak için herhangi bir sayfadayken yer imine tıklayın. Panel yeni pencerede açılır; adres ve başlık önceden doludur.
4. Kontrol edip **Kısalt**'a basın. **Hiçbir şey kendiliğinden kaydedilmez.**

Notlar: Panel sayfasında düğmeye tıklamak bir şey yapmaz (yalnızca yer imi olarak çalışır). Giriş yapmadıysanız önce giriş sayfası açılır. Bazı siteler yer imi betiklerini engeller. Panel adresi değişirse düğmeyi yeniden ekleyin.

### 5.3 Ayrıntılı QR oluşturma

1. **QR kodlar** > **Yeni QR kod**.
2. Alanlar:

| Alan | Açıklama |
|---|---|
| **kısa kod** | QR'a yazılacak kalıcı kod (örn. `KMP-0001`). Boşsa otomatik üretilir. **Kaydedildikten sonra değiştirilemez.** Bazı kelimeler (`admin`, `panel`, `api`, `k`, `s` vb.) kullanılamaz. |
| **QR kod adı** | Listede görünen ad. |
| **hedef başlığı** | Hedefi tanımlayan isteğe bağlı başlık. |
| **tür** | Kampanya, Ürün, Mağaza, Bilgilendirme, Diğer, Kısa link. |
| **ürün**, **kampanya**, **mağaza / şube** | İsteğe bağlı bağlantılar. |
| **yönlendirme türü** | "Harici web adresi" (**hedef URL** yazılır) veya "Sistemdeki sayfa" (**hedef sayfa** seçilir). |
| **başlangıç**, **bitiş**, **bitiş sonrası adres** | Tarih kuralları (aşağıda). |
| **durum** | Aktif, Pasif, Arşiv. |
| **açıklama**, **etiketler** | Etiketleri virgülle ayırın. |

3. **Kaydet**'e basın. Detay sayfasında QR önizlemesini görür, **PNG indir** / **SVG indir** ile indirirsiniz.

**Tarih kuralları**

- QR'ın kendi **başlangıç**/**bitiş** tarihi yoksa bağlı kampanyanın tarihleri kullanılır.
- Henüz başlamadıysa ziyaretçi "Kampanya henüz başlamadı" sayfasını görür (ya da **Ayarlar**'da verdiğiniz adrese gider).
- Bittiyse önce QR'daki **bitiş sonrası adres**e, o yoksa **Ayarlar**'daki "bitmişse yönlendirilecek adres"e gider; ikisi de yoksa "Kampanya sona erdi" sayfası gösterilir.
- Saat dilimi Europe/Istanbul'dur. Yalnızca tarih yazılan toplu içe aktarma bitişlerinde o günün sonuna kadar geçerlidir.

Hedef adresler yalnızca `http`/`https` olabilir; yerel/özel IP adresleri ve kullanıcı:parola içeren adresler reddedilir. Kayıtta "uluslararası karakter" (IDN) uyarısı çıkarsa adresi dikkatle kontrol edin.

### 5.4 Hedefi değiştirme ve hedef geçmişi

**Detay sayfasından:**

1. **QR kodlar** listesinde kısa koda tıklayın.
2. **Düzenle**'ye basın.
3. **hedef URL**'yi (ya da **hedef sayfa**yı) değiştirin; isterseniz **değişiklik notu** yazın.
4. **Kaydet**. Değişiklik hemen geçerli olur.
5. Kontrol için detay sayfasındaki **Hedefi test et (yeni sekme)** düğmesini kullanın.

**Listeden satır içi:** satırdaki **Düzenle**'ye basınca satırın altında küçük form açılır (**Ad**, **Başlık**, harici hedefli kodlarda **Hedef URL**). **Kaydet** sayfayı yenilemeden günceller, **Vazgeç** kapatır. Sayfa hedefli kodlarda hedef bu yolla değişmez; detaydaki **Düzenle**'yi kullanın. Arşivdeki ve çöp kutusundaki kodlar satır içi düzenlenemez.

**Hedef geçmişi:** detay sayfasının altındaki **Hedef geçmişi** tablosu eski hedef, yeni hedef, kullanıcı, zaman ve notu gösterir. Her hedef değişikliği ayrıca **Denetim** kaydına yazılır.

### 5.5 Listede arama, filtre, sıralama, sayfa boyutu, dışa aktarma

**QR kodlar** sayfasının üstündeki formda:

- **Ara (kod, ad, başlık, ürün, kampanya, etiket)** kutusu ve **Arama alanı** (Hepsi, Kısa kod, Ad, Başlık, Hedef URL).
- Filtreler: **Tür**, **Durum**, **Kampanya**, **Mağaza**, **Ürün**, **Tarama en az / en çok**, **Oluşturma: bu tarihten sonra / önce (dahil)**.
- **Sayfa boyutu**: 25, 50, 100 veya 200.
- Filtreleri seçip **Filtrele**'ye basın.
- **Sıralama:** tablo başlıklarına (Kısa kod, Ad, Başlık, Hedef, Tarama, Oluşturulma) tıklayın; tekrar tıklamak yönü çevirir.
- **CSV indir** ve **Excel (.xlsx) indir** düğmeleri, **o anki filtre ve sıralamayla** tüm eşleşen kayıtları indirir (sayfa boyutundan bağımsız). CSV `;` ile ayrılır (Türkçe Excel uyumlu).

Çöp kutusundaki kodlar varsayılan olarak listede görünmez; **Durum** filtresinden "Çöp kutusunda" seçilir.

### 5.6 Toplu içe aktarma (CSV/Excel) ve toplu QR ZIP

1. Menüden **İçe aktar**'a girin. Önce **Örnek CSV indir** veya **Örnek Excel indir** ile örnek dosyayı alın ve verinizi bu biçimde hazırlayın. İlk satır sütun başlıklarıdır.
2. **CSV (.csv) veya Excel (.xlsx) dosyası** alanından dosyayı seçip **Yükle ve devam et**'e basın (sınırlar sayfada yazar: en fazla 5 MB ve 20.000 satır).
3. **Sütun eşleştirme** ekranı: her sütun için bir sistem alanı seçin; kullanılmayacaklar "(yok say)" kalır. Çoğu otomatik eşleşir. Hedef için `hedef_url` veya `sayfa` eşleşmelidir. **Eşleştir ve doğrula**'ya basın.
4. **İçe aktarma onayı** ekranı (önizleme) şunları sayar: oluşturulacak, güncellenecek aday, değişiklik yok, hatalı satır.
   - **Hatalı satırlar** içe aktarılmaz; **Hata listesini CSV indir** ile alıp düzeltebilirsiniz.
   - **Uyarı:** "N satırın hedef adresi zaten başka kodlarda kullanılıyor" uyarısı bilgi amaçlıdır, engellemez.
   - Sistemde zaten olan kodlar, **Mevcut N kaydı güncelle** kutusunu siz işaretlemedikçe **değiştirilmez**.
   - Vazgeçerseniz **İptal et** ya da **Eşleştirmeyi değiştir**.
5. **İçe aktar**'a basın. Büyük dosyalar birkaç dakika sürebilir; sayfayı kapatmayın.
6. **İçe aktarma sonucu** ekranında sayılar görünür. **Raporu CSV indir** raporu, **PNG + SVG ZIP indir** oluşturulan QR görsellerini ZIP olarak verir.

Yarım kalan içe aktarmalar **İçe aktar** sayfasında "Bekleyen içe aktarmalar" altında **Devam et** ile görünür (24 saat sonra kalkar); tamamlananlar "Son tamamlananlar" altında **Raporu aç** ile açılır. Tarih biçimleri: `2026-10-01`, `01.10.2026`, `2026-10-01 14:30`.

**Mevcut kodların toplu ZIP'i:** **QR kodlar** listesinde kutuları işaretleyip **Seçilenleri ZIP indir** düğmesine basın (en fazla 1.000 kod).

### 5.7 Paylaşım kutusu

QR detay sayfasında ve **Kısa link hazır** ekranında bulunur: **Kısa link** kutusu ve **Kopyala**, **WhatsApp ile paylaş**, **E-posta ile paylaş**, **X'te paylaş**, **QR PNG indir**. Bunlar yalnızca bağlantıdır; harici izleme betiği yoktur.

### 5.8 Çöp kutusu: taşıma ve geri yükleme

**Kalıcı silme yoktur.** "Silmek" yalnızca çöp kutusuna taşımaktır.

**Taşıma:**

1. QR detay sayfasında (veya listede kutuları işaretleyip) **Çöp kutusuna taşı**'ya basın.
2. Onay sayfasında **Evet, çöp kutusuna taşı**'ya basın.

Çöpteki kod taranınca "Kullanımda değil" sayfası görünür (HTTP 410). Düzenlenemez; önce geri yüklenmelidir.

**Geri yükleme:**

1. Menüden **Çöp kutusu**'na girin. Liste, çöpe taşınma zamanını ve önceki durumu gösterir.
2. Satırdaki **Geri yükle**'ye basın; ya da kutuları işaretleyip **Seçilenleri geri yükle**'ye basın (en fazla 1.000).
3. Kod, çöpe atılmadan önceki durumuna döner. Detay sayfasında **Çöp kutusundan geri yükle** düğmesi de vardır.

Pano'daki "Çöp kutusundaki QR kod" sayısı çöpteki kodları gösterir.

### 5.9 Arşiv ve pasif farkı

| | **Pasif** | **Arşiv** |
|---|---|---|
| Amaç | Geçici durdurma | Kalıcı olarak kullanımdan kaldırma, kayıt saklanır |
| Taranınca | "Kullanımda değil" sayfası (HTTP 200) | "Kullanımda değil" sayfası (HTTP 410) |
| Satır içi düzenleme | Yapılabilir | Yapılamaz |
| Aynı hedef uyarısı | Sayılır | Sayılmaz (arşivdekiler uyarıya dahil edilmez) |

Durumu detay sayfasındaki **Aktif yap**, **Pasif yap**, **Arşivle** düğmeleriyle ya da listede kutuları işaretleyerek değiştirirsiniz. Arşivleme önce bir onay sayfası gösterir (**Evet, arşivle**). Arşivdeki kod daha sonra yeniden **Aktif yap** ile açılabilir.

### 5.10 Kampanya sayfası oluşturma (kısaca)

**Sayfalar** > yeni sayfa: başlık, açıklama, kapak görseli, ürün görselleri (JPG/PNG/WebP, en fazla 5 MB), tarihler, koşullar, buton, SEO alanları, renk teması. **sayfa adresi** (örn. `kis-kampanyasi`) kalıcıdır, sonradan değişmez. Önce **Taslak** kaydedip **Önizle (yeni sekme)** ile bakın, sonra durumu **Yayında** yapın. Bir QR'ın **yönlendirme türü**nü "Sistemdeki sayfa" yapıp bu sayfayı seçin. Ayrıntı: [KULLANIM.md](KULLANIM.md) bölüm 7.

### 5.11 Hatalı kayıtlar ve Denetim

- **Hatalı kayıtlar**: aynı hedefi paylaşan kodlar, geçersiz hedefler, yayında olmayan sayfaya giden kodlar, bitişi geçmiş ama hâlâ aktif kodlar.
- **Denetim**: kimin, ne zaman, ne yaptığının değiştirilemez kaydı.

---

## 6. Link ağacı

Link ağacı, tek adreste (`https://qr.example.com/l/<adres>`) birkaç bağlantıyı düğme olarak gösteren mobil uyumlu sayfadır (örneğin Instagram biyografisi için).

### Oluşturma

1. **Link ağaçları** > **Yeni link ağacı**.
2. Alanlar: **ağaç adresi** (3-64 karakter; küçük harf, rakam, tire, alt çizgi; **sonradan değiştirilemez**), **başlık**, **kısa açıklama**, **tema** (Açık / Koyu), **vurgu rengi** (renk seçici), **durum** (Taslak / Yayında).
3. **Kaydet**. Ağacın **ayrıntı** sayfası açılır.

### Bağlantı ekleme

Ayrıntı sayfasındaki **Bağlantı ekle** formunda iki yoldan birini kullanın (ikisi birden olmaz):

- **var olan kısa link** listesinden bir kod seçin; ya da
- **ya da adres (URL)** alanına bir adres yazın. Sistem bu adres için yeni bir "Kısa link" kodu oluşturur.

İsteğe bağlı **düğme yazısı** girin, **Ekle**'ye basın. Aynı hedef başka kodda varsa onay kutusu çıkabilir. En fazla 100 öğe eklenir. Her düğme `/k/<kod>` üzerinden geçtiği için tıklamalar normal tarama olarak sayılır.

### Sıralama, gizleme, düğme yazısı, çıkarma

**Bağlantılar** tablosunda her satırda:

- **Düğme yazısı** kutusu + **Kaydet**: yazıyı değiştirir.
- **Yukarı** / **Aşağı**: sırayı değiştirir.
- **Gizle** / **Göster**: düğmeyi sayfada gizler veya gösterir.
- **Çıkar**: düğmeyi ağaçtan çıkarır (kısa link silinmez).

**Herkese açık** sütunu düğmenin sayfada görünüp görünmediğini ve nedenini söyler. Pasif, arşivdeki, çöpteki, başlamamış veya bitmiş kısa linkler sayfada otomatik gizlenir.

### Yayına alma, önizleme, çöp kutusu

- **Önizle (yeni sekme)**: taslak dahil her durumu yalnızca panelde gösterir, görüntüleme saymaz.
- **Yayınla**: ağacı yayına alır. Yayındayken düğme **Taslağa al** olur. Taslak, çöpteki ve olmayan ağaç herkese açık adreste 404 verir.
- **Yayındaki sayfayı aç** yayındaki gerçek sayfayı açar.
- **Çöp kutusuna taşı**: ağaç silinmez; adresi 404 verir. Listede **Durum** filtresinden görülür; ayrıntı sayfasındaki **Geri yükle** ile önceki durumuna döner.
- **Düzenle** başlık, tema, renk vb. değiştirir (adres hariç).

### Ağacın QR'ı ve kısa linki

Ayrıntı sayfasındaki **Ağacın QR kodu ve kısa linki** bölümünde:

- QR (**PNG indir** / **SVG indir**) doğrudan `/l/<adres>` adresini içerir; bu QR'ın taramaları kısa link üzerinden **sayılmaz**.
- Taramaları saymak istiyorsanız **Ağaç için kısa link oluştur** düğmesine basıp çıkan kısa linkin QR'ını kullanın.

### İstatistik

Ayrıntı sayfasındaki **Görüntüleme** bölümü toplam ve son 30 günlük görüntüleme grafiğini verir (bot ve HEAD istekleri sayılmaz; IP/tarayıcı kimliği saklanmaz). **Tıklama (QR tarama)** sütunu her düğmenin kısa linkine ait bot hariç toplam taramayı gösterir. Ayrıntı: [KULLANIM.md](KULLANIM.md) bölüm 9e.

---

## 7. İstatistikler

### Rapor ekranı

Menüden **İstatistik**'e girin (**İstatistik raporu**). Üstte **Başlangıç** / **Bitiş** tarihlerini seçip **Uygula**'ya basın. Sayfada: zaman grafiği, en çok taranan kodlar, **Yönlendiren siteler**, **Ülkeler** ve kampanya/mağaza/ürün bazında tablolar bulunur. Tablolarda **CSV** ve **Excel** dışa aktarma düğmeleri vardır. Tek bir kodun grafiği o kodun detay sayfasındaki **Tarama grafiği** bölümündedir.

### Bot hariç/dahil, tekil tahmini

- Varsayılan olarak **botlar hariç** sayılır (bağlantı önizleyicileri ve otomatik tarayıcılar ayrı gösterilir).
- Rapor sayfasında **Botları toplama dahil et** kutusunu işaretleyip **Uygula**'ya basarsanız bot taramaları da toplanır. QR detay sayfasında aynı seçenek **Botları dahil et** adıyla grafiğin üstündedir.
- **Tahmini tekil ziyaret**, aynı gün içindeki tekrarları ayıklayan bir tahmindir; **kesin kişi sayısı değildir**.

### Grafik aralıkları

Hazır aralık düğmeleri: **Son 24 saat** (saatlik), **7 gün**, **30 gün** (günlük), **Tüm zamanlar** (günlük; uzunsa haftalık). Saat dilimi Europe/Istanbul'dur. Rapor sayfasındaki grafik tüm QR'ları kapsar ve tarih formundan bağımsızdır.

### Yönlendiren siteler

Taramayı getiren sayfanın **yalnızca alan adı** gösterilir (yol ve sorgu saklanmaz). QR okutma çoğunlukla yönlendiren bilgisi göndermez; "yönlendiren bilgisi olmayan" sayısı tablonun altında ayrıca yazılır.

### Ülke

Ülke bilgisi varsayılan olarak **boştur**. Dolması için MaxMind'ın ücretsiz **GeoLite2 Country** dosyasını (`GeoLite2-Country.mmdb`) **kendiniz** indirip sunucuya koymanız ve `.env` içinde `GEOIP_VERITABANI`'nı ayarlamanız gerekir. Lisans koşullarını kabul etmek ve adımlar için bkz. [KULLANIM.md](KULLANIM.md) bölüm 9c. Dosya yoksa ülke boş kalır; yönlendirme etkilenmez.

### `kod+` herkese açık istatistik

Kısa linkin sonuna `+` eklenirse (`https://qr.example.com/k/YAZ-2026+`) o kodun sade istatistik sayfası açılır; `+all` aynı hedefe giden tüm kodların toplamını gösterir. Bu özellik **varsayılan KAPALIDIR**: **Ayarlar**'daki **herkese açık istatistik sayfası** kutusu işaretlenirse çalışır. Kapalıyken girişli kullanıcıyı panel ayrıntısına yönlendirir, diğer herkes 404 görür. Yönlendiren site ve ülke tabloları yalnızca son 30 günü kapsar ve o dönemde en az 10 tarama yoksa gösterilmez; sayfa 60 sn önbelleklenir. Açarsanız kısa kodu bilen herkes o kodun sayılarını görür; hedef adres ayrı ayarla gizlidir (bölüm 8).

---

## 8. Ayarlar ekranı

Menüden **Ayarlar** (yalnızca Yönetici) > **Genel ayarlar** formu. Değiştirince **Kaydet**'e basın.

| Ayar | Ne işe yarar |
|---|---|
| **marka adı** | Ziyaretçiye gösterilen bilgi sayfalarında görünen ad. |
| **pasif kod mesajı** | Pasif/arşiv/çöp koda gelen ziyaretçiye gösterilen metin ("Kullanımda değil" sayfası). |
| **başlamamış kampanya mesajı** | Henüz başlamamış koda gelene gösterilen metin. |
| **başlamamışsa yönlendirilecek adres** | Doluysa mesaj yerine bu adrese gidilir. |
| **bitmiş kampanya mesajı** | Süresi dolmuş koda gelene gösterilen metin. |
| **bitmişse yönlendirilecek adres** | Doluysa (ve QR'ın kendi bitiş sonrası adresi yoksa) süresi dolmuş kodlar bu adrese gider. |
| **geçersiz kod mesajı** | Olmayan bir kısa kod açılınca gösterilen metin (404 sayfası). |
| **"süresi yaklaşıyor" uyarısı (gün)** | **Pano**'da "Süresi yaklaşanlar" için kaç gün önceden uyarılacağı. |
| **ayrılmış kodlar** | Kısa kod olarak verilemeyecek ek kelimeler (satır veya virgülle). Yerleşik kelimeler (`admin`, `panel`, `api`, `k`, `s`, `saglik`, `static`, `media`, `giris`, `cikis`, `robots`, `favicon`) her zaman ayrılmıştır. Yalnızca yeni kodlar denetlenir. |
| **aynı hedef uyarısı** | Açıksa yeni kod oluştururken aynı hedef başka kodda varsa "Yine de kaydet" onayı ister. |
| **başlığı otomatik çek** | Açıksa başlık boş bırakılan yeni kayıtlarda sunucu hedef sayfanın başlığını çekmeye çalışır. Başarısız olursa başlık boş kalır, kayıt engellenmez. Bunu kapatmak, sunucunun dış sitelere hiç istek yapmamasını sağlar. |
| **otomatik kod biçimi** | Kısa kod boş bırakılınca üretilecek biçim: **Rastgele** (varsayılan; tahmin edilmesi zor) veya **Sıralı** (`100`, `101`, … taban-36). Sıralı kodlar tahmin edilebilir; gizli olması gereken linklerde rastgele kullanın. Kendi yazdığınız kodlar bundan etkilenmez. |
| **herkese açık istatistik sayfası** | `/k/<kod>+` adreslerini herkese açar (varsayılan kapalı). |
| **herkese açık istatistikte hedef adresi göster** | Açıksa herkese açık istatistik sayfasında hedef URL de görünür (varsayılan kapalı). |

Ayar değişiklikleri **Denetim** kaydına yazılır.

---

## 9. API

API, betiklerin panel dışından kısa link oluşturması ve sorgulaması içindir. Tek adres: `https://qr.example.com/api/v1/`. Tüm ayrıntı, hata kodları ve eylemler için bkz. [API.md](API.md).

### Anahtar oluşturma

1. Menüden **API anahtarlarım**'a girin.
2. **Yeni API anahtarı**'na basın, bir ad yazın ve **mevcut parolanızı** girin; iki adımlı doğrulamanız açıksa **doğrulama kodunu** da girin. En fazla 10 aktif anahtarınız olabilir.
3. Anahtar **yalnızca bir kez** gösterilir: **Kopyala**'ya basıp hemen parola yöneticinize kaydedin. Kaybederseniz anahtarı **İptal et** ile iptal edip yenisini oluşturun.

Anahtar sizin yetkilerinizle çalışır. Sızdığından şüpheleniyorsanız listedeki **İptal et** bağlantısıyla hemen iptal edin. Parolanız değişince, MFA'nız sıfırlanınca, rolünüz değişince veya hesabınız pasifleştirilince bütün anahtarlarınız otomatik iptal edilir; yenilerini oluşturmanız gerekir.

### Kullanım örnekleri (curl)

Kısa link oluşturma (yalnızca POST):

```bash
curl -s -X POST https://qr.example.com/api/v1/ \
  -H "Authorization: Bearer <ANAHTAR>" \
  -d action=shorturl -d url=https://ornek.com/kampanya -d keyword=YAZ-2026 -d title="Yaz kampanyası"
```

Bir kodun hedefini sorgulama:

```bash
curl -s -H "Authorization: Bearer <ANAHTAR>" \
  "https://qr.example.com/api/v1/?action=expand&shorturl=YAZ-2026"
```

Diğer eylemler: `url-stats`, `stats`, `db-stats`, `version`. API ile kod silinemez veya düzenlenemez; yalnızca oluşturma ve okuma vardır.

### Parolayla giriş (isteğe bağlı, varsayılan kapalı)

Anahtar yerine kullanıcı adı ve parolayla girmek için önce **API anahtarlarım** sayfasındaki **Parola girişini aç** düğmesini kullanın (**Mevcut parola** istenir). MFA'nız açıksa her istekte **MFA kodu** (`totp`) da gerekir ve aynı kod ikinci kez kabul edilmez:

```bash
curl -s -X POST https://qr.example.com/api/v1/ \
  -d action=db-stats -d username=<KULLANICI> --data-urlencode password=<PAROLA> -d totp=<KOD>
```

Parola ve `totp` yalnızca POST gövdesinde gönderilir. Anahtar kullanmak daha güvenlidir; parola girişini yalnızca gerekirse açın, işiniz bitince **Parola girişini kapat** ile kapatın.

### CORS (tarayıcıdan erişim)

Varsayılan olarak tarayıcıdaki başka bir siteden API çağrılamaz. Gerekirse `.env` içinde `API_CORS_KOKENLERI=https://uygulama.example.com` (virgülle birden çok; `*` kabul edilmez) yazın ve uygulamayı yeniden başlatın. Anahtarı herkese açık bir web sayfasına **gömmeyin**.

---

## 10. Eklentiler ve sistem bilgisi

Her iki ekran yalnızca **Yönetici**'ye görünür ve **salt okunurdur**.

- **Sistem bilgisi**: uygulama sürümü, Python, Django, PostgreSQL sürümleri, son migration, Docker imaj etiketi/digest'i ve "Panel/API ağ kısıtı" durumu. Bu sayfa internete bağlanmaz.
- **Eklentiler**: sunucudaki eklenti dosyalarını, etkin olup olmadıklarını ve bağlandıkları olayları listeler. Panelden eklenti yüklenemez veya açılıp kapatılamaz; eklentiler `.env` içindeki `QR_EKLENTILER` ile sunucuda açılır ([EKLENTILER.md](EKLENTILER.md)). **Eklenti sunucuda tam yetkiyle çalışır; kodunu okuyup güvenmediğiniz hiçbir eklentiyi eklemeyin.** Varsayılan: hiçbiri etkin değildir.

### Yeni sürüm var mı? (elle denetim)

Sistem kendi kendine güncelleme kontrolü yapmaz ve hiçbir şeyi otomatik güncellemez. Elle bakmak için sunucuda:

```bash
bash scripts/surum-denetimi.sh              # çevrimdışı: kullanılan sürümleri listeler
bash scripts/surum-denetimi.sh --cevrimici  # ayrıca daha yeni sürüm var mı diye salt okunur sorgular
```

Betik hiçbir şeyi değiştirmez. Önerilen sıklık: ayda bir. Ayrıntı: [BAKIM.md](BAKIM.md) "Sürüm denetimi".

---

## 11. Yedekleme, geri yükleme testi ve güncelleme

### Yedekleme nasıl çalışır

- Her gün **03:15**'te (İstanbul saati) otomatik yedek alınır: veritabanı ve yüklenen görseller.
- Yedekler **şifrelidir**. Şifreyi açan **özel anahtar sunucuda durmaz**; kurulumda size bir kez gösterilir. **Bunu parola yöneticinize kaydedin ve ikinci bir güvenli yerde de saklayın.** Kaybolursa yedekler açılamaz ve kimse kurtaramaz.
- Yedekler sunucuda `./yedekler/` klasöründedir (web'den erişilemez).
- **Pano**'daki **Yedekleme durumu** kutusu son yedeği, durumunu, boyutunu ve sunucu dışı kopyanın son doğrulamasını gösterir. "Sunucu dışı kopya doğrulanmadı" sarı uyarısı çıkarsa bölüm 13'e bakın.
- `.env` dosyası otomatik yedeklenmez: **kopyasını parola yöneticinize kaydedin** (`MFA_SIFRELEME_ANAHTARI` orada).
- Eski yerel yedekler yalnızca sunucu dışına kopyalanıp doğrulandıktan sonra silinir. Sunucu dışı kopya kurmak için bkz. [YEDEKLEME.md](YEDEKLEME.md) "Sunucu dışı kopya".

Elle yedek almak:

```bash
docker compose exec yedek sh /betikler/yedek-al.sh
```

### Aylık geri yükleme testi

Yedeğin gerçekten geri yüklenebildiğini canlı sisteme dokunmadan denetler. Ayda bir ve büyük güncellemelerden önce yapın:

```bash
bash scripts/geri-yukleme-testi.sh
```

Betik anahtarı sorar: parola yöneticinizden `AGE-SECRET-KEY-1...` satırını kopyalayıp yapıştırın (ekranda görünmez). Sonunda **`SONUÇ: GEÇTİ`** yazmalıdır.

### Gerçek geri yükleme (yıkıcı)

Canlı veritabanını yedektekiyle değiştirir; yedekten sonraki değişiklikler kaybolur. Önce [YEDEKLEME.md](YEDEKLEME.md) "Gerçek geri yükleme" bölümünü okuyun:

```bash
bash scripts/geri-yukle.sh yedekler/db-YYYYMMDD-HHMMSS.dump.age            # yalnızca veritabanı
bash scripts/geri-yukle.sh yedekler/db-YYYYMMDD-HHMMSS.dump.age --medya    # veritabanı + görseller
```

Betik `EVET` yazmanızı ister ve başlamadan önce mevcut durumun güvenlik yedeğini alır.

### Güncelleme

```bash
cd /opt/qr-kampanya
# yeni sürüm dosyalarını kopyaladıktan sonra:
bash scripts/guncelle.sh
```

Betik önce yedek alır, veritabanını günceller, uygulamayı yeniler ve sağlık kontrolü yapar. Caddy yenilenirken birkaç saniye kesinti olur. **Asla `docker compose down -v` çalıştırmayın**: `-v` bütün veritabanını ve görselleri siler.

### Bakım takvimi

| Ne zaman | Ne yapılır |
|---|---|
| Her hafta | **Pano**'da son yedeğin başarılı olduğuna bakın. |
| Her ay | `bash scripts/geri-yukleme-testi.sh`; `sudo apt update && sudo apt upgrade`; `df -h` (disk); `bash scripts/guvenlik-tarama.sh`. |
| Her ay (isteğe bağlı) | `bash scripts/surum-denetimi.sh --cevrimici`. |
| Yılda bir | Alan adı yenilemesi, sunucu dışı yedekler ve hesaplar gözden geçirilir. |

Ayrıntı: [BAKIM.md](BAKIM.md).

---

## 12. Güvenlik özeti ve yapılmaması gerekenler

Sistem şunları kendiliğinden yapar: HTTPS, parola + MFA, rol yetkileri, hız sınırları, her yönetici işleminin **Denetim** kaydı, şifreli yedek, veritabanının internete kapalı olması. Ayrıntı ve üretim öncesi kontrol listesi: [GUVENLIK.md](GUVENLIK.md).

**Yapılmaması gerekenler**

- Parolaları, API anahtarlarını veya yedek özel anahtarını **kâğıda, e-postaya, sohbete veya Git'e yazmayın**; yalnızca parola yöneticisinde tutun.
- **`.env` dosyasını kimseyle paylaşmayın**, ekran görüntüsünü almayın, Git'e eklemeyin. Kopyasını yalnızca parola yöneticisinde saklayın.
- API anahtarını veya parolayı adres satırına (`?api_key=...`) yazmayın; sistem zaten reddeder. Anahtarı herkese açık bir web sayfasına gömmeyin.
- Yedek özel anahtarını sunucuda bırakmayın ve kaybetmeyin.
- `docker compose down -v` çalıştırmayın.
- Tanımadığınız bir eklentiyi `QR_EKLENTILER` listesine eklemeyin.
- Hesabınızın MFA'sını kapatmayın; MFA'sız bir yönetici hesabı bırakmayın.
- Panel IP kısıtını açarken önce kendi IP'nizi ekleyin (bölüm 2).
- Gizli kalması gereken linkler için **Sıralı** kod biçimini kullanmayın.
- **Herkese açık istatistik sayfası** ayarını, kodların sayılarını herkesin görmesini istemiyorsanız açmayın.
- Alan adı yenilemesini ve alan adı/VPS hesaplarındaki iki adımlı doğrulamayı ihmal etmeyin; alan adı kaybedilirse basılı tüm QR'lar çalışmaz.
- Baskıya göndermeden önce her QR'ı telefonla test edin.

---

## 13. Sorun giderme

### QR açılmıyor veya beklenmedik sayfa çıkıyor

| Gördüğünüz | Anlamı | Ne yapılır |
|---|---|---|
| **Kod bulunamadı** (404) / **Bu QR kod tanınmadı.** | Böyle bir kısa kod yok. Kod yanlış basılmış veya yazım hatası olabilir. | Kodu **QR kodlar** listesinde arayın. Büyük/küçük harf fark etmez. |
| **Kullanımda değil**, kod **Pasif** | Kod pasif (HTTP 200). | Detay sayfasında **Aktif yap**. |
| **Kullanımda değil**, kod **Arşiv** veya **Çöp kutusunda** | HTTP 410. | Arşivdeyse **Aktif yap**; çöpteyse **Çöp kutusu**'ndan **Geri yükle**. |
| **Kullanımda değil**, kod aktif | Hedef sayfanın durumu "Yayında" değil, ya da kayıtlı hedef adres geçersiz. | Sayfayı **Yayında** yapın veya hedef adresi düzeltin. **Hatalı kayıtlar** menüsüne bakın. |
| **Kampanya henüz başlamadı** | QR'ın (veya kampanyasının) başlangıç tarihi gelmemiş. | **başlangıç** tarihini kontrol edin. |
| **Kampanya sona erdi** | Bitiş tarihi geçmiş. | **bitiş** tarihini uzatın ya da **bitiş sonrası adres** / **Ayarlar**'daki adresi belirleyin. |
| `/s/...` sayfası 404 | Sayfa "Yayında" değil veya adres yanlış. | **Sayfalar**'da durumu kontrol edin. |
| `/l/...` sayfası 404 | Ağaç taslak/çöpte ya da adres yanlış. | **Link ağaçları**'nda **Yayınla** veya **Geri yükle**. |
| Panel/API 404 | Ağ kısıtı açık ve IP'niz izinli değil. | Sonraki başlığa bakın. |

### 429: "Çok fazla istek"

- Yönlendirmede aynı IP'den dakikada çok fazla istek (varsayılan 120) geldi. Bir dakika bekleyin.
- Panelde/içe aktarmada dakikada çok fazla QR oluşturma (varsayılan 30) ya da girişte çok fazla deneme olabilir. Bir dakika bekleyin.
- API'de `Retry-After: 60` başlığı gelir; bir dakika bekleyin.

### Panele giremiyorum

- **Sayfa bulunamadı (404):** panel varsayılan olarak kapalıdır; `YONETIM_IZINLI_AGLAR` boşsa ya da IP'niz listede değilse panel görünmez. Sunucuya SSH ile girip satırı ekleyin/güncelleyin, ardından `docker compose up -d` (bölüm 2).
- **Giriş kilitlendi (5 hatalı deneme):** 15 dakika bekleyin. Acil durumda sunucuda: `docker compose exec app python manage.py sayac_sifirla KULLANICI_ADI [--ip IP]`.
- **MFA kodu kabul edilmiyor:** telefonunuzun saatinin otomatik ayarlı olduğundan emin olun. Aynı kod iki kez kullanılamaz; yeni kodu bekleyin.
- **Telefon kayboldu / MFA kurulumu çalışmıyor:** sunucuda `docker compose exec app python manage.py mfa_sifirla <kullanici_adi>` çalıştırıp yeniden kurun. `MFA_SIFRELEME_ANAHTARI` kaybolduysa da çözüm aynı sıfırlamadır (veriler etkilenmez); bu yüzden `.env` kopyasını saklayın.
- **Parolayı unuttum:** panelde "parolamı unuttum" bağlantısı ve yöneticinin başkasının parolasını değiştirdiği bir ekran yoktur (**Kullanıcılar** sayfasında parola alanı bulunmaz). Oturum açıkken **Hesabım** > **Parolayı değiştir** kullanılır. Oturum yoksa sunucuda Django'nun yerleşik komutunu çalıştırın: `docker compose exec app python manage.py changepassword <kullanici_adi>`. Komut yeni parolayı iki kez sorar ve parola kurallarını uygular. Hatalı denemeler yüzünden giriş kilitliyse ardından `sayac_sifirla` komutunu da çalıştırın.

### Başlık çekilmedi

Başlık yalnızca **yeni kayıtta**, başlık boşken, hedef harici adresken ve **Ayarlar**'da **başlığı otomatik çek** açıkken denenir. Site yavaş, yönlendirmeli, HTML olmayan veya erişimi engelleyen bir site olabilir; bu durumda başlık boş kalır ve kayıt yine de oluşur. Başlığı detay sayfasındaki **Düzenle** ya da listedeki satır içi düzenleme ile elle yazın.

### Ülke boş

Ülke yalnızca GeoLite2 dosyası ayarlıysa dolar (`GEOIP_VERITABANI`). Dosya yoksa veya okunamıyorsa boş kalır. Kurulum için bkz. [KULLANIM.md](KULLANIM.md) bölüm 9c; dosyayı güncelledikten sonra uygulamayı yeniden başlatın.

### Yedek hatası

1. **Pano** > **Yedekleme durumu**'nda durumu ve zamanı okuyun.
2. Sunucuda `df -h` ile disk dolmuş mu bakın.
3. Günlük için `yedekler/yedek-gunlugu.log` ve `docker compose logs yedek` komutlarına bakın (yedek dosyaları root'a ait olabilir; okumak için `sudo`).
4. Elle yedek deneyin: `docker compose exec yedek sh /betikler/yedek-al.sh`.
5. "**Sunucu dışı kopya doğrulanmadı; eski yedekler silinmiyor, disk dolabilir**" uyarısı: sunucu dışı kopya (rclone) kurulu değil, doğrulanamadı ya da `YEDEK_UZAK_ONAYLI_HEDEF` verilmemiş olabilir. Bu bir yedek hatası değil, eksik tamamlayıcı adımdır; yedekler alınmaya devam eder ama disk zamanla dolabilir. Düzeltme: [YEDEKLEME.md](YEDEKLEME.md) "Sunucu dışı kopya ve silme kuralı".
6. Uygulama açılmıyorsa `docker compose ps -a` ve `docker compose logs hazirlik` ile bakın ([KURULUM.md](KURULUM.md), [BAKIM.md](BAKIM.md)).

---

## 14. Sözlük ve hızlı başvuru

### Sözlük

| Terim | Anlamı |
|---|---|
| Kısa link / kısa kod | QR'ın içindeki kalıcı adres / adresin son parçası (`KMP-0001`). |
| Hedef | Kısa linkin gideceği yer; değiştirilebilir. |
| Dinamik QR | İçeriği sabit (kısa link), hedefi değiştirilebilen QR. |
| MFA / TOTP | Doğrulama uygulamasının ürettiği 6 haneli ek giriş kodu. |
| Bot | Bağlantı önizleyicileri ve otomatik tarayıcılar; varsayılan olarak sayılara katılmaz. |
| Tahmini tekil ziyaret | Aynı gün tekrarları ayıklanmış tahmin; kesin kişi sayısı değil. |
| Arşiv / Pasif / Çöp kutusu | Bölüm 5.8 ve 5.9. |
| CIDR | IP aralığı yazımı (`203.0.113.0/24`; tek adres için `/32`). |

### Panel adresleri

Önek: `https://qr.example.com`

| Adres | Ekran |
|---|---|
| `/panel/` | **Pano** |
| `/panel/giris` | Giriş |
| `/panel/hesap/` | **Hesabım** |
| `/panel/kisalt/` | **Hızlı kısalt** |
| `/panel/qr/` | **QR kodlar** |
| `/panel/qr/yeni` | **Yeni QR kod** |
| `/panel/qr/ice-aktar/` | **İçe aktar** |
| `/panel/cop-kutusu/` | **Çöp kutusu** |
| `/panel/kampanyalar/` | **Kampanyalar** |
| `/panel/urunler/` | **Ürünler** |
| `/panel/magazalar/` | **Mağazalar** |
| `/panel/sayfalar/` | **Sayfalar** |
| `/panel/link-agaclari/` | **Link ağaçları** |
| `/panel/rapor/istatistik` | **İstatistik** |
| `/panel/rapor/hatali` | **Hatalı kayıtlar** |
| `/panel/denetim/` | **Denetim** |
| `/panel/ayarlar` | **Ayarlar** |
| `/panel/kullanicilar/` | **Kullanıcılar** |
| `/panel/sistem-bilgisi` | **Sistem bilgisi** |
| `/panel/eklentiler` | **Eklentiler** |
| `/panel/api-anahtarlari/` | **API anahtarlarım** |

### Herkese açık adresler

| Adres | Ne |
|---|---|
| `/k/<kod>` | QR yönlendirmesi |
| `/k/<kod>+`, `/k/<kod>+all` | Herkese açık istatistik (ayar açıksa) |
| `/s/<adres>` | Kampanya sayfası |
| `/l/<adres>` | Link ağacı |
| `/saglik` | Sağlık kontrolü |
| `/api/v1/` | API (anahtar gerekir) |

### Komutlar (sunucuda, proje klasöründe)

| İş | Komut |
|---|---|
| Kurulum | `bash scripts/kurulum.sh` |
| Güncelleme | `bash scripts/guncelle.sh` |
| Durum | `docker compose ps -a` |
| Sağlık denetimi | `curl -I https://qr.example.com/saglik` |
| Günlük | `docker compose logs app --tail 50` |
| Elle yedek | `docker compose exec yedek sh /betikler/yedek-al.sh` |
| Geri yükleme testi | `bash scripts/geri-yukleme-testi.sh` |
| Gerçek geri yükleme | `bash scripts/geri-yukle.sh yedekler/db-....dump.age [--medya]` |
| Sürüm denetimi | `bash scripts/surum-denetimi.sh [--cevrimici]` |
| Güvenlik taraması | `bash scripts/guvenlik-tarama.sh` |
| Otomatik testler | `bash scripts/test.sh` |
| İlk yönetici | `docker compose exec app python manage.py yonetici_olustur` |
| MFA sıfırlama | `docker compose exec app python manage.py mfa_sifirla <kullanici_adi>` |
| Giriş kilidi sıfırlama | `docker compose exec app python manage.py sayac_sifirla KULLANICI_ADI [--ip IP]` |
| Unutulan parolayı değiştirme | `docker compose exec app python manage.py changepassword <kullanici_adi>` |

### Belgeler

| Belge | Ne zaman bakılır |
|---|---|
| [KURULUM.md](KURULUM.md) | Sunucu ve alan adı kurulumu |
| [KULLANIM.md](KULLANIM.md) | Panel ayrıntıları (bu rehberin ayrıntılı kardeşi) |
| [API.md](API.md) | API eylemleri ve hata kodları |
| [GUVENLIK.md](GUVENLIK.md) | Güvenlik önlemleri, IP kısıtı, kontrol listesi |
| [YEDEKLEME.md](YEDEKLEME.md) | Yedek, anahtar, sunucu dışı kopya, geri yükleme |
| [BAKIM.md](BAKIM.md) | Güncelleme, bakım, sürüm denetimi |
| [EKLENTILER.md](EKLENTILER.md) | Eklenti sistemi |
| [MIMARI.md](MIMARI.md), [VERI-MODELI.md](VERI-MODELI.md) | Teknik tasarım ve veri tabloları |
