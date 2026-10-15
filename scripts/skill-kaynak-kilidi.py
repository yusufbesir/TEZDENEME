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
          python3 scripts/skill-kaynak-kilidi.py --yalniz-ozet

--yalniz-ozet: ağ kullanmaz; mevcut kaynak-kilidi.json içindeki tam_commit
değerlerini korur, çalışma ağacındaki dosyalardan SHA-256 özetlerini yeniden
hesaplar ve docs/skill-kaynaklari/icerik-ozeti.sha256 ile JSON'u yeniden yazar.
Normal çalışmada da (klonlama sonrası) özetler aynı yolla eklenir.
"""
import datetime
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
KAYNAKLAR = KOK / "docs" / "skill-kaynaklari" / "KAYNAKLAR.md"
INDEKS = KOK / "skill-kutuphanesi" / "INDEKS.md"
CIKTI = KOK / "docs" / "skill-kaynaklari" / "kaynak-kilidi.json"
OZET = KOK / "docs" / "skill-kaynaklari" / "icerik-ozeti.sha256"
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


def skill_eslemesi():
    """KAYNAKLAR.md tablosundan {depo: [skill klasörü, ...]} (.claude/skills için)."""
    esleme = {}
    for satir in KAYNAKLAR.read_text(encoding="utf-8").splitlines():
        if TABLO_RE.match(satir):
            hucreler = [h.strip() for h in satir.strip().strip("|").split("|")]
            depo = re.match(r"\[([^\]]+)\]", hucreler[0])[1]
            esleme[depo] = [a.strip() for a in hucreler[3].split(",") if a.strip()]
    return esleme


def izlenen(onek):
    """git'in izlediği dosyalar (repo köküne göre yol)."""
    r = subprocess.run(["git", "-C", str(KOK), "ls-files", "-z", "--", onek],
                       capture_output=True, check=True)
    return sorted(y for y in r.stdout.decode("utf-8").split("\0") if y)


def dosya_ozeti(yol):
    h = hashlib.sha256()
    with open(KOK / yol, "rb") as f:
        for parca in iter(lambda: f.read(1 << 20), b""):
            h.update(parca)
    return h.hexdigest()


def kayit_dosyalari(k, esleme, skill_dosyalari, kutuphane_dosyalari):
    """Bir kayda ait dosya yolları."""
    if k["hedef"] == ".claude/skills":
        on = tuple(f".claude/skills/{a}/" for a in esleme[k["depo"]])
        return [y for y in skill_dosyalari if y.startswith(on)]
    return [y for y in kutuphane_dosyalari if y.startswith(k["hedef"] + "/")]


def ozetle(kayitlar):
    """Kayıtlara dosya_sayisi/icerik_ozeti ekler, manifesti yazar."""
    esleme = skill_eslemesi()
    skill_d = izlenen(".claude/skills")
    kut_d = izlenen("skill-kutuphanesi")
    satir_de = {}
    manifest = {}
    for k in kayitlar:
        yollar = kayit_dosyalari(k, esleme, skill_d, kut_d)
        satirlar = []
        for y in yollar:
            if y not in satir_de:
                satir_de[y] = f"{dosya_ozeti(y)}  {y}\n"
            satirlar.append(satir_de[y])
            manifest[y] = satir_de[y]
        k["dosya_sayisi"] = len(yollar)
        k["icerik_ozeti"] = hashlib.sha256("".join(satirlar).encode("utf-8")).hexdigest()
    OZET.write_text("".join(manifest[y] for y in sorted(manifest)), encoding="utf-8", newline="\n")
    return len(manifest)


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


def yalniz_ozet():
    veri = json.loads(CIKTI.read_text(encoding="utf-8"))
    toplam = ozetle(veri["kaynaklar"])
    CIKTI.write_text(json.dumps(veri, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(veri['kaynaklar'])} kayıt, {toplam} dosya özetlendi (ağ kullanılmadı)")


def main():
    if "--yalniz-ozet" in sys.argv[1:]:
        return yalniz_ozet()
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
    ozetle(kayitlar)
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
