"""Güvenlik denetimi 1: API anahtarı güvenliği.

Anahtar oluşturmada parola/TOTP, hesap olaylarında otomatik iptal, kullanıcı başına hız sınırı ve anahtar üst sınırı,
stats/db-stats önbelleği, parola girişi denetim kaydı sınırı, sensitive_post_parameters."""
from datetime import timedelta
from io import StringIO
from unittest import mock

import pyotp
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone

from qr import roller
from qr.models import ApiAnahtari, DenetimKaydi, KullaniciApiAyari, MFACihazi

from .yardimci import PAROLA, TemelTest

API = "/api/v1/"
YENI = "/panel/api-anahtarlari/yeni"
SIMDI = "qr.panel.mfa._simdi"
T0 = 1_800_000_000.0


def baslik(anahtar):
    return {"HTTP_AUTHORIZATION": f"Bearer {anahtar}"}


class OlusturmaKimlikTesti(TemelTest):
    def setUp(self):
        super().setUp()
        self.giris(self.editor)

    def test_parolasiz_olusmaz(self):
        yanit = self.client.post(YENI, {"ad": "x"})
        self.assertEqual(yanit.status_code, 200)
        self.assertFalse(ApiAnahtari.objects.exists())

    def test_yanlis_parola_olusmaz_sayaca_yazilir_denetlenir(self):
        yanit = self.client.post(YENI, {"ad": "x", "parola": "yanlis-parola-1"})
        self.assertEqual(yanit.status_code, 200)
        self.assertContains(yanit, "Parola veya doğrulama kodu hatalı")
        self.assertNotContains(yanit, "yanlis-parola-1")
        self.assertFalse(ApiAnahtari.objects.exists())
        self.assertTrue(DenetimKaydi.objects.filter(eylem="api_anahtari_olustur_basarisiz").exists())
        # Panelle ortak giriş sayaçları (api-ayar öneki): 5 başarısızlıktan sonra doğru parola da kilitli (429).
        for _ in range(4):
            self.client.post(YENI, {"ad": "x", "parola": "yanlis-parola-1"})
        kilitli = self.client.post(YENI, {"ad": "x", "parola": PAROLA})
        self.assertEqual(kilitli.status_code, 429)
        self.assertFalse(ApiAnahtari.objects.exists())

    def test_dogru_parola_olusturur(self):
        yanit = self.client.post(YENI, {"ad": "Betik", "parola": PAROLA})
        self.assertEqual(yanit.status_code, 200)
        duz = yanit.context["anahtar"]
        self.assertEqual(ApiAnahtari.dogrula(duz).kullanici, self.editor)
        self.assertTrue(DenetimKaydi.objects.filter(eylem="api_anahtari_olustur").exists())

    def test_mfa_etkinse_totp_zorunlu_ve_tekrar_kullanilamaz(self):
        cihaz = MFACihazi.objects.create(kullanici=self.editor, gizli_anahtar=pyotp.random_base32(), onayli=True)
        kod = pyotp.TOTP(cihaz.gizli_anahtar).at(int(T0))
        with mock.patch(SIMDI, return_value=T0):
            self.client.post(YENI, {"ad": "a", "parola": PAROLA})  # kod yok
            self.assertFalse(ApiAnahtari.objects.exists())
            self.client.post(YENI, {"ad": "a", "parola": PAROLA, "totp": "000000"})
            self.assertFalse(ApiAnahtari.objects.exists())
            self.client.post(YENI, {"ad": "a", "parola": "yanlis-parola-1", "totp": kod})  # yanlış parola, doğru kod
            self.assertFalse(ApiAnahtari.objects.exists())
            self.assertEqual(self.client.post(YENI, {"ad": "a", "parola": PAROLA, "totp": kod}).status_code, 200)
            self.assertEqual(ApiAnahtari.objects.count(), 1)
            # Aynı kod ikinci kez kabul edilmez.
            self.client.post(YENI, {"ad": "b", "parola": PAROLA, "totp": kod})
            self.assertEqual(ApiAnahtari.objects.count(), 1)

    def test_mfasiz_kullanici_totp_istemez(self):
        self.assertFalse(MFACihazi.objects.filter(kullanici=self.editor).exists())
        self.assertEqual(self.client.post(YENI, {"ad": "a", "parola": PAROLA}).status_code, 200)
        self.assertEqual(ApiAnahtari.objects.count(), 1)

    def test_azami_anahtar(self):
        with override_settings(API_AZAMI_ANAHTAR=2):
            for ad in ("a", "b"):
                self.assertEqual(self.client.post(YENI, {"ad": ad, "parola": PAROLA}).status_code, 200)
            yanit = self.client.post(YENI, {"ad": "c", "parola": PAROLA})
            self.assertEqual(yanit.status_code, 400)
            self.assertContains(yanit, "En fazla 2 aktif API anahtarınız olabilir", status_code=400)
            self.assertEqual(ApiAnahtari.objects.count(), 2)
            # Biri iptal edilince yenisi oluşturulabilir (iptal edilenler sayılmaz).
            ApiAnahtari.objects.filter(ad="a").update(iptal_zamani=timezone.now())
            self.assertEqual(self.client.post(YENI, {"ad": "c", "parola": PAROLA}).status_code, 200)

    def test_varsayilan_azami_10(self):
        from django.conf import settings

        self.assertEqual(settings.API_AZAMI_ANAHTAR, 10)

    def test_olusturma_ucu_hiz_sinirli(self):
        with override_settings(API_ANAHTAR_OLUSTURMA_HIZ_SINIRI=2):
            self.assertEqual(self.client.post(YENI, {"ad": "a", "parola": "yanlis-parola-1"}).status_code, 200)
            self.assertEqual(self.client.post(YENI, {"ad": "a", "parola": "yanlis-parola-1"}).status_code, 200)
            yanit = self.client.post(YENI, {"ad": "a", "parola": PAROLA})
            self.assertEqual(yanit.status_code, 429)
            self.assertEqual(yanit["Retry-After"], "60")
            self.assertFalse(ApiAnahtari.objects.exists())

    def test_parola_alanlari_hassas_isaretli(self):
        """sensitive_post_parameters: istek nesnesine işaretlenir (hata raporlarında alanlar gizlenir)."""
        yanit = self.client.post(YENI, {"ad": "a", "parola": PAROLA})
        self.assertEqual(set(yanit.wsgi_request.sensitive_post_parameters), {"parola", "totp"})
        yanit = self.client.post(API, {"action": "version", "username": "editor", "password": "x"})
        self.assertEqual(set(yanit.wsgi_request.sensitive_post_parameters), {"password", "totp"})
        self.client.logout()
        yanit = self.client.post("/panel/giris", {"username": "editor", "password": "x"})
        self.assertIn("password", yanit.wsgi_request.sensitive_post_parameters)


class OtomatikIptalTesti(TemelTest):
    def hazirla(self, kullanici=None):
        kullanici = kullanici or self.editor
        k1, d1 = ApiAnahtari.uret(kullanici, "bir")
        k2, d2 = ApiAnahtari.uret(kullanici, "iki")
        KullaniciApiAyari.objects.update_or_create(kullanici=kullanici, defaults={"parola_girisi": True})
        return (k1, d1), (k2, d2)

    def kontrol(self, kullanici, neden_parcasi, kayitlar=1):
        self.assertFalse(ApiAnahtari.objects.filter(kullanici=kullanici, iptal_zamani__isnull=True).exists())
        self.assertEqual(ApiAnahtari.objects.filter(kullanici=kullanici).count(), 2)  # satırlar silinmez
        self.assertFalse(KullaniciApiAyari.objects.get(kullanici=kullanici).parola_girisi)
        kayit = DenetimKaydi.objects.filter(eylem="api_erisimi_kapatildi", nesne_id=str(kullanici.pk))
        self.assertEqual(kayit.count(), kayitlar)
        self.assertIn(neden_parcasi, kayit.first().ozet)

    def test_panelden_parola_degistirme(self):
        (_, d1), _ = self.hazirla()
        self.giris(self.editor)
        yeni = "Yepyeni-Parola-9917?"
        yanit = self.client.post("/panel/hesap/parola", {"old_password": PAROLA, "new_password1": yeni, "new_password2": yeni})
        self.assertEqual(yanit.status_code, 302)
        self.kontrol(self.editor, "parola değiştirildi")
        self.assertIsNone(ApiAnahtari.dogrula(d1))

    def test_basarisiz_parola_degistirme_iptal_etmez(self):
        self.hazirla()
        self.giris(self.editor)
        self.client.post("/panel/hesap/parola", {"old_password": "yanlis", "new_password1": "Yepyeni-Parola-9917?", "new_password2": "Yepyeni-Parola-9917?"})
        self.assertEqual(ApiAnahtari.objects.filter(kullanici=self.editor, iptal_zamani__isnull=True).count(), 2)

    def test_changepassword_komutu(self):
        self.hazirla()
        yeni = "Komut-Parolasi-5521?"
        with mock.patch("getpass.getpass", side_effect=[yeni, yeni]):
            call_command("changepassword", "editor", stdout=StringIO())
        self.kontrol(self.editor, "parola değiştirildi")

    def test_set_password_save(self):
        self.hazirla()
        k = type(self.editor).objects.get(pk=self.editor.pk)
        k.set_password("Baska-Parola-3318?")
        k.save()
        self.kontrol(self.editor, "parola değiştirildi")

    def test_hash_yeniden_hesaplanmasi_iptal_etmez(self):
        """Giriş sırasında Django'nun eski algoritmayı yükseltmesi parola değişimi sayılmaz."""
        self.hazirla()
        with override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.PBKDF2PasswordHasher", "django.contrib.auth.hashers.MD5PasswordHasher"]):
            k = type(self.editor).objects.get(pk=self.editor.pk)
            self.assertTrue(k.check_password(PAROLA))  # MD5 -> PBKDF2 yükseltmesi, save(update_fields=["password"])
            self.assertTrue(k.password.startswith("pbkdf2_"))
        self.assertEqual(ApiAnahtari.objects.filter(kullanici=self.editor, iptal_zamani__isnull=True).count(), 2)
        self.assertTrue(KullaniciApiAyari.objects.get(kullanici=self.editor).parola_girisi)

    def test_alakasiz_kayit_iptal_etmez(self):
        self.hazirla()
        k = type(self.editor).objects.get(pk=self.editor.pk)
        k.first_name = "Ad"
        k.last_login = timezone.now()
        k.save()
        self.assertEqual(ApiAnahtari.objects.filter(kullanici=self.editor, iptal_zamani__isnull=True).count(), 2)

    def test_panel_mfa_sifirlama(self):
        self.hazirla()
        MFACihazi.objects.create(kullanici=self.editor, gizli_anahtar=pyotp.random_base32(), onayli=True)
        self.giris(self.yonetici)
        self.assertEqual(self.client.post(f"/panel/kullanicilar/{self.editor.pk}/mfa-sifirla").status_code, 302)
        self.kontrol(self.editor, "MFA sıfırlandı")

    def test_kendi_mfasini_sifirlama(self):
        self.hazirla(self.yonetici)
        cihaz = MFACihazi.objects.create(kullanici=self.yonetici, gizli_anahtar=pyotp.random_base32(), onayli=True)
        self.giris(self.yonetici)
        with mock.patch(SIMDI, return_value=T0):
            self.client.post("/panel/hesap/mfa/sifirla", {"kod": pyotp.TOTP(cihaz.gizli_anahtar).at(int(T0))})
        self.kontrol(self.yonetici, "MFA sıfırlandı")

    def test_komutla_mfa_sifirlama(self):
        self.hazirla()
        MFACihazi.objects.create(kullanici=self.editor, gizli_anahtar=pyotp.random_base32(), onayli=True)
        call_command("mfa_sifirla", "editor", stdout=StringIO())
        self.kontrol(self.editor, "MFA sunucu konsolundan")

    def test_rol_degisikligi_panel(self):
        self.hazirla()
        self.giris(self.yonetici)
        yanit = self.client.post(f"/panel/kullanicilar/{self.editor.pk}/duzenle", {"first_name": "", "last_name": "", "email": "e@example.com", "is_active": "on", "rol": roller.IZLEYICI})
        self.assertEqual(yanit.status_code, 302)
        self.kontrol(self.editor, "rol")

    def test_ayni_rolle_kaydetmek_iptal_etmez(self):
        self.hazirla()
        self.giris(self.yonetici)
        self.client.post(f"/panel/kullanicilar/{self.editor.pk}/duzenle", {"first_name": "A", "last_name": "", "email": "e@example.com", "is_active": "on", "rol": roller.EDITOR})
        self.assertEqual(ApiAnahtari.objects.filter(kullanici=self.editor, iptal_zamani__isnull=True).count(), 2)

    def test_ters_yonde_grup_degisikligi(self):
        self.hazirla()
        Group.objects.get(name=roller.EDITOR).user_set.remove(self.editor)
        self.kontrol(self.editor, "rol")

    def test_pasiflestirme_panel(self):
        (_, d1), _ = self.hazirla()
        self.giris(self.yonetici)
        yanit = self.client.post(f"/panel/kullanicilar/{self.editor.pk}/duzenle", {"first_name": "", "last_name": "", "email": "e@example.com", "rol": roller.EDITOR})
        self.assertEqual(yanit.status_code, 302)
        self.editor.refresh_from_db()
        self.assertFalse(self.editor.is_active)
        self.kontrol(self.editor, "pasifleştirildi")
        # Yeniden etkinleştirmek iptal edilen anahtarları geri getirmez.
        self.editor.is_active = True
        self.editor.save()
        self.assertIsNone(ApiAnahtari.dogrula(d1))

    def test_diger_kullanicilar_etkilenmez(self):
        self.hazirla()
        self.hazirla(self.izleyici)
        self.editor.set_password("Baska-Parola-3318?")
        self.editor.save()
        self.assertEqual(ApiAnahtari.objects.filter(kullanici=self.izleyici, iptal_zamani__isnull=True).count(), 2)
        self.assertTrue(KullaniciApiAyari.objects.get(kullanici=self.izleyici).parola_girisi)

    def test_etki_yoksa_denetim_kaydi_yazilmaz(self):
        self.editor.set_password("Baska-Parola-3318?")
        self.editor.save()
        self.assertFalse(DenetimKaydi.objects.filter(eylem="api_erisimi_kapatildi").exists())


class HizSiniriTesti(TemelTest):
    def hazirla_parola(self, kullanici):
        KullaniciApiAyari.objects.update_or_create(kullanici=kullanici, defaults={"parola_girisi": True})

    def test_kullanici_ortak_sayaci_anahtarlari_toplar(self):
        _, d1 = ApiAnahtari.uret(self.editor, "a")
        _, d2 = ApiAnahtari.uret(self.editor, "b")
        diger, dd = ApiAnahtari.uret(self.izleyici, "c")
        with override_settings(API_HIZ_SINIRI=100, API_KULLANICI_HIZ_SINIRI=3):
            kodlar = [self.client.get(API, {"action": "version"}, **baslik(d)).status_code for d in (d1, d2, d1, d2)]
            self.assertEqual(kodlar, [200, 200, 200, 429])
            self.assertEqual(self.client.get(API, {"action": "version"}, **baslik(dd)).status_code, 200)  # başka kullanıcı etkilenmez

    def test_anahtar_sayaci_hala_gecerli(self):
        _, d1 = ApiAnahtari.uret(self.editor, "a")
        _, d2 = ApiAnahtari.uret(self.editor, "b")
        with override_settings(API_HIZ_SINIRI=1, API_KULLANICI_HIZ_SINIRI=100):
            self.assertEqual(self.client.get(API, {"action": "version"}, **baslik(d1)).status_code, 200)
            self.assertEqual(self.client.get(API, {"action": "version"}, **baslik(d1)).status_code, 429)
            self.assertEqual(self.client.get(API, {"action": "version"}, **baslik(d2)).status_code, 200)

    def test_parola_girisi_ayni_kullanici_sayacini_kullanir(self):
        self.hazirla_parola(self.editor)
        _, duz = ApiAnahtari.uret(self.editor, "a")
        with override_settings(API_HIZ_SINIRI=100, API_KULLANICI_HIZ_SINIRI=2):
            self.assertEqual(self.client.get(API, {"action": "version"}, **baslik(duz)).status_code, 200)
            self.assertEqual(self.client.post(API, {"action": "version", "username": "editor", "password": PAROLA}).status_code, 200)
            self.assertEqual(self.client.get(API, {"action": "version"}, **baslik(duz)).status_code, 429)
            self.assertEqual(self.client.post(API, {"action": "version", "username": "editor", "password": PAROLA}).status_code, 429)


class OnbellekTesti(TemelTest):
    def setUp(self):
        super().setUp()
        self.kayit, self.duz = ApiAnahtari.uret(self.editor, "a")
        self.qr_yap("AAA-1")

    def get(self, duz=None, **veri):
        return self.client.get(API, veri, **baslik(duz or self.duz))

    def test_db_stats_onbellekte_60_sn(self):
        self.assertEqual(self.get(action="db-stats").json()["toplam_kod"], 1)
        self.qr_yap("BBB-1")
        self.assertEqual(self.get(action="db-stats").json()["toplam_kod"], 1)  # önbellekten
        cache.clear()
        self.assertEqual(self.get(action="db-stats").json()["toplam_kod"], 2)

    def test_onbellek_suresi_60(self):
        with mock.patch("qr.api.cache") as c:
            c.get.return_value = None
            self.get(action="db-stats")
            self.get(action="stats")
        self.assertEqual([cagri.args[2] for cagri in c.set.call_args_list], [60, 60])

    def test_stats_parametreye_gore_ayri_anahtar(self):
        self.qr_yap("BBB-1")
        self.assertEqual(len(self.get(action="stats", limit=1).json()["links"]), 1)
        self.assertEqual(len(self.get(action="stats", limit=5).json()["links"]), 2)
        self.assertEqual(len(self.get(action="stats", limit=1).json()["links"]), 1)

    def test_onbellek_kullaniciya_ozel(self):
        _, baska = ApiAnahtari.uret(self.izleyici, "b")
        self.get(action="stats")
        with mock.patch("qr.api._genel_toplamlar", wraps=lambda: {"toplam_kod": 99, "toplam_tarama_bot_haric": 0, "toplam_tarama_bot_dahil": 0}):
            self.assertEqual(self.get(baska, action="stats").json()["toplam_kod"], 99)  # editor'ün önbelleği başkasına verilmez
            self.assertNotEqual(self.get(action="stats").json()["toplam_kod"], 99)

    def test_rand_onbelleklenmez_ve_limit_10(self):
        for i in range(15):
            self.qr_yap(f"R-{i:02d}")
        ilk = self.get(action="stats", filter="rand", limit=100).json()
        self.assertEqual(len(ilk["links"]), 10)
        self.assertEqual(len({l["keyword"] for l in ilk["links"]}), 10)
        with mock.patch("qr.api.cache") as c:
            self.get(action="stats", filter="rand")
        c.get.assert_not_called()
        c.set.assert_not_called()

    def test_rand_az_kodda_hepsini_verir(self):
        self.assertEqual(len(self.get(action="stats", filter="rand", limit=100).json()["links"]), 1)


class ParolaGirisiDenetimTesti(TemelTest):
    def giris_post(self, parola=PAROLA):
        return self.client.post(API, {"action": "version", "username": "editor", "password": parola})

    def setUp(self):
        super().setUp()
        KullaniciApiAyari.objects.update_or_create(kullanici=self.editor, defaults={"parola_girisi": True})

    def sayi(self, eylem="api_giris_basarili"):
        return DenetimKaydi.objects.filter(eylem=eylem, kullanici=self.editor).count()

    def test_saatte_en_fazla_bir_basarili_kayit(self):
        for _ in range(3):
            self.assertEqual(self.giris_post().status_code, 200)
        self.assertEqual(self.sayi(), 1)

    def test_bir_saat_sonra_yeniden_yazilir(self):
        self.giris_post()
        gelecek = mock.Mock()
        gelecek.now.return_value = timezone.now() + timedelta(hours=1, minutes=1)
        with mock.patch("qr.api.timezone", gelecek):
            self.giris_post()
        self.assertEqual(self.sayi(), 2)

    def test_kullanici_basina(self):
        KullaniciApiAyari.objects.update_or_create(kullanici=self.izleyici, defaults={"parola_girisi": True})
        self.giris_post()
        self.client.post(API, {"action": "version", "username": "izleyici", "password": PAROLA})
        self.assertEqual(DenetimKaydi.objects.filter(eylem="api_giris_basarili").count(), 2)

    def test_basarisizliklar_aynen_yazilir(self):
        for _ in range(3):
            self.giris_post("yanlis-parola-1")
        self.assertEqual(DenetimKaydi.objects.filter(eylem="api_giris_basarisiz").count(), 3)
        self.assertEqual(self.sayi(), 0)
