/// Çalışma planı motor ve model testleri: günlük ders sayısı, bitiş tarihi,
/// kalan ders (atlanan/tamamlanan düşülür), haftalık öneri, JSON uyumu.
library;

import 'dart:convert';

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

Ders _ders(String id) => Ders(
  id: id,
  ad: id,
  alistirmalar: const [
    Secim(soru: 's', secenekler: ['a', 'b'], dogru: 0),
  ],
);

final Kurs _kurs = Kurs(
  id: 'k',
  ad: 'K',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'k.u1',
      ad: 'U1',
      dersler: [for (var i = 1; i <= 4; i++) _ders('k.u1.d$i')],
    ),
    Unite(
      id: 'k.u2',
      ad: 'U2',
      dersler: [for (var i = 1; i <= 6; i++) _ders('k.u2.d$i')],
    ),
  ],
);

// 2026-10-21 Çarşamba.
const _bugun = '2026-10-21';

void main() {
  test('planGunlukDers: dakika / 4, en az 1', () {
    expect(Motor.planGunlukDers(10), 2);
    expect(Motor.planGunlukDers(15), 3);
    expect(Motor.planGunlukDers(20), 5);
    expect(Motor.planGunlukDers(30), 7);
    expect(Motor.planGunlukDers(1), 1);
  });

  group('planBitisTarihi', () {
    test('bugün çalışma günüyse bugün sayılır', () {
      expect(Motor.planBitisTarihi(3, 3, {3}, _bugun), _bugun);
      expect(Motor.planBitisTarihi(4, 3, {3}, _bugun), '2026-10-28');
    });
    test('bugün çalışma günü değilse sonraki çalışma gününe geçer', () {
      // Cuma (5) tek gün: 2 gün gerekiyor -> 23 Ekim ve 30 Ekim.
      expect(Motor.planBitisTarihi(6, 3, {5}, _bugun), '2026-10-30');
      // Pzt+Per: Çar'dan başla -> Per 22, Pzt 26.
      expect(Motor.planBitisTarihi(4, 2, {1, 4}, _bugun), '2026-10-26');
    });
    test('ders yok / gün yok / geçersiz gün -> null', () {
      expect(Motor.planBitisTarihi(0, 3, {1}, _bugun), isNull);
      expect(Motor.planBitisTarihi(5, 3, {}, _bugun), isNull);
      expect(Motor.planBitisTarihi(5, 3, {9}, _bugun), isNull);
      expect(Motor.planBitisTarihi(5, 3, {1}, 'dün'), isNull);
    });
    test('ay ve yıl geçişi', () {
      expect(
        Motor.planBitisTarihi(2, 1, {1, 2, 3, 4, 5, 6, 7}, '2026-12-31'),
        '2027-01-01',
      );
    });
  });

  group('planOzeti', () {
    test('plan yok -> null; kurs yok -> null', () {
      expect(Motor.planOzeti(const OgrenciDurumu(), [_kurs], _bugun), isNull);
      const d = OgrenciDurumu(calismaPlani: CalismaPlani(kursId: 'yok'));
      expect(Motor.planOzeti(d, [_kurs], _bugun), isNull);
    });
    test('tamamlanan ve atlananlar düşülür; ünite hedefi', () {
      final d = OgrenciDurumu(
        calismaPlani: const CalismaPlani(
          kursId: 'k',
          gunlukDakika: 10,
          gunler: {3},
        ),
        tamamlanan: const {'k.u1.d1': 2},
        atlananDersler: const {'k.u1.d2', 'k.u2.d1'},
      );
      final o = Motor.planOzeti(d, [_kurs], _bugun)!;
      expect(o.toplam, 10);
      expect(o.kalan, 7);
      expect(o.gunlukDers, 2);
      expect(o.bugunCalisma, isTrue);
      expect(
        o.bitis,
        '2026-11-11',
      ); // 4 çalışma günü: 21.10, 28.10, 4.11, 11.11

      final u = Motor.planOzeti(
        d.copyWith(
          calismaPlani: const CalismaPlani(
            kursId: 'k',
            uniteId: 'k.u1',
            gunler: {3},
          ),
        ),
        [_kurs],
        _bugun,
      )!;
      expect((u.toplam, u.kalan), (4, 2));
    });
    test('hepsi bitti -> kalan 0, bitiş null; dinlenme günü', () {
      final d = OgrenciDurumu(
        calismaPlani: const CalismaPlani(
          kursId: 'k',
          uniteId: 'k.u1',
          gunler: {1},
        ),
        tamamlanan: {for (var i = 1; i <= 4; i++) 'k.u1.d$i': 1},
      );
      final o = Motor.planOzeti(d, [_kurs], _bugun)!;
      expect(o.kalan, 0);
      expect(o.bitis, isNull);
      expect(o.bugunCalisma, isFalse);
    });
  });

  test('planHaftalikOneri 3..7 aralığına çekilir; haftalık ayar değişmez', () {
    expect(
      Motor.planHaftalikOneri(const CalismaPlani(kursId: 'k', gunler: {1})),
      3,
    );
    expect(
      Motor.planHaftalikOneri(
        const CalismaPlani(kursId: 'k', gunler: {1, 2, 3, 4}),
      ),
      4,
    );
    expect(
      Motor.planHaftalikOneri(
        const CalismaPlani(kursId: 'k', gunler: {1, 2, 3, 4, 5, 6, 7}),
      ),
      7,
    );
    final d = const OgrenciDurumu(haftalikHedefGun: 6).copyWith(
      calismaPlani: const CalismaPlani(kursId: 'k', gunler: {1, 2}),
    );
    expect(d.haftalikHedefGun, 6);
  });

  group('JSON', () {
    test('gidiş-dönüş', () {
      const p = CalismaPlani(
        kursId: 'k',
        uniteId: 'k.u2',
        gunlukDakika: 30,
        gunler: {2, 6},
      );
      final d = OgrenciDurumu.fromJson(
        jsonDecode(jsonEncode(const OgrenciDurumu(calismaPlani: p).toJson())),
      );
      expect(d.calismaPlani, p);
    });
    test('eski kayıtta alan yok -> plan yok', () {
      final j = const OgrenciDurumu().toJson()..remove('calismaPlani');
      expect(OgrenciDurumu.fromJson(j).calismaPlani, isNull);
    });
    test('bozuk plan -> null; geçersiz dakika 15, geçersiz günler atılır', () {
      expect(CalismaPlani.fromJson('x'), isNull);
      expect(CalismaPlani.fromJson({'kursId': 3}), isNull);
      expect(CalismaPlani.fromJson({'kursId': 'k', 'gunler': []}), isNull);
      expect(
        CalismaPlani.fromJson({
          'kursId': 'k',
          'gunler': [0, 8, 'a'],
        }),
        isNull,
      );
      final p = CalismaPlani.fromJson({
        'kursId': 'k',
        'gunlukDakika': 99,
        'gunler': [1, 9, 1, 3],
      })!;
      expect(p.gunlukDakika, 15);
      expect(p.gunler, {1, 3});
      expect(p.uniteId, isNull);
    });
    test('calismaPlaniSil planı kaldırır', () {
      final d = const OgrenciDurumu(
        calismaPlani: CalismaPlani(kursId: 'k'),
      ).copyWith(calismaPlaniSil: true);
      expect(d.calismaPlani, isNull);
    });
  });
}
