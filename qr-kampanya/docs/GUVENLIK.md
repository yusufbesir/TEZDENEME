# Güvenlik tasarımı ve üretim öncesi kontrol listesi

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

## Özet

Sistem internete açık bir üretim uygulaması olarak tasarlandı: HTTPS zorunlu, panel girişinde parola + doğrulama uygulaması (MFA), rollerle yetki, her yönetici işleminin denetim kaydı, veritabanı dışarıya kapalı, gizli bilgiler yalnızca `.env` dosyasında.

## Uygulanan önlemler

| Gereksinim | Nasıl karşılandı |
|---|---|
| HTTPS | Caddy, Let's Encrypt sertifikasını otomatik alır/yeniler; HTTP → HTTPS yönlendirir; HSTS başlığı. |
| Güçlü kimlik doğrulama | En az 12 karakter, yaygın/sayısal parola reddi (Django doğrulayıcıları). Parolalar **Argon2** ile saklanır. |
| Çok faktörlü doğrulama | TOTP (doğrulama uygulaması). Üretimde zorunlu (`MFA_ZORUNLU=1`). Aynı kod iki kez kullanılamaz. |
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
| Gizli bilgiler | `.env` (izin 600, `.gitignore`'da). Kaynak kodda parola/anahtar yok. Zayıf `DJANGO_SECRET_KEY` ile üretimde uygulama başlamaz. |
| Veritabanı erişimi | PostgreSQL portu yayınlanmaz; `ic` Docker ağı internete kapalı (`internal: true`). |
| MFA kurulum anahtarı | Onaylanmamış TOTP anahtarı veritabanına yazılmaz; her bekleyen girişte yeniden üretilip yalnızca o oturumda tutulur. İlk kod doğrulanınca kaydedilir. MFA sıfırlanınca kullanıcının bütün oturumları sonlanır. |
| Konteyner | Uygulama root olmayan kullanıcıyla çalışır; kod root'a aittir ve salt okunur kök dosya sistemiyle çalışır (`read_only`, `cap_drop: ALL`, `no-new-privileges`); yalnızca `/veri` yazılabilir. İmajlar sürümle sabit (`latest` yok). |
| Denetim kaydı | Giriş/çıkış, başarısız giriş, oluşturma, düzenleme, hedef değişikliği, durum değişikliği, içe/dışa aktarma, kullanıcı ve ayar değişiklikleri. Kayıtlar değiştirilemez ve silinemez. |
| Güvenli hata mesajları | Üretimde `DEBUG=0`; hata sayfaları ayrıntı göstermez; sağlık ucu yalnızca `ok/hata` döner. |
| Hız sınırlama | Yönlendirme ucunda IP başına dakikada 120 istek (ayarlanabilir); giriş denemesi sınırı. |
| Günlükler | Docker günlük döndürme (10 MB × 5). Caddy erişim günlüklerinde istemci IP'si maskelenir (IPv4 /24, IPv6 /48), çerez ve `X-Forwarded-For` yazılmaz; veritabanında IP saklanmaz. |
| Yedekleme | Günlük otomatik, doğrulanmış yedek; geri yükleme testi betiği; sunucu dışı kopya betiği. |

## Üretime geçmeden önce kontrol listesi

Her maddeyi işaretlemeden canlı kullanıma geçmeyin.

- [ ] `.env` içinde `DJANGO_DEBUG=0`, `MFA_ZORUNLU=1`, `GUVENLI_CEREZ` tanımlı değil veya `1`.
- [ ] `DJANGO_SECRET_KEY` ve `POSTGRES_PASSWORD` `kurulum.sh` ile üretildi (örnek değerler değil).
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

- Yönlendirme hız sınırı her Gunicorn işçisinde ayrı sayılır (yaklaşık değerdir). Büyük saldırılara karşı VPS sağlayıcısının DDoS koruması veya Cloudflare gibi bir ön katman gerekir.
- MFA gizli anahtarları veritabanında düz metin tutulur; veritabanı yedeklerini bu nedenle gizli bilgi gibi koruyun.
- Hesap kilidi ödünleşimi: hesap başına sayaç (IP döndüren saldırganı durdurmak için) bir saldırganın meşru kullanıcıyı geçici olarak kilitlemesine de izin verir. Azaltımlar: IP veya kullanıcı+IP sayacı zaten reddediyorsa hesap sayacı artırılmaz (tek bir IP hesabı kilitli tutamaz); kilit `GIRIS_KILIT_SURESI_SN` sonra kendiliğinden kalkar; kullanıcı adı NFKC + küçük harfe normalleştirilerek sayılır; IPv6 adresleri /64 öneki olarak sayılır. Acil durumda yönetici sunucudan sayaçları sıfırlar (denetim kaydı yazılır): `docker compose exec app python manage.py sayac_sifirla KULLANICI_ADI [--ip IP]`.
- Bot ayrımı tarayıcı kimliği (User-Agent) desenine dayanır; kendini gizleyen botlar insan gibi sayılabilir.


## Not: ziyaretçi özeti anonim değil, takma adlıdır

`qr_tarama.ziyaretci_ozeti` günlük değişen tuzlu bir özettir; IP saklanmaz ancak aynı gün aynı IP+UA aynı değeri verir ve `SECRET_KEY` sahibi bilinen bir IP/UA çiftini doğrulayabilir. Bu nedenle veri **takma adlı (pseudonymous)** kabul edilmeli, KVKK saklama süresi (`TARAMA_SAKLAMA_GUN`) uygulanmalıdır.
