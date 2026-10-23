// Sahibi Yusuf (yusufbesir). Yazan: Claude (dalga 8). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// "Başlamadan önce" bileşeni: içerik, Başla/Vazgeç geri çağrıları ve
/// 360x640 @1,5 ölçekte taşmama.
library;

import 'package:adim_adim/bilesenler/sinav_oncesi.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _sar({VoidCallback? basla, VoidCallback? vazgec}) => MaterialApp(
  theme: acikTema(),
  home: Scaffold(
    body: SinavOncesiEkrani(
      baslik: 'Efsanevi tekrar: Çok uzun bir ünite adı burada yer alıyor',
      altBaslik: 'İngilizce A1 başlangıç seviyesi kursu',
      simge: Icons.quiz,
      soruSayisi: 10,
      sureKurali:
          'Toplam 2:30 (soru başına 15 sn), ipucu yok. Süre, Başla '
          'düğmesine basınca işler.',
      gecmeKosulu: 'En az %90 doğru ve süre dolmadan.',
      kazanc: 'Geçersen ünite altın olur. Başarısızlıkta ceza yok.',
      onBasla: basla ?? () {},
      onVazgec: vazgec ?? () {},
    ),
  ),
);

void main() {
  testWidgets('içerik ve düğmeler', (tester) async {
    var basla = 0;
    var vazgec = 0;
    await tester.pumpWidget(_sar(basla: () => basla++, vazgec: () => vazgec++));
    expect(find.text('Başlamadan önce'), findsOneWidget);
    expect(find.text('10 soru'), findsOneWidget);
    expect(find.text('Soru sayısı'), findsOneWidget);
    expect(find.text('Süre ve kurallar'), findsOneWidget);
    expect(find.text('Geçme koşulu'), findsOneWidget);
    expect(find.text('Ne kazanırsın'), findsOneWidget);
    tester.view.physicalSize = const Size(500, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('sinav-basla')));
    await tester.tap(find.byKey(const ValueKey('sinav-vazgec')));
    expect(basla, 1);
    expect(vazgec, 1);
  });

  testWidgets('360x640 @1,5: taşmaz, düğmeler erişilebilir', (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await tester.pumpWidget(_sar());
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.byKey(const ValueKey('sinav-vazgec')));
    await tester.pump();
    expect(tester.takeException(), isNull);
    final s = tester.getSize(find.byKey(const ValueKey('sinav-basla')));
    expect(s.height, greaterThanOrEqualTo(48));
  });
}
