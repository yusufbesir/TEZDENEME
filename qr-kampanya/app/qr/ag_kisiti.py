"""Panel/API için ağ (IP) kısıtı: varsayılan KAPALI, beyaz liste.

Herkese açık yollar yalnızca: /k/, /l/, /s/, /saglik, /robots.txt, statik önek (STATIC_URL), /medya/ ve /ic/. Bunların dışındaki
HER yol (kök, /panel/, /api/, /admin/, giriş sayfası, bilinmeyenler) kısıtlıdır ve yalnızca settings.YONETIM_IZINLI_AGLAR içindeki
ağlardan erişilebilir; diğerleri 404 alır (varlığı ele verilmez).
settings.YONETIM_ERISIMI: `kisitli` (varsayılan) iken liste boşsa kısıtlı yollar herkese 404 döner (fail closed). `acik` yalnız
açık seçimle kısıtı kaldırır (liste doluysa yine uygulanır).
İstemci IP'si, projenin her yerinde kullanılan `middleware.istemci_ip` ile belirlenir: X-Forwarded-For yalnızca
GUVENILIR_VEKIL=1 iken (Caddy arkasında) ve yalnızca en sağdaki (vekilin eklediği) değer dikkate alınır; istemcinin
gönderdiği sahte başlık değerleri kullanılmaz.
"""
import ipaddress
import logging
from urllib.parse import urlparse

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.http import Http404

from .middleware import istemci_ip

# Beyaz liste: yalnızca kısa bağlantılar ve bunların dayandığı uçlar internete açıktır. /ic/ Caddy'de dışarıya kapalıdır;
# forward_auth alt isteği (medya yetkisi) uygulamaya doğrudan geldiği için kısıta takılmamalıdır.
TAM_ACIK_YOLLAR = frozenset({"/saglik", "/robots.txt"})
ACIK_ONEKLER = ("/k/", "/l/", "/s/", "/medya/", "/ic/")

KIPLER = ("kisitli", "acik")
logger = logging.getLogger(__name__)


def erisim_kipini_oku(ham):
    """YONETIM_ERISIMI: `kisitli` (varsayılan; boş değer de kisitli sayılır) ya da `acik`. Başka değer ImproperlyConfigured."""
    deger = (ham or "").strip().lower() or "kisitli"
    if deger not in KIPLER:
        raise ImproperlyConfigured(
            f"YONETIM_ERISIMI geçersiz: {ham!r}. Geçerli değerler: kisitli (varsayılan) ya da acik. "
            "Uygulama güvenli tarafta kalmak için başlamadı."
        )
    return deger


def kapali_uyarisi_gerekli_mi():
    return getattr(settings, "YONETIM_ERISIMI", "kisitli") == "kisitli" and not getattr(settings, "YONETIM_IZINLI_AGLAR", ())


def acilis_uyarisi_yaz():
    """Fail closed durumunda (kisitli + izinli ağ yok) açılışta tek satır uyarı yazar (gizli bilgi içermez)."""
    if kapali_uyarisi_gerekli_mi():
        logger.warning("Panel ve API KAPALI: YONETIM_IZINLI_AGLAR boş (YONETIM_ERISIMI=kisitli). Yalnızca kısa bağlantılar açık; "
                       ".env içine YONETIM_IZINLI_AGLAR=<CIDR> yazıp docker compose up -d çalıştırın.")


def aglari_oku(ham):
    """Virgülle ayrılmış CIDR listesini ip_network demetine çevirir. Boş/yalnız boşluk -> () (izinli ağ yok).
    Hatalı öğe (CIDR değil, ana makine bitleri açık, vb.) ImproperlyConfigured fırlatır: sessizce atlanmaz (fail closed)."""
    aglar = []
    for parca in (ham or "").split(","):
        parca = parca.strip()
        if not parca:
            continue
        try:
            aglar.append(ipaddress.ip_network(parca, strict=True))
        except ValueError as hata:
            raise ImproperlyConfigured(
                f"YONETIM_IZINLI_AGLAR içinde geçersiz CIDR: {parca!r} ({hata}). "
                "Örnek: 203.0.113.0/24,2001:db8::/32. Uygulama güvenli tarafta kalmak için başlamadı."
            ) from None
    return tuple(aglar)


def acik_yol_mu(yol):
    """Herkese açık (beyaz listedeki) yol mu? Bunun DIŞINDAKİ her yol (kök, /panel/, /api/, /admin/, bilinmeyenler) kısıtlıdır.

    Karar `path_info` (URL çözümleyicinin gördüğü yol) üzerinden verilir; yönlendirme ile aynı dizeye bakıldığı için
    SCRIPT_NAME farkı atlatma yaratmaz. Şüpheli biçimler (ardışık eğik çizgi, `.`/`..` bölümleri, kaçış karakteri `%`,
    ters eğik çizgi, denetim karakterleri) beyaz listeye girmez; büyük/küçük harf duyarlıdır (URL çözümleyici gibi).
    """
    if not isinstance(yol, str) or not yol.startswith("/"):
        return False
    if "//" in yol or "%" in yol or "\\" in yol or any(ord(c) < 32 or ord(c) == 127 for c in yol):
        return False
    if any(parca in (".", "..") for parca in yol.split("/")):
        return False
    if yol in TAM_ACIK_YOLLAR:
        return True
    onekler = ACIK_ONEKLER + (_statik_oneki(),)
    return any(yol.startswith(onek) and len(yol) > len(onek) for onek in onekler if onek)


def kisitli_yol_mu(yol):
    return not acik_yol_mu(yol)


def _statik_oneki():
    oneki = urlparse(getattr(settings, "STATIC_URL", "") or "").path
    if not oneki.startswith("/") or oneki == "/":
        return ""  # kök ya da tam adres olarak verilmiş statik önek beyaz listeyi genişletmez
    return oneki if oneki.endswith("/") else oneki + "/"


def ip_izinli_mi(ip, aglar):
    try:
        adres = ipaddress.ip_address((ip or "").strip())
    except ValueError:
        return False
    if adres.version == 6 and adres.ipv4_mapped is not None:
        adres = adres.ipv4_mapped
    return any(adres.version == ag.version and adres in ag for ag in aglar)


class YonetimAgKisitiMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        aglar = getattr(settings, "YONETIM_IZINLI_AGLAR", ())
        kip = getattr(settings, "YONETIM_ERISIMI", "kisitli")  # ayar eksikse de güvenli taraf: kisitli
        # `acik` + boş liste = kısıt yok (yalnız açık seçimle). Aksi halde kısıtlı yollar yalnız izinli ağlara açılır;
        # kisitli + boş liste herkes için 404'tür (fail closed).
        if (kip != "acik" or aglar) and kisitli_yol_mu(request.path_info) and not ip_izinli_mi(istemci_ip(request), aglar):
            raise Http404  # varlığı ele verme: bilinmeyen yolla aynı 404 sayfası
        return self.get_response(request)
