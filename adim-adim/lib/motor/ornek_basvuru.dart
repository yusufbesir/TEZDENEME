/// Örnek programlarda arama ve dil başvuru sayfaları (ÖZELLİK 75, Programming
/// Hub). YALNIZ mevcut örnek içeriğinden türetilir: başvuru maddeleri
/// örneklerin kodunda gerçekten geçen terimlerdir (HTML etiketleri, CSS
/// özellikleri, JavaScript anahtar sözcükleri ve yöntem çağrıları); açıklama
/// olarak o terimin ilk geçtiği satır grubunun "ne yapar" notu kullanılır.
/// Dışarıdan API bilgisi eklenmez; böylece her madde örnekte doğrulanabilir.
/// Arama büyük/küçük harf ve Türkçe harf (İ/ı/ş/ğ/ü/ö/ç) duyarsızdır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/ornek_program.dart';
import '../sozluk/sozluk.dart';

/// Başvuru maddesi: [terim] (ör. '<ul>', 'color', 'const', '.push()'), ilk
/// geçtiği grubun [not]u ve geçtiği örneklerin kimlikleri.
class BasvuruMaddesi {
  const BasvuruMaddesi({
    required this.terim,
    required this.not,
    required this.ornekler,
  });
  final String terim;
  final String not;
  final List<String> ornekler;
}

abstract final class OrnekBasvuru {
  /// JavaScript dil anahtar sözcükleri (gramer; yalnız örnekte geçenler alınır).
  static const List<String> jsAnahtarlar = [
    'const',
    'let',
    'var',
    'function',
    'return',
    'if',
    'else',
    'for',
    'while',
    'switch',
    'case',
    'break',
    'continue',
    'new',
    'typeof',
    'try',
    'catch',
    'throw',
    'class',
    'async',
    'await',
  ];

  static final RegExp _etiket = RegExp(r'<([a-zA-Z][a-zA-Z0-9]*)');
  static final RegExp _blok = RegExp(r'\{([^{}]*)\}');
  static final RegExp _ozellik = RegExp(r'(?:^|;)\s*(-{0,2}[a-z][a-z-]*)\s*:');
  static final RegExp _yontem = RegExp(r'\.([A-Za-z_]\w*)\s*\(');

  static Set<String> _terimler(OrnekDili dil, String kod) {
    final t = <String>{};
    switch (dil) {
      case OrnekDili.html:
        for (final m in _etiket.allMatches(kod)) {
          t.add('<${m.group(1)!.toLowerCase()}>');
        }
      case OrnekDili.css:
        for (final b in _blok.allMatches(kod)) {
          for (final m in _ozellik.allMatches(b.group(1)!)) {
            t.add(m.group(1)!);
          }
        }
        for (final m in RegExp(r'@[a-z-]+').allMatches(kod)) {
          t.add(m.group(0)!);
        }
      case OrnekDili.js:
        for (final k in jsAnahtarlar) {
          if (RegExp('\\b$k\\b').hasMatch(kod)) t.add(k);
        }
        for (final m in _yontem.allMatches(kod)) {
          t.add('.${m.group(1)}()');
        }
    }
    return t;
  }

  /// [dil] için başvuru maddeleri, terime göre alfabetik. [ornekler] örnek
  /// listesidir (varsayılan: tüm örnekler çağıran verir).
  static List<BasvuruMaddesi> basvuru(
    OrnekDili dil,
    List<OrnekProgram> ornekler,
  ) {
    final not = <String, String>{};
    final kimlikler = <String, List<String>>{};
    for (final o in ornekler) {
      if (o.dil != dil) continue;
      final bu = <String>{};
      for (final g in o.gruplar) {
        for (final t in _terimler(dil, g.kod)) {
          not.putIfAbsent(t, () => g.not);
          bu.add(t);
        }
      }
      for (final t in bu) {
        (kimlikler[t] ??= []).add(o.id);
      }
    }
    final terimler = not.keys.toList()..sort();
    return [
      for (final t in terimler)
        BasvuruMaddesi(
          terim: t,
          not: not[t]!,
          ornekler: List.unmodifiable(kimlikler[t]!),
        ),
    ];
  }

  static bool _eslesir(String sorgu, Iterable<String> alanlar) {
    final q = Sozluk.normalize(sorgu);
    if (q.isEmpty) return true;
    return alanlar.any((a) => Sozluk.normalize(a).contains(q));
  }

  /// Örnek arama: başlık, açıklama, kod ve notlarda geçer; [dil] verilirse o
  /// dille sınırlı. Boş sorgu tüm (dile uyan) örnekleri döndürür.
  static List<OrnekProgram> ara(
    List<OrnekProgram> ornekler,
    String sorgu, {
    OrnekDili? dil,
  }) => [
    for (final o in ornekler)
      if ((dil == null || o.dil == dil) &&
          _eslesir(sorgu, [
            o.baslik,
            o.aciklama,
            o.dil.etiket,
            for (final g in o.gruplar) ...[g.kod, g.not],
          ]))
        o,
  ];

  /// Başvuru maddelerinde arama (terim ve not).
  static List<BasvuruMaddesi> basvuruAra(
    List<BasvuruMaddesi> maddeler,
    String sorgu,
  ) => [
    for (final m in maddeler)
      if (_eslesir(sorgu, [m.terim, m.not])) m,
  ];
}
