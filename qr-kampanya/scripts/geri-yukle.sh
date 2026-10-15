#!/usr/bin/env bash
# DİKKAT: YIKICI İŞLEM. Canlı veritabanını seçilen yedekle DEĞİŞTİRİR.
# Yedek tarihinden sonra yapılan bütün değişiklikler kaybolur.
# Önce scripts/geri-yukleme-testi.sh ile yedeği test edin.
#   bash scripts/geri-yukle.sh yedekler/db-YYYYMMDD-HHMMSS.dump
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
YEDEK="${1:?Kullanım: bash scripts/geri-yukle.sh <yedek-dosyası>}"
[ -f "$YEDEK" ] || { echo "Dosya yok: $YEDEK"; exit 1; }
echo "Canlı veritabanı '$YEDEK' ile DEĞİŞTİRİLECEK. Bu işlem geri alınamaz."
read -rp "Devam etmek için büyük harflerle EVET yazın: " ONAY
[ "$ONAY" = "EVET" ] || { echo "İptal edildi."; exit 1; }
echo "Güvenlik için önce mevcut durumun yedeği alınıyor..."
docker compose exec -T yedek sh /betikler/yedek-al.sh
docker compose stop app caddy
docker compose cp "$YEDEK" db:/tmp/geri.dump
docker compose exec -T db pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/geri.dump
docker compose exec -T db rm -f /tmp/geri.dump
docker compose start app caddy
echo "Geri yükleme tamamlandı. Görselleri de geri yüklemek için: docs/YEDEKLEME.md"
