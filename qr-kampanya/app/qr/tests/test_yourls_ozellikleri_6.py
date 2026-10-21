"""YOURLS'ten eksik özellikler (6. parça): eklenti kancaları (güvenli uyarlama), sürüm bilgisi ve elle sürüm denetimi,
isteğe bağlı panel/API IP kısıtı."""
import importlib
import logging
import os
import platform
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest import mock

import django
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.test import SimpleTestCase, override_settings
from django.urls import reverse

from config.surum import UYGULAMA_SURUMU
from qr import ag_kisiti, eklenti_yonetimi, kancalar
from qr.models import ApiAnahtari, GenelAyarlar, KampanyaSayfasi, LinkAgaci, Tarama
from qr.servisler import qr_kaydet

from .yardimci import TemelTest, betik_dizini

APP_DIZINI = Path(settings.BASE_DIR)


class KancaDurumuKoru:
    """Genel kanca kaydını ve eklenti durumunu her testte temiz başlatır, sonda eski haline döndürür."""

    def kanca_durumunu_koru(self):
        eski = kancalar.kancalar()
        eski_durum = dict(eklenti_yonetimi._durum)
        kancalar.sifirla()
        eklenti_yonetimi._durum.clear()

        def geri():
            kancalar.sifirla()
            for olay, liste in eski.items():
                for islev in liste:
                    kancalar.kanca_kaydet(olay, islev)
            eklenti_yonetimi._durum.clear()
            eklenti_yonetimi._durum.update(eski_durum)

        self.addCleanup(geri)


def ayar_ortami(**ek):
    """settings'i yeni bir süreçte içe aktarmak için ortam (yalnızca ek değişkenler farklıdır)."""
    ortam = {k: v for k, v in os.environ.items() if not k.startswith(("YONETIM_", "QR_EKLENTILER"))}
    ortam.update({
        "DJANGO_SETTINGS_MODULE": "config.settings", "DJANGO_DEBUG": "1", "DJANGO_SECRET_KEY": "test-" + "x" * 60,
        "POSTGRES_PASSWORD": "test", "MFA_SIFRELEME_ANAHTARI": settings.MFA_SIFRELEME_ANAHTARI,
    })
    ortam.update(ek)
    return ortam


def ayarlari_ice_aktar(**ek):
    return subprocess.run([sys.executable, "-c", "import django; django.setup(); from django.conf import settings; print(len(settings.YONETIM_IZINLI_AGLAR), settings.QR_EKLENTILER)"],
                          cwd=APP_DIZINI, env=ayar_ortami(**ek), capture_output=True, text=True, timeout=60)


# --- 1. Eklenti adları ve yükleme ---

class EklentiAdiTesti(KancaDurumuKoru, SimpleTestCase):
    def setUp(self):
        self.kanca_durumunu_koru()

    def test_gecerli_adlar_ve_bos_deger(self):
        self.assertEqual(eklenti_yonetimi.eklenti_adlarini_oku(""), ())
        self.assertEqual(eklenti_yonetimi.eklenti_adlarini_oku("  ,  "), ())
        self.assertEqual(eklenti_yonetimi.eklenti_adlarini_oku("ornek_gunluk, baska1 ,ornek_gunluk"), ("ornek_gunluk", "baska1"))
        self.assertEqual(eklenti_yonetimi.eklenti_adlarini_oku("a" + "b" * 40), ("a" + "b" * 40,))

    def test_gecersiz_adlar_ve_yol_hileleri_reddedilir(self):
        for kotu in ("A", "Ornek", "1abc", "_abc", "a-b", "a.b", "a/b", "a\\b", "..", "../x", "a..b", "eklentiler.ornek", "os.path",
                     "a b", "a\nb", "é", "a" + "b" * 41, "__init__", "ornek\x00"):
            with self.subTest(ad=kotu), self.assertRaises(ImproperlyConfigured):
                eklenti_yonetimi.eklenti_adlarini_oku(kotu)
        with self.assertRaises(ImproperlyConfigured):      # listedeki tek kötü ad hepsini durdurur
            eklenti_yonetimi.eklenti_adlarini_oku("ornek_gunluk,../etc/passwd")

    def test_modul_adi_her_zaman_eklentiler_paketi_altindadir(self):
        self.assertEqual(eklenti_yonetimi.modul_adi("ornek_gunluk"), "eklentiler.ornek_gunluk")
        for kotu in ("", "a.b", "../x", "os", "Os", "a/b", None):
            if kotu == "os":
                self.assertEqual(eklenti_yonetimi.modul_adi(kotu), "eklentiler.os")   # desene uyar, yine de yalnızca eklentiler.os
                continue
            with self.subTest(ad=kotu), self.assertRaises(ValueError):
                eklenti_yonetimi.modul_adi(kotu)

    def test_yalniz_eklentiler_paketi_icerigi_aktarilir(self):
        with mock.patch("importlib.import_module") as aktar:
            eklenti_yonetimi.yukle(("ornek_gunluk", "baska"))
        self.assertEqual([c.args[0] for c in aktar.call_args_list], ["eklentiler.ornek_gunluk", "eklentiler.baska"])

    def test_olmayan_eklenti_yuklenemez_ama_uygulama_etkilenmez(self):
        with self.assertLogs("qr.eklenti_yonetimi", "ERROR"):
            durum = eklenti_yonetimi.yukle(("olmayan_eklenti", "os"))        # "os" stdlib modülünü DEĞİL eklentiler.os'u arar
        self.assertEqual(durum["olmayan_eklenti"]["durum"], "hata")
        self.assertEqual(durum["os"]["durum"], "hata")
        self.assertNotIn("eklentiler.os", sys.modules)

    def test_hata_veren_eklenti_yakalanir(self):
        with mock.patch("importlib.import_module", side_effect=SystemExit(3)), self.assertLogs("qr.eklenti_yonetimi", "ERROR"):
            durum = eklenti_yonetimi.yukle(("bozuk",))
        self.assertEqual(durum["bozuk"]["durum"], "hata")

    def test_varsayilan_kapali(self):
        self.assertEqual(settings.QR_EKLENTILER, ())
        self.assertFalse(any(kancalar.kancalar().values()))
        self.assertEqual(eklenti_yonetimi._durum, {})

    def test_hatali_ad_uygulamayi_acilista_durdurur(self):
        iyi = ayarlari_ice_aktar(QR_EKLENTILER="ornek_gunluk")      # kontrol: geçerli ad sorunsuz açılır (eklenti var)
        self.assertEqual(iyi.returncode, 0, iyi.stderr)
        self.assertIn("('ornek_gunluk',)", iyi.stdout)
        kotu = ayarlari_ice_aktar(QR_EKLENTILER="../x")
        self.assertNotEqual(kotu.returncode, 0)
        self.assertIn("geçersiz eklenti adı", kotu.stderr)


class KancaKayitTesti(KancaDurumuKoru, SimpleTestCase):
    def setUp(self):
        self.kanca_durumunu_koru()

    def test_bilinmeyen_olay_ve_cagrilamaz(self):
        with self.assertRaises(ValueError):
            kancalar.kanca_kaydet("qr_olusturuldu_yanlis", lambda **k: None)
        with self.assertRaises(TypeError):
            kancalar.kanca_kaydet("qr_olusturuldu", "islev degil")
        self.assertEqual(set(kancalar.OLAYLAR), {"qr_olusturuldu", "qr_hedef_degisti", "tarama_kaydedildi", "link_agaci_goruntulendi"})

    def test_hata_veren_kanca_digerlerini_ve_cagirani_bozmaz(self):
        cagrilar = []

        @kancalar.kanca("qr_olusturuldu")
        def bozuk(**veri):
            raise RuntimeError("eklenti bozuk")

        @kancalar.kanca("qr_olusturuldu")
        def cikis(**veri):
            raise SystemExit(7)

        @kancalar.kanca("qr_olusturuldu")
        def saglam(**veri):
            cagrilar.append(veri)

        with self.assertLogs("qr.kancalar", "ERROR") as kayit:
            sayi = kancalar.tetikle("qr_olusturuldu", qr="x")
        self.assertEqual(sayi, 1)
        self.assertEqual(cagrilar, [{"qr": "x"}])
        self.assertEqual(len(kayit.records), 2)

    def test_yavas_kanca_uyari_dusurur_ama_calisir(self):
        kancalar.kanca_kaydet("tarama_kaydedildi", lambda **k: None)
        with mock.patch.object(kancalar, "KANCA_YAVAS_SN", -1), self.assertLogs("qr.kancalar", "WARNING"):
            self.assertEqual(kancalar.tetikle("tarama_kaydedildi", tarama=None), 1)

    def test_ayni_kanca_iki_kez_kaydolmaz(self):
        def f(**k):
            pass
        kancalar.kanca_kaydet("qr_olusturuldu", f)
        kancalar.kanca_kaydet("qr_olusturuldu", f)
        self.assertEqual(kancalar.kancalar("qr_olusturuldu"), [f])


# --- 1b. Kancalar servis noktalarından çağrılır ---

class KancaServisTesti(KancaDurumuKoru, TemelTest):
    def setUp(self):
        super().setUp()
        self.kanca_durumunu_koru()
        self.olaylar = []
        for olay in kancalar.OLAYLAR:
            kancalar.kanca_kaydet(olay, self._kaydedici(olay))

    def _kaydedici(self, olay):
        def kanca(**veri):
            self.olaylar.append((olay, veri))
        kanca.__name__ = f"kaydedici_{olay}"
        return kanca

    def adlar(self):
        return [o for o, _ in self.olaylar]

    def test_qr_olusturuldu_yalniz_islem_kesinlesince_calisir(self):
        with self.captureOnCommitCallbacks(execute=False) as geri_cagrilar:
            qr = self.qr_yap("KNC001")
        self.assertEqual(self.olaylar, [], "işlem kesinleşmeden kanca çalışmamalı")
        self.assertEqual(len(geri_cagrilar), 1)
        geri_cagrilar[0]()
        self.assertEqual(self.adlar(), ["qr_olusturuldu"])
        self.assertEqual(self.olaylar[0][1]["qr"].pk, qr.pk)

    def test_islem_geri_alinirsa_kanca_calismaz(self):
        with self.captureOnCommitCallbacks(execute=True) as geri_cagrilar:
            with self.assertRaises(RuntimeError), transaction.atomic():
                self.qr_yap("KNC002")
                raise RuntimeError("geri al")
        self.assertEqual(geri_cagrilar, [])
        self.assertEqual(self.olaylar, [])

    def test_hedef_degisince_kanca_calisir_diger_duzenleme_calistirmaz(self):
        with self.captureOnCommitCallbacks(execute=True):
            qr = self.qr_yap("KNC003", hedef="https://example.com/bir")
        self.olaylar.clear()
        with self.captureOnCommitCallbacks(execute=True):
            qr.ad = "Yeni ad"
            qr.full_clean()
            qr_kaydet(qr, None)
        self.assertEqual(self.olaylar, [], "hedef değişmediği için olay yok")
        with self.captureOnCommitCallbacks(execute=True):
            qr.hedef_url = "https://example.com/iki"
            qr.full_clean()
            qr_kaydet(qr, None)
        self.assertEqual(self.adlar(), ["qr_hedef_degisti"])
        veri = self.olaylar[0][1]
        self.assertEqual(veri["eski_hedef"][1], "https://example.com/bir")
        self.assertEqual(veri["yeni_hedef"][1], "https://example.com/iki")

    def test_kanca_hatasi_kaydi_bozmaz(self):
        kancalar.sifirla()

        @kancalar.kanca("qr_olusturuldu")
        def bozuk(**veri):
            raise RuntimeError("eklenti bozuk")

        with self.assertLogs("qr.kancalar", "ERROR"), self.captureOnCommitCallbacks(execute=True):
            qr = self.qr_yap("KNC004")
        self.assertTrue(type(qr).objects.filter(kisa_kod="KNC004").exists())

    def test_tarama_kancasi_commit_sonrasi_ve_kayit_gorunurken_calisir(self):
        qr = self.qr_yap("KNC005")
        gorulen = []
        kancalar.sifirla()
        kancalar.kanca_kaydet("tarama_kaydedildi", lambda tarama, **k: gorulen.append(Tarama.objects.filter(pk=tarama.pk).exists()))
        with self.captureOnCommitCallbacks(execute=False) as geri_cagrilar:
            yanit = self.client.get("/k/KNC005", HTTP_X_FORWARDED_FOR="203.0.113.9", HTTP_USER_AGENT="Mozilla/5.0 (iPhone) Mobile")
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(gorulen, [], "tarama kancası on_commit'e ertelenmeli")
        self.assertEqual(len(geri_cagrilar), 1)
        geri_cagrilar[0]()
        self.assertEqual(gorulen, [True])
        self.assertEqual(Tarama.objects.filter(qr=qr).count(), 1)

    def test_tarama_kancasina_ip_ve_user_agent_verilmez(self):
        self.qr_yap("KNC006")
        with self.captureOnCommitCallbacks(execute=True):
            self.client.get("/k/KNC006", HTTP_X_FORWARDED_FOR="203.0.113.9", HTTP_USER_AGENT="Ozel-Ajan/9.9")
        olay = [v for o, v in self.olaylar if o == "tarama_kaydedildi"]
        self.assertEqual(len(olay), 1)
        self.assertEqual(set(olay[0]), {"tarama"})
        alanlar = {f.name for f in Tarama._meta.get_fields()}
        self.assertFalse({"ip", "ip_adresi", "user_agent", "ua"} & alanlar)
        metin = repr(vars(olay[0]["tarama"]))
        self.assertNotIn("203.0.113.9", metin)
        self.assertNotIn("Ozel-Ajan", metin)

    def test_tarama_kancasi_hatasi_yonlendirmeyi_ve_kaydi_bozmaz(self):
        qr = self.qr_yap("KNC007")
        kancalar.sifirla()

        @kancalar.kanca("tarama_kaydedildi")
        def bozuk(**veri):
            raise RuntimeError("eklenti bozuk")

        with self.assertLogs("qr.kancalar", "ERROR"), self.captureOnCommitCallbacks(execute=True):
            yanit = self.client.get("/k/KNC007")
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(Tarama.objects.filter(qr=qr).count(), 1)

    def test_head_istegi_tarama_kancasini_tetiklemez(self):
        self.qr_yap("KNC008")
        with self.captureOnCommitCallbacks(execute=True):
            self.client.head("/k/KNC008")
        self.assertNotIn("tarama_kaydedildi", self.adlar())

    def test_link_agaci_goruntulendi(self):
        agac = LinkAgaci(slug="kanca-agaci", baslik="Kanca", durum="yayinda")
        agac.full_clean()
        agac.save()
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.get("/l/kanca-agaci", HTTP_USER_AGENT="Mozilla/5.0 (iPhone) Mobile").status_code, 200)
        self.assertEqual(self.adlar(), ["link_agaci_goruntulendi"])
        self.assertEqual(self.olaylar[0][1]["agac"].pk, agac.pk)
        self.olaylar.clear()
        with self.captureOnCommitCallbacks(execute=True):                           # bot ve HEAD sayılmaz
            self.client.get("/l/kanca-agaci", HTTP_USER_AGENT="Googlebot/2.1 (bot)")
            self.client.head("/l/kanca-agaci")
        self.assertEqual(self.olaylar, [])

    def test_kanca_yoksa_on_commit_kaydi_yapilmaz(self):
        kancalar.sifirla()
        with self.captureOnCommitCallbacks(execute=False) as geri_cagrilar:
            self.qr_yap("KNC009")
        self.assertEqual(geri_cagrilar, [])


# --- 1c. Örnek eklenti ve Eklentiler sayfası ---

class OrnekEklentiTesti(KancaDurumuKoru, TemelTest):
    def setUp(self):
        super().setUp()
        self.kanca_durumunu_koru()

    def ornek_yukle(self):
        modul = importlib.import_module("eklentiler.ornek_gunluk")
        kancalar.sifirla()
        importlib.reload(modul)              # kayıt, önbellekteki modülde de yeniden yapılsın
        return modul

    def test_ornek_eklenti_dort_olaya_baglanir_ve_yalniz_log_yazar(self):
        self.ornek_yukle()
        for olay in kancalar.OLAYLAR:
            self.assertEqual(len(kancalar.kancalar(olay)), 1, olay)
        self.assertEqual(settings.QR_EKLENTILER, ())          # varsayılan KAPALI: yalnızca bu testte elle yüklendi
        with self.assertLogs("eklentiler.ornek_gunluk", "INFO") as kayit, self.captureOnCommitCallbacks(execute=True):
            self.qr_yap("ORN001")
            self.client.get("/k/ORN001", HTTP_X_FORWARDED_FOR="203.0.113.9", HTTP_USER_AGENT="Ozel-Ajan/9.9")
        metin = "\n".join(kayit.output)
        self.assertIn("QR oluşturuldu kod=ORN001", metin)
        self.assertIn("tarama", metin)
        self.assertNotIn("203.0.113.9", metin)
        self.assertNotIn("Ozel-Ajan", metin)

    def test_ornek_eklenti_kaynagi_yalniz_log_ve_kanca_kullanir(self):
        kaynak = (APP_DIZINI / "eklentiler" / "ornek_gunluk.py").read_text(encoding="utf-8")
        for yasak in ("subprocess", "os.system", "socket", "urllib", "requests", "open(", "eval(", "exec(", "__import__"):
            self.assertNotIn(yasak, kaynak)

    def test_yukleyici_ornegi_qr_eklentiler_ile_yukler(self):
        kancalar.sifirla()
        durum = eklenti_yonetimi.yukle(("ornek_gunluk",))
        self.assertEqual(durum["ornek_gunluk"]["durum"], "yuklendi")

    def test_eklentiler_sayfasi_yalniz_yonetici(self):
        yol = reverse("panel:eklentiler")
        self.assertEqual(self.client.get(yol).status_code, 302)               # girişsiz
        for kullanici in (self.izleyici, self.editor, self.rolsuz):
            self.giris(kullanici)
            self.assertEqual(self.client.get(yol).status_code, 403, kullanici.username)
        self.giris(self.yonetici)
        self.assertEqual(self.client.get(yol).status_code, 200)
        self.assertEqual(self.client.post(yol).status_code, 405)              # salt okunur

    def test_eklentiler_sayfasi_kapali_ve_etkin_eklentiyi_gosterir(self):
        self.giris(self.yonetici)
        sayfa = self.client.get(reverse("panel:eklentiler")).content.decode()
        self.assertIn("ornek_gunluk", sayfa)
        self.assertIn("Kapalı", sayfa)
        self.assertIn("Örnek eklenti", sayfa)                                   # modül belgesinden (kod çalıştırılmadan)
        self.ornek_yukle()
        with self.assertLogs("qr.eklenti_yonetimi", "ERROR"):                  # olmayan_eklenti yüklenemez
            eklenti_yonetimi.yukle(("ornek_gunluk", "olmayan_eklenti"))
        with override_settings(QR_EKLENTILER=("ornek_gunluk", "olmayan_eklenti")):
            sayfa = self.client.get(reverse("panel:eklentiler")).content.decode()
        self.assertIn("Etkin (yüklendi)", sayfa)
        self.assertIn("Dosya bulunamadı", sayfa)
        self.assertIn("qr_olusturuldu", sayfa)
        self.assertIn("tarama_kaydedildi", sayfa)

    def test_eklentiler_sayfasi_etkin_olmayan_eklentiyi_calistirmaz(self):
        self.giris(self.yonetici)
        with mock.patch("importlib.import_module") as aktar:
            self.client.get(reverse("panel:eklentiler"))
        aktar.assert_not_called()

    def test_menude_yalniz_yoneticide_gorunur(self):
        self.giris(self.yonetici)
        self.assertIn(reverse("panel:eklentiler"), self.client.get(reverse("panel:ana")).content.decode())
        self.giris(self.editor)
        govde = self.client.get(reverse("panel:ana")).content.decode()
        self.assertNotIn(reverse("panel:eklentiler"), govde)
        self.assertNotIn(reverse("panel:sistem_bilgisi"), govde)


# --- 2. Sürüm bilgisi ---

class SistemBilgisiTesti(TemelTest):
    def test_surum_tek_yerde_ve_bicimli(self):
        self.assertRegex(UYGULAMA_SURUMU, r"^\d+\.\d+\.\d+$")
        kaynak_dizin = APP_DIZINI
        tanimlar = [str(p) for p in list(kaynak_dizin.glob("config/*.py")) + list(kaynak_dizin.glob("qr/*.py"))
                    if "UYGULAMA_SURUMU =" in p.read_text(encoding="utf-8")]
        self.assertEqual([Path(t).name for t in tanimlar], ["surum.py"])

    def test_yalniz_yonetici(self):
        yol = reverse("panel:sistem_bilgisi")
        self.assertEqual(self.client.get(yol).status_code, 302)
        for kullanici in (self.izleyici, self.editor, self.rolsuz):
            self.giris(kullanici)
            self.assertEqual(self.client.get(yol).status_code, 403, kullanici.username)
        self.giris(self.yonetici)
        self.assertEqual(self.client.get(yol).status_code, 200)
        self.assertEqual(self.client.post(yol).status_code, 405)

    def test_icerik(self):
        self.giris(self.yonetici)
        sayfa = self.client.get(reverse("panel:sistem_bilgisi")).content.decode()
        self.assertIn(UYGULAMA_SURUMU, sayfa)
        self.assertIn(platform.python_version(), sayfa)
        self.assertIn(django.get_version(), sayfa)
        self.assertIn("PostgreSQL", sayfa)                                       # SELECT version() çıktısı "PostgreSQL 17..." ile başlar
        son = sorted(p.stem for p in (APP_DIZINI / "qr" / "migrations").glob("0*.py"))[-1]
        self.assertIn(son, sayfa)
        self.assertEqual(sayfa.count("Verilmemiş"), 2)                           # imaj etiketi ve digest verilmemiş
        with override_settings(QR_IMAJ_ETIKETI="1.0.0-yerel", QR_IMAJ_DIGEST="sha256:" + "ab" * 32):
            sayfa = self.client.get(reverse("panel:sistem_bilgisi")).content.decode()
        self.assertIn("1.0.0-yerel", sayfa)
        self.assertIn("sha256:" + "ab" * 32, sayfa)
        self.assertNotIn("Verilmemiş", sayfa)

    def test_sayfa_internete_baglanmaz(self):
        self.giris(self.yonetici)
        with mock.patch("urllib.request.urlopen") as acik, mock.patch("http.client.HTTPConnection.connect") as http, \
                mock.patch("http.client.HTTPSConnection.connect") as https:
            self.client.get(reverse("panel:sistem_bilgisi"))
            self.client.get(reverse("panel:eklentiler"))
        acik.assert_not_called()
        http.assert_not_called()
        https.assert_not_called()

    def test_api_version_uygulama_surumunu_de_dondurur(self):
        _, duz = ApiAnahtari.uret(self.editor, "surum")
        baslik = {"HTTP_AUTHORIZATION": f"Bearer {duz}"}
        j = self.client.get("/api/v1/", {"action": "version"}, **baslik).json()
        self.assertEqual(j["statusCode"], 200)
        self.assertEqual(j["version"], "1")                                      # API sürümü değişmedi
        self.assertEqual(j["uygulama_surumu"], UYGULAMA_SURUMU)
        kok = ET.fromstring(self.client.get("/api/v1/", {"action": "version", "format": "xml"}, **baslik).content)
        self.assertEqual(kok.findtext("uygulama_surumu"), UYGULAMA_SURUMU)
        self.assertEqual(self.client.get("/api/v1/", {"action": "version"}).status_code, 401)   # kimlik hâlâ şart


# --- 2b. scripts/surum-denetimi.sh ---

def surum_betigi():
    try:
        yol = betik_dizini() / "surum-denetimi.sh"
    except FileNotFoundError:
        return None
    return yol if yol.is_file() and (yol.parent.parent / "docker-compose.yml").is_file() and (yol.parent.parent / "app" / "requirements.in").is_file() else None


def shellcheck_yolu():
    adaylar = [shutil.which("shellcheck"), str(Path(sys.executable).parent / "shellcheck")]
    return next((a for a in adaylar if a and os.access(a, os.X_OK)), None)


@unittest.skipUnless(surum_betigi(), "scripts/surum-denetimi.sh, docker-compose.yml ve app/requirements.in birlikte gerekir")
class SurumDenetimiBetigiTesti(SimpleTestCase):
    def setUp(self):
        self.betik = surum_betigi()
        self.kok = self.betik.parent.parent
        self.gecici = Path(tempfile.mkdtemp(prefix="qr-surum-"))
        self.addCleanup(shutil.rmtree, self.gecici, ignore_errors=True)
        self.bin = self.gecici / "bin"
        self.bin.mkdir()
        self.gunluk = self.gecici / "curl-cagrilari.txt"

    def sahte_curl(self, govde):
        yol = self.bin / "curl"
        yol.write_text("#!/bin/sh\nprintf '%s\\n' \"$*\" >> \"$SAHTE_CURL_GUNLUGU\"\n" + govde, encoding="utf-8")
        yol.chmod(yol.stat().st_mode | stat.S_IEXEC)

    def calistir(self, *argumanlar):
        ortam = {**os.environ, "PATH": f"{self.bin}:{os.environ['PATH']}", "SAHTE_CURL_GUNLUGU": str(self.gunluk)}
        return subprocess.run(["bash", str(self.betik), *argumanlar], capture_output=True, text=True, env=ortam, timeout=120)

    def test_cevrimdisi_modda_agi_hic_kullanmaz_ve_listeler(self):
        self.sahte_curl('echo "AG KULLANILDI" >&2; exit 7\n')
        onceki = {p: p.read_bytes() for p in (self.kok / "docker-compose.yml", self.kok / "app" / "requirements.txt", self.kok / "app" / "requirements.in")}
        s = self.calistir()
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertFalse(self.gunluk.exists(), "çevrimdışı modda curl çağrılmamalı")
        self.assertIn("çevrimdışı", s.stdout)
        self.assertRegex(s.stdout, r"\* postgres:\d+\.\d+")                       # compose'daki sabit imaj etiketi
        self.assertRegex(s.stdout, r"\* caddy:\d+\.\d+")
        self.assertRegex(s.stdout, r"\* Django==\d+\.\d+")                        # doğrudan bağımlılık, kilitli sürümle
        self.assertIn("psycopg==", s.stdout)                                       # [binary] eki atılır
        self.assertNotIn("qr-kampanya-app", s.stdout)                              # yerel derlenen imaj listelenmez
        self.assertEqual(onceki, {p: p.read_bytes() for p in onceki}, "betik hiçbir dosyayı değiştirmemeli")

    def test_cevrimdisi_modda_python_ve_curl_olmadan_da_calisir(self):
        # Yalnızca sistem araçları (bash, sed, grep, awk, tr, head) gerekir; curl/python3 çevrimdışı modda şart değildir.
        arac = self.gecici / "yalniz"
        arac.mkdir()
        for ad in ("bash", "sed", "grep", "awk", "tr", "head", "cat", "dirname", "env", "sort"):
            kaynak = shutil.which(ad)
            if kaynak:
                (arac / ad).symlink_to(kaynak)
        s = subprocess.run([str(arac / "bash"), str(self.betik)], capture_output=True, text=True, env={"PATH": str(arac)}, timeout=60)
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIn("Django==", s.stdout)

    def test_cevrimici_modda_ag_yoksa_acik_hata_ve_uydurma_yok(self):
        self.sahte_curl('echo "curl: (6) Could not resolve host" >&2; exit 6\n')
        s = self.calistir("--cevrimici")
        self.assertEqual(s.returncode, 1, s.stdout)
        self.assertIn("HATA:", s.stderr)
        self.assertIn("alınamadı", s.stderr)
        self.assertIn("Could not resolve host", s.stderr)
        self.assertIn("denetlenemedi", s.stdout)
        self.assertNotIn("güncel (PyPI", s.stdout)                                # ağsız "güncel" iddiası yok
        self.assertNotIn("DAHA YENİ", s.stdout)
        self.assertGreater(len(self.gunluk.read_text().splitlines()), 0)

    def test_cevrimici_modda_daha_yeni_surumu_raporlar_yalniz_get_ve_https(self):
        self.sahte_curl(r'''case "$*" in
  *pypi.org/pypi/Django/json*) echo '{"info": {"version": "99.0.0"}}' ;;
  *pypi.org/pypi/*) echo '{"info": {"version": "0.0.1"}}' ;;
  *hub.docker.com/v2/repositories/library/postgres/*) echo '{"next": null, "results": [{"name": "99.1-alpine"}, {"name": "17.6-alpine"}, {"name": "99.1"}]}' ;;
  *hub.docker.com/v2/repositories/library/*) echo '{"next": null, "results": [{"name": "0.0.1-alpine"}]}' ;;
  *) echo "beklenmeyen: $*" >&2; exit 22 ;;
esac
''')
        s = self.calistir("--cevrimici")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIn("Django: DAHA YENİ SÜRÜM VAR: 99.0.0", s.stdout)
        self.assertIn("güncel (PyPI son sürüm: 0.0.1)", s.stdout)   # daha eskisi "yeni" sayılmaz
        self.assertRegex(s.stdout, r"postgres: daha yeni etiket\(ler\) görünüyor: 99\.1-alpine \(")
        self.assertNotIn("99.1 ", s.stdout)                                        # soneki farklı etiket önerilmez
        for satir in self.gunluk.read_text().splitlines():
            self.assertRegex(satir, r"https://(pypi\.org|hub\.docker\.com)/")
            self.assertNotRegex(satir, r"(?i)-X |--data|-d |--upload|-T ")
        self.assertIn("Hiçbir şey güncellenmedi", s.stdout)

    def test_gecersiz_secenek(self):
        self.sahte_curl("exit 0\n")
        self.assertEqual(self.calistir("--guncelle").returncode, 2)
        self.assertEqual(self.calistir("--cevrimici", "fazla").returncode, 2)
        self.assertFalse(self.gunluk.exists())

    def test_betik_guncelleme_yapan_komut_icermez(self):
        kod = self.betik.read_text(encoding="utf-8")
        for yasak in ("pip install", "docker pull", "docker compose", "git ", "sed -i", "> \"$KOK", ">> \"$KOK"):
            self.assertNotIn(yasak, kod)
        self.assertIn("--cevrimici", kod)

    @unittest.skipUnless(shellcheck_yolu(), "shellcheck kurulu değil (pip install shellcheck-py ya da paket yöneticisi)")
    def test_shellcheck_temiz(self):
        s = subprocess.run([shellcheck_yolu(), "-x", str(self.betik)], capture_output=True, text=True, timeout=60)
        self.assertEqual(s.returncode, 0, s.stdout + s.stderr)


# --- 3. Panel/API IP kısıtı ---

ALLOWED = "203.0.113.0/24"
IZINLI_IP = "203.0.113.7"
DISARIDAKI_IP = "198.51.100.23"


class AgKisitiAyristirmaTesti(SimpleTestCase):
    def test_bos_deger_kisit_yok(self):
        self.assertEqual(ag_kisiti.aglari_oku(""), ())
        self.assertEqual(ag_kisiti.aglari_oku(" , "), ())
        self.assertEqual(settings.YONETIM_IZINLI_AGLAR, ())

    def test_gecerli_cidr_listesi(self):
        aglar = ag_kisiti.aglari_oku(" 203.0.113.0/24 , 2001:db8::/32,192.0.2.5 ")
        self.assertEqual([str(a) for a in aglar], ["203.0.113.0/24", "2001:db8::/32", "192.0.2.5/32"])

    def test_hatali_cidr_sessizce_gecilmez(self):
        for kotu in ("999.1.1.1/24", "10.0.0.0/33", "abc", "10.0.0.1/24", "10.0.0.0/8,xyz", "2001:db8::/129", "0.0.0.0/0/1", "10.0.0.0/8;10.1.0.0/16"):
            with self.subTest(deger=kotu), self.assertRaises(ImproperlyConfigured) as hata:
                ag_kisiti.aglari_oku(kotu)
            self.assertIn("YONETIM_IZINLI_AGLAR", str(hata.exception))

    def test_hatali_cidr_uygulamayi_acilista_durdurur(self):
        iyi = ayarlari_ice_aktar(YONETIM_IZINLI_AGLAR=ALLOWED)
        self.assertEqual(iyi.returncode, 0, iyi.stderr)
        self.assertTrue(iyi.stdout.startswith("1 "), iyi.stdout)
        for kotu in ("203.0.113.0/99", "203.0.113.0/24,bozuk"):
            s = ayarlari_ice_aktar(YONETIM_IZINLI_AGLAR=kotu)
            self.assertNotEqual(s.returncode, 0, kotu)
            self.assertIn("ImproperlyConfigured", s.stderr)
            self.assertIn("geçersiz CIDR", s.stderr)

    def test_kisitli_yol_siniflandirmasi(self):
        for yol in ("/panel/", "/panel", "/panel/giris", "/api/v1/", "/api", "/admin/", "/admin/login/", "//panel/giris", "/panel//x", "/", "/panelx/", "/apiv1/", "/giris", "/PANEL/", "/yok"):
            self.assertTrue(ag_kisiti.kisitli_yol_mu(yol), yol)
        for yol in ("/k/abc", "/k/abc+", "/l/agac", "/l/agac/stil.css", "/s/sayfa", "/saglik", "/robots.txt", "/static/qr/panel.css",
                    "/medya/a.png", "/ic/medya-yetki"):
            self.assertFalse(ag_kisiti.kisitli_yol_mu(yol), yol)

    def test_ip_izinli_mi(self):
        aglar = ag_kisiti.aglari_oku("203.0.113.0/24,2001:db8::/32")
        for ip in ("203.0.113.1", "203.0.113.255", "2001:db8::1", "::ffff:203.0.113.9"):
            self.assertTrue(ag_kisiti.ip_izinli_mi(ip, aglar), ip)
        for ip in ("203.0.114.1", "198.51.100.1", "2001:db9::1", "", "bozuk", "203.0.113.1/24", "203.0.113.1, 1.1.1.1", None):
            self.assertFalse(ag_kisiti.ip_izinli_mi(ip, aglar), ip)


class AgKisitiTesti(TemelTest):
    def sayfa(self, yol, ip=DISARIDAKI_IP, xff=None, **ek):
        ek["REMOTE_ADDR"] = ip
        if xff is not None:
            ek["HTTP_X_FORWARDED_FOR"] = xff
        return self.client.get(yol, **ek)

    def kisit(self, deger=ALLOWED, **ek):
        return override_settings(YONETIM_IZINLI_AGLAR=ag_kisiti.aglari_oku(deger), **ek)

    def test_bos_iken_kisit_yok(self):
        self.assertEqual(self.sayfa("/panel/giris").status_code, 200)
        self.assertEqual(self.sayfa("/api/v1/", xff="1.2.3.4").status_code, 401)          # kimlik doğrulamaya ulaşır
        self.assertEqual(self.sayfa("/panel/giris", ip="203.0.113.7").status_code, 200)

    def test_izinli_ag_gecer_izinsiz_ag_404_alir(self):
        with self.kisit():
            self.assertEqual(self.sayfa("/panel/giris", ip=IZINLI_IP, xff=IZINLI_IP).status_code, 200)
            self.assertEqual(self.sayfa("/api/v1/", ip=IZINLI_IP, xff=IZINLI_IP).status_code, 401)   # 404 değil: kimlik istenir
            for yol in ("/panel/giris", "/panel/", "/panel", "/panel/qr/", "/api/v1/", "/api/v1/?action=version", "/admin/", "/", "//panel/giris"):
                yanit = self.sayfa(yol, ip="10.0.0.2", xff=DISARIDAKI_IP)
                self.assertEqual(yanit.status_code, 404, yol)

    def test_izinsiz_ag_gecerli_api_anahtariyla_bile_404_alir(self):
        _, duz = ApiAnahtari.uret(self.editor, "ag")
        with self.kisit():
            yanit = self.client.get("/api/v1/", {"action": "version"}, HTTP_AUTHORIZATION=f"Bearer {duz}", REMOTE_ADDR="10.0.0.2", HTTP_X_FORWARDED_FOR=DISARIDAKI_IP)
            self.assertEqual(yanit.status_code, 404)
            yanit = self.client.get("/api/v1/", {"action": "version"}, HTTP_AUTHORIZATION=f"Bearer {duz}", REMOTE_ADDR="10.0.0.2", HTTP_X_FORWARDED_FOR=IZINLI_IP)
            self.assertEqual(yanit.status_code, 200)

    def test_oturum_acmis_yonetici_izinsiz_agdan_panele_giremez(self):
        self.giris(self.yonetici)
        with self.kisit():
            self.assertEqual(self.sayfa("/panel/", ip="10.0.0.2", xff=DISARIDAKI_IP).status_code, 404)
            self.assertEqual(self.sayfa("/panel/", ip="10.0.0.2", xff=IZINLI_IP).status_code, 200)

    def test_404_gövdesi_bilinmeyen_yolla_ayni(self):
        with self.kisit():
            gizli = self.sayfa("/panel/giris", ip="10.0.0.2", xff=DISARIDAKI_IP)
            yok = self.sayfa("/yok-boyle-bir-yol", ip="10.0.0.2", xff=DISARIDAKI_IP)
        self.assertEqual(gizli.status_code, yok.status_code)
        self.assertEqual(gizli.content, yok.content)

    def test_xff_sahteciligi_guvenilir_vekilde_yalniz_en_sagdaki_deger_sayilir(self):
        with self.kisit(GUVENILIR_VEKIL=True):
            # İstemci kendi başlığına izinli bir IP yazar; Caddy gerçek adresi (dışarıdaki) SONA ekler -> reddedilir.
            self.assertEqual(self.sayfa("/panel/giris", ip="172.28.0.2", xff=f"{IZINLI_IP}, {DISARIDAKI_IP}").status_code, 404)
            self.assertEqual(self.sayfa("/panel/giris", ip="172.28.0.2", xff=f"{IZINLI_IP},{IZINLI_IP}, {DISARIDAKI_IP}").status_code, 404)
            # Gerçek istemci izinli ağdaysa (başa ne yazılırsa yazılsın) geçer.
            self.assertEqual(self.sayfa("/panel/giris", ip="172.28.0.2", xff=f"{DISARIDAKI_IP}, {IZINLI_IP}").status_code, 200)
            # Bozuk/boş başlık değerleri erişim vermez.
            for bozuk in ("bozuk", f"{IZINLI_IP}, bozuk", "unknown"):
                self.assertEqual(self.sayfa("/panel/giris", ip="172.28.0.2", xff=bozuk).status_code, 404, bozuk)

    def test_vekil_guvenilmiyorsa_xff_yok_sayilir(self):
        with self.kisit(GUVENILIR_VEKIL=False):
            self.assertEqual(self.sayfa("/panel/giris", ip=DISARIDAKI_IP, xff=IZINLI_IP).status_code, 404)    # başlıkla aşılamaz
            self.assertEqual(self.sayfa("/panel/giris", ip=IZINLI_IP, xff=DISARIDAKI_IP).status_code, 200)     # gerçek bağlantı adresi

    def test_ipv6_ve_ipv4_eslenik(self):
        with self.kisit("2001:db8::/32,203.0.113.0/24"):
            self.assertEqual(self.sayfa("/panel/giris", ip="2001:db8::5", xff="2001:db8::5").status_code, 200)
            self.assertEqual(self.sayfa("/panel/giris", ip="2001:db9::5", xff="2001:db9::5").status_code, 404)
            self.assertEqual(self.sayfa("/panel/giris", ip="::ffff:203.0.113.9", xff="::ffff:203.0.113.9").status_code, 200)

    def test_halka_acik_uclar_etkilenmez(self):
        self.qr_yap("AG0001", hedef="https://example.com/ag")
        ayar = GenelAyarlar.al()
        ayar.herkese_acik_istatistik = True          # /k/<kod>+ varsayılan kapalı; kapalıyken 404 kısıttan değil ayardandır
        ayar.save()
        sayfa = KampanyaSayfasi.objects.create(slug="ag-sayfasi", baslik="Ağ", durum="yayinda")
        agac = LinkAgaci(slug="ag-agaci", baslik="Ağ", durum="yayinda")
        agac.full_clean()
        agac.save()
        with self.kisit():
            kw = {"ip": "10.0.0.2", "xff": DISARIDAKI_IP}
            self.assertEqual(self.sayfa("/k/AG0001", **kw).status_code, 302)
            self.assertEqual(self.sayfa("/k/AG0001+", **kw).status_code, 200)
            self.assertEqual(self.sayfa("/l/ag-agaci", **kw).status_code, 200)
            self.assertEqual(self.sayfa("/l/ag-agaci/stil.css", **kw).status_code, 200)
            self.assertEqual(self.sayfa(f"/s/{sayfa.slug}", **kw).status_code, 200)
            self.assertEqual(self.sayfa("/saglik", **kw).status_code, 200)
            self.assertEqual(self.sayfa("/robots.txt", **kw).status_code, 200)

    def test_kisit_taramayi_kaydetmeyi_engellemez(self):
        qr = self.qr_yap("AG0002", hedef="https://example.com/ag2")
        with self.kisit():
            self.sayfa("/k/AG0002", ip="10.0.0.2", xff=DISARIDAKI_IP)
        self.assertEqual(Tarama.objects.filter(qr=qr).count(), 1)

    def test_ara_katman_sirasi_whitenoise_sonrasi_oturumdan_once(self):
        sira = settings.MIDDLEWARE
        kisit = sira.index("qr.ag_kisiti.YonetimAgKisitiMiddleware")
        self.assertLess(sira.index("whitenoise.middleware.WhiteNoiseMiddleware"), kisit)          # statik dosyalar etkilenmez
        self.assertLess(kisit, sira.index("django.contrib.sessions.middleware.SessionMiddleware"))  # kimlik işlemlerinden önce
