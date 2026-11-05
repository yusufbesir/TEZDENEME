// Rust DartRandom eşdeğerliği için altın vektör üretir.
// Kullanım: dart run tool/altin_random.dart > rust/adim_cekirdek/tests/altin/random.json
// (çıktıdaki Flutter satırlarını ilk `[` öncesinden ayıkla)
// ignore_for_file: avoid_print
import 'dart:convert';
import 'dart:math';

void main() {
  final cikti = <Map<String, Object>>[];
  for (final tohum in [0, 1, 2, 7, 42, 99, 12345, 1000003, 4294967295, 99999999999]) {
    final r = Random(tohum);
    final ints = [
      for (final m in [1, 2, 3, 5, 8, 10, 100, 1000, 65536, 1000000007, 4294967296])
        r.nextInt(m),
    ];
    for (final n in [0, 1, 2, 5, 12, 40]) {
      final l = List.generate(n, (i) => i)..shuffle(Random(tohum));
      cikti.add({'tohum': tohum, 'n': n, 'karisim': l});
    }
    cikti.add({'tohum': tohum, 'n': -1, 'ints': ints});
  }
  print(jsonEncode(cikti));
}
