"""PostgreSQL destekli, işçiler arası paylaşılan hız sınırı: paylaşım, atomiklik, pencere, fail-open."""
import threading
from unittest import mock

from django.conf import settings
from django.db import connection, connections
from django.test import Client, TransactionTestCase, override_settings

from qr import hiz as hiz_modul
from qr.hiz import hiz_sinirlayici
from qr.models import DenemeSayaci, QRKod

from .yardimci import TEST_AYARLARI, TemelTest


def _hiz_satirlari():
    return DenemeSayaci.objects.filter(anahtar__startswith="hiz:")


@override_settings(**TEST_AYARLARI)
class PaylasimliHizSiniriTransactionTest(TransactionTestCase):
    def _fixture_teardown(self):
        # Silme koruması tetikleyicileri nedeniyle tam flush yapılmaz; yalnızca bu testin verisi silinir.
        DenemeSayaci.objects.all().delete()

    def setUp(self):
        _hiz_satirlari().delete()

    def test_esizamanli_artista_sinir_asilmaz(self):
        # 8 ayrı DB bağlantısı (= ayrı işçi gibi), toplam 100 istek, sınır 30 -> tam 30 izin.
        sonuc, kilit = [], threading.Lock()

        def is_(n):
            try:
                for _ in range(n):
                    k = hiz_sinirlayici.izin_ver("1.2.3.4", 30)
                    with kilit:
                        sonuc.append(k)
            finally:
                connections.close_all()

        # Sahte saat 1970'te olduğundan satır "süresi dolmuş" görünür; rastgele temizliği kapat.
        with mock.patch("time.time", return_value=1_000_000.0), mock.patch.object(hiz_sinirlayici, "TEMIZLIK_OLASILIGI", 0):
            parcaciklar = [threading.Thread(target=is_, args=(12,)) for _ in range(8)]
            parcaciklar.append(threading.Thread(target=is_, args=(4,)))
            [p.start() for p in parcaciklar]
            [p.join() for p in parcaciklar]
        self.assertEqual(len(sonuc), 100)
        self.assertEqual(sum(sonuc), 30)

    def test_iki_surec_ayni_sayaci_paylasir(self):
        # Gerçek ayrı işletim sistemi süreçleri (Gunicorn işçileri gibi): her biri kendi bağlantısıyla sayar.
        import os
        import subprocess
        import sys
        from pathlib import Path

        betik = (
            "import django, os\n"
            "from unittest import mock\n"
            "django.setup()\n"
            "from qr.hiz import hiz_sinirlayici\n"
            "with mock.patch('time.time', return_value=2_000_000.0):\n"
            "    hiz_sinirlayici.TEMIZLIK_OLASILIGI = 0\n"
            "    print('IZIN', sum(hiz_sinirlayici.izin_ver('5.6.7.8', 10) for _ in range(8)))\n"
        )
        ortam = dict(os.environ, DJANGO_SETTINGS_MODULE="config.settings", MFA_SIFRELEME_ANAHTARI=settings.MFA_SIFRELEME_ANAHTARI, POSTGRES_DB=connection.settings_dict["NAME"])
        kok = Path(__file__).resolve().parents[2]
        surecler = [
            subprocess.Popen([sys.executable, "-c", betik], cwd=kok, env=ortam, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            for _ in range(3)
        ]
        toplam = 0
        for s in surecler:
            cikti, hata = s.communicate(timeout=120)
            self.assertEqual(s.returncode, 0, hata)
            toplam += int(cikti.split("IZIN")[1])
        self.assertEqual(toplam, 10)  # 3 süreç x 8 istek = 24; toplam sınır 10 (işçi sayısıyla çarpılmaz)
        self.assertEqual(_hiz_satirlari().get().sayi, 24)


@override_settings(**TEST_AYARLARI)
class PaylasimliHizSiniriTest(TemelTest):
    def test_pencere_dolunca_sifirlanir(self):
        with mock.patch("time.time", return_value=6000.0), mock.patch.object(hiz_sinirlayici, "TEMIZLIK_OLASILIGI", 0):
            self.assertEqual([hiz_sinirlayici.izin_ver("a", 2) for _ in range(4)], [True, True, False, False])
        with mock.patch("time.time", return_value=6000.0 + 59), mock.patch.object(hiz_sinirlayici, "TEMIZLIK_OLASILIGI", 0):
            self.assertFalse(hiz_sinirlayici.izin_ver("a", 2))
        with mock.patch("time.time", return_value=6000.0 + 60), mock.patch.object(hiz_sinirlayici, "TEMIZLIK_OLASILIGI", 0):
            self.assertEqual([hiz_sinirlayici.izin_ver("a", 2) for _ in range(3)], [True, True, False])

    def test_anahtarlar_ayri_ve_sinir_sifir_kapali(self):
        self.assertTrue(hiz_sinirlayici.izin_ver("x", 1))
        self.assertFalse(hiz_sinirlayici.izin_ver("x", 1))
        self.assertTrue(hiz_sinirlayici.izin_ver("y", 1))
        for _ in range(5):
            self.assertTrue(hiz_sinirlayici.izin_ver("z", 0))
        self.assertEqual(_hiz_satirlari().count(), 2)

    def test_uzun_anahtar_sabit_uzunlukta(self):
        self.assertTrue(hiz_sinirlayici.izin_ver("u" * 500, 5))
        self.assertLessEqual(max(len(a) for a in _hiz_satirlari().values_list("anahtar", flat=True)), 100)

    def test_db_de_ham_ip_yok_hmac_ozeti_var(self):
        import hmac, hashlib, re
        from django.conf import settings

        ipler = ["198.51.100.23", "2001:db8:abcd:12::/64", "giris|198.51.100.23"]
        for ip in ipler:
            hiz_sinirlayici.izin_ver(ip, 5)
        with connection.cursor() as c:  # ham SQL: tablonun tüm metni
            c.execute("SELECT anahtar FROM qr_denemesayaci WHERE anahtar LIKE 'hiz:%%'")
            anahtarlar = [r[0] for r in c.fetchall()]
            c.execute("SELECT count(*) FROM qr_denemesayaci WHERE anahtar LIKE '%%198.51.100.23%%' OR anahtar LIKE '%%2001:db8%%'")
            self.assertEqual(c.fetchone()[0], 0)
        self.assertEqual(len(anahtarlar), 3)
        for a in anahtarlar:
            self.assertRegex(a, r"^hiz:\d+:[0-9a-f]{64}$")
        beklenen = hmac.new(settings.SECRET_KEY.encode(), b"hiz|198.51.100.23", hashlib.sha256).hexdigest()
        self.assertTrue(any(a.endswith(":" + beklenen) for a in anahtarlar))
        # Düz SHA-256 ile eşleşmemeli (tuzsuz özet kaba kuvvetle çözülebilir).
        self.assertFalse(any(a.endswith(hashlib.sha256(b"198.51.100.23").hexdigest()) for a in anahtarlar))

    def test_temizlik_yalnizca_suresi_dolmus_hiz_satirlarini_siler(self):
        from datetime import timedelta

        from django.utils import timezone

        gecmis = timezone.now() - timedelta(seconds=5)
        gelecek = timezone.now() + timedelta(seconds=500)
        DenemeSayaci.objects.create(anahtar="hiz:1:eski", sayi=3, bitis=gecmis)
        DenemeSayaci.objects.create(anahtar="hiz:1:taze", sayi=3, bitis=gelecek)
        DenemeSayaci.objects.create(anahtar="hesap:eski", sayi=3, bitis=gecmis)  # giriş kilidi: dokunulmaz
        self.assertEqual(hiz_sinirlayici.temizle(), 1)
        self.assertEqual(set(DenemeSayaci.objects.values_list("anahtar", flat=True)), {"hiz:1:taze", "hesap:eski"})

    def test_temizlik_izin_ver_icinden_tetiklenir(self):
        with mock.patch.object(hiz_sinirlayici, "TEMIZLIK_OLASILIGI", 1.0), mock.patch.object(hiz_sinirlayici, "temizle") as t:
            hiz_sinirlayici.izin_ver("q", 5)
        t.assert_called_once()

    @override_settings(YONLENDIRME_HIZ_SINIRI=3)
    def test_yonlendirme_sinir_sonrasi_429(self):
        self.qr_yap("PAY001")
        kodlar = [self.client.get("/k/PAY001", HTTP_X_FORWARDED_FOR="203.0.113.5").status_code for _ in range(5)]
        self.assertEqual(kodlar, [302, 302, 302, 429, 429])

    @override_settings(YONLENDIRME_HIZ_SINIRI=3)
    def test_db_hatasinda_yonlendirme_302_doner(self):
        self.qr_yap("PAY002")
        with mock.patch.object(hiz_modul, "_ARTIR_SQL", "INSERT INTO olmayan_tablo VALUES (%s, %s)"), self.assertLogs("qr.hiz", "WARNING") as kayit:
            hiz_sinirlayici._son_log = 0.0
            kodlar = [self.client.get("/k/PAY002").status_code for _ in range(6)]
        self.assertEqual(kodlar, [302] * 6)
        self.assertEqual(len(kayit.records), 1)  # log taşması yok (10 sn'de bir)

    @override_settings(GIRIS_HIZ_SINIRI=2)
    def test_giris_db_hatasinda_fail_open(self):
        with mock.patch.object(hiz_modul, "_ARTIR_SQL", "INSERT INTO olmayan_tablo VALUES (%s, %s)"):
            hiz_sinirlayici._son_log = 0.0
            kodlar = [self.client.post("/panel/giris", {"username": "x", "password": "y"}).status_code for _ in range(4)]
        self.assertNotIn(429, kodlar)
