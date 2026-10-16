# syntax=docker/dockerfile:1
# Sürümü sabit Python tabanı (Debian bookworm, slim)
FROM python:3.13-slim-bookworm@sha256:a1165e272e578941b84abc79e4ab38a0305cd12803a5c4247979ac7655f4d641

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
COPY requirements.txt .
# İnternetsiz (çevrimdışı) derleme için: önceden indirilmiş paketler "tekerlekler/"
# klasöründe varsa oradan kurulur, yoksa PyPI'den. Normal kurulumda klasör yoktur.
# Her iki yolda da requirements.txt'deki hash'ler zorunludur (--require-hashes); uyuşmayan paket kurulmaz.
RUN --mount=type=bind,source=.,target=/baglam \
    if [ -d /baglam/tekerlekler ]; then \
      pip install --require-hashes --no-deps --no-index --find-links /baglam/tekerlekler -r requirements.txt; \
    else \
      pip install --require-hashes --no-deps -r requirements.txt; \
    fi

# Uygulama root olmayan kullanıcıyla çalışır. Uygulama kodu (/app) root'a aittir ve uygulama kullanıcısı
# tarafından DEĞİŞTİRİLEMEZ; yalnızca /veri (medya, statik) uygulama kullanıcısına yazılabilirdir.
# Grup GID 10001 açıkça verilir (UID ile aynı): yedek servisi medyayı bu grup (compose group_add: "10001") üzerinden okur.
# Konteyner GID'leri host'a birebir eşlenir; host'ta 999 sıkça "docker" grubudur (kaçan süreç docker.sock ile root olabilir),
# bu yüzden sistem aralığı (--system) dışında, host'ta normalde boş olan 10001 kullanılır.
RUN groupadd --gid 10001 uygulama \
    && useradd --system --uid 10001 --gid uygulama --home /app uygulama \
    && mkdir -p /veri/medya /veri/static \
    && chown -R uygulama /veri
COPY . .
RUN chmod -R a+rX,go-w /app && chmod 755 /app/baslat.sh

# Ters vekil (Caddy) adresleri compose'da FORWARDED_ALLOW_IPS ile verilir; gunicorn bu değişkeni kendisi okur.
# Varsayılan yalnızca yerel adrestir ("*" kullanılmaz).
ENV FORWARDED_ALLOW_IPS=127.0.0.1 STATIC_ROOT=/veri/static MEDIA_ROOT=/veri/medya DJANGO_SETTINGS_MODULE=config.settings
USER uygulama
EXPOSE 8000
ENTRYPOINT ["/app/baslat.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--threads", "4", "--timeout", "300", "--access-logfile", "-", "--no-control-socket"]
