// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Okuma hikâyeleri arayüzü: ana sayfa kartı yalnız dil alanında görünür;
/// ön test -> okuma -> sorular -> özet akışı sonunda durum doğru; kelimeye
/// dokununca anlam alt sayfası; 480x600 @1,5 ölçekte kart ve hikâye ekranı
/// (uzun metin) taşmaz.
library;

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/icerik/hikayeler.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

final _kart = find.byKey(const ValueKey('okuma-hikayeleri'));
Finder _satir(String id) => find.byKey(ValueKey('hikaye-satir-$id'));

Kurs _ingilizce(String id, String ad) => Kurs(
  id: id,
  ad: ad,
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: '$id.u1',
      ad: 'Ünite',
      dersler: [
        Ders(
          id: '$id.u1.d1',
          ad: 'Ders Bir',
          alistirmalar: const [
            Secim(soru: 'Soru', secenekler: ['a', 'b'], dogru: 0),
          ],
        ),
      ],
    ),
  ],
);

final Kurs _a1 = _ingilizce('ingilizce-1', 'Sahte A1');
final Kurs _a2 = _ingilizce('ingilizce-2', 'Sahte A2');

Future<void> _kontrolVeDevam(WidgetTester tester, {bool son = false}) async {
  await dokun(tester, find.text('Kontrol et'));
  await dokun(tester, find.text(son ? 'Bitir' : 'Devam'));
}

void main() {
  testWidgets('ön test -> okuma -> sorular -> özet; durum doğru', (
    tester,
  ) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final kap = await uygulamayiAc(tester, depo, kurslar: [_a1]);

    // Tek kurs: üç satır doğrudan görünür, kelime sayısı yazar.
    expect(_kart, findsOneWidget);
    expect(find.text('Okuma hikâyeleri'), findsOneWidget);
    for (final id in ['hikaye-a1-kolay', 'hikaye-a1-orta', 'hikaye-a1-zor']) {
      await tester.ensureVisible(_satir(id));
      expect(_satir(id), findsOneWidget);
    }
    expect(find.text('Kolay · My Morning'), findsOneWidget);
    expect(
      find.text('${hikayeBul('hikaye-a1-kolay')!.kelimeSayisi} kelime'),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.check_circle), findsNothing);

    await dokun(tester, _satir('hikaye-a1-kolay'));

    // (a) Ön test: 6 kelime; ilk ikisi bilinmiyor, kalan dördü biliniyor.
    expect(find.text('Kelime ön testi'), findsOneWidget);
    expect(find.text('1/6'), findsOneWidget);
    expect(find.text('breakfast'), findsOneWidget);
    await dokun(tester, find.byKey(const Key('bilmiyorum')));
    expect(find.text('cheese'), findsOneWidget);
    await dokun(tester, find.byKey(const Key('bilmiyorum')));
    for (var i = 0; i < 4; i++) {
      await dokun(tester, find.byKey(const Key('biliyorum')));
    }
    expect(find.text('%67'), findsOneWidget);
    expect(find.text('6 kelimenin 4 tanesini biliyorsun.'), findsOneWidget);
    await dokun(tester, find.byKey(const Key('okumaya-basla')));

    // (b) Okuma: başlık, paragraf; kelime çipine dokununca anlam.
    expect(find.text('My Morning'), findsOneWidget);
    expect(
      find.textContaining('My name is Ali', findRichText: true),
      findsOneWidget,
    );
    await dokun(tester, find.byKey(const Key('kelime-cip-0')));
    expect(find.byKey(const Key('kelime-anlami')), findsOneWidget);
    expect(find.text('kahvaltı'), findsOneWidget);
    await tester.tapAt(const Offset(10, 10)); // alt sayfayı kapat
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('kelime-anlami')), findsNothing);
    expect(tester.takeException(), isNull);
    expect(kap.read(durumProvider).value!.tamamlananHikayeler, isEmpty);

    // (c) Sorular: 3 doğru + 1 yanlış (SRS kartı yazılmaz).
    await dokun(tester, find.byKey(const Key('sorulara-gec')));
    expect(find.byType(AlistirmaOturumu), findsOneWidget);
    await dokun(tester, find.text("At seven o'clock"));
    await _kontrolVeDevam(tester);
    await dokun(tester, find.text('By bus'));
    await _kontrolVeDevam(tester);
    await dokun(tester, find.text('She is kind'));
    await _kontrolVeDevam(tester);
    await dokun(tester, find.text('He eats breakfast'));
    await dokun(tester, find.text('Kontrol et'));
    await dokun(tester, find.text('Bitir'));

    // (d) Özet: 3/4, XP = 3*2 + 2 bilinmeyen = 8.
    expect(find.text('Hikâye tamamlandı'), findsOneWidget);
    expect(find.text('3/4'), findsOneWidget);
    expect(find.text('+8'), findsOneWidget);
    final d = kap.read(durumProvider).value!;
    expect(d.tamamlananHikayeler, {'hikaye-a1-kolay': 1});
    expect(d.xp, 8);
    expect(d.seri, 1);
    expect(d.kartlar, isEmpty);
    expect(d.tamamlanan, isEmpty);
    expect(d.gunluk.single.tur, GunlukKayit.turHikaye);
    expect(d.gunluk.single.id, 'hikaye-a1-kolay');
    expect(d.gunluk.single.dogru, 3);
    expect(d.gunluk.single.toplam, 4);
    expect((await depo.yukle()).tamamlananHikayeler, {'hikaye-a1-kolay': 1});
    expect(tester.takeException(), isNull);

    // Yola dönünce satırda tamamlandı işareti görünür.
    await dokun(tester, find.text('Yola dön'));
    expect(_satir('hikaye-a1-kolay'), findsOneWidget);
    expect(find.byIcon(Icons.check_circle), findsOneWidget);
  });

  testWidgets('kart yalnız dil alanında görünür; kod alanında yok', (
    tester,
  ) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil')),
      kurslar: [_a1, sahteKodKurs],
    );
    expect(_kart, findsOneWidget);
  });

  testWidgets('kod alanında kart çizilmez', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'kod')),
      kurslar: [_a1, sahteKodKurs],
    );
    expect(_kart, findsNothing);
    expect(find.text('Okuma hikâyeleri'), findsNothing);
  });

  testWidgets('dil alanında hikâyesi olmayan kurslarda kart çizilmez', (
    tester,
  ) async {
    await uygulamayiAc(tester, null, kurslar: [sahteKurs]);
    expect(_kart, findsNothing);
  });

  testWidgets('bilinmeyen hikâye kimliği: "Hikâye bulunamadı"', (tester) async {
    final kap = await uygulamayiAc(tester, null, kurslar: [_a1]);
    kap.read(yonlendiriciProvider).push('/hikaye/yok');
    await tester.pumpAndSettle();
    expect(find.text('Hikâye bulunamadı'), findsOneWidget);
  });

  testWidgets('çok kurslu kart: güncel kurs açık, diğeri dokununca açılır', (
    tester,
  ) async {
    // A1 tamamlandı, güncel kurs A2.
    final depo = BellekDepo(
      const OgrenciDurumu(
        alan: 'dil',
        tamamlanan: {'ingilizce-1.u1.d1': 1},
        tamamlananHikayeler: {'hikaye-a2-orta': 1},
      ),
    );
    await uygulamayiAc(tester, depo, kurslar: [_a1, _a2]);
    await tester.ensureVisible(_kart);
    expect(_satir('hikaye-a2-kolay'), findsOneWidget);
    expect(_satir('hikaye-a1-kolay'), findsNothing);
    expect(find.text('1/3 hikâye tamam'), findsOneWidget);
    await dokun(
      tester,
      find.descendant(of: _kart, matching: find.text('Sahte A1')),
    );
    expect(_satir('hikaye-a1-kolay'), findsOneWidget);
  });

  group('yerleşim 480x600 @1,5', () {
    const boyut = Size(480, 600);
    const olcek = 1.5;

    testWidgets('ana sayfa kartı taşmaz (tek ve çok kurs)', (tester) async {
      await uygulamayiAc(
        tester,
        BellekDepo(
          const OgrenciDurumu(
            alan: 'dil',
            tamamlananHikayeler: {'hikaye-a1-zor': 2},
          ),
        ),
        kurslar: [_a1],
        boyut: boyut,
        metinOlcegi: olcek,
      );
      await tester.ensureVisible(_kart);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(tester.getRect(_kart).width, lessThanOrEqualTo(boyut.width));
    });

    testWidgets('çok kurslu kart taşmaz', (tester) async {
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [_a1, _a2],
        boyut: boyut,
        metinOlcegi: olcek,
      );
      await tester.ensureVisible(_kart);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await dokun(
        tester,
        find.descendant(of: _kart, matching: find.text('Sahte A2')),
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('hikâye ekranı (en uzun metin) tüm aşamalarda taşmaz', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [_a1],
        boyut: boyut,
        metinOlcegi: olcek,
      );
      // En uzun metin: kelime sayısı en çok olan hikâye.
      final uzun = ([
        ...tumHikayeler,
      ]..sort((a, b) => b.kelimeSayisi.compareTo(a.kelimeSayisi))).first;
      kap.read(yonlendiriciProvider).push('/hikaye/${uzun.id}');
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      // Ön test: en uzun kelimeler dahil hepsi.
      for (var i = 0; i < uzun.anahtarKelimeler.length; i++) {
        await dokun(
          tester,
          find.byKey(Key(i.isEven ? 'bilmiyorum' : 'biliyorum')),
        );
        expect(tester.takeException(), isNull, reason: 'ön test $i');
      }
      expect(tester.takeException(), isNull);
      await dokun(tester, find.byKey(const Key('okumaya-basla')));

      // Okuma + anlam alt sayfası.
      expect(tester.takeException(), isNull);
      await dokun(tester, find.byKey(const Key('kelime-cip-0')));
      expect(find.byKey(const Key('kelime-anlami')), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.tapAt(const Offset(10, 10));
      await tester.pumpAndSettle();
      await tester.drag(
        find.byType(SingleChildScrollView).first,
        const Offset(0, -2000),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      // Sorular ve özet (hepsi ilk seçenekle cevaplanır).
      await dokun(tester, find.byKey(const Key('sorulara-gec')));
      for (var i = 0; i < uzun.sorular.length; i++) {
        await dokun(tester, find.text(uzun.sorular[i].secenekler.first));
        await dokun(tester, find.text('Kontrol et'));
        expect(tester.takeException(), isNull, reason: 'soru $i');
        final son = i == uzun.sorular.length - 1;
        // Yanlış cevapta son olmayan soruda düğme "Yine de geç" olabilir.
        final devam = find.text(son ? 'Bitir' : 'Devam');
        await dokun(
          tester,
          devam.evaluate().isNotEmpty ? devam : find.text('Yine de geç'),
        );
      }
      expect(find.text('Hikâye tamamlandı'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
