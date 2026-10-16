from django.conf import settings
from django.urls import include, path, re_path
from django.views.generic import RedirectView
from django.views.static import serve

from qr import api, kod_istatistik, yonlendirme

urlpatterns = [
    # YOURLS uyumlu istatistik: /k/<kod>+ ve /k/<kod>+all (+ karakteri ya da %2B). Kısa kodlar "+" içeremez; bu yüzden çakışma yok.
    # Yönlendirme yolundan ÖNCE gelmeli.
    re_path(r"^k/(?P<kod>[^/+]+)\+(?P<tum>all)?$", kod_istatistik.kod_istatistik, name="kod_istatistik"),
    path("k/<str:kod>", yonlendirme.qr_yonlendir, name="qr_yonlendir"),
    path("s/<slug:slug>", yonlendirme.sayfa_goster, name="sayfa_goster"),
    path("robots.txt", yonlendirme.robots_txt, name="robots_txt"),
    path("saglik", yonlendirme.saglik, name="saglik"),
    path("ic/medya-yetki", yonlendirme.medya_yetki, name="medya_yetki"),
    path("api/v1/", api.api_v1, name="api_v1"),
    path("panel/", include("qr.panel_urls")),
    path("", RedirectView.as_view(pattern_name="panel:ana", permanent=False)),
]

handler404 = "qr.hatalar.bulunamadi"
handler500 = "qr.hatalar.sunucu_hatasi"
handler403 = "qr.hatalar.yasak"

if settings.DEBUG:
    urlpatterns += [path("medya/<path:path>", serve, {"document_root": settings.MEDIA_ROOT})]
