"""Güvenli hata sayfaları: ayrıntı (yığın izi, sürüm) sızdırmaz."""
from django.shortcuts import render


def bulunamadi(request, exception=None):
    return render(request, "qr/genel/hata.html", {"baslik": "Sayfa bulunamadı", "kod": 404}, status=404)


def yasak(request, exception=None):
    return render(request, "qr/genel/hata.html", {"baslik": "Bu işlem için yetkiniz yok", "kod": 403}, status=403)


def sunucu_hatasi(request):
    return render(request, "qr/genel/hata.html", {"baslik": "Beklenmeyen bir hata oluştu", "kod": 500}, status=500)
