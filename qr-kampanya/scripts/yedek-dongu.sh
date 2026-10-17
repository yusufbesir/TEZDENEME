#!/bin/sh
# Yedek servisi: her gün YEDEK_SAATI'nde (İstanbul saati) yedek alır.
# "yedek" konteynerinin içinde çalışır. Elle tek seferlik yedek için:
#   docker compose exec yedek sh /betikler/yedek-al.sh
set -eu
SAAT="${YEDEK_SAATI:-03:15}"
echo "Yedek servisi başladı. Günlük yedek saati: $SAAT"
while true; do
  simdi=$(date +%s)
  hedef=$(date -d "$(date +%Y-%m-%d) $SAAT" +%s 2>/dev/null || date -D "%Y-%m-%d %H:%M" -d "$(date +%Y-%m-%d) $SAAT" +%s)
  [ "$hedef" -le "$simdi" ] && hedef=$((hedef + 86400))
  bekle=$((hedef - simdi))
  echo "Sonraki yedek $bekle saniye sonra."
  sleep "$bekle"
  sh /betikler/yedek-al.sh || echo "UYARI: yedek başarısız (ayrıntı son-durum.json)"
  # KVKK: saklama süresi dolan anonim tarama kayıtlarını temizle (yedek alındıktan sonra).
  psql -d "$POSTGRES_DB" -U "$POSTGRES_USER" -v ON_ERROR_STOP=1 -q \
    -c "DELETE FROM qr_tarama WHERE zaman < now() - interval '${TARAMA_SAKLAMA_GUN:-730} days';" \
    || echo "UYARI: eski tarama kayıtları temizlenemedi"
  # Süresi dolmuş giriş deneme sayaçlarını temizle (uygulamadaki olasılıksal temizlik yalnızca yedektir).
  psql -d "$POSTGRES_DB" -U "$POSTGRES_USER" -v ON_ERROR_STOP=1 -q \
    -c "DELETE FROM qr_denemesayaci WHERE bitis < now();" \
    || echo "UYARI: süresi dolmuş deneme sayaçları temizlenemedi"
done
