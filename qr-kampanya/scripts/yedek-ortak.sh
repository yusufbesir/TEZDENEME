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
# $1 = anahtar (mutlak yol), $2 = yedek dizini (mutlak yol), $3 = dosya adı
ortak_coz() {
  ortak_ad_gecerli_mi "$3" || { echo "HATA: geçersiz yedek dosya adı reddedildi." >&2; return 1; }
  docker run --rm --network none --cap-drop ALL --security-opt no-new-privileges:true \
    -v "$1":/anahtar/yedek-anahtari.txt:ro -v "$2":/yedekler:ro \
    --entrypoint age "$YEDEK_IMAJI" -d -i /anahtar/yedek-anahtari.txt "/yedekler/$3"
}
