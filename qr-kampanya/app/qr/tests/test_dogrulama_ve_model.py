"""URL doğrulama ve model koruma kuralları."""
from django.core.exceptions import ValidationError

from qr.dogrulama import url_gecerli_mi
from qr.models import HedefGecmisi, KampanyaSayfasi, QRKod

from .yardimci import TemelTest

TEHLIKELI_URLLER = [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "http://127.0.0.1/yonetim",
    "http://10.0.0.1/",
    "http://localhost/",
    "http://localhost:8000/panel/",
    "https://kullanici:parola@example.com/",
    "http://[::1]/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "ftp://example.com/dosya",
    "https://example.com/bosluk var",
    # Denetim bulguları: kök etiketli, CGNAT, yeni yerel uzantılar, IPv4-eşlemeli IPv6
    "http://foo.local./",
    "http://localhost./",
    "http://foo.internal./x",
    "http://100.64.0.1/",
    "http://100.127.255.254/",
    "http://nas.lan/",
    "http://yazici.home.arpa/",
    "http://[::ffff:127.0.0.1]/",
    "http://0.0.0.0/",
    "http://192.0.2.10/",
]


class UrlDogrulamaTesti(TemelTest):
    def test_tehlikeli_urller_reddedilir(self):
        for url in TEHLIKELI_URLLER:
            with self.subTest(url=url):
                self.assertFalse(url_gecerli_mi(url))

    def test_normal_urller_kabul_edilir(self):
        for url in ("https://example.com/", "http://example.com/a?b=1#c", "https://alt.ornek.com.tr/kampanya"):
            with self.subTest(url=url):
                self.assertTrue(url_gecerli_mi(url))

    def test_genel_ip_ve_idn_reddedilmez(self):
        from qr.dogrulama import idn_mi

        for url in ("http://8.8.8.8/", "https://münchen.example/yol", "https://xn--mnchen-3ya.example/"):
            with self.subTest(url=url):
                self.assertTrue(url_gecerli_mi(url))
                self.assertTrue(idn_mi(url) or url == "http://8.8.8.8/")
        self.assertFalse(idn_mi("https://example.com/"))

    def test_idn_hedefte_panel_uyari_gosterir_ama_kaydeder(self):
        self.giris(self.editor)
        yanit = self.client.post("/panel/qr/yeni", {
            "tur": "kampanya", "hedef_turu": "harici", "hedef_url": "https://xn--mnchen-3ya.example/", "durum": "aktif",
        }, follow=True)
        self.assertEqual(QRKod.objects.count(), 1)
        mesajlar = [str(m) for m in yanit.context["messages"]]
        self.assertTrue(any("IDN" in m for m in mesajlar), mesajlar)
        yanit = self.client.post("/panel/qr/yeni", {
            "tur": "kampanya", "hedef_turu": "harici", "hedef_url": "https://example.com/", "durum": "aktif",
        }, follow=True)
        self.assertFalse(any("IDN" in str(m) for m in yanit.context["messages"]))

    def test_panelden_tehlikeli_url_kaydedilemez(self):
        self.giris(self.editor)
        for url in TEHLIKELI_URLLER:
            with self.subTest(url=url):
                yanit = self.client.post("/panel/qr/yeni", {"tur": "kampanya", "hedef_turu": "harici", "hedef_url": url, "durum": "aktif"})
                self.assertEqual(yanit.status_code, 200)
                self.assertTrue(yanit.context["form"].errors.get("hedef_url"), url)
        self.assertEqual(QRKod.objects.count(), 0)

    def test_tehlikeli_buton_url_sayfada_reddedilir(self):
        self.giris(self.editor)
        yanit = self.client.post("/panel/sayfalar/yeni", {
            "slug": "x-sayfa", "tur": "kampanya", "durum": "taslak", "baslik": "X", "renk_tema": "sade",
            "buton_metni": "Git", "buton_url": "javascript:alert(1)",
        })
        self.assertEqual(yanit.status_code, 200)
        self.assertEqual(KampanyaSayfasi.objects.count(), 0)


class ModelKorumaTesti(TemelTest):
    def test_kisa_kod_degistirilemez(self):
        qr = self.qr_yap("SABIT1")
        qr.kisa_kod = "BASKA1"
        with self.assertRaises(ValidationError):
            qr.save()
        self.assertEqual(QRKod.objects.get(pk=qr.pk).kisa_kod, "SABIT1")

    def test_panelde_kisa_kod_degistirilemez(self):
        qr = self.qr_yap("SABIT2")
        self.giris(self.editor)
        yanit = self.client.post(f"/panel/qr/{qr.pk}/duzenle", {
            "kisa_kod": "HACKED", "tur": "kampanya", "hedef_turu": "harici",
            "hedef_url": "https://example.com/yeni", "durum": "aktif",
        })
        self.assertEqual(yanit.status_code, 302)
        qr.refresh_from_db()
        self.assertEqual(qr.kisa_kod, "SABIT2")
        self.assertEqual(qr.hedef_url, "https://example.com/yeni")
        self.assertFalse(QRKod.objects.filter(kisa_kod="HACKED").exists())

    def test_duzenleme_formunda_kisa_kod_salt_okunur(self):
        qr = self.qr_yap("SABIT3")
        self.giris(self.editor)
        yanit = self.client.get(f"/panel/qr/{qr.pk}/duzenle")
        self.assertTrue(yanit.context["form"].fields["kisa_kod"].disabled)
        self.assertContains(yanit, "SABIT3")

    def test_qr_silinemez(self):
        qr = self.qr_yap("SILME1")
        with self.assertRaises(ValidationError):
            qr.delete()
        self.assertTrue(QRKod.objects.filter(pk=qr.pk).exists())

    def test_panelde_silme_ucu_yok(self):
        qr = self.qr_yap("SILME2")
        self.giris(self.yonetici)
        for yol in (f"/panel/qr/{qr.pk}/sil", f"/panel/qr/{qr.pk}/delete", f"/panel/qr/{qr.pk}/"):
            yanit = self.client.post(yol)
            self.assertIn(yanit.status_code, (404, 405), yol)
        self.assertTrue(QRKod.objects.filter(pk=qr.pk).exists())

    def test_sayfa_silinemez(self):
        sayfa = self.sayfa_yap()
        with self.assertRaises(ValidationError):
            sayfa.delete()

    def test_mukerrer_kisa_kod_buyuk_kucuk_harf_duyarsiz_reddedilir(self):
        self.giris(self.editor)
        veri = {"kisa_kod": "Kampanya-A", "tur": "kampanya", "hedef_turu": "harici", "hedef_url": "https://example.com/1", "durum": "aktif"}
        self.assertEqual(self.client.post("/panel/qr/yeni", veri).status_code, 302)
        veri["kisa_kod"] = "KAMPANYA-a"
        yanit = self.client.post("/panel/qr/yeni", veri)
        self.assertEqual(yanit.status_code, 200)
        self.assertTrue(yanit.context["form"].errors.get("kisa_kod"))
        self.assertEqual(QRKod.objects.count(), 1)

    def test_otomatik_kisa_kod_uretilir(self):
        self.giris(self.editor)
        yanit = self.client.post("/panel/qr/yeni", {"tur": "urun", "hedef_turu": "harici", "hedef_url": "https://example.com/u", "durum": "aktif"})
        self.assertEqual(yanit.status_code, 302)
        qr = QRKod.objects.get()
        self.assertRegex(qr.kisa_kod, r"^[2-9A-Z]{8}$")

    def test_hedef_gecmisi_ilk_kayit(self):
        qr = self.qr_yap("GECMIS1")
        self.assertEqual(HedefGecmisi.objects.filter(qr=qr).count(), 1)
