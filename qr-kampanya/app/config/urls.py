from django.conf import settings
from django.urls import include, path
from django.views.generic import RedirectView
from django.views.static import serve

from qr import yonlendirme

urlpatterns = [
    path("k/<str:kod>", yonlendirme.qr_yonlendir, name="qr_yonlendir"),
    path("s/<slug:slug>", yonlendirme.sayfa_goster, name="sayfa_goster"),
    path("saglik", yonlendirme.saglik, name="saglik"),
    path("ic/medya-yetki", yonlendirme.medya_yetki, name="medya_yetki"),
    path("panel/", include("qr.panel_urls")),
    path("", RedirectView.as_view(pattern_name="panel:ana", permanent=False)),
]

handler404 = "qr.hatalar.bulunamadi"
handler500 = "qr.hatalar.sunucu_hatasi"
handler403 = "qr.hatalar.yasak"

if settings.DEBUG:
    urlpatterns += [path("medya/<path:path>", serve, {"document_root": settings.MEDIA_ROOT})]
