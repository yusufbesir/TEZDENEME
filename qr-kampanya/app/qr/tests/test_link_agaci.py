"""Link ağacı (5. parça): modeller, herkese açık /l/<slug> sayfası, panel yönetimi, yetkiler, ağaç QR'ı, dar kısa link
istisnası ve gunicorn erişim günlüğü biçimi. Testlerde dış ağ KULLANILMAZ (başlık çekme TemelTest'te yamalıdır)."""
import re
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone

from qr import roller
from qr.dogrulama import guvenli_url_dogrula, kendi_l_adresi_mi
from qr.models import DenetimKaydi, GenelAyarlar, LinkAgaci, LinkAgaciGoruntuleme, LinkAgaciOgesi, QRKod, Tarama
from qr.servisler import agac_kisa_link_olustur

from .yardimci import TEST_AYARLARI, TemelTest

TELEFON = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile Safari/604.1"
BOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"


class AgacTemel(TemelTest):
    def agac_yap(self, slug="benim-linklerim", durum="yayinda", **ek):
        agac = LinkAgaci(slug=slug, baslik=ek.pop("baslik", "Linklerim"), durum=durum, **ek)
        agac.full_clean()
        agac.save()
        return agac

    def oge_yap(self, agac, qr, etiket="Site", sira=None, gorunur=True):
        if sira is None:
            sira = agac.ogeler.count()
        return LinkAgaciOgesi.objects.create(agac=agac, qr=qr, etiket=etiket, sira=sira, gorunur=gorunur)

    def sayfa(self, slug="benim-linklerim", **ek):
        ek.setdefault("HTTP_USER_AGENT", TELEFON)
        return self.client.get(f"/l/{slug}", **ek)

    def etiketler(self, agac):
        return list(agac.ogeler.order_by("sira", "id").values_list("etiket", flat=True))


class ModelTesti(AgacTemel):
    def dogrula(self, **alanlar):
        veri = dict(slug="deneme-agac", baslik="B", tema="acik", vurgu_rengi="#112233")
        veri.update(alanlar)
        LinkAgaci(**veri).full_clean()

    def test_gecerli_agac(self):
        self.dogrula()

    def test_slug_kurallari(self):
        for kotu in ("ab", "Buyuk-Harf", "-baslar", "biter-", "bosluk var", "türkçe", "a" * 65, "a/b", ""):
            with self.subTest(slug=kotu), self.assertRaises(ValidationError):
                self.dogrula(slug=kotu)
        self.dogrula(slug="abc")
        self.dogrula(slug="a" * 64)
        self.dogrula(slug="a_b-c9")

    def test_ayrilmis_slug_reddedilir_buyuk_kucuk_duyarsiz(self):
        for kelime in ("admin", "panel", "api", "giris", "static"):
            with self.subTest(kelime=kelime), self.assertRaises(ValidationError) as h:
                self.dogrula(slug=kelime)
            self.assertIn("slug", h.exception.message_dict)
        ayar = GenelAyarlar.al()
        ayar.ayrilmis_kodlar = "ozelkelime"
        ayar.save()
        with self.assertRaises(ValidationError):
            self.dogrula(slug="ozelkelime")

    def test_slug_benzersiz(self):
        self.agac_yap("ayni-ad")
        with self.assertRaises(ValidationError):
            self.dogrula(slug="ayni-ad")

    def test_renk_dogrulama(self):
        for kotu in ("red", "#12345", "#1234567", "112233", "#gggggg", "#11223g", "javascript:x", "#112233;}"):
            with self.subTest(renk=kotu), self.assertRaises(ValidationError) as h:
                self.dogrula(vurgu_rengi=kotu)
            self.assertIn("vurgu_rengi", h.exception.message_dict)
        self.dogrula(vurgu_rengi="#AbCdEf")

    def test_sondaki_satir_sonu_kabul_edilmez(self):
        with self.assertRaises(ValidationError):
            self.dogrula(slug="abc\n")
        with self.assertRaises(ValidationError):
            self.dogrula(vurgu_rengi="#112233\n")

    def test_renk_kucuk_harfe_cevrilir(self):
        agac = self.agac_yap(vurgu_rengi="#AABBCC")
        agac.refresh_from_db()
        self.assertEqual(agac.vurgu_rengi, "#aabbcc")

    def test_tema_ve_durum_secenekleri(self):
        with self.assertRaises(ValidationError):
            self.dogrula(tema="mor")
        with self.assertRaises(ValidationError):
            self.dogrula(durum="arsiv")

    def test_delete_engelli_ve_veritabani_tetikleyicisi(self):
        agac = self.agac_yap()
        with self.assertRaises(ValidationError):
            agac.delete()
        with self.assertRaises(IntegrityError), transaction.atomic():
            LinkAgaci.objects.filter(pk=agac.pk).delete()
        self.assertTrue(LinkAgaci.objects.filter(pk=agac.pk).exists())

    def test_slug_degistirilemez(self):
        agac = self.agac_yap()
        agac.slug = "yeni-adres"
        with self.assertRaises(ValidationError):
            agac.save()

    def test_oge_qr_zorunlu_ve_korumali(self):
        agac = self.agac_yap()
        with self.assertRaises(ValidationError):
            LinkAgaciOgesi(agac=agac, etiket="x").full_clean()
        qr = self.qr_yap("AGAC-QR1")
        self.oge_yap(agac, qr)
        with self.assertRaises(Exception):  # PROTECT (QR zaten silinemez; kuyruk silme de engellenir)
            with transaction.atomic():
                QRKod.objects.filter(pk=qr.pk).delete()

    def test_goruntuleme_sayaci_atomik_artar(self):
        agac = self.agac_yap()
        LinkAgaciGoruntuleme.artir(agac.pk)
        LinkAgaciGoruntuleme.artir(agac.pk)
        satir = LinkAgaciGoruntuleme.objects.get(agac=agac)
        self.assertEqual(satir.sayi, 2)
        self.assertEqual(satir.gun, timezone.localdate())
        LinkAgaciGoruntuleme.artir(agac.pk, gun=timezone.localdate() - timedelta(days=1))
        self.assertEqual(LinkAgaciGoruntuleme.objects.filter(agac=agac).count(), 2)


class HerkeseAcikSayfaTesti(AgacTemel):
    def test_yayindaki_agac_acilir_ve_noindex(self):
        self.agac_yap(aciklama="Merhaba")
        yanit = self.sayfa()
        self.assertEqual(yanit.status_code, 200)
        self.assertIn("noindex", yanit["X-Robots-Tag"])
        self.assertIn("noindex", yanit.content.decode())
        self.assertEqual(yanit["Cache-Control"], "no-store")
        self.assertIn("Linklerim", yanit.content.decode())

    def test_taslak_cop_ve_olmayan_ayni_404(self):
        self.agac_yap("taslak-agac", durum="taslak")
        self.agac_yap("cop-agac", durum="cop")
        yanitlar = [self.sayfa(s) for s in ("taslak-agac", "cop-agac", "hic-yok")]
        for y in yanitlar:
            self.assertEqual(y.status_code, 404)
            self.assertIn("noindex", y["X-Robots-Tag"])
        self.assertEqual(len({y.content for y in yanitlar}), 1)
        # stil dosyası da aynı kuralı izler
        self.assertEqual(self.client.get("/l/taslak-agac/stil.css").status_code, 404)
        self.assertEqual(self.client.get("/l/cop-agac/stil.css").status_code, 404)

    def test_dugme_hedefi_mutlak_kisa_link(self):
        agac = self.agac_yap()
        qr = self.qr_yap("DUGME01", "https://example.com/hedef")
        self.oge_yap(agac, qr, "Mağazam")
        html = self.sayfa().content.decode()
        self.assertIn(f'href="{qr.kisa_url}"', html)
        self.assertTrue(qr.kisa_url.startswith("http"))
        self.assertIn("/k/DUGME01", qr.kisa_url)
        self.assertNotIn("example.com/hedef", html)  # asıl hedef sayfada görünmez
        self.assertRegex(html, r'<a class="agac-dugme" href="[^"]+" rel="noopener">Mağazam</a>')

    def test_gizli_pasif_arsiv_cop_ve_tarih_disi_ogeler_gizlenir(self):
        agac = self.agac_yap()
        gorunen = self.qr_yap("GOR-001")
        self.oge_yap(agac, gorunen, "GORUNEN")
        self.oge_yap(agac, self.qr_yap("GIZ-001"), "GIZLENEN-OGE", gorunur=False)
        for kod, durum, etiket in (("PAS-001", "pasif", "PASIF-OGE"), ("ARS-001", "arsiv", "ARSIV-OGE"), ("COP-001", "cop", "COP-OGE")):
            qr = self.qr_yap(kod)
            QRKod.objects.filter(pk=qr.pk).update(durum=durum)
            self.oge_yap(agac, qr, etiket)
        bitmis = self.qr_yap("BIT-001", baslangic=timezone.now() - timedelta(days=5), bitis=timezone.now() - timedelta(days=1))
        self.oge_yap(agac, bitmis, "BITMIS-OGE")
        baslamamis = self.qr_yap("BAS-001", baslangic=timezone.now() + timedelta(days=1), bitis=timezone.now() + timedelta(days=5))
        self.oge_yap(agac, baslamamis, "BASLAMAMIS-OGE")
        kampanya = self.kampanya_yap("KB", bitis=timezone.now() - timedelta(hours=1), baslangic=timezone.now() - timedelta(days=3))
        self.oge_yap(agac, self.qr_yap("KAM-001", kampanya=kampanya), "KAMPANYA-BITMIS-OGE")
        html = self.sayfa().content.decode()
        self.assertIn("GORUNEN", html)
        for gizli in ("GIZLENEN-OGE", "PASIF-OGE", "ARSIV-OGE", "COP-OGE", "BITMIS-OGE", "BASLAMAMIS-OGE", "KAMPANYA-BITMIS-OGE"):
            self.assertNotIn(gizli, html)

    def test_sira_uygulanir(self):
        agac = self.agac_yap()
        self.oge_yap(agac, self.qr_yap("S-001"), "UCUNCU", sira=3)
        self.oge_yap(agac, self.qr_yap("S-002"), "BIRINCI", sira=1)
        self.oge_yap(agac, self.qr_yap("S-003"), "IKINCI", sira=2)
        html = self.sayfa().content.decode()
        self.assertLess(html.index("BIRINCI"), html.index("IKINCI"))
        self.assertLess(html.index("IKINCI"), html.index("UCUNCU"))

    def test_goruntuleme_sayaci_bot_ve_head_sayilmaz(self):
        agac = self.agac_yap()
        self.sayfa()
        self.sayfa()
        self.assertEqual(LinkAgaciGoruntuleme.objects.get(agac=agac).sayi, 2)
        self.sayfa(HTTP_USER_AGENT=BOT)
        self.client.get("/l/benim-linklerim", HTTP_USER_AGENT="")  # UA'sız = bot
        self.client.head("/l/benim-linklerim", HTTP_USER_AGENT=TELEFON)
        self.assertEqual(LinkAgaciGoruntuleme.objects.get(agac=agac).sayi, 2)

    def test_taslak_ve_404_sayilmaz(self):
        agac = self.agac_yap("taslak-agac", durum="taslak")
        self.sayfa("taslak-agac")
        self.assertFalse(LinkAgaciGoruntuleme.objects.filter(agac=agac).exists())

    def test_xss_etiket_baslik_aciklama_kacirilir(self):
        zararli = "<script>alert(1)</script>"
        agac = self.agac_yap(baslik=f"B {zararli}", aciklama=f"A {zararli}")
        self.oge_yap(agac, self.qr_yap("XSS-001"), f"E {zararli}")
        html = self.sayfa().content.decode()
        self.assertNotIn(zararli, html)
        self.assertNotIn("<script", html)
        self.assertIn("&lt;script&gt;", html)

    def test_csp_uyumlu_harici_kaynak_ve_satir_ici_stil_yok(self):
        agac = self.agac_yap(vurgu_rengi="#ff0000")
        self.oge_yap(agac, self.qr_yap("CSP-001"), "x")
        yanit = self.sayfa()
        html = yanit.content.decode()
        self.assertIn("script-src 'self'", yanit["Content-Security-Policy"])
        self.assertNotIn("<script", html)
        self.assertNotIn("style=", html)
        self.assertNotIn("<style", html)
        self.assertNotRegex(html, r"<(link|img|script)[^>]+https?://")
        self.assertIn('href="/l/benim-linklerim/stil.css"', html)

    def test_stil_dosyasi_renk_ve_okunakli_yazi(self):
        self.agac_yap(vurgu_rengi="#ff0000")
        yanit = self.client.get("/l/benim-linklerim/stil.css")
        self.assertEqual(yanit.status_code, 200)
        self.assertTrue(yanit["Content-Type"].startswith("text/css"))
        self.assertIn("--vurgu: #ff0000;", yanit.content.decode())
        self.assertIn("noindex", yanit["X-Robots-Tag"])
        self.agac_yap("acik-renk", vurgu_rengi="#ffff00")
        self.assertIn("--buton-yazi: #111111", self.client.get("/l/acik-renk/stil.css").content.decode())

    def test_tema_sinifi(self):
        self.agac_yap(tema="koyu")
        self.assertIn("tema-koyu", self.sayfa().content.decode())

    def test_hiz_siniri_429(self):
        self.agac_yap()
        with override_settings(YONLENDIRME_HIZ_SINIRI=1):
            kodlar = [self.sayfa().status_code for _ in range(3)]
        self.assertIn(429, kodlar)

    def test_post_kabul_edilmez(self):
        self.agac_yap()
        self.assertEqual(self.client.post("/l/benim-linklerim").status_code, 405)


class PanelTesti(AgacTemel):
    def setUp(self):
        super().setUp()
        self.agac = self.agac_yap(durum="taslak")

    def yol(self, ad, *args):
        return reverse(f"panel:{ad}", args=args)

    def denetim(self, eylem):
        return DenetimKaydi.objects.filter(eylem=eylem)

    # --- yetkiler ---
    def test_roller_yetkileri(self):
        yetkiler = roller.rol_yetkileri()
        self.assertIn("qr.view_linkagaci", yetkiler[roller.IZLEYICI])
        self.assertNotIn("qr.change_linkagaci", yetkiler[roller.IZLEYICI])
        for rol in (roller.EDITOR, roller.YONETICI):
            self.assertIn("qr.add_linkagaci", yetkiler[rol])
            self.assertIn("qr.change_linkagaci", yetkiler[rol])
        for rol in yetkiler.values():
            self.assertNotIn("qr.delete_linkagaci", rol)

    def test_giris_gerekir(self):
        self.assertEqual(self.client.get(self.yol("agac_liste")).status_code, 302)

    def test_izleyici_gorur_ama_degistiremez(self):
        self.giris(self.izleyici)
        self.assertEqual(self.client.get(self.yol("agac_liste")).status_code, 200)
        self.assertEqual(self.client.get(self.yol("agac_detay", self.agac.pk)).status_code, 200)
        self.assertEqual(self.client.get(self.yol("agac_onizle", self.agac.pk)).status_code, 200)
        self.assertEqual(self.client.get(self.yol("agac_png", self.agac.pk)).status_code, 200)
        self.assertEqual(self.client.get(self.yol("agac_olustur")).status_code, 403)
        self.assertEqual(self.client.get(self.yol("agac_duzenle", self.agac.pk)).status_code, 403)
        qr = self.qr_yap("IZL-001")
        ogeler = self.oge_yap(self.agac, qr)
        for ad, args, veri in (
            ("agac_olustur", (), {"slug": "yeni-agac", "baslik": "x", "tema": "acik", "vurgu_rengi": "#112233", "durum": "taslak"}),
            ("agac_durum", (self.agac.pk,), {"durum": "yayinda"}),
            ("agac_cope_tasi", (self.agac.pk,), {}),
            ("agac_geri_yukle", (self.agac.pk,), {}),
            ("agac_kisa_link", (self.agac.pk,), {}),
            ("agac_oge_ekle", (self.agac.pk,), {"qr": qr.pk}),
            ("agac_oge_cikar", (self.agac.pk, ogeler.pk), {}),
            ("agac_oge_tasi", (self.agac.pk, ogeler.pk), {"yon": "asagi"}),
            ("agac_oge_duzenle", (self.agac.pk, ogeler.pk), {"gorunur": "0"}),
        ):
            with self.subTest(ad=ad):
                self.assertEqual(self.client.post(self.yol(ad, *args), veri).status_code, 403)
        self.assertEqual(LinkAgaci.objects.count(), 1)
        self.agac.refresh_from_db()
        self.assertEqual(self.agac.durum, "taslak")
        self.assertEqual(self.agac.ogeler.count(), 1)

    def test_izleyici_detayda_duzenleme_dugmesi_yok(self):
        self.giris(self.izleyici)
        html = self.client.get(self.yol("agac_detay", self.agac.pk)).content.decode()
        self.assertNotIn(self.yol("agac_cope_tasi", self.agac.pk), html)
        self.assertNotIn(self.yol("agac_oge_ekle", self.agac.pk), html)

    def test_menude_gorunur(self):
        self.giris(self.izleyici)
        self.assertIn("Link ağaçları", self.client.get(self.yol("ana")).content.decode())

    # --- oluştur / düzenle ---
    def test_olustur(self):
        self.giris(self.editor)
        yanit = self.client.post(self.yol("agac_olustur"), {
            "slug": "Yeni-Agac", "baslik": "Yeni", "aciklama": "kısa", "tema": "koyu", "vurgu_rengi": "#A1B2C3", "durum": "taslak",
        })
        agac = LinkAgaci.objects.get(slug="yeni-agac")
        self.assertRedirects(yanit, self.yol("agac_detay", agac.pk))
        self.assertEqual((agac.vurgu_rengi, agac.tema, agac.olusturan), ("#a1b2c3", "koyu", self.editor))
        self.assertTrue(self.denetim("agac_olustur").filter(nesne_id=str(agac.pk)).exists())

    def test_olustur_ayrilmis_ve_gecersiz_renk_reddedilir(self):
        self.giris(self.editor)
        baz = {"baslik": "x", "tema": "acik", "vurgu_rengi": "#112233", "durum": "taslak"}
        yanit = self.client.post(self.yol("agac_olustur"), {**baz, "slug": "admin"})
        self.assertEqual(yanit.status_code, 200)
        self.assertIn("ayrılmış", yanit.content.decode())
        yanit = self.client.post(self.yol("agac_olustur"), {**baz, "slug": "renkli-agac", "vurgu_rengi": "kirmizi"})
        self.assertEqual(yanit.status_code, 200)
        self.assertFalse(LinkAgaci.objects.filter(slug__in=["admin", "renkli-agac"]).exists())

    def test_olustur_cop_durumu_formdan_secilemez(self):
        self.giris(self.editor)
        yanit = self.client.post(self.yol("agac_olustur"), {
            "slug": "cop-deneme", "baslik": "x", "tema": "acik", "vurgu_rengi": "#112233", "durum": "cop",
        })
        self.assertEqual(yanit.status_code, 200)
        self.assertFalse(LinkAgaci.objects.filter(slug="cop-deneme").exists())

    def test_ayni_slug_tekrar_reddedilir(self):
        self.giris(self.editor)
        yanit = self.client.post(self.yol("agac_olustur"), {
            "slug": self.agac.slug, "baslik": "x", "tema": "acik", "vurgu_rengi": "#112233", "durum": "taslak",
        })
        self.assertEqual(yanit.status_code, 200)
        self.assertEqual(LinkAgaci.objects.count(), 1)

    def test_duzenle_slug_degismez_ve_denetim(self):
        self.giris(self.editor)
        yanit = self.client.post(self.yol("agac_duzenle", self.agac.pk), {
            "slug": "baska-slug", "baslik": "Yeni başlık", "aciklama": "", "tema": "koyu", "vurgu_rengi": "#00ff00", "durum": "yayinda",
        })
        self.assertRedirects(yanit, self.yol("agac_detay", self.agac.pk))
        self.agac.refresh_from_db()
        self.assertEqual((self.agac.slug, self.agac.baslik, self.agac.tema, self.agac.durum), ("benim-linklerim", "Yeni başlık", "koyu", "yayinda"))
        self.assertTrue(self.denetim("agac_duzenle").exists())
        self.assertTrue(self.denetim("agac_durum_degistir").exists())

    def test_cop_agac_duzenlenemez(self):
        self.giris(self.editor)
        self.client.post(self.yol("agac_cope_tasi", self.agac.pk))
        yanit = self.client.post(self.yol("agac_duzenle", self.agac.pk), {
            "slug": self.agac.slug, "baslik": "Degisti", "tema": "acik", "vurgu_rengi": "#112233", "durum": "yayinda",
        })
        self.assertEqual(yanit.status_code, 302)
        self.agac.refresh_from_db()
        self.assertEqual((self.agac.baslik, self.agac.durum), ("Linklerim", "cop"))

    # --- durum / çöp ---
    def test_yayinla_ve_taslaga_al(self):
        self.giris(self.editor)
        self.client.post(self.yol("agac_durum", self.agac.pk), {"durum": "yayinda"})
        self.assertEqual(self.sayfa().status_code, 200)
        self.client.post(self.yol("agac_durum", self.agac.pk), {"durum": "taslak"})
        self.assertEqual(self.sayfa().status_code, 404)
        self.assertEqual(self.denetim("agac_durum_degistir").count(), 2)
        self.client.post(self.yol("agac_durum", self.agac.pk), {"durum": "cop"})  # doğrudan çöp reddedilir
        self.agac.refresh_from_db()
        self.assertEqual(self.agac.durum, "taslak")

    def test_cope_tasi_ve_geri_yukle(self):
        self.giris(self.editor)
        self.client.post(self.yol("agac_durum", self.agac.pk), {"durum": "yayinda"})
        self.client.post(self.yol("agac_cope_tasi", self.agac.pk))
        self.agac.refresh_from_db()
        self.assertEqual((self.agac.durum, self.agac.onceki_durum), ("cop", "yayinda"))
        self.assertIsNotNone(self.agac.cope_atilma)
        self.assertEqual(self.sayfa().status_code, 404)
        self.assertTrue(LinkAgaci.objects.filter(pk=self.agac.pk).exists())  # silinmedi
        # varsayılan listede yok, çöp filtresinde var
        self.assertNotIn(self.agac, list(self.client.get(self.yol("agac_liste")).context["sayfa"]))
        self.assertIn(self.agac, list(self.client.get(self.yol("agac_liste"), {"durum": "cop"}).context["sayfa"]))
        # çöpteki ağacın durumu durum uç noktasıyla değişmez
        self.client.post(self.yol("agac_durum", self.agac.pk), {"durum": "yayinda"})
        self.agac.refresh_from_db()
        self.assertEqual(self.agac.durum, "cop")
        self.client.post(self.yol("agac_geri_yukle", self.agac.pk))
        self.agac.refresh_from_db()
        self.assertEqual((self.agac.durum, self.agac.onceki_durum, self.agac.cope_atilma), ("yayinda", "", None))
        self.assertEqual(self.sayfa().status_code, 200)
        self.assertTrue(self.denetim("agac_cope_tasi").exists())
        self.assertTrue(self.denetim("agac_copten_geri_yukle").exists())

    def test_kalici_silme_ucu_yok(self):
        self.giris(self.yonetici)
        for yol in ("sil", "kalici-sil", "delete"):
            self.assertEqual(self.client.post(f"/panel/link-agaclari/{self.agac.pk}/{yol}").status_code, 404)
        self.assertTrue(LinkAgaci.objects.filter(pk=self.agac.pk).exists())

    # --- öğeler ---
    def test_var_olan_qr_eklenir(self):
        self.giris(self.editor)
        qr = self.qr_yap("VAR-001", baslik="Var olan başlık")
        yanit = self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {"qr": qr.pk, "etiket": "  Benim   düğmem "})
        self.assertRedirects(yanit, self.yol("agac_detay", self.agac.pk))
        oge = self.agac.ogeler.get()
        self.assertEqual((oge.qr, oge.etiket, oge.sira, oge.gorunur), (qr, "Benim düğmem", 0, True))
        self.assertTrue(self.denetim("agac_oge_ekle").exists())

    def test_etiket_bos_ise_qr_basligi(self):
        self.giris(self.editor)
        qr = self.qr_yap("VAR-002", baslik="Varsayılan başlık")
        self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {"qr": qr.pk})
        self.assertEqual(self.agac.ogeler.get().etiket, "Varsayılan başlık")

    def test_cop_ve_arsiv_qr_eklenemez(self):
        self.giris(self.editor)
        for durum in ("cop", "arsiv"):
            qr = self.qr_yap(f"X-{durum}")
            QRKod.objects.filter(pk=qr.pk).update(durum=durum)
            self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {"qr": qr.pk})
        self.assertEqual(self.agac.ogeler.count(), 0)

    def test_url_ile_ekleme_yeni_link_turu_kisa_link_olusturur(self):
        self.giris(self.editor)
        onceki = QRKod.objects.count()
        self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {"url": "https://example.org/sayfa", "etiket": "Örnek"})
        self.assertEqual(QRKod.objects.count(), onceki + 1)
        oge = self.agac.ogeler.get()
        qr = oge.qr
        self.assertEqual((qr.tur, qr.hedef_turu, qr.hedef_url, qr.durum), ("link", "harici", "https://example.org/sayfa", "aktif"))
        self.assertEqual(oge.etiket, "Örnek")
        self.assertEqual(qr.olusturan, self.editor)
        self.assertTrue(self.denetim("qr_olustur").filter(nesne_id=str(qr.pk)).exists())
        self.assertTrue(qr.hedef_gecmisi.exists())
        # düğme gerçekten kısa linke gider ve tıklama sayılır
        self.agac.durum = "yayinda"
        self.agac.save()
        self.assertIn(f'href="{qr.kisa_url}"', self.sayfa().content.decode())
        self.client.get(f"/k/{qr.kisa_kod}", HTTP_USER_AGENT=TELEFON)
        self.assertEqual(Tarama.objects.filter(qr=qr, bot=False).count(), 1)

    def test_url_semasiz_https_varsayilir(self):
        self.giris(self.editor)
        self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {"url": "example.org/yol"})
        self.assertEqual(self.agac.ogeler.get().qr.hedef_url, "https://example.org/yol")

    def test_ssrf_ozel_ip_ve_gecersiz_url_reddedilir(self):
        self.giris(self.editor)
        onceki = QRKod.objects.count()
        for url in (
            "http://127.0.0.1/", "http://localhost/x", "http://10.0.0.5/", "http://192.168.1.1/", "http://169.254.169.254/latest/meta-data/",
            "http://[::1]/", "http://100.64.0.1/", "http://sunucu.local/", "ftp://example.com/", "javascript:alert(1)",
            "http://user:pass@example.com/",
        ):
            with self.subTest(url=url):
                yanit = self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {"url": url}, follow=True)
                self.assertEqual(yanit.status_code, 200)
        self.assertEqual(QRKod.objects.count(), onceki)
        self.assertEqual(self.agac.ogeler.count(), 0)

    def test_qr_ve_url_birlikte_veya_hicbiri_reddedilir(self):
        self.giris(self.editor)
        qr = self.qr_yap("IKI-001")
        self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {"qr": qr.pk, "url": "https://example.org/"})
        self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {})
        self.assertEqual(self.agac.ogeler.count(), 0)

    def test_url_ile_ekleme_qr_ekleme_yetkisi_ister(self):
        from django.contrib.auth.models import Permission

        k = self.kullanici_olustur("sadece-agac", None)
        k.user_permissions.add(*Permission.objects.filter(codename__in=["view_linkagaci", "change_linkagaci"]))
        self.giris(k)
        onceki = QRKod.objects.count()
        self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {"url": "https://example.org/"})
        self.assertEqual(QRKod.objects.count(), onceki)
        self.assertEqual(self.agac.ogeler.count(), 0)

    def test_ayni_hedef_uyarisi_onay_ister(self):
        self.giris(self.editor)
        self.qr_yap("ESKI-01", "https://example.org/ayni")
        self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {"url": "https://example.org/ayni"})
        self.assertEqual(self.agac.ogeler.count(), 0)
        self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {"url": "https://example.org/ayni", "ayni_hedef_onay": "on"})
        self.assertEqual(self.agac.ogeler.count(), 1)

    def test_oge_siniri(self):
        from qr.servisler import LINK_AGACI_EN_FAZLA_OGE

        qr = self.qr_yap("LIM-001")
        for i in range(LINK_AGACI_EN_FAZLA_OGE):
            self.oge_yap(self.agac, qr, f"o{i}")
        self.giris(self.editor)
        self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {"qr": qr.pk})
        self.assertEqual(self.agac.ogeler.count(), LINK_AGACI_EN_FAZLA_OGE)

    def test_siralama_yukari_asagi(self):
        self.giris(self.editor)
        ogeler = [self.oge_yap(self.agac, self.qr_yap(f"SR-{i}"), e) for i, e in enumerate(("A", "B", "C"))]
        self.client.post(self.yol("agac_oge_tasi", self.agac.pk, ogeler[2].pk), {"yon": "yukari"})
        self.assertEqual(self.etiketler(self.agac), ["A", "C", "B"])
        self.client.post(self.yol("agac_oge_tasi", self.agac.pk, ogeler[0].pk), {"yon": "asagi"})
        self.assertEqual(self.etiketler(self.agac), ["C", "A", "B"])
        # sınırda hiçbir şey olmaz
        self.client.post(self.yol("agac_oge_tasi", self.agac.pk, ogeler[1].pk), {"yon": "asagi"})  # B zaten sonda
        self.client.post(self.yol("agac_oge_tasi", self.agac.pk, ogeler[2].pk), {"yon": "yukari"})  # C zaten başta
        self.client.post(self.yol("agac_oge_tasi", self.agac.pk, ogeler[2].pk), {"yon": "yanlis"})
        self.assertEqual(self.etiketler(self.agac), ["C", "A", "B"])
        self.assertEqual(list(self.agac.ogeler.order_by("sira").values_list("sira", flat=True)), [0, 1, 2])
        self.assertTrue(self.denetim("agac_oge_sirala").exists())

    def test_ayni_sira_numarali_ogeler_deterministik_tasinir(self):
        self.giris(self.editor)
        a = self.oge_yap(self.agac, self.qr_yap("EP-1"), "A", sira=0)
        b = self.oge_yap(self.agac, self.qr_yap("EP-2"), "B", sira=0)
        self.client.post(self.yol("agac_oge_tasi", self.agac.pk, b.pk), {"yon": "yukari"})
        self.assertEqual(self.etiketler(self.agac), ["B", "A"])
        self.assertEqual(a.pk, self.agac.ogeler.order_by("-sira").first().pk)

    def test_gorunur_yap_ve_etiket_degistir(self):
        self.giris(self.editor)
        self.agac.durum = "yayinda"
        self.agac.save()
        oge = self.oge_yap(self.agac, self.qr_yap("GY-001"), "ESKI-YAZI")
        self.client.post(self.yol("agac_oge_duzenle", self.agac.pk, oge.pk), {"gorunur": "0"})
        self.assertNotIn("ESKI-YAZI", self.sayfa().content.decode())
        self.client.post(self.yol("agac_oge_duzenle", self.agac.pk, oge.pk), {"gorunur": "1", "etiket": "YENI-YAZI"})
        self.assertIn("YENI-YAZI", self.sayfa().content.decode())
        self.client.post(self.yol("agac_oge_duzenle", self.agac.pk, oge.pk), {"etiket": "   "})
        oge.refresh_from_db()
        self.assertEqual(oge.etiket, "YENI-YAZI")
        self.assertTrue(self.denetim("agac_oge_duzenle").exists())

    def test_oge_cikar_qr_silinmez(self):
        self.giris(self.editor)
        qr = self.qr_yap("CK-001")
        a, b = self.oge_yap(self.agac, qr, "A"), self.oge_yap(self.agac, self.qr_yap("CK-002"), "B")
        self.client.post(self.yol("agac_oge_cikar", self.agac.pk, a.pk))
        self.assertEqual(self.etiketler(self.agac), ["B"])
        self.assertEqual(self.agac.ogeler.get().sira, 0)
        self.assertTrue(QRKod.objects.filter(pk=qr.pk).exists())
        self.assertTrue(self.denetim("agac_oge_sil").exists())

    def test_baska_agacin_ogesine_dokunulamaz(self):
        self.giris(self.editor)
        diger = self.agac_yap("diger-agac")
        oge = self.oge_yap(diger, self.qr_yap("BA-001"), "DIGER")
        self.assertEqual(self.client.post(self.yol("agac_oge_cikar", self.agac.pk, oge.pk)).status_code, 404)
        self.assertEqual(self.client.post(self.yol("agac_oge_tasi", self.agac.pk, oge.pk), {"yon": "asagi"}).status_code, 404)
        self.assertEqual(self.client.post(self.yol("agac_oge_duzenle", self.agac.pk, oge.pk), {"etiket": "x"}).status_code, 404)
        self.assertEqual(diger.ogeler.count(), 1)

    def test_servis_cop_agaca_oge_eklemez(self):
        from qr.servisler import agac_oge_ekle

        LinkAgaci.objects.filter(pk=self.agac.pk).update(durum="cop")
        with self.assertRaises(ValidationError):
            agac_oge_ekle(self.agac, self.qr_yap("CS-001"), "x", None)  # bayat nesne taslak sanır, kilitli satır çöp
        self.assertEqual(self.agac.ogeler.count(), 0)

    def test_cop_agacta_oge_degisikligi_yapilamaz(self):
        self.giris(self.editor)
        oge = self.oge_yap(self.agac, self.qr_yap("CA-001"), "A")
        self.client.post(self.yol("agac_cope_tasi", self.agac.pk))
        qr2 = self.qr_yap("CA-002")
        self.client.post(self.yol("agac_oge_ekle", self.agac.pk), {"qr": qr2.pk})
        self.client.post(self.yol("agac_oge_cikar", self.agac.pk, oge.pk))
        self.assertEqual(self.etiketler(self.agac), ["A"])

    # --- detay / istatistik / önizleme ---
    def test_detay_istatistik_goruntuleme_ve_tiklama(self):
        self.giris(self.editor)
        qr = self.qr_yap("ST-001")
        self.oge_yap(self.agac, qr, "A")
        for _ in range(3):
            Tarama.objects.create(qr=qr, sonuc="yonlendi", cihaz="mobil", bot=False)
        Tarama.objects.create(qr=qr, sonuc="yonlendi", cihaz="bot", bot=True)
        bugun = timezone.localdate()
        LinkAgaciGoruntuleme.objects.create(agac=self.agac, gun=bugun, sayi=5)
        LinkAgaciGoruntuleme.objects.create(agac=self.agac, gun=bugun - timedelta(days=2), sayi=4)
        LinkAgaciGoruntuleme.objects.create(agac=self.agac, gun=bugun - timedelta(days=90), sayi=10)
        yanit = self.client.get(self.yol("agac_detay", self.agac.pk))
        self.assertEqual(yanit.context["toplam_goruntuleme"], 19)
        self.assertEqual(yanit.context["son_30_gun"], 9)
        self.assertEqual(yanit.context["ogeler"][0].tiklama, 3)  # bot hariç QR tarama sayısı
        html = yanit.content.decode()
        self.assertIn("<svg", html)
        self.assertIn("görüntüleme sayısı", html)
        self.assertNotIn("<script>", html)  # satır içi betik yok (yalnızca harici panel.js)

    def test_detay_xss_kacirilir(self):
        self.giris(self.editor)
        zararli = "<script>alert(1)</script>"
        agac = self.agac_yap("xss-panel", baslik=zararli, aciklama=zararli)
        self.oge_yap(agac, self.qr_yap("XP-001"), zararli)
        html = self.client.get(self.yol("agac_detay", agac.pk)).content.decode()
        self.assertNotIn(zararli, html)

    def test_detayda_gizlilik_nedeni(self):
        self.giris(self.editor)
        qr = self.qr_yap("NE-001")
        QRKod.objects.filter(pk=qr.pk).update(durum="pasif")
        self.oge_yap(self.agac, qr, "A")
        oge = self.client.get(self.yol("agac_detay", self.agac.pk)).context["ogeler"][0]
        self.assertFalse(oge.herkese_acik)

    def test_onizleme_taslagi_gosterir_sayac_artmaz(self):
        self.giris(self.editor)
        self.oge_yap(self.agac, self.qr_yap("ON-001"), "ONIZLE-OGE")
        yanit = self.client.get(self.yol("agac_onizle", self.agac.pk), HTTP_USER_AGENT=TELEFON)
        self.assertEqual(yanit.status_code, 200)
        html = yanit.content.decode()
        self.assertIn("ONIZLE-OGE", html)
        self.assertIn("ÖNİZLEME", html)
        self.assertIn(self.yol("agac_stil", self.agac.pk), html)
        self.assertFalse(LinkAgaciGoruntuleme.objects.exists())
        self.assertIn("--vurgu:", self.client.get(self.yol("agac_stil", self.agac.pk)).content.decode())

    def test_onizleme_giris_ister(self):
        self.assertEqual(self.client.get(self.yol("agac_onizle", self.agac.pk)).status_code, 302)
        self.assertEqual(self.client.get(self.yol("agac_stil", self.agac.pk)).status_code, 302)

    # --- ağaç QR'ı ve kısa link ---
    def test_agac_qr_png_ve_svg(self):
        self.giris(self.izleyici)
        png = self.client.get(self.yol("agac_png", self.agac.pk))
        self.assertEqual(png["Content-Type"], "image/png")
        self.assertTrue(png.content.startswith(b"\x89PNG"))
        svg = self.client.get(self.yol("agac_svg", self.agac.pk), {"indir": "1"})
        self.assertEqual(svg["Content-Type"], "image/svg+xml")
        self.assertIn("<svg", svg.content.decode())
        self.assertIn("attachment", svg["Content-Disposition"])
        self.assertIn("agac-benim-linklerim.svg", svg["Content-Disposition"])

    def test_agac_qr_icerigi_mutlak_agac_adresi(self):
        from unittest import mock

        self.giris(self.editor)
        with mock.patch("qr.panel.link_agaci.qr_png", return_value=b"\x89PNG-sahte") as m:
            self.client.get(self.yol("agac_png", self.agac.pk))
        m.assert_called_once_with(self.agac.mutlak_url)
        self.assertTrue(self.agac.mutlak_url.endswith("/l/benim-linklerim"))
        self.assertTrue(self.agac.mutlak_url.startswith("http"))

    def test_cop_agac_qr_404(self):
        self.giris(self.editor)
        self.client.post(self.yol("agac_cope_tasi", self.agac.pk))
        self.assertEqual(self.client.get(self.yol("agac_png", self.agac.pk)).status_code, 404)

    def test_agac_icin_kisa_link_olusturur(self):
        self.giris(self.editor)
        yanit = self.client.post(self.yol("agac_kisa_link", self.agac.pk))
        qr = QRKod.objects.get(tur="link", hedef_url=self.agac.mutlak_url)
        self.assertRedirects(yanit, self.yol("qr_detay", qr.pk))
        self.assertEqual((qr.hedef_turu, qr.durum), ("harici", "aktif"))
        self.assertTrue(self.denetim("agac_kisa_link").exists())
        self.assertTrue(self.denetim("qr_olustur").filter(nesne_id=str(qr.pk)).exists())

    @override_settings(KISA_URL_TABANI="http://localhost:8000")
    def test_kisa_link_yerel_tabanda_da_calisir_ve_yonlendirir(self):
        """guvenli_url_dogrula yerel adresleri reddeder; kendi /l/<slug> adresi için dar istisna vardır."""
        self.giris(self.editor)
        self.client.post(self.yol("agac_kisa_link", self.agac.pk))
        qr = QRKod.objects.get(tur="link")
        self.assertEqual(qr.hedef_url, "http://localhost:8000/l/benim-linklerim")
        yanit = self.client.get(f"/k/{qr.kisa_kod}", HTTP_USER_AGENT=TELEFON)
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(yanit["Location"], "http://localhost:8000/l/benim-linklerim")

    def test_cop_agac_icin_kisa_link_olusmaz(self):
        self.giris(self.editor)
        self.client.post(self.yol("agac_cope_tasi", self.agac.pk))
        self.client.post(self.yol("agac_kisa_link", self.agac.pk))
        self.assertFalse(QRKod.objects.filter(tur="link").exists())

    def test_servis_baska_hedefe_kisa_link_vermez(self):
        from unittest import mock

        with mock.patch.object(LinkAgaci, "mutlak_url", new="https://example.com/panel/"), self.assertRaises(ValidationError):
            agac_kisa_link_olustur(self.agac, None)


class DarIstisnaTesti(TemelTest):
    """guvenli_url_dogrula'nın kendi /l/<slug> istisnası YALNIZCA o yola izin verir."""

    @override_settings(KISA_URL_TABANI="http://localhost:8000")
    def test_yalniz_l_yolu_yerel_tabanda_kabul(self):
        guvenli_url_dogrula("http://localhost:8000/l/benim-linklerim")
        for kotu in (
            "http://localhost:8000/panel/", "http://localhost:8000/panel/qr/", "http://localhost:8000/k/ABC123",
            "http://localhost:8000/s/sayfa", "http://localhost:8000/api/v1/", "http://localhost:8000/",
            "http://localhost:8000/l/", "http://localhost:8000/l/ab", "http://localhost:8000/l/ABC-buyuk",
            "http://localhost:8000/l/abc/", "http://localhost:8000/l/abc/stil.css", "http://localhost:8000/l/abc?x=1",
            "http://localhost:8000/l/abc#x", "http://localhost:8000/l/abc?", "http://localhost:8000/l/../panel/",
            "http://localhost:8000/l/abc/../../panel/", "http://localhost:8001/l/abc", "http://localhost/l/abc",
            "https://localhost:8000/l/abc", "http://kullanici@localhost:8000/l/abc", "http://127.0.0.1:8000/l/abc",
            "http://localhost:8000/l/abc\\x", "http://localhost:8000/L/abc",
        ):
            with self.subTest(url=kotu), self.assertRaises(ValidationError):
                guvenli_url_dogrula(kotu)

    @override_settings(KISA_URL_TABANI="http://localhost:8000")
    def test_istisna_yardimcisi(self):
        self.assertFalse(kendi_l_adresi_mi("http://localhost:8000/l/abc\n"))
        self.assertTrue(kendi_l_adresi_mi("http://localhost:8000/l/abc"))
        self.assertTrue(kendi_l_adresi_mi("HTTP://LOCALHOST:8000/l/abc"))
        self.assertFalse(kendi_l_adresi_mi("http://localhost:8000/panel/"))
        self.assertFalse(kendi_l_adresi_mi("http://localhost:8000/k/abc"))
        self.assertFalse(kendi_l_adresi_mi(None))

    def test_genel_kural_degismedi(self):
        for url in ("http://127.0.0.1/", "http://localhost:9999/l/abc", "http://10.0.0.1/l/abc"):
            with self.subTest(url=url), self.assertRaises(ValidationError):
                guvenli_url_dogrula(url)
        guvenli_url_dogrula("https://example.com/panel/")

    @override_settings(KISA_URL_TABANI="http://localhost:8000")
    def test_panel_formu_yerel_panel_hedefini_reddeder(self):
        giris = self.giris(self.editor)
        for hedef in ("http://localhost:8000/panel/", "http://localhost:8000/k/ABC123"):
            yanit = giris.post("/panel/kisalt/", {"hedef_url": hedef})
            self.assertEqual(yanit.status_code, 200, hedef)
        self.assertFalse(QRKod.objects.filter(tur="link").exists())


class GunicornGunlukBicimiTesti(TemelTest):
    def test_dockerfile_access_logformat_referer_ua_sorgu_icermez(self):
        yol = Path(__file__).resolve().parents[2] / "Dockerfile"
        if not yol.is_file():  # Docker içinde testte /app/Dockerfile bulunmayabilir
            self.skipTest("Dockerfile bulunamadı")
        metin = yol.read_text(encoding="utf-8")
        import json

        cmd_satiri = [s for s in metin.splitlines() if s.startswith("CMD ")]
        self.assertEqual(len(cmd_satiri), 1, "CMD tek satır olmalı (satır sonu devamı yoksa Dockerfile kırılır)")
        komut = json.loads(cmd_satiri[0][4:])  # geçerli JSON exec biçimi
        self.assertIn("--access-logformat", komut)
        bicim = komut[komut.index("--access-logformat") + 1]
        self.assertNotIn("[", bicim)  # %(t)s zaten köşeli parantezlidir
        self.assertNotIn("%(f)s", bicim)   # Referer
        self.assertNotIn("%(a)s", bicim)   # User-Agent
        self.assertNotIn("%(q)s", bicim)   # sorgu dizesi
        self.assertNotIn("%(r)s", bicim)   # istek satırı sorguyu içerir
        self.assertNotIn("%(h)s", bicim)   # uzak adres
        self.assertIn("%(U)s", bicim)      # yalnızca yol
        self.assertIn("--access-logfile", metin)
