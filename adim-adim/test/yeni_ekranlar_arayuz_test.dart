// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Öneri (73), öğrenme yolu (74) ve hafıza puanı / çok modlu çalışma (78)
/// arayüzü: Profil ve Pratik merkezi satırları, ekranlar, dört mod; 480x600
/// ölçek 1,5 taşmaz.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/ekranlar/calisma_modlari_ekrani.dart';
import 'package:adim_adim/ekranlar/ders_ekrani.dart';
import 'package:adim_adim/ekranlar/ogrenme_yolu_ekrani.dart';
import 'package:adim_adim/ekranlar/oneri_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'yeni_ozellik_icerik.dart';

Kart _kart(String sonraki, double yo) =>
    Kart(kutu: Kart.kutuHesapla(yo), sonraki: sonraki, yariOmurGun: yo);

final _calisilmis = OgrenciDurumu(
  alan: 'dil',
  tamamlanan: const {tDers1: 1, tDers2: 1},
  kartlar: {
    '$tDers1#0': _kart('2026-10-14', 1), // bekleyen (bugün 2026-10-15)
    '$tDers1#1': _kart('2026-12-01', 1),
    '$tDers2#0': _kart('2026-12-01', 1),
  },
);

Future<void> _profile(WidgetTester tester) async {
  await dokun(tester, find.byIcon(Icons.person_outline));
}

void main() {
  group('öneri (73)', () {
    testWidgets(
      'Profil satırı ilk öneriyi gösterir; ekran gerekçe ve süre verir',
      (tester) async {
        await uygulamayiAc(
          tester,
          BellekDepo(_calisilmis),
          kurslar: [hayvanKursu],
        );
        await _profile(tester);
        final ozet = find.byKey(const ValueKey('profil-oneri-ozet'));
        await tester.ensureVisible(ozet);
        expect(tester.widget<Text>(ozet).data, 'Bekleyen kartları tekrar et');
        await dokun(tester, find.byKey(const ValueKey('profil-oneri')));
        expect(find.byType(OneriEkrani), findsOneWidget);
        expect(find.textContaining('Bunu öneriyoruz çünkü'), findsWidgets);
        expect(find.byKey(const ValueKey('oneri-sure-tekrar')), findsOneWidget);
        expect(find.textContaining('~'), findsWidgets);
        expect(
          find.byKey(const ValueKey('oneri-siradakiDers')),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets('Başla ilgili ekranı açar (sıradaki ders)', (tester) async {
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [hayvanKursu],
      );
      await _profile(tester);
      await dokun(tester, find.byKey(const ValueKey('profil-oneri')));
      await dokun(
        tester,
        find.byKey(const ValueKey('oneri-basla-siradakiDers')),
      );
      expect(find.byType(OneriEkrani), findsNothing);
      expect(find.byType(DersEkrani), findsOneWidget);
    });

    testWidgets('öneri yoksa bilgi metni', (tester) async {
      final bitmis = OgrenciDurumu(
        alan: 'dil',
        tamamlanan: const {tDers1: 1, tDers2: 1, tDers3: 1},
      );
      await uygulamayiAc(tester, BellekDepo(bitmis), kurslar: [hayvanKursu]);
      await _profile(tester);
      await dokun(tester, find.byKey(const ValueKey('profil-oneri')));
      expect(find.byKey(const ValueKey('oneri-bos')), findsOneWidget);
    });

    testWidgets('480x600 ölçek 1,5 taşmaz', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(_calisilmis),
        kurslar: [hayvanKursu],
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      kap.read(yonlendiriciProvider).go('/oneri');
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });

  group('öğrenme yolu (74)', () {
    testWidgets('yol, seviye ve kurs yüzdeleri; kursa dokununca Yol sekmesi', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil', tamamlanan: {tDers1: 1})),
        kurslar: [hayvanKursu],
      );
      await _profile(tester);
      await dokun(tester, find.byKey(const ValueKey('profil-ogrenme-yolu')));
      expect(find.byType(OgrenmeYoluEkrani), findsOneWidget);
      expect(find.byKey(const ValueKey('yol-ingilizce-t1')), findsOneWidget);
      // 1/3 ders -> %33
      expect(
        tester
            .widget<Text>(find.byKey(const ValueKey('yol-yuzde-ingilizce-t1')))
            .data,
        '%33',
      );
      expect(
        tester
            .widget<Text>(
              find.byKey(const ValueKey('yol-kurs-yuzde-ingilizce-t1')),
            )
            .data,
        '1/3 ders · %33',
      );
      expect(
        find.byKey(const ValueKey('yol-seviye-ingilizce-t1-1')),
        findsOneWidget,
      );
      await dokun(tester, find.byKey(const ValueKey('yol-kurs-ingilizce-t1')));
      expect(find.byType(OgrenmeYoluEkrani), findsNothing);
      expect(kap.read(secilenKursProvider), tKursId);
    });

    testWidgets('480x600 ölçek 1,5 taşmaz', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [hayvanKursu],
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      kap.read(yonlendiriciProvider).go('/ogrenme-yolu');
      await tester.pumpAndSettle();
      expect(find.byType(OgrenmeYoluEkrani), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('hafıza puanı ve çok modlu çalışma (78)', () {
    Future<ProviderContainer> ac(WidgetTester tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(_calisilmis),
        kurslar: [hayvanKursu],
      );
      kap.read(yonlendiriciProvider).go('/pratik');
      await tester.pumpAndSettle();
      await dokun(tester, find.byKey(const ValueKey('pratik-hafiza')));
      return kap;
    }

    testWidgets('Pratik merkezi kartı, ünite puanı ve mod listesi', (
      tester,
    ) async {
      await ac(tester);
      expect(find.byType(CalismaModlariEkrani), findsOneWidget);
      final puan = find.byKey(const ValueKey('hafiza-puan-$tKursId-0'));
      expect(int.parse(tester.widget<Text>(puan).data!), greaterThan(0));
      await dokun(
        tester,
        find.byKey(const ValueKey('hafiza-unite-$tKursId-0')),
      );
      expect(find.byType(CalismaModuEkrani), findsOneWidget);
      expect(find.byKey(const ValueKey('mod-puan')), findsOneWidget);
      for (final m in ['kart', 'yazma', 'eslestirme', 'test']) {
        expect(find.byKey(ValueKey('mod-$m')), findsOneWidget);
      }
    });

    testWidgets('kart modu: çevir, bildim, bitirince sonuç', (tester) async {
      final kap = await ac(tester);
      final once = kap.read(durumProvider).value!.toJson().toString();
      await dokun(
        tester,
        find.byKey(const ValueKey('hafiza-unite-$tKursId-0')),
      );
      await dokun(tester, find.byKey(const ValueKey('mod-kart')));
      final yuz = find.byKey(const ValueKey('kart-yuz'));
      final onYuz = tester.widget<Text>(yuz).data;
      await dokun(tester, find.byKey(const ValueKey('kart-cevir')));
      expect(tester.widget<Text>(yuz).data, isNot(onYuz));
      for (var i = 0; i < hayvanSayisi; i++) {
        await dokun(tester, find.byKey(const ValueKey('kart-bildim')));
      }
      expect(
        find.text('$hayvanSayisi sorudan $hayvanSayisi doğru'),
        findsOneWidget,
      );
      expect(
        kap.read(durumProvider).value!.toJson().toString(),
        once,
        reason: 'çalışma modları durumu değiştirmez',
      );
    });

    testWidgets('yazma modu: yanlış ve doğru cevap geri bildirimi', (
      tester,
    ) async {
      await ac(tester);
      await dokun(
        tester,
        find.byKey(const ValueKey('hafiza-unite-$tKursId-0')),
      );
      await dokun(tester, find.byKey(const ValueKey('mod-yazma')));
      final anlam = tester
          .widget<Text>(find.byKey(const ValueKey('yazma-soru')))
          .data!;
      const sozluk = {
        'kedi': 'cat',
        'köpek': 'dog',
        'kuş': 'bird',
        'balık': 'fish',
        'at': 'horse',
        'inek': 'cow',
      };
      await tester.enterText(
        find.byKey(const ValueKey('yazma-alan')),
        'yanlis',
      );
      await dokun(tester, find.byKey(const ValueKey('yazma-kontrol')));
      expect(
        tester
            .widget<Text>(find.byKey(const ValueKey('yazma-geri-bildirim')))
            .data,
        'Yanlış. Doğrusu: ${sozluk[anlam]}',
      );
      await dokun(tester, find.byKey(const ValueKey('yazma-sonraki')));
      final anlam2 = tester
          .widget<Text>(find.byKey(const ValueKey('yazma-soru')))
          .data!;
      await tester.enterText(
        find.byKey(const ValueKey('yazma-alan')),
        sozluk[anlam2]!.toUpperCase(),
      );
      await dokun(tester, find.byKey(const ValueKey('yazma-kontrol')));
      expect(
        tester
            .widget<Text>(find.byKey(const ValueKey('yazma-geri-bildirim')))
            .data,
        'Doğru',
      );
    });

    testWidgets('eşleştirme modu: yanlış sayılır, doğru çiftler biter', (
      tester,
    ) async {
      await ac(tester);
      await dokun(
        tester,
        find.byKey(const ValueKey('hafiza-unite-$tKursId-0')),
      );
      await dokun(tester, find.byKey(const ValueKey('mod-eslestirme')));
      // Yanlış çift: sol 0, sağ 1.
      await dokun(tester, find.byKey(const ValueKey('esles-sol-0')));
      await dokun(tester, find.byKey(const ValueKey('esles-sag-1')));
      expect(find.textContaining('Yanlış: 1'), findsOneWidget);
      // Hepsini doğru eşle (sol önce).
      for (var k = 0; k < hayvanSayisi; k++) {
        await dokun(tester, find.byKey(ValueKey('esles-sol-$k')));
        await dokun(tester, find.byKey(ValueKey('esles-sag-$k')));
      }
      expect(
        find.text('${hayvanSayisi + 1} sorudan $hayvanSayisi doğru'),
        findsOneWidget,
      );
    });

    testWidgets('test modu: doğru şık işaretlenir, bitince sonuç ve yeniden', (
      tester,
    ) async {
      await ac(tester);
      await dokun(
        tester,
        find.byKey(const ValueKey('hafiza-unite-$tKursId-0')),
      );
      await dokun(tester, find.byKey(const ValueKey('mod-test')));
      for (var i = 0; i < hayvanSayisi; i++) {
        expect(find.byKey(const ValueKey('test-soru')), findsOneWidget);
        await dokun(tester, find.byKey(const ValueKey('test-sec-0')));
        await dokun(tester, find.byKey(const ValueKey('test-sonraki')));
      }
      expect(find.byKey(const ValueKey('oturum-sonuc')), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('oturum-yeniden')));
      expect(find.byKey(const ValueKey('test-soru')), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('mod-kapat')));
      expect(find.byKey(const ValueKey('mod-test')), findsOneWidget);
    });

    testWidgets(
      'çalışılmış ünite yoksa bilgi metni; 480x600 ölçek 1,5 taşmaz',
      (tester) async {
        final kap = await uygulamayiAc(
          tester,
          BellekDepo(const OgrenciDurumu(alan: 'dil')),
          kurslar: [hayvanKursu],
          boyut: const Size(480, 600),
          metinOlcegi: 1.5,
        );
        kap.read(yonlendiriciProvider).go('/calisma-modlari');
        await tester.pumpAndSettle();
        expect(
          find.textContaining('Henüz çalışılmış ünite yok'),
          findsOneWidget,
        );
        kap
            .read(yonlendiriciProvider)
            .go('/calisma-modu?kurs=$tKursId&unite=0');
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      },
    );
  });
}
