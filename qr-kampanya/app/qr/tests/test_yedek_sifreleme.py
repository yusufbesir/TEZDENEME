"""Yedek şifreleme, saklama (silme) kuralı ve panel uyarısı testleri.

Betikler gerçek rclone/Docker olmadan, sahte bir rclone ile (yalnızca dosya kopyalar/karşılaştırır) denenir;
gerçek rclone ve age ile uçtan uca deneme docs/kanit/ altındaki kayıtlardadır.
"""
import json
import os
import re
import shutil
import subprocess
import tempfile
import time
from datetime import timedelta
from pathlib import Path

from django.test import SimpleTestCase, override_settings
from django.utils import timezone

from qr.panel.pano import uzak_kopya_uyarisi_gerekli, yedek_durumu

from .yardimci import TemelTest, betik_dizini

SAHTE_RCLONE = r'''#!/bin/sh
# Sahte rclone: "copy KAYNAK HEDEF" dosyaları kopyalar; "check KAYNAK HEDEF ... --combined DOSYA" karşılaştırır.
# Hedefin ":" öncesi atılır (ör. b2:klasor -> klasor). SAHTE_UZAK_KOPYALAMA=0 ise copy hiçbir şey kopyalamaz.
komut="$1"; kaynak="$2"; hedef="${3##*:}"; shift 3
birlesik=""
while [ $# -gt 0 ]; do [ "$1" = "--combined" ] && birlesik="$2"; shift; done
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
    : > "$birlesik"; sonuc=0
    for f in "$kaynak"/db-*.dump.age "$kaynak"/medya-*.tar.gz.age "$kaynak"/sha256-*.txt; do
      [ -f "$f" ] || continue
      ad=$(basename "$f")
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
        (self.kok / ".env").write_text(f"YEDEK_DIZINI={self.yedekler}\nYEDEK_SAKLAMA_GUN={saklama}\n" + (f"YEDEK_UZAK_HEDEF={hedef}\n" if hedef else ""))
        env = {"PATH": os.environ["PATH"], "HOME": str(self.kok), "RCLONE_KOMUTU": f"sh {self.rclone}"}
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

    def test_yedek_dongusu_temizlik_icerir(self):
        # Döngü temizliği (tarama/sayaç) korunur; döngüde yedek dosyası silme yok.
        betik = (betik_dizini() / "yedek-dongu.sh").read_text()
        self.assertIn("DELETE FROM qr_denemesayaci WHERE bitis < now()", betik)
        self.assertNotIn("rm -f", betik)

    def test_betikler_gizli_bilgi_icermez(self):
        for ad in ("yedek-al.sh", "disari-kopyala.sh", "geri-yukle.sh", "geri-yukleme-testi.sh", "yedek-anahtari-hazirla.sh", "yedek-ortak.sh"):
            metin = (betik_dizini() / ad).read_text()
            self.assertNotIn("AGE-SECRET-KEY-1", metin, ad)

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
