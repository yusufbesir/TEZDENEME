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
import 'ingilizce_c1.dart';
import 'japonca_a1.dart';
import 'js_1.dart';
import 'korece_a1.dart';
import 'almanca_a1.dart';
import 'almanca_a2.dart';
import 'almanca_b1.dart';
import 'fransizca_a1.dart';
import 'rusca_a1.dart';
import 'arapca_a1.dart';
import 'css_2.dart';
import 'css_3.dart';
import 'go_1.dart';
import 'go_2.dart';
import 'go_3.dart';
import 'html_2.dart';
import 'html_3.dart';
import 'js_2.dart';
import 'js_3.dart';
import 'php_1.dart';
import 'php_2.dart';
import 'php_3.dart';
import 'python_1.dart';
import 'python_2.dart';
import 'python_3.dart';
import 'satranc_1.dart';
import 'sql_1.dart';
import 'sql_2.dart';
import 'sql_3.dart';
import 'satranc_2.dart';
import 'satranc_3.dart';

export 'cince_a1.dart' show cinceA1;
export 'css_1.dart' show css1;
export 'html_1.dart' show html1;
export 'ingilizce_a1.dart' show ingilizceA1;
export 'ingilizce_a2.dart' show ingilizceA2;
export 'ingilizce_b1.dart' show ingilizceB1;
export 'ingilizce_b2.dart' show ingilizceB2;
export 'ingilizce_c1.dart' show ingilizceC1;
export 'japonca_a1.dart' show japoncaA1;
export 'js_1.dart' show js1;
export 'korece_a1.dart' show koreceA1;
export 'almanca_a1.dart' show almancaA1;
export 'almanca_a2.dart' show almancaA2;
export 'almanca_b1.dart' show almancaB1;
export 'fransizca_a1.dart' show fransizcaA1;
export 'rusca_a1.dart' show ruscaA1;
export 'arapca_a1.dart' show arapcaA1;
export 'css_2.dart' show css2;
export 'css_3.dart' show css3;
export 'html_2.dart' show html2;
export 'html_3.dart' show html3;
export 'js_2.dart' show js2;
export 'js_3.dart' show js3;
export 'python_1.dart' show python1;
export 'python_2.dart' show python2;
export 'python_3.dart' show python3;
export 'satranc_1.dart' show satranc1;
export 'satranc_2.dart' show satranc2;
export 'satranc_3.dart' show satranc3;
export 'sql_1.dart' show sql1;
export 'sql_2.dart' show sql2;
export 'sql_3.dart' show sql3;
export 'php_1.dart' show php1;
export 'php_2.dart' show php2;
export 'php_3.dart' show php3;
export 'go_1.dart' show go1;
export 'go_2.dart' show go2;
export 'go_3.dart' show go3;

final List<Kurs> tumKurslar = List.unmodifiable(<Kurs>[
  ingilizceA1,
  ingilizceA2,
  ingilizceB1,
  ingilizceB2,
  ingilizceC1,
  almancaA1,
  almancaA2,
  almancaB1,
  fransizcaA1,
  ruscaA1,
  arapcaA1,
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
  sql1,
  sql2,
  sql3,
  php1,
  php2,
  php3,
  go1,
  go2,
  go3,
  satranc1,
  satranc2,
  satranc3,
]);

/// Kimliğe göre kurs bulur; yoksa null döner.
Kurs? kursBul(String id) {
  for (final k in tumKurslar) {
    if (k.id == id) return k;
  }
  return null;
}
