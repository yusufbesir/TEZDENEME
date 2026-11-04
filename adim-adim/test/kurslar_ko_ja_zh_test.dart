// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// ÖZELLİK 67: Korece, Japonca ve Çince A1 kursları. İçerik kuralları, Dinle/
/// Soyle `dil` alanı (JSON, TTS ve konuşma tanıma dili), CJK telaffuz
/// puanlama, sözlük ve ana sayfa/sözlük yerleşimi (480x600 @1,5).
library;

import 'dart:convert';

import 'package:adim_adim/bilesenler/alistirma/dinle.dart';
import 'package:adim_adim/bilesenler/alistirma/soyle.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/telaffuz.dart';
import 'package:adim_adim/servis/konusma.dart';
import 'package:adim_adim/sozluk/sozluk.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

/// Kurs → beklenen TTS dili.
final Map<Kurs, String> _kurslar = {
  koreceA1: 'ko-KR',
  japoncaA1: 'ja-JP',
  cinceA1: 'zh-CN',
};

/// Okuma çağrılarını dil ile birlikte kaydeden sahte ses.
class _DilliSes extends SahteSes {
  final cagrilar = <(String, String)>[];
  @override
  Future<bool> oku(String metin, {String dil = 'en-US'}) async {
    cagrilar.add((metin, dil));
    return super.oku(metin, dil: dil);
  }
}

final List<Kurs> _yediDilKursu = [
  ingilizceA1,
  ingilizceA2,
  ingilizceB1,
  ingilizceB2,
  koreceA1,
  japoncaA1,
  cinceA1,
];

void main() {
  group('içerik', () {
    test('üç kurs tumKurslar içinde, İngilizce kurslarından sonra', () {
      final idler = tumKurslar.map((k) => k.id).toList();
      expect(idler, containsAll(['korece-1', 'japonca-1', 'cince-1']));
      expect(idler.toSet().length, idler.length);
      expect(
        idler.indexOf('korece-1'),
        greaterThan(idler.indexOf('ingilizce-5')),
      );
      expect(kursBul('korece-1'), same(koreceA1));
      expect(kursBul('japonca-1'), same(japoncaA1));
      expect(kursBul('cince-1'), same(cinceA1));
      for (final k in _kurslar.keys) {
        expect(k.alan, KursAlani.dil, reason: k.id);
        expect(k.ad, endsWith('A1: Başlangıç'));
      }
    });

    test('3 ünite x 2 ders, kimlikler benzersiz ve kurs önekli', () {
      final idler = <String>[];
      for (final k in _kurslar.keys) {
        expect(k.uniteler.length, 3, reason: k.id);
        for (final u in k.uniteler) {
          expect(u.dersler.length, 2, reason: u.id);
          idler
            ..add(u.id)
            ..addAll(u.dersler.map((d) => d.id));
        }
        for (final id in idler.where((i) => i.startsWith(k.id))) {
          expect(id, startsWith('${k.id}.'));
        }
      }
      expect(idler.toSet().length, idler.length);
      expect(idler.length, 27);
    });

    test('her ders 8-10 alıştırma (Soyle hariç), karışık türler', () {
      for (final k in _kurslar.keys) {
        for (final d in k.tumDersler) {
          final sayi = d.alistirmalar.where((a) => a is! Soyle).length;
          expect(sayi, inInclusiveRange(8, 10), reason: d.id);
          final turler = d.alistirmalar.map((a) => a.tur).toSet();
          expect(turler.length, greaterThanOrEqualTo(5), reason: d.id);
        }
      }
    });

    test('her derste en az bir Dinle ve dili doğru', () {
      for (final MapEntry(key: k, value: dil) in _kurslar.entries) {
        for (final d in k.tumDersler) {
          final dinle = d.alistirmalar.whereType<Dinle>().toList();
          expect(dinle, isNotEmpty, reason: d.id);
          for (final a in dinle) {
            expect(a.dil, dil, reason: d.id);
            expect(a.secenekler.length, 3, reason: d.id);
            expect(a.secenekler[a.dogru], a.okunacak, reason: d.id);
            expect(a.secenekler.toSet().length, 3, reason: d.id);
          }
        }
      }
    });

    test(
      'Soyle yalnız 2. ve 3. ünitede, ders başına en çok bir, dili doğru',
      () {
        for (final MapEntry(key: k, value: dil) in _kurslar.entries) {
          var toplam = 0;
          for (var i = 0; i < k.uniteler.length; i++) {
            final soylel = k.uniteler[i].dersler
                .expand((d) => d.alistirmalar)
                .whereType<Soyle>()
                .toList();
            if (i == 0) {
              expect(soylel, isEmpty, reason: '${k.id} 1. ünite');
            } else {
              expect(soylel.length, 1, reason: '${k.id} ${i + 1}. ünite');
            }
            for (final s in soylel) {
              expect(s.dil, dil, reason: k.id);
              expect(s.metin.trim(), isNotEmpty);
              expect(s.ceviri.trim(), isNotEmpty);
              expect(telaffuzKelimeleri(s.metin), isNotEmpty, reason: s.metin);
            }
            toplam += soylel.length;
          }
          expect(toplam, 2, reason: k.id);
        }
      },
    );

    test('Secim/Bosluk/Dinle doğru indeksleri ve seçenekleri geçerli', () {
      for (final k in _kurslar.keys) {
        for (final a in k.tumDersler.expand((d) => d.alistirmalar)) {
          final (int dogru, List<String> sec) = switch (a) {
            Secim() => (a.dogru, a.secenekler),
            Bosluk() => (a.dogru, a.secenekler),
            Dinle() => (a.dogru, a.secenekler),
            _ => (0, const ['a', 'b']),
          };
          expect(dogru, inInclusiveRange(0, sec.length - 1), reason: a.soru);
          expect(sec.length, inInclusiveRange(2, 3), reason: a.soru);
          expect(sec.toSet().length, sec.length, reason: a.soru);
          if (a is Bosluk) expect(a.soru, contains('___'), reason: a.soru);
        }
      }
    });

    test('Eslestir çiftleri tutarlı (3-5, tekil sol/sağ, boş yok)', () {
      var sayi = 0;
      for (final k in _kurslar.keys) {
        for (final a in k.tumDersler.expand((d) => d.alistirmalar)) {
          if (a is! Eslestir) continue;
          sayi++;
          expect(a.ciftler.length, inInclusiveRange(3, 5), reason: a.soru);
          final sol = a.ciftler.map((c) => c.sol).toSet();
          final sag = a.ciftler.map((c) => c.sag).toSet();
          expect(sol.length, a.ciftler.length, reason: a.soru);
          expect(sag.length, a.ciftler.length, reason: a.soru);
          for (final c in a.ciftler) {
            expect(c.sol.trim(), isNotEmpty);
            expect(c.sag.trim(), isNotEmpty);
          }
        }
      }
      expect(sayi, 18); // her derste bir tane
    });

    test('Sirala kümesi aynı; Yaz kabul listeleri dolu ve boş dize yok', () {
      for (final k in _kurslar.keys) {
        for (final a in k.tumDersler.expand((d) => d.alistirmalar)) {
          if (a is Sirala) {
            expect(
              [...a.kelimeler]..sort(),
              [...a.dogru]..sort(),
              reason: a.soru,
            );
            expect(a.kelimeler.join(), isNot(a.dogru.join()), reason: a.soru);
          }
          if (a is Yaz) {
            expect(a.cevaplar, isNotEmpty, reason: a.soru);
            expect(a.cevaplar.every((c) => c.trim().isNotEmpty), isTrue);
          }
        }
      }
    });

    test(
      'ilk ünitelerin adı "Yazı sistemi" içerir ve Yaz/Eslestir/Sirala var',
      () {
        for (final k in _kurslar.keys) {
          final u = k.uniteler.first;
          expect(u.ad, contains('Yazı sistemi'), reason: k.id);
          final turler = u.dersler
              .expand((d) => d.alistirmalar)
              .map((a) => a.tur)
              .toSet();
          expect(
            turler,
            containsAll(['eslestir', 'secim', 'bosluk', 'sirala']),
          );
        }
      },
    );

    test(
      'hedef dil sözcüklerinin yanında okunuş: 2. ve 3. ünite eşleştirmeleri',
      () {
        final parantez = RegExp(r'\(.+\)$');
        for (final k in _kurslar.keys) {
          for (final u in k.uniteler.skip(1)) {
            for (final a in u.dersler.expand((d) => d.alistirmalar)) {
              if (a is! Eslestir) continue;
              for (final c in a.ciftler) {
                expect(parantez.hasMatch(c.sol), isTrue, reason: c.sol);
              }
            }
          }
        }
      },
    );

    test('Dinle açıklamaları kurs içinde benzersiz; marka adı yok', () {
      final yasak = RegExp(
        'duolingo|busuu|memrise|talkpal|mimo',
        caseSensitive: false,
      );
      for (final k in _kurslar.keys) {
        final acik = [
          for (final a in k.tumDersler.expand((d) => d.alistirmalar))
            if (a is Dinle) a.aciklama ?? '',
        ];
        expect(acik.every((e) => e.isNotEmpty), isTrue);
        expect(acik.toSet().length, acik.length, reason: k.id);
        for (final a in k.tumDersler.expand((d) => d.alistirmalar)) {
          expect(yasak.hasMatch(jsonEncode(a.toJson())), isFalse);
        }
      }
    });

    test('JSON gidiş-dönüş eşit; kart kimlikleri benzersiz', () {
      final kartlar = <String>[];
      for (final k in _kurslar.keys) {
        for (final d in k.tumDersler) {
          final json = jsonEncode(
            d.alistirmalar.map((a) => a.toJson()).toList(),
          );
          final geri = (jsonDecode(json) as List)
              .map(
                (e) => Alistirma.fromJson((e as Map).cast<String, Object?>()),
              )
              .toList();
          expect(geri.length, d.alistirmalar.length);
          for (var i = 0; i < geri.length; i++) {
            expect(
              jsonEncode(geri[i].toJson()),
              jsonEncode(d.alistirmalar[i].toJson()),
              reason: '${d.id}#$i',
            );
            kartlar.add(d.kartKimligi(i));
          }
        }
      }
      expect(kartlar.toSet().length, kartlar.length);
    });
  });

  group('Dinle/Soyle dil alanı', () {
    test('varsayılan en-US, JSON\'a yazılmaz', () {
      const d = Dinle(
        soru: 's',
        okunacak: 'Hello',
        secenekler: ['Hello', 'Bye'],
        dogru: 0,
      );
      const s = Soyle(soru: 's', metin: 'Hello', ceviri: 'Merhaba');
      expect(d.dil, 'en-US');
      expect(s.dil, 'en-US');
      expect(d.toJson().containsKey('dil'), isFalse);
      expect(s.toJson().containsKey('dil'), isFalse);
    });

    test(
      'varsayılandan farklıysa JSON\'a yazılır ve gidiş-dönüşte korunur',
      () {
        const d = Dinle(
          soru: 's',
          okunacak: '你好',
          secenekler: ['你好', '再见'],
          dogru: 0,
          dil: 'zh-CN',
        );
        const s = Soyle(
          soru: 's',
          metin: '안녕하세요',
          ceviri: 'Merhaba',
          dil: 'ko-KR',
        );
        expect(d.toJson()['dil'], 'zh-CN');
        expect(s.toJson()['dil'], 'ko-KR');
        final d2 = Alistirma.fromJson(
          (jsonDecode(jsonEncode(d.toJson())) as Map).cast<String, Object?>(),
        );
        final s2 = Alistirma.fromJson(
          (jsonDecode(jsonEncode(s.toJson())) as Map).cast<String, Object?>(),
        );
        expect((d2 as Dinle).dil, 'zh-CN');
        expect((s2 as Soyle).dil, 'ko-KR');
      },
    );

    test('eski JSON (dil alanı yok) varsayılana düşer', () {
      final d = Alistirma.fromJson({
        'tur': 'dinle',
        'soru': 's',
        'okunacak': 'Hello',
        'secenekler': ['Hello', 'Bye'],
        'dogru': 0,
      });
      final s = Alistirma.fromJson({
        'tur': 'soyle',
        'soru': 's',
        'metin': 'Hello',
        'ceviri': 'Merhaba',
      });
      expect((d as Dinle).dil, 'en-US');
      expect((s as Soyle).dil, 'en-US');
    });

    test(
      'eski İngilizce içerik değişmedi: hiçbir İngilizce alıştırmada dil yok',
      () {
        for (final k in [
          ingilizceA1,
          ingilizceA2,
          ingilizceB1,
          ingilizceB2,
          ingilizceC1,
        ]) {
          for (final a in k.tumDersler.expand((d) => d.alistirmalar)) {
            expect(a.toJson().containsKey('dil'), isFalse, reason: a.soru);
          }
        }
      },
    );

    testWidgets('DinleGorunumu metni alıştırmanın diliyle okur', (
      tester,
    ) async {
      final ses = _DilliSes();
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
              body: SingleChildScrollView(
                child: DinleGorunumu(
                  alistirma: const Dinle(
                    soru: 'Ne duydun?',
                    okunacak: '你好',
                    secenekler: ['你好', '谢谢', '再见'],
                    dogru: 0,
                    dil: 'zh-CN',
                  ),
                  kontrolEdildi: false,
                  onCevap: (_) {},
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await dokun(tester, find.byIcon(Icons.volume_up));
      expect(ses.cagrilar, [('你好', 'zh-CN')]);
    });

    testWidgets(
      'SoyleGorunumu okumada ve konuşma tanımada alıştırmanın dilini kullanır',
      (tester) async {
        final ses = _DilliSes();
        final konusma = SahteKonusma(yanitlar: ['안녕하세요']);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              depoProvider.overrideWithValue(
                BellekDepo(const OgrenciDurumu(alan: 'dil')),
              ),
              sesProvider.overrideWithValue(ses),
              konusmaProvider.overrideWithValue(konusma),
            ],
            child: MaterialApp(
              theme: acikTema(),
              home: Scaffold(
                body: SingleChildScrollView(
                  child: SoyleGorunumu(
                    alistirma: const Soyle(
                      soru: 'Söyle.',
                      metin: '안녕하세요',
                      ceviri: 'Merhaba',
                      dil: 'ko-KR',
                    ),
                    kontrolEdildi: false,
                    onCevap: (_) {},
                    onGonder: () {},
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await dokun(tester, find.byKey(const Key('soyle-dinle')));
        expect(ses.cagrilar, [('안녕하세요', 'ko-KR')]);
        await dokun(tester, find.byKey(const Key('soyle-mikrofon')));
        await tester.pump(const Duration(milliseconds: 50));
        await tester.pumpAndSettle();
        expect(konusma.dinlenenDiller, ['ko-KR']);
      },
    );
  });

  group('telaffuz: Hangıl, Kana ve Han', () {
    test('Hangıl sözcükleri korunur', () {
      expect(telaffuzKelimeleri('만나서 반갑습니다'), ['만나서', '반갑습니다']);
      expect(telaffuzPuani('만나서 반갑습니다', '만나서 반갑습니다').oran, 1);
    });

    test('Japonca ve Çince harf harf puanlanır, noktalama yok sayılır', () {
      expect(telaffuzKelimeleri('はじめまして。'), ['は', 'じ', 'め', 'ま', 'し', 'て']);
      expect(telaffuzKelimeleri('很高兴认识你！').length, 6);
      expect(telaffuzPuani('多少钱', '多少钱').oran, 1);
      expect(telaffuzDogruMu(telaffuzPuani('多少钱', '多少前').oran), isFalse);
      expect(telaffuzDogruMu(telaffuzPuani('多少钱', '').oran), isFalse);
    });

    test('tüm Soyle metinleri kendi kendini tam puanlar', () {
      for (final k in _kurslar.keys) {
        for (final a in k.tumDersler.expand((d) => d.alistirmalar)) {
          if (a is Soyle) expect(telaffuzPuani(a.metin, a.metin).oran, 1);
        }
      }
    });

    test('Latin metin davranışı değişmedi', () {
      expect(telaffuzKelimeleri("I'm from Turkey!"), ["i'm", 'from', 'turkey']);
    });
  });

  group('sözlük', () {
    final sozluk = Sozluk.kurslardan(tumKurslar);

    test('kurs dili: ko / ja / zh; her kurs 15-20 madde', () {
      for (final (kurs, dil) in [
        (koreceA1, 'ko'),
        (japoncaA1, 'ja'),
        (cinceA1, 'zh'),
      ]) {
        expect(Sozluk.kursDili(kurs), dil);
        final maddeler = sozluk.maddeler.where((m) => m.kursId == kurs.id);
        expect(maddeler.length, inInclusiveRange(15, 20), reason: kurs.id);
        expect(maddeler.every((m) => m.dil == dil), isTrue, reason: kurs.id);
        expect(sozluk.ara('', dil: dil).length, maddeler.length);
      }
      expect(Sozluk.kursDili(ingilizceA1), 'en');
      expect(Sozluk.kursDili(html1), 'kod');
    });

    test('hedef yazı, romanizasyon ve Türkçe anlam aranabilir', () {
      final ara = sozluk.ara('annyeong');
      expect(ara, isNotEmpty);
      expect(ara.first.dil, 'ko');
      expect(ara.first.kelime, contains('안녕하세요'));
      expect(ara.first.anlam, 'Merhaba');
      expect(sozluk.ara('konnichiwa', dil: 'ja'), isNotEmpty);
      expect(sozluk.ara('谢谢', dil: 'zh'), isNotEmpty);
      expect(sozluk.ara('yarın', dil: 'zh'), isNotEmpty);
    });

    test('günün kelimesi yalnız İngilizce kalır', () {
      for (var g = 1; g <= 28; g++) {
        final m = sozluk.gununKelimesi(
          '2026-10-${g.toString().padLeft(2, '0')}',
        );
        expect(m?.dil, 'en');
      }
    });

    test('paketlerde yeni kursların üniteleri var', () {
      final paketler = sozluk.paketler(tumKurslar);
      for (final k in _kurslar.keys) {
        expect(paketler.where((p) => p.kursId == k.id).length, 3, reason: k.id);
      }
    });
  });

  group('yerleşim 480x600 @1,5', () {
    testWidgets('ana sayfa dil alanında 7 kurs taşmadan çizilir', (
      tester,
    ) async {
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: _yediDilKursu,
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      expect(tester.takeException(), isNull);
      // Kurs başlıkları tembel listede olduğundan sayfayı sonuna kadar kaydır.
      final liste = find.byType(Scrollable).first;
      final gorulen = <String>{};
      for (var i = 0; i < 140; i++) {
        for (final k in _yediDilKursu) {
          if (find.text(k.ad).evaluate().isNotEmpty) gorulen.add(k.id);
        }
        await tester.drag(liste, const Offset(0, -240));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: 'kaydırma $i');
      }
      for (final k in _kurslar.keys) {
        expect(gorulen, contains(k.id), reason: '${k.ad} ana sayfada yok');
      }
    });

    testWidgets(
      'sözlükte ko/ja/zh maddeleri görünür, çipler taşmaz, Oku dili doğru',
      (tester) async {
        final ses = _DilliSes();
        await uygulamayiAc(
          tester,
          BellekDepo(const OgrenciDurumu(alan: 'dil')),
          kurslar: [ingilizceA1, koreceA1, japoncaA1, cinceA1],
          ses: ses,
          boyut: const Size(480, 600),
          metinOlcegi: 1.5,
        );
        await dokun(tester, find.byTooltip('Sözlük'));
        expect(tester.takeException(), isNull);
        for (final cip in ['Korece', 'Japonca', 'Çince']) {
          expect(find.widgetWithText(FilterChip, cip), findsOneWidget);
        }

        final sorgu = find.byType(TextField);
        for (final (cip, ara, gorunen, okunan, dil) in [
          ('Korece', 'annyeong', '안녕하세요 (annyeonghaseyo)', '안녕하세요', 'ko-KR'),
          ('Japonca', 'konnichiwa', 'こんにちは (konnichiwa)', 'こんにちは', 'ja-JP'),
          ('Çince', 'xièxie', '谢谢 (xièxie)', '谢谢', 'zh-CN'),
        ]) {
          await dokun(tester, find.widgetWithText(FilterChip, cip));
          await tester.enterText(sorgu, ara);
          await tester.pumpAndSettle();
          expect(find.text(gorunen), findsOneWidget, reason: cip);
          expect(tester.takeException(), isNull, reason: cip);
          await dokun(tester, find.byTooltip('Oku').first);
          expect(ses.cagrilar.last, (okunan, dil), reason: cip);
        }
      },
    );
  });
}
