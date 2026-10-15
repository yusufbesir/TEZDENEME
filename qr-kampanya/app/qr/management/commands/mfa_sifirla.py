from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from qr.models import MFACihazi
from qr.servisler import denetim_yaz, kullanici_oturumlarini_sonlandir


class Command(BaseCommand):
    help = "Bir kullanıcının MFA kaydını siler (cihaz kaybı durumunda sunucu konsolundan kullanılır)."

    def add_arguments(self, parser):
        parser.add_argument("kullanici_adi")

    def handle(self, *args, **opts):
        User = get_user_model()
        ad = opts["kullanici_adi"]
        try:
            kullanici = User.objects.get(**{User.USERNAME_FIELD: ad})
        except User.DoesNotExist:
            raise CommandError(f"Kullanıcı bulunamadı: {ad}")
        silinen, _ = MFACihazi.objects.filter(kullanici=kullanici).delete()
        oturum = kullanici_oturumlarini_sonlandir(kullanici)
        denetim_yaz(None, "mfa_sifirlandi", kullanici, f"{ad}: MFA sunucu konsolundan sıfırlandı" + ("" if silinen else " (kayıtlı cihaz yoktu)") + f"; {oturum} oturum sonlandırıldı")
        self.stdout.write(f"{ad} için MFA sıfırlandı." if silinen else f"{ad} için kayıtlı MFA yoktu; denetim kaydı yazıldı.")
