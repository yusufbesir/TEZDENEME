"""Hedef URL doğrulaması.

Sistem kullanıcı tarafından girilen URL'leri ASLA sunucudan çağırmaz (SSRF yok);
yalnızca biçimini doğrular ve tarayıcıyı oraya yönlendirir.
"""
import ipaddress
import re
from urllib.parse import urlsplit

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator

IZINLI_SEMALAR = ("http", "https")
YEREL_UZANTILAR = (".localhost", ".local", ".internal", ".lan", ".home.arpa")
_url_dogrulayici = URLValidator(schemes=list(IZINLI_SEMALAR))


_L_YOLU = re.compile(r"/l/[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]")


def kendi_l_adresi_mi(deger):
    """Değer, sitenin kendi link ağacı adresi mi (KISA_URL_TABANI + /l/<slug>; sorgu, parça ve kullanıcı bilgisi yok)?

    DAR İSTİSNA: yerel geliştirmede KISA_URL_TABANI localhost olabilir ve genel kural yerel adresleri reddeder; "Ağaç için
    kısa link" bu adrese gidebilmeli. Başka hiçbir iç yola (/panel/, /k/, /s/, /api/ ...) izin verilmez."""
    if any(ord(c) < 32 or c in "\x7f \\" for c in str(deger)):  # urlsplit \n, \t gibi karakterleri sessizce atar
        return False
    try:
        taban = urlsplit(settings.KISA_URL_TABANI)
        parca = urlsplit(str(deger))
    except ValueError:
        return False
    return bool(
        taban.scheme and taban.netloc
        and parca.scheme.lower() == taban.scheme.lower() and parca.netloc.lower() == taban.netloc.lower()
        and not parca.username and not parca.password and not parca.query and not parca.fragment
        and "?" not in str(deger) and "#" not in str(deger)
        and _L_YOLU.fullmatch(parca.path)
    )


def guvenli_url_dogrula(deger):
    if not deger:
        return
    deger = str(deger)
    if any(ord(c) < 32 or c in "\x7f \\" for c in deger):
        raise ValidationError("URL boşluk, ters eğik çizgi veya kontrol karakteri içeremez.")
    if kendi_l_adresi_mi(deger):
        return
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
