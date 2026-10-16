# Güvenlik tasarımı ve üretim öncesi kontrol listesi

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

## Özet

Sistem internete açık bir üretim uygulaması olarak tasarlandı: HTTPS zorunlu, panel girişinde parola + doğrulama uygulaması (MFA), rollerle yetki, her yönetici işleminin denetim kaydı, veritabanı dışarıya kapalı, gizli bilgiler yalnızca `.env` dosyasında.

## Uygulanan önlemler

| Gereksinim | Nasıl karşılandı |
|---|---|
| HTTPS | Caddy, Let's Encrypt sertifikasını otomatik alır/yeniler; HTTP → HTTPS yönlendirir; HSTS başlığı. |
| Güçlü kimlik doğrulama | En az 12 karakter, yaygın/sayısal parola reddi (Django doğrulayıcıları). Parolalar **Argon2** ile saklanır. |
| Çok faktörlü doğrulama | TOTP (doğrulama uygulaması). Üretimde zorunlu (`MFA_ZORUNLU=1`). Aynı kod iki kez kullanılamaz. TOTP gizli anahtarları veritabanında **şifreli** tutulur (Fernet; anahtar `.env` içindeki `MFA_SIFRELEME_ANAHTARI`, `DJANGO_SECRET_KEY`'den türetilmez). Şifre çözülemeyen kayıtla giriş yapılamaz (kapalı başarısızlık). Anahtar döndürme: yeni anahtarı listenin başına ekleyip `manage.py mfa_sifreyi_yenile`. |
| Roller | Yönetici / Editör / İzleyici. Yazma işlemleri model yetkisi ister, yetkisiz istek 403. |
| Oturum güvenliği | HttpOnly + Secure + SameSite=Lax çerezler, tarayıcı kapanınca biten 8 saatlik oturum, girişte oturum anahtarı yenilenir. |
| Kaba kuvvet koruması | Kullanıcı adı + IP başına 5 hatalı denemeden sonra 15 dk kilit; ayrıca IP döndürmeye karşı hesap başına (`HESAP_DENEME_SINIRI`, 10) geçici kilit ve IP başına (`IP_DENEME_SINIRI`, 20) sayaç. Parola ve MFA denemeleri aynı sayaçlarda sayılır; sayaçlar veritabanında atomik tutulur. |
| Giriş ucu kaynak tüketimi | `/panel/giris` ve `/panel/mfa/*` POST istekleri parola doğrulamasından (Argon2) ÖNCE IP başına dakikada `GIRIS_HIZ_SINIRI` (10) ile sınırlanır; aşılırsa 429. Başarısız giriş denetim kayıtları sınırlıdır ve var olmayan kullanıcı adları açık yazılmaz (`bilinmeyen:<özet>`). |
| CSRF | Django CSRF koruması; bütün değişiklikler yalnızca POST. |
| XSS | Şablonlarda otomatik kaçış; kullanıcı içeriği HTML olarak yorumlanmaz; sıkı İçerik Güvenlik Politikası (satır içi betik yok). |
| SQL injection | Yalnızca Django ORM (parametreli sorgular). |
| Girdi doğrulama | Sunucu tarafında form ve model doğrulaması; içe aktarmada satır satır doğrulama. |
| Hedef URL doğrulaması | Yalnızca `http`/`https`; `javascript:`, `data:`, `file:` vb. reddedilir; URL içinde kullanıcı:parola, `localhost`, özel/yerel IP adresleri reddedilir. Kayıtlı URL her yönlendirmede yeniden doğrulanır. |
| Açık yönlendirme | `/k/<kod>` yalnızca yöneticinin kaydettiği hedefe gider; istekten gelen bir adrese yönlendirme yapan uç yoktur. |
| SSRF | Sunucu, kullanıcı tarafından girilen URL'leri **hiçbir zaman çağırmaz**. “Hedefi test et” bağlantıyı kullanıcının tarayıcısında açar. |
| Dosya yükleme | Yalnızca JPG/PNG/WebP, 5 MB sınırı, Pillow ile görsel doğrulaması, rastgele dosya adı; SVG/HTML yüklenemez; görseller ayrı ve sıkı CSP ile sunulur. |
| Görsellere erişim | Caddy her `/medya/` isteğinde önce uygulamaya sorar (`forward_auth` → `/ic/medya-yetki`). Yalnızca **yayındaki** sayfaların görselleri herkese açıktır; taslak ve arşiv sayfaların görsellerini yalnızca panele MFA ile giriş yapmış ve sayfa görme yetkisi olan kullanıcılar görür. Diğer her istek 404. `/ic/*` dışarıya kapalıdır. |
| Gizli bilgiler | `.env` (izin 600, `.gitignore`'da). Kaynak kodda parola/anahtar yok. Zayıf `DJANGO_SECRET_KEY` ile üretimde uygulama başlamaz. |
| Veritabanı erişimi | PostgreSQL portu yayınlanmaz; `ic` Docker ağı internete kapalı (`internal: true`). |
| Veritabanı rolleri | Uygulama süper kullanıcıyla bağlanmaz. `qr_sahip` tabloların sahibidir ve yalnızca tek seferlik `hazirlik` servisinde (migrasyon) ve yedekte kullanılır. Uygulama `qr_uygulama` ile bağlanır: yalnızca okuma/ekleme/güncelleme/silme yetkisi vardır, tablo silemez, tetikleyici kapatamaz, TRUNCATE yapamaz. QR, sayfa ve hedef geçmişi tablolarında DELETE, denetim kaydında UPDATE/DELETE yetkisi de geri alınmıştır (tetikleyicilere ek). Uygulama konteyneri süper kullanıcı ve sahip parolalarını almaz. Kontrol: `bash scripts/rol-dogrulama.sh`. |
| MFA kurulum anahtarı | Onaylanmamış TOTP anahtarı veritabanına yazılmaz; her bekleyen girişte yeniden üretilip yalnızca o oturumda tutulur. İlk kod doğrulanınca kaydedilir. MFA sıfırlanınca kullanıcının bütün oturumları sonlanır. |
| Konteyner | Uygulama root olmayan kullanıcıyla çalışır; kod root'a aittir ve salt okunur kök dosya sistemiyle çalışır (`read_only`, `cap_drop: ALL`, `no-new-privileges`); yalnızca `/veri` yazılabilir. İmajlar sürümle ve **digest ile** sabit (`postgres`, `caddy`, `python`; `latest` yok, güncelleme için `BAKIM.md`). Yedek konteyneri root olmayan ayrı kullanıcıyla (10002, uygulamadan farklı; medyayı yalnızca grup 10001 üzerinden okur) `read_only`, `cap_drop: ALL`, `no-new-privileges` ile çalışır. Veritabanı konteyneri `cap_drop: ALL` ile yalnızca gereken 5 yetkiyi alır. Excel/XML dosyaları `defusedxml` ile ayrıştırılır (DOCTYPE/ENTITY reddedilir). Hata sayfalarında `ANAHTAR`/`PAROLA`/`SIFRE` adlı ayarlar da gizlenir. |
| Denetim kaydı | Giriş/çıkış, başarısız giriş, oluşturma, düzenleme, hedef değişikliği, durum değişikliği, içe/dışa aktarma, kullanıcı ve ayar değişiklikleri. Kayıtlar değiştirilemez ve silinemez. |
| Güvenli hata mesajları | Üretimde `DEBUG=0`; hata sayfaları ayrıntı göstermez; sağlık ucu yalnızca `ok/hata` döner. |
| Hız sınırlama | Yönlendirme ucunda IP başına dakikada 120 istek (ayarlanabilir; IPv6 adresleri /64 öneki olarak sayılır); giriş denemesi sınırı. Sayaç veritabanında tutulur ve **tüm Gunicorn işçileri arasında paylaşılır**. Sayaç anahtarlarında IP yerine `SECRET_KEY` ile HMAC özeti saklanır (IP veritabanına yazılmaz). Veritabanına yazılamazsa yönlendirme sınırı açık geçer; giriş kilidi sayaçları ise hatayı yutmaz. |
| Günlükler | Docker günlük döndürme (10 MB × 5). Caddy erişim günlüklerinde istemci IP'si maskelenir (IPv4 /24, IPv6 /48), çerez ve `X-Forwarded-For` yazılmaz; veritabanında IP saklanmaz. |
| Yedekleme | Günlük otomatik, doğrulanmış yedek; **age ile şifreli** (açık anahtarla şifrelenir, özel anahtar yedek konteynerinde yoktur); sha256 ile bütünlük kontrolü; geri yükleme testi betiği. Eski yerel yedekler yalnızca sunucu dışı kopyası rclone ile doğrulandıysa silinir; doğrulama yoksa hiçbir yedek silinmez ve panel uyarı gösterir. |
| Bağımlılıklar | Bütün Python paketleri (geçişliler dahil) sürüm ve **hash** ile sabittir (`--require-hashes`); hash'i tutmayan paket kurulmaz. `scripts/guvenlik-tarama.sh` (pip-audit) bilinen zafiyetleri tarar. Son tarama: `docs/kanit/pip-audit-2026-10-15.txt` (zafiyet yok). |

## Üretime geçmeden önce kontrol listesi

Her maddeyi işaretlemeden canlı kullanıma geçmeyin.

- [ ] `.env` içinde `DJANGO_DEBUG=0`, `MFA_ZORUNLU=1`, `GUVENLI_CEREZ` tanımlı değil veya `1`.
- [ ] `DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD`, `POSTGRES_SAHIP_PAROLA`, `POSTGRES_UYGULAMA_PAROLA` `kurulum.sh` ile üretildi (örnek değerler değil).
- [ ] Yedek özel anahtarı (`gizli/yedek-anahtari.txt`) parola yöneticisine kopyalandı. Bu anahtar olmadan yedekler açılamaz.
- [ ] `bash scripts/rol-dogrulama.sh` **GEÇTİ** dedi.
- [ ] `bash scripts/guvenlik-tarama.sh` zafiyet bulmadı.
- [ ] `.env` izinleri `600` (`ls -l .env`) ve dosyanın bir kopyası parola yöneticisinde.
- [ ] `SITE_ALAN_ADI`, `SITE_ADRESI`, `DJANGO_ALLOWED_HOSTS`, `ACME_EPOSTA` gerçek değerlerle değiştirildi.
- [ ] `https://` ile açılıyor, tarayıcı kilit simgesi gösteriyor; `http://` adresi HTTPS'e yönleniyor.
- [ ] Bütün yönetici hesaplarında MFA kurulu; kullanılmayan hesaplar pasif.
- [ ] Her kullanıcıya gereken en düşük rol verildi (çoğu kişi için Editör veya İzleyici).
- [ ] SSH: parola ile giriş kapalı, root girişi kapalı, yalnızca anahtar.
- [ ] Güvenlik duvarı: yalnızca 22, 80, 443 açık (`sudo ufw status`). Dışarıdan `nc -zv SUNUCU_IP 5432` bağlanamamalı.
- [ ] Otomatik güvenlik güncellemeleri açık (`unattended-upgrades`).
- [ ] İlk yedek alındı ve `bash scripts/geri-yukleme-testi.sh` **GEÇTİ** dedi.
- [ ] Sunucu dışı yedek (`disari-kopyala.sh`) yapılandırıldı ve bir kez çalıştı.
- [ ] Alan adı otomatik yenileme açık; alan adı ve VPS hesaplarında iki adımlı doğrulama açık.
- [ ] Örnek/deneme verileri temizlendi (deneme QR kodları arşivlendi).
- [ ] Gizlilik/KVKK aydınlatma metni kampanya sayfalarında veya web sitenizde yayında (tarama istatistiği için).
- [ ] `bash scripts/test.sh` sunucuda çalıştırıldı ve bütün testler geçti.

## Bilinen sınırlamalar

- Yönlendirme hız sınırı her istekte bir veritabanı yazımı yapar (ölçümde yaklaşık %20 verim düşüşü). Süresi dolan satırlar her işçide dakikada bir silinir; tablo yaklaşık son birkaç dakikanın satırlarıyla sınırlı kalır (satır sayısı ≈ dakikadaki farklı istemci × 3). Geniş IPv6 bloğuna sahip biri bu birkaç dakikalık pencerede çok satır üretebilir; bu bir kapasite (DDoS) konusudur. Büyük saldırılara karşı VPS sağlayıcısının DDoS koruması veya Cloudflare gibi bir ön katman gerekir.
- `MFA_SIFRELEME_ANAHTARI` kaybolursa bütün kullanıcıların MFA'sı çözülemez ve giriş yapılamaz; anahtarı yedek özel anahtarıyla birlikte parola yöneticisinde saklayın (çözüm: yönetici MFA'yı sıfırlar). Anahtar ile veritabanı yedeği birlikte ele geçirilirse TOTP sırları çözülebilir. Sayaçlar HMAC'e geçtiği için güncelleme anında (ve `SECRET_KEY` döndürülünce) etkin giriş kilitleri bir kez sıfırlanır.
- Hesap kilidi ödünleşimi: hesap başına sayaç (IP döndüren saldırganı durdurmak için) bir saldırganın meşru kullanıcıyı geçici olarak kilitlemesine de izin verir. Azaltımlar: IP veya kullanıcı+IP sayacı zaten reddediyorsa hesap sayacı artırılmaz (tek bir IP hesabı kilitli tutamaz); kilit `GIRIS_KILIT_SURESI_SN` sonra kendiliğinden kalkar; kullanıcı adı NFKC + küçük harfe normalleştirilerek sayılır; IPv6 adresleri /64 öneki olarak sayılır. Acil durumda yönetici sunucudan sayaçları sıfırlar (denetim kaydı yazılır): `docker compose exec app python manage.py sayac_sifirla KULLANICI_ADI [--ip IP]`.
- Bot ayrımı tarayıcı kimliği (User-Agent) desenine dayanır; kendini gizleyen botlar insan gibi sayılabilir.
- Yetki modeli rol tabanlıdır (Yönetici / Editör / İzleyici) ve bütün kampanyalara uygulanır. Kampanya başına erişim (bir kullanıcının yalnızca belirli kampanyaları görmesi) istenen özellikler arasında yoktu; bu yüzden eklenmedi. Gerekirse ayrı bir geliştirme olarak eklenebilir.
- Süper kullanıcıya veritabanı konteynerinin içinden (yerel soket) parolasız erişilebilir; bu, sunucu yöneticisinin bakım yoludur. Sunucuya root erişimi olan herkes veritabanının tamamına erişebilir.
- age (yedek şifreleme aracı) sürüm arşivinin sha256 değeri, kurulum sırasında indirilen dosyadan hesaplanıp sabitlendi; age'in yayımladığı imzalı bir değerle karşılaştırılamadı. pip-tools ve pip-audit araçlarının kendisi hash'siz kurulur (bunlar uygulama imajına girmez).
- `disari-kopyala.sh` ve `geri-yukleme-testi.sh` root olarak çalışır ama yedek dizinine (yedek konteynerine yazılabilir) root olarak YAZMAZ: günlük ekleme, `uzak-dogrulama.json` yazımı ve `geri-yukleme-testi-*.log` günlüğü dizinin sahibi (10002) olarak `setpriv` ile yapılır (ortak yardımcı: `scripts/dizin-guvenligi.sh`); konteynerin bıraktığı sembolik bağlantı root'a başka bir dosyayı ezdiremez ya da ona ekleme yaptıramaz. `YEDEK_DIZINI` sembolik bağlantıysa gerçek hedefe çözülür ve sahip çözülmüş yoldan alınır. Root'a ait ama grup/diğerlerine yazılabilir bir yedek dizini (ör. 0777) güvenli sayılmaz: betik açık bir hata ile çıkar, hiçbir şey silmez. `disari-kopyala.sh` yedek dizininden yine de meta veri okur (root rclone/find/stat ile dosya adı, boyut, zaman ve özet okur; rclone sembolik bağlantıları izlemez, `-L` kullanılmaz, gerçek rclone ile test edildi); dosya İÇERİĞİ yalnızca rclone'un kopyalama/doğrulamasında okunur. `yedek-ortak.sh` içindeki sha256 doğrulaması ve `geri-yukle.sh` içindeki düz (eski) döküm okuması hâlâ root olarak yapılır: yalnızca okumadır (özet karşılaştırması/yükleme), yazma değil; eski kurulumlarda root'a ait 600 yedekler dizin sahibi olarak okunamayacağından bilerek değiştirilmedi (Düşük). Cron çıktısını `yedekler/` içine değil root'a ait bir yere (`/var/log/...`) yönlendirin: eski belgelerdeki `>> yedekler/disari-kopya.log` satırı root kabuğunun bağlantıyı izlemesine yol açar. `disari-kopyala.sh` root crontab'ında böyle bir satır görürse hiçbir şey yazdırmadan (çıktı saldırganın bağlantısına gidiyor olabilir) syslog'a (`logger -t qr-kampanya`) uyarı bırakıp 1 koduyla çıkar; `guncelle.sh` aynı satırı sonda ekrana uyarı ve düzeltilmiş satırla bildirir. `crontab` komutu yoksa ya da kullanıcı crontab'ı okunamıyorsa tespit sessizce atlanır (systemd timer vb. kullanıyorsanız çıktıyı yine `yedekler/` dışına yönlendirin). Tespitin sınırı (Düşük): yalnızca root crontab'ı taranır (`/etc/crontab`, `/etc/cron.d`, systemd timer taranmaz) ve yalnızca belgelenmiş yazımlar tanınır. Eski satır düzeltilmedikçe cron kabuğu yönlendirmeyi betik başlamadan root olarak açar; betik oraya artık içerik yazmasa da ele geçirilmiş bir konteyner bununla istediği yerde BOŞ bir dosya oluşturabilir (ör. `/etc/nologin`). Kesin çözüm crontab satırını düzeltmektir; `guncelle.sh`'yi `sudo` ile çalıştırın ki root crontab'ı okunabilsin.
- `db` konteyneri salt okunur dosya sistemiyle çalışmaz (PostgreSQL yazma ister). `yedekler/` dosyaları 10002'ye aittir; sunucuda okumak için `sudo` gerekir. Python taban imajının digest'i kayıt defterinde ikinci bir kaynaktan çapraz doğrulanamadı (429); yerel imajın index digest'i ile eşleşiyor.
- Sağlayıcı ortak hash desteklemiyorsa (ya da sftp/ftp/smb/webdav gibi hash'i sunucu kabuğuna bağlı türlerde) doğrulama otomatik olarak **indirerek** yapılır (`--download`); indirme yalnızca silinmeye aday eski yedekler ve en yeni yedekle sınırlıdır. Tüm dosyaları indirerek doğrulamak için `YEDEK_UZAK_INDIREREK=1`.
- Özel yedek anahtarı kurulumda ekranda bir kez gösterilir; `EVET` ve anahtarın geri yapıştırılmasıyla sunucuya hiç kalıcı yazılmadan kaldırılır. Ekranda göründüğü için terminal/tmux kaydırma geçmişinde kalabilir; onay verilmezse diske yazılan dosya `shred` ile silinse de SSD ve günlüklü dosya sistemlerinde adli kurtarmaya karşı garanti yoktur.
- Uzak doğrulama (B2/S3 gibi nesne depoları) sağlayıcının **sakladığı özete** güvenir; bu, nesnenin sonradan bozulmadığının tam kanıtı değildir. Tam doğrulama için `YEDEK_UZAK_INDIREREK=1` kullanın (veri indirilip karşılaştırılır). Yerel yedeğin silinmesi ayrıca `YEDEK_UZAK_ONAYLI_HEDEF` ile açık onay ister; özel ağ adresleri onayla bile yerel sayılır. Kimlik bilgilerini bağlantı dizesine değil `rclone config` ayar dosyasına yazın (`ps` ile görünür).
- Onay modelinin bedeli (Düşük): gerçekten uzak ama özel adrese çıkan hedefler (Tailscale `100.64/10`, bulut VPC uç noktası `10.x`) onaylanamaz; bu kurulumlarda yerel yedekler silinmez ve disk zamanla dolabilir (panel ve günlük uyarır; `YEDEK_SAKLAMA_GUN` ve disk alanını izleyin). Eski bir kurulum güncellendiğinde `YEDEK_UZAK_ONAYLI_HEDEF` eklenene kadar da silme durur. NAT64 (`64:ff9b::/96`) ve IPv4 uyumlu IPv6 (`::10.0.0.1`) yazımları özel ağ olarak tanınmaz; bunlar için de açık onay gerekir.
- `yedek-anahtari-hazirla.sh --goster-ve-kaldir` anahtarı zaten diskte bulur; `shred` SSD/ext4 günlüğü/btrfs/ZFS/LVM anlık görüntüsünde silmeyi garanti etmez (en güvenlisi kurulumda `EVET` ile hiç diske yazmamak).
- “Sunucu dışı kopya” tespiti (yerel yedek ancak uzak kopya doğrulanınca silinir) temkinlidir: yerel yol, `local`/`archive`/`memory` gibi izin listesinde olmayan türler, bu makineyi gösteren host/endpoint/url, `ssh=`/`unix_socket`/`use_emulator` ve belirsiz durumlar yerel sayılır, silme yapılmaz. Kapsanmayan dar durumlar (Düşük): aynı VPS'teki bir Docker kapsayıcısının özel IP'si (ör. `172.18.0.5` üzerindeki MinIO), Azure `sas_url`/`connection_string` ile yerel emülatör, `env_auth = true` + `AWS_ENDPOINT_URL` gibi bulut SDK ortam değişkenleri. Belgede önerilen B2/SFTP/S3 kurulumunda bunlar oluşmaz.
- Geri yükleme testi şifresi çözülmüş veritabanını geçici bir PostgreSQL konteynerinin anonim birimine yazar ve test sonunda siler; test ani kesilirse (elektrik, `kill -9`) bu birim diskte kalabilir: `docker volume prune` ile temizleyin.


## Not: ziyaretçi özeti anonim değil, takma adlıdır

`qr_tarama.ziyaretci_ozeti` günlük değişen tuzlu bir özettir; IP saklanmaz ancak aynı gün aynı IP+UA aynı değeri verir ve `SECRET_KEY` sahibi bilinen bir IP/UA çiftini doğrulayabilir. Bu nedenle veri **takma adlı (pseudonymous)** kabul edilmeli, KVKK saklama süresi (`TARAMA_SAKLAMA_GUN`) uygulanmalıdır.
