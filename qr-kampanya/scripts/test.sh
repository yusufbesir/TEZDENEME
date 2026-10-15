#!/usr/bin/env bash
# Otomatik testleri Docker içinde çalıştırır (geçici test veritabanı kullanılır,
# gerçek verilere dokunmaz).   bash scripts/test.sh
# Testler test veritabanını oluşturup silmek için CREATEDB yetkisi ister; uygulamanın kısıtlı hesabında
# (qr_uygulama) bu yetki yoktur. Bu yüzden tek seferlik konteyner süper kullanıcı bilgileriyle çalışır.
# Parola komut satırına yazılmaz: "-e ANAHTAR" biçimi değeri bu betiğin ortamından alır.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
# scripts/ ve docker-compose.yml salt okunur bağlanır: betik/yapılandırma içeriğine bakan testler onları /scripts ve /docker-compose.yml altında bulur.
docker compose run --rm --no-deps -v "$PWD/scripts:/scripts:ro" -v "$PWD/docker-compose.yml:/docker-compose.yml:ro" -e ATLA_HAZIRLIK=1 -e POSTGRES_USER -e POSTGRES_PASSWORD app python manage.py test qr -v 2
