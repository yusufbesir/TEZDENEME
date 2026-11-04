// Sahibi Yusuf (yusufbesir); yazan: [Claude#guven-derecesi]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Tekrar ekranı güven derecesi (Zor / İyi / Kolay): saf motor (yarı ömür
/// çarpanları, geriye uyumlu JSON) ve oturum arayüzü (480x600, ölçek 1,5).
library;

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _bugun = '2026-11-04';
const _onceki = Kart(
  kutu: 3,
  sonraki: '2026-11-01',
  yariOmurGun: 4,
  sonCevap: true,
);

void main() {
  group('Motor.kartHesapla derece', () {
    test('derece yok: eski x2 davranışı, sonDerece null', () {
      final k = Motor.kartHesapla(_onceki, true, _bugun);
      expect(k.yariOmurGun, 8);
      expect(k.sonDerece, isNull);
      expect(k.sonraki, '2026-11-12');
    });

    test('zor x1,3; iyi x2 (eskiyle aynı); kolay x3', () {
      final zor = Motor.kartHesapla(
        _onceki,
        true,
        _bugun,
        derece: GuvenDerecesi.zor,
      );
      final iyi = Motor.kartHesapla(
        _onceki,
        true,
        _bugun,
        derece: GuvenDerecesi.iyi,
      );
      final kolay = Motor.kartHesapla(
        _onceki,
        true,
        _bugun,
        derece: GuvenDerecesi.kolay,
      );
      expect(zor.yariOmurGun, closeTo(5.2, 1e-9));
      expect(iyi.yariOmurGun, 8);
      expect(kolay.yariOmurGun, 12);
      expect(
        [zor.sonDerece, iyi.sonDerece, kolay.sonDerece],
        ['zor', 'iyi', 'kolay'],
      );
      expect(zor.sonraki.compareTo(kolay.sonraki) < 0, isTrue);
    });

    test('yanlış cevapta derece yok sayılır (yarıya iner)', () {
      final k = Motor.kartHesapla(
        _onceki,
        false,
        _bugun,
        derece: GuvenDerecesi.kolay,
      );
      expect(k.yariOmurGun, 2);
      expect(k.sonDerece, isNull);
      expect(k.sonCevap, false);
    });

    test('üst sınır 180 gün korunur', () {
      const buyuk = Kart(kutu: 5, sonraki: _bugun, yariOmurGun: 100);
      final k = Motor.kartHesapla(
        buyuk,
        true,
        _bugun,
        derece: GuvenDerecesi.kolay,
      );
      expect(k.yariOmurGun, Kart.enCokYariOmur);
    });

    test('kart yoksa başlangıç 1 gün: zor 1,3 / kolay 3', () {
      expect(
        Motor.kartHesapla(
          null,
          true,
          _bugun,
          derece: GuvenDerecesi.zor,
        ).yariOmurGun,
        closeTo(1.3, 1e-9),
      );
      expect(
        Motor.kartHesapla(
          null,
          true,
          _bugun,
          derece: GuvenDerecesi.kolay,
        ).yariOmurGun,
        3,
      );
    });
  });

  group('Motor.kartDerecele', () {
    test(
      'kartIsle x2 yazdıktan sonra dereceyi öncekinden yeniden hesaplar',
      () {
        var d = const OgrenciDurumu(kartlar: {'a#0': _onceki});
        d = Motor.kartIsle(d, 'a#0', true, _bugun);
        expect(d.kartlar['a#0']!.yariOmurGun, 8);
        d = Motor.kartDerecele(d, 'a#0', _onceki, GuvenDerecesi.zor, _bugun);
        expect(d.kartlar['a#0']!.yariOmurGun, closeTo(5.2, 1e-9));
        expect(d.kartlar['a#0']!.sonDerece, 'zor');
        expect(d.hatalar, isEmpty);
      },
    );

    test('kart yoksa durum aynen döner', () {
      const d = OgrenciDurumu();
      expect(
        identical(
          Motor.kartDerecele(d, 'yok', null, GuvenDerecesi.kolay, _bugun),
          d,
        ),
        isTrue,
      );
    });
  });

  group('Kart JSON geriye uyum', () {
    test('sonDerece yoksa anahtar yazılmaz; eski kayıt null okunur', () {
      expect(_onceki.toJson().containsKey('sonDerece'), isFalse);
      final k = Kart.fromJson({'kutu': 2, 'sonraki': '2026-11-04'})!;
      expect(k.sonDerece, isNull);
    });

    test('sonDerece gidiş dönüş; geçersiz değer null', () {
      const k = Kart(kutu: 3, sonraki: _bugun, sonDerece: 'kolay');
      expect(Kart.fromJson(k.toJson())!.sonDerece, 'kolay');
      final j = Map<String, Object?>.from(k.toJson())..['sonDerece'] = 'çok';
      expect(Kart.fromJson(j)!.sonDerece, isNull);
      j['sonDerece'] = 7;
      expect(Kart.fromJson(j)!.sonDerece, isNull);
    });
  });

  group('AlistirmaOturumu güven satırı (480x600)', () {
    const sorular = <Alistirma>[
      Secim(soru: 'İki artı iki?', secenekler: ['üç', 'dört'], dogru: 1),
      Secim(soru: 'Bir artı bir?', secenekler: ['iki', 'beş'], dogru: 0),
    ];

    Future<void> ac(
      WidgetTester tester, {
      bool guvenSor = true,
      List<(int, bool)>? sonuclar,
      List<(int, GuvenDerecesi)>? dereceler,
    }) async {
      tester.view.physicalSize = const Size(480, 600);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.view.reset);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await tester.pumpWidget(
        MaterialApp(
          theme: acikTema(),
          home: Scaffold(
            body: SafeArea(
              child: AlistirmaOturumu(
                alistirmalar: sorular,
                guvenSor: guvenSor,
                onSonuc: (i, d) => sonuclar?.add((i, d)),
                onGuven: (i, g) => dereceler?.add((i, g)),
                onBitti: (_, _) {},
                onKapat: () {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    Future<void> cevapla(WidgetTester tester, String metin) async {
      await tester.tap(find.text(metin));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Kontrol et'));
      await tester.pumpAndSettle();
    }

    testWidgets('doğru cevap: üç düğme görünür, seçim onGuven e gider', (
      tester,
    ) async {
      final sonuclar = <(int, bool)>[];
      final dereceler = <(int, GuvenDerecesi)>[];
      await ac(tester, sonuclar: sonuclar, dereceler: dereceler);
      expect(find.byKey(const Key('guven-zor')), findsNothing);
      await cevapla(tester, 'dört');
      expect(find.text('Ne kadar kolaydı?'), findsOneWidget);
      expect(find.byKey(const Key('guven-zor')), findsOneWidget);
      expect(find.byKey(const Key('guven-iyi')), findsOneWidget);
      expect(find.byKey(const Key('guven-kolay')), findsOneWidget);
      await tester.tap(find.byKey(const Key('guven-kolay')));
      await tester.pumpAndSettle();
      expect(sonuclar, [(0, true)]);
      expect(dereceler, [(0, GuvenDerecesi.kolay)]);
      expect(tester.takeException(), isNull);
    });

    testWidgets('derece seçmeden Devam: eski davranış, onGuven çağrılmaz', (
      tester,
    ) async {
      final dereceler = <(int, GuvenDerecesi)>[];
      await ac(tester, dereceler: dereceler);
      await cevapla(tester, 'dört');
      await tester.tap(find.text('Devam'));
      await tester.pumpAndSettle();
      expect(dereceler, isEmpty);
      expect(find.byKey(const Key('guven-zor')), findsNothing);
    });

    testWidgets('yanlış cevapta güven satırı yok', (tester) async {
      await ac(tester);
      await cevapla(tester, 'üç');
      expect(find.text('Yanlış'), findsOneWidget);
      expect(find.byKey(const Key('guven-zor')), findsNothing);
    });

    testWidgets('guvenSor kapalıysa (varsayılan) satır yok', (tester) async {
      await ac(tester, guvenSor: false);
      await cevapla(tester, 'dört');
      expect(find.byKey(const Key('guven-iyi')), findsNothing);
    });
  });
}
