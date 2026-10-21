// ÖZELLİK 69: kod çalıştırıcı arayüzü, JS güvenlik hazırlığı ve (kütüphane
// varsa) gerçek QuickJS motoru.
import 'dart:io';

import 'package:adim_adim/model/kod_calisma.dart';
import 'package:adim_adim/motor/kod_calistirici.dart';
import 'package:adim_adim/servis/js_motoru.dart';
import 'package:flutter_test/flutter_test.dart';

/// Gerçek motor testleri yalnız QuickJS kütüphanesinin yolu verilmişse
/// koşar: `LIBQUICKJSC_TEST_PATH` ortam değişkeni, pub önbelleğindeki
/// `flutter_js-0.8.7/linux/shared/libquickjs_c_bridge_plugin.so` dosyasını
/// göstermelidir.
final String? _kutuphane = Platform.environment['LIBQUICKJSC_TEST_PATH'];
final bool _motorVar = _kutuphane != null && File(_kutuphane!).existsSync();

void main() {
  group('çıktı karşılaştırma', () {
    test('satır sonu ve sondaki boşluklar yok sayılır', () {
      expect(ciktiAyni('1\r\n2  \n\n', '1\n2'), isTrue);
      expect(ciktiAyni('1\n2', '1\n3'), isFalse);
      expect(ciktiAyni('ADA', 'Ada'), isFalse);
    });
    test('boş beklenen eşleşmez', () {
      expect(ciktiAyni('', ''), isFalse);
      expect(ciktiAyni('x', '  \n'), isFalse);
    });
  });

  group('JsKoruma', () {
    String bekcili(String kod) => JsKoruma.bekciliKod(kod).kod!;

    test('döngü ve fonksiyon gövdelerine bekçi eklenir', () {
      final k = bekcili(
        'for (let i = 0; i < 3; i++) {\n  f(i);\n}\n'
        'function f(x) { return x; }\n'
        'while (a) { a--; }\n'
        'const g = () => { return 1; };',
      );
      expect('__adimK();'.allMatches(k).length, 4);
    });

    test('switch gövdesine bekçi eklenmez, case bozulmaz', () {
      final k = bekcili('switch (x) {\n  case 1: y(); break;\n}');
      expect(k, isNot(contains('__adimK')));
    });

    test('do-while kuyruğu boş gövde sayılmaz', () {
      final k = bekcili('do { i++; } while (i < 3);');
      expect('__adimK();'.allMatches(k).length, 1);
      expect(k, endsWith('while (i < 3);'));
    });

    test('boş gövdeli while bekçili bloğa çevrilir', () {
      expect(bekcili('while (true);'), 'while (true){__adimK();}');
    });

    test('süslü parantezsiz döngü reddedilir', () {
      final h = JsKoruma.hazirla('for (let i = 0; i < 3; i++) console.log(i);');
      expect(h.betik, isNull);
      expect(h.hata, contains('süslü parantez'));
    });

    test('dize, yorum, şablon ve düzenli ifade içindeki sözcükler atlanır', () {
      final k = bekcili(
        'const s = "while (x) eval(1)"; // for (;;) x\n'
        r'const t = `for ${a ? "{" : "}"} x`;'
        '\n'
        'const r = /while\\(/g;\n'
        '/* do x */ console.log(s, t, r);',
      );
      expect(k, isNot(contains('__adimK')));
    });

    test('eval, Function, import, require ve .constructor reddedilir', () {
      for (final kod in [
        'eval("1")',
        'new Function("return 1")',
        'import("x")',
        'const fs = require("fs");',
        '(() => {}).constructor("return 1")',
      ]) {
        expect(JsKoruma.hazirla(kod).hata, isNotNull, reason: kod);
      }
      // Sınıf yapıcısı ve özellik adı olarak serbest.
      expect(
        JsKoruma.hazirla('class A { constructor(x) { this.x = x; } }').hata,
        isNull,
      );
      expect(JsKoruma.hazirla('const o = { a: 1 }; o.eval = 2;').hata, isNull);
    });

    test('dengesiz parantez ve kapanmamış dize reddedilir', () {
      expect(JsKoruma.hazirla('if (x) {').hata, isNotNull);
      expect(JsKoruma.hazirla('const s = "abc;').hata, isNotNull);
    });

    test('çok uzun kod reddedilir', () {
      final h = JsKoruma.hazirla('x;' * (JsKoruma.kodEnCokKarakter ~/ 2 + 1));
      expect(h.hata, contains('çok uzun'));
    });

    test('sonuç JSON çözümü', () {
      final s = JsKoruma.sonucCoz('k', {'c': '1\n2', 'h': null, 'z': false});
      expect(s.basarili, isTrue);
      expect(s.cikti, '1\n2');
      final z = JsKoruma.sonucCoz('k', {
        'c': '',
        'h': JsKoruma.zamanIletisi,
        'z': true,
      });
      expect(z.zamanAsimi, isTrue);
      expect(z.basarili, isFalse);
      expect(JsKoruma.sonucCoz('k', 'bozuk').hata, isNotNull);
    });
  });

  test('MotorsuzCalistirici motor yok döner', () async {
    final s = await const MotorsuzCalistirici().calistir('console.log(1)');
    expect(s.motorYok, isTrue);
    expect(s.basarili, isFalse);
  });

  test('QuickJsCalistirici güvenlik reddini motoru açmadan bildirir', () async {
    final s = await const QuickJsCalistirici().calistir('eval("1")');
    expect(s.hata, contains('eval'));
  });

  group(
    'gerçek QuickJS motoru',
    skip: _motorVar ? false : 'QuickJS kütüphanesi yok',
    () {
      const motor = QuickJsCalistirici(sureMs: 500);

      test('console.log çıktısı toplanır', () async {
        final s = await motor.calistir(
          'let t = 0;\nfor (let i = 1; i <= 3; i++) {\n  t += i;\n}\n'
          'console.log("toplam", t);\nconsole.log([1, 2], {a: 1}, null);',
        );
        expect(s.hata, isNull);
        expect(s.cikti, 'toplam 6\n[1,2] {"a":1} null');
      });

      test(
        'sonsuz döngü süre sınırında kesilir, catch ile yutulamaz',
        () async {
          final sw = Stopwatch()..start();
          final s = await motor.calistir(
            'while (true) { try { while (true) {} } catch (e) {} }',
          );
          expect(s.zamanAsimi, isTrue);
          expect(sw.elapsedMilliseconds, lessThan(3000));
        },
      );

      test('sonsuz özyineleme hata verir', () async {
        final s = await motor.calistir('function f() { return f(); }\nf();');
        expect(s.basarili, isFalse);
        expect(s.hata, isNotNull);
      });

      test('ağ ve dosya erişimi yok', () async {
        final s = await motor.calistir(
          'const g = globalThis;\n'
          'console.log(typeof fetch, typeof XMLHttpRequest, typeof g["req" + "uire"], '
          'typeof std, typeof os, typeof setTimeout);',
        );
        expect(
          s.cikti,
          'undefined undefined undefined undefined undefined undefined',
        );
      });

      test('sözdizimi ve çalışma hatası iletilir', () async {
        final s = await motor.calistir('console.log(tanimsiz);');
        expect(s.hata, contains('ReferenceError'));
        final s2 = await motor.calistir('let = ;');
        expect(s2.hata, contains('SyntaxError'));
      });

      test('çıktı sınırı uygulanır', () async {
        final s = await motor.calistir(
          'for (let i = 0; i < 2000; i++) { console.log(i); }',
        );
        expect(
          s.cikti.split('\n').length,
          lessThanOrEqualTo(JsKoruma.ciktiEnCokSatir + 1),
        );
        expect(s.cikti, endsWith('(çıktı kısaltıldı)'));
      });
    },
  );
}
