// Rust çekirdeği ile eşdeğerlik için altın vektör üretir (Motor.kartHesapla,
// Motor.gunFarki ve gün işlemleri). Çıktıdaki ilk `[` öncesini ayıkla.
// ignore_for_file: avoid_print
import 'dart:convert';

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';

void main() {
  final onceki = <double?>[null, 0.5, 0.75, 1.0, 1.4, 2.5, 3.3, 90, 100, 180];
  final gunler = ['2026-11-04', '2024-02-28', '2100-12-31', '2000-01-01', 'bozuk'];
  final dereceler = <GuvenDerecesi?>[null, ...GuvenDerecesi.values];
  final kartlar = <Map<String, Object?>>[];
  for (final o in onceki) {
    for (final dogru in [true, false]) {
      for (final d in dereceler) {
        for (final g in gunler) {
          final k = Motor.kartHesapla(
            o == null
                ? null
                : Kart(kutu: 1, sonraki: '2026-01-01', yariOmurGun: o),
            dogru,
            g,
            derece: d,
          );
          kartlar.add({
            'onceki': o,
            'dogru': dogru,
            'derece': d?.kod,
            'bugun': g,
            'kutu': k.kutu,
            'sonraki': k.sonraki,
            'yariOmur': k.yariOmurGun,
            'sonCevap': k.sonCevap,
            'sonDerece': k.sonDerece,
          });
        }
      }
    }
  }
  final farklar = <Map<String, Object?>>[];
  const cift = [
    ['2026-11-04', '2026-11-04'],
    ['2026-11-04', '2026-12-04'],
    ['2026-12-04', '2026-11-04'],
    ['2024-02-28', '2024-03-01'],
    ['2000-01-01', '2100-12-31'],
    ['bozuk', '2026-11-04'],
    ['2026-02-30', '2026-03-01'],
    ['1999-12-31', '2000-01-01'],
  ];
  for (final c in cift) {
    farklar.add({'a': c[0], 'b': c[1], 'fark': Motor.gunFarki(c[0], c[1])});
  }
  print(const JsonEncoder.withIndent(' ').convert({'kartlar': kartlar, 'farklar': farklar}));
}
