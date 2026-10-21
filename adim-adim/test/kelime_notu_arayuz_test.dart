// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kelimeye kişisel not (özellik 26), arayüz: sözlükte "Not" düğmesi pencere
/// açar, Kaydet depoya yazar ve satırda italik "Not: ..." görünür; simge dolu
/// olur ve tooltip "Notu düzenle"; Sil notu kaldırır; Vazgeç dokunmaz; ders
/// ekranında cevaptan sonra "Senin notun: ..." satırı; 480x600 ölçek 1,5 taşmaz.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/ekranlar/sozluk_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

/// sahteKurs'ta cat/kedi eşleştirmesi Ders Bir'in 4. alıştırmasıdır.
const _catKart = '$sahteDers1#4';

Future<ProviderContainer> _sozlukteCat(
  WidgetTester tester,
  BellekDepo depo, {
  Size boyut = const Size(480, 600),
  double metinOlcegi = 1.5,
}) async {
  final kap = await uygulamayiAc(
    tester,
    depo,
    boyut: boyut,
    metinOlcegi: metinOlcegi,
  );
  await dokun(tester, find.byTooltip('Sözlük'));
  expect(find.byType(SozlukEkrani), findsOneWidget);
  await tester.enterText(find.byType(TextField), 'cat');
  await tester.pumpAndSettle();
  expect(find.text('1 madde'), findsOneWidget);
  return kap;
}

void main() {
  testWidgets('not ekle: depoya yazılır, satırda görünür, 480x600 ölçek 1,5 '
      'taşmaz', (tester) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final kap = await _sozlukteCat(tester, depo);
    expect(find.byTooltip('Not'), findsOneWidget);
    expect(find.byIcon(Icons.sticky_note_2_outlined), findsOneWidget);
    expect(find.textContaining('Not: '), findsNothing);

    await dokun(tester, find.byTooltip('Not'));
    expect(find.text('Kişisel not'), findsOneWidget);
    expect(find.text('Sil'), findsNothing); // henüz not yok
    await tester.enterText(
      find.byKey(const Key('not-metni')),
      '  Kedi miyavlar: cat  ',
    );
    await dokun(tester, find.text('Kaydet'));
    expect(tester.takeException(), isNull);

    expect((await depo.yukle()).kelimeNotlari, {
      _catKart: 'Kedi miyavlar: cat',
    });
    expect(
      kap.read(durumProvider).value!.kelimeNotlari[_catKart],
      'Kedi miyavlar: cat',
    );
    final satir = find.text('Not: Kedi miyavlar: cat');
    expect(satir, findsOneWidget);
    final metin = tester.widget<Text>(satir);
    expect(metin.maxLines, 1);
    expect(metin.overflow, TextOverflow.ellipsis);
    expect(metin.style?.fontStyle, FontStyle.italic);
    expect(find.byTooltip('Not'), findsNothing);
    expect(find.byTooltip('Notu düzenle'), findsOneWidget);
    expect(find.byIcon(Icons.sticky_note_2), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('notu düzenle ve sil; Vazgeç dokunmaz', (tester) async {
    final depo = BellekDepo(
      const OgrenciDurumu(alan: 'dil', kelimeNotlari: {_catKart: 'ilk not'}),
    );
    await _sozlukteCat(tester, depo, metinOlcegi: 1.0);
    expect(find.text('Not: ilk not'), findsOneWidget);

    // Düzenle: mevcut metin pencerede, Kaydet günceller.
    await dokun(tester, find.byTooltip('Notu düzenle'));
    final alan = tester.widget<TextField>(find.byKey(const Key('not-metni')));
    expect(alan.controller?.text, 'ilk not');
    expect(alan.maxLength, 200);
    await tester.enterText(find.byKey(const Key('not-metni')), 'yeni not');
    await dokun(tester, find.text('Kaydet'));
    expect((await depo.yukle()).kelimeNotlari[_catKart], 'yeni not');
    expect(find.text('Not: yeni not'), findsOneWidget);

    // Vazgeç: değişiklik yazılmaz.
    await dokun(tester, find.byTooltip('Notu düzenle'));
    await tester.enterText(find.byKey(const Key('not-metni')), 'yazılmaz');
    await dokun(tester, find.text('Vazgeç'));
    expect((await depo.yukle()).kelimeNotlari[_catKart], 'yeni not');
    expect(find.text('Not: yeni not'), findsOneWidget);

    // Sil: not kalkar, simge boş çerçeveye döner.
    await dokun(tester, find.byTooltip('Notu düzenle'));
    await dokun(tester, find.text('Sil'));
    expect((await depo.yukle()).kelimeNotlari, isEmpty);
    expect(find.textContaining('Not: '), findsNothing);
    expect(find.byTooltip('Not'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('boş metinle Kaydet notu siler', (tester) async {
    final depo = BellekDepo(
      const OgrenciDurumu(alan: 'dil', kelimeNotlari: {_catKart: 'silinecek'}),
    );
    await _sozlukteCat(tester, depo, metinOlcegi: 1.0);
    await dokun(tester, find.byTooltip('Notu düzenle'));
    await tester.enterText(find.byKey(const Key('not-metni')), '   ');
    await dokun(tester, find.text('Kaydet'));
    expect((await depo.yukle()).kelimeNotlari, isEmpty);
    expect(find.byTooltip('Not'), findsOneWidget);
  });

  testWidgets('ders ekranında cevaptan sonra "Senin notun" görünür; notsuz '
      'kartta görünmez', (tester) async {
    final depo = BellekDepo(
      const OgrenciDurumu(
        alan: 'dil',
        kelimeNotlari: {'$sahteDers1#0': 'iki el, iki ayak'},
      ),
    );
    // Ders varsayılan pencerede açılır (Yol listesinde satır 480x600'de alt
    // çubuğun arkasında kalır), sonra pencere 480x600 ve ölçek 1,5 yapılır.
    await uygulamayiAc(tester, depo);
    await dokun(tester, find.textContaining('Ders Bir'));
    tester.view.physicalSize = const Size(480, 600);
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    await tester.pumpAndSettle();
    expect(find.textContaining('Senin notun'), findsNothing);
    await dokun(tester, find.text('dört'));
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Doğru!'), findsOneWidget);
    expect(find.text('Senin notun: iki el, iki ayak'), findsOneWidget);
    expect(tester.takeException(), isNull);

    // İkinci kartın notu yok.
    await dokun(tester, find.text('Devam'));
    await dokun(tester, find.text('am'));
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Doğru!'), findsOneWidget);
    expect(find.textContaining('Senin notun'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
