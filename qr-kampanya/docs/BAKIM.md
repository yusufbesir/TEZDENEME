# Güncelleme ve bakım rehberi

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

## Özet

| Ne zaman | Ne yapılır |
|---|---|
| Her hafta | Panel ana ekranında son yedeğin “başarılı” olduğuna bakın. |
| Her ay | `bash scripts/geri-yukleme-testi.sh` · sunucu güncellemeleri (`sudo apt update && sudo apt upgrade`) · disk: `df -h` · `bash scripts/guvenlik-tarama.sh` (bilinen güvenlik açığı taraması; “temiz” demeli, açık bulursa aşağıdaki bağımlılık güncellemesini yapın) |
| Her ay (isteğe bağlı) | `bash scripts/surum-denetimi.sh --cevrimici` (yeni imaj/paket sürümü var mı; hiçbir şeyi güncellemez, aşağıdaki “Sürüm denetimi”) |
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

## Migration geri alma (UYARI)

Normal güncellemede geri alma gerekmez; veritabanını `migrate qr <önceki>` ile geri sarmadan önce **mutlaka yedek alın** (`bash scripts/yedek-al.sh`). İki migrasyon geri alınırken özel davranır:

- **0010 (`migrate qr 0009`)**: Eski kod `cop` (çöp kutusu) durumunu tanımaz ve onu aktif sayıp yeniden yönlendirirdi. Bu yüzden geri alma, çöpteki **tüm** kodları önceki durumları ne olursa olsun **pasif** yapar (çöpe atılmış kod geri almada yeniden yönlendirmeye başlamaz). Eski hedef-tutarlılık kısıtıyla bağdaşmayacak bir satır varsa (örn. çöpteki kodun hedefi boş) **hiçbir satır değişmeden** hata ile durur; mesajdaki kodlara hedef girip tekrar deneyin. Çöpe atılma zamanı ve önceki durum alanları silinir; geri alma sonrası çöp kutusu kavramı kalmaz, ilgili kodları panelde elle düzenleyin.
- **0012 (`migrate qr 0011`)**: Geri alma link ağacı tablolarını (ağaç, öğe, görüntüleme sayacı) siler. Bunlardan birinde bile satır varsa silme tetikleyicileri düşürülmeden önce, **hiçbir şey yapılmadan** hata ile durur. Ağaç verisini kaybetmek istemiyorsanız bu migrasyonu geri almayın; gerçekten gerekiyorsa önce yedek alın ve tabloları veritabanı yöneticisi olarak bilinçli biçimde boşaltın.

**Adımlar ayrı ayrı uygulanır:** `migrate qr 0009` sırayla 0012, 0011, 0010'u ayrı işlemlerde geri alır. 0010 hata verip dururse 0012 ve 0011 zaten geri alınmış olabilir; bu yüzden **önce yedek alın**.

Her migrasyon adımı kendi içinde tek işlemde (transaction) yapılır; hata veren adım değişmeden kalır. Her zaman yedekten dönmek de mümkündür ([YEDEKLEME.md](YEDEKLEME.md)).

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

## Sürüm denetimi (elle, ağsız varsayılan)

Uygulama kendi kendine “yeni sürüm var mı” diye **bakmaz**, hiçbir şeyi otomatik güncellemez. Elle denetim için:

```bash
bash scripts/surum-denetimi.sh              # çevrimdışı: sabit imaj etiketlerini ve doğrudan bağımlılıkları listeler, ağa bağlanmaz
bash scripts/surum-denetimi.sh --cevrimici  # ayrıca PyPI ve Docker Hub/GHCR'ye salt okunur sorgu yapar, daha yeni sürüm var mı raporlar
```

- Kapsam: `docker-compose.yml`, `app/Dockerfile` ve `yedek/Dockerfile` içindeki `ad:etiket` imajları; `app/requirements.in` içindeki doğrudan bağımlılıklar (kilitli sürüm `app/requirements.txt`'den okunur). Yerel derlenen `qr-kampanya-*` imajları listelenmez.
- `--cevrimici` için `curl` ve `python3` gerekir. Ağ yoksa ya da bir uç yanıt vermezse o satır için açık hata yazılır, “güncel” denilmez ve çıkış kodu 1 olur; sürüm uydurulmaz. “Daha yeni sürüm var” bilgisi hata değildir (çıkış 0).
- İmaj karşılaştırması bir sezgidir: aynı sonekli (ör. `-alpine`) ve sayısal sürümlü etiketlere bakılır, yalnızca etiket listesinin ilk sayfaları taranır; ana sürüm atlamalarını (`17` → `18`, Python `3.13` → `3.14`) sürüm notlarıyla değerlendirin. `age` aracının sürümü (`yedek/Dockerfile` içindeki `AGE_SURUMU`) bu betikle denetlenmez.
- Betik **hiçbir şeyi değiştirmez**. Güncellemeye karar verirseniz aşağıdaki “Bağımlılık güncellemesi” ve “Taban imaj digest'lerini güncellemek” adımlarını izleyin.
- Panelde **Sistem bilgisi** (Yönetici) yalnızca mevcut sürümleri gösterir (uygulama sürümü, Python, Django, PostgreSQL, son migration, imaj etiketi). Uygulama sürümü `app/config/surum.py` içinde tek yerde tanımlıdır; yayın yaptığınızda orada artırın.
- Önerilen sıklık: ayda bir (aylık bakım listesiyle birlikte) ve güvenlik duyurusu geldiğinde.

## Taban imaj digest'lerini güncellemek (sabitleme)

Dış imajlar `ad:etiket@sha256:...` biçiminde **digest ile sabitlenmiştir**: `postgres` ve `caddy` `docker-compose.yml` içinde, `python` `app/Dockerfile` içinde, `postgres` ayrıca `yedek/Dockerfile` içinde. Etiket aynı kalsa bile kayıt defterindeki içerik sonradan değiştirilirse (ele geçirilmiş hesap, yeniden yayımlama) sabitlenmiş digest bunu reddeder. Digest, çok mimarili **liste (index)** özetidir; böylece amd64 ve arm64 sunucularda aynı satır çalışır. Digest'i elle uydurmayın, yazmayın: her zaman kayıt defterinden alın.

Ne zaman: güvenlik yaması (ör. `postgres` 17.x küçük sürüm, `caddy` yaması, Python/Debian güvenlik güncellemesi) çıktığında veya etiketi bilinçli değiştirdiğinizde.

1. Yeni etiketi seçin (ör. `postgres:17.7-alpine`). PostgreSQL için yalnızca küçük sürüm; büyük sürüm için yukarıdaki yedek + geri yükleme kuralı geçerlidir.
2. Çok mimarili digest'i alın (internet gerekir; ikisinden biri):
   ```bash
   docker buildx imagetools inspect postgres:17.7-alpine          # ilk satırlardaki "Digest: sha256:..." (MediaType ...image.index...)
   # veya:
   docker pull postgres:17.7-alpine && docker image inspect postgres:17.7-alpine --format '{{index .RepoDigests 0}}'
   ```
   Not: `RepoDigests`, bazı Docker sürümlerinde yalnızca makinenizin mimarisine ait tek imajın digest'ini verebilir; `MediaType` "index" (liste) değilse `imagetools inspect` çıktısındaki en üst `Digest` değerini kullanın.
3. Değeri ilgili satırlarda değiştirin (etiket ve digest birlikte): `docker-compose.yml` (`db`, `caddy`), `app/Dockerfile` (`FROM python:...`), `yedek/Dockerfile` (`FROM postgres:...`). `db` ve `yedek` aynı postgres digest'ini kullanmalıdır (yedek aracı `pg_dump` sürümü sunucuyla uyumlu olsun).
4. Doğrulayın: `docker compose config` hatasız olmalı; `docker compose build` ve ardından `bash scripts/test.sh`.
5. `bash scripts/guncelle.sh`. Sonra `bash scripts/geri-yukleme-testi.sh` ile yedeğin hâlâ geri yüklendiğini görün.

Kontrol: çalışan imajın sabitlenen digest ile aynı olduğunu görmek için `docker compose images` veya `docker image inspect <imaj> --format '{{index .RepoDigests 0}}'`.

## Yedek servisinin kullanıcısı (root değil)

Yedek konteyneri `10002:10002` kullanıcısıyla, ek grup `10001` (uygulama imajındaki `uygulama` grubu), `cap_drop: [ALL]`, `read_only: true` ve `no-new-privileges` ile çalışır; yazdığı tek yerler `yedekler/` dizini, `yedek-durum` birimi ve bellek tmpfs'i olan `/tmp`'dir. UID bilerek app'ten (10001) farklıdır: konteyner kaçışında app süreci yedek dosyalarının sahibi olup onları silemesin. `medya` birimi (salt okunur) app'in grubu 10001 üzerinden okunur; bu yüzden medya dosyalarında **grup okuma izni** (dosya g+r, dizin g+rx) gerekir.

- `yedekler/` ve içindeki dosyalar **10002'ye aittir (kip 700/600)**: sunucuda okumak/kopyalamak için root kullanın (`sudo`). `yedek-durum` birimi 10002:10001, dizin 2750, `son-durum.json` 640 (panel yalnızca okur).
- `guncelle.sh` ve `kurulum.sh`, eski kurulumlardaki root sahipliğini `scripts/yedek-dizini-hazirla.sh` ile (yalnızca `chown`/`chmod`, silme yok) devreder; elle: `bash scripts/yedek-dizini-hazirla.sh`.
- **GID 10001**: konteyner GID'leri host'a birebir eşlenir; host'ta 999 sıkça `docker` grubudur, bu yüzden app imajındaki `uygulama` grubu 10001'dir. Host'ta `getent group 10001` çıktısı **boş** olmalıdır (doluysa o grupla medya erişimi karışır). Eski kurulumlarda (grup 999) `guncelle.sh`, yeni imaj derlendikten sonra medya dosyalarının grubunu 10001'e çevirir.
- `guncelle.sh`, mevcut medya dosyalarına `scripts/medya-izni-hazirla.sh` ile grubu 10001 yapar ve g+r/g+rx ekler (yalnızca grup/izin; silme yok, sembolik bağlantı izlenmez). Okunamayan bir medya dosyası kalırsa `yedek-al.sh` **başarısız** olur ve hata mesajında dosyayı yazar (sessizce atlamaz); çözüm: `bash scripts/medya-izni-hazirla.sh`.
- Yeni yüklenen görsellerin de grup tarafından okunabilmesi için uygulama ayarlarında dosya kipi grup okumayı içermelidir (varsayılan 0o644 zaten içerir; `FILE_UPLOAD_PERMISSIONS = 0o640` ve `FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o750` gibi sıkılaştırmada grup biti KORUNMALI; ayrıca Caddy'nin medyayı okuyabilmesi için bkz. proje notları).
