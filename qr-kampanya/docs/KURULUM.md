# Kurulum rehberi (VPS ve alan adı)

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

## Özet

1. Bir alan adı alın ve bir alt alan (örn. `qr.firmaniz.com`) için DNS **A kaydı** oluşturun.
2. Ubuntu 24.04 LTS bir VPS kiralayın (en az 2 GB RAM, 1-2 vCPU, 20+ GB disk).
3. Sunucuyu güvenli hâle getirin (SSH anahtarı, güvenlik duvarı, otomatik güncellemeler).
4. Docker'ı kurun, projeyi kopyalayın, `bash scripts/kurulum.sh` çalıştırın.
5. Uçtan uca testi yapın ve [güvenlik kontrol listesini](GUVENLIK.md) tamamlayın.

Aşağıda `qr.ornekfirma.com` örnek alan adıdır; **kendi alan adınızla değiştirin.**

## 1. Alan adı ve DNS

Alan adı sağlayıcınızın DNS panelinde:

| Tür | Ad | Değer | TTL |
|---|---|---|---|
| A | `qr` | VPS'in IPv4 adresi | 300 |
| AAAA (varsa) | `qr` | VPS'in IPv6 adresi | 300 |

DNS'in yayıldığını kontrol edin: `nslookup qr.ornekfirma.com` VPS IP'sini göstermelidir. Caddy sertifikayı ancak DNS doğru yönlendiğinde alabilir.

**Önemli:** QR kodlara basılan alan adı yıllarca çalışmalıdır. Alan adının **otomatik yenilemesini açın** ve sağlayıcı hesabında iki adımlı doğrulamayı etkinleştirin. Alan adı kaybedilirse basılmış bütün QR kodlar çalışmaz hâle gelir.

## 2. VPS hazırlığı (Ubuntu 24.04)

Yerel bilgisayarınızda SSH anahtarı yoksa: `ssh-keygen -t ed25519`. Açık anahtarı (`~/.ssh/id_ed25519.pub`) VPS sağlayıcısının panelinde sunucuya ekleyin.

Sunucuda (root olarak ilk bağlantı):

```bash
# Güncellemeler ve temel araçlar
apt update && apt -y upgrade
apt -y install ufw fail2ban unattended-upgrades git

# Yönetici kullanıcı (root yerine bu kullanılacak)
adduser yonetici
usermod -aG sudo yonetici
rsync --archive --chown=yonetici:yonetici ~/.ssh /home/yonetici

# Güvenlik duvarı: yalnızca SSH, HTTP ve HTTPS
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw enable

# Otomatik güvenlik güncellemeleri
dpkg-reconfigure -plow unattended-upgrades
```

SSH'yi sıkılaştırın (`/etc/ssh/sshd_config.d/90-guvenlik.conf`):

```
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
```

Sonra `systemctl restart ssh`. **Bu adımdan önce** `ssh yonetici@SUNUCU_IP` ile anahtarla girebildiğinizi ayrı bir pencerede doğrulayın; aksi hâlde sunucuya erişiminizi kaybedebilirsiniz.

> Not: Docker, yayınladığı portlar için ufw kurallarını atlayabilir. Bu projede yalnızca Caddy 80/443 portlarını açar; veritabanı portu hiçbir zaman yayınlanmaz.

## 3. Docker kurulumu

Docker'ın resmî kurulum adımlarını izleyin: https://docs.docker.com/engine/install/ubuntu/  
Sonra `sudo usermod -aG docker yonetici` ve oturumu kapatıp açın. Kontrol: `docker compose version`.

## 4. Uygulamanın kurulumu

```bash
sudo mkdir -p /opt/qr-kampanya && sudo chown yonetici /opt/qr-kampanya
git clone https://github.com/yusufbesir/TEZDENEME.git /tmp/tez
cp -r /tmp/tez/qr-kampanya/. /opt/qr-kampanya/
cd /opt/qr-kampanya
bash scripts/kurulum.sh
```

Betik sırasıyla: alan adınızı ve e-postanızı sorar (alan adı girdiyseniz e-posta **zorunludur**; alan adı boşsa yerel deneme yer tutucusu yazılır), `.env` dosyasını güçlü rastgele parolalarla oluşturur, konteynerleri derleyip başlatır, **yedek şifreleme anahtarını üretir** ve ilk yönetici hesabını oluşturmanızı ister.

**Veritabanı parolaları (üç tane, hepsini betik üretir):** `POSTGRES_PASSWORD` yalnızca bakım için olan en yetkili hesaptır; `POSTGRES_SAHIP_PAROLA` veritabanının sahibi `qr_sahip` hesabıdır (güncelleme ve yedek bunu kullanır); `POSTGRES_UYGULAMA_PAROLA` web uygulamasının kısıtlı `qr_uygulama` hesabıdır. Uygulama yalnızca kayıt okuyup ekleyebilir; tabloları silemez, koruma kurallarını kapatamaz. `.env` dosyasını yedeklediğiniz yeri güvenli tutun ve kimseyle paylaşmayın.

**MFA şifreleme anahtarı (`MFA_SIFRELEME_ANAHTARI`):** Kullanıcıların MFA gizli anahtarları veritabanında şifreli saklanır; şifreleme anahtarı `.env` dosyasındadır ve betik onu da üretip dosyanın **sonuna** ekler (`guncelle.sh` eski kurulumlarda, migrasyondan önce, aynısını yapar; mevcut satırlara dokunmaz). Anahtar yoksa ya da geçersizse uygulama açılışta anlaşılır bir hatayla durur. **Anahtar kaybolursa MFA kayıtları çözülemez**: yönetici etkilenen kullanıcıları `docker compose exec app python manage.py mfa_sifirla <kullanici_adi>` ile sıfırlar, kullanıcılar MFA'yı yeniden kurar. Bu yüzden **`.env` yedeğini parola yöneticinizde saklayın**. Veritabanı yedeği tek başına MFA sırlarını açığa çıkarmaz (anahtar yedekte değil, `.env` içindedir). Ayrıntı: [YEDEKLEME.md](YEDEKLEME.md).

**`hazirlik` servisi:** Her başlatmada, uygulamadan önce kısa süre çalışıp biter (durumu `exited` görünmesi normaldir). Veritabanı güncellemelerini yapar. Başarısız olursa uygulama başlamaz; nedenini görmek için `docker compose logs hazirlik` komutunu kullanın. İlk girişte panel, telefonunuzdaki doğrulama uygulamasıyla (Google Authenticator, Microsoft Authenticator vb.) MFA kurulumunu ister.

**Yedek anahtarı (çok önemli):** Yedekler şifreli alınır. Kurulum sırasında betik özel anahtarı üretir ve **ekranda yalnızca bir kez** gösterir. Anahtar satırlarını **hemen parola yöneticinize (Bitwarden, 1Password vb.) kopyalayın**, sonra ekrandaki soruya büyük harflerle `EVET` yazın ve doğrulama için anahtar satırını geri yapıştırın: birebir aynıysa anahtar sunucudan silinir, değilse dosya kalır. Anahtar kaybolursa yedekleriniz açılamaz; kimse kurtaramaz. Yedek servisi yalnızca açık anahtarı (`.env` içindeki `YEDEK_ALICI`) bilir, özel anahtarı bilmez; bu yüzden sunucu ele geçirilse bile yedekler açılamaz ve silmeden sonra da yedekleme aynen sürer. `EVET` yazmazsanız veya terminal etkileşimli değilse dosya (`gizli/yedek-anahtari.txt`) sunucuda kalır ve **"ÖZEL ANAHTAR HÂLÂ SUNUCUDA"** uyarısı çıkar; kaydettikten sonra `bash scripts/yedek-anahtari-hazirla.sh --goster-ve-kaldir` ile kaldırın. **Sunucu dışı kopya onayı:** `.env`'e `YEDEK_UZAK_HEDEF=uzakadi:klasor` eklediyseniz, eski yerel yedeklerin silinebilmesi için ayrıca `YEDEK_UZAK_ONAYLI_HEDEF=uzakadi` ekleyin (`:` öncesi adla birebir; hedefin gerçekten başka bir makine/bulut olduğunu onaylarsınız; `guncelle.sh` bunu sizin yerinize eklemez). Onay yoksa yedekler kopyalanır ama yerel yedek silinmez. **Aylık geri yükleme testinde ve gerçek geri yüklemede** anahtar sizden istenir: parola yöneticinizden yapıştırırsınız (görünmez, diske yazılmaz). Ayrıntı: [YEDEKLEME.md](YEDEKLEME.md).

### Eski bir kurulumu güncelliyorsanız (veritabanı roller eklenmeden önce kurulmuşsa)

`bash scripts/guncelle.sh` bütün adımı kendisi yapar: `.env` dosyasının **sonuna** eksik iki parolayı ekler (var olan satırlara dokunmaz; kurulum betiği bunu ekrana yazar), rolleri oluşturur, sahipliği devreder ve yedek şifreleme anahtarı yoksa üretir (üretirse kurulumdaki gibi ekranda bir kez gösterir ve `EVET` onayıyla sunucudan kaldırır; var olan anahtara ve `.env` satırlarına dokunmaz; `.env`'de `YEDEK_ALICI` varken anahtar dosyası yoksa — yani anahtar kaldırılmışsa — **yeni anahtar üretmez**). Son adımda yeni `Caddyfile` önce ayrı bir geçici kapta doğrulanır; geçersizse çalışan Caddy'ye dokunulmaz ve hata bunu söyler. Betiği kullanmadan elle yapmak isterseniz `.env` içine `POSTGRES_SAHIP_PAROLA` ve `POSTGRES_UYGULAMA_PAROLA` satırlarını uzun rastgele değerlerle ekleyin, sonra:

```bash
docker compose up -d db
docker compose exec db sh /docker-entrypoint-initdb.d/10-roller.sh
docker compose up -d
```

Bu komut güvenle tekrar çalıştırılabilir (verileri silmez). Kontrol: `bash scripts/rol-dogrulama.sh` sonunda `SONUÇ: GEÇTİ` yazmalıdır.

## 5. Kontrol ve uçtan uca test

```bash
docker compose ps -a                      # db, app, caddy, yedek "running" (app "healthy"); hazirlik "exited (0)"
curl -I https://qr.ornekfirma.com/saglik  # HTTP/2 200
docker compose logs caddy --tail 50       # sertifika alındı mı
```

Ardından panelde bir deneme QR kodu oluşturun, telefonla tarayın, hedefi değiştirip yeniden tarayın. Ayrıntılı test listesi: [TEST-RAPORU.md](TEST-RAPORU.md).

## 6. Yerel deneme (alan adı olmadan)

Docker kurulu bir bilgisayarda `bash scripts/kurulum.sh` çalıştırıp alan adı sorusunu boş bırakın. Panel: http://localhost/panel/. Bu modda HTTPS yoktur; yalnızca deneme içindir.
