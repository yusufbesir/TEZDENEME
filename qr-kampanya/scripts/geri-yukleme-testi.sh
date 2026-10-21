#!/usr/bin/env bash
# Yedeğin gerçekten geri yüklenebildiğini GÜVENLİ biçimde test eder:
#   1) sha256 dosyasıyla bütünlük doğrulaması (uyuşmazsa DURUR)
#   2) geçici, ağsız bir konteynerde (yedek imajı) özel anahtarla şifreyi çözer ve pg_restore ile yükler
#      (--no-owner --no-acl: geçici veritabanında qr_sahip/qr_uygulama rolleri yok; amaç verinin yüklenebilmesidir)
#   3) tablo sayılarını canlı veritabanıyla karşılaştırır
#   4) görsel arşivini çözüp tar ile listeleyebildiğini doğrular
#   5) geçici konteyneri kaldırır. Canlı veritabanına HİÇBİR değişiklik yapılmaz.
# Özel anahtar sunucuda tutulmaz: dosya yoksa anahtar terminalden gizli girişle istenir (bellekte tutulur, sonunda silinir).
# Bütün çıktı ekrana ve yedekler/geri-yukleme-testi-ZAMAN.log dosyasına yazılır (anahtar içeriği asla yazılmaz).
#   bash scripts/geri-yukleme-testi.sh [db-ZAMAN.dump.age] [anahtar-dosyası]
#   (anahtar yolu: ikinci argüman veya YEDEK_ANAHTAR_DOSYASI; yoksa ./gizli/yedek-anahtari.txt; o da yoksa gizli giriş)
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
. scripts/yedek-ortak.sh
. scripts/dizin-guvenligi.sh

# Yedek dizini konteynere (10002) yazılabilir: günlük root olarak değil dizin sahibi olarak yazılır (sembolik bağlantı izlenmez).
DIZIN="${YEDEK_DIZINI:-./yedekler}"
mkdir -p "$DIZIN"
guvenli_dizin_hazirla "$DIZIN" || exit 1
LOG="$DIZIN/geri-yukleme-testi-$(date +%Y%m%d-%H%M%S).log"

YEDEK=""; ANAHTAR_ARG=""
for arg in "$@"; do
  case "$(basename "$arg")" in db-*.dump.age) YEDEK="$arg" ;; *) ANAHTAR_ARG="$arg" ;; esac
done

calistir() {
  if [ -z "$YEDEK" ]; then
    # En yeni GEÇERLİ adlı yedek (geçersiz adlı dosyalar sessizce atlanır).
    local aday
    while IFS= read -r aday; do
      if ortak_ad_gecerli_mi "$(basename "$aday")"; then YEDEK="$aday"; break; fi
    done < <(ls -1t "$DIZIN"/db-*.dump.age 2>/dev/null || true)
  fi
  [ -n "$YEDEK" ] && [ -f "$YEDEK" ] || { echo "Şifreli yedek dosyası (db-ZAMAN.dump.age) bulunamadı."; return 1; }
  YEDEK_AD=$(basename "$YEDEK")
  ortak_ad_gecerli_mi "$YEDEK_AD" && [[ "$YEDEK_AD" == db-* ]] \
    || { echo "SONUÇ: BAŞARISIZ - geçersiz yedek dosya adı reddedildi (beklenen: db-YYYYMMDD-HHMMSS.dump.age)."; return 1; }
  YEDEK_DIZIN=$(cd "$(dirname "$YEDEK")" && pwd)
  ZAMAN=$(ortak_zaman "$YEDEK_AD")
  MEDYA_AD="medya-$ZAMAN.tar.gz.age"
  ortak_imaj_var_mi

  echo "== Geri yükleme testi $(date -Iseconds) =="
  echo "Test edilen yedek: $YEDEK_DIZIN/$YEDEK_AD"

  echo "-- 1/4 Bütünlük (sha256) doğrulaması"
  if [ -f "$YEDEK_DIZIN/$MEDYA_AD" ]; then
    ortak_sha256_dogrula "$YEDEK_DIZIN" "$YEDEK_AD" "$MEDYA_AD" || { echo "SONUÇ: BAŞARISIZ - bütünlük doğrulanamadı."; return 1; }
  else
    ortak_sha256_dogrula "$YEDEK_DIZIN" "$YEDEK_AD" || { echo "SONUÇ: BAŞARISIZ - bütünlük doğrulanamadı."; return 1; }
    echo "UYARI: $MEDYA_AD yok; görsel yedeği test edilemedi."
  fi

  # Özel anahtar: dosya verilmediyse ve sunucuda yoksa gizli girişle istenir; yalnızca bellekte (tmpfs) tutulur.
  # Terminal işlemleri doğrudan /dev/tty üzerinden yapılır, bu yüzden anahtar günlüğe (tee) düşmez.
  GECICI=qr-geri-yukleme-testi-$$
  trap 'docker rm -fv "$GECICI" >/dev/null 2>&1 || true; ortak_gecici_temizle' EXIT
  ortak_anahtar_al "${ANAHTAR_ARG:-${YEDEK_ANAHTAR_DOSYASI:-}}" || { echo "SONUÇ: BAŞARISIZ - özel anahtar alınamadı."; return 1; }
  if [ -n "$ORTAK_GECICI" ]; then echo "Özel anahtar: gizli girişle alındı, bellekte tutuluyor, iş bitince silinecek (içeriği yazılmaz)"
  else echo "Özel anahtar dosyası: $ANAHTAR (içeriği yazılmaz)"; fi
  # Ağsız geçici veritabanı: parola gerekmez (dışarıdan erişim imkânsız), anahtar ve yedek salt okunur bağlanır.
  # --mount: yol ":" / "," içerse de bozulmaz (-v "YOL:/x" bozulurdu).
  M_ANAHTAR=$(ortak_mount "$ANAHTAR" /anahtar/yedek-anahtari.txt ro) || { echo "SONUÇ: BAŞARISIZ - anahtar yolu docker'a bağlanamıyor."; return 1; }
  M_YEDEK=$(ortak_mount "$YEDEK_DIZIN" /yedekler ro) || { echo "SONUÇ: BAŞARISIZ - yedek dizin yolu docker'a bağlanamıyor."; return 1; }
  docker run -d --name "$GECICI" --network none --tmpfs /tmp:mode=1777,size=2g \
    -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_USER=test -e POSTGRES_DB=test \
    --mount "$M_ANAHTAR" --mount "$M_YEDEK" \
    "$YEDEK_IMAJI" >/dev/null
  for i in $(seq 1 60); do docker exec "$GECICI" pg_isready -U test -d test >/dev/null 2>&1 && break; sleep 1; done
  sleep 2

  echo "-- 2/4 Şifre çözme ve pg_restore (geçici konteyner içinde; düz döküm yalnızca bellekte)"
  # Dosya adı kabuk metnine GÖMÜLMEZ; konum argümanı ($1) olarak geçirilir.
  docker exec "$GECICI" sh -c 'age -d -i /anahtar/yedek-anahtari.txt -o /tmp/yedek.dump "/yedekler/$1" && pg_restore --no-owner --no-acl -U test -d test /tmp/yedek.dump; s=$?; rm -f /tmp/yedek.dump; exit $s' _ "$YEDEK_AD" \
    || { echo "SONUÇ: BAŞARISIZ - yedek çözülemedi/yüklenemedi (anahtar yanlış olabilir)."; return 1; }

  echo "-- 3/4 Tablo sayıları"
  SORGU="SELECT 'qrkod', count(*) FROM qr_qrkod UNION ALL SELECT 'kampanya', count(*) FROM qr_kampanya UNION ALL SELECT 'sayfa', count(*) FROM qr_kampanyasayfasi UNION ALL SELECT 'hedefgecmisi', count(*) FROM qr_hedefgecmisi UNION ALL SELECT 'denetim', count(*) FROM qr_denetimkaydi UNION ALL SELECT 'kullanici', count(*) FROM auth_user ORDER BY 1;"
  YEDEKTEKI=$(docker exec "$GECICI" psql -U test -d test -At -c "$SORGU")
  CANLI=$(docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "$SORGU" 2>/dev/null || true)
  echo "Tablo | yedekte | canlıda"
  if [ -n "$CANLI" ]; then
    paste -d'|' <(echo "$YEDEKTEKI") <(echo "$CANLI" | cut -d'|' -f2)
  else
    echo "$YEDEKTEKI"
    echo "UYARI: canlı veritabanına ulaşılamadı; sayı karşılaştırması atlandı."
  fi

  echo "-- 4/4 Görsel arşivi"
  if [ -f "$YEDEK_DIZIN/$MEDYA_AD" ]; then
    SAYI=$(docker exec "$GECICI" sh -c 'set -o pipefail; age -d -i /anahtar/yedek-anahtari.txt "/yedekler/$1" | tar -tzf - | wc -l' _ "$MEDYA_AD") \
      || { echo "SONUÇ: BAŞARISIZ - görsel arşivi çözülemedi veya tar ile listelenemedi."; return 1; }
    echo "Görsel arşivi çözüldü ve tar ile listelendi: $SAYI girdi."
  fi

  if [ -z "$CANLI" ]; then
    echo "SONUÇ: GEÇTİ - yedek sha256 ile doğrulandı, çözüldü ve geri yüklendi (canlı karşılaştırma yapılamadı)."
  elif [ "$YEDEKTEKI" = "$CANLI" ]; then
    echo "SONUÇ: GEÇTİ - yedek geri yüklendi, sayılar canlı veriyle aynı."
  else
    echo "SONUÇ: GEÇTİ (sayılar farklı) - yedek alındıktan sonra yeni kayıt eklenmiş olabilir; yedek geri yüklenebildi."
  fi
}

# calistir bir boru hattı alt kabuğunda çalışır (günlük için tee): Ctrl-C/TERM/HUP gizli giriş sırasında gelirse ana kabuk da
# terminal yankısını açar (alt kabuğun kendi tuzağı geç kalabilir veya hiç tetiklenmeyebilir).
trap 'ortak_yankiyi_ac' EXIT
trap 'ortak_yankiyi_ac; exit 130' INT
trap 'ortak_yankiyi_ac; exit 143' TERM
trap 'ortak_yankiyi_ac; exit 129' HUP
calistir 2>&1 | sahip_olarak tee -a -- "$LOG"
SONUC=${PIPESTATUS[0]}
echo "Günlük: $LOG"
exit "$SONUC"
