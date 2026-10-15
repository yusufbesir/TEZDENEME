# Test raporu

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q] · Tarih: 2026-10-15

## Özet

- **Otomatik testler:** 217 test, hepsi geçti (`bash scripts/test.sh` veya `python manage.py test qr`).
- **Uçtan uca testler** bulut geliştirme ortamında, gerçek Docker Compose yığınıyla (PostgreSQL 17.6, Caddy 2.10.2, uygulama imajı; sıkılaştırılmış ayarlar ve MFA zorunlu) yapıldı. Alan adı ve VPS henüz olmadığı için HTTPS yerine `http://localhost:8080` kullanıldı.
- **Yapılamayanlar (açıkça):** gerçek alan adında HTTPS sertifikası alma ve fiziksel baskıdan telefonla okuma. Bunlar VPS kurulumunda yapılmalı (bkz. sonda).
- Bağımsız denetim: gereksinim doğrulaması **Geçti**; güvenlik denetimi iki tur yapıldı, bulunan Orta bulgular düzeltildi (bkz. “Güvenlik denetimi”).

## Test listesi (görevdeki 20 madde)

| # | Test | Beklenen | Gerçekleşen | Nasıl |
|---|---|---|---|---|
| 1 | Yeni QR kod oluşturma | Panelden kayıt, kısa adres üretilir | ✅ 302, kayıt ve “ilk hedef” geçmişi oluştu | Otomatik + uçtan uca (panel formu POST) |
| 2 | QR'ı tarayıp doğru hedefe ulaşma | 302 → hedef URL | ✅ `/k/sonbahar-001` → `…/kampanya/sonbahar` | Otomatik + uçtan uca |
| 3 | Hedef URL değiştirme | Kayıt güncellenir, geçmişe yazılır | ✅ HedefGecmisi + denetim kaydı oluştu | Otomatik + uçtan uca |
| 4 | Aynı QR'ın yeni hedefe gitmesi | Aynı kod → yeni hedef | ✅ `/k/sonbahar-001` → `…/kampanya/kis` (büyük harfle `SONBAHAR-001` de) | Otomatik + uçtan uca |
| 5 | Başlangıç/bitiş tarihleri | Başlamadı/bitti mesajı veya ayarlı adres | ✅ `KMP-0002` (1 Kasım'da başlıyor) “henüz başlamadı” gösterdi; bitti senaryoları otomatik testte | Otomatik + uçtan uca |
| 6 | Pasif QR davranışı | Güvenli mesaj, yönlendirme yok | ✅ | Otomatik |
| 7 | Geçersiz kısa kod | 404 “kod tanınmadı” | ✅ | Otomatik + uçtan uca |
| 8 | Hatalı URL | `javascript:`, `data:`, `file:`, yerel/özel IP, kullanıcı:parola@ reddedilir | ✅ (ondalık/onaltılık IP, `[::1]`, `foo.local.`, 100.64/10 dahil) | Otomatik + güvenlik denetimi |
| 9 | Toplu CSV/Excel içe aktarma | Eşleştirme, doğrulama, onay, kayıt, rapor | ✅ Örnek Excel 3 kayıt; 5.000 satırlık CSV 32 sn'de uygulandı | Otomatik + uçtan uca |
| 10 | Mükerrer kod kontrolü | Büyük/küçük harf duyarsız red | ✅ formda, dosya içinde ve veritabanında | Otomatik |
| 11 | QR görsellerinin toplu dışa aktarılması | ZIP: PNG + SVG + liste | ✅ ZIP'teki her PNG OpenCV ile okundu, içerik kısa adres | Otomatik + uçtan uca |
| 12 | Kampanya sayfası oluşturma/düzenleme | Form, görsel yükleme, taslak/yayın | ✅ Kapak görseli yüklendi, Caddy'den 200 sunuldu | Otomatik + uçtan uca |
| 13 | Yetkisiz erişim | Giriş yok → giriş sayfası; yetkisiz rol → 403; MFA'sız panel yok | ✅ | Otomatik + uçtan uca + güvenlik denetimi |
| 14 | Yönetici işlem geçmişi | Denetim kaydı, değiştirilemez | ✅ DB tetikleyicisi UPDATE/DELETE'i engelliyor | Otomatik |
| 15 | Veritabanı yedeği | Günlük yedek + doğrulama + durum | ✅ `db-*.dump`, `medya-*.tar.gz`, `sha256`, panel durumu “başarılı” | Uçtan uca |
| 16 | Yedekten geri yükleme | Geçici veritabanına yükleme, sayılar eşit | ✅ `geri-yukleme-testi.sh`: **GEÇTİ** (6 tablo sayısı eşit) | Uçtan uca |
| 17 | Konteyner yeniden başlatma | Veri kaybı yok | ✅ `restart` ve `down` + `up` sonrası QR hedefi ve görseller yerinde | Uçtan uca |
| 18 | Mobil tarayıcı uyumluluğu | Taşma yok, konsol/CSP hatası yok | ✅ iPhone 13 ve Pixel 7 öykünmesi (Chromium/Playwright): kampanya sayfası ve panel | Uçtan uca (öykünme) |
| 19 | Fiziksel baskıdan okuma | Basılı QR telefonla okunur | ⚠️ **Yapılmadı.** Dijital PNG'ler OpenCV ile okundu; fiziksel baskı testi sizin tarafınızdan yapılmalı | — |
| 20 | Eş zamanlı isteklerde performans | Yönlendirme hızlı ve hatasız | ✅ 2.000 istek / 50 eş zamanlı: **457 istek/sn**, medyan 101 ms, p95 157 ms, hata 0 | Uçtan uca (bulut ortamı, 4 vCPU) |

## Ek ölçümler

- Hız sınırı: aynı IP'den 400 ardışık tarama → 120 yönlendirme, 280 “429 çok fazla istek”.
- 5.000 satır içe aktarma: önizleme 1,9 sn, uygulama 32 sn, ZIP 35 sn. 20.000 satır birkaç dakika sürebilir (istek zaman aşımı 300 sn).
- QR hata düzeltme seviyesi M (%15); baskıda en az 2 × 2 cm önerilir.

## Güvenlik denetimi

İki tur bağımsız denetim (Opus) yapıldı. Kritik veya Yüksek bulgu çıkmadı.

- 1. tur: 4 Orta (MFA kurulum anahtarının paylaşılması, IP değiştirerek deneme kilidini atlatma, giriş ucunda Argon2 ile kaynak tüketimi, Excel dosyasıyla CPU tüketimi) ve 10 Düşük/Bilgi bulgu. Hepsi düzeltildi.
- 2. tur: 10 bulgu kapandı; 2 yeni Orta (Unicode kullanıcı adı varyantlarıyla sayaç atlatma, tek satırda hücre tekrarıyla bellek tüketimi) ve 2 Düşük bulgu çıktı; bunlar da düzeltildi. Son durum doğrulayıcı tarafından aşağıda onaylandı.

## VPS'te yapılması gereken testler

1. `https://ALAN-ADINIZ/saglik` → 200 ve tarayıcıda kilit simgesi (Let's Encrypt).
2. `http://` adresinin `https://`'e yönlenmesi.
3. Bir QR'ı yazıcıdan basıp iki farklı telefonla (iPhone kamera, Android kamera/Google Lens) okutmak; hedefi değiştirip aynı baskıyı yeniden okutmak.
4. Dışarıdan `nc -zv SUNUCU_IP 5432` bağlanamamalı.
5. `bash scripts/test.sh` ve `bash scripts/geri-yukleme-testi.sh` sunucuda.
