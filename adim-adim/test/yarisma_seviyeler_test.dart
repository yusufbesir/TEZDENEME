/// Yarışma yeni seviyeleri: alan seçici (kod ve dil) ile oyun ekranının SQL, PHP,
/// Go (seviye 1-3) ve İngilizce C1 için doğru listelediğini/açtığını, 360x640
/// ekranda ve 1,5 metin ölçeğinde taşma olmadan çalıştığını doğrular.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf
/// kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga14]
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/ekranlar/yarisma_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:adim_adim/yarisma/depo.dart';
import 'package:adim_adim/yarisma/ekranlar/oyun_ekrani.dart';
import 'package:adim_adim/yarisma/model.dart';
import 'package:adim_adim/yarisma/motor.dart';
import 'package:adim_adim/yarisma/saglayicilar.dart';
import 'package:adim_adim/yarisma/soru_bankasi.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

const _yeniKodSeviyeleri = [
  ('sql-1', 'SQL1'),
  ('sql-2', 'SQL2'),
  ('sql-3', 'SQL3'),
  ('php-1', 'PHP1'),
  ('php-2', 'PHP2'),
  ('php-3', 'PHP3'),
  ('go-1', 'Go1'),
  ('go-2', 'Go2'),
  ('go-3', 'Go3'),
];

/// 360x640 ekranda, verilen metin ölçeğiyle ekranı kurar.
Future<void> _kur(
  WidgetTester tester,
  Widget ekran, {
  required String alan,
  double olcek = 1.0,
}) async {
  tester.view.physicalSize = const Size(360, 640);
  tester.view.devicePixelRatio = 1;
  tester.platformDispatcher.textScaleFactorTestValue = olcek;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        depoProvider.overrideWithValue(BellekDepo(OgrenciDurumu(alan: alan))),
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
        home: Scaffold(body: ekran),
      ),
    ),
  );
  final kap = ProviderScope.containerOf(
    tester.element(find.byType(MaterialApp)),
  );
  await kap.read(durumProvider.future);
  await tester.pumpAndSettle();
}

/// Ekranda görünen soruyu soru bankasından bulur.
YarismaSorusu _gorunenSoru(String alan, String kurs) {
  final adaylar = sorulariBul(alan, kurs).where(
    (s) =>
        find.text(s.soru).evaluate().isNotEmpty &&
        find.text(s.secenekler[0]).evaluate().isNotEmpty,
  );
  expect(adaylar, isNotEmpty, reason: 'Ekrandaki soru $kurs bankasında yok');
  return adaylar.first;
}

/// Çark çevirir; taç dilimi gelirse ilk alınmamış kategoriyi seçer.
Future<void> _soruyaGel(WidgetTester tester) async {
  if (find.text('Taç sorusu! Kategori seç').evaluate().isEmpty) {
    await tester.tap(find.text('Çevir'));
    await tester.pumpAndSettle();
  }
  if (find.text('Taç sorusu! Kategori seç').evaluate().isNotEmpty) {
    for (final k in YarismaKategori.values) {
      final f = find.byKey(ValueKey('tac-${k.kimlik}'));
      if (f.evaluate().isEmpty) continue;
      if (tester.widget<InkWell>(f).onTap == null) continue;
      await tester.tap(f);
      await tester.pumpAndSettle();
      break;
    }
  }
}

void main() {
  group('seviye listeleri', () {
    test('kod alanı 12 seviye: HTML, CSS, JS ve SQL/PHP/Go 1-3', () {
      final kod = seviyeler('kod');
      expect(kod.length, 12);
      expect(kod.take(3).map((s) => s.etiket), ['HTML', 'CSS', 'JS']);
      expect(kod.skip(3).map((s) => (s.kursId, s.etiket)), _yeniKodSeviyeleri);
      expect(kod.map((s) => s.kursId).toSet().length, 12);
      expect(kod.map((s) => s.etiket).toSet().length, 12);
    });

    test('dil alanı C1 ile biter', () {
      final dil = seviyeler('dil');
      expect(dil.last.kursId, 'ingilizce-5');
      expect(dil.last.etiket, 'C1');
    });

    test('her yeni seviye oynanabilir: 24 soru, motor başlar', () {
      for (final (kurs, etiket) in _yeniKodSeviyeleri) {
        final liste = sorulariBul('kod', kurs);
        expect(liste.length, 24, reason: '$kurs ($etiket)');
        expect(() => YarismaMotoru(tohum: 7).basla(liste), returnsNormally);
      }
      expect(sorulariBul('dil', 'ingilizce-5').length, 36);
    });

    test('yeni seviyelerde soru metinleri benzersiz ve şıklar farklı', () {
      final metinler = <String>{};
      for (final (kurs, _) in _yeniKodSeviyeleri) {
        for (final s in sorulariBul('kod', kurs)) {
          expect(metinler.add(s.soru), isTrue, reason: s.id);
          expect(s.secenekler.toSet().length, 4, reason: s.id);
        }
      }
    });
  });

  group('alan seçici (lobi)', () {
    for (final olcek in [1.0, 1.5]) {
      testWidgets(
        'kod alanı, 360x640, ölçek $olcek: tüm seviyeler listelenir',
        (tester) async {
          await _kur(tester, const YarismaEkrani(), alan: 'kod', olcek: olcek);
          for (final e in ['HTML', 'CSS', 'JS']) {
            expect(find.text(e), findsOneWidget);
          }
          for (final (_, etiket) in _yeniKodSeviyeleri) {
            expect(find.text(etiket), findsOneWidget, reason: etiket);
          }
          expect(find.text('A1'), findsNothing);
          expect(find.text('Oyna'), findsOneWidget);
          expect(tester.takeException(), isNull);
        },
      );
    }

    testWidgets('kod alanı: SQL3 seçilip Oyna ile sql-3 sorusu açılır', (
      tester,
    ) async {
      await _kur(tester, const YarismaEkrani(), alan: 'kod', olcek: 1.5);
      await tester.ensureVisible(find.text('SQL3'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('SQL3'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Oyna'));
      await tester.pumpAndSettle();
      await _soruyaGel(tester);
      final s = _gorunenSoru('kod', 'sql-3');
      expect(s.seviyeKursId, 'sql-3');
      expect(tester.takeException(), isNull);
    });

    testWidgets('dil alanı, 360x640, ölçek 1,5: C1 listelenir ve açılır', (
      tester,
    ) async {
      await _kur(tester, const YarismaEkrani(), alan: 'dil', olcek: 1.5);
      for (final e in ['A1', 'A2', 'B1', 'B2', 'C1']) {
        expect(find.text(e), findsOneWidget, reason: e);
      }
      await tester.ensureVisible(find.text('C1'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('C1'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Oyna'));
      await tester.pumpAndSettle();
      await _soruyaGel(tester);
      final s = _gorunenSoru('dil', 'ingilizce-5');
      expect(s.seviyeKursId, 'ingilizce-5');
      expect(tester.takeException(), isNull);
    });
  });

  group('oyun ekranı (360x640, ölçek 1,5)', () {
    for (final kurs in ['sql-2', 'sql-3', 'php-2', 'php-3', 'go-2', 'go-3']) {
      testWidgets(
        '$kurs: sorular taşmadan görünür, doğru şık açıklama gösterir',
        (tester) async {
          await _kur(
            tester,
            YarismaOyunEkrani(
              alan: 'kod',
              kursId: kurs,
              motor: YarismaMotoru(tohum: 3),
            ),
            alan: 'kod',
            olcek: 1.5,
          );
          for (var i = 0; i < 6; i++) {
            await _soruyaGel(tester);
            final s = _gorunenSoru('kod', kurs);
            final sik = find.byKey(ValueKey('sik-${s.dogru}'));
            await tester.ensureVisible(sik);
            await tester.pumpAndSettle();
            await tester.tap(sik);
            await tester.pumpAndSettle();
            expect(find.text(s.aciklama), findsOneWidget, reason: s.id);
            expect(tester.takeException(), isNull, reason: s.id);
            await tester.ensureVisible(find.text('Devam'));
            await tester.pumpAndSettle();
            await tester.tap(find.text('Devam'));
            await tester.pumpAndSettle();
          }
        },
      );
    }
  });
}
