// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// "Kaldığın yerden devam" kartı arayüz testleri: görünür/gizli durumları,
/// son ders bitmişse sıradaki öneri, "Devam et" rotası, 480x600 ve 1,5 metin
/// ölçeğinde taşma olmaması. Karttaki ders adı RichText'tir; aramalarda
/// `findRichText: true` gerekir.
library;

import 'package:adim_adim/bilesenler/devam_karti.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/ekranlar/ders_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

final _kart = find.byKey(const ValueKey('devam-karti'));

void main() {
  testWidgets('sonDersId yok ve tamamlanan yoksa kart çizilmez', (
    tester,
  ) async {
    await uygulamayiAc(tester, BellekDepo(const OgrenciDurumu(alan: 'dil')));
    expect(_kart, findsNothing);
    expect(find.text('Kaldığın yerden devam'), findsNothing);
  });

  testWidgets('bitmemiş son ders: adı, ünitesi ve Devam et', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil', sonDersId: sahteDers2)),
    );
    expect(_kart, findsOneWidget);
    expect(find.text('Kaldığın yerden devam'), findsOneWidget);
    expect(
      find.descendant(
        of: _kart,
        matching: find.text('Ders İki', findRichText: true),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(of: _kart, matching: find.text('Sahte Ünite')),
      findsOneWidget,
    );
    expect(find.textContaining('Sıradaki:', findRichText: true), findsNothing);
  });

  testWidgets('son ders bitmişse sıradaki bitmemiş ders önerilir', (
    tester,
  ) async {
    await uygulamayiAc(
      tester,
      BellekDepo(
        const OgrenciDurumu(
          alan: 'dil',
          sonDersId: sahteDers1,
          tamamlanan: {sahteDers1: 1},
        ),
      ),
    );
    expect(_kart, findsOneWidget);
    expect(
      find.descendant(
        of: _kart,
        matching: find.text('Sıradaki: Ders İki', findRichText: true),
      ),
      findsOneWidget,
    );
  });

  testWidgets('sonDersId yok ama tamamlanan varsa sıradaki önerilir', (
    tester,
  ) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil', tamamlanan: {sahteDers1: 1})),
    );
    expect(find.text('Sıradaki: Ders İki', findRichText: true), findsOneWidget);
  });

  testWidgets('tüm dersler bitmişse kart çizilmez', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(
        const OgrenciDurumu(
          alan: 'dil',
          sonDersId: sahteDers2,
          tamamlanan: {sahteDers1: 1, sahteDers2: 1},
        ),
      ),
    );
    expect(_kart, findsNothing);
  });

  testWidgets('Devam et dersi açar', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil', sonDersId: sahteDers2)),
    );
    await dokun(
      tester,
      find.descendant(of: _kart, matching: find.text('Devam et')),
    );
    expect(find.byType(DersEkrani), findsOneWidget);
    // Ders İki'nin ilk alıştırması görünür.
    expect(find.text('İki artı iki kaç eder?'), findsOneWidget);
  });

  testWidgets('480x600, metin ölçeği 1,5: taşma yok', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(
        const OgrenciDurumu(
          alan: 'dil',
          sonDersId: sahteDers1,
          tamamlanan: {sahteDers1: 1},
        ),
      ),
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    expect(_kart, findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('hedefSec saf seçim', () {
    final kurslar = [sahteKurs];
    expect(DevamKarti.hedefSec(const OgrenciDurumu(), kurslar), null);
    final a = DevamKarti.hedefSec(
      const OgrenciDurumu(sonDersId: sahteDers2),
      kurslar,
    );
    expect(a?.ders.id, sahteDers2);
    expect(a?.siradaki, false);
    final b = DevamKarti.hedefSec(
      const OgrenciDurumu(sonDersId: sahteDers1, tamamlanan: {sahteDers1: 1}),
      kurslar,
    );
    expect(b?.ders.id, sahteDers2);
    expect(b?.siradaki, true);
    // Kurslarda bulunmayan son ders (ör. başka alan): sıradakine düşer.
    final c = DevamKarti.hedefSec(
      const OgrenciDurumu(sonDersId: 'yok.u1.d1'),
      kurslar,
    );
    expect(c?.ders.id, sahteDers1);
    expect(c?.siradaki, true);
  });
}
