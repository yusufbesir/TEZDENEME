/// Sözlük ekranı "Metin yapıştır" bölümü (SADE 5) arayüz testi: bölüm
/// kapalı açılır, metin girilip "İşaretle"ye basılınca sözlükteki
/// öğrenilmemiş kelimeler çip olur, sözlükte olmayan soluk çip olur,
/// öğrenilmiş kelime çip olmaz; çipe dokununca tekrar kartı eklenir ve
/// çip onay simgesine döner. 480x600'de taşmaz.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Yazan: [Claude#pano-kelime].
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/ekranlar/sozluk_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

void main() {
  testWidgets('Metin yapıştır: bölüm açılır, çipler çıkar, dokununca kart', (
    tester,
  ) async {
    // sahteKurs: cat/dog/bird Ders Bir'in 4. alıştırması. "dog" öğrenilmiş
    // (yarı ömür 10 gün) olarak başlar; cat/bird kartsızdır.
    const kartId = '$sahteDers1#4';
    final depo = BellekDepo(
      const OgrenciDurumu(
        alan: 'dil',
        kartlar: {
          kartId: Kart(kutu: 4, sonraki: '2026-10-20', yariOmurGun: 10),
        },
      ),
    );
    await uygulamayiAc(
      tester,
      depo,
      kurslar: [sahteKurs],
      boyut: const Size(480, 600),
    );
    await dokun(tester, find.byTooltip('Sözlük'));
    expect(find.byType(SozlukEkrani), findsOneWidget);

    // Bölüm kapalı: metin kutusu kurulmamıştır.
    expect(find.text('Metin yapıştır'), findsOneWidget);
    expect(find.byKey(const ValueKey('sozluk-metin-kutusu')), findsNothing);

    await dokun(tester, find.text('Metin yapıştır'));
    expect(find.byKey(const ValueKey('sozluk-metin-kutusu')), findsOneWidget);
    expect(find.byKey(const ValueKey('sozluk-panodan')), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.enterText(
      find.byKey(const ValueKey('sozluk-metin-kutusu')),
      'The Cat and the dog saw a bird, zzz!',
    );
    await dokun(tester, find.byKey(const ValueKey('sozluk-isaretle')));
    expect(tester.takeException(), isNull);

    // Not: cat/dog/bird aynı alıştırmadan gelir, kart kimlikleri aynıdır;
    // "dog" (kart öğrenilmiş) ile aynı karta giden cat/bird de öğrenilmiş
    // sayılır, bu yüzden işaretli listesi boş, sözlük dışı kelimeler soluk.
    expect(find.byKey(const ValueKey('sozluk-disi-zzz')), findsOneWidget);
    expect(find.byKey(const ValueKey('sozluk-disi-the')), findsOneWidget);
    expect(find.textContaining('3 öğrenilmiş'), findsOneWidget);
    expect(find.byKey(const ValueKey('sozluk-isaretli-cat')), findsNothing);
  });

  testWidgets('İşaretli çipe dokununca tekrar kartı eklenir', (tester) async {
    const kartId = '$sahteDers1#4';
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final kap = await uygulamayiAc(
      tester,
      depo,
      kurslar: [sahteKurs],
      boyut: const Size(480, 600),
    );
    await dokun(tester, find.byTooltip('Sözlük'));
    await dokun(tester, find.text('Metin yapıştır'));
    await tester.enterText(
      find.byKey(const ValueKey('sozluk-metin-kutusu')),
      'A cat. Cats! qqq',
    );
    await dokun(tester, find.byKey(const ValueKey('sozluk-isaretle')));
    expect(tester.takeException(), isNull);

    final cip = find.byKey(const ValueKey('sozluk-isaretli-cat'));
    expect(cip, findsOneWidget);
    expect(find.byKey(const ValueKey('sozluk-disi-qqq')), findsOneWidget);
    expect(find.textContaining('1 işaretli'), findsOneWidget);

    await dokun(tester, cip);
    expect(find.text('Tekrar kartı eklendi: cat'), findsOneWidget);
    expect(tester.takeException(), isNull);
    final durum = kap.read(durumProvider).value!;
    expect(durum.kartlar.containsKey(kartId), isTrue);
    // Çip pasifleşir (onay simgesi).
    final chip = tester.widget<ActionChip>(cip);
    expect(chip.onPressed, isNull);
  });
}
