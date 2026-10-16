"""Hedef URL doğrulaması.

Yönlendirme yolu kullanıcı tarafından girilen URL'leri sunucudan çağırmaz; yalnızca biçimini doğrular ve tarayıcıyı oraya
yönlendirir. Tek istisna, başlık otomatik çekme ayarı açıkken `baslik_cek` modülüdür (SSRF'e karşı katmanlıdır).
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
# Kampanya sayfası (/s/<slug>): salt-okunur herkese açık sayfa, yönlendirme yapmaz (döngü riski yok). "Bitiş sonrası adres" gibi
# alanlarda kendi kampanya sayfasına gitmek meşru bir kullanımdır; bu yüzden kendi alan adında /l/ ile birlikte tek izinli yoldur.
_S_YOLU = re.compile(r"/s/[A-Za-z0-9_-]{1,100}")


def ana_makine_normalle(host):
    """Ana makineyi karşılaştırma için ASCII (punycode) biçimine çevirir: küçük harf, sondaki nokta atılır, IDNA2003 nameprep
    (NFKC; U+3002, U+FF0E, U+FF61 nokta eşlemesi; tam genişlikli harfler). Tarayıcılar bu biçimleri aynı makineye eşler, bu yüzden
    karşılaştırmalar (kendi alan adı, yerel adlar) ham metinle değil bu biçimle yapılır. Çevrilemezse None (çağıran reddeder)."""
    try:
        ham = str(host or "")
        if ham.startswith("[") and ham.endswith("]"):  # IPv6 sabiti
            return ham[1:-1].lower().split("%")[0]
        return ham.encode("idna").decode("ascii").lower().rstrip(".")
    except UnicodeError:
        return None


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
    try:
        ayni_makine = (
            ana_makine_normalle(taban.hostname) is not None
            and ana_makine_normalle(taban.hostname) == ana_makine_normalle(parca.hostname) and taban.port == parca.port
        )
    except ValueError:
        return False
    return bool(
        taban.scheme and taban.netloc
        and parca.scheme.lower() == taban.scheme.lower() and ayni_makine
        and not parca.username and not parca.password and not parca.query and not parca.fragment
        and "?" not in str(deger) and "#" not in str(deger)
        and _L_YOLU.fullmatch(parca.path)
    )


def _kendi_alan_denetle(parca):
    """Hedef KISA_URL_TABANI ana makinesine gidiyorsa yalnız /l/<slug> (yukarıda geçti) ve /s/<slug> kabul edilir; /k/, /panel/,
    /api/, /ic/ ve diğer iç yollar yönlendirme döngüsü ve iç yüzey erişimi riski nedeniyle reddedilir. Yalnızca yeni
    kayıt/düzenleme doğrulamasıdır; mevcut kayıtlar değiştirilmez."""
    try:
        taban = ana_makine_normalle(urlsplit(settings.KISA_URL_TABANI).hostname)
        ham = parca.hostname
    except ValueError:
        return
    host = ana_makine_normalle(ham)
    if host is None:
        raise ValidationError("Geçersiz alan adı.")
    if taban and host == taban and not _S_YOLU.fullmatch(parca.path):
        raise ValidationError("Bu sitenin kendi adresine yalnızca /l/<adres> (link ağacı) ve /s/<adres> (kampanya sayfası) yolları verilebilir.")


def guvenli_url_dogrula(deger):
    """Yeni kayıt/düzenleme doğrulaması (model alanı, form, içe aktarma, başlık çekme): kendi alan adı kuralı DAHİL."""
    _dogrula(deger, kendi_alan_kurali=True)


def _dogrula(deger, kendi_alan_kurali):
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
    if kendi_alan_kurali:
        _kendi_alan_denetle(parca)
    if parca.scheme.lower() not in IZINLI_SEMALAR:
        raise ValidationError("Yalnızca http:// ve https:// ile başlayan adreslere izin verilir.")
    if parca.username or parca.password:
        raise ValidationError("URL içinde kullanıcı adı/parola bulunamaz.")
    host = ana_makine_normalle(parca.hostname)  # "foo.local." ve Unicode benzeri yazımlar da kontrol edilir
    if host is None:
        raise ValidationError("Geçersiz alan adı.")
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
    """Çalışma zamanı denetimi (yönlendirme, rapor): mevcut kayıtların davranışı değişmesin diye kendi alan adı kuralı UYGULANMAZ."""
    try:
        _dogrula(deger, kendi_alan_kurali=False)
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
