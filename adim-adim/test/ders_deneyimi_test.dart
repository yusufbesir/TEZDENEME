// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
// yazan: [Claude#dalga7]
/// Ders deneyimi eklemeleri: çıkış alt sayfası (iki yol + sistem geri hareketi
/// + cevapsızken sormadan çıkış), kombo rengi (saf işlev + çubuk), yanlışta
/// dilbilgisi ipucu paneli, normal/yavaş ses düğmeleri ve kelime çeviri balonu.
/// Taşma: 360x640, metin ölçeği 1,5.
library;

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/bilesenler/kombo.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/dilbilgisi_ipucu.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/kelime_anlami.dart';
import 'package:adim_adim/servis/ses.dart';
import 'package:adim_adim/sozluk/sozluk.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:adim_adim/yarisma/depo.dart';
import 'package:adim_adim/yarisma/saglayicilar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _ipucu = DilbilgisiIpucu(
  dersId: 'sahte-1.u1.d1',
  baslik: 'Be fiili',
  metin: 'I ile am kullanılır.',
  ornek: 'I am happy.',
  ornekCeviri: 'Ben mutluyum.',
);

List<Alistirma> _sorular(int n) => [
  for (var i = 0; i < n; i++)
    Secim(
      soru: 'Soru ${i + 1}',
      secenekler: const ['dogru', 'yanlis'],
      dogru: 0,
      aciklama: 'Açıklama ${i + 1}',
    ),
];

Widget _oturum({
  required List<Alistirma> sorular,
  VoidCallback? onKapat,
  DilbilgisiIpucu? ipucu,
  List<Override> overrides = const [],
  bool cikisOnayi = true,
  SahteSes? ses,
  OgrenciDurumu durum = const OgrenciDurumu(alan: 'dil'),
}) => ProviderScope(
  overrides: [
    depoProvider.overrideWithValue(BellekDepo(durum)),
    yarismaDepoProvider.overrideWithValue(BellekYarismaDepo()),
    sesProvider.overrideWithValue(ses ?? SahteSes()),
    ...overrides,
  ],
  child: MaterialApp(
    theme: acikTema(),
    home: Scaffold(
      body: SafeArea(
        child: AlistirmaOturumu(
          alistirmalar: sorular,
          onSonuc: (_, _) {},
          onBitti: (_, _) {},
          onKapat: onKapat ?? () {},
          dilbilgisiIpucu: ipucu,
          cikisOnayi: cikisOnayi,
        ),
      ),
    ),
  ),
);

Future<void> _ac(WidgetTester tester, Widget w) async {
  await tester.pumpWidget(w);
  await tester.pumpAndSettle();
}

/// Sıradaki soruyu cevaplar: [dogru] ise 'dogru', değilse 'yanlis' seçeneği.
Future<void> _cevapla(
  WidgetTester tester, {
  required bool dogru,
  bool devam = true,
}) async {
  await dokun(tester, find.text(dogru ? 'dogru' : 'yanlis'));
  await dokun(tester, find.text('Kontrol et'));
  if (devam) {
    // Yanlışta "Yine de geç", doğruda "Devam" ya da son soruda "Bitir".
    final f = find.byWidgetPredicate(
      (w) =>
          w is FilledButton &&
          w.child is Text &&
          const ['Devam', 'Yine de geç'].contains((w.child as Text).data),
    );
    await dokun(tester, f);
  }
}

Color? _cubukRengi(WidgetTester tester) => tester
    .widget<LinearProgressIndicator>(find.byType(LinearProgressIndicator))
    .color;

void _kisitliPencere(WidgetTester tester) {
  tester.view.physicalSize = const Size(360, 640);
  tester.view.devicePixelRatio = 1;
  tester.platformDispatcher.textScaleFactorTestValue = 1.5;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
}

void main() {
  group('Kombo (saf işlevler)', () {
    test('sonraki: doğruda artar, yanlışta sıfırlanır', () {
      expect(Kombo.sonraki(0, true), 1);
      expect(Kombo.sonraki(4, true), 5);
      expect(Kombo.sonraki(4, false), 0);
    });

    test('aşamalar: 0-2 normal, 3-4 ısınma, 5+ sıcak', () {
      expect(Kombo.asama(0), KomboAsamasi.normal);
      expect(Kombo.asama(2), KomboAsamasi.normal);
      expect(Kombo.asama(3), KomboAsamasi.isinma);
      expect(Kombo.asama(4), KomboAsamasi.isinma);
      expect(Kombo.asama(5), KomboAsamasi.sicak);
      expect(Kombo.asama(12), KomboAsamasi.sicak);
    });

    test(
      'renkler tema renklerinden, kırmızı (hata) değil, aşamalar farklı',
      () {
        for (final r in [AdimRenkleri.acik, AdimRenkleri.koyu]) {
          final renkler = [
            for (final a in KomboAsamasi.values) Kombo.renk(r, a),
          ];
          expect(renkler.toSet().length, 3);
          expect(renkler, isNot(contains(r.hata)));
          expect(Kombo.renk(r, KomboAsamasi.normal), r.ana);
          expect(Kombo.renk(r, KomboAsamasi.isinma), r.dogru);
          expect(Kombo.renk(r, KomboAsamasi.sicak), r.vurgu);
        }
      },
    );

    test('etiket: 3 ve üstünde "xN seri", altında yok', () {
      expect(Kombo.etiket(2), isNull);
      expect(Kombo.etiket(3), 'x3 seri');
      expect(Kombo.etiket(7), 'x7 seri');
    });
  });

  group('Kombo (çubuk)', () {
    testWidgets(
      '3. doğruda ısınır, 5. doğruda sıcak olur, yanlışta sıfırlanır',
      (tester) async {
        await _ac(tester, _oturum(sorular: _sorular(8)));
        final r = AdimRenkleri.acik;
        expect(_cubukRengi(tester), r.ana);
        expect(find.textContaining('seri'), findsNothing);
        for (var i = 0; i < 2; i++) {
          await _cevapla(tester, dogru: true);
        }
        expect(_cubukRengi(tester), r.ana);
        await _cevapla(tester, dogru: true);
        expect(find.text('x3 seri'), findsOneWidget);
        expect(_cubukRengi(tester), r.dogru);
        await _cevapla(tester, dogru: true);
        expect(_cubukRengi(tester), r.dogru);
        await _cevapla(tester, dogru: true);
        expect(find.text('x5 seri'), findsOneWidget);
        expect(_cubukRengi(tester), r.vurgu);
        await _cevapla(tester, dogru: false);
        expect(find.textContaining('seri'), findsNothing);
        expect(_cubukRengi(tester), r.ana);
        expect(tester.takeException(), isNull);
      },
    );
  });

  group('Çıkış alt sayfası', () {
    testWidgets('cevap yokken sormadan çıkar', (tester) async {
      var kapandi = 0;
      await _ac(
        tester,
        _oturum(sorular: _sorular(2), onKapat: () => kapandi++),
      );
      await dokun(tester, find.byTooltip('Dersten çık'));
      expect(kapandi, 1);
      expect(find.text('İlerlemeni kaybedeceksin'), findsNothing);
    });

    testWidgets('cevaptan sonra "Devam et" oturumda tutar', (tester) async {
      var kapandi = 0;
      await _ac(
        tester,
        _oturum(sorular: _sorular(3), onKapat: () => kapandi++),
      );
      await _cevapla(tester, dogru: true);
      await dokun(tester, find.byTooltip('Dersten çık'));
      expect(find.text('İlerlemeni kaybedeceksin'), findsOneWidget);
      expect(find.byKey(const Key('cikis-devam')), findsOneWidget);
      expect(find.byKey(const Key('cikis-cik')), findsOneWidget);
      await dokun(tester, find.byKey(const Key('cikis-devam')));
      expect(find.text('İlerlemeni kaybedeceksin'), findsNothing);
      expect(kapandi, 0);
      expect(find.text('Soru 2'), findsOneWidget);
    });

    testWidgets('cevaptan sonra "Dersten çık" çıkar', (tester) async {
      var kapandi = 0;
      await _ac(
        tester,
        _oturum(sorular: _sorular(3), onKapat: () => kapandi++),
      );
      await _cevapla(tester, dogru: false);
      await dokun(tester, find.byTooltip('Dersten çık'));
      await dokun(tester, find.byKey(const Key('cikis-cik')));
      expect(kapandi, 1);
    });

    testWidgets('sistem geri hareketi aynı sayfayı açar', (tester) async {
      var kapandi = 0;
      await _ac(
        tester,
        _oturum(sorular: _sorular(3), onKapat: () => kapandi++),
      );
      // Cevap yok: geri hareketi sormadan sistemin işine bırakır (sayfa yok).
      await _cevapla(tester, dogru: true);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('İlerlemeni kaybedeceksin'), findsOneWidget);
      expect(kapandi, 0);
      await dokun(tester, find.byKey(const Key('cikis-cik')));
      expect(kapandi, 1);
    });

    testWidgets('cikisOnayi: false ise alt sayfa açılmaz', (tester) async {
      var kapandi = 0;
      await _ac(
        tester,
        _oturum(
          sorular: _sorular(3),
          onKapat: () => kapandi++,
          cikisOnayi: false,
        ),
      );
      await _cevapla(tester, dogru: true);
      await dokun(tester, find.byTooltip('Dersten çık'));
      expect(kapandi, 1);
      expect(find.text('İlerlemeni kaybedeceksin'), findsNothing);
    });

    testWidgets('360x640, ölçek 1,5: sayfa taşmaz', (tester) async {
      _kisitliPencere(tester);
      await _ac(tester, _oturum(sorular: _sorular(3)));
      await _cevapla(tester, dogru: true);
      await dokun(tester, find.byTooltip('Dersten çık'));
      expect(find.text('İlerlemeni kaybedeceksin'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('Yanlışta dilbilgisi ipucu paneli', () {
    testWidgets(
      'yanlışta "İpucu" başlığı ve ders ipucu, doğru cevapla birlikte',
      (tester) async {
        await _ac(tester, _oturum(sorular: _sorular(2), ipucu: _ipucu));
        await _cevapla(tester, dogru: false, devam: false);
        expect(find.text('Yanlış'), findsOneWidget);
        expect(find.textContaining('Doğru cevap: dogru'), findsOneWidget);
        expect(find.text('İpucu'), findsOneWidget);
        expect(find.text('Be fiili: I ile am kullanılır.'), findsOneWidget);
      },
    );

    testWidgets('doğru cevapta ipucu kutusu yok', (tester) async {
      await _ac(tester, _oturum(sorular: _sorular(2), ipucu: _ipucu));
      await _cevapla(tester, dogru: true, devam: false);
      expect(find.text('Doğru!'), findsOneWidget);
      expect(find.byKey(const Key('dilbilgisi-ipucu-kutusu')), findsNothing);
    });

    testWidgets('ipucu yoksa yalnız doğru cevap ve açıklama', (tester) async {
      await _ac(tester, _oturum(sorular: _sorular(2)));
      await _cevapla(tester, dogru: false, devam: false);
      expect(find.byKey(const Key('dilbilgisi-ipucu-kutusu')), findsNothing);
      expect(find.text('İpucu'), findsNothing);
      expect(find.textContaining('Doğru cevap: dogru'), findsOneWidget);
      expect(find.textContaining('Açıklama 1'), findsOneWidget);
    });

    testWidgets('360x640, ölçek 1,5: panel ve kombo etiketi taşmaz', (
      tester,
    ) async {
      _kisitliPencere(tester);
      await _ac(tester, _oturum(sorular: _sorular(6), ipucu: _ipucu));
      for (var i = 0; i < 3; i++) {
        await _cevapla(tester, dogru: true);
      }
      expect(find.text('x3 seri'), findsOneWidget);
      await _cevapla(tester, dogru: false, devam: false);
      expect(find.text('İpucu'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('Dinleme: normal ve yavaş ses', () {
    const dinle = [
      Dinle(
        soru: 'Ne duydun?',
        okunacak: 'Good morning',
        secenekler: ['Good morning', 'Good evening'],
        dogru: 0,
      ),
    ];

    testWidgets('iki düğme; yavaş düğme yavaş hızla okur, hız geri döner', (
      tester,
    ) async {
      final ses = SahteSes();
      await _ac(tester, _oturum(sorular: dinle, ses: ses));
      expect(find.byKey(const Key('dinle-normal')), findsOneWidget);
      expect(find.byKey(const Key('dinle-yavas')), findsOneWidget);
      await dokun(tester, find.byKey(const Key('dinle-normal')));
      await dokun(tester, find.byKey(const Key('dinle-yavas')));
      expect(ses.okunanlar, ['Good morning', 'Good morning']);
      expect(ses.hizlar, [0.45, Ses.yavasHiz]);
      expect(Ses.yavasHiz, lessThan(0.45));
      expect(ses.konusmaHizi, 0.45);
    });

    testWidgets('ses ayarda kapalıysa düğmeler pasif, metin ipucu görünür', (
      tester,
    ) async {
      final ses = SahteSes();
      await _ac(
        tester,
        _oturum(
          sorular: dinle,
          ses: ses,
          durum: const OgrenciDurumu(alan: 'dil', sesAcik: false),
        ),
      );
      for (final k in ['dinle-normal', 'dinle-yavas']) {
        expect(
          tester.widget<FilledButton>(find.byKey(Key(k))).onPressed,
          isNull,
        );
      }
      expect(
        find.textContaining('Okunacak cümle: Good morning'),
        findsOneWidget,
      );
      expect(ses.okunanlar, isEmpty);
    });

    testWidgets(
      'ses servisi hata verirse düğmeler pasifleşir, metin gösterilir',
      (tester) async {
        await _ac(tester, _oturum(sorular: dinle, ses: _BozukSes()));
        await dokun(tester, find.byKey(const Key('dinle-yavas')));
        for (final k in ['dinle-normal', 'dinle-yavas']) {
          expect(
            tester.widget<FilledButton>(find.byKey(Key(k))).onPressed,
            isNull,
          );
        }
        expect(
          find.textContaining('Okunacak cümle: Good morning'),
          findsOneWidget,
        );
      },
    );

    testWidgets('360x640, ölçek 1,5: ses düğmeleri taşmaz', (tester) async {
      _kisitliPencere(tester);
      await _ac(tester, _oturum(sorular: dinle));
      expect(tester.takeException(), isNull);
    });
  });

  group('Kelime çeviri balonu', () {
    final sozluk = Sozluk(const [
      SozlukMaddesi(
        kelime: 'cat',
        anlam: 'kedi',
        dil: 'en',
        kursId: 'k',
        dersId: 'k.u1.d1',
        alistirmaIndeksi: 0,
      ),
      SozlukMaddesi(
        kelime: 'run',
        anlam: 'koşmak',
        dil: 'en',
        kursId: 'k',
        dersId: 'k.u1.d1',
        alistirmaIndeksi: 1,
      ),
    ]);

    /// Soru metninde [kelime]nin üstüne gerçek bir dokunuş gönderir.
    Future<void> kelimeyeDokun(
      WidgetTester tester,
      String metin,
      String kelime,
    ) async {
      final f = find.text(metin);
      final tp = TextPainter(
        text: TextSpan(text: metin, style: tester.widget<Text>(f).style),
        textDirection: TextDirection.ltr,
        textScaler: MediaQuery.textScalerOf(tester.element(f)),
      )..layout(maxWidth: tester.getSize(f).width);
      final i = metin.indexOf(kelime) + 1;
      final ofset = tp.getOffsetForCaret(TextPosition(offset: i), Rect.zero);
      await tester.tapAt(tester.getTopLeft(f) + ofset + const Offset(0, 6));
      await tester.pumpAndSettle();
    }

    Widget oturum(List<Alistirma> s) => _oturum(
      sorular: s,
      overrides: [sozlukProvider.overrideWithValue(sozluk)],
    );

    const soruMetni = 'The cat is running now.';
    const soru = [
      Secim(soru: 'The cat is running now.', secenekler: ['a', 'b'], dogru: 0),
    ];

    test('KelimeAnlami.bul: tam eşleşme, kök ve bilinmeyen', () {
      expect(KelimeAnlami.bul(sozluk, 'cat'), 'kedi');
      expect(KelimeAnlami.bul(sozluk, 'Cat'), 'kedi');
      expect(KelimeAnlami.bul(sozluk, 'running'), 'koşmak');
      expect(KelimeAnlami.bul(sozluk, 'zebra'), isNull);
      expect(KelimeAnlami.bul(sozluk, 'a'), isNull);
    });

    testWidgets(
      'bilinen kelimeye dokununca balon açılır, tekrar dokununca kapanır',
      (tester) async {
        await _ac(tester, oturum(soru));
        expect(find.byKey(const Key('kelime-balonu')), findsNothing);
        await kelimeyeDokun(tester, soruMetni, 'cat');
        expect(find.text('cat = kedi'), findsOneWidget);
        await dokun(tester, find.byKey(const Key('kelime-balonu')));
        expect(find.byKey(const Key('kelime-balonu')), findsNothing);
      },
    );

    testWidgets('anlamı bilinmeyen kelimede balon açılmaz', (tester) async {
      await _ac(tester, oturum(soru));
      await kelimeyeDokun(tester, soruMetni, 'now');
      expect(find.byKey(const Key('kelime-balonu')), findsNothing);
    });

    testWidgets('"ne demektir?" sorusunda cevabı vermemek için balon yok', (
      tester,
    ) async {
      await _ac(
        tester,
        oturum(const [
          Secim(
            soru: '"cat" ne demektir?',
            secenekler: ['kedi', 'köpek'],
            dogru: 0,
          ),
        ]),
      );
      await kelimeyeDokun(tester, '"cat" ne demektir?', 'cat');
      expect(find.byKey(const Key('kelime-balonu')), findsNothing);
      expect(find.text('cat = kedi'), findsNothing);
    });

    testWidgets('360x640, ölçek 1,5: balon taşmaz', (tester) async {
      _kisitliPencere(tester);
      await _ac(tester, oturum(soru));
      await kelimeyeDokun(tester, soruMetni, 'cat');
      expect(find.text('cat = kedi'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}

/// Ses servisi çalışmıyor: her okuma başarısız.
class _BozukSes extends SahteSes {
  @override
  Future<bool> oku(String metin, {String dil = 'en-US'}) async => false;
}
