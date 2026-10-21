import time

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "Veritabanı bağlantıya hazır olana kadar bekler (en fazla 60 sn)."

    def handle(self, *args, **opts):
        for _ in range(60):
            try:
                connection.ensure_connection()
                return
            except OperationalError:
                time.sleep(1)
        raise CommandError("Veritabanına 60 saniye içinde bağlanılamadı.")
