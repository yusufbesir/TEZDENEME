"""Django hata raporlarında gizlenecek ayar adları: varsayılan desene Türkçe karşılıklar eklenir."""
import re

from django.views.debug import SafeExceptionReporterFilter


class GizliAyarFiltresi(SafeExceptionReporterFilter):
    hidden_settings = re.compile(
        "API|AUTH|TOKEN|KEY|SECRET|PASS|SIGNATURE|HTTP_COOKIE|ANAHTAR|PAROLA|SIFRE|ŞIFRE", flags=re.I
    )
