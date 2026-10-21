// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Senaryolu konuşma (ÖZELLİK 65): içerik bütünlüğü (dallar var, her yol
/// biter, ölü döngü yok), akış motoru (seç/yaz/söyle, uygun olmayan cevap),
/// kurs eşleştirme, bitirme sayacı ve ekran (liste, sohbet, kayıt).
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/icerik/senaryolar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/model/senaryo.dart';
import 'package:adim_adim/motor/senaryo.dart';
import 'package:adim_adim/servis/konusma.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

/// Başlangıçtan her zaman ilk uygun cevabı seçerek sona kadar giden indeksler.
List<int> _uygunYol(Senaryo s) {
  final a = SenaryoAkisi(s);
  final yol = <int>[];
  while (!a.bitti) {
    final i = a.cevaplar.indexWhere((c) => c.uygun);
    yol.add(i);
    a.cevapla(i);
    if (yol.length > 50) fail('Sonsuz döngü: ${s.id}');
  }
  return yol;
}

final Kurs _ingKurs = Kurs(
  id: 'ingilizce-1',
  ad: 'İngilizce',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: const [],
);

void main() {
  group('İçerik bütünlüğü', () {
    test('en az 2 dilde, birkaç senaryo; kimlikler tekil', () {
      final onekler = tumSenaryolar.map((s) => s.kursOnek).toSet();
      expect(onekler.length, greaterThanOrEqualTo(2));
      expect(onekler, containsAll(['ingilizce', 'almanca']));
      final idler = tumSenaryolar.map((s) => s.id).toList();
      expect(idler.toSet().length, idler.length);
      for (final o in onekler) {
        expect(
          tumSenaryolar.where((s) => s.kursOnek == o).length,
          greaterThanOrEqualTo(2),
        );
      }
    });

    for (final s in tumSenaryolar) {
      test('${s.id}: dallar geçerli, her düğümden son erişilebilir', () {
        expect(s.baslik.trim(), isNotEmpty);
        expect(s.aciklama.trim(), isNotEmpty);
        expect(s.dugum(s.baslangic), isNotNull);
        final idler = s.dugumler.map((d) => d.id).toList();
        expect(idler.toSet().length, idler.length, reason: 'tekil düğüm');

        // Erişilebilirlik (yalnız uygun cevaplar ilerletir).
        final gorulen = <String>{};
        void gez(String id) {
          if (!gorulen.add(id)) return;
          final d = s.dugum(id);
          expect(d, isNotNull, reason: 'olmayan düğüm: $id');
          for (final c in d!.cevaplar) {
            if (c.sonraki != null) gez(c.sonraki!);
          }
        }

        gez(s.baslangic);
        expect(gorulen, idler.toSet(), reason: 'erişilemeyen düğüm var');

        for (final d in s.dugumler) {
          expect(d.karsi, isNotEmpty, reason: '${d.id} karşı mesaj');
          for (final m in d.karsi) {
            expect(m.metin.trim(), isNotEmpty);
            expect(m.anlam.trim(), isNotEmpty);
          }
          if (d.son) continue;
          expect(
            d.cevaplar.any((c) => c.uygun),
            isTrue,
            reason: '${d.id}: uygun cevap yok',
          );
          for (final c in d.cevaplar) {
            expect(c.metin.trim(), isNotEmpty);
            expect(c.anlam.trim(), isNotEmpty);
            if (!c.uygun) {
              expect(c.sonraki, isNull);
              expect(c.not, isNotNull, reason: '${d.id}: uygunsuz cevaba not');
            }
          }
          // Yazarak çözümlemede iki cevap karışmamalı.
          expect(
            d.cevaplar.map((c) => c.metin).toSet().length,
            d.cevaplar.length,
            reason: '${d.id}: aynı cevap iki kez',
          );
        }

        // Her uygun yol sona varır, ilk-uygun yürüyüş biter.
        final yol = _uygunYol(s);
        expect(yol, isNotEmpty);
        expect(s.enUzunYol, greaterThanOrEqualTo(yol.length));
      });

      test('${s.id}: tam metin yazınca kendi cevabına çözülür', () {
        for (final d in s.dugumler.where((d) => !d.son)) {
          final a = SenaryoAkisi(s);
          // Düğüme uygun yolla ulaş.
          final yol = <int>[];
          bool bul(String id, List<int> iz, Set<String> g) {
            if (id == d.id) {
              yol.addAll(iz);
              return true;
            }
            if (!g.add(id)) return false;
            final n = s.dugum(id)!;
            for (var i = 0; i < n.cevaplar.length; i++) {
              final c = n.cevaplar[i];
              if (c.uygun &&
                  c.sonraki != null &&
                  bul(c.sonraki!, [...iz, i], g)) {
                return true;
              }
            }
            return false;
          }

          expect(bul(s.baslangic, [], {}), isTrue);
          yol.forEach(a.cevapla);
          for (var i = 0; i < d.cevaplar.length; i++) {
            expect(
              a.yazilanCevap(d.cevaplar[i].metin),
              i,
              reason: '${d.id}/$i yazılan',
            );
            expect(
              a.soylenenCevap(d.cevaplar[i].metin),
              i,
              reason: '${d.id}/$i söylenen',
            );
          }
        }
      });
    }

    test('Korece senaryolarda Hangul var, Latin cevap yok', () {
      final hangul = RegExp(r'[가-힣]');
      for (final s in tumSenaryolar.where((s) => s.kursOnek == 'korece')) {
        expect(s.dil, 'ko-KR');
        for (final d in s.dugumler) {
          for (final m in d.karsi) {
            expect(hangul.hasMatch(m.metin), isTrue, reason: m.metin);
          }
          for (final c in d.cevaplar) {
            expect(hangul.hasMatch(c.metin), isTrue, reason: c.metin);
          }
        }
      }
    });
  });

  group('Akış motoru', () {
    final s = tumSenaryolar.firstWhere((x) => x.id == 'senaryo-en-kafe');

    test('başlangıçta karşı taraf konuşur; uygun cevap ilerletir', () {
      final a = SenaryoAkisi(s);
      expect(a.balonlar.length, 1);
      expect(a.balonlar.first.kullanici, isFalse);
      expect(a.cevapla(0), SenaryoAdimi.ilerledi);
      expect(a.balonlar[1].kullanici, isTrue);
      expect(a.balonlar[1].metin, 'I would like a coffee, please.');
      expect(a.balonlar.last.kullanici, isFalse);
    });

    test('uygun olmayan cevap aynı düğümde bırakır, not ekler, ceza yok', () {
      final a = SenaryoAkisi(s);
      final dugum = a.dugum.id;
      expect(a.cevapla(2), SenaryoAdimi.uygunDegil);
      expect(a.dugum.id, dugum);
      expect(a.balonlar.last.not, isNotNull);
      expect(a.bitti, isFalse);
      expect(a.cevapla(0), SenaryoAdimi.ilerledi);
    });

    test('geçersiz indeks ve bitmiş akış uygunDegil döner', () {
      final a = SenaryoAkisi(s);
      expect(a.cevapla(-1), SenaryoAdimi.uygunDegil);
      expect(a.cevapla(99), SenaryoAdimi.uygunDegil);
      for (final i in _uygunYol(s)) {
        expect(i, isNonNegative);
      }
    });

    test('farklı dallar farklı karşı mesaj üretir', () {
      final k = SenaryoAkisi(s)..cevapla(0);
      final c = SenaryoAkisi(s)..cevapla(1);
      expect(k.balonlar.last.metin, isNot(c.balonlar.last.metin));
    });

    test(
      'yazarak: büyük/küçük harf ve noktalama duyarsız, küçük hata tolere',
      () {
        final a = SenaryoAkisi(s);
        expect(a.yazilanCevap('i would like a COFFEE please'), 0);
        expect(a.yazilanCevap('I would like a tea, please!'), 1);
        expect(a.yazilanCevap('i woud like a coffee please'), 0);
        expect(a.yazilanCevap('tamamen alakasız bir şey'), isNull);
        expect(a.yazilanCevap('   '), isNull);
      },
    );

    test('söyleyerek: tanınan metin cevaba çözülür, sessizlik null', () {
      final a = SenaryoAkisi(s);
      expect(a.soylenenCevap('I would like a tea please'), 1);
      expect(a.soylenenCevap(''), isNull);
      expect(a.soylenenCevap('banana'), isNull);
    });

    test('son düğüme gelince bitti ve cevap listesi boş', () {
      final a = SenaryoAkisi(s);
      final yol = _uygunYol(s);
      for (final i in yol) {
        if (a.bitti) break;
        a.cevapla(i);
      }
      expect(a.bitti, isTrue);
      expect(a.cevaplar, isEmpty);
    });
  });

  group('Kurs eşleştirme ve sayaç', () {
    test('yalnız kullanıcının dil kursuna uyan senaryolar', () {
      final l = Senaryolar.listele(tumSenaryolar, [_ingKurs]);
      expect(l, isNotEmpty);
      expect(l.every((x) => x.kursOnek == 'ingilizce'), isTrue);
      expect(Senaryolar.listele(tumSenaryolar, [sahteKodKurs]), isEmpty);
      expect(Senaryolar.listele(tumSenaryolar, const []), isEmpty);
    });

    test('bitirildi sayacı artar, girdiyi değiştirmez', () {
      const m = {'a': 1};
      final y = Senaryolar.bitirildi(m, 'a');
      expect(y, {'a': 2});
      expect(m, {'a': 1});
      expect(Senaryolar.bitirildi(y, 'b'), {'a': 2, 'b': 1});
    });
  });

  group('Durum uyumu', () {
    test('eski kayıtta senaryolar boş; gidiş-dönüş; bozuk anahtar atılır', () {
      expect(OgrenciDurumu.fromJson(const {}).senaryolar, isEmpty);
      const d = OgrenciDurumu(senaryolar: {'senaryo-en-kafe': 2});
      expect(OgrenciDurumu.fromJson(d.toJson()).senaryolar, {
        'senaryo-en-kafe': 2,
      });
      final j = OgrenciDurumu.fromJson({
        'senaryolar': {'ok': 1, '': 3, 'x#y': 2, 'neg': -1, 'metin': 'a'},
      });
      expect(j.senaryolar.keys, contains('ok'));
      expect(j.senaryolar.containsKey(''), isFalse);
      expect(j.senaryolar.containsKey('x#y'), isFalse);
      expect(OgrenciDurumu.fromJson({'senaryolar': 5}).senaryolar, isEmpty);
    });
  });

  group('Ekran', () {
    const dilDurum = OgrenciDurumu(alan: 'dil', xp: 40);

    testWidgets('liste: dil kursunda senaryolar, kodda mesaj', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(dilDurum),
        kurslar: [_ingKurs],
      );
      kap.read(yonlendiriciProvider).push('/senaryolar');
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('senaryo-senaryo-en-kafe')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('senaryo-senaryo-de-cafe')),
        findsNothing,
      );
    });

    testWidgets('seçerek bitirince sayaç kaydolur; XP ve kartlar değişmez', (
      tester,
    ) async {
      final s = tumSenaryolar.firstWhere((x) => x.id == 'senaryo-en-kafe');
      final depo = BellekDepo(dilDurum);
      final kap = await uygulamayiAc(tester, depo, kurslar: [_ingKurs]);
      kap.read(yonlendiriciProvider).push('/senaryo/${s.id}');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('senaryo-mod')), findsOneWidget);
      // Uygunsuz cevap: not görünür, sohbet devam eder.
      await tester.tap(find.byKey(const ValueKey('senaryo-cevap-2')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('senaryo-not')), findsOneWidget);
      expect(find.byKey(const ValueKey('senaryo-bitti')), findsNothing);
      for (final i in _uygunYol(s)) {
        await tester.tap(find.byKey(ValueKey('senaryo-cevap-$i')));
        await tester.pumpAndSettle();
      }
      expect(find.byKey(const ValueKey('senaryo-bitti')), findsOneWidget);
      final d = await depo.yukle();
      expect(d.senaryolar[s.id], 1);
      expect(d.xp, 40);
      expect(d.kartlar, isEmpty);
    });

    testWidgets('yazarak cevap ilerletir; alakasız metin mesaj verir', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(dilDurum),
        kurslar: [_ingKurs],
      );
      kap.read(yonlendiriciProvider).push('/senaryo/senaryo-en-kafe');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Yaz'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('senaryo-yaz')),
        'asdfgh qwerty',
      );
      await tester.tap(find.byKey(const ValueKey('senaryo-gonder')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('senaryo-mesaj')), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('senaryo-yaz')),
        'I would like a tea, please.',
      );
      await tester.tap(find.byKey(const ValueKey('senaryo-gonder')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('senaryo-mesaj')), findsNothing);
      expect(find.textContaining('tea', findRichText: true), findsWidgets);
    });

    testWidgets('konuşarak cevap: tanıma varsa çalışır', (tester) async {
      final k = SahteKonusma(yanitlar: ['I would like a coffee please']);
      final depo = BellekDepo(dilDurum);
      final kap = await uygulamayiAc(
        tester,
        depo,
        kurslar: [_ingKurs],
        konusma: k,
      );
      kap.read(yonlendiriciProvider).push('/senaryo/senaryo-en-kafe');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Söyle'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('senaryo-mikrofon')));
      for (var i = 0; i < 6; i++) {
        await tester.pump(const Duration(seconds: 1));
      }
      expect(k.dinlenenDiller, ['en-US']);
      expect(find.byKey(const ValueKey('senaryo-mesaj')), findsNothing);
      expect(
        find.text('Sure. Would you like milk with your coffee?'),
        findsOneWidget,
      );
    });

    testWidgets('tanıma yokken Söyle kapalı, uyarı görünür', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(dilDurum),
        kurslar: [_ingKurs],
        konusma: const KonusmaYok(),
      );
      kap.read(yonlendiriciProvider).push('/senaryo/senaryo-en-kafe');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('senaryo-tanima-yok')), findsOneWidget);
      expect(find.byKey(const ValueKey('senaryo-cevap-0')), findsOneWidget);
    });
  });
}
