// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// ÖZELLİK 59 ve 80 testleri: günlük süre ve dakika hedefi, bölüm (ünite/ders)
/// bazında süre dökümü, süreli kelime oturumu (destesi, soru, geri sayım,
/// özet, SRS'e dokunmama), Süre ekranı ve Pratik merkezi satırı; eski kayıt
/// uyumu; 480x600 @1,5 taşma yok.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/motor/pratik.dart';
import 'package:adim_adim/motor/sure.dart';
import 'package:adim_adim/uygulama.dart' show yonlendiriciProvider;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'pratik_test.dart' show pratikDers1, pratikDers2, pratikKurs;

const _bugun = '2026-10-15';

/// Kelime -> anlam (oturumda doğru seçeneği bulmak için); havuzdan okunur.
Map<String, String> _anlam = {
  for (final c in Pratik.kelimeHavuzu(_ogrenci(), [pratikKurs]))
    c.metin: c.anlam,
};

OgrenciDurumu _ogrenci({Map<String, int>? sure}) => OgrenciDurumu(
  alan: 'dil',
  tamamlanan: const {pratikDers1: 1},
  gunlukSureSn: sure ?? const {},
);

void main() {
  final kurslar = [pratikKurs];

  group('günlük süre ve dakika hedefi', () {
    test('ekle birikir, 4 saatle sınırlanır, geçersizi yok sayar', () {
      var d = Sure.ekle(const OgrenciDurumu(), _bugun, 90);
      d = Sure.ekle(d, _bugun, 30);
      expect(Sure.bugunSn(d, _bugun), 120);
      expect(Sure.ekle(d, _bugun, 0), same(d));
      expect(Sure.ekle(d, _bugun, -5), same(d));
      expect(Sure.ekle(d, 'bozuk', 50), same(d));
      expect(
        Sure.bugunSn(Sure.ekle(const OgrenciDurumu(), _bugun, 99999), _bugun),
        14400,
      );
    });

    test('hedef: elle ayarlanan, yoksa çalışma planı, yoksa 0', () {
      const d = OgrenciDurumu();
      expect(Sure.hedefDk(d), 0);
      final plan = d.copyWith(
        calismaPlani: const CalismaPlani(kursId: 'k', gunlukDakika: 20),
      );
      expect(Sure.hedefDk(plan), 20);
      final el = Sure.hedefAyarla(plan, 10);
      expect(Sure.hedefDk(el), 10);
      expect(Sure.hedefDk(Sure.hedefAyarla(el, 0)), 20); // kapatınca plan
      expect(Sure.hedefAyarla(d, 9999).gunlukDakikaHedefi, 240);
      expect(Sure.hedefAyarla(d, -3).gunlukDakikaHedefi, 0);
    });

    test('oran ve hedefTamam', () {
      var d = Sure.hedefAyarla(const OgrenciDurumu(), 10);
      d = Sure.ekle(d, _bugun, 300);
      expect(Sure.oran(d, _bugun), 0.5);
      expect(Sure.hedefTamam(d, _bugun), isFalse);
      d = Sure.ekle(d, _bugun, 300);
      expect(Sure.oran(d, _bugun), 1.0);
      expect(Sure.hedefTamam(d, _bugun), isTrue);
      d = Sure.ekle(d, _bugun, 600);
      expect(Sure.oran(d, _bugun), 1.0); // 1'de kırpılır
      expect(Sure.oran(const OgrenciDurumu(), _bugun), 0);
      expect(Sure.hedefTamam(const OgrenciDurumu(), _bugun), isFalse);
    });

    test('bugunMetni: sn, dk, sa', () {
      expect(Sure.bugunMetni(const OgrenciDurumu(), _bugun), 'Bugün 0 dk');
      expect(
        Sure.bugunMetni(Sure.ekle(const OgrenciDurumu(), _bugun, 45), _bugun),
        'Bugün 45 sn',
      );
      expect(
        Sure.bugunMetni(Sure.ekle(const OgrenciDurumu(), _bugun, 720), _bugun),
        'Bugün 12 dk',
      );
      expect(
        Sure.bugunMetni(Sure.ekle(const OgrenciDurumu(), _bugun, 3900), _bugun),
        'Bugün 1 sa 5 dk',
      );
    });

    test('sonGunler: 7 gün, eskiden yeniye, süresizler 0', () {
      final d = Sure.ekle(const OgrenciDurumu(), '2026-10-13', 600);
      final g = Sure.sonGunler(d, _bugun);
      expect(g.length, 7);
      expect(g.first.gun, '2026-10-09');
      expect(g.last.gun, _bugun);
      expect(g.firstWhere((x) => x.gun == '2026-10-13').sn, 600);
      expect(g.where((x) => x.sn > 0).length, 1);
      expect(Sure.sonGunler(d, 'bozuk'), isEmpty);
    });

    test('eski kayıtta süre alanları yoksa 0 ve hedef yok', () {
      final d = OgrenciDurumu.fromJson({'xp': 1});
      expect(Sure.bugunSn(d, _bugun), 0);
      expect(Sure.hedefDk(d), 0);
      final geri = OgrenciDurumu.fromJson(
        Sure.hedefAyarla(Sure.ekle(d, _bugun, 70), 15).toJson(),
      );
      expect(geri.gunlukSureSn, {_bugun: 70});
      expect(geri.gunlukDakikaHedefi, 15);
    });
  });

  group('bölüm bazında süre', () {
    test('süresi olan üniteler ve dersler döker; sıfır süreli atlanır', () {
      var d = const OgrenciDurumu();
      d = Motor.dersBitir(d, pratikDers1, 5, 5, _bugun, sureSn: 300);
      d = Motor.dersBitir(d, pratikDers1, 5, 5, _bugun, sureSn: 120);
      d = Motor.dersBitir(d, pratikDers2, 1, 1, _bugun); // süre yok
      final u = Sure.uniteSureleri(d, kurslar);
      expect(u.length, 1);
      expect(u.single.saniye, 420);
      expect(u.single.kursAd, 'Pratik Kurs');
      expect(u.single.dersler.length, 1);
      expect(u.single.dersler.single.ders.id, pratikDers1);
      expect(u.single.dersler.single.saniye, 420);
      expect(Sure.kursSaniye(d, pratikKurs), 420);
      expect(Sure.bugunSn(d, _bugun), 420);
    });

    test('süre yoksa boş', () {
      expect(Sure.uniteSureleri(const OgrenciDurumu(), kurslar), isEmpty);
    });
  });

  group('oturum destesi ve sorular', () {
    test('deste öğrenilen kelimelerden, tekrarsız; az kelimede boş', () {
      final d = _ogrenci();
      final deste = Sure.oturumDestesi(d, kurslar, tohum: 3);
      expect(deste.length, _anlam.length);
      expect({for (final c in deste) c.metin}.length, deste.length);
      expect(
        Sure.oturumDestesi(d, kurslar, tohum: 3).map((c) => c.metin),
        deste.map((c) => c.metin),
      );
      // Hiç ders bitmediyse kelime yok.
      expect(
        Sure.oturumDestesi(const OgrenciDurumu(alan: 'dil'), kurslar),
        isEmpty,
      );
    });

    test('soru: farklı seçenekler, doğru indeks, deste bitince başa döner', () {
      final deste = Sure.oturumDestesi(_ogrenci(), kurslar, tohum: 1);
      for (var i = 0; i < deste.length * 2; i++) {
        final s = Sure.soru(deste, i, tohum: 1);
        expect(s.secenekler.length, 4);
        expect(s.secenekler.toSet().length, 4);
        expect(s.secenekler[s.dogru], _anlam[s.metin]);
      }
      expect(
        Sure.soru(deste, 0, tohum: 1).metin,
        Sure.soru(deste, deste.length, tohum: 1).metin,
      );
    });

    test('3 kelimelik havuzda 3 seçenek gelir', () {
      final d = _ogrenci();
      final deste = Sure.oturumDestesi(d, kurslar, tohum: 0).take(3).toList();
      final s = Sure.soru(deste, 0);
      expect(s.secenekler.length, 3);
      expect(s.secenekler[s.dogru], _anlam[s.metin]);
    });
  });

  group('arayüz', () {
    Future<void> tikla(WidgetTester tester, Finder f) async {
      await tester.ensureVisible(f);
      await tester.tap(f);
      await tester.pump(const Duration(milliseconds: 300));
    }

    /// Ekrandaki geri sayımdan geçen saniye (toplam - kalan).
    int gecen(WidgetTester tester, int toplamSn) {
      final m = tester
          .widget<Text>(find.byKey(const ValueKey('oturum-geri-sayim')))
          .data!
          .split(':');
      return toplamSn - (int.parse(m[0]) * 60 + int.parse(m[1]));
    }

    Future<ProviderContainer> ac(
      WidgetTester tester,
      OgrenciDurumu d, {
      BellekDepo? depo,
    }) => uygulamayiAc(
      tester,
      depo ?? BellekDepo(d),
      kurslar: kurslar,
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );

    testWidgets('Profil -> Süre takibi: hedef seçimi ve bölüm dökümü', (
      tester,
    ) async {
      var d = _ogrenci();
      d = Motor.dersBitir(d, pratikDers1, 5, 5, '2026-10-15', sureSn: 420);
      final depo = BellekDepo(d);
      final kap = await ac(tester, d, depo: depo);
      await dokun(
        tester,
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text('Profil'),
        ),
      );
      expect(find.text('Bugün 7 dk'), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('profil-sure')));
      expect(find.text('Süre takibi'), findsWidgets);
      expect(find.byKey(const ValueKey('sure-bugun')), findsOneWidget);
      expect(
        tester.widget<Text>(find.byKey(const ValueKey('sure-bugun'))).data,
        'Bugün 7 dk',
      );
      expect(find.textContaining('hedefi yok'), findsOneWidget);

      await dokun(tester, find.byKey(const ValueKey('sure-hedef-15')));
      expect(
        tester
            .widget<Text>(find.byKey(const ValueKey('sure-hedef-metni')))
            .data,
        'Günlük hedef: 15 dk',
      );
      expect(kap.read(durumProvider).value!.gunlukDakikaHedefi, 15);
      expect((await depo.yukle()).gunlukDakikaHedefi, 15);

      // Bölüm bazında: ünite satırı süresiyle; açınca ders satırı.
      expect(
        find.byKey(const ValueKey('sure-unite-pratik-1.u1')),
        findsOneWidget,
      );
      expect(find.textContaining('Pratik Kurs · 7 dk'), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('sure-unite-pratik-1.u1')));
      expect(find.text('Ders Bir'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('hedef tutulunca "Günlük hedef tamam"', (tester) async {
      var d = _ogrenci().copyWith(gunlukDakikaHedefi: 5);
      d = Sure.ekle(d, _bugun, 300);
      final kap = await ac(tester, d);
      kap.read(yonlendiriciProvider).push('/sure');
      await tester.pumpAndSettle();
      expect(find.text('Günlük hedef tamam (5 dk).'), findsOneWidget);
    });

    testWidgets('Pratik merkezi satırı Süre ekranını açar', (tester) async {
      final kap = await ac(tester, _ogrenci());
      kap.read(yonlendiriciProvider).push('/pratik');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('pratik-sureli')), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('pratik-sureli')));
      expect(find.byKey(const ValueKey('sure-oturum-5')), findsOneWidget);
      expect(find.byKey(const ValueKey('sure-oturum-10')), findsOneWidget);
      expect(find.byKey(const ValueKey('sure-oturum-15')), findsOneWidget);
    });

    testWidgets(
      'süreli oturum: geri sayım, cevap, Bitir -> özet; SRS ve XP değişmez',
      (tester) async {
        final depo = BellekDepo(_ogrenci());
        final kap = await ac(tester, _ogrenci(), depo: depo);
        final once = kap.read(durumProvider).value!;
        kap.read(yonlendiriciProvider).push('/sure');
        await tester.pumpAndSettle();
        await dokun(tester, find.byKey(const ValueKey('sure-oturum-10')));
        await tester.pump(const Duration(milliseconds: 500));

        final ilk = gecen(tester, 600);
        expect(ilk, lessThanOrEqualTo(1)); // açılışta en çok bir saniye
        await tester.pump(const Duration(seconds: 3));
        expect(gecen(tester, 600), ilk + 3);

        // Doğru seçeneği bul ve işaretle.
        final kelime = tester
            .widget<Text>(find.byKey(const ValueKey('oturum-kelime')))
            .data!;
        await tikla(
          tester,
          find.widgetWithText(OutlinedButton, _anlam[kelime]!),
        );
        expect(
          tester
              .widget<Text>(find.byKey(const ValueKey('oturum-geri-bildirim')))
              .data,
          'Doğru',
        );
        await tikla(tester, find.byKey(const ValueKey('oturum-sonraki')));
        await tester.pump(const Duration(seconds: 2));
        // İkinci soruda bilerek yanlış seçenek.
        final k2 = tester
            .widget<Text>(find.byKey(const ValueKey('oturum-kelime')))
            .data!;
        final yanlis = find.byWidgetPredicate(
          (w) =>
              w is OutlinedButton &&
              w.child is Text &&
              (w.child as Text).data != _anlam[k2],
        );
        await tikla(tester, yanlis.first);
        expect(
          tester
              .widget<Text>(find.byKey(const ValueKey('oturum-geri-bildirim')))
              .data,
          'Doğrusu: ${_anlam[k2]}',
        );

        final gecenSn = gecen(tester, 600);
        expect(gecenSn, greaterThanOrEqualTo(5));
        await tikla(tester, find.byKey(const ValueKey('oturum-bitir')));
        expect(find.text('Oturum özeti'), findsOneWidget);
        expect(
          tester
              .widget<Text>(find.byKey(const ValueKey('oturum-ozet-cevap')))
              .data,
          '2',
        );
        expect(
          tester
              .widget<Text>(find.byKey(const ValueKey('oturum-ozet-dogru')))
              .data,
          '1 (%50)',
        );
        // Geçen süre günlük süreye yazıldı (sayaçla aynı).
        final son = kap.read(durumProvider).value!;
        expect(son.gunlukSureSn[_bugun], gecenSn);
        expect((await depo.yukle()).gunlukSureSn[_bugun], gecenSn);
        // SRS, hata defteri, XP ve seri değişmedi.
        expect(son.kartlar, once.kartlar);
        expect(son.hatalar, once.hatalar);
        expect(son.xp, once.xp);
        expect(son.seri, once.seri);
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets('süre dolunca oturum kendiliğinden biter ve tam süre yazılır', (
      tester,
    ) async {
      final kap = await ac(tester, _ogrenci());
      kap.read(yonlendiriciProvider).push('/sure/oturum?dk=5');
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      expect(find.byKey(const ValueKey('oturum-geri-sayim')), findsOneWidget);
      await tester.pump(const Duration(minutes: 5, seconds: 2));
      expect(find.text('Oturum özeti'), findsOneWidget);
      expect(kap.read(durumProvider).value!.gunlukSureSn[_bugun], 300);
      expect(find.text('5 dk'), findsWidgets);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });

    testWidgets('geçersiz dakika 5\'e düşer; kelime yoksa boş mesaj', (
      tester,
    ) async {
      final kap = await ac(tester, const OgrenciDurumu(alan: 'dil'));
      kap.read(yonlendiriciProvider).push('/sure/oturum?dk=7');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('oturum-bos')), findsOneWidget);
      expect(find.text('5 dk kelime oturumu'), findsOneWidget);
      expect(find.byKey(const ValueKey('oturum-bitir')), findsNothing);
    });

    testWidgets('oturumdan geri dönünce harcanan süre kaydedilir', (
      tester,
    ) async {
      final kap = await ac(tester, _ogrenci());
      kap.read(yonlendiriciProvider).push('/sure');
      await tester.pumpAndSettle();
      await dokun(tester, find.byKey(const ValueKey('sure-oturum-5')));
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pump(const Duration(seconds: 7));
      final gecenSn = gecen(tester, 300);
      expect(gecenSn, greaterThanOrEqualTo(7));
      await tikla(tester, find.byTooltip('Geri'));
      await tester.pumpAndSettle();
      expect(kap.read(durumProvider).value!.gunlukSureSn[_bugun], gecenSn);
      expect(find.byKey(const ValueKey('sure-bugun')), findsOneWidget);
    });
  });
}
