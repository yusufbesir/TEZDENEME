"""MFA (TOTP) gizli anahtarlarının veritabanında şifreli saklanması.

- Şifreleme: `cryptography` Fernet (AES-128-CBC + HMAC-SHA256, kimlik doğrulamalı).
- Anahtar: MFA_SIFRELEME_ANAHTARI ortam değişkeni (urlsafe base64, 32 bayt). Virgülle ayrılmış birden çok anahtar
  anahtar döndürmedir: İLK anahtar yeni şifrelemede kullanılır, hepsi çözmede denenir. DJANGO_SECRET_KEY'den
  anahtar TÜRETİLMEZ.
- Düz metin değer hiçbir yerde loglanmaz; hata iletileri değer içermez.

Bu modül Django modellerini içe aktarmaz (settings ve migrasyonlar da kullanır).
"""
import logging

from cryptography.fernet import Fernet, InvalidToken, MultiFernet

log = logging.getLogger(__name__)

ANAHTAR_ORTAM_ADI = "MFA_SIFRELEME_ANAHTARI"
_URETME_IPUCU = (
    "Yeni anahtar üretmek için: python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\" "
    "(scripts/kurulum.sh ve scripts/guncelle.sh bunu .env dosyasına kendisi ekler)."
)
# Bir Fernet belirteci: 0x80 sürüm baytı + zaman damgası (8 bayt sıfırla başlar) -> base64 "gAAAAA..." ve en az 73 bayt.
# TOTP gizli anahtarı base32'dir (büyük harf + 2-7); "g" ile başlayamaz, dolayısıyla karışmaz.
_BELIRTEC_ONEKI = "gAAAAA"


class SifrelemeHatasi(Exception):
    """Anahtar yok/geçersiz ya da kayıt çözülemedi. İleti hiçbir gizli değer içermez."""


def anahtarlari_hazirla(ham):
    """Ham ayar metninden MultiFernet üretir; yoksa/geçersizse SifrelemeHatasi (Türkçe, anlaşılır)."""
    parcalar = [p.strip() for p in (ham or "").split(",") if p.strip()]
    if not parcalar:
        raise SifrelemeHatasi(
            f"{ANAHTAR_ORTAM_ADI} ortam değişkeni tanımlı değil. MFA gizli anahtarları bu anahtarla şifrelenir; "
            f"anahtarsız uygulama başlamaz. {_URETME_IPUCU}"
        )
    fernetler = []
    for sira, parca in enumerate(parcalar, start=1):
        try:
            fernetler.append(Fernet(parca.encode("ascii")))
        except (ValueError, TypeError, UnicodeEncodeError):
            raise SifrelemeHatasi(
                f"{ANAHTAR_ORTAM_ADI} içindeki {sira}. anahtar geçersiz: 32 baytlık urlsafe base64 (44 karakter, "
                f"sonu '=') olmalı; birden çok anahtar virgülle ayrılır. {_URETME_IPUCU}"
            ) from None
    return MultiFernet(fernetler)


def _fernet():
    from django.conf import settings

    return anahtarlari_hazirla(getattr(settings, ANAHTAR_ORTAM_ADI, ""))


def belirec_bicimli_mi(deger):
    """Değer bir Fernet belirteci gibi görünüyor mu (çözmeyi denemeden, yalnızca biçim)."""
    return isinstance(deger, str) and len(deger) >= 100 and deger.startswith(_BELIRTEC_ONEKI)


def sifrele(duz, fernet=None):
    """Düz metni şifreler (str -> str belirteç). Her çağrı farklı belirteç üretir."""
    fernet = fernet or _fernet()
    return fernet.encrypt(duz.encode("utf-8")).decode("ascii")


def coz(belirec, fernet=None):
    """Belirteci çözer; anahtar uymuyorsa/bozuksa SifrelemeHatasi."""
    fernet = fernet or _fernet()
    try:
        return fernet.decrypt(belirec.encode("ascii")).decode("utf-8")
    except (InvalidToken, UnicodeError, ValueError, TypeError):
        raise SifrelemeHatasi(
            f"Şifreli MFA kaydı çözülemedi: {ANAHTAR_ORTAM_ADI} bu kaydı şifreleyen anahtarı içermiyor ya da kayıt bozuk. "
            "Eski anahtarı listeden çıkarmayın; kayıp anahtar için kullanıcıyı `mfa_sifirla` ile sıfırlayın."
        ) from None


def yeniden_sifrele(belirec, fernet=None):
    """Belirteci ilk (güncel) anahtarla yeniden şifreler (anahtar döndürme)."""
    fernet = fernet or _fernet()
    try:
        return fernet.rotate(belirec.encode("ascii")).decode("ascii")
    except (InvalidToken, UnicodeError, ValueError, TypeError):
        raise SifrelemeHatasi("Şifreli MFA kaydı yeniden şifrelenemedi (anahtar uymuyor ya da kayıt bozuk).") from None


def tabloyu_donustur(baglanti, yon, fernet=None, tablo="qr_mfacihazi", sutun="gizli_anahtar"):
    """Ham SQL ile tablodaki bütün satırları dönüştürür (model alanı atlanır; böylece çift şifreleme olmaz).

    yon="sifrele": düz metni şifreler; zaten belirteç olanı (çözülebiliyorsa) olduğu gibi bırakır (idempotent).
    yon="coz"    : belirteci düz metne çevirir; düz metin olana dokunmaz.
    Önce BÜTÜN satırlar bellekte dönüştürülür; herhangi biri çözülemezse hiçbir satır değiştirilmez.
    Satır silinmez. Değişen satır sayısını döndürür.
    """
    fernet = fernet or _fernet()
    with baglanti.cursor() as imlec:
        imlec.execute(f"SELECT id, {sutun} FROM {tablo} ORDER BY id")
        satirlar = imlec.fetchall()
        degisecek = []
        for pk, deger in satirlar:
            if not deger:
                continue
            if belirec_bicimli_mi(deger):
                if yon == "sifrele":
                    coz(deger, fernet)  # çözülemiyorsa SifrelemeHatasi: yanlış anahtarla sessizce çift şifreleme yapılmaz
                else:
                    degisecek.append((coz(deger, fernet), pk))
            elif yon == "sifrele":
                degisecek.append((sifrele(deger, fernet), pk))
        for yeni, pk in degisecek:
            imlec.execute(f"UPDATE {tablo} SET {sutun} = %s WHERE id = %s", [yeni, pk])
    return len(degisecek)
