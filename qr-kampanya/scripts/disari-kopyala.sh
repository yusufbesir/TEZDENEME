#!/usr/bin/env bash
# Şifreli yedekleri sunucu DIŞINA kopyalar, uzakta doğrular ve yalnızca doğrulananlardan eskileri yerelden siler.
# rclone ile çalışır (Backblaze B2, Hetzner Storage Box, Google Drive, S3 vb. desteklenir).
# Dosyalar zaten age ile şifrelidir (yedek servisi şifreler); uzak sağlayıcı içeriği okuyamaz.
#
# Adımlar:
#   1) rclone copy        : db-*.dump.age, medya-*.tar.gz.age, sha256-*.txt uzağa kopyalanır
#   2) rclone check --one-way : her yerel dosyanın uzakta bulunduğu ve boyut/özet olarak aynı olduğu doğrulanır
#                           (YEDEK_UZAK_INDIREREK=1 ise özet yerine verinin tamamı indirilip karşılaştırılır)
#   3) yedekler/uzak-dogrulama.json yazılır (zaman, doğrulanan dosyalar, hedefin yalnızca ":" öncesi adı)
#   4) Silme: YEDEK_SAKLAMA_GUN'den eski VE aynı ZAMAN'a ait db+medya+sha256 üçlüsünün HEPSİ uzakta doğrulanmışsa
#      yerel üçlü silinir. En yeni TAM yerel yedek (üçlüsü eksiksiz en yeni ZAMAN) asla silinmez. YEDEK_UZAK_HEDEF tanımlı değilse hiçbir şey silinmez.
# Yedek dosyaları root'a ait ve 600 izinlidir: bu betiği root ile çalıştırın (sudo crontab -e). Cron örneği:
#   30 4 * * * cd /opt/qr-kampanya && bash scripts/disari-kopyala.sh >> yedekler/disari-kopya.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

DIZIN="${YEDEK_DIZINI:-./yedekler}"
HEDEF="${YEDEK_UZAK_HEDEF:-}"
SAKLAMA_GUN="${YEDEK_SAKLAMA_GUN:-14}"
GUNLUK="$DIZIN/yedek-gunlugu.log"
DOGRULAMA="$DIZIN/uzak-dogrulama.json"

if [ -z "$HEDEF" ]; then
  echo "YEDEK_UZAK_HEDEF .env içinde tanımlı değil (örn. b2:firma-qr-yedek). Kopyalama yapılmadı; HİÇBİR yerel yedek silinmedi."
  exit 1
fi
# RCLONE_KOMUTU yalnızca testler içindir (sahte rclone); normalde "rclone" kullanılır.
RCLONE=(${RCLONE_KOMUTU:-rclone})
command -v "${RCLONE[0]}" >/dev/null || { echo "rclone kurulu değil: sudo apt install rclone"; exit 1; }
case "$SAKLAMA_GUN" in ''|*[!0-9]*|0) echo "YEDEK_SAKLAMA_GUN 1 veya daha büyük bir sayı olmalı (şu an: '$SAKLAMA_GUN'). Silme yapılmadı."; exit 1;; esac

# Kimlik bilgisi sızmasın: hedefin yalnızca ilk ":" öncesi adı (ve virgüllü bağlantı seçeneklerinden önceki kısmı) yazılır.
case "$HEDEF" in
  *:*) HEDEF_AD="${HEDEF%%:*}"; HEDEF_AD="${HEDEF_AD%%,*}"; [ -n "$HEDEF_AD" ] || HEDEF_AD="(adsız)" ;;
  *)   HEDEF_AD="(yerel-yol)" ;;
esac

gunluge() { echo "$(date -Iseconds) $*" | tee -a "$GUNLUK"; }

DESENLER=(--include 'db-*.dump.age' --include 'medya-*.tar.gz.age' --include 'sha256-*.txt')

# Eski sürümlerden kalan ŞİFRESİZ yedekler: yüklenmez, otomatik silinmez; kullanıcı uyarılır.
DUZ_SAYI=$(find "$DIZIN" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'medya-*.tar.gz' \) | wc -l | tr -d ' ')
if [ "$DUZ_SAYI" != "0" ]; then
  echo "UYARI: $DUZ_SAYI şifresiz eski yedek dosyası var (db-*.dump / medya-*.tar.gz). Bunlar uzağa kopyalanmaz ve otomatik silinmez; docs/YEDEKLEME.md bölümüne bakın."
fi

# 1) Kopyala (uzak taraftaki dosyaları SİLMEZ; uzak saklama süresini sağlayıcıda yaşam döngüsü kuralıyla ayarlayın).
"${RCLONE[@]}" copy "$DIZIN" "$HEDEF" "${DESENLER[@]}"

# 2) Doğrula: yerel her dosya uzakta var mı ve aynı mı? (--combined: "= ad" aynı, "+ ad" uzakta yok, "* ad" farklı, "! ad" hata)
KOMBINE=$(mktemp)
trap 'rm -f "$KOMBINE"' EXIT
CHECK_BAYRAK=()
[ "${YEDEK_UZAK_INDIREREK:-0}" = "1" ] && CHECK_BAYRAK=(--download)
if "${RCLONE[@]}" check "$DIZIN" "$HEDEF" --one-way "${DESENLER[@]}" ${CHECK_BAYRAK[@]+"${CHECK_BAYRAK[@]}"} --combined "$KOMBINE"; then
  CHECK_TAMAM=1
else
  CHECK_TAMAM=0
  echo "UYARI: bazı dosyalar uzakta doğrulanamadı (ayrıntı aşağıda)."
fi
mapfile -t DOGRULANAN < <(sed -n 's/^= //p' "$KOMBINE" | grep -E '^(db-[0-9]{8}-[0-9]{6}\.dump\.age|medya-[0-9]{8}-[0-9]{6}\.tar\.gz\.age|sha256-[0-9]{8}-[0-9]{6}\.txt)$' | sort || true)
sed -n 's/^\([-+*!]\) /  doğrulanamadı (\1): /p' "$KOMBINE" || true

# 3) Doğrulama kaydı. "zaman" yalnızca TÜM yerel dosyalar doğrulandığında yenilenir; aksi hâlde önceki başarılı zaman korunur.
ONCEKI_ZAMAN=""
[ -f "$DOGRULAMA" ] && ONCEKI_ZAMAN=$(sed -n 's/^ *"zaman": *"\([^"]*\)".*/\1/p' "$DOGRULAMA" | head -1 || true)
SIMDI=$(date -Iseconds)
if [ "$CHECK_TAMAM" = "1" ] && [ "${#DOGRULANAN[@]}" -gt 0 ]; then ZAMAN_DEGERI="\"$SIMDI\""
elif [ -n "$ONCEKI_ZAMAN" ]; then ZAMAN_DEGERI="\"$ONCEKI_ZAMAN\""
else ZAMAN_DEGERI="null"; fi
LISTE=""
for ad in ${DOGRULANAN[@]+"${DOGRULANAN[@]}"}; do LISTE+="${LISTE:+, }\"$ad\""; done
( umask 077
  printf '{\n  "zaman": %s,\n  "son_deneme": "%s",\n  "hedef": "%s",\n  "dogrulanan": [%s]\n}\n' \
    "$ZAMAN_DEGERI" "$SIMDI" "$HEDEF_AD" "$LISTE" > "$DOGRULAMA.tmp" && mv "$DOGRULAMA.tmp" "$DOGRULAMA" )
gunluge "dışarı kopyalama: ${#DOGRULANAN[@]} dosya uzakta doğrulandı → $HEDEF_AD"

dogrulandi_mi() { printf '%s\n' ${DOGRULANAN[@]+"${DOGRULANAN[@]}"} | grep -qxF -- "$1"; }

# 4) Silme: yalnızca saklama süresinden eski + üçlünün tamamı uzakta doğrulanmış + en yeni değil.
mapfile -t ZAMANLAR < <(find "$DIZIN" -maxdepth 1 -type f \( -name 'db-*.dump.age' -o -name 'medya-*.tar.gz.age' -o -name 'sha256-*.txt' \) -printf '%f\n' \
  | sed -n 's/^\(db-\([0-9]\{8\}-[0-9]\{6\}\)\.dump\.age\|medya-\([0-9]\{8\}-[0-9]\{6\}\)\.tar\.gz\.age\|sha256-\([0-9]\{8\}-[0-9]\{6\}\)\.txt\)$/\2\3\4/p' | sort -u)
if [ "${#ZAMANLAR[@]}" -eq 0 ]; then echo "Yerel yedek yok; silinecek bir şey yok."; exit 0; fi
# EN_YENI: üçlüsü (db+medya+sha256) yerelde TAM olan en yeni ZAMAN. Yetim bir ZAMAN (ör. sha256'sı olmayan yarım
# db dosyası) en yeni sayılmaz; aksi hâlde son tam üçlü korumasız kalıp silinebilirdi.
EN_YENI=""
for ((i = ${#ZAMANLAR[@]} - 1; i >= 0; i--)); do
  Z="${ZAMANLAR[$i]}"
  if [ -f "$DIZIN/db-$Z.dump.age" ] && [ -f "$DIZIN/medya-$Z.tar.gz.age" ] && [ -f "$DIZIN/sha256-$Z.txt" ]; then EN_YENI="$Z"; break; fi
done
SINIR=$(( $(date +%s) - SAKLAMA_GUN * 86400 ))
SILINEN=0
for Z in "${ZAMANLAR[@]}"; do
  [ "$Z" = "$EN_YENI" ] && continue   # en yeni yedek hiçbir koşulda silinmez
  UCLU=("db-$Z.dump.age" "medya-$Z.tar.gz.age" "sha256-$Z.txt")
  TAMAM=1
  for f in "${UCLU[@]}"; do
    [ -f "$DIZIN/$f" ] || { TAMAM=0; break; }                 # eksik üçlü silinmez
    dogrulandi_mi "$f" || { TAMAM=0; break; }                  # uzakta doğrulanmamış üçlü silinmez
  done
  [ "$TAMAM" = "1" ] || { echo "Korundu (üçlü tam değil veya uzakta doğrulanmadı): $Z"; continue; }
  AD_ZAMANI=$(date -d "${Z:0:4}-${Z:4:2}-${Z:6:2} ${Z:9:2}:${Z:11:2}:${Z:13:2}" +%s)
  ESKI=1
  for f in "${UCLU[@]}"; do
    [ "$AD_ZAMANI" -lt "$SINIR" ] && [ "$(stat -c %Y "$DIZIN/$f")" -lt "$SINIR" ] || ESKI=0
  done
  [ "$ESKI" = "1" ] || { echo "Korundu (henüz $SAKLAMA_GUN günden eski değil): $Z"; continue; }
  for f in "${UCLU[@]}"; do
    rm -f -- "$DIZIN/$f"
    gunluge "SİLİNDİ yerel yedek: $f (uzakta doğrulandı: $HEDEF_AD; saklama $SAKLAMA_GUN gün)"
    SILINEN=$((SILINEN + 1))
  done
done
echo "$(date -Iseconds) tamam: $SILINEN yerel dosya silindi."
