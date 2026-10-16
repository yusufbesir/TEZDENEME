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
| Editör | QR kod, kampanya, sayfa, ürün, mağaza ekleme/düzenleme/arşivleme; içe/dışa aktarma |
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

QR listesinde kutuları işaretleyip **Aktif yap**, **Pasif yap**, **Arşivle** veya **ZIP indir** seçin (en fazla 1.000 kod). Liste CSV veya Excel olarak dışa aktarılabilir. CSV dosyaları Türkçe Excel ile uyumlu olması için `;` ile ayrılır.

## 9. İstatistikler

**İstatistik** menüsü: QR, kampanya, mağaza ve ürün bazında taramalar; günlük/aylık; en çok taranan kodlar; CSV/Excel çıktısı.

- **Toplam tarama**: bütün açılışlar (botlar hariç).
- **Tahmini tekil ziyaret**: aynı gün içindeki tekrarlar ayıklanmış tahmin. **Kesin kişi sayısı değildir**: aynı kişi farklı günlerde veya farklı cihazlarla birden çok sayılabilir.
- **Bot**: bağlantı önizleyicileri ve otomatik tarayıcılar ayrı gösterilir.

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
