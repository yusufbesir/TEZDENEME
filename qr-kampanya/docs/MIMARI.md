# Mimari kararı ve gerekçeleri

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q] · Tarih: 2026-10-15

## Özet

- **Seçilen mimari: B — tek, özel uygulama.** Yönlendirme, QR üretimi, kampanya sayfaları, istatistik ve yönetim paneli tek bir Django uygulamasında toplanır.
- Bileşenler: **Django 5.2 LTS** (Python 3.13) + **PostgreSQL 17** + **Caddy 2** (HTTPS) + **Gunicorn**, hepsi **Docker Compose** ile.
- Ek servis (Redis, kuyruk, mikroservis) yoktur. Toplam 4 konteyner: `db`, `app`, `caddy`, `yedek`.
- Karar danışmanı Jev bu oturumda erişilebilir değildi (Jev bağlantısı ayrı bir iş parçacığında kuruluyordu). Karar, proje kuralı gereği Opus düzeyinde verildi ve aşağıda gerekçelendirildi.

## 1. Seçeneklerin karşılaştırması

| Ölçüt | A: YOURLS + ayrı kampanya uygulaması | B: Tek özel uygulama (seçilen) |
|---|---|---|
| Lisans maliyeti | Ücretsiz (MIT) | Ücretsiz (Django BSD, PostgreSQL, Caddy Apache-2) |
| Sunucu maliyeti | 2 uygulama + MySQL/MariaDB + ikinci veritabanı → daha çok RAM | 1 uygulama + 1 veritabanı → en küçük VPS'te çalışır |
| Geliştirme zorluğu | YOURLS'te ürün/kampanya/mağaza alanları, tarih kuralları, “başlamadı/bitti” sayfaları, toplu içe aktarmada sütun eşleştirme yok; eklenti (PHP) yazmak veya iki sistemi senkronize etmek gerekir | Bütün kurallar tek veri modelinde; ilk sürüm daha uzun sürer ama sonrası kolay |
| Güvenlik | İki ayrı yönetim paneli, iki ayrı oturum sistemi, PHP + başka bir dil; saldırı yüzeyi iki katı. YOURLS'te rol yetkisi ve MFA yerleşik değil | Tek panel, tek oturum, Django'nun yerleşik CSRF/XSS/SQL injection korumaları, roller, MFA, denetim kaydı |
| Bakım yükü | İki yazılımın ayrı ayrı güncellenmesi, uyumluluk takibi | Tek bağımlılık listesi (`requirements.txt`), tek güncelleme prosedürü |
| Veri bütünlüğü | Kısa kod YOURLS'te, kampanya bilgisi diğer sistemde; tutarsızlık riski | Kısa kod, hedef geçmişi ve kampanya aynı veritabanında, kısıtlamalarla korunur |
| İstatistik | YOURLS tıklama sayar; bot ayrımı, tekil tahmin, mağaza/ürün kırılımı yok | İstenen bütün kırılımlar tek sorguyla |

**Sonuç:** Kullanım senaryosu (binlerce kod, kampanya/ürün/mağaza ilişkileri, tarih kuralları, kendi kampanya sayfaları, toplu içe aktarma) YOURLS'ün tasarım amacının dışında. A seçeneği iki sistemi birbirine bağlamak için özel kod gerektirir; bu, B'deki işin büyük kısmını yine yapmak demektir ve üstüne ikinci bir yazılımın bakımı eklenir. **B daha ucuz, daha güvenli ve bakımı daha kolay.**

## 2. Neden bu teknolojiler

- **Django 5.2 LTS:** Uzun süreli destek (güvenlik güncellemeleri 2028 Nisan'a kadar). Parola saklama (Argon2), oturum, CSRF, şablonlarda otomatik XSS kaçışı, ORM ile SQL injection koruması ve veritabanı migrasyonları yerleşik. Türkçe dil desteği hazır.
- **PostgreSQL 17:** Güvenilir ilişkisel veritabanı; benzersizlik ve kontrol kısıtlamaları, `pg_dump` ile tutarlı yedek.
- **Caddy 2:** Let's Encrypt sertifikasını otomatik alır ve yeniler; yapılandırması kısa (bkz. `caddy/Caddyfile`). Nginx + certbot'a göre daha az parça.
- **segno:** Saf Python QR kütüphanesi; PNG ve SVG üretir, dış bağımlılığı yok.
- **openpyxl:** Excel (.xlsx) okuma/yazma.
- **pyotp:** Doğrulama uygulaması (Google Authenticator, Microsoft Authenticator vb.) ile çok faktörlü giriş.

## 3. Sistem şeması

```
İnternet ──443/80──▶ caddy (HTTPS, güvenlik başlıkları, /medya dosyaları)
                       │  (web ağı)
                       ▼
                     app (Django + Gunicorn, root olmayan kullanıcı)
                       │  (ic ağı - internet erişimi yok)
                       ▼
                     db (PostgreSQL, portu dışarı açık değil)
                       ▲
                     yedek (her gün pg_dump + görseller → ./yedekler)
```

## 4. Adresler

| Adres | Açıklama |
|---|---|
| `https://qr.ORNEKFIRMA.com/k/<kısa-kod>` | QR'a basılan kalıcı adres. Hedef panelden değişir, adres değişmez. |
| `https://qr.ORNEKFIRMA.com/s/<sayfa-adresi>` | Sistemdeki kampanya / ürün / mağaza sayfası (kalıcı). |
| `https://qr.ORNEKFIRMA.com/panel/` | Türkçe yönetim paneli (giriş + MFA). |
| `https://qr.ORNEKFIRMA.com/saglik` | Sağlık kontrolü (ayrıntı vermez). |

`ORNEKFIRMA` örnek alan adıdır; `.env` içindeki `SITE_ALAN_ADI`, `SITE_ADRESI`, `DJANGO_ALLOWED_HOSTS` ve `ACME_EPOSTA` kendi bilgilerinizle değiştirilmelidir.

## 5. Yönlendirme akışı (`/k/<kod>`)

1. IP başına dakikalık hız sınırı (bellek içi, veritabanına yük bindirmez).
2. Kod, büyük/küçük harf duyarsız benzersiz indeksten tek sorguyla bulunur.
3. Yoksa → “kod tanınmadı” sayfası (404).
4. Arşivde → güvenli mesaj (410). Pasif → güvenli mesaj.
5. Tarih kontrolü (QR'ın kendi tarihi, yoksa bağlı kampanyanın tarihi): başlamadıysa / bittiyse panelde ayarlanan sayfa veya adres.
6. Hedef sistem sayfasıysa ve yayındaysa `/s/<sayfa>`'ya, harici adresse kayıtlı adrese **302** ile yönlendirme. (301 kullanılmaz; tarayıcı önbelleğe alır ve hedef değişikliğini bozar.)
7. Tek satırlık takma adlı (pseudonymous) tarama kaydı. Kayıt hatası yönlendirmeyi engellemez.

## 6. Kalıcılık ilkeleri (veri bütünlüğü)

- Kısa kod oluşturulduktan sonra **değiştirilemez** (model düzeyinde engel).
- QR kodlar ve sayfalar **silinmez, arşivlenir.** Silme denemesi hata verir; ilişkiler `PROTECT` ile korunur. Böylece basılmış bir kod başka bir kayda verilemez.
- Her hedef değişikliği `HedefGecmisi` tablosuna, her yönetici işlemi değiştirilemez `DenetimKaydi` tablosuna yazılır.

## 7. Ölçeklendirme seçenekleri (gerektiğinde, şimdi değil)

1. Gunicorn işçi sayısını artırmak (`docker-compose.yml`).
2. Tarama kayıtlarını toplu yazmak (bellek içi tampon) veya aylık bölümlenmiş tablo.
3. Yönlendirme sorgusunu kısa süreli önbelleğe almak (Redis eklemek).
4. Daha büyük VPS veya PostgreSQL'i ayrı sunucuya almak.

İlk sürüm için bunların hiçbiri gerekli değildir.
