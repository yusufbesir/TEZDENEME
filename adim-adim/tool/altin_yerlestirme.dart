// Rust yerlestirme_sec eşdeğerliği için altın vektör üretir.
// Kullanım: dart run tool/altin_yerlestirme.dart > rust/adim_cekirdek/tests/altin/yerlestirme.json
// (çıktıdaki Flutter satırlarını ilk `[` öncesinden ayıkla)
// ignore_for_file: avoid_print
import 'dart:convert';

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';

// tür: 0 seçim, 1 söyle, 2 kod çalıştır
Ders _ders(String id, List<int> turler) => Ders(
  id: id,
  ad: id,
  alistirmalar: [
    for (var i = 0; i < turler.length; i++)
      if (turler[i] == 0)
        Secim(soru: '$id/$i', secenekler: const ['a', 'b'], dogru: 1)
      else if (turler[i] == 1)
        const Soyle(soru: 'S', metin: 'hi', ceviri: 'selam')
      else
        const KodCalistir(
          soru: 'K',
          baslangic: '',
          beklenenCikti: '',
          cozum: '',
        ),
  ],
);

void main() {
  final senaryolar = <Map<String, Object>>[];
  // uniteler: [ [ [turler] , ... dersler ] , ... ]
  final duzenler = <List<List<List<int>>>>[
    [
      for (var u = 0; u < 3; u++) [List.filled(5, 0) + [1]],
    ],
    [
      for (var u = 0; u < 10; u++) [List.filled(8, 0), List.filled(3, 0) + [2, 1]],
    ],
    [
      [List.filled(2, 0)],
      [List.filled(9, 0), List.filled(1, 0), List.filled(6, 0) + [1, 1]],
    ],
    [
      for (var u = 0; u < 4; u++) [List.filled(12, 0) + [2]],
    ],
    [
      [List.filled(1, 1)],
      [List.filled(7, 0)],
    ],
  ];
  for (final duzen in duzenler) {
    for (final tohum in [0, 7, 42, 1234]) {
      for (final enCok in [20, 5, 8]) {
        for (final bitmisMod in [0, 1, 2]) {
          final dersIds = <String>[];
          final uniteler = <Unite>[];
          for (var u = 0; u < duzen.length; u++) {
            final dersler = <Ders>[];
            for (var di = 0; di < duzen[u].length; di++) {
              final id = 'k.u$u.d$di';
              dersIds.add(id);
              dersler.add(_ders(id, duzen[u][di]));
            }
            uniteler.add(Unite(id: 'k.u$u', ad: 'u', dersler: dersler));
          }
          final kurs = Kurs(
            id: 'k',
            ad: 'k',
            aciklama: '',
            alan: KursAlani.dil,
            uniteler: uniteler,
          );
          // bitmisMod 1: ilk ünitenin ilk dersi bitmiş; 2: ilk ünite tümü bitmiş
          final bitmis = <String>[
            if (bitmisMod == 1) dersIds.first,
            if (bitmisMod == 2)
              for (final d in uniteler.first.dersler) d.id,
          ];
          final durum = OgrenciDurumu(atlananDersler: bitmis.toSet());
          final sec = Motor.yerlestirmeSec(durum, kurs, tohum: tohum, enCok: enCok);
          senaryolar.add({
            'uniteler': [
              for (final u in uniteler)
                [
                  for (final d in u.dersler)
                    {
                      'id': d.id,
                      'bitmis': bitmis.contains(d.id),
                      'secilebilir': [
                        for (final a in d.alistirmalar)
                          a is! Soyle && a is! KodCalistir,
                      ],
                    },
                ],
            ],
            'tohum': tohum,
            'en_cok': enCok,
            'sonuc': [
              for (final s in sec) [s.unite, s.kartId],
            ],
          });
        }
      }
    }
  }
  print(jsonEncode(senaryolar));
}
