/// Ünite özeti: Motor.uniteOzeti (kelime, kalıp, dilbilgisi notu, kod kursu),
/// ana sayfa düğmesi, özet ekranı, kopyalama, hikâye bağlantısı ve 480x600 @1,5
/// taşma.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

Kurs _kurs(String id, KursAlani alan) => Kurs(
  id: id,
  ad: 'Özet Kursu',
  aciklama: '',
  alan: alan,
  uniteler: [
    Unite(
      id: '$id.u1',
      ad: 'Selamlaşma',
      dersler: [
        Ders(
          id: '$id.u1.d1',
          ad: 'Merhaba',
          dilbilgisiNotu: 'am/is/are kişiye göre değişir.',
          alistirmalar: [
            const Eslestir(
              soru: 'Eşleştir',
              ciftler: [
                (sol: 'Hello', sag: 'Merhaba'),
                (sol: 'Bye', sag: 'Hoşça kal'),
              ],
            ),
            const Secim(
              soru: '"Hello" ne demektir?',
              secenekler: ['Merhaba', 'Güle güle'],
              dogru: 0,
            ),
            const Secim(
              soru: '"Cat" ne demektir?',
              secenekler: ['Köpek', 'Kedi'],
              dogru: 1,
            ),
            const Sirala(
              soru: 'Sırala',
              kelimeler: ['am', 'I', 'happy'],
              dogru: ['I', 'am', 'happy'],
            ),
            const Bosluk(
              soru: 'She ___ a student.',
              secenekler: ['is', 'am'],
              dogru: 0,
            ),
            const Kod(
              soru: 'Doldur',
              kod: '<___>Merhaba</h1>',
              secenekler: ['h1', 'p'],
              dogru: 0,
            ),
            const Tablo(
              soru: 'Tablo',
              baslik: ['Zamir', 'Fiil'],
              satirlar: [
                ['I', 'am'],
                ['you', 'are'],
              ],
              bos: [(satir: 0, sutun: 1)],
            ),
          ],
        ),
        const Ders(
          id: 'x.u1.d2',
          ad: 'Ders 2',
          alistirmalar: [
            Eslestir(soru: 'E', ciftler: [(sol: 'Hello', sag: 'Merhaba')]),
          ],
        ),
      ],
    ),
  ],
);

void main() {
  test('dil kursu: kelime, kalıp ve not; tekrarlar birleşir', () {
    final o = Motor.uniteOzeti(_kurs('ozet-1', KursAlani.dil), 0);
    expect(o.uniteAd, 'Selamlaşma');
    expect(o.kelimeler.map((k) => '${k.kelime}=${k.anlam}'), [
      'Hello=Merhaba',
      'Bye=Hoşça kal',
      'Cat=Kedi',
    ]);
    expect(o.kaliplar, [
      'I am happy',
      'She is a student.',
      '<h1>Merhaba</h1>',
      'I - am',
      'you - are',
    ]);
    expect(o.notlar.single.not, 'am/is/are kişiye göre değişir.');
    expect(o.kelimeBasligi, 'Kelimeler');
    expect(o.kalipBasligi, 'Kalıplar');
    expect(o.metin(), contains('Kelimeler\n- Hello: Merhaba'));
    expect(o.metin(), contains('Dilbilgisi notları\n- Merhaba: am/is'));
  });

  test('kod kursu: terim ve sözdizimi başlıkları; geçersiz indeks boş', () {
    final k = _kurs('html-9', KursAlani.kod);
    final o = Motor.uniteOzeti(k, 0);
    expect(o.kelimeBasligi, 'Terimler');
    expect(o.kalipBasligi, 'Sözdizimi');
    expect(Motor.uniteOzeti(k, 5).bos, isTrue);
    expect(Motor.uniteOzeti(k, -1).bos, isTrue);
  });

  testWidgets('düğme yalnız ünite bitince; ekran, kopyalama, hikâye', (
    tester,
  ) async {
    final kurs = _kurs('ingilizce-1', KursAlani.dil);
    await uygulamayiAc(
      tester,
      BellekDepo(
        const OgrenciDurumu(alan: 'dil', tamamlanan: {'ingilizce-1.u1.d1': 1}),
      ),
      kurslar: [kurs],
    );
    expect(
      find.byKey(const ValueKey('unite-ozeti-ingilizce-1.u1')),
      findsNothing,
    );
  });

  testWidgets('bitmiş ünite: özet sayfası, kopyala, hikâye, 480x600 @1,5', (
    tester,
  ) async {
    final kurs = _kurs('ingilizce-1', KursAlani.dil);
    String? pano;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'Clipboard.setData') {
          pano = (call.arguments as Map)['text'] as String;
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
      BellekDepo(
        const OgrenciDurumu(
          alan: 'dil',
          tamamlanan: {'ingilizce-1.u1.d1': 1, 'x.u1.d2': 1},
        ),
      ),
      kurslar: [kurs],
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    final dugme = find.byKey(const ValueKey('unite-ozeti-ingilizce-1.u1'));
    await tester.scrollUntilVisible(
      dugme,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await dokun(tester, dugme);
    expect(find.text('Selamlaşma'), findsOneWidget);
    expect(find.text('Kelimeler'), findsOneWidget);
    expect(find.text('Kalıplar'), findsOneWidget);
    expect(find.text('Dilbilgisi notları'), findsOneWidget);
    await dokun(tester, find.byKey(const ValueKey('unite-ozeti-kopyala')));
    expect(pano, contains('Hello: Merhaba'));
    expect(find.byKey(const ValueKey('unite-ozeti-hikaye')), findsOneWidget);
    expect(find.text('Bu seviyenin hikâyesini oku'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
