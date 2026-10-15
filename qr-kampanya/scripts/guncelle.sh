#!/usr/bin/env bash
# Güncelleme: önce yedek alır, sonra yeni kodu derleyip servisleri yeniden başlatır.
# Veriler Docker birimlerinde (volume) durduğu için kaybolmaz.
#   bash scripts/guncelle.sh
set -euo pipefail
cd "$(dirname "$0")/.."
echo "1/4 Güncelleme öncesi yedek alınıyor..."
docker compose exec -T yedek sh /betikler/yedek-al.sh
echo "2/4 Yeni imajlar derleniyor..."
docker compose pull db caddy yedek
docker compose build app
echo "3/4 Servisler yeniden başlatılıyor (migrasyonlar otomatik uygulanır)..."
docker compose up -d
echo "4/4 Sağlık kontrolü..."
for i in $(seq 1 60); do
  if docker compose ps app --format '{{.Health}}' | grep -q healthy; then echo "Uygulama sağlıklı."; exit 0; fi
  sleep 2
done
echo "UYARI: uygulama 2 dakikada sağlıklı duruma geçmedi. Günlükler: docker compose logs app --tail 100"; exit 1
