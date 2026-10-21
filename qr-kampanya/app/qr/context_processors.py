from django.conf import settings


def genel(request):
    return {"KISA_URL_TABANI": settings.KISA_URL_TABANI}
