import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

OgrenciDurumu _kartli(int n, {String ders = 'k.u1.d1', bool ac = true}) {
  var d = OgrenciDurumu(
    kardesErteleAcik: ac,
    kartlar: {
      for (var i = 0; i < n; i++)
        '$ders#$i': Kart(kutu: 1, sonraki: '2026-11-0${(i % 3) + 1}'),
    },
  );
  return d;
}

void main() {
  group('kardeş erteleme', () {
    test('aynı dersten günde en çok 3 kart', () {
      final d = _kartli(7);
      expect(Motor.tekrarBekleyen(d, '2026-11-04').length, 3);
    });
    test('farklı dersler etkilenmez, kapalıyken hepsi gelir', () {
      final d = _kartli(7, ac: false);
      expect(Motor.tekrarBekleyen(d, '2026-11-04').length, 7);
      final iki = OgrenciDurumu(
        kardesErteleAcik: true,
        kartlar: {
          for (var i = 0; i < 3; i++)
            'a.u1.d1#$i': const Kart(kutu: 1, sonraki: '2026-11-01'),
          for (var i = 0; i < 3; i++)
            'b.u1.d1#$i': const Kart(kutu: 1, sonraki: '2026-11-01'),
        },
      );
      expect(Motor.tekrarBekleyen(iki, '2026-11-04').length, 6);
    });
    test('ertelenen kart silinmez', () {
      final d = _kartli(7);
      expect(d.kartlar.length, 7);
    });
  });

  group('emekli', () {
    test('60 günü aşan doğru cevap emekli olur, 120 gün sonra yoklanır', () {
      const onceki = Kart(kutu: 5, sonraki: '2026-11-04', yariOmurGun: 40);
      final k = Motor.kartHesapla(onceki, true, '2026-11-04', emekliAcik: true);
      expect(k.emekli, isTrue);
      expect(k.sonraki, '2027-03-04');
    });
    test('kapalıyken ya da yanlışta emekli olmaz', () {
      const onceki = Kart(kutu: 5, sonraki: '2026-11-04', yariOmurGun: 40);
      expect(Motor.kartHesapla(onceki, true, '2026-11-04').emekli, isFalse);
      expect(
        Motor.kartHesapla(onceki, false, '2026-11-04', emekliAcik: true).emekli,
        isFalse,
      );
    });
    test('kartIsle ayarı kullanır; JSON gidiş-dönüş, eski kayıt', () {
      var d = const OgrenciDurumu(
        emekliAcik: true,
        kartlar: {
          'k.u1.d1#0': Kart(kutu: 5, sonraki: '2026-11-04', yariOmurGun: 40),
        },
      );
      d = Motor.kartIsle(d, 'k.u1.d1#0', true, '2026-11-04');
      expect(d.kartlar['k.u1.d1#0']!.emekli, isTrue);
      final r = Kart.fromJson(d.kartlar['k.u1.d1#0']!.toJson())!;
      expect(r.emekli, isTrue);
      expect(
        Kart.fromJson({'kutu': 1, 'sonraki': '2026-11-05'})!.emekli,
        isFalse,
      );
    });
  });

  group('günlük yük bütçesi', () {
    OgrenciDurumu yigin(int n, {int butce = 10}) => OgrenciDurumu(
      yukButcesi: butce,
      kardesErteleAcik: false,
      kartlar: {
        for (var i = 0; i < n; i++)
          'k.u1.d$i#0': const Kart(kutu: 1, sonraki: '2026-11-01'),
      },
    );
    test('bütçe aşılmışsa yeni kart yarına kalır', () {
      final d = Motor.kartEkle(yigin(11), 'y.u1.d1#0', '2026-11-04');
      expect(d.kartlar['y.u1.d1#0']!.sonraki, '2026-11-05');
    });
    test('bütçe altında ya da kapalıyken bugün', () {
      expect(
        Motor.kartEkle(
          yigin(10),
          'y.u1.d1#0',
          '2026-11-04',
        ).kartlar['y.u1.d1#0']!.sonraki,
        '2026-11-04',
      );
      expect(
        Motor.kartEkle(
          yigin(50, butce: 0),
          'y.u1.d1#0',
          '2026-11-04',
        ).kartlar['y.u1.d1#0']!.sonraki,
        '2026-11-04',
      );
    });
    test('ayarlar JSON gidiş-dönüş ve eski kayıt varsayılanları', () {
      final r = OgrenciDurumu.fromJson(
        const OgrenciDurumu(
          yukButcesi: 0,
          emekliAcik: true,
          kardesErteleAcik: true,
        ).toJson(),
      );
      expect(r.yukButcesi, 0);
      expect(r.emekliAcik, isTrue);
      expect(r.kardesErteleAcik, isTrue);
      final eski = OgrenciDurumu.fromJson(const {});
      expect(eski.yukButcesi, 10);
      expect(eski.emekliAcik, isFalse);
      expect(eski.kardesErteleAcik, isFalse);
    });
  });
}
