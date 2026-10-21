"""Hızlı kısalt: tek URL kutusuyla kısa link (QR) oluşturma ve yer imi düğmesi (bookmarklet).

Kayıt YALNIZCA POST + CSRF ile yapılır; GET (yer imi düğmesinin açtığı `?url=&baslik=`) formu yalnızca önceden doldurur.
Doğrulama ve kayıt panelin QR formuyla aynı yoldan geçer (QRKodForm -> servisler.qr_kaydet; ayrılmış kod, aynı hedef
uyarısı + onay, oluşturma hız sınırı, otomatik başlık, sıralı kod).
"""
import json

from django.contrib import messages
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_http_methods, require_safe

from ..hiz import qr_olusturma_hiz_siniri
from ..models import QRKod
from ..servisler import qr_kaydet
from .formlar import HizliKisaltForm
from .yardimci import paylasim_baglantilari, yetki

ON_DOLDURMA_EN_FAZLA_URL = 2000
ON_DOLDURMA_EN_FAZLA_BASLIK = 300


def yer_imi_kodu(panel_adresi):
    """`javascript:` yer imi. Panelin MUTLAK adresi gömülür (json.dumps ile JS dizgesi olarak kaçırılır); sayfa adresi ve
    başlığı `?url=&baslik=` ile yeni pencerede açılır. Hiçbir şey kaydedilmez; kullanıcı panelde “Kısalt”a basar."""
    adres = json.dumps(panel_adresi)
    govde = (
        "(function(){var p=" + adres + ";"
        "var u=p+'?url='+encodeURIComponent(location.href)+'&baslik='+encodeURIComponent(document.title);"
        "window.open(u,'_blank','noopener,width=640,height=720');})();"
    )
    return "javascript:" + govde


def _on_doldurma(request):
    return {
        "hedef_url": (request.GET.get("url") or "")[:ON_DOLDURMA_EN_FAZLA_URL],
        "baslik": " ".join((request.GET.get("baslik") or "").split())[:ON_DOLDURMA_EN_FAZLA_BASLIK],
    }


def _sayfa_baglami(request, form):
    panel_adresi = request.build_absolute_uri(reverse("panel:hizli_kisalt"))
    return {"form": form, "yer_imi": yer_imi_kodu(panel_adresi)}


@yetki("qr.add_qrkod")
@qr_olusturma_hiz_siniri
@require_http_methods(["GET", "POST"])
def hizli_kisalt(request):
    if request.method == "POST":
        form = HizliKisaltForm(request.POST)
        if form.is_valid():
            qr = form.save(commit=False)
            form.kaydet_hazirla()
            try:
                qr.full_clean()
                qr_kaydet(qr, request, not_metni="Hızlı kısalt ile oluşturuldu")
            except ValidationError as hata:
                form.add_error(None, hata)
            except IntegrityError:
                form.add_error("kisa_kod", "Bu kısa kod zaten kullanılıyor.")
            else:
                messages.success(request, f"Kısa link oluşturuldu: {qr.kisa_kod}")
                form.uyarilari_goster(request)
                return redirect("panel:hizli_sonuc", pk=qr.pk)
    else:
        form = HizliKisaltForm(initial=_on_doldurma(request))
    return render(request, "qr/panel/hizli_kisalt.html", _sayfa_baglami(request, form))


@yetki("qr.add_qrkod", "qr.view_qrkod")
@require_safe
def hizli_sonuc(request, pk):
    qr = get_object_or_404(QRKod, pk=pk)
    return render(request, "qr/panel/hizli_sonuc.html", {
        "qr": qr, "form": HizliKisaltForm(),
        "paylasim": paylasim_baglantilari(qr.kisa_url, qr.baslik or qr.ad),
    })
