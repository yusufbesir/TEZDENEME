// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna. Yazan: [Claude#eslestirme-renk]

/// Eşleştirme: eşleşen çift renkli öbek (renk + numara + simge) ve 480x600
/// @1,5 ölçekte taşma yok.
library;

import 'package:adim_adim/bilesenler/alistirma/eslestir.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _es = Eslestir(
  soru: 'Eşleştir',
  ciftler: [
    (sol: 'dog', sag: 'köpek'),
    (sol: 'cat', sag: 'kedi'),
    (sol: 'bird', sag: 'kuş'),
  ],
);

Widget _sarmal(Widget cocuk, {bool koyu = false}) => MaterialApp(
  theme: koyu ? koyuTema() : acikTema(),
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(
      context,
    ).copyWith(textScaler: const TextScaler.linear(1.5)),
    child: child!,
  ),
  home: Scaffold(body: SingleChildScrollView(child: cocuk)),
);

void _kucukEkran(WidgetTester tester) {
  tester.view.physicalSize = const Size(480, 600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

void main() {
  test('eslesmeRengi: numaraya göre döngülü, çiftler ayrışır', () {
    expect(eslesmeRengi(1), eslesmeRenkleri[0]);
    expect(eslesmeRengi(eslesmeRenkleri.length + 1), eslesmeRenkleri[0]);
    expect(eslesmeRengi(1), isNot(eslesmeRengi(2)));
    expect({
      for (var i = 1; i <= eslesmeRenkleri.length; i++) eslesmeRengi(i),
    }, hasLength(eslesmeRenkleri.length));
  });

  for (final koyu in [false, true]) {
    testWidgets('eşleşen çift aynı renk + numara + simge (koyu=$koyu)', (
      tester,
    ) async {
      _kucukEkran(tester);
      Object? cevap = 'x';
      await tester.pumpWidget(
        _sarmal(
          EslestirGorunumu(
            alistirma: _es,
            kontrolEdildi: false,
            onCevap: (c) => cevap = c,
          ),
          koyu: koyu,
        ),
      );
      await tester.tap(find.text('cat'));
      await tester.pump();
      await tester.tap(find.text('kedi'));
      await tester.pump();

      // İki öğede de numara 2 ve bağ simgesi var; renk aynı.
      expect(find.text('2'), findsNWidgets(2));
      expect(find.byIcon(Icons.link), findsNWidgets(2));
      final ikonlar = tester.widgetList<Icon>(find.byIcon(Icons.link));
      expect(ikonlar.every((i) => i.color == eslesmeRengi(2)), isTrue);

      await tester.tap(find.text('dog'));
      await tester.pump();
      await tester.tap(find.text('köpek'));
      await tester.pump();
      final renkler = tester
          .widgetList<Icon>(find.byIcon(Icons.link))
          .map((i) => i.color)
          .toSet();
      expect(renkler, {eslesmeRengi(1), eslesmeRengi(2)});
      expect(cevap, isNull); // henüz hepsi eşleşmedi
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('kontrol sonrası doğru/yanlış simgesi çift rengini ezer', (
    tester,
  ) async {
    _kucukEkran(tester);
    var kontrol = false;
    late StateSetter yenile;
    await tester.pumpWidget(
      _sarmal(
        StatefulBuilder(
          builder: (c, s) {
            yenile = s;
            return EslestirGorunumu(
              alistirma: _es,
              kontrolEdildi: kontrol,
              onCevap: (_) {},
            );
          },
        ),
      ),
    );
    for (final cift in _es.ciftler) {
      await tester.tap(find.text(cift.sol));
      await tester.pump();
      await tester.tap(find.text(cift.sag));
      await tester.pump();
    }
    yenile(() => kontrol = true);
    await tester.pump();
    expect(find.byIcon(Icons.check_circle), findsNWidgets(6));
    expect(find.byIcon(Icons.link), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
