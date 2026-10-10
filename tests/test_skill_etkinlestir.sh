#!/usr/bin/env bash
# skill-etkinlestir.sh testi: geçici sahte kökte çalışır, gerçek depoya dokunmaz.
set -uo pipefail
GERCEK="$(cd "$(dirname "$0")/.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/scripts"; cp "$GERCEK/scripts/skill-etkinlestir.sh" "$T/scripts/"
S="$T/scripts/skill-etkinlestir.sh"
L="$T/skill-kutuphanesi"
for d in a__x/tekil a__x/ortak b__y/ortak a__x/loop; do mkdir -p "$L/$d"; echo "# s" > "$L/$d/SKILL.md"; done
echo "extra" > "$L/a__x/tekil/ek.txt"
printf '# Dizin\nObsidian notları\nbaşka satır\n' > "$L/INDEKS.md"

BAS=0; HAT=0
kontrol() { # ad beklenen_cikis cikti_deseni -- komut...
  local ad="$1" bek="$2" des="$3"; shift 4
  local out rc; out="$("$@" 2>&1)"; rc=$?
  if [[ $rc -eq $bek && "$out" == *$des* ]]; then BAS=$((BAS+1)); echo "GEÇTİ: $ad"
  else HAT=$((HAT+1)); echo "KALDI: $ad (çıkış=$rc) $out"; fi
}
var() { [[ -e "$1" ]] && { BAS=$((BAS+1)); echo "GEÇTİ: var $2"; } || { HAT=$((HAT+1)); echo "KALDI: var $2"; }; }
yok() { [[ ! -e "$1" ]] && { BAS=$((BAS+1)); echo "GEÇTİ: yok $2"; } || { HAT=$((HAT+1)); echo "KALDI: yok $2"; }; }

kontrol "kullanım" 0 "Kullanım" -- "$S"
kontrol "-h" 0 "Kullanım" -- "$S" -h
kontrol "etkinleştir" 0 "Etkinleştirildi" -- "$S" tekil
var "$T/.claude/skills/tekil/SKILL.md" "SKILL.md kopyası"
var "$T/.claude/skills/tekil/ek.txt" "ek dosya"
[[ "$(cat "$T/.claude/skills/tekil/.kaynak")" == "skill-kutuphanesi/a__x/tekil" ]] && { BAS=$((BAS+1)); echo "GEÇTİ: .kaynak içeriği"; } || { HAT=$((HAT+1)); echo "KALDI: .kaynak içeriği"; }
kontrol "mevcut reddi" 1 "zaten var" -- "$S" tekil
kontrol "bulunamadı" 1 "bulunamadı" -- "$S" yokboyle
kontrol "belirsiz" 1 "b__y" -- "$S" ortak
yok "$T/.claude/skills/ortak" "belirsiz etkinleşmedi"
kontrol "sahip/ad ile çözme" 0 "Etkinleştirildi" -- "$S" b__y/ortak
[[ "$(cat "$T/.claude/skills/ortak/.kaynak")" == "skill-kutuphanesi/b__y/ortak" ]] && { BAS=$((BAS+1)); echo "GEÇTİ: doğru depo"; } || { HAT=$((HAT+1)); echo "KALDI: doğru depo"; }
kontrol "yerleşik ad" 1 "yerleşik" -- "$S" loop
kontrol "yerleşik ad sahip/ad" 1 "yerleşik" -- "$S" a__x/loop
yok "$T/.claude/skills/loop" "yerleşik etkinleşmedi"
kontrol ".. reddi" 1 "Geçersiz" -- "$S" ../etc
kontrol ".. tek" 1 "Geçersiz" -- "$S" ..
kontrol "çift ayırıcı reddi" 1 "Geçersiz" -- "$S" a__x/b/c
kontrol "mutlak yol reddi" 1 "Geçersiz" -- "$S" /etc
kontrol "sahip .. reddi" 1 "Geçersiz" -- "$S" ../tekil
kontrol "--liste" 0 "tekil" -- "$S" --liste
kontrol "--ara" 0 "Obsidian notları" -- "$S" --ara obsidian
kontrol "--ara eşleşmeyen" 0 "Eşleşme yok" -- "$S" --ara zzzz
# .kaynak olmayan skill kapatılamaz
mkdir -p "$T/.claude/skills/elle"; echo x > "$T/.claude/skills/elle/SKILL.md"
kontrol "--kapat reddi" 1 ".kaynak yok" -- "$S" --kapat elle
var "$T/.claude/skills/elle/SKILL.md" "elle skill silinmedi"
kontrol "--kapat .." 1 "Geçersiz" -- "$S" --kapat ..
kontrol "--kapat izinli" 0 "Kapatıldı" -- "$S" --kapat tekil
yok "$T/.claude/skills/tekil" "tekil silindi"
kontrol "--kapat etkin değil" 1 "etkin değil" -- "$S" --kapat tekil

echo "Sonuç: $BAS geçti, $HAT kaldı"
[[ $HAT -eq 0 ]]
