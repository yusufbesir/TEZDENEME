#!/usr/bin/env bash
# Medya birimindeki mevcut dosyalara grup OKUMA izni ekler (dosyalara g+r, dizinlere g+rx). Yalnızca izin EKLER:
# sahiplik değişmez, hiçbir şey silinmez. Yedek servisi (UID 10002) medyayı app'in grubu (GID 999) üzerinden okur;
# 600 kipli eski dosyalar grup izni olmadan okunamaz ve yedek (açık hatayla) başarısız olur.
# Tek seferlik app imajı, app kullanıcısıyla (dosyaların sahibi; yetki gerekmez) çalışır. guncelle.sh çağırır; tekrarı güvenlidir.
#   bash scripts/medya-izni-hazirla.sh
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose run --rm -T --no-deps --entrypoint sh app -c '
  set -e
  find /veri/medya -type d -exec chmod g+rx {} +
  find /veri/medya -type f -exec chmod g+r {} +'
echo "Medya birimi: gruba okuma izni eklendi (yalnızca izin, sahiplik/silme yok)."
