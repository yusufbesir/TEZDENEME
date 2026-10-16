#!/usr/bin/env bash
# Skill kütüphanesinden skill etkinleştirme/kapatma aracı.
set -euo pipefail

KOK="$(cd "$(dirname "$0")/.." && pwd)"
KUTUPHANE="$KOK/skill-kutuphanesi"
HEDEF="$KOK/.claude/skills"
KILIT="$KOK/docs/skill-kaynaklari/kaynak-kilidi.json"
OZET="$KOK/docs/skill-kaynaklari/icerik-ozeti.sha256"
YERLESIK=(code-review simplify init security-review loop run claude-api review help config doctor)

kullanim() {
  cat <<'USG'
Kullanım:
  skill-etkinlestir.sh <ad>               Skill'i etkinleştirir (.claude/skills/<ad>)
  skill-etkinlestir.sh <sahip__depo>/<ad> Belirsiz adı depo belirterek etkinleştirir
  skill-etkinlestir.sh --kapat <ad>       Kütüphaneden etkinleştirilmiş skill'i siler
  skill-etkinlestir.sh --ara <kelime>     INDEKS.md içinde arar (büyük/küçük harf duyarsız)
  skill-etkinlestir.sh --liste            Etkinleştirilmiş skill'leri listeler
  skill-etkinlestir.sh -h                 Bu yardımı gösterir
USG
}

hata() { echo "Hata: $*" >&2; exit 1; }

# Tek bir yol bileşeni geçerli mi (boş, ., .., ayırıcı içermemeli)
gecerli_parca() {
  local p="$1"
  [[ -n "$p" && "$p" != "." && "$p" != ".." && "$p" != *"/"* && "$p" != *"\\"* && "$p" != *".."* ]]
}

yerlesik_mi() {
  local y
  for y in "${YERLESIK[@]}"; do [[ "$y" == "$1" ]] && return 0; done
  return 1
}

# Kaynak kilidini doğrular: depo kilitte ve tam_commit dolu olmalı; skill klasöründeki
# her dosya icerik-ozeti.sha256 içinde listeli ve özeti eşleşmeli; listelenmemiş dosya olmamalı.
kilit_dogrula() {
  local rel="$1" depo="${1%%/*}" onek="skill-kutuphanesi/$1/"
  [[ -f "$KILIT" ]] || hata "Kaynak kilidi bulunamadı: $KILIT"
  [[ -f "$OZET" ]] || hata "İçerik özeti bulunamadı: $OZET"

  local tam
  tam="$(awk -v h="\"hedef\": \"skill-kutuphanesi/$depo\"" '
    index($0, h) { bulundu = 1; next }
    bulundu && /"tam_commit"/ { print; exit }
    bulundu && /^[ \t]*}/ { exit }' "$KILIT")"
  [[ -n "$tam" ]] || hata "'$depo' kaynak kilidinde (kaynak-kilidi.json) kayıtlı değil; etkinleştirilmedi."
  [[ "$tam" =~ \"tam_commit\":[[:space:]]*\"[0-9a-f]{40}\" ]] \
    || hata "'$depo' için kilitte geçerli tam_commit yok (null); etkinleştirilmedi."

  local liste gercek f
  liste="$(tr -d '\r' < "$OZET" | awk -v p="$onek" 'substr($0, 67, length(p)) == p')"
  gercek="$(cd "$KOK" && find "skill-kutuphanesi/$rel" \( -type f -o -type l \) | LC_ALL=C sort)"
  [[ -n "$gercek" ]] || hata "'$rel' içinde dosya yok."
  while IFS= read -r f; do
    [[ -n "$f" ]] || continue
    grep -q -F -x -- "$f" <<< "$(cut -c 67- <<< "$liste")" \
      || hata "Dosya içerik özetinde listelenmemiş (fazladan/izinsiz dosya): $f"
  done <<< "$gercek"
  while IFS= read -r f; do
    [[ -n "$f" ]] || continue
    grep -q -F -x -- "$f" <<< "$gercek" \
      || hata "Özette listeli dosya diskte yok: $f"
  done <<< "$(cut -c 67- <<< "$liste")"

  local sonuc
  if ! sonuc="$(cd "$KOK" && sha256sum -c <<< "$liste" 2>&1)"; then
    f="$(grep -v ': OK$' <<< "$sonuc" | head -n1)"
    hata "İçerik özeti uyuşmuyor, dosya değiştirilmiş: ${f%%:*}"
  fi
}

etkinlestir() {
  local girdi="$1" ad sahip="" kaynaklar=() k
  if [[ "$girdi" == */* ]]; then
    sahip="${girdi%%/*}"; ad="${girdi#*/}"
    gecerli_parca "$sahip" || hata "Geçersiz depo adı: '$sahip'"
  else
    ad="$girdi"
  fi
  gecerli_parca "$ad" || hata "Geçersiz skill adı: '$girdi'"

  if yerlesik_mi "$ad"; then
    echo "Uyarı: '$ad' Claude Code yerleşik komutlarıyla çakışıyor; etkinleştirilmedi." >&2
    exit 1
  fi

  if [[ -n "$sahip" ]]; then
    [[ -f "$KUTUPHANE/$sahip/$ad/SKILL.md" ]] && kaynaklar=("$sahip/$ad")
  else
    for k in "$KUTUPHANE"/*/"$ad"/SKILL.md; do
      [[ -f "$k" ]] || continue
      k="${k#"$KUTUPHANE"/}"
      kaynaklar+=("${k%/SKILL.md}")
    done
  fi

  if [[ ${#kaynaklar[@]} -eq 0 ]]; then
    hata "'$girdi' kütüphanede bulunamadı."
  elif [[ ${#kaynaklar[@]} -gt 1 ]]; then
    echo "Hata: '$ad' birden fazla depoda bulundu:" >&2
    for k in "${kaynaklar[@]}"; do echo "  - ${k%/*}" >&2; done
    echo "Lütfen <sahip__depo>/$ad biçiminde belirtin." >&2
    exit 1
  fi

  local rel="${kaynaklar[0]}"
  if [[ -e "$HEDEF/$ad" || -L "$HEDEF/$ad" ]]; then
    hata "'$HEDEF/$ad' zaten var; üzerine yazılmadı."
  fi

  kilit_dogrula "$rel"

  mkdir -p "$HEDEF"
  cp -R "$KUTUPHANE/$rel" "$HEDEF/$ad"
  printf '%s\n' "skill-kutuphanesi/$rel" > "$HEDEF/$ad/.kaynak"
  echo "Etkinleştirildi: $ad (kaynak: skill-kutuphanesi/$rel)"
}

kapat() {
  local ad="$1"
  gecerli_parca "$ad" || hata "Geçersiz skill adı: '$ad'"
  local d="$HEDEF/$ad"
  [[ -d "$d" && ! -L "$d" ]] || hata "'$ad' etkin değil."
  [[ -f "$d/.kaynak" ]] || hata "'$ad' kütüphaneden etkinleştirilmemiş (.kaynak yok); silinmedi."
  rm -rf -- "$d"
  echo "Kapatıldı: $ad"
}

ara() {
  local idx="$KUTUPHANE/INDEKS.md"
  [[ -f "$idx" ]] || hata "INDEKS.md bulunamadı: $idx"
  grep -i -F -- "$1" "$idx" || { echo "Eşleşme yok: $1" >&2; return 0; }
}

liste() {
  local f
  [[ -d "$HEDEF" ]] || { echo "Etkinleştirilmiş skill yok."; return 0; }
  local say=0
  for f in "$HEDEF"/*/.kaynak; do
    [[ -f "$f" ]] || continue
    echo "$(basename "$(dirname "$f")")  <-  $(head -n1 "$f")"
    say=$((say+1))
  done
  [[ $say -gt 0 ]] || echo "Etkinleştirilmiş skill yok."
}

case "${1:-}" in
  ""|-h|--help) kullanim ;;
  --kapat) [[ $# -eq 2 ]] || { kullanim >&2; exit 1; }; kapat "$2" ;;
  --ara)   [[ $# -eq 2 && -n "$2" ]] || { kullanim >&2; exit 1; }; ara "$2" ;;
  --liste) liste ;;
  -*) echo "Bilinmeyen seçenek: $1" >&2; kullanim >&2; exit 1 ;;
  *) [[ $# -eq 1 ]] || { kullanim >&2; exit 1; }; etkinlestir "$1" ;;
esac
