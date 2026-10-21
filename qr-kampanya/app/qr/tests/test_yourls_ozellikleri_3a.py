"""YOURLS'ten eksik özellikler (3a. parça): hızlı kısalt, otomatik başlık çekme (SSRF önlemleri), yer imi düğmesi,
paylaşım kutusu, sıralı kod seçeneği ve API küçük düzeltmeleri. Testlerde dış ağ KULLANILMAZ (DNS ve bağlantı yamalıdır)."""
import html
import http.server
import re
import socket
import threading
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connections
from django.test import Client, SimpleTestCase, TransactionTestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.db import connection

from qr import baslik_cek as bc
from qr import servisler
from qr.models import ApiAnahtari, DenetimKaydi, GenelAyarlar, QRKod
from qr.panel.yardimci import paylasim_baglantilari

from .yardimci import TEST_AYARLARI, TemelTest

HIZLI = "/panel/kisalt/"
GENEL = "93.184.216.34"


def sahte_dns(harita):
    """socket.getaddrinfo yerine: ad -> IP listesi (IP sabitleri olduğu gibi döner). Bilinmeyen ad çözülemez."""
    def getaddrinfo(host, port, *a, **k):
        adresler = harita.get(host)
        if adresler is None:
            try:
                socket.inet_pton(socket.AF_INET6 if ":" in host else socket.AF_INET, host)
                adresler = [host]
            except OSError:
                raise socket.gaierror("bilinmiyor")
        return [
            (socket.AF_INET6 if ":" in a_ else socket.AF_INET, socket.SOCK_STREAM, 6, "", (a_, port))
            for a_ in adresler
        ]
    return mock.patch("socket.getaddrinfo", side_effect=getaddrinfo)


class SahteYanit:
    def __init__(self, durum=200, tip="text/html; charset=utf-8", govde=b"", konum="", saat=None, adim=0.0):
        self.status, self._tip, self._govde, self._konum = durum, tip, govde, konum
        self.okunan, self._saat, self._adim = 0, saat, adim

    def getheader(self, ad, varsayilan=None):
        return {"content-type": self._tip, "location": self._konum}.get(ad.lower(), varsayilan)

    def read(self, n=-1):
        if self._saat is not None:
            self._saat[0] += self._adim
        parca = self._govde[self.okunan:self.okunan + n]
        self.okunan += len(parca)
        return parca


class SahteBaglanti:
    def __init__(self, yanit):
        self.yanit, self.sock, self.istekler = yanit, None, []

    def request(self, yontem, hedef, headers=None):
        self.istekler.append((yontem, hedef, headers))

    def getresponse(self):
        return self.yanit

    def close(self):
        pass


def baglanti_yamasi(*yanitlar):
    """Sırayla verilen yanıtlarla _baglanti_olustur'u değiştirir; çağrı kayıtlarını (ip, host, port, https) tutar."""
    cagrilar, kuyruk = [], list(yanitlar)

    def olustur(ip, host, port, https, kalan):
        cagrilar.append((ip, host, port, https))
        return SahteBaglanti(kuyruk.pop(0))

    return mock.patch.object(bc, "_baglanti_olustur", side_effect=olustur), cagrilar


def html_sayfa(baslik, bosluk=0):
    return (b"<html><head><title>" + baslik.encode() + b"</title></head><body>" + b"x" * bosluk + b"</body></html>")


class BaslikCekmeGuvenlikTesti(SimpleTestCase):
    """SSRF: özel/yerel adrese asla bağlantı kurulmaz."""

    def calistir(self, url, dns=None):
        yama, cagrilar = baglanti_yamasi(SahteYanit(govde=html_sayfa("Gizli")))
        with sahte_dns(dns or {}), yama:
            sonuc = bc.sayfa_basligi(url)
        return sonuc, cagrilar

    def test_dogrudan_ozel_ve_yerel_adresler_reddedilir(self):
        for url in (
            "http://127.0.0.1/", "http://127.1/", "http://10.0.0.5/yol", "http://192.168.1.1/", "http://172.16.0.9/",
            "http://169.254.169.254/latest/meta-data/", "http://[::1]/", "http://[fe80::1]/", "http://[fd00::1]/",
            "http://100.64.0.1/", "http://224.0.0.1/", "http://0.0.0.0/", "http://240.0.0.1/",
            "http://[::ffff:127.0.0.1]/", "http://[::ffff:10.0.0.1]/", "http://[64:ff9b::7f00:1]/",
            "http://[2002:7f00:1::]/", "http://localhost/", "http://ornek.local/", "ftp://example.com/",
            "file:///etc/passwd", "javascript:alert(1)", "http://kullanici:parola@example.com/",
        ):
            with self.subTest(url=url):
                sonuc, cagrilar = self.calistir(url)
                self.assertEqual(sonuc, "")
                self.assertEqual(cagrilar, [], "genel olmayan adrese bağlantı kurulmamalı")

    def test_dns_ozel_ip_donduruyorsa_reddedilir(self):
        sonuc, cagrilar = self.calistir("http://zararli.example.com/", {"zararli.example.com": ["10.0.0.7"]})
        self.assertEqual((sonuc, cagrilar), ("", []))

    def test_dns_karisik_cevapta_tek_ozel_adres_yeter(self):
        """Genel + özel birlikte dönerse (rebinding denemesi) hepsi reddedilir."""
        sonuc, cagrilar = self.calistir("http://karisik.example.com/", {"karisik.example.com": [GENEL, "169.254.169.254"]})
        self.assertEqual((sonuc, cagrilar), ("", []))
        sonuc, cagrilar = self.calistir("http://v6.example.com/", {"v6.example.com": ["::1"]})
        self.assertEqual((sonuc, cagrilar), ("", []))

    def test_cozumlenemeyen_ad_sessizce_bos(self):
        self.assertEqual(self.calistir("http://yok.example.com/")[0], "")

    def test_genel_adres_baglanti_cozulen_ipye_kurulur(self):
        sonuc, cagrilar = self.calistir("https://ornek.example.com:443/a?b=1", {"ornek.example.com": [GENEL]})
        self.assertEqual(sonuc, "Gizli")
        # Bağlantı IP'ye, Host/SNI için özgün ad + port ile.
        self.assertEqual(cagrilar, [(GENEL, "ornek.example.com", 443, True)])

    def test_genel_ipden_ozel_ipye_yonlendirme_reddedilir(self):
        yama, cagrilar = baglanti_yamasi(
            SahteYanit(durum=302, konum="http://169.254.169.254/latest/meta-data/"),
            SahteYanit(govde=html_sayfa("Sızdı")),
        )
        with sahte_dns({"acik.example.com": [GENEL]}), yama:
            self.assertEqual(bc.sayfa_basligi("http://acik.example.com/"), "")
        self.assertEqual(len(cagrilar), 1)  # yönlendirme hedefine bağlanılmadı

    def test_yonlendirme_dns_ozel_ipye_cozulurse_reddedilir(self):
        yama, cagrilar = baglanti_yamasi(
            SahteYanit(durum=301, konum="http://ic.example.com/yol"), SahteYanit(govde=html_sayfa("Sızdı")),
        )
        with sahte_dns({"acik.example.com": [GENEL], "ic.example.com": ["10.1.2.3"]}), yama:
            self.assertEqual(bc.sayfa_basligi("http://acik.example.com/"), "")
        self.assertEqual(len(cagrilar), 1)

    def test_yonlendirme_baska_semaya_reddedilir(self):
        yama, cagrilar = baglanti_yamasi(SahteYanit(durum=302, konum="file:///etc/passwd"))
        with sahte_dns({"acik.example.com": [GENEL]}), yama:
            self.assertEqual(bc.sayfa_basligi("http://acik.example.com/"), "")
        self.assertEqual(len(cagrilar), 1)

    def test_genel_yonlendirme_izlenir_en_fazla_uc_kez(self):
        dns = {f"h{i}.example.com": [GENEL] for i in range(6)}
        # 3 yönlendirme + son yanıt: başarılı
        yama, cagrilar = baglanti_yamasi(
            SahteYanit(durum=301, konum="http://h1.example.com/"), SahteYanit(durum=302, konum="/ikinci"),
            SahteYanit(durum=307, konum="http://h2.example.com/"), SahteYanit(govde=html_sayfa("Vardık")),
        )
        with sahte_dns(dns), yama:
            self.assertEqual(bc.sayfa_basligi("http://h0.example.com/"), "Vardık")
        self.assertEqual(len(cagrilar), 4)
        # 4. yönlendirme: izlenmez
        yama, cagrilar = baglanti_yamasi(*[SahteYanit(durum=302, konum=f"http://h{i}.example.com/") for i in range(1, 6)])
        with sahte_dns(dns), yama:
            self.assertEqual(bc.sayfa_basligi("http://h0.example.com/"), "")
        self.assertEqual(len(cagrilar), 4)

    def test_ip_genel_mi_sinirlari(self):
        import ipaddress
        for genel in ("8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111"):
            self.assertTrue(bc._ip_genel_mi(ipaddress.ip_address(genel)), genel)
        for degil in ("0.0.0.0", "10.0.0.1", "100.64.0.1", "127.0.0.1", "169.254.1.1", "192.0.2.1", "198.18.0.1",
                      "224.0.0.1", "255.255.255.255", "::", "::1", "fe80::1", "fc00::1", "ff02::1", "::ffff:10.0.0.1",
                      "64:ff9b::a00:1"):
            self.assertFalse(bc._ip_genel_mi(ipaddress.ip_address(degil)), degil)


class BaslikCekmeSinirTesti(SimpleTestCase):
    def getir(self, yanit, url="http://sayfa.example.com/"):
        yama, cagrilar = baglanti_yamasi(yanit)
        with sahte_dns({"sayfa.example.com": [GENEL]}), yama:
            return bc.sayfa_basligi(url)

    def test_normal_baslik(self):
        self.assertEqual(self.getir(SahteYanit(govde=html_sayfa("Merhaba dünya"))), "Merhaba dünya")

    def test_yalniz_text_html(self):
        for tip in ("application/json", "text/plain", "application/pdf", "image/png", ""):
            with self.subTest(tip=tip):
                self.assertEqual(self.getir(SahteYanit(tip=tip, govde=html_sayfa("Baslik"))), "")
        self.assertEqual(self.getir(SahteYanit(tip="Text/HTML; charset=UTF-8", govde=html_sayfa("Baslik"))), "Baslik")

    def test_http_hata_kodlari_bos(self):
        for durum in (204, 403, 404, 500):
            self.assertEqual(self.getir(SahteYanit(durum=durum, govde=html_sayfa("Baslik"))), "")

    def test_en_fazla_256_kb_okunur(self):
        # Başlık 256 KB'tan sonra: bulunamaz; okunan bayt sınırı aşmaz.
        govde = b"<html><head>" + b"<!-- " + b"x" * (300 * 1024) + b" --><title>Cok gec</title></head></html>"
        yanit = SahteYanit(govde=govde)
        self.assertEqual(self.getir(yanit), "")
        self.assertEqual(yanit.okunan, bc.EN_FAZLA_BAYT)
        # 256 KB içindeki başlık bulunur.
        yanit = SahteYanit(govde=b"<html><head><title>Erken</title>" + b"y" * (400 * 1024))
        self.assertEqual(self.getir(yanit), "Erken")
        self.assertLessEqual(yanit.okunan, bc.EN_FAZLA_BAYT)

    def test_toplam_zaman_asimi_okuma_sirasinda(self):
        saat = [1000.0]
        # Her okuma 1,2 sn "harcar": 3 sn bütçesi 3. okumada biter, başlık (daha sonra) bulunmaz.
        yanit = SahteYanit(govde=b"<html><head>" + b"a" * 200000 + b"<title>Yavas</title>", saat=saat, adim=1.2)
        with mock.patch.object(bc, "_simdi", side_effect=lambda: saat[0]):
            self.assertEqual(self.getir(yanit), "")
        self.assertLess(yanit.okunan, 200000)

    def test_dns_zaman_asimi(self):
        def yavas(*a, **k):
            threading.Event().wait(1.0)
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (GENEL, 80))]

        with mock.patch.object(bc, "TOPLAM_ZAMAN_ASIMI_SN", 0.1), mock.patch("socket.getaddrinfo", side_effect=yavas):
            yama, cagrilar = baglanti_yamasi(SahteYanit(govde=html_sayfa("Gec")))
            with yama:
                self.assertEqual(bc.sayfa_basligi("http://yavas.example.com/"), "")
            self.assertEqual(cagrilar, [])

    def test_baglanti_hatasi_sessiz(self):
        def olustur(*a):
            raise ConnectionRefusedError()
        with sahte_dns({"sayfa.example.com": [GENEL]}), mock.patch.object(bc, "_baglanti_olustur", side_effect=olustur):
            self.assertEqual(bc.sayfa_basligi("http://sayfa.example.com/"), "")


class BaslikAyristirmaTesti(SimpleTestCase):
    def test_entity_bosluk_ve_kesme(self):
        self.assertEqual(
            bc.html_baslik(b"<title>\n  Kahve &amp; &#199;ay\t&lt;3  &eacute;\n</title>", "text/html; charset=utf-8"),
            "Kahve & Çay <3 é",
        )
        self.assertEqual(len(bc.html_baslik(b"<title>" + b"a" * 1000 + b"</title>")), 300)

    def test_kapanmamis_ve_olmayan_baslik(self):
        self.assertEqual(bc.html_baslik(b"<html><body>baslik yok</body></html>"), "")
        self.assertEqual(bc.html_baslik(b"<title>Kapanmadi"), "")
        self.assertEqual(bc.html_baslik(b"<title>   </title>"), "")

    def test_ilk_baslik_ve_kodlama(self):
        self.assertEqual(bc.html_baslik(b"<title>Ilk</title><title>Ikinci</title>"), "Ilk")
        self.assertEqual(bc.html_baslik("<title>Çok güzel</title>".encode("iso-8859-9"), "text/html; charset=iso-8859-9"), "Çok güzel")
        self.assertEqual(bc.html_baslik("<meta charset='windows-1254'><title>İğ</title>".encode("cp1254")), "İğ")
        self.assertEqual(bc.html_baslik(b"<title>a</title>", "text/html; charset=bilinmeyen-kodlama"), "a")

    def test_kontrol_ve_yon_karakterleri_atilir(self):
        self.assertEqual(bc.html_baslik("<title>a‮b\x00c​d</title>".encode()), "a b c d")

    def test_betik_etiketi_metin_olarak_kalir(self):
        # Başlıktaki işaretleme çözülmeden yalnızca metin olarak saklanır; şablonlar kaçırır.
        self.assertEqual(bc.html_baslik(b"<title>&lt;script&gt;alert(1)&lt;/script&gt;</title>"), "<script>alert(1)</script>")


class _Isleyici(http.server.BaseHTTPRequestHandler):
    istekler = []

    def do_GET(self):
        type(self).istekler.append(dict(self.headers))
        govde = b"<html><title>Yerel</title></html>"
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Content-Length", str(len(govde)))
        self.end_headers()
        self.wfile.write(govde)

    def log_message(self, *a):
        pass


class SabitIPBaglantisiTesti(SimpleTestCase):
    """Gerçek bağlantı sınıfı (yalnızca döngüsel arayüzde): bağlantı verilen IP'ye, Host başlığı özgün ad ile kurulur."""

    def test_host_basligi_ozgun_ad_baglanti_ip(self):
        sunucu = http.server.HTTPServer(("127.0.0.1", 0), _Isleyici)
        _Isleyici.istekler = []
        is_parcacigi = threading.Thread(target=sunucu.serve_forever, daemon=True)
        is_parcacigi.start()
        try:
            port = sunucu.server_address[1]
            baglanti = bc._baglanti_olustur("127.0.0.1", "ornek.example.com", port, False, lambda: 2.0)
            baglanti.request("GET", "/x", headers={"Connection": "close"})
            yanit = baglanti.getresponse()
            self.assertEqual(yanit.status, 200)
            self.assertIn(b"Yerel", yanit.read())
            baglanti.close()
        finally:
            sunucu.shutdown()
            sunucu.server_close()
        self.assertEqual(_Isleyici.istekler[0]["Host"], f"ornek.example.com:{port}")


class _DamlatanIsleyici(http.server.BaseHTTPRequestHandler):
    """Gerçek soketle yavaş sunucu: `mod` = "govde" (başlıklar hızlı, gövde damla damla) ya da "baslik" (başlık satırı damla damla)."""
    mod = "govde"

    def _damla(self, veri, bekleme):
        import time
        for i in range(0, len(veri), 3):
            self.wfile.write(veri[i:i + 3])
            self.wfile.flush()
            time.sleep(bekleme)

    def do_GET(self):
        try:
            if self.mod == "baslik":
                self._damla(b"HTTP/1.0 200 OK\r\nContent-Type: text/html\r\n\r\n<title>Yavas</title>", 0.3)
            else:
                self.wfile.write(b"HTTP/1.0 200 OK\r\nContent-Type: text/html\r\n\r\n<html><head>")
                self.wfile.flush()
                self._damla(b"a" * 4000 + b"<title>Yavas</title>", 0.3)
        except OSError:
            pass

    def log_message(self, *a):
        pass


class ToplamSureTesti(SimpleTestCase):
    """Toplam 3 sn sınırı gerçek soketle: damlatan sunucu süreyi uzatamaz (yalnızca bu testte IP denetimi yamalı)."""

    def calistir(self, mod):
        _DamlatanIsleyici.mod = mod
        sunucu = http.server.ThreadingHTTPServer(("127.0.0.1", 0), _DamlatanIsleyici)
        sunucu.daemon_threads = True
        threading.Thread(target=sunucu.serve_forever, daemon=True).start()
        try:
            import time
            port = sunucu.server_address[1]
            # Gerçek soket geçici bir portta dinler; 80/443 sınırı yalnızca bu testte bu porta genişletilir.
            with mock.patch.object(bc, "adresleri_coz", return_value=["127.0.0.1"]), \
                    mock.patch.object(bc, "IZINLI_PORTLAR", (80, 443, port)):
                bas = time.monotonic()
                sonuc = bc.sayfa_basligi(f"http://yavas.example.com:{port}/")
                gecen = time.monotonic() - bas
        finally:
            sunucu.shutdown()
            sunucu.server_close()
        return sonuc, gecen

    def test_damlatan_govde_toplam_sureyi_asamaz(self):
        sonuc, gecen = self.calistir("govde")
        self.assertEqual(sonuc, "")
        self.assertLess(gecen, 4.0)
        self.assertGreater(gecen, 2.0)  # sınıra kadar beklendi, erken pes edilmedi

    def test_damlatan_baslik_satiri_toplam_sureyi_asamaz(self):
        sonuc, gecen = self.calistir("baslik")
        self.assertEqual(sonuc, "")
        self.assertLess(gecen, 4.0)


# --------------------------------------------------------------------------------------------------------------------
# Hızlı kısalt, yer imi, paylaşım
# --------------------------------------------------------------------------------------------------------------------

class HizliKisaltTesti(TemelTest):
    def post(self, **ek):
        veri = {"hedef_url": "https://example.com/uzun/yol", **ek}
        return self.client.post(HIZLI, veri)

    def test_yetki_ve_menu(self):
        self.assertEqual(self.client.get(HIZLI).status_code, 302)  # giriş yok
        self.giris(self.izleyici)
        self.assertEqual(self.client.get(HIZLI).status_code, 403)
        self.assertEqual(self.post().status_code, 403)
        self.giris(self.editor)
        yanit = self.client.get(HIZLI)
        self.assertContains(yanit, "Hızlı kısalt")
        govde = yanit.content.decode()
        self.assertLess(govde.index("Hızlı kısalt</a>"), govde.index(">Pano</a>"))  # menüde en üstte

    def test_olusturma_link_turu_ve_ad_turetme(self):
        self.giris(self.editor)
        yanit = self.post(kisa_kod="HZL-01", baslik="Güzel   bir\nbaşlık")
        qr = QRKod.objects.get(kisa_kod="HZL-01")
        self.assertRedirects(yanit, f"{HIZLI}{qr.pk}/")
        self.assertEqual((qr.tur, qr.hedef_turu, qr.durum, qr.olusturan), ("link", "harici", "aktif", self.editor))
        self.assertEqual(qr.ad, "Güzel bir başlık")  # ad boşsa başlıktan
        self.assertTrue(DenetimKaydi.objects.filter(eylem="qr_olustur", nesne_id=str(qr.pk)).exists())
        self.post(kisa_kod="HZL-02", hedef_url="https://example.com/baska")
        self.assertEqual(QRKod.objects.get(kisa_kod="HZL-02").ad, "example.com")  # başlık da yoksa alan adından
        self.post(hedef_url="https://www.ornek.org/a", kisa_kod="HZL-03")
        self.assertEqual(QRKod.objects.get(kisa_kod="HZL-03").ad, "ornek.org")

    def test_kod_bos_otomatik(self):
        self.giris(self.editor)
        self.post()
        qr = QRKod.objects.get()
        self.assertEqual(len(qr.kisa_kod), 8)

    def test_ayni_dogrulama_yolu(self):
        self.giris(self.editor)
        for kotu in ("api", "ADMIN", "x"):  # ayrılmış kelime / çok kısa
            yanit = self.post(kisa_kod=kotu)
            self.assertEqual(yanit.status_code, 200, kotu)
            self.assertIn("kisa_kod", yanit.context["form"].errors)
        for url in ("javascript:alert(1)", "http://127.0.0.1/", "http://169.254.169.254/", "ftp://x.com"):
            yanit = self.post(hedef_url=url)
            self.assertEqual(yanit.status_code, 200, url)
            self.assertIn("hedef_url", yanit.context["form"].errors)
        self.assertFalse(QRKod.objects.exists())
        self.post(kisa_kod="TEKRAR1")
        self.assertEqual(self.post(kisa_kod="tekrar1", hedef_url="https://baska.example.org/").status_code, 200)
        self.assertEqual(QRKod.objects.filter(kod_anahtari="tekrar1").count(), 1)

    def test_ayni_hedef_uyarisi_ve_onay(self):
        self.qr_yap("VAR-01", "https://example.com/uzun/yol")
        self.giris(self.editor)
        yanit = self.post()
        self.assertEqual(yanit.status_code, 200)
        self.assertContains(yanit, "VAR-01")
        self.assertIn("ayni_hedef_onay", yanit.context["form"].fields)
        self.assertEqual(QRKod.objects.count(), 1)
        yanit = self.post(ayni_hedef_onay="on")
        self.assertEqual(yanit.status_code, 302)
        self.assertEqual(QRKod.objects.count(), 2)

    def test_olusturma_hiz_siniri(self):
        self.giris(self.editor)
        with override_settings(QR_OLUSTURMA_HIZ_SINIRI=2):
            self.assertEqual(self.post(kisa_kod="HIZ-01").status_code, 302)
            self.assertEqual(self.post(kisa_kod="HIZ-02", hedef_url="https://example.com/b").status_code, 302)
            yanit = self.post(kisa_kod="HIZ-03", hedef_url="https://example.com/c")
            self.assertEqual(yanit.status_code, 429)
        self.assertFalse(QRKod.objects.filter(kisa_kod="HIZ-03").exists())

    def test_post_csrf_zorunlu(self):
        istemci = Client(enforce_csrf_checks=True)
        istemci.force_login(self.editor)
        self.assertEqual(istemci.post(HIZLI, {"hedef_url": "https://example.com/csrf"}).status_code, 403)
        self.assertFalse(QRKod.objects.exists())

    def test_sonuc_ekrani(self):
        self.giris(self.editor)
        yanit = self.client.post(
            HIZLI, {"hedef_url": "https://example.com/s", "kisa_kod": "SNC-01", "baslik": "Sonuç sayfası"}, follow=True)
        qr = QRKod.objects.get(kisa_kod="SNC-01")
        self.assertContains(yanit, qr.kisa_url)
        self.assertContains(yanit, 'data-kopyala="kisa-link-sonuc"')
        self.assertContains(yanit, f'src="/panel/qr/{qr.pk}/png"')
        self.assertContains(yanit, "WhatsApp ile paylaş")
        self.assertContains(yanit, "Bir tane daha")
        self.assertContains(yanit, 'action="/panel/kisalt/"')
        self.assertEqual(self.client.get(f"/panel/qr/{qr.pk}/png").status_code, 200)
        self.giris(self.izleyici)
        self.assertEqual(self.client.get(f"{HIZLI}{qr.pk}/").status_code, 403)
        self.assertEqual(self.client.get(f"{HIZLI}99999/").status_code, 403)
        self.giris(self.editor)
        self.assertEqual(self.client.get(f"{HIZLI}99999/").status_code, 404)

    # --- otomatik başlık (hızlı kısalt, QR formu, API) ---

    def test_baslik_otomatik_cekilir(self):
        self.giris(self.editor)
        self.baslik_yamasi.return_value = "Çekilen   Başlık"
        self.post(kisa_kod="CEK-01")
        qr = QRKod.objects.get(kisa_kod="CEK-01")
        self.assertEqual(qr.baslik, "Çekilen   Başlık")  # temizlik baslik_cek içinde; burada gelen değer aynen saklanır
        self.assertEqual(qr.ad, "Çekilen Başlık")
        self.baslik_yamasi.assert_called_once_with("https://example.com/uzun/yol")

    def test_baslik_verilmisse_cekilmez(self):
        self.giris(self.editor)
        self.baslik_yamasi.return_value = "Çekilen"
        self.post(kisa_kod="CEK-02", baslik="Benim başlığım")
        self.assertEqual(QRKod.objects.get(kisa_kod="CEK-02").baslik, "Benim başlığım")
        self.baslik_yamasi.assert_not_called()

    def test_ayar_kapaliysa_cekilmez(self):
        self.giris(self.editor)
        GenelAyarlar.objects.update_or_create(pk=1, defaults={"baslik_otomatik_cek": False})
        self.baslik_yamasi.return_value = "Çekilen"
        self.post(kisa_kod="CEK-03")
        self.assertEqual(QRKod.objects.get(kisa_kod="CEK-03").baslik, "")
        self.baslik_yamasi.assert_not_called()

    def test_varsayilan_ayar_acik(self):
        self.assertTrue(GenelAyarlar.al().baslik_otomatik_cek)

    def test_cekme_basarisizsa_kayit_engellenmez(self):
        self.giris(self.editor)
        self.baslik_yamasi.return_value = ""
        self.assertEqual(self.post(kisa_kod="CEK-04").status_code, 302)
        self.assertEqual(QRKod.objects.get(kisa_kod="CEK-04").baslik, "")

    def test_yeni_qr_formu_baslik_ceker_duzenlemede_cekmez(self):
        self.giris(self.editor)
        self.baslik_yamasi.return_value = "Form başlığı"
        veri = {"tur": "kampanya", "hedef_turu": "harici", "hedef_url": "https://example.com/f", "durum": "aktif", "kisa_kod": "FRM-01"}
        self.client.post("/panel/qr/yeni", veri)
        qr = QRKod.objects.get(kisa_kod="FRM-01")
        self.assertEqual(qr.baslik, "Form başlığı")
        self.baslik_yamasi.reset_mock()
        self.client.post(f"/panel/qr/{qr.pk}/duzenle", {**veri, "baslik": "", "hedef_url": "https://example.com/yeni"})
        self.baslik_yamasi.assert_not_called()  # düzenlemede çekilmez (kullanıcı boşaltabilir)
        # Sayfa hedefli kayıtta da çekilmez.
        self.client.post("/panel/qr/yeni", {"tur": "kampanya", "hedef_turu": "sayfa", "sayfa": self.sayfa_yap().pk, "durum": "aktif", "kisa_kod": "FRM-02"})
        self.baslik_yamasi.assert_not_called()

    def test_api_shorturl_baslik_ceker(self):
        _, duz = ApiAnahtari.uret(self.editor, "t")
        self.baslik_yamasi.return_value = "API başlığı"
        yanit = self.client.post("/api/v1/", {"action": "shorturl", "url": "https://example.com/api", "keyword": "API-T1"},
                                 HTTP_AUTHORIZATION=f"Bearer {duz}")
        self.assertEqual(yanit.status_code, 200)
        self.assertEqual(yanit.json()["title"], "API başlığı")
        self.assertEqual(QRKod.objects.get(kisa_kod="API-T1").ad, "API başlığı")


class YerImiTesti(TemelTest):
    def sayfa(self):
        self.giris(self.editor)
        return self.client.get(HIZLI)

    def yer_imi(self, yanit):
        eslesme = re.search(r'href="(javascript:[^"]*)"', yanit.content.decode())
        self.assertIsNotNone(eslesme, "javascript: yer imi bağlantısı yok")
        return html.unescape(eslesme.group(1))

    def test_yer_imi_mutlak_adres_ve_parametreler(self):
        kod = self.yer_imi(self.sayfa())
        self.assertTrue(kod.startswith("javascript:"))
        self.assertIn('"http://testserver/panel/kisalt/"', kod)  # build_absolute_uri, JS dizgesi olarak kaçırılmış
        self.assertIn("encodeURIComponent(location.href)", kod)
        self.assertIn("encodeURIComponent(document.title)", kod)
        self.assertIn("?url=", kod)
        self.assertIn("&baslik=", kod)
        self.assertIn("window.open", kod)
        self.assertNotIn("<", kod)  # HTML içine gömülürken kaçış gerektirmez

    def test_yer_imi_https_vekil_basligiyla_mutlak(self):
        self.giris(self.editor)
        with override_settings(ALLOWED_HOSTS=["panel.example.com"]):
            yanit = self.client.get(HIZLI, HTTP_HOST="panel.example.com", HTTP_X_FORWARDED_PROTO="https")
        self.assertIn('"https://panel.example.com/panel/kisalt/"', self.yer_imi(yanit))

    def test_csp_bozulmaz_satir_ici_betik_yok(self):
        yanit = self.sayfa()
        csp = yanit["Content-Security-Policy"]
        self.assertIn("script-src 'self'", csp)
        self.assertNotIn("unsafe-inline", csp)
        self.assertNotIn("unsafe-eval", csp)
        self.assertNotRegex(yanit.content.decode(), r"<script(?![^>]*\bsrc=)")  # satır içi <script> yok
        self.assertNotRegex(yanit.content.decode(), r"\son(click|load|error)=")

    def test_get_ile_kayit_olmaz_ve_form_dolu_acilir(self):
        self.giris(self.editor)
        yanit = self.client.get(HIZLI, {"url": "https://example.org/makale?x=1&y=2", "baslik": "Bir  makale\nbaşlığı"})
        self.assertEqual(yanit.status_code, 200)
        self.assertEqual(yanit.context["form"].initial["hedef_url"], "https://example.org/makale?x=1&y=2")
        self.assertEqual(yanit.context["form"].initial["baslik"], "Bir makale başlığı")
        self.assertContains(yanit, 'value="https://example.org/makale?x=1&amp;y=2"')
        self.assertContains(yanit, 'value="Bir makale başlığı"')
        self.assertFalse(QRKod.objects.exists())
        self.assertFalse(DenetimKaydi.objects.filter(eylem="qr_olustur").exists())
        self.baslik_yamasi.assert_not_called()  # GET ağ isteği de başlatmaz

    def test_on_doldurma_kacirilir_ve_kisitlanir(self):
        self.giris(self.editor)
        yanit = self.client.get(HIZLI, {"url": '"><script>alert(1)</script>', "baslik": "<img src=x onerror=alert(1)>" + "a" * 500})
        govde = yanit.content.decode()
        self.assertNotIn("<script>alert(1)", govde)
        self.assertNotIn("<img src=x", govde)
        self.assertLessEqual(len(yanit.context["form"].initial["baslik"]), 300)
        self.assertFalse(QRKod.objects.exists())

    def test_get_asla_kaydetmez_kisalt_bilgisiyle(self):
        self.giris(self.editor)
        self.client.get(HIZLI, {"url": "https://example.org/", "hedef_url": "https://example.org/", "kisa_kod": "GET-01"})
        self.assertFalse(QRKod.objects.exists())

    def test_yetkisiz_kullanici_on_doldurma_goremez(self):
        self.giris(self.izleyici)
        self.assertEqual(self.client.get(HIZLI, {"url": "https://example.org/"}).status_code, 403)


class PaylasimTesti(TemelTest):
    def test_baglanti_uretimi_ve_kacis(self):
        b = paylasim_baglantilari("https://k.example.com/k/AB-1", 'Tehlikeli "><script>x</script> & başlık\r\nBcc: kötü@example.com')
        for ad, deger in b.items():
            self.assertNotIn("<", deger, ad)
            self.assertNotIn('"', deger, ad)
            self.assertNotIn("\n", deger, ad)
            self.assertNotIn("\r", deger, ad)
            self.assertNotIn(" ", deger, ad)
        self.assertTrue(b["whatsapp"].startswith("https://wa.me/?text="))
        self.assertTrue(b["eposta"].startswith("mailto:?subject="))
        self.assertTrue(b["x"].startswith("https://x.com/intent/post?text="))
        self.assertIn("https%3A%2F%2Fk.example.com%2Fk%2FAB-1", b["x"])
        self.assertNotIn("%0D", b["eposta"])  # satır sonu tek boşluğa iner: başlık enjeksiyonu yok
        self.assertNotIn("%0A", b["eposta"])

    def test_detay_sayfasinda_paylasim_kutusu(self):
        qr = self.qr_yap("PYL-01")
        self.giris(self.editor)
        yanit = self.client.get(f"/panel/qr/{qr.pk}/")
        self.assertContains(yanit, f'value="{qr.kisa_url}"')
        self.assertContains(yanit, 'data-kopyala="kisa-link-detay"')
        self.assertContains(yanit, "WhatsApp ile paylaş")
        self.assertContains(yanit, "E-posta ile paylaş")
        self.assertContains(yanit, "X'te paylaş")
        self.assertContains(yanit, f'href="/panel/qr/{qr.pk}/png?indir=1"')
        self.assertContains(yanit, "https://wa.me/?text=")
        self.assertContains(yanit, 'href="mailto:?subject=')
        self.assertNotRegex(yanit.content.decode(), r"<script(?![^>]*\bsrc=)")
        self.assertNotIn("platform.twitter", yanit.content.decode())  # harici betik yok

    def test_detay_sayfasinda_ad_ve_baslik_kacirilir(self):
        zararli = '"><script>alert(1)</script>'
        qr = self.qr_yap("PYL-02", ad=zararli, baslik=zararli)
        self.giris(self.editor)
        govde = self.client.get(f"/panel/qr/{qr.pk}/").content.decode()
        self.assertNotIn("<script>alert(1)", govde)
        self.assertNotIn('href="https://wa.me/?text=">', govde)
        self.assertRegex(govde, r'href="https://wa\.me/\?text=[^"<> ]*"')
        self.giris(self.editor)
        yanit = self.client.post(HIZLI, {"hedef_url": "https://example.com/k", "kisa_kod": "PYL-03", "baslik": zararli}, follow=True)
        self.assertNotIn("<script>alert(1)", yanit.content.decode())


# --------------------------------------------------------------------------------------------------------------------
# Sıralı kod
# --------------------------------------------------------------------------------------------------------------------

def sirali_yap(sayac=None):
    ayar = GenelAyarlar.al()
    ayar.kod_uretim_bicimi = "sirali"
    if sayac is not None:
        ayar.sirali_sayac = sayac
    ayar.save()
    return ayar


class SiraliKodTesti(TemelTest):
    def test_taban36_ve_baslangic(self):
        self.assertEqual([servisler.taban36(n) for n in (0, 1, 35, 36, 1295, 1296, 1297, 46655, 46656)],
                         ["0", "1", "z", "10", "zz", "100", "101", "zzz", "1000"])
        self.assertEqual(servisler.taban36(servisler.SIRALI_BASLANGIC), "100")
        self.assertEqual(GenelAyarlar.al().sirali_sayac, 1296)
        self.assertEqual(GenelAyarlar.al().kod_uretim_bicimi, "rastgele")  # varsayılan = mevcut davranış

    def test_rastgele_varsayilan_degismedi(self):
        kod = servisler.kod_uretici()()
        self.assertEqual(len(kod), 8)
        self.assertEqual(GenelAyarlar.al().sirali_sayac, 1296)  # sayaç kullanılmaz

    def test_sirali_artan_ve_kalici(self):
        sirali_yap()
        self.assertEqual([servisler.sirali_kod_ayir() for _ in range(3)], ["100", "101", "102"])
        self.assertEqual(GenelAyarlar.al().sirali_sayac, 1299)
        self.assertEqual(servisler.kod_uretici()(), "103")

    def test_onizleme_sayaci_ilerletmez(self):
        sirali_yap()
        uret = servisler.kod_uretici(kalici=False)
        self.assertEqual([uret(), uret()], ["100", "101"])
        self.assertEqual(GenelAyarlar.al().sirali_sayac, 1296)

    def test_mevcut_ve_ayrilmis_kod_atlanir(self):
        sirali_yap()
        self.qr_yap("101")
        self.qr_yap("10A")  # büyük/küçük harf duyarsız: "10a"
        ayar = GenelAyarlar.al()
        ayar.ayrilmis_kodlar = "102"
        ayar.save()
        self.assertEqual(servisler.sirali_kod_ayir(), "100")
        self.assertEqual(servisler.sirali_kod_ayir(), "103")  # 101 var, 102 ayrılmış
        self.assertEqual(servisler.sirali_kod_ayir(), "104")
        sirali_yap(sayac=int("10a", 36))
        self.assertEqual(servisler.sirali_kod_ayir(), "10b")

    def test_varsayilan_ayrilmis_kelime_atlanir(self):
        sirali_yap(sayac=int("api", 36))
        self.assertEqual(servisler.sirali_kod_ayir(), "apj")

    def test_dosyadaki_kodlar_atlanir(self):
        sirali_yap()
        uret = servisler.kod_uretici(kullanilan={"100", "101"})
        self.assertEqual(uret(), "102")

    def test_sayac_asla_baslangictan_kucuk_olmaz(self):
        sirali_yap(sayac=5)  # elle bozulsa da kod 3 karakterden kısa olamaz
        self.assertEqual(servisler.sirali_kod_ayir(), "100")

    def test_panel_formu_sirali_kod(self):
        sirali_yap()
        self.giris(self.editor)
        veri = {"tur": "kampanya", "hedef_turu": "harici", "durum": "aktif"}
        self.client.post("/panel/qr/yeni", {**veri, "hedef_url": "https://example.com/1"})
        self.client.post("/panel/qr/yeni", {**veri, "hedef_url": "https://example.com/2"})
        self.assertEqual(sorted(QRKod.objects.values_list("kisa_kod", flat=True)), ["100", "101"])

    def test_gecersiz_form_sayaci_yakmaz(self):
        sirali_yap()
        self.giris(self.editor)
        yanit = self.client.post("/panel/qr/yeni", {"tur": "kampanya", "hedef_turu": "harici", "hedef_url": "ftp://x.com", "durum": "aktif"})
        self.assertEqual(yanit.status_code, 200)
        self.assertEqual(GenelAyarlar.al().sirali_sayac, 1296)

    def test_hizli_kisalt_ve_acik_kod(self):
        sirali_yap()
        self.giris(self.editor)
        self.client.post(HIZLI, {"hedef_url": "https://example.com/a"})
        self.client.post(HIZLI, {"hedef_url": "https://example.com/b", "kisa_kod": "ozel-kod"})  # açık kod sayaca dokunmaz
        self.client.post(HIZLI, {"hedef_url": "https://example.com/c"})
        self.assertEqual(sorted(QRKod.objects.values_list("kisa_kod", flat=True)), ["100", "101", "ozel-kod"])

    def test_api_shorturl_sirali(self):
        sirali_yap()
        _, duz = ApiAnahtari.uret(self.editor, "t")
        yanit = self.client.post("/api/v1/", {"action": "shorturl", "url": "https://example.com/s"}, HTTP_AUTHORIZATION=f"Bearer {duz}")
        self.assertEqual(yanit.json()["keyword"], "100")

    def test_toplu_ice_aktarma_sirali(self):
        sirali_yap()
        self.qr_yap("101")
        self.giris(self.editor)
        csv_metin = "Hedef URL;Tür\nhttps://example.com/1;kampanya\nhttps://example.com/2;kampanya\nhttps://example.com/3;kampanya\n"
        yanit = self.client.post("/panel/qr/ice-aktar/yukle", {"dosya": SimpleUploadedFile("v.csv", csv_metin.encode(), content_type="text/csv")})
        self.assertEqual(yanit.status_code, 302)
        onizle = yanit["Location"].replace("eslestir", "onizle")
        yanit = self.client.get(onizle)
        self.assertEqual(yanit.status_code, 200)
        self.assertEqual(GenelAyarlar.al().sirali_sayac, 1296)  # önizleme sayaç harcamaz
        pk = onizle.split("/")[-2]
        self.client.post(f"/panel/qr/ice-aktar/{pk}/uygula")
        kodlar = sorted(QRKod.objects.exclude(kisa_kod="101").values_list("kisa_kod", flat=True))
        self.assertEqual(kodlar, ["100", "102", "103"])  # 101 zaten vardı: atlandı
        self.assertEqual(GenelAyarlar.al().sirali_sayac, 1296 + 4)

    def test_ayarlar_formu_sayaci_ezmez(self):
        ayar = sirali_yap()
        self.giris(self.yonetici)
        yanit = self.client.get("/panel/ayarlar")
        form = yanit.context["form"]
        self.assertIn("kod_uretim_bicimi", form.fields)
        self.assertIn("baslik_otomatik_cek", form.fields)
        self.assertNotIn("sirali_sayac", form.fields)
        veri = {k: ("on" if v is True else v) for k, v in form.initial.items() if k in form.fields and v not in (False, None)}
        veri["marka_adi"] = "Yeni Marka"
        veri.pop("baslik_otomatik_cek")  # işaretlenmeyen kutu kapanır
        servisler.sirali_kod_ayir()  # form açıldıktan sonra sayaç ilerler
        yanit = self.client.post("/panel/ayarlar", veri)
        self.assertEqual(yanit.status_code, 302)
        ayar.refresh_from_db()
        self.assertEqual(ayar.marka_adi, "Yeni Marka")
        self.assertEqual(ayar.sirali_sayac, 1297)  # form eski sayacı geri yazmadı
        self.assertFalse(ayar.baslik_otomatik_cek)  # işaretlenmeyen kutu kapanır (tüm form alanları kaydedilir)

    def test_sayac_artirma_satir_kilidi_kullanir(self):
        sirali_yap()
        with CaptureQueriesContext(connection) as sorgular:
            servisler.sirali_kod_ayir()
        self.assertTrue(any("FOR UPDATE" in q["sql"] and "genelayarlar" in q["sql"].lower() for q in sorgular.captured_queries))


@override_settings(**TEST_AYARLARI)
class SiraliKodEsZamanlilikTesti(TransactionTestCase):
    """Gerçek ayrı veritabanı bağlantılarıyla: eşzamanlı çağrılar çakışmaz, boşluksuz ardışık kod alır."""

    def _fixture_teardown(self):
        # Silme koruması tetikleyicileri nedeniyle tam flush yapılmaz; yalnızca bu testin verisi silinir.
        GenelAyarlar.objects.all().delete()

    def test_esizamanli_kod_ayirma_benzersiz(self):
        ayar = GenelAyarlar.al()
        ayar.kod_uretim_bicimi, ayar.sirali_sayac = "sirali", 1296
        ayar.save()
        sonuc, kilit, hatalar = [], threading.Lock(), []

        def is_(n):
            try:
                for _ in range(n):
                    kod = servisler.sirali_kod_ayir()
                    with kilit:
                        sonuc.append(kod)
            except Exception as hata:  # pragma: no cover
                hatalar.append(hata)
            finally:
                connections.close_all()

        parcaciklar = [threading.Thread(target=is_, args=(10,)) for _ in range(8)]
        [p.start() for p in parcaciklar]
        [p.join() for p in parcaciklar]
        self.assertEqual(hatalar, [])
        self.assertEqual(len(sonuc), 80)
        self.assertEqual(len(set(sonuc)), 80, "aynı kod iki kez verildi")
        self.assertEqual(sorted(sonuc), [servisler.taban36(1296 + i) for i in range(80)])
        self.assertEqual(GenelAyarlar.objects.get(pk=1).sirali_sayac, 1296 + 80)


# --------------------------------------------------------------------------------------------------------------------
# API küçük düzeltmeleri
# --------------------------------------------------------------------------------------------------------------------

class ApiKucukDuzeltmeTesti(TemelTest):
    def setUp(self):
        super().setUp()
        _, self.duz = ApiAnahtari.uret(self.editor, "t")
        self.baslik = {"HTTP_AUTHORIZATION": f"Bearer {self.duz}"}

    def test_arsivli_kodun_keywordu_400(self):
        qr = self.qr_yap("ARS-01")
        qr.durum = "arsiv"
        qr.save()
        yanit = self.client.post("/api/v1/", {"action": "shorturl", "url": "https://example.com/yeni", "keyword": "ars-01"}, **self.baslik)
        self.assertEqual(yanit.status_code, 400)
        self.assertIn("keyword", yanit.json()["message"])
        self.assertEqual(QRKod.objects.filter(kod_anahtari="ars-01").count(), 1)
        qr.refresh_from_db()
        self.assertEqual(qr.hedef_url, "https://example.com/hedef")  # arşivli kayıt değişmedi

    def test_limit_yalniz_rakam(self):
        for kotu in ("1_0", "٣", "+5", " 5 x", "5.0", "0x5", "-1"):
            yanit = self.client.get("/api/v1/", {"action": "stats", "limit": kotu}, **self.baslik)
            self.assertEqual(yanit.status_code, 400, kotu)
        self.assertEqual(self.client.get("/api/v1/", {"action": "stats", "limit": "10"}, **self.baslik).status_code, 200)
        self.assertEqual(self.client.get("/api/v1/", {"action": "stats", "limit": "007"}, **self.baslik).status_code, 200)
