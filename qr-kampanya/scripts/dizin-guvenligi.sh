#!/usr/bin/env bash
# Yedek dizini güvenliği için ortak işlevler. YALNIZCA işlev tanımlar; `. scripts/dizin-guvenligi.sh` ile yüklenir.
#
# Neden: yedek dizini (YEDEK_DIZINI, varsayılan ./yedekler; sahibi 10002, kip 700) yedek konteynerine yazılabilir. Ele
# geçirilmiş bir konteyner oraya sembolik bağlantı bırakabilir; host'ta ROOT çalışan betikler dizine root olarak yazarsa
# bağlantıyı izler. Bu yüzden dizine yazma dizinin SAHİBİ olarak (setpriv ile yetkiler düşürülerek) yapılır.
#
#   guvenli_dizin_hazirla YOL : YOL'u realpath -e ile çözer (sembolik bağlantılı dizin gerçek hedefe çözülür), global DIZIN'e
#                               ve DIZIN_SAHIBI'ne (uid:gid, ÇÖZÜLMÜŞ yoldan) yazar. Dizin değilse ya da root'a ait olup
#                               grup/diğerlerine yazılabilirse (konteyner yazabilir sayılır) 1 döner; hiçbir şey silmez.
#   sahip_olarak KOMUT...     : root değilsek ya da dizin sahibi root ise doğrudan, değilse sahibe düşerek çalıştırır.
#   eski_cron_satirlari YOL   : root crontab'ında disari-kopyala.sh çıktısını yedek dizinine yönlendiren satırları yazar;
#                               bulursa 0, bulamazsa (ya da crontab komutu yoksa) 1 döner.

guvenli_dizin_hazirla() {
  local yol="$1" cozulen
  cozulen=$(realpath -e -- "$yol" 2>/dev/null) || cozulen=""
  if [ -z "$cozulen" ] || [ ! -d "$cozulen" ]; then
    echo "HATA: yedek dizini yok ya da dizin değil: $yol. Hiçbir şey yazılmadı, HİÇBİR yerel yedek silinmedi." >&2
    return 1
  fi
  DIZIN="$cozulen"
  DIZIN_SAHIBI=$(stat -c '%u:%g' -- "$DIZIN")
  if [ "${DIZIN_SAHIBI%%:*}" = "0" ] && [ -n "$(find "$DIZIN" -maxdepth 0 -perm /022 2>/dev/null)" ]; then
    echo "HATA: yedek dizini ($DIZIN) root'a ait ama grup ya da diğer kullanıcılara yazılabilir; yedek konteyneri (UID 10002) oraya sembolik bağlantı bırakabilir." >&2
    echo "      Hiçbir şey yazılmadı ve HİÇBİR yerel yedek silinmedi. Düzeltmek için: sudo bash scripts/yedek-dizini-hazirla.sh (ya da sudo chmod go-w '$DIZIN')." >&2
    return 1
  fi
  return 0
}

sahip_olarak() {
  local uid="${DIZIN_SAHIBI%%:*}" gid="${DIZIN_SAHIBI##*:}"
  if [ "$(id -u)" != "0" ] || [ -z "${DIZIN_SAHIBI:-}" ] || [ "$uid" = "0" ]; then "$@"
  else setpriv --reuid="$uid" --regid="$gid" --clear-groups -- "$@"; fi
}

eski_cron_satirlari() {
  local ham="${1:-./yedekler}" cozulen satir h a eslesti sonuc=1
  local -a mutlak=() goreli=("yedekler" "./yedekler")
  command -v crontab >/dev/null 2>&1 || return 1
  cozulen=$(realpath -e -- "$ham" 2>/dev/null || true)
  [ -z "$cozulen" ] || mutlak+=("$cozulen")
  mutlak+=("$PWD/yedekler")
  case "$ham" in
    /*) mutlak+=("${ham%/}") ;;
    *)  goreli+=("${ham%/}" "${ham#./}"); mutlak+=("$PWD/${ham#./}") ;;
  esac
  while IFS= read -r satir; do
    case "$satir" in ''|'#'*|[[:space:]]'#'*) continue ;; esac
    case "$satir" in *disari-kopyala*) ;; *) continue ;; esac
    eslesti=1
    while IFS= read -r h; do
      [ -n "$h" ] || continue
      for a in "${mutlak[@]}" "${goreli[@]}"; do
        case "$h" in "$a"/*) eslesti=0 ;; esac
      done
    done < <(printf '%s\n' "$satir" | grep -oE '(>>?|tee( -a)?)[[:space:]]*[^[:space:];|&<>]+' \
               | sed -E "s/^(>>?|tee( -a)?)[[:space:]]*//; s/^[\"']//; s/[\"']\$//" || true)
    if [ "$eslesti" = "0" ]; then printf '%s\n' "$satir"; sonuc=0; fi
  done < <(crontab -l 2>/dev/null || true)
  return "$sonuc"
}
