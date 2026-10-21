#!/usr/bin/env bash
# Çalışan yığında uygulama hesabının (qr_uygulama) yetkilerini doğrular: yıkıcı işlemlerin HER BİRİ
# reddedilmeli, normal okuma çalışmalı. Her deneme BEGIN ... ROLLBACK içindedir; yanlışlıkla
# başarılı olsa bile hiçbir veri değişmez.    bash scripts/rol-dogrulama.sh
# Bağlantı, app konteynerinin kendi ortamındaki (qr_uygulama) bilgilerle yapılır; parola ekrana basılmaz.
# Çıkış kodu: 0 = GEÇTİ, 1 = KALDI.
set -uo pipefail
cd "$(dirname "$0")/.."

docker compose exec -T app python - <<'PY'
import os
import sys

import psycopg

ENGELLENMESI_GEREKENLER = [
    ("DROP TABLE qr_denetimkaydi", "DROP TABLE qr_denetimkaydi"),
    ("ALTER TABLE qr_qrkod DISABLE TRIGGER ALL", "ALTER TABLE qr_qrkod DISABLE TRIGGER ALL"),
    ("TRUNCATE qr_qrkod", "TRUNCATE qr_qrkod"),
    ("DELETE FROM qr_qrkod", "DELETE FROM qr_qrkod"),
    ("UPDATE qr_denetimkaydi SET ...", "UPDATE qr_denetimkaydi SET ozet = 'x'"),
    ("CREATE TABLE ...", "CREATE TABLE public.qr_yetkisiz_deneme (id integer)"),
]

baglanti = psycopg.connect(
    dbname=os.environ["POSTGRES_DB"], user=os.environ["POSTGRES_USER"], password=os.environ["POSTGRES_PASSWORD"],
    host=os.environ.get("POSTGRES_HOST", "db"), port=os.environ.get("POSTGRES_PORT", "5432"), autocommit=True,
)
imlec = baglanti.cursor()
hatalar = 0


def dene(sql):
    """SQL'i BEGIN/ROLLBACK içinde dener. (basarili_mi, hata_metni) döner."""
    imlec.execute("BEGIN")
    try:
        imlec.execute(sql)
        return True, ""
    except psycopg.Error as e:
        return False, type(e).__name__
    finally:
        imlec.execute("ROLLBACK")


imlec.execute("SELECT current_user, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)")
kullanici, super_mi = imlec.fetchone()
print(f"Bağlanan hesap: {kullanici} (süper kullanıcı: {'EVET' if super_mi else 'hayır'})")
if kullanici != "qr_uygulama" or super_mi:
    print("KALDI  uygulama beklenen kısıtlı hesapla (qr_uygulama) bağlanmıyor")
    hatalar += 1

for ad, sql in ENGELLENMESI_GEREKENLER:
    basarili, hata = dene(sql)
    if basarili:
        print(f"KALDI  {ad}: işlem BAŞARILI oldu (reddedilmeliydi; geri alındı)")
        hatalar += 1
    else:
        print(f"GEÇTİ  {ad}: reddedildi ({hata})")

basarili, hata = dene("SELECT count(*) FROM qr_qrkod")
if basarili:
    print("GEÇTİ  SELECT çalışıyor")
else:
    print(f"KALDI  SELECT çalışmıyor ({hata})")
    hatalar += 1

print("SONUÇ: " + ("GEÇTİ" if hatalar == 0 else f"KALDI ({hatalar} sorun)"))
sys.exit(1 if hatalar else 0)
PY
