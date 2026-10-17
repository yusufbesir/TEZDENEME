"""Halka açık yönlendirme, sağlık ucu ve tarama sayımı."""
from django.test import override_settings

from qr.models import GenelAyarlar, HedefGecmisi, Tarama

from .yardimci import TemelTest, gelecek

MASAUSTU_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
BOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"


class YonlendirmeTesti(TemelTest):
    def test_dogru_hedefe_302(self):
        self.qr_yap("YON001", "https://example.com/hedef")
        yanit = self.client.get("/k/YON001")
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(yanit["Location"], "https://example.com/hedef")
        self.assertIn("no-store", yanit["Cache-Control"])

    def test_buyuk_kucuk_harf_duyarsiz(self):
        self.qr_yap("YonAbc", "https://example.com/a")
        self.assertEqual(self.client.get("/k/yonabc")["Location"], "https://example.com/a")

    def test_hedef_degisince_ayni_kod_yeni_hedefe_gider(self):
        qr = self.qr_yap("DEGIS1", "https://example.com/eski")
        self.assertEqual(self.client.get("/k/DEGIS1")["Location"], "https://example.com/eski")
        self.giris(self.editor)
        yanit = self.client.post(f"/panel/qr/{qr.pk}/duzenle", {
            "tur": "kampanya", "hedef_turu": "harici", "hedef_url": "https://example.com/yeni", "durum": "aktif",
            "degisiklik_notu": "Yeni afiş",
        })
        self.assertEqual(yanit.status_code, 302)
        self.client.logout()
        self.assertEqual(self.client.get("/k/DEGIS1")["Location"], "https://example.com/yeni")
        gecmis = list(HedefGecmisi.objects.filter(qr=qr).order_by("zaman", "id"))
        self.assertEqual(len(gecmis), 2)
        self.assertEqual(gecmis[1].eski_hedef_url, "https://example.com/eski")
        self.assertEqual(gecmis[1].yeni_hedef_url, "https://example.com/yeni")
        self.assertEqual(gecmis[1].kullanici, self.editor)
        self.assertEqual(gecmis[1].not_metni, "Yeni afiş")

    def test_baslamamis_kampanya_mesaj_gosterir(self):
        k = self.kampanya_yap("KB", baslangic=gelecek(5), bitis=gelecek(10))
        self.qr_yap("BAS001", kampanya=k)
        ayar = GenelAyarlar.al()
        yanit = self.client.get("/k/BAS001")
        self.assertEqual(yanit.status_code, 200)
        self.assertContains(yanit, ayar.baslamadi_mesaj)

    def test_baslamamis_kampanya_ayarli_urle_yonlenir(self):
        k = self.kampanya_yap("KB2", baslangic=gelecek(5))
        self.qr_yap("BAS002", kampanya=k)
        GenelAyarlar.objects.update_or_create(pk=1, defaults={"baslamadi_url": "https://example.com/yakinda"})
        yanit = self.client.get("/k/BAS002")
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(yanit["Location"], "https://example.com/yakinda")

    def test_bitmis_kampanya_mesaj_gosterir(self):
        k = self.kampanya_yap("KT", baslangic=gelecek(-10), bitis=gelecek(-1))
        self.qr_yap("BIT001", kampanya=k)
        yanit = self.client.get("/k/BIT001")
        self.assertEqual(yanit.status_code, 200)
        self.assertContains(yanit, GenelAyarlar.al().bitti_mesaj)

    def test_bitmis_kampanya_ayarli_urle_yonlenir(self):
        self.qr_yap("BIT002", bitis=gelecek(-1))
        GenelAyarlar.objects.update_or_create(pk=1, defaults={"bitti_url": "https://example.com/bitti"})
        yanit = self.client.get("/k/BIT002")
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(yanit["Location"], "https://example.com/bitti")

    def test_bitmis_kodun_kendi_bitis_sonrasi_adresi_onceliklidir(self):
        self.qr_yap("BIT003", bitis=gelecek(-1), bitis_sonrasi_url="https://example.com/kod-ozel")
        GenelAyarlar.objects.update_or_create(pk=1, defaults={"bitti_url": "https://example.com/genel"})
        self.assertEqual(self.client.get("/k/BIT003")["Location"], "https://example.com/kod-ozel")

    def test_pasif_kod(self):
        self.qr_yap("PAS001", durum="pasif")
        yanit = self.client.get("/k/PAS001")
        self.assertEqual(yanit.status_code, 200)
        self.assertContains(yanit, GenelAyarlar.al().pasif_mesaj)
        self.assertNotIn("Location", yanit)

    def test_arsiv_kodu_410(self):
        self.qr_yap("ARS001", durum="arsiv")
        self.assertEqual(self.client.get("/k/ARS001").status_code, 410)

    def test_gecersiz_kisa_kod_404(self):
        yanit = self.client.get("/k/YOKBOYLEKOD")
        self.assertEqual(yanit.status_code, 404)
        self.assertContains(yanit, GenelAyarlar.al().bulunamadi_mesaj, status_code=404)

    def test_sayfa_yonlendirmesi(self):
        sayfa = self.sayfa_yap("kampanya-x")
        from qr.models import QRKod
        from qr.servisler import qr_kaydet

        qr = QRKod(kisa_kod="SAY001", hedef_turu="sayfa", sayfa=sayfa)
        qr.full_clean()
        qr_kaydet(qr, None)
        yanit = self.client.get("/k/SAY001")
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(yanit["Location"], "/s/kampanya-x")

    def test_sayfa_yayinda_degilse_yonlendirmez(self):
        sayfa = self.sayfa_yap("taslak-x", durum="taslak")
        from qr.models import QRKod
        from qr.servisler import qr_kaydet

        qr = QRKod(kisa_kod="SAY002", hedef_turu="sayfa", sayfa=sayfa)
        qr_kaydet(qr, None)
        yanit = self.client.get("/k/SAY002")
        self.assertEqual(yanit.status_code, 200)
        self.assertNotIn("Location", yanit)

    def test_saglik_ucu_200(self):
        yanit = self.client.get("/saglik")
        self.assertEqual(yanit.status_code, 200)
        self.assertEqual(yanit.json(), {"durum": "ok"})

    @override_settings(GUVENILIR_VEKIL=True)
    def test_bot_taramalari_ayri_sayilir(self):
        self.qr_yap("BOT001")
        self.client.get("/k/BOT001", HTTP_USER_AGENT=MASAUSTU_UA, HTTP_X_FORWARDED_FOR="203.0.113.5")
        self.client.get("/k/BOT001", HTTP_USER_AGENT=BOT_UA, HTTP_X_FORWARDED_FOR="203.0.113.6")
        self.assertEqual(Tarama.objects.filter(bot=False).count(), 1)
        self.assertEqual(Tarama.objects.filter(bot=True).count(), 1)
