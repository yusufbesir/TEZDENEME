/// Kelime sağlığı testleri: Motor.kelimeSagligi (eşikler, alan süzme, boş
/// durum) ve Tekrar sekmesindeki pano (480x600 + metin ölçeği 1,5'te taşma
/// yok; sayılar doğru; Zayıf'a dokununca liste açılır; kart yoksa metin).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden kod
/// değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:adim_adim/bilesenler/kelime_sagligi_panosu.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

Kart _kart(double yariOmur, {String sonraki = '2026-10-20'}) => Kart(
  kutu: Kart.kutuHesapla(yariOmur),
  sonraki: sonraki,
  yariOmurGun: yariOmur,
);

void main() {
  group('Motor.kelimeSagligi', () {
    test('eşik sabitleri 2 ve 7 gün', () {
      expect(Kart.ortaEsik, 2.0);
      expect(Kart.gucluEsik, 7.0);
    });

    test('yarı ömre göre üç kümeye ayırır; sınırlar ortaya dahil', () {
      final d = OgrenciDurumu(
        alan: 'dil',
        kartlar: {
          '$sahteDers1#0': _kart(0.5),
          '$sahteDers1#1': _kart(1.99),
          '$sahteDers1#2': _kart(2.0), // sınır: orta
          '$sahteDers1#3': _kart(4.0),
          '$sahteDers1#4': _kart(7.0), // sınır: orta
          '$sahteDers1#5': _kart(7.01),
          '$sahteDers1#6': _kart(180),
        },
      );
      final s = Motor.kelimeSagligi(d, [sahteKurs]);
      expect(s.zayif, ['$sahteDers1#0', '$sahteDers1#1']);
      expect(s.orta, ['$sahteDers1#2', '$sahteDers1#3', '$sahteDers1#4']);
      expect(s.guclu, ['$sahteDers1#5', '$sahteDers1#6']);
    });

    test('yalnız verilen kursların kartları; çözülemeyen kart düşer', () {
      final d = OgrenciDurumu(
        alan: 'dil',
        kartlar: {
          '$sahteDers1#0': _kart(1),
          '$sahteKodDers1#0': _kart(1), // kod kursu verilmedi
          'yok.ders#0': _kart(1), // çözülemeyen
          '$sahteDers2#99': _kart(1), // indeks dışı
        },
      );
      final dil = Motor.kelimeSagligi(d, [sahteKurs]);
      expect(dil.zayif, ['$sahteDers1#0']);
      expect(dil.orta, isEmpty);
      expect(dil.guclu, isEmpty);

      final ikisi = Motor.kelimeSagligi(d, [sahteKurs, sahteKodKurs]);
      expect(ikisi.zayif, ['$sahteDers1#0', '$sahteKodDers1#0']);
    });

    test('kart yoksa ya da kurs yoksa üç küme de boş', () {
      final bos = Motor.kelimeSagligi(const OgrenciDurumu(), [sahteKurs]);
      expect(bos.zayif, isEmpty);
      expect(bos.orta, isEmpty);
      expect(bos.guclu, isEmpty);

      final kurssuz = Motor.kelimeSagligi(
        OgrenciDurumu(kartlar: {'$sahteDers1#0': _kart(1)}),
        const [],
      );
      expect(kurssuz.zayif, isEmpty);
    });

    test('kümeler kimliğe göre sıralı', () {
      final d = OgrenciDurumu(
        kartlar: {
          '$sahteDers2#1': _kart(1),
          '$sahteDers1#1': _kart(1),
          '$sahteDers1#0': _kart(1),
        },
      );
      final s = Motor.kelimeSagligi(d, [sahteKurs]);
      expect(s.zayif, ['$sahteDers1#0', '$sahteDers1#1', '$sahteDers2#1']);
    });
  });

  group('KelimeSagligiPanosu arayüzü', () {
    Future<void> tekrarSekmesineGec(WidgetTester tester) =>
        tekrarEkraniniAc(tester);

    BellekDepo dolaDepo() => BellekDepo(
      OgrenciDurumu(
        alan: 'dil',
        kartlar: {
          '$sahteDers1#0': _kart(0.5, sonraki: '2026-10-16'),
          '$sahteDers1#1': _kart(1.0, sonraki: '2026-10-17'),
          '$sahteDers1#2': _kart(1.5, sonraki: '2026-10-18'),
          '$sahteDers1#3': _kart(3.0, sonraki: '2026-10-20'),
          '$sahteDers1#4': _kart(7.0, sonraki: '2026-10-22'),
          '$sahteDers2#0': _kart(16.0, sonraki: '2026-10-30'),
          '$sahteKodDers1#0': _kart(0.5, sonraki: '2026-10-16'), // kod: yok
        },
      ),
    );

    testWidgets('480x600, ölçek 1,5: taşma yok, sayılar doğru', (tester) async {
      await uygulamayiAc(
        tester,
        dolaDepo(),
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
        kurslar: [sahteKurs, sahteKodKurs],
      );
      await tekrarSekmesineGec(tester);
      expect(tester.takeException(), isNull);

      final pano = find.byType(KelimeSagligiPanosu);
      expect(pano, findsOneWidget);
      await tester.ensureVisible(find.text('Kelime sağlığı'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      expect(
        find.descendant(of: pano, matching: find.text('3')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: pano, matching: find.text('2')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: pano, matching: find.text('1')),
        findsOneWidget,
      );
      expect(find.text('Zayıf'), findsOneWidget);
      expect(find.text('Orta'), findsOneWidget);
      expect(find.text('Güçlü'), findsOneWidget);
      expect(find.text('Henüz kart yok'), findsNothing);
    });

    testWidgets('Zayıf kümesine dokununca kart listesi açılır', (tester) async {
      await uygulamayiAc(
        tester,
        dolaDepo(),
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
        kurslar: [sahteKurs, sahteKodKurs],
      );
      await tekrarSekmesineGec(tester);
      await dokun(tester, find.text('Zayıf'));
      expect(tester.takeException(), isNull);

      expect(find.byType(BottomSheet), findsOneWidget);
      expect(find.text('Zayıf · 3 kart'), findsOneWidget);
      // Sahte dersin ilk üç alıştırmasının soruları ve kutu/sonraki bilgisi.
      expect(find.text('İki artı iki kaç eder?'), findsOneWidget);
      expect(find.text('I ___ a student.'), findsOneWidget);
      expect(find.text('Kutu 1 · Sonraki 2026-10-16'), findsOneWidget);
      expect(find.text('Kutu 1 · Sonraki 2026-10-17'), findsOneWidget);
      // Orta kümenin kartı listede yok.
      expect(find.text('Kutu 2 · Sonraki 2026-10-20'), findsNothing);
    });

    testWidgets('kart yoksa "Henüz kart yok" metni, çubuk yok', (tester) async {
      await uygulamayiAc(tester, null, boyut: const Size(480, 600));
      await tekrarSekmesineGec(tester);
      expect(find.text('Kelime sağlığı'), findsOneWidget);
      expect(find.text('Henüz kart yok'), findsOneWidget);
      expect(find.text('Zayıf'), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('yalnız seçili alanın kartları sayılır (kod alanı)', (
      tester,
    ) async {
      final depo = BellekDepo(
        OgrenciDurumu(
          alan: 'kod',
          kartlar: {
            '$sahteDers1#0': _kart(0.5), // dil: sayılmaz
            '$sahteKodDers1#0': _kart(10.0),
          },
        ),
      );
      await uygulamayiAc(
        tester,
        depo,
        boyut: const Size(480, 600),
        kurslar: [sahteKurs, sahteKodKurs],
      );
      await tekrarSekmesineGec(tester);
      final pano = find.byType(KelimeSagligiPanosu);
      expect(
        find.descendant(of: pano, matching: find.text('1')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: pano, matching: find.text('0')),
        findsNWidgets(2),
      );
    });
  });
}
