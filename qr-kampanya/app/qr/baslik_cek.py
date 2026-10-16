"""Hedef sayfanın başlığını (<title>) güvenle çekme. Ayrıntı: docs/GUVENLIK.md ("Başlık çekme ve SSRF").

Sunucunun kullanıcı girdisi olan bir adrese bağlandığı TEK yer burasıdır; bu yüzden SSRF'e karşı katmanlıdır:
- Yalnızca http/https; adres önce `guvenli_url_dogrula` ile (yerel ad uzantıları, IP sabitleri, kimlik bilgisi) denetlenir.
- Ad DNS ile çözülür ve çözülen TÜM adresler genel (global) IP olmalıdır; özel, loopback, link-local, CGNAT, multicast,
  ayrılmış, belirtilmemiş ve IPv4 içeren IPv6 biçimleri (v4-mapped, 6to4, Teredo, NAT64) reddedilir.
- Bağlantı, doğrulanan IP adresine kurulur (DNS rebinding'e karşı ikinci bir çözümleme yoktur); Host başlığı ve TLS SNI/sertifika
  doğrulaması özgün ad ile yapılır.
- Yönlendirmeler elle, en fazla 3 kez izlenir; her adımda aynı denetim yinelenir.
- Toplam süre 3 sn (DNS sonrası bağlantı + okuma), en fazla 256 KB gövde, yalnızca text/html, sıkıştırma kapalı.
- Her hata sessizce boş başlık döndürür; kayıt asla engellenmez. Hata ayrıntısı yanıta/kullanıcıya sızdırılmaz.
"""
import http.client
import ipaddress
import logging
import re
import socket
import ssl
import threading
import time
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

from django.core.exceptions import ValidationError

from .dogrulama import guvenli_url_dogrula

logger = logging.getLogger(__name__)

TOPLAM_ZAMAN_ASIMI_SN = 3.0
EN_FAZLA_YONLENDIRME = 3
EN_FAZLA_BAYT = 256 * 1024
EN_FAZLA_BASLIK = 300
OKUMA_PARCASI = 16 * 1024
KULLANICI_AJANI = "QRKampanya-BaslikOkuyucu/1.0"
_YONLENDIRME_KODLARI = (301, 302, 303, 307, 308)
_CHARSET = re.compile(r"charset\s*=\s*[\"']?([\w.:-]+)", re.IGNORECASE)
_META_CHARSET = re.compile(rb"<meta[^>]+charset\s*=\s*[\"']?\s*([\w.:-]+)", re.IGNORECASE)
# Kontrol karakterleri, sıfır genişlikli ve çift yönlü (bidi) biçimlendirme karakterleri.
_KONTROL = re.compile("[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]")


class GuvensizAdres(Exception):
    """Adres, ad çözümü veya yönlendirme güvenli değil."""


class ZamanAsimi(Exception):
    pass


def _simdi():
    return time.monotonic()


def _ip_genel_mi(ip):
    """Yalnızca genel yönlendirilebilir adresler. IPv4 içeren IPv6 biçimlerinde gömülü IPv4 de denetlenir."""
    if isinstance(ip, ipaddress.IPv6Address):
        gomulu = ip.ipv4_mapped or ip.sixtofour
        if gomulu is None and ip.teredo is not None:
            gomulu = ip.teredo[1]
        if gomulu is None and ip in ipaddress.IPv6Network("64:ff9b::/96"):  # NAT64
            gomulu = ipaddress.IPv4Address(int(ip) & 0xFFFFFFFF)
        if gomulu is not None and not _ip_genel_mi(gomulu):
            return False
        if ip in ipaddress.IPv6Network("64:ff9b:1::/48"):  # yerel kullanımlı NAT64
            return False
    if (
        ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved
        or ip.is_unspecified or not ip.is_global
    ):
        return False
    return True


def _coz_zamanli(host, port, kalan):
    """getaddrinfo engelleyicidir; toplam süreyi aşmaması için ayrı iş parçacığında, kalan süre kadar beklenir."""
    sonuc = {}

    def calis():
        try:
            sonuc["bilgi"] = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        except Exception as hata:
            sonuc["hata"] = hata

    is_parcacigi = threading.Thread(target=calis, daemon=True)
    is_parcacigi.start()
    is_parcacigi.join(max(kalan(), 0))
    if is_parcacigi.is_alive():
        raise ZamanAsimi()
    if "hata" in sonuc:
        raise GuvensizAdres("ad çözülemedi") from sonuc["hata"]
    return sonuc["bilgi"]


def adresleri_coz(host, port, kalan=None):
    """Ad -> doğrulanmış IP metinleri listesi. Herhangi bir adres genel değilse GuvensizAdres."""
    if kalan is None:
        try:
            bilgiler = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        except (OSError, UnicodeError) as hata:
            raise GuvensizAdres("ad çözülemedi") from hata
    else:
        bilgiler = _coz_zamanli(host, port, kalan)
    adresler = []
    for bilgi in bilgiler:
        ham = str(bilgi[4][0]).split("%")[0]
        try:
            ip = ipaddress.ip_address(ham)
        except ValueError as hata:
            raise GuvensizAdres("geçersiz adres") from hata
        if not _ip_genel_mi(ip):
            raise GuvensizAdres("genel olmayan adres")
        if ham not in adresler:
            adresler.append(ham)
    if not adresler:
        raise GuvensizAdres("adres yok")
    return adresler


class _SabitIPBaglantisi(http.client.HTTPConnection):
    """`host` adıyla (Host başlığı) çalışır ama TCP bağlantısını verilen IP'ye kurar."""

    def __init__(self, host, port, ip, kalan):
        super().__init__(host, port, timeout=max(kalan(), 0.05))
        self._ip, self._kalan = ip, kalan
        self.ham_sock = None

    def _tcp_ac(self):
        kalan = self._kalan()
        if kalan <= 0:
            raise ZamanAsimi()
        return socket.create_connection((self._ip, self.port), timeout=kalan)

    def connect(self):
        self.sock = self.ham_sock = self._tcp_ac()


class _SabitIPHTTPSBaglantisi(http.client.HTTPSConnection):
    """Sertifika doğrulaması ve SNI özgün ad üzerinden; bağlantı doğrulanan IP'ye."""

    def __init__(self, host, port, ip, kalan):
        super().__init__(host, port, timeout=max(kalan(), 0.05), context=ssl.create_default_context())
        self._ip, self._kalan = ip, kalan
        self.ham_sock = None

    def connect(self):
        kalan = self._kalan()
        if kalan <= 0:
            raise ZamanAsimi()
        ham = socket.create_connection((self._ip, self.port), timeout=kalan)
        try:
            self.sock = self.ham_sock = self._context.wrap_socket(ham, server_hostname=self.host)
        except Exception:
            ham.close()
            raise


def _baglanti_olustur(ip, host, port, https, kalan):
    sinif = _SabitIPHTTPSBaglantisi if https else _SabitIPBaglantisi
    return sinif(host, port, ip, kalan)


def _govdeyi_oku(yanit, sock, kalan):
    """En fazla EN_FAZLA_BAYT bayt; her parça öncesi toplam süre denetlenir ve soket zaman aşımı kalan süreye çekilir
    (damla damla veri gönderen sunucu toplam süreyi uzatamaz)."""
    parcalar, toplam = [], 0
    while toplam < EN_FAZLA_BAYT:
        if kalan() <= 0:
            raise ZamanAsimi()
        if sock is not None:
            sock.settimeout(max(kalan(), 0.05))
        oku = getattr(yanit, "read1", None) or yanit.read  # tek recv: damlatan sunucu bir okumada takılı kalamaz
        parca = oku(min(OKUMA_PARCASI, EN_FAZLA_BAYT - toplam))
        if kalan() <= 0:  # bekçi soketi kapattıysa ya da süre dolduysa eldeki kısmi veri kullanılmaz
            raise ZamanAsimi()
        if not parca:
            break
        parcalar.append(parca)
        toplam += len(parca)
    return b"".join(parcalar)


class _BaslikAyristirici(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.baslik_icinde = False
        self.bitti = False
        self.parcalar = []

    def handle_starttag(self, tag, attrs):
        if tag == "title" and not self.bitti and not self.parcalar:
            self.baslik_icinde = True

    def handle_endtag(self, tag):
        if tag == "title" and self.baslik_icinde:
            self.baslik_icinde = False
            self.bitti = True

    def handle_data(self, veri):
        if self.baslik_icinde:
            self.parcalar.append(veri)


def baslik_temizle(metin):
    """Kontrol/yön karakterlerini atar, boşlukları sadeleştirir, 300 karaktere keser."""
    metin = _KONTROL.sub(" ", metin or "")
    return " ".join(metin.split())[:EN_FAZLA_BASLIK].strip()


def html_baslik(veri, content_type=""):
    """HTML baytlarından <title> metni (entity çözülmüş, sadeleştirilmiş). Kapanmamış başlık yok sayılır."""
    kodlama = None
    eslesme = _CHARSET.search(content_type or "") or _META_CHARSET.search(veri[:4096])
    if eslesme:
        kodlama = eslesme.group(1)
        kodlama = kodlama.decode("ascii", "ignore") if isinstance(kodlama, bytes) else kodlama
    for aday in (kodlama, "utf-8"):
        if not aday:
            continue
        try:
            metin = veri.decode(aday, errors="replace")
            break
        except LookupError:
            continue
    else:
        metin = veri.decode("latin-1")
    ayristirici = _BaslikAyristirici()
    try:
        ayristirici.feed(metin)
        ayristirici.close()
    except Exception:  # bozuk HTML: başlık yok say
        return ""
    if not ayristirici.bitti:
        return ""
    return baslik_temizle("".join(ayristirici.parcalar))


def _bekci_kapat(baglanti):
    """Süre dolunca engelleyici recv'i bitirmek için soketi kapatır (başka iş parçacığından)."""
    sock = getattr(baglanti, "ham_sock", None)
    if sock is None:
        return
    for islem in (lambda: sock.shutdown(socket.SHUT_RDWR), sock.close):
        try:
            islem()
        except OSError:
            pass


def _tek_adim(url, kalan):
    """Tek istek: (durum, yanıt başlıkları, gövde baytları). Çözülen adresler denetlenir, ilk bağlanılabilen kullanılır."""
    parca = urlsplit(url)
    https = parca.scheme.lower() == "https"
    port = parca.port or (443 if https else 80)
    try:
        host = (parca.hostname or "").encode("idna").decode("ascii")  # IDN: Host/SNI için punycode
    except UnicodeError as hata:
        raise GuvensizAdres("geçersiz ad") from hata
    adresler = adresleri_coz(host, port, kalan)
    hedef = (parca.path or "/") + (f"?{parca.query}" if parca.query else "")
    son_hata = None
    for ip in adresler:
        if kalan() <= 0:
            raise ZamanAsimi()
        baglanti = _baglanti_olustur(ip, host, port, https, kalan)
        # Bekçi: durum satırı/başlık/gövde okumalarının TOPLAMI süre bütçesini aşarsa soketi kapatır.
        bekci = threading.Timer(max(kalan(), 0.01), _bekci_kapat, args=(baglanti,))
        bekci.daemon = True
        bekci.start()
        try:
            baglanti.request("GET", hedef, headers={
                "User-Agent": KULLANICI_AJANI, "Accept": "text/html", "Accept-Encoding": "identity",
                "Connection": "close",
            })
            yanit = baglanti.getresponse()
            if kalan() <= 0:
                raise ZamanAsimi()
            sock = getattr(baglanti, "ham_sock", None)
            durum = yanit.status
            tip = yanit.getheader("Content-Type", "") or ""
            konum = yanit.getheader("Location", "") or ""
            if durum in _YONLENDIRME_KODLARI:
                return durum, tip, konum, b""
            if durum != 200 or tip.split(";")[0].strip().lower() != "text/html":
                return durum, tip, "", b""
            return durum, tip, "", _govdeyi_oku(yanit, sock, kalan)
        except (OSError, http.client.HTTPException) as hata:
            son_hata = hata  # sıradaki adresi dene
        finally:
            bekci.cancel()
            baglanti.close()
    raise ZamanAsimi() if son_hata is None else son_hata


def sayfa_basligi(url):
    """Sayfa başlığı ya da "" (her türlü hata/güvensizlik/uygunsuz yanıtta). Asla istisna fırlatmaz."""
    try:
        return _baslik_getir(str(url or ""))
    except Exception as hata:  # sessiz başarısızlık bilinçli; ayrıntı yalnızca hata ayıklama günlüğüne
        logger.debug("Başlık çekilemedi (%s)", type(hata).__name__)
        return ""


def _baslik_getir(url):
    bitis = _simdi() + TOPLAM_ZAMAN_ASIMI_SN

    def kalan():
        return bitis - _simdi()

    for yonlendirme in range(EN_FAZLA_YONLENDIRME + 1):
        try:
            guvenli_url_dogrula(url)
        except ValidationError as hata:
            raise GuvensizAdres("adres reddedildi") from hata
        durum, tip, konum, govde = _tek_adim(url, kalan)
        if durum in _YONLENDIRME_KODLARI:
            if not konum or yonlendirme >= EN_FAZLA_YONLENDIRME:
                return ""
            url = urljoin(url, konum.strip())
            continue
        if not govde:
            return ""
        return html_baslik(govde, tip)
    return ""
