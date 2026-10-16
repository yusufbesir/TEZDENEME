"""Kimlik doğrulamalı JSON/XML API (`/api/v1/`, YOURLS uyumlu `action` parametresi). Ayrıntı: docs/API.md

Güvenlik kararları:
- Birincil kimlik doğrulama `Authorization: Bearer <anahtar>` başlığıdır. Sorgu dizesi/gövdede anahtar kabul
  edilmez (erişim günlüklerine sızmasın). İkincisi (kullanıcı başına KAPALI, kullanıcı açar): POST gövdesinde
  `username` + `password` (+ MFA etkinse `totp`); parola sorgu dizesinde kabul edilmez. Oturum çerezi kullanılmaz
  (CSRF muaf olmasının nedeni budur: tarayıcı çerezi bu uçta hiçbir yetki vermez). JSONP yoktur; tarayıcıdan
  erişim için API_CORS_KOKENLERI ile CORS vardır.
- Başarısız kimlik doğrulama IP başına, başarılı istekler anahtar başına paylaşımlı hız sayacıyla sınırlanır.
- Yetki anahtar sahibinin Django izinleridir; oluşturma panel formuyla (QRKodForm) AYNI doğrulamayı kullanır.
"""
import re
from dataclasses import dataclass
import xml.etree.ElementTree as ET
from datetime import timedelta
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import Count, Max, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .hiz import hiz_sinirlayici
from .middleware import ip_anahtari, istemci_ip
from .models import ApiAnahtari, KullaniciApiAyari, MFACihazi, QRKod, Tarama
from .panel.formlar import QRKodForm
from .panel.giris import DENETIM_KAYIT_SINIRI, kullanici_adi_ozeti
from .panel.mfa import kod_dogrula
from .sayac import GirisDenemesi
from .servisler import denetim_yaz, qr_kaydet

API_SURUMU = "1"
BICIMLER = ("json", "xml", "simple")
EYLEMLER = ("shorturl", "expand", "url-stats", "stats", "db-stats", "version")
SIMPLE_EYLEMLERI = ("shorturl", "expand")
FILTRELER = ("top", "bottom", "last", "rand")
VARSAYILAN_LIMIT, EN_FAZLA_LIMIT = 10, 100
# Anahtarın başlık dışında (sorgu dizesi/gövde) gönderilmesi: ad veya değer biçimi yakalanır.
YASAKLI_PARAMETRELER = {"api_key", "apikey", "api-key", "anahtar", "token", "access_token", "signature"}
# Sorgu dizesinde (günlüklere yazılır) asla kabul edilmeyen parola girişi alanları; yalnızca POST gövdesinde okunur.
YASAKLI_SORGU_PAROLA = {"password", "parola", "totp"}
ANAHTAR_BICIMI = re.compile(r"qrk_[0-9a-f]{12}_[A-Za-z0-9_-]{20,}")
XML_GECERSIZ = re.compile("[^\u0009\u000a\u000d -퟿-�\U00010000-\U0010ffff]")
# XML'de liste öğelerinin etiketi (etiket adları yalnızca koddan gelir, kullanıcı verisinden asla).
XML_OGE_ADI = {"links": "link", "kodlar": "kod"}
# Forma/panele göre alan adı -> API parametre adı (hata mesajlarında).
ALAN_ADLARI = {"hedef_url": "url", "kisa_kod": "keyword", "baslik": "title", "ad": "ad"}


@dataclass
class Kimlik:
    """İsteği yapan: anahtar ya da parola girişi. `kaynak` denetim kayıtlarına yazılır (gizli bilgi içermez)."""
    kullanici: object
    kaynak: str
    sayac: str


# --- Yanıt üretimi ---

def _xml_metin(deger):
    if deger is None:
        return ""
    if isinstance(deger, bool):
        return "true" if deger else "false"
    return XML_GECERSIZ.sub("", str(deger))


def _xml_ekle(ust, ad, deger):
    oge = ET.SubElement(ust, ad)
    if isinstance(deger, dict):
        for k, v in deger.items():
            _xml_ekle(oge, k, v)
    elif isinstance(deger, (list, tuple)):
        for v in deger:
            _xml_ekle(oge, XML_OGE_ADI.get(ad, "item"), v)
    else:
        oge.text = _xml_metin(deger)


def _bitir(yanit):
    yanit["Cache-Control"] = "no-store"
    yanit["X-Robots-Tag"] = "noindex, nofollow"
    return yanit


def _yanit(bicim, kod, mesaj, veri=None, basit=None):
    """Tutarlı yanıt: gövdedeki statusCode, HTTP durum kodu ile aynıdır."""
    govde = {"statusCode": kod, "status": "success" if kod < 400 else "fail", "message": mesaj}
    govde.update(veri or {})
    if bicim == "simple":
        metin = basit if (kod < 400 and basit is not None) else mesaj
        yanit = HttpResponse(metin, status=kod, content_type="text/plain; charset=utf-8")
    elif bicim == "xml":
        kok = ET.Element("result")
        for k, v in govde.items():
            _xml_ekle(kok, k, v)
        yanit = HttpResponse(
            ET.tostring(kok, encoding="utf-8", xml_declaration=True), status=kod, content_type="application/xml; charset=utf-8",
        )
    else:
        yanit = JsonResponse(govde, status=kod, json_dumps_params={"ensure_ascii": False})
    return _bitir(yanit)


def _hiz_yaniti(bicim, mesaj):
    yanit = _yanit(bicim, 429, mesaj)
    yanit["Retry-After"] = "60"
    return yanit


# --- Kimlik doğrulama ---

def _basarisiz_kimlik(request, bicim, mesaj):
    """Başarısız kimlik doğrulamayı IP başına sayar; sınır aşıldıysa 429, değilse 401."""
    if not hiz_sinirlayici.izin_ver("apibasarisiz|" + ip_anahtari(istemci_ip(request)), settings.API_BASARISIZ_HIZ_SINIRI):
        return _hiz_yaniti(bicim, "Çok fazla başarısız kimlik doğrulama denemesi. Lütfen bir dakika sonra tekrar deneyin.")
    yanit = _yanit(bicim, 401, mesaj)
    yanit["WWW-Authenticate"] = 'Bearer realm="api"'
    return yanit


def _parametre(request, ad):
    """POST gövdesi (form) önceliklidir, yoksa sorgu dizesi. Boşluklar kırpılır."""
    deger = request.POST.get(ad)
    if deger is None:
        deger = request.GET.get(ad)
    return (deger or "").strip()


def _anahtar_disarida_mi(request):
    for kaynak in (request.GET, request.POST):
        for ad, deger in kaynak.items():
            if ad.lower() in YASAKLI_PARAMETRELER or ANAHTAR_BICIMI.fullmatch(deger.strip()):
                return True
    return False


def _bearer_anahtar(request):
    baslik = request.META.get("HTTP_AUTHORIZATION", "")
    parcalar = baslik.split(None, 1)
    if len(parcalar) == 2 and parcalar[0].lower() == "bearer":
        return parcalar[1].strip()
    return ""


def _sorguda_parola_var_mi(request):
    return any(ad.lower() in YASAKLI_SORGU_PAROLA for ad in request.GET)


def _parola_girisi(request, bicim):
    """POST gövdesindeki username/password(/totp) ile kimlik doğrulama. (Kimlik, None) ya da (None, yanıt).

    Sıra: IP başına giriş hız sayacı (panel girişiyle ortak) -> kullanıcı+IP/IP/hesap deneme sayaçları ->
    Django authenticate (user_login_failed sinyali tetiklenir) -> kullanıcıya özel izin -> MFA (etkinse totp zorunlu)."""
    kullanici_adi, parola = request.POST.get("username", ""), request.POST.get("password", "")
    ip = istemci_ip(request)
    if not hiz_sinirlayici.izin_ver("giris|" + ip_anahtari(ip), settings.GIRIS_HIZ_SINIRI):
        return None, _hiz_yaniti(bicim, "Çok fazla giriş denemesi. Lütfen bir dakika sonra tekrar deneyin.")
    deneme = GirisDenemesi("api-deneme", kullanici_adi, ip)
    if not deneme.say():
        yanit = _hiz_yaniti(bicim, "Çok fazla başarısız deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.")
        yanit["Retry-After"] = str(settings.GIRIS_KILIT_SURESI_SN)
        return None, yanit

    def basarisiz(mesaj):
        if deneme.sayi_ui <= DENETIM_KAYIT_SINIRI:
            denetim_yaz(request, "api_giris_basarisiz", None, f"Denenen kullanıcı adı: {kullanici_adi_ozeti(kullanici_adi)}")
        if deneme.sinira_ulasti:
            return None, _hiz_yaniti(bicim, "Çok fazla başarısız deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.")
        yanit = _yanit(bicim, 401, mesaj)
        yanit["WWW-Authenticate"] = 'Bearer realm="api"'
        return None, yanit

    kullanici = authenticate(request, username=kullanici_adi, password=parola) if kullanici_adi and parola else None
    if kullanici is None:
        return basarisiz("Kullanıcı adı veya parola hatalı.")
    ayar = KullaniciApiAyari.objects.filter(kullanici=kullanici).first()
    if ayar is None or not ayar.parola_girisi:
        return None, _yanit(bicim, 403, "Bu hesapta API parola girişi kapalı. Panelde “API anahtarlarım” sayfasından açabilir veya API anahtarı kullanabilirsiniz.")
    cihaz = MFACihazi.objects.filter(kullanici=kullanici, onayli=True).first()
    if cihaz is not None:
        if not kod_dogrula(cihaz.pk, request.POST.get("totp", "")):
            return basarisiz("Kullanıcı adı veya parola hatalı ya da totp kodu eksik/geçersiz.")
    elif settings.MFA_ZORUNLU:
        return None, _yanit(bicim, 403, "İki adımlı doğrulama (MFA) zorunlu; önce panelden kurun.")
    deneme.basarili()
    request.user = kullanici
    denetim_yaz(request, "api_giris_basarili", kullanici, f"{kullanici.get_username()} API'ye parolayla giriş yaptı")
    return Kimlik(kullanici, "API, parola girişi", f"apiparola|{kullanici.pk}"), None


def _cors_kokenleri():
    return {k.strip().rstrip("/") for k in settings.API_CORS_KOKENLERI if k.strip() and k.strip() != "*"}


# --- Yardımcılar ---

def _kod_coz(deger):
    """Kısa kod ya da tam kısa bağlantı (…/k/<kod>) -> kod; çözülemezse None."""
    if not deger:
        return None
    if "/" in deger or ":" in deger:
        eslesme = re.fullmatch(r"/k/([^/]+)/?", urlsplit(deger).path)
        return eslesme.group(1) if eslesme else None
    return deger


def _hedef_adresi(qr):
    if qr.hedef_turu == QRKod.HedefTuru.SAYFA and qr.sayfa_id:
        return f"{settings.KISA_URL_TABANI}/s/{qr.sayfa.slug}"
    return qr.hedef_url


def _zaman(dt):
    return timezone.localtime(dt).isoformat() if dt else None


def _kod_ozeti(qr):
    return {
        "keyword": qr.kisa_kod, "shorturl": qr.kisa_url, "longurl": _hedef_adresi(qr),
        "title": qr.baslik, "durum": qr.durum,
    }


# --- Eylemler ---

def _eylem_shorturl(request, anahtar, bicim):
    kullanici = anahtar.kullanici
    if not hiz_sinirlayici.izin_ver(f"qrolustur|{kullanici.pk}", settings.QR_OLUSTURMA_HIZ_SINIRI):
        return _hiz_yaniti(bicim, "Çok fazla QR kod oluşturma isteği gönderdiniz. Lütfen bir dakika sonra tekrar deneyin.")
    url, keyword, title = _parametre(request, "url"), _parametre(request, "keyword"), _parametre(request, "title")
    if not url:
        return _yanit(bicim, 400, "url parametresi zorunludur.")
    form = QRKodForm({
        "kisa_kod": keyword, "ad": _parametre(request, "ad")[:200] or title[:200], "baslik": title,
        "tur": QRKod.Tur.DIGER, "hedef_turu": QRKod.HedefTuru.HARICI, "hedef_url": url, "durum": QRKod.Durum.AKTIF,
        "ayni_hedef_onay": "1" if _parametre(request, "force").lower() in ("1", "true", "on") else "",
    })
    if not form.is_valid():
        if form.ayni_hedef_kodlari and set(form.errors) <= {"__all__"}:
            return _yanit(
                bicim, 409,
                f"Bu hedef zaten şu kodlarda kullanılıyor: {', '.join(form.ayni_hedef_kodlari)}. Yine de oluşturmak için force=1 gönderin.",
                {"kodlar": list(form.ayni_hedef_kodlari)},
            )
        ayrintilar = []
        for alan, hatalar in form.errors.items():
            ad = ALAN_ADLARI.get(alan)
            ayrintilar.extend(f"{ad}: {h}" if ad else str(h) for h in hatalar)
        return _yanit(bicim, 400, " ".join(ayrintilar) or "Geçersiz istek.")
    qr = form.save(commit=False)
    if not qr.ad:
        qr.ad = qr.kisa_kod  # ad verilmedi: başlık da yoksa kısa koddan türet
    kaynak = anahtar.kaynak
    try:
        qr.full_clean()
        qr_kaydet(qr, request, not_metni=f"{kaynak} ile oluşturuldu", kaynak=kaynak)
    except ValidationError as hata:
        return _yanit(bicim, 400, " ".join(hata.messages))
    except IntegrityError:
        return _yanit(bicim, 400, "keyword: Bu kısa kod zaten kullanılıyor.")
    return _yanit(
        bicim, 200, "Kısa bağlantı oluşturuldu.",
        {"shorturl": qr.kisa_url, "keyword": qr.kisa_kod, "url": qr.hedef_url, "title": qr.baslik}, basit=qr.kisa_url,
    )


def _qr_bul(request, bicim):
    """(qr, None) ya da (None, hata_yaniti)."""
    ham = _parametre(request, "shorturl")
    if not ham:
        return None, _yanit(bicim, 400, "shorturl parametresi zorunludur.")
    kod = _kod_coz(ham)
    qr = QRKod.objects.select_related("sayfa").filter(kod_anahtari=QRKod.anahtar(kod)).first() if kod else None
    if qr is None:
        return None, _yanit(bicim, 404, "Kısa bağlantı bulunamadı.")
    return qr, None


def _eylem_expand(request, anahtar, bicim):
    qr, hata = _qr_bul(request, bicim)
    if hata:
        return hata
    return _yanit(bicim, 200, "success", _kod_ozeti(qr), basit=_hedef_adresi(qr))


def _eylem_url_stats(request, anahtar, bicim):
    qr, hata = _qr_bul(request, bicim)
    if hata:
        return hata
    toplam = Tarama.objects.filter(qr=qr).aggregate(
        hepsi=Count("id"), insan=Count("id", filter=Q(bot=False)), son=Max("zaman", filter=Q(bot=False)),
    )
    # Tekil tahmini: panel istatistiğiyle aynı yöntem (bot hariç, gün başına farklı ziyaretçi özeti toplamı).
    tekil = sum(
        g["farkli"] for g in Tarama.objects.filter(qr=qr, bot=False).annotate(gun=TruncDate("zaman")).values("gun")
        .annotate(farkli=Count("ziyaretci_ozeti", distinct=True)).order_by()
    )
    veri = _kod_ozeti(qr)
    veri.update({
        "tarama_toplam": toplam["hepsi"], "tarama_bot_haric": toplam["insan"], "tekil_tahmini": tekil,
        "son_tarama": _zaman(toplam["son"]), "olusturma": _zaman(qr.olusturma),
    })
    return _yanit(bicim, 200, "success", veri)


def _eylem_stats(request, anahtar, bicim):
    filtre = _parametre(request, "filter") or "top"
    if filtre not in FILTRELER:
        return _yanit(bicim, 400, f"Geçersiz filter. İzin verilenler: {', '.join(FILTRELER)}.")
    ham_limit = _parametre(request, "limit")
    if not ham_limit:
        limit = VARSAYILAN_LIMIT
    else:
        try:
            limit = int(ham_limit)
        except ValueError:
            limit = 0
        if not 1 <= limit <= EN_FAZLA_LIMIT:
            return _yanit(bicim, 400, f"limit 1 ile {EN_FAZLA_LIMIT} arasında bir tam sayı olmalı.")
    sorgu = QRKod.objects.select_related("sayfa").annotate(
        tarama_toplam=Count("taramalar"), tarama_bot_haric=Count("taramalar", filter=Q(taramalar__bot=False)),
    )
    siralama = {
        "top": ("-tarama_bot_haric", "kod_anahtari"), "bottom": ("tarama_bot_haric", "kod_anahtari"),
        "last": ("-olusturma", "-id"), "rand": ("?",),
    }[filtre]
    baglantilar = []
    for qr in sorgu.order_by(*siralama)[:limit]:
        oge = _kod_ozeti(qr)
        oge.update({"tarama_toplam": qr.tarama_toplam, "tarama_bot_haric": qr.tarama_bot_haric, "olusturma": _zaman(qr.olusturma)})
        baglantilar.append(oge)
    veri = {"links": baglantilar}
    veri.update(_genel_toplamlar())
    return _yanit(bicim, 200, "success", veri)


def _genel_toplamlar():
    t = Tarama.objects.aggregate(hepsi=Count("id"), insan=Count("id", filter=Q(bot=False)))
    return {"toplam_kod": QRKod.objects.count(), "toplam_tarama_bot_haric": t["insan"], "toplam_tarama_bot_dahil": t["hepsi"]}


def _eylem_db_stats(request, anahtar, bicim):
    return _yanit(bicim, 200, "success", _genel_toplamlar())


def _eylem_version(request, anahtar, bicim):
    # Uygulama sürümü projede tanımlı değildir; yalnızca API sürümü döner.
    return _yanit(bicim, 200, "success", {"version": API_SURUMU})


EYLEM_ISLEVLERI = {
    "shorturl": _eylem_shorturl, "expand": _eylem_expand, "url-stats": _eylem_url_stats,
    "stats": _eylem_stats, "db-stats": _eylem_db_stats, "version": _eylem_version,
}
EYLEM_IZINLERI = {
    "shorturl": "qr.add_qrkod", "expand": "qr.view_qrkod", "url-stats": "qr.view_qrkod",
    "stats": "qr.view_qrkod", "db-stats": "qr.view_qrkod", "version": None,
}


@csrf_exempt
def api_v1(request):
    """CORS başlıklarını (yalnızca API_CORS_KOKENLERI listesindeki köken için) saran dış kabuk."""
    kokenler = _cors_kokenleri()
    if request.method == "OPTIONS":
        yanit = _bitir(HttpResponse(status=204))
        yanit["Allow"] = "GET, POST, OPTIONS"
    else:
        yanit = _api_isle(request)
    if kokenler:
        yanit["Vary"] = "Origin"
        koken = request.META.get("HTTP_ORIGIN", "")
        if koken in kokenler:  # yıldız asla; Allow-Credentials yok (çerez/oturum bu uçta kullanılmaz)
            yanit["Access-Control-Allow-Origin"] = koken
            yanit["Access-Control-Expose-Headers"] = "Retry-After"
            if request.method == "OPTIONS":
                yanit["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
                yanit["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
                yanit["Access-Control-Max-Age"] = "600"
    return yanit


def _api_isle(request):
    """Tek uç: GET/POST. `action` parametresi eylemi seçer."""
    bicim = _parametre(request, "format").lower() or "json"
    jsonp = bicim == "jsonp" or "callback" in request.GET
    bicim_gecerli = bicim in BICIMLER
    if not bicim_gecerli:
        bicim = "json"
    if request.method not in ("GET", "POST"):
        yanit = _yanit(bicim, 405, "Yalnızca GET ve POST desteklenir.")
        yanit["Allow"] = "GET, POST, OPTIONS"
        return yanit

    if _anahtar_disarida_mi(request):
        return _basarisiz_kimlik(request, bicim, "API anahtarı yalnızca Authorization: Bearer başlığıyla gönderilebilir; sorgu dizesi ve gövde kabul edilmez. Açığa çıkan anahtarı iptal edin.")
    if _sorguda_parola_var_mi(request):
        return _basarisiz_kimlik(request, bicim, "Parola ve totp yalnızca POST gövdesinde gönderilebilir; sorgu dizesinde kabul edilmez.")
    ham_anahtar = _bearer_anahtar(request)
    if ham_anahtar or not (request.method == "POST" and "username" in request.POST and "password" in request.POST):
        kayit = ApiAnahtari.dogrula(ham_anahtar)
        if kayit is None:
            return _basarisiz_kimlik(request, bicim, "Kimlik doğrulama başarısız. Authorization: Bearer <anahtar> başlığı gerekli.")
        request.user = kayit.kullanici
        ApiAnahtari.objects.filter(pk=kayit.pk).filter(
            Q(son_kullanim__isnull=True) | Q(son_kullanim__lt=timezone.now() - timedelta(seconds=60))
        ).update(son_kullanim=timezone.now())
        kimlik = Kimlik(kayit.kullanici, f"API, anahtar {ApiAnahtari.BICIM_ONEKI}{kayit.onek}…", f"api|{kayit.pk}")
    else:
        kimlik, hata = _parola_girisi(request, bicim)
        if hata is not None:
            return hata
    if not hiz_sinirlayici.izin_ver(kimlik.sayac, settings.API_HIZ_SINIRI):
        return _hiz_yaniti(bicim, "Bu kimlik için dakikalık istek sınırı aşıldı. Lütfen bir dakika sonra tekrar deneyin.")

    if jsonp:
        return _yanit("json", 400, "JSONP desteklenmez. Tarayıcıdan erişim için CORS kullanın (API_CORS_KOKENLERI ile izinli köken tanımlanır).")
    if not bicim_gecerli:
        return _yanit("json", 400, f"Geçersiz format. İzin verilenler: {', '.join(BICIMLER)}.")
    eylem = _parametre(request, "action")
    if not eylem:
        return _yanit(bicim, 400, "action parametresi zorunludur.")
    if eylem not in EYLEMLER:
        return _yanit(bicim, 400, f"Bilinmeyen action. İzin verilenler: {', '.join(EYLEMLER)}.")
    if bicim == "simple" and eylem not in SIMPLE_EYLEMLERI:
        return _yanit(bicim, 400, "simple biçimi yalnızca shorturl ve expand eylemlerinde kullanılabilir.")
    if eylem == "shorturl" and request.method != "POST":
        yanit = _yanit(bicim, 405, "shorturl yalnızca POST ile çağrılabilir.")
        yanit["Allow"] = "POST"
        return yanit
    izin = EYLEM_IZINLERI[eylem]
    if izin and not kimlik.kullanici.has_perm(izin):
        return _yanit(bicim, 403, "Bu kimliğin sahibinin bu işlem için yetkisi yok.")
    return EYLEM_ISLEVLERI[eylem](request, kimlik, bicim)
