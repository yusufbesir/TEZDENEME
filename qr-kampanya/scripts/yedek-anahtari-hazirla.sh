#!/usr/bin/env bash
# Yedek şifreleme anahtarını hazırlar (kurulum.sh ve guncelle.sh çağırır; tek başına da çalıştırılabilir).
#  - gizli/yedek-anahtari.txt (özel anahtar) YOKSA ve .env içinde YEDEK_ALICI da YOKSA: yeni anahtar çifti üretir.
#  - Var olan anahtar dosyasının ÜZERİNE ASLA yazmaz; .env'deki mevcut satırı DEĞİŞTİRMEZ.
#  - Açık anahtarı .env'nin SONUNA YEDEK_ALICI=age1... olarak yalnızca eksikse ekler.
#  - Özel anahtar yalnızca gizli/ klasöründe durur (700/600, Git'e eklenmez) ve yedek servisine VERİLMEZ.
# Gereksinim: yedek imajı derlenmiş olmalı (docker compose build yedek).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "HATA: .env yok; önce kurulum.sh çalıştırın."; exit 1; }
set -a; . ./.env; set +a   # UYGULAMA_SURUMU (imaj etiketi) için
. scripts/yedek-ortak.sh

ANAHTAR=gizli/yedek-anahtari.txt
ALICI_VAR=0
grep -q '^YEDEK_ALICI=age1' .env 2>/dev/null && ALICI_VAR=1

mkdir -p gizli && chmod 700 gizli
ortak_imaj_var_mi

env_sonuna_ekle() {
  [ -z "$(tail -c1 .env)" ] || echo >> .env
  echo "YEDEK_ALICI=$1" >> .env
  echo ".env dosyasının SONUNA eklendi: YEDEK_ALICI (açık anahtar; gizli değildir). Diğer satırlar değiştirilmedi."
}

if [ -f "$ANAHTAR" ]; then
  chmod 600 "$ANAHTAR"
  echo "Özel anahtar dosyası zaten var; dokunulmadı: $ANAHTAR"
  if [ "$ALICI_VAR" = "0" ]; then
    # Açık anahtar, mevcut özel anahtardan türetilir (özel anahtar ekrana yazılmaz).
    ACIK=$(docker run --rm --network none --cap-drop ALL --entrypoint age-keygen \
      -v "$(pwd)/$ANAHTAR":/anahtar/yedek-anahtari.txt:ro "$YEDEK_IMAJI" -y /anahtar/yedek-anahtari.txt)
    [[ "$ACIK" =~ ^age1[a-z0-9]+$ ]] || { echo "HATA: açık anahtar üretilemedi."; exit 1; }
    env_sonuna_ekle "$ACIK"
  fi
  exit 0
fi

if [ "$ALICI_VAR" = "1" ]; then
  echo "BİLGİ: .env içinde YEDEK_ALICI var ama $ANAHTAR bu sunucuda yok. Bu güvenlidir ve beklenen durumdur"
  echo "       (özel anahtarı parola yöneticinizde tutuyorsunuz). Yeni anahtar ÜRETİLMEDİ."
  exit 0
fi

echo "Yedek şifreleme anahtarı üretiliyor..."
( umask 077
  docker run --rm --network none --cap-drop ALL --entrypoint age-keygen "$YEDEK_IMAJI" > "$ANAHTAR.tmp" )
chmod 600 "$ANAHTAR.tmp"
ACIK=$(sed -n 's/^# public key: \(age1[a-z0-9]*\)$/\1/p' "$ANAHTAR.tmp")
if ! [[ "$ACIK" =~ ^age1[a-z0-9]+$ ]] || ! grep -q '^AGE-SECRET-KEY-' "$ANAHTAR.tmp"; then
  rm -f "$ANAHTAR.tmp"; echo "HATA: anahtar üretilemedi."; exit 1
fi
mv "$ANAHTAR.tmp" "$ANAHTAR"
env_sonuna_ekle "$ACIK"

cat <<'UYARI'

====================================================================================
 ÇOK ÖNEMLİ - YEDEK ANAHTARI
 Yedekleriniz şifrelidir. Özel anahtar dosyası:   gizli/yedek-anahtari.txt
 -> Bu dosyanın içeriğini ŞİMDİ parola yöneticinize (Bitwarden, 1Password vb.) kopyalayın
    ve sunucu dışında bir yerde de saklayın.
 -> Bu dosya kaybolursa yedekleriniz ASLA açılamaz. Kimse kurtaramaz.
 -> Dosyayı kimseyle paylaşmayın, e-postayla göndermeyin, Git'e eklemeyin.
 -> Sunucuyu kurduktan sonra dosyayı sunucudan silmeniz önerilir (yedek servisi ona ihtiyaç duymaz;
    yalnızca geri yükleme sırasında gerekir). Böylece sunucu ele geçirilse bile yedekler açılamaz.
====================================================================================
UYARI
