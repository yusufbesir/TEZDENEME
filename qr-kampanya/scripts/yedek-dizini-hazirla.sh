#!/usr/bin/env bash
# Yedek dizininin (YEDEK_DIZINI, varsayılan ./yedekler) ve yedek-durum biriminin sahipliğini yedek servisinin
# (root olmayan) kullanıcısına, UID:GID 10002:10002, devreder. kurulum.sh ve guncelle.sh çağırır; tekrar çalıştırmak güvenlidir.
#
# Neden: yedek servisi artık root değildir. Eski kurulumlarda yedekler/ dizini ve içindeki dosyalar root'a aittir;
# sahiplik devredilmezse servis yeni yedek yazamaz. Hiçbir dosya SİLİNMEZ, içerik değişmez; yalnızca sahip değişir
# (chown -R -h: sembolik bağlantılar izlenmez) ve dizin 700 yapılır. Başka dizine/birime dokunulmaz.
#
# Tek seferlik, geçici bir konteyner (--rm) yalnızca bu iş için root olarak ve yalnızca CHOWN/DAC_OVERRIDE/FOWNER
# yetkileriyle çalışır; servisin kendisi root olmadan ve tüm yetkiler kapalı (cap_drop: ALL) çalışmaya devam eder.
#   bash scripts/yedek-dizini-hazirla.sh
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose run --rm -T --no-deps --user 0 \
  --cap-add CHOWN --cap-add DAC_OVERRIDE --cap-add FOWNER \
  --entrypoint sh yedek -c '
    set -e
    chown -R -h 10002:10002 /yedekler
    chmod 700 /yedekler
    # yedek-durum: sahibi yedek, grup 999 (app) yalnızca OKUR: dizin 2750 (setgid), dosyalar 640.
    chown -R -h 10002:999 /yedek-durum
    chmod 2750 /yedek-durum
    for f in /yedek-durum/*; do if [ -f "$f" ] && [ ! -L "$f" ]; then chmod 640 "$f"; fi; done'
echo "Yedek dizini sahipliği hazır (yedekler: 10002:10002 kip 700; yedek-durum: 10002:999 kip 2750, app yalnızca okur)."
