/// Arayüz testleri için ortak yardımcılar: sahte ses/bildirim, uygulamayı
/// verilen pencere boyutu ve metin ölçeğiyle açan `uygulamayiAc`, `dokun`.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Varsayılan pencere 500x1600 (dar düzen: alt gezinme çubuğu).
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/servis/bildirim.dart';
import 'package:adim_adim/servis/konusma.dart';
import 'package:adim_adim/servis/ses.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:adim_adim/yarisma/depo.dart';
import 'package:adim_adim/yarisma/saglayicilar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import 'sahte_icerik.dart';

class SahteSes extends Ses {
  final okunanlar = <String>[];

  /// Kaç kez durdur çağrıldı (kelime oynatıcı duraklatma testi).
  int durdurmaSayisi = 0;
  @override
  Future<void> durdur() async => durdurmaSayisi++;

  @override
  Future<bool> oku(String metin, {String dil = 'en-US'}) async {
    okunanlar.add(metin);
    return true;
  }

  /// Bekleyerek okuma (eller serbest mod, radyo): anında biter.
  @override
  Future<bool> okuBekle(
    String metin, {
    String dil = 'en-US',
    Duration enCok = const Duration(seconds: 20),
  }) async {
    okunanlar.add(metin);
    return true;
  }
}

class SahteBildirim implements BildirimServisi {
  final cagrilar = <String>[];
  bool izin = true;
  @override
  Future<bool> gunlukHatirlatma(String saat, {bool izinIste = true}) async {
    cagrilar.add('kur:$saat');
    return izin;
  }

  @override
  Future<bool> tekrarBildirimi(int sayi) async {
    cagrilar.add('tekrar:$sayi');
    return izin;
  }

  @override
  Future<bool> gunDersiBildirimi(int adet) async {
    cagrilar.add('gundersi:$adet');
    return izin;
  }

  @override
  Future<void> iptal() async => cagrilar.add('iptal');
}

Future<ProviderContainer> uygulamayiAc(
  WidgetTester tester,
  BellekDepo? depo, {
  List<Kurs>? kurslar,
  SahteSes? ses,
  SahteBildirim? bildirim,
  KonusmaTanima? konusma,
  Size boyut = const Size(500, 1600),
  double metinOlcegi = 1.0,
  List<Override> ekOverrides = const [],
}) async {
  tester.view.physicalSize = boyut;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  tester.platformDispatcher.textScaleFactorTestValue = metinOlcegi;
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        depoProvider.overrideWithValue(
          depo ?? BellekDepo(const OgrenciDurumu(alan: 'dil')),
        ),
        kurslarProvider.overrideWithValue(kurslar ?? [sahteKurs]),
        yarismaDepoProvider.overrideWithValue(BellekYarismaDepo()),
        bugunProvider.overrideWithValue('2026-10-15'),
        sesProvider.overrideWithValue(ses ?? SahteSes()),
        bildirimProvider.overrideWithValue(bildirim ?? SahteBildirim()),
        if (konusma != null) konusmaProvider.overrideWithValue(konusma),
        ...ekOverrides,
      ],
      child: const AdimAdimUygulama(),
    ),
  );
  await tester.pumpAndSettle();
  return ProviderScope.containerOf(
    tester.element(find.byType(AdimAdimUygulama)),
  );
}

Future<void> dokun(WidgetTester tester, Finder f) async {
  // Tembel listede ilk kaydırma tahmini boyutla yapılır; yerleşince bir kez
  // daha kaydırılır (liste uzayınca öğe alt çubuğun altında kalmasın).
  await tester.ensureVisible(f);
  await tester.pumpAndSettle();
  await tester.ensureVisible(f);
  await tester.tap(f);
  await tester.pumpAndSettle();
}
