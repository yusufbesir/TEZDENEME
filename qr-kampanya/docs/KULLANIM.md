# Panel kullanım kılavuzu

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

## Özet

- Panel adresi: `https://ALAN-ADINIZ/panel/`
- Giriş: kullanıcı adı + parola, ardından telefonunuzdaki doğrulama uygulamasından 6 haneli kod.
- QR kodun **içeriği hiç değişmez**; yalnızca gideceği yeri değiştirirsiniz. Bu yüzden basılmış kodlar her zaman çalışır.
- Hiçbir QR kodu silinmez; kullanımdan kaldırmak için **Pasif** yapın veya **Arşivleyin**.

## 1. İlk giriş ve MFA

1. Kullanıcı adı ve parolanızı girin.
2. İlk girişte ekranda bir QR kod çıkar. Telefonunuzda Google Authenticator, Microsoft Authenticator veya benzeri bir uygulama açıp bu kodu okutun.
3. Uygulamanın gösterdiği 6 haneli kodu girin. Sonraki girişlerde yalnızca bu kod istenir.
4. Telefonunuzu kaybederseniz bir Yönetici, **Kullanıcılar** sayfasından MFA'nızı sıfırlayabilir.

5 kez hatalı giriş yapılırsa hesap o bağlantı için 15 dakika kilitlenir.

## 2. Roller

| Rol | Yapabilecekleri |
|---|---|
| Yönetici | Her şey; kullanıcı ekleme, rol verme, MFA sıfırlama, genel ayarlar |
| Editör | QR kod, kampanya, sayfa, ürün, mağaza, link ağacı ekleme/düzenleme/arşivleme; içe/dışa aktarma |
| İzleyici | Yalnızca görüntüleme ve rapor indirme |

## 3. Tek QR kod oluşturmak

1. **QR kodlar → Yeni QR kod**.
2. **Kısa kod**: QR'a yazılacak kalıcı kod (örn. `KMP-0001`). Boş bırakırsanız tahmin edilmesi zor, rastgele bir kod üretilir. **Bir kez kaydedildikten sonra değiştirilemez.**
3. **Yönlendirme türü**: “Harici web adresi” (başka bir siteye gider) veya “Sistemdeki sayfa” (kendi kampanya sayfanız).
4. İsteğe bağlı alanlar: ad, tür, ürün, kampanya, mağaza, başlangıç/bitiş, bitiş sonrası adres, açıklama, etiketler.
5. **Kaydet**. Detay sayfasında QR önizlemesini görür, **PNG** (dijital/ofis baskısı) veya **SVG** (matbaa, büyük baskı) olarak indirirsiniz.

**Baskıdan önce:** İndirdiğiniz QR'ı telefonla tarayıp doğru sayfanın açıldığını kontrol edin. Baskıda QR en az 2 × 2 cm olmalı, etrafında beyaz boşluk bırakılmalıdır.

**Hedef başlığı:** isteğe bağlı `Hedef başlığı` alanı, kodun gittiği sayfayı tanımlamanıza yardım eder; listede ad yanında görünür, aramaya (`q`), CSV/Excel dışa aktarmaya ve toplu içe aktarmada isteğe bağlı `baslik` sütununa dahildir.

**Ayrılmış kelimeler:** `admin`, `panel`, `api`, `k`, `s`, `saglik`, `static`, `media`, `giris`, `cikis`, `robots`, `favicon` (büyük/küçük harf fark etmez) ve **Ayarlar** ekranındaki “ayrılmış kodlar” listesi kısa kod olarak verilemez; otomatik üretilen kod listede çıkarsa yeniden üretilir. Mevcut kodlar etkilenmez.

**Aynı hedef uyarısı:** Ayarlar'da açıksa, yeni QR oluştururken aynı hedef adresi arşivlenmemiş başka kodlarda kullanılıyorsa form ilk gönderimde kaydedilmez, kodlar listelenir; “Yine de kaydet” kutusunu işaretleyip tekrar göndererek kaydedebilirsiniz. Toplu içe aktarmada engel yoktur, önizlemede yalnızca uyarı sayısı gösterilir.

**Oluşturma hız sınırı:** Kullanıcı başına dakikada en çok `QR_OLUSTURMA_HIZ_SINIRI` (varsayılan 30) yeni QR oluşturma isteği; toplu içe aktarmayı başlatma (dosya yükleme) isteği de bu sayaçtan 1 sayılır. Aşılırsa bir dakika bekleyin (429).

## 3a. Hızlı kısalt, yer imi düğmesi ve paylaşım

**Hızlı kısalt** (menüde en üstte): yalnızca uzun adresi yapıştırırsınız; isteğe bağlı kısa kod ve başlık da girebilirsiniz. **Kısalt**'a basınca “Kısa link” türünde bir kayıt oluşur. Doğrulama normal QR formuyla aynıdır: ayrılmış kelimeler, aynı hedef uyarısı (“Yine de kaydet” onayı), oluşturma hız sınırı. QR adı boşsa başlıktan, o da yoksa hedefin alan adından türetilir. Sonuç ekranında kısa link, **Kopyala** düğmesi, QR önizleme (PNG/SVG indirme), paylaşım kutusu ve **Bir tane daha** formu bulunur. Gereken yetki: QR ekleme (Editör, Yönetici).

**Başlığı otomatik çekme:** Başlığı boş bırakırsanız ve hedef harici bir adresse, sunucu hedef sayfanın başlığını (`<title>`) çekmeye çalışır (hızlı kısalt, “Yeni QR kod” formu ve API `shorturl`). Yalnızca yeni kayıtta çalışır; başarısız olursa başlık boş kalır, kayıt engellenmez. Güvenlik önlemleri için [GUVENLIK.md](GUVENLIK.md). **Ayarlar → başlığı otomatik çek** kutusundan kapatılır.

**Yer imi düğmesi:** Hızlı kısalt sayfasındaki “Yer imi düğmesi” bölümündeki düğmeyi tarayıcınızın yer imleri çubuğuna sürükleyin (sürükleyemiyorsanız kodu kopyalayıp yeni bir yer iminin adresine yapıştırın). Herhangi bir sayfadayken tıklarsanız, o sayfanın adresi ve başlığı Hızlı kısalt sayfasına yeni pencerede **önceden doldurulmuş** olarak açılır (`/panel/kisalt/?url=…&baslik=…`). **Hiçbir şey kendiliğinden kaydedilmez**: kayıt yalnızca sayfada “Kısalt”a basınca (POST + CSRF) olur. Giriş yapmamışsanız önce giriş sayfası açılır. Yer imi kodu panelin tam adresini içerir; panel adresi değişirse düğmeyi yeniden ekleyin. Sıkı içerik güvenlik politikası (CSP) kullanan bazı sitelerde tarayıcı yer imi betiğini çalıştırmayabilir; panel sayfasında düğmeye tıklamak ise bilerek bir şey yapmaz.

**Paylaşım kutusu** (QR detay sayfası ve hızlı kısalt sonucu): kısa link metin kutusu + **Kopyala**, **WhatsApp ile paylaş**, **E-posta ile paylaş** (mailto), **X'te paylaş** ve **QR PNG indir**. Paylaşım düğmeleri yalnızca bağlantıdır; harici betik veya izleme yoktur. Başlık/ad bağlantıya yüzde-kodlanarak eklenir.

**Sıralı kod seçeneği:** Ayarlar → “otomatik kod biçimi”: `rastgele` (varsayılan; tahmin edilmesi zor 8 karakter) ya da `sirali` (küçük harf+rakam, taban-36 artan: `100`, `101`, … `10z`, `110`, …; en az 3 karakter kuralı için sayaç “100”den başlar). Kısa kod alanı boş bırakıldığında (panel formu, hızlı kısalt, API `shorturl`, toplu içe aktarmada kodsuz satırlar) bu biçim kullanılır; kendiniz yazdığınız kodlar sayaca dokunmaz. Ayrılmış ya da zaten var olan kod çıkarsa atlanır (numara boşluk bırakabilir). Sayaç veritabanında satır kilidiyle artırılır, eşzamanlı isteklerde aynı kod iki kez verilmez. Toplu içe aktarma önizlemesi sayaç harcamaz; kodlar “uygula” adımında ayrılır. **Dikkat:** sıralı kodlar tahmin edilebilir; gizli olması gereken bağlantılar için rastgele biçimi kullanın.

## 4. Hedefi değiştirmek (basılı kod aynı kalır)

1. QR kodun detay sayfasında **Düzenle**.
2. Hedef URL'yi veya hedef sayfayı değiştirin; isterseniz “değişiklik notu” yazın.
3. **Kaydet**. Değişiklik hemen geçerli olur. Eski hedefler detay sayfasındaki **Hedef geçmişi** tablosunda kalır.
4. **Hedefi test et** bağlantısı yeni sekmede açılır.

## 5. Başlangıç ve bitiş tarihleri

- QR'ın kendi tarihi yoksa bağlı kampanyanın tarihleri kullanılır.
- Kampanya başlamadıysa ziyaretçi “henüz başlamadı” mesajını (veya **Ayarlar**'da belirlediğiniz adresi) görür.
- Bittiyse önce QR'daki “bitiş sonrası adres”e, o da yoksa genel ayarlardaki adrese gider; hiçbiri yoksa bitiş mesajı gösterilir.
- Pasif kodlarda güvenli bir “kullanımda değil” mesajı gösterilir.

## 6. Toplu QR oluşturma (Excel / CSV)

1. **İçe aktar** menüsü. Örnek dosyayı (CSV veya Excel) indirip kendi verinizi bu biçimde hazırlayın.
2. Dosyayı yükleyin (en fazla 5 MB ve 20.000 satır).
3. **Sütun eşleştirme**: her sütunun hangi alana karşılık geldiğini seçin (çoğu otomatik seçilir).
4. **Önizleme**: oluşturulacak, güncellenecek ve hatalı satırları görürsünüz. Hatalı satırların listesini CSV olarak indirebilirsiniz; hatalı satırlar içe aktarılmaz.
5. Sistemde zaten var olan kodlar, “Mevcut kayıtları güncelle” kutusunu **kendiniz işaretlemedikçe değiştirilmez**.
6. **Onayla**. Sonuç raporunu ve oluşturulan QR görsellerini **ZIP** olarak indirin.

Tarih biçimleri: `2026-10-01`, `01.10.2026`, `2026-10-01 14:30`. Yalnızca tarih yazılırsa bitiş günü dahildir. Büyük dosyalar (binlerce satır) birkaç dakika sürebilir; sayfayı kapatmayın.

## 7. Kampanya sayfası oluşturmak

1. **Sayfalar → Yeni sayfa**.
2. Başlık, açıklama, kapak görseli, ürün görselleri (JPG/PNG/WebP, en fazla 5 MB), tarihler, koşullar, buton metni ve bağlantısı, ürün kodu ve fiyat, SEO başlığı/açıklaması, logo ve renk teması (siyah-bej-bronz, beyaz-gold, sade).
3. **Sayfa adresi** (örn. `kis-kampanyasi`) kalıcıdır, sonradan değiştirilemez: `https://ALAN-ADINIZ/s/kis-kampanyasi`.
4. Önce **Taslak** olarak kaydedip **Önizle** ile kontrol edin, sonra durumu **Yayında** yapın.
5. Bir QR kodun yönlendirme türünü “Sistemdeki sayfa” yapıp bu sayfayı seçin.

## 8. Toplu işlemler ve dışa aktarma

QR listesinde kutuları işaretleyip **Aktif yap**, **Pasif yap**, **Arşivle**, **Çöp kutusuna taşı** veya **ZIP indir** seçin (en fazla 1.000 kod). Arşivleme ve çöp kutusuna taşıma önce bir onay sayfası gösterir. Liste CSV veya Excel olarak dışa aktarılabilir. CSV dosyaları Türkçe Excel ile uyumlu olması için `;` ile ayrılır.

### 8a. Liste: sıralama, filtreler ve sayfa boyutu

- **Sıralama:** sütun başlıklarına (Kısa kod, Ad, Başlık, Hedef, Tarama, Oluşturulma) tıklayın; aynı başlığa tekrar tıklamak yönü çevirir. Adres parametreleri: `sirala` (`kod`, `ad`, `baslik`, `hedef`, `olusturma`, `tarama`) ve `yon` (`artan`, `azalan`). Varsayılan: oluşturulma, azalan. Listede olmayan/geçersiz değer varsayılana düşer (değer hiçbir zaman olduğu gibi sorguya gitmez).
- **Tarama sütunu:** botlar hariç toplam tarama sayısı (tüm zamanlar).
- **Filtreler:** arama kutusu + **arama alanı** (hepsi, kısa kod, ad, başlık, hedef URL; “hepsi” ürün, kampanya ve etiketi de arar), tür, durum, kampanya, mağaza, **ürün**, **tarama sayısı en az / en çok** (bot hariç), **oluşturma tarihi** için “bu tarihten sonra” ve/veya “bu tarihten önce” (ikisi birlikte = arası; her iki gün de dahildir; tarihler `YYYY-AA-GG`, yerel saat).
- **Sayfa boyutu:** 25, 50, 100 veya 200 (başka değer = 50).
- Tüm filtreler, sıralama ve sayfa boyutu sayfa bağlantılarında ve **CSV / Excel indir** bağlantılarında korunur; dışa aktarma aynı filtre ve sıralamayla çalışır (sayfa boyutundan bağımsız olarak tüm eşleşen kayıtlar iner).
- Çöp kutusundaki kodlar listede varsayılan olarak görünmez; **durum = Çöp kutusunda** filtresiyle görülür (ayrıca bkz. 8c).

### 8b. Listeden hızlı düzenleme

Satırdaki **Düzenle** bağlantısı, JavaScript açıksa satırın altında küçük bir form açar (**ad**, **başlık** ve harici hedefli kodlarda **hedef URL**). **Kaydet** sayfayı yenilemeden satırı günceller; hata olursa mesaj formun yanında görünür. JavaScript yoksa bağlantı normal düzenleme sayfasına gider; form JavaScript'siz gönderilirse sayfa listeye (filtreleriniz korunarak) döner ve sonuç mesajı gösterilir. Kayıt `POST /panel/qr/<id>/hizli-duzenle` ile (CSRF korumalı, yetki: QR değiştirme) yapılır.

- Doğrulama normal düzenlemeyle aynıdır (yalnızca http/https; özel/yerel IP ve kullanıcı bilgisi reddedilir; IDN uyarısı).
- Hedef değişirse **hedef geçmişine** ve **denetim kaydına** yazılır (normal düzenlemeyle aynı kayıt yolu).
- Sayfa (sistem sayfası) hedefli kodlarda hedef alanı yoktur; hedef bu yolla değiştirilemez.
- **Arşivdeki ve çöp kutusundaki** kodlar hızlı düzenlenemez (409).

### 8c. Çöp kutusu

**Kalıcı silme yoktur.** “Sil” yalnızca kodu çöp kutusuna taşımaktır; kısa kod hiçbir zaman başka bir kayda verilmez.

- **Taşıma:** QR detay sayfasındaki veya listedeki (toplu) **Çöp kutusuna taşı** düğmesi; onay sayfası gösterilir. Kodun o anki durumu (aktif/pasif/arşiv) saklanır.
- **Çöpteki kod:** taranınca arşivdeki gibi “kullanımda değil” bilgi sayfası (HTTP 410) gösterilir; tarama kaydının sonucu `cop` olur. Düzenlenemez, durum işlemleri (aktif/pasif/arşiv) ve içe aktarma güncellemesi uygulanmaz; önce geri yüklenmelidir.
- **Çöp kutusu sayfası** (menü → Çöp kutusu, `/panel/cop-kutusu/`): çöpteki kodlar, taşınma zamanı ve önceki durumla listelenir. **Geri yükle** (tekil) veya **Seçilenleri geri yükle** (toplu, en fazla 1.000) kodu çöpe atılmadan önceki durumuna döndürür.
- Çöpe taşıma ve geri yükleme **denetim kaydına** yazılır (`qr_cope_tasi`, `qr_copten_geri_yukle`). Pano “Çöp kutusundaki QR kod” sayısını gösterir.
- API'de `expand`, `url-stats` ve `stats` çıktılarındaki `durum` alanı çöpteki kod için `cop` değerini taşır.

## 9. İstatistikler

**İstatistik** menüsü: QR, kampanya, mağaza ve ürün bazında taramalar; günlük/aylık; en çok taranan kodlar; CSV/Excel çıktısı.

- **Toplam tarama**: bütün açılışlar (botlar hariç).
- **Tahmini tekil ziyaret**: aynı gün içindeki tekrarlar ayıklanmış tahmin. **Kesin kişi sayısı değildir**: aynı kişi farklı günlerde veya farklı cihazlarla birden çok sayılabilir.
- **Bot**: bağlantı önizleyicileri ve otomatik tarayıcılar ayrı gösterilir.
- **Zaman grafiği, yönlendiren siteler ve ülkeler**: aşağıdaki 9a-9c bölümleri.

### 9a. Zaman grafikleri

**QR kod ayrıntısı** ve **İstatistik raporu** sayfalarında hazır aralıklar vardır: **Son 24 saat** (saatlik), **7 gün**, **30 gün** (günlük) ve **Tüm zamanlar** (günlük; ilk taramadan bu yana 180 günden uzunsa haftalık, haftalar pazartesi başlar). Saat dilimi Europe/Istanbul'dur; günler yerel gece yarısında başlar. Grafik sunucuda üretilen basit bir SVG'dir (harici betik yok). **Botları dahil et** işaretlenirse çubuklara bot taramaları da eklenir; varsayılan bot hariçtir. Raporda grafik tüm QR kodları kapsar ve yukarıdaki tarih aralığı formundan bağımsızdır.

### 9b. Yönlendiren siteler ve ülkeler

İstatistik raporunda seçili tarih aralığı için iki tablo vardır (ilk 20, “bot dahil” seçeneğine uyar):

- **Yönlendiren siteler**: taramayı getiren bağlantının **yalnızca alan adı** (ör. `www.ornek.com`). Yol ve sorgu parametreleri hiçbir zaman saklanmaz. Kendi sitemizden gelenler, geçersiz ve IP adresli Referer'lar kaydedilmez. QR kodu okutma çoğunlukla Referer göndermez; “yönlendiren bilgisi olmayan” sayısı tablonun altında ayrıca gösterilir.
- **Ülkeler**: 2 harfli ülke kodu. Yalnızca GeoIP etkinse dolar (aşağıya bakın).

### 9c. GeoIP ile ülke bilgisi (isteğe bağlı)

Varsayılan olarak ülke tutulmaz. Açmak için MaxMind'ın ücretsiz **GeoLite2 Country** veritabanını **kendiniz** indirirsiniz; bu proje dosyayı indirmez ve dağıtmaz.

1. https://www.maxmind.com adresinden ücretsiz bir GeoLite2 hesabı açın ve lisans koşullarını (GeoLite2 EULA / lisans sözleşmesi; atıf ve kullanım şartları dahil) okuyup kabul edin.
2. Hesabınızın **Download Files** sayfasından **GeoLite2 Country** (`GeoLite2-Country.mmdb`, `.tar.gz` içinde) dosyasını indirip çıkarın. Otomatik güncelleme için MaxMind'ın `geoipupdate` aracını kendi hesap anahtarınızla çalıştırabilirsiniz; hesap numarasını ve lisans anahtarını `.env`'ye veya depoya **yazmayın**.
3. Dosyayı sunucuya koyun (ör. `./geoip/GeoLite2-Country.mmdb`) ve `docker-compose.yml` içindeki yorum satırını açın: `- ./geoip/GeoLite2-Country.mmdb:/geoip/GeoLite2-Country.mmdb:ro` (salt okunur).
4. `.env` içinde `GEOIP_VERITABANI=/geoip/GeoLite2-Country.mmdb` yazıp uygulamayı yeniden başlatın.

Dosya yoksa, okunamazsa ya da ayar boşsa ülke boş kalır; yönlendirme ve diğer işlevler etkilenmez. Veritabanı süreç başına bir kez açılır; dosyayı güncelledikten sonra uygulamayı yeniden başlatın. IP adresi yalnızca arama sırasında bellekte kullanılır, saklanmaz. GeoLite2 yaklaşık bir doğruluk verir; kesin konum değildir.

### 9d. Herkese açık istatistik sayfası: `/k/<kod>+`

YOURLS uyumlu: kısa adresin sonuna `+` eklenirse (`https://alan.adiniz/k/ABC123+`; `%2B` de çalışır) istatistik sayfası açılır, `+all` ise **aynı hedef adrese** giden tüm kodların toplamını gösterir (arşivdeki ve çöp kutusundaki kodlar toplama girmez).

- **Genel ayarlar → herkese açık istatistik sayfası** (varsayılan **KAPALI**). Kapalıyken: giriş yapmış ve `QR kod görüntüleme` yetkisi olan kullanıcı panelde ilgili QR ayrıntısına yönlendirilir (grafikler orada); diğer herkes, kod var olsa bile, “bulunamadı” (404) görür.
- Açıkken sayfa kimlik doğrulaması gerektirmez ve şunları gösterir: kod, toplam tarama (bot hariç), son 30 gün grafiği, en çok yönlendiren siteler ve ülkeler. **Hedef adres gösterilmez**; göstermek için **herkese açık istatistikte hedef adresi göster** ayarını açın (hedef gizli olabilir).
- Arşivdeki ve çöp kutusundaki kodlar için 404 verilir. Sayfa arama motorlarına kapalıdır (`noindex`), önbelleğe alınmaz ve yönlendirmeyle aynı IP başına hız sınırına tabidir. Bu istekler **tarama olarak sayılmaz**.
- Açmadan önce: kısa kodu bilen herkes o kodun tarama sayılarını görebilir. Kısa kodlar basılı olduğundan bunu bilinçli bir tercih olarak ele alın.

## 9e. Link ağacı (Linktree benzeri)

**Link ağaçları** menüsü, tek adreste (`https://ALAN-ADINIZ/l/ADRES`) birkaç bağlantıyı düğme olarak listeleyen sade, mobil öncelikli bir sayfa üretir. Örn. Instagram biyografisine tek bağlantı koyup altına site, mağaza, WhatsApp bağlantılarını dizebilirsiniz.

1. **Yeni link ağacı**: adres (3-64 karakter, küçük harf/rakam/tire/alt çizgi; kısa kodlardaki ayrılmış kelimeler kullanılamaz ve oluşturulduktan sonra **değiştirilemez**), başlık, kısa açıklama, tema (açık/koyu), vurgu rengi (`#RRGGBB`) ve durum (taslak/yayında).
2. **Bağlantı ekleme** (ağacın ayrıntı sayfasında): var olan bir kısa linki seçin **ya da** bir adres yazın. Adres yazarsanız Hızlı kısalt ile aynı doğrulamalarla (özel/yerel IP reddi vb.) yeni bir **Kısa link** türünde kod oluşturulur. Her düğme `/k/<kod>` üzerinden geçtiği için **tıklamalar normal QR taraması olarak sayılır**. Düğmeleri yukarı/aşağı taşıyabilir, gizleyebilir, yazısını değiştirebilir veya ağaçtan **çıkarabilirsiniz** (çıkarmak kısa linki silmez). En fazla 100 öğe.
3. **Herkese açık sayfada** yalnızca *yayındaki* ağaç görünür; düğmelerden yalnızca görünür olanlar ve kısa linki **aktif ve tarih aralığı içinde** olanlar gösterilir (pasif, arşiv, çöp, başlamamış veya bitmiş kodlar otomatik gizlenir; ayrıntı sayfasında “Herkese açık” sütunu nedenini söyler). Taslak, çöp kutusundaki veya olmayan ağaç aynı 404'ü verir. Sayfa arama motorlarına kapalıdır (`noindex`).
4. **Önizleme** taslak dahil her durumu yalnızca panelde gösterir ve görüntüleme saymaz.
5. **Çöp kutusu**: ağaç silinmez; “Çöp kutusuna taşı” ile adresi 404 verir, listede **Durum = Çöp kutusunda** filtresiyle görünür ve ayrıntı sayfasından **Geri yükle** ile önceki durumuna döner.
6. **Ağacın QR'ı** (PNG/SVG) doğrudan `/l/ADRES` adresini içerir. Taramaları da saymak istiyorsanız **Ağaç için kısa link oluştur** ile ağaç adresine giden bir kısa link üretin ve onun QR'ını kullanın.
7. **İstatistik**: ayrıntı sayfasında toplam ve son 30 gün **günlük görüntüleme** grafiği (bot ve HEAD istekleri sayılmaz; IP/User-Agent saklanmaz) ve öğe başına **tıklama** (o kısa linkin bot hariç toplam taraması; link başka yerlerde de kullanılıyorsa onlar da dahildir).

Yetkiler: İzleyici görüntüler; Editör ve Yönetici ekler/değiştirir. Oluşturma, düzenleme, öğe değişiklikleri, durum değişiklikleri ve çöp işlemleri **Denetim** kaydına yazılır. Rol yetkileri `rolleri_kur` komutuyla (kurulumda `hazirlik` servisi çalıştırır) güncellenir.

## 10. Hatalı ve mükerrer kayıtlar

**Hatalı kayıtlar** menüsü: aynı hedefi paylaşan kodlar, geçersiz hedefler, yayında olmayan sayfaya giden kodlar ve bitişi geçmiş ama hâlâ aktif olan kodlar.

## 11. Denetim kayıtları

**Denetim** sayfası kimin, ne zaman, ne yaptığını gösterir (giriş, oluşturma, hedef değişikliği, içe aktarma vb.). Bu kayıtlar değiştirilemez ve silinemez.

## 12. API anahtarları

Betiklerle kısa bağlantı oluşturmak veya sorgulamak için **API anahtarlarım** menüsünü kullanın.

- **Yeni API anahtarı:** bir ad verin; anahtar **yalnızca bir kez** gösterilir, **Kopyala** düğmesiyle alıp güvenli bir yere kaydedin. Sayfadan ayrılınca tekrar görülemez.
- **Liste:** ad, önek, oluşturulma, son kullanım ve durum görünür. Düz anahtar hiçbir zaman listelenmez.
- **İptal et:** onay sayfasında onaylayın. İptal geri alınamaz; o anahtarı kullanan programlar hemen erişimini kaybeder. Yönetici tüm kullanıcıların anahtarlarını görüp iptal edebilir; diğer roller yalnızca kendilerininkini.
- Anahtar sizin yetkilerinizle çalışır: İzleyici rolündeki bir anahtar okuyabilir ama kısa bağlantı oluşturamaz (403).

- **API’de parola girişi** (varsayılan kapalı): aynı sayfadaki kutudan, mevcut parolanızı girerek açıp kapatırsınız. MFA’nız etkinse API çağrılarında doğrulama kodu da gerekir. Anahtar kullanmak daha güvenlidir.

Kullanım örnekleri ve eylemler: [API.md](API.md).

## 13. Sistem bilgisi ve Eklentiler (yalnızca Yönetici)

- **Sistem bilgisi** menüsü: uygulama sürümü, Python ve Django sürümleri, PostgreSQL sunucu sürümü, uygulanmış son migration ve (`.env`'de verilmişse) Docker imaj etiketi/digest'i. Salt okunurdur ve **internete hiç bağlanmaz**; “yeni sürüm var mı” sorusu için elle `bash scripts/surum-denetimi.sh --cevrimici` çalıştırın ([BAKIM.md](BAKIM.md)). Uygulama sürümü API'de de görünür (`action=version` → `uygulama_surumu`).
- **Eklentiler** menüsü: sunucudaki eklenti dosyalarını, hangilerinin etkin olduğunu, açıklamalarını ve bağlandıkları olayları gösterir. Panelden eklenti yüklenemez/açılıp kapatılamaz; nasıl etkinleştirildiği ve yazıldığı [EKLENTILER.md](EKLENTILER.md) içindedir. **Eklenti sunucuda tam yetkiyle çalışır; yalnızca güvendiğiniz kodu ekleyin.**
- Panel ve API'ye yalnızca belirli ağlardan erişilmesini istiyorsanız `YONETIM_IZINLI_AGLAR` ayarına bakın ([GUVENLIK.md](GUVENLIK.md)). Açıkken izinli olmayan bir ağdan panel “sayfa bulunamadı” (404) gösterir.
