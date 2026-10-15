"""Test altyapısı: ortak taban sınıf, kullanıcı ve veri üreticiler."""
import atexit
import io
import shutil
import tempfile
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image

from qr import roller
from qr.models import Kampanya, KampanyaSayfasi, QRKod
from qr.servisler import qr_kaydet

MEDYA_DIZINI = tempfile.mkdtemp(prefix="qr-test-medya-")
atexit.register(shutil.rmtree, MEDYA_DIZINI, ignore_errors=True)

TEST_AYARLARI = dict(
    STORAGES={
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    },
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    YONLENDIRME_HIZ_SINIRI=0,
    GUVENILIR_VEKIL=True,
    MEDIA_ROOT=MEDYA_DIZINI,
    GIRIS_DENEME_SINIRI=5,
    GIRIS_KILIT_SURESI_SN=900,
    HESAP_DENEME_SINIRI=10,
    IP_DENEME_SINIRI=20,
    GIRIS_HIZ_SINIRI=0,
    # Ortamdan bağımsız: .env'deki MFA_ZORUNLU=1 testleri etkilemesin (MFA gerektiren testler kendi
    # override_settings(MFA_ZORUNLU=True) ayarını verir).
    MFA_ZORUNLU=False,
)

def betik_dizini():
    """scripts/ klasörü: depoda proje kökünde, Docker testinde /scripts (test.sh salt okunur bağlar).
    SCRIPTS_DIZINI ortam değişkeni verilmişse o kullanılır."""
    import os
    from pathlib import Path

    adaylar = [os.environ.get("SCRIPTS_DIZINI"), Path(__file__).resolve().parents[3] / "scripts", "/scripts"]
    for aday in adaylar:
        if aday and (Path(aday) / "yedek-al.sh").is_file():
            return Path(aday)
    raise FileNotFoundError(f"scripts klasörü bulunamadı (denenen: {[str(a) for a in adaylar if a]})")


PAROLA = "Cok-Guclu-Parola-2026!"
Kullanici = get_user_model()


@override_settings(**TEST_AYARLARI)
class TemelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("rolleri_kur")
        cls.yonetici = cls.kullanici_olustur("yonetici", roller.YONETICI)
        cls.editor = cls.kullanici_olustur("editor", roller.EDITOR)
        cls.izleyici = cls.kullanici_olustur("izleyici", roller.IZLEYICI)
        cls.rolsuz = cls.kullanici_olustur("rolsuz", None)

    @staticmethod
    def kullanici_olustur(ad, rol, **ek):
        k = Kullanici.objects.create_user(ad, f"{ad}@example.com", PAROLA, **ek)
        if rol:
            k.groups.add(Group.objects.get(name=rol))
        return k

    def setUp(self):
        from django.core.cache import cache

        cache.clear()

    def giris(self, kullanici):
        self.client.force_login(kullanici)
        return self.client

    # --- veri üreticiler ---
    def qr_yap(self, kod="TEST01", hedef="https://example.com/hedef", **ek):
        qr = QRKod(kisa_kod=kod, hedef_turu="harici", hedef_url=hedef, **ek)
        qr.full_clean()
        return qr_kaydet(qr, None)

    def kampanya_yap(self, kod="K1", **ek):
        return Kampanya.objects.create(kod=kod, ad=f"Kampanya {kod}", **ek)

    def sayfa_yap(self, slug="yaz-indirimi", durum="yayinda", **ek):
        return KampanyaSayfasi.objects.create(slug=slug, baslik="Yaz indirimi", durum=durum, **ek)


def png_dosyasi(ad="gorsel.png", bicim="PNG", boyut=(20, 20), ek_bayt=0):
    """Pillow ile gerçek görsel üretir; ek_bayt kadar sondan dolgu ekler (boyut testi için)."""
    tampon = io.BytesIO()
    Image.new("RGB", boyut, (200, 30, 30)).save(tampon, bicim)
    from django.core.files.uploadedfile import SimpleUploadedFile

    return SimpleUploadedFile(ad, tampon.getvalue() + b"\0" * ek_bayt, content_type="image/" + bicim.lower())


def gelecek(gun):
    return timezone.now() + timedelta(days=gun)
