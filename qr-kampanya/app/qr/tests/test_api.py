"""Kimlik doğrulamalı JSON/XML API (/api/v1/) ve panelde API anahtarı yönetimi."""
import xml.etree.ElementTree as ET
from datetime import timedelta

import pyotp

from django.contrib.auth.signals import user_login_failed
from django.core.exceptions import ValidationError
from django.test import Client, override_settings
from django.utils import timezone

from qr.models import ApiAnahtari, DenetimKaydi, GenelAyarlar, HedefGecmisi, KullaniciApiAyari, MFACihazi, QRKod, Tarama

from .yardimci import PAROLA, TemelTest

API = "/api/v1/"


def baslik(anahtar):
    return {"HTTP_AUTHORIZATION": f"Bearer {anahtar}"}


class ApiTemel(TemelTest):
    def anahtar_yap(self, kullanici=None, ad="test"):
        return ApiAnahtari.uret(kullanici or self.editor, ad)

    def post(self, anahtar, veri, **ek):
        return self.client.post(API, veri, **baslik(anahtar), **ek)

    def get(self, anahtar, veri, **ek):
        return self.client.get(API, veri, **baslik(anahtar), **ek)

    def kisalt(self, anahtar, url="https://example.com/a", **ek):
        return self.post(anahtar, {"action": "shorturl", "url": url, **ek})


class AnahtarModeliTesti(ApiTemel):
    def test_ozet_saklanir_duz_anahtar_veritabaninda_yok(self):
        kayit, duz = self.anahtar_yap()
        self.assertTrue(duz.startswith(f"qrk_{kayit.onek}_"))
        self.assertEqual(len(kayit.onek), 12)
        self.assertEqual(len(kayit.ozet), 64)
        self.assertEqual(kayit.ozet, ApiAnahtari.ozet_hesapla(duz))
        self.assertNotIn(duz, kayit.ozet)
        gizli = duz.split("_", 2)[2]
        from django.db import connection

        with connection.cursor() as imlec:
            imlec.execute("SELECT * FROM qr_apianahtari")
            satirlar = [str(h) for s in imlec.fetchall() for h in s]
        self.assertFalse(any(gizli in s or duz in s for s in satirlar))
        self.assertFalse(DenetimKaydi.objects.filter(ozet__contains=gizli).exists())

    def test_silinemez(self):
        kayit, _ = self.anahtar_yap()
        with self.assertRaises(ValidationError):
            kayit.delete()
        self.assertTrue(ApiAnahtari.objects.filter(pk=kayit.pk).exists())

    def test_dogrulama(self):
        kayit, duz = self.anahtar_yap()
        self.assertEqual(ApiAnahtari.dogrula(duz), kayit)
        for kotu in ("", "x", duz + "a", duz[:-1], f"qrk_{kayit.onek}_yanlis", "qrk_aaaaaaaaaaaa_yanlis", duz.replace("qrk_", "xyz_")):
            self.assertIsNone(ApiAnahtari.dogrula(kotu), kotu)


class KimlikTesti(ApiTemel):
    def test_basliksiz_401_ve_cerez_yetmez(self):
        yanit = self.client.get(API, {"action": "version"})
        self.assertEqual(yanit.status_code, 401)
        self.assertEqual(yanit.json()["statusCode"], 401)
        self.assertEqual(yanit["Cache-Control"], "no-store")
        self.assertIn("Bearer", yanit["WWW-Authenticate"])
        # Oturum çerezli (panelde giriş yapmış) istemci token olmadan API'yi kullanamaz.
        self.giris(self.yonetici)
        self.assertEqual(self.client.get(API, {"action": "version"}).status_code, 401)

    def test_yanlis_anahtar_401(self):
        kayit, duz = self.anahtar_yap()
        self.assertEqual(self.get(duz + "x", {"action": "version"}).status_code, 401)
        self.assertEqual(self.get(f"qrk_{kayit.onek}_{'a' * 43}", {"action": "version"}).status_code, 401)
        self.assertEqual(self.client.get(API, {"action": "version"}, HTTP_AUTHORIZATION=f"Basic {duz}").status_code, 401)

    def test_iptal_edilmis_401(self):
        kayit, duz = self.anahtar_yap()
        self.assertEqual(self.get(duz, {"action": "version"}).status_code, 200)
        kayit.iptal_zamani = timezone.now()
        kayit.save()
        self.assertEqual(self.get(duz, {"action": "version"}).status_code, 401)

    def test_pasif_kullanici_401(self):
        _, duz = self.anahtar_yap()
        self.editor.is_active = False
        self.editor.save()
        self.assertEqual(self.get(duz, {"action": "version"}).status_code, 401)

    def test_jsonp_yok_cors_onerilir(self):
        _, duz = self.anahtar_yap()
        for p in ({"format": "jsonp"}, {"callback": "f"}):
            yanit = self.get(duz, {"action": "version", **p})
            self.assertEqual(yanit.status_code, 400)
            self.assertIn("CORS", yanit.json()["message"])
            self.assertNotIn("f(", yanit.content.decode())

    def test_sorgu_dizesinde_veya_govdede_anahtar_reddedilir(self):
        _, duz = self.anahtar_yap()
        for veri in ({"api_key": duz}, {"token": duz}, {"signature": "x"}, {"baska": duz}):
            self.assertEqual(self.client.get(API, {"action": "version", **veri}).status_code, 401, veri)
        self.assertEqual(self.client.post(API, {"action": "version", "api_key": duz}).status_code, 401)
        # Geçerli başlık olsa bile sorgu dizesinde anahtar bulunan istek reddedilir.
        self.assertEqual(self.get(duz, {"action": "version", "baska": duz}).status_code, 401)

    def test_basarisiz_deneme_ip_basina_429(self):
        for _ in range(10):
            self.assertEqual(self.client.get(API, {"action": "version"}, HTTP_AUTHORIZATION="Bearer qrk_yanlis").status_code, 401)
        yanit = self.client.get(API, {"action": "version"}, HTTP_AUTHORIZATION="Bearer qrk_yanlis")
        self.assertEqual(yanit.status_code, 429)
        self.assertEqual(yanit["Retry-After"], "60")
        self.assertEqual(yanit.json()["statusCode"], 429)
        # Başka IP etkilenmez.
        self.assertEqual(
            self.client.get(API, {"action": "version"}, HTTP_AUTHORIZATION="Bearer x", HTTP_X_FORWARDED_FOR="198.51.100.9").status_code, 401
        )

    @override_settings(API_HIZ_SINIRI=3)
    def test_anahtar_basina_429(self):
        _, duz = self.anahtar_yap()
        _, baska = self.anahtar_yap(self.yonetici, "b")
        for _ in range(3):
            self.assertEqual(self.get(duz, {"action": "version"}).status_code, 200)
        yanit = self.get(duz, {"action": "version"})
        self.assertEqual(yanit.status_code, 429)
        self.assertEqual(self.get(baska, {"action": "version"}).status_code, 200)

    def test_csrf_olmadan_post_calisir_cerezle_olmaz(self):
        _, duz = self.anahtar_yap()
        istemci = Client(enforce_csrf_checks=True)
        yanit = istemci.post(API, {"action": "shorturl", "url": "https://example.com/csrf"}, **baslik(duz))
        self.assertEqual(yanit.status_code, 200)
        istemci.force_login(self.editor)
        yanit = istemci.post(API, {"action": "shorturl", "url": "https://example.com/csrf2"})
        self.assertEqual(yanit.status_code, 401)
        self.assertFalse(QRKod.objects.filter(hedef_url="https://example.com/csrf2").exists())

    def test_yontem_kisitlari(self):
        _, duz = self.anahtar_yap()
        self.assertEqual(self.client.put(API, **baslik(duz)).status_code, 405)
        self.assertEqual(self.get(duz, {"action": "shorturl", "url": "https://example.com/x"}).status_code, 405)
        self.assertFalse(QRKod.objects.filter(hedef_url="https://example.com/x").exists())


class YetkiTesti(ApiTemel):
    def test_izleyici_okuyabilir_olusturamaz(self):
        _, duz = self.anahtar_yap(self.izleyici)
        self.assertEqual(self.get(duz, {"action": "db-stats"}).status_code, 200)
        yanit = self.kisalt(duz)
        self.assertEqual(yanit.status_code, 403)
        self.assertEqual(yanit.json()["statusCode"], 403)
        self.assertEqual(QRKod.objects.count(), 0)

    def test_izinsiz_kullanici_okuyamaz(self):
        _, duz = self.anahtar_yap(self.rolsuz)
        self.assertEqual(self.get(duz, {"action": "stats"}).status_code, 403)
        self.assertEqual(self.get(duz, {"action": "version"}).status_code, 200)


class ShorturlTesti(ApiTemel):
    def test_basari_ve_kayitlar(self):
        kayit, duz = self.anahtar_yap()
        yanit = self.kisalt(duz, "https://example.com/yeni", keyword="API-01", title="Başlık")
        self.assertEqual(yanit.status_code, 200)
        v = yanit.json()
        self.assertEqual((v["statusCode"], v["keyword"], v["url"], v["title"]), (200, "API-01", "https://example.com/yeni", "Başlık"))
        self.assertTrue(v["shorturl"].endswith("/k/API-01"))
        qr = QRKod.objects.get(kisa_kod="API-01")
        self.assertEqual((qr.baslik, qr.ad, qr.olusturan), ("Başlık", "Başlık", self.editor))
        gecmis = HedefGecmisi.objects.get(qr=qr)
        self.assertEqual(gecmis.kullanici, self.editor)
        self.assertIn("API", gecmis.not_metni)
        d = DenetimKaydi.objects.get(eylem="qr_olustur", nesne_id=str(qr.pk))
        self.assertEqual(d.kullanici, self.editor)
        self.assertIn("API", d.ozet)
        self.assertNotIn(duz, d.ozet)

    def test_otomatik_kod_ve_ad_turetme(self):
        _, duz = self.anahtar_yap()
        v = self.kisalt(duz).json()
        qr = QRKod.objects.get(kisa_kod=v["keyword"])
        self.assertEqual(qr.ad, qr.kisa_kod)
        v2 = self.kisalt(duz, "https://example.com/b", ad="Elle ad").json()
        self.assertEqual(QRKod.objects.get(kisa_kod=v2["keyword"]).ad, "Elle ad")

    def test_ayrilmis_kod_biçim_ve_benzersizlik(self):
        _, duz = self.anahtar_yap()
        self.qr_yap("VAR-01")
        for kod in ("admin", "API", "a b", "x"):
            yanit = self.kisalt(duz, keyword=kod)
            self.assertEqual(yanit.status_code, 400, kod)
            self.assertIn("keyword", yanit.json()["message"])
        yanit = self.kisalt(duz, keyword="var-01")
        self.assertEqual(yanit.status_code, 400)
        self.assertEqual(QRKod.objects.count(), 1)

    def test_gecersiz_url(self):
        _, duz = self.anahtar_yap()
        for url in ("javascript:alert(1)", "http://127.0.0.1/x", "http://192.168.1.5/", "ftp://example.com/a", "", "data:text/html,x"):
            yanit = self.kisalt(duz, url)
            self.assertEqual(yanit.status_code, 400, url)
            self.assertEqual(yanit.json()["statusCode"], 400)
        self.assertEqual(QRKod.objects.count(), 0)

    def test_ayni_hedef_409_ve_force(self):
        _, duz = self.anahtar_yap()
        self.qr_yap("ESKI-1", "https://example.com/ayni")
        yanit = self.kisalt(duz, "https://example.com/ayni")
        self.assertEqual(yanit.status_code, 409)
        self.assertEqual(yanit.json()["kodlar"], ["ESKI-1"])
        self.assertEqual(QRKod.objects.count(), 1)
        self.assertEqual(self.kisalt(duz, "https://example.com/ayni", force="1").status_code, 200)
        self.assertEqual(QRKod.objects.count(), 2)

    def test_ayni_hedef_ayari_kapaliysa_409_yok(self):
        _, duz = self.anahtar_yap()
        self.qr_yap("ESKI-1", "https://example.com/ayni")
        GenelAyarlar.objects.update_or_create(pk=1, defaults={"ayni_hedef_uyarisi": False})
        self.assertEqual(self.kisalt(duz, "https://example.com/ayni").status_code, 200)

    def test_olusturma_sayaci_kullanici_basina(self):
        _, duz = self.anahtar_yap()
        with override_settings(QR_OLUSTURMA_HIZ_SINIRI=2):
            self.assertEqual(self.kisalt(duz, "https://example.com/1").status_code, 200)
            # Panelden oluşturma da aynı sayaçtan düşer.
            self.giris(self.editor)
            self.assertEqual(self.client.post("/panel/qr/yeni", {
                "tur": "kampanya", "hedef_turu": "harici", "hedef_url": "https://example.com/2", "durum": "aktif",
            }).status_code, 302)
            self.client.logout()
            self.assertEqual(self.kisalt(duz, "https://example.com/3").status_code, 429)
        self.assertEqual(QRKod.objects.count(), 2)

    def test_baslik_300_asarsa_400(self):
        _, duz = self.anahtar_yap()
        self.assertEqual(self.kisalt(duz, title="x" * 301).status_code, 400)


class OkumaEylemleriTesti(ApiTemel):
    def setUp(self):
        super().setUp()
        _, self.duz = self.anahtar_yap(self.izleyici)

    def tara(self, qr, bot=False, ozet="a", gun=0):
        Tarama.objects.create(qr=qr, sonuc="yonlendi", bot=bot, ziyaretci_ozeti=ozet, zaman=timezone.now() - timedelta(days=gun))

    def test_expand(self):
        qr = self.qr_yap("EXP-01", "https://example.com/uzun", baslik="Uzun sayfa")
        for girdi in ("EXP-01", "exp-01", qr.kisa_url, qr.kisa_url + "/"):
            v = self.get(self.duz, {"action": "expand", "shorturl": girdi}).json()
            self.assertEqual((v["keyword"], v["longurl"], v["title"], v["durum"]), ("EXP-01", "https://example.com/uzun", "Uzun sayfa", "aktif"), girdi)
        self.assertEqual(self.get(self.duz, {"action": "expand", "shorturl": "YOK-99"}).status_code, 404)
        self.assertEqual(self.get(self.duz, {"action": "expand", "shorturl": "https://example.com/baska"}).status_code, 404)
        self.assertEqual(self.get(self.duz, {"action": "expand"}).status_code, 400)

    def test_expand_sayfa_hedefi(self):
        sayfa = self.sayfa_yap("kamp-1")
        qr = QRKod(kisa_kod="SYF-01", hedef_turu="sayfa", sayfa=sayfa)
        qr.full_clean()
        qr.save()
        v = self.get(self.duz, {"action": "expand", "shorturl": "SYF-01"}).json()
        self.assertTrue(v["longurl"].endswith("/s/kamp-1"))

    def test_url_stats(self):
        qr = self.qr_yap("UST-01")
        self.tara(qr, ozet="a")
        self.tara(qr, ozet="a")
        self.tara(qr, ozet="b")
        self.tara(qr, bot=True, ozet="c")
        self.tara(qr, ozet="a", gun=3)
        v = self.get(self.duz, {"action": "url-stats", "shorturl": "UST-01"}).json()
        self.assertEqual((v["tarama_toplam"], v["tarama_bot_haric"], v["tekil_tahmini"]), (5, 4, 3))
        self.assertTrue(v["son_tarama"])
        self.assertTrue(v["olusturma"])
        self.assertEqual(self.get(self.duz, {"action": "url-stats", "shorturl": "YOK"}).status_code, 404)
        bos = self.qr_yap("UST-02", "https://example.com/bos")
        v = self.get(self.duz, {"action": "url-stats", "shorturl": bos.kisa_kod}).json()
        self.assertEqual((v["tarama_toplam"], v["son_tarama"]), (0, None))

    def test_stats_filtre_ve_limit(self):
        a, b, c = (self.qr_yap(k, f"https://example.com/{k}") for k in ("AAA-1", "BBB-1", "CCC-1"))
        for _ in range(3):
            self.tara(b)
        self.tara(a)
        self.tara(a, bot=True)
        self.tara(a, bot=True)
        kodlar = lambda **p: [l["keyword"] for l in self.get(self.duz, {"action": "stats", **p}).json()["links"]]
        self.assertEqual(kodlar(), ["BBB-1", "AAA-1", "CCC-1"])  # varsayılan: top, limit 10 (boş dönmez)
        self.assertEqual(kodlar(filter="top", limit=1), ["BBB-1"])
        self.assertEqual(kodlar(filter="bottom", limit=1), ["CCC-1"])
        self.assertEqual(kodlar(filter="last", limit=2), ["CCC-1", "BBB-1"])
        self.assertEqual(sorted(kodlar(filter="rand")), ["AAA-1", "BBB-1", "CCC-1"])
        v = self.get(self.duz, {"action": "stats", "limit": 100}).json()
        self.assertEqual((v["toplam_kod"], v["toplam_tarama_bot_haric"], v["toplam_tarama_bot_dahil"]), (3, 4, 6))
        self.assertEqual(v["links"][1]["tarama_toplam"], 3)
        for kotu in ({"limit": 0}, {"limit": 101}, {"limit": "abc"}, {"limit": -1}, {"filter": "xyz"}):
            self.assertEqual(self.get(self.duz, {"action": "stats", **kotu}).status_code, 400, kotu)

    def test_db_stats_ve_version(self):
        qr = self.qr_yap("DB-01")
        self.tara(qr)
        self.tara(qr, bot=True)
        v = self.get(self.duz, {"action": "db-stats"}).json()
        self.assertEqual((v["toplam_kod"], v["toplam_tarama_bot_haric"], v["toplam_tarama_bot_dahil"]), (1, 1, 2))
        v = self.get(self.duz, {"action": "version"}).json()
        self.assertEqual((v["version"], v["statusCode"]), ("1", 200))

    def test_bilinmeyen_action_ve_format(self):
        self.assertEqual(self.get(self.duz, {"action": "sil"}).status_code, 400)
        self.assertEqual(self.get(self.duz, {}).status_code, 400)
        self.assertEqual(self.get(self.duz, {"action": "version", "format": "jsonp", "callback": "f"}).status_code, 400)
        yanit = self.get(self.duz, {"action": "version", "format": "yaml"})
        self.assertEqual(yanit.status_code, 400)
        self.assertEqual(yanit.json()["statusCode"], 400)


class BicimTesti(ApiTemel):
    def test_xml_ve_kacislama(self):
        _, duz = self.anahtar_yap()
        yanit = self.post(duz, {"action": "shorturl", "url": "https://example.com/x", "keyword": "XML-01", "title": "A <b>&</b> \"c\" \x0bd", "format": "xml"})
        self.assertEqual(yanit.status_code, 200)
        self.assertTrue(yanit["Content-Type"].startswith("application/xml"))
        self.assertEqual(yanit["Cache-Control"], "no-store")
        kok = ET.fromstring(yanit.content)  # iyi biçimli XML
        self.assertEqual(kok.tag, "result")
        self.assertEqual(kok.findtext("statusCode"), "200")
        self.assertEqual(kok.findtext("title"), 'A <b>&</b> "c" d')
        self.assertNotIn(b"<b>", yanit.content)
        self.assertIn(b"&lt;b&gt;&amp;", yanit.content)
        v = self.get(duz, {"action": "stats", "format": "xml"})
        kok = ET.fromstring(v.content)
        self.assertEqual(len(kok.findall("links/link")), 1)
        self.assertEqual(kok.find("links/link/title").text, 'A <b>&</b> "c" d')

    def test_xml_hata_ve_simple(self):
        _, duz = self.anahtar_yap()
        yanit = self.get(duz, {"action": "expand", "shorturl": "YOK", "format": "xml"})
        self.assertEqual(yanit.status_code, 404)
        self.assertEqual(ET.fromstring(yanit.content).findtext("statusCode"), "404")
        yanit = self.post(duz, {"action": "shorturl", "url": "https://example.com/s", "keyword": "SMP-01", "format": "simple"})
        self.assertEqual(yanit.status_code, 200)
        self.assertTrue(yanit["Content-Type"].startswith("text/plain"))
        self.assertEqual(yanit.content.decode(), QRKod.objects.get(kisa_kod="SMP-01").kisa_url)
        yanit = self.get(duz, {"action": "expand", "shorturl": "SMP-01", "format": "simple"})
        self.assertEqual(yanit.content.decode(), "https://example.com/s")
        self.assertEqual(self.get(duz, {"action": "stats", "format": "simple"}).status_code, 400)
        self.assertEqual(self.get(duz, {"action": "expand", "shorturl": "YOK", "format": "simple"}).status_code, 404)
        self.assertEqual(self.post(duz, {"action": "shorturl", "url": "javascript:x", "format": "simple"}).status_code, 400)

    def test_json_baslik_kacislanir(self):
        _, duz = self.anahtar_yap()
        self.kisalt(duz, keyword="JSN-01", title="</script><b>&")
        yanit = self.get(duz, {"action": "expand", "shorturl": "JSN-01"})
        self.assertEqual(yanit.json()["title"], "</script><b>&")
        self.assertTrue(yanit["Content-Type"].startswith("application/json"))


class PanelTesti(ApiTemel):
    def test_olustur_listele_iptal(self):
        self.giris(self.editor)
        self.assertContains(self.client.get("/panel/api-anahtarlari/"), "Henüz API anahtarı yok")
        yanit = self.client.post("/panel/api-anahtarlari/yeni", {"ad": "Betik"})
        self.assertEqual(yanit.status_code, 200)
        kayit = ApiAnahtari.objects.get(ad="Betik")
        duz = yanit.context["anahtar"]
        self.assertContains(yanit, duz)
        self.assertContains(yanit, "yalnızca şimdi gösterilir")
        self.assertEqual(yanit["Cache-Control"], "no-store")
        self.assertEqual(kayit.kullanici, self.editor)
        self.assertEqual(self.get(duz, {"action": "version"}).status_code, 200)
        # Bir daha gösterilmez.
        self.client.cookies.clear()
        self.giris(self.editor)
        liste = self.client.get("/panel/api-anahtarlari/")
        self.assertContains(liste, f"qrk_{kayit.onek}")
        self.assertNotContains(liste, duz)
        self.assertNotContains(liste, kayit.ozet)
        self.assertTrue(DenetimKaydi.objects.filter(eylem="api_anahtari_olustur", nesne_id=str(kayit.pk)).exists())
        # İptal: GET onay sayfası, POST iptal eder.
        url = f"/panel/api-anahtarlari/{kayit.pk}/iptal"
        self.assertContains(self.client.get(url), "iptal edilecek")
        kayit.refresh_from_db()
        self.assertIsNone(kayit.iptal_zamani)
        self.assertEqual(self.client.post(url).status_code, 302)
        kayit.refresh_from_db()
        self.assertIsNotNone(kayit.iptal_zamani)
        self.assertEqual(self.get(duz, {"action": "version"}).status_code, 401)
        self.assertTrue(DenetimKaydi.objects.filter(eylem="api_anahtari_iptal", nesne_id=str(kayit.pk)).exists())
        self.assertContains(self.client.get("/panel/api-anahtarlari/"), "İptal edildi")

    def test_iptal_csrf_ister(self):
        kayit, _ = self.anahtar_yap()
        istemci = Client(enforce_csrf_checks=True)
        istemci.force_login(self.editor)
        self.assertEqual(istemci.post(f"/panel/api-anahtarlari/{kayit.pk}/iptal").status_code, 403)
        kayit.refresh_from_db()
        self.assertIsNone(kayit.iptal_zamani)

    def test_baskasinin_anahtarini_goremez_iptal_edemez(self):
        kayit, _ = self.anahtar_yap(self.yonetici, "yonetici-anahtari")
        self.giris(self.editor)
        self.assertNotContains(self.client.get("/panel/api-anahtarlari/"), "yonetici-anahtari")
        url = f"/panel/api-anahtarlari/{kayit.pk}/iptal"
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.post(url).status_code, 404)
        kayit.refresh_from_db()
        self.assertIsNone(kayit.iptal_zamani)

    def test_yonetici_hepsini_gorur_ve_iptal_eder(self):
        kayit, duz = self.anahtar_yap(self.editor, "editor-anahtari")
        self.giris(self.yonetici)
        self.assertContains(self.client.get("/panel/api-anahtarlari/"), "editor-anahtari")
        self.assertEqual(self.client.post(f"/panel/api-anahtarlari/{kayit.pk}/iptal").status_code, 302)
        self.assertEqual(self.get(duz, {"action": "version"}).status_code, 401)

    def test_giris_gerekli_ve_menu(self):
        self.assertEqual(self.client.get("/panel/api-anahtarlari/").status_code, 302)
        self.assertEqual(self.client.post("/panel/api-anahtarlari/yeni", {"ad": "x"}).status_code, 302)
        self.assertFalse(ApiAnahtari.objects.exists())
        self.giris(self.izleyici)
        self.assertContains(self.client.get("/panel/"), "/panel/api-anahtarlari/")

    def test_izleyici_anahtar_olusturur_ama_shorturl_403(self):
        self.giris(self.izleyici)
        yanit = self.client.post("/panel/api-anahtarlari/yeni", {"ad": "izleyici"})
        duz = yanit.context["anahtar"]
        self.client.logout()
        self.assertEqual(self.kisalt(duz).status_code, 403)
        self.assertEqual(self.get(duz, {"action": "stats"}).status_code, 200)

    def test_ad_zorunlu(self):
        self.giris(self.editor)
        yanit = self.client.post("/panel/api-anahtarlari/yeni", {"ad": " "})
        self.assertEqual(yanit.status_code, 200)
        self.assertFalse(ApiAnahtari.objects.exists())


class ParolaGirisiTesti(ApiTemel):
    def ac(self, kullanici):
        KullaniciApiAyari.objects.update_or_create(kullanici=kullanici, defaults={"parola_girisi": True})

    def giris_post(self, **veri):
        return self.client.post(API, {"action": "db-stats", **veri})

    def test_varsayilan_kapali_403(self):
        yanit = self.giris_post(username="editor", password=PAROLA)
        self.assertEqual(yanit.status_code, 403)
        KullaniciApiAyari.objects.create(kullanici=self.editor, parola_girisi=False)
        self.assertEqual(self.giris_post(username="editor", password=PAROLA).status_code, 403)

    def test_parola_ile_basari_ve_denetim(self):
        self.ac(self.editor)
        yanit = self.client.post(API, {"action": "shorturl", "url": "https://example.com/p", "keyword": "PAR-01", "username": "editor", "password": PAROLA})
        self.assertEqual(yanit.status_code, 200)
        qr = QRKod.objects.get(kisa_kod="PAR-01")
        self.assertEqual(qr.olusturan, self.editor)
        self.assertIn("parola", DenetimKaydi.objects.get(eylem="qr_olustur", nesne_id=str(qr.pk)).ozet)
        d = DenetimKaydi.objects.get(eylem="api_giris_basarili")
        self.assertEqual(d.kullanici, self.editor)
        self.assertNotIn(PAROLA, d.ozet)

    def test_yanlis_parola_401_denetim_ve_sinyal(self):
        self.ac(self.editor)
        gelen = []
        user_login_failed.connect(lambda sender, credentials, **k: gelen.append(credentials), weak=False, dispatch_uid="api-test")
        try:
            yanit = self.giris_post(username="editor", password="yanlis-parola-1")
        finally:
            user_login_failed.disconnect(dispatch_uid="api-test")
        self.assertEqual(yanit.status_code, 401)
        self.assertEqual(len(gelen), 1)
        d = DenetimKaydi.objects.get(eylem="api_giris_basarisiz")
        self.assertNotIn("yanlis-parola-1", d.ozet)
        self.assertEqual(self.giris_post(username="yok", password=PAROLA).status_code, 401)

    def test_pasif_kullanici_401(self):
        self.ac(self.editor)
        self.editor.is_active = False
        self.editor.save()
        self.assertEqual(self.giris_post(username="editor", password=PAROLA).status_code, 401)

    def test_sorguda_parola_reddedilir(self):
        self.ac(self.editor)
        yanit = self.client.post(f"{API}?action=version&username=editor&password={PAROLA}")
        self.assertEqual(yanit.status_code, 401)
        yanit = self.client.post(f"{API}?action=version&password={PAROLA}", {"username": "editor", "password": PAROLA})
        self.assertEqual(yanit.status_code, 401)
        self.assertEqual(self.client.get(API, {"action": "version", "username": "editor", "password": PAROLA}).status_code, 401)
        self.assertFalse(DenetimKaydi.objects.filter(eylem="api_giris_basarili").exists())

    def test_mfa_etkinse_totp_zorunlu(self):
        self.ac(self.editor)
        gizli = pyotp.random_base32()
        MFACihazi.objects.create(kullanici=self.editor, gizli_anahtar=gizli, onayli=True)
        self.assertEqual(self.giris_post(username="editor", password=PAROLA).status_code, 401)
        self.assertEqual(self.giris_post(username="editor", password=PAROLA, totp="000000").status_code, 401)
        yanit = self.giris_post(username="editor", password=PAROLA, totp=pyotp.TOTP(gizli).now())
        self.assertEqual(yanit.status_code, 200)
        # Aynı kod yeniden kullanılamaz.
        self.assertEqual(self.giris_post(username="editor", password=PAROLA, totp=pyotp.TOTP(gizli).now()).status_code, 401)

    def test_mfa_zorunlu_ama_kurulu_degil(self):
        self.ac(self.editor)
        with override_settings(MFA_ZORUNLU=True):
            self.assertEqual(self.giris_post(username="editor", password=PAROLA).status_code, 403)

    def test_deneme_siniri_429(self):
        self.ac(self.editor)
        with override_settings(GIRIS_HIZ_SINIRI=3, GIRIS_DENEME_SINIRI=100, IP_DENEME_SINIRI=100, HESAP_DENEME_SINIRI=100):
            for _ in range(3):
                self.assertEqual(self.giris_post(username="editor", password="yanlis-parola-1").status_code, 401)
            # Sınır aşıldı: doğru parola bile 429 alır (panel girişiyle ortak IP sayacı).
            yanit = self.giris_post(username="editor", password=PAROLA)
            self.assertEqual(yanit.status_code, 429)

    def test_hesap_kilidi_429(self):
        self.ac(self.editor)
        for _ in range(5):
            self.giris_post(username="editor", password="yanlis-parola-1")
        self.assertEqual(self.giris_post(username="editor", password=PAROLA).status_code, 429)

    def test_panelden_ac_kapat_parola_ister(self):
        self.giris(self.editor)
        self.assertEqual(self.client.post("/panel/api-anahtarlari/parola-girisi", {"durum": "ac", "parola": "yanlis"}).status_code, 302)
        self.assertFalse(KullaniciApiAyari.objects.filter(parola_girisi=True).exists())
        self.client.post("/panel/api-anahtarlari/parola-girisi", {"durum": "ac", "parola": PAROLA})
        self.assertTrue(KullaniciApiAyari.objects.get(kullanici=self.editor).parola_girisi)
        self.assertTrue(DenetimKaydi.objects.filter(eylem="api_parola_girisi_ac").exists())
        self.assertContains(self.client.get("/panel/api-anahtarlari/"), "parola girişi: açık")
        self.client.post("/panel/api-anahtarlari/parola-girisi", {"durum": "kapat", "parola": PAROLA})
        self.assertFalse(KullaniciApiAyari.objects.get(kullanici=self.editor).parola_girisi)

    def test_ayar_csrf_ve_giris_ister(self):
        self.assertEqual(self.client.post("/panel/api-anahtarlari/parola-girisi", {"durum": "ac", "parola": PAROLA}).status_code, 302)
        istemci = Client(enforce_csrf_checks=True)
        istemci.force_login(self.editor)
        self.assertEqual(istemci.post("/panel/api-anahtarlari/parola-girisi", {"durum": "ac", "parola": PAROLA}).status_code, 403)
        self.assertFalse(KullaniciApiAyari.objects.exists())


@override_settings(API_CORS_KOKENLERI=("https://izinli.example.com",))
class CorsTesti(ApiTemel):
    def test_izinli_koken(self):
        _, duz = self.anahtar_yap()
        yanit = self.get(duz, {"action": "version"}, HTTP_ORIGIN="https://izinli.example.com")
        self.assertEqual(yanit["Access-Control-Allow-Origin"], "https://izinli.example.com")
        self.assertEqual(yanit["Vary"], "Origin")
        self.assertNotIn("Access-Control-Allow-Credentials", yanit)

    def test_izinsiz_koken_ve_kokensiz(self):
        _, duz = self.anahtar_yap()
        for koken in ("https://kotu.example.com", "https://izinli.example.com.kotu.com", "null"):
            yanit = self.get(duz, {"action": "version"}, HTTP_ORIGIN=koken)
            self.assertNotIn("Access-Control-Allow-Origin", yanit, koken)
        self.assertNotIn("Access-Control-Allow-Origin", self.get(duz, {"action": "version"}))
        # Hata yanıtlarında da izinli kökene başlık gelir (tarayıcı hatayı okuyabilsin).
        yanit = self.client.get(API, {"action": "version"}, HTTP_ORIGIN="https://izinli.example.com")
        self.assertEqual((yanit.status_code, yanit["Access-Control-Allow-Origin"]), (401, "https://izinli.example.com"))

    def test_on_ucus_options(self):
        yanit = self.client.options(
            API, HTTP_ORIGIN="https://izinli.example.com", HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization,content-type",
        )
        self.assertEqual(yanit.status_code, 204)
        self.assertEqual(yanit["Access-Control-Allow-Origin"], "https://izinli.example.com")
        self.assertIn("Authorization", yanit["Access-Control-Allow-Headers"])
        self.assertIn("Content-Type", yanit["Access-Control-Allow-Headers"])
        self.assertIn("POST", yanit["Access-Control-Allow-Methods"])
        self.assertNotIn("Access-Control-Allow-Credentials", yanit)
        kotu = self.client.options(API, HTTP_ORIGIN="https://kotu.example.com", HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST")
        self.assertNotIn("Access-Control-Allow-Origin", kotu)
        self.assertNotIn("Access-Control-Allow-Methods", kotu)

    @override_settings(API_CORS_KOKENLERI=())
    def test_bos_ayarda_cors_yok(self):
        _, duz = self.anahtar_yap()
        yanit = self.get(duz, {"action": "version"}, HTTP_ORIGIN="https://izinli.example.com")
        self.assertNotIn("Access-Control-Allow-Origin", yanit)
        self.assertNotIn("Vary", yanit)
        yanit = self.client.options(API, HTTP_ORIGIN="https://izinli.example.com")
        self.assertNotIn("Access-Control-Allow-Origin", yanit)

    @override_settings(API_CORS_KOKENLERI=("*",))
    def test_yildiz_asla(self):
        _, duz = self.anahtar_yap()
        yanit = self.get(duz, {"action": "version"}, HTTP_ORIGIN="https://herhangi.example.com")
        self.assertNotIn("Access-Control-Allow-Origin", yanit)
