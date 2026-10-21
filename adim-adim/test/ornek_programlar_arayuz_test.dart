// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Örnek programlar arayüzü: kart yalnız kod alanında; liste, dil süzgeci,
/// detay ve kopyala düğmesi; dar ekranda büyük yazıyla taşma yok.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/icerik/ornek_programlar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

final _kart = find.byKey(const ValueKey('ornek-programlar-karti'));
Finder _satir(String id) => find.byKey(ValueKey('ornek-satir-$id'));

void main() {
  testWidgets('kart dil alanında yok, kod alanında var', (tester) async {
    await uygulamayiAc(tester, BellekDepo(const OgrenciDurumu(alan: 'dil')));
    expect(_kart, findsNothing);
  });

  testWidgets('kod alanı: kart -> liste -> süzgeç -> detay -> kopyala', (
    tester,
  ) async {
    String? pano;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'Clipboard.setData') {
          pano = (call.arguments as Map)['text'] as String?;
        }
        return null;
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'kod')),
      kurslar: [sahteKodKurs],
    );
    await dokun(tester, _kart);
    expect(find.text('Örnek programlar'), findsWidgets);
    expect(_satir('html-ornek-1'), findsOneWidget);

    await dokun(tester, find.byKey(const ValueKey('ornek-cip-css')));
    expect(_satir('html-ornek-1'), findsNothing);
    expect(_satir('css-ornek-1'), findsOneWidget);
    await dokun(tester, find.byKey(const ValueKey('ornek-cip-tumu')));
    expect(_satir('html-ornek-1'), findsOneWidget);

    await dokun(tester, _satir('css-ornek-1'));
    final o = ornekBul('css-ornek-1')!;
    expect(find.text(o.gruplar.first.not), findsOneWidget);
    await dokun(tester, find.byKey(const ValueKey('ornek-kopyala')));
    expect(pano, o.kod);
    expect(find.text('Kod kopyalandı.'), findsOneWidget);
  });

  testWidgets('480x600 @1,5 ölçekte liste ve detay taşmaz', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'kod')),
      kurslar: [sahteKodKurs],
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    await tester.ensureVisible(_kart);
    await tester.drag(find.byType(ListView).first, const Offset(0, -150));
    await tester.pumpAndSettle();
    await dokun(tester, _kart);
    expect(tester.takeException(), isNull);
    expect(find.text('Tümü'), findsOneWidget);
    await tester.scrollUntilVisible(
      _satir('html-ornek-4'),
      100,
      scrollable: find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await dokun(tester, _satir('html-ornek-4'));
    expect(tester.takeException(), isNull);
  });
}
