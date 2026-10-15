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

Betik sırasıyla: alan adınızı ve e-postanızı sorar, `.env` dosyasını güçlü rastgele parolalarla oluşturur, konteynerleri başlatır ve ilk yönetici hesabını oluşturmanızı ister. İlk girişte panel, telefonunuzdaki doğrulama uygulamasıyla (Google Authenticator, Microsoft Authenticator vb.) MFA kurulumunu ister.

## 5. Kontrol ve uçtan uca test

```bash
docker compose ps                         # 4 servis "running", app "healthy"
curl -I https://qr.ornekfirma.com/saglik  # HTTP/2 200
docker compose logs caddy --tail 50       # sertifika alındı mı
```

Ardından panelde bir deneme QR kodu oluşturun, telefonla tarayın, hedefi değiştirip yeniden tarayın. Ayrıntılı test listesi: [TEST-RAPORU.md](TEST-RAPORU.md).

## 6. Yerel deneme (alan adı olmadan)

Docker kurulu bir bilgisayarda `bash scripts/kurulum.sh` çalıştırıp alan adı sorusunu boş bırakın. Panel: http://localhost/panel/. Bu modda HTTPS yoktur; yalnızca deneme içindir.
