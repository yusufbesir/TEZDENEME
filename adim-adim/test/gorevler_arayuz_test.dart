// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// 5 sekmeli gezinme (Yol, Pratik, Yarışma, Görevler, Profil), ortak üst
/// çubuk, Görevler ve Başarımlar ekranları ile Tekrar'a Pratik'ten erişim
/// arayüz testleri.
library;

import 'package:adim_adim/bilesenler/hedef_halkasi.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

const _bugun = '2026-10-15';

Finder _sekme(String ad) {
  final rail = find.byType(NavigationRail);
  final kap = rail.evaluate().isNotEmpty ? rail : find.byType(NavigationBar);
  return find.descendant(of: kap, matching: find.text(ad));
}

OgrenciDurumu _dersli() =>
    Motor.dersBitir(const OgrenciDurumu(alan: 'dil'), sahteDers1, 5, 5, _bugun);

void main() {
  testWidgets('5 sekme sırayla görünür; Tekrar sekmesi yok', (tester) async {
    await uygulamayiAc(tester, null);
    final etiketler = tester
        .widgetList<NavigationDestination>(find.byType(NavigationDestination))
        .map((d) => d.label)
        .toList();
    expect(etiketler, ['Yol', 'Pratik', 'Yarışma', 'Görevler', 'Profil']);
    expect(_sekme('Tekrar'), findsNothing);
  });

  for (final boyut in const [Size(700, 800), Size(1280, 800)]) {
    testWidgets('rail 5 hedef gösterir: ${boyut.width.toInt()} px', (
      tester,
    ) async {
      await uygulamayiAc(tester, null, boyut: boyut);
      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.destinations, hasLength(5));
      expect(find.byType(NavigationBar), findsNothing);
      await dokun(tester, _sekme('Görevler'));
      expect(find.text('Bugünün görevleri'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('bekleyen tekrar rozeti Pratik sekmesindedir', (tester) async {
    const gecmis = Kart(kutu: 1, sonraki: '2026-10-14');
    await uygulamayiAc(
      tester,
      BellekDepo(
        const OgrenciDurumu(
          alan: 'dil',
          kartlar: {'$sahteDers1#0': gecmis, '$sahteDers1#1': gecmis},
        ),
      ),
    );
    final rozet = find.byType(Badge);
    expect(rozet, findsOneWidget);
    final hedef = find.ancestor(
      of: rozet,
      matching: find.byType(NavigationDestination),
    );
    expect(tester.widget<NavigationDestination>(hedef).label, 'Pratik');
    expect(
      find.descendant(of: rozet, matching: find.text('2')),
      findsOneWidget,
    );
  });

  testWidgets('ortak üst çubuk Yol, Pratik, Görevler, Profil üstünde; '
      'Yarışma kendi düzenini korur', (tester) async {
    await uygulamayiAc(tester, BellekDepo(_dersli().copyWith(ad: 'Yusuf')));
    final cubuk = find.byKey(const ValueKey('ust-cubuk'));
    for (final ad in ['Yol', 'Pratik', 'Görevler', 'Profil']) {
      await dokun(tester, _sekme(ad));
      expect(cubuk, findsOneWidget, reason: ad);
      // Alan adı, seri ve günlük XP halkası.
      expect(
        find.descendant(of: cubuk, matching: find.text('İngilizce')),
        findsOneWidget,
        reason: ad,
      );
      expect(
        find.descendant(
          of: cubuk,
          matching: find.byIcon(Icons.local_fire_department),
        ),
        findsOneWidget,
        reason: ad,
      );
      final halka = tester.widget<HedefHalkasi>(
        find.descendant(of: cubuk, matching: find.byType(HedefHalkasi)),
      );
      expect((halka.xp, halka.hedef), (25, 30), reason: ad);
    }
    await dokun(tester, _sekme('Yarışma'));
    expect(cubuk, findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Pratik sekmesinden Tekrar ekranı açılır ve geri döner', (
    tester,
  ) async {
    await uygulamayiAc(tester, null);
    await tekrarEkraniniAc(tester);
    expect(find.text('Bugün tekrar yok'), findsOneWidget);
    expect(find.byKey(const ValueKey('pratik-merkezi-ac')), findsOneWidget);
    await dokun(tester, find.byTooltip('Geri'));
    expect(find.text('Pratik merkezi'), findsOneWidget);
    expect(find.byKey(const ValueKey('pratik-tekrar')), findsOneWidget);
  });

  group('Görevler ekranı', () {
    testWidgets('bugünün ve haftalık görevleri ilerlemeyle listeler', (
      tester,
    ) async {
      await uygulamayiAc(tester, BellekDepo(_dersli()));
      await dokun(tester, _sekme('Görevler'));
      expect(find.text('Görevler'), findsWidgets);
      expect(find.text('Bugünün görevleri'), findsOneWidget);
      expect(find.text('Haftalık görevler'), findsOneWidget);
      expect(find.text('Bir ders bitir'), findsOneWidget);
      expect(find.text('30 XP kazan'), findsOneWidget);
      expect(find.text('Mikro ders yap'), findsOneWidget);
      expect(find.text('Günün bilmecesini çöz'), findsOneWidget);
      expect(find.text('Haftada 5 gün çalış'), findsOneWidget);
      expect(find.text('Bu hafta 1/5 gün'), findsOneWidget);
      // Ders görevi tamam (1/1), XP görevi 25/30.
      expect(
        tester
            .widget<LinearProgressIndicator>(
              find.byKey(const ValueKey('gorev-cubuk-ders')),
            )
            .value,
        1.0,
      );
      expect(find.text('25/30'), findsWidgets);
      // Bekleyen kart yoksa tekrar görevi gizli.
      expect(find.text('Tekrar kartlarını bitir'), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('bekleyen kart varsa tekrar görevi görünür', (tester) async {
      await uygulamayiAc(
        tester,
        BellekDepo(
          const OgrenciDurumu(
            alan: 'dil',
            kartlar: {'$sahteDers1#0': Kart(kutu: 1, sonraki: '2026-10-14')},
          ),
        ),
      );
      await dokun(tester, _sekme('Görevler'));
      expect(find.text('Tekrar kartlarını bitir'), findsOneWidget);
      expect(find.text('1 kart seni bekliyor.'), findsOneWidget);
    });

    testWidgets('tamamlanan görevin ödülü bir kez alınır ve kaydedilir', (
      tester,
    ) async {
      final depo = BellekDepo(_dersli());
      final kap = await uygulamayiAc(tester, depo);
      await dokun(tester, _sekme('Görevler'));
      final onceXp = kap.read(durumProvider).value!.xp;

      final odul = find.byKey(const ValueKey('gorev-odul-ders'));
      expect(odul, findsOneWidget);
      // Tamamlanmayan görevde ödül düğmesi yok.
      expect(find.byKey(const ValueKey('gorev-odul-xp')), findsNothing);
      await dokun(tester, odul);

      final d = kap.read(durumProvider).value!;
      expect(d.xp, onceXp + 10);
      expect(d.gunlukXp[_bugun], 25); // günlük XP ödülden etkilenmez
      expect(find.text('+10 XP kazandın'), findsOneWidget);
      expect(find.byKey(const ValueKey('gorev-odul-ders')), findsNothing);
      expect(find.byKey(const ValueKey('gorev-alindi-ders')), findsOneWidget);
      final kayitli = await depo.yukle();
      expect(kayitli.alinanGorevler, contains('g:$_bugun|ders'));
      expect(kayitli.xp, onceXp + 10);
    });

    testWidgets('tamamlanmamış görevde Başla düğmesi ilgili ekrana götürür', (
      tester,
    ) async {
      await uygulamayiAc(tester, null);
      await dokun(tester, _sekme('Görevler'));
      await dokun(tester, find.byKey(const ValueKey('gorev-git-mikro')));
      // Alıştırması olan sahte kursla mikro ders açılır.
      expect(find.byKey(const ValueKey('gorev-git-mikro')), findsNothing);
      expect(tester.takeException(), isNull);
    });
  });

  group('Başarımlar ekranı', () {
    testWidgets('Görevler ekranından açılır; kazanıldı ve kilitli görünür', (
      tester,
    ) async {
      final depo = BellekDepo(_dersli());
      final kap = await uygulamayiAc(tester, depo);
      await dokun(tester, _sekme('Görevler'));
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('gorevler-basarimlar')),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('2/20 rozet'), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('gorevler-basarimlar')));

      expect(find.text('Başarımlar'), findsOneWidget); // AppBar başlığı
      expect(find.byKey(const ValueKey('basarim-ozet')), findsOneWidget);
      expect(find.text('2/20 rozet'), findsOneWidget);
      // İlk ders ve tam puan kazanıldı; seri 30 kilitli.
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('rozet-ilk_ders')),
          matching: find.text('Kazanıldı'),
        ),
        findsOneWidget,
      );
      await tester.ensureVisible(find.byKey(const ValueKey('rozet-seri_30')));
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('rozet-seri_30')),
          matching: find.text('1/30'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('rozet-seri_30')),
          matching: find.byIcon(Icons.lock_outline),
        ),
        findsOneWidget,
      );
      // Ekran açılınca kazanılan rozetler kalıcı kayda yazılır.
      await tester.pumpAndSettle();
      expect(kap.read(durumProvider).value!.rozetler, contains('ilk_ders'));
      expect((await depo.yukle()).rozetler, contains('tam_puan'));
      expect(tester.takeException(), isNull);

      await dokun(tester, find.byTooltip('Geri'));
      expect(find.byKey(const ValueKey('gorevler-basarimlar')), findsOneWidget);
    });

    testWidgets('Profil satırından açılır', (tester) async {
      await uygulamayiAc(tester, BellekDepo(_dersli()));
      await dokun(tester, _sekme('Profil'));
      await tester.ensureVisible(
        find.byKey(const ValueKey('profil-basarimlar')),
      );
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('profil-basarimlar')),
          matching: find.text('2/20 rozet'),
        ),
        findsOneWidget,
      );
      await dokun(tester, find.byKey(const ValueKey('profil-basarimlar')));
      expect(find.byKey(const ValueKey('basarim-ozet')), findsOneWidget);
      expect(find.byKey(const ValueKey('rozet-ilk_ders')), findsOneWidget);
    });
  });
}
