// Sahibi Yusuf (yusufbesir); yazan: [Claude#guven-derecesi]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Karışık sıra (saf motor): aynı kart/tür art arda gelmez, deterministik,
/// öğe kaybolmaz.
library;

import 'package:adim_adim/motor/karisik_sira.dart';
import 'package:flutter_test/flutter_test.dart';

typedef _O = ({String id, String tur});

List<_O> _liste(Map<String, int> turler) => [
  for (final e in turler.entries)
    for (var i = 0; i < e.value; i++) (id: '${e.key}$i', tur: e.key),
];

List<_O> _diz(List<_O> l, {int tohum = 0}) =>
    KarisikSira.diz(l, kimlik: (o) => o.id, tur: (o) => o.tur, tohum: tohum);

bool _ardisikTurYok(List<_O> l) {
  for (var i = 1; i < l.length; i++) {
    if (l[i].tur == l[i - 1].tur) return false;
  }
  return true;
}

void main() {
  test('öğe kaybolmaz ve eklenmez; girdi değişmez', () {
    final girdi = _liste({'a': 4, 'b': 3, 'c': 2});
    final kopya = [...girdi];
    final cikti = _diz(girdi, tohum: 7);
    expect(cikti.length, girdi.length);
    expect({for (final o in cikti) o.id}, {for (final o in girdi) o.id});
    expect(girdi, kopya);
  });

  test('aynı tohum aynı sıra; boş liste boş', () {
    final l = _liste({'a': 5, 'b': 5, 'c': 5});
    expect(_diz(l, tohum: 3), _diz(l, tohum: 3));
    expect(_diz(const []), isEmpty);
  });

  test('dengeli türlerde ardışık aynı tür yok (çok tohumla)', () {
    final l = _liste({'a': 5, 'b': 5, 'c': 4});
    for (var t = 0; t < 50; t++) {
      expect(_ardisikTurYok(_diz(l, tohum: t)), isTrue, reason: 'tohum $t');
    }
  });

  test('en sık tür yarıdan azsa mümkün olan en iyi sıra: ardışık yok', () {
    final l = _liste({'a': 6, 'b': 5, 'c': 1});
    for (var t = 0; t < 30; t++) {
      expect(_ardisikTurYok(_diz(l, tohum: t)), isTrue, reason: 'tohum $t');
    }
  });

  test('tek tür: kaçınılamaz, yine de tüm öğeler döner', () {
    final l = _liste({'a': 4});
    expect(_diz(l).length, 4);
  });

  test('aynı kimlik art arda gelmez (yinelenen kart)', () {
    final l = <_O>[
      (id: 'x', tur: 'a'),
      (id: 'x', tur: 'a'),
      (id: 'y', tur: 'a'),
      (id: 'z', tur: 'b'),
    ];
    for (var t = 0; t < 30; t++) {
      final c = _diz(l, tohum: t);
      for (var i = 1; i < c.length; i++) {
        // x'ler yalnız araya başkası girebiliyorsa ayrılır; 4 öğede mümkün.
        expect(c[i].id == c[i - 1].id, isFalse, reason: 'tohum $t: $c');
      }
    }
  });

  test('tohumDan kararlı ve güne göre farklı', () {
    expect(
      KarisikSira.tohumDan('2026-11-04'),
      KarisikSira.tohumDan('2026-11-04'),
    );
    expect(
      KarisikSira.tohumDan('2026-11-04') == KarisikSira.tohumDan('2026-11-05'),
      isFalse,
    );
  });
}
