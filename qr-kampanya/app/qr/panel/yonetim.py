"""Genel ayarlar, kullanıcılar ve denetim kayıtları."""
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods, require_safe

from .. import roller
from ..models import DenetimKaydi, GenelAyarlar
from ..servisler import denetim_yaz
from .formlar import GenelAyarlarForm, KullaniciDuzenleForm, KullaniciOlusturForm
from .yardimci import sayfalandir, yetki

Kullanici = get_user_model()


@yetki("qr.change_genelayarlar")
@require_http_methods(["GET", "POST"])
def ayarlar(request):
    nesne = GenelAyarlar.al()
    form = GenelAyarlarForm(request.POST or None, instance=nesne)
    if request.method == "POST" and form.is_valid():
        with transaction.atomic():
            form.save()
            denetim_yaz(request, "ayarlar_degistir", nesne, "Değişen alanlar: " + (", ".join(form.changed_data) or "yok"))
        messages.success(request, "Genel ayarlar kaydedildi.")
        return redirect("panel:ayarlar")
    return render(request, "qr/panel/form.html", {"form": form, "baslik": "Genel ayarlar", "geri": "panel:ana"})


# --- Kullanıcılar ---

@yetki("auth.change_user")
def kullanici_liste(request):
    sorgu = Kullanici.objects.prefetch_related("groups").order_by("username")
    q = (request.GET.get("q") or "").strip()
    if q:
        sorgu = sorgu.filter(Q(username__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(email__icontains=q))
    sayfa, sorgu_dizesi = sayfalandir(request, sorgu)
    satirlar = [{"kullanici": k, "rol": roller.kullanici_rolu(k) or "Rol yok"} for k in sayfa]
    return render(request, "qr/panel/kullanici_liste.html", {"sayfa": sayfa, "satirlar": satirlar, "sorgu_dizesi": sorgu_dizesi, "f": request.GET})


@yetki("auth.change_user", "auth.add_user")
@require_http_methods(["GET", "POST"])
def kullanici_olustur(request):
    form = KullaniciOlusturForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        with transaction.atomic():
            kullanici = form.save()
            denetim_yaz(request, "kullanici_olustur", kullanici, f"{kullanici.get_username()} oluşturuldu; rol: {form.cleaned_data['rol']}")
        messages.success(request, "Kullanıcı oluşturuldu.")
        return redirect("panel:kullanici_liste")
    return render(request, "qr/panel/form.html", {"form": form, "baslik": "Yeni kullanıcı", "geri": "panel:kullanici_liste"})


@yetki("auth.change_user")
@require_http_methods(["GET", "POST"])
def kullanici_duzenle(request, pk):
    hedef = get_object_or_404(Kullanici, pk=pk)
    # Süper kullanıcıyı yalnızca süper kullanıcı değiştirebilir (yetki yükseltme/kilitleme riski).
    if hedef.is_superuser and not request.user.is_superuser:
        raise PermissionDenied
    form = KullaniciDuzenleForm(request.POST or None, instance=hedef, istek_kullanici=request.user)
    if request.method == "POST" and form.is_valid():
        with transaction.atomic():
            kullanici = form.save()
            denetim_yaz(
                request, "kullanici_duzenle", kullanici,
                f"{kullanici.get_username()}: rol={form.cleaned_data['rol']}, aktif={kullanici.is_active}",
            )
        messages.success(request, "Kullanıcı güncellendi.")
        return redirect("panel:kullanici_liste")
    return render(request, "qr/panel/form.html", {"form": form, "baslik": f"Kullanıcıyı düzenle: {hedef.get_username()}", "geri": "panel:kullanici_liste"})


# --- Denetim kayıtları (salt okunur) ---

@yetki("qr.view_denetimkaydi")
@require_safe
def denetim_liste(request):
    sorgu = DenetimKaydi.objects.select_related("kullanici")
    eylem = request.GET.get("eylem", "")
    kullanici = (request.GET.get("kullanici") or "").strip()
    if eylem:
        sorgu = sorgu.filter(eylem=eylem)
    if kullanici:
        sorgu = sorgu.filter(kullanici_adi__icontains=kullanici)
    sayfa, sorgu_dizesi = sayfalandir(request, sorgu.order_by("-zaman", "-id"))
    return render(request, "qr/panel/denetim.html", {
        "sayfa": sayfa, "sorgu_dizesi": sorgu_dizesi, "f": request.GET,
        "eylemler": DenetimKaydi.objects.order_by().values_list("eylem", flat=True).distinct().order_by("eylem"),
    })
