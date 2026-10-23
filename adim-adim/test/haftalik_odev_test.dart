// Sahibi Yusuf (yusufbesir). Yazan: Claude (dalga 8). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Haftalık ödev (Görevler kartı: en zayıf 5 kelime, kısa tekrar, "Bu hafta ne
/// öğrendim?" notu, geçmiş notlar, 52 hafta/500 karakter sınırı, eski kayıt
/// uyumu) ve büyüyen sözlük (yeni kelime bulma, eklenme günü, "bu hafta
/// eklenen" süzgeci, ders sonu "N yeni kelime" satırı).
library;

import 'package:adim_adim/bilesenler/oturum_ozeti.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/haftalik_odev.dart';
import 'package:adim_adim/motor/kelime_gucu.dart';
import 'package:adim_adim/motor/oturum_ozeti.dart';
import 'package:adim_adim/motor/pratik.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

const _cumartesi = '2026-10-17';
const _persembe = '2026-10-15';

OgrenciDurumu _kartli() {
  final bos = OgrenciDurumu(alan: 'dil', tamamlanan: {sahteDers1: 1});
  final havuz = Pratik.kelimeHavuzu(bos, [sahteKurs]);
  expect(havuz.length, greaterThanOrEqualTo(3));
  return bos.copyWith(
    kartlar: {
      for (var i = 0; i < havuz.length; i++)
        havuz[i].kartId: Kart(
          kutu: 1,
          sonraki: '2026-10-14',
          yariOmurGun: 0.5 + i,
          sonCevap: false,
        ),
    },
  );
}

Finder _sekme(String ad) {
  final rail = find.byType(NavigationRail);
  final kap = rail.evaluate().isNotEmpty ? rail : find.byType(NavigationBar);
  return find.descendant(of: kap, matching: find.text(ad));
}

Future<void> _kaydir(WidgetTester tester, Finder f) async {
  await tester.scrollUntilVisible(
    f,
    300,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pump();
}

void main() {
  group('HaftalikOdev motoru', () {
    test('yalnız hafta sonu açık; geçersiz günde kapalı', () {
      expect(HaftalikOdev.acik('2026-10-17'), isTrue); // Cumartesi
      expect(HaftalikOdev.acik('2026-10-18'), isTrue); // Pazar
      expect(HaftalikOdev.acik('2026-10-19'), isFalse); // Pazartesi
      expect(HaftalikOdev.acik('2026-10-15'), isFalse);
      expect(HaftalikOdev.acik('bozuk'), isFalse);
      expect(HaftalikOdev.hafta('2026-10-18'), '2026-10-12');
      expect(HaftalikOdev.hafta('2026-10-12'), '2026-10-12');
    });

    test('en zayıf 5 kelime: yalnız kartlı, puana göre artan', () {
      final d = _kartli();
      final z = HaftalikOdev.zayifKelimeler(d, [sahteKurs]);
      expect(z.length, lessThanOrEqualTo(HaftalikOdev.zayifAdet));
      expect(z, isNotEmpty);
      for (var i = 1; i < z.length; i++) {
        expect(z[i].puan, greaterThanOrEqualTo(z[i - 1].puan));
      }
      // Kartı olmayan kelime ödeve girmez.
      final kartsiz = d.copyWith(kartlar: const {});
      expect(HaftalikOdev.zayifKelimeler(kartsiz, [sahteKurs]), isEmpty);
    });

    test('notKaydet: kırpma, 500 karakter, boş siler, haftaya yazar', () {
      const d = OgrenciDurumu(alan: 'dil');
      final a = HaftalikOdev.notKaydet(
        d,
        _cumartesi,
        '  Be fiilini öğrendim  ',
      );
      expect(a.haftalikNotlar, {'2026-10-12': 'Be fiilini öğrendim'});
      expect(HaftalikOdev.not(a, '2026-10-18'), 'Be fiilini öğrendim');
      // Aynı hafta üzerine yazar.
      final b = HaftalikOdev.notKaydet(a, '2026-10-18', 'Yeni not');
      expect(b.haftalikNotlar, {'2026-10-12': 'Yeni not'});
      // Uzun not kırpılır.
      final uzun = HaftalikOdev.notKaydet(d, _cumartesi, 'x' * 900);
      expect(
        uzun.haftalikNotlar['2026-10-12']!.length,
        OgrenciDurumu.haftalikNotEnCokKarakter,
      );
      // Boş not o haftanın kaydını siler; kayıt yoksa durum aynı kalır.
      expect(
        HaftalikOdev.notKaydet(b, _cumartesi, '  ').haftalikNotlar,
        isEmpty,
      );
      expect(identical(HaftalikOdev.notKaydet(d, _cumartesi, ''), d), isTrue);
    });

    test('en çok 52 hafta tutulur (en eski atılır)', () {
      var d = const OgrenciDurumu(alan: 'dil');
      var gun = DateTime.utc(2025, 1, 6); // Pazartesi
      final haftalar = <String>[];
      for (var i = 0; i < 60; i++) {
        final s =
            '${gun.year}-${gun.month.toString().padLeft(2, '0')}-'
            '${gun.day.toString().padLeft(2, '0')}';
        haftalar.add(s);
        d = HaftalikOdev.notKaydet(d, s, 'not $i');
        gun = gun.add(const Duration(days: 7));
      }
      expect(d.haftalikNotlar.length, OgrenciDurumu.haftalikNotEnCok);
      expect(d.haftalikNotlar.containsKey(haftalar.first), isFalse);
      expect(d.haftalikNotlar.containsKey(haftalar.last), isTrue);
    });

    test('geçmiş: en yeni önce, bu haftayı dışarıda bırakır', () {
      var d = const OgrenciDurumu(alan: 'dil');
      d = HaftalikOdev.notKaydet(d, '2026-10-03', 'a');
      d = HaftalikOdev.notKaydet(d, '2026-10-10', 'b');
      d = HaftalikOdev.notKaydet(d, _cumartesi, 'c');
      expect(HaftalikOdev.gecmis(d).map((g) => g.not), ['c', 'b', 'a']);
      expect(HaftalikOdev.gecmis(d, bugun: _cumartesi).map((g) => g.not), [
        'b',
        'a',
      ]);
    });
  });

  group('durum uyumluluğu', () {
    test('eski kayıtta alanlar yok: boş', () {
      final d = OgrenciDurumu.fromJson({'surum': 1, 'xp': 5, 'alan': 'dil'});
      expect(d.haftalikNotlar, isEmpty);
      expect(d.kelimeEklenme, isEmpty);
      expect(d.xp, 5);
    });

    test('gidiş-dönüş; bozuk girdiler atılır', () {
      final d = OgrenciDurumu.fromJson({
        'haftalikNotlar': {
          '2026-10-12': ' iyi hafta ',
          'bozuk': 'x',
          '2026-10-05': 5,
          '2026-09-28': '   ',
        },
        'kelimeEklenme': {
          'a#1': '2026-10-15',
          'b#2': 'bozuk',
          '': '2026-10-15',
        },
      });
      expect(d.haftalikNotlar, {'2026-10-12': 'iyi hafta'});
      expect(d.kelimeEklenme, {'a#1': '2026-10-15'});
      final tekrar = OgrenciDurumu.fromJson(d.toJson());
      expect(tekrar.haftalikNotlar, d.haftalikNotlar);
      expect(tekrar.kelimeEklenme, d.kelimeEklenme);
      expect(
        OgrenciDurumu.fromJson({'haftalikNotlar': 'x'}).haftalikNotlar,
        isEmpty,
      );
    });

    test('JSON yüklenirken uzun not kırpılır, fazla hafta atılır', () {
      final ham = <String, Object?>{
        for (var i = 0; i < 60; i++)
          DateTime.utc(
                2024,
                1,
                1,
              ).add(Duration(days: 7 * i)).toIso8601String().substring(0, 10):
              'n$i',
        '2026-10-12': 'y' * 900,
      };
      final d = OgrenciDurumu.fromJson({'haftalikNotlar': ham});
      expect(d.haftalikNotlar.length, OgrenciDurumu.haftalikNotEnCok);
      expect(
        d.haftalikNotlar['2026-10-12']!.length,
        OgrenciDurumu.haftalikNotEnCokKarakter,
      );
    });
  });

  group('YeniKelimeler (büyüyen sözlük)', () {
    test('yeni kelimeler bulunur, eklenme günü yazılır, tekrar yazılmaz', () {
      const once = OgrenciDurumu(alan: 'dil');
      final sonra = once.copyWith(tamamlanan: {sahteDers1: 1});
      final ids = YeniKelimeler.bul(once, sonra, [sahteKurs]);
      expect(ids, isNotEmpty);
      expect(YeniKelimeler.bul(sonra, sonra, [sahteKurs]), isEmpty);
      final yazildi = YeniKelimeler.isle(sonra, ids, _persembe);
      expect(yazildi.kelimeEklenme.keys.toSet(), ids.toSet());
      // Var olan kayıt değişmez; yeni kayıt yoksa aynı nesne döner.
      final sonra2 = YeniKelimeler.isle(yazildi, ids, _cumartesi);
      expect(identical(sonra2, yazildi), isTrue);
      expect(YeniKelimeler.isle(sonra, ids, 'bozuk'), sonra);
    });

    test('bu hafta kimlikleri: Pazartesi başlangıcı', () {
      const d = OgrenciDurumu(
        alan: 'dil',
        kelimeEklenme: {'a#1': '2026-10-12', 'b#1': '2026-10-11'},
      );
      expect(YeniKelimeler.buHafta(d, 'a#1', _cumartesi), isTrue);
      expect(YeniKelimeler.buHafta(d, 'b#1', _cumartesi), isFalse);
      expect(YeniKelimeler.buHafta(d, 'yok', _cumartesi), isFalse);
      expect(YeniKelimeler.buHaftaKimlikleri(d, _cumartesi), {'a#1'});
    });

    test('eklenme kaydı sınırı', () {
      final m = {
        for (var i = 0; i < OgrenciDurumu.kelimeEklenmeEnCok + 10; i++)
          'k#$i': i < 10 ? '2026-01-01' : '2026-10-15',
      };
      final cozulen = OgrenciDurumu.kelimeEklenmeCoz(m);
      expect(cozulen.length, OgrenciDurumu.kelimeEklenmeEnCok);
      expect(cozulen.containsKey('k#0'), isFalse);
    });
  });

  group('oturum özeti: yeni kelime satırı', () {
    testWidgets('N yeni kelime görünür; 0 iken görünmez', (tester) async {
      Widget sar(int n) => MaterialApp(
        theme: acikTema(),
        home: Scaffold(
          body: SingleChildScrollView(
            child: OturumOzeti(
              veri: OturumOzetiVeri(
                dogru: 1,
                toplam: 1,
                xp: 5,
                seri: 1,
                seriArtti: true,
                yeniRozetler: const [],
                kilometreler: const [],
                yeniKelime: n,
              ),
            ),
          ),
        ),
      );
      await tester.pumpWidget(sar(4));
      await tester.pumpAndSettle();
      expect(find.text('4 yeni kelime'), findsOneWidget);
      await tester.pumpWidget(sar(0));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('oturum-yeni-kelime')), findsNothing);
    });
  });

  group('Görevler: Haftalık ödev kartı', () {
    testWidgets('hafta içi kapalı; hafta sonu zayıf kelimeler, not, kayıt', (
      tester,
    ) async {
      final depo = BellekDepo(_kartli());
      final kap = await uygulamayiAc(tester, depo, bugun: _cumartesi);
      await dokun(tester, _sekme('Görevler'));
      final kart = find.byKey(const ValueKey('haftalik-odev'));
      await _kaydir(tester, kart);
      expect(kart, findsOneWidget);
      expect(find.text('Haftalık ödev'), findsOneWidget);
      expect(find.textContaining('en zayıf 5 kelimesi'), findsOneWidget);
      expect(find.textContaining('güç '), findsWidgets);
      expect(find.byKey(const ValueKey('odev-kapali')), findsNothing);
      final tekrar = find.byKey(const ValueKey('odev-tekrar'));
      await tester.ensureVisible(tekrar);
      expect(tester.widget<OutlinedButton>(tekrar).onPressed, isNotNull);

      await tester.ensureVisible(find.byKey(const ValueKey('odev-not')));
      await tester.enterText(
        find.byKey(const ValueKey('odev-not')),
        'Hayvan adlarını öğrendim',
      );
      await dokun(tester, find.byKey(const ValueKey('odev-kaydet')));
      expect(find.text('Kaydedildi'), findsOneWidget);
      final d = kap.read(durumProvider).value!;
      expect(d.haftalikNotlar, {'2026-10-12': 'Hayvan adlarını öğrendim'});
      expect((await depo.yukle()).haftalikNotlar, d.haftalikNotlar);
      expect(tester.takeException(), isNull);
    });

    testWidgets('hafta içi: kapalı mesajı, geçmiş notlar listelenir', (
      tester,
    ) async {
      final d = HaftalikOdev.notKaydet(
        HaftalikOdev.notKaydet(
          const OgrenciDurumu(alan: 'dil'),
          '2026-10-03',
          'Eski hafta notu',
        ),
        '2026-10-10',
        'Geçen hafta notu',
      );
      await uygulamayiAc(tester, BellekDepo(d));
      await dokun(tester, _sekme('Görevler'));
      final kart = find.byKey(const ValueKey('haftalik-odev'));
      await _kaydir(tester, kart);
      expect(find.byKey(const ValueKey('odev-kapali')), findsOneWidget);
      expect(find.byKey(const ValueKey('odev-not')), findsNothing);
      expect(find.text('Geçmiş notlar'), findsOneWidget);
      expect(find.textContaining('Geçen hafta notu'), findsOneWidget);
      expect(find.textContaining('Eski hafta notu'), findsOneWidget);
      // En yeni hafta önce.
      final yeni = tester.getTopLeft(
        find.byKey(const ValueKey('odev-gecmis-2026-10-05')),
      );
      final eski = tester.getTopLeft(
        find.byKey(const ValueKey('odev-gecmis-2026-09-28')),
      );
      expect(yeni.dy, lessThan(eski.dy));
    });

    testWidgets('360x640 @1,5: hafta sonu kartı taşmaz', (tester) async {
      final d = HaftalikOdev.notKaydet(
        _kartli(),
        '2026-10-03',
        'Uzun bir geçmiş not ' * 8,
      );
      await uygulamayiAc(
        tester,
        BellekDepo(d),
        boyut: const Size(360, 640),
        metinOlcegi: 1.5,
        bugun: _cumartesi,
      );
      await dokun(tester, _sekme('Görevler'));
      final kart = find.byKey(const ValueKey('haftalik-odev'));
      await _kaydir(tester, kart);
      await _kaydir(tester, find.byKey(const ValueKey('odev-kaydet')));
      expect(tester.takeException(), isNull);
    });
  });

  group('Kelimelerim: bu hafta eklenen', () {
    testWidgets('süzgeç yalnız bu hafta eklenenleri gösterir, "yeni" etiketi', (
      tester,
    ) async {
      var d = _kartli();
      final liste = KelimeGucu.liste(d, [sahteKurs]);
      expect(liste.length, greaterThanOrEqualTo(2));
      final yeniId = liste.first.kartId;
      d = d.copyWith(kelimeEklenme: {yeniId: '2026-10-14'});
      final kap = await uygulamayiAc(tester, BellekDepo(d), bugun: _persembe);
      kap.read(yonlendiriciProvider).push('/kelimelerim');
      await tester.pumpAndSettle();
      // Kart kimliği birden çok kelime satırını kapsayabilir (aynı alıştırma).
      final adet = liste.where((s) => s.kartId == yeniId).length;
      expect(find.text('Bu hafta eklenen $adet'), findsOneWidget);
      expect(find.textContaining('· yeni'), findsNWidgets(adet));
      expect(find.byType(ListTile), findsNWidgets(liste.length));
      await dokun(tester, find.byKey(const ValueKey('kelime-bu-hafta')));
      expect(find.byType(ListTile), findsNWidgets(adet));
      await dokun(tester, find.byKey(const ValueKey('kelime-bu-hafta')));
      expect(find.byType(ListTile), findsNWidgets(liste.length));
    });
  });
}
