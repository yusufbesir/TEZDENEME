"""API anahtarlarım: oluştur (anahtar yalnızca bir kez gösterilir), listele, iptal et. Silme yoktur.
Yönetici tüm anahtarları görüp iptal edebilir; diğer roller yalnızca kendi anahtarlarını."""
from django import forms
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.core.exceptions import NON_FIELD_ERRORS
from django.db import transaction
from django.forms.utils import ErrorDict
from django.http import HttpResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST, require_safe

from .. import roller
from ..hiz import hiz_sinirlayici
from ..middleware import istemci_ip
from ..models import ApiAnahtari, KullaniciApiAyari, MFACihazi
from ..sayac import GirisDenemesi
from ..servisler import denetim_yaz
from .mfa import kod_dogrula
from .giris import DENETIM_KAYIT_SINIRI
from .yardimci import sayfalandir, yetki

KIMLIK_HATASI = "Parola veya doğrulama kodu hatalı; anahtar oluşturulmadı."
KILIT_MESAJI = "Çok fazla başarısız deneme yapıldı. Lütfen bir süre sonra tekrar deneyin."


class ParolaGirisiForm(forms.Form):
    durum = forms.ChoiceField(choices=[("ac", "ac"), ("kapat", "kapat")])
    parola = forms.CharField(strip=False, widget=forms.PasswordInput)


class ApiAnahtariForm(forms.Form):
    ad = forms.CharField(label="anahtar adı", max_length=100, help_text="Anahtarı tanımak için bir etiket (örn. “Muhasebe betiği”).")
    parola = forms.CharField(
        label="mevcut parola", strip=False, widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
        help_text="Anahtar oluşturmak için hesap parolanız gerekir.",
    )
    totp = forms.CharField(
        label="doğrulama kodu", required=False, max_length=32, strip=True,
        widget=forms.TextInput(attrs={"autocomplete": "one-time-code", "inputmode": "numeric"}),
        help_text="İki adımlı doğrulama açıksa authenticator uygulamasındaki 6 haneli kod zorunludur.",
    )


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


def _hatali_form(form, mesaj):
    """Parola/kod alanları geri doldurulmadan, yalnızca anahtar adı korunarak genel (alan belirtmeyen) hata ile yeni form."""
    yeni = ApiAnahtariForm(initial={"ad": form.cleaned_data.get("ad", "")})
    yeni._errors = ErrorDict()
    yeni._errors[NON_FIELD_ERRORS] = yeni.error_class([mesaj], error_class="nonfield")
    return yeni


def _form_sayfasi(request, form, durum=200):
    return render(request, "qr/panel/form.html", {"form": form, "baslik": "Yeni API anahtarı", "geri": "panel:api_anahtarlari"}, status=durum)


@yetki("qr.view_qrkod")
@sensitive_post_parameters("parola", "totp")
@never_cache
@require_http_methods(["GET", "POST"])
def olustur(request):
    """Yeni anahtar: mevcut parola (+ MFA etkinse geçerli TOTP) zorunlu. Böylece ele geçirilmiş bir oturum parolasız
    kalıcı API erişimi üretemez. Doğrulama panel girişiyle AYNI sayaçları (GirisDenemesi, "api-ayar" önekiyle
    parola_girisi_ayarla ile ortak) ve TOTP tekrar kullanım engelini (kod_dogrula) kullanır.
    Kullanıcı başına aktif anahtar üst sınırı: settings.API_AZAMI_ANAHTAR."""
    form = ApiAnahtariForm(request.POST or None)
    if request.method != "POST":
        return _form_sayfasi(request, form)
    # Parola/Argon2 doğrulamasından ÖNCE kullanıcı başına dakikalık sınır.
    if not hiz_sinirlayici.izin_ver(f"apianahtar-olustur|{request.user.pk}", settings.API_ANAHTAR_OLUSTURMA_HIZ_SINIRI):
        yanit = HttpResponse("Çok fazla anahtar oluşturma isteği. Lütfen bir dakika sonra tekrar deneyin.", status=429, content_type="text/plain; charset=utf-8")
        yanit["Retry-After"] = "60"
        return yanit
    if not form.is_valid():
        return _form_sayfasi(request, form)
    kullanici = request.user
    deneme = GirisDenemesi("api-ayar", kullanici.get_username(), istemci_ip(request), kullanici)
    if not deneme.say():
        return _form_sayfasi(request, _hatali_form(form, KILIT_MESAJI), 429)
    cihaz = MFACihazi.objects.filter(kullanici=kullanici, onayli=True).first()
    if not kullanici.check_password(form.cleaned_data["parola"]):
        neden = "mevcut parola yanlış"
    elif cihaz is not None and not kod_dogrula(cihaz.pk, form.cleaned_data["totp"]):
        neden = "parola doğru ama doğrulama kodu eksik/geçersiz"
    else:
        neden = None
    if neden:
        if deneme.sayi_ui <= DENETIM_KAYIT_SINIRI:
            denetim_yaz(request, "api_anahtari_olustur_basarisiz", kullanici, f"Anahtar oluşturma reddedildi: {neden}")
        if deneme.sinira_ulasti:
            return _form_sayfasi(request, _hatali_form(form, KILIT_MESAJI), 429)
        return _form_sayfasi(request, _hatali_form(form, KIMLIK_HATASI))  # parola mı kod mu yanlış: ayrım verilmez
    deneme.basarili()
    with transaction.atomic():
        # Aynı kullanıcının eşzamanlı iki isteği üst sınırı aşamasın: kullanıcı satırı kilitlenir, sayım kilit altında yapılır.
        get_user_model().objects.select_for_update().get(pk=kullanici.pk)
        aktif = ApiAnahtari.objects.filter(kullanici=kullanici, iptal_zamani__isnull=True).count()
        if aktif >= settings.API_AZAMI_ANAHTAR:
            return _form_sayfasi(request, _hatali_form(
                form, f"En fazla {settings.API_AZAMI_ANAHTAR} aktif API anahtarınız olabilir. Yenisini oluşturmak için kullanılmayan bir anahtarı iptal edin.",
            ), 400)
        kayit, duz = ApiAnahtari.uret(kullanici, form.cleaned_data["ad"].strip())
        denetim_yaz(request, "api_anahtari_olustur", kayit, f"“{kayit.ad}” oluşturuldu (önek {kayit.onek})")
    # Düz anahtar yalnızca bu yanıtta bulunur; oturuma/veritabanına yazılmaz, yönlendirme yapılmaz.
    return render(request, "qr/panel/api_anahtari_olusturuldu.html", {"kayit": kayit, "anahtar": duz})


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
@sensitive_post_parameters("parola")
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
