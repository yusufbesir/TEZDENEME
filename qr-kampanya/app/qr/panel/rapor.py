"""Raporlar: istatistik ve mükerrer/hatalı kayıt raporu."""
from django.db.models import Count
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.http import require_safe

from ..dogrulama import url_gecerli_mi
from ..models import KampanyaSayfasi, QRKod
from ..servisler import denetim_yaz
from . import istatistik
from .yardimci import etkin_bitis_ekle, qr_bitis_q, tablo_yaniti, tarih_araligi, yetki

EN_COK_SAYISI = 20
EKRANDA_EN_FAZLA = 200


@yetki("qr.view_tarama")
@require_safe
def istatistik_raporu(request):
    bas, bit, bas_dt, bit_dt, uyarilar = tarih_araligi(request)
    bot_dahil = request.GET.get("bot_dahil") == "1"
    tablolar = {ad: istatistik.satirlar(ad, bas_dt, bit_dt, bot_dahil) for ad in istatistik.BOYUTLAR}
    en_cok = tablolar["qr"][:EN_COK_SAYISI]

    bicim = request.GET.get("bicim")
    if bicim in ("csv", "xlsx"):
        ad = request.GET.get("tablo", "qr")
        if ad == "en_cok":
            satirlar, baslik = en_cok, "En çok taranan 20 kod"
        elif ad in tablolar:
            satirlar, baslik = tablolar[ad], istatistik.BOYUTLAR[ad][1] + " bazında"
        else:
            satirlar, baslik = tablolar["qr"], "QR bazında"
            ad = "qr"
        toplam_basligi = "Toplam tarama (bot dahil)" if bot_dahil else "Toplam tarama (bot hariç)"
        basliklar = ["Kod", "Ad", toplam_basligi, "Tahmini tekil ziyaret", "Bot taraması"]
        veri = [[s["kod"], s["ad"], s["toplam"], s["tekil"], s["bot"]] for s in satirlar]
        veri.append([])
        veri.append([f"Tarih aralığı: {bas.isoformat()} - {bit.isoformat()}"])
        veri.append([istatistik.TEKIL_UYARISI])
        denetim_yaz(request, "istatistik_disa_aktar", None, f"{ad}, {bicim}, {bas} - {bit}")
        return tablo_yaniti(bicim, f"istatistik-{ad}-{bas.isoformat()}-{bit.isoformat()}", baslik, basliklar, veri)

    bolumler = [
        (ad, istatistik.BOYUTLAR[ad][1], tablolar[ad][:EKRANDA_EN_FAZLA], len(tablolar[ad]) > EKRANDA_EN_FAZLA)
        for ad in istatistik.BOYUTLAR
    ]
    return render(request, "qr/panel/istatistik.html", {
        "baslangic": bas, "bitis": bit, "uyarilar": uyarilar, "bot_dahil": bot_dahil,
        "en_cok": en_cok, "bolumler": bolumler, "tekil_uyarisi": istatistik.TEKIL_UYARISI,
        "ekran_siniri": EKRANDA_EN_FAZLA,
    })


@yetki("qr.view_qrkod")
@require_safe
def hatali_kayitlar(request):
    """Mükerrer ve hatalı kayıt raporu."""
    an = timezone.now()
    aktif = QRKod.objects.filter(durum=QRKod.Durum.AKTIF).select_related("kampanya", "sayfa")

    tekrar_urller = list(
        aktif.filter(hedef_turu=QRKod.HedefTuru.HARICI).exclude(hedef_url="")
        .order_by().values("hedef_url").annotate(n=Count("id")).filter(n__gt=1).values_list("hedef_url", flat=True)
    )
    mukerrer = {}
    for qr in aktif.filter(hedef_url__in=tekrar_urller, hedef_turu=QRKod.HedefTuru.HARICI).order_by("hedef_url", "kisa_kod"):
        mukerrer.setdefault(qr.hedef_url, []).append(qr)

    gecersiz_hedef = [
        qr for qr in aktif.filter(hedef_turu=QRKod.HedefTuru.HARICI).order_by("kisa_kod").iterator()
        if not url_gecerli_mi(qr.hedef_url)
    ]
    yayinda_olmayan_sayfa = aktif.filter(hedef_turu=QRKod.HedefTuru.SAYFA).exclude(
        sayfa__durum=KampanyaSayfasi.Durum.YAYINDA
    ).order_by("kisa_kod")
    suresi_gecmis = aktif.filter(qr_bitis_q(lte=an)).order_by("kisa_kod")
    return render(request, "qr/panel/hatali.html", {
        "mukerrer": mukerrer.items(),
        "gecersiz_hedef": gecersiz_hedef,
        "yayinda_olmayan_sayfa": yayinda_olmayan_sayfa,
        "suresi_gecmis": etkin_bitis_ekle(suresi_gecmis),
    })
