# Yedekleme ve geri yükleme

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

## Özet

- `yedek` servisi **her gün 03:15'te** (İstanbul saati, `.env` → `YEDEK_SAATI`) veritabanı ve görsel yedeği alır.
- Yedekler **şifrelidir** (age). Düz, şifresiz yedek diske yazılmaz.
- Şifreyi açan **özel anahtar sunucuda durmaz**: parola yöneticinizde olmalıdır. Kaybolursa yedekler açılamaz.
- Yedekler sunucuda `./yedekler/` klasöründedir (web'den erişilemez, izinler 700, yalnızca root okur).
- Eski yerel yedekler **yalnızca sunucu dışına kopyalanıp doğrulandıktan sonra** silinir. Sunucu dışı kopya yoksa hiçbir şey silinmez (disk dolabilir).
- Panel ana ekranı son yedeği, yedek sayısını ve sunucu dışı kopyanın son doğrulama zamanını gösterir.

## Şifreleme ve anahtar

Yedekler [age](https://github.com/FiloSottile/age) ile **açık/özel anahtar çiftiyle** şifrelenir.

| Parça | Nerede | Ne işe yarar |
|---|---|---|
| Açık anahtar (`YEDEK_ALICI=age1...`) | `.env` ve yedek servisi | Yalnızca **şifreler**; gizli değildir |
| Özel anahtar | `gizli/yedek-anahtari.txt` (izin 600) | **Açar**; yedek servisine verilmez |

- Anahtarı `scripts/kurulum.sh` (veya eskiden kurulduysa `scripts/guncelle.sh`) üretir. Var olan anahtarın üzerine asla yazmaz.
- **Yapmanız gereken:** `gizli/yedek-anahtari.txt` içeriğini parola yöneticinize kopyalayın ve bir de sunucu dışında ikinci bir yerde saklayın. Bu dosya kaybolursa yedekler **asla** açılamaz.
- Anahtarı kaydettikten sonra dosyayı sunucudan silmeniz önerilir. Böylece sunucu ele geçirilse bile eski yedekler ve sunucu dışı kopyalar okunamaz. Geri yüklerken dosyayı geçici olarak geri koyarsınız.
- Anahtarı kimseyle paylaşmayın, e-postayla göndermeyin, Git'e eklemeyin (`gizli/` zaten Git dışındadır).
- age sürümü `yedek/Dockerfile` içinde sabittir (v1.3.2) ve sabit sha256 ile doğrulanır; doğrulama tutmazsa imaj derlenmez. Derleme makinesi internete çıkamıyorsa `yedek/paketler/` klasörüne `age-v1.3.2-linux-amd64.tar.gz` (veya `-arm64`) koyun; aynı doğrulama o dosyaya da uygulanır.

## Ne yedeklenir

| Dosya | İçerik |
|---|---|
| `db-YYYYMMDD-HHMMSS.dump.age` | Bütün veritabanı (`pg_dump`), şifreli. Şifrelenmeden önce `pg_restore --list` ile okunabilirliği doğrulanır. |
| `medya-YYYYMMDD-HHMMSS.tar.gz.age` | Yüklenen kapak görselleri, logolar, ürün görselleri, şifreli |
| `sha256-YYYYMMDD-HHMMSS.txt` | **Şifreli dosyaların** bütünlük özetleri |
| `yedek-gunlugu.log` | Her yedeğin başarı/hata kaydı ve silinen dosyalar |
| `uzak-dogrulama.json` | Sunucu dışı kopyanın son doğrulaması (kimlik bilgisi içermez) |
| `geri-yukleme-testi-*.log` | Geri yükleme testi çıktıları |

Aynı `ZAMAN` ile gelen `db`, `medya` ve `sha256` dosyaları bir **üçlüdür**. `YEDEK_ALICI` tanımlı değilse veya şifreleme başarısız olursa yedek **alınmaz** (durum "hata"), düz yedek yazılmaz.

**Uygulama yapılandırması** (`.env`) gizli bilgi içerdiği için otomatik kopyalanmaz. Kurulumdan sonra `.env` dosyasını da parola yöneticinize kaydedin. `.env` kaybolursa veritabanı parolası ve oturum anahtarı yeniden üretilebilir, ama MFA kodları ve ziyaretçi özetleri anahtara bağlı olduğundan yeniden kurulum gerekir.

**Eski sürümden kalan şifresiz yedekler** (`db-*.dump`, `medya-*.tar.gz`) otomatik silinmez ve sunucu dışına kopyalanmaz. Şifreli yedeğin çalıştığını doğruladıktan sonra bunları elle silin veya güvenli bir yere taşıyın; `disari-kopyala.sh` varlıklarını uyarı olarak yazar.

## Elle yedek almak

```bash
docker compose exec yedek sh /betikler/yedek-al.sh
```

## Sunucu dışı kopya ve silme kuralı

Sunucu dışına kopya, hem felaket (disk/sunucu kaybı) hem de disk dolması için gereklidir. Yerel yedekler **başka hiçbir yolla silinmez**.

1. Sunucuda `sudo apt install rclone`, ardından `sudo rclone config` ile bir uzak depo tanımlayın (örn. Backblaze B2 veya Hetzner Storage Box).
2. `.env` dosyasına `YEDEK_UZAK_HEDEF=uzakadi:klasor` ekleyin.
3. Günlük çalıştırma için `sudo crontab -e` (yedek dosyaları root'a aittir ve yalnızca root okuyabilir):
   ```
   30 4 * * * cd /opt/qr-kampanya && bash scripts/disari-kopyala.sh >> yedekler/disari-kopya.log 2>&1
   ```
4. Uzak taraftaki saklama süresini sağlayıcının yaşam döngüsü kuralıyla ayarlayın (öneri: 90 gün). Dosyalar şifreli olduğundan sağlayıcı içeriği okuyamaz.

   > **Güvenlik notları.** (a) Sunucu ele geçirilirse sunucudaki rclone ayarı da ele geçer ve saldırgan **uzak kopyaları da silebilir**. Bu yüzden uzak hedefte *silme yetkisi olmayan* (yalnızca yazma/ekleme) bir anahtar, nesne kilidi (object lock) ve/veya sürümleme (versioning) kullanmanız önerilir. (b) `sha256-*.txt` dosyası **bozulmayı** yakalar, **sahteciliğe karşı korumaz**: yedek dosyalarına yazabilen biri sahte bir yedek ve ona uyan bir sha256 dosyası üretebilir. Uzak kopyanın değiştirilemez tutulması (nesne kilidi/sürümleme) bu riski de azaltır.

`disari-kopyala.sh` sırasıyla şunları yapar:

1. Şifreli dosyaları uzağa kopyalar (uzaktaki eski dosyaları silmez).
2. Her yerel dosyanın uzakta var olduğunu ve boyut/özet olarak aynı olduğunu `rclone check --one-way` ile doğrular. Sağlayıcı özet (hash) desteklemiyorsa `rclone check` **yalnızca boyutu** karşılaştırır; bu durumda `.env` içine `YEDEK_UZAK_INDIREREK=1` yazın, veri indirilip birebir karşılaştırılır (daha yavaş ve trafik harcar).
3. Sonucu `yedekler/uzak-dogrulama.json` dosyasına yazar (zaman, doğrulanan dosya adları, hedefin yalnızca `:` öncesi adı; parola/anahtar yazılmaz).
4. **Silme kuralı.** Yerel bir üçlü ancak şu hepsi doğruysa silinir:
   - `YEDEK_SAKLAMA_GUN` (varsayılan 14) günden eskidir,
   - `db`, `medya` ve `sha256` dosyalarının üçü de yerelde vardır,
   - üçü de **uzakta doğrulanmıştır** (bu çalıştırmada),
   - eksiksiz (veritabanı + görsel + sha256) en yeni yerel yedek **değildir** (bu yedek hiçbir koşulda silinmez).

   `YEDEK_UZAK_HEDEF` tanımlı değilse hiçbir şey silinmez. Silinen her dosya `yedek-gunlugu.log` ve ekran çıktısına yazılır.

Sunucu dışı kopya hiç doğrulanmamışsa veya son doğrulama 7 günden eskiyse panel ana ekranında **sarı uyarı** çıkar: "Sunucu dışı kopya doğrulanmadı; eski yedekler silinmiyor, disk dolabilir". Bu durumda diski izleyin ve kopyalamayı düzeltin. Panel bu bilgiyi her yedek alındığında (günde bir) yeniler.

## Geri yükleme testi (güvenli, düzenli yapın)

Önce özel anahtarı geçici olarak geri koyun (parola yöneticinizden `gizli/yedek-anahtari.txt` olarak, izin 600), sonra:

```bash
bash scripts/geri-yukleme-testi.sh
# Anahtar başka yerdeyse:  bash scripts/geri-yukleme-testi.sh /yol/yedek-anahtari.txt
# veya:                    YEDEK_ANAHTAR_DOSYASI=/yol/yedek-anahtari.txt bash scripts/geri-yukleme-testi.sh
# Belirli bir yedek için:  bash scripts/geri-yukleme-testi.sh yedekler/db-20261015-031500.dump.age
```

Betik: (1) `sha256` dosyasıyla bütünlüğü doğrular, uyuşmazsa **durur**; (2) internetsiz geçici bir konteynerde şifreyi çözüp geçici veritabanına yükler (anahtar ve yedek salt okunur bağlanır); (3) tablo sayılarını canlı sistemle karşılaştırır; (4) görsel arşivini çözüp listeleyebildiğini doğrular; (5) geçici konteyneri kaldırır. Çıktı ekrana ve `yedekler/geri-yukleme-testi-ZAMAN.log` dosyasına yazılır. Sonunda `SONUÇ: GEÇTİ` görmelisiniz. Canlı sisteme dokunmaz. **Önerilen sıklık: ayda bir** ve her büyük güncellemeden önce. Testten sonra anahtar dosyasını sunucudan tekrar silebilirsiniz.

## Gerçek geri yükleme (yıkıcı)

```bash
# Yalnızca veritabanı:
bash scripts/geri-yukle.sh yedekler/db-20261015-031500.dump.age
# Veritabanı + görseller:
bash scripts/geri-yukle.sh yedekler/db-20261015-031500.dump.age --medya
# Anahtar farklı yerdeyse ekleyin:  --anahtar /yol/yedek-anahtari.txt
```

- Canlı veritabanını yedektekiyle değiştirir; yedekten sonraki değişiklikler kaybolur.
- Önce `sha256` doğrulanır ve şifre çözülebildiği denenir; sorun varsa hiçbir şey değiştirilmeden durur.
- Betik `EVET` yazmanızı ister ve başlamadan önce mevcut durumun (şifreli) güvenlik yedeğini alır.
- Şifre çözme çıktısı diske yazılmadan doğrudan `pg_restore`'a akıtılır. `pg_restore` tek işlemde (`--single-transaction --exit-on-error`) çalışır: hata olursa veya akış yarıda kesilirse hiçbir şey uygulanmaz, veritabanı değişmez; betik `app` ve `caddy`'yi yeniden başlatır ve güvenlik yedeğinin adını gösterir.
- Yedek dosya adları katı doğrulanır (`db-YYYYMMDD-HHMMSS.dump.age` vb.); başka biçimdeki adlar reddedilir.
- `--medya` aynı tarihli görsel arşivini de açıp mevcut görsellerin üzerine yazar (yedekte olmayan görsellere dokunmaz).
- Başka sunucuya taşıma: yeni sunucuda `kurulum.sh` yeni bir anahtar üretir; geri yüklemek için eski özel anahtarı `--anahtar` ile verin, sonra yeni sunucunun yedekleri kendi anahtarıyla alınmaya devam eder.

## Saklama politikası

| Konum | Süre |
|---|---|
| Sunucu (`./yedekler`) | 14 gün (`YEDEK_SAKLAMA_GUN`), **yalnızca uzakta doğrulanmışsa** silinir; en yeni yedek hep kalır |
| Sunucu dışı | Önerilen 90 gün (sağlayıcıda ayarlanır) |
| Tarama kayıtları (veritabanında) | 730 gün (`TARAMA_SAKLAMA_GUN`), sonra temizlenir |
