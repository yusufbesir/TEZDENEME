# Yedekleme ve geri yükleme

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

## Özet

- `yedek` servisi **her gün 03:15'te** (İstanbul saati, `.env` → `YEDEK_SAATI`) veritabanı ve görsel yedeği alır.
- Yedekler sunucuda `./yedekler/` klasöründedir (web'den erişilemez, izinler 700).
- Varsayılan saklama: **14 gün** (`YEDEK_SAKLAMA_GUN`). Daha eski yedekler otomatik kaldırılır.
- Panel ana ekranı son yedeğin durumunu gösterir.
- En az bir kopyanın sunucu dışında olması için `scripts/disari-kopyala.sh` kullanılır.

## Ne yedeklenir

| Dosya | İçerik |
|---|---|
| `db-YYYYMMDD-HHMMSS.dump` | Bütün veritabanı (`pg_dump` özel biçim). Alındıktan hemen sonra `pg_restore --list` ile okunabilirliği doğrulanır. |
| `medya-YYYYMMDD-HHMMSS.tar.gz` | Yüklenen kapak görselleri, logolar, ürün görselleri |
| `sha256-YYYYMMDD-HHMMSS.txt` | Bütünlük özetleri |
| `yedek-gunlugu.log` | Her yedeğin başarı/hata kaydı |

**Uygulama yapılandırması** (`.env`) gizli bilgi içerdiği için otomatik kopyalanmaz. Kurulumdan sonra `.env` dosyasını bir parola yöneticisine (ör. Bitwarden, 1Password) veya şifreli bir yere bir kez kaydedin. `.env` kaybolursa veritabanı parolası ve oturum anahtarı yeniden üretilebilir, ama MFA kodları ve ziyaretçi özetleri anahtara bağlı olduğundan yeniden kurulum gerekir.

## Elle yedek almak

```bash
docker compose exec yedek sh /betikler/yedek-al.sh
```

## Geri yükleme testi (güvenli, düzenli yapın)

```bash
bash scripts/geri-yukleme-testi.sh
```

En son yedeği geçici bir veritabanına yükler, tablo sayılarını canlı sistemle karşılaştırır ve geçici veritabanını kaldırır. Canlı sisteme dokunmaz. **Önerilen sıklık: ayda bir** ve her büyük güncellemeden önce.

## Gerçek geri yükleme (yıkıcı)

```bash
bash scripts/geri-yukle.sh yedekler/db-20261015-031500.dump
```

- Canlı veritabanını yedektekiyle değiştirir; yedekten sonraki değişiklikler kaybolur.
- Betik `EVET` yazmanızı ister ve başlamadan önce mevcut durumun yedeğini alır.
- Görselleri geri yüklemek için:
  ```bash
  docker compose cp yedekler/medya-20261015-031500.tar.gz yedek:/tmp/m.tar.gz
  docker compose exec -u root yedek sh -c "tar -xzf /tmp/m.tar.gz -C /veri && rm /tmp/m.tar.gz"
  ```
  (yedek servisi görsel birimini salt okunur bağlar; bu adım için `docker-compose.yml` içinde `medya:/veri/medya:ro` satırındaki `:ro` geçici olarak kaldırılmalıdır.)

## Sunucu dışı kopya

1. Sunucuda `sudo apt install rclone`, ardından `rclone config` ile bir uzak depo tanımlayın (örn. Backblaze B2 veya Hetzner Storage Box).
2. `.env` dosyasına `YEDEK_UZAK_HEDEF=uzakadi:klasor` ekleyin.
3. Günlük çalıştırma için `crontab -e`:
   ```
   30 4 * * * cd /opt/qr-kampanya && bash scripts/disari-kopyala.sh >> yedekler/disari-kopya.log 2>&1
   ```
4. Uzak taraftaki saklama süresini sağlayıcının yaşam döngüsü kuralıyla ayarlayın (öneri: 90 gün).

## Saklama politikası

| Konum | Süre |
|---|---|
| Sunucu (`./yedekler`) | 14 gün (`YEDEK_SAKLAMA_GUN`) |
| Sunucu dışı | Önerilen 90 gün (sağlayıcıda ayarlanır) |
| Tarama kayıtları (veritabanında) | 730 gün (`TARAMA_SAKLAMA_GUN`), sonra temizlenir |
