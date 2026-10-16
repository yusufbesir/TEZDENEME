"""QR kod yönetimi: liste, oluştur, düzenle, detay, toplu işlem, görsel uçları, dışa aktarma.

Silme işlemi YOKTUR. Kayıt her zaman servisler.qr_kaydet, durum değişikliği
servisler.qr_durum_degistir ile yapılır (hedef geçmişi + denetim kaydı).
Sunucu hedef URL'yi ASLA çağırmaz; "hedefi test et" tarayıcıda yeni sekmede açılan bağlantıdır.
"""
import io
import re
import zipfile
from datetime import timedelta

from django.contrib import messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError
from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST, require_safe

from ..dogrulama import url_gecerli_mi
from ..hiz import qr_olusturma_hiz_siniri
from ..models import Kampanya, KampanyaSayfasi, Magaza, QRKod, Tarama
from ..servisler import denetim_yaz, qr_durum_degistir, qr_kaydet, qr_png, qr_svg
from .formlar import QRKodForm
from .yardimci import csv_yaz, paylasim_baglantilari, sayfalandir, tablo_yaniti, yerel_metin, yetki

TOPLU_EN_FAZLA = 1000
ISLEMLER = {
    "aktif": (QRKod.Durum.AKTIF, "aktif yapıldı"),
    "pasif": (QRKod.Durum.PASIF, "pasif yapıldı"),
    "arsivle": (QRKod.Durum.ARSIV, "arşivlendi"),
}


def guvenli_dosya_adi(ad):
    """Dosya adı olarak kullanılabilir güvenli ad (yol ayırıcı ve özel karakter yok)."""
    temiz = re.sub(r"[^A-Za-z0-9_-]", "_", str(ad or ""))[:80].strip("._")
    return temiz or "qr"


def hedef_metni(qr):
    """Kayıtlı hedefin okunabilir/tam adresi (dışa aktarma için)."""
    from django.conf import settings

    if qr.hedef_turu == QRKod.HedefTuru.SAYFA and qr.sayfa_id:
        return f"{settings.KISA_URL_TABANI}/s/{qr.sayfa.slug}"
    return qr.hedef_url


def qr_sorgusu(get):
    """Liste ve dışa aktarma için ortak arama/filtre."""
    sorgu = QRKod.objects.select_related("urun", "kampanya", "magaza", "sayfa")
    q = (get.get("q") or "").strip()
    if q:
        sorgu = sorgu.filter(
            Q(kisa_kod__icontains=q) | Q(ad__icontains=q) | Q(baslik__icontains=q)
            | Q(urun__ad__icontains=q) | Q(urun__kod__icontains=q)
            | Q(kampanya__ad__icontains=q) | Q(kampanya__kod__icontains=q)
            | Q(etiketler__icontains=q)
        )
    if get.get("tur") in QRKod.Tur.values:
        sorgu = sorgu.filter(tur=get["tur"])
    if get.get("durum") in QRKod.Durum.values:
        sorgu = sorgu.filter(durum=get["durum"])
    if (get.get("kampanya") or "").isdigit():
        sorgu = sorgu.filter(kampanya_id=int(get["kampanya"]))
    if (get.get("magaza") or "").isdigit():
        sorgu = sorgu.filter(magaza_id=int(get["magaza"]))
    return sorgu.order_by("-olusturma", "-id")


@yetki("qr.view_qrkod")
@require_safe
def qr_liste(request):
    sayfa, sorgu_dizesi = sayfalandir(request, qr_sorgusu(request.GET))
    return render(request, "qr/panel/qr_liste.html", {
        "sayfa": sayfa,
        "sorgu_dizesi": sorgu_dizesi,
        "turler": QRKod.Tur.choices,
        "durumlar": QRKod.Durum.choices,
        "kampanyalar": Kampanya.objects.order_by("ad"),
        "magazalar": Magaza.objects.order_by("ad"),
        "f": request.GET,
    })


@yetki("qr.view_qrkod")
@require_safe
def qr_disa_aktar(request):
    """Liste filtresine göre CSV/XLSX (?bicim=csv|xlsx)."""
    bicim = "xlsx" if request.GET.get("bicim") == "xlsx" else "csv"
    basliklar = [
        "Kısa kod", "Ad", "Başlık", "Tür", "Durum", "Kısa URL", "Hedef", "Kampanya", "Mağaza", "Ürün",
        "Başlangıç", "Bitiş", "Etiketler", "Oluşturulma",
    ]
    satirlar = (
        [
            q.kisa_kod, q.ad, q.baslik, q.get_tur_display(), q.get_durum_display(), q.kisa_url, hedef_metni(q),
            q.kampanya.ad if q.kampanya else "", q.magaza.ad if q.magaza else "", q.urun.ad if q.urun else "",
            yerel_metin(q.baslangic), yerel_metin(q.bitis), q.etiketler, yerel_metin(q.olusturma),
        ]
        for q in qr_sorgusu(request.GET).iterator()
    )
    denetim_yaz(request, "qr_liste_disa_aktar", None, f"Biçim: {bicim}")
    return tablo_yaniti(bicim, "qr-kodlar", "QR kodlar", basliklar, satirlar)


def _formu_kaydet(request, form, not_metni=""):
    """Form geçerliyse QR'ı servis üzerinden kaydeder. Başarılıysa nesneyi, değilse None döndürür."""
    qr = form.save(commit=False)
    try:
        qr.full_clean()
        qr_kaydet(qr, request, not_metni=not_metni)
    except ValidationError as hata:
        form.add_error(None, hata)
    except IntegrityError:
        form.add_error("kisa_kod", "Bu kısa kod zaten kullanılıyor.")
    else:
        return qr
    return None


@yetki("qr.add_qrkod")
@qr_olusturma_hiz_siniri
@require_http_methods(["GET", "POST"])
def qr_olustur(request):
    form = QRKodForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        qr = _formu_kaydet(request, form, form.cleaned_data.get("degisiklik_notu", ""))
        if qr:
            messages.success(request, f"QR kod oluşturuldu: {qr.kisa_kod}")
            form.uyarilari_goster(request)
            return redirect("panel:qr_detay", pk=qr.pk)
    return render(request, "qr/panel/form.html", {"form": form, "baslik": "Yeni QR kod", "geri": "panel:qr_liste"})


@yetki("qr.change_qrkod")
@require_http_methods(["GET", "POST"])
def qr_duzenle(request, pk):
    qr = get_object_or_404(QRKod, pk=pk)
    form = QRKodForm(request.POST or None, instance=qr)
    if request.method == "POST" and form.is_valid():
        kayit = _formu_kaydet(request, form, form.cleaned_data.get("degisiklik_notu", ""))
        if kayit:
            messages.success(request, "QR kod güncellendi.")
            form.uyarilari_goster(request)
            return redirect("panel:qr_detay", pk=qr.pk)
    return render(request, "qr/panel/form.html", {
        "form": form, "baslik": f"QR kodu düzenle: {qr.kisa_kod}", "geri": "panel:qr_detay", "geri_pk": qr.pk,
    })


@yetki("qr.view_qrkod")
@require_safe
def qr_detay(request, pk):
    qr = get_object_or_404(QRKod.objects.select_related("urun", "kampanya", "magaza", "sayfa"), pk=pk)
    otuz_gun = timezone.now() - timedelta(days=30)
    tarama = Tarama.objects.filter(qr=qr, zaman__gte=otuz_gun).aggregate(
        insan=Count("id", filter=Q(bot=False)), bot=Count("id", filter=Q(bot=True))
    )
    test_url = ""
    if qr.hedef_turu == QRKod.HedefTuru.HARICI and url_gecerli_mi(qr.hedef_url):
        test_url = qr.hedef_url
    elif qr.hedef_turu == QRKod.HedefTuru.SAYFA and qr.sayfa_id and qr.sayfa.durum == KampanyaSayfasi.Durum.YAYINDA:
        test_url = f"/s/{qr.sayfa.slug}"
    return render(request, "qr/panel/qr_detay.html", {
        "qr": qr,
        "tarama": tarama,
        "test_url": test_url,
        "zaman_durumu": qr.zaman_durumu(),
        "paylasim": paylasim_baglantilari(qr.kisa_url, qr.baslik or qr.ad),
        "gecmis": qr.hedef_gecmisi.select_related("kullanici", "eski_sayfa", "yeni_sayfa").order_by("-zaman", "-id")[:100],
    })


# --- Görsel uçları: içerik DAİMA kalıcı kısa adrestir (qr.kisa_url), hedef URL değil ---

def _gorsel_yaniti(request, pk, tur):
    qr = get_object_or_404(QRKod, pk=pk)
    if tur == "png":
        icerik, tip = qr_png(qr.kisa_url), "image/png"
    else:
        icerik, tip = qr_svg(qr.kisa_url), "image/svg+xml"
    yanit = HttpResponse(icerik, content_type=tip)
    ad = f"{guvenli_dosya_adi(qr.kisa_kod)}.{tur}"
    if request.GET.get("indir") == "1":
        yanit["Content-Disposition"] = f'attachment; filename="{ad}"'
    else:
        yanit["Content-Disposition"] = f'inline; filename="{ad}"'
    return yanit


@yetki("qr.view_qrkod")
@require_safe
def qr_png_gorunumu(request, pk):
    return _gorsel_yaniti(request, pk, "png")


@yetki("qr.view_qrkod")
@require_safe
def qr_svg_gorunumu(request, pk):
    return _gorsel_yaniti(request, pk, "svg")


# --- Toplu işlem ---

def _zip_yaniti(request, qrler):
    tampon = io.BytesIO()
    csv_tampon = io.StringIO()
    kullanilan = set()
    satirlar = []
    with zipfile.ZipFile(tampon, "w", zipfile.ZIP_DEFLATED) as arsiv:
        for qr in qrler:
            ad = guvenli_dosya_adi(qr.kisa_kod)
            if ad.lower() in kullanilan:  # savunma: farklı kodlar aynı dosya adına inemez
                ad = f"{ad}_{qr.pk}"
            kullanilan.add(ad.lower())
            arsiv.writestr(f"{ad}.png", qr_png(qr.kisa_url))
            arsiv.writestr(f"{ad}.svg", qr_svg(qr.kisa_url))
            satirlar.append([qr.kisa_kod, qr.ad, qr.kisa_url, hedef_metni(qr)])
        csv_yaz(csv_tampon, ["kisa_kod", "ad", "kisa_url", "hedef"], satirlar)
        arsiv.writestr("liste.csv", "﻿" + csv_tampon.getvalue())
    denetim_yaz(request, "qr_zip_indir", None, f"{len(satirlar)} kod ZIP olarak indirildi")
    yanit = HttpResponse(tampon.getvalue(), content_type="application/zip")
    yanit["Content-Disposition"] = 'attachment; filename="qr-kodlar.zip"'
    return yanit


@yetki("qr.view_qrkod")
@require_POST
def qr_toplu(request):
    islem = request.POST.get("islem", "")
    idler = {int(x) for x in request.POST.getlist("secili") if x.isdigit()}
    donus = request.POST.get("donus") or ""
    hedef = redirect("panel:qr_liste")
    if islem not in (*ISLEMLER, "zip"):
        messages.error(request, "Geçersiz işlem.")
        return hedef
    if not idler:
        messages.error(request, "Önce en az bir QR kod seçin.")
        return hedef
    if len(idler) > TOPLU_EN_FAZLA:
        messages.error(request, f"Tek seferde en fazla {TOPLU_EN_FAZLA} kod seçilebilir.")
        return hedef
    if islem != "zip" and not request.user.has_perm("qr.change_qrkod"):
        raise PermissionDenied

    qrler = list(QRKod.objects.filter(pk__in=idler).select_related("kampanya", "sayfa").order_by("kod_anahtari"))
    if not qrler:
        messages.error(request, "Seçilen kodlar bulunamadı.")
        return hedef
    if islem == "zip":
        return _zip_yaniti(request, qrler)

    yeni_durum, fiil = ISLEMLER[islem]
    if islem == "arsivle" and request.POST.get("onay") != "1":
        return render(request, "qr/panel/qr_arsiv_onay.html", {"qrler": qrler, "donus": donus})

    uygulanacak = []
    atlanan = []
    for qr in qrler:
        if yeni_durum != QRKod.Durum.ARSIV and qr.durum != yeni_durum:
            # Arşivden çıkarken hedef bilgisinin tutarlı olduğundan emin ol.
            eski_durum = qr.durum
            qr.durum = yeni_durum
            try:
                qr.full_clean()
            except ValidationError:
                atlanan.append(qr.kisa_kod)
                continue
            finally:
                qr.durum = eski_durum
        uygulanacak.append(qr)
    sayi = qr_durum_degistir(uygulanacak, yeni_durum, request)
    messages.success(request, f"{sayi} QR kod {fiil}.")
    if atlanan:
        messages.warning(request, "Hedef bilgisi eksik olduğu için atlandı: " + ", ".join(atlanan))
    if donus.isdigit():
        return redirect("panel:qr_detay", pk=int(donus))
    return hedef
