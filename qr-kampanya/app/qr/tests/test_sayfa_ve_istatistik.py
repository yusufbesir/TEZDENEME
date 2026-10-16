"""Kampanya sayfaları, pano ve istatistik raporu."""
import csv
import io
import json
import os
import re
import tempfile
from datetime import timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from openpyxl import load_workbook

from qr.models import DenetimKaydi, KampanyaSayfasi, QRKod, SayfaGorseli, Tarama

from .yardimci import TemelTest, gelecek, png_dosyasi

SAYFA_VERISI = {
    "slug": "yaz-firsati", "tur": "kampanya", "durum": "taslak", "baslik": "Yaz fırsatı", "aciklama": "Güzel kampanya",
    "renk_tema": "siyah-bej", "seo_baslik": "Yaz fırsatı | Marka", "seo_aciklama": "Yaz fırsatlarını keşfedin.",
}


class KampanyaSayfasiTesti(TemelTest):
    def test_olusturma_taslak_404_yayin(self):
        self.giris(self.editor)
        yanit = self.client.post("/panel/sayfalar/yeni", SAYFA_VERISI)
        sayfa = KampanyaSayfasi.objects.get(slug="yaz-firsati")
        self.assertRedirects(yanit, f"/panel/sayfalar/{sayfa.pk}/duzenle")
        self.assertEqual(sayfa.olusturan, self.editor)
        self.assertTrue(DenetimKaydi.objects.filter(eylem="sayfa_olustur").exists())
        # Taslak herkese kapalı.
        anonim = self.client.__class__()
        self.assertEqual(anonim.get("/s/yaz-firsati").status_code, 404)
        # Yayına al.
        yanit = self.client.post(f"/panel/sayfalar/{sayfa.pk}/duzenle", {**SAYFA_VERISI, "durum": "yayinda", "baslik": "Yaz fırsatı 2"})
        self.assertEqual(yanit.status_code, 302)
        sayfa.refresh_from_db()
        self.assertEqual((sayfa.durum, sayfa.baslik, sayfa.degistiren), ("yayinda", "Yaz fırsatı 2", self.editor))
        genel = anonim.get("/s/yaz-firsati")
        self.assertEqual(genel.status_code, 200)
        self.assertContains(genel, "Yaz fırsatı 2")
        self.assertContains(genel, '<meta name="description" content="Yaz fırsatlarını keşfedin.">')
        self.assertContains(genel, "<title>Yaz fırsatı | Marka</title>")
        self.assertContains(genel, "tema-siyah-bej")
        # Arşivlenince tekrar kapanır.
        self.client.post(f"/panel/sayfalar/{sayfa.pk}/duzenle", {**SAYFA_VERISI, "durum": "arsiv"})
        self.assertEqual(anonim.get("/s/yaz-firsati").status_code, 404)

    def test_slug_degistirilemez(self):
        sayfa = self.sayfa_yap("sabit-slug", durum="taslak")
        self.giris(self.editor)
        yanit = self.client.get(f"/panel/sayfalar/{sayfa.pk}/duzenle")
        self.assertTrue(yanit.context["form"].fields["slug"].disabled)
        self.client.post(f"/panel/sayfalar/{sayfa.pk}/duzenle", {**SAYFA_VERISI, "slug": "degisti"})
        sayfa.refresh_from_db()
        self.assertEqual(sayfa.slug, "sabit-slug")

    def test_mukerrer_slug_reddedilir(self):
        self.sayfa_yap("ayni-slug")
        self.giris(self.editor)
        yanit = self.client.post("/panel/sayfalar/yeni", {**SAYFA_VERISI, "slug": "ayni-slug"})
        self.assertEqual(yanit.status_code, 200)
        self.assertTrue(yanit.context["form"].errors.get("slug"))

    def test_html_yorumlanmaz(self):
        sayfa = self.sayfa_yap("xss-sayfa", aciklama="<script>alert(1)</script>\nİkinci satır", kosullar="<b onclick=x>koşul</b>")
        yanit = self.client.get(f"/s/{sayfa.slug}")
        self.assertNotContains(yanit, "<script>alert(1)")
        self.assertContains(yanit, "&lt;script&gt;alert(1)&lt;/script&gt;")
        self.assertContains(yanit, "<br>İkinci satır")
        self.assertContains(yanit, "&lt;b onclick=x&gt;")

    def test_zaman_durumu_baslamadi_ve_bitti(self):
        a = self.sayfa_yap("henuz", baslangic=gelecek(3), buton_metni="Git", buton_url="https://example.com/git")
        b = self.sayfa_yap("bitmis", baslangic=gelecek(-9), bitis=gelecek(-1), buton_metni="Git", buton_url="https://example.com/git")
        c = self.sayfa_yap("gecerli", buton_metni="Git", buton_url="https://example.com/git")
        self.assertContains(self.client.get(f"/s/{a.slug}"), "henüz başlamadı")
        self.assertNotContains(self.client.get(f"/s/{a.slug}"), "https://example.com/git")
        self.assertContains(self.client.get(f"/s/{b.slug}"), "sona erdi")
        self.assertNotContains(self.client.get(f"/s/{b.slug}"), "https://example.com/git")
        self.assertContains(self.client.get(f"/s/{c.slug}"), 'href="https://example.com/git" rel="noopener noreferrer nofollow"')

    def test_onizleme_taslagi_giris_yapmis_kullaniciya_gosterir(self):
        sayfa = self.sayfa_yap("onizle-me", durum="taslak")
        self.assertEqual(self.client.get(f"/panel/sayfalar/{sayfa.pk}/onizle").status_code, 302)
        self.giris(self.izleyici)
        yanit = self.client.get(f"/panel/sayfalar/{sayfa.pk}/onizle")
        self.assertEqual(yanit.status_code, 200)
        self.assertContains(yanit, "ÖNİZLEME")
        self.assertContains(yanit, "noindex")

    def test_gorsel_yukleme_dogrulama_ve_silme(self):
        self.giris(self.editor)
        veri = {
            **SAYFA_VERISI,
            "kapak_gorseli": png_dosyasi("kapak.png"),
            "logo": png_dosyasi("logo.webp", "WEBP"),
            "yeni_gorseller": [png_dosyasi("u1.png"), png_dosyasi("u2.jpg", "JPEG")],
        }
        yanit = self.client.post("/panel/sayfalar/yeni", veri)
        self.assertEqual(yanit.status_code, 302, getattr(yanit, "context", None) and yanit.context["form"].errors)
        sayfa = KampanyaSayfasi.objects.get()
        self.assertTrue(sayfa.kapak_gorseli and sayfa.logo)
        self.assertEqual(sayfa.gorseller.count(), 2)
        self.assertTrue(DenetimKaydi.objects.filter(eylem="sayfa_olustur", ozet__contains="2 görsel").exists())
        # Görsel silme (POST)
        g = sayfa.gorseller.first()
        dosya_yolu = g.gorsel.path
        self.assertTrue(os.path.exists(dosya_yolu))
        self.assertEqual(self.client.get(f"/panel/sayfalar/{sayfa.pk}/gorsel/{g.pk}/sil").status_code, 405)
        self.assertEqual(self.client.post(f"/panel/sayfalar/{sayfa.pk}/gorsel/{g.pk}/sil").status_code, 302)
        self.assertEqual(sayfa.gorseller.count(), 1)
        self.assertFalse(os.path.exists(dosya_yolu))
        self.assertTrue(DenetimKaydi.objects.filter(eylem="sayfa_gorsel_sil").exists())

    def test_izleyici_gorsel_silemez(self):
        sayfa = self.sayfa_yap("gorsel-sil")
        g = SayfaGorseli.objects.create(sayfa=sayfa, gorsel=png_dosyasi("x.png"))
        self.giris(self.izleyici)
        self.assertEqual(self.client.post(f"/panel/sayfalar/{sayfa.pk}/gorsel/{g.pk}/sil").status_code, 403)
        self.assertEqual(SayfaGorseli.objects.count(), 1)

    def test_gecersiz_gorseller_reddedilir(self):
        self.giris(self.editor)
        from django.core.files.uploadedfile import SimpleUploadedFile

        gecersizler = {
            "gif": png_dosyasi("anim.gif", "GIF"),
            "bmp": png_dosyasi("x.bmp", "BMP"),
            "metin": SimpleUploadedFile("sahte.png", b"bu bir gorsel degil", content_type="image/png"),
            "uzanti": SimpleUploadedFile("betik.php", png_dosyasi("a.png").read(), content_type="image/png"),
            "buyuk": png_dosyasi("buyuk.png", ek_bayt=5 * 1024 * 1024 + 10),
        }
        for ad, dosya in gecersizler.items():
            with self.subTest(ad=ad):
                yanit = self.client.post("/panel/sayfalar/yeni", {**SAYFA_VERISI, "slug": f"g-{ad}", "kapak_gorseli": dosya})
                self.assertEqual(yanit.status_code, 200)
                self.assertTrue(yanit.context["form"].errors.get("kapak_gorseli"), ad)
        self.assertEqual(KampanyaSayfasi.objects.count(), 0)

    def test_gecersiz_coklu_gorsel_reddedilir(self):
        self.giris(self.editor)
        yanit = self.client.post("/panel/sayfalar/yeni", {**SAYFA_VERISI, "yeni_gorseller": [png_dosyasi("a.png"), png_dosyasi("b.gif", "GIF")]})
        self.assertEqual(yanit.status_code, 200)
        self.assertTrue(yanit.context["form"].errors.get("yeni_gorseller"))
        self.assertEqual(KampanyaSayfasi.objects.count(), 0)


class PanoTesti(TemelTest):
    def test_sayilar_ve_yaklasan(self):
        k_yakin = self.kampanya_yap("YAKIN", bitis=gelecek(3))
        self.kampanya_yap("UZAK", bitis=gelecek(60))
        self.kampanya_yap("DOLMUS", bitis=gelecek(-3))
        self.kampanya_yap("PASIF", aktif=False)
        self.qr_yap("P-A1", kampanya=k_yakin)
        self.qr_yap("P-A2", bitis=gelecek(2))
        self.qr_yap("P-A3", bitis=gelecek(-1))
        self.qr_yap("P-PAS", durum="pasif")
        self.qr_yap("P-ARS", durum="arsiv")
        self.giris(self.izleyici)
        yanit = self.client.get("/panel/")
        self.assertEqual(yanit.status_code, 200)
        self.assertEqual(dict(yanit.context["sayilar"]), {"toplam": 5, "aktif": 3, "pasif": 1, "arsiv": 1, "cop": 0})
        self.assertEqual(yanit.context["aktif_kampanya"], 2)  # YAKIN + UZAK
        self.assertEqual([k.kod for k in yanit.context["yaklasan_kampanya"]], ["YAKIN"])
        self.assertEqual(sorted(q.kisa_kod for q in yanit.context["yaklasan_qr"]), ["P-A1", "P-A2"])
        self.assertEqual([q.kisa_kod for q in yanit.context["dolmus_qr"]], ["P-A3"])
        self.assertEqual([k.kod for k in yanit.context["dolmus_kampanya"]], ["DOLMUS"])

    def test_yedek_durumu(self):
        self.giris(self.izleyici)
        with tempfile.TemporaryDirectory() as dizin:
            yol = os.path.join(dizin, "durum.json")
            with override_settings(YEDEK_DURUM_DOSYASI=yol):
                self.assertContains(self.client.get("/panel/"), "Henüz yedek bilgisi yok")
                with open(yol, "w", encoding="utf-8") as f:
                    json.dump({"zaman": "2026-10-14T03:00:00+03:00", "durum": "basarili", "dosya": "/yedek/qr-2026.dump", "boyut": 2048}, f)
                yanit = self.client.get("/panel/")
                self.assertContains(yanit, "2026-10-14T03:00:00+03:00")
                self.assertContains(yanit, "qr-2026.dump")
                self.assertContains(yanit, "2.0 KB")
                with open(yol, "w", encoding="utf-8") as f:
                    f.write("{bozuk")
                self.assertContains(self.client.get("/panel/"), "okunamadı")

    def test_gunluk_tablo_tarih_filtresi(self):
        qr = self.qr_yap("GUN001")
        bugun = timezone.now()
        for gun_once in (0, 1, 5):
            Tarama.objects.create(qr=qr, sonuc="yonlendi", zaman=bugun - timedelta(days=gun_once), ziyaretci_ozeti=f"z{gun_once}")
        self.giris(self.izleyici)
        d = timezone.localdate()
        yanit = self.client.get("/panel/", {"baslangic": (d - timedelta(days=2)).isoformat(), "bitis": d.isoformat()})
        self.assertEqual(yanit.context["tarama"]["insan"], 2)
        self.assertEqual(len(yanit.context["gunluk"]), 3)
        self.assertEqual(sum(g["toplam"] for g in yanit.context["gunluk"]), 2)
        # Geçersiz tarih hata vermez.
        self.assertEqual(self.client.get("/panel/?baslangic=abc&bitis=99-99").status_code, 200)

    def test_son_denetim_kayitlari_en_fazla_10(self):
        self.giris(self.editor)
        for i in range(12):
            self.client.post("/panel/urunler/yeni", {"kod": f"UD{i}", "ad": "x"})
        self.assertEqual(len(self.client.get("/panel/").context["denetim"]), 10)


class IstatistikTesti(TemelTest):
    def setUp(self):
        super().setUp()
        self.urun = __import__("qr.models", fromlist=["Urun"]).Urun.objects.create(kod="UR1", ad="Ürün bir")
        self.kampanya = self.kampanya_yap("IK1")
        self.qr1 = self.qr_yap("IST-1", kampanya=self.kampanya, urun=self.urun)
        self.qr2 = self.qr_yap("IST-2")
        simdi = timezone.now()
        # qr1: 3 insan taraması (2 farklı ziyaretçi) + 2 bot; qr2: 1 insan
        for ozet in ("a", "a", "b"):
            Tarama.objects.create(qr=self.qr1, sonuc="yonlendi", zaman=simdi, ziyaretci_ozeti=ozet)
        for ozet in ("bot1", "bot2"):
            Tarama.objects.create(qr=self.qr1, sonuc="yonlendi", zaman=simdi, bot=True, cihaz="bot", ziyaretci_ozeti=ozet)
        Tarama.objects.create(qr=self.qr2, sonuc="yonlendi", zaman=simdi, ziyaretci_ozeti="c")
        # Dünkü tarama: aynı ziyaretçi özeti farklı gün olduğu için ayrı sayılır.
        Tarama.objects.create(qr=self.qr2, sonuc="yonlendi", zaman=simdi - timedelta(days=1), ziyaretci_ozeti="c")

    def _satirlar(self, **parametre):
        self.giris(self.izleyici)
        d = timezone.localdate()
        yanit = self.client.get("/panel/rapor/istatistik", {"baslangic": (d - timedelta(days=7)).isoformat(), "bitis": d.isoformat(), **parametre})
        return yanit, {s["kod"]: s for s in yanit.context["en_cok"]}

    def test_toplam_tekil_ve_bot_ayri_sutunlar(self):
        yanit, satir = self._satirlar()
        self.assertEqual((satir["IST-1"]["toplam"], satir["IST-1"]["tekil"], satir["IST-1"]["bot"]), (3, 2, 2))
        # IST-2: bugün 1 + dün 1 = 2 tarama; aynı özet iki farklı günde 2 kez sayılır.
        self.assertEqual((satir["IST-2"]["toplam"], satir["IST-2"]["tekil"], satir["IST-2"]["bot"]), (2, 2, 0))

    def test_botlar_istenirse_toplama_dahil(self):
        _, satir = self._satirlar(bot_dahil="1")
        self.assertEqual(satir["IST-1"]["toplam"], 5)
        self.assertEqual(satir["IST-1"]["tekil"], 2)  # tekil botları hiçbir zaman içermez
        self.assertEqual(satir["IST-1"]["bot"], 2)

    def test_uyari_metni_ve_sutun_basliklari(self):
        yanit, _ = self._satirlar()
        self.assertContains(yanit, "Tahmini tekil ziyaret kesin kişi sayısı değildir; aynı kişi farklı günlerde veya farklı cihazlarla birden çok sayılabilir.")
        self.assertContains(yanit, "Toplam tarama")
        self.assertContains(yanit, "Tahmini tekil ziyaret</th>")
        self.assertContains(yanit, "Bot taraması")

    def test_kampanya_urun_magaza_bazinda(self):
        yanit, _ = self._satirlar()
        bolumler = {ad: satirlar for ad, _, satirlar, _ in yanit.context["bolumler"]}
        self.assertEqual([(s["kod"], s["toplam"]) for s in bolumler["kampanya"] if s["id"]], [("IK1", 3)])
        self.assertEqual([(s["kod"], s["toplam"]) for s in bolumler["urun"] if s["id"]], [("UR1", 3)])
        self.assertEqual({s["ad"] for s in bolumler["magaza"]}, {"(atanmamış)"})

    def test_en_cok_taranan_20_siniri(self):
        for i in range(25):
            qr = self.qr_yap(f"TOP{i:02d}", hedef=f"https://example.com/{i}")
            Tarama.objects.create(qr=qr, sonuc="yonlendi", ziyaretci_ozeti=f"t{i}")
        yanit, _ = self._satirlar()
        self.assertEqual(len(yanit.context["en_cok"]), 20)
        self.assertEqual(yanit.context["en_cok"][0]["kod"], "IST-1")

    def test_csv_disa_aktarma_bom_ve_formul_kacisi(self):
        QRKod.objects.filter(pk=self.qr2.pk).update(kisa_kod="=cmd")  # yalnızca kaçış davranışını sınamak için
        self.giris(self.izleyici)
        d = timezone.localdate()
        yanit = self.client.get("/panel/rapor/istatistik", {
            "baslangic": (d - timedelta(days=7)).isoformat(), "bitis": d.isoformat(), "tablo": "qr", "bicim": "csv",
        })
        self.assertTrue(yanit.content.startswith(b"\xef\xbb\xbf"))
        self.assertIn("text/csv", yanit["Content-Type"])
        satirlar = list(csv.reader(io.StringIO(yanit.content.decode("utf-8-sig")), delimiter=";"))
        self.assertEqual(satirlar[0], ["Kod", "Ad", "Toplam tarama (bot hariç)", "Tahmini tekil ziyaret", "Bot taraması"])
        kodlar = [s[0] for s in satirlar[1:] if s]
        self.assertIn("IST-1", kodlar)
        self.assertIn("'=cmd", kodlar)
        self.assertNotIn("=cmd", kodlar)
        self.assertTrue(any("kesin kişi sayısı değildir" in h for s in satirlar for h in s))

    def test_xlsx_disa_aktarma(self):
        self.giris(self.izleyici)
        d = timezone.localdate()
        yanit = self.client.get("/panel/rapor/istatistik", {
            "baslangic": (d - timedelta(days=7)).isoformat(), "bitis": d.isoformat(), "tablo": "kampanya", "bicim": "xlsx",
        })
        self.assertIn("spreadsheetml", yanit["Content-Type"])
        sayfa = load_workbook(io.BytesIO(yanit.content)).active
        self.assertEqual(sayfa["A1"].value, "Kod")
        self.assertEqual(sayfa["A2"].value, "IK1")
        self.assertEqual(sayfa["C2"].value, 3)


class CSPUyumluluguTesti(TemelTest):
    """Şablonlarda satır içi betik/stil olmamalı (CSP script-src/style-src 'self')."""

    def test_sayfalarda_satir_ici_betik_ve_stil_yok(self):
        qr = self.qr_yap("CSP001")
        sayfa = self.sayfa_yap("csp-sayfa", logo=png_dosyasi("l.png"), aciklama="metin")
        self.giris(self.yonetici)
        yollar = [
            "/panel/", "/panel/qr/", "/panel/qr/yeni", f"/panel/qr/{qr.pk}/", f"/panel/qr/{qr.pk}/duzenle",
            "/panel/kampanyalar/", "/panel/kampanyalar/yeni", "/panel/urunler/", "/panel/magazalar/", "/panel/sayfalar/",
            "/panel/sayfalar/yeni", f"/panel/sayfalar/{sayfa.pk}/duzenle", f"/panel/sayfalar/{sayfa.pk}/onizle",
            "/panel/ayarlar", "/panel/kullanicilar/", "/panel/kullanicilar/yeni", "/panel/denetim/",
            "/panel/rapor/istatistik", "/panel/rapor/hatali", "/s/csp-sayfa", "/k/CSP001", "/k/YOKYOKYOK",
        ]
        for yol in yollar:
            with self.subTest(yol=yol):
                icerik = self.client.get(yol).content.decode()
                self.assertNotRegex(icerik, r"<style", yol)
                self.assertNotRegex(icerik, r'\sstyle="', yol)
                self.assertNotRegex(icerik, r"<script(?![^>]*\bsrc=)", yol)
                self.assertNotRegex(icerik, r"\son[a-z]+=\"", yol)
        yanit = self.client.get("/panel/")
        self.assertIn("script-src 'self'", yanit["Content-Security-Policy"])
        self.assertContains(yanit, "/static/qr/panel.js")
        self.assertContains(yanit, "/static/qr/panel.css")
