"""Link ağacı yönetimi: liste, oluştur, düzenle, ayrıntı (istatistik + öğe yönetimi), önizleme, çöp kutusu, ağaç QR'ı.

Kalıcı silme YOKTUR: ağaç yalnızca çöp kutusuna taşınır (servisler.agac_cope_tasi). Her düğme bir QRKod (kısa link) üzerinden geçer;
URL ile eklenen öğeler hızlı kısalt ile AYNI yoldan (HizliKisaltForm -> full_clean -> servisler.qr_kaydet) yeni `link` türünde
kısa link olarak oluşturulur. Sunucu hedef URL'yi yönlendirmede ve görüntülemede çağırmaz; yalnızca "başlık otomatik çek" ayarı açıkken
yeni kısa link oluşturulurken hedef sayfanın başlığı güvenli biçimde (baslik_cek: SSRF korumalı, 80/443, 3 sn) çekilir. Bu ağ çağrısı
transaction.atomic bloğunun ve satır kilitlerinin dışında yapılır.
"""
from collections import defaultdict
from datetime import timedelta

from django.contrib import messages
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST, require_safe

from .. import grafik
from ..hiz import qr_olusturma_hiz_siniri
from ..models import LinkAgaci, LinkAgaciOgesi, QRKod, Tarama
from ..servisler import (
    agac_cope_tasi, agac_copten_geri_yukle, agac_durum_degistir, agac_kisa_link_olustur, agac_oge_ekle,
    agac_oge_guncelle, agac_oge_sil, agac_oge_tasi, denetim_yaz, qr_kaydet, qr_png, qr_svg,
)
from ..yonlendirme import agac_stil_yaniti, gorunur_agac_ogeleri
from .formlar import HizliKisaltForm, LinkAgaciForm, LinkAgaciOgeEkleForm
from .qrler import guvenli_dosya_adi
from .yardimci import sayfalandir, yetki


def _getir(pk):
    return get_object_or_404(LinkAgaci, pk=pk)


def _degisiklik_yapilabilir(request, agac):
    """Çöp kutusundaki ağaçta değişiklik yapılamaz (önce geri yüklenir)."""
    if agac.durum == LinkAgaci.Durum.COP:
        messages.error(request, "Çöp kutusundaki ağaç değiştirilemez; önce geri yükleyin.")
        return False
    return True


@yetki("qr.view_linkagaci")
@require_safe
def agac_liste(request):
    sorgu = LinkAgaci.objects.annotate(oge_sayisi=Count("ogeler", distinct=True))
    q = (request.GET.get("q") or "").strip()
    if q:
        sorgu = sorgu.filter(Q(baslik__icontains=q) | Q(slug__icontains=q))
    if request.GET.get("durum") in LinkAgaci.Durum.values:
        sorgu = sorgu.filter(durum=request.GET["durum"])
    else:  # çöpteki ağaçlar yalnızca durum=cop filtresiyle görünür
        sorgu = sorgu.exclude(durum=LinkAgaci.Durum.COP)
    sayfa, sorgu_dizesi = sayfalandir(request, sorgu.order_by("-guncelleme", "-id"))
    return render(request, "qr/panel/link_agaci_liste.html", {
        "sayfa": sayfa, "sorgu_dizesi": sorgu_dizesi, "durumlar": LinkAgaci.Durum.choices, "f": request.GET,
        "ekleme_izni": request.user.has_perm("qr.add_linkagaci"),
    })


@yetki("qr.add_linkagaci")
@require_http_methods(["GET", "POST"])
def agac_olustur(request):
    form = LinkAgaciForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        try:
            with transaction.atomic():
                agac = form.save(commit=False)
                agac.olusturan = request.user
                agac.save()
                denetim_yaz(request, "agac_olustur", agac, f"{agac.slug} ({agac.get_durum_display()}) oluşturuldu")
        except ValidationError as hata:
            form.add_error(None, hata)
        except IntegrityError:
            form.add_error("slug", "Bu ağaç adresi zaten kullanılıyor.")
        else:
            messages.success(request, "Link ağacı oluşturuldu. Şimdi bağlantı ekleyebilirsiniz.")
            return redirect("panel:agac_detay", pk=agac.pk)
    return render(request, "qr/panel/form.html", {"form": form, "baslik": "Yeni link ağacı", "geri": "panel:agac_liste"})


@yetki("qr.change_linkagaci")
@require_http_methods(["GET", "POST"])
def agac_duzenle(request, pk):
    with transaction.atomic():
        agac = get_object_or_404(LinkAgaci.objects.select_for_update(), pk=pk)
        if not _degisiklik_yapilabilir(request, agac):
            return redirect("panel:agac_detay", pk=agac.pk)
        eski_durum = agac.durum
        form = LinkAgaciForm(request.POST or None, instance=agac)
        if request.method == "POST" and form.is_valid():
            degisen = [a for a in form.changed_data]
            try:
                kayit = form.save()
                if eski_durum != kayit.durum:
                    denetim_yaz(request, "agac_durum_degistir", kayit, f"{kayit.slug}: {eski_durum} → {kayit.durum}")
                diger = [a for a in degisen if a != "durum"]
                if diger:
                    ozet = ", ".join(diger)
                    denetim_yaz(request, "agac_duzenle", kayit, f"{kayit.slug} düzenlendi. Değişen alanlar: {ozet}")
            except ValidationError as hata:
                form.add_error(None, hata)
            else:
                messages.success(request, "Link ağacı güncellendi.")
                return redirect("panel:agac_detay", pk=agac.pk)
        return render(request, "qr/panel/form.html", {
            "form": form, "baslik": f"Link ağacını düzenle: {agac.baslik}", "geri": "panel:agac_detay", "geri_pk": agac.pk,
        })


def _tarama_sayisi_alt_sorgusu():
    return Subquery(
        Tarama.objects.filter(qr=OuterRef("qr_id"), bot=False).order_by().values("qr").annotate(c=Count("id")).values("c")
    )


@yetki("qr.view_linkagaci")
@require_safe
def agac_detay(request, pk):
    agac = _getir(pk)
    ogeler = list(
        agac.ogeler.select_related("qr", "qr__kampanya")
        .annotate(tiklama=Coalesce(_tarama_sayisi_alt_sorgusu(), Value(0))).order_by("sira", "id")
    )
    for oge in ogeler:
        oge.herkese_acik = oge.gorunur and oge.qr.durum == QRKod.Durum.AKTIF and oge.qr.zaman_durumu() == "gecerli"
    bugun = timezone.localdate()
    ilk = bugun - timedelta(days=29)
    gunluk = {
        g["gun"]: g["sayi"] for g in agac.goruntulemeler.filter(gun__gte=ilk, gun__lte=bugun).values("gun", "sayi")
    }
    seri = grafik.gunluk_seri(defaultdict(int, gunluk), 30)
    toplam = agac.goruntulemeler.aggregate(t=Coalesce(Sum("sayi"), Value(0)))["t"]
    degistirilebilir = request.user.has_perm("qr.change_linkagaci") and agac.durum != LinkAgaci.Durum.COP
    return render(request, "qr/panel/link_agaci_detay.html", {
        "agac": agac, "ogeler": ogeler, "toplam_goruntuleme": toplam, "son_30_gun": seri["toplam"],
        "grafik_svg": grafik.svg_cubuk_grafik(seri, agac.slug, olcu="görüntüleme", bot_notu=False),
        "ekle_formu": LinkAgaciOgeEkleForm(),
        "degistirilebilir": degistirilebilir,
        "cop_mu": agac.durum == LinkAgaci.Durum.COP,
        "degistirme_izni": request.user.has_perm("qr.change_linkagaci"),
        "kisa_link_izni": degistirilebilir and request.user.has_perm("qr.add_qrkod"),
        "linkler": QRKod.objects.filter(hedef_url=agac.mutlak_url).exclude(durum=QRKod.Durum.COP).order_by("kod_anahtari")[:20],
        "yayinda": agac.durum == LinkAgaci.Durum.YAYINDA,
    })


@yetki("qr.view_linkagaci")
@require_safe
def agac_onizle(request, pk):
    """Her durumdaki ağacı yalnızca giriş yapmış kullanıcıya gösterir (sayaç artmaz). Öğe filtresi herkese açık sayfayla aynıdır."""
    agac = _getir(pk)
    return render(request, "qr/genel/link_agaci.html", {
        "agac": agac, "ogeler": gorunur_agac_ogeleri(agac), "onizleme": True,
        "stil_adresi": f"/panel/link-agaclari/{agac.pk}/stil.css",
    })


@yetki("qr.view_linkagaci")
@require_safe
def agac_stil(request, pk):
    return agac_stil_yaniti(_getir(pk))


def _agac_gorseli(request, pk, tur):
    agac = _getir(pk)
    if agac.durum == LinkAgaci.Durum.COP:
        raise Http404
    if tur == "png":
        icerik, tip = qr_png(agac.mutlak_url), "image/png"
    else:
        icerik, tip = qr_svg(agac.mutlak_url), "image/svg+xml"
    yanit = HttpResponse(icerik, content_type=tip)
    ad = f"{guvenli_dosya_adi('agac-' + agac.slug)}.{tur}"
    yanit["Content-Disposition"] = f'{"attachment" if request.GET.get("indir") == "1" else "inline"}; filename="{ad}"'
    return yanit


@yetki("qr.view_linkagaci")
@require_safe
def agac_png(request, pk):
    return _agac_gorseli(request, pk, "png")


@yetki("qr.view_linkagaci")
@require_safe
def agac_svg(request, pk):
    return _agac_gorseli(request, pk, "svg")


# --- Durum ---

@yetki("qr.change_linkagaci")
@require_POST
def agac_durum(request, pk):
    agac = _getir(pk)
    yeni = request.POST.get("durum")
    if yeni not in (LinkAgaci.Durum.TASLAK, LinkAgaci.Durum.YAYINDA):
        messages.error(request, "Geçersiz durum.")
    else:
        try:
            agac = agac_durum_degistir(agac, yeni, request)
        except ValidationError as hata:
            messages.error(request, " ".join(hata.messages))
        else:
            messages.success(request, f"Ağaç durumu: {agac.get_durum_display()}.")
    return redirect("panel:agac_detay", pk=pk)


@yetki("qr.change_linkagaci")
@require_POST
def agac_cope_tasi_gorunumu(request, pk):
    agac = agac_cope_tasi(_getir(pk), request)
    messages.success(request, f"“{agac.baslik}” çöp kutusuna taşındı. Herkese açık adres artık 404 verir; geri yükleyebilirsiniz.")
    return redirect("panel:agac_liste")


@yetki("qr.change_linkagaci")
@require_POST
def agac_geri_yukle(request, pk):
    agac = agac_copten_geri_yukle(_getir(pk), request)
    messages.success(request, f"“{agac.baslik}” geri yüklendi (durum: {agac.get_durum_display()}).")
    return redirect("panel:agac_detay", pk=pk)


# --- Öğeler ---

def _url_formu_hazirla(url, etiket, ayni_hedef_onay):
    """Hızlı kısalt ile aynı form yolu: doğrulama + (ayar açıksa) başlık çekme ağ çağrısı + sıralı kod ayırma. `transaction.atomic`
    bloğunun DIŞINDA, ağaç satır kilidinden önce çağrılmalıdır. Hata varsa (None, None, [mesajlar]) döner."""
    veri = {"hedef_url": url, "baslik": etiket}
    if ayni_hedef_onay:
        veri["ayni_hedef_onay"] = "on"
    hf = HizliKisaltForm(veri)
    if not hf.is_valid():
        mesajlar = [str(h) for liste in hf.errors.values() for h in liste]
        return None, None, mesajlar or ["Adres geçersiz."]
    try:
        qr = hf.save(commit=False)
    except ValidationError as hata:
        return None, None, hata.messages
    hf.kaydet_hazirla()
    return hf, qr, []


def _kisa_linki_kaydet(request, hf, qr):
    """Hazırlanmış kısa linki kaydeder (çağıranın atomic bloğu içinde). Hata varsa (None, [mesajlar]) döner."""
    try:
        qr.full_clean()
        qr_kaydet(qr, request, not_metni="Link ağacından oluşturuldu")
    except ValidationError as hata:
        return None, hata.messages
    except IntegrityError:
        return None, ["Bu kısa kod zaten kullanılıyor, tekrar deneyin."]
    hf.uyarilari_goster(request)
    return qr, []


@yetki("qr.change_linkagaci")
@qr_olusturma_hiz_siniri
@require_POST
def agac_oge_ekle_gorunumu(request, pk):
    agac = _getir(pk)
    if not _degisiklik_yapilabilir(request, agac):
        return redirect("panel:agac_detay", pk=pk)
    form = LinkAgaciOgeEkleForm(request.POST)
    if not form.is_valid():
        for liste in form.errors.values():
            for hata in liste:
                messages.error(request, str(hata))
        return redirect("panel:agac_detay", pk=pk)
    qr, etiket = form.cleaned_data.get("qr"), form.cleaned_data.get("etiket", "")
    hazir = None
    if qr is None:
        if not request.user.has_perm("qr.add_qrkod"):
            messages.error(request, "Adresle yeni kısa link oluşturmak için QR ekleme yetkisi gerekir.")
            return redirect("panel:agac_detay", pk=pk)
        # Başlık çekme ağ çağrısı ve sıralı kod ayırma, atomic bloğun ve satır kilitlerinin DIŞINDA (ve kayıttan önce) yapılır.
        hf, yeni_qr, hatalar = _url_formu_hazirla(form.cleaned_data["url"], etiket, form.cleaned_data.get("ayni_hedef_onay"))
        if hf is None:
            for h in hatalar:
                messages.error(request, h)
            return redirect("panel:agac_detay", pk=pk)
        hazir = (hf, yeni_qr)
    try:
        with transaction.atomic():
            if hazir is not None:
                qr, hatalar = _kisa_linki_kaydet(request, *hazir)
                if qr is None:
                    for h in hatalar:
                        messages.error(request, h)
                    return redirect("panel:agac_detay", pk=pk)
            agac_oge_ekle(agac, qr, etiket, request)
    except ValidationError as hata:
        messages.error(request, " ".join(hata.messages))
    else:
        messages.success(request, "Bağlantı ağaca eklendi.")
    return redirect("panel:agac_detay", pk=pk)


def _oge_getir(pk, oge_pk):
    return get_object_or_404(LinkAgaciOgesi.objects.select_related("qr"), pk=oge_pk, agac_id=pk)


@yetki("qr.change_linkagaci")
@require_POST
def agac_oge_sil_gorunumu(request, pk, oge_pk):
    agac, oge = _getir(pk), _oge_getir(pk, oge_pk)
    if _degisiklik_yapilabilir(request, agac):
        agac_oge_sil(agac, oge, request)
        messages.success(request, "Bağlantı ağaçtan çıkarıldı (kısa link silinmedi).")
    return redirect("panel:agac_detay", pk=pk)


@yetki("qr.change_linkagaci")
@require_POST
def agac_oge_tasi_gorunumu(request, pk, oge_pk):
    agac, oge = _getir(pk), _oge_getir(pk, oge_pk)
    if _degisiklik_yapilabilir(request, agac):
        try:
            agac_oge_tasi(agac, oge, request.POST.get("yon", ""), request)
        except ValueError:
            messages.error(request, "Geçersiz yön.")
    return redirect("panel:agac_detay", pk=pk)


@yetki("qr.change_linkagaci")
@require_POST
def agac_oge_duzenle(request, pk, oge_pk):
    """Düğme yazısını değiştirir ve/veya görünürlüğü ayarlar (`gorunur=1|0`)."""
    agac, oge = _getir(pk), _oge_getir(pk, oge_pk)
    if _degisiklik_yapilabilir(request, agac):
        gorunur = {"1": True, "0": False}.get(request.POST.get("gorunur"))
        etiket = request.POST.get("etiket")
        try:
            agac_oge_guncelle(agac, oge, request, etiket=etiket, gorunur=gorunur)
        except ValidationError as hata:
            messages.error(request, " ".join(hata.messages))
        else:
            messages.success(request, "Bağlantı güncellendi.")
    return redirect("panel:agac_detay", pk=pk)


@yetki("qr.change_linkagaci", "qr.add_qrkod")
@qr_olusturma_hiz_siniri
@require_POST
def agac_kisa_link(request, pk):
    """Ağaç adresine giden (yalnızca kendi /l/<slug> adresi) yeni bir kısa link oluşturur."""
    agac = _getir(pk)
    try:
        qr = agac_kisa_link_olustur(agac, request)
    except ValidationError as hata:
        messages.error(request, " ".join(hata.messages))
        return redirect("panel:agac_detay", pk=pk)
    messages.success(request, f"Kısa link oluşturuldu: {qr.kisa_url}")
    return redirect("panel:qr_detay", pk=qr.pk)
