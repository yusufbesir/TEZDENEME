"""QR Kampanya sistemi ayarları.

Bütün gizli ve ortama bağlı değerler ortam değişkenlerinden (.env) okunur.
Kaynak koda parola, anahtar veya alan adı yazılmaz.
"""
import os
import sys
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env(ad, varsayilan=None, zorunlu=False):
    deger = os.environ.get(ad, varsayilan)
    if zorunlu and not deger:
        raise ImproperlyConfigured(f"{ad} ortam değişkeni tanımlı değil (.env dosyasını kontrol edin).")
    return deger


def env_bool(ad, varsayilan=False):
    return str(env(ad, "1" if varsayilan else "0")).lower() in ("1", "true", "evet", "yes", "on")


DEBUG = env_bool("DJANGO_DEBUG", False)
SECRET_KEY = env("DJANGO_SECRET_KEY", zorunlu=True)
if not DEBUG and (len(SECRET_KEY) < 50 or "degistir" in SECRET_KEY.lower()):
    raise ImproperlyConfigured("DJANGO_SECRET_KEY üretim için zayıf. scripts/kurulum.sh ile yeni anahtar üretin.")

# Örnek: qr.ornekfirma.com  (kendi alan adınızla .env içinde değiştirin)
SITE_ALAN_ADI = env("SITE_ALAN_ADI", "qr.ornekfirma.com")
SITE_SEMA = env("SITE_SEMA", "https")
# QR görsellerine yazılacak kalıcı taban adres. Örn: https://qr.ornekfirma.com
KISA_URL_TABANI = env("KISA_URL_TABANI", f"{SITE_SEMA}://{SITE_ALAN_ADI}").rstrip("/")

ALLOWED_HOSTS = [h.strip() for h in env("DJANGO_ALLOWED_HOSTS", SITE_ALAN_ADI).split(",") if h.strip()]
CSRF_TRUSTED_ORIGINS = [f"{SITE_SEMA}://{h}" for h in ALLOWED_HOSTS if h not in ("localhost", "127.0.0.1", "app")]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "qr",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "qr.ag_kisiti.YonetimAgKisitiMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "qr.middleware.GuvenlikBasliklariMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "qr.context_processors.genel",
            ],
        },
    },
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", "qrkampanya"),
        "USER": env("POSTGRES_USER", "qrkampanya"),
        "PASSWORD": env("POSTGRES_PASSWORD", zorunlu=True),
        "HOST": env("POSTGRES_HOST", "db"),
        "PORT": env("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
        "CONN_HEALTH_CHECKS": True,
    }
}

# Paylaşılan önbellek (giriş denemesi sınırlama ve hız sınırlama için).
# Veritabanı tablosu kullanılır; ek servis (Redis vb.) gerekmez.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "onbellek",
    }
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LOGIN_URL = "panel:giris"
LOGIN_REDIRECT_URL = "panel:ana"
LOGOUT_REDIRECT_URL = "panel:giris"

LANGUAGE_CODE = "tr"
TIME_ZONE = "Europe/Istanbul"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = env("STATIC_ROOT", str(BASE_DIR / "staticfiles"))
MEDIA_URL = "/medya/"
MEDIA_ROOT = env("MEDIA_ROOT", str(BASE_DIR / "medya"))
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
DATA_UPLOAD_MAX_NUMBER_FIELDS = 20000  # toplu seçim işlemleri için

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
FORMS_URLFIELD_ASSUME_HTTPS = True  # Django 6 uyumu

# --- Oturum ve çerez güvenliği ---
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = int(env("OTURUM_SURESI_SN", str(8 * 3600)))
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

GUVENLI_CEREZ = env_bool("GUVENLI_CEREZ", not DEBUG)
SESSION_COOKIE_SECURE = GUVENLI_CEREZ
CSRF_COOKIE_SECURE = GUVENLI_CEREZ
# HTTPS'i Caddy sağlar; Caddy'nin ilettiği başlığa güvenilir.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = False  # Yönlendirmeyi Caddy yapar
SECURE_HSTS_SECONDS = int(env("HSTS_SN", "0" if DEBUG else "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = False

# Gerçek istemci IP'si Caddy'nin X-Forwarded-For başlığından alınır (yalnızca
# Caddy arkasında çalışıldığı için). IP'ler kalıcı olarak saklanmaz.
# Varsayılan KAPALI: yalnızca güvenilen vekil (Caddy) arkasında, compose ortamında açılır
# (GUVENILIR_VEKIL=1). Aksi halde X-Forwarded-For istemci tarafından sahte girilebilir.
GUVENILIR_VEKIL = env_bool("GUVENILIR_VEKIL", False)

# İsteğe bağlı panel/API ağ kısıtı: virgülle ayrılmış CIDR listesi (örn. "203.0.113.0/24,2001:db8::/32"). Boş = kısıt yok.
# Doluysa /panel/, /api/ ve /admin/ yalnızca bu ağlardan açılır, diğerleri 404 alır; /k/, /l/, /s/, /saglik, /robots.txt, statik
# ve medya etkilenmez. Hatalı CIDR'de uygulama BAŞLAMAZ (ImproperlyConfigured). İstemci IP'si GUVENILIR_VEKIL kuralıyla bulunur.
from qr.ag_kisiti import aglari_oku  # noqa: E402

YONETIM_IZINLI_AGLAR = aglari_oku(env("YONETIM_IZINLI_AGLAR", ""))

# Eklentiler (docs/EKLENTILER.md): app/eklentiler/ altındaki modüllerden yalnızca burada adı geçenler yüklenir. Varsayılan: hiçbiri.
# Eklenti sunucuda uygulamayla AYNI yetkiyle çalışır; yalnızca güvendiğiniz kodu ekleyin. Hatalı ad -> uygulama başlamaz.
from qr.eklenti_yonetimi import eklenti_adlarini_oku  # noqa: E402

QR_EKLENTILER = eklenti_adlarini_oku(env("QR_EKLENTILER", ""))
# Sistem bilgisi sayfası için isteğe bağlı bilgi etiketleri (compose aktarır; internete bağlanılmaz).
QR_IMAJ_ETIKETI = env("QR_IMAJ_ETIKETI", "").strip()
QR_IMAJ_DIGEST = env("QR_IMAJ_DIGEST", "").strip()

# --- Uygulama ayarları ---
TARAMA_SAKLAMA_GUN = int(env("TARAMA_SAKLAMA_GUN", "730"))
GIRIS_DENEME_SINIRI = int(env("GIRIS_DENEME_SINIRI", "5"))
GIRIS_KILIT_SURESI_SN = int(env("GIRIS_KILIT_SURESI_SN", "900"))
# IP döndürerek kilit atlatmaya karşı: hesap başına (IP'den bağımsız) ve IP başına (kullanıcı adından bağımsız) sayaçlar.
HESAP_DENEME_SINIRI = int(env("HESAP_DENEME_SINIRI", "10"))
IP_DENEME_SINIRI = int(env("IP_DENEME_SINIRI", "20"))
# /panel/giris ve /panel/mfa/* POST istekleri için IP başına dakikalık ucuz sınır (parola doğrulamasından önce; 0 = kapalı).
GIRIS_HIZ_SINIRI = int(env("GIRIS_HIZ_SINIRI", "10"))
YONLENDIRME_HIZ_SINIRI = int(env("YONLENDIRME_HIZ_SINIRI", "120"))  # IP başına dakikada
# İsteğe bağlı ülke bilgisi: MaxMind GeoLite2-Country.mmdb dosyasının konteyner içindeki yolu (docs/KURULUM.md, docs/GUVENLIK.md).
# Boşsa ya da dosya yoksa/okunamazsa ülke boş kalır; hata verilmez. IP yalnızca bellekte aranır, saklanmaz.
GEOIP_VERITABANI = env("GEOIP_VERITABANI", "").strip()
QR_OLUSTURMA_HIZ_SINIRI = int(env("QR_OLUSTURMA_HIZ_SINIRI", "30"))  # kullanıcı başına dakikada tekil QR oluşturma
# API: anahtar başına dakikada başarılı istek; IP başına dakikada başarısız kimlik doğrulama (docs/API.md).
API_HIZ_SINIRI = int(env("API_HIZ_SINIRI", "60"))
API_BASARISIZ_HIZ_SINIRI = int(env("API_BASARISIZ_HIZ_SINIRI", "10"))
# Kullanıcı başına ORTAK dakikalık API sınırı (kullanıcının bütün anahtarları + parola girişi toplamı; anahtar sayısı çoğaltılarak aşılamaz).
API_KULLANICI_HIZ_SINIRI = int(env("API_KULLANICI_HIZ_SINIRI", str(API_HIZ_SINIRI)))
# Kullanıcı başına en çok aktif (iptal edilmemiş) API anahtarı; panelden anahtar oluşturma ucu için kullanıcı başına dakikalık sınır.
API_AZAMI_ANAHTAR = int(env("API_AZAMI_ANAHTAR", "10"))
API_ANAHTAR_OLUSTURMA_HIZ_SINIRI = int(env("API_ANAHTAR_OLUSTURMA_HIZ_SINIRI", "5"))
# API için CORS'a izinli kökenler (virgülle ayrılmış, örn. https://uygulama.ornek.com). Boş = CORS başlığı yok. Yıldız kabul edilmez.
API_CORS_KOKENLERI = tuple(k.strip().rstrip("/") for k in env("API_CORS_KOKENLERI", "").split(",") if k.strip() and k.strip() != "*")
MFA_ZORUNLU = env_bool("MFA_ZORUNLU", not DEBUG)

# MFA (TOTP) gizli anahtarlarının veritabanında şifrelenmesi için Fernet anahtarı (urlsafe base64, 32 bayt).
# Virgülle ayrılmış birden çok anahtar = döndürme (ilki yeni şifreleme için). DJANGO_SECRET_KEY'den TÜRETİLMEZ.
# Yalnızca `manage.py test` için sabit bir TEST anahtarı kullanılır (gerçek bir sır değildir); üretimde zorunludur.
_TEST_MFA_ANAHTARI = "dGVzdC1hbmFodGFyaS15YWxuaXpjYS10ZXN0LWljaW4="
MFA_SIFRELEME_ANAHTARI = env("MFA_SIFRELEME_ANAHTARI", "")
if not MFA_SIFRELEME_ANAHTARI and len(sys.argv) > 1 and sys.argv[1] == "test":
    MFA_SIFRELEME_ANAHTARI = _TEST_MFA_ANAHTARI
try:
    from qr.sifreleme import SifrelemeHatasi, anahtarlari_hazirla

    anahtarlari_hazirla(MFA_SIFRELEME_ANAHTARI)
except SifrelemeHatasi as _hata:
    raise ImproperlyConfigured(str(_hata)) from None
# Hata sayfası ve raporlarında Türkçe adlı sırlar da (ör. MFA_SIFRELEME_ANAHTARI) gizlensin.
DEFAULT_EXCEPTION_REPORTER_FILTER = "qr.hata_filtresi.GizliAyarFiltresi"
YEDEK_DURUM_DOSYASI = env("YEDEK_DURUM_DOSYASI", "/yedek-durum/son-durum.json")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"basit": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"}},
    "handlers": {"konsol": {"class": "logging.StreamHandler", "formatter": "basit"}},
    "root": {"handlers": ["konsol"], "level": env("LOG_SEVIYESI", "INFO")},
    "loggers": {"django.security": {"handlers": ["konsol"], "level": "WARNING", "propagate": False}},
}
