from django.core.management.base import BaseCommand, CommandError

from qr.sayac import ad_normalle, anahtar_uret, hesap_anahtari, kullaniciyi_bul, sifirla
from qr.middleware import ip_anahtari
from qr.models import DenemeSayaci
from qr.servisler import denetim_yaz


class Command(BaseCommand):
    help = (
        "Bir kullanıcının giriş/MFA deneme sayaçlarını (hesap kilidi) sıfırlar. "
        "--ip verilirse o IP'nin (IPv6 için /64 ağının) sayaçları da silinir."
    )

    def add_arguments(self, parser):
        parser.add_argument("kullanici_adi")
        parser.add_argument("--ip", default="", help="Bu IP'ye ait sayaçları da sıfırla (kullanıcı+IP ve IP sayaçları).")

    def handle(self, *args, **opts):
        ad = opts["kullanici_adi"]
        ip = ip_anahtari(opts["ip"]) if opts["ip"] else ""
        kullanici = kullaniciyi_bul(ad)
        anahtarlar = [hesap_anahtari(ad, kullanici)]
        if ip:
            anahtarlar.append(anahtar_uret("ip", ip))
            for onek in ("giris-deneme", "mfa-deneme"):
                anahtarlar.append(anahtar_uret(onek, ad, ip))
        silinen = DenemeSayaci.objects.filter(anahtar__in=anahtarlar).count()
        sifirla(*anahtarlar)
        ozet = f"{kullanici.get_username() if kullanici else ad_normalle(ad)}: deneme sayaçları sunucu konsolundan sıfırlandı"
        ozet += f" (IP: {ip}); {silinen} sayaç silindi" if ip else f"; {silinen} sayaç silindi"
        denetim_yaz(None, "sayac_sifirlandi", kullanici, ozet)
        if kullanici is None:
            self.stdout.write(f"Uyarı: '{ad}' adlı kullanıcı yok; yalnızca ad bazlı sayaçlar sıfırlandı. Denetim kaydı yazıldı.")
        else:
            self.stdout.write(f"{kullanici.get_username()} için {silinen} sayaç sıfırlandı; denetim kaydı yazıldı.")
