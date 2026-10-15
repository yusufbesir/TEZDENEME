#!/usr/bin/env bash
# Güncelleme: önce db+roller, sonra şifreli yedek, sonra hazırlık (migrasyon, ayrı ve başarısı beklenir),
# en son app ve Caddy (Caddy her zaman yeniden oluşturulur: bağlanan Caddyfile değişse de eski kalmasın).
# Veriler Docker birimlerinde (volume) durduğu için kaybolmaz.
#   bash scripts/guncelle.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# Eski kurulumlarda eksik olabilecek rol parolaları: mevcut satırlara DOKUNULMAZ, yalnızca .env'nin SONUNA eklenir.
rastgele() { python3 -c "import secrets;print(secrets.token_urlsafe($1))" 2>/dev/null || openssl rand -base64 "$1" | tr -d '/+=\n'; }
for ANAHTAR in POSTGRES_SAHIP_PAROLA POSTGRES_UYGULAMA_PAROLA; do
  if ! grep -q "^${ANAHTAR}=" .env; then
    [ -z "$(tail -c1 .env)" ] || echo >> .env
    echo "${ANAHTAR}=$(rastgele 32)" >> .env
    echo ".env dosyasının SONUNA eksik anahtar eklendi: ${ANAHTAR} (diğer satırlar değiştirilmedi)."
  fi
done
# Sıralama ÖNEMLİ: güncelleme öncesi şifreli yedek qr_sahip ile alınır; eski kurulumda bu rol henüz yoktur.
# Bu yüzden önce veritabanı (yeni ortamla) ayağa kalkar ve roller kurulur (10-roller.sh idempotent ve
# yıkıcı değildir: veri silmez/değiştirmez), SONRA yedek alınır, EN SON yeni uygulama başlatılır.
ASAMA="hazirlik-oncesi"
YEDEK_AD=""
hata_yolu() {
  local kod=$?
  trap - EXIT
  [ "$kod" -ne 0 ] || return 0
  echo
  case "$ASAMA" in
    hazirlik)
      echo "HATA: hazırlık (veritabanı migrasyonu) BAŞARISIZ oldu. Eski uygulama (app) ve Caddy'ye dokunulmadı; çalışıyorsa çalışmaya devam eder."
      echo "Günlük: docker compose logs hazirlik --tail 100"
      ;;
    app|caddy)
      echo "HATA: hazırlık tamamlandı ancak $ASAMA aşamasında hata oluştu; site yarım kalmış olabilir."
      echo "Günlükler: docker compose logs app caddy --tail 100"
      ;;
    *)
      echo "HATA: güncelleme $ASAMA aşamasında durdu; yeni uygulama başlatılmadı. Veritabanı (db) yeni ayarlarla yeniden oluşturulmuş olabilir ama veri birimleri silinmez."
      echo "Günlük: docker compose logs db --tail 50"
      ;;
  esac
  if [ -n "$YEDEK_AD" ]; then
    echo "Güncelleme öncesi alınan yedek: ${YEDEK_DIZINI:-./yedekler}/$YEDEK_AD"
    echo "Gerekirse dönüş: bash scripts/geri-yukle.sh ${YEDEK_DIZINI:-./yedekler}/$YEDEK_AD [--medya]"
  fi
  exit "$kod"
}
trap hata_yolu EXIT
YEDEK_DIZINI=$(sed -n 's/^YEDEK_DIZINI=//p' .env | tail -1)

echo "1/6 İmajlar çekiliyor ve derleniyor..."
# İmaj etiketleri sabit (postgres:17.6-alpine, caddy:2.10.2-alpine): çekme başarısız olsa bile (ör. kayıt
# erişilemiyor) yerelde aynı etiket varsa güncelleme sürebilir; yoksa up/build kendisi anlaşılır hata verir.
ASAMA="derleme"
docker compose pull db caddy \
  || echo "UYARI: db/caddy imajları çekilemedi (kayıt erişilemiyor olabilir). Etiketler sabit olduğundan yerel imajlarla devam ediliyor."
docker compose build yedek app

echo "2/6 Veritabanı ve roller (qr_sahip, qr_uygulama) hazırlanıyor..."
ASAMA="veritabani"
docker compose up -d db
HAZIR=0
for i in $(seq 1 60); do
  if docker compose ps db --format '{{.Health}}' | grep -q healthy; then HAZIR=1; break; fi
  sleep 2
done
[ "$HAZIR" = "1" ] || { echo "HATA: veritabanı 2 dakikada sağlıklı olmadı; yedek alınmadı, yeni uygulama başlatılmadı (db yeni ayarlarla yeniden oluşturulmuş olabilir). Günlük: docker compose logs db --tail 50"; trap - EXIT; exit 1; }
docker compose exec -T db sh /docker-entrypoint-initdb.d/10-roller.sh

echo "3/6 Güncelleme öncesi şifreli yedek alınıyor..."
ASAMA="yedek"
# Anahtar eksikse üretilir, mevcut anahtara dokunulmaz.
bash scripts/yedek-anahtari-hazirla.sh
# YEDEK_ALICI .env'ye yeni eklenmiş olabilir; konteyner ortamı yeniden okusun.
docker compose up -d --no-deps yedek
YEDEK_CIKTI=$(docker compose exec -T yedek sh /betikler/yedek-al.sh 2>&1) || { echo "$YEDEK_CIKTI"; exit 1; }
echo "$YEDEK_CIKTI"
YEDEK_AD=$(printf '%s\n' "$YEDEK_CIKTI" | sed -n 's|^Yedek tamam.*/\(db-[0-9]\{8\}-[0-9]\{6\}\.dump\.age\)$|\1|p' | tail -1)

echo "4/6 Hazırlık (migrasyonlar, qr_sahip ile) çalıştırılıyor; başarısı beklenir, eski app'e henüz dokunulmaz..."
ASAMA="hazirlik"
docker compose up --no-deps --force-recreate --exit-code-from hazirlik hazirlik

echo "5/6 Yeni uygulama başlatılıyor..."
ASAMA="app"
docker compose up -d app
HAZIR=0
for i in $(seq 1 60); do
  if docker compose ps app --format '{{.Health}}' | grep -q healthy; then HAZIR=1; break; fi
  sleep 2
done
[ "$HAZIR" = "1" ] || { echo "HATA: uygulama 2 dakikada sağlıklı duruma geçmedi."; exit 1; }
echo "Uygulama sağlıklı."

echo "6/6 Caddy yeniden oluşturuluyor (güncel Caddyfile'ın yüklendiği doğrulanır)..."
ASAMA="caddy"
# Compose, yalnızca bağlanan Caddyfile değiştiyse konteyneri yeniden oluşturmaz ve Caddy dosyayı izlemez;
# bu yüzden her güncellemede zorla yeniden oluşturulur (kısa bir kesinti: birkaç saniye).
docker compose up -d --force-recreate --no-deps caddy
BEKLENEN=$(sha256sum caddy/Caddyfile | cut -d' ' -f1)
TAMAM=0
for i in $(seq 1 30); do
  CALISAN=$(docker compose exec -T caddy sha256sum /etc/caddy/Caddyfile 2>/dev/null | cut -d' ' -f1 || true)
  if [ -n "$CALISAN" ] && [ "$CALISAN" = "$BEKLENEN" ] \
     && docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1 \
     && [ "$(docker compose ps caddy --format '{{.State}}')" = "running" ]; then TAMAM=1; break; fi
  sleep 2
done
[ "$TAMAM" = "1" ] || { echo "HATA: Caddy güncel Caddyfile ile çalışır durumda doğrulanamadı."; exit 1; }
echo "Caddy güncel yapılandırmayla çalışıyor (Caddyfile özeti eşleşti)."
trap - EXIT
echo "Güncelleme tamamlandı."
