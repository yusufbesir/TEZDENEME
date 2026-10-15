"""CLI: python3 -m jev <komut>"""

import argparse
import json
import os
import sys

from . import istemci, karar, kayit


def _yaz(nesne):
    print(json.dumps(nesne, ensure_ascii=False, indent=2))


def _parser():
    p = argparse.ArgumentParser(prog="jev", description="Jev danışma aracı (Jev danışmandır, karar vermez).")
    alt = p.add_subparsers(dest="komut", required=True)
    d = alt.add_parser("danis", help="Jev'e danış")
    d.add_argument("--girdi", required=True, help="JSON dosyası veya '-' (stdin)")
    s = alt.add_parser("sonuclandir", help="Hakem/kullanıcı sonucunu işle")
    s.add_argument("--karar", required=True)
    s.add_argument("--hakem")
    s.add_argument("--hakem-model")
    s.add_argument("--hakem-gerekce")
    s.add_argument("--kullanici")
    s.add_argument("--onay-mesaji", help="Kullanıcının sohbetteki onay mesajının kimliği (cmsg_...)")
    n = alt.add_parser("sonuc", help="Gerçek doğru cevabı kaydet")
    n.add_argument("--karar", required=True)
    n.add_argument("--dogru", required=True)
    alt.add_parser("rapor", help="Defter raporu")
    alt.add_parser("durum", help="Taşıma ve defter durumu (ağ çağrısı yok)")
    return p


def main(argv=None):
    args = _parser().parse_args(argv)
    try:
        if args.komut == "danis":
            if args.girdi == "-":
                ham = sys.stdin.read()
            else:
                with open(args.girdi, "r", encoding="utf-8-sig") as f:
                    ham = f.read()
            try:
                girdi = json.loads(ham)
            except ValueError as e:
                raise ValueError("Girdi geçerli JSON değil: %s" % e)
            _yaz(karar.danis(girdi))
        elif args.komut == "sonuclandir":
            _yaz(karar.sonuclandir(args.karar, hakem_secimi=args.hakem, hakem_model=args.hakem_model,
                                   hakem_gerekce=args.hakem_gerekce, kullanici_secimi=args.kullanici,
                                   onay_mesaji=args.onay_mesaji))
        elif args.komut == "sonuc":
            _yaz(karar.sonuc_isle(args.karar, args.dogru))
        elif args.komut == "rapor":
            _yaz(karar.rapor())
        elif args.komut == "durum":
            _yaz({
                "tasima": istemci.tasima_yolu(),
                "defter_yolu": kayit.varsayilan_yol(),
                "anahtar_tanimli": "evet" if os.environ.get(istemci.ANAHTAR_ORTAM) else "hayır",
            })
    except (ValueError, OSError) as e:
        print("Hata: %s" % e, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
