#!/usr/bin/env bash
# İlk kurulum. Proje klasöründe çalıştırın:  bash scripts/kurulum.sh
# - .env yoksa oluşturur ve güçlü rastgele parolalar üretir (mevcut .env'nin ÜZERİNE YAZMAZ)
# - konteynerleri derler ve başlatır
# - ilk yönetici hesabını oluşturmanızı ister
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null; then
  echo "Docker kurulu değil. Kurulum: docs/KURULUM.md"; exit 1
fi

rastgele() { python3 -c "import secrets;print(secrets.token_urlsafe($1))" 2>/dev/null || openssl rand -base64 "$1" | tr -d '/+=\n'; }

if [ -f .env ]; then
  echo ".env zaten var; dokunulmadı."
else
  # Girdiler sed ile .env içine yazıldığından yalnızca güvenli karakterlere izin verilir; geçersizse tekrar sorulur.
  while true; do
    read -rp "QR kodlarda kullanılacak alan adı (örn. qr.firmaniz.com) [yerel deneme için boş bırakın]: " ALAN
    if [ -z "$ALAN" ] || [[ "$ALAN" =~ ^[A-Za-z0-9.-]+$ ]]; then break; fi
    echo "Geçersiz alan adı: yalnızca harf, rakam, nokta ve tire kullanılabilir (https:// veya / yazmayın)."
  done
  while true; do
    read -rp "Let's Encrypt bildirim e-postası (boş bırakılabilir): " EPOSTA
    if [ -z "$EPOSTA" ] || [[ "$EPOSTA" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then break; fi
    echo "Geçersiz e-posta adresi; örnek: ad@firmaniz.com"
  done
  cp .env.example .env
  if [ -z "$ALAN" ]; then
    sed -i "s|^SITE_ALAN_ADI=.*|SITE_ALAN_ADI=localhost|; s|^SITE_ADRESI=.*|SITE_ADRESI=http://localhost|; s|^SITE_SEMA=.*|SITE_SEMA=http|; s|^DJANGO_ALLOWED_HOSTS=.*|DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1|" .env
    echo "GUVENLI_CEREZ=0" >> .env
    echo "HSTS_SN=0" >> .env
  else
    sed -i "s|^SITE_ALAN_ADI=.*|SITE_ALAN_ADI=$ALAN|; s|^SITE_ADRESI=.*|SITE_ADRESI=$ALAN|; s|^DJANGO_ALLOWED_HOSTS=.*|DJANGO_ALLOWED_HOSTS=$ALAN|" .env
  fi
  sed -i "s|^ACME_EPOSTA=.*|ACME_EPOSTA=$EPOSTA|" .env
  sed -i "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=$(rastgele 64)|; s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(rastgele 32)|" .env
  chmod 600 .env
  echo ".env oluşturuldu (izinler 600). Bu dosyayı kimseyle paylaşmayın, Git'e eklemeyin."
fi

mkdir -p yedekler && chmod 700 yedekler
docker compose build
docker compose up -d
echo "Servisler başlatılıyor..."
for i in $(seq 1 60); do
  if docker compose ps app --format '{{.Health}}' 2>/dev/null | grep -q healthy; then break; fi
  sleep 2
done
docker compose ps

if [ "$(docker compose exec -T app python manage.py shell -c 'from django.contrib.auth import get_user_model;print(get_user_model().objects.filter(is_superuser=True).count())')" = "0" ]; then
  echo "İlk yönetici hesabını oluşturun (parola en az 12 karakter):"
  docker compose exec app python manage.py yonetici_olustur
fi
echo "Kurulum tamam. Panel: $(grep ^SITE_SEMA .env | cut -d= -f2)://$(grep ^SITE_ALAN_ADI .env | cut -d= -f2)/panel/"
