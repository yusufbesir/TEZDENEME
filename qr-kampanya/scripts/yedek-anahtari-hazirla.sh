#!/usr/bin/env bash
# Yedek şifreleme anahtarını hazırlar (kurulum.sh ve guncelle.sh çağırır; tek başına da çalıştırılabilir).
#  - gizli/yedek-anahtari.txt (özel anahtar) YOKSA ve .env içinde YEDEK_ALICI da YOKSA: yeni anahtar çifti üretir.
#  - Var olan anahtar dosyasının ÜZERİNE ASLA yazmaz; .env'deki mevcut satırı DEĞİŞTİRMEZ.
#  - Açık anahtarı .env'nin SONUNA YEDEK_ALICI=age1... olarak yalnızca eksikse ekler.
#  - Özel anahtar yalnızca gizli/ klasöründe durur (700/600, Git'e eklenmez) ve yedek servisine VERİLMEZ.
#  - Yeni anahtar üretildiyse özel anahtar KALICI DİSKE YAZILMADAN önce yalnızca bellek dosya sisteminde (tmpfs: /dev/shm,
#    yoksa 700 izinli XDG_RUNTIME_DIR) üretilir: `docker run --log-driver none ... age-keygen -o` ile bind-mount edilmiş
#    tmpfs dizinine (stdout'a yazdırılmaz; Docker günlük sürücüsüne/journald'e düşmez). Anahtar ekranda (doğrudan /dev/tty'ye;
#    günlüğe/tee'ye düşmez) BİR KEZ gösterilir ve "parola yöneticime kopyaladım" onayı için EVET istenir, ardından
#    geri yapıştırma doğrulaması yapılır. Onay + eşleşme varsa anahtar kalıcı diske HİÇ yazılmadan tmpfs'ten silinir
#    (açık anahtar YEDEK_ALICI .env'de kalır). Onay yoksa / terminal yoksa / uyuşmazsa / Ctrl-C ya da hata olursa anahtar
#    gizli/yedek-anahtari.txt dosyasına (700 dizin, 600 dosya) taşınır ve büyük harfli uyarı basılır.
#    SIRA KURALI: .env'e YEDEK_ALICI ancak anahtar "güvende" olduktan sonra yazılır (ya kullanıcı onayladı, ya gizli/'e
#    kaydedildi); aksi hâlde yedekler şifrelenir ama anahtar kaybolurdu.
#  - Anahtar dosyası yoksa ve .env'de YEDEK_ALICI varsa YENİ ANAHTAR ÜRETİLMEZ (aksi halde eski yedekler açılamazdı).
#  - Daha sonra göstermek/silmek için:  bash scripts/yedek-anahtari-hazirla.sh --goster-ve-kaldir
#    (silmeden önce dosyadaki anahtarın açık anahtarı .env'deki YEDEK_ALICI ile aynı mı bakılır; değilse silinmez.)
# Gereksinim: yedek imajı derlenmiş olmalı (docker compose build yedek).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "HATA: .env yok; önce kurulum.sh çalıştırın."; exit 1; }
set -a; . ./.env; set +a   # UYGULAMA_SURUMU (imaj etiketi) için
. scripts/yedek-ortak.sh

ANAHTAR=gizli/yedek-anahtari.txt
MOD=""
case "${1:-}" in
  "") ;;
  --goster-ve-kaldir) MOD="goster" ;;
  *) echo "Bilinmeyen seçenek: $1 (kullanım: bash scripts/yedek-anahtari-hazirla.sh [--goster-ve-kaldir])"; exit 1 ;;
esac
ALICI_VAR=0
# Tırnaklı ("age1...") ve "export YEDEK_ALICI=..." biçimleri de tanınır: aksi hâlde anahtar kaldırılmışken yeni anahtar üretilirdi.
grep -qE "^[[:space:]]*(export[[:space:]]+)?YEDEK_ALICI=[\"']?age1" .env 2>/dev/null && ALICI_VAR=1

mkdir -p gizli && chmod 700 gizli

# --goster-ve-kaldir modunda anahtar ZATEN diskte olduğundan silme güvenceli değildir (yalnızca uyarı; otomatik işlem yok).
diskte_silme_uyarisi() {
  cat <<'UYARI'

------------------------------------------------------------------------------------
 DİKKAT: BU MODDA ANAHTAR ZATEN KALICI DİSKE YAZILMIŞTIR.
 `shred`/`rm`; SSD (aşınma dengeleme), ext4 günlüğü, btrfs/ZFS (yazarken kopyala, anlık görüntü),
 LVM anlık görüntüsü, RAID, yedeklenen disk/VM görüntüsü gibi katmanlarda eski kopyanın silindiğini
 GARANTİ ETMEZ; diskteki eski kopya kurtarılabilir olabilir.
 En güvenlisi: kurulumda EVET ile anahtarı hiç diske yazmamaktır (bu yol tmpfs kullanır).
 Seçenekler (bu betik bunları KENDİLİĞİNDEN YAPMAZ): disk/birim şifrelemesi kullanmak; ya da yeni anahtar çifti üretip
 eski yedekleri yeni anahtarla yeniden şifrelemek ve eski anahtarı güvenli kabul etmemek.
------------------------------------------------------------------------------------
UYARI
}

sunucuda_uyari() {
  cat <<'UYARI'

####################################################################################
 UYARI: ÖZEL ANAHTAR HÂLÂ SUNUCUDA (gizli/yedek-anahtari.txt)
 SUNUCU ELE GEÇİRİLİRSE YEDEKLER AÇILABİLİR.
 Anahtarı parola yöneticinize kopyaladıysanız dosyayı kaldırmak için:
     bash scripts/yedek-anahtari-hazirla.sh --goster-ve-kaldir
 (yedekleme açık anahtarla sürer; özel anahtar yalnızca geri yüklemede gerekir)
####################################################################################
UYARI
}

# Özel anahtarı ($1 = dosya) ekranda BİR KEZ gösterir (yalnızca /dev/tty; betiğin çıktısına/günlüğüne düşmez) ve EVET ile
# onay ister, ardından geri yapıştırma doğrulaması yapar. Sonucu KARAR değişkenine yazar:
#   onay | red (EVET dışı yanıt) | uyusmadi (yapıştırma uyuşmadı) | tty_yok. Dosyaya DOKUNMAZ; silme/taşıma çağıranındır.
KARAR="red"
anahtari_goster_ve_sor() {
  local dosya="$1" onay=""
  KARAR="red"
  if ! ortak_tty_var_mi; then
    echo "BİLGİ: etkileşimli terminal yok; anahtar gösterilmedi ve sunucudan silinmedi."
    KARAR="tty_yok"
    return 0
  fi
  exec 7<>/dev/tty
  ortak_stty_kaydet   # istemden ÖNCE kaydet
  {
    printf '\n====================================================================================\n'
    printf ' ÇOK ÖNEMLİ - YEDEK ANAHTARI (bu ekran anahtarı yalnızca BİR KEZ gösterir)\n'
    printf ' Aşağıdaki satırların TAMAMINI parola yöneticinize (Bitwarden, 1Password vb.) kopyalayın\n'
    printf ' ve sunucu dışında ikinci bir yerde de saklayın. Kaybolursa yedekleriniz ASLA açılamaz.\n'
    printf '====================================================================================\n'
    cat "$dosya"
    printf '====================================================================================\n'
    printf ' Kopyaladıktan sonra ekran geçmişini temizleyin (clear). tmux/screen kullanıyorsanız kaydırma geçmişi\n'
    printf ' anahtarı tutar: oturumun geçmişini de temizleyin (tmux: Ctrl-b :clear-history).\n'
    printf ' "EVET" yazarsanız özel anahtar SUNUCUDAN SİLİNİR (yedekleme açık anahtarla sürer;\n'
    printf ' özel anahtar yalnızca geri yükleme testinde ve geri yüklemede sorulur).\n'
    printf ' EVET sonrası anahtarı doğrulama için geri yapıştırmanız istenir; uyuşmazsa anahtar sunucuda kalır.\n'
    printf ' Başka bir şey yazarsanız anahtar sunucuda (gizli/ altında) kalır.\n'
    printf 'Anahtarı parola yöneticime kopyaladım, sunucudan silinsin (EVET): '
  } >&7
  IFS= read -r -u 7 onay || onay=""
  # Tek bir EVET ile geri dönüşsüz kayıp olmasın: silmeden önce kopyalanan anahtarın geri yapıştırılması
  # ve dosyadakiyle birebir aynı olması istenir (gizli giriş, ekrana yansımaz, hiçbir yere yazılmaz).
  local yapistirilan="" beklenen=""
  ortak_gizli_basla   # anahtar değeri değişkenlerde: xtrace/verbose kapalı (bash -x altında sızmasın)
  if [ "$onay" = "EVET" ]; then
    beklenen=$(grep -m1 -E '^AGE-SECRET-KEY-1[A-Z0-9]+$' "$dosya" || true)
    stty -echo <&7 2>/dev/null || true   # yankı, istem basılmadan ÖNCE kapatılır; INT/TERM'de ortak_yankiyi_ac geri açar
    printf '\nDoğrulama: parola yöneticisindeki AGE-SECRET-KEY-1... satırını buraya yapıştırın (görünmez): ' >&7
    IFS= read -r -s -u 7 yapistirilan || yapistirilan=""
    ortak_yankiyi_ac
    printf '\n' >&7
    yapistirilan="${yapistirilan//[[:space:]]/}"
    if [ -z "$beklenen" ] || [ "$yapistirilan" != "$beklenen" ]; then
      onay="UYUSMADI"
    fi
  fi
  yapistirilan=""; beklenen=""
  ortak_gizli_bitir
  exec 7>&- 7<&-
  case "$onay" in
    EVET)     KARAR="onay" ;;
    UYUSMADI) KARAR="uyusmadi"
              echo "Yapıştırılan anahtar sunucudakiyle UYUŞMADI; özel anahtar sunucuda KALDI." ;;
    *)        KARAR="red"
              echo "Onay verilmedi; özel anahtar sunucuda KALDI." ;;
  esac
}

# Dosyadaki özel anahtardan açık anahtarı türetir ($1 = göreli/mutlak dosya yolu); yalnızca açık anahtar yazdırır.
# --log-driver none: özel anahtar bir şekilde konteyner çıktısına düşse bile günlük sürücüsüne gitmez.
acik_anahtar_turet() {
  local yol="$1" m
  case "$yol" in /*) ;; *) yol="$(pwd)/$yol" ;; esac
  m=$(ortak_mount "$yol" /anahtar/yedek-anahtari.txt ro) || return 1
  docker run --rm --log-driver none --network none --cap-drop ALL --user "$(id -u):$(id -g)" --entrypoint age-keygen \
    --mount "$m" "$YEDEK_IMAJI" -y /anahtar/yedek-anahtari.txt
}

# Özel anahtarı (tmpfs) kalıcı olarak gizli/yedek-anahtari.txt'ye taşır (700 dizin, 600 dosya). Var olan dosyanın üzerine
# ASLA yazmaz (farklıysa zaman damgalı yeni ad). Çıkış tuzağından da çağrılır.
TMPD=""; TMP_ANAHTAR=""; ANAHTAR_KULLANICIDA=0; KALICI_YOL=""
# ANAHTAR_GOSTERILDI=0: anahtar henüz kullanıcıya gösterilmedi ve .env'e YEDEK_ALICI yazılmadı -> hiçbir yedek bu anahtarla
# şifrelenmedi; üretim sırasında kesilirse tmpfs dizini (anahtar dahil) SİLMEK güvenlidir. 1 olunca (gösterim başlayınca)
# sıra güvencesi geçerlidir: anahtar önce gizli/'e kaydedilir, kaydedilemezse tmpfs kopyası silinmez.
ANAHTAR_GOSTERILDI=0
anahtari_kalici_kaydet() {
  [ -n "$TMP_ANAHTAR" ] && [ -f "$TMP_ANAHTAR" ] || return 0
  local hedef="$ANAHTAR" gecici
  ( umask 077; mkdir -p gizli ) && chmod 700 gizli || return 1
  if [ -e "$hedef" ] || [ -L "$hedef" ]; then
    cmp -s "$TMP_ANAHTAR" "$hedef" && { KALICI_YOL="$hedef"; return 0; }
    hedef="gizli/yedek-anahtari-$(date +%Y%m%d-%H%M%S).txt"
  fi
  # ATOMİK ve ÜZERİNE YAZMAYAN kayıt: aynı dizinde 600 izinli geçici dosya (mktemp), içerik doğrulanır, sonra `ln` ile hedefe
  # bağlanır (hedef varsa ln BAŞARISIZ olur; yarış durumunda başkasının dosyası ezilmez). Hedef zaten varsa hata verilir ve
  # tmpfs kopyası SİLİNMEZ (çağıran silmez). Bağlantı desteklenmeyen dosya sisteminde `mv -n` yedek yoludur.
  gecici=$(umask 077; mktemp "gizli/.yedek-anahtari.XXXXXX") || return 1
  if ! { chmod 600 "$gecici" && cat -- "$TMP_ANAHTAR" > "$gecici" && cmp -s "$TMP_ANAHTAR" "$gecici"; }; then rm -f -- "$gecici"; return 1; fi
  if [ -e "$hedef" ] || [ -L "$hedef" ]; then rm -f -- "$gecici"; echo "HATA: $hedef zaten var; üzerine YAZILMADI." >&2; return 1; fi
  if ln -- "$gecici" "$hedef" 2>/dev/null; then
    rm -f -- "$gecici"
  elif [ ! -e "$hedef" ] && [ ! -L "$hedef" ]; then
    mv -n -- "$gecici" "$hedef" 2>/dev/null || true
    [ ! -e "$gecici" ] || { rm -f -- "$gecici"; return 1; }
  else
    rm -f -- "$gecici"; echo "HATA: $hedef aynı anda oluşturulmuş; üzerine YAZILMADI." >&2; return 1
  fi
  cmp -s "$TMP_ANAHTAR" "$hedef" || return 1
  chmod 600 "$hedef"
  KALICI_YOL="$hedef"
}
# Her çıkışta (hata, Ctrl-C, TERM, normal): tmpfs dosyası temizlenir AMA anahtar kaybolmaz: kullanıcı onay verip
# .env yazılmadıysa anahtar önce gizli/'e kaydedilir. Kaydedilemezse tmpfs kopyası SİLİNMEZ (tek kopya olabilir).
cikis_temizle() {
  local kod=$?
  trap - EXIT
  trap '' INT TERM HUP   # temizlik/kayıt sürerken ikinci sinyal işlemi yarıda kesmesin
  { exec 7>&- 7<&-; } 2>/dev/null || true
  ortak_yankiyi_ac
  if [ "$ANAHTAR_GOSTERILDI" = "0" ] && [ -n "$TMPD" ] && [ -d "$TMPD" ]; then
    # Üretim sırasında/öncesinde kesildi: anahtar gösterilmedi, .env yazılmadı -> üretim dizinini sil.
    case "$TMPD" in */qr-yedek-uretim.??????) shred -n 1 -u -- "$TMPD/anahtar.txt" 2>/dev/null || true; rm -rf -- "$TMPD" ;; esac
  elif [ -n "$TMP_ANAHTAR" ] && [ -f "$TMP_ANAHTAR" ]; then
    if [ "$ANAHTAR_KULLANICIDA" != "1" ]; then
      if anahtari_kalici_kaydet; then
        [ -n "$KALICI_YOL" ] && echo "BİLGİ: özel anahtar kaybolmaması için $KALICI_YOL dosyasına kaydedildi." >&2
      else
        echo "KRİTİK: özel anahtar gizli/ altına KAYDEDİLEMEDİ; bellekteki kopya SİLİNMEDİ: $TMP_ANAHTAR (hemen kopyalayın)." >&2
        exit 1
      fi
    fi
    shred -n 1 -u -- "$TMP_ANAHTAR" 2>/dev/null || true   # tmpfs'te shred yalnızca biçimsel; asıl önlem diske hiç yazmamak
    rm -f -- "$TMP_ANAHTAR"
  fi
  [ -n "$TMPD" ] && rmdir -- "$TMPD" 2>/dev/null || true
  exit "$kod"
}
trap cikis_temizle EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

if [ "$MOD" = "goster" ]; then
  [ -f "$ANAHTAR" ] || { echo "Sunucuda özel anahtar dosyası yok ($ANAHTAR); yapılacak bir şey yok."; exit 0; }
  ortak_imaj_var_mi
  # Silmeden önce: dosyadaki özel anahtarın açık anahtarı .env'deki YEDEK_ALICI ile aynı mı? Değilse bu anahtar mevcut
  # yedekleri AÇMAZ; silmek (ve parola yöneticisine bunu kaydetmek) yanlış olurdu.
  ACIK_DOSYA=$(acik_anahtar_turet "$ANAHTAR" 2>/dev/null || true)
  if ! [[ "$ACIK_DOSYA" =~ ^age1[a-z0-9]+$ ]]; then
    echo "UYARI: $ANAHTAR içindeki anahtardan açık anahtar türetilemedi; .env ile eşleştirilemedi. Anahtar SİLİNMEDİ."
    exit 1
  fi
  if [ "${YEDEK_ALICI:-}" != "$ACIK_DOSYA" ]; then
    echo "UYARI: $ANAHTAR dosyasındaki anahtar .env içindeki YEDEK_ALICI ile EŞLEŞMİYOR (veya YEDEK_ALICI tanımlı değil)."
    echo "       Bu anahtar mevcut yedekleri açmayabilir. Anahtar SİLİNMEDİ ve gösterilmedi; önce .env ve anahtar dosyasını kontrol edin."
    exit 1
  fi
  anahtari_goster_ve_sor "$ANAHTAR"
  case "$KARAR" in
    onay)
      diskte_silme_uyarisi
      shred -n 1 -u -- "$ANAHTAR" 2>/dev/null || true
      rm -f -- "$ANAHTAR"
      if [ -e "$ANAHTAR" ]; then
        echo "HATA: özel anahtar dosyası silinemedi: $ANAHTAR"
        sunucuda_uyari
      else
        echo "Özel anahtar dosyası sunucudan SİLİNDİ (kullanıcı onayıyla). Açık anahtar YEDEK_ALICI .env içinde kaldı; yedekleme etkilenmedi."
        echo "Geri yükleme testi ve geri yükleme sırasında anahtar sizden istenecek (parola yöneticisinden yapıştırırsınız)."
        echo "UYARI: dosya silindi ama diskteki eski kopya (SSD/günlük/anlık görüntü) kurtarılabilir olabilir; sunucu ele geçirilirse bunu varsayın."
        diskte_silme_uyarisi
      fi ;;
    uyusmadi)
      echo "Anahtarı yeniden kopyalayıp şu komutla tekrar deneyin: bash scripts/yedek-anahtari-hazirla.sh --goster-ve-kaldir"
      sunucuda_uyari ;;
    *) sunucuda_uyari ;;
  esac
  exit 0
fi

ortak_imaj_var_mi

env_sonuna_ekle() {
  { [ -z "$(tail -c1 .env)" ] || echo >> .env; echo "YEDEK_ALICI=$1" >> .env; } || return 1
  grep -qxF "YEDEK_ALICI=$1" .env || return 1
  echo ".env dosyasının SONUNA eklendi: YEDEK_ALICI (açık anahtar; gizli değildir). Diğer satırlar değiştirilmedi."
}

if [ -f "$ANAHTAR" ]; then
  chmod 600 "$ANAHTAR"
  echo "Özel anahtar dosyası zaten var; dokunulmadı: $ANAHTAR"
  sunucuda_uyari
  if [ "$ALICI_VAR" = "0" ]; then
    # Açık anahtar, mevcut özel anahtardan türetilir (özel anahtar ekrana yazılmaz).
    ACIK=$(acik_anahtar_turet "$ANAHTAR")
    [[ "$ACIK" =~ ^age1[a-z0-9]+$ ]] || { echo "HATA: açık anahtar üretilemedi."; exit 1; }
    env_sonuna_ekle "$ACIK" || { echo "HATA: .env güncellenemedi (anahtar $ANAHTAR içinde güvende)."; exit 1; }
  fi
  exit 0
fi

if [ "$ALICI_VAR" = "1" ]; then
  echo "BİLGİ: .env içinde YEDEK_ALICI var ama $ANAHTAR bu sunucuda yok. Bu güvenlidir ve beklenen durumdur"
  echo "       (özel anahtarı parola yöneticinizde tutuyorsunuz). Yeni anahtar ÜRETİLMEDİ."
  exit 0
fi

echo "Yedek şifreleme anahtarı üretiliyor (yalnızca bellek dosya sisteminde)..."
TMPFS=$(ortak_tmpfs_dizini) || { echo "HATA: bellek dosya sistemi (tmpfs) bulunamadı; özel anahtar kalıcı diske yazılmayacağı için işlem durduruldu."; exit 1; }
TMPD=$(umask 077; mktemp -d "$TMPFS/qr-yedek-uretim.XXXXXX")   # EXIT/INT/TERM/HUP tuzağı bunu hemen kapsar (aşağıda)
# Anahtar stdout'a YAZDIRILMAZ (docker günlük sürücüsü/journald'e düşerdi): konteyner onu bind-mount edilmiş tmpfs
# dizinine -o ile yazar; --log-driver none ile konteyner çıktısı hiçbir sürücüye gitmez.
# Bind-mount yolu ":" / "," içerse de bozulmaması için --mount kullanılır; yol güvenle ifade edilemezse anahtar ÜRETİLMEDEN durulur.
M_CIKTI=$(ortak_mount "$TMPD" /cikti) || { echo "HATA: tmpfs dizin yolu docker'a bağlanamıyor; anahtar üretilmedi (henüz bir şey kaybolmadı)."; exit 1; }
if ! URETIM_HATA=$(docker run --rm --log-driver none --network none --cap-drop ALL --security-opt no-new-privileges:true \
      --user "$(id -u):$(id -g)" --entrypoint age-keygen --mount "$M_CIKTI" "$YEDEK_IMAJI" -o /cikti/anahtar.txt 2>&1 >/dev/null); then
  echo "HATA: anahtar üretilemedi: ${URETIM_HATA:-bilinmeyen hata}"; exit 1
fi
TMP_ANAHTAR="$TMPD/anahtar.txt"
[ -f "$TMP_ANAHTAR" ] && chmod 600 "$TMP_ANAHTAR"
ACIK=$(acik_anahtar_turet "$TMP_ANAHTAR" 2>/dev/null || true)
if ! [[ "$ACIK" =~ ^age1[a-z0-9]+$ ]] || ! grep -q '^AGE-SECRET-KEY-' "$TMP_ANAHTAR"; then
  echo "HATA: anahtar üretilemedi."; exit 1
fi

ANAHTAR_GOSTERILDI=1
anahtari_goster_ve_sor "$TMP_ANAHTAR"
if [ "$KARAR" = "onay" ]; then
  # Kullanıcı anahtarı kendi kopyasına aldı ve doğruladı: .env önce yazılır; başarılıysa anahtar KALICI DİSKE HİÇ yazılmadan
  # tmpfs'ten silinir. .env yazılamazsa anahtar gizli/'e kaydedilir (çıkış tuzağı), yedek şifrelemesi başlamaz.
  env_sonuna_ekle "$ACIK" || { echo "HATA: .env güncellenemedi; anahtar kaybolmasın diye gizli/ altına kaydediliyor."; exit 1; }
  ANAHTAR_KULLANICIDA=1
  shred -n 1 -u -- "$TMP_ANAHTAR" 2>/dev/null || true
  rm -f -- "$TMP_ANAHTAR"
  echo "Özel anahtar bellekten SİLİNDİ (kullanıcı onayıyla); kalıcı diske HİÇ yazılmadı. Açık anahtar YEDEK_ALICI .env içinde kaldı; yedekleme etkilenmedi."
  echo "Geri yükleme testi ve geri yükleme sırasında anahtar sizden istenecek (parola yöneticisinden yapıştırırsınız)."
else
  # Onay yok / terminal yok / uyuşmazlık: önce anahtarı güvenceye al (gizli/), SONRA .env'e yaz.
  anahtari_kalici_kaydet || { echo "KRİTİK: özel anahtar gizli/ altına kaydedilemedi; .env DEĞİŞTİRİLMEDİ."; exit 1; }
  env_sonuna_ekle "$ACIK" || { echo "HATA: .env güncellenemedi (anahtar $KALICI_YOL içinde güvende)."; exit 1; }
  sunucuda_uyari
fi
