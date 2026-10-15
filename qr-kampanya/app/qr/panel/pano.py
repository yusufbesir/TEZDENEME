"""Pano (ana sayfa)."""
import json
from datetime import datetime, timedelta
from pathlib import Path

from django.conf import settings
from django.db.models import Count, Q
from django.shortcuts import render
from django.utils import timezone

from ..models import DenetimKaydi, GenelAyarlar, Kampanya, QRKod
from . import istatistik
from .yardimci import etkin_bitis_ekle, insan_boyutu, qr_bitis_q, tarih_araligi, yetki


UZAK_DOGRULAMA_ESIGI_GUN = 7


def _zaman_oku(deger):
    """ISO zaman metnini aware datetime'a çevirir; geçersizse None."""
    if not deger or not isinstance(deger, str):
        return None
    try:
        zaman = datetime.fromisoformat(deger)
    except ValueError:
        return None
    if timezone.is_naive(zaman):
        zaman = timezone.make_aware(zaman, timezone.get_current_timezone())
    return zaman


def uzak_kopya_uyarisi_gerekli(uzak_zamani):
    """Sunucu dışı kopya hiç doğrulanmamış veya 7 günden eskiyse True (eski yedekler bu durumda silinmez)."""
    zaman = _zaman_oku(uzak_zamani)
    return zaman is None or timezone.now() - zaman > timedelta(days=UZAK_DOGRULAMA_ESIGI_GUN)


def yedek_durumu():
    """Yedekleme betiğinin yazdığı JSON durum dosyasını okur (zaman, durum, dosya, boyut, yerel sayı,
    en eski yerel yedek, son uzak doğrulama zamanı)."""
    yol = Path(settings.YEDEK_DURUM_DOSYASI)
    try:
        veri = json.loads(yol.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {"var": False, "mesaj": "Henüz yedek bilgisi yok", "uzak_uyari": True}
    except (OSError, ValueError):
        return {"var": False, "mesaj": "Yedek durum dosyası okunamadı", "uzak_uyari": True}
    if not isinstance(veri, dict):
        return {"var": False, "mesaj": "Yedek durum dosyası okunamadı", "uzak_uyari": True}
    durum = str(veri.get("durum", ""))
    uzak = veri.get("uzak_dogrulama_zamani")
    sayi = veri.get("yerel_yedek_sayisi")
    return {
        "var": True,
        "zaman": str(veri.get("zaman", "")),
        "durum": durum,
        "basarili": durum.lower() in ("basarili", "başarılı", "ok", "tamam", "success"),
        "dosya": Path(str(veri.get("dosya", ""))).name,
        "boyut": insan_boyutu(veri.get("boyut")) if veri.get("boyut") not in (None, "") else "-",
        "yerel_sayi": sayi if isinstance(sayi, int) and not isinstance(sayi, bool) else None,
        "en_eski": str(veri["en_eski_yerel_yedek"]) if veri.get("en_eski_yerel_yedek") else "",
        "uzak_zaman": str(uzak) if uzak else "",
        "uzak_uyari": uzak_kopya_uyarisi_gerekli(uzak),
    }


@yetki("qr.view_qrkod")
def ana(request):
    an = timezone.now()
    ayar = GenelAyarlar.al()
    yaklasan_son = an + timedelta(days=ayar.yaklasan_bitis_gun)

    sayilar = QRKod.objects.aggregate(
        toplam=Count("id"),
        aktif=Count("id", filter=Q(durum=QRKod.Durum.AKTIF)),
        pasif=Count("id", filter=Q(durum=QRKod.Durum.PASIF)),
        arsiv=Count("id", filter=Q(durum=QRKod.Durum.ARSIV)),
    )
    aktif_kampanya = Kampanya.objects.filter(aktif=True).filter(Q(bitis__isnull=True) | Q(bitis__gt=an)).count()
    yaklasan_kampanya = Kampanya.objects.filter(aktif=True, bitis__gt=an, bitis__lte=yaklasan_son).order_by("bitis")
    dolmus_kampanya = Kampanya.objects.filter(aktif=True, bitis__lte=an).order_by("-bitis")[:20]

    aktif_qr = QRKod.objects.filter(durum=QRKod.Durum.AKTIF).select_related("kampanya")
    yaklasan_qr = aktif_qr.filter(qr_bitis_q(gt=an, lte=yaklasan_son)).order_by("bitis")[:20]
    dolmus_qr = aktif_qr.filter(qr_bitis_q(lte=an)).order_by("-bitis")[:20]

    bas, bit, bas_dt, bit_dt, uyarilar = tarih_araligi(request)
    return render(request, "qr/panel/ana.html", {
        "sayilar": sayilar,
        "aktif_kampanya": aktif_kampanya,
        "yaklasan_gun": ayar.yaklasan_bitis_gun,
        "yaklasan_kampanya": yaklasan_kampanya,
        "dolmus_kampanya": dolmus_kampanya,
        "yaklasan_qr": etkin_bitis_ekle(yaklasan_qr),
        "dolmus_qr": etkin_bitis_ekle(dolmus_qr),
        "tarama": istatistik.genel_toplam(bas_dt, bit_dt),
        "gunluk": istatistik.gunluk(bas, bit, bas_dt, bit_dt),
        "baslangic": bas,
        "bitis": bit,
        "uyarilar": uyarilar,
        "denetim": (
            DenetimKaydi.objects.select_related("kullanici").order_by("-zaman", "-id")[:10]
            if request.user.has_perm("qr.view_denetimkaydi") else None
        ),
        "yedek": yedek_durumu(),
    })
