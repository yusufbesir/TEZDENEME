#!/usr/bin/env bash
# Şifreli yedekleri sunucu DIŞINA kopyalar, uzakta doğrular ve yalnızca doğrulananlardan eskileri yerelden siler.
# rclone ile çalışır (Backblaze B2, Hetzner Storage Box, Google Drive, S3 vb. desteklenir).
# Dosyalar zaten age ile şifrelidir (yedek servisi şifreler); uzak sağlayıcı içeriği okuyamaz.
#
# Adımlar:
#   1) rclone copy        : db-*.dump.age, medya-*.tar.gz.age, sha256-*.txt uzağa kopyalanır
#   2) rclone check --one-way : her yerel dosyanın uzakta bulunduğu ve boyut/özet olarak aynı olduğu doğrulanır
#                           (YEDEK_UZAK_INDIREREK=1 ise özet yerine verinin tamamı indirilip karşılaştırılır).
#                           Ortak özet (hash) olup olmadığı AÇIK SORGUYLA (rclone backend features) belirlenir; sorgu
#                           başarısız/belirsizse veya hedef sftp/ftp/smb/webdav/http gibi ağ dosya sistemiyse rclone
#                           yalnızca BOYUT karşılaştırabileceğinden --download ile (veriyi indirerek) doğrulanır; rclone
#                           günlüğündeki "No common hash found" metni yedek tetiktir. İndirme yalnızca silinmeye aday
#                           eski üçlüler + en yeni tam üçlü için yapılır. O da başarısız olursa hiçbir yerel yedek silinmez.
#   3) yedekler/uzak-dogrulama.json yazılır (zaman, doğrulanan dosyalar, hedefin yalnızca ":" öncesi adı)
#                           "zaman" = en yeni TAM üçlünün uzakta doğrulandığı son an (doğrulanmadıysa güncellenmez)
#   Ortam: tüm rclone çağrıları RCLONE_* değişkenleri olmadan çalışır (yalnızca RCLONE_CONFIG ve RCLONE_CONFIG_PASS korunur);
#      ayarlar yalnızca `rclone config` ayar dosyasından okunur. sftp `ssh` alanı doluysa hedef belirsiz = yerel sayılır.
#   0) YEDEK_UZAK_HEDEF AYNI MAKİNEYİ gösteriyorsa (yerel yol, rclone "local" türü, yerel hedefe işaret eden
#      "alias/crypt/..." uzak ad, host/endpoint/url'si localhost/127.0.0.0/8/::1/makine adı/makine IP'si olan ağ türü) VEYA
#      hedef güvenle sunucu dışı olduğu belirlenemiyorsa (izin listesinde olmayan/bilinmeyen tür, "ad,seçenek=değer:yol" biçimi) kopyalanır ama sunucu
#      dışı SAYILMAZ: yerel yedek silinmez, panel uyarısı sürer.
#      Özel ağ adresleri (10/8, 172.16/12, 192.168/16, 100.64/10, 169.254/16, fc00::/7, fe80::/10; IP ya da çözülen ad) da
#      belirsiz = yerel sayılır (NAT/kapsayıcı); bunlarda YEDEK_UZAK_ONAYLI_HEDEF olsa bile silme yapılmaz.
#      (Yalnızca deneme için kaçış: YEDEK_YEREL_HEDEF_IZIN=<HEDEF_AD> — değer ":" öncesi adla BİREBİR aynı olmalı, "1" yetmez;
#       her kullanım yedek-gunlugu.log'a yazılır; üretimde KULLANMAYIN.)
#   0b) AÇIK ONAY: hedef sunucu dışı görünse bile yerel yedek ancak .env'de YEDEK_UZAK_ONAYLI_HEDEF=<HEDEF_AD> (":" öncesi ad,
#      birebir) varsa silinir. Onay yoksa kopyalanır ve doğrulanır ama silinmez, "zaman" null kalır (panel uyarısı sürer).
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
read -ra RCLONE <<<"${RCLONE_KOMUTU:-rclone}"   # tırnaksız genişletme (glob/bölme) yerine güvenli ayrıştırma
[ "${#RCLONE[@]}" -gt 0 ] || RCLONE=(rclone)
command -v "${RCLONE[0]}" >/dev/null || { echo "rclone kurulu değil: sudo apt install rclone"; exit 1; }

# Temiz rclone ortamı: bu betikteki TÜM rclone çağrıları `RCLONE_` ile başlayan ortam değişkenleri olmadan çalışır; yalnızca
# RCLONE_CONFIG (ayar dosyası yolu) ve RCLONE_CONFIG_PASS (ayar şifresi) korunur. Böylece tek doğruluk kaynağı ayar dosyasıdır:
# yerel hedef tespiti ile rclone'un gerçekten kullandığı ayar aynıdır (RCLONE_SFTP_HOST, RCLONE_S3_ENDPOINT, RCLONE_ALIAS_REMOTE,
# RCLONE_CONFIG_AD_* ile tespiti atlatmak ya da RCLONE_SIZE_ONLY gibi değişkenlerle doğrulamayı zayıflatmak mümkün olmaz).
# RCLONE_KOMUTU betiğin kendi (yalnızca test) değişkenidir; sessizce temizlenir. Kaldırılan değişkenin yalnızca ADI yazılır.
RCLONE_ORTAM=(env)
KALDIRILAN_ORTAM=()
while IFS= read -r _ad; do
  case "$_ad" in
    RCLONE_CONFIG|RCLONE_CONFIG_PASS) continue ;;
    RCLONE_KOMUTU) RCLONE_ORTAM+=(-u "$_ad"); continue ;;
    RCLONE_[A-Za-z0-9_]*) RCLONE_ORTAM+=(-u "$_ad"); KALDIRILAN_ORTAM+=("$_ad") ;;
  esac
done < <(compgen -e)
if [ "${#KALDIRILAN_ORTAM[@]}" -gt 0 ]; then
  echo "UYARI: şu RCLONE_* ortam değişkenleri rclone çağrılarında YOK SAYILDI (yalnızca adları): ${KALDIRILAN_ORTAM[*]}"
  echo "       rclone ayarlarını ortam değişkeniyle değil 'rclone config' ile (ayar dosyasında) yapın; RCLONE_CONFIG ve RCLONE_CONFIG_PASS korunur."
fi
# Tüm rclone çağrıları bu işlevden geçer (zaman aşımı gerekiyorsa çağıran önüne ekler).
rc() { "${RCLONE_ORTAM[@]}" "${RCLONE[@]}" "$@"; }
case "$SAKLAMA_GUN" in ''|*[!0-9]*|0) echo "YEDEK_SAKLAMA_GUN 1 veya daha büyük bir sayı olmalı (şu an: '$SAKLAMA_GUN'). Silme yapılmadı."; exit 1;; esac

# Kimlik bilgisi sızmasın: hedefin yalnızca ilk ":" öncesi adı (ve virgüllü bağlantı seçeneklerinden önceki kısmı) yazılır.
case "$HEDEF" in
  *:*) HEDEF_AD="${HEDEF%%:*}"; HEDEF_AD="${HEDEF_AD%%,*}"; [ -n "$HEDEF_AD" ] || HEDEF_AD="(adsız)" ;;
  *)   HEDEF_AD="(yerel-yol)" ;;
esac

gunluge() { echo "$(date -Iseconds) $*" | tee -a "$GUNLUK"; }

# JSON metin değerleri için kaçış: \ " ve kontrol karakterleri (serbest metin JSON'u bozmasın/enjekte etmesin).
json_kacis() {
  local s="$1"
  s="${s//\\/\\\\}"; s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"; s="${s//$'\r'/\\r}"; s="${s//$'\t'/\\t}"
  s="${s//[[:cntrl:]]/ }"
  printf '%s' "$s"
}

# --- Hedef sunucu dışı mı? --------------------------------------------------------------------------------
# İLKE: belirsizlik her zaman "YEREL" sayılır (yerel yedek silinmez). Yerel sayılan durumlar:
#   - yerel yol, rclone "local" türü, yerel hedefe işaret eden alias/crypt/compress/chunker/hasher/cache/union/combine;
#   - tür belirlenemedi (ad listremotes'ta yok, listremotes hata verdi, bağlantı dizesinde tür boş);
#   - ADLANDIRILMIŞ uzak + bağlantı dizesi seçenekleri ("ad,anahtar=değer:yol"): seçenekler rclone ayarını
#     (host/remote/endpoint/url...) geçersiz kılar. Seçenekleri tek tek yorumlamak kırılgan olduğundan, seçenek
#     içeren HER adlandırılmış hedef belirsiz sayılır (basit ve güvenli yol); ayar dosyasına yazın ya da ":tür,..." kullanın;
#   - ağ türlerinin (sftp, ftp, smb, webdav, s3, http...) host/endpoint/url/auth/namenode/api_url alanı BU makineyi
#     gösteriyorsa: localhost, 127.0.0.0/8, ::1, 0.0.0.0, `hostname`/`hostname -f` adı, `hostname -I` (yoksa `ip -o addr`)
#     IP'leri; ad ayrıca getent ile çözülüp aynı adreslerle karşılaştırılır. Alanlar ayar dosyasından ve
#     ":tür,host=...:yol" bağlantı dizesinden okunur (RCLONE_* ortam değişkenleri rclone çağrılarından kaldırılır, okunmaz);
#   - `ssh` alanı dolu (ayarda ya da bağlantı dizesinde): sftp dış ssh komutu gerçek hedefi gizleyebilir -> belirsiz.
# rclone uzak türleri `rclone listremotes --long` çıktısındaki "ad: tür" satırlarından okunur; sarmalayan türlerin
# (alias, crypt, compress, chunker, hasher, cache) `remote =` değeri, union/combine'ın `upstreams =` değeri
# `rclone config show AD` çıktısından okunup özyinelemeli çözülür. config show gizli değer (parola) içerir:
# çıktısı YALNIZCA ayrıştırılır, hiçbir yere yazılmaz, yalnızca istenen anahtarların değeri okunur.
rclone_tur() {
  rc listremotes --long 2>/dev/null | awk -v n="$1" '{ ad=$1; sub(/:$/, "", ad); if (ad == n) { print $2; exit } }' || true
}
# rclone_alanlar AD ANAHTAR...: yalnızca istenen anahtarlar için "anahtar<TAB>değer" satırları yazar.
rclone_alanlar() {
  local ad="$1"; shift
  rc config show "$ad" 2>/dev/null | awk -v keys="$*" 'BEGIN { n = split(keys, K, " "); for (i = 1; i <= n; i++) W[K[i]] = 1 } { i = index($0, "="); if (i > 0) { a = substr($0, 1, i - 1); gsub(/ +$/, "", a); if (a in W) { v = substr($0, i + 1); sub(/^ +/, "", v); print a "\t" v } } }' || true
}
rclone_alan() { rclone_alanlar "$1" "$2" | sed -n '1s/^[^\t]*\t//p' || true; }

# Boşlukla ayrılmış liste (çift tırnaklı öğeler boşluk içerebilir; "" tırnağı kaçırır) -> satır başına bir öğe.
bosluk_ayir() {
  local s="$1" n i c q=0 parca="" var=0
  n=${#s}
  for ((i = 0; i < n; i++)); do
    c="${s:i:1}"
    if [ "$q" = 1 ]; then
      if [ "$c" = '"' ]; then
        if [ "${s:i+1:1}" = '"' ]; then parca+='"'; i=$((i + 1)); else q=0; fi
      else parca+="$c"; fi
    else
      case "$c" in
        '"') q=1; var=1 ;;
        [[:space:]]) if [ "$var" = 1 ]; then printf '%s\n' "$parca"; parca=""; var=0; fi ;;
        *) parca+="$c"; var=1 ;;
      esac
    fi
  done
  if [ "$var" = 1 ]; then printf '%s\n' "$parca"; fi
  return 0
}

# ":tür,anahtar=değer,anahtar='değer,virgüllü':yol" -> ilk satır tür, sonraki satırlar anahtar=değer (tırnak çözülür).
bag_secenekleri() {
  local s="${1#:}" n i c q="" parca=""
  n=${#s}
  for ((i = 0; i < n; i++)); do
    c="${s:i:1}"
    if [ -n "$q" ]; then
      if [ "$c" = "$q" ]; then
        if [ "${s:i+1:1}" = "$q" ]; then parca+="$c"; i=$((i + 1)); else q=""; fi
      else parca+="$c"; fi
      continue
    fi
    case "$c" in
      "'"|'"') q="$c" ;;
      ,) printf '%s\n' "$parca"; parca="" ;;
      :) break ;;
      *) parca+="$c" ;;
    esac
  done
  printf '%s\n' "$parca"
}

ADRES_ANAHTARLARI="host endpoint url auth namenode api_url storage_url hostname"
# Bu alanlar dolu/açıksa hedef tanımı gereği yereldir ya da belirsizdir: ssh (dış komut), unix_socket (yerel soket),
# use_emulator (azure yerel emülatörü, 127.0.0.1).
BELIRSIZ_ANAHTARLAR="ssh unix_socket use_emulator"
AG_TURLERI=" sftp ftp smb webdav http "     # özet (hash) bilgisi sunucu kabuğuna/uzantısına bağlı: --download kullanılır
# İZİN LİSTESİ: yalnızca bu türler sunucu dışı olabilir (adresleri yine bu makineye karşı denetlenir). Listede olmayan
# her tür (archive, memory, hdfs, http ve rclone'a sonradan eklenecek türler dahil) BELİRSİZ sayılır -> yerel, silme yok.
# Kara liste yerine izin listesi: yeni/az bilinen bir tür yerel diske yazıyorsa yerel yedeği sildirmesin.
UZAK_TURLERI=" b2 s3 sftp ftp smb webdav swift azureblob azurefiles gcs oos qingstor storj drive onedrive dropbox box pcloud mega koofr jottacloud hidrive yandex seafile "
YEREL_ADRESLER=""; YEREL_ADRES_HAZIR=0
YEREL_NEDEN=""
HEDEF_AG_FS=0

# Bu makinenin adları ve IP'leri (küçük harf, satır başına bir tane).
yerel_adresleri_topla() {
  [ "$YEREL_ADRES_HAZIR" = "1" ] && return 0
  YEREL_ADRES_HAZIR=1
  YEREL_ADRESLER=$(
    {
      hostname 2>/dev/null || true
      hostname -f 2>/dev/null || true
      ips=$(hostname -I 2>/dev/null || true)
      if [ -n "${ips// /}" ]; then printf '%s\n' "$ips" | tr -s ' ' '\n'
      elif command -v ip >/dev/null 2>&1; then
        ip -o addr 2>/dev/null | awk '{ for (i = 1; i < NF; i++) if ($i == "inet" || $i == "inet6") { a = $(i + 1); sub(/\/.*/, "", a); print a } }' || true
      fi
    } | tr 'A-Z' 'a-z' | sed 's/\.$//; s/%.*//' | awk 'NF' || true
  )
}
adres_yerel_mi() {
  local a="${1,,}" ip
  a="${a%.}"
  [ -n "$a" ] || return 1
  [[ "$a" =~ ^127(\.[0-9]+){3}$ ]] && return 0
  case "$a" in localhost|*.localhost|0.0.0.0|::|::1|0:0:0:0:0:0:0:1|::ffff:127.*|::ffff:0.0.0.0) return 0 ;; esac
  yerel_adresleri_topla
  grep -qxF -- "$a" <<<"$YEREL_ADRESLER" && return 0
  if command -v getent >/dev/null 2>&1; then
    while IFS= read -r ip; do
      [ -n "$ip" ] || continue
      [[ "$ip" =~ ^127(\.[0-9]+){3}$ ]] && return 0
      case "$ip" in ::1|0.0.0.0|::|::ffff:127.*) return 0 ;; esac
      grep -qxF -- "$ip" <<<"$YEREL_ADRESLER" && return 0
    done < <(getent ahosts "$a" 2>/dev/null | awk '{ print tolower($1) }' | sort -u || true)
  fi
  return 1
}
# Özel/yerel ağ IP'si mi? 10/8, 172.16/12, 192.168/16, 100.64/10 (CGNAT), 169.254/16 (link-local), fc00::/7 (ULA), fe80::/10.
# NAT arkasındaki, başka bir kapsayıcıdaki ya da aynı yerel ağdaki bir adres "başka makine" olduğunu KANITLAMAZ -> belirsiz = yerel.
ip_ozel_mi() {
  local a="${1,,}" o1 o2
  a="${a%%\%*}"; a="${a#::ffff:}"
  if [[ "$a" =~ ^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$ ]]; then
    o1=$((10#${BASH_REMATCH[1]})); o2=$((10#${BASH_REMATCH[2]}))
    [ "$o1" -eq 10 ] && return 0
    [ "$o1" -eq 172 ] && [ "$o2" -ge 16 ] && [ "$o2" -le 31 ] && return 0
    [ "$o1" -eq 192 ] && [ "$o2" -eq 168 ] && return 0
    [ "$o1" -eq 100 ] && [ "$o2" -ge 64 ] && [ "$o2" -le 127 ] && return 0
    [ "$o1" -eq 169 ] && [ "$o2" -eq 254 ] && return 0
    return 1
  fi
  [[ "$a" == *:* ]] || return 1
  [[ "$a" =~ ^f[cd][0-9a-f]{0,2}: ]] && return 0
  [[ "$a" =~ ^fe[89ab][0-9a-f]?: ]] && return 0
  return 1
}
# Ad/IP özel ağda mı? (IP ise doğrudan; ad ise getent ile çözülen adreslerden biri özelse)
adres_ozel_mi() {
  local a="${1,,}" ip
  a="${a%.}"
  [ -n "$a" ] || return 1
  ip_ozel_mi "$a" && return 0
  if command -v getent >/dev/null 2>&1; then
    while IFS= read -r ip; do
      [ -n "$ip" ] || continue
      ip_ozel_mi "$ip" && return 0
    done < <(getent ahosts "$a" 2>/dev/null | awk '{ print tolower($1) }' | sort -u || true)
  fi
  return 1
}
# "http://kullanici@host:9000/yol", "host:2222", "[::1]:22" -> host
host_cikar() {
  local v="$1"
  v="${v#"${v%%[![:space:]]*}"}"
  if [[ "$v" =~ ^[A-Za-z][A-Za-z0-9+.-]*:// ]]; then v="${v#*://}"; fi
  v="${v%%/*}"; v="${v##*@}"
  if [[ "$v" == \[*\]* ]]; then v="${v#\[}"; v="${v%%\]*}"
  elif [[ "$v" =~ ^[^:]*:[0-9]*$ ]]; then v="${v%%:*}"; fi
  printf '%s' "$v"
}
# stdin: "anahtar<TAB>değer" satırları. `ssh` alanı (sftp'nin `ssh = ssh u@host` dış komutu; ayarda ya da bağlantı dizesinde)
# doluysa gerçek hedef host alanından değil bu komuttan gelir ve güvenle yorumlanamaz -> belirsiz = YEREL (silme yok).
ssh_dolu_mu() {
  local k v
  while IFS=$'\t' read -r k v; do
    v="${v//[[:space:]]/}"
    case "$k" in
      ssh) [ -n "$v" ] && { YEREL_NEDEN="ssh alanı dolu (sftp dış ssh komutu): gerçek hedef host alanından belirlenemez, belirsiz sayıldı"; return 0; } ;;
      unix_socket) [ -n "$v" ] && { YEREL_NEDEN="unix_socket alanı dolu: bağlantı bu makinedeki bir sokete gidiyor"; return 0; } ;;
      use_emulator) case "${v,,}" in true|1|yes|on) YEREL_NEDEN="use_emulator açık: yerel emülatör (bu makine)"; return 0 ;; esac ;;
    esac
  done
  return 1
}
# stdin: "anahtar<TAB>değer" satırları. Herhangi biri bu makineyi gösteriyorsa 0 döner (YEREL_NEDEN dolar).
adaylar_yerel_mi() {
  local k v
  while IFS=$'\t' read -r k v; do
    [ -n "$v" ] || continue
    v=$(host_cikar "$v")
    if adres_yerel_mi "$v"; then YEREL_NEDEN="$k alanı bu makineyi gösteriyor (localhost/loopback/makine adı veya IP'si)"; return 0; fi
    if adres_ozel_mi "$v"; then YEREL_NEDEN="$k alanı özel/yerel ağ adresi (10/8, 172.16/12, 192.168/16, 100.64/10, 169.254/16, fc00::/7, fe80::/10): NAT arkasında ya da başka bir kapsayıcıda olabilir, gerçekten başka makine olduğu kanıtlanamaz (onay olsa bile silme yapılmaz)"; return 0; fi
  done
  return 1
}
hedef_yerel_mi() {
  local h="$1" d="${2:-0}" ad tur uzak u p k satirlar=""
  local -a parcalar=() liste=()
  [ "$d" -le 5 ] || { YEREL_NEDEN="iç içe uzak adı çok derin"; return 0; }
  case "$h" in
    /*|./*|../*|\~*|.|..) YEREL_NEDEN="yerel yol"; return 0 ;;
    :*)  # bağlantı dizesi  :tür,seçenekler:yol
      mapfile -t parcalar < <(bag_secenekleri "$h")
      tur="${parcalar[0]:-}"
      case "$tur" in
        '') YEREL_NEDEN="bağlantı dizesinde tür belirlenemedi"; return 0 ;;
        local|alias|crypt|compress|chunker|hasher|cache|union|combine) YEREL_NEDEN="yerel veya sarmalayıcı tür ($tur)"; return 0 ;;
      esac
      case "$UZAK_TURLERI" in *" $tur "*) ;; *) YEREL_NEDEN="tür ($tur) sunucu dışı tür izin listesinde değil"; return 0 ;; esac
      for p in ${parcalar[@]+"${parcalar[@]:1}"}; do
        k="${p%%=*}"; k="${k,,}"
        case " $BELIRSIZ_ANAHTARLAR $ADRES_ANAHTARLARI " in *" $k "*) satirlar+="$k"$'\t'"${p#*=}"$'\n' ;; esac
      done
      if ssh_dolu_mu <<<"$satirlar"; then return 0; fi
      case "$AG_TURLERI" in *" $tur "*) HEDEF_AG_FS=1 ;; esac   # (yerel sayılsa bile işaretlenir: izin kaçışında da --download)
      if adaylar_yerel_mi <<<"$satirlar"; then return 0; fi
      return 1 ;;
    *:*) ad="${h%%:*}" ;;
    *)   YEREL_NEDEN="yerel yol"; return 0 ;;   # ":" yok: rclone bunu yerel yol sayar
  esac
  if [[ "$ad" == *,* ]]; then
    YEREL_NEDEN="adlandırılmış uzak ad bağlantı dizesi seçenekleri içeriyor (seçenekler ayarı geçersiz kılar; belirsiz sayıldı)"
    return 0
  fi
  tur=$(rclone_tur "$ad")
  case "$tur" in
    '') YEREL_NEDEN="uzak türü belirlenemedi (ad listremotes'ta yok veya listremotes hata verdi)"; return 0 ;;
    local) YEREL_NEDEN="rclone local türü"; return 0 ;;
    alias|crypt|compress|chunker|hasher|cache)
      uzak=$(rclone_alan "$ad" remote)
      [ -n "$uzak" ] || { YEREL_NEDEN="$tur uzağının remote değeri okunamadı"; return 0; }
      hedef_yerel_mi "$uzak" $((d + 1)); return $? ;;
    union|combine)
      uzak=$(rclone_alan "$ad" upstreams)
      [ -n "$uzak" ] || { YEREL_NEDEN="$tur uzağının upstreams değeri okunamadı"; return 0; }
      mapfile -t liste < <(bosluk_ayir "$uzak")
      [ "${#liste[@]}" -gt 0 ] || { YEREL_NEDEN="$tur upstreams ayrıştırılamadı"; return 0; }
      for u in "${liste[@]}"; do
        # combine: "dizin=uzak:yol" (yalnızca ":" , "," ve tırnak içermeyen bir ön ek varsa)
        if [ "$tur" = "combine" ] && [[ "$u" =~ ^[^:,=\"\']+= ]]; then u="${u#*=}"; fi
        if hedef_yerel_mi "$u" $((d + 1)); then return 0; fi
      done
      return 1 ;;
    *)  # ağ/bulut türü: host/endpoint/url... bu makineyi gösteriyor mu?
      case "$UZAK_TURLERI" in *" $tur "*) ;; *) YEREL_NEDEN="tür ($tur) sunucu dışı tür izin listesinde değil"; return 0 ;; esac
      case "$AG_TURLERI" in *" $tur "*) HEDEF_AG_FS=1 ;; esac
      satirlar=$(rclone_alanlar "$ad" $BELIRSIZ_ANAHTARLAR $ADRES_ANAHTARLARI)
      if ssh_dolu_mu <<<"$satirlar"; then return 0; fi
      if adaylar_yerel_mi <<<"$satirlar"; then return 0; fi
      return 1 ;;
  esac
}
YEREL_HEDEF=0     # 1: hedef yerel/belirsiz -> kopyalanır, silme YOK (onay bunu aşamaz)
ONAYSIZ=0         # 1: hedef sunucu dışı görünüyor ama .env'de açıkça onaylanmadı -> kopyalanır/doğrulanır, silme YOK
ONAY_DEGERI="${YEDEK_UZAK_ONAYLI_HEDEF:-}"
IZIN_DEGERI="${YEDEK_YEREL_HEDEF_IZIN:-}"
# Onay yalnızca HEDEF_AD ile BİREBİR aynı değerle geçerlidir. "(yerel-yol)" ve bağlantı dizesi hedefleri ("(adsız)",
# ":tür,...:yol") asla onaylanamaz: tek bir onay tüm adsız hedefleri kapsamasın ve kimlik bilgisi `ps`te görünen
# bağlantı dizesi yolu teşvik edilmesin. Silme için `rclone config` ile adlandırılmış bir uzak gerekir.
ad_onayli_mi() { case "$HEDEF_AD" in ''|'(yerel-yol)'|'(adsız)') return 1 ;; esac; [ "$1" = "$HEDEF_AD" ]; }

# Bağlantı dizesinde (":tür,seçenek=değer:yol" / "ad,seçenek=değer:yol") kimlik bilgisi varsa `ps` ile herkes görür.
case "$HEDEF" in
  :*|*,*)
    case "${HEDEF,,}" in
      *pass=*|*password*|*key=*|*secret*|*token*|*account_key*|*sas_url*|*service_account_credentials*|*credential*)
        echo "UYARI: YEDEK_UZAK_HEDEF bağlantı dizesi kimlik bilgisi içeriyor olabilir (pass/key/secret/token/sas_url/...)."
        echo "       Komut satırındaki değerler 'ps' ile diğer kullanıcılara görünür. Kimlik bilgilerini 'rclone config' ayar dosyasına yazın, bağlantı dizesine değil."
        ;;
    esac ;;
esac

if hedef_yerel_mi "$HEDEF"; then
  if ad_onayli_mi "$IZIN_DEGERI"; then
    echo "################################################################################"
    echo " UYARI: YEDEK_YEREL_HEDEF_IZIN=$HEDEF_AD KULLANILDI"
    echo " Yerel/belirsiz bir hedef SUNUCU DIŞI gibi işlenecek; eski yerel yedekler SİLİNEBİLİR."
    echo " Neden yerel sayıldığı: $YEREL_NEDEN"
    echo " Bu YALNIZCA DENEME içindir; üretimde KULLANMAYIN. Hedef gerçekten başka makinede değilse yedek kaybedebilirsiniz."
    echo "################################################################################"
    mkdir -p "$DIZIN"
    gunluge "YEREL HEDEF İZNİ KULLANILDI: $HEDEF_AD"
  else
    YEREL_HEDEF=1
    echo "UYARI: YEDEK_UZAK_HEDEF ($HEDEF_AD) bu sunucudaki bir klasör/adres görünüyor veya sunucu dışı olduğu güvenle belirlenemedi; sunucu dışı SAYILMADI."
    echo "       Neden: $YEREL_NEDEN"
    echo "       Dosyalar kopyalanır ama HİÇBİR yerel yedek silinmez ve panel uyarısı sürer. Gerçek bir uzak hedef (B2, SFTP, S3...) tanımlayın."
    [ -z "$IZIN_DEGERI" ] || echo "       (YEDEK_YEREL_HEDEF_IZIN değeri hedef adıyla ($HEDEF_AD) birebir aynı değil; '1' artık yetmez, kaçış uygulanmadı.)"
  fi
elif ! ad_onayli_mi "$ONAY_DEGERI"; then
  ONAYSIZ=1
  echo "UYARI: hedef sunucu dışı olarak onaylanmadı ($HEDEF_AD); onaylamak için .env'e YEDEK_UZAK_ONAYLI_HEDEF=$HEDEF_AD ekleyin"
  echo "       (yalnızca hedef gerçekten başka bir makinede/bulutta ise). Dosyalar kopyalanır ve doğrulanır ama HİÇBİR yerel yedek silinmez; panel uyarısı sürer."
fi

DESENLER=(--include 'db-*.dump.age' --include 'medya-*.tar.gz.age' --include 'sha256-*.txt')

# Eski sürümlerden kalan ŞİFRESİZ yedekler: yüklenmez, otomatik silinmez; kullanıcı uyarılır.
DUZ_SAYI=$(find "$DIZIN" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'medya-*.tar.gz' \) | wc -l | tr -d ' ')
if [ "$DUZ_SAYI" != "0" ]; then
  echo "UYARI: $DUZ_SAYI şifresiz eski yedek dosyası var (db-*.dump / medya-*.tar.gz). Bunlar uzağa kopyalanmaz ve otomatik silinmez; docs/YEDEKLEME.md bölümüne bakın."
fi

# 1) Kopyala (uzak taraftaki dosyaları SİLMEZ; uzak saklama süresini sağlayıcıda yaşam döngüsü kuralıyla ayarlayın).
rc copy "$DIZIN" "$HEDEF" "${DESENLER[@]}"
# 2) Doğrula: yerel her dosya uzakta var mı ve aynı mı? (--combined: "= ad" aynı, "+ ad" uzakta yok, "* ad" farklı, "! ad" hata)
# Karar AÇIK SORGUYA dayanır: `rclone backend features` ile yerel ve uzak tarafın ortak bir özeti (hash) var mı bakılır.
# Ortak özet yoksa rclone check yalnızca BOYUT karşılaştırır (çıkış kodu 0); bu silme için yetersizdir -> --download.
#   - Sorgu başarısız/boş/belirsizse, hedef ağ dosya sistemi türündeyse (sftp, ftp, smb, webdav, http: özet sunucu kabuğuna
#     bağlı olduğundan features yanıltabilir; gerçek rclone ile denendi) veya YEDEK_UZAK_INDIREREK=1 ise doğrudan --download.
#   - Aksi hâlde özetle denenir; rclone günlüğündeki "No common hash found" / "hashes could not be checked" metni YEDEK
#     tetiktir (tüm RCLONE_* ortamı temizlidir ve --log-level NOTICE verilir).
# Ağ maliyeti: --download yalnızca silinmeye aday eski üçlüler + en yeni tam üçlü için yapılır (--files-from);
# kapsam dışı dosyalar "doğrulandı" sayılmaz, dolayısıyla silinmez (yalnızca doğrulananlar silinir).
KOMBINE=$(mktemp)
CHECK_CIKTI=$(mktemp)
KAPSAM=$(mktemp)
trap 'rm -f "$KOMBINE" "$CHECK_CIKTI" "$KAPSAM"' EXIT
YONTEM="ozet"
TIMEOUT=(); command -v timeout >/dev/null 2>&1 && TIMEOUT=(timeout 180)

# $1 = "tum" (tüm desenler) | "kapsam" (yalnızca KAPSAM dosyasındaki adlar); $2... = ek bayraklar.
# Sonucu CHECK_TAMAM'a yazar; rclone'un tanı çıktısı ekrana da basılır.
dogrula() {
  local kapsam="$1"; shift
  local -a filtre=("${DESENLER[@]}")
  [ "$kapsam" = "kapsam" ] && filtre=(--files-from "$KAPSAM")
  : > "$KOMBINE"
  if rc check "$DIZIN" "$HEDEF" --one-way --log-level NOTICE "${filtre[@]}" "$@" --combined "$KOMBINE" 2> "$CHECK_CIKTI"; then CHECK_TAMAM=1; else CHECK_TAMAM=0; fi
  cat "$CHECK_CIKTI" >&2
}

# `rclone backend features HEDEF` JSON'undaki "Hashes" listesi (satır başına bir özet). Başarısızsa 1 döner.
ozet_listesi() {
  local c
  c=$(${TIMEOUT[@]+"${TIMEOUT[@]}"} "${RCLONE_ORTAM[@]}" "${RCLONE[@]}" backend features "$1" 2>/dev/null) || return 1
  awk '/"Hashes"/ { if ($0 ~ /\[[ \t]*\]/) exit; if ($0 ~ /\[/) ic = 1; next }
       ic && /\]/ { exit }
       ic { gsub(/[ \t",]/, ""); if ($0 != "") print }' <<<"$c"
}
ortak_ozet_var_mi() {
  local yerel uzak h
  yerel=$(ozet_listesi "$DIZIN") || return 1
  uzak=$(ozet_listesi "$HEDEF") || return 1
  [ -n "$yerel" ] && [ -n "$uzak" ] || return 1
  while IFS= read -r h; do
    if grep -qxF -- "$h" <<<"$yerel"; then return 0; fi
  done <<<"$uzak"
  return 1
}

# Silmeye aday eski üçlüler + en yeni TAM üçlünün dosya adlarını KAPSAM'a yazar (silme adımıyla AYNI kurallar).
kapsam_yaz() {
  local -a zl=()
  local z i en_yeni="" sinir f ok eski az
  : > "$KAPSAM"
  mapfile -t zl < <(find "$DIZIN" -maxdepth 1 -type f \( -name 'db-*.dump.age' -o -name 'medya-*.tar.gz.age' -o -name 'sha256-*.txt' \) -printf '%f\n' \
    | sed -n 's/^\(db-\([0-9]\{8\}-[0-9]\{6\}\)\.dump\.age\|medya-\([0-9]\{8\}-[0-9]\{6\}\)\.tar\.gz\.age\|sha256-\([0-9]\{8\}-[0-9]\{6\}\)\.txt\)$/\2\3\4/p' | sort -u)
  for ((i = ${#zl[@]} - 1; i >= 0; i--)); do
    z="${zl[$i]}"
    if [ -f "$DIZIN/db-$z.dump.age" ] && [ -f "$DIZIN/medya-$z.tar.gz.age" ] && [ -f "$DIZIN/sha256-$z.txt" ]; then en_yeni="$z"; break; fi
  done
  sinir=$(( $(date +%s) - SAKLAMA_GUN * 86400 ))
  for z in ${zl[@]+"${zl[@]}"}; do
    ok=1
    for f in "db-$z.dump.age" "medya-$z.tar.gz.age" "sha256-$z.txt"; do [ -f "$DIZIN/$f" ] || ok=0; done
    [ "$ok" = "1" ] || continue
    if [ "$z" != "$en_yeni" ]; then
      az=$(date -d "${z:0:4}-${z:4:2}-${z:6:2} ${z:9:2}:${z:11:2}:${z:13:2}" +%s 2>/dev/null) || continue
      eski=1
      for f in "db-$z.dump.age" "medya-$z.tar.gz.age" "sha256-$z.txt"; do
        [ "$az" -lt "$sinir" ] && [ "$(stat -c %Y "$DIZIN/$f")" -lt "$sinir" ] || eski=0
      done
      [ "$eski" = "1" ] || continue
    fi
    printf '%s\n' "db-$z.dump.age" "medya-$z.tar.gz.age" "sha256-$z.txt" >> "$KAPSAM"
  done
}

# $1 = gerekçe. Kapsamlı (--files-from) indirerek doğrulama; başarısızsa hiçbir şey doğrulanmış sayılmaz.
indirerek_kapsamli() {
  YONTEM="indirerek-ozet-yok"
  echo "UYARI: $1."
  echo "       rclone check yalnızca BOYUT karşılaştırabilir; bu, silme için yeterli sayılmaz."
  kapsam_yaz
  if [ ! -s "$KAPSAM" ]; then
    CHECK_TAMAM=1; : > "$KOMBINE"
    echo "       Doğrulanacak tam yerel üçlü yok; hiçbir dosya 'doğrulandı' sayılmadı."
    return 0
  fi
  echo "       Otomatik olarak $(wc -l < "$KAPSAM" | tr -d ' ') dosya (silinmeye aday eski üçlüler + en yeni üçlü) indirilip birebir karşılaştırılıyor (--download; ağ trafiği harcar)."
  dogrula kapsam --download
  if [ "$CHECK_TAMAM" != "1" ]; then
    echo "UYARI: indirerek doğrulama da BAŞARISIZ oldu; bu çalıştırmada hiçbir yerel yedek silinmeyecek."
    : > "$KOMBINE"
  fi
}

if [ "$YEREL_HEDEF" = "1" ]; then
  # Yerel/belirsiz hedef: hiçbir şey silinmeyecek ve "doğrulandı" sayılmayacak; ağ trafiği harcayan --download gereksiz.
  YONTEM="yerel-hedef"
  dogrula tum
elif [ "${YEDEK_UZAK_INDIREREK:-0}" = "1" ]; then
  YONTEM="indirerek"
  dogrula tum --download
elif [ "$HEDEF_AG_FS" = "1" ]; then
  indirerek_kapsamli "hedef ağ dosya sistemi türünde (sftp/ftp/smb/webdav/http); ortak özet (hash) desteği sunucuya bağlıdır ve rclone'un özellik bilgisi buna güvenilmez, bu yüzden özet güvenilmez sayıldı"
elif ! ortak_ozet_var_mi; then
  indirerek_kapsamli "ortak özet (hash) sorgusu (rclone backend features) başarısız/boş/belirsiz; özet yok sayıldı"
else
  dogrula tum
  # Yedek tetik: günlük metni (ortak özet yoksa rclone yalnızca boyut karşılaştırır ve çıkış kodu 0 verir).
  if grep -qiE 'no common hash|hashes could not be checked|no hashes in common' "$CHECK_CIKTI"; then
    indirerek_kapsamli "bu uzak hedefle ortak özet (hash) yok (rclone günlüğünden anlaşıldı)"
  fi
fi
[ "$CHECK_TAMAM" = "1" ] || echo "UYARI: bazı dosyalar uzakta doğrulanamadı (ayrıntı aşağıda)."
mapfile -t DOGRULANAN < <(sed -n 's/^= //p' "$KOMBINE" | grep -E '^(db-[0-9]{8}-[0-9]{6}\.dump\.age|medya-[0-9]{8}-[0-9]{6}\.tar\.gz\.age|sha256-[0-9]{8}-[0-9]{6}\.txt)$' | sort || true)
sed -n 's/^\([-+*!]\) /  doğrulanamadı (\1): /p' "$KOMBINE" || true

# 3) Doğrulama kaydı. "zaman" = EN YENİ TAM yerel üçlünün (db+medya+sha256) üç dosyasının da uzakta doğrulandığı son an.
# Kapsamlı --download yalnızca silme adayları + en yeni tam üçlüyü kapsar; "zaman" bu yüzden tüm dosyalara değil, en yeni tam
# üçlünün doğrulanmasına bağlıdır. Doğrulanmadıysa (ya da tam üçlü yoksa) önceki başarılı zaman korunur.
mapfile -t ZAMANLAR < <(find "$DIZIN" -maxdepth 1 -type f \( -name 'db-*.dump.age' -o -name 'medya-*.tar.gz.age' -o -name 'sha256-*.txt' \) -printf '%f\n' \
  | sed -n 's/^\(db-\([0-9]\{8\}-[0-9]\{6\}\)\.dump\.age\|medya-\([0-9]\{8\}-[0-9]\{6\}\)\.tar\.gz\.age\|sha256-\([0-9]\{8\}-[0-9]\{6\}\)\.txt\)$/\2\3\4/p' | sort -u)
# EN_YENI: üçlüsü (db+medya+sha256) yerelde TAM olan en yeni ZAMAN. Yetim bir ZAMAN (ör. sha256'sı olmayan yarım
# db dosyası) en yeni sayılmaz; aksi hâlde son tam üçlü korumasız kalıp silinebilirdi.
EN_YENI=""
for ((i = ${#ZAMANLAR[@]} - 1; i >= 0; i--)); do
  Z="${ZAMANLAR[$i]}"
  if [ -f "$DIZIN/db-$Z.dump.age" ] && [ -f "$DIZIN/medya-$Z.tar.gz.age" ] && [ -f "$DIZIN/sha256-$Z.txt" ]; then EN_YENI="$Z"; break; fi
done
ONCEKI_ZAMAN=""
[ -f "$DOGRULAMA" ] && ONCEKI_ZAMAN=$(sed -n 's/^ *"zaman": *"\([^"]*\)".*/\1/p' "$DOGRULAMA" | head -1 || true)
SIMDI=$(date -Iseconds)
en_yeni_dogrulandi_mi() {
  [ -n "$EN_YENI" ] || return 1
  printf '%s\n' ${DOGRULANAN[@]+"${DOGRULANAN[@]}"} | grep -qxF -- "db-$EN_YENI.dump.age" \
    && printf '%s\n' ${DOGRULANAN[@]+"${DOGRULANAN[@]}"} | grep -qxF -- "medya-$EN_YENI.tar.gz.age" \
    && printf '%s\n' ${DOGRULANAN[@]+"${DOGRULANAN[@]}"} | grep -qxF -- "sha256-$EN_YENI.txt"
}
if [ "$YEREL_HEDEF" = "1" ]; then ZAMAN_DEGERI="null"; DOGRULANAN=()   # yerel hedef sunucu dışı sayılmaz
elif [ "$ONAYSIZ" = "1" ]; then ZAMAN_DEGERI="null"   # doğrulandı ama onaylanmadı: panel uyarısı sürsün (zaman boş); dosya listesi korunur
elif en_yeni_dogrulandi_mi; then ZAMAN_DEGERI="\"$(json_kacis "$SIMDI")\""
elif [ -n "$ONCEKI_ZAMAN" ]; then ZAMAN_DEGERI="\"$(json_kacis "$ONCEKI_ZAMAN")\""
else ZAMAN_DEGERI="null"; fi
LISTE=""
for ad in ${DOGRULANAN[@]+"${DOGRULANAN[@]}"}; do LISTE+="${LISTE:+, }\"$ad\""; done
( umask 077
  NOT=""; [ "$YEREL_HEDEF" = "1" ] && NOT="yerel hedef, sunucu dışı sayılmadı"
  [ "$ONAYSIZ" = "1" ] && NOT="sunucu dışı kopya doğrulandı ama onaylanmadı (YEDEK_UZAK_ONAYLI_HEDEF)"
  printf '{\n  "zaman": %s,\n  "son_deneme": "%s",\n  "hedef": "%s",\n  "yontem": "%s",\n  "not": "%s",\n  "dogrulanan": [%s]\n}\n' \
    "$ZAMAN_DEGERI" "$(json_kacis "$SIMDI")" "$(json_kacis "$HEDEF_AD")" "$(json_kacis "$YONTEM")" "$(json_kacis "$NOT")" "$LISTE" > "$DOGRULAMA.tmp" && mv "$DOGRULAMA.tmp" "$DOGRULAMA" )
if [ "$YEREL_HEDEF" = "1" ]; then
  gunluge "dışarı kopyalama: yerel hedef, sunucu dışı sayılmadı → $HEDEF_AD; yerel yedek SİLİNMEDİ"
  echo "Yerel hedef nedeniyle silme yapılmadı."
  exit 0
fi
if [ "$ONAYSIZ" = "1" ]; then
  gunluge "dışarı kopyalama: ${#DOGRULANAN[@]} dosya uzakta doğrulandı ($YONTEM) → $HEDEF_AD; hedef sunucu dışı olarak onaylanmadı; onaylamak için .env'e YEDEK_UZAK_ONAYLI_HEDEF=$HEDEF_AD ekleyin; yerel yedek SİLİNMEDİ"
  echo "Onay olmadığı için silme yapılmadı."
  exit 0
fi
gunluge "dışarı kopyalama: ${#DOGRULANAN[@]} dosya uzakta doğrulandı ($YONTEM) → $HEDEF_AD"

dogrulandi_mi() { printf '%s\n' ${DOGRULANAN[@]+"${DOGRULANAN[@]}"} | grep -qxF -- "$1"; }

# 4) Silme: yalnızca saklama süresinden eski + üçlünün tamamı uzakta doğrulanmış + en yeni değil.
if [ "${#ZAMANLAR[@]}" -eq 0 ]; then echo "Yerel yedek yok; silinecek bir şey yok."; exit 0; fi
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
