/// İlk açılış "Hoş geldin" akışı arayüz testleri: tam akış, Geri, Atla,
/// bildirim izni reddi, mevcut kullanıcı akışı görmez, akış yarıda kesilince
/// sürer, 480x600 @1.5 ölçekte her adımda taşma yok.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

Future<void> _tasmaYok(WidgetTester tester, String nerede) async {
  final hata = tester.takeException();
  expect(hata, isNull, reason: '$nerede: $hata');
}

void main() {
  testWidgets('tam akış: alan → ad/hedef → Şimdi değil → Başla; /yol açılır', (
    tester,
  ) async {
    final depo = BellekDepo();
    final kap = await uygulamayiAc(
      tester,
      depo,
      kurslar: [sahteKurs, sahteKodKurs],
    );
    // Adım 1: alan.
    expect(find.text('Hoş geldin'), findsOneWidget);
    expect(find.text('Adım 1/3'), findsOneWidget);
    expect(find.text('Ne öğrenmek istiyorsun?'), findsOneWidget);
    expect(find.text('Geri'), findsNothing);
    expect(find.text('Atla'), findsNothing);
    expect(find.byType(NavigationBar), findsNothing);
    await dokun(tester, find.text('Programlama'));

    // Adım 2: ad, günlük hedef, haftalık hedef.
    expect(find.text('Adım 2/3'), findsOneWidget);
    expect(find.text('Geri'), findsOneWidget);
    expect(find.text('Atla'), findsOneWidget);
    expect(kap.read(durumProvider).value!.alan, 'kod');
    expect(kap.read(durumProvider).value!.ilkAcilisTamam, isFalse);
    await tester.enterText(find.byType(TextField), 'Yusuf');
    await dokun(tester, find.byKey(const ValueKey('hedef-50')));
    await dokun(tester, find.byKey(const ValueKey('hafta-6')));
    await dokun(tester, find.text('İleri'));

    // Adım 3: hatırlatma; "Şimdi değil".
    expect(find.text('Adım 3/3'), findsOneWidget);
    expect(find.text('Günlük hatırlatma'), findsOneWidget);
    await dokun(tester, find.text('Şimdi değil'));

    // Özet.
    expect(find.text('Hazırsın'), findsOneWidget);
    expect(find.text('Yusuf, ilk dersin seni bekliyor.'), findsOneWidget);
    expect(find.text('50 XP'), findsOneWidget);
    expect(find.text('Haftada 6 gün'), findsOneWidget);
    expect(find.text('Kapalı'), findsOneWidget);
    await dokun(tester, find.text('Başla'));

    final d = kap.read(durumProvider).value!;
    expect(d.alan, 'kod');
    expect(d.ad, 'Yusuf');
    expect(d.gunlukHedef, 50);
    expect(d.haftalikHedefGun, 6);
    expect(d.hatirlatmaSaati, isNull);
    expect(d.ilkAcilisTamam, isTrue);
    expect((await depo.yukle()).ilkAcilisTamam, isTrue);
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Sahte Kod Kursu'), findsOneWidget);
    expect(find.text('Sahte Kurs'), findsNothing);
  });

  testWidgets('Geri önceki adıma döner; Atla varsayılanları korur', (
    tester,
  ) async {
    final kap = await uygulamayiAc(tester, BellekDepo());
    await dokun(tester, find.text('İngilizce'));
    expect(find.text('Adım 2/3'), findsOneWidget);
    await dokun(tester, find.text('Geri'));
    expect(find.text('Adım 1/3'), findsOneWidget);
    expect(find.text('Ne öğrenmek istiyorsun?'), findsOneWidget);
    await dokun(tester, find.text('İngilizce'));
    await dokun(tester, find.text('Atla'));
    expect(find.text('Adım 3/3'), findsOneWidget);
    await dokun(tester, find.text('Geri'));
    expect(find.text('Adım 2/3'), findsOneWidget);
    await dokun(tester, find.text('Atla'));
    await dokun(tester, find.text('Atla'));
    expect(find.text('Hazırsın'), findsOneWidget);
    expect(find.text('30 XP'), findsOneWidget);
    expect(find.text('Haftada 5 gün'), findsOneWidget);
    await dokun(tester, find.text('Başla'));
    final d = kap.read(durumProvider).value!;
    expect(d.alan, 'dil');
    expect(d.ad, '');
    expect(d.gunlukHedef, 30);
    expect(d.haftalikHedefGun, 5);
    expect(d.ilkAcilisTamam, isTrue);
    expect(find.byType(NavigationBar), findsOneWidget);
  });

  testWidgets('Hatırlat: izin varsa saat kaydedilir ve özette görünür', (
    tester,
  ) async {
    final bildirim = SahteBildirim();
    final kap = await uygulamayiAc(tester, BellekDepo(), bildirim: bildirim);
    await dokun(tester, find.text('İngilizce'));
    await dokun(tester, find.text('Atla'));
    await dokun(tester, find.text('Hatırlat'));
    expect(bildirim.cagrilar, contains('kur:20:00'));
    expect(find.text('Hazırsın'), findsOneWidget);
    expect(find.text('Her gün 20:00'), findsOneWidget);
    expect(kap.read(durumProvider).value!.hatirlatmaSaati, '20:00');
  });

  testWidgets('Hatırlat: izin yoksa uyarı çıkar, akış özete geçer', (
    tester,
  ) async {
    final bildirim = SahteBildirim()..izin = false;
    final kap = await uygulamayiAc(tester, BellekDepo(), bildirim: bildirim);
    await dokun(tester, find.text('İngilizce'));
    await dokun(tester, find.text('Atla'));
    await dokun(tester, find.text('Hatırlat'));
    expect(find.textContaining('Bildirim izni verilmedi'), findsOneWidget);
    expect(find.text('Hazırsın'), findsOneWidget);
    expect(find.text('Kapalı'), findsOneWidget);
    expect(kap.read(durumProvider).value!.hatirlatmaSaati, isNull);
    // Uyarı çubuğu alt düğmeleri örter; kapanmasını bekle, sonra Başla.
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    await dokun(tester, find.text('Başla'));
    expect(find.byType(NavigationBar), findsOneWidget);
  });

  testWidgets('mevcut kullanıcı (alan dolu) akışı görmez, /yol açılır', (
    tester,
  ) async {
    await uygulamayiAc(tester, BellekDepo(const OgrenciDurumu(alan: 'dil')));
    expect(find.text('Hoş geldin'), findsNothing);
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Sahte Kurs'), findsOneWidget);
  });

  testWidgets('eski JSON (bayrak yok, alan dolu) akışı görmez', (tester) async {
    final j = const OgrenciDurumu(alan: 'dil', xp: 40).toJson()
      ..remove('ilkAcilisTamam');
    await uygulamayiAc(tester, BellekDepo(OgrenciDurumu.fromJson(j)));
    expect(find.text('Hoş geldin'), findsNothing);
    expect(find.byType(NavigationBar), findsOneWidget);
  });

  testWidgets('Profil > Değiştir: tek adımlı alan seçimi, akış yok', (
    tester,
  ) async {
    final kap = await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil')),
      kurslar: [sahteKurs, sahteKodKurs],
    );
    await dokun(
      tester,
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('Profil'),
      ),
    );
    await dokun(tester, find.text('Değiştir'));
    expect(find.text('Ne öğrenmek istiyorsun?'), findsOneWidget);
    expect(find.text('Hoş geldin'), findsNothing);
    expect(find.text('Adım 1/3'), findsNothing);
    await dokun(tester, find.text('Programlama'));
    expect(kap.read(durumProvider).value!.alan, 'kod');
    expect(find.text('Hazırsın'), findsNothing);
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Sahte Kod Kursu'), findsOneWidget);
  });

  testWidgets('alan seçildi ama akış bitmedi: yeniden açılışta akış sürer', (
    tester,
  ) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'kod', ilkAcilisTamam: false)),
    );
    expect(find.text('Hoş geldin'), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
  });

  testWidgets('480x600 @1.5: her adımda taşma yok', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(),
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    await _tasmaYok(tester, 'adım 1');
    await dokun(tester, find.text('Programlama'));
    await _tasmaYok(tester, 'adım 2');
    await tester.enterText(
      find.byType(TextField),
      'Çok uzun bir öğrenci adı soyadı Yusuf Beşir',
    );
    await dokun(tester, find.byKey(const ValueKey('hedef-100')));
    await dokun(tester, find.byKey(const ValueKey('hafta-7')));
    await tester.pumpAndSettle();
    await _tasmaYok(tester, 'adım 2 seçimli');
    await dokun(tester, find.text('İleri'));
    await _tasmaYok(tester, 'adım 3');
    await dokun(tester, find.text('Hatırlat'));
    await _tasmaYok(tester, 'özet');
    expect(find.text('Hazırsın'), findsOneWidget);
    await dokun(tester, find.text('Başla'));
    await _tasmaYok(tester, 'yol');
    expect(find.byType(NavigationBar), findsOneWidget);
  });
}
