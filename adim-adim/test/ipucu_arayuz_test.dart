// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kademeli ipucu (özellik 14), arayüz: yanlış cevapta "İpucu al" (key
/// 'ipucu-al') ve "Yine de geç"; her basışta bir adım (3. adım çözüm); ipucu
/// sonrası yeniden cevaplanır; onSonuc yalnız ilk cevapla bir kez gider (kart
/// puanı korunur); doğru cevapta ipucu düğmesi yok; 480x600 ölçek 1,5 taşmaz.
library;

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

/// Açık pencereyi test ortasında yeniden boyutlandırır / ölçekler.
Future<void> pencereyiAyarla(
  WidgetTester tester, {
  Size? boyut,
  double? metinOlcegi,
}) async {
  if (boyut != null) tester.view.physicalSize = boyut;
  if (metinOlcegi != null) {
    tester.platformDispatcher.textScaleFactorTestValue = metinOlcegi;
  }
  await tester.pumpAndSettle();
}

final _ipucuAl = find.byKey(const Key('ipucu-al'));

/// Ders Bir'i açar ve ilk soruya (Secim: dört) yanlış cevap verir.
/// [boyut]/[metinOlcegi] verilirse ders açıldıktan sonra pencere küçültülür
/// (Yol listesinde ders satırı 480x600'de alt çubuğun arkasında kalır).
Future<void> _yanlisCevap(
  WidgetTester tester,
  BellekDepo depo, {
  Size? boyut,
  double? metinOlcegi,
}) async {
  await uygulamayiAc(tester, depo);
  await dokun(tester, find.textContaining('Ders Bir'));
  if (boyut != null || metinOlcegi != null) {
    await pencereyiAyarla(tester, boyut: boyut, metinOlcegi: metinOlcegi);
  }
  await dokun(tester, find.text('beş'));
  await dokun(tester, find.text('Kontrol et'));
  expect(find.text('Yanlış'), findsOneWidget);
}

void main() {
  testWidgets('yanlış → İpucu al → 3 adım → çözüm; sonra doğru cevap', (
    tester,
  ) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    await _yanlisCevap(tester, depo);
    // Eski bilgiler korunur; "Devam" yerine "Yine de geç" + "İpucu al".
    expect(find.textContaining('Doğru cevap: dört'), findsOneWidget);
    expect(_ipucuAl, findsOneWidget);
    expect(find.text('İpucu al'), findsOneWidget);
    expect(find.text('Yine de geç'), findsOneWidget);
    expect(find.text('Devam'), findsNothing);

    // 1. adım: açıklamadan genel ipucu; soru yeniden cevaplanabilir.
    await dokun(tester, _ipucuAl);
    expect(find.text('Yanlış'), findsNothing);
    expect(find.text('İpucu 1: 2 + 2 = 4'), findsOneWidget);
    expect(find.text('Tekrar dene'), findsOneWidget);
    expect(find.text('Kontrol et'), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(
            find.ancestor(
              of: find.text('Kontrol et'),
              matching: find.byType(FilledButton),
            ),
          )
          .onPressed,
      isNull,
    );

    // 2. adım: hataya özel (bir yanlış seçenek elenir).
    await dokun(tester, _ipucuAl);
    expect(find.text('İpucu 1: 2 + 2 = 4'), findsOneWidget);
    expect(find.text('İpucu 2: "üç" değil'), findsOneWidget);

    // 3. adım: çözüm; artık ipucu düğmesi yok.
    await dokun(tester, _ipucuAl);
    expect(find.text('Çözüm: dört'), findsOneWidget);
    expect(_ipucuAl, findsNothing);
    expect(find.text('Yine de geç'), findsOneWidget);

    // Yeniden cevapla: doğru. Bant "Doğru!" ve "Devam".
    await dokun(tester, find.text('dört'));
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Doğru!'), findsOneWidget);
    expect(find.text('Devam'), findsOneWidget);
    expect(_ipucuAl, findsNothing);
    // Alınan ipuçları bantta da listelenir.
    expect(find.text('Çözüm: dört'), findsOneWidget);

    // Kart puanı: yalnız ilk (yanlış) cevap işlendi.
    final durum = (await depo.yukle());
    final kart = durum.kartlar['$sahteDers1#0']!;
    expect(kart.sonCevap, isFalse);
    expect(kart.yariOmurGun, Kart.enAzYariOmur);
    expect(durum.hatalar.length, 1);

    // Devam: ikinci soru, ipucu sayacı sıfırlanır.
    await dokun(tester, find.text('Devam'));
    expect(find.text('2/7'), findsOneWidget);
    expect(find.textContaining('İpucu'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Yine de geç ipucu almadan sonraki soruya geçer', (tester) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    await _yanlisCevap(tester, depo);
    await dokun(tester, find.text('Yine de geç'));
    expect(find.text('2/7'), findsOneWidget);
    expect(find.text('beş'), findsNothing);
    expect(find.text('am'), findsOneWidget);
  });

  testWidgets('ipucu sonrası yanlış cevap: bant yine İpucu al verir, '
      'onSonuc tekrar çağrılmaz', (tester) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    await _yanlisCevap(tester, depo);
    await dokun(tester, _ipucuAl);
    await dokun(tester, find.text('üç'));
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Yanlış'), findsOneWidget);
    expect(find.text('İpucu 1: 2 + 2 = 4'), findsOneWidget);
    expect(_ipucuAl, findsOneWidget);
    // Hata defterinde tek kayıt: ikinci yanlış işlenmedi.
    expect((await depo.yukle()).hatalar.length, 1);
    await dokun(tester, _ipucuAl);
    expect(find.text('İpucu 2: "üç" değil'), findsOneWidget);
  });

  testWidgets('doğru cevapta ipucu düğmesi yok', (tester) async {
    await uygulamayiAc(tester, BellekDepo(const OgrenciDurumu(alan: 'dil')));
    await dokun(tester, find.textContaining('Ders Bir'));
    await dokun(tester, find.text('dört'));
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Doğru!'), findsOneWidget);
    expect(_ipucuAl, findsNothing);
    expect(find.text('Yine de geç'), findsNothing);
    expect(find.text('Devam'), findsOneWidget);
  });

  testWidgets('480x600 ölçek 1,5: yanlış bant ve 3 ipucu adımı taşmaz', (
    tester,
  ) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    await _yanlisCevap(
      tester,
      depo,
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    expect(tester.takeException(), isNull);
    for (var i = 0; i < 3; i++) {
      await dokun(tester, _ipucuAl);
      expect(tester.takeException(), isNull);
    }
    expect(find.text('Çözüm: dört'), findsOneWidget);
    await dokun(tester, find.text('dört'));
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Doğru!'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('AlistirmaOturumu: onIpucu adımları, onSonuc bir kez, '
      'doğru sayacı ipuçlu doğruyu saymaz', (tester) async {
    final sonuclar = <(int, bool)>[];
    final ipuclar = <(int, int)>[];
    (int, int)? bitti;
    await tester.pumpWidget(
      MaterialApp(
        theme: acikTema(),
        home: Scaffold(
          body: AlistirmaOturumu(
            alistirmalar: const [
              Secim(soru: 'S1', secenekler: ['a', 'b'], dogru: 1),
              Secim(soru: 'S2', secenekler: ['c', 'd'], dogru: 0),
            ],
            notGetir: (i) => i == 0 ? 'b harfi' : null,
            onSonuc: (i, d) => sonuclar.add((i, d)),
            onIpucu: (i, a) => ipuclar.add((i, a)),
            onBitti: (d, t) => bitti = (d, t),
            onKapat: () {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await dokun(tester, find.text('a'));
    await dokun(tester, find.text('Kontrol et'));
    expect(sonuclar, [(0, false)]);
    expect(find.text('Senin notun: b harfi'), findsOneWidget);
    await dokun(tester, _ipucuAl);
    await dokun(tester, _ipucuAl);
    expect(ipuclar, [(0, 1), (0, 2)]);
    await dokun(tester, find.text('b'));
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Doğru!'), findsOneWidget);
    expect(sonuclar, [(0, false)]);
    await dokun(tester, find.text('Devam'));
    expect(find.textContaining('Senin notun'), findsNothing);
    await dokun(tester, find.text('c'));
    await dokun(tester, find.text('Kontrol et'));
    expect(sonuclar, [(0, false), (1, true)]);
    await dokun(tester, find.text('Bitir'));
    expect(bitti, (1, 2)); // ipuçlu doğru sayılmadı
    expect(ipuclar.length, 2);
  });
}
