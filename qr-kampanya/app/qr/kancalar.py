"""Basit kanca (hook) kaydı: eklentiler (docs/EKLENTILER.md) ana işleme dokunmadan olaylara tepki verebilir.

Olaylar ve anahtar sözcük bağımsız değişkenleri:
  qr_olusturuldu          qr=<QRKod>
  qr_hedef_degisti        qr=<QRKod>, eski_hedef=(hedef_turu, hedef_url, sayfa_id), yeni_hedef=(...)
  tarama_kaydedildi       tarama=<Tarama>      (Tarama IP/User-Agent saklamaz; eklentiye de verilmez)
  link_agaci_goruntulendi agac=<LinkAgaci>

Güvence: bir kancanın hatası (istisna, SystemExit dahil) YAKALANIR ve günlüğe yazılır; ana işlemi ve diğer kancaları bozmaz.
Kancalar ana işlem kesinleşince (transaction.on_commit) ve eşzamanlı çalışır; kısa tutulmalıdır. Python'da çalışan bir
işlevi dışarıdan güvenle kesmek mümkün olmadığından süre sınırı ZORLANMAZ: KANCA_YAVAS_SN'yi aşan kanca günlüğe uyarı düşer.
Kancalar işlem başına (süreç) bellekte tutulur; kalıcı bir şey yazmaz.
"""
import logging
import time

from django.db import transaction

log = logging.getLogger(__name__)

OLAYLAR = ("qr_olusturuldu", "qr_hedef_degisti", "tarama_kaydedildi", "link_agaci_goruntulendi")
KANCA_YAVAS_SN = 0.5

_kayit = {olay: [] for olay in OLAYLAR}


def kanca_kaydet(olay, islev):
    """`islev(**veri)` işlevini olaya bağlar. Bilinmeyen olay ValueError verir (yazım hatası sessiz kalmasın)."""
    if olay not in _kayit:
        raise ValueError(f"Bilinmeyen kanca olayı: {olay!r} (geçerli: {', '.join(OLAYLAR)})")
    if not callable(islev):
        raise TypeError("Kanca çağrılabilir olmalıdır.")
    if islev not in _kayit[olay]:
        _kayit[olay].append(islev)
    return islev


def kanca(olay):
    """Dekoratör: `@kanca("tarama_kaydedildi")`."""
    def sarmal(islev):
        return kanca_kaydet(olay, islev)
    return sarmal


def kancalar(olay=None):
    """Kayıtlı kancalar (salt okunur kopya): {olay: [islev, ...]} ya da tek olay için liste."""
    if olay is not None:
        return list(_kayit.get(olay, ()))
    return {o: list(l) for o, l in _kayit.items()}


def sifirla():
    """Bütün kancaları kaldırır (testler için)."""
    for liste in _kayit.values():
        liste.clear()


def tetikle(olay, **veri):
    """Olayın kancalarını sırayla çağırır. ASLA istisna fırlatmaz. Çalıştırılan kanca sayısını döndürür."""
    sayi = 0
    for islev in list(_kayit.get(olay, ())):
        baslangic = time.monotonic()
        try:
            islev(**veri)
        except BaseException as hata:  # noqa: BLE001 - eklenti hatası (SystemExit dahil) ana işlemi bozamaz
            if isinstance(hata, KeyboardInterrupt):
                raise
            log.exception("Kanca hatası yoksayıldı (olay=%s, kanca=%s.%s)", olay, getattr(islev, "__module__", "?"), getattr(islev, "__name__", "?"))
        else:
            sayi += 1
        sure = time.monotonic() - baslangic
        if sure > KANCA_YAVAS_SN:
            log.warning("Kanca yavaş (%.2f sn, olay=%s, kanca=%s.%s); kancalar kısa tutulmalı", sure, olay, getattr(islev, "__module__", "?"), getattr(islev, "__name__", "?"))
    return sayi


def commit_sonrasi_tetikle(olay, **veri):
    """Kanca yoksa hiçbir şey yapmaz; varsa mevcut işlem kesinleşince (işlem yoksa hemen) çalıştırır.
    İşlem geri alınırsa kanca çalışmaz. on_commit kaydı da hata verirse yakalanır."""
    if not _kayit.get(olay):
        return
    try:
        transaction.on_commit(lambda: tetikle(olay, **veri))
    except Exception:  # noqa: BLE001
        log.exception("Kanca on_commit kaydı yapılamadı (olay=%s)", olay)
