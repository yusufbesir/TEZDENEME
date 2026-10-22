// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Halat çekme bilgi yarışı ve çalışma arkadaşı maskot (ÖZELLİK 83): oyun
/// kuralları (konum, kazanma, tohumla deterministik bilgisayar), maskot
/// aşamaları ve ruh hâli, ekranlar; durum değişmez.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/ekranlar/halat_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/halat.dart';
import 'package:adim_adim/motor/maskot.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:adim_adim/yarisma/model.dart';
import 'package:adim_adim/yarisma/soru_bankasi.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'yeni_ozellik_icerik.dart';

List<YarismaSorusu> _sorular(int n) => [
  for (var i = 0; i < n; i++)
    YarismaSorusu(
      id: 'k.genelKultur.$i',
      alan: 'dil',
      seviyeKursId: 'ingilizce-1',
      kategori: YarismaKategori.genelKultur,
      soru: 'Soru $i?',
      secenekler: const ['A', 'B', 'C', 'D'],
      dogru: i % 4,
      aciklama: 'Açıklama',
    ),
];

/// Oyunu, oyuncu her zaman doğru/yanlış bilecek biçimde sonuna kadar oynar.
void _oyna(HalatOyunu o, {required bool dogru}) {
  while (!o.bitti) {
    final s = o.soru!;
    o.cevapla(dogru ? s.dogru : (s.dogru + 1) % 4);
  }
}

void main() {
  group('oyun kuralları', () {
    test('oyuncu hep doğru, bilgisayar hiç: 5 turda oyuncu kazanır', () {
      final o = HalatOyunu(sorular: _sorular(12), bilgisayarOrani: 0);
      expect(o.sonuc, HalatSonucu.devam);
      for (var i = 0; i < HalatOyunu.mesafe; i++) {
        expect(o.bitti, isFalse);
        final t = o.cevapla(o.soru!.dogru)!;
        expect(t.oyuncuDogru, isTrue);
        expect(t.bilgisayarDogru, isFalse);
      }
      expect(o.konum, HalatOyunu.mesafe);
      expect(o.sonuc, HalatSonucu.oyuncu);
      expect(o.tur, HalatOyunu.mesafe);
      expect(o.cevapla(0), isNull, reason: 'bittikten sonra cevap alınmaz');
      expect(o.konum, HalatOyunu.mesafe);
    });

    test('oyuncu hep yanlış, bilgisayar hep doğru: bilgisayar kazanır', () {
      final o = HalatOyunu(sorular: _sorular(12), bilgisayarOrani: 1);
      _oyna(o, dogru: false);
      expect(o.sonuc, HalatSonucu.bilgisayar);
      expect(o.konum, -HalatOyunu.mesafe);
      expect(o.oyuncuDogru, 0);
    });

    test('ikisi de doğru: konum değişmez, sorular bitince berabere', () {
      final o = HalatOyunu(sorular: _sorular(8), bilgisayarOrani: 1);
      _oyna(o, dogru: true);
      expect(o.konum, 0);
      expect(o.tur, 8);
      expect(o.sonuc, HalatSonucu.berabere);
      expect(o.oyuncuDogru, 8);
      expect(o.soru, isNull);
    });

    test('sorular bitince önde olan kazanır (oyuncu 1 adım önde)', () {
      // Bilgisayar hiç bilmez; oyuncu 3 soruyu doğru bilir: konum 3.
      final o = HalatOyunu(sorular: _sorular(3), bilgisayarOrani: 0);
      _oyna(o, dogru: true);
      expect(o.konum, 3);
      expect(o.sonuc, HalatSonucu.oyuncu);
      final k = HalatOyunu(sorular: _sorular(3), bilgisayarOrani: 1);
      _oyna(k, dogru: false);
      expect(k.konum, -3);
      expect(k.sonuc, HalatSonucu.bilgisayar);
    });

    test('en çok 12 tur; soru yoksa oyun hemen biter (berabere)', () {
      final o = HalatOyunu(sorular: _sorular(40), bilgisayarOrani: 1);
      expect(o.sorular, hasLength(HalatOyunu.enCokTur));
      final bos = HalatOyunu(sorular: const []);
      expect(bos.soru, isNull);
      expect(bos.bitti, isTrue);
      expect(bos.sonuc, HalatSonucu.berabere);
      expect(bos.cevapla(0), isNull);
    });

    test(
      'aynı tohum aynı sıra ve bilgisayar cevapları; konum sınırı aşılmaz',
      () {
        List<String> iz(int tohum) {
          final o = HalatOyunu(sorular: _sorular(30), tohum: tohum);
          final sonuc = <String>[];
          while (!o.bitti) {
            final t = o.cevapla(o.soru!.dogru)!;
            sonuc.add(
              '${o.sorular[o.tur - 1].id}:${t.bilgisayarDogru}:${t.konum}',
            );
            expect(o.konum.abs(), lessThanOrEqualTo(HalatOyunu.mesafe));
          }
          return sonuc;
        }

        expect(iz(4), iz(4));
        expect(
          {for (var t = 0; t < 6; t++) iz(t).join(',')}.length,
          greaterThan(1),
        );
      },
    );

    test('bilgisayar doğruluk oranı yaklaşık beklenen (0,55)', () {
      var dogru = 0;
      var toplam = 0;
      for (var t = 0; t < 200; t++) {
        final o = HalatOyunu(sorular: _sorular(12), tohum: t);
        while (!o.bitti) {
          final r = o.cevapla((o.soru!.dogru + 1) % 4)!;
          toplam++;
          if (r.bilgisayarDogru) dogru++;
        }
      }
      expect(dogru / toplam, inInclusiveRange(0.45, 0.65));
    });

    test('gerçek soru bankasından oyun kurulabilir (dil ve kod)', () {
      for (final e in [('dil', 'ingilizce-1'), ('kod', 'html-1')]) {
        final s = sorulariBul(e.$1, e.$2);
        expect(s.length, greaterThanOrEqualTo(HalatOyunu.enCokTur));
        final o = HalatOyunu(sorular: s, tohum: 1);
        expect(o.sorular, hasLength(HalatOyunu.enCokTur));
        _oyna(o, dogru: true);
        expect(o.bitti, isTrue);
      }
    });
  });

  group('maskot', () {
    test('aşama eşikleri XP ile yükselir; sınırlar', () {
      expect(Maskot.asamaBul(0).ad, 'Yumurta');
      expect(Maskot.asamaBul(49).ad, 'Yumurta');
      expect(Maskot.asamaBul(50).ad, 'Civciv');
      expect(Maskot.asamaBul(249).ad, 'Civciv');
      expect(Maskot.asamaBul(250).ad, 'Yavru kuş');
      expect(Maskot.asamaBul(750).ad, 'Kuş');
      expect(Maskot.asamaBul(2000).ad, 'Baykuş');
      expect(Maskot.asamaBul(5000).ad, 'Kartal');
      expect(Maskot.asamaBul(999999).ad, 'Kartal');
      expect(Maskot.asamalar.map((a) => a.sira), [0, 1, 2, 3, 4, 5]);
      for (var i = 1; i < Maskot.asamalar.length; i++) {
        expect(
          Maskot.asamalar[i].esikXp,
          greaterThan(Maskot.asamalar[i - 1].esikXp),
        );
      }
    });

    test('ilerleme sonraki aşamaya doğru; son aşamada 1 ve sonraki yok', () {
      final d = Maskot.durum(const OgrenciDurumu(xp: 150), '2026-10-21');
      expect(d.asama.ad, 'Civciv');
      expect(d.sonraki!.ad, 'Yavru kuş');
      expect(d.ilerleme, closeTo((150 - 50) / (250 - 50), 1e-9));
      final son = Maskot.durum(const OgrenciDurumu(xp: 6000), '2026-10-21');
      expect(son.sonraki, isNull);
      expect(son.ilerleme, 1.0);
      expect(Maskot.durum(const OgrenciDurumu(), '2026-10-21').ilerleme, 0);
    });

    test('ruh hâli son çalışma gününe göre', () {
      String ruh(String? son) =>
          Maskot.durum(OgrenciDurumu(sonGun: son), '2026-10-21').ruhHali;
      expect(ruh(null), contains('ilk dersi'));
      expect(ruh('2026-10-21'), contains('mutlu'));
      expect(ruh('2026-10-19'), contains('bekliyor'));
      expect(ruh('2026-10-10'), contains('özledi'));
    });

    test('maskot saklanmaz: durum alanı eklemez', () {
      const d = OgrenciDurumu(xp: 300);
      final once = d.toJson().toString();
      Maskot.durum(d, '2026-10-21');
      expect(d.toJson().toString(), once);
      expect(
        d.toJson().keys.any((k) => k.toLowerCase().contains('maskot')),
        isFalse,
      );
    });
  });

  group('ekran', () {
    testWidgets('Pratik merkezi: maskot kartı ve halat çekme kartı', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil', xp: 300)),
        kurslar: [hayvanKursu],
      );
      kap.read(yonlendiriciProvider).go('/pratik');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('maskot-karti')), findsOneWidget);
      expect(
        tester.widget<Text>(find.byKey(const ValueKey('maskot-emoji'))).data,
        '🐥',
      );
      expect(find.text('Çalışma arkadaşın: Yavru kuş'), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('pratik-halat')));
      expect(find.byType(HalatEkrani), findsOneWidget);
    });

    testWidgets('oyun: cevapla, geri bildirim, sonuç ve yeniden oyna', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [hayvanKursu],
      );
      final once = kap.read(durumProvider).value!.toJson().toString();
      kap.read(yonlendiriciProvider).go('/halat?tohum=3');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('halat-cizgi')), findsOneWidget);
      expect(find.byKey(const ValueKey('halat-soru')), findsOneWidget);
      expect(find.text('Tur 1 / 12'), findsOneWidget);
      var tur = 0;
      while (find.byKey(const ValueKey('halat-sonuc')).evaluate().isEmpty) {
        expect(++tur, lessThanOrEqualTo(12));
        await dokun(tester, find.byKey(const ValueKey('halat-sik-0')));
        expect(
          find.byKey(const ValueKey('halat-geri-bildirim')),
          findsOneWidget,
        );
        await dokun(tester, find.byKey(const ValueKey('halat-sonraki')));
      }
      expect(find.byKey(const ValueKey('halat-sonuc')), findsOneWidget);
      expect(find.byKey(const ValueKey('maskot-karti')), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('halat-yeniden')));
      expect(find.byKey(const ValueKey('halat-soru')), findsOneWidget);
      expect(
        kap.read(durumProvider).value!.toJson().toString(),
        once,
        reason: 'halat çekme durumu değiştirmez',
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('oyun alanında artık soru vardır (halat çekilir)', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'oyun')),
        kurslar: [hayvanKursu],
      );
      kap.read(yonlendiriciProvider).go('/halat?tohum=1');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('halat-bos')), findsNothing);
      expect(find.byKey(const ValueKey('halat-soru')), findsOneWidget);
    });

    testWidgets('480x600 ölçek 1,5 taşmaz', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [hayvanKursu],
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      kap.read(yonlendiriciProvider).go('/halat?tohum=1');
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      kap.read(yonlendiriciProvider).go('/pratik');
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
