"""Panel formları."""
from urllib.parse import urlsplit

from django import forms
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError

from .. import baslik_cek, roller
from ..dogrulama import idn_mi
from ..models import (
    GenelAyarlar, Kampanya, KampanyaSayfasi, Magaza, QRKod, Urun, ayrilmis_kod_hatasi, otomatik_kisa_kod,
)
from ..servisler import kod_uretici, sirali_kod_ayir

Kullanici = get_user_model()

IZINLI_GORSEL_UZANTILARI = (".jpg", ".jpeg", ".png", ".webp")
IZINLI_GORSEL_BICIMLERI = ("JPEG", "PNG", "WEBP")
EN_FAZLA_GORSEL_BAYT = 5 * 1024 * 1024
TEK_SEFERDE_EN_FAZLA_GORSEL = 10


def tarih_saat_girdisi():
    return forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M")


class TemelForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for alan in self.fields.values():
            if isinstance(alan, forms.URLField):
                alan.assume_scheme = "https"


# --- Görsel yükleme ---

class GuvenliGorselAlani(forms.ImageField):
    """Yalnızca jpg/png/webp, en fazla 5 MB. Pillow doğrulamasını ImageField yapar;
    burada ek olarak gerçek görsel biçimi de denetlenir (uzantıya güvenilmez)."""

    def to_python(self, veri):
        dosya = super().to_python(veri)
        if dosya is None:
            return None
        ad = (dosya.name or "").lower()
        if not ad.endswith(IZINLI_GORSEL_UZANTILARI):
            raise ValidationError("Yalnızca jpg, png veya webp görseller yüklenebilir.")
        if dosya.size > EN_FAZLA_GORSEL_BAYT:
            raise ValidationError("Görsel en fazla 5 MB olabilir.")
        bicim = getattr(getattr(dosya, "image", None), "format", None)
        if bicim not in IZINLI_GORSEL_BICIMLERI:
            raise ValidationError("Yalnızca jpg, png veya webp görseller yüklenebilir.")
        return dosya


class CokluDosyaGirdisi(forms.FileInput):
    allow_multiple_selected = True


class CokluGorselAlani(GuvenliGorselAlani):
    widget = CokluDosyaGirdisi

    def clean(self, veri, initial=None):
        dosyalar = list(veri) if isinstance(veri, (list, tuple)) else ([veri] if veri else [])
        if len(dosyalar) > TEK_SEFERDE_EN_FAZLA_GORSEL:
            raise ValidationError(f"Tek seferde en fazla {TEK_SEFERDE_EN_FAZLA_GORSEL} görsel yüklenebilir.")
        sonuc = [super(CokluGorselAlani, self).clean(d, initial) for d in dosyalar if d]
        return [d for d in sonuc if d]


# --- QR kod ---

class QRKodForm(TemelForm):
    degisiklik_notu = forms.CharField(
        label="değişiklik notu", max_length=300, required=False,
        help_text="Hedef değişirse hedef geçmişine yazılır.",
    )

    class Meta:
        model = QRKod
        fields = [
            "kisa_kod", "ad", "baslik", "tur", "urun", "kampanya", "magaza", "hedef_turu", "hedef_url", "sayfa",
            "baslangic", "bitis", "bitis_sonrasi_url", "durum", "aciklama", "etiketler",
        ]
        widgets = {
            "baslangic": tarih_saat_girdisi(),
            "bitis": tarih_saat_girdisi(),
            "aciklama": forms.Textarea(attrs={"rows": 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        kod = self.fields["kisa_kod"]
        kod.required = False
        # Çöp kutusuna yalnızca “Çöp kutusuna taşı” işlemiyle (onceki_durum saklanarak) girilir; forma seçenek olarak konmaz.
        if "durum" in self.fields:
            self.fields["durum"].choices = [(d, e) for d, e in QRKod.Durum.choices if d != QRKod.Durum.COP]
        if self.instance.pk:
            kod.disabled = True
            kod.help_text = "Basılmış kodlar bozulmasın diye kısa kod değiştirilemez."
        else:
            kod.help_text = "Boş bırakırsanız tahmin edilmesi zor bir kod otomatik üretilir."
        # "Yine de kaydet" onayı yalnızca yeni kayıtta ve aynı hedef uyarısı çıktığında forma eklenir.
        self.ayni_hedef_onay_alani = forms.BooleanField(
            label="Yine de kaydet", required=False,
            help_text="Aynı hedef adresi başka bir kodda kullanılıyor; yine de yeni kod oluşturmak için işaretleyin.",
        )
        if "sayfa" in self.fields:
            self.fields["sayfa"].label_from_instance = lambda s: f"{s.baslik} (/s/{s.slug}) - {s.get_durum_display()}"
        if not self.instance.pk and "baslik" in self.fields:
            self.fields["baslik"].help_text = (
                "Boş bırakırsanız ve hedef harici bir adresse, hedef sayfanın başlığı otomatik çekilmeye çalışılır "
                "(genel ayarlardan kapatılabilir)."
            )
        self._sirali_otomatik = False

    def clean_kisa_kod(self):
        if self.instance.pk:
            return self.instance.kisa_kod
        deger = (self.cleaned_data.get("kisa_kod") or "").strip()
        ayar = GenelAyarlar.al()
        ayrilmis = ayar.ayrilmis_kume()
        if not deger and ayar.kod_uretim_bicimi == GenelAyarlar.KodBicimi.SIRALI:
            # Doğrulama sırasında sayaç ilerletilmez (başarısız form numara yakmasın); gerçek kod kaydederken ayrılır (save).
            self._sirali_otomatik = True
            try:
                return kod_uretici(kalici=False, ayrilmis=ayrilmis)()
            except ValueError as hata:
                raise ValidationError(str(hata)) from hata
        if not deger:
            for _ in range(20):
                aday = otomatik_kisa_kod()
                if QRKod.anahtar(aday) in ayrilmis:  # ayrılmış kelime çıktıysa yeniden üret
                    continue
                if not QRKod.objects.filter(kod_anahtari=QRKod.anahtar(aday)).exists():
                    return aday
            raise ValidationError("Otomatik kod üretilemedi, lütfen tekrar deneyin.")
        hata = ayrilmis_kod_hatasi(deger, ayrilmis)
        if hata:
            raise ValidationError(hata)
        if QRKod.objects.filter(kod_anahtari=QRKod.anahtar(deger)).exists():
            raise ValidationError("Bu kısa kod zaten kullanılıyor (büyük/küçük harf fark etmez).")
        return deger

    def clean(self):
        veri = super().clean()
        tur = veri.get("hedef_turu")
        if tur == QRKod.HedefTuru.SAYFA:
            veri["hedef_url"] = ""
        elif tur == QRKod.HedefTuru.HARICI:
            veri["sayfa"] = None
        self.uyarilar = []
        self.ayni_hedef_kodlari = []
        self._ayni_hedef_kontrol(veri)
        for alan in ("hedef_url", "bitis_sonrasi_url"):
            if idn_mi(veri.get(alan)):
                self.uyarilar.append(
                    f"{self.fields[alan].label}: alan adı uluslararası karakter (IDN/punycode) içeriyor. "
                    "Benzer görünen karakterlerle taklit edilmiş bir alan adı olabilir; adresi dikkatle kontrol edin."
                )
        return veri

    def _ayni_hedef_kontrol(self, veri):
        """Yeni kayıtta aynı hedef URL'ye sahip arşivlenmemiş kod varsa, onay kutusu işaretlenmedikçe kaydı engeller."""
        url = veri.get("hedef_url")
        if self.instance.pk or veri.get("hedef_turu") != QRKod.HedefTuru.HARICI or not url:
            return
        if not GenelAyarlar.al().ayni_hedef_uyarisi:
            return
        kodlar = list(
            QRKod.objects.filter(hedef_turu=QRKod.HedefTuru.HARICI, hedef_url=url)
            .exclude(durum__in=[QRKod.Durum.ARSIV, QRKod.Durum.COP]).order_by("kod_anahtari").values_list("kisa_kod", flat=True)[:10]
        )
        if not kodlar:
            return
        onaylandi = (self.data.get("ayni_hedef_onay") or "").lower() in ("on", "true", "1")
        if onaylandi:
            return
        self.fields["ayni_hedef_onay"] = self.ayni_hedef_onay_alani
        self.ayni_hedef_kodlari = kodlar  # API 409 yanıtı için
        self.add_error(None, f"Bu hedef zaten şu kodlarda kullanılıyor: {', '.join(kodlar)}. "
                             "Yine de kaydetmek için “Yine de kaydet” kutusunu işaretleyip tekrar gönderin.")

    def save(self, commit=True):
        """Yeni kayıtta: (1) sıralı kod biçiminde kod şimdi kalıcı olarak ayrılır (sayaç satır kilidiyle artırılır);
        (2) başlık boşsa ve ayar açıksa hedef sayfanın başlığı güvenli biçimde çekilmeye çalışılır (başarısızlık sessizdir)."""
        if not self.instance.pk:
            if self._sirali_otomatik:
                try:
                    self.instance.kisa_kod = sirali_kod_ayir()
                except ValueError as hata:
                    raise ValidationError(str(hata)) from hata
            self._baslik_doldur()
        return super().save(commit=commit)

    def _baslik_doldur(self):
        qr = self.instance
        if (
            (qr.baslik or "").strip() or qr.hedef_turu != QRKod.HedefTuru.HARICI or not qr.hedef_url
            or not GenelAyarlar.al().baslik_otomatik_cek
        ):
            return
        qr.baslik = baslik_cek.sayfa_basligi(qr.hedef_url)

    def uyarilari_goster(self, request):
        """Kayıt başarılı olduktan sonra (yönlendirme sonrası görünür) uyarıları mesaj olarak ekler."""
        for uyari in getattr(self, "uyarilar", []):
            messages.warning(request, uyari)


class HizliDuzenleForm(TemelForm):
    """Listeden satır içi düzenleme: yalnızca ad, başlık ve (harici hedefli QR'da) hedef URL. Hedef alanı doğrulaması QRKodForm
    ile aynıdır (model doğrulayıcısı guvenli_url_dogrula: şema, özel/yerel IP, kullanıcı bilgisi; IDN uyarısı). Sayfa hedefli
    QR'da hedef alanı yoktur; gönderilen hedef_url yok sayılır."""

    class Meta:
        model = QRKod
        fields = ["ad", "baslik", "hedef_url"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.hedef_turu != QRKod.HedefTuru.HARICI:
            del self.fields["hedef_url"]
        else:
            self.fields["hedef_url"].required = True
        self.uyarilar = []

    def clean(self):
        veri = super().clean()
        if idn_mi(veri.get("hedef_url")):
            self.uyarilar.append(
                f"{self.fields['hedef_url'].label}: alan adı uluslararası karakter (IDN/punycode) içeriyor. "
                "Benzer görünen karakterlerle taklit edilmiş bir alan adı olabilir; adresi dikkatle kontrol edin."
            )
        return veri

    def uyarilari_goster(self, request):
        for uyari in self.uyarilar:
            messages.warning(request, uyari)


class HizliKisaltForm(QRKodForm):
    """Hızlı kısalt: yalnızca hedef URL + isteğe bağlı kısa kod + isteğe bağlı başlık. Doğrulama QRKodForm ile aynıdır
    (ayrılmış kod, aynı hedef uyarısı+onay, IDN uyarısı, otomatik başlık/sıralı kod); tür “Kısa link”, hedef harici, durum aktiftir."""

    degisiklik_notu = None

    class Meta(QRKodForm.Meta):
        fields = ["hedef_url", "kisa_kod", "baslik"]
        widgets = {}
        labels = {"hedef_url": "Uzun adres (URL)", "kisa_kod": "Kısa kod (isteğe bağlı)", "baslik": "Başlık (isteğe bağlı)"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.instance.tur = QRKod.Tur.LINK
        self.instance.hedef_turu = QRKod.HedefTuru.HARICI
        self.instance.durum = QRKod.Durum.AKTIF
        self.fields["hedef_url"].required = True
        self.fields["hedef_url"].widget.attrs.update({"placeholder": "https://", "autofocus": True})

    def clean(self):
        self.cleaned_data["hedef_turu"] = QRKod.HedefTuru.HARICI
        return super().clean()

    def kaydet_hazirla(self):
        """Ad: boşsa başlıktan, o da yoksa hedefin alan adından türetilir. Çağrı: save(commit=False) sonrası."""
        qr = self.instance
        if not qr.ad:
            qr.ad = ad_turet(qr.baslik, qr.hedef_url)
        return qr


def ad_turet(baslik, url):
    """QR kod adı: başlık varsa başlık (200 karakter), yoksa hedefin alan adı (www. atılır)."""
    baslik = " ".join((baslik or "").split())
    if baslik:
        return baslik[:200]
    try:
        host = (urlsplit(url or "").hostname or "").lower()
    except ValueError:
        host = ""
    return (host[4:] if host.startswith("www.") else host)[:200]


# --- Kampanya / ürün / mağaza ---

class KampanyaForm(TemelForm):
    class Meta:
        model = Kampanya
        fields = ["kod", "ad", "aciklama", "baslangic", "bitis", "aktif"]
        widgets = {
            "baslangic": tarih_saat_girdisi(),
            "bitis": tarih_saat_girdisi(),
            "aciklama": forms.Textarea(attrs={"rows": 3}),
        }


class UrunForm(TemelForm):
    class Meta:
        model = Urun
        fields = ["kod", "ad", "aciklama"]
        widgets = {"aciklama": forms.Textarea(attrs={"rows": 3})}


class MagazaForm(TemelForm):
    class Meta:
        model = Magaza
        fields = ["kod", "ad", "adres", "aktif"]
        widgets = {"adres": forms.Textarea(attrs={"rows": 3})}


# --- Kampanya sayfası ---

class KampanyaSayfasiForm(TemelForm):
    kapak_gorseli = GuvenliGorselAlani(label="kapak görseli", required=False, help_text="jpg, png veya webp; en fazla 5 MB.")
    logo = GuvenliGorselAlani(label="marka logosu", required=False, help_text="jpg, png veya webp; en fazla 5 MB.")
    yeni_gorseller = CokluGorselAlani(
        label="ürün görselleri ekle", required=False,
        help_text="Birden çok görsel seçebilirsiniz (jpg, png, webp; her biri en fazla 5 MB).",
    )

    class Meta:
        model = KampanyaSayfasi
        fields = [
            "slug", "tur", "durum", "kampanya", "baslik", "aciklama", "kapak_gorseli", "logo",
            "baslangic", "bitis", "kosullar", "buton_metni", "buton_url", "urun_kodu", "fiyat",
            "seo_baslik", "seo_aciklama", "renk_tema",
        ]
        widgets = {
            "baslangic": tarih_saat_girdisi(),
            "bitis": tarih_saat_girdisi(),
            "aciklama": forms.Textarea(attrs={"rows": 6}),
            "kosullar": forms.Textarea(attrs={"rows": 5}),
            "seo_aciklama": forms.Textarea(attrs={"rows": 2}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["aciklama"].help_text = "Düz metindir; HTML yorumlanmaz. Satır sonları korunur."
        self.fields["kosullar"].help_text = "Düz metindir; HTML yorumlanmaz."
        if self.instance.pk:
            self.fields["slug"].disabled = True
            self.fields["slug"].help_text = "Sayfa adresi yayınlandıktan sonra değiştirilemez."
        else:
            self.fields["slug"].help_text = "Küçük harf, rakam ve tire. Oluşturulduktan sonra değiştirilemez."

    def clean_slug(self):
        if self.instance.pk:
            return self.instance.slug
        return self.cleaned_data["slug"].strip().lower()


# --- Genel ayarlar ---

class GenelAyarlarForm(TemelForm):
    class Meta:
        model = GenelAyarlar
        fields = [
            "marka_adi", "pasif_mesaj", "baslamadi_mesaj", "baslamadi_url", "bitti_mesaj", "bitti_url",
            "bulunamadi_mesaj", "yaklasan_bitis_gun", "ayrilmis_kodlar", "ayni_hedef_uyarisi",
            "baslik_otomatik_cek", "kod_uretim_bicimi", "herkese_acik_istatistik", "istatistikte_hedef_goster",
        ]
        widgets = {k: forms.Textarea(attrs={"rows": 2}) for k in ("pasif_mesaj", "baslamadi_mesaj", "bitti_mesaj", "bulunamadi_mesaj")}
        widgets["ayrilmis_kodlar"] = forms.Textarea(attrs={"rows": 3})

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["kod_uretim_bicimi"].required = False  # gönderilmezse mevcut değer korunur

    def clean_kod_uretim_bicimi(self):
        return self.cleaned_data.get("kod_uretim_bicimi") or self.instance.kod_uretim_bicimi

    def save(self, commit=True):
        # Sıralı kod sayacı formda yoktur; formun eski kopyası eşzamanlı artırılmış sayacın üzerine yazılmasın.
        if commit:
            self.instance.save(update_fields=list(self.Meta.fields))
            return self.instance
        return super().save(commit=False)


# --- Kullanıcılar ---

ROL_SECENEKLERI = [(r, r) for r in (roller.YONETICI, roller.EDITOR, roller.IZLEYICI)]


class KullaniciOlusturForm(UserCreationForm):
    rol = forms.ChoiceField(label="rol", choices=ROL_SECENEKLERI)

    class Meta(UserCreationForm.Meta):
        model = Kullanici
        fields = ("username", "first_name", "last_name", "email")

    def save(self, commit=True):
        kullanici = super().save(commit=commit)
        if commit:
            kullanici.groups.set(Group.objects.filter(name=self.cleaned_data["rol"]))
        return kullanici


class KullaniciDuzenleForm(forms.ModelForm):
    rol = forms.ChoiceField(label="rol", choices=ROL_SECENEKLERI)

    class Meta:
        model = Kullanici
        fields = ("first_name", "last_name", "email", "is_active")

    def __init__(self, *args, istek_kullanici=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.istek_kullanici = istek_kullanici
        self.fields["is_active"].label = "aktif"
        mevcut = roller.kullanici_rolu(self.instance) if self.instance.pk else None
        self.fields["rol"].initial = mevcut or roller.IZLEYICI

    def clean_is_active(self):
        aktif = self.cleaned_data["is_active"]
        if not aktif and self.istek_kullanici is not None and self.instance.pk == self.istek_kullanici.pk:
            raise ValidationError("Kendi hesabınızı pasifleştiremezsiniz.")
        return aktif

    def save(self, commit=True):
        kullanici = super().save(commit=commit)
        if commit:
            kullanici.groups.set(Group.objects.filter(name=self.cleaned_data["rol"]))
        return kullanici
