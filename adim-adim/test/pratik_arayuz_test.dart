// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Filtreli tekrar + hatırlatma takvimi (özellik 79) ve Pratik merkezi
/// (özellik 44) arayüz testleri: girişler, geçici desteden SRS'in değişmemesi,
/// takvim satırları, eşleştirme (süre, ceza yok, en iyi süre), artan zorluk
/// turu, kelime kartları ve boş durum; hepsi 480x600 ölçek 1,5 taşmadan.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'pratik_test.dart' show pratikDers1, pratikKurs;

const _bugun = '2026-10-15';

OgrenciDurumu _ogrenci() {
  // #1: bugün yanlış (hata defteri + kart yarın), #2: 2 gün sonra vadeli.
  final d = Motor.kartIsle(
    const OgrenciDurumu(alan: 'dil', tamamlanan: {pratikDers1: 1}),
    '$pratikDers1#1',
    false,
    _bugun,
  );
  return d.copyWith(
    kartlar: {
      ...d.kartlar,
      '$pratikDers1#2': const Kart(kutu: 1, sonraki: '2026-10-17'),
    },
  );
}

Future<ProviderContainer> _ac(
  WidgetTester tester, {
  OgrenciDurumu? durum,
  BellekDepo? depo,
}) => uygulamayiAc(
  tester,
  depo ?? BellekDepo(durum ?? _ogrenci()),
  kurslar: [pratikKurs],
  boyut: const Size(480, 600),
  metinOlcegi: 1.5,
);

/// Sayaç (periyodik zamanlayıcı) çalışırken pumpAndSettle kullanılamaz.
Future<void> _tikla(WidgetTester tester, Finder f) async {
  await tester.ensureVisible(f);
  await tester.tap(f);
  await tester.pump(const Duration(milliseconds: 400));
}

Future<void> _git(
  WidgetTester tester,
  ProviderContainer kap,
  String yol,
) async {
  kap.read(yonlendiriciProvider).push(yol);
  await tester.pump(); // rota kurulur
  await tester.pump(const Duration(seconds: 1)); // geçiş biter
}

Future<void> _sekme(WidgetTester tester, String ad) => dokun(
  tester,
  find.descendant(of: find.byType(NavigationBar), matching: find.text(ad)),
);

void main() {
  testWidgets(
    'Tekrar sekmesinden filtreli tekrar: takvim ve 4 filtre, taşma yok',
    (tester) async {
      await _ac(tester);
      await _sekme(tester, 'Tekrar');
      await dokun(tester, find.byKey(const ValueKey('filtreli-tekrar-ac')));
      expect(find.text('Filtreli tekrar'), findsOneWidget);
      for (final ad in [
        'Son 7 gün yanlışlar',
        'Yalnız fiiller',
        'Zayıf kartlar',
        'Bir kursa ait',
      ]) {
        await tester.ensureVisible(find.text(ad));
        expect(find.text(ad), findsOneWidget);
      }
      expect(
        find.textContaining('kart aralıklarını değiştirmez'),
        findsOneWidget,
      );
      await tester.ensureVisible(find.text('Hatırlatma takvimi'));
      await tester.ensureVisible(find.text('Yarın'));
      expect(find.text('Bugün'), findsOneWidget);
      expect(
        find.text('Önümüzdeki 14 günde 2 tekrar bekliyor.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('geçici deste SRS ve hata defterini değiştirmez', (tester) async {
    final kap = await _ac(tester);
    await _git(tester, kap, '/tekrar-filtre');
    await tester.pumpAndSettle();
    final once = kap.read(durumProvider).value!.toJson().toString();

    await dokun(tester, find.byKey(const ValueKey('filtre-sonYediGunYanlis')));
    expect(find.text('2 + 2?'), findsOneWidget);
    await dokun(tester, find.text('4'));
    await dokun(tester, find.text('Kontrol et'));
    await dokun(tester, find.text('Bitir'));
    expect(find.text('Geçici deste bitti'), findsOneWidget);
    expect(tester.takeException(), isNull);

    expect(kap.read(durumProvider).value!.toJson().toString(), once);
    await dokun(tester, find.text('Tamam'));
    expect(find.text('Hatırlatma takvimi'), findsOneWidget);
  });

  testWidgets('boş filtrede Başla kapalı', (tester) async {
    final kap = await _ac(
      tester,
      durum: const OgrenciDurumu(alan: 'dil', tamamlanan: {pratikDers1: 1}),
    );
    await _git(tester, kap, '/tekrar-filtre');
    await tester.pumpAndSettle();
    final dugme = tester.widget<FilledButton>(
      find.byKey(const ValueKey('filtre-sonYediGunYanlis')),
    );
    expect(dugme.onPressed, isNull);
    expect(
      find.text('Önümüzdeki 14 günde bekleyen tekrar yok.'),
      findsOneWidget,
    );
  });

  testWidgets('Profil ve Tekrar girişleri Pratik merkezini açar, taşma yok', (
    tester,
  ) async {
    await _ac(tester);
    await _sekme(tester, 'Profil');
    await dokun(tester, find.byKey(const ValueKey('profil-pratik-merkezi')));
    expect(find.text('Pratik merkezi'), findsOneWidget);
    for (final ad in [
      'Hatalarım',
      'Zamana karşı eşleştirme',
      'Artan zorluk turu',
      'Kelime kartları',
    ]) {
      await tester.ensureVisible(find.text(ad));
      expect(find.text(ad), findsOneWidget);
    }
    expect(find.text('Hata defterinde 1 kayıt'), findsOneWidget);
    expect(find.text('9 kelime hazır'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await dokun(tester, find.byKey(const ValueKey('pratik-hatalarim')));
    expect(find.text('Hata defteri'), findsOneWidget);

    await dokun(tester, find.byKey(const ValueKey('pratik-merkezi-ac')));
    expect(find.text('Pratik merkezi'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('eşleştirme: yanlış ceza yok, bitince süre ve en iyi süre', (
    tester,
  ) async {
    final depo = BellekDepo(_ogrenci());
    final kap = await _ac(tester, depo: depo);
    await _git(tester, kap, '/pratik/eslestirme');
    expect(find.byKey(const ValueKey('eslestirme-sure')), findsOneWidget);
    expect(find.byKey(const ValueKey('esl-sol-7')), findsOneWidget); // 8 çift

    // Yanlış eşleşme: yalnız bilgi satırı, çözülmemiş kalır.
    await _tikla(tester, find.byKey(const ValueKey('esl-sol-0')));
    await _tikla(tester, find.byKey(const ValueKey('esl-sag-1')));
    expect(find.text('Olmadı, tekrar dene. Ceza yok.'), findsOneWidget);
    expect(find.byIcon(Icons.check), findsNothing);

    await tester.pump(const Duration(seconds: 3));
    for (var i = 0; i < 8; i++) {
      await _tikla(tester, find.byKey(ValueKey('esl-sol-$i')));
      await _tikla(tester, find.byKey(ValueKey('esl-sag-$i')));
    }
    expect(find.textContaining('Süren: '), findsOneWidget);
    expect(find.text('Yeni en iyi süre!'), findsOneWidget);
    await tester.pump();
    final ilk = (await depo.yukle()).eslestirmeEnIyiMs;
    expect(ilk, isNotNull);
    expect(ilk, greaterThanOrEqualTo(3000));
    // Kartlar ve hata defteri değişmedi.
    final d = kap.read(durumProvider).value!;
    expect(d.hatalar, hasLength(1));
    expect(d.kartlar.keys, contains('$pratikDers1#1'));
    expect(tester.takeException(), isNull);

    // Daha hızlı ikinci oyun yeni en iyi olur.
    await _tikla(tester, find.byKey(const ValueKey('eslestirme-tekrar')));
    await tester.pump(const Duration(milliseconds: 500));
    for (var i = 0; i < 8; i++) {
      await _tikla(tester, find.byKey(ValueKey('esl-sol-$i')));
      await _tikla(tester, find.byKey(ValueKey('esl-sag-$i')));
    }
    expect(find.text('Yeni en iyi süre!'), findsOneWidget);
    expect((await depo.yukle()).eslestirmeEnIyiMs, lessThan(ilk!));
    expect(tester.takeException(), isNull);
  });

  testWidgets('artan zorluk turu: dağılım gösterilir, tur SRS\'i değiştirmez', (
    tester,
  ) async {
    final kap = await _ac(tester);
    await _git(tester, kap, '/pratik/tur');
    await tester.pumpAndSettle();
    expect(find.text('Kolaydan zora 6 alıştırma'), findsOneWidget);
    expect(find.byKey(const ValueKey('tur-dagilim')), findsOneWidget);
    final once = kap.read(durumProvider).value!.toJson().toString();
    await dokun(tester, find.byKey(const ValueKey('tur-basla')));
    expect(find.text('Kontrol et'), findsOneWidget);
    expect(tester.takeException(), isNull);
    expect(kap.read(durumProvider).value!.toJson().toString(), once);
  });

  testWidgets('kelime kartları: çevir, sonraki, önceki', (tester) async {
    final kap = await _ac(tester);
    await _git(tester, kap, '/pratik/kartlar');
    await tester.pumpAndSettle();
    expect(find.text('1 / 9'), findsOneWidget);
    expect(find.text('Kelime'), findsOneWidget);
    expect(
      tester
          .widget<OutlinedButton>(find.byKey(const ValueKey('kart-onceki')))
          .onPressed,
      isNull,
    );
    await dokun(tester, find.byKey(const ValueKey('kart-cevir')));
    expect(find.text('Anlam'), findsOneWidget);
    await dokun(tester, find.byKey(const ValueKey('kart-sonraki')));
    expect(find.text('2 / 9'), findsOneWidget);
    expect(find.text('Kelime'), findsOneWidget); // yeni kart yüz üstü
    await dokun(tester, find.byKey(const ValueKey('kart-onceki')));
    expect(find.text('1 / 9'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ders çözülmediyse etkinlikler boş durum gösterir', (
    tester,
  ) async {
    final kap = await _ac(tester, durum: const OgrenciDurumu(alan: 'dil'));
    for (final yol in ['/pratik/eslestirme', '/pratik/kartlar']) {
      await _git(tester, kap, yol);
      await tester.pumpAndSettle();
      expect(
        find.text('Önce birkaç ders çöz; kelimelerin burada toplanır.'),
        findsOneWidget,
      );
      kap.read(yonlendiriciProvider).pop();
      await tester.pumpAndSettle();
    }
    expect(tester.takeException(), isNull);
  });
}
