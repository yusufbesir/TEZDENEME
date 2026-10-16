"""QR kod yönetimi: liste, oluştur, düzenle, detay, toplu işlem, görsel uçları, dışa aktarma.

Kalıcı silme YOKTUR: "silme" yalnızca çöp kutusuna taşımadır (servisler.qr_cope_tasi). Kayıt her zaman servisler.qr_kaydet, durum değişikliği
servisler.qr_durum_degistir ile yapılır (hedef geçmişi + denetim kaydı).
Sunucu hedef URL'yi ASLA çağırmaz; "hedefi test et" tarayıcıda yeni sekmede açılan bağlantıdır.
"""
import io
import re
import zipfile
from datetime import datetime, time, timedelta
from urllib.parse import parse_qsl, urlencode

from django.contrib import messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError
from django.db.models import Count, OuterRef, Q, Subquery, Value
from django.db.models.functions import Coalesce
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST, require_safe

from ..dogrulama import url_gecerli_mi
from ..hiz import qr_olusturma_hiz_siniri
from ..models import Kampanya, KampanyaSayfasi, Magaza, QRKod, Tarama, Urun
from ..servisler import denetim_yaz, qr_cope_tasi, qr_copten_geri_yukle, qr_durum_degistir, qr_kaydet, qr_png, qr_svg
from .formlar import HizliDuzenleForm, QRKodForm
from .yardimci import _tarih, csv_yaz, paylasim_baglantilari, sayfalandir, tablo_yaniti, yerel_metin, yetki

TOPLU_EN_FAZLA = 1000
ISLEMLER = {
    "aktif": (QRKod.Durum.AKTIF, "aktif yapıldı"),
    "pasif": (QRKod.Durum.PASIF, "pasif yapıldı"),
    "arsivle": (QRKod.Durum.ARSIV, "arşivlendi"),
}


def guvenli_dosya_adi(ad):
    """Dosya adı olarak kullanılabilir güvenli ad (yol ayırıcı ve özel karakter yok)."""
    temiz = re.sub(r"[^A-Za-z0-9_-]", "_", str(ad or ""))[:80].strip("._")
    return temiz or "qr"


def hedef_metni(qr):
    """Kayıtlı hedefin okunabilir/tam adresi (dışa aktarma için)."""
    from django.conf import settings

    if qr.hedef_turu == QRKod.HedefTuru.SAYFA and qr.sayfa_id:
        return f"{settings.KISA_URL_TABANI}/s/{qr.sayfa.slug}"
    return qr.hedef_url


# Sıralama beyaz listesi: kullanıcı değeri ASLA doğrudan order_by'a gitmez; yalnızca bu anahtarlar kullanılır.
SIRALAMA_ALANLARI = {
    "kod": "kod_anahtari",
    "ad": "ad",
    "baslik": "baslik",
    "hedef": "hedef_url",
    "olusturma": "olusturma",
    "tarama": "tarama_sayisi",
}
VARSAYILAN_SIRALAMA = "olusturma"
VARSAYILAN_YON = "azalan"
SAYFA_BOYUTLARI = (25, 50, 100, 200)
VARSAYILAN_SAYFA_BOYUTU = 50
ARAMA_ALANLARI = {
    "kod": ("kisa_kod",),
    "ad": ("ad",),
    "baslik": ("baslik",),
    "hedef": ("hedef_url",),
}
SUTUNLAR = (("kod", "Kısa kod"), ("ad", "Ad"), ("baslik", "Başlık"), ("hedef", "Hedef"), ("tarama", "Tarama"), ("olusturma", "Oluşturulma"))


def siralama_secimi(get):
    """(sirala, yon): beyaz liste dışı ya da geçersiz değer varsayılana düşer."""
    sirala = get.get("sirala")
    sirala = sirala if sirala in SIRALAMA_ALANLARI else VARSAYILAN_SIRALAMA
    yon = get.get("yon")
    yon = yon if yon in ("artan", "azalan") else VARSAYILAN_YON
    return sirala, yon


def sayfa_boyutu_secimi(get):
    deger = (get.get("adet") or "").strip()
    return int(deger) if deger.isascii() and deger.isdigit() and int(deger) in SAYFA_BOYUTLARI else VARSAYILAN_SAYFA_BOYUTU


def _tam_sayi(deger):
    """Yalnızca ASCII rakamlardan oluşan makul büyüklükte değer (aksi halde None)."""
    deger = (deger or "").strip()
    return int(deger) if deger.isascii() and deger.isdigit() and len(deger) <= 9 else None


def _gun_basi(tarih):
    return timezone.make_aware(datetime.combine(tarih, time.min), timezone.get_current_timezone())


def qr_sorgusu(get):
    """Liste ve dışa aktarma için ortak arama/filtre/sıralama. Çöp kutusundaki kodlar yalnızca durum=cop filtresiyle görünür.
    Tarama sayısı (bot hariç) tek alt sorguyla hesaplanır (N+1 yok)."""
    tarama_sayisi = Subquery(
        Tarama.objects.filter(qr=OuterRef("pk"), bot=False).order_by().values("qr").annotate(c=Count("id")).values("c")
    )
    sorgu = QRKod.objects.select_related("urun", "kampanya", "magaza", "sayfa").annotate(
        tarama_sayisi=Coalesce(tarama_sayisi, Value(0))
    )
    q = (get.get("q") or "").strip()
    if q:
        alan = get.get("alan")
        if alan in ARAMA_ALANLARI:
            kosul = Q()
            for ad in ARAMA_ALANLARI[alan]:
                kosul |= Q(**{f"{ad}__icontains": q})
            sorgu = sorgu.filter(kosul)
        else:  # hepsi (varsayılan)
            sorgu = sorgu.filter(
                Q(kisa_kod__icontains=q) | Q(ad__icontains=q) | Q(baslik__icontains=q) | Q(hedef_url__icontains=q)
                | Q(urun__ad__icontains=q) | Q(urun__kod__icontains=q)
                | Q(kampanya__ad__icontains=q) | Q(kampanya__kod__icontains=q)
                | Q(etiketler__icontains=q)
            )
    if get.get("tur") in QRKod.Tur.values:
        sorgu = sorgu.filter(tur=get["tur"])
    if get.get("durum") in QRKod.Durum.values:
        sorgu = sorgu.filter(durum=get["durum"])
    else:
        sorgu = sorgu.exclude(durum=QRKod.Durum.COP)
    if (get.get("kampanya") or "").isdigit():
        sorgu = sorgu.filter(kampanya_id=int(get["kampanya"]))
    if (get.get("magaza") or "").isdigit():
        sorgu = sorgu.filter(magaza_id=int(get["magaza"]))
    if _tam_sayi(get.get("urun")) is not None:
        sorgu = sorgu.filter(urun_id=_tam_sayi(get["urun"]))
    en_az, en_cok = _tam_sayi(get.get("tarama_min")), _tam_sayi(get.get("tarama_max"))
    if en_az is not None:
        sorgu = sorgu.filter(tarama_sayisi__gte=en_az)
    if en_cok is not None:
        sorgu = sorgu.filter(tarama_sayisi__lte=en_cok)
    # Oluşturma tarihi (yerel gün): "sonra" bu gün dahil ve sonrası, "once" bu gün dahil ve öncesi; ikisi birlikte = arası.
    sonra, once = _tarih(get.get("sonra")), _tarih(get.get("once"))
    if sonra is not None:
        sorgu = sorgu.filter(olusturma__gte=_gun_basi(sonra))
    if once is not None:
        sorgu = sorgu.filter(olusturma__lt=_gun_basi(once + timedelta(days=1)))
    sirala, yon = siralama_secimi(get)
    alan_adi = SIRALAMA_ALANLARI[sirala]
    ifade = alan_adi if yon == "artan" else f"-{alan_adi}"
    return sorgu.order_by(ifade, "-id" if yon == "azalan" else "id")


def _baslik_baglantilari(get, sorgu_dizesi_olmadan):
    """Sütun başlıkları: tıklanınca o sütuna göre sıralar (aynı sütuna tekrar tıklanınca yön değişir). Diğer filtreler korunur."""
    sirala, yon = siralama_secimi(get)
    temel = [(k, v) for k, v in parse_qsl(sorgu_dizesi_olmadan, keep_blank_values=True) if k not in ("sirala", "yon", "sayfa_no")]
    sonuc = []
    for anahtar, etiket in SUTUNLAR:
        mevcut = anahtar == sirala
        sonraki = ("artan" if yon == "azalan" else "azalan") if mevcut else ("azalan" if anahtar in ("tarama", "olusturma") else "artan")
        sonuc.append({
            "etiket": etiket, "mevcut": mevcut, "yon": yon if mevcut else "",
            "isaret": ("▲" if yon == "artan" else "▼") if mevcut else "",
            "adres": "?" + urlencode(temel + [("sirala", anahtar), ("yon", sonraki)]),
        })
    return sonuc


@yetki("qr.view_qrkod")
@require_safe
def qr_liste(request):
    sayfa, sorgu_dizesi = sayfalandir(request, qr_sorgusu(request.GET), sayfa_boyutu_secimi(request.GET))
    sirala, yon = siralama_secimi(request.GET)
    return render(request, "qr/panel/qr_liste.html", {
        "sayfa": sayfa,
        "sorgu_dizesi": sorgu_dizesi,
        "turler": QRKod.Tur.choices,
        "durumlar": QRKod.Durum.choices,
        "kampanyalar": Kampanya.objects.order_by("ad"),
        "magazalar": Magaza.objects.order_by("ad"),
        "urunler": Urun.objects.order_by("ad"),
        "arama_alanlari": (("hepsi", "Hepsi"), ("kod", "Kısa kod"), ("ad", "Ad"), ("baslik", "Başlık"), ("hedef", "Hedef URL")),
        "sayfa_boyutlari": SAYFA_BOYUTLARI,
        "sayfa_boyutu": sayfa.paginator.per_page,
        "sirala": sirala, "yon": yon,
        "sirala_acik": request.GET.get("sirala") in SIRALAMA_ALANLARI,
        "basliklar": _baslik_baglantilari(request.GET, sorgu_dizesi),
        "sutun_sayisi": 11,
        "f": request.GET,
    })


@yetki("qr.view_qrkod")
@require_safe
def qr_disa_aktar(request):
    """Liste filtresine göre CSV/XLSX (?bicim=csv|xlsx)."""
    bicim = "xlsx" if request.GET.get("bicim") == "xlsx" else "csv"
    basliklar = [
        "Kısa kod", "Ad", "Başlık", "Tür", "Durum", "Kısa URL", "Hedef", "Kampanya", "Mağaza", "Ürün",
        "Başlangıç", "Bitiş", "Etiketler", "Oluşturulma",
    ]
    satirlar = (
        [
            q.kisa_kod, q.ad, q.baslik, q.get_tur_display(), q.get_durum_display(), q.kisa_url, hedef_metni(q),
            q.kampanya.ad if q.kampanya else "", q.magaza.ad if q.magaza else "", q.urun.ad if q.urun else "",
            yerel_metin(q.baslangic), yerel_metin(q.bitis), q.etiketler, yerel_metin(q.olusturma),
        ]
        for q in qr_sorgusu(request.GET).iterator()
    )
    denetim_yaz(request, "qr_liste_disa_aktar", None, f"Biçim: {bicim}")
    return tablo_yaniti(bicim, "qr-kodlar", "QR kodlar", basliklar, satirlar)


def _formu_kaydet(request, form, not_metni=""):
    """Form geçerliyse QR'ı servis üzerinden kaydeder. Başarılıysa nesneyi, değilse None döndürür."""
    qr = form.save(commit=False)
    try:
        qr.full_clean()
        qr_kaydet(qr, request, not_metni=not_metni)
    except ValidationError as hata:
        form.add_error(None, hata)
    except IntegrityError:
        form.add_error("kisa_kod", "Bu kısa kod zaten kullanılıyor.")
    else:
        return qr
    return None


@yetki("qr.add_qrkod")
@qr_olusturma_hiz_siniri
@require_http_methods(["GET", "POST"])
def qr_olustur(request):
    form = QRKodForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        qr = _formu_kaydet(request, form, form.cleaned_data.get("degisiklik_notu", ""))
        if qr:
            messages.success(request, f"QR kod oluşturuldu: {qr.kisa_kod}")
            form.uyarilari_goster(request)
            return redirect("panel:qr_detay", pk=qr.pk)
    return render(request, "qr/panel/form.html", {"form": form, "baslik": "Yeni QR kod", "geri": "panel:qr_liste"})


@yetki("qr.change_qrkod")
@require_http_methods(["GET", "POST"])
def qr_duzenle(request, pk):
    qr = get_object_or_404(QRKod, pk=pk)
    if qr.durum == QRKod.Durum.COP:
        messages.error(request, "Çöp kutusundaki kod düzenlenemez; önce geri yükleyin.")
        return redirect("panel:qr_detay", pk=qr.pk)
    form = QRKodForm(request.POST or None, instance=qr)
    if request.method == "POST" and form.is_valid():
        kayit = _formu_kaydet(request, form, form.cleaned_data.get("degisiklik_notu", ""))
        if kayit:
            messages.success(request, "QR kod güncellendi.")
            form.uyarilari_goster(request)
            return redirect("panel:qr_detay", pk=qr.pk)
    return render(request, "qr/panel/form.html", {
        "form": form, "baslik": f"QR kodu düzenle: {qr.kisa_kod}", "geri": "panel:qr_detay", "geri_pk": qr.pk,
    })


def _donus_adresi(request):
    """Listeye dönüş adresi: gönderilen sorgu dizesi (filtre/sıralama/sayfa) ayrıştırılıp yeniden kodlanır; yol her zaman panel listesidir."""
    sorgu = urlencode(parse_qsl(request.POST.get("donus_sorgu", "")[:2000], keep_blank_values=True)[:30])
    adres = reverse("panel:qr_liste")
    return f"{adres}?{sorgu}" if sorgu else adres


def _json_istegi_mi(request):
    return "application/json" in request.headers.get("Accept", "")


def _hizli_hata(request, mesaj_alanlari, durum):
    """mesaj_alanlari: {alan: [metin, ...]}. fetch ise JSON, değilse listeye dönüp mesaj gösterir."""
    if _json_istegi_mi(request):
        return JsonResponse({"ok": False, "hatalar": mesaj_alanlari}, status=durum)
    for alan, metinler in mesaj_alanlari.items():
        for metin in metinler:
            messages.error(request, metin if alan == "__all__" else f"{alan}: {metin}")
    return redirect(_donus_adresi(request))


@yetki("qr.change_qrkod")
@require_POST
def qr_hizli_duzenle(request, pk):
    """Listeden satır içi düzenleme: yalnızca ad, başlık ve (harici hedefli QR için) hedef URL.
    Doğrulama ve kayıt normal düzenlemeyle aynı yoldan geçer (HizliDuzenleForm -> full_clean -> servisler.qr_kaydet);
    hedef değişirse hedef geçmişi ve denetim kaydı yazılır. Arşiv/çöp durumundaki kayıt değiştirilemez."""
    qr = get_object_or_404(QRKod, pk=pk)
    if qr.durum in (QRKod.Durum.ARSIV, QRKod.Durum.COP):
        return _hizli_hata(request, {"__all__": ["Arşivdeki veya çöp kutusundaki kod düzenlenemez."]}, 409)
    form = HizliDuzenleForm(request.POST, instance=qr)
    if form.is_valid():
        degisti = form.has_changed()
        if degisti:
            kayit = form.save(commit=False)
            try:
                kayit.full_clean()
                qr_kaydet(kayit, request, not_metni="Listeden hızlı düzenleme")
            except ValidationError as hata:
                form.add_error(None, hata.messages)
            else:
                qr = kayit
    if form.errors:
        hatalar = {alan: [str(h) for h in liste] for alan, liste in form.errors.items()}
        return _hizli_hata(request, hatalar, 400)
    if _json_istegi_mi(request):
        return JsonResponse({
            "ok": True, "degisti": degisti, "ad": qr.ad, "baslik": qr.baslik,
            "hedef_url": qr.hedef_url if qr.hedef_turu == QRKod.HedefTuru.HARICI else None,
            "uyarilar": list(getattr(form, "uyarilar", [])),
        })
    if degisti:
        messages.success(request, f"{qr.kisa_kod} güncellendi.")
        form.uyarilari_goster(request)
    else:
        messages.info(request, f"{qr.kisa_kod}: değişiklik yok.")
    return redirect(_donus_adresi(request))


@yetki("qr.view_qrkod")
@require_safe
def qr_detay(request, pk):
    qr = get_object_or_404(QRKod.objects.select_related("urun", "kampanya", "magaza", "sayfa"), pk=pk)
    otuz_gun = timezone.now() - timedelta(days=30)
    tarama = Tarama.objects.filter(qr=qr, zaman__gte=otuz_gun).aggregate(
        insan=Count("id", filter=Q(bot=False)), bot=Count("id", filter=Q(bot=True))
    )
    test_url = ""
    if qr.hedef_turu == QRKod.HedefTuru.HARICI and url_gecerli_mi(qr.hedef_url):
        test_url = qr.hedef_url
    elif qr.hedef_turu == QRKod.HedefTuru.SAYFA and qr.sayfa_id and qr.sayfa.durum == KampanyaSayfasi.Durum.YAYINDA:
        test_url = f"/s/{qr.sayfa.slug}"
    return render(request, "qr/panel/qr_detay.html", {
        "qr": qr,
        "tarama": tarama,
        "test_url": test_url,
        "zaman_durumu": qr.zaman_durumu(),
        "paylasim": paylasim_baglantilari(qr.kisa_url, qr.baslik or qr.ad),
        "gecmis": qr.hedef_gecmisi.select_related("kullanici", "eski_sayfa", "yeni_sayfa").order_by("-zaman", "-id")[:100],
    })


# --- Görsel uçları: içerik DAİMA kalıcı kısa adrestir (qr.kisa_url), hedef URL değil ---

def _gorsel_yaniti(request, pk, tur):
    qr = get_object_or_404(QRKod, pk=pk)
    if tur == "png":
        icerik, tip = qr_png(qr.kisa_url), "image/png"
    else:
        icerik, tip = qr_svg(qr.kisa_url), "image/svg+xml"
    yanit = HttpResponse(icerik, content_type=tip)
    ad = f"{guvenli_dosya_adi(qr.kisa_kod)}.{tur}"
    if request.GET.get("indir") == "1":
        yanit["Content-Disposition"] = f'attachment; filename="{ad}"'
    else:
        yanit["Content-Disposition"] = f'inline; filename="{ad}"'
    return yanit


@yetki("qr.view_qrkod")
@require_safe
def qr_png_gorunumu(request, pk):
    return _gorsel_yaniti(request, pk, "png")


@yetki("qr.view_qrkod")
@require_safe
def qr_svg_gorunumu(request, pk):
    return _gorsel_yaniti(request, pk, "svg")


# --- Toplu işlem ---

def _zip_yaniti(request, qrler):
    tampon = io.BytesIO()
    csv_tampon = io.StringIO()
    kullanilan = set()
    satirlar = []
    with zipfile.ZipFile(tampon, "w", zipfile.ZIP_DEFLATED) as arsiv:
        for qr in qrler:
            ad = guvenli_dosya_adi(qr.kisa_kod)
            if ad.lower() in kullanilan:  # savunma: farklı kodlar aynı dosya adına inemez
                ad = f"{ad}_{qr.pk}"
            kullanilan.add(ad.lower())
            arsiv.writestr(f"{ad}.png", qr_png(qr.kisa_url))
            arsiv.writestr(f"{ad}.svg", qr_svg(qr.kisa_url))
            satirlar.append([qr.kisa_kod, qr.ad, qr.kisa_url, hedef_metni(qr)])
        csv_yaz(csv_tampon, ["kisa_kod", "ad", "kisa_url", "hedef"], satirlar)
        arsiv.writestr("liste.csv", "﻿" + csv_tampon.getvalue())
    denetim_yaz(request, "qr_zip_indir", None, f"{len(satirlar)} kod ZIP olarak indirildi")
    yanit = HttpResponse(tampon.getvalue(), content_type="application/zip")
    yanit["Content-Disposition"] = 'attachment; filename="qr-kodlar.zip"'
    return yanit


@yetki("qr.view_qrkod")
@require_POST
def qr_toplu(request):
    islem = request.POST.get("islem", "")
    idler = {int(x) for x in request.POST.getlist("secili") if x.isdigit()}
    donus = request.POST.get("donus") or ""
    hedef = redirect("panel:qr_liste")
    if islem not in (*ISLEMLER, "zip", "cope"):
        messages.error(request, "Geçersiz işlem.")
        return hedef
    if not idler:
        messages.error(request, "Önce en az bir QR kod seçin.")
        return hedef
    if len(idler) > TOPLU_EN_FAZLA:
        messages.error(request, f"Tek seferde en fazla {TOPLU_EN_FAZLA} kod seçilebilir.")
        return hedef
    if islem != "zip" and not request.user.has_perm("qr.change_qrkod"):
        raise PermissionDenied

    qrler = list(QRKod.objects.filter(pk__in=idler).select_related("kampanya", "sayfa").order_by("kod_anahtari"))
    if not qrler:
        messages.error(request, "Seçilen kodlar bulunamadı.")
        return hedef
    if islem == "zip":
        return _zip_yaniti(request, qrler)

    if islem == "cope":
        # Kalıcı silme yoktur: kodlar çöp kutusuna taşınır, geri yüklenebilir, kısa kod başkasına verilmez.
        qrler = [q for q in qrler if q.durum != QRKod.Durum.COP]
        if not qrler:
            messages.error(request, "Seçilen kodlar zaten çöp kutusunda.")
            return hedef
        if request.POST.get("onay") != "1":
            return render(request, "qr/panel/qr_cop_onay.html", {"qrler": qrler, "donus": donus})
        sayi = qr_cope_tasi(qrler, request)
        messages.success(request, f"{sayi} QR kod çöp kutusuna taşındı.")
        if donus.isdigit():
            return redirect("panel:qr_detay", pk=int(donus))
        return hedef

    yeni_durum, fiil = ISLEMLER[islem]
    cop_olanlar = [q.kisa_kod for q in qrler if q.durum == QRKod.Durum.COP]
    if cop_olanlar:
        qrler = [q for q in qrler if q.durum != QRKod.Durum.COP]
        messages.warning(request, "Çöp kutusundaki kodlar atlandı (önce geri yükleyin): " + ", ".join(cop_olanlar))
        if not qrler:
            return hedef
    if islem == "arsivle" and request.POST.get("onay") != "1":
        return render(request, "qr/panel/qr_arsiv_onay.html", {"qrler": qrler, "donus": donus})

    uygulanacak = []
    atlanan = []
    for qr in qrler:
        if yeni_durum != QRKod.Durum.ARSIV and qr.durum != yeni_durum:
            # Arşivden çıkarken hedef bilgisinin tutarlı olduğundan emin ol.
            eski_durum = qr.durum
            qr.durum = yeni_durum
            try:
                qr.full_clean()
            except ValidationError:
                atlanan.append(qr.kisa_kod)
                continue
            finally:
                qr.durum = eski_durum
        uygulanacak.append(qr)
    sayi = qr_durum_degistir(uygulanacak, yeni_durum, request)
    messages.success(request, f"{sayi} QR kod {fiil}.")
    if atlanan:
        messages.warning(request, "Hedef bilgisi eksik olduğu için atlandı: " + ", ".join(atlanan))
    if donus.isdigit():
        return redirect("panel:qr_detay", pk=int(donus))
    return hedef


# --- Çöp kutusu ---

@yetki("qr.view_qrkod")
@require_safe
def cop_kutusu(request):
    """Çöpteki kodların listesi. Kalıcı silme düğmesi/ucu YOKTUR; yalnızca geri yükleme."""
    sorgu = QRKod.objects.filter(durum=QRKod.Durum.COP).select_related("sayfa").order_by("-cope_atilma", "-id")
    sayfa, sorgu_dizesi = sayfalandir(request, sorgu)
    return render(request, "qr/panel/cop_kutusu.html", {"sayfa": sayfa, "sorgu_dizesi": sorgu_dizesi})


@yetki("qr.change_qrkod")
@require_POST
def cop_geri_yukle(request):
    """Tekil veya toplu geri yükleme (`secili` listesi). Kod, çöpe atılmadan önceki durumuna döner."""
    idler = {int(x) for x in request.POST.getlist("secili") if x.isdigit()}
    donus = redirect("panel:cop_kutusu")
    if not idler:
        messages.error(request, "Önce en az bir QR kod seçin.")
        return donus
    if len(idler) > TOPLU_EN_FAZLA:
        messages.error(request, f"Tek seferde en fazla {TOPLU_EN_FAZLA} kod seçilebilir.")
        return donus
    qrler = list(QRKod.objects.filter(pk__in=idler, durum=QRKod.Durum.COP))
    if not qrler:
        messages.error(request, "Seçilen kodlar çöp kutusunda bulunamadı.")
        return donus
    sayi, atlanan = qr_copten_geri_yukle(qrler, request)
    if sayi:
        messages.success(request, f"{sayi} QR kod geri yüklendi.")
    if atlanan:
        messages.warning(request, "Hedef bilgisi eksik olduğu için geri yüklenemedi: " + ", ".join(atlanan))
    return donus
