/// Çok kurslu öğrenme yolu (ÖZELLİK 74, Brilliant): yol -> seviye -> kurs, her
/// düzeyde yüzde ilerleme. Mevcut kurs listesinden türetilir, saklanmaz:
/// kurs kimliği 'taban-N' (ör. 'html-2') ise taban bir yola, N seviyeye karşılık
/// gelir. HTML, CSS ve JavaScript tek "Web" yolunda birleşir; her seviyede sıra
/// HTML -> CSS -> JS'dir. Diğer tabanlar kendi yolunu oluşturur (İngilizce,
/// Almanca, Python, ...). Yalnız verilen kurslar (seçili alan) gösterilir.
/// İlerleme: biten ya da atlanan ders / toplam ders (Motor.dersBitmis).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'motor.dart';

class YolKursu {
  const YolKursu({
    required this.kurs,
    required this.biten,
    required this.toplam,
  });
  final Kurs kurs;
  final int biten;
  final int toplam;

  double get oran => toplam == 0 ? 0 : biten / toplam;
  int get yuzde => (oran * 100).floor();
}

class YolSeviyesi {
  const YolSeviyesi({
    required this.sira,
    required this.etiket,
    required this.kurslar,
  });

  /// Kurs kimliğindeki seviye numarası (1'den).
  final int sira;

  /// "A1" gibi CEFR etiketi (kurs adında geçiyorsa) ya da "Seviye N".
  final String etiket;
  final List<YolKursu> kurslar;

  int get biten => kurslar.fold(0, (t, k) => t + k.biten);
  int get toplam => kurslar.fold(0, (t, k) => t + k.toplam);
  int get yuzde => toplam == 0 ? 0 : (100 * biten / toplam).floor();
}

class Yol {
  const Yol({required this.kimlik, required this.ad, required this.seviyeler});
  final String kimlik;
  final String ad;
  final List<YolSeviyesi> seviyeler;

  int get biten => seviyeler.fold(0, (t, s) => t + s.biten);
  int get toplam => seviyeler.fold(0, (t, s) => t + s.toplam);
  int get yuzde => toplam == 0 ? 0 : (100 * biten / toplam).floor();
  Iterable<YolKursu> get kurslar => seviyeler.expand((s) => s.kurslar);
}

abstract final class OgrenmeYolu {
  /// Taban -> (yol kimliği, yol adı, yol içi sıra). Tabloda olmayan taban kendi
  /// yoludur (adı baş harfi büyük taban).
  static const Map<String, ({String yol, String ad, int sira})> _yollar = {
    'html': (yol: 'web', ad: 'Web', sira: 0),
    'css': (yol: 'web', ad: 'Web', sira: 1),
    'js': (yol: 'web', ad: 'Web', sira: 2),
    'python': (yol: 'python', ad: 'Python', sira: 0),
    'sql': (yol: 'sql', ad: 'SQL', sira: 0),
    'php': (yol: 'php', ad: 'PHP', sira: 0),
    'go': (yol: 'go', ad: 'Go', sira: 0),
    'ingilizce': (yol: 'ingilizce', ad: 'İngilizce', sira: 0),
    'almanca': (yol: 'almanca', ad: 'Almanca', sira: 0),
    'fransizca': (yol: 'fransizca', ad: 'Fransızca', sira: 0),
    'korece': (yol: 'korece', ad: 'Korece', sira: 0),
    'japonca': (yol: 'japonca', ad: 'Japonca', sira: 0),
    'cince': (yol: 'cince', ad: 'Çince', sira: 0),
    'satranc': (yol: 'satranc', ad: 'Satranç', sira: 0),
  };

  static final RegExp _kimlik = RegExp(r'^(.+)-(\d+)$');
  static final RegExp _cefr = RegExp(r'\b([ABC][12])\b');

  static YolKursu kursIlerlemesi(OgrenciDurumu d, Kurs k) {
    final dersler = k.tumDersler.toList();
    return YolKursu(
      kurs: k,
      biten: dersler.where((x) => Motor.dersBitmis(d, x.id)).length,
      toplam: dersler.length,
    );
  }

  /// [kurslar]dan yollar; yollar ilk kurslarının listedeki sırasına göre.
  static List<Yol> uret(OgrenciDurumu d, List<Kurs> kurslar) {
    final yolSirasi = <String>[];
    final adlar = <String, String>{};
    // yol -> seviye no -> (sıra, kurs) listesi
    final harita = <String, Map<int, List<({int sira, Kurs kurs})>>>{};
    for (final k in kurslar) {
      final m = _kimlik.firstMatch(k.id);
      final taban = m?.group(1) ?? k.id;
      final seviye = int.tryParse(m?.group(2) ?? '') ?? 1;
      final t = _yollar[taban];
      final yol = t?.yol ?? taban;
      if (!harita.containsKey(yol)) {
        yolSirasi.add(yol);
        adlar[yol] =
            t?.ad ??
            (taban.isEmpty
                ? taban
                : taban[0].toUpperCase() + taban.substring(1));
        harita[yol] = {};
      }
      harita[yol]!.putIfAbsent(seviye, () => []).add((
        sira: t?.sira ?? 0,
        kurs: k,
      ));
    }
    return [
      for (final y in yolSirasi)
        Yol(
          kimlik: y,
          ad: adlar[y]!,
          seviyeler: [
            for (final no in (harita[y]!.keys.toList()..sort()))
              YolSeviyesi(
                sira: no,
                etiket: _etiket(harita[y]![no]!, no),
                kurslar: [
                  for (final e
                      in (harita[y]![no]!.toList()
                        ..sort((a, b) => a.sira.compareTo(b.sira))))
                    kursIlerlemesi(d, e.kurs),
                ],
              ),
          ],
        ),
    ];
  }

  static String _etiket(List<({int sira, Kurs kurs})> kurslar, int no) {
    for (final e in kurslar) {
      final m = _cefr.firstMatch(e.kurs.ad);
      if (m != null) return m.group(1)!;
    }
    return 'Seviye $no';
  }
}
