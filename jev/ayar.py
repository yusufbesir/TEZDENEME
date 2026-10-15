"""Cihaza özgü varsayılanlar tek yerde toplanır (kişisel yol gömülü değildir)."""

import os
from pathlib import Path

ARACLAR_ORTAM = "JEV_ARACLAR"
CAGRI_DOSYASI = "jev_cagri.py"


def paketten_kesfet(taban):
    """`taban` bir dosya yoludur (ör. ayar.py); iki üst dizinde jev_cagri.py varsa o dizini, yoksa None döndürür."""
    try:
        aday = Path(taban).resolve().parents[2]
    except IndexError:
        return None
    return str(aday) if (aday / CAGRI_DOSYASI).is_file() else None


def varsayilan_cihaz_koku():
    """Sırayla: mutlak JEV_ARACLAR; paketin iki üstünde jev_cagri.py bulunan dizin; yoksa None."""
    ortam = os.environ.get(ARACLAR_ORTAM)
    if ortam and os.path.isabs(ortam):
        return ortam
    return paketten_kesfet(__file__)
