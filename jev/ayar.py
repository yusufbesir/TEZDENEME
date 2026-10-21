"""Cihaz kökü yalnızca açıkça verilen JEV_ARACLAR ortam değişkeninden okunur.

Komşu klasörlerde `jev_cagri.py` aranmaz: o dosya sonradan çalıştırıldığı için yazılabilir bir
üst klasöre bırakılan dosya kod çalıştırmaya yol açardı. Bu yüzden örtük (otomatik) keşif yoktur.
"""

import os

ARACLAR_ORTAM = "JEV_ARACLAR"


def varsayilan_cihaz_koku():
    """JEV_ARACLAR mutlak bir yol ve var olan bir dizinse onu, aksi halde None döndürür."""
    ortam = os.environ.get(ARACLAR_ORTAM)
    if ortam and os.path.isabs(ortam) and os.path.isdir(ortam):
        return ortam
    return None
