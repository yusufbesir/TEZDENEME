// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Konuşma alıştırması arayüzü (ÖZELLİK 8.7): SahteKonusma ile akış (doğru
/// söyleyiş -> doğru; 3 yanlış -> yanlış ve doğru metin), KonusmaYok ile "atla"
/// (onSonuc çağrılmaz), ayar kapalıyken dersten çıkarılma, 480x600 @1,5 taşma.
library;

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/servis/konusma.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _soyle = Soyle(
  soru: 'Cümleyi yüksek sesle söyle.',
  metin: 'I am from Turkey.',
  ceviri: "Türkiye'denim.",
);
const _secim = Secim(
  soru: 'İki artı iki kaç eder?',
  secenekler: ['üç', 'dört', 'beş'],
  dogru: 1,
);

final _mikrofon = find.byKey(const Key('soyle-mikrofon'));
final _atla = find.byKey(const Key('soyle-atla'));

/// Mikrofona dokunur ve asenkron tanıma akışının bitmesini bekler.
Future<void> _konus(WidgetTester tester) async {
  await dokun(tester, _mikrofon);
  await tester.pump(const Duration(milliseconds: 50));
  await tester.pumpAndSettle();
}

class _Sonuclar {
  final sonuclar = <(int, bool)>[];
  (int, int)? bitti;
}

Future<_Sonuclar> _ac(
  WidgetTester tester,
  KonusmaTanima konusma, {
  List<Alistirma> liste = const [_soyle, _secim],
  OgrenciDurumu durum = const OgrenciDurumu(alan: 'dil'),
  Size boyut = const Size(500, 1600),
  double metinOlcegi = 1.0,
  SahteSes? ses,
}) async {
  tester.view.physicalSize = boyut;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  tester.platformDispatcher.textScaleFactorTestValue = metinOlcegi;
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  final s = _Sonuclar();
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        depoProvider.overrideWithValue(BellekDepo(durum)),
        sesProvider.overrideWithValue(ses ?? SahteSes()),
        konusmaProvider.overrideWithValue(konusma),
      ],
      child: MaterialApp(
        theme: acikTema(),
        home: Scaffold(
          body: SafeArea(
            child: AlistirmaOturumu(
              alistirmalar: liste,
              onSonuc: (i, d) => s.sonuclar.add((i, d)),
              onBitti: (d, t) => s.bitti = (d, t),
              onKapat: () {},
            ),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return s;
}

void main() {
  testWidgets('doğru söyleyiş: yeşil kelimeler, %100, Kontrol et -> Doğru', (
    tester,
  ) async {
    final s = await _ac(tester, SahteKonusma(yanitlar: ['i am from turkey']));
    expect(find.text('I am from Turkey.'), findsOneWidget);
    expect(find.text("Türkiye'denim."), findsOneWidget);
    expect(_atla, findsNothing);
    await _konus(tester);
    expect(find.byKey(const Key('soyle-yuzde')), findsOneWidget);
    expect(find.textContaining('%100'), findsOneWidget);
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Doğru!'), findsOneWidget);
    expect(s.sonuclar, [(0, true)]);
  });

  testWidgets('3 yanlış deneme: yanlış sayılır ve doğru metin gösterilir', (
    tester,
  ) async {
    final konusma = SahteKonusma(
      yanitlar: ['banana', 'something else', 'no way'],
    );
    final s = await _ac(tester, konusma);
    await _konus(tester);
    expect(find.textContaining('deneme 1/3'), findsOneWidget);
    expect(find.text('Tekrar dene'), findsOneWidget);
    expect(find.text('Doğru söylenişi: I am from Turkey.'), findsNothing);
    await _konus(tester);
    expect(find.textContaining('deneme 2/3'), findsOneWidget);
    await _konus(tester);
    expect(find.textContaining('deneme 3/3'), findsOneWidget);
    expect(find.text('Doğru söylenişi: I am from Turkey.'), findsOneWidget);
    expect(_mikrofon, findsNothing);
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Yanlış'), findsOneWidget);
    expect(find.textContaining('Doğru cevap: I am from Turkey.'), findsOne);
    expect(s.sonuclar, [(0, false)]);
  });

  testWidgets('ikinci denemede doğru söylenirse doğru sayılır', (tester) async {
    final s = await _ac(
      tester,
      SahteKonusma(yanitlar: ['from', 'I am from Turkey']),
    );
    await _konus(tester);
    await _konus(tester);
    expect(find.textContaining('deneme 2/3'), findsOneWidget);
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Doğru!'), findsOneWidget);
    expect(s.sonuclar, [(0, true)]);
  });

  testWidgets('hiçbir şey duyulmazsa deneme sayılmaz', (tester) async {
    await _ac(tester, SahteKonusma(yanitlar: ['', 'i am from turkey']));
    await _konus(tester);
    expect(find.textContaining('duyamadım'), findsOneWidget);
    expect(find.byKey(const Key('soyle-yuzde')), findsNothing);
    await _konus(tester);
    expect(find.textContaining('deneme 1/3'), findsOneWidget);
  });

  testWidgets('Dinle düğmesi hedef cümleyi TTS ile okur', (tester) async {
    final ses = SahteSes();
    await _ac(tester, SahteKonusma(), ses: ses);
    await dokun(tester, find.byKey(const Key('soyle-dinle')));
    expect(ses.okunanlar, ['I am from Turkey.']);
  });

  testWidgets('KonusmaYok: hazır değil mesajı ve atla; onSonuc çağrılmaz', (
    tester,
  ) async {
    final s = await _ac(tester, const KonusmaYok());
    expect(find.text('Konuşma tanıma bu cihazda hazır değil'), findsOneWidget);
    expect(_mikrofon, findsNothing);
    await dokun(tester, _atla);
    expect(s.sonuclar, isEmpty);
    // Sıradaki alıştırmaya geçildi.
    expect(find.text('İki artı iki kaç eder?'), findsOneWidget);
    await dokun(tester, find.text('dört'));
    await dokun(tester, find.text('Kontrol et'));
    await dokun(tester, find.text('Bitir'));
    expect(s.sonuclar, [(1, true)]);
    // Atlanan toplamdan düşer: 1 doğru / 1.
    expect(s.bitti, (1, 1));
  });

  testWidgets('izin verilmezse atla yolu açılır', (tester) async {
    final s = await _ac(tester, SahteKonusma(izin: false));
    await _konus(tester);
    expect(find.text('Mikrofon izni verilmedi'), findsOneWidget);
    await dokun(tester, _atla);
    expect(s.sonuclar, isEmpty);
  });

  testWidgets('ayar kapalıyken (konusmaAcik=false) atla yolu gösterilir', (
    tester,
  ) async {
    final s = await _ac(
      tester,
      SahteKonusma(yanitlar: ['x']),
      durum: const OgrenciDurumu(alan: 'dil', konusmaAcik: false),
    );
    expect(find.text('Konuşma alıştırmaları ayarlardan kapalı'), findsOne);
    expect(_mikrofon, findsNothing);
    await dokun(tester, _atla);
    expect(s.sonuclar, isEmpty);
  });

  group('ders akışı: ayar kapalıyken Soyle çıkarılır', () {
    final kurs = Kurs(
      id: 'k',
      ad: 'Kurs',
      aciklama: '',
      alan: KursAlani.dil,
      uniteler: [
        Unite(
          id: 'k.u1',
          ad: 'Ü',
          dersler: [
            Ders(
              id: 'k.u1.d1',
              ad: 'Ders Soyle',
              alistirmalar: const [_soyle, _secim],
            ),
          ],
        ),
      ],
    );

    testWidgets('açıkken ilk alıştırma Soyle, 1/2', (tester) async {
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [kurs],
      );
      await dokun(tester, find.textContaining('Ders Soyle'));
      expect(find.text('I am from Turkey.'), findsOneWidget);
      expect(find.text('1/2'), findsOneWidget);
    });

    testWidgets('kapalıyken Soyle yok, yalnız Secim (1/1)', (tester) async {
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil', konusmaAcik: false)),
        kurslar: [kurs],
      );
      await dokun(tester, find.textContaining('Ders Soyle'));
      expect(find.text('I am from Turkey.'), findsNothing);
      expect(find.text('İki artı iki kaç eder?'), findsOneWidget);
      expect(find.text('1/1'), findsOneWidget);
    });
  });

  group('yerleşim 480x600 @1,5', () {
    const boyut = Size(480, 600);
    const olcek = 1.5;

    testWidgets('başlangıç, dinleme, kısmi sonuç, son başarısız sonuç', (
      tester,
    ) async {
      await _ac(
        tester,
        SahteKonusma(yanitlar: ['a b', 'c d', 'e f']),
        boyut: boyut,
        metinOlcegi: olcek,
      );
      expect(tester.takeException(), isNull);
      for (var i = 0; i < 3; i++) {
        await _konus(tester);
        expect(tester.takeException(), isNull);
      }
      expect(find.text('Doğru söylenişi: I am from Turkey.'), findsOneWidget);
      await dokun(tester, find.text('Kontrol et'));
      expect(tester.takeException(), isNull);
    });

    testWidgets('hazır değil ve izin yok durumları', (tester) async {
      await _ac(tester, const KonusmaYok(), boyut: boyut, metinOlcegi: olcek);
      expect(find.text('Bu alıştırmayı atla'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
