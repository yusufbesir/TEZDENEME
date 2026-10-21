from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from qr.models import MFACihazi
from qr.sifreleme import SifrelemeHatasi, _fernet, yeniden_sifrele


class Command(BaseCommand):
    help = (
        "Anahtar döndürme: bütün MFA kayıtlarını MFA_SIFRELEME_ANAHTARI listesinin İLK anahtarıyla yeniden şifreler. "
        "Eski anahtarı listeden çıkarmadan önce çalıştırın. Çözülemeyen kayıt varsa hiçbir kayıt değişmez."
    )

    def handle(self, *args, **opts):
        tablo = MFACihazi._meta.db_table
        try:
            fernet = _fernet()
            with transaction.atomic(), connection.cursor() as imlec:
                imlec.execute(f"SELECT id, gizli_anahtar FROM {tablo} ORDER BY id")
                yeni = [(yeniden_sifrele(deger, fernet), pk) for pk, deger in imlec.fetchall() if deger]
                for deger, pk in yeni:
                    imlec.execute(f"UPDATE {tablo} SET gizli_anahtar = %s WHERE id = %s", [deger, pk])
        except SifrelemeHatasi as hata:
            raise CommandError(f"{hata} Hiçbir kayıt değiştirilmedi.") from None
        self.stdout.write(f"{len(yeni)} MFA kaydı güncel anahtarla yeniden şifrelendi.")
