// Rust çekirdeği ile eşdeğerlik için altın vektör üretir (MetinKelime.kelimeleriAyir).
// Kullanım: dart run tool/altin_metin_kelime.dart > rust/adim_cekirdek/tests/altin/metin_kelime.json
// (çıktıdaki Flutter satırlarını ilk `[` öncesinden ayıkla)
// ignore_for_file: avoid_print
import 'dart:convert';

import 'package:adim_adim/motor/metin_kelime.dart';

void main() {
  final uzun = List.generate(
    300,
    (i) =>
        'kelime${String.fromCharCode(97 + i % 26)}${String.fromCharCode(97 + (i ~/ 26) % 26)}x',
  ).join(' ');
  final cokUzun = 'abc ' * 2000 + 'sonkelime';
  final emoji = '😀' * 2490 + ' kelimeA kelimeB kelimeC';
  final girdiler = <(String, String)>[
    ('', 'en'),
    ('   ', 'en'),
    ('Hello, hello World! 123', 'en'),
    ("Don't stop; they’re here. Can’t", 'en'),
    ('IŞIK İzmir ılık İNCE', 'tr'),
    ('IŞIK İzmir ılık İNCE', 'en'),
    ('Straße ÀÉÎÕÜ àéîõü ß', 'de'),
    ('naïve café résumé', 'fr'),
    ('Привет мир hello', 'ru'),
    ('こんにちは world', 'ja'),
    ('你好 hello', 'zh'),
    ('안녕 hello', 'ko'),
    ('مرحبا hello', 'ar'),
    ('Привет мир hello', 'en'),
    ('a1b2c3 x_y-z', 'en'),
    ("''quote'' 'a' a'b' a''b", 'en'),
    ('ǅ ǆ ǈ ﬃ ŉ ſ', 'en'),
    ('Ελληνικά abc', 'en'),
    ('ÇOK şeker ĞÜŞİÖÇ', 'tr'),
    ('ΣΊΣΥΦΟΣ latin', 'en'),
    ('word́ acute', 'en'),
    ('école', 'fr'),
    ('tab\tnewline\nword', 'en'),
    (uzun, 'en'),
    (cokUzun, 'en'),
    (emoji, 'en'),
    ('Ǆ', 'tr'),
    ('İİİ', 'tr'),
    ('İİİ', 'en'),
    ('ẞ', 'de'),
  ];
  final cikti = [
    for (final g in girdiler)
      {
        'metin': g.$1,
        'dil': g.$2,
        'sonuc': MetinKelime.kelimeleriAyir(g.$1, g.$2),
      },
  ];
  print(const JsonEncoder.withIndent(' ').convert(cikti));
}
