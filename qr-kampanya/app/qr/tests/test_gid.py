import re
from pathlib import Path

from django.test import SimpleTestCase

KOK = Path(__file__).resolve().parents[3]


def _oku(yol):
    return (KOK / yol).read_text(encoding="utf-8")


class GidTutarliligiTesti(SimpleTestCase):
    """app imajındaki 'uygulama' grubu GID'i, compose group_add ve betiklerle tutarlı olmalı (999 docker grubu olabilir)."""

    def setUp(self):
        if not (KOK / "app" / "Dockerfile").exists():
            self.skipTest("Depo kökü bulunamadı (imaj içinde çalışıyor olabilir).")

    def test_dockerfile_gid_10001(self):
        m = re.search(r"^RUN groupadd (?P<args>[^\\\n]*?) uygulama", _oku("app/Dockerfile"), re.M)
        self.assertIsNotNone(m)
        self.assertIn("--gid 10001", m.group("args"))
        self.assertNotIn("--system", m.group("args"))

    def test_group_add_groupadd_ile_eslesir(self):
        gid = re.search(r"--gid (\d+) uygulama", _oku("app/Dockerfile")).group(1)
        gruplar = re.findall(r'group_add:\s*\[([^\]]*)\]', _oku("docker-compose.yml"))
        self.assertTrue(gruplar)
        for g in gruplar:
            self.assertEqual(g.replace('"', "").strip(), gid)

    def test_999_kalmadi(self):
        for yol in ("app/Dockerfile", "docker-compose.yml", "yedek/Dockerfile",
                    "scripts/yedek-dizini-hazirla.sh", "scripts/medya-izni-hazirla.sh"):
            kod = [s for s in _oku(yol).splitlines() if not s.lstrip().startswith("#")]
            self.assertFalse([s for s in kod if re.search(r"\b999\b", s)], yol)

    def test_medya_betigi_gruplari_cevirir_baglanti_izlemez(self):
        s = _oku("scripts/medya-izni-hazirla.sh")
        self.assertIn("chgrp -h 10001", s)
        self.assertIn("-type f", s)
        self.assertIn("-type d", s)
        self.assertNotIn("chgrp -R", s)
        self.assertNotIn("-delete", s)
        self.assertIsNone(re.search(r"(^|[\s;|&])(rm|rmdir|unlink)\s", s.replace("--rm", "")), "medya betiği silme yapmamalı")
