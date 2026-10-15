# Yedekleme ve geri yükleme

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

## Özet

- `yedek` servisi **her gün 03:15'te** (İstanbul saati, `.env` → `YEDEK_SAATI`) veritabanı ve görsel yedeği alır.
- Yedekler **şifrelidir** (age). Düz, şifresiz yedek diske yazılmaz.
- Şifreyi açan **özel anahtar sunucuda durmaz**: kurulumda ekranda bir kez gösterilir, siz parola yöneticinize kopyalayıp `EVET` yazınca sunucudan silinir. Kaybolursa yedekler açılamaz.
- Yedekler sunucuda `./yedekler/` klasöründedir (web'den erişilemez, izinler 700, yalnızca root okur).
- Eski yerel yedekler **yalnızca sunucu dışına kopyalanıp doğrulandıktan sonra** silinir. Sunucu dışı kopya yoksa hiçbir şey silinmez (disk dolabilir).
- Panel ana ekranı son yedeği, yedek sayısını ve sunucu dışı kopyanın son doğrulama zamanını gösterir.

## Şifreleme ve anahtar

Yedekler [age](https://github.com/FiloSottile/age) ile **açık/özel anahtar çiftiyle** şifrelenir.

| Parça | Nerede | Ne işe yarar |
|---|---|---|
| Açık anahtar (`YEDEK_ALICI=age1...`) | `.env` ve yedek servisi | Yalnızca **şifreler**; gizli değildir |
| Özel anahtar | Parola yöneticinizde. Kurulumda geçici olarak `gizli/yedek-anahtari.txt` (izin 600) | **Açar**; yedek servisine verilmez |

- Anahtarı `scripts/kurulum.sh` (veya eskiden kurulduysa `scripts/guncelle.sh`) üretir. Var olan anahtarın üzerine asla yazmaz.
- **Yapmanız gereken:** kurulum sırasında ekranda görünen anahtar satırlarını (`AGE-SECRET-KEY-1...` ile başlayan satır dahil) parola yöneticinize kopyalayın ve bir de sunucu dışında ikinci bir yerde saklayın. Anahtar kaybolursa yedekler **asla** açılamaz.
- **Kopyaladıktan sonra** ekrandaki soruya büyük harfle `EVET` yazın; ardından doğrulama için `AGE-SECRET-KEY-1...` satırını parola yöneticinizden **geri yapıştırın** (görünmez). Yapıştırılan anahtar sunucudakiyle birebir aynıysa özel anahtar dosyası **silinir**; uyuşmazsa dosya kalır ve `--goster-ve-kaldir` ile tekrar deneyebilirsiniz. Böylece sunucu ele geçirilse bile eski yedekler ve sunucu dışı kopyalar okunamaz. Yedekleme etkilenmez (şifrelemek için yalnızca açık anahtar gerekir; o `.env` içinde `YEDEK_ALICI` olarak kalır).
- `EVET` yazmazsanız (veya terminal etkileşimli değilse) dosya sunucuda **kalır** ve **"ÖZEL ANAHTAR HÂLÂ SUNUCUDA"** uyarısı çıkar: sunucu ele geçirilirse yedekler açılabilir. Anahtarı kaydettikten sonra istediğiniz zaman şunu çalıştırın; anahtarı bir kez daha gösterir ve aynı soruyu sorar: `bash scripts/yedek-anahtari-hazirla.sh --goster-ve-kaldir`.
- **Anahtar nerede üretilir?** Yeni anahtar kalıcı diske yazılmadan önce yalnızca **bellek dosya sisteminde** (`/dev/shm`, yoksa 700 izinli `XDG_RUNTIME_DIR`) üretilir; Docker'a `--log-driver none` verilir ve anahtar konteynerin standart çıktısına yazdırılmaz (aksi hâlde Docker günlük sürücüsüne/journald'e düşerdi). `EVET` + geri yapıştırma doğrulaması geçilirse anahtar **hiç kalıcı diske yazılmadan** bellekten silinir (`gizli/` altında dosya oluşmaz). Anahtar üretilirken (kullanıcıya gösterilmeden, `.env` yazılmadan) Ctrl-C/TERM/HUP ya da hata gelirse bellek dizini anahtarla birlikte silinir (hiçbir yedek bu anahtarla şifrelenmediği için güvenlidir); temizlik sürerken ikinci bir sinyal kaydı yarıda kesmez. Anahtar gösterildikten sonra onay yoksa, terminal yoksa, yapıştırma uyuşmazsa ya da işlem Ctrl-C/hata ile kesilirse anahtar `gizli/yedek-anahtari.txt` (dizin 700, dosya 600) dosyasına taşınır, bellekteki kopya silinir ve büyük harfli uyarı çıkar. `.env` içindeki `YEDEK_ALICI` her zaman anahtar güvence altına alındıktan **sonra** yazılır; böylece yarıda kalan bir kurulum, şifreli yedek alıp anahtarı kaybetmez.
- **Sınırlar (dürüst not).** `shred` SSD'de, ext4 gibi günlüklü ve btrfs/ZFS gibi copy-on-write dosya sistemlerinde silinen verinin fiziksel olarak üzerine yazıldığını **garanti etmez**; bu yüzden anahtarın diske hiç yazılmaması (yukarıdaki tmpfs düzeni) asıl önlemdir, `shred` yalnızca ek bir çabadır. Ekrandaki anahtar terminal **kaydırma geçmişinde** de kalır: kopyaladıktan sonra `clear` yazın; `tmux`/`screen` kullanıyorsanız oturumun kendi geçmişini de temizleyin (tmux: `Ctrl-b` sonra `:clear-history`; screen: `Ctrl-a` `Ctrl-\` ile oturumu kapatın) ve terminal kaydı (`script`, oturum kaydı) açıksa kapatın.
- `--goster-ve-kaldir` silmeden önce dosyadaki özel anahtardan türetilen açık anahtarın `.env` içindeki `YEDEK_ALICI` ile aynı olduğunu denetler; farklıysa (veya `YEDEK_ALICI` yoksa) anahtarı **silmez ve göstermez**, açık bir uyarı verir.
- Anahtar sunucudan kaldırıldıktan sonra `kurulum.sh` veya `guncelle.sh` tekrar çalışsa bile **yeni anahtar üretilmez** (üretilseydi eski yedekler yeni anahtarla uyuşmazdı). Betik "Yeni anahtar ÜRETİLMEDİ" yazar.
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
2. Her yerel dosyanın uzakta var olduğunu ve aynı olduğunu `rclone check --one-way` ile doğrular. Bazı sağlayıcılar (SFTP, Hetzner Storage Box gibi) ortak bir özet (hash) sunmaz; bu durumda `rclone check` **yalnızca boyutu** karşılaştırır, bu da silme için yeterli değildir. Bu yüzden karar rclone günlük metnine değil **açık bir sorguya** dayanır: betik `rclone backend features` ile yerel ve uzak tarafın ortak bir özeti olup olmadığına bakar. Sorgu başarısız, boş ya da belirsizse; hedef `sftp`, `ftp`, `smb`, `webdav` veya `http` gibi bir ağ dosya sistemiyse (bu türlerde özet desteği sunucu kabuğuna bağlıdır ve `features` bilgisi yanıltabilir) ya da `YEDEK_UZAK_INDIREREK=1` ise doğrudan **verinin tamamını indirip birebir karşılaştırır** (`--download`). Özet destekleniyorsa özetle denenir; rclone çıktısındaki "No common hash found" metni yalnızca yedek tetiktir (`RCLONE_LOG_LEVEL`, `RCLONE_QUIET`, `RCLONE_LOG_FILE` bu çağrı için temizlenir ve `--log-level NOTICE` verilir). **Ağ maliyeti:** `--download` yalnızca silinmeye aday eski üçlüler ile bu çalıştırmadaki en yeni tam üçlü için yapılır (`--files-from`); kapsam dışı dosyalar "doğrulandı" sayılmaz ve **doğrulanmamış hiçbir üçlü silinmez** (`YEDEK_UZAK_INDIREREK=1` ise tüm dosyalar indirilir). İndirerek doğrulama başarısız olursa o gün **hiçbir yerel yedek silinmez**. Özet destekleyen sağlayıcılarda (B2, S3 vb.) indirme yapılmaz.
3. Sonucu `yedekler/uzak-dogrulama.json` dosyasına yazar (zaman, doğrulanan dosya adları, doğrulama yöntemi, hedefin yalnızca `:` öncesi adı; parola/anahtar yazılmaz). **`zaman` = en yeni TAM (db+medya+sha256) yerel üçlünün uzakta doğrulandığı son andır.** Kapsamlı `--download` yalnızca silme adaylarını ve en yeni tam üçlüyü indirdiği için `zaman`, tüm yerel dosyaların değil, en yeni tam üçlünün doğrulanmasına bağlıdır; en yeni tam üçlü doğrulanamazsa (ya da tam üçlü yoksa) `zaman` güncellenmez ve panel eski/eksik doğrulamayı uyarır.
4. **Silme kuralı.** Yerel bir üçlü ancak şu hepsi doğruysa silinir:
   - `YEDEK_SAKLAMA_GUN` (varsayılan 14) günden eskidir,
   - `db`, `medya` ve `sha256` dosyalarının üçü de yerelde vardır,
   - üçü de **uzakta doğrulanmıştır** (bu çalıştırmada),
   - eksiksiz (veritabanı + görsel + sha256) en yeni yerel yedek **değildir** (bu yedek hiçbir koşulda silinmez).

   `YEDEK_UZAK_HEDEF` tanımlı değilse hiçbir şey silinmez.

   **Hedef aynı sunucudaki bir klasör olursa** (ör. `/yedek-kopya`, `./kopya`, `~/kopya`, rclone `local` türü bir uzak, ya da yerel bir klasöre işaret eden `alias`/`crypt` uzak) bu **sunucu dışı sayılmaz**: dosyalar kopyalanır ama **hiçbir yerel yedek silinmez**, `uzak-dogrulama.json` içine "yerel hedef, sunucu dışı sayılmadı" yazılır ve panel uyarısı sürer (disk ve sunucu kaybına karşı koruma sağlamadığı için). Gerçek bir uzak hedef (B2, SFTP, S3...) tanımlayın. **rclone ayarlarını ortam değişkeniyle değil `rclone config` ile (ayar dosyasında) yapın:** betik, tüm rclone çağrılarında `RCLONE_` ile başlayan ortam değişkenlerini (`RCLONE_SFTP_HOST`, `RCLONE_S3_ENDPOINT`, `RCLONE_ALIAS_REMOTE`, `RCLONE_CONFIG_AD_*`, `RCLONE_SIZE_ONLY`, `RCLONE_LOG_LEVEL` vb.) kaldırır; yalnızca ayar dosyası yolu `RCLONE_CONFIG` ve ayar şifresi `RCLONE_CONFIG_PASS` korunur. Böylece "yerel mi?" tespiti ile rclone'un gerçekten kullandığı ayar aynı kaynaktan (ayar dosyası) gelir; `RCLONE_*` ortam değişkenleriyle rclone'u yerel adrese yönlendirip silmeyi tetiklemek ya da doğrulamayı zayıflatmak mümkün olmaz. (Not: bulut SDK'larının kendi değişkenleri — `AWS_ENDPOINT_URL`, `~/.aws/config`, `OS_*` — `env_auth = true` ayarlı s3/swift uzaklarında hedefi değiştirebilir; `env_auth` kullanmayın, anahtarları `rclone config` içine yazın.) Kaldırılan değişken olursa ekrana yalnızca **adı** (değeri değil) uyarı olarak yazılır. (Bash'in ortam adı olarak göremediği tireli `RCLONE_CONFIG_<AD-İLE-TİRE>_*` adları kaldırılamaz; ancak rclone bunları `config show` çıktısına da yansıttığı için tespit yine rclone'un kullandığı ayarla tutarlı kalır.) Belirsizlikte de **yerel sayılır** (silme yok): uzak türü sunucu dışı tür **izin listesinde** değilse (`b2`, `s3`, `sftp`, `ftp`, `smb`, `webdav`, `swift`, `azureblob`, `azurefiles`, `gcs`, `oos`, `qingstor`, `storj`, `drive`, `onedrive`, `dropbox`, `box`, `pcloud`, `mega`, `koofr`, `jottacloud`, `hidrive`, `yandex`, `seafile`; ör. `archive`, `memory`, `hdfs`, `http` yerel sayılır), rclone uzak türü belirlenemezse (ad `rclone listremotes`'ta yok), adlandırılmış uzağa bağlantı dizesi seçeneği eklenmişse (`ad,anahtar=değer:yol`; seçenekler ayarı geçersiz kılar), ya da `sftp` türünde `ssh` alanı dolu ise (ayarda ya da bağlantı dizesinde `ssh=...`; dış bir ssh komutu gerçek hedefi gizleyebilir, bu yüzden hedef belirsiz sayılır; gerekçe ekrana yazılır), ya da `webdav` `unix_socket` alanı doluysa veya Azure `use_emulator` açıksa (ikisi de tanımı gereği bu makinedir), ya da `sftp`/`ftp`/`smb`/`webdav`/`s3`/`swift`/`pcloud` gibi bir ağ türünün `host`/`endpoint`/`url`/`storage_url`/`hostname` alanı bu makineyi gösteriyorsa (`localhost`, `127.0.0.0/8`, `::1`, `0.0.0.0`, makinenin adı veya IP'leri; ad ayrıca çözülüp karşılaştırılır). Betik ekrana nedenini yazar (parola/ayar içeriği yazılmaz). Yalnızca **deneme için** `.env` içine `YEDEK_YEREL_HEDEF_IZIN=1` yazılırsa bu engel kalkar; üretimde kullanmayın. Silinen her dosya `yedek-gunlugu.log` ve ekran çıktısına yazılır.

Sunucu dışı kopya hiç doğrulanmamışsa veya son doğrulama 7 günden eskiyse panel ana ekranında **sarı uyarı** çıkar: "Sunucu dışı kopya doğrulanmadı; eski yedekler silinmiyor, disk dolabilir". Bu durumda diski izleyin ve kopyalamayı düzeltin. Panel bu bilgiyi her yedek alındığında (günde bir) yeniler.

## Geri yükleme testi (güvenli, düzenli yapın)

Anahtar sunucudan kaldırıldıysa (önerilen durum) bir şey koymanız gerekmez: betik anahtarı sorar. Parola yöneticinizden **anahtar satırını** (`AGE-SECRET-KEY-1...` ile başlayan) kopyalayıp istemde yapıştırın ve Enter'a basın. Yazdığınız ekranda **görünmez**, diske yazılmaz (yalnızca bellekte geçici tutulur) ve iş bitince silinir. Terminal gerekir (SSH ile bağlanıp elle çalıştırın; cron'da çalışmaz). Aylık testte anahtarı bu şekilde yapıştırmanız gerekir.

```bash
bash scripts/geri-yukleme-testi.sh
# Anahtarı dosya olarak vermek isterseniz:  bash scripts/geri-yukleme-testi.sh /yol/yedek-anahtari.txt
# veya:                    YEDEK_ANAHTAR_DOSYASI=/yol/yedek-anahtari.txt bash scripts/geri-yukleme-testi.sh
# Belirli bir yedek için:  bash scripts/geri-yukleme-testi.sh yedekler/db-20261015-031500.dump.age
```

Betik: (1) `sha256` dosyasıyla bütünlüğü doğrular, uyuşmazsa **durur**; (2) internetsiz geçici bir konteynerde şifreyi çözüp geçici veritabanına yükler (anahtar ve yedek salt okunur bağlanır); (3) tablo sayılarını canlı sistemle karşılaştırır; (4) görsel arşivini çözüp listeleyebildiğini doğrular; (5) geçici konteyneri kaldırır. Çıktı ekrana ve `yedekler/geri-yukleme-testi-ZAMAN.log` dosyasına yazılır. Sonunda `SONUÇ: GEÇTİ` görmelisiniz. Canlı sisteme dokunmaz. **Önerilen sıklık: ayda bir** ve her büyük güncellemeden önce. Anahtar dosyası verdiyseniz testten sonra sunucudan tekrar silin.

Şifre çözen `docker run` çağrıları `--log-driver none` ile çalışır: çözülmüş düz döküm/medya konteynerin standart çıktısından akar ve Docker günlük sürücüsüne (json-file/journald) yazılmaz. (`docker exec`/`docker compose exec` çıktısı istemciye gider, günlük sürücüsüne gitmez.)

## Gerçek geri yükleme (yıkıcı)

```bash
# Yalnızca veritabanı:
bash scripts/geri-yukle.sh yedekler/db-20261015-031500.dump.age
# Veritabanı + görseller:
bash scripts/geri-yukle.sh yedekler/db-20261015-031500.dump.age --medya
# Anahtar farklı yerdeyse ekleyin:  --anahtar /yol/yedek-anahtari.txt
# Anahtar dosyası yoksa betik anahtarı gizli girişle sorar (yapıştırın, görünmez; bellekte tutulur, iş bitince silinir).
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
