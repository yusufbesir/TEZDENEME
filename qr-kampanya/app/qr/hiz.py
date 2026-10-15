"""Süreç içi, IP başına dakikalık basit hız sınırı. Veritabanına yük bindirmez.
Hem halka açık yönlendirme uçları hem de giriş/MFA uçları (Argon2'den ÖNCE) kullanır."""
import threading
import time
from functools import wraps

from django.conf import settings
from django.http import HttpResponse

from .middleware import ip_anahtari, istemci_ip


class _HizSinirlayici:
    """Süreç içi, IP başına dakikalık basit hız sınırı. Veritabanına yük bindirmez.
    Her Gunicorn işçisi kendi sayacını tutar; bu nedenle sınır yaklaşık değerdir."""

    def __init__(self):
        self._kilit = threading.Lock()
        self._dakika = 0
        self._sayac = {}

    def izin_ver(self, anahtar, sinir):
        if sinir <= 0:
            return True
        simdi = int(time.time() // 60)
        with self._kilit:
            if simdi != self._dakika:
                self._dakika, self._sayac = simdi, {}
            sayi = self._sayac.get(anahtar, 0) + 1
            self._sayac[anahtar] = sayi
            return sayi <= sinir


hiz_sinirlayici = _HizSinirlayici()


def giris_hiz_siniri(gorunum):
    """POST isteklerinde IP başına dakikalık sınır uygular (parola doğrulamasından önce).
    Aşılırsa 429 döner; görünüm (ve dolayısıyla Argon2) hiç çalışmaz."""

    @wraps(gorunum)
    def sarmal(request, *args, **kwargs):
        if request.method == "POST" and not hiz_sinirlayici.izin_ver("giris|" + ip_anahtari(istemci_ip(request)), settings.GIRIS_HIZ_SINIRI):
            yanit = HttpResponse("Çok fazla istek. Lütfen biraz sonra tekrar deneyin.", status=429, content_type="text/plain; charset=utf-8")
            yanit["Retry-After"] = "60"
            return yanit
        return gorunum(request, *args, **kwargs)

    return sarmal
