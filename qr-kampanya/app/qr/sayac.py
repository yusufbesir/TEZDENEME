"""Giriş/MFA deneme sayaçları (veritabanı destekli, atomik).

Önbellek (DatabaseCache) `incr` işlemi atomik değildir; paralel istekler sayaçtan düşebilir.
Burada her artırma tek bir `UPDATE ... SET sayi = sayi + 1` ile yapılır; satır kilidi eşzamanlı
istekleri sıraya koyar. Kilit kontrolü ve sayma TEK adımdır (`dene`): önce sayılır, sınır aşıldıysa
istek reddedilir (parola doğrulaması hiç çalışmaz). Başarılı doğrulamada `iade`/`sifirla` çağrılır.

Anahtarlar ham kullanıcı adı/IP içermez (SHA-256 özeti).
"""
import hashlib
import random
import unicodedata
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from .middleware import ip_anahtari
from .models import DenemeSayaci


def ad_normalle(ad):
    """Kullanıcı adı normalleştirme: NFKC + casefold (Django'nun AuthenticationForm/normalize_username davranışıyla uyumlu).
    `ｅditor` gibi eşdeğer varyantlar aynı sayaca düşer."""
    return unicodedata.normalize("NFKC", (ad or "").strip()).casefold()


def kullaniciyi_bul(ad):
    """NFKC normalleştirilmiş adla kullanıcıyı (büyük/küçük harf duyarlı, Django gibi) bulur; yoksa None."""
    from django.contrib.auth import get_user_model

    Kullanici = get_user_model()
    ham = unicodedata.normalize("NFKC", (ad or "").strip())
    if not ham:
        return None
    return Kullanici.objects.filter(**{Kullanici.USERNAME_FIELD: ham}).first()


def anahtar_uret(onek, *parcalar):
    ham = "|".join(ad_normalle(p) if isinstance(p, str) else str(p) for p in parcalar)
    return f"{onek}:{hashlib.sha256(ham.encode()).hexdigest()}"[:100]


def dene(anahtar, sinir, sure_sn):
    """Sayacı bir artırır. (izinli, sayi) döndürür; izinli = sayi <= sinir.
    Süresi dolmuş kayıt 1'e sıfırlanır. Sınıra ulaşıldığı anda kilit süresi baştan başlar."""
    if random.random() < 0.001:  # ara sıra süresi dolanları temizle; asıl temizlik yedek servisinin günlük döngüsünde
        temizle()
    simdi = timezone.now()
    bitis = simdi + timedelta(seconds=sure_sn)
    with transaction.atomic():
        sorgu = DenemeSayaci.objects.filter(anahtar=anahtar)
        for _ in range(3):
            if sorgu.filter(bitis__gt=simdi).update(sayi=F("sayi") + 1):
                break
            if sorgu.filter(bitis__lte=simdi).update(sayi=1, bitis=bitis):
                break
            try:
                with transaction.atomic():
                    DenemeSayaci.objects.create(anahtar=anahtar, sayi=1, bitis=bitis)
                break
            except IntegrityError:  # eşzamanlı istek oluşturdu; yeniden dene
                continue
        sayi = sorgu.values_list("sayi", flat=True).first() or 0
        if sinir > 0 and sayi == sinir:
            sorgu.update(bitis=bitis)
    return (sinir <= 0 or sayi <= sinir), sayi


def iade(anahtar):
    """Başarılı doğrulamada, önceden sayılan denemeyi geri alır (en fazla sıfıra kadar)."""
    DenemeSayaci.objects.filter(anahtar=anahtar, sayi__gt=0).update(sayi=F("sayi") - 1)


def sifirla(*anahtarlar):
    DenemeSayaci.objects.filter(anahtar__in=anahtarlar).delete()


def temizle():
    """Süresi dolmuş kayıtları siler (isteğe bağlı bakım)."""
    return DenemeSayaci.objects.filter(bitis__lte=timezone.now()).delete()[0]


def hesap_anahtari(kullanici_adi, kullanici=None):
    """Kullanıcı varsa anahtar user.pk'den, yoksa normalleştirilmiş addan üretilir."""
    if kullanici is None:
        kullanici = kullaniciyi_bul(kullanici_adi)
    if kullanici is not None:
        return anahtar_uret("hesap", "pk", kullanici.pk)
    return anahtar_uret("hesap", "ad", kullanici_adi)


class GirisDenemesi:
    """Bir parola/MFA denemesi için üç sayaç: (kullanıcı+IP), hesap (IP'den bağımsız), IP (kullanıcıdan bağımsız).
    `say()` kilit kontrolü ve sayma işini tek adımda yapar; False dönerse istek reddedilmelidir."""

    def __init__(self, onek, kullanici_adi, ip, kullanici=None):
        ip = ip_anahtari(ip)  # IPv6: /64 öneki
        self.k_ui = anahtar_uret(onek, kullanici_adi, ip)
        self.k_ip = anahtar_uret("ip", ip)
        self.k_hesap = hesap_anahtari(kullanici_adi, kullanici)
        self.sayi_ui = self.sayi_ip = self.sayi_hesap = 0

    def _limitler(self):
        return settings.GIRIS_DENEME_SINIRI, settings.IP_DENEME_SINIRI, settings.HESAP_DENEME_SINIRI

    def say(self):
        sure = settings.GIRIS_KILIT_SURESI_SN
        l_ui, l_ip, l_hesap = self._limitler()
        ok_ui, self.sayi_ui = dene(self.k_ui, l_ui, sure)
        ok_ip, self.sayi_ip = dene(self.k_ip, l_ip, sure)
        if not (ok_ui and ok_ip):
            # Kısa devre: IP/kullanıcı+IP sayacı zaten reddediyorsa hesap sayacı artırılmaz;
            # tek bir IP hesabı kilitli tutamaz.
            return False
        ok_hesap, self.sayi_hesap = dene(self.k_hesap, l_hesap, sure)
        return ok_hesap

    @property
    def sinira_ulasti(self):
        """Bu deneme dahil herhangi bir sayaç sınıra ulaştı mı (sonraki istek reddedilecek mi)?"""
        return any(l > 0 and n >= l for n, l in zip((self.sayi_ui, self.sayi_ip, self.sayi_hesap), self._limitler()))

    def basarili(self):
        """Doğrulama geçti: bu denemeyi sayaçlardan düşer (kullanıcı+IP sayacı sıfırlanır).
        Hesap sayacındaki önceki başarısız denemeler korunur; tam giriş bitince `tam_giris` ile silinir."""
        sifirla(self.k_ui)
        iade(self.k_ip)
        iade(self.k_hesap)


def tam_giris(kullanici_adi, kullanici=None):
    """Giriş (parola + varsa MFA) tamamlandı: hesap sayacı sıfırlanır."""
    sifirla(hesap_anahtari(kullanici_adi, kullanici))
