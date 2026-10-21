/// Satranç kural motoru: FEN okuma/yazma, yasal hamle üretimi (rok, geçerken
/// alma, terfi dahil), şah/mat/pat, UCI ve SAN gösterimi, zorlanmış mat
/// araması (mat-in-N doğrulaması).
///
/// Saf Dart; Flutter'a ve ağa bağımlı değildir. Değiştirilemez (immutable)
/// konum nesneleri kullanır; [Konum.oyna] yeni konum döndürür.
/// Kare numarası: a1 = 0, b1 = 1, ..., h8 = 63 (sıra * 8 + sütun).
/// Taşlar FEN harfleriyle tutulur: büyük harf beyaz, küçük harf siyah
/// (K/k şah, Q/q vezir, R/r kale, B/b fil, N/n at, P/p piyon).
library;

/// Kare adı: 0 -> 'a1', 63 -> 'h8'.
String kareAdi(int kare) =>
    '${String.fromCharCode(97 + kare % 8)}${kare ~/ 8 + 1}';

/// Kare adından numara; geçersizse null.
int? kareNo(String ad) {
  if (ad.length != 2) return null;
  final s = ad.codeUnitAt(0) - 97;
  final r = ad.codeUnitAt(1) - 49;
  if (s < 0 || s > 7 || r < 0 || r > 7) return null;
  return r * 8 + s;
}

/// İngilizce SAN'ı Türkçe harflere çevirir: K→Ş, Q→V, R→K, B→F, N→A
/// (piyon harfsiz; rok 'O-O' aynı kalır).
String turkceSan(String san) {
  final b = StringBuffer();
  for (final c in san.split('')) {
    b.write(switch (c) {
      'K' => 'Ş',
      'Q' => 'V',
      'R' => 'K',
      'B' => 'F',
      'N' => 'A',
      _ => c,
    });
  }
  return b.toString();
}

/// Taşın Türkçe adı (renksiz): 'p' -> 'piyon'.
String tasAdi(String tas) => switch (tas.toLowerCase()) {
  'k' => 'şah',
  'q' => 'vezir',
  'r' => 'kale',
  'b' => 'fil',
  'n' => 'at',
  _ => 'piyon',
};

/// Taşın renkli Türkçe adı: 'N' -> 'beyaz at'.
String tasTamAdi(String tas) =>
    '${tas == tas.toUpperCase() ? 'beyaz' : 'siyah'} ${tasAdi(tas)}';

/// Tek bir hamle. [tas] hareket eden taş (FEN harfi), [alinan] alınan taş.
class SatrancHamlesi {
  const SatrancHamlesi({
    required this.kaynak,
    required this.hedef,
    required this.tas,
    this.alinan,
    this.terfi,
    this.rok = false,
    this.gecerken = false,
  });

  final int kaynak;
  final int hedef;
  final String tas;
  final String? alinan;

  /// Terfi taşı küçük harfle ('q', 'r', 'b', 'n'); terfi yoksa null.
  final String? terfi;
  final bool rok;
  final bool gecerken;

  /// UCI gösterimi: 'e2e4', 'e7e8q'.
  String get uci => '${kareAdi(kaynak)}${kareAdi(hedef)}${terfi ?? ''}';

  @override
  String toString() => uci;
}

class Konum {
  Konum._(
    this._t,
    this.beyazSirada,
    this.rokHaklari,
    this.gecerkenKare,
    this.yariHamle,
    this.hamleNo,
  );

  /// Başlangıç konumu.
  static const String baslangicFen =
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  final List<String?> _t;
  final bool beyazSirada;

  /// 'KQkq' alt kümesi; hak yoksa boş metin.
  final String rokHaklari;

  /// Geçerken alma hedef karesi; yoksa null.
  final int? gecerkenKare;
  final int yariHamle;
  final int hamleNo;

  /// Karedeki taş (FEN harfi) ya da null.
  String? tas(int kare) => _t[kare];

  /// FEN'den konum. Geçersiz FEN'de [FormatException]: sıra/sütun sayısı,
  /// taş harfleri, her renkte tam bir şah, 1. ve 8. sırada piyon olmaması,
  /// rok haklarının şah/kale yerleriyle uyumu, geçerken karesi ve sırası
  /// gelmeyen tarafın şah altında olmaması denetlenir.
  factory Konum.fen(String fen) {
    final p = fen.trim().split(RegExp(r'\s+'));
    if (p.length != 6 && p.length != 4) {
      throw FormatException('FEN 4 ya da 6 alan içermeli', fen);
    }
    final satirlar = p[0].split('/');
    if (satirlar.length != 8) throw FormatException('FEN 8 sıra içermeli', fen);
    final t = List<String?>.filled(64, null);
    for (var i = 0; i < 8; i++) {
      final sira = 7 - i;
      var sutun = 0;
      for (final c in satirlar[i].split('')) {
        final n = int.tryParse(c);
        if (n != null) {
          if (n < 1 || n > 8) throw FormatException('Geçersiz sayı', fen);
          sutun += n;
        } else {
          if (!'KQRBNPkqrbnp'.contains(c)) {
            throw FormatException('Geçersiz taş: $c', fen);
          }
          if (sutun > 7) throw FormatException('Sıra taşıyor', fen);
          t[sira * 8 + sutun] = c;
          sutun++;
        }
      }
      if (sutun != 8) throw FormatException('Sıra 8 kare değil', fen);
    }
    final sira = p[1];
    if (sira != 'w' && sira != 'b') throw FormatException('Sıra w/b', fen);
    final rok = p[2] == '-' ? '' : p[2];
    if (!RegExp(r'^K?Q?k?q?$').hasMatch(rok)) {
      throw FormatException('Geçersiz rok hakkı', fen);
    }
    int? ep;
    if (p[3] != '-') {
      ep = kareNo(p[3]);
      if (ep == null) throw FormatException('Geçersiz geçerken karesi', fen);
    }
    final yari = p.length == 6 ? int.tryParse(p[4]) : 0;
    final no = p.length == 6 ? int.tryParse(p[5]) : 1;
    if (yari == null || yari < 0 || no == null || no < 1) {
      throw FormatException('Geçersiz hamle sayacı', fen);
    }
    final k = Konum._(List.unmodifiable(t), sira == 'w', rok, ep, yari, no);
    final hata = k._gecerlilikHatasi();
    if (hata != null) throw FormatException(hata, fen);
    return k;
  }

  /// FEN geçerli mi (fırlatmadan).
  static bool fenGecerli(String fen) {
    try {
      Konum.fen(fen);
      return true;
    } on FormatException {
      return false;
    }
  }

  String? _gecerlilikHatasi() {
    var bs = 0, ss = 0, bp = 0, sp = 0, bt = 0, st = 0;
    for (var i = 0; i < 64; i++) {
      final c = _t[i];
      if (c == null) continue;
      if (_beyaz(c)) {
        bt++;
      } else {
        st++;
      }
      if (c == 'K') bs++;
      if (c == 'k') ss++;
      if (c == 'P' || c == 'p') {
        if (i < 8 || i >= 56) return '1. ya da 8. sırada piyon';
        if (c == 'P') bp++;
        if (c == 'p') sp++;
      }
    }
    if (bs != 1 || ss != 1) return 'Her renkte tam bir şah olmalı';
    if (bp > 8 || sp > 8 || bt > 16 || st > 16) return 'Taş sayısı fazla';
    if (rokHaklari.contains('K') && (_t[4] != 'K' || _t[7] != 'R')) {
      return 'K rok hakkı uyumsuz';
    }
    if (rokHaklari.contains('Q') && (_t[4] != 'K' || _t[0] != 'R')) {
      return 'Q rok hakkı uyumsuz';
    }
    if (rokHaklari.contains('k') && (_t[60] != 'k' || _t[63] != 'r')) {
      return 'k rok hakkı uyumsuz';
    }
    if (rokHaklari.contains('q') && (_t[60] != 'k' || _t[56] != 'r')) {
      return 'q rok hakkı uyumsuz';
    }
    final ep = gecerkenKare;
    if (ep != null) {
      // Beyaz sıradaysa siyah az önce iki kare ilerledi: ep 6. sırada.
      final beklenenSira = beyazSirada ? 5 : 2;
      if (ep ~/ 8 != beklenenSira) return 'Geçerken karesi sırası yanlış';
      final piyonKare = beyazSirada ? ep - 8 : ep + 8;
      if (_t[piyonKare] != (beyazSirada ? 'p' : 'P')) {
        return 'Geçerken karesinin önünde piyon yok';
      }
      if (_t[ep] != null) return 'Geçerken karesi dolu';
    }
    // Sırası gelmeyen taraf şah altında olamaz.
    if (_saldiriAltinda(_sahKaresi(!beyazSirada), beyazSirada)) {
      return 'Sırası gelmeyen taraf şah altında';
    }
    return null;
  }

  static bool _beyaz(String c) => c.toUpperCase() == c;

  /// FEN metni.
  String get fen {
    final b = StringBuffer();
    for (var sira = 7; sira >= 0; sira--) {
      var bos = 0;
      for (var s = 0; s < 8; s++) {
        final c = _t[sira * 8 + s];
        if (c == null) {
          bos++;
        } else {
          if (bos > 0) b.write(bos);
          bos = 0;
          b.write(c);
        }
      }
      if (bos > 0) b.write(bos);
      if (sira > 0) b.write('/');
    }
    b.write(beyazSirada ? ' w ' : ' b ');
    b.write(rokHaklari.isEmpty ? '-' : rokHaklari);
    b.write(' ${gecerkenKare == null ? '-' : kareAdi(gecerkenKare!)}');
    b.write(' $yariHamle $hamleNo');
    return b.toString();
  }

  int _sahKaresi(bool beyaz) {
    final s = beyaz ? 'K' : 'k';
    for (var i = 0; i < 64; i++) {
      if (_t[i] == s) return i;
    }
    return -1;
  }

  static const _atYon = [
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
    [-1, -2],
    [-2, -1],
    [-2, 1],
    [-1, 2],
  ];
  static const _sahYon = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ];
  static const _capraz = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ];
  static const _duz = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];

  /// [kare] [beyazSaldirir] renginin saldırısı altında mı?
  bool _saldiriAltinda(int kare, bool beyazSaldirir) {
    if (kare < 0) return false;
    final s0 = kare % 8, r0 = kare ~/ 8;
    String? at(int s, int r) =>
        (s < 0 || s > 7 || r < 0 || r > 7) ? null : _t[r * 8 + s];
    bool renk(String? c) => c != null && _beyaz(c) == beyazSaldirir;
    // Piyon
    final pr = beyazSaldirir ? r0 - 1 : r0 + 1;
    final piyon = beyazSaldirir ? 'P' : 'p';
    if (at(s0 - 1, pr) == piyon || at(s0 + 1, pr) == piyon) return true;
    for (final d in _atYon) {
      final c = at(s0 + d[0], r0 + d[1]);
      if (renk(c) && c!.toLowerCase() == 'n') return true;
    }
    for (final d in _sahYon) {
      final c = at(s0 + d[0], r0 + d[1]);
      if (renk(c) && c!.toLowerCase() == 'k') return true;
    }
    bool kayar(List<List<int>> yonler, String a, String b) {
      for (final d in yonler) {
        var s = s0 + d[0], r = r0 + d[1];
        while (s >= 0 && s < 8 && r >= 0 && r < 8) {
          final c = _t[r * 8 + s];
          if (c != null) {
            if (renk(c)) {
              final l = c.toLowerCase();
              if (l == a || l == b) return true;
            }
            break;
          }
          s += d[0];
          r += d[1];
        }
      }
      return false;
    }

    return kayar(_capraz, 'b', 'q') || kayar(_duz, 'r', 'q');
  }

  /// Sırası gelen taraf şah altında mı?
  bool get sah => _saldiriAltinda(_sahKaresi(beyazSirada), !beyazSirada);

  List<SatrancHamlesi>? _yasal;

  /// Tüm yasal hamleler.
  List<SatrancHamlesi> get yasalHamleler => _yasal ??= List.unmodifiable([
    for (final h in _yalanciHamleler())
      if (!_oyna(h)._kendiSahiAcik(beyazSirada)) h,
  ]);

  /// [beyaz] tarafın şahı saldırı altında mı (hamle sonrası denetim)?
  bool _kendiSahiAcik(bool beyaz) => _saldiriAltinda(_sahKaresi(beyaz), !beyaz);

  bool get mat => sah && yasalHamleler.isEmpty;
  bool get pat => !sah && yasalHamleler.isEmpty;

  /// Kaynak karedeki taşın yasal hamleleri.
  List<SatrancHamlesi> kareHamleleri(int kaynak) => [
    for (final h in yasalHamleler)
      if (h.kaynak == kaynak) h,
  ];

  Iterable<SatrancHamlesi> _yalanciHamleler() sync* {
    final biz = beyazSirada;
    for (var k = 0; k < 64; k++) {
      final c = _t[k];
      if (c == null || _beyaz(c) != biz) continue;
      final s0 = k % 8, r0 = k ~/ 8;
      final l = c.toLowerCase();
      SatrancHamlesi? hedefe(int s, int r) {
        if (s < 0 || s > 7 || r < 0 || r > 7) return null;
        final h = r * 8 + s;
        final d = _t[h];
        if (d != null && _beyaz(d) == biz) return null;
        return SatrancHamlesi(kaynak: k, hedef: h, tas: c, alinan: d);
      }

      switch (l) {
        case 'p':
          final yon = biz ? 1 : -1;
          final basla = biz ? 1 : 6;
          final son = biz ? 7 : 0;
          Iterable<SatrancHamlesi> terfiler(int h, String? alinan) sync* {
            if (h ~/ 8 == son) {
              for (final t in ['q', 'r', 'b', 'n']) {
                yield SatrancHamlesi(
                  kaynak: k,
                  hedef: h,
                  tas: c,
                  alinan: alinan,
                  terfi: t,
                );
              }
            } else {
              yield SatrancHamlesi(kaynak: k, hedef: h, tas: c, alinan: alinan);
            }
          }
          final ileri = (r0 + yon) * 8 + s0;
          if (_t[ileri] == null) {
            yield* terfiler(ileri, null);
            final iki = (r0 + 2 * yon) * 8 + s0;
            if (r0 == basla && _t[iki] == null) {
              yield SatrancHamlesi(kaynak: k, hedef: iki, tas: c);
            }
          }
          for (final ds in [-1, 1]) {
            final s = s0 + ds;
            if (s < 0 || s > 7) continue;
            final h = (r0 + yon) * 8 + s;
            final d = _t[h];
            if (d != null && _beyaz(d) != biz) {
              yield* terfiler(h, d);
            } else if (h == gecerkenKare) {
              yield SatrancHamlesi(
                kaynak: k,
                hedef: h,
                tas: c,
                alinan: biz ? 'p' : 'P',
                gecerken: true,
              );
            }
          }
        case 'n':
          for (final d in _atYon) {
            final h = hedefe(s0 + d[0], r0 + d[1]);
            if (h != null) yield h;
          }
        case 'k':
          for (final d in _sahYon) {
            final h = hedefe(s0 + d[0], r0 + d[1]);
            if (h != null) yield h;
          }
          // Rok: şah ve kale yerinde, ara kareler boş, şah geçtiği karelerde
          // saldırı altında değil.
          final dusman = !biz;
          if (biz && k == 4 || !biz && k == 60) {
            final kisa = biz ? 'K' : 'k';
            final uzun = biz ? 'Q' : 'q';
            if (rokHaklari.contains(kisa) &&
                _t[k + 1] == null &&
                _t[k + 2] == null &&
                !_saldiriAltinda(k, dusman) &&
                !_saldiriAltinda(k + 1, dusman) &&
                !_saldiriAltinda(k + 2, dusman)) {
              yield SatrancHamlesi(kaynak: k, hedef: k + 2, tas: c, rok: true);
            }
            if (rokHaklari.contains(uzun) &&
                _t[k - 1] == null &&
                _t[k - 2] == null &&
                _t[k - 3] == null &&
                !_saldiriAltinda(k, dusman) &&
                !_saldiriAltinda(k - 1, dusman) &&
                !_saldiriAltinda(k - 2, dusman)) {
              yield SatrancHamlesi(kaynak: k, hedef: k - 2, tas: c, rok: true);
            }
          }
        default:
          final yonler = switch (l) {
            'b' => _capraz,
            'r' => _duz,
            _ => [..._capraz, ..._duz],
          };
          for (final d in yonler) {
            var s = s0 + d[0], r = r0 + d[1];
            while (s >= 0 && s < 8 && r >= 0 && r < 8) {
              final h = r * 8 + s;
              final x = _t[h];
              if (x != null && _beyaz(x) == biz) break;
              yield SatrancHamlesi(kaynak: k, hedef: h, tas: c, alinan: x);
              if (x != null) break;
              s += d[0];
              r += d[1];
            }
          }
      }
    }
  }

  /// Hamleyi denetlemeden uygular (yasal hamleler için).
  Konum _oyna(SatrancHamlesi h) {
    final t = List<String?>.of(_t);
    final c = h.tas;
    t[h.kaynak] = null;
    t[h.hedef] = h.terfi == null
        ? c
        : (beyazSirada ? h.terfi!.toUpperCase() : h.terfi!);
    if (h.gecerken) t[beyazSirada ? h.hedef - 8 : h.hedef + 8] = null;
    if (h.rok) {
      if (h.hedef > h.kaynak) {
        t[h.kaynak + 1] = t[h.kaynak + 3];
        t[h.kaynak + 3] = null;
      } else {
        t[h.kaynak - 1] = t[h.kaynak - 4];
        t[h.kaynak - 4] = null;
      }
    }
    var rok = rokHaklari;
    String sil(String r, String harfler) {
      for (final x in harfler.split('')) {
        r = r.replaceAll(x, '');
      }
      return r;
    }

    if (c == 'K') rok = sil(rok, 'KQ');
    if (c == 'k') rok = sil(rok, 'kq');
    for (final kare in [h.kaynak, h.hedef]) {
      if (kare == 0) rok = sil(rok, 'Q');
      if (kare == 7) rok = sil(rok, 'K');
      if (kare == 56) rok = sil(rok, 'q');
      if (kare == 63) rok = sil(rok, 'k');
    }
    final piyon = c == 'P' || c == 'p';
    final ep = piyon && (h.hedef - h.kaynak).abs() == 16
        ? (h.hedef + h.kaynak) ~/ 2
        : null;
    return Konum._(
      List.unmodifiable(t),
      !beyazSirada,
      rok,
      ep,
      (piyon || h.alinan != null) ? 0 : yariHamle + 1,
      beyazSirada ? hamleNo : hamleNo + 1,
    );
  }

  /// Yasal hamleyi uygular; yasal değilse [ArgumentError].
  Konum oyna(SatrancHamlesi h) {
    if (!yasalHamleler.any((y) => y.uci == h.uci)) {
      throw ArgumentError.value(h.uci, 'h', 'Yasal hamle değil');
    }
    return _oyna(h);
  }

  /// UCI metnine ('e2e4', 'e7e8q') karşılık gelen yasal hamle; yoksa null.
  SatrancHamlesi? uciBul(String uci) {
    final u = uci.trim().toLowerCase();
    for (final h in yasalHamleler) {
      if (h.uci == u) return h;
    }
    return null;
  }

  /// UCI hamlesini uygular; yasal değilse null.
  Konum? uciOyna(String uci) {
    final h = uciBul(uci);
    return h == null ? null : _oyna(h);
  }

  /// Standart cebirsel gösterim (İngilizce harfler, +/# ekli).
  String san(SatrancHamlesi h) {
    final b = StringBuffer();
    final l = h.tas.toLowerCase();
    if (h.rok) {
      b.write(h.hedef > h.kaynak ? 'O-O' : 'O-O-O');
    } else if (l == 'p') {
      if (h.alinan != null) b.write('${kareAdi(h.kaynak)[0]}x');
      b.write(kareAdi(h.hedef));
      if (h.terfi != null) b.write('=${h.terfi!.toUpperCase()}');
    } else {
      b.write(l.toUpperCase());
      final digerleri = [
        for (final y in yasalHamleler)
          if (y.tas == h.tas && y.hedef == h.hedef && y.kaynak != h.kaynak) y,
      ];
      if (digerleri.isNotEmpty) {
        final ayniSutun = digerleri.any((y) => y.kaynak % 8 == h.kaynak % 8);
        final ayniSira = digerleri.any((y) => y.kaynak ~/ 8 == h.kaynak ~/ 8);
        if (!ayniSutun) {
          b.write(kareAdi(h.kaynak)[0]);
        } else if (!ayniSira) {
          b.write(kareAdi(h.kaynak)[1]);
        } else {
          b.write(kareAdi(h.kaynak));
        }
      }
      if (h.alinan != null) b.write('x');
      b.write(kareAdi(h.hedef));
    }
    final sonra = _oyna(h);
    if (sonra.mat) {
      b.write('#');
    } else if (sonra.sah) {
      b.write('+');
    }
    return b.toString();
  }

  /// Sırası gelen taraf en çok [n] hamlede (kendi hamlesi sayısı) zorla mat
  /// edebilir mi? Küçük n (1–3) için tam arama.
  bool matZorlanir(int n) {
    if (n <= 0) return false;
    for (final h in yasalHamleler) {
      if (hamleZorlarMat(h, n)) return true;
    }
    return false;
  }

  /// [h] oynanınca, sırası gelen taraf en çok [n] hamlede (bu hamle dahil)
  /// zorla mat eder mi?
  bool hamleZorlarMat(SatrancHamlesi h, int n) {
    if (n <= 0) return false;
    final s = _oyna(h);
    if (s.mat) return true;
    if (n == 1) return false;
    final cevaplar = s.yasalHamleler;
    if (cevaplar.isEmpty) return false; // pat
    for (final c in cevaplar) {
      if (!s._oyna(c).matZorlanir(n - 1)) return false;
    }
    return true;
  }

  /// Hamle üretimi doğrulaması için düğüm sayımı.
  int perft(int derinlik) {
    if (derinlik == 0) return 1;
    final hamleler = yasalHamleler;
    if (derinlik == 1) return hamleler.length;
    var n = 0;
    for (final h in hamleler) {
      n += _oyna(h).perft(derinlik - 1);
    }
    return n;
  }
}
