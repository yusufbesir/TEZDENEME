# Güncelleme ve bakım rehberi

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

## Özet

| Ne zaman | Ne yapılır |
|---|---|
| Her hafta | Panel ana ekranında son yedeğin “başarılı” olduğuna bakın. |
| Her ay | `bash scripts/geri-yukleme-testi.sh` · sunucu güncellemeleri (`sudo apt update && sudo apt upgrade`) · disk: `df -h` · `bash scripts/guvenlik-tarama.sh` (bilinen güvenlik açığı taraması; “temiz” demeli, açık bulursa aşağıdaki bağımlılık güncellemesini yapın) |
| Güvenlik duyurusunda | Bağımlılık güncellemesi (aşağıda) |
| Yılda bir | Alan adı yenilemesini, sunucu dışı yedeklerin varlığını ve yönetici hesaplarını gözden geçirin. |

## Uygulamayı güncellemek

```bash
cd /opt/qr-kampanya
# yeni sürüm dosyalarını kopyaladıktan sonra:
bash scripts/guncelle.sh
```

Betik sırasıyla: imajları derler; veritabanını başlatıp rolleri günceller; şifreli bir güncelleme öncesi yedeği alır; migrasyonları ayrı çalıştırır (başarısız olursa eski uygulamaya dokunmaz ve yedeğin adını, geri dönüş komutunu yazar); uygulamayı yeniler; Caddy'yi yeni yapılandırmayla yeniden oluşturup doğrular ve sağlık kontrolü yapar. Caddy yenilenirken birkaç saniyelik kesinti olur. Caddy sağlık denetimindeki `RestartCount` yalnızca `docker inspect` anındaki sayacı okur ve yaklaşık 4 saniye sonra bir kez daha bakar; daha sonraki çökmeleri yakalamaz (gerekirse `docker compose ps` ile tekrar bakın). Veriler Docker birimlerinde (`db-veri`, `medya`) tutulduğu için konteynerlerin yeniden oluşturulması veri kaybettirmez.

**Asla çalıştırmayın:** `docker compose down -v` (`-v` bütün veritabanını ve görselleri siler).

## Bağımlılık güncellemesi (güvenlik)

Kullanılan Python paketlerinin tam listesi ve “parmak izleri” (hash) `app/requirements.txt` dosyasında kilitlidir; bu dosya **elle düzenlenmez**. Sizin değiştireceğiniz tek dosya `app/requirements.in`'dir (yalnızca ana paketler ve sürümleri). Güncelleme adımları:

1. Duyuruyu izleyin: Django güvenlik duyuruları https://www.djangoproject.com/weblog/ (5.2.x serisi içindeki yamalar geriye uyumludur).
2. `app/requirements.in` içinde sürümü artırın (ör. `Django==5.2.19`).
3. Kilit dosyasını yeniden üretin: `bash scripts/bagimlilik-kilitle.sh` (Docker ve internet gerekir; birkaç dakika sürebilir).
4. Güvenlik taramasını çalıştırın: `bash scripts/guvenlik-tarama.sh` — bilinen açık bulursa hata verir; temiz çıkmalı.
5. Testleri çalıştırın: `bash scripts/test.sh` — hepsi geçmeli.
6. `bash scripts/guncelle.sh`.
7. PostgreSQL için yalnızca **küçük sürüm** (17.x → 17.y) güncellemesi `docker-compose.yml`'de etiketi değiştirerek yapılabilir. Büyük sürüm (17 → 18) yükseltmesi yedek + geri yükleme ile yapılmalıdır; tek başına etiket değiştirmeyin.

Not: Kurulum sırasında hash'i uyuşmayan paket reddedilir; bu bilinçli bir korumadır. İki tarama/kilit aracının (pip-tools, pip-audit) kendi kurulumu hash'siz yapılır; bunlar yalnızca bakım aracıdır, uygulama imajına girmez.

Django 5.2 LTS'nin desteği 2028 Nisan'da biter; o tarihten önce bir sonraki LTS sürümüne geçiş planlanmalıdır.

## Günlükler (log)

```bash
docker compose logs app --tail 200      # uygulama ve erişim günlükleri
docker compose logs caddy --tail 200    # HTTPS ve istek günlükleri
docker compose logs yedek --tail 50     # yedekleme
cat yedekler/yedek-gunlugu.log
```

Docker günlükleri dosya başına 10 MB, servis başına 5 dosya ile sınırlıdır (otomatik döner, diski doldurmaz).

## Sorun giderme

| Belirti | Kontrol |
|---|---|
| Site açılmıyor | `docker compose ps` · `docker compose logs caddy` · DNS kaydı |
| “Sertifika alınamadı” | DNS VPS'i gösteriyor mu, 80 ve 443 portları açık mı |
| app “unhealthy” | `docker compose logs app` · `docker compose logs db` |
| Disk doluyor | `docker system df` · `du -sh yedekler` · `YEDEK_SAKLAMA_GUN`'ü azaltın |
| Yönetici MFA cihazını kaybetti | Başka bir Yönetici panelden sıfırlar; tek yönetici varsa: `docker compose exec app python manage.py mfa_sifirla KULLANICI_ADI` |
| Hesap kilitlendi (“Çok fazla başarısız deneme”) | Kilit 15 dk sonra kendiliğinden kalkar; hemen açmak için: `docker compose exec app python manage.py sayac_sifirla KULLANICI_ADI` (gerekirse `--ip IP`). Denetim kaydına “sayac_sifirlandi” yazılır. Tekrarlıyorsa denetim kayıtlarında saldırgan IP'sini arayın. |
