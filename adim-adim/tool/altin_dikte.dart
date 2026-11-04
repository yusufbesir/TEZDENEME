// Rust çekirdeği ile eşdeğerlik için altın vektör üretir (Motor.dikteFarki).
// Kullanım: dart run tool/altin_dikte.dart  (çıktıdaki ilk `[` öncesini ayıkla)
// ignore_for_file: avoid_print
import 'dart:convert';

import 'package:adim_adim/motor/motor.dart';

void main() {
  const ciftler = <List<String>>[
    ['', ''],
    ['Hello world', 'hello world'],
    ['See you on Friday.', 'see you in friday'],
    ['I like apples', 'I like'],
    ['I like', 'I like apples and pears'],
    ['Bugün hava çok güzel!', 'bugun hava cok guzel'],
    ['İstanbul’da yaşıyorum.', "istanbul'da yasiyorum"],
    ['ISPARTA ışık', 'isparta ISIK'],
    ['«Merci» beaucoup, ça va ?', 'merci beaucoup ca va'],
    ['مرحبا بالعالم', 'مرحبا العالم'],
    ['안녕하세요 반갑습니다', '안녕하세요 반갑습니다'],
    ['こんにちは 世界', 'こんにちは'],
    ['one  two\tthree\nfour', 'one two three four'],
    ['a b c d e f', 'f e d c b a'],
    ['the the the cat', 'the cat the'],
    ['...hello---', 'hello'],
    ['"quoted" `tick´ word', 'quoted tick word'],
    [' nbsp word', 'word'],
    ['x y　z', 'x y z'],
    ['﻿feff word', 'feff word'],
    ['Привет, МИР!', 'привет мир'],
    ['a1 b2 c3', 'A1 B2 C3'],
    ['!!! ???', 'hello'],
    ['hello', '!!! ???'],
    ['ΣΊΣΥΦΟΣ', 'σίσυφος'],
    ['straße', 'STRASSE'],
    ['नमस्ते दुनिया', 'नमस्ते दुनिया'],
    ['café', 'café'],
    ['go-to well-known', 'go to well known'],
  ];
  final cikti = [
    for (final c in ciftler)
      {
        'dogru': c[0],
        'verilen': c[1],
        'sonuc': [
          for (final k in Motor.dikteFarki(c[0], c[1]))
            [k.kelime, k.durum.name],
        ],
      },
  ];
  print(const JsonEncoder.withIndent(' ').convert(cikti));
}
