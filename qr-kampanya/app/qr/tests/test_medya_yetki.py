"""Medya yetki ucu (/ic/medya-yetki, Caddy forward_auth) ve yönlendirme hız sınırı IPv6 gruplaması."""
from django.test import override_settings
from django.urls import reverse

from qr.hiz import hiz_sinirlayici
from qr.models import DenetimKaydi, KampanyaSayfasi, MFACihazi, SayfaGorseli

from .yardimci import TemelTest, png_dosyasi

URL = "/ic/medya-yetki"


class MedyaYetkiTest(TemelTest):
    def setUp(self):
        super().setUp()
        self.yayin = self.sayfa_yap("yayin", "yayinda", kapak_gorseli=png_dosyasi("k.png"), logo=png_dosyasi("l.png"))
        self.galeri = SayfaGorseli.objects.create(sayfa=self.yayin, gorsel=png_dosyasi("g.png"))
        self.taslak = self.sayfa_yap("taslak", "taslak", kapak_gorseli=png_dosyasi("t.png"))
        self.taslak_galeri = SayfaGorseli.objects.create(sayfa=self.taslak, gorsel=png_dosyasi("tg.png"))
        self.arsiv = self.sayfa_yap("arsiv", "arsiv", logo=png_dosyasi("a.png"))

    def sor(self, ad, istemci=None, yontem="GET", uri=None, **ek):
        istemci = istemci or self.client
        uri = uri if uri is not None else f"/medya/{ad}"
        return istemci.get(URL, HTTP_X_FORWARDED_URI=uri, HTTP_X_FORWARDED_METHOD=yontem, **ek)

    def mfali(self, kullanici):
        MFACihazi.objects.create(kullanici=kullanici, gizli_anahtar="JBSWY3DPEHPK3PXP", onayli=True)
        return self.giris(kullanici)

    # --- anonim ---
    def test_yayindaki_sayfa_gorselleri_anonim_200(self):
        for ad in (self.yayin.kapak_gorseli.name, self.yayin.logo.name, self.galeri.gorsel.name):
            yanit = self.sor(ad)
            self.assertEqual(yanit.status_code, 200, ad)
            self.assertEqual(yanit.content, b"")
            self.assertEqual(yanit["Cache-Control"], "no-store")

    def test_head_alt_istegi_calisir(self):
        yanit = self.client.head(URL, HTTP_X_FORWARDED_URI="/medya/" + self.yayin.logo.name, HTTP_X_FORWARDED_METHOD="HEAD")
        self.assertEqual(yanit.status_code, 200)

    def test_taslak_ve_arsiv_anonim_404(self):
        for ad in (self.taslak.kapak_gorseli.name, self.taslak_galeri.gorsel.name, self.arsiv.logo.name):
            yanit = self.sor(ad)
            self.assertEqual(yanit.status_code, 404, ad)
            self.assertEqual(yanit["Cache-Control"], "no-store")

    def test_sayfa_arsive_alininca_gorsel_kapanir(self):
        ad = self.yayin.kapak_gorseli.name
        self.assertEqual(self.sor(ad).status_code, 200)
        KampanyaSayfasi.objects.filter(pk=self.yayin.pk).update(durum="arsiv")
        self.assertEqual(self.sor(ad).status_code, 404)

    def test_referans_verilmeyen_dosya_404(self):
        self.assertEqual(self.sor("sayfa/2026/01/yok.png").status_code, 404)
        self.giris(self.yonetici)  # oturumlu bile olsa kayıtsız dosya sunulmaz
        self.assertEqual(self.sor("sayfa/2026/01/yok.png").status_code, 404)

    # --- oturumlu ---
    def test_mfali_editor_ve_izleyici_taslagi_gorur(self):
        ad = self.taslak.kapak_gorseli.name
        for kullanici in (self.editor, self.izleyici, self.yonetici):
            self.client.logout()
            self.mfali(kullanici)
            self.assertEqual(self.sor(ad).status_code, 200, kullanici.username)
            self.assertEqual(self.sor(self.taslak_galeri.gorsel.name).status_code, 200)
            self.assertEqual(self.sor(self.arsiv.logo.name).status_code, 200)

    def test_mfasi_dogrulanmamis_oturum_404(self):
        from qr.panel import mfa

        MFACihazi.objects.create(kullanici=self.editor, gizli_anahtar="JBSWY3DPEHPK3PXP", onayli=True)
        # Parola doğru, MFA bekliyor: oturumda yalnızca bekleyen kayıt vardır, kullanıcı oturum açmış sayılmaz.
        yanit = self.client.post(reverse("panel:giris"), {"username": "editor", "password": "Cok-Guclu-Parola-2026!"})
        self.assertEqual(yanit.status_code, 302)
        self.assertIn(mfa.OTURUM_ANAHTARI, self.client.session)
        self.assertEqual(self.sor(self.taslak.kapak_gorseli.name).status_code, 404)
        # Yayındaki görsel yine herkese açıktır.
        self.assertEqual(self.sor(self.yayin.logo.name).status_code, 200)

    def test_yetkisiz_kullanici_404(self):
        self.giris(self.rolsuz)
        self.assertEqual(self.sor(self.taslak.kapak_gorseli.name).status_code, 404)
        self.assertEqual(self.sor(self.yayin.logo.name).status_code, 200)

    def test_pasif_kullanici_404(self):
        self.giris(self.editor)
        self.editor.is_active = False
        self.editor.save()
        self.assertEqual(self.sor(self.taslak.kapak_gorseli.name).status_code, 404)

    # --- yol saldırıları ve yöntem ---
    def test_gecersiz_yollar_404(self):
        self.giris(self.yonetici)
        ad = self.yayin.logo.name
        kotu = [
            "/medya/../" + ad,
            "/medya/%2e%2e/" + ad,
            "/medya/%2E%2E/" + ad,
            "/medya/sayfa/../" + ad,
            "/medya/" + ad + "%00",
            "/medya/" + ad + "\x00",
            "/medya/sayfa\\" + ad.split("/", 1)[1],
            "/medya/%5C" + ad,
            "/medya//" + ad,
            "/medya/./" + ad,
            "/medya/",
            "/medya",
            "/" + ad,
            "//" + ad,
            "",
        ]
        for uri in kotu:
            self.assertEqual(self.sor("", uri=uri).status_code, 404, repr(uri))

    def test_x_forwarded_method_post_404(self):
        self.assertEqual(self.sor(self.yayin.logo.name, yontem="POST").status_code, 404)
        self.assertEqual(self.sor(self.yayin.logo.name, yontem="DELETE").status_code, 404)
        yanit = self.client.get(URL, HTTP_X_FORWARDED_URI="/medya/" + self.yayin.logo.name)  # yöntem başlığı yok
        self.assertEqual(yanit.status_code, 404)

    def test_dogrudan_post_404(self):
        yanit = self.client.post(URL, HTTP_X_FORWARDED_URI="/medya/" + self.yayin.logo.name, HTTP_X_FORWARDED_METHOD="GET")
        self.assertEqual(yanit.status_code, 404)

    def test_sorgu_dizesi_atilir_ve_url_cozulur(self):
        ad = self.yayin.kapak_gorseli.name
        self.assertEqual(self.sor("", uri=f"/medya/{ad}?v=1&x=../").status_code, 200)
        self.assertEqual(self.sor("", uri=f"/medya/{ad}#parca").status_code, 200)
        # Yüzde kodlu eğik çizgi/harf aynı dosyaya çözülür.
        kodlu = ad.replace("/", "%2F").replace("sayfa", "%73ayfa")
        self.assertEqual(self.sor("", uri=f"/medya/{kodlu}").status_code, 200)
        # Çift kodlama bir kez çözülür; sonuç kayıtlı ad olmadığı için 404.
        self.assertEqual(self.sor("", uri=f"/medya/%252e%252e/{ad}").status_code, 404)

    def test_denetim_kaydi_ve_oturum_olusturmaz(self):
        onceki = DenetimKaydi.objects.count()
        yanit = self.sor(self.yayin.logo.name)
        self.assertEqual(DenetimKaydi.objects.count(), onceki)
        self.assertNotIn("sessionid", yanit.cookies)

    def test_dis_url_tanimli_ve_ic_yol_sabit(self):
        self.assertEqual(reverse("medya_yetki"), URL)


class YonlendirmeHizSiniriIPv6Test(TemelTest):
    def setUp(self):
        super().setUp()
        hiz_sinirlayici._sayac = {}

    @override_settings(YONLENDIRME_HIZ_SINIRI=3)
    def test_ayni_64_farkli_adresler_ayni_kovayi_paylasir(self):
        self.qr_yap("HIZ001")
        adresler = [f"2001:db8:aaaa:bbbb::{i:x}" for i in range(1, 8)]
        durumlar = [
            self.client.get("/k/HIZ001", HTTP_X_FORWARDED_FOR=ip).status_code for ip in adresler
        ]
        self.assertEqual(durumlar[:3], [302, 302, 302])
        self.assertTrue(all(d == 429 for d in durumlar[3:]), durumlar)

    @override_settings(YONLENDIRME_HIZ_SINIRI=3)
    def test_farkli_64_ayri_kova(self):
        self.qr_yap("HIZ002")
        for i in range(3):
            self.assertEqual(self.client.get("/k/HIZ002", HTTP_X_FORWARDED_FOR="2001:db8:1:1::1").status_code, 302)
        self.assertEqual(self.client.get("/k/HIZ002", HTTP_X_FORWARDED_FOR="2001:db8:1:1::2").status_code, 429)
        self.assertEqual(self.client.get("/k/HIZ002", HTTP_X_FORWARDED_FOR="2001:db8:1:2::1").status_code, 302)
