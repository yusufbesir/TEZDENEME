/// Uygulama kilidi testleri: PIN karması, deneme sayacı, JSON uyumu ve
/// kilit ekranı/ayarlar akışı.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Yazan: [Claude#kilit-2026-11-04].
library;

import 'dart:convert';
import 'dart:math';

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/ekranlar/kilit_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/kilit.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'arayuz_test.dart' show ayarlariAc;

void main() {
  group('KilitAyari', () {
    test('PIN düz metin saklanmaz, doğru PIN geçer, yanlış geçmez', () {
      final k = KilitAyari.olustur('1234', rastgele: Random(1));
      expect(jsonEncode(k.toJson()).contains('1234'), isFalse);
      expect(k.dogrula('1234'), isTrue);
      expect(k.dogrula('1235'), isFalse);
      expect(k.dogrula('12'), isFalse);
    });

    test('geçersiz PIN reddedilir', () {
      expect(() => KilitAyari.olustur('12a4'), throwsArgumentError);
      expect(KilitAyari.pinGecerli('123'), isFalse);
      expect(KilitAyari.pinGecerli('123456'), isTrue);
    });

    test('geçersiz PIN hata iletisi PIN değerini taşımaz', () {
      try {
        KilitAyari.olustur('12a4');
        fail('fırlatmalıydı');
      } on ArgumentError catch (e) {
        expect(e.toString().contains('12a4'), isFalse);
      }
    });

    test('farklı tuz farklı karma verir', () {
      final a = KilitAyari.olustur('1234', rastgele: Random(1));
      final b = KilitAyari.olustur('1234', rastgele: Random(2));
      expect(a.karma, isNot(b.karma));
    });

    test('JSON gidiş-dönüş ve bozuk kayıt null', () {
      final k = KilitAyari.olustur('4321', rastgele: Random(3));
      final geri = KilitAyari.fromJson(k.toJson());
      expect(geri!.dogrula('4321'), isTrue);
      expect(KilitAyari.fromJson(null), isNull);
      expect(KilitAyari.fromJson({'tuz': 'x', 'karma': 'zz'}), isNull);
    });

    test('durum JSON: eski kayıt kilitsiz, kilit korunur', () {
      expect(OgrenciDurumu.fromJson(const {}).kilit, isNull);
      final k = KilitAyari.olustur('1234', rastgele: Random(4));
      final d = const OgrenciDurumu().copyWith(kilit: k);
      final geri = OgrenciDurumu.fromJson(
        jsonDecode(jsonEncode(d.toJson())) as Map<String, dynamic>,
      );
      expect(geri.kilit!.dogrula('1234'), isTrue);
      expect(d.copyWith(kilitSil: true).kilit, isNull);
    });
  });

  group('DenemeKilidi', () {
    test('5 yanlıştan sonra 30 sn bekleme, doğruda sıfırlanır', () {
      final t = DateTime(2026, 11, 4, 12);
      var d = const DenemeKilidi();
      for (var i = 0; i < 4; i++) {
        d = d.yanlisDene(t);
        expect(d.bekliyorMu(t), isFalse);
      }
      d = d.yanlisDene(t);
      expect(d.bekliyorMu(t), isTrue);
      expect(d.kalan(t), KilitAyari.beklemeSuresi);
      expect(d.bekliyorMu(t.add(const Duration(seconds: 31))), isFalse);
      expect(d.sifirla().bekliyorMu(t), isFalse);
    });
  });

  group('KilitEkrani', () {
    Future<void> pinGir(WidgetTester tester, String pin) async {
      for (final h in pin.split('')) {
        await tester.tap(find.byKey(ValueKey('kilit-tus-$h')));
        await tester.pump();
      }
      await tester.tap(find.byKey(const ValueKey('kilit-tus-tamam')));
      await tester.pump();
    }

    testWidgets('yanlış PIN hata gösterir, doğru PIN açar', (tester) async {
      var acildi = false;
      final k = KilitAyari.olustur('1234', rastgele: Random(5));
      await tester.pumpWidget(
        MaterialApp(
          theme: acikTema(),
          home: KilitEkrani(dogrula: k.dogrula, acildi: () => acildi = true),
        ),
      );
      await pinGir(tester, '9999');
      expect(find.byKey(const ValueKey('kilit-hata')), findsOneWidget);
      expect(acildi, isFalse);
      await pinGir(tester, '1234');
      expect(acildi, isTrue);
    });

    testWidgets('5 yanlışta bekleme: tuşlar işlemez', (tester) async {
      var acildi = false;
      final k = KilitAyari.olustur('1234', rastgele: Random(6));
      await tester.pumpWidget(
        MaterialApp(
          theme: acikTema(),
          home: KilitEkrani(dogrula: k.dogrula, acildi: () => acildi = true),
        ),
      );
      for (var i = 0; i < 5; i++) {
        await pinGir(tester, '0000');
      }
      expect(find.textContaining('bekle'), findsOneWidget);
      await pinGir(tester, '1234');
      expect(acildi, isFalse);
      // Sayaç zamanlayıcısını bitir.
      await tester.pump(const Duration(seconds: 31));
      await tester.pump(const Duration(seconds: 1));
    });
  });

  group('Uygulama içi kapı ve ayarlar', () {
    testWidgets('kilitli kayıtla açılışta kilit ekranı, PIN ile içerik', (
      tester,
    ) async {
      final k = KilitAyari.olustur('1234', rastgele: Random(7));
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil').copyWith(kilit: k)),
      );
      expect(find.text('PIN gir'), findsOneWidget);
      for (final h in '1234'.split('')) {
        await tester.tap(find.byKey(ValueKey('kilit-tus-$h')));
        await tester.pump();
      }
      await tester.tap(find.byKey(const ValueKey('kilit-tus-tamam')));
      await tester.pumpAndSettle();
      expect(find.text('PIN gir'), findsNothing);
    });

    testWidgets('kilitliyken alt içerik semantics dışı, geri tuşu pop etmez', (
      tester,
    ) async {
      final k = KilitAyari.olustur('1234', rastgele: Random(8));
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil').copyWith(kilit: k)),
      );
      expect(find.byType(ExcludeSemantics), findsWidgets);
      expect(
        find.ancestor(
          of: find.byType(NavigationBar),
          matching: find.byType(IgnorePointer),
        ),
        findsWidgets,
      );
      final pop = find.ancestor(
        of: find.byType(KilitEkrani),
        matching: find.byType(PopScope),
      );
      expect(pop, findsOneWidget);
      expect(tester.widget<PopScope>(pop).canPop, isFalse);
      await tester.binding.handlePopRoute();
      await tester.pump();
      expect(find.text('PIN gir'), findsOneWidget);
    });

    testWidgets('kilitsiz kayıtta kilit ekranı yok', (tester) async {
      await uygulamayiAc(tester, null);
      expect(find.text('PIN gir'), findsNothing);
    });

    testWidgets('ayarlardan kilit kurulur ve yanlış PIN ile kapanmaz', (
      tester,
    ) async {
      final c = await uygulamayiAc(tester, null);
      await ayarlariAc(tester);
      final anahtar = find.byKey(const ValueKey('ayar-kilit'));
      await tester.dragUntilVisible(
        anahtar,
        find.byType(ListView).last,
        const Offset(0, -300),
      );
      await dokun(tester, anahtar);
      await tester.enterText(find.byKey(const ValueKey('pin-alan')), '1234');
      await tester.enterText(find.byKey(const ValueKey('pin-tekrar')), '1235');
      await dokun(tester, find.byKey(const ValueKey('pin-tamam')));
      expect(find.byKey(const ValueKey('pin-hata')), findsOneWidget);
      await tester.enterText(find.byKey(const ValueKey('pin-tekrar')), '1234');
      await dokun(tester, find.byKey(const ValueKey('pin-tamam')));
      final kilit = c.read(durumProvider).value!.kilit;
      expect(kilit, isNotNull);
      expect(kilit!.dogrula('1234'), isTrue);

      await dokun(tester, anahtar);
      await tester.enterText(find.byKey(const ValueKey('pin-alan')), '0000');
      await dokun(tester, find.byKey(const ValueKey('pin-tamam')));
      expect(c.read(durumProvider).value!.kilit, isNotNull);

      await dokun(tester, anahtar);
      await tester.enterText(find.byKey(const ValueKey('pin-alan')), '1234');
      await dokun(tester, find.byKey(const ValueKey('pin-tamam')));
      expect(c.read(durumProvider).value!.kilit, isNull);
    });
  });
}
