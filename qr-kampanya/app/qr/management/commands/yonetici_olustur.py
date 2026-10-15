from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.core.management.base import BaseCommand

from qr.roller import YONETICI


class Command(BaseCommand):
    help = "İlk yönetici hesabını etkileşimli olarak oluşturur ve Yönetici rolüne ekler."

    def handle(self, *args, **opts):
        User = get_user_model()
        onceki = set(User.objects.filter(is_superuser=True).values_list("pk", flat=True))
        call_command("rolleri_kur")
        call_command("createsuperuser")
        grup = Group.objects.get(name=YONETICI)
        for kullanici in User.objects.filter(is_superuser=True).exclude(pk__in=onceki):
            kullanici.groups.add(grup)
            self.stdout.write(f"{kullanici.username} Yönetici rolüne eklendi. İlk girişte doğrulama uygulaması (MFA) kurulumu istenir.")
