"""Jev'e taşıma katmanı. sor() asla istisna fırlatmaz."""

import importlib.util
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.request

UC_NOKTA = "https://ai-gateway.vercel.sh/v1/systemone"  # SABİT
MODEL = "typesafe-ai/jev"  # SABİT
ANAHTAR_ORTAM = "AI_GATEWAY_API_KEY"
ARACLAR_ORTAM = "JEV_ARACLAR"
VARSAYILAN_ARACLAR = r"D:\YusufII\HAFIZAM1\jev-araclar"
MAKS_YANIT = 1024 * 1024
MAKS_GOVDE = 24000

GIZLI_DESENLER = [
    re.compile(r"sk-[A-Za-z0-9_-]{16,}"),
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"xox[baprs]-"),
    re.compile(r"(?i)(api[_-]?key|secret|password|parola|şifre|token)\s*[:=]\s*\S{6,}"),
    re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\."),
    re.compile(r"sk_live_"),
    re.compile(r"sk_test_"),
    re.compile(r"glpat-"),
    re.compile(r"AIza[0-9A-Za-z_-]{20,}"),
    re.compile(r"hf_[A-Za-z0-9]{20,}"),
    re.compile(r"vck_[A-Za-z0-9]{16,}"),
    re.compile(r"(?i)bearer\s+[A-Za-z0-9._-]{16,}"),
    re.compile(r"(?i)(password|parola|şifre)\s+(is|=|:)\s*\S{6,}"),
]
CIHAZ_KOD = re.compile(r"^[a-z0-9_]{1,32}$")
CIHAZ_MODEL = re.compile(r"^[A-Za-z0-9._:/-]{1,128}$")


def _ortam_anahtari():
    deger = os.environ.get(ANAHTAR_ORTAM, "")
    return deger if len(deger) >= 6 else ""


def metin_gizli_mi(metin):
    """Tek bir metinde gizli bilgi deseni var mı?"""
    if not isinstance(metin, str):
        return False
    for desen in GIZLI_DESENLER:
        if desen.search(metin):
            return True
    anahtar = _ortam_anahtari()
    return bool(anahtar and anahtar in metin)


def gizli_mi(deger):
    """İç içe dict/list/str içinde gizli bilgi var mı? (anahtarlar dahil)"""
    if isinstance(deger, str):
        return metin_gizli_mi(deger)
    if isinstance(deger, dict):
        return any(gizli_mi(k) or gizli_mi(v) for k, v in deger.items())
    if isinstance(deger, (list, tuple)):
        return any(gizli_mi(v) for v in deger)
    return False


def _sonuc(ok, code, answers=None, confidence=None, model=None, t0=None):
    return {
        "ok": ok,
        "degraded": not ok,
        "code": code,
        "answers": answers if answers is not None else {},
        "confidence": confidence if confidence is not None else {},
        "model": model,
        "latency_ms": int((time.monotonic() - t0) * 1000) if t0 is not None else 0,
    }


class YonlendirmeReddedildi(Exception):
    pass


class _YonlendirmeReddet(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise YonlendirmeReddedildi("yönlendirme reddedildi")


def _sayi(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def yanit_dogrula(raw, questions):
    """Yanıtı sorulara göre doğrular. (answers, confidence, model) döner veya None."""
    if not isinstance(raw, dict):
        return None
    answers = raw.get("answers")
    if not isinstance(answers, dict) or not isinstance(questions, dict):
        return None
    if set(answers.keys()) != set(questions.keys()):
        return None
    confidence = {}
    for qid, q in questions.items():
        a = answers[qid]
        if not isinstance(a, dict):
            return None
        if isinstance(q, dict) and q.get("type") == "choice":
            # Gerçek API (cihazdaki jev_client ile aynı şema): seçenekler criteria metinleridir.
            secenekler = q.get("criteria")
            if not isinstance(secenekler, list) or not secenekler:
                return None
            if a.get("choice") not in secenekler:
                return None
            p = a.get("probabilities")
            if not isinstance(p, dict) or set(p.keys()) != set(secenekler):
                return None
            if not all(_sayi(v) and 0 <= v <= 1 for v in p.values()):
                return None
            if abs(sum(p.values()) - 1) > 0.02:
                return None
        c = a.get("confidence")
        if _sayi(c):
            confidence[qid] = c
    model = raw.get("model")
    model = model if isinstance(model, str) and len(model) < 128 else None
    return answers, confidence, model


def _bulut_tasima(body, timeout):
    """Sabit uç noktaya POST. Anahtar yalnızca Authorization başlığına girer."""
    anahtar = os.environ.get(ANAHTAR_ORTAM, "")
    veri = json.dumps(body, ensure_ascii=False).encode("utf-8")
    istek = urllib.request.Request(
        UC_NOKTA,
        data=veri,
        method="POST",
        headers={
            "Authorization": "Bearer " + anahtar,
            "Content-Type": "application/json",
        },
    )
    acici = urllib.request.build_opener(_YonlendirmeReddet)
    with acici.open(istek, timeout=timeout) as yanit:
        ham = yanit.read(MAKS_YANIT + 1)
    if len(ham) > MAKS_YANIT:
        raise ValueError("yanıt çok büyük")
    return json.loads(ham.decode("utf-8"))


def _araclar_dizini():
    return os.environ.get(ARACLAR_ORTAM) or VARSAYILAN_ARACLAR


def tasima_yolu():
    """'cihaz' | 'bulut' | 'yok' (ağ çağrısı yapmaz). Göreli araç yolu cihaz yolunu kapatır."""
    dizin = _araclar_dizini()
    if os.path.isabs(dizin) and os.path.isfile(os.path.join(dizin, "jev_cagri.py")):
        return "cihaz"
    if os.environ.get(ANAHTAR_ORTAM):
        return "bulut"
    return "yok"


def _cihaz_cagri(state, questions, timeout):
    dizin = os.path.realpath(_araclar_dizini())
    dosya = os.path.join(dizin, "jev_cagri.py")
    eski_yol = list(sys.path)
    try:
        # Modül dizini yalnız yükleme/çağrı süresince ve sona eklenir (önceliği yok).
        sys.path.append(dizin)
        spec = importlib.util.spec_from_file_location("_jev_cagri_cihaz", dosya)
        if spec is None or spec.loader is None:
            raise ImportError("jev_cagri yüklenemedi")
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        return modul.sor(state, questions, timeout=timeout)
    finally:
        sys.path[:] = eski_yol


def _cihaz_sonuc(ham, questions, t0):
    """Cihaz çıktısını doğrulayıp sözlüğü yeniden kurar; ham alanlar aktarılmaz."""
    kod = ham.get("code")
    kod = kod if isinstance(kod, str) and CIHAZ_KOD.match(kod) else None
    model = ham.get("model")
    model = model if isinstance(model, str) and CIHAZ_MODEL.match(model) else None
    if ham.get("ok") is not True or ham.get("degraded"):
        return _sonuc(False, kod or "cihaz_hata", model=model, t0=t0)
    # jev_cagri başarıda code=None döndürür; başka bir şey yazılmışsa ve desene uymuyorsa reddet.
    if kod is None and ham.get("code") is not None:
        return _sonuc(False, "cihaz_hata", t0=t0)
    kod = kod or "ok"
    dogrulanmis = yanit_dogrula(ham, questions)
    if dogrulanmis is None:
        return _sonuc(False, "yanit_gecersiz", t0=t0)
    answers, confidence, _ = dogrulanmis
    # jev_cagri güveni answers içinde değil üst düzey confidence sözlüğünde verir.
    ust = ham.get("confidence")
    if isinstance(ust, dict):
        for qid in questions:
            if qid not in confidence and _sayi(ust.get(qid)) and 0 <= ust[qid] <= 1:
                confidence[qid] = ust[qid]
    return _sonuc(True, kod, answers, confidence, model, t0)


def sor(state, questions, timeout=6.0, tasima=None):
    t0 = time.monotonic()
    try:
        if gizli_mi(state) or gizli_mi(questions):
            return _sonuc(False, "gizli_girdi", t0=t0)
        body = {"model": MODEL, "state": state, "questions": questions}
        if len(json.dumps(body, ensure_ascii=False).encode("utf-8")) > MAKS_GOVDE:
            return _sonuc(False, "butce_asimi", t0=t0)

        if tasima is None:
            yol = tasima_yolu()
            if yol == "yok":
                return _sonuc(False, "anahtar_yok", t0=t0)
            if yol == "cihaz":
                try:
                    sonuc = _cihaz_cagri(state, questions, timeout)
                except Exception:
                    return _sonuc(False, "cihaz_hata", t0=t0)
                if not isinstance(sonuc, dict):
                    return _sonuc(False, "cihaz_hata", t0=t0)
                return _cihaz_sonuc(sonuc, questions, t0)
            tasima = _bulut_tasima

        try:
            raw = tasima(body, timeout)
        except YonlendirmeReddedildi:
            return _sonuc(False, "yonlendirme_reddedildi", t0=t0)
        except urllib.error.HTTPError as e:
            return _sonuc(False, "http_%s" % e.code, t0=t0)
        except (TimeoutError, OSError) as e:
            ad = "zaman_asimi" if isinstance(e, TimeoutError) or "timed out" in str(e) else "ag_hatasi"
            return _sonuc(False, ad, t0=t0)
        except (ValueError, UnicodeDecodeError):
            return _sonuc(False, "yanit_gecersiz", t0=t0)
        except Exception:
            return _sonuc(False, "tasima_hata", t0=t0)

        dogrulanmis = yanit_dogrula(raw, questions)
        if dogrulanmis is None:
            return _sonuc(False, "yanit_gecersiz", t0=t0)
        answers, confidence, model = dogrulanmis
        return _sonuc(True, "ok", answers, confidence, model, t0)
    except Exception:
        return _sonuc(False, "beklenmeyen_hata", t0=t0)
