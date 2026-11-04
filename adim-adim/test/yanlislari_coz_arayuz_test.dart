/// Sahibi Yusuf (yusufbesir). Yazan: [Claude#yanlislari-coz] Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// "Yanlışları çöz" arayüzü: düğme yalnız hata varken görünür, `/mikro?mod=yanlis`
/// açar, oturum bitince "Yanlışlar çözüldü" başlığı gelir; 480x600 ölçek 1,5.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/ekranlar/mikro_ders_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'pratik_test.dart' show pratikDers1, pratikKurs;

const _dugme = ValueKey('pratik-yanlislari-coz');

HataKaydi _hata(int i) => HataKaydi(
  tur: HataKaydi.turKart,
  id: '$pratikDers1#$i',
  seviye: 'pratik-1',
  gun: '2026-10-15',
);

Future<void> _pratigeGit(WidgetTester tester, OgrenciDurumu d) async {
  await uygulamayiAc(
    tester,
    BellekDepo(d),
    kurslar: [pratikKurs],
    boyut: const Size(480, 600),
    metinOlcegi: 1.5,
  );
  await dokun(
    tester,
    find.descendant(
      of: find.byType(NavigationBar),
      matching: find.text('Pratik'),
    ),
  );
}

void main() {
  testWidgets('hata yokken düğme gizli', (tester) async {
    await _pratigeGit(
      tester,
      const OgrenciDurumu(alan: 'dil', tamamlanan: {pratikDers1: 1}),
    );
    expect(find.byKey(const ValueKey('pratik-hatalarim')), findsOneWidget);
    expect(find.byKey(_dugme), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('hata varken düğme görünür; oturum açılır ve biter', (
    tester,
  ) async {
    await _pratigeGit(
      tester,
      OgrenciDurumu(
        alan: 'dil',
        tamamlanan: {pratikDers1: 1},
        hatalar: [_hata(1), _hata(2)],
      ),
    );
    await tester.ensureVisible(find.byKey(_dugme));
    expect(find.byKey(_dugme), findsOneWidget);
    expect(find.text('Yanlışları çöz'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await dokun(tester, find.byKey(_dugme));
    final ekran = tester.widget<MikroDersEkrani>(find.byType(MikroDersEkrani));
    expect(ekran.mod, 'yanlis');

    // Son hata önce gelir: #2 (1 + 1 = 2), sonra #1 (2 + 2 = 4).
    await dokun(tester, find.text('2'));
    await dokun(tester, find.text('Kontrol et'));
    await dokun(tester, find.text('Devam'));
    await dokun(tester, find.text('4'));
    await dokun(tester, find.text('Kontrol et'));
    await dokun(tester, find.text('Bitir'));
    expect(find.text('Yanlışlar çözüldü'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
