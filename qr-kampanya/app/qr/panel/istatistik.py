"""Tarama istatistikleri.

- "Toplam tarama": botlar hariç (bot_dahil=True ise dahil).
- "Bot taraması": her zaman ayrı sütun.
- "Tahmini tekil ziyaret": botlar hariç, aynı gün içindeki FARKLI ziyaretci_ozeti
  sayılarının günlere göre toplamı. Kesin kişi sayısı değildir.
"""
from collections import defaultdict
from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate

from ..models import Kampanya, Magaza, QRKod, Tarama, Urun

TEKIL_UYARISI = (
    "Tahmini tekil ziyaret kesin kişi sayısı değildir; aynı kişi farklı günlerde veya farklı cihazlarla birden çok sayılabilir."
)

# boyut adı → (Tarama üzerindeki alan, başlık)
BOYUTLAR = {
    "qr": ("qr", "QR kod"),
    "kampanya": ("qr__kampanya", "Kampanya"),
    "magaza": ("qr__magaza", "Mağaza"),
    "urun": ("qr__urun", "Ürün"),
}


def _taramalar(bas_dt, bit_dt):
    return Tarama.objects.filter(zaman__gte=bas_dt, zaman__lt=bit_dt)


def _etiketler(boyut, idler):
    idler = [i for i in idler if i is not None]
    if boyut == "qr":
        return {q.pk: (q.kisa_kod, q.ad) for q in QRKod.objects.filter(pk__in=idler).only("kisa_kod", "ad")}
    model = {"kampanya": Kampanya, "magaza": Magaza, "urun": Urun}[boyut]
    return {o.pk: (o.kod, o.ad) for o in model.objects.filter(pk__in=idler).only("kod", "ad")}


def satirlar(boyut, bas_dt, bit_dt, bot_dahil=False):
    """Seçilen boyut için satır listesi (toplama göre azalan)."""
    alan = BOYUTLAR[boyut][0]
    temel = _taramalar(bas_dt, bit_dt)
    toplamlar = {
        t[alan]: t
        for t in temel.values(alan).annotate(
            insan=Count("id", filter=Q(bot=False)), bot_sayisi=Count("id", filter=Q(bot=True))
        )
    }
    tekil = defaultdict(int)
    for t in (
        temel.filter(bot=False).annotate(gun=TruncDate("zaman")).values(alan, "gun")
        .annotate(farkli=Count("ziyaretci_ozeti", distinct=True)).order_by()
    ):
        tekil[t[alan]] += t["farkli"]
    etiket = _etiketler(boyut, toplamlar.keys())
    sonuc = []
    for anahtar, t in toplamlar.items():
        kod, ad = etiket.get(anahtar, ("-", "(atanmamış)" if anahtar is None else "(bilinmeyen)"))
        sonuc.append({
            "id": anahtar,
            "kod": kod,
            "ad": ad,
            "toplam": t["insan"] + (t["bot_sayisi"] if bot_dahil else 0),
            "tekil": tekil.get(anahtar, 0),
            "bot": t["bot_sayisi"],
        })
    sonuc.sort(key=lambda s: (-s["toplam"], s["kod"]))
    return sonuc


def gunluk(bas_tarih, bit_tarih, bas_dt, bit_dt):
    """Aralıktaki her gün için satır (taraması olmayan günler 0)."""
    temel = _taramalar(bas_dt, bit_dt).annotate(gun=TruncDate("zaman")).values("gun")
    veri = {
        s["gun"]: s
        for s in temel.annotate(
            insan=Count("id", filter=Q(bot=False)),
            bot_sayisi=Count("id", filter=Q(bot=True)),
            tekil=Count("ziyaretci_ozeti", filter=Q(bot=False), distinct=True),
        ).order_by()
    }
    gunler = []
    gun = bit_tarih
    while gun >= bas_tarih:
        s = veri.get(gun)
        gunler.append({"gun": gun, "toplam": s["insan"] if s else 0, "bot": s["bot_sayisi"] if s else 0, "tekil": s["tekil"] if s else 0})
        gun -= timedelta(days=1)
    return gunler


def genel_toplam(bas_dt, bit_dt):
    s = _taramalar(bas_dt, bit_dt).aggregate(insan=Count("id", filter=Q(bot=False)), bot=Count("id", filter=Q(bot=True)))
    return {"insan": s["insan"], "bot": s["bot"], "hepsi": s["insan"] + s["bot"]}
