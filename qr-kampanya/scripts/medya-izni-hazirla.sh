#!/usr/bin/env bash
# Medya birimindeki mevcut dosyaların grubunu app'in grubuna (GID 10001) çevirir ve gruba OKUMA izni ekler
# (dosyalara g+r, dizinlere g+rx). Hiçbir şey silinmez, sahip değişmez; sembolik bağlantılar İZLENMEZ.
# Yedek servisi (UID 10002) medyayı app'in grubu (GID 10001) üzerinden okur; 600 kipli eski dosyalar grup izni olmadan
# okunamaz ve yedek (açık hatayla) başarısız olur.
# YÜKSELTME: eski imajlarda "uygulama" grubu GID 999'du; eski kurulumların medya dosyaları grup 999'a aittir. Bu betik
# onları 10001'e taşır (dosyaların sahibi app olduğu için yetki gerekmez). YENİ app imajı derlendikten SONRA çalıştırılmalıdır
# (eski imajda 10001 grubu yoktur; guncelle.sh bu sırayı izler).
# Tek seferlik app imajı, app kullanıcısıyla çalışır. guncelle.sh çağırır; tekrarı güvenlidir.
#   bash scripts/medya-izni-hazirla.sh
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose run --rm -T --no-deps --entrypoint sh app -c '
  set -e
  find /veri/medya -type d -exec chgrp -h 10001 {} +
  find /veri/medya -type f -exec chgrp -h 10001 {} +
  find /veri/medya -type d -exec chmod g+rx {} +
  find /veri/medya -type f -exec chmod g+r {} +'
echo "Medya birimi: grup 10001 olarak ayarlandı, gruba okuma izni eklendi (sahiplik/silme yok, sembolik bağlantı izlenmedi)."
