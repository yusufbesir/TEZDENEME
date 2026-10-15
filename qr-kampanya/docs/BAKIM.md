# Güncelleme ve bakım rehberi

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

## Özet

| Ne zaman | Ne yapılır |
|---|---|
| Her hafta | Panel ana ekranında son yedeğin “başarılı” olduğuna bakın. |
| Her ay | `bash scripts/geri-yukleme-testi.sh` · sunucu güncellemeleri (`sudo apt update && sudo apt upgrade`) · disk: `df -h` |
| Güvenlik duyurusunda | Bağımlılık güncellemesi (aşağıda) |
| Yılda bir | Alan adı yenilemesini, sunucu dışı yedeklerin varlığını ve yönetici hesaplarını gözden geçirin. |

## Uygulamayı güncellemek

```bash
cd /opt/qr-kampanya
# yeni sürüm dosyalarını kopyaladıktan sonra:
bash scripts/guncelle.sh
```

Betik önce yedek alır, imajları yeniden derler, servisleri yeniden başlatır (migrasyonlar otomatik uygulanır) ve sağlık kontrolü yapar. Veriler Docker birimlerinde (`db-veri`, `medya`) tutulduğu için konteynerlerin yeniden oluşturulması veri kaybettirmez.

**Asla çalıştırmayın:** `docker compose down -v` (`-v` bütün veritabanını ve görselleri siler).

## Bağımlılık güncellemesi (güvenlik)

Sürümler `app/requirements.txt` ve `docker-compose.yml` içinde sabittir. Güncelleme adımları:

1. Django güvenlik duyuruları: https://www.djangoproject.com/weblog/ (5.2.x serisi içindeki yamalar geriye uyumludur).
2. `app/requirements.txt` içinde sürümü artırın (ör. `Django==5.2.19`).
3. Testleri çalıştırın: `bash scripts/test.sh` — hepsi geçmeli.
4. `bash scripts/guncelle.sh`.
5. PostgreSQL için yalnızca **küçük sürüm** (17.x → 17.y) güncellemesi `docker-compose.yml`'de etiketi değiştirerek yapılabilir. Büyük sürüm (17 → 18) yükseltmesi yedek + geri yükleme ile yapılmalıdır; tek başına etiket değiştirmeyin.

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
