# QR Kampanya: Dinamik QR kod ve kampanya yönetim sistemi

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

Kendi alan adınızda çalışan, binlerce dinamik QR kodu yönetebilen, basılı kodu değiştirmeden hedefini güncelleyebilen, kendi kampanya sayfalarını yayınlayan, toplu QR üreten ve günlük yedek alan sistem.

## Nasıl çalışır

QR kodun içine her zaman **kalıcı kısa adres** yazılır:

```
https://qr.ornekfirma.com/k/KMP-0001
```

Bu adresin gideceği yer (harici bir web sayfası ya da sistemdeki bir kampanya sayfası) panelden istenildiği zaman değiştirilir. Basılmış QR kod aynı kalır, yeni hedef açılır.

## Hızlı başlangıç

```bash
bash scripts/kurulum.sh          # .env oluşturur, servisleri başlatır, yönetici hesabı açar
```

Panel: `https://ALAN-ADINIZ/panel/` (yerel denemede `http://localhost/panel/`).

## Belgeler

| Belge | İçerik |
|---|---|
| [docs/MIMARI.md](docs/MIMARI.md) | Mimari karşılaştırma (YOURLS vs özel uygulama), seçim gerekçesi, akışlar |
| [docs/KURULUM.md](docs/KURULUM.md) | Alan adı, DNS, VPS hazırlığı, Docker, kurulum |
| [docs/KULLANIM.md](docs/KULLANIM.md) | Panel kullanım kılavuzu |
| [docs/VERI-MODELI.md](docs/VERI-MODELI.md) | Veritabanı tabloları, ilişkiler, KVKK notları |
| [docs/GUVENLIK.md](docs/GUVENLIK.md) | Güvenlik önlemleri ve **üretim öncesi kontrol listesi** |
| [docs/YEDEKLEME.md](docs/YEDEKLEME.md) | Yedekleme, geri yükleme ve geri yükleme testi |
| [docs/BAKIM.md](docs/BAKIM.md) | Güncelleme, bakım, günlükler, sorun giderme |
| [docs/MALIYET.md](docs/MALIYET.md) | Tahmini işletme maliyeti |
| [docs/TEST-RAPORU.md](docs/TEST-RAPORU.md) | Test planı, beklenen ve gerçekleşen sonuçlar |

## Klasör yapısı

```
qr-kampanya/
├── docker-compose.yml     # db, app, caddy, yedek servisleri
├── .env.example           # ayar örneği (gerçek .env Git'e eklenmez)
├── caddy/Caddyfile        # HTTPS ve ters vekil
├── app/                   # Django uygulaması
│   ├── Dockerfile, requirements.txt, baslat.sh
│   ├── config/            # ayarlar, adresler
│   └── qr/                # modeller, yönlendirme, panel, şablonlar, testler, migrasyonlar
├── scripts/               # kurulum, güncelleme, yedek, geri yükleme, test
└── docs/                  # belgeler
```

## Sık kullanılan komutlar

```bash
docker compose ps                                    # servis durumu
docker compose logs app --tail 100                   # uygulama günlüğü
bash scripts/test.sh                                 # otomatik testler
docker compose exec yedek sh /betikler/yedek-al.sh   # elle yedek
bash scripts/geri-yukleme-testi.sh                   # yedeği güvenle test et
bash scripts/guncelle.sh                             # güncelle (önce yedek alır)
```
