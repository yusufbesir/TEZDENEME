# Ortak yardımcılar (geri-yukle.sh ve geri-yukleme-testi.sh tarafından "source" edilir; tek başına çalıştırılmaz).
# Özel anahtarın içeriği hiçbir zaman ekrana, günlüğe veya komut satırına yazılmaz; yalnızca dosya yolu kullanılır.

YEDEK_IMAJI="${YEDEK_IMAJI:-qr-kampanya-yedek:${UYGULAMA_SURUMU:-yerel}}"

# Yedek dosya adları KATI doğrulanır (komut enjeksiyonu/yol gezintisi olmasın). Kabul edilen adlar:
#   db-YYYYMMDD-HHMMSS.dump.age, medya-YYYYMMDD-HHMMSS.tar.gz.age, sha256-YYYYMMDD-HHMMSS.txt
# (eski sürümlerden kalan şifresiz db-ZAMAN.dump / medya-ZAMAN.tar.gz yalnızca ortak_eski_ad_gecerli_mi ile).
# Ad hiçbir zaman kabuk metnine gömülmez; konum argümanı olarak geçirilir. Yeni satır içeren adlar da reddedilir.
ORTAK_AD_RE='^(db-[0-9]{8}-[0-9]{6}\.dump\.age|medya-[0-9]{8}-[0-9]{6}\.tar\.gz\.age|sha256-[0-9]{8}-[0-9]{6}\.txt)$'
ORTAK_ESKI_AD_RE='^(db-[0-9]{8}-[0-9]{6}\.dump|medya-[0-9]{8}-[0-9]{6}\.tar\.gz)$'
ortak_ad_gecerli_mi() { [[ "$1" =~ $ORTAK_AD_RE ]]; }
ortak_eski_ad_gecerli_mi() { [[ "$1" =~ $ORTAK_ESKI_AD_RE ]]; }

# Dosya adından ZAMAN (YYYYMMDD-HHMMSS) çıkarır; geçersiz adda boş döner.
ortak_zaman() {
  local re='^(db|medya|sha256)-([0-9]{8}-[0-9]{6})\.(dump\.age|dump|tar\.gz\.age|tar\.gz|txt)$'
  if [[ "$1" =~ $re ]]; then printf '%s' "${BASH_REMATCH[2]}"; fi
  return 0
}

# Yedek imajı yoksa anlaşılır hata verir.
ortak_imaj_var_mi() {
  docker image inspect "$YEDEK_IMAJI" >/dev/null 2>&1 \
    || { echo "HATA: yedek imajı bulunamadı ($YEDEK_IMAJI). Önce çalıştırın: docker compose build yedek"; return 1; }
}

# Özel anahtar dosyasını mutlak yola çevirir ve varlığını denetler. $1 = yol
ortak_anahtar_yolu() {
  local yol="$1"
  [ -f "$yol" ] || { echo "HATA: özel anahtar dosyası bulunamadı: $yol" >&2
                     echo "Anahtarı parola yöneticinizdeki kopyadan geri koyun veya YEDEK_ANAHTAR_DOSYASI ile yolu verin." >&2; return 1; }
  ( cd "$(dirname "$yol")" && printf '%s/%s\n' "$(pwd)" "$(basename "$yol")" )
}

# sha256-ZAMAN.txt ile şifreli dosyaların bütünlüğünü doğrular. $1 = dizin, $2... = dosya adları.
# Uyuşmazsa veya satır/dosya yoksa 1 döner (çağıran durmalıdır).
ortak_sha256_dogrula() {
  local dizin="$1"; shift
  local z sha f satir
  for f in "$@"; do
    ortak_ad_gecerli_mi "$f" || ortak_eski_ad_gecerli_mi "$f" || { echo "HATA: geçersiz yedek dosya adı reddedildi."; return 1; }
  done
  z=$(ortak_zaman "$1")
  [ -n "$z" ] || { echo "HATA: dosya adından ZAMAN çıkarılamadı: $1"; return 1; }
  sha="$dizin/sha256-$z.txt"
  [ -f "$sha" ] || { echo "HATA: $sha bulunamadı; bütünlük doğrulanamıyor, durduruldu."; return 1; }
  for f in "$@"; do
    [ -f "$dizin/$f" ] || { echo "HATA: dosya yok: $dizin/$f"; return 1; }
    satir=$(awk -v f="$f" '$2==f || $2=="*" f' "$sha")
    [ -n "$satir" ] || { echo "HATA: $sha içinde $f için özet satırı yok; durduruldu."; return 1; }
    if ( cd "$dizin" && printf '%s\n' "$satir" | sha256sum -c - ); then :; else
      echo "HATA: sha256 UYUŞMUYOR: $f (dosya bozulmuş veya değiştirilmiş). Bu yedek KULLANILMAYACAK."
      return 1
    fi
  done
}

# Yedek imajıyla bir dosyayı çözer ve standart çıktıya yazar (ağsız, anahtar ve yedek salt okunur).
# --log-driver none: düz döküm/medya konteynerin stdout'undan akar; yoksa Docker günlük sürücüsüne (json-file/journald,
# kalıcı disk) yazılırdı.
# $1 = anahtar (mutlak yol), $2 = yedek dizini (mutlak yol), $3 = dosya adı
ortak_coz() {
  ortak_ad_gecerli_mi "$3" || { echo "HATA: geçersiz yedek dosya adı reddedildi." >&2; return 1; }
  docker run --rm --log-driver none --network none --cap-drop ALL --security-opt no-new-privileges:true \
    -v "$1":/anahtar/yedek-anahtari.txt:ro -v "$2":/yedekler:ro \
    --entrypoint age "$YEDEK_IMAJI" -d -i /anahtar/yedek-anahtari.txt "/yedekler/$3"
}

# ---------------------------------------------------------------------------------------------------------
# Özel anahtar yönetimi (anahtar sunucudan kaldırılmış olabilir).
# Özel anahtarın içeriği ekrana, günlüğe, komut satırına veya ortam değişkenine yazılmaz.
# ---------------------------------------------------------------------------------------------------------

# Etkileşimli bir terminal (/dev/tty) var mı? (cron, ssh -T, boru hattı vb. durumlarda yoktur)
ortak_tty_var_mi() { ( : </dev/tty ) 2>/dev/null && ( : >/dev/tty ) 2>/dev/null; }

# Geçici anahtar dosyası (varsa) siler. Her çıkışta çağrılmalıdır (betiklerin EXIT tuzağından).
ORTAK_GECICI=""
ortak_gecici_temizle() {
  if [ -n "${ORTAK_GECICI:-}" ]; then rm -f -- "$ORTAK_GECICI" 2>/dev/null || true; ORTAK_GECICI=""; fi
  return 0
}
# Gizli giriş (read -s) sırasında INT/TERM/HUP gelirse terminal yankısı kapalı kalmasın: giriş öncesi terminal durumu
# (stty -g) kaydedilir, tuzaklar ve normal dönüş bunu geri yükler (kayıt yoksa en azından `stty echo`).
ORTAK_STTY=""
ortak_stty_kaydet() { ORTAK_STTY=$(stty -g </dev/tty 2>/dev/null || true); }
ortak_yankiyi_ac() {
  if ortak_tty_var_mi; then
    if [ -n "${ORTAK_STTY:-}" ]; then stty "$ORTAK_STTY" </dev/tty 2>/dev/null || stty echo </dev/tty 2>/dev/null || true
    else stty echo </dev/tty 2>/dev/null || true; fi
  fi
  return 0
}
# Ctrl-C / kapatma durumlarında da geçici dosya silinsin ve terminal yankısı açılsın.
ortak_sinyal_tuzagi() {
  trap 'ortak_gecici_temizle; ortak_yankiyi_ac; exit 130' INT
  trap 'ortak_gecici_temizle; ortak_yankiyi_ac; exit 143' TERM
  trap 'ortak_gecici_temizle; ortak_yankiyi_ac; exit 129' HUP
}

# Bellek dosya sistemi (tmpfs/ramfs) dizini: /dev/shm, yoksa XDG_RUNTIME_DIR. XDG_RUNTIME_DIR yalnızca sahibi geçerli
# kullanıcıysa ve izni 700 ise kullanılır (başkasının yazabildiği/okuyabildiği dizine anahtar konmaz). Bulunamazsa 1 döner.
ortak_tmpfs_uygun_mu() {   # $1 = dizin, $2 = 1 ise XDG kuralı (sahibi geçerli kullanıcı + izin 700) uygulanır
  local d="$1" xdg="${2:-0}" tur
  [ -n "$d" ] && [ -d "$d" ] && [ -w "$d" ] || return 1
  if [ "$xdg" = "1" ]; then
    [ "$(stat -c %u "$d" 2>/dev/null || true)" = "$(id -u)" ] && [ "$(stat -c %a "$d" 2>/dev/null || true)" = "700" ] || return 1
  fi
  tur=$(stat -f -c %T "$d" 2>/dev/null || true)
  case "$tur" in tmpfs|ramfs) return 0 ;; esac
  return 1
}
ortak_tmpfs_dizini() {
  if ortak_tmpfs_uygun_mu /dev/shm 0; then printf '%s' /dev/shm; return 0; fi
  if ortak_tmpfs_uygun_mu "${XDG_RUNTIME_DIR:-}" 1; then printf '%s' "$XDG_RUNTIME_DIR"; return 0; fi
  return 1
}

# Özel anahtarı terminalden gizli girişle alır ve YALNIZCA bellek dosya sisteminde (tmpfs) 600 izinli geçici
# dosyaya yazar; ANAHTAR değişkenine mutlak yolu koyar. Diske kalıcı yazılmaz.
ortak_anahtar_iste() {
  ortak_tty_var_mi || { echo "HATA: özel anahtar sunucuda yok ve etkileşimli terminal de yok; anahtar sorulamaz." >&2
                        echo "Anahtarı SSH ile terminalden (ssh -t) çalıştırın veya --anahtar DOSYA / YEDEK_ANAHTAR_DOSYASI verin." >&2; return 1; }
  local dizin=""
  dizin=$(ortak_tmpfs_dizini) || dizin=""
  [ -n "$dizin" ] || { echo "HATA: bellek dosya sistemi (tmpfs) bulunamadı; anahtar diske yazılmayacağı için işlem durduruldu." >&2; return 1; }
  ORTAK_GECICI=$(umask 077; mktemp "$dizin/qr-yedek-anahtari.XXXXXX") || return 1
  ortak_sinyal_tuzagi
  chmod 600 "$ORTAK_GECICI"
  local satir bulundu=0 n=0
  exec 8<>/dev/tty
  ortak_stty_kaydet
  stty -echo <&8 2>/dev/null || true   # yankı, istem basılmadan ÖNCE kapatılır (hızlı yapıştırma yankılanmasın)
  printf '\nÖzel yedek anahtarını parola yöneticinizden yapıştırıp Enter tuşuna basın.\nYazdıklarınız ekranda GÖRÜNMEZ ve diske yazılmaz (yalnızca bellekte tutulur, iş bitince silinir).\nYalnızca "AGE-SECRET-KEY-1..." ile başlayan satır yeterlidir; "#" ile başlayan satırlar yok sayılır.\nAnahtar: ' >&8
  while [ "$n" -lt 20 ] && IFS= read -rs -u 8 satir; do
    n=$((n + 1))
    satir="${satir%$'\r'}"
    case "$satir" in ''|'#'*) continue ;; esac
    if [[ "$satir" =~ ^AGE-SECRET-KEY-1[A-Z0-9]+$ ]]; then printf '%s\n' "$satir" > "$ORTAK_GECICI"; bulundu=1; break; fi
    printf '\nUYARI: bu satır geçerli bir özel anahtara benzemiyor, atlandı.\nAnahtar: ' >&8
  done
  ortak_yankiyi_ac
  printf '\n' >&8
  exec 8>&- 8<&-
  satir=""
  [ "$bulundu" = "1" ] || { ortak_gecici_temizle; echo "HATA: geçerli bir özel anahtar girilmedi." >&2; return 1; }
  ANAHTAR="$ORTAK_GECICI"
}

# Özel anahtarın dosya yolunu ANAHTAR değişkenine koyar. $1 = açıkça verilen yol (boş olabilir).
#  1) açık yol (--anahtar / YEDEK_ANAHTAR_DOSYASI) verildiyse yalnızca o kullanılır (yoksa hata)
#  2) ./gizli/yedek-anahtari.txt varsa o kullanılır
#  3) yoksa (anahtar sunucudan kaldırılmıştır) gizli girişle istenir ve bellekte tutulur
# Not: $( ) içinde ÇAĞRILMAMALIDIR (geçici dosya yolu üst kabuğa ulaşmalı ki temizlenebilsin).
ortak_anahtar_al() {
  local yol="${1:-}"
  ANAHTAR=""
  if [ -n "$yol" ]; then ANAHTAR=$(ortak_anahtar_yolu "$yol") || return 1; return 0; fi
  if [ -f ./gizli/yedek-anahtari.txt ]; then ANAHTAR=$(ortak_anahtar_yolu ./gizli/yedek-anahtari.txt) || return 1; return 0; fi
  echo "Özel anahtar dosyası bu sunucuda yok (beklenen durum: anahtar parola yöneticinizde)."
  ortak_anahtar_iste
}
