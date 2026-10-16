"""Veri bütünlüğü açısından kritik işlemler. Panel görünümleri ve toplu içe
aktarma kayıtları DOĞRUDAN .save() ile değil, bu fonksiyonlarla değiştirir;
böylece hedef geçmişi ve denetim kaydı her zaman tutulur."""
import io

import segno
from django.db import transaction

from .middleware import ip_maskele, istemci_ip
from .models import DenetimKaydi, GenelAyarlar, HedefGecmisi, QRKod, otomatik_kisa_kod

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
def qr_kaydet(qr, request, not_metni="", kaynak=""):
    """QR kodu oluşturur veya günceller. Hedef değiştiyse geçmişe yazar.
    Çağıran taraf full_clean() yapmış olmalıdır. `kaynak` (örn. "API, anahtar qrk_ab12…") yalnızca
    yeni kayıtta denetim kaydının özetine eklenir."""
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
        denetim_yaz(request, "qr_olustur", qr, f"{qr.kisa_kod} oluşturuldu" + (f" (kaynak: {kaynak})" if kaynak else ""))
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


# --- Otomatik kısa kod üretimi ---

TABAN36 = "0123456789abcdefghijklmnopqrstuvwxyz"
SIRALI_BASLANGIC = 36 ** 2  # 1296 = taban-36 "100": kısa kod deseni en az 3 karakter ister
SIRALI_EN_FAZLA_ATLAMA = 10000


def taban36(sayi):
    """Negatif olmayan tam sayı -> küçük harfli taban-36 metni (1296 -> "100")."""
    if sayi < 0:
        raise ValueError("Negatif sayı")
    if sayi == 0:
        return "0"
    rakamlar = []
    while sayi:
        sayi, kalan = divmod(sayi, 36)
        rakamlar.append(TABAN36[kalan])
    return "".join(reversed(rakamlar))


def _kod_kullanilabilir(kod, ayrilmis, kullanilan):
    anahtar = QRKod.anahtar(kod)
    return anahtar not in ayrilmis and anahtar not in kullanilan and not QRKod.objects.filter(kod_anahtari=anahtar).exists()


def sirali_kod_ayir(ayrilmis=None, kullanilan=None):
    """Sıradaki sıralı kodu AYIRIR (sayacı ilerletir) ve döndürür.

    Yarış koşulu yoktur: GenelAyarlar satırı `select_for_update` ile kilitlenir, sayaç aynı işlemde artırılır; eşzamanlı
    iki istek aynı sayıyı alamaz. Ayrılmış ya da zaten kullanılan kod çıkarsa atlanır (numara yanar, boşluk kalabilir).
    Çağıran bir işlemin içindeyse kilit o işlem bitene kadar tutulur (sayaç geri alınırsa numara da geri gelir)."""
    GenelAyarlar.al()  # satır yoksa oluştur
    with transaction.atomic():
        ayar = GenelAyarlar.objects.select_for_update().get(pk=1)
        if ayrilmis is None:
            ayrilmis = ayar.ayrilmis_kume()
        kullanilan = kullanilan if kullanilan is not None else ()
        sayac = max(ayar.sirali_sayac, SIRALI_BASLANGIC)
        for _ in range(SIRALI_EN_FAZLA_ATLAMA):
            kod, sayac = taban36(sayac), sayac + 1
            if _kod_kullanilabilir(kod, ayrilmis, kullanilan):
                GenelAyarlar.objects.filter(pk=1).update(sirali_sayac=sayac)
                return kod
        raise ValueError("Sıralı kod üretilemedi: art arda çok sayıda kod kullanımda.")


def kod_uretici(kalici=True, ayrilmis=None, kullanilan=None):
    """Genel ayardaki biçime göre (`rastgele` | `sirali`) çağrıldıkça yeni kısa kod veren fonksiyon döndürür.

    kalici=False (önizleme): sıralı kodda sayaç ilerletilmez/kilitlenmez; bellekte, sayacın o anki değerinden ilerlenir.
    `kullanilan`: aynı toplu işlemde zaten verilmiş kodların küçük harfli kümesi (üretilen kod buraya eklenir)."""
    ayar = GenelAyarlar.al()
    ayrilmis = ayar.ayrilmis_kume() if ayrilmis is None else ayrilmis
    kullanilan = set() if kullanilan is None else kullanilan
    sirali = ayar.kod_uretim_bicimi == GenelAyarlar.KodBicimi.SIRALI
    imlec = [max(ayar.sirali_sayac, SIRALI_BASLANGIC)]

    def uret():
        if not sirali:
            for _ in range(50):
                aday = otomatik_kisa_kod()
                if _kod_kullanilabilir(aday, ayrilmis, kullanilan):
                    kullanilan.add(QRKod.anahtar(aday))
                    return aday
            raise ValueError("Otomatik kod üretilemedi, lütfen tekrar deneyin.")
        if kalici:
            kod = sirali_kod_ayir(ayrilmis, kullanilan)
        else:
            for _ in range(SIRALI_EN_FAZLA_ATLAMA):
                kod, imlec[0] = taban36(imlec[0]), imlec[0] + 1
                if _kod_kullanilabilir(kod, ayrilmis, kullanilan):
                    break
            else:
                raise ValueError("Sıralı kod üretilemedi: art arda çok sayıda kod kullanımda.")
        kullanilan.add(QRKod.anahtar(kod))
        return kod

    return uret


def qr_svg(veri, olcek=10):
    tampon = io.BytesIO()
    segno.make(veri, error=QR_HATA_DUZELTME, micro=False).save(tampon, kind="svg", scale=olcek, border=4, xmldecl=True, svgns=True)
    return tampon.getvalue()


def qr_png(veri, olcek=10):
    tampon = io.BytesIO()
    segno.make(veri, error=QR_HATA_DUZELTME, micro=False).save(tampon, kind="png", scale=olcek, border=4)
    return tampon.getvalue()
