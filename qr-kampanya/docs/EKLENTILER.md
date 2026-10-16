# Eklentiler (kancalar)

> **Güvenlik uyarısı:** Bir eklenti sunucuda uygulamayla **aynı yetkiyle** çalışan sıradan Python kodudur. Veritabanına (`qr_uygulama` hesabı), `.env` ortam değişkenlerine (`DJANGO_SECRET_KEY`, veritabanı parolası, `MFA_SIFRELEME_ANAHTARI`), medya dosyalarına ve internete erişebilir; MFA, rol ve hız sınırı eklentiyi **sınırlamaz**. Bu yüzden **yalnızca kendi yazdığınız ya da satır satır okuyup güvendiğiniz kodu** koyun. İnternetten indirilmiş bir eklentiyi okumadan eklemeyin.

Eklentiler, YOURLS'ün eklenti sistemindeki gibi, uygulamanın belirli olaylarına tepki vermenizi sağlar (ör. yeni kısa link oluşunca günlüğe yazmak). Bu proje YOURLS'ten **daha kısıtlı** tutulmuştur:

- Panelden kod **yüklenemez**, eklenti açılıp kapatılamaz. Eklentiyi sunucuda dosya olarak siz koyarsınız.
- Hiçbir eklenti kendiliğinden çalışmaz: yalnızca `.env` içindeki `QR_EKLENTILER` değişkeninde adı geçen eklentiler yüklenir. **Varsayılan: hiçbiri.**
- Eklenti kodu kancalarda **hata verirse** ana işlem (QR kaydı, yönlendirme, sayfa gösterimi) etkilenmez; hata günlüğe yazılır ve diğer kancalar çalışmaya devam eder.

## Nasıl etkinleştirilir

1. Dosyayı `app/eklentiler/<ad>.py` olarak koyun (örnek: `app/eklentiler/ornek_gunluk.py`). `<ad>` küçük harfle başlamalı; yalnızca küçük harf, rakam ve alt çizgi içermeli, en çok 41 karakter olmalıdır (`^[a-z][a-z0-9_]{0,40}$`).
2. `.env` dosyasına adı yazın (virgülle birden çok): `QR_EKLENTILER=ornek_gunluk`
3. Kod imajın içinde olduğundan imajı yeniden derleyin ve başlatın: `docker compose up -d --build app`
4. Panelde **Eklentiler** sayfasında (yalnızca Yönetici) eklentinin “Etkin (yüklendi)” göründüğünü doğrulayın.

Kapatmak için adı `QR_EKLENTILER`'den çıkarıp uygulamayı yeniden başlatın.

Sıkı kurallar: yalnızca `eklentiler.<ad>` modülü içe aktarılır; ad desene uymazsa (nokta, eğik çizgi, `..`, büyük harf, tire vb.) uygulama **açılışta anlaşılır bir hatayla durur**, sessizce atlanmaz. Adı geçen dosya yoksa ya da içe aktarılırken hata verirse yalnızca o eklenti devre dışı kalır (günlükte ve Eklentiler sayfasında görünür), uygulama çalışır.

## Eklenti nasıl yazılır

```python
"""Kısa açıklama (bu ilk satır Eklentiler sayfasında görünür)."""
import logging

from qr.kancalar import kanca

log = logging.getLogger("eklentiler.benim_eklentim")


@kanca("qr_olusturuldu")
def yeni_kod(qr, **_):
    log.info("Yeni kod: %s", qr.kisa_kod)
```

Kanca işlevi **anahtar sözcük bağımsız değişkenleri** alır; ileride eklenebilecek yeni bağımsız değişkenlerde bozulmamak için işlev imzasının sonuna `**_` koyun.

| Olay | Ne zaman | Bağımsız değişkenler |
|---|---|---|
| `qr_olusturuldu` | Yeni QR/kısa link kaydı kesinleşince (panel, API, toplu içe aktarma, link ağacı) | `qr` (`QRKod`) |
| `qr_hedef_degisti` | Var olan kodun hedefi değişip kesinleşince | `qr`, `eski_hedef`, `yeni_hedef` (her biri `(hedef_turu, hedef_url, sayfa_id)` demeti) |
| `tarama_kaydedildi` | Bir `/k/<kod>` ziyareti Tarama olarak kaydedilince | `tarama` (`Tarama`) |
| `link_agaci_goruntulendi` | Yayındaki bir link ağacı sayılan bir ziyaretle görüntülenince | `agac` (`LinkAgaci`) |

Davranış kuralları:

- **Sıra ve zaman:** Kancalar ana işlem veritabanına kesinleşince (`transaction.on_commit`) ve aynı süreçte, **eşzamanlı** çalışır. Yani yavaş bir kanca o isteği yavaşlatır: kancalarınızı kısa tutun (çok kısa işler; ağ çağrısı, büyük sorgu yapmayın). Python'da çalışan bir işlevi güvenle durdurmanın yolu olmadığından **süre sınırı zorlanmaz**; 0,5 saniyeyi aşan kanca için günlüğe uyarı düşer. İşlem geri alınırsa kanca hiç çalışmaz.
- **Hata:** Kanca istisna fırlatırsa (`SystemExit` dahil) yakalanır ve günlüğe yazılır; ana işlem ve diğer kancalar etkilenmez. Yine de hata yakalama kodunuzu kendiniz de yazın.
- **Kişisel veri:** Eklentiye IP ve User-Agent **verilmez**. `Tarama` nesnesi zaten bunları saklamaz (yalnızca günlük değişen takma adlı özet, cihaz türü, yönlendiren alan adı, ülke). Eklenti kendi başına istek nesnesine ulaşamaz; kendi toplama kodunu yazmak KVKK sorumluluğunu size yükler.
- **Veri yazma:** Kanca içinde veritabanına yazmak mümkündür ama önerilmez. Kancalardan QR oluşturma/değiştirme (`qr_kaydet`) çağırırsanız yeni olaylar tetiklenir; sonsuz döngüye dikkat edin.
- **Çoklu süreç:** Gunicorn birden çok işçi çalıştırır; her işçi eklentiyi kendi belleğinde yükler. Kancada durumu bellekte tutmayın.
- **Kalıcı olarak yapmadığımız şeyler:** Eklenti için panelde yapılandırma ekranı, kanca sırası/öncelik, kancanın işlemi değiştirmesi veya iptal etmesi (filtre), kod yükleme yoktur.

## Örnek eklenti

`app/eklentiler/ornek_gunluk.py` dört olayı da dinler ve yalnızca günlüğe yazar (kod, sonuç, cihaz türü; IP/UA yok). Varsayılan **kapalıdır**; denemek için `QR_EKLENTILER=ornek_gunluk` yazıp uygulamayı yeniden başlatın ve `docker compose logs -f app` ile izleyin.

## Sorun giderme

| Belirti | Neden |
|---|---|
| Uygulama açılmıyor: “QR_EKLENTILER içinde geçersiz eklenti adı” | Ad desene uymuyor (büyük harf, tire, nokta…). Adı düzeltin. |
| Eklentiler sayfasında “Dosya bulunamadı” | `app/eklentiler/<ad>.py` yok ya da imaj yeniden derlenmedi. |
| “Etkin ama yüklenemedi” | Dosya içe aktarılırken hata verdi; ayrıntı sayfada kısa, tamamı `docker compose logs app` içinde. |
| Günlükte “Kanca hatası yoksayıldı” | Eklentinin kancası hata verdi; ana işlem etkilenmedi. Eklentiyi düzeltin. |
| Günlükte “Kanca yavaş” | Kanca 0,5 sn'den uzun sürdü; kısaltın. |
