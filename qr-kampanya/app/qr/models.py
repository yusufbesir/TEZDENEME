"""Veri modeli. Ayrıntılı açıklama: docs/VERI-MODELI.md

Temel ilke: Basılmış bir QR kodun kısa kodu hiçbir zaman değişmez, silinmez ve
başka bir kayda verilmez. Silme yerine arşivleme kullanılır.
"""
import re
import secrets
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from .alanlar import SifreliMetinAlani
from .dogrulama import guvenli_url_dogrula

KISA_KOD_DESENI = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{1,62}[A-Za-z0-9]$")
# Karışıklık yaratan karakterler (0/O, 1/I/L) otomatik kodlarda kullanılmaz.
OTOMATIK_KOD_ALFABESI = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


def otomatik_kisa_kod(uzunluk=8):
    """Tahmin edilmesi zor rastgele kısa kod (31^8 ≈ 8,5 × 10^11 olasılık)."""
    return "".join(secrets.choice(OTOMATIK_KOD_ALFABESI) for _ in range(uzunluk))


# Kısa kod olarak verilemeyecek varsayılan kelimeler (uygulama yollarıyla çakışmasın). Küçük harfle karşılaştırılır.
# Ek kelimeler GenelAyarlar.ayrilmis_kodlar alanından gelir. Yalnızca YENİ kodlar denetlenir.
VARSAYILAN_AYRILMIS_KODLAR = (
    "admin", "panel", "api", "k", "s", "saglik", "static", "media", "giris", "cikis", "robots", "favicon",
)


def ayrilmis_kodlar_kumesi(ek_metin=""):
    """Varsayılan + ayardaki (satır veya virgülle ayrılmış) ayrılmış kelimelerin küçük harfli kümesi."""
    kume = set(VARSAYILAN_AYRILMIS_KODLAR)
    for parca in re.split(r"[,\n\r;]+", ek_metin or ""):
        parca = parca.strip().lower()
        if parca:
            kume.add(parca)
    return kume


def ayrilmis_kod_hatasi(kod, kume):
    """Kod ayrılmış bir kelimeyse Türkçe hata metni, değilse None."""
    if (kod or "").strip().lower() in kume:
        return f"“{(kod or '').strip()}” ayrılmış bir kelimedir ve kısa kod olarak kullanılamaz."
    return None


def kisa_kod_dogrula(deger):
    if not KISA_KOD_DESENI.match(deger or ""):
        raise ValidationError(
            "Kısa kod 3-64 karakter olmalı; yalnızca harf, rakam, tire (-) ve alt çizgi (_) içerebilir, "
            "harf veya rakamla başlayıp bitmelidir."
        )


class ZamanDamgali(models.Model):
    olusturma = models.DateTimeField("oluşturulma", auto_now_add=True)
    guncelleme = models.DateTimeField("son güncelleme", auto_now=True)

    class Meta:
        abstract = True


class Magaza(ZamanDamgali):
    kod = models.CharField("mağaza kodu", max_length=64, unique=True)
    ad = models.CharField("mağaza / şube adı", max_length=200)
    adres = models.TextField("adres", blank=True)
    aktif = models.BooleanField("aktif", default=True)

    class Meta:
        verbose_name = "mağaza"
        verbose_name_plural = "mağazalar"
        ordering = ["ad"]

    def __str__(self):
        return f"{self.kod} - {self.ad}"


class Urun(ZamanDamgali):
    kod = models.CharField("ürün kodu", max_length=64, unique=True)
    ad = models.CharField("ürün adı", max_length=200)
    aciklama = models.TextField("açıklama", blank=True)

    class Meta:
        verbose_name = "ürün"
        verbose_name_plural = "ürünler"
        ordering = ["kod"]

    def __str__(self):
        return f"{self.kod} - {self.ad}"


class Kampanya(ZamanDamgali):
    kod = models.CharField("kampanya kodu", max_length=64, unique=True)
    ad = models.CharField("kampanya adı", max_length=200)
    aciklama = models.TextField("açıklama", blank=True)
    baslangic = models.DateTimeField("başlangıç", null=True, blank=True)
    bitis = models.DateTimeField("bitiş", null=True, blank=True)
    aktif = models.BooleanField("aktif", default=True)

    class Meta:
        verbose_name = "kampanya"
        verbose_name_plural = "kampanyalar"
        ordering = ["-baslangic", "kod"]

    def __str__(self):
        return f"{self.kod} - {self.ad}"

    def clean(self):
        if self.baslangic and self.bitis and self.bitis <= self.baslangic:
            raise ValidationError({"bitis": "Bitiş tarihi başlangıçtan sonra olmalı."})


def gorsel_yolu(instance, dosya_adi):
    uzanti = dosya_adi.rsplit(".", 1)[-1].lower() if "." in dosya_adi else "jpg"
    return f"sayfa/{timezone.now():%Y/%m}/{uuid.uuid4().hex}.{uzanti}"


class KampanyaSayfasi(ZamanDamgali):
    """Sistem içinde yayınlanan kampanya / ürün / mağaza / bilgi sayfası.

    Yayınlanmış sayfanın adresi (/s/<slug>) kalıcıdır; slug oluşturulduktan sonra değişmez.
    """

    class Tur(models.TextChoices):
        KAMPANYA = "kampanya", "Kampanya sayfası"
        URUN = "urun", "Ürün bilgi sayfası"
        MAGAZA = "magaza", "Mağaza sayfası"
        BILGI = "bilgi", "Bilgilendirme sayfası"

    class Durum(models.TextChoices):
        TASLAK = "taslak", "Taslak"
        YAYINDA = "yayinda", "Yayında"
        ARSIV = "arsiv", "Arşiv"

    slug = models.SlugField("sayfa adresi", max_length=100, unique=True, allow_unicode=False)
    tur = models.CharField("sayfa türü", max_length=20, choices=Tur.choices, default=Tur.KAMPANYA)
    durum = models.CharField("durum", max_length=10, choices=Durum.choices, default=Durum.TASLAK, db_index=True)
    kampanya = models.ForeignKey(Kampanya, verbose_name="kampanya", null=True, blank=True, on_delete=models.PROTECT, related_name="sayfalar")
    baslik = models.CharField("başlık", max_length=200)
    aciklama = models.TextField("açıklama", blank=True)
    kapak_gorseli = models.ImageField("kapak görseli", upload_to=gorsel_yolu, blank=True)
    logo = models.ImageField("marka logosu", upload_to=gorsel_yolu, blank=True)
    baslangic = models.DateTimeField("kampanya başlangıcı", null=True, blank=True)
    bitis = models.DateTimeField("kampanya bitişi", null=True, blank=True)
    kosullar = models.TextField("kampanya koşulları", blank=True)
    buton_metni = models.CharField("buton metni", max_length=80, blank=True)
    buton_url = models.URLField("buton bağlantısı", max_length=2000, blank=True, validators=[guvenli_url_dogrula])
    urun_kodu = models.CharField("ürün kodu", max_length=64, blank=True)
    fiyat = models.CharField("fiyat bilgisi", max_length=64, blank=True, help_text="Örn: 1.299 TL")
    seo_baslik = models.CharField("SEO başlığı", max_length=70, blank=True)
    seo_aciklama = models.CharField("SEO açıklaması", max_length=160, blank=True)
    renk_tema = models.CharField(
        "renk teması", max_length=20, default="siyah-bej",
        choices=[("siyah-bej", "Siyah / bej / bronz"), ("beyaz-gold", "Beyaz / gold"), ("sade", "Sade beyaz")],
    )
    olusturan = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    degistiren = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        verbose_name = "kampanya sayfası"
        verbose_name_plural = "kampanya sayfaları"
        ordering = ["-guncelleme"]

    def __str__(self):
        return self.baslik

    def clean(self):
        if self.baslangic and self.bitis and self.bitis <= self.baslangic:
            raise ValidationError({"bitis": "Bitiş tarihi başlangıçtan sonra olmalı."})
        if bool(self.buton_metni) != bool(self.buton_url):
            raise ValidationError("Buton metni ve buton bağlantısı birlikte doldurulmalı.")

    def delete(self, *args, **kwargs):
        raise ValidationError("Sayfalar silinmez, arşivlenir.")


class SayfaGorseli(models.Model):
    sayfa = models.ForeignKey(KampanyaSayfasi, on_delete=models.CASCADE, related_name="gorseller")
    gorsel = models.ImageField("görsel", upload_to=gorsel_yolu)
    aciklama = models.CharField("açıklama", max_length=200, blank=True)
    sira = models.PositiveIntegerField("sıra", default=0)

    class Meta:
        ordering = ["sira", "id"]
        verbose_name = "sayfa görseli"
        verbose_name_plural = "sayfa görselleri"


class QRKod(ZamanDamgali):
    class Tur(models.TextChoices):
        KAMPANYA = "kampanya", "Kampanya"
        URUN = "urun", "Ürün"
        MAGAZA = "magaza", "Mağaza"
        BILGI = "bilgi", "Bilgilendirme"
        DIGER = "diger", "Diğer"

    class HedefTuru(models.TextChoices):
        HARICI = "harici", "Harici web adresi"
        SAYFA = "sayfa", "Sistemdeki sayfa"

    class Durum(models.TextChoices):
        AKTIF = "aktif", "Aktif"
        PASIF = "pasif", "Pasif"
        ARSIV = "arsiv", "Arşiv"

    kimlik = models.UUIDField("sistem kimliği", default=uuid.uuid4, unique=True, editable=False)
    kisa_kod = models.CharField("kısa kod", max_length=64, validators=[kisa_kod_dogrula])
    # Büyük/küçük harf duyarsız benzersizlik ve hızlı arama için normalize edilmiş anahtar.
    kod_anahtari = models.CharField(max_length=64, unique=True, editable=False)
    ad = models.CharField("QR kod adı", max_length=200, blank=True)
    baslik = models.CharField("hedef başlığı", max_length=300, blank=True)
    tur = models.CharField("tür", max_length=20, choices=Tur.choices, default=Tur.KAMPANYA)
    urun = models.ForeignKey(Urun, verbose_name="ürün", null=True, blank=True, on_delete=models.PROTECT, related_name="qr_kodlar")
    kampanya = models.ForeignKey(Kampanya, verbose_name="kampanya", null=True, blank=True, on_delete=models.PROTECT, related_name="qr_kodlar")
    magaza = models.ForeignKey(Magaza, verbose_name="mağaza / şube", null=True, blank=True, on_delete=models.PROTECT, related_name="qr_kodlar")
    hedef_turu = models.CharField("yönlendirme türü", max_length=10, choices=HedefTuru.choices, default=HedefTuru.HARICI)
    hedef_url = models.URLField("hedef URL", max_length=2000, blank=True, validators=[guvenli_url_dogrula])
    sayfa = models.ForeignKey(KampanyaSayfasi, verbose_name="hedef sayfa", null=True, blank=True, on_delete=models.PROTECT, related_name="qr_kodlar")
    baslangic = models.DateTimeField("başlangıç", null=True, blank=True)
    bitis = models.DateTimeField("bitiş", null=True, blank=True)
    bitis_sonrasi_url = models.URLField(
        "bitiş sonrası adres", max_length=2000, blank=True, validators=[guvenli_url_dogrula],
        help_text="Boş bırakılırsa genel ayarlardaki bitiş davranışı uygulanır.",
    )
    durum = models.CharField("durum", max_length=10, choices=Durum.choices, default=Durum.AKTIF, db_index=True)
    aciklama = models.TextField("açıklama", blank=True)
    etiketler = models.CharField("etiketler", max_length=500, blank=True, help_text="Virgülle ayırın.")
    olusturan = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    degistiren = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        verbose_name = "QR kod"
        verbose_name_plural = "QR kodlar"
        ordering = ["-olusturma"]
        indexes = [models.Index(fields=["tur", "durum"]), models.Index(fields=["bitis"])]
        constraints = [
            models.CheckConstraint(
                name="qr_hedef_tutarli",
                condition=(models.Q(hedef_turu="harici") & ~models.Q(hedef_url=""))
                | (models.Q(hedef_turu="sayfa") & models.Q(sayfa__isnull=False))
                | models.Q(durum="arsiv"),
            ),
        ]

    def __str__(self):
        return f"{self.kisa_kod} ({self.ad})" if self.ad else self.kisa_kod

    @staticmethod
    def anahtar(kod):
        return (kod or "").strip().lower()

    @property
    def kisa_url(self):
        return f"{settings.KISA_URL_TABANI}/k/{self.kisa_kod}"

    @property
    def etiket_listesi(self):
        return [e.strip() for e in self.etiketler.split(",") if e.strip()]

    def clean(self):
        if self.baslangic and self.bitis and self.bitis <= self.baslangic:
            raise ValidationError({"bitis": "Bitiş tarihi başlangıçtan sonra olmalı."})
        if self.hedef_turu == self.HedefTuru.HARICI and not self.hedef_url:
            raise ValidationError({"hedef_url": "Harici yönlendirme için hedef URL zorunludur."})
        if self.hedef_turu == self.HedefTuru.SAYFA and not self.sayfa_id:
            raise ValidationError({"sayfa": "Sayfa yönlendirmesi için bir sayfa seçin."})

    def save(self, *args, **kwargs):
        if not self.kisa_kod:
            self.kisa_kod = otomatik_kisa_kod()
        if self.pk:
            # Basılmış kodların bozulmaması için kısa kod değiştirilemez.
            eski = QRKod.objects.filter(pk=self.pk).values_list("kisa_kod", flat=True).first()
            if eski is not None and eski != self.kisa_kod:
                raise ValidationError("Kısa kod oluşturulduktan sonra değiştirilemez.")
        self.kod_anahtari = self.anahtar(self.kisa_kod)
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("QR kodlar silinmez, arşivlenir. Basılı kodların korunması için bu zorunludur.")

    def zaman_durumu(self, an=None):
        """'baslamadi', 'bitti' veya 'gecerli' döndürür. Kampanya tarihleri de dikkate alınır."""
        an = an or timezone.now()
        baslangic, bitis = self.baslangic, self.bitis
        if self.kampanya_id:
            k = self.kampanya
            if baslangic is None:
                baslangic = k.baslangic
            if bitis is None:
                bitis = k.bitis
        if baslangic and an < baslangic:
            return "baslamadi"
        if bitis and an >= bitis:
            return "bitti"
        return "gecerli"


class HedefGecmisi(models.Model):
    """Her hedef değişikliğinin kalıcı kaydı."""

    qr = models.ForeignKey(QRKod, on_delete=models.PROTECT, related_name="hedef_gecmisi")
    zaman = models.DateTimeField(default=timezone.now, db_index=True)
    kullanici = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    eski_hedef_turu = models.CharField(max_length=10, blank=True)
    eski_hedef_url = models.URLField(max_length=2000, blank=True)
    eski_sayfa = models.ForeignKey(KampanyaSayfasi, null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    yeni_hedef_turu = models.CharField(max_length=10)
    yeni_hedef_url = models.URLField(max_length=2000, blank=True)
    yeni_sayfa = models.ForeignKey(KampanyaSayfasi, null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    not_metni = models.CharField("not", max_length=300, blank=True)

    class Meta:
        ordering = ["-zaman"]
        verbose_name = "hedef değişikliği"
        verbose_name_plural = "hedef değişiklik geçmişi"


class Tarama(models.Model):
    """Bir QR taramasının (kısa adres ziyaretinin) takma adlı (pseudonymous) kaydı.

    Anonim değildir. IP adresi saklanmaz. ziyaretci_ozeti, IP + tarayıcı bilgisinin günlük değişen
    gizli tuzla alınmış özetidir; yalnızca aynı gün içindeki tekrarları ayırmak
    için kullanılır ve günler arasında kişiyi izlemeye izin vermez.
    """

    class Sonuc(models.TextChoices):
        YONLENDI = "yonlendi", "Yönlendirildi"
        PASIF = "pasif", "Pasif kod"
        BASLAMADI = "baslamadi", "Henüz başlamadı"
        BITTI = "bitti", "Süresi doldu"
        ARSIV = "arsiv", "Arşivlenmiş kod"

    class Cihaz(models.TextChoices):
        MOBIL = "mobil", "Mobil"
        MASAUSTU = "masaustu", "Masaüstü"
        TABLET = "tablet", "Tablet"
        BOT = "bot", "Bot"
        DIGER = "diger", "Diğer"

    qr = models.ForeignKey(QRKod, on_delete=models.PROTECT, related_name="taramalar")
    zaman = models.DateTimeField(default=timezone.now)
    sonuc = models.CharField(max_length=10, choices=Sonuc.choices)
    cihaz = models.CharField(max_length=10, choices=Cihaz.choices, default=Cihaz.DIGER)
    bot = models.BooleanField(default=False)
    ziyaretci_ozeti = models.CharField(max_length=32, blank=True)

    class Meta:
        indexes = [models.Index(fields=["qr", "zaman"]), models.Index(fields=["zaman"])]
        verbose_name = "tarama"
        verbose_name_plural = "taramalar"


class DenetimKaydi(models.Model):
    """Yönetici işlemlerinin değiştirilemez kaydı (yalnızca ekleme)."""

    zaman = models.DateTimeField(default=timezone.now, db_index=True)
    kullanici = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    kullanici_adi = models.CharField(max_length=150, blank=True)
    eylem = models.CharField(max_length=50, db_index=True)
    nesne_turu = models.CharField(max_length=50, blank=True)
    nesne_id = models.CharField(max_length=64, blank=True)
    ozet = models.TextField(blank=True)
    ip_maskeli = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-zaman"]
        verbose_name = "denetim kaydı"
        verbose_name_plural = "denetim kayıtları"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Denetim kayıtları değiştirilemez.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Denetim kayıtları silinemez.")


class GenelAyarlar(models.Model):
    """Tek satırlık genel ayarlar (varsayılan yönlendirme davranışları, marka)."""

    marka_adi = models.CharField("marka adı", max_length=100, default="Örnek Firma")
    pasif_mesaj = models.TextField("pasif kod mesajı", default="Bu QR kod şu anda kullanımda değil.")
    baslamadi_mesaj = models.TextField("başlamamış kampanya mesajı", default="Bu kampanya henüz başlamadı. Lütfen daha sonra tekrar deneyin.")
    baslamadi_url = models.URLField("başlamamışsa yönlendirilecek adres", max_length=2000, blank=True, validators=[guvenli_url_dogrula])
    bitti_mesaj = models.TextField("bitmiş kampanya mesajı", default="Bu kampanya sona erdi. İlginiz için teşekkür ederiz.")
    bitti_url = models.URLField("bitmişse yönlendirilecek adres", max_length=2000, blank=True, validators=[guvenli_url_dogrula])
    bulunamadi_mesaj = models.TextField("geçersiz kod mesajı", default="Bu QR kod tanınmadı.")
    yaklasan_bitis_gun = models.PositiveIntegerField("“süresi yaklaşıyor” uyarısı (gün)", default=7)
    ayrilmis_kodlar = models.TextField(
        "ayrılmış kodlar", blank=True,
        help_text="Kısa kod olarak verilemeyecek ek kelimeler (satır veya virgülle ayırın). "
                  "Varsayılanlar (admin, panel, api, k, s, saglik, static, media, giris, cikis, robots, favicon) her zaman ayrılmıştır. "
                  "Yalnızca yeni kodlar denetlenir.",
    )
    ayni_hedef_uyarisi = models.BooleanField(
        "aynı hedef uyarısı", default=True,
        help_text="Yeni QR oluştururken aynı hedef adresi başka bir kodda kullanılıyorsa onay iste.",
    )

    class Meta:
        verbose_name = "genel ayarlar"
        verbose_name_plural = "genel ayarlar"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def al(cls):
        nesne, _ = cls.objects.get_or_create(pk=1)
        return nesne

    def ayrilmis_kume(self):
        return ayrilmis_kodlar_kumesi(self.ayrilmis_kodlar)


class MFACihazi(models.Model):
    """Kullanıcının TOTP (doğrulama uygulaması) gizli anahtarı. Anahtar veritabanında Fernet ile şifreli saklanır
    (MFA_SIFRELEME_ANAHTARI); Python tarafında düz metindir. Düz metin hiçbir yerde loglanmaz."""

    kullanici = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mfa")
    gizli_anahtar = SifreliMetinAlani()
    onayli = models.BooleanField(default=False)
    son_kullanilan_adim = models.BigIntegerField(default=0)
    olusturma = models.DateTimeField(auto_now_add=True)


class DenemeSayaci(models.Model):
    """Giriş/MFA başarısız deneme sayacı (kullanıcı+IP, hesap, IP). Anahtar bir özettir (ham kullanıcı
    adı/IP saklanmaz). Artırma tek bir UPDATE ... SET sayi = sayi + 1 ile atomiktir.
    Süresi dolan kayıtlar bir sonraki denemede sıfırlanır."""

    anahtar = models.CharField(max_length=100, unique=True)
    sayi = models.PositiveIntegerField(default=0)
    bitis = models.DateTimeField(db_index=True)


class IceAktarma(models.Model):
    """Panelden yapılan toplu QR içe aktarmasının sunucu tarafındaki geçici kaydı.

    Yüklenen dosyanın ayrıştırılmış satırları, sütun eşleştirmesi ve (uygulandıktan
    sonra) sonuç raporu burada tutulur. Oturumda veri taşınmaz. Başka bir kullanıcı
    bu kayda erişemez; bekleyen kayıtlar 24 saat sonra listede gösterilmez.
    """

    class Durum(models.TextChoices):
        BEKLIYOR = "bekliyor", "Bekliyor"
        TAMAMLANDI = "tamamlandi", "Tamamlandı"
        IPTAL = "iptal", "İptal"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kullanici = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    olusturma = models.DateTimeField("oluşturulma", default=timezone.now, db_index=True)
    durum = models.CharField("durum", max_length=12, choices=Durum.choices, default=Durum.BEKLIYOR, db_index=True)
    dosya_adi = models.CharField("dosya adı", max_length=255)
    # [{"no": dosyadaki satır numarası, "hucreler": [metin, ...]}, ...]
    satirlar = models.JSONField("satırlar", default=list)
    # {"basliklar": [...], "alanlar": [sistem alanı veya "" (yok say), ...]}
    eslesme = models.JSONField("sütun eşleştirmesi", default=dict)
    sonuc = models.JSONField("sonuç raporu", default=dict, blank=True)

    class Meta:
        ordering = ["-olusturma"]
        verbose_name = "içe aktarma"
        verbose_name_plural = "içe aktarmalar"

    def __str__(self):
        return f"{self.dosya_adi} ({self.get_durum_display()})"
