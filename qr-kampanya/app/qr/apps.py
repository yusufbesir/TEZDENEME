from django.apps import AppConfig


class QrConfig(AppConfig):
    name = "qr"
    verbose_name = "QR Kampanya"

    def ready(self):
        # Yalnızca QR_EKLENTILER'de adı geçen eklentiler yüklenir (varsayılan: hiçbiri).
        from django.conf import settings

        from . import eklenti_yonetimi, sinyaller  # noqa: F401  (sinyaller: hesap olaylarında API erişimini kapatır)

        if settings.QR_EKLENTILER:
            eklenti_yonetimi.yukle(settings.QR_EKLENTILER)
