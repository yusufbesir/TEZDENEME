"""Toplu QR içe aktarma görünümleri (CSV / Excel).

Akış: yükle → sütun eşleştir → doğrulama ve onay ekranı → uygula → sonuç raporu / ZIP.
Veri oturumda değil, sunucuda IceAktarma kaydında tutulur. Hiçbir kayıt silinmez.
"""
from datetime import timedelta

from django.contrib import messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST, require_safe

from .. import ice_aktarma as ia_modul
from ..hiz import qr_olusturma_hiz_siniri
from ..models import IceAktarma, QRKod
from ..servisler import denetim_yaz, qr_kaydet
from .qrler import _zip_yaniti
from .yardimci import csv_yaniti, xlsx_yaniti, yetki

BEKLEME_SAATI = 24
ONIZLEME_SATIRI = 200
HATA_GOSTERIM_SINIRI = 500
NOT_ONEKI = "Toplu içe aktarma: "

ORNEK_BASLIKLAR = ["kod", "ad", "tur", "hedef_url", "baslangic", "bitis", "durum"]
ORNEK_SATIRLAR = [
    ["KMP-0001", "Sonbahar Kampanyası", "kampanya", "https://example.com/a", "2026-10-01", "2026-11-01", "aktif"],
    ["KMP-0002", "Kış Kampanyası", "kampanya", "https://example.com/b", "2026-11-01", "2026-12-31", "aktif"],
    ["URN-0001", "Ürün Bilgi Sayfası", "urun", "https://example.com/p1", "", "", "aktif"],
]


def _kayit_getir(request, pk, bekleyen_gerekli=True, kilitle=False):
    """Yalnızca kendi içe aktarmasına erişim; başkasının kaydı 404. Süresi geçmiş bekleyenler 404."""
    sorgu = IceAktarma.objects.filter(kullanici=request.user)
    if kilitle:
        sorgu = sorgu.select_for_update()
    ia = get_object_or_404(sorgu, pk=pk)
    if bekleyen_gerekli and ia.durum == IceAktarma.Durum.BEKLIYOR and _suresi_gecti(ia):
        raise Http404
    return ia


def _suresi_gecti(ia):
    return ia.olusturma < timezone.now() - timedelta(hours=BEKLEME_SAATI)


@yetki("qr.add_qrkod")
@require_safe
def ice_aktarma_liste(request):
    sinir = timezone.now() - timedelta(hours=BEKLEME_SAATI)
    benim = IceAktarma.objects.filter(kullanici=request.user).defer("satirlar", "eslesme", "sonuc")
    return render(request, "qr/panel/ice_aktarma_liste.html", {
        "bekleyenler": benim.filter(durum=IceAktarma.Durum.BEKLIYOR, olusturma__gte=sinir),
        "tamamlananlar": benim.filter(durum=IceAktarma.Durum.TAMAMLANDI)[:20],
        "en_fazla_mb": ia_modul.EN_FAZLA_BAYT // (1024 * 1024),
        "en_fazla_satir": ia_modul.EN_FAZLA_SATIR,
        "alanlar": ia_modul.ALANLAR,
    })


@yetki("qr.add_qrkod")
@qr_olusturma_hiz_siniri
@require_POST
def ice_aktarma_yukle(request):
    dosya = request.FILES.get("dosya")
    if not dosya:
        messages.error(request, "Bir .csv veya .xlsx dosyası seçin.")
        return redirect("panel:ice_aktarma_liste")
    if dosya.size > ia_modul.EN_FAZLA_BAYT:
        messages.error(request, f"Dosya en fazla {ia_modul.EN_FAZLA_BAYT // (1024 * 1024)} MB olabilir.")
        return redirect("panel:ice_aktarma_liste")
    ad = (dosya.name or "dosya").replace("\\", "/").rsplit("/", 1)[-1][:255]
    try:
        basliklar, satirlar = ia_modul.dosya_oku(ad, dosya.read(ia_modul.EN_FAZLA_BAYT + 1))
    except ia_modul.DosyaHatasi as hata:
        messages.error(request, str(hata))
        return redirect("panel:ice_aktarma_liste")
    ia = IceAktarma.objects.create(
        kullanici=request.user, dosya_adi=ad, satirlar=satirlar,
        eslesme={"basliklar": basliklar, "alanlar": ia_modul.otomatik_esleme(basliklar)},
    )
    messages.success(request, f"{len(satirlar)} satır okundu. Şimdi sütunları sistem alanlarıyla eşleştirin.")
    return redirect("panel:ice_aktarma_eslestir", pk=ia.pk)


@yetki("qr.add_qrkod")
@require_http_methods(["GET", "POST"])
def ice_aktarma_eslestir(request, pk):
    ia = _kayit_getir(request, pk)
    if ia.durum != IceAktarma.Durum.BEKLIYOR:
        return redirect("panel:ice_aktarma_sonuc", pk=ia.pk)
    basliklar = ia.eslesme.get("basliklar", [])
    secili = list(ia.eslesme.get("alanlar", [""] * len(basliklar)))
    gecerli = {a for a, _ in ia_modul.ALANLAR}
    if request.method == "POST":
        secili = [request.POST.get(f"alan_{i}", "") for i in range(len(basliklar))]
        hatalar = []
        if any(a and a not in gecerli for a in secili):
            hatalar.append("Geçersiz alan seçimi.")
        dolu = [a for a in secili if a]
        for a in sorted(set(dolu)):
            if dolu.count(a) > 1:
                hatalar.append(f"“{ia_modul.ALAN_ADLARI.get(a, a)}” alanı birden çok sütuna atanmış.")
        if not ({"hedef_url", "sayfa"} & set(dolu)):
            hatalar.append("En az bir sütun “hedef_url” veya “sayfa” alanına eşleştirilmeli.")
        if hatalar:
            for h in hatalar:
                messages.error(request, h)
        else:
            ia.eslesme = {"basliklar": basliklar, "alanlar": secili}
            ia.save(update_fields=["eslesme"])
            return redirect("panel:ice_aktarma_onizle", pk=ia.pk)
    ornekler = ia.satirlar[:3]
    sutunlar = [
        {
            "i": i, "baslik": b, "secili": secili[i] if i < len(secili) else "",
            "ornek": [s["hucreler"][i] for s in ornekler if i < len(s["hucreler"]) and s["hucreler"][i]],
        }
        for i, b in enumerate(basliklar)
    ]
    return render(request, "qr/panel/ice_aktarma_eslestir.html", {
        "ia": ia, "sutunlar": sutunlar, "alanlar": ia_modul.ALANLAR, "satir_sayisi": len(ia.satirlar),
    })


def _ozet_baglam(ia, analiz, guncelleme_izni):
    return {
        "ia": ia,
        "yeni": analiz.yeni[:ONIZLEME_SATIRI],
        "yeni_sayisi": len(analiz.yeni),
        "guncellenecek": analiz.mevcut[:ONIZLEME_SATIRI],
        "guncelleme_sayisi": len(analiz.mevcut),
        "degismedi_sayisi": len(analiz.degismedi),
        "hatali_sayisi": len(analiz.hatali),
        "ayni_hedef_sayisi": analiz.ayni_hedef_sayisi,
        "hatalar": analiz.hata_listesi[:HATA_GOSTERIM_SINIRI],
        "hata_toplam": len(analiz.hata_listesi),
        "iliskili_yeni": [
            (tip, nesne.kod, nesne.ad) for (tip, _), nesne in analiz.iliskili_yeni.items()
            if (tip, nesne.kod.lower()) not in analiz.iliskili_hata
        ],
        "guncelleme_izni": guncelleme_izni,
        "onizleme_siniri": ONIZLEME_SATIRI,
        "uygulanabilir": bool(analiz.yeni) or (bool(analiz.mevcut) and guncelleme_izni),
    }


@yetki("qr.add_qrkod")
@require_safe
def ice_aktarma_onizle(request, pk):
    ia = _kayit_getir(request, pk)
    if ia.durum != IceAktarma.Durum.BEKLIYOR:
        return redirect("panel:ice_aktarma_sonuc", pk=ia.pk)
    if not any(ia.eslesme.get("alanlar", [])):
        return redirect("panel:ice_aktarma_eslestir", pk=ia.pk)
    analiz = ia_modul.analiz_et(ia)
    return render(request, "qr/panel/ice_aktarma_onizle.html", _ozet_baglam(ia, analiz, request.user.has_perm("qr.change_qrkod")))


@yetki("qr.add_qrkod")
@require_safe
def ice_aktarma_hatalar_csv(request, pk):
    ia = _kayit_getir(request, pk)
    if ia.durum == IceAktarma.Durum.TAMAMLANDI:
        satirlar = [[h["no"], h["alan"], h["mesaj"]] for h in ia.sonuc.get("hatali", [])]
    else:
        satirlar = [list(h) for h in ia_modul.analiz_et(ia).hata_listesi]
    return csv_yaniti("ice-aktarma-hatalar", ["Satır no", "Alan", "Hata"], satirlar)


@yetki("qr.add_qrkod")
@require_POST
def ice_aktarma_iptal(request, pk):
    with transaction.atomic():
        ia = _kayit_getir(request, pk, bekleyen_gerekli=False, kilitle=True)
        if ia.durum == IceAktarma.Durum.BEKLIYOR:
            ia.durum = IceAktarma.Durum.IPTAL
            ia.satirlar = []
            ia.save(update_fields=["durum", "satirlar"])
            messages.success(request, "İçe aktarma iptal edildi; hiçbir kayıt değiştirilmedi.")
    return redirect("panel:ice_aktarma_liste")


class _UygulamaHatasi(Exception):
    pass


@yetki("qr.add_qrkod")
@require_POST
def ice_aktarma_uygula(request, pk):
    guncelle = request.POST.get("guncelle") == "1"
    if guncelle and not request.user.has_perm("qr.change_qrkod"):
        raise PermissionDenied
    not_metni = ""
    try:
        with transaction.atomic():
            # Aynı içe aktarma iki kez uygulanamasın: kayıt kilitlenir, durum kontrol edilir.
            ia = _kayit_getir(request, pk, kilitle=True)
            if ia.durum != IceAktarma.Durum.BEKLIYOR:
                messages.error(request, "Bu içe aktarma zaten uygulanmış veya iptal edilmiş.")
                return redirect("panel:ice_aktarma_liste")
            not_metni = (NOT_ONEKI + ia.dosya_adi)[:300]
            analiz = ia_modul.analiz_et(ia)
            sonuc = _uygula(request, analiz, guncelle, not_metni)
            sonuc["dosya_adi"] = ia.dosya_adi
            sonuc["guncelleme_acik"] = guncelle
            ia.sonuc = sonuc
            ia.durum = IceAktarma.Durum.TAMAMLANDI
            ia.satirlar = []  # kişisel/ham veri gereğinden uzun tutulmaz; rapor sonuçta
            ia.save(update_fields=["sonuc", "durum", "satirlar"])
            denetim_yaz(
                request, "ice_aktarma", ia,
                f"{ia.dosya_adi}: oluşturulan {len(sonuc['olusturulan'])}, güncellenen {len(sonuc['guncellenen'])}, "
                f"atlanan {len(sonuc['atlanan'])}, hatalı {sonuc['hatali_satir_sayisi']}; güncelleme {'açık' if guncelle else 'kapalı'}",
            )
    except (ValidationError, IntegrityError, _UygulamaHatasi) as hata:
        mesaj = " ".join(hata.messages) if isinstance(hata, ValidationError) else str(hata)
        messages.error(request, f"Kayıt sırasında hata oluştu; hiçbir değişiklik uygulanmadı. Ayrıntı: {mesaj[:300]}")
        return redirect("panel:ice_aktarma_onizle", pk=pk)
    messages.success(request, "İçe aktarma tamamlandı.")
    return redirect("panel:ice_aktarma_sonuc", pk=ia.pk)


def _uygula(request, analiz, guncelle, not_metni):
    """transaction.atomic() içinde çağrılır. Hiçbir kayıt silinmez."""
    sonuc = {"olusturulan": [], "guncellenen": [], "atlanan": [], "hatali": [], "iliskili_olusturulan": []}
    for r in analiz.hatali:
        for alan, mesaj in r.hatalar:
            sonuc["hatali"].append({"no": r.no, "alan": alan, "mesaj": mesaj})
    sonuc["hatali_satir_sayisi"] = len(analiz.hatali)

    # Yalnızca gerçekten kullanılan ilişkili kayıtlar oluşturulur.
    kullanilacak = set()
    for r in analiz.yeni + (analiz.mevcut if guncelle else []):
        kullanilacak.update(r.iliskili.values())
    olusan = {}
    for anahtar in sorted(kullanilacak):
        nesne = analiz.iliskili_yeni[anahtar]
        nesne.full_clean()
        nesne.save()
        olusan[anahtar] = nesne
        etiket = ia_modul.ILISKILI[anahtar[0]][3]
        sonuc["iliskili_olusturulan"].append({"tur": etiket, "kod": nesne.kod, "ad": nesne.ad})
        denetim_yaz(request, f"{anahtar[0]}_olustur", nesne, f"{nesne.kod} toplu içe aktarmayla oluşturuldu")

    for r in analiz.yeni:
        qr = r.qr
        for tip, anahtar in r.iliskili.items():
            setattr(qr, tip, olusan[anahtar])
        qr.kod_anahtari = QRKod.anahtar(qr.kisa_kod)
        qr.full_clean()
        qr_kaydet(qr, request, not_metni=not_metni)
        sonuc["olusturulan"].append({"no": r.no, "kod": qr.kisa_kod, "pk": qr.pk})

    for r in analiz.mevcut:
        if not guncelle:
            sonuc["atlanan"].append({"no": r.no, "kod": r.kod, "neden": "Mevcut kayıt; güncelleme seçeneği kapalı"})
            continue
        # Analiz sırasında okunmuş nesne eskimiş olabilir (başka kullanıcı bu arada hedefi değiştirmiş olabilir):
        # satır kilitlenerek yeniden okunur ve yalnızca bu içe aktarmanın değiştirdiği alanlar taze satıra yazılır.
        qr = QRKod.objects.select_for_update().get(pk=r.qr.pk)
        for nitelik, deger in r.guncelleme.items():
            setattr(qr, nitelik, deger)
        for tip, anahtar in r.iliskili.items():
            setattr(qr, tip, olusan[anahtar])
        qr.full_clean()
        qr_kaydet(qr, request, not_metni=not_metni)
        sonuc["guncellenen"].append({
            "no": r.no, "kod": qr.kisa_kod, "pk": qr.pk,
            "degisen": [f"{e}: {a or '-'} → {y or '-'}" for e, a, y in r.degisenler],
        })
    for r in analiz.degismedi:
        sonuc["atlanan"].append({"no": r.no, "kod": r.kod, "neden": "Değişiklik yok"})
    sonuc["atlanan"].sort(key=lambda x: x["no"])
    return sonuc


@yetki("qr.add_qrkod")
@require_safe
def ice_aktarma_sonuc(request, pk):
    ia = _kayit_getir(request, pk, bekleyen_gerekli=False)
    if ia.durum == IceAktarma.Durum.BEKLIYOR:
        return redirect("panel:ice_aktarma_onizle", pk=ia.pk)
    return render(request, "qr/panel/ice_aktarma_sonuc.html", {
        "ia": ia, "s": ia.sonuc, "tamamlandi": ia.durum == IceAktarma.Durum.TAMAMLANDI,
        "hata_toplam": len(ia.sonuc.get("hatali", [])),
        "hatalar": ia.sonuc.get("hatali", [])[:HATA_GOSTERIM_SINIRI],
        "zip_var": bool(ia.sonuc.get("olusturulan") or ia.sonuc.get("guncellenen")),
    })


@yetki("qr.add_qrkod")
@require_safe
def ice_aktarma_rapor_csv(request, pk):
    ia = _kayit_getir(request, pk, bekleyen_gerekli=False)
    s = ia.sonuc or {}
    satirlar = []
    for x in s.get("olusturulan", []):
        satirlar.append([x["no"], x["kod"], "Oluşturuldu", ""])
    for x in s.get("guncellenen", []):
        satirlar.append([x["no"], x["kod"], "Güncellendi", "; ".join(x.get("degisen", []))])
    for x in s.get("atlanan", []):
        satirlar.append([x["no"], x["kod"], "Atlandı", x["neden"]])
    for x in s.get("hatali", []):
        satirlar.append([x["no"], "", "Hatalı", f"{x['alan']}: {x['mesaj']}"])
    satirlar.sort(key=lambda x: x[0])
    return csv_yaniti("ice-aktarma-rapor", ["Satır no", "Kod", "Sonuç", "Ayrıntı"], satirlar)


@yetki("qr.add_qrkod")
@require_safe
def ice_aktarma_zip(request, pk):
    ia = _kayit_getir(request, pk, bekleyen_gerekli=False)
    s = ia.sonuc or {}
    idler = {x["pk"] for x in s.get("olusturulan", []) + s.get("guncellenen", [])}
    if not idler:
        raise Http404
    qrler = list(QRKod.objects.filter(pk__in=idler).select_related("kampanya", "sayfa").order_by("kod_anahtari"))
    yanit = _zip_yaniti(request, qrler)
    yanit["Content-Disposition"] = f'attachment; filename="ice-aktarma-{str(ia.pk)[:8]}.zip"'
    return yanit


@yetki("qr.add_qrkod")
@require_safe
def ornek_csv(request):
    return csv_yaniti("ornek-ice-aktarma", ORNEK_BASLIKLAR, ORNEK_SATIRLAR)


@yetki("qr.add_qrkod")
@require_safe
def ornek_xlsx(request):
    return xlsx_yaniti("ornek-ice-aktarma", "QR kodlar", ORNEK_BASLIKLAR, ORNEK_SATIRLAR)
