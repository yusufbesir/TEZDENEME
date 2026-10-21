/// Esnek yerleşim testleri: pencere boyutu ve metin ölçeği matrisinde ekranlar
/// taşmadan çizilir; kırılma noktalarına göre alt çubuk / rail / yan panel.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden kod
/// değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Matris: 480x600, 700x600, 900x700, 1280x720, 1600x900 × metin ölçeği 1,0
/// ve 1,5 (uygulama 1,3'e kıstırır). Taşma = RenderFlex overflow hatası.
library;

import 'package:adim_adim/bilesenler/hedef_halkasi.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:adim_adim/yarisma/depo.dart';
import 'package:adim_adim/yarisma/ekranlar/oyun_ekrani.dart';
import 'package:adim_adim/yarisma/motor.dart';
import 'package:adim_adim/yarisma/saglayicilar.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

const _boyutlar = <Size>[
  Size(480, 600),
  Size(700, 600),
  Size(900, 700),
  Size(1280, 720),
  Size(1600, 900),
];
const _olcekler = <double>[1.0, 1.5];

OgrenciDurumu _durum() => const OgrenciDurumu(
  alan: 'dil',
  ad: 'Yusuf',
  xp: 12345,
  seri: 120,
  enSeri: 365,
  sonGun: '2026-10-15',
  gunlukHedef: 200,
  gunlukXp: {'2026-10-15': 150, '2026-10-14': 90},
  tamamlanan: {sahteDers1: 2},
  kartlar: {
    '$sahteDers1#0': Kart(kutu: 1, sonraki: '2026-10-14'),
    '$sahteDers1#1': Kart(kutu: 1, sonraki: '2026-10-14'),
  },
);

/// Çalışırken biriken hatalardan taşma olanları ayıklar.
Future<void> _tasmaYok(WidgetTester tester, String nerede) async {
  final hata = tester.takeException();
  expect(hata, isNull, reason: '$nerede: $hata');
}

Finder _sekme(WidgetTester tester, String ad) {
  final rail = find.byType(NavigationRail);
  final kap = rail.evaluate().isNotEmpty ? rail : find.byType(NavigationBar);
  return find.descendant(of: kap, matching: find.text(ad));
}

/// Oyun ekranını tohumlu motorla, kök Navigator olmadan doğrudan açar.
Future<void> _oyunAc(WidgetTester tester, Size boyut, double olcek) async {
  tester.view.physicalSize = boyut;
  tester.view.devicePixelRatio = 1;
  tester.platformDispatcher.textScaleFactorTestValue = olcek;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        depoProvider.overrideWithValue(BellekDepo(_durum())),
        yarismaDepoProvider.overrideWithValue(BellekYarismaDepo()),
        kurslarProvider.overrideWithValue([sahteKurs, sahteKodKurs]),
        bugunProvider.overrideWithValue('2026-10-15'),
        bildirimProvider.overrideWithValue(SahteBildirim()),
      ],
      child: MaterialApp(
        theme: acikTema(),
        builder: (context, child) {
          final m = MediaQuery.of(context);
          final o = m.textScaler
              .scale(1.0)
              .clamp(Olcu.metinOlcekEn, Olcu.metinOlcekEnCok)
              .toDouble();
          return MediaQuery(
            data: m.copyWith(
              textScaler: TextScaler.linear(o),
              disableAnimations: true,
            ),
            child: child!,
          );
        },
        home: YarismaOyunEkrani(
          alan: 'dil',
          kursId: 'ingilizce-1',
          motor: YarismaMotoru(tohum: 1),
        ),
      ),
    ),
  );
  final kap = ProviderScope.containerOf(tester.element(find.byType(Scaffold)));
  await kap.read(durumProvider.future);
  await tester.pumpAndSettle();
}

/// Ekrandaki tüm metin nesnelerinin etkin yazı boyutunun (textScaler dahil)
/// en küçüğünü döndürür; boş metinler sayılmaz.
double _enKucukYazi(WidgetTester tester) {
  var en = double.infinity;
  void gez(RenderObject r) {
    if (r is RenderParagraph) {
      final metin = r.text.toPlainText(includeSemanticsLabels: false).trim();
      final boyut = r.text.style?.fontSize;
      if (metin.isNotEmpty && boyut != null) {
        final etkin = r.textScaler.scale(boyut);
        if (etkin < en) en = etkin;
      }
    }
    r.visitChildren(gez);
  }

  gez(tester.binding.rootElement!.renderObject!);
  return en;
}

OgrenciDurumu _ucDurum() => OgrenciDurumu(
  alan: 'dil',
  ad: 'Çok uzun bir öğrenci adı soyadı Yusuf Beşir Yılmazoğlu Karadeniz',
  xp: 1234,
  seri: 1234,
  enSeri: 1234,
  sonGun: '2026-10-15',
  gunlukHedef: 200,
  gunlukXp: const {'2026-10-15': 1234, '2026-10-14': 9876},
  tamamlanan: const {sahteDers1: 2},
);

void main() {
  group('uç veri: yazı 11 px altına inmez, taşma yok', () {
    for (final boyut in const [Size(480, 600), Size(1280, 720)]) {
      testWidgets('4 haneli XP, uzun ad: ${boyut.width.toInt()} ölçek 1.5', (
        tester,
      ) async {
        await uygulamayiAc(
          tester,
          BellekDepo(_ucDurum()),
          kurslar: [sahteKurs, sahteKodKurs],
          boyut: boyut,
          metinOlcegi: 1.5,
        );
        for (final sekme in ['Yol', 'Yarışma', 'Tekrar', 'Profil']) {
          await dokun(tester, _sekme(tester, sekme));
          await _tasmaYok(tester, sekme);
          expect(
            _enKucukYazi(tester),
            greaterThanOrEqualTo(11),
            reason: '$sekme: etkin yazı 11 px altına indi',
          );
          expect(
            find.descendant(
              of: find.byType(FittedBox),
              matching: find.byType(Text),
            ),
            findsNothing,
            reason: '$sekme: FittedBox içinde metin var',
          );
        }
      });
    }

    testWidgets('HedefHalkasi 4 haneli XP kısaltır, 11 px altına inmez', (
      tester,
    ) async {
      tester.platformDispatcher.textScaleFactorTestValue = 1.3;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      for (final b in [56.0, 96.0]) {
        await tester.pumpWidget(
          MaterialApp(
            theme: acikTema(),
            home: Scaffold(
              body: Center(child: HedefHalkasi(xp: 1234, hedef: 200, boyut: b)),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await _tasmaYok(tester, 'halka $b');
        expect(_enKucukYazi(tester), greaterThanOrEqualTo(11));
      }
    });

    test('kisaSayi', () {
      expect(kisaSayi(999), '999');
      expect(kisaSayi(1234), '1,2k');
      expect(kisaSayi(2000), '2k');
      expect(kisaSayi(12345), '12,3k');
    });
  });

  group('taşma yok: boyut x metin ölçeği', () {
    for (final boyut in _boyutlar) {
      for (final olcek in _olcekler) {
        final ad =
            '${boyut.width.toInt()}x${boyut.height.toInt()} '
            'ölçek $olcek';
        testWidgets('Yol, Yarışma, Tekrar, Profil: $ad', (tester) async {
          await uygulamayiAc(
            tester,
            BellekDepo(_durum()),
            kurslar: [sahteKurs, sahteKodKurs],
            boyut: boyut,
            metinOlcegi: olcek,
          );
          await _tasmaYok(tester, 'Yol $ad');
          for (final sekme in ['Yarışma', 'Tekrar', 'Profil', 'Yol']) {
            await dokun(tester, _sekme(tester, sekme));
            await _tasmaYok(tester, '$sekme $ad');
          }
        });

        testWidgets('Yarışma oyun ekranı: $ad', (tester) async {
          await _oyunAc(tester, boyut, olcek);
          await _tasmaYok(tester, 'çark $ad');
          expect(find.text('Çevir'), findsOneWidget);
          await tester.tap(find.text('Çevir'));
          await tester.pumpAndSettle();
          await _tasmaYok(tester, 'çark sonrası $ad');
          if (find.text('Taç sorusu! Kategori seç').evaluate().isNotEmpty) {
            await _tasmaYok(tester, 'taç seçimi $ad');
            final dugmeler = find.byWidgetPredicate(
              (w) =>
                  w.key is ValueKey<String> &&
                  (w.key! as ValueKey<String>).value.startsWith('tac-'),
            );
            expect(dugmeler, findsWidgets);
            await tester.tap(dugmeler.first);
            await tester.pumpAndSettle();
          }
          await _tasmaYok(tester, 'soru $ad');
          final sik = find.byKey(const ValueKey('sik-0'));
          if (sik.evaluate().isNotEmpty) {
            await tester.ensureVisible(sik);
            await tester.tap(sik);
            await tester.pumpAndSettle();
            await _tasmaYok(tester, 'geri bildirim $ad');
          }
        });
      }
    }
  });

  group('kırılma noktaları', () {
    testWidgets('dar (480): alt gezinme çubuğu, rail yok', (tester) async {
      await uygulamayiAc(tester, null, boyut: const Size(480, 600));
      expect(find.byType(NavigationBar), findsOneWidget);
      expect(find.byType(NavigationRail), findsNothing);
    });

    testWidgets('orta (700): daraltılmış rail, alt çubuk yok, tek sütun', (
      tester,
    ) async {
      await uygulamayiAc(tester, null, boyut: const Size(700, 600));
      expect(find.byType(NavigationBar), findsNothing);
      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.extended, isFalse);
      expect(find.byType(Scrollbar), findsNothing);
    });

    testWidgets('geniş (1280x720): genişletilmiş rail + yan panel', (
      tester,
    ) async {
      await uygulamayiAc(tester, null, boyut: const Size(1280, 720));
      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.extended, isTrue);
      final panel = find.byType(Scrollbar);
      expect(panel, findsOneWidget);
      expect(tester.widget<Scrollbar>(panel).thumbVisibility, isTrue);
      final w = tester.getSize(panel).width;
      expect(w, greaterThanOrEqualTo(Olcu.panelMin));
      expect(w, lessThanOrEqualTo(Olcu.panelMax));
      expect(find.text('Öğrenci'), findsWidgets);
    });

    testWidgets('geniş sınırda (900x700): panel en az 300 px ya da tek sütun', (
      tester,
    ) async {
      await uygulamayiAc(tester, null, boyut: const Size(900, 700));
      expect(
        tester.widget<NavigationRail>(find.byType(NavigationRail)).extended,
        isTrue,
      );
      final panel = find.byType(Scrollbar);
      if (panel.evaluate().isNotEmpty) {
        expect(
          tester.getSize(panel).width,
          greaterThanOrEqualTo(Olcu.panelMin),
        );
      }
    });

    testWidgets('metin ölçeği 1,3 ile sınırlanır, 1,0 altına inmez', (
      tester,
    ) async {
      await uygulamayiAc(tester, null, metinOlcegi: 3.0);
      final ust = tester.element(find.byType(Scaffold).first);
      expect(MediaQuery.textScalerOf(ust).scale(10), closeTo(13, 0.001));
      await uygulamayiAc(tester, null, metinOlcegi: 0.5);
      final alt = tester.element(find.byType(Scaffold).first);
      expect(MediaQuery.textScalerOf(alt).scale(10), closeTo(10, 0.001));
    });
  });
}
