"""YOURLS'ten eksik özellikler (4. parça): yönlendiren alan adı, isteğe bağlı GeoIP ülkesi, zaman grafikleri,
`/k/<kod>+` istatistik sayfası ve küçük düzeltmeler (Unicode rakam, kayıt anında kilit)."""
import sys
import tempfile
from datetime import datetime, timedelta
from datetime import timezone as utc
from unittest import mock
from zoneinfo import ZoneInfo

from django.conf import settings
from django.forms.models import model_to_dict
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone

from qr import grafik, tarama_bilgisi
from qr.models import GenelAyarlar, QRKod, Tarama
from qr.panel import qrler
from qr.servisler import qr_cope_tasi, qr_kaydet

from .yardimci import TEST_AYARLARI, TemelTest

IST = ZoneInfo("Europe/Istanbul")
UA_MOBIL = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"


class SahteOkuyucu:
    def __init__(self, sonuc):
        self.sonuc = sonuc
        self.sorgular = []

    def get(self, ip):
        self.sorgular.append(ip)
        return self.sonuc


class Temel4(TemelTest):
    def setUp(self):
        super().setUp()
        tarama_bilgisi.sifirla()
        self.addCleanup(tarama_bilgisi.sifirla)

    def tara(self, kod="TEST01", **ek):
        basliklar = {"HTTP_USER_AGENT": UA_MOBIL, "HTTP_X_FORWARDED_FOR": "203.0.113.5"}
        basliklar.update(ek)
        return self.client.get(f"/k/{kod}", **basliklar)

    def tarama_kaydi(self, **ek):
        Tarama.objects.create(**{"sonuc": "yonlendi", "cihaz": "mobil", **ek})

    def ayar(self, **alanlar):
        a = GenelAyarlar.al()
        for k, v in alanlar.items():
            setattr(a, k, v)
        a.save()


# --- 1. Yönlendiren alan adı ---

class YonlendirenTesti(Temel4):
    def test_yalniz_alan_adi_saklanir_yol_ve_sorgu_degil(self):
        self.qr_yap("TEST01")
        yanit = self.tara(HTTP_REFERER="https://Www.Ornek-Site.COM:8443/gizli/yol?token=abc123&x=1#parca")
        self.assertEqual(yanit.status_code, 302)
        t = Tarama.objects.get()
        self.assertEqual(t.yonlendiren, "www.ornek-site.com")  # küçük harf, www. atılmaz, port yok
        tum = str(model_to_dict(t))
        for sizinti in ("gizli", "token", "abc123", "8443", "parca", "https"):
            self.assertNotIn(sizinti, tum)

    def test_kullanici_bilgisi_atilir(self):
        self.assertEqual(tarama_bilgisi.yonlendiren_alan_adi("http://kullanici:parola@site.example/x"), "site.example")

    def test_kendi_alan_adi_bos(self):
        self.qr_yap("TEST01")
        site = settings.SITE_ALAN_ADI
        for referer in (f"https://{site}/panel/qr/", "http://testserver/baska", f"https://{site.upper()}:443/"):
            self.tara(HTTP_REFERER=referer)
        self.assertEqual(set(Tarama.objects.values_list("yonlendiren", flat=True)), {""})

    def test_gecersiz_referer_bos(self):
        gecersiz = [
            "", "javascript:alert(1)", "ftp://dosya.example/x", "veri metin", "http://", "https:///yol", "//site.example/x",
            "http://10.0.0.1/a", "http://[::1]:8000/x", "http://localhost/x", "http://a_b..c/x", "http://-bozuk-.example/",
            "http://" + "a" * 70 + ".example/", "http://" + ".".join(["abcdefghij"] * 30) + "/", "http://[bozuk/x",
        ]
        for referer in gecersiz:
            self.assertEqual(tarama_bilgisi.yonlendiren_alan_adi(referer), "", referer)

    def test_gecersiz_referer_yonlendirmeyi_bozmaz(self):
        self.qr_yap("TEST01")
        yanit = self.tara(HTTP_REFERER="http://[bozuk/x")
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(Tarama.objects.get().yonlendiren, "")

    def test_idn_punycode_olur(self):
        self.assertEqual(tarama_bilgisi.yonlendiren_alan_adi("https://bücher.example/x"), "xn--bcher-kva.example")

    def test_ua_ve_ip_saklanmaz(self):
        self.qr_yap("TEST01")
        self.tara(HTTP_REFERER="https://site.example/a")
        degerler = str(model_to_dict(Tarama.objects.get()))
        self.assertNotIn("203.0.113.5", degerler)
        self.assertNotIn("iPhone", degerler)
        self.assertNotIn("Mozilla", degerler)
        alanlar = {f.name for f in Tarama._meta.get_fields()}
        self.assertFalse(alanlar & {"ip", "ip_adresi", "user_agent", "ua", "referer", "referrer"})


# --- 2. GeoIP ---

class GeoIPTesti(Temel4):
    def test_ayar_bos_ulke_bos(self):
        self.qr_yap("TEST01")
        with override_settings(GEOIP_VERITABANI=""):
            self.assertEqual(self.tara().status_code, 302)
        self.assertEqual(Tarama.objects.get().ulke, "")

    def test_dosya_yok_hata_yok(self):
        self.qr_yap("TEST01")
        with override_settings(GEOIP_VERITABANI="/yok/boyle/dosya.mmdb"):
            self.assertEqual(self.tara().status_code, 302)
            self.assertEqual(self.tara().status_code, 302)
        self.assertEqual(set(Tarama.objects.values_list("ulke", flat=True)), {""})

    def test_bozuk_dosya_ulke_bos(self):
        self.qr_yap("TEST01")
        with tempfile.NamedTemporaryFile(suffix=".mmdb") as f:
            f.write(b"bu bir mmdb degil")
            f.flush()
            with override_settings(GEOIP_VERITABANI=f.name):
                self.assertEqual(self.tara().status_code, 302)
        self.assertEqual(Tarama.objects.get().ulke, "")

    def test_kutuphane_yoksa_ulke_bos(self):
        self.qr_yap("TEST01")
        with override_settings(GEOIP_VERITABANI="/tmp/herhangi.mmdb"), mock.patch.dict(sys.modules, {"maxminddb": None}):
            self.assertEqual(self.tara().status_code, 302)
        self.assertEqual(Tarama.objects.get().ulke, "")

    def test_sahte_okuyucu_ile_tr(self):
        self.qr_yap("TEST01")
        sahte = SahteOkuyucu({"country": {"iso_code": "tr"}})
        with mock.patch.object(tarama_bilgisi, "okuyucu", return_value=sahte):
            self.assertEqual(self.tara().status_code, 302)
        self.assertEqual(Tarama.objects.get().ulke, "TR")
        self.assertEqual(sahte.sorgular, ["203.0.113.5"])  # IP yalnızca arama için bellekte kullanıldı

    def test_ip_saklanmaz(self):
        self.qr_yap("TEST01")
        with mock.patch.object(tarama_bilgisi, "okuyucu", return_value=SahteOkuyucu({"country": {"iso_code": "DE"}})):
            self.tara()
        self.assertNotIn("203.0.113.5", str(model_to_dict(Tarama.objects.get())))

    def test_gecersiz_sonuclar_bos(self):
        for sonuc in (None, {}, {"country": {}}, {"country": {"iso_code": "TUR"}}, {"country": {"iso_code": "1x"}}, {"country": None}):
            with mock.patch.object(tarama_bilgisi, "okuyucu", return_value=SahteOkuyucu(sonuc)):
                self.assertEqual(tarama_bilgisi.ulke_kodu("203.0.113.5"), "", sonuc)

    def test_okuyucu_hatasi_yutulur(self):
        class Bozuk:
            def get(self, ip):
                raise ValueError("bozuk")

        with mock.patch.object(tarama_bilgisi, "okuyucu", return_value=Bozuk()):
            self.assertEqual(tarama_bilgisi.ulke_kodu("203.0.113.5"), "")
        self.assertEqual(tarama_bilgisi.ulke_kodu(""), "")

    def test_okuyucu_surec_basina_bir_kez_acilir(self):
        sahte = SahteOkuyucu({"country": {"iso_code": "TR"}})
        with override_settings(GEOIP_VERITABANI="/sahte/yol.mmdb"), mock.patch.object(tarama_bilgisi, "_okuyucu_ac", return_value=sahte) as ac:
            for _ in range(3):
                self.assertEqual(tarama_bilgisi.ulke_kodu("203.0.113.5"), "TR")
            self.assertEqual(ac.call_count, 1)

    def test_basarisiz_acilis_kisa_sure_yeniden_denenmez(self):
        with override_settings(GEOIP_VERITABANI="/sahte/yol.mmdb"), mock.patch.object(tarama_bilgisi, "_okuyucu_ac", return_value=None) as ac:
            for _ in range(3):
                self.assertEqual(tarama_bilgisi.ulke_kodu("203.0.113.5"), "")
            self.assertEqual(ac.call_count, 1)


# --- 3. Zaman grafikleri ---

SIMDI = datetime(2026, 3, 10, 12, 30, tzinfo=IST)


class GrafikTesti(Temel4):
    def setUp(self):
        super().setUp()
        self.qr = self.qr_yap("TEST01")

    def ekle(self, zaman, bot=False, adet=1):
        for _ in range(adet):
            Tarama.objects.create(qr=self.qr, zaman=zaman, sonuc="yonlendi", cihaz="bot" if bot else "mobil", bot=bot)

    def seri(self, aralik, bot_dahil=False, simdi=SIMDI):
        return grafik.seri(Tarama.objects.filter(qr=self.qr), aralik, bot_dahil, simdi=simdi)

    def test_24_saat_saatlik_sinirlar(self):
        self.ekle(datetime(2026, 3, 9, 13, 0, 0, tzinfo=IST))          # pencerenin ilk saniyesi: dahil
        self.ekle(datetime(2026, 3, 9, 12, 59, 59, tzinfo=IST))        # bir saniye önce: hariç
        self.ekle(datetime(2026, 3, 10, 12, 59, 59, tzinfo=IST), adet=2)  # içinde bulunulan saatin sonu
        self.ekle(datetime(2026, 3, 10, 13, 0, 0, tzinfo=IST))         # gelecek saat: hariç
        s = self.seri("24s")
        self.assertEqual(s["birim"], "saat")
        self.assertEqual(len(s["kovalar"]), 24)
        self.assertEqual(s["kovalar"][0]["baslangic"], datetime(2026, 3, 9, 13, 0, tzinfo=IST))
        self.assertEqual(s["kovalar"][-1]["baslangic"], datetime(2026, 3, 10, 12, 0, tzinfo=IST))
        self.assertEqual(s["kovalar"][0]["sayi"], 1)
        self.assertEqual(s["kovalar"][-1]["sayi"], 2)
        self.assertEqual(s["toplam"], 3)
        self.assertEqual(s["kovalar"][0]["etiket"], "13:00")

    def test_gunluk_sinirlar_istanbul_gece_yarisi(self):
        # 2026-03-09 21:00 UTC == 2026-03-10 00:00 İstanbul
        self.ekle(datetime(2026, 3, 9, 21, 0, 0, tzinfo=utc.utc))
        self.ekle(datetime(2026, 3, 9, 20, 59, 59, tzinfo=utc.utc), adet=2)
        s = self.seri("7g")
        gunler = {k["baslangic"].date(): k["sayi"] for k in s["kovalar"]}
        self.assertEqual(len(s["kovalar"]), 7)
        self.assertEqual(gunler[datetime(2026, 3, 10).date()], 1)
        self.assertEqual(gunler[datetime(2026, 3, 9).date()], 2)
        self.assertEqual(s["kovalar"][0]["baslangic"], datetime(2026, 3, 4, 0, 0, tzinfo=IST))

    def test_7_ve_30_gun_kova_sayisi_ve_disi(self):
        self.ekle(datetime(2026, 3, 3, 23, 59, 59, tzinfo=IST))  # 7 günün dışında (4 Mart'tan başlar)
        self.ekle(datetime(2026, 2, 8, 23, 59, 59, tzinfo=IST))  # 30 günün dışında (30 gün: 9 Şubat 00:00'dan başlar)
        self.ekle(datetime(2026, 2, 9, 0, 0, 0, tzinfo=IST))     # 30 günün ilk saniyesi
        self.assertEqual(len(self.seri("7g")["kovalar"]), 7)
        self.assertEqual(self.seri("7g")["toplam"], 0)
        s30 = self.seri("30g")
        self.assertEqual(len(s30["kovalar"]), 30)
        self.assertEqual(s30["kovalar"][0]["baslangic"], datetime(2026, 2, 9, 0, 0, tzinfo=IST))
        self.assertEqual(s30["toplam"], 2)  # 9 Şubat 00:00:00 ve 3 Mart 23:59:59

    def test_bot_dahil_haric(self):
        self.ekle(datetime(2026, 3, 10, 10, 0, tzinfo=IST), adet=2)
        self.ekle(datetime(2026, 3, 10, 10, 5, tzinfo=IST), bot=True, adet=3)
        self.assertEqual(self.seri("7g", bot_dahil=False)["toplam"], 2)
        self.assertEqual(self.seri("7g", bot_dahil=True)["toplam"], 5)
        self.assertEqual(self.seri("7g", bot_dahil=False)["bot_toplam"], 3)

    def test_tum_zamanlar_kisa_ise_gunluk_uzun_ise_haftalik(self):
        self.ekle(datetime(2026, 3, 1, 12, 0, tzinfo=IST))
        self.ekle(datetime(2026, 3, 10, 12, 0, tzinfo=IST))
        s = self.seri("tumu")
        self.assertEqual(s["birim"], "gun")
        self.assertEqual(len(s["kovalar"]), 10)
        self.assertEqual(s["toplam"], 2)

        Tarama.objects.all().delete()
        self.ekle(datetime(2025, 2, 5, 12, 0, tzinfo=IST))   # çarşamba
        self.ekle(datetime(2026, 3, 10, 12, 0, tzinfo=IST))  # salı
        self.ekle(datetime(2026, 3, 9, 0, 0, 0, tzinfo=IST))  # pazartesi 00:00 → yeni hafta
        self.ekle(datetime(2026, 3, 8, 23, 59, 59, tzinfo=IST))  # pazar → önceki hafta
        w = self.seri("tumu")
        self.assertEqual(w["birim"], "hafta")
        self.assertEqual(w["kovalar"][0]["baslangic"], datetime(2025, 2, 3, 0, 0, tzinfo=IST))  # pazartesi
        for k in w["kovalar"]:
            self.assertEqual(k["baslangic"].weekday(), 0)
        self.assertEqual(w["kovalar"][-1]["baslangic"], datetime(2026, 3, 9, 0, 0, tzinfo=IST))
        self.assertEqual(w["kovalar"][-1]["sayi"], 2)
        self.assertEqual(w["kovalar"][-2]["sayi"], 1)
        self.assertEqual(w["toplam"], 4)

    def test_tum_zamanlar_bos(self):
        Tarama.objects.all().delete()
        s = self.seri("tumu")
        self.assertEqual(len(s["kovalar"]), 1)
        self.assertEqual(s["toplam"], 0)

    def test_gecersiz_aralik_varsayilana_duser(self):
        self.assertEqual(grafik.aralik_secimi("zzz"), "30g")
        self.assertEqual(grafik.aralik_secimi(None), "30g")

    def test_svg_kullanici_verisi_kacirilir(self):
        s = self.seri("7g")
        kotu = '"><script>alert(1)</script><img src=x onerror=alert(2)>&'
        svg = grafik.svg_cubuk_grafik(s, kotu)
        self.assertTrue(svg.startswith("<svg"))
        self.assertNotIn("<script", svg)
        self.assertNotIn("<img", svg)
        self.assertIn("&quot;&gt;&lt;script&gt;", svg)
        self.assertIn("&lt;script&gt;", svg)
        self.assertNotIn("style=", svg)
        self.assertNotIn("onerror=alert(2)>", svg)

    def test_svg_gecerli_xml_ve_cubuk_sayisi(self):
        import xml.etree.ElementTree as ET

        self.ekle(datetime(2026, 3, 10, 10, 0, tzinfo=IST), adet=4)
        svg = grafik.svg_cubuk_grafik(self.seri("30g"), "Başlık & Ö")
        kok = ET.fromstring(svg)
        self.assertEqual(len(kok.findall(".//{http://www.w3.org/2000/svg}rect")), 30)

    # Görünümler
    def test_qr_detay_grafigi_ve_araliklar(self):
        self.qr.refresh_from_db()
        self.giris(self.izleyici)
        for aralik in ("24s", "7g", "30g", "tumu", "gecersiz"):
            yanit = self.client.get(reverse("panel:qr_detay", args=[self.qr.pk]), {"aralik": aralik})
            self.assertEqual(yanit.status_code, 200)
            self.assertContains(yanit, "<svg")
            self.assertNotContains(yanit, "<script>")
        yanit = self.client.get(reverse("panel:qr_detay", args=[self.qr.pk]), {"aralik": "24s", "bot_dahil": "1"})
        self.assertEqual(yanit.context["grafik_seri"]["birim"], "saat")
        self.assertTrue(yanit.context["bot_dahil"])

    def test_qr_detay_hostil_ad_kacirilir(self):
        QRKod.objects.filter(pk=self.qr.pk).update(ad="<script>alert(1)</script>", baslik="<img src=x onerror=1>")
        self.giris(self.izleyici)
        yanit = self.client.get(reverse("panel:qr_detay", args=[self.qr.pk]))
        self.assertNotContains(yanit, "<script>alert(1)")
        self.assertNotContains(yanit, "<img src=x")

    def test_rapor_grafik_yonlendiren_ve_ulke_tablolari(self):
        simdi = timezone.now()
        for _ in range(3):
            self.tarama_kaydi(qr=self.qr, zaman=simdi, yonlendiren="a.example", ulke="TR")
        self.tarama_kaydi(qr=self.qr, zaman=simdi, yonlendiren="b.example", ulke="DE")
        self.tarama_kaydi(qr=self.qr, zaman=simdi)  # bilinmeyen
        self.tarama_kaydi(qr=self.qr, zaman=simdi, cihaz="bot", bot=True, yonlendiren="bot.example", ulke="US")
        self.giris(self.izleyici)
        yanit = self.client.get("/panel/rapor/istatistik", {"aralik": "7g"})
        self.assertEqual(yanit.status_code, 200)
        self.assertContains(yanit, "Yönlendiren siteler")
        self.assertContains(yanit, "<svg")
        self.assertEqual([s["deger"] for s in yanit.context["yonlendirenler"]], ["a.example", "b.example"])
        self.assertEqual([s["toplam"] for s in yanit.context["yonlendirenler"]], [3, 1])
        self.assertEqual([s["deger"] for s in yanit.context["ulkeler"]], ["TR", "DE"])
        self.assertEqual(yanit.context["yon_bilinmeyen"], 1)
        self.assertEqual(yanit.context["secili_aralik"], "7g")
        # bot dahil
        yanit = self.client.get("/panel/rapor/istatistik", {"bot_dahil": "1"})
        self.assertIn("bot.example", [s["deger"] for s in yanit.context["yonlendirenler"]])
        self.assertIn("US", [s["deger"] for s in yanit.context["ulkeler"]])

    def test_rapor_ilk_20(self):
        for i in range(25):
            self.tarama_kaydi(qr=self.qr, yonlendiren=f"site{i:02d}.example")
        self.giris(self.izleyici)
        yanit = self.client.get("/panel/rapor/istatistik")
        self.assertEqual(len(yanit.context["yonlendirenler"]), 20)


# --- 4. kod+ istatistik sayfası ---

class KodIstatistikTesti(Temel4):
    def setUp(self):
        super().setUp()
        self.qr = self.qr_yap("ABC123", "https://hedef.example/gizli-yol")
        self.simdi = timezone.now()

    def tarama_ekle(self, qr, adet=1, **ek):
        for _ in range(adet):
            self.tarama_kaydi(qr=qr, zaman=self.simdi, **ek)

    def test_kapali_anonim_404_varlik_ele_verilmez(self):
        var = self.client.get("/k/ABC123+")
        yok = self.client.get("/k/YOKKOD+")
        self.assertEqual(var.status_code, 404)
        self.assertEqual(yok.status_code, 404)
        self.assertEqual(var.content, yok.content)
        self.assertEqual(self.client.get("/k/ABC123+all").status_code, 404)
        self.assertNotContains(var, "ABC123", status_code=404)

    def test_kapali_izinli_kullanici_panele_yonlendirilir(self):
        for kullanici in (self.izleyici, self.editor, self.yonetici):
            self.giris(kullanici)
            for adres in ("/k/ABC123+", "/k/abc123+", "/k/ABC123+all"):
                yanit = self.client.get(adres)
                self.assertRedirects(yanit, reverse("panel:qr_detay", args=[self.qr.pk]), fetch_redirect_response=False)
        self.giris(self.editor)
        self.assertEqual(self.client.get("/k/YOKKOD+").status_code, 404)

    def test_kapali_izinsiz_giris_yapmis_kullanici_404(self):
        self.giris(self.rolsuz)
        self.assertEqual(self.client.get("/k/ABC123+").status_code, 404)

    def test_acik_herkese_acik_sade_sayfa(self):
        self.ayar(herkese_acik_istatistik=True)
        self.tarama_ekle(self.qr, 3, yonlendiren="a.example", ulke="TR")
        self.tarama_ekle(self.qr, 2, cihaz="bot", bot=True, yonlendiren="bot.example", ulke="US")
        yanit = self.client.get("/k/ABC123+")
        self.assertEqual(yanit.status_code, 200)
        self.assertContains(yanit, "ABC123")
        self.assertEqual(yanit.context["toplam"], 3)  # bot hariç
        self.assertContains(yanit, "<svg")
        self.assertContains(yanit, "a.example")
        self.assertNotContains(yanit, "bot.example")
        self.assertContains(yanit, "TR")
        self.assertEqual(yanit.context["son_30_gun"], 3)

    def test_noindex_ve_onbellek(self):
        self.ayar(herkese_acik_istatistik=True)
        yanit = self.client.get("/k/ABC123+")
        self.assertContains(yanit, '<meta name="robots" content="noindex">')
        self.assertEqual(yanit["X-Robots-Tag"], "noindex, nofollow")
        self.assertIn("no-store", yanit["Cache-Control"])
        self.assertNotIn("<script", yanit.content.decode())
        self.assertIn("no-store", self.client.get("/k/YOKKOD+")["Cache-Control"])

    def test_hedef_varsayilan_gizli_ayarla_gorunur(self):
        self.ayar(herkese_acik_istatistik=True)
        self.assertNotContains(self.client.get("/k/ABC123+"), "hedef.example")
        self.assertNotContains(self.client.get("/k/ABC123+all"), "hedef.example")
        self.ayar(istatistikte_hedef_goster=True)
        self.assertContains(self.client.get("/k/ABC123+"), "https://hedef.example/gizli-yol")
        self.assertContains(self.client.get("/k/ABC123+all"), "https://hedef.example/gizli-yol")

    def test_varsayilan_ayarlar_kapali(self):
        a = GenelAyarlar.al()
        self.assertFalse(a.herkese_acik_istatistik)
        self.assertFalse(a.istatistikte_hedef_goster)

    def test_cop_ve_arsiv_404(self):
        self.ayar(herkese_acik_istatistik=True)
        arsiv = self.qr_yap("ARSIV1", "https://baska.example/a")
        cop = self.qr_yap("COP001", "https://baska.example/b")
        qr_kaydet_arsiv = QRKod.objects.get(pk=arsiv.pk)
        qr_kaydet_arsiv.durum = "arsiv"
        qr_kaydet(qr_kaydet_arsiv, None)
        qr_cope_tasi([cop], None)
        for kod in ("ARSIV1", "COP001"):
            self.assertEqual(self.client.get(f"/k/{kod}+").status_code, 404, kod)
            self.assertEqual(self.client.get(f"/k/{kod}+all").status_code, 404, kod)
        self.giris(self.yonetici)  # açıkken yetkili kullanıcı için de 404 (herkese açık davranış)
        self.assertEqual(self.client.get("/k/COP001+").status_code, 404)

    def test_pasif_kod_gorunur(self):
        self.ayar(herkese_acik_istatistik=True)
        QRKod.objects.filter(pk=self.qr.pk).update(durum="pasif")
        self.assertEqual(self.client.get("/k/ABC123+").status_code, 200)

    def test_all_ayni_hedefli_kodlarin_toplami(self):
        self.ayar(herkese_acik_istatistik=True)
        ikinci = self.qr_yap("ABC124", "https://hedef.example/gizli-yol")
        ucuncu = self.qr_yap("ABC125", "https://hedef.example/gizli-yol")
        diger = self.qr_yap("DIGER1", "https://diger.example/")
        arsivli = QRKod.objects.get(pk=ucuncu.pk)
        arsivli.durum = "arsiv"
        qr_kaydet(arsivli, None)
        self.tarama_ekle(self.qr, 2)
        self.tarama_ekle(ikinci, 3)
        self.tarama_ekle(ucuncu, 7)   # arşivde: toplama girmez
        self.tarama_ekle(diger, 11)   # farklı hedef: girmez
        self.tarama_ekle(ikinci, 5, cihaz="bot", bot=True)
        tek = self.client.get("/k/ABC123+")
        toplam = self.client.get("/k/ABC123+all")
        self.assertEqual(tek.context["toplam"], 2)
        self.assertEqual(toplam.context["toplam"], 5)
        self.assertEqual(toplam.context["kod_sayisi"], 2)
        self.assertContains(toplam, "2 kodun toplamı")
        self.assertNotContains(toplam, "ABC124")  # diğer kodlar listelenmez

    def test_artı_ve_yuzde_2b(self):
        self.ayar(herkese_acik_istatistik=True)
        self.tarama_ekle(self.qr, 2)
        for adres in ("/k/ABC123+", "/k/ABC123%2B"):
            yanit = self.client.get(adres)
            self.assertEqual(yanit.status_code, 200, adres)
            self.assertEqual(yanit.context["toplam"], 2)
        for adres in ("/k/ABC123+all", "/k/ABC123%2Ball"):
            yanit = self.client.get(adres)
            self.assertEqual(yanit.status_code, 200, adres)
            self.assertTrue(yanit.context["tum"])
        # kapalıyken de %2B aynı davranış
        self.ayar(herkese_acik_istatistik=False)
        self.giris(self.editor)
        self.assertEqual(self.client.get("/k/ABC123%2B").status_code, 302)

    def test_istatistik_istekleri_tarama_sayilmaz(self):
        self.ayar(herkese_acik_istatistik=True)
        for adres in ("/k/ABC123+", "/k/ABC123+all", "/k/ABC123%2B", "/k/YOKKOD+"):
            self.client.get(adres, HTTP_USER_AGENT=UA_MOBIL)
        self.ayar(herkese_acik_istatistik=False)
        self.client.get("/k/ABC123+")
        self.giris(self.editor)
        self.client.get("/k/ABC123+")
        self.assertEqual(Tarama.objects.count(), 0)
        # karşılaştırma: normal yönlendirme sayılır
        self.assertEqual(self.tara("ABC123").status_code, 302)
        self.assertEqual(Tarama.objects.count(), 1)

    def test_yonlendirme_yolu_etkilenmez(self):
        self.assertEqual(self.tara("ABC123").status_code, 302)
        self.assertEqual(self.client.get("/k/YOKKOD").status_code, 404)

    def test_yalniz_get_head(self):
        self.ayar(herkese_acik_istatistik=True)
        self.assertEqual(self.client.post("/k/ABC123+").status_code, 405)
        self.assertEqual(self.client.head("/k/ABC123+").status_code, 200)

    def test_hiz_siniri_yonlendirmeyle_ayni(self):
        self.ayar(herkese_acik_istatistik=True)
        with override_settings(YONLENDIRME_HIZ_SINIRI=2):
            durumlar = [self.client.get("/k/ABC123+", HTTP_X_FORWARDED_FOR="198.51.100.9").status_code for _ in range(3)]
            self.assertEqual(durumlar, [200, 200, 429])
            # aynı kova: yönlendirme de aynı IP için sınırlanır
            self.assertEqual(self.client.get("/k/ABC123", HTTP_X_FORWARDED_FOR="198.51.100.9").status_code, 429)

    def test_ayarlar_formundan_acilir(self):
        self.giris(self.yonetici)
        form = self.client.get(reverse("panel:ayarlar")).context["form"]
        self.assertIn("herkese_acik_istatistik", form.fields)
        self.assertIn("istatistikte_hedef_goster", form.fields)

    def test_sayfa_hedefli_all_ayni_sayfa(self):
        self.ayar(herkese_acik_istatistik=True)
        sayfa = self.sayfa_yap("kampanya-x")
        a = QRKod(kisa_kod="SAY001", hedef_turu="sayfa", sayfa=sayfa)
        a.full_clean()
        qr_kaydet(a, None)
        b = QRKod(kisa_kod="SAY002", hedef_turu="sayfa", sayfa=sayfa)
        b.full_clean()
        qr_kaydet(b, None)
        self.tarama_ekle(a, 1)
        self.tarama_ekle(b, 2)
        self.assertEqual(self.client.get("/k/SAY001+all").context["toplam"], 3)


# --- 5. Küçük düzeltmeler ---

class UnicodeRakamTesti(Temel4):
    KOTU = ["²", "①", "٣", "９９", "1²"]

    def setUp(self):
        super().setUp()
        self.qr = self.qr_yap("TEST01")

    def test_toplu_islem(self):
        self.giris(self.editor)
        for kotu in self.KOTU:
            yanit = self.client.post(reverse("panel:qr_toplu"), {"islem": "pasif", "secili": [kotu]})
            self.assertEqual(yanit.status_code, 302, kotu)
            yanit = self.client.post(reverse("panel:qr_toplu"), {"islem": "pasif", "secili": [str(self.qr.pk)], "donus": kotu})
            self.assertEqual(yanit.status_code, 302, kotu)
            self.assertEqual(yanit["Location"], reverse("panel:qr_liste"))
            QRKod.objects.filter(pk=self.qr.pk).update(durum="aktif")

    def test_cop_geri_yukle(self):
        self.giris(self.editor)
        for kotu in self.KOTU:
            yanit = self.client.post(reverse("panel:cop_geri_yukle"), {"secili": [kotu]})
            self.assertEqual(yanit.status_code, 302, kotu)

    def test_kampanya_ve_magaza_filtreleri(self):
        self.giris(self.editor)
        for kotu in self.KOTU:
            for ad in ("kampanya", "magaza", "urun"):
                self.assertEqual(self.client.get(reverse("panel:qr_liste"), {ad: kotu}).status_code, 200, (ad, kotu))
        # çok uzun rakam dizisi de 500 vermez
        self.assertEqual(self.client.get(reverse("panel:qr_liste"), {"kampanya": "9" * 5000}).status_code, 200)

    def test_ascii_rakam_calismaya_devam_eder(self):
        k = self.kampanya_yap("KX")
        QRKod.objects.filter(pk=self.qr.pk).update(kampanya=k)
        self.giris(self.editor)
        yanit = self.client.get(reverse("panel:qr_liste"), {"kampanya": str(k.pk)})
        self.assertEqual([q.kisa_kod for q in yanit.context["sayfa"]], ["TEST01"])


class KilitliDuzenlemeTesti(Temel4):
    def setUp(self):
        super().setUp()
        self.qr = self.qr_yap("DUZ-01", "https://example.com/eski", ad="Eski ad", baslik="Eski başlık", aciklama="Açıklama")

    def eszamanli_cope(self):
        """Görünüm kilidi alırken başka bir işlemin satırı çöpe taşıdığını taklit eder (kilit öncesi commit)."""
        gercek = qrler._kilitli_getir

        def sarmal(pk):
            qr_cope_tasi([QRKod.objects.get(pk=pk)], None)
            return gercek(pk)

        return mock.patch.object(qrler, "_kilitli_getir", side_effect=sarmal)

    def test_hizli_duzenleme_yalniz_degisen_alan(self):
        self.giris(self.editor)
        with mock.patch.object(qrler, "qr_kaydet", wraps=qrler.qr_kaydet) as kaydet:
            yanit = self.client.post(
                reverse("panel:qr_hizli_duzenle", args=[self.qr.pk]),
                {"ad": "Yeni ad", "baslik": "Eski başlık", "hedef_url": "https://example.com/eski"},
            )
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(kaydet.call_args.kwargs["alanlar"], ["ad"])
        self.qr.refresh_from_db()
        self.assertEqual(self.qr.ad, "Yeni ad")
        self.assertEqual(self.qr.aciklama, "Açıklama")

    def test_hizli_duzenleme_degisiklik_yoksa_yazmaz(self):
        self.giris(self.editor)
        with mock.patch.object(qrler, "qr_kaydet") as kaydet:
            self.client.post(
                reverse("panel:qr_hizli_duzenle", args=[self.qr.pk]),
                {"ad": "Eski ad", "baslik": "Eski başlık", "hedef_url": "https://example.com/eski"},
            )
        kaydet.assert_not_called()

    def test_hizli_duzenleme_eszamanli_cop_ezilmez(self):
        self.giris(self.editor)
        with self.eszamanli_cope():
            yanit = self.client.post(
                reverse("panel:qr_hizli_duzenle", args=[self.qr.pk]),
                {"ad": "Yeni ad", "baslik": "Eski başlık", "hedef_url": "https://example.com/yeni"},
                HTTP_ACCEPT="application/json",
            )
        self.assertEqual(yanit.status_code, 409)
        self.qr.refresh_from_db()
        self.assertEqual(self.qr.durum, "cop")
        self.assertEqual(self.qr.onceki_durum, "aktif")
        self.assertEqual(self.qr.ad, "Eski ad")
        self.assertEqual(self.qr.hedef_url, "https://example.com/eski")

    def test_hizli_duzenleme_arsiv_409(self):
        arsiv = QRKod.objects.get(pk=self.qr.pk)
        arsiv.durum = "arsiv"
        qr_kaydet(arsiv, None)
        self.giris(self.editor)
        yanit = self.client.post(
            reverse("panel:qr_hizli_duzenle", args=[self.qr.pk]),
            {"ad": "x", "baslik": "y", "hedef_url": "https://example.com/z"}, HTTP_ACCEPT="application/json",
        )
        self.assertEqual(yanit.status_code, 409)

    def test_hizli_duzenleme_olmayan_kayit_404(self):
        self.giris(self.editor)
        self.assertEqual(self.client.post(reverse("panel:qr_hizli_duzenle", args=[999999]), {"ad": "x"}).status_code, 404)

    def test_qr_kaydet_eski_nesne_durumu_ezmez(self):
        eski = QRKod.objects.get(pk=self.qr.pk)           # eski (stale) kopya
        qr_cope_tasi([QRKod.objects.get(pk=self.qr.pk)], None)  # başka işlem çöpe taşıdı
        eski.ad = "Stale ad"
        qr_kaydet(eski, None, alanlar=["ad"])
        taze = QRKod.objects.get(pk=self.qr.pk)
        self.assertEqual(taze.durum, "cop")
        self.assertEqual(taze.onceki_durum, "aktif")
        self.assertIsNotNone(taze.cope_atilma)
        self.assertEqual(taze.ad, "Stale ad")

    def test_qr_duzenle_eszamanli_cop_ezilmez(self):
        self.giris(self.editor)
        with self.eszamanli_cope():
            yanit = self.client.post(f"/panel/qr/{self.qr.pk}/duzenle", {
                "tur": "kampanya", "hedef_turu": "harici", "hedef_url": "https://example.com/baska", "durum": "aktif", "ad": "Yeni",
            })
        self.assertRedirects(yanit, f"/panel/qr/{self.qr.pk}/", fetch_redirect_response=False)
        self.qr.refresh_from_db()
        self.assertEqual(self.qr.durum, "cop")
        self.assertEqual(self.qr.hedef_url, "https://example.com/eski")
        self.assertEqual(self.qr.ad, "Eski ad")

    def test_qr_duzenle_yalniz_degisen_alanlar_yazilir(self):
        self.giris(self.editor)
        veri = {
            "tur": "kampanya", "hedef_turu": "harici", "hedef_url": "https://example.com/eski", "durum": "aktif",
            "ad": "Eski ad", "baslik": "Eski başlık", "aciklama": "Açıklama", "etiketler": "",
        }
        with mock.patch.object(qrler, "qr_kaydet", wraps=qrler.qr_kaydet) as kaydet:
            yanit = self.client.post(f"/panel/qr/{self.qr.pk}/duzenle", {**veri, "ad": "Yeni ad"})
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(kaydet.call_args.kwargs["alanlar"], ["ad"])

    def test_qr_duzenle_hedef_turu_degisince_bagli_alanlar_yazilir(self):
        sayfa = self.sayfa_yap("hedef-sayfa")
        self.giris(self.editor)
        yanit = self.client.post(f"/panel/qr/{self.qr.pk}/duzenle", {
            "tur": "kampanya", "hedef_turu": "sayfa", "hedef_url": "https://example.com/eski", "sayfa": sayfa.pk,
            "durum": "aktif", "ad": "Eski ad", "baslik": "Eski başlık", "aciklama": "Açıklama",
        })
        self.assertEqual(yanit.status_code, 302)
        self.qr.refresh_from_db()
        self.assertEqual(self.qr.hedef_turu, "sayfa")
        self.assertEqual(self.qr.sayfa_id, sayfa.pk)
        self.assertEqual(self.qr.hedef_url, "")  # form temizlemesi de yazıldı

    def test_qr_duzenle_cop_get_yonlendirir(self):
        qr_cope_tasi([self.qr], None)
        self.giris(self.editor)
        self.assertEqual(self.client.get(f"/panel/qr/{self.qr.pk}/duzenle").status_code, 302)

    def test_qr_duzenle_olmayan_404(self):
        self.giris(self.editor)
        self.assertEqual(self.client.post("/panel/qr/999999/duzenle", {"tur": "kampanya"}).status_code, 404)
        self.assertEqual(self.client.get("/panel/qr/999999/duzenle").status_code, 404)
