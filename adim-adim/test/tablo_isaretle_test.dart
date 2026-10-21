/// Yeni alıştırma türleri Tablo (çekim tablosu tamamlama) ve Isaretle (cümlede
/// doğru kelimelere dokunma) ile derse bağlı dilbilgisi notu kartı: JSON
/// gidiş-dönüş, doğrulama, ipucu, SRS/quiz/serpiştirme akışları, arayüz
/// (seçenekli/yazılı tablo, çoklu işaretleme, Semantics) ve 480x600 @1,5
/// ölçekte taşmama.
library;

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/icerik/ingilizce_a1.dart';
import 'package:adim_adim/icerik/js_1.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _secenekli = Tablo(
  soru: 'Be fiili tablosunu tamamla.',
  baslik: ['Özne', 'Be fiili', 'Kısaltma'],
  satirlar: [
    ['I', 'am', "I'm"],
    ['you', 'are', "you're"],
    ['she', 'is', "she's"],
  ],
  bos: [(satir: 0, sutun: 1), (satir: 2, sutun: 1)],
  secenekler: ['am', 'is', 'are'],
  aciklama: 'I ile am, she ile is.',
);

const _yazili = Tablo(
  soru: 'Tabloyu yazarak tamamla.',
  baslik: ['Özne', 'Fiil'],
  satirlar: [
    ['he', 'goes'],
    ['they', 'go'],
  ],
  bos: [(satir: 0, sutun: 1), (satir: 1, sutun: 1)],
);

const _isaret = Isaretle(
  soru: 'Fiilleri işaretle.',
  cumle: 'I like tea and she likes coffee.',
  dogru: [1, 5],
  aciklama: 'like ve likes fiildir.',
);

Widget _oturum(
  List<Alistirma> liste, {
  void Function(int, bool)? onSonuc,
  void Function(int, int)? onBitti,
}) => MaterialApp(
  theme: acikTema(),
  home: Scaffold(
    body: AlistirmaOturumu(
      alistirmalar: liste,
      onSonuc: onSonuc ?? (_, _) {},
      onBitti: onBitti ?? (_, _) {},
      onKapat: () {},
    ),
  ),
);

Future<void> _kucukEkran(WidgetTester tester) async {
  tester.view.physicalSize = const Size(480, 600);
  tester.view.devicePixelRatio = 1;
  tester.platformDispatcher.textScaleFactorTestValue = 1.5;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
}

void main() {
  group('model', () {
    test('JSON gidiş-dönüş', () {
      for (final a in [_secenekli, _yazili, _isaret]) {
        final geri = Alistirma.fromJson(a.toJson());
        expect(geri.toJson(), a.toJson());
        expect(geri.runtimeType, a.runtimeType);
      }
      expect(_yazili.toJson().containsKey('secenekler'), isFalse);
    });

    test('Isaretle kelimeleri boşluğa göre böler', () {
      expect(_isaret.kelimeler, [
        'I',
        'like',
        'tea',
        'and',
        'she',
        'likes',
        'coffee.',
      ]);
    });
  });

  group('doğrulama', () {
    test('Tablo: normalize eşleşme, eksik/yanlış reddedilir', () {
      expect(Motor.cevapDogruMu(_secenekli, ['am', 'is']), isTrue);
      expect(Motor.cevapDogruMu(_secenekli, ['AM ', ' Is.']), isTrue);
      expect(Motor.cevapDogruMu(_secenekli, ['is', 'am']), isFalse);
      expect(Motor.cevapDogruMu(_secenekli, ['am']), isFalse);
      expect(Motor.cevapDogruMu(_secenekli, ['am', '']), isFalse);
      expect(Motor.cevapDogruMu(_secenekli, null), isFalse);
      expect(Motor.cevapDogruMu(_secenekli, 3), isFalse);
      expect(Motor.cevapDogruMu(_secenekli, ['am', 2]), isFalse);
    });

    test('Isaretle: küme eşitliği, sıra önemsiz, fazla/eksik yanlış', () {
      expect(Motor.cevapDogruMu(_isaret, [1, 5]), isTrue);
      expect(Motor.cevapDogruMu(_isaret, [5, 1]), isTrue);
      expect(Motor.cevapDogruMu(_isaret, [1]), isFalse);
      expect(Motor.cevapDogruMu(_isaret, [1, 5, 2]), isFalse);
      expect(Motor.cevapDogruMu(_isaret, [1, 1]), isFalse);
      expect(Motor.cevapDogruMu(_isaret, <int>[]), isFalse);
      expect(Motor.cevapDogruMu(_isaret, null), isFalse);
      expect(Motor.cevapDogruMu(_isaret, ['like']), isFalse);
    });

    test('dogruCevapMetni ve ipucu adımları', () {
      expect(Motor.dogruCevapMetni(_secenekli), 'am, is');
      expect(Motor.dogruCevapMetni(_isaret), 'like likes');
      expect(Motor.ipucuUret(_secenekli, 0), 'I ile am, she ile is.');
      expect(Motor.ipucuUret(_yazili, 0), contains('örüntü'));
      expect(Motor.ipucuUret(_yazili, 1), contains('"g" ile başlar'));
      expect(Motor.ipucuUret(_isaret, 1), 'Doğru kelime sayısı: 2');
      expect(Motor.ipucuUret(_isaret, 2), 'Çözüm: like likes');
    });
  });

  group('SRS / quiz / serpiştirme', () {
    final ders = Ders(
      id: 'x-1.u1.d1',
      ad: 'D',
      alistirmalar: [_secenekli, _isaret, _yazili],
    );

    test('kartIsle yeni türlerin kartını işler; hata defterine yazılır', () {
      var d = const OgrenciDurumu(alan: 'dil');
      d = Motor.kartIsle(d, ders.kartKimligi(0), false, '2026-10-15');
      d = Motor.kartIsle(d, ders.kartKimligi(1), true, '2026-10-15');
      expect(
        d.kartlar.keys,
        containsAll([ders.kartKimligi(0), ders.kartKimligi(1)]),
      );
      expect(d.hatalar, isNotEmpty);
    });

    test('quizSec ve serpistirmeSec yeni türlerle çökmez', () {
      expect(Motor.quizSec(ders, [1]).first.alistirma, same(_isaret));
      final kurs = Kurs(
        id: 'x-1',
        ad: 'K',
        aciklama: '',
        alan: KursAlani.dil,
        uniteler: [
          Unite(id: 'x-1.u1', ad: 'U1', dersler: [ders]),
          Unite(
            id: 'x-1.u2',
            ad: 'U2',
            dersler: [
              Ders(id: 'x-1.u2.d1', ad: 'D2', alistirmalar: [_isaret]),
            ],
          ),
        ],
      );
      final secilen = Motor.serpistirmeSec([kurs], 'x-1.u2.d1');
      expect(secilen.length, 3);
    });
  });

  group('gerçek içerik', () {
    test(
      'en az bir İngilizce ve bir kod dersinde yeni türler var ve geçerli',
      () {
        for (final k in [ingilizceA1, js1]) {
          final liste = k.tumDersler.expand((d) => d.alistirmalar).toList();
          expect(liste.whereType<Tablo>(), isNotEmpty, reason: k.id);
          expect(liste.whereType<Isaretle>(), isNotEmpty, reason: k.id);
          for (final t in liste.whereType<Tablo>()) {
            expect(t.bos, isNotEmpty);
            for (final b in t.bos) {
              expect(b.sutun, inInclusiveRange(1, t.baslik.length - 1));
              expect(t.hucre(b), isNotEmpty);
            }
            for (final s in t.satirlar) {
              expect(s.length, t.baslik.length);
            }
            if (t.secenekler.isNotEmpty) {
              for (final b in t.bos) {
                expect(t.secenekler, contains(t.hucre(b)));
              }
            }
          }
          for (final i in liste.whereType<Isaretle>()) {
            expect(i.dogru, isNotEmpty);
            for (final n in i.dogru) {
              expect(n, inInclusiveRange(0, i.kelimeler.length - 1));
            }
          }
        }
        expect(
          ingilizceA1.tumDersler.where((d) => d.dilbilgisiNotu != null),
          isNotEmpty,
        );
      },
    );
  });

  group('arayüz', () {
    testWidgets('seçenekli Tablo: hücre seç, doldur, Kontrol et', (
      tester,
    ) async {
      final sonuclar = <(int, bool)>[];
      await tester.pumpWidget(
        _oturum([_secenekli], onSonuc: (i, d) => sonuclar.add((i, d))),
      );
      await tester.pumpAndSettle();
      expect(find.text('Be fiili tablosunu tamamla.'), findsOneWidget);
      // Eksikken Kontrol et pasif.
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      // İlk boş hücre otomatik aktif: am, sonra sıradaki boş: is.
      await dokun(tester, find.widgetWithText(InkWell, 'am').last);
      await dokun(tester, find.widgetWithText(InkWell, 'is').last);
      expect(find.bySemanticsLabel(RegExp('I, Be fiili: am')), findsOneWidget);
      await dokun(tester, find.text('Kontrol et'));
      expect(find.text('Doğru!'), findsOneWidget);
      expect(sonuclar, [(0, true)]);
    });

    testWidgets('seçenekli Tablo: yanlış doldurma, doğru cevap bantta', (
      tester,
    ) async {
      await tester.pumpWidget(_oturum([_secenekli]));
      await tester.pumpAndSettle();
      await dokun(tester, find.widgetWithText(InkWell, 'are').last);
      await dokun(tester, find.widgetWithText(InkWell, 'are').last);
      await dokun(tester, find.text('Kontrol et'));
      expect(find.text('Yanlış'), findsOneWidget);
      expect(find.textContaining('Doğru cevap: am, is'), findsOneWidget);
    });

    testWidgets('yazılı Tablo: boşlukları yaz, Kontrol et', (tester) async {
      await tester.pumpWidget(_oturum([_yazili]));
      await tester.pumpAndSettle();
      final alanlar = find.byType(TextField);
      expect(alanlar, findsNWidgets(2));
      await tester.enterText(alanlar.at(0), 'Goes');
      await tester.pump();
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      await tester.enterText(alanlar.at(1), 'go');
      await tester.pump();
      await dokun(tester, find.text('Kontrol et'));
      expect(find.text('Doğru!'), findsOneWidget);
    });

    testWidgets('Isaretle: çoklu seçim, geri alma, doğru ve yanlış', (
      tester,
    ) async {
      final sonuclar = <(int, bool)>[];
      await tester.pumpWidget(
        _oturum([_isaret, _isaret], onSonuc: (i, d) => sonuclar.add((i, d))),
      );
      await tester.pumpAndSettle();
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      await dokun(tester, find.text('like'));
      await dokun(tester, find.text('tea'));
      await dokun(tester, find.text('tea')); // geri al
      await dokun(tester, find.text('likes'));
      expect(find.bySemanticsLabel('like, seçili'), findsOneWidget);
      await dokun(tester, find.text('Kontrol et'));
      expect(find.text('Doğru!'), findsOneWidget);
      await dokun(tester, find.text('Devam'));
      // İkinci soru: yalnız bir doğru kelime seçilirse yanlış.
      await dokun(tester, find.text('like'));
      await dokun(tester, find.text('Kontrol et'));
      expect(find.text('Yanlış'), findsOneWidget);
      expect(find.textContaining('Doğru cevap: like likes'), findsOneWidget);
      expect(sonuclar, [(0, true), (1, false)]);
    });

    testWidgets('ipucu akışı yeni türde çalışır', (tester) async {
      await tester.pumpWidget(_oturum([_isaret]));
      await tester.pumpAndSettle();
      await dokun(tester, find.text('tea'));
      await dokun(tester, find.text('Kontrol et'));
      await dokun(tester, find.byKey(const Key('ipucu-al')));
      expect(find.textContaining('like ve likes fiildir.'), findsWidgets);
    });

    testWidgets('480x600 @1,5 ölçek: taşma yok (Tablo + Isaretle)', (
      tester,
    ) async {
      await _kucukEkran(tester);
      for (final a in [_secenekli, _yazili, _isaret]) {
        await tester.pumpWidget(const SizedBox());
        await tester.pumpWidget(_oturum([a]));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: a.tur);
        // Cevapla, kontrol et: bant da taşmamalı.
        if (a is Isaretle) {
          await dokun(tester, find.text('like'));
        } else if (a is Tablo && a.secenekler.isNotEmpty) {
          await dokun(tester, find.widgetWithText(InkWell, 'are').last);
          await dokun(tester, find.widgetWithText(InkWell, 'are').last);
        } else {
          await tester.enterText(find.byType(TextField).at(0), 'x');
          await tester.enterText(find.byType(TextField).at(1), 'y');
          await tester.pump();
        }
        await dokun(tester, find.text('Kontrol et'));
        expect(tester.takeException(), isNull, reason: a.tur);
      }
    });
  });

  group('dilbilgisi notu kartı', () {
    final kurs = Kurs(
      id: 'dn-1',
      ad: 'DN',
      aciklama: '',
      alan: KursAlani.dil,
      uniteler: [
        Unite(
          id: 'dn-1.u1',
          ad: 'U',
          dersler: [
            const Ders(
              id: 'dn-1.u1.d1',
              ad: 'Notlu Ders',
              dilbilgisiNotu: 'I ile am, you ile are kullanılır.',
              alistirmalar: [
                Secim(soru: 'Soru bir?', secenekler: ['a', 'b'], dogru: 0),
              ],
            ),
            const Ders(
              id: 'dn-1.u1.d2',
              ad: 'Notsuz Ders',
              alistirmalar: [
                Secim(soru: 'Soru iki?', secenekler: ['a', 'b'], dogru: 0),
              ],
            ),
          ],
        ),
      ],
    );

    testWidgets('notlu derste kart önce gelir, Başla ile alıştırmaya geçer', (
      tester,
    ) async {
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [kurs],
      );
      await dokun(tester, find.textContaining('Notlu Ders'));
      expect(find.byKey(const Key('dilbilgisi-notu')), findsOneWidget);
      expect(find.text('I ile am, you ile are kullanılır.'), findsOneWidget);
      expect(find.text('Soru bir?'), findsNothing);
      await dokun(tester, find.byKey(const Key('dilbilgisi-basla')));
      expect(find.byKey(const Key('dilbilgisi-notu')), findsNothing);
      expect(find.text('Soru bir?'), findsOneWidget);
    });

    testWidgets('notsuz derste kart yok', (tester) async {
      final notsuz = Kurs(
        id: 'dn-2',
        ad: 'DN2',
        aciklama: '',
        alan: KursAlani.dil,
        uniteler: [
          Unite(
            id: 'dn-2.u1',
            ad: 'U',
            dersler: [kurs.uniteler.first.dersler.last],
          ),
        ],
      );
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [notsuz],
      );
      await dokun(tester, find.textContaining('Notsuz Ders'));
      expect(find.byKey(const Key('dilbilgisi-notu')), findsNothing);
      expect(find.text('Soru iki?'), findsOneWidget);
    });

    testWidgets('480x600 @1,5 ölçek: not kartı taşmaz', (tester) async {
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [kurs],
      );
      await dokun(tester, find.textContaining('Notlu Ders'));
      tester.view.physicalSize = const Size(480, 600);
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.byKey(const Key('dilbilgisi-basla')), findsOneWidget);
    });
  });
}
