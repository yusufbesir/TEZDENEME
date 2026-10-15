"""Giriş / çıkış.

Akış: giris (parola) → giris_sonrasi_adim() → (MFA gerekiyorsa mfa.dogrula / mfa.kurulum) → ana.
login() yalnızca ikinci adım bittikten sonra (veya MFA gerekmiyorsa hemen) mfa.girisi_tamamla() içinde çağrılır.
"""
import hashlib
import unicodedata

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import logout
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import redirect, render
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_http_methods, require_POST

from ..hiz import giris_hiz_siniri
from ..middleware import istemci_ip
from ..sayac import GirisDenemesi, kullaniciyi_bul
from ..servisler import denetim_yaz

GENEL_HATA = "Kullanıcı adı veya parola hatalı."
KILIT_MESAJI = "Çok fazla başarısız deneme yapıldı. Lütfen bir süre sonra tekrar deneyin."


DENETIM_KAYIT_SINIRI = 3  # aynı (IP, kullanıcı adı) için kilit penceresinde yazılacak en çok "başarısız" denetim kaydı


def kullanici_adi_ozeti(kullanici_adi):
    """Denetim kaydı için kullanıcı adı: yalnızca var olan hesaplar açık yazılır. Var olmayan ad,
    yanlışlıkla yazılmış bir parola olabileceğinden yalnızca özeti (sha256 ilk 12) kaydedilir."""
    kullanici = kullaniciyi_bul(kullanici_adi)
    if kullanici is not None:
        return kullanici.get_username()[:150]  # gerçek kullanıcı adı (varyant yazımlar değil)
    return "bilinmeyen:" + hashlib.sha256(unicodedata.normalize("NFKC", (kullanici_adi or "").strip()).encode()).hexdigest()[:12]


def kilit_yaniti(request, sablon, baglam):
    yanit = render(request, sablon, {**baglam, "hata": KILIT_MESAJI}, status=429)
    yanit["Retry-After"] = str(settings.GIRIS_KILIT_SURESI_SN)
    return yanit


def _guvenli_next(request):
    hedef = request.POST.get("next") or request.GET.get("next") or ""
    if hedef and url_has_allowed_host_and_scheme(hedef, allowed_hosts={request.get_host()}, require_https=request.is_secure()):
        return hedef
    return ""


def giris_sonrasi_adim(request, kullanici):
    """Parola doğrulandıktan sonra gidilecek adres.
    MFA gerekiyorsa login() ÇAĞRILMAZ; oturuma yalnızca bekleyen kayıt yazılır ve kod/kurulum ekranına gidilir."""
    from . import mfa

    gerekli = mfa.mfa_gerekli_mi(kullanici)
    if gerekli is None:
        return mfa.girisi_tamamla(request, kullanici, _guvenli_next(request))
    mfa.bekleyen_baslat(request, kullanici, kurulum=(gerekli == "kurulum"))
    return "panel:mfa_kurulum" if gerekli == "kurulum" else "panel:mfa_dogrula"


@giris_hiz_siniri
@never_cache
@require_http_methods(["GET", "POST"])
def giris(request):
    if request.user.is_authenticated:
        return redirect("panel:ana")

    if request.method == "POST":
        kullanici_adi = request.POST.get("username", "")
        deneme = GirisDenemesi("giris-deneme", kullanici_adi, istemci_ip(request))
        # Kilit kontrolü ve sayma tek adımdır; reddedilirse parola doğrulaması (Argon2) hiç çalışmaz.
        if not deneme.say():
            return kilit_yaniti(request, "qr/panel/giris.html", {"form": AuthenticationForm(request), "next": _guvenli_next(request)})
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            deneme.basarili()
            return redirect(giris_sonrasi_adim(request, form.get_user()))
        ozet = kullanici_adi_ozeti(kullanici_adi)
        if deneme.sayi_ui <= DENETIM_KAYIT_SINIRI:
            denetim_yaz(request, "giris_basarisiz", None, f"Denenen kullanıcı adı: {ozet}")
        if deneme.sayi_ui == settings.GIRIS_DENEME_SINIRI:
            denetim_yaz(request, "giris_kilitlendi", None, f"Kullanıcı adı: {ozet}; {settings.GIRIS_KILIT_SURESI_SN} sn kilit")
        # Hesabın var olup olmadığını sızdırmamak için mesaj hep aynıdır.
        return render(request, "qr/panel/giris.html", {"form": AuthenticationForm(request), "hata": GENEL_HATA, "next": _guvenli_next(request), "kullanici_adi": kullanici_adi}, status=200)

    return render(request, "qr/panel/giris.html", {"form": AuthenticationForm(request), "next": _guvenli_next(request)})


@require_POST
def cikis(request):
    if request.user.is_authenticated:
        denetim_yaz(request, "cikis", None, f"{request.user.get_username()} çıkış yaptı")
        logout(request)
        messages.info(request, "Çıkış yaptınız.")
    return redirect("panel:giris")
