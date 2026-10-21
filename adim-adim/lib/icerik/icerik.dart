/// Tüm kursların tek giriş noktası.
library;

import '../model/icerik.dart';
import 'cince_a1.dart';
import 'css_1.dart';
import 'html_1.dart';
import 'ingilizce_a1.dart';
import 'ingilizce_a2.dart';
import 'ingilizce_b1.dart';
import 'ingilizce_b2.dart';
import 'japonca_a1.dart';
import 'js_1.dart';
import 'korece_a1.dart';
import 'almanca_a1.dart';
import 'almanca_a2.dart';
import 'almanca_b1.dart';
import 'css_2.dart';
import 'css_3.dart';
import 'html_2.dart';
import 'html_3.dart';
import 'js_2.dart';
import 'js_3.dart';
import 'python_1.dart';
import 'python_2.dart';
import 'python_3.dart';

export 'cince_a1.dart' show cinceA1;
export 'css_1.dart' show css1;
export 'html_1.dart' show html1;
export 'ingilizce_a1.dart' show ingilizceA1;
export 'ingilizce_a2.dart' show ingilizceA2;
export 'ingilizce_b1.dart' show ingilizceB1;
export 'ingilizce_b2.dart' show ingilizceB2;
export 'japonca_a1.dart' show japoncaA1;
export 'js_1.dart' show js1;
export 'korece_a1.dart' show koreceA1;
export 'almanca_a1.dart' show almancaA1;
export 'almanca_a2.dart' show almancaA2;
export 'almanca_b1.dart' show almancaB1;
export 'css_2.dart' show css2;
export 'css_3.dart' show css3;
export 'html_2.dart' show html2;
export 'html_3.dart' show html3;
export 'js_2.dart' show js2;
export 'js_3.dart' show js3;
export 'python_1.dart' show python1;
export 'python_2.dart' show python2;
export 'python_3.dart' show python3;

final List<Kurs> tumKurslar = List.unmodifiable(<Kurs>[
  ingilizceA1,
  ingilizceA2,
  ingilizceB1,
  ingilizceB2,
  almancaA1,
  almancaA2,
  almancaB1,
  koreceA1,
  japoncaA1,
  cinceA1,
  html1,
  css1,
  js1,
  html2,
  html3,
  css2,
  css3,
  js2,
  js3,
  python1,
  python2,
  python3,
]);

/// Kimliğe göre kurs bulur; yoksa null döner.
Kurs? kursBul(String id) {
  for (final k in tumKurslar) {
    if (k.id == id) return k;
  }
  return null;
}
