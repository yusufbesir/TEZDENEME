// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Profil "Öğrenme günlüğü" arayüz testleri: boş durum, son 7 gün satırları,
/// eski kaydın listede olmaması, "Tümü" alt sayfası, dar ekranda taşma yok.
library;

import 'package:adim_adim/bilesenler/ogrenme_gunlugu.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

Future<void> _profileGit(WidgetTester tester) async {
  final rail = find.byType(NavigationRail);
  final kap = rail.evaluate().isNotEmpty ? rail : find.byType(NavigationBar);
  await dokun(tester, find.descendant(of: kap, matching: find.text('Profil')));
}

const _durum = OgrenciDurumu(
  alan: 'dil',
  gunluk: [
    GunlukKayit(
      gun: '2026-09-01',
      tur: 'ders',
      id: 'eski',
      dogru: 1,
      toplam: 2,
      xp: 12,
    ),
    GunlukKayit(gun: '2026-10-13', tur: 'tekrar', dogru: 3, toplam: 4),
    GunlukKayit(
      gun: '2026-10-15',
      tur: 'ders',
      id: 'a',
      dogru: 7,
      toplam: 8,
      xp: 24,
    ),
    GunlukKayit(gun: '2026-10-15', tur: 'mikro', dogru: 2, toplam: 3, xp: 9),
    GunlukKayit(gun: '2026-10-15', tur: 'yarisma', dogru: 5, toplam: 6, xp: 10),
  ],
);

void main() {
  testWidgets('kayıt yoksa "Henüz kayıt yok" ve Tümü yok', (tester) async {
    await uygulamayiAc(tester, BellekDepo(const OgrenciDurumu(alan: 'dil')));
    await _profileGit(tester);
    await tester.scrollUntilVisible(find.text('Öğrenme günlüğü'), 200);
    expect(find.text('Henüz kayıt yok'), findsOneWidget);
    expect(find.byKey(const ValueKey('gunluk-tumu')), findsNothing);
  });

  testWidgets('son 7 gün satırları: bugün ve 13 Eki; eski gün yok', (
    tester,
  ) async {
    await uygulamayiAc(tester, BellekDepo(_durum));
    await _profileGit(tester);
    await tester.scrollUntilVisible(find.text('Öğrenme günlüğü'), 200);
    await tester.pumpAndSettle();
    expect(find.text('Henüz kayıt yok'), findsNothing);
    expect(find.byType(GunlukSatiri), findsNWidgets(2));
    expect(find.text('Bugün'), findsOneWidget);
    expect(find.text('13 Eki'), findsOneWidget);
    expect(find.text('1 Eyl'), findsNothing);
    expect(
      find.text('2 ders, 1 yarışma · 14/17 doğru · 43 XP'),
      findsOneWidget,
    );
    expect(find.text('1 tekrar · 3/4 doğru · 0 XP'), findsOneWidget);
  });

  testWidgets('Tümü alt sayfada eski günü de listeler', (tester) async {
    await uygulamayiAc(tester, BellekDepo(_durum));
    await _profileGit(tester);
    await tester.scrollUntilVisible(find.text('Öğrenme günlüğü'), 200);
    await dokun(tester, find.byKey(const ValueKey('gunluk-tumu')));
    expect(find.byKey(const ValueKey('gunluk-tam-liste')), findsOneWidget);
    expect(find.text('Öğrenme günlüğü (5 kayıt)'), findsOneWidget);
    final liste = find.byKey(const ValueKey('gunluk-tam-liste'));
    expect(
      find.descendant(of: liste, matching: find.text('1 Eyl')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: liste, matching: find.byType(GunlukSatiri)),
      findsNWidgets(3),
    );
  });

  testWidgets('480x600, metin ölçeği 1,5: taşma yok', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(_durum),
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    await _profileGit(tester);
    await tester.scrollUntilVisible(find.text('Öğrenme günlüğü'), 200);
    await tester.pumpAndSettle();
    expect(find.byType(GunlukSatiri), findsWidgets);
    await dokun(tester, find.byKey(const ValueKey('gunluk-tumu')));
    expect(tester.takeException(), isNull);
  });

  test('gunEtiketi ve gunlukTurMetni', () {
    expect(gunEtiketi('2026-01-05'), '5 Oca');
    expect(gunEtiketi('bozuk'), 'bozuk');
    expect(gunlukTurMetni(_durum, '2026-10-15'), '2 ders, 1 yarışma');
    expect(gunlukTurMetni(_durum, '2026-10-13'), '1 tekrar');
    expect(gunlukTurMetni(_durum, '2026-10-01'), '');
  });
}
