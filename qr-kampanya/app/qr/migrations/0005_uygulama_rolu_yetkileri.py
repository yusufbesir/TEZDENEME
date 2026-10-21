"""Uygulama veritabanı rolünün (qr_uygulama) yetkilerini daraltır.

Silme koruması tetikleyicilerine (0002) ek savunma: uygulama hesabından bu tablolardaki
UPDATE/DELETE yetkisi de alınır. Rol yoksa (ör. testlerde veya rolsüz yerel kurulumda)
hiçbir şey yapılmaz. Roller db/init/10-roller.sh ile oluşturulur; o betik tekrar
çalıştırılırsa yetkileri yeniden verir ve aynı geri almaları kendisi de uygular.
Geri alma (reverse) bilerek hiçbir şey yapmaz: yetki genişletilmez.
"""
from django.db import migrations

ILERI = """
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qr_uygulama') THEN
    REVOKE UPDATE, DELETE ON qr_denetimkaydi FROM qr_uygulama;
    REVOKE DELETE ON qr_qrkod, qr_kampanyasayfasi, qr_hedefgecmisi FROM qr_uygulama;
  END IF;
END
$$;
"""


class Migration(migrations.Migration):
    dependencies = [("qr", "0004_deneme_sayaci")]
    operations = [migrations.RunSQL(ILERI, migrations.RunSQL.noop)]
