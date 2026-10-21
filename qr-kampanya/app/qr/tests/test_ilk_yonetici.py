"""İlk yönetici: createsuperuser ile (etkileşimli) oluşan hesap Yönetici yetkisi alır, MFA'sız panele giremez;
kurulum betiği parolayı ortamdan/varsayılandan almaz ve tty yoksa hesap oluşturmaz."""
import re
from io import StringIO
from unittest import mock

from django.contrib.auth import SESSION_KEY, get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings

from qr import roller
from qr.models import MFACihazi

from .yardimci import PAROLA, TEST_AYARLARI, betik_dizini

Kullanici = get_user_model()


def _sahte_createsuperuser(*args, **kw):
    """call_command("createsuperuser") yerine: etkileşimli komutun yapacağı gibi bir süper kullanıcı yaratır."""
    Kullanici.objects.create_superuser("ilk", "ilk@example.com", PAROLA)




@override_settings(**{**TEST_AYARLARI, "MFA_ZORUNLU": True})
class IlkYoneticiTesti(TestCase):
    def olustur(self):
        orijinal = call_command

        def yonlendir(ad, *a, **k):
            if ad == "createsuperuser":
                return _sahte_createsuperuser()
            return orijinal(ad, *a, **k)

        with mock.patch("qr.management.commands.yonetici_olustur.call_command", side_effect=yonlendir):
            call_command("yonetici_olustur", stdout=StringIO())
        return Kullanici.objects.get(username="ilk")

    def test_yonetici_rolu_ve_yetki(self):
        k = self.olustur()
        self.assertTrue(k.is_superuser)
        self.assertEqual(roller.kullanici_rolu(k), roller.YONETICI)
        self.assertTrue(k.groups.filter(name=roller.YONETICI).exists())

    def test_ilk_giriste_mfa_kurulumu_zorunlu_panele_erisim_yok(self):
        self.olustur()
        yanit = self.client.post("/panel/giris", {"username": "ilk", "password": PAROLA})
        self.assertRedirects(yanit, "/panel/mfa/kurulum", fetch_redirect_response=False)
        self.assertNotIn(SESSION_KEY, self.client.session)
        for yol in ("/panel/", "/panel/qr/", "/panel/kullanicilar/", "/panel/hesap/"):
            r = self.client.get(yol)
            self.assertEqual(r.status_code, 302, yol)
            self.assertTrue(r["Location"].startswith("/panel/giris"), yol)

    def test_mfa_onaylanmadan_oturum_acilmaz(self):
        k = self.olustur()
        self.client.post("/panel/giris", {"username": "ilk", "password": PAROLA})
        self.client.get("/panel/mfa/kurulum")
        self.client.post("/panel/mfa/kurulum", {"kod": "000000"})
        self.assertNotIn(SESSION_KEY, self.client.session)
        self.assertFalse(MFACihazi.objects.filter(kullanici=k, onayli=True).exists())

    def test_mfa_zorunlu_varsayilani_uretimde_acik(self):
        ayarlar = (betik_dizini().parent / "app" / "config" / "settings.py").read_text(encoding="utf-8")
        self.assertRegex(ayarlar, r'MFA_ZORUNLU\s*=\s*env_bool\("MFA_ZORUNLU",\s*not DEBUG\)')
        ornek = (betik_dizini().parent / ".env.example").read_text(encoding="utf-8")
        self.assertRegex(ornek, r"(?m)^MFA_ZORUNLU=1\s*$")


class KurulumBetigiTesti(TestCase):
    def setUp(self):
        self.betik = (betik_dizini() / "kurulum.sh").read_text(encoding="utf-8")

    def test_parola_ortamdan_veya_varsayilan_yok(self):
        self.assertNotIn("DJANGO_SUPERUSER", self.betik)
        self.assertNotIn("--noinput", self.betik)
        self.assertNotIn("--no-input", self.betik)
        self.assertIsNone(re.search(r"(?i)createsuperuser[^\n]*(--password|-p )", self.betik))

    def test_sayim_baslik_satirindan_etkilenmez(self):
        self.assertIn("shell --no-imports", self.betik)
        self.assertIn("^[0-9]+$", self.betik)
        self.assertNotIn(')" = "0" ]', self.betik)

    def test_tty_yoksa_olusturmaz_komutu_yazar(self):
        self.assertIn("[ -t 0 ] && [ -t 1 ]", self.betik)
        self.assertIn("yonetici_olustur", self.betik)
        self.assertIn("tty) yok", self.betik)
