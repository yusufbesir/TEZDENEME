# syntax=docker/dockerfile:1
# Yedek servisi imajı: postgres istemci araçları + age (şifreleme).
# postgres:17.6-alpine içinde age/gpg/openssl bulunmaz; age resmi sürüm arşivinden kurulur
# ve SABİTLENMİŞ sha256 ile doğrulanır (uyuşmazsa derleme durur).
#
# Derleme makinesi internete çıkamıyorsa arşivi önceden şuraya koyun (git'e eklenmez):
#   yedek/paketler/age-v1.3.2-linux-amd64.tar.gz   (veya ...-arm64.tar.gz)
# Arşiv oradaysa indirme yapılmaz; iki yolda da aynı hash doğrulaması çalışır.
FROM postgres:17.6-alpine

ARG TARGETARCH
ARG AGE_SURUMU=v1.3.2
ARG AGE_SHA256_AMD64=cbe24006683f8eb669266162894b9a522a1af52f2665fbc63a4bb032ed26ac10
ARG AGE_SHA256_ARM64=6b8dc4333c53a5a57c9e5834e3a48f92605d7154014cd07269ff3327db5d37f4

# Paketler katmana KOPYALANMAZ: salt okunur bağlama (bind mount) olarak yalnızca bu RUN sırasında görünür,
# böylece arşivler (~37 MB) imajda hiçbir katmanda kalmaz.
RUN --mount=type=bind,source=paketler,target=/paketler \
    set -eu; \
    MIMARI="${TARGETARCH:-}"; \
    if [ -z "$MIMARI" ]; then \
      case "$(uname -m)" in x86_64) MIMARI=amd64;; aarch64) MIMARI=arm64;; *) echo "Desteklenmeyen mimari: $(uname -m)"; exit 1;; esac; \
    fi; \
    case "$MIMARI" in \
      amd64) BEKLENEN="$AGE_SHA256_AMD64";; \
      arm64) BEKLENEN="$AGE_SHA256_ARM64";; \
      *) echo "Desteklenmeyen mimari: $MIMARI"; exit 1;; \
    esac; \
    DOSYA="age-${AGE_SURUMU}-linux-${MIMARI}.tar.gz"; \
    mkdir -p /tmp/age-kur; \
    if [ -f "/paketler/$DOSYA" ]; then \
      echo "age arşivi yerel paketlerden alınıyor: $DOSYA"; \
      cp "/paketler/$DOSYA" "/tmp/age-kur/$DOSYA"; \
    else \
      echo "age arşivi indiriliyor: $DOSYA"; \
      wget -q -O "/tmp/age-kur/$DOSYA" "https://github.com/FiloSottile/age/releases/download/${AGE_SURUMU}/${DOSYA}"; \
    fi; \
    echo "${BEKLENEN}  /tmp/age-kur/${DOSYA}" | sha256sum -c -; \
    tar -xzf "/tmp/age-kur/$DOSYA" -C /tmp/age-kur age/age age/age-keygen; \
    install -m 0755 /tmp/age-kur/age/age /tmp/age-kur/age/age-keygen /usr/local/bin/; \
    rm -rf /tmp/age-kur; \
    age --version
