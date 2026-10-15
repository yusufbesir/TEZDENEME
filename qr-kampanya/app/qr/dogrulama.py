"""Hedef URL doğrulaması.

Sistem kullanıcı tarafından girilen URL'leri ASLA sunucudan çağırmaz (SSRF yok);
yalnızca biçimini doğrular ve tarayıcıyı oraya yönlendirir.
"""
import ipaddress
from urllib.parse import urlsplit

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator

IZINLI_SEMALAR = ("http", "https")
YEREL_UZANTILAR = (".localhost", ".local", ".internal", ".lan", ".home.arpa")
_url_dogrulayici = URLValidator(schemes=list(IZINLI_SEMALAR))


def guvenli_url_dogrula(deger):
    if not deger:
        return
    deger = str(deger)
    if any(ord(c) < 32 or c in "\x7f \\" for c in deger):
        raise ValidationError("URL boşluk, ters eğik çizgi veya kontrol karakteri içeremez.")
    try:
        parca = urlsplit(deger)
    except ValueError as hata:
        raise ValidationError("Geçersiz URL.") from hata
    if parca.scheme.lower() not in IZINLI_SEMALAR:
        raise ValidationError("Yalnızca http:// ve https:// ile başlayan adreslere izin verilir.")
    if parca.username or parca.password:
        raise ValidationError("URL içinde kullanıcı adı/parola bulunamaz.")
    host = (parca.hostname or "").lower().rstrip(".")  # "foo.local." gibi kök etiketli yazımlar da kontrol edilir
    if not host:
        raise ValidationError("URL bir alan adı içermelidir.")
    if host == "localhost" or host.endswith(YEREL_UZANTILAR):
        raise ValidationError("Yerel ağ adreslerine yönlendirme yapılamaz.")
    try:
        ip = ipaddress.ip_address(host.strip("[]").split("%")[0])
    except ValueError:
        ip = None
    if ip is not None:
        if getattr(ip, "ipv4_mapped", None) is not None:
            ip = ip.ipv4_mapped
        if not ip.is_global:  # özel, loopback, link-local, CGNAT (100.64/10), belgeleme, ayrılmış vb.
            raise ValidationError("Özel veya yerel IP adreslerine yönlendirme yapılamaz.")
    _url_dogrulayici(deger)


def url_gecerli_mi(deger):
    try:
        guvenli_url_dogrula(deger)
        return True
    except ValidationError:
        return False


def idn_mi(deger):
    """Ana bilgisayar adı IDN mi (punycode `xn--` etiketi veya ASCII dışı karakter)? Reddedilmez; panelde uyarı gösterilir
    (benzer görünen karakterlerle taklit alan adı riski)."""
    try:
        host = (urlsplit(str(deger or "")).hostname or "").lower()
    except ValueError:
        return False
    return any(not c.isascii() for c in host) or any(e.startswith("xn--") for e in host.split("."))
