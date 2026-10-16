"""Talimat dosyalarının boyut eşiklerini denetler; eşik aşılırsa başarısız olur.

Çalıştırma: python3 -m unittest tests.test_talimat_boyutu
Eşikler: CLAUDE.md 200 satır ve 6.000 karakter; talimat kutusu özeti 4.000 karakter;
her yola bağlı kural 3.000 karakter; ajan tanımları toplam 5.000 karakter;
her oturumda yüklenenlerin toplamı (CLAUDE.md + ajanlar) 10.000 karakter.
"""
import re
import unittest
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent


def uzunluk(yol):
    return len(yol.read_text(encoding="utf-8"))


class TalimatBoyutu(unittest.TestCase):
    def test_claude_md_satir_siniri(self):
        satir = len((KOK / "CLAUDE.md").read_text(encoding="utf-8").splitlines())
        self.assertLess(satir, 200, f"CLAUDE.md {satir} satır; 200'ün altında olmalı")

    def test_claude_md_karakter_siniri(self):
        self.assertLessEqual(uzunluk(KOK / "CLAUDE.md"), 6000)

    def test_kutu_ozeti_siniri(self):
        self.assertLessEqual(uzunluk(KOK / "docs/kurallar/talimat-kutusu-ozet.md"), 4000)

    def test_ajan_tanimlari_toplami(self):
        toplam = sum(uzunluk(p) for p in (KOK / ".claude/agents").glob("*.md"))
        self.assertLessEqual(toplam, 5000)

    def test_her_oturumda_yuklenenlerin_toplami(self):
        ajanlar = sum(uzunluk(p) for p in (KOK / ".claude/agents").glob("*.md"))
        self.assertLessEqual(uzunluk(KOK / "CLAUDE.md") + ajanlar, 10000)

    def test_yola_bagli_kurallar(self):
        kurallar = list((KOK / ".claude/rules").glob("*.md"))
        self.assertTrue(kurallar, "En az bir yola bağlı kural bekleniyor")
        for p in kurallar:
            metin = p.read_text(encoding="utf-8")
            self.assertLessEqual(len(metin), 3000, f"{p.name} 3.000 karakteri aşıyor")
            self.assertRegex(metin, r"\A---\npaths:\n(  - .+\n)+---\n", f"{p.name} paths: başlığı eksik")

    def test_kural_dosyalarinda_ozet_basligi(self):
        for p in (KOK / "docs/kurallar").glob("*.md"):
            if p.name == "talimat-kutusu-ozet.md":
                continue
            self.assertIn("**Özet:**", p.read_text(encoding="utf-8"), f"{p.name} özet başlığı eksik")


if __name__ == "__main__":
    unittest.main()
