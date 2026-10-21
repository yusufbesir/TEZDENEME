"""Özel model alanları."""
import logging

from django.db import models

from .sifreleme import SifrelemeHatasi, coz, sifrele

log = logging.getLogger(__name__)


class SifreliMetinAlani(models.TextField):
    """Değeri veritabanında Fernet ile şifreli saklar; Python tarafında düz metindir.

    - Yazarken her zaman şifreler (veritabanına düz metin gitmez).
    - Okurken çözer. Çözülemezse (anahtar kayıp/yanlış) None döner ve değer içermeyen bir uyarı loglar:
      çağıran kod None'u "eşleşmez" sayar (kapalı başarısızlık); yönetici `mfa_sifirla` ile kaydı siler.
    - Şifreli alanda arama (filter/lookup) desteklenmez: belirteçler her seferinde farklıdır.
    """

    description = "Fernet ile şifreli metin"

    def from_db_value(self, value, expression, connection):
        if value is None:
            return None
        try:
            return coz(value)
        except SifrelemeHatasi:
            log.warning("Şifreli alan çözülemedi (%s); MFA_SIFRELEME_ANAHTARI bu kaydı açamıyor.", self.name)
            return None

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value is None:
            return None
        return sifrele(value)

    def get_lookup(self, lookup_name):
        raise TypeError("Şifreli alanlarda sorgu (lookup) desteklenmez.")
