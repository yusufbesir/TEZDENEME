#!/usr/bin/env bash
# DİKKAT: YIKICI İŞLEM. Canlı veritabanını seçilen yedekle DEĞİŞTİRİR.
# Yedek tarihinden sonra yapılan bütün değişiklikler kaybolur.
# Önce scripts/geri-yukleme-testi.sh ile yedeği test edin.
#
#   bash scripts/geri-yukle.sh yedekler/db-YYYYMMDD-HHMMSS.dump.age [--medya] [--anahtar DOSYA]
#
#   --medya          veritabanına ek olarak aynı ZAMAN'daki görsel arşivini (medya-ZAMAN.tar.gz.age) de geri yükler
#                    (mevcut görsellerin üzerine yazar; yedekte olmayan görsellere dokunmaz)
#   --anahtar DOSYA  özel anahtar dosyası (veya YEDEK_ANAHTAR_DOSYASI; varsayılan ./gizli/yedek-anahtari.txt)
#
# Önce sha256 doğrulanır (uyuşmazsa durur), şifre çözme geçici bir ağsız konteynerde yapılır ve düz döküm
# diske yazılmadan doğrudan pg_restore'a akıtılır. Eski sürümden kalan şifresiz .dump dosyaları da kabul edilir.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
. scripts/yedek-ortak.sh

YEDEK=""; MEDYA=0; ANAHTAR_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --medya) MEDYA=1 ;;
    --anahtar) shift; ANAHTAR_ARG="${1:?--anahtar için dosya yolu gerekli}" ;;
    -*) echo "Bilinmeyen seçenek: $1"; exit 1 ;;
    *) YEDEK="$1" ;;
  esac
  shift
done
[ -n "$YEDEK" ] || { echo "Kullanım: bash scripts/geri-yukle.sh <db-...dump.age> [--medya] [--anahtar DOSYA]"; exit 1; }
[ -f "$YEDEK" ] || { echo "Dosya yok: $YEDEK"; exit 1; }
YEDEK_AD=$(basename "$YEDEK")
YEDEK_DIZIN=$(cd "$(dirname "$YEDEK")" && pwd)
ZAMAN=$(ortak_zaman "$YEDEK_AD")
MEDYA_AD="medya-$ZAMAN.tar.gz.age"

# Ad KATI doğrulanır (db-YYYYMMDD-HHMMSS.dump.age; eski şifresiz db-ZAMAN.dump da kabul); başka hiçbir ad işlenmez.
if ortak_ad_gecerli_mi "$YEDEK_AD" && [[ "$YEDEK_AD" == db-* ]]; then SIFRELI=1
elif ortak_eski_ad_gecerli_mi "$YEDEK_AD" && [[ "$YEDEK_AD" == db-* ]]; then
  SIFRELI=0; echo "UYARI: bu şifresiz eski bir yedek; geri yükledikten sonra yeni (şifreli) yedek alın."
else
  echo "Desteklenmeyen/geçersiz dosya adı reddedildi (beklenen: db-YYYYMMDD-HHMMSS.dump.age)."; exit 1
fi
if [ "$MEDYA" = "1" ] && [ "$SIFRELI" = "0" ]; then
  echo "--medya yalnızca şifreli yedeklerle kullanılabilir."; exit 1
fi

echo "== Bütünlük (sha256) doğrulaması"
DOSYALAR=("$YEDEK_AD"); [ "$MEDYA" = "1" ] && DOSYALAR+=("$MEDYA_AD")
ortak_sha256_dogrula "$YEDEK_DIZIN" "${DOSYALAR[@]}" || { echo "Geri yükleme DURDURULDU; hiçbir şey değiştirilmedi."; exit 1; }

if [ "$SIFRELI" = "1" ]; then
  ANAHTAR=$(ortak_anahtar_yolu "${ANAHTAR_ARG:-${YEDEK_ANAHTAR_DOSYASI:-./gizli/yedek-anahtari.txt}}")
  ortak_imaj_var_mi
  echo "== Şifre çözme denemesi (anahtar doğru mu, dosya bozuk mu?)"
  ortak_coz "$ANAHTAR" "$YEDEK_DIZIN" "$YEDEK_AD" > /dev/null \
    || { echo "Şifre çözülemedi; anahtar yanlış veya dosya bozuk. Hiçbir şey değiştirilmedi."; exit 1; }
  if [ "$MEDYA" = "1" ]; then
    ortak_coz "$ANAHTAR" "$YEDEK_DIZIN" "$MEDYA_AD" > /dev/null \
      || { echo "Görsel arşivi çözülemedi. Hiçbir şey değiştirilmedi."; exit 1; }
  fi
fi

echo "Canlı veritabanı '$YEDEK' ile DEĞİŞTİRİLECEK$([ "$MEDYA" = "1" ] && echo " ve görseller geri yüklenecek"). Bu işlem geri alınamaz."
read -rp "Devam etmek için büyük harflerle EVET yazın: " ONAY
[ "$ONAY" = "EVET" ] || { echo "İptal edildi."; exit 1; }
echo "Güvenlik için önce mevcut durumun yedeği alınıyor..."
GUVENLIK_CIKTI=$(docker compose exec -T yedek sh /betikler/yedek-al.sh 2>&1) \
  || { echo "$GUVENLIK_CIKTI"; echo "Güvenlik yedeği alınamadı; geri yükleme BAŞLATILMADI, hiçbir şey değiştirilmedi."; exit 1; }
echo "$GUVENLIK_CIKTI"
GUVENLIK_AD=$(printf '%s\n' "$GUVENLIK_CIKTI" | sed -n 's|^Yedek tamam.*/\(db-[0-9]\{8\}-[0-9]\{6\}\.dump\.age\)$|\1|p' | tail -1)

# Bu noktadan sonra bir hata olursa: kullanıcıya ne olduğu söylenir; veritabanı DEĞİŞMEDİYSE
# (pg_restore tek işlemde geri alındı) app ve caddy yeniden başlatılır, böylece site kapalı kalmaz.
ASAMA="durdurma"
hata_yolu() {
  local kod=$?
  trap - EXIT
  [ "$kod" -ne 0 ] || return 0
  echo
  case "$ASAMA" in
    durdurma|yukleme)
      echo "HATA: geri yükleme BAŞARISIZ oldu. İşlem tek işlemde yapıldığı için veritabanı DEĞİŞMEDİ (hiçbir şey uygulanmadı)."
      echo "Site yeniden başlatılıyor (app, caddy)..."
      docker compose up -d app caddy >/dev/null 2>&1 \
        && echo "app ve caddy yeniden başlatıldı." \
        || echo "UYARI: app/caddy başlatılamadı; elle çalıştırın: docker compose up -d app caddy"
      ;;
    medya)
      echo "HATA: veritabanı geri yüklendi ve site AÇIK (app/caddy başlatıldı), ancak görsellerin geri yüklenmesi YARIM kaldı."
      echo "Görselleri tamamlamak için aynı yedekle yeniden deneyin: bash scripts/geri-yukle.sh $YEDEK --medya"
      ;;
    *)
      echo "HATA: veritabanı yüklendi ancak sonraki adımlarda hata oluştu (aşama: $ASAMA). app/caddy başlatılmamış olabilir."
      echo "Günlükler: docker compose logs hazirlik app --tail 100 ; düzelttikten sonra: docker compose up -d app caddy"
      ;;
  esac
  if [ -n "$GUVENLIK_AD" ]; then
    echo "Geri yüklemeden önce alınan güvenlik yedeği: ${YEDEK_DIZINI:-./yedekler}/$GUVENLIK_AD (gerekirse bununla geri dönebilirsiniz)."
  fi
}
trap hata_yolu EXIT

docker compose stop caddy app
ASAMA="yukleme"
# Nesneler qr_sahip'e ait olarak yüklenir (--no-owner + --role); süper kullanıcı yalnızca bağlantı içindir.
# --single-transaction --exit-on-error: ilk hatada (veya akış yarıda kesilirse) hiçbir şey uygulanmaz, yarım kalmaz.
# Düz döküm diske yazılmaz: şifre çözme çıktısı doğrudan pg_restore'a akar (pipefail: çözme hatası da hata sayılır).
PG_RESTORE=(pg_restore --clean --if-exists --no-owner --role=qr_sahip --single-transaction --exit-on-error -U "$POSTGRES_USER" -d "$POSTGRES_DB")
if [ "$SIFRELI" = "1" ]; then
  ortak_coz "$ANAHTAR" "$YEDEK_DIZIN" "$YEDEK_AD" | docker compose exec -T db "${PG_RESTORE[@]}"
else
  docker compose exec -T db "${PG_RESTORE[@]}" < "$YEDEK"
fi
ASAMA="roller"
# Roller ve yetkiler (qr_uygulama, silme geri almaları) yeniden uygulanır.
docker compose exec -T db sh /docker-entrypoint-initdb.d/10-roller.sh
# Hazırlık yeniden çalışsın (eski yedek daha eski bir şema sürümü olabilir), sonra app ve caddy açılsın.
ASAMA="hazirlik"
docker compose up -d --force-recreate hazirlik
docker compose up -d app
# Caddy zorla yeniden oluşturulur: bağlanan Caddyfile değişmiş olabilir ve çalışan konteyner eski dosyayı tutar.
docker compose up -d --force-recreate --no-deps caddy
ASAMA="medya"
if [ "$MEDYA" = "1" ]; then
  echo "Görseller geri yükleniyor..."
  # app konteyneri medya birimine yazabilir (uygulamanın kendi kullanıcısıyla); akış diske düz yazılmaz.
  ortak_coz "$ANAHTAR" "$YEDEK_DIZIN" "$MEDYA_AD" | docker compose exec -T app tar -xzf - -C /veri
fi
trap - EXIT
echo "Geri yükleme tamamlandı."
