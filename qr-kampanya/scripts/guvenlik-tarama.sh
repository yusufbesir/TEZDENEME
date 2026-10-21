#!/usr/bin/env bash
# app/requirements.txt içindeki paketleri bilinen zafiyetler (PyPI Advisory / OSV) için tarar.
# Sabit sürümlü bir python:3.13-slim-bookworm konteynerinde sabit sürümlü pip-audit kullanır.
# Zafiyet bulunursa çıkış kodu sıfırdan farklıdır. Internet gerekir.
#
# --disable-pip: pip-audit bağımlılık çözümü yapmaz, kilit dosyasındaki sürümleri olduğu gibi tarar
#                (yalnızca hash'li ve tamamen sabitlenmiş dosyalarla çalışır).
# --require-hashes: her satırın hash'i zorunlu; bu modda ayrıca bağımlılık çözümü yapılmaz.
#
# DÜRÜST NOT: pip-audit'in kendi kurulumu hash'siz yapılır (sürümü sabit, ama hash doğrulaması yok).
# Bu araç imaja girmez, yalnızca tarama yapar.
set -euo pipefail

PIP_AUDIT_SURUM="2.10.1"
IMAJ="python:3.13-slim-bookworm"
KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

docker run --rm -v "$KOK/app/requirements.txt:/requirements.txt:ro" "$IMAJ" bash -c "
  set -e
  pip install --quiet --disable-pip-version-check 'pip-audit==${PIP_AUDIT_SURUM}'
  pip-audit --requirement /requirements.txt --require-hashes --disable-pip
"
echo "Tarama temiz: bilinen zafiyet bulunamadı."
