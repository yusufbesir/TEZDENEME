// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// ÖZELLİK 49 testleri: aylık meydan okuma (ay sayaçları, ilerleme, hedef),
/// haftalık yan görev, kişisel rekorlar, eski JSON uyumu ve Profil/Meydan
/// ekranı (480x600 @1,5 taşma yok).
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/meydan.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/uygulama.dart' show yonlendiriciProvider;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

const _d1 = 'sahte-1.u1.d1';

/// [n] ders bitirir (her biri ayrı gün değil; aynı gün).
OgrenciDurumu _dersler(OgrenciDurumu d, int n, String gun) {
  for (var i = 0; i < n; i++) {
    d = Motor.dersBitir(d, _d1, 5, 5, gun);
  }
  return d;
}

void main() {
  group('ay sayaçları', () {
    test('dersBitir ay, kurs ve günlük süre sayaçlarını artırır', () {
      var d = Motor.dersBitir(
        const OgrenciDurumu(),
        _d1,
        5,
        5,
        '2026-10-15',
        sureSn: 120,
      );
      expect(d.aylikDers, {'2026-10': 1});
      expect(d.aylikKurs, {'2026-10|sahte-1': 1});
      expect(d.gunlukSureSn, {'2026-10-15': 120});
      d = Motor.dersBitir(d, _d1, 5, 5, '2026-10-16', sureSn: 60);
      d = Motor.dersBitir(d, _d1, 5, 5, '2026-11-02');
      expect(d.aylikDers, {'2026-10': 2, '2026-11': 1});
      expect(d.aylikKurs['2026-10|sahte-1'], 2);
      expect(d.aylikKurs['2026-11|sahte-1'], 1);
      expect(d.gunlukSureSn, {'2026-10-15': 120, '2026-10-16': 60});
    });

    test('geçersiz günde ay ve süre sayaçlarına dokunulmaz', () {
      final d = Motor.dersBitir(
        const OgrenciDurumu(),
        _d1,
        5,
        5,
        'bozuk',
        sureSn: 50,
      );
      expect(d.aylikDers, isEmpty);
      expect(d.gunlukSureSn, isEmpty);
    });

    test(
      'aylikDersler günlükteki ders kayıtlarıyla tamamlanır (eski kayıt)',
      () {
        final d = OgrenciDurumu(
          aylikDers: const {'2026-10': 5},
          gunluk: [
            for (var i = 0; i < 2; i++)
              GunlukKayit(gun: '2026-09-1$i', tur: GunlukKayit.turDers),
            for (var i = 0; i < 3; i++)
              GunlukKayit(gun: '2026-10-0${i + 1}', tur: GunlukKayit.turDers),
            const GunlukKayit(gun: '2026-10-09', tur: GunlukKayit.turMikro),
          ],
        );
        // Eylül: yalnız günlük (2); Ekim: sayaç (5) günlükten (3) büyük.
        expect(Meydan.aylikDersler(d), {'2026-09': 2, '2026-10': 5});
      },
    );
  });

  group('aylık meydan okuma', () {
    test('varsayılan hedef 30; ilerleme, kalan gün ve günlük gereken', () {
      final d = _dersler(const OgrenciDurumu(), 3, '2026-10-15');
      final m = Meydan.aylik(d, '2026-10-15');
      expect(m.ay, '2026-10');
      expect(m.hedef, 30);
      expect(m.ilerleme, 3);
      expect(m.tamam, isFalse);
      expect(m.kalanGun, 17); // 15..31 Ekim
      expect(m.gunlukGerekli, 2); // 27 ders / 17 gün -> 2
    });

    test('başka ayın dersleri bu aya sayılmaz', () {
      final d = _dersler(const OgrenciDurumu(), 4, '2026-09-20');
      expect(Meydan.aylik(d, '2026-10-01').ilerleme, 0);
      expect(Meydan.aylik(d, '2026-09-30').ilerleme, 4);
    });

    test('hedefe ulaşınca tamamlandı; hedef 5..100 aralığına çekilir', () {
      var d = _dersler(const OgrenciDurumu(), 5, '2026-10-15');
      d = Meydan.hedefAyarla(d, 1);
      expect(d.aylikHedefDers, 5);
      expect(Meydan.aylik(d, '2026-10-15').tamam, isTrue);
      expect(Meydan.aylik(d, '2026-10-15').gunlukGerekli, 0);
      expect(Meydan.hedefAyarla(d, 500).aylikHedefDers, 100);
      expect(Meydan.hedefAyarla(d, 45).aylikHedefDers, 45);
      expect(
        Meydan.aylik(Meydan.hedefAyarla(d, 45), '2026-10-15').tamam,
        isFalse,
      );
    });

    test('ayın son günü: gün sayısı ve şubat', () {
      expect(Meydan.ayGunSayisi('2026-02'), 28);
      expect(Meydan.ayGunSayisi('2028-02'), 29);
      expect(Meydan.ayGunSayisi('bozuk'), 30);
      final d = _dersler(const OgrenciDurumu(), 1, '2026-10-31');
      expect(Meydan.aylik(d, '2026-10-31').kalanGun, 1);
      expect(Meydan.aylik(d, '2026-10-31').gunlukGerekli, 29);
    });
  });

  group('haftalık yan görev', () {
    test('aynı hafta aynı görev; ardışık 5 haftada 5 farklı görev', () {
      final a = Meydan.yanGorev(const OgrenciDurumu(), '2026-10-12');
      final b = Meydan.yanGorev(const OgrenciDurumu(), '2026-10-18');
      expect(a.tur, b.tur);
      const haftalar = [
        '2026-10-12',
        '2026-10-19',
        '2026-10-26',
        '2026-11-02',
        '2026-11-09',
      ];
      final turler = {
        for (final h in haftalar) Meydan.yanGorev(const OgrenciDurumu(), h).tur,
      };
      expect(turler.length, 5);
      // Altıncı hafta ilk göreve döner.
      expect(Meydan.yanGorev(const OgrenciDurumu(), '2026-11-16').tur, a.tur);
    });

    test(
      'ilerleme yalnız haftanın kayıtlarından sayılır ve hedefte kırpılır',
      () {
        final g = Meydan.yanGorev(const OgrenciDurumu(), '2026-10-15');
        expect(g.ilerleme, 0);
        expect(g.tamam, isFalse);
        final kayitlar = [
          // Önceki hafta (sayılmaz) ve sonraki hafta (sayılmaz).
          GunlukKayit(gun: '2026-10-11', tur: g.tur),
          GunlukKayit(gun: '2026-10-19', tur: g.tur),
          // Bu hafta: Pazartesi ve Pazar dahil.
          GunlukKayit(gun: '2026-10-12', tur: g.tur),
          GunlukKayit(gun: '2026-10-18', tur: g.tur),
          // Başka tür sayılmaz.
          GunlukKayit(
            gun: '2026-10-14',
            tur: g.tur == 'quiz' ? 'tekrar' : 'quiz',
          ),
        ];
        var d = OgrenciDurumu(gunluk: kayitlar);
        expect(Meydan.yanGorev(d, '2026-10-15').ilerleme, 2);
        d = OgrenciDurumu(
          gunluk: [
            for (var i = 0; i < 10; i++)
              GunlukKayit(gun: '2026-10-13', tur: g.tur),
          ],
        );
        final tam = Meydan.yanGorev(d, '2026-10-15');
        expect(tam.ilerleme, g.hedef);
        expect(tam.tamam, isTrue);
      },
    );
  });

  group('kişisel rekorlar', () {
    test(
      'seri, en çok XP (gün/hafta), en uzun çalışma ve en çok ders (ay)',
      () {
        final d = OgrenciDurumu(
          enSeri: 7,
          gunlukXp: const {
            '2026-10-12': 40,
            '2026-10-13': 90,
            '2026-10-20': 10,
            '2026-10-21': 0,
          },
          gunlukSureSn: const {'2026-10-13': 1500, '2026-10-14': 30},
          aylikDers: const {'2026-09': 4, '2026-10': 9},
        );
        final r = {for (final k in Meydan.rekorlar(d)) k.kod: k};
        expect(r.keys, ['seri', 'xp-gun', 'xp-hafta', 'sure-gun', 'ders-ay']);
        expect(r['seri']!.metin, '7 gün');
        expect(r['xp-gun']!.deger, 90);
        expect(r['xp-gun']!.gun, '2026-10-13');
        expect(r['xp-hafta']!.deger, 130);
        expect(r['xp-hafta']!.gun, '2026-10-12');
        expect(r['sure-gun']!.metin, '25 dk');
        expect(r['ders-ay']!.metin, '9 ders');
        expect(r['ders-ay']!.gun, '2026-10');
      },
    );

    test('hiç veri yoksa rekor yok', () {
      expect(Meydan.rekorlar(const OgrenciDurumu()), isEmpty);
    });

    test('bir dakikadan kısa süre rekor sayılmaz', () {
      final d = OgrenciDurumu(gunlukSureSn: const {'2026-10-14': 59});
      expect(Meydan.rekorlar(d), isEmpty);
    });
  });

  group('eski kayıt uyumu', () {
    test('eski JSON varsayılana düşer', () {
      final d = OgrenciDurumu.fromJson({'xp': 5});
      expect(d.aylikHedefDers, 30);
      expect(d.aylikDers, isEmpty);
      expect(d.aylikKart, isEmpty);
      expect(d.aylikKurs, isEmpty);
      expect(d.gunlukSureSn, isEmpty);
      expect(d.gunlukDakikaHedefi, 0);
      expect(d.ardisikBasarisiz, 0);
      expect(d.sonBasarisizDers, isNull);
    });

    test('toJson/fromJson gidiş dönüş ve bozuk girdiler atılır', () {
      final d = _dersler(const OgrenciDurumu(), 2, '2026-10-15');
      final geri = OgrenciDurumu.fromJson(d.toJson());
      expect(geri.aylikDers, d.aylikDers);
      expect(geri.aylikKurs, d.aylikKurs);
      final bozuk = OgrenciDurumu.fromJson({
        'aylikDers': {'bozuk': 1, '2026-13': 2, '2026-10': 3},
        'aylikKurs': {'2026-10|k-1': 2, '2026-10|': 1, 'x|k': 1},
        'aylikHedefDers': 999,
        'gunlukSureSn': {'2026-10-15': 100, '2026-10-16': 999999, 'x': 5},
        'gunlukDakikaHedefi': 5000,
        'ardisikBasarisiz': 'x',
        'sonBasarisizDers': 'a#b',
      });
      expect(bozuk.aylikDers, {'2026-10': 3});
      expect(bozuk.aylikKurs, {'2026-10|k-1': 2});
      expect(bozuk.aylikHedefDers, 30);
      expect(bozuk.gunlukSureSn, {'2026-10-15': 100});
      expect(bozuk.gunlukDakikaHedefi, 0);
      expect(bozuk.ardisikBasarisiz, 0);
      expect(bozuk.sonBasarisizDers, isNull);
    });

    test('enYeniKirp en eski anahtarları atar', () {
      final m = OgrenciDurumu.enYeniKirp({
        '2026-01': 1,
        '2026-02': 2,
        '2026-03': 3,
      }, 2);
      expect(m.keys, ['2026-02', '2026-03']);
    });
  });

  group('arayüz', () {
    testWidgets(
      'Profil satırı Meydan ekranını açar; hedef seçilince kaydolur',
      (tester) async {
        final depo = BellekDepo(
          const OgrenciDurumu(
            alan: 'dil',
            aylikDers: {'2026-10': 12},
            enSeri: 4,
            gunlukXp: {'2026-10-14': 55},
          ),
        );
        final kap = await uygulamayiAc(
          tester,
          depo,
          boyut: const Size(480, 600),
          metinOlcegi: 1.5,
        );
        await dokun(
          tester,
          find.descendant(
            of: find.byType(NavigationBar),
            matching: find.text('Profil'),
          ),
        );
        expect(find.text('Bu ay 12/30 ders'), findsOneWidget);
        await dokun(tester, find.byKey(const ValueKey('profil-meydan')));
        expect(find.text('12 / 30 ders'), findsOneWidget);
        expect(find.byKey(const ValueKey('meydan-gorev')), findsOneWidget);
        expect(find.byKey(const ValueKey('rekor-seri')), findsOneWidget);
        expect(find.byKey(const ValueKey('rekor-xp-gun')), findsOneWidget);

        await dokun(tester, find.byKey(const ValueKey('meydan-hedef-10')));
        expect(find.text('12 / 10 ders'), findsOneWidget);
        expect(find.textContaining('Tamamlandı. Bu ayın'), findsOneWidget);
        expect(kap.read(durumProvider).value!.aylikHedefDers, 10);
        expect((await depo.yukle()).aylikHedefDers, 10);
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets('veri yokken rekor yok mesajı ve özet düğmesi', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [sahteKurs],
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      kap.read(yonlendiriciProvider).push('/meydan');
      await tester.pumpAndSettle();
      expect(find.text('0 / 30 ders'), findsOneWidget);
      expect(find.byKey(const ValueKey('meydan-rekor-yok')), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('meydan-ozet-ac')));
      expect(find.text('Ay ve yıl özeti'), findsWidgets);
      expect(tester.takeException(), isNull);
    });
  });
}
