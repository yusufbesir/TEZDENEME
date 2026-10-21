// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// ÖZELLİK 58 testleri: kelime-emoji eşleme tablosu (yalnız doğru eşleşenler),
/// havuz (sözlük + ünite paketi), konu/paket süzgeci, dokun-eşleştir ve kaydır
/// turları, ekranlar (konu çipleri, iki oyun, boş durum) ve oyunların SRS ve
/// durumu değiştirmemesi; 480x600 @1,5 taşma yok.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/gorsel_kelime.dart';
import 'package:adim_adim/sozluk/sozluk.dart';
import 'package:adim_adim/uygulama.dart' show yonlendiriciProvider;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'pratik_test.dart' show pratikKurs;
import 'sahte_icerik.dart';

void main() {
  group('eşleme tablosu', () {
    test('doğru kelime + anlam eşleşir; yanlış anlam ya da dil eşleşmez', () {
      final cat = GorselKelimeler.eslesme('en', 'cat', 'kedi')!;
      expect(cat.emoji, '🐱');
      expect(cat.konu, 'hayvan');
      expect(GorselKelimeler.eslesme('en', 'Bed', 'yatak')!.emoji, '🛏️');
      expect(GorselKelimeler.eslesme('de', 'das Brot', 'ekmek')!.emoji, '🍞');
      // Büyük/küçük harf ve Türkçe harf duyarsız.
      expect(GorselKelimeler.eslesme('en', 'RED', 'KIRMIZI')!.emoji, '🔴');
      // Aynı kelime başka anlamda: görsel yok ("back" = sırt, "bad" = worse).
      expect(GorselKelimeler.eslesme('en', 'back', 'sırt'), isNull);
      expect(GorselKelimeler.eslesme('en', 'bad', 'worse'), isNull);
      expect(GorselKelimeler.eslesme('en', 'cat', 'köpek'), isNull);
      expect(GorselKelimeler.eslesme('en', 'Hello', 'Merhaba'), isNull);
      // Dil karışmaz.
      expect(GorselKelimeler.eslesme('ko', 'cat', 'kedi'), isNull);
      expect(GorselKelimeler.eslesme('de', 'cat', 'kedi'), isNull);
    });

    test('tablo bütünlüğü: konu, emoji, anlam, tekrar yok', () {
      final kodlar = {for (final k in gorselKonular) k.kod};
      final gorulen = <String>{};
      for (final g in GorselKelimeler.tablo) {
        expect(kodlar, contains(g.konu), reason: '${g.dil} ${g.kelime}');
        expect(g.emoji.trim(), isNotEmpty, reason: g.kelime);
        expect(g.emoji.contains('‍'), isFalse, reason: 'ZWJ yok: ${g.kelime}');
        expect(g.anlamlar, isNotEmpty, reason: g.kelime);
        expect(g.anlamlar.every((a) => a.trim().isNotEmpty), isTrue);
        expect(
          gorulen.add('${g.dil}|${Sozluk.normalize(g.kelime)}'),
          isTrue,
          reason: 'yinelenen giriş: ${g.dil} ${g.kelime}',
        );
      }
      expect(GorselKelimeler.diller, containsAll(['en', 'de']));
      // Her konunun en az bir kelimesi var.
      for (final k in kodlar) {
        expect(
          GorselKelimeler.tablo.any((g) => g.konu == k),
          isTrue,
          reason: k,
        );
      }
    });

    test('gerçek içerikte havuz: bilinen çiftler var, uyumsuzlar yok', () {
      final sozluk = Sozluk.kurslardan(tumKurslar);
      final havuz = GorselKelimeler.havuz(sozluk, tumKurslar);
      expect(havuz, isNotEmpty);
      bool var_(String dil, String kelime) =>
          havuz.any((g) => g.dil == dil && g.kelime == kelime);
      expect(var_('en', 'bread'), isTrue);
      expect(var_('en', 'milk'), isTrue);
      expect(var_('de', 'das Brot'), isTrue);
      expect(var_('en', 'back'), isFalse); // "sırt" anlamı tabloda yok
      expect(var_('en', 'bad'), isFalse);
      // Her havuz öğesinin kelimesi/anlamı sözlükte aynen vardır.
      for (final g in havuz) {
        expect(
          sozluk.maddeler.any(
            (m) => m.dil == g.dil && m.kelime == g.kelime && m.anlam == g.anlam,
          ),
          isTrue,
          reason: '${g.kelime} = ${g.anlam}',
        );
        expect(g.kartId, contains('#'));
        expect(g.uniteId, isNotNull);
      }
    });
  });

  group('havuz, süzgeç ve turlar', () {
    final kurslar = [sahteKurs];
    final sozluk = Sozluk.kurslardan(kurslar);
    final havuz = GorselKelimeler.havuz(sozluk, kurslar);

    test('havuz yalnız verilen kurslardan; ünite paketi eklenir', () {
      expect({for (final g in havuz) g.kelime}, {'cat', 'dog', 'bird'});
      expect(havuz.every((g) => g.uniteId == 'sahte-1.u1'), isTrue);
      expect(havuz.every((g) => g.kursId == sahteKursId), isTrue);
      expect(GorselKelimeler.havuz(sozluk, const []), isEmpty);
    });

    test('konular ve süzgeç (konu + paket)', () {
      final k = GorselKelimeler.konular(havuz);
      expect(k.length, 1);
      expect(k.single.konu.kod, 'hayvan');
      expect(k.single.adet, 3);
      expect(GorselKelimeler.suz(havuz).length, 3);
      expect(GorselKelimeler.suz(havuz, konu: 'hayvan').length, 3);
      expect(GorselKelimeler.suz(havuz, konu: 'renk'), isEmpty);
      expect(GorselKelimeler.suz(havuz, uniteId: 'sahte-1.u1').length, 3);
      expect(GorselKelimeler.suz(havuz, uniteId: 'baska'), isEmpty);
      expect(
        GorselKelimeler.suz(havuz, konu: 'hayvan', uniteId: 'baska'),
        isEmpty,
      );
    });

    test(
      'dokun-eşleştir turu: tekrarsız görsel ve kelime, az kelimede boş',
      () {
        final tur = GorselKelimeler.eslestirmeTuru(havuz, tohum: 5);
        expect(tur.length, 3);
        expect({for (final g in tur) g.emoji}.length, 3);
        expect(GorselKelimeler.eslestirmeTuru(havuz.take(2).toList()), isEmpty);
        expect(
          GorselKelimeler.eslestirmeTuru(havuz, adet: 2, enAz: 2).length,
          2,
        );
        // Aynı emoji iki kelimede (anne/kadın) bir turda birlikte gelmez.
        final sozluk2 = Sozluk.kurslardan(tumKurslar);
        final buyuk = GorselKelimeler.havuz(sozluk2, tumKurslar);
        for (var t = 0; t < 20; t++) {
          final r = GorselKelimeler.eslestirmeTuru(buyuk, tohum: t, adet: 6);
          expect({for (final g in r) g.emoji}.length, r.length);
          expect({for (final g in r) g.kelime}.length, r.length);
        }
      },
    );

    test('kaydır turu: yarısı doğru, yanlışlar başka anlam önerir', () {
      final tur = GorselKelimeler.kaydirTuru(havuz, tohum: 2, adet: 10);
      expect(tur.length, 3);
      expect(
        tur.where((k) => k.dogruMu).length,
        2,
      ); // 3 kart: 2 doğru, 1 yanlış
      for (final k in tur) {
        final ayni =
            Sozluk.normalize(k.onerilen) == Sozluk.normalize(k.kelime.anlam);
        expect(ayni, k.dogruMu);
      }
      // Tek farklı anlam varsa oyun kurulmaz.
      expect(GorselKelimeler.kaydirTuru(havuz.take(1).toList()), isEmpty);
    });
  });

  group('ekranlar', () {
    Future<ProviderContainer> ac(
      WidgetTester tester, {
      OgrenciDurumu? durum,
      List<Kurs>? kurslar,
      Size boyut = const Size(480, 600),
    }) => uygulamayiAc(
      tester,
      BellekDepo(durum ?? const OgrenciDurumu(alan: 'dil')),
      kurslar: kurslar ?? [pratikKurs],
      boyut: boyut,
      metinOlcegi: 1.5,
    );

    testWidgets('Pratik merkezi satırı: dil alanında var, kodda yok', (
      tester,
    ) async {
      final kap = await ac(tester);
      kap.read(yonlendiriciProvider).push('/pratik');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('pratik-gorsel')), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('pratik-gorsel')));
      expect(find.text('Görsel kelimeler'), findsWidgets);
      expect(find.byKey(const ValueKey('gorsel-eslestir')), findsOneWidget);
    });

    testWidgets('kod alanında satır yok', (tester) async {
      final kap = await ac(
        tester,
        durum: const OgrenciDurumu(alan: 'kod'),
        kurslar: [sahteKodKurs],
      );
      kap.read(yonlendiriciProvider).push('/pratik');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('pratik-gorsel')), findsNothing);
    });

    testWidgets('liste: konu ve paket çipleri süzer; kartlar emoji ile', (
      tester,
    ) async {
      final kap = await ac(tester, boyut: const Size(500, 1600));
      kap.read(yonlendiriciProvider).push('/gorsel');
      await tester.pumpAndSettle();
      expect(find.text('🐱'), findsOneWidget);
      expect(find.text('🍎'), findsOneWidget);
      expect(find.byKey(const ValueKey('gorsel-konu-hayvan')), findsOneWidget);
      expect(find.byKey(const ValueKey('gorsel-konu-yiyecek')), findsOneWidget);
      expect(find.byKey(const ValueKey('gorsel-konu-ev')), findsOneWidget);
      expect(find.byKey(const ValueKey('gorsel-konu-renk')), findsNothing);

      await dokun(tester, find.byKey(const ValueKey('gorsel-konu-hayvan')));
      expect(find.text('3 kelime'), findsOneWidget);
      expect(find.text('🍎'), findsNothing);
      expect(find.text('🐱'), findsOneWidget);

      // Paket çipi (ÖZELLİK 23 paketleri): tek ünite var.
      await dokun(
        tester,
        find.byKey(const ValueKey('gorsel-paket-pratik-1.u1')),
      );
      expect(find.text('3 kelime'), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('gorsel-konu-hepsi')));
      expect(find.text('🍎'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('dokun-eşleştir: yanlışta ceza yok, tümü eşleşince biter', (
      tester,
    ) async {
      final kap = await ac(tester);
      kap.read(yonlendiriciProvider).push('/gorsel');
      await tester.pumpAndSettle();
      await dokun(tester, find.byKey(const ValueKey('gorsel-konu-hayvan')));
      final once = kap.read(durumProvider).value!.toJson().toString();
      await dokun(tester, find.byKey(const ValueKey('gorsel-eslestir')));
      expect(find.text('Dokun-eşleştir'), findsWidgets);

      Future<void> cift(String emoji, String kelime) async {
        await dokun(tester, find.widgetWithText(OutlinedButton, emoji));
        await dokun(tester, find.widgetWithText(OutlinedButton, kelime));
      }

      // Önce bilerek yanlış: kedi görseli + dog.
      await cift('🐱', 'dog');
      expect(find.byKey(const ValueKey('eslestir-yanlis')), findsOneWidget);
      await cift('🐱', 'cat');
      expect(find.byKey(const ValueKey('eslestir-yanlis')), findsNothing);
      await cift('🐶', 'dog');
      await cift('🐦', 'bird');
      expect(find.byKey(const ValueKey('eslestir-bitti')), findsOneWidget);
      expect(find.textContaining('3 çift, 4 dokunuş'), findsOneWidget);

      // Yeni tur ve listeye dönüş.
      await dokun(tester, find.byKey(const ValueKey('eslestir-yeni')));
      expect(find.byKey(const ValueKey('eslestir-sol-0')), findsOneWidget);
      await dokun(tester, find.byTooltip('Geri'));
      expect(find.byKey(const ValueKey('gorsel-eslestir')), findsOneWidget);
      // Oyun SRS, hata defteri, XP: hiçbir şey değişmedi.
      expect(kap.read(durumProvider).value!.toJson().toString(), once);
      expect(tester.takeException(), isNull);
    });

    testWidgets('kaydır oyunu: Evet/Hayır ve kaydırma; skor ve bitiş', (
      tester,
    ) async {
      const anlam = {'cat': 'kedi', 'dog': 'köpek', 'bird': 'kuş'};
      final kap = await ac(tester);
      kap.read(yonlendiriciProvider).push('/gorsel');
      await tester.pumpAndSettle();
      await dokun(tester, find.byKey(const ValueKey('gorsel-konu-hayvan')));
      final once = kap.read(durumProvider).value!.toJson().toString();
      await dokun(tester, find.byKey(const ValueKey('gorsel-kaydir')));
      expect(find.byKey(const ValueKey('kaydir-sayac')), findsOneWidget);

      for (var i = 0; i < 3; i++) {
        final kelime = tester
            .widget<Text>(find.byKey(const ValueKey('kaydir-kelime')))
            .data!;
        final onerilen = tester
            .widget<Text>(find.byKey(const ValueKey('kaydir-onerilen')))
            .data!
            .replaceAll('= ', '')
            .replaceAll(' ?', '');
        final dogru = anlam[kelime] == onerilen;
        if (i == 0) {
          // İlk kartı kaydırarak yanıtla: doğruysa sağa, yanlışsa sola.
          await tester.drag(
            find.byType(Dismissible),
            Offset(dogru ? 600 : -600, 0),
          );
          await tester.pumpAndSettle();
        } else {
          await dokun(
            tester,
            find.byKey(ValueKey(dogru ? 'kaydir-evet' : 'kaydir-hayir')),
          );
        }
      }
      expect(find.text('3 / 3 doğru'), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('kaydir-yeni')));
      expect(find.byKey(const ValueKey('kaydir-sayac')), findsOneWidget);
      // Bilerek yanlış cevap: geri bildirim yanlışı söyler, ceza yok.
      final kelime = tester
          .widget<Text>(find.byKey(const ValueKey('kaydir-kelime')))
          .data!;
      final onerilen = tester
          .widget<Text>(find.byKey(const ValueKey('kaydir-onerilen')))
          .data!
          .replaceAll('= ', '')
          .replaceAll(' ?', '');
      final dogru = anlam[kelime] == onerilen;
      await dokun(
        tester,
        find.byKey(ValueKey(dogru ? 'kaydir-hayir' : 'kaydir-evet')),
      );
      expect(
        tester
            .widget<Text>(find.byKey(const ValueKey('kaydir-geri-bildirim')))
            .data,
        'Yanlış: $kelime = ${anlam[kelime]}',
      );
      expect(kap.read(durumProvider).value!.toJson().toString(), once);
      expect(tester.takeException(), isNull);
    });

    testWidgets('görsel eşleşen kelime yoksa boş mesaj', (tester) async {
      final kap = await ac(
        tester,
        durum: const OgrenciDurumu(alan: 'kod'),
        kurslar: [sahteKodKurs],
      );
      kap.read(yonlendiriciProvider).push('/gorsel');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('gorsel-bos')), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
