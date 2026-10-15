#!/usr/bin/env bash
# Otomatik testleri Docker içinde çalıştırır (geçici test veritabanı kullanılır,
# gerçek verilere dokunmaz).   bash scripts/test.sh
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose run --rm --no-deps -e ATLA_HAZIRLIK=1 app python manage.py test qr -v 2
