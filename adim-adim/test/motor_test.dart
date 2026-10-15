import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('bugun ve gunFarki', () {
    test('bugun yerel tarihi YYYY-MM-DD biçiminde verir', () {
      expect(Motor.bugun(DateTime(2025, 3, 7, 23, 59)), '2025-03-07');
      expect(Motor.bugun(DateTime(2025, 12, 31)), '2025-12-31');
      expect(Motor.bugun(), matches(RegExp(r'^\d{4}-\d{2}-\d{2}$')));
    });

    test('gunFarki b - a hesaplar, işaret doğru', () {
      expect(Motor.gunFarki('2025-01-01', '2025-01-02'), 1);
      expect(Motor.gunFarki('2025-01-02', '2025-01-01'), -1);
      expect(Motor.gunFarki('2025-01-01', '2025-01-01'), 0);
    });

    test('gunFarki yıl geçişi ve artık yılı doğru sayar', () {
      expect(Motor.gunFarki('2024-12-31', '2025-01-01'), 1);
      expect(Motor.gunFarki('2024-02-28', '2024-03-01'), 2);
      expect(Motor.gunFarki('2025-02-28', '2025-03-01'), 1);
      expect(Motor.gunFarki('2024-01-01', '2025-01-01'), 366);
    });

    test('gunFarki yaz saati geçişinden etkilenmez', () {
      expect(Motor.gunFarki('2025-03-29', '2025-03-30'), 1);
      expect(Motor.gunFarki('2025-10-25', '2025-10-27'), 2);
    });

    test('gunFarki geçersiz girdide fırlatmaz, 0 döner', () {
      expect(Motor.gunFarki('bozuk', '2025-01-01'), 0);
      expect(Motor.gunFarki('2025-01-01', ''), 0);
    });
  });

  group('seviye', () {
    test('xp 0 ilk seviyenin başıdır', () {
      final s = Motor.seviye(0);
      expect((s.no, s.bu, s.sonraki, s.oran), (1, 0, 100, 0.0));
    });

    test('negatif xp sıfır kabul edilir', () {
      final s = Motor.seviye(-500);
      expect((s.no, s.bu, s.sonraki), (1, 0, 100));
    });

    test('eşiğin bir altı ve eşik', () {
      var s = Motor.seviye(99);
      expect((s.no, s.bu, s.sonraki), (1, 99, 100));
      s = Motor.seviye(100);
      expect((s.no, s.bu, s.sonraki), (2, 0, 125));
      s = Motor.seviye(224);
      expect((s.no, s.bu, s.sonraki), (2, 124, 125));
      s = Motor.seviye(225);
      expect((s.no, s.bu, s.sonraki), (3, 0, 150));
    });

    test('oran 0..1 arasında ve doğru', () {
      final s = Motor.seviye(150);
      expect(s.no, 2);
      expect(s.oran, closeTo(50 / 125, 1e-12));
    });

    test('kapalı formül kaba kuvvetle aynı sonucu verir', () {
      var no = 1;
      var taban = 0;
      for (var xp = 0; xp < 20000; xp++) {
        if (xp >= taban + 100 + 25 * (no - 1)) {
          taban += 100 + 25 * (no - 1);
          no++;
        }
        final s = Motor.seviye(xp);
        expect(s.no, no, reason: 'xp=$xp');
        expect(s.bu, xp - taban, reason: 'xp=$xp');
        expect(s.sonraki, 100 + 25 * (no - 1), reason: 'xp=$xp');
        expect(s.oran, inInclusiveRange(0.0, 1.0));
        expect(s.oran < 1.0, isTrue);
      }
    });

    test('çok büyük xp donmaz ve tutarlıdır', () {
      for (final xp in [1 << 40, 1 << 50, 1 << 62, 9223372036854775807]) {
        final s = Motor.seviye(xp);
        expect(s.no, greaterThan(1));
        expect(s.bu, inInclusiveRange(0, s.sonraki - 1));
        expect(s.oran, inInclusiveRange(0.0, 1.0));
      }
    });
  });

  group('dersXp', () {
    test('formül: 10 + 2*doğru (+5 tam puan)', () {
      expect(Motor.dersXp(0, 10), 10);
      expect(Motor.dersXp(5, 10), 20);
      expect(Motor.dersXp(9, 10), 28);
      expect(Motor.dersXp(10, 10), 35);
    });

    test('sınır durumları', () {
      expect(Motor.dersXp(0, 0), 10); // toplam 0: bonus yok
      expect(Motor.dersXp(-3, 10), 10); // negatif doğru
      expect(Motor.dersXp(50, 10), 35); // doğru > toplam toplam'a çekilir
      expect(Motor.dersXp(3, -1), 10); // negatif toplam
    });
  });

  group('dersBitir', () {
    test('ilk ders: xp, günlük xp, tamamlanan ve seri 1', () {
      final d = Motor.dersBitir(
        const OgrenciDurumu(),
        'k.u1.d1',
        8,
        10,
        '2025-05-10',
      );
      expect(d.xp, 26);
      expect(d.gunlukXp, {'2025-05-10': 26});
      expect(d.tamamlanan, {'k.u1.d1': 1});
      expect(d.seri, 1);
      expect(d.enSeri, 1);
      expect(d.sonGun, '2025-05-10');
    });

    test('tam puan 5 xp bonus verir', () {
      final d = Motor.dersBitir(
        const OgrenciDurumu(),
        'k.u1.d1',
        10,
        10,
        '2025-05-10',
      );
      expect(d.xp, 35);
    });

    test('aynı gün ikinci ders seriyi değiştirmez, xp birikir', () {
      var d = Motor.dersBitir(const OgrenciDurumu(), 'a', 10, 10, '2025-05-10');
      d = Motor.dersBitir(d, 'a', 0, 10, '2025-05-10');
      expect(d.seri, 1);
      expect(d.xp, 35 + 10);
      expect(d.gunlukXp['2025-05-10'], 45);
      expect(d.tamamlanan['a'], 2);
    });

    test('ardışık gün seriyi artırır ve enSeri güncellenir', () {
      var d = Motor.dersBitir(const OgrenciDurumu(), 'a', 1, 2, '2025-05-10');
      d = Motor.dersBitir(d, 'b', 1, 2, '2025-05-11');
      d = Motor.dersBitir(d, 'c', 1, 2, '2025-05-12');
      expect(d.seri, 3);
      expect(d.enSeri, 3);
    });

    test('gün atlanırsa seri 1e düşer, enSeri korunur', () {
      var d = Motor.dersBitir(const OgrenciDurumu(), 'a', 1, 2, '2025-05-10');
      d = Motor.dersBitir(d, 'b', 1, 2, '2025-05-11');
      d = Motor.dersBitir(d, 'c', 1, 2, '2025-05-14');
      expect(d.seri, 1);
      expect(d.enSeri, 2);
    });

    test('yıl geçişinde seri sürer', () {
      var d = Motor.dersBitir(const OgrenciDurumu(), 'a', 1, 2, '2024-12-31');
      d = Motor.dersBitir(d, 'b', 1, 2, '2025-01-01');
      expect(d.seri, 2);
    });

    test('saat geri alınırsa (sonGun gelecekte) seri 1 olur', () {
      var d = Motor.dersBitir(const OgrenciDurumu(), 'a', 1, 2, '2025-05-10');
      d = Motor.dersBitir(d, 'b', 1, 2, '2025-05-09');
      expect(d.seri, 1);
      expect(d.sonGun, '2025-05-09');
    });

    test('girdi durum değişmez (immutable)', () {
      const ilk = OgrenciDurumu();
      Motor.dersBitir(ilk, 'a', 1, 2, '2025-05-10');
      expect(ilk.xp, 0);
      expect(ilk.gunlukXp, isEmpty);
    });

    test('çok büyük xp üzerine ekleme taşmadan çalışır', () {
      final d = Motor.dersBitir(
        const OgrenciDurumu(xp: 1 << 40),
        'a',
        10,
        10,
        '2025-05-10',
      );
      expect(d.xp, (1 << 40) + 35);
    });
  });

  group('kartIsle', () {
    const bugun = '2025-05-10';

    test('yeni kart doğru cevapta kutu 2, 2 gün sonra', () {
      final d = Motor.kartIsle(const OgrenciDurumu(), 'd#0', true, bugun);
      expect(d.kartlar['d#0']!.kutu, 2);
      expect(d.kartlar['d#0']!.sonraki, '2025-05-12');
    });

    test('yeni kart yanlış cevapta kutu 1, ertesi gün', () {
      final d = Motor.kartIsle(const OgrenciDurumu(), 'd#0', false, bugun);
      expect(d.kartlar['d#0']!.kutu, 1);
      expect(d.kartlar['d#0']!.sonraki, '2025-05-11');
    });

    test('aralıklar 1,2,4,8,16 ve kutu 5te sabit kalır', () {
      var d = const OgrenciDurumu();
      final beklenen = [2, 4, 8, 16, 16, 16];
      final kutular = [2, 3, 4, 5, 5, 5];
      for (var i = 0; i < beklenen.length; i++) {
        d = Motor.kartIsle(d, 'x#1', true, bugun);
        expect(d.kartlar['x#1']!.kutu, kutular[i]);
        expect(Motor.gunFarki(bugun, d.kartlar['x#1']!.sonraki), beklenen[i]);
      }
    });

    test('yanlış cevap herhangi kutudan kutu 1e döndürür', () {
      var d = const OgrenciDurumu(
        kartlar: {'x#1': Kart(kutu: 5, sonraki: '2025-01-01')},
      );
      d = Motor.kartIsle(d, 'x#1', false, bugun);
      expect(d.kartlar['x#1']!.kutu, 1);
      expect(d.kartlar['x#1']!.sonraki, '2025-05-11');
    });

    test('ay ve yıl sonu taşması doğru', () {
      var d = Motor.kartIsle(const OgrenciDurumu(), 'a#0', false, '2025-12-31');
      expect(d.kartlar['a#0']!.sonraki, '2026-01-01');
      d = Motor.kartIsle(const OgrenciDurumu(), 'b#0', false, '2024-02-28');
      expect(d.kartlar['b#0']!.sonraki, '2024-02-29');
    });

    test('diğer kartlara dokunmaz', () {
      const ilk = OgrenciDurumu(
        kartlar: {'o#0': Kart(kutu: 3, sonraki: '2025-06-01')},
      );
      final d = Motor.kartIsle(ilk, 'x#1', true, bugun);
      expect(d.kartlar['o#0']!.kutu, 3);
      expect(d.kartlar.length, 2);
    });
  });

  group('tekrarBekleyen', () {
    test('boş durumda boş liste', () {
      expect(
        Motor.tekrarBekleyen(const OgrenciDurumu(), '2025-05-10'),
        isEmpty,
      );
    });

    test('yalnızca sonraki <= bugun olanlar, en eski önce, sonra kimlik', () {
      const d = OgrenciDurumu(
        kartlar: {
          'z#0': Kart(kutu: 1, sonraki: '2025-05-08'),
          'b#0': Kart(kutu: 1, sonraki: '2025-05-09'),
          'a#0': Kart(kutu: 1, sonraki: '2025-05-09'),
          'c#0': Kart(kutu: 2, sonraki: '2025-05-10'),
          'g#0': Kart(kutu: 2, sonraki: '2025-05-11'),
        },
      );
      expect(Motor.tekrarBekleyen(d, '2025-05-10'), [
        'z#0',
        'a#0',
        'b#0',
        'c#0',
      ]);
      expect(Motor.tekrarBekleyen(d, '2025-05-07'), isEmpty);
    });

    test('yıl geçişinde sıralama doğru', () {
      const d = OgrenciDurumu(
        kartlar: {
          'a#0': Kart(kutu: 1, sonraki: '2025-01-01'),
          'b#0': Kart(kutu: 1, sonraki: '2024-12-31'),
        },
      );
      expect(Motor.tekrarBekleyen(d, '2025-01-01'), ['b#0', 'a#0']);
    });
  });

  group('cevapDogruMu: indeksli türler', () {
    final alistirmalar = <Alistirma>[
      const Secim(soru: 's', secenekler: ['a', 'b', 'c'], dogru: 1),
      const Bosluk(soru: '___', secenekler: ['a', 'b'], dogru: 1),
      const Dinle(soru: 's', okunacak: 'hi', secenekler: ['a', 'b'], dogru: 1),
      const Kod(soru: 's', kod: '___', secenekler: ['a', 'b'], dogru: 1),
    ];

    test('doğru indeks true, yanlış indeks false', () {
      for (final a in alistirmalar) {
        expect(Motor.cevapDogruMu(a, 1), isTrue, reason: a.tur);
        expect(Motor.cevapDogruMu(a, 0), isFalse, reason: a.tur);
        expect(Motor.cevapDogruMu(a, -1), isFalse, reason: a.tur);
        expect(Motor.cevapDogruMu(a, 99), isFalse, reason: a.tur);
      }
    });

    test('yanlış tip cevap false', () {
      for (final a in alistirmalar) {
        expect(Motor.cevapDogruMu(a, null), isFalse, reason: a.tur);
        expect(Motor.cevapDogruMu(a, '1'), isFalse, reason: a.tur);
        expect(Motor.cevapDogruMu(a, 1.0), isFalse, reason: a.tur);
        expect(Motor.cevapDogruMu(a, true), isFalse, reason: a.tur);
        expect(Motor.cevapDogruMu(a, [1]), isFalse, reason: a.tur);
      }
    });
  });

  group('cevapDogruMu: Yaz', () {
    const a = Yaz(soru: 's', cevaplar: ['I am a student', 'Iam student']);

    test('büyük/küçük harf duyarsız', () {
      expect(Motor.cevapDogruMu(a, 'i AM A STUDENT'), isTrue);
    });

    test('baştaki, sondaki ve çoklu boşluk yok sayılır', () {
      expect(Motor.cevapDogruMu(a, '  I   am \t a  student  '), isTrue);
    });

    test('sondaki . ! ? yok sayılır', () {
      expect(Motor.cevapDogruMu(a, 'I am a student.'), isTrue);
      expect(Motor.cevapDogruMu(a, 'I am a student!'), isTrue);
      expect(Motor.cevapDogruMu(a, 'I am a student?!'), isTrue);
      expect(Motor.cevapDogruMu(a, 'I am a student . '), isTrue);
    });

    test('ortadaki noktalama yok sayılmaz', () {
      expect(Motor.cevapDogruMu(a, 'I am. a student'), isFalse);
    });

    test('Türkçe I, İ, ı, i duyarsız', () {
      const t = Yaz(soru: 's', cevaplar: ['İstanbul ışık']);
      expect(Motor.cevapDogruMu(t, 'istanbul ışık'), isTrue);
      expect(Motor.cevapDogruMu(t, 'ISTANBUL IŞIK'), isTrue);
      expect(Motor.cevapDogruMu(t, 'Istanbul isik'), isFalse); // ş != s
      expect(Motor.cevapDogruMu(t, 'ıstanbul ışık'), isTrue);
      expect(Motor.cevapDogruMu(t, 'İSTANBUL İŞİK'), isTrue);
    });

    test('kabul listesindeki cevaplar da normalleştirilir', () {
      const t = Yaz(soru: 's', cevaplar: ['  Hello,   World!  ']);
      expect(Motor.cevapDogruMu(t, 'hello, world'), isTrue);
    });

    test('yanlış cevap, boş cevap ve yanlış tip false', () {
      expect(Motor.cevapDogruMu(a, 'I am a teacher'), isFalse);
      expect(Motor.cevapDogruMu(a, ''), isFalse);
      expect(Motor.cevapDogruMu(a, '   '), isFalse);
      expect(Motor.cevapDogruMu(a, '...'), isFalse);
      expect(Motor.cevapDogruMu(a, null), isFalse);
      expect(Motor.cevapDogruMu(a, 1), isFalse);
      expect(Motor.cevapDogruMu(a, ['I am a student']), isFalse);
    });

    test('boş kabul listesi hiçbir şeyi kabul etmez', () {
      const t = Yaz(soru: 's', cevaplar: []);
      expect(Motor.cevapDogruMu(t, 'x'), isFalse);
      expect(Motor.cevapDogruMu(t, ''), isFalse);
    });
  });

  group('cevapDogruMu: Sirala', () {
    const a = Sirala(
      soru: 's',
      kelimeler: ['b', 'a', 'c'],
      dogru: ['a', 'b', 'c'],
    );

    test('tam eşit sıra true', () {
      expect(Motor.cevapDogruMu(a, ['a', 'b', 'c']), isTrue);
      expect(Motor.cevapDogruMu(a, <Object?>['a', 'b', 'c']), isTrue);
    });

    test('yanlış sıra, eksik, fazla ve büyük/küçük harf false', () {
      expect(Motor.cevapDogruMu(a, ['b', 'a', 'c']), isFalse);
      expect(Motor.cevapDogruMu(a, ['a', 'b']), isFalse);
      expect(Motor.cevapDogruMu(a, ['a', 'b', 'c', 'd']), isFalse);
      expect(Motor.cevapDogruMu(a, ['A', 'b', 'c']), isFalse);
      expect(Motor.cevapDogruMu(a, <String>[]), isFalse);
    });

    test('yanlış tip false', () {
      expect(Motor.cevapDogruMu(a, null), isFalse);
      expect(Motor.cevapDogruMu(a, 'abc'), isFalse);
      expect(Motor.cevapDogruMu(a, [1, 2, 3]), isFalse);
      expect(Motor.cevapDogruMu(a, <Object?>['a', 'b', null]), isFalse);
    });

    test('boş doğru listesine boş liste true', () {
      const b = Sirala(soru: 's', kelimeler: [], dogru: []);
      expect(Motor.cevapDogruMu(b, <String>[]), isTrue);
    });
  });

  group('cevapDogruMu: Eslestir', () {
    const a = Eslestir(
      soru: 's',
      ciftler: [
        (sol: 'cat', sag: 'kedi'),
        (sol: 'dog', sag: 'köpek'),
        (sol: 'bird', sag: 'kuş'),
      ],
    );

    test('sıra önemsiz, tüm çiftler doğru', () {
      expect(
        Motor.cevapDogruMu(a, [
          (sol: 'bird', sag: 'kuş'),
          (sol: 'cat', sag: 'kedi'),
          (sol: 'dog', sag: 'köpek'),
        ]),
        isTrue,
      );
    });

    test('Object? listesi içindeki kayıtlar da kabul edilir', () {
      expect(
        Motor.cevapDogruMu(a, <Object?>[
          (sol: 'dog', sag: 'köpek'),
          (sol: 'cat', sag: 'kedi'),
          (sol: 'bird', sag: 'kuş'),
        ]),
        isTrue,
      );
    });

    test('yanlış çift, eksik, fazla ve tekrarlı çift false', () {
      expect(
        Motor.cevapDogruMu(a, [
          (sol: 'cat', sag: 'köpek'),
          (sol: 'dog', sag: 'kedi'),
          (sol: 'bird', sag: 'kuş'),
        ]),
        isFalse,
      );
      expect(
        Motor.cevapDogruMu(a, [
          (sol: 'cat', sag: 'kedi'),
          (sol: 'dog', sag: 'köpek'),
        ]),
        isFalse,
      );
      expect(
        Motor.cevapDogruMu(a, [
          (sol: 'cat', sag: 'kedi'),
          (sol: 'dog', sag: 'köpek'),
          (sol: 'bird', sag: 'kuş'),
          (sol: 'cat', sag: 'kedi'),
        ]),
        isFalse,
      );
      expect(
        Motor.cevapDogruMu(a, [
          (sol: 'cat', sag: 'kedi'),
          (sol: 'cat', sag: 'kedi'),
          (sol: 'bird', sag: 'kuş'),
        ]),
        isFalse,
      );
    });

    test('boş liste ve yanlış tip false', () {
      expect(Motor.cevapDogruMu(a, <({String sol, String sag})>[]), isFalse);
      expect(Motor.cevapDogruMu(a, null), isFalse);
      expect(Motor.cevapDogruMu(a, 'cat'), isFalse);
      expect(Motor.cevapDogruMu(a, [1, 2, 3]), isFalse);
      expect(
        Motor.cevapDogruMu(a, [
          ['cat', 'kedi'],
          ['dog', 'köpek'],
          ['bird', 'kuş'],
        ]),
        isFalse,
      );
    });
  });

  group('gosterilenSeri', () {
    test('son çalışma bugün ya da dünse seri aynen görünür', () {
      const d = OgrenciDurumu(seri: 5, sonGun: '2026-10-14');
      expect(Motor.gosterilenSeri(d, '2026-10-14'), 5);
      expect(Motor.gosterilenSeri(d, '2026-10-15'), 5);
    });
    test('iki gün ve daha fazla boşlukta 0 görünür, sonGun yoksa 0', () {
      const d = OgrenciDurumu(seri: 5, sonGun: '2026-10-12');
      expect(Motor.gosterilenSeri(d, '2026-10-15'), 0);
      expect(
        Motor.gosterilenSeri(const OgrenciDurumu(seri: 3), '2026-10-15'),
        0,
      );
    });
  });

  group('OgrenciDurumu gün ve saat denetimi', () {
    test('gerçek takvim günleri geçerli, sahte günler geçersiz', () {
      expect(OgrenciDurumu.gunGecerli('2026-02-28'), isTrue);
      expect(OgrenciDurumu.gunGecerli('2026-02-30'), isFalse);
      expect(OgrenciDurumu.gunGecerli('9999-99-99'), isFalse);
      expect(OgrenciDurumu.gunGecerli('1999-12-31'), isFalse);
    });
    test('saat 00-23 ve dakika 00-59 aralığında olmalı', () {
      expect(OgrenciDurumu.saatGecerli('08:47'), isTrue);
      expect(OgrenciDurumu.saatGecerli('99:99'), isFalse);
      expect(OgrenciDurumu.saatGecerli('23:60'), isFalse);
      final d = OgrenciDurumu.fromJson({'hatirlatmaSaati': '99:99'});
      expect(d.hatirlatmaSaati, isNull);
    });
    test('sayaçlarda aşırı büyük değer atılır', () {
      final d = OgrenciDurumu.fromJson({
        'gunlukXp': {'2026-10-15': 1 << 50, '2026-10-14': 20},
      });
      expect(d.gunlukXp, {'2026-10-14': 20});
    });
  });

  group('kıvrık kesme işareti', () {
    test("o’clock ile o'clock aynı sayılır", () {
      const a = Yaz(soru: 'Saat', cevaplar: ["It's five o'clock"]);
      expect(Motor.cevapDogruMu(a, 'It’s five o’clock'), isTrue);
      expect(Motor.cevapDogruMu(a, 'Its five oclock'), isFalse);
    });
  });
}
