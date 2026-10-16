# Veri modeli

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q] · Kaynak: `app/qr/models.py`, migrasyonlar `app/qr/migrations/`

## Özet

- 11 tablo + Django'nun kullanıcı/rol tabloları.
- **Hiçbir QR kodu veya sayfa silinmez**; arşivlenir. İlişkiler `PROTECT` ile korunur.
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
| `qr_qrkod` | QR kod kayıtları | `kimlik` (UUID), `kod_anahtari` (kısa kodun küçük harfli hâli) | (tur, durum), bitis, durum | **Silinemez**, arşivlenir |
| `qr_hedefgecmisi` | Her hedef değişikliği (eski → yeni, kim, ne zaman) | — | zaman | Silinmez |
| `qr_denemesayaci` | Giriş/MFA başarısız deneme sayaçları (anahtar bir özettir; süresi dolunca yeniden kullanılır) | — | anahtar (unique), bitis | Süresi dolanlar otomatik sıfırlanır/temizlenir |
| `qr_tarama` | Takma adlı (pseudonymous) tarama olayları | — | (qr, zaman), zaman | Saklama süresi sonunda temizlenir (`TARAMA_SAKLAMA_GUN`) |
| `qr_denetimkaydi` | Yönetici işlemleri | — | zaman, eylem | Değiştirilemez ve silinemez (model düzeyinde) |
| `qr_genelayarlar` | Varsayılan yönlendirme davranışları, marka | tek satır (id=1) | — | — |
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

Veritabanı kısıtlaması `qr_hedef_tutarli`: arşivde olmayan her kodun geçerli bir hedefi olmalıdır (harici ise URL dolu, sayfa ise sayfa seçili).

**Genel ayarlar (ek alanlar, migration 0007):** `ayrilmis_kodlar` (satır veya virgülle ayrılmış ek ayrılmış kelimeler) ve `ayni_hedef_uyarisi` (varsayılan açık). Koddaki varsayılan ayrılmış liste: admin, panel, api, k, s, saglik, static, media, giris, cikis, robots, favicon. Ayrılmış kelime denetimi yalnızca yeni kodlarda (panel formu ve toplu içe aktarma) çalışır; mevcut kayıtlar etkilenmez.

## Tarih kuralı

QR'ın kendi başlangıç/bitiş tarihi varsa o kullanılır; yoksa bağlı kampanyanın tarihleri kullanılır. Bitiş anı dahil değildir (bitiş saatinden itibaren “bitti” sayılır).

## Kişisel veri (KVKK)

- `qr_tarama` IP adresi **saklamaz**. Yalnızca zaman, sonuç, cihaz türü, bot işareti ve `ziyaretci_ozeti` tutulur.
- `ziyaretci_ozeti`: IP + tarayıcı bilgisinin, **her gün değişen** gizli bir tuzla alınmış özetinin ilk 32 karakteri. Aynı gün içindeki tekrar taramaları ayırmaya yarar; IP geri elde edilemez ve farklı günler eşleştirilemez. Özet anonim değil, takma adlıdır (pseudonymous): aynı gün aynı IP+UA aynı değeri verir ve `SECRET_KEY` sahibi bilinen bir IP/UA çiftini doğrulayabilir. Gün, Europe/Istanbul yerel günüdür.
- Denetim kaydında IP'nin yalnızca maskelenmiş hâli (IPv4 /24) tutulur.
- Çerez yalnızca panel oturumu için kullanılır; halka açık sayfalar çerez veya izleme kodu kullanmaz.
