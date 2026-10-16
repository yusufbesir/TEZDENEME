# Test raporu

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q] · Tarih: 2026-10-15

## Özet

- **Otomatik testler:** 419 test, hepsi geçti (`bash scripts/test.sh` veya `python manage.py test qr`; gerçek rclone gerektiren testler `QR_TEST_RCLONE` verilince çalışır). Ham çıktı: `docs/kanit/test-ciktisi-2026-10-16-denetmen-q1.txt`; önceki 397 testlik koşu `docs/kanit/test-ciktisi-2026-10-15-siber-denetmen.txt`, önceki 354 testlik koşu `docs/kanit/test-ciktisi-2026-10-15-basdenetmen.txt`, önceki 338 testlik koşu `docs/kanit/test-ciktisi-2026-10-15-yedek-riskleri.txt` (önceki 264 testlik koşu: `docs/kanit/test-ciktisi-2026-10-15.txt`).
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
| 15 | Veritabanı yedeği | Günlük şifreli yedek + doğrulama + durum | ✅ `db-*.dump.age`, `medya-*.tar.gz.age` (age ile şifreli), `sha256`, panel durumu “başarılı”; yedek konteynerinde özel anahtar yok | Uçtan uca |
| 16 | Yedekten geri yükleme | sha256 kontrolü, şifre çözme, geçici veritabanına yükleme, sayılar eşit | ✅ `geri-yukleme-testi.sh`: **GEÇTİ** (iki ayrı temiz kurulumda; ham çıktılar `docs/kanit/geri-yukleme-testi-*.txt`). Bozulmuş yedek ve yanlış anahtar reddedildi. | Uçtan uca |
| 17 | Konteyner yeniden başlatma | Veri kaybı yok | ✅ `restart` ve `down` + `up` sonrası QR hedefi ve görseller yerinde | Uçtan uca |
| 18 | Mobil tarayıcı uyumluluğu | Taşma yok, konsol/CSP hatası yok | ✅ iPhone 13 ve Pixel 7 öykünmesi (Chromium/Playwright): kampanya sayfası ve panel | Uçtan uca (öykünme) |
| 19 | Fiziksel baskıdan okuma | Basılı QR telefonla okunur | ⚠️ **Yapılmadı.** Dijital PNG'ler OpenCV ile okundu; fiziksel baskı testi sizin tarafınızdan yapılmalı | — |
| 20 | Eş zamanlı isteklerde performans | Yönlendirme hızlı ve hatasız | ✅ 2.000 istek / 50 eş zamanlı: **457 istek/sn**, medyan 101 ms, p95 157 ms, hata 0 | Uçtan uca (bulut ortamı, 4 vCPU) |

## Ek ölçümler

- Hız sınırı: aynı IP'den 400 ardışık tarama → 120 yönlendirme, 280 “429 çok fazla istek”.
- Hız sınırı veritabanına taşındıktan sonra: 4 Gunicorn işçisiyle sınır tam 120'de kalıyor (işçiler arası paylaşımlı); uçtan uca denemede sınır 5'e ayarlanınca 30 istekten 5'i 302, 25'i 429. Yönlendirme veriminde yaklaşık %20 düşüş ölçüldü (her istekte bir DB yazımı).
- 5.000 satır içe aktarma: önizleme 1,9 sn, uygulama 32 sn, ZIP 35 sn. 20.000 satır birkaç dakika sürebilir (istek zaman aşımı 300 sn).
- QR hata düzeltme seviyesi M (%15); baskıda en az 2 × 2 cm önerilir.

## Güvenlik denetimi

İki tur bağımsız denetim (Opus) yapıldı. Kritik veya Yüksek bulgu çıkmadı.

- 1. tur: 4 Orta (MFA kurulum anahtarının paylaşılması, IP değiştirerek deneme kilidini atlatma, giriş ucunda Argon2 ile kaynak tüketimi, Excel dosyasıyla CPU tüketimi) ve 10 Düşük/Bilgi bulgu. Hepsi düzeltildi.
- 2. tur: 10 bulgu kapandı; 2 yeni Orta (Unicode kullanıcı adı varyantlarıyla sayaç atlatma, tek satırda hücre tekrarıyla bellek tüketimi) ve 2 Düşük bulgu çıktı; bunlar da düzeltildi. Son durum doğrulayıcı tarafından aşağıda onaylandı.

## Bağımsız denetmen bulguları (15 Ekim, ikinci denetim)

| # | Bulgu | Yapılan | Kanıt |
|---|---|---|---|
| 1 | Yedekler şifrelenmiyor | age ile asimetrik şifreleme; özel anahtar yalnızca sunucudaki `gizli/` klasöründe ve parola yöneticisinde, yedek konteynerinde yok | Uçtan uca: yalnızca `.age` dosyaları, `file` çıktısı “age encrypted file” |
| 2 | Eski yedekler uzak kopya olmadan siliniyor; geri yükleme kanıtı yok | Yerel silme yalnızca `disari-kopyala.sh`'de, uzakta rclone ile doğrulanmış tam yedekler için; en yeni yedek hiç silinmez; uzak kopya yoksa hiçbir şey silinmez ve panel uyarır | rclone (local arka uç) ile deneme; `docs/kanit/geri-yukleme-testi-*.txt` |
| 3 | Uygulama hesabı süper kullanıcı | `qr_sahip` / `qr_uygulama` rolleri, `hazirlik` servisi | `scripts/rol-dogrulama.sh`: DROP, DISABLE TRIGGER, TRUNCATE, DELETE, UPDATE denetim, CREATE reddedildi; eski sürümden yükseltme `docs/kanit/yukseltme-testi-2026-10-15.txt` |
| 4 | Bağımlılıklar hash'siz, tarama yok | 16 paket hash'li kilit dosyası, `--require-hashes`; `guvenlik-tarama.sh` | Bozuk hash ile kurulum reddedildi; `docs/kanit/pip-audit-2026-10-15.txt`: zafiyet yok |
| 5 | Taslak sayfa görselleri herkese açık | Caddy `forward_auth` + `/ic/medya-yetki` | Uçtan uca: yayındaki görsel 200, taslak anonim 404, yetkili oturumla 200, `../` türevleri 404 |
| 6 | Kampanya başına erişim | İstenen özellikler arasında yok; eklenmedi, `GUVENLIK.md`'de sınırlama olarak yazıldı | — |
| 7 | Düşük bulgular | IPv6 /64 yönlendirme hız sınırında; geri yüklemede sha256 doğrulaması; tek işlemli geri yükleme; dosya adı doğrulaması. `db`/`yedek` konteyner sıkılaştırması sınırlama olarak kaldı | Birim testleri |

Düzeltmelerden sonra iki tur iç güvenlik denetimi (Opus) yapıldı; ilk turdaki Orta bulgu (eski kurulumu güncellerken yedeğin rol oluşmadan alınması) düzeltildi ve eski sürümden yükseltme uçtan uca denendi.

## Denetmenin son üç küçük riski (15 Ekim, akşam)

| # | Risk | Yapılan | Kanıt |
|---|---|---|---|
| 1 | Özel yedek anahtarı sunucuda kalıyor | Anahtar bellekte (tmpfs) ve Docker günlüğüne düşmeden üretilir, ekranda bir kez gösterilir; `EVET` + anahtarın geri yapıştırılıp birebir eşleşmesiyle diske hiç yazılmadan kaldırılır. Onay yoksa/kesilirse önce `gizli/` (700/600) altına kaydedilir, sonra `.env` yazılır; anahtar hiçbir yolda kaybolmaz. Geri yükleme ve aylık test anahtarı gizli girişle ister | pty ile birim testleri; gerçek Docker ile `docker logs` ve `/var/lib/docker/containers` taraması: 0 eşleşme |
| 2 | Aynı makinedeki hedef “uzak” sayılıp yerel yedek silinebilir | Sunucu dışı tür izin listesi; yerel yol, `local`/`archive`/`memory`, bu makineyi gösteren host/endpoint/url (localhost, 127/8, ::1, makine adı ve IP'leri), `ssh=`, `unix_socket`, `use_emulator`, seçenekli ad ve bilinmeyen tür yerel sayılır, silme yapılmaz. Tüm rclone çağrıları `RCLONE_*` ortam değişkenleri olmadan çalışır | Gerçek rclone v1.75.0: sftp localhost, alias→yerel, archive, webdav unix soketi, ortam değişkeni yönlendirmeleri; hepsinde yerel dosyalar duruyor |
| 3 | SFTP/Storage Box'ta yalnızca boyutla doğrulama | Ortak özet `rclone backend features` ile açıkça sorgulanır; sftp/ftp/smb/webdav ve belirsiz durumda otomatik `--download`, yalnızca silinmeye aday + en yeni yedekle sınırlı; o da başarısızsa silme yok | Gerçek `rclone serve sftp` (hash kapalı) ile `RCLONE_LOG_LEVEL=ERROR` altında bile indirerek doğrulama |
| — | `guncelle.sh` düşükleri | `up -d --no-deps app`; yeni Caddyfile ayrı kapta doğrulanır, geçersizse çalışan Caddy'ye dokunulmaz; RestartCount kontrolü | Geçersiz Caddyfile ile e2e: hata, eski Caddy aynı |

Bu değişiklikler beş tur bağımsız doğrulama ve beş tur güvenlik denetiminden (Opus) geçti; her turdaki Orta bulgular düzeltildi, son turda Kritik/Yüksek/Orta bulgu kalmadı. Kalan Düşükler `GUVENLIK.md` → Bilinen sınırlamalar. Ham çıktılar: `docs/kanit/yedek-riskleri-*.txt`. Gerçek bir Hetzner Storage Box'a karşı denenmedi.

## Baş Denetmen bulguları (0a9a2df, 15 Ekim gece)

| # | Bulgu | Yapılan | Kanıt |
|---|---|---|---|
| 1 | `bash -x` altında anahtar stderr'e sızıyor | Anahtar işlenen bölümler `{ set +x +v; } 2>/dev/null` korumalı, önceki durum geri yüklenir | `bash -x`, `-xv`, `SHELLOPTS=xtrace`, `BASH_XTRACEFD` ile pty denemeleri: stdout/stderr/izleme dosyasında anahtar yok |
| 2 | `--goster-ve-kaldir`'da shred garanti değil | Silmeden önce ve sonra açık uyarı; belge | Birim testleri |
| 3 | NAT/kapsayıcı arkasındaki hedef "uzak" sayılabilir | Yerel yedek silme yalnızca `.env`'de `YEDEK_UZAK_ONAYLI_HEDEF=<ad>` açık onayıyla; bağlantı dizesi ve yerel yol onaylanamaz; özel ağ adresleri onayla bile yerel; `YEDEK_YEREL_HEDEF_IZIN` hedef adına eşit olmalı ve günlüğe yazılır | Gerçek rclone (`listremotes`/`config show`): onaysız b2 silmedi, onaylı sildi; 10.x ve 172.18.x onaylı bile silmedi |
| — | Düşükler | Atomik anahtar kaydı (üzerine yazmaz), docker `--mount`, bağlantı dizesinde kimlik bilgisi uyarısı, B2/S3 özet sınırı belgelendi | Gerçek docker ile `,` ve `:` içeren yol; `dst` enjeksiyonu işlemedi |

Bağımsız doğrulama Geçti, güvenlik denetimi (Opus) Geçti: Kritik/Yüksek/Orta yok. Kalan Düşükler `GUVENLIK.md`'de.

## VPS'te yapılması gereken testler

1. `https://ALAN-ADINIZ/saglik` → 200 ve tarayıcıda kilit simgesi (Let's Encrypt).
2. `http://` adresinin `https://`'e yönlenmesi.
3. Bir QR'ı yazıcıdan basıp iki farklı telefonla (iPhone kamera, Android kamera/Google Lens) okutmak; hedefi değiştirip aynı baskıyı yeniden okutmak.
4. Dışarıdan `nc -zv SUNUCU_IP 5432` bağlanamamalı.
5. `bash scripts/test.sh`, `bash scripts/rol-dogrulama.sh`, `bash scripts/guvenlik-tarama.sh` ve `bash scripts/geri-yukleme-testi.sh` sunucuda.
6. `disari-kopyala.sh` gerçek uzak hedefle bir kez çalışmalı ve panelde “sunucu dışı kopya doğrulandı” görünmeli.

## Siber Güvenlik Denetmeni bulguları (15 Ekim, gece)

| # | Bulgu | Yapılan | Kanıt |
|---|---|---|---|
| 1 | TOTP gizli anahtarları veritabanında düz metin | Fernet/MultiFernet ile şifreleme (`MFA_SIFRELEME_ANAHTARI`, döndürme destekli), migrasyon 0006 mevcut kayıtları tek işlemde şifreler; çözülemeyen kayıtla giriş yok | 21 birim testi; uçtan uca: DB'de `gAAAAA…` (140 karakter), dökümde düz base32 yok; 9993d61'den yükseltmede mevcut sır şifrelendi ve kullanıcı yeniden kurulum yapmadan girdi |
| 2 | Hız sınırı işçi başına | Sayaç `qr_denemesayaci` tablosunda, `INSERT … ON CONFLICT … RETURNING` ile atomik; anahtarlar IP yerine HMAC özeti | Uçtan uca: 3 işçide 30 istekten 5'i geçti; tabloda IP metni yok |
| 3 | Yedek konteyneri root | 10002:10002 (uygulamadan ayrı), grup 10001 ile medya okuma, `cap_drop: ALL`, `read_only`, `no-new-privileges`; db `cap_drop: ALL` + 5 yetki; eski kurulumlar için `yedek-dizini-hazirla.sh`, `medya-izni-hazirla.sh` | Uçtan uca `docker inspect`; okunamayan medya dosyasında yedek açık hatayla başarısız oluyor |
| 4 | Düşük: imaj digest, XML | `postgres`, `caddy`, `python` index digest ile sabit; Excel için `defusedxml` | 8 XML testi; `docker image inspect` mediaType index |
| — | Denetimin Düşük notları | Hata sayfasında Türkçe adlı sırlar gizlenir; yedek betiklerinde sembolik bağlantı izlenmez; GID 10001 açıkça verilir (host'ta 999 docker grubu olabileceği için) | `test_hata_filtresi.py`; uçtan uca `id uygulama` → `gid=10001` |

Süreç: bağımsız doğrulama (Sonnet, uçtan uca Docker: taze kurulum ve 9993d61'den yükseltme) **Geçti**; güvenlik denetimi (Opus) **Geçti**, Kritik/Yüksek/Orta yok. Ham çıktı: `docs/kanit/siber-denetmen-e2e-2026-10-15.txt`. Açık kalan Düşükler `docs/GUVENLIK.md` → Bilinen sınırlamalar. Ayrıca bulunan, bu değişiklikten önce de var olan bir hata: `kurulum.sh` ilk yönetici hesabını sormuyor (16 Ekim'de düzeltildi, aşağıya bakın).

## Baş Denetmen (Q1, Q2) ve Siber Güvenlik Denetmeni notları (16 Ekim)

| # | Bulgu | Yapılan | Kanıt |
|---|---|---|---|
| Q1 (Orta) | Root çalışan `disari-kopyala.sh`, yedek konteynerinin yazabildiği yedek dizininde sembolik bağlantıları izleyerek yazıyor | Yedek dizinine tüm yazmalar dizinin sahibi (10002) olarak `setpriv` ile (`scripts/dizin-guvenligi.sh`); `uzak-dogrulama.json` `mktemp` + `mv -fT`; `YEDEK_DIZINI` bağlantıysa gerçek hedefe çözülür; root'a ait grup/diğer yazılabilir dizin reddedilir; cron örneği `/var/log`'a | Uçtan uca: konteynerden konan bağlantılarla korunan root dosyası değişmedi (içerik, sahip, kip, mtime); gerçek rclone bağlantı izlemedi |
| Q1 ek (Yüksek, iç denetim) | `geri-yukleme-testi.sh` günlüğü aynı açığı taşıyordu (tahmin edilebilir ad) | Günlük dizin sahibi olarak yazılır | Uçtan uca: ~150 sn'lik bağlantı tuzağına rağmen korunan dosya değişmedi, geri yükleme GEÇTİ (saldırı altında betik rc 1 ile biter; güvenli taraf) |
| Q1 ek (Orta, iç denetim) | Eski belgelerdeki `>> yedekler/disari-kopya.log` cron satırı | `disari-kopyala.sh` bu satırı görürse hiçbir şey yazmadan syslog'a uyarıp çıkar; `guncelle.sh` uyarır ve doğru satırı yazar | Sahte crontab: rc 1, stdout/stderr 0 bayt, hiçbir dosya silinmedi |
| Q2 (Düşük) | Her yönlendirmede DB yazımı, temizlik 1/500 olasılıkla | Temizlik her işçide dakikada bir (zamana bağlı); tablo son birkaç dakikayla sınırlı. Yazım bilinçli bırakıldı (işçiler arası sınır için gerekli, ~%20 verim maliyeti) | Birim testi; uçtan uca 30 istekten 5×302 |
| Siber 1 (Düşük) | App grubu GID 999 host'ta docker grubuna denk gelebilir | GID 10001; yükseltmede `medya-izni-hazirla.sh` mevcut medyayı 10001'e taşır (yeni app'ten sonra bir kez daha) | Uçtan uca: imajda `gid=10001`; 3f3ca44'ten yükseltmede bütün medya 10001, yedek ve geri yükleme GEÇTİ, Caddy 200 |
| Siber 2 (Düşük) | `kurulum.sh` ilk yöneticiyi sormuyordu | Sayım `shell --no-imports` ile; tty varsa etkileşimli `createsuperuser`; ortam değişkeni parolası ve `--noinput` yok; tty yoksa komut yazdırılır | Uçtan uca pty: 4 istem soruldu, parola yankılanmadı; tty'siz koşuda hesap oluşturulmadı; yeni yönetici parola sonrası MFA kurulumuna yönlendi, MFA'sız panel yok |

Süreç: iki doğrulama turu (Sonnet, uçtan uca Docker) **Geçti**; güvenlik denetimi 1. tur 1 Yüksek + 2 Orta buldu (yukarıdaki "ek" satırlar), düzeltildi; 2. tur **Geçti**. Ham çıktılar: `docs/kanit/denetmen-q1-gid-e2e-2026-10-16.txt`, `docs/kanit/denetmen-q1-symlink-e2e-2026-10-16.txt`. Kalan Düşükler `GUVENLIK.md` → Bilinen sınırlamalar.
