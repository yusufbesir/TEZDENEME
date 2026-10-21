/// Satranç bilgisayar rakibi: çevrimdışı, küçük ve deterministik. Maddi değer
/// + hafif konum bonusu, alfa-beta (varsayılan derinlik 2) ve yalnız taş alma
/// hamleleriyle sınırlı sakin arama (asılı taş görmeme hatasını azaltır).
/// Saf Dart; Flutter'a ve ağa bağımlı değildir.
///
/// Puanlar santipiyon cinsindendir ve SIRASI GELEN taraf açısındandır (büyük
/// iyi). [mat] aşağı yukarı mat skorudur: `mat - uzaklık`.
library;

import 'satranc.dart';

abstract final class SatrancYZ {
  /// Mat skoru; mat uzaklığı (yarım hamle) çıkarılarak yakın mat daha iyi olur.
  static const int mat = 100000;

  /// Taş değerleri (santipiyon): P, N, B, R, Q, K.
  static int deger(String tas) => switch (tas.toLowerCase()) {
    'p' => 100,
    'n' => 320,
    'b' => 330,
    'r' => 500,
    'q' => 900,
    _ => 0,
  };

  /// Beyaz açısından maddi fark (santipiyon).
  static int materyal(Konum k) {
    var s = 0;
    for (var i = 0; i < 64; i++) {
      final t = k.tas(i);
      if (t == null) continue;
      s += t == t.toUpperCase() ? deger(t) : -deger(t);
    }
    return s;
  }

  /// Karenin merkeze uzaklığı 0 (d4/e4/d5/e5) .. 3 (köşe).
  static int _merkezUzakligi(int kare) {
    final s = kare % 8, r = kare ~/ 8;
    final ds = s < 4 ? 3 - s : s - 4;
    final dr = r < 4 ? 3 - r : r - 4;
    return ds > dr ? ds : dr;
  }

  /// Beyaz açısından durağan değerlendirme: madde + konum.
  /// Konum: at/fil/piyon merkeze yakınlık, piyon ilerleyişi, oyun sonunda
  /// şahın merkezi ve (üstünlükte) rakip şahı köşeye sıkıştırma.
  static int degerlendir(Konum k) {
    var madde = 0;
    var konum = 0;
    var taslar = 0; // piyon/şah dışı taş sayısı
    int? bs, ss;
    for (var i = 0; i < 64; i++) {
      final t = k.tas(i);
      if (t == null) continue;
      final beyaz = t == t.toUpperCase();
      final l = t.toLowerCase();
      final isaret = beyaz ? 1 : -1;
      madde += isaret * deger(t);
      if (l == 'k') {
        if (beyaz) {
          bs = i;
        } else {
          ss = i;
        }
        continue;
      }
      if (l != 'p') taslar++;
      final m = 3 - _merkezUzakligi(i);
      switch (l) {
        case 'n':
          konum += isaret * m * 8;
        case 'b':
          konum += isaret * m * 4;
        case 'p':
          final ilerleme = beyaz ? i ~/ 8 - 1 : 6 - i ~/ 8;
          konum += isaret * (ilerleme * 4 + m * 2);
        default:
          konum += isaret * m;
      }
    }
    final sonOyun = taslar <= 4;
    if (bs != null && ss != null) {
      if (sonOyun) {
        konum += (_merkezUzakligi(ss) - _merkezUzakligi(bs)) * 6;
        // Üstün taraf rakip şahı köşeye iter ve kendi şahını yaklaştırır.
        if (madde.abs() >= 300) {
          final ust = madde > 0 ? 1 : -1;
          final sahUzak = _merkezUzakligi(ust > 0 ? ss : bs);
          final dS = ((bs % 8) - (ss % 8)).abs();
          final dR = ((bs ~/ 8) - (ss ~/ 8)).abs();
          final yakin = 14 - (dS + dR);
          konum += ust * (sahUzak * 10 + yakin * 3);
        }
      }
    }
    return madde + konum;
  }

  static int _siraliPuan(Konum k) {
    final p = degerlendir(k);
    return k.beyazSirada ? p : -p;
  }

  static int _siralama(SatrancHamlesi h) {
    var p = 0;
    if (h.alinan != null) {
      p += 10 * deger(h.alinan!) - deger(h.tas) ~/ 10 + 1000;
    }
    if (h.terfi != null) p += 800;
    return p;
  }

  static List<SatrancHamlesi> _sirala(Iterable<SatrancHamlesi> l) {
    final r = l.toList();
    r.sort((a, b) => _siralama(b).compareTo(_siralama(a)));
    return r;
  }

  /// Sakin arama: yalnız taş alma/terfi hamleleri; en çok [kalan] yarım hamle.
  static int _sakin(Konum k, int alfa, int beta, int kalan) {
    final yasal = k.yasalHamleler;
    if (yasal.isEmpty) return k.sah ? -mat : 0;
    final dur = _siraliPuan(k);
    if (kalan <= 0 || dur >= beta) return dur;
    if (dur > alfa) alfa = dur;
    for (final h in _sirala(yasal.where((h) => h.alinan != null))) {
      final p = -_sakin(k.oyna(h), -beta, -alfa, kalan - 1);
      if (p >= beta) return p;
      if (p > alfa) alfa = p;
    }
    return alfa;
  }

  static int _ara(Konum k, int derinlik, int alfa, int beta, int uzaklik) {
    final yasal = k.yasalHamleler;
    if (yasal.isEmpty) return k.sah ? -mat + uzaklik : 0;
    if (derinlik <= 0) return _sakin(k, alfa, beta, 4);
    var en = -mat * 2;
    for (final h in _sirala(yasal)) {
      final p = -_ara(k.oyna(h), derinlik - 1, -beta, -alfa, uzaklik + 1);
      if (p > en) en = p;
      if (p > alfa) alfa = p;
      if (alfa >= beta) break;
    }
    return en;
  }

  /// Her yasal hamlenin [derinlik] yarım hamlelik arama puanı (sırası gelen
  /// taraf açısından), büyükten küçüğe; eşitlerde UCI sırası (kararlı).
  static List<({SatrancHamlesi hamle, int puan})> hamlePuanlari(
    Konum k, {
    int derinlik = 2,
  }) {
    final sonuc = <({SatrancHamlesi hamle, int puan})>[];
    for (final h in k.yasalHamleler) {
      final p = -_ara(k.oyna(h), derinlik - 1, -mat * 2, mat * 2, 1);
      sonuc.add((hamle: h, puan: p));
    }
    sonuc.sort((a, b) {
      final c = b.puan.compareTo(a.puan);
      return c != 0 ? c : a.hamle.uci.compareTo(b.hamle.uci);
    });
    return sonuc;
  }

  /// Bilgisayarın hamlesi; yasal hamle yoksa null. [tohum] verilirse en iyi
  /// puanın [tolerans] içindeki hamleler arasından kararlı biçimde seçilir
  /// (oyunlar birbirine benzemesin); aynı tohum aynı hamleyi verir.
  static SatrancHamlesi? enIyi(
    Konum k, {
    int derinlik = 2,
    int tohum = 0,
    int tolerans = 0,
  }) {
    final p = hamlePuanlari(k, derinlik: derinlik);
    if (p.isEmpty) return null;
    final en = p.first.puan;
    if (en >= mat - 1000) return p.first.hamle; // mat varsa kaçırma
    final adaylar = [
      for (final e in p)
        if (en - e.puan <= tolerans) e.hamle,
    ];
    return adaylar[tohum.abs() % adaylar.length];
  }

  /// Sırası gelen tarafın puanı [puan]'ı beyaz açısından çevirir.
  static int beyazAcisindan(Konum k, int puan) => k.beyazSirada ? puan : -puan;

  /// Mat varsa "M3" gibi (kalan yarım hamleden hamle sayısı), yoksa piyon
  /// cinsinden "+1,3" gibi beyaz açısından kısa değerlendirme metni.
  static String puanMetni(int beyazPuani) {
    if (beyazPuani.abs() >= mat - 1000) {
      final yarim = mat - beyazPuani.abs();
      final n = (yarim + 1) ~/ 2;
      return '${beyazPuani > 0 ? '+' : '-'}M$n';
    }
    final piyon = (beyazPuani / 100).toStringAsFixed(1).replaceAll('.', ',');
    return beyazPuani > 0 ? '+$piyon' : piyon;
  }
}
