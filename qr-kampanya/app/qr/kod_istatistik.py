"""`/k/<kod>+` ve `/k/<kod>+all` istatistik sayfaları (YOURLS uyumlu).

- GenelAyarlar.herkese_acik_istatistik KAPALIYKEN (varsayılan): giriş yapmış ve qr.view_qrkod iznine sahip kullanıcı panel
  ayrıntısına yönlendirilir; diğer herkes (kod var olsa bile) kodun varlığını ele vermeyen 404 görür.
- AÇIKKEN: herkese açık sade sayfa (toplam tarama, son 30 gün grafiği, ülke/yönlendiren özeti). Hedef URL yalnızca
  GenelAyarlar.istatistikte_hedef_goster açıkken gösterilir. Bot taramaları her zaman hariçtir.
- Arşivdeki ve çöp kutusundaki kodlar için her zaman 404. Bu istekler tarama SAYILMAZ.
- `+all`: aynı hedefe (harici URL ya da aynı sistem sayfası) sahip, arşivde/çöpte olmayan tüm kodların toplamı.
- Gizlilik: yönlendiren site ve ülke tabloları YALNIZ son 30 günün taramalarından üretilir ve bu penceredeki insan taraması
  sayısı ESIK_TABLO (10) altındaysa hiç gösterilmez (az sayıda ziyaretçinin ayrıştırılmasını önler; yalnız toplam sayı görünür).
- Hesaplanan istatistik 60 sn önbelleklenir (varsayılan DatabaseCache; anahtar kod + `+all` bilgisi). Bu yüzden sayfa en fazla
  60 sn geriden gelir; ayarların (hedef göster, herkese açık) denetimi önbelleğe girmez, her istekte yapılır.
- Hız sınırı yönlendirmeyle aynıdır (aynı IP kovası, YONLENDIRME_HIZ_SINIRI).
"""
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.http import require_safe

from . import grafik
from .hiz import hiz_sinirlayici
from .middleware import ip_anahtari, istemci_ip
from .models import GenelAyarlar, KampanyaSayfasi, QRKod, Tarama
from .panel.istatistik import alan_ozeti

OZET_SATIR_SAYISI = 10
GORUNMEZ_DURUMLAR = (QRKod.Durum.ARSIV, QRKod.Durum.COP)
ESIK_TABLO = 10  # pencerede bundan az insan taraması varsa yönlendiren/ülke tabloları gösterilmez
TABLO_GUN = 30
ONBELLEK_SN = 60


def _bulunamadi(request, ayar):
    yanit = render(
        request, "qr/genel/bilgi.html", {"baslik": "Kod bulunamadı", "mesaj": ayar.bulunamadi_mesaj, "ayar": ayar}, status=404
    )
    yanit["Cache-Control"] = "no-store"
    return yanit


def _ayni_hedefli_kodlar(qr):
    """`+all` için kod kümesi: aynı harici URL'ye ya da aynı sistem sayfasına giden, görünür (arşiv/çöp dışı) kodlar."""
    sorgu = QRKod.objects.exclude(durum__in=GORUNMEZ_DURUMLAR)
    if qr.hedef_turu == QRKod.HedefTuru.HARICI and qr.hedef_url:
        return sorgu.filter(hedef_turu=QRKod.HedefTuru.HARICI, hedef_url=qr.hedef_url)
    if qr.hedef_turu == QRKod.HedefTuru.SAYFA and qr.sayfa_id:
        return sorgu.filter(hedef_turu=QRKod.HedefTuru.SAYFA, sayfa_id=qr.sayfa_id)
    return sorgu.filter(pk=qr.pk)


def _hedef_metni(qr):
    if qr.hedef_turu == QRKod.HedefTuru.SAYFA:
        if qr.sayfa_id and qr.sayfa.durum == KampanyaSayfasi.Durum.YAYINDA:
            return f"{settings.KISA_URL_TABANI}/s/{qr.sayfa.slug}"
        return ""
    return qr.hedef_url


def _istatistik_verisi(qr, tum):
    """Sayfanın ayardan bağımsız verisi; 60 sn önbelleklenir."""
    anahtar = f"kodist:{qr.pk}:{int(tum)}"
    veri = cache.get(anahtar)
    if veri is not None:
        return veri
    kod_sayisi = 1
    if tum:
        kodlar = _ayni_hedefli_kodlar(qr)
        taramalar = Tarama.objects.filter(qr__in=kodlar)
        kod_sayisi = kodlar.count()
    else:
        taramalar = Tarama.objects.filter(qr=qr)

    insan = taramalar.filter(bot=False)
    seri = grafik.seri(taramalar, "30g", bot_dahil=False)
    son_30 = taramalar.filter(zaman__gte=timezone.now() - timedelta(days=TABLO_GUN))
    tablolar_acik = son_30.filter(bot=False).count() >= ESIK_TABLO
    veri = {
        "kod_sayisi": kod_sayisi,
        "toplam": insan.count(),
        "son_30_gun": seri["toplam"],
        "grafik_svg": grafik.svg_cubuk_grafik(seri, f"{qr.kisa_kod} (son 30 gün)", False),
        "tablolar_acik": tablolar_acik,
        "yonlendirenler": [], "yon_bilinmeyen": 0, "ulkeler": [], "ulke_bilinmeyen": 0,
    }
    if tablolar_acik:
        veri["yonlendirenler"], veri["yon_bilinmeyen"] = alan_ozeti(son_30, "yonlendiren", False, OZET_SATIR_SAYISI)
        veri["ulkeler"], veri["ulke_bilinmeyen"] = alan_ozeti(son_30, "ulke", False, OZET_SATIR_SAYISI)
    cache.set(anahtar, veri, ONBELLEK_SN)
    return veri


@require_safe
def kod_istatistik(request, kod, tum=None):
    if not hiz_sinirlayici.izin_ver(ip_anahtari(istemci_ip(request)), settings.YONLENDIRME_HIZ_SINIRI):
        return HttpResponse("Çok fazla istek. Lütfen biraz sonra tekrar deneyin.", status=429, content_type="text/plain; charset=utf-8")

    ayar = GenelAyarlar.al()
    qr = QRKod.objects.select_related("sayfa").filter(kod_anahtari=QRKod.anahtar(kod)).first()

    if not ayar.herkese_acik_istatistik:
        k = request.user
        if qr is not None and k.is_authenticated and k.is_active and k.has_perm("qr.view_qrkod"):
            yanit = redirect("panel:qr_detay", pk=qr.pk)
            yanit["Cache-Control"] = "no-store"
            return yanit
        return _bulunamadi(request, ayar)

    if qr is None or qr.durum in GORUNMEZ_DURUMLAR:
        return _bulunamadi(request, ayar)

    veri = _istatistik_verisi(qr, bool(tum))
    yanit = render(request, "qr/genel/istatistik.html", {
        "ayar": ayar,
        "qr": qr,
        "tum": bool(tum),
        **veri,
        "hedef": _hedef_metni(qr) if ayar.istatistikte_hedef_goster else "",
        "hedef_goster": ayar.istatistikte_hedef_goster,
    })
    yanit["Cache-Control"] = "no-store"
    return yanit
