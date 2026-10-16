"""Hesap güvenliği olaylarında API erişiminin otomatik kapatılması (docs/GUVENLIK.md).

Olaylar: parola değişimi (panel, `changepassword`, admin, kod ile `set_password`+`save` — hepsi User.password
alanını değiştirir), kullanıcının pasifleştirilmesi, rol (grup) değişimi. Her biri `api_erisimini_kapat` çağırır:
aktif anahtarlar iptal edilir (silinmez), API parola girişi kapatılır, etki olduysa denetim kaydına tek satır yazılır.

Neden sinyal: parola hash'i hangi yoldan değişirse değişsin (panel formu, yönetim komutu, shell) tek noktada yakalanır;
yalnızca panel görünümlerine konan bir çağrı `changepassword` komutunu kaçırırdı. `pre_save` eski değeri okur
(değişim var mı?), `post_save` kayıt başarıyla yazıldıktan sonra iptali uygular.

Parola karmasının yeniden hesaplanması (Django, giriş sırasında eski algoritmayı/parametreyi yükseltir) PAROLA DEĞİŞİMİ
DEĞİLDİR. Django bunu `save(update_fields=["password"])` ile yapar ve düz parolayı o anda artık tutmaz; bu yüzden ayrım:
yalnızca-`password` kaydı VE eski özetin güncelleme gerektirmesi (Django'nun kendi koşulu: tercih edilen hasher değil ya da
`must_update`) ise yükseltme sayılır. Panel/komut/admin parola değişimleri `update_fields` vermediği için yakalanır.
MFA sıfırlama sinyalle değil, ilgili iki yerde (panel `_sifirla`, `mfa_sifirla` komutu) açıkça çağrılır.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import get_hasher, identify_hasher
from django.db.models.signals import m2m_changed, post_save, pre_save
from django.dispatch import receiver

from .servisler import api_erisimini_kapat

Kullanici = get_user_model()
_BEKLEYEN = "_api_kapatma_nedenleri"


def _yukseltme_mi(eski_ozet):
    """Django'nun giriş sırasında yaptığı otomatik yeniden karma koşulu (check_password içindeki must_update ile aynı)."""
    try:
        eski = identify_hasher(eski_ozet)
    except ValueError:
        return False  # tanınmayan/kullanılamaz parola: yükseltme değil
    tercih = get_hasher("default")
    return eski.algorithm != tercih.algorithm or tercih.must_update(eski_ozet)


@receiver(pre_save, sender=Kullanici, dispatch_uid="qr_api_kullanici_pre_save")
def kullanici_kaydedilmeden(sender, instance, raw=False, update_fields=None, **kwargs):
    setattr(instance, _BEKLEYEN, [])
    if raw or instance.pk is None or instance._state.adding:
        return
    if update_fields is not None and not {"password", "is_active"} & set(update_fields):
        return  # örn. yalnızca last_login: ek sorgu yok
    eski = Kullanici.objects.filter(pk=instance.pk).values("password", "is_active").first()
    if eski is None:
        return
    nedenler = []
    yukseltme = update_fields is not None and set(update_fields) == {"password"} and _yukseltme_mi(eski["password"])
    if eski["password"] != instance.password and not yukseltme:
        nedenler.append("parola değiştirildi")
    if eski["is_active"] and not instance.is_active:
        nedenler.append("kullanıcı pasifleştirildi")
    setattr(instance, _BEKLEYEN, nedenler)


@receiver(post_save, sender=Kullanici, dispatch_uid="qr_api_kullanici_post_save")
def kullanici_kaydedildi(sender, instance, created=False, raw=False, **kwargs):
    nedenler = getattr(instance, _BEKLEYEN, None)
    if not nedenler or created or raw:
        return
    setattr(instance, _BEKLEYEN, [])
    api_erisimini_kapat(instance, " ve ".join(nedenler))


@receiver(m2m_changed, sender=Kullanici.groups.through, dispatch_uid="qr_api_kullanici_gruplari")
def kullanici_gruplari_degisti(sender, instance, action, reverse, pk_set, **kwargs):
    """Rol (grup) değişimi. Değişmeyen `set()` boş pk_set ile gelir ve yok sayılır. Yalnızca 'pre_' eylemleri
    işlenir (tek kez; iptal işlem içinde olduğundan geri alınan değişiklikle birlikte geri alınır)."""
    if action not in ("pre_add", "pre_remove", "pre_clear"):
        return
    if action != "pre_clear" and not pk_set:
        return
    if not reverse:
        kullanicilar = [instance]
    elif action == "pre_clear":
        kullanicilar = list(instance.user_set.all())
    else:
        kullanicilar = list(Kullanici.objects.filter(pk__in=pk_set))
    for kullanici in kullanicilar:
        api_erisimini_kapat(kullanici, "rol (grup) değiştirildi")
