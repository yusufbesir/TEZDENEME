"""Tarama zaman grafikleri: hazır aralıklar ve sunucu tarafında üretilen basit SVG çubuk grafik.

- Aralıklar: son 24 saat (saatlik), 7 gün, 30 gün (günlük), tüm zamanlar (günlük; 180 günden uzunsa haftalık).
- Saat dilimi: Django'nun etkin dilimi (Europe/Istanbul). Günler yerel gece yarısında, haftalar pazartesi 00:00'da başlar.
- SVG: harici kütüphane ve satır içi betik/stil yok (CSP: style-src 'self'); renkler CSS sınıflarıyla (panel.css/sayfa.css).
  Tüm metinler kaçırılır (django.utils.html).
"""
from collections import defaultdict
from datetime import datetime, time, timedelta, timezone as utc_dilimi

from django.db.models import Count, Min, Q
from django.db.models.functions import TruncDate, TruncHour
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe

ARALIKLAR = (("24s", "Son 24 saat"), ("7g", "7 gün"), ("30g", "30 gün"), ("tumu", "Tüm zamanlar"))
ARALIK_ANAHTARLARI = tuple(a for a, _ in ARALIKLAR)
VARSAYILAN_ARALIK = "30g"
HAFTALIK_ESIK_GUN = 180  # tüm zamanlar bu günden uzunsa haftalık toplanır
_AY = ("", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara")


def aralik_secimi(deger):
    return deger if deger in ARALIK_ANAHTARLARI else VARSAYILAN_ARALIK


def _yerel_gece_yarisi(gun, tz):
    return timezone.make_aware(datetime.combine(gun, time.min), tz)


def _gun_etiketi(gun):
    return f"{gun.day} {_AY[gun.month]}"


def aralik_baglantilari(get, secili):
    """Hazır aralık bağlantıları; mevcut sorgu parametreleri (tarih aralığı, bot_dahil vb.) korunur, sayfa_no atılır."""
    sonuc = []
    for anahtar, etiket in ARALIKLAR:
        parametreler = get.copy()
        parametreler.pop("sayfa_no", None)
        parametreler["aralik"] = anahtar
        sonuc.append({"anahtar": anahtar, "etiket": etiket, "adres": "?" + parametreler.urlencode(), "secili": anahtar == secili})
    return sonuc


def seri(taramalar, aralik, bot_dahil=False, simdi=None):
    """`taramalar`: Tarama sorgu kümesi (QR/filtre uygulanmış). Boş kovalar dahil sıralı kova listesi ve toplamlar döndürür.

    Her kova: {"baslangic": aware datetime, "etiket": str, "sayi": int (bot_dahil'e göre), "bot": int}.
    Sayım bot hariç/dahil seçeneğine uyar; "bot" sütunu her zaman botların sayısıdır.
    """
    aralik = aralik_secimi(aralik)
    tz = timezone.get_current_timezone()
    simdi = (simdi or timezone.now()).astimezone(tz)
    bugun = simdi.date()

    if aralik == "24s":
        birim = "saat"
        # İçinde bulunulan saat dahil 24 saat. Toplama/çıkarma UTC'de yapılır (yerel duvar saati kaymasından etkilenmez).
        bitis_dt = simdi.replace(minute=0, second=0, microsecond=0).astimezone(utc_dilimi.utc) + timedelta(hours=1)
        baslangiclar = [bitis_dt - timedelta(hours=24 - i) for i in range(24)]
        baslangic_dt = baslangiclar[0]
    else:
        birim = "gun"
        if aralik == "tumu":
            ilk = taramalar.aggregate(m=Min("zaman"))["m"]
            ilk_gun = min(ilk.astimezone(tz).date(), bugun) if ilk else bugun
            if (bugun - ilk_gun).days + 1 > HAFTALIK_ESIK_GUN:
                birim = "hafta"
                ilk_gun -= timedelta(days=ilk_gun.weekday())  # haftanın pazartesisi
        else:
            ilk_gun = bugun - timedelta(days=(7 if aralik == "7g" else 30) - 1)
        baslangic_dt = _yerel_gece_yarisi(ilk_gun, tz)
        bitis_dt = _yerel_gece_yarisi(bugun + timedelta(days=1), tz)
        adim = 7 if birim == "hafta" else 1
        baslangiclar = []
        g = ilk_gun
        while g <= bugun:
            baslangiclar.append(g)
            g += timedelta(days=adim)

    temel = taramalar.filter(zaman__gte=baslangic_dt, zaman__lt=bitis_dt)
    sayimlar = defaultdict(lambda: [0, 0])  # anahtar -> [insan, bot]
    if birim == "saat":
        satirlar = (
            temel.annotate(k=TruncHour("zaman", tzinfo=tz)).values("k").order_by()
            .annotate(insan=Count("id", filter=Q(bot=False)), bot_sayisi=Count("id", filter=Q(bot=True)))
        )
        for s in satirlar:
            sayimlar[s["k"].astimezone(tz)][0] += s["insan"]
            sayimlar[s["k"].astimezone(tz)][1] += s["bot_sayisi"]
    else:
        satirlar = (
            temel.annotate(k=TruncDate("zaman", tzinfo=tz)).values("k").order_by()
            .annotate(insan=Count("id", filter=Q(bot=False)), bot_sayisi=Count("id", filter=Q(bot=True)))
        )
        for s in satirlar:
            gun = s["k"]
            if birim == "hafta":
                gun = gun - timedelta(days=gun.weekday())
            sayimlar[gun][0] += s["insan"]
            sayimlar[gun][1] += s["bot_sayisi"]

    kovalar = []
    for b in baslangiclar:
        insan, bot = sayimlar.get(b, (0, 0))
        if birim == "saat":
            etiket = b.astimezone(tz).strftime("%H:00")
            baslangic = b
        elif birim == "hafta":
            etiket = f"{_gun_etiketi(b)} haftası"
            baslangic = _yerel_gece_yarisi(b, tz)
        else:
            etiket = _gun_etiketi(b)
            baslangic = _yerel_gece_yarisi(b, tz)
        kovalar.append({"baslangic": baslangic, "etiket": etiket, "sayi": insan + (bot if bot_dahil else 0), "bot": bot})
    return {
        "aralik": aralik,
        "birim": birim,
        "kovalar": kovalar,
        "toplam": sum(k["sayi"] for k in kovalar),
        "bot_toplam": sum(k["bot"] for k in kovalar),
        "baslangic": baslangic_dt,
        "bitis": bitis_dt,
    }


def _guzel_ust_sinir(en_yuksek):
    """Y ekseni için küçük, okunur bir üst sınır (1, 2, 5 x 10^n)."""
    if en_yuksek <= 4:
        return max(en_yuksek, 1)
    taban = 1
    while taban * 10 < en_yuksek:
        taban *= 10
    for kat in (1, 2, 5, 10):
        if kat * taban >= en_yuksek:
            return kat * taban
    return 10 * taban


def svg_cubuk_grafik(sonuc, baslik="", bot_dahil=False):
    """`seri()` sonucundan SVG (SafeString). `baslik` kullanıcı verisi olabilir (QR adı vb.): kaçırılır."""
    kovalar = sonuc["kovalar"]
    n = len(kovalar)
    gen, yuk = 720, 240
    sol, sag, ust, alt = 44, 10, 14, 34
    cizim_gen, cizim_yuk = gen - sol - sag, yuk - ust - alt
    en_yuksek = max([k["sayi"] for k in kovalar] + [0])
    ust_sinir = _guzel_ust_sinir(en_yuksek)
    birim_ad = {"saat": "saatlik", "gun": "günlük", "hafta": "haftalık"}[sonuc["birim"]]
    aralik_ad = dict(ARALIKLAR)[sonuc["aralik"]]
    ozet = f"{aralik_ad}, {birim_ad} tarama sayısı" + (" (bot dahil)" if bot_dahil else " (bot hariç)")
    ad_metni = f"{baslik}: {ozet}" if baslik else ozet

    adim = cizim_gen / max(n, 1)
    cubuk_gen = max(adim * 0.72, 1)
    parcalar = []
    for i, k in enumerate(kovalar):
        h = cizim_yuk * k["sayi"] / ust_sinir if ust_sinir else 0
        x = sol + i * adim + (adim - cubuk_gen) / 2
        y = ust + cizim_yuk - h
        parcalar.append(format_html(
            '<rect class="grafik-cubuk" x="{}" y="{}" width="{}" height="{}"><title>{}: {}</title></rect>',
            f"{x:.2f}", f"{y:.2f}", f"{cubuk_gen:.2f}", f"{h:.2f}", k["etiket"], k["sayi"],
        ))
    # X ekseni etiketleri: en çok ~7 adet
    her = max(1, -(-n // 7))
    etiketler = [
        format_html(
            '<text class="grafik-yazi" x="{}" y="{}" text-anchor="middle">{}</text>',
            f"{sol + i * adim + adim / 2:.2f}", yuk - 12, k["etiket"].replace(" haftası", ""),
        )
        for i, k in enumerate(kovalar) if i % her == 0
    ]
    return format_html(
        '<svg class="grafik-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {} {}" role="img" aria-label="{}" focusable="false">'
        '<title>{}</title>'
        '<line class="grafik-eksen" x1="{}" y1="{}" x2="{}" y2="{}"/>'
        '<line class="grafik-eksen" x1="{}" y1="{}" x2="{}" y2="{}"/>'
        '<text class="grafik-yazi" x="{}" y="{}" text-anchor="end">{}</text>'
        '<text class="grafik-yazi" x="{}" y="{}" text-anchor="end">0</text>'
        '{}{}</svg>',
        gen, yuk, ad_metni, ad_metni,
        sol, ust + cizim_yuk, gen - sag, ust + cizim_yuk,
        sol, ust, sol, ust + cizim_yuk,
        sol - 6, ust + 8, ust_sinir,
        sol - 6, ust + cizim_yuk,
        mark_safe("".join(parcalar)), mark_safe("".join(etiketler)),
    )
