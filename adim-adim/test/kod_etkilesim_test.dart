// ÖZELLİK 68 (kodda etkileşimli türler) ve 69 (çalıştırılabilir ders): model,
// motor, içerik doğruluğu ve arayüz akışı. Gerçek motor yalnız
// LIBQUICKJSC_TEST_PATH verilmişse kullanılır; arayüzde sahte çalıştırıcı.
import 'dart:convert';
import 'dart:io';

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/icerik/etkilesimli_kod.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/ders_meta.dart';
import 'package:adim_adim/motor/kod_calistirici.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/servis/js_motoru.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

final String? _kutuphane = Platform.environment['LIBQUICKJSC_TEST_PATH'];
final bool _motorVar = _kutuphane != null && File(_kutuphane!).existsSync();

/// Testte gerçek motor yerine: kodu çalıştırmaz, verilen eşlemeden çıktı
/// döndürür (yoksa boş çıktı); çağrıları kaydeder.
class SahteCalistirici extends KodCalistirici {
  SahteCalistirici(this.ciktilar, {this.motorYok = false});
  final Map<String, String> ciktilar;
  final bool motorYok;
  final cagrilar = <String>[];

  @override
  String get ad => 'Sahte';

  @override
  Future<KodCalismaSonucu> calistir(String kod) async {
    cagrilar.add(kod);
    if (motorYok) return KodCalismaSonucu.motorsuz(kod);
    final h = JsKoruma.hazirla(kod);
    if (h.hata != null) return KodCalismaSonucu(kod: kod, hata: h.hata);
    return KodCalismaSonucu(kod: kod, cikti: ciktilar[kod.trim()] ?? '');
  }
}

const _bosluk = KodBoslukDoldur(
  soru: 'Tamamla.',
  kod: '___ a = 1;\nfor (const x ___ d) {}',
  dogru: ['const', 'of'],
  secenekler: ['const', 'of', 'in'],
);
const _sec = KodParcaSec(
  soru: 'Döngü satırı?',
  kod: 'let t = 0;\nfor (;;) {\n  t++;\n}',
  dogru: [1],
);
const _yaz = KodYaz(soru: 'Yaz.', kod: '} ___ {', cevaplar: ['else']);
const _cikti = KodCikti(
  soru: 'Çıktı?',
  kod: 'console.log(1);\nconsole.log(2);',
  beklenenCikti: '1\n2',
);
const _calistir = KodCalistir(
  soru: '1 yazdır.',
  baslangic: '// yaz\n',
  cozum: 'console.log(1);',
  beklenenCikti: '1',
  gerekenler: ['console.log'],
);

Iterable<({Ders ders, Alistirma a})> _yeniAlistirmalar() sync* {
  for (final u in [
    jsEtkilesimliUnite,
    pythonEtkilesimliUnite,
    htmlEtkilesimliUnite,
  ]) {
    for (final d in u.dersler) {
      for (final a in d.alistirmalar) {
        yield (ders: d, a: a);
      }
    }
  }
}

Widget _oturum(
  List<Alistirma> liste, {
  KodCalistirici? calistirici,
  void Function(int, bool)? onSonuc,
}) => ProviderScope(
  overrides: [
    if (calistirici != null)
      kodCalistiriciProvider.overrideWithValue(calistirici),
  ],
  child: MaterialApp(
    theme: acikTema(),
    home: Scaffold(
      body: AlistirmaOturumu(
        alistirmalar: liste,
        onSonuc: onSonuc ?? (_, _) {},
        onBitti: (_, _) {},
        onKapat: () {},
      ),
    ),
  ),
);

void main() {
  group('model', () {
    test('yeni türler JSON gidiş-dönüşte eşit', () {
      for (final a in [_bosluk, _sec, _yaz, _cikti, _calistir]) {
        final geri = Alistirma.fromJson(
          (jsonDecode(jsonEncode(a.toJson())) as Map).cast<String, Object?>(),
        );
        expect(geri.runtimeType, a.runtimeType);
        expect(jsonEncode(geri.toJson()), jsonEncode(a.toJson()));
      }
    });

    test('KodBoslukDoldur.doldur ve boşluk sayısı', () {
      expect(_bosluk.boslukSayisi, 2);
      expect(
        _bosluk.doldur(['let', null]),
        'let a = 1;\nfor (const x ___ d) {}',
      );
    });
  });

  group('cevapDogruMu', () {
    test('kodbosluk: sıra ve tam eşleşme', () {
      expect(Motor.cevapDogruMu(_bosluk, ['const', 'of']), isTrue);
      expect(Motor.cevapDogruMu(_bosluk, ['of', 'const']), isFalse);
      expect(Motor.cevapDogruMu(_bosluk, ['const']), isFalse);
      expect(Motor.cevapDogruMu(_bosluk, 'const of'), isFalse);
    });

    test('kodsec: küme eşitliği', () {
      expect(Motor.cevapDogruMu(_sec, [1]), isTrue);
      expect(Motor.cevapDogruMu(_sec, [1, 2]), isFalse);
      expect(Motor.cevapDogruMu(_sec, <int>[]), isFalse);
      expect(Motor.cevapDogruMu(_sec, [1, 1]), isFalse);
    });

    test('kodyaz: büyük/küçük harf duyarlı, boşluk toleranslı', () {
      expect(Motor.cevapDogruMu(_yaz, ' else '), isTrue);
      expect(Motor.cevapDogruMu(_yaz, 'Else'), isFalse);
      expect(Motor.cevapDogruMu(_yaz, ''), isFalse);
    });

    test('kodcikti: satır sonu toleransı', () {
      expect(Motor.cevapDogruMu(_cikti, '1\r\n2\n'), isTrue);
      expect(Motor.cevapDogruMu(_cikti, '1 2'), isFalse);
      expect(Motor.cevapDogruMu(_cikti, 12), isFalse);
    });

    test('kodcalistir: çıktı, hata, zaman aşımı, gerekenler ve tahmin', () {
      KodCalismaSonucu s(String kod, String cikti) =>
          KodCalismaSonucu(kod: kod, cikti: cikti);
      expect(Motor.cevapDogruMu(_calistir, s('console.log(1);', '1')), isTrue);
      expect(Motor.cevapDogruMu(_calistir, s('console.log(2);', '2')), isFalse);
      // Gerekli öğe yok (ör. sabit metin yazdırıp hile).
      expect(Motor.cevapDogruMu(_calistir, s('print', '1')), isFalse);
      expect(
        Motor.cevapDogruMu(
          _calistir,
          const KodCalismaSonucu(
            kod: 'console.log(1)',
            cikti: '1',
            hata: 'ReferenceError: x',
          ),
        ),
        isFalse,
      );
      expect(
        Motor.cevapDogruMu(
          _calistir,
          const KodCalismaSonucu(
            kod: 'console.log(1)',
            cikti: '1',
            zamanAsimi: true,
          ),
        ),
        isFalse,
      );
      expect(
        Motor.cevapDogruMu(
          _calistir,
          const KodCalismaSonucu.motorsuz('console.log(1)'),
        ),
        isFalse,
      );
      // Motor yokken çözümün çıktı tahmini.
      expect(Motor.cevapDogruMu(_calistir, '1'), isTrue);
      expect(Motor.cevapDogruMu(_calistir, '2'), isFalse);
    });
  });

  test('ipucu, doğru cevap metni ve ders meta yeni türlerde çalışır', () {
    for (final a in [_bosluk, _sec, _yaz, _cikti, _calistir]) {
      for (var i = 0; i < Motor.ipucuAdimSayisi; i++) {
        expect(Motor.ipucuUret(a, i), isNotEmpty, reason: '${a.tur} $i');
      }
      expect(Motor.dogruCevapMetni(a), isNotEmpty, reason: a.tur);
      expect(DersMeta.adim(a).saniye, greaterThan(0));
    }
    expect(Motor.dogruCevapMetni(_bosluk), 'const, of');
    expect(Motor.dogruCevapMetni(_sec), 'for (;;) {');
    expect(DersMeta.adim(_calistir).zorluk, Zorluk.zor);
  });

  group('içerik', () {
    test('etkileşimli üniteler kurslara eklendi', () {
      expect(kursBul('js-1')!.uniteler.last.id, 'js-1-u4');
      expect(kursBul('python-1')!.uniteler.last.id, 'python-1-u5');
      expect(kursBul('html-1')!.uniteler.last.id, 'html-1-u4');
    });

    test('yeni alıştırmalar tutarlı', () {
      var tur = <String>{};
      for (final (:ders, :a) in _yeniAlistirmalar()) {
        tur.add(a.tur);
        switch (a) {
          case KodBoslukDoldur():
            expect(a.boslukSayisi, a.dogru.length, reason: ders.id);
            for (final d in a.dogru) {
              expect(a.secenekler, contains(d), reason: ders.id);
            }
          case KodParcaSec():
            expect(a.dogru, isNotEmpty);
            for (final i in a.dogru) {
              expect(i, inInclusiveRange(0, a.satirlar.length - 1));
              expect(a.satirlar[i].trim(), isNotEmpty, reason: ders.id);
            }
          case KodYaz():
            expect('___'.allMatches(a.kod).length, 1, reason: a.soru);
            expect(a.cevaplar, isNotEmpty);
          case KodCikti():
            expect(ciktiNormalle(a.beklenenCikti), isNotEmpty);
          case KodCalistir():
            expect(ders.id, startsWith('js-'));
            // Örnek çözüm gerekenleri içerir ve güvenlik denetiminden geçer.
            for (final g in a.gerekenler) {
              expect(a.cozum, contains(g), reason: a.soru);
            }
            expect(JsKoruma.hazirla(a.cozum).hata, isNull, reason: a.soru);
          default:
            break;
        }
      }
      expect(
        tur,
        containsAll([
          'kodbosluk',
          'kodsec',
          'kodyaz',
          'kodcikti',
          'kodcalistir',
        ]),
      );
    });

    test('süreli sınavlara çalıştırılabilir alıştırma girmez', () {
      final js = kursBul('js-1')!;
      for (var t = 0; t < 5; t++) {
        final sorular = Motor.araSinavSec(js, 3, tohum: t);
        expect(sorular, isNotEmpty);
        expect(sorular.where((s) => s.alistirma is KodCalistir), isEmpty);
      }
    });

    test('Python derslerinde çalıştırma yok', () {
      for (final d in pythonEtkilesimliUnite.dersler) {
        expect(d.alistirmalar.whereType<KodCalistir>(), isEmpty);
      }
    });

    test(
      'JS çözümleri ve çıktı alıştırmaları gerçek motorda beklenen çıktıyı verir',
      skip: _motorVar ? false : 'QuickJS kütüphanesi yok',
      () async {
        const motor = QuickJsCalistirici();
        for (final (ders: _, :a) in _yeniAlistirmalar()) {
          if (a is KodCalistir) {
            final s = await motor.calistir(a.cozum);
            expect(s.hata, isNull, reason: a.soru);
            expect(Motor.cevapDogruMu(a, s), isTrue, reason: a.soru);
            // Başlangıç kodu tek başına geçmez.
            final b = await motor.calistir(a.baslangic);
            expect(Motor.cevapDogruMu(a, b), isFalse, reason: a.soru);
          }
          if (a is KodCikti && a.dil == 'js') {
            final s = await motor.calistir(a.kod);
            expect(s.hata, isNull, reason: a.soru);
            expect(ciktiAyni(s.cikti, a.beklenenCikti), isTrue, reason: a.soru);
          }
        }
      },
    );
  });

  group('arayüz', () {
    testWidgets('kodbosluk: parçalar sırayla yerleşir, boşalır, kontrol', (
      tester,
    ) async {
      bool? sonuc;
      await tester.pumpWidget(_oturum([_bosluk], onSonuc: (_, d) => sonuc = d));
      await tester.tap(find.byKey(const ValueKey('kod-parca-1'))); // of
      await tester.pump();
      // Yanlış yerleşen boşluğa dokunup boşalt.
      await tester.tap(find.byKey(const ValueKey('kod-bosluk-0')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('kod-parca-0'))); // const
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('kod-parca-1'))); // of
      await tester.pump();
      await dokun(tester, find.text('Kontrol et'));
      expect(sonuc, isTrue);
    });

    testWidgets('kodsec: satıra dokun, kontrol', (tester) async {
      bool? sonuc;
      await tester.pumpWidget(_oturum([_sec], onSonuc: (_, d) => sonuc = d));
      await tester.tap(find.byKey(const ValueKey('kod-satir-1')));
      await tester.pump();
      await dokun(tester, find.text('Kontrol et'));
      expect(sonuc, isTrue);
    });

    testWidgets('kodyaz ve kodcikti: yazarak cevap', (tester) async {
      final sonuclar = <bool>[];
      await tester.pumpWidget(
        _oturum([_yaz, _cikti], onSonuc: (_, d) => sonuclar.add(d)),
      );
      await tester.enterText(
        find.byKey(const ValueKey('kod-yaz-alani')),
        'Else',
      );
      await tester.pump();
      await dokun(tester, find.text('Kontrol et'));
      expect(sonuclar, [false]);
      await dokun(tester, find.text('Yine de geç'));
      await tester.enterText(
        find.byKey(const ValueKey('kod-cikti-alani')),
        '1\n2',
      );
      await tester.pump();
      await dokun(tester, find.text('Kontrol et'));
      expect(sonuclar, [false, true]);
    });

    testWidgets('kodcalistir: çalıştır, konsol, kontrol (sahte motor)', (
      tester,
    ) async {
      final sahte = SahteCalistirici({'console.log(1);': '1'});
      bool? sonuc;
      await tester.pumpWidget(
        _oturum([_calistir], calistirici: sahte, onSonuc: (_, d) => sonuc = d),
      );
      // Önce yanlış kod: çıktı farklı, mesaj gösterilir.
      await tester.enterText(
        find.byKey(const ValueKey('kod-calistir-alani')),
        'console.log(2);',
      );
      await dokun(tester, find.byKey(const ValueKey('kod-calistir')));
      expect(find.byKey(const ValueKey('kod-konsol')), findsOneWidget);
      expect(find.textContaining('beklenenden farklı'), findsOneWidget);
      // Kod değişince sonuç sıfırlanır; doğru kodu çalıştır.
      await tester.enterText(
        find.byKey(const ValueKey('kod-calistir-alani')),
        'console.log(1);',
      );
      await tester.pump();
      expect(find.byKey(const ValueKey('kod-konsol')), findsNothing);
      await dokun(tester, find.byKey(const ValueKey('kod-calistir')));
      expect(find.textContaining('beklenenle aynı'), findsOneWidget);
      await dokun(tester, find.text('Kontrol et'));
      expect(sonuc, isTrue);
      expect(sahte.cagrilar, ['console.log(2);', 'console.log(1);']);
    });

    testWidgets('kodcalistir: güvenlik reddi konsolda gösterilir', (
      tester,
    ) async {
      final sahte = SahteCalistirici({});
      await tester.pumpWidget(_oturum([_calistir], calistirici: sahte));
      await tester.enterText(
        find.byKey(const ValueKey('kod-calistir-alani')),
        'while (true) console.log(1);',
      );
      await dokun(tester, find.byKey(const ValueKey('kod-calistir')));
      expect(find.textContaining('süslü parantez'), findsOneWidget);
    });

    testWidgets('kodcalistir: motor yoksa çözüm çıktısı tahminine düşer', (
      tester,
    ) async {
      final sahte = SahteCalistirici({}, motorYok: true);
      bool? sonuc;
      await tester.pumpWidget(
        _oturum([_calistir], calistirici: sahte, onSonuc: (_, d) => sonuc = d),
      );
      await dokun(tester, find.byKey(const ValueKey('kod-calistir')));
      expect(find.byKey(const ValueKey('kod-motor-yok')), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('kod-tahmin-alani')),
        '1',
      );
      await tester.pump();
      await dokun(tester, find.text('Kontrol et'));
      expect(sonuc, isTrue);
    });

    testWidgets('yeni JS dersi uygulamada açılır ve ilk adım görünür', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'kod')),
        kurslar: [kursBul('js-1')!],
      );
      kap.read(yonlendiriciProvider).push('/ders/js-1-u4-d1');
      await tester.pumpAndSettle();
      // Ders notu kartı ya da ilk alıştırma.
      expect(
        find.textContaining('console.log').evaluate().isNotEmpty ||
            find
                .text('Döngünün her turda çalıştırdığı satıra dokun.')
                .evaluate()
                .isNotEmpty,
        isTrue,
      );
    });
  });

  test('tüm kurslarda yeni türlerin JSON gidiş-dönüşü', () {
    for (final k in tumKurslar) {
      for (final d in k.tumDersler) {
        for (final a in d.alistirmalar) {
          final geri = Alistirma.fromJson(
            (jsonDecode(jsonEncode(a.toJson())) as Map).cast<String, Object?>(),
          );
          expect(geri.tur, a.tur);
        }
      }
    }
  });
}
