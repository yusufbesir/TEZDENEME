#!/usr/bin/env bash
# Yedeklerin sunucu DIŞINA kopyalanması (en az bir kopya ana sunucu dışında olmalı).
# rclone ile çalışır (Backblaze B2, Hetzner Storage Box, Google Drive, S3 vb. desteklenir).
# Kurulum: docs/YEDEKLEME.md  ·  Sunucuda cron örneği:
#   30 4 * * * cd /opt/qr-kampanya && bash scripts/disari-kopyala.sh >> yedekler/disari-kopya.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
HEDEF="${YEDEK_UZAK_HEDEF:?YEDEK_UZAK_HEDEF .env içinde tanımlı değil (örn. b2:firma-qr-yedek)}"
command -v rclone >/dev/null || { echo "rclone kurulu değil: sudo apt install rclone"; exit 1; }
# copy: uzak taraftaki eski yedekleri SİLMEZ; uzak saklama süresini sağlayıcıda yaşam döngüsü kuralıyla ayarlayın.
rclone copy "${YEDEK_DIZINI:-./yedekler}" "$HEDEF" --include 'db-*.dump' --include 'medya-*.tar.gz' --include 'sha256-*.txt'
echo "$(date -Iseconds) dışarı kopyalama tamam → $HEDEF"
