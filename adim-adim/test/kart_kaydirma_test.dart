// Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga3]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kart kaydırma testleri: yön kararı, özet, deste; ekranda kaydırma ve
/// düğmelerle bildim/bilmedim, SRS işleme, günlük kaydı, sonuç ve boş durum.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/kart_kaydirma.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'dinle_yaz_test.dart' show kelimeKursu, kkDers;

OgrenciDurumu _durum() =>
    const OgrenciDurumu(alan: 'dil', tamamlanan: {kkDers: 1});

Future<ProviderContainer> _ac(
  WidgetTester tester, {
  OgrenciDurumu? durum,
  Size boyut = const Size(500, 1000),
  double olcek = 1.0,
}) async {
  final kap = await uygulamayiAc(
    tester,
    BellekDepo(durum ?? _durum()),
    kurslar: [kelimeKursu],
    boyut: boyut,
    metinOlcegi: olcek,
  );
  kap.read(yonlendiriciProvider).push('/pratik/kaydir?tohum=1');
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
  return kap;
}

OgrenciDurumu _oku(ProviderContainer kap) => kap.read(durumProvider).value!;

Future<void> _kaydir(WidgetTester tester, double dx) async {
  await tester.drag(find.byKey(const ValueKey('kaydir-kart')), Offset(dx, 0));
  await tester.pumpAndSettle();
}

void main() {
  group('mantık', () {
    test('yön: eşik üstü kaydırma karar verir, altı vermez', () {
      expect(KartKaydirma.yon(KartKaydirma.esikPx), KaydirmaYonu.sag);
      expect(KartKaydirma.yon(-KartKaydirma.esikPx), KaydirmaYonu.sol);
      expect(KartKaydirma.yon(40), isNull);
      expect(KartKaydirma.yon(-40), isNull);
      expect(KartKaydirma.yon(0), isNull);
    });

    test('yön: kısa ama hızlı fırlatma da karar verir', () {
      expect(KartKaydirma.yon(30, hiz: 1000), KaydirmaYonu.sag);
      expect(KartKaydirma.yon(-30, hiz: -1000), KaydirmaYonu.sol);
      // Hız ters yöndeyse sayılmaz.
      expect(KartKaydirma.yon(30, hiz: -1000), isNull);
    });

    test('özet: sayılar ve yüzde', () {
      final o = KartKaydirma.ozet(3, 1);
      expect(o.toplam, 4);
      expect(o.yuzde, 75);
      expect(KartKaydirma.ozet(0, 0).yuzde, 0);
      expect(KartKaydirma.ozet(2, 1).yuzde, 67);
    });

    test('deste: tamamlanmış dersin kelimeleri, en çok 20', () {
      final d = KartKaydirma.deste(_durum(), [kelimeKursu], tohum: 2);
      expect(d.length, 6);
      expect(
        KartKaydirma.deste(const OgrenciDurumu(alan: 'dil'), [kelimeKursu]),
        isEmpty,
      );
    });
  });

  group('ekran', () {
    testWidgets('sağa kaydır = bildim: kart SRS kümesine doğru girer', (
      tester,
    ) async {
      final kap = await _ac(tester);
      expect(find.text('1 / 6'), findsOneWidget);
      expect(_oku(kap).kartlar, isEmpty);
      await _kaydir(tester, 300);
      expect(find.text('2 / 6'), findsOneWidget);
      final d = _oku(kap);
      expect(d.kartlar, hasLength(1));
      expect(d.kartlar.values.first.sonCevap, isTrue);
      expect(d.hatalar, isEmpty);
    });

    testWidgets('sola kaydır = bilmedim: kart yanlış işlenir, hata defteri', (
      tester,
    ) async {
      final kap = await _ac(tester);
      await _kaydir(tester, -300);
      expect(find.text('2 / 6'), findsOneWidget);
      final d = _oku(kap);
      expect(d.kartlar, hasLength(1));
      expect(d.kartlar.values.first.sonCevap, isFalse);
      expect(d.hatalar, hasLength(1));
    });

    testWidgets('kısa kaydırma karar vermez; kart yerine döner', (
      tester,
    ) async {
      final kap = await _ac(tester);
      await _kaydir(tester, 30);
      expect(find.text('1 / 6'), findsOneWidget);
      expect(_oku(kap).kartlar, isEmpty);
    });

    testWidgets('düğmeler: Bildim ve Bilmedim', (tester) async {
      final kap = await _ac(tester);
      await tester.tap(find.byKey(const ValueKey('kaydir-bildim')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('kaydir-bilmedim')));
      await tester.pumpAndSettle();
      expect(find.text('3 / 6'), findsOneWidget);
      final sonCevaplar = _oku(kap).kartlar.values.map((k) => k.sonCevap);
      expect(sonCevaplar, containsAll([true, false]));
    });

    testWidgets('dokununca kart çevrilir (anlam görünür)', (tester) async {
      await _ac(tester);
      expect(find.text('Kelime'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('kaydir-kart')));
      await tester.pumpAndSettle();
      expect(find.text('Anlam'), findsOneWidget);
      // Kaydırınca yeni kart yine kelime yüzüyle gelir.
      await _kaydir(tester, 300);
      expect(find.text('Kelime'), findsOneWidget);
    });

    testWidgets('deste bitince sonuç ve günlük kaydı; Tekrar dene', (
      tester,
    ) async {
      final kap = await _ac(tester);
      for (var i = 0; i < 4; i++) {
        await _kaydir(tester, 300);
      }
      await _kaydir(tester, -300);
      await _kaydir(tester, -300);
      expect(find.text('Deste bitti'), findsOneWidget);
      expect(find.text('Bildim: 4 · Bilmedim: 2'), findsOneWidget);
      expect(find.text('Bilinen oran: %67'), findsOneWidget);
      expect(_oku(kap).gunluk, hasLength(1));
      await tester.tap(find.byKey(const ValueKey('kaydir-yeniden')));
      await tester.pumpAndSettle();
      expect(find.text('1 / 6'), findsOneWidget);
    });

    testWidgets('ortada geri çıkınca cevaplananlar günlüğe yazılır', (
      tester,
    ) async {
      final kap = await _ac(tester);
      await _kaydir(tester, 300);
      await tester.tap(find.byTooltip('Geri'));
      await tester.pumpAndSettle();
      expect(_oku(kap).gunluk, hasLength(1));
      expect(find.byKey(const ValueKey('kaydir-kart')), findsNothing);
    });

    testWidgets('hiç kart cevaplanmadan çıkınca günlüğe yazılmaz', (
      tester,
    ) async {
      final kap = await _ac(tester);
      await tester.tap(find.byTooltip('Geri'));
      await tester.pumpAndSettle();
      expect(_oku(kap).gunluk, isEmpty);
    });

    testWidgets('kelime yoksa bilgi metni', (tester) async {
      await _ac(tester, durum: const OgrenciDurumu(alan: 'dil'));
      expect(find.byKey(const ValueKey('kaydir-bos')), findsOneWidget);
    });

    testWidgets('Pratik merkezi kartı ekranı açar', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(_durum()),
        kurslar: [kelimeKursu],
      );
      kap.read(yonlendiriciProvider).go('/pratik');
      await tester.pumpAndSettle();
      final f = find.byKey(const ValueKey('pratik-kaydir'));
      await tester.ensureVisible(f);
      expect(find.text('Kart kaydırma'), findsOneWidget);
      await tester.tap(f);
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('kaydir-kart')), findsOneWidget);
    });

    testWidgets('360x640, ölçek 1,5: taşma yok', (tester) async {
      await _ac(tester, boyut: const Size(360, 640), olcek: 1.5);
      expect(tester.takeException(), isNull);
      await _kaydir(tester, 300);
      expect(tester.takeException(), isNull);
    });
  });
}
