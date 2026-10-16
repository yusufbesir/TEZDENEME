"""Toplu QR içe aktarma (CSV / XLSX) testleri."""
import csv
import io
import zipfile
from datetime import date, datetime, timedelta
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from openpyxl import Workbook

from qr import ice_aktarma as modul
from qr.models import DenetimKaydi, HedefGecmisi, IceAktarma, Kampanya, QRKod, Urun

from .yardimci import TemelTest

ORNEK_CSV = (
    "kod,ad,tur,hedef_url,baslangic,bitis,durum\n"
    "KMP-0001,Sonbahar Kampanyası,kampanya,https://example.com/a,2026-10-01,2026-11-01,aktif\n"
    "KMP-0002,Kış Kampanyası,kampanya,https://example.com/b,2026-11-01,2026-12-31,aktif\n"
    "URN-0001,Ürün Bilgi Sayfası,urun,https://example.com/p1,,,aktif\n"
)
ORNEK_BASLIK = ["kod", "ad", "tur", "hedef_url", "baslangic", "bitis", "durum"]


def istanbul(*a):
    from qr.ice_aktarma import ZAMAN_DILIMI

    return datetime(*a, tzinfo=ZAMAN_DILIMI)


def csv_dosyasi(metin, ad="veri.csv", kodlama="utf-8"):
    return SimpleUploadedFile(ad, metin.encode(kodlama), content_type="text/csv")


def xlsx_dosyasi(satirlar, ad="veri.xlsx"):
    kitap = Workbook()
    sayfa = kitap.active
    for s in satirlar:
        sayfa.append(s)
    tampon = io.BytesIO()
    kitap.save(tampon)
    return SimpleUploadedFile(ad, tampon.getvalue())


class IceAktarmaTabani(TemelTest):
    def yukle(self, dosya, kullanici=None):
        self.giris(kullanici or self.editor)
        yanit = self.client.post("/panel/qr/ice-aktar/yukle", {"dosya": dosya})
        self.assertEqual(yanit.status_code, 302, getattr(yanit, "content", b"")[:300])
        return IceAktarma.objects.order_by("-olusturma").first()

    def uygula(self, ia, guncelle=False):
        veri = {"guncelle": "1"} if guncelle else {}
        return self.client.post(f"/panel/qr/ice-aktar/{ia.pk}/uygula", veri)

    def baslangic_tamam(self, dosya, kullanici=None, guncelle=False):
        ia = self.yukle(dosya, kullanici)
        yanit = self.uygula(ia, guncelle)
        self.assertEqual(yanit.status_code, 302)
        ia.refresh_from_db()
        return ia


class DosyaOkumaTest(IceAktarmaTabani):
    def test_ornek_csv_icerik_aktarilir(self):
        ia = self.baslangic_tamam(csv_dosyasi(ORNEK_CSV))
        self.assertEqual(ia.durum, "tamamlandi")
        self.assertEqual(len(ia.sonuc["olusturulan"]), 3)
        k1 = QRKod.objects.get(kisa_kod="KMP-0001")
        self.assertEqual(k1.baslangic, istanbul(2026, 10, 1))
        self.assertEqual(k1.bitis, istanbul(2026, 11, 2), "bitiş günü dahil: ertesi gün 00:00")
        self.assertEqual(QRKod.objects.get(kisa_kod="KMP-0002").bitis, istanbul(2027, 1, 1))
        u = QRKod.objects.get(kisa_kod="URN-0001")
        self.assertEqual((u.tur, u.baslangic, u.bitis, u.hedef_url), ("urun", None, None, "https://example.com/p1"))
        self.assertEqual(u.olusturan, self.editor)
        self.assertEqual(HedefGecmisi.objects.filter(qr=k1).get().not_metni, "Toplu içe aktarma: veri.csv")

    def test_ornek_xlsx_icerik_aktarilir(self):
        satirlar = [
            ORNEK_BASLIK,
            ["KMP-0001", "Sonbahar Kampanyası", "kampanya", "https://example.com/a", date(2026, 10, 1), datetime(2026, 11, 1), "aktif"],
            ["KMP-0002", "Kış Kampanyası", "kampanya", "https://example.com/b", "2026-11-01", "2026-12-31", "aktif"],
            ["URN-0001", "Ürün Bilgi Sayfası", "urun", "https://example.com/p1", None, None, "aktif"],
        ]
        ia = self.baslangic_tamam(xlsx_dosyasi(satirlar))
        self.assertEqual(len(ia.sonuc["olusturulan"]), 3)
        k1 = QRKod.objects.get(kisa_kod="KMP-0001")
        self.assertEqual(k1.baslangic, istanbul(2026, 10, 1))
        self.assertEqual(k1.bitis, istanbul(2026, 11, 2))
        self.assertIsNone(QRKod.objects.get(kisa_kod="URN-0001").bitis)

    def test_noktalivirgul_ve_bom(self):
        metin = "﻿" + ORNEK_CSV.replace(",", ";")
        ia = self.baslangic_tamam(csv_dosyasi(metin))
        self.assertEqual(len(ia.sonuc["olusturulan"]), 3)

    def test_cp1254_turkce_kodlama(self):
        ia = self.baslangic_tamam(csv_dosyasi(ORNEK_CSV.replace(",", ";"), kodlama="cp1254"))
        self.assertEqual(QRKod.objects.get(kisa_kod="KMP-0002").ad, "Kış Kampanyası")
        self.assertEqual(QRKod.objects.get(kisa_kod="URN-0001").ad, "Ürün Bilgi Sayfası")
        self.assertEqual(len(ia.sonuc["olusturulan"]), 3)

    def test_gecersiz_uzanti_ve_bos_dosya(self):
        self.giris(self.editor)
        for dosya in (SimpleUploadedFile("a.txt", b"x"), csv_dosyasi(""), csv_dosyasi("kod,hedef_url\n"),
                      SimpleUploadedFile("bozuk.xlsx", b"bu xlsx degil")):
            yanit = self.client.post("/panel/qr/ice-aktar/yukle", {"dosya": dosya})
            self.assertEqual(yanit.status_code, 302)
            self.assertEqual(yanit["Location"], "/panel/qr/ice-aktar/")
        self.assertEqual(IceAktarma.objects.count(), 0)

    def test_satir_siniri(self):
        self.giris(self.editor)
        metin = "kod,hedef_url\n" + "".join(f"K{i:03d},https://example.com/{i}\n" for i in range(6))
        with mock.patch.object(modul, "EN_FAZLA_SATIR", 5):
            self.client.post("/panel/qr/ice-aktar/yukle", {"dosya": csv_dosyasi(metin)})
            self.assertEqual(IceAktarma.objects.count(), 0)
            self.client.post("/panel/qr/ice-aktar/yukle", {"dosya": csv_dosyasi(metin.rsplit("\n", 2)[0] + "\n")})
            self.assertEqual(IceAktarma.objects.count(), 1)

    def test_satir_siniri_sabiti_20000(self):
        self.assertEqual(modul.EN_FAZLA_SATIR, 20000)
        veri = "kod,hedef_url\n" + "".join(f"K{i:05d},https://example.com/x\n" for i in range(20001))
        with self.assertRaises(modul.DosyaHatasi):
            modul.dosya_oku("a.csv", veri.encode())
        basliklar, satirlar = modul.dosya_oku("a.csv", veri.rsplit("\n", 2)[0].encode() + b"\n")
        self.assertEqual(len(satirlar), 20000)

    def test_boyut_siniri(self):
        with mock.patch.object(modul, "EN_FAZLA_BAYT", 50):
            with self.assertRaises(modul.DosyaHatasi):
                modul.dosya_oku("a.csv", b"x" * 51)


class EslestirmeTest(IceAktarmaTabani):
    def test_otomatik_esleme_turkce_basliklar(self):
        self.assertEqual(
            modul.otomatik_esleme(["Kısa Kod", "AD", "Hedef URL", "Başlangıç", "BİTİŞ", "Durum", "Ürün Kodu", "Mağaza Adı", "xyz", "Hedef"]),
            ["kod", "ad", "hedef_url", "baslangic", "bitis", "durum", "urun_kodu", "magaza_adi", "", ""],
        )

    def test_farkli_baslik_adlariyla_icerik_aktarma(self):
        metin = "Kısa Kod;Adı;Türü;Hedef URL;Başlangıç;Bitiş;Durum\nFB-001;Ad Bir;Ürün;https://example.com/z;01.10.2026;31.10.2026;Pasif\n"
        ia = self.yukle(csv_dosyasi(metin))
        self.assertEqual(ia.eslesme["alanlar"], ["kod", "ad", "tur", "hedef_url", "baslangic", "bitis", "durum"])
        yanit = self.client.get(f"/panel/qr/ice-aktar/{ia.pk}/eslestir")
        self.assertContains(yanit, 'name="alan_3"')
        self.assertContains(yanit, '<option value="hedef_url" selected>')
        self.uygula(ia)
        q = QRKod.objects.get(kisa_kod="FB-001")
        self.assertEqual((q.tur, q.durum, q.ad), ("urun", "pasif", "Ad Bir"))
        self.assertEqual(q.bitis, istanbul(2026, 11, 1))

    def test_elle_esleme_ve_dogrulama(self):
        ia = self.yukle(csv_dosyasi("a,b,c\nKOD-X1,https://example.com/1,Ad\n"))
        self.assertEqual(ia.eslesme["alanlar"], ["", "", ""])
        # hedef eşleştirilmemiş
        yanit = self.client.post(f"/panel/qr/ice-aktar/{ia.pk}/eslestir", {"alan_0": "kod", "alan_2": "ad"})
        self.assertEqual(yanit.status_code, 200)
        # aynı alan iki kez
        yanit = self.client.post(f"/panel/qr/ice-aktar/{ia.pk}/eslestir", {"alan_0": "kod", "alan_1": "kod", "alan_2": "hedef_url"})
        self.assertEqual(yanit.status_code, 200)
        yanit = self.client.post(f"/panel/qr/ice-aktar/{ia.pk}/eslestir", {"alan_0": "kod", "alan_1": "hedef_url", "alan_2": "ad"})
        self.assertEqual(yanit.status_code, 302)
        self.uygula(ia)
        self.assertEqual(QRKod.objects.get(kisa_kod="KOD-X1").ad, "Ad")

    def test_sayfa_hedefi_ve_iliskili_kayitlar(self):
        self.sayfa_yap("yaz")
        self.kampanya_yap("VAR")
        metin = (
            "kod,sayfa,kampanya_kodu,kampanya_adi,urun_kodu,urun_adi\n"
            "S-001,yaz,VAR,,U-YENI,Yeni Ürün\n"
        )
        ia = self.baslangic_tamam(csv_dosyasi(metin))
        q = QRKod.objects.get(kisa_kod="S-001")
        self.assertEqual((q.hedef_turu, q.sayfa.slug, q.kampanya.kod, q.urun.kod), ("sayfa", "yaz", "VAR", "U-YENI"))
        self.assertEqual(ia.sonuc["iliskili_olusturulan"][0]["kod"], "U-YENI")

    def test_iliskili_kod_yok_ve_ad_yok_hata(self):
        ia = self.baslangic_tamam(csv_dosyasi("kod,hedef_url,urun_kodu\nS-001,https://example.com/a,YOK-1\n"))
        self.assertFalse(QRKod.objects.filter(kisa_kod="S-001").exists())
        self.assertEqual(ia.sonuc["hatali"][0]["alan"], "urun_kodu")
        self.assertFalse(Urun.objects.exists())


class DogrulamaTest(IceAktarmaTabani):
    def hatalari_al(self, metin):
        ia = self.yukle(csv_dosyasi(metin))
        yanit = self.client.get(f"/panel/qr/ice-aktar/{ia.pk}/onizle")
        self.assertEqual(yanit.status_code, 200)
        return ia, yanit

    def test_hatali_url(self):
        metin = "kod,hedef_url\nA-001,javascript:alert(1)\nA-002,http://127.0.0.1\nA-003,https://example.com/ok\n"
        ia, yanit = self.hatalari_al(metin)
        self.assertEqual(yanit.context["hatali_sayisi"], 2)
        self.assertEqual(yanit.context["yeni_sayisi"], 1)
        self.assertEqual([(n, a) for n, a, _ in yanit.context["hatalar"]], [(2, "hedef_url"), (3, "hedef_url")])
        self.uygula(ia)
        self.assertEqual(list(QRKod.objects.values_list("kisa_kod", flat=True)), ["A-003"])
        ia.refresh_from_db()
        self.assertEqual(ia.sonuc["hatali_satir_sayisi"], 2)

    def test_hatali_tarih_ve_bitis_baslangictan_once(self):
        metin = (
            "kod,hedef_url,baslangic,bitis\n"
            "T-001,https://example.com/a,32.13.2026,\n"
            "T-002,https://example.com/a,2026-05-10,2026-05-01\n"
            "T-003,https://example.com/a,2026-05-10 10:00,2026-05-10 09:00\n"
            "T-004,https://example.com/a,2026-05-10,2026-05-10\n"
        )
        ia, yanit = self.hatalari_al(metin)
        hatalar = {(n, a) for n, a, _ in yanit.context["hatalar"]}
        self.assertEqual(hatalar, {(2, "baslangic"), (3, "bitis"), (4, "bitis")})
        self.assertEqual(yanit.context["yeni_sayisi"], 1, "aynı gün başlangıç/bitiş geçerli: bitiş ertesi gün")

    def test_tur_durum_hedef_kod_hatalari(self):
        metin = (
            "kod,hedef_url,tur,durum\n"
            "V-001,https://example.com/a,bilinmez,aktif\n"
            "V-002,https://example.com/a,kampanya,arsiv\n"
            "V-003,,kampanya,aktif\n"
            "V-004,https://example.com/a,Ürün,Aktif\n"
            "bu kod gecersiz!,https://example.com/a,,\n"
        )
        ia, yanit = self.hatalari_al(metin)
        hatalar = {(n, a) for n, a, _ in yanit.context["hatalar"]}
        self.assertEqual(hatalar, {(2, "tur"), (3, "durum"), (4, "hedef_url"), (6, "kod")})
        self.assertEqual(yanit.context["yeni_sayisi"], 1)

    def test_otomatik_kod(self):
        ia = self.baslangic_tamam(csv_dosyasi("kod,hedef_url\n,https://example.com/a\n,https://example.com/b\n"))
        kodlar = [x["kod"] for x in ia.sonuc["olusturulan"]]
        self.assertEqual(len(set(kodlar)), 2)
        self.assertTrue(all(len(k) == 8 for k in kodlar))

    def test_dosya_ici_mukerrer_buyuk_kucuk_harf(self):
        metin = "kod,hedef_url\nABC-1,https://example.com/a\nabc-1,https://example.com/b\nXYZ-9,https://example.com/c\n"
        ia, yanit = self.hatalari_al(metin)
        self.assertEqual(yanit.context["hatali_sayisi"], 2)
        self.assertEqual({n for n, a, _ in yanit.context["hatalar"]}, {2, 3})
        self.uygula(ia)
        self.assertEqual(list(QRKod.objects.values_list("kisa_kod", flat=True)), ["XYZ-9"])

    def test_hata_csv_indirme(self):
        ia, _ = self.hatalari_al("kod,hedef_url\nA-1,javascript:x\n")
        yanit = self.client.get(f"/panel/qr/ice-aktar/{ia.pk}/hatalar.csv")
        self.assertEqual(yanit.status_code, 200)
        satirlar = list(csv.reader(io.StringIO(yanit.content.decode("utf-8-sig")), delimiter=";"))
        self.assertEqual(satirlar[0], ["Satır no", "Alan", "Hata"])
        self.assertEqual(satirlar[1][:2], ["2", "hedef_url"])


class MevcutKodTest(IceAktarmaTabani):
    def setUp(self):
        super().setUp()
        self.mevcut = self.qr_yap("MEV-1", "https://example.com/eski", ad="Eski ad")
        self.metin = "kod,ad,hedef_url\nmev-1,Yeni ad,https://example.com/yeni\nYENI-1,Başka,https://example.com/y\n"

    def test_guncelleme_kapaliyken_dokunulmaz(self):
        ia = self.yukle(csv_dosyasi(self.metin))
        yanit = self.client.get(f"/panel/qr/ice-aktar/{ia.pk}/onizle")
        self.assertEqual(yanit.context["guncelleme_sayisi"], 1)
        self.assertEqual(yanit.context["yeni_sayisi"], 1)
        self.assertContains(yanit, "Mevcut 1 kaydı güncelle")
        self.assertContains(yanit, "https://example.com/eski")
        self.uygula(ia, guncelle=False)
        self.mevcut.refresh_from_db()
        self.assertEqual((self.mevcut.hedef_url, self.mevcut.ad), ("https://example.com/eski", "Eski ad"))
        ia.refresh_from_db()
        self.assertEqual([a["kod"] for a in ia.sonuc["atlanan"]], ["MEV-1"])
        self.assertEqual(len(ia.sonuc["olusturulan"]), 1)
        self.assertEqual(self.mevcut.hedef_gecmisi.count(), 1)

    def test_guncelleme_aciksa_hedef_degisir_ve_gecmis_yazilir(self):
        ia = self.yukle(csv_dosyasi(self.metin))
        self.uygula(ia, guncelle=True)
        self.mevcut.refresh_from_db()
        self.assertEqual((self.mevcut.hedef_url, self.mevcut.ad, self.mevcut.kisa_kod), ("https://example.com/yeni", "Yeni ad", "MEV-1"))
        gecmis = self.mevcut.hedef_gecmisi.order_by("-id").first()
        self.assertEqual(gecmis.eski_hedef_url, "https://example.com/eski")
        self.assertEqual(gecmis.yeni_hedef_url, "https://example.com/yeni")
        self.assertEqual(gecmis.not_metni, "Toplu içe aktarma: veri.csv")
        ia.refresh_from_db()
        self.assertEqual(len(ia.sonuc["guncellenen"]), 1)
        self.assertEqual(self.mevcut.degistiren, self.editor)

    def test_bos_hucre_mevcut_degeri_korur_ve_degisiklik_yoksa_atlanir(self):
        ia = self.baslangic_tamam(csv_dosyasi("kod,ad,hedef_url\nMEV-1,,\n"), guncelle=True)
        self.mevcut.refresh_from_db()
        self.assertEqual((self.mevcut.ad, self.mevcut.hedef_url), ("Eski ad", "https://example.com/eski"))
        self.assertEqual(ia.sonuc["atlanan"][0]["neden"], "Değişiklik yok")

    def test_arsivdeki_kod_guncellenmez(self):
        QRKod.objects.filter(pk=self.mevcut.pk).update(durum="arsiv")
        ia = self.yukle(csv_dosyasi(self.metin))
        yanit = self.client.get(f"/panel/qr/ice-aktar/{ia.pk}/onizle")
        self.assertEqual(yanit.context["hatali_sayisi"], 1)
        self.assertEqual(yanit.context["hatalar"][0][:2], (2, "kod"))
        self.uygula(ia, guncelle=True)
        self.mevcut.refresh_from_db()
        self.assertEqual((self.mevcut.hedef_url, self.mevcut.durum), ("https://example.com/eski", "arsiv"))

    def test_guncelleme_yetkisi_gerekir(self):
        # Ekleme yetkisi olup değiştirme yetkisi olmayan kullanıcı
        from django.contrib.auth.models import Permission

        kullanici = self.kullanici_olustur("sadece_ekler", None)
        kullanici.user_permissions.add(Permission.objects.get(codename="add_qrkod"))
        ia = self.yukle(csv_dosyasi(self.metin), kullanici)
        self.assertEqual(self.uygula(ia, guncelle=True).status_code, 403)
        yanit = self.client.get(f"/panel/qr/ice-aktar/{ia.pk}/onizle")
        self.assertNotContains(yanit, 'name="guncelle"')
        self.assertEqual(self.uygula(ia, guncelle=False).status_code, 302)
        self.mevcut.refresh_from_db()
        self.assertEqual(self.mevcut.hedef_url, "https://example.com/eski")


class UygulamaVeErisimTest(IceAktarmaTabani):
    def test_ayni_icerik_aktarma_iki_kez_uygulanamaz(self):
        ia = self.yukle(csv_dosyasi(ORNEK_CSV))
        self.assertEqual(self.uygula(ia).status_code, 302)
        self.assertEqual(QRKod.objects.count(), 3)
        yanit = self.uygula(ia)
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(QRKod.objects.count(), 3)
        self.assertEqual(DenetimKaydi.objects.filter(eylem="ice_aktarma").count(), 1)
        self.assertEqual(HedefGecmisi.objects.count(), 3)

    def test_iptal_edilen_uygulanamaz(self):
        ia = self.yukle(csv_dosyasi(ORNEK_CSV))
        self.client.post(f"/panel/qr/ice-aktar/{ia.pk}/iptal")
        self.uygula(ia)
        self.assertEqual(QRKod.objects.count(), 0)
        ia.refresh_from_db()
        self.assertEqual(ia.durum, "iptal")

    def test_baskasinin_ice_aktarmasi_404(self):
        ia = self.yukle(csv_dosyasi(ORNEK_CSV), self.editor)
        self.giris(self.yonetici)
        for yol in ("eslestir", "onizle", "hatalar.csv", "sonuc", "rapor.csv", "zip"):
            self.assertEqual(self.client.get(f"/panel/qr/ice-aktar/{ia.pk}/{yol}").status_code, 404, yol)
        for yol in ("uygula", "iptal"):
            self.assertEqual(self.client.post(f"/panel/qr/ice-aktar/{ia.pk}/{yol}").status_code, 404, yol)
        self.assertEqual(QRKod.objects.count(), 0)

    def test_izleyici_ve_anonim_erisemez(self):
        ia = self.yukle(csv_dosyasi(ORNEK_CSV))
        self.giris(self.izleyici)
        self.assertEqual(self.client.get("/panel/qr/ice-aktar/").status_code, 403)
        self.assertEqual(self.client.post("/panel/qr/ice-aktar/yukle", {"dosya": csv_dosyasi(ORNEK_CSV)}).status_code, 403)
        self.assertEqual(self.client.post(f"/panel/qr/ice-aktar/{ia.pk}/uygula").status_code, 403)
        self.assertEqual(self.client.get("/panel/qr/ice-aktar/ornek-ice-aktarma.csv").status_code, 403)
        self.client.logout()
        self.assertEqual(self.client.get("/panel/qr/ice-aktar/").status_code, 302)

    def test_csrf_zorunlu(self):
        from django.test import Client

        c = Client(enforce_csrf_checks=True)
        c.force_login(self.editor)
        self.assertEqual(c.post("/panel/qr/ice-aktar/yukle", {"dosya": csv_dosyasi(ORNEK_CSV)}).status_code, 403)

    def test_get_ile_uygulanamaz(self):
        ia = self.yukle(csv_dosyasi(ORNEK_CSV))
        self.assertEqual(self.client.get(f"/panel/qr/ice-aktar/{ia.pk}/uygula").status_code, 405)

    def test_liste_24_saatten_eski_bekleyenleri_gostermez(self):
        yeni = self.yukle(csv_dosyasi(ORNEK_CSV, ad="yeni.csv"))
        eski = self.yukle(csv_dosyasi(ORNEK_CSV, ad="eski.csv"))
        IceAktarma.objects.filter(pk=eski.pk).update(olusturma=timezone.now() - timedelta(hours=25))
        yanit = self.client.get("/panel/qr/ice-aktar/")
        self.assertContains(yanit, "yeni.csv")
        self.assertNotContains(yanit, "eski.csv")
        self.assertEqual(self.client.get(f"/panel/qr/ice-aktar/{eski.pk}/onizle").status_code, 404)
        self.assertEqual(self.uygula(eski).status_code, 404)
        self.assertEqual(QRKod.objects.count(), 0)
        self.assertEqual(yeni.durum, "bekliyor")

    def test_hata_olursa_hicbir_sey_yazilmaz(self):
        ia = self.yukle(csv_dosyasi(ORNEK_CSV))
        gercek = QRKod.full_clean
        sayac = {"n": 0}

        def bozuk(self, *a, **k):
            sayac["n"] += 1
            if sayac["n"] > 3:  # çözümleme aşamasından sonra, kayıt sırasında ikinci kodda patla
                from django.core.exceptions import ValidationError
                raise ValidationError("sahte hata")
            return gercek(self, *a, **k)

        with mock.patch.object(QRKod, "full_clean", bozuk):
            self.uygula(ia)
        self.assertEqual(QRKod.objects.count(), 0)
        ia.refresh_from_db()
        self.assertEqual(ia.durum, "bekliyor")

    def test_denetim_kaydi_ve_sonuc_raporu(self):
        self.qr_yap("KMP-0001", "https://example.com/eski")
        ia = self.baslangic_tamam(csv_dosyasi(ORNEK_CSV + "BAD-1,Kötü,kampanya,ftp://x,,,aktif\n"))
        kayit = DenetimKaydi.objects.get(eylem="ice_aktarma")
        self.assertEqual(kayit.kullanici, self.editor)
        self.assertEqual(kayit.nesne_id, str(ia.pk))
        for parca in ("veri.csv", "oluşturulan 2", "güncellenen 0", "atlanan 1", "hatalı 1"):
            self.assertIn(parca, kayit.ozet)
        yanit = self.client.get(f"/panel/qr/ice-aktar/{ia.pk}/sonuc")
        self.assertContains(yanit, "oluşturuldu")
        rapor = self.client.get(f"/panel/qr/ice-aktar/{ia.pk}/rapor.csv")
        satirlar = list(csv.reader(io.StringIO(rapor.content.decode("utf-8-sig")), delimiter=";"))
        sonuclar = {s[1] or s[0]: s[2] for s in satirlar[1:]}
        self.assertEqual(sonuclar["KMP-0002"], "Oluşturuldu")
        self.assertEqual(sonuclar["KMP-0001"], "Atlandı")
        self.assertEqual(sonuclar["5"], "Hatalı")

    def test_zip_icerigi(self):
        self.qr_yap("DIS-1", "https://example.com/d")
        ia = self.baslangic_tamam(csv_dosyasi(ORNEK_CSV))
        yanit = self.client.get(f"/panel/qr/ice-aktar/{ia.pk}/zip")
        self.assertEqual(yanit["Content-Type"], "application/zip")
        self.assertIn("ice-aktarma-", yanit["Content-Disposition"])
        arsiv = zipfile.ZipFile(io.BytesIO(yanit.content))
        self.assertEqual(
            sorted(arsiv.namelist()),
            sorted([f"{k}.{u}" for k in ("KMP-0001", "KMP-0002", "URN-0001") for u in ("png", "svg")] + ["liste.csv"]),
        )
        self.assertTrue(arsiv.read("KMP-0001.png").startswith(b"\x89PNG"))
        satirlar = list(csv.reader(io.StringIO(arsiv.read("liste.csv").decode("utf-8-sig")), delimiter=";"))
        self.assertEqual(len(satirlar), 4)

    def test_ornek_dosyalari(self):
        self.giris(self.editor)
        c = self.client.get("/panel/qr/ice-aktar/ornek-ice-aktarma.csv")
        self.assertIn("ornek-ice-aktarma.csv", c["Content-Disposition"])
        satirlar = list(csv.reader(io.StringIO(c.content.decode("utf-8-sig")), delimiter=";"))
        self.assertEqual(satirlar[0], ORNEK_BASLIK)
        self.assertEqual(satirlar[1][:2], ["KMP-0001", "Sonbahar Kampanyası"])
        self.assertEqual(len(satirlar), 4)
        x = self.client.get("/panel/qr/ice-aktar/ornek-ice-aktarma.xlsx")
        self.assertIn("ornek-ice-aktarma.xlsx", x["Content-Disposition"])
        # Örnek dosyaların kendisi geri yüklenebilir
        ia = self.baslangic_tamam(SimpleUploadedFile("ornek.xlsx", x.content))
        self.assertEqual(len(ia.sonuc["olusturulan"]), 3)


class CsvAyracTest(TemelTest):
    def test_disa_aktarma_noktalivirgul_bom_ve_kacis(self):
        self.qr_yap("CSV-1", "https://example.com/a", ad="=cmd;x")
        self.giris(self.izleyici)
        yanit = self.client.get("/panel/qr/disa-aktar?bicim=csv")
        self.assertTrue(yanit.content.startswith(b"\xef\xbb\xbf"))
        ilk = yanit.content.decode("utf-8-sig").splitlines()[0]
        self.assertTrue(ilk.startswith("Kısa kod;Ad;Başlık;Tür;"))
        satirlar = list(csv.reader(io.StringIO(yanit.content.decode("utf-8-sig")), delimiter=";"))
        self.assertEqual(satirlar[1][1], "'=cmd;x")
