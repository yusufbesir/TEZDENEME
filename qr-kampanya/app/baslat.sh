#!/bin/sh
# Konteyner başlarken çalışır; BASLAT_MOD ile iş seçilir:
#   hazirlik  : (tek seferlik "hazirlik" servisi, qr_sahip hesabıyla) veritabanını bekle,
#               migrasyonları uygula, önbellek tablosunu oluştur, panel rollerini kur.
#   uygulama  : (varsayılan; "app" servisi, kısıtlı qr_uygulama hesabıyla) veritabanını bekle,
#               statik dosyaları topla. Şema değişikliği YAPMAZ.
# ATLA_HAZIRLIK=1 (testler): hiçbir şey yapmadan komutu çalıştırır.
set -e
if [ "${ATLA_HAZIRLIK:-0}" != "1" ]; then
  python manage.py veritabani_bekle
  case "${BASLAT_MOD:-uygulama}" in
    hazirlik)
      python manage.py migrate --noinput
      python manage.py createcachetable
      python manage.py rolleri_kur
      ;;
    uygulama)
      python manage.py collectstatic --noinput -v 0
      ;;
    *)
      echo "Bilinmeyen BASLAT_MOD: ${BASLAT_MOD}" >&2
      exit 1
      ;;
  esac
fi
exec "$@"
