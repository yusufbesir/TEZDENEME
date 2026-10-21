from django.db import IntegrityError, connection, transaction
from django.db.utils import DatabaseError
from django.test import TestCase

from qr.models import DenetimKaydi, QRKod


class VeritabaniSilmeKorumasiTesti(TestCase):
    def test_toplu_silme_veritabaninda_engellenir(self):
        QRKod.objects.create(kisa_kod="SIL-001", hedef_url="https://example.com/a")
        with self.assertRaises(DatabaseError), transaction.atomic():
            QRKod.objects.filter(kisa_kod="SIL-001").delete()
        self.assertTrue(QRKod.objects.filter(kisa_kod="SIL-001").exists())

    def test_ham_sql_ile_silme_engellenir(self):
        QRKod.objects.create(kisa_kod="SIL-002", hedef_url="https://example.com/a")
        with self.assertRaises(DatabaseError), transaction.atomic():
            with connection.cursor() as c:
                c.execute("DELETE FROM qr_qrkod")

    def test_denetim_kaydi_guncellenemez(self):
        DenetimKaydi.objects.create(eylem="deneme")
        with self.assertRaises(DatabaseError), transaction.atomic():
            DenetimKaydi.objects.update(eylem="degisti")
