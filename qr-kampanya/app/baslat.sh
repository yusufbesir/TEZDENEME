#!/bin/sh
# Konteyner başlarken: veritabanı hazır olana kadar bekle, migrasyonları uygula,
# statik dosyaları topla, sonra verilen komutu çalıştır.
set -e
if [ "${ATLA_HAZIRLIK:-0}" != "1" ]; then
  python manage.py veritabani_bekle
  python manage.py migrate --noinput
  python manage.py createcachetable
  python manage.py collectstatic --noinput -v 0
  python manage.py rolleri_kur
fi
exec "$@"
