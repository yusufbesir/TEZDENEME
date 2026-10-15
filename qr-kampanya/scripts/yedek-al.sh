#!/bin/sh
# Tek seferlik yedek: veritabanı (pg_dump özel biçim) + yüklenen görseller. İKİSİ DE ŞİFRELİ yazılır (age).
#   db-ZAMAN.dump.age, medya-ZAMAN.tar.gz.age, sha256-ZAMAN.txt (şifreli dosyaların özetleri)
# Düz (şifresiz) döküm yalnızca bu konteynerin bellek tmpfs'i olan /tmp içinde bulunur ve iş bitince silinir;
# /yedekler içine ASLA düz yedek yazılmaz. YEDEK_ALICI (açık anahtar) yoksa veya şifreleme başarısızsa durum "hata"dır.
# Özel anahtar bu konteynerde YOKTUR; yedekleri yalnızca anahtarın sahibi açabilir.
# BU BETİK HİÇBİR ESKİ YEDEĞİ SİLMEZ. Silme kuralı yalnızca scripts/disari-kopyala.sh içindedir
# (sunucu dışı kopya doğrulanmadan yerel yedek silinmez).
# Sonucu /yedek-durum/son-durum.json'a yazar (panel gösterir) ve /yedekler/yedek-gunlugu.log'a ekler.
set -u
ZAMAN=$(date +%Y%m%d-%H%M%S)
HEDEF=/yedekler
DURUM=/yedek-durum/son-durum.json
GUNLUK="$HEDEF/yedek-gunlugu.log"
UZAK_DOGRULAMA="$HEDEF/uzak-dogrulama.json"
GECICI=/tmp
DB_DUZ="$GECICI/db-$ZAMAN.dump"
DB_SIFRELI="$HEDEF/db-$ZAMAN.dump.age"
MEDYA_SIFRELI="$HEDEF/medya-$ZAMAN.tar.gz.age"
umask 077
mkdir -p "$HEDEF"

temizle() { rm -f "$DB_DUZ" "$DB_SIFRELI.tmp" "$MEDYA_SIFRELI.tmp"; }
trap temizle EXIT
# SIGTERM/SIGINT/SIGHUP'ta da (docker stop, Ctrl+C) düz geçici döküm silinir; sonra normal EXIT tuzağı çalışır.
trap 'exit 143' TERM
trap 'exit 130' INT HUP

# JSON için metin değeri: boşsa null, doluysa tırnaklı.
json_metin() { if [ -n "$1" ]; then printf '"%s"' "$1"; else printf 'null'; fi; }

durum_yaz() { # $1=durum $2=mesaj
  boyut=$(stat -c %s "$DB_SIFRELI" 2>/dev/null || echo 0)
  sayi=$(ls -1 "$HEDEF"/db-*.dump.age 2>/dev/null | wc -l | tr -d ' ')
  en_eski=$(ls -1 "$HEDEF"/db-*.dump.age 2>/dev/null | sort | head -1 | xargs -r basename 2>/dev/null \
    | sed -n 's/^db-\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)-.*/\1-\2-\3/p')
  uzak=""
  [ -f "$UZAK_DOGRULAMA" ] && uzak=$(sed -n 's/^ *"zaman": *"\([^"]*\)".*/\1/p' "$UZAK_DOGRULAMA" | head -1)
  printf '{"zaman": "%s", "durum": "%s", "dosya": "%s", "boyut": %s, "mesaj": "%s", "yerel_yedek_sayisi": %s, "en_eski_yerel_yedek": %s, "uzak_dogrulama_zamani": %s}\n' \
    "$(date -Iseconds)" "$1" "$(basename "$DB_SIFRELI")" "${boyut:-0}" "$2" "${sayi:-0}" \
    "$(json_metin "$en_eski")" "$(json_metin "$uzak")" > "$DURUM.tmp" \
    && chmod 644 "$DURUM.tmp" && mv "$DURUM.tmp" "$DURUM"
  echo "$(date -Iseconds) $1 $(basename "$DB_SIFRELI") $2" >> "$GUNLUK"
}

hata() { temizle; durum_yaz hata "$1"; echo "HATA: $1" >&2; exit 1; }

# age çıktısı gerçekten age biçiminde mi (başlık satırı) ve boş değil mi?
age_dosyasi_mi() { [ -s "$1" ] && [ "$(head -c 21 "$1")" = "age-encryption.org/v1" ]; }

case "${YEDEK_ALICI:-}" in
  age1*) ;;
  *) hata "YEDEK_ALICI tanımlı değil; düz yedek yazılmaz (kurulum.sh anahtar üretir, docs/YEDEKLEME.md)" ;;
esac
command -v age >/dev/null 2>&1 || hata "age kurulu değil; düz yedek yazılmaz"

# 1) Veritabanı: düz döküm yalnızca tmpfs'te, okunabilirliği doğrula, sonra şifrele.
pg_dump -Fc --no-owner -d "$POSTGRES_DB" -U "$POSTGRES_USER" -f "$DB_DUZ" || hata "pg_dump başarısız"
pg_restore --list "$DB_DUZ" > /dev/null || hata "yedek dosyası doğrulanamadı"
age -r "$YEDEK_ALICI" -o "$DB_SIFRELI.tmp" "$DB_DUZ" || hata "veritabanı yedeği şifrelenemedi"
rm -f "$DB_DUZ"
age_dosyasi_mi "$DB_SIFRELI.tmp" || hata "şifreli veritabanı yedeği doğrulanamadı"
mv "$DB_SIFRELI.tmp" "$DB_SIFRELI"

# 2) Görseller: tar çıktısı doğrudan age'e akar; düz arşiv hiçbir yere yazılmaz.
[ -d /veri/medya ] || hata "görsel dizini (/veri/medya) bulunamadı"
# pipefail: tar hata verirse eksik arşiv "başarılı" sayılmaz.
( set -o pipefail; tar -czf - -C /veri medya | age -r "$YEDEK_ALICI" -o "$MEDYA_SIFRELI.tmp" ) || hata "görsel yedeği başarısız"
age_dosyasi_mi "$MEDYA_SIFRELI.tmp" || hata "şifreli görsel yedeği doğrulanamadı"
mv "$MEDYA_SIFRELI.tmp" "$MEDYA_SIFRELI"

# 3) Şifreli dosyaların özetleri.
( cd "$HEDEF" && sha256sum "db-$ZAMAN.dump.age" "medya-$ZAMAN.tar.gz.age" > "sha256-$ZAMAN.txt" ) || hata "sha256 dosyası yazılamadı"

durum_yaz basarili "yedek alındı, şifrelendi ve doğrulandı"
echo "Yedek tamam (şifreli): $DB_SIFRELI"
