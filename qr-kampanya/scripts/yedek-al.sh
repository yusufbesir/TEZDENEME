#!/bin/sh
# Tek seferlik yedek: veritabanı (pg_dump özel biçim) + yüklenen görseller.
# Sonucu /yedek-durum/son-durum.json'a yazar (panel bunu gösterir) ve
# /yedekler/yedek-gunlugu.log'a ekler. YEDEK_SAKLAMA_GUN'den eski yedekleri temizler.
set -u
ZAMAN=$(date +%Y%m%d-%H%M%S)
HEDEF=/yedekler
DURUM=/yedek-durum/son-durum.json
GUNLUK="$HEDEF/yedek-gunlugu.log"
DB_DOSYA="$HEDEF/db-$ZAMAN.dump"
MEDYA_DOSYA="$HEDEF/medya-$ZAMAN.tar.gz"
umask 077
mkdir -p "$HEDEF"

durum_yaz() { # $1=durum $2=mesaj
  boyut=$(stat -c %s "$DB_DOSYA" 2>/dev/null || echo 0)
  printf '{"zaman": "%s", "durum": "%s", "dosya": "%s", "boyut": %s, "mesaj": "%s"}\n' \
    "$(date -Iseconds)" "$1" "$(basename "$DB_DOSYA")" "${boyut:-0}" "$2" > "$DURUM.tmp" && chmod 644 "$DURUM.tmp" && mv "$DURUM.tmp" "$DURUM"
  echo "$(date -Iseconds) $1 $(basename "$DB_DOSYA") $2" >> "$GUNLUK"
}

if ! pg_dump -Fc --no-owner -d "$POSTGRES_DB" -U "$POSTGRES_USER" -f "$DB_DOSYA.tmp"; then
  rm -f "$DB_DOSYA.tmp"; durum_yaz hata "pg_dump başarısız"; exit 1
fi
# Yedeğin okunabildiğini doğrula
if ! pg_restore --list "$DB_DOSYA.tmp" > /dev/null; then
  rm -f "$DB_DOSYA.tmp"; durum_yaz hata "yedek dosyası doğrulanamadı"; exit 1
fi
mv "$DB_DOSYA.tmp" "$DB_DOSYA"
if [ -d /veri/medya ]; then
  tar -czf "$MEDYA_DOSYA" -C /veri medya || { durum_yaz hata "görsel yedeği başarısız"; exit 1; }
fi
( cd "$HEDEF" && sha256sum "$(basename "$DB_DOSYA")" $( [ -f "$MEDYA_DOSYA" ] && basename "$MEDYA_DOSYA") > "sha256-$ZAMAN.txt" )

# Saklama politikası: YEDEK_SAKLAMA_GUN günden eski yedek dosyaları kaldırılır.
find "$HEDEF" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'medya-*.tar.gz' -o -name 'sha256-*.txt' \) \
  -mtime +"${YEDEK_SAKLAMA_GUN:-14}" -exec rm -f {} \;

durum_yaz basarili "yedek alındı ve doğrulandı"
echo "Yedek tamam: $DB_DOSYA"
