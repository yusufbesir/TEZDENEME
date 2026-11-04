// Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga13]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Arapça A1 kursu: yapı, Arapça yazı kuralları, ses dili, sözlük ve dil
/// tanımı; sağdan sola (RTL) yön ve 360x640 / ölçek 1,5 taşma testleri.
library;

import 'package:adim_adim/bilesenler/alistirma/alistirma_karti.dart';
import 'package:adim_adim/bilesenler/alistirma/yon.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/ders_ogeleri.dart';
import 'package:adim_adim/motor/dinle_yaz.dart';
import 'package:adim_adim/sozluk/dil_tanimi.dart';
import 'package:adim_adim/sozluk/sozluk.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

final RegExp _arapca = RegExp('[؀-ۿ]');

Future<void> _ciz(
  WidgetTester tester,
  Alistirma a, {
  Size boyut = const Size(360, 640),
  double olcek = 1.5,
}) async {
  tester.view.physicalSize = boyut;
  tester.view.devicePixelRatio = 1;
  tester.platformDispatcher.textScaleFactorTestValue = olcek;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        depoProvider.overrideWithValue(
          BellekDepo(const OgrenciDurumu(alan: 'dil')),
        ),
        sesProvider.overrideWithValue(SahteSes()),
      ],
      child: MaterialApp(
        theme: acikTema(),
        home: Scaffold(
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: AlistirmaKarti(
              alistirma: a,
              kontrolEdildi: false,
              dogruMu: false,
              onCevap: (_) {},
              onGonder: () {},
            ),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  test('yapı: 4 ünite x 3 ders, kimlikler önekli, 9-10 alıştırma', () {
    expect(arapcaA1.id, 'arapca-1');
    expect(arapcaA1.ad, 'Arapça A1: Başlangıç');
    expect(arapcaA1.alan, KursAlani.dil);
    expect(kursBul('arapca-1'), same(arapcaA1));
    expect(arapcaA1.uniteler.length, 4);
    expect(arapcaA1.tumDersler.length, 12);
    for (final u in arapcaA1.uniteler) {
      expect(u.id, startsWith('arapca-1.u'));
      expect(u.dersler.length, 3, reason: u.id);
      for (final d in u.dersler) {
        expect(d.id, startsWith('${u.id}.d'));
        expect(d.dilbilgisiNotu, isNotEmpty, reason: d.id);
        expect(d.alistirmalar.length, inInclusiveRange(9, 10), reason: d.id);
        expect(
          d.alistirmalar.map((a) => a.tur).toSet().length,
          greaterThanOrEqualTo(5),
          reason: d.id,
        );
      }
    }
  });

  test('her derste Dinle (ar-SA, 3 benzersiz Arapça seçenek) ve Yaz var', () {
    for (final d in arapcaA1.tumDersler) {
      final dinle = d.alistirmalar.whereType<Dinle>().toList();
      expect(dinle, isNotEmpty, reason: d.id);
      for (final a in dinle) {
        expect(a.dil, 'ar-SA', reason: d.id);
        expect(a.secenekler.length, 3, reason: d.id);
        expect(a.secenekler.toSet().length, 3, reason: d.id);
        expect(a.secenekler[a.dogru], a.okunacak, reason: d.id);
        expect(_arapca.hasMatch(a.okunacak), isTrue, reason: d.id);
        // Ses motoruna parantezsiz düz Arapça gider.
        expect(a.okunacak, isNot(contains('(')), reason: d.id);
      }
      expect(d.alistirmalar.whereType<Yaz>(), isNotEmpty, reason: d.id);
    }
  });

  test(
    'Yaz: klavye gerekmez (ilk cevap Arapça değil), Arapça da kabul edilir',
    () {
      for (final a in arapcaA1.tumDersler.expand((d) => d.alistirmalar)) {
        if (a is! Yaz) continue;
        expect(a.cevaplar, isNotEmpty, reason: a.soru);
        expect(_arapca.hasMatch(a.cevaplar.first), isFalse, reason: a.soru);
      }
    },
  );

  test('Eşleştir solunda Arapça sözcüğün yanında Latin okunuş var', () {
    final okunus = RegExp(r'\([A-Za-zçğıöşüÇĞİÖŞÜ \-]+\)\s*$');
    for (final a in arapcaA1.tumDersler.expand((d) => d.alistirmalar)) {
      if (a is! Eslestir) continue;
      for (final c in a.ciftler) {
        if (_arapca.hasMatch(c.sol) && c.sol.length > 3) {
          expect(c.sol, matches(okunus), reason: c.sol);
        }
      }
    }
  });

  test(
    'Arapça sözcüğün hemen ardına nokta konmaz (bidi düzeni bozulmasın)',
    () {
      final bozuk = RegExp('[؀-ۿ]\\.');
      for (final a in arapcaA1.tumDersler.expand((d) => d.alistirmalar)) {
        final metinler = <String>[
          a.soru,
          ...switch (a) {
            Secim() => a.secenekler,
            Bosluk() => a.secenekler,
            Sirala() => [...a.kelimeler, ...a.dogru],
            Isaretle() => [a.cumle],
            _ => const <String>[],
          },
        ];
        for (final m in metinler) {
          expect(bozuk.hasMatch(m), isFalse, reason: m);
        }
      }
    },
  );

  test('Tablo, İşaretle, Sırala, Seçim, Boşluk ve Eşleştir tutarlı', () {
    for (final d in arapcaA1.tumDersler) {
      for (final a in d.alistirmalar) {
        switch (a) {
          case Tablo():
            for (final b in a.bos) {
              expect(a.secenekler, contains(a.hucre(b)), reason: d.id);
            }
          case Isaretle():
            for (final i in a.dogru) {
              expect(i, lessThan(a.kelimeler.length), reason: a.cumle);
            }
          case Sirala():
            expect([...a.kelimeler]..sort(), [...a.dogru]..sort());
            expect(a.kelimeler.join(' '), isNot(a.dogru.join(' ')));
          case Secim():
            expect(a.dogru, inInclusiveRange(0, a.secenekler.length - 1));
            expect(a.secenekler.toSet().length, a.secenekler.length);
          case Bosluk():
            expect(a.soru, contains('___'));
            expect(a.dogru, inInclusiveRange(0, a.secenekler.length - 1));
            expect(a.secenekler.toSet().length, a.secenekler.length);
          case Eslestir():
            expect(a.ciftler.length, inInclusiveRange(3, 5));
            expect(
              a.ciftler.map((c) => c.sol).toSet().length,
              a.ciftler.length,
            );
            expect(
              a.ciftler.map((c) => c.sag).toSet().length,
              a.ciftler.length,
            );
          default:
            break;
        }
      }
    }
  });

  test('ses dili, dil tanımı, Dinle-yaz dışı ve sözlük', () {
    expect(DersOgeleri.kursSesDili('arapca-1'), 'ar-SA');
    expect(DinleYaz.latinMi('ar-SA'), isFalse);
    expect(kursDilKodu(arapcaA1), 'ar');
    expect(Sozluk.kursDili(arapcaA1), 'ar');
    final t = dilTanimi('ar')!;
    expect(t.ad, 'Arapça');
    expect(t.kursOnek, 'arapca');
    expect(t.ttsDili, 'ar-SA');
    expect(t.kisaAd, 'Ara.');
    final s = Sozluk.kurslardan([arapcaA1]);
    expect(s.maddeler, isNotEmpty);
    expect(s.maddeler.every((m) => m.dil == 'ar'), isTrue);
    expect(s.ara('su', dil: 'ar').map((m) => m.kelime), contains('ماء (maa)'));
  });

  test('yön yardımcısı: Arapça sağdan sola, diğerleri varsayılan', () {
    expect(sagdanSolaMi('مرحبا (marhaban)'), isTrue);
    expect(sagdanSolaMi('Hello Привет 你好 こんにちは'), isFalse);
    expect(parcaYonu(['أنا', 'طالب']), TextDirection.rtl);
    expect(parcaYonu(['I', 'am']), isNull);
    expect(parcaYonu(['Меня', 'зовут']), isNull);
  });

  group('RTL görünüm', () {
    testWidgets('Sirala: Arapça parçalar sağdan sola dizilir', (tester) async {
      const a = Sirala(
        soru: 'Cümleyi sırala.',
        kelimeler: ['طالب', 'أنا'],
        dogru: ['أنا', 'طالب'],
      );
      await _ciz(tester, a);
      await tester.tap(find.text('أنا'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('طالب'));
      await tester.pumpAndSettle();
      final ilk = tester.getTopLeft(find.text('أنا')).dx;
      final ikinci = tester.getTopLeft(find.text('طالب')).dx;
      expect(ilk, greaterThan(ikinci), reason: 'ilk seçilen sağda olmalı');
    });

    testWidgets('Sirala: Latin parçalar soldan sağa (değişmedi)', (
      tester,
    ) async {
      const a = Sirala(
        soru: 'Sentence.',
        kelimeler: ['am', 'I'],
        dogru: ['I', 'am'],
      );
      await _ciz(tester, a);
      await tester.tap(find.text('I'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('am'));
      await tester.pumpAndSettle();
      expect(
        tester.getTopLeft(find.text('I')).dx,
        lessThan(tester.getTopLeft(find.text('am')).dx),
      );
    });

    testWidgets('İşaretle: Arapça cümlenin ilk kelimesi sağdadır', (
      tester,
    ) async {
      const a = Isaretle(soru: 'İşaretle.', cumle: 'أنا من تركيا', dogru: [2]);
      await _ciz(tester, a);
      expect(
        tester.getTopLeft(find.text('أنا')).dx,
        greaterThan(tester.getTopLeft(find.text('تركيا')).dx),
      );
    });

    for (final d in arapcaA1.tumDersler) {
      testWidgets('${d.id}: 360x640, ölçek 1,5 taşma yok', (tester) async {
        for (final a in d.alistirmalar) {
          await _ciz(tester, a);
          expect(tester.takeException(), isNull, reason: '${d.id}: ${a.soru}');
        }
      });
    }

    testWidgets('320x568, ölçek 1,0 ve 1,5: tüm Arapça alıştırmalar taşmaz', (
      tester,
    ) async {
      for (final olcek in [1.0, 1.5]) {
        for (final a in arapcaA1.tumDersler.expand((d) => d.alistirmalar)) {
          await _ciz(tester, a, boyut: const Size(320, 568), olcek: olcek);
          expect(tester.takeException(), isNull, reason: a.soru);
        }
      }
    });
  });
}
