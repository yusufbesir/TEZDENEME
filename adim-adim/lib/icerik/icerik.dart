/// Tüm kursların tek giriş noktası.
library;

import '../model/icerik.dart';
import 'css_1.dart';
import 'html_1.dart';
import 'ingilizce_a1.dart';
import 'ingilizce_a2.dart';
import 'ingilizce_b1.dart';
import 'js_1.dart';

export 'css_1.dart' show css1;
export 'html_1.dart' show html1;
export 'ingilizce_a1.dart' show ingilizceA1;
export 'ingilizce_a2.dart' show ingilizceA2;
export 'ingilizce_b1.dart' show ingilizceB1;
export 'js_1.dart' show js1;

final List<Kurs> tumKurslar = List.unmodifiable(<Kurs>[
  ingilizceA1,
  ingilizceA2,
  ingilizceB1,
  html1,
  css1,
  js1,
]);

/// Kimliğe göre kurs bulur; yoksa null döner.
Kurs? kursBul(String id) {
  for (final k in tumKurslar) {
    if (k.id == id) return k;
  }
  return null;
}
