#!/usr/bin/env python3
"""Skill kaynaklarının depo + tam (40 karakter) commit SHA kilidini üretir.

Girdi:
  docs/skill-kaynaklari/KAYNAKLAR.md  (tablo satırları, hedef .claude/skills)
  skill-kutuphanesi/INDEKS.md         (## başlıkları, hedef skill-kutuphanesi/owner__repo)

Çıktı:
  docs/skill-kaynaklari/kaynak-kilidi.json

Her (depo, kısa commit) için treeless bare clone yapılır ve
`git rev-parse <kısa>^{commit}` ile tam SHA çözülür. Hata olursa
"tam_commit": null ve "hata" alanı yazılır; betik durmaz.

Kullanım: python3 scripts/skill-kaynak-kilidi.py
"""
import datetime
import json
import re
import shutil
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
KAYNAKLAR = KOK / "docs" / "skill-kaynaklari" / "KAYNAKLAR.md"
INDEKS = KOK / "skill-kutuphanesi" / "INDEKS.md"
CIKTI = KOK / "docs" / "skill-kaynaklari" / "kaynak-kilidi.json"
ZAMAN_ASIMI = 300  # depo başına saniye
PARALEL = 4

TABLO_RE = re.compile(
    r"^\|\s*\[(?P<depo>[^/\]]+/[^\]]+)\]\((?P<url>[^)]+)\)\s*\|\s*`(?P<sha>[0-9a-f]{7,40})`"
)
BASLIK_RE = re.compile(
    r"^##\s+\[(?P<depo>[^/\]]+/[^\]]+)\]\((?P<url>[^)]+)\)\s*·\s*commit\s*`(?P<sha>[0-9a-f]{7,40})`"
)


def ayikla():
    """İki dosyadan kayıt iskeletlerini çıkarır."""
    kayitlar = []
    for satir in KAYNAKLAR.read_text(encoding="utf-8").splitlines():
        m = TABLO_RE.match(satir)
        if m:
            kayitlar.append({
                "depo": m["depo"], "url": m["url"], "kisa_commit": m["sha"],
                "hedef": ".claude/skills", "kaynak_dosya": "KAYNAKLAR.md",
            })
    for satir in INDEKS.read_text(encoding="utf-8").splitlines():
        m = BASLIK_RE.match(satir)
        if m:
            kayitlar.append({
                "depo": m["depo"], "url": m["url"], "kisa_commit": m["sha"],
                "hedef": "skill-kutuphanesi/" + m["depo"].replace("/", "__"),
                "kaynak_dosya": "INDEKS.md",
            })
    return kayitlar


def coz(anahtar):
    """(depo, kısa sha) -> (tam sha | None, hata | None)."""
    depo, kisa = anahtar
    tmp = tempfile.mkdtemp(prefix="kilit-")
    try:
        klon = subprocess.run(
            ["git", "clone", "-q", "--bare", "--filter=tree:0",
             f"https://github.com/{depo}.git", tmp],
            capture_output=True, text=True, timeout=ZAMAN_ASIMI,
        )
        if klon.returncode != 0:
            return None, "clone başarısız: " + klon.stderr.strip()[:300]
        r = subprocess.run(
            ["git", "-C", tmp, "rev-parse", f"{kisa}^{{commit}}"],
            capture_output=True, text=True, timeout=60,
        )
        tam = r.stdout.strip()
        if r.returncode != 0 or not re.fullmatch(r"[0-9a-f]{40}", tam):
            return None, "rev-parse başarısız: " + (r.stderr.strip() or tam)[:300]
        return tam, None
    except subprocess.TimeoutExpired:
        return None, f"zaman aşımı ({ZAMAN_ASIMI} sn)"
    except Exception as e:  # betik hiçbir depoda durmasın
        return None, f"beklenmeyen hata: {e}"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    kayitlar = ayikla()
    anahtarlar = sorted({(k["depo"], k["kisa_commit"]) for k in kayitlar})
    with ThreadPoolExecutor(max_workers=PARALEL) as havuz:
        sonuc = dict(zip(anahtarlar, havuz.map(coz, anahtarlar)))
    for k in kayitlar:
        tam, hata = sonuc[(k["depo"], k["kisa_commit"])]
        k["tam_commit"] = tam
        if hata:
            k["hata"] = hata
    kayitlar.sort(key=lambda k: (k["depo"].lower(), k["hedef"]))
    veri = {
        "olusturma_tarihi": datetime.date.today().isoformat(),
        "kaynaklar": kayitlar,
    }
    CIKTI.write_text(json.dumps(veri, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    basarisiz = [k for k in kayitlar if k["tam_commit"] is None]
    print(f"{len(kayitlar)} kayıt, {len(kayitlar) - len(basarisiz)} çözüldü, {len(basarisiz)} başarısız")
    for k in basarisiz:
        print(f"  BAŞARISIZ {k['depo']} {k['kisa_commit']}: {k['hata']}")


if __name__ == "__main__":
    main()
