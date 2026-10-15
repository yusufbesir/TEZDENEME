"""Yetkilendirme, CSRF, giriş kilidi ve kullanıcı yönetimi."""
from django.contrib.auth import SESSION_KEY
from django.test import Client, override_settings

from qr.models import DenetimKaydi, GenelAyarlar, QRKod

from .yardimci import PAROLA, TemelTest

KORUMALI_YOLLAR = [
    "/panel/", "/panel/qr/", "/panel/qr/yeni", "/panel/kampanyalar/", "/panel/urunler/", "/panel/magazalar/",
    "/panel/sayfalar/", "/panel/ayarlar", "/panel/kullanicilar/", "/panel/denetim/", "/panel/rapor/istatistik",
    "/panel/rapor/hatali", "/panel/qr/disa-aktar",
]
QR_VERISI = {"tur": "kampanya", "hedef_turu": "harici", "hedef_url": "https://example.com/x", "durum": "aktif"}


class YetkiTesti(TemelTest):
    def test_girissiz_erisim_giris_sayfasina_yonlenir(self):
        for yol in KORUMALI_YOLLAR:
            with self.subTest(yol=yol):
                yanit = self.client.get(yol)
                self.assertEqual(yanit.status_code, 302)
                self.assertTrue(yanit["Location"].startswith("/panel/giris"), yanit["Location"])

    def test_girissiz_post_giris_sayfasina_yonlenir(self):
        yanit = self.client.post("/panel/qr/yeni", QR_VERISI)
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(QRKod.objects.count(), 0)

    def test_izleyici_qr_olusturamaz(self):
        self.giris(self.izleyici)
        self.assertEqual(self.client.post("/panel/qr/yeni", QR_VERISI).status_code, 403)
        self.assertEqual(self.client.get("/panel/qr/yeni").status_code, 403)
        self.assertEqual(QRKod.objects.count(), 0)

    def test_izleyici_goruntuleyebilir(self):
        self.giris(self.izleyici)
        for yol in ("/panel/", "/panel/qr/", "/panel/kampanyalar/", "/panel/sayfalar/", "/panel/rapor/istatistik", "/panel/denetim/"):
            self.assertEqual(self.client.get(yol).status_code, 200, yol)

    def test_izleyici_duzenleyemez(self):
        qr = self.qr_yap("YET001")
        self.giris(self.izleyici)
        self.assertEqual(self.client.post(f"/panel/qr/{qr.pk}/duzenle", QR_VERISI).status_code, 403)
        self.assertEqual(self.client.post("/panel/kampanyalar/yeni", {"kod": "A", "ad": "A"}).status_code, 403)
        self.assertEqual(self.client.post("/panel/sayfalar/yeni", {"slug": "a", "baslik": "A"}).status_code, 403)

    def test_editor_kullanici_yonetimine_giremez(self):
        self.giris(self.editor)
        self.assertEqual(self.client.get("/panel/kullanicilar/").status_code, 403)
        self.assertEqual(self.client.get("/panel/kullanicilar/yeni").status_code, 403)
        self.assertEqual(self.client.get(f"/panel/kullanicilar/{self.izleyici.pk}/duzenle").status_code, 403)
        self.assertEqual(self.client.get("/panel/ayarlar").status_code, 403)

    def test_rolsuz_kullanici_panele_giremez(self):
        self.giris(self.rolsuz)
        self.assertEqual(self.client.get("/panel/").status_code, 403)

    def test_yonetici_erisebilir(self):
        self.giris(self.yonetici)
        for yol in KORUMALI_YOLLAR:
            self.assertEqual(self.client.get(yol).status_code, 200, yol)

    def test_cikis_yalnizca_post(self):
        self.giris(self.editor)
        self.assertEqual(self.client.get("/panel/cikis").status_code, 405)
        self.assertEqual(self.client.post("/panel/cikis").status_code, 302)
        self.assertEqual(self.client.get("/panel/").status_code, 302)


class CSRFTesti(TemelTest):
    def test_csrf_olmadan_degistirme_reddedilir(self):
        istemci = Client(enforce_csrf_checks=True)
        istemci.force_login(self.editor)
        self.assertEqual(istemci.post("/panel/qr/yeni", {**QR_VERISI, "kisa_kod": "CSRF01"}).status_code, 403)
        self.assertEqual(istemci.post("/panel/cikis").status_code, 403)
        self.assertEqual(QRKod.objects.count(), 0)

    def test_csrf_ile_degistirme_calisir(self):
        istemci = Client(enforce_csrf_checks=True)
        istemci.force_login(self.editor)
        istemci.get("/panel/qr/yeni")
        belirteç = istemci.cookies["csrftoken"].value
        yanit = istemci.post("/panel/qr/yeni", {**QR_VERISI, "kisa_kod": "CSRF02", "csrfmiddlewaretoken": belirteç})
        self.assertEqual(yanit.status_code, 302)
        self.assertTrue(QRKod.objects.filter(kisa_kod="CSRF02").exists())

    def test_toplu_islem_csrf_ister(self):
        qr = self.qr_yap("CSRF03")
        istemci = Client(enforce_csrf_checks=True)
        istemci.force_login(self.editor)
        self.assertEqual(istemci.post("/panel/qr/toplu", {"islem": "pasif", "secili": [qr.pk]}).status_code, 403)
        qr.refresh_from_db()
        self.assertEqual(qr.durum, "aktif")

    def test_giris_formu_csrf_ister(self):
        istemci = Client(enforce_csrf_checks=True)
        yanit = istemci.post("/panel/giris", {"username": "editor", "password": PAROLA})
        self.assertEqual(yanit.status_code, 403)


class GirisTesti(TemelTest):
    def _dene(self, kullanici, parola, **ek):
        return self.client.post("/panel/giris", {"username": kullanici, "password": parola}, **ek)

    def test_basarili_giris_ve_oturum_yenileme(self):
        self.client.get("/panel/giris")
        self.client.session.save()
        once = self.client.session.session_key
        yanit = self._dene("editor", PAROLA)
        self.assertRedirects(yanit, "/panel/", fetch_redirect_response=False)
        self.assertEqual(self.client.session[SESSION_KEY], str(self.editor.pk))
        self.assertNotEqual(self.client.session.session_key, once)
        self.assertTrue(DenetimKaydi.objects.filter(eylem="giris_basarili", kullanici=self.editor).exists())

    def test_next_yalnizca_ayni_siteye(self):
        yanit = self.client.post("/panel/giris?next=https://kotu.example/", {"username": "editor", "password": PAROLA, "next": "https://kotu.example/"})
        self.assertEqual(yanit["Location"], "/panel/")
        self.client.logout()
        yanit = self.client.post("/panel/giris", {"username": "editor", "password": PAROLA, "next": "/panel/qr/"})
        self.assertEqual(yanit["Location"], "/panel/qr/")

    def test_hatali_giris_genel_mesaj_ve_denetim(self):
        var = self._dene("editor", "yanlis")
        yok = self._dene("hic-yok", "yanlis")
        self.assertEqual(var.status_code, 200)
        self.assertEqual(var.context["hata"], yok.context["hata"])
        self.assertNotIn(SESSION_KEY, self.client.session)
        self.assertEqual(DenetimKaydi.objects.filter(eylem="giris_basarisiz").count(), 2)

    def test_pasif_kullanici_ayni_genel_mesaji_alir(self):
        self.editor.is_active = False
        self.editor.save()
        yanit = self._dene("editor", PAROLA)
        self.assertEqual(yanit.context["hata"], self._dene("hic-yok", "x").context["hata"])

    @override_settings(GIRIS_DENEME_SINIRI=3, GIRIS_KILIT_SURESI_SN=600)
    def test_deneme_kilidi(self):
        ip = {"HTTP_X_FORWARDED_FOR": "198.51.100.7"}
        for _ in range(3):
            self.assertEqual(self._dene("editor", "yanlis", **ip).status_code, 200)
        # Artık doğru parola bile kilitli olduğu için kabul edilmez.
        yanit = self._dene("editor", PAROLA, **ip)
        self.assertEqual(yanit.status_code, 429)
        self.assertNotIn(SESSION_KEY, self.client.session)
        self.assertTrue(DenetimKaydi.objects.filter(eylem="giris_kilitlendi").exists())
        # Var olmayan kullanıcı için de aynı kilit mesajı: hesap varlığı sızmaz.
        for _ in range(3):
            self._dene("hic-yok", "yanlis", **ip)
        yok = self._dene("hic-yok", "yanlis", **ip)
        self.assertEqual(yok.status_code, 429)
        self.assertEqual(yok.context["hata"], yanit.context["hata"])
        # Başka IP etkilenmez.
        self.assertEqual(self._dene("editor", PAROLA, HTTP_X_FORWARDED_FOR="198.51.100.8").status_code, 302)

    @override_settings(GIRIS_DENEME_SINIRI=3)
    def test_basarili_giris_sayaci_sifirlar(self):
        for _ in range(2):
            self._dene("editor", "yanlis")
        self.assertEqual(self._dene("editor", PAROLA).status_code, 302)
        self.client.logout()
        for _ in range(2):
            self.assertEqual(self._dene("editor", "yanlis").status_code, 200)

    def test_giris_yapmis_kullanici_girise_donmez(self):
        self.giris(self.editor)
        self.assertEqual(self.client.get("/panel/giris").status_code, 302)


class KullaniciYonetimiTesti(TemelTest):
    def test_zayif_parola_reddedilir(self):
        self.giris(self.yonetici)
        yanit = self.client.post("/panel/kullanicilar/yeni", {"username": "yeni", "password1": "12345678", "password2": "12345678", "rol": "Editör"})
        self.assertEqual(yanit.status_code, 200)
        self.assertFalse(self.kullanici_modeli().objects.filter(username="yeni").exists())

    def kullanici_modeli(self):
        from django.contrib.auth import get_user_model
        return get_user_model()

    def test_kullanici_olusturma_ve_rol(self):
        self.giris(self.yonetici)
        yanit = self.client.post("/panel/kullanicilar/yeni", {
            "username": "yeni", "password1": "Cok-Uzun-Bir-Parola-77", "password2": "Cok-Uzun-Bir-Parola-77", "rol": "İzleyici",
        })
        self.assertEqual(yanit.status_code, 302)
        k = self.kullanici_modeli().objects.get(username="yeni")
        self.assertEqual(list(k.groups.values_list("name", flat=True)), ["İzleyici"])
        self.assertTrue(DenetimKaydi.objects.filter(eylem="kullanici_olustur").exists())

    def test_rol_degistirme_ve_pasiflestirme(self):
        self.giris(self.yonetici)
        yanit = self.client.post(f"/panel/kullanicilar/{self.izleyici.pk}/duzenle", {"rol": "Editör"})
        self.assertEqual(yanit.status_code, 302)
        self.izleyici.refresh_from_db()
        self.assertEqual(list(self.izleyici.groups.values_list("name", flat=True)), ["Editör"])
        self.assertFalse(self.izleyici.is_active)  # is_active işaretlenmediği için pasifleşti
        self.assertTrue(DenetimKaydi.objects.filter(eylem="kullanici_duzenle").exists())

    def test_kendi_hesabini_pasiflestiremez(self):
        self.giris(self.yonetici)
        yanit = self.client.post(f"/panel/kullanicilar/{self.yonetici.pk}/duzenle", {"rol": "Yönetici"})
        self.assertEqual(yanit.status_code, 200)
        self.assertTrue(yanit.context["form"].errors.get("is_active"))
        self.yonetici.refresh_from_db()
        self.assertTrue(self.yonetici.is_active)

    def test_yonetici_super_kullaniciyi_degistiremez(self):
        super_k = self.kullanici_modeli().objects.create_superuser("super", "s@example.com", PAROLA)
        self.giris(self.yonetici)
        self.assertEqual(self.client.get(f"/panel/kullanicilar/{super_k.pk}/duzenle").status_code, 403)


class AyarlarTesti(TemelTest):
    def test_genel_ayarlar_guncelleme_ve_denetim(self):
        self.giris(self.yonetici)
        yanit = self.client.post("/panel/ayarlar", {
            "marka_adi": "Yeni Marka", "pasif_mesaj": "Pasif", "baslamadi_mesaj": "Başlamadı", "bitti_mesaj": "Bitti",
            "bulunamadi_mesaj": "Yok", "yaklasan_bitis_gun": "14", "baslamadi_url": "", "bitti_url": "https://example.com/bitti",
        })
        self.assertEqual(yanit.status_code, 302)
        ayar = GenelAyarlar.al()
        self.assertEqual((ayar.marka_adi, ayar.yaklasan_bitis_gun, ayar.bitti_url), ("Yeni Marka", 14, "https://example.com/bitti"))
        self.assertTrue(DenetimKaydi.objects.filter(eylem="ayarlar_degistir").exists())

    def test_ayarlarda_tehlikeli_url_reddedilir(self):
        self.giris(self.yonetici)
        yanit = self.client.post("/panel/ayarlar", {
            "marka_adi": "M", "pasif_mesaj": "P", "baslamadi_mesaj": "B", "bitti_mesaj": "T", "bulunamadi_mesaj": "Y",
            "yaklasan_bitis_gun": "7", "bitti_url": "javascript:alert(1)",
        })
        self.assertEqual(yanit.status_code, 200)
        self.assertTrue(yanit.context["form"].errors.get("bitti_url"))


class DenetimListesiTesti(TemelTest):
    def test_filtre_ve_salt_okunur(self):
        self.giris(self.editor)
        self.client.post("/panel/urunler/yeni", {"kod": "U9", "ad": "Ürün"})
        self.client.logout()
        self.giris(self.yonetici)
        yanit = self.client.get("/panel/denetim/?eylem=urun_olustur&kullanici=editor")
        self.assertEqual(len(yanit.context["sayfa"]), 1)
        self.assertEqual(len(self.client.get("/panel/denetim/?eylem=yok_boyle").context["sayfa"]), 0)
        self.assertEqual(self.client.post("/panel/denetim/", {}).status_code, 405)
