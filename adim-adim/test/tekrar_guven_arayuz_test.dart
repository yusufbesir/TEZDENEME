// Sahibi Yusuf (yusufbesir); yazan: [Claude#guven-derecesi]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Tekrar ekranı: doğru cevaptan sonra güven derecesi (Zor / İyi / Kolay)
/// seçilir ve kartın yarı ömrü kaydedilir; seçilmezse eski x2 davranışı.
/// 480x600 pencerede taşma yok.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

const _kartId = '$sahteDers1#0'; // Secim: "İki artı iki kaç eder?" -> dört

OgrenciDurumu _durum() => const OgrenciDurumu(
  alan: 'dil',
  kartlar: {_kartId: Kart(kutu: 3, sonraki: '2026-10-14', yariOmurGun: 4)},
);

Future<BellekDepo> _oturumaGir(WidgetTester tester) async {
  final depo = BellekDepo(_durum());
  await uygulamayiAc(tester, depo, boyut: const Size(480, 600));
  await tekrarEkraniniAc(tester);
  await dokun(tester, find.text('Tekrara başla'));
  await dokun(tester, find.text('dört'));
  await dokun(tester, find.text('Kontrol et'));
  return depo;
}

void main() {
  testWidgets('Kolay: yarı ömür x3 (12 gün), sonDerece kolay', (tester) async {
    final depo = await _oturumaGir(tester);
    expect(find.text('Ne kadar kolaydı?'), findsOneWidget);
    await dokun(tester, find.byKey(const Key('guven-kolay')));
    final k = (await depo.yukle()).kartlar[_kartId]!;
    expect(k.yariOmurGun, 12);
    expect(k.sonDerece, 'kolay');
    expect(k.sonCevap, true);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Zor: yarı ömür x1,3 (5,2 gün)', (tester) async {
    final depo = await _oturumaGir(tester);
    await dokun(tester, find.byKey(const Key('guven-zor')));
    final k = (await depo.yukle()).kartlar[_kartId]!;
    expect(k.yariOmurGun, closeTo(5.2, 1e-9));
    expect(k.sonDerece, 'zor');
  });

  testWidgets('derece seçilmezse eski davranış: x2, sonDerece null', (
    tester,
  ) async {
    final depo = await _oturumaGir(tester);
    final k = (await depo.yukle()).kartlar[_kartId]!;
    expect(k.yariOmurGun, 8);
    expect(k.sonDerece, isNull);
  });

  testWidgets('derece değiştirilebilir: Kolay sonra Zor, son seçim geçerli', (
    tester,
  ) async {
    final depo = await _oturumaGir(tester);
    await dokun(tester, find.byKey(const Key('guven-kolay')));
    await dokun(tester, find.byKey(const Key('guven-zor')));
    final k = (await depo.yukle()).kartlar[_kartId]!;
    expect(k.yariOmurGun, closeTo(5.2, 1e-9));
    expect(k.sonDerece, 'zor');
  });
}
