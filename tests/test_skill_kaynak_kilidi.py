"""kaynak-kilidi.json için ağsız testler."""
import hashlib
import json
import re
import unittest
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
KILIT = KOK / "docs" / "skill-kaynaklari" / "kaynak-kilidi.json"
KAYNAKLAR = KOK / "docs" / "skill-kaynaklari" / "KAYNAKLAR.md"
INDEKS = KOK / "skill-kutuphanesi" / "INDEKS.md"
OZET = KOK / "docs" / "skill-kaynaklari" / "icerik-ozeti.sha256"

TABLO_RE = re.compile(r"^\|\s*\[([^/\]]+/[^\]]+)\]\([^)]+\)\s*\|\s*`([0-9a-f]{7,40})`")
BASLIK_RE = re.compile(r"^##\s+\[([^/\]]+/[^\]]+)\]\([^)]+\)\s*·\s*commit\s*`([0-9a-f]{7,40})`")


def satirlar(yol, desen):
    return [m.groups() for s in yol.read_text(encoding="utf-8").splitlines()
            if (m := desen.match(s))]


class KaynakKilidiTesti(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.veri = json.loads(KILIT.read_text(encoding="utf-8"))
        cls.kayitlar = cls.veri["kaynaklar"]

    def test_tarih_var(self):
        self.assertRegex(self.veri["olusturma_tarihi"], r"^\d{4}-\d{2}-\d{2}$")

    def test_indeks_basliklari_kilitte(self):
        basliklar = satirlar(INDEKS, BASLIK_RE)
        self.assertTrue(basliklar)
        for depo, kisa in basliklar:
            hedef = "skill-kutuphanesi/" + depo.replace("/", "__")
            self.assertTrue(
                any(k["depo"] == depo and k["hedef"] == hedef and k["kisa_commit"] == kisa
                    and k["kaynak_dosya"] == "INDEKS.md" for k in self.kayitlar),
                f"INDEKS.md kaydı eksik: {depo}")

    def test_kaynaklar_satirlari_kilitte(self):
        satirlar_ = satirlar(KAYNAKLAR, TABLO_RE)
        self.assertTrue(satirlar_)
        for depo, kisa in satirlar_:
            self.assertTrue(
                any(k["depo"] == depo and k["hedef"] == ".claude/skills" and k["kisa_commit"] == kisa
                    and k["kaynak_dosya"] == "KAYNAKLAR.md" for k in self.kayitlar),
                f"KAYNAKLAR.md kaydı eksik: {depo}")

    def test_kayit_sayisi_tam(self):
        beklenen = len(satirlar(INDEKS, BASLIK_RE)) + len(satirlar(KAYNAKLAR, TABLO_RE))
        self.assertEqual(len(self.kayitlar), beklenen)

    def test_tam_commit_bicimi(self):
        for k in self.kayitlar:
            tam = k["tam_commit"]
            if tam is None:
                continue
            self.assertRegex(tam, r"^[0-9a-f]{40}$", k["depo"])
            self.assertTrue(tam.startswith(k["kisa_commit"]), k["depo"])

    def test_hedef_klasorler_var(self):
        for k in self.kayitlar:
            if k["hedef"].startswith("skill-kutuphanesi/"):
                self.assertTrue((KOK / k["hedef"]).is_dir(), k["hedef"])


class IcerikOzetiTesti(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.kayitlar = json.loads(KILIT.read_text(encoding="utf-8"))["kaynaklar"]
        cls.ham = OZET.read_bytes().decode("utf-8")
        cls.satirlar = cls.ham.splitlines(keepends=True)

    def test_manifest_bicimi(self):
        self.assertTrue(self.satirlar)
        self.assertNotIn("\r", self.ham)
        yollar = []
        for s in self.satirlar:
            self.assertRegex(s, r"^[0-9a-f]{64}  [^\n]+\n$")
            yollar.append(s[66:-1])
        self.assertEqual(yollar, sorted(yollar))
        self.assertEqual(len(yollar), len(set(yollar)))

    def test_manifest_diskle_uyumlu(self):
        for s in self.satirlar:
            hex_, yol = s[:64], s[66:-1]
            self.assertEqual(hashlib.sha256((KOK / yol).read_bytes()).hexdigest(), hex_, yol)

    def test_kayit_ozetleri(self):
        for k in self.kayitlar:
            self.assertGreater(k["dosya_sayisi"], 0, k["depo"])
            self.assertRegex(k["icerik_ozeti"], r"^[0-9a-f]{64}$")
            if k["hedef"] == ".claude/skills":
                continue  # skill klasörü eşlemesi KAYNAKLAR.md'den; aşağıda ayrıca
            onek = k["hedef"] + "/"
            ilgili = [s for s in self.satirlar if s[66:].startswith(onek)]
            self.assertEqual(len(ilgili), k["dosya_sayisi"], k["hedef"])
            self.assertEqual(hashlib.sha256("".join(ilgili).encode("utf-8")).hexdigest(),
                             k["icerik_ozeti"], k["hedef"])

    def test_claude_skills_ozetleri(self):
        esleme = {}
        for s in KAYNAKLAR.read_text(encoding="utf-8").splitlines():
            if TABLO_RE.match(s):
                h = [x.strip() for x in s.strip().strip("|").split("|")]
                esleme[re.match(r"\[([^\]]+)\]", h[0])[1]] = [a.strip() for a in h[3].split(",")]
        for k in self.kayitlar:
            if k["hedef"] != ".claude/skills":
                continue
            on = tuple(f".claude/skills/{a}/" for a in esleme[k["depo"]])
            ilgili = [s for s in self.satirlar if s[66:].startswith(on)]
            self.assertEqual(len(ilgili), k["dosya_sayisi"], k["depo"])
            self.assertEqual(hashlib.sha256("".join(ilgili).encode("utf-8")).hexdigest(),
                             k["icerik_ozeti"], k["depo"])


if __name__ == "__main__":
    unittest.main()
