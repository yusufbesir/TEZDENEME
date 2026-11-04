// Rust çekirdeği ile eşdeğerlik için altın vektör üretir (Sozluk.normalize).
// Kullanım: dart run tool/altin_normalize.dart > rust/adim_cekirdek/tests/altin/normalize.json
// ignore_for_file: avoid_print
import 'dart:convert';

import 'package:adim_adim/sozluk/sozluk.dart';

void main() {
  const girdiler = <String>[
    '', ' ', 'Merhaba', 'İSTANBUL', 'ışık', 'IŞIK', 'Şeker ÇAĞ ÜZÜM ÖĞRENCİ',
    'ğüşiöçı', 'ĞÜŞİÖÇI', 'Hello World', 'ÀÉÎÕÜ àéîõü', 'straße', 'ΣΊΣΥΦΟΣ',
    'مرحبا بالعالم', '안녕하세요', 'こんにちは', '你好', 'Привет МИР',
    '\tbaşta ve sonda\n', ' nbsp ', '　ideograf boşluk　',
    '﻿feff', 'a\u0000b', 'Ǆ ǅ ǆ', 'ŉ', 'ﬃ', '😀 Emoji İ', 'İ',
    'ÇOK  boşluk', 'Ǧ', 'ẞ',
  ];
  final cikti = [
    for (final g in girdiler) {'girdi': g, 'cikti': Sozluk.normalize(g)},
  ];
  print(const JsonEncoder.withIndent(' ').convert(cikti));
}
