# Veri modeli

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q] · Kaynak: `app/qr/models.py`, migrasyonlar `app/qr/migrations/`

## Özet

- 18 uygulama tablosu + Django'nun kullanıcı/rol tabloları.
- **Hiçbir QR kodu veya sayfa silinmez**; arşivlenir. QR kodlarda “silme” yalnızca **çöp kutusuna taşımadır** (kalıcı silme yoktur). İlişkiler `PROTECT` ile korunur.
- Kısa kod büyük/küçük harf duyarsız benzersizdir ve oluşturulduktan sonra değiştirilemez.

## Tablolar

| Tablo (model) | Amaç | Benzersiz alanlar | İndeksler | Silme davranışı |
|---|---|---|---|---|
| `auth_user`, `auth_group` | Kullanıcılar ve roller (Yönetici, Editör, İzleyici) | kullanıcı adı | — | Kullanıcı silinmez, pasifleştirilir. Silinirse kayıtlardaki “oluşturan/değiştiren” boşalır (SET NULL) |
| `qr_magaza` | Mağaza / şube | `kod` | — | QR koda bağlıysa silinemez (PROTECT) |
| `qr_urun` | Ürün | `kod` | — | QR koda bağlıysa silinemez |
| `qr_kampanya` | Kampanya ve tarihleri | `kod` | — | QR veya sayfaya bağlıysa silinemez |
| `qr_kampanyasayfasi` | Sistemde yayınlanan sayfalar | `slug` (kalıcı adres) | durum | Silinemez (model hata verir), arşivlenir |
| `qr_sayfagorseli` | Sayfadaki ürün/koleksiyon görselleri | — | — | Sayfayla birlikte (CASCADE); tek tek kaldırılabilir |
| `qr_qrkod` | QR kod kayıtları | `kimlik` (UUID), `kod_anahtari` (kısa kodun küçük harfli hâli) | (tur, durum), bitis, durum | **Silinemez**, arşivlenir veya çöp kutusuna taşınır (`durum = cop`) |
| `qr_hedefgecmisi` | Her hedef değişikliği (eski → yeni, kim, ne zaman) | — | zaman | Silinmez |
| `qr_denemesayaci` | Giriş/MFA başarısız deneme sayaçları (anahtar bir özettir; süresi dolunca yeniden kullanılır) | — | anahtar (unique), bitis | Süresi dolanlar otomatik sıfırlanır/temizlenir |
| `qr_apianahtari` | API anahtarları (kullanıcı, ad, önek, HMAC özeti; düz anahtar saklanmaz) | kullanıcı (PROTECT) | onek (unique) | Silinmez; iptal = `iptal_zamani` dolar |
| `qr_kullaniciapiayari` | Kullanıcı başına API ayarı (`parola_girisi`, varsayılan kapalı) | kullanıcı (CASCADE, 1-1) | kullanici (unique) | Kullanıcı panelden değiştirir |
| `qr_linkagaci` | Link ağaçları (`/l/<slug>`): başlık, açıklama, tema (açık/koyu), vurgu rengi (`#RRGGBB`), durum (taslak/yayında/çöp), `onceki_durum`, `cope_atilma`, oluşturan | `slug` (küçük harf, 3-64, ayrılmış kelime denetimi, değiştirilemez) | durum | **Silinemez** (model hata verir, veritabanı tetikleyicisi 0012), çöp kutusuna taşınır |
| `qr_linkagaciogesi` | Ağaçtaki düğmeler: `agac`, `sira`, `etiket` (100), `qr` (zorunlu, PROTECT; her bağlantı kısa linkten geçer), `gorunur` | — | — | Ağaçtan çıkarılabilir (kısa link ve taramaları silinmez); ağaç silinmediği için CASCADE fiilen çalışmaz |
| `qr_linkagacigoruntuleme` | Günlük görüntüleme sayacı (ağaç, gün, sayı; IP/UA yok; `INSERT … ON CONFLICT DO UPDATE sayi = sayi + 1`) | (`agac`, `gun`) | — | Silinmez (ağaç PROTECT) |
| `qr_tarama` | Takma adlı (pseudonymous) tarama olayları (zaman, sonuç, cihaz, bot, özet, `yonlendiren` alan adı, `ulke` kodu) | — | (qr, zaman), zaman | Saklama süresi sonunda temizlenir (`TARAMA_SAKLAMA_GUN`) |
| `qr_denetimkaydi` | Yönetici işlemleri | — | zaman, eylem | Değiştirilemez ve silinemez (model düzeyinde) |
| `qr_genelayarlar` | Varsayılan yönlendirme davranışları, marka, herkese açık istatistik anahtarları (`herkese_acik_istatistik`, `istatistikte_hedef_goster`; ikisi de varsayılan kapalı) | tek satır (id=1) | — | — |
| `qr_mfacihazi` | Kullanıcının doğrulama uygulaması anahtarı | kullanıcı | — | Kullanıcıyla birlikte |
| `onbellek` | Giriş denemesi sayaçları | — | — | Geçici veri |

## Veritabanı rolleri

| Rol | Kim kullanır | Yetki |
|---|---|---|
| `POSTGRES_USER` (süper kullanıcı) | Yalnızca veritabanı konteyneri ve bakım | Her şey. Uygulamaya verilmez. |
| `qr_sahip` | `hazirlik` servisi (migrasyonlar), yedek servisi | Tabloların sahibi; tablo oluşturur/değiştirir. Süper kullanıcı değildir. |
| `qr_uygulama` | Çalışan uygulama (`app`) | Yalnızca SELECT/INSERT/UPDATE/DELETE. Tablo silemez, tetikleyici kapatamaz, TRUNCATE yapamaz. `qr_qrkod`, `qr_kampanyasayfasi`, `qr_hedefgecmisi`'nde DELETE, `qr_denetimkaydi`'nda UPDATE/DELETE yetkisi yoktur. |

Roller `db/init/10-roller.sh` ile kurulur (migrasyon `0005` ek yetki kısıtlarını uygular). Kontrol: `bash scripts/rol-dogrulama.sh`.

## QR kod alanları

Zorunlu olanlar yalnızca **kısa kod** (boşsa otomatik üretilir) ve **hedef** (harici URL veya sistem sayfası). Diğerleri isteğe bağlıdır: ad, **hedef başlığı** (`baslik`, en çok 300 karakter), tür, ürün, kampanya, mağaza, başlangıç/bitiş, bitiş sonrası adres, durum, açıklama, etiketler. Oluşturan/değiştiren kullanıcı ve tarihler otomatik tutulur.

Veritabanı kısıtlaması `qr_hedef_tutarli`: arşivde (`arsiv`) veya çöp kutusunda (`cop`) olmayan her kodun geçerli bir hedefi olmalıdır (harici ise URL dolu, sayfa ise sayfa seçili). Kısıt migration `0010` ile `cop` için de muaf tutulacak biçimde güncellendi.

**Durum değerleri (`QRKod.durum`):** `aktif`, `pasif`, `arsiv`, `cop` (“Çöp kutusunda”). Tarama sonucu (`Tarama.sonuc`) için yeni değer `cop` (“Çöp kutusundaki kod”); `/k/<kod>` çöpteki kod için arşivdeki gibi HTTP 410 bilgi sayfası verir.

**Çöp kutusu alanları (migration `0010_yourls_ozellikleri_3b`):**

| Alan | Tür | Anlam |
|---|---|---|
| `cope_atilma` | DateTime, boş olabilir | Çöp kutusuna taşınma zamanı; geri yüklenince boşalır |
| `onceki_durum` | Metin (en çok 10), boş olabilir | Çöpe atılmadan önceki durum (`aktif`/`pasif`/`arsiv`); geri yüklemede durum buna döner (kayıt yoksa/geçersizse güvenli tarafta `pasif`). Geri yüklenince boşalır |

Çöpteki kodun kısa kodu (`kod_anahtari` benzersizliği sürer) başka bir kayda verilemez. Taşıma ve geri yükleme `servisler.qr_cope_tasi` / `qr_copten_geri_yukle` ile yapılır ve denetim kaydına (`qr_cope_tasi`, `qr_copten_geri_yukle`) yazılır. `QRKod.delete()` engeli aynen sürer; kalıcı silme ucu/düğmesi yoktur. Normal QR formu `cop` durumunu seçenek olarak sunmaz; çöpteki kod normal formla ya da hızlı düzenlemeyle değiştirilemez.

**Genel ayarlar (ek alanlar, migration 0007):** `ayrilmis_kodlar` (satır veya virgülle ayrılmış ek ayrılmış kelimeler) ve `ayni_hedef_uyarisi` (varsayılan açık). Koddaki varsayılan ayrılmış liste: admin, panel, api, k, s, saglik, static, media, giris, cikis, robots, favicon. Ayrılmış kelime denetimi yalnızca yeni kodlarda (panel formu ve toplu içe aktarma) çalışır; mevcut kayıtlar etkilenmez.

## Tarih kuralı

QR'ın kendi başlangıç/bitiş tarihi varsa o kullanılır; yoksa bağlı kampanyanın tarihleri kullanılır. Bitiş anı dahil değildir (bitiş saatinden itibaren “bitti” sayılır).

## Kişisel veri (KVKK)

- `qr_tarama` IP adresi **saklamaz**. Yalnızca zaman, sonuç, cihaz türü, bot işareti ve `ziyaretci_ozeti` tutulur.
- `ziyaretci_ozeti`: IP + tarayıcı bilgisinin, **her gün değişen** gizli bir tuzla alınmış özetinin ilk 32 karakteri. Aynı gün içindeki tekrar taramaları ayırmaya yarar; IP geri elde edilemez ve farklı günler eşleştirilemez. Özet anonim değil, takma adlıdır (pseudonymous): aynı gün aynı IP+UA aynı değeri verir ve `SECRET_KEY` sahibi bilinen bir IP/UA çiftini doğrulayabilir. Gün, Europe/Istanbul yerel günüdür.
- `qr_tarama.yonlendiren` (CharField 253): Referer başlığının **yalnızca ana makine adı** (küçük harf, port yok, `www.` olduğu gibi kalır). Yol, sorgu, parça ve kullanıcı bilgisi hiçbir zaman saklanmaz; kendi alan adımız, IP adresli, tek etiketli (`localhost`) ve geçersiz Referer'lar boş kalır. IDN alan adları punycode saklanır.
- `qr_tarama.ulke` (CharField 2): isteğe bağlı GeoIP (`GEOIP_VERITABANI`) sonucu ISO ülke kodu; ayar boşsa ya da dosya yoksa boş. IP yalnızca bellekte aranır, saklanmaz. User-Agent de saklanmaz (yalnızca ondan türetilen cihaz türü ve bot işareti).
- Migrasyon `0011_yourls_ozellikleri_4`: iki Tarama alanı ve iki GenelAyarlar anahtarı eklenir (eski satırlarda boş/kapalı; veri kaybı yok).
- Denetim kaydında IP'nin yalnızca maskelenmiş hâli (IPv4 /24) tutulur.
- Çerez yalnızca panel oturumu için kullanılır; halka açık sayfalar çerez veya izleme kodu kullanmaz.
