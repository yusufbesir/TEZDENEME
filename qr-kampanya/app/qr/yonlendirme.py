"""Halka açık uçlar: QR yönlendirmesi (/k/<kod>), kampanya sayfaları (/s/<slug>) ve sağlık kontrolü.

Yönlendirme yolu bilinçli olarak hafif tutulur: bir indeksli okuma + bir ekleme.
Yönlendirme 302 ile yapılır (301 tarayıcıda önbelleğe alınır ve hedef
değişikliklerini bozar).
"""
import hashlib
import hmac
import logging
import re
from urllib.parse import unquote

from django.conf import settings
from django.db import connection
from django.db.models import Q
from django.http import Http404, HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.http import require_safe

from .dogrulama import url_gecerli_mi
from .hiz import hiz_sinirlayici
from .middleware import ip_anahtari, istemci_ip
from .models import GenelAyarlar, KampanyaSayfasi, QRKod, SayfaGorseli, Tarama

log = logging.getLogger(__name__)

BOT_DESENI = re.compile(
    r"bot|crawl|spider|slurp|preview|fetch|scan|monitor|curl|wget|python-requests|httpclient|"
    r"headless|lighthouse|facebookexternalhit|whatsapp|telegram|discord|skype|embedly",
    re.I,
)
TABLET_DESENI = re.compile(r"ipad|tablet|(android(?!.*mobile))", re.I)
MOBIL_DESENI = re.compile(r"mobi|iphone|ipod|android|windows phone", re.I)


def cihaz_turu(ua):
    if not ua or BOT_DESENI.search(ua):
        return Tarama.Cihaz.BOT
    if TABLET_DESENI.search(ua):
        return Tarama.Cihaz.TABLET
    if MOBIL_DESENI.search(ua):
        return Tarama.Cihaz.MOBIL
    if re.search(r"windows|macintosh|x11|linux", ua, re.I):
        return Tarama.Cihaz.MASAUSTU
    return Tarama.Cihaz.DIGER


def ziyaretci_ozeti(ip, ua, gun=None):
    """Günlük değişen tuzla takma adlı (pseudonymous) ziyaretçi özeti. Anonim değildir:
    aynı gün içinde aynı IP+UA aynı özeti verir ve SECRET_KEY'e sahip biri bilinen bir IP/UA
    çiftini doğrulayabilir. IP özetten doğrudan geri elde edilemez ve farklı günlerin
    özetleri birbiriyle eşleştirilemez. Gün, Europe/Istanbul yerel günüdür."""
    gun = gun or timezone.localdate()
    tuz = hmac.new(settings.SECRET_KEY.encode(), f"ziyaretci-{gun.isoformat()}".encode(), hashlib.sha256).digest()
    return hmac.new(tuz, f"{ip}|{ua}".encode(), hashlib.sha256).hexdigest()[:32]


def _bilgi_sayfasi(request, baslik, mesaj, durum=200):
    ayar = GenelAyarlar.al()
    yanit = render(request, "qr/genel/bilgi.html", {"baslik": baslik, "mesaj": mesaj, "ayar": ayar}, status=durum)
    yanit["Cache-Control"] = "no-store"
    return yanit


def _yonlendir(url):
    yanit = HttpResponseRedirect(url)
    yanit["Cache-Control"] = "no-store, max-age=0"
    yanit["Referrer-Policy"] = "no-referrer"
    return yanit


def _tarama_kaydet(request, qr, sonuc):
    if request.method == "HEAD":  # bağlantı önizleyicileri/izleme araçları: tarama sayılmaz
        return
    try:
        ua = request.META.get("HTTP_USER_AGENT", "")[:500]
        cihaz = cihaz_turu(ua)
        Tarama.objects.create(
            qr=qr,
            sonuc=sonuc,
            cihaz=cihaz,
            bot=cihaz == Tarama.Cihaz.BOT,
            ziyaretci_ozeti=ziyaretci_ozeti(istemci_ip(request), ua),
        )
    except Exception:  # İstatistik hatası yönlendirmeyi asla engellememeli.
        log.exception("Tarama kaydı yazılamadı (kod=%s)", qr.kisa_kod)


@require_safe
def qr_yonlendir(request, kod):
    if not hiz_sinirlayici.izin_ver(ip_anahtari(istemci_ip(request)), settings.YONLENDIRME_HIZ_SINIRI):
        return HttpResponse("Çok fazla istek. Lütfen biraz sonra tekrar deneyin.", status=429, content_type="text/plain; charset=utf-8")

    qr = (
        QRKod.objects.select_related("kampanya", "sayfa")
        .filter(kod_anahtari=QRKod.anahtar(kod))
        .first()
    )
    ayar = GenelAyarlar.al()
    if qr is None:
        return _bilgi_sayfasi(request, "Kod bulunamadı", ayar.bulunamadi_mesaj, durum=404)

    if qr.durum == QRKod.Durum.ARSIV:
        _tarama_kaydet(request, qr, Tarama.Sonuc.ARSIV)
        return _bilgi_sayfasi(request, "Kullanımda değil", ayar.pasif_mesaj, durum=410)
    if qr.durum == QRKod.Durum.PASIF:
        _tarama_kaydet(request, qr, Tarama.Sonuc.PASIF)
        return _bilgi_sayfasi(request, "Kullanımda değil", ayar.pasif_mesaj)

    zaman = qr.zaman_durumu()
    if zaman == "baslamadi":
        _tarama_kaydet(request, qr, Tarama.Sonuc.BASLAMADI)
        if ayar.baslamadi_url and url_gecerli_mi(ayar.baslamadi_url):
            return _yonlendir(ayar.baslamadi_url)
        return _bilgi_sayfasi(request, "Kampanya henüz başlamadı", ayar.baslamadi_mesaj)
    if zaman == "bitti":
        _tarama_kaydet(request, qr, Tarama.Sonuc.BITTI)
        for aday in (qr.bitis_sonrasi_url, ayar.bitti_url):
            if aday and url_gecerli_mi(aday):
                return _yonlendir(aday)
        return _bilgi_sayfasi(request, "Kampanya sona erdi", ayar.bitti_mesaj)

    if qr.hedef_turu == QRKod.HedefTuru.SAYFA and qr.sayfa_id:
        if qr.sayfa.durum != KampanyaSayfasi.Durum.YAYINDA:
            _tarama_kaydet(request, qr, Tarama.Sonuc.PASIF)
            return _bilgi_sayfasi(request, "Kullanımda değil", ayar.pasif_mesaj)
        _tarama_kaydet(request, qr, Tarama.Sonuc.YONLENDI)
        return _yonlendir(f"/s/{qr.sayfa.slug}")

    # Kayıtlı hedef her seferinde yeniden doğrulanır (savunma derinliği).
    if not url_gecerli_mi(qr.hedef_url):
        log.warning("Geçersiz hedef URL engellendi (kod=%s)", qr.kisa_kod)
        _tarama_kaydet(request, qr, Tarama.Sonuc.PASIF)
        return _bilgi_sayfasi(request, "Kullanımda değil", ayar.pasif_mesaj)
    _tarama_kaydet(request, qr, Tarama.Sonuc.YONLENDI)
    return _yonlendir(qr.hedef_url)


@require_safe
def sayfa_goster(request, slug):
    sayfa = get_object_or_404(KampanyaSayfasi.objects.prefetch_related("gorseller"), slug=slug)
    if sayfa.durum != KampanyaSayfasi.Durum.YAYINDA:
        raise Http404
    an = timezone.now()
    durum = "gecerli"
    if sayfa.baslangic and an < sayfa.baslangic:
        durum = "baslamadi"
    elif sayfa.bitis and an >= sayfa.bitis:
        durum = "bitti"
    return render(request, "qr/genel/sayfa.html", {"sayfa": sayfa, "zaman_durumu": durum, "ayar": GenelAyarlar.al()})


def _medya_adi(xuri):
    """X-Forwarded-Uri'den MEDIA_ROOT'a göreli dosya adı; güvenilmez/bozuk girdide None."""
    if not xuri:
        return None
    yol = xuri.split("#", 1)[0].split("?", 1)[0]
    yol = unquote(yol)  # Caddy de yolu bir kez çözer
    if "\x00" in yol or "\\" in yol or not yol.startswith("/medya/"):
        return None
    ad = yol[len("/medya/"):]
    parcalar = ad.split("/")
    if not ad or any(p in ("", ".", "..") for p in parcalar):
        return None
    return ad


def _medya_herkese_acik_mi(ad):
    """Ad, yayındaki bir sayfanın kapak/logo/galeri görseli mi? (sayfa_goster ile aynı yayın koşulu)"""
    yayinda = KampanyaSayfasi.Durum.YAYINDA
    if KampanyaSayfasi.objects.filter(durum=yayinda).filter(Q(kapak_gorseli=ad) | Q(logo=ad)).exists():
        return True
    return SayfaGorseli.objects.filter(sayfa__durum=yayinda, gorsel=ad).exists()


def medya_yetki(request):
    """Caddy forward_auth alt isteği (/ic/medya-yetki). 200 = dosya sunulabilir, 404 = hayır.
    Sır sızdırmamak için reddedilen her durumda 404 döner. Denetim kaydı yazmaz, oturum oluşturmaz."""

    def ret():
        yanit = HttpResponse(status=404)
        yanit["Cache-Control"] = "no-store"
        return yanit

    if request.method not in ("GET", "HEAD"):
        return ret()
    if request.META.get("HTTP_X_FORWARDED_METHOD", "").upper() not in ("GET", "HEAD"):
        return ret()
    ad = _medya_adi(request.META.get("HTTP_X_FORWARDED_URI", ""))
    if ad is None:
        return ret()
    izinli = _medya_herkese_acik_mi(ad)
    if not izinli:
        # login() yalnızca MFA doğrulaması (veya MFA gerekmiyorsa parola) sonrası çağrılır; bekleyen
        # MFA durumu oturum kullanıcısı sayılmaz. Bu yüzden is_authenticated panelin MFA kuralını yansıtır.
        k = request.user
        izinli = k.is_authenticated and k.is_active and k.has_perm("qr.view_kampanyasayfasi")
        if izinli:
            izinli = (
                KampanyaSayfasi.objects.filter(Q(kapak_gorseli=ad) | Q(logo=ad)).exists()
                or SayfaGorseli.objects.filter(gorsel=ad).exists()
            )
    if not izinli:
        return ret()
    yanit = HttpResponse(status=200)
    yanit["Cache-Control"] = "no-store"
    return yanit


@require_safe
def saglik(request):
    """Sağlık kontrolü: veritabanına erişilebiliyor mu? Ayrıntı sızdırmaz."""
    try:
        with connection.cursor() as imlec:
            imlec.execute("SELECT 1")
        return JsonResponse({"durum": "ok"})
    except Exception:
        log.exception("Sağlık kontrolü: veritabanı erişilemiyor")
        return JsonResponse({"durum": "hata"}, status=503)
