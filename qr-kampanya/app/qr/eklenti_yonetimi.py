"""Eklenti yükleme ve listeleme (güvenli uyarlama; docs/EKLENTILER.md).

- Panelden kod yüklenmez. Eklentiler sunucuda `app/eklentiler/<ad>.py` dosyası olarak (imaja) konur.
- Yalnızca settings.QR_EKLENTILER (env QR_EKLENTILER, virgüllü modül adları; varsayılan boş) içinde adı geçenler içe aktarılır.
- Ad deseni ^[a-z][a-z0-9_]{0,40}$ ve içe aktarılan modül HER ZAMAN `eklentiler.<ad>`: nokta, eğik çizgi, `..` ya da başka bir
  paket yolu hilesi kabul edilmez. Hatalı ad -> uygulama açılışta ImproperlyConfigured ile durur (sessizce atlanmaz).
- Eklenti içe aktarılırken hata verirse yalnızca o eklenti devre dışı kalır; hata günlüğe ve Eklentiler sayfasına yazılır.
- Etkin olmayan eklentilerin kodu ÇALIŞTIRILMAZ (listeleme yalnızca ast ile okur).
"""
import ast
import importlib
import logging
import re
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

log = logging.getLogger(__name__)

AD_DESENI = re.compile(r"^[a-z][a-z0-9_]{0,40}$")
EKLENTI_PAKETI = "eklentiler"
EKLENTI_DIZINI = Path(__file__).resolve().parent.parent / EKLENTI_PAKETI

# ad -> {"durum": "yuklendi"|"hata", "hata": str}
_durum = {}


def eklenti_adlarini_oku(ham):
    """Virgüllü ad listesini doğrular ve demet olarak döndürür (sıra korunur, yinelenen tekilleştirilir)."""
    adlar = []
    for parca in (ham or "").split(","):
        ad = parca.strip()
        if not ad:
            continue
        if not AD_DESENI.fullmatch(ad):
            raise ImproperlyConfigured(
                f"QR_EKLENTILER içinde geçersiz eklenti adı: {ad!r}. Ad küçük harfle başlamalı ve yalnızca küçük harf, rakam ve "
                "alt çizgi içermeli (en çok 41 karakter); nokta, eğik çizgi ve yol parçaları kabul edilmez."
            )
        if ad not in adlar:
            adlar.append(ad)
    return tuple(adlar)


def modul_adi(ad):
    if not AD_DESENI.fullmatch(ad or ""):
        raise ValueError("Geçersiz eklenti adı")
    return f"{EKLENTI_PAKETI}.{ad}"


def yukle(adlar):
    """Etkin eklentileri içe aktarır (kancalarını kaydeder). Hata veren eklenti atlanır; ana uygulama etkilenmez."""
    _durum.clear()
    for ad in adlar:
        try:
            importlib.import_module(modul_adi(ad))
        except BaseException as hata:  # noqa: BLE001 - bozuk eklenti açılışı bozmasın
            if isinstance(hata, KeyboardInterrupt):
                raise
            _durum[ad] = {"durum": "hata", "hata": f"{type(hata).__name__}: {hata}"[:300]}
            log.exception("Eklenti yüklenemedi: %s", ad)
        else:
            _durum[ad] = {"durum": "yuklendi", "hata": ""}
            log.info("Eklenti yüklendi: %s", ad)
    return dict(_durum)


def _aciklama(dosya):
    """Modül belgesinin ilk satırı; dosya ÇALIŞTIRILMAZ, yalnızca ayrıştırılır."""
    try:
        agac = ast.parse(dosya.read_text(encoding="utf-8"))
        belge = ast.get_docstring(agac) or ""
    except (OSError, SyntaxError, ValueError):
        return ""
    return belge.strip().splitlines()[0][:200] if belge.strip() else ""


def eklenti_listesi(etkin_adlar):
    """Panel için: eklentiler/ içindeki modüller + etkin olup dosyası bulunmayanlar. Salt okunur; kod çalıştırmaz."""
    from . import kancalar

    kayitli = {}
    for olay, liste in kancalar.kancalar().items():
        for islev in liste:
            modul = getattr(islev, "__module__", "")
            if modul.startswith(EKLENTI_PAKETI + "."):
                kayitli.setdefault(modul.split(".", 1)[1], []).append(olay)
    dosyalar = {}
    if EKLENTI_DIZINI.is_dir():
        for yol in sorted(EKLENTI_DIZINI.glob("*.py")):
            if AD_DESENI.fullmatch(yol.stem):
                dosyalar[yol.stem] = yol
    satirlar = []
    for ad in sorted(set(dosyalar) | set(etkin_adlar)):
        etkin = ad in etkin_adlar
        durum = _durum.get(ad, {})
        if etkin and ad not in dosyalar:
            metin = "Dosya bulunamadı"
        elif etkin:
            metin = {"yuklendi": "Etkin (yüklendi)", "hata": "Etkin ama yüklenemedi"}.get(durum.get("durum"), "Etkin (yüklenmedi)")
        else:
            metin = "Kapalı"
        satirlar.append({
            "ad": ad, "etkin": etkin, "durum": metin, "hata": durum.get("hata", ""),
            "aciklama": _aciklama(dosyalar[ad]) if ad in dosyalar else "",
            "olaylar": sorted(set(kayitli.get(ad, []))),
        })
    return satirlar
