// Sahibi Yusuf (yusufbesir). Yazan: Claude (dalga 8). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// "Vurgula" (cümlede doğru kelimeyi/kelimeleri işaretleme, Busuu highlighter):
/// mevcut Isaretle türü yeniden kullanılır. İngilizce A1 ve A2'de en az 3
/// örnek, model/JSON/doğrulama, tüm kurslarda indeks bütünlüğü ve 360x640
/// @1,5 ölçekte taşmama.
library;

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

List<Isaretle> _vurgular(Kurs k) => [
  for (final d in k.tumDersler) ...d.alistirmalar.whereType<Isaretle>(),
];

Widget _oturum(List<Alistirma> liste) => MaterialApp(
  theme: acikTema(),
  home: Scaffold(
    body: AlistirmaOturumu(
      alistirmalar: liste,
      onSonuc: (_, _) {},
      onBitti: (_, _) {},
      onKapat: () {},
    ),
  ),
);

void main() {
  group('Vurgula içeriği (Isaretle)', () {
    test('İngilizce A1 ve A2 en az 3 örnek içerir', () {
      expect(_vurgular(ingilizceA1).length, greaterThanOrEqualTo(3));
      expect(_vurgular(ingilizceA2).length, greaterThanOrEqualTo(3));
    });

    test(
      'tüm kurslarda indeksler geçerli, tekrarsız; doğru cevap kabul edilir',
      () {
        for (final k in tumKurslar) {
          for (final a in _vurgular(k)) {
            final n = a.kelimeler.length;
            expect(a.dogru, isNotEmpty, reason: '${k.id}: ${a.cumle}');
            expect(a.dogru.toSet().length, a.dogru.length, reason: a.cumle);
            expect(a.dogru.length, lessThan(n), reason: a.cumle);
            for (final i in a.dogru) {
              expect(i, inInclusiveRange(0, n - 1), reason: a.cumle);
            }
            expect(Motor.cevapDogruMu(a, List<int>.of(a.dogru)), isTrue);
            expect(Motor.cevapDogruMu(a, <int>[]), isFalse);
            expect(a.aciklama, isNotEmpty, reason: a.cumle);
          }
        }
      },
    );

    test('JSON gidiş-dönüş (model, alanlar korunur)', () {
      for (final k in [ingilizceA1, ingilizceA2]) {
        for (final a in _vurgular(k)) {
          final geri = Alistirma.fromJson(a.toJson());
          expect(geri, isA<Isaretle>());
          geri as Isaretle;
          expect(geri.tur, 'isaretle');
          expect(geri.cumle, a.cumle);
          expect(geri.dogru, a.dogru);
          expect(geri.soru, a.soru);
        }
      }
    });
  });

  group('Vurgula arayüzü', () {
    testWidgets('A2 örneği: çoklu doğru kelime işaretlenip kabul edilir', (
      tester,
    ) async {
      final a = _vurgular(ingilizceA2).firstWhere((x) => x.dogru.length == 2);
      await tester.pumpWidget(_oturum([a]));
      await tester.pumpAndSettle();
      for (final i in a.dogru) {
        await dokun(tester, find.text(a.kelimeler[i]));
      }
      await dokun(tester, find.text('Kontrol et'));
      expect(find.text('Doğru!'), findsOneWidget);
    });

    testWidgets('360x640 @1,5: A1 ve A2 örnekleri taşmaz', (tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      for (final a in [..._vurgular(ingilizceA1), ..._vurgular(ingilizceA2)]) {
        await tester.pumpWidget(const SizedBox());
        await tester.pumpWidget(_oturum([a]));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: a.cumle);
        await dokun(tester, find.text(a.kelimeler[a.dogru.first]));
        await dokun(tester, find.text('Kontrol et'));
        expect(tester.takeException(), isNull, reason: a.cumle);
      }
    });
  });
}
