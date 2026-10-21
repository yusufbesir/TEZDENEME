#!/usr/bin/env bash
# Elle çalıştırılan sürüm denetimi. HİÇBİR ŞEYİ GÜNCELLEMEZ, hiçbir dosyayı değiştirmez.
#
#   bash scripts/surum-denetimi.sh              çevrimdışı: sabit imaj etiketlerini ve doğrudan bağımlılıkları LİSTELER (ağa bağlanmaz)
#   bash scripts/surum-denetimi.sh --cevrimici  ayrıca PyPI JSON API'sine ve Docker Hub / GHCR etiket listesine bakıp
#                                               daha yeni sürüm olup olmadığını RAPORLAR (yalnızca bu bayrakla ağa çıkılır)
#
# Kapsam: docker-compose.yml ve Dockerfile'lardaki (app, yedek) FROM/image satırları; app/requirements.in içindeki doğrudan
# bağımlılıklar (kilitli sürüm app/requirements.txt'den okunur). Yerel derlenen imajlar (qr-kampanya-*) listelenmez.
# Ağ yoksa ya da bir uç yanıt vermezse o satır için AÇIK hata yazılır; sürüm uydurulmaz. Çevrimiçi modda herhangi bir sorgu
# başarısızsa çıkış kodu 1'dir. "Daha yeni sürüm var" bilgisi tek başına hata sayılmaz (çıkış 0).
# Sınır: imaj etiketi karşılaştırması bir sezgidir (aynı sonekli ve sayısal sürümlü etiketler); ana sürüm atlamaları sürüm
# notlarıyla elle değerlendirilmelidir. Güncelleme prosedürü: docs/BAKIM.md ("Sürüm denetimi", "Bağımlılık güncellemesi").
# Gereksinim (--cevrimici): curl ve python3.
set -euo pipefail

KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CEVRIMICI=0
case "${1:-}" in
  "") ;;
  --cevrimici) CEVRIMICI=1 ;;
  -h|--yardim) sed -n '2,15p' "${BASH_SOURCE[0]}"; exit 0 ;;
  *) echo "Bilinmeyen seçenek: $1 (kullanım: bash scripts/surum-denetimi.sh [--cevrimici])" >&2; exit 2 ;;
esac
[ "$#" -le 1 ] || { echo "Fazla argüman. Kullanım: bash scripts/surum-denetimi.sh [--cevrimici]" >&2; exit 2; }

HATA_SAYISI=0
ZAMAN_ASIMI=20

# --- Python yardımcısı (yalnızca çevrimiçi modda, yalnızca ayrıştırma/karşılaştırma; ağa çıkmaz) ---
py() {
  python3 -I -c '
import json, re, sys

def sayilar(s):
    m = re.match(r"^v?(\d+(?:\.\d+)*)", s)
    return tuple(int(x) for x in m.group(1).split(".")) if m else None

komut = sys.argv[1]
if komut == "pypi":
    print(json.load(sys.stdin)["info"]["version"])
elif komut == "hub":
    veri = json.load(sys.stdin)
    print(veri.get("next") or "-")
    for r in veri["results"]:
        print(r["name"])
elif komut == "token":
    print(json.load(sys.stdin)["token"])
elif komut == "ghcr":
    for ad in json.load(sys.stdin).get("tags") or []:
        print(ad)
elif komut == "pypi-karsilastir":
    a, b = sayilar(sys.argv[2]), sayilar(sys.argv[3])
    if a is None or b is None or not re.fullmatch(r"\d+(\.\d+)*", sys.argv[3]):
        print("belirsiz")
    else:
        print("yeni" if b > a else "guncel")
elif komut == "etiket-yeni":
    # stdin: etiket adları. Aynı sonekli (örn. -alpine) ve sayısal sürümlü, mevcuttan büyük etiketler (en yeni 5).
    mevcut = sys.argv[2]
    m = re.match(r"^(v?\d+(?:\.\d+)*)(.*)$", mevcut)
    if not m:
        print("belirsiz")
        sys.exit(0)
    taban, sonek = sayilar(m.group(1)), m.group(2)
    adaylar = set()
    for satir in sys.stdin.read().split():
        k = re.match(r"^(v?\d+(?:\.\d+)*)(.*)$", satir)
        if k and k.group(2) == sonek and sayilar(k.group(1)) > taban:
            adaylar.add(satir)
    if not adaylar:
        print("guncel")
    else:
        sirali = sorted(adaylar, key=lambda e: sayilar(e), reverse=True)[:5]
        print("yeni " + " ".join(sirali))
' "$@"
}

ag_gerekli() {
  command -v curl >/dev/null 2>&1 || { echo "HATA: --cevrimici için curl gerekli." >&2; exit 1; }
  command -v python3 >/dev/null 2>&1 || { echo "HATA: --cevrimici için python3 gerekli." >&2; exit 1; }
}

# curl sarmalayıcısı: başarısızlıkta AÇIK hata yazar (ağ yok, DNS, TLS, HTTP hatası), çıktıyı stdout'a verir.
indir() {
  local url="$1" cikti
  if ! cikti=$(curl --silent --show-error --fail --location --max-time "$ZAMAN_ASIMI" --proto '=https' -- "$url" 2>&1); then
    echo "  HATA: $url alınamadı: ${cikti:-bilinmeyen hata} (ağ bağlantısı var mı?)" >&2
    return 1
  fi
  printf '%s\n' "$cikti"
}

# --- PyPI ---
pypi_denetle() {
  local ad="$1" kilitli="$2" json son durum
  if ! json=$(indir "https://pypi.org/pypi/${ad}/json"); then HATA_SAYISI=$((HATA_SAYISI + 1)); echo "  -> ${ad}: denetlenemedi"; return 0; fi
  if ! son=$(printf '%s' "$json" | py pypi 2>/dev/null) || [ -z "$son" ]; then
    echo "  HATA: ${ad}: PyPI yanıtı çözümlenemedi." >&2; HATA_SAYISI=$((HATA_SAYISI + 1)); echo "  -> ${ad}: denetlenemedi"; return 0
  fi
  durum=$(py pypi-karsilastir "$kilitli" "$son")
  case "$durum" in
    yeni) echo "  -> ${ad}: DAHA YENİ SÜRÜM VAR: ${son} (kilitli: ${kilitli})" ;;
    guncel) echo "  -> ${ad}: güncel (PyPI son sürüm: ${son})" ;;
    *) echo "  -> ${ad}: karşılaştırılamadı (kilitli: ${kilitli}, PyPI son: ${son}); elle bakın" ;;
  esac
}

# --- Docker Hub / GHCR ---
imaj_ayir() {  # $1 = tam referans -> IMAJ_AD, IMAJ_ETIKET (digest atılır)
  local ref="$1" sade son_parca
  sade="${ref%%@*}"
  son_parca="${sade##*/}"
  if [[ "$son_parca" == *:* ]]; then
    IMAJ_ETIKET="${son_parca#*:}"
    IMAJ_AD="${sade%":${IMAJ_ETIKET}"}"
  else
    IMAJ_ETIKET=""
    IMAJ_AD="$sade"
  fi
}

hub_etiketleri() {  # $1 = depo (örn. library/postgres), $2 = sonek filtresi; stdout: etiket adları
  local url="https://hub.docker.com/v2/repositories/$1/tags?page_size=100&ordering=last_updated&name=$2" sayfa=0 yanit
  while [ "$url" != "-" ] && [ "$sayfa" -lt 5 ]; do
    yanit=$(indir "$url") || return 1
    yanit=$(printf '%s' "$yanit" | py hub) || { echo "  HATA: Docker Hub yanıtı çözümlenemedi." >&2; return 1; }
    url=$(printf '%s\n' "$yanit" | sed -n '1p')
    printf '%s\n' "$yanit" | sed '1d'
    sayfa=$((sayfa + 1))
  done
}

ghcr_etiketleri() {  # $1 = sahip/depo
  local jeton yanit
  yanit=$(indir "https://ghcr.io/token?scope=repository:$1:pull") || return 1
  jeton=$(printf '%s' "$yanit" | py token) || { echo "  HATA: GHCR jetonu çözümlenemedi." >&2; return 1; }
  # Anonim çekme jetonu komut satırına (ps) konmasın diye curl yapılandırması stdin'den verilir.
  if ! yanit=$(printf 'header = "Authorization: Bearer %s"\n' "$jeton" |
      curl --silent --show-error --fail --max-time "$ZAMAN_ASIMI" --proto '=https' -K - -- "https://ghcr.io/v2/$1/tags/list?n=1000" 2>&1); then
    echo "  HATA: GHCR etiket listesi alınamadı: ${yanit:-bilinmeyen hata}" >&2
    return 1
  fi
  printf '%s' "$yanit" | py ghcr || { echo "  HATA: GHCR yanıtı çözümlenemedi." >&2; return 1; }
}

imaj_denetle() {
  local ref="$1" depo etiketler sonuc sonek
  imaj_ayir "$ref"
  if [ -z "$IMAJ_ETIKET" ] || [ "$IMAJ_ETIKET" = "latest" ]; then
    echo "  -> ${IMAJ_AD}: SABİT ETİKET YOK (${IMAJ_ETIKET:-etiketsiz}); sürüm sabitlenmemiş"
    return 0
  fi
  local ilk="${IMAJ_AD%%/*}"
  if [[ "$IMAJ_AD" == */* && ( "$ilk" == *.* || "$ilk" == *:* || "$ilk" == localhost ) ]]; then
    if [ "$ilk" != "ghcr.io" ]; then
      echo "  -> ${IMAJ_AD}: ${ilk} kayıt defteri bu betikte desteklenmiyor; elle bakın"
      return 0
    fi
    depo="${IMAJ_AD#ghcr.io/}"
    if ! etiketler=$(ghcr_etiketleri "$depo"); then HATA_SAYISI=$((HATA_SAYISI + 1)); echo "  -> ${IMAJ_AD}: denetlenemedi"; return 0; fi
  else
    depo="$IMAJ_AD"
    [[ "$depo" == */* ]] || depo="library/${depo}"
    sonek=$(printf '%s' "$IMAJ_ETIKET" | sed -E 's/^v?[0-9]+(\.[0-9]+)*//')
    if ! etiketler=$(hub_etiketleri "$depo" "$sonek"); then HATA_SAYISI=$((HATA_SAYISI + 1)); echo "  -> ${IMAJ_AD}: denetlenemedi"; return 0; fi
  fi
  sonuc=$(printf '%s\n' "$etiketler" | py etiket-yeni "$IMAJ_ETIKET")
  case "$sonuc" in
    yeni\ *) echo "  -> ${IMAJ_AD}: daha yeni etiket(ler) görünüyor: ${sonuc#yeni } (kullanılan: ${IMAJ_ETIKET}; ana sürüm değişimi olabilir, sürüm notlarını okuyun)" ;;
    guncel) echo "  -> ${IMAJ_AD}: aynı soneki taşıyan daha yeni sayısal etiket görünmüyor (kullanılan: ${IMAJ_ETIKET}; yalnızca ilk sayfalar tarandı)" ;;
    *) echo "  -> ${IMAJ_AD}: etiket karşılaştırılamadı (${IMAJ_ETIKET}); elle bakın" ;;
  esac
}

# --- Girdileri topla ---
imajlari_oku() {  # compose image: satırları + Dockerfile FROM satırları; yerel derlemeler atlanır
  {
    sed -nE 's/^[[:space:]]+image:[[:space:]]+([^[:space:]#]+).*$/\1/p' "$KOK/docker-compose.yml"
    local d
    for d in "$KOK/app/Dockerfile" "$KOK/yedek/Dockerfile"; do
      [ -f "$d" ] && sed -nE 's/^FROM[[:space:]]+(--[^[:space:]]+[[:space:]]+)*([^[:space:]]+).*$/\2/p' "$d"
    done
  } | grep -v -e '^qr-kampanya-' -e '\$' | awk '!gor[$0]++'
}

dogrudan_bagimliliklar() {  # "ad kilitli_surum" satırları
  local satir ad kilit norm
  while IFS= read -r satir; do
    if [[ "$satir" =~ ^([A-Za-z0-9._-]+)(\[[^]]*\])?==([^[:space:];#]+) ]]; then
      ad="${BASH_REMATCH[1]}"
      norm=$(printf '%s' "$ad" | tr 'A-Z_.' 'a-z--')
      kilit=$(sed -nE "s/^${norm}==([^[:space:];\\\\]+).*$/\\1/Ip" "$KOK/app/requirements.txt" | head -n 1)
      printf '%s %s\n' "$ad" "${kilit:-${BASH_REMATCH[3]}}"
    fi
  done < "$KOK/app/requirements.in"
}

echo "== Sürüm denetimi ($( [ "$CEVRIMICI" = 1 ] && echo 'ÇEVRİMİÇİ: PyPI, Docker Hub, GHCR' || echo 'çevrimdışı: yalnızca liste, ağa bağlanılmaz' )) =="
echo "Bu betik hiçbir şeyi güncellemez."
if [ "$CEVRIMICI" = 1 ]; then ag_gerekli; fi

echo
echo "-- Sabit imaj etiketleri (docker-compose.yml, app/Dockerfile, yedek/Dockerfile) --"
while IFS= read -r ref; do
  [ -n "$ref" ] || continue
  if [ "$CEVRIMICI" = 1 ]; then echo "* ${ref%%@*}"; imaj_denetle "$ref"; else echo "* ${ref%%@*}$( [[ "$ref" == *@sha256:* ]] && echo '  (digest ile sabit)' )"; fi
done < <(imajlari_oku)
if [ -f "$KOK/yedek/Dockerfile" ]; then
  grep -E '^ARG AGE_SURUMU=' "$KOK/yedek/Dockerfile" | sed 's/^ARG /* (yedek imajı) /; s/$/  (GitHub sürümü bu betikte denetlenmez; elle bakın)/' || true
fi

echo
echo "-- Doğrudan bağımlılıklar (app/requirements.in; kilitli sürüm app/requirements.txt) --"
while read -r ad kilit; do
  [ -n "$ad" ] || continue
  if [ "$CEVRIMICI" = 1 ]; then echo "* ${ad}==${kilit}"; pypi_denetle "$ad" "$kilit"; else echo "* ${ad}==${kilit}"; fi
done < <(dogrudan_bagimliliklar)

echo
if [ "$CEVRIMICI" = 1 ]; then
  if [ "$HATA_SAYISI" -gt 0 ]; then
    echo "SONUÇ: ${HATA_SAYISI} sorgu başarısız oldu; o satırlar için bilgi YOKTUR (ağ bağlantısını kontrol edin). Hiçbir şey güncellenmedi." >&2
    exit 1
  fi
  echo "SONUÇ: denetim bitti. Hiçbir şey güncellenmedi. Güncelleme için docs/BAKIM.md."
else
  echo "SONUÇ: liste tamam (çevrimdışı). Daha yeni sürüm var mı diye bakmak için: bash scripts/surum-denetimi.sh --cevrimici"
fi
