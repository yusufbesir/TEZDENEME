// Sahibi Yusuf (yusufbesir). Yazan: Claude (dalga 8). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Ortak "Oturum özeti" (doğru oranı, XP, yeni rozet, seri, kutlama) ve
/// kilometre taşları (7./30. gün seri, ilk ünite): saf işlev testleri, bileşen
/// testleri (animasyon kapalı/açık, 360x640 @1,5 taşma) ve ders sonucu
/// ekranına bağlanma.
library;

import 'package:adim_adim/bilesenler/oturum_ozeti.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/basarimlar.dart';
import 'package:adim_adim/motor/oturum_ozeti.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

final Kurs _kurs = Kurs(
  id: 'oz-1',
  ad: 'Özet Kursu',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'oz-1.u1',
      ad: 'İlk Ünite',
      dersler: [
        Ders(
          id: 'oz-1.u1.d1',
          ad: 'Tek Ders',
          alistirmalar: const [
            Secim(
              soru: 'İki artı iki kaç eder?',
              secenekler: ['üç', 'dört'],
              dogru: 1,
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'oz-1.u2',
      ad: 'İkinci Ünite',
      dersler: [
        Ders(
          id: 'oz-1.u2.d1',
          ad: 'İkinci Ders',
          alistirmalar: const [
            Secim(soru: 'Bir artı bir?', secenekler: ['iki', 'üç'], dogru: 0),
          ],
        ),
      ],
    ),
  ],
);

const _bos = OgrenciDurumu(alan: 'dil');

OturumOzetiVeri _veri({
  int dogru = 8,
  int toplam = 10,
  int xp = 26,
  int seri = 3,
  bool seriArtti = true,
  List<Basarim> rozetler = const [],
  List<Kilometre> km = const [],
}) => OturumOzetiVeri(
  dogru: dogru,
  toplam: toplam,
  xp: xp,
  seri: seri,
  seriArtti: seriArtti,
  yeniRozetler: rozetler,
  kilometreler: km,
);

Widget _sar(Widget w, {bool animasyonKapali = false}) => MaterialApp(
  theme: acikTema(),
  builder: (c, child) => MediaQuery(
    data: MediaQuery.of(c).copyWith(disableAnimations: animasyonKapali),
    child: child!,
  ),
  home: Scaffold(body: SingleChildScrollView(child: w)),
);

void main() {
  group('OturumOzetiVeri', () {
    test('yüzde ve yıldız eşikleri', () {
      expect(_veri(dogru: 10, toplam: 10).yuzde, 100);
      expect(_veri(dogru: 10, toplam: 10).yildiz, 3);
      expect(_veri(dogru: 8, toplam: 10).yildiz, 2);
      expect(_veri(dogru: 5, toplam: 10).yildiz, 1);
      expect(_veri(dogru: 4, toplam: 10).yildiz, 0);
      expect(_veri(dogru: 0, toplam: 0).yuzde, 0);
      expect(_veri(dogru: 0, toplam: 0).yildiz, 0);
      expect(_veri(dogru: 2, toplam: 3).yuzde, 66);
    });
  });

  group('OturumOzetiMotoru', () {
    test('yeni rozet yalnız bu oturumda kazanılanlar', () {
      const once = OgrenciDurumu(alan: 'dil');
      final sonra = once.copyWith(tamamlanan: {'oz-1.u1.d1': 1});
      final yeni = OturumOzetiMotoru.yeniRozetler(once, sonra, [_kurs]);
      expect(yeni.map((b) => b.id), contains('ilk_ders'));
      // Zaten kazanılmış rozet tekrar yeni sayılmaz.
      final ikinci = OturumOzetiMotoru.yeniRozetler(sonra, sonra, [_kurs]);
      expect(ikinci, isEmpty);
      final kayitli = once.copyWith(rozetler: {'ilk_ders'});
      expect(
        OturumOzetiMotoru.yeniRozetler(kayitli, sonra, [
          _kurs,
        ]).map((b) => b.id),
        isNot(contains('ilk_ders')),
      );
    });

    test('seri kilometre taşları 7 ve 30, yalnız eşik aşılırken', () {
      OgrenciDurumu s(int n) => _bos.copyWith(seri: n);
      List<String> ids(int a, int b) => [
        for (final k in OturumOzetiMotoru.kilometreler(s(a), s(b), [_kurs]))
          if (k.id.startsWith('seri')) k.id,
      ];
      expect(ids(6, 7), ['seri_7']);
      expect(ids(7, 7), isEmpty);
      expect(ids(7, 8), isEmpty);
      expect(ids(29, 30), ['seri_30']);
      expect(ids(30, 30), isEmpty);
      expect(ids(0, 1), isEmpty);
    });

    test('ilk ünite bitirme yalnız hiç ünite bitmemişken', () {
      final sonra = _bos.copyWith(tamamlanan: {'oz-1.u1.d1': 1});
      final km = OturumOzetiMotoru.kilometreler(_bos, sonra, [_kurs]);
      expect(km.map((k) => k.id), ['ilk_unite']);
      expect(km.single.aciklama, contains('İlk Ünite'));
      // İkinci ünite bitince ilk ünite kutlaması tekrarlanmaz.
      final iki = sonra.copyWith(
        tamamlanan: {'oz-1.u1.d1': 1, 'oz-1.u2.d1': 1},
      );
      expect(OturumOzetiMotoru.kilometreler(sonra, iki, [_kurs]), isEmpty);
      // Ünite bitmediyse kutlama yok.
      expect(OturumOzetiMotoru.kilometreler(_bos, _bos, [_kurs]), isEmpty);
    });

    test('hesapla: seriArtti ve alanlar', () {
      final v = OturumOzetiMotoru.hesapla(
        onceki: _bos.copyWith(seri: 2),
        sonraki: _bos.copyWith(seri: 3),
        kurslar: [_kurs],
        dogru: 3,
        toplam: 4,
        xp: 12,
      );
      expect(v.seriArtti, isTrue);
      expect(v.seri, 3);
      expect(v.xp, 12);
      expect(v.yuzde, 75);
      final ayni = OturumOzetiMotoru.hesapla(
        onceki: _bos.copyWith(seri: 3),
        sonraki: _bos.copyWith(seri: 3),
        kurslar: [_kurs],
        dogru: 1,
        toplam: 1,
        xp: 0,
      );
      expect(ayni.seriArtti, isFalse);
    });
  });

  group('OturumOzeti bileşeni', () {
    final rozet = Basarimlar.hesapla(
      _bos.copyWith(tamamlanan: {'oz-1.u1.d1': 1}),
      [_kurs],
    ).firstWhere((b) => b.id == 'ilk_ders');
    const km = Kilometre(
      id: 'seri_7',
      baslik: '7 günlük seri!',
      aciklama: 'Üst üste bir hafta çalıştın. Böyle devam.',
    );

    testWidgets('oran, XP, seri, rozet ve kilometre kartı görünür', (
      tester,
    ) async {
      await tester.pumpWidget(
        _sar(
          OturumOzeti(
            veri: _veri(rozetler: [rozet], km: [km]),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Oturum özeti'), findsOneWidget);
      expect(find.text('Doğruluk: %80 (8/10)'), findsOneWidget);
      expect(find.text('XP: +26'), findsOneWidget);
      expect(find.text('Seri durumu: 3 gün (bugün +1)'), findsOneWidget);
      expect(find.text('Yeni rozet'), findsOneWidget);
      expect(find.byKey(const ValueKey('oturum-rozet-ilk_ders')), findsOne);
      expect(find.byKey(const ValueKey('kilometre-seri_7')), findsOneWidget);
      expect(find.text('7 günlük seri!'), findsOneWidget);
      expect(find.byIcon(Icons.star), findsNWidgets(2));
      expect(find.byIcon(Icons.star_border), findsOneWidget);
    });

    testWidgets('rozet yoksa bilgi satırı; seri sayılmışsa ve yoksa metin', (
      tester,
    ) async {
      await tester.pumpWidget(_sar(OturumOzeti(veri: _veri(seriArtti: false))));
      await tester.pumpAndSettle();
      expect(find.text('Bu oturumda yeni rozet yok.'), findsOneWidget);
      expect(find.text('Yeni rozet'), findsNothing);
      expect(find.byKey(const ValueKey('kilometre-seri_7')), findsNothing);
      expect(
        find.text('Seri durumu: 3 gün (bugün zaten sayıldı)'),
        findsOneWidget,
      );
      await tester.pumpWidget(_sar(OturumOzeti(veri: _veri(seri: 0))));
      await tester.pumpAndSettle();
      expect(find.text('Seri durumu: henüz seri yok'), findsOneWidget);
    });

    testWidgets('animasyonlar kapalıyken ilk karede statik (tam ölçek)', (
      tester,
    ) async {
      await tester.pumpWidget(
        _sar(OturumOzeti(veri: _veri(dogru: 10)), animasyonKapali: true),
      );
      // pumpAndSettle yok: ilk karede tüm yıldızlar tam boyutta olmalı.
      final olcekler = tester
          .widgetList<Transform>(
            find.descendant(
              of: find.byKey(const ValueKey('oturum-yildizlar')),
              matching: find.byType(Transform),
            ),
          )
          .map((t) => t.transform.getMaxScaleOnAxis())
          .toList();
      expect(olcekler, hasLength(3));
      for (final o in olcekler) {
        expect(o, closeTo(1.0, 1e-6));
      }
      expect(find.byIcon(Icons.star), findsNWidgets(3));
    });

    testWidgets('animasyon açıkken yıldızlar 250 ms içinde oturur', (
      tester,
    ) async {
      await tester.pumpWidget(_sar(OturumOzeti(veri: _veri(dogru: 10))));
      await tester.pump(const Duration(milliseconds: 20));
      await tester.pump(const Duration(milliseconds: 260));
      expect(tester.hasRunningAnimations, isFalse);
    });

    testWidgets('360x640 @1,5 ölçek: uzun içerik taşmaz', (tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final cok = Basarimlar.hesapla(
        const OgrenciDurumu(
          alan: 'dil',
          seri: 30,
          enSeri: 30,
          xp: 6000,
          tamamlanan: {'oz-1.u1.d1': 1, 'oz-1.u2.d1': 1},
        ),
        [_kurs],
      ).where((b) => b.kazanildi).toList();
      await tester.pumpWidget(
        _sar(
          OturumOzeti(
            veri: _veri(
              dogru: 10,
              rozetler: cok,
              km: const [
                km,
                Kilometre(
                  id: 'ilk_unite',
                  baslik: 'İlk üniteni bitirdin!',
                  aciklama:
                      'Çok uzun adlı bir ünite tamamlandı. İlk büyük adım '
                      'atıldı ve herkes seninle gurur duyuyor.',
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });

  group('ders sonucu ekranına bağlanma', () {
    testWidgets('ders bitince oturum özeti, yeni rozetler ve ilk ünite kartı', (
      tester,
    ) async {
      await uygulamayiAc(tester, BellekDepo(_bos), kurslar: [_kurs]);
      await dokun(tester, find.textContaining('Tek Ders'));
      await dokun(tester, find.text('dört'));
      await dokun(tester, find.text('Kontrol et'));
      await dokun(tester, find.text('Bitir'));
      // Mevcut özet bozulmadı.
      expect(find.text('Ders tamamlandı'), findsOneWidget);
      // Ortak oturum özeti: kaydırılabilir içerikte aşağıya inilir.
      await tester.ensureVisible(find.text('Oturum özeti'));
      await tester.pump();
      expect(find.text('Doğruluk: %100 (1/1)'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('oturum-rozet-ilk_ders')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('kilometre-ilk_unite')), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('ders sonunda "N yeni kelime" satırı ve eklenme kaydı', (
      tester,
    ) async {
      final kurs = Kurs(
        id: 'kl-1',
        ad: 'Kelime Kursu',
        aciklama: '',
        alan: KursAlani.dil,
        uniteler: [
          Unite(
            id: 'kl-1.u1',
            ad: 'Kelime Ünitesi',
            dersler: [
              Ders(
                id: 'kl-1.u1.d1',
                ad: 'Hayvanlar',
                alistirmalar: const [
                  Eslestir(
                    soru: 'Eşleştir.',
                    ciftler: [
                      (sol: 'cat', sag: 'kedi'),
                      (sol: 'dog', sag: 'köpek'),
                      (sol: 'bird', sag: 'kuş'),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      );
      final kap = await uygulamayiAc(tester, BellekDepo(_bos), kurslar: [kurs]);
      await dokun(tester, find.textContaining('Hayvanlar'));
      for (final c in [('cat', 'kedi'), ('dog', 'köpek'), ('bird', 'kuş')]) {
        await dokun(tester, find.text(c.$1));
        await dokun(tester, find.text(c.$2));
      }
      await dokun(tester, find.text('Kontrol et'));
      await dokun(tester, find.text('Bitir'));
      await tester.ensureVisible(find.byKey(const ValueKey('oturum-ozeti')));
      await tester.pump();
      expect(find.byKey(const ValueKey('oturum-yeni-kelime')), findsOneWidget);
      expect(find.textContaining('yeni kelime'), findsOneWidget);
      final d = kap.read(durumProvider).value!;
      expect(d.kelimeEklenme, isNotEmpty);
      expect(d.kelimeEklenme.values.toSet(), {'2026-10-15'});
    });
  });
}
