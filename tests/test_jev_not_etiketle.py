"""jev_not_etiketle betiği testleri. Ağ YOK; Jev sonucu önbellekten gelir."""

import hashlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOK / "scripts"))
_spec = importlib.util.spec_from_file_location("jev_not_etiketle", KOK / "scripts" / "jev_not_etiketle.py")
et = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(et)


class Isle(unittest.TestCase):
    def test_frontmatter_yok_basa_eklenir_metin_aynen_kalir(self):
        m = "# Barkod notu\nİçerik\n"
        y, ek, ck = et.metne_etiket_isle(m, ["jev/koru"])
        self.assertTrue(y.endswith(m))
        self.assertTrue(y.startswith("---\ntags: [jev/koru]\n---\n"))

    def test_tags_yok_frontmatter_icine_eklenir(self):
        y, ek, _ = et.metne_etiket_isle("---\ntitle: a\n---\ngövde", ["jev/koru"])
        self.assertEqual(y, "---\ntitle: a\ntags: [jev/koru]\n---\ngövde")

    def test_satir_ici_mevcut_etiket_korunur_ve_eski_jev_degisir(self):
        y, ek, ck = et.metne_etiket_isle("---\ntags: [onemli, jev/koru]\n---\nx", ["jev/arsiv", "konu/kural"])
        self.assertEqual(y, "---\ntags: [onemli, jev/arsiv, konu/kural]\n---\nx")
        self.assertEqual(ck, ["jev/koru"])

    def test_blok_liste(self):
        m = "---\ntags:\n  - a\n  - jev/koru\nbaska: 1\n---\nx"
        y, _, ck = et.metne_etiket_isle(m, ["jev/guncelle"])
        self.assertEqual(y, "---\ntags:\n  - a\n  - jev/guncelle\nbaska: 1\n---\nx")
        self.assertEqual(ck, ["jev/koru"])

    def test_degisiklik_yoksa_ayni_metin(self):
        m = "---\ntags: [jev/koru]\n---\nx"
        y, ek, ck = et.metne_etiket_isle(m, ["jev/koru"])
        self.assertEqual((y, ek, ck), (m, [], []))

    def test_crlf_korunur(self):
        y, _, _ = et.metne_etiket_isle("# a\r\nb\r\n", ["konu/x"])
        self.assertNotIn("\n\n", y.replace("\r\n", ""))
        self.assertEqual(y.count("\r\n"), 5)

    def test_baska_etiket_asla_cikarilmaz(self):
        y, _, ck = et.metne_etiket_isle("---\ntags: [konu/eski, kendi]\n---\nx", ["konu/yeni"])
        self.assertEqual(ck, [])
        self.assertIn("kendi", y)
        self.assertIn("konu/eski", y)


class Uctan(unittest.TestCase):
    def setUp(self):
        self._t = tempfile.TemporaryDirectory()
        self.addCleanup(self._t.cleanup)
        self.kasa = Path(self._t.name) / "kasa"
        self.cikti = self.kasa / "jev-puan-raporlari"
        self.kasa.mkdir()

    def not_yaz(self, ad, metin):
        y = self.kasa / ad
        y.parent.mkdir(parents=True, exist_ok=True)
        y.write_text(metin, encoding="utf-8")
        return y

    def onbellek(self, goreli, oneri="koru", p=0.8):
        y = self.kasa / goreli
        ozet = hashlib.sha256(y.read_bytes()).hexdigest()
        self.cikti.mkdir(parents=True, exist_ok=True)
        yol = self.cikti / ".onbellek.json"
        v = json.loads(yol.read_text(encoding="utf-8")) if yol.exists() else {}
        v[goreli] = {"sha256": ozet, "sonuc": {"oneri": oneri, "olasilik": p, "guven": 0.5}, "tarih": "2026-10-25"}
        yol.write_text(json.dumps(v), encoding="utf-8")

    def calistir(self, *ek):
        c = io.StringIO()
        kod = et.calistir(["--kasa", str(self.kasa), "--cikti", str(self.cikti)] + list(ek), bugun="2026-10-26", cikis=c)
        return kod, c.getvalue()

    def test_etiket_yedek_gunluk_dizin(self):
        orijinal = "# Barkod kuralları\nmetin\n"
        self.not_yaz("barkod.md", orijinal)
        self.onbellek("barkod.md", "guncelle", 0.62)
        kod, _ = self.calistir()
        self.assertEqual(kod, 0)
        yeni = (self.kasa / "barkod.md").read_text(encoding="utf-8")
        self.assertIn("jev/guncelle", yeni)
        self.assertIn("jev-guven/orta", yeni)
        self.assertIn("konu/barkod", yeni)
        self.assertTrue(yeni.endswith(orijinal))
        yedek = self.cikti / "_etiket-yedek" / "2026-10-26" / "barkod.md"
        self.assertEqual(yedek.read_text(encoding="utf-8"), orijinal)
        self.assertEqual(len((self.cikti / "etiket-gunlugu.jsonl").read_text(encoding="utf-8").splitlines()), 1)
        dizin = (self.cikti / "BILGI-DIZINI.md").read_text(encoding="utf-8")
        self.assertIn("## konu/barkod", dizin)
        self.assertIn("`barkod.md`", dizin)
        self.assertIn("Güncellenmesi önerilenler (1)", dizin)

    def test_ikinci_calisma_degistirmez_ve_onbellek_gecerli_kalir(self):
        self.not_yaz("a.md", "# Kural\nx")
        self.onbellek("a.md")
        self.calistir()
        once = (self.kasa / "a.md").read_bytes()
        _, cikti = self.calistir()
        self.assertEqual((self.kasa / "a.md").read_bytes(), once)
        self.assertIn("değişen 0", cikti)
        v = json.loads((self.cikti / ".onbellek.json").read_text(encoding="utf-8"))
        self.assertEqual(v["a.md"]["sha256"], hashlib.sha256(once).hexdigest())

    def test_oneri_degisirse_eski_jev_etiketi_yenisiyle_degisir(self):
        self.not_yaz("a.md", "# x\ny")
        self.onbellek("a.md", "koru", 0.9)
        self.calistir()
        self.onbellek("a.md", "arsiv", 0.9)
        self.calistir()
        m = (self.kasa / "a.md").read_text(encoding="utf-8")
        self.assertIn("jev/arsiv", m)
        self.assertNotIn("jev/koru", m)

    def test_gizli_not_ve_atlanan_klasor_dokunulmaz(self):
        g = self.not_yaz("g.md", "# g\nsk-ant-api03-" + "A" * 40)
        k = self.not_yaz("anahtarlar/k.md", "# k")
        b = self.not_yaz("Benim Notlarım/b.md", "# b")
        once = [x.read_bytes() for x in (g, k, b)]
        self.calistir()
        self.assertEqual(once, [x.read_bytes() for x in (g, k, b)])

    def test_puansiz_not_yalniz_konu_alir_eskimis_puan_yok_sayilir(self):
        y = self.not_yaz("kural.md", "# Kural\nx")
        self.onbellek("kural.md", "arsiv", 0.9)
        y.write_text("# Kural\ndeğişti", encoding="utf-8")  # puan eskidi
        self.calistir()
        m = y.read_text(encoding="utf-8")
        self.assertNotIn("jev/", m)
        self.assertIn("konu/kural", m)

    def test_kuru_hicbir_sey_yazmaz(self):
        y = self.not_yaz("a.md", "# barkod\nx")
        self.onbellek("a.md")
        once = y.read_bytes()
        self.calistir("--kuru")
        self.assertEqual(y.read_bytes(), once)
        self.assertFalse((self.cikti / "BILGI-DIZINI.md").exists())
        self.assertFalse((self.cikti / "_etiket-yedek").exists())


if __name__ == "__main__":
    unittest.main()
