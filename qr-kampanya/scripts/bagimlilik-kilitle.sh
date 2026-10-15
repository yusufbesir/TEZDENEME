#!/usr/bin/env bash
# app/requirements.in -> app/requirements.txt (hash'li kilit dosyası) üretir.
# Sabit sürümlü bir python:3.13-slim-bookworm konteynerinde, sabit sürümlü pip-tools ile çalışır;
# böylece sonuç hangi makinede üretilirse üretilsin aynıdır. Docker gerekir, internet gerekir.
#
# DÜRÜST NOT: pip-tools'un kendi kurulumu hash'siz yapılır (sürümü sabit, ama hash doğrulaması yok).
# Bu yalnızca kilit dosyasını üreten araçtır; uygulama imajına girmez. Uygulamanın bağımlılıkları
# ise Dockerfile'da --require-hashes ile kurulur.
set -euo pipefail

PIP_TOOLS_SURUM="7.6.2"
IMAJ="python:3.13-slim-bookworm"
KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

GECICI="$(mktemp)"
trap 'rm -f "$GECICI"' EXIT

# Kilit dosyası konteynerde üretilir, standart çıktıdan alınır (konteyner dosya sahipliği bozmaz).
docker run --rm -v "$KOK/app/requirements.in:/girdi/requirements.in:ro" -w /girdi "$IMAJ" bash -c "
  set -e
  pip install --quiet --disable-pip-version-check 'pip-tools==${PIP_TOOLS_SURUM}' >&2
  pip-compile --quiet --generate-hashes --allow-unsafe --strip-extras --no-header \
    --annotation-style=line --output-file /tmp/kilit.txt requirements.in >&2
  cat /tmp/kilit.txt
" > "$GECICI"

{
  cat <<'BASLIK'
# BU DOSYA ELLE DÜZENLENMEZ. Otomatik üretilmiştir (pip-tools, --generate-hashes).
# Bütün doğrudan ve dolaylı bağımlılıklar tam sürümle (==) ve hash ile sabitlenmiştir;
# Dockerfile bunları "pip install --require-hashes --no-deps" ile kurar.
# Sürüm değiştirmek için app/requirements.in dosyasını düzenleyin, sonra:
#     bash scripts/bagimlilik-kilitle.sh
#     bash scripts/guvenlik-tarama.sh
# Ayrıntı: docs/BAKIM.md ("Bağımlılık güncellemesi"). Hedef: Python 3.13, platformdan bağımsız.
BASLIK
  cat "$GECICI"
} > "$KOK/app/requirements.txt"
echo "app/requirements.txt yenilendi. Sıradaki adım: bash scripts/guvenlik-tarama.sh"
