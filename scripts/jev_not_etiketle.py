#!/usr/bin/env python3
"""Jev puanlama sonucunu notlara ETİKET olarak işler ve "bilgi nerede?" dizinini üretir. Yalnız standart kütüphane.

Yusuf'a soru sormaz. Not metnine dokunulmaz; yalnız frontmatter `tags:` alanına etiket eklenir
(alan ya da frontmatter yoksa oluşturulur). Silme, taşıma, yeniden adlandırma yoktur.

Etiketler:
  jev/koru | jev/guncelle | jev/arsiv   Jev önerisi (yalnız bu betiğin yazdığı eski jev/ etiketi yenisiyle değişir)
  jev-guven/yuksek|orta|dusuk           önerinin olasılığı (>=0,7 / >=0,5 / altı)
  konu/<ad>                             kodla çıkarılan konu (yol ve başlıktaki anahtar sözcük + üst klasör); yalnız eklenir

Güvenlik: notun ilk değişiminden önce özgün dosya <cikti>/_etiket-yedek/<tarih>/ altına kopyalanır; her değişiklik
<cikti>/etiket-gunlugu.jsonl dosyasına yazılır. Gizli içerikli notlara dokunulmaz. Jev çağrısı yapılmaz: sonuç,
puanlama betiğinin önbelleğinden okunur ve yalnız not puanlandıktan sonra değişmemişse kullanılır.

Kullanım:
  python scripts/jev_not_etiketle.py --kasa <kök> --cikti <rapor klasörü> [--onbellek <json>] [--dizin <md>] [--kuru]
"""

import argparse
import datetime
import hashlib
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
for _y in (str(KOK), str(Path(__file__).resolve().parent)):
    if _y not in sys.path:
        sys.path.insert(0, _y)

import jev_not_puanla as puan  # noqa: E402
from jev import istemci  # noqa: E402

BIZIM_ONEKLER = ("jev/", "jev-guven/")
YUKSEK, ORTA = 0.7, 0.5
DIZIN_ADI = "BILGI-DIZINI.md"
GUNLUK_ADI = "etiket-gunlugu.jsonl"
YEDEK_KLASORU = "_etiket-yedek"

# anahtar sözcük (normalize, yol+başlıkta alt dize) -> konu etiketi
KONULAR = (
    ("jev", "jev"), ("barkod", "barkod"), ("taarkod", "barkod"), ("adim adim", "adim-adim"),
    ("adim-adim", "adim-adim"), ("agentmom", "agentmom"), ("tutanak", "tutanak"), ("ocr", "ocr"),
    ("el yazisi", "ocr"), ("kural", "kural"), ("talimat", "kural"), ("hafiza", "hafiza"),
    ("guvenlik", "guvenlik"), ("eposta", "eposta"), ("e-posta", "eposta"), ("skill", "skill"),
    ("eklenti", "eklenti"), ("codex", "codex"), ("qr", "qr"), ("dosya donusturucu", "dosya-donusturucu"),
    ("rea", "rea"), ("denetmen", "denetmen"), ("brif", "brif"), ("token", "token"), ("limit", "token"),
    ("model", "model"), ("kurulum", "kurulum"), ("rapor", "rapor"), ("karar", "karar"),
)


def slug(metin):
    n = puan._norm(metin)
    n = re.sub(r"[^a-z0-9]+", "-", n).strip("-")
    return n[:40]


def konu_etiketleri(goreli, baslik):
    n = " " + puan._norm(goreli + " " + baslik) + " "
    n_kelime = re.sub(r"[^a-z0-9]+", " ", n)
    bulunan = []
    for anahtar, etiket in KONULAR:
        if len(anahtar) <= 3:  # kısa anahtarlar (qr, rea, ocr) yalnız tam sözcük
            tutar = (" " + anahtar + " ") in n_kelime
        else:
            tutar = anahtar in n
        if tutar and "konu/" + etiket not in bulunan:
            bulunan.append("konu/" + etiket)
    parcalar = Path(goreli).parts
    if len(parcalar) > 1:
        k = slug(parcalar[0])
        if k and "konu/" + k not in bulunan:
            bulunan.append("konu/" + k)
    return bulunan or ["konu/diger"]


def guven_etiketi(olasilik):
    return "yuksek" if olasilik >= YUKSEK else "orta" if olasilik >= ORTA else "dusuk"


def jev_etiketleri(sonuc):
    if not isinstance(sonuc, dict) or sonuc.get("oneri") not in puan.SECENEKLER:
        return []
    return ["jev/" + sonuc["oneri"], "jev-guven/" + guven_etiketi(float(sonuc.get("olasilik") or 0))]


def _ac_kapa(satirlar):
    if not satirlar or satirlar[0].strip() != "---":
        return None
    for j in range(1, len(satirlar)):
        if satirlar[j].strip() in ("---", "..."):
            return j
    return None


def _ayir(deger):
    return [x.strip().strip("'\"") for x in deger.split(",") if x.strip()]


def metne_etiket_isle(metin, istenen):
    """(yeni_metin, eklenen, cikarilan). Yalnız tags alanı ya da yeni frontmatter değişir.

    Bizim önekli (jev/, jev-guven/) eski etiketler istenenle değişir; başka hiçbir etiket çıkarılmaz.
    """
    nl = "\r\n" if "\r\n" in metin else "\n"
    satirlar = metin.split(nl)
    j = _ac_kapa(satirlar)
    if j is None:
        yeni = ["---", "tags: [%s]" % ", ".join(istenen), "---"]
        return nl.join(yeni) + nl + metin, list(istenen), []
    fm = satirlar[1:j]
    k = next((i for i, s in enumerate(fm) if re.match(r"^tags\s*:", s)), None)
    if k is None:
        fm.append("tags: [%s]" % ", ".join(istenen))
        return nl.join([satirlar[0]] + fm + satirlar[j:]), list(istenen), []
    mevcut, son = [], k
    kalan = fm[k].split(":", 1)[1].strip()
    if kalan.startswith("[") and kalan.endswith("]"):
        mevcut = _ayir(kalan[1:-1])
        stil = "satir"
    elif kalan:
        mevcut = _ayir(kalan)
        stil = "satir"
    else:
        stil, i = "blok", k + 1
        girinti = ""
        while i < len(fm):
            m = re.match(r"^(\s*)-\s*(.*)$", fm[i])
            if not m:
                break
            girinti = m.group(1)
            mevcut.append(m.group(2).strip().strip("'\""))
            son = i
            i += 1
        if not mevcut:
            girinti = "  "
    cikarilan = [e for e in mevcut if e.startswith(BIZIM_ONEKLER) and e not in istenen]
    eklenen = [e for e in istenen if e not in mevcut]
    if not cikarilan and not eklenen:
        return metin, [], []
    yeni_liste = [e for e in mevcut if e not in cikarilan] + eklenen
    if stil == "satir":
        fm[k] = "tags: [%s]" % ", ".join(yeni_liste)
    else:
        bas = k + 1
        bitis = son + 1 if mevcut else k + 1
        fm[bas:bitis] = ["%s- %s" % (girinti, e) for e in yeni_liste]
    return nl.join([satirlar[0]] + fm + satirlar[j:]), eklenen, cikarilan


def dizin_yaz(yol, bugun, kayitlar):
    """kayitlar: [{yol, baslik, konular, jev, guven}]. Her çalıştırmada yeniden üretilen dosya."""
    konulu = {}
    for r in kayitlar:
        for k in r["konular"]:
            konulu.setdefault(k, []).append(r)
    L = ["# Bilgi dizini", "",
         "Bu dosya Jev etiketlemesiyle otomatik üretilir (%s). Elle düzenlenmez; sonraki çalıştırmada yeniden yazılır." % bugun, "",
         "**Yeni gelen ajan için:** bir bilginin nerede olduğunu aşağıdaki konu başlıklarından bul, ardından notu yoluyla aç. "
         "Yollar not kasasının kökünden görelidir. Konu bulunmazsa kasada etiketle ara (`tags:` içinde `konu/...`) ya da "
         "başlıklara göz at. Jev önerisi (koru/güncelle/arşivle) yalnız öneridir; karar Yusuf'undur.", "",
         "Notlar: %d · Konular: %d" % (len(kayitlar), len(konulu)), ""]

    def satir(r):
        j = "jev/%s (%s)" % (r["jev"], r["guven"]) if r["jev"] else "jev: puansız"
        return "- `%s` — %s — %s" % (r["yol"], r["baslik"].replace("\n", " ")[:90], j)

    for k in sorted(konulu):
        L += ["## %s (%d)" % (k, len(konulu[k])), ""] + [satir(r) for r in sorted(konulu[k], key=lambda r: r["yol"])] + [""]
    for ad, anahtar in (("Güncellenmesi önerilenler", "guncelle"), ("Arşivlenmesi önerilenler", "arsiv")):
        liste = [r for r in kayitlar if r["jev"] == anahtar]
        L += ["## Jev: %s (%d)" % (ad, len(liste)), ""] + ([satir(r) for r in sorted(liste, key=lambda r: r["yol"])] or ["Yok."]) + [""]
    yol = Path(yol)
    yol.parent.mkdir(parents=True, exist_ok=True)
    gecici = yol.with_name(yol.name + ".tmp")
    gecici.write_text("\n".join(L), encoding="utf-8")
    os.replace(gecici, yol)


def etiketle(kasa, cikti, onbellek_yolu, dizin_yolu, bugun, kuru=False, yaz=print):
    cikti = Path(cikti)
    onbellek = puan.onbellek_oku(onbellek_yolu)
    degisen_onbellek = False
    sayac = {"degisen": 0, "ayni": 0, "gizli": 0, "hata": 0}
    kayitlar, gunluk = [], []
    for goreli, yol in puan.notlari_bul(kasa, cikti):
        try:
            ham = Path(yol).read_bytes()
        except OSError:
            sayac["hata"] += 1
            continue
        if len(ham) > puan.AZAMI_OKUMA:
            sayac["hata"] += 1
            continue
        bom = ham.startswith(b"\xef\xbb\xbf")
        metin = ham.decode("utf-8-sig", errors="strict") if _utf8(ham) else None
        if metin is None:
            sayac["hata"] += 1
            continue
        if istemci.gizli_mi(metin) or istemci.gizli_mi(goreli):
            sayac["gizli"] += 1
            continue
        baslik = puan.baslik_bul(metin, yol)
        ozet = hashlib.sha256(ham).hexdigest()
        kayit = onbellek.get(goreli)
        gecerli = isinstance(kayit, dict) and kayit.get("sha256") == ozet
        sonuc = kayit.get("sonuc") if gecerli else None
        # puanı eskimişse mevcut jev/ etiketine dokunulmaz, yalnız konu eklenir
        jev = jev_etiketleri(sonuc) if gecerli else _mevcut_jev(metin)
        konular = konu_etiketleri(goreli, baslik)
        yeni, eklenen, cikarilan = metne_etiket_isle(metin, jev + konular)
        if eklenen or cikarilan:
            if kuru:
                yaz("  %s: +%s -%s" % (goreli, eklenen, cikarilan))
            else:
                _yedekle(cikti, bugun, goreli, ham)
                cikti_bayt = (b"\xef\xbb\xbf" if bom else b"") + yeni.encode("utf-8")
                _atomik_yaz(yol, cikti_bayt)
                gunluk.append({"tarih": bugun, "yol": goreli, "eklenen": eklenen, "cikarilan": cikarilan})
                if gecerli:  # betiğin kendi değişikliği yüzünden not yeniden puanlanmasın
                    kayit["sha256"] = hashlib.sha256(cikti_bayt).hexdigest()
                    degisen_onbellek = True
            sayac["degisen"] += 1
        else:
            sayac["ayni"] += 1
        sonuc_oneri = sonuc.get("oneri") if isinstance(sonuc, dict) else None
        kayitlar.append({"yol": goreli, "baslik": baslik, "konular": konular, "jev": sonuc_oneri,
                         "guven": guven_etiketi(float(sonuc.get("olasilik") or 0)) if sonuc_oneri else ""})
    if not kuru:
        if gunluk:
            cikti.mkdir(parents=True, exist_ok=True)
            with open(cikti / GUNLUK_ADI, "a", encoding="utf-8") as f:
                for g in gunluk:
                    f.write(json.dumps(g, ensure_ascii=False) + "\n")
        if degisen_onbellek:
            puan.onbellek_yaz(onbellek_yolu, onbellek)
        dizin_yaz(dizin_yolu, bugun, kayitlar)
    return sayac


def _utf8(ham):
    try:
        ham.decode("utf-8-sig")
        return True
    except UnicodeDecodeError:
        return False


def _mevcut_jev(metin):
    """Notta zaten bulunan bizim öneklerimizi olduğu gibi korumak için döndürür."""
    nl = "\r\n" if "\r\n" in metin else "\n"
    satirlar = metin.split(nl)
    j = _ac_kapa(satirlar)
    if j is None:
        return []
    return [e for e in re.findall(r"(?:jev|jev-guven)/[A-Za-z0-9_-]+", "\n".join(satirlar[1:j]))]


def _yedekle(cikti, bugun, goreli, ham):
    hedef = Path(cikti) / YEDEK_KLASORU / bugun / goreli
    if hedef.exists():
        return
    hedef.parent.mkdir(parents=True, exist_ok=True)
    hedef.write_bytes(ham)


def _atomik_yaz(yol, bayt):
    yol = Path(yol)
    gecici = yol.with_name(yol.name + ".jevtmp")
    gecici.write_bytes(bayt)
    os.replace(gecici, yol)


def calistir(argv=None, bugun=None, cikis=None):
    cikis = cikis or sys.stdout
    p = argparse.ArgumentParser(description="Jev sonuçlarını notlara etiket olarak işle ve bilgi dizinini üret.")
    p.add_argument("--kasa", required=True)
    p.add_argument("--cikti", required=True)
    p.add_argument("--onbellek")
    p.add_argument("--dizin")
    p.add_argument("--kuru", action="store_true")
    a = p.parse_args(argv)
    bugun = bugun or datetime.date.today().isoformat()
    if not Path(a.kasa).is_dir():
        print("Hata: kasa klasörü bulunamadı: %s" % a.kasa, file=cikis)
        return 2
    onbellek = Path(a.onbellek) if a.onbellek else Path(a.cikti) / ".onbellek.json"
    dizin = Path(a.dizin) if a.dizin else Path(a.cikti) / DIZIN_ADI
    s = etiketle(a.kasa, a.cikti, onbellek, dizin, bugun, a.kuru, yaz=lambda m: print(m, file=cikis))
    print("Etiket: değişen %d, aynı %d, gizli (dokunulmadı) %d, okunamayan %d%s." % (
        s["degisen"], s["ayni"], s["gizli"], s["hata"], " [kuru: yazılmadı]" if a.kuru else ""), file=cikis)
    return 0


if __name__ == "__main__":
    sys.exit(calistir())
