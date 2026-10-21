"""Örnek eklenti: olayları yalnızca günlüğe yazar (varsayılan KAPALI; QR_EKLENTILER=ornek_gunluk ile açılır)."""
import logging

from qr.kancalar import kanca

log = logging.getLogger("eklentiler.ornek_gunluk")


@kanca("qr_olusturuldu")
def qr_olusturuldu(qr, **_):
    log.info("Eklenti: QR oluşturuldu kod=%s", qr.kisa_kod)


@kanca("qr_hedef_degisti")
def qr_hedef_degisti(qr, **_):
    log.info("Eklenti: QR hedefi değişti kod=%s", qr.kisa_kod)


@kanca("tarama_kaydedildi")
def tarama_kaydedildi(tarama, **_):
    # Tarama nesnesi IP/User-Agent saklamaz; yalnızca kod, sonuç ve cihaz türü günlüğe yazılır.
    log.info("Eklenti: tarama kod_id=%s sonuc=%s cihaz=%s", tarama.qr_id, tarama.sonuc, tarama.cihaz)


@kanca("link_agaci_goruntulendi")
def link_agaci_goruntulendi(agac, **_):
    log.info("Eklenti: link ağacı görüntülendi slug=%s", agac.slug)
