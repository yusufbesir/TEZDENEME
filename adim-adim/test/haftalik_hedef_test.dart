/// Haftalık hedef ve esnek seri birim testleri: hafta başı (Pazartesi), haftalık
/// gün sayısı, hedef 3-7 sınırı, seri kopmama kuralı ve eski JSON uyumu.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf
/// kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:convert';

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

/// Verilen günlerde birer ders bitirir (günler artan sırada verilmeli).
OgrenciDurumu calis(List<String> gunler, {OgrenciDurumu? ilk}) {
  var d = ilk ?? const OgrenciDurumu();
  for (final g in gunler) {
    d = Motor.dersBitir(d, 'k.u1.d1', 1, 2, g);
  }
  return d;
}

// 2026-10-12 Pazartesi ... 2026-10-18 Pazar.
const pzt = '2026-10-12';
const sal = '2026-10-13';
const car = '2026-10-14';
const per = '2026-10-15';
const cum = '2026-10-16';
const cmt = '2026-10-17';
const paz = '2026-10-18';
const pzt2 = '2026-10-19';
const sal2 = '2026-10-20';

void main() {
  group('haftaBaslangici', () {
    test('haftanın her günü o haftanın Pazartesi gününe gider', () {
      for (final g in [pzt, sal, car, per, cum, cmt, paz]) {
        expect(Motor.haftaBaslangici(g), pzt, reason: g);
      }
      expect(Motor.haftaBaslangici(pzt2), pzt2);
    });
    test('yıl ve ay geçişi', () {
      expect(Motor.haftaBaslangici('2026-01-01'), '2025-12-29'); // Perşembe
      expect(Motor.haftaBaslangici('2024-03-01'), '2024-02-26'); // artık yıl
    });
    test('geçersiz gün aynen döner', () {
      expect(Motor.haftaBaslangici('dün'), 'dün');
    });
  });

  group('haftaGunSayisi', () {
    test('yalnız bu haftanın XP kazanılan günleri sayılır', () {
      final d = calis(['2026-10-10', '2026-10-11', pzt, car, cmt, pzt2]);
      expect(Motor.haftaGunSayisi(d, per), 3); // pzt, car, cmt
      expect(Motor.haftaGunSayisi(d, paz), 3);
      expect(Motor.haftaGunSayisi(d, pzt2), 1);
      expect(
        Motor.haftaGunSayisi(d, '2026-10-05'),
        2,
      ); // önceki hafta: 10-10, 10-11
    });
    test('aynı gün birden çok ders tek gün sayılır', () {
      var d = calis([pzt]);
      d = Motor.dersBitir(d, 'k.u1.d2', 1, 2, pzt);
      expect(Motor.haftaGunSayisi(d, pzt), 1);
    });
    test('XP değeri 0 olan ve geçersiz gün anahtarı sayılmaz', () {
      const d = OgrenciDurumu(gunlukXp: {pzt: 0, sal: 10});
      expect(Motor.haftaGunSayisi(d, per), 1);
      expect(Motor.haftaGunSayisi(d, 'bozuk'), 0);
    });
    test('eski kayıtta (haftalık alan yok) gunlukXp\'ten hesaplanır', () {
      final d = OgrenciDurumu.fromJson({
        'gunlukXp': {pzt: 20, per: 30},
      });
      expect(Motor.haftaGunSayisi(d, cum), 2);
    });
  });

  group('haftalikHedefGun', () {
    test('varsayılan 5, sınırlar 3..7', () {
      expect(const OgrenciDurumu().haftalikHedefGun, 5);
      expect(OgrenciDurumu.enAzHaftalikHedef, 3);
      expect(OgrenciDurumu.enCokHaftalikHedef, 7);
    });
    test('eski JSON (alan yok) 5 olur', () {
      expect(OgrenciDurumu.fromJson({'xp': 3}).haftalikHedefGun, 5);
      expect(OgrenciDurumu.fromJson(null).haftalikHedefGun, 5);
    });
    test('geçerli değerler korunur, geçersizler 5e döner', () {
      for (final v in [3, 4, 5, 6, 7]) {
        expect(
          OgrenciDurumu.fromJson({'haftalikHedefGun': v}).haftalikHedefGun,
          v,
        );
      }
      for (final v in <Object?>[0, 2, 8, -1, 5.5, '5', null, true]) {
        expect(
          OgrenciDurumu.fromJson({'haftalikHedefGun': v}).haftalikHedefGun,
          5,
          reason: '$v',
        );
      }
    });
    test('toJson/fromJson ve copyWith', () {
      final d = const OgrenciDurumu().copyWith(haftalikHedefGun: 3);
      expect(d.haftalikHedefGun, 3);
      final r = OgrenciDurumu.fromJson(jsonDecode(jsonEncode(d.toJson())));
      expect(r.haftalikHedefGun, 3);
      expect(d.copyWith(xp: 1).haftalikHedefGun, 3);
    });
  });

  group('esnek seri', () {
    test('günlük ardışık kural aynen: ardışık gün seriyi artırır', () {
      final d = calis([pzt, sal, car]);
      expect(d.seri, 3);
    });

    test('hedef tutulduysa hafta sonu ara seriyi kırmaz', () {
      // Pzt-Cum 5 gün çalışıldı, Cmt-Paz boş, Pzt yeniden.
      final d = calis([pzt, sal, car, per, cum, pzt2]);
      expect(d.seri, 6);
      expect(d.enSeri, 6);
    });

    test('hedef tutulmadıysa gün atlayınca seri 1e düşer (eski davranış)', () {
      final d = calis([pzt, sal, cum]);
      expect(d.seri, 1);
      expect(d.enSeri, 2);
    });

    test('hedef 3 iken 3 gün sonra aynı hafta içi ara serisi korur', () {
      final ilk = const OgrenciDurumu(haftalikHedefGun: 3);
      final d = calis([pzt, sal, car, paz], ilk: ilk);
      expect(d.seri, 4);
    });

    test('hedef 3 iken 2 gün yetmez', () {
      final ilk = const OgrenciDurumu(haftalikHedefGun: 3);
      final d = calis([pzt, sal, paz], ilk: ilk);
      expect(d.seri, 1);
    });

    test('hedef tutulsa bile tam boş hafta girerse seri kopar', () {
      final d = calis([pzt, sal, car, per, cum, '2026-10-26']);
      expect(d.seri, 1);
      expect(d.enSeri, 5);
    });

    test(
      'hedef tutulan haftadan sonraki haftada da bağlanır, sonrası değil',
      () {
        var d = calis([pzt, sal, car, per, cum]);
        d = Motor.dersBitir(d, 'k.u1.d1', 1, 2, sal2); // ertesi hafta Salı
        expect(d.seri, 6);
        // Ertesi hafta yalnız 1 gün çalışıldı; sonraki haftaya atlayınca kopar.
        d = Motor.dersBitir(d, 'k.u1.d1', 1, 2, '2026-10-30');
        expect(d.seri, 1);
      },
    );

    test('günlük hedef ve XP mekanizması etkilenmez', () {
      final d = calis([pzt, sal, car, per, cum, pzt2]);
      expect(d.gunlukHedef, 30);
      expect(d.gunlukXp[pzt2], Motor.dersXp(1, 2));
      expect(d.xp, 6 * Motor.dersXp(1, 2));
    });

    test('mikro ders ve yarışma da aynı esnek kuralı kullanır', () {
      var d = calis([pzt, sal, car, per, cum]);
      d = Motor.mikroBitir(d, 3, 5, pzt2);
      expect(d.seri, 6);
      d = Motor.yarismaBitir(d, 100, sal2);
      expect(d.seri, 7);
    });

    test(
      'hedef sonradan yükseltilirse geçmiş hafta yeni hedefe göre sayılır',
      () {
        var d = calis([pzt, sal, car, per, cum]);
        d = d.copyWith(haftalikHedefGun: 6);
        d = Motor.dersBitir(d, 'k.u1.d1', 1, 2, pzt2);
        expect(d.seri, 1);
      },
    );
  });

  group('gosterilenSeri (esnek)', () {
    final d = calis([pzt, sal, car, per, cum]);
    test('dün ve bugün aynen', () {
      expect(Motor.gosterilenSeri(d, cum), 5);
      expect(Motor.gosterilenSeri(d, cmt), 5);
    });
    test('hedef tutulduysa hafta sonu ve ertesi hafta boyunca görünür', () {
      expect(Motor.gosterilenSeri(d, paz), 5);
      expect(Motor.gosterilenSeri(d, pzt2), 5);
      expect(Motor.gosterilenSeri(d, '2026-10-25'), 5); // ertesi hafta Pazar
    });
    test('iki hafta sonra 0', () {
      expect(Motor.gosterilenSeri(d, '2026-10-26'), 0);
    });
    test('hedef tutulmadıysa iki gün sonra 0 (eski davranış)', () {
      final az = calis([pzt, sal]);
      expect(Motor.gosterilenSeri(az, car), 2);
      expect(Motor.gosterilenSeri(az, per), 0);
    });
    test('sonGun gelecekteyse 0', () {
      expect(Motor.gosterilenSeri(d, '2026-10-10'), 0);
    });
  });
}
