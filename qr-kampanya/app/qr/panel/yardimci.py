"""Panel için ortak yardımcılar: yetki denetimi, sayfalama, tarih aralığı, dışa aktarma."""
import csv
from datetime import datetime, time, timedelta
from functools import wraps

from django.contrib.auth.views import redirect_to_login
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone

SAYFA_BOYUTU = 50
EN_FAZLA_GUN = 366


def yetki(*izinler):
    """Giriş zorunlu; verilen tüm model yetkileri gerekir.
    Giriş yoksa giriş sayfasına yönlendirir, yetki yoksa 403 döndürür."""

    def dekor(gorunum):
        @wraps(gorunum)
        def sarmal(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect_to_login(request.get_full_path())
            if not request.user.has_perms(izinler):
                raise PermissionDenied
            return gorunum(request, *args, **kwargs)

        return sarmal

    return dekor


def sayfalandir(request, sorgu, adet=SAYFA_BOYUTU):
    """(sayfa_nesnesi, sayfa_numarasi_olmayan_sorgu_dizesi) döndürür."""
    sayfa = Paginator(sorgu, adet).get_page(request.GET.get("sayfa_no"))
    parametreler = request.GET.copy()
    parametreler.pop("sayfa_no", None)
    return sayfa, parametreler.urlencode()


def _tarih(deger):
    try:
        return datetime.strptime((deger or "").strip(), "%Y-%m-%d").date()
    except ValueError:
        return None


def tarih_araligi(request, varsayilan_gun=30):
    """GET `baslangic`/`bitis` (YYYY-AA-GG, bitiş dahil) değerlerini okur.
    (baslangic_tarihi, bitis_tarihi, baslangic_dt, bitis_dt_haric, uyarilar) döndürür."""
    uyarilar = []
    bugun = timezone.localdate()
    bit = _tarih(request.GET.get("bitis"))
    bas = _tarih(request.GET.get("baslangic"))
    if (request.GET.get("bitis") and bit is None) or (request.GET.get("baslangic") and bas is None):
        uyarilar.append("Geçersiz tarih yok sayıldı; tarihler YYYY-AA-GG biçiminde olmalı.")
    bit = bit or bugun
    bas = bas or (bit - timedelta(days=varsayilan_gun - 1))
    if bas > bit:
        bas, bit = bit, bas
    if (bit - bas).days >= EN_FAZLA_GUN:
        bas = bit - timedelta(days=EN_FAZLA_GUN - 1)
        uyarilar.append(f"En fazla {EN_FAZLA_GUN} günlük aralık gösterilir.")
    tz = timezone.get_current_timezone()
    bas_dt = timezone.make_aware(datetime.combine(bas, time.min), tz)
    bit_dt = timezone.make_aware(datetime.combine(bit + timedelta(days=1), time.min), tz)
    return bas, bit, bas_dt, bit_dt, uyarilar


def qr_bitis_q(**kosul):
    """QR'ın etkin bitişi (kendi bitişi, yoksa kampanyasının bitişi) için Q nesnesi.
    Örn: qr_bitis_q(lte=an) → süresi dolmuşlar."""
    kendi = {f"bitis__{k}": v for k, v in kosul.items()}
    kampanya = {f"kampanya__bitis__{k}": v for k, v in kosul.items()}
    return Q(**kendi) | Q(bitis__isnull=True, **kampanya)


def etkin_bitis_ekle(qrler):
    """Her QR'a etkin_bitis (kendi bitişi, yoksa kampanyasının bitişi) niteliğini ekler."""
    qrler = list(qrler)
    for q in qrler:
        q.etkin_bitis = q.bitis or (q.kampanya.bitis if q.kampanya_id else None)
    return qrler


def insan_boyutu(bayt):
    try:
        deger = float(bayt)
    except (TypeError, ValueError):
        return "-"
    for birim in ("B", "KB", "MB", "GB"):
        if deger < 1024 or birim == "GB":
            return f"{deger:.0f} {birim}" if birim == "B" else f"{deger:.1f} {birim}"
        deger /= 1024


# --- Dışa aktarma ---

FORMUL_BASLANGICLARI = ("=", "+", "-", "@", "\t", "\r")
CSV_AYRACI = ";"  # Türkçe Excel uyumu


def hucre_guvenli(deger):
    """CSV/Excel formül enjeksiyonuna karşı: =, +, -, @ ile başlayan metnin başına ' eklenir.
    Sayılar ve boş değerler olduğu gibi kalır."""
    if deger is None:
        return ""
    if isinstance(deger, bool):
        return "Evet" if deger else "Hayır"
    if isinstance(deger, (int, float)):
        return deger
    metin = str(deger)
    if metin.startswith(FORMUL_BASLANGICLARI):
        return "'" + metin
    return metin


def csv_yaz(hedef, basliklar, satirlar):
    yazici = csv.writer(hedef, delimiter=CSV_AYRACI)
    yazici.writerow([hucre_guvenli(b) for b in basliklar])
    for satir in satirlar:
        yazici.writerow([hucre_guvenli(h) for h in satir])


def csv_yaniti(dosya_adi, basliklar, satirlar):
    """UTF-8 BOM'lu, `;` ayraçlı CSV: Türkçe Excel karakterleri ve sütunları doğru açar."""
    yanit = HttpResponse(content_type="text/csv; charset=utf-8")
    yanit["Content-Disposition"] = f'attachment; filename="{dosya_adi}.csv"'
    yanit.write("﻿")
    csv_yaz(yanit, basliklar, satirlar)
    return yanit


def xlsx_yaniti(dosya_adi, sayfa_adi, basliklar, satirlar):
    from io import BytesIO

    from openpyxl import Workbook

    kitap = Workbook()
    sayfa = kitap.active
    sayfa.title = sayfa_adi[:31]
    sayfa.append([hucre_guvenli(b) for b in basliklar])
    for satir in satirlar:
        sayfa.append([hucre_guvenli(h) for h in satir])
    # Metin hücreleri asla formül olarak yorumlanmasın.
    for satir in sayfa.iter_rows():
        for hucre in satir:
            if isinstance(hucre.value, str):
                hucre.data_type = "s"
    tampon = BytesIO()
    kitap.save(tampon)
    yanit = HttpResponse(
        tampon.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    yanit["Content-Disposition"] = f'attachment; filename="{dosya_adi}.xlsx"'
    return yanit


def tablo_yaniti(bicim, dosya_adi, sayfa_adi, basliklar, satirlar):
    if bicim == "xlsx":
        return xlsx_yaniti(dosya_adi, sayfa_adi, basliklar, satirlar)
    return csv_yaniti(dosya_adi, basliklar, satirlar)


def yerel_metin(dt):
    return timezone.localtime(dt).strftime("%d.%m.%Y %H:%M") if dt else ""

