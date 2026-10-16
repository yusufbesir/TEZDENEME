"""TOTP tabanlı çok faktörlü doğrulama (MFA).

Akış: parola doğru → oturuma yalnızca "bekleyen" kayıt yazılır (login() ÇAĞRILMAZ) →
kod ekranı (kayıtlı cihaz) veya kurulum ekranı (MFA_ZORUNLU ve onaylı cihaz yok) →
kod doğruysa login(). Bekleyen kayıt 5 dakika geçerlidir.
"""
import base64
import hmac
import re
import time

import pyotp
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import get_user_model, login, update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from django.views.decorators.http import require_http_methods, require_POST

from ..hiz import giris_hiz_siniri
from ..middleware import istemci_ip
from ..models import GenelAyarlar, MFACihazi
from ..sayac import GirisDenemesi, tam_giris
from ..servisler import api_erisimini_kapat, denetim_yaz, kullanici_oturumlarini_sonlandir, qr_svg
from ..sifreleme import SifrelemeHatasi, belirec_bicimli_mi, coz, sifrele
from .yardimci import yetki

Kullanici = get_user_model()

OTURUM_ANAHTARI = "mfa_bekleyen"
BEKLEME_SURESI_SN = 300  # bekleyen durumun geçerlilik süresi (5 dk)
ADIM_SN = 30
HANE = 6
PENCERE = 1
GENEL_HATA = "Doğrulama kodu hatalı."
KURULUM_OTURUM_ANAHTARI = "mfa_kur_gizli"  # Hesabım > MFA kur akışında yalnızca o oturumda tutulan onaysız anahtar
SURE_DOLDU = "Oturum açma süresi doldu. Lütfen yeniden giriş yapın."
_KOD_DESENI = re.compile(r"^\d{6}$")


def _simdi():
    return time.time()


# --- Oturumdaki onaysız anahtar ---
# Onaysız TOTP anahtarı oturum tablosunda da düz metin durmasın diye oturuma şifreli yazılır.

def _oturuma_yaz(gizli):
    return sifrele(gizli)


def _oturumdan_oku(deger):
    """Oturumdaki değeri çözer; bozuk/çözülemeyen ya da eski (şifresiz) biçimde None döner (yeni anahtar üretilir)."""
    if not isinstance(deger, str) or not belirec_bicimli_mi(deger):
        return None
    try:
        return coz(deger)
    except SifrelemeHatasi:
        return None


# --- Kod doğrulama ---

def _normalle(kod):
    kod = re.sub(r"[\s-]", "", kod or "")
    return kod if _KOD_DESENI.match(kod) else ""


def _eslesen_adim(gizli, kod):
    """Kod gizli anahtarla (±PENCERE adım) eşleşiyorsa zaman adımını, yoksa None döndürür."""
    kod = _normalle(kod)
    if not kod or not gizli:  # gizli None: kayıt çözülemedi (şifreleme anahtarı kayıp/yanlış) -> hiçbir kod eşleşmez
        return None
    totp = pyotp.TOTP(gizli, digits=HANE, interval=ADIM_SN)
    simdiki = int(_simdi() // ADIM_SN)
    eslesen = None
    for adim in range(simdiki - PENCERE, simdiki + PENCERE + 1):
        if hmac.compare_digest(totp.at(adim * ADIM_SN), kod):
            eslesen = adim
    return eslesen


def kod_dogrula(cihaz_pk, kod):
    """Onaylı cihaz için kodu doğrular; doğruysa kullanılan zaman adımını kaydeder. Aynı adım ikinci kez kabul edilmez.
    select_for_update ile eşzamanlı iki istekten yalnızca biri başarılı olur."""
    if not _normalle(kod):
        return False
    with transaction.atomic():
        cihaz = MFACihazi.objects.select_for_update().filter(pk=cihaz_pk).first()
        if cihaz is None:
            return False
        eslesen = _eslesen_adim(cihaz.gizli_anahtar, kod)
        if eslesen is None or eslesen <= cihaz.son_kullanilan_adim:
            return False
        cihaz.son_kullanilan_adim = eslesen
        cihaz.save(update_fields=["son_kullanilan_adim"])
        return True


def kurulum_dogrula(kullanici, gizli, kod):
    """Onaysız anahtarı (oturumda tutulan) ilk kodla doğrular; doğruysa onaylı MFACihazi oluşturur/günceller.
    Veritabanında onaysız anahtar TUTULMAZ. Kullanıcıda bu arada onaylı cihaz oluştuysa (başka bir
    oturum önce kurduysa) bu anahtar geçersizdir ve False döner."""
    if not gizli:
        return False
    with transaction.atomic():
        Kullanici.objects.select_for_update().get(pk=kullanici.pk)  # aynı kullanıcı için kurulumları sıraya koy
        mevcut = MFACihazi.objects.filter(kullanici=kullanici).first()
        if mevcut is not None and mevcut.onayli:
            return False
        adim = _eslesen_adim(gizli, kod)
        if adim is None:
            return False
        MFACihazi.objects.update_or_create(
            kullanici=kullanici, defaults={"gizli_anahtar": gizli, "onayli": True, "son_kullanilan_adim": adim}
        )
        return True


def _kilit_yaniti(request, sablon, baglam):
    from .giris import kilit_yaniti

    return kilit_yaniti(request, sablon, baglam)


def _basarisiz_denetim(request, deneme, kullanici, ozet):
    """Başarısız MFA denetim kayıtları kilit penceresinde sınırlıdır (kayıt tablosu şişirilemesin)."""
    from .giris import DENETIM_KAYIT_SINIRI

    if deneme.sayi_ui <= DENETIM_KAYIT_SINIRI:
        denetim_yaz(request, "mfa_basarisiz", kullanici, ozet)


# --- Bekleyen durum ---

def bekleyen_baslat(request, kullanici, kurulum):
    from .giris import _guvenli_next

    request.session.cycle_key()
    veri = {"uid": kullanici.pk, "ts": int(_simdi()), "next": _guvenli_next(request), "kurulum": bool(kurulum)}
    if kurulum:
        # Onaysız TOTP anahtarı her bekleyen girişte yeniden üretilir ve yalnızca bu oturumda tutulur.
        veri["gizli"] = _oturuma_yaz(pyotp.random_base32())
    request.session[OTURUM_ANAHTARI] = veri


def bekleyen_al(request):
    """(kullanici, veri) döndürür; yok/süresi dolmuş/pasif kullanıcıda (None, None) ve kaydı siler."""
    veri = request.session.get(OTURUM_ANAHTARI)
    if not isinstance(veri, dict):
        return None, None
    try:
        gecen = _simdi() - int(veri["ts"])
        kullanici = Kullanici.objects.filter(pk=veri["uid"], is_active=True).first()
    except (KeyError, TypeError, ValueError):
        kullanici = None
        gecen = BEKLEME_SURESI_SN + 1
    if kullanici is None or gecen > BEKLEME_SURESI_SN or gecen < -5:
        request.session.pop(OTURUM_ANAHTARI, None)
        return None, None
    return kullanici, veri


def mfa_gerekli_mi(kullanici):
    """'dogrula' / 'kurulum' / None (MFA yok, normal giriş)."""
    cihaz = MFACihazi.objects.filter(kullanici=kullanici).first()
    if cihaz is not None and cihaz.onayli:
        return "dogrula"
    if settings.MFA_ZORUNLU:
        return "kurulum"
    return None


def girisi_tamamla(request, kullanici, hedef=""):
    """login() yalnızca burada çağrılır. Gidilecek adresi döndürür.
    hedef verilmezse bekleyen kayıttaki next kullanılır."""
    veri = request.session.pop(OTURUM_ANAHTARI, None) or {}
    if not hedef and isinstance(veri, dict):
        hedef = veri.get("next") or ""
    login(request, kullanici, backend="django.contrib.auth.backends.ModelBackend")  # oturum anahtarını yeniler
    tam_giris(kullanici.get_username(), kullanici)
    denetim_yaz(request, "giris_basarili", kullanici, f"{kullanici.get_username()} giriş yaptı")
    if hedef and url_has_allowed_host_and_scheme(hedef, allowed_hosts={request.get_host()}, require_https=request.is_secure()):
        return hedef
    return "panel:ana"


def _bekleyen_zorunlu(request, kurulum):
    kullanici, veri = bekleyen_al(request)
    if kullanici is None:
        messages.error(request, SURE_DOLDU)
        return None, None, redirect("panel:giris")
    if bool(veri.get("kurulum")) != kurulum:
        return None, None, redirect("panel:mfa_kurulum" if veri.get("kurulum") else "panel:mfa_dogrula")
    return kullanici, veri, None


# --- Giriş sırasındaki ekranlar ---

@sensitive_post_parameters("kod")
@giris_hiz_siniri
@never_cache
@require_http_methods(["GET", "POST"])
def dogrula(request):
    if request.user.is_authenticated:
        return redirect("panel:ana")
    kullanici, _veri, yonlendirme = _bekleyen_zorunlu(request, kurulum=False)
    if yonlendirme:
        return yonlendirme
    baglam = {"baslik": "İki adımlı doğrulama", "eylem": reverse("panel:mfa_dogrula")}
    if request.method == "POST":
        deneme = GirisDenemesi("mfa-deneme", kullanici.get_username(), istemci_ip(request), kullanici)
        if not deneme.say():
            return _kilit_yaniti(request, "qr/panel/mfa_kod.html", baglam)
        cihaz = MFACihazi.objects.filter(kullanici=kullanici, onayli=True).first()
        if cihaz is not None and kod_dogrula(cihaz.pk, request.POST.get("kod")):
            deneme.basarili()
            hedef = girisi_tamamla(request, kullanici)
            denetim_yaz(request, "mfa_basarili", kullanici, f"{kullanici.get_username()} MFA doğrulaması yaptı")
            return redirect(hedef)
        _basarisiz_denetim(request, deneme, kullanici, f"Kullanıcı: {kullanici.get_username()}")
        if deneme.sinira_ulasti:
            return _kilit_yaniti(request, "qr/panel/mfa_kod.html", baglam)
        return render(request, "qr/panel/mfa_kod.html", {**baglam, "hata": GENEL_HATA})
    return render(request, "qr/panel/mfa_kod.html", baglam)


def _kurulum_baglami(kullanici, gizli, eylem):
    marka = GenelAyarlar.al().marka_adi
    uri = pyotp.TOTP(gizli, digits=HANE, interval=ADIM_SN).provisioning_uri(name=kullanici.get_username(), issuer_name=f"{marka} QR Panel")
    svg = base64.b64encode(qr_svg(uri, olcek=6)).decode("ascii")
    return {"baslik": "İki adımlı doğrulamayı kur", "eylem": eylem, "qr_veri": "data:image/svg+xml;base64," + svg, "gizli_anahtar": gizli}


def _kurulum_onayla(request, kullanici, gizli):
    """İlk kod doğruysa onaylı cihazı oluşturur ve (True, None) döner; deneme sınırını uygular.
    Aksi halde (False, "kilit" | "hata")."""
    deneme = GirisDenemesi("mfa-deneme", kullanici.get_username(), istemci_ip(request), kullanici)
    if not deneme.say():
        return False, "kilit"
    if kurulum_dogrula(kullanici, gizli, request.POST.get("kod")):
        deneme.basarili()
        tam_giris(kullanici.get_username(), kullanici)
        return True, None
    _basarisiz_denetim(request, deneme, kullanici, f"Kurulum kodu hatalı; kullanıcı: {kullanici.get_username()}")
    return False, "kilit" if deneme.sinira_ulasti else "hata"


@sensitive_post_parameters("kod")
@giris_hiz_siniri
@never_cache
@require_http_methods(["GET", "POST"])
def kurulum(request):
    """Girişte (bekleyen durumda) zorunlu kurulum; ilk kod doğrulanınca giriş tamamlanır."""
    if request.user.is_authenticated:
        return redirect("panel:ana")
    kullanici, veri, yonlendirme = _bekleyen_zorunlu(request, kurulum=True)
    if yonlendirme:
        return yonlendirme
    if MFACihazi.objects.filter(kullanici=kullanici, onayli=True).exists():  # bu arada başka yerden kurulmuş
        messages.error(request, SURE_DOLDU)
        request.session.pop(OTURUM_ANAHTARI, None)
        return redirect("panel:giris")
    gizli = _oturumdan_oku(veri.get("gizli"))
    if not gizli:  # eski biçimli/çözülemeyen bekleyen kayıt
        gizli = pyotp.random_base32()
        veri["gizli"] = _oturuma_yaz(gizli)
        request.session[OTURUM_ANAHTARI] = veri
    baglam = _kurulum_baglami(kullanici, gizli, reverse("panel:mfa_kurulum"))
    if request.method == "POST":
        sonuc, durum = _kurulum_onayla(request, kullanici, gizli)
        if sonuc:
            hedef = girisi_tamamla(request, kullanici)
            denetim_yaz(request, "mfa_kuruldu", kullanici, f"{kullanici.get_username()} MFA kurdu")
            return redirect(hedef)
        if durum == "kilit":
            return _kilit_yaniti(request, "qr/panel/mfa_kurulum.html", baglam)
        return render(request, "qr/panel/mfa_kurulum.html", {**baglam, "hata": GENEL_HATA})
    return render(request, "qr/panel/mfa_kurulum.html", baglam)


# --- Hesabım ---

def _oturum_zorunlu(gorunum):
    return yetki()(gorunum)


@_oturum_zorunlu
def hesap(request):
    cihaz = MFACihazi.objects.filter(kullanici=request.user, onayli=True).first()
    return render(request, "qr/panel/hesap.html", {"mfa_acik": cihaz is not None, "mfa_zorunlu": settings.MFA_ZORUNLU})


@sensitive_post_parameters("kod")
@_oturum_zorunlu
@never_cache
@require_http_methods(["GET", "POST"])
def hesap_mfa_kur(request):
    cihaz = MFACihazi.objects.filter(kullanici=request.user).first()
    if cihaz is not None and cihaz.onayli:
        messages.info(request, "İki adımlı doğrulama zaten açık.")
        return redirect("panel:hesap")
    gizli = _oturumdan_oku(request.session.get(KURULUM_OTURUM_ANAHTARI))
    if not gizli:
        gizli = pyotp.random_base32()
        request.session[KURULUM_OTURUM_ANAHTARI] = _oturuma_yaz(gizli)  # yalnızca bu oturumda, şifreli tutulur
    baglam = _kurulum_baglami(request.user, gizli, reverse("panel:hesap_mfa_kur"))
    if request.method == "POST":
        sonuc, durum = _kurulum_onayla(request, request.user, gizli)
        if sonuc:
            request.session.pop(KURULUM_OTURUM_ANAHTARI, None)
            denetim_yaz(request, "mfa_kuruldu", request.user, f"{request.user.get_username()} MFA kurdu")
            messages.success(request, "İki adımlı doğrulama açıldı.")
            return redirect("panel:hesap")
        if durum == "kilit":
            return _kilit_yaniti(request, "qr/panel/mfa_kurulum.html", baglam)
        return render(request, "qr/panel/mfa_kurulum.html", {**baglam, "hata": GENEL_HATA})
    return render(request, "qr/panel/mfa_kurulum.html", baglam)


def _sifirla(request, hedef, ozet, koru_oturum=None):
    """MFA kaydını siler ve hedef kullanıcının (varsa `koru_oturum` hariç) bütün oturumlarını sonlandırır."""
    silinen, _ = MFACihazi.objects.filter(kullanici=hedef).delete()
    kullanici_oturumlarini_sonlandir(hedef, koru_anahtar=koru_oturum)
    denetim_yaz(request, "mfa_sifirlandi", hedef, ozet)
    api_erisimini_kapat(hedef, "MFA sıfırlandı", request)  # ele geçirilmiş oturum/cihazla açılmış API erişimi kalmasın
    return silinen


@sensitive_post_parameters("kod")
@_oturum_zorunlu
@never_cache
@require_http_methods(["GET", "POST"])
def hesap_mfa_sifirla(request):
    """Kendi MFA'sını sıfırlamak için mevcut kod gerekir."""
    cihaz = MFACihazi.objects.filter(kullanici=request.user, onayli=True).first()
    if cihaz is None:
        messages.info(request, "İki adımlı doğrulama açık değil.")
        return redirect("panel:hesap")
    baglam = {"baslik": "İki adımlı doğrulamayı kapat", "eylem": reverse("panel:hesap_mfa_sifirla"), "geri": "panel:hesap"}
    if request.method == "POST":
        deneme = GirisDenemesi("mfa-deneme", request.user.get_username(), istemci_ip(request), request.user)
        if not deneme.say():
            return _kilit_yaniti(request, "qr/panel/mfa_kod.html", baglam)
        if kod_dogrula(cihaz.pk, request.POST.get("kod")):
            deneme.basarili()
            tam_giris(request.user.get_username(), request.user)
            _sifirla(request, request.user, f"{request.user.get_username()} kendi MFA'sını sıfırladı", koru_oturum=request.session.session_key)
            messages.success(request, "İki adımlı doğrulama kapatıldı.")
            return redirect("panel:hesap")
        _basarisiz_denetim(request, deneme, request.user, f"Sıfırlama kodu hatalı; kullanıcı: {request.user.get_username()}")
        if deneme.sinira_ulasti:
            return _kilit_yaniti(request, "qr/panel/mfa_kod.html", baglam)
        return render(request, "qr/panel/mfa_kod.html", {**baglam, "hata": GENEL_HATA})
    return render(request, "qr/panel/mfa_kod.html", baglam)


@yetki("auth.change_user")
@require_http_methods(["GET", "POST"])
def kullanici_mfa_sifirla(request, pk):
    """Yönetici başka kullanıcının MFA'sını sıfırlar (GET: onay sayfası, POST: işlem)."""
    hedef = get_object_or_404(Kullanici, pk=pk)
    if hedef.is_superuser and not request.user.is_superuser:
        raise PermissionDenied
    if hedef.pk == request.user.pk:
        return redirect("panel:hesap_mfa_sifirla")  # kendisi için kod gerekir
    if request.method == "POST":
        with transaction.atomic():
            silinen = _sifirla(request, hedef, f"{request.user.get_username()}, {hedef.get_username()} kullanıcısının MFA'sını sıfırladı")
        messages.success(request, f"{hedef.get_username()} için MFA sıfırlandı." if silinen else f"{hedef.get_username()} için kayıtlı MFA yoktu.")
        return redirect("panel:kullanici_liste")
    return render(request, "qr/panel/mfa_sifirla_onay.html", {"hedef": hedef})


@sensitive_post_parameters("old_password", "new_password1", "new_password2")
@_oturum_zorunlu
@never_cache
@require_http_methods(["GET", "POST"])
def parola_degistir(request):
    form = PasswordChangeForm(request.user, request.POST or None)
    if request.method == "POST" and form.is_valid():
        with transaction.atomic():
            kullanici = form.save()
            denetim_yaz(request, "parola_degisti", kullanici, f"{kullanici.get_username()} parolasını değiştirdi")
        update_session_auth_hash(request, kullanici)
        messages.success(request, "Parolanız değiştirildi.")
        return redirect("panel:hesap")
    return render(request, "qr/panel/form.html", {"form": form, "baslik": "Parolayı değiştir", "geri": "panel:hesap"})
