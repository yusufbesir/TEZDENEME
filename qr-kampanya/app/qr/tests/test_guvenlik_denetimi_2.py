"""Güvenlik denetimi 2: kalan bulgular.

1) 0010 geri alma güvenliği, 2) 0012 geri alma koruması, 3) başlık çekme portları ve kendi alan adı kuralı,
4) Caddy günlük filtresi, 5) ağ çağrısı/kilit sırası ve açıklamalar, 6) herkese açık kod istatistiği (pencere, eşik, önbellek),
7) yardım metni, 8) sensitive_post_parameters. Testlerde dış ağ KULLANILMAZ."""
from datetime import timedelta
from pathlib import Path
from unittest import mock

import pyotp
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.db.migrations.exceptions import IrreversibleError
from django.test import SimpleTestCase, override_settings
from django.utils import timezone

from qr import baslik_cek as bc
from qr.dogrulama import guvenli_url_dogrula, kendi_l_adresi_mi, url_gecerli_mi
from qr.models import GenelAyarlar, LinkAgaci, LinkAgaciOgesi, MFACihazi, QRKod, Tarama
from qr.panel.formlar import QRKodForm

from .test_yourls_ozellikleri_3a import GENEL, SahteYanit, baglanti_yamasi, html_sayfa, sahte_dns
from .yardimci import PAROLA, TemelTest

ONCEKI_0009 = ("qr", "0009_yourls_ozellikleri_3a")
ONCEKI_0011 = ("qr", "0011_yourls_ozellikleri_4")


# --- 1 ve 2. Geri alma güvenliği (gerçek veritabanı) ---

class GeriAlmaTemel(TemelTest):
    """TestCase işlemi içinde çalışır: PostgreSQL DDL'i işlemseldir, test sonunda hem şema hem veri geri sarılır, bu yüzden
    test veritabanı kesinlikle en son duruma döner (ayrıca testler kendi sonlarında da ileri migrasyonu doğrular)."""

    def setUp(self):
        super().setUp()
        with connection.cursor() as imle:  # bekleyen ertelenmiş kısıt olayları ALTER TABLE'ı engellemesin
            imle.execute("SET CONSTRAINTS ALL IMMEDIATE")

    def gec(self, hedef):
        yurutucu = MigrationExecutor(connection)
        yurutucu.migrate([hedef])

    def son_duruma_getir(self):
        yurutucu = MigrationExecutor(connection)
        yurutucu.migrate(yurutucu.loader.graph.leaf_nodes())
        self.assertFalse(MigrationExecutor(connection).migration_plan(MigrationExecutor(connection).loader.graph.leaf_nodes()))

    def sutunlar(self, tablo):
        with connection.cursor() as imle:
            return {c.name for c in connection.introspection.get_table_description(imle, tablo)}

    def tablolar(self):
        return set(connection.introspection.table_names())

    def sql(self, sorgu, *par):
        with connection.cursor() as imle:
            imle.execute(sorgu, par)
            return imle.fetchall()

    def kisitin_tanimi(self):
        return self.sql("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'qr_hedef_tutarli'")[0][0]


class Migrasyon0010GeriAlmaTesti(GeriAlmaTemel):
    def kod(self, kod, durum, onceki="", hedef="https://example.com/x"):
        qr = self.qr_yap(kod)
        QRKod.objects.filter(pk=qr.pk).update(durum=durum, onceki_durum=onceki, hedef_url=hedef)
        return qr

    def test_butun_cop_satirlari_pasife_doner_ve_ileri_gidilince_bozulmaz(self):
        self.kod("AKT-1", "aktif")
        self.kod("COP-AKT", "cop", "aktif")
        self.kod("COP-PAS", "cop", "pasif")
        self.kod("COP-ARS", "cop", "arsiv")
        self.kod("COP-BOS", "cop", "")
        self.kod("COP-COP", "cop", "cop")
        self.kod("COP-ACAYIP", "cop", "xyz")
        self.assertIn("cop", self.kisitin_tanimi())  # güncel kısıt çöpü istisna sayar

        self.gec(ONCEKI_0009)

        beklenen = {
            "AKT-1": "aktif", "COP-AKT": "pasif", "COP-PAS": "pasif", "COP-ARS": "pasif", "COP-BOS": "pasif",
            "COP-COP": "pasif", "COP-ACAYIP": "pasif",
        }
        self.assertEqual(dict(self.sql("SELECT kisa_kod, durum FROM qr_qrkod")), beklenen)
        self.assertFalse(self.sql("SELECT 1 FROM qr_qrkod WHERE durum = 'cop'"), "geri alma sonrası 'cop' satırı kalmamalı")
        self.assertNotIn("onceki_durum", self.sutunlar("qr_qrkod"))
        self.assertNotIn("cop", self.kisitin_tanimi())  # eski kısıt geri geldi

        self.son_duruma_getir()
        self.assertIn("onceki_durum", self.sutunlar("qr_qrkod"))
        self.assertIn("cop", self.kisitin_tanimi())
        self.assertEqual(QRKod.objects.get(kisa_kod="COP-AKT").durum, "pasif")  # ileri yön veriyi değiştirmez
        self.assertEqual(QRKod.objects.count(), len(beklenen))

    def test_kisiti_bozacak_satir_varsa_hicbir_sey_degismeden_durur(self):
        self.kod("COP-TAMAM", "cop", "aktif")
        self.kod("COP-BOZUK", "cop", "aktif", hedef="")  # pasif'e dönecek ama hedefi boş: eski kısıt ihlali
        with self.assertRaises(IrreversibleError) as baglam:
            self.gec(ONCEKI_0009)
        self.assertIn("COP-BOZUK", str(baglam.exception))
        self.assertIn("hiçbir satır değiştirilmedi", str(baglam.exception))
        # 0010 adımı geri sarıldı: alanlar ve çöp durumları yerinde.
        self.assertIn("onceki_durum", self.sutunlar("qr_qrkod"))
        self.assertEqual(
            dict(self.sql("SELECT kisa_kod, durum FROM qr_qrkod WHERE kisa_kod LIKE 'COP-%%'")),
            {"COP-TAMAM": "cop", "COP-BOZUK": "cop"},
        )
        self.assertIn("cop", self.kisitin_tanimi())
        self.son_duruma_getir()

    def test_operations_siralamasi_geri_adim_kisitten_ve_alan_kaldirmadan_once(self):
        """Geri yön ters sırada işlendiği için RunPython, onceki_durum eklenen AddField'dan SONRA ve eski kısıtı
        geri getiren RemoveConstraint'ten SONRA listelenmelidir."""
        from django.db import migrations

        yurutucu = MigrationExecutor(connection)
        islemler = yurutucu.loader.get_migration(*("qr", "0010_yourls_ozellikleri_3b")).operations
        ad = [(type(o).__name__, getattr(o, "name", None)) for o in islemler]
        konum = [i for i, o in enumerate(islemler) if isinstance(o, migrations.RunPython)]
        self.assertEqual(len(konum), 1)
        self.assertGreater(konum[0], ad.index(("AddField", "onceki_durum")))
        self.assertGreater(konum[0], ad.index(("RemoveConstraint", "qr_hedef_tutarli")))
        self.assertLess(konum[0], ad.index(("AddConstraint", None)))
        self.assertIs(islemler[konum[0]].code, migrations.RunPython.noop)  # ileri yön işlem yapmaz
        self.assertTrue(callable(islemler[konum[0]].reverse_code))


class Migrasyon0012GeriAlmaTesti(GeriAlmaTemel):
    def tetikleyici_var_mi(self):
        return bool(self.sql("SELECT 1 FROM pg_trigger WHERE tgname = 'qr_linkagaci_silme_engeli'"))

    def test_agac_varsa_geri_alma_durur_ve_hicbir_sey_silinmez(self):
        agac = LinkAgaci.objects.create(slug="silinmesin", baslik="Silinmesin")
        with self.assertRaises(IrreversibleError) as baglam:
            self.gec(ONCEKI_0011)
        self.assertIn("hiçbir şey silinmedi", str(baglam.exception))
        self.assertTrue({"qr_linkagaci", "qr_linkagaciogesi", "qr_linkagacigoruntuleme"} <= self.tablolar())
        self.assertTrue(self.tetikleyici_var_mi(), "silme tetikleyicisi düşürülmeden önce durulmalı")
        self.assertTrue(LinkAgaci.objects.filter(pk=agac.pk).exists())
        self.son_duruma_getir()

    def test_oge_varsa_da_durur(self):
        agac = LinkAgaci.objects.create(slug="ogeli-agac", baslik="Ağaç")
        LinkAgaciOgesi.objects.create(agac=agac, qr=self.qr_yap("OGE-1"), etiket="Site")
        with self.assertRaises(IrreversibleError):
            self.gec(ONCEKI_0011)
        self.assertEqual(LinkAgaciOgesi.objects.count(), 1)
        self.assertTrue(self.tetikleyici_var_mi())
        self.son_duruma_getir()

    def test_tablolar_bossa_geri_alinir_ve_tekrar_ileri_gidilir(self):
        self.gec(ONCEKI_0011)
        self.assertFalse({"qr_linkagaci", "qr_linkagaciogesi"} & self.tablolar())
        self.son_duruma_getir()
        self.assertTrue({"qr_linkagaci", "qr_linkagaciogesi", "qr_linkagacigoruntuleme"} <= self.tablolar())
        self.assertTrue(self.tetikleyici_var_mi())

    def test_belge_uyarisi_var(self):
        metin = (Path(__file__).resolve().parents[3] / "docs" / "BAKIM.md")
        if not metin.is_file():
            self.skipTest("docs/BAKIM.md bulunamadı (Docker testi)")
        icerik = metin.read_text(encoding="utf-8")
        self.assertIn("Migration geri alma", icerik)
        self.assertIn("0010", icerik)
        self.assertIn("0012", icerik)


# --- 3. Başlık çekme portları ve kendi alan adı kuralı ---

class BaslikPortTesti(SimpleTestCase):
    def calistir(self, url, *yanitlar):
        yama, cagrilar = baglanti_yamasi(*(yanitlar or (SahteYanit(govde=html_sayfa("Tamam")),)))
        with sahte_dns({"ornek.example.com": [GENEL]}), yama:
            return bc.sayfa_basligi(url), cagrilar

    def test_yalniz_80_ve_443(self):
        self.assertEqual(self.calistir("http://ornek.example.com/")[0], "Tamam")
        self.assertEqual(self.calistir("https://ornek.example.com/")[0], "Tamam")
        self.assertEqual(self.calistir("http://ornek.example.com:80/")[0], "Tamam")
        sonuc, cagrilar = self.calistir("https://ornek.example.com:443/x")
        self.assertEqual((sonuc, cagrilar), ("Tamam", [(GENEL, "ornek.example.com", 443, True)]))

    def test_diger_portlar_baglanti_kurulmadan_reddedilir(self):
        for url in (
            "http://ornek.example.com:8080/", "https://ornek.example.com:8443/", "http://ornek.example.com:22/",
            "http://ornek.example.com:6379/",
            "http://ornek.example.com:0/", "http://ornek.example.com:99999/",
        ):
            with self.subTest(url=url):
                sonuc, cagrilar = self.calistir(url)
                self.assertEqual((sonuc, cagrilar), ("", []))

    def test_yonlendirme_adimlarinda_da_port_denetlenir(self):
        sonuc, cagrilar = self.calistir(
            "http://ornek.example.com/",
            SahteYanit(durum=302, konum="http://ornek.example.com:8080/gizli"), SahteYanit(govde=html_sayfa("Sızdı")),
        )
        self.assertEqual(sonuc, "")
        self.assertEqual(len(cagrilar), 1, "yönlendirmenin gittiği izinsiz porta bağlanılmamalı")
        # İzinli porta yönlendirme sürer.
        sonuc, cagrilar = self.calistir(
            "http://ornek.example.com/",
            SahteYanit(durum=301, konum="https://ornek.example.com:443/yeni"), SahteYanit(govde=html_sayfa("Yeni")),
        )
        self.assertEqual((sonuc, [c[2] for c in cagrilar]), ("Yeni", [80, 443]))


KISA = "https://kisa.example.com"


@override_settings(KISA_URL_TABANI=KISA)
class KendiAlanAdiKuraliTesti(TemelTest):
    def test_yalniz_l_ve_s_yollari_kabul(self):
        for iyi in (
            f"{KISA}/l/benim-linklerim", f"{KISA}/s/yaz-kampanyasi", f"{KISA}/s/yaz-kampanyasi?utm_source=x",
            "https://example.com/k/ABC123", "https://example.com/panel/", "https://baska.kisa.example.com/k/ABC",
        ):
            with self.subTest(url=iyi):
                guvenli_url_dogrula(iyi)

    def test_ic_yollar_reddedilir(self):
        for kotu in (
            f"{KISA}/k/ABC123", f"{KISA}/k/ABC123+", f"{KISA}/panel/", f"{KISA}/panel/qr/", f"{KISA}/api/v1/", f"{KISA}/ic/medya-yetki",
            f"{KISA}/admin/", f"{KISA}/saglik", f"{KISA}/robots.txt", f"{KISA}/", KISA, f"{KISA}/medya/x.png",
            f"{KISA}/l/", f"{KISA}/l/ab", f"{KISA}/l/abc/stil.css", f"{KISA}/s/", f"{KISA}/s/a/b", f"{KISA}/s/../panel/",
            f"{KISA}/s/%2e%2e/panel/", f"{KISA}/L/abc", f"{KISA}//k/ABC",
            "http://kisa.example.com/k/ABC", "https://KISA.example.com/k/ABC", "https://kisa.example.com./k/ABC",
            "https://kisa.example.com:8443/k/ABC", "https://kisa.example.com/l/abc?x=1",
        ):
            with self.subTest(url=kotu), self.assertRaises(ValidationError):
                guvenli_url_dogrula(kotu)

    def test_form_yeni_kayitta_reddeder(self):
        self.giris(self.editor)
        for hedef in (f"{KISA}/k/ABC123", f"{KISA}/panel/"):
            yanit = self.client.post("/panel/kisalt/", {"hedef_url": hedef})
            self.assertEqual(yanit.status_code, 200, hedef)
        self.assertFalse(QRKod.objects.filter(tur="link").exists())
        yanit = self.client.post("/panel/kisalt/", {"hedef_url": f"{KISA}/s/yaz-kampanyasi", "kisa_kod": "KAMP-1"})
        self.assertEqual(yanit.status_code, 302)

    def test_mevcut_kayit_degismez_ve_calisma_zamani_denetimi_sikilastirilmaz(self):
        """Eski kayıt (kural öncesi) veritabanında olduğu gibi kalır; yönlendirme/rapor denetimi (url_gecerli_mi) onu reddetmez."""
        qr = self.qr_yap("ESKI-1", "https://example.com/gecici")
        QRKod.objects.filter(pk=qr.pk).update(hedef_url=f"{KISA}/k/BASKA")
        self.assertEqual(QRKod.objects.get(pk=qr.pk).hedef_url, f"{KISA}/k/BASKA")
        self.assertTrue(url_gecerli_mi(f"{KISA}/k/BASKA"))
        with self.assertRaises(ValidationError):  # yeniden doğrulama (düzenleme) ise reddeder
            QRKod.objects.get(pk=qr.pk).full_clean()

    def test_baslik_cekme_kendi_adrese_gitmez(self):
        yama, cagrilar = baglanti_yamasi(SahteYanit(govde=html_sayfa("Kendi")))
        with sahte_dns({"kisa.example.com": [GENEL]}), yama:
            self.assertEqual(bc.sayfa_basligi(f"{KISA}/k/ABC123"), "")
        self.assertEqual(cagrilar, [])


@override_settings(KISA_URL_TABANI="https://qr.ornek.com")
class UnicodeAnaMakineTesti(SimpleTestCase):
    """Tarayıcı UTS46 ile bu yazımları qr.ornek.com'a eşler; doğrulama da aynı normalizasyonla karşılaştırır."""

    def test_unicode_benzeri_ana_makineler_reddedilir(self):
        for kotu in (
            "https://qr.ornek\u3002com/k/x", "https://qr\uff61ornek.com/k/x", "https://qr.ornek\uff0ecom/k/x",
            "https://\uff51r.ornek.com/k/x", "https://QR\uff0eORNEK\u3002COM./panel/", "https://\uff31R.ornek.com/api/v1/",
            "https://qr.ornek.com\uff0e/k/x",
        ):
            with self.subTest(url=kotu), self.assertRaises(ValidationError):
                guvenli_url_dogrula(kotu)

    def test_ayni_makineye_izinli_yollar_unicode_yazimda_da_kabul(self):
        guvenli_url_dogrula("https://qr.ornek\u3002com/l/benim-linklerim")
        guvenli_url_dogrula("https://QR\uff0eORNEK.com/s/yaz-kampanyasi")

    def test_turkce_idn_kabul_edilir(self):
        guvenli_url_dogrula("https://örnek.com.tr/x")
        guvenli_url_dogrula("https://qr.örnek.com/k/x")  # kendi alanımız değil

    def test_tabani_idn_olan_site(self):
        with override_settings(KISA_URL_TABANI="https://qr.örnek.com"):
            for kotu in ("https://qr.xn--rnek-4qa.com/k/x", "https://QR\uff0eÖRNEK.com/k/x", "https://qr.örnek\u3002com/panel/"):
                with self.subTest(url=kotu), self.assertRaises(ValidationError):
                    guvenli_url_dogrula(kotu)
            guvenli_url_dogrula("https://qr.xn--rnek-4qa.com/l/abc")

    def test_yerel_ad_kontrolu_de_normalize_eder(self):
        for kotu in ("https://\uff4cocalhost/", "https://ornek\u3002local/", "https://foo\uff0einternal/"):
            with self.subTest(url=kotu), self.assertRaises(ValidationError):
                guvenli_url_dogrula(kotu)

    def test_l_istisnasi_normalize_eder(self):
        with override_settings(KISA_URL_TABANI="http://localhost:8000"):
            self.assertTrue(kendi_l_adresi_mi("http://\uff4cocalhost:8000/l/abc"))
            self.assertFalse(kendi_l_adresi_mi("http://\uff4cocalhost:8000/k/abc"))
            self.assertFalse(kendi_l_adresi_mi("http://localhost:8001/l/abc"))
        self.assertTrue(kendi_l_adresi_mi("https://qr\u3002ornek.com/l/abc"))

    def test_normalize_edilemeyen_ana_makine_reddedilir(self):
        for kotu in ("https://" + "a" * 70 + ".com/x", "https://a..b.com/x"):
            with self.subTest(url=kotu), self.assertRaises(ValidationError):
                guvenli_url_dogrula(kotu)


# --- 4. Caddy günlük filtresi ---

class CaddyGunlukTesti(SimpleTestCase):
    def test_sorgu_filtresi_hassas_parametreleri_siler(self):
        yol = Path(__file__).resolve().parents[3] / "caddy" / "Caddyfile"
        if not yol.is_file():
            self.skipTest("Caddyfile bulunamadı (Docker testi)")
        metin = yol.read_text(encoding="utf-8")
        self.assertIn("request>uri query {", metin)
        blok = metin.split("request>uri query {", 1)[1].split("}", 1)[0]
        silinen = {s.split()[1] for s in blok.splitlines() if s.strip().startswith("delete ")}
        self.assertEqual(silinen, {"password", "totp", "api_key", "key", "url", "baslik"})


# --- 5. Ağ çağrısı sırası ---

class AgCagrisiSirasiTesti(TemelTest):
    def test_baslik_cekme_form_dogrulamasinda_yapilir_save_icinde_degil(self):
        veri = {"tur": "kampanya", "hedef_turu": "harici", "hedef_url": "https://example.com/yeni", "durum": "aktif", "kisa_kod": "SIRA-1"}
        self.baslik_yamasi.return_value = "Çekilen"
        form = QRKodForm(veri)
        self.assertTrue(form.is_valid(), form.errors)
        self.baslik_yamasi.assert_called_once_with("https://example.com/yeni")
        self.baslik_yamasi.reset_mock()
        qr = form.save(commit=False)
        self.baslik_yamasi.assert_not_called()
        self.assertEqual(qr.baslik, "Çekilen")

    def test_ag_cagrisi_atomic_blok_ve_kilit_disinda(self):
        """Başlık çekilirken açık veritabanı işlemi (atomic) yoktur; sıralı kod sayacı ise başlıktan SONRA ayrılır."""
        olaylar = []

        def sahte_baslik(url):
            olaylar.append(("ag", connection.in_atomic_block))
            return "Başlık"

        gercek_ayir = __import__("qr.servisler", fromlist=["sirali_kod_ayir"]).sirali_kod_ayir

        def izleyici(*a, **k):
            olaylar.append(("kod", None))
            return gercek_ayir(*a, **k)

        ayar = GenelAyarlar.al()
        ayar.kod_uretim_bicimi = "sirali"
        ayar.save()
        self.giris(self.yonetici)
        agac = LinkAgaci.objects.create(slug="sira-agaci", baslik="Ağaç", durum="yayinda")
        with mock.patch("qr.baslik_cek.sayfa_basligi", side_effect=sahte_baslik), \
                mock.patch("qr.panel.formlar.sirali_kod_ayir", side_effect=izleyici):
            yanit = self.client.post(f"/panel/link-agaclari/{agac.pk}/oge-ekle", {"url": "https://example.com/uzun", "etiket": ""})
        self.assertEqual(yanit.status_code, 302)
        adlar = [o[0] for o in olaylar]
        self.assertEqual(adlar, ["ag", "kod"], "başlık çekme koddan ÖNCE yapılmalı")
        # TestCase tüm testi saran bir atomic içinde çalışır; savepoint sayısı artmamalı: çağrı sırasında ek atomic yok.
        self.assertTrue(agac.ogeler.exists())

    def test_aciklamalar_gercegi_soyler(self):
        kok = Path(__file__).resolve().parents[1] / "panel"
        for ad in ("link_agaci.py", "qrler.py"):
            metin = (kok / ad).read_text(encoding="utf-8")
            self.assertNotIn("ASLA çağırmaz", metin, ad)
            self.assertIn("başlık", metin[:1500].lower(), ad)


# --- 6. Herkese açık kod istatistiği ---

class KodIstatistikGizlilikTesti(TemelTest):
    def setUp(self):
        super().setUp()
        a = GenelAyarlar.al()
        a.herkese_acik_istatistik = True
        a.save()
        self.qr = self.qr_yap("ABC123", "https://hedef.example/yol")
        self.simdi = timezone.now()

    def tara(self, adet, gun_once=0, **ek):
        for _ in range(adet):
            Tarama.objects.create(
                qr=self.qr, sonuc="yonlendi", cihaz="mobil", zaman=self.simdi - timedelta(days=gun_once), **ek,
            )

    def test_esik_alti_tablolar_gosterilmez_yalniz_toplam(self):
        self.tara(9, yonlendiren="gizli.example", ulke="TR")
        yanit = self.client.get("/k/ABC123+")
        self.assertEqual(yanit.status_code, 200)
        self.assertEqual(yanit.context["toplam"], 9)
        self.assertNotContains(yanit, "gizli.example")
        self.assertNotContains(yanit, "Yönlendiren siteler")
        self.assertNotContains(yanit, "Ülkeler")
        self.assertFalse(yanit.context["tablolar_acik"])

    def test_esikte_tablolar_gorunur(self):
        self.tara(10, yonlendiren="gorunur.example", ulke="TR")
        yanit = self.client.get("/k/ABC123+")
        self.assertContains(yanit, "gorunur.example")
        self.assertContains(yanit, "Yönlendiren siteler")

    def test_tablolar_yalniz_son_30_gunden(self):
        self.tara(10, gun_once=2, yonlendiren="yeni.example", ulke="TR")
        self.tara(40, gun_once=45, yonlendiren="eski.example", ulke="US")
        yanit = self.client.get("/k/ABC123+")
        self.assertEqual(yanit.context["toplam"], 50)  # toplam sayı tüm zamanlar
        self.assertContains(yanit, "yeni.example")
        self.assertNotContains(yanit, "eski.example")
        self.assertEqual([s["deger"] for s in yanit.context["ulkeler"]], ["TR"])

    def test_eski_tarama_penceredeki_esigi_doldurmaz(self):
        self.tara(5, gun_once=1, yonlendiren="yeni.example")
        self.tara(30, gun_once=60, yonlendiren="eski.example")
        yanit = self.client.get("/k/ABC123+")
        self.assertEqual(yanit.context["toplam"], 35)
        self.assertNotContains(yanit, "yeni.example")
        self.assertNotContains(yanit, "eski.example")

    def test_botlar_esige_sayilmaz(self):
        self.tara(5, yonlendiren="insan.example")
        for _ in range(20):
            Tarama.objects.create(qr=self.qr, sonuc="yonlendi", cihaz="bot", bot=True, zaman=self.simdi, yonlendiren="bot.example")
        yanit = self.client.get("/k/ABC123+")
        self.assertNotContains(yanit, "insan.example")
        self.assertNotContains(yanit, "bot.example")

    def test_all_sayfasi_ayni_kurallar(self):
        self.tara(9, yonlendiren="gizli.example")
        self.assertNotContains(self.client.get("/k/ABC123+all"), "gizli.example")
        self.tara(1, yonlendiren="gizli.example")
        cache.clear()
        self.assertContains(self.client.get("/k/ABC123+all"), "gizli.example")

    def test_sonuc_60_sn_onbelleklenir(self):
        self.tara(10, yonlendiren="a.example")
        self.assertEqual(self.client.get("/k/ABC123+").context["toplam"], 10)
        self.tara(5, yonlendiren="a.example")
        self.assertEqual(self.client.get("/k/ABC123+").context["toplam"], 10, "60 sn içinde önbellekten gelmeli")
        # +all ayrı anahtar kullanır.
        self.assertEqual(self.client.get("/k/ABC123+all").context["toplam"], 15)
        cache.clear()
        self.assertEqual(self.client.get("/k/ABC123+").context["toplam"], 15)

    def test_onbellek_suresi_60_sn(self):
        with mock.patch("qr.kod_istatistik.cache") as sahte:
            sahte.get.return_value = None
            self.client.get("/k/ABC123+")
        self.assertEqual(sahte.set.call_args.args[2], 60)

    def test_onbellek_ayar_denetimini_atlatmaz(self):
        self.tara(10, yonlendiren="a.example")
        self.assertEqual(self.client.get("/k/ABC123+").status_code, 200)
        a = GenelAyarlar.al()
        a.herkese_acik_istatistik = False
        a.save()
        self.assertEqual(self.client.get("/k/ABC123+").status_code, 404)
        a.herkese_acik_istatistik = True
        a.istatistikte_hedef_goster = False
        a.save()
        self.assertNotContains(self.client.get("/k/ABC123+"), "hedef.example")
        a.istatistikte_hedef_goster = True
        a.save()
        self.assertContains(self.client.get("/k/ABC123+"), "hedef.example")  # hedef ayarı önbellekten bağımsız


# --- 7. Yardım metni ---

class KodYardimMetniTesti(TemelTest):
    def yardim(self):
        return QRKodForm().fields["kisa_kod"].help_text

    def test_rastgele_modda_tahmin_edilmesi_zor(self):
        self.assertIn("tahmin edilmesi zor", self.yardim())

    def test_sirali_modda_dogru_metin(self):
        a = GenelAyarlar.al()
        a.kod_uretim_bicimi = "sirali"
        a.save()
        metin = self.yardim()
        self.assertNotIn("tahmin edilmesi zor", metin)
        self.assertIn("sıradaki kod", metin)
        self.assertIn("tahmin edilebilir", metin)


# --- 8. sensitive_post_parameters ---

class HassasAlanlarTesti(TemelTest):
    def test_parola_degistir(self):
        self.giris(self.editor)
        yanit = self.client.post("/panel/hesap/parola", {"old_password": "x", "new_password1": "y", "new_password2": "y"})
        self.assertEqual(
            set(yanit.wsgi_request.sensitive_post_parameters), {"old_password", "new_password1", "new_password2"}
        )

    def test_mfa_kod_dogrulama_gorunumleri(self):
        MFACihazi.objects.create(kullanici=self.editor, gizli_anahtar=pyotp.random_base32(), onayli=True)
        with override_settings(MFA_ZORUNLU=True):
            self.client.post("/panel/giris", {"username": "editor", "password": PAROLA})
            yanit = self.client.post("/panel/mfa/dogrula", {"kod": "000000"})
            self.assertEqual(yanit.wsgi_request.sensitive_post_parameters, ("kod",))
        self.client.logout()
        self.giris(self.editor)
        yanit = self.client.post("/panel/hesap/mfa/sifirla", {"kod": "000000"})
        self.assertEqual(yanit.wsgi_request.sensitive_post_parameters, ("kod",))

    def test_mfa_kurulum_gorunumu(self):
        self.giris(self.editor)
        yanit = self.client.post("/panel/hesap/mfa/kur", {"kod": "000000"})
        self.assertEqual(yanit.wsgi_request.sensitive_post_parameters, ("kod",))

    def test_girisli_kurulum_gorunumu(self):
        with override_settings(MFA_ZORUNLU=True):
            self.client.post("/panel/giris", {"username": "editor", "password": PAROLA})
            yanit = self.client.post("/panel/mfa/kurulum", {"kod": "000000"})
            self.assertEqual(yanit.wsgi_request.sensitive_post_parameters, ("kod",))
