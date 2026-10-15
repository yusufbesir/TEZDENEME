"""Pano (ana sayfa)."""
import json
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.db.models import Count, Q
from django.shortcuts import render
from django.utils import timezone

from ..models import DenetimKaydi, GenelAyarlar, Kampanya, QRKod
from . import istatistik
from .yardimci import etkin_bitis_ekle, insan_boyutu, qr_bitis_q, tarih_araligi, yetki


def yedek_durumu():
    """Yedekleme betiğinin yazdığı JSON durum dosyasını okur (zaman, durum, dosya, boyut)."""
    yol = Path(settings.YEDEK_DURUM_DOSYASI)
    try:
        veri = json.loads(yol.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {"var": False, "mesaj": "Henüz yedek bilgisi yok"}
    except (OSError, ValueError):
        return {"var": False, "mesaj": "Yedek durum dosyası okunamadı"}
    if not isinstance(veri, dict):
        return {"var": False, "mesaj": "Yedek durum dosyası okunamadı"}
    durum = str(veri.get("durum", ""))
    return {
        "var": True,
        "zaman": str(veri.get("zaman", "")),
        "durum": durum,
        "basarili": durum.lower() in ("basarili", "başarılı", "ok", "tamam", "success"),
        "dosya": Path(str(veri.get("dosya", ""))).name,
        "boyut": insan_boyutu(veri.get("boyut")) if veri.get("boyut") not in (None, "") else "-",
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
