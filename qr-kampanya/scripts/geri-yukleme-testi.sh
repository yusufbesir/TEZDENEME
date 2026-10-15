#!/usr/bin/env bash
# Yedeğin gerçekten geri yüklenebildiğini GÜVENLİ biçimde test eder:
# en son yedeği GEÇİCİ bir PostgreSQL konteynerine yükler, tablo satır sayılarını
# canlı veritabanıyla karşılaştırır, sonra geçici konteyneri kaldırır.
# Canlı veritabanına HİÇBİR değişiklik yapmaz.
#   bash scripts/geri-yukleme-testi.sh [yedek-dosyası]
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
YEDEK="${1:-$(ls -1t ${YEDEK_DIZINI:-./yedekler}/db-*.dump 2>/dev/null | head -1)}"
[ -n "$YEDEK" ] && [ -f "$YEDEK" ] || { echo "Yedek dosyası bulunamadı."; exit 1; }
GECICI=qr-geri-yukleme-testi-$$
GECICI_PAROLA=$(python3 -c "import secrets;print(secrets.token_hex(16))")
temizle() { docker rm -f "$GECICI" >/dev/null 2>&1 || true; }
trap temizle EXIT

echo "Test edilen yedek: $YEDEK"
docker run -d --name "$GECICI" --network none -e POSTGRES_PASSWORD="$GECICI_PAROLA" -e POSTGRES_USER=test -e POSTGRES_DB=test postgres:17.6-alpine >/dev/null
for i in $(seq 1 30); do docker exec "$GECICI" pg_isready -U test -d test >/dev/null 2>&1 && break; sleep 1; done
sleep 2
docker cp "$YEDEK" "$GECICI:/tmp/yedek.dump"
docker exec "$GECICI" pg_restore --no-owner -U test -d test /tmp/yedek.dump

SORGU="SELECT 'qrkod', count(*) FROM qr_qrkod UNION ALL SELECT 'kampanya', count(*) FROM qr_kampanya UNION ALL SELECT 'sayfa', count(*) FROM qr_kampanyasayfasi UNION ALL SELECT 'hedefgecmisi', count(*) FROM qr_hedefgecmisi UNION ALL SELECT 'denetim', count(*) FROM qr_denetimkaydi UNION ALL SELECT 'kullanici', count(*) FROM auth_user ORDER BY 1;"
YEDEKTEKI=$(docker exec "$GECICI" psql -U test -d test -At -c "$SORGU")
CANLI=$(docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "$SORGU")
echo "Tablo | yedekte | canlıda"
paste -d'|' <(echo "$YEDEKTEKI") <(echo "$CANLI" | cut -d'|' -f2)
if [ "$YEDEKTEKI" = "$CANLI" ]; then
  echo "SONUÇ: GEÇTİ - yedek geri yüklendi, sayılar canlı veriyle aynı."
else
  echo "SONUÇ: FARK VAR - yedek alındıktan sonra yeni kayıt eklenmiş olabilir; yedek yine de geri yüklenebildi."
fi
