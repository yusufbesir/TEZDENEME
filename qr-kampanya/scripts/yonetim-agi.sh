#!/usr/bin/env bash
# Ortak işlevler (kurulum.sh ve guncelle.sh "source" eder; tek başına çalıştırılmaz).
# Panel/API varsayılan olarak KAPALIDIR: yalnızca .env içindeki YONETIM_IZINLI_AGLAR (CIDR listesi) ağlarına açılır.
# Bu işlevler .env'deki MEVCUT satırlara dokunmaz; yalnızca dosyanın sonuna satır ekler.

yonetim_ag_dolu_mu() {
  # .env'de boş olmayan bir YONETIM_IZINLI_AGLAR değeri var mı?
  grep -qE "^[[:space:]]*(export[[:space:]]+)?YONETIM_IZINLI_AGLAR=[[:space:]]*[^[:space:]\"']" .env 2>/dev/null
}

yonetim_erisimi_var_mi() {
  grep -qE '^[[:space:]]*(export[[:space:]]+)?YONETIM_ERISIMI=' .env 2>/dev/null
}

yonetim_ag_dogrula() {
  # $1: virgülle ayrılmış CIDR listesi. Geçerliyse 0. python3 yoksa doğrulanamaz -> reddedilir (güvenli taraf).
  command -v python3 >/dev/null || { echo "python3 bulunamadı; değer doğrulanamadı." >&2; return 1; }
  python3 -c '
import ipaddress, sys
parcalar = [p.strip() for p in sys.argv[1].split(",") if p.strip()]
if not parcalar:
    sys.exit(1)
for p in parcalar:
    ipaddress.ip_network(p, strict=True)
' "$1" 2>/dev/null
}

yonetim_ag_onerisi() {
  # $SSH_CLIENT ("IP port port") içindeki IP'den /32 (IPv4) ya da /128 (IPv6) önerisi üretir; yoksa/geçersizse boş yazar.
  local ip="${SSH_CLIENT%% *}"
  [ -n "$ip" ] || return 0
  command -v python3 >/dev/null || return 0
  python3 -c '
import ipaddress, sys
a = ipaddress.ip_address(sys.argv[1])
print(f"{a}/{32 if a.version == 4 else 128}")
' "$ip" 2>/dev/null || true
}

yonetim_kapali_talimati() {
  echo "BİLGİ: Panel ve API şu an KAPALI (yalnızca kısa bağlantılar internete açık). Açmak için .env dosyasına kendi ağınızı ekleyin:"
  echo "       YONETIM_IZINLI_AGLAR=<IP/CIDR>   (örn. 203.0.113.5/32; satırı sona ekleyin, başka satırlara dokunmayın)"
  echo "       ardından: docker compose up -d   (ayrıntı: docs/REHBER.md bölüm 2, docs/GUVENLIK.md)"
  echo "       Kurtarma her zaman SSH ile .env üzerinden yapılır."
}

yonetim_ag_sor() {
  # Etkileşimli terminal (tty) varsa izinli ağı sorar ve .env'nin SONUNA ekler; yoksa talimat basar ve hiçbir şey yazmaz.
  if yonetim_ag_dolu_mu; then
    return 0
  fi
  if ! { [ -t 0 ] && [ -t 1 ]; }; then
    yonetim_kapali_talimati
    return 0
  fi
  local oneri deger
  oneri="$(yonetim_ag_onerisi)"
  echo "Panel ve API varsayılan olarak KAPALIDIR; yalnızca izin verdiğiniz ağdan açılır (kısa bağlantılar herkese açık kalır)."
  if [ -n "$oneri" ]; then
    echo "Şu anki SSH bağlantınızın adresinden türetilen öneri: $oneri (yalnızca bu adres). IP'niz değişkense bir VPN aralığı yazın (docs/REHBER.md)."
  fi
  while true; do
    read -rp "Panele erişebilecek ağ(lar) (CIDR, virgülle)${oneri:+ [Enter = $oneri]}; boş bırakmak için '-' yazın: " deger
    deger="${deger:-$oneri}"
    if [ -z "$deger" ] || [ "$deger" = "-" ]; then
      yonetim_kapali_talimati
      return 0
    fi
    if yonetim_ag_dogrula "$deger"; then break; fi
    echo "Geçersiz değer. Örnek: 203.0.113.5/32 ya da 203.0.113.0/24,2001:db8::/32 (ana makine bitleri sıfır olmalı)."
  done
  deger="$(printf '%s' "$deger" | tr -d '[:space:]')"
  [ -z "$(tail -c1 .env)" ] || echo >> .env
  echo "YONETIM_IZINLI_AGLAR=$deger" >> .env
  echo ".env dosyasının SONUNA eklendi: YONETIM_IZINLI_AGLAR=$deger (diğer satırlar değiştirilmedi)."
}
