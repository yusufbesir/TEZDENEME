from django.conf import settings


class GuvenlikBasliklariMiddleware:
    """İçerik Güvenlik Politikası ve ek güvenlik başlıkları."""

    CSP = (
        "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; "
        "font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        yanit = self.get_response(request)
        yanit.setdefault("Content-Security-Policy", self.CSP)
        yanit.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        yanit.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        if request.path.startswith("/panel/"):
            yanit["Cache-Control"] = "no-store"
            yanit.setdefault("X-Robots-Tag", "noindex, nofollow")
        elif request.path.startswith(("/k/", "/l/")):
            # Kısa adres ve link ağacı yanıtlarının hepsi (302, bilgi sayfaları, 404/410, 429) arama motoru dizinine girmesin.
            yanit["X-Robots-Tag"] = "noindex, nofollow"
        return yanit


def istemci_ip(request):
    """Caddy arkasında gerçek istemci IP'si. Yalnızca bellek içinde kullanılır, saklanmaz."""
    if settings.GUVENILIR_VEKIL:
        xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if xff:
            # Caddy kendi gördüğü IP'yi en sona ekler; en sağdaki değer güvenilirdir.
            return xff.split(",")[-1].strip()
    return request.META.get("REMOTE_ADDR", "")


def ip_anahtari(ip):
    """Hız sınırı/sayaç anahtarı için IP: IPv4 tam adres, IPv6 /64 öneki (tek bir ağın sınırsız adres döndürmesini engeller)."""
    import ipaddress

    try:
        adres = ipaddress.ip_address((ip or "").strip())
    except ValueError:
        return (ip or "").strip()
    if adres.version == 6:
        if adres.ipv4_mapped is not None:
            return str(adres.ipv4_mapped)
        return str(ipaddress.ip_network(f"{adres}/64", strict=False))
    return str(adres)


def ip_maskele(ip):
    """IPv4 için son okteti, IPv6 için son 80 biti sıfırlar (denetim kaydı için)."""
    import ipaddress

    try:
        adres = ipaddress.ip_address(ip)
    except ValueError:
        return ""
    if adres.version == 4:
        return str(ipaddress.ip_network(f"{ip}/24", strict=False).network_address) + "/24"
    return str(ipaddress.ip_network(f"{ip}/48", strict=False).network_address) + "/48"
