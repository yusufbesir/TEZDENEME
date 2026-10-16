"""API anahtarlarım: oluştur (anahtar yalnızca bir kez gösterilir), listele, iptal et. Silme yoktur.
Yönetici tüm anahtarları görüp iptal edebilir; diğer roller yalnızca kendi anahtarlarını."""
from django import forms
from django.contrib import messages
from django.db import transaction
from django.views.decorators.cache import never_cache
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST, require_safe

from .. import roller
from ..middleware import istemci_ip
from ..models import ApiAnahtari, KullaniciApiAyari
from ..sayac import GirisDenemesi
from ..servisler import denetim_yaz
from .yardimci import sayfalandir, yetki


class ParolaGirisiForm(forms.Form):
    durum = forms.ChoiceField(choices=[("ac", "ac"), ("kapat", "kapat")])
    parola = forms.CharField(strip=False, widget=forms.PasswordInput)


class ApiAnahtariForm(forms.Form):
    ad = forms.CharField(label="anahtar adı", max_length=100, help_text="Anahtarı tanımak için bir etiket (örn. “Muhasebe betiği”).")


def _yonetici_mi(kullanici):
    return roller.kullanici_rolu(kullanici) == roller.YONETICI


def _gorunen(kullanici):
    sorgu = ApiAnahtari.objects.select_related("kullanici")
    return sorgu if _yonetici_mi(kullanici) else sorgu.filter(kullanici=kullanici)


@yetki("qr.view_qrkod")
@require_safe
def liste(request):
    sayfa, sorgu_dizesi = sayfalandir(request, _gorunen(request.user).order_by("-olusturma", "-id"))
    ayar = KullaniciApiAyari.objects.filter(kullanici=request.user).first()
    return render(request, "qr/panel/api_anahtarlari.html", {
        "sayfa": sayfa, "sorgu_dizesi": sorgu_dizesi, "tumu": _yonetici_mi(request.user),
        "parola_girisi": bool(ayar and ayar.parola_girisi),
    })


@yetki("qr.view_qrkod")
@require_http_methods(["GET", "POST"])
def olustur(request):
    form = ApiAnahtariForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        with transaction.atomic():
            kayit, duz = ApiAnahtari.uret(request.user, form.cleaned_data["ad"].strip())
            denetim_yaz(request, "api_anahtari_olustur", kayit, f"“{kayit.ad}” oluşturuldu (önek {kayit.onek})")
        # Düz anahtar yalnızca bu yanıtta bulunur; oturuma/veritabanına yazılmaz, yönlendirme yapılmaz.
        return render(request, "qr/panel/api_anahtari_olusturuldu.html", {"kayit": kayit, "anahtar": duz})
    return render(request, "qr/panel/form.html", {"form": form, "baslik": "Yeni API anahtarı", "geri": "panel:api_anahtarlari"})


@yetki("qr.view_qrkod")
@require_http_methods(["GET", "POST"])
def iptal(request, pk):
    kayit = get_object_or_404(_gorunen(request.user), pk=pk)  # başkasının anahtarı: 404
    if request.method == "POST":
        with transaction.atomic():
            if kayit.iptal_zamani is None:
                kayit.iptal_zamani = timezone.now()
                kayit.save(update_fields=["iptal_zamani"])
                denetim_yaz(request, "api_anahtari_iptal", kayit, f"“{kayit.ad}” iptal edildi (önek {kayit.onek}; sahibi {kayit.kullanici.get_username()})")
                messages.success(request, "API anahtarı iptal edildi.")
            else:
                messages.info(request, "Bu anahtar zaten iptal edilmişti.")
        return redirect("panel:api_anahtarlari")
    return render(request, "qr/panel/api_anahtari_iptal_onay.html", {"kayit": kayit})


@yetki("qr.view_qrkod")
@never_cache
@require_POST
def parola_girisi_ayarla(request):
    """Kullanıcı kendi hesabı için API'de parola girişini açar/kapatır (POST + CSRF + mevcut parola)."""
    form = ParolaGirisiForm(request.POST)
    if not form.is_valid():
        messages.error(request, "Geçersiz istek.")
        return redirect("panel:api_anahtarlari")
    deneme = GirisDenemesi("api-ayar", request.user.get_username(), istemci_ip(request), request.user)
    if not deneme.say():
        messages.error(request, "Çok fazla başarısız deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.")
        return redirect("panel:api_anahtarlari")
    if not request.user.check_password(form.cleaned_data["parola"]):
        denetim_yaz(request, "api_parola_girisi_ayar_basarisiz", request.user, "Mevcut parola yanlış girildi")
        messages.error(request, "Parola hatalı; ayar değiştirilmedi.")
        return redirect("panel:api_anahtarlari")
    deneme.basarili()
    ac = form.cleaned_data["durum"] == "ac"
    with transaction.atomic():
        KullaniciApiAyari.objects.update_or_create(kullanici=request.user, defaults={"parola_girisi": ac})
        denetim_yaz(request, "api_parola_girisi_ac" if ac else "api_parola_girisi_kapat", request.user,
                    f"{request.user.get_username()} API parola girişini {'açtı' if ac else 'kapattı'}")
    messages.success(request, "API'de parola girişi açıldı." if ac else "API'de parola girişi kapatıldı.")
    return redirect("panel:api_anahtarlari")
