// Sahibi Yusuf (yusufbesir). Yazan: [Claude#yanlislari-coz] Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// "Yanlışları çöz": hata defterinden kısa tekrar destesi (saf mantık).
library;

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/pratik.dart';
import 'package:flutter_test/flutter_test.dart';

import 'pratik_oturumlari_test.dart' show oturumKursu, dersA;

HataKaydi _h(String id, String gun, {String tur = HataKaydi.turKart}) =>
    HataKaydi(tur: tur, id: id, seviye: 'oturum-1', gun: gun);

void main() {
  test('boş defterde deste boş', () {
    expect(Pratik.yanlisDestesi(const OgrenciDurumu(), [oturumKursu]), isEmpty);
  });

  test('en yeni önce, tekrarsız, süre sınırsız, çözülemeyen ve yarışma atlanır',
      () {
    final d = OgrenciDurumu(
      hatalar: [
        _h('$dersA#0', '2026-01-01'),
        _h('$dersA#1', '2026-10-10'),
        _h('yok#9', '2026-10-11'),
        _h('q1', '2026-10-12', tur: HataKaydi.turYarisma),
        _h('$dersA#0', '2026-10-13'),
      ],
    );
    final deste = Pratik.yanlisDestesi(d, [oturumKursu]);
    expect([for (final k in deste) k.kartId], ['$dersA#0', '$dersA#1']);
  });

  test('adet sınırı uygulanır', () {
    final d = OgrenciDurumu(
      hatalar: [for (var i = 0; i < 6; i++) _h('$dersA#$i', '2026-10-1$i')],
    );
    expect(Pratik.yanlisDestesi(d, [oturumKursu], adet: 3).length, 3);
    expect(Pratik.yanlisDestesi(d, [oturumKursu]).length, 5);
  });
}
