"""Yönetim erişimi: varsayılan KAPALI (beyaz liste). Yalnızca kısa bağlantılar internete açıktır.

Test ortamında `manage.py test` YONETIM_ERISIMI=acik ile çalışır (config/settings.py); burada kısıt override_settings ile
açıkça `kisitli` yapılır. Üretim varsayılanı (kisitli) ayrı süreçlerle doğrulanır.
"""
import logging
import os
import subprocess
import sys
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, override_settings

from qr import ag_kisiti
from qr.models import GenelAyarlar, KampanyaSayfasi, LinkAgaci, Tarama

from .yardimci import TemelTest

IZINLI = "203.0.113.0/24"
IZINLI_IP = "203.0.113.7"
DISARI_IP = "198.51.100.23"
APP_DIZINI = Path(settings.BASE_DIR)


def ayar_sureci(**ek):
    """settings'i test kipi OLMADAN (üretim gibi) yeni süreçte içe aktarıp (kip, ağ sayısı) basar."""
    ortam = {k: v for k, v in os.environ.items() if not k.startswith(("YONETIM_", "QR_EKLENTILER"))}
    ortam.update({
        "DJANGO_SETTINGS_MODULE": "config.settings", "DJANGO_DEBUG": "1", "DJANGO_SECRET_KEY": "test-" + "x" * 60,
        "POSTGRES_PASSWORD": "test", "MFA_SIFRELEME_ANAHTARI": settings.MFA_SIFRELEME_ANAHTARI,
    })
    ortam.update(ek)
    kod = "import django; django.setup(); from django.conf import settings; print(settings.YONETIM_ERISIMI, len(settings.YONETIM_IZINLI_AGLAR))"
    return subprocess.run([sys.executable, "-c", kod], cwd=APP_DIZINI, env=ortam, capture_output=True, text=True, timeout=60)


class KipAyristirmaTesti(SimpleTestCase):
    def test_gecerli_degerler_ve_varsayilan(self):
        self.assertEqual(ag_kisiti.erisim_kipini_oku(None), "kisitli")
        self.assertEqual(ag_kisiti.erisim_kipini_oku(""), "kisitli")
        self.assertEqual(ag_kisiti.erisim_kipini_oku(" Kisitli "), "kisitli")
        self.assertEqual(ag_kisiti.erisim_kipini_oku("ACIK"), "acik")

    def test_gecersiz_deger_reddedilir(self):
        for kotu in ("evet", "1", "true", "açık", "kapali", "acik,kisitli", "*"):
            with self.subTest(deger=kotu), self.assertRaises(ImproperlyConfigured) as hata:
                ag_kisiti.erisim_kipini_oku(kotu)
            self.assertIn("YONETIM_ERISIMI", str(hata.exception))

    def test_uretim_varsayilani_kisitli_ve_liste_bos(self):
        s = ayar_sureci()
        self.assertEqual(s.returncode, 0, s.stderr)
        self.assertEqual(s.stdout.split(), ["kisitli", "0"])

    def test_ortamdan_acik_ve_kisitli(self):
        self.assertEqual(ayar_sureci(YONETIM_ERISIMI="acik").stdout.split(), ["acik", "0"])
        self.assertEqual(ayar_sureci(YONETIM_ERISIMI="kisitli", YONETIM_IZINLI_AGLAR=IZINLI).stdout.split(), ["kisitli", "1"])

    def test_gecersiz_ortam_degeri_uygulamayi_baslatmaz(self):
        s = ayar_sureci(YONETIM_ERISIMI="belki")
        self.assertNotEqual(s.returncode, 0)
        self.assertIn("ImproperlyConfigured", s.stderr)
        self.assertIn("YONETIM_ERISIMI", s.stderr)

    def test_test_kipinde_acik_uretimde_degil(self):
        self.assertEqual(settings.YONETIM_ERISIMI, "acik")   # manage.py test için bilinçli (settings.py)

    def test_acilis_uyarisi_yalniz_kapaliyken_tek_satir(self):
        with override_settings(YONETIM_ERISIMI="kisitli", YONETIM_IZINLI_AGLAR=()):
            with self.assertLogs("qr.ag_kisiti", "WARNING") as kayit:
                ag_kisiti.acilis_uyarisi_yaz()
        self.assertEqual(len(kayit.records), 1)
        self.assertNotIn("\n", kayit.records[0].getMessage())
        with override_settings(YONETIM_ERISIMI="kisitli", YONETIM_IZINLI_AGLAR=ag_kisiti.aglari_oku(IZINLI)), \
                self.assertNoLogs("qr.ag_kisiti", logging.WARNING):
            ag_kisiti.acilis_uyarisi_yaz()
        with override_settings(YONETIM_ERISIMI="acik", YONETIM_IZINLI_AGLAR=()), self.assertNoLogs("qr.ag_kisiti", logging.WARNING):
            ag_kisiti.acilis_uyarisi_yaz()


class YolSiniflandirmaTesti(SimpleTestCase):
    ACIK = ("/k/abc", "/k/abc+", "/k/abc+all", "/l/agac", "/l/agac/stil.css", "/s/sayfa", "/saglik", "/robots.txt",
            "/static/qr/panel.css", "/medya/a.png", "/medya/alt/b.png", "/ic/medya-yetki")
    KISITLI = ("/", "/panel/", "/panel", "/panel/giris", "/api/v1/", "/api", "/admin/", "/admin/login/", "/giris", "/yok-yol",
               "//panel", "//panel/giris", "/panel//x", "/PANEL/", "/Panel/giris", "/%70anel/", "/k/../panel/", "/k/./x", "/l/../api/v1/",
               "/static/../panel/", "/static/%2e%2e/panel/", "/medya/../panel/", "/ic/../panel/", "/k//x", "/k/", "/k", "/s/", "/l",
               "/saglik/", "/robots.txt/x", "/saglikx", "/K/abc", "/SAGLIK", "/k\\..\\panel", "/k/abc\x00", "/k/a%2Fb", "panel/", "",
               "/staticx/a", "/static", "/static/")

    def test_beyaz_liste(self):
        for yol in self.ACIK:
            with self.subTest(yol=yol):
                self.assertTrue(ag_kisiti.acik_yol_mu(yol))
                self.assertFalse(ag_kisiti.kisitli_yol_mu(yol))

    def test_digerleri_kisitli(self):
        for yol in self.KISITLI:
            with self.subTest(yol=yol):
                self.assertTrue(ag_kisiti.kisitli_yol_mu(yol))

    @override_settings(STATIC_URL="https://cdn.example.com/static/")
    def test_statik_onek_tam_adres_olsa_da_yol_kismi_kullanilir(self):
        self.assertTrue(ag_kisiti.acik_yol_mu("/static/x.css"))

    @override_settings(STATIC_URL="/")
    def test_statik_onek_kok_ise_beyaz_listeyi_genisletmez(self):
        self.assertTrue(ag_kisiti.kisitli_yol_mu("/panel/"))


class YonetimErisimiTesti(TemelTest):
    def sayfa(self, yol, ip=DISARI_IP, xff=None, **ek):
        ek["REMOTE_ADDR"] = ip
        if xff is not None:
            ek["HTTP_X_FORWARDED_FOR"] = xff
        return self.client.get(yol, **ek)

    def kip(self, kip="kisitli", aglar="", **ek):
        return override_settings(YONETIM_ERISIMI=kip, YONETIM_IZINLI_AGLAR=ag_kisiti.aglari_oku(aglar), **ek)

    def test_varsayilan_kapali_bos_listede_herkese_404(self):
        with self.kip():
            for ip in (IZINLI_IP, DISARI_IP, "127.0.0.1", "::1", "10.0.0.5"):
                for yol in ("/panel/giris", "/panel/", "/api/v1/", "/admin/", "/", "/yok-yol"):
                    with self.subTest(ip=ip, yol=yol):
                        self.assertEqual(self.sayfa(yol, ip=ip).status_code, 404)

    def test_oturum_acmis_yonetici_bile_bos_listede_panele_giremez(self):
        self.giris(self.yonetici)
        with self.kip():
            self.assertEqual(self.sayfa("/panel/", ip="127.0.0.1").status_code, 404)

    def test_izinli_ip_gecer(self):
        with self.kip(aglar=IZINLI):
            self.assertEqual(self.sayfa("/panel/giris", ip=IZINLI_IP).status_code, 200)
            self.assertEqual(self.sayfa("/api/v1/", ip=IZINLI_IP).status_code, 401)   # 404 değil: kimlik istenir
            self.assertEqual(self.sayfa("/", ip=IZINLI_IP).status_code, 302)          # kök panele yönlenir

    def test_izinsiz_ip_404(self):
        with self.kip(aglar=IZINLI):
            for yol in ("/panel/giris", "/panel/", "/api/v1/", "/admin/", "/", "/yok-yol"):
                with self.subTest(yol=yol):
                    self.assertEqual(self.sayfa(yol, ip=DISARI_IP).status_code, 404)

    def test_beyaz_listedeki_acik_yollar_kapali_modda_calisir(self):
        qr = self.qr_yap("YE0001", hedef="https://example.com/ye")
        ayar = GenelAyarlar.al()
        ayar.herkese_acik_istatistik = True
        ayar.save()
        sayfa = KampanyaSayfasi.objects.create(slug="ye-sayfasi", baslik="Ye", durum="yayinda")
        agac = LinkAgaci(slug="ye-agaci", baslik="Ye", durum="yayinda")
        agac.full_clean()
        agac.save()
        for aglar in ("", IZINLI):
            with self.kip(aglar=aglar):
                for ip in (DISARI_IP, IZINLI_IP):
                    kw = {"ip": ip}
                    with self.subTest(aglar=aglar, ip=ip):
                        yonlendirme = self.sayfa("/k/YE0001", **kw)
                        self.assertEqual(yonlendirme.status_code, 302)
                        self.assertEqual(yonlendirme["Location"], "https://example.com/ye")
                        self.assertEqual(self.sayfa("/k/YE0001+", **kw).status_code, 200)
                        self.assertEqual(self.sayfa("/l/ye-agaci", **kw).status_code, 200)
                        self.assertEqual(self.sayfa("/l/ye-agaci/stil.css", **kw).status_code, 200)
                        self.assertEqual(self.sayfa(f"/s/{sayfa.slug}", **kw).status_code, 200)
                        self.assertEqual(self.sayfa("/saglik", **kw).status_code, 200)
                        self.assertEqual(self.sayfa("/robots.txt", **kw).status_code, 200)
                        self.assertEqual(self.sayfa("/k/YOKKOD", **kw).status_code, 404)   # kısıttan değil, kod yok
        self.assertGreaterEqual(Tarama.objects.filter(qr=qr).count(), 1)

    def test_ic_ve_medya_yollari_kisita_takilmaz(self):
        with self.kip():
            # Görünümün kendi yanıtı (yetkisiz -> 401/403/404 olabilir) önemli değil; kısıt ara katmanı 404'ü "Http404" ile
            # üretmiyor olmalı: ara katmanı doğrudan çağırarak sınanır.
            from django.http import HttpResponse
            from django.test import RequestFactory

            ara = ag_kisiti.YonetimAgKisitiMiddleware(lambda r: HttpResponse("ok"))
            for yol in ("/ic/medya-yetki", "/medya/a.png", "/static/qr/panel.css"):
                istek = RequestFactory().get(yol, REMOTE_ADDR=DISARI_IP)
                self.assertEqual(ara(istek).status_code, 200, yol)

    def test_atlatma_denemeleri(self):
        self.giris(self.yonetici)
        with self.kip():                           # boş liste
            for yol in ("//panel", "//panel/giris", "/PANEL/", "/Panel/giris", "/k/../panel/", "/%70anel/", "/static/../panel/",
                        "/medya/../panel/", "/l/../panel/", "/panel/../panel/", "/./panel/", "/api//v1/", "/ADMIN/", "/%61pi/v1/"):
                with self.subTest(yol=yol):
                    self.assertEqual(self.sayfa(yol, ip=IZINLI_IP).status_code, 404)
        with self.kip(aglar=IZINLI):                # izinsiz IP, dolu liste
            for yol in ("//panel", "/PANEL/", "/k/../panel/", "/%70anel/", "/static/../panel/", "/%2e/panel/", "/k/a%2F..%2Fpanel/"):
                with self.subTest(yol=yol):
                    self.assertEqual(self.sayfa(yol, ip=DISARI_IP).status_code, 404)

    def test_script_name_path_info_farki_atlatma_yaratmaz(self):
        # Karar URL çözümleyicinin gördüğü path_info ile verilir; SCRIPT_NAME beyaz listeye sayılmaz.
        from django.http import HttpResponse
        from django.test import RequestFactory

        ara = ag_kisiti.YonetimAgKisitiMiddleware(lambda r: HttpResponse("ok"))
        with self.kip():
            istek = RequestFactory().get("/panel/", REMOTE_ADDR=DISARI_IP, SCRIPT_NAME="/k")
            self.assertEqual(istek.path_info, "/panel/")
            with self.assertRaises(Exception) as hata:
                ara(istek)
            self.assertEqual(type(hata.exception).__name__, "Http404")
            istek = RequestFactory().get("/abc", REMOTE_ADDR=DISARI_IP, SCRIPT_NAME="/panel")
            self.assertEqual(istek.path_info, "/abc")
            with self.assertRaises(Exception):
                ara(istek)                        # /abc beyaz listede değil

    def test_acik_mod_eski_davranis(self):
        with self.kip("acik"):
            self.assertEqual(self.sayfa("/panel/giris", ip=DISARI_IP).status_code, 200)
            self.assertEqual(self.sayfa("/api/v1/", ip=DISARI_IP).status_code, 401)
            self.assertEqual(self.sayfa("/", ip=DISARI_IP).status_code, 302)
        with self.kip("acik", aglar=IZINLI):     # liste doluysa yine uygulanır
            self.assertEqual(self.sayfa("/panel/giris", ip=DISARI_IP).status_code, 404)
            self.assertEqual(self.sayfa("/panel/giris", ip=IZINLI_IP).status_code, 200)

    def test_ayar_eksikse_guvenli_taraf(self):
        with override_settings():
            del settings.YONETIM_ERISIMI
            self.assertEqual(self.sayfa("/panel/giris", ip=IZINLI_IP).status_code, 404)

    def test_xff_sahteciligi(self):
        with self.kip(aglar=IZINLI, GUVENILIR_VEKIL=True):
            self.assertEqual(self.sayfa("/panel/giris", ip="172.28.0.2", xff=f"{IZINLI_IP}, {DISARI_IP}").status_code, 404)
            self.assertEqual(self.sayfa("/panel/giris", ip="172.28.0.2", xff=f"{DISARI_IP}, {IZINLI_IP}").status_code, 200)
            for bozuk in ("bozuk", f"{IZINLI_IP}, bozuk", "unknown", ""):
                self.assertEqual(self.sayfa("/panel/giris", ip="172.28.0.2", xff=bozuk).status_code, 404, bozuk)
        with self.kip(aglar=IZINLI, GUVENILIR_VEKIL=False):      # vekil güvenilmiyorsa başlık yok sayılır
            self.assertEqual(self.sayfa("/panel/giris", ip=DISARI_IP, xff=IZINLI_IP).status_code, 404)
        with self.kip(GUVENILIR_VEKIL=True):                     # boş listede sahte başlık hiçbir şey açmaz
            self.assertEqual(self.sayfa("/panel/giris", ip="172.28.0.2", xff=IZINLI_IP).status_code, 404)

    def test_sistem_bilgisi_satiri(self):
        self.giris(self.yonetici)
        with self.kip("kisitli", IZINLI):
            self.assertIn("Yalnız izinli ağlar (1 ağ)", self.sayfa("/panel/sistem-bilgisi", ip=IZINLI_IP).content.decode())
        with self.kip("acik"):
            self.assertIn("Kısıt yok", self.sayfa("/panel/sistem-bilgisi", ip=DISARI_IP).content.decode())
        # kisitli + boş liste: panel kimseye açılmaz; durum metni görünümde denenir
        from django.test import RequestFactory
        from qr.panel import yonetim

        with self.kip("kisitli"):
            istek = RequestFactory().get("/panel/sistem-bilgisi")
            istek.user = self.yonetici
            self.assertIn("Panel/API kapalı", yonetim.sistem_bilgisi(istek).content.decode())
