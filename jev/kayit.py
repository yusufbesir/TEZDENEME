"""Yalnız-ekleme (append-only) JSONL karar defteri."""

import json
import os
from datetime import datetime, timezone

from . import ayar
from .istemci import metin_gizli_mi

ORTAM = "JEV_KAYIT"


def _ortam_yolu(yol):
    """JEV_KAYIT: mutlak, .jsonl uzantılı; dosyanın kendisi sembolik bağ olamaz.

    Üst dizinlerde sembolik bağa izin verilir (/mnt/project-files bir bağ olabilir);
    dosyanın kendisi ayrıca O_NOFOLLOW ile açılır."""
    hata = ValueError("JEV_KAYIT mutlak ve .jsonl uzantılı bir dosya yolu olmalı.")
    if not os.path.isabs(yol) or not yol.endswith(".jsonl"):
        raise hata
    if os.path.islink(yol) or ".." in yol.replace("\\", "/").split("/"):
        raise hata
    return yol


def varsayilan_yol():
    ortam = os.environ.get(ORTAM)
    if ortam:
        return _ortam_yolu(ortam)
    if os.path.isdir("/mnt/project-files"):
        return "/mnt/project-files/jev-kararlar/kararlar.jsonl"
    cihaz = ayar.varsayilan_cihaz_koku()
    if cihaz and os.path.isdir(cihaz):
        return os.path.join(cihaz, "kayit", "kararlar.jsonl")
    return os.path.join(os.path.expanduser("~"), ".jev-kararlar", "kararlar.jsonl")


def yol_coz(yol=None):
    return yol or varsayilan_yol()


def _suz(deger):
    """Gizli desene uyan metinleri özetle değiştirir."""
    if isinstance(deger, str):
        if metin_gizli_mi(deger):
            return "<gizli>"
        return deger
    if isinstance(deger, dict):
        return {_suz(k) if isinstance(k, str) else k: _suz(v) for k, v in deger.items()}
    if isinstance(deger, (list, tuple)):
        return [_suz(v) for v in deger]
    return deger


def ekle(karar_id, olay, alanlar=None, yol=None):
    kayit = {
        "zaman": datetime.now(timezone.utc).isoformat(),
        "karar_id": karar_id,
        "olay": olay,
    }
    for k, v in (alanlar or {}).items():
        if k not in ("zaman", "karar_id", "olay"):
            kayit[k] = v
    kayit = _suz(kayit)
    dosya = yol_coz(yol)
    dizin = os.path.dirname(dosya)
    if dizin:
        os.makedirs(dizin, exist_ok=True)
    bayrak = os.O_WRONLY | os.O_APPEND | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(dosya, bayrak, 0o600)
    with os.fdopen(fd, "a", encoding="utf-8") as f:
        f.write(json.dumps(kayit, ensure_ascii=False) + "\n")
    return kayit


def oku(yol=None):
    dosya = yol_coz(yol)
    kayitlar = []
    try:
        with open(dosya, "r", encoding="utf-8") as f:
            for satir in f:
                satir = satir.strip()
                if not satir:
                    continue
                try:
                    k = json.loads(satir)
                except ValueError:
                    continue
                if isinstance(k, dict) and "karar_id" in k and "olay" in k:
                    kayitlar.append(k)
    except FileNotFoundError:
        pass
    return kayitlar
