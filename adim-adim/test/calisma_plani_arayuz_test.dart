/// Çalışma planı arayüzü: ana sayfada "Plan oluştur" çağrısı; plan kurma,
/// kartta bugünkü hedef/tahmini bitiş, düzenleme ve silme; Ayarlar bağlantısı.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

final _kart = find.byKey(const ValueKey('calisma-plani-karti'));

void main() {
  testWidgets('plan yok: çağrı; kur -> kart; düzenle; sil', (tester) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final kap = await uygulamayiAc(tester, depo);

    expect(_kart, findsOneWidget);
    expect(find.text('Plan oluştur'), findsOneWidget);

    await dokun(tester, find.byKey(const ValueKey('plan-olustur')));
    expect(find.text('Çalışma planı'), findsWidgets);
    // 2026-10-15 Perşembe; 20 dk = 5 ders/gün; sahte kurs 2 ders.
    await dokun(tester, find.byKey(const ValueKey('plan-dakika-20')));
    expect(find.textContaining('Günde 5 ders'), findsOneWidget);
    await dokun(tester, find.byKey(const ValueKey('plan-kaydet')));

    var plan = kap.read(durumProvider).value!.calismaPlani!;
    expect(plan.kursId, sahteKursId);
    expect(plan.gunlukDakika, 20);
    expect(plan.gunler, {1, 2, 3, 4, 5});
    expect(find.textContaining('Bugünkü hedef: 5 ders'), findsOneWidget);
    expect(find.textContaining('Tahmini bitiş: 15 Ekim 2026'), findsOneWidget);
    expect(find.textContaining('0 / 2 ders'), findsOneWidget);

    // Düzenle: yalnız Cumartesi seç -> bugün (Per) dinlenme günü.
    await dokun(tester, find.byKey(const ValueKey('plan-duzenle')));
    for (var g = 1; g <= 5; g++) {
      await dokun(tester, find.byKey(ValueKey('plan-gun-$g')));
    }
    await dokun(tester, find.byKey(const ValueKey('plan-gun-6')));
    await dokun(tester, find.byKey(const ValueKey('plan-kaydet')));
    plan = kap.read(durumProvider).value!.calismaPlani!;
    expect(plan.gunler, {6});
    expect(find.text('Bugün dinlenme günü'), findsOneWidget);
    expect(find.textContaining('Tahmini bitiş: 17 Ekim 2026'), findsOneWidget);

    // Sil.
    await dokun(tester, find.byKey(const ValueKey('plan-duzenle')));
    await dokun(tester, find.byKey(const ValueKey('plan-sil')));
    expect(kap.read(durumProvider).value!.calismaPlani, isNull);
    expect(find.text('Plan oluştur'), findsOneWidget);
  });

  testWidgets('hiç gün seçili değilse Kaydet kapalı', (tester) async {
    await uygulamayiAc(tester, null);
    await dokun(tester, find.byKey(const ValueKey('plan-olustur')));
    for (var g = 1; g <= 5; g++) {
      await dokun(tester, find.byKey(ValueKey('plan-gun-$g')));
    }
    final dugme = tester.widget<FilledButton>(
      find.byKey(const ValueKey('plan-kaydet')),
    );
    expect(dugme.onPressed, isNull);
  });

  testWidgets('Ayarlar: plan bağlantısı ve haftalık hedefi plana uydur', (
    tester,
  ) async {
    final depo = BellekDepo(
      const OgrenciDurumu(
        alan: 'dil',
        haftalikHedefGun: 5,
        calismaPlani: CalismaPlani(kursId: sahteKursId, gunler: {1, 3, 5, 6}),
      ),
    );
    final kap = await uygulamayiAc(tester, depo);
    await dokun(
      tester,
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('Profil'),
      ),
    );
    await dokun(tester, find.byTooltip('Ayarlar'));
    expect(find.byKey(const ValueKey('ayar-calisma-plani')), findsOneWidget);
    await dokun(tester, find.byKey(const ValueKey('ayar-plana-uydur')));
    final d = kap.read(durumProvider).value!;
    expect(d.haftalikHedefGun, 4);
    expect(d.calismaPlani!.gunler, {1, 3, 5, 6});
  });

  testWidgets('480x600 @1,5 ölçekte plan ekranı taşmaz', (tester) async {
    await uygulamayiAc(
      tester,
      null,
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('plan-olustur')),
      100,
      scrollable: find.byType(Scrollable).first,
    );
    await dokun(tester, find.byKey(const ValueKey('plan-olustur')));
    expect(tester.takeException(), isNull);
  });
}
