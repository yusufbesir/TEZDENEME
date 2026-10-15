"""Cihaza özgü varsayılanlar tek yerde toplanır."""

import os

CIHAZ_KOK = r"D:\YusufII\HAFIZAM1\jev-araclar"


def varsayilan_cihaz_koku():
    """Yalnız Windows'ta gömülü cihaz kökünü döndürür; diğer sistemlerde None."""
    return CIHAZ_KOK if os.name == "nt" else None
