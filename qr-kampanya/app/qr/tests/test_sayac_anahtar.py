import hashlib
import hmac

from django.conf import settings
from django.test import SimpleTestCase

from qr.sayac import anahtar_uret


class SayacAnahtariGizlilikTesti(SimpleTestCase):
    """Giriş/MFA kilit sayaçlarının anahtarı ham IP/kullanıcı adı ya da düz SHA-256 değil, HMAC özeti olmalı."""

    def test_anahtar_hmac_ozeti_duz_sha256_degil(self):
        anahtar = anahtar_uret("ip", "198.51.100.23")
        self.assertNotIn("198.51.100.23", anahtar)
        self.assertNotEqual(anahtar, "ip:" + hashlib.sha256(b"198.51.100.23").hexdigest())
        beklenen = hmac.new(settings.SECRET_KEY.encode(), b"sayac|198.51.100.23", hashlib.sha256).hexdigest()
        self.assertEqual(anahtar, "ip:" + beklenen)

    def test_normallestirilmis_ad_ayni_anahtari_verir(self):
        self.assertEqual(anahtar_uret("hesap", "Editor"), anahtar_uret("hesap", "editor"))
