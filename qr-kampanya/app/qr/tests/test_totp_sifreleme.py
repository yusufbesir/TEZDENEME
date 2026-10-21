"""MFA (TOTP) gizli anahtarlarının veritabanında şifreli saklanması: şifreleme, anahtar döndürme, migrasyon, uçtan uca giriş."""
import re
from io import StringIO
from unittest import mock

import pyotp
from cryptography.fernet import Fernet
from django.conf import settings
from django.contrib.auth import SESSION_KEY, get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import SimpleTestCase, TestCase, override_settings

from qr import sifreleme
from qr.models import MFACihazi
from qr.sifreleme import SifrelemeHatasi

from .yardimci import PAROLA, TemelTest

SIMDI = "qr.panel.mfa._simdi"
T0 = 1_800_000_000.0
ANAHTAR_A = Fernet.generate_key().decode()
ANAHTAR_B = Fernet.generate_key().decode()
SIR = "JBSWY3DPEHPK3PXP"
SIR2 = "KRSXG5CTMVRXEZLU"


def ham_deger(pk):
    with connection.cursor() as imlec:
        imlec.execute("SELECT gizli_anahtar FROM qr_mfacihazi WHERE id = %s", [pk])
        return imlec.fetchone()[0]


class SifrelemeYardimcilariTesti(SimpleTestCase):
    def test_gidis_donus_ve_belirtec_her_seferinde_farkli(self):
        with override_settings(MFA_SIFRELEME_ANAHTARI=ANAHTAR_A):
            a, b = sifreleme.sifrele(SIR), sifreleme.sifrele(SIR)
            self.assertNotEqual(a, b)
            self.assertNotIn(SIR, a)
            self.assertTrue(sifreleme.belirec_bicimli_mi(a))
            self.assertEqual(sifreleme.coz(a), SIR)
        self.assertFalse(sifreleme.belirec_bicimli_mi(SIR))

    def test_anahtar_yok_veya_bos_anlasilir_turkce_hata(self):
        for ham in ("", None, " , ,"):
            with self.assertRaisesMessage(SifrelemeHatasi, "MFA_SIFRELEME_ANAHTARI ortam değişkeni tanımlı değil"):
                sifreleme.anahtarlari_hazirla(ham)

    def test_gecersiz_anahtar_hatasi_degeri_icermez(self):
        for ham in ("kisa", "a" * 44, f"{ANAHTAR_A},bozuk-anahtar"):
            with self.assertRaises(SifrelemeHatasi) as baglam:
                sifreleme.anahtarlari_hazirla(ham)
            self.assertIn("geçersiz", str(baglam.exception))
            self.assertNotIn("bozuk-anahtar", str(baglam.exception))
        with self.assertRaisesMessage(SifrelemeHatasi, "2. anahtar geçersiz"):
            sifreleme.anahtarlari_hazirla(f"{ANAHTAR_A},bozuk")

    def test_anahtar_dondurme_eski_kayit_yeni_listeyle_cozulur(self):
        with override_settings(MFA_SIFRELEME_ANAHTARI=ANAHTAR_A):
            eski_belirec = sifreleme.sifrele(SIR)
        with override_settings(MFA_SIFRELEME_ANAHTARI=f"{ANAHTAR_B},{ANAHTAR_A}"):
            self.assertEqual(sifreleme.coz(eski_belirec), SIR)
            yeni_belirec = sifreleme.sifrele(SIR)
            yenilenen = sifreleme.yeniden_sifrele(eski_belirec)
        # Yeni şifreleme ve yenileme İLK anahtarı kullanır: yalnızca B ile çözülür.
        with override_settings(MFA_SIFRELEME_ANAHTARI=ANAHTAR_B):
            self.assertEqual(sifreleme.coz(yeni_belirec), SIR)
            self.assertEqual(sifreleme.coz(yenilenen), SIR)
            with self.assertRaises(SifrelemeHatasi):
                sifreleme.coz(eski_belirec)  # eski anahtar listeden çıkarılırsa açılmaz

    def test_yanlis_anahtarla_cozme_hatasi_sir_icermez(self):
        with override_settings(MFA_SIFRELEME_ANAHTARI=ANAHTAR_A):
            belirec = sifreleme.sifrele(SIR)
        with override_settings(MFA_SIFRELEME_ANAHTARI=ANAHTAR_B):
            with self.assertRaises(SifrelemeHatasi) as baglam:
                sifreleme.coz(belirec)
        self.assertNotIn(SIR, str(baglam.exception))
        self.assertNotIn(belirec, str(baglam.exception))

    def test_ayarlar_yuklenirken_anahtar_dogrulanir(self):
        # Ayar dosyası geçersiz anahtarla ImproperlyConfigured fırlatır (açılışta durur).
        import subprocess
        import sys
        from pathlib import Path

        kok = Path(settings.BASE_DIR)
        import os

        for deger, beklenen in (("", "tanımlı değil"), ("kisa", "geçersiz")):
            ortam = {**os.environ, "MFA_SIFRELEME_ANAHTARI": deger, "DJANGO_SETTINGS_MODULE": "config.settings"}
            sonuc = subprocess.run(
                [sys.executable, "-c", "import django; django.setup()"], cwd=kok, env=ortam, capture_output=True, text=True, timeout=60
            )
            self.assertNotEqual(sonuc.returncode, 0)
            self.assertIn("ImproperlyConfigured", sonuc.stderr)
            self.assertIn(beklenen, sonuc.stderr)


class MFASifreliSaklamaTesti(TemelTest):
    def cihaz(self, kullanici=None, sir=SIR, onayli=True):
        return MFACihazi.objects.create(kullanici=kullanici or self.editor, gizli_anahtar=sir, onayli=onayli)

    def test_veritabaninda_duz_metin_yok_ham_sql(self):
        cihaz = self.cihaz()
        ham = ham_deger(cihaz.pk)
        self.assertNotIn(SIR, ham)
        self.assertTrue(sifreleme.belirec_bicimli_mi(ham))
        with connection.cursor() as imlec:
            imlec.execute("SELECT count(*) FROM qr_mfacihazi WHERE gizli_anahtar = %s", [SIR])
            self.assertEqual(imlec.fetchone()[0], 0)
        self.assertEqual(MFACihazi.objects.get(pk=cihaz.pk).gizli_anahtar, SIR)  # model düz metni geri verir

    def test_guncelleme_de_sifreli_yazar_ve_kismi_kayit_bozmaz(self):
        cihaz = self.cihaz()
        ilk = ham_deger(cihaz.pk)
        cihaz = MFACihazi.objects.get(pk=cihaz.pk)
        cihaz.son_kullanilan_adim = 5
        cihaz.save(update_fields=["son_kullanilan_adim"])
        self.assertEqual(ham_deger(cihaz.pk), ilk)  # alan yazılmadığı için dokunulmadı
        cihaz.gizli_anahtar = SIR2
        cihaz.save()
        self.assertNotEqual(ham_deger(cihaz.pk), ilk)
        self.assertNotIn(SIR2, ham_deger(cihaz.pk))
        self.assertEqual(MFACihazi.objects.get(pk=cihaz.pk).gizli_anahtar, SIR2)

    def test_alanda_sorgu_desteklenmez(self):
        with self.assertRaises(TypeError):
            list(MFACihazi.objects.filter(gizli_anahtar=SIR))

    @override_settings(MFA_ZORUNLU=True)
    def test_mfa_girisi_uctan_uca_sifreli_kayitla_calisir(self):
        cihaz = self.cihaz()
        self.assertNotIn(SIR, ham_deger(cihaz.pk))
        with mock.patch(SIMDI, return_value=T0):
            self.client.post("/panel/giris", {"username": "editor", "password": PAROLA})
            yanit = self.client.post("/panel/mfa/dogrula", {"kod": pyotp.TOTP(SIR).at(int(T0))})
        self.assertRedirects(yanit, "/panel/", fetch_redirect_response=False)
        self.assertIn(SESSION_KEY, self.client.session)
        self.assertEqual(MFACihazi.objects.get(pk=cihaz.pk).son_kullanilan_adim, int(T0) // 30)

    @override_settings(MFA_ZORUNLU=True)
    def test_kurulum_sifreli_yazar_ve_oturumda_duz_gizli_tutmaz(self):
        self.giris(self.editor)
        sayfa = self.client.get("/panel/hesap/mfa/kur")
        gizli = sayfa.context["gizli_anahtar"]
        oturum_degeri = self.client.session["mfa_kur_gizli"]
        self.assertNotEqual(oturum_degeri, gizli)
        self.assertNotIn(gizli, oturum_degeri)
        with mock.patch(SIMDI, return_value=T0):
            self.client.post("/panel/hesap/mfa/kur", {"kod": pyotp.TOTP(gizli).at(int(T0))})
        cihaz = MFACihazi.objects.get(kullanici=self.editor)
        self.assertTrue(cihaz.onayli)
        self.assertEqual(cihaz.gizli_anahtar, gizli)
        self.assertNotIn(gizli, ham_deger(cihaz.pk))

    @override_settings(MFA_ZORUNLU=True)
    def test_giriste_zorunlu_kurulum_oturum_gizlisi_sifreli(self):
        with mock.patch(SIMDI, return_value=T0):
            self.client.post("/panel/giris", {"username": "editor", "password": PAROLA})
            gizli = self.client.get("/panel/mfa/kurulum").context["gizli_anahtar"]
            self.assertNotIn(gizli, str(self.client.session["mfa_bekleyen"]))
            self.assertEqual(self.client.get("/panel/mfa/kurulum").context["gizli_anahtar"], gizli)
            yanit = self.client.post("/panel/mfa/kurulum", {"kod": pyotp.TOTP(gizli).at(int(T0))})
        self.assertEqual(yanit.status_code, 302)
        self.assertIn(SESSION_KEY, self.client.session)
        self.assertNotIn(gizli, ham_deger(MFACihazi.objects.get(kullanici=self.editor).pk))

    @override_settings(MFA_ZORUNLU=True)
    def test_anahtar_kaybolursa_giris_kapali_basarisiz_ve_mfa_sifirla_kurtarir(self):
        cihaz = self.cihaz()
        with override_settings(MFA_SIFRELEME_ANAHTARI=ANAHTAR_B):
            with self.assertLogs("qr.alanlar", level="WARNING") as kayit:
                self.assertIsNone(MFACihazi.objects.get(pk=cihaz.pk).gizli_anahtar)
            self.assertNotIn(SIR, "\n".join(kayit.output))
            with mock.patch(SIMDI, return_value=T0):
                self.client.post("/panel/giris", {"username": "editor", "password": PAROLA})
                yanit = self.client.post("/panel/mfa/dogrula", {"kod": pyotp.TOTP(SIR).at(int(T0))})
            self.assertEqual(yanit.status_code, 200)  # 500 değil: kod hatalı sayılır
            self.assertNotIn(SESSION_KEY, self.client.session)
            call_command("mfa_sifirla", "editor", stdout=StringIO())
            self.assertFalse(MFACihazi.objects.filter(kullanici=self.editor).exists())

    def test_duz_metin_loglanmaz(self):
        with self.assertNoLogs(level="DEBUG"):
            cihaz = self.cihaz()
            MFACihazi.objects.get(pk=cihaz.pk)

    def test_mfa_sifreyi_yenile_komutu(self):
        with override_settings(MFA_SIFRELEME_ANAHTARI=ANAHTAR_A):
            cihaz = self.cihaz()
            eski = ham_deger(cihaz.pk)
        with override_settings(MFA_SIFRELEME_ANAHTARI=f"{ANAHTAR_B},{ANAHTAR_A}"):
            cikti = StringIO()
            call_command("mfa_sifreyi_yenile", stdout=cikti)
            self.assertIn("1 MFA kaydı", cikti.getvalue())
        yeni = ham_deger(cihaz.pk)
        self.assertNotEqual(yeni, eski)
        with override_settings(MFA_SIFRELEME_ANAHTARI=ANAHTAR_B):  # eski anahtar olmadan da çözülür
            self.assertEqual(MFACihazi.objects.get(pk=cihaz.pk).gizli_anahtar, SIR)

    def test_mfa_sifreyi_yenile_cozulemeyen_kayitta_hicbirini_degistirmez(self):
        with override_settings(MFA_SIFRELEME_ANAHTARI=ANAHTAR_A):
            c1 = self.cihaz()
        with override_settings(MFA_SIFRELEME_ANAHTARI=ANAHTAR_B):
            c2 = self.cihaz(kullanici=self.izleyici, sir=SIR2)
        once = (ham_deger(c1.pk), ham_deger(c2.pk))
        with override_settings(MFA_SIFRELEME_ANAHTARI=f"{ANAHTAR_B}"):
            with self.assertRaisesMessage(CommandError, "Hiçbir kayıt değiştirilmedi"):
                call_command("mfa_sifreyi_yenile", stdout=StringIO())
        self.assertEqual((ham_deger(c1.pk), ham_deger(c2.pk)), once)


class TabloDonusumuTesti(TemelTest):
    """Veri migrasyonunun kullandığı ham dönüştürücü: ileri, geri, idempotent, hata durumunda değişiklik yok."""

    def ham_ekle(self, kullanici, deger):
        with connection.cursor() as imlec:
            imlec.execute(
                "INSERT INTO qr_mfacihazi (kullanici_id, gizli_anahtar, onayli, son_kullanilan_adim, olusturma) "
                "VALUES (%s, %s, true, 0, now()) RETURNING id",
                [kullanici.pk, deger],
            )
            return imlec.fetchone()[0]

    def test_ileri_geri_idempotent(self):
        p1, p2 = self.ham_ekle(self.editor, SIR), self.ham_ekle(self.izleyici, SIR2)
        self.assertEqual(sifreleme.tabloyu_donustur(connection, "sifrele"), 2)
        sifreli = (ham_deger(p1), ham_deger(p2))
        self.assertTrue(all(sifreleme.belirec_bicimli_mi(d) for d in sifreli))
        self.assertEqual(sifreleme.tabloyu_donustur(connection, "sifrele"), 0)  # ikinci kez şifrelemez
        self.assertEqual((ham_deger(p1), ham_deger(p2)), sifreli)
        self.assertEqual(MFACihazi.objects.get(pk=p1).gizli_anahtar, SIR)
        self.assertEqual(sifreleme.tabloyu_donustur(connection, "coz"), 2)
        self.assertEqual((ham_deger(p1), ham_deger(p2)), (SIR, SIR2))
        self.assertEqual(sifreleme.tabloyu_donustur(connection, "coz"), 0)
        self.assertEqual(MFACihazi.objects.count(), 2)  # satır silinmez

    def test_karisik_durumda_yalniz_duz_olan_sifrelenir(self):
        sifreli_pk = self.ham_ekle(self.editor, sifreleme.sifrele(SIR))
        duz_pk = self.ham_ekle(self.izleyici, SIR2)
        onceki = ham_deger(sifreli_pk)
        self.assertEqual(sifreleme.tabloyu_donustur(connection, "sifrele"), 1)
        self.assertEqual(ham_deger(sifreli_pk), onceki)
        self.assertEqual(MFACihazi.objects.get(pk=duz_pk).gizli_anahtar, SIR2)

    def test_cozulemeyen_belirecte_hicbir_satir_degismez(self):
        yabanci = Fernet(ANAHTAR_B.encode()).encrypt(SIR.encode()).decode()
        p1, p2 = self.ham_ekle(self.editor, SIR2), self.ham_ekle(self.izleyici, yabanci)
        for yon in ("sifrele", "coz"):
            with self.assertRaises(SifrelemeHatasi):
                sifreleme.tabloyu_donustur(connection, yon)
            self.assertEqual((ham_deger(p1), ham_deger(p2)), (SIR2, yabanci))

    def test_anahtar_yoksa_net_hata_ve_degisiklik_yok(self):
        pk = self.ham_ekle(self.editor, SIR)
        with override_settings(MFA_SIFRELEME_ANAHTARI=""):
            with self.assertRaisesMessage(SifrelemeHatasi, "tanımlı değil"):
                sifreleme.tabloyu_donustur(connection, "sifrele")
        self.assertEqual(ham_deger(pk), SIR)


class MigrasyonUcTanUcaTesti(TestCase):
    """Gerçek migrasyon: 0005 <-> 0006 (ileri, geri, tekrar ileri, anahtarsız ileri).
    TestCase içinde çalışır (PostgreSQL DDL işlemseldir; test sonunda geri alınır). TransactionTestCase kullanılmaz:
    silme koruması tetikleyicileri tabloları boşaltmaya (TRUNCATE) izin vermez."""

    ONCE = ("qr", "0005_uygulama_rolu_yetkileri")
    SONRA = ("qr", "0006_mfa_gizli_anahtar_sifreli")

    def migrate(self, hedef):
        yurutucu = MigrationExecutor(connection)
        yurutucu.migrate([hedef])
        return MigrationExecutor(connection).loader.project_state([hedef]).apps

    def sutun_tipi(self):
        with connection.cursor() as imlec:
            imlec.execute(
                "SELECT data_type FROM information_schema.columns WHERE table_name='qr_mfacihazi' AND column_name='gizli_anahtar'"
            )
            return imlec.fetchone()[0]

    def test_ileri_geri_ve_anahtarsiz_durma(self):
        apps = self.migrate(self.ONCE)
        self.assertEqual(self.sutun_tipi(), "character varying")
        Kullanici = apps.get_model(*get_user_model()._meta.label_lower.split("."))
        Cihaz = apps.get_model("qr", "MFACihazi")
        k1, k2 = Kullanici.objects.create(username="m1"), Kullanici.objects.create(username="m2")
        Cihaz.objects.create(kullanici_id=k1.pk, gizli_anahtar=SIR, onayli=True)
        Cihaz.objects.create(kullanici_id=k2.pk, gizli_anahtar=SIR2, onayli=False)
        with connection.cursor() as imlec:
            imlec.execute("SET CONSTRAINTS ALL IMMEDIATE")  # bekleyen FK tetikleyicisi ALTER TABLE'ı engellemesin

        def ham():
            with connection.cursor() as imlec:
                imlec.execute("SELECT gizli_anahtar FROM qr_mfacihazi ORDER BY id")
                return [r[0] for r in imlec.fetchall()]

        # Anahtar yok: anlaşılır hata, hiçbir satır ve şema değişmez, migrasyon uygulanmış sayılmaz.
        with override_settings(MFA_SIFRELEME_ANAHTARI=""):
            with self.assertRaisesMessage(ImproperlyConfigured, "hiçbir kayıt değiştirilmedi"):
                self.migrate(self.SONRA)
        self.assertEqual(ham(), [SIR, SIR2])
        self.assertEqual(self.sutun_tipi(), "character varying")
        self.assertNotIn(self.SONRA, MigrationExecutor(connection).loader.applied_migrations)

        # İleri: hepsi şifrelenir, sütun text olur.
        self.migrate(self.SONRA)
        sifreli = ham()
        self.assertEqual(self.sutun_tipi(), "text")
        self.assertTrue(all(sifreleme.belirec_bicimli_mi(d) for d in sifreli))
        self.assertTrue(all(SIR not in d and SIR2 not in d for d in sifreli))
        self.assertEqual([c.gizli_anahtar for c in MFACihazi.objects.order_by("id")], [SIR, SIR2])

        # Geri: düz metne döner, sütun varchar(64).
        self.migrate(self.ONCE)
        self.assertEqual(ham(), [SIR, SIR2])
        self.assertEqual(self.sutun_tipi(), "character varying")

        # Tekrar ileri ve ardından veri adımı yeniden çalışırsa çift şifreleme olmaz.
        self.migrate(self.SONRA)
        ilk = ham()
        self.assertEqual(sifreleme.tabloyu_donustur(connection, "sifrele"), 0)
        self.assertEqual(ham(), ilk)
        self.assertEqual(MFACihazi.objects.count(), 2)
