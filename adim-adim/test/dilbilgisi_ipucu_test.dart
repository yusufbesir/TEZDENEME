// Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga3]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Dilbilgisi ipucu testleri: veri bütünlüğü (en az 10 A1 ipucu, her biri var
/// olan bir derse ve ünite rehberiyle tutarlı üniteye bağlı), seçim mantığı,
/// Pratik merkezi ekranı, ünite rehberindeki kart ve "ilgili alıştırmaya git".
library;

import 'package:adim_adim/bilesenler/dilbilgisi_ipucu_karti.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/ekranlar/ders_ekrani.dart';
import 'package:adim_adim/icerik/dilbilgisi_ipuclari.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/dilbilgisi_ipucu.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/dilbilgisi_ipucu.dart';
import 'package:adim_adim/motor/unite_rehberi.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'dinle_yaz_test.dart' show kelimeKursu, kkDers;

void main() {
  final a1 = tumKurslar.firstWhere((k) => k.id == 'ingilizce-1');

  group('veri', () {
    test(
      'A1 için en az 10 ipucu; hepsi geçerli ve ders kimlikleri benzersiz',
      () {
        final liste = DilbilgisiIpuclari.kursIcin('ingilizce-1');
        expect(liste.length, greaterThanOrEqualTo(10));
        expect(tumDilbilgisiIpuclari.every((i) => i.gecerliMi), isTrue);
        final idler = tumDilbilgisiIpuclari.map((i) => i.dersId).toList();
        expect(idler.toSet().length, idler.length);
      },
    );

    test('her ipucu var olan bir derse ve o dersin ünitesine bağlıdır', () {
      for (final i in tumDilbilgisiIpuclari) {
        final kurs = tumKurslar.firstWhere(
          (k) => k.id == i.kursId,
          orElse: () => throw StateError('kurs yok: ${i.dersId}'),
        );
        final ders = kurs.dersBul(i.dersId);
        expect(ders, isNotNull, reason: i.dersId);
        final unite = kurs.uniteler.firstWhere(
          (u) => u.dersler.any((d) => d.id == i.dersId),
        );
        expect(unite.id, i.uniteId, reason: i.dersId);
      }
    });

    test(
      'ünite rehberiyle tutarlı: ünite için rehber üretilir, ipucu bulunur',
      () {
        for (var u = 0; u < a1.uniteler.length; u++) {
          expect(UniteRehberi.uret(a1, u), isNotNull);
          expect(
            DilbilgisiIpuclari.uniteIcin(a1.uniteler[u].id),
            isNotEmpty,
            reason: 'ünite ${a1.uniteler[u].id} ipuçsuz',
          );
        }
        // Ders notu olan derste (be fiili) ipucu da be fiilini anlatır.
        final be = DilbilgisiIpuclari.dersIcin('ingilizce-1.u1.d2')!;
        expect(be.metin, contains('am'));
        expect(be.ornek, contains('is'));
      },
    );

    test('uniteId/kursId türetimi ve geçersiz ders kimliği', () {
      const i = DilbilgisiIpucu(
        dersId: 'ingilizce-1.u3.d2',
        baslik: 'b',
        metin: 'm',
        ornek: 'o',
        ornekCeviri: 'c',
      );
      expect(i.kursId, 'ingilizce-1');
      expect(i.uniteId, 'ingilizce-1.u3');
      expect(i.gecerliMi, isTrue);
      const kotu = DilbilgisiIpucu(
        dersId: 'x',
        baslik: 'b',
        metin: 'm',
        ornek: 'o',
        ornekCeviri: 'c',
      );
      expect(kotu.gecerliMi, isFalse);
    });
  });

  group('mantık', () {
    test(
      'kurslarIcin: kurs/ünite/ders sırası; olmayan derse bağlı ipucu atlanır',
      () {
        final liste = DilbilgisiIpuclari.kurslarIcin([a1]);
        expect(liste.map((i) => i.dersId).toList(), [
          for (final d in a1.tumDersler)
            if (DilbilgisiIpuclari.dersIcin(d.id) != null) d.id,
        ]);
        // Kursta olmayan ders için ipucu atlanır.
        const yetim = DilbilgisiIpucu(
          dersId: 'ingilizce-1.u9.d9',
          baslik: 'b',
          metin: 'm',
          ornek: 'o',
          ornekCeviri: 'c',
        );
        expect(DilbilgisiIpuclari.kurslarIcin([a1], kaynak: [yetim]), isEmpty);
        expect(DilbilgisiIpuclari.kurslarIcin([kelimeKursu]), isEmpty);
      },
    );

    test('baslangicIndeksi: ilk tamamlanmamış dersin ipucu', () {
      final liste = DilbilgisiIpuclari.kurslarIcin([a1]);
      expect(
        DilbilgisiIpuclari.baslangicIndeksi(const OgrenciDurumu(), liste),
        0,
      );
      final d = OgrenciDurumu(
        tamamlanan: {liste[0].dersId: 1, liste[1].dersId: 2},
      );
      expect(DilbilgisiIpuclari.baslangicIndeksi(d, liste), 2);
      final hepsi = OgrenciDurumu(
        tamamlanan: {for (final i in liste) i.dersId: 1},
      );
      expect(DilbilgisiIpuclari.baslangicIndeksi(hepsi, liste), 0);
      expect(
        DilbilgisiIpuclari.baslangicIndeksi(const OgrenciDurumu(), const []),
        -1,
      );
    });
  });

  group('ekran', () {
    Future<ProviderContainer> ac(
      WidgetTester tester, {
      OgrenciDurumu? durum,
      List<Kurs>? kurslar,
      Size boyut = const Size(500, 1200),
      double olcek = 1.0,
    }) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(durum ?? const OgrenciDurumu(alan: 'dil')),
        kurslar: kurslar ?? tumKurslar,
        boyut: boyut,
        metinOlcegi: olcek,
      );
      return kap;
    }

    testWidgets('açılış: ilk tamamlanmamış dersin ipucu; Sonraki/Önceki', (
      tester,
    ) async {
      final kap = await ac(
        tester,
        durum: const OgrenciDurumu(
          alan: 'dil',
          tamamlanan: {'ingilizce-1.u1.d1': 1},
        ),
      );
      kap.read(yonlendiriciProvider).push('/pratik/ipucu');
      await tester.pumpAndSettle();
      final n = DilbilgisiIpuclari.kursIcin('ingilizce-1').length;
      expect(find.text('2 / $n'), findsOneWidget);
      expect(find.text('Be fiili (am, is, are)'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('ipucu-sonraki')));
      await tester.pumpAndSettle();
      expect(find.text('3 / $n'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('ipucu-onceki')));
      await tester.pumpAndSettle();
      expect(find.text('2 / $n'), findsOneWidget);
    });

    testWidgets('İlgili alıştırmaya git bağlı dersi açar', (tester) async {
      final kap = await ac(
        tester,
        durum: const OgrenciDurumu(
          alan: 'dil',
          tamamlanan: {'ingilizce-1.u1.d1': 1},
        ),
      );
      kap.read(yonlendiriciProvider).push('/pratik/ipucu');
      await tester.pumpAndSettle();
      await tester.tap(
        find.byKey(const ValueKey('ipucu-git-ingilizce-1.u1.d2')),
      );
      await tester.pumpAndSettle();
      expect(find.byType(DersEkrani), findsOneWidget);
    });

    testWidgets('ipucusu olmayan kursta bilgi metni', (tester) async {
      final kap = await ac(tester, kurslar: [kelimeKursu]);
      kap.read(yonlendiriciProvider).push('/pratik/ipucu');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('ipucu-bos')), findsOneWidget);
    });

    testWidgets('kod alanında ipucu yok (bilgi metni)', (tester) async {
      final kap = await ac(
        tester,
        durum: const OgrenciDurumu(alan: 'kod', tamamlanan: {kkDers: 1}),
      );
      kap.read(yonlendiriciProvider).push('/pratik/ipucu');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('ipucu-bos')), findsOneWidget);
    });

    testWidgets('ünite rehberinde ünitenin ipuçları kart olarak görünür', (
      tester,
    ) async {
      final kap = await ac(tester);
      kap
          .read(yonlendiriciProvider)
          .push('/unite-rehberi?kurs=ingilizce-1&unite=0');
      await tester.pumpAndSettle();
      expect(find.byType(DilbilgisiIpucuKarti), findsNWidgets(2));
      expect(find.text('Günün saatine göre selamlama'), findsOneWidget);
      expect(find.text('Be fiili (am, is, are)'), findsOneWidget);
      await tester.ensureVisible(
        find.byKey(const ValueKey('ipucu-git-ingilizce-1.u1.d1')),
      );
      await tester.tap(
        find.byKey(const ValueKey('ipucu-git-ingilizce-1.u1.d1')),
      );
      await tester.pumpAndSettle();
      expect(find.byType(DersEkrani), findsOneWidget);
    });

    testWidgets('Pratik merkezi: dil alanında Dilbilgisi ipucu kartı açılır', (
      tester,
    ) async {
      final kap = await ac(tester);
      kap.read(yonlendiriciProvider).go('/pratik');
      await tester.pumpAndSettle();
      final f = find.byKey(const ValueKey('pratik-ipucu'));
      await tester.ensureVisible(f);
      expect(find.text('Dilbilgisi ipucu'), findsOneWidget);
      await tester.tap(f);
      await tester.pumpAndSettle();
      expect(find.byType(DilbilgisiIpucuKarti), findsOneWidget);
    });

    testWidgets('360x640, ölçek 1,5: taşma yok', (tester) async {
      final kap = await ac(tester, boyut: const Size(360, 640), olcek: 1.5);
      kap.read(yonlendiriciProvider).push('/pratik/ipucu');
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      kap
          .read(yonlendiriciProvider)
          .push('/unite-rehberi?kurs=ingilizce-1&unite=0');
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
