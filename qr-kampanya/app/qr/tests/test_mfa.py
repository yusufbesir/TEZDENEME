"""TOTP çok faktörlü doğrulama: iki adımlı giriş, kurulum, sıfırlama, parola değiştirme."""
import re
from io import StringIO
from unittest import mock

import pyotp
from django.contrib.auth import SESSION_KEY
from django.contrib.auth.models import Permission
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings

from qr.models import DenetimKaydi, MFACihazi

from .yardimci import PAROLA, TemelTest

SIMDI = "qr.panel.mfa._simdi"
T0 = 1_800_000_000.0  # sabit an; adım sınırından uzakta


def kod_uret(cihaz, an=T0):
    return pyotp.TOTP(cihaz.gizli_anahtar).at(int(an))


class _Gizli:
    """Kurulum sayfasında gösterilen onaysız anahtar (veritabanında tutulmaz)."""

    def __init__(self, gizli_anahtar):
        self.gizli_anahtar = gizli_anahtar


def giris_yap(istemci, ad="editor", parola=PAROLA, **ek):
    return istemci.post("/panel/giris", {"username": ad, "password": parola, **ek})


@override_settings(MFA_ZORUNLU=True)
class MFAGirisTesti(TemelTest):
    def cihaz_ver(self, kullanici, onayli=True):
        return MFACihazi.objects.create(kullanici=kullanici, gizli_anahtar=pyotp.random_base32(), onayli=onayli)

    def oturumlu_mu(self):
        return SESSION_KEY in self.client.session

    def test_parola_dogru_kod_yok_panel_erisimi_yok(self):
        self.cihaz_ver(self.editor)
        yanit = giris_yap(self.client)
        self.assertRedirects(yanit, "/panel/mfa/dogrula", fetch_redirect_response=False)
        self.assertFalse(self.oturumlu_mu())
        for yol in ("/panel/", "/panel/qr/", "/panel/hesap/", "/panel/denetim/"):
            r = self.client.get(yol)
            self.assertEqual(r.status_code, 302, yol)
            self.assertTrue(r["Location"].startswith("/panel/giris"), yol)

    def test_dogru_kodla_giris(self):
        cihaz = self.cihaz_ver(self.editor)
        with mock.patch(SIMDI, return_value=T0):
            giris_yap(self.client, **{"next": "/panel/qr/"})
            eski = self.client.session.session_key
            yanit = self.client.post("/panel/mfa/dogrula", {"kod": kod_uret(cihaz)})
        self.assertRedirects(yanit, "/panel/qr/", fetch_redirect_response=False)
        self.assertTrue(self.oturumlu_mu())
        self.assertNotEqual(eski, self.client.session.session_key)
        self.assertEqual(self.client.get("/panel/").status_code, 200)
        self.assertTrue(DenetimKaydi.objects.filter(eylem="mfa_basarili", kullanici=self.editor).exists())
        self.assertTrue(DenetimKaydi.objects.filter(eylem="giris_basarili", kullanici=self.editor).exists())

    def test_bosluklu_kod_kabul_edilir(self):
        cihaz = self.cihaz_ver(self.editor)
        with mock.patch(SIMDI, return_value=T0):
            giris_yap(self.client)
            k = kod_uret(cihaz)
            self.client.post("/panel/mfa/dogrula", {"kod": f"{k[:3]} {k[3:]}"})
        self.assertTrue(self.oturumlu_mu())

    def test_yanlis_kod(self):
        cihaz = self.cihaz_ver(self.editor)
        with mock.patch(SIMDI, return_value=T0):
            giris_yap(self.client)
            yanlis = "000000" if kod_uret(cihaz) != "000000" else "111111"
            yanit = self.client.post("/panel/mfa/dogrula", {"kod": yanlis})
        self.assertEqual(yanit.status_code, 200)
        self.assertContains(yanit, "Doğrulama kodu hatalı.")
        self.assertFalse(self.oturumlu_mu())
        self.assertTrue(DenetimKaydi.objects.filter(eylem="mfa_basarisiz").exists())

    def test_ayni_kod_tekrar_kullanilamaz(self):
        cihaz = self.cihaz_ver(self.editor)
        with mock.patch(SIMDI, return_value=T0):
            kod = kod_uret(cihaz)
            giris_yap(self.client)
            self.client.post("/panel/mfa/dogrula", {"kod": kod})
            self.assertTrue(self.oturumlu_mu())
            self.client.post("/panel/cikis")
            # Aynı kod yine geçerli pencerede ama kullanılmış.
            giris_yap(self.client)
            yanit = self.client.post("/panel/mfa/dogrula", {"kod": kod})
        self.assertEqual(yanit.status_code, 200)
        self.assertFalse(self.oturumlu_mu())
        # Önceki adımın kodu da (yeniden oynatma) kabul edilmez.
        with mock.patch(SIMDI, return_value=T0 + 30):
            self.client.post("/panel/mfa/dogrula", {"kod": kod_uret(cihaz, T0 - 30)})
        self.assertFalse(self.oturumlu_mu())
        # Sonraki adımın yeni kodu kabul edilir.
        with mock.patch(SIMDI, return_value=T0 + 30):
            self.client.post("/panel/mfa/dogrula", {"kod": kod_uret(cihaz, T0 + 30)})
        self.assertTrue(self.oturumlu_mu())

    def test_pencere_disi_kod_reddedilir(self):
        cihaz = self.cihaz_ver(self.editor)
        with mock.patch(SIMDI, return_value=T0):
            giris_yap(self.client)
            self.client.post("/panel/mfa/dogrula", {"kod": kod_uret(cihaz, T0 - 120)})
        self.assertFalse(self.oturumlu_mu())

    def test_bekleyen_durum_5_dk_sonra_gecersiz(self):
        cihaz = self.cihaz_ver(self.editor)
        with mock.patch(SIMDI, return_value=T0):
            giris_yap(self.client)
        with mock.patch(SIMDI, return_value=T0 + 301):
            yanit = self.client.post("/panel/mfa/dogrula", {"kod": kod_uret(cihaz, T0 + 301)})
        self.assertRedirects(yanit, "/panel/giris", fetch_redirect_response=False)
        self.assertFalse(self.oturumlu_mu())
        with mock.patch(SIMDI, return_value=T0 + 302):
            self.assertEqual(self.client.get("/panel/mfa/dogrula").status_code, 302)

    def test_bekleyen_durum_yokken_dogrula_girise_yonlendirir(self):
        self.assertRedirects(self.client.get("/panel/mfa/dogrula"), "/panel/giris", fetch_redirect_response=False)
        self.assertRedirects(self.client.get("/panel/mfa/kurulum"), "/panel/giris", fetch_redirect_response=False)

    def test_mfa_deneme_kilidi(self):
        cihaz = self.cihaz_ver(self.editor)
        with mock.patch(SIMDI, return_value=T0):
            giris_yap(self.client)
            dogru = kod_uret(cihaz)
            for _ in range(5):
                self.client.post("/panel/mfa/dogrula", {"kod": "000000" if dogru != "000000" else "999999"})
            yanit = self.client.post("/panel/mfa/dogrula", {"kod": dogru})
        self.assertEqual(yanit.status_code, 429)
        self.assertContains(yanit, "Çok fazla başarısız deneme", status_code=429)
        self.assertFalse(self.oturumlu_mu())

    def test_pasif_kullanici_bekleyen_durumda_reddedilir(self):
        cihaz = self.cihaz_ver(self.editor)
        with mock.patch(SIMDI, return_value=T0):
            giris_yap(self.client)
            self.editor.is_active = False
            self.editor.save()
            self.client.post("/panel/mfa/dogrula", {"kod": kod_uret(cihaz)})
        self.assertFalse(self.oturumlu_mu())

    # --- Kurulum ---
    def test_zorunlu_kurulum_akisi(self):
        with mock.patch(SIMDI, return_value=T0):
            yanit = giris_yap(self.client)
        self.assertRedirects(yanit, "/panel/mfa/kurulum", fetch_redirect_response=False)
        self.assertFalse(self.oturumlu_mu())
        self.assertEqual(self.client.get("/panel/").status_code, 302)
        with mock.patch(SIMDI, return_value=T0):
            sayfa = self.client.get("/panel/mfa/kurulum")
        self.assertContains(sayfa, 'src="data:image/svg+xml;base64,')
        # Onaylanmamış anahtar veritabanında tutulmaz; yalnızca oturumun bekleyen verisindedir.
        self.assertFalse(MFACihazi.objects.filter(kullanici=self.editor).exists())
        cihaz = _Gizli(sayfa.context["gizli_anahtar"])
        self.assertContains(sayfa, cihaz.gizli_anahtar)
        # Sayfa yenilenince (aynı oturumda) anahtar değişmez.
        with mock.patch(SIMDI, return_value=T0):
            yenile = self.client.get("/panel/mfa/kurulum")
        self.assertEqual(yenile.context["gizli_anahtar"], cihaz.gizli_anahtar)
        with mock.patch(SIMDI, return_value=T0):
            yanlis = self.client.post("/panel/mfa/kurulum", {"kod": "12345"})
            self.assertEqual(yanlis.status_code, 200)
            self.assertFalse(MFACihazi.objects.filter(kullanici=self.editor).exists())
            yanit = self.client.post("/panel/mfa/kurulum", {"kod": kod_uret(cihaz)})
        self.assertRedirects(yanit, "/panel/", fetch_redirect_response=False)
        self.assertTrue(self.oturumlu_mu())
        self.assertTrue(MFACihazi.objects.get(kullanici=self.editor).onayli)
        self.assertTrue(DenetimKaydi.objects.filter(eylem="mfa_kuruldu", kullanici=self.editor).exists())

    def test_kurulum_qr_baslik_ve_issuer(self):
        with mock.patch(SIMDI, return_value=T0):
            giris_yap(self.client)
            sayfa = self.client.get("/panel/mfa/kurulum")
        import base64
        b64 = re.search(r'base64,([^"]+)"', sayfa.content.decode()).group(1)
        self.assertIn(b"<svg", base64.b64decode(b64))

    def test_onayli_cihazla_kurulum_ekrani_acilmaz(self):
        self.cihaz_ver(self.editor)
        giris_yap(self.client)
        self.assertRedirects(self.client.get("/panel/mfa/kurulum"), "/panel/mfa/dogrula", fetch_redirect_response=False)

    @override_settings(MFA_ZORUNLU=False)
    def test_zorunlu_degilken_mfasiz_giris(self):
        yanit = giris_yap(self.client)
        self.assertRedirects(yanit, "/panel/", fetch_redirect_response=False)
        self.assertTrue(self.oturumlu_mu())

    @override_settings(MFA_ZORUNLU=False)
    def test_zorunlu_degilken_onayli_cihazda_yine_kod_istenir(self):
        self.cihaz_ver(self.editor)
        self.assertRedirects(giris_yap(self.client), "/panel/mfa/dogrula", fetch_redirect_response=False)

    @override_settings(MFA_ZORUNLU=False)
    def test_istege_bagli_kurulum_hesabimdan(self):
        self.giris(self.editor)
        self.assertContains(self.client.get("/panel/hesap/"), "MFA kur")
        sayfa = self.client.get("/panel/hesap/mfa/kur")
        self.assertContains(sayfa, "data:image/svg+xml;base64,")
        self.assertFalse(MFACihazi.objects.filter(kullanici=self.editor).exists())
        cihaz = _Gizli(sayfa.context["gizli_anahtar"])
        with mock.patch(SIMDI, return_value=T0):
            yanit = self.client.post("/panel/hesap/mfa/kur", {"kod": kod_uret(cihaz)})
        self.assertRedirects(yanit, "/panel/hesap/", fetch_redirect_response=False)
        self.assertTrue(MFACihazi.objects.get(kullanici=self.editor).onayli)
        self.assertRedirects(self.client.get("/panel/hesap/mfa/kur"), "/panel/hesap/", fetch_redirect_response=False)

    # --- Sıfırlama ---
    def test_yonetici_baskasinin_mfasini_sifirlar(self):
        self.cihaz_ver(self.editor)
        self.giris(self.yonetici)
        self.assertContains(self.client.get(f"/panel/kullanicilar/{self.editor.pk}/mfa-sifirla"), "Emin misiniz")
        self.assertTrue(MFACihazi.objects.filter(kullanici=self.editor).exists())  # GET silmez
        yanit = self.client.post(f"/panel/kullanicilar/{self.editor.pk}/mfa-sifirla")
        self.assertRedirects(yanit, "/panel/kullanicilar/", fetch_redirect_response=False)
        self.assertFalse(MFACihazi.objects.filter(kullanici=self.editor).exists())
        self.assertTrue(DenetimKaydi.objects.filter(eylem="mfa_sifirlandi", kullanici=self.yonetici).exists())

    def test_editor_sifirlayamaz(self):
        self.cihaz_ver(self.izleyici)
        self.giris(self.editor)
        self.assertEqual(self.client.get(f"/panel/kullanicilar/{self.izleyici.pk}/mfa-sifirla").status_code, 403)
        self.assertEqual(self.client.post(f"/panel/kullanicilar/{self.izleyici.pk}/mfa-sifirla").status_code, 403)
        self.assertTrue(MFACihazi.objects.filter(kullanici=self.izleyici).exists())

    def test_sifirlama_csrf_ister(self):
        from django.test import Client

        self.cihaz_ver(self.editor)
        istemci = Client(enforce_csrf_checks=True)
        istemci.force_login(self.yonetici)
        self.assertEqual(istemci.post(f"/panel/kullanicilar/{self.editor.pk}/mfa-sifirla").status_code, 403)
        self.assertTrue(MFACihazi.objects.filter(kullanici=self.editor).exists())

    def test_yonetici_olmayan_superuser_hedefi_sifirlayamaz(self):
        su = self.kullanici_olustur("su", None, is_superuser=True)
        self.cihaz_ver(su)
        self.editor.user_permissions.add(Permission.objects.get(codename="change_user"))
        self.giris(self.editor)
        self.assertEqual(self.client.post(f"/panel/kullanicilar/{su.pk}/mfa-sifirla").status_code, 403)

    def test_kendi_mfasini_sifirlamak_kod_ister(self):
        cihaz = self.cihaz_ver(self.yonetici)
        self.giris(self.yonetici)
        # Kullanıcı listesinden kendini sıfırlama denemesi kod ekranına gider, silmez.
        self.assertRedirects(self.client.post(f"/panel/kullanicilar/{self.yonetici.pk}/mfa-sifirla"), "/panel/hesap/mfa/sifirla", fetch_redirect_response=False)
        self.assertTrue(MFACihazi.objects.filter(kullanici=self.yonetici).exists())
        with mock.patch(SIMDI, return_value=T0):
            self.client.post("/panel/hesap/mfa/sifirla", {"kod": "000000" if kod_uret(cihaz) != "000000" else "999999"})
            self.assertTrue(MFACihazi.objects.filter(kullanici=self.yonetici).exists())
            self.client.post("/panel/hesap/mfa/sifirla", {"kod": kod_uret(cihaz)})
        self.assertFalse(MFACihazi.objects.filter(kullanici=self.yonetici).exists())
        self.assertTrue(DenetimKaydi.objects.filter(eylem="mfa_sifirlandi", kullanici=self.yonetici).exists())

    def test_komut_mfa_sifirla(self):
        self.cihaz_ver(self.editor)
        cikti = StringIO()
        call_command("mfa_sifirla", "editor", stdout=cikti)
        self.assertFalse(MFACihazi.objects.filter(kullanici=self.editor).exists())
        self.assertTrue(DenetimKaydi.objects.filter(eylem="mfa_sifirlandi", ozet__contains="editor").exists())
        with self.assertRaises(CommandError):
            call_command("mfa_sifirla", "yok-boyle-biri", stdout=cikti)

    # --- Parola değiştirme ---
    def test_parola_degistirme(self):
        self.giris(self.editor)
        yeni = "Yepyeni-Parola-9917?"
        kotu = self.client.post("/panel/hesap/parola", {"old_password": "yanlis", "new_password1": yeni, "new_password2": yeni})
        self.assertEqual(kotu.status_code, 200)
        zayif = self.client.post("/panel/hesap/parola", {"old_password": PAROLA, "new_password1": "12345678", "new_password2": "12345678"})
        self.assertEqual(zayif.status_code, 200)
        self.editor.refresh_from_db()
        self.assertTrue(self.editor.check_password(PAROLA))
        yanit = self.client.post("/panel/hesap/parola", {"old_password": PAROLA, "new_password1": yeni, "new_password2": yeni})
        self.assertRedirects(yanit, "/panel/hesap/", fetch_redirect_response=False)
        self.editor.refresh_from_db()
        self.assertTrue(self.editor.check_password(yeni))
        self.assertEqual(self.client.get("/panel/hesap/").status_code, 200)  # oturum düşmedi
        self.assertTrue(DenetimKaydi.objects.filter(eylem="parola_degisti", kullanici=self.editor).exists())

    def test_parola_degistirme_girissiz_yonlenir(self):
        self.assertEqual(self.client.get("/panel/hesap/parola").status_code, 302)
