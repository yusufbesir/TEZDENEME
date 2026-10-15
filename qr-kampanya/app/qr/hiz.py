"""IP başına dakikalık hız sınırı (PostgreSQL'te işçiler arasında paylaşılır).
Hem halka açık yönlendirme uçları hem de giriş/MFA uçları (Argon2'den ÖNCE) kullanır."""
import hashlib
import hmac
import logging
import random
import threading
import time
from datetime import datetime, timezone as _tz
from functools import wraps

from django.conf import settings
from django.db import connection, transaction
from django.http import HttpResponse

from .middleware import ip_anahtari, istemci_ip
from .models import DenemeSayaci

log = logging.getLogger(__name__)

ONEK = "hiz:"
PENCERE_SN = 60
_ARTIR_SQL = (
    "INSERT INTO {t} (anahtar, sayi, bitis) VALUES (%s, 1, %s) "
    "ON CONFLICT (anahtar) DO UPDATE SET sayi = {t}.sayi + 1 RETURNING sayi"
).format(t=connection.ops.quote_name(DenemeSayaci._meta.db_table))


class _HizSinirlayici:
    """PostgreSQL destekli, tüm Gunicorn işçileri arasında PAYLAŞILAN sabit pencereli (dakika) hız sınırı.

    Her istek tek bir atomik `INSERT ... ON CONFLICT DO UPDATE ... RETURNING sayi` çalıştırır (mevcut
    `qr_denemesayaci` tablosu; yeni tablo/migrasyon yok). Anahtar pencere numarasını içerir
    (`hiz:<dakika>:<anahtar>`), pencere dolunca yeni satır başlar. Süresi dolan satırlar ara sıra silinir
    (yalnızca `hiz:` önekli ve bitişi geçmiş satırlar).

    Veritabanı hatasında istek İZİN VERİLİR (fail-open) ve uyarı loglanır: QR'ların açılması önceliklidir;
    giriş uçlarında ise parola/MFA deneme sayaçları (sayac.py) ayrıca DB ile korunur."""

    TEMIZLIK_OLASILIGI = 1 / 500
    _LOG_ARALIGI_SN = 10

    def __init__(self):
        self._son_log = 0.0
        self._kilit = threading.Lock()

    @staticmethod
    def _satir_anahtari(pencere, anahtar):
        """IP/kullanıcı kısmı DB'ye ham yazılmaz: SECRET_KEY'li HMAC-SHA256 (düz özet IPv4 uzayında çözülebilir)."""
        ozet = hmac.new(settings.SECRET_KEY.encode(), b"hiz|" + anahtar.encode(), hashlib.sha256).hexdigest()
        return f"{ONEK}{pencere}:{ozet}"

    def _uyar(self, hata):
        simdi = time.monotonic()
        with self._kilit:
            if simdi - self._son_log < self._LOG_ARALIGI_SN:
                return
            self._son_log = simdi
        log.warning("Hız sınırı sayacı yazılamadı; istek sınırsız geçirildi (fail-open): %s", hata)

    def izin_ver(self, anahtar, sinir):
        if sinir <= 0:
            return True
        simdi = time.time()
        pencere = int(simdi // PENCERE_SN)
        bitis = datetime.fromtimestamp((pencere + 2) * PENCERE_SN, tz=_tz.utc)  # 1 pencere tampon
        try:
            # Test/ATOMIC bloğu içinde hata tüm işlemi bozmasın diye savepoint; autocommit'te ek tur yok.
            kapsam = transaction.atomic() if connection.in_atomic_block else _Bos()
            with kapsam, connection.cursor() as imlec:
                imlec.execute(_ARTIR_SQL, [self._satir_anahtari(pencere, anahtar), bitis])
                sayi = imlec.fetchone()[0]
        except Exception as hata:  # fail-open
            self._uyar(hata)
            return True
        if random.random() < self.TEMIZLIK_OLASILIGI:
            self.temizle()
        return sayi <= sinir

    def temizle(self):
        """Süresi dolmuş hız sınırı satırlarını siler; başka sayaçlara/verilere dokunmaz."""
        try:
            return DenemeSayaci.objects.filter(anahtar__startswith=ONEK, bitis__lte=datetime.now(_tz.utc)).delete()[0]
        except Exception as hata:
            self._uyar(hata)
            return 0


class _Bos:
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


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
