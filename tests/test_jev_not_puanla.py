"""jev_not_puanla betiği testleri. Ağ YOK; taşıma sahte fonksiyonla yapılır."""

import contextlib
import importlib.util
import io
import os
import tempfile
import unittest
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("jev_not_puanla", KOK / "scripts" / "jev_not_puanla.py")
bet = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bet)


def sahte(secim="koru", bozuk=False):
    govdeler = []

    def tasima(body, timeout):
        govdeler.append(body)
        if bozuk:
            raise TimeoutError("timed out")
        p = {k: 0.1 for k in bet.SECENEKLER}
        p[secim] = 0.8
        return {"answers": {"durum": {"choice": secim, "probabilities": p, "confidence": 0.7}},
                "model": "sahte"}

    tasima.govdeler = govdeler
    return tasima


class Temel(unittest.TestCase):
    def setUp(self):
        self._t = tempfile.TemporaryDirectory()
        self.addCleanup(self._t.cleanup)
        self.kasa = Path(self._t.name) / "kasa"
        self.cikti = self.kasa / "jev-puan-raporlari"
        self.kasa.mkdir()

    def not_yaz(self, ad, metin="# Başlık\nİçerik"):
        yol = self.kasa / ad
        yol.parent.mkdir(parents=True, exist_ok=True)
        yol.write_text(metin, encoding="utf-8")
        return yol

    def calistir(self, *ek, tasima=None, bugun="2026-10-25"):
        argv = ["--kasa", str(self.kasa), "--cikti", str(self.cikti)] + list(ek)
        cikis = io.StringIO()
        kod = bet.calistir(argv, tasima=tasima, bugun=bugun, cikis=cikis)
        return kod, cikis.getvalue()

    def raporlar(self):
        return sorted(self.cikti.glob("*.md")) if self.cikti.exists() else []


class Testler(Temel):
    def test_atlanan_klasorler(self):
        self.not_yaz("a.md")
        for k in ("Benim Notlarım", "anahtarlar", "Yusuf'un Notları", ".obsidian", ".git", ".claude",
                  ".cache", "x/anahtarlar/derin"):
            self.not_yaz(k + "/gizli.md")
        self.cikti.mkdir()
        (self.cikti / "eski.md").write_text("rapor", encoding="utf-8")
        t = sahte()
        self.calistir(tasima=t)
        self.assertEqual(len(t.govdeler), 1)
        self.assertIn("a.md", t.govdeler[0]["state"]["context"])

    def test_buyuk_harf_ve_tipografik_kesme(self):
        self.not_yaz("a.md")
        self.not_yaz("BENİM NOTLARIM/x.md")
        self.not_yaz("Yusuf\u2019un Notları/y.md")
        self.not_yaz("ANAHTARLAR/z.md")
        t = sahte()
        self.calistir(tasima=t)
        self.assertEqual(len(t.govdeler), 1)

    def test_symlink_kok_disi_ve_atlanan(self):
        dis = Path(self._t.name) / "dis"
        (dis / "anahtarlar").mkdir(parents=True)
        (dis / "anahtarlar" / "s.md").write_text("# S", encoding="utf-8")
        (dis / "serbest").mkdir()
        (dis / "serbest" / "d.md").write_text("# D", encoding="utf-8")
        self.not_yaz("a.md")
        self.not_yaz("Benim Notlarım/k.md")
        try:
            os.symlink(dis / "anahtarlar", self.kasa / "baglanti1", target_is_directory=True)
            os.symlink(dis / "serbest", self.kasa / "baglanti2", target_is_directory=True)
            os.symlink(self.kasa / "Benim Notlarım", self.kasa / "baglanti3", target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("symlink desteklenmiyor")
        # islink kontrolünü aşan junction benzetimi: realpath denetimi doğrudan sınanır
        kasa_r = os.path.realpath(self.kasa)
        self.assertFalse(bet._gercek_yol_guvenli_mi(self.kasa / "baglanti1", kasa_r))
        self.assertFalse(bet._gercek_yol_guvenli_mi(self.kasa / "baglanti2", kasa_r))
        self.assertFalse(bet._gercek_yol_guvenli_mi(self.kasa / "baglanti3", kasa_r))
        self.assertTrue(bet._gercek_yol_guvenli_mi(self.kasa / "a.md", kasa_r))
        t = sahte()
        self.calistir(tasima=t)
        self.assertEqual(len(t.govdeler), 1)

    def test_salt_okunur(self):
        yollar = [self.not_yaz("a.md"), self.not_yaz("alt/b.md", "# B\nmetin")]
        once = {y: (y.read_bytes(), os.stat(y).st_mtime_ns) for y in yollar}
        self.calistir(tasima=sahte("arsiv"))
        for y in yollar:
            self.assertEqual(once[y], (y.read_bytes(), os.stat(y).st_mtime_ns))
        self.assertEqual(sorted(p.name for p in self.kasa.rglob("*.md") if self.cikti not in p.parents),
                         ["a.md", "b.md"])

    def test_gizli_not_gonderilmez(self):
        self.not_yaz("gizli.md", "anahtar sk-abcdefghijklmnopqrstuvwxyz123456 burada")
        self.not_yaz("temiz.md")
        t = sahte()
        self.calistir(tasima=t)
        self.assertEqual(len(t.govdeler), 1)
        self.assertNotIn("sk-abc", str(t.govdeler))
        metin = self.raporlar()[0].read_text(encoding="utf-8")
        self.assertIn("izli içerik, gönderilmedi", metin)
        self.assertIn("gizli.md", metin)

    def test_onbellek(self):
        a = self.not_yaz("a.md")
        self.not_yaz("b.md")
        t = sahte()
        self.calistir(tasima=t)
        self.assertEqual(len(t.govdeler), 2)
        t2 = sahte()
        self.calistir(tasima=t2)
        self.assertEqual(len(t2.govdeler), 0)
        a.write_text("# A\nyeni içerik", encoding="utf-8")
        t3 = sahte()
        _, cikis = self.calistir(tasima=t3)
        self.assertEqual(len(t3.govdeler), 1)
        self.assertIn("Puanlanan 1, atlanan 1", cikis)

    def test_en_fazla(self):
        for i in range(5):
            self.not_yaz("n%d.md" % i)
        t = sahte()
        self.calistir("--en-fazla", "2", tasima=t)
        self.assertEqual(len(t.govdeler), 2)
        t2 = sahte()
        self.calistir("--en-fazla", "2", tasima=t2)
        self.assertEqual(len(t2.govdeler), 2)  # kalanlar sonraki çalıştırmada

    def test_degraded_onbellege_girmez(self):
        self.not_yaz("a.md")
        self.calistir(tasima=sahte(bozuk=True))
        self.assertIn("degraded (zaman_asimi)", self.raporlar()[0].read_text(encoding="utf-8"))
        t = sahte()
        self.calistir(tasima=t, bugun="2026-10-26")
        self.assertEqual(len(t.govdeler), 1)

    def test_bes_degraded_erken_durur(self):
        for i in range(9):
            self.not_yaz("n%d.md" % i)
        t = sahte(bozuk=True)
        _, cikis = self.calistir(tasima=t)
        self.assertEqual(len(t.govdeler), 5)
        self.assertIn("erken durdu", cikis)
        self.assertIn("erken durduruldu", self.raporlar()[0].read_text(encoding="utf-8"))

    def test_rapor_uzerine_yazmaz(self):
        self.not_yaz("a.md")
        self.cikti.mkdir()
        mevcut = self.cikti / "2026-10-25 Jev not puanlama raporu.md"
        mevcut.write_text("ESKİ", encoding="utf-8")
        self.calistir(tasima=sahte())
        self.calistir(tasima=sahte())
        self.assertEqual(mevcut.read_text(encoding="utf-8"), "ESKİ")
        adlar = [p.name for p in self.raporlar()]
        self.assertIn("2026-10-25 Jev not puanlama raporu (2).md", adlar)
        self.assertIn("2026-10-25 Jev not puanlama raporu (3).md", adlar)

    def test_rapor_icerigi(self):
        self.not_yaz("a.md")
        self.not_yaz("b.md")
        self.not_yaz("c.md")
        sec = iter(["arsiv", "koru", "guncelle"])
        govdeler = []

        def tasima(body, timeout):
            govdeler.append(body)
            return sahte(next(sec))(body, timeout)

        self.calistir(tasima=tasima)
        m = self.raporlar()[0].read_text(encoding="utf-8")
        self.assertLess(m.index("Arşiv önerileri"), m.index("Güncelleme önerileri"))
        self.assertIn("Koru önerilen not sayısı: 1", m)
        self.assertTrue(m.rstrip().endswith(bet.SON_SATIR))

    def test_kuru(self):
        self.not_yaz("a.md")
        t = sahte()
        kod, cikis = self.calistir("--kuru", tasima=t)
        self.assertEqual(kod, 0)
        self.assertEqual(t.govdeler, [])
        self.assertIn("a.md", cikis)
        self.assertFalse(self.cikti.exists())


if __name__ == "__main__":
    unittest.main()
