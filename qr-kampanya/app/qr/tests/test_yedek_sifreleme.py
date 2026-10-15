"""Yedek şifreleme, saklama (silme) kuralı ve panel uyarısı testleri.

Betikler gerçek rclone/Docker olmadan, sahte bir rclone ile (yalnızca dosya kopyalar/karşılaştırır) denenir;
gerçek rclone ve age ile uçtan uca deneme docs/kanit/ altındaki kayıtlardadır.
"""
import fcntl
import json
import os
import pty
import re
import select
import shlex
import shutil
import signal
import socket
import subprocess
import tempfile
import termios
import time
import unittest
from datetime import timedelta
from pathlib import Path

from django.test import SimpleTestCase, override_settings
from django.utils import timezone

from qr.panel.pano import uzak_kopya_uyarisi_gerekli, yedek_durumu

from .yardimci import TemelTest, betik_dizini

SAHTE_RCLONE = r'''#!/bin/sh
# Sahte rclone: "copy KAYNAK HEDEF" dosyaları kopyalar; "check KAYNAK HEDEF ... --combined DOSYA" karşılaştırır.
# Hedefin ":" öncesi atılır (ör. b2:klasor -> klasor). SAHTE_UZAK_KOPYALAMA=0 ise copy hiçbir şey kopyalamaz.
# "listremotes --long" ve "config show AD", SAHTE_REMOTELAR ("ad tür [remote]" satırları) ortam değişkeninden yanıtlanır.
# SAHTE_HASH_YOK=1: --download yokken check, gerçek rclone gibi "No common hash found" yazar (yalnızca boyut karşılaştırır).
# SAHTE_INDIR_HATA=1: --download ile check başarısız olur. Bütün çağrılar SAHTE_CAGRI_GUNLUGU dosyasına yazılır.
printf '%s\n' "$*" >> "${SAHTE_CAGRI_GUNLUGU:-/dev/null}"
# Her çağrıda görünen RCLONE_* DEĞİŞKEN ADLARI (değerler değil) SAHTE_ORTAM2'ye yazılır: "komut: AD1 AD2".
printf '%s: %s\n' "$1" "$(env | sed -n 's/^\(RCLONE_[A-Za-z0-9_]*\)=.*/\1/p' | sort | tr '\n' ' ')" >> "${SAHTE_ORTAM2:-/dev/null}"
case "$1" in
  listremotes)
    [ "${SAHTE_LISTE_HATA:-0}" = "1" ] && exit 1
    printf '%s\n' "${SAHTE_REMOTELAR:-}" | while read -r ad tur uz; do [ -n "$ad" ] && printf '%s: %s \n' "$ad" "$tur"; done
    exit 0 ;;
  config)
    printf '%s\n' "${SAHTE_REMOTELAR:-}" | while read -r ad tur uz; do
      if [ "$ad" = "$3" ]; then printf '[%s]\ntype = %s\n' "$ad" "$tur"; [ -n "$uz" ] && printf 'remote = %s\n' "$uz"; fi
    done
    # SAHTE_ALANLAR: "ad anahtar=deger" satırları (host/endpoint/url...) config show çıktısına eklenir.
    printf '%s\n' "${SAHTE_ALANLAR:-}" | while read -r ad kv; do
      if [ "$ad" = "$3" ] && [ -n "$kv" ]; then printf '%s = %s\n' "${kv%%=*}" "${kv#*=}"; fi
    done
    exit 0 ;;
  backend)
    # "backend features HEDEF": gerçek rclone biçiminde JSON. SAHTE_OZETLER (varsayılan "md5 sha1"; boş = özet yok),
    # SAHTE_FEATURES_HATA=1 sorgu başarısız.
    [ "${SAHTE_FEATURES_HATA:-0}" = "1" ] && exit 1
    liste="${SAHTE_OZETLER-md5 sha1}"
    printf '{\n\t"Name": "x",\n'
    if [ -z "$liste" ]; then printf '\t"Hashes": [],\n'; else
      printf '\t"Hashes": [\n'; n=0
      for h in $liste; do [ "$n" -gt 0 ] && printf ',\n'; printf '\t\t"%s"' "$h"; n=1; done
      printf '\n\t],\n'
    fi
    printf '\t"Features": {}\n}\n'
    exit 0 ;;
esac
komut="$1"; kaynak="$2"; hedef="${3##*:}"; shift 3
# check çağrısında rclone günlük ortamı SAHTE_ORTAM_GUNLUGU'na yazılır.
[ "$komut" = "check" ] && printf 'LOG_LEVEL=%s QUIET=%s LOG_FILE=%s\n' "${RCLONE_LOG_LEVEL-unset}" "${RCLONE_QUIET-unset}" "${RCLONE_LOG_FILE-unset}" >> "${SAHTE_ORTAM_GUNLUGU:-/dev/null}"
birlesik=""; indir=0; ffrom=""
while [ $# -gt 0 ]; do
  case "$1" in --combined) birlesik="$2";; --download) indir=1;; --files-from) ffrom="$2";; esac
  shift
done
mkdir -p "$hedef"
case "$komut" in
  copy)
    [ "${SAHTE_UZAK_KOPYALAMA:-1}" = "0" ] && exit 0
    for f in "$kaynak"/db-*.dump.age "$kaynak"/medya-*.tar.gz.age "$kaynak"/sha256-*.txt; do
      [ -f "$f" ] || continue
      case "$(basename "$f")" in $SAHTE_ATLA) continue;; esac
      cp "$f" "$hedef/"
    done ;;
  check)
    [ -n "$ffrom" ] && cat "$ffrom" >> "${SAHTE_KAPSAM_GUNLUGU:-/dev/null}"
    # Gerçek rclone gibi: "No common hash found" ERROR düzeyindedir; CRITICAL/QUIET ile görünmez olur.
    if [ "${SAHTE_HASH_YOK:-0}" = "1" ] && [ "$indir" = "0" ] && [ "${RCLONE_LOG_LEVEL:-}" != "CRITICAL" ] && [ -z "${RCLONE_QUIET:-}" ]; then
      echo "2026/10/15 17:00:00 ERROR : No common hash found - not using a hash for checks" >&2
    fi
    : > "$birlesik"; sonuc=0
    if [ "$indir" = "1" ] && [ "${SAHTE_INDIR_HATA:-0}" = "1" ]; then exit 1; fi
    for f in "$kaynak"/db-*.dump.age "$kaynak"/medya-*.tar.gz.age "$kaynak"/sha256-*.txt; do
      [ -f "$f" ] || continue
      ad=$(basename "$f")
      if [ -n "$ffrom" ] && ! grep -qxF "$ad" "$ffrom"; then continue; fi
      if [ -f "$hedef/$ad" ] && cmp -s "$f" "$hedef/$ad"; then echo "= $ad" >> "$birlesik"; else echo "+ $ad" >> "$birlesik"; sonuc=1; fi
    done
    exit $sonuc ;;
esac
'''


def zaman_adi(gun_once, saat=3):
    return (timezone.now() - timedelta(days=gun_once)).strftime(f"%Y%m%d-{saat:02d}1500")


class DisariKopyalaSilmeTesti(SimpleTestCase):
    """disari-kopyala.sh saklama kuralı: yalnızca uzakta doğrulanmış, eski, tam üçlüler silinir."""

    def setUp(self):
        self.kok = Path(tempfile.mkdtemp(prefix="qr-disari-"))
        self.addCleanup(shutil.rmtree, self.kok, ignore_errors=True)
        (self.kok / "scripts").mkdir()
        shutil.copy(betik_dizini() / "disari-kopyala.sh", self.kok / "scripts" / "disari-kopyala.sh")
        (self.kok / "bin").mkdir()
        # /tmp noexec olabilir (Docker testi): sahte rclone sh ile çalıştırılır.
        self.rclone = self.kok / "bin" / "rclone"
        self.rclone.write_text(SAHTE_RCLONE)
        self.yedekler = self.kok / "yedekler"
        self.yedekler.mkdir()
        self.uzak = self.kok / "uzak"

    def ucluyu_yaz(self, gun_once, medya=True, sha=True, saat=3):
        z = zaman_adi(gun_once, saat)
        adlar = [f"db-{z}.dump.age"] + ([f"medya-{z}.tar.gz.age"] if medya else []) + ([f"sha256-{z}.txt"] if sha else [])
        for ad in adlar:
            yol = self.yedekler / ad
            yol.write_bytes(b"age-encryption.org/v1\n" + ad.encode())
            eski = time.time() - gun_once * 86400
            os.utime(yol, (eski, eski))
        return z

    def calistir(self, hedef="b2:kova", saklama="14", **ortam):
        (self.kok / ".env").write_text(f"YEDEK_DIZINI={self.yedekler}\nYEDEK_SAKLAMA_GUN={saklama}\n" + (f"YEDEK_UZAK_HEDEF={shlex.quote(hedef)}\n" if hedef else ""))
        env = {"PATH": os.environ["PATH"], "HOME": str(self.kok), "RCLONE_KOMUTU": f"sh {self.rclone}",
               "SAHTE_REMOTELAR": "b2 b2\nsf sftp"}   # bilinmeyen tür "yerel" sayılır: varsayılan uzaklar tanımlı
        env.update(ortam)
        return subprocess.run(["bash", str(self.kok / "scripts" / "disari-kopyala.sh")], capture_output=True, text=True, env=env, timeout=60)

    def var(self, z, tur):
        sablon = {"db": f"db-{z}.dump.age", "medya": f"medya-{z}.tar.gz.age", "sha": f"sha256-{z}.txt"}[tur]
        return (self.yedekler / sablon).exists()

    def test_eski_dogrulanmis_uclu_silinir_yeni_ve_en_yeni_korunur(self):
        eski = self.ucluyu_yaz(30)
        orta = self.ucluyu_yaz(5)       # saklama süresinden genç
        en_yeni = self.ucluyu_yaz(0)
        s = self.calistir()
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertFalse(any(self.var(eski, t) for t in ("db", "medya", "sha")), "eski doğrulanmış üçlü silinmeliydi")
        self.assertTrue(all(self.var(orta, t) for t in ("db", "medya", "sha")))
        self.assertTrue(all(self.var(en_yeni, t) for t in ("db", "medya", "sha")))
        # Silinen her dosya günlüğe yazılır.
        gunluk = (self.yedekler / "yedek-gunlugu.log").read_text()
        self.assertEqual(len(re.findall(r"SİLİNDİ yerel yedek", gunluk)), 3)
        self.assertIn(f"db-{eski}.dump.age", gunluk)

    def test_en_yeni_yedek_eski_ve_dogrulanmis_olsa_bile_silinmez(self):
        tek = self.ucluyu_yaz(60)
        s = self.calistir()
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertTrue(all(self.var(tek, t) for t in ("db", "medya", "sha")))

    def test_en_yeni_yetim_zaman_son_tam_uclunun_korumasini_kaldirmaz(self):
        # En yeni ZAMAN yarım (yalnız db, sha256/medya yok): son TAM üçlü yine de en yeni sayılıp korunmalı.
        son_tam = self.ucluyu_yaz(30)
        yetim = self.ucluyu_yaz(0, medya=False, sha=False)
        s = self.calistir()
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertTrue(all(self.var(son_tam, t) for t in ("db", "medya", "sha")), "son tam üçlü silinmemeliydi")
        self.assertTrue(self.var(yetim, "db"))

    def test_yetim_en_yeniye_ragmen_eski_tam_uclu_silinir_en_yeni_tam_korunur(self):
        eski = self.ucluyu_yaz(40)
        son_tam = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0, medya=False, sha=False)
        s = self.calistir()
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertFalse(any(self.var(eski, t) for t in ("db", "medya", "sha")))
        self.assertTrue(all(self.var(son_tam, t) for t in ("db", "medya", "sha")))

    def test_uzakta_olmayan_uclu_silinmez(self):
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(SAHTE_UZAK_KOPYALAMA="0")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertTrue(all(self.var(eski, t) for t in ("db", "medya", "sha")))
        self.assertFalse((self.kok / "uzak").exists() and any((self.kok / "uzak").iterdir()))

    def test_uzakta_kismen_dogrulanan_uclu_silinmez(self):
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(SAHTE_ATLA=f"sha256-{eski}.txt")   # sha256 dosyası uzağa gitmedi
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertTrue(all(self.var(eski, t) for t in ("db", "medya", "sha")))

    def test_yerelde_eksik_uclu_silinmez(self):
        eksik = self.ucluyu_yaz(30, medya=False)
        self.ucluyu_yaz(0)
        s = self.calistir()
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertTrue(self.var(eksik, "db"))
        self.assertTrue(self.var(eksik, "sha"))

    def test_uzak_hedef_yoksa_hicbir_sey_silinmez(self):
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(hedef="")
        self.assertNotEqual(s.returncode, 0)
        self.assertTrue(all(self.var(eski, t) for t in ("db", "medya", "sha")))
        self.assertFalse((self.yedekler / "uzak-dogrulama.json").exists())

    def test_gecersiz_saklama_gun_silmeyi_engeller(self):
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        for deger in ("0", "abc", "-3"):
            s = self.calistir(saklama=deger)
            self.assertNotEqual(s.returncode, 0, deger)
            self.assertTrue(all(self.var(eski, t) for t in ("db", "medya", "sha")), deger)

    def test_dogrulama_kaydinda_kimlik_bilgisi_yok(self):
        self.ucluyu_yaz(0)
        gizli = "GIZLI-ANAHTAR-123"
        s = self.calistir(hedef=f":s3,access_key_id={gizli},secret_access_key={gizli}:kova")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        kayit_metni = (self.yedekler / "uzak-dogrulama.json").read_text()
        kayit = json.loads(kayit_metni)
        self.assertNotIn(gizli, kayit_metni)
        self.assertNotIn(gizli, s.stdout + s.stderr + (self.yedekler / "yedek-gunlugu.log").read_text())
        self.assertEqual(kayit["hedef"], "(adsız)")
        self.assertTrue(kayit["zaman"])
        self.assertEqual(len(kayit["dogrulanan"]), 3)
        # Düz hedef adı: yalnızca ":" öncesi yazılır.
        s = self.calistir(hedef="b2:gizli-klasor")
        self.assertEqual(json.loads((self.yedekler / "uzak-dogrulama.json").read_text())["hedef"], "b2")

    def test_basarisiz_dogrulamada_onceki_basarili_zaman_korunur(self):
        """Doğrulama başarısızsa 'zaman' yenilenmez (önceki başarılı zaman kalır)."""
        self.ucluyu_yaz(0)
        self.calistir()
        ilk = json.loads((self.yedekler / "uzak-dogrulama.json").read_text())["zaman"]
        shutil.rmtree(self.uzak, ignore_errors=True)
        shutil.rmtree(self.kok / "kova", ignore_errors=True)
        s = self.calistir(SAHTE_UZAK_KOPYALAMA="0", hedef="b2:baska-kova")
        kayit = json.loads((self.yedekler / "uzak-dogrulama.json").read_text())
        self.assertEqual(kayit["zaman"], ilk)
        self.assertEqual(kayit["dogrulanan"], [])


    # --- Risk 2: hedef aynı sunucudaki bir klasörse sunucu dışı sayılmaz, silme yapılmaz -------------------------
    def yerel_hedef_dogrula(self, hedef, **ortam):
        eski = self.ucluyu_yaz(30)
        en_yeni = self.ucluyu_yaz(0)
        s = self.calistir(hedef=hedef, **ortam)
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertTrue(all(self.var(eski, t) for t in ("db", "medya", "sha")), f"{hedef}: yerel yedek SİLİNMEMELİYDİ")
        self.assertTrue(all(self.var(en_yeni, t) for t in ("db", "medya", "sha")))
        self.assertIn("sunucu dışı SAYILMADI", s.stdout)
        kayit = json.loads((self.yedekler / "uzak-dogrulama.json").read_text())
        self.assertIsNone(kayit["zaman"], "panel uyarısı sürmeli: zaman yenilenmemeli")
        self.assertEqual(kayit["dogrulanan"], [])
        self.assertEqual(kayit["not"], "yerel hedef, sunucu dışı sayılmadı")
        gunluk = (self.yedekler / "yedek-gunlugu.log").read_text()
        self.assertNotIn("SİLİNDİ", gunluk)
        self.assertIn("yerel hedef, sunucu dışı sayılmadı", gunluk)
        return s

    def test_yerel_yol_hedefleri_silmeyi_engeller(self):
        for hedef in (str(self.kok / "baska-klasor"), "./yerel-kopya", "../yerel-kopya", "~/yerel-kopya", "yerel-kopya"):
            with self.subTest(hedef=hedef):
                for f in self.yedekler.glob("*"):
                    f.unlink()
                self.yerel_hedef_dogrula(hedef, SAHTE_CAGRI_GUNLUGU=str(self.kok / "cagri.log"))

    def test_rclone_local_turu_ve_baglanti_dizesi_silmeyi_engeller(self):
        self.yerel_hedef_dogrula("yerel:kova", SAHTE_REMOTELAR="yerel local")
        for f in self.yedekler.glob("*"):
            f.unlink()
        self.yerel_hedef_dogrula(":local:kova")
        for f in self.yedekler.glob("*"):
            f.unlink()
        self.yerel_hedef_dogrula(":alias,remote=/tmp/x:kova")

    def test_izin_listesinde_olmayan_tur_yerel_sayilir(self):
        # Kara liste değil izin listesi: archive/memory/hdfs/http ve gelecekteki türler sunucu dışı sayılmaz.
        for tur in ("archive", "memory", "hdfs", "http", "yenitur"):
            with self.subTest(tur=tur):
                for f in self.yedekler.iterdir():
                    f.unlink()
                self.yerel_hedef_dogrula("arsiv:kova", SAHTE_REMOTELAR=f"arsiv {tur}")
                for f in self.yedekler.iterdir():
                    f.unlink()
                self.yerel_hedef_dogrula(f":{tur},remote=/yerel/klasor:")

    def test_alias_yerel_hedefe_isaret_ediyorsa_engellenir_uzaga_isaret_ediyorsa_silinir(self):
        # alias -> yerel yol: engellenir
        self.yerel_hedef_dogrula("takma:kova", SAHTE_REMOTELAR="takma alias /var/yedek-kopya")
        # alias -> alias -> local: özyinelemeli çözülür
        for f in self.yedekler.glob("*"):
            f.unlink()
        self.yerel_hedef_dogrula("ikinci:kova", SAHTE_REMOTELAR="ikinci alias takma:alt\ntakma alias yerel:x\nyerel local")
        # "ad,seçenek=değer:yol" biçimi: tür ad kısmından bulunur, yerel alias yine engellenir
        self.yerel_hedef_dogrula("takma,x=1:kova", SAHTE_REMOTELAR="takma alias /var/yedek-kopya")
        # alias -> gerçek uzak (b2): sunucu dışı sayılır, silme çalışır
        for f in self.yedekler.glob("*"):
            f.unlink()
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(hedef="takma:kova", SAHTE_REMOTELAR="takma alias b2:kova\nb2 b2")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertFalse(any(self.var(eski, t) for t in ("db", "medya", "sha")))
        self.assertNotIn("SAYILMADI", s.stdout)

    def test_gercek_uzak_turu_silmeyi_engellemez(self):
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(hedef="sf:kova", SAHTE_REMOTELAR="sf sftp")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertFalse(any(self.var(eski, t) for t in ("db", "medya", "sha")))
        self.assertIsNotNone(json.loads((self.yedekler / "uzak-dogrulama.json").read_text())["zaman"])

    def test_yerel_hedef_izni_yalniz_deneme_icin_silmeye_izin_verir(self):
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(hedef="yerel:kova", SAHTE_REMOTELAR="yerel local", YEDEK_YEREL_HEDEF_IZIN="1")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIn("YALNIZCA DENEME", s.stdout)
        self.assertFalse(any(self.var(eski, t) for t in ("db", "medya", "sha")))

    def test_rclone_config_show_ciktisi_gizli_deger_olarak_yazilmaz(self):
        # config show gizli değer içerebilir; betik onu ayrıştırır ama asla yazmaz.
        self.ucluyu_yaz(0)
        s = self.calistir(hedef="takma:kova", SAHTE_REMOTELAR="takma alias /var/yedek-kopya")
        self.assertNotIn("type = alias", s.stdout + s.stderr)
        self.assertNotIn("type = alias", (self.yedekler / "yedek-gunlugu.log").read_text())

    # --- Risk 3: ortak özet (hash) yoksa rclone yalnızca boyut karşılaştırır -------------------------------------
    def cagrilar(self):
        yol = self.kok / "cagri.log"
        return yol.read_text().splitlines() if yol.exists() else []

    def test_ozet_varsa_download_kullanilmaz(self):
        self.ucluyu_yaz(0)
        s = self.calistir(SAHTE_CAGRI_GUNLUGU=str(self.kok / "cagri.log"))
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        checks = [c for c in self.cagrilar() if c.startswith("check ")]
        self.assertEqual(len(checks), 1)
        self.assertNotIn("--download", checks[0])
        self.assertEqual(json.loads((self.yedekler / "uzak-dogrulama.json").read_text())["yontem"], "ozet")

    def test_ozet_yoksa_uyarir_ve_otomatik_download_ile_dogrular_sonra_siler(self):
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(SAHTE_CAGRI_GUNLUGU=str(self.kok / "cagri.log"), SAHTE_HASH_YOK="1")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIn("ortak özet (hash) yok", s.stdout)
        self.assertIn("yalnızca BOYUT", s.stdout)
        checks = [c for c in self.cagrilar() if c.startswith("check ")]
        self.assertEqual(len(checks), 2, checks)
        self.assertNotIn("--download", checks[0])
        self.assertIn("--download", checks[1])
        self.assertEqual(json.loads((self.yedekler / "uzak-dogrulama.json").read_text())["yontem"], "indirerek-ozet-yok")
        self.assertFalse(any(self.var(eski, t) for t in ("db", "medya", "sha")), "download ile doğrulandı, silinmeliydi")

    def test_ozet_yok_ve_download_basarisizsa_silme_yok_ve_onceki_zaman_korunur(self):
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        # Önce sağlıklı bir doğrulama yapılsın ki "önceki başarılı zaman" olsun (silmeden: saklama 9999 gün).
        self.calistir(saklama="9999")
        ilk = json.loads((self.yedekler / "uzak-dogrulama.json").read_text())["zaman"]
        self.assertTrue(ilk)
        s = self.calistir(SAHTE_HASH_YOK="1", SAHTE_INDIR_HATA="1")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIn("indirerek doğrulama da BAŞARISIZ", s.stdout)
        self.assertTrue(all(self.var(eski, t) for t in ("db", "medya", "sha")), "silme olmamalıydı")
        kayit = json.loads((self.yedekler / "uzak-dogrulama.json").read_text())
        self.assertEqual(kayit["dogrulanan"], [])
        self.assertEqual(kayit["zaman"], ilk)

    def test_acik_indirerek_dogrulama_tek_check_ve_download(self):
        self.ucluyu_yaz(0)
        s = self.calistir(SAHTE_CAGRI_GUNLUGU=str(self.kok / "cagri.log"), YEDEK_UZAK_INDIREREK="1", SAHTE_HASH_YOK="1")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        checks = [c for c in self.cagrilar() if c.startswith("check ")]
        self.assertEqual(len(checks), 1)
        self.assertIn("--download", checks[0])
        self.assertEqual(json.loads((self.yedekler / "uzak-dogrulama.json").read_text())["yontem"], "indirerek")

    def test_hash_yok_mesaji_rclone_belgesindeki_metinle_eslesir(self):
        # rclone v1.75.0 (denendi): ortak özet yoksa "ERROR : No common hash found - not using a hash for checks" ve
        # "NOTICE: ...: N hashes could not be checked" yazar, çıkış kodu 0'dır. `rclone check --help`: --download,
        # "can be useful for remotes that don't support hashes".
        betik = (betik_dizini() / "disari-kopyala.sh").read_text()
        self.assertIn("no common hash", betik)
        self.assertIn("hashes could not be checked", betik)
        self.assertIn("--download", betik)

    @unittest.skipUnless(os.environ.get("QR_TEST_RCLONE") or shutil.which("rclone"), "gerçek rclone yok")
    def test_gercek_rclone_crypt_hedefi_ozetsiz_yolu_download_ile_dogrular(self):
        """Gerçek rclone: crypt uzak ortak özet sunmaz -> uyarı + otomatik --download. (crypt yerel klasöre yazar,
        bu yüzden yalnızca bu deneme için YEDEK_YEREL_HEDEF_IZIN=1 verilir.)"""
        rclone = os.environ.get("QR_TEST_RCLONE") or shutil.which("rclone")
        gizli = subprocess.run([rclone, "obscure", "deneme-parolasi"], capture_output=True, text=True).stdout.strip()
        self.ucluyu_yaz(0)
        yapilandirma = self.kok / "rclone.conf"
        uzak = self.kok / "crypt-hedef"
        uzak.mkdir()
        yapilandirma.write_text(f"[sifreli]\ntype = crypt\nremote = {uzak}\npassword = {gizli}\n")   # ayar dosyası tek kaynak
        ortam = {"RCLONE_KOMUTU": rclone, "RCLONE_CONFIG": str(yapilandirma), "YEDEK_YEREL_HEDEF_IZIN": "1"}
        s = self.calistir(hedef="sifreli:", **ortam)
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIn("özet yok sayıldı", s.stdout)   # features sorgusu: crypt ortak özet sunmaz
        kayit = json.loads((self.yedekler / "uzak-dogrulama.json").read_text())
        self.assertEqual(kayit["yontem"], "indirerek-ozet-yok")
        self.assertEqual(len(kayit["dogrulanan"]), 3)
        # Aynı crypt hedefi bu izin olmadan: crypt -> yerel klasör olduğu için sunucu dışı SAYILMAZ.
        ortam.pop("YEDEK_YEREL_HEDEF_IZIN")
        s = self.calistir(hedef="sifreli:", **ortam)
        self.assertIn("sunucu dışı SAYILMADI", s.stdout)

    # --- Denetçi ORTA 1: belirsizde YEREL say (silme yok) ---------------------------------------------------------
    def temizle_yedekler(self):
        for f in self.yedekler.glob("*"):
            f.unlink()

    def test_bilinmeyen_veya_bos_tur_yerel_sayilir(self):
        self.yerel_hedef_dogrula("yok:kova", SAHTE_REMOTELAR="")                     # ad listremotes'ta yok
        self.temizle_yedekler()
        self.yerel_hedef_dogrula("sf:kova", SAHTE_REMOTELAR="sf sftp", SAHTE_LISTE_HATA="1")   # listremotes hata verdi
        self.temizle_yedekler()
        self.yerel_hedef_dogrula(":,host=x:kova")                                      # bağlantı dizesinde tür boş

    def test_adlandirilmis_uzak_ve_baglanti_dizesi_secenekleri_belirsiz_sayilir(self):
        for hedef in ("sf,host=uzak.example.invalid:kova", "b2,account=x:kova", "sf,remote=/tmp/x:kova"):
            with self.subTest(hedef=hedef):
                self.temizle_yedekler()
                self.yerel_hedef_dogrula(hedef)
        self.temizle_yedekler()
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(hedef="sf,host=x:kova")
        self.assertIn("seçenekleri içeriyor", s.stdout)
        self.assertTrue(all(self.var(eski, t) for t in ("db", "medya", "sha")))

    def yerel_adresler(self):
        adlar = [socket.gethostname()]
        f = subprocess.run(["hostname", "-f"], capture_output=True, text=True)
        if f.returncode == 0 and f.stdout.strip():
            adlar.append(f.stdout.strip())
        i = subprocess.run(["hostname", "-I"], capture_output=True, text=True)
        if i.returncode == 0:
            adlar += i.stdout.split()
        return adlar

    def test_ag_turu_ayni_makineyi_gosteriyorsa_yerel_sayilir(self):
        degerler = ["localhost", "LOCALHOST.", "127.0.0.1", "127.5.5.5", "::1", "[::1]:2222", "0.0.0.0", "http://localhost:9000/yol",
                    "sftp://kullanici@127.0.0.1:2222", "2130706433"] + self.yerel_adresler()
        for tur, alan in (("sftp", "host"), ("s3", "endpoint"), ("webdav", "url")):
            for deger in degerler:
                with self.subTest(tur=tur, deger=deger):
                    self.temizle_yedekler()
                    self.yerel_hedef_dogrula("uz:kova", SAHTE_REMOTELAR=f"uz {tur}", SAHTE_ALANLAR=f"uz {alan}={deger}")

    def test_baglanti_dizesindeki_host_ve_endpoint_yerel_sayilir(self):
        for hedef in (":sftp,host=localhost,user=x:kova", ":sftp,host='127.0.0.1',user=x:kova",
                      ":s3,endpoint='http://localhost:9000',provider=Minio:kova", ":ftp,host=" + socket.gethostname() + ":kova"):
            with self.subTest(hedef=hedef):
                self.temizle_yedekler()
                self.yerel_hedef_dogrula(hedef)

    def test_rclone_ortam_degiskenleri_tum_cagrilarda_kaldirilir_yalniz_config_ve_sifre_kalir(self):
        """RCLONE_SFTP_HOST=localhost gibi değişkenler artık tespiti de rclone'u da etkilemez: ayar dosyası tek kaynak.
        Ayar dosyasında host dış adres -> sunucu dışı sayılır ve silinir; kaldırılan değişkenlerin ADI (değeri değil) yazılır."""
        eski = self.ucluyu_yaz(30)
        en_yeni = self.ucluyu_yaz(0)
        s = self.calistir(hedef="uz:kova", SAHTE_REMOTELAR="uz s3", SAHTE_ALANLAR="uz endpoint=https://203.0.113.9", SAHTE_ORTAM2=str(self.kok / "ortam2.log"),
                          RCLONE_SFTP_HOST="gizli-deger-123", RCLONE_CONFIG_UZ_HOST="gizli-deger-123", RCLONE_SIZE_ONLY="gizli-deger-123",
                          RCLONE_ALIAS_REMOTE="gizli-deger-123", RCLONE_S3_ENDPOINT="gizli-deger-123", RCLONE_LOG_LEVEL="gizli-deger-123",
                          RCLONE_CONFIG="/etc/yok/rclone.conf", RCLONE_CONFIG_PASS="gizli-deger-123")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertNotIn("SAYILMADI", s.stdout)
        self.assertFalse(any(self.var(eski, t) for t in ("db", "medya", "sha")), "dış hedef doğrulandı: eski üçlü silinmeli")
        self.assertTrue(all(self.var(en_yeni, t) for t in ("db", "medya", "sha")))
        for ad in ("RCLONE_SFTP_HOST", "RCLONE_CONFIG_UZ_HOST", "RCLONE_SIZE_ONLY", "RCLONE_ALIAS_REMOTE", "RCLONE_S3_ENDPOINT", "RCLONE_LOG_LEVEL"):
            self.assertIn(ad, s.stdout)
        self.assertNotIn("gizli-deger-123", s.stdout + s.stderr)                    # değerler yazılmaz
        self.assertNotIn("RCLONE_KOMUTU", s.stdout)
        self.assertNotIn("RCLONE_CONFIG_PASS,", s.stdout)
        uyari = [satir for satir in s.stdout.splitlines() if "YOK SAYILDI" in satir]
        self.assertEqual(len(uyari), 1)
        self.assertNotRegex(uyari[0], r"RCLONE_CONFIG(_PASS)?( |$)")
        satirlar = (self.kok / "ortam2.log").read_text().splitlines()
        komutlar = {satir.split(":")[0] for satir in satirlar}
        self.assertTrue({"listremotes", "config", "backend", "copy", "check"} <= komutlar, komutlar)   # her tür çağrı gözlendi
        for satir in satirlar:
            self.assertEqual(set(satir.split(": ", 1)[1].split()), {"RCLONE_CONFIG", "RCLONE_CONFIG_PASS"}, satir)

    def test_rclone_ortam_degiskeni_yoksa_uyari_basilmaz(self):
        self.ucluyu_yaz(0)
        s = self.calistir()
        self.assertNotIn("YOK SAYILDI", s.stdout)

    def test_ssh_alani_dolu_ise_hedef_belirsiz_sayilir_silme_yok(self):
        """sftp `ssh = ssh u@127.0.0.1` dış komutu gerçek hedefi gizleyebilir: ayarda ya da bağlantı dizesinde -> yerel."""
        s = self.yerel_hedef_dogrula("uz:kova", SAHTE_REMOTELAR="uz sftp", SAHTE_ALANLAR="uz host=203.0.113.9\nuz ssh=ssh u@127.0.0.1")
        self.assertIn("ssh alanı dolu", s.stdout)
        self.temizle_yedekler()
        self.yerel_hedef_dogrula("uz:kova", SAHTE_REMOTELAR="uz sftp", SAHTE_ALANLAR="uz ssh=ssh -p 22 u@203.0.113.9")   # ssh komutu dış adres bile olsa belirsiz
        self.temizle_yedekler()
        self.yerel_hedef_dogrula(":sftp,host=203.0.113.9,ssh='ssh u@127.0.0.1':kova")
        self.temizle_yedekler()
        self.yerel_hedef_dogrula(":sftp,host=203.0.113.9,ssh=ssh:kova")

    def test_unix_socket_emulator_ve_ek_adres_alanlari_yerel_sayilir(self):
        """webdav unix_socket (yerel soket), azure use_emulator, swift storage_url, pcloud hostname -> bu makine: silme yok."""
        durumlar = [
            ("wd webdav", "wd url=http://uzak.example.com/\nwd unix_socket=/run/dav.sock", "unix_socket alanı dolu"),
            ("wd azureblob", "wd account=a\nwd use_emulator=true", "use_emulator açık"),
            ("wd swift", "wd storage_url=http://127.0.0.1:8080/v1/x", None),
            ("wd pcloud", "wd hostname=localhost", None),
        ]
        for remotelar, alanlar, beklenen in durumlar:
            with self.subTest(remotelar=remotelar):
                self.temizle_yedekler()
                s = self.yerel_hedef_dogrula("wd:kova", SAHTE_REMOTELAR=remotelar, SAHTE_ALANLAR=alanlar)
                if beklenen:
                    self.assertIn(beklenen, s.stdout)
        self.temizle_yedekler()
        self.yerel_hedef_dogrula(":webdav,url='http://uzak.example.com/',unix_socket=/run/dav.sock:kova")
        # use_emulator=false ve boş unix_socket hedefi belirsiz yapmaz
        self.temizle_yedekler()
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(hedef="wd:kova", SAHTE_REMOTELAR="wd azureblob", SAHTE_ALANLAR="wd use_emulator=false\nwd unix_socket=")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertNotIn("SAYILMADI", s.stdout)
        self.assertFalse(any(self.var(eski, t) for t in ("db", "medya", "sha")))

    def test_bos_ssh_alani_hedefi_belirsiz_yapmaz(self):
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(hedef="uz:kova", SAHTE_REMOTELAR="uz sftp", SAHTE_ALANLAR="uz host=203.0.113.9\nuz ssh=")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertNotIn("SAYILMADI", s.stdout)
        self.assertFalse(any(self.var(eski, t) for t in ("db", "medya", "sha")))

    def test_rclone_komutu_guvenli_ayristirilir_glob_genislemez(self):
        betik = (betik_dizini() / "disari-kopyala.sh").read_text()
        self.assertIn('read -ra RCLONE <<<"${RCLONE_KOMUTU:-rclone}"', betik)
        self.assertNotIn("RCLONE=(${RCLONE_KOMUTU", betik)
        # Davranış: glob karakterli bir RCLONE_KOMUTU dosya adlarına genişletilmez.
        (self.kok / "bin" / "x1").write_text("")
        (self.kok / ".env").write_text(f"YEDEK_DIZINI={self.yedekler}\nYEDEK_UZAK_HEDEF=b2:kova\n")
        s = subprocess.run(["bash", "-c", f"cd {self.kok} && RCLONE_KOMUTU='{self.kok}/bin/x*' bash scripts/disari-kopyala.sh"],
                           capture_output=True, text=True, env={"PATH": os.environ["PATH"], "HOME": str(self.kok)}, timeout=30)
        self.assertIn("rclone kurulu değil", s.stdout)

    def test_baska_makineyi_gosteren_ag_turu_sunucu_disi_sayilir_ve_silinir(self):
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(hedef="uz:kova", SAHTE_REMOTELAR="uz sftp", SAHTE_ALANLAR="uz host=203.0.113.9\nuz port=22")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertNotIn("SAYILMADI", s.stdout)
        self.assertFalse(any(self.var(eski, t) for t in ("db", "medya", "sha")))
        # Ağ türü, rclone'un özellik bilgisine güvenmeden indirerek doğrulanmalı.
        self.assertEqual(json.loads((self.yedekler / "uzak-dogrulama.json").read_text())["yontem"], "indirerek-ozet-yok")

    def test_union_upstreams_guvenli_ayristirilir(self):
        # Tırnaklı, boşluk ve glob karakteri içeren öğeler bölünmez/genişlemez; yerel öğe varsa yerel sayılır.
        self.yerel_hedef_dogrula("bir:kova", SAHTE_REMOTELAR="bir union", SAHTE_ALANLAR='bir upstreams=b2:a "/var/yedek kopya" b2:*')
        self.temizle_yedekler()
        self.yerel_hedef_dogrula("bir:kova", SAHTE_REMOTELAR="bir combine", SAHTE_ALANLAR="bir upstreams=a=b2:x b=/var/yerel")
        # Hepsi uzaksa silme çalışır.
        self.temizle_yedekler()
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(hedef="bir:kova", SAHTE_REMOTELAR="bir union\nb2 b2", SAHTE_ALANLAR='bir upstreams=b2:a "b2:b c"')
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertFalse(any(self.var(eski, t) for t in ("db", "medya", "sha")))

    def test_json_ozgur_metinler_kacirilir(self):
        for ad in ('a"b\\c', 'x\ty', 'n\nm', 'k\x01l'):
            with self.subTest(ad=ad):
                self.temizle_yedekler()
                self.ucluyu_yaz(0)
                s = self.calistir(hedef=f"{ad}:kova", SAHTE_REMOTELAR="")
                self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
                kayit = json.loads((self.yedekler / "uzak-dogrulama.json").read_text())   # geçerli JSON olmalı
                self.assertEqual(kayit["hedef"], ad.replace("\x01", " "))

    # --- Denetçi ORTA 2: özet kararı açık sorguya dayanır ---------------------------------------------------------
    def kapsam_ve_cagrilar(self, **ortam):
        self.ucluyu_yaz(40)
        self.ucluyu_yaz(5)       # saklama süresinden genç: silme adayı değil
        self.ucluyu_yaz(0)
        ortam.setdefault("SAHTE_CAGRI_GUNLUGU", str(self.kok / "cagri.log"))
        ortam.setdefault("SAHTE_KAPSAM_GUNLUGU", str(self.kok / "kapsam.log"))
        ortam.setdefault("SAHTE_ORTAM_GUNLUGU", str(self.kok / "ortam.log"))
        return self.calistir(**ortam)

    def test_ozet_sorgusu_bos_veya_hatali_ise_dogrudan_kapsamli_download(self):
        for ortam in ({"SAHTE_OZETLER": ""}, {"SAHTE_FEATURES_HATA": "1"}):
            with self.subTest(ortam=ortam):
                self.temizle_yedekler()
                for g in ("cagri.log", "kapsam.log"):
                    (self.kok / g).unlink(missing_ok=True)
                s = self.kapsam_ve_cagrilar(**ortam)
                self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
                checks = [c for c in self.cagrilar() if c.startswith("check ")]
                self.assertEqual(len(checks), 1, checks)             # boyut-only ön geçiş yok: doğrudan download
                self.assertIn("--download", checks[0])
                self.assertIn("--files-from", checks[0])
                kapsam = set((self.kok / "kapsam.log").read_text().split())
                self.assertEqual(len(kapsam), 6, kapsam)               # 40 günlük + en yeni üçlü; 5 günlük DEĞİL
                kayit = json.loads((self.yedekler / "uzak-dogrulama.json").read_text())
                self.assertEqual(set(kayit["dogrulanan"]), kapsam)
                self.assertEqual(kayit["yontem"], "indirerek-ozet-yok")
                # 40 günlük üçlü silindi; 5 günlük (kapsam dışı, doğrulanmadı) ve en yeni yerinde.
                kalan = {p.name for p in self.yedekler.glob("*.age")} | {p.name for p in self.yedekler.glob("sha256-*.txt")}
                self.assertEqual(len(kalan), 6, kalan)
                self.assertFalse(any(zaman_adi(40) in n for n in kalan))

    def test_yerel_hedefte_agir_download_yapilmaz_silme_de_yoktur(self):
        s = self.kapsam_ve_cagrilar(hedef="/var/yedek-kopya", SAHTE_OZETLER="")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertFalse(any("--download" in c for c in self.cagrilar()))
        self.assertEqual(len(list(self.yedekler.glob("db-*.age"))), 3)

    def test_ag_dosya_sistemi_turunde_ozet_sorgusu_olumlu_olsa_bile_download_kullanilir(self):
        s = self.kapsam_ve_cagrilar(hedef="sf:kova", SAHTE_OZETLER="md5 sha1")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        checks = [c for c in self.cagrilar() if c.startswith("check ")]
        self.assertEqual(len(checks), 1, checks)
        self.assertIn("--download", checks[0])
        self.assertNotIn("backend features", "\n".join(self.cagrilar()))      # güvenilmez sorgu hiç sorulmadı

    def test_check_cagrisi_icin_rclone_gunluk_ortami_temizlenir_ve_log_level_notice_verilir(self):
        s = self.kapsam_ve_cagrilar(RCLONE_LOG_LEVEL="ERROR", RCLONE_QUIET="1", RCLONE_LOG_FILE=str(self.kok / "rl.log"))
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        ortam = (self.kok / "ortam.log").read_text().splitlines()
        self.assertTrue(ortam and all(satir == "LOG_LEVEL=unset QUIET=unset LOG_FILE=unset" for satir in ortam), ortam)
        for c in (c for c in self.cagrilar() if c.startswith("check ")):
            self.assertIn("--log-level NOTICE", c)

    def test_gunluk_bastirilsa_bile_ozet_yok_metni_yedek_tetik_olarak_calisir(self):
        # features yalan söylüyor (md5 var) + günlük ortamı metni bastırmaya çalışıyor: ortam temizlendiği için metin
        # görünür, --download'a düşülür.
        s = self.kapsam_ve_cagrilar(SAHTE_HASH_YOK="1", RCLONE_LOG_LEVEL="CRITICAL", RCLONE_QUIET="1")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        checks = [c for c in self.cagrilar() if c.startswith("check ")]
        self.assertEqual(len(checks), 2, checks)
        self.assertNotIn("--download", checks[0])
        self.assertIn("--download", checks[1])
        self.assertIn("--files-from", checks[1])

    def test_indirerek_tam_dogrulama_kapsam_siniri_uygulamaz(self):
        s = self.kapsam_ve_cagrilar(YEDEK_UZAK_INDIREREK="1")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        checks = [c for c in self.cagrilar() if c.startswith("check ")]
        self.assertEqual(len(checks), 1)
        self.assertNotIn("--files-from", checks[0])

    def test_kapsamli_download_basarisizsa_hicbir_sey_silinmez(self):
        s = self.kapsam_ve_cagrilar(SAHTE_OZETLER="", SAHTE_INDIR_HATA="1")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIn("indirerek doğrulama da BAŞARISIZ", s.stdout)
        self.assertEqual(len(list(self.yedekler.glob("db-*.age"))), 3)

    @unittest.skipUnless(os.environ.get("QR_TEST_RCLONE"), "gerçek rclone yok")
    def test_gercek_rclone_ozetsiz_sftp_ve_yerel_adres_algilama(self):
        """Gerçek `rclone serve sftp` (özetsiz istemci: disable_hashcheck) + RCLONE_LOG_LEVEL=ERROR/LOG_FILE:
        yerel adres olduğu için izin verilmedikçe silme yok; izinle (deneme) silme YALNIZ --download ile olur."""
        rclone = os.environ["QR_TEST_RCLONE"]
        kok = self.kok
        (kok / "sunucu-kok").mkdir()
        with socket.socket() as sck:
            sck.bind(("127.0.0.1", 0))
            port = sck.getsockname()[1]
        sunucu = subprocess.Popen([rclone, "serve", "sftp", str(kok / "sunucu-kok"), "--addr", f"127.0.0.1:{port}", "--user", "t",
                                   "--pass", "deneme-parolasi"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                  env={"PATH": os.environ["PATH"], "HOME": str(kok)})
        self.addCleanup(sunucu.kill)
        for _ in range(50):
            with socket.socket() as c:
                if c.connect_ex(("127.0.0.1", port)) == 0:
                    break
            time.sleep(0.1)
        gizli = subprocess.run([rclone, "obscure", "deneme-parolasi"], capture_output=True, text=True).stdout.strip()
        yapilandirma = kok / "rclone.conf"
        yapilandirma.write_text(f"[sfn]\ntype = sftp\nhost = 127.0.0.1\nport = {port}\nuser = t\npass = {gizli}\n"
                                "disable_hashcheck = true\nknown_hosts_file = none\n")
        sarmalayici = kok / "rclone-sarmal.sh"
        cagri = kok / "gercek-cagri.log"
        sarmalayici.write_text(f'#!/bin/sh\nprintf "%s\\n" "$*" >> {cagri}\nexec {rclone} "$@"\n')
        ortam = {"RCLONE_KOMUTU": f"sh {sarmalayici}", "RCLONE_CONFIG": str(yapilandirma),
                 "RCLONE_LOG_LEVEL": "ERROR", "RCLONE_LOG_FILE": str(kok / "rclone-gunluk.log")}   # günlük değişkenleri artık kaldırılır
        eski = self.ucluyu_yaz(30)
        en_yeni = self.ucluyu_yaz(0)
        # 1) host 127.0.0.1: yerel adres -> sunucu dışı sayılmaz, silme yok
        s = self.calistir(hedef="sfn:", **ortam)
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIn("sunucu dışı SAYILMADI", s.stdout)
        self.assertIn("RCLONE_LOG_LEVEL", s.stdout)      # kaldırılan değişkenin adı uyarıda
        self.assertTrue(all(self.var(eski, t) for t in ("db", "medya", "sha")))
        self.assertFalse(any("--download" in c for c in cagri.read_text().splitlines()), "yerel hedefte ağır indirme yapılmamalı")
        cagri.write_text("")
        # 2) deneme izniyle: özetsiz sftp, günlük bastırılmış olsa da silme YALNIZ --download ile
        s = self.calistir(hedef="sfn:", YEDEK_YEREL_HEDEF_IZIN="1", **ortam)
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        checks = [c for c in cagri.read_text().splitlines() if c.startswith("check ")]
        self.assertTrue(checks and all("--download" in c for c in checks), checks)
        self.assertFalse(any(self.var(eski, t) for t in ("db", "medya", "sha")), "download ile doğrulandı, eski üçlü silinmeliydi")
        self.assertTrue(all(self.var(en_yeni, t) for t in ("db", "medya", "sha")))
        self.assertEqual(json.loads((self.yedekler / "uzak-dogrulama.json").read_text())["yontem"], "indirerek-ozet-yok")


    # --- Tur 2 ORTA-1: gerçek rclone ile RCLONE_* ve ssh= atlatmaları -------------------------------------------------
    def gercek_sftp_sunucusu(self, rclone):
        kok = self.kok
        (kok / "sunucu-kok").mkdir(exist_ok=True)
        with socket.socket() as sck:
            sck.bind(("127.0.0.1", 0))
            port = sck.getsockname()[1]
        sunucu = subprocess.Popen([rclone, "serve", "sftp", str(kok / "sunucu-kok"), "--addr", f"127.0.0.1:{port}", "--user", "t",
                                   "--pass", "deneme-parolasi"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                  env={"PATH": os.environ["PATH"], "HOME": str(kok)})
        self.addCleanup(sunucu.kill)
        for _ in range(50):
            with socket.socket() as c:
                if c.connect_ex(("127.0.0.1", port)) == 0:
                    break
            time.sleep(0.1)
        gizli = subprocess.run([rclone, "obscure", "deneme-parolasi"], capture_output=True, text=True).stdout.strip()
        return port, gizli

    @unittest.skipUnless(os.environ.get("QR_TEST_RCLONE"), "gerçek rclone yok")
    def test_gercek_rclone_ortam_degiskeniyle_yerele_yonlendirme_etkisizdir_yerel_uclu_silinmez(self):
        """Ayar dosyası dış bir adresi gösterir; RCLONE_SFTP_HOST=localhost / RCLONE_ALIAS_REMOTE=/yerel
        ile rclone'u yerele yönlendirmek artık işe yaramaz: ne kopyalama yerel dizine/sunucuya gider, ne yerel üçlü silinir."""
        rclone = os.environ["QR_TEST_RCLONE"]
        port, gizli = self.gercek_sftp_sunucusu(rclone)
        yerel_dizin = self.kok / "yerel-dizin"
        yerel_dizin.mkdir()
        yapilandirma = self.kok / "rclone.conf"
        yapilandirma.write_text("[dis]\ntype = sftp\nhost = 192.0.2.1\nuser = t\nconnect_timeout = 2s\nknown_hosts_file = none\n"
                                "[al]\ntype = alias\nremote = dis:kova\n")
        eski = self.ucluyu_yaz(30)
        en_yeni = self.ucluyu_yaz(0)
        senaryolar = (
            ("dis:kova", {"RCLONE_SFTP_HOST": "127.0.0.1", "RCLONE_SFTP_PORT": str(port), "RCLONE_SFTP_USER": "t", "RCLONE_SFTP_PASS": gizli,
                          "RCLONE_SFTP_KNOWN_HOSTS_FILE": "none", "RCLONE_CONFIG_DIS_HOST": "localhost"}),
            ("al:", {"RCLONE_ALIAS_REMOTE": str(yerel_dizin)}),
            ("dis:kova", {"RCLONE_SFTP_SSH": "ssh u@127.0.0.1", "RCLONE_SIZE_ONLY": "true"}),
        )
        for hedef, degisken in senaryolar:
            with self.subTest(hedef=hedef, degisken=sorted(degisken)):
                s = self.calistir(hedef=hedef, RCLONE_KOMUTU=rclone, RCLONE_CONFIG=str(yapilandirma), **degisken)
                self.assertTrue(all(self.var(eski, t) for t in ("db", "medya", "sha")), s.stdout + s.stderr)
                self.assertTrue(all(self.var(en_yeni, t) for t in ("db", "medya", "sha")))
                self.assertEqual(list(yerel_dizin.iterdir()), [], "ortam değişkeni rclone'u yerel dizine yönlendirmemeli")
                self.assertEqual(list((self.kok / "sunucu-kok").iterdir()), [], "ortam değişkeni rclone'u yerel sunucuya yönlendirmemeli")
                self.assertIn(sorted(degisken)[0], s.stdout)       # kaldırılan değişkenin adı uyarıda
                self.assertNotIn("SİLİNDİ", (self.yedekler / "yedek-gunlugu.log").read_text() if (self.yedekler / "yedek-gunlugu.log").exists() else "")

    @unittest.skipUnless(os.environ.get("QR_TEST_RCLONE"), "gerçek rclone yok")
    def test_gercek_rclone_ayarda_ssh_dolu_veya_yerel_alias_ise_silme_yok(self):
        rclone = os.environ["QR_TEST_RCLONE"]
        port, gizli = self.gercek_sftp_sunucusu(rclone)
        yerel_dizin = self.kok / "yerel-dizin"
        yerel_dizin.mkdir()
        yapilandirma = self.kok / "rclone.conf"
        yapilandirma.write_text(f"[sshli]\ntype = sftp\nhost = 192.0.2.1\nuser = t\nssh = ssh t@127.0.0.1\nconnect_timeout = 2s\n"
                                f"[yerelal]\ntype = alias\nremote = {yerel_dizin}\n")
        eski = self.ucluyu_yaz(30)
        self.ucluyu_yaz(0)
        s = self.calistir(hedef="sshli:kova", RCLONE_KOMUTU=rclone, RCLONE_CONFIG=str(yapilandirma))
        self.assertIn("ssh alanı dolu", s.stdout)
        self.assertIn("sunucu dışı SAYILMADI", s.stdout)
        self.assertTrue(all(self.var(eski, t) for t in ("db", "medya", "sha")))
        s = self.calistir(hedef="yerelal:", RCLONE_KOMUTU=rclone, RCLONE_CONFIG=str(yapilandirma))
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIn("sunucu dışı SAYILMADI", s.stdout)
        self.assertTrue(all(self.var(eski, t) for t in ("db", "medya", "sha")))
        self.assertGreater(len(list(yerel_dizin.iterdir())), 0)    # yine de kopyalandı

    # --- Tur 2 DÜŞÜK: "zaman" = en yeni TAM üçlü uzakta doğrulandı --------------------------------------------------------
    def kayit(self):
        return json.loads((self.yedekler / "uzak-dogrulama.json").read_text())

    def test_zaman_en_yeni_tam_uclu_dogrulaninca_kapsamli_downloadda_da_guncellenir(self):
        self.ucluyu_yaz(40)
        z = self.ucluyu_yaz(0)
        s = self.calistir(SAHTE_OZETLER="")      # özet yok -> kapsamlı --download
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        k = self.kayit()
        self.assertEqual(k["yontem"], "indirerek-ozet-yok")
        self.assertIsNotNone(k["zaman"])
        self.assertTrue({f"db-{z}.dump.age", f"medya-{z}.tar.gz.age", f"sha256-{z}.txt"} <= set(k["dogrulanan"]))

    def test_zaman_en_yeni_tam_uclu_uzakta_dogrulanmadiysa_guncellenmez(self):
        self.ucluyu_yaz(40)
        self.ucluyu_yaz(0)
        self.calistir()
        ilk = self.kayit()["zaman"]
        self.assertIsNotNone(ilk)
        time.sleep(1.1)
        z2 = self.ucluyu_yaz(0, saat=5)                        # daha yeni tam üçlü, uzağa kopyalanmayacak
        s = self.calistir(SAHTE_ATLA=f"*{z2}*", SAHTE_OZETLER="")
        k = self.kayit()
        self.assertEqual(k["zaman"], ilk, s.stdout)
        self.assertFalse(any(z2 in ad for ad in k["dogrulanan"]))

    def test_zaman_yalniz_yetim_dosya_varsa_tam_uclu_yoksa_guncellenmez(self):
        self.ucluyu_yaz(0, medya=False, sha=False)             # yalnızca db: tam üçlü yok
        s = self.calistir()
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIsNone(self.kayit()["zaman"])

    def test_zaman_baska_dosya_dogrulanamasa_bile_en_yeni_tam_uclu_dogrulandiysa_guncellenir(self):
        z_yetim = self.ucluyu_yaz(2, medya=False, sha=False)   # uzağa kopyalanmayacak yetim dosya -> check başarısız
        z = self.ucluyu_yaz(0)
        s = self.calistir(SAHTE_ATLA=f"*{z_yetim}*")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        k = self.kayit()
        self.assertIsNotNone(k["zaman"])
        self.assertTrue({f"db-{z}.dump.age", f"medya-{z}.tar.gz.age", f"sha256-{z}.txt"} <= set(k["dogrulanan"]))

    def test_betik_yorumu_zaman_anlamini_dogru_belirtir(self):
        betik = (betik_dizini() / "disari-kopyala.sh").read_text()
        self.assertNotIn("yalnızca TÜM yerel dosyalar doğrulandığında yenilenir", betik)
        self.assertIn("EN YENİ TAM yerel üçlünün", betik)


class BetikIcerikTesti(SimpleTestCase):
    def test_yedek_al_silme_yapmaz_ve_duz_yedek_yazmaz(self):
        betik = (betik_dizini() / "yedek-al.sh").read_text()
        kod = "\n".join(s for s in betik.splitlines() if not s.lstrip().startswith("#"))
        # Eski yedekleri silen komutlar kaldırıldı.
        self.assertNotIn("-mtime", kod)
        self.assertNotIn("-delete", kod)
        self.assertNotRegex(kod, r"rm [^\n]*HEDEF")
        self.assertNotIn("YEDEK_SAKLAMA_GUN", kod)
        # Şifreleme ve doğrulama adımları var, düz çıktı yalnızca tmpfs (/tmp) içinde.
        self.assertIn('age -r "$YEDEK_ALICI"', kod)
        self.assertIn("pg_restore --list", kod)
        self.assertIn("GECICI=/tmp", kod)
        self.assertNotIn('-f "$HEDEF', kod)
        self.assertNotIn('> "$HEDEF', kod)
        self.assertIn("pipefail", kod)
        self.assertIn("YEDEK_ALICI tanımlı değil", kod)

    def test_disari_kopyala_dogrulama_ve_kurallar(self):
        betik = (betik_dizini() / "disari-kopyala.sh").read_text()
        for parca in ("rclone check", "--one-way", "uzak-dogrulama.json", "EN_YENI", "YEDEK_SAKLAMA_GUN"):
            self.assertIn(parca, betik)

    def test_ortak_coz_log_driver_none_kullanir_ve_hassas_cikti_veren_docker_run_cagrilari_hep_log_driver_none(self):
        import re
        # Düz döküm/medya stdout'tan akan tüm `docker run` çağrıları günlük sürücüsüne yazmamalı.
        ortak = (betik_dizini() / "yedek-ortak.sh").read_text()
        coz = ortak[ortak.index("ortak_coz() {"):]
        coz = coz[:coz.index("\n}\n")]
        self.assertIn("docker run --rm --log-driver none", coz)
        for ad in ("yedek-ortak.sh", "yedek-anahtari-hazirla.sh"):
            kod = "\n".join(s for s in (betik_dizini() / ad).read_text().splitlines() if not s.lstrip().startswith("#"))
            for m in re.finditer(r"docker run [^\n]*", kod):
                self.assertIn("--log-driver none", m.group(0), f"{ad}: {m.group(0)}")
        # docker exec / compose exec çıktısı istemciye gider (günlük sürücüsüne değil); detached `docker run -d` yalnızca
        # PostgreSQL sunucu günlüğünü üretir, döküm içeriği oraya yazılmaz.

    def test_guncelle_app_no_deps_ve_caddy_dogrulamasi(self):
        kod = "\n".join(s for s in (betik_dizini() / "guncelle.sh").read_text().splitlines() if not s.lstrip().startswith("#"))
        self.assertIn("docker compose up -d --no-deps app", kod)
        self.assertNotRegex(kod, r"docker compose up -d app\b")
        # Yeni Caddyfile, eski Caddy'ye dokunulmadan doğrulanır; yeniden oluşturmadan ÖNCE.
        dogrula = "docker compose run --rm -T --no-deps --entrypoint caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile"
        self.assertIn(dogrula, kod)
        self.assertLess(kod.index(dogrula), kod.index("--force-recreate --no-deps caddy"))
        self.assertIn("Eski Caddy'ye DOKUNULMADI", kod)
        # Caddy doğrulaması RestartCount 0 ister.
        self.assertIn("{{.RestartCount}}", kod)
        self.assertRegex(kod, r'RestartCount\}\}[^\n]*= "0"')

    def test_yedek_dongusu_temizlik_icerir(self):
        # Döngü temizliği (tarama/sayaç) korunur; döngüde yedek dosyası silme yok.
        betik = (betik_dizini() / "yedek-dongu.sh").read_text()
        self.assertIn("DELETE FROM qr_denemesayaci WHERE bitis < now()", betik)
        self.assertNotIn("rm -f", betik)

    def test_betikler_gizli_bilgi_icermez(self):
        for ad in ("yedek-al.sh", "disari-kopyala.sh", "geri-yukle.sh", "geri-yukleme-testi.sh", "yedek-anahtari-hazirla.sh", "yedek-ortak.sh"):
            metin = (betik_dizini() / ad).read_text()
            # Betikler anahtarı doğrulayan desen içerir ("AGE-SECRET-KEY-1[A-Z0-9]+"); gerçek bir anahtar değeri içermemelidir.
            self.assertIsNone(re.search(r"AGE-SECRET-KEY-1[A-Z0-9]{20,}", metin), ad)

    def test_compose_yedek_servisine_ozel_anahtar_verilmez(self):
        yol = betik_dizini().parent / "docker-compose.yml"
        metin = yol.read_text()
        yedek = metin[metin.index("\n  yedek:"):metin.index("\nvolumes:")]
        self.assertIn("YEDEK_ALICI", yedek)
        self.assertNotIn("gizli", yedek)
        self.assertNotIn("yedek-anahtari", yedek)
        self.assertIn("/tmp", yedek)


SAHTE_DOCKER = """#!/bin/sh
# Sahte docker: her çağrıyı günlüğe yazar ve başarılı döner (gerçek konteyner çalıştırılmaz).
printf '%s\\n' "$*" >> "$SAHTE_DOCKER_GUNLUGU"
exit 0
"""

KOTU_ADLAR = [
    "db-20261015-031500.dump.age; touch PWNED",
    "db-20261015-031500.dump.age$(touch PWNED)",
    "db-20261015-031500.dump.age`touch PWNED`",
    "db-20261015-031500.dump.age.evil",
    "db-20261015-031500.dump.age\ntouch PWNED",
    "db-2026101-031500.dump.age",
    "../db-20261015-031500.dump.age",
    "x-db-20261015-031500.dump.age",
    "sha256-20261015-031500.txt.bak",
    "medya-20261015-031500.tar.gz.age|id",
]
IYI_ADLAR = ["db-20261015-031500.dump.age", "medya-20261015-031500.tar.gz.age", "sha256-20261015-031500.txt"]


class YedekAdiEnjeksiyonTesti(SimpleTestCase):
    """Yedek dosya adları katı doğrulanır; kötü adlar komut çalıştıramaz (geri-yukleme-testi/geri-yukle/ortak)."""

    def setUp(self):
        self.kok = Path(tempfile.mkdtemp(prefix="qr-ad-"))
        self.addCleanup(shutil.rmtree, self.kok, ignore_errors=True)
        (self.kok / "scripts").mkdir()
        for ad in ("yedek-ortak.sh", "geri-yukleme-testi.sh", "geri-yukle.sh"):
            shutil.copy(betik_dizini() / ad, self.kok / "scripts" / ad)
        (self.kok / "bin").mkdir()
        docker = self.kok / "bin" / "docker"
        docker.write_text(SAHTE_DOCKER)
        docker.chmod(0o755)
        self.gunluk = self.kok / "docker.log"
        self.yedekler = self.kok / "yedekler"
        self.yedekler.mkdir()
        (self.kok / "gizli").mkdir()
        (self.kok / "gizli" / "yedek-anahtari.txt").write_text("sahte-anahtar-yok\n")
        (self.kok / ".env").write_text(f"POSTGRES_USER=u\nPOSTGRES_DB=d\nYEDEK_DIZINI={self.yedekler}\n")

    def ortam(self):
        return {"PATH": f"{self.kok / 'bin'}:{os.environ['PATH']}", "HOME": str(self.kok), "SAHTE_DOCKER_GUNLUGU": str(self.gunluk)}

    def dogrulayici(self, islev, ad):
        return subprocess.run(["bash", "-c", f'. "{self.kok}/scripts/yedek-ortak.sh"; {islev} "$1"', "_", ad],
                              capture_output=True, text=True, env=self.ortam(), timeout=30).returncode

    def test_ad_dogrulayici_iyi_adlari_kabul_kotu_adlari_reddeder(self):
        for ad in IYI_ADLAR:
            self.assertEqual(self.dogrulayici("ortak_ad_gecerli_mi", ad), 0, ad)
        for ad in KOTU_ADLAR:
            self.assertNotEqual(self.dogrulayici("ortak_ad_gecerli_mi", ad), 0, repr(ad))

    def test_eski_sifresiz_adlar_yalniz_eski_dogrulayicidan_gecer(self):
        self.assertEqual(self.dogrulayici("ortak_eski_ad_gecerli_mi", "db-20261015-031500.dump"), 0)
        self.assertNotEqual(self.dogrulayici("ortak_ad_gecerli_mi", "db-20261015-031500.dump"), 0)
        self.assertNotEqual(self.dogrulayici("ortak_eski_ad_gecerli_mi", "db-20261015-031500.dump; id"), 0)

    def test_geri_yukleme_testi_kotu_adli_dosyayi_reddeder(self):
        kotu = "db-20261015-031500;touch PWNED;x.dump.age"
        (self.yedekler / kotu).write_bytes(b"age-encryption.org/v1\n")
        sonuc = subprocess.run(["bash", str(self.kok / "scripts" / "geri-yukleme-testi.sh"), str(self.yedekler / kotu)],
                               capture_output=True, text=True, env=self.ortam(), timeout=60, cwd=self.kok)
        self.assertNotEqual(sonuc.returncode, 0)
        self.assertIn("geçersiz yedek dosya adı reddedildi", sonuc.stdout)
        gunluk = self.gunluk.read_text() if self.gunluk.exists() else ""
        # Konteyner hiç başlatılmadı/komut çalıştırılmadı; ad hiçbir docker çağrısına girmedi.
        self.assertNotIn("PWNED", gunluk)
        self.assertNotIn("exec", gunluk)
        self.assertFalse((self.kok / "PWNED").exists())

    def test_geri_yukleme_testi_otomatik_secimde_kotu_adlari_atlar(self):
        (self.yedekler / "db-20261015-031500.dump.age;touch PWNED").write_bytes(b"x")
        sonuc = subprocess.run(["bash", str(self.kok / "scripts" / "geri-yukleme-testi.sh")],
                               capture_output=True, text=True, env=self.ortam(), timeout=60, cwd=self.kok)
        self.assertNotEqual(sonuc.returncode, 0)
        self.assertIn("bulunamadı", sonuc.stdout)
        self.assertNotIn("PWNED", self.gunluk.read_text() if self.gunluk.exists() else "")

    def test_geri_yukle_kotu_adli_dosyayi_reddeder_ve_hicbir_sey_calistirmaz(self):
        kotu = "db-20261015-031500.dump.age$(touch PWNED)"
        (self.yedekler / kotu).write_bytes(b"age-encryption.org/v1\n")
        sonuc = subprocess.run(["bash", str(self.kok / "scripts" / "geri-yukle.sh"), str(self.yedekler / kotu)],
                               capture_output=True, text=True, env=self.ortam(), timeout=60, cwd=self.kok, input="EVET\n")
        self.assertNotEqual(sonuc.returncode, 0)
        self.assertIn("geçersiz", sonuc.stdout)
        self.assertFalse(self.gunluk.exists() and self.gunluk.read_text().strip())
        self.assertFalse((self.kok / "PWNED").exists())

    def test_betiklerde_ad_kabuk_metnine_gomulmez(self):
        for ad in ("geri-yukleme-testi.sh", "geri-yukle.sh", "yedek-ortak.sh", "disari-kopyala.sh"):
            kod = "\n".join(s for s in (betik_dizini() / ad).read_text().splitlines() if not s.lstrip().startswith("#"))
            self.assertNotRegex(kod, r'sh -c "[^"]*\$(YEDEK_AD|MEDYA_AD|\{YEDEK_AD|\{MEDYA_AD)', ad)
        self.assertNotIn("\\..*", (betik_dizini() / "yedek-ortak.sh").read_text())



# ---------------------------------------------------------------------------------------------------------------
# Risk 1: özel anahtar sunucudan kaldırılabilir; ekranda bir kez gösterilir, gizli girişle sorulur, bellekte tutulur.
# ---------------------------------------------------------------------------------------------------------------
SAHTE_ANAHTAR = "AGE-SECRET-KEY-1" + "Q" * 58          # uydurma, hiçbir şeyi açmaz
SAHTE_ACIK = "age1" + "q" * 58

SAHTE_DOCKER_2 = r"""#!/bin/sh
# Sahte docker: çağrıları günlüğe yazar. age-keygen:
#   -o (üretim): "-v DIZIN:/cikti" bind-mount dizinine DIZIN/anahtar.txt yazar (stdout'a HİÇBİR ŞEY yazmaz; gerçek age-keygen -o gibi
#                yalnızca stderr'e "Public key:" basar). Anahtar stdout'a yazılırsa sızıntı olurdu.
#   -y (türetme): "-v DOSYA:/anahtar/yedek-anahtari.txt:ro" dosyasındaki "# public key:" satırını basar
#                (SAHTE_TURET_FARKLI=1 ise başka bir açık anahtar basar).
# Anahtar bağlanıyorsa kaynağın izni ve geçerli anahtar satırı içerip içermediği SAHTE_PROBE'a yazılır.
printf '%s\n' "$*" >> "$SAHTE_DOCKER_GUNLUGU"
case "$*" in
  *age-keygen*)
    mnt=""; mod=""
    for a in "$@"; do
      case "$a" in
        *:/cikti) mnt="${a%:/cikti}"; mod=uret ;;
        *:/anahtar/yedek-anahtari.txt:ro) mnt="${a%:/anahtar/yedek-anahtari.txt:ro}"; mod=turet ;;
      esac
    done
    if [ "$mod" = uret ]; then
      [ "${SAHTE_URETIM_HATA:-0}" = "1" ] && { echo "sahte uretim hatasi" >&2; exit 1; }
      ( umask 077; printf '# created: 2026-10-15T00:00:00Z\n# public key: %s\n%s\n' "$SAHTE_ACIK" "$SAHTE_ANAHTAR" > "$mnt/anahtar.txt" )
      echo "Public key: $SAHTE_ACIK" >&2
      [ "${SAHTE_URETIM_BEKLE:-0}" = "1" ] && sleep 30   # üretim sürerken kesinti testi (anahtar dosyası yazıldı, konteyner sürüyor)
      exit 0
    fi
    if [ "$mod" = turet ]; then
      if [ "${SAHTE_TURET_FARKLI:-0}" = "1" ]; then echo "age1zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"; else sed -n 's/^# public key: //p' "$mnt"; fi
      exit 0
    fi
    exit 0 ;;
esac
for a in "$@"; do
  case "$a" in
    *:/anahtar/yedek-anahtari.txt:ro)
      k="${a%%:/anahtar/yedek-anahtari.txt:ro}"
      printf '%s %s %s\n' "$k" "$(stat -c %a "$k")" "$(grep -c '^AGE-SECRET-KEY-1' "$k")" >> "${SAHTE_PROBE:-/dev/null}" ;;
  esac
done
exit 0
"""


def pty_ile_calistir(komut, env, cwd, yanitlar, girdi=None, zaman_asimi=60):
    """Betiği KONTROL EDEN TERMİNALİ (/dev/tty) olan bir ortamda çalıştırır; stdout/stderr ayrı borulardır.
    yanitlar: [(beklenen_metin, gönderilecek_metin)] sırayla terminale yazılır (gizli girişte yankı olmaz).
    Dönüş: (çıkış kodu, stdout, stderr, terminal_kaydı)."""
    master, slave = pty.openpty()

    def hazirla():
        os.setsid()
        fcntl.ioctl(slave, termios.TIOCSCTTY, 0)

    p = subprocess.Popen(komut, stdin=subprocess.PIPE if girdi is not None else subprocess.DEVNULL, stdout=subprocess.PIPE,
                         stderr=subprocess.PIPE, env=env, cwd=cwd, preexec_fn=hazirla, text=False)
    if girdi is not None:
        p.stdin.write(girdi.encode())
        p.stdin.close()
    kayit = b""
    tampon = b""
    sira = 0
    bitis = time.time() + zaman_asimi
    while p.poll() is None and time.time() < bitis:
        if select.select([master], [], [], 0.1)[0]:
            try:
                veri = os.read(master, 4096)
            except OSError:
                break
            kayit += veri
            tampon += veri
        if sira < len(yanitlar) and yanitlar[sira][0].encode() in tampon:
            if isinstance(yanitlar[sira][1], int):      # sayı = gönderilecek sinyal (ör. signal.SIGTERM)
                pty_ile_calistir.sinyal_aninda_echo = bool(termios.tcgetattr(slave)[3] & termios.ECHO)
                os.killpg(p.pid, yanitlar[sira][1])      # oturum/grup lideri: tüm süreç grubuna (boru hattı alt kabukları dahil)
            else:
                os.write(master, yanitlar[sira][1].encode())
            tampon = b""
            sira += 1
    if p.poll() is None:
        p.kill()
    cikti, hata = p.communicate()
    try:
        while select.select([master], [], [], 0.2)[0]:
            kayit += os.read(master, 4096)
    except OSError:
        pass
    pty_ile_calistir.son_echo = bool(termios.tcgetattr(slave)[3] & termios.ECHO)
    os.close(slave)
    os.close(master)
    return p.returncode, cikti.decode(), hata.decode(), kayit.decode(errors="replace")


class AnahtarTestTabani(SimpleTestCase):
    betikler = ("yedek-ortak.sh", "yedek-anahtari-hazirla.sh", "geri-yukleme-testi.sh", "geri-yukle.sh")

    def setUp(self):
        self.kok = Path(tempfile.mkdtemp(prefix="qr-anahtar-"))
        self.addCleanup(shutil.rmtree, self.kok, ignore_errors=True)
        (self.kok / "scripts").mkdir()
        for ad in self.betikler:
            shutil.copy(betik_dizini() / ad, self.kok / "scripts" / ad)
        (self.kok / "bin").mkdir()
        docker = self.kok / "bin" / "docker"
        docker.write_text(SAHTE_DOCKER_2)
        docker.chmod(0o755)
        self.gunluk = self.kok / "docker.log"
        self.probe = self.kok / "probe.log"
        self.yedekler = self.kok / "yedekler"
        self.yedekler.mkdir()
        self.anahtar = self.kok / "gizli" / "yedek-anahtari.txt"

    def env_yaz(self, alici=True):
        (self.kok / ".env").write_text(f"POSTGRES_USER=u\nPOSTGRES_DB=d\nYEDEK_DIZINI={self.yedekler}\n" + (f"YEDEK_ALICI={SAHTE_ACIK}\n" if alici else ""))

    def ortam(self):
        return {"PATH": f"{self.kok / 'bin'}:{os.environ['PATH']}", "HOME": str(self.kok), "SAHTE_DOCKER_GUNLUGU": str(self.gunluk),
                "SAHTE_PROBE": str(self.probe), "SAHTE_ACIK": SAHTE_ACIK, "SAHTE_ANAHTAR": SAHTE_ANAHTAR}

    def tty_siz(self, betik, *argumanlar, girdi=""):
        # start_new_session: kontrol eden terminal yok -> /dev/tty açılamaz (cron / ssh -T durumu)
        return subprocess.run(["bash", str(self.kok / "scripts" / betik), *argumanlar], capture_output=True, text=True,
                              env=self.ortam(), cwd=self.kok, input=girdi, timeout=60, start_new_session=True)

    def tty_li(self, betik, *argumanlar, yanitlar=(), girdi=None):
        return pty_ile_calistir(["bash", str(self.kok / "scripts" / betik), *argumanlar], self.ortam(), self.kok, list(yanitlar), girdi=girdi)

    def docker_cagrilari(self):
        return self.gunluk.read_text().splitlines() if self.gunluk.exists() else []


class AnahtarUretimiVeSilmeTesti(AnahtarTestTabani):
    """yedek-anahtari-hazirla.sh: ekranda bir kez gösterim, EVET onayıyla sunucudan kaldırma, onay/tty yoksa uyarı."""

    def test_anahtar_dosyasi_yoksa_ve_alici_varsa_yeni_anahtar_uretilmez(self):
        # Anahtar sunucudan kaldırıldı (beklenen durum): yeni anahtar üretilirse eski yedekler açılamazdı.
        self.env_yaz(alici=True)
        env_once = (self.kok / ".env").read_text()
        s = self.tty_siz("yedek-anahtari-hazirla.sh")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIn("Yeni anahtar ÜRETİLMEDİ", s.stdout)
        self.assertFalse(any("age-keygen" in c for c in self.docker_cagrilari()), "age-keygen çağrılmamalıydı")
        self.assertFalse(self.anahtar.exists())
        self.assertEqual((self.kok / ".env").read_text(), env_once)
        # Aynısı terminalli ortamda da geçerli (kurulum.sh/guncelle.sh etkileşimli çalışır): hiçbir soru sorulmaz.
        kod, cikti, hata, terminal = self.tty_li("yedek-anahtari-hazirla.sh")
        self.assertEqual(kod, 0, hata + cikti)
        self.assertFalse(any("age-keygen" in c for c in self.docker_cagrilari()))
        self.assertFalse(self.anahtar.exists())
        self.assertNotIn(SAHTE_ANAHTAR, terminal)

    def test_tirnakli_veya_export_alici_varken_yeni_anahtar_uretilmez(self):
        for satir in (f'YEDEK_ALICI="{SAHTE_ACIK}"', f"YEDEK_ALICI='{SAHTE_ACIK}'", f"export YEDEK_ALICI={SAHTE_ACIK}"):
            with self.subTest(satir=satir):
                (self.kok / ".env").write_text(f"POSTGRES_USER=u\nPOSTGRES_DB=d\nYEDEK_DIZINI={self.yedekler}\n{satir}\n")
                s = self.tty_siz("yedek-anahtari-hazirla.sh")
                self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
                self.assertIn("Yeni anahtar ÜRETİLMEDİ", s.stdout)
                self.assertFalse(any("age-keygen" in c for c in self.docker_cagrilari()))
                self.assertEqual((self.kok / ".env").read_text().count("YEDEK_ALICI"), 1)

    def test_tty_yoksa_anahtar_uretilir_ama_silinmez_ve_buyuk_harfli_uyari_basilir(self):
        self.env_yaz(alici=False)
        s = self.tty_siz("yedek-anahtari-hazirla.sh")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertTrue(self.anahtar.exists(), "tty yokken silme yapılmamalı")
        self.assertEqual(oct(self.anahtar.stat().st_mode & 0o777), "0o600")
        self.assertIn("ÖZEL ANAHTAR HÂLÂ SUNUCUDA", s.stdout)
        self.assertIn("SUNUCU ELE GEÇİRİLİRSE YEDEKLER AÇILABİLİR", s.stdout)
        self.assertNotIn(SAHTE_ANAHTAR, s.stdout + s.stderr)     # tty yokken ekrana/çıktıya da yazılmaz
        self.assertIn(f"YEDEK_ALICI={SAHTE_ACIK}", (self.kok / ".env").read_text())

    def test_evet_onayi_ozel_anahtari_siler_acik_anahtar_env_de_kalir(self):
        self.env_yaz(alici=False)
        kod, cikti, hata, terminal = self.tty_li("yedek-anahtari-hazirla.sh", yanitlar=[("(EVET): ", "EVET\n"), ("(görünmez): ", SAHTE_ANAHTAR + "\n")])
        self.assertEqual(kod, 0, hata + cikti)
        self.assertFalse(self.anahtar.exists(), "EVET ile özel anahtar dosyası kaldırılmalı")
        self.assertIn("SİLİNDİ", cikti)
        self.assertIn(f"YEDEK_ALICI={SAHTE_ACIK}", (self.kok / ".env").read_text())
        # Anahtar yalnızca terminale yazıldı; betiğin stdout/stderr'ine (tee/günlük) DÜŞMEDİ.
        self.assertIn(SAHTE_ANAHTAR, terminal)
        self.assertNotIn(SAHTE_ANAHTAR, cikti + hata)
        self.assertEqual(terminal.count(SAHTE_ANAHTAR), 1, "anahtar yalnızca bir kez gösterilmeli")

    def test_evet_disinda_bir_yanit_dosyayi_birakir_ve_uyarir(self):
        for yanit in ("hayır\n", "evet\n", "\n"):
            with self.subTest(yanit=yanit):
                shutil.rmtree(self.kok / "gizli", ignore_errors=True)
                self.env_yaz(alici=False)
                kod, cikti, hata, terminal = self.tty_li("yedek-anahtari-hazirla.sh", yanitlar=[("(EVET): ", yanit)])
                self.assertEqual(kod, 0, hata + cikti)
                self.assertTrue(self.anahtar.exists())
                self.assertIn("ÖZEL ANAHTAR HÂLÂ SUNUCUDA", cikti)
                self.assertIn("SUNUCU ELE GEÇİRİLİRSE YEDEKLER AÇILABİLİR", cikti)
                self.assertNotIn(SAHTE_ANAHTAR, cikti + hata)

    def test_evet_sonrasi_yapistirilan_anahtar_uyusmazsa_dosya_kalir(self):
        # Tek bir EVET ile geri dönüşsüz kayıp olmamalı: yanlış/eksik yapıştırma veya boş giriş dosyayı bırakır.
        for yapistirilan in ("AGE-SECRET-KEY-1" + "Z" * 58 + "\n", SAHTE_ANAHTAR[:-4] + "\n", "\n"):
            with self.subTest(yapistirilan=yapistirilan[:20]):
                shutil.rmtree(self.kok / "gizli", ignore_errors=True)
                self.env_yaz(alici=False)
                kod, cikti, hata, terminal = self.tty_li(
                    "yedek-anahtari-hazirla.sh", yanitlar=[("(EVET): ", "EVET\n"), ("(görünmez): ", yapistirilan)])
                self.assertEqual(kod, 0, hata + cikti)
                self.assertTrue(self.anahtar.exists(), "uyuşmayan yapıştırmada dosya silinmemeli")
                self.assertIn("UYUŞMADI", cikti)
                self.assertIn("ÖZEL ANAHTAR HÂLÂ SUNUCUDA", cikti)
                self.assertNotIn(SAHTE_ANAHTAR, cikti + hata)
                self.assertNotIn(yapistirilan.strip() or "YOK-YOK", terminal.replace(SAHTE_ANAHTAR, ""))

    def test_goster_ve_kaldir_secenegi_var_olan_anahtari_evet_ile_siler(self):
        self.env_yaz(alici=True)
        self.anahtar.parent.mkdir()
        self.anahtar.write_text(f"# public key: {SAHTE_ACIK}\n{SAHTE_ANAHTAR}\n")
        # Onay verilmezse kalır.
        kod, cikti, hata, terminal = self.tty_li("yedek-anahtari-hazirla.sh", "--goster-ve-kaldir", yanitlar=[("(EVET): ", "H\n")])
        self.assertTrue(self.anahtar.exists())
        kod, cikti, hata, terminal = self.tty_li("yedek-anahtari-hazirla.sh", "--goster-ve-kaldir", yanitlar=[("(EVET): ", "EVET\n"), ("(görünmez): ", SAHTE_ANAHTAR + "\n")])
        self.assertEqual(kod, 0, hata + cikti)
        self.assertFalse(self.anahtar.exists())
        self.assertNotIn(SAHTE_ANAHTAR, cikti + hata)
        # Yeni anahtar ÜRETİLMEZ; yalnızca açık anahtar türetilir (-y), günlük sürücüsüz.
        keygen = [c for c in self.docker_cagrilari() if "age-keygen" in c]
        self.assertTrue(keygen and all(" -y " in c and "--log-driver none" in c and " -o " not in c for c in keygen), keygen)

    def test_goster_ve_kaldir_acik_anahtar_env_ile_eslesmiyorsa_silmez_ve_gostermez(self):
        self.anahtar.parent.mkdir()
        self.anahtar.write_text(f"# public key: {SAHTE_ACIK}\n{SAHTE_ANAHTAR}\n")
        # 1) dosyanın açık anahtarı .env'dekiyle farklı
        self.env_yaz(alici=True)
        env = self.ortam()
        env["SAHTE_TURET_FARKLI"] = "1"
        kod, cikti, hata, terminal = pty_ile_calistir(["bash", str(self.kok / "scripts" / "yedek-anahtari-hazirla.sh"), "--goster-ve-kaldir"],
                                                      env, self.kok, [("(EVET): ", "EVET\n")])
        self.assertNotEqual(kod, 0)
        self.assertIn("EŞLEŞMİYOR", cikti)
        self.assertTrue(self.anahtar.exists(), "eşleşmeyen anahtar silinmemeli")
        self.assertNotIn(SAHTE_ANAHTAR, terminal + cikti + hata, "eşleşmeyen anahtar gösterilmemeli")
        # 2) .env'de YEDEK_ALICI hiç yok: eşleştirilemez -> silme yok
        self.env_yaz(alici=False)
        kod, cikti, hata, terminal = self.tty_li("yedek-anahtari-hazirla.sh", "--goster-ve-kaldir", yanitlar=[("(EVET): ", "EVET\n")])
        self.assertNotEqual(kod, 0)
        self.assertTrue(self.anahtar.exists())
        self.assertIn("EŞLEŞMİYOR", cikti)

    def test_var_olan_anahtar_dosyasi_uzerine_yazilmaz(self):
        self.env_yaz(alici=True)
        self.anahtar.parent.mkdir()
        self.anahtar.write_text("onceki-icerik\n")
        s = self.tty_siz("yedek-anahtari-hazirla.sh")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertEqual(self.anahtar.read_text(), "onceki-icerik\n")
        self.assertIn("ÖZEL ANAHTAR HÂLÂ SUNUCUDA", s.stdout)

    # --- Denetçi ORTA 3: anahtar Docker günlüğüne ve kalıcı diske düşmez; sıra kaybı önler ---------------------------
    def tmpfs_artigi(self):
        return [p for p in Path("/dev/shm").glob("qr-yedek-uretim.*")]

    def anahtar_iceren_dosyalar(self):
        """Test kökü altında SAHTE_ANAHTAR içeren dosyalar (kalıcı diske yazım denetimi)."""
        bulunan = []
        for yol in self.kok.rglob("*"):
            if yol.is_file() and not yol.is_symlink():
                try:
                    if SAHTE_ANAHTAR.encode() in yol.read_bytes():
                        bulunan.append(yol)
                except OSError:
                    pass
        return bulunan

    def keygen_cagrilari(self):
        return [c for c in self.docker_cagrilari() if "age-keygen" in c]

    def test_uretim_log_driver_none_ile_tmpfs_a_yazar_stdout_e_yazdirmaz(self):
        self.env_yaz(alici=False)
        kod, cikti, hata, terminal = self.tty_li("yedek-anahtari-hazirla.sh", yanitlar=[("(EVET): ", "EVET\n"), ("(görünmez): ", SAHTE_ANAHTAR + "\n")])
        self.assertEqual(kod, 0, hata + cikti)
        keygen = self.keygen_cagrilari()
        self.assertEqual(len(keygen), 2, keygen)          # üretim (-o) + açık anahtar türetme (-y)
        for c in keygen:
            self.assertIn("--log-driver none", c)
            self.assertIn("--network none", c)
        uretim = [c for c in keygen if " -o /cikti/anahtar.txt" in c]
        self.assertEqual(len(uretim), 1, keygen)
        self.assertRegex(uretim[0], r"-v (/dev/shm|/run/user/\d+)/qr-yedek-uretim\.[A-Za-z0-9]+:/cikti ")   # tmpfs bind-mount
        self.assertTrue(any(" -y " in c for c in keygen))
        self.assertNotIn("AGE-SECRET-KEY", "\n".join(self.docker_cagrilari()))
        self.assertEqual(self.tmpfs_artigi(), [], "tmpfs üretim dizini temizlenmeli")

    def test_evet_yolunda_gizli_altinda_hicbir_dosya_olusmaz_ve_anahtar_diske_dusmez(self):
        self.env_yaz(alici=False)
        kod, cikti, hata, terminal = self.tty_li("yedek-anahtari-hazirla.sh", yanitlar=[("(EVET): ", "EVET\n"), ("(görünmez): ", SAHTE_ANAHTAR + "\n")])
        self.assertEqual(kod, 0, hata + cikti)
        self.assertEqual(list((self.kok / "gizli").iterdir()), [], "EVET yolunda gizli/ altında dosya olmamalı")
        self.assertEqual(self.anahtar_iceren_dosyalar(), [], "anahtar kalıcı diske hiç yazılmamalı")
        self.assertIn(f"YEDEK_ALICI={SAHTE_ACIK}", (self.kok / ".env").read_text())
        self.assertEqual(self.tmpfs_artigi(), [])

    def test_onay_yoksa_anahtar_gizli_altina_700_600_ile_tasinir_ve_tmpfs_temizlenir(self):
        for yanit in ([("(EVET): ", "hayır\n")], [("(EVET): ", "EVET\n"), ("(görünmez): ", "yanlis\n")]):
            with self.subTest(yanit=yanit[-1][1]):
                shutil.rmtree(self.kok / "gizli", ignore_errors=True)
                self.env_yaz(alici=False)
                kod, cikti, hata, terminal = self.tty_li("yedek-anahtari-hazirla.sh", yanitlar=yanit)
                self.assertEqual(kod, 0, hata + cikti)
                self.assertEqual(oct((self.kok / "gizli").stat().st_mode & 0o777), "0o700")
                self.assertEqual(oct(self.anahtar.stat().st_mode & 0o777), "0o600")
                self.assertIn(SAHTE_ANAHTAR, self.anahtar.read_text())
                self.assertEqual(self.anahtar_iceren_dosyalar(), [self.anahtar])
                self.assertIn("ÖZEL ANAHTAR HÂLÂ SUNUCUDA", cikti)
                self.assertEqual(self.tmpfs_artigi(), [])

    def test_ctrl_c_ve_term_istemde_anahtar_gizli_altina_kaydedilir_kaybolmaz_ve_tmpfs_temizlenir(self):
        for sinyal in ("\x03", signal.SIGTERM):
            with self.subTest(sinyal=sinyal):
                shutil.rmtree(self.kok / "gizli", ignore_errors=True)
                self.env_yaz(alici=False)
                kod, cikti, hata, terminal = self.tty_li("yedek-anahtari-hazirla.sh", yanitlar=[("(EVET): ", sinyal)])
                self.assertNotEqual(kod, 0)
                self.assertTrue(self.anahtar.exists(), "kesintide anahtar kaybolmamalı")
                self.assertEqual(oct(self.anahtar.stat().st_mode & 0o777), "0o600")
                self.assertIn(SAHTE_ANAHTAR, self.anahtar.read_text())
                self.assertEqual(self.tmpfs_artigi(), [])
                # .env henüz yazılmadı (karar verilmedi); yeniden çalıştırınca mevcut anahtardan açık anahtar eklenir.
                self.assertNotIn("YEDEK_ALICI", (self.kok / ".env").read_text())
                s = self.tty_siz("yedek-anahtari-hazirla.sh")
                self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
                self.assertIn(f"YEDEK_ALICI={SAHTE_ACIK}", (self.kok / ".env").read_text())
                self.assertIn(SAHTE_ANAHTAR, self.anahtar.read_text())

    @unittest.skipUnless(os.geteuid() == 0 and shutil.which("setpriv"), "root + setpriv gerekir (.env'i yazılamaz yapmak için)")
    def test_env_yazilamazsa_anahtar_kaybolmaz_sira_hatasi_yok(self):
        """Sıra hatası kalıcı yedek kaybına yol açar: .env'e YEDEK_ALICI yazılamıyorsa (veya sonradan yazılacaksa) anahtar
        daha önce güvenceye alınmış olmalı. .env 444 + yazma yetkisiz kullanıcı ile EVET ve onaysız yolları denenir."""
        for yanit in ([("(EVET): ", "EVET\n"), ("(görünmez): ", SAHTE_ANAHTAR + "\n")], [("(EVET): ", "hayır\n")]):
            with self.subTest(yanit=yanit[-1][1]):
                shutil.rmtree(self.kok / "gizli", ignore_errors=True)
                self.env_yaz(alici=False)
                (self.kok / ".env").chmod(0o444)
                for yol in [self.kok, *self.kok.rglob("*")]:
                    if yol.name != ".env":
                        yol.chmod(0o777 if yol.is_dir() else 0o755)
                komut = ["setpriv", "--reuid=65534", "--regid=65534", "--clear-groups", "bash", str(self.kok / "scripts" / "yedek-anahtari-hazirla.sh")]
                kod, cikti, hata, terminal = pty_ile_calistir(komut, self.ortam(), self.kok, yanit)
                self.assertNotEqual(kod, 0, "ortamda yazılamayan .env hata olarak bildirilmeli")
                self.assertNotIn("YEDEK_ALICI", (self.kok / ".env").read_text())
                self.assertTrue(self.anahtar.exists(), "ANAHTAR KAYBOLDU: .env yazılamadığında anahtar gizli/ altında olmalı")
                self.assertIn(SAHTE_ANAHTAR, self.anahtar.read_text())
                self.assertEqual(self.tmpfs_artigi(), [])

    def test_sira_betikte_env_yazimi_anahtar_guvence_altina_alindiktan_sonra_gelir(self):
        kod = (betik_dizini() / "yedek-anahtari-hazirla.sh").read_text()
        uretim = kod[kod.index("Yedek şifreleme anahtarı üretiliyor"):]
        onay_dali, diger_dal = uretim.split('else\n  # Onay yok', 1)
        self.assertLess(onay_dali.index("env_sonuna_ekle"), onay_dali.index("ANAHTAR_KULLANICIDA=1"))
        self.assertLess(onay_dali.index("ANAHTAR_KULLANICIDA=1"), onay_dali.index("rm -f"))
        self.assertLess(diger_dal.index("anahtari_kalici_kaydet"), diger_dal.index("env_sonuna_ekle"))
        self.assertNotRegex(kod, r"age-keygen[^\n]*>\s*\"?\$")      # stdout yönlendirmesiyle anahtar yazılmaz

    # --- Tur 2: anahtar üretimi sırasında Ctrl-C/TERM -> tmpfs üretim dizini kalmaz --------------------------------------------
    def uretim_sirasinda_kes(self, sinyaller, aralik=0.0):
        self.env_yaz(alici=False)
        env = self.ortam()
        env["SAHTE_URETIM_BEKLE"] = "1"
        p = subprocess.Popen(["bash", str(self.kok / "scripts" / "yedek-anahtari-hazirla.sh")], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             env=env, cwd=self.kok, start_new_session=True, text=True)
        bitis = time.time() + 30
        while time.time() < bitis:       # üretim dizini + anahtar dosyası yazılana kadar bekle
            if any((d / "anahtar.txt").exists() for d in self.tmpfs_artigi()):
                break
            time.sleep(0.05)
        self.assertTrue(self.tmpfs_artigi(), "üretim dizini oluşmadı")
        for sinyal in sinyaller:
            os.killpg(p.pid, sinyal)
            time.sleep(aralik)
        cikti, hata = p.communicate(timeout=30)
        return p.returncode, cikti, hata

    def test_uretim_sirasinda_ctrl_c_ve_term_tmpfs_dizinini_temizler_env_ve_gizli_degismez(self):
        for sinyaller in ([signal.SIGINT], [signal.SIGTERM], [signal.SIGHUP]):
            with self.subTest(sinyaller=sinyaller):
                kod, cikti, hata = self.uretim_sirasinda_kes(sinyaller)
                self.assertNotEqual(kod, 0)
                self.assertEqual(self.tmpfs_artigi(), [], "üretim dizini kalmamalı")
                self.assertNotIn("YEDEK_ALICI", (self.kok / ".env").read_text())     # hiçbir yedek bu anahtarla şifrelenmedi
                self.assertFalse(self.anahtar.exists())                                 # gösterilmedi: gizli/'e de kaydedilmez
                self.assertNotIn(SAHTE_ANAHTAR, cikti + hata)

    def test_uretim_sirasinda_art_arda_sinyaller_temizligi_yarida_kesmez(self):
        kod, cikti, hata = self.uretim_sirasinda_kes([signal.SIGINT, signal.SIGTERM, signal.SIGHUP, signal.SIGINT])
        self.assertNotEqual(kod, 0)
        self.assertEqual(self.tmpfs_artigi(), [])

    def test_temizlik_sirasinda_sinyaller_yok_sayilir_ve_uretim_dizini_kapsami_betikte_var(self):
        kod = (betik_dizini() / "yedek-anahtari-hazirla.sh").read_text()
        govde = kod[kod.index("cikis_temizle() {"):kod.index("trap cikis_temizle EXIT")]
        self.assertIn("trap '' INT TERM HUP", govde)
        self.assertIn("ANAHTAR_GOSTERILDI", govde)
        # Sıra güvencesi: gösterimden sonra anahtar önce kaydedilir, kaydedilemezse tmpfs kopyası SİLİNMEZ.
        self.assertIn("bellekteki kopya SİLİNMEDİ", govde)
        self.assertLess(kod.index("ANAHTAR_GOSTERILDI=1"), kod.index('anahtari_goster_ve_sor "$TMP_ANAHTAR"'))

    def test_istemde_ctrl_c_terminal_yankisini_geri_acar(self):
        self.env_yaz(alici=False)
        kod, cikti, hata, terminal = self.tty_li("yedek-anahtari-hazirla.sh", yanitlar=[("(EVET): ", "EVET\n"), ("(görünmez): ", "\x03")])
        self.assertNotEqual(kod, 0)
        self.assertTrue(pty_ile_calistir.son_echo, "Ctrl-C sonrası terminal yankısı AÇIK olmalı")
        self.assertTrue(self.anahtar.exists())

    def test_tmpfs_dizin_secimi_xdg_yalniz_sahibi_gecerli_ve_700_ise(self):
        uyg = f'. "{betik_dizini() / "yedek-ortak.sh"}"; ortak_tmpfs_uygun_mu "$1" 1 && echo EVET || echo HAYIR'
        alt = Path(tempfile.mkdtemp(prefix="qr-xdg-", dir="/dev/shm"))
        self.addCleanup(shutil.rmtree, alt, ignore_errors=True)

        def uygun(izin, sahip=None):
            alt.chmod(izin)
            if sahip is not None:
                os.chown(alt, sahip, sahip)
            return subprocess.run(["bash", "-c", uyg, "x", str(alt)], capture_output=True, text=True).stdout.strip()

        self.assertEqual(uygun(0o700), "EVET")
        self.assertEqual(uygun(0o755), "HAYIR")
        self.assertEqual(uygun(0o770), "HAYIR")
        if os.geteuid() == 0:
            self.assertEqual(uygun(0o700, sahip=12345), "HAYIR")      # sahibi başka kullanıcı
        s = subprocess.run(["bash", "-c", f'. "{betik_dizini() / "yedek-ortak.sh"}"; ortak_tmpfs_uygun_mu /tmp 0 && echo EVET || echo HAYIR'], capture_output=True, text=True)
        self.assertIn(s.stdout.strip(), ("EVET", "HAYIR"))               # /tmp tmpfs olabilir ya da olmayabilir; çökmemeli

    def test_betik_anahtari_gunluge_yazan_bir_yapi_icermez(self):
        kod = (betik_dizini() / "yedek-anahtari-hazirla.sh").read_text()
        self.assertIn("/dev/tty", kod)
        self.assertNotRegex(kod, r"tee\s")
        for ad in ("kurulum.sh", "guncelle.sh"):
            self.assertIn("yedek-anahtari-hazirla.sh", (betik_dizini() / ad).read_text())


class AnahtarGizliGirisTesti(AnahtarTestTabani):
    """geri-yukleme-testi.sh / geri-yukle.sh: anahtar dosyası yoksa gizli girişle istenir, tmpfs'te tutulur, silinir."""

    ZAMAN = "20261015-031500"

    def setUp(self):
        super().setUp()
        self.env_yaz(alici=True)
        db, sha = f"db-{self.ZAMAN}.dump.age", f"sha256-{self.ZAMAN}.txt"
        (self.yedekler / db).write_bytes(b"age-encryption.org/v1\nsahte")
        ozet = subprocess.run(["sha256sum", db], cwd=self.yedekler, capture_output=True, text=True).stdout
        (self.yedekler / sha).write_text(ozet)
        self.db = self.yedekler / db

    def gecici_dosya_yolu(self):
        satirlar = self.probe.read_text().split() if self.probe.exists() else []
        return satirlar

    def test_geri_yukleme_testi_anahtar_yokken_gizli_girisle_alir_ve_temizler(self):
        kod, cikti, hata, terminal = self.tty_li("geri-yukleme-testi.sh", yanitlar=[("Anahtar: ", SAHTE_ANAHTAR + "\n")])
        self.assertEqual(kod, 0, hata + cikti)
        self.assertIn("SONUÇ: GEÇTİ", cikti)
        yol, izin, adet = self.gecici_dosya_yolu()[:3]
        self.assertTrue(yol.startswith("/dev/shm/") or "/run/user/" in yol, yol)   # tmpfs, kalıcı disk değil
        self.assertEqual(izin, "600")
        self.assertEqual(adet, "1", "konteynera geçerli anahtar satırı bağlanmalıydı")
        self.assertFalse(Path(yol).exists(), "geçici anahtar dosyası iş sonunda silinmeliydi")
        self.assertFalse(self.anahtar.exists())
        # Anahtar yankılanmadı, stdout/stderr'e, günlüğe, docker argümanlarına düşmedi.
        for metin in (terminal, cikti, hata, self.gunluk.read_text(), *(p.read_text() for p in self.yedekler.glob("geri-yukleme-testi-*.log"))):
            self.assertNotIn(SAHTE_ANAHTAR, metin)

    def test_geri_yukleme_testi_gecersiz_anahtarda_basarisiz_olur_ve_dosya_birakmaz(self):
        kod, cikti, hata, terminal = self.tty_li("geri-yukleme-testi.sh", yanitlar=[("Anahtar: ", "bu bir anahtar degil\n"), ("Anahtar: ", "\x04")])
        self.assertNotEqual(kod, 0)
        self.assertIn("BAŞARISIZ", cikti)
        self.assertEqual([p for p in Path("/dev/shm").glob("qr-yedek-anahtari.*") if p.stat().st_mtime > time.time() - 120 and p.stat().st_size > 0], [])

    def test_gizli_giriste_ctrl_c_ve_term_terminal_yankisini_geri_acar_ve_gecici_dosyayi_siler(self):
        for sinyal in ("\x03", signal.SIGTERM):
            with self.subTest(sinyal=sinyal):
                kod, cikti, hata, terminal = self.tty_li("geri-yukleme-testi.sh", yanitlar=[("Anahtar: ", sinyal)])
                self.assertNotEqual(kod, 0)
                if sinyal == "\x03":
                    self.assertTrue(pty_ile_calistir.son_echo, "Ctrl-C sonrası yankı AÇIK olmalı")
                else:
                    self.assertFalse(pty_ile_calistir.sinyal_aninda_echo, "gizli girişte yankı kapalı olmalı (test anlamlılığı)")
                    self.assertTrue(pty_ile_calistir.son_echo, "SIGTERM sonrası yankı AÇIK olmalı")
        self.assertEqual([p for p in Path("/dev/shm").glob("qr-yedek-anahtari.*") if p.stat().st_mtime > time.time() - 120 and p.stat().st_size > 0], [])

    def test_geri_yukleme_testi_tty_yoksa_ve_anahtar_yoksa_anlasilir_hata_verir(self):
        s = self.tty_siz("geri-yukleme-testi.sh")
        self.assertNotEqual(s.returncode, 0)
        self.assertIn("etkileşimli terminal de yok", s.stdout + s.stderr)
        self.assertFalse(self.probe.exists(), "anahtarsız konteyner başlatılmamalı")

    def test_mevcut_anahtar_dosyasi_yollari_calismaya_devam_eder(self):
        # 1) varsayılan gizli/yedek-anahtari.txt
        self.anahtar.parent.mkdir()
        self.anahtar.write_text(SAHTE_ANAHTAR + "\n")
        self.anahtar.chmod(0o600)
        s = self.tty_siz("geri-yukleme-testi.sh")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIn("SONUÇ: GEÇTİ", s.stdout)
        self.assertTrue(self.anahtar.exists(), "var olan anahtar dosyası silinmemeli")
        self.assertNotIn("Anahtar:", s.stdout)
        # 2) konum argümanı ve 3) YEDEK_ANAHTAR_DOSYASI
        baska = self.kok / "baska-anahtar.txt"
        baska.write_text(SAHTE_ANAHTAR + "\n")
        s = self.tty_siz("geri-yukleme-testi.sh", str(baska))
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertIn(str(baska), s.stdout)
        self.anahtar.unlink()
        env = self.ortam()
        env["YEDEK_ANAHTAR_DOSYASI"] = str(baska)
        s = subprocess.run(["bash", str(self.kok / "scripts" / "geri-yukleme-testi.sh")], capture_output=True, text=True, env=env,
                           cwd=self.kok, timeout=60, start_new_session=True)
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertTrue(baska.exists())

    def test_acikca_verilen_ama_olmayan_anahtar_dosyasi_sorulmadan_hata_verir(self):
        kod, cikti, hata, terminal = self.tty_li("geri-yukleme-testi.sh", str(self.kok / "yok.txt"))
        self.assertNotEqual(kod, 0)
        self.assertNotIn("Anahtar: ", terminal)

    def test_geri_yukle_anahtar_yokken_gizli_girisle_alir_ve_temizler(self):
        kod, cikti, hata, terminal = self.tty_li("geri-yukle.sh", str(self.db), yanitlar=[("Anahtar: ", SAHTE_ANAHTAR + "\n")], girdi="EVET\n")
        self.assertEqual(kod, 0, hata + cikti)
        self.assertIn("Geri yükleme tamamlandı", cikti)
        yol, izin, adet = self.gecici_dosya_yolu()[:3]
        self.assertTrue(yol.startswith("/dev/shm/") or "/run/user/" in yol, yol)
        self.assertEqual((izin, adet), ("600", "1"))
        self.assertFalse(Path(yol).exists())
        for metin in (terminal, cikti, hata, self.gunluk.read_text()):
            self.assertNotIn(SAHTE_ANAHTAR, metin)

    def test_geri_yukle_iptalde_ve_hatada_da_gecici_dosya_silinir(self):
        kod, cikti, hata, terminal = self.tty_li("geri-yukle.sh", str(self.db), yanitlar=[("Anahtar: ", SAHTE_ANAHTAR + "\n")], girdi="hayir\n")
        self.assertNotEqual(kod, 0)
        self.assertIn("İptal edildi", cikti)
        yol = self.gecici_dosya_yolu()[0]
        self.assertFalse(Path(yol).exists(), "iptalde de geçici anahtar silinmeli")

    def test_geri_yukle_mevcut_anahtar_dosyasi_yolu_calisir_ve_dosya_kalir(self):
        self.anahtar.parent.mkdir()
        self.anahtar.write_text(SAHTE_ANAHTAR + "\n")
        s = self.tty_siz("geri-yukle.sh", str(self.db), "--anahtar", str(self.anahtar), girdi="EVET\n")
        self.assertEqual(s.returncode, 0, s.stderr + s.stdout)
        self.assertTrue(self.anahtar.exists())

    def test_betikler_anahtari_diske_kalici_yazmaz(self):
        kod = (betik_dizini() / "yedek-ortak.sh").read_text()
        self.assertIn("/dev/shm", kod)
        self.assertIn("tmpfs", kod)
        self.assertIn("read -rs", kod)
        self.assertIn("ortak_gecici_temizle", (betik_dizini() / "geri-yukle.sh").read_text())
        self.assertIn("ortak_gecici_temizle", (betik_dizini() / "geri-yukleme-testi.sh").read_text())


class GeriYuklemeTekIslemTesti(SimpleTestCase):
    def test_pg_restore_tek_islem_ve_hatada_durur(self):
        kod = (betik_dizini() / "geri-yukle.sh").read_text()
        self.assertIn("--single-transaction", kod)
        self.assertIn("--exit-on-error", kod)
        self.assertIn("trap hata_yolu EXIT", kod)
        self.assertIn("docker compose up -d app caddy", kod)
        self.assertIn("GUVENLIK_AD", kod)


class UzakKopyaUyariFonksiyonTesti(SimpleTestCase):
    def test_uyari_kosullari(self):
        simdi = timezone.now()
        self.assertTrue(uzak_kopya_uyarisi_gerekli(None))
        self.assertTrue(uzak_kopya_uyarisi_gerekli(""))
        self.assertTrue(uzak_kopya_uyarisi_gerekli("bozuk"))
        self.assertTrue(uzak_kopya_uyarisi_gerekli((simdi - timedelta(days=8)).isoformat()))
        self.assertFalse(uzak_kopya_uyarisi_gerekli((simdi - timedelta(days=6, hours=23)).isoformat()))
        self.assertFalse(uzak_kopya_uyarisi_gerekli(simdi.isoformat()))


class PanelYedekUyarisiTesti(TemelTest):
    def durum_yaz(self, **alanlar):
        veri = {"zaman": "2026-10-14T03:00:00+03:00", "durum": "basarili", "dosya": "db-20261014-030000.dump.age", "boyut": 2048,
                "yerel_yedek_sayisi": 3, "en_eski_yerel_yedek": "2026-10-01"}
        veri.update(alanlar)
        yol = os.path.join(self.dizin, "durum.json")
        with open(yol, "w", encoding="utf-8") as f:
            json.dump(veri, f)
        return yol

    def get(self, yol):
        with override_settings(YEDEK_DURUM_DOSYASI=yol):
            return self.client.get("/panel/")

    def setUp(self):
        super().setUp()
        self.dizin = tempfile.mkdtemp(prefix="qr-durum-")
        self.addCleanup(shutil.rmtree, self.dizin, ignore_errors=True)
        self.giris(self.izleyici)

    UYARI = "Sunucu dışı kopya doğrulanmadı; eski yedekler silinmiyor, disk dolabilir"

    def test_uzak_alani_yoksa_veya_null_ise_sari_uyari(self):
        for ek in ({}, {"uzak_dogrulama_zamani": None}):
            yanit = self.get(self.durum_yaz(**ek))
            self.assertContains(yanit, self.UYARI)
            self.assertContains(yanit, "docs/YEDEKLEME.md")
            self.assertContains(yanit, 'class="uyari-kutu"')
            self.assertContains(yanit, "Sunucudaki yedek sayısı: 3")
            self.assertContains(yanit, "En eski: 2026-10-01")

    def test_yedek_durumu_hic_yoksa_da_uyari(self):
        self.assertContains(self.get(os.path.join(self.dizin, "yok.json")), self.UYARI)

    def test_yedi_gunden_eski_dogrulama_uyarir(self):
        eski = (timezone.now() - timedelta(days=8)).isoformat()
        self.assertContains(self.get(self.durum_yaz(uzak_dogrulama_zamani=eski)), self.UYARI)

    def test_taze_dogrulama_uyarmaz_ve_zamani_gosterir(self):
        taze = (timezone.now() - timedelta(days=1)).isoformat()
        yanit = self.get(self.durum_yaz(uzak_dogrulama_zamani=taze))
        self.assertNotContains(yanit, self.UYARI)
        self.assertContains(yanit, taze)

    def test_satir_ici_stil_veya_betik_yok(self):
        yanit = self.get(self.durum_yaz())
        govde = yanit.content.decode()
        bolum = govde[govde.index("Yedekleme durumu"):govde.index("</main>")]
        self.assertNotRegex(bolum, r"style\s*=")
        self.assertNotRegex(bolum, r"<script")
        self.assertNotRegex(bolum, r"\son\w+\s*=")

    def test_yedek_durumu_fonksiyonu_bozuk_alanlara_dayanikli(self):
        with override_settings(YEDEK_DURUM_DOSYASI=self.durum_yaz(yerel_yedek_sayisi="x", uzak_dogrulama_zamani=5)):
            d = yedek_durumu()
        self.assertIsNone(d["yerel_sayi"])
        self.assertTrue(d["uzak_uyari"])
