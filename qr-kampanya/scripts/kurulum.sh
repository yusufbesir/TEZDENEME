#!/usr/bin/env bash
# İlk kurulum. Proje klasöründe çalıştırın:  bash scripts/kurulum.sh
# - .env yoksa oluşturur ve güçlü rastgele parolalar üretir (mevcut .env'nin ÜZERİNE YAZMAZ)
# - yedek şifreleme anahtarını üretir (gizli/yedek-anahtari.txt; parola yöneticinize kopyalayın)
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
  if [ -z "$ALAN" ]; then
    # Yerel denemede sertifika alınmaz; Caddy yine de dolu bir e-posta ister, bu yüzden yer tutucu yazılır.
    EPOSTA="yerel-deneme@example.com"
  else
    # Alan adı girildiyse e-posta ZORUNLUDUR (Let's Encrypt bildirimleri; boşsa Caddy başlamaz).
    while true; do
      read -rp "Let's Encrypt bildirim e-postası (zorunlu): " EPOSTA
      if [[ "$EPOSTA" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then break; fi
      echo "Geçersiz veya boş e-posta adresi; örnek: ad@firmaniz.com"
    done
  fi
  cp .env.example .env
  if [ -z "$ALAN" ]; then
    sed -i "s|^SITE_ALAN_ADI=.*|SITE_ALAN_ADI=localhost|; s|^SITE_ADRESI=.*|SITE_ADRESI=http://localhost|; s|^SITE_SEMA=.*|SITE_SEMA=http|; s|^DJANGO_ALLOWED_HOSTS=.*|DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1|" .env
    echo "GUVENLI_CEREZ=0" >> .env
    echo "HSTS_SN=0" >> .env
  else
    sed -i "s|^SITE_ALAN_ADI=.*|SITE_ALAN_ADI=$ALAN|; s|^SITE_ADRESI=.*|SITE_ADRESI=$ALAN|; s|^DJANGO_ALLOWED_HOSTS=.*|DJANGO_ALLOWED_HOSTS=$ALAN|" .env
  fi
  sed -i "s|^ACME_EPOSTA=.*|ACME_EPOSTA=$EPOSTA|" .env
  sed -i "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=$(rastgele 64)|; s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(rastgele 32)|; s|^POSTGRES_SAHIP_PAROLA=.*|POSTGRES_SAHIP_PAROLA=$(rastgele 32)|; s|^POSTGRES_UYGULAMA_PAROLA=.*|POSTGRES_UYGULAMA_PAROLA=$(rastgele 32)|" .env
  chmod 600 .env
  echo ".env oluşturuldu (izinler 600). Bu dosyayı kimseyle paylaşmayın, Git'e eklemeyin."
fi

# Eski kurulumlarda ACME_EPOSTA boşsa Caddy başlamaz: yalnızca boşsa yer tutucu eklenir (dolu değere dokunulmaz).
if grep -q '^ACME_EPOSTA=$' .env; then
  sed -i 's|^ACME_EPOSTA=$|ACME_EPOSTA=yerel-deneme@example.com|' .env
  echo "UYARI: ACME_EPOSTA boştu; yer tutucu yazıldı. Gerçek alan adı kullanıyorsanız .env içinde kendi e-postanızı yazın."
elif ! grep -q '^ACME_EPOSTA=' .env; then
  [ -z "$(tail -c1 .env)" ] || echo >> .env
  echo "ACME_EPOSTA=yerel-deneme@example.com" >> .env
fi

# Eski kurulumlarda eksik olabilecek anahtarlar: mevcut satırlara DOKUNULMAZ, yalnızca sona eklenir.
for ANAHTAR in POSTGRES_SAHIP_PAROLA POSTGRES_UYGULAMA_PAROLA; do
  if ! grep -q "^${ANAHTAR}=" .env; then
    [ -z "$(tail -c1 .env)" ] || echo >> .env
    echo "${ANAHTAR}=$(rastgele 32)" >> .env
    echo ".env dosyasının SONUNA eksik anahtar eklendi: ${ANAHTAR} (diğer satırlar değiştirilmedi)."
  fi
done

# MFA gizli anahtarlarını veritabanında şifreleyen Fernet anahtarı (32 bayt, urlsafe base64). Yoksa üretilir ve .env'nin
# SONUNA eklenir (var olan satırlara dokunulmaz). Bu anahtar kaybolursa MFA kayıtları çözülemez (yönetici `mfa_sifirla` ile
# sıfırlar): .env dosyasının yedeğini parola yöneticinizde saklayın (docs/KURULUM.md, docs/YEDEKLEME.md).
mfa_anahtari_uret() { python3 -c "import base64,secrets;print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())" 2>/dev/null || openssl rand -base64 32 | tr '+/' '-_' | tr -d '\n'; }
if grep -qE '^MFA_SIFRELEME_ANAHTARI=.' .env; then
  :
elif grep -qE '^MFA_SIFRELEME_ANAHTARI=' .env; then
  echo "HATA: .env içinde MFA_SIFRELEME_ANAHTARI satırı var ama boş. Dolu bir anahtar yazın veya satırı silin (betik yeni anahtar üretir)."; exit 1
else
  [ -z "$(tail -c1 .env)" ] || echo >> .env
  echo "MFA_SIFRELEME_ANAHTARI=$(mfa_anahtari_uret)" >> .env
  echo "BİLGİ: .env dosyasının SONUNA MFA_SIFRELEME_ANAHTARI eklendi (MFA gizli anahtarlarını şifreler; diğer satırlar değiştirilmedi)."
  echo "       Bu anahtar kaybolursa MFA kayıtları çözülemez. .env yedeğini parola yöneticinizde saklayın (docs/YEDEKLEME.md)."
fi

mkdir -p yedekler && chmod 700 yedekler
docker compose build
# Yedek servisi root olmayan kullanıcıyla (10002) çalışır: yedekler/ dizini ona devredilir (silme yok).
bash scripts/yedek-dizini-hazirla.sh
# Yedek şifreleme anahtarı (age): özel anahtar gizli/ klasörüne yazılır, açık anahtar .env'ye eklenir.
bash scripts/yedek-anahtari-hazirla.sh
# Önce veritabanı: roller (qr_sahip, qr_uygulama) ilk kurulumda otomatik oluşur; var olan veritabanında
# betik elle (idempotent) çalıştırılır. Sonra hazırlık (migrasyon) ve uygulama başlar.
docker compose up -d db
for i in $(seq 1 60); do
  if docker compose ps db --format '{{.Health}}' 2>/dev/null | grep -q healthy; then break; fi
  sleep 2
done
docker compose exec -T db sh /docker-entrypoint-initdb.d/10-roller.sh
docker compose up -d
echo "Servisler başlatılıyor..."
for i in $(seq 1 60); do
  if docker compose ps app --format '{{.Health}}' 2>/dev/null | grep -q healthy; then break; fi
  sleep 2
done
# Kurulum betiği yeniden çalıştırılırsa Caddy eski Caddyfile ile kalmasın (dosya izlenmez): zorla yeniden oluştur.
docker compose up -d --force-recreate --no-deps caddy
docker compose ps

if [ "$(docker compose exec -T app python manage.py shell -c 'from django.contrib.auth import get_user_model;print(get_user_model().objects.filter(is_superuser=True).count())')" = "0" ]; then
  echo "İlk yönetici hesabını oluşturun (parola en az 12 karakter):"
  docker compose exec app python manage.py yonetici_olustur
fi
echo "BİLGİ: Sunucu dışı yedek kopyası için .env'e YEDEK_UZAK_HEDEF=uzakadi:klasor ekleyin; eski yerel yedeklerin silinmesi için ayrıca"
echo "       YEDEK_UZAK_ONAYLI_HEDEF=uzakadi (':' öncesi ad) ile hedefin gerçekten başka bir makine/bulut olduğunu onaylayın (docs/YEDEKLEME.md)."
echo "Kurulum tamam. Panel: $(grep ^SITE_SEMA .env | cut -d= -f2)://$(grep ^SITE_ALAN_ADI .env | cut -d= -f2)/panel/"
