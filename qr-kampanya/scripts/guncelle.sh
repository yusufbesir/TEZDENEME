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
    caddy-dogrulama)
      echo "HATA: yeni Caddyfile GEÇERSİZ. Eski Caddy'ye DOKUNULMADI; eski yapılandırmayla çalışmaya devam eder."
      echo "Yeni uygulama (app) zaten başlatıldı. Caddyfile'ı düzeltip tekrar çalıştırın: bash scripts/guncelle.sh"
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
# Anahtar dosyası da, .env'de YEDEK_ALICI de yoksa yeni anahtar üretilir (ekranda bir kez gösterilir, EVET ile sunucudan
# kaldırılır). Mevcut anahtara dokunulmaz; YEDEK_ALICI varken anahtar dosyası yoksa (sunucudan kaldırılmış) YENİ ANAHTAR ÜRETİLMEZ.
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
# --no-deps: bağımlılıklar (db, hazirlik) yeniden oluşturulmaz; hazırlık yukarıda ayrıca çalıştırılıp doğrulandı.
docker compose up -d --no-deps app
HAZIR=0
for i in $(seq 1 60); do
  if docker compose ps app --format '{{.Health}}' | grep -q healthy; then HAZIR=1; break; fi
  sleep 2
done
[ "$HAZIR" = "1" ] || { echo "HATA: uygulama 2 dakikada sağlıklı duruma geçmedi."; exit 1; }
echo "Uygulama sağlıklı."

echo "6/6 Caddy: yeni Caddyfile doğrulanıyor, sonra yeniden oluşturulur (güncel Caddyfile'ın yüklendiği doğrulanır)..."
ASAMA="caddy-dogrulama"
# Önce YENİ Caddyfile, kullanıcı konteynerine dokunmadan (tek seferlik, --no-deps, port yayınlamaz) doğrulanır;
# geçersizse eski Caddy olduğu gibi çalışmaya devam eder. Compose ortam değişkenleri (SITE_ADRESI, ACME_EPOSTA) bu kapta da tanımlıdır.
if ! docker compose run --rm -T --no-deps --entrypoint caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
  exit 1
fi
ASAMA="caddy"
# Compose, yalnızca bağlanan Caddyfile değiştiyse konteyneri yeniden oluşturmaz ve Caddy dosyayı izlemez;
# bu yüzden her güncellemede zorla yeniden oluşturulur (kısa bir kesinti: birkaç saniye).
docker compose up -d --force-recreate --no-deps caddy
BEKLENEN=$(sha256sum caddy/Caddyfile | cut -d' ' -f1)
caddy_saglam_mi() {
  # Çalışan Caddyfile güncel + geçerli + konteyner çalışıyor + hiç yeniden başlamamış (çöküp döngüye girmemiş).
  local cid calisan
  cid=$(docker compose ps -q caddy 2>/dev/null | head -1)
  [ -n "$cid" ] || return 1
  calisan=$(docker compose exec -T caddy sha256sum /etc/caddy/Caddyfile 2>/dev/null | cut -d' ' -f1 || true)
  [ -n "$calisan" ] && [ "$calisan" = "$BEKLENEN" ] \
    && docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1 \
    && [ "$(docker compose ps caddy --format '{{.State}}')" = "running" ] \
    && [ "$(docker inspect -f '{{.RestartCount}}' "$cid" 2>/dev/null)" = "0" ]
}
TAMAM=0
for i in $(seq 1 30); do
  if caddy_saglam_mi; then TAMAM=1; break; fi
  sleep 2
done
# Kısa bir bekleme sonrası yeniden denetlenir: çöküp yeniden başlayan konteyner (RestartCount > 0) hemen yakalanır.
if [ "$TAMAM" = "1" ]; then sleep 4; caddy_saglam_mi || TAMAM=0; fi
[ "$TAMAM" = "1" ] || { echo "HATA: Caddy güncel Caddyfile ile kararlı çalışır durumda doğrulanamadı (durum/RestartCount/Caddyfile özeti)."; exit 1; }
echo "Caddy güncel yapılandırmayla çalışıyor (Caddyfile özeti eşleşti, RestartCount 0)."
trap - EXIT
echo "Güncelleme tamamlandı."
