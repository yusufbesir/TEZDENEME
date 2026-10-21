// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Ünite rehber kitapçığı (ÖZELLİK 42): rehberin ünite verisinden türetilmesi
/// (kalıplar, örnek cümleler, kelimeler, notlar, CEFR, süre), kod kursu,
/// geçersiz indeks, ana sayfa düğmesi, ekran, kopyalama, ses ve 480x600 @1,5.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/unite_rehberi.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

Kurs _kurs(String id, KursAlani alan, {String ad = 'Deneme Kursu'}) => Kurs(
  id: id,
  ad: ad,
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
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir',
              ciftler: [
                (sol: 'Hello', sag: 'Merhaba'),
                (sol: 'Bye', sag: 'Hoşça kal'),
              ],
            ),
            Soyle(
              soru: 'Söyle',
              metin: 'Nice to meet you',
              ceviri: 'Tanıştığımıza memnun oldum',
            ),
            Soyle(
              soru: 'Söyle',
              metin: 'I would like a cup of tea please',
              ceviri: 'Bir fincan çay istiyorum lütfen',
            ),
            Dinle(
              soru: 'Ne duydun?',
              okunacak: 'Good morning everyone',
              secenekler: ['Good morning everyone', 'Good night'],
              dogru: 0,
            ),
            Sirala(
              soru: 'Sırala',
              kelimeler: ['am', 'I', 'happy'],
              dogru: ['I', 'am', 'happy'],
            ),
            Bosluk(
              soru: 'She ___ a student.',
              secenekler: ['is', 'am'],
              dogru: 0,
            ),
          ],
        ),
        Ders(
          id: '$id.u1.d2',
          ad: 'Nasılsın',
          alistirmalar: const [
            Eslestir(soru: 'E', ciftler: [(sol: 'Cat', sag: 'Kedi')]),
          ],
        ),
      ],
    ),
    Unite(
      id: '$id.u2',
      ad: 'Boş ünite',
      dersler: [Ders(id: '$id.u2.d1', ad: 'Boş', alistirmalar: const [])],
    ),
  ],
);

void main() {
  group('UniteRehberi.uret', () {
    test('dil kursu: kalıplar, örnek cümleler, kelimeler, not ve CEFR', () {
      final k = _kurs(
        'ingilizce-1',
        KursAlani.dil,
        ad: 'İngilizce A1: Başlangıç',
      );
      final r = UniteRehberi.uret(k, 0)!;
      expect(r.uniteAd, 'Selamlaşma');
      expect(r.cefr, 'A1');
      expect(r.kodMu, isFalse);
      expect(r.dersSayisi, 2);
      expect(r.dakika, greaterThan(0));
      expect(r.sesDili, 'en-US');
      // Çevirili kalıp önce: Söyle çevirisi.
      expect(r.kaliplar.first.metin, 'Nice to meet you');
      expect(r.kaliplar.first.anlam, 'Tanıştığımıza memnun oldum');
      expect(r.kaliplar.map((e) => e.metin), contains('I am happy'));
      expect(r.kaliplar.map((e) => e.metin), contains('She is a student.'));
      expect(r.kaliplar.map((e) => e.metin), contains('Good morning everyone'));
      // Uzun (4 kelimeden fazla) cümleler "örnek cümle" olur, kalıp olmaz.
      expect(r.cumleler.map((e) => e.metin), [
        'I would like a cup of tea please',
      ]);
      expect(r.cumleler.single.anlam, 'Bir fincan çay istiyorum lütfen');
      expect(
        r.kaliplar.map((e) => e.metin),
        isNot(contains('I would like a cup of tea please')),
      );
      expect(r.kelimeler.map((e) => e.kelime), ['Hello', 'Bye', 'Cat']);
      expect(r.notlar.single.not, 'am/is/are kişiye göre değişir.');
      expect(r.bos, isFalse);
      expect(r.kalipBasligi, 'Anahtar kalıplar');
    });

    test('kod kursu: CEFR yok, ses yok, söz dizimi başlığı', () {
      final k = _kurs('html-9', KursAlani.kod, ad: 'HTML A1 giriş');
      final r = UniteRehberi.uret(k, 0)!;
      expect(r.cefr, isNull); // CEFR yalnız dil kurslarında.
      expect(r.kodMu, isTrue);
      expect(r.sesDili, isNull);
      expect(r.cumleler, isEmpty);
      expect(r.kalipBasligi, 'Anahtar söz dizimi');
      expect(r.kelimeBasligi, 'Anahtar terimler');
    });

    test('CEFR adı yoksa null; geçersiz indeks null; boş ünite bos', () {
      final k = _kurs(
        'ingilizce-1',
        KursAlani.dil,
        ad: 'Başlangıç İngilizcesi',
      );
      expect(UniteRehberi.uret(k, 0)!.cefr, isNull);
      expect(UniteRehberi.uret(k, 9), isNull);
      expect(UniteRehberi.uret(k, -1), isNull);
      expect(UniteRehberi.uret(k, 1)!.bos, isTrue);
      expect(
        UniteRehberi.cefrBul(_kurs('a-1', KursAlani.dil, ad: 'X B2 Y')),
        'B2',
      );
    });

    test('satır sayıları sınırlıdır', () {
      final cok = Kurs(
        id: 'ingilizce-1',
        ad: 'İngilizce A1',
        aciklama: '',
        alan: KursAlani.dil,
        uniteler: [
          Unite(
            id: 'u',
            ad: 'U',
            dersler: [
              Ders(
                id: 'u.d1',
                ad: 'D',
                alistirmalar: [
                  for (var i = 0; i < 30; i++)
                    Soyle(
                      soru: 'S',
                      metin: 'Sentence number $i',
                      ceviri: 'Cümle $i',
                    ),
                  Eslestir(
                    soru: 'E',
                    ciftler: [
                      for (var i = 0; i < 20; i++) (sol: 'w$i', sag: 'k$i'),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      );
      final r = UniteRehberi.uret(cok, 0)!;
      expect(r.kaliplar.length, UniteRehberi.enCokKalip);
      expect(r.cumleler.length, lessThanOrEqualTo(UniteRehberi.enCokCumle));
      expect(r.kelimeler.length, UniteRehberi.enCokKelime);
    });

    test('metin() başlıkları ve satırları içerir', () {
      final k = _kurs(
        'ingilizce-1',
        KursAlani.dil,
        ad: 'İngilizce A1: Başlangıç',
      );
      final m = UniteRehberi.uret(k, 0)!.metin();
      expect(
        m,
        startsWith('Ünite rehberi: Selamlaşma (İngilizce A1: Başlangıç, A1)'),
      );
      expect(
        m,
        contains('Anahtar kalıplar\n- Nice to meet you: Tanıştığımıza'),
      );
      expect(
        m,
        contains('Örnek cümleler\n- I would like a cup of tea please: Bir'),
      );
      expect(m, contains('Anahtar kelimeler\n- Hello: Merhaba'));
    });

    test('gerçek içerik: her dil kursunun her ünitesinde rehber derlenir', () {
      for (final kurs in tumKurslar.where((k) => k.alan == KursAlani.dil)) {
        expect(UniteRehberi.cefrBul(kurs), isNotNull, reason: kurs.ad);
        for (var i = 0; i < kurs.uniteler.length; i++) {
          final r = UniteRehberi.uret(kurs, i)!;
          expect(r.bos, isFalse, reason: '${kurs.id} ünite $i');
        }
      }
    });
  });

  group('arayüz', () {
    testWidgets('ünite başlığında rehber düğmesi; ekran ve kopyalama', (
      tester,
    ) async {
      final k = _kurs(
        'ingilizce-1',
        KursAlani.dil,
        ad: 'İngilizce A1: Başlangıç',
      );
      String? pano;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (c) async {
          if (c.method == 'Clipboard.setData') {
            pano = (c.arguments as Map)['text'] as String?;
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
      final ses = SahteSes();
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [k],
        ses: ses,
      );
      // Ünite bitmemiş olsa da rehber açılır (ünite başında).
      await dokun(
        tester,
        find.byKey(const ValueKey('unite-rehberi-ingilizce-1.u1')),
      );
      expect(find.text('Ünite rehberi'), findsOneWidget);
      expect(find.text('Selamlaşma'), findsOneWidget);
      expect(find.text('CEFR A1'), findsOneWidget);
      expect(find.text('2 ders'), findsOneWidget);
      expect(find.text('Anahtar kalıplar'), findsOneWidget);
      expect(find.text('Örnek cümleler'), findsOneWidget);
      expect(find.text('Anahtar kelimeler'), findsOneWidget);
      expect(find.text('Dilbilgisi notları'), findsOneWidget);
      expect(tester.takeException(), isNull);
      // Dar pencere ve büyük metin ölçeği: taşma yok.
      tester.view.physicalSize = const Size(480, 600);
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      // Sesli okuma: ilk kalıp.
      await dokun(tester, find.byKey(const ValueKey('rehber-kalip-0')));
      expect(ses.okunanlar, ['Nice to meet you']);
      // Kopyala.
      await dokun(tester, find.byKey(const ValueKey('rehber-kopyala')));
      expect(pano, contains('Ünite rehberi: Selamlaşma'));
      expect(find.text('Rehber kopyalandı'), findsOneWidget);
      // Ünite bitmedi: özet bağlantısı yok.
      expect(find.byKey(const ValueKey('rehber-ozet')), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('ünite bitince rehberde özet bağlantısı çıkar', (tester) async {
      final k = _kurs('ingilizce-1', KursAlani.dil);
      await uygulamayiAc(
        tester,
        BellekDepo(
          const OgrenciDurumu(
            alan: 'dil',
            tamamlanan: {'ingilizce-1.u1.d1': 1, 'ingilizce-1.u1.d2': 1},
          ),
        ),
        kurslar: [k],
      );
      await dokun(
        tester,
        find.byKey(const ValueKey('unite-rehberi-ingilizce-1.u1')),
      );
      expect(find.byKey(const ValueKey('rehber-ozet')), findsOneWidget);
      // İngilizce kursu için senaryo bağlantısı da var.
      expect(find.byKey(const ValueKey('rehber-senaryo')), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('rehber-ozet')));
      expect(find.text('Ünite özeti'), findsWidgets);
    });

    testWidgets('kod kursunda sesli okuma düğmesi yok', (tester) async {
      final k = _kurs('html-9', KursAlani.kod);
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'kod')),
        kurslar: [k],
      );
      await dokun(
        tester,
        find.byKey(const ValueKey('unite-rehberi-html-9.u1')),
      );
      expect(find.byIcon(Icons.volume_up_outlined), findsNothing);
      expect(find.text('Anahtar söz dizimi'), findsOneWidget);
      expect(find.byKey(const ValueKey('rehber-senaryo')), findsNothing);
    });
  });
}
