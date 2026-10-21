// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Örnek programlar verisi: her dilde en az 6 örnek, benzersiz kimlik,
/// dolu alanlar, kolay/orta zorluk, kod grupları ve notları.
library;

import 'package:adim_adim/icerik/ornek_programlar.dart';
import 'package:adim_adim/model/ornek_program.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('her dilde en az 6 örnek; kimlikler benzersiz', () {
    for (final d in OrnekDili.values) {
      expect(
        tumOrnekler.where((o) => o.dil == d).length,
        greaterThanOrEqualTo(6),
      );
    }
    final idler = tumOrnekler.map((o) => o.id).toSet();
    expect(idler.length, tumOrnekler.length);
  });

  test('alanlar dolu; her grupta kod ve not var; kod gruplardan birleşir', () {
    for (final o in tumOrnekler) {
      expect(o.baslik.trim(), isNotEmpty, reason: o.id);
      expect(o.aciklama.trim(), isNotEmpty, reason: o.id);
      expect(o.gruplar, isNotEmpty, reason: o.id);
      for (final g in o.gruplar) {
        expect(g.kod.trim(), isNotEmpty, reason: o.id);
        expect(g.not.trim(), isNotEmpty, reason: o.id);
      }
      expect(o.kod, o.gruplar.map((g) => g.kod).join('\n'));
      expect(ornekBul(o.id), same(o));
    }
    expect(ornekBul('yok'), isNull);
  });

  test('her dilde hem kolay hem orta örnek var', () {
    for (final d in OrnekDili.values) {
      final z = tumOrnekler.where((o) => o.dil == d).map((o) => o.zorluk);
      expect(z, containsAll(OrnekZorlugu.values));
    }
  });
}
