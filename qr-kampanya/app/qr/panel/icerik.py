"""Kampanya, ürün, mağaza ve kampanya sayfası yönetimi. Silme yoktur
(yalnızca sayfa görselleri silinebilir)."""
from django.contrib import messages
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST, require_safe

from ..models import Kampanya, KampanyaSayfasi, Magaza, SayfaGorseli, Urun
from ..servisler import denetim_yaz
from .formlar import KampanyaForm, KampanyaSayfasiForm, MagazaForm, UrunForm
from .yardimci import sayfalandir, yetki


def _evet_hayir(deger):
    return "Aktif" if deger else "Pasif"


def _tarih(dt):
    return timezone.localtime(dt).strftime("%d.%m.%Y %H:%M") if dt else "-"


def _degisen_ozet(form):
    alanlar = [a for a in form.changed_data]
    return "Değişen alanlar: " + ", ".join(alanlar) if alanlar else ""


def kaynak_gorunumleri(*, anahtar, model, form_sinifi, etiket, cogul, arama_alanlari, sutunlar):
    """Basit kaynaklar için liste/oluştur/düzenle görünümleri üretir.
    anahtar: URL adı öneki (örn. 'kampanya'); sutunlar: [(başlık, nesne→metin)]."""
    izin = model._meta.model_name

    @yetki(f"qr.view_{izin}")
    def liste(request):
        sorgu = model.objects.all()
        q = (request.GET.get("q") or "").strip()
        if q:
            kosul = Q()
            for alan in arama_alanlari:
                kosul |= Q(**{f"{alan}__icontains": q})
            sorgu = sorgu.filter(kosul)
        sayfa, sorgu_dizesi = sayfalandir(request, sorgu.order_by(*model._meta.ordering, "pk"))
        satirlar = [{"nesne": o, "hucreler": [fn(o) for _, fn in sutunlar]} for o in sayfa]
        return render(request, "qr/panel/kaynak_liste.html", {
            "baslik": cogul, "etiket": etiket, "anahtar": anahtar, "sayfa": sayfa, "sorgu_dizesi": sorgu_dizesi,
            "basliklar": [b for b, _ in sutunlar], "satirlar": satirlar, "f": request.GET,
            "ekleme_izni": request.user.has_perm(f"qr.add_{izin}"),
            "duzenleme_izni": request.user.has_perm(f"qr.change_{izin}"),
        })

    def _kaydet(request, form, yeni):
        with transaction.atomic():
            nesne = form.save()
            denetim_yaz(
                request, f"{anahtar}_{'olustur' if yeni else 'duzenle'}", nesne,
                f"{nesne} {'oluşturuldu' if yeni else 'düzenlendi'}. {'' if yeni else _degisen_ozet(form)}".strip(),
            )
        return nesne

    @yetki(f"qr.add_{izin}")
    @require_http_methods(["GET", "POST"])
    def olustur(request):
        form = form_sinifi(request.POST or None)
        if request.method == "POST" and form.is_valid():
            _kaydet(request, form, True)
            messages.success(request, f"{etiket} oluşturuldu.")
            return redirect(f"panel:{anahtar}_liste")
        return render(request, "qr/panel/form.html", {"form": form, "baslik": f"Yeni {etiket.lower()}", "geri": f"panel:{anahtar}_liste"})

    @yetki(f"qr.change_{izin}")
    @require_http_methods(["GET", "POST"])
    def duzenle(request, pk):
        nesne = get_object_or_404(model, pk=pk)
        form = form_sinifi(request.POST or None, instance=nesne)
        if request.method == "POST" and form.is_valid():
            _kaydet(request, form, False)
            messages.success(request, f"{etiket} güncellendi.")
            return redirect(f"panel:{anahtar}_liste")
        return render(request, "qr/panel/form.html", {"form": form, "baslik": f"{etiket} düzenle: {nesne}", "geri": f"panel:{anahtar}_liste"})

    return liste, olustur, duzenle


kampanya_liste, kampanya_olustur, kampanya_duzenle = kaynak_gorunumleri(
    anahtar="kampanya", model=Kampanya, form_sinifi=KampanyaForm, etiket="Kampanya", cogul="Kampanyalar",
    arama_alanlari=["kod", "ad"],
    sutunlar=[
        ("Kod", lambda o: o.kod), ("Ad", lambda o: o.ad),
        ("Başlangıç", lambda o: _tarih(o.baslangic)), ("Bitiş", lambda o: _tarih(o.bitis)),
        ("Durum", lambda o: _evet_hayir(o.aktif)),
    ],
)
urun_liste, urun_olustur, urun_duzenle = kaynak_gorunumleri(
    anahtar="urun", model=Urun, form_sinifi=UrunForm, etiket="Ürün", cogul="Ürünler",
    arama_alanlari=["kod", "ad"],
    sutunlar=[("Kod", lambda o: o.kod), ("Ad", lambda o: o.ad)],
)
magaza_liste, magaza_olustur, magaza_duzenle = kaynak_gorunumleri(
    anahtar="magaza", model=Magaza, form_sinifi=MagazaForm, etiket="Mağaza", cogul="Mağazalar",
    arama_alanlari=["kod", "ad", "adres"],
    sutunlar=[("Kod", lambda o: o.kod), ("Ad", lambda o: o.ad), ("Durum", lambda o: _evet_hayir(o.aktif))],
)


# --- Kampanya sayfaları ---

def sayfa_zaman_durumu(sayfa, an=None):
    an = an or timezone.now()
    if sayfa.baslangic and an < sayfa.baslangic:
        return "baslamadi"
    if sayfa.bitis and an >= sayfa.bitis:
        return "bitti"
    return "gecerli"


@yetki("qr.view_kampanyasayfasi")
def sayfa_liste(request):
    sorgu = KampanyaSayfasi.objects.select_related("kampanya")
    q = (request.GET.get("q") or "").strip()
    if q:
        sorgu = sorgu.filter(Q(baslik__icontains=q) | Q(slug__icontains=q))
    if request.GET.get("durum") in KampanyaSayfasi.Durum.values:
        sorgu = sorgu.filter(durum=request.GET["durum"])
    sayfa, sorgu_dizesi = sayfalandir(request, sorgu.order_by("-guncelleme", "-id"))
    return render(request, "qr/panel/sayfa_liste.html", {
        "sayfa": sayfa, "sorgu_dizesi": sorgu_dizesi, "durumlar": KampanyaSayfasi.Durum.choices, "f": request.GET,
        "ekleme_izni": request.user.has_perm("qr.add_kampanyasayfasi"),
        "duzenleme_izni": request.user.has_perm("qr.change_kampanyasayfasi"),
    })


def _sayfa_kaydet(request, form, yeni):
    with transaction.atomic():
        sayfa = form.save(commit=False)
        if yeni:
            sayfa.olusturan = request.user
        sayfa.degistiren = request.user
        sayfa.save()
        sira = sayfa.gorseller.count()
        for i, dosya in enumerate(form.cleaned_data.get("yeni_gorseller") or [], start=1):
            SayfaGorseli.objects.create(sayfa=sayfa, gorsel=dosya, sira=sira + i)
        eklenen = len(form.cleaned_data.get("yeni_gorseller") or [])
        ozet = f"{sayfa.slug} ({sayfa.get_durum_display()}) {'oluşturuldu' if yeni else 'düzenlendi'}"
        if not yeni and form.changed_data:
            ozet += ". Değişen alanlar: " + ", ".join(a for a in form.changed_data if a != "yeni_gorseller")
        if eklenen:
            ozet += f". {eklenen} görsel eklendi"
        denetim_yaz(request, "sayfa_olustur" if yeni else "sayfa_duzenle", sayfa, ozet)
    return sayfa


@yetki("qr.add_kampanyasayfasi")
@require_http_methods(["GET", "POST"])
def sayfa_olustur(request):
    form = KampanyaSayfasiForm(request.POST or None, request.FILES or None)
    if request.method == "POST" and form.is_valid():
        try:
            sayfa = _sayfa_kaydet(request, form, True)
        except ValidationError as hata:
            form.add_error(None, hata)
        else:
            messages.success(request, "Sayfa oluşturuldu.")
            return redirect("panel:sayfa_duzenle", pk=sayfa.pk)
    return render(request, "qr/panel/sayfa_form.html", {"form": form, "baslik": "Yeni kampanya sayfası", "sayfa": None})


@yetki("qr.change_kampanyasayfasi")
@require_http_methods(["GET", "POST"])
def sayfa_duzenle(request, pk):
    sayfa = get_object_or_404(KampanyaSayfasi, pk=pk)
    form = KampanyaSayfasiForm(request.POST or None, request.FILES or None, instance=sayfa)
    if request.method == "POST" and form.is_valid():
        try:
            _sayfa_kaydet(request, form, False)
        except ValidationError as hata:
            form.add_error(None, hata)
        else:
            messages.success(request, "Sayfa güncellendi.")
            return redirect("panel:sayfa_duzenle", pk=sayfa.pk)
    return render(request, "qr/panel/sayfa_form.html", {
        "form": form, "baslik": f"Sayfayı düzenle: {sayfa.baslik}", "sayfa": sayfa,
        "gorseller": sayfa.gorseller.all(),
    })


@yetki("qr.change_kampanyasayfasi")
@require_POST
def sayfa_gorsel_sil(request, pk, gorsel_pk):
    gorsel = get_object_or_404(SayfaGorseli, pk=gorsel_pk, sayfa_id=pk)
    sayfa = gorsel.sayfa
    with transaction.atomic():
        dosya_adi = gorsel.gorsel.name
        gorsel.gorsel.delete(save=False)
        gorsel.delete()
        denetim_yaz(request, "sayfa_gorsel_sil", sayfa, f"{sayfa.slug}: {dosya_adi} silindi")
    messages.success(request, "Görsel silindi.")
    return redirect("panel:sayfa_duzenle", pk=pk)


@yetki("qr.view_kampanyasayfasi")
@require_safe
def sayfa_onizle(request, pk):
    """Taslak dahil her durumdaki sayfayı yalnızca giriş yapmış kullanıcıya gösterir."""
    sayfa = get_object_or_404(KampanyaSayfasi.objects.prefetch_related("gorseller"), pk=pk)
    from ..models import GenelAyarlar

    return render(request, "qr/genel/sayfa.html", {
        "sayfa": sayfa, "zaman_durumu": sayfa_zaman_durumu(sayfa), "ayar": GenelAyarlar.al(), "onizleme": True,
    })
