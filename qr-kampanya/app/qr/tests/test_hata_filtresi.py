from django.test import SimpleTestCase, override_settings
from django.views.debug import get_default_exception_reporter_filter


class HataFiltresiTesti(SimpleTestCase):
    @override_settings(MFA_SIFRELEME_ANAHTARI="cok-gizli-deger", YONETICI_PAROLASI="baska-gizli")
    def test_turkce_adli_sirlar_hata_sayfasinda_gizlenir(self):
        ayarlar = get_default_exception_reporter_filter().get_safe_settings()
        self.assertNotEqual(ayarlar["MFA_SIFRELEME_ANAHTARI"], "cok-gizli-deger")
        self.assertNotEqual(ayarlar["YONETICI_PAROLASI"], "baska-gizli")
        self.assertNotEqual(ayarlar["SECRET_KEY"], "")
        self.assertIn("*", ayarlar["MFA_SIFRELEME_ANAHTARI"])
