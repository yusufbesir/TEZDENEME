from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand

from qr.roller import rol_yetkileri


class Command(BaseCommand):
    help = "Yönetici, Editör ve İzleyici rollerini ve yetkilerini oluşturur/günceller (idempotent)."

    def handle(self, *args, **opts):
        for rol, yetkiler in rol_yetkileri().items():
            grup, _ = Group.objects.get_or_create(name=rol)
            nesneler = []
            for y in yetkiler:
                app_label, codename = y.split(".")
                nesneler.append(Permission.objects.get(content_type__app_label=app_label, codename=codename))
            grup.permissions.set(nesneler)
        self.stdout.write("Roller güncellendi.")
