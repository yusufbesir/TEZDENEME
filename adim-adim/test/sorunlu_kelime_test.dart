import 'package:flutter_test/flutter_test.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/motor/pratik.dart';
import 'pratik_test.dart' show pratikKurs, pratikDers1;

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
    const k = Kart(
      kutu: 2,
      sonraki: '2026-11-18',
      yanlisSayisi: 3,
      sakin: true,
    );
    final r = Kart.fromJson(k.toJson())!;
    expect(r.yanlisSayisi, 3);
    expect(r.sakin, isTrue);
    final eski = Kart.fromJson({'kutu': 1, 'sonraki': '2026-11-05'})!;
    expect(eski.yanlisSayisi, 0);
    expect(eski.sakin, isFalse);
    expect(eski.toJson().containsKey('sakin'), isFalse);
  });

  test(
    'dinlenen kart pratik desteleri dışında kalır, vadesi gelince döner',
    () {
      var d = const OgrenciDurumu();
      for (var i = 0; i < 8; i++) {
        d = Motor.kartIsle(d, '$pratikDers1#1', false, '2026-11-04');
      }
      d = Motor.kartIsle(d, '$pratikDers1#2', false, '2026-11-04');
      List<String> ids(
        String bugun, [
        TekrarFiltresi f = TekrarFiltresi.sonYediGunYanlis,
      ]) => [
        for (final k in Pratik.desteSec(
          d,
          [pratikKurs],
          bugun,
          TekrarFiltresi.sonYediGunYanlis,
        ))
          k.kartId,
      ];
      expect(d.kartlar['$pratikDers1#1']!.sakin, isTrue);
      expect(ids('2026-11-05'), ['$pratikDers1#2']);
      const kurs = TekrarFiltresi.kurs;
      List<String> kursIds(String b) => [
        for (final k in Pratik.desteSec(
          d,
          [pratikKurs],
          b,
          kurs,
          kursId: pratikKurs.id,
        ))
          k.kartId,
      ];
      expect(kursIds('2026-11-05'), isNot(contains('$pratikDers1#1')));
      expect(kursIds('2026-11-18'), contains('$pratikDers1#1'));
    },
  );
}
