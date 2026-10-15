import 'package:adim_adim/bilesenler/profil_karti.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/servis/bildirim.dart';
import 'package:adim_adim/servis/ses.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'sahte_icerik.dart';

class SahteSes extends Ses {
  final okunanlar = <String>[];
  @override
  Future<bool> oku(String metin, {String dil = 'en-US'}) async {
    okunanlar.add(metin);
    return true;
  }
}

class SahteBildirim implements BildirimServisi {
  final cagrilar = <String>[];
  bool izin = true;
  @override
  Future<bool> gunlukHatirlatma(String saat) async {
    cagrilar.add('kur:$saat');
    return izin;
  }
  @override
  Future<void> iptal() async => cagrilar.add('iptal');
}

Future<ProviderContainer> uygulamayiAc(
  WidgetTester tester,
  BellekDepo depo, {
  SahteSes? ses,
  SahteBildirim? bildirim,
  Size boyut = const Size(800, 1600),
}) async {
  tester.view.physicalSize = boyut;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(ProviderScope(
    overrides: [
      depoProvider.overrideWithValue(depo),
      kurslarProvider.overrideWithValue([sahteKurs]),
      bugunProvider.overrideWithValue('2026-10-15'),
      sesProvider.overrideWithValue(ses ?? SahteSes()),
      bildirimProvider.overrideWithValue(bildirim ?? SahteBildirim()),
    ],
    child: const AdimAdimUygulama(),
  ));
  await tester.pumpAndSettle();
  return ProviderScope.containerOf(tester.element(find.byType(AdimAdimUygulama)));
}

Future<void> dokun(WidgetTester tester, Finder f) async {
  await tester.ensureVisible(f);
  await tester.tap(f);
  await tester.pumpAndSettle();
}

Future<void> kontrolEtDogru(WidgetTester tester, {bool son = false}) async {
  await dokun(tester, find.text('Kontrol et'));
  expect(find.text('Doğru!'), findsOneWidget);
  await dokun(tester, find.text(son ? 'Bitir' : 'Devam'));
}

void main() {
  testWidgets('ders akışı: doğru cevaplar -> geri bildirim -> özet', (tester) async {
    final depo = BellekDepo();
    final ses = SahteSes();
    final kap = await uygulamayiAc(tester, depo, ses: ses);

    expect(find.text('Sahte Ünite'), findsOneWidget);
    expect(find.textContaining('Sıradaki ders'), findsOneWidget);
    expect(find.textContaining('Kilitli'), findsOneWidget);

    await dokun(tester, find.textContaining('Ders Bir'));

    // Secim
    await dokun(tester, find.text('dört'));
    await kontrolEtDogru(tester);
    // Bosluk
    await dokun(tester, find.text('am'));
    await kontrolEtDogru(tester);
    // Yaz
    await tester.enterText(find.byType(TextField), '  Hello! ');
    await tester.pump();
    await kontrolEtDogru(tester);
    // Sirala
    for (final k in ['I', 'am', 'happy']) {
      await dokun(tester, find.text(k));
    }
    await kontrolEtDogru(tester);
    // Eslestir
    for (final c in [('cat', 'kedi'), ('dog', 'köpek'), ('bird', 'kuş')]) {
      await dokun(tester, find.text(c.$1));
      await dokun(tester, find.text(c.$2));
    }
    await kontrolEtDogru(tester);
    // Dinle
    await dokun(tester, find.byIcon(Icons.volume_up));
    expect(ses.okunanlar, ['Good morning']);
    await dokun(tester, find.text('Good morning'));
    await kontrolEtDogru(tester);
    // Kod
    await dokun(tester, find.text('Merhaba'));
    await kontrolEtDogru(tester, son: true);

    expect(find.text('Ders tamamlandı'), findsOneWidget);
    expect(find.text('7/7'), findsOneWidget);
    expect(find.text('+29'), findsOneWidget); // 10 + 7*2 + 5 tam puan

    final d = kap.read(durumProvider).value!;
    expect(d.xp, 29);
    expect(d.seri, 1);
    expect(d.tamamlanan[sahteDers1], 1);
    expect(d.kartlar.length, 7);
    expect((await depo.yukle()).xp, 29);

    await dokun(tester, find.text('Yola dön'));
    expect(find.textContaining('Tamamlandı'), findsOneWidget);
  });

  testWidgets('yanlış cevap: hata bandı, doğru cevap ve açıklama gösterilir', (tester) async {
    final depo = BellekDepo();
    await uygulamayiAc(tester, depo);
    await dokun(tester, find.textContaining('Ders Bir'));
    await dokun(tester, find.text('beş'));
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Yanlış'), findsOneWidget);
    expect(find.textContaining('Doğru cevap: dört'), findsOneWidget);
    expect(find.byIcon(Icons.cancel), findsWidgets);
  });

  testWidgets('ayar değişikliği kalıcı olur ve sıfırlama onay ister', (tester) async {
    final depo = BellekDepo();
    final bildirim = SahteBildirim();
    await uygulamayiAc(tester, depo, bildirim: bildirim);

    await dokun(
        tester,
        find.descendant(
            of: find.byType(NavigationBar), matching: find.text('Ayarlar')));
    await dokun(tester, find.text('Koyu'));
    expect((await depo.yukle()).koyuTema, true);

    await dokun(tester, find.byType(SwitchListTile).first);
    expect((await depo.yukle()).sesAcik, false);

    await dokun(tester, find.byType(SwitchListTile).last);
    expect((await depo.yukle()).hatirlatmaSaati, '20:00');
    expect(bildirim.cagrilar, ['kur:20:00']);

    // Sıfırla: önce vazgeç, sonra onayla.
    await dokun(tester, find.text('Verileri sıfırla'));
    expect(find.text('Tüm veriler silinsin mi?'), findsOneWidget);
    await dokun(tester, find.text('Vazgeç'));
    expect((await depo.yukle()).koyuTema, true);

    await dokun(tester, find.text('Verileri sıfırla'));
    await dokun(tester, find.text('Sıfırla'));
    final sifir = await depo.yukle();
    expect(sifir.koyuTema, isNull);
    expect(sifir.sesAcik, true);
  });

  testWidgets('geniş ekranda iki sütun: yol + profil kartı, yan ray', (tester) async {
    await uygulamayiAc(tester, BellekDepo(),
        boyut: const Size(1200, 900));
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(ProfilKarti), findsOneWidget);
    expect(find.text('Sahte Ünite'), findsOneWidget);
  });

  testWidgets('dar ekranda alt gezinme çubuğu', (tester) async {
    await uygulamayiAc(tester, BellekDepo(), boyut: const Size(400, 800));
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);
    expect(find.byType(ProfilKarti), findsNothing);
  });

  testWidgets('seri kopmuşsa ekranda 0 görünür', (tester) async {
    final depo = BellekDepo(
        const OgrenciDurumu(xp: 50, seri: 5, enSeri: 5, sonGun: '2026-10-01'));
    await uygulamayiAc(tester, depo, boyut: const Size(1200, 900));
    expect(find.text('0 gün seri'), findsWidgets);
    expect(find.text('5 gün seri'), findsNothing);
  });

  testWidgets('bildirim izni reddedilince anahtar kapanır ve uyarı çıkar',
      (tester) async {
    final depo = BellekDepo();
    final bildirim = SahteBildirim()..izin = false;
    await uygulamayiAc(tester, depo, bildirim: bildirim);
    await dokun(
        tester,
        find.descendant(
            of: find.byType(NavigationBar), matching: find.text('Ayarlar')));
    await dokun(tester, find.byType(SwitchListTile).last);
    expect(find.text('Bildirim izni verilmedi'), findsOneWidget);
    expect((await depo.yukle()).hatirlatmaSaati, isNull);
    expect(
        tester.widget<SwitchListTile>(find.byType(SwitchListTile).last).value,
        false);
  });
}
