"""Veritabanı düzeyinde silme koruması.

Model .delete() korumaları toplu silmeyi (QuerySet.delete) ve doğrudan SQL'i
engellemez. Basılmış QR kodlarının, kalıcı sayfaların, hedef geçmişinin ve
denetim kayıtlarının hiçbir yoldan silinmemesi için tetikleyici eklenir.
Denetim kayıtlarında güncelleme de engellenir.
"""
from django.db import migrations

KORUNAN = ["qr_qrkod", "qr_kampanyasayfasi", "qr_hedefgecmisi", "qr_denetimkaydi"]

ILERI = """
CREATE OR REPLACE FUNCTION qr_silme_engeli() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Bu tablodan kayıt silinemez veya değiştirilemez (%). Arşivleme kullanın.', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
""" + "".join(
    f"CREATE TRIGGER {t}_silme_engeli BEFORE DELETE ON {t} FOR EACH ROW EXECUTE FUNCTION qr_silme_engeli();\n"
    f"CREATE TRIGGER {t}_bosaltma_engeli BEFORE TRUNCATE ON {t} FOR EACH STATEMENT EXECUTE FUNCTION qr_silme_engeli();\n"
    for t in KORUNAN
) + """
CREATE TRIGGER qr_denetimkaydi_guncelleme_engeli BEFORE UPDATE ON qr_denetimkaydi
  FOR EACH ROW EXECUTE FUNCTION qr_silme_engeli();
"""

GERI = "".join(
    f"DROP TRIGGER IF EXISTS {t}_silme_engeli ON {t};\nDROP TRIGGER IF EXISTS {t}_bosaltma_engeli ON {t};\n" for t in KORUNAN
) + "DROP TRIGGER IF EXISTS qr_denetimkaydi_guncelleme_engeli ON qr_denetimkaydi;\nDROP FUNCTION IF EXISTS qr_silme_engeli();\n"


class Migration(migrations.Migration):
    dependencies = [("qr", "0001_initial")]
    operations = [migrations.RunSQL(ILERI, GERI)]
