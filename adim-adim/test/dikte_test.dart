// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
// yazan: [Claude#dikte]
/// Ders içi dikte alıştırması (SADE madde 3): model gidiş-dönüş, cevap
/// kontrolü (doğru / normalize / yanlış), Motor.dikteFarki (üç durum),
/// içerik doğrulama (en az 3 İngilizce + 2 Almanca; cümle kelimeleri derste
/// geçer; özgün) ve oturum içinde widget akışı (ses düğmesi + fark satırı).
library;

import 'dart:convert';

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/ders_meta.dart';
import 'package:adim_adim/motor/ders_ogeleri.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/servis/ses.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _dikte = Dikte(
  soru: 'Dinle ve duyduğun cümleyi yaz.',
  metin: 'I have English class on Friday.',
  aciklama: 'Günlerin önünde on gelir.',
);

List<String> _kelimeler(String s) => s
    .toLowerCase()
    .split(RegExp(r'[^\p{L}\p{N}\x27]+', unicode: true))
    .where((k) => k.isNotEmpty)
    .toList();

void main() {
  group('model', () {
    test('JSON gidiş-dönüş (varsayılan cevaplar ve sesDili yazılmaz)', () {
      final j = _dikte.toJson();
      expect(j['tur'], 'dikte');
      expect(j.containsKey('cevaplar'), isFalse);
      expect(j.containsKey('sesDili'), isFalse);
      final geri = Alistirma.fromJson(
        (jsonDecode(jsonEncode(j)) as Map).cast<String, Object?>(),
      );
      expect(geri, isA<Dikte>());
      final d = geri as Dikte;
      expect(d.metin, _dikte.metin);
      expect(d.sesDili, isNull);
      expect(d.cevaplar, [_dikte.metin]);
      expect(jsonEncode(d.toJson()), jsonEncode(j));
    });

    test('açık cevaplar ve sesDili korunur', () {
      const d = Dikte(
        soru: 's',
        metin: 'Hallo, wie geht es dir?',
        sesDili: 'de-DE',
        cevaplar: ['Hallo, wie geht es dir?', 'Hallo wie geht es dir?'],
        ipuclari: ['ip'],
      );
      final geri =
          Alistirma.fromJson(
                (jsonDecode(jsonEncode(d.toJson())) as Map)
                    .cast<String, Object?>(),
              )
              as Dikte;
      expect(geri.sesDili, 'de-DE');
      expect(geri.cevaplar, d.cevaplar);
      expect(geri.ipuclari, ['ip']);
      expect(jsonEncode(geri.toJson()), jsonEncode(d.toJson()));
    });
  });

  group('kontrol', () {
    test('doğru, normalize edilmiş doğru ve yanlış', () {
      expect(
        Motor.cevapDogruMu(_dikte, 'I have English class on Friday.'),
        isTrue,
      );
      expect(
        Motor.cevapDogruMu(_dikte, '  i have  english class on friday '),
        isTrue,
      );
      expect(
        Motor.cevapDogruMu(_dikte, 'I have English class on Monday.'),
        isFalse,
      );
      expect(Motor.cevapDogruMu(_dikte, ''), isFalse);
      expect(Motor.cevapDogruMu(_dikte, 3), isFalse);
    });

    test('alternatif yazım kabul edilir', () {
      const d = Dikte(
        soru: 's',
        metin: 'Hallo, wie geht es dir?',
        cevaplar: ['Hallo, wie geht es dir?', 'Hallo wie geht es dir?'],
      );
      expect(Motor.cevapDogruMu(d, 'hallo wie geht es dir'), isTrue);
    });

    test('doğru cevap metni, ipuçları ve meta', () {
      expect(Motor.dogruCevapMetni(_dikte), _dikte.metin);
      expect(Motor.ipucuUret(_dikte, 0), isNotEmpty);
      expect(Motor.ipucuUret(_dikte, 1), contains('6 kelime'));
      expect(Motor.ipucuUret(_dikte, 1), contains('I'));
      expect(Motor.ipucuUret(_dikte, 2), contains(_dikte.metin));
      expect(DersMeta.adim(_dikte).zorluk, Zorluk.orta);
    });
  });

  group('dikteFarki', () {
    test('tam doğru: fark yok', () {
      final f = Motor.dikteFarki(
        _dikte.metin,
        'i have english class on friday',
      );
      expect(f.every((k) => k.durum == DikteDurum.dogru), isTrue);
      expect(f.length, 6);
      expect(Motor.dikteFarkMetni(f), '');
    });

    test('eksik kelime', () {
      final f = Motor.dikteFarki(
        'I have English class on Friday.',
        'I have class on Friday',
      );
      expect(f, contains(const DikteKelime('English', DikteDurum.eksik)));
      expect(f.where((k) => k.durum == DikteDurum.fazla), isEmpty);
      expect(Motor.dikteFarkMetni(f), 'Eksik: English');
    });

    test('yanlış kelime: eksik + fazla; cümle sırası, eksikler önce', () {
      final f = Motor.dikteFarki(
        'I have English class on Friday.',
        'I have English class in Monday',
      );
      expect(f, [
        const DikteKelime('I', DikteDurum.dogru),
        const DikteKelime('have', DikteDurum.dogru),
        const DikteKelime('English', DikteDurum.dogru),
        const DikteKelime('class', DikteDurum.dogru),
        const DikteKelime('on', DikteDurum.eksik),
        const DikteKelime('Friday.', DikteDurum.eksik),
        const DikteKelime('in', DikteDurum.fazla),
        const DikteKelime('Monday', DikteDurum.fazla),
      ]);
      expect(Motor.dikteFarkMetni(f), 'Eksik: on, Friday. · Fazla: in, Monday');
      // Boş yazım: hepsi eksik.
      expect(
        Motor.dikteFarki(
          'Ich spreche schon Deutsch.',
          '',
        ).map((k) => k.durum).toSet(),
        {DikteDurum.eksik},
      );
    });
  });

  group('içerik', () {
    final dersler = tumKurslar.expand((k) => k.tumDersler).toList();

    test(
      'en az 3 İngilizce ve 2 Almanca derste dikte; ders başına en çok 1',
      () {
        var en = 0, de = 0;
        for (final d in dersler) {
          final n = d.alistirmalar.whereType<Dikte>().length;
          expect(n, lessThanOrEqualTo(1), reason: d.id);
          if (n == 0) continue;
          if (d.id.startsWith('ingilizce-1.') ||
              d.id.startsWith('ingilizce-2.')) {
            en++;
          }
          if (d.id.startsWith('almanca-1.')) de++;
        }
        expect(en, greaterThanOrEqualTo(3));
        expect(de, greaterThanOrEqualTo(2));
      },
    );

    test('dikte cümlesi özgün, kelimeleri derste geçer, açıklama dolu', () {
      final metinler = <String>[];
      for (final d in dersler) {
        for (final a in d.alistirmalar.whereType<Dikte>()) {
          metinler.add(a.metin);
          expect(a.aciklama?.trim(), isNotEmpty, reason: d.id);
          expect(a.cevaplar, contains(a.metin), reason: d.id);
          final digerleri = d.alistirmalar.where((x) => !identical(x, a));
          final havuz = <String>{};
          final metinJson = StringBuffer();
          for (final x in digerleri) {
            final j = jsonEncode(x.toJson());
            metinJson.write(j);
            havuz.addAll(_kelimeler(j));
          }
          for (final k in _kelimeler(a.metin)) {
            expect(havuz, contains(k), reason: '${d.id}: "$k"');
          }
          // Cümle derste olduğu gibi (bir başka alıştırmanın metni olarak) geçmez.
          final govde = a.metin.replaceAll(RegExp(r'[.!?]$'), '');
          expect(metinJson.toString(), isNot(contains(govde)), reason: d.id);
        }
      }
      expect(metinler.toSet().length, metinler.length);
    });

    test('Almanca dikte de-DE; İngilizce dikte kurs diline düşer', () {
      for (final k in tumKurslar) {
        for (final d in k.tumDersler) {
          for (final a in d.alistirmalar.whereType<Dikte>()) {
            final dil = a.sesDili ?? DersOgeleri.kursSesDili(k.id);
            expect(
              dil,
              k.id.startsWith('almanca') ? 'de-DE' : 'en-US',
              reason: d.id,
            );
          }
        }
      }
    });

    test('ders öğeleri ve ünite özeti dikte metnini kalıp olarak alır', () {
      final k = ingilizceA1;
      final d = k.dersBul('ingilizce-1.u5.d3')!;
      final ogeler = DersOgeleri.uret(d, alan: k.alan);
      expect(
        ogeler.ogeler.map((o) => o.metin),
        contains('I have English class on Friday.'),
      );
      final unite = k.uniteler.firstWhere((u) => u.dersler.contains(d));
      final ozet = Motor.uniteOzeti(k, k.uniteler.indexOf(unite));
      expect(ozet.kaliplar, contains('I have English class on Friday.'));
    });
  });

  group('arayüz', () {
    Future<SahteSes> ac(WidgetTester tester) async {
      tester.view.physicalSize = const Size(500, 1600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final ses = SahteSes();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            depoProvider.overrideWithValue(
              BellekDepo(const OgrenciDurumu(alan: 'dil')),
            ),
            sesProvider.overrideWithValue(ses),
          ],
          child: MaterialApp(
            theme: acikTema(),
            home: Scaffold(
              body: SafeArea(
                child: AlistirmaOturumu(
                  alistirmalar: const [_dikte],
                  onSonuc: (_, _) {},
                  onBitti: (_, _) {},
                  onKapat: () {},
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      return ses;
    }

    testWidgets('ses düğmesi okur; yanlış cevapta fark satırı görünür', (
      tester,
    ) async {
      final ses = await ac(tester);
      await dokun(tester, find.byKey(const Key('dikte-normal')));
      expect(ses.okunanlar, ['I have English class on Friday.']);
      await dokun(tester, find.byKey(const Key('dikte-yavas')));
      expect(ses.hizlar.last, Ses.yavasHiz);
      expect(find.byKey(const Key('dikte-fark')), findsNothing);
      await tester.enterText(
        find.byKey(const Key('dikte-giris')),
        'I have class in Friday',
      );
      await dokun(tester, find.text('Kontrol et'));
      expect(find.byKey(const Key('dikte-fark')), findsOneWidget);
      expect(find.text('Eksik: English, on · Fazla: in'), findsOneWidget);
      expect(
        find.textContaining('I have English class on Friday.'),
        findsWidgets,
      );
    });

    testWidgets('doğru cevapta fark satırı yok', (tester) async {
      await ac(tester);
      await tester.enterText(
        find.byKey(const Key('dikte-giris')),
        'i have english class on friday',
      );
      await dokun(tester, find.text('Kontrol et'));
      expect(find.byKey(const Key('dikte-fark')), findsNothing);
      expect(find.text('Bitir'), findsOneWidget);
    });
  });
}
