"""Panel/API için isteğe bağlı IP (ağ) kısıtı.

settings.YONETIM_IZINLI_AGLAR boşsa (varsayılan) kısıt YOKTUR. Doluysa `/panel/`, `/api/` ve `/admin/` yalnızca bu ağlardan
erişilebilir; diğerleri 404 alır (varlığı ele verilmez). `/k/`, `/l/`, `/s/`, `/saglik`, `/robots.txt`, statik ve medya etkilenmez.
İstemci IP'si, projenin her yerinde kullanılan `middleware.istemci_ip` ile belirlenir: X-Forwarded-For yalnızca
GUVENILIR_VEKIL=1 iken (Caddy arkasında) ve yalnızca en sağdaki (vekilin eklediği) değer dikkate alınır; istemcinin
gönderdiği sahte başlık değerleri kullanılmaz.
"""
import ipaddress
import re

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.http import Http404

from .middleware import istemci_ip

KISITLI_ILK_SEGMENTLER = frozenset({"panel", "api", "admin"})


def aglari_oku(ham):
    """Virgülle ayrılmış CIDR listesini ip_network demetine çevirir. Boş/yalnız boşluk -> () (kısıt yok).
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


def kisitli_yol_mu(yol):
    """/panel, /api, /admin ile altındakiler (ardışık eğik çizgiler tekilleştirilir). Kök yol (/) de panele yönlendirdiği için kapsanır."""
    temiz = re.sub(r"/+", "/", yol or "/")
    if temiz == "/":
        return True
    return temiz.split("/", 2)[1] in KISITLI_ILK_SEGMENTLER


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
        if aglar and kisitli_yol_mu(request.path_info) and not ip_izinli_mi(istemci_ip(request), aglar):
            raise Http404  # varlığı ele verme: bilinmeyen yolla aynı 404 sayfası
        return self.get_response(request)
