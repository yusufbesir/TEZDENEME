"""Tarama kaydına yazılan, kişiyi tanımlamayan ek bilgiler: yönlendiren site (Referer) ve isteğe bağlı ülke (GeoIP).

Gizlilik ilkesi (docs/GUVENLIK.md): IP adresi ve User-Agent saklanmaz.
- Yönlendiren: Referer başlığının YALNIZCA ana makine adı saklanır (küçük harf, port yok, `www.` olduğu gibi kalır).
  Yol, sorgu, parça ve kullanıcı bilgisi hiçbir zaman saklanmaz. Kendi sitemizden gelen, IP adresli ya da bozuk Referer boş kalır.
- Ülke: GEOIP_VERITABANI ayarındaki MaxMind GeoLite2-Country dosyasıyla aranır. IP yalnızca bellekte aranır, saklanmaz.
  Ayar boşsa, dosya yoksa/bozuksa ya da `maxminddb` kurulu değilse ülke boş kalır; yönlendirme asla etkilenmez.
"""
import ipaddress
import logging
import re
import threading
import time
from urllib.parse import urlsplit

from django.conf import settings
from django.http.request import split_domain_port

log = logging.getLogger(__name__)

EN_FAZLA_REFERER = 2048
_ALAN_ETIKETI = re.compile(r"^[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?$")
_ULKE = re.compile(r"^[A-Z]{2}$")


def _kendi_alan_adlari(request=None):
    adlar = {str(settings.SITE_ALAN_ADI).lower()}
    adlar.update(str(h).strip().lower().lstrip(".") for h in settings.ALLOWED_HOSTS)
    try:
        adlar.add((urlsplit(settings.KISA_URL_TABANI).hostname or "").lower())
    except ValueError:
        pass
    if request is not None:
        try:
            adlar.add(split_domain_port(request.get_host())[0].lower())
        except Exception:
            pass
    adlar.discard("")
    return adlar


def _gecerli_makine_adi(ad):
    """Küçük harfli ASCII (IDN ise punycode) makine adı; IP adresi, boş etiket ya da bozuk ad için None."""
    ad = ad.rstrip(".")
    if not ad or len(ad) > 253:
        return None
    try:
        ipaddress.ip_address(ad)
        return None  # IP adresli Referer: site adı değil, saklanmaz
    except ValueError:
        pass
    try:
        ad = ad.encode("idna").decode("ascii")
    except UnicodeError:
        return None
    ad = ad.lower()
    if len(ad) > 253 or "." not in ad and ad != "localhost":
        # Tek etiketli adlar (iç ağ adları) site sayılmaz.
        return None
    if not all(_ALAN_ETIKETI.match(e) for e in ad.split(".")):
        return None
    return ad


def yonlendiren_alan_adi(referer, request=None):
    """Referer başlığından yalnızca ana makine adı; saklanmaması gereken her durumda boş metin."""
    if not referer:
        return ""
    referer = str(referer).strip()[:EN_FAZLA_REFERER]
    try:
        parca = urlsplit(referer)
        if parca.scheme.lower() not in ("http", "https"):
            return ""
        ad = parca.hostname  # küçük harfe çevrilir; port, kullanıcı bilgisi ve köşeli parantez atılır
    except ValueError:
        return ""
    if not ad:
        return ""
    ad = _gecerli_makine_adi(ad)
    if not ad or ad in _kendi_alan_adlari(request):
        return ""
    return ad


# --- GeoIP (isteğe bağlı) ---

_kilit = threading.Lock()
_okuyucular = {}  # yol -> açık okuyucu (süreç başına bir kez açılır)
_basarisiz = {}  # yol -> son başarısız deneme (monotonic); kısa süre yeniden denenmez
YENIDEN_DENEME_SN = 300


def _okuyucu_ac(yol):
    try:
        import maxminddb  # isteğe bağlı bağımlılık
    except ImportError:
        log.warning("GEOIP_VERITABANI ayarlı ama maxminddb kurulu değil; ülke bilgisi boş kalacak.")
        return None
    try:
        return maxminddb.open_database(yol)
    except Exception as hata:  # dosya yok/okunamıyor/bozuk
        log.warning("GeoIP veritabanı açılamadı (%s); ülke bilgisi boş kalacak.", type(hata).__name__)
        return None


def okuyucu():
    """Açık GeoIP okuyucusu ya da None. Lazy ve kilitli: süreç başına (yol başına) en fazla bir kez açılır."""
    yol = getattr(settings, "GEOIP_VERITABANI", "") or ""
    if not yol:
        return None
    mevcut = _okuyucular.get(yol)
    if mevcut is not None:
        return mevcut
    with _kilit:
        mevcut = _okuyucular.get(yol)
        if mevcut is not None:
            return mevcut
        son = _basarisiz.get(yol)
        if son is not None and time.monotonic() - son < YENIDEN_DENEME_SN:
            return None
        yeni = _okuyucu_ac(yol)
        if yeni is None:
            _basarisiz[yol] = time.monotonic()
            return None
        _basarisiz.pop(yol, None)
        _okuyucular[yol] = yeni
        return yeni


def ulke_kodu(ip):
    """IP için 2 harfli ISO ülke kodu; bilinmiyorsa ya da herhangi bir sorun varsa boş metin. IP saklanmaz."""
    if not ip:
        return ""
    try:
        o = okuyucu()
        if o is None:
            return ""
        kayit = o.get(ip)
        kod = ((kayit or {}).get("country") or {}).get("iso_code") or ""
    except Exception:  # geçersiz IP, bozuk veritabanı vb.: ülke boş kalır
        return ""
    kod = str(kod).upper()
    return kod if _ULKE.match(kod) else ""


def sifirla():
    """Yalnızca testler için: açık okuyucuları kapatır ve önbelleği temizler."""
    with _kilit:
        for o in _okuyucular.values():
            try:
                o.close()
            except Exception:
                pass
        _okuyucular.clear()
        _basarisiz.clear()
