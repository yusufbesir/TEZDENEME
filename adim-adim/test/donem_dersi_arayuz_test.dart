// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// ÖZELLİK 63 arayüz testleri: ana sayfa ve Profil düğmeleri, dönem dersi
/// oturumu (8 alıştırma), tamamlanınca pasif düğme, Ayarlar anahtarı, açılış
/// bildirimi (günde bir kez) ve 480x600 @1,5 taşma yok.
library;

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/uygulama.dart' show yonlendiriciProvider;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_test.dart' show ayarlariAc;
import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

const _bugun = '2026-10-15'; // uygulamayiAc'ın sabitlediği gün

const _bitmis = OgrenciDurumu(
  alan: 'dil',
  tamamlanan: {sahteDers1: 1, sahteDers2: 1},
);

final _donemler = find.byKey(const ValueKey('donem-dersleri'));
final _gunluk = find.byKey(const ValueKey('donem-gunluk'));
final _haftalik = find.byKey(const ValueKey('donem-haftalik'));
final _aylik = find.byKey(const ValueKey('donem-aylik'));

Future<void> _profil(WidgetTester tester) => dokun(
  tester,
  find.descendant(
    of: find.byType(NavigationBar),
    matching: find.text('Profil'),
  ),
);

void main() {
  testWidgets('tamamlanan ders yoksa düğmeler görünmez', (tester) async {
    await uygulamayiAc(tester, BellekDepo(const OgrenciDurumu(alan: 'dil')));
    expect(_donemler, findsNothing);
  });

  testWidgets('ana sayfada üç düğme; günün dersi oturumu 8 alıştırma açar', (
    tester,
  ) async {
    await uygulamayiAc(tester, BellekDepo(_bitmis));
    expect(_donemler, findsOneWidget);
    for (final f in [_gunluk, _haftalik, _aylik]) {
      expect(f, findsOneWidget);
    }
    expect(find.text('Günün dersi'), findsOneWidget);
    expect(find.text('Haftanın dersi'), findsOneWidget);
    expect(find.text('Ayın dersi'), findsOneWidget);
    await dokun(tester, _gunluk);
    final oturum = tester.widget<AlistirmaOturumu>(
      find.byType(AlistirmaOturumu),
    );
    expect(oturum.alistirmalar.length, 8);
  });

  testWidgets('haftalık oturum 12 alıştırma ister, havuz kadar verir', (
    tester,
  ) async {
    await uygulamayiAc(tester, BellekDepo(_bitmis));
    await dokun(tester, _haftalik);
    // Sahte havuz 14 alıştırma: 12 gelir.
    expect(
      tester
          .widget<AlistirmaOturumu>(find.byType(AlistirmaOturumu))
          .alistirmalar
          .length,
      12,
    );
  });

  testWidgets('tamamlanınca düğme pasif, XP yazılır; Profil de aynıdır', (
    tester,
  ) async {
    final depo = BellekDepo(_bitmis);
    final kap = await uygulamayiAc(tester, depo);
    await kap.read(durumProvider.notifier).donemDersiBitir('gunluk', 8, 8);
    await tester.pumpAndSettle();
    expect(tester.widget<OutlinedButton>(_gunluk).onPressed, isNull);
    expect(tester.widget<OutlinedButton>(_haftalik).onPressed, isNotNull);
    final kayit = await depo.yukle();
    expect(kayit.donemDersleri, {'g:$_bugun'});
    expect(kayit.xp, 10);
    await _profil(tester);
    expect(_donemler, findsOneWidget);
    expect(tester.widget<OutlinedButton>(_gunluk).onPressed, isNull);
    // Profil'den haftalık dersi aç.
    await dokun(tester, _haftalik);
    expect(find.byType(AlistirmaOturumu), findsOneWidget);
  });

  testWidgets('tamamlanmış dönemin rotası boş ekran gösterir', (tester) async {
    final kap = await uygulamayiAc(
      tester,
      BellekDepo(_bitmis.copyWith(donemDersleri: {'g:$_bugun'})),
    );
    kap.read(yonlendiriciProvider).push('/mikro?mod=donem&donem=gunluk');
    await tester.pumpAndSettle();
    expect(find.text('Günün dersi tamamlandı'), findsOneWidget);
    expect(find.byType(AlistirmaOturumu), findsNothing);
  });

  testWidgets('Ayarlar: günün dersi anahtarı kaydedilir', (tester) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    await uygulamayiAc(tester, depo);
    await ayarlariAc(tester);
    final anahtar = find.byKey(const ValueKey('ayar-gun-dersi-bildirimi'));
    await tester.scrollUntilVisible(
      anahtar,
      200,
      scrollable: find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    expect(tester.widget<SwitchListTile>(anahtar).value, isFalse);
    await dokun(tester, anahtar);
    expect((await depo.yukle()).gunDersiBildirimiAcik, isTrue);
  });

  testWidgets('açılışta bildirim: günde bir kez, kapalıyken yok', (
    tester,
  ) async {
    final bildirim = SahteBildirim();
    final depo = BellekDepo(_bitmis.copyWith(gunDersiBildirimiAcik: true));
    await uygulamayiAc(tester, depo, bildirim: bildirim);
    expect(bildirim.cagrilar, contains('gundersi:8'));
    expect((await depo.yukle()).sonGunDersiBildirimGunu, _bugun);

    final ikinci = SahteBildirim();
    await uygulamayiAc(tester, depo, bildirim: ikinci);
    expect(ikinci.cagrilar.where((c) => c.startsWith('gundersi')), isEmpty);

    final kapali = SahteBildirim();
    await uygulamayiAc(tester, BellekDepo(_bitmis), bildirim: kapali);
    expect(kapali.cagrilar.where((c) => c.startsWith('gundersi')), isEmpty);
  });

  testWidgets('480x600 @1,5: ana sayfa, oturum ve Profil taşmaz', (
    tester,
  ) async {
    await uygulamayiAc(
      tester,
      BellekDepo(_bitmis),
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    expect(_donemler, findsOneWidget);
    expect(tester.takeException(), isNull);
    await _profil(tester);
    // Profil ListView'ı tembel kurar: bölüm görünür olana dek kaydır.
    await tester.scrollUntilVisible(
      _donemler,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(_donemler, findsOneWidget);
    expect(tester.takeException(), isNull);
    // Düğme alt gezinme çubuğuna yakın olabilir; doğrudan tetikle.
    tester.widget<OutlinedButton>(_gunluk).onPressed!();
    await tester.pumpAndSettle();
    expect(find.byType(AlistirmaOturumu), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
