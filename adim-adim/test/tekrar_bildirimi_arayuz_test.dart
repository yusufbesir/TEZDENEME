/// ÖZELLİK 29 sağlayıcı/arayüz testleri: açılışta bekleyen kart varsa
/// SahteBildirim'e 'tekrar:N' düşer ve `sonTekrarBildirimGunu` bugüne
/// yazılır; ikinci açılışta düşmez; ayar kapalıyken düşmez; Ayarlar'daki
/// anahtar görünür ve kaydeder; 480x600 @1.5 Ayarlar ekranı taşmaz.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_test.dart' show ayarlariAc;
import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

const _bugun = '2026-10-15'; // uygulamayiAc'ın sabitlediği gün

OgrenciDurumu _bekleyenli({int sayi = 2, bool acik = true}) => OgrenciDurumu(
  alan: 'dil',
  kartlar: {
    for (var i = 0; i < sayi; i++)
      '$sahteDers1#$i': const Kart(kutu: 1, sonraki: '2026-10-14'),
  },
  tekrarBildirimiAcik: acik,
);

void main() {
  testWidgets('açılışta bekleyen kart: tekrar:N düşer, gün kaydedilir', (
    tester,
  ) async {
    final depo = BellekDepo(_bekleyenli(sayi: 3));
    final bildirim = SahteBildirim();
    await uygulamayiAc(tester, depo, bildirim: bildirim);
    expect(bildirim.cagrilar, ['tekrar:3']);
    expect((await depo.yukle()).sonTekrarBildirimGunu, _bugun);
  });

  testWidgets('aynı gün ikinci açılışta tekrar düşmez', (tester) async {
    final depo = BellekDepo(
      _bekleyenli(sayi: 3).copyWith(sonTekrarBildirimGunu: _bugun),
    );
    final bildirim = SahteBildirim();
    await uygulamayiAc(tester, depo, bildirim: bildirim);
    expect(bildirim.cagrilar, isEmpty);
  });

  testWidgets('ayar kapalıyken düşmez', (tester) async {
    final depo = BellekDepo(_bekleyenli(sayi: 3, acik: false));
    final bildirim = SahteBildirim();
    await uygulamayiAc(tester, depo, bildirim: bildirim);
    expect(bildirim.cagrilar, isEmpty);
    expect((await depo.yukle()).sonTekrarBildirimGunu, isNull);
  });

  testWidgets('bekleyen kart yokken düşmez', (tester) async {
    final bildirim = SahteBildirim();
    await uygulamayiAc(tester, null, bildirim: bildirim);
    expect(bildirim.cagrilar, isEmpty);
  });

  testWidgets('Ayarlar: anahtar görünür, kapatma kaydedilir', (tester) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    await uygulamayiAc(tester, depo);
    await ayarlariAc(tester);
    final anahtar = find.widgetWithText(
      SwitchListTile,
      'Açılışta bekleyen tekrar bildirimi',
    );
    expect(anahtar, findsOneWidget);
    expect(
      find.text('Uygulama açılırken bugün bekleyen tekrar sayısını bildirir'),
      findsOneWidget,
    );
    expect(tester.widget<SwitchListTile>(anahtar).value, isTrue);
    await dokun(tester, anahtar);
    expect((await depo.yukle()).tekrarBildirimiAcik, isFalse);
    expect(tester.widget<SwitchListTile>(anahtar).value, isFalse);
    await dokun(tester, anahtar);
    expect((await depo.yukle()).tekrarBildirimiAcik, isTrue);
  });

  testWidgets('480x600 @1.5: Ayarlar ekranı taşmaz', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil')),
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    await ayarlariAc(tester);
    final anahtar = find.widgetWithText(
      SwitchListTile,
      'Açılışta bekleyen tekrar bildirimi',
    );
    // ListView tembel kurar: anahtar görünür olana dek listeyi kaydır
    // (ilk Scrollable listenin kendisi; ad alanının EditableText'i değil).
    await tester.scrollUntilVisible(
      anahtar,
      200,
      scrollable: find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tester.pumpAndSettle();
    expect(anahtar, findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
