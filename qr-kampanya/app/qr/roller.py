"""Kullanıcı rolleri ve yetkileri.

- Yönetici: her şey + kullanıcı yönetimi + genel ayarlar
- Editör:   QR kod, kampanya, sayfa, ürün, mağaza ekleme/düzenleme/arşivleme; içe/dışa aktarma
- İzleyici: yalnızca görüntüleme ve rapor alma
"""
YONETICI = "Yönetici"
EDITOR = "Editör"
IZLEYICI = "İzleyici"

ICERIK_MODELLERI = ["qrkod", "kampanya", "kampanyasayfasi", "sayfagorseli", "urun", "magaza"]
SALT_OKUNUR_MODELLER = ["tarama", "hedefgecmisi", "denetimkaydi", "genelayarlar"]


def rol_yetkileri():
    goruntule = [f"qr.view_{m}" for m in ICERIK_MODELLERI + SALT_OKUNUR_MODELLER]
    duzenle = [f"qr.{e}_{m}" for m in ICERIK_MODELLERI for e in ("add", "change")]
    return {
        IZLEYICI: goruntule,
        EDITOR: goruntule + duzenle,
        YONETICI: goruntule + duzenle + ["qr.change_genelayarlar", "auth.view_user", "auth.add_user", "auth.change_user"],
    }


def kullanici_rolu(kullanici):
    if kullanici.is_superuser:
        return YONETICI
    adlar = set(kullanici.groups.values_list("name", flat=True))
    for rol in (YONETICI, EDITOR, IZLEYICI):
        if rol in adlar:
            return rol
    return None
