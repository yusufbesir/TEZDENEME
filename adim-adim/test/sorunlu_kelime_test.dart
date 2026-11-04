import 'package:flutter_test/flutter_test.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';

void main() {
  test('8. yanlışta kart 14 gün sakinleşir, sayaç sıfırlanır', () {
    Kart? k;
    for (var i = 0; i < 7; i++) {
      k = Motor.kartHesapla(k, false, '2026-11-04');
      expect(k.sakin, isFalse);
      expect(k.yanlisSayisi, i + 1);
    }
    k = Motor.kartHesapla(k, false, '2026-11-04');
    expect(k.sakin, isTrue);
    expect(k.yanlisSayisi, 0);
    expect(k.sonraki, '2026-11-18');
  });

  test('sakin kart dönünce bir sonraki cevapta normale döner', () {
    var k = const Kart(kutu: 1, sonraki: '2026-11-18', sakin: true);
    k = Motor.kartHesapla(k, true, '2026-11-18');
    expect(k.sakin, isFalse);
  });

  test('JSON gidiş-dönüş ve eski kayıt', () {
    const k = Kart(kutu: 2, sonraki: '2026-11-18', yanlisSayisi: 3, sakin: true);
    final r = Kart.fromJson(k.toJson())!;
    expect(r.yanlisSayisi, 3);
    expect(r.sakin, isTrue);
    final eski = Kart.fromJson({'kutu': 1, 'sonraki': '2026-11-05'})!;
    expect(eski.yanlisSayisi, 0);
    expect(eski.sakin, isFalse);
    expect(eski.toJson().containsKey('sakin'), isFalse);
  });
}
