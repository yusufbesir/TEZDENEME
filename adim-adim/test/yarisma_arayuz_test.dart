/// Yarışma arayüzü testleri: lobi, oyun akışı, güçlendiriciler, süre, sonuç.
/// Sahibi Yusuf (yusufbesir). Testler geçmeden kod değişmez; silme yalnız
/// Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/ekranlar/yarisma_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:adim_adim/yarisma/depo.dart';
import 'package:adim_adim/yarisma/ekranlar/bilesenler/cark.dart';
import 'package:adim_adim/yarisma/ekranlar/bilesenler/sik_dugmesi.dart';
import 'package:adim_adim/yarisma/ekranlar/oyun_ekrani.dart';
import 'package:adim_adim/yarisma/model.dart';
import 'package:adim_adim/yarisma/motor.dart';
import 'package:adim_adim/yarisma/saglayicilar.dart';
import 'package:adim_adim/yarisma/soru_bankasi.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

const _alan = 'dil';
const _kurs = 'ingilizce-1';

Future<ProviderContainer> _kur(
  WidgetTester tester,
  Widget ekran, {
  String alan = 'dil',
  OgrenciDurumu? durum,
  bool hareketAzalt = true,
  YarismaKayit? kayit,
}) async {
  tester.view.physicalSize = const Size(800, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        depoProvider.overrideWithValue(
          BellekDepo(durum ?? OgrenciDurumu(alan: alan)),
        ),
        yarismaDepoProvider.overrideWithValue(BellekYarismaDepo(kayit)),
        kurslarProvider.overrideWithValue([sahteKurs, sahteKodKurs]),
        bugunProvider.overrideWithValue('2026-10-15'),
        bildirimProvider.overrideWithValue(SahteBildirim()),
      ],
      child: MaterialApp(
        theme: acikTema(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(disableAnimations: hareketAzalt),
          child: child!,
        ),
        home: Scaffold(body: ekran),
      ),
    ),
  );
  final kap = ProviderScope.containerOf(
    tester.element(find.byType(MaterialApp)),
  );
  await kap.read(durumProvider.future);
  await tester.pumpAndSettle();
  return kap;
}

/// Ekranda görünen soruyu soru bankasından bulur.
YarismaSorusu _gorunenSoru() {
  final adaylar = sorulariBul(_alan, _kurs).where(
    (s) =>
        find.text(s.soru).evaluate().isNotEmpty &&
        find.text(s.secenekler[0]).evaluate().isNotEmpty,
  );
  expect(adaylar, isNotEmpty, reason: 'Ekrandaki soru bankada bulunamadı');
  return adaylar.first;
}

/// Çark çevirir; taç dilimi gelirse ilk alınmamış kategoriyi seçer.
Future<void> _soruyaGel(WidgetTester tester) async {
  await tester.tap(find.text('Çevir'));
  await tester.pumpAndSettle();
  if (find.text('Taç sorusu! Kategori seç').evaluate().isNotEmpty) {
    for (final k in YarismaKategori.values) {
      final f = find.byKey(ValueKey('tac-${k.kimlik}'));
      if (f.evaluate().isEmpty) continue;
      final dugme = tester.widget<InkWell>(f);
      if (dugme.onTap == null) continue;
      await tester.tap(f);
      await tester.pumpAndSettle();
      break;
    }
  }
}

/// Bir soruyu cevaplar (doğru ya da yanlış) ve Devam'a basar.
Future<YarismaSorusu> _birSoru(
  WidgetTester tester, {
  required bool dogru,
}) async {
  await _soruyaGel(tester);
  final s = _gorunenSoru();
  final sik = dogru ? s.dogru : (s.dogru + 1) % 4;
  await tester.tap(find.byKey(ValueKey('sik-$sik')));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Devam'));
  await tester.pumpAndSettle();
  return s;
}

Widget _oyun({YarismaMotoru? motor}) => YarismaOyunEkrani(
  alan: _alan,
  kursId: _kurs,
  motor: motor ?? YarismaMotoru(tohum: 1),
);

void main() {
  group('lobi', () {
    testWidgets('alan dil: yalnız A1, 6 kategori kartı, Oyna', (tester) async {
      await _kur(tester, const YarismaEkrani());
      expect(find.text('Bilgi Yarışması'), findsOneWidget);
      expect(find.text('A1'), findsOneWidget);
      expect(find.text('HTML'), findsNothing);
      for (final k in YarismaKategori.values) {
        expect(find.text(k.ad), findsOneWidget);
      }
      expect(find.text('Oyna'), findsOneWidget);
      expect(find.text('Oynanan'), findsOneWidget);
      expect(find.text('Kazanılan'), findsOneWidget);
      expect(find.text('En iyi puan'), findsOneWidget);
    });

    testWidgets('alan kod: HTML, CSS ve JS seviyeleri', (tester) async {
      await _kur(tester, const YarismaEkrani(), alan: 'kod');
      expect(find.text('HTML'), findsOneWidget);
      expect(find.text('CSS'), findsOneWidget);
      expect(find.text('JS'), findsOneWidget);
      expect(find.text('A1'), findsNothing);
    });

    testWidgets('alan oyun: Başlangıç, Orta, İleri; 6 kategori ve Oyna', (
      tester,
    ) async {
      await _kur(tester, const YarismaEkrani(), alan: 'oyun');
      expect(find.text('Başlangıç'), findsOneWidget);
      expect(find.text('Orta'), findsOneWidget);
      expect(find.text('İleri'), findsOneWidget);
      expect(find.text('A1'), findsNothing);
      expect(find.text('Bu alanda henüz yarışma yok.'), findsNothing);
      for (final k in YarismaKategori.values) {
        expect(find.text(k.ad), findsOneWidget);
      }
      expect(find.text('Oyna'), findsOneWidget);
    });

    testWidgets('alan oyun: Oyna oyun ekranını açar', (tester) async {
      await _kur(tester, const YarismaEkrani(), alan: 'oyun');
      await tester.tap(find.text('Oyna'));
      await tester.pumpAndSettle();
      expect(find.text('Çevir'), findsOneWidget);
      expect(find.text('Puan 0'), findsOneWidget);
    });

    testWidgets(
      'alan oyun: oyun sorusu oyun bankasından gelir, doğru 10 puan',
      (tester) async {
        await _kur(
          tester,
          YarismaOyunEkrani(
            alan: 'oyun',
            kursId: 'satranc-1',
            motor: YarismaMotoru(tohum: 1),
          ),
          alan: 'oyun',
        );
        await _soruyaGel(tester);
        final adaylar = sorulariBul(
          'oyun',
          'satranc-1',
        ).where((s) => find.text(s.soru).evaluate().isNotEmpty);
        expect(adaylar, isNotEmpty);
        final s = adaylar.first;
        await tester.tap(find.byKey(ValueKey('sik-${s.dogru}')));
        await tester.pumpAndSettle();
        expect(find.text('Puan 10'), findsOneWidget);
        expect(find.text(s.aciklama), findsOneWidget);
      },
    );

    testWidgets('kayıttaki doğru/yanlış ve istatistikler görünür', (
      tester,
    ) async {
      final kayit = YarismaKayit(
        istatistikler: {
          YarismaKayit.anahtar(_alan, _kurs): const YarismaIstatistik(
            oynanan: 7,
            kazanilan: 3,
            enIyiPuan: 130,
            toplamTac: 9,
            kategoriDogru: {'tarih': 4},
            kategoriYanlis: {'tarih': 2},
          ),
        },
      );
      await _kur(tester, const YarismaEkrani(), kayit: kayit);
      expect(find.text('4 doğru · 2 yanlış'), findsOneWidget);
      expect(find.text('0 doğru · 0 yanlış'), findsNWidgets(5));
      expect(find.text('7'), findsOneWidget);
      expect(find.text('3'), findsOneWidget);
      expect(find.text('130'), findsOneWidget);
      expect(find.text('9'), findsOneWidget);
    });

    testWidgets('varsayılan seviye: tamamlanan dersi olan son kurs', (_) async {
      const seviye = [
        YarismaSeviye(kursId: 'html-1', etiket: 'HTML'),
        YarismaSeviye(kursId: 'css-1', etiket: 'CSS'),
        YarismaSeviye(kursId: 'js-1', etiket: 'JS'),
      ];
      expect(varsayilanSeviye(seviye, const [], const {}), 'html-1');
      expect(varsayilanSeviye(const [], const [], const {}), isNull);
      expect(varsayilanSeviye(const [], [sahteKurs], {sahteDers1: 1}), isNull);
    });
  });

  group('oyun', () {
    testWidgets('Çevir -> soru görünür -> doğru şık -> puan 10 artar', (
      tester,
    ) async {
      await _kur(tester, _oyun());
      expect(find.text('Puan 0'), findsOneWidget);
      await _soruyaGel(tester);
      final s = _gorunenSoru();
      expect(find.byType(SikDugmesi), findsNWidgets(4));
      await tester.tap(find.byKey(ValueKey('sik-${s.dogru}')));
      await tester.pumpAndSettle();
      expect(find.text('Puan 10'), findsOneWidget);
      expect(find.text('Doğru!'), findsOneWidget);
      expect(find.text('Neden?'), findsOneWidget);
      expect(find.text(s.aciklama), findsOneWidget);
      await tester.tap(find.text('Devam'));
      await tester.pumpAndSettle();
      expect(find.text('Çevir'), findsOneWidget);
    });

    testWidgets('3 yanlış -> Oyun bitti ve XP >= 5 ana duruma eklenir', (
      tester,
    ) async {
      final kap = await _kur(tester, _oyun());
      for (var i = 0; i < 40; i++) {
        if (find.text('Oyun bitti').evaluate().isNotEmpty) break;
        await _birSoru(tester, dogru: false);
      }
      await tester.pumpAndSettle();
      expect(find.text('Oyun bitti'), findsOneWidget);
      expect(find.text('Öğrenmek için'), findsOneWidget);
      expect(find.text('Tekrar oyna'), findsOneWidget);
      expect(find.text('Lobiye dön'), findsOneWidget);
      final durum = kap.read(durumProvider).value!;
      expect(durum.xp, greaterThanOrEqualTo(YarismaMotoru.xpHesapla(0)));
      expect(durum.xp, greaterThanOrEqualTo(5));
      final kayit = await kap.read(yarismaKayitProvider.future);
      expect(kayit.istatistik(_alan, _kurs).oynanan, 1);
    });

    testWidgets('sonuç yalnız bir kez kaydedilir', (tester) async {
      final kap = await _kur(tester, _oyun());
      for (var i = 0; i < 40; i++) {
        if (find.text('Oyun bitti').evaluate().isNotEmpty) break;
        await _birSoru(tester, dogru: false);
      }
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 2));
      final kayit = await kap.read(yarismaKayitProvider.future);
      expect(kayit.istatistik(_alan, _kurs).oynanan, 1);
      expect(kap.read(durumProvider).value!.xp, 5);
    });

    testWidgets(
      'bomba 2 şıkkı devre dışı bırakır, ikinci güçlendirici kapanır',
      (tester) async {
        await _kur(tester, _oyun());
        await _soruyaGel(tester);
        OutlinedButton dugme(String anahtar) =>
            tester.widget<OutlinedButton>(find.byKey(ValueKey('guc-$anahtar')));
        expect(dugme('bomba').onPressed, isNotNull);
        expect(dugme('cift-sans').onPressed, isNotNull);
        await tester.tap(find.byKey(const ValueKey('guc-bomba')));
        await tester.pumpAndSettle();
        final kapali = tester
            .widgetList<SikDugmesi>(find.byType(SikDugmesi))
            .where((s) => !s.etkin);
        expect(kapali.length, 2);
        expect(dugme('bomba').onPressed, isNull);
        expect(dugme('cift-sans').onPressed, isNull);
        expect(dugme('ekstra-sure').onPressed, isNull);
        expect(dugme('gec').onPressed, isNull);
      },
    );

    testWidgets('süre bitince can düşer', (tester) async {
      final anlam = tester.ensureSemantics();
      await _kur(tester, _oyun());
      await _soruyaGel(tester);
      expect(find.bySemanticsLabel('3 can'), findsOneWidget);
      await tester.pump(const Duration(seconds: 21));
      expect(find.bySemanticsLabel('2 can'), findsOneWidget);
      expect(find.text('Süre doldu'), findsOneWidget);
      expect(find.text('Neden?'), findsOneWidget);
      anlam.dispose();
    });

    testWidgets('çift şans: yanlış şıkta can düşmez, hak mesajı çıkar', (
      tester,
    ) async {
      final anlam = tester.ensureSemantics();
      await _kur(tester, _oyun());
      await _soruyaGel(tester);
      final s = _gorunenSoru();
      await tester.tap(find.byKey(const ValueKey('guc-cift-sans')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(ValueKey('sik-${(s.dogru + 1) % 4}')));
      await tester.pumpAndSettle();
      expect(find.text('Bir hakkın daha var'), findsOneWidget);
      expect(find.bySemanticsLabel('3 can'), findsOneWidget);
      expect(find.text('Devam'), findsNothing);
      anlam.dispose();
    });

    testWidgets('ekstra süre kalan süreye 15 saniye ekler', (tester) async {
      await _kur(tester, _oyun());
      await _soruyaGel(tester);
      expect(find.text('20 s'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('guc-ekstra-sure')));
      await tester.pumpAndSettle();
      expect(find.text('35 s'), findsOneWidget);
    });

    testWidgets(
      'sonuç ekranında yanlış bilinen soru açıklamasıyla listelenir',
      (tester) async {
        await _kur(tester, _oyun());
        final yanlislar = <YarismaSorusu>[];
        for (var i = 0; i < 40; i++) {
          if (find.text('Oyun bitti').evaluate().isNotEmpty) break;
          await _soruyaGel(tester);
          final s = _gorunenSoru();
          await tester.tap(find.byKey(ValueKey('sik-${(s.dogru + 1) % 4}')));
          await tester.pumpAndSettle();
          yanlislar.add(s);
          await tester.tap(find.text('Devam'));
          await tester.pumpAndSettle();
        }
        expect(find.text('Oyun bitti'), findsOneWidget);
        expect(yanlislar, isNotEmpty);
        for (final s in yanlislar) {
          expect(find.text(s.soru), findsOneWidget);
          expect(find.text(s.aciklama), findsOneWidget);
          expect(
            find.text('Doğru cevap: ${s.secenekler[s.dogru]}'),
            findsOneWidget,
          );
        }
      },
    );

    testWidgets('X onay diyaloğu açar; Devam et oyunda tutar', (tester) async {
      await _kur(tester, _oyun());
      await tester.tap(find.byTooltip('Çık'));
      await tester.pumpAndSettle();
      expect(find.text('Oyundan çıkılsın mı?'), findsOneWidget);
      expect(find.text('Puan kaydedilmez.'), findsOneWidget);
      await tester.tap(find.text('Devam et'));
      await tester.pumpAndSettle();
      expect(find.text('Çevir'), findsOneWidget);
    });

    testWidgets('Tekrar oyna yeni oyunu başlatır', (tester) async {
      await _kur(tester, _oyun());
      for (var i = 0; i < 40; i++) {
        if (find.text('Oyun bitti').evaluate().isNotEmpty) break;
        await _birSoru(tester, dogru: false);
      }
      await tester.tap(find.text('Tekrar oyna'));
      await tester.pumpAndSettle();
      expect(find.text('Çevir'), findsOneWidget);
      expect(find.text('Puan 0'), findsOneWidget);
    });

    testWidgets(
      'hareket açıkken çark 1200 ms döner, ad görünür, soruya geçer',
      (tester) async {
        await _kur(tester, _oyun(), hareketAzalt: false);
        await tester.tap(find.text('Çevir'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 600));
        expect(find.byType(SikDugmesi), findsNothing);
        await tester.pump(const Duration(milliseconds: 700));
        // Çark durdu: kategori adı büyük yazılır, henüz soru yok.
        expect(find.byType(SikDugmesi), findsNothing);
        await tester.pump(const Duration(milliseconds: 800));
        await tester.pumpAndSettle();
        final soruMu = find.byType(SikDugmesi).evaluate().isNotEmpty;
        final tacMu = find
            .text('Taç sorusu! Kategori seç')
            .evaluate()
            .isNotEmpty;
        expect(soruMu || tacMu, isTrue);
      },
    );

    testWidgets('X ve Çık oyundan çıkarır', (tester) async {
      await _kur(tester, _oyun());
      await tester.tap(find.byTooltip('Çık'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Çık'));
      await tester.pumpAndSettle();
      expect(find.text('Çevir'), findsNothing);
    });

    testWidgets('lobide Oyna oyun sayfasını açar, Lobiye dön geri götürür', (
      tester,
    ) async {
      await _kur(tester, const YarismaEkrani());
      await tester.tap(find.text('Oyna'));
      await tester.pumpAndSettle();
      expect(find.text('Çevir'), findsOneWidget);
      for (var i = 0; i < 40; i++) {
        if (find.text('Oyun bitti').evaluate().isNotEmpty) break;
        await _birSoru(tester, dogru: false);
      }
      await tester.tap(find.text('Lobiye dön'));
      await tester.pumpAndSettle();
      expect(find.text('Bilgi Yarışması'), findsOneWidget);
      // Oynanan sayısı lobide güncellenir.
      expect(find.text('1'), findsOneWidget);
    });
  });

  group('çark', () {
    test('durma açısı dilimi işaretçinin altına getirir', () {
      for (var d = 0; d < YarismaMotoru.dilimSayisi; d++) {
        final toplam =
            (Cark.durmaAcisi(d) + Cark.dilimOrtasi(d)) %
            (2 * 3.141592653589793);
        final fark = toplam < 1e-9
            ? 0.0
            : (toplam - 2 * 3.141592653589793).abs();
        expect(toplam < 1e-9 || fark < 1e-9, isTrue, reason: 'dilim $d');
      }
    });

    testWidgets('hareketi azalt kapalıyken 1200 ms dönüp biter', (
      tester,
    ) async {
      var bitti = 0;
      Widget cark(int no) => MaterialApp(
        theme: acikTema(),
        home: Cark(hedefDilim: 2, donusNo: no, onBitti: () => bitti++),
      );
      await tester.pumpWidget(cark(0));
      await tester.pumpWidget(cark(1));
      await tester.pump(const Duration(milliseconds: 600));
      expect(bitti, 0);
      await tester.pump(const Duration(milliseconds: 700));
      expect(bitti, 1);
    });
  });
}
