"""Veri bütünlüğü açısından kritik işlemler. Panel görünümleri ve toplu içe
aktarma kayıtları DOĞRUDAN .save() ile değil, bu fonksiyonlarla değiştirir;
böylece hedef geçmişi ve denetim kaydı her zaman tutulur."""
import io

import segno
from django.db import transaction

from .middleware import ip_maskele, istemci_ip
from .models import DenetimKaydi, HedefGecmisi, QRKod

QR_HATA_DUZELTME = "m"  # %15 hata toleransı: baskı hasarlarına karşı dayanıklı, kod yoğunluğu makul


def denetim_yaz(request, eylem, nesne=None, ozet=""):
    kullanici = getattr(request, "user", None) if request else None
    if kullanici is not None and not kullanici.is_authenticated:
        kullanici = None
    DenetimKaydi.objects.create(
        kullanici=kullanici,
        kullanici_adi=kullanici.get_username() if kullanici else "",
        eylem=eylem,
        nesne_turu=nesne._meta.model_name if nesne is not None else "",
        nesne_id=str(nesne.pk) if nesne is not None else "",
        ozet=ozet[:5000],
        ip_maskeli=ip_maskele(istemci_ip(request)) if request else "",
    )


def kullanici_oturumlarini_sonlandir(kullanici, koru_anahtar=None):
    """Kullanıcının kimliği doğrulanmış bütün oturumlarını siler (`koru_anahtar` hariç). Silinen sayıyı döndürür."""
    from django.contrib.sessions.models import Session
    from django.utils import timezone

    hedef = str(kullanici.pk)
    silinecek = []
    for oturum in Session.objects.filter(expire_date__gt=timezone.now()).iterator():
        if oturum.session_key == koru_anahtar:
            continue
        try:
            veri = oturum.get_decoded()
        except Exception:  # bozuk oturum verisi
            continue
        if str(veri.get("_auth_user_id", "")) == hedef:
            silinecek.append(oturum.session_key)
    if silinecek:
        Session.objects.filter(session_key__in=silinecek).delete()
    return len(silinecek)


def _hedef(qr):
    return (qr.hedef_turu, qr.hedef_url or "", qr.sayfa_id)


@transaction.atomic
def qr_kaydet(qr, request, not_metni=""):
    """QR kodu oluşturur veya günceller. Hedef değiştiyse geçmişe yazar.
    Çağıran taraf full_clean() yapmış olmalıdır."""
    kullanici = request.user if request and request.user.is_authenticated else None
    yeni = qr.pk is None
    eski = None
    if not yeni:
        eski = QRKod.objects.select_for_update().get(pk=qr.pk)
    if yeni:
        qr.olusturan = kullanici
    qr.degistiren = kullanici
    qr.save()

    if yeni:
        HedefGecmisi.objects.create(
            qr=qr, kullanici=kullanici, yeni_hedef_turu=qr.hedef_turu,
            yeni_hedef_url=qr.hedef_url or "", yeni_sayfa_id=qr.sayfa_id, not_metni=not_metni or "İlk hedef",
        )
        denetim_yaz(request, "qr_olustur", qr, f"{qr.kisa_kod} oluşturuldu")
        return qr

    if _hedef(eski) != _hedef(qr):
        HedefGecmisi.objects.create(
            qr=qr, kullanici=kullanici,
            eski_hedef_turu=eski.hedef_turu, eski_hedef_url=eski.hedef_url or "", eski_sayfa_id=eski.sayfa_id,
            yeni_hedef_turu=qr.hedef_turu, yeni_hedef_url=qr.hedef_url or "", yeni_sayfa_id=qr.sayfa_id,
            not_metni=not_metni,
        )
        denetim_yaz(request, "qr_hedef_degistir", qr, f"{qr.kisa_kod}: {eski.hedef_url or eski.sayfa_id} → {qr.hedef_url or qr.sayfa_id}")
    if eski.durum != qr.durum:
        denetim_yaz(request, "qr_durum_degistir", qr, f"{qr.kisa_kod}: {eski.durum} → {qr.durum}")
    else:
        denetim_yaz(request, "qr_duzenle", qr, f"{qr.kisa_kod} düzenlendi")
    return qr


@transaction.atomic
def qr_durum_degistir(qr_listesi, yeni_durum, request):
    """Toplu aktif/pasif/arşiv. Silme yoktur."""
    if yeni_durum not in QRKod.Durum.values:
        raise ValueError("Geçersiz durum")
    # Değişiklik, önceden okunmuş (eski olabilen) nesne üzerinde değil, kilitli TAZE satır üzerinde yapılır;
    # böylece eşzamanlı bir hedef değişikliği ezilmez. Kilitler pk sırasıyla alınır (kilitlenme riski azalır).
    idler = sorted({qr.pk for qr in qr_listesi})
    taze = {q.pk: q for q in QRKod.objects.select_for_update().filter(pk__in=idler).order_by("pk")}
    sayi = 0
    for pk in idler:
        qr = taze.get(pk)
        if qr is not None and qr.durum != yeni_durum:
            qr.durum = yeni_durum
            qr_kaydet(qr, request)
            sayi += 1
    return sayi


def qr_svg(veri, olcek=10):
    tampon = io.BytesIO()
    segno.make(veri, error=QR_HATA_DUZELTME, micro=False).save(tampon, kind="svg", scale=olcek, border=4, xmldecl=True, svgns=True)
    return tampon.getvalue()


def qr_png(veri, olcek=10):
    tampon = io.BytesIO()
    segno.make(veri, error=QR_HATA_DUZELTME, micro=False).save(tampon, kind="png", scale=olcek, border=4)
    return tampon.getvalue()
