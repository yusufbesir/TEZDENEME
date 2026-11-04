// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Seri koruma hakkı testleri: haftada bir atlanan gün seriyi bozmaz, aynı
/// haftada ikinci atlama bozar, eski JSON uyumu.
library;

import 'dart:convert';

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

OgrenciDurumu _ders(OgrenciDurumu d, String gun) =>
    Motor.dersBitir(d, 'k.u1.d1', 10, 10, gun);

/// 2026-10-05 (Pzt) .. 07 (Çar) üç günlük seri; haftalık hedef 7 (esnek seri kapalı).
OgrenciDurumu _uc() {
  var d = const OgrenciDurumu(haftalikHedefGun: 7);
  for (final g in ['2026-10-05', '2026-10-06', '2026-10-07']) {
    d = _ders(d, g);
  }
  return d;
}

void main() {
  group('Seri koruma hakkı', () {
    test('tek atlanan gün seriyi bozmaz ve hakkı o haftaya yazar', () {
      final d = _ders(_uc(), '2026-10-09'); // 08 atlandı
      expect(d.seri, 4);
      expect(d.seriKorumaHafta, '2026-10-05');
    });

    test('gösterilen seri atlanan günde de korunur', () {
      expect(Motor.gosterilenSeri(_uc(), '2026-10-09'), 3);
      expect(Motor.gosterilenSeri(_uc(), '2026-10-10'), 0);
    });

    test('aynı haftada ikinci atlama seriyi bozar', () {
      var d = _ders(_uc(), '2026-10-09'); // hak kullanıldı
      expect(Motor.gosterilenSeri(d, '2026-10-11'), 0);
      d = _ders(d, '2026-10-11'); // 10 atlandı, hak yok
      expect(d.seri, 1);
    });

    test('ertesi haftada hak yenilenir', () {
      var d = _ders(_uc(), '2026-10-09');
      d = _ders(d, '2026-10-10');
      d = _ders(d, '2026-10-11');
      d = _ders(d, '2026-10-13'); // 12 (yeni hafta Pzt 12) atlandı
      expect(d.seri, 7);
      expect(d.seriKorumaHafta, '2026-10-12');
    });

    test('iki gün atlanırsa seri kopar, hak harcanmaz', () {
      final d = _ders(_uc(), '2026-10-10');
      expect(d.seri, 1);
      expect(d.seriKorumaHafta, isNull);
    });

    test('JSON gidiş-dönüş ve eski kayıt uyumu', () {
      final d = _ders(_uc(), '2026-10-09');
      final j = jsonDecode(jsonEncode(d.toJson())) as Map<String, dynamic>;
      expect(OgrenciDurumu.fromJson(j).seriKorumaHafta, '2026-10-05');
      j.remove('seriKorumaHafta');
      expect(OgrenciDurumu.fromJson(j).seriKorumaHafta, isNull);
      j['seriKorumaHafta'] = 'bozuk';
      expect(OgrenciDurumu.fromJson(j).seriKorumaHafta, isNull);
    });
  });
}
